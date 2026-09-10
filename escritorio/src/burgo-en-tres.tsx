/**
 * EL BURGO EN TRES DIMENSIONES, EN EL ESCRITORIO: el pintor propio del sexto arcade
 * sobre el motor de la Sala, montado en un lienzo dentro de la mesa de siempre.
 *
 * ═══ QUÉ ES, Y QUÉ NO ═══
 *
 * El Burgo es un arcade de `mueble: 'tablero'`: su vista trae el `TableroDeclarado` de
 * siempre y el retablo lo sigue sabiendo pintar. Lo que cambia es QUIÉN pinta la parte
 * grande: en vez del `Retablo` genérico, aquí se monta la escena del anillo
 * (`escenas/burgo/Burgo.tsx`) con lo que la mesa manda, traducido UNA sola vez en
 * `shared/arcade/juegos/burgo-en-tres.ts`. Es el mismo precedente que Riberas, y por eso
 * el escritorio elige el pintor por TABLA (`pintores.ts`, decisión 18) en vez de por un
 * `if` con el nombre del arcade dentro.
 *
 * NO HAY NINGUNA REGLA AQUÍ. Qué se puede hacer en una casilla lo dice
 * `obraPosibleEnCasilla` leyendo las mismas `opciones()` que el reductor exige; qué se
 * manda al tocar viene ya montado dentro de cada opción; qué dice cada sección de la hoja
 * lo redacta `hojaEnTres`. Este fichero recoge y manda. Un `if` sobre una posada, una
 * renta o un empeño escrito aquí sería una segunda traducción, y el día que las dos
 * discreparan nadie se enteraría.
 *
 * ═══ EL RETABLO NO SE VA: ES EL RESPALDO, Y NO ES OPCIONAL ═══
 *
 * Cuatro cosas pueden faltar y ninguna puede dejar la mesa sin pintar: `burgo.glb` no
 * llega, el `Canvas` revienta al nacer —sin WebGL, sin contexto—, esto se renderiza en
 * Node sin ventana (`verificar-escritorio`), o LA MESA NO CABE EN TRES DIMENSIONES
 * (`seVeEnTres`: más jugadores que colores de peón). En los cuatro casos se pinta EL
 * RETABLO DE SIEMPRE, con sus acciones y sus opciones sueltas, y una línea en letra chica
 * de por qué. Es la regla del §5 del Muelle llevada a la partida: si el mundo no arranca,
 * se juega igual. Y en el Burgo eso importa el doble, porque el retablo del anillo son
 * cuatro tiras de diez casillas que se JUEGAN por acciones y paneles (decisión 9).
 *
 * ═══ SIN CARAS NO ES LO MISMO QUE SIN MUNDO: SON DOS PREGUNTAS ═══
 *
 * El tablero declarado sin caras es la mesa REUNIDA —sólo hay «Empezar»— y ahí no hay
 * anillo que pintar ni retablo que enseñar: sale el formulario a secas. Que la mesa no
 * quepa en tres es otra cosa y tiene tablero: sale el retablo. Preguntar sólo una de las
 * dos fue lo que en Riberas puso cincuenta y cuatro botones sueltos donde tenía que haber
 * un tablero, así que aquí se preguntan las dos, y en este orden.
 *
 * ═══ LO QUE ACABA DE PASAR SE DERIVA AQUÍ Y SE ANIMA ALLÍ ═══
 *
 * La vista trae `jugada` y la lista de sucesos del ÚLTIMO cambio. La escena anima lo que
 * hay entre la jugada que vio y la que llega, y quien sabe cuál vio es esta pantalla: se
 * guarda la anterior en una `ref` y `sucesosEnTres` hace el resto —la lista tal cual si
 * saltó una, una lista GRUESA comparando las dos vistas si saltó más—. Sin la vista
 * anterior no se puede saber dónde estaba cada peón, y la nueva no lo dice.
 *
 * ═══ EL MODELO SE PIDE UNA VEZ POR PESTAÑA, Y LOS AVENTUREROS LOS TRAE EL MUELLE ═══
 *
 * `burgo.glb` pesa 2,8 MB y se pide por HTTP al servidor de juego; la promesa vive en el
 * módulo (`recordada`), así que la primera mesa lo trae y las siguientes lo encuentran.
 * Los AVENTUREROS son otra cosa: los carga la escena con la `traer` que esta pantalla le
 * pasa, y la caché de `cargadorPara` es POR IDENTIDAD DE ESA FUNCIÓN. Por eso se usa la
 * de `muelle.tsx` y no una escrita aquí: quien acaba de zarpar ya tiene los suyos
 * bajados, y una `traer` propia estrenaría caché justo en el telón de entrada.
 *
 * ═══ LA CÁMARA ES LA DEL BANCO, Y VA MONTADA ANTES QUE LA ESCENA ═══
 *
 * `<CamaraAerea>` va DELANTE de `<Burgo>` dentro del `Canvas`, y no es cosmético: los dos
 * se suscriben a `useFrame` con la misma prioridad, los suscriptores de igual prioridad
 * corren en orden de montaje, y el seguimiento al que mueve de la escena mezcla DESDE la
 * pose que el cliente acaba de dejar. Al revés, el cliente pisaría el seguimiento cada
 * fotograma y el aventurero nunca se vería de cerca.
 *
 * La aritmética no está aquí: `escenas/acercar.ts` y `escenas/burgo/camara-del-burgo.ts`
 * dan los topes, el alcance y la pose de salida, y se pueden medir desde Node. Lo único
 * que esta pantalla decide es CUÁNDO se apaga el seguimiento: cualquier gesto lo cancela,
 * y vuelve con la revisión siguiente.
 *
 * ═══ Y SIEMPRE HAY SALIDA ═══
 *
 * Un zoom sin vuelta atrás atrapa: se entra a mirar una esquina del anillo y ya no se sabe
 * volver. Por eso hay un botón sobre el lienzo, «Ver el burgo entero», que devuelve la
 * pose de salida. Sólo se enseña cuando hace falta: un botón que siempre está no informa
 * de nada.
 *
 * ═══ LO QUE LA REVISIÓN DE LA MESA NO TOCA ═══
 *
 * La cámara. Al cambiar `rev` se suelta lo que se tenía abierto —la ficha de una casilla,
 * el menú de «¿qué haces aquí?»— y NO se recoloca la vista: quien está mirando su barrio
 * de cerca se queda donde estaba aunque juegue otro. Una cámara que salta con cada jugada
 * ajena marea, y el sondeo trae una revisión nueva cada pocos segundos.
 *
 * ═══ LO QUE ESTO NO IMPORTA ═══
 *
 * Nada de `app/` (lo vigila `verify:fronteras`), nada de `drei`, y ni un color copiado de
 * la paleta de la app: los `.burgo-*` de `estilo.css` llevan los suyos escritos.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import type { Cercania } from '../../escenas/acercar';
import { CERCANIA_DE_SALIDA } from '../../escenas/acercar';
import { Burgo } from '../../escenas/burgo/Burgo';
import {
  ALCANCE_DEL_BURGO,
  ALTURA_MINIMA_DEL_OJO_DEL_BURGO,
  CAMPO_DE_LA_CAMARA,
  LIMITES_DEL_BURGO,
  MIRADOR_DEL_BURGO,
  poseDeSalida,
} from '../../escenas/burgo/camara-del-burgo';
import type { TableroDelBurgoEn3D } from '../../escenas/burgo/tipos';
import { juzgarCalidad } from '../../escenas/embarcadero/calidad';
import type { MuestraDelHilo } from '../../escenas/embarcadero/calidad';
import type { Calidad } from '../../escenas/embarcadero/tipos';
import type { CatalogoDeModelos } from '../../escenas/modelos';
import { unirCatalogos } from '../../escenas/modelos';
import { rutaDeLosDados, rutaDelBurgo } from '../../escenas/ruta-de-modelos';
import type { Opcion } from '../../shared/arcade';
import {
  camaraSigueA,
  dadosEnTres,
  esperaA,
  fichaDeCasilla,
  firmaDelTablero,
  hojaEnTres,
  marcadorEnTres,
  maravedies,
  obraPosibleEnCasilla,
  opcionesFueraDelTablero,
  seVeEnTres,
  sucesosEnTres,
  tableroEnTres,
  tirarEnTres,
} from '../../shared/arcade/juegos/burgo-en-tres';
import type { DadosEnTres } from '../../shared/arcade/juegos/burgo-en-tres';
import type { MovimientoDeclarado, TableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { Formulario, hayAlgoQuePintar } from './formulario';
import { LasHojasDelBurgo } from './hojas-del-burgo';
import {
  CamaraAerea,
  ElijeUna,
  LimiteDelMundo,
  raizDelNavegador,
  recordada,
  traerUnGlb,
  usarLaTrampaDeFoco,
  usarLosModelos,
} from './lienzo-propio';
import type { LaMesa, MesaVista } from './mesa';
import { traer } from './muelle';
import type { ArcadeDelCatalogo } from './muebles';
import { opcionesSueltas } from './plan';
import { loQueSeDiceDeUnFallo } from './red-de-seguridad';
import { elEstiloDeLaCinta, RAIZ_DE_LA_CASA } from './riberas-en-tres';
import { cuantoQuedaEnLaCinta, elPlazoAprieta, msHastaQueCambieElRotulo, cuantoQueda } from './relojes';
import { AccionesDelTablero, Retablo } from './retablo';

/**
 * De dónde se trae el anillo: la única ruta, la de `escenas/ruta-de-modelos.ts`, que es la
 * que sirve `server/src/routes/modelos.ts`. Relativa: en desarrollo la reenvía el proxy de
 * Vite y en producción es el mismo Node que sirve esta página.
 */
const RUTA_DEL_BURGO = rutaDelBurgo();
/** Y los dados, en su fichero de unos kB, por la misma puerta. */
const RUTA_DE_LOS_DADOS = rutaDeLosDados();

/** El título de este pintor sobre el lienzo. Es chrome de la Sala, no una palabra del juego. */
const TITULO_DE_LO_QUE_SE_HACE = 'Lo que puedes hacer';

/**
 * LA SALIDA DEL ACERCAMIENTO, con todas sus letras y no un icono: quien se ha perdido en
 * una esquina del anillo necesita LEER la salida, no adivinarla. «El burgo» es el nombre
 * del sitio y está en el vocabulario del reglamento (§0).
 */
const VOLVER_AL_BURGO_ENTERO = 'Ver el burgo entero';

/**
 * EL RECUADRO DEL MUNDO, con su nombre escrito UNA vez, y con DOS clases.
 *
 * `burgo-lienzo` es lo suyo —el alto, el fondo, el `touch-action`—, y la cámara lo BUSCA
 * por ella con `closest` para colgar de él el oyente de la rueda, que no puede ir en el
 * `<canvas>` porque los botones de encima son hermanos suyos y no hijos.
 *
 * `lienzo-propio` es la clase GENÉRICA de la que cuelga la pantalla completa (decisión
 * 18): la cadena de seis eslabones de `estilo.css` se engancha con `:has(.lienzo-propio)`
 * en vez de con el nombre de un juego, para que el tercer pintor no vuelva a pagar esto.
 * Riberas conserva la suya —su fichero no se toca en esta fase y sus regex lo atan—, así
 * que hoy la hoja lleva las dos cadenas; el día que Riberas gane la clase genérica, la
 * suya se borra y no cambia nada más.
 */
const RECUADRO_DEL_LIENZO = 'burgo-lienzo';
const LIENZO_PROPIO = 'lienzo-propio';

/**
 * EL CAJÓN, SU VELO Y EL MENÚ, con el nombre escrito UNA vez cada uno, y por el mismo
 * motivo que el recuadro: los busca la cámara.
 *
 * El oyente de la rueda cuelga del recuadro y llama a `preventDefault` SIEMPRE, que es lo
 * que impide que la Sala se desplace mientras uno cree estar acercándose. Dentro del
 * recuadro hay cajas que se desplazan por dentro —el cajón, con las ocho secciones de la
 * hoja y el raíl entero—, y sobre ellas ese `preventDefault` se lo comería: girar la rueda
 * sobre «Lo mío» acercaría el anillo detrás del cajón sin mover un renglón. Nombradas
 * aquí, la rueda no hace nada de nada sobre ellas.
 *
 * Sobre el VELO se llama a `preventDefault` y se para ahí: lo que hay abierto es modal, y
 * modal incluye la cámara.
 */
const EL_CAJON = 'burgo-cajon';
const EL_VELO = 'burgo-velo';
const EL_MENU = 'burgo-elige';
/** Las que se desplazan por dentro: la rueda es suya y no de la cámara. */
const SE_DESPLAZAN_SOLAS = [EL_CAJON, EL_MENU];

const SALIR_DE_LA_MESA = 'Volver a la Sala de Arcade';
const ABRIR_EL_CAJON = 'Abre la hoja de la partida';
const CERRAR_EL_CAJON = 'Cierra la hoja de la partida';
/** El nombre del cajón, que es un `dialog` y sin nombre se anuncia «diálogo» a secas. */
const EL_CARRIL_DE_LA_MESA = 'El carril de la mesa';

/** Lo que el cajón puede llegar a medir de ancho, en partes de la raíz de la casa. */
const ANCHO_DEL_CAJON_EN_RAICES = 26;

/**
 * CUÁNTO SE MIRA ANTES DE BAJAR A `sobria`, y de dónde sale.
 *
 * `juzgarCalidad` pide 120 fotogramas de muestras y `alMedir` manda una por segundo, así
 * que con guardar las últimas doce hay de sobra para decidir sin arrastrar el historial de
 * la partida entera. La decisión es de `escenas/embarcadero/calidad.ts` y no de aquí: los
 * dos clientes bajan la calidad con el mismo umbral.
 */
const MUESTRAS_QUE_SE_GUARDAN = 12;

/**
 * EL CAMPO VERTICAL, en grados: el `fov` del `Canvas` de abajo. Sale de
 * `camara-del-burgo.ts` (`CAMPO_DE_LA_CAMARA = 45`) y NO se escribe aquí un 45 suelto: la
 * escena proyecta con ese número y `verify:burgo-escena` afirma que las cuatro esquinas
 * del anillo caben con él. Dos cuarenta y cincos que se puedan separar son un encuadre que
 * miente en una de las dos pantallas.
 */
const FOV = CAMPO_DE_LA_CAMARA;

// ---------------------------------------------------------------------------
// Los modelos: el anillo y los dados, cada uno con su red
// ---------------------------------------------------------------------------

const traerElAnillo = recordada(() => traerUnGlb(RUTA_DEL_BURGO));
const traerLosDados = recordada(() => traerUnGlb(RUTA_DE_LOS_DADOS));

/**
 * EL CATÁLOGO ENTERO: el anillo y los dados, pedidos A LA VEZ y unidos en un mapa.
 *
 * Con su propia red cada uno: un `dados.glb` que no llegue —un despliegue sin él, un 404,
 * un fichero roto— NO puede tirar el anillo, que pesa 2,8 MB y ya está aquí. El fallo de
 * los dados se convierte en «sin dado» y la escena pinta el cubo del respaldo; se avisa por
 * consola, porque un respaldo mudo es un fallo que nadie ve. Sólo el fallo del anillo
 * rechaza la promesa, y entonces se juega sobre el retablo.
 */
function traerElCatalogoDelBurgo(): Promise<CatalogoDeModelos> {
  const anillo = traerElAnillo();
  const dados = traerLosDados().catch((fallo: unknown): null => {
    console.warn(`Los dados no han llegado (${loQueSeDiceDeUnFallo(fallo)}): se pintan los del respaldo.`);
    return null;
  });
  return Promise.all([anillo, dados]).then(([delAnillo, deLosDados]) => unirCatalogos(delAnillo, deLosDados));
}

// ---------------------------------------------------------------------------
// El pintor
// ---------------------------------------------------------------------------

export interface LoQueVeElBurgo {
  manifiesto: ArcadeDelCatalogo;
  mesa: LaMesa;
  /** La mesa ya puesta: `mesa.mesa` cuando se está dentro. Se pasa aparte para no volver a comprobarlo. */
  puesta: MesaVista;
  /** El tablero declarado que trae la vista. Es lo que pinta el respaldo. */
  tablero: TableroDeclarado;
  opciones: readonly Opcion[];
  /**
   * DÓNDE HA QUEDADO EL RECUADRO DEL LIENZO, para quien tenga que llevar el foco.
   *
   * Lo llama este pintor con el recuadro al montarlo y con `null` al soltarlo, y lo escucha
   * `sala.tsx`. Hace falta avisar porque la decisión de si HAY lienzo se toma aquí dentro y
   * en mitad del render —sin `.glb`, sin WebGL o con más jugadores que colores esto cae al
   * retablo y no hay recuadro ninguno—, o sea que arriba no se puede saber. Y se avisa
   * también con `null`, que es cuando el recuadro SE VA: el modelo tarda, mientras carga ya
   * hay recuadro con su telón, el foco aterriza ahí, y si el `.glb` acaba fallando el
   * recuadro se desmonta CON EL FOCO DENTRO y el navegador lo suelta al `<body>`.
   *
   * OPCIONAL porque el comprobador monta este pintor suelto para medirlo, sin ninguna Sala
   * alrededor: exigirlo allí sería obligar a inventar un destino que nadie lee.
   */
  foco?: (recuadro: HTMLElement | null) => void;
  /**
   * EL RAÍL ENTERO, PARA METERLO EN EL CAJÓN.
   *
   * Dentro van el marcador, la ficha de la mesa con su código y su reloj, las dos salidas y
   * la crónica: todo lo que la Sala ya monta y sabe montar, con sus estados y sus efectos.
   * Escribir aquí una segunda versión sería tener dos raíles, y el día que uno gane un dato
   * el otro no lo tendría.
   *
   * OPCIONAL por lo mismo que `foco`: el comprobador monta este pintor sin Sala alrededor.
   * La ficha de la cinta sigue abriendo el cajón —es la puerta y no depende de lo que haya
   * dentro— y sin raíl lo que se abre trae sólo la hoja.
   */
  elRail?: ReactNode;
  /**
   * ADÓNDE VA EL «‹» DE LA CINTA: la misma dirección que el rótulo de la cabecera. No se
   * escribe aquí porque lleva dentro la silla de esta ventana (`?silla=`), que es un dato
   * del bolsillo de este navegador y lo sabe la Sala.
   */
  laSalida?: string;
}

/** Lo que se pregunta cuando un gesto admite varias respuestas, o cuando sólo hay que leer. */
interface Preguntando {
  titulo: string;
  nota?: string;
  opciones: readonly Opcion[];
}

/** La jugada que trae una vista, o cero. Es el sello con el que la escena sabe qué ha visto. */
function jugadaDe(vista: unknown): number {
  const v = vista as { jugada?: unknown };
  return typeof v.jugada === 'number' ? v.jugada : 0;
}

/** ¿Son la misma pose? Es una igualdad, no una cuenta de cámara: las cuentas están en `acercar.ts`. */
function laMismaPose(a: Cercania, b: Cercania): boolean {
  return a.factor === b.factor && a.centro.x === b.centro.x && a.centro.z === b.centro.z;
}

export function BurgoEnTres({
  manifiesto,
  mesa,
  puesta,
  tablero,
  opciones,
  foco,
  elRail,
  laSalida,
}: LoQueVeElBurgo): JSX.Element {
  const { mover, quieto } = mesa;
  const vista = puesta.vista;
  const yo = puesta.yo;
  const nombreDelCajon = useId();

  /*
   * ═══ LAS CUARENTA CASILLAS CONSERVAN SU IDENTIDAD ENTRE SONDEOS, Y ESO ES LO QUE NO TIEMBLA ═══
   *
   * Cada respuesta del servidor trae una vista NUEVA, y `tableroEnTres` fabrica de ella una
   * lista de casillas nueva aunque el anillo no haya cambiado —y no cambia en toda la
   * partida salvo por dueños y casas—. La escena reconstruye el mundo estático cuando cambia
   * la identidad de esa lista: noventa mil vértices fundidos otra vez en cada jugada de
   * cualquiera y en cada vuelta del sondeo. Se vería como un tirón por revisión. Así que se
   * firma con `firmaDelTablero` —que cambia si y sólo si cambia algo que la escena pinta— y,
   * si es la misma, se entrega EL MISMO objeto de antes.
   */
  const loVisto = useRef<{ firma: string; datos: TableroDelBurgoEn3D } | null>(null);
  const datos = useMemo(() => {
    const crudo = tableroEnTres(vista, yo, opciones, puesta.asientos.map((a) => ({ id: a.id, figura: a.figura })));
    if (crudo === null) return null;
    const firma = firmaDelTablero(crudo);
    const antes = loVisto.current;
    const datos = antes !== null && antes.firma === firma ? antes.datos : crudo;
    loVisto.current = { firma, datos };
    return datos;
  }, [vista, yo, opciones, puesta.asientos]);

  /*
   * ═══ LO QUE ACABA DE PASAR, DERIVADO CONTRA LA VISTA QUE LA ESCENA TENÍA ═══
   *
   * `sucesosEnTres` da la lista tal cual si saltó exactamente una jugada, y una lista GRUESA
   * —comparando la vista anterior con ésta— si saltó más de una, que es lo que pasa cuando el
   * sondeo se pierde una revisión. Sin la vista anterior no hay con qué comparar: no se puede
   * saber dónde estaba cada peón, y la nueva no lo dice.
   *
   * La anterior vive en una `ref` y se escribe DENTRO del `useMemo` a propósito: es un apunte
   * de lo que ya se entregó a la escena, no algo que pinte nada, y un estado aquí sería un
   * render de más por vuelta del sondeo.
   */
  const loQueViolaEscena = useRef<{ jugada: number; vista: unknown } | null>(null);
  const sucesos = useMemo(() => {
    const antes = loQueViolaEscena.current;
    const jugada = jugadaDe(vista);
    const lista = sucesosEnTres(antes === null ? jugada - 1 : antes.jugada, vista, antes?.vista);
    loQueViolaEscena.current = { jugada, vista };
    return { jugada, lista };
  }, [vista]);

  // -------------------------------------------------------------------------
  // Lo que se tiene en la mano
  // -------------------------------------------------------------------------

  /**
   * LO QUE ESTÁ ABIERTO ENCIMA DEL ANILLO: la pregunta de «¿qué haces aquí?», la ficha de
   * una casilla o la de un jugador. Vive aquí y no en la vista porque es DÓNDE ESTÁ MIRANDO
   * LA PERSONA, no estado del juego.
   */
  const [preguntando, ponerPreguntando] = useState<Preguntando | null>(null);
  const [cajonAbierto, ponerCajonAbierto] = useState(false);

  const elRecuadro = useRef<HTMLDivElement | null>(null);
  const laFichaDeLaCinta = useRef<HTMLButtonElement | null>(null);

  /**
   * SOLTARLO TODO: la pregunta abierta y la ficha que se estaba leyendo.
   *
   * El cajón NO entra, y no es un olvido: no es algo que se tenga en la mano, es una caja que
   * alguien abrió para leer el marcador y la crónica. Cerrarlo porque otro ha jugado sería
   * arrancarle la página de las manos a quien está mirando cuánto dinero le queda a Bea.
   */
  const soltarTodo = useCallback(() => {
    ponerPreguntando(null);
  }, []);

  /*
   * AL CAMBIAR LA REVISIÓN SE SUELTA TODO. Lo que estaba abierto se abrió mirando la mesa
   * anterior: las obras de esa casilla pueden haber dejado de ser legales, y el trato que se
   * estaba leyendo puede haberse aceptado ya.
   */
  useEffect(() => {
    soltarTodo();
  }, [puesta.rev, soltarTodo]);

  const cerrarLaPregunta = useCallback(() => {
    ponerPreguntando(null);
    elRecuadro.current?.focus();
  }, []);
  const cerrarElCajon = useCallback(() => {
    ponerCajonAbierto(false);
    laFichaDeLaCinta.current?.focus();
  }, []);
  const elCajon = useRef<HTMLDivElement | null>(null);
  usarLaTrampaDeFoco(cajonAbierto, elCajon, cerrarElCajon);

  // -------------------------------------------------------------------------
  // El recuadro: se mide, y de paso se avisa de dónde ha quedado
  // -------------------------------------------------------------------------

  const [lienzo, ponerLienzo] = useState({ ancho: 0, alto: 0 });
  const [raizDeLaLetra, ponerRaizDeLaLetra] = useState(RAIZ_DE_LA_CASA);
  const observadorDelRecuadro = useRef<ResizeObserver | null>(null);
  const medirElRecuadro = useCallback(
    (recuadro: HTMLDivElement | null) => {
      elRecuadro.current = recuadro;
      /*
       * PRIMERO SE AVISA DEL DESTINO DEL FOCO, Y ANTES DE LA GUARDA DE `ResizeObserver`.
       * Detrás de ella el aviso se perdería exactamente donde más falta hace —un navegador
       * viejo, una prueba en Node— y el foco volvería a caer al `body` al sentarse sin que
       * nada fallara.
       */
      foco?.(recuadro);
      if (recuadro === null || typeof ResizeObserver === 'undefined') return;
      const mide = (): void => {
        ponerLienzo((antes) => {
          const ancho = recuadro.clientWidth;
          const alto = recuadro.clientHeight;
          return antes.ancho === ancho && antes.alto === alto ? antes : { ancho, alto };
        });
        ponerRaizDeLaLetra((antes) => {
          const ahora = raizDelNavegador();
          return antes === ahora ? antes : ahora;
        });
      };
      mide();
      const observador = new ResizeObserver(mide);
      observador.observe(recuadro);
      if (typeof document !== 'undefined') observador.observe(document.documentElement);
      /* Los `ref` de función no tienen limpieza: se suelta en el efecto de abajo. */
      observadorDelRecuadro.current = observador;
    },
    [foco],
  );
  useEffect(() => () => observadorDelRecuadro.current?.disconnect(), []);

  // -------------------------------------------------------------------------
  // Los modelos, la calidad y el fallo
  // -------------------------------------------------------------------------

  const cabeEnTres = seVeEnTres(vista);
  const { modelos, fallo: falloDelModelo } = usarLosModelos(cabeEnTres, traerElCatalogoDelBurgo);
  const [falloDelLienzo, ponerFalloDelLienzo] = useState<string | null>(null);
  const alFallarElLienzo = useCallback((motivo: string) => {
    ponerFalloDelLienzo(motivo);
  }, []);
  const fallo = falloDelModelo ?? falloDelLienzo;

  /*
   * LA CALIDAD LA JUZGA `escenas/embarcadero/calidad.ts` CON LAS MUESTRAS DE LA ESCENA, y no
   * un `if` sobre el aparato: los dos clientes bajan a `sobria` con el mismo umbral y con la
   * misma cuenta. Las muestras van en una `ref` porque llegan una por segundo y no pintan
   * nada; lo único que es estado es la calidad, que sí cambia lo que se monta.
   */
  const muestras = useRef<MuestraDelHilo[]>([]);
  const [calidad, ponerCalidad] = useState<Calidad>('plena');
  const alMedir = useCallback((m: { triangulos: number; llamadas: number; ms: number; fotogramas: number }) => {
    const lista = [...muestras.current, { ms: m.ms, fotogramas: m.fotogramas }].slice(-MUESTRAS_QUE_SE_GUARDAN);
    muestras.current = lista;
    const juicio = juzgarCalidad(lista);
    if (juicio !== null) ponerCalidad((antes) => (antes === juicio ? antes : juicio));
  }, []);

  // -------------------------------------------------------------------------
  // La cámara: dónde se está mirando y cómo se vuelve
  // -------------------------------------------------------------------------

  /*
   * VA EN UNA `ref` Y NO EN EL ESTADO: mover la mirada son sesenta cambios por segundo
   * mientras se arrastra, y pasarlos por React repintaría el mueble entero sesenta veces por
   * segundo para mover una cámara. Lo único que SÍ es estado es si se está en la pose de
   * salida, porque eso es lo que enciende y apaga un botón.
   */
  const cercania = useRef<Cercania>(CERCANIA_DE_SALIDA);
  const laPoseDeSalida = useRef<Cercania>(CERCANIA_DE_SALIDA);
  const [alPrincipio, ponerAlPrincipio] = useState(true);
  const eraAlPrincipio = useRef(true);
  /*
   * SEGUIR AL QUE MUEVE: se apaga con cualquier gesto y vuelve con la revisión siguiente
   * (§5.6). El apunte en `ref` es el que lee el manejador de la cámara sesenta veces por
   * segundo; el estado es lo que le llega a la escena por props.
   */
  const [siguiendo, ponerSiguiendo] = useState(true);
  const seguiaAntes = useRef(true);
  const alAcercarse = useCallback((nueva: Cercania): void => {
    cercania.current = nueva;
    if (seguiaAntes.current) {
      seguiaAntes.current = false;
      ponerSiguiendo(false);
    }
    const ahora = laMismaPose(nueva, laPoseDeSalida.current);
    if (ahora === eraAlPrincipio.current) return;
    eraAlPrincipio.current = ahora;
    ponerAlPrincipio(ahora);
  }, []);
  useEffect(() => {
    seguiaAntes.current = true;
    ponerSiguiendo(true);
  }, [puesta.rev]);
  /*
   * LA POSE DE SALIDA DEPENDE DE LA FORMA DEL LIENZO —`poseDeSalida` retira el ojo en
   * apaisado para que las cuatro esquinas del anillo quepan—, así que se recalcula al medir.
   * Y sólo se recoloca la cámara de quien NO ha tocado nada: a quien está mirando su barrio
   * de cerca, estirar la ventana no debería moverle la vista.
   */
  useEffect(() => {
    const nueva =
      lienzo.ancho > 0 && lienzo.alto > 0
        ? poseDeSalida({ ancho: lienzo.ancho, alto: lienzo.alto, franjaInferior: 0 })
        : CERCANIA_DE_SALIDA;
    laPoseDeSalida.current = nueva;
    if (eraAlPrincipio.current) cercania.current = nueva;
  }, [lienzo.ancho, lienzo.alto]);
  const volverAlBurgoEntero = useCallback((): void => {
    alAcercarse(laPoseDeSalida.current);
    /* Y el seguimiento se apaga hasta el turno siguiente: quien pide ver el burgo entero lo quiere quieto. */
    seguiaAntes.current = false;
    ponerSiguiendo(false);
  }, [alAcercarse]);

  // -------------------------------------------------------------------------
  // Las cribas: qué enseña la escena, qué la hoja, y qué queda como botón
  // -------------------------------------------------------------------------

  /*
   * ═══ CON MUNDO O SIN MUNDO, Y ES LO QUE DECIDE LAS CRIBAS ═══
   *
   * `opcionesFueraDelTablero` recibe LOS OBJETOS que se pintan y no interruptores: quita
   * TIRAR cuando hay asa de dados, quita una obra cuando su casilla está encendida en el
   * anillo, y quita lo que la hoja ya enseña. Y el reparto no es el mismo con mundo que sin
   * él, así que se le pasa lo que de verdad hay en pantalla:
   *
   *   · EL ANILLO Y LOS DADOS sólo existen con mundo. Pasárselos sin mirarlo —en Node,
   *     mientras el `.glb` viaja, o en un navegador sin WebGL— quitaría TIRAR y las obras de
   *     los botones sin que hubiera un dado ni una casilla que tocar: la partida parada y
   *     ningún error en ninguna consola.
   *   · LA HOJA se pinta cuando el CAJÓN ESTÁ ABIERTO, y sólo entonces. La regla de la casa
   *     es que la criba recibe los objetos QUE SE PINTAN y no interruptores, y una hoja
   *     dentro de un cajón cerrado no se pinta: pasarla igualmente deja «Empezar la partida»
   *     —la única opción de una mesa recién abierta— detrás de un «≡» que nadie tiene motivo
   *     para pulsar, o sea una partida que no puede empezar sin un error en ninguna consola.
   *     Con el cajón abierto los botones sueltos se van a sus secciones, que es donde se leen
   *     con su rótulo largo; al cerrarlo vuelven. Nunca están en los dos sitios a la vez.
   */
  const conMundo = typeof window !== 'undefined' && modelos !== null;
  const dados = useMemo((): DadosEnTres<Opcion> | null => dadosEnTres(vista, yo, opciones), [vista, yo, opciones]);
  const hoja = useMemo(() => hojaEnTres(vista, yo, opciones), [vista, yo, opciones]);
  const fuera = useMemo(
    () =>
      opcionesFueraDelTablero(
        opciones,
        conMundo ? datos : null,
        conMundo ? dados : null,
        cajonAbierto ? hoja : null,
      ),
    [opciones, conMundo, datos, dados, hoja, cajonAbierto],
  );

  /*
   * ═══ LA SEMILLA DEL DECORADO NO SE CALCULA AQUÍ: SE LE PASA EL CÓDIGO ═══
   *
   * El §6.2 dice `semillaDelCodigo(puesta.codigo)` y el contrato de la escena pide el CÓDIGO
   * (`PropsDelBurgo.codigo`), que es quien la siembra por dentro (`Burgo.tsx`, con la misma
   * función). Calcularla también aquí sería un segundo sitio del que sale el mismo entero, y
   * el día que uno de los dos cambiara de función el campo y las nubes saldrían distintos en
   * cada cliente sin que nada fallara. Se le da el código y ya está. Es el mismo entero que
   * la cala del Muelle, así que quien viene de zarpar ve el mismo mundo.
   */
  const aQuienSigue = useMemo(() => camaraSigueA(vista), [vista]);

  // -------------------------------------------------------------------------
  // Lo que se manda
  // -------------------------------------------------------------------------

  const alElegir = useCallback(
    (movimiento: MovimientoDeclarado) => {
      if (quieto) return;
      void mover(movimiento);
    },
    [mover, quieto],
  );

  /*
   * AL TOCAR UNA CASILLA. Con UNA obra se manda; con VARIAS se pregunta con el mismo menú
   * que ya sirve para leer una ficha, porque es la misma pregunta con otro título; con
   * NINGUNA se abre la ficha de lectura, que es lo que hace de mapa: nombre, barrio, precio,
   * la tabla de rentas con la fila de hoy y quién la tiene.
   *
   * Los rótulos de dentro los escribió el JUEGO. Aquí no se redacta ni una palabra sobre la
   * jugada, y el «¿qué haces aquí?» es chrome de la Sala: no nombra ninguna regla.
   */
  const alTocarCasilla = useCallback(
    (indice: number) => {
      const obras = obraPosibleEnCasilla(vista, yo, opciones, indice);
      const ficha = fichaDeCasilla(vista, indice, yo, opciones);
      if (obras.length === 1 && !quieto) {
        const sola = obras[0] as Opcion;
        void mover({ tipo: sola.tipo, carga: sola.carga });
        return;
      }
      ponerPreguntando({
        titulo: ficha.nombre,
        nota: ficha.lineas.join(' · '),
        opciones: obras as readonly Opcion[],
      });
    },
    [vista, yo, opciones, quieto, mover],
  );

  const alTocarFigura = useCallback(
    (asiento: string) => {
      const marcador = marcadorEnTres(vista, yo);
      const quien = marcador.jugadores.find((j) => j.asiento === asiento);
      if (quien === undefined) return;
      ponerPreguntando({ titulo: quien.nombre, nota: quien.linea, opciones: [] });
    },
    [vista, yo],
  );

  const alTocarLosDados = useCallback((): Promise<'hecho' | 'rechazado' | 'sin-red'> => {
    if (quieto) return Promise.resolve('rechazado');
    const tirar = tirarEnTres(opciones);
    if (tirar === null) return Promise.resolve('rechazado');
    return mover({ tipo: tirar.tipo, carga: tirar.carga });
  }, [quieto, opciones, mover]);

  // -------------------------------------------------------------------------
  // El reloj de la cinta
  // -------------------------------------------------------------------------

  /*
   * LA CUENTA ATRÁS DEL PLAZO, en la línea de estado y no sólo dentro del cajón. Es el plazo
   * de LA MESA —`venceEn` y `terminada`, que ya viajaban por el cable— y no del juego: el
   * Burgo no sabe nada de él. Late por CAMBIO DE RÓTULO y no una vez por segundo, que es lo
   * que `msHastaQueCambieElRotulo` decide.
   */
  const venceEn = puesta.terminada ? null : puesta.venceEn;
  /*
   * EL LATIDO ES TAMBIÉN LA DEPENDENCIA, y ésa es la mitad que se olvida: con un
   * `setTimeout` en vez de un `setInterval` hay que volver a programar la siguiente espera
   * DESPUÉS de cada repintado. Sin `latido` en la lista, el efecto se dispararía una sola vez
   * y el reloj se quedaría clavado en el primer tramo, que se ve como un reloj parado y no
   * como un fallo del temporizador.
   */
  const [latido, latir] = useState(0);
  useEffect(() => {
    if (venceEn === null) return undefined;
    const espera = msHastaQueCambieElRotulo(venceEn - Date.now());
    if (!Number.isFinite(espera)) return undefined;
    const t = setTimeout(() => {
      latir((n) => n + 1);
    }, espera);
    return () => {
      clearTimeout(t);
    };
  }, [venceEn, latido]);
  const elReloj =
    venceEn === null
      ? null
      : {
          corto: cuantoQuedaEnLaCinta(venceEn - Date.now()),
          entero: cuantoQueda(venceEn - Date.now()),
          aprieta: elPlazoAprieta(venceEn - Date.now()),
        };

  const anchoDelCajon = useMemo(
    () => ({ ancho: Math.min(lienzo.ancho, Math.round(ANCHO_DEL_CAJON_EN_RAICES * raizDeLaLetra)) }),
    [lienzo.ancho, raizDeLaLetra],
  );

  // -------------------------------------------------------------------------
  // Las salidas
  // -------------------------------------------------------------------------

  /*
   * SIN CARAS NO HAY ANILLO QUE PINTAR: sólo lo que se puede hacer. Es la mesa reunida, donde
   * lo único que ofrece el juego es «Empezar». Se pregunta al TABLERO DECLARADO y no a
   * `datos`: ver la cabecera, «sin caras» no es «sin mundo».
   */
  if (tablero.caras.length === 0) {
    return <Formulario opciones={opciones} alElegir={mover} quieto={quieto} titulo={TITULO_DE_LO_QUE_SE_HACE} />;
  }

  /*
   * EL RESPALDO. Si la mesa no cabe en los colores del anillo, si el modelo no llegó o si el
   * lienzo reventó, se pinta el retablo de siempre, entero, y se dice por qué en letra chica.
   * No es una pantalla de error: es la mesa jugable de siempre, y con el retablo del Burgo
   * —cuatro tiras de diez casillas que son MAPA— se juega por acciones y paneles.
   */
  const porQueElRetablo = !cabeEnTres
    ? 'Sois más de los que el burgo en tres dimensiones sabe pintar: se juega sobre el tablero dibujado.'
    : fallo !== null
      ? `El burgo en tres dimensiones no ha arrancado: ${fallo}. Se juega sobre el tablero dibujado.`
      : datos === null
        ? 'La mesa trae tablero pero no un burgo que pintar: se juega sobre el tablero dibujado.'
        : null;
  if (porQueElRetablo !== null || datos === null) {
    const sueltas = opcionesSueltas(tablero, opciones);
    return (
      <>
        <p className="letra-chica burgo-sin-mundo">{porQueElRetablo}</p>
        <Retablo tablero={tablero} alTocar={mover} quieto={quieto} />
        <AccionesDelTablero tablero={tablero} alTocar={mover} quieto={quieto} />
        {/* Lo que decide es lo PINTABLE y no lo que llega: ver `hayAlgoQuePintar`. */}
        {hayAlgoQuePintar(sueltas) ? (
          <Formulario opciones={sueltas} alElegir={mover} quieto={quieto} titulo="Y además puedes" atajos={false} />
        ) : null}
      </>
    );
  }

  return (
    <div className="burgo-en-tres">
      {/*
        ═══ EL RECUADRO, QUE ES DONDE ATERRIZA EL FOCO AL SENTARSE ═══

        Con la página de pie el `<h1>` de la mesa sale del flujo, así que el destino del
        efecto de `sala.tsx` se muda aquí. `tabIndex={-1}` no lo mete en el orden del
        tabulador: sólo lo hace capaz de recibir un foco que se le lleva. Y con `aria-label`,
        porque un `<div>` enfocado y sin nombre se anuncia como nada; el nombre lo pone el
        MANIFIESTO y no una cadena escrita aquí, para que el día que este pintor sirva a otro
        arcade no siga nombrando al Burgo.
      */}
      <div
        className={
          quieto
            ? `${RECUADRO_DEL_LIENZO} ${LIENZO_PROPIO} burgo-lienzo-quieto`
            : `${RECUADRO_DEL_LIENZO} ${LIENZO_PROPIO}`
        }
        ref={medirElRecuadro}
        tabIndex={-1}
        role="group"
        aria-label={`${manifiesto.nombre}: la mesa en tres dimensiones`}
      >
        {/*
          ═══ LA CINTA (§6.3, sección 1) ═══

          Salir, el reloj del plazo, el aviso del juego y mi dinero con mi color, en una tira
          sobre el lienzo y no en flujo por encima de él: así no le quita un punto de alto al
          anillo. Va FUERA de `conMundo` a propósito —mientras el modelo se descarga ya hay
          aviso que leer y ya hay hoja que abrir, y el telón tapa el tablero, no la partida—,
          y de paso esto se puede RENDERIZAR en Node, que es lo que permite que
          `verify:escritorio` la cuente contra una partida de verdad.
        */}
        <div className="burgo-cinta">
          {laSalida === undefined ? null : (
            <a className="burgo-cinta-salir" href={laSalida} aria-label={SALIR_DE_LA_MESA} title={SALIR_DE_LA_MESA}>
              <span aria-hidden="true">‹</span>
            </a>
          )}
          {/*
            EL RELOJ NO ES UNA SEGUNDA REGIÓN VIVA, que sería peor que no ponerlo: la frase de
            al lado ya es `aria-live="polite"`, y un reloj vivo a su lado anunciaría la cuenta
            atrás EN VOZ ALTA cada segundo del último minuto, encima del aviso del juego.
            `role="timer"` es exactamente esto: una región de tiempo que un lector encuentra y
            lee CUANDO QUIERE, y que no se anuncia sola.
          */}
          {elReloj === null ? null : (
            <span
              className={elReloj.aprieta ? 'burgo-cinta-reloj burgo-cinta-reloj-aprieta' : 'burgo-cinta-reloj'}
              role="timer"
              aria-label={elReloj.entero}
              title={elReloj.entero}
            >
              <span aria-hidden="true">{elReloj.corto}</span>
            </span>
          )}
          {/*
            LA FRASE, RECORTADA EN PANTALLA Y ENTERA EN EL ÁRBOL, y es LA ÚNICA región viva de
            esta pantalla: dos con el mismo texto se anuncian dos veces. Está SIEMPRE en el
            árbol, vacía cuando no hay nada que decir, porque una región viva que se monta a la
            vez que su texto no se anuncia en la mayoría de los lectores.
          */}
          <p className="burgo-cinta-frase" aria-live="polite" title={tablero.aviso}>
            {tablero.aviso}
          </p>
          {/*
            LA FICHA DE MI DINERO: mi color y mis maravedíes a la vista sin abrir nada, y la
            PUERTA del cajón. Para un mirón que no está sentado no hay color ni cifra, y
            entonces es «≡» a secas: no se inventa un cero que no es de nadie.
          */}
          <button
            type="button"
            ref={laFichaDeLaCinta}
            className="burgo-cinta-ficha"
            aria-expanded={cajonAbierto}
            aria-controls={nombreDelCajon}
            aria-label={
              hoja.cinta.miDinero.length === 0
                ? cajonAbierto
                  ? CERRAR_EL_CAJON
                  : ABRIR_EL_CAJON
                : `Tienes ${hoja.cinta.miDinero}. ${cajonAbierto ? CERRAR_EL_CAJON : ABRIR_EL_CAJON}`
            }
            onClick={() => {
              if (cajonAbierto) cerrarElCajon();
              else ponerCajonAbierto(true);
            }}
          >
            {hoja.cinta.miDinero.length === 0 ? (
              <span aria-hidden="true">≡</span>
            ) : (
              <>
                <span className="burgo-cinta-rail" style={{ background: hoja.cinta.miColor }} aria-hidden="true" />
                <span className="burgo-cinta-dinero" aria-hidden="true">
                  {hoja.cinta.miDinero}
                </span>
              </>
            )}
          </button>
        </div>

        {/*
          ═══ EL CAJÓN: LA HOJA ENTERA Y EL RAÍL, COLGANDO DE LA CINTA ═══

          Dentro van las seis secciones de la hoja que no están ya en pantalla —«Ahora», la
          carta, la almoneda con su puja libre, los tratos con su componedor, «Lo mío» con la
          ficha de cada título y la mesa entera— y el raíl que monta la Sala con el marcador,
          el código de la mesa, las dos salidas y la crónica.

          EL VELO ES LA MITAD QUE SE OLVIDA: sin él, un clic fuera del cajón llega al anillo,
          se cierra el cajón Y se toca una casilla donde estaba el dedo. Va `aria-hidden`
          porque para un lector el cajón ya es modal y un `<div>` sin texto en medio sólo sería
          ruido.
        */}
        {cajonAbierto ? (
          <>
            <div className={EL_VELO} onClick={cerrarElCajon} aria-hidden="true" />
            <div
              id={nombreDelCajon}
              ref={elCajon}
              className={EL_CAJON}
              role="dialog"
              aria-modal="true"
              aria-label={EL_CARRIL_DE_LA_MESA}
              tabIndex={-1}
              style={elEstiloDeLaCinta(anchoDelCajon)}
            >
              <LasHojasDelBurgo hoja={hoja} vista={vista} yo={yo} quieto={quieto} alElegir={alElegir} />
              {elRail}
            </div>
          </>
        ) : null}

        {conMundo ? (
          <>
            {/*
              TIRAR PARA QUIEN NO VE EL LIENZO. Donde hay dados el botón de tirar se ha ido de
              la lista del cajón, y un dado que sólo se puede tocar con el ratón sería el
              primer movimiento del juego inaccesible. Este botón sólo existe para las
              tecnologías de apoyo —fuera de la vista con `clip-path` y NUNCA con
              `display: none`, que los lectores saltan— y manda por la misma puerta que el asa.

              EXISTE MIENTRAS EXISTEN LOS DADOS, no sólo mientras se puede tirar: al pulsarlo
              `mover` pone `quieto`, y si el botón se desmontara con el foco dentro el foco
              caería al `body` y el lector perdería el sitio. Se apaga con `aria-disabled` y NO
              con `disabled`, que le quitaría el foco igual.
            */}
            {dados !== null ? (
              <button
                type="button"
                className="burgo-solo-apoyo"
                aria-disabled={!dados.porTirar || quieto}
                onClick={() => {
                  if (dados.porTirar && !quieto) void alTocarLosDados();
                }}
              >
                Tirar los dados
              </button>
            ) : null}
            {/* Y a quién se espera, que en el lienzo lo dice una marca de color y nada más. */}
            <p className="burgo-solo-apoyo">{esperaA(vista)}</p>
            <LimiteDelMundo alFallar={alFallarElLienzo}>
              <Canvas
                shadows={false}
                dpr={[1, 2]}
                gl={{ antialias: true }}
                camera={{ fov: FOV, near: 0.5, far: ALCANCE_DEL_BURGO * 8 }}
                onCreated={({ gl }) => {
                  gl.toneMapping = ACESFilmicToneMapping;
                  gl.toneMappingExposure = 1.05;
                }}
              >
                {/* La cámara ANTES que la escena: el seguimiento al que mueve corre después de ella. */}
                <CamaraAerea
                  alcance={ALCANCE_DEL_BURGO}
                  cercania={cercania}
                  alAcercarse={alAcercarse}
                  recuadro={RECUADRO_DEL_LIENZO}
                  seDesplazanSolas={SE_DESPLAZAN_SOLAS}
                  velo={EL_VELO}
                  mirador={MIRADOR_DEL_BURGO}
                  limites={LIMITES_DEL_BURGO}
                  alturaMinima={ALTURA_MINIMA_DEL_OJO_DEL_BURGO}
                  /* La escena trae su propia niebla de mediodía, fija: moverla con el ojo sería pisársela. */
                  niebla={null}
                />
                <Burgo
                  tablero={datos}
                  dados={dados}
                  sucesos={sucesos}
                  codigo={puesta.codigo}
                  ventana={{ ancho: lienzo.ancho, alto: lienzo.alto, franjaInferior: 0 }}
                  traer={traer}
                  calidad={calidad}
                  camara={{ modo: 'aerea' }}
                  seguirAlQueMueve={siguiendo && aQuienSigue !== null}
                  quieto={quieto}
                  alTocarCasilla={alTocarCasilla}
                  alTocarLosDados={alTocarLosDados}
                  alTocarFigura={alTocarFigura}
                  alFallar={alFallarElLienzo}
                  alMedir={alMedir}
                />
              </Canvas>
            </LimiteDelMundo>
            {/*
              LA SALIDA, y sólo cuando hace falta. Está FUERA del `Canvas`: es un botón de la
              Sala con su foco y su filo, no un objeto del mundo. Y no le roba el gesto a la
              cámara sin tener que pedirlo: la cámara sólo atiende lo que empieza sobre el
              propio `<canvas>`.
            */}
            {alPrincipio ? null : (
              <button type="button" className="burgo-volver" onClick={volverAlBurgoEntero}>
                {VOLVER_AL_BURGO_ENTERO}
              </button>
            )}
          </>
        ) : (
          /* El telón: `--suelo` con el nombre del juego hasta que el modelo llega. */
          <div className="burgo-telon" aria-busy="true">
            <p className="burgo-nombre">{manifiesto.nombre}</p>
            <p className="letra-chica">Se abren las puertas.</p>
          </div>
        )}

        {/*
          ═══ LA FICHA Y EL «¿QUÉ HACES AQUÍ?», MODALES Y DENTRO DEL RECUADRO ═══

          En flujo por debajo del lienzo no hay sitio: con la página de pie el recuadro vale la
          ventana entera menos nada, así que «debajo» está fuera de la pantalla. Es la misma
          caja que la Sala ya sabe pintar —velo, `role="dialog"` con nombre, trampa de foco
          escrita UNA vez y `Escape`—, con los rótulos que redactó el juego.
        */}
        {preguntando === null ? null : (
          <ElijeUna
            titulo={preguntando.titulo}
            nota={preguntando.nota}
            opciones={preguntando.opciones}
            quieto={quieto}
            velo={EL_VELO}
            menu={EL_MENU}
            alElegir={(o) => {
              cerrarLaPregunta();
              alElegir({ tipo: o.tipo, carga: o.carga });
            }}
            alDejarlo={cerrarLaPregunta}
          />
        )}
      </div>
      {/*
        ═══ LOS BOTONES SUELTOS VAN EN FLUJO, DEBAJO DEL LIENZO, Y NO DENTRO DEL CAJÓN ═══

        El §6.2 los dibuja dentro del cajón. No caben ahí, y el caso que lo demuestra es el
        primero de todos: mientras la mesa se REÚNE, la única opción del juego es «Empezar la
        partida» —el Burgo declara sus cuarenta casillas desde el primer momento, así que el
        anillo se pinta ya y no hay formulario suelto que lo sustituya—, y metida en un cajón
        que nace cerrado eso deja la partida detrás de un «≡» que nadie tiene motivo para
        pulsar. Riberas no tiene ese problema porque pinta las suyas DOS veces: en el carril
        de la cinta, siempre a la vista, y otra vez en el cajón con su rótulo largo.

        Aquí no hace falta un segundo carril: `opcionesFueraDelTablero` deja fuera muy poco
        —«Pasar el turno», «Declararse en quiebra», «Empezar»; las obras las enseña la casilla
        y todo lo demás la hoja—, así que caben en flujo donde la mesa genérica ya los pone. El
        recuadro es `flex: 1 1 auto` con suelo en la mitad del mueble, o sea que encoge lo que
        haga falta y no se sale nada de la pantalla; con los dieciocho destinos de un siete de
        Riberas esto no valdría, y por eso allí hay carril y aquí no.

        Cada opción sigue saliendo EXACTAMENTE UNA VEZ: la lista es lo que `fuera` deja, y
        `fuera` se compone DESPUÉS de la escena y de la hoja, con los objetos que se pintan y
        no con interruptores.

        Con atajos: es la única lista de esta pantalla que los escucha, así que las teclas 1-9
        no se las disputa nadie.
      */}
      {hayAlgoQuePintar(fuera) ? (
        <Formulario opciones={fuera} alElegir={mover} quieto={quieto} titulo={TITULO_DE_LO_QUE_SE_HACE} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// El marcador, en el raíl
// ---------------------------------------------------------------------------

/**
 * EL MARCADOR DEL BURGO, en el raíl y por tanto también dentro del cajón.
 *
 * Se decide por QUIÉN es y no por si hay tablero en tres dimensiones: el marcador se mira
 * igual cuando la mesa cae al retablo, y ahí es donde más falta hace, porque el respaldo no
 * dice de nadie cuánto dinero lleva. Devuelve `null` si la vista no es del Burgo.
 *
 * Lo que añade sobre el renglón de texto que ya redacta `shared/` es lo que un renglón no
 * puede: el color de cada jugador, quién eres tú, y el marco del acento en el dueño del
 * turno con un punto en quien tiene que contestar —el pujador, el que está en apuro—, que
 * son dos cosas distintas y en el Burgo se separan a menudo (decisión 4).
 *
 * Va con `aria-hidden` en las cajas de arriba y la frase entera en la lista de apoyo, y no
 * al revés, para que no se oiga dos veces lo mismo.
 */
export function MarcadorDelBurgo({ vista, yo }: { vista: unknown; yo: string | null }): JSX.Element | null {
  const marcador = marcadorEnTres(vista, yo);
  if (marcador.jugadores.length === 0) return null;
  return (
    <section className="panel burgo-marcador">
      <h2 className="rotulo-de-panel">El marcador</h2>
      <ul className="renglones" role="list">
        {marcador.jugadores.map((j) => (
          <li
            key={j.asiento}
            className={[
              'burgo-del-marcador',
              j.soyYo ? 'soy-yo' : '',
              j.esSuTurno ? 'burgo-le-toca' : '',
              j.quebrado ? 'burgo-quebrado' : '',
            ]
              .filter((c) => c.length > 0)
              .join(' ')}
          >
            <span className="mota-de-color" style={{ background: j.color }} aria-hidden="true" />
            <span className="burgo-ficha-del-jugador" aria-hidden="true">
              <span className="burgo-nombre-del-jugador">
                {j.nombre}
                {j.soyYo ? ' (tú)' : ''}
                {j.seLeEspera && !j.esSuTurno ? ' ·' : ''}
              </span>
              <span className="letra-chica burgo-lo-del-jugador">
                {`${String(j.titulos)} ${j.titulos === 1 ? 'título' : 'títulos'}${j.presa ? ' · en la Mazmorra' : ''}${
                  j.indultos > 0 ? ` · ${String(j.indultos)} ${j.indultos === 1 ? 'Indulto' : 'Indultos'}` : ''
                }`}
              </span>
            </span>
            <span className="burgo-dinero-del-jugador" aria-hidden="true">
              {maravedies(j.mrs)}
            </span>
            <span className="burgo-solo-apoyo">{j.linea}</span>
          </li>
        ))}
      </ul>
      {/*
        LO QUE LE QUEDA AL CONCEJO, que es información pública del juego y parte de lo que se
        juega: una mesa que sabe que quedan dos posadas sabe que no puede alzar la tercera.
      */}
      <p className="letra-chica burgo-lo-del-concejo">
        {`El Concejo guarda ${String(marcador.concejo.casas)} casas y ${String(marcador.concejo.posadas)} posadas. ` +
          `Quedan ${String(marcador.quedan.pregon)} cartas en el Pregón y ${String(marcador.quedan.arca)} en el Arca del Concejo.`}
      </p>
    </section>
  );
}
