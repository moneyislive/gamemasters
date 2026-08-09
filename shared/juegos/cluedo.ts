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
    },
    {
      id: 'salas',
      singular: 'sala',
      plural: 'salas',
      minimo: 3,
      sonLugares: true,
      admiteFoto: true,
    },
    {
      id: 'objetos',
      singular: 'objeto',
      plural: 'objetos',
      minimo: 3,
      admiteFoto: true,
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

  ronda: {
    accionSobre: 'salas',
    cambiosPermitidos: 1,
  },

  // Copiado literalmente de TRANSICIONES (server/src/live/sesion.ts).
  fases: {
    lobby: ['ronda-abierta'],
    'ronda-abierta': ['ronda-cerrada'],
    'ronda-cerrada': ['ronda-abierta', 'acusaciones'],
    acusaciones: ['desenlace'],
    desenlace: [],
  },

  // Estas tres ya estaban en shared/ y ya eran tablas. Se referencian tal cual:
  // copiarlas sería duplicar, y el objetivo de la cata es medir el acoplamiento,
  // no inflar el diff.
  trofeos: TROFEOS,
  seccionesDeDosier: DOCUMENT_SECTIONS,
  documentos: PRINTABLE_DOCS,
};
