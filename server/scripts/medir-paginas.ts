/**
 * Imprime a PDF, con Edge sin ventana, el dosier de cada persona de una partida
 * guardada y cuenta sus caras: el sobre de quien esconde algo no puede abultar
 * más que los demás.
 *
 *   npx tsx scripts/medir-paginas.ts [partida.json] [--edge ruta-de-msedge]
 *
 * ═══ POR QUÉ NO BASTA CON CONTAR CARACTERES ═══
 *
 * `medir-dosieres.ts` cuenta el texto, y en CLUEDO eso basta: su dosier fluye y
 * más texto es más papel. En las Sombras y en la Momia las caras están cuadradas
 * a mano —cada bloque en su página, con saltos fijos—, así que un texto largo no
 * alarga el sobre poco a poco: lo desborda de golpe a una cara más, que a doble
 * cara es una hoja más y cae en el sobre del siguiente. Eso solo se ve
 * imprimiendo.
 *
 * NO VA EN LA BATERÍA: necesita Edge, que no está en todas partes. Es una
 * herramienta para cuando se toca un dosier o se sospecha de una partida.
 *
 * Usa un perfil propio en una carpeta temporal: con el del usuario, Edge se
 * engancharía a la ventana abierta y no imprimiría nada.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import '../src/juegos/instalados';
import { renderPlayerDocument } from '../src/docs/renderer';
import { personasDe } from '../../shared/juegos';
import type { GameSession } from '../../shared/types';

const args = process.argv.slice(2);
const valor = (bandera: string) => (args.indexOf(bandera) >= 0 ? args[args.indexOf(bandera) + 1] : undefined);
const EDGE = valor('--edge') ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
/** Si se da, deja ahí los PDF para mirarlos a ojo. */
const GUARDAR = valor('--guardar');
const ruta =
  args.find((a, i) => !a.startsWith('--') && !['--edge', '--guardar'].includes(args[i - 1] ?? '')) ??
  path.join(import.meta.dirname, 'oro', 'sombras', 'partida.json');

if (!fs.existsSync(EDGE)) {
  console.error(`No encuentro Edge en ${EDGE}. Pásale la ruta con --edge.`);
  process.exit(2);
}

const game = JSON.parse(fs.readFileSync(ruta, 'utf8')) as GameSession;
// Quien esconde algo: cualquier persona que sea la respuesta de un eje (el culpable, el kanchō, quien rompió el sello).
const escondidos = new Set(Object.values(game.plot?.solution?.respuestas ?? {}).map(String));

const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'paginas-'));
const perfil = path.join(carpeta, 'perfil');

function paginasDe(html: string, nombre: string): number {
  const entrada = path.join(carpeta, `${nombre}.html`);
  const salida = path.join(carpeta, `${nombre}.pdf`);
  fs.writeFileSync(entrada, html, 'utf8');
  const r = spawnSync(
    EDGE,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${perfil}`,
      '--no-pdf-header-footer',
      /*
       * Tiempo para que lleguen las fuentes. Las hojas las piden a Google Fonts
       * con un @import, y sin esto Edge imprime con las de reserva, que miden
       * otra cosa: el recuento saldría de otra página que la que imprime quien
       * espera a que cargue.
       */
      '--virtual-time-budget=20000',
      `--print-to-pdf=${salida}`,
      pathToFileURL(entrada).href,
    ],
    { timeout: 90_000 },
  );
  if (!fs.existsSync(salida)) {
    throw new Error(`Edge no imprimió ${nombre} (salida ${r.status}): ${String(r.stderr ?? '').slice(0, 300)}`);
  }
  if (GUARDAR) {
    fs.mkdirSync(GUARDAR, { recursive: true });
    fs.copyFileSync(salida, path.join(GUARDAR, `${nombre}.pdf`));
    fs.copyFileSync(entrada, path.join(GUARDAR, `${nombre}.html`));
  }
  const pdf = fs.readFileSync(salida).toString('latin1');
  return (pdf.match(/\/Type\s*\/Page(?![a-z])/g) ?? []).length;
}

const filas = personasDe(game).map((p) => {
  const html = renderPlayerDocument(game, p.id, { variant: 'blanco' })?.html ?? '';
  return { id: p.id, nombre: p.name, escondido: escondidos.has(p.id), paginas: html ? paginasDe(html, p.id) : 0 };
});

for (const f of filas) console.log(`${f.escondido ? '☠' : ' '} ${f.id.padEnd(5)} ${f.nombre.padEnd(16)} ${f.paginas} caras`);
const distintas = new Set(filas.map((f) => f.paginas));
const delEscondido = filas.find((f) => f.escondido)?.paginas;
const lasDeMas = Math.max(...filas.filter((f) => !f.escondido).map((f) => f.paginas));
fs.rmSync(carpeta, { recursive: true, force: true });
if (distintas.size !== 1) {
  const cuales = [...distintas].sort((a, b) => a - b).join(', ');
  const suyo = delEscondido === undefined ? '' : delEscondido > lasDeMas ? ': y el más gordo es el de quien esconde algo' : '';
  console.log(`\n✘ Los sobres no abultan igual (${cuales} caras)${suyo}.`);
  process.exit(1);
}
const caras = [...distintas][0]!;
if (caras % 2 === 1) {
  // A doble cara, la última de cada dosier cae en el dorso de la primera del siguiente.
  console.log(`\n✘ Todos iguales, pero ${caras} caras es impar: imprimiendo la mesa entera a doble cara, cada dosier empieza en el dorso del anterior.`);
  process.exit(1);
}
console.log(`\n✔ Todos los sobres abultan igual: ${caras} caras, ${caras / 2} hojas.`);
