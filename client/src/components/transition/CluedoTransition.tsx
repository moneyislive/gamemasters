/**
 * CluedoTransition — overlay cinematográfico de entrada al miniverso CLUEDO.
 * Secuencia (~2.2 s): fundido a negro → dos puertas de caoba con pomos dorados
 * se abren hacia los lados revelando una luz cálida → "CLUEDO" en Cinzel
 * Decorative con tracking animado mientras una lupa barre el título → humo.
 * Solo transform/opacity: nada de layout thrash.
 */
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '../../styles/transition.css';

interface CluedoTransitionProps {
  active: boolean;
  onComplete: () => void;
}

/** Duración total de la secuencia en milisegundos. */
const TOTAL_MS = 2250;

/** Lupa dorada que barre el título. */
function LensSvg(): ReactElement {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <g fill="none" stroke="var(--gold-400)" strokeLinecap="round">
        <circle cx="52" cy="52" r="34" strokeWidth="6" />
        <circle cx="52" cy="52" r="26" strokeWidth="1.5" opacity="0.45" />
        <path d="M36 40a22 22 0 0 1 12-9" strokeWidth="3" opacity="0.6" />
        <path d="M77 77l26 26" strokeWidth="10" />
      </g>
      {/* Cristal con un leve reflejo cálido */}
      <circle cx="52" cy="52" r="30" fill="rgba(247, 216, 140, 0.08)" />
    </svg>
  );
}

export default function CluedoTransition({ active, onComplete }: CluedoTransitionProps) {
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(onComplete, TOTAL_MS);
    return () => window.clearTimeout(timer);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="ct"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeIn' } }}
          aria-hidden="true"
        >
          {/* Luz cálida que espera tras las puertas */}
          <motion.div
            className="ct-light"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 1,
              scale: 1.12,
              transition: { delay: 0.55, duration: 1.35, ease: 'easeOut' },
            }}
          />

          {/* Título y lupa */}
          <div className="ct-stage">
            <motion.h1
              className="ct-title"
              initial={{ opacity: 0, letterSpacing: '0.9em', scale: 0.92 }}
              animate={{
                opacity: 1,
                letterSpacing: '0.3em',
                scale: 1,
                transition: { delay: 0.85, duration: 1.05, ease: [0.22, 1, 0.36, 1] },
              }}
            >
              CLUEDO
            </motion.h1>
            <motion.p
              className="ct-sub mono-caps"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.85, y: 0, transition: { delay: 1.35, duration: 0.5 } }}
            >
              Un misterio de GameMasters
            </motion.p>
            <motion.div
              className="ct-lens"
              initial={{ x: '-26vw', rotate: -8, opacity: 0 }}
              animate={{
                x: '26vw',
                rotate: 6,
                opacity: [0, 1, 1, 0],
                transition: { delay: 1.05, duration: 1.05, ease: 'easeInOut' },
              }}
            >
              <LensSvg />
            </motion.div>
          </div>

          {/* Puertas de caoba */}
          <div className="ct-doors">
            <motion.div
              className="ct-door ct-door--left"
              initial={{ rotateY: 0 }}
              animate={{
                rotateY: -96,
                transition: { delay: 0.5, duration: 1.25, ease: [0.7, 0, 0.3, 1] },
              }}
            >
              <div className="ct-door-inner">
                <span className="ct-panel" />
                <span className="ct-panel ct-panel--tall" />
                <span className="ct-panel" />
              </div>
              <span className="ct-knob" />
            </motion.div>
            <motion.div
              className="ct-door ct-door--right"
              initial={{ rotateY: 0 }}
              animate={{
                rotateY: 96,
                transition: { delay: 0.5, duration: 1.25, ease: [0.7, 0, 0.3, 1] },
              }}
            >
              <div className="ct-door-inner">
                <span className="ct-panel" />
                <span className="ct-panel ct-panel--tall" />
                <span className="ct-panel" />
              </div>
              <span className="ct-knob" />
            </motion.div>
          </div>

          {/* Humo bajo y viñeta */}
          <motion.div
            className="ct-smoke ct-smoke--a"
            initial={{ x: '-8%', opacity: 0 }}
            animate={{
              x: '8%',
              opacity: [0, 0.55, 0.3],
              transition: { delay: 0.7, duration: 1.55, ease: 'easeOut' },
            }}
          />
          <motion.div
            className="ct-smoke ct-smoke--b"
            initial={{ x: '8%', opacity: 0 }}
            animate={{
              x: '-8%',
              opacity: [0, 0.4, 0.22],
              transition: { delay: 0.9, duration: 1.35, ease: 'easeOut' },
            }}
          />
          <div className="ct-vignette" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
