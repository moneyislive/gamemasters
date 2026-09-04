/**
 * EL EMBARCADERO: la escena del lobby. ESTO ES UN ANDAMIO.
 *
 * Compila contra el contrato de `tipos.ts` para que la app y el escritorio puedan
 * montarla mientras se construye la escena de verdad, que sustituye este fichero
 * entero. Lo único que promete es lo que promete el contrato: pinta algo, avisa
 * de que está lista, y no toca ni el DOM ni Expo.
 *
 * Las reglas que la escena de verdad hereda de aquí:
 *   · `Canvas` lo monta el cliente. Aquí sólo hay hijos de escena.
 *   · Nada de `drei`. Sólo `three`, React y el núcleo de r3f (`useFrame`, `useThree`).
 *   · Nada de `fetch`, `document` ni `window`: los bytes entran por `traer`.
 */
import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PropsDelEmbarcadero } from './tipos';

const CIELO = '#1b2340';

export function Embarcadero({ alEstarListo, alMedir }: PropsDelEmbarcadero): JSX.Element {
  useEffect(() => {
    alEstarListo?.();
  }, [alEstarListo]);

  useFrame((estado) => {
    if (alMedir !== undefined && Math.floor(estado.clock.elapsedTime) !== Math.floor(estado.clock.elapsedTime - 1 / 60)) {
      const info = estado.gl.info.render;
      alMedir({ triangulos: info.triangles, llamadas: info.calls, ms: 0, fotogramas: 0 });
    }
  });

  return (
    <>
      <color attach="background" args={[CIELO]} />
      <hemisphereLight args={['#3a4a7a', '#1a1410', 0.7]} />
      <directionalLight position={[-40, 6, -80]} intensity={1.4} color="#ff9a4d" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0d1a33" roughness={0.35} metalness={0} />
      </mesh>
    </>
  );
}
