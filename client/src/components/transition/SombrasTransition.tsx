/**
 * SombrasTransition — entrar en una partida de El Paso de las Sombras.
 *
 * QUÉ CUENTA, en 2,4 s: hay un farol de papel encendido → alguien lo APAGA de
 * un soplo → queda todo negro un instante → y de la negrura salen la luna, la
 * cresta del monte y un torii. «A partir de aquí se anda a oscuras.»
 *
 * POR QUÉ EXISTE, TENIENDO YA LAS OTRAS DOS. Porque cuentan cosas distintas.
 * Dos puertas de caoba que se abren hacia dentro son una casa que te recibe; dos
 * losas que alguien empuja son un sitio donde no había que entrar. Aquí no se
 * entra en ninguna parte: se SALE, de noche y sin luz, que es exactamente lo que
 * hizo esa columna. Reutilizar cualquiera de las dos y pintarla de azul habría
 * dado justo lo que hay que evitar: el mismo juego de otro color.
 *
 * Y ES LA ÚNICA DE LAS TRES QUE VA DE MÁS LUZ A MENOS. Las otras abren algo y
 * dentro hay claridad; esta apaga lo único que había. El efecto en la mesa es
 * inmediato y no hace falta explicarlo.
 *
 * EL DIBUJO ES SVG Y NO TIPOGRAFÍA. Aquí no hace tanta falta como en la Momia
 * —los kanji sí están en casi todos los sistemas— pero un torii dibujado se
 * puede iluminar por un lado y ensombrecer por otro, y un carácter no. La luz
 * que llega de la luna es la mitad de lo que vende la escena.
 */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '../../styles/transicion-sombras.css';

interface SombrasTransitionProps {
  active: boolean;
  onComplete: () => void;
}

/** Duración total de la secuencia en milisegundos. */
const TOTAL_MS = 2400;

export default function SombrasTransition({
  active,
  onComplete,
}: SombrasTransitionProps): JSX.Element {
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(onComplete, TOTAL_MS);
    return () => window.clearTimeout(t);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="ts-velo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          {/* ---- El halo del farol: lo único cálido, y dura poco ---- */}
          <motion.div
            className="ts-halo"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1, 1.05, 0.2] }}
            transition={{ duration: 1.35, times: [0, 0.25, 0.7, 1], ease: 'easeOut' }}
          />

          {/* ---- El farol ---- */}
          <motion.svg
            className="ts-farol"
            viewBox="0 0 120 190"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -6] }}
            transition={{ duration: 1.45, times: [0, 0.2, 0.7, 1] }}
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* El asa y la varilla de la que cuelga. */}
              <path d="M60 6v16" />
              <path d="M42 22h36" />
              {/* El papel: los aros del chōchin, que es lo que lo hace reconocible. */}
              <path d="M60 22c-22 0-30 16-30 40s8 44 30 44 30-20 30-44-8-40-30-40z" />
              <path d="M33 46h54M30 66h60M30 86h60M34 106h52" opacity="0.55" />
              {/* El aro de abajo. */}
              <path d="M46 128h28" />
            </g>
            {/* La llama, que es lo que se apaga. */}
            <motion.path
              d="M60 84c5-6 6-12 2-18-1 6-5 7-7 3-4 6-3 12 5 15z"
              className="ts-llama"
              animate={{ opacity: [1, 1, 0], scaleY: [1, 1.08, 0.1] }}
              transition={{ duration: 1.3, times: [0, 0.62, 0.78] }}
              style={{ transformOrigin: '60px 90px' }}
            />
            {/* El humo, un segundo después. */}
            <motion.path
              d="M60 70c-4-8 4-12 0-20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="ts-humo"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 0.5, 0], y: [0, -22, -40] }}
              transition={{ duration: 0.9, delay: 1.02 }}
            />
          </motion.svg>

          {/* ---- Y de la negrura, el monte ---- */}
          <motion.svg
            className="ts-monte"
            viewBox="0 0 1200 420"
            preserveAspectRatio="xMidYMax slice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 1.25 }}
          >
            {/* La luna: fría, alta y hueca. Es lo contrario del farol. */}
            <motion.g
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.35, ease: 'easeOut' }}
            >
              <circle className="ts-luna" cx="930" cy="96" r="46" />
              <circle className="ts-luna-halo" cx="930" cy="96" r="76" />
            </motion.g>

            {/* Dos crestas, la de detrás más pálida: es lo que da profundidad. */}
            <motion.path
              className="ts-cresta ts-cresta--lejos"
              d="M0 300 L120 246 L210 282 L330 200 L430 268 L540 214 L660 286 L780 232 L900 288 L1020 240 L1120 292 L1200 258 L1200 420 L0 420 Z"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.4 }}
            />
            <motion.path
              className="ts-cresta"
              d="M0 348 L160 296 L280 336 L400 268 L520 330 L640 288 L760 340 L880 300 L1000 344 L1120 306 L1200 340 L1200 420 L0 420 Z"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.5 }}
            />

            {/* El torii, en primer plano y a contraluz. */}
            <motion.g
              className="ts-torii"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.65, ease: 'easeOut' }}
            >
              <rect x="248" y="188" width="230" height="16" rx="6" />
              <rect x="272" y="226" width="182" height="11" />
              <rect x="292" y="200" width="16" height="220" />
              <rect x="418" y="200" width="16" height="220" />
              <rect x="356" y="204" width="14" height="24" />
            </motion.g>
          </motion.svg>

          {/* ---- La frase ---- */}
          <motion.div
            className="ts-lema"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.75 }}
          >
            <span className="ts-lema-kanji">影の道</span>
            <span className="ts-lema-texto">A partir de aquí se anda a oscuras</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
