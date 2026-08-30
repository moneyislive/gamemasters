/**
 * Comprobación de la conexión a MongoDB (Atlas o local).
 *
 *   npm run verify:mongo -w server
 *
 * Lee MONGODB_URI del .env de la raíz, conecta, ejecuta un ciclo completo del
 * contrato `Store` (crear, guardar, listar, mensajes, configuración, borrar) y
 * limpia lo que haya creado. Si algo falla, explica la causa probable en vez
 * de escupir el error crudo de mongoose.
 */
import mongoose from 'mongoose';
import { env } from '../src/config';
import { getStorageKind, getStore, initStore, resolveDbName } from '../src/db/store';
import { personasDe, lugaresDe } from '../../shared/juegos';

const ok = (texto: string) => console.log(`  ✓ ${texto}`);
const info = (texto: string) => console.log(`    ${texto}`);

/** Traduce los fallos habituales de Atlas a algo accionable. */
function diagnosticar(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : String(error);
  if (/bad auth|Authentication failed/i.test(mensaje)) {
    return 'Usuario o contraseña incorrectos. Revisa las credenciales del usuario de base de datos en Atlas (Database Access). Si la contraseña tiene caracteres como @ : / ? # o &, debes escribirla codificada en la URI.';
  }
  if (/IP|whitelist|not allowed to connect/i.test(mensaje)) {
    return 'Tu IP no está autorizada. En Atlas, Network Access → Add IP Address (usa «Add Current IP Address», o 0.0.0.0/0 si es un entorno de pruebas).';
  }
  if (/ENOTFOUND|querySrv|getaddrinfo/i.test(mensaje)) {
    return 'No se pudo resolver el host del clúster. Comprueba que copiaste la URI completa y que tienes conexión a internet (las URIs mongodb+srv necesitan consultas DNS SRV, que algunas redes corporativas bloquean).';
  }
  if (/timed out|ETIMEDOUT|ServerSelectionTimeout/i.test(mensaje)) {
    return 'Se agotó el tiempo de espera. Suele ser el filtro de IP de Atlas (Network Access) o un cortafuegos bloqueando el puerto 27017.';
  }
  return mensaje;
}

async function main(): Promise<void> {
  console.log('\n  Comprobando la conexión a MongoDB…\n');

  if (!env.mongoUri) {
    console.log('  ✗ No hay MONGODB_URI configurada.');
    info('Copia .env.example a .env en la raíz del proyecto y rellena MONGODB_URI.');
    info('Sin ella, la plataforma funciona con el almacén de fichero (server/data/db.json).');
    process.exitCode = 1;
    return;
  }

  // No imprimimos nunca la contraseña.
  const uriSegura = env.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  info(`URI: ${uriSegura}`);
  const dbPrevista = resolveDbName(env.mongoUri, env.mongoDbName);
  info(`Base de datos: ${dbPrevista ?? '(la que indique la URI)'}\n`);

  try {
    await initStore();
  } catch (error) {
    console.log(`  ✗ Error al inicializar el almacén: ${diagnosticar(error)}`);
    process.exitCode = 1;
    return;
  }

  if (getStorageKind() !== 'mongo') {
    console.log('  ✗ No se pudo conectar a MongoDB: la aplicación ha caído al almacén de fichero.');
    info('El motivo concreto aparece más arriba, en el aviso [almacén].');
    process.exitCode = 1;
    return;
  }

  ok(`Conectado al clúster · base de datos «${mongoose.connection.name}»`);

  const store = getStore();
  let idPrueba: string | null = null;

  try {
    const partida = await store.createGame('Comprobación de conexión');
    idPrueba = partida.id;
    ok(`Escritura: partida creada (${partida.id})`);

    personasDe(partida).push({ id: 'tmp', name: 'Invitado de prueba' });
    lugaresDe(partida).push({ id: 'tmp', name: 'Sala de prueba' });
    const guardada = await store.saveGame(partida);
    ok(`Actualización: ${personasDe(guardada).length} sospechoso y ${lugaresDe(guardada).length} sala guardados`);

    const leida = await store.getGame(partida.id);
    if (!leida || personasDe(leida).length !== 1 || leida.name !== 'Comprobación de conexión') {
      throw new Error('La partida releída no coincide con lo guardado.');
    }
    ok('Lectura: la partida se recupera íntegra');

    const listado = await store.listGames();
    ok(`Listado: ${listado.length} partida(s) en la base de datos`);

    await store.appendMessage(partida.id, {
      id: 'msg-prueba',
      role: 'user',
      content: 'Mensaje de comprobación',
      createdAt: new Date().toISOString(),
    });
    const mensajes = await store.getMessages(partida.id);
    if (mensajes.length !== 1 || mensajes[0]?.content !== 'Mensaje de comprobación') {
      throw new Error('El historial de chat no se guardó correctamente.');
    }
    ok('Historial de chat: escritura y lectura correctas');

    const modeloPrevio = await store.getConfigModel();
    await store.setConfigModel(modeloPrevio);
    ok(`Configuración: modelo persistido («${modeloPrevio}»)`);

    await store.deleteGame(partida.id);
    idPrueba = null;
    const borrada = await store.getGame(partida.id);
    const huerfanos = await store.getMessages(partida.id);
    if (borrada !== null || huerfanos.length !== 0) {
      throw new Error('El borrado no limpió la partida o sus mensajes.');
    }
    ok('Borrado: partida y mensajes eliminados en cascada');

    console.log('\n  Todo correcto. La plataforma usará MongoDB al arrancar.\n');
  } catch (error) {
    console.log(`\n  ✗ Fallo durante la comprobación: ${diagnosticar(error)}\n`);
    process.exitCode = 1;
    if (idPrueba) {
      // No dejar basura si la prueba se cortó a mitad.
      await store.deleteGame(idPrueba).catch(() => undefined);
    }
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

await main();
