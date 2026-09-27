/**
 * LO QUE ESTORBA A LA VISTA EN EL BURGO: el adorno de la ciudad, contado para la cámara de a pie.
 *
 * ═══ POR QUÉ ═══
 *
 * El 27-sep-2026, andando por una calle del Burgo, la cámara de hombro se quedó detrás de una señal
 * de tráfico que tapaba media pantalla, y luego detrás de un semáforo. La cámara se aparta de lo
 * que hay en la ARENA, y la arena del Burgo es `mundoDelBurgo`: la traza y lo sólido de los
 * distritos, sin el adorno, que depende de la calidad y se atraviesa (ver su cabecera). Esto le da
 * al paseo el adorno para la VISTA (`escenas/paseo/estorbos.ts`): no choca, no viaja y no cambia
 * lo que valida el servidor.
 *
 * ═══ QUÉ ENTRA ═══
 *
 *   · EL MOBILIARIO: farolas, semáforos, árboles, bancos, papeleras, contenedores, tumbas, palets…
 *     todo `ciudad.mobiliario`, cada pieza con sus rodajas medidas en el modelo (`rodajasDe`: la
 *     escena se las da del catálogo que pinta, con `rodajasDelCatalogo`).
 *   · LOS COCHES APARCADOS, igual. Los que circulan no: se mueven, y una cámara que se apartara de
 *     cada coche que pasa marearía más que el coche.
 *   · LOS BULTOS PROPIOS QUE SE LEVANTAN (`ciudad.fachadas`): marquesinas, toldos, porches, el brazo
 *     de la grúa, los forjados y pilares de la obra, el templete, las gradas… Con su caja, que es
 *     la que se pinta. Los que son estructura (las torres, las naves) ya los mira la arena, y
 *     repetirlos aquí no cambia nada. No entran los planos —el suelo no tapa— ni lo que no es de
 *     esta capa (`CLASES_QUE_NO_TAPAN`).
 *
 * Es la ciudad de la calidad del aparato, la que se pinta: en sobria hay menos adorno y estorba
 * menos, que es lo justo.
 */
import type { Estorbo } from '../paseo/estorbos';
import { estorbosDePiezas } from '../paseo/estorbos';
import type { BultoPropio, ClaseDeBulto, LaCiudad } from './ciudad';

/**
 * Los bultos que no cuentan: los prismas y las manzanas fundidas son la ciudad DE LEJOS —de cerca
 * se pinta la de verdad—, el agua se pisa por encima o no se pisa, y lo de dentro de los edificios
 * sólo existe con el edificio abierto.
 */
export const CLASES_QUE_NO_TAPAN: ReadonlySet<ClaseDeBulto> = new Set<ClaseDeBulto>([
  'prisma',
  'manzana-fundida',
  'agua',
  'losa-de-sala',
  'tabique',
  'techo',
  'escalera',
  'cubierta',
  'medianera',
]);

/** Lo que tiene que levantarse un bulto para tapar algo: menos es un suelo pintado. */
export const ALTO_QUE_TAPA = 0.3;

/** La caja de un bulto propio en el mundo: su planta girada como la gira `rotation.y`, y de su base a su techo. */
export function cajaDelBulto(b: BultoPropio): Estorbo {
  const c = Math.cos(b.giro);
  const s = Math.sin(b.giro);
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const [u, v] of [
    [-b.ancho / 2, -b.fondo / 2],
    [b.ancho / 2, -b.fondo / 2],
    [-b.ancho / 2, b.fondo / 2],
    [b.ancho / 2, b.fondo / 2],
  ] as const) {
    const x = b.x + u * c + v * s;
    const z = b.z - u * s + v * c;
    x0 = Math.min(x0, x);
    z0 = Math.min(z0, z);
    x1 = Math.max(x1, x);
    z1 = Math.max(z1, z);
  }
  return { x0, y0: b.y, z0, x1, y1: b.y + b.alto, z1 };
}

/**
 * EL ADORNO DE UNA CIUDAD DEL BURGO, como cajas para la vista. `rodajasDe` da las de cada pieza del
 * pack por su nombre, o `null` si no la conoce.
 */
export function estorbosDelBurgo(ciudad: LaCiudad, rodajasDe: (pieza: string) => readonly Estorbo[] | null): Estorbo[] {
  const salida = estorbosDePiezas([...ciudad.mobiliario, ...ciudad.coches.aparcados], rodajasDe);
  for (const b of ciudad.fachadas) {
    if (CLASES_QUE_NO_TAPAN.has(b.clase) || !(b.alto >= ALTO_QUE_TAPA)) continue;
    salida.push(cajaDelBulto(b));
  }
  return salida;
}
