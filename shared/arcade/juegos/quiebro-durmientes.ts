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
 */
import { UNO } from '../../mecanicas/fijo';
import { chorroDeAzar, claveDeLaNoche, ticDelBarrio, TICS_DEL_SEMAFORO, TICS_EN_VERDE } from './quiebro-barrio';
import type { Barrio } from './quiebro-barrio';

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
