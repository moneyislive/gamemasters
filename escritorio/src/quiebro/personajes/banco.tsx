/**
 * EL BANCO DE LOS PERSONAJES: una calle de madrugada con todas las figuras en fila, un cuerpo que anda
 * en círculo y la multitud de una noche de verdad.
 *
 * ═══ QUÉ SE JUZGA AQUÍ, QUE ES LO QUE NO SE PUEDE CONTAR ═══
 *
 *   · Que cada gesto se ve como lo que es (la Tanda no parece un maniquí, el quiebro a la derecha pisa a
 *     la derecha, el derribado cae y el levantarse empalma sin salto).
 *   · Que el pie NO PATINA: el cuerpo que anda en círculo va a la velocidad del deslizador, de parado a
 *     correr, y el pie de apoyo tiene que quedarse clavado en el suelo mientras el cuerpo pasa.
 *   · Que el contorno se lee: el color del asiento en los desvelados, el filo rayado del código en los
 *     enemigos, y a 60 m (el botón «60 m») una figura de color que se distingue bajo la lluvia.
 *   · Que la multitud anda a su paso, se para en los semáforos y lleva el paraguas.
 *   · Que lo que se pinta cabe en su renglón: el panel pone al lado lo medido (llamadas y triángulos
 *     de este fotograma), el peor caso declarado del nivel y la cuota.
 *   · Que los cuerpos LEJANOS (la cámara «20 m» en N0 o N1: las filas van en rebaño de textura de
 *     huesos) hacen su gesto y no el reposo, se imprimen de abajo arriba y salen tenues como los de
 *     cerca. `__banco.pixelesDe(id)` cuenta lo que un cuerpo pone en pantalla (pintando el fotograma con
 *     los personajes y sin ellos): así se mide lo tenue y el corte sin fiarse del ojo.
 *
 * ═══ EL RAYO ═══
 *
 * Con `?rayo=1` (o el botón «rayo») la fila hace el rayo entero una y otra vez: carga (`cargar-rayo`, con `carga`
 * subiendo de 0 a 1 en `?cargams=` ms, 1300 por omisión, o fija con `?carga=0.5`) durante `?sostener=` ms (1800) y
 * lanza (`lanzar-rayo`, con el impacto en el instante de soltar, como lo pone el juego). `?congelar=T` para el reloj de
 * la fila T ms después de soltar (negativo: durante la carga), para fotografiar un fotograma: la pose, el brazo apuntado
 * y el temblor se quedan quietos. `?tras=260` vuelve al reposo a los 260 ms del destello (lo que hace el juego) y
 * `?dejar=1` suelta la carga sin lanzar; `?repetir=1` hace la secuencia entera hasta el instante congelado (la espera del
 * chispazo, la salida). `?mirar=x,y,z,tx,ty,tz` pone la cámara. `__banco.boca(id)` da la boca del rayo de un
 * cuerpo (la palma derecha: `DirectorDeLosPersonajes.bocaDe`) y `__banco.puntoEnPantalla(x,y,z)` dónde cae en el lienzo;
 * con `?boca=1` se pinta una bolita en cada boca, para ver en la foto que la mano está donde nace el rayo.
 *
 * ═══ SIN SERVIDOR ═══
 *
 * Los cuerpos los escribe el banco en una `FuenteDeCuerpos` como la del juego (`cuerpos.ts`), en su
 * propio `useFrame` antes que el de los personajes. `window.__banco` deja lo mismo a mano para un robot:
 * poner un gesto, un nivel, una cámara, y leer lo medido.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { barrioDeLaNoche } from '../../../../shared/arcade/juegos/quiebro-barrio';
import type { Barrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import { nieblaEn, ponerLaNiebla } from '../atmosfera/niebla';
import { LaCiudadDeNoche } from '../ciudad/LaCiudadDeNoche';
import type { CuerpoPintado, FuenteDeCuerpos, Gesto } from '../cuerpos';
import { crearRelojDePresentacion } from '../efectos/reloj';
import { CuerposDelQuiebro } from './CuerposDelQuiebro';
import type { DirectorDeLosPersonajes } from './director';
import { GESTOS, INFO_DE_GESTOS } from './gestos';
import { renglonDeLosPersonajes } from './presupuesto';
import type { Nivel } from './presupuesto';

/* ─────────────────────────────── Lo que hay en la calle ─────────────────────────────── */

/** Los colores de asiento del juego (`red/partida.ts`), copiados para no traerse la red entera. */
const COLORES_DE_ASIENTO = ['#ff4d6d', '#46c8ff', '#b4ff4a', '#c38bff', '#ff9a3c', '#fff04d'];
/** El que anda en círculo: es el propio (asiento 1). */
const ANDARIN = 1;
const RADIO_DEL_CIRCULO = 4.5;
const CENTRO_DEL_CIRCULO = new THREE.Vector3(0, 0, 1);
/** Los de las filas miran al sur (+z), hacia la cámara. */
const MIRANDO_A_LA_CAMARA = Math.PI;

type Hacia = 'derecha' | 'izquierda' | 'atras' | 'delante';

/** A qué velocidad «anda» la fila cuando se le pide un gesto de marcha (sin moverse del sitio). */
const VELOCIDAD_DE_LA_MARCHA: Partial<Record<Gesto, number>> = { andar: 1.6, trotar: 4.2, correr: 6.8 };

function cuerpo(id: number, clase: CuerpoPintado['clase'], variante: number, x: number, z: number): CuerpoPintado {
  return {
    id,
    clase,
    variante,
    color: clase === 'desvelado' ? (COLORES_DE_ASIENTO[(id - 1) % COLORES_DE_ASIENTO.length] as string) : null,
    x,
    z,
    rumbo: MIRANDO_A_LA_CAMARA,
    velocidad: 0,
    gesto: 'reposo',
    gestoDesdeMs: 0,
    impactoMs: null,
    direccionDelGesto: null,
    contorno: true,
    tenue: false,
  };
}

/** El escenario del banco: los cuerpos y lo que se les manda. Sin React. */
/**
 * El rayo de la fila: cuánto tarda la carga en llenarse, cuánto se sostiene, la carga fija (o `null`), el instante
 * congelado (o `null`), y lo que manda el juego después de soltar: el reposo a los `tras` ms del destello, o `dejar` la
 * carga sin lanzar.
 */
interface RayoDelBanco {
  cargaMs: number;
  sostenerMs: number;
  carga: number | null;
  congelar: number | null;
  tras: number | null;
  dejar: boolean;
}

class Escenario implements FuenteDeCuerpos {
  readonly lista: CuerpoPintado[] = [];
  readonly fila: CuerpoPintado[] = [];
  readonly andarin: CuerpoPintado;
  velocidad = 1.3;
  angulo = 0;
  gesto: Gesto = 'reposo';
  hacia: Hacia = 'derecha';
  anuncioMs = 400;
  repetir = true;
  tenue = false;
  contorno = true;
  conMultitud = true;
  /** El rayo de la fila (ver «El rayo» en la cabecera), o `null`. */
  rayo: RayoDelBanco | null = null;
  private inicioDelRayo = Number.NaN;
  /** Si la fila ya se pinta (con esqueleto o en su rebaño): lo pone el lienzo en cada fotograma. */
  listo = false;
  /** Si el reloj de la fila está parado (`?congelar=`), en qué instante; si no, `null`. */
  congelado: number | null = null;
  private proximo = 0;
  readonly reloj = crearRelojDePresentacion();
  private readonly sinPrestados = new Set<number>();

  constructor() {
    this.andarin = cuerpo(ANDARIN, 'desvelado', 1, CENTRO_DEL_CIRCULO.x + RADIO_DEL_CIRCULO, CENTRO_DEL_CIRCULO.z);
    /* Fila 1: los desvelados 2-6 (tres estilos × dos sexos, con el andarín). */
    for (let id = 2; id <= 6; id++) this.fila.push(cuerpo(id, 'desvelado', id % 3, (id - 4) * 2.2, -5));
    /* Fila 2: las cuatro siluetas de Celador y un tirador. */
    for (let k = 0; k < 4; k++) this.fila.push(cuerpo(16 + k, 'celador', (16 + k) % 4, (k - 2) * 2.2, -8.5));
    this.fila.push(cuerpo(20, 'tirador', 20 % 4, 2 * 2.2, -8.5));
    /* Fila 3: Prestados, cada uno con la ropa de su durmiente. */
    [0, 7, 13, 30, 41].forEach((d, k) => this.fila.push(cuerpo(24 + k, 'prestado', d, (k - 2) * 2.2, -12)));
    this.lista.push(this.andarin, ...this.fila);
  }

  cuerpos(): readonly CuerpoPintado[] {
    return this.lista;
  }
  prestados(): ReadonlySet<number> {
    /* Los durmientes de la fila de Prestados no se pintan como civiles: son ellos. */
    return this.conMultitud ? this.sinPrestados : new Set(Array.from({ length: 48 }, (_, i) => i));
  }
  ticDeLosDurmientes(): number {
    return performance.now() / 50;
  }
  yo(): number | null {
    return ANDARIN;
  }

  /** Manda un gesto a la fila (todos a la vez, con un pequeño escalón para verlos desfasados). */
  ponerGesto(g: Gesto, ahora: number): void {
    this.gesto = g;
    this.proximo = 0;
    this.lanzar(ahora);
  }

  private lanzar(ahora: number): void {
    const info = INFO_DE_GESTOS[this.gesto];
    const giro = this.hacia === 'derecha' ? Math.PI / 2 : this.hacia === 'izquierda' ? -Math.PI / 2 : this.hacia === 'atras' ? Math.PI : 0;
    this.fila.forEach((c, i) => {
      c.gesto = this.gesto;
      c.gestoDesdeMs = ahora + i * 35;
      c.impactoMs = info.tipo === 'golpe' ? c.gestoDesdeMs + this.anuncioMs : null;
      c.direccionDelGesto = info.direccion === 'clip' ? c.rumbo + giro : info.direccion === 'cuerpo' ? c.rumbo : null;
      c.velocidad = VELOCIDAD_DE_LA_MARCHA[this.gesto] ?? 0;
    });
    const una = info.tipo === 'una-vez' || info.tipo === 'golpe' || info.tipo === 'sostenido';
    this.proximo = una && this.repetir ? ahora + 2200 : 0;
  }

  /** El reloj de la fila: el de presentación, parado en `congelado` si se pidió. */
  presentado(t: number): number {
    const p = this.reloj.presentado(t);
    return this.congelado !== null ? Math.min(p, this.congelado) : p;
  }

  /** El rayo de la fila en `tp` (su reloj): carga, suelta en `sostenerMs` y vuelve a empezar 1,6 s después. */
  private moverElRayo(tp: number): void {
    const r = this.rayo;
    if (r === null) return;
    if (Number.isNaN(this.inicioDelRayo) && r.congelar !== null) {
      /*
       * CONGELADO DESDE EL PRINCIPIO: el reloj de la fila se para YA, en el instante pedido, y la carga empezó justo lo
       * que haga falta antes. Así cada cuerpo entra directamente en su gesto y en su segundo (sin fundido desde el
       * reposo, que con el reloj parado no avanzaría) y la foto no depende de cuánto tiempo pase en Edge sin ventana,
       * que con tiempo virtual casi no pasa mientras carga.
       */
      this.congelado = tp;
      this.inicioDelRayo = tp - r.sostenerMs - r.congelar;
    } else if (Number.isNaN(this.inicioDelRayo) || (this.congelado === null && tp > this.inicioDelRayo + r.sostenerMs + 1600)) {
      this.inicioDelRayo = tp;
    }
    this.rayoEn(tp);
  }

  /**
   * Lo que manda el juego a la fila en `tp` (su reloj): la carga hasta soltar; luego el lanzar, y el reposo a los `tras`
   * ms del destello si se pidió (lo que hace el juego: `COLA_DEL_GOLPE_MS`); o, con `dejar`, el reposo al soltar (dejar
   * la carga sin lanzar). Antes de la carga, el reposo.
   */
  private rayoEn(tp: number): void {
    const r = this.rayo;
    if (r === null) return;
    const inicio = this.inicioDelRayo;
    const suelta = inicio + r.sostenerMs;
    const reposoDesde = r.dejar ? suelta : r.tras !== null ? suelta + r.tras : Number.POSITIVE_INFINITY;
    for (const c of this.fila) {
      if (tp < inicio) {
        c.gesto = 'reposo';
        c.gestoDesdeMs = inicio - 60000;
        c.impactoMs = null;
        c.carga = 0;
        c.direccionDelGesto = null;
      } else if (tp < suelta) {
        c.gesto = 'cargar-rayo';
        c.gestoDesdeMs = inicio;
        c.impactoMs = null;
        c.carga = r.carga ?? Math.min(1, Math.max(0, (tp - inicio) / r.cargaMs));
        c.direccionDelGesto = c.rumbo;
      } else if (tp >= reposoDesde) {
        c.gesto = 'reposo';
        c.gestoDesdeMs = reposoDesde;
        c.impactoMs = null;
        c.carga = 0;
        c.direccionDelGesto = null;
      } else {
        c.gesto = 'lanzar-rayo';
        c.gestoDesdeMs = suelta;
        c.impactoMs = suelta;
        c.carga = 0;
        c.direccionDelGesto = c.rumbo;
      }
      c.velocidad = 0;
    }
  }

  /**
   * LA SECUENCIA DE VERDAD, HASTA LA FOTO (`?repetir=1` con `?congelar=`). Congelado sin más, cada cuerpo entra directo en
   * su gesto y su segundo, y no se ve lo que pasa ENTRE gestos (la espera del chispazo, la salida, los fundidos). Con
   * `repetir`, en cuanto la fila se pinta, el director hace la secuencia entera a 60 Hz desde 1,5 s antes de la carga
   * hasta el instante congelado, como la haría el juego, y la foto es la de ese fotograma.
   */
  secuenciaHecha = false;
  hacerLaSecuencia(fotograma: (t: number) => void): void {
    const r = this.rayo;
    if (r === null || this.congelado === null || this.secuenciaHecha) return;
    const fin = this.congelado;
    for (let tp = this.inicioDelRayo - 1500; tp < fin; tp += 1000 / 60) {
      this.rayoEn(tp);
      fotograma(tp);
    }
    this.rayoEn(fin);
    fotograma(fin);
    this.secuenciaHecha = true;
  }

  /** El reloj de la fila respecto a la suelta del rayo (ms; negativo mientras carga), o NaN. */
  relojDelRayo(tp: number): number {
    return this.rayo === null ? Number.NaN : tp - (this.inicioDelRayo + this.rayo.sostenerMs);
  }

  /** Pone o quita el rayo de la fila. */
  ponerRayo(r: RayoDelBanco | null): void {
    this.rayo = r;
    this.inicioDelRayo = Number.NaN;
    this.congelado = null;
    if (r === null) this.ponerGesto(this.gesto, performance.now());
  }

  /** Un fotograma: el andarín da vueltas, la fila repite su gesto si toca. */
  mover(ahora: number, dtS: number): void {
    this.angulo += (this.velocidad / RADIO_DEL_CIRCULO) * dtS;
    const a = this.angulo;
    const c = this.andarin;
    c.x = CENTRO_DEL_CIRCULO.x + Math.cos(a) * RADIO_DEL_CIRCULO;
    c.z = CENTRO_DEL_CIRCULO.z + Math.sin(a) * RADIO_DEL_CIRCULO;
    /* Hacia donde va: la tangente (dx, dz) = (−sin, cos); en rumbo (0 al norte, creciendo al este). */
    c.rumbo = Math.atan2(-Math.sin(a), -Math.cos(a));
    c.velocidad = this.velocidad;
    c.gesto = this.velocidad > 6 ? 'correr' : this.velocidad > 3 ? 'trotar' : this.velocidad > 0.3 ? 'andar' : 'reposo';
    if (this.rayo !== null) this.moverElRayo(this.presentado(ahora));
    else if (this.proximo > 0 && ahora >= this.proximo) this.lanzar(ahora);
    for (const x of this.lista) {
      x.tenue = this.tenue && x !== c;
      x.contorno = this.contorno;
    }
  }
}

/* ─────────────────────────────── La calle ─────────────────────────────── */

const LLUVIA_VERTICE = /* glsl */ `
uniform float uT;
attribute float aFase;
varying float vA;
void main() {
  vec3 p = position;
  float y = mod(p.y - uT * 11.0 + aFase * 14.0, 14.0);
  vec3 q = vec3(p.x, y, p.z);
  vA = aFase;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
}`;
const LLUVIA_FRAGMENTO = /* glsl */ `
varying float vA;
void main() { gl_FragColor = vec4(0.62, 0.74, 0.7, 0.22 + 0.12 * vA); }`;

function Lluvia(): JSX.Element {
  const { geometria, material } = useMemo(() => {
    const n = 2400;
    const pos = new Float32Array(n * 6);
    const fase = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40 - 4;
      const y = Math.random() * 14;
      pos.set([x, y, z, x + 0.02, y + 0.45, z], i * 6);
      const f = Math.random();
      fase[i * 2] = f;
      fase[i * 2 + 1] = f;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
    const m = new THREE.ShaderMaterial({ vertexShader: LLUVIA_VERTICE, fragmentShader: LLUVIA_FRAGMENTO, transparent: true, depthWrite: false, uniforms: { uT: { value: 0 } } });
    return { geometria: g, material: m };
  }, []);
  useFrame(() => {
    (material.uniforms.uT as THREE.IUniform).value = performance.now() / 1000;
  });
  return <lineSegments geometry={geometria} material={material} frustumCulled={false} />;
}

function Farola({ x, z }: { readonly x: number; readonly z: number }): JSX.Element {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 5.2, 6]} />
        <meshStandardMaterial color="#1a1b1c" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0, 5.15, 0]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshBasicMaterial color="#ffb060" />
      </mesh>
      <pointLight position={[0, 5, 0]} color="#ff9a3c" intensity={32} distance={24} decay={2} />
    </group>
  );
}

function Calle(): JSX.Element {
  const { scene } = useThree();
  const suelo = useRef<THREE.Mesh>(null);
  const fachadas = useRef<THREE.Group>(null);
  useEffect(() => {
    ponerLaNiebla(scene, 'llovizna');
    for (const o of [suelo.current, fachadas.current]) {
      o?.traverse((x) => {
        const m = (x as THREE.Mesh).material;
        if (m instanceof THREE.Material) nieblaEn(m);
      });
    }
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  const ventanas = useMemo(() => {
    const salida: { x: number; y: number; z: number; ancho: number; encendida: boolean }[] = [];
    for (let k = 0; k < 18; k++) {
      for (let p = 1; p < 5; p++) {
        salida.push({ x: -17 + k * 2, y: p * 3.2, z: -21.9, ancho: 0.9, encendida: (k * 7 + p * 3) % 5 === 0 });
      }
    }
    return salida;
  }, []);
  return (
    <group>
      <mesh ref={suelo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]}>
        <planeGeometry args={[70, 60]} />
        <meshStandardMaterial color="#0d1112" roughness={0.5} metalness={0.05} />
      </mesh>
      <group ref={fachadas}>
        <mesh position={[0, 0.08, -18]}>
          <boxGeometry args={[40, 0.16, 6]} />
          <meshStandardMaterial color="#1b1d1e" roughness={0.8} />
        </mesh>
        <mesh position={[0, 7, -24]}>
          <boxGeometry args={[40, 14, 4]} />
          <meshStandardMaterial color="#141718" roughness={0.9} />
        </mesh>
        <mesh position={[-22, 7, -6]}>
          <boxGeometry args={[4, 14, 40]} />
          <meshStandardMaterial color="#121516" roughness={0.9} />
        </mesh>
        {ventanas.map((v, i) => (
          <mesh key={i} position={[v.x, v.y, v.z]}>
            <planeGeometry args={[v.ancho, 1.3]} />
            <meshBasicMaterial color={v.encendida ? '#e8c27a' : '#101418'} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <Farola x={-5} z={-3} />
      <Farola x={6} z={-10} />
      <Farola x={-3} z={-15} />
      <hemisphereLight args={['#2c4541', '#050606', 0.9]} />
      <directionalLight position={[-8, 12, 6]} intensity={0.35} color="#9fc3c0" />
      {/* `?luz=estudio`: luz de sobra para juzgar una pose en una foto (no es la de la calle) */}
      {parametro('luz') === 'estudio' ? (
        <>
          <directionalLight position={[6, 8, 10]} intensity={2.2} color="#ffffff" />
          <directionalLight position={[-10, 5, -4]} intensity={1.1} color="#cfe0ff" />
          <ambientLight intensity={0.5} />
        </>
      ) : null}
      <Lluvia />
    </group>
  );
}

/* ─────────────────────────────── Cámaras ─────────────────────────────── */

export type Camara = 'cerca' | 'fila' | 'lejos' | '60' | 'cenital';

const CAMARAS: Readonly<Record<Camara, { desde: [number, number, number]; hacia: [number, number, number] }>> = {
  cerca: { desde: [2.2, 1.75, 1.2], hacia: [0, 1.1, -5] },
  fila: { desde: [0, 3, 7.5], hacia: [0, 1, -8] },
  /* Las filas a 17-24 m: en N0 van todas en rebaño (sólo llevan esqueleto los de menos de 12 m). */
  lejos: { desde: [0, 1.75, 12], hacia: [0, 1, -8.5] },
  '60': { desde: [0, 1.75, 51], hacia: [0, 1, -8.5] },
  cenital: { desde: [0, 45, 30], hacia: [0, 0, -2] },
};

function Mando({ camara, control }: { readonly camara: Camara; readonly control: { current: OrbitControls | null } }): null {
  const { camera, gl } = useThree();
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    control.current = c;
    return () => {
      c.dispose();
      control.current = null;
    };
  }, [camera, gl, control]);
  useEffect(() => {
    const p = CAMARAS[camara];
    camera.position.set(...p.desde);
    control.current?.target.set(...p.hacia);
    control.current?.update();
  }, [camara, camera]);
  useFrame(() => control.current?.update());
  return null;
}

/* ─────────────────────────────── El lienzo ─────────────────────────────── */

interface Lectura {
  llamadas: number;
  triangulos: number;
  yendose: number;
  porHornear: number;
  glLlamadas: number;
  glTriangulos: number;
  conEsqueleto: number;
  multitud: number;
  paraguas: number;
  enRebano: number;
  fps: number;
  lods: Record<string, number>;
  horneados: string;
  errores: readonly string[];
  impacto: string;
  pesos: string;
}

function Mundo({
  escenario,
  nivel,
  barrio,
  ciudad,
  alDirector,
  alLeer,
}: {
  readonly escenario: Escenario;
  readonly nivel: Nivel;
  readonly barrio: Barrio;
  readonly ciudad: boolean;
  readonly alDirector: (d: DirectorDeLosPersonajes | null) => void;
  readonly alLeer: (l: Lectura) => void;
}): JSX.Element {
  const director = useRef<DirectorDeLosPersonajes | null>(null);
  const { gl, scene, camera } = useThree();
  const muestras = useRef({ n: 0, t: 0, impacto: '—', antes: -1 });
  /*
   * LO QUE UN CUERPO PONE EN PANTALLA: se pinta el fotograma sin los personajes y con ellos, y se cuentan
   * los píxeles que cambian en un recuadro alrededor del cuerpo. Con `?leer=1` (el lienzo guarda lo
   * pintado). Para medir lo tenue y el corte de los lejanos sin fiarse del ojo.
   */
  useEffect(() => {
    const w = window as unknown as { __pixeles?: (id: number) => number };
    w.__pixeles = (id: number): number => {
      const d = director.current;
      const c = escenario.lista.find((x) => x.id === id);
      if (d === null || c === undefined) return -1;
      const p = new THREE.Vector3(c.x, 0.9, c.z).project(camera);
      const ancho = gl.domElement.width;
      const alto = gl.domElement.height;
      const cx = Math.round(((p.x + 1) / 2) * ancho);
      const cy = Math.round(((p.y + 1) / 2) * alto);
      const r = { x: Math.max(0, cx - 40), y: Math.max(0, cy - 70), w: 80, h: 140 };
      const leer = (): Uint8Array => {
        gl.render(scene, camera);
        const g = gl.getContext();
        const px = new Uint8Array(r.w * r.h * 4);
        g.readPixels(r.x, r.y, r.w, r.h, g.RGBA, g.UNSIGNED_BYTE, px);
        return px;
      };
      d.grupo.visible = false;
      const sin = leer();
      d.grupo.visible = true;
      const con = leer();
      let n = 0;
      for (let i = 0; i < con.length; i += 4) {
        if (Math.abs((con[i] as number) - (sin[i] as number)) + Math.abs((con[i + 1] as number) - (sin[i + 1] as number)) + Math.abs((con[i + 2] as number) - (sin[i + 2] as number)) > 24) n++;
      }
      return n;
    };
  }, [gl, scene, camera, escenario]);
  const presentado = useMemo(() => (t: number) => escenario.presentado(t), [escenario]);
  const puntoDelVigia = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const repetirLaSecuencia = parametro('repetir') === '1';
  useFrame((_e, dt) => {
    const ahora = performance.now();
    const d = director.current;
    /* La fila está lista cuando el director ya la pinta (sin nada por hornear ni cargar para ella). */
    /*
     * Con el reloj parado (una foto) el horno trabaja de sobra en cada fotograma: Edge sin ventana, con tiempo
     * virtual, da muy pocos fotogramas, y a 2,5 ms por fotograma las texturas de los lejanos (N0) no se acababan.
     */
    if (d !== null && escenario.congelado !== null && d.medida.porHornear > 0) d.almacen.trabajar(400);
    /*
     * Y mientras la fila no se pinta entera, fotogramas de más del director (con el reloj parado no mueven a nadie):
     * los rebaños de los lejanos se crean en el fotograma en que todo lo suyo está cargado y horneado, y con los
     * pocos fotogramas de Edge sin ventana no llegaban nunca.
     */
    if (d !== null && escenario.congelado !== null && !escenario.listo) {
      for (let k = 0; k < 12; k++) d.fotograma(escenario, nivel, escenario.conMultitud ? barrio : null, camera, ahora, presentado);
    }
    const vigia = escenario.fila[4];
    const pintada = d !== null && d.medida.porHornear === 0 && vigia !== undefined && d.bocaDe(vigia.id, puntoDelVigia);
    /* `?repetir=1`: con la fila ya pintada, la secuencia entera hasta el instante congelado (ver `Escenario.hacerLaSecuencia`). */
    if (pintada && d !== null && repetirLaSecuencia) escenario.hacerLaSecuencia((tp) => d.fotograma(escenario, nivel, escenario.conMultitud ? barrio : null, camera, tp, (x) => x));
    escenario.listo = pintada && (!repetirLaSecuencia || escenario.secuenciaHecha);
    escenario.mover(ahora, Math.min(0.1, dt));
    /*
     * EL RAYO, EN EL DOM (para las fotos: `--dump-dom` dice qué fotograma se pintó): el gesto de la fila, el segundo
     * de su clip, la carga y el reloj de la fila respecto a la suelta.
     */
    if (escenario.rayo !== null) {
      const ultimo = escenario.fila[4];
      const g = ultimo !== undefined ? d?.cuerpo(ultimo.id)?.gestoEnCurso() : null;
      const marca = document.documentElement;
      marca.setAttribute('data-rayo-gesto', ultimo?.gesto ?? '');
      marca.setAttribute('data-rayo-clip', g !== null && g !== undefined ? `${g.clip}@${g.tiempo.toFixed(3)}` : 'sin-esqueleto');
      marca.setAttribute('data-rayo-carga', String(ultimo?.carga ?? ''));
      marca.setAttribute('data-rayo-reloj', escenario.relojDelRayo(presentado(ahora)).toFixed(0));
      marca.setAttribute('data-rayo-listo', escenario.listo ? '1' : '0');
      const cu = ultimo !== undefined ? d?.cuerpo(ultimo.id) : null;
      marca.setAttribute('data-rayo-entre', cu === null || cu === undefined ? '' : cu.lanzarEsperando ? 'espera' : cu.enLaSalidaDelRayo ? 'salida' : '-');
      marca.setAttribute('data-rayo-cuerpos', d === null ? '' : `esqueleto ${String(d.medida.conEsqueleto)} rebano ${String(d.medida.enRebano)} por-hornear ${String(d.medida.porHornear)}`);
    }
    /* La anticipación elástica, medida: dónde va el clip del primer golpe de la fila en su impacto. */
    const primero = escenario.fila[0];
    const m = muestras.current;
    if (d !== null && primero !== undefined && primero.impactoMs !== null) {
      const g = d.cuerpo(primero.id)?.gestoEnCurso();
      const tCuerpo = presentado(ahora);
      if (g !== null && g !== undefined && g.impactoClipMs !== null && m.antes < primero.impactoMs && tCuerpo >= primero.impactoMs) {
        /* El error, en ms de reloj: lo que le falta (o le sobra) al clip para su impacto, a su ritmo. */
        const errorMs = (g.impactoClipMs / 1000 - g.tiempo) * 1000;
        m.impacto = `${g.clip}: clip en ${(g.tiempo * 1000).toFixed(0)} ms, impacto del clip ${String(g.impactoClipMs)} ms (Δ ${errorMs.toFixed(1)} ms, fotograma de ${(dt * 1000).toFixed(1)} ms)`;
      }
      m.antes = tCuerpo;
    }
  }, -2);
  useFrame((_e, dt) => {
    const m = muestras.current;
    m.n++;
    m.t += dt;
    if (m.t < 0.5) return;
    const d = director.current;
    const r = gl.info.render;
    const primero = escenario.fila[0];
    const c = d !== null && primero !== undefined ? d.cuerpo(primero.id) : null;
    if (d !== null) {
      alLeer({
        llamadas: d.medida.llamadas,
        triangulos: d.medida.triangulos,
        yendose: d.medida.yendose,
        porHornear: d.medida.porHornear,
        glLlamadas: r.calls,
        glTriangulos: r.triangles,
        conEsqueleto: d.medida.conEsqueleto,
        multitud: d.medida.multitud,
        paraguas: d.medida.paraguas,
        enRebano: d.medida.enRebano,
        fps: m.n / m.t,
        lods: d.lodsEnUso(),
        horneados: d.medida.horneados.map((h) => `${h.clave}: ${h.ms.toFixed(1)} ms, ${String(h.filas)} filas`).join(' · '),
        errores: d.medida.errores,
        impacto: m.impacto,
        pesos: c !== null ? `suma de pesos ${c.sumaDePesos().toFixed(4)}` : '',
      });
    }
    m.n = 0;
    m.t = 0;
  });
  const alDirectorPropio = (x: DirectorDeLosPersonajes | null): void => {
    director.current = x;
    alDirector(x);
  };
  return (
    <>
      {ciudad ? <LaCiudadDeNoche codigo="BANCO" noche={1} nivel={nivel} /> : <Calle />}
      <CuerposDelQuiebro fuente={escenario} nivel={nivel} barrio={escenario.conMultitud ? barrio : null} presentado={presentado} alDirector={alDirectorPropio} />
    </>
  );
}

/**
 * LAS BOCAS, A LA VISTA (`?boca=1`): una bolita en la boca del rayo de cada cuerpo de la fila, puesta cada fotograma con
 * `bocaDe` (lo mismo que leen los efectos). Si la bolita no está en la palma, la boca miente.
 */
function Bocas({ escenario, director }: { readonly escenario: Escenario; readonly director: { current: DirectorDeLosPersonajes | null } }): JSX.Element {
  const malla = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe8b0', toneMapped: false }), 32);
    m.frustumCulled = false;
    m.count = 0;
    return m;
  }, []);
  const punto = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const matriz = useMemo(() => new THREE.Matrix4(), []);
  useFrame(() => {
    const d = director.current;
    let n = 0;
    if (d !== null) {
      for (const c of escenario.fila) {
        if (n >= 32 || !d.bocaDe(c.id, punto)) continue;
        matriz.makeTranslation(punto.x, punto.y, punto.z);
        malla.setMatrixAt(n++, matriz);
      }
    }
    malla.count = n;
    malla.instanceMatrix.needsUpdate = true;
    /* (sin prioridad: una prioridad positiva en r3f le quita el pintado al lienzo; ésta corre después de los
     * personajes porque se monta después) */
  });
  return <primitive object={malla} />;
}

/* ─────────────────────────────── El panel ─────────────────────────────── */

const PANEL: CSSProperties = {
  position: 'fixed',
  top: 8,
  left: 8,
  width: 360,
  maxHeight: 'calc(100vh - 16px)',
  overflowY: 'auto',
  background: 'rgba(5,8,10,0.82)',
  color: '#cfe3de',
  font: '12px/1.45 ui-monospace, Consolas, monospace',
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid #1d3a34',
  zIndex: 2,
};
const BOTON: CSSProperties = { background: '#12211e', color: '#cfe3de', border: '1px solid #2a5a50', borderRadius: 4, padding: '2px 7px', margin: '2px 3px 2px 0', cursor: 'pointer', font: 'inherit' };
const ACTIVO: CSSProperties = { ...BOTON, background: '#2a5a50', color: '#fff' };

/** Un número de la consulta, o `defecto` si no viene o no se lee. */
function numero(nombre: string, defecto: number | null): number | null {
  const v = parametro(nombre);
  if (v === null || v.trim() === '') return defecto;
  const n = Number(v);
  return Number.isFinite(n) ? n : defecto;
}

/** El rayo que pide la consulta (`?rayo=1`), o `null`. */
function rayoDeLaConsulta(): RayoDelBanco | null {
  if (parametro('rayo') !== '1') return null;
  return {
    cargaMs: numero('cargams', 1300) ?? 1300,
    sostenerMs: numero('sostener', 1800) ?? 1800,
    carga: numero('carga', null),
    congelar: numero('congelar', null),
    tras: numero('tras', null),
    dejar: parametro('dejar') === '1',
  };
}

function parametro(nombre: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(nombre);
  } catch {
    return null;
  }
}

function Banco(): JSX.Element {
  const escenario = useMemo(() => {
    const e = new Escenario();
    e.ponerRayo(rayoDeLaConsulta());
    return e;
  }, []);
  const [conRayo, ponerConRayo] = useState(parametro('rayo') === '1');
  /* La noche 2 del código BANCO llueve (llovizna): hay paraguas. La 1 es de niebla baja, sin ellos. */
  const noche = Number(parametro('noche') ?? '2');
  const barrio = useMemo(() => barrioDeLaNoche('BANCO', Number.isInteger(noche) && noche > 0 ? noche : 2), [noche]);
  const [panel, ponerPanel] = useState(parametro('panel') !== '0');
  const nivelInicial = Number(parametro('nivel') ?? '2');
  const [nivel, ponerNivel] = useState<Nivel>((nivelInicial >= 0 && nivelInicial <= 3 ? nivelInicial : 2) as Nivel);
  const [camara, ponerCamara] = useState<Camara>((parametro('camara') as Camara | null) ?? 'fila');
  const [gesto, ponerGesto] = useState<Gesto>((parametro('gesto') as Gesto | null) ?? 'reposo');
  const [velocidad, ponerVelocidad] = useState(numero('andarin', 1.3) ?? 1.3);
  const [hacia, ponerHacia] = useState<Hacia>('derecha');
  const [ciudad, ponerCiudad] = useState(parametro('ciudad') === '1');
  const [multitud, ponerMultitud] = useState(parametro('multitud') !== '0');
  const [tenue, ponerTenue] = useState(false);
  const [contorno, ponerContorno] = useState(true);
  const [lectura, ponerLectura] = useState<Lectura | null>(null);
  const director = useRef<DirectorDeLosPersonajes | null>(null);
  const control = useRef<OrbitControls | null>(null);

  useEffect(() => {
    escenario.velocidad = velocidad;
    escenario.hacia = hacia;
    escenario.tenue = tenue;
    escenario.contorno = contorno;
    escenario.conMultitud = multitud;
  }, [escenario, velocidad, hacia, tenue, contorno, multitud]);
  useEffect(() => {
    escenario.ponerGesto(gesto, performance.now());
  }, [escenario, gesto, hacia]);

  const renglon = useMemo(() => (director.current !== null ? renglonDeLosPersonajes(director.current.reparto, nivel) : null), [nivel, lectura !== null]);

  useEffect(() => {
    (window as unknown as { __banco: unknown }).__banco = {
      gesto: (g: Gesto) => ponerGesto(g),
      nivel: (n: Nivel) => ponerNivel(n),
      camara: (c: Camara) => ponerCamara(c),
      velocidad: (v: number) => ponerVelocidad(v),
      hacia: (h: Hacia) => ponerHacia(h),
      ciudad: (s: boolean) => ponerCiudad(s),
      multitud: (s: boolean) => ponerMultitud(s),
      remanso: () => escenario.reloj.remansar(performance.now()),
      tenue: (s: boolean) => ponerTenue(s),
      /* Un teleobjetivo, para mirar de cerca lo que está lejos (el detalle lo decide la distancia, no el ángulo). */
      fov: (grados: number) => {
        const cam = control.current?.object;
        if (cam instanceof THREE.PerspectiveCamera) {
          cam.fov = grados;
          cam.updateProjectionMatrix();
        }
      },
      pixelesDe: (id: number): number => (window as unknown as { __pixeles?: (id: number) => number }).__pixeles?.(id) ?? -1,
      panel: (s: boolean) => ponerPanel(s),
      lectura: () => lectura,
      director: () => director.current,
      renglon: () => (director.current !== null ? renglonDeLosPersonajes(director.current.reparto, nivel) : null),
      mirar: (x: number, y: number, z: number, tx: number, ty: number, tz: number) => {
        const c = control.current;
        if (c === null) return;
        c.object.position.set(x, y, z);
        c.target.set(tx, ty, tz);
        c.update();
      },
      escenario,
      rayo: (s: boolean) => {
        escenario.ponerRayo(s ? { cargaMs: 1300, sostenerMs: 1800, carga: null, congelar: null, tras: 260, dejar: false } : null);
        ponerConRayo(s);
      },
      /* La boca del rayo de un cuerpo (la palma derecha), como la leen los efectos; `null` si no se pintó. */
      boca: (id: number): { x: number; y: number; z: number } | null => {
        const salida = { x: 0, y: 0, z: 0 };
        return director.current?.bocaDe(id, salida) === true ? salida : null;
      },
      puntoEnPantalla: (x: number, y: number, z: number): { x: number; y: number } | null => {
        const cam = control.current?.object;
        if (cam === undefined) return null;
        const p = new THREE.Vector3(x, y, z).project(cam);
        return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight };
      },
    };
  }, [escenario, lectura, nivel]);

  /* `?mirar=x,y,z,tx,ty,tz`: la cámara, para las fotos. */
  useEffect(() => {
    const m = parametro('mirar');
    if (m === null) return;
    const v = m.split(',').map(Number);
    if (v.length !== 6 || v.some((x) => !Number.isFinite(x))) return;
    const fov = numero('fov', null);
    const poner = (): void => {
      const c = control.current;
      if (c === null) return;
      /* `?fov=`: un teleobjetivo, para mirar de cerca a los lejanos (el detalle lo decide la distancia, no el ángulo) */
      if (fov !== null && c.object instanceof THREE.PerspectiveCamera) {
        c.object.fov = fov;
        c.object.updateProjectionMatrix();
      }
      c.object.position.set(v[0] as number, v[1] as number, v[2] as number);
      c.target.set(v[3] as number, v[4] as number, v[5] as number);
      c.update();
    };
    poner();
    const t = window.setTimeout(poner, 300);
    return () => window.clearTimeout(t);
  }, [camara]);

  const fila = (etiqueta: string, cosas: JSX.Element): JSX.Element => (
    <div style={{ margin: '5px 0' }}>
      <span style={{ color: '#7fb3a8' }}>{etiqueta} </span>
      {cosas}
    </div>
  );
  const cuota = renglon?.cuota;
  return (
    <>
      <Canvas camera={{ fov: 70, near: 0.1, far: 400, position: CAMARAS.fila.desde }} dpr={[1, 1.5]} style={{ position: 'fixed', inset: 0 }} gl={{ antialias: true, preserveDrawingBuffer: parametro('leer') === '1' }}>
        <color attach="background" args={['#05080a']} />
        <Mundo escenario={escenario} nivel={nivel} barrio={barrio} ciudad={ciudad} alDirector={(d) => (director.current = d)} alLeer={ponerLectura} />
        {parametro('boca') === '1' ? <Bocas escenario={escenario} director={director} /> : null}
        <Mando camara={camara} control={control} />
      </Canvas>
      {!panel ? (
        <button type="button" style={{ ...BOTON, position: 'fixed', top: 8, left: 8, zIndex: 2 }} onPointerDown={() => ponerPanel(true)}>
          panel
        </button>
      ) : null}
      <div style={{ ...PANEL, display: panel ? 'block' : 'none' }}>
        <div style={{ color: '#3ff2c2', fontWeight: 700, marginBottom: 4 }}>
          Personajes del Quiebro · banco{' '}
          <button type="button" style={{ ...BOTON, float: 'right' }} onPointerDown={() => ponerPanel(false)}>
            ocultar
          </button>
        </div>
        {fila(
          'Nivel',
          <>
            {([0, 1, 2, 3] as const).map((n) => (
              <button key={n} type="button" style={n === nivel ? ACTIVO : BOTON} onPointerDown={() => ponerNivel(n)}>
                N{n}
              </button>
            ))}
          </>,
        )}
        {fila(
          'Cámara',
          <>
            {(['cerca', 'fila', 'lejos', '60', 'cenital'] as const).map((c) => (
              <button key={c} type="button" style={c === camara ? ACTIVO : BOTON} onPointerDown={() => ponerCamara(c)}>
                {c === '60' ? '60 m' : c === 'lejos' ? '20 m' : c}
              </button>
            ))}
          </>,
        )}
        {fila(
          'Gesto',
          <select value={gesto} onChange={(e) => ponerGesto(e.target.value as Gesto)} style={{ ...BOTON, width: 170 }}>
            {GESTOS.map((g) => (
              <option key={g} value={g}>
                {g} ({INFO_DE_GESTOS[g].tipo})
              </option>
            ))}
          </select>,
        )}
        {fila(
          'Hacia',
          <>
            {(['izquierda', 'derecha', 'atras', 'delante'] as const).map((h) => (
              <button key={h} type="button" style={h === hacia ? ACTIVO : BOTON} onPointerDown={() => ponerHacia(h)}>
                {h}
              </button>
            ))}
          </>,
        )}
        {fila(
          `Andarín ${velocidad.toFixed(1)} m/s`,
          <input type="range" min={0} max={8} step={0.1} value={velocidad} onChange={(e) => ponerVelocidad(Number(e.target.value))} style={{ width: 170, verticalAlign: 'middle' }} />,
        )}
        {fila(
          'Ver',
          <>
            <button type="button" style={multitud ? ACTIVO : BOTON} onPointerDown={() => ponerMultitud(!multitud)}>
              multitud
            </button>
            <button type="button" style={contorno ? ACTIVO : BOTON} onPointerDown={() => ponerContorno(!contorno)}>
              contorno
            </button>
            <button type="button" style={tenue ? ACTIVO : BOTON} onPointerDown={() => ponerTenue(!tenue)}>
              tenue
            </button>
            <button type="button" style={ciudad ? ACTIVO : BOTON} onPointerDown={() => ponerCiudad(!ciudad)}>
              ciudad
            </button>
            <button type="button" style={BOTON} onPointerDown={() => escenario.reloj.remansar(performance.now())}>
              Remanso
            </button>
            <button
              type="button"
              style={conRayo ? ACTIVO : BOTON}
              onPointerDown={() => {
                escenario.ponerRayo(conRayo ? null : { cargaMs: 1300, sostenerMs: 1800, carga: null, congelar: null, tras: 260, dejar: false });
                ponerConRayo(!conRayo);
              }}
            >
              rayo
            </button>
          </>,
        )}
        {lectura !== null ? (
          <div style={{ marginTop: 8, borderTop: '1px solid #1d3a34', paddingTop: 6 }}>
            <div>
              {lectura.fps.toFixed(0)} fps · con esqueleto {lectura.conEsqueleto} · rebaño {lectura.enRebano} · multitud {lectura.multitud} · paraguas {lectura.paraguas}
              {lectura.yendose > 0 ? ` · yéndose ${String(lectura.yendose)}` : ''}
              {lectura.porHornear > 0 ? ` · por hornear ${String(lectura.porHornear)}` : ''}
            </div>
            <div style={{ color: cuota !== undefined && (lectura.llamadas > cuota.llamadas || lectura.triangulos > cuota.triangulos) ? '#ff6d6d' : '#b4ff4a' }}>
              medido: {lectura.llamadas} llamadas · {lectura.triangulos.toLocaleString('es')} triángulos
            </div>
            {renglon !== null ? (
              <div style={{ color: renglon.triangulos > renglon.cuota.triangulos || renglon.llamadas > renglon.cuota.llamadas ? '#ff6d6d' : '#b4ff4a' }}>
                peor caso N{nivel}: {renglon.llamadas} / {renglon.cuota.llamadas} llamadas · {renglon.triangulos.toLocaleString('es')} / {renglon.cuota.triangulos.toLocaleString('es')} tri
              </div>
            ) : null}
            <div style={{ color: '#7fb3a8' }}>
              escena entera (gl.info): {lectura.glLlamadas} llamadas · {lectura.glTriangulos.toLocaleString('es')} tri
            </div>
            <div>
              LOD:{' '}
              {Object.entries(lectura.lods)
                .map(([k, v]) => `${k} ×${String(v)}`)
                .join(' · ')}
            </div>
            <div style={{ color: '#7fb3a8' }}>horneado: {lectura.horneados || '—'}</div>
            <div>golpe: {lectura.impacto}</div>
            <div style={{ color: '#7fb3a8' }}>{lectura.pesos}</div>
            {lectura.errores.map((e) => (
              <div key={e} style={{ color: '#ff6d6d' }}>
                {e}
              </div>
            ))}
          </div>
        ) : (
          <div>cargando…</div>
        )}
      </div>
    </>
  );
}

const raiz = document.getElementById('raiz');
if (raiz !== null) createRoot(raiz).render(<Banco />);
