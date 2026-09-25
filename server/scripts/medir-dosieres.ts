/**
 * Mide el texto de cada dosier de jugador de una partida guardada y dice cuál es
 * el del culpable: para ver a ojo si su sobre sigue siendo el más gordo.
 *
 *   npx tsx scripts/medir-dosieres.ts [ruta de la partida .json]
 *
 * Sin argumento mide la partida del maestro de oro de CLUEDO. Mide TEXTO, sin
 * estilos ni imágenes: es lo que ocupa papel.
 */
import fs from 'node:fs';
import path from 'node:path';
import '../src/juegos/instalados';
import { renderPlayerDocument } from '../src/docs/renderer';
import { culpableDe } from '../src/juegos/cluedo';
import { personasDe } from '../../shared/juegos';
import type { GameSession } from '../../shared/types';

const ruta = process.argv[2] ?? path.join(import.meta.dirname ?? __dirname, 'oro', 'cluedo', 'partida.json');
const game = JSON.parse(fs.readFileSync(ruta, 'utf8')) as GameSession;
const culpable = game.plot ? culpableDe(game.plot.solution) : '';

const texto = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const filas = personasDe(game).map((s) => {
  const html = renderPlayerDocument(game, s.id, { variant: 'blanco' })?.html ?? '';
  return { id: s.id, nombre: s.name, culpable: s.id === culpable, largo: texto(html).length };
});
const inocentes = filas.filter((f) => !f.culpable).map((f) => f.largo);
const media = inocentes.reduce((a, b) => a + b, 0) / Math.max(1, inocentes.length);
for (const f of filas) {
  const desvio = ((f.largo - media) / media) * 100;
  console.log(`${f.culpable ? '☠' : ' '} ${f.id.padEnd(4)} ${f.nombre.padEnd(14)} ${String(f.largo).padStart(6)}  ${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)} %`);
}
console.log(`media de los inocentes: ${Math.round(media)} · máximo: ${Math.max(...inocentes)}`);
