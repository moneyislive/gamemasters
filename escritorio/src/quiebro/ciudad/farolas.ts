/**
 * LAS FAROLAS: la de calle (pie, fuste y brazo sobre la calzada), la de plaza (farol en lo alto) y la de pared
 * (ménsula en la fachada, sin caja). Cada una es un escritor de pieza (`EscritorDePieza` de `celdas.ts`): escribe
 * en los moldes de su obra, cede y devuelve su luz.
 *
 * ═══ LA LUZ NO SE MUEVE ═══
 *
 * La luz que devuelve cada farola alimenta la luz horneada de la calle, los halos, las tarjetas de reflejo y las
 * luces de verdad de N2+. Tiene que salir en el MISMO sitio en todos los grados: la luz de las celdas de fuera de
 * la ventana se saca en grado 1 (`fuentesDeLaCelda`), y si la cabeza subiera con el grado, el halo se quedaría
 * colgando debajo de la farola.
 */
import type { V3 } from './geometria';
import { ACABADO } from './materiales';
import type { LuzDelMobiliario } from './mobiliario';
import { H, HIERRO, HIERRO_VERDE, SODIO_HDR, bloque, colocar, tono } from './mobiliario';
import { normalDe } from './fachadas';
import type { FarolaDelPlano, Orientacion } from './tipos';
import type { LamparaDePared, ObraDeLaCelda } from './celdas';

/** Farola de calle: pie, fuste, brazo sobre la calzada y cabeza con el vidrio de sodio. */
export function* farolaDeCalle(obra: ObraDeLaCelda, f: { readonly x: number; readonly z: number; readonly brazo: Orientacion }): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const lados = obra.lados;
  const { x, z, brazo } = f;
  const [dx, dz] = normalDe(brazo);
  tono(mo, HIERRO, ACABADO.hierro);
  mo.cilindro(x, z, H, H + 0.55, 0.2, 0.15, lados, true);
  mo.cilindro(x, z, H + 0.55, H + 5.9, 0.085, 0.06, lados, true);
  const p = (a: number, y: number): V3 => [x + dx * a, H + y, z + dz * a];
  mo.tubo([p(0, 5.55), p(0.25, 5.95), p(0.8, 6.15), p(1.25, 6.18)], 0.045, Math.max(4, lados - 2));
  mo.con(colocar(x + dx * 1.35, H + 6.05, z + dz * 1.35, brazo), () => {
    bloque(mo, 0, 0.02, 0, 0.3, 0.16, 0.58);
    em.con(colocar(x + dx * 1.35, H + 6.05, z + dz * 1.35, brazo), () => {
      em.color(SODIO_HDR[0], SODIO_HDR[1], SODIO_HDR[2]);
      em.poner('aEmisor', 1, 0);
      em.losa(-0.12, -0.24, 0.12, 0.24, 0.01, false);
    });
  });
  yield;
  return { x: x + dx * 1.35, y: H + 6.0, z: z + dz * 1.35, tipo: 'farola' };
}

/** Farola de plaza: pedestal, fuste y farol hexagonal con su sombrerete. */
export function* farolaDePlaza(obra: ObraDeLaCelda, f: { readonly x: number; readonly z: number }): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const lados = obra.lados;
  const { x, z } = f;
  tono(mo, HIERRO_VERDE, ACABADO.hierro);
  bloque(mo, x, H, z, 0.46, 0.55, 0.46);
  mo.cilindro(x, z, H + 0.55, H + 0.8, 0.16, 0.1, lados, false);
  mo.cilindro(x, z, H + 0.8, H + 3.75, 0.1, 0.075, lados, false);
  mo.cilindro(x, z, H + 3.75, H + 3.85, 0.2, 0.2, 6, true);
  mo.cilindro(x, z, H + 4.45, H + 4.75, 0.3, 0.04, 6, true);
  mo.cilindro(x, z, H + 4.75, H + 4.95, 0.04, 0.02, 4, false);
  em.color(SODIO_HDR[0] * 0.7, SODIO_HDR[1] * 0.7, SODIO_HDR[2] * 0.7);
  em.poner('aEmisor', 1, 0);
  em.cilindro(x, z, H + 3.85, H + 4.45, 0.19, 0.25, 6, false);
  yield;
  return { x, y: H + 4.15, z, tipo: 'farola' };
}

/** Una farola de pie del plano: de calle si tiene brazo, de plaza si no. */
export function* farola(obra: ObraDeLaCelda, f: FarolaDelPlano): Generator<void, LuzDelMobiliario, void> {
  const brazo = f.brazo;
  return brazo === null ? yield* farolaDePlaza(obra, f) : yield* farolaDeCalle(obra, { x: f.x, z: f.z, brazo });
}

/**
 * UNA FAROLA DE PARED: una ménsula de hierro a `alto` metros que sale 0,7 m de la fachada, con su farol
 * y el vidrio de sodio. Va por encima de la cabeza y no tiene caja (§2.4): la ponen las calles que no
 * llevan farolas de pie.
 */
export function* farolaDePared(obra: ObraDeLaCelda, l: LamparaDePared): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const lados = obra.lados;
  const { x, z, mira, alto } = l;
  const [nx, nz] = normalDe(mira);
  tono(mo, HIERRO, ACABADO.hierro);
  const p = (a: number, y: number): V3 => [x + nx * a, y, z + nz * a];
  mo.tubo([p(0.02, alto - 0.35), p(0.3, alto - 0.05), p(0.7, alto)], 0.03, Math.max(4, lados - 2));
  mo.con(colocar(x + nx * 0.7, alto - 0.05, z + nz * 0.7, mira), () => {
    bloque(mo, 0, 0, 0, 0.26, 0.12, 0.26);
    bloque(mo, 0, 0.12, 0, 0.12, 0.08, 0.12);
  });
  em.con(colocar(x + nx * 0.7, alto - 0.05, z + nz * 0.7, mira), () => {
    em.color(SODIO_HDR[0] * 0.8, SODIO_HDR[1] * 0.8, SODIO_HDR[2] * 0.8);
    em.poner('aEmisor', 1, 0);
    bloque(em, 0, -0.28, 0, 0.2, 0.28, 0.2, 'nseob');
  });
  yield;
  return { x: x + nx * 0.7, y: alto - 0.2, z: z + nz * 0.7, tipo: 'farola' };
}
