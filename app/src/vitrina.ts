/**
 * El escaparate de la portada: qué se puede jugar y qué se anuncia.
 *
 * DOS FAMILIAS QUE NO SE PUEDEN CONFUNDIR, y la portada las separa a propósito
 * con formas y colores distintos:
 *
 *   · VELADAS. Se juegan en la vida real, alrededor de una mesa, y las prepara
 *     una persona desde el taller. La app es el cuaderno de cada invitado. No
 *     se «entra» a una velada desde aquí: te invitan.
 *   · LA SALA DE ARCADE. Se juegan aquí mismo, ahora, sin montar nada y sin
 *     esperar a nadie. Uno solo o la mesa entera alrededor de un móvil.
 *
 * ═══ ESTE COMENTARIO DECÍA OTRA COSA, Y HABÍA QUE CORREGIRLO ═══
 *
 * Decía que los minijuegos son «el relleno de los ratos muertos, NO EL PRODUCTO».
 * Era verdad cuando se escribió —`minijuegos()` devolvía una lista vacía y la
 * portada anunciaba una sala cableándose— y ha dejado de serlo: la Sala de Arcade
 * es LA SEGUNDA CATEGORÍA DE JUEGOS de la plataforma, con su propio motor, su
 * propio contrato y su propio registro, y el propietario ha declarado obsoleta la
 * frase.
 *
 * Y no es una cuestión de tono. Una frase así, escrita en la cabecera del fichero
 * que decide qué se enseña en la portada, es la que hace que dentro de seis meses
 * alguien pinte la sala más pequeña, la mande más abajo o no se moleste en
 * arreglarle un fallo. Un comentario que describe mal el producto acaba
 * construyendo el producto que describe.
 *
 * Lo que NO ha cambiado es la separación, que sigue siendo la razón de ser de este
 * fichero: mezclar las dos familias sería el error de diseño más caro posible
 * —alguien tocaría una velada esperando jugar y se encontraría con que necesita
 * cinco amigos y una cena— y por eso una es alta y con retrato y la otra ancha y
 * plana.
 *
 * DE DÓNDE SALEN LOS DATOS. De los dos registros, y son DOS y no uno: las veladas
 * de `shared/juegos` y los arcades de `shared/arcade`, cada uno anclado con su
 * propio `Symbol.for`. Lo que hay instalado de verdad es lo que se ve, y ninguna
 * de las dos listas está escrita a mano. Que los registros estén separados es lo
 * que impide que un arcade aparezca por descuido en el carrusel de veladas: si
 * compartieran tabla, la única defensa sería un `if (esArcade)` dentro de
 * `veladas()`, que es la primera de las cien banderas que deshacen la separación.
 */
import { juegosInstalados } from '../../shared/juegos';
import type { IconoId } from '../../shared/juegos';
import { arcadesInstalados } from '../../shared/arcade';
import type { IconoDeArcade, ManifiestoDeArcade } from '../../shared/arcade';
/*
 * Y ESTA IMPORTACIÓN ES LA QUE LLENA LA SALA. Importarla instala los arcades que
 * trae el binario: es el mismo trato que `shared/juegos/index.ts` da a las
 * veladas, y por el mismo motivo —una lista escrita a mano en otro sitio se queda
 * vieja el día que entre el segundo juego—.
 */
import '../../shared/arcade/juegos';
import type { Href } from 'expo-router';
import { MUEBLES, rutaDeArcade } from './arcade/muebles';

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

/**
 * Un arcade, tal como lo pinta la portada.
 *
 * ═══ SU `icono` ES DE OTRA FAMILIA, Y NO ES UN DESCUIDO ═══
 *
 * `IconoDeArcade` y no `IconoId`. Son dos uniones cerradas distintas porque son
 * dos vocabularios distintos: un torii, un escarabajo y un mayordomo son los
 * emblemas de tres misterios y no significan nada en una sala de arcade. Compartir
 * el tipo obligaría al contrato del arcade a importar el de las veladas, que es
 * justo la frontera que sostiene los dos motores.
 *
 * La app pinta cada uno con su tabla: `ICONOS` para las veladas e
 * `ICONOS_DE_ARCADE` para éstos, las dos en `app/src/iconos.tsx`.
 */
export interface Minijuego {
  id: string;
  nombre: string;
  gancho: string;
  icono: IconoDeArcade;
  paleta: Paleta;
  /**
   * Adónde lleva la tarjeta. `null` si esta app no sabe pintar su mueble.
   *
   * Puede pasar de verdad y no es un caso teórico: el registro es de EJECUCIÓN
   * —un arcade se instala llamando a una función— y la app es un binario. Un
   * arcade que declare un mueble que esta versión no trae se lista con la verdad
   * por delante en vez de con una tarjeta que no hace nada al tocarla.
   */
  ruta: Href | null;
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
  /*
   * La de El Nudo de Valdehierro, y hace falta una nueva por el mismo motivo por
   * el que hizo falta `acero`: ninguna de las seis de arriba deja la tarjeta como
   * es el juego.
   *
   * `acero` era la tentación —también es una noche fría— y es justo la que no
   * puede ser: es la de El Paso de las Sombras, y ponerla aquí volvería a
   * confundir dos veladas en la portada, que es lo que aquel comentario existe
   * para impedir. `brasa` acierta el acento y falla el fondo: su degradado es
   * marrón cálido, o sea una taberna, y esto es una estación nevada.
   *
   * Lo propio de este juego es precisamente la MEZCLA que ninguna otra tiene:
   * ámbar de bombilla sobre azul de hulla. El acento es `oro400` de
   * `tema-nudo.ts` y el fondo son dos paradas de `FONDO_NUDO`, así que la
   * tarjeta de la portada y la app que se abre desde ella son del mismo color.
   */
  hulla: { acento: '#d9a648', fondo: ['#131a24', '#05070b'] },
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
  /*
   * El Nudo de Valdehierro. El mínimo de cuatro sale de su manifiesto —cuatro
   * oficios, uno por persona, y con menos hay un instrumento de la estación que
   * no maneja nadie— y el tope de doce, de su diseño, que es donde se cuenta el
   * reparto de telegramas.
   *
   * `locomotora` y no `aguja` porque la aguja ya trabaja de icono de pestaña en
   * la barra del juego, y aquí se pide el emblema de la velada entera. Es la
   * misma elección que hizo El Paso de las Sombras con `torii`.
   */
  nudo: {
    genero: 'Lógica y cooperación',
    gente: '4 a 12',
    duracion: 'Una noche',
    icono: 'locomotora',
    paleta: PALETAS.hulla,
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
 * Cómo se pinta cada arcade instalado.
 *
 * Misma disciplina que `RETRATOS`: se mira por identificador y quien no esté en la
 * tabla se lleva la paleta por defecto en vez de romper la portada. Instalar un
 * juego nuevo no puede dejar la Sala en blanco.
 */
const PALETAS_DE_ARCADE: Record<string, Paleta> = {
  /*
   * La Frente lleva el verde de neón de la Sala, que es el acento con el que la
   * portada separa esta familia de la otra. Ver `app/src/arcade/muebles.ts`, donde
   * viven los mismos colores para la pantalla del juego: la tarjeta y lo que se
   * abre al tocarla tienen que ser del mismo color, que es la regla que este
   * fichero ya aplicaba a las veladas.
   */
  frente: { acento: '#5fd4c8', fondo: ['#0c1c19', '#06110f'] },
};

const PALETA_DE_ARCADE_POR_DEFECTO: Paleta = { acento: '#5fd4c8', fondo: ['#12232b', '#060c0f'] };

/**
 * LOS ARCADES INSTALADOS. Ya no devuelve `[]`.
 *
 * ═══ LEE DEL REGISTRO, Y NO DE UNA LISTA ESCRITA AQUÍ ═══
 *
 * Es la misma decisión que `veladas()` y por la misma razón: lo que hay instalado
 * de verdad es lo que se ve. Una lista a mano se queda vieja el día que entre el
 * segundo juego, y peor —anunciaría en la portada un juego que este binario no
 * sabe jugar—.
 *
 * ═══ Y LEE DEL REGISTRO DE ARCADES, QUE ES OTRO ═══
 *
 * `arcadesInstalados()` de `shared/arcade`, anclado en
 * `Symbol.for('gamemasters.arcade.instalados')`, y NO `juegosInstalados()`. Si un
 * arcade se registrara en el reparto de veladas, `veladas()` lo pintaría en el
 * carrusel de la portada —entre CLUEDO y la Momia, con su retrato alto y su
 * «Una noche»— y para evitarlo alguien metería un `if (esArcade)` ahí arriba. Dos
 * registros con dos símbolos distintos hacen que esa línea no se pueda escribir
 * por descuido.
 */
export function minijuegos(): Minijuego[] {
  return arcadesInstalados().map((m: ManifiestoDeArcade) => ({
    id: m.id,
    nombre: m.nombre,
    gancho: m.gancho,
    icono: m.icono,
    paleta: PALETAS_DE_ARCADE[m.id] ?? PALETA_DE_ARCADE_POR_DEFECTO,
    ruta: MUEBLES[m.mueble].seSabePintar ? rutaDeArcade(m) : null,
  }));
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
