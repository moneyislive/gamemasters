/**
 * LA GEOMETRÍA DE LA LIZA: rumbos, distancias, conos y la prueba de losa, todo entero.
 *
 * ═══ POR QUÉ UN FICHERO Y NO CUATRO FUNCIONES DENTRO DE LA SALA ═══
 *
 * Porque las mismas preguntas se hacen en tres sitios que no pueden discrepar: la sala del servidor
 * (¿le da?, ¿le ve?, ¿dónde se para el empujado?), el aparato (¿a quién engancho?, ¿dónde pinto la
 * bala?) y los comprobadores. Si cada uno se escribe su arcotangente, el día que dos redondeen
 * distinto un golpe que el aparato pintó dentro del cono lo juzga fuera el servidor, y lo que se
 * depura es «a veces no entra». Aquí hay UNA respuesta por pregunta, pura y entera.
 *
 * ═══ EL RUMBO HACIA ALGO, SIN ARCOTANGENTE ═══
 *
 * `Math.atan2` no está fijada al bit en la especificación —es de las «implementation-approximated»,
 * ver `verificar-pureza.ts`— y en `shared/` está prohibida. Tampoco hace falta: el rumbo que viaja y
 * se arbitra es un número de 0 a 255 de la tabla de `andar.ts`, así que la pregunta «¿hacia dónde
 * está?» es «¿cuál de esos 256 vectores apunta más hacia allí?». Se contesta con productos enteros:
 *
 *   1. El signo de `dx` dice en qué media vuelta cae (el este o el oeste).
 *   2. Dentro de esa media vuelta, el signo del producto cruzado con cada rumbo es MONÓTONO —dice
 *      «está antes» o «está después»—, así que ocho bisecciones dan el rumbo de justo antes.
 *   3. Entre ése y el siguiente gana el que queda del mismo lado de la bisectriz de los dos: otro
 *      producto cruzado (el escalar, que parece lo natural, se tuerce con el redondeo de la tabla).
 *
 * Los productos son de un seno de la tabla (≤ 2^16) por una diferencia de coordenadas (≤ 2^26): caben
 * de sobra en los 2^53 enteros exactos de la coma flotante, así que no pasan por `por()` ni pierden un
 * bit. `verify:liza-protocolo` lo compara con `Math.atan2` en los 256 rumbos (allí sí se puede).
 *
 * ═══ LA PRUEBA DE LOSA, CON FRACCIONES Y NO CON DIVISIONES ═══
 *
 * La pregunta de la línea de vista y la del empujón son la misma: ¿en qué fracción de este tramo se
 * entra por primera vez en una caja? La forma de siempre (el «slab test») divide en cada eje y
 * compara los cocientes. Aquí no se divide hasta el final: cada instante de entrada y de salida se
 * guarda como FRACCIÓN `n/d` con `d > 0`, y dos fracciones se comparan multiplicando en cruz, que es
 * exacto mientras los productos quepan en 2^53. Sólo la fracción que se DEVUELVE se convierte a Q16.16,
 * redondeando hacia abajo —el punto que sale nunca está más allá de la entrada—.
 *
 * «Dentro» es ESTRICTO, igual que `chocaConCuerpo` de `mundo.ts`: rozar una cara o pasar justo por
 * una esquina no es entrar. Y el cuerpo que se mueve es un CUADRADO de medio lado `radio`, no un
 * círculo, por la misma razón que da `mundo.ts` —la diferencia entre la esquina y el arco es menos que
 * el ancho de una bota, y el arco costaría una raíz—: por eso probar un cuerpo de radio `r` contra una
 * caja es probar su CENTRO contra la caja ensanchada `r` por cada lado, y el sitio donde se para un
 * empujado es un sitio donde `chocaConCuerpo` dice que no (`verify:liza-protocolo` lo mira en cinco mil).
 *
 * ═══ POR QUÉ HAY UN TOPE DE MUNDO, Y POR QUÉ LANZA ═══
 *
 * La exactitud de todo lo de arriba cuelga de que los productos quepan en 2^53. Con coordenadas de
 * hasta ±512 unidades (`TOPE_DE_LA_LIZA`, 2^25 en Q16.16) las diferencias no pasan de 2^26 y los
 * productos cruzados de la losa de 2^52,1. Un mundo de liza de una plaza mide unas 160 unidades de lado,
 * y el de una ciudad 544: caben. Fuera de ahí estas funciones LANZAN `FueraDeLaLiza`, como `por()` lanza
 * `FueraDeRango`: un resultado equivocado e igual en todos los motores es el fallo que `fijo.ts`
 * existe para no repetir, y un número que no cabe no se arregla recortándolo —recortar un vector por
 * ejes le cambia el rumbo—. La sala no llega aquí con nada de fuera: los lectores del protocolo ya
 * rechazan cualquier sitio más allá del tope.
 *
 * ═══ QUÉ NO ESTÁ AQUÍ ═══
 *
 * Ni cuánto alcanza un golpe ni cuánto se empuja: eso es de la declaración de cada liza. Ni la
 * elección del blanco con «mejor nota»: eso es del aparato. Aquí sólo están las preguntas de
 * geometría, con una respuesta que no depende de quién pregunte. Ni de cuánto cueste: con muchas
 * cajas, `primeraLosa` pregunta a un índice por celdas que da la MISMA respuesta (ver «los índices de
 * la Liza», abajo, y `verify:liza`, que lo compara con la fuerza bruta).
 */
import { COSENO, RUMBOS, SENO } from '../andar';
import { por, UNO } from '../fijo';

/* ─── LOS TOPES ──────────────────────────────────────────────────────────── */

/**
 * La mayor coordenada, en valor absoluto, que admite la liza: 512 unidades del mundo en Q16.16
 * (2^25). Ver la cabecera: de este número cuelga que las cuentas de aquí sean exactas.
 */
export const TOPE_DE_LA_LIZA = 33554432;

/** La mayor diferencia entre dos coordenadas de la liza: dos topes (2^26). */
export const TOPE_DE_DIFERENCIA = 67108864;

/**
 * El mayor radio (o ensanche de caja) que admiten estas preguntas: 64 unidades en Q16.16 (2^22).
 * Ningún cuerpo ni ningún golpe mide eso; el tope existe para que la losa siga siendo exacta.
 */
export const TOPE_DE_RADIO = 4194304;

/** Media vuelta y un cuarto de vuelta, en rumbos. */
export const MEDIA_VUELTA = 128;
export const CUARTO_DE_VUELTA = 64;

/** Lo que se lanza cuando algo se sale de lo que estas cuentas saben hacer sin mentir. */
export class FueraDeLaLiza extends Error {
  constructor(que: string, valor: number) {
    super(
      `${que} vale ${String(valor)}, fuera de lo que la geometría de la liza calcula exacto ` +
        '(ver TOPE_DE_LA_LIZA en shared/mecanicas/liza/geometria.ts). Un resultado equivocado e igual ' +
        'en todos los motores es peor que un error.',
    );
    this.name = 'FueraDeLaLiza';
  }
}

function exigirEntero(que: string, v: number, tope: number): void {
  if (!Number.isInteger(v) || v > tope || v < -tope) throw new FueraDeLaLiza(que, v);
}

function exigirRadio(que: string, r: number, tope: number): void {
  if (!Number.isInteger(r) || r < 0 || r > tope) throw new FueraDeLaLiza(que, r);
}

function exigirRumbo(que: string, r: number): void {
  if (!Number.isInteger(r) || r < 0 || r >= RUMBOS) throw new FueraDeLaLiza(que, r);
}

/** El seno y el coseno de un rumbo que ya se sabe válido (0-255). */
function senoDe(r: number): number {
  return SENO[r] as number;
}
function cosenoDe(r: number): number {
  return COSENO[r] as number;
}

/* ─── RUMBOS ─────────────────────────────────────────────────────────────── */

/**
 * El producto cruzado del vector del rumbo `r` con `(dx, dz)`. Positivo si `(dx, dz)` está DESPUÉS
 * de `r` (girando hacia el este desde el norte), negativo si está antes, cero si están alineados.
 *
 * El vector del rumbo es `(SENO[r], −COSENO[r])`, el convenio de `andar.ts`; su cruz con `(dx, dz)`
 * es `SENO·dz + COSENO·dx`. Exacto: ver la cabecera.
 */
function cruz(r: number, dx: number, dz: number): number {
  return senoDe(r) * dz + cosenoDe(r) * dx;
}

/**
 * EL RUMBO HACIA `(dx, dz)`: el de la tabla que apunta más hacia allí. `dx` y `dz` son la diferencia
 * de posiciones en Q16.16 (hasta `TOPE_DE_DIFERENCIA`), con el convenio de siempre: el rumbo 0 es el
 * norte —la `z` negativa— y crece hacia el este.
 *
 * Sin dirección —`dx` y `dz` a cero— devuelve 0, el norte, que es un rumbo como otro cualquiera: quien
 * necesite otra cosa (seguir mirando hacia donde miraba) lo comprueba ANTES de llamar.
 */
export function rumboHacia(dx: number, dz: number): number {
  exigirEntero('dx', dx, TOPE_DE_DIFERENCIA);
  exigirEntero('dz', dz, TOPE_DE_DIFERENCIA);
  if (dx === 0) {
    if (dz === 0) return 0;
    return dz < 0 ? 0 : MEDIA_VUELTA;
  }
  /*
   * La media vuelta del este va del rumbo 0 (norte) al 128 (sur); la del oeste, del 128 al 256. En
   * los dos casos el primer extremo está ANTES de `(dx, dz)` (cruz > 0) y el segundo DESPUÉS (cruz < 0),
   * porque `dx ≠ 0` deja el punto estrictamente dentro de la media vuelta.
   */
  let antes = dx > 0 ? 0 : MEDIA_VUELTA;
  let despues = antes + MEDIA_VUELTA;
  while (despues - antes > 1) {
    const medio = Math.floor((antes + despues) / 2);
    if (cruz(medio % RUMBOS, dx, dz) >= 0) antes = medio;
    else despues = medio;
  }
  const a = antes % RUMBOS;
  const b = despues % RUMBOS;
  /*
   * Gana el más cercano, y se decide con la BISECTRIZ, no con el escalar. Los vectores de la tabla están
   * redondeados y no miden todos exactamente `UNO`: comparar escalares es comparar `|u|·cos`, y cerca
   * de la raya el coseno casi no cambia, así que una diferencia de largo de una parte en cien mil mueve
   * la raya hasta 0,05 rumbos —lo midió `verify:liza-protocolo`: 95 de 20.000 direcciones al otro lado—.
   * El cruce con la bisectriz `u_a + u_b` es `cruz(a) + cruz(b)`, y ahí el largo sólo pesa por el seno
   * de medio paso: la raya se queda en su sitio. Empate exacto: el de antes, siempre el mismo.
   */
  return cruz(a, dx, dz) + cruz(b, dx, dz) > 0 ? b : a;
}

/**
 * Cuánto hay que girar desde `desde` para mirar a `hasta`, en rumbos: de −128 a 127, positivo hacia
 * el este. Media vuelta exacta sale −128.
 */
export function giroEntre(desde: number, hasta: number): number {
  exigirRumbo('desde', desde);
  exigirRumbo('hasta', hasta);
  return ((((hasta - desde) % RUMBOS) + RUMBOS + MEDIA_VUELTA) % RUMBOS) - MEDIA_VUELTA;
}

/**
 * Un punto desplazado `distancia` hacia el rumbo `rumbo`. Todo en Q16.16. Es lo que usa la sala para
 * saber adónde lleva un avance, un empujón o una bala en un tic, y el aparato para pintarlo en el
 * mismo sitio.
 */
export function desplazado(x: number, z: number, rumbo: number, distancia: number): { x: number; z: number } {
  exigirEntero('x', x, TOPE_DE_LA_LIZA);
  exigirEntero('z', z, TOPE_DE_LA_LIZA);
  exigirRumbo('rumbo', rumbo);
  exigirEntero('distancia', distancia, TOPE_DE_DIFERENCIA);
  return { x: x + por(distancia, senoDe(rumbo)), z: z - por(distancia, cosenoDe(rumbo)) };
}

/* ─── DISTANCIAS ─────────────────────────────────────────────────────────── */

/**
 * ¿Está `(dx, dz)` a `radio` o menos? Borde incluido: «a 7,5 u o menos» es `<=`. Todo en Q16.16.
 *
 * Primero se descarta por ejes —cuatro comparaciones, y así los cuadrados no pasan de 2^52—, y luego
 * se comparan los cuadrados EXACTOS, sin `por()`: `por` trunca el producto y un borde truncado deja de
 * ser el mismo en las dos direcciones.
 */
export function dentroDelRadio(dx: number, dz: number, radio: number): boolean {
  exigirRadio('radio', radio, TOPE_DE_DIFERENCIA);
  exigirEntero('dx', dx, TOPE_DE_DIFERENCIA);
  exigirEntero('dz', dz, TOPE_DE_DIFERENCIA);
  if (dx > radio || dx < -radio || dz > radio || dz < -radio) return false;
  return dx * dx + dz * dz <= radio * radio;
}

/**
 * EL CUADRADO DE LA DISTANCIA, exacto y sin truncar, para ORDENAR («¿quién está más cerca?»).
 *
 * OJO A LA UNIDAD: es Q16.16 al cuadrado —unidades² × 2^32—, no Q16.16. Un número así no se pasa por
 * `por()` ni se compara con un radio: se compara con otro `distanciaAlCuadrado` o con
 * `cuadrado(radio)`. Cabe exacto en 2^53 porque cada diferencia está acotada por `TOPE_DE_DIFERENCIA`.
 */
export function distanciaAlCuadrado(dx: number, dz: number): number {
  exigirEntero('dx', dx, TOPE_DE_DIFERENCIA);
  exigirEntero('dz', dz, TOPE_DE_DIFERENCIA);
  return dx * dx + dz * dz;
}

/** El cuadrado de una longitud Q16.16, en la unidad de `distanciaAlCuadrado`. */
export function cuadrado(longitud: number): number {
  exigirRadio('longitud', longitud, TOPE_DE_DIFERENCIA);
  return longitud * longitud;
}

/* ─── EL CONO ────────────────────────────────────────────────────────────── */

/**
 * ¿ESTÁ `(dx, dz)` DENTRO DEL CONO que mira hacia `mira` con medio ancho `medioAncho` rumbos?
 *
 * `medioAncho` va de 0 (sólo la semirrecta de la mira) a 64 (la media vuelta de delante): 43 rumbos son 60,5°. El
 * borde cuenta como dentro, y un `(dx, dz)` nulo —el otro está justo encima— está dentro de todo cono.
 *
 * ═══ SIN RAÍCES NI CUADRADOS DE CUADRADOS ═══
 *
 * Se gira `(dx, dz)` al marco de la mirada con la tabla: `delante` es cuánto avanza en la dirección de
 * `mira` y `alLado` cuánto se aparta. Está dentro si va hacia delante y `alLado/delante ≤ tan(medio)`,
 * que se escribe `alLado·cos(medio) ≤ delante·sen(medio)` con el seno y el coseno de la MISMA tabla.
 * Todos los productos van por `por()`, y no desbordan porque cada factor está acotado: `delante` y
 * `alLado` no pasan de 2^27 y la tabla de 2^16.
 */
export function dentroDelCono(mira: number, dx: number, dz: number, medioAncho: number): boolean {
  exigirRumbo('mira', mira);
  exigirEntero('dx', dx, TOPE_DE_DIFERENCIA);
  exigirEntero('dz', dz, TOPE_DE_DIFERENCIA);
  if (!Number.isInteger(medioAncho) || medioAncho < 0 || medioAncho > CUARTO_DE_VUELTA) {
    throw new FueraDeLaLiza('medioAncho', medioAncho);
  }
  const delante = por(dx, senoDe(mira)) - por(dz, cosenoDe(mira));
  const alLado = Math.abs(por(dz, senoDe(mira)) + por(dx, cosenoDe(mira)));
  if (delante < 0) return false;
  return por(alLado, cosenoDe(medioAncho)) <= por(delante, senoDe(medioAncho));
}

/* ─── LA PRUEBA DE LOSA ──────────────────────────────────────────────────── */

/**
 * ¿EN QUÉ FRACCIÓN DEL TRAMO `A → B` SE ENTRA EN LA CAJA `[x0, x1] × [z0, z1]` ENSANCHADA `radio`?
 *
 * Devuelve la fracción en Q16.16 —de 0 a `UNO`, redondeada hacia ABAJO—, o `null` si el tramo no
 * entra nunca. Si `A` ya está dentro, 0. «Dentro» es estricto (ver la cabecera): rozar una cara o una
 * esquina no es entrar, igual que en `chocaConCuerpo`.
 *
 * Todo en Q16.16: coordenadas hasta `TOPE_DE_LA_LIZA`, `radio` hasta `TOPE_DE_RADIO`. Con `radio` 0 es
 * la línea de vista; con el radio de un cuerpo, su trayectoria (la del centro contra la caja ensanchada,
 * que para un cuerpo cuadrado es exactamente la misma pregunta).
 */
export function pruebaDeLosa(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  radio: number,
): number | null {
  exigirEntero('ax', ax, TOPE_DE_LA_LIZA);
  exigirEntero('az', az, TOPE_DE_LA_LIZA);
  exigirEntero('bx', bx, TOPE_DE_LA_LIZA);
  exigirEntero('bz', bz, TOPE_DE_LA_LIZA);
  exigirEntero('x0', x0, TOPE_DE_LA_LIZA);
  exigirEntero('z0', z0, TOPE_DE_LA_LIZA);
  exigirEntero('x1', x1, TOPE_DE_LA_LIZA);
  exigirEntero('z1', z1, TOPE_DE_LA_LIZA);
  exigirRadio('radio', radio, TOPE_DE_RADIO);
  return losa(ax, az, bx, bz, x0 - radio, z0 - radio, x1 + radio, z1 + radio);
}

/**
 * El corazón de la prueba, sin comprobaciones: la caja ya viene ensanchada. Ver `pruebaDeLosa`.
 *
 * La entrada empieza en 0/1 (el propio `A`) y la salida en 1/1 (el propio `B`); cada eje las estrecha.
 * Hay choque si queda un trozo ABIERTO: entrada < salida, comparadas en cruz.
 */
function losa(ax: number, az: number, bx: number, bz: number, ex0: number, ez0: number, ex1: number, ez1: number): number | null {
  /* Una caja sin interior no se puede tener dentro: ni se entra ni tapa nada. */
  if (ex0 >= ex1 || ez0 >= ez1) return null;
  let entraN = 0;
  let entraD = 1;
  let saleN = 1;
  let saleD = 1;

  const dx = bx - ax;
  if (dx === 0) {
    if (!(ax > ex0 && ax < ex1)) return null;
  } else {
    const d = Math.abs(dx);
    const cercaN = dx > 0 ? ex0 - ax : ax - ex1;
    const lejosN = dx > 0 ? ex1 - ax : ax - ex0;
    if (cercaN * entraD > entraN * d) {
      entraN = cercaN;
      entraD = d;
    }
    if (lejosN * saleD < saleN * d) {
      saleN = lejosN;
      saleD = d;
    }
  }

  const dz = bz - az;
  if (dz === 0) {
    if (!(az > ez0 && az < ez1)) return null;
  } else {
    const d = Math.abs(dz);
    const cercaN = dz > 0 ? ez0 - az : az - ez1;
    const lejosN = dz > 0 ? ez1 - az : az - ez0;
    if (cercaN * entraD > entraN * d) {
      entraN = cercaN;
      entraD = d;
    }
    if (lejosN * saleD < saleN * d) {
      saleN = lejosN;
      saleD = d;
    }
  }

  if (!(entraN * saleD < saleN * entraD)) return null;
  /*
   * A Q16.16, hacia abajo. `entraN ≤ entraD` porque la entrada no pasa de 1, así que el producto por
   * `UNO` no pasa de 2^42; y la división, con los dos positivos, se trunca hacia abajo.
   */
  return Math.floor((entraN * UNO) / entraD);
}

/** Lo que devuelve `primeraLosa`: qué caja se toca primero y en qué fracción del tramo. */
export interface ChoqueConLosa {
  /** El índice de la caja en la lista (el de `Arena.cuerpos` dividido por cuatro). */
  readonly caja: number;
  /** La fracción del tramo en que se entra, en Q16.16 (0 = ya estaba dentro). */
  readonly fraccion: number;
}

/**
 * LA PRIMERA CAJA QUE TOCA EL TRAMO `A → B` de un cuerpo de medio lado `radio`, entre las de `cuerpos`
 * —plana, `x0, z0, x1, z1` por caja, en Q16.16: la `Arena.cuerpos` de `mundo.ts` tal cual—.
 * `null` si no toca ninguna.
 *
 * Si dos cajas se tocan en la misma fracción gana la de índice menor, para que la respuesta no
 * dependa de nada más que de la lista. Un mundo de liza de una plaza tiene del orden de cien cajas y
 * se recorren todas: cada una se descarta en cuatro comparaciones si no cae en el rectángulo del tramo.
 * Desde `CAJAS_PARA_INDEXAR` (una ciudad, con sus mil trescientas) se pregunta a las celdas de abajo, y
 * la respuesta es LA MISMA, empates incluidos (ver «el índice de losas»).
 */
export function primeraLosa(
  cuerpos: ArrayLike<number>,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  radio: number,
): ChoqueConLosa | null {
  exigirEntero('ax', ax, TOPE_DE_LA_LIZA);
  exigirEntero('az', az, TOPE_DE_LA_LIZA);
  exigirEntero('bx', bx, TOPE_DE_LA_LIZA);
  exigirEntero('bz', bz, TOPE_DE_LA_LIZA);
  exigirRadio('radio', radio, TOPE_DE_RADIO);
  if (cuerpos.length % 4 !== 0) throw new FueraDeLaLiza('cuerpos.length', cuerpos.length);
  const minX = ax < bx ? ax : bx;
  const maxX = ax < bx ? bx : ax;
  const minZ = az < bz ? az : bz;
  const maxZ = az < bz ? bz : az;
  if (INDICES.activos && cuerpos.length >= 4 * CAJAS_PARA_INDEXAR) {
    const ix = indiceDeLosas(cuerpos);
    if (ix !== null) {
      CUENTAS_DE_LOS_INDICES.losasPorCeldas++;
      return primeraLosaPorCeldas(ix, cuerpos, ax, az, bx, bz, radio, minX, maxX, minZ, maxZ);
    }
  }
  let mejor: ChoqueConLosa | null = null;
  for (let i = 0; i < cuerpos.length; i += 4) {
    const x0 = (cuerpos[i] as number) - radio;
    const z0 = (cuerpos[i + 1] as number) - radio;
    const x1 = (cuerpos[i + 2] as number) + radio;
    const z1 = (cuerpos[i + 3] as number) + radio;
    /*
     * Una caja que empieza donde el tramo acaba (o más allá) no tiene interior que el tramo pise:
     * cuatro comparaciones y a la siguiente. Vale también para el tramo paralelo a un eje o nulo,
     * porque «dentro» es estricto: con el tramo en `x = c`, una caja con `x0 >= c` no lo contiene.
     */
    if (x0 >= maxX || x1 <= minX || z0 >= maxZ || z1 <= minZ) continue;
    exigirEntero('caja', cuerpos[i] as number, TOPE_DE_LA_LIZA);
    exigirEntero('caja', cuerpos[i + 1] as number, TOPE_DE_LA_LIZA);
    exigirEntero('caja', cuerpos[i + 2] as number, TOPE_DE_LA_LIZA);
    exigirEntero('caja', cuerpos[i + 3] as number, TOPE_DE_LA_LIZA);
    const f = losa(ax, az, bx, bz, x0, z0, x1, z1);
    if (f === null) continue;
    if (mejor === null || f < mejor.fraccion) mejor = { caja: i / 4, fraccion: f };
  }
  return mejor;
}

/* ─── LOS ÍNDICES DE LA LIZA: EL INTERRUPTOR Y LAS CUENTAS ───────────────── *
 *
 * La Liza de una ciudad (el diseño de la ciudad abierta, §5.4) pregunta lo mismo que la de una plaza
 * con diez veces más cajas y nudos, y recorrerlos todos en cada pregunta costaba más que la sala entera.
 * Así que hay tres índices: el de losas (aquí), y en `cerebro.ts` el de nudos y los campos por meta.
 * Ninguno cambia una respuesta —ése es su contrato, y `verify:liza` lo mide contra la fuerza bruta—,
 * así que la sala no los ve: sólo cuestan menos.
 *
 * `usarLosIndicesDeLaLiza(false)` los apaga y todo va por el recorrido de siempre. Es para los
 * comprobadores, que juegan la MISMA sala con y sin ellos y comparan tic a tic; ningún código de juego
 * lo llama. Y las cuentas dicen cuántas preguntas fueron por cada índice: sin ellas, un índice que
 * dejara de usarse daría las mismas respuestas que la fuerza bruta porque SERÍA la fuerza bruta, y esa
 * comparación saldría en verde sin mirar nada.
 */

/** Si los índices están encendidos. Ver la cabecera del bloque. */
const INDICES = { activos: true };

/** Enciende o apaga los índices de la Liza (sólo para los comprobadores). Devuelve cómo estaban. */
export function usarLosIndicesDeLaLiza(si: boolean): boolean {
  const antes = INDICES.activos;
  INDICES.activos = si;
  return antes;
}

/** ¿Están encendidos los índices de la Liza? Lo pregunta `cerebro.ts`. */
export function losIndicesDeLaLizaEstanActivos(): boolean {
  return INDICES.activos;
}

/** Cuántas preguntas ha contestado cada índice desde que se cargó el módulo. */
export interface CuentasDeLosIndices {
  /** `primeraLosa` contestada por celdas. */
  losasPorCeldas: number;
  /** Índices de losas construidos. */
  indicesDeLosas: number;
  /** Los K nudos más cercanos buscados por celdas. */
  nudosPorCeldas: number;
  /** Índices de nudos construidos. */
  indicesDeNudos: number;
  /** Campos de distancias hechos acotados, y los que se sacaron ya hechos de la memoria. */
  camposAcotados: number;
  camposReusados: number;
  /** Campos que alguien leyó fuera de su cota y se completaron: siguiendo su montículo, o rehechos enteros. */
  camposSeguidos: number;
  camposRehechos: number;
}

/** Las cuentas, que escriben este módulo y `cerebro.ts`. Se leen con `cuentasDeLosIndices`. */
export const CUENTAS_DE_LOS_INDICES: CuentasDeLosIndices = {
  losasPorCeldas: 0,
  indicesDeLosas: 0,
  nudosPorCeldas: 0,
  indicesDeNudos: 0,
  camposAcotados: 0,
  camposReusados: 0,
  camposSeguidos: 0,
  camposRehechos: 0,
};

/** Una copia de las cuentas, para restar un antes y un después. */
export function cuentasDeLosIndices(): CuentasDeLosIndices {
  return { ...CUENTAS_DE_LOS_INDICES };
}

/* ─── EL ÍNDICE DE LOSAS, EN CELDAS DE 16 UNIDADES ───────────────────────── *
 *
 * A partir de `CAJAS_PARA_INDEXAR`, las cajas se apuntan en celdas de 16 unidades —cada caja en TODAS
 * las que toca— y una pregunta sólo mira las de las celdas que pisa el rectángulo del tramo ensanchado
 * por el radio. No se usan los cajones de `mundo.ts`: su lado es privado de aquel fichero, y la cabecera
 * de `primeraLosa` ya dice por qué no se ata a él.
 *
 * ═══ EL MISMO RESULTADO, POR CONSTRUCCIÓN ═══
 *
 * Una caja que pasa el descarte del recorrido lineal tiene su intervalo `[x0, x1]` cortando a
 * `[minX − radio, maxX + radio]`, y lo mismo en `z`: un punto de ese corte cae en una celda que está en
 * la lista de la caja y en el rectángulo de la pregunta, así que es candidata. A las candidatas se les
 * pasa LA MISMA prueba (el mismo descarte y la misma `losa`), y como no se visitan en orden de índice, el
 * desempate se hace explícito: a igual fracción, el índice menor, que es el que se quedaba el recorrido
 * lineal. Una caja que toca varias celdas se mira una vez por pregunta (un sello por caja, sin ordenar).
 *
 * ═══ CUÁNDO NO SE INDEXA ═══
 *
 * Si alguna caja no es de enteros dentro de la liza, la lista se queda en el recorrido de siempre: allí
 * `exigirEntero` lanza con la PRIMERA caja mala que el tramo alcanza, en orden de índice, y un índice la
 * encontraría en otro orden y con otro mensaje. Una arena de un mundo validado nunca lo tiene; así además
 * las celdas no pasan de 64 por lado.
 *
 * ═══ EL CONTRATO QUE PIDE ═══
 *
 * El índice se monta la primera vez que se pregunta por una lista y se recuerda por su IDENTIDAD (un
 * `WeakMap`, como los índices de `paso-en-curso.ts`): la `Arena.cuerpos` de una sala no cambia mientras
 * dura su mundo. Una lista por la que ya se ha preguntado no se muta; ninguna de la casa lo hace.
 */

/** Desde cuántas cajas se indexa: el barrio de una plaza (≈ 250) sigue con el recorrido de siempre. */
export const CAJAS_PARA_INDEXAR = 512;

/** El lado de una celda del índice: 16 unidades en Q16.16 (2^20). Potencia de dos: la división es exacta. */
export const CELDA_DEL_INDICE = 16 * UNO;

interface IndiceDeLosas {
  readonly desdeX: number;
  readonly desdeZ: number;
  readonly ancho: number;
  readonly fondo: number;
  /** Las cajas de la celda `k` son `cajas[inicio[k]] … cajas[inicio[k + 1] − 1]`, de menor a mayor. */
  readonly inicio: Int32Array;
  readonly cajas: Int32Array;
  /** En qué vuelta se miró cada caja por última vez: para no mirarla dos veces en la misma pregunta. */
  readonly sello: Int32Array;
  vuelta: number;
}

/** Los índices hechos, por la identidad de la lista; `null`: esa lista no se indexa (ver la cabecera). */
const INDICES_DE_LOSAS = new WeakMap<object, IndiceDeLosas | null>();

/** En qué celda del índice cae una coordenada Q16.16. */
export function celdaDelIndice(v: number): number {
  return Math.floor(v / CELDA_DEL_INDICE);
}

function indiceDeLosas(cuerpos: ArrayLike<number>): IndiceDeLosas | null {
  if (typeof cuerpos !== 'object' || cuerpos === null) return null;
  const hecho = INDICES_DE_LOSAS.get(cuerpos);
  if (hecho !== undefined) return hecho;
  const n = cuerpos.length / 4;
  for (let i = 0; i < cuerpos.length; i++) {
    const v = cuerpos[i] as number;
    if (!Number.isInteger(v) || v > TOPE_DE_LA_LIZA || v < -TOPE_DE_LA_LIZA) {
      INDICES_DE_LOSAS.set(cuerpos, null);
      return null;
    }
  }
  let desdeX = 0;
  let desdeZ = 0;
  let hastaX = -1;
  let hastaZ = -1;
  for (let i = 0; i < n; i++) {
    const a = celdaDelIndice(cuerpos[i * 4] as number);
    const b = celdaDelIndice(cuerpos[i * 4 + 1] as number);
    const c = celdaDelIndice(cuerpos[i * 4 + 2] as number);
    const d = celdaDelIndice(cuerpos[i * 4 + 3] as number);
    if (i === 0 || a < desdeX) desdeX = a;
    if (i === 0 || b < desdeZ) desdeZ = b;
    if (i === 0 || c > hastaX) hastaX = c;
    if (i === 0 || d > hastaZ) hastaZ = d;
  }
  const ancho = hastaX - desdeX + 1;
  const fondo = hastaZ - desdeZ + 1;
  const celdas = ancho * fondo;
  const inicio = new Int32Array(celdas + 1);
  for (let i = 0; i < n; i++) {
    const a = celdaDelIndice(cuerpos[i * 4] as number) - desdeX;
    const b = celdaDelIndice(cuerpos[i * 4 + 1] as number) - desdeZ;
    const c = celdaDelIndice(cuerpos[i * 4 + 2] as number) - desdeX;
    const d = celdaDelIndice(cuerpos[i * 4 + 3] as number) - desdeZ;
    for (let z = b; z <= d; z++) for (let x = a; x <= c; x++) inicio[z * ancho + x + 1] = (inicio[z * ancho + x + 1] as number) + 1;
  }
  for (let k = 0; k < celdas; k++) inicio[k + 1] = (inicio[k + 1] as number) + (inicio[k] as number);
  const puesto = inicio.slice(0, celdas);
  const cajas = new Int32Array(inicio[celdas] as number);
  for (let i = 0; i < n; i++) {
    const a = celdaDelIndice(cuerpos[i * 4] as number) - desdeX;
    const b = celdaDelIndice(cuerpos[i * 4 + 1] as number) - desdeZ;
    const c = celdaDelIndice(cuerpos[i * 4 + 2] as number) - desdeX;
    const d = celdaDelIndice(cuerpos[i * 4 + 3] as number) - desdeZ;
    for (let z = b; z <= d; z++) {
      for (let x = a; x <= c; x++) {
        const k = z * ancho + x;
        cajas[puesto[k] as number] = i;
        puesto[k] = (puesto[k] as number) + 1;
      }
    }
  }
  const indice: IndiceDeLosas = { desdeX, desdeZ, ancho, fondo, inicio, cajas, sello: new Int32Array(n), vuelta: 0 };
  INDICES_DE_LOSAS.set(cuerpos, indice);
  CUENTAS_DE_LOS_INDICES.indicesDeLosas++;
  return indice;
}

/** `primeraLosa` por las celdas del índice: la misma respuesta (ver «el índice de losas»). */
function primeraLosaPorCeldas(
  ix: IndiceDeLosas,
  cuerpos: ArrayLike<number>,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  radio: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): ChoqueConLosa | null {
  if (ix.vuelta >= 2147483647) {
    ix.sello.fill(0);
    ix.vuelta = 0;
  }
  ix.vuelta++;
  const vuelta = ix.vuelta;
  let cx0 = celdaDelIndice(minX - radio) - ix.desdeX;
  let cx1 = celdaDelIndice(maxX + radio) - ix.desdeX;
  let cz0 = celdaDelIndice(minZ - radio) - ix.desdeZ;
  let cz1 = celdaDelIndice(maxZ + radio) - ix.desdeZ;
  if (cx0 < 0) cx0 = 0;
  if (cz0 < 0) cz0 = 0;
  if (cx1 >= ix.ancho) cx1 = ix.ancho - 1;
  if (cz1 >= ix.fondo) cz1 = ix.fondo - 1;
  let mejorCaja = -1;
  let mejorFraccion = 0;
  for (let z = cz0; z <= cz1; z++) {
    for (let x = cx0; x <= cx1; x++) {
      const k = z * ix.ancho + x;
      const hasta = ix.inicio[k + 1] as number;
      for (let j = ix.inicio[k] as number; j < hasta; j++) {
        const c = ix.cajas[j] as number;
        if (ix.sello[c] === vuelta) continue;
        ix.sello[c] = vuelta;
        const i = c * 4;
        const x0 = (cuerpos[i] as number) - radio;
        const z0 = (cuerpos[i + 1] as number) - radio;
        const x1 = (cuerpos[i + 2] as number) + radio;
        const z1 = (cuerpos[i + 3] as number) + radio;
        if (x0 >= maxX || x1 <= minX || z0 >= maxZ || z1 <= minZ) continue;
        const f = losa(ax, az, bx, bz, x0, z0, x1, z1);
        if (f === null) continue;
        if (mejorCaja < 0 || f < mejorFraccion || (f === mejorFraccion && c < mejorCaja)) {
          mejorCaja = c;
          mejorFraccion = f;
        }
      }
    }
  }
  return mejorCaja < 0 ? null : { caja: mejorCaja, fraccion: mejorFraccion };
}

/**
 * ¿SE VE `B` DESDE `A`? Ninguna caja de `cuerpos` tapa el tramo. Rozar una esquina no tapa. Todo en
 * Q16.16; `cuerpos` como en `primeraLosa`.
 */
export function hayLineaDeVista(cuerpos: ArrayLike<number>, ax: number, az: number, bx: number, bz: number): boolean {
  return primeraLosa(cuerpos, ax, az, bx, bz, 0) === null;
}

/**
 * EL PUNTO DEL TRAMO `A → B` EN LA FRACCIÓN `fraccion` (Q16.16, de 0 a `UNO`). Cada eje se trunca
 * hacia `A`, así que con la fracción de `primeraLosa` el punto queda a este lado de la entrada.
 */
export function puntoDelTramo(ax: number, az: number, bx: number, bz: number, fraccion: number): { x: number; z: number } {
  exigirEntero('ax', ax, TOPE_DE_LA_LIZA);
  exigirEntero('az', az, TOPE_DE_LA_LIZA);
  exigirEntero('bx', bx, TOPE_DE_LA_LIZA);
  exigirEntero('bz', bz, TOPE_DE_LA_LIZA);
  if (!Number.isInteger(fraccion) || fraccion < 0 || fraccion > UNO) throw new FueraDeLaLiza('fraccion', fraccion);
  return { x: ax + ((((bx - ax) * fraccion) / UNO) | 0), z: az + ((((bz - az) * fraccion) / UNO) | 0) };
}

/** Adónde llega un cuerpo que se mueve en línea recta, y contra qué se para. */
export interface Trayectoria {
  /** Dónde acaba, en Q16.16. */
  readonly x: number;
  readonly z: number;
  /** Qué fracción del movimiento pedido llegó a hacer, en Q16.16 (`UNO` = entera). */
  readonly fraccion: number;
  /** Contra qué caja se paró (índice en `cuerpos`), o `null` si llegó entero. */
  readonly caja: number | null;
}

/**
 * LA TRAYECTORIA DE UN EMPUJÓN, UN AVANCE O UNA BALA: un cuerpo de medio lado `radio` sale de
 * `(x, z)` y quiere moverse `(dx, dz)`; se para antes de la primera caja de `cuerpos` que tocaría. Es
 * la pregunta del CHOQUE: si `caja` no es `null`, el cuerpo chocó contra la estructura.
 *
 * Si el cuerpo ya estaba metido en una caja no se mueve (fracción 0): sacarlo de ahí no es cosa de
 * esta función. El punto de llegada es un punto de este lado de la caja (ver `puntoDelTramo`); quien
 * además quiera que esté sobre suelo pisable, lo pregunta con `sePuedeEstar` de `mundo.ts`. El destino
 * pedido tiene que caer dentro de la liza (si no, lanza `FueraDeLaLiza`): quien empuja lo recorta antes
 * por el límite de la fase, que es suyo.
 */
export function trayectoria(
  cuerpos: ArrayLike<number>,
  x: number,
  z: number,
  dx: number,
  dz: number,
  radio: number,
): Trayectoria {
  exigirEntero('dx', dx, TOPE_DE_DIFERENCIA);
  exigirEntero('dz', dz, TOPE_DE_DIFERENCIA);
  const hastaX = x + dx;
  const hastaZ = z + dz;
  const choque = primeraLosa(cuerpos, x, z, hastaX, hastaZ, radio);
  if (choque === null) return { x: hastaX, z: hastaZ, fraccion: UNO, caja: null };
  const p = puntoDelTramo(x, z, hastaX, hastaZ, choque.fraccion);
  return { x: p.x, z: p.z, fraccion: choque.fraccion, caja: choque.caja };
}

/**
 * ¿TOCA EL TRAMO `A → B` AL CUERPO DE CENTRO `(cx, cz)`? Los dos radios sumados en `radio` (el de la
 * bala más el del cuerpo). Es la prueba de losa contra el cuadrado del cuerpo —cuadrado y no círculo,
 * como en `mundo.ts`—, así que el tramo que roza el borde no toca. Todo en Q16.16.
 */
export function tramoTocaCuerpo(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
  radio: number,
): boolean {
  return pruebaDeLosa(ax, az, bx, bz, cx, cz, cx, cz, radio) !== null;
}
