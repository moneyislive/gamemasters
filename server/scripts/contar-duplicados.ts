/**
 * ¿Hay duplicados en la base de datos de verdad?
 *
 *   MONGODB_URI="…" npx tsx server/scripts/contar-duplicados.ts
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
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(
    '\nHace falta MONGODB_URI.\n\n' +
      '  MONGODB_URI="mongodb+srv://…" npx tsx server/scripts/contar-duplicados.ts\n\n' +
      'Es la misma cadena que tiene el servicio en Render, en Environment.\n',
  );
  process.exit(2);
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
  console.log('(solo lectura: este guion no escribe nada)\n');

  await mongoose.connect(uri!);
  const db = mongoose.connection.db;
  if (!db) throw new Error('sin conexión');

  const existentes = new Set((await db.listCollections().toArray()).map((c) => c.name));
  let hayAlguno = false;

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
