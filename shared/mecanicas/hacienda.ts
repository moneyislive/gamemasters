/**
 * LA HACIENDA: mover dinero entre saldos, en enteros, sin que se pierda un maravedí.
 *
 * ═══ POR QUÉ ESTO SUBE A `mecanicas/` ═══
 *
 * Porque un juego de solares mueve dinero en TREINTA sitios —renta, compra, fianza,
 * carta, diezmo, almoneda, empeño, trato, quiebra— y el fallo de dinero no se cae:
 * un `saldos[a] += cuanto` sobre un asiento que no está en el objeto da `NaN`, un
 * `NaN` no lanza, la vista lo publica, `canonico()` revienta seis segundos después
 * en la mesa y el jugador ve una partida que ya no se puede leer. Y un pago
 * «parcial» escrito con prisa deja a alguien con −40 sin que nada avise.
 *
 * Así que hay UNA función que transfiere, y sus tres invariantes están aquí y no
 * repartidos por un reductor de cuatro mil líneas:
 *
 *   · TODO ENTERO. Lo que entra se trunca y lo que sale es entero. El dinero del
 *     Burgo no tiene céntimos.
 *   · TODO O NADA. O el que paga tiene lo que debe y se transfiere entero, o no se
 *     mueve nada y se devuelve la DEUDA para que el juego abra un apuro. Nunca un
 *     pago a medias con un saldo negativo: el reglamento §9 dice que quien no
 *     alcanza vende y empeña, no que paga lo que puede.
 *   · NADA SE CREA NI SE PIERDE entre jugadores. Con el Concejo (`null`) sí: el
 *     Concejo tiene caja infinita y no se le lleva cuenta, así que cobrar de él
 *     crea dinero y pagarle lo destruye. Es lo que el reglamento dice de la banca.
 *
 * ═══ EL ORDEN DE LAS CLAVES, Y POR QUÉ NO ES MANÍA ═══
 *
 * El objeto de saldos nuevo se construye recorriendo `Object.keys(...)` ORDENADO con
 * comparador. `for…in` está prohibido en esta carpeta (`verify:pureza`) y el orden de
 * `Object.keys` sobre claves no numéricas es el de inserción, que Hermes y V8
 * respetan igual… mientras nadie las inserte en otro orden en un camino distinto.
 * `canonico()` ordena al serializar y taparía la diferencia en el disco, pero no en
 * una comparación por identidad ni en un `JSON.stringify` de un comprobador. Ordenar
 * cuesta una línea y quita una fuente de «funciona aquí y no allí».
 *
 * `comparador` compara por unidades UTF-16 (`<`), nunca con `localeCompare`: el
 * orden por locale depende del aparato y está vetado en `shared/`.
 *
 * ═══ Y EL «NO-OP» ES EL MISMO OBJETO ═══
 *
 * Cuando no se mueve nada —deuda, cantidad cero, pagarse a uno mismo— se devuelve
 * EL MISMO objeto de saldos, por identidad. La mesa descarta los movimientos que no
 * cambian el estado comparando con `!==`, y un `{ ...saldos }` sin cambios subiría la
 * revisión, engordaría el diario y despertaría a seis móviles por nada.
 */

/** Los saldos de una mesa: asiento → maravedíes. Enteros, nunca negativos. */
export type Saldos = Readonly<Record<string, number>>;

/** Una deuda pendiente: a quién (`null` = al Concejo) y cuánto. */
export interface Deuda {
  readonly a: string | null;
  readonly cuanto: number;
}

/** Lo que devuelve una transferencia: los saldos (los mismos si no hubo cambio), lo pagado y lo que queda a deber. */
export interface Transferencia {
  readonly saldos: Saldos;
  readonly pagado: number;
  readonly deuda: number;
}

/** Orden total y estable de claves, por unidades UTF-16. Sin `localeCompare` a propósito. */
export function comparador(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Las claves de unos saldos, ordenadas. La única forma admitida de recorrerlos. */
export function asientosDe(saldos: Saldos): string[] {
  return Object.keys(saldos).sort(comparador);
}

/** El saldo de un asiento; 0 si no consta (nunca `undefined`, nunca `NaN`). */
export function saldoDe(saldos: Saldos, quien: string | null): number {
  if (quien === null) return 0;
  const valor = saldos[quien];
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.trunc(valor) : 0;
}

/** Una cantidad de dinero saneada: entero y no negativo. Lo que no lo sea vale 0. */
export function cantidad(cuanto: number): number {
  if (typeof cuanto !== 'number' || !Number.isFinite(cuanto)) return 0;
  const entera = Math.trunc(cuanto);
  return entera > 0 ? entera : 0;
}

/** ¿Tiene `quien` al menos `cuanto`? El Concejo (`null`) siempre puede. */
export function puedePagar(saldos: Saldos, quien: string | null, cuanto: number): boolean {
  if (quien === null) return true;
  return saldoDe(saldos, quien) >= cantidad(cuanto);
}

/** Cuánto suman unas deudas, en entero. */
export function sumaDeDeudas(deudas: readonly Deuda[]): number {
  let total = 0;
  for (const d of deudas) total += cantidad(d.cuanto);
  return total;
}

/** Una copia de los saldos con las claves en orden y un asiento cambiado. Nunca muta. */
function conSaldo(saldos: Saldos, quien: string, valor: number): Saldos {
  const salida: Record<string, number> = {};
  let puesto = false;
  for (const k of asientosDe(saldos)) {
    if (!puesto && quien < k) {
      salida[quien] = valor;
      puesto = true;
    }
    salida[k] = k === quien ? valor : saldoDe(saldos, k);
    if (k === quien) puesto = true;
  }
  if (!puesto) salida[quien] = valor;
  return salida;
}

/**
 * Transfiere `cuanto` de `de` a `a`. `null` es el Concejo, que ni se agota ni lleva
 * cuenta. Todo o nada: si `de` no alcanza, `saldos` vuelve por identidad, `pagado`
 * es 0 y `deuda` es `cuanto` entero. Con `cuanto ≤ 0`, o `de === a`, no pasa nada.
 *
 * Un asiento que cobra y no constaba en `saldos` aparece con lo cobrado: es lo que
 * se espera de «cobra 200 del Concejo» al empezar. Un asiento que paga y no consta
 * tiene 0, y por tanto debe.
 */
export function transferir(saldos: Saldos, de: string | null, a: string | null, cuanto: number): Transferencia {
  const importe = cantidad(cuanto);
  if (importe === 0 || de === a) return { saldos, pagado: 0, deuda: 0 };
  if (de !== null && saldoDe(saldos, de) < importe) return { saldos, pagado: 0, deuda: importe };

  let salida = saldos;
  if (de !== null) salida = conSaldo(salida, de, saldoDe(salida, de) - importe);
  if (a !== null) salida = conSaldo(salida, a, saldoDe(salida, a) + importe);
  return { saldos: salida, pagado: importe, deuda: 0 };
}

/** Cuánto dinero hay entre todos los asientos. Para afirmar que nada se crea ni se pierde. */
export function totalEnMesa(saldos: Saldos): number {
  let total = 0;
  for (const k of asientosDe(saldos)) total += saldoDe(saldos, k);
  return total;
}
