/**
 * `<Ciudad>`: la ciudad montada en una escena de r3f. Todo el trabajo está en `ciudad.ts`; esto la
 * construye cuando cambia el plano o el nivel, la libera al desmontar y le da cada fotograma la
 * cámara y el tiempo del ADORNO.
 *
 * El tiempo lo pone quien monta (`reloj`): el juego le pasa el reloj de la presentación, que el
 * Remanso frena a ×0,3 (diseño §4.4) y con él las ondas de los charcos, los parpadeos y la lluvia.
 * Sin `reloj`, el del lienzo.
 */
import { useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import type { CiudadConstruida } from './construir';
import { construirLaCiudad } from './construir';
import type { NivelDeLaCiudad, PlanoDeLaCiudad } from './tipos';

export interface PropsDeLaCiudad {
  readonly plano: PlanoDeLaCiudad;
  readonly nivel: NivelDeLaCiudad;
  /** El tiempo del adorno, en segundos. */
  readonly reloj?: () => number;
  /**
   * El tic del barrio (20 Hz) con el que se mueve el tren: el de la sala, para que todos los
   * aparatos lo vean pasar a la vez. Sin él, el del reloj del adorno.
   */
  readonly tic?: () => number;
  /** Avisa con la ciudad recién construida (el banco mira sus piezas y sus fuentes). */
  readonly alConstruir?: (ciudad: CiudadConstruida) => void;
}

export function Ciudad({ plano, nivel, reloj, tic, alConstruir }: PropsDeLaCiudad): JSX.Element {
  const ciudad = useMemo(() => construirLaCiudad(plano, nivel), [plano, nivel]);
  useEffect(() => {
    alConstruir?.(ciudad);
    return () => ciudad.liberar();
  }, [ciudad, alConstruir]);
  useFrame((estado) => {
    const t = reloj !== undefined ? reloj() : estado.clock.elapsedTime;
    ciudad.actualizar(estado.camera, t, tic !== undefined ? tic() : t * 20);
  });
  return <primitive object={ciudad.grupo} />;
}
