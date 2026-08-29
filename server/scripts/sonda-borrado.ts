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
import { aceptarGuardar, borrarCuenta, cerrarPartidaEnCuentas } from '../src/live/cuentas';
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

  /*
   * Se BUSCA la cuenta con el correo tal como lo escribió quien organiza, en
   * mayúsculas: si no se normaliza, no encuentra nada y «borra» sin borrar.
   * Y se borra pasando la cuenta entera, que es lo que ahora exige
   * `borrarCuenta` para no llevarse por delante la de otra persona que
   * compartiera dirección.
   */
  const suya = await store.getAccountByEmail('Ana@Ejemplo.COM');
  salida.resultado = suya
    ? await borrarCuenta(suya)
    : { cuentaBorrada: false, partidasLimpiadas: 0 };

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

  /*
   * --- Dos cuentas con el MISMO correo: borrar una no puede llevarse la otra.
   *
   * Ninguna colección tiene índice único, así que esto pasa de verdad: una
   * cuenta nacida de una invitación y otra creada al entrar con un proveedor
   * pueden compartir dirección. El borrado buscaba «la primera con ese correo».
   */
  const gemela1 = await store.saveAccount({
    id: 'gem-1', email: 'gemelas@ejemplo.com', displayName: 'La de la invitación',
    createdAt: new Date().toISOString(), partidas: [], trofeos: [],
  });
  const gemela2 = await store.saveAccount({
    id: 'gem-2', email: 'gemelas@ejemplo.com', displayName: 'La de Google',
    createdAt: new Date().toISOString(), partidas: [], trofeos: [],
    identidades: [{ proveedor: 'google', sub: 'sub-google-1', correoVerificado: true, esRelay: false, vinculadaEl: new Date().toISOString(), vistaEl: new Date().toISOString() }],
  } as Parameters<typeof store.saveAccount>[0]);
  await borrarCuenta(gemela1);
  salida.gemelas = {
    borradaLaSuya: !(await store.getAccount('gem-1')),
    sobreviveLaOtra: Boolean(await store.getAccount('gem-2')),
    idDeLaOtra: gemela2.id,
  };

  /*
   * --- Una invitación no puede adoptar una cuenta ya demostrada ---
   *
   * Escribir el correo de alguien con cuenta en una silla y aceptar «guardar mi
   * partida» la vinculaba a SU cuenta, con su historial y sus trofeos.
   */
  let adopcion = 'no lanzó';
  try {
    await aceptarGuardar('gemelas@ejemplo.com', 'Quien ocupa la silla');
  } catch (e) {
    adopcion = e instanceof Error ? e.message : String(e);
  }
  salida.adopcion = {
    rechazada: adopcion !== 'no lanzó',
    mensaje: adopcion,
    // Y la cuenta demostrada sigue intacta y sin vínculos nuevos.
    laDemostradaSigue: Boolean(await store.getAccount('gem-2')),
  };

  /*
   * --- El barrido limpia TODOS los correos de la cuenta y la marca de silla ---
   */
  const varios = await store.saveAccount({
    id: 'varios-1', email: 'principal@ejemplo.com', displayName: 'Con dos correos',
    createdAt: new Date().toISOString(), partidas: [], trofeos: [],
    correos: [
      { correo: 'principal@ejemplo.com', nivel: 'buzon', origen: 'google', anadidoEl: new Date().toISOString() },
      { correo: 'segundo@ejemplo.com', nivel: 'buzon', origen: 'google', anadidoEl: new Date().toISOString() },
    ],
  } as Parameters<typeof store.saveAccount>[0]);
  const conVarios = await store.getGame('velada');
  if (conVarios) {
    conVarios.suspects = [...conVarios.suspects, { id: 'v1', name: 'Con dos', email: 'segundo@ejemplo.com' }];
    await store.saveGame(conVarios);
    await store.saveLive({
      ...(await store.getLive('velada'))!,
      players: [
        ...((await store.getLive('velada'))?.players ?? []),
        {
          suspectId: 'v1', displayName: 'Con dos', email: 'segundo@ejemplo.com',
          accountId: 'varios-1', joinCode: 'ZZZZZZ', joined: true, elecciones: [], notas: '',
          girosRecibidos: [],
          reclamadaPor: { cuentaId: 'varios-1', correo: 'principal@ejemplo.com', el: new Date().toISOString() },
        },
      ],
    } as Parameters<typeof store.saveLive>[0]);
  }
  await borrarCuenta(varios);
  const trasVarios = await store.getLive('velada');
  const silla = trasVarios?.players.find((j) => j.suspectId === 'v1');
  salida.variosCorreos = {
    segundoBarridoEnSesion: !silla?.email,
    segundoBarridoEnPartida: !(await store.getGame('velada'))?.suspects.some((x) => x.email === 'segundo@ejemplo.com'),
    reclamadaPorBorrada: !silla?.reclamadaPor,
  };
} catch (e) {
  salida.error = e instanceof Error ? e.message : String(e);
}

console.log(JSON.stringify(salida));
process.exit(0);
