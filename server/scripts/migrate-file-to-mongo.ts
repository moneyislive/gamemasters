/**
 * Migración del almacén de fichero (server/data/db.json) a MongoDB.
 *
 *   npm run migrate:mongo -w server            # migra lo que falte
 *   npm run migrate:mongo -w server -- --force # sobrescribe las que ya existan
 *
 * No borra nada: `db.json` queda intacto como copia de seguridad. Las partidas
 * que ya existen en Mongo se respetan salvo que se pase --force.
 */
import fsp from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import type { ChatMessage, GameSession, ModelId } from '../../shared/types';
import { env } from '../src/config';
import { getStorageKind, getStore, initStore } from '../src/db/store';

interface DatosFichero {
  games?: GameSession[];
  messages?: Record<string, ChatMessage[]>;
  config?: { model?: ModelId };
}

const forzar = process.argv.includes('--force');

async function main(): Promise<void> {
  console.log('\n  Migrando del fichero JSON a MongoDB…\n');

  if (!env.mongoUri) {
    console.log('  ✗ No hay MONGODB_URI configurada: no hay destino al que migrar.');
    process.exitCode = 1;
    return;
  }

  const ruta = path.resolve(process.cwd(), 'data', 'db.json');
  let datos: DatosFichero;
  try {
    datos = JSON.parse(await fsp.readFile(ruta, 'utf8')) as DatosFichero;
  } catch {
    console.log(`  ✗ No se pudo leer ${ruta}. ¿Seguro que hay algo que migrar?`);
    process.exitCode = 1;
    return;
  }

  const partidas = datos.games ?? [];
  const mensajes = datos.messages ?? {};
  if (partidas.length === 0) {
    console.log('  El fichero no contiene partidas. Nada que migrar.\n');
    return;
  }

  await initStore();
  if (getStorageKind() !== 'mongo') {
    console.log('  ✗ No se pudo conectar a MongoDB (el motivo aparece arriba). Migración cancelada.');
    process.exitCode = 1;
    return;
  }
  const store = getStore();
  console.log(`  Destino: base de datos «${mongoose.connection.name}»\n`);

  let migradas = 0;
  let omitidas = 0;
  let mensajesMigrados = 0;

  for (const partida of partidas) {
    const existente = await store.getGame(partida.id);
    if (existente && !forzar) {
      console.log(`  – «${partida.name}» ya estaba en Mongo (omitida; usa --force para sobrescribir)`);
      omitidas++;
      continue;
    }

    await store.saveGame(partida);
    // saveGame refresca updatedAt; restauramos el original para no alterar el
    // orden del listado de casos.
    await mongoose.connection
      .collection('games')
      .updateOne({ id: partida.id }, { $set: { updatedAt: partida.updatedAt } });

    // Los mensajes se reescriben desde cero para no duplicarlos al reintentar.
    await mongoose.connection.collection('messages').deleteMany({ gameId: partida.id });
    for (const mensaje of mensajes[partida.id] ?? []) {
      await store.appendMessage(partida.id, mensaje);
      mensajesMigrados++;
    }

    console.log(
      `  ✓ «${partida.name}» — ${partida.suspects.length} sospechosos, ${partida.rooms.length} salas, ` +
        `${partida.weapons.length} armas, ${partida.documents?.length ?? 0} dosieres, ` +
        `${(mensajes[partida.id] ?? []).length} mensajes`,
    );
    migradas++;
  }

  if (datos.config?.model) {
    await store.setConfigModel(datos.config.model);
    console.log(`  ✓ Modelo preferido conservado: «${datos.config.model}»`);
  }

  // Comprobación final: releer desde Mongo lo que acabamos de escribir.
  const listado = await store.listGames();
  const sinDuplicados = new Set(listado.map((g) => g.id)).size === listado.length;

  console.log(
    `\n  Resultado: ${migradas} migrada(s), ${omitidas} omitida(s), ${mensajesMigrados} mensaje(s).`,
  );
  console.log(`  En Mongo hay ahora ${listado.length} partida(s)${sinDuplicados ? '' : ' ¡CON DUPLICADOS!'}.`);
  console.log(`  El fichero ${ruta} queda intacto como copia de seguridad.\n`);

  await mongoose.disconnect().catch(() => undefined);
}

await main();
