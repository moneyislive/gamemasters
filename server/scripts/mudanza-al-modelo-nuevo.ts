/**
 * LA MUDANZA: se lleva lo guardado al modelo nuevo, de una vez y para siempre.
 *
 *   npx tsx scripts/mudanza-al-modelo-nuevo.ts                 ← en seco, no escribe
 *   npx tsx scripts/mudanza-al-modelo-nuevo.ts --de-verdad     ← escribe
 *
 * ═══ POR QUE EXISTE ESTE FICHERO, Y POR QUE ES DE UN SOLO USO ═══
 *
 * Hasta hoy la conversion se hacia AL LEER, en `juegos/migracion.ts`: cada vez
 * que una partida salia del almacen se le renombraban los campos viejos. Eso
 * tiene una propiedad buena —no hace falta parar nada— y una mala que crece
 * sola: el codigo carga para siempre con los dos vocabularios, y cada
 * renombrado futuro AÑADE lineas ahi. Eran ya 58 menciones de CLUEDO viviendo
 * en el nucleo con el unico trabajo de recordar como se llamaban antes las
 * cosas.
 *
 * Se cambia por lo contrario: se convierte lo que hay UNA VEZ, aqui, y el
 * codigo se queda hablando un solo idioma. Despues de correr esto,
 * `migracion.ts` no existe y nadie lo echa de menos.
 *
 * ═══ QUE HACE, EXACTAMENTE ═══
 *
 * En las PARTIDAS (`games`):
 *   · `suspects` / `rooms` / `weapons`  ->  `entidades.<categoria>`
 *   · `plot.characters[].suspectId`     ->  `.participanteId`
 *   · `plot.timeline[].suspectIds`      ->  `.participanteIds`
 *   · `plot.material.twists[].suspectId`->  `.participanteId`
 *   · `plot.clues[].roomId`             ->  `.lugarId`
 *   · `board.rooms` / `board.passages`  ->  `board.lugares` / `board.pasadizos`
 *   · `documents[].suspectId`           ->  `.id`
 *
 * En las SESIONES (`live`):
 *   · `players[].suspectId`             ->  `.participanteId`
 *   · `acusaciones`                     ->  `respuestasEntregadas`
 *   · `winnerId`                        ->  `primeroEnAcertar`
 *   · `tablon`                          ->  `porDondePasaron`
 *   · `elecciones[].roomId`             ->  `.lugarId`
 *   · `acciones[]` y `denuncias[]`: `suspectId` -> `participanteId`
 *
 * ═══ TRES SEGUROS, Y LOS TRES POR ALGO QUE PASO ═══
 *
 * 1. EN SECO POR DEFECTO. Escribir exige `--de-verdad` tecleado a mano.
 *
 * 2. EXIGE EL NOMBRE DE LA BASE. `MONGODB_DB` o una URI que lo lleve dentro.
 *    Sin nombre, mongoose se conecta a `test` —una base vacia— y un guion como
 *    este recorreria cero documentos y diria «todo convertido, 0 errores».
 *    La produccion es «harkania»; ya hubo un guion que miro donde no era y dio
 *    el parte en verde.
 *
 * 3. COPIA ANTES DE TOCAR. Se vuelca cada documento tal como estaba a un
 *    fichero con la fecha en el nombre, ANTES de escribir nada. No se borra
 *    ninguna partida: esto las mueve, no las tira.
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from '../src/config';
import { resolveDbName } from '../src/db/store';

const DE_VERDAD = process.argv.includes('--de-verdad');

// ---------------------------------------------------------------------------
// Las conversiones, una por una
// ---------------------------------------------------------------------------

import { mudarPartida, mudarSesion } from './mudanza/reglas';
import type { Obj } from './mudanza/reglas';

// ---------------------------------------------------------------------------
// El paseo
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!env.mongoUri) {
    console.error('No hay MONGODB_URI. Esto solo tiene sentido contra la base de verdad.');
    process.exit(2);
  }

  /*
   * EL SEGURO DEL NOMBRE. `resolveDbName` devuelve `undefined` cuando la URI ya
   * lleva la base dentro, así que hay que distinguir «no hace falta» de «no se
   * sabe». Sin ninguna de las dos cosas, mongoose se iría a `test`.
   */
  const dbName = resolveDbName(env.mongoUri, env.mongoDbName);
  const uriLlevaBase = /mongodb(\+srv)?:\/\/[^/]+\/[^?]+/.test(env.mongoUri);
  if (!dbName && !uriLlevaBase) {
    console.error('No sé a qué base de datos ir. Pon MONGODB_DB (en producción: harkania).');
    process.exit(2);
  }

  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000, ...(dbName ? { dbName } : {}) });
  const db = mongoose.connection.db!;
  console.log(`\nBase de datos: «${mongoose.connection.name}»`);
  console.log(DE_VERDAD ? 'Modo: DE VERDAD — se va a escribir.\n' : 'Modo: EN SECO — no se escribe nada.\n');

  const carpeta = path.join(import.meta.dirname ?? __dirname, 'copias');
  const marca = new Date().toISOString().replace(/[:.]/g, '-');

  let totalTocados = 0;
  for (const [coleccion, mudar] of [
    ['games', mudarPartida],
    ['live', mudarSesion],
  ] as const) {
    const docs = await db.collection(coleccion).find({}).toArray();
    console.log(`── ${coleccion}: ${docs.length} documentos`);

    /*
     * CERO DOCUMENTOS ES SOSPECHOSO, no un éxito. Es exactamente el parte que
     * daría este guion apuntando a una base equivocada, así que se dice en voz
     * alta en vez de contarlo como «nada que hacer».
     */
    if (docs.length === 0) {
      console.log('   ⚠ vacía. ¿Es la base que querías?\n');
      continue;
    }

    const conCambios: Array<{ doc: Obj; hecho: string[] }> = [];
    for (const doc of docs) {
      const copia = JSON.parse(JSON.stringify(doc)) as Obj;
      const hecho = mudar(copia as never);
      if (hecho.length > 0) conCambios.push({ doc: copia, hecho });
    }

    console.log(`   ${conCambios.length} necesitan mudanza`);
    for (const { doc, hecho } of conCambios.slice(0, 8)) {
      console.log(`     · ${String(doc.id ?? doc._id).slice(0, 14)}  ${hecho.join(', ')}`);
    }
    if (conCambios.length > 8) console.log(`     … y ${conCambios.length - 8} más`);
    totalTocados += conCambios.length;

    if (!DE_VERDAD || conCambios.length === 0) {
      console.log('');
      continue;
    }

    // La copia, ANTES de escribir. Si esto falla, no se escribe.
    fs.mkdirSync(carpeta, { recursive: true });
    const fichero = path.join(carpeta, `${coleccion}-${marca}.json`);
    fs.writeFileSync(fichero, JSON.stringify(docs, null, 2), 'utf8');
    console.log(`   copia guardada en ${path.relative(process.cwd(), fichero)}`);

    for (const { doc } of conCambios) {
      const { _id, ...resto } = doc;
      // Por `id`, que es el del dominio y lleva índice único, y no por `_id`:
      // el `_id` ha pasado por `JSON.parse(JSON.stringify(...))` y ya no es un
      // ObjectId, es su texto. Buscar por él no encontraría nada y el guion
      // diría que escribió sin haber escrito.
      await db.collection(coleccion).replaceOne({ id: doc.id }, resto as never);
    }
    console.log(`   ${conCambios.length} documentos escritos\n`);
  }

  await mongoose.disconnect();
  console.log(
    DE_VERDAD
      ? `\nMudanza hecha: ${totalTocados} documentos.`
      : `\nEn seco. ${totalTocados} documentos se mudarían. Para hacerlo:  --de-verdad`,
  );
}

main().catch((e) => {
  console.error('\nLa mudanza se cayó:', e);
  process.exit(1);
});
