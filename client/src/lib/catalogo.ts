/**
 * Buscar y ordenar en la estantería.
 *
 * ═══ ORDENA, NO ESCONDE ═══
 *
 * Es la decisión que gobierna todo este fichero y va contra lo que hace por
 * defecto cualquier buscador. Quien dice «tengo una hora» no está pidiendo que
 * desaparezcan los juegos de tres: está pidiendo que le enseñen primero los que
 * le caben. Esconder el resto convierte una preferencia en una prohibición, y
 * en una estantería de seis cajas —que es lo que hay— dejaría la portada casi
 * vacía a la primera que alguien tocara un filtro.
 *
 * Así que esto no devuelve una lista filtrada: devuelve DOS MONTONES. Delante,
 * lo que cumple todo lo que se ha pedido. Detrás, todo lo demás, ordenado por
 * cuántas cosas cumple. Nunca se pierde una caja de vista.
 *
 * ═══ LO QUE NO SE HA DICHO NO CUMPLE, PERO TAMPOCO DESAPARECE ═══
 *
 * Un juego sin `duracionMinutos` no cumple «hasta una hora», porque afirmar que
 * cabe sería inventárselo. Pero como no se esconde nada, el precio de no haberlo
 * declarado es aparecer más abajo, no dejar de existir. Es la razón de que la
 * ficha del manifiesto sea opcional campo a campo y de que esto no distinga
 * «no cumple» de «no lo sé»: en un modelo que ordena, las dos cosas quieren lo
 * mismo.
 *
 * ═══ PURO Y SIN REACT, A PROPÓSITO ═══
 *
 * Aquí no hay estado ni componentes: entran juegos y criterios, salen dos
 * listas. Es lo que hace que el orden se pueda razonar —y comprobar— sin montar
 * una pantalla.
 */
import type { ModoDePartida, NivelDeDificultad } from '../../../shared/juegos';

/**
 * La ficha tal y como la necesita la portada.
 *
 * Es la del manifiesto MÁS el mínimo de personas, que en el manifiesto no vive
 * en la ficha sino en la categoría de personas —donde manda de verdad—. Esto es
 * el sitio donde las dos mitades se juntan para pintar «3 – 20 jugadores».
 */
export interface FichaDeCatalogo {
  duracionMinutos?: number;
  edadMinima?: number;
  dificultad?: NivelDeDificultad;
  jugadoresMinimo?: number;
  jugadoresMaximo?: number;
  modo?: ModoDePartida;
  temas?: string[];
}

/** Lo mínimo que esta hoja necesita saber de un juego para colocarlo. */
export interface Catalogable {
  id: string;
  titulo: string;
  lema: string;
  ficha: FichaDeCatalogo;
}

/**
 * Lo que ha pedido quien mira.
 *
 * Todo opcional menos el texto, que vacío significa «no busco nada». Un criterio
 * sin poner no cuenta para nada: ni ordena ni descarta.
 */
export interface Criterios {
  texto: string;
  /** Horas de las que se dispone. Encaja el juego que dure eso o menos. */
  horas?: number;
  /** La edad del más joven de la mesa. Encaja el juego que se pueda jugar a esa edad. */
  edad?: number;
  /** El nivel que se busca, exacto: quien quiere una de iniciación no quiere una experta. */
  dificultad?: NivelDeDificultad;
  /** Cuántos van a ser. Encaja el juego en el que quepan. */
  jugadores?: number;
  modo?: ModoDePartida;
}

export const SIN_CRITERIOS: Criterios = { texto: '' };

/** Cuántas cosas ha pedido. Cero significa que la estantería se pinta tal cual. */
export function cuantosCriterios(c: Criterios): number {
  return (
    (c.texto.trim() ? 1 : 0) +
    (c.horas !== undefined ? 1 : 0) +
    (c.edad !== undefined ? 1 : 0) +
    (c.dificultad !== undefined ? 1 : 0) +
    (c.jugadores !== undefined ? 1 : 0) +
    (c.modo !== undefined ? 1 : 0)
  );
}

/**
 * Sin tildes y en minúsculas.
 *
 * Para que «japon» encuentre «Japón» y «cluedo» encuentre «CLUEDO». Quien busca
 * en una barra no pone tildes, y hacérselas poner es la forma más tonta de que
 * un buscador no encuentre lo que tiene delante.
 */
function llano(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * ¿Cubre este juego el modo que se pide?
 *
 * No es una igualdad, y ahí está el detalle: un juego que se puede jugar EN VIVO
 * Y ONLINE le sirve tanto a quien busca en vivo como a quien busca online. Lo
 * que no sirve es al revés — uno solo presencial no cubre a quien no se puede
 * mover—. Con una igualdad a secas, el juego más flexible de la estantería sería
 * el que menos apareciera, que es exactamente lo contrario de lo que se quiere.
 */
function cubreElModo(delJuego: ModoDePartida | undefined, pedido: ModoDePartida): boolean {
  if (delJuego === undefined) return false;
  if (delJuego === 'en-vivo-y-online') return true;
  return delJuego === pedido;
}

/** ¿El texto buscado aparece en algo de este juego? */
function encuentraElTexto(juego: Catalogable, texto: string): boolean {
  const aguja = llano(texto.trim());
  if (!aguja) return true;
  const pajar = llano(
    [juego.titulo, juego.lema, juego.id, ...(juego.ficha.temas ?? [])].join(' · '),
  );
  /*
   * Palabra a palabra y todas tienen que estar. «tumba egipto» encuentra la
   * Momia; «tumba japon» no encuentra nada, que es lo correcto — quien escribe
   * dos palabras las está sumando, no eligiendo entre ellas.
   */
  return aguja.split(/\s+/).every((palabra) => pajar.includes(palabra));
}

/**
 * De todo lo que ha pedido, cuánto cumple este juego.
 *
 * El número no se enseña en ninguna parte: es solo con lo que se ordena el
 * segundo montón, para que quien cumple cuatro de cinco salga antes que quien
 * cumple una.
 */
function cuantoCumple(juego: Catalogable, c: Criterios): number {
  const f = juego.ficha;
  let cumple = 0;
  /*
   * `c.texto.trim() !== ''` DELANTE, y no basta con que `encuentraElTexto`
   * conteste que sí a una búsqueda vacía.
   *
   * Sin esta guarda, un texto vacío sumaba un punto que `cuantosCriterios` no
   * había pedido, así que la nota podía SUPERAR al número de criterios. Y como
   * el reparto era «los que igualan» contra «los que no llegan», un juego con
   * la nota pasada no entraba en ninguno de los dos: desaparecía de la portada.
   * Se veía con un solo filtro puesto —«seremos 15»— y la caja que de verdad
   * admite quince era justo la que no se pintaba.
   */
  if (c.texto.trim() !== '' && encuentraElTexto(juego, c.texto)) cumple += 1;
  if (c.horas !== undefined && f.duracionMinutos !== undefined && f.duracionMinutos <= c.horas * 60)
    cumple += 1;
  if (c.edad !== undefined && f.edadMinima !== undefined && f.edadMinima <= c.edad) cumple += 1;
  if (c.dificultad !== undefined && f.dificultad === c.dificultad) cumple += 1;
  if (
    c.jugadores !== undefined &&
    (f.jugadoresMinimo === undefined || c.jugadores >= f.jugadoresMinimo) &&
    (f.jugadoresMaximo === undefined || c.jugadores <= f.jugadoresMaximo) &&
    (f.jugadoresMinimo !== undefined || f.jugadoresMaximo !== undefined)
  )
    cumple += 1;
  if (c.modo !== undefined && cubreElModo(f.modo, c.modo)) cumple += 1;
  return cumple;
}

/**
 * La estantería en dos montones: lo que encaja y lo demás.
 *
 * ORDEN ESTABLE dentro de cada montón. Es lo que hace que tocar un filtro no
 * baraje la portada entera: los juegos que empatan siguen en el orden en el que
 * los puso quien escribió el catálogo, y lo único que se mueve es lo que de
 * verdad cambia de montón. Un orden inestable aquí se ve como un parpadeo.
 */
export function repartir<T extends Catalogable>(
  juegos: readonly T[],
  c: Criterios,
): { encajan: T[]; resto: T[] } {
  const pedidos = cuantosCriterios(c);
  if (pedidos === 0) return { encajan: [...juegos], resto: [] };

  /*
   * SE PARTE EN DOS, no se filtra dos veces.
   *
   * Con dos `filter` —uno de «iguala» y otro de «no llega»— los dos montones
   * juntos NO tienen por qué sumar la estantería entera: basta una nota que se
   * pase para que un juego no caiga en ninguno y deje de existir en la página.
   * Eso pasó de verdad. Con un solo recorrido que empuja a un lado o al otro,
   * el caso no se puede dar: cada caja va exactamente a un montón, diga la nota
   * lo que diga.
   */
  const encajan: T[] = [];
  const flojos: Array<{ juego: T; orden: number; nota: number }> = [];
  juegos.forEach((juego, orden) => {
    const nota = cuantoCumple(juego, c);
    if (nota >= pedidos) encajan.push(juego);
    else flojos.push({ juego, orden, nota });
  });

  flojos.sort((a, b) => b.nota - a.nota || a.orden - b.orden);
  return { encajan, resto: flojos.map((x) => x.juego) };
}

/**
 * «3 – 20 jugadores · En vivo», dicho a partir de la ficha y no a mano.
 *
 * ESTA FUNCIÓN ES EL MOTIVO DE QUE LA FICHA SEA DATO. La línea de cada tarjeta
 * era una cadena escrita a mano en la portada —«3 – 8 jugadores · En vivo»— y
 * eso la ponía en condiciones de contradecir al filtro: se podía buscar una mesa
 * de doce, ver que CLUEDO encaja, y leer en su propia tarjeta que admite ocho.
 * Ahora las dos cosas salen del mismo sitio y no pueden discrepar.
 *
 * Lo que no se sepa, no se dice. Una tarjeta que no declara aforo enseña solo el
 * modo, y si tampoco lo declara no enseña la línea.
 */
export function lineaDeJugadores(f: FichaDeCatalogo, nombreDelModo: string | undefined): string {
  const min = f.jugadoresMinimo;
  const max = f.jugadoresMaximo;
  const aforo =
    min !== undefined && max !== undefined
      ? `${min} – ${max} jugadores`
      : min !== undefined
        ? `Desde ${min} jugadores`
        : max !== undefined
          ? `Hasta ${max} jugadores`
          : undefined;
  return [aforo, nombreDelModo].filter(Boolean).join(' · ');
}

/**
 * «3 h», «1 h 30 min», «45 min».
 *
 * En horas y no en minutos porque es como se pregunta: nadie tiene «ciento
 * ochenta minutos», tiene «una tarde».
 */
export function duracionEnPalabras(minutos: number | undefined): string | undefined {
  if (minutos === undefined) return undefined;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
