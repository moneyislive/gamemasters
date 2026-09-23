/**
 * EL MUNDO DE RIBERAS: por dónde se anda en el delta, dónde se vadea y con qué se choca.
 *
 * ═══ DOS CAPAS, Y AQUÍ SÓLO ESTÁ UNA ═══
 *
 * El mundo con el que se choca tiene dos capas con estatutos distintos, y confundirlas es la
 * forma de que el servidor y el aparato dejen de estar de acuerdo:
 *
 *   · LA ESTRUCTURA es VERDAD. Sale de lo que saben las reglas y viaja en la vista pública: qué
 *     hexágono es tierra, dónde hay chozas y torres, dónde está el estiaje. La derivan igual el
 *     servidor y el aparato, y es lo que el servidor usará en Boots on Board para validar dónde
 *     dice estar cada uno. Por eso es pura y no lleva ni un seno (`verify:pureza`).
 *   · EL ADORNO es PRESENTACIÓN: el relieve, la forma exacta de la orilla, los ríos, los árboles,
 *     el caserío del paisaje, los barcos. Sale de `escenas/` con ruido y trigonometría y cambia
 *     con la semilla del paisaje, que el servidor ni conoce. No entra aquí.
 *
 * Una consecuencia que se asume y se dice: dentro de una comarca TODO es firme, también el río
 * que la escena pinta por medio. El río no es de las reglas; si un día lo fuera, entraría por la
 * vista como entra el estiaje, no por aquí.
 *
 * ═══ LA CORRESPONDENCIA HEXÁGONO → MUNDO ES LA DE LA ESCENA, Y NO OTRA PARECIDA ═══
 *
 * Un mundo que no cae EXACTAMENTE bajo lo que se pinta es un paseante que choca con aire y
 * atraviesa casas. Así que la cuenta no se inventa: se copia de donde la escena la hace.
 *
 *   · EL TAMAÑO. El radio de una comarca es `RADIO_DE_COMARCA` de `escenas/escala.ts:145`: doce
 *     teselas de radio `(2/√3) · (2 · 2,543 / 0,93)`, o sea 75,778. Va escrito como literal porque
 *     `shared/` no puede importar de `escenas/`, y `verify:riberas-mundo` lo compara bit a bit.
 *   · LA ORIENTACIÓN Y EL ORIGEN. Punta hacia arriba y la comarca (0,0) en el origen: los centros
 *     y los vértices salen de `centroDeHex` y `puntoDeVertice` de `mecanicas/malla-hexagonal.ts`,
 *     que son LAS MISMAS funciones que llama la escena (`delta.tsx:4247`, `escenas/sitios.ts`) con
 *     el mismo radio. `x = R·√3·(q + r/2)`, `y = 1,5·R·r`.
 *   · LOS EJES. La escena tumba el plano de la malla con `alMundo(p, h) = [p.x, h, p.y]`
 *     (`delta.tsx:390`, y lo mismo al plantar cada tesela en `delta.tsx:4120`): la `y` de la
 *     malla es la `z` del mundo. Y `<Delta>` se monta directamente en el `<Canvas>`, sin ningún
 *     grupo que lo mueva o lo gire. O sea que `r` crece hacia la z POSITIVA —el sur del paseante—
 *     y, como la casilla `y` de `mundo.ts` crece hacia la z NEGATIVA, la comarca (q, r) cae en las
 *     casillas de `y ≈ −18·r`. Dos convenios en el mismo tablero se ven como un mundo del revés
 *     sin un solo error; el comprobador cruza los centros y los vértices con los de la escena.
 *
 * ═══ LA TIERRA SE PRUEBA CON SEMIPLANOS, Y EL VADO CON LA MISMA CUENTA ═══
 *
 * Una casilla es de una comarca si su centro cae dentro del hexágono: con la punta hacia arriba,
 * `|dx| ≤ a` y `(|dx| + √3·|dz|)/2 ≤ a`, con `a` la apotema. Lo que sobra de la segunda
 * desigualdad —el ENSANCHE— dice cuánto habría que agrandar la apotema para que el punto
 * entrara, y el vado es exactamente eso: el hexágono agrandado. Sin raíces y sin ángulos, y la
 * misma cuenta decide la tierra y el agua, así que no pueden discrepar entre ellas.
 *
 * ═══ EL VADO MIDE CUATRO APOTEMAS DE TESELA, Y NO ES A OJO ═══
 *
 * La costa que PINTA la escena no es el borde del hexágono. Está hecha de teselas, y además
 * `crearRelieve` le añade un DELANTAL de siete teselas en cada vértice del borde
 * (`relieve.ts:826-910`) para que haya suelo donde se construye. Medido sobre la escena de
 * verdad —las 2.848 teselas de un tablero de radio dos—:
 *
 *   · lo pintado llega hasta 16,41 de ensanche POR FUERA de las comarcas: tres apotemas de tesela
 *     exactas, que es el delantal;
 *   · y el mar pintado entra hasta 5,46 POR DENTRO, en los dientes de la costa.
 *
 * Lo primero es lo que manda. Un vado más estrecho declararía honda una playa que se ve, y el
 * paseante se quedaría clavado en ella: es el fallo del mundo visto por debajo, del lado del agua.
 * A las tres apotemas se suma lo que se mueve una casilla al redondear —`(1+√3)/4` de su lado en
 * ensanche, 4,31 con el lado de abajo— y salen 20,72. Se declaran CUATRO apotemas, 21,875.
 *
 * Y dónde cae eso respecto de lo que se ve somero: como la orilla pintada va de 5,46 por dentro a
 * 16,41 por fuera del borde de la comarca, el borde del vado queda entre 5,5 y 27,3 de ella. La
 * escena pinta el mar QUIETO hasta 2,5 radios de tesela (15,79) de su costa
 * (`SOMBRA_DEL_TABLERO`, `escenas/marea.ts:234`) y la ola crece hasta 35,4: casi todo el vado es
 * ese agua quieta, y sólo en el peor diente de la costa llega a donde la ola ya levanta algo más
 * de la mitad. Más estrecho no puede ser; más ancho metería el vado en el oleaje por todas partes.
 *
 * Lo que queda FUERA, y se ve: los barcos. La escena fondea alguno a 9,6 de ensanche del borde
 * (medido en cuarenta semillas), dentro del vado. Un barco es adorno; se vadea a su lado.
 *
 * ═══ LA CASILLA MIDE UN RADIO DE TESELA ═══
 *
 * `LADO_DE_CASILLA` = 6,315, un doceavo del radio de una comarca. Lo deciden dos medidas:
 *
 *   · LA PRECISIÓN DEL BORDE. Una casilla se juzga por su centro, así que el borde declarado se
 *     aparta del hexágono hasta `(1+√3)/4` de lado en ensanche: 4,31. La orilla pintada ya se
 *     aparta 5,46 hacia dentro con sus dientes; ir más fino sería precisión que la costa que se ve
 *     no tiene. Un octavo del radio (9,47) se apartaría 6,47 —más que el diente— y pediría un vado
 *     de 22,9 sólo para cubrir el delantal.
 *   · EL PESO. Diecinueve comarcas son 7.107 casillas firmes y 1.304 de vado: 137 kB canonizado
 *     con las cajas de una mesa llena (lo mide y lo imprime `verify:riberas-mundo`). Un
 *     dieciseisavo del radio pasaría de 15.000 casillas —el doble de peso y de tiempo al derivar
 *     en cada revisión— para ganar una precisión que la orilla pintada se come.
 *
 * El mundo no viaja (ver `mundo.ts`): el peso es lo que cuesta DERIVARLO a los dos lados en cada
 * revisión y compararlo en un comprobador, no lo que cuesta el cable.
 *
 * ═══ LO QUE ESTORBA: CHOZAS, TORRES Y EL ESTIAJE. NI CANTILES NI CARRIZALES ═══
 *
 * Una caja por choza y una por torre, en su vértice, MEDIDAS y no supuestas: sobre `tablero.glb`,
 * con `piezasDeAsentamiento` y el giro de cada pieza puesto, en los 54 vértices del tablero (la
 * misma medida que hace `verify:escena` para el radio, aquí como caja alineada con los ejes):
 *
 *   · POBLADO. Las cuatro casas y el pozo llegan a x −12,14…+12,12 y z −11,39…+12,01. Se declara la caja
 *     simétrica, ±12,14 × ±12,02, porque el reparto de las casas gira con la llave del vértice y en
 *     otro vértice el lado largo cae al revés. Vallas, árboles y bandera se quedan fuera: «no
 *     cierran nada, sólo dan vida» (`asentamiento.ts:170`).
 *   · CIUDAD. Muralla, tres torres y castillo: x −12,24…+14,08 y z ±12,19. No es simétrica y no
 *     por descuido: `fortaleza` pone las torres SIEMPRE en las teselas 0, 2 y 4 del anillo, y la del
 *     este asoma 1,84 por fuera de la muralla. La puerta sí gira con la llave, y es adorno: dentro
 *     del recinto no hay nada que hacer a pie.
 *   · EL ESTIAJE. La tienda de la comarca seca, a talla 3 en el centro de su comarca
 *     (`delta.tsx:4572`): ±4,24. Es estructura —la vista dice dónde está— y en la escena es un
 *     objeto sólido. Se mueve con cada siete, y el mundo con él.
 *
 * Y lo que NO estorba, dicho para que nadie lo eche en falta: los TERRENOS. Un cantil o un
 * carrizal son tierra que rinde; el relieve que la escena les levanta —con sus escalones de 5,47—
 * es adorno con semilla, y las reglas no prohíben pisar ninguna comarca. Las VEREDAS tampoco: se
 * anda por ellas. La altura a la que se pinta al paseante la pone la escena con su relieve.
 *
 * ═══ DÓNDE SE NACE: SEIS SITIOS, UNO POR ASIENTO POSIBLE ═══
 *
 * Riberas admite de dos a seis colonos, así que siempre hay seis sitios, y `nace[k]` es del
 * colono k en el orden de la vista (que es el de asiento):
 *
 *   · con algo construido, junto a lo suyo: a 20 de su primera choza —o de su primera torre—,
 *     camino del centro de la comarca vecina que más cerca quede del centro del tablero. Veinte
 *     porque desde un vértice los centros de sus comarcas están en vertical o a treinta grados, y
 *     a esa distancia hasta la caja más ancha (14,08) deja 2,8 de aire con el paseante dentro;
 *   · sin colono o sin nada construido, en la comarca k del primer anillo, camino del centro.
 *
 * Cada sitio se prueba con `sePuedeEstar` sobre la arena de ESTE mismo mundo, en suelo FIRME, y
 * se avanza una casilla cada vez hasta que vale: el estiaje puede estar plantado justo ahí. Se
 * mira al centro del tablero con el rumbo de la tabla de `andar.ts` que más apunta hacia él, sin
 * un solo seno: nacer mirando al mar es un fallo del mundo, no de quien lo pinta.
 */
import {
  centroDeHex,
  DIRECCIONES,
  hexDeLlave,
  hexesDeVertice,
  puntoDeVertice,
} from '../../mecanicas/malla-hexagonal';
import type { Hex, LlaveDeVertice } from '../../mecanicas/malla-hexagonal';
import { arenaDe, FIRME, sePuedeEstar, sueloEn } from '../../mecanicas/mundo';
import type { Arena, Casilla, Cuerpo, MundoDeclarado, Sitio } from '../../mecanicas/mundo';
import { COSENO, radianesDelRumbo, RADIO_DEL_PASEANTE, RUMBOS, SENO } from '../../mecanicas/andar';
import { UNO } from '../../mecanicas/fijo';

/* ─── LAS MEDIDAS DE LA ESCENA, ESCRITAS ─────────────────────────────────── */

/** √3, escrita. `verify:riberas-mundo` exige que sea `Math.sqrt(3)` bit a bit. */
export const RAIZ_DE_TRES = 1.7320508075688772;

/**
 * El radio de una comarca en el mundo: de su centro a cualquiera de sus seis puntas.
 * Es `RADIO_DE_COMARCA` de `escenas/escala.ts:145`, escrito aquí porque `shared/` no puede
 * importar de `escenas/`; el comprobador lo compara bit a bit con el de la escena.
 */
export const RADIO_DE_COMARCA_EN_EL_MUNDO = 75.77815404124999;

/** La apotema de una comarca: de su centro a cualquiera de sus seis lados, `R·√3/2`. */
export const APOTEMA_DE_COMARCA = 65.62580645161292;

/** El radio de una tesela del suelo de la escena: `RADIO_DE_TESELA`, `escenas/escala.ts:121`. */
export const RADIO_DE_TESELA_EN_EL_MUNDO = 6.314846170104166;

/**
 * La apotema de una tesela, que es exactamente la escala del pack (`ESCALA_DEL_PACK`,
 * `escenas/escala.ts:113`): la tesela del pack tiene apotema 1. Es la unidad en la que se mide
 * cuánto se sale la orilla pintada.
 */
export const APOTEMA_DE_TESELA = 5.468817204301075;

/** El lado de una casilla del mundo: un radio de tesela. Ver la cabecera. */
export const LADO_DE_CASILLA = RADIO_DE_TESELA_EN_EL_MUNDO;

/**
 * Cuánto se ensancha la apotema de una comarca para declarar su VADO: cuatro apotemas de tesela.
 * Tres las pide el delantal que la escena pinta por fuera; la cuarta cubre el redondeo a casillas.
 */
export const ANCHO_DEL_VADO = 4 * APOTEMA_DE_TESELA;

/**
 * Lo que se tolera en la raya del hexágono, y por qué hace falta.
 *
 * Con la casilla de un radio de tesela, las puntas de arriba y de abajo de algunas comarcas caen
 * EXACTAMENTE en un centro de casilla. Ahí el ensanche vale cero en aritmética exacta y ± un
 * último bit en coma flotante, y sin esta holgura una casilla en mitad de la tierra —la de un
 * vértice interior, compartido por tres comarcas— podría salir de vado por un bit. Es la misma
 * cuenta en todos los motores; lo que se evita es que sea arbitraria.
 */
const TOLERANCIA = 1e-9;

/** Cuántos sitios de nacer se declaran: tantos como colonos admite Riberas (de dos a seis). */
export const NACIMIENTOS = 6;

/** A qué distancia de su choza nace un colono. Ver la cabecera. */
export const LEJOS_DE_SU_CHOZA = 20;

/* ─── LAS CAJAS DE LO QUE ESTORBA, MEDIDAS ───────────────────────────────── */

/** Una caja alineada con los ejes, relativa al punto donde se planta. En unidades del mundo. */
export interface CajaRelativa {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
}

/** Las cuatro casas y el pozo de un poblado, en los 54 vértices, redondeado hacia fuera. */
export const CAJA_DEL_POBLADO: CajaRelativa = { x0: -12.14, z0: -12.02, x1: 12.14, z1: 12.02 };

/** La muralla, las tres torres y el castillo de una ciudad. La torre del este asoma. */
export const CAJA_DE_LA_CIUDAD: CajaRelativa = { x0: -12.24, z0: -12.19, x1: 14.08, z1: 12.19 };

/** La tienda del estiaje, a talla 3, en el centro de su comarca. */
export const CAJA_DEL_ESTIAJE: CajaRelativa = { x0: -4.24, z0: -4.24, x1: 4.24, z1: 4.24 };

/* ─── LA GEOMETRÍA: DE LAS LLAVES DEL JUEGO AL SUELO DEL MUNDO ───────────── */

/** Un punto del suelo del mundo. `z` y no `y`: la altura la pone la escena. */
export interface PuntoDelMundo {
  readonly x: number;
  readonly z: number;
}

/** El centro de una comarca en el mundo, con la cuenta de la escena y su radio. */
export function centroEnElMundo(h: Hex): PuntoDelMundo {
  const p = centroDeHex(h, RADIO_DE_COMARCA_EN_EL_MUNDO);
  return { x: p.x, z: p.y };
}

/** Dónde cae un vértice en el mundo: la media de sus tres centros, como en la escena. */
export function verticeEnElMundo(v: LlaveDeVertice): PuntoDelMundo {
  const p = puntoDeVertice(v, RADIO_DE_COMARCA_EN_EL_MUNDO);
  return { x: p.x, z: p.y };
}

/**
 * CUÁNTO HABRÍA QUE ENSANCHAR LA APOTEMA DE UNA COMARCA PARA QUE ESTE PUNTO ENTRARA.
 *
 * Cero o menos es dentro. Son los seis semiplanos de un hexágono con la punta hacia arriba,
 * doblados sobre sí mismos con `Math.abs`: los dos lados verticales (`|dx| ≤ a`) y los cuatro
 * inclinados (`(|dx| + √3·|dz|)/2 ≤ a`).
 */
export function ensancheDeComarca(x: number, z: number, centro: PuntoDelMundo): number {
  const dx = Math.abs(x - centro.x);
  const dz = Math.abs(z - centro.z);
  const deLado = dx - APOTEMA_DE_COMARCA;
  const deSesgo = (dx + RAIZ_DE_TRES * dz) / 2 - APOTEMA_DE_COMARCA;
  return deLado > deSesgo ? deLado : deSesgo;
}

/**
 * EL RUMBO DE LA TABLA QUE MÁS APUNTA DE UN PUNTO A OTRO, de 0 a 255.
 *
 * La dirección del rumbo `r` es `(SENO[r], −COSENO[r])`, y se busca la de mayor producto escalar
 * con el camino. Doscientas cincuenta y seis multiplicaciones y ni un ángulo: el error es de
 * medio rumbo como mucho, 0,7 grados. Sin camino —el mismo punto—, el norte.
 */
export function rumboHacia(desde: PuntoDelMundo, hacia: PuntoDelMundo): number {
  const dx = hacia.x - desde.x;
  const dz = hacia.z - desde.z;
  if (dx === 0 && dz === 0) return 0;
  let mejor = 0;
  let cuanto = -Infinity;
  for (let r = 0; r < RUMBOS; r++) {
    const apunta = (SENO[r] as number) * dx - (COSENO[r] as number) * dz;
    if (apunta > cuanto) {
      cuanto = apunta;
      mejor = r;
    }
  }
  return mejor;
}

/* ─── LA VISTA, LEÍDA SIN CREÉRSELA ──────────────────────────────────────── */

/** Lo único de la vista que hace falta aquí: todo público. */
interface LoQueSeVe {
  islas: Hex[];
  colonos: { chozas: LlaveDeVertice[]; torres: LlaveDeVertice[] }[];
  estiaje: Hex | null;
}

function esHex(h: unknown): h is Hex {
  if (typeof h !== 'object' || h === null) return false;
  const { q, r } = h as { q?: unknown; r?: unknown };
  return typeof q === 'number' && typeof r === 'number' && Number.isInteger(q) && Number.isInteger(r);
}

/**
 * Las llaves de vértice de una lista, y sólo las que lo son de verdad: tres hexágonos enteros.
 * La vista llega por la red al aparato; una llave torcida se salta en vez de plantar una caja en
 * `NaN`, que no choca con nada y no avisa.
 */
function verticesDeLaLista(lista: unknown): LlaveDeVertice[] {
  const salida: LlaveDeVertice[] = [];
  if (!Array.isArray(lista)) return salida;
  for (const v of lista) {
    if (typeof v !== 'string' || v.slice(0, 2) !== 'v:') continue;
    const hexes = hexesDeVertice(v);
    if (hexes.length !== 3) continue;
    let bien = true;
    for (const h of hexes) if (!esHex(h)) bien = false;
    if (bien) salida.push(v);
  }
  return salida;
}

function leerLaVista(vista: unknown): LoQueSeVe | null {
  if (typeof vista !== 'object' || vista === null) return null;
  const v = vista as { desde?: unknown; islas?: unknown; colonos?: unknown; estiaje?: unknown };
  if (v.desde !== 'riberas' || !Array.isArray(v.islas) || !Array.isArray(v.colonos)) return null;
  const islas: Hex[] = [];
  for (const i of v.islas) {
    const hex = typeof i === 'object' && i !== null ? (i as { hex?: unknown }).hex : undefined;
    if (esHex(hex)) islas.push({ q: hex.q, r: hex.r });
  }
  const colonos: LoQueSeVe['colonos'] = [];
  for (const c of v.colonos) {
    const suyo = typeof c === 'object' && c !== null ? (c as { chozas?: unknown; torres?: unknown }) : {};
    colonos.push({ chozas: verticesDeLaLista(suyo.chozas), torres: verticesDeLaLista(suyo.torres) });
  }
  let estiaje: Hex | null = null;
  if (typeof v.estiaje === 'string') {
    const h = hexDeLlave(v.estiaje);
    if (esHex(h)) estiaje = h;
  }
  return { islas, colonos, estiaje };
}

/* ─── EL MUNDO ───────────────────────────────────────────────────────────── */

function cajaEn(ancla: PuntoDelMundo, caja: CajaRelativa): Cuerpo {
  return { x0: ancla.x + caja.x0, z0: ancla.z + caja.z0, x1: ancla.x + caja.x1, z1: ancla.z + caja.z1 };
}

/** Un número del mundo a coma fija, con la MISMA cuenta que `arenaDe`. */
function aFijo(x: number): number {
  return Math.round(x * UNO) | 0;
}

/** ¿Se puede nacer aquí? Suelo firme —en el agua no se nace— y sin nada encima. */
function valeParaNacer(arena: Arena, p: PuntoDelMundo): boolean {
  const x = aFijo(p.x);
  const z = aFijo(p.z);
  return sueloEn(arena, x, z) === FIRME && sePuedeEstar(arena, x, z, RADIO_DEL_PASEANTE);
}

/**
 * EL MUNDO DE UNA PARTIDA DE RIBERAS, a partir de su vista pública. Función pura.
 *
 * Vale cualquier vista —la de un asiento, la de otro o la del espectador— porque sólo lee lo
 * público, y las tres dan el mismo mundo. Una vista que no es de Riberas, o una mesa que todavía
 * se está reuniendo y no tiene delta, dan un mundo vacío: sin suelo no se recorre.
 */
export function mundoDeRiberas(vista: unknown): MundoDeclarado {
  const vacio: MundoDeclarado = { lado: LADO_DE_CASILLA, pisables: [], vados: [], cuerpos: [], nace: [] };
  const leida = leerLaVista(vista);
  if (leida === null || leida.islas.length === 0) return vacio;
  const L = LADO_DE_CASILLA;
  const centros = leida.islas.map(centroEnElMundo);

  /* ── La rejilla que envuelve las comarcas con su vado ─────────────────── */
  /*
   * Hasta dónde llega una comarca ensanchada: `a + W` en x, y su radio `(a + W)·2/√3` en z. Se
   * mira una casilla más por cada lado: lo que sobra sale con un ensanche mayor que el vado y
   * no se declara.
   */
  const alcanceX = APOTEMA_DE_COMARCA + ANCHO_DEL_VADO;
  const alcanceZ = ((APOTEMA_DE_COMARCA + ANCHO_DEL_VADO) * 2) / RAIZ_DE_TRES;
  let desdeI = Infinity;
  let hastaI = -Infinity;
  let desdeJ = Infinity;
  let hastaJ = -Infinity;
  for (const c of centros) {
    desdeI = Math.min(desdeI, Math.floor((c.x - alcanceX) / L) - 1);
    hastaI = Math.max(hastaI, Math.ceil((c.x + alcanceX) / L) + 1);
    /* La casilla `y` crece hacia la z negativa: `j = −z / L`. */
    desdeJ = Math.min(desdeJ, Math.floor((-c.z - alcanceZ) / L) - 1);
    hastaJ = Math.max(hastaJ, Math.ceil((-c.z + alcanceZ) / L) + 1);
  }
  const ancho = hastaI - desdeI + 1;
  const fondo = hastaJ - desdeJ + 1;

  /*
   * EL MENOR ENSANCHE DE CADA CASILLA, recorriendo cada comarca sólo por su rectángulo. Es un
   * mínimo, así que el orden de las islas en la vista no cambia nada.
   */
  const ensanche = new Float64Array(ancho * fondo);
  for (let k = 0; k < ensanche.length; k++) ensanche[k] = Infinity;
  for (const c of centros) {
    const i0 = Math.floor((c.x - alcanceX) / L) - 1;
    const i1 = Math.ceil((c.x + alcanceX) / L) + 1;
    const j0 = Math.floor((-c.z - alcanceZ) / L) - 1;
    const j1 = Math.ceil((-c.z + alcanceZ) / L) + 1;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const e = ensancheDeComarca(i * L, -j * L, c);
        const k = (j - desdeJ) * ancho + (i - desdeI);
        if (e < (ensanche[k] as number)) ensanche[k] = e;
      }
    }
  }

  /* ── Firme dentro, vado en la franja, y lo hondo no se escribe ─────────── */
  const pisables: Casilla[] = [];
  const vados: Casilla[] = [];
  for (let j = desdeJ; j <= hastaJ; j++) {
    for (let i = desdeI; i <= hastaI; i++) {
      const e = ensanche[(j - desdeJ) * ancho + (i - desdeI)] as number;
      if (e <= TOLERANCIA) pisables.push({ x: i, y: j });
      else if (e <= ANCHO_DEL_VADO) vados.push({ x: i, y: j });
    }
  }

  /* ── Lo que estorba: chozas, torres y el estiaje, por este orden ──────── */
  const cuerpos: Cuerpo[] = [];
  for (const colono of leida.colonos) {
    for (const v of colono.chozas) cuerpos.push(cajaEn(verticeEnElMundo(v), CAJA_DEL_POBLADO));
    for (const v of colono.torres) cuerpos.push(cajaEn(verticeEnElMundo(v), CAJA_DE_LA_CIUDAD));
  }
  if (leida.estiaje !== null) cuerpos.push(cajaEn(centroEnElMundo(leida.estiaje), CAJA_DEL_ESTIAJE));

  return {
    lado: L,
    pisables,
    vados,
    cuerpos,
    nace: dondeSeNace(leida, centros, { lado: L, pisables, vados, cuerpos, nace: [] }),
  };
}

/* ─── DÓNDE SE NACE ──────────────────────────────────────────────────────── */

function esIsla(islas: readonly Hex[], h: Hex): boolean {
  for (const i of islas) if (i.q === h.q && i.r === h.r) return true;
  return false;
}

/**
 * LOS SEIS SITIOS, sobre la arena del mundo ya declarado. Ver la cabecera.
 *
 * Si ningún candidato vale —un tablero raro, con el estiaje y una choza tapándolo todo—, se coge
 * la primera casilla firme en la que se pueda estar, en el orden de `pisables`. Un sitio feo es
 * mejor que un sitio que falta: sin él, quien entra no tiene dónde aparecer.
 */
function dondeSeNace(leida: LoQueSeVe, centros: readonly PuntoDelMundo[], sinNacer: MundoDeclarado): Sitio[] {
  const arena = arenaDe(sinNacer);
  const L = LADO_DE_CASILLA;
  let sumaX = 0;
  let sumaZ = 0;
  for (const c of centros) {
    sumaX += c.x;
    sumaZ += c.z;
  }
  const medio: PuntoDelMundo = { x: sumaX / centros.length, z: sumaZ / centros.length };

  const sitios: Sitio[] = [];
  for (let k = 0; k < NACIMIENTOS; k++) {
    const candidatos: PuntoDelMundo[] = [];
    const colono = leida.colonos[k];
    const suyo = colono === undefined ? undefined : (colono.chozas[0] ?? colono.torres[0]);
    if (suyo !== undefined) {
      /* Junto a lo suyo: hacia la comarca vecina más cercana al centro del tablero. */
      const v = verticeEnElMundo(suyo);
      let mejor: PuntoDelMundo | null = null;
      let distancia = Infinity;
      for (const h of hexesDeVertice(suyo)) {
        if (!esIsla(leida.islas, h)) continue;
        const c = centroEnElMundo(h);
        const d = (c.x - medio.x) * (c.x - medio.x) + (c.z - medio.z) * (c.z - medio.z);
        if (d < distancia) {
          distancia = d;
          mejor = c;
        }
      }
      if (mejor !== null) {
        /* Del vértice al centro hay un radio justo: el vector dividido por él ya es unitario. */
        const ux = (mejor.x - v.x) / RADIO_DE_COMARCA_EN_EL_MUNDO;
        const uz = (mejor.z - v.z) / RADIO_DE_COMARCA_EN_EL_MUNDO;
        for (let d = LEJOS_DE_SU_CHOZA; d < RADIO_DE_COMARCA_EN_EL_MUNDO - L; d += L) {
          candidatos.push({ x: v.x + ux * d, z: v.z + uz * d });
        }
      }
    }
    /* Sin nada suyo, o si lo suyo no dejó sitio: la comarca k del primer anillo, hacia el centro. */
    const anillo = DIRECCIONES[k % DIRECCIONES.length] as Hex;
    const deReserva = esIsla(leida.islas, anillo) ? anillo : (leida.islas[k % leida.islas.length] as Hex);
    const c = centroEnElMundo(deReserva);
    for (let paso = 0; paso < 16; paso++) {
      candidatos.push({ x: c.x + ((medio.x - c.x) * paso) / 16, z: c.z + ((medio.z - c.z) * paso) / 16 });
    }

    let elegido: PuntoDelMundo | null = null;
    for (const p of candidatos) {
      if (valeParaNacer(arena, p)) {
        elegido = p;
        break;
      }
    }
    if (elegido === null) {
      for (const casilla of sinNacer.pisables) {
        const p = { x: casilla.x * L, z: -casilla.y * L };
        if (valeParaNacer(arena, p)) {
          elegido = p;
          break;
        }
      }
    }
    if (elegido === null) continue;
    sitios.push({ x: elegido.x, z: elegido.z, rumbo: radianesDelRumbo(rumboHacia(elegido, medio)) });
  }
  return sitios;
}
