/**
 * ¿LOS LECTORES DEL CANAL DE BOOTS ON BOARD SON ESTRICTOS DE VERDAD?
 *
 *   npm run verify:protocolo-de-botas
 *
 * Lo que manda un aparato llega de un entorno hostil —basta con abrir las herramientas del
 * navegador—, y el servidor lo lee con `leerMensajeDelAparato`. La promesa de ese lector es
 * `null` ante CUALQUIER cosa que no sea exactamente un mensaje bien formado: una clave de más, un
 * número con decimales, un rumbo fuera de rango, un texto demasiado largo. Un lector que «entiende
 * lo que quiso decir» es el que deja colar un `x: 1e300` o un `m: 7` hasta el paso del servidor.
 *
 * Por eso aquí hay más muestras MALAS que buenas, y cada una tiene que dar `null`. Sin servidor ni
 * red: el canal de verdad lo prueba su propio comprobador de punta a punta.
 */
import {
  CIERRE,
  leerMensajeDelAparato,
  leerMensajeDelServidor,
  rutaDelCanal,
  TOPE_DE_MENSAJE_BYTES,
  VERSION_DEL_CANAL,
} from '../../shared/mecanicas/canal-de-botas';

const fallos: string[] = [];
let hechas = 0;

function comprobar(que: string, bien: boolean, detalle?: unknown): void {
  hechas++;
  if (bien) return;
  const cola = detalle === undefined ? '' : ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`;
  fallos.push(`${que}${cola}`);
}

const j = (v: unknown): string => JSON.stringify(v);

/* ─── Lo que dice el aparato ─────────────────────────────────────────────── */

const hola = { t: 'hola', v: VERSION_DEL_CANAL, llave: 'k'.repeat(24) };
const aqui = { t: 'aqui', n: 1, x: 65536, z: -131072, r: 64, m: 1 };

comprobar('un `hola` bien formado se lee', leerMensajeDelAparato(j(hola))?.t === 'hola');
comprobar('un `aqui` bien formado se lee', leerMensajeDelAparato(j(aqui))?.t === 'aqui');
{
  const leido = leerMensajeDelAparato(j(aqui));
  comprobar(
    'y se lee con sus números tal cual',
    leido !== null && leido.t === 'aqui' && leido.x === 65536 && leido.z === -131072 && leido.r === 64 && leido.m === 1,
    leido,
  );
}

const MALOS_DEL_APARATO: readonly [string, string][] = [
  ['no es JSON', '{t:"hola"'],
  ['es una lista', j([hola])],
  ['es un número', '42'],
  ['es null', 'null'],
  ['hola con una clave de más', j({ ...hola, admin: true })],
  ['hola sin llave', j({ t: 'hola', v: 1 })],
  ['hola con la llave vacía', j({ ...hola, llave: '' })],
  ['hola con una llave de 65 letras', j({ ...hola, llave: 'k'.repeat(65) })],
  ['hola con la llave numérica', j({ ...hola, llave: 12345 })],
  ['hola con la versión con decimales', j({ ...hola, v: 1.5 })],
  ['aqui con una clave de más', j({ ...aqui, vida: 99 })],
  ['aqui sin marcha', j({ t: 'aqui', n: 1, x: 0, z: 0, r: 0 })],
  ['aqui con x con decimales', j({ ...aqui, x: 1.5 })],
  ['aqui con x fuera de la coma fija', j({ ...aqui, x: 1e300 })],
  ['aqui con z como texto', j({ ...aqui, z: '0' })],
  ['aqui con el rumbo 256', j({ ...aqui, r: 256 })],
  ['aqui con el rumbo negativo', j({ ...aqui, r: -1 })],
  ['aqui con la marcha 3', j({ ...aqui, m: 3 })],
  ['aqui con el tic 0', j({ ...aqui, n: 0 })],
  ['aqui con el tic negativo', j({ ...aqui, n: -5 })],
  ['un tipo que no existe, con la forma de un aqui', j({ t: 'botin', n: 1, x: 0, z: 0, r: 0, m: 1 })],
  ['un golpe con la forma de un aqui', j({ t: 'golpe', n: 1, x: 0, z: 0, r: 0, m: 1 })],
  ['un golpe con el tic 0', j({ t: 'golpe', n: 0, r: 0 })],
  ['un golpe con el rumbo 256', j({ t: 'golpe', n: 3, r: 256 })],
  ['un golpe sin rumbo', j({ t: 'golpe', n: 3 })],
  ['un golpe que dice a quién le da', j({ t: 'golpe', n: 3, r: 0, a: 'a2' })],
  ['más largo que el tope', j({ ...hola, llave: 'k'.repeat(40) }) + ' '.repeat(TOPE_DE_MENSAJE_BYTES)],
];
for (const [que, texto] of MALOS_DEL_APARATO) {
  comprobar(`se rechaza del aparato: ${que}`, leerMensajeDelAparato(texto) === null, texto.slice(0, 120));
}

/* ─── Lo que dice el servidor ────────────────────────────────────────────── */

comprobar(
  '`dentro` se lee',
  leerMensajeDelServidor(j({ t: 'dentro', yo: 'a1', x: 0, z: 0, r: 0, hz: 20 }))?.t === 'dentro',
);
{
  const foto = leerMensajeDelServidor(
    j({
      t: 'foto',
      k: 7,
      p: [
        ['a1', 65536, 0, 64, 1],
        ['a2', -65536, 131072, 0, 0],
      ],
    }),
  );
  comprobar('`foto` se lee con sus dos entradas', foto !== null && foto.t === 'foto' && foto.p.length === 2, foto);
}
comprobar('`corrige` se lee', leerMensajeDelServidor(j({ t: 'corrige', n: 3, x: 0, z: 0 }))?.t === 'corrige');
comprobar('`fuera` se lee', leerMensajeDelServidor(j({ t: 'fuera', motivo: 'quieto' }))?.t === 'fuera');

/* La refriega: el golpe del aparato, y lo que cuenta el servidor. */
comprobar('un `golpe` bien formado se lee', leerMensajeDelAparato(j({ t: 'golpe', n: 12, r: 200 }))?.t === 'golpe');
comprobar('`lanza` se lee', leerMensajeDelServidor(j({ t: 'lanza', de: 'a1' }))?.t === 'lanza');
comprobar('`da` se lee', leerMensajeDelServidor(j({ t: 'da', de: 'a1', a: 'a2', vida: 2 }))?.t === 'da');
comprobar('`cae` se lee', leerMensajeDelServidor(j({ t: 'cae', a: 'a2', por: 'a1' }))?.t === 'cae');
comprobar('`renace` se lee', leerMensajeDelServidor(j({ t: 'renace', a: 'a2', x: 0, z: 65536, r: 128 }))?.t === 'renace');
{
  const vidas = leerMensajeDelServidor(j({ t: 'vidas', v: [['a1', 3, 0], ['a2', 0, 1], ['a3', 3, 2]] }));
  comprobar('`vidas` se lee con sus tres entradas', vidas !== null && vidas.t === 'vidas' && vidas.v.length === 3, vidas);
}

const MALOS_DEL_SERVIDOR: readonly [string, string][] = [
  ['una foto con una entrada de cuatro', j({ t: 'foto', k: 1, p: [['a1', 0, 0, 0]] })],
  ['una foto con el rumbo 300', j({ t: 'foto', k: 1, p: [['a1', 0, 0, 300, 0]] })],
  ['una foto con el asiento numérico', j({ t: 'foto', k: 1, p: [[1, 0, 0, 0, 0]] })],
  ['dentro sin hz', j({ t: 'dentro', yo: 'a1', x: 0, z: 0, r: 0 })],
  ['corrige con x con decimales', j({ t: 'corrige', n: 1, x: 0.5, z: 0 })],
  ['un tipo que no existe', j({ t: 'botin', de: 'a1' })],
  ['una foto con el mismo asiento dos veces', j({ t: 'foto', k: 1, p: [['a1', 0, 0, 0, 0], ['a1', 65536, 0, 0, 0]] })],
  ['un da con más vida de la que hay', j({ t: 'da', de: 'a1', a: 'a2', vida: 4 })],
  ['un da con la vida negativa', j({ t: 'da', de: 'a1', a: 'a2', vida: -1 })],
  ['un cae sin quién lo tumbó', j({ t: 'cae', a: 'a2' })],
  ['un renace con x con decimales', j({ t: 'renace', a: 'a2', x: 0.5, z: 0, r: 0 })],
  ['unas vidas con el mismo asiento dos veces', j({ t: 'vidas', v: [['a1', 3, 0], ['a1', 2, 0]] })],
  ['unas vidas con un estado que no existe', j({ t: 'vidas', v: [['a1', 3, 3]] })],
  ['unas vidas con una entrada de dos', j({ t: 'vidas', v: [['a1', 3]] })],
];
for (const [que, texto] of MALOS_DEL_SERVIDOR) {
  comprobar(`se rechaza del servidor: ${que}`, leerMensajeDelServidor(texto) === null, texto);
}

/* ─── La ruta y los cierres ──────────────────────────────────────────────── */

comprobar('la ruta del canal cuelga de la mesa, bajo /api', rutaDelCanal('AB2CD') === '/api/arcade/mesas/AB2CD/botas', rutaDelCanal('AB2CD'));
comprobar('y escapa lo que no es un código', rutaDelCanal('A/B?c') === '/api/arcade/mesas/A%2FB%3Fc/botas', rutaDelCanal('A/B?c'));
{
  const codigos = Object.values(CIERRE);
  comprobar(
    'los códigos de cierre son de la aplicación (4000-4999) y no se repiten',
    codigos.every((c) => c >= 4000 && c <= 4999) && new Set(codigos).size === codigos.length,
    codigos,
  );
}

/* El suelo: que se ha mirado de verdad todo lo que se dice arriba. */
comprobar('se han mirado todas las muestras', hechas >= 57, { hechas });

console.log('');
if (fallos.length > 0) {
  console.log(`${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${String(hechas)} comprobaciones`);
console.log('\nLos lectores del canal de Boots on Board devuelven null ante cualquier cosa que no sea');
console.log('exactamente un mensaje bien formado, en los dos sentidos.');
