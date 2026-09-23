/**
 * RIBERAS A PIE: la aritmética de andar por el delta, sin `three` y sin React.
 *
 * ═══ QUÉ HAY AQUÍ, Y POR QUÉ NO ESTÁ DENTRO DEL COMPONENTE ═══
 *
 * El paseo es el común (`escenas/paseo/`): los tics, los choques con `mundoDeRiberas`, las
 * cámaras de a pie y la marioneta. Lo único que Riberas le tiene que contar es lo que sólo sabe
 * este delta: de qué sitio nace cada uno, A QUÉ ALTURA SE PINTA a quien pasea y cómo se ve el
 * mundo a ras de suelo. Son cuentas, y viven aquí para que `verify:escena` las mida en Node con
 * un relieve de verdad; dentro de un `useFrame` no se podrían medir de ninguna manera. Es la
 * misma frontera que `acercar.ts` y `camara.ts` con los clientes.
 *
 * ═══ LA ALTURA NO DECIDE NADA: SIGUE A LO QUE LA ESCENA PINTA ═══
 *
 * Dónde se puede estar lo contesta la arena, que es plana (`shared/mecanicas/mundo.ts`). La
 * altura sólo dice dónde se pinta, y por eso sale del relieve que la escena ya dibuja y no de
 * la estructura: de la tesela que hay bajo los pies.
 *
 *   · TIERRA: la cara de arriba de su tesela (`Subtesela.altura`, que es lo mismo que
 *     `relieve.alturaEn`). En una RAMPA, lo que sube la rampa del pack, medido con rayos sobre
 *     `tablero.glb`: la cara de arriba sube en línea recta desde su canto bajo hasta el CENTRO de
 *     la tesela, y de ahí al canto alto va llana un escalón más arriba. Sin esto se andaba medio
 *     cuerpo hundido en la cuesta y se subía de golpe al pasar a la terraza.
 *   · AGUA: la lámina que se ve MENOS LA CINTURA de quien pasea. Es la decisión de Miguel —«se
 *     anda por la arena y por el agua somera, con el avatar metido en el agua»—, y el agua es la
 *     que PINTA la escena: el mar de fuera, a `LAMINA` (−1,09: una tesela de agua del pack tiene
 *     su cara a −0,2 del pack, y el disco de mar va a esa misma cota), y los ríos y lagos, a su
 *     nivel más la misma lámina.
 *
 * ═══ POR QUÉ SE HUNDE DONDE SE PINTA AGUA Y NO DONDE EL MUNDO DICE «VADO» ═══
 *
 * Porque no son lo mismo, y la diferencia se vería en todas las orillas. Medido por
 * `verify:escena` sobre un delta de diecinueve comarcas con el relieve de semilla 0 (y lo mismo,
 * con otros números, en una partida de cuatro jugada por el árbitro hasta media partida):
 *
 *   · de las 1.304 casillas de VADO, 954 caen en agua pintada y 350 en TIERRA pintada: la
 *     estructura agranda la comarca cuatro apotemas para que la playa que se pinta por fuera
 *     sea pisable (`riberas-mundo.ts`), así que un cuarto largo del vado es arena y teselas de
 *     costa. Hundir ahí por ser «vado» es andar enterrado en la arena hasta la cintura;
 *   · y de las 7.107 FIRMES, 351 caen en agua pintada: los ríos y los lagos que la escena pinta
 *     dentro de las comarcas —firmes para el mundo, que no los sabe— y los dientes de la costa.
 *     Pintar ahí a la altura de la tierra es andar un metro por encima del agua.
 *
 * El vado sigue decidiendo lo que le toca decidir —la mitad del paso, en `mundo.ts`—, y esto
 * sólo decide cómo se ve. Que la marioneta vaya hundida en el agua pintada y derecha en la
 * tierra pintada, en el vado y fuera de él, lo vigila `verify:escena` con seis relieves.
 *
 * ═══ LA CINTURA DE UN AVENTURERO, MEDIDA EN SU ESQUELETO ═══
 *
 * Los seis aventureros comparten el esqueleto `Rig_Medium` al milímetro (lo vigila
 * `verify:aventureros`), así que la cintura es la misma para todos aunque midan de 2,17 a 2,65
 * por el sombrero. Leídas sus articulaciones en la pose de reposo —de las matrices de ligadura de
 * la piel, que es donde está cada hueso de verdad—: caderas a 0,406, el nacimiento de las
 * piernas a 0,519, la espalda a 0,598, el pecho a 0,973 y el cuello a 1,241. Son figuras de
 * cabeza grande: la cabeza se lleva la mitad de la altura. La cintura —el cinto, entre donde
 * nacen las piernas y donde empieza la espalda— queda a 0,56, y a esa profundidad bajo la lámina
 * se pintan los pies: el agua tapa las piernas y deja el cuerpo entero y la cabeza fuera, que es
 * «metido en el agua» y no «ahogándose». `verify:escena` vuelve a leerlo del `.glb`.
 *
 * ═══ Y A PIE, NIEBLA DE PIE ═══
 *
 * La niebla de la mesa se mide desde un ojo a cientos de unidades del suelo, y a pie no la mueve
 * nadie: se quedaría la última que se puso mirando la mesa. A ras de suelo el disco de mar —seis
 * alcances de radio, 2.030 (`presupuesto-del-delta.ts`)— enseña su canto contra el cielo a 1.660
 * unidades como poco desde lo más lejos que se anda, y una niebla que no cierre antes lo deja
 * ver como una raya en el horizonte. A pie la niebla empieza a un alcance (338) y cierra a tres
 * (1.015): el delta entero, de canto a canto, queda dentro y velado, y el canto del mar no se ve
 * nunca. `verify:escena` mide las dos cosas contra el mundo de verdad.
 *
 * No está para ahorrar, y se ha medido: con la cámara de hombro en los seis sitios de nacer,
 * mirando al centro, caen en el tronco 12,2 de las 19 comarcas de media —desde la mesa caen las
 * 19—, y bajar el fondo de la cámara de 5.413 a 507 no quita ni una: el delta entero mide 677 de
 * canto a canto. Andar pinta un tercio menos de mundo que mirar la mesa; el ahorro lo pone el
 * tronco, no la niebla.
 */
import { esVistaQueSePinta, indiceDelColono } from '../shared/arcade/juegos/riberas-en-tres';
import type { MundoDeclarado, Sitio } from '../shared/mecanicas/mundo';
import { CAUCE, CUERPO, piezaDeOrilla } from './aguas';
import { ESCALA_DEL_PACK, ESCALON, LAMINA, RADIO_DE_TESELA } from './escala';
import { MANDO_DE_RECOGER } from './mesa';
import { ALCANCE_DEL_DELTA } from './presupuesto-del-delta';
import { hexDePunto } from './relieve';
import type { Relieve, Subtesela } from './relieve';

/* ─── Desde dónde se mira ────────────────────────────────────────────────── */

/**
 * DESDE DÓNDE SE MIRA EL DELTA. Las mismas tres que Las Lindes (`ModoDeCamaraDeLasLindes`).
 *
 * En la MESA la cámara es del cliente —su `Ojo` en la app, su `CamaraAerea` en el escritorio— y
 * la escena no la toca: es la de siempre. A pie la pone el paseo común, y el asiento dice quién
 * pasea: de él salen el sitio de nacer y la figura.
 */
export type ModoDeCamaraDelDelta =
  /** Desde el aire, como quien mira la mesa. La de siempre. */
  | { readonly modo: 'mesa' }
  /** Detrás del hombro de quien pasea. */
  | { readonly modo: 'hombro'; readonly asiento: string }
  /** Desde su cara. */
  | { readonly modo: 'ojos'; readonly asiento: string };

/* ─── Las medidas ────────────────────────────────────────────────────────── */

/**
 * A QUÉ ALTURA SOBRE LOS PIES TIENE UN AVENTURERO LA CINTURA, en unidades del mundo. Medido en
 * el esqueleto: ver la cabecera. Es lo que se hunden los pies bajo la lámina.
 */
export const CINTURA_DEL_AVENTURERO = 0.56;

/**
 * DÓNDE EMPIEZA Y DÓNDE CIERRA LA NIEBLA A PIE: a uno y a tres alcances del delta. Ver la
 * cabecera: es para que el canto del disco de mar no se vea a ras de suelo, no para ahorrar.
 */
export const NIEBLA_A_PIE = { cerca: ALCANCE_DEL_DELTA, lejos: ALCANCE_DEL_DELTA * 3 } as const;

/**
 * ═══ DÓNDE VAN LOS MANDOS DE CÁMARA SOBRE EL LIENZO DEL ESCRITORIO ═══
 *
 * En el lienzo de Riberas no queda esquina libre: arriba a la izquierda llega la carta de arriba
 * de la mano del mazo, en el centro de arriba está la cinta con el pregón colgando, abajo es de
 * la barra y arriba a la derecha están «Ver el tablero entero» y «Recoger la mesa», apilados con
 * `MANDO_DE_RECOGER`. Así que la cámara se apila DEBAJO de esos dos, en la misma columna y con
 * el mismo paso: el primer mando (bajar a andar, o volver a la mesa) está siempre, y el segundo
 * (hombro u ojos) sólo a pie, que es cuando la mesa está recogida y abajo no hay asa ninguna.
 *
 * Los números salen de `MANDO_DE_RECOGER` y no se escriben otra vez: `verify:escena` mide el
 * primero contra la silueta proyectada de todas las asas en los quince lienzos, y
 * `verify:escritorio` afirma que la hoja de estilo dice lo mismo. Es cromo de la Sala, y la app
 * no lo usa: allí las cámaras van debajo del lienzo.
 */
export const MANDOS_DE_LA_CAMARA = {
  lado: MANDO_DE_RECOGER.lado,
  margen: MANDO_DE_RECOGER.margen,
  /** Desde el canto de arriba hasta el primero: los dos mandos de encima con su aire. */
  arriba: MANDO_DE_RECOGER.margen + 2 * MANDO_DE_RECOGER.bajoElOtroMando,
  /** Y lo que baja el segundo por debajo del primero: el mismo paso de la columna. */
  bajoElPrimero: MANDO_DE_RECOGER.bajoElOtroMando,
} as const;

/* ─── El suelo que se pinta ──────────────────────────────────────────────── */

/**
 * EL SUELO PINTADO DEL DELTA: cada tesela que la escena dibuja, por su llave.
 *
 * Se monta UNA vez por relieve —son dos mil ochocientas— y se consulta en cada fotograma: dónde
 * cae un punto lo dice `hexDePunto`, la misma función con la que el relieve reparte el suelo.
 */
export type SueloPintado = ReadonlyMap<string, Subtesela>;

const llaveDe = (q: number, r: number): string => `${String(q)},${String(r)}`;

export function sueloPintadoDe(relieve: Relieve): SueloPintado {
  const suelo = new Map<string, Subtesela>();
  for (const t of relieve.todas()) suelo.set(llaveDe(t.sub.q, t.sub.r), t);
  return suelo;
}

/** ¿La escena pinta AGUA en esta tesela? Río o lago: el mismo criterio con el que elige su pieza. */
function esAgua(t: Subtesela): boolean {
  return t.agua === CAUCE || t.agua === CUERPO;
}

/**
 * ¿La escena pinta aquí la RAMPA del pack? Con el mismo orden de mando que `delta.tsx` al elegir
 * la pieza: el agua y la orilla mandan sobre la rampa, y una tesela de orilla es llana aunque su
 * vecino esté más alto.
 */
export function esRampaPintada(t: Subtesela): boolean {
  return !esAgua(t) && piezaDeOrilla(t.orilla) === null && t.rampa !== null;
}

/**
 * LO QUE SUBE LA RAMPA DEL PACK en un punto de su tesela, de 0 a 1 escalón.
 *
 * La rampa mira a su lado alto con el giro `rampa` (el mismo que le pone `delta.tsx`), y en el
 * pack ese lado es su `+x` local. La cara de arriba, medida: sube en línea recta desde el canto
 * bajo (`x = −1`) hasta el centro (`x = 0`) y sigue llana hasta el canto alto. `x` sale en
 * unidades del pack —la apotema de la tesela es uno—, así que se divide por la escala del pack.
 */
export function subidaDeLaRampa(t: Subtesela, x: number, z: number): number {
  const giro = t.rampa ?? 0;
  const local = ((x - t.centro.x) * Math.cos(giro) - (z - t.centro.y) * Math.sin(giro)) / ESCALA_DEL_PACK;
  return Math.min(1, Math.max(0, 1 + local));
}

/**
 * A QUÉ ALTURA SE PINTAN LOS PIES DE QUIEN PASEA en un punto del delta.
 *
 * Donde la escena no pinta tesela ninguna es el mar de fuera: su lámina menos la cintura. Ver la
 * cabecera para por qué se mira lo pintado y no el vado del mundo.
 */
export function alturaAPie(suelo: SueloPintado, x: number, z: number): number {
  const h = hexDePunto({ x, y: z }, RADIO_DE_TESELA);
  const t = suelo.get(llaveDe(h.q, h.r));
  if (t === undefined) return LAMINA - CINTURA_DEL_AVENTURERO;
  if (esAgua(t)) return t.nivelDelAgua * ESCALON + LAMINA - CINTURA_DEL_AVENTURERO;
  if (esRampaPintada(t)) return t.altura + ESCALON * subidaDeLaRampa(t, x, z);
  return t.altura;
}

/**
 * ¿VA HUNDIDO QUIEN PISA ESTE PUNTO? O sea: ¿se pinta agua bajo sus pies? Lo usan el comprobador y
 * quien quiera decirlo en pantalla; la altura ya lo lleva dentro.
 */
export function vaHundido(suelo: SueloPintado, x: number, z: number): boolean {
  const h = hexDePunto({ x, y: z }, RADIO_DE_TESELA);
  const t = suelo.get(llaveDe(h.q, h.r));
  return t === undefined || esAgua(t);
}

/* ─── Dónde se nace ──────────────────────────────────────────────────────── */

/**
 * QUÉ COLONO ES QUIEN MIRA: su índice en el orden de la vista, que es el de asiento y el de los
 * sitios de nacer de `mundoDeRiberas`. `−1` si no está sentado o si la vista no es de Riberas.
 * Lo cuenta `indiceDelColono` de `shared/`, el mismo que reparte los colores de las piezas.
 */
export function colonoDeQuienMira(vista: unknown, asiento: string): number {
  if (!esVistaQueSePinta(vista) || asiento.length === 0) return -1;
  return indiceDelColono(vista, asiento);
}

/**
 * EL SITIO DE NACER DE UN COLONO: el suyo de `mundo.nace`, que ya viene junto a lo suyo y
 * mirando al centro. Quien mira sin estar sentado —o un colono sin sitio, que con seis sitios
 * declarados no pasa— nace en el primero: un sitio feo es mejor que un sitio que falta.
 */
export function sitioDeNacer(mundo: MundoDeclarado, colono: number): Sitio | null {
  const suyo = colono >= 0 ? mundo.nace[colono] : undefined;
  return suyo ?? mundo.nace[0] ?? null;
}

/* ─── El mundo, derivado sólo cuando cambia ──────────────────────────────── */

/**
 * LA FIRMA DE UN MUNDO: un número que cambia si cambia cualquier casilla, caja o sitio.
 *
 * El mundo se deriva de la vista, y la vista llega nueva en cada revisión aunque en ella sólo se
 * haya tirado un dado. Con la firma, quien lo monta entrega EL MISMO objeto mientras el mundo no
 * cambie, y el paseo no rehace su arena (`usarElPaseo` la deriva por identidad). Es FNV-1a sobre
 * los números tal cual: sin cadenas, que en una revisión son ocho mil casillas.
 */
export function firmaDelMundo(mundo: MundoDeclarado): number {
  let h = 0x811c9dc5;
  const mete = (v: number): void => {
    /* Los números del mundo son enteros de casilla o coordenadas con decimales: se meten las dos mitades. */
    const entero = Math.floor(v);
    const resto = Math.round((v - entero) * 1e6);
    h = Math.imul(h ^ (entero | 0), 0x01000193) >>> 0;
    h = Math.imul(h ^ resto, 0x01000193) >>> 0;
  };
  mete(mundo.lado);
  mete(mundo.pisables.length);
  for (const c of mundo.pisables) {
    mete(c.x);
    mete(c.y);
  }
  mete(mundo.vados.length);
  for (const c of mundo.vados) {
    mete(c.x);
    mete(c.y);
  }
  mete(mundo.cuerpos.length);
  for (const c of mundo.cuerpos) {
    mete(c.x0);
    mete(c.z0);
    mete(c.x1);
    mete(c.z1);
  }
  mete(mundo.nace.length);
  for (const s of mundo.nace) {
    mete(s.x);
    mete(s.z);
    mete(s.rumbo);
  }
  return h;
}
