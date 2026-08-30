/**
 * Sonda de las invitaciones. La lanza `verificar-invitaciones.ts`.
 *
 * Proceso aparte y cwd en carpeta temporal, por lo mismo que las otras sondas:
 * `initStore()` con el cwd del comprobador cargaría el `.env` de verdad y se
 * conectaría al Atlas de producción.
 */
import { getStore, initStore } from '../src/db/store';
import { invitacionesPara } from '../src/live/invitaciones';
import type { Account } from '../../shared/live';

await initStore();
const store = getStore();

const salida: Record<string, unknown> = {};

try {
  const cuenta = (await store.getAccountByEmail('ana@ejemplo.com'))!;

  // 1. Tal cual está: correo solo confirmado, sin proveedor.
  const invitaciones = await invitacionesPara(cuenta);
  salida.invitaciones = invitaciones;
  // El JSON ENTERO, para poder buscar dentro cualquier cosa que no debería ir.
  salida.crudo = JSON.stringify(invitaciones);

  // 2. El mismo correo, pero verificado por un proveedor: ahí sí se entra
  //    directo, y solo en sala de espera y con la silla libre.
  const conBuzon: Account = {
    ...cuenta,
    correos: [
      { correo: 'ana@ejemplo.com', nivel: 'buzon', origen: 'google', anadidoEl: cuenta.createdAt },
    ],
  };
  salida.conBuzon = (await invitacionesPara(conBuzon)).map((i) => ({
    gameId: i.gameId,
    directa: i.directa,
  }));

  // 3. «Ocultar mi correo»: verificado, sí, pero es un alias que no se parece
  //    en nada a lo que escribió quien organiza. No puede casar nada.
  const conRelay: Account = {
    ...cuenta,
    email: 'abc123@privaterelay.appleid.com',
    correos: [
      {
        correo: 'abc123@privaterelay.appleid.com',
        nivel: 'buzon',
        origen: 'apple',
        esRelay: true,
        anadidoEl: cuenta.createdAt,
      },
    ],
  };
  // La partida `con-relay` invita a ESA dirección: así se mide de verdad que un
  // alias de «Ocultar mi correo» no abre la puerta, aunque case.
  const suyas = await invitacionesPara(conRelay);
  salida.conRelay = suyas.length;
  salida.relayDirecta = suyas.some((i) => i.directa);

  /*
   * Las condiciones de «entrar sin teclear código», una a una. Verificar el
   * buzón NO basta: hace falta además que la mesa se esté formando y que la
   * silla esté libre. Cada una se mide por separado porque cada una tapa un
   * agujero distinto, y una prueba que las mezclara no diría cuál se rompió.
   */
  const conBuzonBase: Account = {
    ...cuenta,
    correos: [
      { correo: 'ana@ejemplo.com', nivel: 'buzon', origen: 'google', anadidoEl: cuenta.createdAt },
    ],
  };

  // (a) La partida ya ha empezado.
  const enJuego = await store.getLive('con-ana');
  if (enJuego) {
    enJuego.phase = 'ronda-abierta';
    await store.saveLive(enJuego);
  }
  salida.empezadaDirecta =
    (await invitacionesPara(conBuzonBase)).find((i) => i.gameId === 'con-ana')?.directa ?? null;

  // (b) De vuelta a la sala de espera, pero con la silla ya ocupada.
  const enLobby = await store.getLive('con-ana');
  if (enLobby) {
    enLobby.phase = 'lobby';
    const j = enLobby.players.find((x) => x.participanteId === 's0');
    if (j) j.joined = true;
    await store.saveLive(enLobby);
  }
  salida.ocupadaDirecta =
    (await invitacionesPara(conBuzonBase)).find((i) => i.gameId === 'con-ana')?.directa ?? null;
} catch (e) {
  salida.error = e instanceof Error ? e.message : String(e);
}

console.log(JSON.stringify(salida));
process.exit(0);
