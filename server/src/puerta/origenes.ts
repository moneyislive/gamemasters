/**
 * DESDE QUÉ PÁGINAS SE DEJA LEER LA API: la lista blanca del CORS.
 *
 * ═══ LO QUE HABÍA: `app.use(cors())`, PELADO ═══
 *
 * O sea `Access-Control-Allow-Origin: *` en todas las respuestas, en producción, y un preflight
 * que devolvía como permitidas las cabeceras que se le pidieran —`x-asiento` incluida—. Cualquier
 * página del mundo podía llamar a la API de la Sala de Arcade desde el navegador de quien la
 * visitara y LEER lo que le contestaba. `docs/CAPA-ESPACIAL.md` §4 escribió la cadena entera:
 * sentarse sólo pide el código y devuelve una llave, mover sólo pide la llave, y por tanto
 * «entregarle el código de mesa a código de terceros dentro de nuestra página es entregarle la
 * partida. Dos peticiones». Y lo apuntó como deuda que hay que pagar ANTES de embeber nada de
 * nadie — Boots on Board embeberá.
 *
 * ═══ LO QUE HAY AHORA ═══
 *
 *  · EN PRODUCCIÓN, SÓLO LOS ORÍGENES PROPIOS: `harkania.onrender.com` y el que diga
 *    `PUBLIC_ORIGIN`, que es obligatorio allí. Más los que se añadan a mano en
 *    `ORIGENES_PERMITIDOS`, que es OPCIONAL: sin ella no cambia nada y el servidor arranca igual.
 *    (`harkania.com` iba fijo aquí y ya no: ver `ORIGENES_PROPIOS`.)
 *    Hoy no hace falta ninguno, porque el taller, la app web (`/jugar`) y la Sala (`/sala`) se
 *    sirven desde el MISMO origen que la API y ahí no hay CORS que valga.
 *  · FUERA DE PRODUCCIÓN, ADEMÁS, CUALQUIER `localhost`, `127.0.0.1` O `[::1]` EN CUALQUIER
 *    PUERTO. Es lo primero que notaría quien trabaja: los Vite del taller y de la Sala (5173, 5175,
 *    5176, 5177, 5232, 5241…) reenvían `/api` por su proxy y no lo necesitan, pero la app en su
 *    versión web de Expo (8081, 8082, 8091…) habla con el servidor DESDE OTRO PUERTO, y sin esto
 *    se queda sin poder leer ni una respuesta.
 *  · SIN CABECERA `Origin` —la app nativa, `curl`, los comprobadores de esta casa— todo sigue
 *    como estaba: la petición se sirve igual. Sólo deja de llevar un `Access-Control-Allow-Origin`
 *    que a quien no es un navegador no le sirve para nada.
 *  · Las CABECERAS que se pueden mandar desde otro origen son las que los clientes de esta casa
 *    mandan de verdad —buscadas en `app/`, `escritorio/` y `client/`—, y ni una más: ver
 *    `CABECERAS_PERMITIDAS`. Credenciales, no: aquí nadie se identifica con una cookie a través de
 *    orígenes, así que `Access-Control-Allow-Credentials` no sale nunca.
 *  · Y `Vary: Origin` en TODAS las respuestas, también en las que no llevan permiso: una caché que
 *    guardara la respuesta de un origen se la podría servir a otro.
 *
 * ═══ LO QUE ESTO NO ES, DICHO ANTES DE QUE ALGUIEN LO VENDA COMO UNA PUERTA ═══
 *
 * El CORS no le cierra el servidor a nadie. La petición de un origen ajeno SE ATIENDE igual; lo
 * que cambia es que el navegador no le deja a esa página LEER la respuesta, y que un preflight con
 * `x-asiento` desde allí no pasa. Contra `curl` no protege nada ni lo pretende: contra `curl` están
 * el limitador de intentos y la llave del asiento. Lo que cierra es exactamente la cadena del §4:
 * usar el navegador de otro —o un realm de terceros embebido en la página— para jugar la partida.
 */
import cors from 'cors';
import type { RequestHandler } from 'express';

/**
 * LOS ORÍGENES PÚBLICOS DE ESTA CASA, escritos aquí y no sólo en `PUBLIC_ORIGIN`.
 *
 * `harkania.onrender.com` es la producción viva. `PUBLIC_ORIGIN` dice cuál es EL origen del
 * despliegue, y se suma aparte: si mañana apunta a otro dominio, entra solo.
 *
 * ═══ `harkania.com` YA NO VA AQUÍ, Y NO ES UN OLVIDO ═══
 *
 * Iba, con el argumento de que es el dominio propio y el perfil de producción del APK lo lleva
 * grabado (`app/eas.json`). Pero el dominio está SUSPENDIDO por el registrador —sirve su página de
 * verificación del WHOIS, no esta aplicación—, y un origen escrito a fuego en la lista blanca es un
 * permiso que no caduca: si el dominio cambiara de manos, su nuevo dueño podría leer la API desde el
 * navegador de quien visitara su página, que es exactamente la cadena que esta lista existe para
 * cerrar. Y el APK no lo necesita: la app nativa no manda `Origin`, y el CORS no le toca.
 *
 * El día que vuelva, se pone donde se pone todo lo que no es fijo: en `ORIGENES_PERMITIDOS`, o en
 * `PUBLIC_ORIGIN` si pasa a ser EL origen del despliegue. Las dos se deciden en el panel, que es donde
 * se sabe si el dominio vuelve a ser nuestro, y no en el código.
 */
export const ORIGENES_PROPIOS: readonly string[] = ['https://harkania.onrender.com'];

/**
 * LAS CABECERAS QUE UN CLIENTE DE ESTA CASA MANDA DE VERDAD, y ninguna más.
 *
 *  · `Content-Type`: el JSON de todas las peticiones con cuerpo.
 *  · `x-asiento`: la llave del asiento en la Sala de Arcade (`app/src/arcade/mesa.ts`,
 *    `escritorio/src/mesa.ts`).
 *  · `X-GM-Cuenta`: el pasaporte de la cuenta (`app/src/api.ts`).
 *  · `Authorization`: el testigo del jugador de una velada, `Bearer …` (`app/src/api.ts`). No es
 *    «propia», pero la manda la app y el navegador la trata como cualquier otra que no sea simple:
 *    sin ella en la lista, la app web de desarrollo no podría ni jugar una velada.
 *
 * `Accept` no hace falta: es de las que el navegador deja pasar sin preguntar.
 */
export const CABECERAS_PERMITIDAS: readonly string[] = ['Content-Type', 'x-asiento', 'X-GM-Cuenta', 'Authorization'];

/** Los métodos que usan las rutas de este servidor. */
const METODOS: readonly string[] = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * El bucle local, en cualquier puerto y sin nada detrás. Anclado por los dos lados: sin el `$`,
 * `http://localhost.cualquiera.example` pasaría por casa.
 */
const DE_ESTA_MAQUINA = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/;

/**
 * LEE `ORIGENES_PERMITIDOS`: una lista separada por comas, OPCIONAL.
 *
 * Vacía o ausente es la lista vacía, y el servidor arranca como siempre: esta variable no la exige
 * nadie, y así tiene que seguir —empujar a `main` despliega solo, y una variable exigida que no
 * esté puesta tumba el despliegue—.
 *
 * Lo que SÍ para el arranque es una entrada que no se puede leer, por lo mismo que
 * `SALTOS_DE_CONFIANZA`: una lista blanca con una entrada rota es una lista blanca que no hace lo
 * que su dueño cree, y el síntoma —«la página de fuera no puede leer nada»— no apunta a la
 * variable. Y se niegan en redondo `*` y `null`: `*` es volver al CORS pelado por la puerta de
 * atrás, y `null` es el origen de cualquier página en un marco aislado, que es justo lo que no
 * hay que dejar leer.
 *
 * Y UN COMODÍN EN CUALQUIER PARTE —`https://*.ejemplo.com`— TAMBIÉN PARA EL ARRANQUE. Se aceptaba
 * en silencio: `new URL` lo lee sin error, porque el asterisco vale en un nombre para ese analizador,
 * y se guardaba como un origen literal que ningún navegador manda nunca. Quien lo ponía creía haber
 * abierto un dominio entero y no había abierto nada, sin una línea en ningún sitio. Aquí se compara
 * el origen entero, así que los orígenes se ponen enteros, uno a uno.
 *
 * Cada entrada se reduce a su origen —esquema, anfitrión y puerto—, como `PUBLIC_ORIGIN`: un
 * `https://a.example/` con barra no coincidiría nunca con la cabecera, que no la lleva.
 */
export function leerOrigenesPermitidos(crudo: string | undefined): string[] {
  const texto = crudo?.trim() ?? '';
  if (texto.length === 0) return [];
  const origenes: string[] = [];
  for (const trozo of texto.split(',')) {
    const entrada = trozo.trim();
    if (entrada.length === 0) continue;
    if (entrada === '*' || entrada.toLowerCase() === 'null') {
      throw new Error(
        `\`ORIGENES_PERMITIDOS\` trae «${entrada}», y esa entrada no se admite: «*» es dejar leer la API ` +
          'a cualquier página, que es lo que esta lista existe para cerrar, y «null» es el origen de ' +
          'cualquier página metida en un marco aislado. Pon los orígenes uno a uno, con su esquema.',
      );
    }
    if (entrada.includes('*')) {
      throw new Error(
        `\`ORIGENES_PERMITIDOS\` trae «${entrada}», con un comodín, y los comodines no se admiten: aquí se ` +
          'compara el origen entero, así que se tomaría como un nombre literal que ningún navegador manda, ' +
          'y no dejaría pasar a nadie. Pon cada origen entero, uno a uno y con su esquema.',
      );
    }
    let url: URL;
    try {
      url = new URL(entrada);
    } catch {
      throw new Error(
        `\`ORIGENES_PERMITIDOS\` trae «${entrada}», que no se puede leer como un origen. Casi siempre es ` +
          'que le falta el esquema: hace falta «https://ejemplo.com», no «ejemplo.com».',
      );
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error(
        `\`ORIGENES_PERMITIDOS\` trae «${entrada}», y un navegador sólo manda orígenes http o https.`,
      );
    }
    origenes.push(`${url.protocol}//${url.host}`);
  }
  return origenes;
}

/** Lo que decide a quién se deja leer. Ver `corsDeLaCasa`. */
export interface ContextoDelCors {
  /** `NODE_ENV === 'production'`: fuera de él, además, el bucle local en cualquier puerto. */
  produccion: boolean;
  /** `PUBLIC_ORIGIN`, ya normalizado por `config.ts`. */
  publico?: string;
  /** `ORIGENES_PERMITIDOS`, ya leída. */
  extra: readonly string[];
}

/**
 * ¿SE LE DEJA LEER A ESTE ORIGEN? Comparación EXACTA, y con los tres anclajes de arriba.
 *
 * Exacta de verdad: ni mayúsculas —el navegador manda el anfitrión en minúsculas, y quien mande
 * otra cosa no es un navegador—, ni `http` donde se dijo `https`, ni un origen propio con algo
 * pegado detrás.
 */
export function origenPermitido(origen: string, contexto: ContextoDelCors): boolean {
  if (ORIGENES_PROPIOS.includes(origen)) return true;
  if (contexto.publico !== undefined && origen === contexto.publico) return true;
  if (contexto.extra.includes(origen)) return true;
  return !contexto.produccion && DE_ESTA_MAQUINA.test(origen);
}

/**
 * EL MIDDLEWARE, con la lista de arriba. Va donde iba `cors()` en `index.ts`: delante de todo.
 *
 * Usa el paquete `cors` de siempre y sólo le cambia las opciones: devolver `false` para un origen
 * es no poner NINGUNA cabecera de CORS y dejar que la petición siga, que es exactamente lo que se
 * quiere —se sirve, y el navegador no le deja leerla a quien no toca—. Lo único que el paquete no
 * hace en ese caso es `Vary: Origin`, y por eso va antes, a mano, en todas.
 */
export function corsDeLaCasa(contexto: ContextoDelCors): RequestHandler {
  const conLaLista = cors({
    origin: (origen, responder) => {
      responder(null, origen !== undefined && origenPermitido(origen, contexto));
    },
    credentials: false,
    allowedHeaders: [...CABECERAS_PERMITIDAS],
    methods: [...METODOS],
    maxAge: 600,
  });
  return (req, res, next) => {
    res.vary('Origin');
    conLaLista(req, res, next);
  };
}
