/**
 * Sonda del inicio de sesión con proveedor. La lanza `verificar-proveedores.ts`.
 *
 * Proceso aparte y cwd temporal, como el resto de sondas: `initStore()` con el
 * cwd del comprobador cargaría el `.env` de verdad y se conectaría al Atlas de
 * producción.
 */
import { getStore, initStore } from '../src/db/store';
import {
  ConflictoDeIdentidad,
  admitidoEnElTaller,
  entrarConProveedor,
  vincularIdentidad,
} from '../src/identidad/cuentas-proveedor';
import type { IdentidadVerificada } from '../src/identidad/cuentas-proveedor';
import type { Request } from 'express';
import type { Account } from '../../shared/live';

await initStore();
const store = getStore();

const salida: Record<string, unknown> = {};

const google = (sub: string, correo?: string, nombre?: string): IdentidadVerificada => ({
  proveedor: 'google',
  sub,
  correo,
  correoVerificado: Boolean(correo),
  esRelay: false,
  nombre,
});
const apple = (sub: string, correo?: string, nombre?: string): IdentidadVerificada => ({
  proveedor: 'apple',
  sub,
  correo,
  correoVerificado: Boolean(correo),
  esRelay: false,
  nombre,
});

try {
  // ---- 1. Entrar por primera vez crea cuenta ----
  const primera = await entrarConProveedor(google('g-ana', 'ana@ejemplo.com', 'Ana'));
  salida.primera = { id: primera.id, email: primera.email, nombre: primera.displayName };

  // ---- 2. Volver a entrar recupera LA MISMA, no crea otra ----
  const segunda = await entrarConProveedor(google('g-ana', 'ana@ejemplo.com', 'Ana'));
  salida.mismaCuenta = segunda.id === primera.id;

  /*
   * ---- 3. LA REGLA GRANDE: no se adopta por coincidencia de correo ----
   * Existe ya una cuenta sembrada con ana@ejemplo.com creada por el camino del
   * consentimiento —el correo lo tecleó quien organiza—. Entrar con Google
   * usando ESE MISMO correo NO puede quedarse con ella.
   */
  const sembrada = await store.getAccountByEmail('ana@ejemplo.com');
  salida.noAdopta = {
    sembradaSigue: Boolean(sembrada && sembrada.id === 'cta-sembrada'),
    // La de Google tiene que ser otra, con su historial vacío.
    cuentaDeGoogleEsOtra: primera.id !== 'cta-sembrada',
    historialDeGoogleVacio: primera.partidas.length === 0,
    // Y la sembrada conserva el suyo, intacto.
    historialSembradoIntacto: sembrada?.partidas.length ?? -1,
  };

  // ---- 4. Apple: la segunda vez no manda correo ni nombre ----
  const appleUno = await entrarConProveedor(apple('a-bruno', 'bruno@ejemplo.com', 'Bruno'));
  const appleDos = await entrarConProveedor(apple('a-bruno'));
  salida.appleSegundaVez = {
    mismaCuenta: appleDos.id === appleUno.id,
    conservaCorreo: appleDos.identidades?.[0]?.correo === 'bruno@ejemplo.com',
    conservaNombre: appleDos.displayName === 'Bruno',
  };

  // ---- 5. Vincular un segundo proveedor desde dentro ----
  const vinculada = await vincularIdentidad(primera, apple('a-ana', 'ana@ejemplo.com', 'Ana'));
  salida.vinculo = {
    proveedores: (vinculada.identidades ?? []).map((i) => i.proveedor).sort(),
    // Vincular corta las sesiones anteriores: sin esto, reclamar por nombre
    // seguiría siendo una puerta trasera a una cuenta ya verificada.
    cortaSesiones: Boolean(vinculada.sesionesValidasDesde),
  };

  // ---- 6. Vincular una identidad AJENA se rechaza, no se fusiona ----
  try {
    await vincularIdentidad(vinculada, apple('a-bruno'));
    salida.fusionAjena = 'SE PERMITIO (mal)';
  } catch (e) {
    salida.fusionAjena = e instanceof ConflictoDeIdentidad ? 'rechazada' : `otro error: ${String(e)}`;
  }
  // Y la cuenta de Bruno sigue siendo suya, entera.
  const brunoDespues = await store.getAccountPorIdentidad('apple', 'a-bruno');
  salida.brunoIntacto = brunoDespues?.id === appleUno.id;

  // ---- 7. El taller: solo quien esté en la lista blanca ----
  const conBuzon = await store.getAccount(primera.id);
  process.env.GM_ADMITIDOS = '';
  salida.tallerSinLista = conBuzon ? admitidoEnElTaller(conBuzon) : null;
  process.env.GM_ADMITIDOS = 'otra@ejemplo.com';
  salida.tallerFueraDeLista = conBuzon ? admitidoEnElTaller(conBuzon) : null;
  process.env.GM_ADMITIDOS = 'ANA@Ejemplo.com';
  salida.tallerEnLista = conBuzon ? admitidoEnElTaller(conBuzon) : null;

  // ---- 8. Un correo SIN verificar no abre el taller aunque esté en la lista ----
  const sinVerificar = await entrarConProveedor({
    proveedor: 'google',
    sub: 'g-carla',
    correo: 'carla@ejemplo.com',
    correoVerificado: false,
    esRelay: false,
  });
  process.env.GM_ADMITIDOS = 'carla@ejemplo.com';
  salida.tallerSinVerificar = admitidoEnElTaller(sinVerificar);

  // ---- 9. LA PUERTA DE VERDAD, no solo la regla ----
  /*
   * Todo lo de arriba comprueba `admitidoEnElTaller`, que es la REGLA. Esto
   * comprueba la PUERTA, que es lo que de verdad defiende el taller, y son
   * cosas distintas: la regla estuvo bien escrita desde el primer momento y aun
   * así el taller estaba abierto de par en par, porque el guardián nunca la
   * llamaba —le bastaba con que la firma del pasaporte fuera buena.
   *
   * Y ese pasaporte lo tiene TODO EL QUE JUEGA: se lo reparte `/cuenta/entrar`
   * a cualquiera que inicie sesión con su Google en la app. Con la puerta
   * mirando solo la firma, un invitado podía pedir `/api/games/<id>` y leer el
   * culpable, la solución y las pistas de la velada a la que estaba invitado.
   *
   * Por eso esta comprobación no mira una función auxiliar: fabrica la petición
   * tal y como llegaría por la red, con su cabecera, y se la da al guardián.
   */
  const { tallerAbiertoPara } = await import('../src/auth');
  const { emitirSesionDeCuenta, CABECERA_CUENTA } = await import('../src/identidad/sesion');

  /** Una petición con el pasaporte de esa cuenta, como la mandaría la app. */
  const comoJugador = (cuentaId: string): Request =>
    ({
      headers: { [CABECERA_CUENTA]: emitirSesionDeCuenta({ id: cuentaId } as Account, 'google') },
      path: '/games',
    }) as unknown as Request;

  /*
   * `NODE_ENV=production` y no `APP_PASSWORD`, a propósito: `env.appPassword` se
   * congela al importar la configuración y ponerla ahora no cambiaría nada,
   * mientras que el modo producción se consulta en cada llamada. Es además el
   * estado que importa —la puerta cerrada— y sin él la sonda mediría el modo
   * abierto de desarrollo, que deja pasar a todo el mundo y no probaría nada.
   */
  process.env.GM_ADMITIDOS = 'ana@ejemplo.com';
  const antes = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  // Carla juega y NO está admitida (su correo no está verificado).
  salida.puertaJugador = await tallerAbiertoPara(comoJugador(sinVerificar.id));
  // Ana sí: mismo camino, misma cabecera, y a ella la puerta se le abre.
  salida.puertaAdmitida = await tallerAbiertoPara(comoJugador(primera.id));
  // Y un pasaporte de una cuenta que ya no existe tampoco abre nada.
  salida.puertaFantasma = await tallerAbiertoPara(comoJugador('cuenta-que-no-existe'));
  process.env.NODE_ENV = antes;
} catch (e) {
  salida.error = e instanceof Error ? e.message : String(e);
}

console.log(JSON.stringify(salida));
process.exit(0);
