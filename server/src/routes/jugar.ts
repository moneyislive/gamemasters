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
import { marcarPresencia } from '../live/presencia';
import { consultarConsejero } from '../live/consejero';
import { aceptarGuardar, borrarCuenta, perfilDe } from '../live/cuentas';
import { firmaDeFotoValida } from '../live/fotos';
import { vistaDeJugador } from '../live/proyeccion';
import { guardarNotas, mutar } from '../live/sesion';
import { AccionInvalida, ejecutarAccion } from '../juegos/motor';
import { accionDeAcusacion, accionDeEntrarEnLugar, manifiestoDe } from '../../../shared/juegos';
/*
 * El alta de los juegos ya no vive aqui: la hace `juegos/instalados.ts` desde
 * el arranque. Colgarla de esta ruta funcionaba con un solo juego —toda
 * partida pasa por aqui tarde o temprano— y con dos era una trampa: habia que
 * acordarse de anadir una linea en un fichero que no tiene nada que ver con el
 * juego que se esta escribiendo, y olvidarla no fallaba al arrancar sino en la
 * primera partida.
 */
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
        marcarPresencia(cred.gameId, cred.suspectId);
        res.status(204).end();
        return;
      }
    }
  }

  marcarPresencia(cred.gameId, cred.suspectId);
  const vista = await vistaActual(cred.gameId, cred.suspectId, res);
  if (!vista) return;
  res.json({
    vista,
    avisos: Number.isFinite(desde) ? avisosDesde(cred.gameId, desde, cred.suspectId) : [],
  });
});

/*
 * AQUÍ HABÍA UNA ESCRITURA, Y ERA LA MÁS CARA DE LA VELADA.
 *
 * Marcar «sigo aquí» pedía el candado de la partida, releía la sesión entera y
 * la volvía a guardar completa. Doce móviles, cada veinticinco segundos, más
 * una vuelta por cada cambio que se les entrega. Y lo caro no eran los bytes:
 * mientras esa ida y vuelta ocupaba el candado, la acusación de otro esperaba
 * detrás. La velada se estrechaba por el cuello del dato más insignificante que
 * tiene.
 *
 * Ahora es un número en un mapa: `marcarPresencia`. En `live/presencia.ts` está
 * por qué se puede —la presencia es cosmética y solo mira sesenta segundos
 * atrás— y cómo el documento se sigue poniendo al día de balde, subido a las
 * escrituras que ya iban a ocurrir.
 */

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
  /*
   * Las LISTAS se conservan como listas. Antes todo pasaba por `String(valor)`,
   * asi que un array llegaba al motor convertido en «a,b,c» y la accion se
   * quedaba sin sus datos: el sellado de la Momia —ordenar cinco ritos— no se
   * podia hacer por HTTP aunque el reductor estuviera escrito.
   *
   * Se sanean igual: cada elemento a cadena, y el motor comprueba despues que
   * cada uno sea una entidad real de su categoria.
   */
  const datos: Record<string, string | string[]> = {};
  for (const [campo, valor] of Object.entries(cuerpo.datos ?? {})) {
    datos[String(campo)] = Array.isArray(valor)
      ? valor.map((v) => String(v ?? ''))
      : String(valor ?? '');
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
    /*
     * LA ACCIÓN Y EL NOMBRE DEL CAMPO SALEN DEL MANIFIESTO, no de aquí.
     *
     * Estaban cableados a `'entrar-en-sala'` y `sala`, que son los de CLUEDO,
     * así que en El Misterio de la Momia tocar una cámara en el plano
     * contestaba 409 mientras la propia pantalla invitaba a tocarla.
     */
    const entrar = accionDeEntrarEnLugar(manifiestoDe(game.settings?.juego));
    if (!entrar) {
      res.status(409).json({ error: 'En esta partida no se entra en ningún sitio.' });
      return;
    }
    await mutar(cred.gameId, (s) =>
      ejecutarAccion(game, s, cred.suspectId, entrar.accion.id, { [entrar.campo]: roomId }),
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
    /*
     * EL ID DE LA ACCIÓN SALE DEL MANIFIESTO, no de una constante escrita aquí.
     * Estaba cableado a `'acusar'`, que es el nombre que le puso CLUEDO, así
     * que en El Misterio de la Momia —donde la acción se llama `senalar`— esta
     * ruta contestaba «eso no se puede hacer en esta partida» a los dos botones
     * que llevan aquí, para todo el mundo y toda la noche.
     */
    const accion = accionDeAcusacion(manifiestoDe(game.settings?.juego));
    if (!accion) {
      res.status(409).json({ error: 'En esta partida no se acusa a nadie.' });
      return;
    }
    const { resultado } = await mutar(cred.gameId, (s) =>
      ejecutarAccion(game, s, cred.suspectId, accion.id, datos),
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

/** Cuánto se guarda de una denuncia. Lo justo para poder juzgarla. */
const MAX_TEXTO_DENUNCIA = 4000;
/** Tope por partida: una denuncia es una señal, no un canal de escritura. */
const MAX_DENUNCIAS = 100;

/**
 * Denunciar una respuesta del Mayordomo.
 *
 * Lo exige la política de contenido generado con IA de Google Play, y con
 * palabras que no dejan margen: tiene que poder denunciarse DENTRO de la app,
 * sin salir de ella. Aquí además tiene todo el sentido, porque el Mayordomo es
 * el botón central de la barra y está a mano en cualquier momento de la velada.
 *
 * La denuncia va a la propia partida, que es donde la ve quien la dirige. En un
 * juego que se monta en el salón de alguien, esa persona es quien responde de
 * lo que sale por pantalla; un buzón remoto no serviría de nada esta noche.
 *
 * Silenciosa: no despierta a los doce móviles. Que alguien denuncie una
 * respuesta no es un cambio de partida.
 */
router.post('/jugar/denunciar', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;

  const recortar = (v: unknown): string => String(v ?? '').slice(0, MAX_TEXTO_DENUNCIA);
  const pregunta = recortar(req.body?.pregunta);
  const respuesta = recortar(req.body?.respuesta);
  if (!respuesta.trim()) {
    res.status(400).json({ error: 'No hay ninguna respuesta que denunciar.' });
    return;
  }

  try {
    await mutar(
      cred.gameId,
      (s) => {
        const jugador = s.players.find((p) => p.suspectId === cred.suspectId);
        if (!jugador) throw new Error('Ya no participas en esta partida.');
        const lista = s.denuncias ?? [];
        lista.push({
          suspectId: cred.suspectId,
          displayName: jugador.displayName,
          pregunta,
          respuesta,
          at: new Date().toISOString(),
        });
        // Se conservan las últimas: sin tope, esta ruta seria una forma de
        // engordar la partida sin límite desde un móvil cualquiera.
        s.denuncias = lista.slice(-MAX_DENUNCIAS);
      },
      { silenciosa: true },
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(409).json({ error: mensaje(error, 'No se pudo enviar la denuncia.') });
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

/**
 * El perfil: historial y trofeos, si es que se guardan.
 *
 * Devuelve además `invitacion` —el correo que escribió quien organiza— para que
 * la app pueda ofrecer guardar. Es el correo de quien pregunta y solo se le
 * enseña a él; ninguna otra ruta lo emite hacia ningún móvil.
 */
router.get('/jugar/perfil', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const store = getStore();
  const sesion = await store.getLive(cred.gameId);
  const jugador = sesion?.players.find((p) => p.suspectId === cred.suspectId);
  const cuenta = await perfilDe(jugador?.vinculo);
  res.json({
    cuenta,
    invitacion: jugador?.email ?? null,
    guardando: Boolean(jugador?.vinculo),
  });
});

/**
 * Acepta —o retira— que las partidas se guarden en un perfil.
 *
 * Es la ventanilla del consentimiento, y está aquí, en el móvil de quien juega,
 * porque es el único sitio donde tiene sentido: hasta ahora el «sí» lo daba
 * quien organiza sin saberlo, con solo teclear un correo al montar la partida.
 *
 * Retirarlo NO borra la cuenta —eso es `DELETE /jugar/cuenta`— sino que deja de
 * alimentarla: esta partida ya no se apuntará. Son dos cosas distintas y la app
 * las ofrece por separado.
 */
router.post('/jugar/perfil/guardar', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const guardar = req.body?.guardar !== false;

  try {
    const store = getStore();
    const sesion = await store.getLive(cred.gameId);
    const jugador = sesion?.players.find((p) => p.suspectId === cred.suspectId);
    if (!jugador) {
      res.status(403).json({ error: 'Ya no participas en esta partida.' });
      return;
    }

    if (!guardar) {
      await mutar(cred.gameId, (s) => {
        const j = s.players.find((p) => p.suspectId === cred.suspectId);
        if (j) delete j.vinculo;
      });
      res.json({ guardando: false });
      return;
    }

    if (!jugador.email) {
      res.status(409).json({
        error: 'Quien organiza no ha puesto ningún correo para ti, así que no hay dónde guardar.',
      });
      return;
    }

    // La cuenta se crea o se recupera FUERA del candado —habla con el almacén—
    // y solo el vínculo se escribe dentro.
    const vinculo = await aceptarGuardar(jugador.email, jugador.displayName);
    await mutar(cred.gameId, (s) => {
      const j = s.players.find((p) => p.suspectId === cred.suspectId);
      if (j) j.vinculo = vinculo;
    });
    res.json({ guardando: true });
  } catch (error) {
    res.status(409).json({ error: mensaje(error, 'No se pudo cambiar la preferencia.') });
  }
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
  /*
   * SE BORRA LA CUENTA A LA QUE ESTA SILLA ESTÁ VINCULADA, y solo esa.
   *
   * Antes se borraba `borrarCuentaDe(jugador.email)`, y ese correo lo teclea
   * QUIEN MONTA LA PARTIDA al crear la silla: no es una identidad, es una
   * dirección de invitación que nadie ha verificado. Si el organizador escribía
   * ahí el correo de un conocido que sí tiene cuenta, quien se sentara en esa
   * silla podía borrársela sin haber aceptado nada ni haber demostrado nada.
   *
   * `accountId` solo se escribe cuando esa persona ACEPTÓ vincular su silla a
   * su cuenta, que es la única señal de que la cuenta es suya. Sin vínculo no
   * hay nada que borrar, y eso no es un error: es que no había cuenta.
   */
  if (!jugador.accountId) {
    res.json({ borrada: false, partidasLimpiadas: 0 });
    return;
  }

  const suya = await store.getAccount(jugador.accountId);
  if (!suya) {
    res.json({ borrada: false, partidasLimpiadas: 0 });
    return;
  }

  const resultado = await borrarCuenta(suya);
  res.json({
    borrada: resultado.cuentaBorrada,
    partidasLimpiadas: resultado.partidasLimpiadas,
  });
});

function mensaje(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto;
}

export default router;
