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
 * semilla por losa—, y cada pieza que estorba (`comoEstorba`, en `lindes-piezas.ts`) deja una
 * caja alineada con los ejes. La caja es la HUELLA MEDIDA del modelo en `tablero.glb`
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
 *     colinas—, que en planta son REDONDAS u ovaladas: una copa, un bosquecillo, un montón de
 *     heno. Una planta redonda tiene la misma caja la gire uno como la gire, así que se toma el
 *     cuadrado de su mayor semieje, medido desde el sitio donde se pone. Para lo redondo es la
 *     caja justa; para un óvalo como el almiar sobra por las esquinas, que es donde no hay nada.
 *
 * `verify:lindes-mundo` exige que nada con esquinas llegue nunca con un giro que no sea un cuarto.
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
import { HUECO_DE_LA_PUERTA, HUELLA_DEL_MODELO } from './lindes-huellas';
import type { HuellaDelModelo } from './lindes-huellas';
import type { Giro } from './lindes-losas';
import { ESCALA_DEL_PACK, LADO_DE_LOSA } from './lindes-medidas';
import { comoEstorba } from './lindes-piezas';
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
 * Vacío si la pieza no estorba o si no tiene huella medida —eso segundo no debería pasar nunca y
 * lo vigila `verify:lindes-mundo`—.
 */
export function cajasDeLaPuesta(
  p: PuestaEnLaLosa,
  cx: number,
  cz: number,
): { readonly cuerpo: Cuerpo; readonly forma: FormaDelCuerpo }[] {
  const como = comoEstorba(p.pieza);
  if (como === 'nada') return [];
  const huella = HUELLA_DEL_MODELO[p.pieza];
  if (huella === undefined) return [];
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
      /* Redonda: el cuadrado de su mayor semieje, que es su caja la gire uno como la gire. */
      const r = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d));
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

/** Cada losa, montada con el reparto y con su semilla, como la monta la escena. */
function montarTodas(losas: readonly LosaParaElMundo[], semilla: number): ContenidoDeLosa[] {
  const salida: ContenidoDeLosa[] = [];
  for (const l of losas) salida.push(montarLaLosa(l.losa, l.giro, semillaDeLaLosa(semilla, l.x, l.y)));
  return salida;
}

function cuerposDe(losas: readonly LosaParaElMundo[], contenidos: readonly ContenidoDeLosa[]): CuerpoDeLasLindes[] {
  const salida: CuerpoDeLasLindes[] = [];
  for (let i = 0; i < losas.length; i++) {
    const l = losas[i] as LosaParaElMundo;
    const cx = l.x * LADO_DE_LOSA;
    const cz = -l.y * LADO_DE_LOSA;
    for (const p of (contenidos[i] as ContenidoDeLosa).puestas) {
      for (const c of cajasDeLaPuesta(p, cx, cz)) {
        salida.push({ cuerpo: c.cuerpo, pieza: p.pieza, porque: p.porque, losa: i, forma: c.forma });
      }
    }
  }
  return salida;
}

/**
 * LOS CUERPOS DE UN TABLERO, con de dónde sale cada uno.
 *
 * Son EXACTAMENTE los de `mundoDeLasLindes`, en el mismo orden —el mundo se hace con esta misma
 * lista, quitándole el origen—, así que contarlos aquí es contar lo que hay en el mundo.
 */
export function cuerposDeLasLindes(losas: readonly LosaParaElMundo[], semilla: number): CuerpoDeLasLindes[] {
  return cuerposDe(losas, montarTodas(losas, semilla));
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
 * EL SITIO DONDE SE NACE EN UNA LOSA. Ver la cabecera: la lógica que tenía `nacerEnLaLosa`, con la
 * arena de este mundo como juez de si se puede estar.
 */
function sitioParaNacer(
  l: LosaParaElMundo,
  dentro: ContenidoDeLosa,
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

/** Los cuerpos que pueden importar para nacer en la losa `(x, y)`: los que tocan su cuadrado, con margen. */
function cuerposCercaDe(l: LosaParaElMundo, cuerpos: readonly Cuerpo[]): Cuerpo[] {
  const margen = LADO_DE_LOSA / 8;
  const cx = l.x * LADO_DE_LOSA;
  const cz = -l.y * LADO_DE_LOSA;
  const x0 = cx - LADO_DE_LOSA / 2 - margen;
  const x1 = cx + LADO_DE_LOSA / 2 + margen;
  const z0 = cz - LADO_DE_LOSA / 2 - margen;
  const z1 = cz + LADO_DE_LOSA / 2 + margen;
  const salida: Cuerpo[] = [];
  for (const b of cuerpos) {
    if (b.x1 < x0 || b.x0 > x1 || b.z1 < z0 || b.z0 > z1) continue;
    salida.push(b);
  }
  return salida;
}

/** EL MUNDO DE UN TABLERO DE LAS LINDES. Función pura: la misma vista da el mismo mundo en los dos lados. */
export function mundoDeLasLindes(losas: readonly LosaParaElMundo[], semilla: number): MundoDeclarado {
  const contenidos = montarTodas(losas, semilla);
  const cuerpos = cuerposDe(losas, contenidos).map((c) => c.cuerpo);
  const pisables = losas.map((l) => ({ x: l.x, y: l.y }));
  /*
   * La arena con la que se decide dónde se nace es la de este mismo mundo, sin los sitios de
   * nacer: `nace` no cambia ni el suelo ni los cuerpos, así que la del mundo terminado contesta
   * lo mismo en cada uno.
   */
  const arena = arenaDe({ lado: LADO_DE_LOSA, pisables, vados: [], cuerpos, nace: [] });
  const nace: Sitio[] = [];
  for (let i = 0; i < losas.length; i++) {
    const l = losas[i] as LosaParaElMundo;
    nace.push(sitioParaNacer(l, contenidos[i] as ContenidoDeLosa, arena, cuerposCercaDe(l, cuerpos)));
  }
  return {
    lado: LADO_DE_LOSA,
    pisables,
    vados: [],
    cuerpos,
    nace,
  };
}
