/**
 * LOS HALLAZGOS: lo que brota por el tablero en una mesa de botas, girando en el suelo del juego que
 * sea (docs/AVATARES-JUGABLES.md §2). Común a los tres: el Burgo, Riberas y Las Lindes lo montan
 * igual, con la lista que da el canal y la altura del suelo que da cada escena.
 *
 * ═══ LA LISTA LLEGA POR REACT; EL GIRO, POR EL FOTOGRAMA ═══
 *
 * La lista de brotes cambia unas pocas veces por minuto (`usar-el-canal.ts`), así que llega como
 * prop, y con ella se reparte cada brote en la malla de su clase y se mide la altura del suelo bajo
 * él —una vez, no sesenta por segundo—. En el fotograma sólo se escriben once matrices como mucho:
 * dónde está, cuánto ha girado y cuánto flota.
 *
 * ═══ POCAS MALLAS, PORQUE EN UN MÓVIL CADA LLAMADA CUENTA ═══
 *
 * Una malla instanciada por clase y una para la luz de todos (`aspecto-de-los-hallazgos.ts`). Las de
 * las clases que no hay en el suelo no se pintan: en el Burgo son tres como mucho y la luz, en Las
 * Lindes una y la luz.
 *
 * ═══ A LA ALTURA DEL SUELO QUE DA LA ESCENA ═══
 *
 * Con la misma `alturaEn` con la que se pinta a quien pasea y a los demás (`los-demas.tsx`): en
 * Riberas, el agua pintada; en el Burgo, el andén y el bordillo; en Las Lindes, cada losa.
 *
 * ═══ Y NO SE TOCAN ═══
 *
 * Se recogen andando —el servidor mira dónde se está (`hallazgos.ts`)—, no pulsando. Así que nada de
 * `onClick` ni de punteros, y ninguna malla contesta a un rayo: un brote entre la cámara y una casilla
 * no le puede robar el toque a la casilla.
 */
import { useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Brote } from './canal-de-botas';
import {
  aspectoDe,
  CAPACIDAD_DE_BROTES,
  CLASE_DESCONOCIDA,
  CLASES_DE_HALLAZGO,
  FLOTA,
  geometriaDe,
  geometriaDeLaLuz,
  piezaDe,
  VAIVEN,
} from './aspecto-de-los-hallazgos';
import type { AspectoDeHallazgo } from './aspecto-de-los-hallazgos';

export interface LosHallazgosProps {
  /** Lo que hay brotado ahora, del canal (`usarElCanal(...).brotes`). */
  readonly brotes: readonly Brote[];
  /** A qué altura está el suelo de la escena en un punto. La misma que la de quien pasea. */
  readonly alturaEn: (x: number, z: number) => number;
}

const TODOS_LOS_ASPECTOS: readonly AspectoDeHallazgo[] = [...CLASES_DE_HALLAZGO, CLASE_DESCONOCIDA];

/** Un rayo no se para en un brote. */
const SIN_RAYO = (): void => undefined;

/** Un brote ya repartido: dónde, sobre qué suelo, y un desfase para que no giren todos a la vez. */
interface Colocado {
  readonly x: number;
  readonly z: number;
  readonly suelo: number;
  readonly fase: number;
  readonly aspecto: AspectoDeHallazgo;
}

export function LosHallazgos({ brotes, alturaEn }: LosHallazgosProps): JSX.Element {
  /* Las mallas, una vez: una por aspecto y la luz. Las geometrías y los materiales, suyos. */
  const mallas = useMemo(() => {
    const cuerpo = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.06 });
    const porAspecto = new Map<AspectoDeHallazgo, THREE.InstancedMesh>();
    for (const a of TODOS_LOS_ASPECTOS) {
      const m = new THREE.InstancedMesh(geometriaDe(a), cuerpo, CAPACIDAD_DE_BROTES);
      m.count = 0;
      m.visible = false;
      m.frustumCulled = false;
      m.raycast = SIN_RAYO;
      m.name = `hallazgo:${a}`;
      porAspecto.set(a, m);
    }
    /* Sin niebla y sin el tono de la escena: de lejos es cuando más falta verla. */
    const brillo = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const luz = new THREE.InstancedMesh(geometriaDeLaLuz(), brillo, CAPACIDAD_DE_BROTES);
    luz.count = 0;
    luz.visible = false;
    luz.frustumCulled = false;
    luz.raycast = SIN_RAYO;
    luz.name = 'hallazgo:luz';
    /* El color de cada instancia se pone al repartir; hace falta el atributo antes del primer dibujo. */
    luz.setColorAt(0, new THREE.Color(0, 0, 0));
    return { porAspecto, luz, cuerpo, brillo };
  }, []);
  useEffect(
    () => () => {
      for (const m of mallas.porAspecto.values()) m.geometry.dispose();
      mallas.luz.geometry.dispose();
      mallas.cuerpo.dispose();
      mallas.brillo.dispose();
    },
    [mallas],
  );

  /* Repartir: sólo cuando cambia la lista o el suelo. Los que no caben en la capacidad no se pintan. */
  const colocados = useMemo<readonly Colocado[]>(
    () =>
      brotes.slice(0, CAPACIDAD_DE_BROTES).map((b) => {
        const suelo = alturaEn(b.x, b.z);
        return {
          x: b.x,
          z: b.z,
          suelo: Number.isFinite(suelo) ? suelo : 0,
          /* El número áureo reparte los desfases sin que dos seguidos se parezcan. */
          fase: (b.id * 0.618034 * Math.PI * 2) % (Math.PI * 2),
          aspecto: aspectoDe(b.clase),
        };
      }),
    [brotes, alturaEn],
  );
  useEffect(() => {
    const cuantos = new Map<AspectoDeHallazgo, number>();
    for (const c of colocados) cuantos.set(c.aspecto, (cuantos.get(c.aspecto) ?? 0) + 1);
    for (const [a, m] of mallas.porAspecto) {
      m.count = cuantos.get(a) ?? 0;
      m.visible = m.count > 0;
    }
    const { luz } = mallas;
    colocados.forEach((c, i) => luz.setColorAt(i, piezaDe(c.aspecto).luz.color));
    if (luz.instanceColor !== null) luz.instanceColor.needsUpdate = true;
    luz.count = colocados.length;
    luz.visible = colocados.length > 0;
  }, [colocados, mallas]);

  /* Lo de cada fotograma, sin crear nada. */
  const cuenta = useMemo(() => ({ matriz: new THREE.Matrix4(), giro: new THREE.Quaternion(), sitio: new THREE.Vector3(), escala: new THREE.Vector3(), eje: new THREE.Vector3(0, 1, 0), porAspecto: new Map<AspectoDeHallazgo, number>() }), []);

  useFrame((estado) => {
    if (colocados.length === 0) return;
    const t = estado.clock.elapsedTime;
    const { matriz, giro, sitio, escala, eje, porAspecto } = cuenta;
    porAspecto.clear();
    colocados.forEach((c, i) => {
      const pieza = piezaDe(c.aspecto);
      /* La pieza: gira, y sube y baja un poco. */
      const n = porAspecto.get(c.aspecto) ?? 0;
      porAspecto.set(c.aspecto, n + 1);
      const malla = mallas.porAspecto.get(c.aspecto);
      if (malla !== undefined) {
        giro.setFromAxisAngle(eje, c.fase + t * pieza.giro * Math.PI * 2);
        sitio.set(c.x, c.suelo + FLOTA + Math.sin(t * 2.2 + c.fase) * VAIVEN, c.z);
        escala.setScalar(pieza.escala);
        malla.setMatrixAt(n, matriz.compose(sitio, giro, escala));
      }
      /* La luz: en el suelo, respirando un poco de ancho. */
      const respira = 1 + Math.sin(t * 3 + c.fase) * 0.12;
      giro.identity();
      sitio.set(c.x, c.suelo, c.z);
      escala.set(pieza.luz.ancho * respira, pieza.luz.alto, pieza.luz.ancho * respira);
      mallas.luz.setMatrixAt(i, matriz.compose(sitio, giro, escala));
    });
    for (const m of mallas.porAspecto.values()) if (m.count > 0) m.instanceMatrix.needsUpdate = true;
    mallas.luz.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="hallazgos">
      {TODOS_LOS_ASPECTOS.map((a) => {
        const m = mallas.porAspecto.get(a);
        return m === undefined ? null : <primitive key={a} object={m} />;
      })}
      <primitive object={mallas.luz} />
    </group>
  );
}
