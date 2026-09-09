/**
 * EL PRESUPUESTO DEL BURGO: cuántas veces pone cada pieza un tablero LLENO, en las dos
 * calidades, y la suma contra el `.glb` real. Sin `three`.
 *
 * ═══ POR QUÉ LAS MULTIPLICIDADES SE CUENTAN DE LAS PUESTAS ═══
 *
 * La tabla del diseño (§5.2) dice «arbol-a × 12, muralla × 16, casas 32 × 128…». Si se
 * copiara a mano aquí, el día que `anillo-en-3d.ts` pusiera un árbol más nadie lo vería.
 * Así que lo estático se CUENTA de las listas de puestas que la escena instancia
 * (`mundoEstatico`), y sólo lo dinámico —lo que depende de la partida y no del decorado—
 * se escribe como número: 32 casas y 12 posadas (el tope de casas del Concejo), 28
 * banderas de dueño (los 28 títulos), 6 peones, 6 monedas en vuelo, 2 dados, un aventurero.
 * `verify:burgo-escena` suma las dos tablas con los triángulos medidos del fichero.
 *
 * ═══ LAS DOS CALIDADES ═══
 *
 * `plena`: todo. `sobria` (la decide `juzgarCalidad` de `embarcadero/calidad.ts`: media
 * > 22 ms sobre 120 fotogramas): sin campo, sin ronda, sin aventurero (el peón se desliza
 * solo por la polilínea), sin monedas, plaza sin mesas ni sillas. Topes: 110.000 y 90.000.
 *
 * ═══ LO QUE LA ESCENA PONE ADEMÁS DE LAS PIEZAS ═══
 *
 * Como en `embarcadero/presupuesto.ts`: las geometrías propias se declaran AQUÍ, sin
 * `three`, y la escena las construye con estos mismos números. El suelo del anillo y las
 * aceras (40 casillas × 3 bandas + 4 esquinas + el suelo de dados, dos triángulos cada
 * cara y algunos más para los bordes), los discos de contacto, el naipe, la marca de
 * casilla, el agua de la ribera y la cúpula del cielo.
 *
 * ═══ LA POSADA NO ES LA TABERNA (decisión 12) ═══
 *
 * La pieza `posada` del `.glb` (2.992 triángulos) no entra en el tablero: doce serían
 * 35.904. La posada se pinta como `casa` teñida con una `bandera` clavada en el tejado
 * (176). La vacuna del comprobador pone `posada` × 12 en la tabla y tiene que caer.
 */
import { TOPE_DE_TRIANGULOS } from '../embarcadero/presupuesto';
import { PIEZA } from './piezas';
import type { NombreDePieza } from './piezas';
import { CASILLAS, mundoEstatico } from './anillo-en-3d';
import type { Puesta } from './anillo-en-3d';

/** Los topes: el de siempre en plena, y 90.000 en sobria. */
export const TOPE_PLENA = TOPE_DE_TRIANGULOS;
export const TOPE_SOBRIA = 90_000;
export const TOPE_DE_LLAMADAS = 70;

/* ────────────────────────── Lo que depende de la partida ────────────────────────── */

/** El Concejo tiene 32 casas y 12 posadas; hay 28 títulos con bandera. */
export const CASAS_DEL_CONCEJO = 32;
export const POSADAS_DEL_CONCEJO = 12;
export const TITULOS = 28;
export const ASIENTOS = 6;
export const MONEDAS_EN_VUELO = 6;
export const DADOS = 2;
/** Discos de contacto: seis peones, el aventurero y uno de más para el que se despide. */
export const DISCOS_DE_CONTACTO = ASIENTOS + 2;

/* ───────────────────────── Geometrías propias, sin `three` ───────────────────────── */

/** El suelo: por casilla, tres bandas (dos triángulos cada una) más el borde alzado de la acera (cuatro); las esquinas, dos; el suelo de dados, dos. */
export function triangulosDelSuelo(): number {
  const laterales = CASILLAS - 4;
  return laterales * (3 * 2 + 4) + 4 * 2 + 2 + 2 * 4 * 2;
}
export const SEGMENTOS_DEL_DISCO = 18;
export const SEGMENTOS_DEL_CIELO = { ancho: 24, alto: 12 } as const;
export function triangulosDelCielo(ancho = SEGMENTOS_DEL_CIELO.ancho, alto = SEGMENTOS_DEL_CIELO.alto): number {
  return ancho * 2 + (alto - 2) * ancho * 2;
}
export const TRIANGULOS_DEL_NAIPE = 2;
/** La marca de casilla tocable: un anillo plano de 18 sectores. */
export const TRIANGULOS_DE_LA_MARCA = 36;
export const TRIANGULOS_DEL_AGUA = 4;
/** Los discos del trato: doce, de 2 triángulos cada uno. */
export const DISCOS_DEL_TRATO = 12;
/** El dado de `dados.glb`, medido por `verify:dados`: 662. Se pasa por parámetro si se mide. */
export const TRIANGULOS_DEL_DADO = 662;
/** La exploradora es la figura más pesada: 8.900 medidos. El comprobador la mide de verdad. */
export const TRIANGULOS_DE_LA_EXPLORADORA = 8_900;

/* ─────────────────────────── Las multiplicidades ─────────────────────────── */

export type Multiplicidades = Readonly<Record<string, number>>;

/** Cuántas veces aparece cada pieza en una lista de puestas. */
export function cuentaDePuestas(puestas: readonly Puesta[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const p of puestas) cuenta[p.pieza] = (cuenta[p.pieza] ?? 0) + 1;
  return cuenta;
}

/** Lo dinámico de un tablero LLENO: casas, posadas (casa + bandera), banderas de dueño, peones, monedas. */
export function multiplicidadesDinamicas(calidad: 'plena' | 'sobria'): Record<string, number> {
  return {
    [PIEZA.casa]: CASAS_DEL_CONCEJO + POSADAS_DEL_CONCEJO,
    [PIEZA.bandera]: TITULOS + POSADAS_DEL_CONCEJO,
    [PIEZA.peon]: ASIENTOS,
    [PIEZA.moneda]: calidad === 'plena' ? MONEDAS_EN_VUELO : 0,
    /* Las dos rejas van sueltas (una se anima) y las nubes instanciadas aparte: no están en el fundido. */
    [PIEZA.muroReja]: 2,
    [PIEZA.nubeGrande]: calidad === 'plena' ? 1 : 0,
    [PIEZA.nubePequena]: calidad === 'plena' ? 2 : 0,
  };
}

/** Las multiplicidades de un tablero lleno: lo estático contado de las puestas (semilla 1: la cuenta no depende de la semilla) más lo dinámico. */
export function multiplicidades(calidad: 'plena' | 'sobria', semilla = 1): Multiplicidades {
  const estatico = cuentaDePuestas(mundoEstatico(semilla, calidad));
  const dinamico = multiplicidadesDinamicas(calidad);
  const todo: Record<string, number> = { ...estatico };
  for (const [pieza, n] of Object.entries(dinamico)) todo[pieza] = (todo[pieza] ?? 0) + n;
  return todo;
}

export const MULTIPLICIDADES_PLENA: Multiplicidades = multiplicidades('plena');
export const MULTIPLICIDADES_SOBRIA: Multiplicidades = multiplicidades('sobria');

/* ─────────────────────────────── La suma ─────────────────────────────── */

export interface RenglonDelPresupuesto {
  readonly que: string;
  readonly cuantos: number;
  readonly triangulos: number;
}

export interface SumaDelPresupuesto {
  readonly total: number;
  readonly renglones: readonly RenglonDelPresupuesto[];
  /** Piezas de la tabla que el fichero no trae: la suma no vale si hay alguna. */
  readonly desconocidas: readonly string[];
}

/**
 * LA SUMA de una tabla de multiplicidades con los triángulos por pieza (los mide el
 * comprobador del `.glb`), más lo propio de la escena y un aventurero (cero en sobria).
 */
export function sumaDelPresupuesto(
  tabla: Multiplicidades,
  triangulosDe: (pieza: string) => number | undefined,
  calidad: 'plena' | 'sobria',
  triangulosDeUnAventurero = TRIANGULOS_DE_LA_EXPLORADORA,
  triangulosDelDado = TRIANGULOS_DEL_DADO,
): SumaDelPresupuesto {
  const renglones: RenglonDelPresupuesto[] = [];
  const desconocidas: string[] = [];
  for (const pieza of Object.keys(tabla).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const cuantos = tabla[pieza] ?? 0;
    const t = triangulosDe(pieza);
    if (t === undefined) desconocidas.push(pieza);
    renglones.push({ que: pieza, cuantos, triangulos: cuantos * (t ?? 0) });
  }
  const plena = calidad === 'plena';
  renglones.push({ que: 'suelo del anillo y aceras', cuantos: 1, triangulos: triangulosDelSuelo() });
  renglones.push({ que: 'discos de contacto', cuantos: DISCOS_DE_CONTACTO, triangulos: DISCOS_DE_CONTACTO * SEGMENTOS_DEL_DISCO });
  renglones.push({ que: 'dados', cuantos: DADOS, triangulos: DADOS * triangulosDelDado });
  renglones.push({ que: 'naipe, marca, agua y discos del trato', cuantos: 1, triangulos: TRIANGULOS_DEL_NAIPE + TRIANGULOS_DE_LA_MARCA + TRIANGULOS_DEL_AGUA + DISCOS_DEL_TRATO * 2 });
  renglones.push({ que: 'la cúpula del cielo', cuantos: 1, triangulos: triangulosDelCielo() });
  renglones.push({ que: 'aventurero (exploradora)', cuantos: plena ? 1 : 0, triangulos: plena ? triangulosDeUnAventurero : 0 });
  const total = renglones.reduce((a, r) => a + r.triangulos, 0);
  return { total, renglones, desconocidas };
}

/** Los nombres de pieza que hay que encontrar en el fichero para que la suma valga. */
export function piezasDelPresupuesto(): NombreDePieza[] {
  return [...new Set([...Object.keys(MULTIPLICIDADES_PLENA), ...Object.keys(MULTIPLICIDADES_SOBRIA)])] as NombreDePieza[];
}
