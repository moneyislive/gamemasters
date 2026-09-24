/**
 * `<CuerposDelQuiebro>`: LOS CUERPOS DEL JUEGO Y LA GENTE DEL BARRIO, dentro del lienzo del Quiebro.
 *
 * ═══ LO QUE HACE ═══
 *
 * Lee en su `useFrame` (prioridad −1, la de «los efectos y los cuerpos se pintan» de `Quiebro.tsx`) la
 * `FuenteDeCuerpos` que escribe el juego (`cuerpos.ts`) y pinta cada `CuerpoPintado`: su figura, su
 * gesto, su contorno. Pinta además los 48 durmientes de guion con la función pura de
 * `quiebro-durmientes.ts` (el tic de `fuente.ticDeLosDurmientes()`, sin los de `fuente.prestados()`).
 * Todo lo demás vive en `director.ts`, sin React: aquí sólo se monta, se llama y se suelta.
 *
 * ═══ SI ALGO FALLA, EL JUEGO SIGUE ═══
 *
 * `Quiebro.tsx` importa este módulo al cargar. Si el manifiesto viniera roto y esto lanzara al importar,
 * se caería la noche entera, con la ciudad y el HUD. Así que el manifiesto se lee al montar, dentro de
 * un `try`: con él roto no se pinta ningún cuerpo, se dice en la consola una vez con lo que falta, y lo
 * demás sigue. Lo mismo con cada `.glb` (`almacen.ts` apunta el error y el cuerpo espera).
 */
import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import type { Barrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import type { FuenteDeCuerpos } from '../cuerpos';
import { DirectorDeLosPersonajes } from './director';
import { leerElReparto } from './reparto';
import { REPARTO_CRUDO, urlDelRecurso } from './urls';

export interface PropsDeLosCuerpos {
  readonly fuente: FuenteDeCuerpos;
  readonly nivel: 0 | 1 | 2 | 3;
  /** El barrio de la noche, para los durmientes y la ropa de los Prestados (o `null` sin noche). */
  readonly barrio: Barrio | null;
  /** El reloj de presentación de los cuerpos ajenos y del adorno (el Remanso lo frena), en ms. */
  readonly presentado?: (t: number) => number;
  /** Para el banco: el director de este montaje, cuando existe. */
  readonly alDirector?: (director: DirectorDeLosPersonajes | null) => void;
}

const IDENTIDAD = (t: number): number => t;

export function CuerposDelQuiebro({ fuente, nivel, barrio, presentado, alDirector }: PropsDeLosCuerpos): JSX.Element {
  const grupo = useRef<THREE.Group>(null);
  const director = useRef<DirectorDeLosPersonajes | null>(null);
  /* El director vive lo que vive el montaje: el aviso al banco va por referencia, no por dependencia. */
  const avisar = useRef(alDirector);
  avisar.current = alDirector;

  useEffect(() => {
    let d: DirectorDeLosPersonajes;
    try {
      d = new DirectorDeLosPersonajes(leerElReparto(REPARTO_CRUDO), urlDelRecurso);
    } catch (e) {
      console.error(`[quiebro] personajes: no se pinta ningún cuerpo: ${e instanceof Error ? e.message : String(e)}`);
      return undefined;
    }
    director.current = d;
    grupo.current?.add(d.grupo);
    avisar.current?.(d);
    return () => {
      avisar.current?.(null);
      d.liberar();
      director.current = null;
    };
  }, []);

  useEffect(() => {
    director.current?.preparar(nivel);
  }, [nivel]);

  useFrame((estado) => {
    const d = director.current;
    if (d === null) return;
    d.fotograma(fuente, nivel, barrio, estado.camera, performance.now(), presentado ?? IDENTIDAD);
  }, -1);

  return <group ref={grupo} name="cuerpos-del-quiebro" />;
}
