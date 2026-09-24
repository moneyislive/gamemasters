/**
 * LOS 48 DURMIENTES DE GUION: la gente del barrio, y dónde está cada uno en cada tic.
 *
 * ═══ POR QUÉ UN GUION Y NO GENTE QUE DECIDE ═══
 *
 * Un Prestado sale de un durmiente: el servidor fija un punto y un tic, y cada aparato elige con
 * `durmienteMasCercano` al civil que se pone a temblar. Para que en los seis aparatos tiemble EL
 * MISMO —con su ropa, en su acera, a medio cruzar—, el sitio de cada durmiente tiene que ser una
 * función del barrio y del tic, y de nada más: ni del fotograma, ni de la calidad, ni de por dónde
 * ha pasado el jugador. Por eso no esquivan a nadie (el apartarse medio metro es adorno local del
 * cliente) y por eso son los mismos 48 en todos los niveles. El servidor no llama a esto nunca.
 *
 * ═══ UNA VUELTA DE GUION ═══
 *
 * Cada cuadrilla (de una a tres personas) da vueltas a un rectángulo de la red de aceras de
 * `quiebro-barrio.ts`: sus lados van por carriles —a un metro de las fachadas— y, donde el
 * rectángulo cruza una calle, cruza por el paso de cebra que hay justo ahí. La vuelta se escribe
 * una vez, tic a tic, con enteros y Q16.16: anda a su paso (de 1,1 a 1,5 m/s), y ante cada paso de
 * cebra mira el semáforo de su cruce y espera si no está en verde o si le quedan menos de 10 s.
 *
 * ═══ Y POR QUÉ DIEZ SEGUNDOS DE VERDE, Y NO CINCO ═══
 *
 * Porque cruzar cuesta más de cinco. El paso va de carril a carril: 10 m, de los que 6 son calzada.
 * El último de una cuadrilla de tres va 1,5 m detrás del primero y apartado 0,375 más, así que no
 * sale de la calzada hasta que el primero ha andado 8 + 1,875 m; al paso más lento (1,1 m/s, 0,055
 * m por tic) son 180 tics. Con el margen de cinco segundos (100 tics) que tenía la primera versión,
 * el 0,5 % del tiempo que se pasaba en la calzada era con el semáforo ya del otro sentido, hasta
 * 77 tics seguidos: gente cruzando con los coches en verde, que lo vio la revisión adversaria en
 * 48,8 millones de sitios. Con 200 tics de margen, quien empieza a cruzar ha salido antes de que
 * cambie; `verify:quiebro-barrio` lo mira tic a tic, no sólo al empezar a cruzar.
 *
 * ═══ Y POR QUÉ CADA VUELTA DURA UN NÚMERO EXACTO DE MINUTOS ═══
 *
 * El semáforo tiene un ciclo de 1.200 tics. Si una vuelta durara lo que sale de andar y esperar,
 * la siguiente llegaría a los semáforos en otra fase, esperaría otra cosa, y saber dónde está un
 * durmiente en el tic 20.000 obligaría a simular desde el 0. Así que al acabar la vuelta el
 * durmiente se queda parado en su esquina —charlando, fumando— hasta completar un múltiplo de
 * 1.200: cada vuelta ve los semáforos en la misma fase que la anterior, y el sitio en cualquier tic
 * sale de un módulo y una búsqueda en la vuelta, en tiempo constante. Vale también para tics
 * negativos o enormes.
 *
 * ═══ CUADRILLAS ═══
 *
 * Los de una cuadrilla van en fila por la misma vuelta: el segundo 0,75 m detrás del primero y el
 * tercero 1,5 m, contados a lo largo del camino (así doblan las esquinas sin saltar), y apartados
 * ±0,375 m en los dos ejes para no ir pisándose. Si el primero espera en el bordillo, los otros
 * esperan detrás; ninguno queda en la calzada porque el nudo del paso está a 2 m del bordillo.
 *
 * ═══ NUNCA DENTRO DE UNA CAJA ═══
 *
 * No lo comprueba nadie al andar: lo garantiza la acera por bandas de `quiebro-barrio.ts`. Por un
 * carril, a un metro de la línea de solar, ±0,375 y con 0,35 de radio, se ocupa de 0,275 a 1,725;
 * lo más cerca que se pone nada es la fachada (0) y las farolas, postes y quioscos (2,25). En los
 * pasos de cebra no aparca nadie. `verify:quiebro-barrio` lo mide durante 20.000 tics.
 *
 * ═══ LA MEMORIA POR BARRIO ═══
 *
 * El guion de un barrio se escribe una vez (unos 0,3 ms) y se guarda. No es estado del juego: la
 * misma entrada da siempre el mismo guion, y guardarlo sólo evita volver a escribirlo sesenta veces
 * por segundo. Si `tsx` cargara este módulo dos veces, cada copia tendría su memoria y las dos darían
 * lo mismo.
 *
 * Se guarda de dos formas. Por el OBJETO barrio, en un `WeakMap`, que es lo rápido y se va con el
 * barrio. Y por lo que el guion LEE del barrio —su clave de noche, su tiempo, sus semáforos y la red
 * de aceras—, en una memoria pequeña de las últimas ocho noches: la primera versión sólo tenía la
 * del objeto, y la revisión midió que una copia del barrio (`{ ...barrio }`, o el mismo barrio
 * derivado otra vez, o despejado) reescribía el guion en cada llamada: veinte veces más por
 * fotograma, y con `sitioDelDurmiente` por cabeza, 13 ms. Lo que se compara para reusar es
 * exactamente lo que se lee para escribir, así que reusar no puede dar otro guion.
 *
 * ═══ LAS UNIDADES, Y LO QUE LANZA ═══
 *
 * Los sitios van en Q16.16 y el barrio en metros: `durmienteMasCercano` pide el punto en Q16.16, y
 * uno con decimales —un punto en metros, casi siempre— LANZA en vez de elegir en silencio a otro
 * civil. Un tic que no es un número finito también lanza (`ticDelBarrio`): la primera versión
 * dejaba con `NaN` a los 48 en el origen, dentro de la fuente, y `x: null` en `sitioDelDurmiente`.
 *
 * ═══ Y LOS DE LA CIUDAD ABIERTA ═══
 *
 * Al final del fichero, «Los durmientes de la ciudad»: los unos 630 de la ciudad de 540 m, con las firmas
 * de `quiebro-ciudad.ts`. Lo de arriba es el barrio de hoy y conserva su firma hasta que la multitud pase a
 * éstas (ola B de `docs/quiebro/CIUDAD-ABIERTA.md`).
 */
import { UNO } from '../../mecanicas/fijo';
import { chorroDeAzar, claveDeLaNoche, ticDelBarrio, TICS_DEL_SEMAFORO, TICS_EN_VERDE } from './quiebro-barrio';
import type { Barrio, Rectangulo as RectanguloDelBarrio, TramoDeAcera } from './quiebro-barrio';
import { celdaDe, CELDA_MAXIMA, CELDA_MINIMA, CELDAS, huecoDelIndice, indiceDeCelda, indiceDeHueco, RADIO_DEL_PRESTADO, tramoDeLaCara } from './quiebro-ciudad';
import type { CiudadDeLaMesa, CuantosDurmientes, DurmienteMasCercano, DurmientesCerca, IdDeDistrito, NocheDeLaCiudad, SitioDeUnDurmiente } from './quiebro-ciudad';

/** Cuántos durmientes de guion tiene cada barrio. En todos los niveles, siempre estos. */
export const DURMIENTES = 48;

/** El radio de un durmiente, en Q16.16: 0,35 m, el de cualquier persona del juego. */
export const RADIO_DEL_DURMIENTE = 22938;

/** Lo que anda cada uno en un tic de 50 ms, en Q16.16: de 1,1 a 1,5 m/s. */
export const PASOS_POR_TIC: readonly number[] = [3604, 3932, 4260, 4588, 4915];

/** Lo que va cada uno de su cuadrilla detrás del anterior, a lo largo del camino: 0,75 m. */
const HUECO_EN_LA_FILA = 49152;
/** Lo que se aparta cada uno de la línea del carril, en los dos ejes: 0,375 m. */
const APARTE = 24576;
/** Con menos verde que esto (10 s) no se echa nadie a cruzar: ver la cabecera. */
export const MARGEN_DEL_VERDE = 200;
/** Lo que se queda parado en su esquina como poco al acabar cada vuelta: 2 s. */
const DESCANSO_MINIMO = 40;
/** De cuántos metros puede ser un lado de la vuelta: de una manzana (38) a dos y una calle (96). */
const LADO_MINIMO = 38;
const LADO_MAXIMO = 96;
/** Cuántos durmientes, contados desde el primero, dan vueltas pegadas a la glorieta. */
const DURMIENTES_CERCA = 20;

/** Lo que hace el primero de la cuadrilla en un trozo de la vuelta. */
export const ANDA = 0;
export const ESPERA = 1;
export const DESCANSA = 2;
export type QueHace = typeof ANDA | typeof ESPERA | typeof DESCANSA;

/**
 * UN TROZO DE LA VUELTA: de `desde` a `hasta` (tics de la vuelta, `hasta` excluido). Si anda, va
 * de (`x`, `z`) en la dirección (`dx`, `dz`) —un solo eje, con ±1— recorriendo `largo`; si espera en
 * un bordillo, está en (`x`, `z`) mirando hacia donde va a cruzar; si descansa, está en la esquina
 * donde empieza la vuelta. `arco` es lo andado de la vuelta al empezar el trozo, y `cruce` el cruce
 * cuyo semáforo manda en este paso de cebra (`null` si no lo es). Todo en Q16.16.
 */
export interface TrozoDeLaVuelta {
  readonly hace: QueHace;
  readonly desde: number;
  readonly hasta: number;
  readonly x: number;
  readonly z: number;
  readonly dx: number;
  readonly dz: number;
  readonly largo: number;
  readonly arco: number;
  readonly cruce: number | null;
}

/**
 * UNA CUADRILLA: su vuelta y su reloj. En el tic `t` va por el tic `(t + desfase) mod periodo` de
 * su vuelta. `trozos` cubre la vuelta entera, en orden; `andados` son los índices de los que andan,
 * que en orden de `arco` van de 0 a `perimetro` sin huecos.
 */
export interface CuadrillaDeDurmientes {
  readonly miembros: number;
  readonly paso: number;
  readonly periodo: number;
  readonly desfase: number;
  readonly perimetro: number;
  readonly trozos: readonly TrozoDeLaVuelta[];
  readonly andados: readonly number[];
}

/**
 * Cómo es cada durmiente: a qué cuadrilla va y en qué puesto de la fila, y lo que se le ve —dos
 * cuerpos, cuatro ropas y el paraguas—, que tiene que ser igual en todos los aparatos porque el
 * Prestado que sale de él conserva su ropa.
 */
export interface AspectoDelDurmiente {
  readonly cuadrilla: number;
  readonly puesto: number;
  readonly cuerpo: number;
  readonly ropa: number;
  readonly paraguas: boolean;
}

/** El guion entero de un barrio. */
export interface GuionDeLosDurmientes {
  readonly cuadrillas: readonly CuadrillaDeDurmientes[];
  readonly durmientes: readonly AspectoDelDurmiente[];
}

/** Dónde está un durmiente, en Q16.16, hacia dónde mira (0-255) y si va andando. */
export interface SitioDelDurmiente {
  readonly x: number;
  readonly z: number;
  readonly rumbo: number;
  readonly anda: boolean;
}

/* ─── Escribir el guion ───────────────────────────────────────────────────── */

function modulo(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Un rectángulo de la rejilla de carriles, por índices: de `i0` a `i1` en `x` y de `j0` a `j1` en `z`. */
interface Rectangulo {
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
}

/**
 * Los rectángulos por los que se puede dar una vuelta: lados sobre carriles, de 38 a 96 m. Y los
 * de CERCA: los que no salen de los carriles de las cuatro calles que rodean la glorieta (del −29 al
 * 29), así que quien va por ellos está siempre a menos de 60 m por calles del centro.
 *
 * Antes eran «los que tienen algún lado junto a la glorieta», y no bastaba: una vuelta así puede
 * pasar la mayor parte del tiempo en la otra punta, y hubo noches con sólo nueve personas cerca de
 * la plaza, que es de donde tienen que salir los Prestados del principio.
 */
function lasVueltas(carriles: readonly number[]): { todas: Rectangulo[]; cerca: Rectangulo[] } {
  const lados: [number, number][] = [];
  for (let a = 0; a < carriles.length; a++) {
    for (let b = a + 1; b < carriles.length; b++) {
      const largo = (carriles[b] as number) - (carriles[a] as number);
      if (largo >= LADO_MINIMO && largo <= LADO_MAXIMO) lados.push([a, b]);
    }
  }
  const junto = (k: number): boolean => k >= 2 && k <= 5;
  const todas: Rectangulo[] = [];
  const cerca: Rectangulo[] = [];
  for (const [i0, i1] of lados) {
    for (const [j0, j1] of lados) {
      const r = { i0, i1, j0, j1 };
      todas.push(r);
      if (junto(i0) && junto(i1) && junto(j0) && junto(j1)) cerca.push(r);
    }
  }
  return { todas, cerca };
}

/**
 * Los nudos de un rectángulo, en el sentido de las agujas del reloj desde su esquina noroeste
 * (norte hacia el este, este hacia el sur, sur hacia el oeste, oeste hacia el norte), como pares
 * (i, j). La vuelta cierra del último al primero.
 */
function nudosDeLaVuelta(r: Rectangulo): [number, number][] {
  const salida: [number, number][] = [];
  for (let i = r.i0; i <= r.i1; i++) salida.push([i, r.j0]);
  for (let j = r.j0 + 1; j <= r.j1; j++) salida.push([r.i1, j]);
  for (let i = r.i1 - 1; i >= r.i0; i--) salida.push([i, r.j1]);
  for (let j = r.j1 - 1; j > r.j0; j--) salida.push([r.i0, j]);
  return salida;
}

/**
 * LA VUELTA DE UNA CUADRILLA, tic a tic. Los pasos de cebra se reconocen en la red de aceras del
 * barrio (`aceras.tramos`), no se deducen aquí: si la red cambia, los durmientes la siguen.
 */
function escribirLaVuelta(
  barrio: Barrio,
  cruceDelPaso: Int16Array,
  r: Rectangulo,
  alReves: boolean,
  esquina: number,
  paso: number,
  fase: number,
): { trozos: TrozoDeLaVuelta[]; perimetro: number; periodo: number } {
  const carriles = barrio.aceras.carriles;
  const n = carriles.length;
  let nudos = nudosDeLaVuelta(r);
  if (alReves) nudos = nudos.slice().reverse();
  /* Se empieza en una de las cuatro esquinas: la que diga `esquina`. */
  const esquinas: [number, number][] = [[r.i0, r.j0], [r.i1, r.j0], [r.i1, r.j1], [r.i0, r.j1]];
  const [ei, ej] = esquinas[esquina] as [number, number];
  let empieza = 0;
  for (let k = 0; k < nudos.length; k++) {
    const [i, j] = nudos[k] as [number, number];
    if (i === ei && j === ej) empieza = k;
  }
  const trozos: TrozoDeLaVuelta[] = [];
  let t = 0;
  let arco = 0;
  for (let k = 0; k < nudos.length; k++) {
    const [iu, ju] = nudos[(empieza + k) % nudos.length] as [number, number];
    const [iv, jv] = nudos[(empieza + k + 1) % nudos.length] as [number, number];
    const x = (carriles[iu] as number) * UNO;
    const z = (carriles[ju] as number) * UNO;
    const dx = Math.sign(iv - iu);
    const dz = Math.sign(jv - ju);
    const largo = Math.abs((carriles[iv] as number) - (carriles[iu] as number)) * UNO + Math.abs((carriles[jv] as number) - (carriles[ju] as number)) * UNO;
    const cruce = cruceDelPaso[(ju * n + iu) * n * n + jv * n + iv] as number;
    if (cruce >= 0) {
      /*
       * El semáforo, en el tic de la vuelta: el tic del barrio es `t − fase` más vueltas enteras,
       * que son minutos exactos y no cambian la fase. Se cruza con 5 s de verde por delante.
       */
      const f = modulo(t - fase + (barrio.aceras.semaforos[cruce] ?? 0), TICS_DEL_SEMAFORO);
      let espera = 0;
      if (dx !== 0) espera = f <= TICS_EN_VERDE - MARGEN_DEL_VERDE ? 0 : TICS_DEL_SEMAFORO - f;
      else espera = f >= TICS_EN_VERDE && f <= TICS_DEL_SEMAFORO - MARGEN_DEL_VERDE ? 0 : modulo(TICS_EN_VERDE - f, TICS_DEL_SEMAFORO);
      if (espera > 0) {
        trozos.push({ hace: ESPERA, desde: t, hasta: t + espera, x, z, dx, dz, largo: 0, arco, cruce });
        t += espera;
      }
    }
    const dura = Math.ceil(largo / paso);
    trozos.push({ hace: ANDA, desde: t, hasta: t + dura, x, z, dx, dz, largo, arco, cruce: cruce >= 0 ? cruce : null });
    t += dura;
    arco += largo;
  }
  const periodo = Math.ceil((t + DESCANSO_MINIMO) / TICS_DEL_SEMAFORO) * TICS_DEL_SEMAFORO;
  const primero = trozos[0] as TrozoDeLaVuelta;
  const ultimo = trozos[trozos.length - 1] as TrozoDeLaVuelta;
  const cierre = { x: ultimo.x + ultimo.dx * ultimo.largo, z: ultimo.z + ultimo.dz * ultimo.largo };
  trozos.push({ hace: DESCANSA, desde: t, hasta: periodo, x: cierre.x, z: cierre.z, dx: primero.dx, dz: primero.dz, largo: 0, arco, cruce: null });
  return { trozos, perimetro: arco, periodo };
}

/**
 * EL GUION DE UN BARRIO, sin memoria: 48 durmientes en cuadrillas de una a tres. La primera da
 * vueltas a la glorieta por su acera; hasta el vigésimo, por vueltas que no salen de las calles que
 * rodean la plaza, así que siempre hay veinte a 60 m o menos (de ahí salen los Prestados del
 * principio); el resto, por cualquier sitio del barrio.
 */
function escribirElGuion(barrio: Barrio): GuionDeLosDurmientes {
  const ch = chorroDeAzar(`${claveDeLaNoche(barrio.codigo, barrio.noche)}#durmientes`);
  const carriles = barrio.aceras.carriles;
  const n = carriles.length;
  /*
   * Qué cruce manda en el tramo de acera entre dos nudos, en los dos sentidos, o −1 si no es un
   * paso de cebra. Una tabla por pares de nudos (64 × 64), llenada desde la red del barrio.
   */
  const cruceDelPaso = new Int16Array(n * n * n * n).fill(-1);
  for (const t of barrio.aceras.tramos) {
    if (t.tipo !== 'paso' || t.cruce === null) continue;
    cruceDelPaso[t.a * n * n + t.b] = t.cruce;
    cruceDelPaso[t.b * n * n + t.a] = t.cruce;
  }
  const { todas, cerca } = lasVueltas(carriles);
  const glorieta: Rectangulo = { i0: 3, i1: 4, j0: 3, j1: 4 };
  const conParaguas = barrio.adorno.tiempo !== 'niebla';

  const cuadrillas: CuadrillaDeDurmientes[] = [];
  const durmientes: AspectoDelDurmiente[] = [];
  while (durmientes.length < DURMIENTES) {
    const tirada = ch.entero(0, 99);
    const miembros = Math.min(DURMIENTES - durmientes.length, tirada < 55 ? 1 : tirada < 85 ? 2 : 3);
    const r = cuadrillas.length === 0 ? glorieta : durmientes.length < DURMIENTES_CERCA ? ch.uno(cerca) : ch.uno(todas);
    const alReves = ch.sale(50);
    const esquina = ch.entero(0, 3);
    const paso = ch.uno(PASOS_POR_TIC);
    const fase = ch.entero(0, TICS_DEL_SEMAFORO - 1);
    const vuelta = escribirLaVuelta(barrio, cruceDelPaso, r, alReves, esquina, paso, fase);
    const desfase = fase + TICS_DEL_SEMAFORO * ch.entero(0, vuelta.periodo / TICS_DEL_SEMAFORO - 1);
    const andados: number[] = [];
    for (let k = 0; k < vuelta.trozos.length; k++) if ((vuelta.trozos[k] as TrozoDeLaVuelta).hace === ANDA) andados.push(k);
    const cuadrilla = cuadrillas.length;
    cuadrillas.push({ miembros, paso, periodo: vuelta.periodo, desfase, perimetro: vuelta.perimetro, trozos: vuelta.trozos, andados });
    for (let puesto = 0; puesto < miembros; puesto++) {
      durmientes.push({ cuadrilla, puesto, cuerpo: ch.entero(0, 1), ropa: ch.entero(0, 3), paraguas: conParaguas && ch.sale(60) });
    }
  }
  return { cuadrillas, durmientes };
}

/**
 * El guion ya escrito de cada barrio. Ver «La memoria por barrio» en la cabecera: no es estado del
 * juego, es no volver a escribir lo mismo sesenta veces por segundo.
 */
const GUIONES = new WeakMap<Barrio, GuionDeLosDurmientes>();

/** Lo que el guion lee del barrio, y el guion que salió: para reusarlo con otro objeto igual. */
interface GuionRecordado {
  readonly tiempo: string;
  readonly semaforos: readonly number[];
  readonly carriles: readonly number[];
  readonly tramos: Barrio['aceras']['tramos'];
  readonly guion: GuionDeLosDurmientes;
}

/** La memoria por lo que se lee, con la clave de la noche. Las últimas `NOCHES_RECORDADAS`. */
const POR_NOCHE = new Map<string, GuionRecordado>();
const NOCHES_RECORDADAS = 8;

/**
 * ¿Lee el guion de este barrio lo mismo que leyó el recordado? La red de aceras se compara por
 * identidad porque es la compartida y congelada de `quiebro-barrio.ts`: un barrio con otra red es
 * otro barrio, aunque se llame igual.
 */
function leeLoMismo(r: GuionRecordado, barrio: Barrio): boolean {
  const a = barrio.aceras;
  if (r.tiempo !== barrio.adorno.tiempo || r.carriles !== a.carriles || r.tramos !== a.tramos || r.semaforos.length !== a.semaforos.length) return false;
  for (let k = 0; k < a.semaforos.length; k++) if (r.semaforos[k] !== a.semaforos[k]) return false;
  return true;
}

/** EL GUION DE LOS DURMIENTES DE UN BARRIO. Función pura del barrio: ver «La memoria por barrio». */
export function guionDeLosDurmientes(barrio: Barrio): GuionDeLosDurmientes {
  const hecho = GUIONES.get(barrio);
  if (hecho !== undefined) return hecho;
  const clave = claveDeLaNoche(barrio.codigo, barrio.noche);
  const recordado = POR_NOCHE.get(clave);
  if (recordado !== undefined && leeLoMismo(recordado, barrio)) {
    GUIONES.set(barrio, recordado.guion);
    return recordado.guion;
  }
  const nuevo = escribirElGuion(barrio);
  GUIONES.set(barrio, nuevo);
  POR_NOCHE.delete(clave);
  POR_NOCHE.set(clave, { tiempo: barrio.adorno.tiempo, semaforos: barrio.aceras.semaforos.slice(), carriles: barrio.aceras.carriles, tramos: barrio.aceras.tramos, guion: nuevo });
  /* La más vieja, fuera: un `Map` se recorre en el orden en que se llenó. */
  for (const vieja of POR_NOCHE.keys()) {
    if (POR_NOCHE.size <= NOCHES_RECORDADAS) break;
    POR_NOCHE.delete(vieja);
  }
  return nuevo;
}

/* ─── Leer el guion ───────────────────────────────────────────────────────── */

/** El rumbo (0-255) de ir en la dirección (dx, dz) de un solo eje. */
function rumboDe(dx: number, dz: number): number {
  if (dx > 0) return 64;
  if (dx < 0) return 192;
  return dz > 0 ? 128 : 0;
}

/** Qué hace la cuadrilla en el tic `tic` (ya entero) del barrio: el trozo, y lo andado de la vuelta. */
function comoVa(c: CuadrillaDeDurmientes, tic: number): { trozo: TrozoDeLaVuelta; arco: number } {
  const t = modulo(tic + c.desfase, c.periodo);
  let bajo = 0;
  let alto = c.trozos.length - 1;
  while (bajo < alto) {
    const medio = Math.floor((bajo + alto + 1) / 2);
    if ((c.trozos[medio] as TrozoDeLaVuelta).desde <= t) bajo = medio;
    else alto = medio - 1;
  }
  const trozo = c.trozos[bajo] as TrozoDeLaVuelta;
  if (trozo.hace === ANDA) return { trozo, arco: trozo.arco + Math.min(trozo.largo, (t - trozo.desde) * c.paso) };
  return { trozo, arco: trozo.arco };
}

/** El sitio y el rumbo del que va `atras` (Q16.16) por detrás de `arco` en la vuelta. */
function enElArco(c: CuadrillaDeDurmientes, arco: number, atras: number): { x: number; z: number; rumbo: number } {
  const s = modulo(arco - atras, c.perimetro);
  let bajo = 0;
  let alto = c.andados.length - 1;
  while (bajo < alto) {
    const medio = Math.floor((bajo + alto + 1) / 2);
    if ((c.trozos[c.andados[medio] as number] as TrozoDeLaVuelta).arco <= s) bajo = medio;
    else alto = medio - 1;
  }
  const t = c.trozos[c.andados[bajo] as number] as TrozoDeLaVuelta;
  const d = s - t.arco;
  return { x: t.x + t.dx * d, z: t.z + t.dz * d, rumbo: rumboDe(t.dx, t.dz) };
}

/** Lo que se aparta de su carril el de cada puesto de la fila, en los dos ejes. */
function apartado(puesto: number): number {
  return puesto === 0 ? 0 : puesto === 1 ? APARTE : -APARTE;
}

/**
 * EL SITIO DEL DURMIENTE `i` EN EL TIC `tic`: en Q16.16, con su rumbo y si va andando. Puro:
 * depende del barrio y del tic, y de nada más. Lanza con un tic que no es un número finito.
 */
export function sitioDelDurmiente(barrio: Barrio, i: number, tic: number): SitioDelDurmiente {
  const t = ticDelBarrio(tic);
  const guion = guionDeLosDurmientes(barrio);
  const quien = guion.durmientes[i];
  if (quien === undefined) throw new RangeError(`No hay durmiente ${String(i)}: son ${String(DURMIENTES)}, del 0 al ${String(DURMIENTES - 1)}.`);
  const c = guion.cuadrillas[quien.cuadrilla] as CuadrillaDeDurmientes;
  const { trozo, arco } = comoVa(c, t);
  const p = enElArco(c, arco, quien.puesto * HUECO_EN_LA_FILA);
  const a = apartado(quien.puesto);
  return { x: p.x + a, z: p.z + a, rumbo: p.rumbo, anda: trozo.hace === ANDA };
}

/**
 * LOS 48 EN UNA LISTA PLANA, sin crear un objeto por cabeza: `x, z, rumbo, anda` por durmiente
 * (192 enteros), para la multitud del cliente, que lo lee en cada fotograma. Cada cuadrilla se
 * mira una vez.
 */
export function escribirLosDurmientes(barrio: Barrio, tic: number, destino: Int32Array): void {
  if (destino.length < DURMIENTES * 4) throw new RangeError(`Hacen falta ${String(DURMIENTES * 4)} enteros y hay ${String(destino.length)}.`);
  const t = ticDelBarrio(tic);
  const guion = guionDeLosDurmientes(barrio);
  let k = 0;
  for (const c of guion.cuadrillas) {
    const { trozo, arco } = comoVa(c, t);
    const anda = trozo.hace === ANDA ? 1 : 0;
    for (let puesto = 0; puesto < c.miembros; puesto++) {
      const p = enElArco(c, arco, puesto * HUECO_EN_LA_FILA);
      const a = apartado(puesto);
      destino[k] = p.x + a;
      destino[k + 1] = p.z + a;
      destino[k + 2] = p.rumbo;
      destino[k + 3] = anda;
      k += 4;
    }
  }
}

/** LOS 48, como objetos. Mismo orden que los índices de `sitioDelDurmiente`. */
export function durmientesEn(barrio: Barrio, tic: number): SitioDelDurmiente[] {
  const plano = new Int32Array(DURMIENTES * 4);
  escribirLosDurmientes(barrio, tic, plano);
  const salida: SitioDelDurmiente[] = [];
  for (let i = 0; i < DURMIENTES; i++) {
    salida.push({ x: plano[i * 4] as number, z: plano[i * 4 + 1] as number, rumbo: plano[i * 4 + 2] as number, anda: plano[i * 4 + 3] === 1 });
  }
  return salida;
}

/** La mayor coordenada que admite `durmienteMasCercano`: 512 m en Q16.16, el tope de la Liza. */
const TOPE_DEL_PUNTO = 33554432;

/**
 * EL DURMIENTE MÁS CERCANO a (`x`, `z`) —en Q16.16, enteros— en el tic `tic`, sin contar los
 * `excluidos` (los que ya son Prestados, por ejemplo). Es la función con la que todos los aparatos
 * eligen al mismo civil: distancia al cuadrado en enteros exactos (con el punto a 512 m como mucho y
 * los durmientes a 78, cada diferencia cabe en 2^26 y la suma de cuadrados en 2^53) y, a igual
 * distancia, el de índice menor. `null` si no queda ninguno. Un punto con decimales —en metros,
 * casi siempre— o fuera de ±512 m lanza: ver «Las unidades» en la cabecera.
 */
export function durmienteMasCercano(barrio: Barrio, tic: number, x: number, z: number, excluidos: readonly number[] = []): number | null {
  if (!Number.isInteger(x) || !Number.isInteger(z) || Math.abs(x) > TOPE_DEL_PUNTO || Math.abs(z) > TOPE_DEL_PUNTO) {
    throw new RangeError(`El punto va en Q16.16 (enteros hasta ±${String(TOPE_DEL_PUNTO)}), y llegó (${String(x)}, ${String(z)}): ¿en metros?`);
  }
  const plano = new Int32Array(DURMIENTES * 4);
  escribirLosDurmientes(barrio, tic, plano);
  let mejor: number | null = null;
  let mejorDistancia = 0;
  for (let i = 0; i < DURMIENTES; i++) {
    if (excluidos.indexOf(i) >= 0) continue;
    const dx = (plano[i * 4] as number) - x;
    const dz = (plano[i * 4 + 1] as number) - z;
    const d = dx * dx + dz * dz;
    if (mejor === null || d < mejorDistancia) {
      mejor = i;
      mejorDistancia = d;
    }
  }
  return mejor;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  LOS DURMIENTES DE LA CIUDAD (docs/quiebro/CIUDAD-ABIERTA.md §5.8)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pasan de 48 a unos 630, en unas 320 cuadrillas, con la densidad de cada distrito (§2.2): 7 por manzana
 * en el Casco, 6 en el Ensanche y en la Lonja, 2 en las Naves, 4 en las Torres, y 10 en cada plaza. Con las
 * reglas del barrio —guion y no gente que decide, vueltas de minutos exactos, semáforos con margen, nunca
 * dentro de una caja por la acera por bandas— y tres cambios:
 *
 *   · EL REPARTO ES DE LA MESA Y EL GUION DE LA NOCHE. Quién es cada durmiente (su cuadrilla, su puesto,
 *     su cuerpo y su ropa) y por dónde da la vuelta sale de la ciudad de la mesa (`CÓDIGO#d<hueco>`): sus
 *     índices son los mismos todas las noches, que es lo que nombra `FuenteDeCuerpos.prestados()`. A qué
 *     paso va, dónde empieza, cuándo espera y si lleva paraguas sale de la noche (`CÓDIGO#noche#d<k>`).
 *   · CADA CUADRILLA DA LA VUELTA A SU MANZANA, o a dos cruzando por la cebra (§5.8), por el anillo de
 *     aceras de `quiebro-ciudad.ts` (a 1 m de la línea de solar). Así la caja de su vuelta se sabe sin
 *     escribir el guion, y las cuadrillas que pueden estar cerca de un punto se buscan en las celdas de 48 m
 *     sin tocar las demás.
 *   · EL GUION SE ESCRIBE CUANDO HACE FALTA, cuadrilla a cuadrilla, y se guarda por noche: nadie escribe
 *     630 guiones para pintar los 64 de al lado. Da igual quién lo pida primero y en qué orden: cada guion
 *     sale de su propio chorro. La cuadrilla cuya vuelta pasa por la acera de una obra no sale esa noche
 *     (`null`): la obra corta la acera entera.
 *
 * Los semáforos de las avenidas piden más margen (`MARGEN_DEL_VERDE_EN_LA_AVENIDA`): de acera a acera son
 * 22 m y no 10, y el último de una cuadrilla de tres al paso más lento sale de la calzada 380 tics después
 * de que el primero empiece a cruzar. Hoy no cruza ninguna: el reparto no da vueltas a dos por una avenida
 * (y `verify:quiebro-barrio` lo mira), así que ese margen sólo cuenta el día que las dé.
 */

/** Cuántos durmientes da cada manzana de cada distrito (§2.2), y cada plaza. */
export const DURMIENTES_POR_MANZANA: Readonly<Record<IdDeDistrito, number>> = { casco: 7, ensanche: 6, lonja: 6, naves: 2, torres: 4 };
export const DURMIENTES_POR_PLAZA = 10;
/** El margen de verde para cruzar una avenida: 21 s (ver la cabecera de esta parte). */
export const MARGEN_DEL_VERDE_EN_LA_AVENIDA = 420;
/** Un paso de cebra más largo que esto cruza una avenida. */
const PASO_DE_CALLE = 12;
/** De cada cien cuadrillas de manzana, cuántas dan la vuelta a dos. */
const VUELTAS_A_DOS = 30;

/** UNA CUADRILLA DE LA CIUDAD: los huecos a los que da la vuelta, sus nudos de acera en orden, sus miembros, el primero de ellos y la caja de su vuelta. */
export interface CuadrillaDeLaCiudad {
  readonly huecos: readonly number[];
  readonly vuelta: readonly number[];
  readonly miembros: number;
  readonly primero: number;
  readonly caja: RectanguloDelBarrio;
  /** Los tramos de calle por cuya acera pasa: si uno tiene obra, no sale. */
  readonly tramos: readonly number[];
}

/** Cómo es cada durmiente de la ciudad: su cuadrilla, su puesto en la fila, su cuerpo (0-1) y su ropa (0-3). */
export interface DurmienteDeLaCiudad {
  readonly cuadrilla: number;
  readonly puesto: number;
  readonly cuerpo: number;
  readonly ropa: number;
}

/** EL REPARTO DE UNA CIUDAD: sus cuadrillas, sus durmientes y, por celda, las cuadrillas cuya vuelta la toca. */
export interface RepartoDeLosDurmientes {
  readonly cuadrillas: readonly CuadrillaDeLaCiudad[];
  readonly durmientes: readonly DurmienteDeLaCiudad[];
  readonly porCelda: readonly (readonly number[])[];
}

const REPARTOS = new WeakMap<CiudadDeLaMesa, RepartoDeLosDurmientes>();

/** Los nudos de acera de la vuelta a un hueco, o a dos (el del este o el del sur), en el sentido de las agujas del reloj. */
function nudosDeLaVueltaEnLaCiudad(n: number, m: number | null, alEste: boolean): number[] {
  if (m === null) return [4 * n, 4 * n + 1, 4 * n + 2, 4 * n + 3];
  if (alEste) return [4 * n, 4 * n + 1, 4 * m, 4 * m + 1, 4 * m + 2, 4 * m + 3, 4 * n + 2, 4 * n + 3];
  return [4 * n, 4 * n + 1, 4 * n + 2, 4 * m + 1, 4 * m + 2, 4 * m + 3, 4 * m, 4 * n + 3];
}

/** Un tramo de acera entre dos nudos, por los dos sentidos. */
function tramosDeAceraPorPareja(ciudad: CiudadDeLaMesa): Map<number, TramoDeAcera> {
  const salida = new Map<number, TramoDeAcera>();
  const n = ciudad.aceras.nudos.length;
  for (const t of ciudad.aceras.tramos) {
    salida.set(t.a * n + t.b, t);
    salida.set(t.b * n + t.a, t);
  }
  return salida;
}

const PAREJAS = new WeakMap<CiudadDeLaMesa, Map<number, TramoDeAcera>>();

function parejasDe(ciudad: CiudadDeLaMesa): Map<number, TramoDeAcera> {
  let p = PAREJAS.get(ciudad);
  if (p === undefined) {
    p = tramosDeAceraPorPareja(ciudad);
    PAREJAS.set(ciudad, p);
  }
  return p;
}

/**
 * EL REPARTO DE LOS DURMIENTES DE UNA CIUDAD. Hueco a hueco, en su orden: los de su densidad, en cuadrillas
 * de una a tres; las de una plaza dan la vuelta a su plaza, y las de una manzana a la suya o, tres de cada
 * diez, a la suya y a la del este o la del sur si están al otro lado de una calle (no de una avenida) y no
 * es una plaza. Puro, y guardado por ciudad.
 */
export function repartoDeLosDurmientes(ciudad: CiudadDeLaMesa): RepartoDeLosDurmientes {
  const hecho = REPARTOS.get(ciudad);
  if (hecho !== undefined) return hecho;
  const parejas = parejasDe(ciudad);
  const cuantosNudos = ciudad.aceras.nudos.length;
  const cuadrillas: CuadrillaDeLaCiudad[] = [];
  const durmientes: DurmienteDeLaCiudad[] = [];
  for (const h of ciudad.huecos) {
    const ch = chorroDeAzar(`${ciudad.codigo}#d${String(h.indice)}`);
    const plaza = h.uso === 'plaza';
    let quedan = plaza ? DURMIENTES_POR_PLAZA : DURMIENTES_POR_MANZANA[h.distrito];
    while (quedan > 0) {
      const tirada = ch.entero(0, 99);
      const miembros = Math.min(quedan, tirada < 45 ? 1 : tirada < 80 ? 2 : 3);
      quedan -= miembros;
      let otro: number | null = null;
      let alEste = true;
      if (!plaza && ch.sale(VUELTAS_A_DOS)) {
        alEste = ch.sale(50);
        const i = h.i + (alEste ? 1 : 0);
        const j = h.j + (alEste ? 0 : 1);
        if (Math.abs(i) <= HUECO_MAXIMO_DE_LA_CIUDAD && Math.abs(j) <= HUECO_MAXIMO_DE_LA_CIUDAD) {
          const m = indiceDeHueco(i, j);
          const vuelta = nudosDeLaVueltaEnLaCiudad(h.indice, m, alEste);
          let vale = ciudad.huecos[m]?.uso !== 'plaza';
          for (let k = 0; k < vuelta.length && vale; k++) {
            const t = parejas.get((vuelta[k] as number) * cuantosNudos + (vuelta[(k + 1) % vuelta.length] as number));
            if (t === undefined || (t.tipo === 'paso' && t.largo > PASO_DE_CALLE)) vale = false;
          }
          if (vale) otro = m;
        }
      }
      const vuelta = nudosDeLaVueltaEnLaCiudad(h.indice, otro, alEste);
      let x0 = Infinity;
      let z0 = Infinity;
      let x1 = -Infinity;
      let z1 = -Infinity;
      for (const k of vuelta) {
        const p = ciudad.aceras.nudos[k] as { x: number; z: number };
        x0 = Math.min(x0, p.x - APARTE_EN_METROS);
        z0 = Math.min(z0, p.z - APARTE_EN_METROS);
        x1 = Math.max(x1, p.x + APARTE_EN_METROS);
        z1 = Math.max(z1, p.z + APARTE_EN_METROS);
      }
      /* Los tramos de calle por cuya acera pasa: las caras de cada hueco que la vuelta recorre. */
      const tramos: number[] = [];
      const caras = (n: number, sin: 'este' | 'sur' | 'oeste' | 'norte' | null): void => {
        const { i, j } = huecoDelIndice(n);
        for (const cara of ['norte', 'este', 'sur', 'oeste'] as const) if (cara !== sin) tramos.push(tramoDeLaCara(i, j, cara).tramo);
      };
      if (otro === null) caras(h.indice, null);
      else {
        caras(h.indice, alEste ? 'este' : 'sur');
        caras(otro, alEste ? 'oeste' : 'norte');
      }
      const k = cuadrillas.length;
      cuadrillas.push(Object.freeze({ huecos: Object.freeze(otro === null ? [h.indice] : [h.indice, otro]), vuelta: Object.freeze(vuelta), miembros, primero: durmientes.length, caja: Object.freeze({ x0, z0, x1, z1 }), tramos: Object.freeze(tramos) }));
      for (let puesto = 0; puesto < miembros; puesto++) durmientes.push(Object.freeze({ cuadrilla: k, puesto, cuerpo: ch.entero(0, 1), ropa: ch.entero(0, 3) }));
    }
  }
  const porCelda: number[][] = [];
  for (let c = 0; c < CELDAS; c++) porCelda.push([]);
  for (let k = 0; k < cuadrillas.length; k++) {
    const c = (cuadrillas[k] as CuadrillaDeLaCiudad).caja;
    const a = celdaDe(c.x0, c.z0);
    const b = celdaDe(c.x1, c.z1);
    if (a === null || b === null) continue;
    for (let j = a.j; j <= b.j; j++) for (let i = a.i; i <= b.i; i++) (porCelda[indiceDeCelda(i, j)] as number[]).push(k);
  }
  const reparto: RepartoDeLosDurmientes = Object.freeze({ cuadrillas: Object.freeze(cuadrillas), durmientes: Object.freeze(durmientes), porCelda: Object.freeze(porCelda.map((l) => Object.freeze(l))) });
  REPARTOS.set(ciudad, reparto);
  return reparto;
}

/** El mayor índice de hueco en cada eje (el de `quiebro-ciudad.ts`, escrito aquí para leerse sin saltar). */
const HUECO_MAXIMO_DE_LA_CIUDAD = 5;
/** Lo que se aparta de su carril el de cada puesto, en metros: el `APARTE` del barrio. */
const APARTE_EN_METROS = 0.375;

/** CUÁNTOS DURMIENTES TIENE LA CIUDAD DE UNA MESA: los mismos todas las noches. */
export function durmientesDeLaCiudad(ciudad: CiudadDeLaMesa): number {
  return repartoDeLosDurmientes(ciudad).durmientes.length;
}

/** El guion de una cuadrilla en una noche, o `null` si esa noche no sale. */
export interface GuionDeUnaCuadrilla {
  readonly cuadrilla: CuadrillaDeDurmientes;
  readonly paraguas: readonly boolean[];
}

/** Los guiones escritos, por noche (el vestido de la noche: sus semáforos) y cuadrilla. */
const GUIONES_DE_LA_CIUDAD = new WeakMap<readonly number[], Map<number, GuionDeUnaCuadrilla | null>>();

/**
 * EL GUION DE LA CUADRILLA `k` EN UNA NOCHE, escrito la primera vez que se pide y guardado. `null` si su
 * vuelta pasa por la acera de una obra. Lo que se escribe es lo del barrio: tic a tic, a su paso, esperando
 * en cada paso de cebra a su verde con el margen de su calle, y descansando al final hasta un número exacto
 * de minutos.
 */
export function guionDeLaCuadrillaEnLaCiudad(noche: NocheDeLaCiudad, k: number): GuionDeUnaCuadrilla | null {
  const reparto = repartoDeLosDurmientes(noche.ciudad);
  const c = reparto.cuadrillas[k];
  if (c === undefined) throw new RangeError(`No hay cuadrilla ${String(k)}: son ${String(reparto.cuadrillas.length)}.`);
  let porCuadrilla = GUIONES_DE_LA_CIUDAD.get(noche.semaforos);
  if (porCuadrilla === undefined) {
    porCuadrilla = new Map();
    GUIONES_DE_LA_CIUDAD.set(noche.semaforos, porCuadrilla);
  }
  const hecho = porCuadrilla.get(k);
  if (hecho !== undefined) return hecho;
  let sale = true;
  for (const corte of noche.cortes) if (c.tramos.includes(corte.tramo)) sale = false;
  const guion = sale ? escribirLaVueltaEnLaCiudad(noche, c, k) : null;
  porCuadrilla.set(k, guion);
  return guion;
}

function escribirLaVueltaEnLaCiudad(noche: NocheDeLaCiudad, c: CuadrillaDeLaCiudad, k: number): GuionDeUnaCuadrilla {
  const ciudad = noche.ciudad;
  const ch = chorroDeAzar(`${claveDeLaNoche(ciudad.codigo, noche.noche)}#d${String(k)}`);
  const paso = ch.uno(PASOS_POR_TIC);
  const alReves = ch.sale(50);
  let nudos = c.vuelta.slice();
  if (alReves) nudos = nudos.reverse();
  const empieza = ch.entero(0, nudos.length - 1);
  const fase = ch.entero(0, TICS_DEL_SEMAFORO - 1);
  const parejas = parejasDe(ciudad);
  const cuantosNudos = ciudad.aceras.nudos.length;
  const trozos: TrozoDeLaVuelta[] = [];
  let t = 0;
  let arco = 0;
  for (let s = 0; s < nudos.length; s++) {
    const u = nudos[(empieza + s) % nudos.length] as number;
    const v = nudos[(empieza + s + 1) % nudos.length] as number;
    const p = ciudad.aceras.nudos[u] as { x: number; z: number };
    const q = ciudad.aceras.nudos[v] as { x: number; z: number };
    const x = p.x * UNO;
    const z = p.z * UNO;
    const dx = Math.sign(q.x - p.x);
    const dz = Math.sign(q.z - p.z);
    const largo = (Math.abs(q.x - p.x) + Math.abs(q.z - p.z)) * UNO;
    const tramo = parejas.get(u * cuantosNudos + v) as TramoDeAcera;
    const cruce = tramo.tipo === 'paso' ? tramo.cruce : null;
    if (cruce !== null) {
      /* El semáforo en el tic de la vuelta: el de la ciudad es `t − fase` más vueltas enteras, que son minutos exactos. */
      const margen = tramo.largo > PASO_DE_CALLE ? MARGEN_DEL_VERDE_EN_LA_AVENIDA : MARGEN_DEL_VERDE;
      const f = modulo(t - fase + (noche.semaforos[cruce] ?? 0), TICS_DEL_SEMAFORO);
      let espera = 0;
      if (dx !== 0) espera = f <= TICS_EN_VERDE - margen ? 0 : TICS_DEL_SEMAFORO - f;
      else espera = f >= TICS_EN_VERDE && f <= TICS_DEL_SEMAFORO - margen ? 0 : modulo(TICS_EN_VERDE - f, TICS_DEL_SEMAFORO);
      if (espera > 0) {
        trozos.push({ hace: ESPERA, desde: t, hasta: t + espera, x, z, dx, dz, largo: 0, arco, cruce });
        t += espera;
      }
    }
    const dura = Math.ceil(largo / paso);
    trozos.push({ hace: ANDA, desde: t, hasta: t + dura, x, z, dx, dz, largo, arco, cruce });
    t += dura;
    arco += largo;
  }
  const periodo = Math.ceil((t + DESCANSO_MINIMO) / TICS_DEL_SEMAFORO) * TICS_DEL_SEMAFORO;
  const primero = trozos[0] as TrozoDeLaVuelta;
  const ultimo = trozos[trozos.length - 1] as TrozoDeLaVuelta;
  trozos.push({ hace: DESCANSA, desde: t, hasta: periodo, x: ultimo.x + ultimo.dx * ultimo.largo, z: ultimo.z + ultimo.dz * ultimo.largo, dx: primero.dx, dz: primero.dz, largo: 0, arco, cruce: null });
  const desfase = fase + TICS_DEL_SEMAFORO * ch.entero(0, periodo / TICS_DEL_SEMAFORO - 1);
  const andados: number[] = [];
  for (let s = 0; s < trozos.length; s++) if ((trozos[s] as TrozoDeLaVuelta).hace === ANDA) andados.push(s);
  const conParaguas = noche.tiempo !== 'niebla';
  const paraguas: boolean[] = [];
  for (let puesto = 0; puesto < c.miembros; puesto++) paraguas.push(conParaguas && ch.sale(60));
  return Object.freeze({
    cuadrilla: Object.freeze({ miembros: c.miembros, paso, periodo, desfase, perimetro: arco, trozos: Object.freeze(trozos.map((x) => Object.freeze(x))), andados: Object.freeze(andados) }),
    paraguas: Object.freeze(paraguas),
  });
}

/** El durmiente `i` de la ciudad de una noche: su reparto y su guion (o `null` si no sale). Lanza con un índice que no existe. */
function elDurmiente(noche: NocheDeLaCiudad, i: number): { d: DurmienteDeLaCiudad; guion: GuionDeUnaCuadrilla | null } {
  const reparto = repartoDeLosDurmientes(noche.ciudad);
  const d = Number.isInteger(i) ? reparto.durmientes[i] : undefined;
  if (d === undefined) throw new RangeError(`No hay durmiente ${String(i)}: son ${String(reparto.durmientes.length)}, del 0 al ${String(reparto.durmientes.length - 1)}.`);
  return { d, guion: guionDeLaCuadrillaEnLaCiudad(noche, d.cuadrilla) };
}

/** Dónde está el de puesto `puesto` de una cuadrilla en el tic `t` (ya entero). */
function enSuSitio(c: CuadrillaDeDurmientes, puesto: number, t: number): SitioDelDurmiente {
  const { trozo, arco } = comoVa(c, t);
  const p = enElArco(c, arco, puesto * HUECO_EN_LA_FILA);
  const a = apartado(puesto);
  return { x: p.x + a, z: p.z + a, rumbo: p.rumbo, anda: trozo.hace === ANDA };
}

/**
 * EL SITIO DEL DURMIENTE `i` EN EL TIC `tic`, en Q16.16, con su rumbo y si anda; `null` si esta noche no
 * sale (su vuelta pasa por una obra). Puro: depende de la noche y del tic. Lanza con un tic que no es un
 * número finito o un índice que no existe.
 */
export function sitioDelDurmienteEnLaCiudad(noche: NocheDeLaCiudad, i: number, tic: number): SitioDelDurmiente | null {
  const t = ticDelBarrio(tic);
  const { d, guion } = elDurmiente(noche, i);
  return guion === null ? null : enSuSitio(guion.cuadrilla, d.puesto, t);
}

/** Cómo se ve el durmiente `i` esta noche: su cuadrilla, su puesto, su cuerpo, su ropa y si lleva paraguas (nunca con niebla). */
export function aspectoDelDurmienteEnLaCiudad(noche: NocheDeLaCiudad, i: number): AspectoDelDurmiente {
  const { d, guion } = elDurmiente(noche, i);
  return { cuadrilla: d.cuadrilla, puesto: d.puesto, cuerpo: d.cuerpo, ropa: d.ropa, paraguas: guion !== null && guion.paraguas[d.puesto] === true };
}

/** El punto que se pregunta, en Q16.16: entero y dentro de la Liza. Lanza si no (un punto en metros, casi siempre). */
function comprobarElPunto(x: number, z: number): void {
  if (!Number.isInteger(x) || !Number.isInteger(z) || Math.abs(x) > TOPE_DEL_PUNTO || Math.abs(z) > TOPE_DEL_PUNTO) {
    throw new RangeError(`El punto va en Q16.16 (enteros hasta ±${String(TOPE_DEL_PUNTO)}), y llegó (${String(x)}, ${String(z)}): ¿en metros?`);
  }
}

/**
 * Los durmientes a `radio` metros o menos de (`x`, `z`) —Q16.16— en el tic `t`, con su distancia al
 * cuadrado (enteros exactos: las diferencias no pasan de 2^26). Sólo mira las cuadrillas de las celdas que
 * toca el cuadrado del radio.
 */
function losDeCerca(noche: NocheDeLaCiudad, t: number, x: number, z: number, radio: number): { i: number; d: number }[] {
  if (!(radio >= 0) || !Number.isFinite(radio)) throw new RangeError(`El radio va en metros y tiene que ser un número finito, y llegó ${String(radio)}.`);
  const reparto = repartoDeLosDurmientes(noche.ciudad);
  const r = radio * UNO;
  const r2 = r * r;
  const xm = x / UNO;
  const zm = z / UNO;
  const a = { i: Math.max(CELDA_MINIMA, Math.floor((xm - radio + 24) / 48)), j: Math.max(CELDA_MINIMA, Math.floor((zm - radio + 24) / 48)) };
  const b = { i: Math.min(CELDA_MAXIMA, Math.floor((xm + radio + 24) / 48)), j: Math.min(CELDA_MAXIMA, Math.floor((zm + radio + 24) / 48)) };
  const vistas = new Set<number>();
  const salida: { i: number; d: number }[] = [];
  for (let cj = a.j; cj <= b.j; cj++) {
    for (let ci = a.i; ci <= b.i; ci++) {
      for (const k of reparto.porCelda[indiceDeCelda(ci, cj)] as readonly number[]) {
        if (vistas.has(k)) continue;
        vistas.add(k);
        const guion = guionDeLaCuadrillaEnLaCiudad(noche, k);
        if (guion === null) continue;
        const c = reparto.cuadrillas[k] as CuadrillaDeLaCiudad;
        for (let puesto = 0; puesto < c.miembros; puesto++) {
          const s = enSuSitio(guion.cuadrilla, puesto, t);
          const dx = s.x - x;
          const dz = s.z - z;
          const d = dx * dx + dz * dz;
          if (d <= r2) salida.push({ i: c.primero + puesto, d });
        }
      }
    }
  }
  return salida;
}

/**
 * EL DURMIENTE MÁS CERCANO a (`x`, `z`) —Q16.16, enteros— en el tic `tic`, a `radio` metros o menos (60 por
 * defecto), sin los `excluidos`: el que sale de un Prestado. A igual distancia, el de índice menor; `null`
 * si no hay nadie (las Naves de madrugada: el Prestado se imprime). Igual en todos los aparatos.
 */
export function durmienteMasCercanoEnLaCiudad(noche: NocheDeLaCiudad, tic: number, x: number, z: number, excluidos: readonly number[], radio: number = RADIO_DEL_PRESTADO): number | null {
  const t = ticDelBarrio(tic);
  comprobarElPunto(x, z);
  let mejor: number | null = null;
  let mejorD = 0;
  for (const c of losDeCerca(noche, t, x, z, radio)) {
    if (excluidos.includes(c.i)) continue;
    if (mejor === null || c.d < mejorD || (c.d === mejorD && c.i < mejor)) {
      mejor = c.i;
      mejorD = c.d;
    }
  }
  return mejor;
}

/**
 * LOS DURMIENTES CERCA de (`x`, `z`) —Q16.16— a `radio` metros o menos, en orden de (distancia, índice),
 * como mucho `tope`: los que se pintan (los 64 más cercanos a 90 m) y los candidatos a Prestado (los de 40 m
 * de cada jugador). Lanza con un punto que no es Q16.16, un radio que no es un número o un tic que no lo es.
 */
export function durmientesCercaEnLaCiudad(noche: NocheDeLaCiudad, tic: number, x: number, z: number, radio: number, tope: number): readonly number[] {
  const t = ticDelBarrio(tic);
  comprobarElPunto(x, z);
  const todos = losDeCerca(noche, t, x, z, radio);
  todos.sort((a, b) => a.d - b.d || a.i - b.i);
  const salida: number[] = [];
  for (let k = 0; k < todos.length && k < tope; k++) salida.push((todos[k] as { i: number }).i);
  return salida;
}

/**
 * LOS SITIOS DE UNOS DURMIENTES EN UNA LISTA PLANA, sin un objeto por cabeza: `x, z, rumbo, anda` por
 * índice de `indices`, en Q16.16, para la multitud del cliente, que lo lee en cada fotograma. Uno que esta
 * noche no sale se escribe con `anda` a −1.
 */
export function escribirLosDurmientesDeLaCiudad(noche: NocheDeLaCiudad, tic: number, indices: readonly number[], destino: Int32Array): void {
  if (destino.length < indices.length * 4) throw new RangeError(`Hacen falta ${String(indices.length * 4)} enteros y hay ${String(destino.length)}.`);
  const t = ticDelBarrio(tic);
  for (let k = 0; k < indices.length; k++) {
    const { d, guion } = elDurmiente(noche, indices[k] as number);
    if (guion === null) {
      destino[4 * k] = 0;
      destino[4 * k + 1] = 0;
      destino[4 * k + 2] = 0;
      destino[4 * k + 3] = -1;
      continue;
    }
    const s = enSuSitio(guion.cuadrilla, d.puesto, t);
    destino[4 * k] = s.x;
    destino[4 * k + 1] = s.z;
    destino[4 * k + 2] = s.rumbo;
    destino[4 * k + 3] = s.anda ? 1 : 0;
  }
}

/* Las firmas de la columna (`quiebro-ciudad.ts`, «Los durmientes de la ciudad»): si una deja de cumplirse, no compila. */
const FIRMAS_DE_LA_COLUMNA: readonly [CuantosDurmientes, SitioDeUnDurmiente, DurmienteMasCercano, DurmientesCerca] = [durmientesDeLaCiudad, sitioDelDurmienteEnLaCiudad, durmienteMasCercanoEnLaCiudad, durmientesCercaEnLaCiudad];
void FIRMAS_DE_LA_COLUMNA;
