/**
 * Quién sabe componer cada documento imprimible.
 *
 * ═══ QUÉ SUSTITUYE ═══
 *
 * Una tabla `Record<PrintableDocId, Plantilla>` exhaustiva, en `index.ts`, con
 * las veintinueve plantillas de los tres juegos escritas una detrás de otra. El
 * compilador exigía que estuvieran todas, así que `index.ts` —un fichero del
 * núcleo, que se compila para todos— importaba `momia/hojaSellado`,
 * `sombras/tablaRastro` y otras catorce que no son suyas.
 *
 * Las consecuencias eran dos, y las dos importan:
 *
 *   · UN JUEGO NUEVO CON IMPRIMIBLES OBLIGABA A TOCAR EL TRONCO. No una vez:
 *     una por documento. Una campaña de rol con treinta hojas —fichas, mapas,
 *     cartas de encuentro, tablas de botín— habría metido treinta renglones en
 *     un fichero común. Eso es el cuello de botella en su forma más literal.
 *
 *   · UN SERVIDOR SIN CLUEDO SE LLEVABA CLUEDO IGUAL. Con juegos instalados por
 *     país, el paquete de imprimibles de un servidor que solo tenga El Paso de
 *     las Sombras arrastraba las trece plantillas de un asesinato en una casa
 *     inglesa, porque estaban en la misma tabla.
 *
 * ═══ POR QUÉ ESTE REGISTRO Y NO OTRA COSA ═══
 *
 * Es el mismo patrón que ya usan los reductores, las proyecciones, los cierres,
 * los veredictos, los generadores y las voces: tabla anclada con `Symbol.for`,
 * alta al importar el módulo del juego, y el módulo se importa desde
 * `juegos/instalados.ts`. Hacer aquí algo distinto solo añadiría una forma más
 * de acordarse de las cosas.
 *
 * ═══ LO QUE SE PIERDE, DICHO CLARO ═══
 *
 * El compilador ya no avisa si un juego declara un documento en su manifiesto y
 * se olvida de registrar su plantilla. Antes eso era un error de compilación; a
 * partir de ahora el documento sale AUSENTE del paquete, en silencio, que es
 * peor. Por eso `npm run verify:juegos` recorre los juegos instalados y
 * comprueba que cada documento declarado tenga plantilla — y el maestro de oro
 * congela el paquete entero de los tres juegos, así que una plantilla que
 * desaparezca sale también por ahí.
 */
import type { JuegoId } from '../../../../shared/juegos';
import type { PrintableDocId } from '../../../../shared/documents';
import type { VistaGm } from '../contexto';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../shared/types';

export type Plantilla = (
  game: GameSession,
  plot: Plot,
  vista: VistaGm,
  opciones: DocumentRenderOptions,
) => string;

/**
 * Anclado al ámbito global, como los demás registros.
 *
 * No es manía: este fichero se puede cargar dos veces —una prueba lo importa
 * por una ruta y el servidor por otra, y el cargador las trata como módulos
 * distintos—, y entonces cada copia tendría su propia tabla y las altas se
 * perderían por el camino. Está documentado en `shared/juegos/index.ts`, donde
 * el fallo llegó a ocurrir de verdad.
 */
const LLAVE = Symbol.for('gamemasters.docs.imprimibles');
const global_ = globalThis as unknown as Record<
  symbol,
  Record<JuegoId, Record<PrintableDocId, Plantilla>>
>;
const REGISTRO: Record<JuegoId, Record<PrintableDocId, Plantilla>> =
  global_[LLAVE] ?? (global_[LLAVE] = {});

/**
 * Dónde se guardan los documentos que son DE LA CASA y no de ningún juego.
 *
 * ═══ ESTO LO ENSEÑÓ UN FALLO, NO UN DISEÑO PREVIO ═══
 *
 * Al partir la tabla en un registro por juego, `verify:juegos` se puso en rojo
 * con dos renglones: «momia/indice-paquete: se genera y no sale vacío» y lo
 * mismo para las Sombras. La causa es que «Empieza por aquí» —la hoja por la
 * que se abre el paquete— la declaran los TRES manifiestos, y su plantilla se
 * había ido con las de CLUEDO.
 *
 * Y no es una excepción molesta: es la parte del modelo que faltaba. Esa hoja
 * se compone ENTERA desde el catálogo del juego y desde `manifiesto.preparacion`,
 * así que no habla de sospechosos ni de salas ni de nada de CLUEDO — funciona
 * igual para una expedición, para un cruce de montaña y para una campaña de rol.
 * Es de la plataforma, exactamente igual que `TROFEOS_DE_LA_CASA` son las tres
 * medallas que puede ganar cualquiera juegue a lo que juegue.
 *
 * La regla, entonces: un documento es de la casa si se compone solo con lo que
 * el manifiesto declara. En cuanto lee un campo de un juego concreto, es de ese
 * juego y se registra con él.
 */
const LA_CASA = '·la-casa·';

/**
 * Da de alta las plantillas de un juego.
 *
 * Se llama una vez por juego, desde su módulo, con todas juntas. De una en una
 * también funcionaría y sería peor: la lista completa en un sitio es lo que
 * permite leerla al lado del manifiesto y ver de un vistazo si falta alguna.
 */
export function registrarImprimibles(
  juego: JuegoId,
  plantillas: Record<PrintableDocId, Plantilla>,
): void {
  REGISTRO[juego] = { ...(REGISTRO[juego] ?? {}), ...plantillas };
}

/** Da de alta un documento que sirve a cualquier juego que lo declare. */
export function registrarImprimiblesDeLaCasa(plantillas: Record<PrintableDocId, Plantilla>): void {
  registrarImprimibles(LA_CASA, plantillas);
}

/**
 * La plantilla de un documento de un juego, si la hay.
 *
 * Lo suyo manda sobre lo de la casa: un juego que quiera su propia versión de
 * un documento común la registra con su id y gana. No es hipotético — un juego
 * puede querer su propio «Empieza por aquí» con su imprenta.
 */
export function plantillaDe(juego: JuegoId, id: PrintableDocId): Plantilla | undefined {
  return REGISTRO[juego]?.[id] ?? REGISTRO[LA_CASA]?.[id];
}

/**
 * Los ids que un juego sabe componer. Lo usa `verify:juegos` para contrastar
 * esta lista contra la que el juego DECLARA en su manifiesto: lo que sobra aquí
 * es código muerto, y lo que falta es un documento que sale ausente del paquete.
 */
export function imprimiblesRegistrados(juego: JuegoId): PrintableDocId[] {
  return Object.keys(REGISTRO[juego] ?? {});
}
