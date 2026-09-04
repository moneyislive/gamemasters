/**
 * EL BANCO DE PRUEBAS DEL MUELLE: la escena del lobby con una mesa de mentira.
 *
 * ═══ QUÉ DEMUESTRA, QUE ES LO ÚNICO QUE PRETENDE ═══
 *
 * Lo que `verify:embarcadero` no puede: que el embarcadero SE VE. El tinte del
 * barco con su volumen, la brasa en el agua, las motas, la llegada en barco de
 * quien se sienta, el zarpe con el amanecer, y —lo que más importa— que en un
 * móvil de 9:19,5 con la hoja del HUD al 36 % el aventurero local queda entero
 * encima de la hoja. Para eso el marco se elige con botones y la hoja se pinta
 * como una lámina gris encima, con la misma `franjaInferior` que mandaría la app.
 *
 * ═══ LA MESA ES SIMULADA Y `traer` VIENE DE VITE ═══
 *
 * No hay servidor: los asientos se sientan y se levantan con botones, y los bytes
 * de los `.glb` se piden a las direcciones que Vite da con `?url`, traduciendo
 * las rutas de `figuras.ts` con un mapa. La escena no sabe nada de esto: recibe
 * la misma `MesaEnElMuelle`, la misma `Ventana` y la misma `traer` que en la Sala.
 *
 * ═══ EL MISMO `Canvas` QUE EL ESCRITORIO ═══
 *
 * ACES a 0,95, `dpr` de 1 a 2, antialias: lo que monta `muelle.tsx`, para que lo
 * que se mire aquí sea lo que se va a ver allí.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { Embarcadero } from '../../escenas/embarcadero/Embarcadero';
import {
  FICHERO_DE_ANIMACIONES,
  FIGURAS,
  figura as datosDeFigura,
  RUTA_DE_MODELOS,
  rutaDelEmbarcadero,
} from '../../escenas/embarcadero/figuras';
import type { FiguraId } from '../../escenas/embarcadero/figuras';
import { temaDelMuelle } from '../../escenas/embarcadero/tema';
import type { TemaDelMuelle } from '../../escenas/embarcadero/tema';
import type { AsientoEnElMuelle, Calidad, MesaEnElMuelle, Traer, Ventana } from '../../escenas/embarcadero/tipos';
import embarcaderoGlb from '../../escenas/modelos/embarcadero.glb?url';
import animacionesGlb from '../../escenas/modelos/aventureros/animaciones.glb?url';
import caballeroGlb from '../../escenas/modelos/aventureros/caballero.glb?url';
import barbaroGlb from '../../escenas/modelos/aventureros/barbaro.glb?url';
import magaGlb from '../../escenas/modelos/aventureros/maga.glb?url';
import exploradoraGlb from '../../escenas/modelos/aventureros/exploradora.glb?url';
import picaroGlb from '../../escenas/modelos/aventureros/picaro.glb?url';
import encapuchadoGlb from '../../escenas/modelos/aventureros/encapuchado.glb?url';
import './banco-lobby.css';

/* ─────────────────────────── Las direcciones de Vite ─────────────────────────── */

/**
 * De la ruta que pide la escena a la dirección que da Vite. Las rutas salen de
 * `figuras.ts`; si allí cambia una, aquí falta y `traer` lo dice con la ruta.
 */
const DIRECCIONES: Readonly<Record<string, string>> = {
  [rutaDelEmbarcadero()]: embarcaderoGlb,
  [`${RUTA_DE_MODELOS}/aventureros/${FICHERO_DE_ANIMACIONES}`]: animacionesGlb,
  [`${RUTA_DE_MODELOS}/aventureros/caballero.glb`]: caballeroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/barbaro.glb`]: barbaroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/maga.glb`]: magaGlb,
  [`${RUTA_DE_MODELOS}/aventureros/exploradora.glb`]: exploradoraGlb,
  [`${RUTA_DE_MODELOS}/aventureros/picaro.glb`]: picaroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/encapuchado.glb`]: encapuchadoGlb,
};

const traer: Traer = async (ruta) => {
  const direccion = DIRECCIONES[ruta];
  if (direccion === undefined) throw new Error(`el banco no tiene dirección para ${ruta}`);
  const r = await fetch(direccion);
  if (!r.ok) throw new Error(`${direccion} contestó ${String(r.status)}`);
  return r.arrayBuffer();
};

/* ─────────────────────────────── Los marcos ─────────────────────────────── */

type Aspecto = 'retrato' | 'tableta' | 'panoramico';

const MARCOS: Readonly<Record<Aspecto, { ancho: number; alto: number; franja: number; rotulo: string }>> = {
  retrato: { ancho: 390, alto: 844, franja: 0.36, rotulo: 'Retrato 390×844 · hoja 0,36' },
  tableta: { ancho: 820, alto: 1180, franja: 0.3, rotulo: 'Tableta 820×1180 · hoja 0,30' },
  panoramico: { ancho: 1440, alto: 810, franja: 0, rotulo: 'Panorámico 1440×810 · sin hoja' },
};

const NOMBRES = ['Lucía', 'Mateo', 'Sofía', 'Hugo', 'Martina', 'Leo', 'Valeria', 'Bruno', 'Nora', 'Iker', 'Vera', 'Dani'];
const CODIGO_DE_SERIE = 'ABCDE';

function alAzar<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)] as T;
}

interface Medida {
  triangulos: number;
  llamadas: number;
  ms: number;
  fotogramas: number;
}

/** Lo que dice la dirección: código, sentados y aspecto. */
function estadoDeLaDireccion(): { codigo: string; sentados: number; aspecto: Aspecto } {
  const p = new URLSearchParams(window.location.search);
  const codigo = (p.get('codigo') ?? CODIGO_DE_SERIE).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  const sentados = Math.max(0, Math.min(6, Number(p.get('sentados') ?? '1') || 0));
  const aspecto = p.get('aspecto');
  return {
    codigo: codigo.length === 5 ? codigo : CODIGO_DE_SERIE,
    sentados,
    aspecto: aspecto === 'tableta' || aspecto === 'panoramico' ? aspecto : 'retrato',
  };
}

let contador = 0;
function asientoNuevo(): AsientoEnElMuelle {
  contador++;
  return { id: `s${String(contador)}`, nombre: alAzar(NOMBRES), presente: true, figura: alAzar(FIGURAS).id };
}

/* ─────────────────────────────── El banco ─────────────────────────────── */

function Banco(): JSX.Element {
  const inicial = useMemo(estadoDeLaDireccion, []);
  const tema = temaDelMuelle('riberas') as TemaDelMuelle;

  const [aspecto, ponerAspecto] = useState<Aspecto>(inicial.aspecto);
  const [codigo, ponerCodigo] = useState(inicial.codigo);
  const [calidad, ponerCalidad] = useState<Calidad>('plena');
  const [asientos, ponerAsientos] = useState<AsientoEnElMuelle[]>(() => Array.from({ length: inicial.sentados }, asientoNuevo));
  const [miFigura, ponerMiFigura] = useState<FiguraId>(() => alAzar(FIGURAS).id);
  const [zarpando, ponerZarpando] = useState(false);
  const [listo, ponerListo] = useState(false);
  const [fallos, ponerFallos] = useState<string[]>([]);
  const [zarpo, ponerZarpo] = useState<string | null>(null);
  const [medida, ponerMedida] = useState<Medida | null>(null);
  const zarpeDesde = useRef(0);

  /* El primer asiento soy yo; sin asientos, estoy en la orilla probando figura. */
  const yo = asientos[0]?.id ?? null;

  const mesa = useMemo<MesaEnElMuelle>(
    () => ({
      codigo: asientos.length === 0 ? null : codigo,
      asientos: asientos.map((a, i) => (i === 0 ? { ...a, figura: miFigura } : a)),
      yo,
      empezada: zarpando,
      aforo: { minimo: 2, maximo: 6 },
      tema,
    }),
    [asientos, codigo, yo, miFigura, zarpando, tema],
  );

  /* El marco físico: el tamaño elegido, encogido para que quepa en la ventana. */
  const marco = MARCOS[aspecto];
  const [escala, ponerEscala] = useState(1);
  useEffect(() => {
    const medir = (): void => {
      const disponibleAncho = window.innerWidth - 340;
      const disponibleAlto = window.innerHeight - 40;
      ponerEscala(Math.min(1, disponibleAncho / marco.ancho, disponibleAlto / marco.alto));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('resize', medir);
    };
  }, [marco]);
  const ventana = useMemo<Ventana>(() => ({ ancho: marco.ancho, alto: marco.alto, franjaInferior: marco.franja }), [marco]);

  const alEstarListo = useCallback(() => {
    ponerListo(true);
  }, []);
  const alFallar = useCallback((motivo: string) => {
    ponerFallos((antes) => [...antes, motivo]);
  }, []);
  const alZarpar = useCallback(() => {
    ponerZarpo(`alZarpar a los ${String(Math.round(performance.now() - zarpeDesde.current))} ms`);
  }, []);
  const alMedir = useCallback((m: Medida) => {
    ponerMedida(m);
  }, []);

  const sentar = (): void => {
    ponerAsientos((antes) => (antes.length >= 6 ? antes : [...antes, asientoNuevo()]));
  };
  const levantar = (): void => {
    ponerAsientos((antes) => antes.slice(0, -1));
  };
  const cambiarMiFigura = (): void => {
    const i = FIGURAS.findIndex((f) => f.id === miFigura);
    ponerMiFigura((FIGURAS[(i + 1) % FIGURAS.length] as (typeof FIGURAS)[number]).id);
  };
  const presencia = (): void => {
    ponerAsientos((antes) => {
      if (antes.length < 2) return antes;
      const cual = 1 + Math.floor(Math.random() * (antes.length - 1));
      return antes.map((a, i) => (i === cual ? { ...a, presente: !a.presente } : a));
    });
  };
  /* De ida, como `zarpando` en la escena: no hay vuelta a puerto; para volver a verlo, se recarga. */
  const zarpar = (): void => {
    if (zarpando) return;
    zarpeDesde.current = performance.now();
    ponerZarpo('esperando alZarpar…');
    ponerZarpando(true);
  };

  const direccion = `?codigo=${codigo}&sentados=${String(asientos.length)}&aspecto=${aspecto}`;

  return (
    <div className="banco-lobby">
      <aside className="banco-panel">
        <div className="banco-rotulo">BANCO DE PRUEBAS · EL MUELLE</div>

        <section>
          <h2>Marco</h2>
          <div className="banco-botones">
            {(Object.keys(MARCOS) as Aspecto[]).map((a) => (
              <button type="button" key={a} className={a === aspecto ? 'vivo' : undefined} onClick={() => ponerAspecto(a)}>
                {MARCOS[a].rotulo}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>Mesa simulada</h2>
          <label className="banco-codigo">
            Código
            <input
              value={codigo}
              maxLength={5}
              onChange={(e) => ponerCodigo(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            />
          </label>
          <div className="banco-botones">
            <button type="button" onClick={sentar} disabled={asientos.length >= 6}>
              Sentar a uno ({String(asientos.length)}/6)
            </button>
            <button type="button" onClick={levantar} disabled={asientos.length === 0}>
              Levantar al último
            </button>
            <button type="button" onClick={cambiarMiFigura}>
              Mi figura: {datosDeFigura(miFigura).nombre}
            </button>
            <button type="button" onClick={presencia} disabled={asientos.length < 2}>
              Presencia de uno
            </button>
            <button type="button" onClick={zarpar} className={zarpando ? 'vivo' : undefined} disabled={zarpando} title="Zarpar es de ida: para volver a verlo, recarga la página">
              {zarpando ? 'Zarpado (recarga para volver)' : 'Zarpar'}
            </button>
            <button type="button" onClick={() => ponerCalidad((c) => (c === 'plena' ? 'sobria' : 'plena'))}>
              Calidad: {calidad}
            </button>
          </div>
          <ul className="banco-sentados">
            {mesa.asientos.map((a, i) => (
              <li key={a.id}>
                <i className={a.presente ? 'piloto vivo' : 'piloto'} />
                {a.nombre}
                {i === 0 ? ' (tú)' : ''} · {datosDeFigura(a.figura as FiguraId).nombre}
              </li>
            ))}
            {mesa.asientos.length === 0 ? <li className="tenue">En la orilla, probando figura.</li> : null}
          </ul>
        </section>

        <section>
          <h2>El hilo de dibujo</h2>
          {medida === null ? (
            <p className="tenue">Sin medida todavía.</p>
          ) : (
            <p className="banco-medida">
              {medida.triangulos.toLocaleString('es-ES')} triángulos · {String(medida.llamadas)} llamadas
              <br />
              {medida.ms.toFixed(1)} ms/fotograma · {String(medida.fotogramas)} fotogramas en el último segundo
            </p>
          )}
          <p className={listo ? 'banco-estado vivo' : 'banco-estado'}>{listo ? 'alEstarListo recibido' : 'esperando alEstarListo…'}</p>
          {zarpo === null ? null : <p className="banco-estado vivo">{zarpo}</p>}
          {fallos.map((f, i) => (
            <p key={String(i)} className="banco-fallo">
              alFallar: {f}
            </p>
          ))}
        </section>

        <section>
          <h2>Esta dirección</h2>
          <p className="banco-direccion">
            <a href={direccion}>{direccion}</a>
          </p>
        </section>
      </aside>

      <main className="banco-marco-sitio">
        <div
          className="banco-marco"
          style={{ width: Math.round(marco.ancho * escala), height: Math.round(marco.alto * escala) }}
        >
          <Canvas
            dpr={[1, 2]}
            gl={{ antialias: true }}
            camera={{ fov: 55, near: 0.3, far: 1500 }}
            onCreated={({ gl }) => {
              gl.toneMapping = ACESFilmicToneMapping;
              gl.toneMappingExposure = 0.95;
            }}
          >
            <Embarcadero
              mesa={mesa}
              ventana={ventana}
              traer={traer}
              calidad={calidad}
              figuraQuePruebo={miFigura}
              zarpando={zarpando}
              alEstarListo={alEstarListo}
              alZarpar={alZarpar}
              alFallar={alFallar}
              alMedir={alMedir}
            />
          </Canvas>
          {marco.franja > 0 ? (
            <div className="banco-hoja" style={{ height: `${String(marco.franja * 100)}%` }}>
              hoja del HUD · {String(Math.round(marco.franja * 100))} %
            </div>
          ) : null}
          {!listo ? <div className="banco-telon">{tema.lugar}</div> : null}
        </div>
      </main>
    </div>
  );
}

/* La raíz se crea una vez y se guarda en el propio div: ver la cabecera de `banco3d.tsx`. */
const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Falta el <div id="raiz"> de lobby3d.html');

type ConRaiz = HTMLElement & { __raizDeReact?: ReturnType<typeof createRoot> };
const donde = raiz as ConRaiz;
donde.__raizDeReact ??= createRoot(donde);
donde.__raizDeReact.render(<Banco />);
