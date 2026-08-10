/**
 * Sonda del borrado de cuenta. La lanza `verificar-borrado.ts`; no se usa a mano.
 *
 * Va en un proceso aparte por lo mismo que `sonda-candados.ts`: llamar al
 * almacén exige `initStore()`, y con el cwd del comprobador eso cargaría el
 * `.env` de verdad y se conectaría al Atlas de producción. Aquí el cwd es una
 * carpeta temporal sembrada, así que el almacén acaba siendo el fichero JSON.
 *
 * Escribe una línea de JSON por la salida estándar y termina.
 */
import { getStore, initStore } from '../src/db/store';
import { borrarCuentaDe, cerrarPartidaEnCuentas } from '../src/live/cuentas';
import { refrescarSesion } from '../src/live/sesion';

const ANA = 'ana@ejemplo.com';
const BRUNO = 'bruno@ejemplo.com';

await initStore();
const store = getStore();

const tieneCorreoEnSesion = async (gameId: string, correo: string): Promise<boolean> => {
  const s = await store.getLive(gameId);
  return (s?.players ?? []).some((p) => (p.email ?? '').toLowerCase() === correo);
};
const tieneCorreoEnPartida = async (gameId: string, correo: string): Promise<boolean> => {
  const g = await store.getGame(gameId);
  return (g?.suspects ?? []).some((x) => (x.email ?? '').toLowerCase() === correo);
};
const cuantasCuentas = async (): Promise<number> => {
  // No hay `listAccounts` en el contrato: se cuenta por los correos que se
  // sembraron, que es lo único que esta prueba necesita saber.
  const encontradas = await Promise.all(
    [ANA, BRUNO].map((c) => store.getAccountByEmail(c)),
  );
  return encontradas.filter(Boolean).length;
};

const salida: Record<string, unknown> = {};

try {
  salida.antes = {
    cuentas: await cuantasCuentas(),
    anaEnSesion: await tieneCorreoEnSesion('velada', ANA),
    anaEnPartida: await tieneCorreoEnPartida('velada', ANA),
  };

  // Se pide el borrado con el correo TAL COMO lo escribió quien organiza, en
  // mayúsculas: si no se normaliza, no encuentra nada y «borra» sin borrar.
  salida.resultado = await borrarCuentaDe('Ana@Ejemplo.COM');

  salida.despues = {
    cuentas: await cuantasCuentas(),
    anaExiste: Boolean(await store.getAccountByEmail(ANA)),
    brunoExiste: Boolean(await store.getAccountByEmail(BRUNO)),
    anaEnSesion: await tieneCorreoEnSesion('velada', ANA),
    anaEnPartida: await tieneCorreoEnPartida('velada', ANA),
    anaEnOtraSesion: await tieneCorreoEnSesion('otra-velada', ANA),
    anaEnOtraPartida: await tieneCorreoEnPartida('otra-velada', ANA),
    brunoEnSesion: await tieneCorreoEnSesion('velada', BRUNO),
    jugadoresIntactos: (await store.getLive('velada'))?.players.length ?? 0,
  };

  // --- Vuelta atrás nº 1: sincronizar copia los correos DESDE la partida ---
  const partida = await store.getGame('velada');
  if (partida) await refrescarSesion(partida);
  salida.trasSincronizar = { anaEnSesion: await tieneCorreoEnSesion('velada', ANA) };

  // --- Vuelta atrás nº 2: el desenlace vuelve a crear cuentas ---
  const conTrama = await store.getGame('velada');
  const sesion = await store.getLive('velada');
  if (conTrama && sesion) {
    // Una trama mínima: `cerrarPartidaEnCuentas` se sale si no hay ninguna.
    conTrama.plot = {
      title: 'Prueba',
      tagline: '',
      synopsis: '',
      setting: '',
      victim: { name: 'Alguien', description: '' },
      characters: sesion.players.map((p) => ({
        suspectId: p.suspectId,
        characterName: p.displayName,
        role: '',
        publicPersona: '',
        secret: '',
        motive: '',
        alibi: '',
        personalHook: '',
      })),
      solution: { respuestas: { culpable: 's1', objeto: 'w0', lugar: 'r0' } },
      clues: [],
      timeline: [],
    } as never;
    await store.saveGame(conTrama);
    await cerrarPartidaEnCuentas(conTrama, sesion);
  }
  salida.trasDesenlace = {
    anaExiste: Boolean(await store.getAccountByEmail(ANA)),
    brunoExiste: Boolean(await store.getAccountByEmail(BRUNO)),
  };

  // --- Borrar la partida tiene que llevarse su sesión en vivo ---
  await store.deleteGame('otra-velada');
  salida.trasBorrarPartida = { sesionSigueViva: Boolean(await store.getLive('otra-velada')) };
} catch (e) {
  salida.error = e instanceof Error ? e.message : String(e);
}

console.log(JSON.stringify(salida));
process.exit(0);
