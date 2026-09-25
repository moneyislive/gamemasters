/**
 * EL SOPORTAL DE UN EDIFICIO: el techo (la cara de abajo del cuerpo que vuela sobre la acera) y sus pilares.
 * Los pilares son estructura: sus cajas están en `huellasDeLasFachadas`, y lo que se pinte entre 0,2 y 1,9 m
 * tiene que quedar dentro de ellas. `soportalDePlaza` (`piezas.ts`) es el de las plazas porticadas, aparte.
 *
 * `soportalDelEdificio` cede al acabar el edificio, lleve soportal o no, como siempre.
 */
import type { Molde } from '../geometria';
import { NUMERO_DEL_ESTILO } from '../hash';
import type { EdificioDelPlano } from '../tipos';
import { BAJO, TIPO } from './tipos-de-cara';
import type { ObraDeLaFachada } from './tipos-de-cara';
import { tinteDe } from './caras';

/** EL SOPORTAL de `e`, si lo tiene. Cede al acabar. */
export function* soportalDelEdificio(m: Molde, e: EdificioDelPlano, obra: ObraDeLaFachada): Generator<void, void, void> {
  escribirElSoportal(m, e);
  yield;
}

/** El techo del soportal (la cara de abajo del cuerpo que vuela) y sus pilares. */
function escribirElSoportal(m: Molde, e: EdificioDelPlano): void {
  if (e.soportales.length === 0) return;
  const estilo = NUMERO_DEL_ESTILO[e.estilo];
  const tinte = tinteDe(e);
  const h = e.huella;
  const b = e.caja;
  const y = e.plantaBaja;
  m.poner('aCara', 1, estilo, 0, TIPO.techoDeSoportal);
  m.poner('aVolumen', e.plantaBaja, y, tinte, e.vano);
  m.poner('aPlanta', e.alturaDePlanta, BAJO.sinCalle);
  /* Con soportal en dos caras que hacen esquina, el techo de la esquina lo pone el de la cara norte o sur:
     dos losas en el mismo plano parpadearían. */
  const tiene = (o: string): boolean => e.soportales.some((x) => x.mira === o);
  const z0 = tiene('n') ? b.z0 : h.z0;
  const z1 = tiene('s') ? b.z1 : h.z1;
  for (const { mira: s } of e.soportales) {
    if (s === 'n') m.losa(h.x0, h.z0, h.x1, b.z0, y, false);
    else if (s === 's') m.losa(h.x0, b.z1, h.x1, h.z1, y, false);
    else if (s === 'e') m.losa(b.x1, z0, h.x1, z1, y, false);
    else m.losa(h.x0, z0, b.x0, z1, y, false);
  }
  m.poner('aCara', 1, estilo, 0, TIPO.relieve);
  for (const p of e.pilares) m.caja(p.x0, 0, p.z0, p.x1, y, p.z1, 'nseo');
}
