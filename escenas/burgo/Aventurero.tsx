/**
 * EL AVENTURERO DEL BURGO: el clon con marioneta que anda por las casillas, y su disco.
 *
 * ═══ QUÉ HAY AQUÍ Y QUÉ NO ═══
 *
 * Aquí está lo que pertenece al aventurero que está EN PIE: la `SkinnedMesh` clonada con
 * su mezclador (`escenas/aventureros/marioneta.ts`, la misma que el Muelle), el clip que
 * toca en cada fotograma, y dónde está y hacia dónde mira. El disco de contacto bajo los
 * pies NO: lo pinta `Burgo.tsx` en la misma malla instanciada que los discos de los
 * peones (una llamada para los ocho, y no una por figura). La máquina de estados
 * tampoco: es `peon.ts`, y la lleva `Burgo.tsx` por asiento (un peón instanciado por
 * asiento SIEMPRE; un aventurero en pie a la vez, decisión 11). Este componente recibe
 * el estado por REFERENCIA y lo lee en `useFrame`: cada fotograma pone posición, rumbo
 * y escala con `posicionYRumbo` y el clip con `clipQueToca`. No decide nada.
 *
 * ═══ NUNCA T-POSE, Y CÓMO SE CUMPLE AQUÍ ═══
 *
 * La pose de enlace del rig ES la T. `usarMarioneta` devuelve `null` si la biblioteca de
 * clips (`animaciones.glb`) no ha llegado, y entonces la figura NO se enseña: el grupo
 * no llega a montarse, y el peón instanciado de `Burgo.tsx` es lo que se ve deslizarse por
 * la polilínea. `clipQueToca` nunca pide `t-pose` por construcción (`peon.ts`), y
 * `reproduce` cae a `reposo-a` si le piden un clip que no exista.
 *
 * ═══ EL TIEMPO DEL CLIP SE DERIVA, NO SE ACUMULA ═══
 *
 * `reproduce` recibe DESDE cuándo suena el clip (lo dice el estado) y la hora de la
 * escena: dos aparatos que llegan a la misma fase en momentos distintos ven la misma
 * pose. `velocidad` es el `timeScale` del clip de marcha (hasta 1,5 corriendo; negativo
 * al retroceder): se pone en la acción cada fotograma, porque `reproduce` la deja a 1.
 *
 * ═══ EL SALUDO SUPERPUESTO AL CRUZAR LA PUERTA MAYOR ═══
 *
 * `saludoSuperpuesto` dice cuándo empezó; aquí se mezcla la acción `saludar` con peso
 * parcial encima de la marcha, sin detenerla, y se apaga al terminar. Es el único sitio
 * donde suenan dos clips a la vez.
 *
 * ═══ MONTARLA, SOLTARLA Y PINTARLA ES LO COMÚN ═══
 *
 * `usarMarioneta` y `<Marioneta>` (`escenas/comun/marioneta.tsx`), los mismos del Muelle, la
 * Plaza, La Linde Alta y el paseo: al desmontar, el mezclador se para y se desengancha y el
 * esqueleto del clon suelta su textura de huesos, y sin marioneta no se pinta nada.
 */
import * as React from 'react';
import { useRef } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CLIP } from '../embarcadero/figuras';
import type { AventureroCargado } from '../embarcadero/cargar';
import { reproduce } from '../aventureros/marioneta';
import { Marioneta, usarMarioneta } from '../comun/marioneta';
import { ANILLO_DEL_BURGO } from './anillo-en-3d';
import type { AnilloEn3D } from './anillo-en-3d';
import { clipQueToca, posicionYRumbo, saludoSuperpuesto } from './peon';
import type { EstadoDelPeon } from './peon';

export interface PropsDelAventureroDelBurgo {
  /** El estado de la máquina de este asiento, por referencia: lo escribe `Burgo.tsx`, aquí sólo se lee. */
  readonly estado: { readonly current: EstadoDelPeon | null };
  readonly cargado: AventureroCargado;
  /** La biblioteca de clips. Vacía hasta que llega: entonces no se enseña. */
  readonly biblioteca: readonly THREE.AnimationClip[];
  readonly anillo?: AnilloEn3D;
}

/** El disco bajo los pies, como el del Muelle: la escena no proyecta sombras en ningún cliente. Lo pinta `Burgo.tsx`. */
export const RADIO_DEL_DISCO_DEL_AVENTURERO = 0.75;
/** Cuánto pesa el saludo superpuesto sobre la marcha. */
const PESO_DEL_SALUDO = 0.6;

export function Aventurero(props: PropsDelAventureroDelBurgo): JSX.Element {
  const { estado, cargado, biblioteca, anillo = ANILLO_DEL_BURGO } = props;

  const marioneta = usarMarioneta(cargado, biblioteca);

  const grupo = useRef<THREE.Group>(null);
  const saludando = useRef(false);

  useFrame((s, dt) => {
    const g = grupo.current;
    const e = estado.current;
    if (g === null || e === null) return;
    const ahora = s.clock.elapsedTime;
    const p = posicionYRumbo(e, anillo, ahora);
    const visible = marioneta !== null && p.escala > 0.001;
    g.visible = visible;
    g.position.set(p.x, 0, p.z);
    g.rotation.set(0, p.rumbo, 0);
    const escala = Math.max(0.001, p.escala);
    g.scale.set(escala, escala, escala);
    if (marioneta === null) return;

    const clip = clipQueToca(e, ahora);
    reproduce(marioneta, clip.clip, clip.bucle, clip.desde, ahora);
    if (marioneta.actual !== null) marioneta.actual.setEffectiveTimeScale(clip.velocidad);

    /* El saludo al cruzar la Puerta Mayor, encima de la marcha y sin pararla. */
    const saludo = saludoSuperpuesto(e, ahora);
    const accionDelSaludo = marioneta.acciones.get(CLIP.saludar);
    if (accionDelSaludo !== undefined && accionDelSaludo !== marioneta.actual) {
      if (saludo !== null && !saludando.current) {
        saludando.current = true;
        accionDelSaludo.reset();
        accionDelSaludo.setLoop(THREE.LoopOnce, 1);
        accionDelSaludo.clampWhenFinished = false;
        accionDelSaludo.setEffectiveWeight(PESO_DEL_SALUDO);
        accionDelSaludo.time = Math.max(0, ahora - saludo.desde);
        accionDelSaludo.play();
      } else if (saludo === null && saludando.current) {
        saludando.current = false;
        accionDelSaludo.stop();
      }
    }
    marioneta.mezclador.update(Math.min(0.1, Math.max(0, dt)));
  });

  return <Marioneta de={marioneta} grupo={grupo} visible={false} />;
}
