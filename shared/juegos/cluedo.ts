/**
 * CLUEDO, dicho como datos.
 *
 * CATA. Ninguna de estas tablas es nueva: todas existían ya en el código,
 * cableadas como la única verdad posible. Aquí solo se les pone encima un
 * nombre de juego. De dónde viene cada una:
 *
 *   fases ............... TRANSICIONES, en server/src/live/sesion.ts
 *   trofeos ............. TROFEOS, en shared/live.ts
 *   seccionesDeDosier ... DOCUMENT_SECTIONS, en shared/types.ts
 *   documentos .......... PRINTABLE_DOCS, en shared/documents.ts
 *
 * Lo único que hay que escribir de cero es lo que nunca se llegó a declarar
 * porque no hacía falta: qué categorías de entidades tiene el juego y cuáles
 * son los ejes de la respuesta. Eso vivía repartido entre los nombres de los
 * campos —`suspects`, `weapons`, `rooms`, `murdererId`— y en la cabeza de
 * quien lo escribió.
 */
import { TROFEOS } from '../live';
import { DOCUMENT_SECTIONS } from '../types';
import { PRINTABLE_DOCS } from '../documents';
import type { ManifiestoDeJuego, ReglaDeJuego } from './tipos';

/**
 * Las reglas de CLUEDO, tal y como las lee quien juega.
 *
 * Estaban en `server/src/docs/datos.ts` como `REGLAS_JUGADOR`, con nombre de
 * verdad universal, y de ahí salían hacia los tres sitios que las enseñan. El
 * texto no ha cambiado ni una coma al mudarse: lo comprueba el maestro de oro,
 * que compara el dosier impreso byte a byte.
 */
export const REGLAS_CLUEDO: ReglaDeJuego[] = [
  {
    titulo: 'El objetivo',
    texto:
      'Alguien de esta casa es un asesino. Debes descubrir quién lo hizo, con qué objeto y en qué sala. Gana quien acierte los tres elementos en la acusación final.',
  },
  {
    titulo: 'Tu personaje',
    texto:
      'Interpreta al personaje de tu dosier durante toda la velada. Tu forma de ser, tus opiniones y tus intenciones son tuyas; los hechos que el dosier da por ciertos, no.',
  },
  {
    titulo: 'Qué puedes ocultar y qué no',
    texto:
      'Puedes callar, desviar la atención y mentir sobre tus opiniones, intenciones y sospechas. No puedes negar un hecho que tu dosier afirme, mentir sobre dónde estuviste realmente, inventarte pruebas ni cambiar lo que dice una pista. Sobre una prueba puedes discutir su interpretación, nunca su contenido.',
  },
  {
    titulo: 'Tu secreto',
    texto:
      'Todos escondéis algo, y casi ninguno es el crimen. Revélalo cuando te acorralen con algo concreto o cuando te convenga; nadie puede obligarte.',
  },
  {
    titulo: 'Las rondas',
    texto:
      'Quien dirige abre y cierra cada ronda. Durante una ronda entras en una sala y conversas con quien esté allí.',
  },
  {
    titulo: 'Preguntas dirigidas',
    texto:
      'En cada ronda puedes hacer una pregunta directa a alguien que esté en tu sala. Puede responder con la verdad, dar una respuesta parcial o negarse a contestar; negarse también dice cosas. Lo que no puede es contradecir un hecho de su dosier.',
  },
  {
    titulo: 'Hipótesis',
    texto:
      'Puedes lanzar en voz alta la combinación que sospeches para provocar reacciones, pero nadie está obligado a refutarla: aquí no hay cartas que enseñar. Solo cuenta la acusación final.',
  },
  {
    titulo: 'Pistas',
    texto:
      'Cada ronda aparecen pruebas nuevas. Las que encuentres son tuyas para enseñarlas o guardarlas, pero al cerrar la ronda las pruebas físicas pasan al tablón común. Los secretos personales siguen siendo privados.',
  },
  {
    titulo: 'Pasadizos',
    texto:
      'Si el plano marca un pasadizo entre dos salas, puedes usarlo para cruzar la casa sin pasar por el pasillo. Nadie te verá salir.',
  },
  {
    titulo: 'La acusación final',
    texto:
      'Al final cada jugador escribe su acusación: persona, objeto y sala. Se acusa una sola vez, por escrito y a la vez que los demás.',
  },
  {
    titulo: 'El desenlace',
    texto:
      'Se lee la solución. Quien haya acertado los tres elementos resuelve el caso; si nadie acierta, el asesino se sale con la suya.',
  },
  {
    titulo: 'La regla de oro',
    texto:
      'Todo lo de esta noche es ficción. Interpreta con generosidad y deja brillar a los demás.',
  },
];

export const CLUEDO: ManifiestoDeJuego = {
  id: 'cluedo',
  nombre: 'CLUEDO',
  lema: 'Alguien de esta casa miente.',

  categorias: [
    {
      id: 'sospechosos',
      singular: 'sospechoso',
      plural: 'sospechosos',
      minimo: 3,
      sonJugadores: true,
      admiteFoto: true,
      admiteEmail: true,
      // Donde han vivido siempre. Se declara para que deje de estar escondido.
      almacen: 'suspects',
      presentacion: {
        titulo: 'Los sospechosos',
        descripcion:
          'Las personas de carne y hueso que se sentarán a la mesa. Cuanto mejor las describas, más a medida será su personaje.',
        forma: 'circle',
        vacio: {
          glifo: '♟',
          titulo: 'Todavía no hay nadie',
          texto: 'Añade al menos tres invitados. El agente escribirá un personaje a la medida de cada uno.',
        },
        ejemploNombre: 'Marta',
        ejemploDescripcion:
          'Le encanta el teatro y no sabe mentir sin reírse. Ideal para un papel con un secreto que le cueste guardar.',
        pista: 'El agente usa esto para asignarle un papel que la haga disfrutar.',
      },
    },
    {
      id: 'salas',
      singular: 'sala',
      plural: 'salas',
      minimo: 3,
      sonLugares: true,
      admiteFoto: true,
      almacen: 'rooms',
      presentacion: {
        titulo: 'Las salas',
        descripcion:
          'Las estancias reales de tu casa por las que se moverán los invitados. Cada una esconderá sus pistas.',
        forma: 'square',
        vacio: {
          glifo: '⌂',
          titulo: 'La casa está vacía',
          texto: 'Añade al menos tres estancias. Con nombres reconocibles, la velada se juega sola.',
        },
        ejemploNombre: 'La cocina',
        ejemploDescripcion: 'La grande, con la mesa de mármol y la puerta que da al patio.',
        pista: 'Los detalles reales hacen que la trama parezca escrita para tu casa.',
      },
    },
    {
      id: 'objetos',
      singular: 'objeto',
      plural: 'objetos',
      minimo: 3,
      admiteFoto: true,
      almacen: 'weapons',
      presentacion: {
        titulo: 'Armas del crimen',
        descripcion:
          'Objetos que existan de verdad en tu casa: uno de ellos será el arma homicida, el resto, señuelos perfectos.',
        forma: 'square',
        vacio: {
          glifo: '†',
          titulo: 'El armero está vacío',
          texto: 'Añade al menos tres objetos cotidianos. Cuanto más reconocibles sean para tus invitados, mejor.',
        },
        sugerencias: ['Candelabro', 'Cuerda', 'Tubería de plomo', 'Revólver', 'Puñal', 'Llave inglesa'],
        ejemploNombre: 'Candelabro de plata',
        ejemploDescripcion:
          'El que heredó la abuela: pesado, con una muesca en la base. Suele estar en el aparador del salón.',
        pista: 'Los detalles reales hacen que la trama parezca escrita para tu casa.',
      },
    },
  ],

  // Aquí es donde la cata gana o pierde. Si esto se puede escribir y el resto
  // del sistema lo respeta, un misterio de dos ejes o de cuatro deja de ser
  // inexpresable.
  ejes: [
    { id: 'culpable', pregunta: '¿Quién lo hizo?', rotulo: 'Quién', categoria: 'sospechosos' },
    { id: 'objeto', pregunta: '¿Con qué?', rotulo: 'Con qué', categoria: 'objetos' },
    { id: 'lugar', pregunta: '¿Dónde?', rotulo: 'Dónde', categoria: 'salas' },
  ],

  // Los doce eligen sala a la vez; la ronda la cierra quien dirige.
  turnos: 'simultaneo',

  acciones: [
    {
      id: 'entrar-en-sala',
      rotulo: 'Entrar en una sala',
      fases: ['ronda-abierta'],
      eligeDe: [{ campo: 'sala', categoria: 'salas', rotulo: '¿Dónde entras?' }],
      vecesPorTurno: 2,
    },
    {
      id: 'acusar',
      rotulo: 'Acusar',
      /*
       * LAS TRES FASES DE JUEGO. Acusar es una carrera —gana quien acierta
       * antes— asi que esperar a que alguien la habilite la convertiria en una
       * cola. Una por persona y para toda la partida; eso lo vigila el motor.
       */
      fases: ['ronda-abierta', 'ronda-cerrada', 'acusaciones'],
      vecesPorTurno: 1,
      // Los campos de la acusación SON los ejes. Al declararlo así, el motor
      // comprueba que cada respuesta es una entidad real de la categoría que
      // le toca: que «con qué» sea un objeto y no una sala. Antes eso no lo
      // comprobaba nadie y un móvil manipulado podía mandar cualquier id.
      eligeDe: [
        { campo: 'culpable', categoria: 'sospechosos', rotulo: '¿Quién lo hizo?' },
        { campo: 'objeto', categoria: 'objetos', rotulo: '¿Con qué?' },
        { campo: 'lugar', categoria: 'salas', rotulo: '¿Dónde?' },
      ],
    },
  ],

  // Las seis de siempre, con los rótulos de siempre. «Notas» y no «Cuaderno»
  // porque con la muesca en medio, en un móvil estrecho no entra.
  barra: [
    { pantalla: 'ronda', rotulo: 'Ronda', icono: 'reloj' },
    { pantalla: 'personaje', rotulo: 'Tú', icono: 'mascara' },
    { pantalla: 'mapa', rotulo: 'Mapa', icono: 'plano' },
    { pantalla: 'tablon', rotulo: 'Tablón', icono: 'tablon' },
    { pantalla: 'cuaderno', rotulo: 'Notas', icono: 'cuaderno' },
    { pantalla: 'perfil', rotulo: 'Perfil', icono: 'copa' },
  ],

  asistente: {
    nombre: 'El Mayordomo',
    descripcion: 'Tu asistente del juego con IA',
    icono: 'mayordomo',
    /*
     * PALABRA POR PALABRA LO QUE YA DECÍA. Este texto estaba escrito a mano en
     * `live/consejero.ts`; al sacarlo aquí no se ha cambiado ni una coma, para
     * que el Mayordomo siga hablando exactamente igual que ayer.
     */
    voz:
      'Eres el Mayordomo de una velada de misterio en vivo, al estilo CLUEDO.\n' +
      'Hablas SIEMPRE en español, con el tono de un mayordomo veterano: cortés, breve, con un punto de\n' +
      'ironía seca. Tratas de usted.',
    saludo:
      'Usted dirá. Le aviso de entrada: no conozco la solución, ni las pistas, ni lo que esconden ' +
      'los demás. Estoy para las reglas y para su papel. Lo otro tendrá que sacarlo de la mesa.',
    seNiega: 'si yo resolviera los crímenes, señor, no estaría sirviendo copas',
    sinIa: {
      reglas:
        'En cada ronda entra usted en una sala y ve lo que allí se encuentre. Puede cambiarse una ' +
        'sola vez. Al cerrar la ronda, lo hallado pasa al tablón común y se habla. Al final, una ' +
        'única acusación: quién, con qué y dónde.',
      personaje:
        'Lo que esconde, lo sabe mejor que yo; y su coartada es la que declaró. Sosténgala sin adornarla de más.',
      solucion:
        'Si yo resolviera los crímenes, señor, no estaría sirviendo copas. Eso tendrá que sacarlo usted de la mesa.',
      general:
        'Sin línea con el despacho, mi consejo es el de siempre: hable con quien todavía no haya ' +
        'hablado. La gente se delata contestando, no callando.',
    },
  },

  reglas: REGLAS_CLUEDO,

  ronda: {
    accionSobre: 'salas',
    cambiosPermitidos: 1,
  },

  // Copiado literalmente de TRANSICIONES (server/src/live/sesion.ts).
  fases: {
    lobby: ['ronda-abierta'],
    'ronda-abierta': ['ronda-cerrada'],
    /*
     * De `ronda-cerrada` se sale al desenlace DIRECTAMENTE. Antes habia que
     * pasar por `acusaciones`, porque era ahi donde se acusaba; ahora se acusa
     * durante el juego, asi que esa parada dejo de tener contenido. Y al quitar
     * el boton que la abria se quedaba sin puerta: el sobre del crimen solo se
     * podia abrir desde una fase a la que ya no se llegaba.
     */
    'ronda-cerrada': ['ronda-abierta', 'acusaciones', 'desenlace'],
    /*
     * De `acusaciones` se puede VOLVER a jugar. Antes solo llevaba al desenlace,
     * asi que una partida que pasara por ahi se quedaba sin rondas aunque
     * faltara gente por acusar. Se conserva la fase para no romper las partidas
     * que ya esten en ella.
     */
    acusaciones: ['ronda-abierta', 'desenlace'],
    /*
     * El sellado es de El Misterio de la Momia. Aqui se declara vacio, que es
     * la forma de decir «este juego no pasa por ahi»: si alguien intentase
     * llevar una partida de CLUEDO a esa fase, `sePuedeIr` lo rechaza.
     */
    sellado: [],
    // Una velada empieza y acaba la misma noche: nunca hay intermedio.
    intermedio: [],
    desenlace: [],
  },

  // Estas tres ya estaban en shared/ y ya eran tablas. Se referencian tal cual:
  // copiarlas sería duplicar, y el objetivo de la cata es medir el acoplamiento,
  // no inflar el diff.
  trofeos: TROFEOS,
  seccionesDeDosier: DOCUMENT_SECTIONS,
  documentos: PRINTABLE_DOCS,
  materialDeVelada: true,
};
