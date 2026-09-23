/**
 * EL MUNDO DE LAS LINDES: por dónde se anda y con qué se choca en el valle.
 *
 * ═══ LA FIRMA, Y LO QUE PROMETE ═══
 *
 *   · Entra lo que YA sale de la vista pública —las losas puestas, con su clase y su giro— y la
 *     semilla del paisaje, `semillaDelCodigo(codigo, 0x5eed)`, que es la misma que usa la
 *     escena. Nada del estado opaco: el servidor y el aparato tienen los dos la vista.
 *   · `lado` es el de una LOSA: una casilla del mundo es una losa puesta, y la losa `(x, y)` está
 *     centrada en `(x · LADO, −y · LADO)`, que es el convenio de `casillaDe` en `mundo.ts` (y era el del `hayLosaEn` del paseante viejo).
 *   · `pisables` son las losas puestas, y nada más: fuera de ellas no hay valle.
 *   · `nace[i]` es el sitio donde se nace en `losas[i]`, en el mismo orden. Quien pasea a solas
 *     nace en la última puesta; el servidor reparte a los de una mesa entre todas.
 *
 * ═══ LOS CUERPOS SALEN DEL REPARTO, Y SUS CAJAS DE LOS MODELOS ═══
 *
 * Cada losa se monta con `montarLaLosa` —el mismo reparto que pinta la escena, con la misma
 * semilla por losa—, y cada pieza que estorba tal como está puesta (`comoEstorbaLaPuesta`, en
 * `lindes-piezas.ts`: una piedra estorba si pasa de la cintura) deja una caja alineada con los
 * ejes. La caja es la HUELLA MEDIDA del modelo en `tablero.glb`
 * (`lindes-huellas.ts`) por lo que la escena le hace al pintarlo:
 *
 *     ancho  = huella en x × ESCALA_DEL_PACK × escala × largo
 *     fondo  = huella en z × ESCALA_DEL_PACK × escala
 *
 * que es exactamente la matriz de `UnModelo` en `Lindes.tsx` —`largo` estira la `x` del modelo—,
 * girada por el giro de la pieza y puesta donde el reparto la puso.
 *
 * Y NO de `loQueOcupa`, que era lo que había a mano y es una tabla de SEPARACIÓN: con ella un
 * lienzo de muralla salía a la cuarta parte de lo que mide y el trigal tapiaba el prado. Ver la
 * cabecera de `ANCHO_EN_PACK`.
 *
 * ═══ EL GIRO: A CUARTOS DE VUELTA, EXACTO; A CUALQUIER OTRO, REDONDO ═══
 *
 * Una caja alineada con los ejes no se puede girar un ángulo cualquiera, y girarla de verdad
 * pediría un seno que `shared/` no tiene. No hace falta, y la razón es de qué se gira así:
 *
 *   · A CUARTOS DE VUELTA van TODAS las cosas con esquinas: la muralla y sus torres
 *     (`giroDelLado`), las casas, el edificio que manda y la ermita (`π/2 · entero`). Para ellas
 *     la caja es exacta: girar un cuarto es cambiar el ancho por el fondo y los signos, sin una
 *     sola multiplicación por un seno. Se reconoce el cuarto con una división y un redondeo.
 *   · A UN ÁNGULO CUALQUIERA van sólo las cosas del campo —árboles, arboledas, almiares,
 *     colinas, y las piedras, rocas y tocones que estorban—: una copa, un bosquecillo, un montón
 *     de heno, un canto. A ésas no se les gira la caja: se toma el cuadrado de su RADIO medido
 *     desde el sitio donde se pone, que las cubre enteras las gire uno como las gire. Sobra por las
 *     esquinas, que es donde no hay nada: ver la sección siguiente.
 *
 * `verify:lindes-mundo` exige que nada con esquinas llegue nunca con un giro que no sea un cuarto.
 *
 * ═══ TODO LO QUE VA GIRADO, CON SU RADIO Y NO CON SU SEMIEJE ═══
 *
 * La caja de lo que va girado era el cuadrado de su MAYOR SEMIEJE, y eso sólo cubre lo que es redondo
 * DE VERDAD: si algo del modelo queda más lejos del centro que él, girado hacia un eje asoma por fuera
 * de la caja. Medido en `tablero.glb`, casi nada lo es. La piedra, la que más: su punto más lejano está
 * a 0,266 del pack y su semieje a 0,211, así que asomaba hasta 0,45 unidades junto a la senda y 0,66 en
 * el erial —más que el radio de quien anda—, y la regla de la cintura se habría estrenado con una
 * piedra que se atraviesa por una esquina, que es la queja de Miguel en pequeño. Y detrás, el campo: la
 * arboleda grande asoma un 11 % de su semieje —hasta 1,36 unidades a escala 2,2—, el almiar un 8 %, la
 * arboleda pequeña un 4 %, la media un 3 % y la colina un 0,4 %. Sólo los dos árboles sueltos son
 * redondos al diezmilésimo.
 *
 * Así que lo que va girado se cubre con el cuadrado de su RADIO (`ALTO_Y_RADIO_DEL_MODELO`, que el
 * medidor escribe de todo lo que estorba): lo más lejos del sitio donde se pone que llega su planta.
 * Las piedras lo estrenaron con la regla de la cintura, y el resto del campo lo siguió el mismo 23 de
 * septiembre. Ya no hay caja por el semieje.
 *
 * ═══ Y COMO LAS CAJAS CRECEN, SE MIDIÓ ANTES QUÉ PASOS ESTRECHABAN ═══
 *
 * En 47 tableros jugados enteros por el robot —3.313 losas, 91.085 cuerpos—, con el semieje y con el
 * radio. No hay ni un cuerpo más: crecen 689 arboledas grandes (hasta 1,36), 1.343 pequeñas (0,37),
 * 994 medias (0,34), 6.293 almiares (0,19), 971 colinas (0,03) y 7.700 `arbol-a` (una milésima); el
 * `arbol-b`, nada. La arena apunta un 0,29 % más de cajas en sus cajones, y nada más cuesta distinto.
 *
 * Estrechan los 7.333 huecos que hay a menos de 3 unidades de una caja que crece, y 208 bajan de lo
 * que pasa una persona. Pero de lo que se anda:
 *
 *   · NINGUNA SENDA SE CORTA. De través, donde antes cabía el centro de quien anda, lo más estrecho
 *     que queda son 2,38. Las arboledas grandes y medias ya pisaban el EJE de alguna senda con el
 *     semieje —en 430 puntos de 1,78 millones—, y con el radio lo pisan en 143 más: se rodean por la
 *     senda misma. Las piedras, que no pisan ninguno, siguen sin pisarlo.
 *   · NINGUNA PUERTA SE CIERRA: de 138, una estrecha su pasillo y sigue cabiendo quien anda.
 *   · 108 de los 3.313 SITIOS DE NACER se mueven, y el más pegado a un cuerpo queda a 3,87.
 *   · EL VALLE, en 635 millones de celdas de medio paso: tres rincones quedan aparte —de 1,5, 8 y
 *     8 u²— y dos bolsillos se tapan —de 2,75 y 0,75—, ninguno con un sitio de nacer. Y a los cinco
 *     los cierra la ESQUINA de un cuadrado, no un árbol: de las celdas que se tapan a menos de 8 de
 *     ellos, ninguna queda a un radio de nada pintado —la más cerca, a 0,53—. Es lo que cuesta cubrir
 *     con una caja lo que va girado, y queda por debajo de una celda de losa (13,3 u²), que es lo que
 *     `verify:lindes-mundo` le consiente: un rincón, no un trozo del valle.
 *
 * ═══ LA PUERTA: DOS JAMBAS Y UN HUECO ═══
 *
 * Una muralla tiene que parar y su puerta tiene que dejar pasar, y las dos cosas son la misma
 * pieza (`muro-puerta`). Así que de la puerta salen DOS cajas —lo que queda de muro a cada lado—
 * y el hueco medido del portón (`HUECO_DE_LA_PUERTA`, la mitad del lienzo) se queda libre.
 *
 * ═══ DÓNDE SE NACE ═══
 *
 * La misma lógica que tenía `nacerEnLaLosa` en `escenas/lindes/paseo.ts`, que ésta sustituye —se prefiere la senda, luego
 * el prado, y entre las celdas que valen gana la que más lejos tiene lo más cercano, y se nace
 * de espaldas a eso—, con tres cambios:
 *
 *   1. UNA CELDA VALE SI SE PUEDE ESTAR EN ELLA: `sePuedeEstar` sobre la arena de este mismo
 *      mundo, con el radio de quien anda. Si en las sendas no hay ninguna, se pasa al prado, y
 *      si tampoco, a la losa entera. Sin esto, el sitio más despejado podía caer dentro de la
 *      caja de una arboleda cuyo centro estaba lejos.
 *   2. «LO MÁS CERCANO» cuenta las piezas —por su centro, como antes, menudas incluidas: nadie
 *      quiere nacer dentro de un barril— y además las CAJAS de lo que estorba, de esta losa y
 *      de las de al lado: una arboleda de veinte unidades no está «lejos» porque su centro lo
 *      esté.
 *   3. SIN TRIGONOMETRÍA. La distancia se compara al cuadrado —la raíz no cambia cuál es la
 *      menor—, y el rumbo no sale de un arcotangente: es el de la tabla de 256 de `andar.ts`
 *      que más se parece a la dirección buscada —el de mayor producto escalar—. Queda como
 *      mucho a medio rumbo del que daba el arcotangente —0,71 grados—, y es el mismo número en
 *      los dos motores.
 */
import { COSENO, radianesDelRumbo, RADIO_DEL_PASEANTE, RUMBOS, SENO } from '../../mecanicas/andar';
import { deNumero } from '../../mecanicas/fijo';
import { arenaDe, sePuedeEstar } from '../../mecanicas/mundo';
import type { Arena, Cuerpo, MundoDeclarado, Sitio } from '../../mecanicas/mundo';
import { ALTO_Y_RADIO_DEL_MODELO, HUECO_DE_LA_PUERTA, HUELLA_DEL_MODELO } from './lindes-huellas';
import type { HuellaDelModelo } from './lindes-huellas';
import { LOSAS_EN_TOTAL } from './lindes-losas';
import type { Giro } from './lindes-losas';
import { ESCALA_DEL_PACK, LADO_DE_LOSA } from './lindes-medidas';
import { comoEstorbaLaPuesta } from './lindes-piezas';
import { centroDeCelda, montarLaLosa, semillaDeLaLosa } from './lindes-reparto';
import type { CeldaDeSuelo, ContenidoDeLosa, PorQueEsta, PuestaEnLaLosa } from './lindes-reparto';

/** Una losa puesta, como la da la vista traducida (`TableroDeLasLindesEn3D.losas`). */
export interface LosaParaElMundo {
  /** Hacia el este. */
  readonly x: number;
  /** Hacia el norte. */
  readonly y: number;
  /** La clase de losa, del catálogo. */
  readonly losa: string;
  readonly giro: Giro;
}

/**
 * El lado de una losa en unidades del mundo: 32 del pack por la escala del pack (2,543 × 2 / 0,93).
 * Es `LADO_DE_LOSA` de `lindes-medidas.ts` —el mismo número, no una copia—; el nombre se queda
 * porque es el que ya usan quienes llaman a este fichero.
 */
export const LADO_DE_LOSA_DEL_MUNDO = LADO_DE_LOSA;

/** Cómo salió una caja: girada a cuartos, exacta; a otro ángulo, redonda; o una jamba de puerta. */
export type FormaDelCuerpo = 'exacta' | 'redonda' | 'jamba';

/** Un cuerpo, y de dónde sale. Para quien quiera contarlos o dibujarlos; el mundo lleva sólo la caja. */
export interface CuerpoDeLasLindes {
  readonly cuerpo: Cuerpo;
  readonly pieza: string;
  readonly porque: PorQueEsta;
  /** El índice de la losa, en la lista que se pasó. */
  readonly losa: number;
  readonly forma: FormaDelCuerpo;
}

/* ─── EL GIRO DE UNA PIEZA ───────────────────────────────────────────────── */

const CUARTO_DE_VUELTA = Math.PI / 2;

/**
 * Cuánto se aparta un giro de un cuarto de vuelta y se sigue tomando por él. Los cuartos de esta
 * casa se escriben `Math.PI / 2 · k` o `Math.PI / 2 + Math.PI`: se apartan en el último bit, no
 * en una milmillonésima. Y los ángulos sorteados del campo no caen tan cerca de uno ni por azar
 * —menos de una vez entre setecientos millones por pieza—, y si cayeran, la caja exacta seguiría
 * siendo la buena.
 */
const TOLERANCIA_DEL_CUARTO = 1e-9;

/**
 * ¿Es este giro un número entero de cuartos de vuelta? Devuelve cuántos, de 0 a 3, o `null`.
 *
 * Una división, un redondeo y una resta: ni un seno. El sentido es el de `three` —el que usa
 * `Lindes.tsx` al pintar—, que gira `x` hacia `−z`.
 */
export function cuartosDeVuelta(giro: number): number | null {
  const k = Math.round(giro / CUARTO_DE_VUELTA);
  if (Math.abs(giro - k * CUARTO_DE_VUELTA) > TOLERANCIA_DEL_CUARTO) return null;
  return ((k % 4) + 4) % 4;
}

/**
 * LAS CAJAS DE UNA PIEZA PUESTA, en coordenadas del tablero. `(cx, cz)` es el centro de su losa.
 *
 * Vacío si la pieza no estorba —puesta así: una piedra que no pasa de la cintura no estorba—, o si
 * no tiene su huella y su radio medidos —eso segundo no debería pasar nunca: las dos tablas salen
 * juntas del mismo guion, con los mismos nombres, y lo vigila `verify:lindes-mundo`—.
 */
export function cajasDeLaPuesta(
  p: PuestaEnLaLosa,
  cx: number,
  cz: number,
): { readonly cuerpo: Cuerpo; readonly forma: FormaDelCuerpo }[] {
  const como = comoEstorbaLaPuesta(p.pieza, p.escala);
  if (como === 'nada') return [];
  const huella = HUELLA_DEL_MODELO[p.pieza];
  const medido = ALTO_Y_RADIO_DEL_MODELO[p.pieza];
  if (huella === undefined || medido === undefined) return [];
  /* La misma escala que `UnModelo`: `largo` estira la `x` del modelo, y sólo la `x`. */
  const sx = p.escala * ESCALA_DEL_PACK * p.largo;
  const sz = p.escala * ESCALA_DEL_PACK;
  const trozos: HuellaDelModelo[] =
    como === 'puerta'
      ? [
          { x0: huella.x0, x1: HUECO_DE_LA_PUERTA.x0, z0: huella.z0, z1: huella.z1 },
          { x0: HUECO_DE_LA_PUERTA.x1, x1: huella.x1, z0: huella.z0, z1: huella.z1 },
        ]
      : [huella];
  const forma: FormaDelCuerpo = como === 'puerta' ? 'jamba' : 'exacta';
  const k = cuartosDeVuelta(p.giro);
  const x = cx + p.x;
  const z = cz + p.z;
  const salida: { readonly cuerpo: Cuerpo; readonly forma: FormaDelCuerpo }[] = [];
  for (const t of trozos) {
    const a = t.x0 * sx;
    const b = t.x1 * sx;
    const c = t.z0 * sz;
    const d = t.z1 * sz;
    if (k === null) {
      /*
       * A un ángulo cualquiera: el cuadrado de su RADIO medido, que la cubre entera se gire como se
       * gire, sea redonda o no: ver la cabecera. Si un día se estirara, el radio crece con el lado
       * que más se estira.
       */
      const r = medido.radio * (sx > sz ? sx : sz);
      salida.push({ cuerpo: { x0: x - r, z0: z - r, x1: x + r, z1: z + r }, forma: 'redonda' });
      continue;
    }
    /*
     * El giro de `three` alrededor del eje vertical: `x' = x·cos + z·sen`, `z' = −x·sen + z·cos`.
     * A cuartos de vuelta, el coseno y el seno son 0 y ±1, y la caja sólo cambia de ejes y de signo.
     */
    let caja: Cuerpo;
    if (k === 0) caja = { x0: x + a, z0: z + c, x1: x + b, z1: z + d };
    else if (k === 1) caja = { x0: x + c, z0: z - b, x1: x + d, z1: z - a };
    else if (k === 2) caja = { x0: x - b, z0: z - d, x1: x - a, z1: z - c };
    else caja = { x0: x - d, z0: z + a, x1: x - c, z1: z + b };
    salida.push({ cuerpo: caja, forma });
  }
  return salida;
}

/* ─── EL TABLERO ENTERO ──────────────────────────────────────────────────── */

/*
 * ═══ LO QUE NO CAMBIA NO SE VUELVE A CALCULAR ═══
 *
 * Una losa puesta no cambia nunca, y el mundo se pide entero en cada jugada —el aparato al
 * pasear, el servidor al validar—. Medido con 72 losas: el reparto costaba 1,1 s en Hermes y
 * ya se recuerda en `montarLaLosa`; lo que quedaba —las cajas de 1.900 piezas y el sitio de
 * nacer de 72 losas, que prueba 2.304 celdas por losa— eran otros 16 ms en Node por jugada, unos
 * 150 en Hermes: un tirón visible en el móvil cada vez que alguien pone una losa mientras uno
 * anda. Así que se recuerdan también, y con la llave que les toca:
 *
 *   · LAS CAJAS DE UNA LOSA dependen de ella sola: su clase, su giro, su semilla y su sitio. Las
 *     de las piedras también: si una estorba lo decide su escala, y su escala sale del reparto
 *     de su losa.
 *   · EL SITIO DE NACER EN UNA LOSA depende de ella y de sus OCHO VECINAS —los cuerpos de al lado
 *     asoman hasta un octavo de losa (`MARGEN_DE_LO_CERCANO`)—, así que su llave es la de las
 *     nueve. Poner una losa sólo obliga a rehacer el de ella y el de sus vecinas.
 *
 * Y para que recordar no cambie NADA de lo que sale, lo cercano se junta siempre en el mismo
 * orden —de la vecina del noroeste a la del sureste— y no en el orden en que llegaron las losas:
 * si dependiera de ese orden, un empate entre dos distancias podría resolverse distinto en frío
 * que de memoria, y el mismo tablero daría dos mundos.
 *
 * ═══ Y SE RECUERDA POR MESA, PORQUE EL SERVIDOR TIENE MUCHAS ═══
 *
 * Esta memoria era del PROCESO —1.024 losas, y al llenarse se olvidaba la que entró antes—, igual
 * que la del reparto, de 512. Al aparato le sobra: mira una mesa. Pero el servidor deriva el mundo
 * de CADA mesa de botas cada vez que cambia, y una mesa llena son 72 losas. Contado en rueda —una
 * jugada cada vez en una mesa distinta, con los tableros de cien partidas del robot—: con siete
 * mesas llenas, una jugada que pone losa monta UNA losa y una que no pone ninguna no monta nada;
 * con ocho, 23 y 72, porque el reparto ya no cabe; con veinte, 66 losas montadas, 66 cajas y 66
 * sitios de nacer POR JUGADA: el tablero entero en frío, cada vez. Olvidar lo que entró antes,
 * con las mesas en rueda, es olvidar justo lo que va a hacer falta a continuación.
 *
 * Así que la memoria es POR MESA —la mesa es su semilla, que sale de su código— y lo que no cabe
 * se olvida POR MESAS: sale entera la que lleva más tiempo sin derivarse. Una mesa que se sigue
 * jugando no pierde nunca media memoria, y la que sale es la que menos falta va a hacer. De cada
 * losa se guarda lo justo para no volver a montarla:
 *
 *   · SUS CAJAS, en números de cuatro en cuatro: es lo que el mundo pide en cada jugada.
 *   · DÓNDE CAE CADA PIEZA, de dos en dos, y el SUELO de su clase y su giro, que el reparto
 *     comparte entre todas las losas iguales: es todo lo que mira `sitioParaNacer`, y hace falta
 *     cuando una losa nueva cae al lado y hay que volver a buscar dónde se nace.
 *   · SU SITIO DE NACER, con la llave del vecindario con la que se buscó.
 *
 * Y no el reparto entero, que es lo que habría pedido lo más directo —recordar el
 * `ContenidoDeLosa`—: sus piezas son 8,5 kB por losa, y con cien mesas eso solo pasaría de 60 MB.
 * Lo medido, en la cabecera de `LOSAS_QUE_SE_RECUERDAN`.
 *
 * La memoria de una mesa se queda con las losas de su último tablero, ni una más: si una partida
 * se rebobina, lo que se quitó no se queda ocupando sitio.
 */
/** Lo que una mesa recuerda de una de sus losas. */
export interface LosaRecordada {
  /** Sus cajas, de cuatro en cuatro —`x0, z0, x1, z1`—, en el orden en que salen de sus piezas. */
  readonly cajas: readonly number[];
  /** Dónde cae cada pieza de su reparto, de dos en dos —`x, z`—, en el orden del reparto. */
  readonly piezas: readonly number[];
  /** Su suelo: el del reparto, compartido con todas las losas de su clase y su giro. */
  readonly celdas: readonly CeldaDeSuelo[];
  /** La llave del vecindario con el que se buscó `nace`. Vacía si todavía no se ha buscado. */
  vecindario: string;
  nace: Sitio | null;
}

/**
 * UNA MEMORIA DE MESAS. La del proceso es la que usan el aparato y el servidor; quien quiera
 * medir o comparar en frío se hace otra, y la del proceso no se entera.
 */
export interface MemoriaDeLasLindes {
  /** Cuántas losas caben, entre todas sus mesas. */
  readonly tope: number;
  /**
   * Sus mesas, por semilla, en el orden en que se derivaron por última vez: la primera es la que
   * lleva más tiempo sin derivarse. De cada una, sus losas por llave.
   */
  readonly mesas: Map<number, ReadonlyMap<string, LosaRecordada>>;
  /** Cuántas losas hay, sumando todas las mesas. */
  losas: number;
  /** Cuántas mesas se han olvidado enteras por no caber. */
  olvidadas: number;
}

/**
 * CUÁNTAS LOSAS SE RECUERDAN, ENTRE TODAS LAS MESAS: las de 128 mesas llenas.
 *
 * En losas y no en mesas porque lo que se ocupa es por losa: una mesa que empieza cuesta lo que
 * lleva puesto. Medido con `process.memoryUsage()` tras recoger basura, con los tableros de cien
 * partidas del robot derivados en rueda: 2,7 kB por losa, 195 por mesa llena, y 36,5 MB en total
 * con las cien (7.188 losas), de los que unos 18 son fijos y no crecen con las mesas —los suelos
 * compartidos y las 512 losas del reparto—. Con el tope lleno serían unos 42. Antes, las memorias
 * del proceso llenas ocupaban 77 MB, y a partir de la octava mesa no servían de nada.
 *
 * Con más mesas jugando a la vez que las que caben, las que más tiempo llevan quietas vuelven a
 * derivarse en frío, que es lo que antes les pasaba a todas a partir de la octava.
 */
export const LOSAS_QUE_SE_RECUERDAN = 128 * LOSAS_EN_TOTAL;

/** Una memoria de mesas vacía, con su tope en losas. */
export function memoriaDeLasLindes(tope: number): MemoriaDeLasLindes {
  return { tope, mesas: new Map<number, ReadonlyMap<string, LosaRecordada>>(), losas: 0, olvidadas: 0 };
}

const LA_MEMORIA_DEL_PROCESO = memoriaDeLasLindes(LOSAS_QUE_SE_RECUERDAN);

/** Lo que hay en una memoria de mesas, contado. */
export interface LoQueSeRecuerda {
  readonly mesas: number;
  readonly losas: number;
  readonly olvidadas: number;
  readonly tope: number;
}

/** Lo que hay en una memoria de mesas: la del proceso, si no se dice otra. */
export function loQueSeRecuerda(memoria: MemoriaDeLasLindes = LA_MEMORIA_DEL_PROCESO): LoQueSeRecuerda {
  return { mesas: memoria.mesas.size, losas: memoria.losas, olvidadas: memoria.olvidadas, tope: memoria.tope };
}

/*
 * ═══ Y LO QUE TRABAJA, CONTADO ═══
 *
 * Como en `lindes-reparto.ts`: cuántas veces se ha hecho cada cosa y cuántas se ha sacado de la
 * memoria. Nada de aquí lo lee; está para que un comprobador CUENTE lo que cuesta una jugada.
 */
let cajasCalculadas = 0;
let cajasRecordadas = 0;
let nacimientosCalculados = 0;
let nacimientosRecordados = 0;
let arenasParaNacer = 0;

/** Lo que ha trabajado el mundo desde que se cargó el módulo. Lo del reparto va en `cuentasDelReparto`. */
export interface CuentasDelMundo {
  /** Losas cuyas cajas se han sacado de sus piezas. */
  readonly cajasCalculadas: number;
  /** Losas cuyas cajas estaban en la memoria. */
  readonly cajasRecordadas: number;
  /** Sitios de nacer buscados celda a celda (`sitioParaNacer`). */
  readonly nacimientosCalculados: number;
  /** Sitios de nacer que estaban en la memoria. */
  readonly nacimientosRecordados: number;
  /** Arenas levantadas para decidir dónde se nace: una por mundo, y sólo si algún sitio faltaba. */
  readonly arenasParaNacer: number;
}

/** Las cuentas del mundo, tal como van. */
export function cuentasDelMundo(): CuentasDelMundo {
  return { cajasCalculadas, cajasRecordadas, nacimientosCalculados, nacimientosRecordados, arenasParaNacer };
}

/** La llave de una losa puesta: todo aquello de lo que dependen sus piezas y su sitio. */
function llaveDeLaLosa(l: LosaParaElMundo, semilla: number): string {
  return `${l.losa}|${String(l.giro)}|${String(l.x)}|${String(l.y)}|${String(semilla)}`;
}

/** Una losa, montada con el reparto y con su semilla, como la monta la escena. */
function montarUna(l: LosaParaElMundo, semilla: number): ContenidoDeLosa {
  return montarLaLosa(l.losa, l.giro, semillaDeLaLosa(semilla, l.x, l.y));
}

/**
 * LAS CAJAS DE UNA LOSA, con de dónde sale cada una. `indice` es el de la losa en la lista. De aquí
 * salen las de `cuerposDeLasLindes` y las que recuerda cada mesa: la cuenta es una sola.
 */
function cajasDeUnaLosa(l: LosaParaElMundo, contenido: ContenidoDeLosa, indice: number): CuerpoDeLasLindes[] {
  cajasCalculadas++;
  const cx = l.x * LADO_DE_LOSA;
  const cz = -l.y * LADO_DE_LOSA;
  const salida: CuerpoDeLasLindes[] = [];
  for (const p of contenido.puestas) {
    for (const c of cajasDeLaPuesta(p, cx, cz)) {
      salida.push({ cuerpo: c.cuerpo, pieza: p.pieza, porque: p.porque, losa: indice, forma: c.forma });
    }
  }
  return salida;
}

/**
 * LOS CUERPOS DE UN TABLERO, con de dónde sale cada uno.
 *
 * Son EXACTAMENTE los de `mundoDeLasLindes`, en el mismo orden —salen de la misma cuenta,
 * `cajasDeUnaLosa`, y el mundo se queda con sus números—, así que contarlos aquí es contar lo que
 * hay en el mundo. No pasa por la memoria de las mesas: es para contar y dibujar, no para jugar, y
 * así `verify:lindes-mundo` compara lo que sale de memoria con lo que sale de la cuenta.
 */
export function cuerposDeLasLindes(losas: readonly LosaParaElMundo[], semilla: number): CuerpoDeLasLindes[] {
  const salida: CuerpoDeLasLindes[] = [];
  for (let i = 0; i < losas.length; i++) {
    const l = losas[i] as LosaParaElMundo;
    for (const c of cajasDeUnaLosa(l, montarUna(l, semilla), i)) salida.push(c);
  }
  return salida;
}

/** Lo que una mesa recuerda de una losa que no tenía: se monta —o se toma de la escena— y se resume. */
function recordarLaLosa(l: LosaParaElMundo, semilla: number): LosaRecordada {
  const contenido = montarUna(l, semilla);
  const cajas: number[] = [];
  for (const c of cajasDeUnaLosa(l, contenido, 0)) cajas.push(c.cuerpo.x0, c.cuerpo.z0, c.cuerpo.x1, c.cuerpo.z1);
  const piezas: number[] = [];
  for (const p of contenido.puestas) piezas.push(p.x, p.z);
  return { cajas, piezas, celdas: contenido.celdas, vecindario: '', nace: null };
}

/**
 * OLVIDA MESAS ENTERAS mientras no quepan, empezando por la que lleva más tiempo sin derivarse. La
 * que se acaba de derivar va la última y no sale nunca: aunque ella sola no cupiera, es la que se
 * está jugando.
 */
function olvidarLasQueNoCaben(memoria: MemoriaDeLasLindes): void {
  while (memoria.losas > memoria.tope && memoria.mesas.size > 1) {
    const primera = memoria.mesas.entries().next();
    if (primera.done === true) return;
    const [semilla, suyas] = primera.value;
    memoria.mesas.delete(semilla);
    memoria.losas -= suyas.size;
    memoria.olvidadas++;
  }
}

/* ─── DÓNDE SE NACE ──────────────────────────────────────────────────────── */

/**
 * El rumbo de la tabla de `andar.ts` que más se parece a una dirección: el de mayor producto
 * escalar. La dirección del rumbo `r` es `(SENO[r], −COSENO[r])`. Doscientas cincuenta y seis
 * multiplicaciones y ni un arcotangente; a igualdad, el primero.
 */
function rumboMasParecido(vx: number, vz: number): number {
  let mejor = 0;
  let suProducto = Number.NEGATIVE_INFINITY;
  for (let r = 0; r < RUMBOS; r++) {
    const producto = (SENO[r] as number) * vx - (COSENO[r] as number) * vz;
    if (producto > suProducto) {
      suProducto = producto;
      mejor = r;
    }
  }
  return mejor;
}

/**
 * Lo que mira quien busca dónde nacer en una losa: su suelo y dónde cae cada pieza. Un
 * `ContenidoDeLosa` lo es, y también lo que guarda la memoria de una mesa, que no guarda más.
 */
interface LoQueMiraQuienNace {
  readonly celdas: readonly CeldaDeSuelo[];
  readonly puestas: readonly { readonly x: number; readonly z: number }[];
}

/**
 * EL SITIO DONDE SE NACE EN UNA LOSA. Ver la cabecera: la lógica que tenía `nacerEnLaLosa`, con la
 * arena de este mundo como juez de si se puede estar.
 */
function sitioParaNacer(
  l: LosaParaElMundo,
  dentro: LoQueMiraQuienNace,
  arena: Arena,
  cerca: readonly Cuerpo[],
): Sitio {
  const cx = l.x * LADO_DE_LOSA;
  const cz = -l.y * LADO_DE_LOSA;
  const sendas: CeldaDeSuelo[] = [];
  const prados: CeldaDeSuelo[] = [];
  for (const c of dentro.celdas) {
    if (c.clase === 'senda') sendas.push(c);
    else if (c.clase === 'prado') prados.push(c);
  }
  /*
   * Por tandas, y se pasa a la siguiente sólo si en ésta no hay NI UNA celda donde se pueda
   * estar. Una losa que es villa entera no tiene ni senda ni prado y va directa a la tercera:
   * entre malas, la plaza más despejada. Quedarse sin nacer sería peor que nacer en un sitio
   * regular.
   */
  for (const candidatas of [sendas, prados, dentro.celdas]) {
    let mejorX = 0;
    let mejorZ = 0;
    let hay = false;
    let suHolgura = -1;
    let cercaX = 0;
    let cercaZ = 0;
    let hayCerca = false;
    for (const c of candidatas) {
      const f = centroDeCelda(c.i, c.j);
      const px = cx + f.x * LADO_DE_LOSA;
      const pz = cz + f.z * LADO_DE_LOSA;
      /* Lo más cercano, AL CUADRADO: la raíz no cambia cuál es el menor. */
      let holgura = Number.POSITIVE_INFINITY;
      let qx = 0;
      let qz = 0;
      let hayQ = false;
      for (const q of dentro.puestas) {
        const dx = px - (cx + q.x);
        const dz = pz - (cz + q.z);
        const d = dx * dx + dz * dz;
        if (d < holgura) {
          holgura = d;
          qx = cx + q.x;
          qz = cz + q.z;
          hayQ = true;
        }
      }
      for (const b of cerca) {
        /* El punto de la caja más cercano: el propio punto, acotado a la caja. */
        const nx = px < b.x0 ? b.x0 : px > b.x1 ? b.x1 : px;
        const nz = pz < b.z0 ? b.z0 : pz > b.z1 ? b.z1 : pz;
        const dx = px - nx;
        const dz = pz - nz;
        const d = dx * dx + dz * dz;
        if (d < holgura) {
          holgura = d;
          qx = nx;
          qz = nz;
          hayQ = true;
        }
      }
      if (holgura <= suHolgura) continue;
      /* Sólo se mira si se puede estar cuando ganaría: es lo caro, y casi nunca hace falta. */
      if (!sePuedeEstar(arena, deNumero(px), deNumero(pz), RADIO_DEL_PASEANTE)) continue;
      suHolgura = holgura;
      mejorX = px;
      mejorZ = pz;
      hay = true;
      cercaX = qx;
      cercaZ = qz;
      hayCerca = hayQ;
    }
    if (!hay) continue;
    /* Y mirando a lo abierto, de espaldas a lo más cercano. */
    const vx = mejorX - cercaX;
    const vz = mejorZ - cercaZ;
    const rumbo = !hayCerca || (vx === 0 && vz === 0) ? 0 : radianesDelRumbo(rumboMasParecido(vx, vz));
    return { x: mejorX, z: mejorZ, rumbo };
  }
  /* Ninguna celda vale —una losa desconocida no tiene celdas—: el centro, como hacía el `nacerEn` del paseante viejo. */
  return { x: cx, z: cz, rumbo: 0 };
}

/** Cuánto asoma lo de la losa de al lado: un octavo de losa. */
const MARGEN_DE_LO_CERCANO = LADO_DE_LOSA / 8;

/** Una losa del tablero, por su casilla: su llave y sus cajas. */
interface LoDeUnaCasilla {
  readonly llave: string;
  readonly cuerpos: readonly Cuerpo[];
}

/** La llave de una casilla en el mapa del tablero. */
function casillaDeLaLosa(x: number, y: number): string {
  return `${String(x)},${String(y)}`;
}

/**
 * Los cuerpos que pueden importar para nacer en la losa `(x, y)`: los de ella y sus ocho vecinas
 * que tocan su cuadrado con margen. SIEMPRE en el mismo orden —de la vecina del noroeste a la del
 * sureste—, y no en el de la lista de losas: ver «LO QUE NO CAMBIA NO SE VUELVE A CALCULAR», arriba.
 */
function cuerposCercaDe(l: LosaParaElMundo, porCasilla: ReadonlyMap<string, LoDeUnaCasilla>): Cuerpo[] {
  const cx = l.x * LADO_DE_LOSA;
  const cz = -l.y * LADO_DE_LOSA;
  const x0 = cx - LADO_DE_LOSA / 2 - MARGEN_DE_LO_CERCANO;
  const x1 = cx + LADO_DE_LOSA / 2 + MARGEN_DE_LO_CERCANO;
  const z0 = cz - LADO_DE_LOSA / 2 - MARGEN_DE_LO_CERCANO;
  const z1 = cz + LADO_DE_LOSA / 2 + MARGEN_DE_LO_CERCANO;
  const salida: Cuerpo[] = [];
  for (let dy = 1; dy >= -1; dy--) {
    for (let dx = -1; dx <= 1; dx++) {
      const vecina = porCasilla.get(casillaDeLaLosa(l.x + dx, l.y + dy));
      if (vecina === undefined) continue;
      for (const b of vecina.cuerpos) {
        if (b.x1 < x0 || b.x0 > x1 || b.z1 < z0 || b.z0 > z1) continue;
        salida.push(b);
      }
    }
  }
  return salida;
}

/** La llave del sitio de nacer en una losa: la suya y la de sus ocho vecinas, en el mismo orden. */
function llaveDelVecindario(l: LosaParaElMundo, porCasilla: ReadonlyMap<string, LoDeUnaCasilla>): string {
  const partes: string[] = [];
  for (let dy = 1; dy >= -1; dy--) {
    for (let dx = -1; dx <= 1; dx++) {
      const vecina = porCasilla.get(casillaDeLaLosa(l.x + dx, l.y + dy));
      partes.push(vecina === undefined ? '-' : vecina.llave);
    }
  }
  return partes.join(';');
}

/**
 * EL MUNDO DE UN TABLERO DE LAS LINDES. Función pura: la misma vista da el mismo mundo en los dos
 * lados. La memoria sólo decide cuánto se trabaja para sacarlo, nunca qué sale: por defecto es la
 * del proceso, y quien pase otra —un comprobador que quiere el mundo en frío— no toca ésa.
 */
export function mundoDeLasLindes(
  losas: readonly LosaParaElMundo[],
  semilla: number,
  memoria: MemoriaDeLasLindes = LA_MEMORIA_DEL_PROCESO,
): MundoDeclarado {
  /*
   * La mesa sale de donde estaba y vuelve a entrar la última, que es lo que la hace la más
   * reciente. Sus losas se descuentan ya, y se vuelven a contar las de este tablero al terminar:
   * si algo fallara a medias, la mesa quedaría olvidada, que es seguro, y la cuenta, bien.
   */
  const antes = memoria.mesas.get(semilla);
  if (antes !== undefined) {
    memoria.mesas.delete(semilla);
    memoria.losas -= antes.size;
  }
  const suyas = new Map<string, LosaRecordada>();
  const recordadas: LosaRecordada[] = [];
  const pisables = losas.map((l) => ({ x: l.x, y: l.y }));
  const cuerpos: Cuerpo[] = [];
  const porCasilla = new Map<string, LoDeUnaCasilla>();
  for (let i = 0; i < losas.length; i++) {
    const l = losas[i] as LosaParaElMundo;
    const llave = llaveDeLaLosa(l, semilla);
    let r = suyas.get(llave) ?? antes?.get(llave);
    if (r === undefined) r = recordarLaLosa(l, semilla);
    else cajasRecordadas++;
    suyas.set(llave, r);
    recordadas.push(r);
    /* Sus cajas vuelven a ser cuerpos: los mismos números, en el mismo orden. */
    const suyos: Cuerpo[] = [];
    for (let k = 0; k + 3 < r.cajas.length; k += 4) {
      const c: Cuerpo = {
        x0: r.cajas[k] as number,
        z0: r.cajas[k + 1] as number,
        x1: r.cajas[k + 2] as number,
        z1: r.cajas[k + 3] as number,
      };
      suyos.push(c);
      cuerpos.push(c);
    }
    porCasilla.set(casillaDeLaLosa(l.x, l.y), { llave, cuerpos: suyos });
  }
  /*
   * La arena con la que se decide dónde se nace es la de este mismo mundo, sin los sitios de
   * nacer: `nace` no cambia ni el suelo ni los cuerpos, así que la del mundo terminado contesta
   * lo mismo en cada uno. Y sólo se levanta si alguna losa no tiene su sitio recordado con el
   * vecindario de ahora.
   */
  let arena: Arena | null = null;
  const nace: Sitio[] = [];
  for (let i = 0; i < losas.length; i++) {
    const l = losas[i] as LosaParaElMundo;
    const r = recordadas[i] as LosaRecordada;
    const vecindario = llaveDelVecindario(l, porCasilla);
    if (r.nace !== null && r.vecindario === vecindario) {
      nacimientosRecordados++;
      nace.push(r.nace);
      continue;
    }
    if (arena === null) {
      arenasParaNacer++;
      arena = arenaDe({ lado: LADO_DE_LOSA, pisables, vados: [], cuerpos, nace: [] });
    }
    nacimientosCalculados++;
    const puestas: { x: number; z: number }[] = [];
    for (let k = 0; k + 1 < r.piezas.length; k += 2) puestas.push({ x: r.piezas[k] as number, z: r.piezas[k + 1] as number });
    const sitio = sitioParaNacer(l, { celdas: r.celdas, puestas }, arena, cuerposCercaDe(l, porCasilla));
    r.vecindario = vecindario;
    r.nace = sitio;
    nace.push(sitio);
  }
  memoria.mesas.set(semilla, suyas);
  memoria.losas += suyas.size;
  olvidarLasQueNoCaben(memoria);
  return {
    lado: LADO_DE_LOSA,
    pisables,
    vados: [],
    cuerpos,
    nace,
  };
}
