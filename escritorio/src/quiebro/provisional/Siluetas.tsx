/**
 * EL PINTOR PROVISIONAL DE CUERPOS: siluetas humanas sencillas, dignas y legibles, mientras el frente de
 * personajes no entregue los suyos.
 *
 * ═══ POR QUÉ EXISTE, Y POR QUÉ NO ES UNA MAQUETA ═══
 *
 * La frontera juego ↔ personajes es `cuerpos.ts`: el juego escribe una `FuenteDeCuerpos` por fotograma y
 * los personajes la leen. Mientras `personajes/index.ts` no exista, alguien tiene que leerla, o la
 * noche se juega contra el aire. Este pintor lee LA MISMA fuente, con el mismo contrato: el día que
 * lleguen los personajes, `Quiebro.tsx` deja de montarlo y nada más cambia. No simula nada ni inventa
 * ningún cuerpo: pinta los que la partida dice, donde dice y con el gesto que dice.
 *
 * ═══ CÓMO SE LEE UN CUERPO A 60 m ═══
 *
 * El diseño exige que las siluetas con contorno se lean igual en todos los niveles y a 60 m (§8). Así
 * que cada cuerpo lleva un CASCO de contorno (una cápsula un poco mayor, pintada por detrás en un color
 * plano) que ENGORDA con la distancia a la cámara: a 3 m es un filo fino; a 60 m, un halo de un par de
 * píxeles que sigue ahí. El color dice quién es: el del asiento en los desvelados, el verde-cian del
 * código en los Prestados, el rojo en los Celadores y el naranja en los tiradores.
 *
 * ═══ SIN UNA LLAMADA POR CUERPO ═══
 *
 * Setenta cuerpos por siete piezas serían quinientas llamadas: más que todo N0 (60). Cada pieza es UNA
 * malla instanciada con capacidad para todos los cuerpos, y en cada fotograma se reescriben sus matrices:
 * ocho llamadas para los cuerpos, dos para los 48 durmientes, y ni una asignación.
 *
 * ═══ LOS DURMIENTES ═══
 *
 * Los 48 durmientes de guion los pintará el frente de personajes con su multitud; aquí se pintan como
 * civiles sencillos con la función pura de `quiebro-durmientes.ts` —la misma en todos los aparatos—, y
 * los que ahora son Prestados (`fuente.prestados()`) no se pintan como civiles: son el cuerpo del
 * Prestado.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Barrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import { DURMIENTES, escribirLosDurmientes } from '../../../../shared/arcade/juegos/quiebro-durmientes';
import { RUMBOS } from '../../../../shared/mecanicas/andar';
import { UNO } from '../../../../shared/mecanicas/fijo';
import { nieblaEn } from '../atmosfera/niebla';
import type { CuerpoPintado, FuenteDeCuerpos, Gesto } from '../cuerpos';

/** Lo que recibe un pintor de cuerpos: el provisional y, el día que llegue, el de personajes. */
export interface PropsDelPintorDeCuerpos {
  readonly fuente: FuenteDeCuerpos;
  readonly nivel: 0 | 1 | 2 | 3;
  /** El barrio de la noche, para los durmientes (o `null` si no hay noche). */
  readonly barrio: Barrio | null;
  /** El reloj de presentación de los cuerpos ajenos (el Remanso lo frena), en ms. */
  readonly presentado: (t: number) => number;
  /**
   * Quien pinta de verdad (`personajes/`) avisa aquí de su director, que sabe lo que pintó: el juego lo
   * lee sólo en desarrollo, para medir (`__quiebro.medir()`). Las siluetas no tienen director.
   */
  readonly alDirector?: (director: unknown) => void;
}

/** Cuántos cuerpos caben: seis asientos y el aforo más grande de la Liza. */
const CUERPOS_COMO_MUCHO = 80;

/** Colores de ropa por clase y variante (apagados: la ropa no compite con el contorno). */
const TRAJES = [0x4a5058, 0x6e5a44, 0x2f5a47, 0x2e3d66];
const ROPA_DE_CIVIL = [0x8a8278, 0x5f7286, 0x9c8462, 0x74647c, 0x8b958e, 0x6b635c, 0xa08f80, 0x4d6070];
const ABRIGOS = [0x6a5d52, 0x4c5660, 0x76644e];
const CONTORNO_DE_CLASE: Readonly<Record<'prestado' | 'celador' | 'tirador', number>> = {
  prestado: 0x3ff2c2,
  celador: 0xff3d6e,
  tirador: 0xff6a24,
};
const PIEL = 0xc9a58c;

/** Las piezas de una figura: dónde van respecto a los pies, y cómo miden. */
interface Pieza {
  readonly nombre: string;
  readonly geometria: THREE.BufferGeometry;
}

function capsula(radio: number, largo: number): THREE.BufferGeometry {
  return new THREE.CapsuleGeometry(radio, largo, 3, 8);
}

/** Un pose: lo que el gesto hace con el cuerpo en este instante. */
interface Pose {
  /** Bajada del cuerpo (m), inclinación hacia delante y de lado (rad), caída de espaldas (rad). */
  bajada: number;
  adelante: number;
  lado: number;
  caida: number;
  /** Ángulo de cada brazo hacia delante (rad) y de cada pierna. */
  brazoD: number;
  brazoI: number;
  piernaD: number;
  piernaI: number;
  /** Escala vertical (la impresión crece desde el suelo) y visibilidad. */
  alto: number;
}

const poseNueva = (): Pose => ({ bajada: 0, adelante: 0, lado: 0, caida: 0, brazoD: 0, brazoI: 0, piernaD: 0, piernaI: 0, alto: 1 });

const GOLPES: readonly Gesto[] = ['entrada', 'seguida-1', 'seguida-2', 'cierre', 'empellon', 'replica', 'respuesta', 'golpe-de-prestado', 'avance'];

/** LA POSE DE UN CUERPO en `t` (ms del reloj con que se le pinta). Pura. */
export function poseDe(c: CuerpoPintado, t: number, p: Pose): Pose {
  p.bajada = 0;
  p.adelante = 0;
  p.lado = 0;
  p.caida = 0;
  p.brazoD = 0;
  p.brazoI = 0;
  p.piernaD = 0;
  p.piernaI = 0;
  p.alto = 1;
  const e = Math.max(0, t - c.gestoDesdeMs);
  /* El paso: las piernas y los brazos se cruzan al ritmo de lo que anda. */
  const ritmo = Math.min(9, 2.2 + c.velocidad * 1.35);
  const amplitud = Math.min(0.75, c.velocidad * 0.14);
  const fase = (t / 1000) * ritmo;
  const zancada = Math.sin(fase) * amplitud;
  p.piernaD = zancada;
  p.piernaI = -zancada;
  p.brazoD = -zancada * 0.8;
  p.brazoI = zancada * 0.8;
  p.adelante = Math.min(0.22, c.velocidad * 0.03);
  if (GOLPES.indexOf(c.gesto) >= 0) {
    /* La anticipación: el brazo se carga hasta el impacto y sale en él (elástica si se sabe cuándo). */
    const impacto = c.impactoMs ?? c.gestoDesdeMs + 320;
    const carga = Math.max(1, impacto - c.gestoDesdeMs);
    const antes = Math.min(1, e / carga);
    const despues = Math.max(0, t - impacto);
    const golpeando = t < impacto ? -0.6 * antes : Math.max(0, 1.55 - despues / 180);
    const zurdo = c.gesto === 'seguida-1' || c.gesto === 'cierre';
    if (zurdo) p.brazoI = golpeando;
    else p.brazoD = golpeando;
    p.adelante = t < impacto ? -0.08 * antes : 0.28;
    if (c.gesto === 'empellon') {
      p.brazoD = golpeando;
      p.brazoI = golpeando;
    }
    if (c.gesto === 'cierre' || c.gesto === 'replica') p.piernaD = t < impacto ? 0 : 0.9 * Math.max(0, 1 - despues / 300);
    return p;
  }
  switch (c.gesto) {
    case 'quiebro':
    case 'quiebro-torpe':
      p.bajada = 0.22 * Math.sin(Math.min(1, e / 450) * Math.PI);
      p.lado = 0.42 * Math.sin(Math.min(1, e / 450) * Math.PI);
      p.brazoD = 0.5;
      p.brazoI = 0.5;
      break;
    case 'tocado':
      p.adelante = -0.3 * Math.max(0, 1 - e / 500);
      p.brazoD = -0.4;
      p.brazoI = -0.3;
      break;
    case 'descolocado':
      p.lado = 0.18 * Math.sin(e / 70);
      p.adelante = 0.15;
      break;
    case 'derribado':
    case 'desconectado':
      p.caida = -Math.min(1, e / 260) * (Math.PI / 2 - 0.08);
      p.bajada = Math.min(1, e / 260) * 0.2;
      p.brazoD = 1.2;
      p.brazoI = 0.9;
      break;
    case 'levantarse':
      p.caida = -(1 - Math.min(1, e / 500)) * (Math.PI / 2);
      break;
    case 'desalojable':
      p.bajada = 0.55;
      p.adelante = 0.35;
      p.brazoD = -0.2 + 0.1 * Math.sin(e / 90);
      p.brazoI = -0.2;
      p.piernaD = 1.3;
      p.piernaI = -0.2;
      break;
    case 'rematar':
    case 'rescatar':
      p.bajada = 0.35;
      p.adelante = 0.45;
      p.brazoD = 1.0;
      p.brazoI = 0.9;
      p.piernaD = 0.9;
      break;
    case 'descolgar':
      p.brazoD = 2.4;
      break;
    case 'absorber':
      p.brazoD = 2.6;
      p.brazoI = 2.6;
      break;
    case 'apuntar':
    case 'disparar':
    case 'cargar-rayo':
    case 'lanzar-rayo':
      p.brazoD = Math.PI / 2;
      break;
    case 'imprimirse':
      p.alto = Math.max(0.02, Math.min(1, e / 1200));
      break;
    case 'salir':
      p.alto = Math.max(0.02, 1 - e / 900);
      break;
    case 'guardia':
      p.brazoD = 1.1;
      p.brazoI = 1.1;
      break;
    case 'victoria':
      p.brazoD = 2.8;
      break;
    default:
      break;
  }
  return p;
}

export function SiluetasProvisionales({ fuente, barrio, presentado }: PropsDelPintorDeCuerpos): JSX.Element {
  const partes = useMemo(() => {
    const piezas: Pieza[] = [
      { nombre: 'tronco', geometria: capsula(0.2, 0.42) },
      { nombre: 'cabeza', geometria: new THREE.SphereGeometry(0.125, 10, 8) },
      { nombre: 'faldon', geometria: new THREE.CylinderGeometry(0.21, 0.3, 0.62, 10, 1, true) },
      { nombre: 'piernaD', geometria: capsula(0.085, 0.72) },
      { nombre: 'piernaI', geometria: capsula(0.085, 0.72) },
      { nombre: 'brazoD', geometria: capsula(0.065, 0.54) },
      { nombre: 'brazoI', geometria: capsula(0.065, 0.54) },
    ];
    /*
     * Un poco de luz propia: la calle de noche sólo alumbra de cerca, y una figura negra contra el
     * asfalto negro se lee por el contorno y nada más. Con esto la ropa se distingue a media distancia.
     */
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.05, emissive: 0x1c2224, emissiveIntensity: 1 });
    nieblaEn(material);
    const mallas = piezas.map((p) => {
      const m = new THREE.InstancedMesh(p.geometria, material, CUERPOS_COMO_MUCHO);
      m.name = `silueta-${p.nombre}`;
      m.count = 0;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, new THREE.Color(0xffffff));
      return m;
    });
    /* El casco de contorno: una cápsula del alto del cuerpo, por detrás y en color plano. */
    const materialDelContorno = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, fog: false });
    const contorno = new THREE.InstancedMesh(capsula(0.235, 1.34), materialDelContorno, CUERPOS_COMO_MUCHO);
    contorno.name = 'silueta-contorno';
    contorno.count = 0;
    contorno.frustumCulled = false;
    contorno.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    contorno.setColorAt(0, new THREE.Color(0xffffff));
    /* Los durmientes: un cuerpo y una cabeza, grises de madrugada. */
    const materialDeCivil = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, emissive: 0x15191a, emissiveIntensity: 1 });
    nieblaEn(materialDeCivil);
    const civiles = new THREE.InstancedMesh(capsula(0.2, 1.15), materialDeCivil, DURMIENTES);
    civiles.name = 'durmientes-cuerpo';
    const cabezas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), materialDeCivil, DURMIENTES);
    cabezas.name = 'durmientes-cabeza';
    for (const m of [civiles, cabezas]) {
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
    }
    const color = new THREE.Color();
    for (let i = 0; i < DURMIENTES; i++) {
      color.setHex(ROPA_DE_CIVIL[i % ROPA_DE_CIVIL.length] as number);
      civiles.setColorAt(i, color);
      color.setHex(PIEL);
      cabezas.setColorAt(i, color);
    }
    return { piezas, mallas, contorno, civiles, cabezas, material, materialDelContorno, materialDeCivil };
  }, []);

  useEffect(
    () => () => {
      for (const p of partes.piezas) p.geometria.dispose();
      partes.contorno.geometry.dispose();
      partes.civiles.geometry.dispose();
      partes.cabezas.geometry.dispose();
      partes.material.dispose();
      partes.materialDelContorno.dispose();
      partes.materialDeCivil.dispose();
    },
    [partes],
  );

  const tmp = useRef({
    raiz: new THREE.Object3D(),
    pieza: new THREE.Object3D(),
    matriz: new THREE.Matrix4(),
    color: new THREE.Color(),
    pose: poseNueva(),
    plano: new Int32Array(DURMIENTES * 4),
    siguiente: new Int32Array(DURMIENTES * 4),
  });

  useFrame((estado) => {
    const t = performance.now();
    const x = tmp.current;
    const cuerpos = fuente.cuerpos();
    const yo = fuente.yo();
    const camara = estado.camera.position;
    const malla = (k: number): THREE.InstancedMesh => partes.mallas[k] as THREE.InstancedMesh;
    const tronco = malla(0);
    const cabeza = malla(1);
    const faldon = malla(2);
    const piernaD = malla(3);
    const piernaI = malla(4);
    const brazoD = malla(5);
    const brazoI = malla(6);
    let n = 0;
    for (const c of cuerpos) {
      if (n >= CUERPOS_COMO_MUCHO) break;
      const tPose = c.id === yo ? t : presentado(t);
      const p = poseDe(c, tPose, x.pose);
      const raiz = x.raiz;
      raiz.position.set(c.x, -p.bajada, c.z);
      raiz.rotation.set(0, 0, 0);
      /* El rumbo de la Liza: 0 al norte (−z), creciendo al este; en three es girar al revés. */
      raiz.rotation.order = 'YXZ';
      raiz.rotation.y = -c.rumbo;
      raiz.rotation.x = -p.adelante + p.caida;
      raiz.rotation.z = p.lado;
      raiz.scale.set(1, p.alto, 1);
      raiz.updateMatrix();
      /* Cada pieza, en el marco de los pies. */
      const poner = (malla: THREE.InstancedMesh, px: number, py: number, pz: number, rx: number): void => {
        const q = x.pieza;
        q.position.set(px, py, pz);
        q.rotation.set(rx, 0, 0);
        q.scale.set(1, 1, 1);
        q.updateMatrix();
        x.matriz.multiplyMatrices(raiz.matrix, q.matrix);
        malla.setMatrixAt(n, x.matriz);
      };
      /* Los miembros cuelgan de su articulación: se giran alrededor de ella, no de su centro. */
      const miembro = (malla: THREE.InstancedMesh, ax: number, ay: number, largo: number, angulo: number): void => {
        const mitad = largo / 2 + 0.07;
        poner(malla, ax, ay - Math.cos(angulo) * mitad, -Math.sin(angulo) * mitad, angulo);
      };
      poner(tronco, 0, 1.22, 0, 0);
      poner(cabeza, 0, 1.66, 0, 0);
      poner(faldon, 0, 0.82, 0, 0);
      miembro(piernaD, 0.11, 0.92, 0.72, p.piernaD);
      miembro(piernaI, -0.11, 0.92, 0.72, p.piernaI);
      miembro(brazoD, 0.27, 1.44, 0.54, p.brazoD);
      miembro(brazoI, -0.27, 1.44, 0.54, p.brazoI);

      /* El color de la ropa por clase y variante; el faldón es la gabardina de los desvelados. */
      const ropa =
        c.clase === 'desvelado'
          ? (ABRIGOS[c.variante % ABRIGOS.length] as number)
          : c.clase === 'prestado'
            ? (ROPA_DE_CIVIL[c.variante % ROPA_DE_CIVIL.length] as number)
            : (TRAJES[c.variante % TRAJES.length] as number);
      x.color.setHex(ropa);
      if (c.tenue) x.color.multiplyScalar(0.45);
      for (const m of [tronco, faldon, piernaD, piernaI, brazoD, brazoI]) m.setColorAt(n, x.color);
      x.color.setHex(PIEL);
      cabeza.setColorAt(n, x.color);

      /* El contorno, que engorda con la distancia para seguir leyéndose a 60 m. */
      const lejos = Math.hypot(camara.x - c.x, camara.y - 1, camara.z - c.z);
      const grosor = 1 + Math.min(0.35, 0.02 + lejos * 0.0045);
      const q = x.pieza;
      q.position.set(0, 0.93, 0);
      q.rotation.set(0, 0, 0);
      q.scale.set(grosor, 1 + (grosor - 1) * 0.35, grosor);
      q.updateMatrix();
      x.matriz.multiplyMatrices(raiz.matrix, q.matrix);
      partes.contorno.setMatrixAt(n, x.matriz);
      const tinte = c.color !== null ? x.color.set(c.color) : x.color.setHex(CONTORNO_DE_CLASE[c.clase === 'desvelado' ? 'prestado' : c.clase]);
      if (!c.contorno) tinte.multiplyScalar(0);
      partes.contorno.setColorAt(n, tinte);
      n++;
    }
    for (const m of partes.mallas) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor !== null) m.instanceColor.needsUpdate = true;
    }
    partes.contorno.count = n;
    partes.contorno.instanceMatrix.needsUpdate = true;
    if (partes.contorno.instanceColor !== null) partes.contorno.instanceColor.needsUpdate = true;

    /* Los durmientes, entre su tic y el siguiente para que no anden a saltos de 50 ms. */
    if (barrio === null) {
      partes.civiles.count = 0;
      partes.cabezas.count = 0;
      return;
    }
    const tic = fuente.ticDeLosDurmientes();
    const base = Math.floor(tic);
    const f = tic - base;
    escribirLosDurmientes(barrio, base, x.plano);
    escribirLosDurmientes(barrio, base + 1, x.siguiente);
    const prestados = fuente.prestados();
    let k = 0;
    for (let i = 0; i < DURMIENTES; i++) {
      if (prestados.has(i)) continue;
      const ax = (x.plano[i * 4] as number) / UNO;
      const az = (x.plano[i * 4 + 1] as number) / UNO;
      const bx = (x.siguiente[i * 4] as number) / UNO;
      const bz = (x.siguiente[i * 4 + 1] as number) / UNO;
      const rumbo = (((x.plano[i * 4 + 2] as number) % RUMBOS) / RUMBOS) * Math.PI * 2;
      const anda = x.plano[i * 4 + 3] === 1;
      const px = Math.abs(bx - ax) < 2 ? ax + (bx - ax) * f : ax;
      const pz = Math.abs(bz - az) < 2 ? az + (bz - az) * f : az;
      const vaiven = anda ? Math.abs(Math.sin((t / 1000) * 5.5 + i)) * 0.04 : 0;
      const r = x.raiz;
      r.position.set(px, 0.78 + vaiven, pz);
      r.rotation.set(0, -rumbo, 0);
      r.scale.set(1, 1, 1);
      r.updateMatrix();
      partes.civiles.setMatrixAt(k, r.matrix);
      r.position.set(px, 1.6 + vaiven, pz);
      r.updateMatrix();
      partes.cabezas.setMatrixAt(k, r.matrix);
      k++;
    }
    partes.civiles.count = k;
    partes.cabezas.count = k;
    partes.civiles.instanceMatrix.needsUpdate = true;
    partes.cabezas.instanceMatrix.needsUpdate = true;
  }, -1);

  return (
    <group name="siluetas-provisionales">
      {partes.mallas.map((m) => (
        <primitive key={m.name} object={m} />
      ))}
      <primitive object={partes.contorno} />
      <primitive object={partes.civiles} />
      <primitive object={partes.cabezas} />
    </group>
  );
}
