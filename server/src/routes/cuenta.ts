/**
 * La cuenta: lo que eres en la plataforma, más allá de una velada.
 *
 * Va montado ANTES del guardián de la contraseña de la casa, junto a las rutas
 * de la app: quien juega no conoce esa contraseña y no tiene por qué. Su
 * autorización aquí es el pasaporte de cuenta, que viaja por su propia
 * cabecera.
 *
 * LO QUE ESTE ROUTER NO HACE: dar acceso a una partida. El pasaporte de cuenta
 * no autoriza a jugar; solo permite PEDIR una credencial de jugador por la vía
 * de siempre, con su `sid` atado a la apertura concreta de la partida. Esa es
 * la única revocación real que tiene el juego —cerrar y reabrir la mesa echa a
 * todo el mundo— y no se puede perder por una comodidad.
 */
import { randomUUID } from 'node:crypto';
import { env } from '../config';
import { getStore } from '../db/store';
import { crearRouter } from '../rutas';
import {
  COOKIE_CUENTA,
  emitirSesionDeCuenta,
  leerCookie,
  opcionesDeCookie,
  pasaporteVigente,
  sesionDeCuentaDePeticion,
} from '../identidad/sesion';
import { abrirSobre, cerrarSobre } from '../identidad/sobre';
import { TestigoInvalido, proveedorConfigurado, verificarIdToken } from '../identidad/oidc';
import {
  ConflictoDeIdentidad,
  admitidoEnElTaller,
  entrarConProveedor,
  vincularIdentidad,
} from '../identidad/cuentas-proveedor';
import { invitacionesPara } from '../live/invitaciones';
import { panelDe } from '../live/panel';
import { borrarCuenta } from '../live/cuentas';
import { mutar } from '../live/sesion';
import { emitirCredencial } from '../live/token';
import type { Request, Response } from 'express';
import type { Account } from '../../../shared/live';

const router = crearRouter();

/** Donde viaja el nonce del camino del navegador, entre la ida y la vuelta. */
const COOKIE_NONCE = 'gm_nonce';

/**
 * Proveedores con PUERTA DE ENTRADA POR NAVEGADOR, que no es lo mismo que estar
 * configurados.
 *
 * Tener credenciales de Apple permite VERIFICAR un testigo que llega de la app
 * del iPhone, y eso le basta a la app. Pero entrar con Apple desde un navegador
 * es otra cosa: exige un Services ID y el dominio verificado ante Apple, y su
 * ruta de ida todavía no existe.
 *
 * El taller solo puede entrar por navegador, así que si mirara `apple` a secas
 * pintaría un botón hacia una ruta que no está, y quien lo pulsara se llevaría
 * un 404 creyendo que la culpa es suya. Estuvo a punto de pasar.
 *
 * AÑADIR UNA ENTRADA ES AÑADIRLA AQUÍ Y ESCRIBIR SU RUTA. Que las dos cosas no
 * se separen lo vigila `verify:puerta-google`, que compara esta lista con las
 * rutas `/cuenta/entrar/*` que existen de verdad en este fichero.
 */
const ENTRADAS_DE_NAVEGADOR: Array<'google' | 'apple'> = ['google'];

/** Quién empezó el viaje a Google: el taller en un navegador, o la app. */
type Destino = 'taller' | 'app';

/**
 * Los códigos de canje ya gastados.
 *
 * EN MEMORIA Y A PROPÓSITO. El código vive dos minutos, así que la ventana que
 * abre un reinicio del servidor es de dos minutos; guardarlo en la base de
 * datos costaría una escritura y una lectura en el camino más sensible que hay
 * a cambio de cerrar eso. Si algún día hay más de un proceso sirviendo, esto
 * hay que mover al almacén — y entonces será una decisión, no un descuido.
 */
const canjesGastados = new Set<string>();

/** Un código de un solo uso que la app cambia por su pasaporte. */
function emitirCanje(cuentaId: string): string {
  return cerrarSobre('canje:v1', { cuentaId, jti: randomUUID() }, 120);
}

/** La cuenta de quien llama, o corta con 401. */
async function cuentaDe(req: Request, res: Response): Promise<Account | null> {
  const pasaporte = sesionDeCuentaDePeticion(req);
  if (!pasaporte) {
    res.status(401).json({ error: 'Inicia sesión para ver tu cuenta.' });
    return null;
  }
  const cuenta = await getStore().getAccount(pasaporte.cuentaId);
  if (!cuenta) {
    res.status(401).json({ error: 'Esta sesión ya no vale. Vuelve a entrar.' });
    return null;
  }
  /*
   * El corte de revocación se comprueba AQUÍ, contra el almacén, y no dentro
   * del pasaporte. Si fuera al revés, echar a alguien no surtiría efecto hasta
   * que caducara su sesión, y eso son noventa días.
   */
  if (!pasaporteVigente(pasaporte, cuenta)) {
    res.status(401).json({ error: 'Esta sesión ya no vale. Vuelve a entrar.' });
    return null;
  }
  return cuenta;
}

/**
 * Entrar con un proveedor de identidad.
 *
 * El móvil manda el `id_token` que le dio Google o Apple; aquí se verifica
 * contra las claves públicas del proveedor (ver `identidad/oidc.ts`) y se
 * reparte un pasaporte de cuenta.
 *
 * DOS COSAS QUE NO HACE, y las dos son deliberadas:
 *
 *   · NO adopta una cuenta existente porque el correo coincida. Si ya había un
 *     perfil creado por el camino del consentimiento —con el correo que tecleó
 *     quien organiza— se crea una cuenta nueva y limpia. Unirlas es cosa de la
 *     persona, desde dentro, con `/cuenta/vincular`.
 *   · NO da acceso a jugar. El pasaporte solo permite pedir una credencial por
 *     la vía normal.
 */
router.post('/cuenta/entrar', async (req, res) => {
  const proveedor = String(req.body?.proveedor ?? '');
  const idToken = String(req.body?.idToken ?? '');
  /*
   * El nonce llega de dos sitios según quién llame:
   *
   *   · La app lo manda en el cuerpo: lo generó ella y lo recuerda.
   *   · El navegador NO puede: la página del retorno se sirve recién hecha y no
   *     recuerda nada. Su nonce está en la cookie firmada que dejó
   *     `/cuenta/entrar/google`, y se lee de ahí.
   *
   * Que el del navegador venga de una cookie firmada por el servidor, y no del
   * cuerpo, es justo lo que le da valor: si viniera en el cuerpo lo elegiría
   * quien llama, y entonces no comprobaría nada.
   */
  const desdeNavegador = req.body?.desdeNavegador === true;
  const sobreNonce = desdeNavegador
    ? abrirSobre<{ nonce: string; destino: Destino }>('nonce:v1', leerCookie(req, COOKIE_NONCE))
    : null;
  const nonce = desdeNavegador
    ? sobreNonce?.nonce
    : req.body?.nonce
      ? String(req.body.nonce)
      : undefined;

  if (proveedor !== 'google' && proveedor !== 'apple') {
    res.status(400).json({ error: 'Proveedor no admitido.' });
    return;
  }
  if (desdeNavegador && !nonce) {
    res.status(400).json({ error: 'La entrada ha caducado. Vuelve a empezar.' });
    return;
  }
  if (!proveedorConfigurado(proveedor)) {
    res.status(503).json({
      error:
        `Iniciar sesión con ${proveedor === 'google' ? 'Google' : 'Apple'} no está configurado ` +
        'en este servidor. Entra con tu código mientras tanto.',
    });
    return;
  }

  try {
    const identidad = await verificarIdToken(proveedor, idToken, nonce);
    const cuenta = await entrarConProveedor(identidad);
    const pasaporte = emitirSesionDeCuenta(cuenta, proveedor);

    const resumen = {
      id: cuenta.id,
      displayName: cuenta.displayName,
      email: cuenta.email,
      taller: admitidoEnElTaller(cuenta),
    };

    if (!desdeNavegador) {
      // La app nativa que ya tiene el testigo: se le da el pasaporte y ya está.
      res.json({ pasaporte, cuenta: resumen });
      return;
    }

    // El nonce es de un solo uso: gastado, se tira.
    res.clearCookie(COOKIE_NONCE, { path: '/' });

    if (sobreNonce?.destino === 'app') {
      /*
       * El viaje lo empezó la APP dentro de su navegador de sesión. Aquí NO se
       * pone cookie: la app no las tiene. Se devuelve un código de un solo uso
       * y de dos minutos que la página del retorno pondrá en un enlace
       * `harkania://`.
       *
       * POR QUÉ UN CÓDIGO Y NO EL PASAPORTE DIRECTAMENTE. Ese enlace sale del
       * navegador y entra en el sistema operativo: en Android puede verlo otra
       * aplicación que declare el mismo esquema. Un pasaporte de noventa días
       * ahí sería un regalo; un código que caduca en dos minutos y muere al
       * primer uso, casi nada.
       *
       * Y VUELVE A `retorno-google`, NO A `entrar`. La primera versión usaba
       * `harkania://entrar?codigo=…` y chocaba dos veces con lo que ya existía:
       * `entrar` ES la pantalla de los códigos de partida, y encima lee un
       * parámetro llamado `codigo` para rellenar el de la mesa. Resultado: al
       * volver de Google se abría el formulario de códigos con el código de
       * canje metido en la casilla de la partida. Una ruta de vuelta tiene que
       * ser suya y no compartir nombre con una pantalla de verdad.
       */
      res.json({ codigo: emitirCanje(cuenta.id), cuenta: resumen });
      return;
    }

    res.cookie(COOKIE_CUENTA, pasaporte, opcionesDeCookie(req, 60 * 60 * 24 * 90 * 1000));
    // Al navegador NO se le manda el pasaporte en el cuerpo: lo guarda la
    // cookie, y en el cuerpo quedaría al alcance de cualquier script.
    res.json({ cuenta: resumen });
  } catch (error) {
    if (error instanceof TestigoInvalido) {
      res.status(401).json({ error: `No se pudo comprobar tu identidad: ${error.message}` });
      return;
    }
    console.error('[cuenta] fallo al entrar con proveedor:', error);
    res.status(502).json({ error: 'El proveedor de identidad no responde ahora mismo.' });
  }
});

/**
 * La app cambia su código de un solo uso por el pasaporte.
 *
 * ES EL ÚLTIMO TRAMO del camino de Google en la app: el navegador de sesión
 * volvió a `harkania://entrar?codigo=…`, y ese código —firmado, de dos
 * minutos— se cambia aquí por la sesión de verdad.
 *
 * DE UN SOLO USO, y hace falta que lo sea: el enlace de vuelta atraviesa el
 * sistema operativo, y en Android otra aplicación puede declarar el mismo
 * esquema y llegar a verlo. Que el segundo intento falle convierte una copia
 * robada en papel mojado casi siempre, y en las contadas veces que llegue antes
 * quien lo robó, la persona ve que su propia entrada falla — que es la única
 * forma de que se entere.
 */
router.post('/cuenta/entrar/canjear', async (req, res) => {
  const codigo = String(req.body?.codigo ?? '');
  const sobre = abrirSobre<{ cuentaId: string; jti: string }>('canje:v1', codigo);
  if (!sobre) {
    res.status(401).json({ error: 'Este acceso ha caducado. Vuelve a entrar.' });
    return;
  }
  if (canjesGastados.has(sobre.jti)) {
    res.status(409).json({ error: 'Este acceso ya se ha usado. Vuelve a entrar.' });
    return;
  }
  canjesGastados.add(sobre.jti);
  // Se olvida al caducar: si no, el conjunto crecería sin fin.
  setTimeout(() => canjesGastados.delete(sobre.jti), 120_000).unref?.();

  const cuenta = await getStore().getAccount(sobre.cuentaId);
  if (!cuenta) {
    res.status(401).json({ error: 'Esa cuenta ya no existe.' });
    return;
  }
  res.json({
    pasaporte: emitirSesionDeCuenta(cuenta, 'google'),
    cuenta: {
      id: cuenta.id,
      displayName: cuenta.displayName,
      email: cuenta.email,
      taller: admitidoEnElTaller(cuenta),
    },
  });
});

/**
 * Vincular un SEGUNDO proveedor a la cuenta con la que ya estás dentro.
 *
 * Es el único puente entre identidades, y por eso exige sesión: quien lo pide
 * ya demostró controlar la primera, y al presentar el testigo demuestra la
 * segunda. Si esa identidad pertenece a otro perfil se responde 409 con un
 * mensaje que se pueda leer en voz alta — jamás se fusionan dos cuentas.
 */
router.post('/cuenta/vincular', async (req, res) => {
  const cuenta = await cuentaDe(req, res);
  if (!cuenta) return;

  const proveedor = String(req.body?.proveedor ?? '');
  const idToken = String(req.body?.idToken ?? '');
  const nonce = req.body?.nonce ? String(req.body.nonce) : undefined;

  if (proveedor !== 'google' && proveedor !== 'apple') {
    res.status(400).json({ error: 'Proveedor no admitido.' });
    return;
  }

  try {
    const identidad = await verificarIdToken(proveedor, idToken, nonce);
    const actualizada = await vincularIdentidad(cuenta, identidad);
    res.json({
      // Vincular corta las sesiones anteriores, así que hay que repartir una
      // nueva o quien acaba de vincular se quedaría fuera al instante.
      pasaporte: emitirSesionDeCuenta(actualizada, proveedor),
      identidades: (actualizada.identidades ?? []).map((i) => i.proveedor),
    });
  } catch (error) {
    if (error instanceof ConflictoDeIdentidad) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof TestigoInvalido) {
      res.status(401).json({ error: `No se pudo comprobar esa identidad: ${error.message}` });
      return;
    }
    res.status(502).json({ error: 'El proveedor de identidad no responde ahora mismo.' });
  }
});

/** Qué formas de entrar ofrece este servidor. La app lo pregunta al arrancar. */
router.get('/cuenta/proveedores', (_req, res) => {
  res.json({
    google: proveedorConfigurado('google'),
    apple: proveedorConfigurado('apple'),
    navegador: ENTRADAS_DE_NAVEGADOR.filter((p) => proveedorConfigurado(p)),
  });
});

// ---------------------------------------------------------------------------
// El camino del NAVEGADOR (el taller). El móvil no pasa por aquí.
// ---------------------------------------------------------------------------

/**
 * Manda al taller a la pantalla de Google.
 *
 * FLUJO IMPLÍCITO, y por qué: se pide directamente el `id_token`, que es lo
 * único que necesita el servidor. La alternativa —código de autorización— exige
 * guardar el secreto del cliente y montar un intercambio, y no aporta nada aquí
 * porque no se quiere ningún permiso sobre la cuenta más allá de saber quién
 * eres.
 *
 * El `nonce` se guarda en una cookie firmada de un minuto y se compara al
 * volver. Es lo que impide que un testigo capturado en otro sitio sirva para
 * entrar aquí.
 */
router.get('/cuenta/entrar/google', (req, res) => {
  if (!proveedorConfigurado('google')) {
    res.status(503).send('Entrar con Google no está configurado en este servidor.');
    return;
  }
  const clienteWeb = (process.env.GOOGLE_CLIENT_IDS ?? '').split(',')[0]?.trim();
  if (!clienteWeb) {
    res.status(503).send('Falta el identificador de cliente de Google.');
    return;
  }

  // Quién ha empezado el viaje. Se guarda FIRMADO junto al nonce, no en la URL
  // de vuelta: si viniera de la URL lo elegiría quien llama, y entonces
  // cualquiera podría pedir que el pasaporte saliera hacia la app.
  const destino: Destino = req.query.destino === 'app' ? 'app' : 'taller';

  const nonce = randomUUID();
  res.cookie(
    COOKIE_NONCE,
    cerrarSobre('nonce:v1', { nonce, destino }, 300),
    opcionesDeCookie(req, 300_000),
  );

  const aGoogle = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  aGoogle.searchParams.set('client_id', clienteWeb);
  aGoogle.searchParams.set('redirect_uri', `${origenDe(req)}/api/cuenta/retorno`);
  aGoogle.searchParams.set('response_type', 'id_token');
  aGoogle.searchParams.set('scope', 'openid email profile');
  aGoogle.searchParams.set('nonce', nonce);
  res.redirect(aGoogle.toString());
});

/**
 * La vuelta de Google.
 *
 * EL DETALLE QUE SORPRENDE: con el flujo implícito, el testigo vuelve en el
 * FRAGMENTO de la URL (`#id_token=…`), y el fragmento NUNCA llega al servidor —
 * el navegador no lo envía. Por eso esta ruta no puede leerlo: sirve una página
 * mínima que lo saca del fragmento en el navegador, lo manda por POST a
 * `/cuenta/entrar` y luego lleva al taller.
 *
 * Es el patrón estándar de este flujo, y la única forma de evitarlo sería
 * guardar el secreto del cliente para intercambiar un código.
 */
router.get('/cuenta/retorno', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Entrando…</title>
<style>
  body{background:#0b1710;color:#e8cf7f;font-family:Georgia,serif;display:grid;
       place-items:center;height:100vh;margin:0;text-align:center}
  p{opacity:.8}
</style></head>
<body>
<h1>Entrando…</h1>
<p id="estado">Comprobando tu identidad.</p>
<script>
(async () => {
  const trozos = new URLSearchParams(location.hash.slice(1));
  const idToken = trozos.get('id_token');
  const estado = document.getElementById('estado');
  if (!idToken) { estado.textContent = 'Google no devolvió ninguna identidad.'; return; }
  try {
    const r = await fetch('/api/cuenta/entrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proveedor: 'google', idToken, desdeNavegador: true }),
    });
    const cuerpo = await r.json();
    if (!r.ok) { estado.textContent = cuerpo.error || 'No se pudo entrar.'; return; }
    // Si el viaje lo empezó la app, el servidor devuelve un código en vez de
    // poner cookie: se le entrega por su esquema propio y esta pestaña muere.
    if (cuerpo.codigo) {
      estado.textContent = 'Listo. Volviendo a la aplicación…';
      location.replace('harkania://retorno-google?canje=' + encodeURIComponent(cuerpo.codigo));
      return;
    }
    location.replace('/');
  } catch (e) {
    estado.textContent = 'No se pudo hablar con el servidor.';
  }
})();
</script>
</body></html>`);
});

/**
 * El origen público de este servidor.
 *
 * SALE DE LA CONFIGURACIÓN, NO DE LA CABECERA `Host`. Con él se fabrica la
 * `redirect_uri` que se le manda a Google, y Google exige que coincida carácter
 * por carácter con la registrada: si viniera del `Host` bastaría con que nginx
 * no la reenviara para que llegase `localhost:5174` y fallaran TODOS los inicios
 * de sesión del taller a la vez. Y quien falsificara la cabecera decidiría a
 * dónde vuelve la persona.
 *
 * Solo se cae a la petición fuera de producción, que es donde la dirección
 * cambia de verdad —el portátil haciendo de servidor en la wifi de casa— y
 * donde no hay nada que proteger.
 */
function origenDe(req: Request): string {
  if (env.publicOrigin) return env.publicOrigin;
  return `${req.protocol}://${req.get('host') ?? 'localhost'}`;
}

/**
 * Todo lo que necesita la portada de la app, en una sola petición.
 *
 * NUNCA acepta un correo por parámetro, y esto es deliberado: una ruta que
 * respondiera «¿tiene invitaciones fulano@ejemplo.com?» sería un oráculo para
 * averiguar quién juega en esta plataforma. Los correos salen de la sesión.
 */
/**
 * Quién es quien llama, o `null`. NUNCA corta.
 *
 * EXISTE PORQUE PREGUNTAR NO ES ENTRAR. Todas las demás rutas de cuenta
 * responden 401 cuando no hay pasaporte, y eso está bien para ellas — pero el
 * taller necesita algo distinto: saber si quien mira tiene cuenta para decidir
 * si le ofrece iniciar sesión o le saluda por su nombre. Con un 401, esa
 * pregunta se convierte en un error en la consola cada vez que la hace alguien
 * que todavía no tiene cuenta, que es el caso normal.
 *
 * Y HACE FALTA PORQUE HABÍA UN CALLEJÓN SIN SALIDA: quien entra al taller con
 * la contraseña de la casa nunca volvía a ver la puerta —`LoginGate` solo se
 * dibuja cuando NO estás dentro— así que no tenía forma de vincular su Google
 * después. Su progreso se quedaba atado a una contraseña compartida en vez de a
 * una persona.
 *
 * No dice nada que no sepa ya quien pregunta: o eres tú, o no hay nadie.
 */
router.get('/cuenta/yo', async (req, res) => {
  const pasaporte = sesionDeCuentaDePeticion(req);
  if (!pasaporte) {
    res.json({ cuenta: null });
    return;
  }
  const cuenta = await getStore().getAccount(pasaporte.cuentaId);
  if (!cuenta || !pasaporteVigente(pasaporte, cuenta)) {
    res.json({ cuenta: null });
    return;
  }
  res.json({
    cuenta: {
      id: cuenta.id,
      displayName: cuenta.displayName,
      email: cuenta.email,
      taller: admitidoEnElTaller(cuenta),
      via: (cuenta.identidades ?? []).map((i) => i.proveedor),
    },
  });
});

/**
 * El panel de partidas: todo lo jugado y todo lo que espera, con su estado.
 *
 * SEPARADO DE `/cuenta/portada` a propósito. La portada responde «¿a qué mesa
 * puedo sentarme AHORA?» y por eso descarta lo terminado; esto responde «¿qué
 * he jugado y cómo acabó?». Meterlas en la misma respuesta obligaría a la
 * portada a cargar el historial entero en cada arranque para enseñar dos
 * sobres.
 */
router.get('/cuenta/partidas', async (req, res) => {
  const cuenta = await cuentaDe(req, res);
  if (!cuenta) return;
  res.json({ partidas: await panelDe(cuenta) });
});

router.get('/cuenta/portada', async (req, res) => {
  const cuenta = await cuentaDe(req, res);
  if (!cuenta) return;

  res.json({
    cuenta: {
      id: cuenta.id,
      displayName: cuenta.displayName,
      // El correo de la propia cuenta, que es de quien pregunta.
      email: cuenta.email,
      trofeos: cuenta.trofeos,
      partidas: cuenta.partidas,
    },
    invitaciones: await invitacionesPara(cuenta),
  });
});

/**
 * Entrar en una partida desde una invitación.
 *
 * LA REGLA QUE NO SE ROMPE: el pasaporte de cuenta NO autoriza a jugar. Lo
 * único que hace esta ruta es COMPRAR una credencial de jugador por la vía
 * normal —`emitirCredencial(id, suspectId, sid)`, exactamente el mismo objeto
 * que reparte el canje de códigos—. Así, dentro de `/api/jugar/*` sigue
 * habiendo un solo tipo de autorización, y el `sid` sigue siendo lo que hace
 * que cerrar y reabrir la partida eche a todo el mundo. Si una sesión de cuenta
 * pudiera entrar por su cuenta, esa revocación se perdería y nadie se enteraría.
 *
 * Y ENTRAR SIN CÓDIGO EXIGE LAS TRES, no solo el correo verificado:
 *
 *   · Buzón demostrado por un proveedor, sin alias de reenvío.
 *   · Fase de sala de espera. La mesa se está formando y quien dirige tiene la
 *     pantalla delante viendo aparecer los nombres. Si la partida ya empezó, un
 *     intruso haría mucho más daño y hay mucha menos vigilancia.
 *   · Silla libre. Si ya hay un móvil emparejado, se pide el código: puede que
 *     el sitio sea de otra persona.
 *
 * El porqué de tanta condición: verificar el buzón demuestra que el correo es
 * tuyo, pero NO arregla que quien organiza se equivocara al teclearlo. Con una
 * errata, la persona dueña de esa dirección recibiría una invitación a la
 * velada de unos desconocidos — y al otro lado está su dosier, con quién es el
 * culpable. Por eso además la silla queda marcada (`reclamadaPor`).
 *
 * Cuando no se cumplen las tres, no se cierra la puerta: se responde
 * `requiereCodigo` y la app manda a teclear el código personal, que es el
 * camino de siempre y funciona igual.
 */
router.post('/cuenta/entrar-en-partida', async (req, res) => {
  const cuenta = await cuentaDe(req, res);
  if (!cuenta) return;

  const gameId = String(req.body?.gameId ?? '');
  const suspectId = String(req.body?.suspectId ?? '');

  // Se comprueba contra las invitaciones DERIVADAS, no contra lo que mande el
  // móvil: pedir una partida cualquiera no sirve de nada si no sale en tu lista.
  const invitaciones = await invitacionesPara(cuenta);
  const invitacion = invitaciones.find((i) => i.gameId === gameId && i.suspectId === suspectId);
  if (!invitacion) {
    // 404 y no 403: confirmar que la partida existe ya es contar algo.
    res.status(404).json({ error: 'No tienes ninguna invitación a esa partida.' });
    return;
  }

  if (!invitacion.directa) {
    res.json({ requiereCodigo: true, motivo: motivoDeCodigo(invitacion) });
    return;
  }

  const store = getStore();
  const sesion = await store.getLive(gameId);
  if (!sesion) {
    res.status(404).json({ error: 'Esta partida ya no está en juego.' });
    return;
  }

  await mutar(gameId, (s) => {
    const jugador = s.players.find((p) => p.suspectId === suspectId);
    if (!jugador) throw new Error('Ya no participas en esta partida.');
    jugador.joined = true;
    jugador.lastSeenAt = new Date().toISOString();
    jugador.reclamadaPor = {
      cuentaId: cuenta.id,
      correo: invitacion.paraEl,
      el: new Date().toISOString(),
    };
  });

  res.json({
    requiereCodigo: false,
    // El MISMO objeto que reparte el canje de códigos, con su `sid`.
    token: emitirCredencial(sesion.id, suspectId, sesion.sid),
    gameId: sesion.id,
    suspectId,
    displayName: invitacion.personaje,
  });
});

/** Por qué toca teclear el código, dicho de forma que se entienda. */
function motivoDeCodigo(invitacion: { fase: string; yaDentro: boolean }): string {
  if (invitacion.yaDentro) return 'Ya hay un móvil emparejado con esa silla.';
  if (invitacion.fase !== 'lobby') return 'La partida ya ha empezado.';
  return 'Todavía no hemos podido verificar tu correo.';
}

/**
 * Borrar la cuenta desde fuera de una partida.
 *
 * Existe porque la otra puerta —la del perfil— solo se alcanza estando DENTRO
 * de una velada, y eso convierte el derecho de supresión en un trámite que
 * depende de que alguien te invite. Las tiendas piden que se pueda borrar la
 * cuenta desde la app, sin condiciones.
 */
router.delete('/cuenta', async (req, res) => {
  const cuenta = await cuentaDe(req, res);
  if (!cuenta) return;
  // La cuenta entera, no su correo: `cuentaDe` ya la resolvió por la sesión y
  // volver a buscarla por texto era lo que permitía borrar la de otra persona.
  const resultado = await borrarCuenta(cuenta);
  res.json({ borrada: resultado.cuentaBorrada, partidasLimpiadas: resultado.partidasLimpiadas });
});

export default router;
