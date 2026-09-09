/**
 * LA MARIONETA: un aventurero clonado con su mezclador, y cómo se le pone un clip.
 *
 * ═══ POR QUÉ VIVE AQUÍ Y NO EN `embarcadero/aventurero.tsx` ═══
 *
 * Nació allí, privada, porque el único sitio donde un aventurero se movía era el
 * muelle. El Burgo pone UN aventurero a andar por el anillo (`escenas/burgo/`), con
 * la misma marioneta y el mismo fundido entre clips, y copiarla habría sido tener
 * dos mezcladores que se separan sin que nadie lo vea: uno arregla el `NaN` del
 * clip de una clave y el otro no. Así que lo que es DEL AVENTURERO —clonar, montar
 * el mezclador, fundir de un clip a otro, soltar el esqueleto— está aquí, en un
 * directorio que no es de ningún juego ni de ninguna pantalla; lo que es del
 * AMARRE (barco, bandera, humo, dónde está y hacia dónde mira) se queda en
 * `aventurero.tsx`, y lo que será del anillo irá en `burgo/`.
 *
 * Sin React y sin `useFrame` a propósito: es aritmética sobre objetos de `three`,
 * y quien la llama decide desde qué reloj. Sí importa `three`, así que no entra
 * en los comprobadores que se quedan sin motor de dibujo (ver
 * `verificar-embarcadero.ts`); lo que se le puede medir en Node es lo que hace
 * el `GLTFLoader` con los nombres de los huesos, y eso ya lo mide
 * `verify:aventureros`.
 *
 * ═══ NUNCA T-POSE ═══
 *
 * La pose de enlace del rig ES la T, y un clip de una sola clave dura cero y deja
 * `action.time` en `NaN`. Por eso `montaMarioneta` no registra el `t-pose` y
 * devuelve `null` si no hay un `reposo-a` que reproducir: mientras no haya
 * biblioteca, la figura no se enseña. Y `reproduce` cae a `reposo-a` si le piden
 * un clip que no existe, en vez de quedarse con el que había.
 *
 * ═══ EL TIEMPO DEL CLIP SE DERIVA, NO SE ACUMULA ═══
 *
 * `reproduce` recibe DESDE cuándo suena el clip y QUÉ HORA es, y pone
 * `action.time` en consecuencia: en bucle, en la vuelta que toca; de una vez, en
 * su instante o clavado al final. Así dos aparatos que llegan a la misma fase en
 * momentos distintos ven la misma pose, que es lo que hace que una coreografía
 * compartida por seis pantallas parezca una y no seis.
 */
import * as THREE from 'three';
import { CLIP } from '../embarcadero/figuras';
import type { NombreDeClip } from '../embarcadero/figuras';
import { clonarAventurero, fundirClips } from '../embarcadero/cargar';
import type { AventureroCargado } from '../embarcadero/cargar';

/** Lo que dura el fundido entre un clip y el siguiente, en segundos. */
export const FUNDIDO_ENTRE_CLIPS = 0.22;

export interface Marioneta {
  readonly raiz: THREE.Object3D;
  readonly mezclador: THREE.AnimationMixer;
  readonly acciones: ReadonlyMap<string, THREE.AnimationAction>;
  actual: THREE.AnimationAction | null;
  desdeActual: number;
}

/** El giro más corto de `a` hacia `b`, en radianes: para encarar sin dar la vuelta larga. */
export function giroCorto(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Monta la marioneta de una figura cargada con la biblioteca de clips. `null` si no
 * hay `reposo-a` que reproducir (la biblioteca no ha llegado): entonces no hay nada
 * que enseñar sin caer en la T.
 */
export function montaMarioneta(cargado: AventureroCargado, biblioteca: readonly THREE.AnimationClip[]): Marioneta | null {
  const raiz = clonarAventurero(cargado);
  const mezclador = new THREE.AnimationMixer(raiz);
  const acciones = new Map<string, THREE.AnimationAction>();
  for (const clip of fundirClips(cargado.clips, biblioteca)) {
    if (clip.name === CLIP.tPose) continue;
    acciones.set(clip.name, mezclador.clipAction(clip));
  }
  if (!acciones.has(CLIP.reposoA)) {
    desmontaMarioneta({ raiz, mezclador, acciones, actual: null, desdeActual: -1 });
    return null;
  }
  return { raiz, mezclador, acciones, actual: null, desdeActual: -1 };
}

/** Para el mezclador, lo desengancha de la raíz y suelta la textura de huesos del clon. */
export function desmontaMarioneta(m: Marioneta): void {
  m.mezclador.stopAllAction();
  m.mezclador.uncacheRoot(m.raiz);
  m.raiz.traverse((n) => {
    const piel = n as THREE.SkinnedMesh;
    if (piel.isSkinnedMesh) piel.skeleton.dispose();
  });
}

/** Pone el clip que toca, fundiendo desde el anterior. Si el clip falta, `reposo-a`. */
export function reproduce(m: Marioneta, clip: NombreDeClip, bucle: boolean, desde: number, ahora: number): void {
  const accion = m.acciones.get(clip) ?? m.acciones.get(CLIP.reposoA);
  if (accion === undefined) return;
  if (accion === m.actual && (bucle || Math.abs(m.desdeActual - desde) < 1e-3)) return;
  accion.reset();
  accion.setLoop(bucle ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  accion.clampWhenFinished = !bucle;
  accion.enabled = true;
  accion.setEffectiveTimeScale(1);
  accion.setEffectiveWeight(1);
  const duracion = Math.max(1e-3, accion.getClip().duration);
  const transcurrido = Math.max(0, ahora - desde);
  /* En bucle se entra en la vuelta que toca; de una vez, en su instante o clavado al final. */
  accion.time = bucle ? transcurrido % duracion : Math.min(transcurrido, duracion - 0.001);
  if (m.actual !== null && m.actual !== accion) accion.crossFadeFrom(m.actual, FUNDIDO_ENTRE_CLIPS, true);
  accion.play();
  m.actual = accion;
  m.desdeActual = desde;
}
