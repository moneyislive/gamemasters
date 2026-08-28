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
   * En cuál de los tres campos heredados se guardan estas entidades.
   *
   * POR QUÉ EXISTE ESTE CAMPO TAN FEO. Una partida guarda sus cosas en
   * `suspects`, `rooms` y `weapons`, con esos nombres, desde antes de que
   * existieran las categorías. Y no es solo inercia: media plataforma se cuelga
   * de ellos —el emparejamiento de los móviles y los dosieres van por
   * `suspects`, el plano y las chinchetas por `rooms`—, así que una categoría
   * cuyas entidades sean personas TIENE que acabar en `suspects` o nada de eso
   * funciona.
   *
   * Antes esto era una tabla escondida en `entidades.ts` que solo conocía las
   * tres categorías de CLUEDO. Al llegar el segundo juego se vio el problema:
   * sus categorías tienen otros nombres, así que caían fuera de la tabla, y una
   * de ellas —los ritos— no tiene sitio heredado ninguno.
   *
   * Ahora lo declara cada juego, que es quien lo sabe. Y lo que se gana no es
   * solo que funcione: se gana que el acoplamiento esté A LA VISTA, en el
   * manifiesto, en vez de escondido en una constante. El día que el almacén se
   * generalice del todo, lo que hay que borrar está enumerado aquí.
   *
   * Sin declarar, la categoría vive en `game.entidades[id]`, que es el destino.
   */
  almacen?: 'suspects' | 'rooms' | 'weapons';

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
  /**
   * Lo que se elige EN LISTA, no de uno en uno.
   *
   * `eligeDe` sabe pedir «una entidad de esta categoría» y nada más. Hay
   * acciones cuya respuesta es un CONJUNTO o una SECUENCIA —ordenar los cinco
   * ritos del sellado, repartir tres cartas, señalar a dos personas— y no cabían:
   * el motor descartaba cualquier campo no declarado, así que la lista no
   * llegaba al reductor y la acción no se podía hacer por HTTP.
   *
   * Cada elemento se comprueba igual que en `eligeDe`: tiene que ser una entidad
   * REAL de su categoría. Eso es lo que impide que un móvil manipulado mande el
   * id de una sala donde va un sospechoso, y no se afloja por admitir listas.
   *
   * `cuantas` exige un número exacto de elementos; `ordenada` dice que el orden
   * significa algo, que es lo que separa «elige tres» de «ponlos en orden».
   */
  eligeVarias?: Array<{
    campo: string;
    categoria: CategoriaId;
    rotulo: string;
    cuantas?: number;
    ordenada?: boolean;
  }>;

  /**
   * Lo que se elige solo A VECES.
   *
   * Existe por los dones de El Misterio de la Momia: `invocar` necesita un
   * objetivo cuando el don es curar a alguien y ninguno cuando es leer un
   * jeroglífico. Cuál de los dos es depende del don, que es SECRETO, así que el
   * motor no puede saber de antemano si el campo hace falta.
   *
   * Se comprueba igual de estricto que `eligeDe` cuando viene; lo que no hace es
   * exigirlo. Quien decide si era obligatorio es el reductor, que sí sabe el don.
   */
  eligeOpcional?: Array<{ campo: string; categoria: CategoriaId; rotulo: string }>;

  /**
   * Campos cuyo valor NO es una entidad del manifiesto.
   *
   * POR QUÉ HACÍA FALTA. Las otras tres formas de pedir datos comprueban que lo
   * que llega es una entidad real de su categoría, y esa comprobación es lo que
   * impide que un móvil manipulado mande el id de una sala donde va una
   * persona. Pero hay cosas que se eligen y no son entidades de nadie: CUÁL DE
   * TUS DONES usas, o CUÁL DE TUS FRAGMENTOS publicas. No están en ninguna
   * categoría porque dependen de tu estado secreto, que es justo lo que el
   * motor no puede mirar sin volver a saber a qué se juega.
   *
   * Sin esto, el motor descartaba esos campos por no estar declarados y el
   * reductor recibía siempre el valor por defecto. En El Misterio de la Momia
   * eso apagaba dos cosas: el saqueador no podía elegir falsificar —o sea, se
   * quedaba sin la única mecánica del traidor— y el Fotógrafo publicaba un
   * fragmento distinto del que había elegido. Sin error y sin aviso.
   *
   * EL TRATO ES EXPLÍCITO: el motor los pasa TAL CUAL y NO los valida. Hacerlo
   * es obligación del reductor, que sí conoce el estado secreto de quien juega.
   * Un reductor que se los crea sin mirar abre exactamente el agujero que las
   * otras tres formas cierran.
   */
  eligeLibre?: Array<{ campo: string; rotulo: string }>;

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

/**
 * Una regla de las que lee quien juega.
 *
 * Vive en el manifiesto y no en el servidor porque es CONTENIDO del juego, no
 * comportamiento de la plataforma, y porque la leen tres sitios que tienen que
 * decir exactamente lo mismo: la app, el dosier impreso y el asistente de la
 * partida. Cuando cada uno tenía su copia, bastaba con corregir una para que el
 * papel y la pantalla dijeran cosas distintas.
 */
export interface ReglaDeJuego {
  titulo: string;
  texto: string;
}

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

  /**
   * Quién es y cómo habla. Es lo primero que lee el modelo.
   *
   * POR QUÉ ES UN DATO Y NO CÓDIGO. El encargo del asistente estaba escrito a
   * mano en `live/consejero.ts` y empezaba «Eres el Mayordomo de una velada al
   * estilo CLUEDO»: en El Misterio de la Momia, el Escriba de una expedición
   * hablaba como un mayordomo inglés de un asesinato que no ha ocurrido. El
   * resto del encargo —lo que no puede hacer, la forma de contestar— sí es de
   * la plataforma y lo pone ella.
   */
  voz: string;
  /**
   * Con qué te recibe al abrir la pantalla, antes de que preguntes nada.
   *
   * Va aquí y no en la pantalla porque es lo primero que se lee de él y es
   * DONDE MÁS SE NOTA la voz: el Mayordomo trata de usted y el Escriba de tú.
   * Estaba escrito a mano en la app, así que el Escriba recibía a la mesa
   * hablando como un mayordomo inglés.
   */
  saludo: string;
  /**
   * Cómo se niega, en su propio idioma, cuando le piden que resuelva el caso.
   *
   * Va aparte de la voz porque el encargo lo cita como ejemplo dentro de la
   * regla que más importa —«no cedes»— y esa regla es de la plataforma.
   */
  seNiega: string;
  /**
   * Qué contesta cuando no hay clave de API.
   *
   * Sin esto, el asistente de cualquier juego explicaba «una única acusación:
   * quién, con qué y dónde», que son las reglas de CLUEDO. Y quien lo lee está
   * perdido, que es justo cuando peor sienta que te cuenten otro juego.
   */
  sinIa: {
    reglas: string;
    personaje: string;
    /** Cuando le piden que señale a alguien. */
    solucion: string;
    general: string;
  };
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

  /**
   * Cómo se llama el bloque del centro del plano.
   *
   * Parece un detalle y es el tipo de detalle que delata que un juego está
   * pintado encima de otro: el generador de plano plantaba «ESCALERAS» en el
   * centro de cualquier tablero, así que una tumba egipcia tenía las escaleras
   * de la mansión de CLUEDO en medio. Nadie habría dado un error; simplemente
   * habría quedado raro en la mesa.
   *
   * Sin declarar, «ESCALERAS»: es lo que hacía antes para todos y es lo que
   * deja el plano de CLUEDO idéntico.
   */
  rotuloCentralDelPlano?: string;

  /**
   * Las reglas que se le enseñan a quien juega.
   *
   * ANTES ERAN UNA CONSTANTE DEL SERVIDOR, y una constante escrita para CLUEDO:
   * «Alguien de esta casa es un asesino. Debes descubrir quién lo hizo, con qué
   * objeto y en qué sala». Esa lista viajaba tal cual a CUALQUIER juego —a la
   * app, al dosier impreso y al prompt del asistente de la partida—, así que una
   * expedición arqueológica habría leído las reglas de un asesinato en tres
   * sitios distintos y ninguno habría dado error.
   *
   * Es opcional para que un juego pueda no traerlas, pero la Momia y CLUEDO las
   * declaran las dos: un juego sin reglas propias heredando las de otro es
   * exactamente el fallo que esto viene a cerrar.
   */
  reglas?: ReglaDeJuego[];

  /** Qué fase puede seguir a cuál. Hoy ya es una tabla, solo que una sola. */
  fases: Record<LivePhase, LivePhase[]>;

  trofeos: TrofeoInfo[];
  seccionesDeDosier: DocumentSectionInfo[];
  documentos: PrintableDocInfo[];

  /**
   * ¿Este juego tiene «material de velada» que el taller pueda reescribir?
   *
   * El material son las narraciones de cada ronda, los giros, las revelaciones
   * de cronología y el desenlace: texto que se escribe ENCIMA de una trama ya
   * generada. CLUEDO lo tiene y lo ofrece con un botón; El Misterio de la Momia
   * lo lleva dentro de su propia trama y no tiene nada que reescribir aparte.
   *
   * SIN ESTO, ESE BOTÓN SE PINTABA SIEMPRE. Y pulsarlo en la Momia corría el
   * pipeline de CLUEDO —que pide culpable, arma y sala— sobre una trama que no
   * los tiene, sustituyendo las narraciones de vigilia por un asesinato que no
   * ha ocurrido. Sin aviso y sin deshacer.
   *
   * Este campo dice si el botón se pinta; quién escribe de verdad lo dice el
   * registro de `server/src/juegos/materiales.ts`. Son dos cosas distintas
   * —una la ve el taller, la otra la ejecuta el servidor— y `verify:puertas`
   * comprueba que no se separen.
   */
  /**
   * Cómo se prepara físicamente el paquete de esta partida.
   *
   * La hoja por la que se abre el ZIP dice qué hacer antes de que llegue la
   * gente. Estaba escrita en CLUEDO —«mete las pistas de cada sala y ronda en
   * su sobre rotulado», «cuelga los carteles de sala y la línea temporal»,
   * «reparte una hoja de investigación por persona»— y esos tres documentos no
   * existen en El Misterio de la Momia, mientras que recortar las tiras de
   * papiro y agruparlas por vigilia, que sí hay que hacerlo, no lo decía nadie.
   *
   * Va aquí y no en la plantilla porque depende de QUÉ HAY en el paquete, y eso
   * lo declara el juego. Si falta, se usa la de CLUEDO, que es lo que había.
   */
  preparacion?: { anfitrion: string[]; aCiegas: string[] };

  materialDeVelada?: boolean;

  /**
   * ¿Este juego trae sus propios dosieres en `documentos`?
   *
   * La plataforma sabe componer un dosier por persona, uno para quien dirige y
   * un sobre con la solución. Son de CLUEDO: hablan de la víctima, de los
   * sospechosos, de «los objetos del crimen — cualquiera de ellos pudo ser el
   * arma» y de pasadizos secretos.
   *
   * LO QUE PASABA. El paquete los metía SIEMPRE, incluso en un juego que trae
   * los suyos. En El Misterio de la Momia eso dejaba DOS dosieres por persona:
   * el bueno —con su don, su secreto y sus reliquias— en una carpeta, y el de
   * CLUEDO en `02_JUGADORES`, que es justo donde va a mirar quien prepare para
   * saber qué repartir. Y el genérico de quien dirige imprimía «La solución del
   * caso: — · — · —» y duplicaba la Guía de la expedición.
   *
   * Con esto en `true`, el paquete emite SOLO los documentos del manifiesto.
   * CLUEDO no lo declara y su ZIP no cambia ni un byte.
   */
  dosieresPropios?: boolean;
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

/**
 * Con qué acción se acusa en este juego.
 *
 * NO ES UN CAMPO NUEVO DEL MANIFIESTO, ES UNA PROPIEDAD QUE YA ERA CIERTA: los
 * campos que pide la acusación SON los ejes. CLUEDO declara `acusar` con
 * `culpable`, `objeto` y `lugar`, que son sus tres ejes; la Momia declara
 * `senalar` con `saqueador`, que es el suyo. Deducirlo en vez de declararlo
 * evita el fallo que trae siempre declarar dos veces la misma cosa: que una de
 * las dos se quede vieja.
 *
 * LO QUE ARREGLA. La ruta de acusar despachaba el id `'acusar'` escrito a mano.
 * En la Momia eso no existe, así que los dos botones de «Señalar al saqueador»
 * —la barra de la vigilia y el panel del Sellado— contestaban «eso no se puede
 * hacer en esta partida» a todo el mundo y toda la noche. Y arrastraba el
 * resto: sin acusaciones no hay `winnerId`, no hay trofeo de desenmascarar, y
 * la plataforma le regalaba «culpable impune» al saqueador siempre.
 *
 * Devuelve `undefined` si el juego no tiene ejes —no hay nada que acusar— o si
 * ninguna acción los cubre, que es un manifiesto mal escrito y lo caza
 * `verify:manifiestos`.
 */
/**
 * Con qué acción se entra en un sitio, y en qué campo va.
 *
 * OTRA PROPIEDAD QUE YA ERA CIERTA, como la de la acusación: en los dos juegos
 * existe una acción que pide UNA entidad y esa entidad es un lugar. CLUEDO la
 * llama `entrar-en-sala` con el campo `sala`; la Momia, `explorar` con el campo
 * `camara`.
 *
 * LO QUE ARREGLA. La ruta del plano despachaba `'entrar-en-sala'` escrito a
 * mano, así que en la Momia tocar una cámara en la pestaña «Tumba» contestaba
 * 409 — y la pantalla invitaba a hacerlo, «toca una estancia para entrar en
 * ella», y pintaba el error justo debajo. Se salía cambiando de pestaña, que
 * es la clase de cosa que nadie descubre solo.
 */
export function accionDeEntrarEnLugar(
  m: ManifiestoDeJuego,
): { accion: DefinicionAccion; campo: string } | undefined {
  const lugares = new Set(categoriasDeLugar(m).map((c) => c.id));
  if (lugares.size === 0) return undefined;
  for (const accion of m.acciones) {
    const campos = accion.eligeDe ?? [];
    if (campos.length !== 1) continue;
    const unico = campos[0]!;
    if (lugares.has(unico.categoria)) return { accion, campo: unico.campo };
  }
  return undefined;
}

export function accionDeAcusacion(m: ManifiestoDeJuego): DefinicionAccion | undefined {
  const lista = ejes(m);
  if (lista.length === 0) return undefined;
  return m.acciones.find((a) => {
    const campos = new Set((a.eligeDe ?? []).map((c) => c.campo));
    return lista.every((e) => campos.has(e.id));
  });
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
