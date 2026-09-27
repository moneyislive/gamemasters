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
 *
 * ═══ Y DESDE EL MISMO 27-SEP, TAMBIÉN LO QUE CHOCA ═══
 *
 * Miguel: «el avatar atraviesa los objetos medianos y pequeños». El mismo adorno para ya a quien anda
 * en este aparato (`adornoQueChocaDelBurgo`, con `escenas/paseo/adorno-que-choca.ts`): el mobiliario y
 * los coches aparcados por lo que tienen a la altura del cuerpo, y los bultos que son un sólido
 * (`BULTOS_QUE_CHOCAN`). Lo que se pisa o va por encima de la cabeza, no. El servidor sigue sin verlo.
 */
import type { Cuerpo } from '../../shared/mecanicas/mundo';
import { hacerLosTrozos, plantasQueChocan, trozosDePiezas } from '../paseo/adorno-que-choca';
import type { TrozoDelAdorno } from '../paseo/adorno-que-choca';
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

/* ─── Y LO QUE CHOCA ─────────────────────────────────────────────────────── */

/**
 * LOS BULTOS PROPIOS QUE PARAN A QUIEN ANDA, clase a clase: una tabla ENTERA y no una lista, para que
 * una clase nueva no choque ni se atraviese sin que nadie lo haya decidido (TypeScript pide la fila).
 *
 *   · CHOCAN los que son un sólido a la altura del cuerpo: los pilares de la obra, los surtidores de
 *     la gasolinera, las gradas, el pedestal y el templete.
 *   · NO chocan los que se pisan (los mismos que `SUELOS_QUE_SE_PISAN` de `a-pie.ts`: andenes,
 *     forjados, puentes, céspedes, asfalto…), los que van por encima de la cabeza (marquesinas,
 *     toldos, porches, el brazo de la grúa), el agua y el estanque, lo que ya es estructura (las
 *     torres, las naves y los cantiles del canal: `mundoDelBurgo`), y la ciudad de lejos y lo de
 *     dentro de un edificio abierto (`CLASES_QUE_NO_TAPAN`).
 */
export const BULTOS_QUE_CHOCAN: Readonly<Record<ClaseDeBulto, boolean>> = {
  'losa-de-sala': false,
  tabique: false,
  techo: false,
  escalera: false,
  cubierta: false,
  medianera: false,
  torre: false,
  jardin: false,
  pradera: false,
  estanque: false,
  templete: true,
  tierra: false,
  asfalto: false,
  'plaza-de-aparcamiento': false,
  nave: false,
  gradas: true,
  isleta: false,
  pedestal: true,
  cesped: false,
  via: false,
  anden: false,
  marquesina: false,
  agua: false,
  cantil: false,
  puente: false,
  'pista-de-colegio': false,
  surtidor: true,
  forjado: false,
  pilar: true,
  'brazo-de-grua': false,
  toldo: false,
  porche: false,
  prisma: false,
  'manzana-fundida': false,
};

/**
 * EL ADORNO DE UNA CIUDAD DEL BURGO QUE PARA A QUIEN ANDA (`escenas/paseo/adorno-que-choca.ts`): el
 * mobiliario y los coches aparcados por sus rodajas finas (`rodajasDe`, medidas en el catálogo que
 * se pinta), y los bultos de `BULTOS_QUE_CHOCAN` por su caja. `sueloEn` es el suelo que pisa quien
 * anda (`sueloDelBurgo`): de él cuelga la franja del cuerpo. Todo el mobiliario choca —ninguna pieza
 * del Burgo se anda por encima—, y lo que no llega al tobillo se queda fuera solo.
 */
export function adornoQueChocaDelBurgo(
  ciudad: LaCiudad,
  rodajasDe: (pieza: string) => readonly Estorbo[] | null,
  sueloEn: (x: number, z: number) => number,
): Cuerpo[] {
  return hacerLosTrozos(trozosDelAdornoDelBurgo(ciudad, rodajasDe, sueloEn));
}

/** Lo mismo en trozos, para montarlo sin tirones (`usarElAdorno`): las piezas de 256 en 256, y los bultos al final. */
export function trozosDelAdornoDelBurgo(
  ciudad: LaCiudad,
  rodajasDe: (pieza: string) => readonly Estorbo[] | null,
  sueloEn: (x: number, z: number) => number,
): TrozoDelAdorno[] {
  const trozos = trozosDePiezas([...ciudad.mobiliario, ...ciudad.coches.aparcados], rodajasDe, sueloEn);
  trozos.push(() => {
    const salida: Cuerpo[] = [];
    for (const b of ciudad.fachadas) {
      if (!BULTOS_QUE_CHOCAN[b.clase]) continue;
      for (const c of plantasQueChocan([cajaDelBulto(b)], sueloEn(b.x, b.z))) salida.push(c);
    }
    return salida;
  });
  return trozos;
}
