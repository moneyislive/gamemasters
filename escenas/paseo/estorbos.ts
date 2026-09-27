/**
 * LO QUE ESTORBA A LA VISTA: el adorno que la cámara de a pie no debe tener delante.
 *
 * ═══ POR QUÉ HACE FALTA, SI LA CÁMARA DE HOMBRO YA NO SE METÍA EN LAS PAREDES ═══
 *
 * La cámara de hombro se acerca ante lo que tiene detrás (`hastaDondeCabeElHombro`, en
 * `camaras.ts`), y lo que mira para eso es la ARENA: la estructura del mundo, lo mismo con lo que
 * se choca y lo que valida el servidor (BOOTS-ON-BOARD §7.3 A). El ADORNO no está ahí —vive en
 * `escenas/`, depende de la calidad y un paseante lo atraviesa—, así que la cámara tampoco lo veía.
 * Jugando al Burgo el 27-sep-2026, andando por una calle, la cámara se quedó detrás de una señal
 * de tráfico —un panel verde del mobiliario— que tapaba media pantalla, y luego detrás de un
 * semáforo: para la arena allí no había nada.
 *
 * Esto es el adorno contado para la VISTA, que es lo único para lo que cuenta: cajas en tres
 * dimensiones —con su altura, al contrario que los cuerpos de la arena—, que cada juego DECLARA
 * desde lo que ya pinta y que el paseo CONSUME, como consume su mundo. Ni choca ni viaja: no
 * cambia por dónde se anda ni lo que ve el servidor, sólo dónde se pone la cámara.
 *
 * Lo que CHOCA sale de estas mismas rodajas, cortadas más finas y quedándose con la franja del cuerpo
 * de quien anda: `adorno-que-choca.ts`.
 *
 * ═══ POR QUÉ CAJAS CON ALTURA, Y POR QUÉ A RODAJAS ═══
 *
 * Con la altura, porque es lo que distingue lo que tapa de lo que no: un banco se queda por
 * debajo de la línea que va de la cámara a la cabeza y no estorba; el brazo de un semáforo pasa
 * por encima de quien anda por debajo y tampoco. Una sola caja por pieza lo estropearía justo ahí:
 * la caja de un semáforo de brazo abarca el poste, el brazo Y todo el aire de debajo del brazo, y
 * la cámara se echaría encima de la nuca cada vez que se pasa por debajo de uno. Así que una pieza
 * se corta en RODAJAS horizontales (`rodajasDeUnaMalla`) y cada rodaja lleva la caja de lo suyo:
 * el poste son rodajas finas, el brazo una ancha arriba. Las rodajas iguales seguidas se funden.
 *
 * ═══ Y SE INDEXAN, COMO LOS CUERPOS DE LA ARENA ═══
 *
 * Una ciudad del Burgo pone del orden de cuatro mil piezas de adorno, y cada fotograma se
 * pregunta por una veintena de tramos cortos (ver `camaras.ts`). Cada caja se apunta en los
 * cajones de `LADO_DEL_CAJON` que pisa, y un tramo sólo mira los suyos.
 *
 * Esto es presentación y va en coma flotante: nada de aquí decide dónde se está.
 */

/** Una caja alineada con los ejes, con altura, en unidades del mundo. `x0 < x1`, `y0 < y1`, `z0 < z1`. */
export interface Estorbo {
  readonly x0: number;
  readonly y0: number;
  readonly z0: number;
  readonly x1: number;
  readonly y1: number;
  readonly z1: number;
}

/** Un punto del mundo, en unidades. */
export interface Punto3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Lo que un juego declara que estorba a la vista, ya indexado. Se hace con `indiceDeEstorbos`. */
export interface EstorbosDelPaseo {
  /** Las cajas, planas: `x0, y0, z0, x1, y1, z1` por caja. */
  readonly cajas: Float64Array;
  /** El rectángulo de cajones que envuelve las cajas, en índices de cajón. */
  readonly desdeI: number;
  readonly desdeJ: number;
  readonly ancho: number;
  readonly fondo: number;
  /** Por cajón, las cajas que lo tocan. */
  readonly cajones: readonly (readonly number[])[];
  /** Una marca por caja para no mirarla dos veces en un mismo tramo; se reusa entre preguntas. */
  readonly vistas: Uint32Array;
  /** La vuelta de la marca: va creciendo con cada pregunta. */
  vuelta: number;
}

/** El lado de un cajón del índice, en unidades del mundo: dos calles del Burgo, la décima parte de un tramo largo. */
export const LADO_DEL_CAJON = 8;

/** Ningún estorbo: un juego que no declara adorno. */
export const SIN_ESTORBOS: EstorbosDelPaseo = indiceDeEstorbos([]);

/** EL ÍNDICE de una lista de cajas. Las que no son cajas de verdad —vacías, con algún `NaN`— se tiran. */
export function indiceDeEstorbos(lista: readonly Estorbo[]): EstorbosDelPaseo {
  const buenas = lista.filter(
    (e) =>
      Number.isFinite(e.x0) &&
      Number.isFinite(e.y0) &&
      Number.isFinite(e.z0) &&
      Number.isFinite(e.x1) &&
      Number.isFinite(e.y1) &&
      Number.isFinite(e.z1) &&
      e.x1 > e.x0 &&
      e.y1 > e.y0 &&
      e.z1 > e.z0,
  );
  const cajas = new Float64Array(buenas.length * 6);
  let desdeI = 0;
  let desdeJ = 0;
  let hastaI = -1;
  let hastaJ = -1;
  buenas.forEach((e, k) => {
    cajas.set([e.x0, e.y0, e.z0, e.x1, e.y1, e.z1], k * 6);
    const i0 = Math.floor(e.x0 / LADO_DEL_CAJON);
    const j0 = Math.floor(e.z0 / LADO_DEL_CAJON);
    const i1 = Math.floor(e.x1 / LADO_DEL_CAJON);
    const j1 = Math.floor(e.z1 / LADO_DEL_CAJON);
    if (k === 0) {
      desdeI = i0;
      desdeJ = j0;
      hastaI = i1;
      hastaJ = j1;
      return;
    }
    desdeI = Math.min(desdeI, i0);
    desdeJ = Math.min(desdeJ, j0);
    hastaI = Math.max(hastaI, i1);
    hastaJ = Math.max(hastaJ, j1);
  });
  const ancho = hastaI >= desdeI ? hastaI - desdeI + 1 : 0;
  const fondo = hastaJ >= desdeJ ? hastaJ - desdeJ + 1 : 0;
  const cajones: number[][] = [];
  for (let k = 0; k < ancho * fondo; k++) cajones.push([]);
  buenas.forEach((e, k) => {
    for (let j = Math.floor(e.z0 / LADO_DEL_CAJON); j <= Math.floor(e.z1 / LADO_DEL_CAJON); j++) {
      for (let i = Math.floor(e.x0 / LADO_DEL_CAJON); i <= Math.floor(e.x1 / LADO_DEL_CAJON); i++) {
        (cajones[(j - desdeJ) * ancho + (i - desdeI)] as number[]).push(k);
      }
    }
  });
  return { cajas, desdeI, desdeJ, ancho, fondo, cajones, vistas: new Uint32Array(buenas.length), vuelta: 0 };
}

/** ¿Está el punto dentro de la caja `k`, bordes incluidos? */
function dentroDeLaCaja(c: Float64Array, k: number, p: Punto3): boolean {
  const i = k * 6;
  return (
    p.x >= (c[i] as number) &&
    p.x <= (c[i + 3] as number) &&
    p.y >= (c[i + 1] as number) &&
    p.y <= (c[i + 4] as number) &&
    p.z >= (c[i + 2] as number) &&
    p.z <= (c[i + 5] as number)
  );
}

/** ¿Cruza el tramo de `a` a `b` la caja `k`? El método de las losas, con el tramo entero, de 0 a 1. */
function cruzaLaCaja(c: Float64Array, k: number, a: Punto3, b: Punto3): boolean {
  const i = k * 6;
  let desde = 0;
  let hasta = 1;
  const ejes: readonly (readonly [number, number, number, number])[] = [
    [a.x, b.x - a.x, c[i] as number, c[i + 3] as number],
    [a.y, b.y - a.y, c[i + 1] as number, c[i + 4] as number],
    [a.z, b.z - a.z, c[i + 2] as number, c[i + 5] as number],
  ];
  for (const [o, d, lo, hi] of ejes) {
    if (d === 0) {
      if (o < lo || o > hi) return false;
      continue;
    }
    let t0 = (lo - o) / d;
    let t1 = (hi - o) / d;
    if (t0 > t1) {
      const t = t0;
      t0 = t1;
      t1 = t;
    }
    if (t0 > desde) desde = t0;
    if (t1 < hasta) hasta = t1;
    if (desde > hasta) return false;
  }
  return true;
}

/**
 * ¿TAPA ALGO LA LÍNEA QUE VA DE `desde` A `hasta`?
 *
 * `desde` es quien pasea —el punto de su cuerpo que la cámara tiene que ver— y `hasta` la cámara.
 * Una caja que ENVUELVE a `desde` no cuenta: quien anda por debajo de la copa de un árbol está
 * dentro de su rodaja, y esa copa no se mete entre él y la cámara, lo tiene encima. Sin esta
 * excepción la cámara se echaría a la nuca cada vez que se pasa bajo un árbol.
 */
export function tapaLaVista(estorbos: EstorbosDelPaseo, desde: Punto3, hasta: Punto3): boolean {
  if (estorbos.ancho === 0 || estorbos.fondo === 0) return false;
  let i0 = Math.floor(Math.min(desde.x, hasta.x) / LADO_DEL_CAJON) - estorbos.desdeI;
  let i1 = Math.floor(Math.max(desde.x, hasta.x) / LADO_DEL_CAJON) - estorbos.desdeI;
  let j0 = Math.floor(Math.min(desde.z, hasta.z) / LADO_DEL_CAJON) - estorbos.desdeJ;
  let j1 = Math.floor(Math.max(desde.z, hasta.z) / LADO_DEL_CAJON) - estorbos.desdeJ;
  if (i1 < 0 || j1 < 0 || i0 >= estorbos.ancho || j0 >= estorbos.fondo) return false;
  if (i0 < 0) i0 = 0;
  if (j0 < 0) j0 = 0;
  if (i1 >= estorbos.ancho) i1 = estorbos.ancho - 1;
  if (j1 >= estorbos.fondo) j1 = estorbos.fondo - 1;
  estorbos.vuelta = (estorbos.vuelta + 1) >>> 0;
  if (estorbos.vuelta === 0) {
    estorbos.vistas.fill(0);
    estorbos.vuelta = 1;
  }
  const marca = estorbos.vuelta;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const cajon = estorbos.cajones[j * estorbos.ancho + i];
      if (cajon === undefined) continue;
      for (const k of cajon) {
        if (estorbos.vistas[k] === marca) continue;
        estorbos.vistas[k] = marca;
        if (dentroDeLaCaja(estorbos.cajas, k, desde)) continue;
        if (cruzaLaCaja(estorbos.cajas, k, desde, hasta)) return true;
      }
    }
  }
  return false;
}

/* ─── De una malla a sus rodajas ─────────────────────────────────────────── */

/** Lo alta que es una rodaja, en unidades del mundo: un tercio de persona. */
export const ALTO_DE_UNA_RODAJA = 0.75;

/** Cuántas rodajas como mucho por pieza: una torre de agua no necesita más. */
export const TOPE_DE_RODAJAS = 24;

/** Lo que dos rodajas seguidas pueden diferir en planta para fundirse en una. */
const HOLGURA_AL_FUNDIR = 0.05;

/**
 * LAS RODAJAS DE UNA MALLA, en sus propios ejes: cajas apiladas que envuelven, cada una, lo que la
 * malla tiene a esa altura.
 *
 * `posiciones` son `x, y, z` por vértice y `indices` los triángulos (o `null` si van seguidos),
 * como los da un `BufferGeometry`, sin que esto sepa de `three`. Cada triángulo se apunta en TODAS
 * las rodajas que cruza con la planta de todo él: un poste de cinco unidades tiene vértices sólo
 * abajo y arriba, y mirando vértices las rodajas de en medio saldrían vacías.
 */
export function rodajasDeUnaMalla(
  posiciones: ArrayLike<number>,
  indices: ArrayLike<number> | null,
  alto: number = ALTO_DE_UNA_RODAJA,
  tope: number = TOPE_DE_RODAJAS,
): Estorbo[] {
  const vertices = Math.floor(posiciones.length / 3);
  if (vertices === 0) return [];
  let ymin = Infinity;
  let ymax = -Infinity;
  for (let v = 0; v < vertices; v++) {
    const y = posiciones[v * 3 + 1] as number;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  if (!Number.isFinite(ymin) || !Number.isFinite(ymax)) return [];
  const n = Math.max(1, Math.min(tope, Math.ceil((ymax - ymin) / alto)));
  const paso = ymax > ymin ? (ymax - ymin) / n : 1;
  const x0 = new Array<number>(n).fill(Infinity);
  const z0 = new Array<number>(n).fill(Infinity);
  const x1 = new Array<number>(n).fill(-Infinity);
  const z1 = new Array<number>(n).fill(-Infinity);
  const triangulos = indices === null ? Math.floor(vertices / 3) : Math.floor(indices.length / 3);
  for (let t = 0; t < triangulos; t++) {
    let tx0 = Infinity;
    let tz0 = Infinity;
    let tx1 = -Infinity;
    let tz1 = -Infinity;
    let ty0 = Infinity;
    let ty1 = -Infinity;
    for (let q = 0; q < 3; q++) {
      const v = indices === null ? t * 3 + q : (indices[t * 3 + q] as number);
      const x = posiciones[v * 3] as number;
      const y = posiciones[v * 3 + 1] as number;
      const z = posiciones[v * 3 + 2] as number;
      if (x < tx0) tx0 = x;
      if (x > tx1) tx1 = x;
      if (y < ty0) ty0 = y;
      if (y > ty1) ty1 = y;
      if (z < tz0) tz0 = z;
      if (z > tz1) tz1 = z;
    }
    const r0 = Math.max(0, Math.min(n - 1, Math.floor((ty0 - ymin) / paso)));
    const r1 = Math.max(0, Math.min(n - 1, Math.floor((ty1 - ymin) / paso)));
    for (let r = r0; r <= r1; r++) {
      if (tx0 < (x0[r] as number)) x0[r] = tx0;
      if (tz0 < (z0[r] as number)) z0[r] = tz0;
      if (tx1 > (x1[r] as number)) x1[r] = tx1;
      if (tz1 > (z1[r] as number)) z1[r] = tz1;
    }
  }
  const salida: Estorbo[] = [];
  for (let r = 0; r < n; r++) {
    if (!((x1[r] as number) >= (x0[r] as number))) continue;
    const caja: Estorbo = {
      x0: x0[r] as number,
      y0: ymin + r * paso,
      z0: z0[r] as number,
      x1: Math.max(x1[r] as number, (x0[r] as number) + 1e-3),
      y1: r === n - 1 ? Math.max(ymax, ymin + (r + 1) * paso) : ymin + (r + 1) * paso,
      z1: Math.max(z1[r] as number, (z0[r] as number) + 1e-3),
    };
    const antes = salida[salida.length - 1];
    if (
      antes !== undefined &&
      Math.abs(antes.y1 - caja.y0) < 1e-9 &&
      Math.abs(antes.x0 - caja.x0) <= HOLGURA_AL_FUNDIR &&
      Math.abs(antes.x1 - caja.x1) <= HOLGURA_AL_FUNDIR &&
      Math.abs(antes.z0 - caja.z0) <= HOLGURA_AL_FUNDIR &&
      Math.abs(antes.z1 - caja.z1) <= HOLGURA_AL_FUNDIR
    ) {
      salida[salida.length - 1] = {
        x0: Math.min(antes.x0, caja.x0),
        y0: antes.y0,
        z0: Math.min(antes.z0, caja.z0),
        x1: Math.max(antes.x1, caja.x1),
        y1: caja.y1,
        z1: Math.max(antes.z1, caja.z1),
      };
      continue;
    }
    salida.push(caja);
  }
  return salida;
}

/** Una pieza puesta en el mundo, como la ponen las escenas: sitio, giro sobre la vertical y talla. */
export interface PiezaPuesta {
  readonly pieza: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** El `rotation.y` de three, en radianes. */
  readonly giro: number;
  readonly talla: number;
}

/**
 * LAS CAJAS DE UNA LISTA DE PIEZAS PUESTAS, con las rodajas de cada pieza en sus ejes
 * (`rodajasDe`, que devuelve `null` si no la conoce: esa pieza no estorba).
 *
 * Cada rodaja se gira como la gira `rotation.y` —`x' = u·cos + v·sen`, `z' = −u·sen + v·cos`, lo
 * mismo que `plantaDelBulto` del Burgo— y se toma la caja de sus cuatro esquinas giradas: en las
 * piezas giradas de cuarto en cuarto, que son casi todas, es exacta.
 */
export function estorbosDePiezas(puestas: readonly PiezaPuesta[], rodajasDe: (pieza: string) => readonly Estorbo[] | null): Estorbo[] {
  const salida: Estorbo[] = [];
  for (const p of puestas) {
    const rodajas = rodajasDe(p.pieza);
    if (rodajas === null) continue;
    const c = Math.cos(p.giro);
    const s = Math.sin(p.giro);
    const t = Number.isFinite(p.talla) && p.talla > 0 ? p.talla : 1;
    for (const r of rodajas) {
      let x0 = Infinity;
      let z0 = Infinity;
      let x1 = -Infinity;
      let z1 = -Infinity;
      for (const [u, v] of [
        [r.x0, r.z0],
        [r.x1, r.z0],
        [r.x0, r.z1],
        [r.x1, r.z1],
      ] as const) {
        const x = p.x + (u * c + v * s) * t;
        const z = p.z + (-u * s + v * c) * t;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (z < z0) z0 = z;
        if (z > z1) z1 = z;
      }
      salida.push({ x0, y0: p.y + r.y0 * t, z0, x1, y1: p.y + r.y1 * t, z1 });
    }
  }
  return salida;
}
