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
import type { ManifiestoDeJuego } from './tipos';

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
  },

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
};
