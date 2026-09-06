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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { Hex, LlaveDeArista, LlaveDeVertice } from '../../shared/mecanicas/malla-hexagonal';
import {
  aristasDeVertice,
  verticesDeArista,
  verticesVecinos,
} from '../../shared/mecanicas/malla-hexagonal';
import type { ObraPosible } from '../../shared/arcade/juegos/riberas-en-3d';
import { obraPosible, vistaDePrueba } from '../../shared/arcade/juegos/riberas-en-3d';
import type { Colocando } from '../../escenas/sitios';
import type { Mirador } from '../../escenas/camara';
import {
  esDeLaInterfaz,
  MINIMO_PARA_GIRAR,
  MIRADOR_DE_SALIDA,
  ojoDelMirador,
  tirandoDelMirador,
} from '../../escenas/camara';
import { Delta, encuadreDelDelta, RADIO_DE_COMARCA } from '../../escenas/delta';
import { crearRelieve } from '../../escenas/relieve';
import type { Relieve } from '../../escenas/relieve';
import {
  catalogoDeModelos,
  MODELO,
  modeloDePieza,
  modeloDeTorre,
  unirCatalogos,
} from '../../escenas/modelos';
import type { CatalogoDeModelos } from '../../escenas/modelos';
import {
  ALTURA_DE_UNA_PERSONA,
  PASO_POR_SEGUNDO,
  RADIO_DE_TESELA,
  segundosAndando,
} from '../../escenas/escala';
import type { CaminoEn3D, ColorDeJugador, DeltaEn3D, PiezaEn3D } from '../../escenas/tipos';
import type { DadosDeLaMesa, ResultadoDelToque } from '../../escenas/dados';
import tableroGlb from '../../escenas/modelos/tablero.glb?url';
/* Los dados, en su fichero aparte: el banco los pide como la partida, a la vez y con su propia red. */
import dadosGlb from '../../escenas/modelos/dados.glb?url';
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
 *
 * SON DOS FICHEROS Y UN SOLO CATÁLOGO, como en la partida: el tablero y los dados se
 * piden a la vez, y el fallo de los dados se queda en un aviso y un catálogo sin
 * `dado` (con el que `Dados` pinta el respaldo); sólo el fallo del tablero es error.
 * Así el banco enseña exactamente lo que verá quien juegue si `dados.glb` no llega.
 */
function useCatalogo(): { modelos: CatalogoDeModelos | null; error: string | null } {
  const [modelos, ponerModelos] = useState<CatalogoDeModelos | null>(null);
  const [error, ponerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const cargador = new GLTFLoader();
    const tablero = cargador.loadAsync(tableroGlb).then((gltf) => catalogoDeModelos(gltf.scene));
    const dados = cargador
      .loadAsync(dadosGlb)
      .then((gltf) => catalogoDeModelos(gltf.scene))
      .catch((fallo: unknown): null => {
        console.warn(`Los dados no han llegado (${fallo instanceof Error ? fallo.message : String(fallo)}): se pintan los del respaldo.`);
        return null;
      });
    Promise.all([tablero, dados]).then(
      ([delTablero, deLosDados]) => {
        if (cancelado) return;
        ponerModelos(unirCatalogos(delTablero, deLosDados));
      },
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
  girando,
  relieve,
  mirandoA,
  alAndar,
}: {
  vista: Vista;
  alcance: number;
  /** Si da vueltas sola. Por defecto NO: el tablero se mira quieto y se gira arrastrando. */
  girando: boolean;
  relieve: Relieve;
  mirandoA: { x: number; y: number };
  alAndar: (segundos: number) => void;
}): null {
  const { camera, gl } = useThree();
  const mirador = useRef<Mirador>(MIRADOR_DE_SALIDA);
  const anduvo = useRef(0);

  /*
   * EL TABLERO SE GIRA ARRASTRANDO.
   *
   * El mirador va por `ref` y no por estado: son sesenta cambios por segundo mientras se
   * arrastra, y pasarlos por React repintaría la escena entera sesenta veces por segundo
   * para mover una cámara. La aritmética está en `escenas/camara.ts`, donde se puede
   * medir; aquí sólo se escuchan los sucesos del ratón.
   *
   * TODO se escucha en la VENTANA, y son dos razones distintas:
   *
   *   · El pulsar, porque así la cámara llega siempre DESPUÉS de la escena —el suceso baja
   *     al lienzo, lo atiende la escena y luego sube— y puede mirar si una carta o una
   *     pieza ya se lo ha quedado. Eso lo garantiza la norma del navegador; el orden en
   *     que se apuntan los oyentes, no.
   *   · Mover y soltar, para que soltar FUERA del lienzo también termine el arrastre. Si
   *     no, se sale por el borde, se suelta, se vuelve a entrar y el tablero sigue pegado
   *     al ratón sin que nadie esté pulsando nada.
   */
  useEffect(() => {
    const lienzo = gl.domElement;
    /* Desde dónde se pulsó, y si ya se ha pasado la zona muerta. */
    let desde: { x: number; y: number } | null = null;
    let gira = false;

    const baja = (e: PointerEvent): void => {
      if (e.target !== lienzo) return;
      if (esDeLaInterfaz(e)) return;
      desde = { x: e.clientX, y: e.clientY };
      gira = false;
    };
    const mueve = (e: PointerEvent): void => {
      if (desde === null) return;
      if (!gira) {
        if (Math.hypot(e.clientX - desde.x, e.clientY - desde.y) < MINIMO_PARA_GIRAR) return;
        gira = true;
      }
      mirador.current = tirandoDelMirador(
        mirador.current,
        e.clientX - desde.x,
        e.clientY - desde.y,
        { ancho: lienzo.clientWidth, alto: lienzo.clientHeight },
      );
      desde = { x: e.clientX, y: e.clientY };
    };
    const suelta = (): void => {
      desde = null;
      gira = false;
    };

    window.addEventListener('pointerdown', baja);
    window.addEventListener('pointermove', mueve);
    window.addEventListener('pointerup', suelta);
    window.addEventListener('pointercancel', suelta);
    return () => {
      window.removeEventListener('pointerdown', baja);
      window.removeEventListener('pointermove', mueve);
      window.removeEventListener('pointerup', suelta);
      window.removeEventListener('pointercancel', suelta);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (vista === 'aire') {
      /* Sólo da la vuelta sola si se pide: para ENSEÑAR el generador sigue siendo lo mejor. */
      if (girando) {
        mirador.current = { ...mirador.current, rumbo: mirador.current.rumbo + delta * 0.18 };
      }
      /*
       * La proporción de la pantalla entra aquí y no en el encuadre del tablero: lo que
       * depende del aparato es dónde se pone el ojo, no lo grande que es el delta. En el
       * escritorio esto vale uno y no cambia nada; en la app, que es vertical, es lo que
       * impide que el tablero se salga por los lados.
       */
      const lienzo = gl.domElement;
      const [x, y, z] = ojoDelMirador(
        mirador.current,
        alcance,
        lienzo.clientHeight > 0 ? lienzo.clientWidth / lienzo.clientHeight : undefined,
      );
      camera.position.set(x, y, z);
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
    if (girando) anduvo.current += delta * PASO_POR_SEGUNDO;
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

const COLORES: readonly ColorDeJugador[] = ['red', 'blue', 'yellow', 'green'];

/** Sólo para pintar el borde del botón de turno. No entra en ninguna regla. */
const COLOR_EN_PANTALLA: Record<ColorDeJugador, string> = {
  red: '#e0533d',
  blue: '#3d8be0',
  yellow: '#e0b83d',
  green: '#4fbf7a',
};

/**
 * LA APERTURA YA HECHA: cada jugador con su poblado y su camino.
 *
 * ═══ POR QUÉ EL BANCO EMPIEZA CON ALGO PUESTO, SI ANTES EMPEZABA VIRGEN ═══
 *
 * Porque las reglas de verdad no dejan fundar en el vacío. Fuera de la colocación
 * inicial, un poblado tiene que colgar de un camino TUYO; con el tablero pelado no hay
 * ni un sitio legal para nadie, y la barra saldría entera apagada.
 *
 * Se podría fingir la fase de colocación —poblado gratis, sin camino— pero esa fase tiene
 * sus propias reglas (una vereda obligatoria pegada a lo recién fundado, la serpentina que
 * va y vuelve) y fingirlas aquí sería volver a inventar reglas, que es de lo que venimos.
 * Así que el banco juega SIEMPRE en `jugando`, con la apertura ya dada. Lo que el banco
 * NO prueba, y queda dicho: la serpentina.
 *
 * ═══ SE CALCULA, NO SE ESCRIBE A MANO ═══
 *
 * Dos vértices elegidos a dedo pueden violar la regla de distancia sin que nadie lo note,
 * y entonces el banco arranca con una posición ilegal y todo lo que se mire desde ahí es
 * mentira. Aquí se busca el primer vértice libre y separado para cada jugador, que es la
 * misma condición que exige el juego.
 */
function aperturaDePrueba(): { piezas: PiezaEn3D[]; caminos: CaminoEn3D[] } {
  const piezas: PiezaEn3D[] = [];
  const caminos: CaminoEn3D[] = [];
  const puestos: string[] = [];
  /*
   * De dentro hacia fuera, y no por orden de lista: la cámara mira al centro, y una
   * apertura en el borde del tablero deja el banco sin nada que mirar. Se ordena por
   * distancia al origen, que es donde apunta `lookAt`.
   */
  const porCercania = [...todosLosVertices].sort((a, b) => {
    const pa = puntoDeVertice(a, RADIO_DE_COMARCA);
    const pb = puntoDeVertice(b, RADIO_DE_COMARCA);
    return Math.hypot(pa.x, pa.y) - Math.hypot(pb.x, pb.y);
  });
  for (const color of COLORES.slice(0, 2)) {
    const sitio = porCercania.find(
      (v) => !puestos.includes(v) && !verticesVecinos(v).some((n) => puestos.includes(n)),
    );
    if (sitio === undefined) continue;
    puestos.push(sitio);
    piezas.push({ vertice: sitio, clase: 'poblado', color });
    /*
     * DOS caminos en cadena, y el segundo no sobra.
     *
     * Con uno solo no hay ni un sitio legal donde fundar, y no por un fallo: el otro
     * extremo de ese camino está a UNA arista de tu propio poblado, y la regla de
     * distancia lo prohíbe. Es correcto y es lo que pasa en la partida de verdad —hay que
     * tender dos veredas antes de poder fundar— pero un banco que arranca sin un solo
     * sitio marcado no deja mirar lo que se viene a mirar.
     */
    let punta = sitio;
    for (let paso = 0; paso < 2; paso++) {
      const salida = aristasDeVertice(punta).find(
        (a) => todasLasAristas.includes(a) && !caminos.some((c) => c.arista === a),
      );
      if (salida === undefined) break;
      caminos.push({ arista: salida, color });
      const siguiente = verticesDeArista(salida).find(
        (v) => v !== punta && todosLosVertices.includes(v as LlaveDeVertice),
      );
      if (siguiente === undefined) break;
      punta = siguiente as LlaveDeVertice;
    }
  }
  return { piezas, caminos };
}

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
  /*
   * Arranca QUIETO. El botón se queda para la vuelta de presentación, que para enseñar de
   * un tirón lo que genera el mundo sigue siendo lo mejor que hay.
   */
  const [girando, ponerGirando] = useState(false);
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
  const [obras, ponerObras] = useState<PiezaEn3D[]>(() => aperturaDePrueba().piezas);
  const [caminos, ponerCaminos] = useState<CaminoEn3D[]>(() => aperturaDePrueba().caminos);
  const conObras = useMemo(
    () => ({ ...datos, piezas: obras, caminos }),
    [datos, obras, caminos],
  );

  /*
   * QUIÉN JUEGA. Un botón, y hace falta para poder MIRAR las tres reglas.
   *
   * «El castillo sólo sobre poblados tuyos» no se puede ver con un solo jugador: habría
   * que creerse que los que no salen son de otro. Cambiando de jugador se ve que la misma
   * partida marca sitios distintos según quién mire, que es la regla en persona.
   */
  const [quienJuega, ponerQuienJuega] = useState<ColorDeJugador>('red');

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
   * LOS DADOS DE MENTIRA, para mirarlos de cerca sin montar una partida.
   *
   * Tres mandos: «Me toca tirar» enciende `disponible` (vibran); «Tirar» hace de servidor
   * (a los 400 ms llega una vista con otra suma y otro sello, que es lo que hace rodar y
   * asentar, como la tirada de otro); y «Rechazar» hace que la próxima pulsación del asa
   * vuelva con `rechazado` a los 400 ms, para ver el corte en el acto. El asa manda por
   * `onPulsarLosDados`, que aquí es el mismo simulador. La semilla del banco parte la suma
   * en el par, como en la partida.
   */
  const [dadosDelBanco, ponerDadosDelBanco] = useState<DadosDeLaMesa>({
    disponible: false,
    tirado: false,
    ultimaTirada: 0,
    sello: 0,
  });
  const [rechazaLaTirada, ponerRechazaLaTirada] = useState(false);

  /*
   * ═══ RECOGER LA MESA, Y LA VUELTA SOLA (§6) ═══
   *
   * Dos mandos, porque son dos cosas distintas y una de ellas no se puede provocar a mano
   * en el banco. «Recoger / Sacar» mueve la entrada `mesaRecogida` de `<Delta>` y sirve
   * para mirar la bajada: que baje el grupo ENTERO —tapa, zócalos, piezas, naipe, dados,
   * tapete y sombras—, que no quede nada asomando por el canto y que al subir vuelva todo
   * a su sitio, incluidos los dados con el par que tuvieran.
   *
   * «Ahora te toca» es la OTRA mitad, y aquí no hay servidor que la mande: en la partida la
   * mesa sale sola cuando `meToca` pasa de falso a verdadero (decisión 16), y eso lo decide
   * la pantalla, no la escena. Este mando hace de flanco y baja `mesaRecogida` para que se
   * pueda ver la subida sin tocar el otro botón, que es el gesto de verdad. Sin él, la
   * vuelta sola sólo se comprueba leyendo el código.
   */
  const [mesaRecogida, ponerMesaRecogida] = useState(false);
  const simularLaTirada = useCallback(
    (): Promise<ResultadoDelToque> =>
      new Promise((resuelve) => {
        setTimeout(() => {
          if (rechazaLaTirada) {
            resuelve('rechazado');
            return;
          }
          ponerDadosDelBanco((d) => ({
            disponible: false,
            tirado: true,
            ultimaTirada: 2 + Math.floor(Math.random() * 11),
            sello: d.sello + 1,
          }));
          resuelve('hecho');
        }, 400);
      }),
    [rechazaLaTirada],
  );

  /*
   * UNA MANO DE MENTIRA PARA EL BANCO.
   *
   * Once cartas repartidas entre los cinco bienes, que es una mano de catan a mitad de
   * partida: suficientes para que se solapen y el iman tenga trabajo. En la partida de
   * verdad esto llega del servidor.
   */
  const mano = useMemo(() => {
    /* Los cinco de Riberas, que es a lo que se juega. `sal` sigue sin icono a proposito. */
    const BIENES = ['limo', 'junco', 'sal', 'piedra', 'grano'];
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
  /*
   * LA VISTA DE RIBERAS QUE MIRA EL BANCO, y por qué esto sustituyó a dos listas.
   *
   * ═══ LO QUE HABÍA, Y LO QUE SE VEÍA EN PANTALLA ═══
   *
   * Había dos reglas de mentira escritas aquí: `libres` —los vértices sin obra— y
   * `aristasLibres` —todas las aristas, sin filtrar nada—. Con eso, agarrar el castillo
   * ofrecía plantarlo en mitad del campo, la casa se ofrecía pegada a otra casa, y el
   * puente cabía en cualquier sitio. Y soltases donde soltases se construía un poblado,
   * porque quien montaba la obra no miraba qué se había agarrado.
   *
   * La escena no tuvo nunca la culpa: `escenas/sitios.ts` dice que la legalidad llega de
   * fuera y que la escena no opina, y hacía exactamente eso. Quien mentía era esto.
   *
   * ═══ AHORA SE PREGUNTA, Y SE PREGUNTA A QUIEN SABE ═══
   *
   * `obraPosible` reparte por piezas lo que devuelve `opcionesDeRiberas`, que es la MISMA
   * lista que el reductor exige por su portillo antes de aceptar un movimiento. No hay una
   * sola regla de catán escrita en este fichero ni en `escenas/`: la distancia, el camino
   * propio y la ciudad-sobre-poblado-propio salen de `riberas.ts`, donde ya estaban
   * escritas y probadas.
   *
   * ═══ LO QUE SÍ SE FINGE, DICHO CLARO ═══
   *
   * El ESTADO, no las reglas: qué hay construido, de quién, y un almacén con de todo para
   * que el coste no tape lo que se quiere mirar.
   */
  const vistaDelJuego = useMemo(
    () =>
      vistaDePrueba(
        datos.islas.map((i) => i.hex),
        COLORES.map((color) => ({
          asiento: color,
          color,
          chozas: obras
            .filter((o) => o.color === color && o.clase === 'poblado')
            .map((o) => o.vertice),
          torres: obras
            .filter((o) => o.color === color && o.clase === 'ciudad')
            .map((o) => o.vertice),
          veredas: caminos.filter((c) => c.color === color).map((c) => c.arista),
        })),
        quienJuega,
      ),
    [datos.islas, obras, caminos, quienJuega],
  );

  /** Lo que se puede levantar con cada pieza de la barra, según las reglas de verdad. */
  const dondeCabe = useMemo(
    () => ({
      poblado: obraPosible(vistaDelJuego, quienJuega, 'choza'),
      ciudad: obraPosible(vistaDelJuego, quienJuega, 'torre'),
      puente: obraPosible(vistaDelJuego, quienJuega, 'vereda'),
    }),
    [vistaDelJuego, quienJuega],
  );

  /*
   * LA BARRA. Ya no hay ninguna regla de mentira aquí: «disponible» es que HAYA sitio.
   *
   * Y sale apagado muy a menudo, que es lo correcto y lo que antes no pasaba nunca: al
   * empezar, el castillo está apagado porque tienes un poblado sin ciudad que levantar
   * encima —no, espera: lo tienes—; el que sale apagado de verdad es cuando cambias de
   * jugador a uno que no ha construido nada. Un botón que siempre se puede pulsar no
   * informa de nada.
   */
  const barra = useMemo(
    () => [
      {
        id: 'poblado',
        modelo: modeloDePieza('poblado', quienJuega),
        disponible: dondeCabe.poblado.sitios.length > 0,
      },
      {
        id: 'ciudad',
        modelo: modeloDePieza('ciudad', quienJuega),
        disponible: dondeCabe.ciudad.sitios.length > 0,
      },
      { id: 'puente', modelo: MODELO.puente, disponible: dondeCabe.puente.sitios.length > 0 },
      { id: 'torre', modelo: modeloDeTorre(quienJuega), disponible: false },
    ],
    [dondeCabe, quienJuega],
  );

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

  /* Dónde mira la vista de suelo: el primer vértice de la lista, haya obra o no. */
  /*
   * ADÓNDE MIRA LA VISTA DE SUELO: al puente, si hay alguno.
   *
   * Miraba a un vértice fijo de la comarca central, y para juzgar la escala de un poblado
   * valía. Para juzgar un PUENTE no: un puente mide una arista entera —treinta personas— y
   * el sitio desde donde se ve si está bien tendido es a media arista, no en una punta.
   * Además es lo único que se puede mirar de cerca para saber si la calzada encaja con el
   * camino o deja un escalón, que es la pregunta que trae aquí.
   */
  const puntoDeObra = useMemo(() => {
    const primero = caminos[0];
    if (primero !== undefined) {
      const [a, b] = verticesDeArista(primero.arista);
      if (a !== undefined && b !== undefined) {
        const pa = puntoDeVertice(a, RADIO_DE_COMARCA);
        const pb = puntoDeVertice(b, RADIO_DE_COMARCA);
        return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      }
    }
    return puntoDeVertice(sitios[0] as string, RADIO_DE_COMARCA);
  }, [caminos, sitios]);

  /*
   * LOS ATAJOS DEL PANEL, que ahora tampoco inventan.
   *
   * Fundaban y mejoraban donde les parecía —el primer vértice de una lista, el primer
   * poblado que encontraran— sin mirar si era legal. Ahora usan el PRIMER SITIO LEGAL de
   * la misma lista que usan los anillos, así que un atajo no puede montar una posición
   * que el juego no habría permitido. Si no hay ninguno, no hacen nada.
   */
  function fundar(): void {
    const donde = dondeCabe.poblado.sitios[0];
    if (donde === undefined) return;
    ponerObras((antes) => [
      ...antes,
      { vertice: donde.llave as LlaveDeVertice, clase: 'poblado', color: quienJuega },
    ]);
  }

  function mejorar(): void {
    const donde = dondeCabe.ciudad.sitios[0];
    if (donde === undefined) return;
    ponerObras((antes) =>
      antes.map((o) => (o.vertice === donde.llave ? { ...o, clase: 'ciudad' as const } : o)),
    );
  }

  function tender(): void {
    const donde = dondeCabe.puente.sitios[0];
    if (donde === undefined) return;
    ponerCaminos((antes) => [
      ...antes,
      { arista: donde.llave as LlaveDeArista, color: quienJuega },
    ]);
  }

  /* Derribar vuelve a la APERTURA, no al vacío: sin nada puesto no hay nada legal. */
  function derribar(): void {
    const limpio = aperturaDePrueba();
    ponerObras(limpio.piezas);
    ponerCaminos(limpio.caminos);
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
          girando={girando}
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
              /* El cuarto hueco de la barra: el naipe del mazo. Encendido siempre en el banco, que es
                 el unico sitio donde se puede mirar de cerca sin montar una partida. */
              mazo={{ disponible: true }}
              onPulsarElMazo={() => console.log("[banco] mazo pulsado")}
              /* El tapete del turno sobre la mesa: del color de quien juega en el banco, que
                 cambia con el botón de turno. Sin esto la mesa se vería sin tapete y no se
                 podría juzgar su color contra la madera. */
              turnoDe={quienJuega}
              /* Los dados de mentira: ver `dadosDelBanco`. El asa manda al mismo simulador que el botón «Tirar». */
              dados={dadosDelBanco}
              onPulsarLosDados={simularLaTirada}
              /* La mesa recogida: ver los dos mandos de abajo. */
              mesaRecogida={mesaRecogida}
              mano={mano}
              cogida={cogida}
              onCogerCarta={(c) => ponerCogida((antes) => (antes === c.id ? null : c.id))}
              seCambianPor={
                cogida === null
                  ? []
                  : ['limo', 'junco', 'sal', 'piedra', 'grano'].filter(
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
                /*
                 * LA CLASE NO SE ESCRIBE: SE DEDUCE DE LAS LLAVES.
                 *
                 * Antes se escribía a mano —«si es el puente, aristas; si no, vértices»— y
                 * ése fue el fallo que dejó al puente con cero anillos el día que se le
                 * pasó la lista equivocada: el par (clase, llaves) puede no cuadrar, y
                 * cuando no cuadra la escena filtra bien y no sale nada, sin un error en
                 * ninguna consola. `obraPosible` saca la clase del prefijo de las propias
                 * llaves, así que ese desajuste ya no se puede escribir.
                 */
                const cual = dondeCabe[id as keyof typeof dondeCabe] as ObraPosible | undefined;
                if (cual === undefined || cual.clase === null) return;
                ponerTomada(id);
                ponerColocando({ clase: cual.clase, donde: cual.sitios.map((x) => x.llave) });
              }}
              onElegirSitio={(sitio) => {
                /*
                 * QUÉ SE LEVANTA LO DICE LA PIEZA AGARRADA, no el sitio.
                 *
                 * Antes esto plantaba SIEMPRE un poblado, agarrases lo que agarrases. Se
                 * vio en el acto —«sólo se construye un poblado»— y era esta línea: el
                 * sitio que montaba la obra no miraba `tomada`.
                 */
                if (tomada === 'poblado') {
                  ponerObras((antes) => [
                    ...antes,
                    { vertice: sitio.llave as LlaveDeVertice, clase: 'poblado', color: quienJuega },
                  ]);
                } else if (tomada === 'ciudad') {
                  /* La ciudad SUSTITUYE al poblado: no se planta una segunda pieza encima. */
                  ponerObras((antes) =>
                    antes.map((o) =>
                      o.vertice === sitio.llave ? { ...o, clase: 'ciudad' as const } : o,
                    ),
                  );
                } else if (tomada === 'puente') {
                  ponerCaminos((antes) => [
                    ...antes,
                    { arista: sitio.llave as LlaveDeArista, color: quienJuega },
                  ]);
                }
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
            {/*
              * LO QUE LAS REGLAS PERMITEN AHORA MISMO, en números.
              *
              * Un anillo verde en el tablero se ve, pero contarlos a ojo entre tres millones
              * de triángulos no se puede — y la pregunta que importa al mirar este banco es
              * justamente cuántos sitios hay y si cambian al cambiar de jugador. Esto lo
              * dice, y sale de la MISMA lista que pinta los anillos, así que no puede
              * discrepar de lo que se ve.
              */}
            <div style={{ color: '#9fe6b8' }}>
              {quienJuega} puede: poblado {dondeCabe.poblado.sitios.length} · ciudad{' '}
              {dondeCabe.ciudad.sitios.length} · puente {dondeCabe.puente.sitios.length}
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
              ponerColocando((antes) => {
                if (antes !== null) return null;
                if (dondeCabe.poblado.clase === null) return null;
                ponerTomada('poblado');
                return {
                  clase: dondeCabe.poblado.clase,
                  donde: dondeCabe.poblado.sitios.map((x) => x.llave),
                };
              })
            }
            style={BOTON}
          >
            {colocando === null
              ? `Colocar poblado (${String(dondeCabe.poblado.sitios.length)})`
              : 'Dejarlo'}
          </button>
          {trueque !== null && (
          <div style={{ color: '#9fe6b8', marginBottom: 8 }}>Trueque propuesto: {trueque}</div>
        )}
        <button
          type="button"
          onClick={() => {
            ponerQuienJuega(
              (q) => COLORES[(COLORES.indexOf(q) + 1) % COLORES.length] as ColorDeJugador,
            );
            ponerColocando(null);
            ponerTomada(null);
          }}
          style={{ ...BOTON, borderColor: COLOR_EN_PANTALLA[quienJuega] }}
        >
          Juega: {quienJuega}
        </button>
        <button type="button" onClick={tender} style={BOTON}>
          Tender puente
        </button>
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
        {/* Los dados: ver `dadosDelBanco`. Lo que se mira es la vibración, el rodar, el asentado y el corte del rechazo. */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              ponerDadosDelBanco((d) => ({ ...d, disponible: true, tirado: false }));
            }}
            style={BOTON}
          >
            Me toca tirar
          </button>
          <button type="button" onClick={() => void simularLaTirada()} style={BOTON}>
            Tirar
          </button>
          <button
            type="button"
            onClick={() => {
              ponerRechazaLaTirada((r) => !r);
            }}
            style={{ ...BOTON, borderColor: rechazaLaTirada ? '#ff8b7a' : undefined }}
          >
            {rechazaLaTirada ? 'Rechazar: sí' : 'Rechazar: no'}
          </button>
          <span style={{ alignSelf: 'center', color: '#9fe6b8' }}>
            suma {dadosDelBanco.ultimaTirada} · sello {dadosDelBanco.sello}
          </span>
        </div>
        {/* La mesa que se recoge: ver `mesaRecogida`. Lo que se mira es la bajada entera y la vuelta. */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              ponerMesaRecogida((r) => !r);
            }}
            style={{ ...BOTON, borderColor: mesaRecogida ? '#9fe6b8' : undefined }}
          >
            {mesaRecogida ? 'Sacar la mesa' : 'Recoger la mesa'}
          </button>
          <button
            type="button"
            onClick={() => {
              ponerMesaRecogida(false);
            }}
            style={BOTON}
          >
            Ahora te toca
          </button>
          <span style={{ alignSelf: 'center', color: '#9fe6b8' }}>
            mesa {mesaRecogida ? 'recogida' : 'puesta'}
          </span>
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
              ponerGirando((g) => !g);
            }}
            style={BOTON}
          >
            {girando ? 'Parar' : 'Dar una vuelta'}
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
