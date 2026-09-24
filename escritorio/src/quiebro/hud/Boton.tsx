/**
 * EL BOTÓN DEL HUD: actúa al bajar el dedo (o el ratón), y con Intro o Espacio si tiene el foco.
 *
 * ═══ POR QUÉ NO `onClick` ═══
 *
 * `click` llega cuando se LEVANTA el dedo, y en un móvil encima con el retraso del doble toque: medio
 * segundo después de lo que la persona hizo. En una pausa de 15 s eso ya se nota, y en la pelea sería un
 * quiebro tarde. La casa lo prohíbe en los `.tsx` del escritorio (`verify:escritorio`) y el diseño lo
 * dice para todo el Quiebro (§7: «todo actúa en `pointerdown`»). Lo que se pierde —el teclado— se
 * devuelve a mano: Intro y Espacio con el foco hacen lo mismo, para quien juega sin ratón.
 */
import type { JSX, KeyboardEvent, PointerEvent, ReactNode } from 'react';

export interface PropsDelBoton {
  readonly alPulsar: (timeStamp: number) => void;
  readonly children: ReactNode;
  readonly clase?: string;
  readonly desactivado?: boolean;
  readonly etiqueta?: string;
  readonly elegido?: boolean;
}

export function Boton({ alPulsar, children, clase = 'q-boton', desactivado = false, etiqueta, elegido }: PropsDelBoton): JSX.Element {
  const alBajar = (e: PointerEvent<HTMLButtonElement>): void => {
    /* Sólo el botón principal del ratón; un dedo o un lápiz, siempre. */
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (!desactivado) alPulsar(e.timeStamp);
  };
  const alTecla = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    if (!desactivado && !e.repeat) alPulsar(e.timeStamp);
  };
  return (
    <button
      type="button"
      className={elegido === true ? `${clase} elegida` : clase}
      aria-disabled={desactivado}
      aria-pressed={elegido}
      aria-label={etiqueta}
      onPointerDown={alBajar}
      onKeyDown={alTecla}
    >
      {children}
    </button>
  );
}
