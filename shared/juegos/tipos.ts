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

  /**
   * Cómo se presenta esta categoría en el taller.
   *
   * Todo esto es CONTENIDO, no comportamiento, y por eso vive aquí y no en el
   * componente: son las palabras con las que un juego le habla a quien lo
   * prepara. Un panel de «armas del crimen» y uno de «piezas de la colección»
   * son la misma pantalla con distinto texto, y hasta ahora eran dos ficheros
   * de doscientas líneas cada uno.
   */
  presentacion?: {
    /** «Armas del crimen» */
    titulo: string;
    /** El párrafo que explica para qué sirve la lista. */
    descripcion: string;
    /** Redondas para las caras, cuadradas para las cosas. */
    forma?: 'circle' | 'square';
    /** Qué se enseña cuando la lista está vacía. */
    vacio?: { glifo: string; titulo: string; texto: string };
    /** Nombres de un clic, para no empezar en blanco. */
    sugerencias?: string[];
    ejemploNombre?: string;
    ejemploDescripcion?: string;
    /** La coletilla bajo la descripción. */
    pista?: string;
  };
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

/**
 * Cómo se reparte el turno.
 *
 * CLUEDO es simultáneo: los doce eligen sala a la vez y la ronda se cierra
 * cuando quien dirige lo decide. Una oca o un parchís van por turnos: uno tira,
 * y hasta que no termina no le toca al siguiente. Son dos juegos distintos con
 * el mismo motor, y la diferencia cabe en este campo.
 */
export type ModoDeTurno = 'simultaneo' | 'por-turnos';

/**
 * Algo que un jugador puede hacer.
 *
 * Esta es la pieza que permite salir del misterio. Antes lo único que se podía
 * hacer en una ronda era elegir sala, y estaba escrito en el tipo. Aquí cada
 * juego declara su repertorio: entrar en una sala, tirar el dado, acusar,
 * repartir botín, atacar. El motor valida y ejecuta; qué significa cada una lo
 * pone el juego.
 */
export interface DefinicionAccion {
  id: string;
  /** Cómo se llama en la pantalla. «Entrar en una sala», «Tirar el dado». */
  rotulo: string;
  /** En qué fases se admite. Fuera de ellas, el motor la rechaza. */
  fases: LivePhase[];
  /**
   * Qué hay que elegir para ejecutarla.
   *
   * Vacío significa que no necesita datos —tirar un dado no requiere elegir
   * nada—. Con entradas, el móvil pinta un selector por cada una, sacando las
   * opciones de la categoría indicada. Así una acción nueva no obliga a
   * escribir una pantalla nueva.
   */
  eligeDe?: Array<{ campo: string; categoria: CategoriaId; rotulo: string }>;
  /** Cuántas veces se admite por turno o ronda. Sin límite si se omite. */
  vecesPorTurno?: number;
}

/**
 * Los iconos que trae la app.
 *
 * Es una unión cerrada a propósito, y no una cadena libre: si un juego pidiera
 * un icono que no existe, la pestaña saldría en blanco en el móvil y nadie se
 * enteraría hasta la noche de la partida. Así lo dice el compilador.
 */
export type IconoId =
  | 'reloj'
  | 'mascara'
  | 'plano'
  | 'tablon'
  | 'cuaderno'
  | 'copa'
  | 'mayordomo'
  | 'farol'
  /* Los de El Misterio de la Momia. */
  | 'papiro'
  | 'anj'
  | 'escarabajo';

/**
 * Las pantallas que trae la app.
 *
 * Aquí hay un acoplamiento honesto que conviene no disimular: la app es un
 * binario compilado, así que un juego NO puede inventarse una pantalla. Lo que
 * puede es elegir cuáles usa, en qué orden y cómo se llaman. Una pantalla nueva
 * exige publicar una versión nueva de la app.
 */
export type PantallaDeApp =
  | 'ronda'
  | 'personaje'
  | 'mapa'
  | 'tablon'
  | 'cuaderno'
  | 'perfil'
  /*
   * Las dos que trae El Misterio de la Momia.
   *
   * Y aqui se ve el acoplamiento honesto del que habla el comentario de arriba:
   * anadir un juego con mecanicas propias obliga a tocar ESTE fichero, que es
   * comun, y a publicar una version nueva de la app. No hay forma de evitarlo
   * mientras la app sea un binario compilado; lo que si se puede es que el
   * compilador lo cante, y lo canta: `PANTALLAS` en `app/app/(juego)/_layout.tsx`
   * es un Record sobre esta union y no compila hasta que se declaran.
   */
  | 'papiro'
  | 'sellado';

/** Una pestaña de la barra de abajo. */
export interface PestanaDeBarra {
  pantalla: PantallaDeApp;
  /** Cómo se llama en la barra. «Tú» en CLUEDO, «Mi héroe» en una campaña. */
  rotulo: string;
  icono: IconoId;
}

/**
 * El asistente con IA.
 *
 * Todos los juegos tienen uno —para eso está la plataforma— y por eso su botón
 * central no es opcional ni se puede quitar. Lo que cambia es a quién
 * representa: un mayordomo en una casa de los años treinta, un farolero en una
 * campaña de aventuras.
 */
export interface AsistenteDeJuego {
  /** «El Mayordomo». Se usa en el sello y en las burbujas de la conversación. */
  nombre: string;
  /** Cómo se le llama a lo que hace. «Tu asistente del juego con IA». */
  descripcion: string;
  icono: IconoId;
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

  /**
   * Los ejes que hay que acertar, si el juego consiste en adivinar algo.
   *
   * OPCIONAL, y esto importa: un parchís temático o una campaña de rol no
   * tienen «respuesta». Mientras esto fue obligatorio, la plataforma solo sabía
   * organizar juegos de deducción aunque nadie lo hubiera dicho en voz alta.
   * Sin ejes no hay acusación ni sobre que abrir, y el motor no los echa de
   * menos.
   */
  ejes?: DefinicionEje[];

  /** Simultáneo o por turnos. */
  turnos: ModoDeTurno;

  /** El repertorio de lo que se puede hacer. */
  acciones: DefinicionAccion[];

  /**
   * Las pestañas de la barra de abajo, en orden.
   *
   * La FORMA de la barra no cambia nunca —la muesca, el botón central, el filo
   * dorado— porque es la identidad del producto. Lo que cambia es qué hay en
   * ella: un misterio necesita tablón y cuaderno; una oca, ni lo uno ni lo otro.
   */
  barra: PestanaDeBarra[];

  /** Quién ayuda desde el botón central. */
  asistente: AsistenteDeJuego;

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

export function ejes(m: ManifiestoDeJuego): DefinicionEje[] {
  return m.ejes ?? [];
}

export function eje(m: ManifiestoDeJuego, id: EjeId): DefinicionEje | undefined {
  return ejes(m).find((e) => e.id === id);
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
  return cat ? ejes(m).find((e) => e.categoria === cat.id) : undefined;
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
  const lista = ejes(m);
  return lista.length > 0 && lista.every((e) => Boolean(respuestas[e.id]));
}

/** Cuántos ejes coinciden. Sustituye al recuento de tres booleanos. */
export function aciertos(
  m: ManifiestoDeJuego,
  respuestas: Record<EjeId, string>,
  solucion: Record<EjeId, string>,
): number {
  return ejes(m).filter((e) => respuestas[e.id] === solucion[e.id]).length;
}
