/**
 * LO QUE TODO PINTOR PROPIO DE ESTE CLIENTE NECESITA, ESCRITO UNA VEZ Y SIN SABER
 * A QUÉ SE JUEGA: traer un `.glb`, no caerse si el `Canvas` revienta, mover la
 * cámara aérea con la rueda y con dos dedos, encerrar el foco dentro de una caja
 * modal y preguntar «elige una».
 *
 * ═══ QUÉ ES ESTO Y DE DÓNDE SALE ═══
 *
 * Todo lo de aquí vivía PRIVADO dentro de `riberas-en-tres.tsx`, que fue el primer
 * pintor propio del escritorio. Cuando llegó el segundo —el Burgo— se COPIÓ aquí en vez
 * de mudarse, y la razón no fue pereza: `verificar-escritorio.tsx` ataba a Riberas por
 * REGEX LITERALES sobre su fuente, y mover una función de fichero ponía rojas
 * comprobaciones que no hablaban de aquel trabajo. Durante dos pintores hubo DOS
 * copias de cada pieza, y ya se habían separado: la cámara de Riberas sabía callarse
 * a pie y la de aquí no; el menú de aquí admitía una tarjeta dentro y el de allí no.
 *
 * YA NO HAY COPIAS. Riberas monta estas piezas como el Burgo: lo que su copia tenía de
 * mejor pasó aquí para todos (`callada`, en la cámara), y lo que era suyo es un
 * parámetro (el recuadro, las cajas que ruedan y el velo, en la cámara; la clase de la
 * nota, en el menú). Las reglas de `verificar-escritorio.tsx` que leían la cámara, la
 * trampa y el menú DENTRO de Riberas leen ahora la pieza de aquí Y que Riberas la
 * monta: una copia que vuelva a nacer allí las pone rojas a todas a la vez.
 *
 * ═══ Y LA DEPENDENCIA VA DE LOS PINTORES A ESTO, NUNCA AL REVÉS ═══
 *
 * Este fichero no importa de ningún pintor. Lo que el Burgo y esto sacaban de Riberas
 * —la pila de trampas de foco, la raíz de la letra, el ancho de la cinta— vive aquí, y
 * de `riberas-en-tres.tsx` sólo importa quien monta su pantalla (`pintores.ts`). Al
 * revés, cualquier pintor que tocara esta pieza cargaba Riberas entero —Las Lindes, que
 * sólo quiere `LimiteDelMundo`, lo cargaba ya—, y un pintor nuevo empezaba dependiendo
 * de otro juego para abrir una caja modal.
 *
 * LA PILA DE TRAMPAS DE FOCO es la única pieza que además NO se puede duplicar: es
 * quien decide qué caja modal se queda el `Escape`. Dos pilas serían dos cajas
 * creyéndose las de encima, y `Escape` cerraría las dos de un golpe. Vive aquí, en un
 * array de módulo, y `verify:escritorio` compra que no hay otra en `escritorio/src/`.
 *
 * ═══ AQUÍ NO HAY NINGUNA REGLA DE NINGÚN JUEGO ═══
 *
 * Ni una palabra de un reglamento, ni un identificador de arcade, ni una decisión
 * sobre qué se puede hacer. Lo que entra son medidas de pantalla y funciones puras
 * de `escenas/`; lo que sale son componentes que no saben qué están enseñando. Un
 * `if` sobre el nombre de un juego en este fichero sería el principio de un tercer
 * sitio donde se decide qué se pinta.
 *
 * ═══ Y LA ARITMÉTICA DE LA CÁMARA SIGUE EN `escenas/acercar.ts` ═══
 *
 * `CamaraAerea` escucha el ratón y coloca el ojo; las cuentas —los topes de cerca y
 * de lejos, hasta dónde se aparta la mirada, la altura mínima del ojo— son de
 * `acercar.ts` y `camara.ts`, que se pueden medir desde Node y que `verify:escena`
 * mide. Lo único que este fichero calcula son las unidades de la rueda, que no son
 * pasos y que cada navegador cuenta a su manera.
 */
import { Component, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Fog, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Cercania, LimitesDeCercania } from '../../escenas/acercar';
import {
  acercando,
  arrastrandoLaMirada,
  LIMITES_DE_SALIDA,
  ojoYMira,
  pellizcando,
} from '../../escenas/acercar';
import type { Mirador } from '../../escenas/camara';
import {
  esDeLaInterfaz,
  MINIMO_PARA_GIRAR,
  MIRADOR_DE_SALIDA,
  ojoDelMirador,
  tirandoDelMirador,
} from '../../escenas/camara';
import { catalogoDeModelos } from '../../escenas/modelos';
import type { CatalogoDeModelos } from '../../escenas/modelos';
import type { Opcion } from '../../shared/arcade';
import { loQueSeDiceDeUnFallo } from './red-de-seguridad';

// ---------------------------------------------------------------------------
// La raíz de la letra, medida y no supuesta
// ---------------------------------------------------------------------------

/**
 * ═══ LA RAÍZ DE ESTA CASA VALE 17 PUNTOS, Y ESE DATO YA SE ESCRIBIÓ MAL UNA VEZ ═══
 *
 * `estilo.css` abre con `html { font-size: 106.25%; }` y su propia cabecera dice por qué:
 * «los 17 px de siempre cuando el navegador viene con sus 16», y va en porcentaje para no
 * anular la preferencia de tamaño de letra del navegador. El diseño del cartel de los naipes
 * (`docs/LAS-CARTAS-SE-EXPLICAN.md`) escribió «0,82 rem sobre 16, o sea 13 puntos» y sobre
 * esos 13 levantó sus dos tablas de letra: con el rem malo salían 27 letras por renglón donde
 * hay 25 y renglones de 18 donde son de 19, o sea que el sitio quedaba SOBRESTIMADO por los
 * dos lados y una frase de tres renglones pasaba por una de dos.
 *
 * Se escribe aquí, una vez, y de aquí sale en los dos pintores todo lo que se mide en letras.
 * Si alguien toca la raíz de la hoja sin tocar esto, `verify:escritorio` lo dice: afirma que
 * las dos cifras coinciden.
 */
export const RAIZ_DE_LA_CASA = 17;

/**
 * LOS 17 PUNTOS DE LA CASA SON EL SUELO, NO LA MEDIDA: la de verdad se le pide al
 * navegador.
 *
 * `estilo.css` abre con `html { font-size: 106.25%; }` en PORCENTAJE justamente para
 * que la preferencia de tamaño de letra del navegador siga mandando. Quien la tenga
 * en «muy grande» pinta con una letra bastante mayor que 13,94 puntos, y cualquier
 * alto máximo calculado sobre un 17 clavado recortaría el último renglón SIN NINGUNA
 * SEÑAL. En Node —donde no hay `document` y donde miden los comprobadores— vale el 17.
 */
export function raizDelNavegador(): number {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return RAIZ_DE_LA_CASA;
  const medida = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(medida) && medida > 0 ? medida : RAIZ_DE_LA_CASA;
}

// ---------------------------------------------------------------------------
// Los modelos: una promesa por fichero y por pestaña
// ---------------------------------------------------------------------------

/**
 * UNA PROMESA POR FICHERO Y POR PESTAÑA, que se suelta si falla para que el
 * siguiente montaje lo intente otra vez.
 *
 * Cada revisión de la mesa repinta el pintor; volver a pedir el modelo —o volver a
 * parsearlo— en cada montaje sería un telón por jugada. Va por FICHERO y no una para
 * todos porque los ficheros fallan por separado: un tablero que llegó no se vuelve a
 * bajar porque los dados no llegaran.
 */
export function recordada<T>(traer: () => Promise<T>): () => Promise<T> {
  let enCamino: Promise<T> | null = null;
  return () => {
    if (enCamino !== null) return enCamino;
    const promesa = traer();
    enCamino = promesa;
    promesa.catch(() => {
      if (enCamino === promesa) enCamino = null;
    });
    return promesa;
  };
}

/**
 * Trae y parsea un `.glb` y devuelve su catálogo.
 *
 * `GLTFLoader.parseAsync` sobre los bytes de un `fetch` relativo, y no `.load(url)`:
 * así el error de red se lee como lo que es —«contestó 404»— y no como un
 * `ProgressEvent` sin texto, que es lo que devuelve el cargador cuando la petición
 * falla.
 */
export async function traerUnGlb(ruta: string): Promise<CatalogoDeModelos> {
  const r = await fetch(ruta);
  if (!r.ok) throw new Error(`${ruta} contestó ${String(r.status)}`);
  const bytes = await r.arrayBuffer();
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  return catalogoDeModelos(gltf.scene);
}

/**
 * EL CATÁLOGO DESDE UN COMPONENTE: `null` mientras llega, y el motivo si no llegó.
 *
 * Se llama `usarLosModelos` y no `usarElCatalogo` porque ese nombre ya es de
 * `catalogo.tsx`, que es el catálogo de ARCADES de la Sala: dos cosas distintas con
 * el mismo nombre en el mismo cliente es una llamada mal importada esperando a pasar.
 *
 * `cancelado` porque si la mesa se desmonta mientras el fichero viaja, escribir el
 * estado después es un aviso de React y una referencia viva a una escena que ya no se
 * dibuja. Y sólo se pide cuando HACE FALTA: en Node no corren los efectos, y con una
 * mesa que va a caer al respaldo descargar tres megas para no montar el lienzo sería
 * tirarlos. El gancho se llama siempre (reglas de los ganchos); lo que se condiciona
 * es la petición.
 */
export function usarLosModelos(
  hazFalta: boolean,
  traer: () => Promise<CatalogoDeModelos>,
): { modelos: CatalogoDeModelos | null; fallo: string | null } {
  const [modelos, ponerModelos] = useState<CatalogoDeModelos | null>(null);
  const [fallo, ponerFallo] = useState<string | null>(null);

  useEffect(() => {
    if (!hazFalta) return undefined;
    let cancelado = false;
    traer().then(
      (catalogo) => {
        if (!cancelado) ponerModelos(catalogo);
      },
      (error: unknown) => {
        if (!cancelado) ponerFallo(loQueSeDiceDeUnFallo(error));
      },
    );
    return () => {
      cancelado = true;
    };
  }, [hazFalta, traer]);

  return { modelos, fallo };
}

// ---------------------------------------------------------------------------
// El límite del mundo
// ---------------------------------------------------------------------------

/**
 * Si el `Canvas` revienta al nacer, aquí se para y se avisa. No pinta nada porque lo
 * que hay que pintar en su lugar lo decide quien la monta: en esta casa, el respaldo
 * de siempre con una línea en letra chica de por qué.
 */
export class LimiteDelMundo extends Component<
  { alFallar: (motivo: string) => void; children: ReactNode },
  { roto: boolean }
> {
  public override state = { roto: false };

  public static getDerivedStateFromError(): { roto: boolean } {
    return { roto: true };
  }

  public override componentDidCatch(error: unknown): void {
    this.props.alFallar(loQueSeDiceDeUnFallo(error));
  }

  public override render(): ReactNode {
    return this.state.roto ? null : this.props.children;
  }
}

// ---------------------------------------------------------------------------
// La rueda, que no viene en pasos
// ---------------------------------------------------------------------------

/**
 * DE LAS UNIDADES DE LA RUEDA A LOS PASOS DE `acercar.ts`.
 *
 * `acercando` cuenta en PASOS —lo que vale un paso lo decide `PASO_DE_ACERCAMIENTO`,
 * no esto—, mientras que el navegador manda un `deltaY` que no es ninguna unidad: un
 * ratón de muesca suelta cien píxeles de golpe, un panel táctil suelta cuatro sesenta
 * veces por segundo, y un Firefox con la rueda en modo línea manda TRES LÍNEAS. Sin
 * traducir los tres modos a lo mismo, el mismo gesto acerca un dedo en un aparato y
 * cruza el tablero entero en otro, y eso no se ve como un fallo de conversión sino
 * como un zoom roto.
 *
 * El modo línea se cuenta EN LÍNEAS y no pasando por píxeles: tres líneas son una
 * muesca. Convertidas a dieciséis píxeles cada una daban media muesca, o sea que en
 * Firefox el zoom iba a la mitad de velocidad y eso nadie lo mide: se nota como que
 * «en Firefox cuesta más acercarse».
 *
 * El tope de golpe es por el panel táctil con inercia: un gesto de dos dedos manda una
 * ráfaga larguísima, y sin tope un solo empujón salta del aire al suelo.
 */
const PIXELES_POR_MUESCA = 100;
const LINEAS_POR_MUESCA = 3;
const MUESCAS_POR_PAGINA = 4;
const MUESCAS_DE_GOLPE = 4;

export function pasosDeLaRueda(e: WheelEvent): number {
  const muescas =
    e.deltaMode === 1
      ? e.deltaY / LINEAS_POR_MUESCA
      : e.deltaMode === 2
        ? e.deltaY * MUESCAS_POR_PAGINA
        : e.deltaY / PIXELES_POR_MUESCA;
  /* Rueda hacia arriba, más cerca: es lo que hace cualquier mapa, y de ahí el signo. */
  return -Math.min(MUESCAS_DE_GOLPE, Math.max(-MUESCAS_DE_GOLPE, muescas));
}

// ---------------------------------------------------------------------------
// La cámara aérea
// ---------------------------------------------------------------------------

/**
 * LA NIEBLA, MEDIDA DESDE EL OJO, para quien la quiera. Un mundo cuya niebla está
 * clavada al centro se blanquea entero en cuanto el ojo se retira para que quepa en
 * un lienzo estrecho. Quien monte una escena que ya lleva su propia niebla fija pasa
 * `niebla={null}` y esto no toca nada.
 */
export const NIEBLA_DE_SIEMPRE = { empiezaA: 0.85, terminaA: 5.7 };

/**
 * UN SOLO `Vector3` PARA TODA LA PESTAÑA. La niebla se mide sesenta veces por segundo
 * y pedir memoria sesenta veces por segundo para tres números es lo que llena el
 * recolector de basura de fantasmas y deja un tirón cada pocos segundos.
 */
const PUNTO_DE_MIRA = new Vector3();

export interface LoQueVeLaCamara {
  /** El radio del mundo: de él salen la distancia del ojo y el tope de la mirada. */
  alcance: number;
  /**
   * DÓNDE SE ESTÁ MIRANDO, EN UNA `ref` Y NO EN EL ESTADO. Mover la mirada son sesenta
   * cambios por segundo mientras se arrastra, y pasarlos por React repintaría el mueble
   * entero sesenta veces por segundo para mover una cámara. Se LEE aquí; escribirla es
   * cosa de `alAcercarse`, que además enciende y apaga el botón de volver.
   */
  cercania: RefObject<Cercania>;
  alAcercarse: (nueva: Cercania) => void;
  /**
   * LA CLASE DEL RECUADRO, Y NO ES EL LIENZO. Es la caja que lleva dentro el `<canvas>`
   * Y los botones de encima, y es de ella —no del `<canvas>`— de quien cuelga el oyente
   * de la rueda: con el oyente en el lienzo, girar la rueda encima del botón de volver
   * —que es justo donde está el ratón en cuanto ese botón aparece— no pasa por ningún
   * `preventDefault` y la Sala se desplaza sola precisamente al intentar salir del
   * acercamiento. Se busca con `closest`, así que tiene que ser la misma clase que pinta
   * el JSX.
   */
  recuadro: string;
  /**
   * LAS CAJAS QUE SE DESPLAZAN POR DENTRO: la rueda es suya y no de la cámara.
   *
   * El oyente llama a `preventDefault` SIEMPRE, que es lo que impide que la Sala se
   * desplace mientras uno cree estar acercándose; sobre una caja que rueda por dentro
   * —un cajón, un carril, un menú— ese `preventDefault` se la comía: la rueda acercaba
   * el mundo DETRÁS de la caja y la caja no se movía un renglón. Nombradas aquí, la
   * rueda no hace nada de nada sobre ellas y el navegador las desplaza como desplaza
   * cualquier caja.
   */
  seDesplazanSolas: readonly string[];
  /**
   * EL VELO DE LO MODAL: encima de él se llama a `preventDefault` y SE PARA AHÍ. Con una
   * caja modal abierta no se toca lo de debajo, y «lo de debajo» incluye la cámara.
   */
  velo: string;
  /** El mirador de partida. El de siempre si no se dice otro. */
  mirador?: Mirador;
  /** Los topes de cerca y de lejos. Los de siempre si no se dicen otros. */
  limites?: LimitesDeCercania;
  /** Hasta dónde baja el ojo. El de `ojoYMira` si no se dice otro. */
  alturaMinima?: number;
  /** La niebla que sigue al ojo, o `null` para no tocar la de la escena. */
  niebla?: { empiezaA: number; terminaA: number } | null;
  /**
   * CALLADA: ni gira, ni pasea la mirada, ni acerca, ni pone la cámara ni la niebla, porque
   * la vista es de otro —a pie, del paseo de la escena—; lo que SÍ sigue haciendo es
   * defender la página (la rueda sobre el recuadro no la desplaza, y el clic derecho no abre
   * el menú del navegador): eso no es de la cámara. Se queda MONTADA y no se desmonta, y las dos
   * cosas importan: su mirador vive aquí dentro, así que al volver a la mesa se sigue
   * mirando desde donde se dejó; y desmontada y vuelta a montar se suscribiría a
   * `useFrame` DETRÁS de la escena y le pisaría la cámara en cada fotograma (por qué ese
   * orden importa lo cuenta la cabecera de `burgo-en-tres.tsx`). Sin callarla, cada
   * fotograma subiría la cámara al aire por encima de la que acaba de poner el paseo, y
   * arrastrar a pie giraría una mesa que no se ve.
   *
   * Nació en la copia que Riberas llevaba de este componente, con el nombre de `aPie`, y
   * es justo lo que pasa con las copias: la mejora se quedó en una. Aquí vale para todos
   * —Riberas y el Burgo la montan con `callada={aPie}`—; `false` si no se dice.
   */
  callada?: boolean;
}

/**
 * EL MIRADOR AÉREO DE ESTE CLIENTE: gira con el arrastre izquierdo, acerca con la
 * rueda y con el pellizco, y pasea la mirada con el botón derecho o con el punto medio
 * de dos dedos.
 *
 * El reparto de los botones, que es lo que hay que saber para usarlo:
 *
 *   · LA RUEDA acerca y aleja, colgada del RECUADRO y con `passive: false`, porque hay
 *     que llamar a `preventDefault`: sin eso el navegador se lleva el gesto para
 *     desplazar la página y la Sala entera baja mientras uno cree estar haciendo zoom.
 *   · EL ARRASTRE IZQUIERDO gira. Es el gesto que la escena necesita libre —coger una
 *     pieza, tocar una casilla y tirar los dados son todos clic izquierdo—, y
 *     `esDeLaInterfaz` es lo que decide de quién es cada pulsación.
 *   · EL ARRASTRE CON EL BOTÓN DERECHO —o con MAYÚSCULAS, para quien no lo tenga a
 *     mano— mueve la mirada. Se elige el derecho porque la escena no lo usa para nada.
 *     Y lleva su `contextmenu` con `preventDefault`, o al primer arrastre se abre el
 *     menú del navegador encima del tablero.
 *   · DOS DEDOS pellizcan y pasean con su punto medio. En esta casa ningún juego es
 *     sólo para PC, y con el dedo no hay rueda, ni botón derecho, ni Mayúsculas.
 *
 * UN GESTO CADA VEZ, Y QUIEN LO EMPIEZA SE LO QUEDA: los punteros apoyados se cuentan.
 * Apretar el izquierdo en mitad de un desplazamiento con el derecho cambiaba el gesto a
 * media carrera y el tablero pegaba un bandazo sin que nadie hubiera soltado nada. Y la
 * cuenta es también lo que distingue dos dedos de dos botones: el ratón manda siempre EL
 * MISMO `pointerId` apriete lo que apriete, así que no llega a dos.
 *
 * Sólo cuentan los gestos que empiezan SOBRE ESTE lienzo —`e.target === lienzo`—, así que
 * arrastrar por el raíl o por un formulario no mueve nada. Y la proporción del lienzo entra
 * en CADA FOTOGRAMA y no una vez: el raíl baja o sube al cruzar los 900 px, la ventana se
 * estira, la tableta se gira, y el `<canvas>` cambia de forma sin que se remonte nada. Leer
 * `clientWidth` por fotograma cuesta menos que un observador de tamaño y no se queda nunca
 * atrás.
 */
export function CamaraAerea({
  alcance,
  cercania,
  alAcercarse,
  recuadro,
  seDesplazanSolas,
  velo,
  mirador: miradorDeSalida = MIRADOR_DE_SALIDA,
  limites = LIMITES_DE_SALIDA,
  alturaMinima,
  niebla = NIEBLA_DE_SIEMPRE,
  callada = false,
}: LoQueVeLaCamara): null {
  const { camera, gl, scene } = useThree();
  const mirador = useRef<Mirador>(miradorDeSalida);

  useEffect(() => {
    const lienzo = gl.domElement;
    /* Si un día el recuadro no estuviera, se cae al lienzo: peor, pero no roto. */
    const caja: HTMLElement = lienzo.closest<HTMLElement>(`.${recuadro}`) ?? lienzo;

    /*
     * ═══ LAS DOS DEFENSAS DE LA PÁGINA, CALLADA O NO ═══
     *
     * La rueda sobre el recuadro y el menú del botón secundario sobre el lienzo no son de la
     * cámara: son de la PÁGINA. A pie, sin ellas, la rueda o el panel táctil desplazarían la Sala
     * —o, según el navegador, el barrido lateral volvería «atrás»— y un clic derecho abriría el
     * menú del navegador encima del mundo. Así que se ponen siempre, y `callada` sólo apaga lo que
     * MUEVE la cámara: callada, la rueda se sigue parando y no acerca nada. Antes `callada` lo
     * apagaba todo, y en Riberas a pie pasaban las dos cosas.
     */
    const rueda = (e: WheelEvent): void => {
      const donde = e.target instanceof Element ? e.target : null;
      if (seDesplazanSolas.some((clase) => donde?.closest(`.${clase}`) != null)) return;
      e.preventDefault();
      /*
       * EL VELO GENÉRICO SE PARA SIEMPRE, SIN QUE EL PINTOR TENGA QUE DECIRLO, y eso arregla
       * el único cabo que quedaba suelto de la decisión de publicar `RUEDAN_SOLAS`.
       *
       * Las cajas que ruedan por dentro viajan en una LISTA y por eso el pintor puede pasar
       * las suyas y las de las piezas juntas; el velo viaja en `velo`, que es UNA sola cadena.
       * Un pintor que ya tenga velo propio —el Burgo pasa `burgo-velo`, por su `ElijeUna`— y
       * monte además una `CajaEnElLienzo`, que trae el suyo puesto, no tiene dónde nombrar el
       * segundo: la rueda sobre el velo genérico caería en `preventDefault` y acercaría el
       * mundo DE DETRÁS de una caja modal abierta, que es el mismo fallo silencioso de la
       * crónica y el carril por el otro lado. Como la clase es de la pieza, la pieza la
       * defiende: se mira siempre, además de la que diga el pintor.
       */
      if (donde?.closest(`.${velo}`) != null || donde?.closest(`.${VELO_DEL_LIENZO}`) != null) return;
      if (callada) return;
      alAcercarse(acercando(cercania.current, pasosDeLaRueda(e), limites));
    };
    /* Sin esto, el primer arrastre con el botón derecho abre el menú del navegador encima del mundo. */
    const menuDelSistema = (e: MouseEvent): void => {
      e.preventDefault();
    };
    caja.addEventListener('wheel', rueda, { passive: false });
    lienzo.addEventListener('contextmenu', menuDelSistema);
    const quitarLasDefensas = (): void => {
      caja.removeEventListener('wheel', rueda);
      lienzo.removeEventListener('contextmenu', menuDelSistema);
    };
    /* Callada, nada más: ni gira, ni pasea la mirada, ni pellizca. */
    if (callada) return quitarLasDefensas;

    let desde: { x: number; y: number } | null = null;
    let gira = false;
    /* De quién es ESTE arrastre: del rumbo (izquierdo) o de la mirada (derecho o Mayúsculas). */
    let mueveLaMirada = false;
    const apoyados = new Map<number, { x: number; y: number }>();
    /* El pellizco en curso: con qué acercamiento y con qué separación empezó, y dónde va su centro. */
    let pellizco: { alEmpezar: number; separacion: number; centro: { x: number; y: number } } | null = null;

    const pantalla = (): { ancho: number; alto: number } => ({
      ancho: lienzo.clientWidth,
      alto: lienzo.clientHeight,
    });

    const dosDedos = (): { separacion: number; centro: { x: number; y: number } } | null => {
      const [a, b] = [...apoyados.values()];
      if (a === undefined || b === undefined) return null;
      return {
        separacion: Math.hypot(a.x - b.x, a.y - b.y),
        centro: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    };

    const baja = (e: PointerEvent): void => {
      if (e.target !== lienzo) return;
      if (esDeLaInterfaz(e)) return;
      apoyados.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const dos = dosDedos();
      if (apoyados.size >= 2 && dos !== null) {
        /*
         * Se guardan el acercamiento y la separación DE PARTIDA, y `pellizcando` trabaja
         * con la razón entre la de ahora y aquélla: separar los dedos y volver a juntarlos
         * deja el tablero exactamente donde estaba. El suelo de un píxel es para dos dedos
         * en el mismo punto, donde la razón sería infinita.
         */
        pellizco = {
          alEmpezar: cercania.current.factor,
          separacion: Math.max(1, dos.separacion),
          centro: dos.centro,
        };
        desde = null;
        gira = false;
        mueveLaMirada = false;
        return;
      }

      /* Quien empezó el arrastre se lo queda hasta que se sueltan TODOS los botones. */
      if (desde !== null) return;

      desde = { x: e.clientX, y: e.clientY };
      gira = false;
      /*
       * Se decide AL EMPEZAR: soltar la tecla a mitad de gesto cambiaría de girar a
       * desplazar sin que nadie lo haya pedido, y el tablero pegaría un bandazo.
       */
      mueveLaMirada = e.button === 2 || e.shiftKey;
    };
    const mueve = (e: PointerEvent): void => {
      if (apoyados.has(e.pointerId)) apoyados.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pellizco !== null) {
        const dos = dosDedos();
        if (dos === null) return;
        /*
         * Primero el paseo del punto medio —por el mismo camino que el botón derecho— y
         * encima el acercamiento, que conserva ese centro porque `pellizcando` sólo toca
         * el factor.
         */
        const paseada = arrastrandoLaMirada(
          cercania.current,
          dos.centro.x - pellizco.centro.x,
          dos.centro.y - pellizco.centro.y,
          mirador.current.rumbo,
          alcance,
          pantalla(),
        );
        pellizco.centro = dos.centro;
        alAcercarse(pellizcando(paseada, pellizco.alEmpezar, dos.separacion / pellizco.separacion, limites));
        return;
      }
      if (desde === null) return;
      if (!gira) {
        if (Math.hypot(e.clientX - desde.x, e.clientY - desde.y) < MINIMO_PARA_GIRAR) return;
        gira = true;
      }
      const dx = e.clientX - desde.x;
      const dy = e.clientY - desde.y;
      if (mueveLaMirada) {
        /*
         * El rumbo entra porque la mirada se mueve en los ejes de QUIEN MIRA y no en los
         * del mundo: con el tablero girado, arrastrar a un lado movería el mapa en
         * diagonal. Lo cuenta `arrastrandoLaMirada`.
         */
        alAcercarse(arrastrandoLaMirada(cercania.current, dx, dy, mirador.current.rumbo, alcance, pantalla()));
      } else {
        mirador.current = tirandoDelMirador(mirador.current, dx, dy, pantalla());
      }
      desde = { x: e.clientX, y: e.clientY };
    };
    const suelta = (e: PointerEvent): void => {
      apoyados.delete(e.pointerId);
      /*
       * Con un dedo menos ya no hay pellizco, y el que queda NO sigue arrastrando:
       * levantar un dedo y que el mundo se pusiera a girar de golpe es un bandazo.
       */
      if (apoyados.size < 2) pellizco = null;
      /* Y no se suelta mientras quede un botón apretado, o el gesto termina en marcha. */
      if (e.buttons !== 0) return;
      desde = null;
      gira = false;
      mueveLaMirada = false;
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
      quitarLasDefensas();
    };
  }, [gl, alcance, cercania, alAcercarse, recuadro, seDesplazanSolas, velo, limites, callada]);

  useFrame(() => {
    if (callada) return;
    const lienzo = gl.domElement;
    const proporcion = lienzo.clientHeight > 0 ? lienzo.clientWidth / lienzo.clientHeight : undefined;
    /*
     * El mirador dice la DIRECCIÓN, el acercamiento a qué distancia y adónde se mira, y
     * `ojoYMira` los suma —incluida la altura mínima, sin la cual el ojo se mete dentro
     * de un edificio al acercarse—.
     */
    const { ojo, mira } = ojoYMira(
      cercania.current,
      alcance,
      (distancia) => ojoDelMirador(mirador.current, distancia, proporcion),
      alturaMinima,
    );
    camera.position.set(...ojo);
    camera.lookAt(...mira);
    if (niebla !== null && scene.fog instanceof Fog) {
      /*
       * SE MIDE DEL OJO AL PUNTO DE MIRA, no de la altura del ojo al suelo: desde que la
       * mirada se puede llevar a un borde, el ojo está lejos del centro pero cerca de lo
       * que mira, y el mundo saldría con niebla encima justo al acercarse a mirarlo.
       */
      const distancia = camera.position.distanceTo(PUNTO_DE_MIRA.set(...mira));
      scene.fog.near = distancia + alcance * niebla.empiezaA;
      scene.fog.far = distancia + alcance * niebla.terminaA;
    }
  });
  return null;
}

// ---------------------------------------------------------------------------
// La trampa de foco de una caja modal, y la pila que decide cuál manda
// ---------------------------------------------------------------------------

/**
 * LAS TRAMPAS ARMADAS, en el orden en que se abrieron: LA PILA, y es una para toda la pestaña.
 *
 * ═══ POR QUÉ HACE FALTA UNA PILA ═══
 *
 * Con el oyente de teclas en la caja, la burbuja repartía sola: con el cajón abierto y el menú
 * de elegir encima, un `Escape` sólo llegaba a la caja que tenía el foco dentro. Desde que el
 * oyente vive en `document` (ver `usarLaTrampaDeFoco`) llegan LAS DOS, y `Escape` cerraría el
 * menú Y el cajón de un golpe. Así que `armarUnaTrampa` apunta cada caja en el orden en que se
 * abre y sólo actúa la de arriba.
 *
 * Es un array de módulo y no un estado de React a propósito: no decide qué se pinta, y las
 * cajas que lo comparten no tienen un antepasado común al que colgárselo sin inventar un
 * contexto para cuatro líneas. Y por lo mismo es UNO: una segunda pila en otro fichero serían
 * dos cajas creyéndose las de encima. No se exporta: se apunta con `armarUnaTrampa`, que
 * devuelve cómo desarmarse, y se pregunta con `mandaEstaTrampa` y `hayUnaTrampaArmada`.
 */
const LAS_TRAMPAS_ARMADAS: unknown[] = [];

/**
 * APUNTA UNA TRAMPA Y DEVUELVE CÓMO BORRARLA. Desarmar dos veces no hace nada, que es lo que
 * pide un efecto de React en modo estricto (monta, desmonta y vuelve a montar).
 */
export function armarUnaTrampa(quien: unknown): () => void {
  LAS_TRAMPAS_ARMADAS.push(quien);
  let desarmada = false;
  return () => {
    if (desarmada) return;
    desarmada = true;
    const suPuesto = LAS_TRAMPAS_ARMADAS.lastIndexOf(quien);
    if (suPuesto >= 0) LAS_TRAMPAS_ARMADAS.splice(suPuesto, 1);
  };
}

/** ¿Manda ésta? Sólo la última que se armó, que es la que está encima. */
export function mandaEstaTrampa(quien: unknown): boolean {
  return LAS_TRAMPAS_ARMADAS.length > 0 && LAS_TRAMPAS_ARMADAS[LAS_TRAMPAS_ARMADAS.length - 1] === quien;
}

/**
 * ¿HAY ALGUNA CAJA MODAL ABIERTA, SEA CUAL SEA? Para las teclas que no son de ninguna caja
 * —las de la cámara de Riberas— y que con una abierta tienen que callarse: cambiar de cámara
 * por debajo de un menú es mover lo que no se ve. Se pregunta a la pila en vez de exportarla,
 * para que nadie apunte ni borre una trampa sin pasar por `armarUnaTrampa`.
 */
export function hayUnaTrampaArmada(): boolean {
  return LAS_TRAMPAS_ARMADAS.length > 0;
}

/**
 * DÓNDE ESTÁ EL FOCO CUANDO LLEGA LA TECLA, visto desde la caja modal.
 *
 * `fuera` es el caso que costó tres turnos de partida: el navegador lo ha soltado al
 * `<body>` porque el botón que lo tenía se desmontó. No es un caso raro ni un caso de
 * teclado: pasa con el ratón, en la primera jugada, y dejaba la caja sin `Escape`.
 */
export type ElFocoDeLaTrampa = 'fuera' | 'la-caja' | 'el-unico' | 'el-primero' | 'el-ultimo' | 'dentro';

/** Lo que la trampa hace con una tecla. `nada` quiere decir «déjasela al navegador». */
export type LoQueHaceLaTrampa = 'nada' | 'cerrar' | 'al-primero' | 'al-ultimo' | 'a-la-caja';

/**
 * LA DECISIÓN DE LA TRAMPA, SIN NAVEGADOR, para que se pueda comprar llamándola.
 *
 * La comprobación de antes leía el CUERPO del oyente y buscaba dentro las palabras `Tab`,
 * `shiftKey` y `Escape`. Pasaba en verde con la trampa rota delante, porque las palabras
 * estaban escritas y el fallo era DÓNDE se enganchaba el oyente y qué pasaba con el foco
 * caído: dos cosas que aquel texto no miraba. Partido así, el reparto se llama con una tabla
 * —incluida la fila `fuera`, que es la del fallo— y el enganche se lee aparte.
 *
 * `Escape` cierra MIRE DONDE MIRE EL FOCO, y eso es la mitad del arreglo: es justo la tecla
 * que se pulsa cuando uno ya no sabe dónde está.
 */
export function loQueHaceLaTrampa(
  tecla: { key: string; shiftKey: boolean },
  foco: ElFocoDeLaTrampa,
  cuantosEnfocables: number,
): LoQueHaceLaTrampa {
  if (tecla.key === 'Escape') return 'cerrar';
  if (tecla.key !== 'Tab') return 'nada';
  /* Una caja sin nada que enfocar dentro se queda el tabulador ella misma. */
  if (cuantosEnfocables === 0) return 'a-la-caja';
  /* El foco caído al `body`: el tabulador entra en la caja en vez de irse a la Sala. */
  if (foco === 'fuera') return tecla.shiftKey ? 'al-ultimo' : 'al-primero';
  if (!tecla.shiftKey && (foco === 'el-ultimo' || foco === 'el-unico')) return 'al-primero';
  if (tecla.shiftKey && (foco === 'el-primero' || foco === 'el-unico' || foco === 'la-caja')) return 'al-ultimo';
  return 'nada';
}

/**
 * ENCERRAR EL FOCO DENTRO DE UNA CAJA MODAL, con `Escape` y con rescate.
 *
 * Es un gancho y no el cuerpo de una caja porque cajas modales hay muchas —el cajón del
 * marcador, el menú de elegir, el componedor del trueque, las cajas del Burgo— y todas se
 * pintan encima de un tablero donde un toque funda una choza o compra un solar. Escrita dos
 * veces, son dos trampas que se separan el día que alguien arregle una, y la que se queda
 * rota es la que nadie estaba mirando.
 *
 * LO QUE HACE, y las tres son cosas que un navegador NO hace solo con un `<div>`:
 *
 *   · al abrirse, el foco se va DENTRO de la caja. Sin esto, quien abre con teclado se queda
 *     tabulando por detrás de un modal opaco;
 *   · `Tab` sobre el último enfocable vuelve al primero y `Mayúsculas+Tab` sobre el primero
 *     va al último. `aria-modal` se lo cuenta al lector de pantalla y no le quita el
 *     tabulador a nadie: sin la vuelta, el foco se va a la cabecera de la Sala;
 *   · `Escape` cierra, que es la salida que quien abrió con teclado espera encontrar.
 *
 * DEVOLVER EL FOCO AL CERRAR NO ES COSA DE AQUÍ, y no por descuido: la caja se DESMONTA al
 * cerrarse y adónde vuelve el foco depende de quién la abrió —la ficha de mis puntos en un
 * caso, el recuadro del lienzo en otro, porque a un menú lo abre un naipe del `<canvas>` y un
 * `<canvas>` no recibe foco—. Lo hace cada `cerrar`, que es el que lo sabe.
 *
 * ═══ EL OYENTE VA EN `document`, Y ESO ES LO QUE COSTÓ TRES TURNOS DE PARTIDA ═══
 *
 * Vivía EN LA CAJA, y un `keydown` sólo llega ahí si el foco está DENTRO. Basta pulsar una
 * opción para que deje de estarlo: la lista cambia con la jugada, el botón pulsado se desmonta
 * y el navegador suelta el foco al `<body>` sin avisar a nadie. Desde ahí ni el tabulador daba
 * la vuelta ni `Escape` cerraba: la trampa existía hasta el primer toque. Por eso `tecla` mira
 * `caja.current` EN EL MOMENTO de la tecla y no el nodo que se capturó al armarla; y con la
 * pila, seguir en `document` no le quita el `Escape` a la caja que haya encima.
 *
 * El RESCATE es la otra mitad. Que el botón que tenía el foco se desmonte no avisa a nadie
 * —el navegador no dispara `blur` al quitar de la página al que lo tenía—, así que se vigila
 * la caja por dentro con un `MutationObserver`, y cada vez que cambia, si el foco se ha caído
 * fuera, vuelve a la caja. Desde ahí el tabulador entra otra vez, que es lo que se perdía. Es
 * el mismo patrón que el rescate del recuadro de `sala.tsx`, aquí en pequeño.
 *
 * El reparto de teclas lo decide `loQueHaceLaTrampa`, la función pura de aquí arriba, que se
 * puede llamar desde Node con una tabla —incluida la fila `fuera`, que es la del fallo—. Aquí
 * sólo se lee dónde está el foco y se obedece.
 */
export function usarLaTrampaDeFoco(
  abierto: boolean,
  caja: RefObject<HTMLElement | null>,
  cerrar: () => void,
): void {
  useEffect(() => {
    if (!abierto) return;
    const alArmar = caja.current;
    if (alArmar === null) return;
    alArmar.focus();
    const desarmar = armarUnaTrampa(caja);
    const enfocables = (dentro: HTMLElement): HTMLElement[] =>
      [...dentro.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')].filter(
        (e) => !e.hasAttribute('disabled') && e.tabIndex >= 0,
      );
    const dondeEstaElFoco = (dentro: HTMLElement, lista: HTMLElement[]): ElFocoDeLaTrampa => {
      const activo = document.activeElement;
      if (activo === dentro) return 'la-caja';
      if (activo === null || !dentro.contains(activo)) return 'fuera';
      if (lista.length === 1 && activo === lista[0]) return 'el-unico';
      if (activo === lista[0]) return 'el-primero';
      if (activo === lista[lista.length - 1]) return 'el-ultimo';
      return 'dentro';
    };
    const tecla = (e: KeyboardEvent): void => {
      const dentro = caja.current;
      if (dentro === null || !mandaEstaTrampa(caja)) return;
      const lista = enfocables(dentro);
      const hace = loQueHaceLaTrampa(e, dondeEstaElFoco(dentro, lista), lista.length);
      if (hace === 'nada') return;
      e.preventDefault();
      if (hace === 'cerrar') cerrar();
      else if (hace === 'a-la-caja') dentro.focus();
      else (hace === 'al-primero' ? lista[0] : lista[lista.length - 1])?.focus();
    };
    document.addEventListener('keydown', tecla);
    const rescatar = (): void => {
      const dentro = caja.current;
      if (dentro === null || !mandaEstaTrampa(caja)) return;
      if (dondeEstaElFoco(dentro, enfocables(dentro)) === 'fuera') dentro.focus();
    };
    const vigia = new MutationObserver(rescatar);
    vigia.observe(alArmar, { childList: true, subtree: true });
    return () => {
      document.removeEventListener('keydown', tecla);
      vigia.disconnect();
      desarmar();
    };
  }, [abierto, caja, cerrar]);
}

// ---------------------------------------------------------------------------
// El menú de una pregunta
// ---------------------------------------------------------------------------

/**
 * EL MENÚ PEQUEÑO DE UNA PREGUNTA: aquí están las opciones que el juego ofrece, elige
 * una.
 *
 * Rótulo y ayuda son los que escribió el JUEGO en cada opción, así que aquí no se
 * inventa ni una palabra sobre la jugada: sólo el título, que llega de fuera, y la
 * salida.
 *
 * Es UN componente para todas las preguntas y no uno por pregunta. La primera versión, en
 * Riberas, sólo sabía de trueques y llevaba el título escrito dentro; con las cartas habría
 * hecho falta copiarlo tres veces, y tres copias de un menú son tres sitios donde el día que
 * el botón de «Dejarlo» cambie sólo cambiará uno. Luego hubo dos —la de Riberas y ésta—, y ya
 * no se parecían: ésta admitía una tarjeta dentro y aquélla no.
 *
 * Es MODAL con las cuatro mitades, y ninguna sobra: el VELO, sin el cual un clic fuera
 * cierra el menú Y toca el tablero de debajo; `role="dialog"` con `aria-modal` y NOMBRE
 * —que es el título de la pregunta—, sin el cual un lector sigue leyendo lo de abajo; la
 * TRAMPA DE FOCO; y el foco DE VUELTA al cerrar, que lo hace quien lo abrió porque adonde
 * vuelve depende de quién fue. `alDejarlo` hace de cerrar en los tres caminos —el botón, el
 * velo y `Escape`— y es a propósito: son la misma decisión dicha de tres maneras, y con tres
 * funciones distintas la que se olvidaría de devolver el foco sería la que menos se prueba.
 *
 * `fijo` coloca la caja sobre la VENTANA en vez de sobre el recuadro, y hace falta porque
 * hay dos pantallas: en el lienzo el recuadro vale la ventana entera y debajo no hay nada;
 * en el respaldo no hay recuadro y la página RUEDA, así que una caja colocada sobre el
 * flujo se quedaría centrada en un documento de mil puntos, o sea fuera de la pantalla.
 *
 * `Dejarlo` NO se apaga con `quieto`: cerrar el menú no manda nada, y dejar sin salida a
 * quien lo abrió mientras una petición viaja es encerrarlo delante de botones apagados.
 *
 * ═══ Y ADMITE CONTENIDO, PORQUE UNA PREGUNTA NO SIEMPRE ES SÓLO UNA LISTA ═══
 *
 * `children` va ENTRE la nota y la lista, y ese sitio no es una casualidad de maquetación:
 * es el orden en que se lee y en que un lector lo dicta. Primero de qué va la pregunta
 * (título), luego cómo anda la cosa (nota), luego LO QUE SE ESTÁ MIRANDO —la ficha de una
 * casilla con su renta, su barrio y su dueño, que es una tarjeta entera y no cabe en el
 * rótulo de un botón—, y al final lo que se puede hacer con ello. Al revés, la lista de
 * opciones se leería antes de saber sobre qué se decide.
 *
 * Esto no abre la puerta a que aquí entre una regla del juego: lo que se pasa dentro lo
 * REDACTA el juego (`shared/`) y lo pinta quien monta el menú. Este fichero sigue sin saber
 * qué es una renta.
 */
export function ElijeUna({
  titulo,
  nota,
  opciones,
  quieto,
  fijo = false,
  velo,
  menu,
  claseDeLaNota = 'letra-chica',
  alElegir,
  alDejarlo,
  children,
}: {
  titulo: string;
  /**
   * UN RENGLÓN EN TENUE BAJO EL TÍTULO, para las preguntas que tienen estado que contar: la
   * hoja de un trato dice en qué anda —«la aceptó Ana», «no tienes 1 limo»—.
   *
   * Va aquí y no en el título porque el título es además el NOMBRE del diálogo, y meterle el
   * estado dentro haría que un lector anunciara «Ana te da 1 junco por 1 limo, la aceptó Ana,
   * diálogo» al abrirlo. Y es opcional porque la mayoría de las preguntas no tienen estado
   * ninguno: un renglón vacío ahí sería una caja de más en un modal que ya va justo de alto.
   */
  nota?: string;
  opciones: readonly Opcion[];
  quieto: boolean;
  fijo?: boolean;
  /** Las clases del velo y de la caja: cada pintor tiene las suyas y la cámara las busca. */
  velo: string;
  menu: string;
  /**
   * LA CLASE DEL RENGLÓN DE LA NOTA, que es del pintor por lo mismo que `velo` y `menu`: la
   * pone su hoja. `letra-chica` si no se dice otra, que es la de la casa. Riberas pasa la suya
   * (`riberas-elige-nota`: pegada al título con margen negativo y en el cuerpo de la ayuda de
   * una opción) porque así la pintaba su menú antes de que el menú fuera de todos, y el
   * componedor del trueque la reutiliza; heredar aquí `letra-chica` le habría cambiado la
   * letra y el aire sin que nada se pusiera rojo.
   */
  claseDeLaNota?: string;
  alElegir: (o: Opcion) => void;
  alDejarlo: () => void;
  /** La tarjeta que se está mirando, si la pregunta tiene una. Va entre la nota y la lista. */
  children?: ReactNode;
}): JSX.Element {
  const caja = useRef<HTMLDivElement | null>(null);
  usarLaTrampaDeFoco(true, caja, alDejarlo);
  return (
    <>
      <div className={fijo ? `${velo} ${velo}-fijo` : velo} onClick={alDejarlo} aria-hidden="true" />
      <div
        ref={caja}
        className={fijo ? `formulario ${menu} ${menu}-fijo` : `formulario ${menu}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
      >
        <h2 className="rotulo-de-panel">{titulo}</h2>
        {nota === undefined ? null : <p className={claseDeLaNota}>{nota}</p>}
        {children}
        <ul className="opciones">
          {opciones.map((o) => (
            <li key={o.id}>
              {/*
                `aria-disabled` Y NO `disabled`: un `<button>` al que se le pone `disabled`
                TENIENDO EL FOCO lo pierde, y el foco cae al `<body>`. Dentro de un modal eso
                es escaparse de la trampa: tabular desde ahí lleva a la cabecera de la Sala y
                encima queda un diálogo opaco que ya no se puede cerrar con el teclado. Quien
                ignora el clic es este `onClick`; la pinta de apagado la pone `.opcion-quieta`.
              */}
              <button
                type="button"
                className={quieto ? 'opcion opcion-quieta' : 'opcion'}
                aria-disabled={quieto}
                title={o.ayuda}
                onClick={() => {
                  if (quieto) return;
                  alElegir(o);
                }}
              >
                <span className="opcion-texto">
                  <span className="opcion-rotulo">{o.rotulo}</span>
                  {o.ayuda.length > 0 ? <span className="opcion-ayuda">{o.ayuda}</span> : null}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="opcion opcion-sobria" onClick={alDejarlo}>
              <span className="opcion-texto">
                <span className="opcion-rotulo">Dejarlo</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// El ancho de la cinta, del número medido al estilo
// ---------------------------------------------------------------------------

/**
 * EL ANCHO DE LA CINTA, TRADUCIDO A LO QUE EL NAVEGADOR ENTIENDE.
 *
 * Es una función y no una línea dentro del JSX por el fallo del que nació en Riberas su
 * hermana `elEstiloDelCartel`: `loQueLlevaLaCinta` mide con muchísimo cuidado y
 * `verify:escena` lo contrasta contra las dos manos, y lo que NADA ataba era que ese número
 * acabara de verdad en el `width` de la caja que se pinta. Así es una función pura que se
 * puede llamar desde Node y mirar qué sale, y `verify:escritorio` la llama.
 *
 * Vive aquí y no en Riberas porque la usan los dos pintores —Riberas para su cinta y su
 * carril, el Burgo para su cajón y la caja de los tratos, que cuelgan del pie de la suya—, y
 * con ella en Riberas el Burgo importaba de otro pintor para medir una caja.
 *
 * Con el recuadro sin medir todavía (cero por cero, el primer render y también Node, donde no
 * hay `ResizeObserver`) devuelve `undefined` y manda la hoja: un ancho de cero puntos no se ve
 * como un error, se ve como que no hay cinta.
 */
export function elEstiloDeLaCinta(cinta: { ancho: number }): CSSProperties | undefined {
  if (cinta.ancho <= 0) return undefined;
  return { width: `${String(Math.round(cinta.ancho))}px` };
}

// ---------------------------------------------------------------------------
// La gramática de las cajas sobre el lienzo: los nombres, escritos una vez
// ---------------------------------------------------------------------------

/**
 * ═══ LAS CLASES SON DE LAS PIEZAS Y NO DEL PINTOR, Y ESO ARREGLA UN FALLO CONCRETO ═══
 *
 * `ElijeUna` recibe `velo` y `menu` por props —cada pintor traía las suyas— y eso obliga a
 * quien monta el menú a acordarse de DOS cosas: ponerle la clase y, además, nombrarla en el
 * `seDesplazanSolas` de la cámara. Riberas lo hace bien porque su lista está escrita al lado
 * de las cinco constantes (`SE_DESPLAZAN_SOLAS`, en `riberas-en-tres.tsx`), pero el segundo
 * pintor llegó con DOS de las suyas —`burgo-cajon` y `burgo-elige`— y la lista no es un sitio
 * al que se vuelva: un carril que se añada mañana, o una caja colgada, entra sin que nada
 * avise. El fallo que sale de ahí no es un error en ninguna consola: es que girar la rueda
 * sobre la caja acerca el mundo DE DETRÁS y la caja no se mueve un renglón (la cabecera de
 * `LoQueVeLaCamara.seDesplazanSolas` cuenta las tres veces que ya ha pasado: la crónica, el
 * carril y el componedor).
 *
 * Así que las piezas de aquí abajo traen su clase PUESTA, la publican, y publican también la
 * lista de las que ruedan por dentro. Quien monte una de estas piezas pasa `RUEDAN_SOLAS` a
 * la cámara y no tiene nada que recordar; las clases propias del pintor (las que colocan y
 * miden) se le añaden por `clase`, que no participa de esta cuenta.
 *
 * El prefijo es `lienzo-` y no el nombre de un juego, por lo mismo que `lienzo-propio`: la
 * decisión 18 dice que la cadena de pantalla completa se engancha a la clase GENÉRICA para
 * que el tercer pintor no vuelva a pagarla, y estas cajas viven dentro de esa misma pantalla.
 */
export const VELO_DEL_LIENZO = 'lienzo-velo';
export const CAJA_DEL_LIENZO = 'lienzo-caja';
export const COLGADA_DEL_LIENZO = 'lienzo-colgada';
export const CARTEL_DEL_LIENZO = 'lienzo-cartel';
export const CARRIL_DEL_LIENZO = 'lienzo-carril';

/**
 * LAS TRES VARIANTES DE SITIO, QUE TAMBIÉN SE PUBLICAN, y no es un detalle.
 *
 * La caja modal nace CENTRADA en el recuadro, que es la forma que vale en las dieciocho
 * medidas de lienzo sin presuponer que arriba hay una cinta. Pero la caja que ES la hoja de
 * la partida cuelga del pie de la cinta y llega al canto, y con carril cuelga una tira más
 * abajo. Esas dos líneas de geometría viven en la hoja —`.lienzo-caja-bajo-la-cinta` y
 * `.lienzo-caja-bajo-el-carril`— y sus nombres se publican AQUÍ para que quien monte la caja
 * no los escriba a mano: una clase escrita a mano que no exista en la hoja no falla, deja la
 * caja centrada encima del tablero y se lee como una decisión de diseño.
 *
 * Los dos números —`2.75rem` y su doble— están en la hoja y en `rem`, nunca en píxeles: la
 * cinta se pinta con el suelo de toque de la casa y con la preferencia de letra del navegador
 * eso deja de ser 44 puntos. Escritos los dos en la misma unidad crecen juntos; escrito uno
 * en `px`, la caja se mete por debajo de la cinta, que es el fallo que el cajón del delta ya
 * pagó por 2,75 puntos.
 */
export const BAJO_LA_CINTA = 'lienzo-caja-bajo-la-cinta';
export const BAJO_EL_CARRIL = 'lienzo-caja-bajo-el-carril';
export const COLGADA_BAJO_EL_CARRIL = 'lienzo-colgada-bajo-el-carril';

/**
 * LAS QUE RUEDAN POR DENTRO: la rueda es suya y no de la cámara.
 *
 * El cartel NO está, y no es un olvido: no rueda —lo que no cabe no se pinta— y encima lleva
 * `pointer-events: none`, así que ni siquiera es blanco de un suceso de rueda. El VELO
 * tampoco: sobre él la rueda se para (`preventDefault` y punto), que es lo contrario de
 * dejarla pasar, y por eso viaja por la prop `velo` de la cámara y no por ésta.
 */
export const RUEDAN_SOLAS: readonly string[] = [CAJA_DEL_LIENZO, COLGADA_DEL_LIENZO, CARRIL_DEL_LIENZO];

/**
 * LA CLASE QUE APAGA, que es una clase QUIETA y nunca `opacity`.
 *
 * Un `opacity: 0.4` sobre un botón apagado apaga también su filo y su fondo, y en esta paleta
 * —`--teja-alta` sobre `--suelo`, dos grises que se llevan cuatro puntos de luminancia— eso
 * deja un rectángulo que ya no se distingue del fondo: no se lee «esto no se puede pulsar
 * ahora», se lee «aquí no hay nada». Con una clase que baja el color de la LETRA a `--tenue`
 * y deja el filo donde estaba, el botón sigue siendo un botón y se ve apagado.
 *
 * Y quien ignora la pulsación es el `onClick`, no el atributo: `aria-disabled` y NUNCA
 * `disabled` nativo (ver la nota de `ElijeUna`).
 */
export const QUIETA_EN_EL_LIENZO = 'lienzo-quieta';

// ---------------------------------------------------------------------------
// La caja modal sobre el lienzo
// ---------------------------------------------------------------------------

/**
 * UNA CAJA MODAL SOBRE EL LIENZO, CON LAS CUATRO MITADES Y SIN QUE NINGUNA SE PUEDA OLVIDAR.
 *
 * Esto existe porque las cuatro se han escrito ya cuatro veces a mano —el cajón de Riberas,
 * su componedor, el cajón del Burgo y `ElijeUna`— y la cuarta es la que se olvida. Enteras:
 *
 *   1. EL VELO, que se come el clic de fuera. Sin él, cerrar una caja tocando al lado cierra
 *      la caja Y toca el mundo de debajo: en Riberas eso fundaba una choza donde estaba el
 *      dedo, y en un anillo de casillas compra un solar. El velo es también quien para la
 *      rueda: la cámara lo busca por `VELO_DEL_LIENZO` y sobre él llama a `preventDefault` y
 *      se detiene, porque modal incluye la cámara.
 *   2. `role="dialog"` + `aria-modal="true"` + NOMBRE. Sin `aria-modal` un lector sigue
 *      leyendo lo de debajo como si nada; sin nombre, un `dialog` se anuncia «diálogo» a
 *      secas y no dice de qué. El nombre lo escribe quien la monta, que es quien sabe de qué
 *      va; aquí no se inventa ni una palabra.
 *   3. LA TRAMPA DE FOCO, que es LA PILA COMPARTIDA de este fichero y no una segunda: con
 *      dos pilas, `Escape` cerraría de un golpe la caja de encima y la de debajo.
 *   4. EL FOCO DE VUELTA AL CERRAR, y ADÓNDE VUELVE LO SABE `alCerrar`, no la trampa. No es
 *      una comodidad: el destino depende de quién abrió. El cajón vuelve a la ficha de la
 *      cinta que lo abre; un menú que abre una casilla del `<canvas>` no tiene botón al que
 *      volver —un `<canvas>` no recibe foco— y vuelve al RECUADRO, que para eso lleva
 *      `tabIndex={-1}`. Una trampa que «devolviera el foco» sola acertaría en el primer caso
 *      y en el segundo soltaría el foco al `<body>`, o sea tabular la cabecera entera de la
 *      Sala en cada carta que se juega.
 *
 * ═══ EL TAMAÑO Y EL SITIO NO SE DECIDEN AQUÍ ═══
 *
 * `clase` y `estilo` los pone quien la monta, y por la misma razón por la que el ancho de la
 * cinta de Riberas no está en `estilo.css`: cuánto se lleva una caja depende del reparto de
 * SU pantalla —a los lados de la cinta hay dos manos con cartas que se arrastran, y en el
 * anillo del Burgo no hay ninguna—, y un porcentaje escrito aquí sería un segundo reparto que
 * el día que el primero cambie no se pondrá rojo. Lo que sí vive en la hoja es lo que no
 * depende del juego: que ruede por dentro, con el dedo, sin llevarse la mesa detrás.
 */
export function CajaEnElLienzo({
  nombre,
  clase,
  estilo,
  alCerrar,
  children,
}: {
  /** Cómo se anuncia. Lo escribe quien la monta. */
  nombre: string;
  /** Las clases del pintor que la colocan y la miden. La suya la pone la pieza. */
  clase?: string;
  estilo?: CSSProperties;
  /** Cerrar Y devolver el foco: adónde vuelve lo sabe quien abrió, no la trampa. */
  alCerrar: () => void;
  children: ReactNode;
}): JSX.Element {
  const caja = useRef<HTMLDivElement | null>(null);
  usarLaTrampaDeFoco(true, caja, alCerrar);
  return (
    <>
      {/*
        `aria-hidden` en el velo: para un lector la caja ya es modal, y un `<div>` sin texto
        en medio del árbol sólo sería ruido. Lo que hace es comerse el clic, y eso no se
        anuncia.
      */}
      <div className={VELO_DEL_LIENZO} onClick={alCerrar} aria-hidden="true" />
      <div
        ref={caja}
        className={clase === undefined ? CAJA_DEL_LIENZO : `${CAJA_DEL_LIENZO} ${clase}`}
        role="dialog"
        aria-modal="true"
        aria-label={nombre}
        tabIndex={-1}
        style={estilo}
      >
        {children}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// La caja que NO es modal
// ---------------------------------------------------------------------------

/**
 * UNA CAJA COLGADA DEL PIE DE LA CINTA QUE **NO** ES MODAL, Y ÉSA ES TODA SU RAZÓN DE SER.
 *
 * Se lee MIENTRAS JUEGA OTRO. Lo que va dentro —las propuestas de trueque del pregón, y en el
 * Burgo lo mismo— le llega a quien NO tiene el turno, así que tiene que verse sin abrir nada
 * y el tablero tiene que seguir girando por debajo. De ahí sale, una a una, cada diferencia
 * con `CajaEnElLienzo`:
 *
 *   · SIN VELO. Un velo aquí es exactamente el fallo que esta caja viene a evitar: con él,
 *     leer una propuesta ajena congelaría la cámara y el tablero de quien la lee.
 *   · SIN TRAMPA DE FOCO Y SIN `aria-modal`. Encerrar el foco dentro de algo que nadie ha
 *     abierto es secuestrarlo: quien estaba tabulando hacia los botones del turno se
 *     encontraría dando vueltas dentro de un aviso que no pidió.
 *   · `role="group"` CON NOMBRE Y NO `dialog`. Es una región de la pantalla, no una ventana:
 *     el lector la anuncia al entrar y se sale de ella tabulando, que es lo que se quiere.
 *   · Y VIVE EN EL NIVEL DE LA CINTA (`z-index: 2`, el mismo del carril) y no en el del velo:
 *     por debajo se sigue tocando el mundo.
 *
 * Rueda por dentro, y por eso está en `RUEDAN_SOLAS`. Lo demás —hasta dónde cuelga, cuánto
 * mide de ancho— lo pone quien la monta por `estilo`, por lo mismo que en la caja modal: es
 * reparto de SU pantalla. Y aquí hay una asimetría que conviene tener escrita: la caja modal
 * SÍ puede pasar por encima de las manos porque con ella abierta no hay nada que arrastrar;
 * ésta no, y por eso no lleva el suelo de ancho que sí tiene aquélla.
 */
export function CajaColgadaDelLienzo({
  nombre,
  clase,
  estilo,
  children,
}: {
  nombre: string;
  clase?: string;
  estilo?: CSSProperties;
  children: ReactNode;
}): JSX.Element {
  return (
    <div
      className={clase === undefined ? COLGADA_DEL_LIENZO : `${COLGADA_DEL_LIENZO} ${clase}`}
      role="group"
      aria-label={nombre}
      style={estilo}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// El cartel del pie, que aparece y se va solo
// ---------------------------------------------------------------------------

/** El separador con el que las frases del cartel viajan pegadas. Ver `CartelAlPie`. */
const RENGLON_DEL_CARTEL = '\n';

/**
 * CUÁNTO SE QUEDA UN CARTEL, y de dónde sale el número.
 *
 * Cuatro segundos y medio: es lo que tarda en leerse despacio un cartel de dos renglones
 * cortos, que es el tamaño para el que está medida la caja (`elCartelQueCabe` reparte por
 * RENGLONES, no por caracteres). Menos, y quien mira el tablero en vez del pie se lo pierde;
 * más, y un cartel viejo sigue puesto cuando ya ha pasado otra cosa, que es peor que no
 * haberlo pintado: se lee como el estado de AHORA.
 */
export const LO_QUE_DURA_UN_CARTEL = 4500;

/**
 * EL CARTEL DEL PIE: aparece, se lee, y se va SOLO.
 *
 * ═══ NO SE PULSA, Y POR ESO NO TIENE BOTÓN DE CERRAR ═══
 *
 * `pointer-events: none` en la hoja, siempre. El cartel vive al pie, ENCIMA del mundo, y la
 * única manera de que una ayuda no cambie el juego es que no sea pulsable: un rectángulo
 * opaco ahí es un cartel que impide tocar la casilla que tapa, y en un anillo de cuarenta
 * casillas las de abajo son justamente las que se tocan primero. Un botón de cerrar sería
 * además un blanco de toque de 44 puntos encima del tablero para quitar algo que se va solo.
 *
 * ═══ ESTÁ SIEMPRE EN EL ÁRBOL, TAMBIÉN VACÍO ═══
 *
 * Y eso es lo que hace que se OIGA cuando es la región viva de la pantalla: una región
 * `aria-live` que se monta A LA VEZ que su texto no se anuncia en la mayoría de los lectores,
 * porque el lector no vigila lo que todavía no existía. Vacío no se ve —`:empty` le quita
 * fondo, filo y relleno en la hoja— y no deja una caja fantasma sobre el mundo.
 *
 * ═══ `vivo` ES UN INTERRUPTOR, Y AQUÍ SÍ ESTÁ JUSTIFICADO ═══
 *
 * La regla de la casa dice UNA sola región `aria-live` por pantalla: dos con el mismo texto
 * se anuncian dos veces y el aviso ya se anuncia solo cada vez que juega otro. Cuál de las
 * cajas de una pantalla es LA región no lo puede saber una pieza que no ve a sus hermanas, así
 * que lo dice quien monta la pantalla. No es un interruptor sobre el JUEGO —de esos no hay
 * ninguno en este fichero—: es un dato del árbol accesible, y el que lo pone es el único que
 * lo tiene. Quien ya tenga su región en la cinta monta el cartel con `vivo={false}`.
 *
 * ═══ EL RELOJ CUELGA DEL CONTENIDO Y NO DE LA IDENTIDAD DE LA LISTA ═══
 *
 * Esto es la trampa de este componente y por eso va escrita. Un efecto atado a `frases` —el
 * array— se rearma en CADA render, porque quien lo monta casi siempre compone la lista dentro
 * del render; y un temporizador que se rearma sesenta veces por segundo no vence nunca: el
 * cartel se queda puesto para siempre y no falla nada. Atado al TEXTO pegado, el efecto se
 * rearma cuando cambia lo que dice, que es cuando de verdad empieza un cartel nuevo. Con
 * `msQueDura` en 0 no se va solo, que es lo que quiere un cartel que explica lo que se tiene
 * en la mano y se cierra al soltarlo.
 */
export function CartelAlPie({
  frases,
  vivo,
  clase,
  estilo,
  msQueDura = LO_QUE_DURA_UN_CARTEL,
}: {
  /** Cada frase en su renglón. Las escribe el juego; aquí no se redacta ninguna. */
  frases: readonly string[];
  /** ¿Es ÉSTA la única región viva de esta pantalla? Lo sabe quien monta la pantalla. */
  vivo: boolean;
  clase?: string;
  estilo?: CSSProperties;
  /** 0 = no se va solo. */
  msQueDura?: number;
}): JSX.Element {
  const texto = frases.join(RENGLON_DEL_CARTEL);
  const [puesto, ponerPuesto] = useState(texto);
  useEffect(() => {
    ponerPuesto(texto);
    if (texto === '' || msQueDura <= 0) return undefined;
    const reloj = setTimeout(() => {
      ponerPuesto('');
    }, msQueDura);
    return () => {
      clearTimeout(reloj);
    };
  }, [texto, msQueDura]);

  const renglones = puesto === '' ? [] : puesto.split(RENGLON_DEL_CARTEL);
  return (
    <p
      className={clase === undefined ? CARTEL_DEL_LIENZO : `${CARTEL_DEL_LIENZO} ${clase}`}
      aria-live={vivo ? 'polite' : undefined}
      style={estilo}
    >
      {/*
        CADA FRASE EN SU RENGLÓN, y por eso son `<span>` en bloque y no un párrafo corrido: el
        presupuesto de quien reparte el cartel cuenta RENGLONES por separado, y un párrafo
        corrido pintaría otra cosa que la que se midió.
      */}
      {/*
        LA CLAVE LLEVA EL SITIO Y NO SÓLO EL TEXTO: dos renglones IGUALES son perfectamente
        posibles —el juego escribe «Pagas 50 €» dos veces seguidas sin despeinarse— y con la
        frase por clave React se encuentra dos hermanos con la misma y avisa por consola de
        algo que no es el fallo que se esté buscando. Aquí la lista no se reordena nunca (se
        pinta entera o no se pinta), así que el índice es una clave honrada.
      */}
      {renglones.map((frase, i) => (
        <span key={`${String(i)}·${frase}`} className={`${CARTEL_DEL_LIENZO}-frase`}>
          {frase}
        </span>
      ))}
    </p>
  );
}

// ---------------------------------------------------------------------------
// El carril de cuadrados de 44
// ---------------------------------------------------------------------------

/** Un cuadrado del carril. Todo lo que lleva dentro lo redacta el juego. */
export interface CuadradoDelCarril {
  /** Estable entre revisiones: es la clave de React y la de la lista de la criba. */
  clave: string;
  /**
   * LO QUE SE VE DENTRO: una cifra, una letra, una flecha. Va `aria-hidden`, porque en 44
   * puntos no cabe una frase y un lector que dictara «7» no diría nada.
   */
  glifo: string;
  /**
   * ═══ EL RÓTULO CORTO, Y ES LO QUE LE FALTABA A ESTE MUEBLE PARA DECIR CUÁL ES ═══
   *
   * ═══ EL FALLO, MEDIDO EN EL BANCO ═══
   *
   * El cuadrado pintaba el glifo Y NADA MÁS, y el glifo es el VERBO. En el apuro del Burgo
   * salen SEIS «Hi» seguidos —hipotecar, uno por título— que a la vista sólo se distinguen
   * por la barra de dos puntos del color de la acera, y dos solares del mismo barrio la
   * tienen IGUAL; en una subasta con el cajón cerrado salen TRES «Pu» idénticos, las tres
   * cifras fijas de la puja, sin ni siquiera esa barra. El rótulo entero estaba en
   * `aria-label` y en `title`, así que con lector y con ratón se distinguían perfectamente;
   * A LA VISTA, NO. Y con el dedo no hay `title` que se pose: la tira es justo el mueble que
   * existe para poder jugar SIN abrir nada.
   *
   * Así que el cuadrado admite un renglón más: el nombre de seis letras que lleva PINTADA LA
   * CARA de la casilla («Mayor»), la cifra de una puja, el nombre del otro en un trato. Sale
   * de donde ya está escrito —`GlifoDelCarrilDelBurgo.rotulo`, que el juego redacta— y aquí
   * no se recorta ni se abrevia nada: lo que no cabe lo recorta la hoja con puntos
   * suspensivos, y el nombre entero sigue en `nombre` y en el `title`.
   *
   * ═══ POR QUÉ ES OPCIONAL Y NO OBLIGATORIO ═══
   *
   * Porque el cuadrado ANCHO cuesta ancho: con rótulo el cuadrado deja de medir 44×44 y pasa
   * a medir de 59,5 a 110,5 puntos de ancho (`min-width: 3.5rem`, `max-width: 6.5rem` en la
   * hoja, con la raíz de esta casa en 17), o sea que en el lienzo de 288 caben CUATRO en vez
   * de CINCO. Donde el verbo ya es único —«Ti» de tirar, «Pa» de pasar el turno, «Qu» de la
   * quiebra— un rótulo no distingue nada de nada y sólo quita sitio a los que sí lo necesitan.
   * Quien compone los cuadrados es quien sabe cuáles se repiten, y por eso lo decide él.
   *
   * VA `aria-hidden` COMO EL GLIFO, y no es por ahorrar: el botón lleva `aria-label` con el
   * rótulo ENTERO del juego, y un `aria-label` sustituye al contenido, así que un lector no
   * oiría el renglón aunque no lo lleváramos. Marcarlo dice lo que es —cromo repetido— y no
   * deja que el día que se quite el `aria-label` se oiga «Hi Mayor» en vez de la frase.
   */
  rotulo?: string;
  /** EL NOMBRE LARGO: es lo que oye un lector y lo que sale al posar el ratón. Lo escribe el juego. */
  nombre: string;
  /** Un renglón más de explicación, si el juego la tiene. Se pega al `title`. */
  ayuda?: string;
  /** Un color al canto del cuadrado, o nada. Es `background`, así que llega como color. */
  marca?: string | null;
  /** Apagado: se pinta quieto y el `onClick` ignora la pulsación. Nunca `disabled` nativo. */
  quieto?: boolean;
}

/**
 * UNA TIRA DE CUADRADOS DEL SUELO DE TOQUE, QUE RUEDA A LO ANCHO Y TAMBIÉN CON EL DEDO.
 *
 * ═══ POR QUÉ CUADRADOS DE 44 Y NO UNA LISTA ═══
 *
 * Porque va DENTRO del recuadro, encima del mundo, y ahí el alto es lo único que no sobra: en
 * el lienzo más bajo de los dieciocho (288×317 menos la cabecera de la Sala) una lista de
 * renglones se come la mitad del tablero. Una tira de 44 puntos —el suelo de toque de la casa,
 * `2.75rem`, que con la raíz de esta casa pinta 46,75— cuesta una tira y no crece con el número
 * de opciones: cuando no caben, RUEDA. Ese es todo el trato, y lo que se paga por él es que en
 * el cuadrado sólo cabe un glifo; QUÉ hace cada uno vive entero en su nombre accesible y en su
 * `title`, escritos por el juego.
 *
 * ═══ `touch-action: auto` NO ES ADORNO, Y NO SE VE FALLAR CON UN RATÓN ═══
 *
 * El recuadro lleva `touch-action: none` porque el gesto de la cámara es suyo, y los
 * descendientes lo HEREDAN. Sin devolvérselo aquí, con el dedo no se puede rodar: se ven los
 * dos o tres primeros cuadrados, no hay manera de llegar a los demás, y no hay un error en
 * ninguna consola ni nada que se mueva en un monitor. Y `overscroll-behavior: contain` para
 * que al llegar al final el gesto no se lo lleve la mesa de detrás. Las dos están en la hoja,
 * en `.lienzo-carril`.
 *
 * ═══ VACÍO NO SE PINTA, Y POR ESO LA CRIBA RECIBE LOS CUADRADOS ═══
 *
 * Con la lista vacía devuelve `null`: una tira de vidrio sin nada dentro es una caja fantasma
 * atravesada sobre el tablero. Y eso es justamente por lo que la criba de «cada movimiento se
 * enseña exactamente una vez» tiene que recibir LOS CUADRADOS y no un interruptor: pasarle un
 * `true` mientras la tira no se pinta quitaría esos movimientos de los botones sueltos sin que
 * hubiera dónde pulsarlos, o sea una partida parada y ningún error en ninguna parte.
 *
 * LA BARRA DE DESPLAZAMIENTO SE ESCONDE, y hay que decir lo que cuesta: una barra pintada
 * dentro de 44 puntos le come al botón justo el suelo de toque que el botón existe para tener.
 * Lo que queda como señal de que hay más es que el último cuadrado se ve CORTADO por el canto
 * —el ancho de la tira casi nunca es un múltiplo del botón— y que con el tabulador el
 * navegador los trae a la vista de uno en uno.
 *
 * ═══ Y EL CUADRADO ANCHO, QUE ES LO QUE ROMPE «SÓLO CABE UN GLIFO» A PROPÓSITO ═══
 *
 * El párrafo de arriba dice que en el cuadrado sólo cabe un glifo y que QUÉ hace cada uno vive
 * en el nombre accesible y en el `title`. Eso era verdad y era insuficiente, y lo que faltaba
 * está contado con sus números en `CuadradoDelCarril.rotulo`: con lector y con ratón los seis
 * «Hi» del apuro se distinguen, A LA VISTA no, y con el dedo no hay `title` que se pose. El
 * cuadrado que trae rótulo mide de 3,5 a 6,5rem de ancho —sigue teniendo sus 44 de alto y más
 * de 44 de ancho, o sea que el suelo de toque no se toca— y pinta dos renglones dentro.
 *
 * ═══ QUÉ PASA CUANDO NO CABEN, QUE ES LO NORMAL Y NO EL CASO RARO ═══
 *
 * MEDIDO, con la raíz de esta casa en 17 y el lienzo más estrecho de los dieciocho (288, que
 * es el escritorio de pie): a la tira le quedan 262,5 puntos de ancho útil —el recuadro menos
 * el `max-width: calc(100% - 1.5rem)` de la hoja—, así que caben CINCO cuadrados de 44 o
 * CUATRO de los anchos en su medida mínima. Con los CATORCE que da el apuro del Burgo —doce
 * títulos entre vender e hipotecar, más pasar y la quiebra— no caben ni de lejos en ninguna de
 * las dos formas, y eso NO es un fallo que haya que arreglar aquí: la tira RUEDA POR DENTRO, y
 * ésa es la razón entera por la que este mueble es una tira y no una lista. Rueda con la rueda
 * del ratón, con el dedo (`touch-action: auto`, que es la línea que no se ve fallar con un
 * ratón) y con el tabulador, que trae los cuadrados a la vista de uno en uno; y la clase está
 * en `RUEDAN_SOLAS`, así que la cámara del pintor no se le come el gesto. Lo que se paga por
 * el rótulo es un cuadrado menos a la vista de cada cinco; lo que se compra es saber CUÁL es
 * cada uno de los catorce, que hasta hoy sólo se sabía posándose encima.
 */
export function CarrilDelLienzo({
  nombre,
  cuadrados,
  clase,
  estilo,
  alTocar,
}: {
  /** Cómo se anuncia la tira entera. Lo escribe quien la monta. */
  nombre: string;
  cuadrados: readonly CuadradoDelCarril[];
  clase?: string;
  estilo?: CSSProperties;
  alTocar: (c: CuadradoDelCarril) => void;
}): JSX.Element | null {
  if (cuadrados.length === 0) return null;
  return (
    <div
      className={clase === undefined ? CARRIL_DEL_LIENZO : `${CARRIL_DEL_LIENZO} ${clase}`}
      role="group"
      aria-label={nombre}
      style={estilo}
    >
      {cuadrados.map((c) => {
        const apagado = c.quieto === true;
        /*
         * EL RÓTULO VACÍO NO ES UN RÓTULO, y esto no es puntillismo: quien compone los
         * cuadrados los saca de una tabla del juego, y una cadena vacía es exactamente lo que
         * sale de ahí el día que a un movimiento nuevo no se le escribe rótulo. Con la clase
         * ancha puesta y nada dentro, el cuadrado mediría 59,5 puntos de ancho para pintar un
         * renglón en blanco: dos cuadrados menos en el lienzo de 288 a cambio de nada.
         */
        const conRotulo = c.rotulo !== undefined && c.rotulo.length > 0;
        /*
         * LAS CLASES SE COMPONEN EN UNA LISTA Y NO CON TERNARIOS ANIDADOS: son tres estados
         * independientes —la pieza, el ancho y el apagado— y en cuanto se cruzan dos, la
         * cadena de ternarios tiene cuatro ramas de las que sólo se leen dos.
         */
        const clases = [`${CARRIL_DEL_LIENZO}-hueco`];
        if (conRotulo) clases.push(`${CARRIL_DEL_LIENZO}-hueco-ancho`);
        if (apagado) clases.push(QUIETA_EN_EL_LIENZO);
        return (
          /*
           * `aria-disabled` Y NUNCA `disabled`: un `<button>` al que se le pone `disabled`
           * TENIENDO EL FOCO lo pierde, y el foco cae al `<body>`. Aquí eso es peor que en un
           * formulario de página, porque la tira vive dentro del recuadro y volver cuesta
           * tabular la cabecera entera de la Sala. Y estos cuadrados se apagan solos: basta
           * que el de al lado deje de ser legal en mitad de un turno.
           */
          <button
            key={c.clave}
            type="button"
            className={clases.join(' ')}
            aria-disabled={apagado}
            aria-label={c.nombre}
            title={c.ayuda === undefined || c.ayuda.length === 0 ? c.nombre : `${c.nombre}. ${c.ayuda}`}
            onClick={() => {
              if (apagado) return;
              alTocar(c);
            }}
          >
            {c.marca === undefined || c.marca === null ? null : (
              /*
               * LA MARCA SE POSA DENTRO DEL CUADRADO y no puede ser `border`: un filo le
               * comería al glifo el sitio que tiene, y empujar en el flujo correría el número
               * de su centro. Va detrás del glifo (`z-index`) y centrada en el cuadrado ENTERO,
               * para que la fila no se lea ondulada según qué cuadrado tenga marca.
               */
              <span className={`${CARRIL_DEL_LIENZO}-marca`} style={{ background: c.marca }} aria-hidden="true" />
            )}
            <span className={`${CARRIL_DEL_LIENZO}-glifo`} aria-hidden="true">
              {c.glifo}
            </span>
            {/*
              EL RENGLÓN DE ABAJO, cuando lo hay. Va DESPUÉS del glifo en el marcado porque el
              cuadrado ancho es una columna y el orden del marcado es el orden de arriba abajo:
              el verbo primero y de qué va después, que es como se lee «Hi / Mayor».

              Y SIN COLOR PROPIO EN LA HOJA, que es la mitad que no se ve: un `color` puesto en
              este `<span>` gana SIEMPRE a la clase que apaga —que va en el `<button>` y llega
              aquí sólo por herencia—, y un cuadrado quieto saldría con el verbo tenue y el
              rótulo encendido. Eso no es apagado a medias: es la señal de «esto no se puede
              pulsar» rota justo en el renglón que se acaba de añadir para que se lea.
            */}
            {conRotulo ? (
              <span className={`${CARRIL_DEL_LIENZO}-rotulo`} aria-hidden="true">
                {c.rotulo}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
