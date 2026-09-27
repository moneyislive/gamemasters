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
 *       número del tic, consecutivo desde el nacimiento—, hacia dónde se mira y si en ese tic se
 *       golpea, y con el sitio en Q16.16 donde acabó. Todo entero: nada de lo que viajaría
 *       depende del fotograma ni de la coma flotante.
 *   (b) LA CORRECCIÓN. `corregirElPaseo(estado, sitio)` pone al paseante donde diga quien sabe
 *       más, y pone ahí también el tic anterior: así no se pinta un deslizamiento a través de la
 *       pared de la que se le saca, y la velocidad de ese tic es cero —la marioneta no echa a
 *       correr por un salto que no ha dado—. No reproduce lo pedido después, a propósito: el
 *       servidor valida y no resimula, y rehacer el camino con el mismo mundo que metió al
 *       paseante en el sitio malo le volvería a meter. Con un rumbo, además le hace mirar ahí:
 *       es como se renace en la refriega.
 *
 * ═══ Y NADIE SE QUEDA ENCERRADO ═══
 *
 * Si el sitio donde se nace —o donde se estaba, cuando el mundo cambia— no deja estar, el paso
 * no deja salir: `unPaso` sólo acepta sitios donde se cabe, y desde dentro de una caja no hay
 * ninguno a un paso. Se busca el sitio libre más cercano en anillos, con la tabla de rumbos y
 * aritmética entera, y ahí se nace. Es un rescate y no el sitio de nacer: dónde se nace lo
 * declara el mundo (`MundoDeclarado.nace`), y quien monta el paseo avisa si ha hecho falta.
 *
 * Y NO SÓLO AL NACER: cada tic mira antes de dar el paso si se puede estar donde se está, y si no,
 * lo da desde el sitio libre más cercano (`ticDelPaseo`). Nacer y mudar de mundo ya rescataban,
 * pero quien acababa dentro de algo por otra puerta —una corrección de la red, un estado de otro
 * mundo, un mundo que llega tarde— se quedaba CLAVADO: ni adelante ni atrás. Es lo que se vio el
 * 27-sep-2026 en el Burgo, junto a las torres del centro; `verify:paseo` lo reproduce con el paso
 * de `shared/` a secas.
 *
 * SALVO DEL ADORNO, DEL QUE SE SALE ANDANDO. Desde el 27-sep-2026 el adorno también choca en el
 * aparato (`adorno-que-choca.ts`), y el servidor, que no lo ve, puede poner a alguien dentro de un
 * coche o de un pino al entrar o al renacer. Ahí no se salta al sitio libre más cercano —el servidor
 * ignoraría un primer paso tan largo y le devolvería dentro—: se sale un tic de correr por tic, en
 * recta por la estructura (`salirDelAdorno`).
 *
 * ═══ Y UN PASO NO SALTA RENDIJAS ═══
 *
 * `unPaso` mira sólo el sitio de LLEGADA. Donde dos cajas se tocan por las esquinas con un hueco
 * más estrecho que quien anda, las dos orillas son buenas y en medio no se cabe: un paso en
 * diagonal —0,6 andando, 1,32 corriendo— salta de una a otra. Pasa en el Burgo en las rendijas de
 * 0,6 entre las torres del centro (en la mesa ABCD, 988 de los 54.669 pasos que se mueven desde
 * una rejilla alrededor de dos de ellas) y en Las Lindes entre casas. El servidor, que valida el
 * tramo en recta o en escuadra, lo rechaza y devuelve a quien lo dio; con la tecla pulsada el
 * aparato lo vuelve a dar, y se ve como un tirón atrás contra una pared que no está.
 *
 * Así que el paseo da el paso de `shared/` y mira su TRAMO con una cuenta exacta y entera
 * (`cruzaUnCuerpo`); si cruza un cuerpo, lo rehace eje a eje como resbala `unPaso`, con el tramo de
 * cada eje mirado igual (`pasoSinCruzar`). Casi siempre no cruza nada, y el paso es exactamente el de
 * `shared/`: el paso de `shared/` no se toca, porque es lo que miden los dos motores y lo que el
 * servidor no resimula.
 */
import {
  COSENO,
  DT_DEL_TIC,
  pasoDelTic,
  QUIETO,
  RADIO_DEL_PASEANTE,
  RUMBOS,
  rumboDeRadianes,
  SENO,
  TICS_POR_SEGUNDO,
  VELOCIDAD_QUE_ACEPTA_EL_SERVIDOR,
} from '../../shared/mecanicas/andar';
import { aNumero, deNumero, por, UNO } from '../../shared/mecanicas/fijo';
import { seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, Sitio } from '../../shared/mecanicas/mundo';
import { estructuraDe } from './adorno-que-choca';
import { girar, golpesVistosTras, mandosDelFotograma, pedidoDelTic } from './mandos';
import type { EntradaDelTic, Mandos, MandosDeFuera, PedidoDelTic, Teclas } from './mandos';

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

/**
 * ¿CRUZA EL TRAMO DE `a` A `b` ALGÚN CUERPO, ENSANCHADO POR EL RADIO? Todo en Q16.16, y exacto.
 *
 * Quien anda choca con una caja cuando su centro cae DENTRO de la caja ensanchada un radio por cada
 * lado, con los bordes abiertos (`chocaConCuerpo`, en `mundo.ts`). El tramo `a + t·(b − a)` con `t`
 * de 0 a 1 la cruza si hay un `t` que cae dentro de los dos intervalos abiertos, el de `x` y el de
 * `z`, a la vez. Cada intervalo es una fracción de enteros, y se comparan multiplicando en cruz: con
 * coordenadas de hasta 2²⁶ y un paso de menos de 2¹⁸ los productos no pasan de 2⁴⁴, exactos en un
 * doble y los mismos en V8 y en Hermes. Nada de muestrear: una rendija entre dos esquinas puede ser
 * más fina que cualquier trozo.
 *
 * CON EL ÍNDICE DE LA ARENA. Iba sin él —las 1.975 cajas de un tablero lleno de Las Lindes por
 * veinte tics eran 40.000 comparaciones por segundo—, pero con el adorno que choca
 * (`adorno-que-choca.ts`) el Burgo pasa de mil y pico cuerpos a más de diez mil, y en el Hermes del
 * móvil, sin JIT, recorrerlos todos en cada tic que se mueve ya se nota. Se miran los cajones que
 * pisa el rectángulo del tramo ensanchado un radio —uno, o dos si cae en una raya: un tic no llega a
 * dos unidades y un cajón mide treinta y dos—, con la misma cuenta con la que `mundo.ts` los monta
 * (`CAJON_EN_FIJO`). Una caja apuntada en dos cajones se mira dos veces, que para contestar «¿cruza
 * algo?» da igual. `verify:paseo` lo compara con el recorrido entero (`cruzaUnCuerpoSinIndice`) en
 * tramos al azar sobre el Burgo con su adorno.
 */
export function cruzaUnCuerpo(arena: Arena, a: Andante, b: Andante, radio: number = RADIO_DEL_PASEANTE): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (dx === 0 && dz === 0) return false;
  if (arena.cajonesAncho === 0 || arena.cajonesFondo === 0) return false;
  const menorX = dx < 0 ? b.x : a.x;
  const mayorX = dx < 0 ? a.x : b.x;
  const menorZ = dz < 0 ? b.z : a.z;
  const mayorZ = dz < 0 ? a.z : b.z;
  let desdeCx = Math.floor((menorX - radio) / CAJON_EN_FIJO) - arena.cajonDesdeX;
  let hastaCx = Math.floor((mayorX + radio) / CAJON_EN_FIJO) - arena.cajonDesdeX;
  let desdeCz = Math.floor((menorZ - radio) / CAJON_EN_FIJO) - arena.cajonDesdeZ;
  let hastaCz = Math.floor((mayorZ + radio) / CAJON_EN_FIJO) - arena.cajonDesdeZ;
  if (hastaCx < 0 || hastaCz < 0 || desdeCx >= arena.cajonesAncho || desdeCz >= arena.cajonesFondo) return false;
  if (desdeCx < 0) desdeCx = 0;
  if (desdeCz < 0) desdeCz = 0;
  if (hastaCx >= arena.cajonesAncho) hastaCx = arena.cajonesAncho - 1;
  if (hastaCz >= arena.cajonesFondo) hastaCz = arena.cajonesFondo - 1;
  for (let cz = desdeCz; cz <= hastaCz; cz++) {
    for (let cx = desdeCx; cx <= hastaCx; cx++) {
      const cajon = arena.cajones[cz * arena.cajonesAncho + cx];
      if (cajon === undefined) continue;
      for (const k of cajon) if (cruzaLaCaja(arena.cuerpos, k * 4, a, dx, dz, menorX, mayorX, menorZ, mayorZ, radio)) return true;
    }
  }
  return false;
}

/**
 * El lado de un cajón del índice de la arena, en Q16.16: el de `mundo.ts` (32 unidades), que no lo
 * exporta. Si allí cambiara, `verify:paseo` lo vería: compara `cruzaUnCuerpo` con el recorrido entero.
 */
const CAJON_EN_FIJO = 32 * UNO;

/** LO MISMO QUE `cruzaUnCuerpo`, RECORRIENDO TODAS LAS CAJAS: como era antes, para comparar. */
export function cruzaUnCuerpoSinIndice(arena: Arena, a: Andante, b: Andante, radio: number = RADIO_DEL_PASEANTE): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (dx === 0 && dz === 0) return false;
  const menorX = dx < 0 ? b.x : a.x;
  const mayorX = dx < 0 ? a.x : b.x;
  const menorZ = dz < 0 ? b.z : a.z;
  const mayorZ = dz < 0 ? a.z : b.z;
  for (let i = 0; i < arena.cuerpos.length; i += 4) {
    if (cruzaLaCaja(arena.cuerpos, i, a, dx, dz, menorX, mayorX, menorZ, mayorZ, radio)) return true;
  }
  return false;
}

/** ¿Cruza el tramo de `a` a `a + (dx, dz)` la caja que empieza en `i`, ensanchada un radio? La cuenta exacta. */
function cruzaLaCaja(
  c: Int32Array,
  i: number,
  a: Andante,
  dx: number,
  dz: number,
  menorX: number,
  mayorX: number,
  menorZ: number,
  mayorZ: number,
  radio: number,
): boolean {
  const x0 = (c[i] as number) - radio;
  const z0 = (c[i + 1] as number) - radio;
  const x1 = (c[i + 2] as number) + radio;
  const z1 = (c[i + 3] as number) + radio;
  /* Si la caja no pisa el rectángulo del tramo, no lo toca (y con un eje de ancho cero, también vale). */
  if (x1 <= menorX || x0 >= mayorX || z1 <= menorZ || z0 >= mayorZ) return false;
  /* El intervalo de `t` donde se está dentro: `desde/deDesde < t < hasta/deHasta`, empezando por [0, 1]. */
  let desde = 0;
  let deDesde = 1;
  let hasta = 1;
  let deHasta = 1;
  let vacio = false;
  for (const [o, d, lo, hi] of [
    [a.x, dx, x0, x1],
    [a.z, dz, z0, z1],
  ] as const) {
    if (d === 0) {
      if (!(o > lo && o < hi)) vacio = true;
      continue;
    }
    /* Con el denominador positivo: `(lo − o)/d < t < (hi − o)/d` si `d > 0`, y al revés si no. */
    const den = d > 0 ? d : -d;
    const nDesde = d > 0 ? lo - o : o - hi;
    const nHasta = d > 0 ? hi - o : o - lo;
    if (nDesde * deDesde > desde * den) {
      desde = nDesde;
      deDesde = den;
    }
    if (nHasta * deHasta < hasta * den) {
      hasta = nHasta;
      deHasta = den;
    }
  }
  if (vacio) return false;
  return desde * deHasta < hasta * deDesde;
}

/**
 * EL PASO DE UN TIC, SIN CRUZAR POR DONDE NO SE CABE.
 *
 * Es `pasoDelTic` de `shared/`, y casi siempre sale lo mismo: sólo si su tramo cruza un cuerpo
 * (`cruzaUnCuerpo`) se mira si se llega doblando la esquina —un eje y luego el otro—, y si tampoco,
 * se rehace eje a eje, como resbala `unPaso`, pero pidiendo a cada eje que su tramo tampoco cruce
 * nada. Ver «Y UN PASO NO SALTA RENDIJAS» en la cabecera.
 *
 * El paso de `shared/` o es la diagonal entera o se ha movido por un solo eje: resbalando, el
 * segundo eje prueba justo el sitio de la diagonal, que ya estaba ocupado. Así que si se movió
 * por los dos ejes, fue en diagonal.
 */
export function pasoSinCruzar(
  arena: Arena,
  quien: Andante,
  rumbo: number,
  marcha: PedidoDelTic['marcha'],
  radio: number = RADIO_DEL_PASEANTE,
): Andante {
  const paso = pasoDelTic(arena, quien, rumbo, marcha, radio);
  const dx = paso.x - quien.x;
  const dz = paso.z - quien.z;
  if (dx === 0 && dz === 0) return paso;
  if (!cruzaUnCuerpo(arena, quien, paso, radio)) return paso;
  /* Por un solo eje y cruzando: un cuerpo más fino que el paso. Ahí no se anda. */
  if (dx === 0 || dz === 0) return quien;
  /*
   * En diagonal y cruzando. Si se llega igual doblando la esquina —primero un eje y luego el otro,
   * en cualquiera de los dos órdenes, sin cruzar nada—, el paso vale entero: es la ESCUADRA que el
   * servidor también acepta, y así lo que rodea una esquina por fuera sale igual que en `shared/`.
   */
  const cabeSinCruzar = (de: Andante, a: Andante): boolean => sePuedeEstar(arena, a.x, a.z, radio) && !cruzaUnCuerpo(arena, de, a, radio);
  const soloX = { x: quien.x + dx, z: quien.z };
  const soloZ = { x: quien.x, z: quien.z + dz };
  const porX = cabeSinCruzar(quien, soloX);
  if (porX && !cruzaUnCuerpo(arena, soloX, paso, radio)) return paso;
  if (cabeSinCruzar(quien, soloZ) && !cruzaUnCuerpo(arena, soloZ, paso, radio)) return paso;
  /* Y si no, se resbala como en `unPaso`: primero `x`, luego `z`, cada eje con su tramo mirado. */
  const x = porX ? soloX.x : quien.x;
  const luegoZ = { x, z: quien.z + dz };
  return cabeSinCruzar({ x, z: quien.z }, luegoZ) ? luegoZ : { x, z: quien.z };
}

/**
 * UN TIC: el paso de `shared/` sin cruzar rendijas (`pasoSinCruzar`), y lo que se anduvo de verdad.
 *
 * Y ANTES, SI SE ESTÁ DENTRO DE ALGO, SE SALE: desde dentro de una caja `unPaso` no deja dar ni un
 * paso, y quien acababa ahí —por la red, por un mundo que cambió o que llegó tarde— se quedaba
 * clavado. El tic empieza entonces desde el sitio libre más cercano (`sitioDondeCabe`), y el
 * rescate se pinta ya hecho: `antes` es el sitio libre, para no deslizar a nadie por dentro de un
 * muro. Ver «Y NADIE SE QUEDA ENCERRADO» en la cabecera.
 *
 * SALVO QUE LO ÚNICO QUE LE TENGA DENTRO SEA EL ADORNO: entonces se sale andando (`salirDelAdorno`).
 */
export function ticDelPaseo(
  arena: Arena,
  e: EstadoDelPaseo,
  pedido: PedidoDelTic,
  radio: number = RADIO_DEL_PASEANTE,
): EstadoDelPaseo {
  let desde = e.ahora;
  if (!sePuedeEstar(arena, desde.x, desde.z, radio)) {
    const estructura = estructuraDe(arena);
    if (estructura !== arena && sePuedeEstar(estructura, desde.x, desde.z, radio)) {
      const fuera = salirDelAdorno(arena, estructura, desde, pedido, radio);
      const lo = e.andado + Math.hypot(aNumero(fuera.x - desde.x), aNumero(fuera.z - desde.z));
      return { ...e, tic: e.tic + 1, antes: desde, ahora: fuera, pedido, andado: lo };
    }
    desde = sitioDondeCabe(arena, desde.x, desde.z, radio) ?? desde;
  }
  const ahora = pasoSinCruzar(arena, desde, pedido.rumbo, pedido.marcha, radio);
  const andado = e.andado + Math.hypot(aNumero(ahora.x - desde.x), aNumero(ahora.z - desde.z));
  return { ...e, tic: e.tic + 1, antes: desde, ahora, pedido, andado };
}

/* ─── Del adorno se sale andando ─────────────────────────────────────────── */

/**
 * LO QUE SE ANDA COMO MUCHO EN UN TIC SALIENDO DEL ADORNO: un tic de lo más deprisa que el servidor
 * acepta (`VELOCIDAD_QUE_ACEPTA_EL_SERVIDOR`, 26,4 u/s), 1,32 unidades.
 *
 * Es lo que el servidor acepta siempre a partir de un sitio que él mismo dio: tras un `corrige`, un
 * `dentro` o un `renace`, el primer `aqui` tiene que caer a un tic con holgura de ese sitio
 * (`UN_TIC_CON_HOLGURA`, 1,65 en `server/src/botas/canal.ts`), o se ignora y al segundo se le vuelve a
 * corregir al mismo sitio: dentro del coche otra vez, para siempre.
 *
 * Y NO un tic de correr de este aparato, que desde la talla a pie es la mitad (`andar.ts`): a 0,66 por
 * tic, quien sale de una arboleda hacia la salida que `salidaDelAdorno` eligió —fuera de todo rincón
 * cerrado— pisaba suelo libre a medio camino y dejaba de salir ahí, que puede ser un bolsillo entre dos
 * arboledas (medido en `verify:paseo`, en el delta). Es un tramo que el servidor acepta, y es raro.
 */
export const LO_QUE_SE_SALE_EN_UN_TIC = por(VELOCIDAD_QUE_ACEPTA_EL_SERVIDOR, DT_DEL_TIC);

/**
 * EL SITIO LIBRE MÁS CERCANO PARA SALIR DEL ADORNO: el primero, en los anillos de `sitioDondeCabe`,
 * donde se puede estar con estructura y adorno, al que se llega en RECTA por la estructura sola
 * (`seAndaEnRecta`: el tramo que mira el servidor) y que no es un rincón cerrado (`quedaEncerrado`).
 * Si todos los que valen lo son, el primero de ellos; `null` si no hay ninguno a menos de 38 unidades.
 *
 * ═══ Y TAMPOCO SE PARA EN UN RINCÓN DE CAMINO ═══
 *
 * Se sale a tics de `LO_QUE_SE_SALE_EN_UN_TIC`, y en cuanto se pisa suelo libre se deja de salir: si la
 * recta hacia una salida lejana cruza un claro cerrado, allí es donde se acaba, no en la salida. Pasó
 * al encoger a quien anda (27-sep-2026): del tocón de un claro entre dos arboledas del delta, todas
 * las salidas cercanas eran el propio claro, la primera buena estaba a 14 unidades AL OTRO LADO de
 * él, y el primer tic caía dentro (`verify:paseo`). Así que de cada salida buena se mira también
 * dónde se pararía de verdad (`dondeSeParaAlSalir`), y si eso es un rincón cerrado, no vale.
 */
export function salidaDelAdorno(arena: Arena, estructura: Arena, desde: Andante, radio: number = RADIO_DEL_PASEANTE): Andante | null {
  const paso = radio * 2;
  let encerrada: Andante | null = null;
  for (let k = 1; k <= ANILLOS_DEL_RESCATE; k++) {
    const lejos = paso * k;
    for (let i = 0; i < DIRECCIONES_DEL_RESCATE; i++) {
      const r = (i * RUMBOS) / DIRECCIONES_DEL_RESCATE;
      const cx = desde.x + por(lejos, SENO[r] as number);
      const cz = desde.z - por(lejos, COSENO[r] as number);
      if (!sePuedeEstar(arena, cx, cz, radio) || !seAndaEnRecta(estructura, desde, { x: cx, z: cz }, radio)) continue;
      if (!quedaEncerrado(arena, cx, cz, radio)) {
        const para = dondeSeParaAlSalir(arena, desde, { x: cx, z: cz }, radio);
        if ((para.x === cx && para.z === cz) || !quedaEncerrado(arena, para.x, para.z, radio)) return { x: cx, z: cz };
      }
      encerrada ??= { x: cx, z: cz };
    }
  }
  return encerrada;
}

/**
 * DÓNDE SE PARA DE VERDAD QUIEN SALE DEL ADORNO HACIA `hasta`: el primer tic de la recta, dado como lo
 * da `salirDelAdorno`, que pisa suelo libre; `hasta` si ninguno lo pisa antes.
 */
function dondeSeParaAlSalir(arena: Arena, desde: Andante, hasta: Andante, radio: number): Andante {
  const dx = hasta.x - desde.x;
  const dz = hasta.z - desde.z;
  const lejos = Math.hypot(dx, dz);
  for (let andado = LO_QUE_SE_SALE_EN_UN_TIC; andado < lejos; andado += LO_QUE_SE_SALE_EN_UN_TIC) {
    const f = andado / lejos;
    const aqui = { x: desde.x + Math.trunc(dx * f), z: desde.z + Math.trunc(dz * f) };
    if (sePuedeEstar(arena, aqui.x, aqui.z, radio)) return aqui;
  }
  return hasta;
}

/**
 * LO MÁS GRANDE QUE SE LLAMA RINCÓN CERRADO: 250 unidades cuadradas. Lo que el adorno deja aparte en
 * los tres mundos medidos no pasa de 90 (`verify:paseo`), y una plaza o una calle lo pasan enseguida.
 */
export const AREA_DE_UN_RINCON = 250;
const REJILLA_DEL_ENCIERRO = 0.25;
const HOLGURA_DEL_ENCIERRO = deNumero(0.2);

/**
 * ¿ES UN RINCÓN CERRADO? Desde `(x, z)` (Q16.16) se recorre lo libre en una rejilla de un cuarto de
 * unidad, y si se acaba antes de llegar a `AREA_DE_UN_RINCON`, es que está cerrado.
 *
 * Es para no salir del adorno a un BOLSILLO: entre arboledas, rocas y montañas del delta quedan claros
 * cerrados, y en el Burgo pasillos de servicio junto a las gradas cortados por un arbusto (medidos en
 * `verify:paseo`), y el sitio libre más cercano a quien sale de una arboleda puede estar en uno. Ahí no
 * se podría salir andando. Por superficie y no por distancia, porque un pasillo cerrado es largo y
 * estrecho: se alejaba mucho sin dejar de estar cerrado. Sólo se pregunta al salir del adorno, que es
 * raro, y fuera de un rincón se llega a la superficie tope en unos cuatro mil pasos de rejilla.
 */
export function quedaEncerrado(arena: Arena, x: number, z: number, radio: number = RADIO_DEL_PASEANTE): boolean {
  const celda = deNumero(REJILLA_DEL_ENCIERRO);
  const tope = Math.ceil(AREA_DE_UN_RINCON / (REJILLA_DEL_ENCIERRO * REJILLA_DEL_ENCIERRO));
  /* Las celdas por su par (i, j) desde el punto de partida, en una llave entera. */
  const llave = (i: number, j: number): number => (i + 32768) * 65536 + (j + 32768);
  const vistas = new Set<number>([llave(0, 0)]);
  const cola: number[] = [0, 0];
  let cabeza = 0;
  let libres = 1;
  while (cabeza < cola.length) {
    const i = cola[cabeza++] as number;
    const j = cola[cabeza++] as number;
    for (const [vi, vj] of [
      [i - 1, j],
      [i + 1, j],
      [i, j - 1],
      [i, j + 1],
    ] as const) {
      const k = llave(vi, vj);
      if (vistas.has(k)) continue;
      vistas.add(k);
      /* Con una holgura de un palmo: dos cajas que se tocan dejan entre ellas un hueco de ancho cero, que ninguna rejilla debe tomar por salida. */
      if (!sePuedeEstar(arena, x + vi * celda, z + vj * celda, radio + HOLGURA_DEL_ENCIERRO)) continue;
      if (++libres > tope) return false;
      cola.push(vi, vj);
    }
  }
  return true;
}

/**
 * UN TIC DENTRO DEL ADORNO: hacia la salida más cercana (`salidaDelAdorno`), como mucho
 * `LO_QUE_SE_SALE_EN_UN_TIC`, por la recta que el servidor acepta. Lo que se pulse ese tic no cuenta:
 * primero se sale. Si no hay salida a la vista, se anda como se pida con la estructura sola —el adorno
 * no para a quien ya está dentro de él— hasta estar fuera.
 *
 * ═══ POR QUÉ ANDANDO Y NO DE UN SALTO, COMO DE LA ESTRUCTURA ═══
 *
 * Porque el servidor no ve el adorno. Cuando pone a alguien dentro de un coche —al renacer, al
 * entrar—, ese sitio es bueno para él, y el primer paso que se le mande tiene que caer a un tic de
 * ahí (`LO_QUE_SE_SALE_EN_UN_TIC`). Del centro de un coche al sitio libre más cercano hay 1,65
 * unidades o más: de un salto, el servidor lo ignoraría y le devolvería dentro al segundo. Andando,
 * cada tic es un tramo corto y recto que acepta, y en dos o tres tics se está fuera. De la
 * estructura sí se sale de un salto, porque ahí el servidor ya ha rescatado antes con la misma cuenta
 * (`server/src/botas/sitios.ts`).
 */
export function salirDelAdorno(
  arena: Arena,
  estructura: Arena,
  desde: Andante,
  pedido: PedidoDelTic,
  radio: number = RADIO_DEL_PASEANTE,
): Andante {
  const salida = salidaDelAdorno(arena, estructura, desde, radio);
  if (salida === null) return pasoSinCruzar(estructura, desde, pedido.rumbo, pedido.marcha, radio);
  const dx = salida.x - desde.x;
  const dz = salida.z - desde.z;
  const lejos = Math.hypot(dx, dz);
  if (lejos <= LO_QUE_SE_SALE_EN_UN_TIC) return salida;
  const f = LO_QUE_SE_SALE_EN_UN_TIC / lejos;
  return { x: desde.x + Math.trunc(dx * f), z: desde.z + Math.trunc(dz * f) };
}

/**
 * UN FOTOGRAMA: se gira, se cuentan los tics que caben y se dan.
 *
 * Todos los tics de un fotograma llevan el mismo pedido —el de los mandos y el rumbo de este
 * fotograma—, porque es lo único que se sabe: nadie ha pulsado nada entre medias. `alDarUnTic`
 * es la costura (a) de la cabecera.
 *
 * El golpe, si lo hay (`Mandos.golpe`), va SÓLO en el primero: un toque es un golpe, y un
 * fotograma de cinco tics no puede convertirlo en cinco. Si el fotograma no da ningún tic, el
 * golpe no sale aquí y quien lleva la cuenta lo deja para el siguiente (`golpesVistosTras`).
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
      alDarUnTic(
        { tic: s.tic, rumbo: pedido.rumbo, marcha: pedido.marcha, mira: rumboDeRadianes(rumbo), golpe: mandos.golpe && i === 0 },
        s.ahora,
      );
    }
  }
  return s;
}

/** Lo que el gancho del paseo se lleva de un fotograma al siguiente: el paseo y los golpes ya vistos. */
export interface FotogramaDeQuienPasea {
  readonly paseo: EstadoDelPaseo;
  readonly golpesVistos: number;
}

/**
 * UN FOTOGRAMA DEL GANCHO, SIN REACT: lo que `usarElPaseo` hace entre leer los mandos y pintar,
 * suelto para que `verify:paseo` lo recorra en Node.
 *
 *  · EN EL SUELO NO SE DA NI UN TIC. Con `caido` el paseo sale tal cual entró —ni anda, ni gira, ni
 *    se le cuenta nada a la red— y lo pulsado se da por visto: al levantarse no sale un golpe que se
 *    pidió tumbado.
 *  · EL GOLPE PENDIENTE va en el primer tic del fotograma (`fotogramaDelPaseo`), y si el fotograma
 *    no da ninguno espera al siguiente (`golpesVistosTras`).
 *
 * `golpesPedidos` es la suma de las dos cuentas —la G y el botón— y `golpesVistos`, lo que ya salió;
 * `null` en el primer fotograma, que no tiene nada pendiente.
 */
export function fotogramaDeQuienPasea(
  arena: Arena,
  e: EstadoDelPaseo,
  dt: number,
  teclas: Teclas,
  fuera: MandosDeFuera,
  golpesPedidos: number,
  golpesVistos: number | null,
  caido: boolean,
  alDarUnTic?: (entrada: EntradaDelTic, sitio: Andante) => void,
): FotogramaDeQuienPasea {
  if (caido) return { paseo: e, golpesVistos: golpesPedidos };
  const vistos = golpesVistos ?? golpesPedidos;
  const mandos = mandosDelFotograma(teclas, fuera, golpesPedidos > vistos);
  const paseo = fotogramaDelPaseo(arena, e, dt, mandos, alDarUnTic);
  return { paseo, golpesVistos: golpesVistosTras(golpesPedidos, vistos, paseo.tic !== e.tic) };
}

/** Un rumbo en radianes, llevado a (−π, π] como los guarda `girar`. */
function enUnaVuelta(r: number): number {
  let v = r % (Math.PI * 2);
  if (v > Math.PI) v -= Math.PI * 2;
  if (v <= -Math.PI) v += Math.PI * 2;
  return v;
}

/**
 * LA COSTURA (b): poner a quien pasea en un sitio, sin pintar cómo llegó. Ver la cabecera.
 *
 * Con `rumbo` (en radianes), mirando además hacia ahí: es lo que pide el `renace` de la refriega,
 * que pone a quien cayó en su sitio de nacer Y hacia dónde tiene que mirar. Un `corrige` no lo da:
 * corrige dónde se está, y hacia dónde se mira sigue siendo cosa de quien pasea.
 */
export function corregirElPaseo(e: EstadoDelPaseo, sitio: Andante, rumbo?: number): EstadoDelPaseo {
  if (rumbo === undefined || !Number.isFinite(rumbo)) return { ...e, antes: sitio, ahora: sitio };
  return { ...e, antes: sitio, ahora: sitio, rumbo: enUnaVuelta(rumbo) };
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
