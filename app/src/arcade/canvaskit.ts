/**
 * DÓNDE ESTÁ `canvaskit.wasm` CUANDO LA APP SE SIRVE BAJO `/jugar`.
 *
 * ═══ EL FALLO MUDO QUE ESTE FICHERO EVITA, Y YA ESTABA APUNTADO ═══
 *
 * En web, Skia no es Skia: es CanvasKit, un binario de WebAssembly que el
 * navegador tiene que descargar aparte. Quien lo pide es el cargador que Google
 * genera con Emscripten, y ese cargador, si nadie le dice otra cosa, monta la
 * dirección así:
 *
 *     new URL('canvaskit.wasm', document.baseURI ?? self.location.href)
 *
 * O sea, pide `/canvaskit.wasm` desde la raíz del dominio. Y esta app NO SE SIRVE
 * DESDE LA RAÍZ: `app.json` declara `experiments.baseUrl: "/jugar"`, porque en
 * Render un mismo servicio sirve la API, el taller y la app. El fichero está en
 * `/jugar/canvaskit.wasm`, así que la petición se va a `/jugar/index.html` por el
 * comodín del servidor, llega un HTML donde se esperaba un `.wasm`, y el
 * instanciador falla.
 *
 * El síntoma es UNA PANTALLA EN BLANCO SIN ERROR LEGIBLE. No hay excepción en la
 * consola que diga «falta el wasm»: hay un fallo de compilación de WebAssembly
 * con un texto sobre bytes mágicos que no se parece en nada a la causa.
 *
 * Es exactamente el mismo patrón que este repositorio ya se comió una vez con las
 * texturas empotradas de los modelos 3D —está contado en `src/tres/
 * texturas-nativas.ts`, y el comentario dice que se buscó en el disco del
 * servidor durante días— y por eso el §7 del diseño lo dejó apuntado ANTES de
 * instalar Skia y le puso un comprobador propio: `verify:canvaskit`.
 *
 * ═══ POR QUÉ ESTE FICHERO NO IMPORTA NADA, NI SIQUIERA REACT ═══
 *
 * Para que un comprobador pueda llamarlo. `verify:canvaskit` corre en Node, fuera
 * del empaquetador y sin React Native delante, y comprueba que la dirección que
 * sale de aquí EMPIEZA por la base que declara `app.json`. Una comprobación que
 * lee el fichero con una expresión regular diría que la línea está escrita; ésta
 * dice que la dirección es la correcta, que es otra cosa.
 *
 * ═══ Y POR QUÉ LA BASE ENTRA POR PARÁMETRO Y NO SE LEE AQUÍ ═══
 *
 * Porque en la app la base viaja en `process.env.EXPO_BASE_URL`, que Metro
 * SUSTITUYE POR UN LITERAL al empaquetar: fuera del empaquetador esa variable no
 * existe y aquí no habría nada que leer. Pasarla por parámetro deja la función
 * pura —la misma entrada da la misma salida— y por tanto comprobable.
 */

/** Cómo se llama el binario. Es el nombre con el que lo pide CanvasKit. */
export const FICHERO_DE_CANVASKIT = 'canvaskit.wasm';

/**
 * La dirección desde la que servir un fichero de CanvasKit.
 *
 * ═══ LOS TRES CASOS, Y NINGUNO SOBRA ═══
 *
 *   · Sin base —desarrollo, Expo Go, la app nativa— se devuelve `/fichero`, que
 *     es lo que ya hacía el cargador por su cuenta. No se cambia nada.
 *   · Con base `/jugar` sale `/jugar/canvaskit.wasm`.
 *   · Con base `/jugar/` —con barra al final, que es como la escribe media
 *     documentación— sale lo mismo. Sin este cuidado saldría `/jugar//canvaskit.wasm`,
 *     que la mayoría de los servidores normaliza y algunos no; y «la mayoría» no es
 *     una garantía cuando el fallo es una pantalla en blanco.
 *
 * No se usa `new URL(...)` a propósito: aquí no hay dominio, y construir una URL
 * absoluta obligaría a inventarse uno o a depender de `location`, que en el
 * comprobador no existe.
 */
export function rutaDeCanvasKit(base: string | undefined, fichero: string): string {
  const limpia = (base ?? '').replace(/\/+$/, '');
  if (limpia.length === 0) return `/${fichero}`;
  return `${limpia.startsWith('/') ? '' : '/'}${limpia}/${fichero}`;
}

/**
 * LA DIRECCIÓN DE VERDAD, QUE NO ES LA MISMA EN DESARROLLO Y EN PRODUCCIÓN.
 *
 * ═══ EL CAMINO DE DESARROLLO ESTABA CORTADO, Y EL COMPROBADOR NO LO VEÍA ═══
 *
 * La cuenta de arriba es correcta para producción y allí está verificada: `expo
 * export` deja `canvaskit.wasm` en la raíz de `dist`, `server/src/enlaces/
 * jugar-web.ts` monta ese `dist` bajo `/jugar`, y `/jugar/canvaskit.wasm` devuelve
 * el binario.
 *
 * En DESARROLLO no. Metro sustituye `EXPO_BASE_URL` por el literal `/jugar` igual
 * que en producción, pero sirve `app/public/` EN LA RAÍZ del servidor de
 * desarrollo, y todo lo demás se lo come el comodín. Comprobado por HTTP contra
 * `expo start --web` en esta misma máquina:
 *
 *     GET /jugar/canvaskit.wasm  → 200 text/html         (o sea, el index.html)
 *     GET /canvaskit.wasm        → 200 application/wasm   (8 076 553 bytes)
 *
 * O sea que el instanciador de WebAssembly recibía un HTML donde esperaba un
 * binario y abortaba con «expected magic word 00 61 73 6d, found 3c 21 44 4f» —los
 * bytes de `<!DO`—. Es LITERALMENTE el fallo mudo que el §7 del diseño dejó
 * apuntado, en el único camino por el que hoy se puede ver correr el lienzo: en
 * esta máquina no hay emulador ni dispositivo, así que la web es la única forma de
 * mirarlo, y estaba cortada.
 *
 * Y el `.catch` del cargador no rescataba nada, porque Emscripten aborta FUERA de
 * la promesa: lo que salía era un error sin relación aparente con la causa.
 *
 * ═══ POR QUÉ ESTO ES UNA FUNCIÓN Y NO UN `if` DENTRO DEL CARGADOR ═══
 *
 * Por lo mismo que la de arriba: para que `verify:canvaskit` pueda EJECUTARLA con
 * los dos valores del interruptor y mirar las dos direcciones. Un `if (__DEV__)`
 * escrito dentro de `skia.web.ts` solo se podría comprobar con una expresión
 * regular, y una expresión regular dice que alguien escribió algo, no que la
 * dirección salga bien — que es exactamente la distinción por la que aquel
 * comprobador existe, y exactamente el agujero por el que se coló esto.
 */
export function dondePideCanvasKit(
  base: string | undefined,
  enDesarrollo: boolean,
  fichero: string,
): string {
  return rutaDeCanvasKit(enDesarrollo ? undefined : base, fichero);
}
