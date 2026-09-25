/**
 * LO QUE VA EN EL SUELO DE LA CALLE: las tapas de alcantarilla en el eje de la calzada y las rejillas de los
 * imbornales junto al bordillo. Todo por debajo de la cabeza y a ras de suelo (no estorba: el comprobador mira
 * de 0,2 a 1,9 m).
 *
 * `sueloDeLaCelda` es el escritor de su familia en la celda (`EscritorDeLaCelda` de `celdas.ts`): el último,
 * después de los rótulos. Las bocas de las tapas van a la obra: de ellas sale el vapor.
 */
import { ACABADO, lineal } from './materiales';
import { tono } from './mobiliario';
import type { CajaXZ, CalleDelPlano } from './tipos';
import { azarEn } from './azar';
import { BORDE_DE_LA_CIUDAD } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { ObraDeLaCelda, ParteDeLaCelda } from './celdas';

/** Dónde se ponen las tapas: unas calles y la caja de la que no se salen. */
export interface TapasDeLasCalles {
  readonly calles: readonly CalleDelPlano[];
  readonly limite: CajaXZ;
}

/**
 * Las alcantarillas: tapas redondas en el eje de cada tramo de calzada y rejillas junto al
 * bordillo. Van a 1,5 cm sobre el asfalto (una tapa de verdad sobresale un poco, y así no parpadea).
 * Devuelve las bocas (para el vapor). De un paso.
 */
export function* alcantarillas(obra: ObraDeLaCelda, t: TapasDeLasCalles): Generator<void, { x: number; z: number }[], void> {
  const mo = obra.m.mobiliario;
  const lados = obra.lados;
  const { calles, limite } = t;
  const salida: { x: number; z: number }[] = [];
  for (const c of calles) {
    for (let s = c.desde + 11; s < c.hasta - 5; s += 24) {
      const cruza = calles.some((o) => o.corre !== c.corre && Math.abs(s - o.en) < o.calzada / 2 + o.acera + 2);
      if (cruza) continue;
      const lado = azarEn(Math.round(s * 4), Math.round(c.en * 4)) < 0.5 ? -1 : 1;
      const x = c.corre === 'z' ? c.en + lado * 0.9 : s;
      const z = c.corre === 'z' ? s : c.en + lado * 0.9;
      if (x < limite.x0 || x > limite.x1 || z < limite.z0 || z > limite.z1) continue;
      tono(mo, lineal(0x121314), ACABADO.hierroViejo);
      mo.cilindro(x, z, 0, 0.015, 0.36, 0.34, Math.max(8, lados + 2), true);
      salida.push({ x, z });
      /* La rejilla del imbornal, pegada al bordillo. */
      const r = c.calzada / 2 - 0.25;
      const gx = c.corre === 'z' ? c.en - lado * r : s + 3;
      const gz = c.corre === 'z' ? s + 3 : c.en - lado * r;
      tono(mo, lineal(0x0c0d0e), ACABADO.hierroViejo);
      if (c.corre === 'z') mo.caja(gx - 0.18, 0, gz - 0.35, gx + 0.18, 0.012, gz + 0.35, 'a');
      else mo.caja(gx - 0.35, 0, gz - 0.18, gx + 0.35, 0.012, gz + 0.18, 'a');
    }
  }
  yield;
  return salida;
}

/** EL SUELO DE UNA CELDA (el escritor de su familia, ver `celdas.ts`): las tapas de sus medias calles, y sus bocas a la obra. */
export function* sueloDeLaCelda(obra: ObraDeLaCelda, parte: ParteDeLaCelda): Generator<void, void, void> {
  const bocas = yield* alcantarillas(obra, { calles: obra.ciudad.calles, limite: parte.caja });
  for (const b of bocas) if (Math.abs(b.x) < BORDE_DE_LA_CIUDAD && Math.abs(b.z) < BORDE_DE_LA_CIUDAD) obra.bocas.push(b);
}
