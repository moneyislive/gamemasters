/**
 * EL BANCO DE PRUEBAS DEL MUNDO EN TRES DIMENSIONES.
 *
 * ═══ QUÉ DEMUESTRA, QUE ES LO ÚNICO QUE PRETENDE ═══
 *
 * Tres cosas, y ninguna se puede comprobar con un guion de Node:
 *
 *   1. Que el cliente de PC pinta una escena de `three` con React 19, y que la
 *      escena que pinta es la MISMA que va a pintar el móvil — `escenas/delta.tsx`
 *      no sabe en qué plataforma está y no importa nada de `drei`.
 *   2. Que la geometría cuadra. Las comarcas salen de `esquinasDeHex`, los
 *      poblados de `puntoDeVertice` y los caminos de `verticesDeArista`, todas de
 *      `shared/mecanicas/malla-hexagonal.ts`. Si un poblado cayera medio radio
 *      fuera de la esquina, aquí se ve en el acto.
 *   3. Que LA ESCALA ES DE MUNDO Y NO DE MAQUETA. Para eso están las dos vistas:
 *      desde el aire se juega al tablero, y a pie de suelo se cruza una comarca
 *      andando y se tarda lo que dice `escala.ts` que se tiene que tardar.
 *
 * ═══ EL DELTA DE PRUEBA ES FIJO Y NO ALEATORIO ═══
 *
 * Se dibuja siempre el mismo tablero, con las mismas piezas en los mismos sitios.
 * Un reparto aleatorio haría bonita la captura y quitaría lo único que esto vale:
 * poder comparar dos ejecuciones y ver que ha cambiado lo que se tocó.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  aristaEntre,
  aristasDe,
  mallaDeRadio,
  puntoDeVertice,
  verticeEntre,
  verticesDe,
} from '../../shared/mecanicas/malla-hexagonal';
import type { Hex, LlaveDeVertice } from '../../shared/mecanicas/malla-hexagonal';
import type { Colocando } from '../../escenas/sitios';
import { Delta, encuadreDelDelta, RADIO_DE_COMARCA } from '../../escenas/delta';
import { crearRelieve } from '../../escenas/relieve';
import type { Relieve } from '../../escenas/relieve';
import {
  catalogoDeModelos,
  MODELO,
  modeloDePieza,
  modeloDeTorre,
} from '../../escenas/modelos';
import type { CatalogoDeModelos } from '../../escenas/modelos';
import {
  ALTURA_DE_UNA_PERSONA,
  PASO_POR_SEGUNDO,
  RADIO_DE_TESELA,
  segundosAndando,
} from '../../escenas/escala';
import type { ColorDeJugador, DeltaEn3D, PiezaEn3D } from '../../escenas/tipos';
import tableroGlb from '../../escenas/modelos/tablero.glb?url';
import './estilo.css';

/** El azul del cielo de mediodía, que es también el color al que se funde la niebla. */
const COLOR_DEL_CIELO = '#9ec9e2';

/**
 * EL REPARTO DE PRUEBA.
 *
 * Diecinueve comarcas —el delta de radio 2— con los terrenos y los números
 * repartidos a mano. No sale de `azar.ts` a propósito: ver la cabecera.
 */
function deltaDePrueba(): DeltaEn3D {
  const hexes = mallaDeRadio(2);
  const terrenos = [
    'bosque', 'pradera', 'campo', 'colina', 'montana', 'bosque', 'pradera',
    'campo', 'desierto', 'colina', 'montana', 'bosque', 'pradera', 'campo',
    'colina', 'montana', 'bosque', 'pradera', 'campo',
  ];
  const cifras = [5, 2, 6, 3, 8, 10, 9, 12, null, 4, 11, 4, 8, 10, 9, 5, 6, 3, 11];

  const islas = hexes.map((hex, i) => ({
    hex,
    terreno: terrenos[i % terrenos.length] as string,
    cifra: cifras[i % cifras.length] ?? null,
  }));

  /*
   * Las piezas se colocan por VÉRTICES DERIVADOS de hexágonos reales, no por
   * llaves escritas a mano. Escribir la llave a mano aquí sería fijar en el banco
   * de pruebas la convención de la malla, y entonces esto dejaría de comprobarla:
   * pasaría igual el día que la convención cambiara y el tablero de verdad se
   * pintara girado.
   */
  const centro: Hex = { q: 0, r: 0 };
  const norte: Hex = { q: 0, r: -1 };
  const noreste: Hex = { q: 1, r: -1 };
  const sureste: Hex = { q: 1, r: 0 };
  const sur: Hex = { q: 0, r: 1 };
  const suroeste: Hex = { q: -1, r: 1 };

  return {
    islas,
    piezas: [],
    caminos: [
      { arista: aristaEntre(centro, norte), color: '#d24b3a' },
      { arista: aristaEntre(centro, noreste), color: '#d24b3a' },
      { arista: aristaEntre(centro, sureste), color: '#2f7fd0' },
      { arista: aristaEntre(centro, sur), color: '#2f7fd0' },
      { arista: aristaEntre(centro, suroeste), color: '#e8b93c' },
    ],
    ladron: { q: 0, r: -2 },
  };
}

/**
 * CARGA EL `.glb` UNA VEZ Y DEVUELVE EL CATÁLOGO.
 *
 * El cargador vive AQUÍ y no en `escenas/`, y esa es la frontera que sostiene que
 * la misma escena valga para los dos clientes: en el navegador el modelo se pide
 * por su dirección y en el móvil hay que pasar por el sistema de recursos de Expo.
 * Un cargador dentro de `escenas/` tendría que saber en qué plataforma está.
 *
 * `cancelado` no es paranoia: si el componente se desmonta mientras el fichero
 * viaja —una recarga en caliente, sin ir más lejos— escribir el estado después es
 * un aviso de React y, peor, una referencia viva a una escena que ya no se dibuja.
 */
function useCatalogo(): { modelos: CatalogoDeModelos | null; error: string | null } {
  const [modelos, ponerModelos] = useState<CatalogoDeModelos | null>(null);
  const [error, ponerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    new GLTFLoader().load(
      tableroGlb,
      (gltf) => {
        if (cancelado) return;
        ponerModelos(catalogoDeModelos(gltf.scene));
      },
      undefined,
      (fallo: unknown) => {
        if (cancelado) return;
        ponerError(fallo instanceof Error ? fallo.message : String(fallo));
      },
    );
    return () => {
      cancelado = true;
    };
  }, []);

  return { modelos, error };
}

type Vista = 'aire' | 'suelo';

/**
 * LAS DOS CÁMARAS, y por qué son dos recorridos y no unos controles.
 *
 * `OrbitControls` de `drei` necesita un `HTMLElement` para engancharse, o sea que
 * no vale en el móvil. Los controles de verdad se montan FUERA de la escena y son
 * distintos en cada cliente; aquí lo que hace falta es MIRAR, y para eso hay dos
 * recorridos automáticos:
 *
 *   · `aire` es la vista de juego: el delta entero girando despacio, que es como
 *     se va a jugar al catán.
 *   · `suelo` es la prueba de la escala: la cámara a la altura de los ojos de una
 *     persona cruzando la comarca central a `PASO_POR_SEGUNDO` unidades por
 *     segundo, en línea recta y en bucle. Si cruzarla se hace corto, la comarca es
 *     pequeña; ese juicio no lo puede emitir ningún comprobador.
 */
function Camara({
  vista,
  alcance,
  quieta,
  relieve,
  mirandoA,
  alAndar,
}: {
  vista: Vista;
  alcance: number;
  quieta: boolean;
  relieve: Relieve;
  mirandoA: { x: number; y: number };
  alAndar: (segundos: number) => void;
}): null {
  const { camera } = useThree();
  const angulo = useRef(0.6);
  const anduvo = useRef(0);

  useFrame((_, delta) => {
    if (vista === 'aire') {
      if (!quieta) angulo.current += delta * 0.18;
      const a = angulo.current;
      camera.position.set(
        Math.sin(a) * alcance * 1.35,
        alcance * 1.15,
        Math.cos(a) * alcance * 1.35,
      );
      camera.lookAt(0, 0, 0);
      return;
    }

    /*
     * A PIE, DANDO UNA VUELTA ALREDEDOR DE LA OBRA.
     *
     * La primera versión cruzaba la comarca en línea recta a la altura de los ojos, y
     * se metía dentro de la primera terraza: el terreno sube en escalones de 5,47
     * —más de dos personas— y lo único que se veía era el interior marrón de una
     * tesela. Se puede arreglar haciendo que la cámara trepe, pero eso es un
     * personaje, y un personaje es otro trabajo.
     *
     * Lo que hace falta MIRAR ahora es cómo se levanta un asentamiento visto desde
     * abajo, así que la cámara da una vuelta alrededor del punto de obra a la altura
     * de los ojos de una persona, apoyándose en la cota de ese punto. Y de paso da la
     * referencia de escala que ninguna vista aérea da: si el muro tapa el horizonte,
     * es que el muro mide lo que tiene que medir.
     */
    if (!quieta) anduvo.current += delta * PASO_POR_SEGUNDO;
    alAndar(anduvo.current / PASO_POR_SEGUNDO);
    const ojos = ALTURA_DE_UNA_PERSONA * 0.9;
    const vuelta = anduvo.current / 26;
    const lejos = RADIO_DE_TESELA * 7.5;
    const x = mirandoA.x + Math.sin(vuelta) * lejos;
    const z = mirandoA.y + Math.cos(vuelta) * lejos;
    /*
     * La cámara se apoya en la cota MAYOR entre donde pisa y lo que mira, y por eso
     * hay dos consultas y no una. Apoyándose sólo en la del objetivo se metía dentro
     * de la ladera en cuanto el terreno de alrededor subía —que es justo lo que pasó
     * al subir el techo de las montañas— y lo único que se veía era el interior marrón
     * de una terraza.
     */
    const suelo = Math.max(relieve.alturaEn({ x, y: z }), relieve.alturaEn(mirandoA));
    camera.position.set(x, suelo + ojos, z);
    camera.lookAt(mirandoA.x, relieve.alturaEn(mirandoA) + ojos * 0.85, mirandoA.y);
  });
  return null;
}

/**
 * UNA PERSONA DE MENTIRA, para tener con qué comparar.
 *
 * Una cápsula de la altura exacta que `escala.ts` declara. No es un avatar y no
 * pretende serlo: es la regla de medir. Sin algo del tamaño de una persona en la
 * escena, «grande» y «pequeño» no significan nada — un tablero de mesa y un
 * continente se ven idénticos si no hay referencia.
 */
function Testigo({ x, z, suelo }: { x: number; z: number; suelo: number }): JSX.Element {
  const alto = ALTURA_DE_UNA_PERSONA;
  const radio = alto * 0.16;
  return (
    <mesh position={[x, suelo + alto / 2, z]} castShadow>
      <capsuleGeometry args={[radio, alto - radio * 2, 6, 12]} />
      <meshStandardMaterial color="#ff4d3d" roughness={0.5} />
    </mesh>
  );
}

/** Cuenta los triángulos y las llamadas de dibujo: los dos datos que deciden si cabe en un móvil. */
function Contador({ alContar }: { alContar: (n: number, llamadas: number) => void }): null {
  const { gl } = useThree();
  const ultimo = useRef(-1);
  useFrame(() => {
    const n = gl.info.render.triangles;
    if (n !== ultimo.current) {
      ultimo.current = n;
      alContar(n, gl.info.render.calls);
    }
  });
  return null;
}

const BOTON = {
  background: '#12312a',
  color: '#7fd4b0',
  border: '1px solid #2f6b58',
  borderRadius: 8,
  padding: '6px 12px',
  font: 'inherit',
  cursor: 'pointer',
} as const;

/** Los cincuenta y cuatro vértices del tablero, para el banco. El juego los traerá él. */
const todosLosVertices: LlaveDeVertice[] = verticesDe(mallaDeRadio(2)) as LlaveDeVertice[];
/** Y sus setenta y dos aristas, que es donde van los puentes y los caminos. */
const todasLasAristas: string[] = aristasDe(mallaDeRadio(2));

function Banco(): JSX.Element {
  /*
   * LA SEMILLA, a mano y a la vista.
   *
   * Es el único mando que enseña lo que de verdad hay que juzgar: si dos tableros se
   * parecen. Un banco de pruebas con una sola semilla enseña UN mundo y deja creer
   * que el generador vale; saltando de semilla se ve enseguida si lo espectacular es
   * la excepción o la norma, que es la pregunta que importa.
   */
  const [semilla, ponerSemilla] = useState(0);

  const datos = useMemo(deltaDePrueba, []);
  const { modelos, error } = useCatalogo();
  /*
   * El MISMO relieve que usa la escena, montado aquí para que la cámara y el
   * testigo se apoyen en el suelo de verdad. No es duplicar trabajo: `crearRelieve`
   * es puro y determinista, así que dos llamadas con las mismas comarcas dan
   * exactamente el mismo terreno — que es justo la propiedad que hace que esto no
   * pueda desincronizarse.
   */
  const relieve = useMemo(
    () => crearRelieve(datos.islas.map((i) => ({ hex: i.hex, terreno: i.terreno })), semilla),
    [datos, semilla],
  );
  const encuadre = useMemo(
    () => encuadreDelDelta(datos.islas.map((i) => i.hex)),
    [datos],
  );
  const alcance = encuadre.alcance;
  const [vista, ponerVista] = useState<Vista>('aire');
  const [quieta, ponerQuieta] = useState(false);
  const [dibujo, ponerDibujo] = useState({ triangulos: 0, llamadas: 0 });
  const [andado, ponerAndado] = useState(0);

  /*
   * LAS OBRAS DEL BANCO, y por qué el banco empieza sin ninguna.
   *
   * Lo que hay que MIRAR aquí no es un poblado ya puesto: es cómo se levanta. Así
   * que el tablero arranca virgen y se funda a mano, que es lo único que permite ver
   * si la animación se lee como una construcción o como un parpadeo — y si al
   * mejorar a ciudad el caserío desaparece y la fortaleza se levanta en su sitio.
   */
  const [obras, ponerObras] = useState<PiezaEn3D[]>([]);
  const conObras = useMemo(() => ({ ...datos, piezas: obras }), [datos, obras]);

  /*
   * QUÉ SE ESTÁ COLOCANDO, y de dónde salen los sitios legales.
   *
   * Aquí salen de una regla de mentira —los vértices que aún no tienen obra— porque
   * este es el banco de pruebas y el juego de verdad todavía no existe. Cuando exista,
   * esta lista vendrá del servidor y lo demás no cambia: la escena ya no opina.
   */
  const [colocando, ponerColocando] = useState<Colocando | null>(null);
  const [tomada, ponerTomada] = useState<string | null>(null);
  const [cogida, ponerCogida] = useState<string | null>(null);
  const [trueque, ponerTrueque] = useState<string | null>(null);

  /*
   * UNA MANO DE MENTIRA PARA EL BANCO.
   *
   * Once cartas repartidas entre los cinco bienes, que es una mano de catan a mitad de
   * partida: suficientes para que se solapen y el iman tenga trabajo. En la partida de
   * verdad esto llega del servidor.
   */
  const mano = useMemo(() => {
    const BIENES = ['madera', 'ladrillo', 'mineral', 'lana', 'grano'];
    return Array.from({ length: 11 }, (_, i) => ({
      id: `c${String(i)}`,
      bien: BIENES[(i * 3 + (i % 2)) % BIENES.length] as string,
    }));
  }, []);

  /*
   * LA BARRA DEL BANCO, con una regla de mentira.
   *
   * Aquí «disponible» es siempre cierto porque no hay mano de cartas todavía. En la
   * partida de verdad lo dirá el juego mirando lo que el jugador puede pagar, y esto no
   * cambia: la escena ya enseña apagado lo que no está disponible.
   */
  const barra = useMemo(
    () => [
      { id: 'poblado', modelo: modeloDePieza('poblado', 'red'), disponible: true },
      { id: 'ciudad', modelo: modeloDePieza('ciudad', 'red'), disponible: true },
      { id: 'puente', modelo: MODELO.puente, disponible: true },
      { id: 'torre', modelo: modeloDeTorre('red'), disponible: false },
    ],
    [],
  );
  const libres = useMemo(
    () => todosLosVertices.filter((v) => !obras.some((o) => o.vertice === v)),
    [obras],
  );

  /*
   * Y LAS ARISTAS, que el puente no va en un vértice.
   *
   * Se vio probando: pasarle al puente la lista de vértices lo dejaba con CERO anillos,
   * porque la escena filtra por clase de sitio y ninguna llave de vértice es una arista.
   * La escena hizo lo correcto —no inventó nada— y quien decía tonterías era esta regla
   * de mentira del banco.
   */
  const aristasLibres = useMemo(() => todasLasAristas, []);

  /* Los seis vértices de la comarca central, que es donde mira la cámara. */
  const sitios = useMemo(() => {
    const c: Hex = { q: 0, r: 0 };
    const alrededor: Hex[] = [
      { q: 0, r: -1 },
      { q: 1, r: -1 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 },
    ];
    return alrededor.map((h, i) =>
      verticeEntre(c, h, alrededor[(i + 1) % alrededor.length] as Hex),
    );
  }, []);

  const COLORES: readonly ColorDeJugador[] = ['red', 'blue', 'yellow', 'green'];

  /* Dónde mira la vista de suelo: el primer vértice de la lista, haya obra o no. */
  const puntoDeObra = useMemo(
    () => puntoDeVertice(sitios[0] as string, RADIO_DE_COMARCA),
    [sitios],
  );

  function fundar(): void {
    ponerObras((antes) => {
      const sitio = sitios[antes.length % sitios.length];
      if (sitio === undefined || antes.length >= sitios.length) return antes;
      return [
        ...antes,
        {
          vertice: sitio,
          clase: 'poblado',
          color: COLORES[antes.length % COLORES.length] as ColorDeJugador,
        },
      ];
    });
  }

  function mejorar(): void {
    ponerObras((antes) => {
      const i = antes.findIndex((o) => o.clase === 'poblado');
      if (i < 0) return antes;
      const copia = antes.slice();
      copia[i] = { ...(antes[i] as PiezaEn3D), clase: 'ciudad' };
      return copia;
    });
  }

  function derribar(): void {
    ponerObras([]);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: COLOR_DEL_CIELO }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: encuadre.posicion, fov: 45, near: 0.5, far: alcance * 8 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        {/*
         * LA NIEBLA EMPIEZA DETRÁS DEL MUNDO, NO ENCIMA DE ÉL.
         *
         * Estaba puesta de 1,1 a 3,6 radios de tablero, o sea que arrancaba a la
         * altura del propio borde: el lado lejano del mundo salía con un sesenta por
         * ciento de niebla encima —las montañas del fondo pálidas, y el mar entero
         * blanqueado hasta el color del cielo—. Se veía como «no hay mar», y no era
         * que faltara: era que estaba pintado de cielo.
         *
         * Ahora arranca a 2,6 radios, que es más allá del rincón más lejano visto
         * desde la cámara, y se cierra a 7,5 — justo antes del canto del disco de mar,
         * que está a 6. Así el mundo se ve limpio de punta a punta y lo único que se
         * difumina es el horizonte, que es lo que hace de verdad la atmósfera.
         *
         * Y el color de la niebla es EL DEL CIELO, no un azul más claro parecido: con
         * dos colores, el sitio donde el mar acaba de fundirse marca una banda a media
         * altura y el horizonte se lee como una costura.
         */}
        <color attach="background" args={[COLOR_DEL_CIELO]} />
        <fog attach="fog" args={[COLOR_DEL_CIELO, alcance * 2.6, alcance * 7.5]} />
        <Camara
          vista={vista}
          alcance={alcance}
          quieta={quieta}
          relieve={relieve}
          mirandoA={puntoDeObra}
          alAndar={(s) => {
            ponerAndado(Math.round(s));
          }}
        />
        <Contador
          alContar={(triangulos, llamadas) => {
            ponerDibujo({ triangulos, llamadas });
          }}
        />
        {modelos === null ? null : (
          <>
            <Delta
              datos={conObras}
              modelos={modelos}
              semilla={semilla}
              colocando={colocando}
              barra={barra}
              mano={mano}
              cogida={cogida}
              onCogerCarta={(c) => ponerCogida((antes) => (antes === c.id ? null : c.id))}
              seCambianPor={
                cogida === null
                  ? []
                  : ['madera', 'ladrillo', 'mineral', 'lana', 'grano'].filter(
                      (b) => b !== mano.find((c) => c.id === cogida)?.bien,
                    )
              }
              onProponerTrueque={(bien) => {
                const doy = mano.find((c) => c.id === cogida)?.bien ?? '?';
                ponerTrueque(`${doy} por ${bien}`);
                ponerCogida(null);
              }}
              tomada={tomada}
              onTomarDeLaBarra={(id) => {
                ponerTomada(id);
                ponerColocando(
                  id === 'puente'
                    ? { clase: 'arista', donde: aristasLibres }
                    : { clase: 'vertice', donde: libres },
                );
              }}
              onElegirSitio={(sitio) => {
                ponerObras((antes) => [
                  ...antes,
                  {
                    vertice: sitio.llave as LlaveDeVertice,
                    clase: 'poblado',
                    color: COLORES[antes.length % COLORES.length] as ColorDeJugador,
                  },
                ]);
                ponerColocando(null);
                ponerTomada(null);
              }}
            />
            <Testigo
              x={RADIO_DE_TESELA * 2}
              z={RADIO_DE_TESELA * 2}
              suelo={relieve.alturaEn({ x: RADIO_DE_TESELA * 2, y: RADIO_DE_TESELA * 2 })}
            />
          </>
        )}
      </Canvas>

      <div
        style={{
          /*
           * ARRIBA, y no abajo, desde que hay barra de construir.
           *
           * El panel del banco estaba abajo a la izquierda y ahí es donde vive ahora la
           * barra de piezas: la tapaba entera. Es un panel de pruebas y la barra es el
           * juego, así que se aparta el panel.
           */
          position: 'absolute',
          left: 18,
          top: 18,
          color: '#cfe3d6',
          font: '13px/1.6 system-ui, sans-serif',
          background: 'rgba(6,17,15,0.72)',
          border: '1px solid #24483c',
          borderRadius: 10,
          padding: '10px 14px',
        }}
      >
        <div style={{ letterSpacing: 2, fontSize: 11, opacity: 0.65 }}>BANCO DE PRUEBAS</div>
        {error !== null ? (
          <div style={{ color: '#ff8b7a' }}>No se pudo cargar el tablero: {error}</div>
        ) : modelos === null ? (
          <div>Cargando modelos…</div>
        ) : (
          <>
            <div>
              {datos.islas.length} comarcas · semilla {semilla} · {modelos.size} modelos
            </div>
            <div>
              {dibujo.triangulos.toLocaleString('es-ES')} triángulos · {dibujo.llamadas} llamadas de
              dibujo
            </div>
            {vista === 'suelo' ? (
              <div>
                Andando: {andado} s de los{' '}
                {segundosAndando(RADIO_DE_COMARCA * 2).toFixed(0)} que mide cruzar una comarca
              </div>
            ) : null}
          </>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() =>
              ponerColocando((antes) =>
                antes === null ? { clase: 'vertice', donde: libres } : null,
              )
            }
            style={BOTON}
          >
            {colocando === null ? `Colocar poblado (${String(libres.length)})` : 'Dejarlo'}
          </button>
          {trueque !== null && (
          <div style={{ color: '#9fe6b8', marginBottom: 8 }}>Trueque propuesto: {trueque}</div>
        )}
        <button type="button" onClick={fundar} style={BOTON}>
            Fundar poblado
          </button>
          <button type="button" onClick={mejorar} style={BOTON}>
            Mejorar a ciudad
          </button>
          <button type="button" onClick={derribar} style={BOTON}>
            Derribar
          </button>
          <button
            type="button"
            onClick={() => {
              ponerObras([]);
              ponerSemilla((n) => n + 1);
            }}
            style={BOTON}
          >
            Otro tablero
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => {
              ponerVista((v) => (v === 'aire' ? 'suelo' : 'aire'));
            }}
            style={BOTON}
          >
            {vista === 'aire' ? 'Bajar al suelo' : 'Subir al aire'}
          </button>
          <button
            type="button"
            onClick={() => {
              ponerQuieta((q) => !q);
            }}
            style={BOTON}
          >
            {quieta ? 'Seguir' : 'Parar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * LA RAIZ SE CREA UNA VEZ, Y SE GUARDA EN EL PROPIO DIV.
 *
 * === POR QUE, QUE COSTO VARIAS PANTALLAS NEGRAS ===
 *
 * Vite vuelve a ejecutar este modulo cada vez que cambia el o cualquiera de los que
 * importa, y aqui eso son diez ficheros de escena que se tocan todo el rato. Con un
 * `createRoot` a pelo, cada reejecucion creaba OTRA raiz de React sobre el mismo
 * `div`: React avisa por consola -- «ya se paso este contenedor a createRoot» -- y
 * deja la escena colgada. El sintoma es un cielo liso con cero triangulos y cero
 * llamadas de dibujo, que se parece muchisimo a un fallo del generador y no lo es.
 *
 * Guardando la raiz en el propio elemento, la reejecucion la encuentra y se limita a
 * repintar. Es el remedio que documenta React para el recargado en caliente.
 */
const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Falta el <div id="raiz"> de banco3d.html');

type ConRaiz = HTMLElement & { __raizDeReact?: ReturnType<typeof createRoot> };
const donde = raiz as ConRaiz;
donde.__raizDeReact ??= createRoot(donde);
donde.__raizDeReact.render(<Banco />);
