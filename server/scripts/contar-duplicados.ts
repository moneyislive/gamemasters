/**
 * ¿Hay duplicados en la base de datos de verdad?
 *
 *   npm run duplicados -w server
 *
 * La cadena sale del `.env` de la raíz, igual que la lee el servidor, así que
 * no hay nada que pegar a mano —y no acaba en el historial de la consola, que
 * es donde peor está una contraseña de base de datos—. Si en el entorno ya hay
 * una `MONGODB_URI`, manda esa.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PARA QUÉ
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Ninguno de los índices es ÚNICO. Los campos por los que se busca —el `id` de
 * una partida, el correo de una cuenta, el código de una sesión— están indexados
 * para ir rápido, pero nada impide que existan dos documentos con el mismo
 * valor. Y cuando eso pasa, `findOne` devuelve uno de los dos sin decir cuál:
 * dos cuentas con el mismo correo significan que alguien entra unas veces en una
 * y otras en otra, con partidas distintas, sin entender nada.
 *
 * Se defiende por convención —`codigoLibre()` mira si el código está cogido
 * antes de usarlo— y una convención no es una restricción: entre mirar y
 * escribir hay una ventana, y con dos procesos no hay ventana, hay puerta.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ CONTAR ANTES DE ARREGLAR
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Crear un índice único sobre una colección que YA tiene duplicados falla, y
 * falla al arrancar. Poner la restricción a ciegas y desplegar es cambiar un
 * fallo silencioso por un servidor que no levanta, con las partidas de la gente
 * dentro.
 *
 * Así que primero se mira. Este guion NO ESCRIBE NADA: cuenta, enseña los
 * valores repetidos y calla. Con el resultado delante se decide si el arreglo es
 * poner los índices y ya, o si hay que limpiar antes.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { resolveDbName } from '../src/db/store';

// El mismo orden que `server/src/config.ts`: primero el `.env` de la raiz,
// luego el de `server/`. dotenv nunca pisa lo que ya esta en el entorno, asi
// que pasar la variable a mano sigue mandando.
const raiz = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(raiz)) dotenv.config({ path: raiz });
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(
    '\nNo hay MONGODB_URI ni en el entorno ni en el .env de la raíz.\n\n' +
      'Cópiala del servicio en Render (Environment) al .env de la raíz, o' +
      ' defínela en la consola antes de llamar.\n\n' +
      '  $env:MONGODB_URI = "mongodb+srv://...."\n',
  );
  process.exit(2);
}

/**
 * A qué base se está mirando, con la contraseña tapada.
 *
 * Se enseña SIEMPRE y lo primero: un recuento de duplicados solo sirve si se
 * sabe de dónde sale, y aquí la respuesta decide si se ponen índices únicos en
 * la base donde están las partidas de la gente. Equivocarse de base y creerse
 * el número es peor que no mirar.
 */
function aQueBase(cadena: string): string {
  try {
    const u = new URL(cadena);
    const bd = u.pathname.replace(/^\//, '') || '(la de por defecto)';
    return `${u.protocol}//${u.hostname}/${bd}`;
  } catch {
    return '(no se pudo leer la cadena)';
  }
}

/** Lo que debería ser único, y qué significa que no lo sea. */
const CANDIDATOS: Array<{
  coleccion: string;
  campo: string;
  porQue: string;
  /** Se normaliza antes de agrupar cuando la aplicación también lo normaliza. */
  minusculas?: boolean;
}> = [
  {
    coleccion: 'games',
    campo: 'id',
    porQue: 'dos partidas con el mismo id: se abriría una u otra según el humor del índice',
  },
  {
    coleccion: 'live',
    campo: 'id',
    porQue: 'dos sesiones en vivo de la misma partida: media mesa jugaría a una y media a la otra',
  },
  {
    coleccion: 'live',
    campo: 'code',
    porQue: 'dos partidas con el mismo código: quien lo teclea entra en la que no es',
  },
  {
    coleccion: 'accounts',
    campo: 'id',
    porQue: 'dos cuentas con el mismo id',
  },
  {
    coleccion: 'accounts',
    campo: 'email',
    porQue: 'dos cuentas con el mismo correo: se entra unas veces en una y otras en otra',
    minusculas: true,
  },
];

async function main(): Promise<void> {
  console.log('\nDuplicados en la base de datos\n');
  console.log(`Mirando: ${aQueBase(uri!)}`);
  console.log('(solo lectura: este guion no escribe nada)\n');

  /*
   * LA MISMA BASE QUE ABRE EL SERVIDOR, resuelta con SU función.
   *
   * La primera versión llamaba a `mongoose.connect(uri)` a secas y caía en la
   * base por defecto del clúster. Como la URI no lleva nombre de base en la
   * ruta —el nombre va aparte, en `MONGODB_DB`— no encontró ni una colección... y
   * dijo «sin duplicados, se pueden poner los índices». Un verde de haber mirado
   * en el cajón equivocado, que es la peor respuesta posible: la que habría
   * llevado a poner índices únicos a ciegas sobre las partidas de la gente.
   */
  const base = resolveDbName(uri!, process.env.MONGODB_DB);
  await mongoose.connect(uri!, {
    serverSelectionTimeoutMS: 8000,
    ...(base ? { dbName: base } : {}),
  });
  const db = mongoose.connection.db;
  if (!db) throw new Error('sin conexión');
  console.log(`Base abierta: «${mongoose.connection.name}»` + "\n");

  const existentes = new Set((await db.listCollections().toArray()).map((c) => c.name));
  let hayAlguno = false;

  /*
   * Y SI NO HAY NADA QUE MIRAR, SE DICE. No se contesta «sin duplicados».
   *
   * Es la diferencia entre «he mirado y está limpio» y «no he mirado», y aquí
   * las dos se parecían demasiado. Se enseña qué bases hay en el clúster para
   * que se vea de un vistazo cuál era la buena.
   */
  const esperadas = [...new Set(CANDIDATOS.map((c) => c.coleccion))];
  if (!esperadas.some((c) => existentes.has(c))) {
    console.log('NO HAY NADA QUE MIRAR en esta base: no existe ninguna de las');
    console.log(`colecciones que usa la aplicación (${esperadas.join(', ')}).`);
    console.log('');
    console.log('Esto NO significa que no haya duplicados: significa que se ha');
    console.log('mirado donde no es. Bases con datos en este clúster:');
    try {
      const admin = mongoose.connection.getClient().db().admin();
      const { databases } = await admin.listDatabases();
      for (const d of databases) {
        const suyas = await mongoose.connection
          .getClient()
          .db(d.name)
          .listCollections()
          .toArray();
        const nombres = suyas.map((c) => c.name);
        const pinta = esperadas.some((c) => nombres.includes(c)) ? '   <-- esta tiene pinta' : '';
        console.log(`  · ${d.name}: ${nombres.join(', ') || '(vacía)'}${pinta}`);
      }
    } catch (e) {
      console.log(`  (no se pudieron listar: ${e instanceof Error ? e.message : String(e)})`);
    }
    console.log('');
    console.log('Ponle el nombre bueno y vuelve a llamar. En PowerShell:');
    console.log('  $env:MONGODB_DB = "harkania"; npm run duplicados -w server');
    console.log('');
    await mongoose.disconnect();
    process.exit(3);
  }

  for (const { coleccion, campo, porQue, minusculas } of CANDIDATOS) {
    if (!existentes.has(coleccion)) {
      console.log(`· ${coleccion}.${campo} — la colección no existe todavía`);
      continue;
    }

    const valor = minusculas ? { $toLower: `$${campo}` } : `$${campo}`;
    const repetidos = await db
      .collection(coleccion)
      .aggregate([
        { $match: { [campo]: { $exists: true, $ne: null } } },
        { $group: { _id: valor, cuantos: { $sum: 1 } } },
        { $match: { cuantos: { $gt: 1 } } },
        { $sort: { cuantos: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    const total = await db.collection(coleccion).countDocuments();

    if (repetidos.length === 0) {
      console.log(`· ${coleccion}.${campo} — limpio (${total} documentos)`);
      continue;
    }

    hayAlguno = true;
    console.log(`· ${coleccion}.${campo} — ${repetidos.length} valores REPETIDOS de ${total} documentos`);
    console.log(`    ${porQue}`);
    for (const r of repetidos) {
      console.log(`    · «${String(r._id)}» aparece ${r.cuantos} veces`);
    }
  }

  // Y qué índices hay puestos ahora mismo, que es la otra mitad de la foto.
  console.log('\nÍndices actuales\n');
  for (const coleccion of [...new Set(CANDIDATOS.map((c) => c.coleccion))]) {
    if (!existentes.has(coleccion)) continue;
    const indices = await db.collection(coleccion).indexes();
    for (const i of indices) {
      const campos = Object.keys(i.key).join(', ');
      console.log(`· ${coleccion}: ${campos}${i.unique ? '  [ÚNICO]' : ''}`);
    }
  }

  console.log('');
  if (hayAlguno) {
    console.log('HAY DUPLICADOS. Poner los índices únicos ahora haría que el servidor');
    console.log('no arrancara: primero hay que decidir con cuál se queda cada uno.');
  } else {
    console.log('Sin duplicados. Los índices únicos se pueden poner sin limpiar nada.');
  }
  console.log('');

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('\nNo se pudo mirar:', e instanceof Error ? e.message : e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
