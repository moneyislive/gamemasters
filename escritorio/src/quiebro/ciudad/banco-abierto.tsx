/**
 * EL BANCO DE LA CIUDAD ABIERTA: la ciudad de 540 m de una traza con su atmósfera, sin juego encima, para
 * mirarla y medirla. Se abre con la página del banco de la ciudad y `?ciudad=abierta`:
 *
 *   http://localhost:5291/sala/banco-quiebro-ciudad.html?ciudad=abierta&traza=0&codigo=K7M2P&nivel=0
 *
 * ═══ QUÉ SE JUZGA AQUÍ ═══
 *
 * Que la ventana de celdas se mueve con quien anda sin que se vea (el fundido del borde, la LOD1 detrás, las
 * llamadas quietas), que la luz por losetas llega a tiempo, que el borde de glifos se lee, y cuánto cuesta:
 * el lienzo (`gl.info.render`) contra el libro de la ciudad abierta y la cuota del 50 %.
 *
 * ═══ MANDOS ═══
 *
 * WASD anda (Mayúsculas corre, a 7 m/s), el ratón mira; en la cámara libre, Q/E bajan y suben. En la
 * dirección: `nivel`, `codigo`, `noche`, `traza`, `camara=libre|hombro`, `pos=x,y,z,rumbo,cabeceo`,
 * `luz=madrugada|alba`, `montar=1` (monta la ventana de golpe al empezar).
 *
 * ═══ MEDIR SIN `requestAnimationFrame` ═══
 *
 * El panel del navegador oculto baja los fotogramas a uno por segundo. Para medir un cruce se usa
 * `__bancoAbierto.cruzar(n)`: n fotogramas seguidos de 1/30 s de juego, cada uno con su trabajo, su pintado
 * y una lectura de un píxel que espera a la GPU, cronometrado entero. El camino es la escalera de la esquina
 * noroeste a la sureste por las calles (1.056 m), a 7 m/s.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LaCiudadDeNoche } from './LaCiudadDeNoche';
import type { CiudadAbiertaConstruida } from './abierta';
import type { NivelDeLaCiudad } from './tipos';
import { NIVELES_DE_LA_CIUDAD } from './tipos';
import { CUOTA_DE_LA_CIUDAD, RENGLONES_DE_LA_CIUDAD_ABIERTA, presupuestoDeLaCiudad } from './presupuesto';
import type { PresupuestoSumado } from './presupuesto';
import { FAMILIAS } from './celdas';
import { rectanguloDeLaVentana } from './ventana';

interface AjustesAbiertos {
  readonly nivel: NivelDeLaCiudad;
  readonly codigo: string;
  readonly noche: number;
  readonly traza: number;
  readonly camara: 'libre' | 'hombro';
  readonly montar: boolean;
}

function leer(): AjustesAbiertos {
  const p = new URLSearchParams(window.location.search);
  const n = Number(p.get('nivel') ?? '0');
  const t = Math.floor(Number(p.get('traza') ?? '0'));
  return {
    nivel: (NIVELES_DE_LA_CIUDAD.includes(n as NivelDeLaCiudad) ? n : 0) as NivelDeLaCiudad,
    codigo: (p.get('codigo') ?? 'K7M2P').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'K7M2P',
    noche: Math.max(1, Math.floor(Number(p.get('noche') ?? '1')) || 1),
    traza: Number.isFinite(t) && t >= 0 && t < 32 ? t : 0,
    camara: p.get('camara') === 'libre' ? 'libre' : 'hombro',
    montar: p.get('montar') === '1',
  };
}

/** El camino del cruce: en escalera por las calles, de la esquina noroeste a la sureste. */
function caminoDelCruce(): { puntos: [number, number][]; largo: number } {
  const puntos: [number, number][] = [[-264, -264]];
  for (let k = 0; k < 11; k++) {
    const [x, z] = puntos[puntos.length - 1] as [number, number];
    puntos.push([x + 48, z]);
    puntos.push([x + 48, z + 48]);
  }
  let largo = 0;
  for (let k = 1; k < puntos.length; k++) {
    const a = puntos[k - 1] as [number, number];
    const b = puntos[k] as [number, number];
    largo += Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
  }
  return { puntos, largo };
}

function enElCamino(s: number): { x: number; z: number; dx: number; dz: number } {
  const { puntos } = caminoDelCruce();
  let queda = s;
  for (let k = 1; k < puntos.length; k++) {
    const a = puntos[k - 1] as [number, number];
    const b = puntos[k] as [number, number];
    const l = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    if (queda <= l) {
      const dx = Math.sign(b[0] - a[0]);
      const dz = Math.sign(b[1] - a[1]);
      return { x: a[0] + dx * queda, z: a[1] + dz * queda, dx, dz };
    }
    queda -= l;
  }
  return { x: 264, z: 264, dx: 1, dz: 0 };
}

interface EstadoDelMando {
  x: number;
  y: number;
  z: number;
  rumbo: number;
  cabeceo: number;
}

/** Las cajas de la noche en celdas de 8 m, para chocar sin mirar mil trescientas cada fotograma. */
function rejillaDeCajas(ciudad: CiudadAbiertaConstruida | null): Map<number, { x0: number; z0: number; x1: number; z1: number }[]> {
  const m = new Map<number, { x0: number; z0: number; x1: number; z1: number }[]>();
  if (ciudad === null) return m;
  for (const c of ciudad.fuente.noche.cajas) {
    for (let i = Math.floor(c.x0 / 8); i <= Math.floor(c.x1 / 8); i++) {
      for (let k = Math.floor(c.z0 / 8); k <= Math.floor(c.z1 / 8); k++) {
        const clave = (i + 128) * 512 + (k + 128);
        const l = m.get(clave);
        if (l === undefined) m.set(clave, [c]);
        else l.push(c);
      }
    }
  }
  return m;
}

function Mando({ modo, ciudad }: { modo: 'libre' | 'hombro'; ciudad: CiudadAbiertaConstruida | null }): JSX.Element {
  const { camera, gl } = useThree();
  const teclas = useRef(new Set<string>());
  const pos = new URLSearchParams(window.location.search).get('pos')?.split(',').map(Number);
  const inicial = pos !== undefined && pos.length === 5 && pos.every(Number.isFinite) ? pos : [3, 1.7, 26, 0, 0.02];
  const estado = useRef<EstadoDelMando>({ x: inicial[0] ?? 0, y: inicial[1] ?? 1.7, z: inicial[2] ?? 26, rumbo: inicial[3] ?? 0, cabeceo: inicial[4] ?? 0 });
  const cajas = useMemo(() => rejillaDeCajas(ciudad), [ciudad]);
  useEffect(() => {
    (window as unknown as { __mandoAbierto?: EstadoDelMando }).__mandoAbierto = estado.current;
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
  useFrame((_e, dtBruto) => {
    const dt = Math.min(dtBruto, 0.05);
    const s = estado.current;
    const t = teclas.current;
    const corre = t.has('ShiftLeft') || t.has('ShiftRight');
    const adelante = (t.has('KeyW') ? 1 : 0) - (t.has('KeyS') ? 1 : 0);
    const lado = (t.has('KeyD') ? 1 : 0) - (t.has('KeyA') ? 1 : 0);
    const fx = Math.sin(s.rumbo);
    const fz = -Math.cos(s.rumbo);
    const d = new THREE.Vector3(Math.sin(s.rumbo) * Math.cos(s.cabeceo), Math.sin(s.cabeceo), -Math.cos(s.rumbo) * Math.cos(s.cabeceo));
    if (modo === 'libre') {
      const v = (corre ? 40 : 12) * dt;
      s.x += (d.x * adelante - fz * lado) * v;
      s.y = Math.max(0.3, s.y + (d.y * adelante + ((t.has('KeyE') ? 1 : 0) - (t.has('KeyQ') ? 1 : 0))) * v);
      s.z += (d.z * adelante + fx * lado) * v;
      camera.position.set(s.x, s.y, s.z);
      camera.lookAt(s.x + d.x, s.y + d.y, s.z + d.z);
      return;
    }
    const v = (corre ? 7 : 5) * dt;
    let nx = s.x + (fx * adelante - fz * lado) * v;
    let nz = s.z + (fz * adelante + fx * lado) * v;
    const radio = 0.35;
    for (const c of cajas.get((Math.floor(nx / 8) + 128) * 512 + (Math.floor(nz / 8) + 128)) ?? []) {
      if (nx > c.x0 - radio && nx < c.x1 + radio && nz > c.z0 - radio && nz < c.z1 + radio) {
        const sal = [nx - (c.x0 - radio), c.x1 + radio - nx, nz - (c.z0 - radio), c.z1 + radio - nz];
        const m = Math.min(...sal);
        if (m === sal[0]) nx = c.x0 - radio;
        else if (m === sal[1]) nx = c.x1 + radio;
        else if (m === sal[2]) nz = c.z0 - radio;
        else nz = c.z1 + radio;
      }
    }
    s.x = Math.max(-270 + radio, Math.min(270 - radio, nx));
    s.z = Math.max(-270 + radio, Math.min(270 - radio, nz));
    const cab = Math.max(-0.6, Math.min(0.6, s.cabeceo));
    const dd = new THREE.Vector3(Math.sin(s.rumbo) * Math.cos(cab), Math.sin(cab), -Math.cos(s.rumbo) * Math.cos(cab));
    const hombro = new THREE.Vector3(-fz, 0, fx).multiplyScalar(0.55);
    camera.position.set(s.x - dd.x * 3.2 + hombro.x, 1.7 - dd.y * 3.2, s.z - dd.z * 3.2 + hombro.z);
    camera.lookAt(s.x + dd.x * 10 + hombro.x, 1.5 + dd.y * 10, s.z + dd.z * 10 + hombro.z);
  });
  return <group />;
}

interface MedidaDelLienzo {
  triangulos: number;
  llamadas: number;
  ms: number;
}

/** El lienzo de verdad (`gl.info.render`, lo del fotograma anterior) cada 15 fotogramas. */
function Medidor({ alMedir }: { alMedir: (m: MedidaDelLienzo) => void }): null {
  const { gl } = useThree();
  const ultimo = useRef(performance.now());
  const tiempos = useRef<number[]>([]);
  const cuenta = useRef(0);
  useFrame(() => {
    const ahora = performance.now();
    tiempos.current.push(ahora - ultimo.current);
    ultimo.current = ahora;
    if (tiempos.current.length > 30) tiempos.current.shift();
    if (++cuenta.current % 15 === 0) alMedir({ triangulos: gl.info.render.triangles, llamadas: gl.info.render.calls, ms: tiempos.current.reduce((a, b) => a + b, 0) / tiempos.current.length });
  });
  return null;
}

/** Lo que se mira desde fuera: la ciudad, el lienzo y el cruce síncrono. */
function Exponer({ ciudad }: { ciudad: CiudadAbiertaConstruida | null }): null {
  const { scene, gl, camera } = useThree();
  useEffect(() => {
    const pixel = new Uint8Array(4);
    let andado = 0;
    const cruzar = (n: number): Record<string, number | string> => {
      if (ciudad === null) return { error: 'sin ciudad' };
      const { largo } = caminoDelCruce();
      const ctx = gl.getContext();
      const filas: { ms: number; llamadas: number; triangulos: number; escritos: number; subidos: number; luz: number }[] = [];
      let rumbo = { dx: 1, dz: 0 };
      for (let k = 0; k < n && andado < largo; k++) {
        const t0 = performance.now();
        andado += 7 / 30;
        const p = enElCamino(andado);
        rumbo = { dx: rumbo.dx + (p.dx - rumbo.dx) * 0.15, dz: rumbo.dz + (p.dz - rumbo.dz) * 0.15 };
        const l = Math.hypot(rumbo.dx, rumbo.dz) || 1;
        camera.position.set(p.x - (rumbo.dx / l) * 3.2, 2.9, p.z - (rumbo.dz / l) * 3.2);
        camera.lookAt(p.x + (rumbo.dx / l) * 6, 1.6, p.z + (rumbo.dz / l) * 6);
        camera.updateMatrixWorld();
        const f = ciudad.actualizar(camera, andado / 7, Math.floor((andado / 7) * 20));
        gl.info.reset();
        gl.render(scene, camera);
        ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixel);
        filas.push({ ms: performance.now() - t0, llamadas: gl.info.render.calls, triangulos: gl.info.render.triangles, escritos: f.ventana.escritos, subidos: f.ventana.subidos + f.luz.bytes, luz: f.luz.texeles });
      }
      const ms = filas.map((x) => x.ms).sort((a, b) => a - b);
      const ll = filas.map((x) => x.llamadas);
      return {
        fotogramas: filas.length,
        'metros andados': Math.round(andado),
        'ms mediana': +(ms[Math.floor(ms.length / 2)] ?? 0).toFixed(2),
        'ms p99': +(ms[Math.floor(ms.length * 0.99)] ?? 0).toFixed(2),
        'ms peor': +(ms[ms.length - 1] ?? 0).toFixed(2),
        'fotogramas > 33 ms': filas.filter((x) => x.ms > 33.3).length,
        'fotogramas > 50 ms': filas.filter((x) => x.ms > 50).length,
        'llamadas mín': Math.min(...ll),
        'llamadas máx': Math.max(...ll),
        'triángulos máx': Math.max(...filas.map((x) => x.triangulos)),
        'escritos máx': Math.max(...filas.map((x) => x.escritos)),
        'bytes subidos máx': Math.max(...filas.map((x) => x.subidos)),
        'téxeles de luz máx': Math.max(...filas.map((x) => x.luz)),
        'cambios de ventana': ciudad.ventana.cambios,
        'fotogramas hasta ver la ventana, máx': Math.max(0, ...ciudad.ventana.latencias),
        'cambios de luz': ciudad.luz.cambios,
      };
    };
    (window as unknown as Record<string, unknown>).__bancoAbierto = {
      ciudad,
      scene,
      gl,
      camera,
      THREE,
      cruzar,
      reiniciar: (): void => {
        andado = 0;
      },
    };
  }, [scene, gl, camera, ciudad]);
  return null;
}

/**
 * Un «ResizeObserver» que mide aunque la página esté oculta (el mismo que el banco del barrio): el panel del
 * navegador de las pruebas no entrega medidas a una pestaña que no pinta, y el lienzo se quedaba pequeño.
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

export function BancoAbierto(): JSX.Element {
  const [ajustes, setAjustes] = useState<AjustesAbiertos>(leer);
  const [ciudad, setCiudad] = useState<CiudadAbiertaConstruida | null>(null);
  const [medida, setMedida] = useState<MedidaDelLienzo | null>(null);
  const [, setTic] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTic((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);
  const cambiar = useCallback((parte: Partial<AjustesAbiertos>) => {
    setAjustes((a) => {
      const n = { ...a, ...parte };
      const p = new URLSearchParams(window.location.search);
      p.set('ciudad', 'abierta');
      p.set('nivel', String(n.nivel));
      p.set('codigo', n.codigo);
      p.set('noche', String(n.noche));
      p.set('traza', String(n.traza));
      p.set('camara', n.camara);
      window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
      return n;
    });
  }, []);
  /* La cámara empieza en `pos` (o donde el mando), y ahí se monta, como el juego la montará donde cae quien juega. */
  const inicio = useMemo(() => {
    const pos = new URLSearchParams(window.location.search).get('pos')?.split(',').map(Number);
    return pos !== undefined && pos.length === 5 && pos.every(Number.isFinite) ? { x: pos[0] ?? 0, y: pos[1] ?? 1.7, z: pos[2] ?? 0 } : { x: 3, y: 1.7, z: 26 };
  }, []);
  const montar = useMemo(() => (ajustes.montar ? { x: inicio.x, z: inicio.z } : undefined), [ajustes.montar, inicio]);
  const presupuesto: PresupuestoSumado | null = ciudad === null ? null : presupuestoDeLaCiudad(ciudad.piezas(), ajustes.nivel, RENGLONES_DE_LA_CIUDAD_ABIERTA);
  const v = ciudad?.ventana.ahora ?? null;
  const r = v === null ? null : rectanguloDeLaVentana(v);
  const dpr = ([0.75, 1, 1.25, 1.5] as const)[ajustes.nivel];
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050807' }}>
      <Canvas
        key={`n${String(ajustes.nivel)}-${ajustes.codigo}-${String(ajustes.traza)}-${String(ajustes.noche)}`}
        dpr={dpr}
        shadows={ajustes.nivel >= 2}
        resize={{ polyfill: MedidaInmediata as unknown as typeof ResizeObserver }}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        camera={{ fov: 70, near: 0.1, far: 900, position: [inicio.x, inicio.y, inicio.z] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <LaCiudadDeNoche codigo={ajustes.codigo} noche={ajustes.noche} nivel={ajustes.nivel} traza={ajustes.traza} montarYa={montar} alConstruirLaAbierta={setCiudad} />
        <Mando modo={ajustes.camara} ciudad={ciudad} />
        <Medidor alMedir={setMedida} />
        <Exponer ciudad={ciudad} />
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
          maxWidth: 'min(520px, calc(100vw - 32px))',
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
            traza{' '}
            <input type="number" min={0} max={31} value={ajustes.traza} style={{ width: 46 }} onChange={(e) => cambiar({ traza: Math.max(0, Math.min(31, Math.floor(Number(e.target.value)) || 0)) })} />
          </label>
          <label>
            código{' '}
            <input value={ajustes.codigo} style={{ width: 70 }} onChange={(e) => cambiar({ codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'K7M2P' })} />
          </label>
          <label>
            noche{' '}
            <input type="number" min={1} value={ajustes.noche} style={{ width: 46 }} onChange={(e) => cambiar({ noche: Math.max(1, Math.floor(Number(e.target.value)) || 1) })} />
          </label>
          <label>
            cámara{' '}
            <select value={ajustes.camara} onChange={(e) => cambiar({ camara: e.target.value === 'libre' ? 'libre' : 'hombro' })}>
              <option value="hombro">hombro 1,7 m</option>
              <option value="libre">libre</option>
            </select>
          </label>
        </div>
        {ciudad !== null ? (
          <div style={{ marginTop: 6 }}>
            ciudad de {ciudad.fuente.origen === 'traza' ? 'la traza' : <span style={{ color: '#fc8' }}>SINTÉTICA (la traza aún no está escrita)</span>} · {ciudad.hora} · {ciudad.tiempo}
          </div>
        ) : null}
        {v !== null && r !== null && ciudad !== null ? (
          <div>
            ventana {v.lado}×{v.lado}: celdas [{v.i0}..{v.i1}]×[{v.j0}..{v.j1}] · cambios {ciudad.ventana.cambios} · guardadas {ciudad.ventana.celdasGuardadas} · luz {ciudad.luz.cambios}
            <div>
              {FAMILIAS.map((f) => `${f} ${ciudad.ventana.triangulos()[f].toLocaleString('es')}`).join(' · ')}
            </div>
          </div>
        ) : null}
        {medida !== null ? (
          <div>
            lienzo: {medida.triangulos.toLocaleString('es')} tri · {medida.llamadas} llamadas · {medida.ms.toFixed(1)} ms
          </div>
        ) : null}
        {presupuesto !== null ? (
          <div>
            ciudad: {presupuesto.triangulos.toLocaleString('es')} tri · {presupuesto.llamadas} llamadas · cuota N{ajustes.nivel} ({Math.round(CUOTA_DE_LA_CIUDAD * 100)} %){' '}
            {presupuesto.tope.triangulos.toLocaleString('es')}/{presupuesto.tope.llamadas}
            <span style={{ color: presupuesto.cabe ? '#8f8' : '#f88' }}> {presupuesto.cabe ? 'cabe' : 'NO CABE'}</span>
            {presupuesto.excesos.length > 0 ? <div style={{ color: '#f88' }}>{presupuesto.excesos.join(' · ')}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
