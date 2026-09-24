/**
 * DE LAS LUCES DE LAS PIEZAS A LAS FUENTES: lo que cada farola, cabina, quiosco, rótulo, escaparate y
 * ventana baja pone en el mapa horneado de la luz de la calle, en las tarjetas de reflejo y en los halos.
 *
 * Vive aparte porque lo usan dos: el barrio de hoy (`construir.ts`, todo de una vez) y la ciudad abierta
 * (`celdas.ts`, celda a celda). Con la regla en un solo sitio, la farola de la ciudad ilumina, brilla en el
 * charco y hace halo exactamente como la del barrio: la pasada de arte anterior se conserva sin copiarla.
 */
import type { FuenteHorneada } from './luz-de-la-calle';
import type { FuenteDeReflejo } from './reflejos';
import type { FuenteDeHalo } from './halos';
import type { LuzDelMobiliario } from './mobiliario';
import type { FuenteDeRotulo } from './neones';
import type { VentanaEncendida } from './fachadas';
import { INTENSIDAD_DE_FAROLA } from '../atmosfera/luz';

/** El sodio, lineal. */
const SODIO: readonly [number, number, number] = [1.0, 0.52, 0.16];

function escalar(c: readonly [number, number, number], k: number): [number, number, number] {
  return [c[0] * k, c[1] * k, c[2] * k];
}

/** Una cabeza de farola: donde se recolocan las luces de verdad de N2+ y de donde cuelgan los haces. */
export interface CabezaDeFarola {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface FuentesDeLuz {
  readonly horneadas: FuenteHorneada[];
  readonly reflejos: FuenteDeReflejo[];
  readonly halos: FuenteDeHalo[];
  readonly cabezas: CabezaDeFarola[];
}

/**
 * REPARTE LAS LUCES en fuentes. `reflejosDeVentanas`: cuántas ventanas encendidas (no escaparates) se
 * reflejan como mucho; se eligen las más bajas, que son las que se ven en el charco.
 */
export function repartirLasLuces(
  luces: readonly LuzDelMobiliario[],
  rotulos: readonly FuenteDeRotulo[],
  cochesEncendidos: readonly { readonly x: number; readonly y: number; readonly z: number; readonly color: readonly [number, number, number] }[],
  ventanas: readonly VentanaEncendida[],
  reflejosDeVentanas: number,
): FuentesDeLuz {
  const horneadas: FuenteHorneada[] = [];
  const reflejos: FuenteDeReflejo[] = [];
  const halos: FuenteDeHalo[] = [];
  const cabezas: CabezaDeFarola[] = [];

  for (const l of luces) {
    if (l.tipo === 'farola') {
      cabezas.push({ x: l.x, y: l.y, z: l.z });
      horneadas.push({ x: l.x, y: l.y, z: l.z, intensidad: INTENSIDAD_DE_FAROLA, color: null, alcance: 24 });
      reflejos.push({ x: l.x, y: l.y, z: l.z, tamano: 0.3, color: escalar(SODIO, 10), farola: true });
      halos.push({ x: l.x, y: l.y - 0.05, z: l.z, radio: 1.6, color: escalar(SODIO, 2.4), farola: true, parpadeo: 0 });
    } else if (l.tipo === 'cabina') {
      const ambar: [number, number, number] = [1.0, 0.45, 0.08];
      horneadas.push({ x: l.x, y: l.y, z: l.z, intensidad: 5, color: ambar, alcance: 5 });
      reflejos.push({ x: l.x, y: l.y, z: l.z, tamano: 0.15, color: escalar(ambar, 4), farola: false });
      halos.push({ x: l.x, y: l.y, z: l.z, radio: 0.7, color: escalar(ambar, 1.6), farola: false, parpadeo: 0 });
    } else if (l.tipo === 'quiosco') {
      const calida: [number, number, number] = [1.0, 0.72, 0.45];
      horneadas.push({ x: l.x, y: l.y, z: l.z, intensidad: 30, color: calida, alcance: 9 });
      reflejos.push({ x: l.x, y: l.y, z: l.z, tamano: 1.2, color: escalar(calida, 1.4), farola: false });
    } else if (l.tipo === 'prensa') {
      const blanca: [number, number, number] = [1.0, 0.9, 0.6];
      horneadas.push({ x: l.x, y: l.y, z: l.z, intensidad: 5, color: blanca, alcance: 5 });
      reflejos.push({ x: l.x, y: l.y, z: l.z, tamano: 0.6, color: escalar(blanca, 1.2), farola: false });
    } else {
      halos.push({ x: l.x, y: l.y, z: l.z, radio: 0.45, color: [1.2, 0.5, 0.05], farola: false, parpadeo: 0 });
    }
  }
  for (const r of rotulos) {
    horneadas.push({ x: r.x, y: r.y, z: r.z, intensidad: 9 * r.tamano, color: r.color, alcance: 11, haciaFuera: r.normal });
    reflejos.push({ x: r.x, y: r.y, z: r.z, tamano: r.tamano * 0.4, color: escalar(r.color, 4.5), farola: false });
    halos.push({ x: r.x, y: r.y, z: r.z, radio: r.tamano * 0.7, color: escalar(r.color, 0.8), farola: false, parpadeo: r.parpadeo });
  }
  for (const c of cochesEncendidos) halos.push({ x: c.x, y: c.y, z: c.z, radio: 0.35, color: escalar(c.color, 1.2), farola: false, parpadeo: 0 });
  let ventanasPuestas = 0;
  for (const v of [...ventanas].sort((a, b) => a.y - b.y)) {
    if (v.escaparate) {
      horneadas.push({ x: v.x + v.normal[0] * 0.3, y: 1.8, z: v.z + v.normal[1] * 0.3, intensidad: 14, color: v.color, alcance: 8, haciaFuera: v.normal });
      reflejos.push({ x: v.x, y: v.y, z: v.z, tamano: 1.1, color: escalar(v.color, 1.5), farola: false });
    } else if (ventanasPuestas < reflejosDeVentanas) {
      ventanasPuestas++;
      reflejos.push({ x: v.x, y: v.y, z: v.z, tamano: 0.4, color: escalar(v.color, 0.9), farola: false });
    }
  }
  return { horneadas, reflejos, halos, cabezas };
}
