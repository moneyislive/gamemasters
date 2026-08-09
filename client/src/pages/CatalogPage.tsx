/**
 * CatalogPage — portada de GameMasters.
 * Catálogo de juegos: CLUEDO disponible y otros títulos bloqueados "próximamente".
 * Todo el arte es tipográfico / SVG inline: sin imágenes externas.
 */
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { juegosInstalados } from '../../../shared/juegos';
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
  title: string;
  tagline: string;
  players: string;
  locked: boolean;
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
    locked: false,
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
    locked: true,
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
    tagline: 'Una expedición, un sarcófago abierto y una maldición que despierta.',
    players: '4 – 10 jugadores',
    locked: true,
    palette: {
      '--card-bg1': '#241b0c',
      '--card-bg2': '#5c4720',
      '--card-accent': '#57cfc2',
      '--card-glow': 'rgba(87, 207, 194, 0.32)',
    } as CSSProperties,
    art: <ArtMummy />,
  },
  {
    id: 'potter',
    title: 'Harry Potter',
    tagline: 'Hechizos, casas rivales y secretos en los pasillos del castillo.',
    players: '4 – 12 jugadores',
    locked: true,
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
          Un mayordomo de inteligencia artificial prepara la trama, reparte los papeles y
          dirige la velada. Usted solo tiene que reunir a los invitados.
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
          return (
          <motion.article
            key={game.id}
            className={`catalog-card deco-frame deco-corners ${cerrado ? 'is-locked' : 'is-open'}`}
            style={game.palette}
            variants={cardVariants}
            whileHover={game.locked ? undefined : { y: -10 }}
            data-juego={game.id}
            onClick={cerrado ? undefined : () => abrir(game.id)}
            onKeyDown={game.locked ? undefined : onCardKey}
            role={game.locked ? undefined : 'button'}
            tabIndex={game.locked ? undefined : 0}
            aria-label={game.locked ? `${game.title} (próximamente)` : `Jugar a ${game.title}`}
          >
            <div className="card-art">{game.art}</div>
            <div className="card-body">
              <h2 className="card-title">{game.title}</h2>
              <p className="card-tagline">{game.tagline}</p>
              <p className="card-players mono-caps">{game.players}</p>
              {game.locked ? (
                <span className="card-coming mono-caps">
                  <LockIcon /> Próximamente
                </span>
              ) : (
                <span className="card-cta mono-caps">Entrar en la mansión →</span>
              )}
            </div>
            {game.locked && <div className="card-veil" aria-hidden="true" />}
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
