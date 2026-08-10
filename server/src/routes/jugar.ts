/**
 * API de la app del jugador.
 *
 * Va montada ANTES del guardián de la contraseña de la casa: quien juega no
 * conoce —ni debe conocer— la contraseña del Game Master. Su credencial es el
 * testigo firmado que recibe al emparejar el móvil con el código de invitación.
 *
 * Ninguna ruta de este fichero devuelve nada que no haya pasado por
 * `vistaDeJugador`. Es la regla que sostiene el juego entero.
 */
import path from 'node:path';
import { env } from '../config';
import { getStore } from '../db/store';
import { avisosDesde, esperarCambio } from '../live/hub';
import { consultarConsejero } from '../live/consejero';
import { borrarCuentaDe, perfilDe } from '../live/cuentas';
import { firmaDeFotoValida } from '../live/fotos';
import { vistaDeJugador } from '../live/proyeccion';
import { guardarNotas, mutar, tocar } from '../live/sesion';
import { AccionInvalida, ejecutarAccion } from '../juegos/motor';
// Importar este módulo da de alta lo que hacen las acciones de CLUEDO.
import '../juegos/cluedo-acciones';
import { credencialDePeticion, credencialValidaPara, emitirCredencial } from '../live/token';
import type { NextFunction, Request, Response } from 'express';
import type { VistaJugador } from '../../../shared/live';
import { crearRouter } from '../rutas';

const router = crearRouter();

/**
 * Guardián de la sesión: un testigo solo vale para la apertura en la que se
 * emitió.
 *
 * Va aquí, en un único punto por delante de todas las rutas, y no repetido
 * dentro de cada una. Una comprobación de seguridad que hay que acordarse de
 * escribir en ocho sitios acaba faltando en el noveno, y ese noveno es el que
 * se explota. Así, una ruta nueva nace protegida sin que su autor haga nada.
 */
router.use(async (req: Request, res: Response, next: NextFunction) => {
  // Emparejar es justamente lo que reparte testigos: no puede exigir uno.
  if (req.path === '/jugar/entrar') {
    next();
    return;
  }
  const cred = credencialDePeticion(req.headers.authorization);
  // Sin credencial no se corta aquí: cada ruta responde su propio 401 con el
  // mensaje que le corresponde.
  if (!cred) {
    next();
    return;
  }
  try {
    const sesion = await getStore().getLive(cred.gameId);
    if (!credencialValidaPara(cred, sesion)) {
      res.status(401).json({
        error: 'La partida se ha vuelto a abrir. Pide tu código nuevo a quien la dirige.',
      });
      return;
    }
  } catch {
    // Si el almacén falla, que responda la ruta: este guardián no está para
    // convertir una caída de la base de datos en un «vuelve a entrar».
  }
  next();
});

/** Saca la credencial de la petición o corta con 401. */
function credencial(req: Request, res: Response): { gameId: string; suspectId: string } | null {
  const cred = credencialDePeticion(req.headers.authorization);
  if (!cred) {
    res.status(401).json({ error: 'Vuelve a entrar con tu código: la sesión no es válida.' });
    return null;
  }
  return cred;
}

/** Compone la vista del jugador o corta con el error adecuado. */
async function vistaActual(
  gameId: string,
  suspectId: string,
  res: Response,
): Promise<VistaJugador | null> {
  const store = getStore();
  const [game, sesion] = await Promise.all([store.getGame(gameId), store.getLive(gameId)]);
  if (!game || !sesion) {
    res.status(404).json({ error: 'Esta partida ya no está en juego.' });
    return null;
  }
  const vista = vistaDeJugador(game, sesion, suspectId);
  if (!vista) {
    res.status(403).json({ error: 'Ya no participas en esta partida.' });
    return null;
  }
  return vista;
}

// ---------------------------------------------------------------------------
// Emparejar el móvil
// ---------------------------------------------------------------------------

/**
 * Entrar con el código de la partida y el personal.
 *
 * Se responde igual —y con el mismo retardo— tanto si el código de partida no
 * existe como si el personal no casa, para no ir diciendo cuáles existen.
 */
router.post('/jugar/entrar', async (req, res) => {
  const codigo = String(req.body?.code ?? '').trim().toUpperCase();
  const codigoPersonal = String(req.body?.joinCode ?? '').trim().toUpperCase();

  const rechazar = (): void => {
    setTimeout(() => {
      res.status(401).json({ error: 'El código no es válido. Revísalo con quien dirige la partida.' });
    }, 500);
  };

  if (!codigo || !codigoPersonal) return rechazar();

  const store = getStore();
  const sesion = await store.getLiveByCode(codigo);
  if (!sesion) return rechazar();

  const jugador = sesion.players.find((p) => p.joinCode === codigoPersonal);
  if (!jugador) return rechazar();

  await mutar(sesion.id, (s) => {
    const j = s.players.find((p) => p.suspectId === jugador.suspectId);
    if (j) {
      j.joined = true;
      j.lastSeenAt = new Date().toISOString();
    }
  });

  res.json({
    token: emitirCredencial(sesion.id, jugador.suspectId, sesion.sid),
    gameId: sesion.id,
    suspectId: jugador.suspectId,
    displayName: jugador.displayName,
  });
});

// ---------------------------------------------------------------------------
// La vista, con espera de cambios
// ---------------------------------------------------------------------------

/**
 * Devuelve la vista del jugador.
 *
 * Con `?desde=N` no responde hasta que la partida cambie (o hasta agotar el
 * plazo). Es lo que hace que abrir una ronda se note al instante en doce
 * móviles sin sondear cada segundo.
 */
router.get('/jugar/vista', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;

  const desde = Number(req.query.desde);
  if (Number.isFinite(desde)) {
    const store = getStore();
    const actual = await store.getLive(cred.gameId);
    if (actual && (actual.rev ?? 0) <= desde) {
      const huboCambio = await esperarCambio(cred.gameId);
      if (!huboCambio) {
        // Sin novedad: el cliente vuelve a preguntar. Se aprovecha para marcar
        // que sigue vivo, que es como se pinta «conectado» en el panel.
        await mutarPresencia(cred.gameId, cred.suspectId);
        res.status(204).end();
        return;
      }
    }
  }

  await mutarPresencia(cred.gameId, cred.suspectId);
  const vista = await vistaActual(cred.gameId, cred.suspectId, res);
  if (!vista) return;
  res.json({
    vista,
    avisos: Number.isFinite(desde) ? avisosDesde(cred.gameId, desde, cred.suspectId) : [],
  });
});

/**
 * Marca presencia sin disparar una revisión.
 *
 * Pasa por el candado como cualquier otra escritura. Antes leía, modificaba y
 * guardaba por su cuenta, y eso abría una ventana real: doce móviles renuevan
 * presencia cada pocos segundos, así que uno podía leer la sesión, tardar en
 * volver, y guardar encima una acusación que se había registrado entretanto.
 * La acusación desaparecía sin dejar rastro.
 *
 * Silenciosa porque la presencia NO es un cambio de partida: si subiera la
 * revisión, doce teléfonos se despertarían unos a otros en bucle.
 */
async function mutarPresencia(gameId: string, suspectId: string): Promise<void> {
  try {
    await mutar(gameId, (sesion) => tocar(sesion, suspectId), { silenciosa: true });
  } catch {
    // La presencia es cosmética: nunca debe tumbar una petición.
  }
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

/**
 * Hacer algo.
 *
 * Una sola ruta para todo el repertorio del juego. Añadir «descifrar el
 * criptograma» no abre un endpoint nuevo: se declara en el manifiesto y se
 * escribe su reductor. La superficie de la API no crece nunca.
 */
router.post('/jugar/accion', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;

  const cuerpo = (req.body ?? {}) as { accion?: unknown; datos?: Record<string, unknown> };
  const accion = String(cuerpo.accion ?? '');
  const datos: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(cuerpo.datos ?? {})) {
    datos[String(campo)] = String(valor ?? '');
  }

  try {
    const store = getStore();
    const game = await store.getGame(cred.gameId);
    if (!game) {
      res.status(404).json({ error: 'Esta partida ya no está en juego.' });
      return;
    }
    const { resultado } = await mutar(cred.gameId, (s) =>
      ejecutarAccion(game, s, cred.suspectId, accion, datos),
    );
    const vista = await vistaActual(cred.gameId, cred.suspectId, res);
    if (!vista) return;
    res.json({ resultado, vista });
  } catch (error) {
    const estado = error instanceof AccionInvalida ? 409 : 409;
    res.status(estado).json({ error: mensaje(error, 'No se pudo hacer eso.') });
  }
});

/**
 * Entrar en una sala.
 *
 * Se conserva porque la app la usa, pero por dentro ya es la acción genérica:
 * un solo camino, una sola comprobación, y lo que valga para CLUEDO valdrá
 * para cualquier otro juego.
 */
router.post('/jugar/sala', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const roomId = String(req.body?.roomId ?? '');

  try {
    const store = getStore();
    const game = await store.getGame(cred.gameId);
    if (!game) {
      res.status(404).json({ error: 'Esta partida ya no está en juego.' });
      return;
    }
    await mutar(cred.gameId, (s) =>
      ejecutarAccion(game, s, cred.suspectId, 'entrar-en-sala', { sala: roomId }),
    );
    const vista = await vistaActual(cred.gameId, cred.suspectId, res);
    if (!vista) return;
    res.json({ vista });
  } catch (error) {
    res.status(409).json({ error: mensaje(error, 'No se pudo entrar en esa sala.') });
  }
});

router.post('/jugar/listo', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const listo = req.body?.listo !== false;
  try {
    await mutar(cred.gameId, (s) => {
      const jugador = s.players.find((p) => p.suspectId === cred.suspectId);
      if (!jugador) throw new Error('No participas en esta partida.');
      jugador.pideEmpezar = listo;
    });
    const vista = await vistaActual(cred.gameId, cred.suspectId, res);
    if (vista) res.json({ vista });
  } catch (error) {
    res.status(409).json({ error: mensaje(error, 'No se pudo avisar.') });
  }
});

router.post('/jugar/notas', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const notas = String(req.body?.notas ?? '');
  try {
    await mutar(cred.gameId, (s) => guardarNotas(s, cred.suspectId, notas));
    res.json({ ok: true });
  } catch (error) {
    res.status(409).json({ error: mensaje(error, 'No se pudieron guardar las notas.') });
  }
});

/**
 * Acusar.
 *
 * Por dentro es la acción `acusar` del juego. Quién gana y cuándo lo decide el
 * reductor de CLUEDO, no la plataforma: un juego donde se gane de otra manera
 * escribe el suyo y esta ruta le sirve igual.
 */
router.post('/jugar/acusar', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;

  const crudo = (req.body ?? {}) as { respuestas?: Record<string, unknown> };
  const datos: Record<string, string> = {};
  for (const [eje, valor] of Object.entries(crudo.respuestas ?? {})) {
    datos[String(eje)] = String(valor ?? '');
  }

  try {
    const store = getStore();
    const game = await store.getGame(cred.gameId);
    if (!game?.plot) {
      res.status(404).json({ error: 'Esta partida ya no está en juego.' });
      return;
    }
    const { resultado } = await mutar(cred.gameId, (s) =>
      ejecutarAccion(game, s, cred.suspectId, 'acusar', datos),
    );
    res.json(resultado);
  } catch (error) {
    res.status(409).json({ error: mensaje(error, 'No se pudo registrar la acusación.') });
  }
});

router.post('/jugar/preguntar', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const pregunta = String(req.body?.pregunta ?? '');
  try {
    const store = getStore();
    const game = await store.getGame(cred.gameId);
    if (!game) {
      res.status(404).json({ error: 'Esta partida ya no está en juego.' });
      return;
    }
    const vista = await vistaActual(cred.gameId, cred.suspectId, res);
    if (!vista) return;
    const respuesta = await consultarConsejero(game, vista, pregunta);
    res.json({ respuesta });
  } catch (error) {
    console.error('[jugar] el consejero falló:', error);
    res.status(503).json({ error: 'El consejero no está disponible ahora mismo.' });
  }
});

/**
 * Sirve una foto de la partida a quien juega.
 *
 * Existe porque `/uploads` está detrás de la contraseña de la casa y la app no
 * la tiene: en producción, donde `APP_PASSWORD` es obligatoria, TODAS las fotos
 * devolvían 401 y el jugador veía huecos negros en tres pantallas sin una
 * palabra de explicación.
 *
 * No pide credencial `Bearer` a propósito, y no es un descuido: `<Image>` no
 * manda cabeceras cuando la app corre en el navegador. La autorización va en la
 * firma del enlace, que emite la propia proyección y ata la foto a SU partida
 * (ver `live/fotos.ts`). Sin firma válida no se sirve nada, y con una firma no
 * se puede pedir otra cosa que ese fichero.
 */
router.get('/jugar/foto/:gameId/:archivo', (req, res) => {
  const { gameId, archivo } = req.params;
  const firma = String(req.query.f ?? '');

  if (!firmaDeFotoValida(gameId, archivo, firma)) {
    res.status(404).end();
    return;
  }

  // Doble cinturón: la firma ya obliga a que el nombre sea de los que fabrica
  // `uploads.ts`, pero además se comprueba que la ruta resuelta cae DENTRO de
  // la carpeta. Un fallo aquí no es una foto de más: es leer ficheros del
  // servidor.
  const carpeta = path.resolve(env.uploadsDir);
  const completa = path.resolve(carpeta, archivo);
  if (completa !== path.join(carpeta, archivo)) {
    res.status(404).end();
    return;
  }

  res.sendFile(completa, { headers: cabecerasDeFoto(archivo) }, (error) => {
    if (error && !res.headersSent) res.status(404).end();
  });
});

/** La tabla mime de Express no conoce AVIF y el navegador no lo pinta. */
function cabecerasDeFoto(archivo: string): Record<string, string> {
  const cabeceras: Record<string, string> = {
    // Las fotos no cambian: el nombre lo fabrica `nanoid` y subir otra crea
    // otro fichero. Cachear de verdad es lo que evita que doce móviles
    // vuelvan a descargarlas en cada vuelta del sondeo.
    'Cache-Control': 'private, max-age=604800',
  };
  if (archivo.toLowerCase().endsWith('.avif')) cabeceras['Content-Type'] = 'image/avif';
  return cabeceras;
}

router.get('/jugar/perfil', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const store = getStore();
  const sesion = await store.getLive(cred.gameId);
  const jugador = sesion?.players.find((p) => p.suspectId === cred.suspectId);
  const cuenta = await perfilDe(jugador?.email);
  res.json({ cuenta });
});

/**
 * Borra la cuenta del jugador y todo lo que cuelga de su correo.
 *
 * Existe porque las dos tiendas lo exigen —Apple 5.1.1(v), Google Play desde
 * abril de 2024— a toda app en la que se pueda acabar con una cuenta, y aquí
 * se acaba: nadie se registra, pero el Game Master escribe tu correo al montar
 * la partida y a partir de ahí tienes perfil, historial y trofeos. Que la
 * cuenta la abriera otro no la hace menos tuya.
 *
 * También es el derecho de supresión del RGPD, que aquí no tenía ni una
 * ventanilla: no había forma de pedirlo ni forma de concederlo.
 *
 * El borrado es AMPLIO a propósito: no se limita a la partida desde la que se
 * pide. Ver `borrarCuentaDe`.
 */
router.delete('/jugar/cuenta', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;

  const store = getStore();
  const sesion = await store.getLive(cred.gameId);
  const jugador = sesion?.players.find((p) => p.suspectId === cred.suspectId);
  if (!jugador) {
    res.status(403).json({ error: 'Ya no participas en esta partida.' });
    return;
  }
  if (!jugador.email) {
    // Sin correo no hay cuenta: no es un error, es que no había nada que
    // borrar. Se responde en positivo para que la app diga lo mismo.
    res.json({ borrada: false, partidasLimpiadas: 0 });
    return;
  }

  const resultado = await borrarCuentaDe(jugador.email);
  res.json({
    borrada: resultado.cuentaBorrada,
    partidasLimpiadas: resultado.partidasLimpiadas,
  });
});

function mensaje(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto;
}

export default router;
