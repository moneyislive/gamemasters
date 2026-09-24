/**
 * LA LUPA DEL FRENTE DE IMAGEN: SÓLO EN DESARROLLO, lo que hace falta para JUZGAR la imagen del juego
 * de verdad desde fuera (un navegador sin cabeza, la consola), sin tocar el juego.
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * La imagen se juzga en el juego real, no en un banco: el banco de la imagen pinta una calle de prueba
 * y el de la ciudad no lleva posproceso. Pero el juego real no deja fijar lo que hay que fijar para
 * comparar un ANTES con un DESPUÉS: la cámara la mueve el jugador, el nivel lo decide el gobernador y
 * la luz del barrio la decide la hora de la noche. Con la lupa, quien mira puede:
 *
 *   · leer el renderizador, la escena, la cámara y la cuenta del fotograma (`medida.ts`);
 *   · fijar la cámara en un sitio (`camaraFija`), que se aplica justo antes de pintar, encima de lo
 *     que haya hecho la cámara del juego en su `useFrame`;
 *   · empujar fotogramas a mano (`advance` de r3f), porque con el panel oculto el navegador para
 *     `requestAnimationFrame` y la escena no se pinta sola.
 *
 * El nivel y la luz se fuerzan con sus propias puertas (`forzarElNivel` en `calidad/usar-el-nivel.ts`,
 * `forzarLaLuz` en `atmosfera/luz-del-barrio.ts`), que la lupa sólo reexpone.
 *
 * ═══ POR QUÉ NO LLEGA AL EMPAQUETADO ═══
 *
 * Todo cuelga de `import.meta.env.DEV`: en el empaquetado es `false` y el bloque se cae al compilar.
 * En Node (los comprobadores) `import.meta.env` no existe: se mira con cuidado para no reventar.
 */
import * as THREE from 'three';
import { advance } from '@react-three/fiber';
import type { WebGLRenderer } from 'three';
import { laCuentaDe } from '../calidad/medida';
import { forzarElNivel } from '../calidad/usar-el-nivel';
import { forzarLaLuz, luzForzada } from '../atmosfera/luz-del-barrio';
import { PALETAS, UNIFORMES_DE_LA_LUZ } from '../atmosfera/paleta';
import { UNIFORMES_DE_LA_NIEBLA } from '../atmosfera/niebla';
import { UNIFORMES_DEL_CIELO } from '../atmosfera/cielo';
import { UNIFORMES_DE_LA_CIUDAD } from '../ciudad/retoques';
import { UNIFORMES_DE_LOS_HALOS } from '../ciudad/halos';
import {
  ALTO_DEL_PIVOTE,
  DISTANCIA_ABIERTA,
  DISTANCIA_ABIERTA_DE_CINE,
  DISTANCIA_AL_HOMBRO,
  DISTANCIA_DE_CINE,
  FOV_ABIERTO_DE_CINE,
  FOV_HORIZONTAL_DE_CINE,
  FOV_MOVIL,
  FOV_PC,
  FOV_VERTICAL_DE_CINE_MAXIMO,
  FOV_VERTICAL_DE_CINE_MINIMO,
  HOMBRO_M,
} from '../camara/encuadre';

/** Una cámara fija: dónde está, a dónde mira y con qué campo de visión (grados). */
export interface CamaraFija {
  readonly pos: readonly [number, number, number];
  readonly mira: readonly [number, number, number];
  readonly fov?: number;
}

interface LaLupa {
  gl: WebGLRenderer | null;
  escena: THREE.Scene | null;
  camara: THREE.Camera | null;
  camaraFija: CamaraFija | null;
  /** La propuesta de encuadre de `camara/encuadre.ts` («de cine»), aplicada encima de la del juego. */
  encuadreDeCine: boolean;
  cuenta: () => ReturnType<typeof laCuentaDe>;
  advance: typeof advance;
  forzarElNivel: typeof forzarElNivel;
  forzarLaLuz: typeof forzarLaLuz;
  luzForzada: typeof luzForzada;
  /** Los uniformes compartidos, para afinar en caliente desde la consola (y luego escribirlo en su sitio). */
  uniformes: Record<string, unknown>;
  paletas: typeof PALETAS;
}

/** ¿Estamos en el servidor de desarrollo de Vite? (en Node y en el empaquetado, no). */
export function enDesarrollo(): boolean {
  /* Escrito LITERAL (`import.meta.env`): Vite sólo lo inyecta si encuentra ese texto en el módulo. */
  const env = import.meta.env as { readonly DEV?: boolean } | undefined;
  return env?.DEV === true && typeof window !== 'undefined';
}

function laLupa(): LaLupa | null {
  if (!enDesarrollo()) return null;
  const w = window as unknown as { __quiebroImagen?: LaLupa };
  w.__quiebroImagen ??= {
    gl: null,
    escena: null,
    camara: null,
    camaraFija: null,
    encuadreDeCine: new URLSearchParams(location.search).get('encuadre') === 'cine',
    cuenta: () => null,
    advance,
    forzarElNivel,
    forzarLaLuz,
    luzForzada,
    uniformes: {
      luz: UNIFORMES_DE_LA_LUZ,
      niebla: UNIFORMES_DE_LA_NIEBLA,
      cielo: UNIFORMES_DEL_CIELO,
      ciudad: UNIFORMES_DE_LA_CIUDAD,
      halos: UNIFORMES_DE_LOS_HALOS,
    },
    paletas: PALETAS,
  };
  return w.__quiebroImagen;
}

/** Apunta el lienzo vivo en la lupa (lo llama `<Posproceso>` al montar). */
export function apuntarEnLaLupa(gl: WebGLRenderer, escena: THREE.Scene, camara: THREE.Camera): void {
  const lupa = laLupa();
  if (lupa === null) return;
  lupa.gl = gl;
  lupa.escena = escena;
  lupa.camara = camara;
  lupa.cuenta = () => laCuentaDe(gl);
}

const MIRA = new THREE.Vector3();
const DERECHA = new THREE.Vector3();
const PIVOTE = new THREE.Vector3();

/** El campo VERTICAL que da un horizontal fijo en una pantalla de este aspecto, acotado. */
export function fovVerticalDeCine(aspecto: number): number {
  const v = (2 * Math.atan(Math.tan((FOV_HORIZONTAL_DE_CINE * Math.PI) / 360) / Math.max(0.3, aspecto)) * 180) / Math.PI;
  return Math.min(FOV_VERTICAL_DE_CINE_MAXIMO, Math.max(FOV_VERTICAL_DE_CINE_MINIMO, v));
}

/**
 * EL ENCUADRE DE CINE, MIRADO (sólo en desarrollo). La cámara del juego pone el ojo, el pivote (el
 * hombro) y el punto al que mira en una misma recta; aquí se acerca el ojo por esa recta a la distancia
 * de la propuesta (en la misma proporción, así que un choque con una pared se respeta) y se cambia el
 * campo por el que sale del aspecto. Lo que el juego resta o suma al campo (el Remanso, la apertura de
 * la pelea) se conserva. En lo alto de la Bajada no se toca nada.
 */
function encuadreDeCine(camara: THREE.PerspectiveCamera): void {
  const w = window as unknown as { __quiebro?: { partida?: { yo(): number | null; pintadoDe(id: number): { x: number; z: number } | null } } };
  const partida = w.__quiebro?.partida;
  const yo = partida?.yo() ?? null;
  const cuerpo = yo === null || partida === undefined ? null : partida.pintadoDe(yo);
  if (cuerpo === null || camara.position.y > 5) return;
  DERECHA.setFromMatrixColumn(camara.matrixWorld, 0);
  DERECHA.y = 0;
  if (DERECHA.lengthSq() < 1e-6) return;
  DERECHA.normalize();
  PIVOTE.set(cuerpo.x + DERECHA.x * HOMBRO_M, ALTO_DEL_PIVOTE, cuerpo.z + DERECHA.z * HOMBRO_M);
  const d = camara.position.distanceTo(PIVOTE);
  if (d < 0.3) return;
  const abierta = d > (DISTANCIA_AL_HOMBRO + DISTANCIA_ABIERTA) / 2;
  const k = abierta ? DISTANCIA_ABIERTA_DE_CINE / DISTANCIA_ABIERTA : DISTANCIA_DE_CINE / DISTANCIA_AL_HOMBRO;
  camara.position.sub(PIVOTE).multiplyScalar(k).add(PIVOTE);
  const base = camara.fov > FOV_PC + 0.01 && camara.fov <= FOV_MOVIL + 0.01 ? FOV_MOVIL : FOV_PC;
  const ajuste = camara.fov - base;
  const fov = fovVerticalDeCine(camara.aspect) + (abierta ? FOV_ABIERTO_DE_CINE : 0) + ajuste;
  if (Math.abs(camara.fov - fov) > 0.01) {
    camara.fov = fov;
    camara.updateProjectionMatrix();
  }
  camara.updateMatrixWorld();
}

/** Si la lupa tiene una cámara fija, la pone (justo antes de pintar). */
export function camaraDeLaLupa(camara: THREE.Camera): void {
  const lupa = laLupa();
  const fija = lupa?.camaraFija ?? null;
  if (fija === null) {
    if (lupa?.encuadreDeCine === true && camara instanceof THREE.PerspectiveCamera) encuadreDeCine(camara);
    return;
  }
  camara.position.set(fija.pos[0], fija.pos[1], fija.pos[2]);
  camara.up.set(0, 1, 0);
  MIRA.set(fija.mira[0], fija.mira[1], fija.mira[2]);
  camara.lookAt(MIRA);
  if (camara instanceof THREE.PerspectiveCamera && fija.fov !== undefined && camara.fov !== fija.fov) {
    camara.fov = fija.fov;
    camara.updateProjectionMatrix();
  }
  camara.updateMatrixWorld();
}
