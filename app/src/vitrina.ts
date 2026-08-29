/**
 * El escaparate de la portada: qué se puede jugar y qué se anuncia.
 *
 * DOS FAMILIAS QUE NO SE PUEDEN CONFUNDIR, y la portada las separa a propósito
 * con formas y colores distintos:
 *
 *   · VELADAS. Se juegan en la vida real, alrededor de una mesa, y las prepara
 *     una persona desde el taller. La app es el cuaderno de cada invitado. No
 *     se «entra» a una velada desde aquí: te invitan.
 *   · MINIJUEGOS. Se juegan solo, en el móvil, ahora mismo. Son el relleno de
 *     los ratos muertos, no el producto.
 *
 * Mezclarlas sería el error de diseño más caro posible: alguien tocaría una
 * velada esperando jugar y se encontraría con que necesita cinco amigos y una
 * cena. Por eso una familia es alta y con retrato, y la otra ancha y plana.
 *
 * DE DÓNDE SALEN LOS DATOS. Las veladas, del registro de manifiestos: lo que
 * hay instalado de verdad en el servidor es lo que se ve. Nada de una lista
 * escrita a mano que se queda vieja el día que se instale el segundo juego.
 */
import { juegosInstalados } from '../../shared/juegos';
import type { IconoId } from '../../shared/juegos';

/** El color con el que se reconoce cada mundo de un vistazo. */
export interface Paleta {
  /** El acento: filos, etiquetas, resplandor. */
  acento: string;
  /** Los dos extremos del degradado del retrato. */
  fondo: readonly [string, string];
}

export interface Velada {
  id: string;
  nombre: string;
  lema: string;
  /** Qué clase de velada es, en dos palabras. */
  genero: string;
  /** Lo que hay que saber antes de meterse: gente, duración. */
  gente: string;
  duracion: string;
  icono: IconoId;
  paleta: Paleta;
  /** ¿Se puede montar hoy, o está anunciada? */
  disponible: boolean;
}

export interface Minijuego {
  id: string;
  nombre: string;
  gancho: string;
  icono: IconoId;
  paleta: Paleta;
  /** `null` mientras no exista: la portada lo dice, no lo disimula. */
  ruta: string | null;
}

/** Un hueco de promoción. Vacío hoy; la portada lo salta sin dejar agujero. */
export interface Anuncio {
  id: string;
  titulo: string;
  cuerpo: string;
  llamada: string;
  url: string;
  paleta: Paleta;
}

// ---------------------------------------------------------------------------
// Paletas
// ---------------------------------------------------------------------------

export const PALETAS = {
  misterio: { acento: '#c9a227', fondo: ['#2b1a12', '#0d0806'] },
  sangre: { acento: '#d4636f', fondo: ['#3a1220', '#12060a'] },
  arcano: { acento: '#9b7fd4', fondo: ['#241a3d', '#0b0714'] },
  bosque: { acento: '#5fbf95', fondo: ['#0f2e24', '#050f0c'] },
  brasa: { acento: '#e8a04a', fondo: ['#3a2410', '#120b04'] },
  /*
   * La única FRÍA de la estantería, y por eso existe. Las cinco de arriba son
   * cálidas o moradas: una velada de acero y añil metida en cualquiera de ellas
   * se habría confundido con la de al lado en la portada, que es exactamente
   * donde no puede pasar.
   */
  acero: { acento: '#a8bcd6', fondo: ['#16223a', '#05070d'] },
} as const satisfies Record<string, Paleta>;

/**
 * Cómo se pinta cada juego instalado.
 *
 * Se mira por identificador, y si aparece un juego que no está en la tabla se
 * le da la paleta de misterio en vez de romperse: instalar un juego nuevo no
 * puede dejar la portada en blanco.
 */
const RETRATOS: Record<string, { genero: string; gente: string; duracion: string; icono: IconoId; paleta: Paleta }> = {
  cluedo: {
    genero: 'Misterio y deducción',
    gente: '4 a 12',
    duracion: 'Una noche',
    icono: 'mascara',
    paleta: PALETAS.sangre,
  },
  oca: {
    genero: 'Fiesta y azar',
    gente: '2 a 8',
    duracion: 'Una hora',
    icono: 'plano',
    paleta: PALETAS.bosque,
  },
  /*
   * El Misterio de la Momia NO está en esta tabla y se queda como estaba: cae en
   * el retrato por defecto, y ese es el estado en el que se probó y se publicó.
   * Añadirle una entrada aquí le cambiaría la portada, y la regla de esta
   * entrega es no mover los dos juegos que ya funcionan. Queda anotado en los
   * pendientes.
   */
  sombras: {
    genero: 'Sigilo y traición',
    gente: '4 a 10',
    duracion: 'Una noche',
    icono: 'torii',
    paleta: PALETAS.acero,
  },
};

const POR_DEFECTO = {
  genero: 'Juego de mesa en vivo',
  gente: 'Varios',
  duracion: 'Una velada',
  icono: 'farol' as IconoId,
  paleta: PALETAS.misterio,
};

/** Las veladas que esta instalación sabe organizar HOY. */
export function veladas(): Velada[] {
  return juegosInstalados().map((m) => {
    const retrato = RETRATOS[m.id] ?? POR_DEFECTO;
    return {
      id: m.id,
      nombre: m.nombre,
      lema: m.lema,
      ...retrato,
      disponible: true,
    };
  });
}

/**
 * Los minijuegos.
 *
 * Hoy está vacío, y la portada lo dice con una tarjeta que invita a volver, en
 * vez de fingir un catálogo que no existe. En cuanto haya uno, se añade aquí
 * con su ruta y aparece solo.
 */
export function minijuegos(): Minijuego[] {
  return [];
}

/**
 * Los anuncios.
 *
 * Vacío también. Es el hueco previsto para destacar una trama nueva, una oferta
 * o algo de un tercero; la portada lo salta limpiamente mientras no haya nada,
 * de modo que enchufar el primero no obliga a rediseñar nada.
 */
export function anuncios(): Anuncio[] {
  return [];
}
