/**
 * EL ADORNO DE LAS LINDES QUE PARA A QUIEN ANDA: lo menudo del reparto.
 *
 * ═══ QUÉ ES ESTRUCTURA AQUÍ, Y QUÉ ADORNO ═══
 *
 * Las Lindes baja su reparto a `shared/` (BOOTS-ON-BOARD §7.3 A): las casas, las murallas, los
 * árboles y las arboledas, el almiar, la colina, y las piedras, rocas y tocones que pasan de la
 * cintura son ESTRUCTURA (`comoEstorbaLaPuesta`, en `lindes-piezas.ts`) y los mira el servidor. Lo
 * MENUDO no: barriles, cajas, sacos, leña, carros, puestos, pozos, abrevaderos, vallas, y las rocas
 * y los tocones que se quedan por debajo de la cintura. Eso es adorno —la sobria ni lo pinta—, y
 * hasta el 27-sep-2026 se atravesaba.
 *
 * Ahora choca en el aparato por la parte que tiene en la franja del cuerpo
 * (`escenas/paseo/adorno-que-choca.ts`), con sus rodajas finas medidas en `tablero.glb` y puesto
 * como lo pone `UnModelo` en `Lindes.tsx`: el `largo` por el eje que es largo (`ejeDelLargo`), el
 * giro de `three` y el sitio de su losa. Un saco (0,34 de alto) choca; una `roca-a` pequeña, que no
 * llega al tobillo, se pisa. La cubierta de suelo —el trigal y el barbecho— no es menuda y no entra.
 *
 * Y SÓLO SI SE PINTA: en `sobria` lo menudo no se pinta (`ANILLOS_DE_DETALLE`), y chocar con un
 * barril que no se ve sería peor que atravesar uno que sí. Quien lo monta dice si se pinta.
 */
import { comoEstorbaLaPuesta, esMenuda, PIEZA } from '../../shared/arcade/juegos/lindes-piezas';
import type { PorQueEsta } from '../../shared/arcade/juegos/lindes-reparto';
import { montarLaLosa, semillaDeLaLosa } from '../../shared/arcade/juegos/lindes-reparto';
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';
import type { Cuerpo } from '../../shared/mecanicas/mundo';
import { ALTO_DE_UNA_RODAJA_QUE_CHOCA, hacerLosTrozos, plantasQueChocan, TOPE_DE_RODAJAS_QUE_CHOCAN } from '../paseo/adorno-que-choca';
import type { TrozoDelAdorno } from '../paseo/adorno-que-choca';
import { rodajasDeUnaMalla } from '../paseo/estorbos';
import type { Estorbo } from '../paseo/estorbos';
import { ESCALA_DEL_PACK } from '../escala';
import { LADO_DE_LOSA } from './medidas';
import { ANILLOS_DE_DETALLE } from './detalle';
import type { Calidad } from '../embarcadero/tipos';
import { escalaDeLaPuesta } from './catalogo';
import type { EjeDelLargo, TresEjes } from './catalogo';

/** Una losa puesta, como la da la vista traducida. */
export interface LosaDelAdorno {
  readonly x: number;
  readonly y: number;
  readonly losa: string;
  readonly giro: Giro;
}

/**
 * ¿Es ésta una pieza del adorno que choca? Lo menudo que no es estructura puesto así, salvo la CERCA
 * DE LA ERMITA.
 *
 * La cerca rodea la ermita ENTERA y sin puerta —veinte vallas en cuadro—, y el prado que queda dentro,
 * unos 1.400 u², no tiene otra entrada. Chocando con ella, ese prado sería un bolsillo al que no se
 * llega: medido en un valle con todas las losas del mazo, el 0,2 % de los sitios donde el servidor
 * hace brotar hallazgos caían ahí dentro, a la vista y sin que nadie pudiera cogerlos. La cerca se
 * pinta y no para; lo demás de la ermita que es menudo (el pozo), sí.
 */
export function esAdornoQueChoca(pieza: string, escala: number, porque?: PorQueEsta): boolean {
  if (porque === 'ermita' && (pieza === PIEZA.valla || pieza === PIEZA.vallaPuerta)) return false;
  return esMenuda(pieza) && comoEstorbaLaPuesta(pieza, escala) === 'nada';
}

/**
 * EL ADORNO QUE CHOCA DE UN TABLERO. `rodajasDe` da las rodajas finas de un modelo en sus ejes, o
 * `null` si no lo conoce; `ejeDe`, hacia dónde es largo. Sin lo menudo pintado, nada.
 */
export function adornoQueChocaDeLasLindes(
  losas: readonly LosaDelAdorno[],
  semilla: number,
  rodajasDe: (pieza: string) => readonly Estorbo[] | null,
  ejeDe: (pieza: string) => EjeDelLargo,
  conLoMenudo: boolean,
): Cuerpo[] {
  return hacerLosTrozos(trozosDelAdornoDeLasLindes(losas, semilla, rodajasDe, ejeDe, conLoMenudo));
}

/** Cuántas losas por trozo: una losa lleva de cero a unas cuarenta piezas menudas. */
export const LOSAS_POR_TROZO = 8;

/** Lo mismo en trozos de `LOSAS_POR_TROZO` losas, para montarlo sin tirones (`usarElAdorno`). */
export function trozosDelAdornoDeLasLindes(
  losas: readonly LosaDelAdorno[],
  semilla: number,
  rodajasDe: (pieza: string) => readonly Estorbo[] | null,
  ejeDe: (pieza: string) => EjeDelLargo,
  conLoMenudo: boolean,
): TrozoDelAdorno[] {
  const trozos: TrozoDelAdorno[] = [];
  if (!conLoMenudo) return trozos;
  for (let i = 0; i < losas.length; i += LOSAS_POR_TROZO) {
    const suyas = losas.slice(i, i + LOSAS_POR_TROZO);
    trozos.push(() => adornoDeLasLosas(suyas, semilla, rodajasDe, ejeDe));
  }
  return trozos;
}

/** El adorno que choca de unas losas, sin preguntar si se pinta. */
function adornoDeLasLosas(
  losas: readonly LosaDelAdorno[],
  semilla: number,
  rodajasDe: (pieza: string) => readonly Estorbo[] | null,
  ejeDe: (pieza: string) => EjeDelLargo,
): Cuerpo[] {
  const salida: Cuerpo[] = [];
  const escala: TresEjes = { x: 1, y: 1, z: 1 };
  for (const l of losas) {
    const dx = l.x * LADO_DE_LOSA;
    const dz = -l.y * LADO_DE_LOSA;
    for (const p of montarLaLosa(l.losa, l.giro, semillaDeLaLosa(semilla, l.x, l.y)).puestas) {
      if (!esAdornoQueChoca(p.pieza, p.escala, p.porque)) continue;
      const rodajas = rodajasDe(p.pieza);
      if (rodajas === null) continue;
      escalaDeLaPuesta(p.escala, p.largo, ejeDe(p.pieza), escala);
      const c = Math.cos(p.giro);
      const s = Math.sin(p.giro);
      const x = p.x + dx;
      const z = p.z + dz;
      const cajas: Estorbo[] = [];
      for (const r of rodajas) {
        let x0 = Infinity;
        let z0 = Infinity;
        let x1 = -Infinity;
        let z1 = -Infinity;
        for (const [u, v] of [
          [r.x0 * escala.x, r.z0 * escala.z],
          [r.x1 * escala.x, r.z0 * escala.z],
          [r.x0 * escala.x, r.z1 * escala.z],
          [r.x1 * escala.x, r.z1 * escala.z],
        ] as const) {
          /* El giro de `three` sobre la vertical, como en `estorbosDePiezas`. */
          const wx = x + u * c + v * s;
          const wz = z - u * s + v * c;
          if (wx < x0) x0 = wx;
          if (wx > x1) x1 = wx;
          if (wz < z0) z0 = wz;
          if (wz > z1) z1 = wz;
        }
        cajas.push({ x0, y0: p.y + r.y0 * escala.y, z0, x1, y1: p.y + r.y1 * escala.y, z1 });
      }
      for (const b of plantasQueChocan(cajas, p.y)) salida.push(b);
    }
  }
  return salida;
}

/** Lo que de una parte del catálogo hace falta para cortarla: sus vértices y sus triángulos. */
export interface ParteParaCortar {
  readonly geometria: {
    getAttribute(nombre: 'position'): { readonly count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number } | undefined;
    getIndex(): { readonly array: ArrayLike<number> } | null;
  };
}

/**
 * LAS RODAJAS FINAS DE LAS PARTES DE UN MODELO, en sus ejes (las partes del catálogo ya lo están:
 * `partesDe`). El corte es el del adorno que choca pasado a unidades del pack.
 */
export function rodajasQueChocanDeLasPartes(partes: readonly ParteParaCortar[]): Estorbo[] {
  const salida: Estorbo[] = [];
  for (const parte of partes) {
    const pos = parte.geometria.getAttribute('position');
    if (pos === undefined) continue;
    /* Por `getX` y no por `array`: un atributo entrelazado o cuantizado no es una lista de x, y, z. */
    const posiciones = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      posiciones[i * 3] = pos.getX(i);
      posiciones[i * 3 + 1] = pos.getY(i);
      posiciones[i * 3 + 2] = pos.getZ(i);
    }
    const indice = parte.geometria.getIndex();
    for (const r of rodajasDeUnaMalla(
      posiciones,
      indice === null ? null : indice.array,
      ALTO_DE_UNA_RODAJA_QUE_CHOCA / ESCALA_DEL_PACK,
      TOPE_DE_RODAJAS_QUE_CHOCAN,
    )) {
      salida.push(r);
    }
  }
  return salida;
}

/** Las rodajas finas de cada modelo de un catálogo por su nombre, medidas una vez; `null` si no está. */
export function rodajasQueChocanDelCatalogo(
  partes: ReadonlyMap<string, readonly ParteParaCortar[]>,
): (pieza: string) => readonly Estorbo[] | null {
  const medidas = new Map<string, readonly Estorbo[] | null>();
  return (pieza) => {
    const hecha = medidas.get(pieza);
    if (hecha !== undefined) return hecha;
    const suyas = partes.get(pieza);
    const rodajas = suyas === undefined ? null : rodajasQueChocanDeLasPartes(suyas);
    medidas.set(pieza, rodajas);
    return rodajas;
  };
}

/** ¿Pinta lo menudo esta calidad? La `sobria` no (`ANILLOS_DE_DETALLE`), y lo que no se pinta no choca. */
export function sePintaLoMenudo(calidad: Calidad): boolean {
  return ANILLOS_DE_DETALLE[calidad].menudo > 0;
}
