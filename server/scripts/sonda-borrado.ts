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
import { aceptarGuardar, borrarCuentaDe, cerrarPartidaEnCuentas } from '../src/live/cuentas';
import { refrescarSesion } from '../src/live/sesion';

/** Lo mínimo para que `cerrarPartidaEnCuentas` no se salga por falta de trama. */
function tramaMinima(sesion: { players: Array<{ suspectId: string; displayName: string }> }): never {
  return {
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
}

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
  /*
   * EL CONSENTIMIENTO, PRIMERO DE TODO.
   *
   * Antes bastaba con que quien organiza tecleara un correo para que el
   * desenlace fabricara una cuenta a nombre de esa persona, con su historial y
   * sus trofeos, sin que hubiera pedido nada. Aquí se comprueba lo contrario:
   * se llega al desenlace SIN que nadie haya aceptado, y no debe aparecer ni
   * una cuenta nueva.
   */
  const antesDeTodo = await store.getLive('velada');
  const conTramaMinima = await store.getGame('velada');
  if (antesDeTodo && conTramaMinima) {
    conTramaMinima.plot = tramaMinima(antesDeTodo);
    await store.saveGame(conTramaMinima);
    await cerrarPartidaEnCuentas(conTramaMinima, antesDeTodo);
  }
  salida.sinConsentimiento = {
    // Bruno no tenía ninguna partida apuntada. Si el desenlace le apunta esta
    // sin haberla aceptado él, es que el agujero sigue abierto.
    brunoPartidas: (await store.getAccountByEmail(BRUNO))?.partidas.length ?? -1,
    // Y a Ana, que ya tenía una de antes, no puede sumarle una segunda.
    anaPartidas: (await store.getAccountByEmail(ANA))?.partidas.length ?? -1,
    // Carla no tiene correo siquiera: nunca puede aparecer.
    carlaExiste: Boolean(await store.getAccountByEmail('carla@ejemplo.com')),
  };

  // Y ahora Ana y Bruno SÍ aceptan, que es lo que da de alta el vínculo.
  for (const correo of [ANA, BRUNO]) {
    const vinculo = await aceptarGuardar(correo, correo === ANA ? 'Ana' : 'Bruno');
    const sesion = await store.getLive('velada');
    if (sesion) {
      const j = sesion.players.find((p) => (p.email ?? '').toLowerCase() === correo);
      if (j) j.vinculo = vinculo;
      await store.saveLive(sesion);
    }
  }

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
    conTrama.plot = tramaMinima(sesion);
    await store.saveGame(conTrama);
    await cerrarPartidaEnCuentas(conTrama, sesion);
  }
  salida.trasDesenlace = {
    anaExiste: Boolean(await store.getAccountByEmail(ANA)),
    brunoPartidas: (await store.getAccountByEmail(BRUNO))?.partidas.length ?? -1,
  };

  // --- Borrar la partida tiene que llevarse su sesión en vivo ---
  await store.deleteGame('otra-velada');
  salida.trasBorrarPartida = { sesionSigueViva: Boolean(await store.getLive('otra-velada')) };
} catch (e) {
  salida.error = e instanceof Error ? e.message : String(e);
}

console.log(JSON.stringify(salida));
process.exit(0);
