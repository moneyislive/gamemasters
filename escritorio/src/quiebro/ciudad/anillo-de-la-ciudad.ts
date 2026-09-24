/**
 * LO QUE HAY DETRÁS DEL CERCO de la ciudad abierta (§2.5 de `docs/quiebro/CIUDAD-ABIERTA.md`): la ciudad que
 * no se juega, pintada para que el borde sea honrado.
 *
 *   · LA FILA DEL CERCO: al otro lado de la calle de fuera (los ejes ±264), a ±270, una fila CONTINUA de
 *     fachadas de 36 m de fondo que da la cara a la ciudad. Su frente cae justo en la cara de dentro de
 *     las cajas del cerco (±270 a ±272): es lo que se ve al estamparse contra el borde, así que se pinta
 *     con el mismo sombreador y el mismo cuidado que una manzana. Se corta en las rayas de las celdas —cada
 *     trozo va en la celda del anillo que lo toca, y entra y sale de la ventana como una manzana— y en las
 *     tres salidas de las avenidas, que son un pasillo de 24 m por el que la avenida sigue 20 m y se
 *     deshace en glifos (`borde.ts`).
 *   · LAS TORRES DE DETRÁS: una fila de solares pasada la fila del cerco, con torres de 60 a 180 m que
 *     asoman por encima de los tejados de la ciudad y dan el perfil de ciudad grande. Sólo van en lo
 *     lejano (`lejos.ts`): nunca se acercan a nadie.
 *
 * Nada de esto estorba a nadie (está fuera de ±270) ni viaja por el cable: sale de la semilla de la mesa,
 * igual en todos los aparatos.
 */
import type { CajaXZ, EdificioDelPlano, FachadaDelPlano, Orientacion } from './tipos';
import type { Plantas } from './anillo';
import { edificio, parcelas } from './anillo';
import { dadoDe, enteroCon } from './azar';
import type { SalidaDeAvenida } from './sintetica';
import { celdaDe, indiceDeCelda } from '../../../../shared/arcade/juegos/quiebro-ciudad';

/** Donde empieza la fila del cerco y lo que mide de fondo. */
export const FRENTE_DEL_CERCO = 270;
const FONDO_DE_LA_FILA = 36;
/** La fila de las torres: los solares de 48·7 ± 18. */
const TORRES_DESDE = 318;
const TORRES_HASTA = 354;
/** El pasillo de una salida: el ancho de la avenida. */
const MEDIO_PASILLO = 12;

const PRIMERA: Plantas = { bajo: [4, 11], torre: [12, 40] };
const SEGUNDA: Plantas = { bajo: [6, 14], torre: [19, 58] };

export interface AnilloDeLaCiudad {
  /** Los edificios de la fila del cerco, por índice de celda (`indiceDeCelda`). */
  readonly porCelda: ReadonlyMap<number, readonly EdificioDelPlano[]>;
  /** Las torres de detrás, sólo para lo lejano. */
  readonly lejanos: readonly EdificioDelPlano[];
  /** Las islas de suelo de detrás del cerco (la fila y los solares de las torres, con su acera). */
  readonly islas: readonly { readonly caja: CajaXZ; readonly manzana: CajaXZ }[];
  /** Hasta dónde llega todo esto. */
  readonly extension: CajaXZ;
}

interface Fila {
  /** El eje a lo largo del que corre la fila, y su lado (−1 norte/oeste, +1 sur/este). */
  readonly corre: 'x' | 'z';
  readonly lado: -1 | 1;
  readonly desde: number;
  readonly hasta: number;
}

/** Las cuatro filas: las de norte y sur llevan las esquinas. */
const FILAS: readonly Fila[] = [
  { corre: 'x', lado: -1, desde: -FRENTE_DEL_CERCO - FONDO_DE_LA_FILA, hasta: FRENTE_DEL_CERCO + FONDO_DE_LA_FILA },
  { corre: 'x', lado: 1, desde: -FRENTE_DEL_CERCO - FONDO_DE_LA_FILA, hasta: FRENTE_DEL_CERCO + FONDO_DE_LA_FILA },
  { corre: 'z', lado: -1, desde: -FRENTE_DEL_CERCO, hasta: FRENTE_DEL_CERCO },
  { corre: 'z', lado: 1, desde: -FRENTE_DEL_CERCO, hasta: FRENTE_DEL_CERCO },
];

/** La cara que da a la ciudad y la de atrás, según el lado de la fila. */
function carasDeLaFila(f: Fila): { dentro: Orientacion; fuera: Orientacion } {
  if (f.corre === 'x') return f.lado < 0 ? { dentro: 's', fuera: 'n' } : { dentro: 'n', fuera: 's' };
  return f.lado < 0 ? { dentro: 'e', fuera: 'o' } : { dentro: 'o', fuera: 'e' };
}

/** Un rectángulo de la fila: `a0..a1` a lo largo, `d0..d1` de fondo desde el frente (±270). */
function rectDeLaFila(f: Fila, a0: number, a1: number, d0: number, d1: number): CajaXZ {
  const p0 = f.lado * (FRENTE_DEL_CERCO + d0);
  const p1 = f.lado * (FRENTE_DEL_CERCO + d1);
  const [b0, b1] = p0 < p1 ? [p0, p1] : [p1, p0];
  return f.corre === 'x' ? { x0: a0, z0: b0, x1: a1, z1: b1 } : { x0: b0, z0: a0, x1: b1, z1: a1 };
}

/**
 * EL ANILLO de una ciudad: `salidas` son las de sus avenidas (cada una deja un pasillo sin fachadas), y
 * `semilla` la de la mesa.
 */
export function anilloDeLaCiudad(salidas: readonly SalidaDeAvenida[], semilla: number): AnilloDeLaCiudad {
  const dado = dadoDe((semilla ^ 0x2a11_0c17) >>> 0);
  const porCelda = new Map<number, EdificioDelPlano[]>();
  const islas: { caja: CajaXZ; manzana: CajaXZ }[] = [];
  for (const f of FILAS) {
    const { dentro, fuera } = carasDeLaFila(f);
    /* Los cortes de la fila: las rayas de las celdas y los pasillos de las salidas de este lado. */
    const cortes = new Set<number>([f.desde, f.hasta]);
    for (let k = -7; k <= 7; k++) {
      const c = 48 * k + 24;
      if (c > f.desde && c < f.hasta) cortes.add(c);
    }
    const pasillos: [number, number][] = [];
    for (const s of salidas) {
      if (s.eje === f.corre || s.sentido !== f.lado) continue;
      pasillos.push([s.linea - MEDIO_PASILLO, s.linea + MEDIO_PASILLO]);
      cortes.add(s.linea - MEDIO_PASILLO);
      cortes.add(s.linea + MEDIO_PASILLO);
    }
    const lista = [...cortes].sort((a, b) => a - b);
    const enUnPasillo = (a: number, b: number): boolean => pasillos.some(([p0, p1]) => a >= p0 - 0.01 && b <= p1 + 0.01);
    /* Las islas de suelo: la fila con su acera por los dos lados, partida en los pasillos. */
    let desdeIsla = f.desde;
    for (let k = 0; k < lista.length - 1; k++) {
      const a = lista[k] as number;
      const b = lista[k + 1] as number;
      if (enUnPasillo(a, b)) {
        if (a > desdeIsla) islas.push({ caja: rectDeLaFila(f, desdeIsla, a, -3, FONDO_DE_LA_FILA + 3), manzana: rectDeLaFila(f, desdeIsla, a, 0, FONDO_DE_LA_FILA) });
        desdeIsla = b;
      }
    }
    if (f.hasta > desdeIsla) islas.push({ caja: rectDeLaFila(f, desdeIsla, f.hasta, -3, FONDO_DE_LA_FILA + 3), manzana: rectDeLaFila(f, desdeIsla, f.hasta, 0, FONDO_DE_LA_FILA) });
    for (let k = 0; k < lista.length - 1; k++) {
      const a = lista[k] as number;
      const b = lista[k + 1] as number;
      if (b - a < 0.5 || enUnPasillo(a, b)) continue;
      /* Parcelas de 9 a 20 m a lo largo del trozo; la última se queda con lo que sobre. */
      let x = a;
      while (x < b - 0.01) {
        let w = 9 + Math.floor(dado() * 12);
        if (b - (x + w) < 9) w = b - x;
        const p = rectDeLaFila(f, x, x + w, 0, FONDO_DE_LA_FILA);
        const torre = dado() < 0.15;
        const e = edificio(dado, p, p, torre, enteroCon(dado, 0, 2 ** 31), PRIMERA);
        /* Las fachadas: la de la ciudad y la de atrás, y los costados que quedan al aire (en un pasillo o en
           la punta de la fila). Donde hay vecino, medianera. */
        const fachadas: FachadaDelPlano[] = [
          { mira: dentro, bajo: dado() < 0.6 ? 'tiendas' : 'portales' },
          { mira: fuera, bajo: 'portales' },
        ];
        const alAire = (v: number): boolean => Math.abs(v - f.desde) < 0.01 || Math.abs(v - f.hasta) < 0.01 || pasillos.some(([p0, p1]) => Math.abs(v - p0) < 0.01 || Math.abs(v - p1) < 0.01);
        const [bajoIzq, bajoDer]: [Orientacion, Orientacion] = f.corre === 'x' ? ['o', 'e'] : ['n', 's'];
        if (alAire(x)) fachadas.push({ mira: bajoIzq, bajo: 'portales' });
        if (alAire(x + w)) fachadas.push({ mira: bajoDer, bajo: 'portales' });
        const celda = celdaDe((p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2);
        if (celda !== null) {
          const clave = indiceDeCelda(celda.i, celda.j);
          const lista2 = porCelda.get(clave) ?? [];
          lista2.push({ ...e, fachadas });
          porCelda.set(clave, lista2);
        }
        x += w;
      }
    }
  }
  /* Las torres de detrás: los solares de la rejilla pasada la fila, con la calle entre ellos. */
  const lejanos: EdificioDelPlano[] = [];
  for (let i = -7; i <= 7; i++) {
    for (let j = -7; j <= 7; j++) {
      if (Math.abs(i) < 7 && Math.abs(j) < 7) continue;
      const s: CajaXZ = { x0: 48 * i - 18, z0: 48 * j - 18, x1: 48 * i + 18, z1: 48 * j + 18 };
      if (Math.abs(s.x0) < TORRES_DESDE - 0.5 && Math.abs(s.x1) < TORRES_DESDE - 0.5 && Math.abs(s.z0) < TORRES_DESDE - 0.5 && Math.abs(s.z1) < TORRES_DESDE - 0.5) continue;
      islas.push({ caja: { x0: s.x0 - 3, z0: s.z0 - 3, x1: s.x1 + 3, z1: s.z1 + 3 }, manzana: s });
      for (const p of parcelas(dado, s)) lejanos.push(edificio(dado, p, s, dado() < 0.75, enteroCon(dado, 0, 2 ** 31), SEGUNDA));
    }
  }
  const lejos = TORRES_HASTA + 6;
  return { porCelda, lejanos, islas, extension: { x0: -lejos, z0: -lejos, x1: lejos, z1: lejos } };
}
