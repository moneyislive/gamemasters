/**
 * ¿EL BOTÍN DE LA REFRIEGA SÓLO LO METE EL SERVIDOR, Y SÓLO ENTRE DOS SENTADOS DISTINTOS?
 *
 *   npm run verify:botin -w server
 *
 * El botín (`shared/arcade/juegos/botin.ts`) es el único movimiento, además del tic, que entra en
 * una mesa en nombre de nadie: lo mete el servidor cuando alguien cae en Boots on Board, y mueve
 * cosas de valor de un asiento a otro. Por eso su lector es estricto como el del canal —una clave
 * de más, un asiento que no está sentado, el mismo asiento dos veces, `null`— y, sobre todo, dice
 * que NO a cualquier cosa que llegue con `quien`: un botín que manda un asiento es un aparato que
 * se roba a sí mismo los bolsillos de los demás.
 *
 * Sin servidor ni red: que el servidor lo meta por la vía interna lo prueba el comprobador de la
 * sala; que cada juego lo atienda, su bloque aquí abajo.
 */
import {
  esBotin,
  leerElBotin,
  movimientoDelBotin,
  TIPO_DEL_BOTIN,
} from '../../shared/arcade/juegos/botin';

const fallos: string[] = [];
let hechas = 0;

function comprobar(que: string, bien: boolean, detalle?: unknown): void {
  hechas++;
  if (bien) return;
  const cola = detalle === undefined ? '' : ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`;
  fallos.push(`${que}${cola}`);
}

/* ─── El lector ──────────────────────────────────────────────────────────── */

const SENTADOS = ['ana', 'bea', 'cid'] as const;

comprobar('el tipo es del prefijo reservado de la plataforma', TIPO_DEL_BOTIN.startsWith('arcade:'));
{
  const mov = movimientoDelBotin('ana', 'bea');
  comprobar('el movimiento que construye el servidor es un botín', esBotin(mov), mov);
  const leido = leerElBotin(mov.carga, null, SENTADOS);
  comprobar(
    'y se lee tal cual: quién lo pierde y quién se lo lleva',
    leido !== null && leido.de === 'ana' && leido.para === 'bea',
    leido,
  );
}
comprobar('un tic no es un botín', !esBotin({ tipo: 'arcade:tic' }));
comprobar('un movimiento del juego no es un botín', !esBotin({ tipo: 'tirar' }));

const MALOS: readonly [string, unknown, string | null][] = [
  ['lo manda un asiento, aunque sea el que gana', { de: 'ana', para: 'bea' }, 'bea'],
  ['lo manda un asiento que ni siquiera está en el botín', { de: 'ana', para: 'bea' }, 'cid'],
  ['de uno a sí mismo', { de: 'ana', para: 'ana' }, null],
  ['de alguien que no está sentado', { de: 'dan', para: 'bea' }, null],
  ['para alguien que no está sentado', { de: 'ana', para: 'dan' }, null],
  ['con una clave de más', { de: 'ana', para: 'bea', cuanto: 1000 }, null],
  ['sin `para`', { de: 'ana' }, null],
  ['sin `de`', { para: 'bea' }, null],
  ['con `de` que no es texto', { de: 1, para: 'bea' }, null],
  ['con `para` que no es texto', { de: 'ana', para: ['bea'] }, null],
  ['con las claves cambiadas de nombre', { desde: 'ana', hacia: 'bea' }, null],
  ['sin carga', undefined, null],
  ['con la carga null', null, null],
  ['con la carga en una lista', ['ana', 'bea'], null],
  ['con la carga en texto', 'ana>bea', null],
];
for (const [que, carga, quien] of MALOS) {
  comprobar(`no se lee un botín ${que}`, leerElBotin(carga, quien, SENTADOS) === null, { carga, quien });
}
comprobar('en una mesa sin nadie sentado no hay botín', leerElBotin({ de: 'ana', para: 'bea' }, null, []) === null);

/* ─── Cuántas ────────────────────────────────────────────────────────────── */

comprobar('se han mirado todas las muestras', hechas >= 21, { hechas });

if (fallos.length > 0) {
  console.log(`${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${String(hechas)} comprobaciones`);
