/**
 * EL MOBILIARIO DE UNA CELDA: qué pieza va en cada caja y en qué orden se escriben. Es el escritor de su familia
 * (`EscritorDeLaCelda` de `celdas.ts`): cada pieza (`EscritorDePieza`) escribe en los moldes de la obra y cede; su
 * luz va a `obra.luces` y su caja a `obra.estorba`.
 *
 * El orden es el de siempre (farolas, farolas de pared, bancos, fuentes, quioscos, quioscos de prensa, cabinas,
 * vallas, cortes, árboles, estatuas, contenedores, carretillas, muelles y el soportal de las plazas): de él sale
 * el orden de los vértices de la malla, y cambiarlo cambia lo que suben las celdas sin cambiar nada de lo que se
 * ve. El soportal de las plazas va el último del mobiliario y antes que el viaducto (`viaducto.ts`), que en la
 * celda iba antes: en ninguna celda de las 32 trazas hay viaducto y soportal de plaza a la vez, así que el orden de
 * lo escrito es el mismo.
 */
import type { LuzDelMobiliario } from './mobiliario';
import { banco, cabina, fuente, quiosco, quioscoDePrensa, valla } from './mobiliario';
import { farola, farolaDePared } from './farolas';
import { arbol, carretilla, contenedor, corte, estatua, muelle, soportalDePlaza } from './piezas';
import type { ObraDeLaCelda, ParteDeLaCelda } from './celdas';

/** Apunta en la obra lo que devuelve una pieza: una luz, unas luces o nada. */
function apuntar(obra: ObraDeLaCelda, luz: LuzDelMobiliario | readonly LuzDelMobiliario[] | void): void {
  if (luz === undefined) return;
  if (Array.isArray(luz)) obra.luces.push(...(luz as readonly LuzDelMobiliario[]));
  else obra.luces.push(luz as LuzDelMobiliario);
}

/** EL MOBILIARIO DE UNA CELDA, pieza a pieza (ver la cabecera). */
export function* mobiliarioDeLaCelda(obra: ObraDeLaCelda, parte: ParteDeLaCelda): Generator<void, void, void> {
  for (const f of parte.farolas) {
    apuntar(obra, yield* farola(obra, f));
    obra.estorba.push(f.caja);
  }
  for (const l of parte.lamparas) apuntar(obra, yield* farolaDePared(obra, l));
  for (const b of parte.bancos) {
    yield* banco(obra, b);
    obra.estorba.push(b.caja);
  }
  for (const f of parte.fuentes) {
    yield* fuente(obra, f);
    obra.estorba.push(f.caja);
  }
  for (const q of parte.quioscos) {
    apuntar(obra, yield* quiosco(obra, q));
    obra.estorba.push(q.caja);
  }
  for (const q of parte.quioscosDePrensa) {
    apuntar(obra, yield* quioscoDePrensa(obra, q));
    obra.estorba.push(q.caja);
  }
  for (const c of parte.cabinas) {
    apuntar(obra, yield* cabina(obra, c));
    obra.estorba.push(c.caja);
  }
  for (const v of parte.vallas) {
    apuntar(obra, yield* valla(obra, v));
    obra.estorba.push(v);
  }
  for (const c of parte.cortes) {
    apuntar(obra, yield* corte(obra, c));
    obra.estorba.push(c);
  }
  for (const t of parte.troncos) {
    yield* arbol(obra, t);
    obra.estorba.push(t);
  }
  for (const e of parte.estatuas) {
    yield* estatua(obra, e);
    obra.estorba.push(e);
  }
  for (const c of parte.contenedores) {
    yield* contenedor(obra, c);
    obra.estorba.push(c.caja);
  }
  for (const c of parte.carretillas) {
    yield* carretilla(obra, c);
    obra.estorba.push(c.caja);
  }
  for (const c of parte.muelles) {
    yield* muelle(obra, c);
    obra.estorba.push(c.caja);
  }
  /* El soportal de las plazas: cada pilar (con su caja), y después sus techos, por encima de la cabeza. */
  for (const p of parte.pilaresDePlaza) {
    yield* soportalDePlaza(obra, { pilares: [p], techos: [] });
    obra.estorba.push(p);
  }
  yield* soportalDePlaza(obra, { pilares: [], techos: parte.techosDePlaza });
}
