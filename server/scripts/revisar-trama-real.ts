/**
 * Una velada de principio a fin CONTRA LA API DE VERDAD: trama, material si lo
 * tiene y revisión adversaria, por el mismo camino que producción
 * (`runGeneration`), con una mesa inventada. Para cualquiera de los cuatro juegos.
 *
 *   npx tsx scripts/revisar-trama-real.ts [--juego cluedo|momia|sombras|nudo] [--modelo claude-opus-5-5] [--esfuerzo high]
 *
 * CUESTA DINERO: medido el 25-sep-2026, una velada de CLUEDO de siete personas
 * con Opus 5.5 costó entre 3,8 y 4,8 $ y un cuarto de hora largo. No está en la
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
import type { GameSession, ModelId, Esfuerzo } from '../../shared/types';

await initStore();
const store = getStore();

type Lista = Array<[string, string]>;
const lista = (prefijo: string, filas: Lista) => filas.map(([name, description], i) => ({ id: `${prefijo}${i}`, name, description }));

const GENTE: Lista = [
  ['Aurora', 'Organizadora nata, controla todos los detalles y detesta que la contradigan en público.'],
  ['Bernardo', 'Bromista incansable; esconde una timidez enorme detrás de los chistes.'],
  ['Celia', 'Competitiva hasta en el parchís, analítica, recuerda cada detalle que oye.'],
  ['Damián', 'Encantador y algo fanfarrón; siempre tiene una historia mejor que la tuya.'],
  ['Elena', 'Callada y observadora; cuando habla, sentencia.'],
  ['Fermín', 'Despistado y generoso, llega tarde a todo y se hace querer.'],
  ['Gloria', 'Dramática, teatral, le encanta ser el centro de atención.'],
];
const HABITACIONES: Lista = [
  ['Salón de la chimenea', 'Sofás de cuero y una chimenea que tira mal.'],
  ['Biblioteca', 'Estanterías hasta el techo y un escritorio con cajón cerrado.'],
  ['Cocina', 'Grande, con despensa y salida al patio.'],
  ['Bodega', 'Fresca, oscura, con barricas y una bombilla que parpadea.'],
  ['Invernadero', 'Plantas tropicales, humedad y un banco de hierro.'],
  ['Desván', 'Baúles viejos, una ventana redonda y el suelo que cruje.'],
];

/** La mesa inventada de cada juego, con sus categorías. */
const MESAS: Record<string, { nombre: string; entidades: Record<string, unknown>; eje?: string }> = {
  cluedo: {
    nombre: 'La Casa de los Almendros',
    eje: 'culpable',
    entidades: {
      sospechosos: lista('p', GENTE),
      salas: lista('s', HABITACIONES.slice(0, 5)),
      objetos: lista('o', [
        ['Atizador de bronce', 'El de la chimenea del salón.'],
        ['Cordón de seda', 'Sujeta las cortinas de la biblioteca.'],
        ['Frasco de láudano', 'Del botiquín antiguo de la casa.'],
        ['Sacacorchos de plata', 'Regalo de boda de los dueños.'],
      ]),
    },
  },
  momia: {
    nombre: 'La tumba de los Almendros',
    eje: 'saqueador',
    entidades: {
      expedicionarios: lista('e', GENTE.slice(0, 6)),
      camaras: lista('c', HABITACIONES.slice(0, 5)),
      reliquias: lista('q', [
        ['Escarabeo de lapislázuli', 'Azul, del tamaño de un puño.'],
        ['Máscara funeraria', 'Dorada, con un ojo de vidrio roto.'],
        ['Vaso canopo', 'Con tapa de chacal.'],
      ]),
      ritos: lista('t', [
        ['Rito del Agua', ''],
        ['Rito del Aliento', ''],
        ['Rito del Nombre', ''],
        ['Rito de la Balanza', ''],
        ['Rito del Silencio', ''],
      ]),
    },
  },
  sombras: {
    nombre: 'El paso de los Almendros',
    eje: 'kancho',
    entidades: {
      escoltas: lista('e', GENTE.slice(0, 6)),
      pasos: lista('p', HABITACIONES),
      enseres: lista('n', [
        ['El farol de papel', 'Encendido con una vela de verdad.'],
        ['La bolsa de plata', 'Pesa más de lo que parece.'],
        ['La lanza corta', 'Un palo de escoba con cinta.'],
        ['El cofre lacado', 'Negro y rojo, cerrado con llave.'],
      ]),
      estandartes: lista('b', [
        ['Las tres malvarrosas', ''],
        ['El carro de ruedas', ''],
        ['La tela de mercader', ''],
        ['El pino solitario', ''],
      ]),
    },
  },
  nudo: {
    nombre: 'La estación de los Almendros',
    entidades: {
      ferroviarios: lista('f', GENTE.slice(0, 6)),
      convoyes: lista('c', [
        ['El Correo de Medianoche', 'Lleva el suero para el valle.'],
        ['El mixto de Peñarroya', 'Viajeros y mercancía, siempre con retraso.'],
        ['El carbonero de la Cuenca', 'Cuarenta vagones de hulla.'],
        ['El expreso de la frontera', 'Coches cama y aduaneros.'],
        ['El tren de obras del 84', 'Grúa, balasto y una cuadrilla dormida.'],
        ['El ganadero de Villaseca', 'Reses para el matadero.'],
      ]),
      puestos: lista('p', HABITACIONES.slice(0, 4)),
      mercancias: lista('m', [
        ['El suero antidiftérico', 'Diez cajas refrigeradas.'],
        ['Hulla de la Cuenca', 'Para las fundiciones.'],
        ['Reses para el matadero', 'Tres vagones.'],
      ]),
    },
  },
};

const juego = argumento('juego') ?? 'cluedo';
const mesa = MESAS[juego];
if (!mesa) {
  console.error(`No sé montar una mesa de «${juego}». Juegos: ${Object.keys(MESAS).join(', ')}.`);
  process.exit(2);
}

const modelo = (argumento('modelo') ?? 'claude-opus-5-5') as ModelId;
const esfuerzo = argumento('esfuerzo') as Esfuerzo | undefined;
const nueva = await store.createGame(mesa.nombre);
const game: GameSession = {
  ...nueva,
  entidades: mesa.entidades as GameSession['entidades'],
  boardMode: 'generated',
  settings: { language: 'es', juego, model: modelo, ...(esfuerzo ? { esfuerzo } : {}) } as GameSession['settings'],
};
game.status = 'generating';
await store.saveGame(game);

const t0 = Date.now();
let etapa = '';
await runGeneration(game, (evento) => {
  if (evento.type === 'stage') {
    const ahora = (Date.now() - t0) / 1000;
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

console.log(`\n\n=== ${juego} · ${((Date.now() - t0) / 60000).toFixed(1)} minutos ===`);
if (!plot) {
  console.log('Sin trama.');
  process.exit(1);
}
const r = plot.revision;
console.log(`Veredicto: ${r?.veredicto} · pasadas ${r?.pasadas}${r?.error ? ` · ERROR: ${r.error}` : ''}`);
console.log('\nHallazgos:');
for (const h of r?.hallazgos ?? []) console.log(`  [${h.estado}] ${h.gravedad} · ${h.origen} · ${h.codigo}${h.sobre ? ` (${h.sobre})` : ''}: ${h.texto.slice(0, 220)}`);
console.log('\nCambios:');
for (const c of r?.cambios ?? []) console.log(`  · ${c.slice(0, 220)}`);
const objetivo = mesa.eje ? plot.solution.respuestas[mesa.eje] ?? '' : '';
if (objetivo && r?.lecturas) {
  console.log(`\nLecturas a ciegas (probabilidad de la respuesta del eje «${mesa.eje}», antes → después):`);
  for (const l of r.lecturas.antes) {
    const despues = r.lecturas.despues.find((d) => d.momento === l.momento);
    console.log(`  momento ${l.momento}: ${Math.round((l.reparto[objetivo] ?? 0) * 100)} % → ${Math.round((despues?.reparto[objetivo] ?? 0) * 100)} %`);
  }
}
const g = final?.gasto;
console.log(`\nGasto: ${g?.costeUsd?.toFixed(3)} $ en ${g?.llamadas} llamadas`);
for (const [concepto, c] of Object.entries(g?.porConcepto ?? {})) {
  console.log(`  ${concepto.padEnd(10)} ${c.llamadas} llamadas · ${c.entrada} in / ${c.salida} out · ${c.costeUsd?.toFixed(3)} $`);
}
console.log(`\nTodo en ${fichero}`);
process.exit(0);
