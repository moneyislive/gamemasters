/**
 * QUIEN PASEA: el motor de tics que lo mueve, y lo que se pinta entre tic y tic.
 *
 * ═══ EL HUECO QUE ESTO TAPA ═══
 *
 * El paso ya estaba escrito para todas partes —`pasoDelTic`, en `shared/mecanicas/andar.ts`,
 * entero, con sus choques y sus vados— y el único juego que se anda no lo llamaba: `Lindes.tsx`
 * seguía dando su paso de siempre, uno por fotograma, en coma flotante, con un punto sin radio
 * y parándose sólo en el borde. Es justo lo que BOOTS-ON-BOARD §6.1 avisaba que iba a pasar:
 * dos `unPaso`, los comprobadores en verde, y el paseante atravesando murallas.
 *
 * Esto es lo que faltaba entre las dos cosas: un RELOJ que convierte los fotogramas en tics, y
 * una INTERPOLACIÓN que pinta entre el tic anterior y el último. Sin `three` y sin React, para
 * que un comprobador lo recorra en Node (`verify:paseo`).
 *
 * ═══ EL RELOJ CUENTA MICROSEGUNDOS ENTEROS, Y NO SEGUNDOS ═══
 *
 * Un tic dura 0,05 s, y en coma flotante seis fotogramas de 1/60 suman 0,09999999999999999: la
 * cuenta `⌊suma / 0,05⌋` da UN tic donde había dos. Y seis de una vigésima justa suman 0,3, que
 * partido por 0,05 da 5,999999999999999: cinco tics y no seis. Medido en Node, en seiscientos
 * fotogramas a 60 por segundo la cuenta en segundos se equivoca en 151. Lo que se pierde se
 * pierde justo en las cuentas redondas, que es donde nadie mira.
 *
 * En microsegundos un tic son 50.000 exactos (20 divide a un millón), el `dt` de cada fotograma
 * se redondea una vez al entrar, y a partir de ahí todo es entero: `N` fotogramas dan
 * exactamente `⌊total / tic⌋` pasos. `verify:paseo` lo comprueba, y comprueba también que la
 * cuenta en segundos sí se come el tic.
 *
 * ═══ Y NO SE DAN MÁS DE CINCO TICS POR FOTOGRAMA ═══
 *
 * Un fotograma de dos segundos —la pestaña estaba oculta y el navegador baja el bucle a uno por
 * segundo— pediría cuarenta tics de golpe. Darlos sería teletransportar a quien anda veinte
 * metros de un fotograma a otro, y si el fotograma es lento PORQUE da muchos tics, el siguiente
 * pide más y el aparato no sale nunca: la espiral de siempre. Lo que sobra de un cuarto de
 * segundo se tira, y quien lleva la W pulsada anda un poco menos de lo que habría andado.
 *
 * ═══ SE PINTA ENTRE EL TIC ANTERIOR Y EL ÚLTIMO, NUNCA POR DELANTE ═══
 *
 * Lo que sobra del reloj es la fracción de tic que ha pasado desde el último, y se pinta a esa
 * fracción del camino entre el penúltimo sitio y el último. Va un tic por detrás de la verdad
 * —cincuenta milisegundos— y a cambio no inventa nada: extrapolar pintaría al paseante dentro
 * de la pared contra la que el tic siguiente le va a parar.
 *
 * ═══ LA VELOCIDAD SE MIDE: ES LO QUE SE MOVIÓ, NO LO QUE SE PULSÓ ═══
 *
 * La distancia entre los dos últimos tics partida por lo que dura un tic. Contra una pared se
 * pulsa adelante y la velocidad es cero, que es lo que tiene que ver la marioneta para no andar
 * en el sitio (`zancada.ts`). Y `andado` suma lo que se movió de verdad: el `andando` de antes
 * sumaba SEGUNDOS pulsando, y contra el borde seguía creciendo.
 *
 * ═══ LA COSTURA CON LA RED, QUE HOY NO TIENE A NADIE AL OTRO LADO ═══
 *
 * En Boots on Board (BOOTS-ON-BOARD §7.3 A) cada aparato manda tic a tic dónde está y el
 * servidor lo VALIDA contra la estructura del mundo; si no cuadra, lo devuelve al último sitio
 * bueno. Aquí no hay red, pero el paseo ya está cortado por donde la red lo va a coser:
 *
 *   (a) LO PEDIDO EN CADA TIC. `fotogramaDelPaseo` llama a `alDarUnTic` UNA vez por tic, justo
 *       después de darlo, con `{ tic, rumbo, marcha }` —los dos enteros de `pasoDelTic` y el
 *       número del tic, consecutivo desde el nacimiento— y con el sitio en Q16.16 donde acabó.
 *       Todo entero: nada de lo que viajaría depende del fotograma ni de la coma flotante.
 *   (b) LA CORRECCIÓN. `corregirElPaseo(estado, sitio)` pone al paseante donde diga quien sabe
 *       más, y pone ahí también el tic anterior: así no se pinta un deslizamiento a través de la
 *       pared de la que se le saca, y la velocidad de ese tic es cero —la marioneta no echa a
 *       correr por un salto que no ha dado—. No reproduce lo pedido después, a propósito: el
 *       servidor valida y no resimula, y rehacer el camino con el mismo mundo que metió al
 *       paseante en el sitio malo le volvería a meter.
 *
 * ═══ Y NADIE SE QUEDA ENCERRADO ═══
 *
 * Si el sitio donde se nace —o donde se estaba, cuando el mundo cambia— no deja estar, el paso
 * no deja salir: `unPaso` sólo acepta sitios donde se cabe, y desde dentro de una caja no hay
 * ninguno a un paso. Se busca el sitio libre más cercano en anillos, con la tabla de rumbos y
 * aritmética entera, y ahí se nace. Es un rescate y no el sitio de nacer: dónde se nace lo
 * declara el mundo (`MundoDeclarado.nace`), y quien monta el paseo avisa si ha hecho falta.
 */
import {
  COSENO,
  pasoDelTic,
  QUIETO,
  RADIO_DEL_PASEANTE,
  RUMBOS,
  rumboDeRadianes,
  SENO,
  TICS_POR_SEGUNDO,
} from '../../shared/mecanicas/andar';
import { aNumero, deNumero, por } from '../../shared/mecanicas/fijo';
import { sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, Sitio } from '../../shared/mecanicas/mundo';
import { girar, pedidoDelTic } from './mandos';
import type { EntradaDelTic, Mandos, PedidoDelTic } from './mandos';

/* ─── El reloj ───────────────────────────────────────────────────────────── */

/** Lo que dura un tic, en microsegundos: 1.000.000 / 20 = 50.000, exacto. */
export const MICROS_POR_TIC = 1_000_000 / TICS_POR_SEGUNDO;
if (!Number.isInteger(MICROS_POR_TIC)) {
  /* Si un día cambian los tics por segundo a algo que no divide al millón, el reloj dejaría de
   * ser entero sin que nada fallara. Mejor que no arranque. */
  throw new Error(`Los tics por segundo (${String(TICS_POR_SEGUNDO)}) no dividen al millón: el reloj del paseo dejaría de ser entero.`);
}

/** Cuántos tics se dan como mucho en un fotograma: un cuarto de segundo. Ver la cabecera. */
export const TOPE_DE_TICS_POR_FOTOGRAMA = 5;

/** Lo que un fotograma le hace al reloj. */
export interface TicsDelFotograma {
  /** Los tics que hay que dar ahora. */
  readonly tics: number;
  /** Lo que sobra, en microsegundos: menos de un tic. */
  readonly sobra: number;
  /** Los tics enteros que no se dan por pasarse del tope. */
  readonly tirados: number;
}

/**
 * CUÁNTOS TICS CABEN EN UN FOTOGRAMA.
 *
 * `sobra` son los microsegundos que quedaron del fotograma anterior y `dt` los segundos de
 * éste, como los da `useFrame`. Un `dt` que no sea un número positivo no cuenta.
 */
export function ticsDelFotograma(sobra: number, dt: number): TicsDelFotograma {
  const micros = Number.isFinite(dt) && dt > 0 ? Math.round(dt * 1_000_000) : 0;
  const total = sobra + micros;
  const enteros = Math.floor(total / MICROS_POR_TIC);
  const resto = total - enteros * MICROS_POR_TIC;
  if (enteros <= TOPE_DE_TICS_POR_FOTOGRAMA) return { tics: enteros, sobra: resto, tirados: 0 };
  return { tics: TOPE_DE_TICS_POR_FOTOGRAMA, sobra: resto, tirados: enteros - TOPE_DE_TICS_POR_FOTOGRAMA };
}

/* ─── El estado ──────────────────────────────────────────────────────────── */

/** Quien pasea, entre fotograma y fotograma. Lo que decide es entero; lo que se pinta, no. */
export interface EstadoDelPaseo {
  /** El número del último tic dado. Se nace en el cero. */
  readonly tic: number;
  /** Dónde acabó el tic anterior al último, en Q16.16. */
  readonly antes: Andante;
  /** Dónde acabó el último tic, en Q16.16. Es donde ESTÁ. */
  readonly ahora: Andante;
  /** Hacia dónde mira, en radianes y continuo: lo gira cada fotograma y no decide nada. */
  readonly rumbo: number;
  /** Lo que se pidió en el último tic: su rumbo entero y su marcha. */
  readonly pedido: PedidoDelTic;
  /** Los microsegundos que han pasado desde el último tic: de aquí sale la interpolación. */
  readonly sobra: number;
  /** Lo que ha andado DE VERDAD desde que nació, en unidades del mundo. */
  readonly andado: number;
}

/** Quien pasea, como se pinta en este fotograma. Nada de esto vuelve a entrar en el paso. */
export interface Paseante {
  /** Hacia el este, en unidades del mundo, interpolado entre los dos últimos tics. */
  readonly x: number;
  /** Hacia el sur, en unidades del mundo, interpolado igual. */
  readonly z: number;
  /** Hacia dónde mira, en radianes: 0 es el norte y crece hacia el este. */
  readonly rumbo: number;
  /**
   * Lo que se movió en el último tic, en unidades por segundo. NEGATIVO si fue hacia atrás de
   * donde mira, que es lo que la marioneta necesita para no hacer el paso de la luna.
   */
  readonly velocidad: number;
  /** Lo andado desde que nació, en unidades del mundo. */
  readonly andado: number;
}

/* ─── Nacer, y no quedarse encerrado ─────────────────────────────────────── */

/** Cuántos anillos se miran alrededor de un sitio donde no se cabe: 48 × 0,8 = 38,4 unidades. */
const ANILLOS_DEL_RESCATE = 48;

/** Cuántas direcciones por anillo: una de cada ocho de la tabla de rumbos. */
const DIRECCIONES_DEL_RESCATE = 32;

/**
 * EL SITIO MÁS CERCANO DONDE SE CABE, o `null` si no hay ninguno a menos de 38 unidades.
 *
 * Todo en Q16.16 y sin un seno: las direcciones salen de la tabla literal de `andar.ts` y el
 * alcance se multiplica con `por`. Así el mismo rescate daría lo mismo en el servidor, si un
 * día tiene que colocar a alguien.
 */
export function sitioDondeCabe(
  arena: Arena,
  x: number,
  z: number,
  radio: number = RADIO_DEL_PASEANTE,
): Andante | null {
  if (sePuedeEstar(arena, x, z, radio)) return { x, z };
  /* Anillos de dos radios: más finos no encuentran nada que éstos no encuentren. */
  const paso = radio * 2;
  for (let k = 1; k <= ANILLOS_DEL_RESCATE; k++) {
    const lejos = paso * k;
    for (let i = 0; i < DIRECCIONES_DEL_RESCATE; i++) {
      const r = (i * RUMBOS) / DIRECCIONES_DEL_RESCATE;
      const cx = x + por(lejos, SENO[r] as number);
      const cz = z - por(lejos, COSENO[r] as number);
      if (sePuedeEstar(arena, cx, cz, radio)) return { x: cx, z: cz };
    }
  }
  return null;
}

/**
 * NACER EN UN SITIO DEL MUNDO.
 *
 * `sitio` en unidades del mundo, como lo declara `MundoDeclarado.nace`. Si ahí no se cabe, se
 * nace en el sitio libre más cercano (ver la cabecera); si tampoco lo hay, se nace donde dice
 * el mundo y quien monta el paseo lo tiene que decir, porque desde ahí no se va a poder andar.
 */
export function nacerEnElPaseo(arena: Arena, sitio: Sitio, radio: number = RADIO_DEL_PASEANTE): EstadoDelPaseo {
  const x = deNumero(sitio.x);
  const z = deNumero(sitio.z);
  const donde = sitioDondeCabe(arena, x, z, radio) ?? { x, z };
  return {
    tic: 0,
    antes: donde,
    ahora: donde,
    rumbo: sitio.rumbo,
    pedido: { rumbo: rumboDeRadianes(sitio.rumbo), marcha: QUIETO },
    sobra: 0,
    andado: 0,
  };
}

/**
 * CUANDO CAMBIA EL MUNDO: se sigue donde se estaba, salvo que ahí ya no se quepa.
 *
 * En Las Lindes el mundo cambia cada vez que se pone una losa, y quien pasea no tiene por qué
 * enterarse. Pero un mundo nuevo puede traer una caja justo donde uno estaba —o quitar el suelo
 * de debajo—, y entonces se le saca al sitio libre más cercano, que es lo que se espera de una
 * puerta que se cierra con uno al lado: que te aparte, no que te trague.
 */
export function mudarDeMundo(arena: Arena, e: EstadoDelPaseo, radio: number = RADIO_DEL_PASEANTE): EstadoDelPaseo {
  if (sePuedeEstar(arena, e.ahora.x, e.ahora.z, radio)) return e;
  const libre = sitioDondeCabe(arena, e.ahora.x, e.ahora.z, radio);
  if (libre === null) return e;
  return { ...e, antes: libre, ahora: libre };
}

/* ─── Los tics ───────────────────────────────────────────────────────────── */

/** UN TIC: el paso de `shared/`, y lo que se anduvo de verdad. */
export function ticDelPaseo(
  arena: Arena,
  e: EstadoDelPaseo,
  pedido: PedidoDelTic,
  radio: number = RADIO_DEL_PASEANTE,
): EstadoDelPaseo {
  const ahora = pasoDelTic(arena, e.ahora, pedido.rumbo, pedido.marcha, radio);
  const andado = e.andado + Math.hypot(aNumero(ahora.x - e.ahora.x), aNumero(ahora.z - e.ahora.z));
  return { ...e, tic: e.tic + 1, antes: e.ahora, ahora, pedido, andado };
}

/**
 * UN FOTOGRAMA: se gira, se cuentan los tics que caben y se dan.
 *
 * Todos los tics de un fotograma llevan el mismo pedido —el de los mandos y el rumbo de este
 * fotograma—, porque es lo único que se sabe: nadie ha pulsado nada entre medias. `alDarUnTic`
 * es la costura (a) de la cabecera.
 */
export function fotogramaDelPaseo(
  arena: Arena,
  e: EstadoDelPaseo,
  dt: number,
  mandos: Mandos,
  alDarUnTic?: (entrada: EntradaDelTic, sitio: Andante) => void,
  radio: number = RADIO_DEL_PASEANTE,
): EstadoDelPaseo {
  const rumbo = girar(e.rumbo, mandos, dt);
  const reloj = ticsDelFotograma(e.sobra, dt);
  let s: EstadoDelPaseo = { ...e, rumbo, sobra: reloj.sobra };
  for (let i = 0; i < reloj.tics; i++) {
    const pedido = pedidoDelTic(mandos, rumbo);
    s = ticDelPaseo(arena, s, pedido, radio);
    if (alDarUnTic !== undefined) {
      alDarUnTic({ tic: s.tic, rumbo: pedido.rumbo, marcha: pedido.marcha, mira: rumboDeRadianes(rumbo) }, s.ahora);
    }
  }
  return s;
}

/** LA COSTURA (b): poner a quien pasea en un sitio, sin pintar cómo llegó. Ver la cabecera. */
export function corregirElPaseo(e: EstadoDelPaseo, sitio: Andante): EstadoDelPaseo {
  return { ...e, antes: sitio, ahora: sitio };
}

/* ─── Lo que se pinta ────────────────────────────────────────────────────── */

/** Por dónde va el fotograma dentro del tic: de 0 (acaba de darse) a casi 1. */
export function fraccionDelTic(e: EstadoDelPaseo): number {
  return e.sobra / MICROS_POR_TIC;
}

/**
 * QUIEN PASEA, COMO SE PINTA AHORA: entre el tic anterior y el último, a la fracción del reloj.
 */
export function poseDelPaseo(e: EstadoDelPaseo): Paseante {
  const alfa = fraccionDelTic(e);
  const ax = aNumero(e.antes.x);
  const az = aNumero(e.antes.z);
  const dx = aNumero(e.ahora.x) - ax;
  const dz = aNumero(e.ahora.z) - az;
  const rapidez = Math.hypot(dx, dz) * TICS_POR_SEGUNDO;
  /* Hacia atrás es contra donde mira: `(sen r, −cos r)` es su delante. De lado cuenta como delante. */
  const haciaAtras = dx * Math.sin(e.rumbo) - dz * Math.cos(e.rumbo) < 0;
  return {
    x: ax + dx * alfa,
    z: az + dz * alfa,
    rumbo: e.rumbo,
    velocidad: haciaAtras ? -rapidez : rapidez,
    andado: e.andado,
  };
}
