/**
 * `<Atmosfera>`: cielo, niebla de altura, lluvia, salpicaduras y luces, montados en una escena.
 *
 * ═══ LA NIEBLA LLEGA A TODO, TAMBIÉN A LO QUE NO ES MÍO ═══
 *
 * Al montar y después cada medio segundo se recorre la escena entera y se le pone la niebla de
 * altura a cualquier material que no la lleve (`nieblaEnLaEscena`): los personajes, los anillos, los
 * glifos, lo que monte otro frente. Recorrer unos cientos de objetos dos veces por segundo no se
 * nota; que un muñeco se recortara nítido contra la bruma, sí.
 *
 * Las sombras se encienden en el renderizador desde N2 (sólo la direccional, 40 m). Encenderlas o
 * apagarlas recompila los materiales, así que sólo cambia con el nivel.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { crearElCielo, UNIFORMES_DEL_CIELO } from './cielo';
import { crearLaLluvia, crearLasSalpicaduras, UNIFORMES_DE_LA_LLUVIA } from './lluvia';
import type { FarolaEncendible } from './luz';
import { LucesDeLaNoche } from './luz';
import type { TiempoDeLaNoche } from './niebla';
import { nieblaEnLaEscena, ponerLaNiebla } from './niebla';
import type { NivelDeLaCiudad } from '../ciudad/tipos';
import { DETALLE_DEL_NIVEL } from '../ciudad/tipos';

export interface PropsDeLaAtmosfera {
  readonly tiempo: TiempoDeLaNoche;
  readonly nivel: NivelDeLaCiudad;
  readonly farolas: readonly FarolaEncendible[];
  readonly semilla: number;
  /** El tiempo del adorno (el Remanso lo frena). */
  readonly reloj?: () => number;
  /** 1 encendidas, 0 Apagón. */
  readonly farolasEncendidas?: number;
}

const FUERZA_DE_LA_LLUVIA: Readonly<Record<TiempoDeLaNoche, number>> = { llovizna: 0.7, aguacero: 1.25, niebla: 0.4 };

export function Atmosfera({ tiempo, nivel, farolas, semilla, reloj, farolasEncendidas = 1 }: PropsDeLaAtmosfera): JSX.Element {
  const { scene, gl } = useThree();
  const detalle = DETALLE_DEL_NIVEL[nivel];

  useEffect(() => {
    ponerLaNiebla(scene, tiempo);
    UNIFORMES_DE_LA_LLUVIA.uFuerza.value = FUERZA_DE_LA_LLUVIA[tiempo];
    UNIFORMES_DE_LA_LLUVIA.uVelocidad.value = tiempo === 'aguacero' ? 11 : 9;
  }, [scene, tiempo]);

  useEffect(() => {
    const antes = gl.shadowMap.enabled;
    gl.shadowMap.enabled = detalle.sombras > 0;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    return () => {
      gl.shadowMap.enabled = antes;
    };
  }, [gl, detalle.sombras]);

  const cielo = useMemo(() => crearElCielo(), []);
  const lluvia = useMemo(() => crearLaLluvia(detalle.lluvia, semilla), [detalle.lluvia, semilla]);
  const salpicaduras = useMemo(
    () => (detalle.salpicaduras > 0 ? crearLasSalpicaduras(detalle.salpicaduras, semilla) : null),
    [detalle.salpicaduras, semilla],
  );
  const luces = useMemo(
    () => new LucesDeLaNoche(farolas, { reales: detalle.lucesReales, sombras: detalle.sombras }),
    [farolas, detalle.lucesReales, detalle.sombras],
  );

  useEffect(
    () => () => {
      cielo.geometry.dispose();
      (cielo.material as THREE.Material).dispose();
    },
    [cielo],
  );
  useEffect(
    () => () => {
      lluvia.geometry.dispose();
      (lluvia.material as THREE.Material).dispose();
    },
    [lluvia],
  );
  useEffect(
    () => () => {
      if (salpicaduras === null) return;
      salpicaduras.geometry.dispose();
      (salpicaduras.material as THREE.Material).dispose();
    },
    [salpicaduras],
  );
  useEffect(
    () => () => {
      luces.direccional.shadow.map?.dispose();
    },
    [luces],
  );

  const desdeLaNiebla = useRef(0);
  useEffect(() => {
    nieblaEnLaEscena(scene);
  }, [scene, cielo, lluvia, luces]);

  useFrame((estado, dt) => {
    const t = reloj !== undefined ? reloj() : estado.clock.elapsedTime;
    UNIFORMES_DEL_CIELO.uTiempo.value = t;
    luces.farolasEncendidas = farolasEncendidas;
    luces.actualizar(estado.camera, Math.min(dt, 0.1));
    desdeLaNiebla.current += dt;
    if (desdeLaNiebla.current > 0.5) {
      desdeLaNiebla.current = 0;
      nieblaEnLaEscena(scene);
    }
  });

  return (
    <>
      <primitive object={cielo} />
      <primitive object={lluvia} />
      {salpicaduras !== null ? <primitive object={salpicaduras} /> : null}
      <primitive object={luces.grupo} />
    </>
  );
}
