/**
 * Una velada de CLUEDO de principio a fin CONTRA LA API DE VERDAD: trama,
 * material y revisión adversaria, por el mismo camino que producción
 * (`runGeneration`), con una mesa inventada.
 *
 *   npx tsx scripts/revisar-trama-real.ts [--modelo claude-opus-5-5] [--esfuerzo high]
 *
 * CUESTA DINERO: unos 2-3 $ con Opus 5.5 y siete personas. No está en la
 * batería a propósito. Sirve para dos cosas que ninguna comprobación sin red
 * puede hacer: ver si el revisor encuentra y arregla lo que tiene que arreglar,
 * y medir lo que gasta de verdad cada paso para calibrar `cobro/estimacion.ts`.
 *
 * La mesa es INVENTADA: ni una persona real, ni una descripción de nadie.
 * Guarda el resultado entero en un JSON dentro de una carpeta temporal y dice
 * dónde, para poder leerlo después.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const argumento = (nombre: string) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

// La clave, del .env de la carpeta principal si aquí no hay.
const raiz = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
for (const candidato of [path.join(raiz, '.env'), path.resolve(raiz, '..', 'GameMasters', '.env')]) {
  if (fs.existsSync(candidato)) dotenv.config({ path: candidato });
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('No hay ANTHROPIC_API_KEY: esta prueba es contra la API de verdad.');
  process.exit(2);
}
// Nada de Mongo: un almacén de fichero en una carpeta temporal, que se queda para leerla.
delete process.env.MONGODB_URI;
const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'velada-real-'));
process.chdir(carpeta);

const { initStore, getStore } = await import('../src/db/store');
await import('../src/juegos/instalados');
const { runGeneration } = await import('../src/plot/pipeline');
const { pistasDeLaTrama } = await import('../../shared/mecanicas/pistas');
import type { GameSession, ModelId, Esfuerzo } from '../../shared/types';

await initStore();
const store = getStore();

const GENTE: Array<[string, string]> = [
  ['Aurora', 'Organizadora nata, controla todos los detalles y detesta que la contradigan en público.'],
  ['Bernardo', 'Bromista incansable; esconde una timidez enorme detrás de los chistes.'],
  ['Celia', 'Competitiva hasta en el parchís, analítica, recuerda cada detalle que oye.'],
  ['Damián', 'Encantador y algo fanfarrón; siempre tiene una historia mejor que la tuya.'],
  ['Elena', 'Callada y observadora; cuando habla, sentencia.'],
  ['Fermín', 'Despistado y generoso, llega tarde a todo y se hace querer.'],
  ['Gloria', 'Dramática, teatral, le encanta ser el centro de atención.'],
];
const SALAS: Array<[string, string]> = [
  ['Salón de la chimenea', 'Sofás de cuero y una chimenea que tira mal.'],
  ['Biblioteca', 'Estanterías hasta el techo y un escritorio con cajón cerrado.'],
  ['Cocina', 'Grande, con despensa y salida al patio.'],
  ['Bodega', 'Fresca, oscura, con barricas y una bombilla que parpadea.'],
  ['Invernadero', 'Plantas tropicales, humedad y un banco de hierro.'],
];
const OBJETOS: Array<[string, string]> = [
  ['Atizador de bronce', 'El de la chimenea del salón.'],
  ['Cordón de seda', 'Sujeta las cortinas de la biblioteca.'],
  ['Frasco de láudano', 'Del botiquín antiguo de la casa.'],
  ['Sacacorchos de plata', 'Regalo de boda de los dueños.'],
];

const modelo = (argumento('modelo') ?? 'claude-opus-5-5') as ModelId;
const esfuerzo = argumento('esfuerzo') as Esfuerzo | undefined;
const nueva = await store.createGame('La Casa de los Almendros');
const game: GameSession = {
  ...nueva,
  entidades: {
    sospechosos: GENTE.map(([name, description], i) => ({ id: `p${i}`, name, description })),
    salas: SALAS.map(([name, description], i) => ({ id: `s${i}`, name, description })),
    objetos: OBJETOS.map(([name, description], i) => ({ id: `o${i}`, name, description })),
  },
  boardMode: 'generated',
  settings: { language: 'es', model: modelo, ...(esfuerzo ? { esfuerzo } : {}) },
};
game.status = 'generating';
await store.saveGame(game);

const t0 = Date.now();
let etapa = '';
const tiempos: Array<[string, number]> = [];
await runGeneration(game, (evento) => {
  if (evento.type === 'stage') {
    const ahora = (Date.now() - t0) / 1000;
    tiempos.push([evento.label, ahora]);
    etapa = evento.label;
    console.log(`\n[${ahora.toFixed(0)} s] ${evento.label}`);
  } else if (evento.type === 'text' && evento.delta.startsWith('\n[')) {
    process.stdout.write(evento.delta);
  } else if (evento.type === 'error') {
    console.error(`\nERROR en «${etapa}»: ${evento.message}`);
  }
});

const final = await store.getGame(game.id);
const plot = final?.plot;
const fichero = path.join(carpeta, 'velada.json');
fs.writeFileSync(fichero, JSON.stringify(final, null, 2));

console.log(`\n\n=== ${((Date.now() - t0) / 60000).toFixed(1)} minutos ===`);
if (!plot) {
  console.log('Sin trama.');
  process.exit(1);
}
const r = plot.revision;
console.log(`Veredicto: ${r?.veredicto} · pasadas ${r?.pasadas}${r?.error ? ` · ERROR: ${r.error}` : ''}`);
console.log(`Pistas: ${pistasDeLaTrama(plot).length} · material: ${plot.material ? 'sí' : 'no'}`);
console.log('\nHallazgos:');
for (const h of r?.hallazgos ?? []) console.log(`  [${h.estado}] ${h.gravedad} · ${h.origen} · ${h.codigo}${h.sobre ? ` (${h.sobre})` : ''}: ${h.texto.slice(0, 220)}`);
console.log('\nCambios:');
for (const c of r?.cambios ?? []) console.log(`  · ${c.slice(0, 220)}`);
console.log('\nLecturas del detective (probabilidad de la persona culpable, antes → después):');
const culpable = plot.solution.respuestas['culpable'] ?? '';
for (const l of r?.lecturas?.antes ?? []) {
  const despues = r?.lecturas?.despues.find((d) => d.momento === l.momento);
  console.log(`  momento ${l.momento}: ${Math.round((l.reparto[culpable] ?? 0) * 100)} % → ${Math.round((despues?.reparto[culpable] ?? 0) * 100)} %`);
}
const g = final?.gasto;
console.log(`\nGasto: ${g?.costeUsd?.toFixed(3)} $ en ${g?.llamadas} llamadas`);
for (const [concepto, c] of Object.entries(g?.porConcepto ?? {})) {
  console.log(`  ${concepto.padEnd(10)} ${c.llamadas} llamadas · ${c.entrada} in / ${c.salida} out · ${c.costeUsd?.toFixed(3)} $`);
}
console.log(`\nTodo en ${fichero}`);
process.exit(0);
