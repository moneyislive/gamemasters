/**
 * El botón de «mandar las invitaciones», por HTTP.
 *
 * DÓNDE VA MONTADO Y POR QUÉ IMPORTA. Detrás del guardián de la contraseña y
 * DETRÁS de `taller/dueno`, como todo lo que cuelga de `/games/:id`. Si se
 * montara delante de `dueno`, cualquier persona con cuenta en el taller podría
 * mandar correos en nombre de la velada de otra: la ruta parece inofensiva
 * porque «solo manda un correo», y es justo esa apariencia la que hace que se
 * monte donde no toca.
 *
 * SE EXIGE LA PARTIDA EN VIVO ABIERTA, y no es una formalidad. Una invitación
 * apunta a una SILLA, y las sillas no existen hasta que se abre la sesión en
 * vivo: mandarlas antes produce doce correos con un enlace que, al pulsarlo,
 * dice que ahí no hay nada. Y esos doce correos ya no se pueden retirar.
 */
import { tallerAbiertoPara } from '../auth';
import { getStore } from '../db/store';
import { crearRouter } from '../rutas';
import { enviarInvitacion, modoDeCorreo } from './index';
import type { ModoDeCorreo } from './index';

const router = crearRouter();

/** Lo que se sabe de cada envío, para pintarlo en el panel. */
interface Resultado {
  suspectId: string;
  para: string;
  enlace?: string;
  error?: string;
}

router.post('/games/:id/invitaciones', async (req, res) => {
  /*
   * SEGUNDA VUELTA DE LLAVE. El guardián de la casa ya va delante cuando esto
   * está bien montado, así que esta comprobación sobra —hasta el día que no
   * sobre—. Cuesta una lectura del almacén por pulsación de un botón, y lo que
   * compra es que un error de montaje no convierta el servidor en un cañón de
   * correo hacia direcciones reales de personas reales.
   */
  if (!(await tallerAbiertoPara(req))) {
    res.status(401).json({ error: 'Acceso restringido: introduce la contraseña de la casa.' });
    return;
  }

  /*
   * El modo se resuelve ANTES de tocar nada. Con `CORREO_MODO` mal escrita esto
   * revienta (ver `modoDeCorreo`), y más vale que reviente aquí —con su
   * mensaje, y sin haber mandado nada— que a mitad de la lista.
   */
  let modo: ModoDeCorreo;
  try {
    modo = modoDeCorreo();
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    return;
  }

  const store = getStore();
  const partida = await store.getGame(req.params.id);
  if (!partida) {
    res.status(404).json({ error: 'Partida no encontrada.' });
    return;
  }

  const sesion = await store.getLive(req.params.id);
  if (!sesion) {
    res.status(409).json({
      error:
        'Abre la partida en vivo antes de mandar las invitaciones: hasta que no hay sillas, el ' +
        'enlace del correo no lleva a ninguna parte.',
    });
    return;
  }

  /*
   * Sin lista, van todas. Con lista, solo esas: es lo que hace falta para el
   * caso corriente de «a Ana no le ha llegado, mándasela otra vez» sin volver a
   * escribirle a los otros once.
   */
  const pedidos = Array.isArray(req.body?.suspectIds)
    ? new Set((req.body.suspectIds as unknown[]).map((s) => String(s)))
    : null;

  const enviadas: Resultado[] = [];
  const fallidas: Resultado[] = [];
  const sinCorreo: Array<{ suspectId: string; displayName: string }> = [];

  for (const jugador of sesion.players) {
    if (pedidos && !pedidos.has(jugador.suspectId)) continue;
    if (!jugador.email) {
      sinCorreo.push({ suspectId: jugador.suspectId, displayName: jugador.displayName });
      continue;
    }
    try {
      const mensaje = await enviarInvitacion({
        para: jugador.email,
        nombre: jugador.displayName,
        gameId: sesion.id,
        suspectId: jugador.suspectId,
        tituloPartida: partida.name,
      });
      enviadas.push({ suspectId: jugador.suspectId, para: mensaje.para, enlace: mensaje.enlace });
    } catch (error) {
      /*
       * UNA QUE FALLA NO TUMBA A LAS DEMÁS. Con doce destinatarios, la dirección
       * con una errata es lo normal, y cortar ahí dejaría a los que van detrás
       * en la lista sin invitación y sin que nadie se entere de cuáles.
       */
      fallidas.push({
        suspectId: jugador.suspectId,
        para: jugador.email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /*
   * Si no salió NINGUNA habiendo destinatarios, es configuración, no una
   * errata: se responde con un error de verdad para que el panel lo enseñe como
   * lo que es. Con un 200 y una lista vacía, quien organiza se queda pensando
   * que ya está.
   */
  if (enviadas.length === 0 && fallidas.length > 0) {
    res.status(502).json({
      error: `No se pudo mandar ninguna invitación: ${fallidas[0]?.error ?? 'sin detalle'}`,
      fallidas,
    });
    return;
  }

  res.json({ modo, enviadas, fallidas, sinCorreo });
});

export default router;
