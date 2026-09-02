/**
 * CatalogPage — portada de GameMasters.
 *
 * Catálogo de juegos. Lo que decide si una tarjeta se puede abrir no es un
 * booleano escrito a mano: es si ese juego está INSTALADO de verdad. El candado
 * no puede mentir, y esa es la única forma de que no vuelva a pasar lo que
 * pasaba —«El Misterio de la Momia» anunciándose como próximamente cuando ya se
 * podía jugar—.
 *
 * De cada tarjeta, lo que es del juego sale de su manifiesto (el nombre y el
 * lema) y lo que es de la portada se queda aquí (el dibujo, la paleta de la
 * ficha y la invitación a entrar), porque son ilustración y no datos.
 *
 * Todo el arte es tipográfico / SVG inline: sin imágenes externas.
 */
import { useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  juegosInstalados,
  jugadoresMinimoDe,
  manifiestoDe,
  manifiestoSiExiste,
  NOMBRE_DE_DIFICULTAD,
  NOMBRE_DE_MODO,
} from '../../../shared/juegos';
import { useTemaDeJuego } from '../lib/tema';
import BuscadorDeVeladas from '../components/catalogo/BuscadorDeVeladas';
import {
  cuantosCriterios,
  duracionEnPalabras,
  lineaDeJugadores,
  repartir,
  SIN_CRITERIOS,
} from '../lib/catalogo';
import type { Criterios, FichaDeCatalogo } from '../lib/catalogo';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import '../styles/catalog.css';

/* ------------------------------------------------------------------ */
/* Arte SVG de cada tarjeta (silueta en el color de acento de la casa) */
/* ------------------------------------------------------------------ */

/** CLUEDO — candelabro de tres brazos y gran lupa de detective. */
function ArtCluedo(): ReactElement {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="Candelabro y lupa">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        {/* Candelabro */}
        <path d="M44 198h60" />
        <path d="M66 198c0-6 4-9 8-9s8 3 8 9" />
        <path d="M74 189v-39" />
        <path d="M74 150c-18 0-30-10-30-28" />
        <path d="M74 150c18 0 30-10 30-28" />
        {/* Velas */}
        <path d="M40 122v-22M48 122v-22M40 100h8" />
        <path d="M100 122v-22M108 122v-22M100 100h8" />
        <path d="M70 150v-31M78 150v-31M70 119h8" />
        {/* Llamas */}
        <path d="M44 84q6 8 0 14q-6-6 0-14z" fill="currentColor" stroke="none" opacity="0.95" />
        <path d="M104 84q6 8 0 14q-6-6 0-14z" fill="currentColor" stroke="none" opacity="0.95" />
        <path d="M74 102q6 8 0 14q-6-6 0-14z" fill="currentColor" stroke="none" opacity="0.95" />
      </g>
      {/* Lupa */}
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="156" cy="96" r="44" strokeWidth="5" />
        <circle cx="156" cy="96" r="35" strokeWidth="1.5" opacity="0.4" />
        <path d="M134 80a28 28 0 0 1 16-11" strokeWidth="3" opacity="0.55" />
        <path d="M188 128l24 24" strokeWidth="9" />
      </g>
    </svg>
  );
}

/** Dungeons & Dragons — dado de veinte caras en trazo. */
function ArtDragons(): ReactElement {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="Dado de veinte caras">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <polygon points="110,18 190,64 190,156 110,202 30,156 30,64" />
        <polygon points="110,58 155,140 65,140" />
        <path d="M110 18v40" />
        <path d="M190 64l-80-6M190 64l-35 76M190 156l-35-16" />
        <path d="M110 202l45-62M110 202l-45-62" />
        <path d="M30 156l35-16M30 64l35 76M30 64l80-6" />
      </g>
      <text
        x="110"
        y="126"
        textAnchor="middle"
        fontFamily="Cinzel, serif"
        fontSize="32"
        fill="currentColor"
        stroke="none"
      >
        20
      </text>
    </svg>
  );
}

/** El Misterio de la Momia — pirámides, sol y ojo. */
function ArtMummy(): ReactElement {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="Pirámides y ojo egipcio">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* Sol y rayos */}
        <circle cx="110" cy="46" r="16" />
        <path d="M110 18v-8M138 30l6-6M82 30l-6-6M142 46h10M68 46H58" opacity="0.7" />
        {/* Pirámide pequeña */}
        <polygon points="14,182 56,116 98,182" />
        <path d="M56 116l14 66" opacity="0.5" />
        {/* Pirámide grande */}
        <polygon points="62,182 134,74 206,182" />
        <path d="M134 74l24 108" opacity="0.5" />
        {/* Ojo bajo la gran pirámide */}
        <path d="M104 156q28-18 56 0q-28 18-56 0z" />
        <circle cx="132" cy="156" r="7" fill="currentColor" stroke="none" />
        <path d="M132 166v12M132 178l-10 8" opacity="0.7" />
      </g>
    </svg>
  );
}

/**
 * El Paso de las Sombras — un torii, la luna y el camino que sube.
 *
 * Tenía que distinguirse de la ficha de la Momia a un metro, y ahí estaba el
 * riesgo: aquella son dos triángulos —pirámides— y unas montañas de trazo se le
 * habrían parecido demasiado en la estantería. Lo que separa las dos siluetas es
 * el TORII, que no se parece a nada más de la portada, y que la luna esté ALTA y
 * hueca en vez de un sol con rayos.
 */
function ArtSombras(): ReactElement {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="Un torii, la luna y un camino de monte">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* La luna, alta y detrás de todo. */}
        <circle cx="164" cy="48" r="26" />
        <path d="M150 30a26 26 0 0 0 24 40" opacity="0.35" />

        {/* Las crestas del monte, muy bajas: es un puerto, no una cordillera. */}
        <path d="M8 150l30-26 22 18 26-30 24 26 30-22 34 30" opacity="0.55" />

        {/* Dos pinos, la silueta que dice «Japón» sin decir nada. */}
        <path d="M46 150v-26M34 128l12-14 12 14M38 138l8-9 8 9" opacity="0.75" />
        <path d="M190 156v-22M180 138l10-12 10 12" opacity="0.6" />

        {/* El camino, que se estrecha al fondo. */}
        <path d="M62 210l30-58M158 210l-34-58" opacity="0.5" />
        <path d="M92 152h32" opacity="0.5" />

        {/* El torii, en primer plano y a la izquierda. */}
        <path d="M62 122h74" strokeWidth="5" />
        <path d="M70 136h58" />
        <path d="M76 122l4 68" />
        <path d="M122 122l-4 68" />
        <path d="M99 122v14" />
      </g>
      {/* Un mon lacado: el sello bermellón, lo único macizo del dibujo. */}
      <circle cx="99" cy="176" r="9" fill="currentColor" stroke="none" opacity="0.85" />
      <circle cx="99" cy="176" r="4" fill="none" stroke="var(--card-bg1)" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * El Nudo de Valdehierro — la vía que se abre en dos, el farol y la nieve.
 *
 * De las cinco siluetas de la estantería, esta es la única que no tiene una
 * sola figura en el centro: tiene una LÍNEA que entra por abajo y se parte. Eso
 * era el requisito de verdad, porque el juego entero es decidir por dónde va
 * cada uno de los seis convoyes, y una bifurcación es esa frase dibujada.
 *
 * LA PERSPECTIVA HACE EL TRABAJO QUE AQUÍ NO PUEDE HACER EL COLOR. La ficha se
 * pinta con un solo color de acento, así que la profundidad no se puede contar
 * con tonos: se cuenta con la geometría. Los dos carriles se juntan según suben
 * y las traviesas se estrechan con ellos, que es lo que convierte cuatro rectas
 * en una vía que se va.
 *
 * Y HAY UN SEGUNDO CARRIL QUE CRUZA AL PRIMERO, que parece un error de trazo y
 * no lo es: es el corazón de la aguja, el punto donde el carril de la desviada
 * atraviesa al de la directa. Sin él son dos vías paralelas que se separan; con
 * él son una vía que se bifurca, que es lo que dice el título.
 */
function ArtNudo(): ReactElement {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="Una vía que se bifurca en una aguja, con un farol y nieve">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/*
         * Las traviesas de delante: gordas, y SOBRESALIENDO de los dos carriles.
         * Lo segundo es lo que importa. Cortadas a ras de carril esto se
         * convertía en una escalera de mano —así estaba, y así se veía—; lo que
         * hace que una traviesa parezca una traviesa es el trozo que le sobra.
         */}
        <path d="M-2 194L78 222M34 172L100 196M64 154L118 173" strokeWidth="3.4" opacity="0.42" />
        {/* Y las de más allá, más finas, más cortas y cada vez más juntas. */}
        <path
          d="M90 139L133 155M111 126L146 139M129 115L157 125M144 106L166 114M157 98L174 105"
          strokeWidth="2.2"
          opacity="0.3"
        />

        {/* La vía directa, hacia el punto de fuga de la esquina de arriba. */}
        <path d="M4 196L179 86M72 220L185 89" strokeWidth="3.2" />
        {/*
         * La desviada, más pálida: se va hacia donde ya no llega la bombilla.
         *
         * SALE TANGENTE Y LUEGO SE ABRE, que es la única parte de esta silueta
         * que hubo que rehacer. Con las dos ramas saliendo ya torcidas desde el
         * primer píxel —así estaban— no se veía una vía que se bifurca: se veían
         * dos vías distintas que se cruzan por casualidad. Un desvío de verdad
         * arranca paralelo a la vía de la que sale y se separa poco a poco, y
         * por eso el primer punto de control de las dos curvas está sobre la
         * dirección de la vía directa. Es lo que convierte una equis en una uve.
         */}
        <path d="M62 160C86 143 96 112 98 84M110 176C138 158 132 116 120 90" strokeWidth="3" opacity="0.62" />
        {/*
         * Y sus tres traviesas, que son baratas y hacen todo el trabajo: dos
         * líneas finas y curvas se leen como dos cables, y con tres travesaños
         * cruzados encima se leen como una vía. Van más pálidas que las de la
         * directa porque están más lejos y porque ahí ya no llega la bombilla.
         */}
        <path d="M74 144L129 160M87 121L133 132M93 100L129 108" strokeWidth="2" opacity="0.26" />

        {/* El farol del andén: el poste, el sombrerete y la caja de la luz. */}
        <path d="M26 172V74M14 172h24M14 74l12-13 12 13M17 74h18l-3 24H20z" strokeWidth="3" />
        {/* Lo que alumbra. Seis rayas cortas bastan: más son un sol, y esto es una bombilla. */}
        <path d="M9 86H2M43 86h7M11 72l-5-5M41 72l5-5M11 100l-5 5M41 100l5 5" strokeWidth="2" opacity="0.45" />
        {/* La nieve cuajada encima del sombrerete: lleva ahí toda la noche. */}
        <path d="M16 70q4.5-6.5 10-10q5.5 3.5 10 10" strokeWidth="3.2" opacity="0.5" />

        {/* La caja del farol de la aguja, plantada por fuera del desvío. */}
        <path d="M140 198v-20M134 164h12v14h-12z" strokeWidth="2.4" opacity="0.8" />

        {/* El ventisquero, delante de todo: la nieve ya está tapando la vía. */}
        <path d="M0 209q22-10 44-2t44-3t44 4t44-3t44 2" strokeWidth="4" opacity="0.28" />
      </g>

      {/* La bombilla. Lo único macizo del dibujo, como el sello de las Sombras. */}
      <circle cx="26" cy="86" r="6" fill="currentColor" stroke="none" />
      {/*
       * La lente del farol de la aguja, y lo ÚNICO que no está pintado con el
       * acento de la ficha. Un farol de aguja enseña ámbar por la vía directa y
       * rojo por la desviada: es literalmente el aparato que dice hacia dónde
       * está puesto el desvío. Va pequeño a propósito —el rojo de señal es
       * oscuro y a este tamaño compite con la bombilla si crece.
       */}
      <circle cx="140" cy="171" r="3.4" fill="#9a2f22" stroke="none" />

      {/* Los copos. Sin simetría y de tres tamaños, que es como cae la nieve. */}
      <g fill="currentColor" stroke="none" opacity="0.5">
        <circle cx="30" cy="34" r="2.2" />
        <circle cx="62" cy="18" r="1.7" />
        <circle cx="86" cy="52" r="1.5" />
        <circle cx="114" cy="36" r="2" />
        <circle cx="152" cy="26" r="1.8" />
        <circle cx="188" cy="44" r="2.2" />
        <circle cx="206" cy="76" r="1.6" />
        <circle cx="160" cy="72" r="1.4" />
        <circle cx="196" cy="118" r="1.9" />
        <circle cx="8" cy="110" r="1.8" />
        <circle cx="204" cy="156" r="2.1" />
        <circle cx="168" cy="194" r="1.7" />
      </g>
    </svg>
  );
}

/** Harry Potter — varita, chispas y rayo. */
function ArtWizard(): ReactElement {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="Varita mágica y chispas">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        {/* Varita: empuñadura y caña */}
        <path d="M56 188l30-36" strokeWidth="10" />
        <path d="M86 152l60-72" strokeWidth="5" />
        {/* Destello en la punta */}
        <path d="M150 72l14-16M156 84l18-4M138 62l4-18M162 66l10-12" strokeWidth="3" opacity="0.85" />
        <circle cx="150" cy="74" r="4" fill="currentColor" stroke="none" />
      </g>
      {/* Chispas estelares */}
      <g fill="currentColor" stroke="none" opacity="0.9">
        <path d="M46 66l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        <path d="M178 128l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" />
        <path d="M96 40l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" opacity="0.7" />
      </g>
      {/* Rayo */}
      <polygon
        points="184,58 168,88 178,88 160,120 188,84 177,84 194,58"
        fill="currentColor"
        stroke="none"
        opacity="0.8"
      />
    </svg>
  );
}

/** Candado de las tarjetas bloqueadas. */
function LockIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="lock-icon" aria-hidden="true">
      <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Datos del catálogo                                                  */
/* ------------------------------------------------------------------ */

interface CatalogGame {
  id: string;
  /** Solo para los que aún no existen: los instalados dicen su nombre solos. */
  title: string;
  tagline: string;
  /**
   * La ficha de la caja, SOLO para los juegos que aún no existen.
   *
   * Un juego instalado la trae en su manifiesto y esta se ignora — no se
   * combinan, y esa es toda la gracia: mezclarlas dejaría a la portada capaz de
   * contradecir al juego, que es de lo que se viene huyendo. Aquí abajo solo
   * hay ficha donde no hay manifiesto que la tenga.
   */
  ficha?: FichaDeCatalogo;
  /** La invitación a entrar. Cada casa recibe a su manera. */
  cta: string;
  /** Paleta propia de la tarjeta vía variables CSS */
  palette: CSSProperties;
  art: ReactElement;
}

const GAMES: readonly CatalogGame[] = [
  {
    id: 'cluedo',
    title: 'CLUEDO',
    tagline: 'Un asesinato en la mansión. Los invitados son los sospechosos.',
    cta: 'Entrar en la mansión →',
    palette: {
      '--card-bg1': 'var(--felt-900)',
      '--card-bg2': 'var(--felt-700)',
      '--card-accent': '#dfc06a',
      '--card-glow': 'rgba(201, 162, 39, 0.45)',
    } as CSSProperties,
    art: <ArtCluedo />,
  },
  {
    id: 'dragones',
    title: 'Dungeons & Dragons',
    tagline: 'Mazmorras, dragones y una campaña tejida a medida del grupo.',
    /*
     * SIN MANIFIESTO TODAVÍA, así que su ficha vive aquí. El día que se instale
     * se la lleva consigo y esto sobra: la portada dejará de saber nada de él,
     * que es lo correcto.
     */
    ficha: {
      duracionMinutos: 180,
      edadMinima: 8,
      dificultad: 2,
      jugadoresMinimo: 3,
      jugadoresMaximo: 6,
      modo: 'en-vivo-y-online',
      temas: ['rol', 'fantasía', 'mazmorras', 'dragones', 'campaña', 'aventura'],
    },
    cta: 'Bajar a la mazmorra →',
    palette: {
      '--card-bg1': '#230b09',
      '--card-bg2': '#5a1e12',
      '--card-accent': '#e2763f',
      '--card-glow': 'rgba(226, 118, 63, 0.35)',
    } as CSSProperties,
    art: <ArtDragons />,
  },
  {
    id: 'momia',
    title: 'El Misterio de la Momia',
    tagline: 'El sello está roto. Alguien de la expedición lo quiso así.',
    cta: 'Bajar a la tumba →',
    /*
     * La ficha lleva la paleta del juego, no una paleta cualquiera: la noche de
     * lapislázuli detrás y el oro viejo delante son los mismos valores con los
     * que se pinta su taller (`styles/temas.css`). Que la tarjeta prometa lo que
     * hay al otro lado es media promesa cumplida antes de pulsarla.
     */
    palette: {
      /*
       * Noche fuera, lámpara dentro: el degradado sale caliente del centro
       * —la arenisca iluminada— y se apaga en el azul de la noche del
       * desierto. Se probó con el lapislázuli también fuera y la ficha se
       * confundía con la de Harry Potter, que es azul marino y oro: dos
       * tarjetas iguales en la misma estantería no las distingue nadie.
       */
      '--card-bg1': '#e4d7386e',
      '--card-bg2': '#5b4622',
      '--card-accent': '#e8cf9a',
      '--card-glow': 'rgba(216, 180, 106, 0.42)',
    } as CSSProperties,
    art: <ArtMummy />,
  },
  {
    id: 'sombras',
    title: 'El Paso de las Sombras',
    tagline: 'Honnō-ji arde. Antes del alba hay que cruzar Iga, y uno de los que guían cobra de Akechi.',
    cta: 'Salir de Sakai →',
    /*
     * La ficha lleva la paleta del juego, no una paleta cualquiera: la noche del
     * monte detrás y el acero de la luna delante son los mismos valores con los
     * que se pinta su taller (`styles/temas.css`). Que la tarjeta prometa lo que
     * hay al otro lado es media promesa cumplida antes de pulsarla.
     *
     * Y ES LA ÚNICA FICHA FRÍA DE LA ESTANTERÍA, a propósito. Las otras tres
     * abiertas son doradas —candelabro, oro de tumba, oro de castillo— y una
     * cuarta dorada se habría perdido entre ellas. Aquí el acento es acero y el
     * único calor es el punto de bermellón del sello, que es exactamente lo que
     * pasa dentro del juego.
     */
    palette: {
      '--card-bg1': '#070a12',
      '--card-bg2': '#22304a',
      '--card-accent': '#c3d0e0',
      '--card-glow': 'rgba(147, 167, 192, 0.38)',
    } as CSSProperties,
    art: <ArtSombras />,
  },
  {
    id: 'nudo',
    title: 'El Nudo de Valdehierro',
    /*
     * AQUÍ EL LEMA Y LA FRASE DE LA FICHA SON EL MISMO TEXTO, como en la Momia
     * y por la misma razón: la frase de la estantería tiene que explicar a qué
     * se juega, y el lema del manifiesto ya lo explica mejor de lo que lo haría
     * cualquier segunda frase escrita aparte. Dice el desastre, dice el reloj y
     * dice cuánto queda; no sobra nada y no falta nada.
     */
    tagline: 'Ardió el cuadro de marchas y seis convoyes vienen rodando. Quedan seis franjas para rehacerlo.',
    /*
     * DOCE Y NO DIEZ, que es el tope de los otros dos juegos en vivo. Los cuatro
     * oficios se reparten con repetición y los puestos son habitaciones de la
     * casa: una mesa grande aquí no rompe nada, solo hace que en la garita haya
     * dos personas discutiendo la misma maniobra, que es lo que pasa de verdad
     * en un turno de noche.
     */
    cta: 'Entrar de turno →',
    /*
     * La ficha lleva la paleta del juego, no una paleta cualquiera: el azul de
     * hulla detrás y el ámbar de bombilla delante son los mismos valores con
     * los que se pinta su taller (`styles/temas.css`). Que la tarjeta prometa
     * lo que hay al otro lado es media promesa cumplida antes de pulsarla.
     *
     * EL ACENTO VUELVE A SER CÁLIDO Y NO CONTRADICE LO QUE DICE LA FICHA DE LAS
     * SOMBRAS AHÍ ARRIBA. Aquello era sobre el oro: tres tarjetas doradas
     * seguidas se leen como el mismo producto tres veces. Esto no es oro, es
     * LUZ —un filamento de veinticinco vatios— y se nota en el fondo, que es lo
     * que de verdad separa dos fichas en una estantería: la de Harry Potter es
     * azul marino y esta es negra con una idea de azul. Al lado se distinguen.
     */
    palette: {
      '--card-bg1': '#0d1219',
      '--card-bg2': '#1b212a',
      '--card-accent': '#d9a648',
      '--card-glow': 'rgba(217, 166, 72, 0.38)',
    } as CSSProperties,
    art: <ArtNudo />,
  },
  {
    id: 'potter',
    title: 'Harry Potter',
    tagline: 'Hechizos, casas rivales y secretos en los pasillos del castillo.',
    /* Sin manifiesto todavía: su ficha vive aquí, como la de Dungeons & Dragons. */
    ficha: {
      duracionMinutos: 180,
      edadMinima: 8,
      dificultad: 2,
      jugadoresMinimo: 4,
      jugadoresMaximo: 12,
      modo: 'en-vivo-y-online',
      temas: ['magia', 'castillo', 'casas', 'hechizos', 'fantasía', 'colegio'],
    },
    cta: 'Cruzar el andén →',
    palette: {
      '--card-bg1': '#0b1130',
      '--card-bg2': '#1c2c60',
      '--card-accent': '#e8cf7f',
      '--card-glow': 'rgba(130, 160, 255, 0.35)',
    } as CSSProperties,
    art: <ArtWizard />,
  },
];

/* ------------------------------------------------------------------ */
/* Animaciones                                                         */
/* ------------------------------------------------------------------ */

const gridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.55 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 42, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function CatalogPage() {
  const navigate = useNavigate();

  // La portada es de la casa, no de ningún juego: si se llega aquí desde una
  // partida de la Momia, hay que devolver el tema de GameMasters. Sin esto, el
  // catálogo se quedaría pintado del último juego que se abrió.
  useTemaDeJuego(undefined);

  // Se abre el juego que se pulsa, no «el» juego. Y lo que decide si una
  // tarjeta está bloqueada ya no es un booleano escrito a mano, sino si ese
  // juego está instalado de verdad: el candado no puede mentir.
  const instalados = new Set(juegosInstalados().map((j) => j.id));
  const abrir = (id: string) => navigate(`/${id}`);

  const [criterios, setCriterios] = useState<Criterios>(SIN_CRITERIOS);
  const pedidos = cuantosCriterios(criterios);

  /*
   * La estantería, ya resuelta: cada caja con su nombre de verdad, su ficha de
   * verdad y su candado de verdad, antes de que nadie la ordene.
   *
   * `useMemo` no es aquí una optimización de manual: `repartir` ordena, y
   * ordenar sobre una lista que se vuelve a construir en cada tecleo haría que
   * las tarjetas se remontaran mientras se escribe en el buscador. Con las
   * identidades estables, React mueve los mismos nodos en vez de crearlos otra
   * vez, que es lo que deja que la animación de colocación se vea.
   */
  const estanteria = useMemo(
    () =>
      GAMES.map((game) => {
        const manifiesto = manifiestoSiExiste(game.id);
        // Bloqueado = no instalado. Antes era un booleano escrito a mano que
        // podía desmentir a la realidad.
        const cerrado = !instalados.has(game.id);
        /*
         * El NOMBRE lo dice el juego: es su identidad y no puede haber dos.
         * La FRASE de la ficha, en cambio, se queda aquí, y no por descuido.
         * Son dos textos distintos con dos trabajos distintos: el lema del
         * manifiesto es un gancho que se lee dentro del juego («Alguien de
         * esta casa miente»), y esta frase tiene que explicar en una línea a
         * qué se juega, que es lo que hace falta en una estantería con cuatro
         * cajas. En la Momia coinciden porque su lema ya explicaba mejor el
         * juego que cualquier frase que se pudiera escribir aparte.
         */
        const titulo = cerrado ? game.title : (manifiesto?.nombre ?? game.title);
        /*
         * INSTALADO: MANDA SU MANIFIESTO, Y SIN MEZCLAR. El respaldo de la
         * portada solo entra donde no hay manifiesto —los dos juegos que aún no
         * existen—. Combinarlos dejaría a la portada capaz de completar lo que
         * un juego calla, y entonces la tarjeta afirmaría cosas que el juego no
         * ha dicho: es el mismo agujero por el que se coló el «próximamente» de
         * la Momia cuando ya se podía jugar.
         *
         * El mínimo de personas se pega aquí porque en el manifiesto no vive en
         * la ficha sino en la categoría de personas, que es donde de verdad
         * impide generar una partida.
         */
        const ficha: FichaDeCatalogo = manifiesto
          ? { ...(manifiesto.ficha ?? {}), jugadoresMinimo: jugadoresMinimoDe(manifiesto) }
          : (game.ficha ?? {});
        return { ...game, cerrado, titulo, lema: game.tagline, ficha };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { encajan, resto } = useMemo(
    () => repartir(estanteria, criterios),
    [estanteria, criterios],
  );

  const onCardKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const id = event.currentTarget.getAttribute('data-juego');
      if (id) abrir(id);
    }
  };

  /**
   * Una caja de la estantería.
   *
   * Se pinta con una función y no dos veces en el JSX porque las tarjetas salen
   * en DOS listas —lo que encaja y lo demás— y duplicar treinta líneas de
   * marcado para eso es la forma de que dentro de un mes solo una de las dos
   * tenga el arreglo que se haga.
   *
   * `layout="position"` y no `layout` a secas: cuando el orden cambia, lo único
   * que tiene que moverse es DÓNDE está la tarjeta. Con `layout` entero, framer
   * anima también el tamaño escalando la caja, y una tarjeta escalada durante
   * medio segundo deforma su tipografía y —peor— es una caja de consulta, así
   * que sus `cqi` se recalculan y el texto salta.
   */
  const pintar = (juego: (typeof estanteria)[number]) => {
    const { ficha, cerrado, titulo } = juego;
    const aforo = lineaDeJugadores(
      ficha,
      ficha.modo === undefined ? undefined : NOMBRE_DE_MODO[ficha.modo],
    );
    /*
     * Lo que no se sabe no se escribe. Un juego sin ficha no enseña una línea de
     * guiones ni un «desconocido»: enseña una tarjeta más corta, que es la
     * verdad.
     */
    const datos = [
      duracionEnPalabras(ficha.duracionMinutos),
      ficha.edadMinima === undefined ? undefined : `Desde ${ficha.edadMinima} años`,
      ficha.dificultad === undefined ? undefined : NOMBRE_DE_DIFICULTAD[ficha.dificultad],
    ].filter((x): x is string => Boolean(x));

    return (
      <motion.article
        key={juego.id}
        layout="position"
        className={`catalog-card deco-frame deco-corners ${cerrado ? 'is-locked' : 'is-open'}`}
        style={juego.palette}
        variants={cardVariants}
        whileHover={cerrado ? undefined : { y: -10 }}
        data-juego={juego.id}
        onClick={cerrado ? undefined : () => abrir(juego.id)}
        onKeyDown={cerrado ? undefined : onCardKey}
        role={cerrado ? undefined : 'button'}
        tabIndex={cerrado ? undefined : 0}
        aria-label={cerrado ? `${titulo} (próximamente)` : `Jugar a ${titulo}`}
      >
        <div className="card-art">{juego.art}</div>
        <div className="card-body">
          <h2 className="card-title">{titulo}</h2>
          <p className="card-tagline">{juego.tagline}</p>
          {/*
            EL PIE, EN UN BLOQUE Y NO SUELTO. Es lo que mantiene alineadas las
            invitaciones de una misma fila: el bloque entero baja al fondo de la
            tarjeta con un `margin-top: auto`, así que da igual que un juego
            tenga aforo y otro no — antes ese empujón lo daba la línea de
            jugadores, y una tarjeta sin ella se descolgaba.
          */}
          <div className="card-pie">
            {aforo && <p className="card-players mono-caps">{aforo}</p>}
            {datos.length > 0 && <p className="card-datos mono-caps">{datos.join(' · ')}</p>}
            {cerrado ? (
              <span className="card-coming mono-caps">
                <LockIcon /> Próximamente
              </span>
            ) : (
              <span className="card-cta mono-caps">{juego.cta}</span>
            )}
          </div>
        </div>
        {cerrado && <div className="card-veil" aria-hidden="true" />}
      </motion.article>
    );
  };

  return (
    <div className="catalog">
      <div className="catalog-rays" aria-hidden="true" />

      <header className="catalog-hero">
        <motion.p
          className="catalog-est mono-caps"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.9 }}
        >
          ✦&ensp;Veladas de misterio&ensp;·&ensp;Est. MCMXXVI&ensp;✦
        </motion.p>
        <motion.h1
          className="catalog-title"
          initial={{ opacity: 0, letterSpacing: '0.55em', y: 16 }}
          animate={{ opacity: 1, letterSpacing: '0.16em', y: 0 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        >
          GAMEMASTERS
        </motion.h1>
        <motion.div
          className="ornament-divider catalog-divider"
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.45, duration: 0.8, ease: 'easeOut' }}
        >
          <span aria-hidden="true">❖</span>
        </motion.div>
        <motion.p
          className="catalog-subtitle"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.8 }}
        >
          {/*
            «Un agente» y ya no «un mayordomo»: el mayordomo es de CLUEDO, y en
            la estantería hay ahora una expedición cuyo asistente es un escriba.
            Es la portada de la casa y tiene que valer para los dos.
          */}
          Un agente de inteligencia artificial prepara la trama, reparte los papeles y dirige la
          velada. Usted solo tiene que reunir a los invitados.
        </motion.p>
      </header>

      {/*
        EL BUSCADOR VA AQUÍ Y NO ARRIBA DEL TODO, entre la promesa y la
        estantería. Encima del logotipo sería lo primero que se ve y convertiría
        un cartel en un directorio; debajo de las cajas no lo encontraría nadie.
        Aquí es donde ya se ha leído de qué va esto y todavía no se ha empezado a
        mirar, que es el momento en el que a alguien le apetece acotar.
      */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.68, duration: 0.7 }}
      >
        <BuscadorDeVeladas
          criterios={criterios}
          onCambio={setCriterios}
          encajan={encajan.length}
          total={estanteria.length}
        />
      </motion.div>

      <motion.main
        className="catalog-grid"
        variants={gridVariants}
        initial="hidden"
        animate="visible"
      >
        {encajan.map(pintar)}

        {/*
          EL CORTE. Solo aparece cuando se ha pedido algo y hay algo que no lo
          cumple, y dice cuál de las dos cosas está pasando: que lo de abajo es
          lo demás de la casa, o que no ha encajado nada y lo de abajo es lo que
          más se acerca. Sin este renglón, una estantería reordenada se lee como
          una estantería barajada.
        */}
        {pedidos > 0 && resto.length > 0 && (
          <motion.p layout="position" className="catalog-corte mono-caps">
            <span>
              {encajan.length > 0
                ? 'Lo demás que hay en la casa'
                : 'Nada encaja del todo — esto es lo que más se acerca'}
            </span>
          </motion.p>
        )}

        {resto.map(pintar)}
      </motion.main>

      <footer className="catalog-footer">
        <p className="text-dim text-italic">«Todo gran misterio comienza con una invitación.»</p>
      </footer>
    </div>
  );
}
