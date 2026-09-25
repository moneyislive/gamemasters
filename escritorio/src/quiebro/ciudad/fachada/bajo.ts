/**
 * LA PLANTA BAJA EN LA GEOMETRÍA: el muro de las caras del volumen 0 (el de la planta baja) y las tarjetas de
 * los escaparates encendidos.
 *
 * Hoy el muro del bajo es el de cualquier otra cara (`escribirElMuro`): el escaparate, la persiana y el portal
 * los pinta el sombreador (`TRAMO_DEL_BAJO`) sobre el plano de la fachada. Vive aparte para que el bajo pueda
 * hundirse (partir la cara por tienda y meter el hueco) sin tocar el muro de las demás caras.
 *
 * ═══ LO QUE VIVE DOS VECES ═══
 *
 * `escaparatesDe` reparte las tiendas con la cuenta del sombreador —una cada `LARGO_DE_UNA_TIENDA`, la última
 * hasta el canto— y enciende las mismas que `queTiendaQ` (`queTienda`, `hash.ts`). Si se toca uno, se toca el
 * otro, o habrá tarjetas de reflejo delante de persianas.
 */
import type { Molde } from '../geometria';
import { LARGO_DE_UNA_TIENDA, hashQ as hashDelJs, queTienda } from '../hash';
import type { EdificioDelPlano } from '../tipos';
import type { CaraDelVolumen, ObraDeLaFachada, VentanaEncendida } from './tipos-de-cara';
import { escribirElMuro, normalDe } from './caras';

/** EL MURO DE UNA CARA DEL VOLUMEN 0. Hoy, el de cualquier cara (ver la cabecera). Cede al acabar la cara. */
export function* muroDelBajo(m: Molde, e: EdificioDelPlano, c: CaraDelVolumen, obra: ObraDeLaFachada): Generator<void, void, void> {
  yield* escribirElMuro(m, e, c, obra);
}

/** Los escaparates encendidos de una cara: la MISMA cuenta que el sombreador (`queTienda`), una tienda cada 6 m. */
export function escaparatesDe(c: CaraDelVolumen, ventanas: VentanaEncendida[], obra: ObraDeLaFachada): void {
  const { cara, semilla, toques } = c;
  const ancho = cara.hasta - cara.desde;
  const nT = Math.max(1, Math.floor(ancho / LARGO_DE_UNA_TIENDA));
  for (let t = 0; t < nT; t++) {
    if (queTienda(t, semilla, false) !== 1) continue;
    const t0 = t * LARGO_DE_UNA_TIENDA;
    const t1 = t === nT - 1 ? ancho : t0 + LARGO_DE_UNA_TIENDA;
    const a = cara.desde + (t0 + t1) / 2;
    if (toques.some((k) => a >= k.desde && a <= k.hasta && k.y0 < 2)) continue;
    const hc = hashDelJs(t, 5, semilla);
    const color: readonly [number, number, number] = hc < 0.5 ? [0.85, 0.95, 1.0] : hc < 0.8 ? [1.0, 0.78, 0.5] : [1.0, 0.6, 0.85];
    const [nx, nz] = normalDe(cara.mira);
    const [px, pz] = cara.mira === 'n' || cara.mira === 's' ? [a, cara.plano] : [cara.plano, a];
    ventanas.push({ x: px + nx * 0.05, y: 1.7, z: pz + nz * 0.05, color, escaparate: true, normal: [nx, nz] });
  }
}
