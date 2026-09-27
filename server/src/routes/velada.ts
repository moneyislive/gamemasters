/**
 * Lo que el taller pregunta ANTES de generar, y el cambio de modo DESPUÉS.
 *
 *   POST /api/games/:id/presupuesto   body {modo, model?, esfuerzo?}
 *        → lo que costaría, lo que trae, el saldo de quien paga y si ya está pagada
 *   POST /api/games/:id/modo          body {modo}
 *        → cambia papel ↔ app. De app a papel no cuesta nada; de papel a app, en
 *          una velada ya pagada en papel, se cobra la diferencia (el Mayordomo).
 *
 * Cuelgan de `/games/:id`, así que pasan por el guardián de dueños: nadie pide
 * el presupuesto ni cambia el modo de una velada ajena.
 */
import type { Esfuerzo } from '../../../shared/types';
import type { ModoDeJuego, RespuestaDelPresupuesto } from '../../../shared/cobro';
import { crearRouter } from '../rutas';
import { getStore } from '../db/store';
import { ORDEN_DE_ESFUERZO } from '../agent/anthropic';
import { pagadorDe } from '../cobro/quien-paga';
import { cargar } from '../cobro/monedero';
import { COBRO_ACTIVO } from '../cobro/ofertas';
import { diferenciaDePapelAApp, esModo, modeloValido, presupuestoDeLaVelada, saldoDeLaCuenta } from '../cobro/velada';
import { partidaParaElTaller } from '../live/proyeccion';

const router = crearRouter();

router.post('/games/:id/presupuesto', async (req, res) => {
  const game = await getStore().getGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'No existe esa partida.' });
    return;
  }
  const cuerpo = (req.body ?? {}) as { modo?: unknown; model?: unknown; esfuerzo?: unknown };
  const modo: ModoDeJuego = esModo(cuerpo.modo) ? cuerpo.modo : (game.settings?.modo ?? 'papel');
  const presupuesto = await presupuestoDeLaVelada(game, {
    modo,
    ...(modeloValido(cuerpo.model) ? { model: cuerpo.model } : {}),
    ...(ORDEN_DE_ESFUERZO.includes(cuerpo.esfuerzo as Esfuerzo) ? { esfuerzo: cuerpo.esfuerzo as Esfuerzo } : {}),
  });
  const pagador = await pagadorDe(req);
  const cobra = COBRO_ACTIVO && pagador?.tipo === 'cuenta';
  const respuesta: RespuestaDelPresupuesto = {
    presupuesto,
    cobra,
    ...(cobra && pagador?.tipo === 'cuenta' ? { saldo: await saldoDeLaCuenta(pagador.cuenta.id) } : {}),
    ...(game.cobro && !game.cobro.exenta && game.cobro.creditos > 0
      ? { pagada: { modo: game.cobro.modo, regeneracionIncluida: game.cobro.usos.regeneraciones < 1 } }
      : {}),
  };
  res.json(respuesta);
});

router.post('/games/:id/modo', async (req, res) => {
  const store = getStore();
  const game = await store.getGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'No existe esa partida.' });
    return;
  }
  const modo = (req.body as { modo?: unknown } | undefined)?.modo;
  if (!esModo(modo)) {
    res.status(400).json({ error: 'El modo es «papel» o «app».' });
    return;
  }

  /*
   * El modo de la partida es una PREFERENCIA —qué documentos se enseñan, cómo lo
   * mide la revisión— y se cambia gratis. Lo que se pagó va aparte, en
   * `cobro.modo`: pasar a papel no quita el Mayordomo ya pagado, y pasar a app
   * una velada pagada en papel cobra solo la diferencia.
   */
  const pagador = await pagadorDe(req);
  if (modo === 'app' && game.cobro && !game.cobro.exenta && game.cobro.modo === 'papel' && pagador?.tipo === 'cuenta') {
    const diferencia = await diferenciaDePapelAApp(game);
    if (diferencia > 0) {
      const cargo = await cargar(pagador.cuenta.id, diferencia, `Velada «${game.name}»: de papel a app (el Mayordomo)`, {
        gameId: game.id,
        referencia: `velada:${game.id}:a-app`,
      });
      if (!cargo.ok) {
        res.status(402).json({
          error: `Pasarla a app cuesta ${diferencia} créditos y tienes ${cargo.saldo}.`,
          motivo: 'sin-saldo',
          saldo: cargo.saldo,
        });
        return;
      }
      game.cobro = {
        ...game.cobro,
        modo: 'app',
        creditos: game.cobro.creditos + diferencia,
        movimientos: [...game.cobro.movimientos, cargo.movimiento.id],
      };
    } else {
      game.cobro = { ...game.cobro, modo: 'app' };
    }
  }
  game.settings = { ...game.settings, modo };
  const guardada = await store.saveGame(game);
  res.json(partidaParaElTaller(guardada));
});

export default router;
