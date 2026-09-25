/**
 * EL VIADUCTO DEL ELEVADO, celda a celda: los pilares de la celda (con su zapata y su capitel, dentro de la caja
 * hasta la cabeza) y el tramo de viga que cae en ella, con sus petos, sus carriles y la franja de luz verde-cian
 * que se ve de lejos (§2.7 de `docs/quiebro/CIUDAD-ABIERTA.md`: «el Elevado, con su franja de luz»). Cortado en la
 * raya de la celda: el tramo de al lado lo pone la otra.
 *
 * `viaductoDeLaCelda` es el escritor de su familia en la celda (`EscritorDeLaCelda` de `celdas.ts`) y `viaducto`
 * la pieza (`EscritorDePieza`): hoy de un paso, pilares y tramo juntos.
 */
import { ACABADO, lineal } from './materiales';
import { HORMIGON, bloque, centro, tono } from './mobiliario';
import type { CajaXZ } from './tipos';
import type { ObraDeLaCelda, ParteDeLaCelda } from './celdas';

/** Un tramo del viaducto del Elevado: la viga de `desde` a `hasta` a lo largo de `eje`. */
export interface TramoDeViaducto {
  readonly eje: 'x' | 'z';
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
  readonly alto: number;
}

/** Lo que el viaducto escribe en una celda: su tramo de viga (si pasa por ella) y sus pilares. */
export interface ViaductoDeLaCelda {
  readonly tramo: TramoDeViaducto | null;
  readonly pilares: readonly CajaXZ[];
}

/** LOS PILARES Y EL TRAMO DE VIGA de una celda (ver la cabecera). */
export function* viaducto(obra: ObraDeLaCelda, v: ViaductoDeLaCelda): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const t = v.tramo;
  tono(mo, HORMIGON, ACABADO.hormigon);
  const alto = t?.alto ?? 7.5;
  for (const p of v.pilares) {
    const [x, z] = centro(p);
    const lado = Math.min(p.x1 - p.x0, p.z1 - p.z0);
    bloque(mo, x, 0, z, lado, 0.35, lado);
    bloque(mo, x, 0.35, z, lado - 0.15, alto - 0.35 - 0.45, lado - 0.15);
    bloque(mo, x, alto - 0.45, z, lado + 0.4, 0.45, lado + 0.4);
  }
  if (t !== null && t.hasta - t.desde >= 0.01) {
    const enX = t.eje === 'x';
    const [x0, x1, z0, z1] = enX ? [t.desde, t.hasta, t.linea - 1.9, t.linea + 1.9] : [t.linea - 1.9, t.linea + 1.9, t.desde, t.hasta];
    tono(mo, HORMIGON, ACABADO.hormigon);
    mo.caja(x0, t.alto, z0, x1, t.alto + 0.9, z1, enX ? 'nsab' : 'eoab');
    tono(mo, lineal(0x3a3d3f), ACABADO.hierroViejo);
    if (enX) {
      mo.caja(x0, t.alto + 0.9, z0, x1, t.alto + 1.45, z0 + 0.12, 'nsa');
      mo.caja(x0, t.alto + 0.9, z1 - 0.12, x1, t.alto + 1.45, z1, 'nsa');
      for (const r of [-0.72, 0.72]) mo.caja(x0, t.alto + 0.9, t.linea + r - 0.04, x1, t.alto + 1.02, t.linea + r + 0.04, 'nsa');
    } else {
      mo.caja(x0, t.alto + 0.9, z0, x0 + 0.12, t.alto + 1.45, z1, 'eoa');
      mo.caja(x1 - 0.12, t.alto + 0.9, z0, x1, t.alto + 1.45, z1, 'eoa');
      for (const r of [-0.72, 0.72]) mo.caja(t.linea + r - 0.04, t.alto + 0.9, z0, t.linea + r + 0.04, t.alto + 1.02, z1, 'eoa');
    }
    /* La franja de luz bajo el peto, por los dos lados: el Elevado se lee de noche desde cualquier calle. */
    em.color(0.16, 1.1, 0.85);
    em.poner('aEmisor', 0, 0);
    if (enX) {
      em.caja(x0, t.alto + 0.35, z0 - 0.01, x1, t.alto + 0.45, z0, 'n');
      em.caja(x0, t.alto + 0.35, z1, x1, t.alto + 0.45, z1 + 0.01, 's');
    } else {
      em.caja(x0 - 0.01, t.alto + 0.35, z0, x0, t.alto + 0.45, z1, 'o');
      em.caja(x1, t.alto + 0.35, z0, x1 + 0.01, t.alto + 0.45, z1, 'e');
    }
  }
  yield;
}

/** EL VIADUCTO DE UNA CELDA (el escritor de su familia, ver `celdas.ts`): su tramo y sus pilares, que estorban. */
export function* viaductoDeLaCelda(obra: ObraDeLaCelda, parte: ParteDeLaCelda): Generator<void, void, void> {
  yield* viaducto(obra, { tramo: parte.viaducto, pilares: parte.pilares });
  obra.estorba.push(...parte.pilares);
}
