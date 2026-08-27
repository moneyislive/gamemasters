/**
 * MomiaTransition — entrar en una partida de El Misterio de la Momia.
 *
 * QUÉ CUENTA, en 2,4 s: el sello de la tumba está intacto → se quiebra → las
 * dos losas se DESPLAZAN (no giran: son de piedra) → cae arena por la grieta →
 * dentro hay una lámpara encendida y una inscripción.
 *
 * POR QUÉ EXISTE, TENIENDO YA LA DE CLUEDO. Porque la de CLUEDO cuenta otra
 * cosa: dos puertas de caoba que se abren hacia dentro son una casa que te
 * recibe. Aquí se entra donde no había que entrar, y eso son dos toneladas de
 * piedra que alguien empuja. Reutilizar la animación y pintarla de arena habría
 * dado justo lo que el encargo pedía evitar: CLUEDO de otro color.
 *
 * LOS JEROGLÍFICOS SON SVG Y NO LETRAS, y no es un capricho: los caracteres del
 * bloque Unicode de jeroglíficos egipcios dependen de que el sistema tenga una
 * fuente que los cubra (en Windows, Segoe UI Historic). Donde no la haya, la
 * velada se abriría con una columna de cuadrados vacíos. Dibujados a mano se ven
 * igual en todas partes, y además se pueden grabar en bajorrelieve con una luz
 * arriba y una sombra abajo, que es lo que hace que parezcan talla.
 */
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '../../styles/transicion-momia.css';

interface MomiaTransitionProps {
  active: boolean;
  onComplete: () => void;
}

/** Duración total de la secuencia en milisegundos. */
const TOTAL_MS = 2400;

/**
 * Ocho signos, dibujados en un lienzo de 40×40 para que se apilen parejos.
 *
 * No pretenden decir nada: una columna con una frase real en egipcio medio
 * sería mejor, pero exigiría transliterar bien y aquí nadie puede revisarlo.
 * Antes que fingir una erudición que no hay, son signos reconocibles puestos
 * con ritmo.
 */
const JEROGLIFICOS: ReactElement[] = [
  // Anj: la vida.
  <g key="anj">
    <path d="M20 17c-4 0-7-3-7-7s3-6 7-6 7 2 7 6-3 7-7 7z" />
    <path d="M20 17v19M11 23h18" />
  </g>,
  // Agua: la línea quebrada.
  <g key="agua">
    <path d="M6 20q3.5-5 7 0t7 0t7 0t7 0" />
    <path d="M6 28q3.5-5 7 0t7 0t7 0t7 0" />
  </g>,
  // Ojo de Horus, simplificado.
  <g key="ojo">
    <path d="M7 20q13-10 26 0q-13 10-26 0z" />
    <circle cx="20" cy="20" r="4" />
    <path d="M20 28v5M20 33l-6 5" />
  </g>,
  // Pluma de Maat: la verdad.
  <g key="pluma">
    <path d="M20 36V9c0-3 5-4 6-1 2 6 1 14-6 20z" />
    <path d="M20 15c-4 2-6 6-6 10" />
  </g>,
  // Disco solar con sus rayos.
  <g key="sol">
    <circle cx="20" cy="20" r="8" />
    <path d="M20 6V2M20 38v-4M34 20h4M2 20h4M29 11l3-3M8 32l3-3M29 29l3 3M8 8l3 3" />
  </g>,
  // Escarabajo.
  <g key="escarabajo">
    <ellipse cx="20" cy="23" rx="8" ry="11" />
    <path d="M20 12v22M12 17l-5-4M28 17l5-4M12 29l-5 4M28 29l5 4" />
    <circle cx="20" cy="8" r="3" />
  </g>,
  // Caña: el junco del Nilo.
  <g key="cana">
    <path d="M20 36V12" />
    <path d="M20 12q-8-2-8-8q8 0 8 8z" />
    <path d="M20 20q7-2 7-7" />
  </g>,
  // Vasija de ofrenda.
  <g key="vasija">
    <path d="M12 14h16l-2 18q-6 3-12 0z" />
    <path d="M10 10h20" />
  </g>,
];

/** Una columna de signos, tallada en la cara de una losa. */
function ColumnaDeJeroglificos({ desde }: { desde: number }): ReactElement {
  return (
    <div className="mt-jeros" aria-hidden="true">
      {JEROGLIFICOS.map((_, i) => (
        <svg key={i} viewBox="0 0 40 40" width="34" height="34">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {JEROGLIFICOS[(i + desde) % JEROGLIFICOS.length]}
          </g>
        </svg>
      ))}
    </div>
  );
}

/** El sello de arcilla que llevaba tres mil años sin tocarse. */
function SelloSvg(): ReactElement {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <g fill="none" stroke="var(--gold-400)" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="60" cy="60" r="46" strokeWidth="4" />
        <circle cx="60" cy="60" r="37" strokeWidth="1.6" opacity="0.55" />
        {/* La cuerda que cruzaba el sello de lado a lado. */}
        <path d="M14 60h92" strokeWidth="3" opacity="0.6" />
        {/* Escarabajo grabado en el centro. */}
        <ellipse cx="60" cy="63" rx="15" ry="20" strokeWidth="3" />
        <path d="M60 43v40M45 54l-12-8M75 54l12-8M45 74l-12 8M75 74l12 8" strokeWidth="2.6" />
        <circle cx="60" cy="38" r="6" strokeWidth="3" />
      </g>
      <circle cx="60" cy="60" r="46" fill="rgba(216, 180, 106, 0.07)" />
    </svg>
  );
}

export default function MomiaTransition({ active, onComplete }: MomiaTransitionProps) {
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(onComplete, TOTAL_MS);
    return () => window.clearTimeout(timer);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="mt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeIn' } }}
          aria-hidden="true"
        >
          {/* La lámpara que espera dentro */}
          <motion.div
            className="mt-luz"
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{
              opacity: 1,
              scale: 1.14,
              transition: { delay: 0.62, duration: 1.4, ease: 'easeOut' },
            }}
          />

          {/* La inscripción y el barrido de la lámpara */}
          <div className="mt-stage">
            <motion.h1
              className="mt-title"
              initial={{ opacity: 0, letterSpacing: '0.72em', scale: 0.94 }}
              animate={{
                opacity: 1,
                letterSpacing: '0.2em',
                scale: 1,
                transition: { delay: 0.95, duration: 1.1, ease: [0.22, 1, 0.36, 1] },
              }}
            >
              EL MISTERIO DE LA MOMIA
            </motion.h1>
            <motion.p
              className="mt-sub mono-caps"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.85, y: 0, transition: { delay: 1.45, duration: 0.5 } }}
            >
              Una expedición de GameMasters
            </motion.p>
            <motion.div
              className="mt-lampara"
              initial={{ x: '-28vw', opacity: 0 }}
              animate={{
                x: '28vw',
                opacity: [0, 1, 1, 0],
                transition: { delay: 1.1, duration: 1.15, ease: 'easeInOut' },
              }}
            />
          </div>

          {/* Las dos losas: se desplazan, no giran */}
          <div className="mt-losas">
            <motion.div
              className="mt-losa mt-losa--izq"
              initial={{ x: 0 }}
              animate={{
                x: '-101%',
                transition: { delay: 0.62, duration: 1.5, ease: [0.62, 0, 0.28, 1] },
              }}
            >
              <ColumnaDeJeroglificos desde={0} />
            </motion.div>
            <motion.div
              className="mt-losa mt-losa--der"
              initial={{ x: 0 }}
              animate={{
                x: '101%',
                transition: { delay: 0.62, duration: 1.5, ease: [0.62, 0, 0.28, 1] },
              }}
            >
              <ColumnaDeJeroglificos desde={4} />
            </motion.div>
          </div>

          {/*
            El sello. Aguanta quieto medio segundo —el tiempo de que se lea que
            está INTACTO, que es lo que hace que romperlo signifique algo—, da un
            destello y se abre con las losas.
          */}
          <motion.div
            className="mt-sello"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.82, 1, 1.5, 2.4],
              rotate: [0, 0, -7, -16],
              transition: { duration: 1.5, times: [0, 0.22, 0.42, 1], ease: 'easeOut' },
            }}
          >
            <SelloSvg />
          </motion.div>

          {/* Arena cayendo por la grieta, mientras la grieta se ensancha */}
          <motion.div
            className="mt-arena"
            initial={{ opacity: 0, scaleX: 0.1, scaleY: 0.2 }}
            animate={{
              opacity: [0, 0.95, 0.45, 0],
              scaleX: [0.1, 1, 2.2, 3],
              scaleY: [0.2, 1, 1, 1],
              transition: { delay: 0.6, duration: 1.7, ease: 'easeOut' },
            }}
          />

          {/* Polvo levantado: cálido por la lámpara, frío por la noche de fuera */}
          <motion.div
            className="mt-polvo mt-polvo--a"
            initial={{ x: '-7%', opacity: 0 }}
            animate={{
              x: '7%',
              opacity: [0, 0.6, 0.32],
              transition: { delay: 0.8, duration: 1.6, ease: 'easeOut' },
            }}
          />
          <motion.div
            className="mt-polvo mt-polvo--b"
            initial={{ x: '7%', opacity: 0 }}
            animate={{
              x: '-7%',
              opacity: [0, 0.45, 0.24],
              transition: { delay: 1, duration: 1.4, ease: 'easeOut' },
            }}
          />
          <div className="mt-vineta" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
