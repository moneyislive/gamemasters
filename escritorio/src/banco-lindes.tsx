/**
 * EL BANCO DE PRUEBAS DE LAS LINDES: el valle con una partida de verdad y sin servidor.
 *
 * ═══ QUÉ DEMUESTRA, QUE ES LO ÚNICO QUE PRETENDE ═══
 *
 * Lo que `verify:lindes-escena` no puede: que el valle SE VE. Que una villa cerrada
 * tiene su muralla alrededor y una que sigue en la losa de al lado NO la tiene por
 * en medio; que las sendas casan en la raya entre dos losas; que un labriego se
 * distingue de otro a la distancia a la que se juega; que la ermita se lee como una
 * ermita; y que el paseo en primera persona no atraviesa nada.
 *
 * ═══ LA PARTIDA ES LA DE VERDAD ═══
 *
 * No hay estados escritos a mano: se llama a `avanzarLasLindes` —el mismo reductor
 * que corre en Render— y se juegan las jugadas que pida la dirección. Una escena
 * probada contra un estado inventado es una escena probada contra lo que su autor
 * creía que el juego produce, que es justo lo que no hay que probar.
 *
 * Los bytes de los `.glb` se piden a las direcciones que da Vite con `?url`: la
 * escena no se entera y recibe la misma `traer` que en la Sala.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { Lindes } from '../../escenas/lindes/Lindes';
import type { ModoDeCamaraDeLasLindes } from '../../escenas/lindes/tipos';
import { RUTA_DE_MODELOS, rutaDelTablero } from '../../escenas/ruta-de-modelos';
import { FICHERO_DE_ANIMACIONES } from '../../escenas/embarcadero/figuras';
import tableroGlb from '../../escenas/modelos/tablero.glb?url';
import animacionesGlb from '../../escenas/modelos/aventureros/animaciones.glb?url';
import caballeroGlb from '../../escenas/modelos/aventureros/caballero.glb?url';
import barbaroGlb from '../../escenas/modelos/aventureros/barbaro.glb?url';
import magaGlb from '../../escenas/modelos/aventureros/maga.glb?url';
import exploradoraGlb from '../../escenas/modelos/aventureros/exploradora.glb?url';
import picaroGlb from '../../escenas/modelos/aventureros/picaro.glb?url';
import encapuchadoGlb from '../../escenas/modelos/aventureros/encapuchado.glb?url';
import {
  EMPEZAR,
  PASAR,
  PLANTAR,
  PONER,
  avanzarLasLindes,
  deQuienEsElTurno,
  loQueSeVe,
  opcionesDeLasLindes,
  partidaNueva,
  seAcabo,
} from '../../shared/arcade/juegos/lindes';
import type { EstadoDeLasLindes } from '../../shared/arcade/juegos/lindes';
import { tableroEnTres } from '../../shared/arcade/juegos/lindes-en-tres';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';
import type { LosSentados } from '../../shared/arcade/tipos';
import { esRechazo } from '../../shared/arcade/motor';

/* ───────────────────────────── Los mandos de la dirección ───────────────────────────── */

const mandos = new URLSearchParams(window.location.search);
const CUANTAS_LOSAS = Math.max(1, Math.min(72, Number(mandos.get('losas') ?? '24')));
const CUANTOS = Math.max(2, Math.min(5, Number(mandos.get('jugadores') ?? '4')));
const CODIGO = (mandos.get('semilla') ?? 'LINDE').toUpperCase();

/* ─────────────────────────── La partida, jugada de verdad ─────────────────────────── */

const NOMBRES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena'];

/** Un sorteo con semilla, para que el mismo código dé siempre la misma partida. */
function sorteo(semilla: number): () => number {
  let x = (semilla >>> 0) + 0x6d2b79f5;
  return () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function unaPartida(codigo: string, cuantos: number, hastaLosas: number): EstadoDeLasLindes {
  const asientos: string[] = [];
  for (let i = 0; i < cuantos; i++) asientos.push(`a-${i}`);
  const sentados: LosSentados = asientos.map((a, i) => ({ asiento: a, nombre: NOMBRES[i] ?? a }));
  const semilla = semillaDelCodigo(codigo, 7);
  const tirada = sorteo(semilla);

  const ctx = (quien: string | null, azar: number) => ({ quien, azar, tic: 0, asientos });
  let estado = avanzarLasLindes(partidaNueva(), { tipo: EMPEZAR }, ctx(asientos[0] as string, semilla));
  if (esRechazo(estado)) return partidaNueva();

  /*
   * ═══ SE PARA CON UNA LOSA EN LA MANO, NO AL PONER LA ÚLTIMA ═══
   *
   * La condición era sólo «hasta que el tablero tenga N losas», y eso deja la partida
   * parada en el instante EXACTO en que se acaba de poner una: la mano vacía, ningún
   * hueco donde señalar, ningún fantasma y el botón «giro» girando una losa que no
   * existe. O sea, la mitad de la pantalla del jugador sin poder mirarse en el banco
   * que está para mirarla, y en verde, porque el tablero salía precioso.
   *
   * Ahora se sigue un movimiento más hasta que hay algo en la mano. Es lo que ve un
   * jugador de verdad la mayor parte de su turno.
   */
  const conLaManoPuesta = (e: EstadoDeLasLindes): boolean =>
    Object.keys(e.tablero).length >= hastaLosas && e.enMano !== '';

  let vueltas = 0;
  while (!seAcabo(estado) && !conLaManoPuesta(estado) && vueltas < 400) {
    vueltas++;
    const quien = deQuienEsElTurno(estado);
    if (quien === null) break;
    const vista = loQueSeVe(estado, quien, sentados);
    const opciones = opcionesDeLasLindes(vista, quien);
    if (opciones.length === 0) break;

    /* Planta cuando puede —si no, el tablero sale sin labriegos y no se ve nada— y
       coloca pegado a lo que ya hay, que es lo que hace que el valle salga compacto. */
    const plantar = opciones.find((o) => o.tipo === PLANTAR && tirada() < 0.75);
    let elegida = plantar;
    if (elegida === undefined) {
      const poner = opciones.filter((o) => o.tipo === PONER);
      if (poner.length > 0) {
        let mejor = -1;
        let mejores = poner;
        for (const o of poner) {
          const c = o.carga as { x: number; y: number };
          let vecinas = 0;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              if (estado.tablero[`${c.x + dx},${c.y + dy}`] !== undefined) vecinas++;
            }
          }
          if (vecinas > mejor) {
            mejor = vecinas;
            mejores = [o];
          } else if (vecinas === mejor) mejores.push(o);
        }
        elegida = mejores[Math.floor(tirada() * mejores.length)];
      } else {
        elegida = opciones.find((o) => o.tipo === PASAR) ?? opciones[0];
      }
    }
    if (elegida === undefined) break;
    const salida = avanzarLasLindes(estado, { tipo: elegida.tipo, carga: elegida.carga }, ctx(quien, semilla + vueltas));
    estado = esRechazo(salida) ? salida.estado : salida;
  }
  return estado;
}

/* ──────────────────────────────── Las formas del lienzo ──────────────────────────────── */

/**
 * ═══ POR QUÉ EL BANCO SABE PONERSE DEL TAMAÑO DE UN MÓVIL ═══
 *
 * Porque desde fuera no se puede. El panel del navegador que se usa para mirar esto
 * informa SIEMPRE de una ventana de 1024 de ancho, por mucho que se le pida emular un
 * teléfono: lo que hace es escalar la imagen, no estrechar la página. Así que la única
 * forma que hay en esta máquina de ver la escena con proporción de móvil es que la caja
 * del lienzo la tenga.
 *
 * Y vale igual de bien, porque **lo que la escena mide no es la ventana: es el LIENZO**.
 * El `size` de `useThree` sale de un `ResizeObserver` sobre el elemento `<canvas>`, así
 * que un lienzo de 390 por 844 le da a la cámara exactamente la misma proporción, el
 * mismo encuadre y el mismo rincón para la losa de la mano que un teléfono de verdad.
 * Lo que NO prueba es el rendimiento de una tarjeta de móvil, que es otra cosa y no se
 * mide desde aquí.
 */
interface FormaDeLienzo {
  readonly nombre: string;
  /** `null` es «todo el hueco», que es como estaba el banco antes de esto. */
  readonly ancho: number | null;
  readonly alto: number | null;
}

const LIENZOS: readonly FormaDeLienzo[] = [
  { nombre: 'pleno', ancho: null, alto: null },
  /*
   * ═══ «MÓVIL» ES EL TELÉFONO ENTERO; «MÓVIL CON HOJA» ES EL LIENZO DE VERDAD ═══
   *
   * En la app, el lienzo NO ocupa el teléfono: encima lleva el raíl del turno y debajo
   * la hoja con la losa de la mano, el botón de girar y la tira de sitios — y las dos
   * son HERMANAS del lienzo, no están encima, así que lo que la escena recibe es lo que
   * sobra entre ellas. Medido sobre la pantalla de la app: unos 60 puntos arriba y unos
   * 200 abajo en un teléfono de 844, o sea un lienzo de 390 por 584.
   *
   * Los dos están porque dicen cosas distintas: el de 844 es el caso peor de proporción
   * —lo que se ve si un día el lienzo se hace de pantalla completa— y el de 584 es lo
   * que un jugador tiene delante hoy. Mirar sólo el segundo dejaría sin probar la
   * proporción extrema; mirar sólo el primero sería mirar una pantalla que no existe.
   */
  { nombre: 'móvil con hoja', ancho: 390, alto: 584 },
  { nombre: 'móvil de pie', ancho: 390, alto: 844 },
  { nombre: 'móvil tumbado', ancho: 844, alto: 390 },
  { nombre: 'tableta', ancho: 768, alto: 1024 },
];

/* ─────────────────────────────── Las direcciones de Vite ─────────────────────────────── */

const DIRECCIONES: Readonly<Record<string, string>> = {
  [rutaDelTablero()]: tableroGlb,
  /* Y los aventureros, que es lo que anda por encima del tablero en hombro y en ojos. */
  [`${RUTA_DE_MODELOS}/aventureros/${FICHERO_DE_ANIMACIONES}`]: animacionesGlb,
  [`${RUTA_DE_MODELOS}/aventureros/caballero.glb`]: caballeroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/barbaro.glb`]: barbaroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/maga.glb`]: magaGlb,
  [`${RUTA_DE_MODELOS}/aventureros/exploradora.glb`]: exploradoraGlb,
  [`${RUTA_DE_MODELOS}/aventureros/picaro.glb`]: picaroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/encapuchado.glb`]: encapuchadoGlb,
};

async function traer(ruta: string): Promise<ArrayBuffer> {
  const donde = DIRECCIONES[ruta];
  if (donde === undefined) throw new Error(`El banco no sabe de dónde sacar ${ruta}`);
  const r = await fetch(donde);
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
  return r.arrayBuffer();
}

/* ───────────────────────────────────── La página ───────────────────────────────────── */

function Banco(): JSX.Element {
  const [losas, setLosas] = useState(CUANTAS_LOSAS);
  const [modo, setModo] = useState<'mesa' | 'hombro' | 'ojos'>('mesa');
  const [giro, setGiro] = useState<Giro>(0);
  const [forma, setForma] = useState<FormaDeLienzo>(LIENZOS[0] as FormaDeLienzo);
  const [medida, setMedida] = useState<{ triangulos: number; llamadas: number; ms: number } | null>(null);

  const sentados: LosSentados = useMemo(() => {
    const salida = [];
    for (let i = 0; i < CUANTOS; i++) salida.push({ asiento: `a-${i}`, nombre: NOMBRES[i] ?? `a-${i}` });
    return salida;
  }, []);

  const estado = useMemo(() => unaPartida(CODIGO, CUANTOS, losas), [losas]);
  const vista = useMemo(
    () => loQueSeVe(estado, deQuienEsElTurno(estado), sentados),
    [estado, sentados],
  );
  const datos = useMemo(() => tableroEnTres(vista), [vista]);

  const camara: ModoDeCamaraDeLasLindes = modo === 'mesa' ? { modo: 'mesa' } : { modo, asiento: 'a-0' };

  const alMedir = useCallback((m: { triangulos: number; llamadas: number; ms: number }) => {
    setMedida({ triangulos: m.triangulos, llamadas: m.llamadas, ms: m.ms });
  }, []);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.background = '#0d1408';
  }, []);

  /*
   * ═══ LA VENTANA SE MIDE CUANDO CAMBIA, Y NO UNA VEZ AL NACER ═══
   *
   * Esto era `ventana={{ ancho: window.innerWidth, … }}` escrito en el JSX. Se lee en cada
   * pintado, sí, pero NADA repinta el banco cuando cambia el tamaño de la ventana: la
   * escena se quedaba con el encuadre del arranque. Probando la pantalla estrecha de un
   * móvil de pie, el tablero quedaba ENTERO fuera del lienzo y sólo se veía cielo — y no
   * era la escena, era el banco jurándole que la ventana seguía siendo apaisada.
   *
   * Un banco que miente sobre la forma de la pantalla es peor que no tenerlo: es el único
   * sitio donde se puede ver si algo se sale por un canto.
   */
  const [delNavegador, setDelNavegador] = useState(() => ({
    ancho: window.innerWidth,
    alto: window.innerHeight,
  }));
  useEffect(() => {
    const alCambiar = (): void => {
      setDelNavegador({ ancho: window.innerWidth, alto: window.innerHeight });
    };
    window.addEventListener('resize', alCambiar);
    alCambiar();
    return () => window.removeEventListener('resize', alCambiar);
  }, []);

  /*
   * LO QUE MIDE EL LIENZO, para enseñarlo en el raíl. No se le pasa a la escena: la
   * escena lo mide ella sola con su `ResizeObserver`, que es la medida de verdad. Esto
   * está para que quien mire sepa CONTRA QUÉ está mirando, que es medio banco.
   */
  const elLienzo = {
    ancho: forma.ancho ?? delNavegador.ancho,
    alto: forma.alto ?? delNavegador.alto,
  };

  if (datos === null) return <p style={{ color: 'white' }}>La vista no es de Las Lindes.</p>;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d1408',
      }}
    >
      <div
        style={{
          width: forma.ancho === null ? '100%' : `${String(forma.ancho)}px`,
          height: forma.alto === null ? '100%' : `${String(forma.alto)}px`,
          maxWidth: '100%',
          maxHeight: '100%',
          /* Un filo para que se vea dónde acaba el lienzo, que es de lo que se trata. */
          outline: forma.ancho === null ? 'none' : '1px solid rgba(232,228,212,.45)',
          position: 'relative',
        }}
      >
      <Canvas
        shadows={false}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ fov: 45, near: 1, far: 6000 }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.02;
        }}
      >
        <Lindes
          tablero={datos}
          codigo={CODIGO}
          traer={traer}
          calidad="plena"
          camara={camara}
          giroEnMano={giro}
          alTocarHueco={(x, y, g) => {
            console.log('toque en', x, y, 'con giro', g);
          }}
          alSenalarHueco={() => undefined}
          alMedir={alMedir}
        />
      </Canvas>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          font: '13px system-ui, sans-serif',
          color: '#e8e4d4',
          background: 'rgba(12,20,8,.72)',
          padding: '8px 10px',
          borderRadius: 8,
          maxWidth: 560,
        }}
      >
        <strong>Las Lindes</strong>
        <span>· {CUANTOS} jugadores</span>
        <span>· semilla {CODIGO}</span>
        <span>· {Object.keys(estado.tablero).length} losas</span>
        <span>· {estado.plantados.length} labriegos</span>
        {medida !== null ? (
          <span>
            · {medida.triangulos.toLocaleString('es')} tri, {medida.llamadas} llamadas,{' '}
            {medida.ms.toFixed(1)} ms
          </span>
        ) : null}
        <button type="button" onClick={() => setLosas((n) => Math.max(1, n - 5))}>
          −5 losas
        </button>
        <button type="button" onClick={() => setLosas((n) => Math.min(72, n + 5))}>
          +5 losas
        </button>
        <button type="button" onClick={() => setLosas(72)}>
          Hasta el final
        </button>
        {(['mesa', 'hombro', 'ojos'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setModo(m)} disabled={modo === m}>
            {m}
          </button>
        ))}
        <button type="button" onClick={() => setGiro(((giro + 1) % 4) as Giro)}>
          giro {giro}
        </button>
        {/*
          LAS FORMAS DE LIENZO. Ver el porqué donde se declaran: desde fuera no se puede
          estrechar esta ventana, y lo que la escena mide es el lienzo y no la ventana.
        */}
        {LIENZOS.map((f) => (
          <button
            key={f.nombre}
            type="button"
            onClick={() => setForma(f)}
            disabled={forma.nombre === f.nombre}
          >
            {f.nombre}
          </button>
        ))}
        <span>
          · lienzo {elLienzo.ancho}×{elLienzo.alto}
        </span>
      </div>
    </div>
  );
}

/*
 * LA RAÍZ SE GUARDA EN EL PROPIO NODO, igual que en `banco-hoja-burgo.tsx` y por lo que
 * allí está explicado: con `createRoot` a pelo, cada reejecución en caliente crea OTRA raíz
 * sobre el mismo `div` y React llena la consola de avisos. Que no es un fallo del producto
 * da igual: lo que importa es que TAPA el que sí lo sea, y la consola de un banco existe
 * exactamente para eso.
 */
type ConRaiz = HTMLElement & { __raizDeReact?: ReturnType<typeof createRoot> };

const donde = document.getElementById('raiz') as ConRaiz | null;
if (donde !== null) {
  donde.__raizDeReact ??= createRoot(donde);
  donde.__raizDeReact.render(<Banco />);
}
