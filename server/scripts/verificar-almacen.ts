/**
 * Las dos tiendas se comportan igual.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE ESTO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * En producción manda `MongoStore` (`render.yaml` define `MONGODB_URI`) y NINGUNA
 * de las comprobaciones lo ejercitaba: las veintitantas `verify:*` corren contra
 * `FileStore`, que guarda un JSON en disco. `mongodb-memory-server` llevaba en
 * las dependencias sin que lo importara nadie.
 *
 * Es el patrón que ya nos ha costado dos fallos graves con la suite entera en
 * verde: la red está tejida alrededor del camino que NO es el de producción. Un
 * `replaceOne` que se traga un campo, un índice que no existe o un `id` que
 * mongoose descarta no los ve ninguna prueba — y el comentario de `looseModel`
 * cuenta que eso último ya pasó.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CÓMO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Un solo guion de asertos, ejecutado contra las dos tiendas, exigiendo el MISMO
 * resultado. Lo que se comprueba no es que Mongo funcione —eso ya lo hace
 * MongoDB— sino que nuestras dos implementaciones del contrato `Store` son
 * intercambiables, que es lo que la aplicación da por hecho en cada línea.
 *
 * Se levanta un mongod en memoria, así que no hace falta tener nada instalado ni
 * tocar ninguna base de datos de verdad.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Store } from '../src/db/store';
import type { GameSession } from '../../shared/types';
import type { Account, LiveSession } from '../../shared/live';
import { personasDe } from '../../shared/juegos';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, bien: boolean, detalle?: unknown): void {
  hechas += 1;
  if (bien) {
    console.log(`  ✔ ${que}`);
    return;
  }
  console.log(`  ✘ ${que}`);
  if (detalle !== undefined) console.log(`      ${JSON.stringify(detalle)}`);
  fallos.push(que);
}

function seccion(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const ahora = new Date().toISOString();

function partida(id: string, nombre: string): GameSession {
  return {
    id,
    name: nombre,
    status: 'draft',
    createdAt: ahora,
    updatedAt: ahora,
    entidades: {
      sospechosos: [{ id: 'e1', name: 'Marta' }, { id: 'e2', name: 'Bruno' }],
      salas: [{ id: 'c1', name: 'La cocina' }],
      objetos: [{ id: 'q1', name: 'El abrecartas' }],
    },
    boardMode: 'generated',
    settings: { language: 'es' },
  } as unknown as GameSession;
}

/**
 * El guion, idéntico para las dos.
 *
 * Devuelve lo observado en cada paso para poder comparar tienda contra tienda:
 * la comprobación de verdad no es «esto es lo que esperaba», es «las dos dicen
 * exactamente lo mismo».
 */
async function guion(store: Store): Promise<Record<string, unknown>> {
  const visto: Record<string, unknown> = {};

  // ---- Partidas -------------------------------------------------------------
  await store.saveGame(partida('p1', 'La casa de Sabrón'));
  await store.saveGame(partida('p2', 'La tumba'));

  const leida = await store.getGame('p1');
  visto.idSobrevive = leida?.id;
  visto.nombre = leida?.name;
  visto.sospechosos = leida ? personasDe(leida).length : undefined;
  visto.listadas = (await store.listGames()).length;

  // Guardar dos veces la misma partida no puede crear dos.
  await store.saveGame(partida('p1', 'La casa de Sabrón, otra vez'));
  visto.trasReguardar = (await store.listGames()).length;
  visto.nombreNuevo = (await store.getGame('p1'))?.name;

  // Un campo que el tipo NO declaraba hasta hace poco: tiene que sobrevivir.
  const conGasto = (await store.getGame('p1'))!;
  conGasto.gasto = {
    llamadas: 2,
    entrada: 100,
    salida: 200,
    cacheEscrita: 0,
    cacheLeida: 0,
    porConcepto: { trama: { llamadas: 1, entrada: 50, salida: 100 } },
    modelos: ['claude-opus-5'],
    actualizadoEl: ahora,
  };
  await store.saveGame(conGasto);
  visto.gastoSobrevive = (await store.getGame('p1'))?.gasto?.salida;
  visto.gastoAnidado = (await store.getGame('p1'))?.gasto?.porConcepto.trama?.entrada;

  visto.inexistente = await store.getGame('no-existe');

  // ---- Cuentas --------------------------------------------------------------
  const cuenta: Account = {
    id: 'c1',
    email: 'ana@ejemplo.com',
    displayName: 'Ana',
    createdAt: ahora,
    partidas: [],
    trofeos: [],
    correos: [{ correo: 'ana@ejemplo.com', nivel: 'buzon', origen: 'google', anadidoEl: ahora }],
    identidades: [
      { proveedor: 'google', sub: 'sub-1', correoVerificado: true, esRelay: false, vinculadaEl: ahora, vistaEl: ahora },
    ],
  } as unknown as Account;
  await store.saveAccount(cuenta);

  visto.cuentaPorId = (await store.getAccount('c1'))?.displayName;
  visto.cuentaPorCorreo = (await store.getAccountByEmail('ana@ejemplo.com'))?.id;
  // El correo se normaliza: se busca en minúsculas venga como venga.
  visto.cuentaPorCorreoRaro = (await store.getAccountByEmail('Ana@Ejemplo.COM'))?.id;
  visto.identidadesSobreviven = (await store.getAccount('c1'))?.identidades?.length;
  visto.porIdentidad = (await store.getAccountPorIdentidad('google', 'sub-1'))?.id;

  // ---- Sesiones en vivo -----------------------------------------------------
  const sesion: LiveSession = {
    id: 'p1',
    juego: 'cluedo',
    sid: 'sid-1',
    code: 'ABCDE',
    phase: 'lobby',
    round: 0,
    totalRounds: 4,
    rev: 1,
    players: [
      { participanteId: 'e1', displayName: 'Marta', joinCode: 'AAAAAA', joined: false, elecciones: [], notas: 'mis notas', girosRecibidos: [] },
    ],
    respuestasEntregadas: [],
    acciones: [],
    createdAt: ahora,
    updatedAt: ahora,
  } as unknown as LiveSession;
  await store.saveLive(sesion);

  visto.sesionPorId = (await store.getLive('p1'))?.code;
  visto.sesionPorCodigo = (await store.getLiveByCode('ABCDE'))?.id;
  // En minúsculas también: la teclea quien juega.
  visto.sesionPorCodigoMinusculas = (await store.getLiveByCode('abcde'))?.id;
  visto.notasSobreviven = (await store.getLive('p1'))?.players[0]?.notas;
  visto.activas = (await store.listLiveActivas()).length;

  // Una terminada deja de ser activa.
  const terminada = (await store.getLive('p1'))!;
  terminada.phase = 'desenlace';
  await store.saveLive(terminada);
  visto.activasTrasTerminar = (await store.listLiveActivas()).length;

  // ---- Dueños ---------------------------------------------------------------
  const conDueno = (await store.getGame('p2'))!;
  conDueno.duenos = [{ cuentaId: 'c1', desde: ahora }] as unknown as GameSession['duenos'];
  await store.saveGame(conDueno);
  visto.misPartidas = [...(await store.listGameIdsDeCuenta('c1'))].sort().join(',');
  visto.partidasDeOtro = [...(await store.listGameIdsDeCuenta('c-otro'))].length;

  // ---- Mensajes y configuración --------------------------------------------
  await store.appendMessage('p1', { id: 'm1', role: 'user', content: 'hola', at: ahora } as never);
  visto.mensajes = (await store.getMessages('p1')).length;
  await store.setConfigModel('claude-sonnet-5');
  visto.modelo = await store.getConfigModel();

  // ---- Borrados -------------------------------------------------------------
  await store.deleteAccount('c1');
  visto.trasBorrarCuenta = await store.getAccount('c1');
  await store.deleteGame('p2');
  visto.trasBorrarPartida = await store.getGame('p2');
  visto.listadasAlFinal = (await store.listGames()).length;

  return visto;
}

// ---------------------------------------------------------------------------

console.log('\nLas dos tiendas, con el mismo guion\n');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harkania-almacen-'));
let mongod: MongoMemoryServer | undefined;

try {
  // ---- FileStore, con el cwd en una carpeta temporal ------------------------
  const cwdOriginal = process.cwd();
  process.chdir(dir);
  delete process.env.MONGODB_URI;
  const { initStore: initFichero, getStore: storeFichero, getStorageKind } = await import('../src/db/store');
  await initFichero();
  comprobar('la primera tienda es la de fichero', getStorageKind() === 'file', getStorageKind());
  seccion('El guion contra el fichero');
  const conFichero = await guion(storeFichero());
  console.log(`  (${Object.keys(conFichero).length} observaciones)`);
  process.chdir(cwdOriginal);

  // ---- MongoStore, contra un mongod en memoria -----------------------------
  seccion('El mismo guion contra Mongo');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'harkania-prueba' });

  // Se instancia la tienda de Mongo directamente: `initStore` decide por
  // entorno y aquí hace falta forzar la que usa producción.
  const modulo = await import('../src/db/store');
  const StoreDeMongo = (modulo as unknown as { MongoStore?: new () => Store }).MongoStore;
  comprobar('la tienda de Mongo se puede instanciar', Boolean(StoreDeMongo));

  if (StoreDeMongo) {
    const conMongo = await guion(new StoreDeMongo());

    /*
     * Y LO QUE NO PUEDE REPETIRSE, NO SE REPITE.
     *
     * Los indices estaban todos para ir rapido y ninguno para impedir nada. Se
     * comprueba contra Mongo de verdad y no contra el fichero porque la
     * restriccion la pone Mongo: es exactamente la clase de garantia que el
     * `FileStore` no tiene y que nadie estaba mirando.
     */
    seccion('Lo que no puede repetirse');
    const crudo = mongoose.connection.db!;
    // Los indices los declara el esquema al crear el modelo; se espera a que
    // esten construidos antes de intentar violarlos.
    await mongoose.connection.syncIndexes().catch(() => undefined);

    /** Mete un documento y dice si Mongo lo rechazo por repetido. */
    const rechaza = async (col: string, doc: Record<string, unknown>): Promise<boolean> => {
      try {
        await crudo.collection(col).insertOne(doc);
        return false;
      } catch (e) {
        return (e as { code?: number }).code === 11000;
      }
    };

    /*
     * Cada caso se siembra aqui mismo en vez de apoyarse en lo que dejo el
     * guion. La primera version daba por hecho que la cuenta de mas arriba
     * seguia ahi --y el guion la borra al final--, asi que el choque no ocurria
     * y la comprobacion decia que el indice no restringe. Una prueba que
     * depende del estado que deja otra mide el estado, no la garantia.
     */
    await crudo.collection('games').insertOne({ id: 'unico-1' });
    comprobar('dos partidas con el mismo id, no', await rechaza('games', { id: 'unico-1' }));

    await crudo.collection('accounts').insertOne({ id: 'unico-2', email: 'choque@ejemplo.com' });
    comprobar('dos cuentas con el mismo correo, no',
      await rechaza('accounts', { id: 'unico-3', email: 'choque@ejemplo.com' }));
    comprobar('ni dos cuentas con el mismo id, no',
      await rechaza('accounts', { id: 'unico-2', email: 'otro@ejemplo.com' }));

    await crudo.collection('live').insertOne({ id: 'unico-4', code: 'ZZZZZ' });
    comprobar('dos sesiones con el mismo codigo, no',
      await rechaza('live', { id: 'unico-5', code: 'ZZZZZ' }));

    /*
     * Y `sparse`: dos documentos SIN el campo no chocan entre si. La afirmacion
     * que interesa es «no hay dos con el mismo valor», no «todos tienen el
     * campo» — esa segunda haria fallar la creacion del indice al arrancar por
     * un solo documento antiguo, cambiando un fallo silencioso por un servidor
     * que no levanta.
     */
    comprobar('pero dos sin codigo si caben',
      !(await rechaza('live', { id: 'sin-1' })) && !(await rechaza('live', { id: 'sin-2' })));

    seccion('Y dicen exactamente lo mismo');
    const claves = Object.keys(conFichero);
    for (const clave of claves) {
      const a = JSON.stringify(conFichero[clave] ?? null);
      const b = JSON.stringify(conMongo[clave] ?? null);
      comprobar(`«${clave}» coincide`, a === b, { fichero: a, mongo: b });
    }
  }
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
  console.error(e);
} finally {
  await mongoose.disconnect().catch(() => undefined);
  await mongod?.stop().catch(() => undefined);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    console.log(`  (queda por limpiar ${dir})`);
  }
}

console.log(`\n${hechas} comprobaciones`);
if (fallos.length > 0) {
  console.log(`\n${fallos.length} sin pasar:`);
  for (const f of fallos) console.log(`  ✘ ${f}`);
  process.exit(1);
}
console.log('Las dos tiendas son intercambiables, que es lo que la aplicación da por hecho.');
