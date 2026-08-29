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
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { juegosInstalados, manifiestoDe } from '../../../shared/juegos';
import { useTemaDeJuego } from '../lib/tema';
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
  players: string;
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
    players: '3 – 8 jugadores · En vivo',
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
    players: '3 – 6 jugadores',
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
    players: '4 – 10 jugadores · En vivo',
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
    players: '4 – 10 jugadores · En vivo',
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
    id: 'potter',
    title: 'Harry Potter',
    tagline: 'Hechizos, casas rivales y secretos en los pasillos del castillo.',
    players: '4 – 12 jugadores',
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

  const onCardKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const id = event.currentTarget.getAttribute('data-juego');
      if (id) abrir(id);
    }
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

      <motion.main
        className="catalog-grid"
        variants={gridVariants}
        initial="hidden"
        animate="visible"
      >
        {GAMES.map((game) => {
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
          const titulo = cerrado ? game.title : manifiestoDe(game.id).nombre;
          return (
          <motion.article
            key={game.id}
            className={`catalog-card deco-frame deco-corners ${cerrado ? 'is-locked' : 'is-open'}`}
            style={game.palette}
            variants={cardVariants}
            whileHover={cerrado ? undefined : { y: -10 }}
            data-juego={game.id}
            onClick={cerrado ? undefined : () => abrir(game.id)}
            onKeyDown={cerrado ? undefined : onCardKey}
            role={cerrado ? undefined : 'button'}
            tabIndex={cerrado ? undefined : 0}
            aria-label={cerrado ? `${titulo} (próximamente)` : `Jugar a ${titulo}`}
          >
            <div className="card-art">{game.art}</div>
            <div className="card-body">
              <h2 className="card-title">{titulo}</h2>
              <p className="card-tagline">{game.tagline}</p>
              <p className="card-players mono-caps">{game.players}</p>
              {cerrado ? (
                <span className="card-coming mono-caps">
                  <LockIcon /> Próximamente
                </span>
              ) : (
                <span className="card-cta mono-caps">{game.cta}</span>
              )}
            </div>
            {cerrado && <div className="card-veil" aria-hidden="true" />}
          </motion.article>
          );
        })}
      </motion.main>

      <footer className="catalog-footer">
        <p className="text-dim text-italic">«Todo gran misterio comienza con una invitación.»</p>
      </footer>
    </div>
  );
}
