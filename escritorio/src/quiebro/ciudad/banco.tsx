/**
 * EL BANCO DE LA CIUDAD DEL QUIEBRO: el barrio de una noche con su atmósfera, sin juego encima, con
 * cámara libre o al hombro, selector de nivel, de código y de noche, y lo que cuesta cada cosa
 * medido en el lienzo.
 *
 * ═══ QUÉ SE JUZGA AQUÍ ═══
 *
 * Lo que ningún comprobador puede decir: si la calle PARECE mojada (los charcos reflejan las
 * farolas y los neones estirados hacia la cámara), si el ritmo de ventanas tiene la irregularidad de
 * una ciudad de verdad, si la niebla da profundidad (los bajos de enfrente se pierden y las torres
 * asoman), si desde el hombro a 1,7 m se lee la calle. Y cuánto cuesta: triángulos y llamadas del
 * lienzo (`gl.info.render`, que cuenta también las sombras), contra el renglón de cada pieza y la
 * cuota de la ciudad en el tope del nivel.
 *
 * ═══ MANDOS ═══
 *
 * Arrastrar con el ratón mira; WASD anda (o vuela en la libre, con Q/E para bajar y subir);
 * Mayúsculas corre. Los selectores cambian nivel, código, noche, cámara, vista y tiempo. Todo va en
 * la dirección para repetir una captura: `?nivel=2&codigo=QWXYZ&noche=3&camara=hombro&vista=calle`.
 * La luz del barrio sale de la hora de la noche, como en el juego; `?luz=madrugada|alba` la fuerza.
 *
 * Se abre en http://localhost:5291/sala/banco-quiebro-ciudad.html (el puerto del Vite del árbol).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Ciudad } from './Ciudad';
import type { CiudadConstruida } from './construir';
import { planoDelBarrio } from './plano';
import type { NivelDeLaCiudad, PlanoDeLaCiudad, TiempoDelPlano } from './tipos';
import { NIVELES_DE_LA_CIUDAD } from './tipos';
import { Atmosfera } from '../atmosfera/Atmosfera';
import { luzForzada, luzQueManda } from '../atmosfera/luz-del-barrio';
import { FALLOS_DEL_PARCHEO } from '../atmosfera/parcheo';
import { SOLO_BRILLO_EN_SU_SITIO, UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { UNIFORMES_DE_LOS_HALOS } from './halos';
import { CUOTA_DE_LA_CIUDAD, presupuestoDeLaCiudad } from './presupuesto';
import { BancoAbierto } from './banco-abierto';

type ModoDeCamara = 'libre' | 'hombro';

interface Ajustes {
  readonly nivel: NivelDeLaCiudad;
  readonly codigo: string;
  readonly noche: number;
  readonly camara: ModoDeCamara;
  readonly tiempo: TiempoDelPlano | 'del-plano';
  readonly vista: string;
}

function leerAjustes(): Ajustes {
  const p = new URLSearchParams(window.location.search);
  const n = Number(p.get('nivel') ?? '1');
  const nivel = (NIVELES_DE_LA_CIUDAD.includes(n as NivelDeLaCiudad) ? n : 1) as NivelDeLaCiudad;
  const t = p.get('tiempo');
  return {
    nivel,
    codigo: (p.get('codigo') ?? 'QUIEB').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'QUIEB',
    noche: Math.max(0, Math.floor(Number(p.get('noche') ?? '1')) || 0),
    camara: p.get('camara') === 'libre' ? 'libre' : 'hombro',
    tiempo: t === 'llovizna' || t === 'aguacero' || t === 'niebla' ? t : 'del-plano',
    vista: p.get('vista') ?? 'calle',
  };
}

/** Las vistas fijas, para repetir capturas: [x, y, z, rumbo (rad, 0 = norte, crece al este), cabeceo]. */
const VISTAS: Readonly<Record<string, readonly [number, number, number, number, number]>> = {
  calle: [23, 1.7, 58, 0, 0.02],
  cruce: [21, 1.7, 33, -0.75, 0.0],
  glorieta: [-13, 1.7, 13, 0.785, 0.04],
  avenida: [-73, 1.7, 62, 0, 0.03],
  borde: [5, 1.7, -58, 0, 0.05],
  alto: [0, 25, 30, 0, -0.55],
  bajada: [60, 90, 110, -0.5, -0.42],
};

/** El rumbo como el paseante: 0 mira al norte (−z) y crece hacia el este. */
function dirDe(rumbo: number, cabeceo: number): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(rumbo) * Math.cos(cabeceo), Math.sin(cabeceo), -Math.cos(rumbo) * Math.cos(cabeceo));
}

interface EstadoDelMando {
  x: number;
  y: number;
  z: number;
  rumbo: number;
  cabeceo: number;
}

/** La cota del suelo en un punto: la del bordillo dentro de una isla (manzana o plaza con su acera). */
function alturaDelSuelo(plano: PlanoDeLaCiudad, x: number, z: number): number {
  const a = plano.calles[0]?.acera ?? 3;
  const dentro = (c: { x0: number; z0: number; x1: number; z1: number }): boolean =>
    x > c.x0 - a && x < c.x1 + a && z > c.z0 - a && z < c.z1 + a;
  return plano.manzanas.some(dentro) || dentro(plano.glorieta.caja) ? 0.15 : 0;
}

/** La cámara: libre (vuela) o al hombro de un muñeco que anda por el barrio y choca con él. */
function Mando({ modo, vista, plano }: { modo: ModoDeCamara; vista: string; plano: PlanoDeLaCiudad }): JSX.Element {
  const { camera, gl } = useThree();
  const teclas = useRef(new Set<string>());
  /* `?pos=x,y,z,rumbo,cabeceo` manda sobre la vista: para repetir una captura exacta. */
  const pos = new URLSearchParams(window.location.search).get('pos')?.split(',').map(Number);
  const inicial =
    pos !== undefined && pos.length === 5 && pos.every(Number.isFinite)
      ? (pos as unknown as readonly [number, number, number, number, number])
      : (VISTAS[vista] ?? [23, 1.7, 58, 0, 0]);
  const estado = useRef<EstadoDelMando>({ x: inicial[0], y: inicial[1], z: inicial[2], rumbo: inicial[3], cabeceo: inicial[4] });
  const muneco = useRef<THREE.Group>(null);

  const primeraVista = useRef(true);
  useEffect(() => {
    if (primeraVista.current) {
      primeraVista.current = false;
      return;
    }
    const v = VISTAS[vista];
    if (v !== undefined) estado.current = { x: v[0], y: v[1], z: v[2], rumbo: v[3], cabeceo: v[4] };
  }, [vista]);

  useEffect(() => {
    const abajo = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      teclas.current.add(e.code);
    };
    const arriba = (e: KeyboardEvent): void => {
      teclas.current.delete(e.code);
    };
    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    const lienzo = gl.domElement;
    let tirando: { x: number; y: number } | null = null;
    const alBajar = (e: PointerEvent): void => {
      tirando = { x: e.clientX, y: e.clientY };
      lienzo.setPointerCapture(e.pointerId);
    };
    const alMover = (e: PointerEvent): void => {
      if (tirando === null) return;
      const s = estado.current;
      s.rumbo += (e.clientX - tirando.x) * 0.004;
      s.cabeceo = Math.max(-1.45, Math.min(1.45, s.cabeceo - (e.clientY - tirando.y) * 0.004));
      tirando = { x: e.clientX, y: e.clientY };
    };
    const alSoltar = (): void => {
      tirando = null;
    };
    lienzo.addEventListener('pointerdown', alBajar);
    lienzo.addEventListener('pointermove', alMover);
    lienzo.addEventListener('pointerup', alSoltar);
    lienzo.style.touchAction = 'none';
    return () => {
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
      lienzo.removeEventListener('pointerdown', alBajar);
      lienzo.removeEventListener('pointermove', alMover);
      lienzo.removeEventListener('pointerup', alSoltar);
    };
  }, [gl]);

  useFrame((_estado, dtBruto) => {
    const dt = Math.min(dtBruto, 0.05);
    const s = estado.current;
    const t = teclas.current;
    const corre = t.has('ShiftLeft') || t.has('ShiftRight');
    const adelante = (t.has('KeyW') ? 1 : 0) - (t.has('KeyS') ? 1 : 0);
    const lado = (t.has('KeyD') ? 1 : 0) - (t.has('KeyA') ? 1 : 0);
    const fx = Math.sin(s.rumbo);
    const fz = -Math.cos(s.rumbo);
    if (modo === 'libre') {
      const v = (corre ? 30 : 10) * dt;
      const d = dirDe(s.rumbo, s.cabeceo);
      s.x += (d.x * adelante - fz * lado) * v;
      s.y += (d.y * adelante + ((t.has('KeyE') ? 1 : 0) - (t.has('KeyQ') ? 1 : 0))) * v;
      s.z += (d.z * adelante + fx * lado) * v;
      s.y = Math.max(0.3, s.y);
      camera.position.set(s.x, s.y, s.z);
      camera.lookAt(s.x + d.x, s.y + d.y, s.z + d.z);
      if (muneco.current !== null) muneco.current.visible = false;
      return;
    }
    /* Al hombro: el muñeco anda a 5 m/s (7 corriendo) y choca con la estructura; la cámara, a 3,2 m
       detrás y 1,7 m de alto (diseño §7), mira por encima de su hombro derecho. */
    const v = (corre ? 7 : 5) * dt;
    let nx = s.x + (fx * adelante - fz * lado) * v;
    let nz = s.z + (fz * adelante + fx * lado) * v;
    const radio = 0.35;
    for (const c of plano.estructura) {
      if (nx > c.x0 - radio && nx < c.x1 + radio && nz > c.z0 - radio && nz < c.z1 + radio) {
        const sal = [nx - (c.x0 - radio), c.x1 + radio - nx, nz - (c.z0 - radio), c.z1 + radio - nz];
        const m = Math.min(...sal);
        if (m === sal[0]) nx = c.x0 - radio;
        else if (m === sal[1]) nx = c.x1 + radio;
        else if (m === sal[2]) nz = c.z0 - radio;
        else nz = c.z1 + radio;
      }
    }
    s.x = nx;
    s.z = nz;
    const suelo = alturaDelSuelo(plano, s.x, s.z);
    const cab = Math.max(-0.6, Math.min(0.6, s.cabeceo));
    const d = dirDe(s.rumbo, cab);
    const hombro = new THREE.Vector3(-fz, 0, fx).multiplyScalar(0.55);
    camera.position.set(s.x - d.x * 3.2 + hombro.x, suelo + 1.7 - d.y * 3.2, s.z - d.z * 3.2 + hombro.z);
    camera.lookAt(s.x + d.x * 10 + hombro.x, suelo + 1.5 + d.y * 10, s.z + d.z * 10 + hombro.z);
    if (muneco.current !== null) {
      muneco.current.visible = true;
      muneco.current.position.set(s.x, suelo, s.z);
      muneco.current.rotation.y = -s.rumbo;
    }
  });

  return (
    <group ref={muneco}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1.2, 6, 12]} />
        <meshStandardMaterial color="#3b3f45" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.62, -0.18]}>
        <boxGeometry args={[0.3, 0.08, 0.1]} />
        <meshStandardMaterial color="#d8a040" emissive="#d8a040" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/**
 * UN «ResizeObserver» QUE MIDE AUNQUE LA PÁGINA ESTÉ OCULTA. El lienzo de r3f no monta la escena
 * hasta que su `ResizeObserver` le da un tamaño, y el navegador no entrega esas medidas en una
 * pestaña que no se está pintando (el panel del navegador de las pruebas, minimizado): el banco se
 * quedaba en negro, 300 × 150, sin un error. Éste avisa en cuanto se observa y en cada `resize` de la
 * ventana; `react-use-measure` lee el tamaño con `getBoundingClientRect`, así que no hacen falta
 * las entradas.
 */
class MedidaInmediata {
  private readonly avisar: () => void;
  private readonly alCambiar = (): void => this.avisar();

  constructor(avisar: ResizeObserverCallback) {
    this.avisar = () => avisar([], this as unknown as ResizeObserver);
  }

  observe(): void {
    setTimeout(this.alCambiar, 0);
    window.addEventListener('resize', this.alCambiar);
  }

  unobserve(): void {
    window.removeEventListener('resize', this.alCambiar);
  }

  disconnect(): void {
    window.removeEventListener('resize', this.alCambiar);
  }
}

interface Medida {
  triangulos: number;
  llamadas: number;
  ms: number;
}

/** Lee `gl.info.render` (lo del fotograma anterior) y la media de los últimos 30 fotogramas. */
function Medidor({ alMedir }: { alMedir: (m: Medida) => void }): null {
  const { gl } = useThree();
  const tiempos = useRef<number[]>([]);
  const ultimo = useRef(performance.now());
  const cuenta = useRef(0);
  useFrame(() => {
    const ahora = performance.now();
    tiempos.current.push(ahora - ultimo.current);
    ultimo.current = ahora;
    if (tiempos.current.length > 30) tiempos.current.shift();
    cuenta.current++;
    if (cuenta.current % 15 === 0) {
      const ms = tiempos.current.reduce((a, b) => a + b, 0) / tiempos.current.length;
      alMedir({ triangulos: gl.info.render.triangles, llamadas: gl.info.render.calls, ms });
    }
  });
  return null;
}

/** Deja la escena y el renderizador a mano en la consola (`__escenaDelBanco`), para mirar desde fuera. */
function Exponer(): null {
  const { scene, gl, camera } = useThree();
  useEffect(() => {
    (window as unknown as { __escenaDelBanco?: unknown }).__escenaDelBanco = { scene, gl, camera, THREE };
  }, [scene, gl, camera]);
  return null;
}

function Banco(): JSX.Element {
  const [ajustes, setAjustes] = useState<Ajustes>(leerAjustes);
  const [medida, setMedida] = useState<Medida | null>(null);
  const [ciudad, setCiudad] = useState<CiudadConstruida | null>(null);
  const [halos, setHalos] = useState(true);
  const [luzHorneada, setLuzHorneada] = useState(true);
  const [apagon, setApagon] = useState(false);

  const cambiar = useCallback((parte: Partial<Ajustes>) => {
    setAjustes((a) => {
      const nuevo = { ...a, ...parte };
      const p = new URLSearchParams();
      p.set('nivel', String(nuevo.nivel));
      p.set('codigo', nuevo.codigo);
      p.set('noche', String(nuevo.noche));
      p.set('camara', nuevo.camara);
      if (nuevo.tiempo !== 'del-plano') p.set('tiempo', nuevo.tiempo);
      p.set('vista', nuevo.vista);
      window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
      return nuevo;
    });
  }, []);

  const plano = useMemo<PlanoDeLaCiudad>(() => {
    const base = planoDelBarrio(ajustes.codigo, ajustes.noche);
    return ajustes.tiempo === 'del-plano' ? base : { ...base, tiempo: ajustes.tiempo };
  }, [ajustes.codigo, ajustes.noche, ajustes.tiempo]);

  useEffect(() => {
    UNIFORMES_DE_LOS_HALOS.uHalos.value = halos ? 1 : 0;
    UNIFORMES_DE_LA_CIUDAD.uLuzDeLaCalle.value = luzHorneada ? 1 : 0;
    UNIFORMES_DE_LA_CIUDAD.uFarolas.value = apagon ? 0 : 1;
  }, [halos, luzHorneada, apagon]);

  /*
   * `?tren=1`: el tic del barrio se adelanta para que el tren pase por la plaza a los 8 s de abrir
   * la página (su horario de verdad es de 35-45 s, y esperar una vuelta entera por captura cansa).
   */
  const tic = useMemo(() => {
    const pedirTren = new URLSearchParams(window.location.search).get('tren') === '1';
    const t = plano.tren;
    if (!pedirTren || t === null) return undefined;
    /* El primer tic en que asoma (después de uno en que no estaba), y lo que tarda en centrarse:
       la mitad del viaducto más la mitad del tren, a 0,6 m por tic. */
    let enMedio = 0;
    let antes = t.enTic(0) !== null;
    for (let k = 1; k < 4000; k++) {
      const ahora = t.enTic(k) !== null;
      if (ahora && !antes) {
        enMedio = k + Math.round(((t.hasta - t.desde) / 2 + t.largo / 2) / 0.6);
        break;
      }
      antes = ahora;
    }
    const inicio = performance.now();
    return () => enMedio + ((performance.now() - inicio) / 1000 - 8) * 20;
  }, [plano]);

  const presupuesto = useMemo(() => (ciudad === null ? null : presupuestoDeLaCiudad(ciudad.piezas, ajustes.nivel)), [ciudad, ajustes.nivel]);
  const dpr = ([0.75, 1, 1.25, 1.5] as const)[ajustes.nivel];
  (window as unknown as { __bancoCiudad?: unknown }).__bancoCiudad = {
    medida,
    presupuesto,
    piezas: ciudad?.piezas.map((p) => ({ nombre: p.nombre, triangulos: p.triangulos, llamadas: p.llamadas })),
    fuentes: ciudad?.fuentes,
    fallos: FALLOS_DEL_PARCHEO,
    plano,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050807' }}>
      <Canvas
        key={`n${String(ajustes.nivel)}`}
        dpr={dpr}
        shadows={ajustes.nivel >= 2}
        resize={{ polyfill: MedidaInmediata as unknown as typeof ResizeObserver }}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        camera={{ fov: 70, near: 0.1, far: 2000, position: [0, 1.7, 30] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <Ciudad plano={plano} nivel={ajustes.nivel} alConstruir={setCiudad} tic={tic} />
        {ciudad !== null ? (
          <Atmosfera
            tiempo={plano.tiempo}
            nivel={ajustes.nivel}
            farolas={ciudad.farolas}
            semilla={plano.semilla}
            farolasEncendidas={apagon ? 0 : 1}
            luz={luzQueManda(plano.hora, luzForzada())}
          />
        ) : null}
        <Mando modo={ajustes.camara} vista={ajustes.vista} plano={plano} />
        <Medidor alMedir={setMedida} />
        <Exponer />
      </Canvas>
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '8px 10px',
          background: 'rgba(0,0,0,0.62)',
          color: '#cfe',
          font: '12px/1.45 ui-monospace, Consolas, monospace',
          borderRadius: 6,
          maxWidth: 'min(480px, calc(100vw - 32px))',
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <label>
            nivel{' '}
            <select value={ajustes.nivel} onChange={(e) => cambiar({ nivel: Number(e.target.value) as NivelDeLaCiudad })}>
              {NIVELES_DE_LA_CIUDAD.map((n) => (
                <option key={n} value={n}>
                  N{n}
                </option>
              ))}
            </select>
          </label>
          <label>
            código{' '}
            <input
              value={ajustes.codigo}
              style={{ width: 70 }}
              onChange={(e) => cambiar({ codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'QUIEB' })}
            />
          </label>
          <label>
            noche{' '}
            <input
              type="number"
              min={0}
              value={ajustes.noche}
              style={{ width: 52 }}
              onChange={(e) => cambiar({ noche: Math.max(0, Math.floor(Number(e.target.value)) || 0) })}
            />
          </label>
          <label>
            cámara{' '}
            <select value={ajustes.camara} onChange={(e) => cambiar({ camara: e.target.value === 'libre' ? 'libre' : 'hombro' })}>
              <option value="hombro">hombro 1,7 m</option>
              <option value="libre">libre</option>
            </select>
          </label>
          <label>
            vista{' '}
            <select value={ajustes.vista} onChange={(e) => cambiar({ vista: e.target.value })}>
              {Object.keys(VISTAS).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            tiempo{' '}
            <select
              value={ajustes.tiempo}
              onChange={(e) => {
                const v = e.target.value;
                cambiar({ tiempo: v === 'llovizna' || v === 'aguacero' || v === 'niebla' ? v : 'del-plano' });
              }}
            >
              <option value="del-plano">del barrio</option>
              <option value="llovizna">llovizna</option>
              <option value="aguacero">aguacero</option>
              <option value="niebla">niebla</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={halos} onChange={(e) => setHalos(e.target.checked)} /> halos
          </label>
          <label>
            <input type="checkbox" checked={luzHorneada} onChange={(e) => setLuzHorneada(e.target.checked)} /> luz horneada
          </label>
          <label>
            <input type="checkbox" checked={apagon} onChange={(e) => setApagon(e.target.checked)} /> apagón
          </label>
        </div>
        <div style={{ marginTop: 6 }}>
          {plano.nombre}, {plano.hora} · {plano.tiempo}
        </div>
        {medida !== null ? (
          <div>
            lienzo: {medida.triangulos.toLocaleString('es')} tri · {medida.llamadas} llamadas · {medida.ms.toFixed(1)} ms
          </div>
        ) : null}
        {presupuesto !== null ? (
          <div>
            ciudad: {presupuesto.triangulos.toLocaleString('es')} tri · {presupuesto.llamadas} llamadas · cuota N{ajustes.nivel} (
            {Math.round(CUOTA_DE_LA_CIUDAD * 100)} %) {presupuesto.tope.triangulos.toLocaleString('es')}/{presupuesto.tope.llamadas}
            <span style={{ color: presupuesto.cabe ? '#8f8' : '#f88' }}> {presupuesto.cabe ? 'cabe' : 'NO CABE'}</span>
            {presupuesto.excesos.length > 0 ? <div style={{ color: '#f88' }}>{presupuesto.excesos.join(' · ')}</div> : null}
          </div>
        ) : null}
        {ciudad !== null ? (
          <div>
            fuentes: {ciudad.fuentes.horneadas} horneadas · {ciudad.fuentes.reflejos} reflejos · {ciudad.fuentes.halos} halos
          </div>
        ) : null}
        {!SOLO_BRILLO_EN_SU_SITIO || FALLOS_DEL_PARCHEO.length > 0 ? (
          <div style={{ color: '#f88' }}>parcheo: {[...FALLOS_DEL_PARCHEO, SOLO_BRILLO_EN_SU_SITIO ? '' : 'solo-brillo sin marcas'].join(' · ')}</div>
        ) : null}
      </div>
    </div>
  );
}

/*
 * La raíz se guarda en el elemento: al recargar este módulo en caliente no se crea otra encima. Con
 * `?ciudad=abierta`, el banco de la ciudad de 540 m (`banco-abierto.tsx`) en vez del del barrio.
 */
const raiz = document.getElementById('raiz') as (HTMLElement & { __raizDelBanco?: Root }) | null;
if (raiz !== null) {
  raiz.__raizDelBanco ??= createRoot(raiz);
  raiz.__raizDelBanco.render(new URLSearchParams(window.location.search).get('ciudad') === 'abierta' ? <BancoAbierto /> : <Banco />);
}
