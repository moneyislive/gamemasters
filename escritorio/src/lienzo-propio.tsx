/**
 * LO QUE TODO PINTOR PROPIO DE ESTE CLIENTE NECESITA, ESCRITO UNA VEZ Y SIN SABER
 * A QUÉ SE JUEGA: traer un `.glb`, no caerse si el `Canvas` revienta, mover la
 * cámara aérea con la rueda y con dos dedos, encerrar el foco dentro de una caja
 * modal y preguntar «elige una».
 *
 * ═══ QUÉ ES ESTO Y DE DÓNDE SALE ═══
 *
 * Todo lo de aquí vivía PRIVADO dentro de `riberas-en-tres.tsx`, que fue el primer
 * pintor propio del escritorio. Cuando llegó el segundo —el Burgo— había dos
 * caminos: mover aquellas piezas aquí y dejar a Riberas importándolas, o COPIARLAS.
 * Se copian, y la razón no es pereza: `verificar-escritorio.tsx` ata a Riberas por
 * REGEX LITERALES sobre su fuente —dónde avisa del recuadro, en qué orden mira el
 * foco, cómo compone sus seis cribas—, y mover una función de fichero pone rojas
 * comprobaciones que no hablan de este trabajo. Riberas no se toca en esta fase:
 * lo dice el §6.2 del diseño del Burgo con todas sus letras.
 *
 * Lo que sí se comparte, y es lo único que NO se puede duplicar, es LA PILA DE
 * TRAMPAS DE FOCO: `armarUnaTrampa` / `mandaEstaTrampa` viven en un array de módulo
 * de `riberas-en-tres.tsx` y son quienes deciden qué caja modal se queda el
 * `Escape`. Dos pilas serían dos cajas creyéndose las de encima, y `Escape`
 * cerraría las dos de un golpe. Por eso se importan de allí y no se copian, aunque
 * el resto del fichero sí.
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
import type { ReactNode, RefObject } from 'react';
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
/*
 * LA PILA DE TRAMPAS ES UNA, Y POR ESO ESTAS TRES SE IMPORTAN EN VEZ DE COPIARSE.
 * Ver la cabecera: dos pilas dejarían que `Escape` cerrara de un golpe el menú y el
 * cajón de debajo.
 */
import { armarUnaTrampa, loQueHaceLaTrampa, mandaEstaTrampa, RAIZ_DE_LA_CASA } from './riberas-en-tres';
import type { ElFocoDeLaTrampa } from './riberas-en-tres';

// ---------------------------------------------------------------------------
// La raíz de la letra, medida y no supuesta
// ---------------------------------------------------------------------------

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
}: LoQueVeLaCamara): null {
  const { camera, gl, scene } = useThree();
  const mirador = useRef<Mirador>(miradorDeSalida);

  useEffect(() => {
    const lienzo = gl.domElement;
    /* Si un día el recuadro no estuviera, se cae al lienzo: peor, pero no roto. */
    const caja: HTMLElement = lienzo.closest<HTMLElement>(`.${recuadro}`) ?? lienzo;

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
    const rueda = (e: WheelEvent): void => {
      const donde = e.target instanceof Element ? e.target : null;
      if (seDesplazanSolas.some((clase) => donde?.closest(`.${clase}`) != null)) return;
      e.preventDefault();
      if (donde?.closest(`.${velo}`) != null) return;
      alAcercarse(acercando(cercania.current, pasosDeLaRueda(e), limites));
    };
    /* Sin esto, el primer arrastre con el botón derecho abre el menú del navegador encima del mundo. */
    const menuDelSistema = (e: MouseEvent): void => {
      e.preventDefault();
    };

    window.addEventListener('pointerdown', baja);
    window.addEventListener('pointermove', mueve);
    window.addEventListener('pointerup', suelta);
    window.addEventListener('pointercancel', suelta);
    caja.addEventListener('wheel', rueda, { passive: false });
    lienzo.addEventListener('contextmenu', menuDelSistema);
    return () => {
      window.removeEventListener('pointerdown', baja);
      window.removeEventListener('pointermove', mueve);
      window.removeEventListener('pointerup', suelta);
      window.removeEventListener('pointercancel', suelta);
      caja.removeEventListener('wheel', rueda);
      lienzo.removeEventListener('contextmenu', menuDelSistema);
    };
  }, [gl, alcance, cercania, alAcercarse, recuadro, seDesplazanSolas, velo, limites]);

  useFrame(() => {
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
// La trampa de foco de una caja modal
// ---------------------------------------------------------------------------

/**
 * ENCERRAR EL FOCO DENTRO DE UNA CAJA MODAL, con `Escape` y con rescate.
 *
 * El oyente va en `document` y NO en la caja, y eso es lo que costó tres turnos de
 * partida: un oyente en la caja sólo oye lo que pasa con el foco DENTRO, y el foco se
 * sale solo en cuanto una jugada cambia la lista de opciones —el botón que lo tenía se
 * desmonta y el navegador lo suelta al `<body>` sin avisar a nadie—. Con la pila de
 * trampas, seguir en `document` no le quita el `Escape` a la caja que haya encima.
 *
 * El RESCATE es la otra mitad: se vigila la caja por dentro con un `MutationObserver`, y
 * cada vez que cambia, si el foco se ha caído fuera, vuelve a la caja. Desde ahí el
 * tabulador entra otra vez, que es lo que se perdía.
 *
 * El reparto de teclas lo decide `loQueHaceLaTrampa`, que es una función pura de
 * `riberas-en-tres.tsx` y se puede llamar desde Node con una tabla —incluida la fila
 * `fuera`, que es la del fallo—. Aquí sólo se lee dónde está el foco y se obedece.
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
 * Es MODAL con las cuatro mitades, y ninguna sobra: el VELO, sin el cual un clic fuera
 * cierra el menú Y toca el tablero de debajo; `role="dialog"` con `aria-modal` y NOMBRE
 * —que es el título de la pregunta—, sin el cual un lector sigue leyendo lo de abajo; la
 * TRAMPA DE FOCO; y el foco DE VUELTA al cerrar, que lo hace quien lo abrió porque adonde
 * vuelve depende de quién fue.
 *
 * `fijo` coloca la caja sobre la VENTANA en vez de sobre el recuadro, y hace falta porque
 * hay dos pantallas: en el lienzo el recuadro vale la ventana entera y debajo no hay nada;
 * en el respaldo no hay recuadro y la página RUEDA, así que una caja colocada sobre el
 * flujo se quedaría centrada en un documento de mil puntos, o sea fuera de la pantalla.
 *
 * `Dejarlo` NO se apaga con `quieto`: cerrar el menú no manda nada, y dejar sin salida a
 * quien lo abrió mientras una petición viaja es encerrarlo delante de botones apagados.
 */
export function ElijeUna({
  titulo,
  nota,
  opciones,
  quieto,
  fijo = false,
  velo,
  menu,
  alElegir,
  alDejarlo,
}: {
  titulo: string;
  /** Un renglón en tenue bajo el título, para las preguntas que tienen estado que contar. */
  nota?: string;
  opciones: readonly Opcion[];
  quieto: boolean;
  fijo?: boolean;
  /** Las clases del velo y de la caja: cada pintor tiene las suyas y la cámara las busca. */
  velo: string;
  menu: string;
  alElegir: (o: Opcion) => void;
  alDejarlo: () => void;
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
        {nota === undefined ? null : <p className="letra-chica">{nota}</p>}
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
