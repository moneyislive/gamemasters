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
import type { Account, LiveSession } from '../../shared/live';
import { env } from '../src/config';
import { getStorageKind, getStore, initStore } from '../src/db/store';

/**
 * Lo que hay en el fichero, ENTERO.
 *
 * Declaraba solo `games`, `messages` y `config`, asi que la migracion se dejaba
 * atras TODAS las cuentas y TODAS las sesiones en vivo —el historial de cada
 * persona, sus trofeos, los codigos de las partidas abiertas— y terminaba
 * anunciando exito. Quien migrara a Mongo con una velada en marcha se quedaba
 * sin ella, y sin saberlo hasta que alguien intentara entrar.
 */
interface DatosFichero {
  games?: GameSession[];
  messages?: Record<string, ChatMessage[]>;
  config?: { model?: ModelId };
  live?: LiveSession[];
  accounts?: Account[];
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

  /*
   * LAS CUENTAS Y LAS SESIONES, que se quedaban atras sin que nadie lo dijera.
   *
   * No son un extra: en las cuentas viven el historial de cada persona y sus
   * trofeos, y en las sesiones los codigos con los que doce moviles estan dentro
   * de una partida ahora mismo. Van despues de las partidas porque una sesion
   * sin su partida no sirve de nada.
   */
  let cuentasMigradas = 0;
  for (const cuenta of datos.accounts ?? []) {
    if ((await store.getAccount(cuenta.id)) && !forzar) continue;
    await store.saveAccount(cuenta);
    cuentasMigradas++;
  }
  if (cuentasMigradas > 0) {
    console.log(`  ✓ ${cuentasMigradas} cuenta(s) con su historial y sus trofeos`);
  }

  let sesionesMigradas = 0;
  for (const sesion of datos.live ?? []) {
    if ((await store.getLive(sesion.id)) && !forzar) continue;
    await store.saveLive(sesion);
    sesionesMigradas++;
  }
  if (sesionesMigradas > 0) {
    console.log(`  ✓ ${sesionesMigradas} sesion(es) en vivo, con sus codigos`);
  }

  /*
   * Y SE DICE LO QUE NO SE HA MOVIDO: un contador que solo cuenta lo que sale
   * bien deja creer que lo demas no existia.
   */
  const cuentasEnFichero = (datos.accounts ?? []).length;
  const sesionesEnFichero = (datos.live ?? []).length;
  if (cuentasEnFichero > cuentasMigradas || sesionesEnFichero > sesionesMigradas) {
    console.log(
      `  – Ya estaban en Mongo: ${cuentasEnFichero - cuentasMigradas} cuenta(s) y ` +
        `${sesionesEnFichero - sesionesMigradas} sesion(es). Usa --force para sobrescribirlas.`,
    );
  }

  // Comprobación final: releer desde Mongo lo que acabamos de escribir.
  const listado = await store.listGames();
  const sinDuplicados = new Set(listado.map((g) => g.id)).size === listado.length;

  console.log(
    `\n  Resultado: ${migradas} partida(s), ${omitidas} omitida(s), ${mensajesMigrados} mensaje(s), ` +
      `${cuentasMigradas} cuenta(s), ${sesionesMigradas} sesion(es) en vivo.`,
  );
  console.log(`  En Mongo hay ahora ${listado.length} partida(s)${sinDuplicados ? '' : ' ¡CON DUPLICADOS!'}.`);
  console.log(`  El fichero ${ruta} queda intacto como copia de seguridad.\n`);

  await mongoose.disconnect().catch(() => undefined);
}

await main();
