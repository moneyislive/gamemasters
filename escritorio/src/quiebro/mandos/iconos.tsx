/**
 * LOS ICONOS DE LOS BOTONES DE LA PELEA (`docs/quiebro/EL-RAYO.md` §3, «Botones»): propios, en SVG, y en el MISMO
 * lenguaje que la mira del rayo —trazo fino y redondeado, blanco cálido con un acento ámbar—, para que el mando se
 * lea como una sola pieza y no como un surtido de pictogramas. Nada de emoji ni de marcas: dibujados aquí.
 *
 *   · GOLPE: un puño de frente (los cuatro nudillos, el pulgar cruzado) con el arco del impacto.
 *   · QUIEBRO: el quiebro lateral —sube y se va de lado— con su estela.
 *   · EMPELLÓN: dos chevrones que empujan contra una pared.
 *   · USAR: la mano abierta.
 *   · RAYO: tres trazos que convergen en un punto, como las marcas de la mira, con la chispa en el centro.
 *   · AVISO: la señal que llama (un punto y dos ondas).
 *
 * Todos en una caja de 48 × 48, con `currentColor` para el trazo (el botón decide el color y lo apaga en la
 * recarga) y la clase `acento` para lo ámbar. Sin filtros ni degradados: cuestan en N0 y no se ven a 30 px.
 */
import type { JSX } from 'react';

export type IconoDeBoton = 'golpe' | 'quiebro' | 'empellon' | 'usar' | 'rayo' | 'aviso';

const TRAZO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function Golpe(): JSX.Element {
  return (
    <>
      {/* Los cuatro dedos doblados (los nudillos arriba). */}
      <path {...TRAZO} d="M12.5 22.5v-4.2a2.9 2.9 0 0 1 5.8 0v3.2M18.3 20.2v-4.6a2.9 2.9 0 0 1 5.8 0v4.9M24.1 20.5v-4.3a2.9 2.9 0 0 1 5.8 0v5M29.9 21.2v-2.6a2.9 2.9 0 0 1 5.8 0v7.8" />
      {/* El dorso y la muñeca. */}
      <path {...TRAZO} d="M12.5 22.5v4.3c0 5.7 4 9.7 9.8 9.7h3.9c5.6 0 9.5-4.1 9.5-10.1" />
      {/* El pulgar, cruzado bajo los dedos. */}
      <path {...TRAZO} d="M12.6 25.2c3.4-1.5 7.9-1.3 11.4 0.9" />
      {/* El arco del impacto, arriba a la derecha. */}
      <path className="acento" fill="none" strokeWidth={2.2} strokeLinecap="round" d="M35.8 7.6a15.5 15.5 0 0 1 6.6 8.9M40.3 6.1l1.9-2.3M43.7 11.2l2.6-1" />
    </>
  );
}

/** Una figura que se echa de lado: cabeza, tronco inclinado, brazos y piernas abiertas. */
const FIGURA = 'M27.6 16.4l-4.8 11.2M19.6 19.4l7.4-1.4 5.6 4.4M22.8 27.6l6.6 5.2 1.4 7.2M22.8 27.6l-5 5.6-5.6 1.6';

function Quiebro(): JSX.Element {
  return (
    <>
      {/* La estela: la misma figura, atrás y apagándose (el quiebro va más rápido que el ojo). */}
      <g opacity={0.22} transform="translate(-9 1)">
        <circle cx="30.6" cy="11.4" r="3.4" fill="none" stroke="currentColor" strokeWidth={2.2} />
        <path fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" d={FIGURA} />
      </g>
      <g opacity={0.45} transform="translate(-4.5 0.5)">
        <circle cx="30.6" cy="11.4" r="3.4" fill="none" stroke="currentColor" strokeWidth={2.2} />
        <path fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" d={FIGURA} />
      </g>
      <circle cx="30.6" cy="11.4" r="3.4" fill="none" stroke="currentColor" strokeWidth={2.4} />
      <path {...TRAZO} d={FIGURA} />
      {/* Hacia dónde se va: el chevrón del código. */}
      <path className="acento" fill="none" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" d="M38.4 21.5l4.6 4.3-4.6 4.3" />
    </>
  );
}

function Empellon(): JSX.Element {
  return (
    <>
      <path fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} d="M9.5 13.5l9.5 10.5-9.5 10.5" />
      <path {...TRAZO} d="M19.5 13.5l9.5 10.5-9.5 10.5" />
      {/* La pared contra la que se empuja, y el golpe en ella. */}
      <path className="acento" fill="none" strokeWidth={2.8} strokeLinecap="round" d="M36.5 11v26M40.8 17.5l2.8-1.6M40.8 30.5l2.8 1.6M41.5 24h3.2" />
    </>
  );
}

function Usar(): JSX.Element {
  return (
    <>
      <path
        {...TRAZO}
        d="M17.8 26.4V13.2a2.6 2.6 0 0 1 5.2 0v10.4M23 23V10.6a2.6 2.6 0 0 1 5.2 0v12.5M28.2 23.3V12.4a2.6 2.6 0 0 1 5.2 0v13.2M33.4 25.4v-6.9a2.6 2.6 0 0 1 5.2 0v10.2c0 6.9-4.6 11.8-11.2 11.8h-2.1c-4.1 0-6.8-1.8-9.1-5.1l-5.6-8.1a2.7 2.7 0 0 1 4.3-3.2l3.3 3.5"
      />
      <path className="acento" fill="none" strokeWidth={2.2} strokeLinecap="round" d="M9.4 11.6l2.6 2.4M7.6 18.2h3.4M12.6 6.8l1.4 3.1" />
    </>
  );
}

/**
 * El rayo: tres trazos a 120° que convergen en un punto —cada uno acaba en el chevrón de las marcas de la mira—
 * y la chispa blanca donde se juntan.
 */
function Rayo(): JSX.Element {
  const trazo = 'M0 -21.5V-11.8';
  const punta = 'M-4.4 -13.6L0 -8.2L4.4 -13.6';
  return (
    <g transform="translate(24 24.5)">
      {[0, 120, 240].map((a) => (
        <g key={a} transform={`rotate(${String(a)})`}>
          <path fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" opacity={0.5} d={trazo} />
          <path {...TRAZO} strokeWidth={2.8} d={punta} />
        </g>
      ))}
      <path className="acento relleno" d="M0 -5.2L1.3 -1.3L5.2 0L1.3 1.3L0 5.2L-1.3 1.3L-5.2 0L-1.3 -1.3Z" />
    </g>
  );
}

function Aviso(): JSX.Element {
  return (
    <>
      <circle cx="24" cy="24" r="3.2" fill="currentColor" />
      <path {...TRAZO} strokeWidth={2.4} d="M16.6 16.6a10.5 10.5 0 0 0 0 14.8M31.4 16.6a10.5 10.5 0 0 1 0 14.8" />
      <path fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" opacity={0.5} d="M11.4 11.4a17.8 17.8 0 0 0 0 25.2M36.6 11.4a17.8 17.8 0 0 1 0 25.2" />
    </>
  );
}

const DIBUJOS: Readonly<Record<IconoDeBoton, () => JSX.Element>> = {
  golpe: Golpe,
  quiebro: Quiebro,
  empellon: Empellon,
  usar: Usar,
  rayo: Rayo,
  aviso: Aviso,
};

/**
 * EL FILO DE LOS AROS: un ámbar que brilla arriba y se apaga abajo, como un canto de metal con la farola encima.
 * Una sola vez por página (el CSS lo pide con `url(#q-aro-ambar)`); no va en un SVG oculto con `display: none`,
 * que en Chrome deja sin pintar los degradados que tiene dentro.
 */
export function DefinicionesDelAro(): JSX.Element {
  return (
    <svg className="q-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="q-aro-ambar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffdca6" />
          <stop offset="0.45" stopColor="#f2a24a" />
          <stop offset="1" stopColor="#9a541a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** El icono de un botón, a su caja (lo mide el CSS: `.q-tecla .icono`). */
export function Icono({ de }: { readonly de: IconoDeBoton }): JSX.Element {
  const Dibujo = DIBUJOS[de];
  return (
    <svg className={`icono icono-${de}`} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <Dibujo />
    </svg>
  );
}
