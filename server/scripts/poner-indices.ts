/**
 * Convierte en ÚNICOS los índices que deben serlo.
 *
 *   npm run indices -w server            (mira y dice qué haría)
 *   npm run indices -w server -- --hazlo (lo hace)
 *
 * La base sale del `.env` de la raíz igual que la lee el servidor, y el nombre
 * de `MONGODB_DB`. En producción es `harkania`; sin esa variable se cae en
 * `gamemasters`, que es otra base y no es la buena. El guion dice SIEMPRE cuál
 * ha abierto antes de tocar nada.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ HACE FALTA UN GUION Y NO BASTA CON DECLARARLO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `CAMPOS_UNICOS` en `db/store.ts` declara cuáles no pueden repetirse, y sobre
 * una base NUEVA eso basta: mongoose los crea bien al arrancar.
 *
 * Sobre una base que ya existe, no. MongoDB NO cambia las opciones de un índice
 * que ya está creado: pedir `{unique: true}` sobre un `{id: 1}` que ya existe
 * sin esa opción devuelve `IndexOptionsConflict`, y mongoose se lo traga en un
 * evento que nadie escucha. El servidor arranca, todo parece bien, y los
 * índices siguen sin restringir nada. Un fallo que se ve exactamente igual que
 * el éxito, que es la peor clase.
 *
 * Así que hay que tirar el viejo y crear el nuevo, y eso es una operación con
 * consecuencias: se hace a mano, una vez, mirando.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAS DOS PROTECCIONES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. NO ESCRIBE SIN `--hazlo`. Por defecto enseña el plan y se va.
 *
 *  2. NO TOCA NADA SI HAY DUPLICADOS. Crear un índice único sobre una colección
 *     que ya los tiene falla — y si ha tirado el viejo primero, deja la
 *     colección sin índice ninguno y con el servidor sirviendo. Se cuenta antes,
 *     colección por colección, y a la primera repetición se para entero.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { CAMPOS_UNICOS, resolveDbName } from '../src/db/store';

const raiz = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(raiz)) dotenv.config({ path: raiz });
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('\nNo hay MONGODB_URI ni en el entorno ni en el .env de la raíz.\n');
  process.exit(2);
}

const DE_VERDAD = process.argv.includes('--hazlo');

/** Las opciones que tiene que tener. Ver `CAMPOS_UNICOS` para el porqué del sparse. */
const COMO_DEBE_SER = { unique: true, sparse: true } as const;

async function main(): Promise<void> {
  const base = resolveDbName(uri!, process.env.MONGODB_DB);
  await mongoose.connect(uri!, {
    serverSelectionTimeoutMS: 8000,
    ...(base ? { dbName: base } : {}),
  });
  const db = mongoose.connection.db;
  if (!db) throw new Error('sin conexión');

  console.log('\nÍndices únicos\n');
  console.log(`Base abierta: «${mongoose.connection.name}»`);
  console.log(DE_VERDAD ? 'Modo: SE VA A ESCRIBIR\n' : 'Modo: solo mirar (añade --hazlo para escribir)\n');

  const existentes = new Set((await db.listCollections().toArray()).map((c) => c.name));

  /*
   * Ni una colección de las que se esperan: se ha abierto la base equivocada.
   * No se contesta «nada que hacer», porque no es lo mismo que «ya está bien».
   */
  if (!Object.keys(CAMPOS_UNICOS).some((c) => existentes.has(c))) {
    console.log('NO HAY NADA QUE MIRAR en esta base: no existe ninguna de las');
    console.log(`colecciones de la aplicación (${Object.keys(CAMPOS_UNICOS).join(', ')}).`);
    console.log('Probablemente falte MONGODB_DB. En producción es «harkania».\n');
    await mongoose.disconnect();
    process.exit(3);
  }

  // ---- Primero contar. Si hay un solo repetido, no se toca nada. -----------
  const repetidos: string[] = [];
  for (const [coleccion, campos] of Object.entries(CAMPOS_UNICOS)) {
    if (!existentes.has(coleccion)) continue;
    for (const campo of campos) {
      const choques = await db
        .collection(coleccion)
        .aggregate([
          { $match: { [campo]: { $exists: true, $ne: null } } },
          { $group: { _id: `$${campo}`, cuantos: { $sum: 1 } } },
          { $match: { cuantos: { $gt: 1 } } },
          { $limit: 5 },
        ])
        .toArray();
      for (const c of choques) repetidos.push(`${coleccion}.${campo} = «${String(c._id)}» ×${c.cuantos}`);
    }
  }

  if (repetidos.length > 0) {
    console.log('HAY DUPLICADOS. No se toca nada:\n');
    for (const r of repetidos) console.log(`  · ${r}`);
    console.log('\nHay que decidir con cuál se queda cada uno antes de restringir.');
    console.log('`npm run duplicados -w server` los enseña con detalle.\n');
    await mongoose.disconnect();
    process.exit(4);
  }

  // ---- Y ahora sí --------------------------------------------------------
  let cambiados = 0;
  let yaEstaban = 0;

  for (const [coleccion, campos] of Object.entries(CAMPOS_UNICOS)) {
    if (!existentes.has(coleccion)) {
      console.log(`· ${coleccion} — no existe todavía, la creará el servidor ya con los buenos`);
      continue;
    }
    const puestos = await db.collection(coleccion).indexes();

    for (const campo of campos) {
      const suyo = puestos.find(
        (i) => Object.keys(i.key).length === 1 && Object.keys(i.key)[0] === campo,
      );

      if (suyo?.unique && suyo?.sparse) {
        console.log(`· ${coleccion}.${campo} — ya es único`);
        yaEstaban += 1;
        continue;
      }

      if (!suyo) {
        console.log(`· ${coleccion}.${campo} — no hay índice: se CREA único`);
        if (DE_VERDAD) await db.collection(coleccion).createIndex({ [campo]: 1 }, COMO_DEBE_SER);
        cambiados += 1;
        continue;
      }

      /*
       * Existe y no es único: hay que TIRARLO Y REHACERLO, porque MongoDB no
       * cambia las opciones de un índice puesto. Entre las dos operaciones la
       * colección se queda un instante sin ese índice; con las consultas que
       * hace esta aplicación y el tamaño que tiene, es irrelevante — y es la
       * única forma de hacerlo sin parar el servicio.
       */
      console.log(`· ${coleccion}.${campo} — existe sin restringir: se TIRA y se rehace único`);
      if (DE_VERDAD) {
        await db.collection(coleccion).dropIndex(suyo.name!);
        await db.collection(coleccion).createIndex({ [campo]: 1 }, COMO_DEBE_SER);
      }
      cambiados += 1;
    }
  }

  console.log('');
  if (!DE_VERDAD && cambiados > 0) {
    console.log(`${cambiados} por cambiar, ${yaEstaban} ya estaban. Nada escrito.`);
    console.log('Para hacerlo: npm run indices -w server -- --hazlo\n');
  } else if (cambiados > 0) {
    console.log(`${cambiados} cambiados, ${yaEstaban} ya estaban.`);
    console.log('Compruébalo con: npm run duplicados -w server\n');
  } else {
    console.log(`Nada que hacer: los ${yaEstaban} ya eran únicos.\n`);
  }

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('\nNo se pudo:', e instanceof Error ? e.message : e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
