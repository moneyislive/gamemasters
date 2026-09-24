/**
 * EL BANCO DE LOS EFECTOS DEL QUIEBRO: una calle de prueba oscura y un botón por efecto.
 *
 * ═══ QUÉ SE JUZGA AQUÍ, QUE ES LO QUE NO SE PUEDE CONTAR ═══
 *
 *   · Que la Grafía se LEE como un alfabeto propio y no como ruido ni como otra cosa conocida.
 *   · Que el anillo se cierra sobre el blanco en el instante que se le dio (el banco mide cuántos
 *     milisegundos después del impacto cae el primer fotograma cerrado: tiene que ser menos de uno),
 *     que se distingue la amenaza por color y por número de trazos, y que a 20 m se entiende.
 *   · Que la bala lenta SE VE lenta, con su estela y sus aros de aire, y va donde apuntaba la línea.
 *   · Que en el Remanso se cuelgan las chispas, la lluvia del cielo y las esquirlas, y NO los
 *     anillos ni las balas (el botón «Remanso» deja probarlo con un anillo en marcha).
 *   · Que lo que pintan los efectos casa con su presupuesto: el banco cuenta las mallas visibles y
 *     sus triángulos en la escena de verdad y los pone al lado del peor caso declarado del nivel.
 *
 * ═══ SIN SERVIDOR ═══
 *
 * Los sucesos se inyectan como los inyectaría el juego, con el `timeStamp` del toque como `t` (el
 * mismo reloj que `performance.now()`): así se prueba también que el anillo acepta instantes del
 * reloj del aparato. Cuatro maniquíes hacen de cuerpos; el localizador del sistema los encuentra
 * por número (1 el tuyo, 16 en adelante los NPC, 2 un compañero).
 *
 * `window.__banco` deja lo mismo a mano para probarlo desde la consola o desde un robot: dispara
 * por nombre y devuelve lo medido.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, JSX, PointerEvent as EventoDePuntero } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { rumboDeRadianes } from '../../../../shared/mecanicas/andar';
import { ALTURA_DE_LA_BALA, anilloEnPantalla, SILUETAS } from './cuentas';
import type { Amenaza } from './cuentas';
import { EfectosDelQuiebro, usarElSistemaDeEfectos } from './Efectos';
import { GRAFIA } from './grafia';
import { gastoDelNivel, NIVELES } from './presupuesto';
import type { Nivel } from './presupuesto';
import type { Punto, SistemaDeEfectos } from './sistema';
import { pxPorMetroDeLaCamara } from './malla';

/* ─────────────────────────────── Los cuerpos de la calle ─────────────────────────────── */

const YO = 1;
const COMPAÑERO = 2;
const PRESTADO = 16;
const CELADOR = 17;
const TIRADOR = 18;

/** Dónde está cada cuerpo (los pies). Mutable: el tuyo se puede poner a andar en círculo. */
const CUERPOS: Record<number, Punto> = {
  [YO]: { x: 0, y: 0, z: 0 },
  [COMPAÑERO]: { x: 4.5, y: 0, z: 1.5 },
  [PRESTADO]: { x: -2.6, y: 0, z: -2.8 },
  [CELADOR]: { x: 3.2, y: 0, z: -4.5 },
  [TIRADOR]: { x: -5, y: 0, z: -14 },
};
const COLOR_DEL_CUERPO: Record<number, string> = {
  [YO]: '#b98a4a',
  [COMPAÑERO]: '#4a7fb9',
  [PRESTADO]: '#6f7470',
  [CELADOR]: '#2c3a33',
  [TIRADOR]: '#2d2f3e',
};

/** La cabina de la salida, a mano: el poste, el auricular y el cable hacia la marquesina. */
const CABINA = { x: 6.5, z: 3.5 };
const AURICULAR: Punto = { x: CABINA.x - 0.25, y: 1.45, z: CABINA.z };
const CABLE: readonly Punto[] = [
  { x: CABINA.x - 0.1, y: 1.9, z: CABINA.z },
  { x: CABINA.x, y: 2.7, z: CABINA.z },
  { x: CABINA.x, y: 6, z: CABINA.z },
];
/** La cabina que suena a lo lejos, para ver el haz asomar sobre los tejados. */
const CABINA_LEJANA = { x: 34, z: -70 };

/* ─────────────────────────────── La calle ─────────────────────────────── */

function Calle(): JSX.Element {
  const edificios = useMemo(() => {
    const salen: { x: number; z: number; ancho: number; fondo: number; alto: number }[] = [];
    for (let i = 0; i < 7; i++) {
      salen.push({ x: -13, z: -40 + i * 12, ancho: 8, fondo: 10, alto: 9 + ((i * 7) % 5) * 3 });
      salen.push({ x: 13, z: -40 + i * 12, ancho: 8, fondo: 10, alto: 8 + ((i * 5) % 4) * 4 });
    }
    return salen;
  }, []);
  const ventanas = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#3b2a12' });
    return m;
  }, []);
  return (
    <group name="calle-de-prueba">
      <mesh rotation-x={-Math.PI / 2} receiveShadow={false}>
        <planeGeometry args={[80, 140]} />
        <meshStandardMaterial color="#0a0e0f" roughness={0.28} metalness={0.15} />
      </mesh>
      {/* Las aceras. */}
      <mesh position={[-7.5, 0.08, -10]}>
        <boxGeometry args={[3, 0.16, 110]} />
        <meshStandardMaterial color="#15191a" roughness={0.8} />
      </mesh>
      <mesh position={[7.5, 0.08, -10]}>
        <boxGeometry args={[3, 0.16, 110]} />
        <meshStandardMaterial color="#15191a" roughness={0.8} />
      </mesh>
      {edificios.map((e, i) => (
        <group key={i} position={[e.x, e.alto / 2, e.z]}>
          <mesh>
            <boxGeometry args={[e.ancho, e.alto, e.fondo]} />
            <meshStandardMaterial color="#101415" roughness={0.9} />
          </mesh>
          {/* Una franja de ventanas encendidas hacia la calle. */}
          <mesh position={[e.x < 0 ? e.ancho / 2 + 0.01 : -e.ancho / 2 - 0.01, 0.8, 0]} rotation-y={e.x < 0 ? Math.PI / 2 : -Math.PI / 2} material={ventanas}>
            <planeGeometry args={[e.fondo * 0.8, 0.9]} />
          </mesh>
        </group>
      ))}
      {/* El quiosco, contra el que se estampa. */}
      <mesh position={[-4.5, 1.2, 1.5]}>
        <boxGeometry args={[2, 2.4, 1.6]} />
        <meshStandardMaterial color="#1b2422" roughness={0.6} />
      </mesh>
      {/* La cabina: poste y marquesina. */}
      <mesh position={[CABINA.x, 1.4, CABINA.z]}>
        <boxGeometry args={[0.18, 2.8, 0.18]} />
        <meshStandardMaterial color="#2a2522" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[CABINA.x, 2.85, CABINA.z]}>
        <boxGeometry args={[1.1, 0.1, 0.9]} />
        <meshStandardMaterial color="#2a2522" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[AURICULAR.x, AURICULAR.y, AURICULAR.z]}>
        <boxGeometry args={[0.08, 0.28, 0.1]} />
        <meshBasicMaterial color="#ffb052" />
      </mesh>
      {/* Farolas de sodio. */}
      {[-18, -4, 10].map((z) => (
        <group key={z} position={[-6.5, 0, z]}>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 5, 6]} />
            <meshStandardMaterial color="#1c1c1c" />
          </mesh>
          <mesh position={[0.4, 5, 0]}>
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshBasicMaterial color="#ffb45a" />
          </mesh>
          <pointLight position={[0.4, 4.8, 0]} color="#ff9a3c" intensity={18} distance={16} decay={2} />
        </group>
      ))}
      <hemisphereLight args={['#1d3a36', '#050607', 0.5]} />
    </group>
  );
}

/** Los maniquíes: una cápsula por cuerpo, que sigue a `CUERPOS`. */
function Maniquies(): JSX.Element {
  const refs = useRef<Record<number, THREE.Group | null>>({});
  useFrame(() => {
    for (const [id, g] of Object.entries(refs.current)) {
      const c = CUERPOS[Number(id)];
      if (g !== null && c !== undefined) g.position.set(c.x, c.y, c.z);
    }
  });
  return (
    <>
      {Object.keys(CUERPOS).map((id) => (
        <group
          key={id}
          ref={(g) => {
            refs.current[Number(id)] = g;
          }}
        >
          <mesh position={[0, 0.9, 0]}>
            <capsuleGeometry args={[0.3, 1.2, 4, 10]} />
            <meshStandardMaterial color={COLOR_DEL_CUERPO[Number(id)] ?? '#777'} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ─────────────────────────────── Cámara y medida ─────────────────────────────── */

type Mirada = 'hombro' | 'celador' | 'cabina' | 'veinte' | 'vigia' | 'lejos';
const MIRADAS: Readonly<Record<Mirada, { ojo: [number, number, number]; foco: [number, number, number]; nombre: string }>> = {
  hombro: { ojo: [0.6, 1.7, 3.2], foco: [0, 1.2, -3], nombre: 'Al hombro (3,2 m)' },
  celador: { ojo: [1.2, 1.5, 0.5], foco: [4.2, 1.3, -5.2], nombre: 'El Celador de cerca' },
  cabina: { ojo: [1.5, 2.2, 10], foco: [6, 2, 3.5], nombre: 'La cabina' },
  veinte: { ojo: [0, 2.2, 20], foco: [0, 1.1, 0], nombre: 'A 20 m' },
  vigia: { ojo: [0, 25, 0.5], foco: [0, 0, 0], nombre: 'Vigía (25 m)' },
  lejos: { ojo: [-4, 6, 30], foco: [10, 12, -50], nombre: 'Hacia el haz' },
};

function Camara({ mirada, vez }: { mirada: Mirada; vez: number }): null {
  const { camera, gl } = useThree();
  const mando = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl]);
  useEffect(() => () => mando.dispose(), [mando]);
  useEffect(() => {
    const m = MIRADAS[mirada];
    camera.position.set(...m.ojo);
    mando.target.set(...m.foco);
    mando.update();
  }, [mirada, vez, camera, mando]);
  useFrame(() => mando.update());
  return null;
}

/** Lo medido en la escena, que la capa de botones enseña cada cuarto de segundo. */
interface Medida {
  llamadasTotales: number;
  triangulosTotales: number;
  llamadasDeEfectos: number;
  triangulosDeEfectos: number;
  cierreMs: number | null;
  tramo: string;
  retraso: number;
  radioFinalPx: number;
}

function Medidor({ sistema, medida, anillo }: { sistema: SistemaDeEfectos; medida: Medida; anillo: { impacto: number; medido: boolean } }): null {
  const { gl, scene, size, camera } = useThree();
  const pecho = useMemo(() => new THREE.Vector3(), []);
  /*
   * Prioridad por defecto y montado DESPUÉS de los efectos: corre tras sus `useFrame` y lee lo que
   * dejaron para este fotograma. `gl.info` es el del fotograma anterior (three lo pone a cero al
   * empezar cada `render`), que para contar llamadas da igual.
   */
  useFrame(() => {
    medida.llamadasTotales = gl.info.render.calls;
    medida.triangulosTotales = gl.info.render.triangles;
    let llamadas = 0;
    let triangulos = 0;
    const raiz = scene.getObjectByName('efectos-del-quiebro');
    raiz?.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !o.visible) return;
      const g = o.geometry as THREE.BufferGeometry;
      if (!(g instanceof THREE.InstancedBufferGeometry) || g.instanceCount <= 0) return;
      const indice = g.getIndex();
      const porInstancia = (indice !== null ? indice.count : g.getAttribute('position').count) / 3;
      llamadas++;
      triangulos += porInstancia * g.instanceCount;
    });
    medida.llamadasDeEfectos = llamadas;
    medida.triangulosDeEfectos = triangulos;
    /* El cierre del anillo: el primer fotograma cuyo `t` alcanza el impacto. */
    const t = sistema.ahora.verdadero;
    if (!anillo.medido && anillo.impacto > 0 && t >= anillo.impacto) {
      medida.cierreMs = t - anillo.impacto;
      anillo.medido = true;
    }
    medida.tramo = sistema.reloj.tramo(t);
    medida.retraso = sistema.reloj.retraso(t);
    const yo = CUERPOS[YO] as Punto;
    const d = camera.position.distanceTo(pecho.set(yo.x, yo.y + 1.1, yo.z));
    medida.radioFinalPx = anilloEnPantalla(d, pxPorMetroDeLaCamara(camera, size.height, gl.getPixelRatio())).radioFinalPx;
  });
  return null;
}

/**
 * LA MANIVELA: pinta un fotograma a mano. Una pestaña en segundo plano no recibe
 * `requestAnimationFrame` y el lienzo se queda quieto; con esto un robot (o quien comparta el panel
 * del navegador con otros) puede hacer correr el banco sin tener la pestaña delante.
 */
let manivela: ((t: number) => void) | null = null;
let camaraDelBanco: THREE.Camera | null = null;
let escenaDelBanco: THREE.Scene | null = null;
function Manivela(): null {
  const avanzar = useThree((s) => s.advance);
  const camara = useThree((s) => s.camera);
  const escena = useThree((s) => s.scene);
  useEffect(() => {
    manivela = (t) => avanzar(t, true);
    camaraDelBanco = camara;
    escenaDelBanco = escena;
    return () => {
      manivela = null;
      camaraDelBanco = null;
      escenaDelBanco = null;
    };
  }, [avanzar, camara, escena]);
  return null;
}

/* ─────────────────────────────── Los disparadores ─────────────────────────────── */

/** Lo que duran los anuncios del diseño, en ms (§4.8 y §4.5). */
const ANUNCIO_MS: Readonly<Record<Amenaza, number>> = { prestado: 700, celador: 550, respuesta: 300, tirador: 750 };

function crearDisparadores(sistema: SistemaDeEfectos, anillo: { impacto: number; medido: boolean; asa: number }, auto: { veredicto: boolean }) {
  let siluetaSiguiente = 0;
  let haz: number | null = null;
  let esquirlas: number[] = [];
  const anunciar = (amenaza: Amenaza, t: number, sobre: number = YO, propio = true): void => {
    const impacto = t + ANUNCIO_MS[amenaza];
    const asa = sistema.anillos.anunciar({ inicio: t, impacto, amenaza, propio, sobre });
    if (sobre === YO) {
      anillo.impacto = impacto;
      anillo.medido = false;
      anillo.asa = asa;
    }
    if (auto.veredicto && sobre === YO) {
      /* El veredicto llega «del servidor» 60 ms después del impacto: limpio, y con él el Remanso. */
      window.setTimeout(() => {
        const ahora = performance.now();
        sistema.anillos.resolver(asa, 'limpio', ahora);
        sistema.reloj.remansar(ahora);
      }, ANUNCIO_MS[amenaza] + 60);
    }
  };
  /*
   * La ráfaga: 12 tics apuntando y tres balas separadas 3 tics. Las balas se dan de alta YA, con su
   * instante de salida por delante: el sistema no pinta una bala antes de su salida, y así no hace
   * falta un temporizador (que no correría mientras un robot pinta el banco a mano). El rumbo sale
   * de donde estás ahora; si andas, el tirador falla, que es lo que pasa en el juego.
   */
  const rafaga = (t: number): void => {
    const fin = t + 600;
    sistema.apuntados.apuntar({ inicio: t, fin, desde: TIRADOR, hacia: YO });
    const de = CUERPOS[TIRADOR] as Punto;
    const a = CUERPOS[YO] as Punto;
    const rumbo = rumboDeRadianes(Math.atan2(a.x - de.x, -(a.z - de.z)));
    for (let k = 0; k < 3; k++) {
      sistema.balas.disparar({ salida: fin + k * 150, x: de.x, y: ALTURA_DE_LA_BALA, z: de.z, rumbo, fin: null });
    }
  };
  const disparadores: Readonly<Record<string, (t: number) => void>> = {
    'anuncio-prestado': (t) => anunciar('prestado', t),
    'anuncio-celador': (t) => anunciar('celador', t),
    'anuncio-respuesta': (t) => anunciar('respuesta', t),
    'anuncio-tirador': (t) => anunciar('tirador', t),
    'anuncio-ajeno': (t) => anunciar('celador', t, COMPAÑERO, false),
    'tres-a-la-vez': (t) => {
      anunciar('prestado', t);
      anunciar('celador', t + 120);
      anunciar('respuesta', t + 260);
    },
    limpio: (t) => {
      if (sistema.anillos.resolver(anillo.asa, 'limpio', t)) sistema.reloj.remansar(t);
    },
    golpe: (t) => void sistema.anillos.resolver(anillo.asa, 'golpe', t),
    esquivado: (t) => void sistema.anillos.resolver(anillo.asa, 'esquivado', t),
    rafaga,
    'golpe-flojo': (t) => sistema.impacto({ ...enElPecho(PRESTADO), fuerza: 0.3, dx: -1 }, t),
    cierre: (t) => sistema.impacto({ ...enElPecho(CELADOR), fuerza: 1, dx: 1, dz: -0.3 }, t),
    estampado: (t) => sistema.impacto({ x: -3.5, y: 1.3, z: 1.5, fuerza: 1, dx: -1 }, t),
    impresion: (t) => {
      const c = CUERPOS[CELADOR] as Punto;
      sistema.imprimir({ x: c.x + 1.5, y: 0, z: c.z - 1, silueta: siluetaSiguiente % 4 }, t);
      siluetaSiguiente++;
    },
    desalojo: (t) => {
      const c = CUERPOS[CELADOR] as Punto;
      sistema.desalojar({ ...c, silueta: 1 }, t);
    },
    trasvase: (t) => sistema.trasvasar(PRESTADO, CELADOR, t, 4242),
    bis: (t) => sistema.bis({ x: 0, z: 0 }, t),
    salida: (t) => sistema.salir({ x: CABINA.x - 0.9, y: 0, z: CABINA.z, silueta: 4, auricular: AURICULAR, cable: CABLE }, t),
    haz: (t) => {
      if (haz === null) haz = sistema.encenderHaz(CABINA_LEJANA.x, CABINA_LEJANA.z, t);
      else {
        sistema.apagarHaz(haz, t);
        haz = null;
      }
    },
    'soltar-esquirlas': (t) => {
      const c = CUERPOS[CELADOR] as Punto;
      esquirlas = esquirlas.concat(sistema.soltarEsquirlas({ ...c, cuantas: 3, semilla: Math.floor(t) }, t));
    },
    'recoger-esquirla': (t) => {
      const yo = CUERPOS[YO] as Punto;
      const asa = esquirlas.shift();
      if (asa !== undefined) sistema.recogerEsquirla(asa, { x: yo.x, y: 1.2, z: yo.z }, t);
    },
    remanso: (t) => void sistema.reloj.remansar(t),
    'todo-a-la-vez': (t) => {
      /* El peor caso del presupuesto, para contarlo en la escena. */
      for (const cuerpo of [YO, COMPAÑERO, PRESTADO, CELADOR, TIRADOR, YO]) {
        for (const amenaza of ['prestado', 'celador', 'respuesta'] as const) anunciar(amenaza, t, cuerpo, cuerpo === YO);
      }
      rafaga(t);
      sistema.apuntados.apuntar({ inicio: t, fin: t + 600, desde: CELADOR, hacia: COMPAÑERO });
      for (let k = 0; k < 8; k++) sistema.impacto({ x: -3 + k, y: 1.2, z: -2, fuerza: 1 }, t + k * 10);
      for (let k = 0; k < 8; k++) sistema.imprimir({ x: -8 + k * 2.2, y: 0, z: -9, silueta: k % 4 }, t);
      sistema.encenderHaz(CABINA_LEJANA.x, CABINA_LEJANA.z, t);
      sistema.encenderHaz(-30, -60, t);
      for (let k = 0; k < 3; k++) sistema.trasvasar(PRESTADO, CELADOR, t, 100 + k);
      sistema.bis({ x: 0, z: 0 }, t);
      for (let k = 0; k < 8; k++) sistema.soltarEsquirlas({ x: -6 + k * 1.6, y: 0, z: 4, cuantas: 12, semilla: k + 1 }, t);
      for (let k = 0; k < 40; k++) sistema.pantallas.poner({ x: -8.9, y: 3 + (k % 4) * 2.2, z: -38 + k * 1.9, orientacion: Math.PI / 2, ancho: 1.6, alto: 2, columnas: 8 });
      /* Y 12 balas vivas: cuatro ráfagas. */
      const de = CUERPOS[TIRADOR] as Punto;
      for (let k = 0; k < 12; k++) sistema.balas.disparar({ salida: t + k * 40, x: de.x, y: ALTURA_DE_LA_BALA, z: de.z, rumbo: 110 + k * 3, fin: null });
    },
  };
  return disparadores;
}

function enElPecho(quien: number): Punto {
  const c = CUERPOS[quien] as Punto;
  return { x: c.x, y: c.y + 1.2, z: c.z };
}

/* ─────────────────────────────── El banco ─────────────────────────────── */

const parametros = new URLSearchParams(window.location.search);
const NIVEL_INICIAL = Math.max(0, Math.min(3, Number(parametros.get('nivel') ?? '1') || 0)) as Nivel;

const BOTON: CSSProperties = {
  background: '#0e2a24',
  color: '#8fe8c8',
  border: '1px solid #2a6b5a',
  borderRadius: 7,
  padding: '5px 10px',
  font: 'inherit',
  cursor: 'pointer',
};

interface Grupo {
  titulo: string;
  botones: readonly (readonly [string, string])[];
}
const GRUPOS: readonly Grupo[] = [
  {
    titulo: 'Anillos',
    botones: [
      ['anuncio-prestado', 'Prestado 700 ms'],
      ['anuncio-celador', 'Celador 550 ms'],
      ['anuncio-respuesta', 'Respuesta 300 ms'],
      ['anuncio-tirador', 'Tirador'],
      ['anuncio-ajeno', 'Ajeno (tenue)'],
      ['tres-a-la-vez', 'Tres a la vez'],
      ['limpio', 'Veredicto: limpio'],
      ['esquivado', 'esquivado'],
      ['golpe', 'golpe'],
    ],
  },
  {
    titulo: 'Tirador e impactos',
    botones: [
      ['rafaga', 'Apuntar y ráfaga'],
      ['golpe-flojo', 'Golpe flojo'],
      ['cierre', 'Cierre'],
      ['estampado', 'Estampado'],
    ],
  },
  {
    titulo: 'Celadores y cabina',
    botones: [
      ['impresion', 'Impresión'],
      ['desalojo', 'Desalojo'],
      ['trasvase', 'Trasvase'],
      ['salida', 'Salida por la cabina'],
      ['haz', 'Haz: suena / calla'],
      ['soltar-esquirlas', 'Soltar esquirlas'],
      ['recoger-esquirla', 'Recoger una'],
    ],
  },
  {
    titulo: 'Tiempo y ciudad',
    botones: [
      ['remanso', 'Remanso'],
      ['bis', 'Bis'],
      ['todo-a-la-vez', 'Todo a la vez'],
    ],
  },
];

function Banco(): JSX.Element {
  const sistema = usarElSistemaDeEfectos();
  const [nivel, ponerNivel] = useState<Nivel>(NIVEL_INICIAL);
  const [mirada, ponerMirada] = useState<Mirada>('hombro');
  const [vez, ponerVez] = useState(0);
  const [andando, ponerAndando] = useState(false);
  const [autoVeredicto, ponerAutoVeredicto] = useState(false);
  const [plegado, ponerPlegado] = useState(false);
  const medida = useMemo<Medida>(
    () => ({ llamadasTotales: 0, triangulosTotales: 0, llamadasDeEfectos: 0, triangulosDeEfectos: 0, cierreMs: null, tramo: 'normal', retraso: 0, radioFinalPx: 0 }),
    [],
  );
  const anillo = useMemo(() => ({ impacto: 0, medido: true, asa: -1 }), []);
  const auto = useMemo(() => ({ veredicto: false }), []);
  auto.veredicto = autoVeredicto;
  const disparadores = useMemo(() => crearDisparadores(sistema, anillo, auto), [sistema, anillo, auto]);
  const [vista, ponerVista] = useState<Medida>(medida);

  /* El localizador: el juego lo pone una vez; aquí, los maniquíes. */
  useEffect(() => {
    sistema.localizar = (quien, salida) => {
      const c = CUERPOS[quien];
      if (c === undefined) return false;
      salida.x = c.x;
      salida.y = c.y;
      salida.z = c.z;
      return true;
    };
    /* Tres pantallas en las fachadas de la izquierda, como las pondría `ciudad/`. */
    sistema.pantallas.poner({ x: -8.95, y: 2.2, z: -6, orientacion: Math.PI / 2, ancho: 2.4, alto: 3.2, columnas: 10 });
    sistema.pantallas.poner({ x: -8.95, y: 3.5, z: -18, orientacion: Math.PI / 2, ancho: 1.6, alto: 4.5, columnas: 6, sube: true });
    sistema.pantallas.poner({ x: 8.95, y: 2.5, z: -12, orientacion: -Math.PI / 2, ancho: 3, alto: 1.8, columnas: 16, color: 0xff3fa4 });
  }, [sistema]);

  /* Tu cuerpo anda en círculo si se pide: para ver que el anillo lo sigue. */
  useEffect(() => {
    if (!andando) return undefined;
    let id = 0;
    const t0 = performance.now();
    const paso = (): void => {
      const e = (performance.now() - t0) / 1000;
      const yo = CUERPOS[YO] as Punto;
      yo.x = Math.sin(e * 0.9) * 2.5;
      yo.z = Math.cos(e * 0.9) * 2.5 - 2.5;
      id = window.requestAnimationFrame(paso);
    };
    id = window.requestAnimationFrame(paso);
    return () => window.cancelAnimationFrame(id);
  }, [andando]);

  useEffect(() => {
    const id = window.setInterval(() => ponerVista({ ...medida }), 250);
    return () => window.clearInterval(id);
  }, [medida]);

  /* Para la consola y los robots. */
  useEffect(() => {
    const w = window as unknown as { __banco?: unknown };
    w.__banco = {
      sistema,
      disparar: (nombre: string) => {
        const f = disparadores[nombre];
        if (f === undefined) throw new Error(`no hay disparador «${nombre}»: ${Object.keys(disparadores).join(', ')}`);
        f(performance.now());
      },
      medir: () => ({ ...medida, nivel, declarado: gastoDelNivel(nivel) }),
      /*
       * `n` fotogramas a mano, uno cada `pasoMs`: ver `Manivela`. La espera es ACTIVA a propósito:
       * en una pestaña oculta `setTimeout` se estira a un segundo, y dieciséis milisegundos pedidos
       * serían un segundo entero de reloj con los anillos cerrándose sin pintar.
       */
      fotogramas: (n: number, pasoMs = 16) => {
        for (let k = 0; k < n; k++) {
          const t = performance.now();
          manivela?.(t);
          while (performance.now() - t < pasoMs) {
            /* esperar */
          }
        }
        return { ...medida };
      },
      camara: () => (camaraDelBanco === null ? null : camaraDelBanco.position.toArray()),
      /* Para mirar dentro desde la consola: la escena y la cámara de three. */
      escena: () => escenaDelBanco,
      camaraDeThree: () => camaraDelBanco,
      nivel: (n: Nivel) => ponerNivel(n),
      /* La mirada se pone a mano (sin esperar a React): un robot la necesita en el mismo fotograma. */
      mirar: (m: Mirada) => {
        ponerMirada(m);
        ponerVez((v) => v + 1);
      },
      glifos: GRAFIA.length,
    };
  }, [sistema, disparadores, medida, nivel]);

  const declarado = gastoDelNivel(nivel);
  const alPulsar = (nombre: string) => (e: EventoDePuntero<HTMLButtonElement>) => {
    e.preventDefault();
    const f = disparadores[nombre];
    /* El `timeStamp` del toque ES el reloj de `performance.now()`: se prueba con él. */
    if (f !== undefined) f(e.timeStamp);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05080a' }}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ fov: 70, near: 0.1, far: 600, position: MIRADAS.hombro.ojo }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          gl.info.autoReset = true;
          scene.background = new THREE.Color('#05080a');
          scene.fog = new THREE.FogExp2('#071311', 0.012);
        }}
      >
        <Camara mirada={mirada} vez={vez} />
        <Calle />
        <Maniquies />
        <EfectosDelQuiebro sistema={sistema} nivel={nivel} semillaDelCielo={7} />
        <Medidor sistema={sistema} medida={medida} anillo={anillo} />
        <Manivela />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          maxWidth: 560,
          maxHeight: 'calc(100vh - 24px)',
          overflowY: 'auto',
          color: '#cfe7dc',
          font: '12px/1.55 system-ui, sans-serif',
          background: 'rgba(4,14,12,0.82)',
          border: '1px solid #1f4a3f',
          borderRadius: 10,
          padding: '8px 12px',
        }}
      >
        <div style={{ letterSpacing: 2, fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 8 }}>
          BANCO · EFECTOS DEL QUIEBRO
          <button type="button" style={{ ...BOTON, padding: '0 8px' }} onPointerDown={() => ponerPlegado((p) => !p)}>
            {plegado ? 'desplegar' : 'plegar'}
          </button>
        </div>
        {plegado ? null : (
          <>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ opacity: 0.65 }}>nivel</span>
              {NIVELES.map((n) => (
                <button key={n} type="button" style={{ ...BOTON, borderColor: n === nivel ? '#8fe8c8' : '#2a6b5a' }} onPointerDown={() => ponerNivel(n)}>
                  N{n}
                </button>
              ))}
              <span style={{ opacity: 0.65, marginLeft: 8 }}>cámara</span>
              {(Object.keys(MIRADAS) as Mirada[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  style={{ ...BOTON, borderColor: m === mirada ? '#8fe8c8' : '#2a6b5a' }}
                  onPointerDown={() => {
                    ponerMirada(m);
                    ponerVez((v) => v + 1);
                  }}
                >
                  {MIRADAS[m].nombre}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label>
                <input type="checkbox" checked={andando} onChange={(e) => ponerAndando(e.target.checked)} /> tu cuerpo anda
              </label>
              <label>
                <input type="checkbox" checked={autoVeredicto} onChange={(e) => ponerAutoVeredicto(e.target.checked)} /> veredicto «limpio» y Remanso solos
              </label>
            </div>
            {GRUPOS.map((g) => (
              <div key={g.titulo} style={{ marginTop: 8 }}>
                <div style={{ opacity: 0.6, fontSize: 11 }}>{g.titulo}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 3 }}>
                  {g.botones.map(([id, texto]) => (
                    <button key={id} type="button" id={id} style={BOTON} onPointerDown={alPulsar(id)}>
                      {texto}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 10, fontVariantNumeric: 'tabular-nums' }}>
              <div>
                escena: {vista.llamadasTotales} llamadas · {vista.triangulosTotales.toLocaleString('es')} triángulos
              </div>
              <div>
                efectos medidos: <b>{vista.llamadasDeEfectos}</b> llamadas · <b>{vista.triangulosDeEfectos.toLocaleString('es')}</b> triángulos
                <span style={{ opacity: 0.65 }}>
                  {' '}
                  (peor caso de N{nivel}: {declarado.llamadas} · {declarado.triangulos.toLocaleString('es')})
                </span>
              </div>
              <div>
                cierre del último anillo:{' '}
                {vista.cierreMs === null ? '—' : <b>+{vista.cierreMs.toFixed(2)} ms tras el impacto</b>}
                <span style={{ opacity: 0.65 }}> (el primer fotograma con t ≥ impacto)</span>
              </div>
              <div>
                reloj: {vista.tramo} · retraso {vista.retraso.toFixed(1)} ms · radio final de tu anillo {vista.radioFinalPx.toFixed(1)} px
              </div>
              <div style={{ opacity: 0.65 }}>
                siluetas: {SILUETAS.slice(0, 4).map((s) => s.nombre).join(' · ')}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* La raíz se crea una vez y se guarda en el propio div: ver `banco3d.tsx`. */
const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Falta el <div id="raiz"> de banco-quiebro-efectos.html');
type ConRaiz = HTMLElement & { __raizDeReact?: ReturnType<typeof createRoot> };
const donde = raiz as ConRaiz;
donde.__raizDeReact ??= createRoot(donde);
donde.__raizDeReact.render(<Banco />);
