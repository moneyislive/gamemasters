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
import type { LivePhase, PapelDeFase, TrofeoInfo } from '../live';
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
   * Y si hacen falta EXACTAMENTE tantas, ni una mas.
   *
   * ═══ LA REGLA VIVIA EN TRES SITIOS, NINGUNO DE ELLOS EL JUEGO ═══
   *
   * Los ritos del sellado de El Misterio de la Momia son cinco. Ni cuatro —con
   * 24 ordenes posibles la mesa lo resuelve por fuerza bruta en diez minutos—
   * ni seis. Es una regla del juego, y estaba escrita como `if (cat.id ===
   * 'ritos')` en el generador de herramientas del asistente y como una tabla de
   * excepciones —`'momia:ritos': RITOS_DEL_SELLADO`— en el taller.
   *
   * O sea: para saber cuantos ritos hacen falta habia que mirar en dos ficheros
   * que no son de la Momia, y un juego nuevo con una categoria de numero fijo
   * tenia que aprender a editarlos. Ahora lo dice quien lo sabe.
   */
  exacto?: number;
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
 * juego declara su repertorio: entrar en una sala, tirar el dado, responder,
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

  /**
   * Una CANTIDAD. Un número, no una entidad ni una cadena.
   *
   * ═══ POR QUÉ FALTABA Y QUÉ IMPEDÍA ═══
   *
   * Las cuatro formas de arriba saben pedir entidades y cadenas, y con eso se
   * escriben todas las acciones de un misterio: entrar en una sala, señalar a
   * alguien, ordenar cinco ritos, elegir un don. Pero en cuanto un juego tiene
   * NÚMEROS —una puja, una apuesta, un daño, cuántos dados tiras, cuánto pagas—
   * no había forma de preguntarlos: el motor construye los datos SOLO con lo
   * declarado y descarta en silencio cualquier campo que no lo esté, así que la
   * cantidad no llegaba al reductor y no daba ningún error.
   *
   * La consecuencia no era «queda feo»: era que un juego con dinero no se podía
   * jugar por la pantalla genérica. Tenía que escribir pantalla propia en la app
   * —o sea, publicar una versión nueva del binario— solo para poder teclear un
   * número. Lo destapó `verify:ajeno`, donde una subasta tenía que calcularse la
   * puja dentro del reductor porque no había forma de preguntarla.
   *
   * ═══ EL TRATO ═══
   *
   * El motor SÍ lo valida, al revés que `eligeLibre`: comprueba que es un número
   * de verdad y que cabe entre `minimo` y `maximo` si se declaran. Puede hacerlo
   * porque un número no depende de ningún estado secreto —es aritmética, no
   * reglas— y es justo la clase de cosa que un móvil manipulado mandaría
   * negativa o enorme.
   *
   * Llega al reductor en `numeros`, en un campo aparte de `datos` por lo mismo
   * que `listas`: si se mezclaran, todos los reductores que ya existen tendrían
   * que mirar de qué tipo es cada campo antes de usarlo.
   */
  pideNumero?: Array<{
    campo: string;
    rotulo: string;
    /** Si falta, no hay suelo. Una puja no puede ser negativa; un ajuste sí. */
    minimo?: number;
    /** Si falta, no hay techo. */
    maximo?: number;
    /** Lo que trae puesto el campo al abrirse. */
    porDefecto?: number;
    /** ¿Tiene que ser entero? Las monedas sí; una nota de cata, no. */
    entero?: boolean;
  }>;

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
  | 'cartel'
  | 'cuaderno'
  | 'copa'
  | 'mayordomo'
  | 'farol'
  /*
   * El monóculo, que releva al farol en la pestaña de Pistas de CLUEDO. El farol
   * se queda: lo usan de asistente El Farolero y La Abuela, y de porte nocturno
   * las Sombras. Lo que se cambia es a quién representa, no lo que existe.
   */
  | 'monoculo'
  /* Los de El Misterio de la Momia. */
  | 'papiro'
  | 'anj'
  | 'escarabajo'
  /*
   * Los de El Paso de las Sombras. Solo DOS, y merece la pena decir por qué tan
   * pocos: su asistente reutiliza `farol` —que existía sin dueño desde la Momia
   * y resulta ser justo lo que lleva quien guía de noche— y sus otras cuatro
   * pestañas usan `reloj`, `mascara`, `plano` y `copa`. Un juego nuevo no tiene
   * por qué traer seis iconos: tiene que traer los que de verdad dicen algo
   * distinto.
   */
  | 'torii'
  | 'abanico'
  /*
   * Los dos de El Nudo de Valdehierro, y aquí la cuenta baja otra vez: sus
   * cinco pestañas usan `reloj` para el cuadro de marchas —que es un horario y
   * nada más—, `plano` para la estación, `mascara` para la ficha y `copa` para
   * el perfil. Solo hacen falta dos que digan algo que ninguno decía: la AGUJA,
   * que es la palanca del cambio de vía, y la LOCOMOTORA para el jefe de
   * estación.
   */
  | 'aguja'
  | 'locomotora';

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
  | 'hechos'
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
  | 'sellado'
  /*
   * Las dos de El Paso de las Sombras. `camino` es el tablero de deducción de la
   * senda —cuáles de los pasos entran y en qué orden— y `consejo` es donde se
   * propone y se señala al amanecer.
   *
   * Y aquí se vuelve a ver el acoplamiento honesto del que habla el comentario
   * de arriba: no hay forma de evitarlo mientras la app sea un binario
   * compilado. Lo que sí se puede es que el compilador lo cante, y lo canta:
   * `PANTALLAS` en `app/app/(juego)/_layout.tsx` es un Record sobre esta unión y
   * no compila hasta que se declaran.
   */
  | 'camino'
  | 'consejo'
  /*
   * Las dos de El Nudo de Valdehierro. `cuadro` es la cuadrícula compartida
   * donde se reconstruye el cuadro de marchas —y donde se cursan las órdenes— y
   * `puesto` es donde vive el INSTRUMENTO del sitio en el que estás plantado.
   *
   * `puesto` no es una pestaña más: es la primera pantalla de la plataforma que
   * lleva dentro un minijuego, y tiene que ser propia por una razón concreta y
   * no por gusto. La vista del jugador solo aplana `eligeDe` y `pideNumero` en
   * `acciones[].campos`; `eligeLibre` —que es por donde viaja la solución de un
   * instrumento— no llega al móvil, así que el panel genérico pintaría un botón
   * sin campos. Está anotado en el §11 del diseño del juego.
   */
  | 'cuadro'
  | 'puesto';

/**
 * Un bloque del dosier que se lee en el MÓVIL.
 *
 * ═══ POR QUÉ ESTO EXISTE ═══
 *
 * `app/app/(juego)/personaje.tsx` es UNA pantalla que comparten todos los
 * juegos, y durante un tiempo lo pintó todo para todos: el papel, el secreto,
 * la coartada, lo que sabes de los demás, los giros, el caso, las doce reglas,
 * los objetos y la lista de gente en la mesa. Cuando a CLUEDO se le reorganizó
 * el dosier —trama y reglas a la pestaña de Ronda, pistas a la suya— resultó que
 * la Momia y El Paso de las Sombras NO tienen esas pestañas, así que quitarles
 * lo mismo les borraba esa información de la app entera. Se tapó con un booleano
 * que preguntaba si el juego declaraba la pestaña `cuaderno`, y eso era un
 * parche: dos juegos y dos ramas, con el tercero heredando la que le tocara.
 *
 * Ahora cada juego DECLARA su dosier, bloque a bloque y en su orden. Cambiar el
 * de CLUEDO no puede tocar el de la Momia, porque son dos listas distintas en
 * dos ficheros distintos. Eso es lo que se quería decir con «sin solapes».
 *
 * ═══ POR QUÉ UNA UNIÓN CERRADA Y NO UNA CADENA LIBRE ═══
 *
 * Por lo mismo que `PantallaDeApp` e `IconoId`: la app es un binario, así que
 * los bloques que sabe pintar están compilados dentro. Con una cadena libre, un
 * juego podría declarar `'mi-bloque'` y en el móvil no saldría NADA —sin error,
 * sin aviso— y nadie se enteraría hasta la noche de la partida. Con la unión, el
 * `Record` de `app/src/dosier/bloques.tsx` no compila hasta que ese bloque
 * existe. Es el acoplamiento honesto de siempre: se paga una línea aquí y a
 * cambio el compilador no deja estrenarse a medias.
 *
 * Un juego que necesite un bloque que no está en esta lista lo añade aquí y lo
 * escribe en su propia carpeta (`app/src/momia/`, `app/src/sombras/`…). No tiene
 * que tocar los bloques de los demás ni que pedirle permiso a CLUEDO.
 */
export type BloqueDeDosier =
  /* ---- Los que sirven a cualquier juego con personajes ---- */
  /** Quién eres y si el juego te señala a ti. Lo primero que se lee. */
  | 'identidad'
  /** El consejo para quien lleva el papel que gana perdiendo. */
  | 'senalado'
  /** Tu cara pública: quién crees ser ante los demás. */
  | 'persona-publica'
  | 'secreto'
  | 'motivo'
  | 'coartada'
  /** Cómo interpretar el papel. Consejo de actuación, no información. */
  | 'gancho'
  /** Qué hizo tu personaje esa noche, hora a hora. */
  | 'cronologia-propia'
  /** Lo que sabes de los demás, que se desbloquea ronda a ronda. */
  | 'conocimiento'
  /** Los giros que te han entregado a mitad de partida. */
  | 'giros'
  /** De qué va la velada: sinopsis, víctima y dónde. */
  | 'caso'
  /** Las reglas del juego. */
  | 'reglas'
  /** Las cosas de la partida: objetos, reliquias, enseres. */
  | 'cosas'
  /** Quién está sentado a la mesa. */
  | 'mesa'
  /* ---- Los propios de El Misterio de la Momia ---- */
  /** Tu don: lo que puedes hacer tú y nadie más, una vez por vigilia. */
  | 'don'
  /* ---- Los propios de El Paso de las Sombras ---- */
  /** Tu disfraz y el blasón bajo el que cruzas. */
  | 'disfraz'
  /* ---- Los propios de El Nudo de Valdehierro ---- */
  /** Tu oficio, el instrumento que manejas y la maña que gastas una vez. */
  | 'oficio'
  /**
   * Las tiras de telegrama que salvaste del fuego.
   *
   * Van en el DOSIER y no en una pestaña porque son papel: se leen en voz alta
   * encima de la mesa. Lo que hace la app es tenerlas a mano para quien haya
   * perdido su sobre, que a las dos de la mañana pasa.
   */
  | 'telegramas';

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
   * seria que arrastra el diseño actual: `EleccionDeLugar` guarda un `roomId` y
   * nada más. Un juego con varias acciones distintas por ronda no cabe aquí y
   * necesitaría que esto fuese una lista de acciones con su propia forma.
   */
  accionSobre: CategoriaId;
  /** Cuántas veces se puede rectificar dentro de la misma ronda. */
  cambiosPermitidos: number;
  /**
   * CUÁNTAS RONDAS TIENE UNA VELADA DE ESTE JUEGO.
   *
   * ═══ POR QUÉ HACÍA FALTA, Y LO ENCONTRÓ EL CUARTO JUEGO ═══
   *
   * El único sitio que decidía cuántas rondas tiene una partida era
   * `numeroDeRondas`, que mira la ronda más alta de las PISTAS de la trama y,
   * si no hay ninguna, contesta cuatro.
   *
   * Eso funcionaba porque los tres primeros juegos usan la mecánica de pistas o
   * se conforman con cuatro. En cuanto un juego no la usa —El Nudo de
   * Valdehierro no entra en ningún sitio a encontrar nada— se queda con cuatro
   * rondas aunque su noche tenga seis franjas, y el móvil de doce personas
   * enseña «Franja 5 de 4» sin que nada dé un error.
   *
   * Derivar la duración de una velada del reparto de pistas era una propiedad
   * de CLUEDO disfrazada de regla general. Un juego que la sepa la declara; el
   * que no, sigue exactamente como estaba.
   */
  cuantas?: number;
}

/**
 * Un juego, en lo que los tres paquetes tienen que coincidir.
 *
 * Todo lo de aquí es serializable a JSON por construcción. No porque haga
 * falta hoy —hoy es un fichero de TypeScript que compila con todo lo demás—
 * sino porque el día que se quiera editar un juego sin desplegar, mudarlo a la
 * base de datos sea mover datos y no rediseñar.
 */
/**
 * Una entidad citada por la trama propia de un juego.
 *
 * `donde` es para poder decir en qué se rompió: «la vigilia 3 profana una cámara
 * que ya no existe» se entiende; «falta una entidad», no.
 */
/* ------------------------------------------------------------------ */
/* La ficha de la caja                                                 */
/* ------------------------------------------------------------------ */

/**
 * Lo que cuesta el juego, en cuatro niveles.
 *
 * NÚMERO Y NO PALABRA, y no es capricho: el catálogo tiene que poder ORDENAR
 * por esto —«enséñame primero lo que no sea muy difícil»— y una palabra no se
 * ordena sola. El nombre que se le pone delante a quien mira vive en
 * `NOMBRE_DE_DIFICULTAD`, aquí al lado, para que el taller y el móvil no puedan
 * llamar cosas distintas al mismo nivel.
 */
export type NivelDeDificultad = 1 | 2 | 3 | 4;

/** Cómo se dice cada nivel. Un solo sitio, para que nadie lo diga de otra forma. */
export const NOMBRE_DE_DIFICULTAD: Record<NivelDeDificultad, string> = {
  1: 'Iniciación',
  2: 'Media',
  3: 'Alta',
  4: 'Experta',
};

/** Dónde se juega: en la misma mesa, en la mesa y a distancia, o solo a distancia. */
export type ModoDePartida = 'en-vivo' | 'en-vivo-y-online' | 'online';

export const NOMBRE_DE_MODO: Record<ModoDePartida, string> = {
  'en-vivo': 'En vivo',
  'en-vivo-y-online': 'En vivo y online',
  online: 'Online',
};

/**
 * Lo que hay escrito en el costado de la caja: cuánto dura, desde qué edad,
 * cuánto cuesta, cuántos caben y dónde se juega.
 *
 * ═══ POR QUÉ VIVE AQUÍ Y NO EN LA PORTADA ═══
 *
 * Porque no es ilustración, es DATO DEL JUEGO. El catálogo del taller lo pinta,
 * pero quien lo sabe es el juego: el día que la app quiera decir «esta velada
 * dura tres horas» antes de repartir los móviles, o que el recibidor quiera
 * avisar de que hay catorce personas apuntadas a un juego de diez, la respuesta
 * tiene que ser la misma que la de la tarjeta. Escrito en la portada no lo
 * sería: sería una segunda verdad que nadie compara con la primera.
 *
 * Es exactamente lo que ya pasó con el candado del catálogo, que era un booleano
 * escrito a mano y anunciaba «próximamente» un juego que ya se podía jugar.
 *
 * ═══ TODO OPCIONAL, Y EL BLOQUE ENTERO TAMBIÉN ═══
 *
 * Un juego sin ficha se cataloga igual; simplemente no se le puede filtrar por
 * lo que no ha dicho. Y eso es deliberado: un filtro que DESCARTA por un dato
 * que falta miente más que uno que no filtra. Quien busque «hasta dos horas» no
 * quiere que desaparezca un juego que no ha declarado cuánto dura: quiere verlo
 * después.
 *
 * ═══ EL MÍNIMO DE PERSONAS NO ESTÁ AQUÍ, Y ES A PROPÓSITO ═══
 *
 * Ya lo dice la categoría de personas del juego, en su `minimo`, y de ahí sale
 * lo que impide generar una partida con dos. Repetirlo aquí sería abrir la
 * puerta a que la tarjeta prometa «desde 3» mientras el taller exige 4. Lo lee
 * `jugadoresMinimoDe`, más abajo. El MÁXIMO sí vive aquí, porque hoy no existe
 * en ninguna otra parte.
 */
export interface FichaDeJuego {
  /** Lo que dura una velada, en minutos. */
  duracionMinutos?: number;
  /** A partir de qué edad se puede jugar. */
  edadMinima?: number;
  dificultad?: NivelDeDificultad;
  /** Cuántas personas caben como mucho. El mínimo lo dice su categoría de personas. */
  jugadoresMaximo?: number;
  modo?: ModoDePartida;
  /**
   * De qué va, en palabras sueltas: «misterio», «mansión», «deducción».
   *
   * Es lo único de esta ficha que no se filtra sino que se BUSCA. Sirve para que
   * quien escriba «japón» en el buscador del catálogo encuentre El Paso de las
   * Sombras sin que la palabra tenga que estar en su título ni en su lema.
   */
  temas?: string[];
}

export interface ReferenciaDeTrama {
  categoria: string;
  id: string;
  donde: string;
}

export interface ManifiestoDeJuego {
  id: JuegoId;
  nombre: string;
  lema: string;

  /**
   * La ficha de la caja: duracion, edad, dificultad, aforo y modo.
   *
   * Opcional entera. Lo que un juego no diga, el catalogo no lo filtra —lo
   * ordena detras—, que es lo honesto cuando el dato falta.
   */
  ficha?: FichaDeJuego;

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

  /**
   * Qué lleva dentro el dosier del móvil, en orden.
   *
   * Es la hermana de `barra`: aquélla dice QUÉ PESTAÑAS hay, ésta dice qué hay
   * dentro de la de tu personaje. Y es OBLIGATORIA a propósito, sin respaldo:
   * el respaldo silencioso a CLUEDO es justo lo que hace que un juego nuevo se
   * estrene enseñando el dosier de otro sin que nadie lo note. Aquí el
   * compilador obliga a decidir.
   *
   * Lista vacía es una respuesta legítima: significa «este juego no tiene dosier
   * de personaje». Un juego así tampoco declarará la pestaña `personaje` en su
   * barra, y las dos cosas se leen juntas.
   */
  dosier: BloqueDeDosier[];

  /** Quién ayuda desde el botón central. */
  asistente: AsistenteDeJuego;

  /**
   * Cómo es una ronda de este juego.
   *
   * OPCIONAL, Y CONVIENE SABER POR QUÉ: hoy no lo lee absolutamente nadie. Un
   * grep de `accionSobre` y `cambiosPermitidos` sobre los tres paquetes no
   * devuelve un solo uso de producción, y los dos juegos que lo declaran lo dicen
   * en sus propios comentarios («el manifiesto declara `cambiosPermitidos: 0`
   * para decirlo, pero ese campo hoy no…»). El límite real de repeticiones lo
   * pone `vecesPorTurno`, y el «un solo cambio por ronda» de CLUEDO está cableado
   * dentro de `elegirSala`.
   *
   * Se conserva porque es DOCUMENTACIÓN útil —dice de un vistazo sobre qué actúa
   * la ronda— y se hace opcional porque exigirlo era cobrarle a un juego nuevo
   * por rellenar un campo que nadie consulta. Un juego cuya ronda no vaya «sobre»
   * ninguna categoría, como una subasta, no tenía qué poner.
   */
  ronda?: DefinicionDeRonda;

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
   * Qué entidades de la partida cita la trama PROPIA del juego.
   *
   * ─────────────────────────────────────────────────────────────────────────
   * EL AGUJERO QUE TAPA
   * ─────────────────────────────────────────────────────────────────────────
   *
   * `computeStaleness` avisa de que la partida se ha quedado descuadrada:
   * alguien nuevo sin personaje, una pista que apunta a una sala borrada, la
   * solución señalando a nadie. Pero solo miraba la parte GENÉRICA de la trama,
   * y todo lo que es propio de cada juego vive en `plot.delJuego`, que para el
   * contrato general es `unknown`.
   *
   * Así que en El Misterio de la Momia se podía borrar una cámara después de
   * generar y la plataforma decía que todo estaba en orden, mientras
   * `profanadas` y `hallazgos` seguían apuntando a una cámara que ya no existe.
   * Peor: los cinco ritos NO tienen equivalente genérico, así que tocarlos no
   * lo veía absolutamente nadie — y el orden del sellado es el juego entero.
   * Quien dirige se enteraba en la mesa, con los invitados delante.
   *
   * ─────────────────────────────────────────────────────────────────────────
   * POR QUÉ SE DECLARA Y NO SE COMPRUEBA
   * ─────────────────────────────────────────────────────────────────────────
   *
   * `staleness.ts` es compartida y genérica a propósito: si supiera de ritos y
   * de cámaras, cada juego nuevo tendría que ir a modificarla, que es
   * exactamente la forma de que el tercero se olvide. El juego dice QUÉ cita su
   * trama; la comprobación genérica se encarga de mirar si sigue existiendo.
   *
   * Sin declarar no se comprueba nada, que es lo que había: CLUEDO no tiene
   * trama propia y su informe sale idéntico.
   */
  referenciasDeLaTrama?: (delJuego: unknown) => ReferenciaDeTrama[];

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

  /**
   * Qué fase puede seguir a cuál.
   *
   * PARCIAL A PROPÓSITO: una fase que no aparezca es una fase por la que este
   * juego no pasa, y da exactamente igual que ponerla a `[]`. Los cuatro sitios
   * que leen esta tabla lo hacen con `fases[desde]?.includes(hasta) ?? false`, o
   * sea que una clave ausente ya se respondía «no» desde siempre.
   *
   * Era un `Record` exhaustivo, y eso obligaba a CADA juego a nombrar las siete
   * fases que hay hoy —incluidas `sellado`, que es de El Misterio de la Momia, y
   * `acusaciones`, que es de un juego donde se acusa— aunque fuera para ponerlas
   * a `[]`. Una subasta tenía que declarar que no pasa por el sellado de una
   * tumba. Ese es el peaje que un juego nuevo pagaba solo por entrar, y el
   * comprobador `verify:ajeno` lo tenía en su lista.
   *
   * Y LOS NOMBRES YA SON LIBRES. Eran los siete de CLUEDO —una almoneda tenía
   * que llamar `ronda-abierta` a «se canta un lote»— y ahora un juego pone los
   * suyos. Lo que la plataforma necesita saber de cada uno no es el nombre sino
   * el PAPEL, y eso se declara justo debajo.
   */
  fases: Partial<Record<LivePhase, LivePhase[]>>;

  /**
   * Qué significa cada una de tus fases para la plataforma.
   *
   * ═══ POR QUÉ HACE FALTA DECLARARLO ═══
   *
   * El núcleo le hacía cinco preguntas a la fase y se las hacía COMPARANDO CON
   * NOMBRES: `if (fase === 'lobby')` para saber si aún no había empezado,
   * `phase === 'desenlace'` para saber si podía enseñar la respuesta,
   * `sesion.phase === 'ronda-abierta'` para saber si admitía elecciones. Con los
   * nombres abiertos, esas comparaciones dejan de significar nada — y sin nada
   * que las sustituya, un juego con sus propias fases se quedaría sin sala de
   * espera, sin desenlace y sin turno abierto.
   *
   * Así que se declara. La plataforma no reconoce ningún nombre: pregunta el
   * papel y actúa.
   *
   * ═══ QUÉ PASA CON LO QUE NO SE DECLARE ═══
   *
   * Una fase sin papel es `'entreacto'`: se está jugando y el turno no admite
   * acciones. Es el papel que menos daño hace si alguien se olvida — no deja
   * entrar a nadie por error ni destapa la solución antes de tiempo.
   *
   * ═══ LOS TRES JUEGOS DE HOY DECLARAN LO MISMO ═══
   *
   * Y no es duplicación que haya que factorizar: es que los tres nacieron del
   * mismo molde. El día que uno tenga dos fases abiertas o ninguna sala de
   * espera, su tabla dejará de parecerse a las otras y estará bien.
   */
  papelDeFase: Partial<Record<LivePhase, PapelDeFase>>;

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

  /**
   * Lo que se lee mientras el agente escribe la partida.
   *
   * Son sesenta segundos a pantalla completa, y es la primera vez que quien
   * organiza ve de qué va su juego. Estaban escritas en CLUEDO —«el mayordomo
   * repasa las coartadas», «se lacra el sobre del crimen»— y salían igual
   * montando una expedición a una tumba, dentro de la misma caja en la que se
   * escribían las líneas propias de la Momia.
   *
   * Si un juego no las declara se usan las de CLUEDO, que es lo que había.
   */
  ceremonia?: { generar: string[]; actualizar: string[] };

  /**
   * Lo que se anuncia a pantalla completa en el móvil al cambiar la partida.
   *
   * Estaban escritos a mano en `routes/live.ts`, en vocabulario de CLUEDO, y el
   * telón de la app imprime el cuerpo tal cual llega: quien jugaba a la Momia
   * leía «Elige sala», «pasa al tablón común» y «Se abre el sobre del crimen»
   * en mitad de una expedición egipcia. Y el de la vigilia cerrada además
   * mentía, porque al cerrar no pasa nada a ningún tablón.
   *
   * Texto plano y no funciones: el manifiesto se serializa, así que `{ronda}` y
   * `{total}` se sustituyen al anunciar.
   */
  avisos?: {
    rondaAbierta: string;
    rondaCerrada: string;
    /** Se llamaba `acusaciones`. Es el telon de «entregad la respuesta». */
    respuestas: string;
    desenlace: string;
  };

  /**
   * El RÓTULO de cada telón, que es la línea grande de encima del cuerpo.
   *
   * ═══ POR QUÉ HACÍA FALTA ADEMÁS DE `avisos` ═══
   *
   * `avisos` son los CUERPOS y ya salían del manifiesto: «Vigilia 3 de 5. Elige
   * cámara». Los rótulos vivían en una tabla dentro de la app, con las palabras
   * de CLUEDO por defecto y dos tablas de excepciones —una para la Momia y otra
   * para las Sombras— escritas al lado. Eso tenía dos consecuencias feas.
   *
   * La primera, que la tabla de la Momia solo cubría dos de los ocho rótulos, así
   * que el telón de abrir vigilia decía «Comienza la ronda» ENCIMA de un cuerpo
   * que decía «Vigilia 3 de 5». Título de un juego, cuerpo de otro, en la misma
   * pantalla y a tamaño grande.
   *
   * La segunda es peor de ver y más sintomática: el rótulo por defecto de
   * `sellado` era «Se abre El Sellado», o sea que la tabla de CLUEDO llevaba
   * dentro el nombre de una fase de la Momia. Las palabras de los juegos se
   * habían mezclado en las dos direcciones.
   *
   * Ahora cada juego trae las suyas, en su fichero, junto al resto de sus
   * palabras. Lo que no declare cae en el respaldo de la app, que es lo que
   * había, y por eso CLUEDO no cambia.
   */
  rotulosDeAviso?: Record<string, string>;

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

/**
 * Desde cuántas personas se puede jugar a esto.
 *
 * Sale de la categoría de personas y NO de la ficha, que es el único sitio donde
 * ese número ya mandaba: por debajo de él la partida no se genera. Así la
 * tarjeta del catálogo no puede prometer un aforo que el taller vaya a rechazar.
 *
 * `undefined` en un juego sin categoría de personas —que puede existir—, y
 * entonces el catálogo simplemente no dice desde cuántos.
 */
export function jugadoresMinimoDe(m: ManifiestoDeJuego): number | undefined {
  return categoriaDeJugadores(m)?.minimo;
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
  participanteId: string,
): boolean {
  const e = ejeDeJugadores(m);
  return Boolean(e && solucion[e.id] === participanteId);
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

// ---------------------------------------------------------------------------
// El papel de una fase
// ---------------------------------------------------------------------------

/**
 * Qué es esta fase para la plataforma.
 *
 * Lo declara el juego. Una fase sin declarar es `'entreacto'` —se está jugando
 * y el turno no admite acciones— porque es el papel que menos daño hace si
 * alguien se olvida: no deja entrar a nadie por error ni destapa la solución
 * antes de tiempo.
 */
export function papelDe(m: ManifiestoDeJuego, fase: LivePhase): PapelDeFase {
  return m.papelDeFase[fase] ?? 'entreacto';
}

/** ¿Esta fase hace este papel? */
export function faseEs(m: ManifiestoDeJuego, fase: LivePhase, papel: PapelDeFase): boolean {
  return papelDe(m, fase) === papel;
}

/**
 * Las fases de este juego que hacen un papel dado.
 *
 * Sustituye a mirar en una lista de nombres. Un juego puede tener dos fases
 * abiertas —exploración y combate— o ninguna sala de espera.
 */
export function fasesConPapel(m: ManifiestoDeJuego, papel: PapelDeFase): LivePhase[] {
  return Object.keys(m.fases).filter((f) => papelDe(m, f) === papel);
}

/**
 * El mismo tipo, con TODO opcional hasta el fondo.
 *
 * ═══ PARA QUE HACE FALTA ═══
 *
 * El estado de un juego viaja al taller dentro de `LiveSession.estado`, que es
 * `Record<string, unknown>`: sin tipar a proposito, porque el nucleo no puede
 * conocer la forma de un juego que no conoce.
 *
 * Los paneles del taller lo leen, y hacian lo razonable: escribir a mano una
 * interfaz con todo opcional, porque lo que llega es JSON de la red y el tipo de
 * la red es «lo que haya». El problema no es la opcionalidad —esa es correcta—
 * sino que al escribirla a mano se REPITEN LOS NOMBRES DE LOS CAMPOS. Y una
 * copia de los nombres se separa del original sin que nada avise: se renombra
 * `retraso` en el servidor, el panel sigue compilando, y la tarjeta del retraso
 * deja de pintarse. Sin error, de noche, con la mesa puesta.
 *
 * Con esto se tienen las dos cosas: todo opcional, y los nombres comprobados
 * contra el tipo de verdad. Un renombrado rompe la compilacion del panel, que
 * es donde uno quiere enterarse.
 *
 * NO SUSTITUYE A LEER CAMPO A CAMPO. El tipo describe lo que deberia llegar; que
 * llegue sigue siendo cosa del codigo defensivo de cada panel.
 */
export type ParcialProfundo<T> = T extends (infer U)[]
  ? Array<ParcialProfundo<U>>
  : T extends object
    ? { [K in keyof T]?: ParcialProfundo<T[K]> }
    : T;
