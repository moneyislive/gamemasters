/**
 * EL BANCO DE PRUEBAS DEL BURGO EN TRES DIMENSIONES.
 *
 * ═══ QUÉ DEMUESTRA, QUE ES LO ÚNICO QUE PRETENDE ═══
 *
 * Que `escenas/burgo/Burgo.tsx` —la misma escena que montará la app sobre `expo-gl`—
 * se pinta en el escritorio con React 19, que cabe en el presupuesto (≤ 110.000
 * triángulos y ≤ 24 llamadas con seis sentados y el tablero LLENO, que es lo que se
 * mira aquí con `gl.info.render`), y que las coreografías del §5.7 se LEEN: cada botón
 * inyecta un suceso como lo haría la mesa (una jugada nueva con su lista) y deja la
 * vista en su estado final, que es exactamente lo que el sondeo hace.
 *
 * ═══ EL TABLERO ES FIJO Y NO ALEATORIO ═══
 *
 * Se monta a mano con `?jugadores=6&lleno=1&semilla=ABCDE`: seis asientos con los
 * colores del Burgo, todos los títulos con dueño, casas y hoteles repartidos, dos
 * hipotecados y uno en subasta. Un reparto al azar haría bonita la captura y quitaría lo
 * único que esto vale: comparar dos ejecuciones y ver que cambió lo que se tocó.
 *
 * ═══ LA CÁMARA ES LA DEL CLIENTE, ESCRITA AQUÍ ═══
 *
 * `Burgo.tsx` no monta cámara: la pone quien monta el `Canvas`. Aquí es el mismo
 * arrastre de `banco3d.tsx` (`tirandoDelMirador`), la rueda para acercar (`acercando`
 * con `LIMITES_DEL_BURGO`), el botón derecho para pasear (`arrastrandoLaMirada`) y la
 * pose compuesta con `poseDelBurgo`, que es la cuenta que el comprobador proyecta. Se
 * monta ANTES que `<Burgo>` para que el seguimiento al que mueve corra después.
 *
 * ═══ LOS MODELOS ENTRAN POR `?url` DE VITE ═══
 *
 * La escena pide bytes por `traer(ruta)` con las rutas del servidor de juego; aquí no
 * hay servidor, así que `traer` traduce cada ruta al fichero que Vite sirve (`glb.d.ts`).
 * Es la misma frontera que en la partida: la escena no sabe de dónde vienen los bytes.
 */
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Burgo } from '../../escenas/burgo/Burgo';
import type { CasillaEn3D, ClaseDeCasillaEn3D, DadosDelBurgoEn3D, FiguraEn3D, TableroDelBurgoEn3D } from '../../escenas/burgo/tipos';
import type { SucesoDelBurgo } from '../../shared/arcade/juegos/burgo';
import type { FiguraId } from '../../escenas/embarcadero/figuras';
import { FIGURAS, rutaDeLasAnimaciones, rutaDelAventurero } from '../../escenas/embarcadero/figuras';
import type { Traer, Ventana } from '../../escenas/embarcadero/tipos';
import type { Mirador } from '../../escenas/camara';
import { esDeLaInterfaz, MINIMO_PARA_GIRAR, tirandoDelMirador } from '../../escenas/camara';
import type { Cercania } from '../../escenas/acercar';
import { acercando, arrastrandoLaMirada } from '../../escenas/acercar';
import {
  ALCANCE_DEL_BURGO,
  APERTURA,
  CAMPO_DE_LA_CAMARA,
  CERCANIA_DE_NACIMIENTO,
  LIMITES_DEL_BURGO,
  MIRADOR_DEL_BURGO,
  hacia,
  poseDeSalida,
  poseDelBurgo,
} from '../../escenas/burgo/camara-del-burgo';
import { ESQUINAS, MAZMORRA, PUERTAS, huecoDePeon } from '../../escenas/burgo/anillo-en-3d';
import { rutaDeLosDados, rutaDelBurgo } from '../../escenas/ruta-de-modelos';
import burgoGlb from '../../escenas/modelos/burgo.glb?url';
import dadosGlb from '../../escenas/modelos/dados.glb?url';
import caballeroGlb from '../../escenas/modelos/aventureros/caballero.glb?url';
import barbaroGlb from '../../escenas/modelos/aventureros/barbaro.glb?url';
import magaGlb from '../../escenas/modelos/aventureros/maga.glb?url';
import exploradoraGlb from '../../escenas/modelos/aventureros/exploradora.glb?url';
import picaroGlb from '../../escenas/modelos/aventureros/picaro.glb?url';
import encapuchadoGlb from '../../escenas/modelos/aventureros/encapuchado.glb?url';
import animacionesGlb from '../../escenas/modelos/aventureros/animaciones.glb?url';
import './estilo.css';

/* Los aventureros, uno a uno por `?url` (el `glob` de Vite no entra en los tipos de este proyecto). */
const AVENTUREROS: Readonly<Record<string, string>> = {
  'caballero.glb': caballeroGlb,
  'barbaro.glb': barbaroGlb,
  'maga.glb': magaGlb,
  'exploradora.glb': exploradoraGlb,
  'picaro.glb': picaroGlb,
  'encapuchado.glb': encapuchadoGlb,
  'animaciones.glb': animacionesGlb,
};

/** Traduce una ruta del servidor de juego al fichero que Vite sirve. */
function ficheroDe(ruta: string): string | null {
  if (ruta === rutaDelBurgo()) return burgoGlb;
  if (ruta === rutaDeLosDados()) return dadosGlb;
  if (ruta === rutaDeLasAnimaciones()) return animacionesGlb;
  for (const f of FIGURAS) if (ruta === rutaDelAventurero(f.id)) return AVENTUREROS[f.fichero] ?? null;
  return null;
}

/** UNA `traer` de módulo: la caché del cargador va por identidad de la función. */
const traer: Traer = async (ruta) => {
  const fichero = ficheroDe(ruta);
  if (fichero === null) throw new Error(`el banco no sirve ${ruta}`);
  const r = await fetch(fichero);
  if (!r.ok) throw new Error(`${ruta}: ${String(r.status)}`);
  return r.arrayBuffer();
};

/* ─────────────────────────────── El tablero fijo ─────────────────────────────── */

/** Los seis colores del Burgo (decisión 13), COPIADOS de `burgo.ts` como hace `tema.ts`. */
const COLORES_DEL_BURGO: readonly string[] = ['#f2e8cf', '#26262e', '#7d3fd6', '#2fe0d0', '#ff8f6b', '#c5e84a'];
/** Las ocho aceras, por barrio, en el orden del anillo. */
const BARRIO: Readonly<Record<number, string>> = {
  1: '#8b5a3c', 3: '#8b5a3c',
  6: '#8fd3f4', 8: '#8fd3f4', 9: '#8fd3f4',
  11: '#d95f9a', 13: '#d95f9a', 14: '#d95f9a',
  16: '#f28c28', 18: '#f28c28', 19: '#f28c28',
  21: '#d23b3b', 23: '#d23b3b', 24: '#d23b3b',
  26: '#f2d23b', 27: '#f2d23b', 29: '#f2d23b',
  31: '#3fa34d', 32: '#3fa34d', 34: '#3fa34d',
  37: '#2e5bd6', 39: '#2e5bd6',
};
const ARCAS = [2, 17, 33];
const PREGONES = [7, 22, 36];
const OFICIOS = [12, 28];
const FIGURAS_DEL_BANCO: readonly FiguraId[] = FIGURAS.map((f) => f.id);

function claseDe(i: number): ClaseDeCasillaEn3D {
  if (i === 0) return 'salida';
  if (i === MAZMORRA) return 'mazmorra';
  if (i === 20) return 'feria';
  if (i === 30) return 'a-la-mazmorra';
  if (ARCAS.includes(i)) return 'arca';
  if (PREGONES.includes(i)) return 'pregon';
  if (i === 4) return 'diezmo';
  if (i === 38) return 'alcabala';
  if (PUERTAS.includes(i)) return 'puerta';
  if (OFICIOS.includes(i)) return 'oficio';
  return 'solar';
}

/** ¿Tiene título esta casilla? Solares, oficios y puertas. */
function conTitulo(i: number): boolean {
  const c = claseDe(i);
  return c === 'solar' || c === 'oficio' || c === 'puerta';
}

function casillasDePrueba(jugadores: number, lleno: boolean): CasillaEn3D[] {
  const salida: CasillaEn3D[] = [];
  let k = 0;
  for (let i = 0; i < 40; i++) {
    const clase = claseDe(i);
    const titulo = conTitulo(i);
    const dueno = lleno && titulo ? (COLORES_DEL_BURGO[k % Math.max(1, jugadores)] as string) : null;
    /* Las casas: 0..4 y hoteles repartidos, sólo en solares; dos hipotecados y una subasta. */
    const casas = lleno && clase === 'solar' ? [1, 2, 3, 4, 5, 0][k % 6] ?? 0 : 0;
    const empenada = lleno && (i === 13 || i === 26);
    const enAlmoneda = lleno && i === 29;
    salida.push({
      indice: i,
      clase,
      colorDelBarrio: BARRIO[i] ?? null,
      dueno: enAlmoneda ? null : dueno,
      casas: empenada ? 0 : casas,
      empenada,
      enAlmoneda,
      tocable: titulo && !enAlmoneda,
    });
    if (titulo) k++;
  }
  return salida;
}

function figurasDePrueba(jugadores: number): FiguraEn3D[] {
  const salida: FiguraEn3D[] = [];
  for (let i = 0; i < jugadores; i++) {
    salida.push({
      asiento: `asiento-${String(i)}`,
      color: COLORES_DEL_BURGO[i] as string,
      figura: FIGURAS_DEL_BANCO[i % FIGURAS_DEL_BANCO.length] as FiguraId,
      casilla: [0, 3, 8, 16, 24, 37][i] ?? 0,
      presa: false,
      quebrada: false,
      esLocal: i === 0,
      leToca: i === 0,
    });
  }
  return salida;
}

/* ─────────────────────────────── La cámara del banco ─────────────────────────────── */

/**
 * LA CÁMARA AÉREA DEL BANCO: arrastre para girar, rueda para acercar, botón derecho para
 * pasear. El mirador y la cercanía van por `ref` (sesenta cambios por segundo), la
 * aritmética es la de `escenas/camara.ts` y `escenas/acercar.ts`, y la pose la compone
 * `poseDelBurgo`. Al abrir, nace sobre la Salida y en `APERTURA` segundos se abre
 * a la salida, como la partida.
 */
function CamaraDelBanco({ ventana, verEntero, acercarA }: { ventana: Ventana; verEntero: number; acercarA: { readonly id: number; readonly x: number; readonly z: number; readonly factor: number } | null }): null {
  const { camera, gl } = useThree();
  const mirador = useRef<Mirador>(MIRADOR_DEL_BURGO);
  const cercania = useRef<Cercania>(CERCANIA_DE_NACIMIENTO);
  const objetivo = useRef<Cercania | null>(null);
  const nacida = useRef<number | null>(null);
  const ventanaRef = useRef(ventana);
  ventanaRef.current = ventana;

  useEffect(() => {
    objetivo.current = poseDeSalida(ventanaRef.current);
  }, [verEntero]);
  /* «Acercar a»: la cercanía objetivo pasa a la casilla pedida, para mirar una coreografía de cerca. */
  useEffect(() => {
    if (acercarA !== null) objetivo.current = { factor: acercarA.factor, centro: { x: acercarA.x, z: acercarA.z } };
  }, [acercarA]);

  useEffect(() => {
    const lienzo = gl.domElement;
    let desde: { x: number; y: number; boton: number } | null = null;
    let gira = false;
    const baja = (e: PointerEvent): void => {
      if (e.target !== lienzo) return;
      if (esDeLaInterfaz(e)) return;
      desde = { x: e.clientX, y: e.clientY, boton: e.button };
      gira = false;
    };
    const mueve = (e: PointerEvent): void => {
      if (desde === null) return;
      if (!gira) {
        if (Math.hypot(e.clientX - desde.x, e.clientY - desde.y) < MINIMO_PARA_GIRAR) return;
        gira = true;
      }
      const pantalla = { ancho: lienzo.clientWidth, alto: lienzo.clientHeight };
      if (desde.boton === 0) {
        mirador.current = tirandoDelMirador(mirador.current, e.clientX - desde.x, e.clientY - desde.y, pantalla);
      } else {
        cercania.current = arrastrandoLaMirada(cercania.current, e.clientX - desde.x, e.clientY - desde.y, mirador.current.rumbo, ALCANCE_DEL_BURGO, pantalla);
        objetivo.current = null;
      }
      desde = { ...desde, x: e.clientX, y: e.clientY };
    };
    const suelta = (): void => {
      desde = null;
      gira = false;
    };
    const rueda = (e: WheelEvent): void => {
      e.preventDefault();
      cercania.current = acercando(cercania.current, -e.deltaY / 100, LIMITES_DEL_BURGO);
      objetivo.current = null;
    };
    const menu = (e: MouseEvent): void => {
      e.preventDefault();
    };
    window.addEventListener('pointerdown', baja);
    window.addEventListener('pointermove', mueve);
    window.addEventListener('pointerup', suelta);
    window.addEventListener('pointercancel', suelta);
    lienzo.addEventListener('wheel', rueda, { passive: false });
    lienzo.addEventListener('contextmenu', menu);
    return () => {
      window.removeEventListener('pointerdown', baja);
      window.removeEventListener('pointermove', mueve);
      window.removeEventListener('pointerup', suelta);
      window.removeEventListener('pointercancel', suelta);
      lienzo.removeEventListener('wheel', rueda);
      lienzo.removeEventListener('contextmenu', menu);
    };
  }, [gl]);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    if (nacida.current === null) {
      nacida.current = t;
      objetivo.current = poseDeSalida(ventanaRef.current);
    }
    const o = objetivo.current;
    if (o !== null) {
      cercania.current = hacia(cercania.current, o, Math.min(0.1, dt) * (t - nacida.current < APERTURA ? 1.6 : 1));
      if (Math.abs(cercania.current.factor - o.factor) < 0.002 && Math.hypot(cercania.current.centro.x - o.centro.x, cercania.current.centro.z - o.centro.z) < 0.05) objetivo.current = null;
    }
    const pose = poseDelBurgo(cercania.current, mirador.current, ventanaRef.current);
    camera.position.set(pose.posicion.x, pose.posicion.y, pose.posicion.z);
    camera.lookAt(pose.objetivo.x, pose.objetivo.y, pose.objetivo.z);
  });
  return null;
}

/** Cuenta los triángulos y las llamadas de dibujo del último fotograma: lo que decide si cabe en un móvil. */
function Contador({ alContar }: { alContar: (n: number, llamadas: number) => void }): null {
  const { gl } = useThree();
  const ultimo = useRef({ t: -1, c: -1 });
  useFrame(() => {
    const n = gl.info.render.triangles;
    const c = gl.info.render.calls;
    if (n !== ultimo.current.t || c !== ultimo.current.c) {
      ultimo.current = { t: n, c };
      alContar(n, c);
    }
  });
  return null;
}

/* ─────────────────────────────── El banco ─────────────────────────────── */

const BOTON = {
  background: '#12312a',
  color: '#7fd4b0',
  border: '1px solid #2f6b58',
  borderRadius: 8,
  padding: '6px 12px',
  font: 'inherit',
  cursor: 'pointer',
} as const;

const parametros = new URLSearchParams(window.location.search);
const JUGADORES = Math.max(1, Math.min(6, Number(parametros.get('jugadores') ?? '6') || 6));
const LLENO = parametros.get('lleno') !== '0';
const SEMILLA = parametros.get('semilla') ?? 'BANCO';

function Banco(): JSX.Element {
  const [casillas, ponerCasillas] = useState<CasillaEn3D[]>(() => casillasDePrueba(JUGADORES, LLENO));
  const [figuras, ponerFiguras] = useState<FiguraEn3D[]>(() => figurasDePrueba(JUGADORES));
  const [destacada, ponerDestacada] = useState<number | null>(0);
  const [almoneda, ponerAlmoneda] = useState<number | null>(LLENO ? 29 : null);
  const [ganador, ponerGanador] = useState<string | null>(null);
  const [trato, ponerTrato] = useState<{ de: string; a: string } | null>(null);
  const [jugada, ponerJugada] = useState(0);
  const [lista, ponerLista] = useState<readonly SucesoDelBurgo[]>([]);
  const [dados, ponerDados] = useState<DadosDelBurgoEn3D>({ par: null, tirado: false, sello: 0, porTirar: true, delanteDe: null });
  const [quien, ponerQuien] = useState(0);
  const [calidad, ponerCalidad] = useState<'plena' | 'sobria'>('plena');
  const [seguir, ponerSeguir] = useState(true);
  const [verEntero, ponerVerEntero] = useState(0);
  const [acercarA, ponerAcercarA] = useState<{ id: number; x: number; z: number; factor: number } | null>(null);
  const [dibujo, ponerDibujo] = useState({ triangulos: 0, llamadas: 0 });
  const [medida, ponerMedida] = useState({ ms: 0, fotogramas: 0 });
  const [listo, ponerListo] = useState(false);
  const [fallos, ponerFallos] = useState<string[]>([]);
  const [tocado, ponerTocado] = useState('');
  /* El panel se pliega para mirar la escena sin él encima: queda sólo la línea de la medida. */
  const [plegado, ponerPlegado] = useState(parametros.get('plegado') === '1');
  const [ventana, ponerVentana] = useState<Ventana>({ ancho: window.innerWidth, alto: window.innerHeight, franjaInferior: 0 });

  useEffect(() => {
    const mide = (): void => {
      ponerVentana({ ancho: window.innerWidth, alto: window.innerHeight, franjaInferior: 0 });
    };
    window.addEventListener('resize', mide);
    return () => {
      window.removeEventListener('resize', mide);
    };
  }, []);

  const tablero = useMemo<TableroDelBurgoEn3D>(
    () => ({ casillas, figuras, destacada, almoneda, carta: null, trato, ganador }),
    [casillas, figuras, destacada, almoneda, trato, ganador],
  );
  const sucesos = useMemo(() => ({ jugada, lista }), [jugada, lista]);
  const yo = figuras[quien] ?? (figuras[0] as FiguraEn3D);

  /** Una jugada nueva con su lista, y la vista en su estado final: lo que hace el sondeo. */
  const manda = useCallback((sucesosNuevos: readonly SucesoDelBurgo[], despues?: () => void): void => {
    despues?.();
    ponerLista(sucesosNuevos);
    ponerJugada((j) => j + 1);
  }, []);

  const mueveFigura = (asiento: string, cambios: Partial<FiguraEn3D>): void => {
    ponerFiguras((antes) => antes.map((f) => (f.asiento === asiento ? { ...f, ...cambios } : f)));
  };
  const cambiaCasilla = (indice: number, cambios: Partial<CasillaEn3D>): void => {
    ponerCasillas((antes) => antes.map((c) => (c.indice === indice ? { ...c, ...cambios } : c)));
  };

  const casillaTras = (desde: number, pasos: number): number => (desde + pasos) % 40;
  const recorrido = (desde: number, pasos: number): number[] => Array.from({ length: pasos }, (_, k) => casillaTras(desde, k + 1));

  const tirar = (par: [number, number]): void => {
    manda([{ que: 'tira', quien: yo.asiento, dados: par, dobles: par[0] === par[1], enLaMazmorra: yo.presa }], () => {
      ponerDados({ par, tirado: true, sello: dados.sello + 1, porTirar: false, delanteDe: null });
    });
  };
  const mover = (pasos: number, como: 'anda' | 'viaja' | 'retrocede' = 'anda'): void => {
    const hasta = casillaTras(yo.casilla, pasos);
    const rec = como === 'retrocede' ? Array.from({ length: pasos }, (_, k) => (yo.casilla - k - 1 + 40) % 40) : recorrido(yo.casilla, pasos);
    const porLaPuertaMayor = como !== 'retrocede' && rec.includes(0);
    const nuevos: SucesoDelBurgo[] = [{ que: 'mueve', quien: yo.asiento, desde: yo.casilla, hasta: rec[rec.length - 1] ?? hasta, recorrido: rec, porLaPuertaMayor, como }];
    if (porLaPuertaMayor) nuevos.push({ que: 'cobra', quien: yo.asiento, de: null, cuanto: 200, porque: 'puerta-mayor', casilla: 0 });
    manda(nuevos, () => {
      mueveFigura(yo.asiento, { casilla: rec[rec.length - 1] ?? hasta, presa: false });
      ponerDestacada(rec[rec.length - 1] ?? hasta);
    });
  };
  const sorteo = (): void => {
    const nuevos: SucesoDelBurgo[] = figuras.map((f, k) => ({ que: 'sale', quien: f.asiento, dados: [1 + (k % 6), 1 + ((k * 3) % 6)], ronda: 1 }));
    nuevos.push({ que: 'empieza', quien: yo.asiento });
    manda(nuevos, () => {
      ponerFiguras((antes) => antes.map((f) => ({ ...f, casilla: 0, presa: false, quebrada: false })));
      ponerDados({ par: null, tirado: false, sello: 0, porTirar: true, delanteDe: null });
      ponerDestacada(0);
    });
  };

  const alTocarLosDados = useCallback(
    (): Promise<'hecho' | 'rechazado' | 'sin-red'> =>
      new Promise((resuelve) => {
        window.setTimeout(() => {
          const par: [number, number] = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
          tirar(par);
          resuelve('hecho');
        }, 400);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [yo, dados],
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#d6dfe4' }}>
      <Canvas
        shadows={false}
        dpr={[1, 2]}
        /* `preserveDrawingBuffer` sólo en el banco: para poder sacar la captura del lienzo con `toDataURL`. */
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ fov: CAMPO_DE_LA_CAMARA, near: 0.5, far: ALCANCE_DEL_BURGO * 8 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        {/* La cámara ANTES que la escena: el seguimiento al que mueve corre después de ella. */}
        <CamaraDelBanco ventana={ventana} verEntero={verEntero} acercarA={acercarA} />
        <Contador
          alContar={(triangulos, llamadas) => {
            ponerDibujo({ triangulos, llamadas });
          }}
        />
        <Burgo
          tablero={tablero}
          dados={dados}
          sucesos={sucesos}
          codigo={SEMILLA}
          ventana={ventana}
          traer={traer}
          calidad={calidad}
          camara={{ modo: 'aerea' }}
          seguirAlQueMueve={seguir}
          quieto={false}
          alTocarCasilla={(i) => {
            ponerTocado(`casilla ${String(i)}`);
          }}
          alTocarLosDados={alTocarLosDados}
          alTocarFigura={(a) => {
            ponerTocado(`figura ${a}`);
          }}
          alEstarListo={() => {
            ponerListo(true);
          }}
          alFallar={(motivo) => {
            ponerFallos((f) => [...f, motivo]);
          }}
          alMedir={(m) => {
            ponerMedida({ ms: m.ms, fotogramas: m.fotogramas });
          }}
          alTerminarLaCola={() => {
            ponerTocado((t) => `${t} · cola terminada`);
          }}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          left: 18,
          top: 18,
          maxWidth: 560,
          color: '#cfe3d6',
          font: '13px/1.6 system-ui, sans-serif',
          background: 'rgba(6,17,15,0.78)',
          border: '1px solid #24483c',
          borderRadius: 10,
          padding: '10px 14px',
        }}
      >
        <div style={{ letterSpacing: 2, fontSize: 11, opacity: 0.65 }}>
          BANCO DE PRUEBAS · EL BURGO{' '}
          <button type="button" id="plegar" style={{ ...BOTON, padding: '0 8px', marginLeft: 8 }} onClick={() => ponerPlegado((p) => !p)}>
            {plegado ? 'desplegar' : 'plegar'}
          </button>
        </div>
        <div>
          {JUGADORES} sentados · {LLENO ? 'tablero lleno' : 'tablero vacío'} · semilla {SEMILLA} · {listo ? 'listo' : 'cargando…'}
        </div>
        <div id="medida">
          {dibujo.triangulos.toLocaleString('es-ES')} triángulos · {dibujo.llamadas} llamadas · {medida.ms.toFixed(1)} ms · {medida.fotogramas} fotogramas/s
        </div>
        {fallos.length > 0 ? <div style={{ color: '#ff8b7a' }}>{fallos.join(' · ')}</div> : null}
        <div id="estado" style={{ color: '#9fe6b8' }}>
          mueve: {yo.asiento} (casilla {yo.casilla}{yo.presa ? ', presa' : ''}{yo.quebrada ? ', quebrada' : ''}) · jugada {jugada} · {tocado}
        </div>
        <div style={{ display: plegado ? 'none' : 'block' }}>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button type="button" style={{ ...BOTON, borderColor: yo.color }} onClick={() => ponerQuien((q) => (q + 1) % figuras.length)}>
            Mueve: {yo.asiento}
          </button>
          <button type="button" style={BOTON} onClick={sorteo}>
            Sorteo (sale × {figuras.length})
          </button>
          <button type="button" style={BOTON} onClick={() => tirar([3, 4])}>
            Tirar 3+4
          </button>
          <button type="button" style={BOTON} onClick={() => tirar([5, 5])}>
            Tirar doble
          </button>
          <button type="button" style={BOTON} onClick={() => mover(3)}>
            Mover 3
          </button>
          <button type="button" style={BOTON} onClick={() => mover(12)}>
            Mover 12
          </button>
          <button type="button" style={BOTON} onClick={() => mover(3, 'retrocede')}>
            Retroceder 3
          </button>
          <button type="button" style={BOTON} onClick={() => mover(20, 'viaja')}>
            Viajar 20
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button type="button" style={BOTON} onClick={() => manda([{ que: 'carta', quien: yo.asiento, mazo: 'pregon', carta: 1 }])}>
            Carta de Sucesos
          </button>
          <button type="button" style={BOTON} onClick={() => manda([{ que: 'carta', quien: yo.asiento, mazo: 'arca', carta: 2 }])}>
            Carta del Arca
          </button>
          <button type="button" style={BOTON} onClick={() => manda([{ que: 'cobra', quien: yo.asiento, de: null, cuanto: 200, porque: 'puerta-mayor', casilla: yo.casilla }])}>
            Cobrar 200 del Ayuntamiento
          </button>
          <button
            type="button"
            style={BOTON}
            onClick={() => {
              const otro = figuras[(quien + 1) % figuras.length] as FiguraEn3D;
              manda([
                { que: 'paga', quien: yo.asiento, a: otro.asiento, cuanto: 150, porque: 'renta', casilla: yo.casilla },
                { que: 'cobra', quien: otro.asiento, de: yo.asiento, cuanto: 150, porque: 'renta', casilla: yo.casilla },
              ]);
            }}
          >
            Pagar renta 150
          </button>
          <button
            type="button"
            style={BOTON}
            onClick={() => {
              const c = casillas.find((x) => x.clase === 'solar' && x.dueno === yo.color && x.casas < 5) ?? casillas.find((x) => x.clase === 'solar');
              if (c === undefined) return;
              const casas = c.casas + 1;
              manda([{ que: 'alza', quien: yo.asiento, casilla: c.indice, casas }], () => cambiaCasilla(c.indice, { casas, dueno: yo.color }));
            }}
          >
            Alzar
          </button>
          <button
            type="button"
            style={BOTON}
            onClick={() => {
              const c = casillas.find((x) => x.clase === 'solar' && x.dueno === yo.color && x.casas > 0 && x.casas < 5);
              if (c === undefined) return;
              const casas = c.casas - 1;
              manda([{ que: 'vende', quien: yo.asiento, casilla: c.indice, casas }], () => cambiaCasilla(c.indice, { casas }));
            }}
          >
            Vender
          </button>
          <button
            type="button"
            style={BOTON}
            onClick={() => {
              const c = casillas.find((x) => conTitulo(x.indice) && x.dueno === null && !x.enAlmoneda) ?? casillas.find((x) => conTitulo(x.indice));
              if (c === undefined) return;
              manda([{ que: 'compra', quien: yo.asiento, casilla: c.indice, cuanto: 200 }], () => cambiaCasilla(c.indice, { dueno: yo.color }));
            }}
          >
            Comprar
          </button>
          <button
            type="button"
            style={BOTON}
            onClick={() => {
              const c = casillas.find((x) => x.dueno === yo.color && x.casas === 0);
              if (c === undefined) return;
              const empenada = !c.empenada;
              manda([{ que: empenada ? 'empena' : 'desempena', quien: yo.asiento, casilla: c.indice }], () => cambiaCasilla(c.indice, { empenada }));
            }}
          >
            Hipotecar / deshipotecar
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            style={BOTON}
            onClick={() => {
              const c = casillas.find((x) => conTitulo(x.indice) && !x.enAlmoneda) as CasillaEn3D;
              manda([{ que: 'almoneda-abierta', casilla: c.indice }], () => {
                cambiaCasilla(c.indice, { dueno: null, enAlmoneda: true });
                ponerAlmoneda(c.indice);
              });
            }}
          >
            Abrir subasta
          </button>
          <button
            type="button"
            style={BOTON}
            onClick={() => {
              if (almoneda === null) return;
              const c = almoneda;
              manda([{ que: 'almoneda-cerrada', casilla: c, ganador: yo.asiento, cuanto: 300 }], () => {
                cambiaCasilla(c, { dueno: yo.color, enAlmoneda: false });
                ponerAlmoneda(null);
              });
            }}
          >
            Cerrar subasta (gana)
          </button>
          <button type="button" style={BOTON} onClick={() => manda([{ que: 'a-la-mazmorra', quien: yo.asiento, desde: yo.casilla, porque: 'casilla' }], () => mueveFigura(yo.asiento, { casilla: MAZMORRA, presa: true }))}>
            A comisaría
          </button>
          <button type="button" style={BOTON} onClick={() => manda([{ que: 'sale-de-la-mazmorra', quien: yo.asiento, como: 'fianza' }, { que: 'mueve', quien: yo.asiento, desde: MAZMORRA, hasta: 14, recorrido: recorrido(MAZMORRA, 4), porLaPuertaMayor: false, como: 'anda' }], () => mueveFigura(yo.asiento, { casilla: 14, presa: false }))}>
            Sale de la Comisaría + 4
          </button>
          <button type="button" style={BOTON} onClick={() => manda([{ que: 'sigue-presa', quien: yo.asiento, intento: 1 }])}>
            Sigue presa
          </button>
          <button type="button" style={BOTON} onClick={() => manda([{ que: 'apuro', quien: yo.asiento, debe: 400 }])}>
            Apuro
          </button>
          <button type="button" style={BOTON} onClick={() => manda([{ que: 'quiebra', quien: yo.asiento, acreedor: null }], () => mueveFigura(yo.asiento, { quebrada: true }))}>
            Quiebra
          </button>
          <button
            type="button"
            style={BOTON}
            onClick={() => {
              const otro = figuras[(quien + 1) % figuras.length] as FiguraEn3D;
              ponerTrato((t) => (t === null ? { de: yo.asiento, a: otro.asiento } : null));
              manda([{ que: 'trato', id: 1, de: yo.asiento, a: otro.asiento, fin: trato === null ? 'propuesto' : 'aceptado' }]);
            }}
          >
            Trato
          </button>
          <button type="button" style={BOTON} onClick={() => manda([{ que: 'turno', de: (figuras[(quien + 1) % figuras.length] as FiguraEn3D).asiento }], () => { ponerQuien((q) => (q + 1) % figuras.length); ponerDestacada((figuras[(quien + 1) % figuras.length] as FiguraEn3D).casilla); })}>
            Turno
          </button>
          <button type="button" style={BOTON} onClick={() => manda([{ que: 'fin', ganadores: [yo.asiento], porque: 'ultimo-en-pie' }], () => ponerGanador(yo.asiento))}>
            Fin
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button type="button" style={BOTON} onClick={() => ponerVerEntero((v) => v + 1)}>
            Ver el burgo entero
          </button>
          <button
            type="button"
            id="acercar"
            style={BOTON}
            onClick={() => {
              const p = huecoDePeon(yo.casilla, quien);
              ponerAcercarA((a) => ({ id: (a?.id ?? 0) + 1, x: p.x, z: p.z, factor: 0.3 }));
            }}
          >
            Acercar al que mueve
          </button>
          <button
            type="button"
            id="acercar-plaza"
            style={BOTON}
            onClick={() => {
              ponerAcercarA((a) => ({ id: (a?.id ?? 0) + 1, x: 0, z: 0, factor: 0.45 }));
            }}
          >
            Acercar a la plaza
          </button>
          <button type="button" style={{ ...BOTON, borderColor: seguir ? '#9fe6b8' : undefined }} onClick={() => ponerSeguir((s) => !s)}>
            Seguir al que mueve: {seguir ? 'sí' : 'no'}
          </button>
          <button type="button" style={BOTON} onClick={() => ponerCalidad((c) => (c === 'plena' ? 'sobria' : 'plena'))}>
            Calidad: {calidad}
          </button>
          <button
            type="button"
            style={BOTON}
            onClick={() => {
              ponerCasillas(casillasDePrueba(JUGADORES, LLENO));
              ponerFiguras(figurasDePrueba(JUGADORES));
              ponerGanador(null);
              ponerTrato(null);
              ponerAlmoneda(LLENO ? 29 : null);
            }}
          >
            Reponer el tablero
          </button>
          {ESQUINAS.length === 4 ? null : <span>?</span>}
        </div>
        </div>
      </div>
    </div>
  );
}

/* La raíz se crea una vez y se guarda en el propio div: ver `banco3d.tsx`. */
const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Falta el <div id="raiz"> de banco-burgo.html');
type ConRaiz = HTMLElement & { __raizDeReact?: ReturnType<typeof createRoot> };
const donde = raiz as ConRaiz;
donde.__raizDeReact ??= createRoot(donde);
donde.__raizDeReact.render(<Banco />);
