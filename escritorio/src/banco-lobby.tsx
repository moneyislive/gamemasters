/**
 * EL BANCO DE PRUEBAS DE LOS LOBBIES: la escena del muelle de un arcade con una mesa de mentira.
 *
 * ═══ QUÉ DEMUESTRA, QUE ES LO ÚNICO QUE PRETENDE ═══
 *
 * Lo que `verify:embarcadero` y `verify:plaza` no pueden: que el lobby SE VE. En el
 * embarcadero, el tinte del barco con su volumen, la brasa en el agua, las motas y la llegada
 * en barco de quien se sienta; en la plaza, el bronce del monumento con la luz rasante de la
 * tarde, las farolas encendiéndose puesto a puesto, la entrada andando desde la boca de calle
 * y el estandarte a media asta de quien se va; en los dos, el zarpe. Y —lo que más importa—
 * que en un móvil de 9:19,5 con la hoja del HUD al 36 % el aventurero local queda entero
 * encima de la hoja. Para eso el marco se elige con botones y la hoja se pinta como una
 * lámina gris encima, con la misma `franjaInferior` que mandaría la app.
 *
 * Y lo otro que sólo se mide aquí: las LLAMADAS DE DIBUJO de verdad, que `gl.info.render`
 * cuenta y, en el lobby que tiene presupuesto escrito (`presupuesto-de-la-plaza.ts`), se
 * enseñan al lado de lo prometido.
 *
 * ═══ UN BANCO, UNA FILA POR LOBBY ═══
 *
 * Eran dos ficheros —éste para el embarcadero y `banco-plaza.tsx` para la plaza— iguales
 * salvo unas cincuenta líneas de trescientas: el modelo propio, las palabras de los botones,
 * cómo se llama en la dirección cuántos hay sentados, un botón más y el presupuesto. Lo que
 * cambia está en `LOS_LOBBIES`, una fila por arcade; la escena la elige el tema con la misma
 * tabla que usan los dos clientes (`escenaDelMuelle`), y la página dice qué lobby quiere con
 * `data-lobby` en su `<div id="raiz">`. Un lobby nuevo es una fila aquí y una página de diez
 * renglones. `lobby3d.html` y `plaza3d.html` siguen en su sitio y con sus parámetros de
 * siempre: `?codigo=ABCDE&sentados=3&aspecto=retrato` el muelle y `?jugadores=` la plaza.
 *
 * La Linde Alta tiene su banco aparte (`banco-linde.tsx`) y no es un olvido: es otra cosa, a
 * pantalla completa, sin marcos ni hoja, con su cámara y su exposición.
 *
 * ═══ LA MESA ES SIMULADA Y `traer` VIENE DE VITE ═══
 *
 * No hay servidor: los asientos se sientan y se levantan con botones, y los bytes de los
 * `.glb` se piden a las direcciones que Vite da con `?url`, traduciendo las rutas del servidor
 * de juego con un mapa. La escena no sabe nada de esto: recibe la misma `MesaEnElMuelle`, la
 * misma `Ventana` y la misma `traer` que en la Sala. Es la misma frontera que en
 * `banco-burgo.tsx`.
 *
 * ═══ EL MISMO `Canvas` QUE EL ESCRITORIO ═══
 *
 * ACES a 0,95, `dpr` de 1 a 2, antialias: lo que monta `muelle.tsx`, para que lo que se mire
 * aquí sea lo que se va a ver allí.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { escenaDelMuelle } from '../../escenas/embarcadero/escenas-del-muelle';
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
import { rutaDelBurgo } from '../../escenas/ruta-de-modelos';
import { TOPE_DE_LLAMADAS, TOPE_DE_TRIANGULOS, llamadasDeLaPlaza } from '../../escenas/plaza/presupuesto-de-la-plaza';
import embarcaderoGlb from '../../escenas/modelos/embarcadero.glb?url';
import burgoGlb from '../../escenas/modelos/burgo.glb?url';
import animacionesGlb from '../../escenas/modelos/aventureros/animaciones.glb?url';
import caballeroGlb from '../../escenas/modelos/aventureros/caballero.glb?url';
import barbaroGlb from '../../escenas/modelos/aventureros/barbaro.glb?url';
import magaGlb from '../../escenas/modelos/aventureros/maga.glb?url';
import exploradoraGlb from '../../escenas/modelos/aventureros/exploradora.glb?url';
import picaroGlb from '../../escenas/modelos/aventureros/picaro.glb?url';
import encapuchadoGlb from '../../escenas/modelos/aventureros/encapuchado.glb?url';
import './banco-lobby.css';

/* ─────────────────────────────── Los lobbies ─────────────────────────────── */

/** Lo que cambia de un lobby a otro en el banco. Todo lo demás es el mismo banco. */
interface LobbyDelBanco {
  /** El arcade: la llave de su tema, y del tema salen la escena, el lugar y la paleta. */
  readonly arcade: string;
  /** El rótulo del panel, detrás de «BANCO DE PRUEBAS · ». */
  readonly rotulo: string;
  /** La página que lo abre: para decirlo si le falta la raíz. */
  readonly pagina: string;
  /**
   * Cómo se llama en la dirección cuántos hay sentados. Distinto en cada lobby porque así
   * nacieron sus enlaces, y un enlace apuntado en una nota tiene que seguir abriendo lo mismo.
   */
  readonly parametro: 'sentados' | 'jugadores';
  /** El modelo propio del lobby: la ruta que pide la escena y la dirección que da Vite. */
  readonly modelo: readonly [ruta: string, direccion: string];
  /** Las palabras de los tres botones de la mesa simulada que no son iguales en los dos. */
  readonly sentar: string;
  readonly levantar: string;
  readonly ausentar: string;
  /** Si hay botón para que OTRO se vista: la coreografía del humo vista desde fuera. */
  readonly vestirAOtro: boolean;
  /** Los topes que promete el presupuesto del lobby, si lo tiene escrito aparte. */
  readonly presupuesto?: {
    readonly triangulos: number;
    readonly llamadas: number;
    readonly prometidas: (calidad: Calidad, sentados: number) => number;
  };
}

const LOS_LOBBIES: Readonly<Record<string, LobbyDelBanco>> = {
  riberas: {
    arcade: 'riberas',
    rotulo: 'EL MUELLE',
    pagina: 'lobby3d.html',
    parametro: 'sentados',
    modelo: [rutaDelEmbarcadero(), embarcaderoGlb],
    sentar: 'Sentar a uno',
    levantar: 'Levantar al último',
    ausentar: 'Presencia de uno',
    vestirAOtro: false,
  },
  burgo: {
    arcade: 'burgo',
    rotulo: 'LA PLAZA',
    pagina: 'plaza3d.html',
    parametro: 'jugadores',
    modelo: [rutaDelBurgo(), burgoGlb],
    sentar: 'Llega uno',
    levantar: 'Se levanta el último',
    ausentar: 'Ausencia de uno',
    vestirAOtro: true,
    presupuesto: {
      triangulos: TOPE_DE_TRIANGULOS,
      llamadas: TOPE_DE_LLAMADAS,
      prometidas: (calidad, sentados) => llamadasDeLaPlaza(calidad, sentados).total,
    },
  },
};

/**
 * El lobby que pide la página, por `data-lobby` en su raíz. Sin él, el del muelle, que es el que
 * siempre abrió este fichero; con uno que no está en la tabla, se dice cuáles hay y no se pinta otro.
 */
function elLobbyDeLaPagina(raiz: HTMLElement | null): LobbyDelBanco {
  const pedido = raiz?.dataset.lobby ?? 'riberas';
  const lobby = LOS_LOBBIES[pedido];
  if (lobby === undefined) {
    throw new Error(`El banco no conoce el lobby «${pedido}»: los que hay son ${Object.keys(LOS_LOBBIES).join(', ')}`);
  }
  return lobby;
}

const raiz = document.getElementById('raiz');
const LOBBY = elLobbyDeLaPagina(raiz);

/* ─────────────────────────── Las direcciones de Vite ─────────────────────────── */

/**
 * De la ruta que pide la escena a la dirección que da Vite. Las rutas salen de `figuras.ts` y
 * de `ruta-de-modelos.ts`; si allí cambia una, aquí falta y `traer` lo dice con la ruta.
 */
const DIRECCIONES: Readonly<Record<string, string>> = {
  [LOBBY.modelo[0]]: LOBBY.modelo[1],
  [`${RUTA_DE_MODELOS}/aventureros/${FICHERO_DE_ANIMACIONES}`]: animacionesGlb,
  [`${RUTA_DE_MODELOS}/aventureros/caballero.glb`]: caballeroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/barbaro.glb`]: barbaroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/maga.glb`]: magaGlb,
  [`${RUTA_DE_MODELOS}/aventureros/exploradora.glb`]: exploradoraGlb,
  [`${RUTA_DE_MODELOS}/aventureros/picaro.glb`]: picaroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/encapuchado.glb`]: encapuchadoGlb,
};

/** UNA `traer` de módulo: la caché de los catálogos va por identidad de la función. */
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
  const sentados = Math.max(0, Math.min(6, Number(p.get(LOBBY.parametro) ?? '1') || 0));
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

function Banco({ lobby }: { lobby: LobbyDelBanco }): JSX.Element {
  const inicial = useMemo(estadoDeLaDireccion, []);
  const tema = temaDelMuelle(lobby.arcade) as TemaDelMuelle;
  const Escena = escenaDelMuelle(tema);

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
  /* Vestir a OTRO: es la coreografía del humo vista desde fuera, que es la que no se prueba sola. */
  const vestirAOtro = (): void => {
    ponerAsientos((antes) => {
      if (antes.length < 2) return antes;
      const cual = 1 + Math.floor(Math.random() * (antes.length - 1));
      const suya = antes[cual] as AsientoEnElMuelle;
      const i = FIGURAS.findIndex((f) => f.id === suya.figura);
      return antes.map((a, k) => (k === cual ? { ...a, figura: (FIGURAS[(i + 1) % FIGURAS.length] as (typeof FIGURAS)[number]).id } : a));
    });
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

  const direccion = `?codigo=${codigo}&${lobby.parametro}=${String(asientos.length)}&aspecto=${aspecto}`;
  const presupuesto = lobby.presupuesto;
  const prometidas = presupuesto === undefined ? 0 : presupuesto.prometidas(calidad, Math.max(1, asientos.length));

  return (
    <div className="banco-lobby">
      <aside className="banco-panel">
        <div className="banco-rotulo">BANCO DE PRUEBAS · {lobby.rotulo}</div>

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
              {lobby.sentar} ({String(asientos.length)}/6)
            </button>
            <button type="button" onClick={levantar} disabled={asientos.length === 0}>
              {lobby.levantar}
            </button>
            <button type="button" onClick={cambiarMiFigura}>
              Mi figura: {datosDeFigura(miFigura).nombre}
            </button>
            {lobby.vestirAOtro ? (
              <button type="button" onClick={vestirAOtro} disabled={asientos.length < 2}>
                Otro se viste
              </button>
            ) : null}
            <button type="button" onClick={presencia} disabled={asientos.length < 2}>
              {lobby.ausentar}
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
          ) : presupuesto === undefined ? (
            <p className="banco-medida">
              {medida.triangulos.toLocaleString('es-ES')} triángulos · {String(medida.llamadas)} llamadas
              <br />
              {medida.ms.toFixed(1)} ms/fotograma · {String(medida.fotogramas)} fotogramas en el último segundo
            </p>
          ) : (
            <p className="banco-medida">
              {medida.triangulos.toLocaleString('es-ES')} triángulos de {presupuesto.triangulos.toLocaleString('es-ES')}
              <br />
              {String(medida.llamadas)} llamadas de {String(presupuesto.llamadas)} (prometidas {String(prometidas)})
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
            <Escena
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
if (raiz === null) throw new Error(`Falta el <div id="raiz"> de ${LOBBY.pagina}`);

type ConRaiz = HTMLElement & { __raizDeReact?: ReturnType<typeof createRoot> };
const donde = raiz as ConRaiz;
donde.__raizDeReact ??= createRoot(donde);
donde.__raizDeReact.render(<Banco lobby={LOBBY} />);
