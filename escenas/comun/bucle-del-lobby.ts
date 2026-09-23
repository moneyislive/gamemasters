/**
 * EL BUCLE DE CÁMARA DE UN LOBBY: el zarpe, la luz que lo acompaña, la mirada a quien llega, el
 * arrastre, la respiración y el amortiguado hacia la pose. Una vez para el Muelle y la Plaza.
 *
 * ═══ POR QUÉ ES UNO ═══
 *
 * La Plaza nació copiando el bucle del Muelle y lo decía —«la estructura de `Embarcadero.tsx`»—: el
 * mismo `useFrame` renglón a renglón (el zarpe de ida con su aviso una sola vez, la luz que corre con
 * él, la mirada que empieza en el fotograma siguiente, el arrastre con su muelle, la respiración, el
 * amortiguado con el primer fotograma en seco), los mismos tres manejadores del arrastre, el mismo
 * efecto de `zarpando` y hasta `giraAlrededorDelObjetivo` escrito dos veces. Lo que cambia de un lobby
 * a otro es poco y se pasa:
 *
 *   · LA POSE DE REPOSO para un aspecto (el encuadre del Muelle, el de la Plaza), ya con la hoja.
 *   · CÓMO SE MIRA A QUIEN LLEGA y cuánto dura (0,8 s hacia un amarre; 1,6 s hacia un puesto, porque
 *     allí se llega andando), y ADÓNDE SUBE LA GRÚA del zarpe.
 *   · LOS TOPES DEL ARRASTRE y LOS PLANOS de la cámara, que dependen del cielo de cada uno.
 *   · Y LO QUE LA ESCENA PINTA CON LA LUZ: el cielo y el agua del Muelle, que amanecen; el cielo, la
 *     niebla y las luces de la Plaza, que van al mediodía del tablero.
 *
 * Un tercer lobby con coreografía empieza por aquí y escribe sólo eso.
 *
 * ═══ EL ORDEN DENTRO DEL FOTOGRAMA ES EL DE SIEMPRE ═══
 *
 * Un solo `useFrame`, en el orden de los dos de antes: el zarpe, la luz, lo que la escena pinta con
 * ella —con la cámara todavía donde la dejó el fotograma anterior, que es donde la cúpula tiene que
 * ir pegada—, y después la cámara. Lo de la escena entra como una función (`alAvanzar`) que se llama
 * en ese punto, y no en un `useFrame` suyo: dos `useFrame` no garantizan su orden más que por el de
 * montaje, y la luz de este fotograma pintaría la del anterior.
 *
 * ═══ LO QUE PROMETE, QUE ES EL CONTRATO DEL MUELLE ═══
 *
 * `alZarpar` exactamente una vez por coreografía: a los 3,2 s de empezarla o, si `zarpando` llega sin
 * mundo, en el fotograma siguiente y sin esperar a nada. `zarpando` es de ida: un `false` después del
 * `true` no deshace nada, porque no hay coreografía de vuelta. Toda pose es un objetivo al que se
 * llega por amortiguado exponencial —la posición con 6, el objetivo y el campo con 4—, y sólo en el
 * primer fotograma se asigna en seco. El `dt` se acota a cien milisegundos, como la medida.
 *
 * ═══ EL ARRASTRE ═══
 *
 * Con el dedo, hasta `arrastre.dedo` a cada lado; con el ratón, `arrastre.raton`, pulsado o no; y
 * vuelta con muelle al soltar. Lo recibe UN solo objeto, la cúpula, que rodea a la cámara y por tanto
 * está bajo el puntero siempre: si lo recibieran también el suelo y las piezas, pasar de uno a otro
 * dispararía un `leave` a mitad del arrastre y lo cortaría. La escena le da a su cúpula los tres
 * manejadores que devuelve esto.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { amortiguado, conRespiracion, DURACION_DEL_ZARPE, easeInOutQuart } from '../embarcadero/camara';
import type { Pose } from '../embarcadero/camara';
import type { Ventana } from '../embarcadero/tipos';

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/** Un punto del suelo del lobby: el amarre de quien atraca, el pie del puesto de quien entra. */
export interface PuntoDelLobby {
  readonly x: number;
  readonly z: number;
}

/** Lo que la escena necesita, en cada fotograma, para pintar lo que sigue a la luz del zarpe. */
export interface FotogramaDelLobby {
  /** El reloj de la escena, en segundos. */
  readonly t: number;
  /** Lo que ha pasado desde el anterior, acotado a cien milisegundos. */
  readonly dt: number;
  /** La luz del zarpe: 0 es la hora del lobby, 1 la del tablero al que se zarpa. */
  readonly luz: number;
  /** La cámara, todavía donde la dejó el fotograma anterior. */
  readonly camara: THREE.PerspectiveCamera;
}

export interface OpcionesDelBucleDelLobby {
  /** La ventana del contrato: de ella sale el aspecto, y si no la hay, del lienzo. */
  readonly ventana: Ventana;
  /** Si el mundo ha llegado: sin él no hay coreografía, y el zarpe se avisa en cuanto se pide. */
  readonly hayMundo: boolean;
  /** Empieza el zarpe. De ida. */
  readonly zarpando: boolean | undefined;
  /** La coreografía de zarpar ha terminado: exactamente una vez. */
  readonly alZarpar: (() => void) | undefined;
  /** Hasta dónde tuerce el arrastre, con el dedo y con el ratón, en radianes. */
  readonly arrastre: { readonly dedo: number; readonly raton: number };
  /** El plano cercano, y hasta dónde tiene que llegar por lo menos el lejano para que quepa la cúpula. */
  readonly planos: { readonly cerca: number; readonly lejos: number };
  /** La pose de reposo para un aspecto, antes de respirar. */
  readonly reposo: (aspecto: number) => Pose;
  /** La mirada a quien llega: cuánto dura, y cómo tuerce la pose con `v` de 0 a 1. */
  readonly mirada: { readonly duracion: number; readonly pose: (base: Pose, punto: PuntoDelLobby, v: number) => Pose };
  /** La grúa del zarpe: de la pose de reposo a la aérea de la escena, con `u` de 0 a 1. */
  readonly zarpe: (base: Pose, u: number) => Pose;
  /** Lo que la escena pinta con la luz, en cada fotograma y ANTES de mover la cámara. */
  readonly alAvanzar: (fotograma: FotogramaDelLobby) => void;
}

export interface BucleDelLobby {
  /** Que la cámara mire un momento hacia ese punto, empezando en el fotograma siguiente. Estable. */
  readonly mirarA: (punto: PuntoDelLobby) => void;
  /** Los tres manejadores del arrastre, para la cúpula. */
  readonly alPulsar: (e: ThreeEvent<PointerEvent>) => void;
  readonly alMover: (e: ThreeEvent<PointerEvent>) => void;
  readonly alSoltar: () => void;
}

/** Gira la posición de una pose alrededor de su objetivo, en horizontal. Para el arrastre. */
export function giraAlrededorDelObjetivo(pose: Pose, angulo: number): Pose {
  const rx = pose.posicion.x - pose.objetivo.x;
  const rz = pose.posicion.z - pose.objetivo.z;
  const cos = Math.cos(angulo);
  const sin = Math.sin(angulo);
  return {
    ...pose,
    posicion: {
      x: pose.objetivo.x + rx * cos + rz * sin,
      y: pose.posicion.y,
      z: pose.objetivo.z - rx * sin + rz * cos,
    },
  };
}

export function usarElBucleDelLobby(o: OpcionesDelBucleDelLobby): BucleDelLobby {
  const camara = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const { cerca, lejos } = o.planos;
  useEffect(() => {
    /* La cámara de serie de r3f se queda corta: el plano lejano tiene que dejar dentro la cúpula. */
    camara.near = cerca;
    camara.far = Math.max(camara.far, lejos);
    camara.updateProjectionMatrix();
  }, [camara, cerca, lejos]);

  const primerFotograma = useRef(true);
  const posicionActual = useMemo(() => new THREE.Vector3(), []);
  const objetivoActual = useMemo(() => new THREE.Vector3(), []);
  const auxPosicion = useMemo(() => new THREE.Vector3(), []);
  const fovActual = useRef(55);
  const mirada = useRef<{ desde: number; punto: PuntoDelLobby } | null>(null);
  const zarpe = useRef<{ pedido: boolean; desde: number | null; avisado: boolean }>({ pedido: false, desde: null, avisado: false });
  const luz = useRef(0);
  const arrastre = useRef({ activo: false, x0: 0, objetivo: 0, actual: 0 });

  useEffect(() => {
    /* De ida: un `false` después del `true` no deshace nada (ver la cabecera). */
    if (o.zarpando === true) zarpe.current = { pedido: true, desde: null, avisado: false };
  }, [o.zarpando]);

  /* La mirada empieza en el fotograma siguiente (`desde` −1 = «pendiente de fechar»), con el reloj de la escena. */
  const mirarA = useCallback((punto: PuntoDelLobby): void => {
    mirada.current = { desde: -1, punto: { x: punto.x, z: punto.z } };
  }, []);

  useFrame((s, dtCrudo) => {
    const t = s.clock.elapsedTime;
    const dt = Math.min(0.1, Math.max(0, dtCrudo));
    const cam = s.camera as THREE.PerspectiveCamera;

    /* ─ El zarpe. ─ */
    const z = zarpe.current;
    if (z.pedido && z.desde === null && !z.avisado) {
      if (!o.hayMundo) {
        /* Sin mundo no hay coreografía: se avisa en cuanto se puede. */
        z.avisado = true;
        o.alZarpar?.();
      } else {
        z.desde = t;
      }
    }
    let u = 0;
    if (z.desde !== null) {
      u = pinza((t - z.desde) / DURACION_DEL_ZARPE, 0, 1);
      if (u >= 1 && !z.avisado) {
        z.avisado = true;
        o.alZarpar?.();
      }
    }
    const objetivoDeLaLuz = z.desde === null ? 0 : easeInOutQuart(u);
    luz.current += (objetivoDeLaLuz - luz.current) * (z.desde === null ? amortiguado(dt, 2) : 1);

    /* ─ Lo que la escena pinta con la luz, con la cámara aún donde la dejó el fotograma anterior. ─ */
    o.alAvanzar({ t, dt, luz: luz.current, camara: cam });

    /* ─ La cámara: el objetivo de este fotograma. ─ */
    const aspecto = o.ventana.ancho > 0 && o.ventana.alto > 0 ? o.ventana.ancho / o.ventana.alto : s.size.width / Math.max(1, s.size.height);
    let pose: Pose = conRespiracion(o.reposo(aspecto), t);
    const ar = arrastre.current;
    ar.actual += (ar.objetivo - ar.actual) * amortiguado(dt, ar.activo ? 10 : 4);
    if (Math.abs(ar.actual) > 1e-4) pose = giraAlrededorDelObjetivo(pose, ar.actual);
    const mir = mirada.current;
    if (mir !== null) {
      if (mir.desde < 0) mir.desde = t;
      const v = (t - mir.desde) / o.mirada.duracion;
      if (v >= 1) mirada.current = null;
      else pose = o.mirada.pose(pose, mir.punto, v);
    }
    if (z.desde !== null) pose = o.zarpe(pose, u);

    /* ─ Y el amortiguado hacia él: la posición más viva que el objetivo, que sigue con 0,25 s. ─ */
    if (primerFotograma.current) {
      primerFotograma.current = false;
      posicionActual.set(pose.posicion.x, pose.posicion.y, pose.posicion.z);
      objetivoActual.set(pose.objetivo.x, pose.objetivo.y, pose.objetivo.z);
      fovActual.current = pose.fov;
    } else {
      posicionActual.lerp(auxPosicion.set(pose.posicion.x, pose.posicion.y, pose.posicion.z), amortiguado(dt, 6));
      objetivoActual.lerp(auxPosicion.set(pose.objetivo.x, pose.objetivo.y, pose.objetivo.z), amortiguado(dt, 4));
      fovActual.current += (pose.fov - fovActual.current) * amortiguado(dt, 4);
    }
    cam.position.copy(posicionActual);
    cam.lookAt(objetivoActual);
    if (Math.abs(cam.fov - fovActual.current) > 0.01) {
      cam.fov = fovActual.current;
      cam.updateProjectionMatrix();
    }
  });

  const { dedo, raton } = o.arrastre;
  const alPulsar = useCallback((e: ThreeEvent<PointerEvent>): void => {
    arrastre.current.activo = true;
    arrastre.current.x0 = e.pointer.x;
  }, []);
  const alMover = useCallback(
    (e: ThreeEvent<PointerEvent>): void => {
      const ar = arrastre.current;
      const tipo = (e as { pointerType?: string }).pointerType ?? 'touch';
      const tope = tipo === 'mouse' ? raton : dedo;
      if (ar.activo) ar.objetivo = pinza((e.pointer.x - ar.x0) * tope, -tope, tope);
      else if (tipo === 'mouse') ar.objetivo = e.pointer.x * raton;
    },
    [dedo, raton],
  );
  const alSoltar = useCallback((): void => {
    arrastre.current.activo = false;
    arrastre.current.objetivo = 0;
  }, []);

  return { mirarA, alPulsar, alMover, alSoltar };
}
