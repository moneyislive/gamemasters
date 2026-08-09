/**
 * Qué es un juego, dicho como datos.
 *
 * CATA. Esto es un experimento para averiguar si la plataforma aguanta un
 * segundo juego sin rehacerla. No está enchufado a nada todavía.
 *
 * La idea: hoy la plataforma sabe que un misterio tiene sospechosos, armas y
 * salas, y que la respuesta son tres cosas, porque está escrito así en los
 * tipos. Aquí se intenta que eso deje de ser una verdad del código y pase a ser
 * una declaración de CADA juego.
 *
 * DÓNDE ESTÁ LA FRONTERA. Este fichero solo describe lo que los TRES paquetes
 * —taller, servidor y app— tienen que saber a la vez. Lo que solo necesita el
 * servidor (el esquema con el que se le pide la trama al modelo, las plantillas
 * de los imprimibles, el generador de plano) vive en `server/src/juegos/`, y no
 * es una concesión: es que el móvil no tiene por qué compilar el esquema JSON
 * con el que se genera una trama.
 *
 * Y LO QUE NO ES DATO. Las plantillas de documentos son funciones que producen
 * HTML y el generador de tablero es geometría. Nada de eso cabe en una tabla
 * sin acabar escribiendo un intérprete de un lenguaje peor que este. La regla
 * que separa las dos mitades: si un humano lo diría como una tabla, es dato; si
 * lo diría como «y entonces…», es código.
 */
import type { LivePhase, TrofeoInfo } from '../live';
import type { DocumentSectionInfo } from '../types';
import type { PrintableDocInfo } from '../documents';

/**
 * Identificador de un juego instalado.
 *
 * Es `string` y no una unión cerrada a propósito, y ese propósito tiene un
 * precio que conviene tener presente: se pierde la exhaustividad en tiempo de
 * compilación. Hoy, si alguien añade una fase, TypeScript señala todos los
 * `switch` que se quedan cortos. Con identificadores abiertos eso deja de
 * pasar y las comprobaciones se mudan a tiempo de ejecución.
 */
export type JuegoId = string;

/** Una familia de entidades. En CLUEDO: sospechosos, salas y objetos. */
export type CategoriaId = string;

/** Un eje de la respuesta. En CLUEDO: quién, con qué y dónde. */
export type EjeId = string;

/**
 * Una familia de cosas que el Game Master da de alta al preparar la partida.
 *
 * Sustituye a los tres campos fijos `suspects`, `rooms` y `weapons`. Las tres
 * son estructuralmente la misma cosa —identificador, nombre, descripción y
 * foto—; lo que las distingue son las tres banderas de abajo, y ninguna de las
 * tres es «ser un arma».
 */
export interface DefinicionCategoria {
  id: CategoriaId;
  singular: string;
  plural: string;
  /** Por debajo de esto la partida no se puede generar. */
  minimo: number;
  /**
   * Estas entidades SON las personas sentadas a la mesa.
   *
   * Como máximo una categoría puede serlo, y es la que ata el juego al mundo
   * real: de ella salen los correos, los dosieres y el emparejamiento de los
   * móviles.
   */
  sonJugadores?: boolean;
  /**
   * Estas entidades ocupan un sitio del espacio físico.
   *
   * Es lo que habilita el plano: fotos aéreas, chinchetas y el tablero. Un
   * juego sin lugares simplemente no tiene pestaña de mapa.
   */
  sonLugares?: boolean;
  admiteFoto?: boolean;
  admiteEmail?: boolean;
}

/**
 * Uno de los ejes que hay que acertar para ganar.
 *
 * Que sean una LISTA y no tres campos con nombre es el corazón de la cata. En
 * CLUEDO son tres; un misterio sin arma tendría dos y uno con cómplice, cuatro.
 */
export interface DefinicionEje {
  id: EjeId;
  /** Cómo se le pregunta al jugador. «¿Quién lo hizo?» */
  pregunta: string;
  /** Rótulo corto, para la hoja de acusación. «Quién» */
  rotulo: string;
  /** De qué categoría sale la respuesta. */
  categoria: CategoriaId;
}

/** Qué puede hacer un jugador cuando la ronda está abierta. */
export interface DefinicionDeRonda {
  /**
   * Sobre qué categoría se actúa. En CLUEDO se entra en una sala.
   *
   * Que esto sea una sola categoría y una sola acción es la limitación más
   * seria que arrastra el diseño actual: `EleccionDeSala` guarda un `roomId` y
   * nada más. Un juego con varias acciones distintas por ronda no cabe aquí y
   * necesitaría que esto fuese una lista de acciones con su propia forma.
   */
  accionSobre: CategoriaId;
  /** Cuántas veces se puede rectificar dentro de la misma ronda. */
  cambiosPermitidos: number;
}

/**
 * Un juego, en lo que los tres paquetes tienen que coincidir.
 *
 * Todo lo de aquí es serializable a JSON por construcción. No porque haga
 * falta hoy —hoy es un fichero de TypeScript que compila con todo lo demás—
 * sino porque el día que se quiera editar un juego sin desplegar, mudarlo a la
 * base de datos sea mover datos y no rediseñar.
 */
export interface ManifiestoDeJuego {
  id: JuegoId;
  nombre: string;
  lema: string;

  /** Las familias de entidades que se dan de alta al preparar la partida. */
  categorias: DefinicionCategoria[];
  /** Los ejes que hay que acertar. En orden de presentación. */
  ejes: DefinicionEje[];
  ronda: DefinicionDeRonda;

  /** Qué fase puede seguir a cuál. Hoy ya es una tabla, solo que una sola. */
  fases: Record<LivePhase, LivePhase[]>;

  trofeos: TrofeoInfo[];
  seccionesDeDosier: DocumentSectionInfo[];
  documentos: PrintableDocInfo[];
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export function categoria(m: ManifiestoDeJuego, id: CategoriaId): DefinicionCategoria | undefined {
  return m.categorias.find((c) => c.id === id);
}

/** La categoría cuyas entidades son las personas que juegan. */
export function categoriaDeJugadores(m: ManifiestoDeJuego): DefinicionCategoria | undefined {
  return m.categorias.find((c) => c.sonJugadores);
}

/** Las categorías que ocupan un sitio del espacio real. */
export function categoriasDeLugar(m: ManifiestoDeJuego): DefinicionCategoria[] {
  return m.categorias.filter((c) => c.sonLugares);
}

export function eje(m: ManifiestoDeJuego, id: EjeId): DefinicionEje | undefined {
  return m.ejes.find((e) => e.id === id);
}

/**
 * El eje cuya respuesta es una persona de la mesa.
 *
 * En CLUEDO, «quién lo hizo». Se deduce de que su categoría sea la de los
 * jugadores, así que ningún juego tiene que declararlo dos veces. Puede no
 * existir: un juego donde haya que adivinar una combinación de objetos y
 * lugares no señala a nadie.
 */
export function ejeDeJugadores(m: ManifiestoDeJuego): DefinicionEje | undefined {
  const cat = categoriaDeJugadores(m);
  return cat ? m.ejes.find((e) => e.categoria === cat.id) : undefined;
}

/** ¿Es esta persona la respuesta del eje que señala a alguien de la mesa? */
export function esElSenalado(
  m: ManifiestoDeJuego,
  solucion: Record<EjeId, string>,
  suspectId: string,
): boolean {
  const e = ejeDeJugadores(m);
  return Boolean(e && solucion[e.id] === suspectId);
}

/**
 * ¿Está completa una respuesta?
 *
 * Reemplaza a comprobar tres campos a mano. Con los ejes en una lista, «acertar
 * del todo» y «acertar a medias» dejan de depender de cuántos ejes haya.
 */
export function respuestaCompleta(
  m: ManifiestoDeJuego,
  respuestas: Record<EjeId, string>,
): boolean {
  return m.ejes.every((e) => Boolean(respuestas[e.id]));
}

/** Cuántos ejes coinciden. Sustituye al recuento de tres booleanos. */
export function aciertos(
  m: ManifiestoDeJuego,
  respuestas: Record<EjeId, string>,
  solucion: Record<EjeId, string>,
): number {
  return m.ejes.filter((e) => respuestas[e.id] === solucion[e.id]).length;
}
