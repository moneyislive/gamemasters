/**
 * Ruta de generación del misterio (SSE).
 *
 * Marca la partida como `generating`, delega en el pipeline (board → plot →
 * documents) y retransmite cada evento al cliente conforme se produce.
 */
import type { GenerateStreamEvent } from '../../../shared/types';
import { getStore } from '../db/store';
import { generacionEnCurso, runGeneration } from '../plot/pipeline';
import { crearRouter } from '../rutas';
import { quienPide } from '../gasto/quien';
import { cabeHoy, mensajeDeTope } from '../gasto/tope';
import type { Esfuerzo } from '../../../shared/types';
import type { ModoDeJuego } from '../../../shared/cobro';
import { ORDEN_DE_ESFUERZO } from '../agent/anthropic';
import { cerrarElCobro, cobrarAlGenerar, esModo, modeloValido } from '../cobro/velada';

const router = crearRouter();

router.post('/games/:id/generate', async (req, res) => {
  /*
   * EL TOPE, ANTES DE GASTAR NADA.
   *
   * Esta ruta no tenia ninguno. `generacionEnCurso` impide dos a la vez sobre la
   * MISMA partida, que es otra cosa: crear veinte partidas y generarlas seguidas
   * no lo paraba nada, y cada una cuesta entre 0,48 y 0,82 euros medidos. El
   * unico tope de la casa estaba en la ruta de avatares, la barata.
   *
   * Se cuenta ANTES de empezar, no despues: cobrar el apunte cuando ya se ha
   * pagado al proveedor no frena nada. Y a quien no se identifica no se le
   * cuenta aqui --de eso se encarga la puerta-- pero tampoco se le deja pasar
   * sin cubo, asi que se le da el de invitado.
   */
  const quien = quienPide(req) ?? 'sin-identificar';
  if (!cabeHoy(quien, 'tramas')) {
    res.status(429).json({ error: mensajeDeTope('tramas') });
    return;
  }

  const store = getStore();

  let game;
  try {
    game = await store.getGame(req.params.id);
  } catch (error) {
    console.error('[generate] error al leer la partida:', error);
    res.status(500).json({ error: 'No se pudo leer la partida.' });
    return;
  }

  if (!game) {
    res.status(404).json({ error: 'No existe esa partida.' });
    return;
  }
  /*
   * NI DOS A LA VEZ SOBRE LA MISMA PARTIDA. Cada una de estas llamadas cuesta
   * dinero de verdad, y la unica defensa era un booleano del navegador: se
   * pierde al recargar y no existe en otra pestaña. Se responde ANTES de abrir
   * el stream para que el cliente reciba un 409 legible y no un SSE que muere.
   */
  if (generacionEnCurso(game)) {
    res.status(409).json({ error: 'Esta partida ya se está generando. Espera a que termine.' });
    return;
  }

  /*
   * LO QUE SE CONFIRMÓ ANTES DE GENERAR: el modo —papel o app—, y si se tocaron
   * las opciones avanzadas, el modelo y el esfuerzo. Y el precio que se vio,
   * para no cobrar uno distinto del que se confirmó.
   *
   * Sin modo en el cuerpo vale el guardado, y sin guardado, papel: es lo que no
   * incluye nada que no se haya elegido. Así sigue funcionando quien genera sin
   * pasar por la confirmación —el asistente del taller con `start_generation`,
   * los comprobadores—.
   */
  const cuerpo = (req.body ?? {}) as { modo?: unknown; model?: unknown; esfuerzo?: unknown; creditosVistos?: unknown };
  const modo: ModoDeJuego = esModo(cuerpo.modo) ? cuerpo.modo : (game.settings?.modo ?? 'papel');
  if (cuerpo.model !== undefined && cuerpo.model !== null && !modeloValido(cuerpo.model)) {
    res.status(400).json({ error: 'Ese modelo no escribe veladas.' });
    return;
  }
  if (cuerpo.esfuerzo !== undefined && cuerpo.esfuerzo !== null && !ORDEN_DE_ESFUERZO.includes(cuerpo.esfuerzo as Esfuerzo)) {
    res.status(400).json({ error: 'Nivel de esfuerzo no válido.' });
    return;
  }
  game.settings = {
    ...game.settings,
    modo,
    ...(modeloValido(cuerpo.model) ? { model: cuerpo.model } : {}),
    ...(ORDEN_DE_ESFUERZO.includes(cuerpo.esfuerzo as Esfuerzo) ? { esfuerzo: cuerpo.esfuerzo as Esfuerzo } : {}),
  };

  // EL COBRO, ANTES DE GASTAR NADA. Sin cobro activo, o para la casa, no cobra.
  const cobro = await cobrarAlGenerar(req, game, {
    modo,
    ...(typeof cuerpo.creditosVistos === 'number' ? { creditosVistos: cuerpo.creditosVistos } : {}),
  });
  if (!cobro.ok) {
    res.status(cobro.estado).json({
      error: cobro.error,
      motivo: cobro.motivo,
      ...(cobro.presupuesto ? { presupuesto: cobro.presupuesto } : {}),
      ...(cobro.saldo !== undefined ? { saldo: cobro.saldo } : {}),
    });
    return;
  }
  game.cobro = cobro.cobro;

  // Cabeceras del stream: se envían antes de cualquier trabajo pesado.
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const emit = (evento: GenerateStreamEvent): void => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(evento)}\n\n`);
  };

  try {
    game.status = 'generating';
    await store.saveGame(game);
    await runGeneration(game, emit);
  } catch (error) {
    console.error('[generate] fallo inesperado:', error);
    emit({
      type: 'error',
      message:
        error instanceof Error && error.message
          ? error.message
          : 'Error inesperado durante la generación.',
    });
  } finally {
    /*
     * Y SI NO SALIÓ, SE DEVUELVE, sin que nadie lo pida: una generación que
     * falla, o una trama que la revisión no puede dar por buena. Va en el
     * `finally` para que ni un fallo inesperado se quede con el dinero.
     */
    try {
      const cierre = await cerrarElCobro(game.id, cobro.cargoId);
      if (cierre === 'devuelta') {
        emit({ type: 'text', delta: '\n[No se ha podido garantizar esta velada: se te ha devuelto entera.]\n' });
      }
    } catch (error) {
      console.error('[generate] no se pudo cerrar el cobro de la velada:', error);
    }
    res.end();
  }
});

export default router;
