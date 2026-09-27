/**
 * LO QUE ESTORBA A LA VISTA EN EL DELTA: el adorno de Riberas, contado para la cámara de a pie.
 *
 * ═══ POR QUÉ ═══
 *
 * La cámara de hombro se aparta de lo que hay en la ARENA (`hastaDondeCabeElHombro`), y la arena de
 * Riberas es `mundoDeRiberas`: la estructura que valida el servidor, sin el adorno. El adorno —los
 * árboles y las rocas que siembra `poblar.ts`, las casas del caserío, los puentes, los muelles y los
 * barcos, las matas de las orillas— vive sólo en `delta.tsx`, así que la cámara lo atravesaba y se
 * quedaba detrás de un pino con la pantalla entera de copa. Es el mismo fallo que el Burgo tuvo con
 * sus señales de tráfico el 27-sep-2026, y el arreglo es el mismo: declarar el adorno para la VISTA
 * (`escenas/paseo/estorbos.ts`), que no choca, no viaja y no cambia lo que ve el servidor.
 *
 * ═══ QUÉ ENTRA, Y POR QUÉ SE LEE DEL PLAN Y NO SE VUELVE A SEMBRAR ═══
 *
 * Todo lo que el plan del mundo (`plan` en `Delta`) pone en `cosas` y en `caserio`: es EXACTAMENTE
 * lo que se pinta, pieza a pieza y en su sitio, porque es la misma lista con la que se instancian las
 * copias. Volver a sembrar aquí sería una segunda copia de la siembra, y la copia es la que se queda
 * atrás el día que `poblar.ts` cambie. El suelo no entra: no tapa, y ya lo mira la arena.
 *
 * Cada pieza lleva sus rodajas medidas en el modelo que se pinta (`rodajasDelCatalogo`), y una pieza
 * que el catálogo no conoce no estorba. La inclinación de los tramos de puente no se cuenta: van
 * casi llanos, y su tablero queda por debajo de la línea que va de la cámara a la cabeza.
 *
 * Esto es presentación y va en coma flotante: nada de aquí decide dónde se está.
 *
 * ═══ Y DESDE EL 27-SEP-2026, TAMBIÉN LO QUE CHOCA ═══
 *
 * El mismo adorno para a quien anda (`adornoQueChocaDelDelta`, con `escenas/paseo/adorno-que-choca.ts`):
 * árboles, rocas, casas del caserío, carros, montañas, vallas. Salvo lo que se anda por encima o es
 * suelo (`noChocaEnElDelta`): el puente, los muelles, los juncos y los nenúfares, el trigal y el
 * barbecho.
 */
import type { Cuerpo } from '../shared/mecanicas/mundo';
import { hacerLosTrozos, trozosDePiezas } from './paseo/adorno-que-choca';
import type { TrozoDelAdorno } from './paseo/adorno-que-choca';
import type { Estorbo, PiezaPuesta } from './paseo/estorbos';
import { estorbosDePiezas } from './paseo/estorbos';

/** Una copia del plan del mundo, sin `three`: lo que de ella hace falta para saber dónde estorba. */
export interface CopiaDelAdorno {
  readonly posicion: { readonly x: number; readonly y: number; readonly z: number };
  /** El `rotation.y` de three, en radianes. */
  readonly giro: number;
  /** La escala de la copia; el pack escala por igual los tres ejes, así que basta la `x`. */
  readonly escala: { readonly x: number };
}

/**
 * LAS PIEZAS PUESTAS DEL ADORNO. `cosas` es el mapa del plan —la llave es `comarca|modelo` o
 * `mar|modelo`— y `caserio` los edificios con su modelo.
 */
export function piezasDelAdorno(
  cosas: ReadonlyMap<string, readonly CopiaDelAdorno[]>,
  caserio: readonly { readonly modelo: string; readonly puesta: CopiaDelAdorno }[],
): PiezaPuesta[] {
  const puestas: PiezaPuesta[] = [];
  const poner = (pieza: string, c: CopiaDelAdorno): void => {
    puestas.push({ pieza, x: c.posicion.x, y: c.posicion.y, z: c.posicion.z, giro: c.giro, talla: c.escala.x });
  };
  for (const [llave, copias] of cosas) {
    const pieza = llave.slice(llave.indexOf('|') + 1);
    for (const c of copias) poner(pieza, c);
  }
  for (const e of caserio) poner(e.modelo, e.puesta);
  return puestas;
}

/** EL ADORNO DEL DELTA, como cajas para la vista. `rodajasDe` da las de cada pieza del pack, o `null`. */
export function estorbosDelDelta(
  cosas: ReadonlyMap<string, readonly CopiaDelAdorno[]>,
  caserio: readonly { readonly modelo: string; readonly puesta: CopiaDelAdorno }[],
  rodajasDe: (pieza: string) => readonly Estorbo[] | null,
): Estorbo[] {
  return estorbosDePiezas(piezasDelAdorno(cosas, caserio), rodajasDe);
}

/**
 * LO DEL ADORNO DEL DELTA QUE NO PARA A NADIE, por el nombre de su modelo: lo que se anda por encima
 * —el puente, los muelles de cada color— y lo que es suelo o agua —los juncos y los nenúfares de las
 * orillas, el trigal y el barbecho, que son el campo mismo—. Lo demás choca por la parte que tiene a
 * la altura del cuerpo.
 */
export function noChocaEnElDelta(pieza: string): boolean {
  return (
    pieza === 'puente' ||
    pieza.startsWith('muelle') ||
    pieza.startsWith('junco-') ||
    pieza.startsWith('nenufar-') ||
    pieza === 'trigal' ||
    pieza === 'barbecho'
  );
}

/**
 * EL ADORNO DEL DELTA QUE PARA A QUIEN ANDA: las piezas del plan y del caserío por sus rodajas finas
 * (`rodajasDe`, medidas en el catálogo que se pinta), sin las de `noChocaEnElDelta`. `sueloEn` es la
 * altura a la que se pinta a quien anda (`alturaAPie`): de ahí cuelga la franja del cuerpo.
 */
export function adornoQueChocaDelDelta(
  cosas: ReadonlyMap<string, readonly CopiaDelAdorno[]>,
  caserio: readonly { readonly modelo: string; readonly puesta: CopiaDelAdorno }[],
  rodajasDe: (pieza: string) => readonly Estorbo[] | null,
  sueloEn: (x: number, z: number) => number,
): Cuerpo[] {
  return hacerLosTrozos(trozosDelAdornoDelDelta(cosas, caserio, rodajasDe, sueloEn));
}

/** Lo mismo en trozos de 256 piezas, para montarlo sin tirones (`usarElAdorno`). */
export function trozosDelAdornoDelDelta(
  cosas: ReadonlyMap<string, readonly CopiaDelAdorno[]>,
  caserio: readonly { readonly modelo: string; readonly puesta: CopiaDelAdorno }[],
  rodajasDe: (pieza: string) => readonly Estorbo[] | null,
  sueloEn: (x: number, z: number) => number,
): TrozoDelAdorno[] {
  const puestas = piezasDelAdorno(cosas, caserio).filter((p) => !noChocaEnElDelta(p.pieza));
  return trozosDePiezas(puestas, rodajasDe, sueloEn);
}
