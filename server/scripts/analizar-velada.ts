/**
 * Mide una velada de CLUEDO ya generada contra lo que se le pide al generador
 * desde el 25-sep-2026 (lo que enseñó la casa Sabrón), para juzgar una prueba
 * contra la API sin leerla entera a ojo:
 *
 *   npx tsx scripts/analizar-velada.ts <velada.json>
 *
 * Lee el JSON que deja `revisar-trama-real.ts`. No llama a la API ni escribe
 * nada. Lo que se puede contar lo cuenta; lo que es criterio —si las faltas son
 * buenas, si el rasgo del culpable se deduce— lo imprime para leerlo.
 */
import fs from 'node:fs';
import '../src/juegos/instalados';
import { culpableDe, lugarDe, objetoDe, objetosDe, salasDe, sospechososDe } from '../src/juegos/cluedo';
import { pistasDeLaTrama } from '../../shared/mecanicas/pistas';
import type { GameSession } from '../../shared/types';

const ruta = process.argv[2];
if (!ruta) {
  console.error('Dime qué velada: npx tsx scripts/analizar-velada.ts <velada.json>');
  process.exit(2);
}
const game = JSON.parse(fs.readFileSync(ruta, 'utf8')) as GameSession;
const plot = game.plot;
if (!plot) {
  console.error('Esa partida no tiene trama.');
  process.exit(1);
}

const culpable = culpableDe(plot.solution);
const nombre = (id: string) => plot.characters.find((c) => c.participanteId === id)?.characterName ?? id;
const sala = (id?: string) => salasDe(game).find((s) => s.id === id)?.name ?? id ?? '—';
const palabras = (t?: string) => (t ?? '').trim().split(/\s+/).filter(Boolean).length;

console.log(`\n${plot.title} — ${plot.tagline}`);
console.log(`Solución: ${nombre(culpable)} · ${objetosDe(game).find((o) => o.id === objetoDe(plot.solution))?.name} · ${sala(lugarDe(plot.solution))}`);

console.log('\n· Tu noche (palabras) y el bloque del personaje (caracteres)');
for (const c of plot.characters) {
  const bloque = [c.role, c.publicPersona, c.secret, c.motive, c.alibi, ...(c.knowledge ?? []), c.personalHook, c.nightStory]
    .filter(Boolean)
    .join(' ').length;
  console.log(
    `  ${c.participanteId === culpable ? '☠' : ' '} ${c.characterName.padEnd(34)} noche ${String(palabras(c.nightStory)).padStart(4)} · bloque ${bloque}`,
  );
}

const pistas = pistasDeLaTrama(plot);
console.log(`\n· Pistas: ${pistas.length}`);
for (let r = 1; r <= 4; r++) {
  const deLaRonda = pistas.filter((p) => p.round === r);
  console.log(`  ronda ${r}: ${deLaRonda.length} · salas ${deLaRonda.map((p) => sala(p.lugarId)).join(', ')}`);
}
const porSala = new Map<string, number>();
for (const p of pistas) porSala.set(sala(p.lugarId), (porSala.get(sala(p.lugarId)) ?? 0) + 1);
console.log(`  por sala: ${[...porSala.entries()].map(([s, n]) => `${s} ${n}`).join(' · ')}`);

const m = plot.material;
console.log(`\n· Giros: ${m?.twists.length ?? 0} de ${sospechososDe(game).length - 1} inocentes`);
for (const g of m?.twists ?? []) {
  console.log(`  ronda ${g.round} · ${nombre(g.participanteId)}${g.participanteId === culpable ? ' ☠ (¡CULPABLE!)' : ''}: ${g.instruction}`);
}

// Como la auditoría: la frase que los PROHÍBE («no hay equipos ni portavoces») no cuenta.
const PORTAVOCES = /\b(portavoz|portavoces|equipos?|por grupos|grupos de|puesta en com[uú]n)\b/i;
const NEGADO = /\b(no hay|no se forman|no formes|sin|nada de|ni)\b[^.;:]{0,60}\b(portavo|equipo|grupo|puesta en com)/i;
const equipos = plot.gmScript.filter((p) =>
  p.split(/(?<=[.;:])\s+/).some((frase) => PORTAVOCES.test(frase) && !NEGADO.test(frase)),
);
console.log(`\n· Guion: ${plot.gmScript.length} pasos · con equipos o portavoces: ${equipos.length}`);
for (const p of equipos) console.log(`  ! ${p}`);

console.log('\n· Ayudas');
for (const h of m?.hints ?? []) console.log(`  ${h.level}: ${h.text}`);

console.log('\n· Hechos establecidos por ronda');
for (const t of m?.timelineReveals ?? []) console.log(`  ronda ${t.round} · ${t.time}: ${t.fact}`);

console.log('\n· Secretos (¿cuántos inocentes esconden una falta propia de esa noche?)');
for (const c of plot.characters) {
  console.log(`  ${c.participanteId === culpable ? '☠' : ' '} ${c.characterName}: ${c.secret}`);
}

console.log('\n· Pistas por ronda (el papel de cada una)');
for (const p of [...pistas].sort((a, b) => a.round - b.round)) {
  console.log(`  R${p.round} ${sala(p.lugarId)}: ${p.description}\n      → ${p.pointsTo}`);
}

const r = plot.revision;
console.log(`\n· Revisión: ${r?.veredicto} en ${r?.pasadas} pasada(s)`);
for (const h of r?.hallazgos ?? []) console.log(`  [${h.estado}] ${h.gravedad} · ${h.codigo}${h.sobre ? ` (${nombre(h.sobre)})` : ''}`);
