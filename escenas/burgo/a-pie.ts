/**
 * A PIE POR EL BURGO: lo que del paseo común es sólo de esta ciudad. Sin `three` y sin React.
 *
 * ═══ EL PASEO NO SE ESCRIBE AQUÍ: SE DECLARA ═══
 *
 * El paso por tics, los choques, el borde, las cámaras de hombro y de ojos, los mandos y la
 * marioneta son de `escenas/paseo/`, y el Burgo los CONSUME como los consume Las Lindes: la
 * escena le pasa a `usarElPaseo` su mundo (`mundoDelBurgo`, el mismo que derivará el servidor
 * para validar), dónde se nace, desde dónde se mira, la palanca si la hay y a qué altura está el
 * suelo. Un paseo propio aquí sería la trampa que BOOTS-ON-BOARD §6.1 avisaba: dos pasos, los
 * comprobadores en verde y la escena andando con el malo.
 *
 * Lo que esta ciudad le tiene que contar al paseo es lo que sólo ella sabe, y es lo que hay en
 * este fichero para que `verify:burgo-escena` lo mida en Node:
 *
 *   · DE QUÉ SITIO SE NACE, que es el del asiento de quien mira;
 *   · A QUÉ ALTURA ESTÁ EL SUELO QUE SE PINTA, para poner los pies encima;
 *   · HASTA DÓNDE SE VE, que decide cuánta ciudad se monta mientras se anda;
 *   · Y, EN UNA MESA DE BOTAS, DE QUÉ COLOR SE VE A LOS DEMÁS: el de su peón.
 *
 * ═══ LA ALTURA ES LA DE LO QUE SE PINTA, Y NO DECIDE NADA ═══
 *
 * Dónde se puede estar lo contesta la arena, que es plana. Esto sólo dice a qué cota van los pies
 * para que no floten sobre el asfalto ni se hundan en la acera, y la cuenta sale de lo mismo con
 * lo que la escena dibuja el suelo:
 *
 *   · EN EL ANILLO, las bandas de `suelosDeLaCasilla`: la franja del barrio a 0,60, el filete de la
 *     marcha a 0,20, la superficie a 0 y el marco a 0,30; en una esquina, su cuadro a 0 y su marco.
 *   · EN LA CALLE, la losa del pack que de verdad se pinta en esa celda —su pieza y su giro, no las
 *     vecinas que dice la traza: una celda con una sola vecina lleva una recta abierta por los dos
 *     lados—: el asfalto a 0,42 y el bordillo a 0,60 en las caras cerradas, en las cuatro esquinas
 *     y, en la curva suave, por fuera de su arco. Es la tabla `CARAS_ABIERTAS`, que `verify:la-ciudad`
 *     mide rasterizando el `.glb`, más el arco, que se midió igual (`ACUERDO_DE_LA_CURVA_SUAVE`).
 *   · EN LA ACERA, la parcela, el patio y el suelo de los distritos, 0,60: lo que sube el bordillo.
 *   · Y ENCIMA, lo que se levanta del suelo y se pisa: el andén de la estación (1,20), el tablero
 *     de un puente (1,80), el forjado de la planta baja de la obra (1,10), la isleta. Con un techo:
 *     un forjado de arriba no es suelo, es una planta por la que se pasa por debajo.
 *
 * ═══ HASTA DÓNDE SE VE, MEDIDO CONTRA EL PRESUPUESTO QUE YA TENÍA LA ESCENA ═══
 *
 * La ciudad se monta por niveles de detalle alrededor de la CÁMARA (`montarLaCiudad`), y a pie la
 * cámara está siempre DENTRO de ella, que desde la mesa sólo pasa acercándose mucho. Se midió
 * barriendo cada seis unidades todo lo que se puede andar en siete mesas, contra el tope que
 * `ciudad.ts` le da a la ciudad (`TOPE_DE_LA_CIUDAD`, 692.000 en plena y 84.000 en sobria):
 *
 *     con los umbrales de la mesa ........ plena 572.455 (83 %) · sobria 110.415 (131 %)
 *     con el L2 hasta la niebla (300) ..... plena 482.594 (70 %) · sobria  95.310 (113 %)
 *     y además el L1 de sobria a 40 ....... plena 482.594 (70 %) · sobria  72.908 (87 %)
 *
 * En sobria lo que se pasaba no era la ciudad de lejos: era el disco de detalle de 60, que a pie
 * mete cinco o seis manzanas enteras del pack (de 8.000 a 18.000 triángulos cada una). A 48 aún
 * se pasaba (102 %); a 40 cabe con margen. En plena el disco se queda en 156, el de la mesa, y
 * sobra un tercio. Y más allá de la niebla todo va al nivel más pobre, que es gratis: lo que la
 * niebla se come no se ve de ninguna manera. `verify:burgo-escena` repite el barrido más ralo —de
 * doce en doce y en cuatro mesas, para que corra en segundos—, y ahí sale plena 475.692 (69 %) y
 * sobria 70.685 (84 %): el peor punto del barrido fino no cae en su rejilla, y por eso el margen.
 */
import type { Sitio } from '../../shared/mecanicas/mundo';
import { ALTURA_DEL_BORDE, ALTURA_DEL_FILETE, ALTURA_DEL_REBORDE, BORDE_INTERIOR, FILETE, FRANJA, MEDIO_LADO, SUPERFICIE } from './anillo-en-3d';
import { ALTURA_DEL_ASFALTO, ALTURA_DEL_BORDILLO, ANCHO_DEL_BORDILLO, CARA, CARAS_ABIERTAS, UMBRALES_DE_NIVEL, esClaseDeCalle, mascaraGirada } from './ciudad';
import type { BultoPropio, ClaseDeBulto, LaCiudad } from './ciudad';
import { PIEZA, RETICULA_DE_LA_CIUDAD } from './piezas';
import type { Calidad } from '../embarcadero/tipos';
import { asientosQueAndan } from '../paseo/mesa-de-botas';
import type { AsientoQueAnda } from '../paseo/mesa-de-botas';
import type { ModoDeCamara } from './tipos';

/* ─── Desde dónde se mira ────────────────────────────────────────────────── */

/** Los tres sitios desde los que se mira el Burgo: el nombre que les da el paseo común. */
export type ModoDelBurgo = 'mesa' | 'hombro' | 'ojos';

/**
 * EL MODO DEL PASEO QUE PIDE UNA CÁMARA DEL CONTRATO. `aerea` es el nombre de antes de la mesa y
 * vale lo mismo que `mesa` (ver `ModoDeCamara` en `tipos.ts`).
 */
export function modoDelPaseoDe(camara: ModoDeCamara): ModoDelBurgo {
  return camara.modo === 'hombro' || camara.modo === 'ojos' ? camara.modo : 'mesa';
}

/** El asiento de quien anda, o la cadena vacía mirando la mesa. */
export function asientoQueAnda(camara: ModoDeCamara): string {
  return camara.modo === 'hombro' || camara.modo === 'ojos' ? camara.asiento : '';
}

/* ─── De dónde se nace ───────────────────────────────────────────────────── */

/**
 * DE QUÉ SITIO NACE QUIEN MIRA: el de su asiento, en el orden en que el mundo los reparte.
 *
 * `mundoDelBurgo` declara ocho —las cuatro Puertas del anillo y los cuatro brazos de la glorieta—
 * y en ese orden: con cuatro sentados, cada uno entra por una Puerta, y el primero y el segundo por
 * las dos más lejanas (la sur y la norte). El quinto y el sexto nacen en la glorieta, que es donde
 * no estorban a nadie. Quien mira sin asiento nace en el siguiente sitio libre: no pisa a ninguno
 * de los que juegan, que es lo que pediría Boots on Board el día que se vean unos a otros.
 *
 * El índice es el de la lista de figuras de la vista (`tablero.figuras`), que va en orden de
 * asiento y es la misma en los seis aparatos: nadie elige su sitio, y dos no nacen en el mismo
 * mientras no pasen de ocho.
 */
export function sitioDeNacerEnElBurgo(nace: readonly Sitio[], figuras: readonly { readonly asiento: string }[], asiento: string): Sitio | null {
  if (nace.length === 0) return null;
  const suyo = figuras.findIndex((f) => f.asiento === asiento);
  const k = suyo >= 0 ? suyo : figuras.length;
  return nace[k % nace.length] ?? null;
}

/* ─── Con qué color se ve a los demás ────────────────────────────────────── */

/**
 * LOS ASIENTOS QUE ANDAN POR EL BURGO, con el color con el que se les ve: el de su PEÓN.
 *
 * En una mesa de botas los demás se pintan andando con un rótulo que lleva el color de su asiento
 * (`paseo/los-demas.tsx`), y ese color es del juego. En el Burgo es el del peón y el disco de cada
 * uno, que la traducción de la vista ya reparte en `tablero.figuras` —`#rrggbb`, el mismo con el que
 * la escena tiñe el peón—, así que el rótulo de Ana es del color de la ficha de Ana.
 *
 * `asientosQueAndan` lo busca en una lista `labriegos` con `asiento` y `color`, que es como lo declara
 * Las Lindes; aquí se le da la del Burgo con esa forma, y nada más. Quien no tenga figura —un mirón,
 * una vista que no se lee— sale en el gris de quien no lo declara, que se sigue leyendo.
 *
 * Aquí y no en cada cliente por lo mismo que `sitioDeNacerEnElBurgo`: son dos clientes, y lo que
 * puede divergir sin que nadie se entere se escribe una vez y se mide en Node
 * (`verify:canal-del-paseo`).
 */
export function asientosQueAndanPorElBurgo(
  asientos: readonly { readonly id: string; readonly nombre: string; readonly figura?: string }[],
  figuras: readonly { readonly asiento: string; readonly color: string }[],
): AsientoQueAnda[] {
  return asientosQueAndan(asientos, { labriegos: figuras.map((f) => ({ asiento: f.asiento, color: f.color })) });
}

/* ─── Hasta dónde se ve ──────────────────────────────────────────────────── */

/**
 * LA NIEBLA A PIE: empieza a ocho celdas y a las veinticinco ya no se ve nada.
 *
 * A ras de calle es lo único que da idea de cuánta ciudad queda por delante, y es la que manda en
 * el nivel de detalle: todo lo que cae más allá de `lejos` va al nivel más pobre (ver la cabecera).
 * Veinticinco celdas son 300: desde el centro de un cuadrante se ve la glorieta y el bulevar, y
 * desde la glorieta se llega a ver el anillo de casillas al fondo de las avenidas (324).
 */
export const NIEBLA_A_PIE = { cerca: 8 * RETICULA_DE_LA_CIUDAD, lejos: 25 * RETICULA_DE_LA_CIUDAD } as const;

/**
 * LOS UMBRALES DE NIVEL MIENTRAS SE ANDA: el disco de detalle (L1) y hasta dónde llega el L2.
 * Las cifras y el porqué, en la cabecera: son las que caben en el presupuesto de la escena.
 */
export const UMBRALES_A_PIE: Readonly<Record<Calidad, { readonly alto: number; readonly medio: number }>> = {
  plena: { alto: UMBRALES_DE_NIVEL.plena.alto, medio: NIEBLA_A_PIE.lejos },
  sobria: { alto: 40, medio: NIEBLA_A_PIE.lejos },
};

/* ─── A qué altura está el suelo ─────────────────────────────────────────── */

/** Lo que se pisa por encima: los suelos de los distritos, el andén, el puente, la isleta y el forjado. */
const SUELOS_QUE_SE_PISAN: ReadonlySet<ClaseDeBulto> = new Set<ClaseDeBulto>([
  'pradera',
  'tierra',
  'asfalto',
  'cesped',
  'plaza-de-aparcamiento',
  'pista-de-colegio',
  'jardin',
  'isleta',
  'anden',
  'forjado',
  'puente',
]);

/**
 * EL TECHO DE UN SUELO: lo que suba más no se pisa, se pasa por debajo. El puente llega a 1,80 y
 * el primer forjado de arriba de la obra empieza en 5,10: 2,60 los separa sin rozar ninguno.
 */
export const TECHO_DE_UN_SUELO = ALTURA_DEL_BORDILLO + 2;

/** Una caja en planta con la cota a la que se pisa. */
interface SueloAlzado {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  readonly cota: number;
}

/** La caja en planta de un bulto, con su giro: las cuatro esquinas giradas como las gira `rotation.y`. */
function plantaDelBulto(b: BultoPropio): { x0: number; z0: number; x1: number; z1: number } {
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
  return { x0, z0, x1, z1 };
}

/**
 * LA MARCA DE LA CURVA SUAVE, sumada a las cuatro caras de una celda: su bordillo no dobla en
 * ángulo recto, dobla en un arco, y es lo único de las seis losas que las caras no dicen.
 */
export const CURVA_SUAVE = 16;

/**
 * EL ARCO DEL BORDILLO DE LA CURVA SUAVE, medido rasterizando la losa del `.glb` cada dos
 * centésimas y ajustando un círculo a su canto: el centro a 8,65 de las dos caras cerradas y 8,11
 * de radio —o sea tangente a una franja de 0,54, la del bordillo recto—, con un error medio de
 * dos centésimas. Sin él, esa losa sale en un 89,8 % de sus puntos; con él, en el que diga
 * `verify:burgo-escena`, que lo vuelve a medir contra el fichero.
 */
export const ACUERDO_DE_LA_CURVA_SUAVE = { centro: 8.65, radio: 8.11 } as const;

/** Las caras que abre la losa `pieza` girada `cuartos` cuartos, con la marca de la curva suave; −1 si no es una losa de calle. */
export function carasQueSePintan(pieza: string, cuartos: number): number {
  const base = CARAS_ABIERTAS[pieza];
  if (base === undefined) return -1;
  return mascaraGirada(base, cuartos) | (pieza === PIEZA.calzadaCurvaSuave ? CURVA_SUAVE : 0);
}

/**
 * LA COTA DE UNA LOSA DE CALLE en un punto suyo: `u` hacia el este y `v` hacia el sur, desde su
 * centro, y `abiertas` lo que da `carasQueSePintan`. Asfalto, salvo en la franja de bordillo de
 * una cara cerrada, en las cuatro esquinas y —en la curva suave— por fuera de su arco, que es como
 * están las seis losas del pack (`CARAS_ABIERTAS`, medido; y el arco, medido aquí).
 */
export function alturaEnLaLosa(abiertas: number, u: number, v: number): number {
  const medio = RETICULA_DE_LA_CIUDAD / 2;
  const dentro = medio - ANCHO_DEL_BORDILLO;
  const alEste = u > dentro;
  const alOeste = u < -dentro;
  const alSur = v > dentro;
  const alNorte = v < -dentro;
  if ((alEste || alOeste) && (alSur || alNorte)) return ALTURA_DEL_BORDILLO;
  if (alEste && (abiertas & CARA.este) === 0) return ALTURA_DEL_BORDILLO;
  if (alOeste && (abiertas & CARA.oeste) === 0) return ALTURA_DEL_BORDILLO;
  if (alSur && (abiertas & CARA.sur) === 0) return ALTURA_DEL_BORDILLO;
  if (alNorte && (abiertas & CARA.norte) === 0) return ALTURA_DEL_BORDILLO;
  if ((abiertas & CURVA_SUAVE) !== 0) {
    /* Lo lejos que está el punto de la cara cerrada de cada eje: el arco va en la esquina que hacen las dos. */
    const deX = (abiertas & CARA.oeste) === 0 ? u + medio : (abiertas & CARA.este) === 0 ? medio - u : null;
    const deZ = (abiertas & CARA.norte) === 0 ? v + medio : (abiertas & CARA.sur) === 0 ? medio - v : null;
    const { centro, radio } = ACUERDO_DE_LA_CURVA_SUAVE;
    if (deX !== null && deZ !== null && deX < centro && deZ < centro && Math.hypot(centro - deX, centro - deZ) > radio) return ALTURA_DEL_BORDILLO;
  }
  return ALTURA_DEL_ASFALTO;
}

/** La cota del anillo en un punto del tablero que no es del recinto: la de su banda. */
export function alturaEnElAnillo(x: number, z: number): number {
  const u = Math.abs(x);
  const v = Math.abs(z);
  if (u >= BORDE_INTERIOR && v >= BORDE_INTERIOR) return u > SUPERFICIE.hasta || v > SUPERFICIE.hasta ? ALTURA_DEL_BORDE : 0;
  const radial = Math.max(u, v);
  if (radial < FRANJA.hasta) return ALTURA_DEL_REBORDE;
  if (radial < FILETE.hasta) return ALTURA_DEL_FILETE;
  if (radial < SUPERFICIE.hasta) return 0;
  return ALTURA_DEL_BORDE;
}

/**
 * EL SUELO DEL BURGO QUE SE PINTA, como una función del punto. Se prepara UNA vez por ciudad —las
 * caras de cada losa de calle y los suelos alzados de cada celda— y después cada pregunta mira una
 * celda: se hace dos veces por fotograma.
 */
export function sueloDelBurgo(ciudad: LaCiudad): (x: number, z: number) => number {
  const n = ciudad.recinto.celdas;
  const desdeX = ciudad.recinto.centro.x - ciudad.recinto.lado / 2;
  const desdeZ = ciudad.recinto.centro.z - ciudad.recinto.lado / 2;
  const celdaDe = (v: number, desde: number): number => Math.min(n - 1, Math.max(0, Math.floor((v - desde) / RETICULA_DE_LA_CIUDAD)));

  /* Las caras que abre la losa que de verdad se pinta en cada celda de calle; −1 donde no hay losa. */
  const abiertas = new Int8Array(n * n).fill(-1);
  for (const p of ciudad.calzada) {
    const caras = carasQueSePintan(p.pieza, ((Math.round(p.giro / (Math.PI / 2)) % 4) + 4) % 4);
    if (caras < 0) continue;
    abiertas[celdaDe(p.z, desdeZ) * n + celdaDe(p.x, desdeX)] = caras;
  }

  /* Lo que se levanta del suelo y se pisa, apuntado en cada celda que toca. */
  const alzados = new Map<number, SueloAlzado[]>();
  for (const b of ciudad.fachadas) {
    if (!SUELOS_QUE_SE_PISAN.has(b.clase)) continue;
    const cota = b.y + Math.max(0, b.alto);
    if (cota > TECHO_DE_UN_SUELO) continue;
    const p = plantaDelBulto(b);
    const suelo: SueloAlzado = { ...p, cota };
    for (let j = celdaDe(p.z0, desdeZ); j <= celdaDe(p.z1, desdeZ); j++) {
      for (let i = celdaDe(p.x0, desdeX); i <= celdaDe(p.x1, desdeX); i++) {
        const k = j * n + i;
        const lista = alzados.get(k);
        if (lista === undefined) alzados.set(k, [suelo]);
        else lista.push(suelo);
      }
    }
  }

  return (x: number, z: number): number => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    /* Fuera del tablero está el campo, que no se pisa: la arena no deja llegar. */
    if (Math.abs(x) > MEDIO_LADO || Math.abs(z) > MEDIO_LADO) return 0;
    if (Math.abs(x - ciudad.recinto.centro.x) >= ciudad.recinto.lado / 2 || Math.abs(z - ciudad.recinto.centro.z) >= ciudad.recinto.lado / 2) return alturaEnElAnillo(x, z);
    const i = celdaDe(x, desdeX);
    const j = celdaDe(z, desdeZ);
    const k = j * n + i;
    const celda = ciudad.celdas[k];
    const caras = abiertas[k] ?? -1;
    let alto =
      celda !== undefined && esClaseDeCalle(celda.clase) && caras >= 0
        ? alturaEnLaLosa(caras, x - (desdeX + (i + 0.5) * RETICULA_DE_LA_CIUDAD), z - (desdeZ + (j + 0.5) * RETICULA_DE_LA_CIUDAD))
        : ALTURA_DEL_BORDILLO;
    for (const s of alzados.get(k) ?? []) if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1 && s.cota > alto) alto = s.cota;
    return alto;
  };
}
