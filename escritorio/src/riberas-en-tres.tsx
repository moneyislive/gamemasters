/**
 * RIBERAS EN TRES DIMENSIONES, EN EL ESCRITORIO: el pintor propio del juego sobre el
 * motor de arcade, montado en un lienzo dentro de la mesa de siempre.
 *
 * ═══ QUÉ ES, Y QUÉ NO ═══
 *
 * Riberas sigue siendo un arcade de `mueble: 'tablero'`: su vista trae el
 * `TableroDeclarado` de siempre y `Paneles` lo sigue leyendo en el raíl. Lo que
 * cambia es QUIÉN pinta la parte grande: en vez del `Retablo` genérico, aquí se
 * monta la escena del delta (`escenas/delta.tsx`) con lo que la mesa manda,
 * traducido UNA sola vez en `shared/arcade/juegos/riberas-en-tres.ts`. Es el
 * mismo precedente que La Frente en la app: un pintor propio para un juego,
 * enchufado donde antes iba el mueble genérico, sin tocar el contrato.
 *
 * NO HAY NINGUNA REGLA AQUÍ. Dónde se puede construir lo dice `colocandoEnTres`
 * leyendo las mismas `opciones()` que el reductor exige; qué se manda al soltar
 * viene ya montado dentro de cada sitio; con quién se puede trocar lo dice
 * `truequesPosibles`. Este fichero recoge y manda. Si aquí apareciera un `if`
 * sobre una choza o una vereda, la traducción habría dejado de ser una.
 *
 * ═══ EL SVG NO SE VA: ES EL RESPALDO, Y NO ES OPCIONAL ═══
 *
 * Cuatro cosas pueden faltar y ninguna puede dejar la mesa sin pintar: el `.glb`
 * no llega, el `Canvas` revienta al nacer —sin WebGL, sin contexto—, esto se
 * renderiza en Node sin ventana (`verificar-escritorio`), o LA MESA NO CABE EN
 * TRES DIMENSIONES. En los tres primeros casos y en el último se pinta EL RETABLO
 * DE SIEMPRE, con sus acciones y sus opciones sueltas, y una línea en letra chica
 * de por qué. Es la regla del §5 del Muelle llevada a la partida: si el mundo no
 * arranca, se juega igual.
 *
 * ═══ «SIN DELTA» NO ES «SIN ISLAS»: SON DOS PREGUNTAS ═══
 *
 * `tableroEnTres` devuelve `null` por DOS motivos que no se parecen en nada: el
 * delta aún no se ha repartido —la mesa está reunida y sólo hay «Empezar»— o la
 * mesa tiene cinco o seis colonos y el atlas sólo trae cuatro colores de jugador
 * (`seVeEnTres`). La primera versión leía el `null` como «no hay islas» y pintaba
 * un formulario suelto; con cinco colonos y diecinueve islas repartidas eso eran
 * cincuenta y cuatro botones de «Fundar aquí» sin tablero, sin telón y sin el
 * aviso del turno. Y como la Sala enseña el Muelle mientras la mesa se reúne,
 * esa rama casi sólo se alcanzaba en el caso malo. Así que se pregunta al
 * TABLERO DECLARADO si hay algo que pintar (`caras.length`) y a `seVeEnTres` si
 * cabe en el lienzo; sin islas, formulario; con islas y sin colores, el retablo.
 *
 * ═══ EL MODELO SE PIDE UNA VEZ POR PESTAÑA ═══
 *
 * `tablero.glb` pesa lo que pesa y se pide por HTTP al servidor de juego. Cada
 * revisión de la mesa repinta este componente; volver a pedirlo —o volver a
 * parsearlo— en cada montaje sería un telón negro por jugada. La promesa vive en
 * el módulo: la primera mesa lo trae, las siguientes lo encuentran. Si falló, se
 * suelta la promesa para que la siguiente mesa lo vuelva a intentar.
 *
 * ═══ LA CÁMARA ES LA DEL BANCO, Y ESCUCHA EN LA VENTANA ═══
 *
 * El mirador (`escenas/camara.ts`) va por `ref` y no por estado: son sesenta
 * cambios por segundo mientras se arrastra. Se escucha en la ventana y no en el
 * lienzo por lo que cuenta la cabecera de `camara.ts`: así la cámara llega SIEMPRE
 * después de la escena y puede mirar si la barra o la mano ya se quedaron el gesto
 * (`esDeLaInterfaz`). Y soltar fuera del lienzo también termina el arrastre.
 *
 * Y el ojo se pone SEGÚN LA PROPORCIÓN DEL LIENZO, igual que en el banco: en un
 * monitor no cambia nada, pero en una tableta en retrato o en la rejilla de menos
 * de 900 px —donde el raíl baja y el lienzo se estrecha— sin ella el delta se
 * salía por los lados. Como al alejarse el ojo la niebla fija del banco quedaría
 * DELANTE del mundo y lo blanquearía, la niebla se mide desde el ojo y no desde
 * el centro: se mueve con la cámara en cada fotograma.
 *
 * ═══ Y AHORA SE ACERCA, QUE SON DOS GESTOS Y NO UNO ═══
 *
 * Ver el delta entero desde el aire está bien para decidir la jugada y no sirve
 * para MIRARLA: las casas miden cinco unidades sobre un tablero de doscientas.
 * Así que la rueda acerca hasta media comarca llenando el lienzo. Pero acercarse
 * siempre al centro deja el borde del delta sin poder verse nunca —el tablero se
 * escapa por los lados en cuanto se entra—, así que hace falta también MOVER LA
 * MIRADA. Las dos cosas van juntas: sin la segunda, la primera se queda a medias.
 *
 * El reparto de los botones, que es lo que hay que saber para usarlo:
 *
 *   · LA RUEDA acerca y aleja. El oyente va sobre EL RECUADRO —el `.riberas-lienzo`
 *     que lleva dentro el `<canvas>` y el botón de volver— y con `passive: false`,
 *     porque hay que llamar a `preventDefault`: sin eso el navegador se lleva el
 *     gesto para desplazar la página y la Sala entera baja mientras uno cree estar
 *     haciendo zoom. Es el fallo clásico, y no se ve como un fallo del zoom sino
 *     como una página que se mueve sola. Y va en el recuadro y NO en el `<canvas>`
 *     porque el botón de volver es hermano suyo y no hijo: con el oyente en el
 *     lienzo, girar la rueda encima de ese botón —que es justo donde está el ratón
 *     en cuanto el botón aparece— no pasaba por ningún `preventDefault` y la Sala
 *     se desplazaba precisamente al intentar salir del acercamiento.
 *   · EL ARRASTRE IZQUIERDO sigue girando, exactamente como antes. Es el gesto que
 *     ya conoce quien viene del banco, y sobre todo es el que la escena necesita
 *     libre: coger una pieza de la barra, soltarla en un anillo y coger una carta
 *     de la mano son todos clic izquierdo, y `esDeLaInterfaz` es lo que decide.
 *   · EL ARRASTRE CON EL BOTÓN DERECHO —o con MAYÚSCULAS apretada, para quien no
 *     tenga botón derecho a mano— mueve la mirada por el tablero. Se elige el
 *     derecho justamente porque la escena no lo usa para nada: cualquier reparto
 *     del izquierdo le robaría un gesto a la mano o a la barra. Y lleva su
 *     `contextmenu` con `preventDefault`, o al primer arrastre se abre el menú del
 *     navegador encima del delta.
 *   · DOS DEDOS pellizcan para acercar y pasean la mirada con su punto medio. En
 *     esta casa ningún juego es sólo para PC, y con el dedo no hay `wheel`, no hay
 *     botón derecho y no hay Mayúsculas: sin esto, en una tableta el delta se
 *     giraba y nada más, el botón de volver no aparecía NUNCA —porque nada llamaba
 *     a `alAcercarse`—, y el navegador tampoco podía suplirlo, que
 *     `touch-action: none` ya le había quitado su propio pellizco. El pellizco
 *     entra por `pellizcando`, que recibe una escala y no unos pasos, y el paseo
 *     por el mismo `arrastrandoLaMirada` del botón derecho. Un dedo solo sigue
 *     girando, que es lo que ya hacía y lo que la escena necesita libre.
 *
 * ═══ UN GESTO CADA VEZ, Y QUIEN LO EMPIEZA SE LO QUEDA ═══
 *
 * Los punteros apoyados se cuentan. Apretar el izquierdo en mitad de un
 * desplazamiento con el derecho cambiaba el gesto a girar a media carrera, y el
 * tablero pegaba un bandazo sin que nadie hubiera soltado nada; ahora un arrastre
 * en marcha no se lo lleva nadie hasta que se sueltan TODOS los botones.
 *
 * Y la cuenta de punteros es también lo que distingue dos dedos de dos botones: el
 * ratón manda siempre EL MISMO `pointerId` apriete lo que apriete, así que la
 * cuenta no sube y el segundo botón no abre ningún pellizco; dos dedos son dos
 * punteros, y ésos sí.
 *
 * NINGUNA DE ESAS CUENTAS SE ESCRIBE AQUÍ. `escenas/acercar.ts` da `acercando`,
 * `arrastrandoLaMirada` y `ojoYMira`, y sus topes están medidos desde Node; una
 * cuenta de cámara escrita en este fichero sólo se podría comprobar abriendo la
 * pantalla y mirando. Lo único que se traduce aquí son las unidades del suceso de
 * rueda, que no son pasos y que cada navegador cuenta a su manera.
 *
 * ═══ Y SIEMPRE HAY SALIDA ═══
 *
 * Un zoom sin vuelta atrás atrapa: se entra a mirar una esquina y ya no se sabe
 * volver al tablero. Por eso hay un botón sobre el lienzo, «Ver el tablero
 * entero», que devuelve `comoAlPrincipio()`. Sólo se enseña cuando hace falta
 * —`estaComoAlPrincipio` es falso—: un botón que siempre está no informa de nada.
 *
 * ═══ LO QUE LA REVISIÓN DE LA MESA NO TOCA ═══
 *
 * La cámara. Al cambiar `rev` se suelta lo que se tenía en la mano —ver más
 * abajo— y NO se recoloca la vista: quien está mirando una esquina de cerca se
 * queda donde estaba aunque otro juegue. Una cámara que salta con cada jugada
 * ajena marea y hace imposible construir, y el sondeo trae una revisión nueva
 * cada pocos segundos. Por eso el acercamiento vive en una `ref` y no en el
 * estado, y por eso no aparece en ningún efecto que dependa de `puesta.rev`.
 *
 * ═══ LO QUE ESTO NO IMPORTA ═══
 *
 * Nada de `app/` (lo vigila `verify:fronteras`), nada de `drei`, y de
 * `escenas/embarcadero/` sólo lo que decide quién tiene tema (`tema.ts`, y ésa la
 * lee la Sala). La ruta del modelo y la semilla vienen de `escenas/ruta-de-modelos.ts`
 * y `shared/mecanicas/semilla.ts`, que no arrastran ninguna tabla: aquí hubo una copia
 * de cada una, y la de la semilla ya no pasaba a mayúsculas.
 */
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, Fog, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Cercania } from '../../escenas/acercar';
import {
  acercando,
  arrastrandoLaMirada,
  CERCANIA_DE_SALIDA,
  comoAlPrincipio,
  estaComoAlPrincipio,
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
import { Delta, encuadreDelDelta } from '../../escenas/delta';
import { catalogoDeModelos } from '../../escenas/modelos';
import type { CatalogoDeModelos } from '../../escenas/modelos';
import { rutaDelTablero } from '../../escenas/ruta-de-modelos';
import type { Opcion } from '../../shared/arcade';
import {
  barraEnTres,
  bienesQueSeCambianPor,
  colocandoEnTres,
  manoEnTres,
  opcionesFueraDelTablero,
  seVeEnTres,
  tableroEnTres,
  truequesPosibles,
} from '../../shared/arcade/juegos/riberas-en-tres';
import type { IdDeLaBarra, TableroEnTres, TruequePosible } from '../../shared/arcade/juegos/riberas-en-tres';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import type { TableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { Formulario } from './formulario';
import type { LaMesa, MesaVista } from './mesa';
import type { ArcadeDelCatalogo } from './muebles';
import { opcionesSueltas } from './plan';
import { loQueSeDiceDeUnFallo } from './red-de-seguridad';
import { AccionesDelTablero, Retablo } from './retablo';

/**
 * De dónde se trae el tablero: la única ruta, la de `escenas/ruta-de-modelos.ts`, que
 * es la que sirve `server/src/routes/modelos.ts`. Relativa: en desarrollo la reenvía el
 * proxy de Vite y en producción es el mismo Node que sirve esta página.
 */
const RUTA_DEL_TABLERO = rutaDelTablero();

/** El azul del cielo de mediodía, que es también el color al que se funde la niebla. */
const COLOR_DEL_CIELO = '#9ec9e2';

/** El título de este pintor sobre el lienzo. Es chrome de la Sala, no una palabra del juego. */
const TITULO_DE_LO_QUE_SE_HACE = 'Lo que puedes hacer';

/**
 * LA SALIDA DEL ACERCAMIENTO, con todas sus letras y no un icono.
 *
 * Es chrome de la Sala igual que el título de arriba: no nombra nada del juego, así
 * que puede escribirse aquí. Y es un rótulo y no una lupa tachada porque quien se ha
 * perdido en una esquina del delta necesita leer la salida, no adivinarla.
 */
const VOLVER_AL_TABLERO_ENTERO = 'Ver el tablero entero';

/**
 * EL RECUADRO DEL MUNDO, con su nombre escrito UNA vez.
 *
 * Es la caja que lleva dentro el `<canvas>` y el botón de volver, y hacen falta las dos
 * cosas a la vez: el JSX la pinta y la cámara la BUSCA —`closest`— para colgar de ella el
 * oyente de la rueda, que no puede ir en el lienzo porque el botón es hermano suyo. Con
 * el nombre escrito dos veces, renombrar la clase en la hoja de estilo dejaría la rueda
 * colgada del lienzo otra vez y sin un solo error: la Sala volvería a desplazarse sola.
 */
const RECUADRO_DEL_LIENZO = 'riberas-lienzo';

// ---------------------------------------------------------------------------
// El catálogo de modelos, una vez por pestaña
// ---------------------------------------------------------------------------

let catalogoEnCamino: Promise<CatalogoDeModelos> | null = null;

/**
 * Trae y parsea `tablero.glb`, y lo recuerda. Ver la cabecera: una promesa por
 * pestaña, y si falla se suelta para que el siguiente montaje lo intente otra vez.
 *
 * `GLTFLoader.parseAsync` sobre los bytes de un `fetch` relativo, y no `.load(url)`:
 * así el error de red se lee como lo que es —«contestó 404»— y no como un `ProgressEvent`
 * sin texto, que es lo que devuelve el cargador cuando la petición falla.
 */
function traerElCatalogo(): Promise<CatalogoDeModelos> {
  if (catalogoEnCamino !== null) return catalogoEnCamino;
  const promesa = (async (): Promise<CatalogoDeModelos> => {
    const r = await fetch(RUTA_DEL_TABLERO);
    if (!r.ok) throw new Error(`${RUTA_DEL_TABLERO} contestó ${String(r.status)}`);
    const bytes = await r.arrayBuffer();
    const gltf = await new GLTFLoader().parseAsync(bytes, '');
    return catalogoDeModelos(gltf.scene);
  })();
  catalogoEnCamino = promesa;
  promesa.catch(() => {
    if (catalogoEnCamino === promesa) catalogoEnCamino = null;
  });
  return promesa;
}

/**
 * El catálogo desde un componente: `null` mientras llega, y el motivo si no llegó.
 *
 * `cancelado` por lo mismo que en el banco: si la mesa se desmonta mientras el
 * fichero viaja, escribir el estado después es un aviso de React y una referencia
 * viva a una escena que ya no se dibuja. Y sólo se pide cuando HACE FALTA: en Node
 * no corren los efectos, y con una mesa que va a caer al retablo —más colonos que
 * colores— descargar dos megas para no montar el lienzo sería tirarlos. El gancho
 * se llama siempre (reglas de los ganchos); lo que se condiciona es la petición.
 */
function usarElCatalogo(hazFalta: boolean): { modelos: CatalogoDeModelos | null; fallo: string | null } {
  const [modelos, ponerModelos] = useState<CatalogoDeModelos | null>(null);
  const [fallo, ponerFallo] = useState<string | null>(null);

  useEffect(() => {
    if (!hazFalta) return undefined;
    let cancelado = false;
    traerElCatalogo().then(
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
  }, [hazFalta]);

  return { modelos, fallo };
}

// ---------------------------------------------------------------------------
// La cámara aérea
// ---------------------------------------------------------------------------

/**
 * LA NIEBLA, MEDIDA DESDE EL OJO. El banco la pone a 2,6 y 7,5 alcances del centro
 * con la cámara quieta a `LEJANIA` (1,77) alcances; medidos desde esa cámara son
 * 0,85 y 5,7 alcances por delante del ojo. Aquí el ojo se aleja cuando el lienzo
 * es estrecho, y una niebla clavada al centro se quedaría delante del delta y lo
 * dejaría blanqueado. Así que se lleva con la cámara: mismo aspecto en el
 * monitor, y el mismo aspecto desde más lejos.
 */
const NIEBLA_EMPIEZA_A = 0.85;
const NIEBLA_TERMINA_A = 5.7;

/**
 * DE LAS UNIDADES DE LA RUEDA A LOS PASOS DE `acercar.ts`.
 *
 * Es lo ÚNICO que este fichero calcula, y no es una cuenta de cámara: es traducir un
 * suceso del navegador. `acercando` cuenta en PASOS —un paso es «un poco más cerca»,
 * y lo que vale un paso lo decide `PASO_DE_ACERCAMIENTO`, no esto—, mientras que el
 * navegador manda un `deltaY` que no es ninguna unidad: un ratón de muesca suelta cien
 * píxeles de golpe, un panel táctil suelta cuatro sesenta veces por segundo, y un
 * Firefox con la rueda en modo línea manda TRES LÍNEAS. Sin traducir los tres modos a
 * lo mismo, el mismo gesto acerca un dedo en un aparato y cruza el tablero entero en
 * otro, y eso no se ve como un fallo de conversión sino como un zoom roto.
 *
 * ═══ Y EL MODO LÍNEA SE CUENTA EN LÍNEAS, NO EN PÍXELES ═══
 *
 * Esto pasaba por el modo línea convirtiendo cada línea a dieciséis píxeles: las tres
 * líneas de una muesca de Firefox daban cuarenta y ocho, o sea MEDIA muesca. El zoom
 * iba exactamente a la mitad de velocidad que en cualquier otro navegador, y eso nadie
 * lo mide: se nota como que «en Firefox cuesta más acercarse», que es de las cosas que
 * se achacan al ordenador. Un modo cuyas unidades son líneas no necesita pasar por
 * píxeles: tres líneas son una muesca, y de ahí sale el paso directamente.
 *
 * El tope de golpe es por el panel táctil con inercia: un gesto de dos dedos manda una
 * ráfaga larguísima, y sin tope un solo empujón salta del aire al suelo.
 */
const PIXELES_POR_MUESCA = 100;
const LINEAS_POR_MUESCA = 3;
const MUESCAS_POR_PAGINA = 4;
const MUESCAS_DE_GOLPE = 4;

function pasosDeLaRueda(e: WheelEvent): number {
  const muescas =
    e.deltaMode === 1
      ? e.deltaY / LINEAS_POR_MUESCA
      : e.deltaMode === 2
        ? e.deltaY * MUESCAS_POR_PAGINA
        : e.deltaY / PIXELES_POR_MUESCA;
  /* Rueda hacia arriba, más cerca: es lo que hace cualquier mapa, y de ahí el signo. */
  return -Math.min(MUESCAS_DE_GOLPE, Math.max(-MUESCAS_DE_GOLPE, muescas));
}

/**
 * UN SOLO `Vector3` PARA TODA LA PESTAÑA. La niebla se mide sesenta veces por segundo
 * y pedir memoria sesenta veces por segundo para tres números es lo que llena el
 * recolector de basura de fantasmas y deja un tirón cada pocos segundos.
 */
const PUNTO_DE_MIRA = new Vector3();

/**
 * El mirador del banco, sin la vista de suelo: aquí se juega desde el aire — y ahora
 * también de cerca.
 *
 * La aritmética está en `escenas/camara.ts` y en `escenas/acercar.ts`, donde se puede
 * medir desde Node; esto sólo escucha el ratón y coloca la cámara en cada fotograma.
 * Sólo cuentan los gestos que empiezan SOBRE ESTE lienzo —`e.target === lienzo`—, así
 * que arrastrar por el raíl o por el formulario no mueve nada.
 *
 * Quién manda en cada botón está en la cabecera del fichero. Lo que importa aquí es
 * que `esDeLaInterfaz` se pregunta ANTES de quedarse con el gesto, igual que antes: si
 * la barra o la mano ya se quedaron el `pointerdown`, la cámara no lo toca.
 *
 * La proporción del lienzo entra en cada fotograma y no una vez: el raíl baja o
 * sube al cruzar los 900 px, la ventana se estira, la tableta se gira, y el
 * `<canvas>` cambia de forma sin que se remonte nada. Leer `clientWidth` por
 * fotograma cuesta menos que un observador de tamaño y no se queda nunca atrás.
 *
 * El acercamiento NO se guarda aquí sino en quien monta este componente, y por una
 * razón de pantalla: el botón de volver vive fuera del `Canvas` y tiene que saber si
 * hay algo a lo que volver. La `ref` entra por la puerta y se LEE aquí; escribirla es
 * cosa de `alAcercarse`, que es quien de paso enciende y apaga el botón.
 */
function CamaraAerea({
  alcance,
  cercania,
  alAcercarse,
}: {
  alcance: number;
  cercania: RefObject<Cercania>;
  alAcercarse: (nueva: Cercania) => void;
}): null {
  const { camera, gl, scene } = useThree();
  const mirador = useRef<Mirador>(MIRADOR_DE_SALIDA);

  useEffect(() => {
    const lienzo = gl.domElement;
    /*
     * EL RECUADRO NO ES EL LIENZO. Es el `.riberas-lienzo` que lleva dentro el `<canvas>`
     * Y el botón de volver, y es de él —no del lienzo— de quien cuelga la rueda: ver la
     * cabecera. Se busca por la misma clase que pinta el JSX, y si un día no estuviera se
     * cae al lienzo, que es lo que había antes: peor, pero no roto.
     */
    const recuadro: HTMLElement = lienzo.closest<HTMLElement>(`.${RECUADRO_DEL_LIENZO}`) ?? lienzo;

    let desde: { x: number; y: number } | null = null;
    let gira = false;
    /* De quién es ESTE arrastre: del rumbo (izquierdo) o de la mirada (derecho o Mayúsculas). */
    let mueveLaMirada = false;
    /*
     * QUIÉN ESTÁ APOYADO AHORA MISMO, por `pointerId`. Con el ratón esto vale siempre uno
     * —los botones comparten puntero—, así que sólo llega a dos con dos dedos. Ver la
     * cabecera: es la misma cuenta la que abre el pellizco y la que impide que un segundo
     * botón le robe el gesto a un arrastre en marcha.
     */
    const apoyados = new Map<number, { x: number; y: number }>();
    /* El pellizco en curso: con qué acercamiento y con qué separación empezó, y dónde va su centro. */
    let pellizco: { alEmpezar: number; separacion: number; centro: { x: number; y: number } } | null = null;

    const pantalla = (): { ancho: number; alto: number } => ({
      ancho: lienzo.clientWidth,
      alto: lienzo.clientHeight,
    });

    /*
     * La separación y el punto medio de los dos dedos, en píxeles de pantalla. No es una
     * cuenta de cámara —de eso no hay ninguna aquí—: son las mismas coordenadas del suceso
     * que ya se restan para el arrastre, y lo que sale de aquí entra crudo en
     * `pellizcando` y en `arrastrandoLaMirada`, que son quienes hacen la aritmética.
     */
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
         * DOS DEDOS. Se guardan el acercamiento y la separación DE PARTIDA, y a partir de
         * ahí `pellizcando` trabaja con la razón entre la separación de ahora y aquélla.
         * Guardar el punto de partida en vez de ir acumulando es lo que hace que separar
         * los dedos y volver a juntarlos deje el tablero exactamente donde estaba.
         *
         * El suelo de un píxel es para el caso degenerado de dos dedos en el mismo punto:
         * sin él la razón sería infinita y el pellizco no haría nada en todo el gesto.
         */
        pellizco = {
          alEmpezar: cercania.current.factor,
          separacion: Math.max(1, dos.separacion),
          centro: dos.centro,
        };
        /* Y el arrastre de un dedo se cancela: lo que había empezado a girar ya no gira. */
        desde = null;
        gira = false;
        mueveLaMirada = false;
        return;
      }

      /*
       * QUIEN EMPEZÓ EL ARRASTRE SE LO QUEDA. Apretar el izquierdo en mitad de un
       * desplazamiento con el botón derecho cambiaba el gesto a girar a media carrera.
       */
      if (desde !== null) return;

      desde = { x: e.clientX, y: e.clientY };
      gira = false;
      /*
       * Se decide AL EMPEZAR y no en cada movimiento: soltar la tecla a mitad de
       * gesto cambiaría de girar a desplazar sin que nadie lo haya pedido, y el
       * tablero pegaría un bandazo en medio del arrastre.
       */
      mueveLaMirada = e.button === 2 || e.shiftKey;
    };
    const mueve = (e: PointerEvent): void => {
      if (apoyados.has(e.pointerId)) apoyados.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pellizco !== null) {
        const dos = dosDedos();
        if (dos === null) return;
        /*
         * Las dos mitades del gesto, en este orden: primero el paseo del punto medio —por
         * el mismo camino que el botón derecho, para que mover con dos dedos y mover con
         * el derecho sean el mismo movimiento— y encima el acercamiento, que conserva ese
         * centro porque `pellizcando` sólo toca el factor.
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
        alAcercarse(pellizcando(paseada, pellizco.alEmpezar, dos.separacion / pellizco.separacion));
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
         * El rumbo entra porque la mirada se mueve en los ejes de QUIEN MIRA y no en
         * los del mundo: con el tablero girado, arrastrar a un lado movería el mapa
         * en diagonal. Lo cuenta `arrastrandoLaMirada`, que es quien hace la cuenta.
         */
        alAcercarse(
          arrastrandoLaMirada(cercania.current, dx, dy, mirador.current.rumbo, alcance, pantalla()),
        );
      } else {
        mirador.current = tirandoDelMirador(mirador.current, dx, dy, pantalla());
      }
      desde = { x: e.clientX, y: e.clientY };
    };
    const suelta = (e: PointerEvent): void => {
      apoyados.delete(e.pointerId);
      /*
       * Con un dedo menos ya no hay pellizco. El que queda apoyado NO sigue arrastrando:
       * levantar un dedo de un pellizco y que el mundo se pusiera a girar de golpe con el
       * otro es un bandazo, y para volver a girar basta con volver a apoyar.
       */
      if (apoyados.size < 2) pellizco = null;
      /*
       * Y NO SE SUELTA MIENTRAS QUEDE UN BOTÓN APRETADO. Soltar el izquierdo en mitad de
       * un desplazamiento con el derecho terminaba un gesto que seguía en marcha, y el
       * tablero se quedaba clavado con el botón todavía apretado.
       */
      if (e.buttons !== 0) return;
      desde = null;
      gira = false;
      mueveLaMirada = false;
    };
    /*
     * `passive: false` y `preventDefault`, o la Sala entera se desplaza mientras uno
     * cree estar acercándose. El navegador supone que una rueda sobre un elemento es
     * para desplazar la página y sólo deja quitárselo a un oyente que lo diga al
     * apuntarse: `addEventListener('wheel', …)` es pasivo por omisión.
     */
    const rueda = (e: WheelEvent): void => {
      e.preventDefault();
      alAcercarse(acercando(cercania.current, pasosDeLaRueda(e)));
    };
    /* Sin esto, el primer arrastre con el botón derecho abre el menú del navegador encima del delta. */
    const menuDelSistema = (e: MouseEvent): void => {
      e.preventDefault();
    };

    window.addEventListener('pointerdown', baja);
    window.addEventListener('pointermove', mueve);
    window.addEventListener('pointerup', suelta);
    window.addEventListener('pointercancel', suelta);
    recuadro.addEventListener('wheel', rueda, { passive: false });
    lienzo.addEventListener('contextmenu', menuDelSistema);
    return () => {
      window.removeEventListener('pointerdown', baja);
      window.removeEventListener('pointermove', mueve);
      window.removeEventListener('pointerup', suelta);
      window.removeEventListener('pointercancel', suelta);
      recuadro.removeEventListener('wheel', rueda);
      lienzo.removeEventListener('contextmenu', menuDelSistema);
    };
  }, [gl, alcance, cercania, alAcercarse]);

  useFrame(() => {
    const lienzo = gl.domElement;
    const proporcion = lienzo.clientHeight > 0 ? lienzo.clientWidth / lienzo.clientHeight : undefined;
    /*
     * Así se junta todo, y es la única forma que hay de juntarlo: el mirador dice la
     * DIRECCIÓN, el acercamiento dice a qué distancia y adónde se mira, y `ojoYMira`
     * los suma —incluida la altura mínima sobre el agua, sin la cual el ojo se mete
     * dentro de una colina al acercarse—.
     */
    const { ojo, mira } = ojoYMira(cercania.current, alcance, (distancia) =>
      ojoDelMirador(mirador.current, distancia, proporcion),
    );
    camera.position.set(...ojo);
    camera.lookAt(...mira);
    if (scene.fog instanceof Fog) {
      /*
       * LA NIEBLA SE MIDE DEL OJO AL PUNTO DE MIRA, no de la altura del ojo al suelo.
       * Antes bastaba con lo lejos que estaba el ojo del origen porque siempre se
       * miraba al origen; desde que la mirada se puede llevar a un borde del delta,
       * esa cuenta se queda corta —el ojo está lejos del centro pero cerca de lo que
       * mira— y el mundo saldría con niebla encima justo al acercarse a mirarlo.
       */
      const distancia = camera.position.distanceTo(PUNTO_DE_MIRA.set(...mira));
      scene.fog.near = distancia + alcance * NIEBLA_EMPIEZA_A;
      scene.fog.far = distancia + alcance * NIEBLA_TERMINA_A;
    }
  });
  return null;
}

// ---------------------------------------------------------------------------
// El límite del mundo
// ---------------------------------------------------------------------------

/**
 * Si el `Canvas` revienta al nacer, aquí se para y se avisa. Es la misma clase que
 * el `LimiteDelMundo` del muelle —no se exporta de allí a propósito: cada pantalla
 * decide qué hace con el fallo, y ésta cae al SVG—. No pinta nada porque lo que
 * hay que pintar en su lugar lo decide quien la monta.
 */
class LimiteDelMundo extends Component<
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
// El pintor
// ---------------------------------------------------------------------------

export interface LoQueVeRiberas {
  manifiesto: ArcadeDelCatalogo;
  mesa: LaMesa;
  /** La mesa ya puesta: `mesa.mesa` cuando se está dentro. Se pasa aparte para no volver a comprobarlo. */
  puesta: MesaVista;
  /** El tablero declarado que trae la vista. Es lo que pinta el respaldo SVG. */
  tablero: TableroDeclarado;
  opciones: readonly Opcion[];
}

/** A quién se le propone el trueque cuando el juego permite ofrecérselo a varios. */
interface PreguntandoAQuien {
  trueques: readonly TruequePosible<Opcion>[];
}

export function RiberasEnTres({ manifiesto, mesa, puesta, tablero, opciones }: LoQueVeRiberas): JSX.Element {
  const { mover, quieto } = mesa;
  const vista = puesta.vista;
  const yo = puesta.yo;

  /*
   * ═══ LAS ISLAS CONSERVAN SU IDENTIDAD ENTRE SONDEOS, Y ESO ES LO QUE NO TIEMBLA ═══
   *
   * Cada respuesta del servidor trae una vista NUEVA, y `tableroEnTres` fabrica de
   * ella una lista de islas nueva aunque el delta no haya cambiado —y no cambia en
   * toda la partida—. La escena reconstruye el relieve y el plan entero del mundo
   * cuando cambia la identidad de `datos.islas` (`escenas/delta.tsx`, `relieve`):
   * miles de copias reescritas en cada jugada de cualquiera y en cada vuelta del
   * sondeo. Se vería como un tirón por revisión. Así que se firma el contenido de
   * las islas y, si es el mismo, se entrega LA MISMA lista de antes. Piezas y
   * caminos sí van frescos: son lo que cambia.
   */
  const islasVistas = useRef<{ firma: string; islas: TableroEnTres['islas'] } | null>(null);
  const datos = useMemo(() => {
    const crudo = tableroEnTres(vista);
    if (crudo === null) return null;
    const firma = crudo.islas
      .map((i) => `${String(i.hex.q)},${String(i.hex.r)}:${i.terreno}:${String(i.cifra)}`)
      .join('|');
    const antes = islasVistas.current;
    const islas = antes !== null && antes.firma === firma ? antes.islas : crudo.islas;
    islasVistas.current = { firma, islas };
    return { ...crudo, islas };
  }, [vista]);
  const mano = useMemo(() => manoEnTres(vista), [vista]);
  const fuera = useMemo(() => opcionesFueraDelTablero(opciones), [opciones]);

  // -------------------------------------------------------------------------
  // Lo que se tiene en la mano
  // -------------------------------------------------------------------------

  const [tomada, ponerTomada] = useState<IdDeLaBarra | null>(null);
  const [cogida, ponerCogida] = useState<string | null>(null);
  const [preguntando, ponerPreguntando] = useState<PreguntandoAQuien | null>(null);

  /*
   * AL CAMBIAR LA REVISIÓN SE SUELTA TODO. Lo que se tenía agarrado se agarró
   * mirando la mesa anterior: los sitios legales de esa pieza pueden haber dejado
   * de serlo, y la carta cogida puede haberse gastado. Seguir con ello en la mano
   * sería ofrecer soltarlo donde la mesa nueva ya no lo admite.
   */
  useEffect(() => {
    ponerTomada(null);
    ponerCogida(null);
    ponerPreguntando(null);
  }, [puesta.rev]);

  /*
   * La barra y lo que se está colocando se DERIVAN de la vista en cada render, no se
   * guardan: así, si la vista cambia sin que cambie `rev` —no debería, pero un
   * sondeo trae la mesa entera—, los anillos son siempre los de lo que hay delante.
   * `quieto` apaga la barra entera: con una petición en vuelo no se coge nada.
   */
  const barra = useMemo(
    () => barraEnTres(vista, yo).map((p) => (quieto ? { ...p, disponible: false } : p)),
    [vista, yo, quieto],
  );
  const colocando = useMemo(
    () => (tomada === null ? null : colocandoEnTres(vista, yo, tomada)),
    [vista, yo, tomada],
  );

  const cartaCogida = useMemo(() => mano.find((c) => c.id === cogida) ?? null, [mano, cogida]);
  const seCambianPor = useMemo(() => {
    if (cartaCogida === null || quieto) return [];
    return bienesQueSeCambianPor(vista, opciones, cartaCogida.bien);
  }, [cartaCogida, quieto, vista, opciones]);

  const alTomarDeLaBarra = useCallback(
    (id: string) => {
      if (quieto) return;
      ponerCogida(null);
      ponerTomada((antes) => (antes === id ? null : (id as IdDeLaBarra)));
    },
    [quieto],
  );

  const alElegirSitio = useCallback(
    (sitio: { llave: string }) => {
      if (quieto || colocando === null) return;
      /* El movimiento viene montado por las reglas. Aquí no se monta nada. */
      const movimiento = colocando.movimientos.get(sitio.llave);
      ponerTomada(null);
      if (movimiento !== undefined) mover(movimiento);
    },
    [quieto, colocando, mover],
  );

  const alCogerCarta = useCallback(
    (carta: { id: string }) => {
      if (quieto) return;
      ponerTomada(null);
      ponerPreguntando(null);
      ponerCogida((antes) => (antes === carta.id ? null : carta.id));
    },
    [quieto],
  );

  /*
   * AL SOLTAR LA CARTA SOBRE UN BIEN: uno solo a quien proponérselo, se manda; varios,
   * se pregunta. Riberas exige destinatario y este cliente no lo elige por nadie.
   * Los nombres de la escena se traducen de vuelta a los de Riberas antes de preguntar
   * a las reglas, porque la carga habla en el idioma del juego.
   */
  const alProponerTrueque = useCallback(
    (bienEnLaEscena: string) => {
      if (quieto || cartaCogida === null) return;
      const doy = cartaCogida.bien;
      const quiero = bienEnLaEscena;
      const posibles = truequesPosibles(vista, opciones, doy, quiero);
      ponerCogida(null);
      const unico = posibles[0];
      if (unico !== undefined && posibles.length === 1) {
        mover({ tipo: unico.opcion.tipo, carga: unico.opcion.carga });
        return;
      }
      if (posibles.length > 1) ponerPreguntando({ trueques: posibles });
    },
    [quieto, cartaCogida, vista, opciones, mover],
  );

  // -------------------------------------------------------------------------
  // El mundo
  // -------------------------------------------------------------------------

  /* El modelo sólo se pide si el lienzo se va a montar: con delta y con colores. */
  const { modelos, fallo: falloDelModelo } = usarElCatalogo(tablero.caras.length > 0 && seVeEnTres(vista));
  const [falloDelLienzo, ponerFalloDelLienzo] = useState<string | null>(null);
  const alFallarElLienzo = useCallback((motivo: string) => {
    ponerFalloDelLienzo(motivo);
  }, []);
  const fallo = falloDelModelo ?? falloDelLienzo;

  /*
   * ═══ DÓNDE SE ESTÁ MIRANDO, Y POR QUÉ VIVE AQUÍ Y NO DENTRO DE LA CÁMARA ═══
   *
   * Porque el botón de volver está FUERA del `Canvas` —es un botón de la Sala, no un
   * objeto del mundo— y tiene que saber si hay algo a lo que volver. Con el
   * acercamiento encerrado en la cámara habría que sacarlo por un puerto de todas
   * formas; así entra por la puerta y sale por la misma.
   *
   * VA EN UNA `ref` Y NO EN EL ESTADO, y eso no es una optimización suelta: mover la
   * mirada son sesenta cambios por segundo mientras se arrastra, y pasarlos por React
   * repintaría el mueble entero —barra, mano, formulario— sesenta veces por segundo
   * para mover una cámara.
   *
   * Lo único que SÍ es estado es si se está como al principio, porque eso es lo que
   * enciende y apaga un botón, y `alPrincipio` sólo cambia cuando cruza esa frontera
   * —de ahí el segundo apunte—: sin él, cada píxel de arrastre sería un `setState` que
   * React tendría que descartar.
   *
   * Y NADIE LO TOCA AL CAMBIAR LA REVISIÓN. El efecto de arriba suelta lo que se tiene
   * en la mano cuando entra una jugada ajena; la cámara no aparece ahí a propósito.
   */
  const cercania = useRef<Cercania>(CERCANIA_DE_SALIDA);
  const [alPrincipio, ponerAlPrincipio] = useState(true);
  const eraAlPrincipio = useRef(true);
  const alAcercarse = useCallback((nueva: Cercania): void => {
    cercania.current = nueva;
    const ahora = estaComoAlPrincipio(nueva);
    if (ahora === eraAlPrincipio.current) return;
    eraAlPrincipio.current = ahora;
    ponerAlPrincipio(ahora);
  }, []);
  /* La salida. Pasa por el mismo sitio que la rueda, así que el botón se apaga solo. */
  const volverAlTableroEntero = useCallback((): void => {
    alAcercarse(comoAlPrincipio());
  }, [alAcercarse]);

  const semilla = useMemo(() => semillaDelCodigo(puesta.codigo), [puesta.codigo]);
  const encuadre = useMemo(
    () => (datos === null ? null : encuadreDelDelta(datos.islas.map((i) => i.hex))),
    [datos],
  );

  /*
   * SIN ISLAS NO HAY DELTA QUE PINTAR: sólo lo que se puede hacer. Es lo mismo que
   * hace la mesa de siempre sin tablero, y todas las opciones van al formulario,
   * porque no hay barra ni mano que enseñe ninguna. Se pregunta al TABLERO
   * DECLARADO y no a `datos`: ver la cabecera, «sin delta» no es «sin islas».
   */
  if (tablero.caras.length === 0) {
    return (
      <Formulario
        opciones={opciones}
        alElegir={mover}
        quieto={quieto}
        titulo={TITULO_DE_LO_QUE_SE_HACE}
      />
    );
  }

  /*
   * EL RESPALDO. Si la mesa no cabe en los colores del lienzo, si el modelo no
   * llegó o si el lienzo reventó, se pinta lo que se pintaba antes de que existiera
   * este fichero, entero, y se dice por qué en letra chica. No es una pantalla de
   * error: es la mesa jugable de siempre. El tercer motivo —hay tablero declarado
   * pero la traducción no dio delta— no debería darse nunca; se dice por su nombre
   * para que, si un día se da, no se confunda con los otros dos.
   */
  const porQueElRetablo =
    !seVeEnTres(vista)
      ? 'Sois más de cuatro y el tablero en tres dimensiones sólo sabe pintar cuatro colores todavía: se juega sobre el tablero de siempre.'
      : fallo !== null
        ? `El delta en tres dimensiones no ha arrancado: ${fallo}. Se juega sobre el tablero dibujado.`
        : datos === null || encuadre === null
          ? 'La mesa trae tablero pero no un delta que pintar: se juega sobre el tablero dibujado.'
          : null;
  if (porQueElRetablo !== null || datos === null || encuadre === null) {
    const sueltas = opcionesSueltas(tablero, opciones);
    return (
      <>
        <p className="letra-chica riberas-sin-mundo">{porQueElRetablo}</p>
        <Retablo tablero={tablero} alTocar={mover} quieto={quieto} />
        <AccionesDelTablero tablero={tablero} alTocar={mover} quieto={quieto} />
        {sueltas.length > 0 ? (
          <Formulario opciones={sueltas} alElegir={mover} quieto={quieto} titulo="Y además puedes" />
        ) : null}
      </>
    );
  }

  const conMundo = typeof window !== 'undefined' && modelos !== null;
  const alcance = encuadre.alcance;

  return (
    <div className="riberas-en-tres">
      {/*
        El aviso del tablero es del JUEGO —«te toca fundar», «espera a que tire
        otro»— y viaja en el tablero declarado igual que antes. En el retablo lo
        pinta el propio retablo; aquí, que no hay retablo, se pinta encima del
        lienzo en el mismo sitio y con la misma letra. Perderlo sería perder la
        única frase que dice en qué momento está la partida.
      */}
      {tablero.aviso.length > 0 ? <p className="aviso-del-tablero">{tablero.aviso}</p> : null}

      {/* La clase sale de la constante porque la cámara BUSCA este recuadro por ella: ver `RECUADRO_DEL_LIENZO`. */}
      <div
        className={quieto ? `${RECUADRO_DEL_LIENZO} riberas-lienzo-quieto` : RECUADRO_DEL_LIENZO}
      >
        {conMundo ? (
          <>
            <LimiteDelMundo alFallar={alFallarElLienzo}>
              <Canvas
                shadows
                dpr={[1, 2]}
                gl={{ antialias: true }}
                camera={{ position: encuadre.posicion, fov: 45, near: 0.5, far: alcance * 8 }}
                onCreated={({ gl }) => {
                  gl.toneMapping = ACESFilmicToneMapping;
                  gl.toneMappingExposure = 1.05;
                }}
              >
                {/* La niebla empieza detrás del mundo, y del color del cielo: ver `banco3d.tsx`. */}
                <color attach="background" args={[COLOR_DEL_CIELO]} />
                <fog attach="fog" args={[COLOR_DEL_CIELO, alcance * 2.6, alcance * 7.5]} />
                <CamaraAerea alcance={alcance} cercania={cercania} alAcercarse={alAcercarse} />
                <Delta
                  datos={datos}
                  modelos={modelos}
                  semilla={semilla}
                  colocando={colocando}
                  onElegirSitio={alElegirSitio}
                  barra={barra}
                  tomada={tomada}
                  onTomarDeLaBarra={alTomarDeLaBarra}
                  mano={mano}
                  cogida={cogida}
                  onCogerCarta={alCogerCarta}
                  seCambianPor={seCambianPor}
                  onProponerTrueque={alProponerTrueque}
                />
              </Canvas>
            </LimiteDelMundo>
            {/*
              LA SALIDA, y sólo cuando hace falta. Un zoom del que no se sabe volver
              atrapa: se entra a mirar una esquina del delta y ya no se encuentra el
              tablero. Va sobre el lienzo —que es donde uno está mirando cuando se
              pierde— y no en el raíl, y desaparece en cuanto se ha vuelto, porque un
              botón que siempre está encendido no dice nada. Está FUERA del `Canvas`: es
              un botón de la Sala con su foco y su filo, no un objeto del mundo.

              Y no le roba el gesto a la cámara sin tener que pedirlo: la cámara sólo
              atiende lo que empieza sobre el propio `<canvas>` (`e.target === lienzo`).
            */}
            {alPrincipio ? null : (
              <button type="button" className="riberas-volver" onClick={volverAlTableroEntero}>
                {VOLVER_AL_TABLERO_ENTERO}
              </button>
            )}
          </>
        ) : (
          /* El telón: `--suelo` con el nombre del juego hasta que el modelo llega. */
          <div className="riberas-telon" aria-busy="true">
            <p className="riberas-nombre">{manifiesto.nombre}</p>
            <p className="letra-chica">Se levanta el delta.</p>
          </div>
        )}
      </div>

      {preguntando !== null ? (
        <AQuien
          trueques={preguntando.trueques}
          quieto={quieto}
          alElegir={(t) => {
            ponerPreguntando(null);
            mover({ tipo: t.opcion.tipo, carga: t.opcion.carga });
          }}
          alDejarlo={() => {
            ponerPreguntando(null);
          }}
        />
      ) : null}

      {/*
        Y debajo, lo que el tablero NO enseña ya: tirar, pasar, aceptar, rechazar,
        empezar. Fundar y alzar los ofrece la barra con sus anillos; ofrecer un
        trueque lo ofrece la mano. Cada movimiento se enseña exactamente una vez.

        Se calla SÓLO si el tablero está enseñando algo y aquí no queda nada: con
        una barra encendida, «no hay nada que puedas hacer» sería mentira. Y si el
        juego no ofrece nada de nada —le toca a otro— sí se dice, porque entonces es
        verdad y es lo único que explica por qué la barra está apagada.
      */}
      {fuera.length > 0 || opciones.length === 0 ? (
        <Formulario opciones={fuera} alElegir={mover} quieto={quieto} titulo={TITULO_DE_LO_QUE_SE_HACE} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A quién se le propone
// ---------------------------------------------------------------------------

/**
 * El menú pequeño de destinatarios. Rótulo y ayuda son los que escribió el juego en
 * cada opción de ofrecer —ya nombran a quién—, así que aquí no se inventa ni una
 * palabra sobre el trato: sólo el título y la salida.
 */
function AQuien({
  trueques,
  quieto,
  alElegir,
  alDejarlo,
}: {
  trueques: readonly TruequePosible<Opcion>[];
  quieto: boolean;
  alElegir: (t: TruequePosible<Opcion>) => void;
  alDejarlo: () => void;
}): JSX.Element {
  return (
    <div className="formulario riberas-a-quien">
      <h2 className="rotulo-de-panel">A quién se lo propones</h2>
      <ul className="opciones">
        {trueques.map((t) => (
          <li key={t.opcion.id}>
            <button
              type="button"
              className="opcion"
              disabled={quieto}
              title={t.opcion.ayuda}
              onClick={() => {
                alElegir(t);
              }}
            >
              <span className="opcion-texto">
                <span className="opcion-rotulo">{t.opcion.rotulo}</span>
                {t.opcion.ayuda.length > 0 ? <span className="opcion-ayuda">{t.opcion.ayuda}</span> : null}
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
  );
}
