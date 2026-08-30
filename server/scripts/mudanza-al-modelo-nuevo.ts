/**
 * LA MUDANZA: se lleva lo guardado al modelo nuevo, de una vez y para siempre.
 *
 *   npx tsx scripts/mudanza-al-modelo-nuevo.ts --base harkania
 *   npx tsx scripts/mudanza-al-modelo-nuevo.ts --base harkania --de-verdad
 *
 * Sin `--de-verdad` va EN SECO: dice lo que haria y no escribe nada.
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
 * 2. EXIGE EL NOMBRE DE LA BASE, y se dice con `--base`. Sin nombre, mongoose
 *    se conecta a `test` —una base vacia— y este guion recorreria cero
 *    documentos y diria «todo convertido, 0 errores». La produccion es
 *    «harkania»; ya hubo un guion que miro donde no era y dio el parte en verde.
 *
 *    Es una BANDERA y no una variable de entorno a proposito: `MONGODB_DB=... `
 *    delante del comando es sintaxis de `sh`, y en PowerShell no pone nada ni
 *    avisa. El seguro no puede depender de la consola de cada cual.
 *
 * 3. COPIA ANTES DE TOCAR. Se vuelca cada documento tal como estaba a un
 *    fichero con la fecha en el nombre, ANTES de escribir nada. No se borra
 *    ninguna partida: esto las mueve, no las tira.
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from '../src/config';

const DE_VERDAD = process.argv.includes('--de-verdad');

/**
 * A que base de datos ir, dicho como argumento y no como variable de entorno.
 *
 * ═══ POR QUE UNA BANDERA Y NO `MONGODB_DB=...` DELANTE ═══
 *
 * Porque ese prefijo es de `sh`. En PowerShell —que es la consola por defecto
 * en Windows, donde se trabaja este repositorio— `MONGODB_DB=harkania npx tsx
 * ...` NO da error: no pone nada. El guion arranca sin nombre de base, mongoose
 * se va a `test`, y esto recorreria cero documentos y daria el parte en verde.
 *
 * O sea: el fallo mas caro que puede tener este fichero —mirar donde no es y
 * decir que todo bien— dependia de en que consola lo escribiera cada cual. Con
 * una bandera se lee igual en las dos y no hay nada que traducir.
 *
 * `MONGODB_DB` se sigue admitiendo: es lo que usa el servidor y hay guiones que
 * ya la ponen.
 */
const BASE_PEDIDA = (() => {
  const i = process.argv.indexOf('--base');
  return i >= 0 ? process.argv[i + 1]?.trim() : undefined;
})();

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
  /*
   * ═══ AQUI SE LLAMABA A `resolveDbName`, Y ESO ERA EL FALLO ═══
   *
   * Esa funcion es la del SERVIDOR, y tiene un respaldo: sin nombre explicito y
   * con una URI que no lo lleve dentro, devuelve `'gamemasters'`. Para arrancar
   * el servidor eso esta bien. Aqui anulaba el seguro entero.
   *
   * Se vio corriendo esto sin bandera: no se nego, se fue tan tranquilo a una
   * base llamada `gamemasters` —que EXISTE y tiene partidas dentro, otras— y
   * dio un parte perfectamente creible de tres documentos por mudar. Un
   * `--de-verdad` detras habria reescrito la base equivocada.
   *
   * Asi que este guion no acepta respaldos. O se dice el nombre, o la URI lo
   * lleva dentro, o no se hace nada.
   */
  const explicita = BASE_PEDIDA || env.mongoDbName?.trim() || '';
  const uriLlevaBase = /mongodb(\+srv)?:\/\/[^/]+\/[^?]+/.test(env.mongoUri);
  if (!explicita && !uriLlevaBase) {
    console.error('No sé a qué base de datos ir, y no me la voy a inventar.');
    console.error('');
    console.error('  npx tsx scripts/mudanza-al-modelo-nuevo.ts --base harkania');
    console.error('');
    console.error('En producción es «harkania». Hay otra base llamada «gamemasters»');
    console.error('con partidas dentro: elegir mal aquí reescribe la que no es.');
    process.exit(2);
  }
  const dbName = explicita || undefined;

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
