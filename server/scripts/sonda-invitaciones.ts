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
} catch (e) {
  salida.error = e instanceof Error ? e.message : String(e);
}

console.log(JSON.stringify(salida));
process.exit(0);
