/**
 * El sustrato de identidad, comprobado.
 *
 *   npm run verify:cuentas
 *
 * DOS COSAS SE PRUEBAN AQUÍ, Y LAS DOS SON DE LAS QUE NO AVISAN CUANDO FALLAN.
 *
 * 1. LA SEPARACIÓN DE DOMINIOS. En este servidor conviven cuatro clases de
 *    testigo firmadas con el MISMO secreto: la credencial del jugador, la
 *    cookie del taller, el enlace de una foto y ahora el pasaporte de cuenta.
 *    Que un testigo emitido para una cosa no valga para otra no puede quedar en
 *    manos de que los formatos «casualmente» no se parezcan: eso se cumple
 *    hasta el día que deja de cumplirse, y ese día no hay error, hay una
 *    escalada de privilegios silenciosa.
 *
 * 2. LA PUERTA FALLA CERRADA. Hasta ahora, `APP_PASSWORD` vacía significaba
 *    «deja pasar a todo el mundo». Eso convertía borrar una variable del panel
 *    en abrir el taller entero —con la solución del caso servida en
 *    `/api/games/<id>`—. Importa más ahora, porque en cuanto una cuenta pueda
 *    abrir el taller habrá un motivo legítimo para quitar esa contraseña.
 *
 * Se ejecuta en el proceso del comprobador, sin servidor: todo lo que se mide
 * son funciones puras o middlewares con una petición fingida. Importar `secreto`
 * no conecta con nada.
 */
import { cerrarSobre, abrirSobre } from '../src/identidad/sobre';
import { emitirSesionDeCuenta, sesionDeCuentaDePeticion } from '../src/identidad/sesion';
import { identidadDeTaller } from '../src/auth';
import { emitirCredencial, verificarCredencial } from '../src/live/token';
import { firmarConSecreto } from '../src/secreto';
import type { Request } from 'express';
import type { Account } from '../../shared/live';
import type { SesionDeCuenta } from '../../shared/identidad';

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 200)}`}`,
  );
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/** Una petición fingida, con lo justo que miran los guardianes. */
function peticion(cabeceras: Record<string, string> = {}): Request {
  return { headers: cabeceras, path: '/games' } as unknown as Request;
}

const CUENTA: Account = {
  id: 'cta-prueba',
  email: 'alguien@ejemplo.com',
  displayName: 'Alguien',
  createdAt: new Date().toISOString(),
  partidas: [],
  trofeos: [],
};

// ---------------------------------------------------------------------------
// 1. El sobre firmado
// ---------------------------------------------------------------------------

paso('Un sobre solo se abre por su dominio');

const deCuenta = cerrarSobre('cuenta:v1', { cuentaId: 'c1' }, 60);
comprobar('un sobre se abre por su dominio', abrirSobre('cuenta:v1', deCuenta) !== null);
comprobar(
  'y NO por otro, aunque el secreto sea el mismo',
  abrirSobre('invitacion:v1', deCuenta) === null,
);

const caducado = cerrarSobre('cuenta:v1', { cuentaId: 'c1' }, -1);
comprobar('un sobre caducado no se abre', abrirSobre('cuenta:v1', caducado) === null);

comprobar('basura no se abre', abrirSobre('cuenta:v1', 'nada.de.nada') === null);
comprobar('vacío tampoco', abrirSobre('cuenta:v1', undefined) === null);

// Alterar un solo carácter de la carga tiene que invalidar la firma.
const tocado = `${deCuenta.slice(0, 3)}${deCuenta[3] === 'a' ? 'b' : 'a'}${deCuenta.slice(4)}`;
comprobar('con la carga alterada no se abre', abrirSobre('cuenta:v1', tocado) === null);

// Y firmar el mensaje SIN el dominio —que es lo que se hacía antes— no vale.
const sinDominio = (() => {
  const carga = Buffer.from(JSON.stringify({ cuentaId: 'c1', iat: 1, exp: 2 ** 31 }))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${carga}.${firmarConSecreto(carga)}`;
})();
comprobar(
  'un testigo firmado sin dominio no pasa por pasaporte de cuenta',
  abrirSobre('cuenta:v1', sinDominio) === null,
);

// ---------------------------------------------------------------------------
// 2. Los dos sistemas de credencial no se tocan
// ---------------------------------------------------------------------------

paso('La credencial de jugador y el pasaporte de cuenta viven separados');

const credencialDeJugador = emitirCredencial('partida', 'jugador-1', 'sesion-a');
const pasaporte = emitirSesionDeCuenta(CUENTA, 'google');

comprobar(
  'una credencial de jugador NO vale como pasaporte de cuenta',
  abrirSobre('cuenta:v1', credencialDeJugador) === null,
);
comprobar(
  'y un pasaporte de cuenta NO vale como credencial de jugador',
  verificarCredencial(pasaporte) === null,
);
comprobar('cada uno sigue valiendo para lo suyo', verificarCredencial(credencialDeJugador) !== null);

// El pasaporte viaja por SU puerta, nunca por `Authorization`: con cabeceras
// separadas, un 401 de una no puede echarte de la otra.
comprobar(
  'el pasaporte se lee de X-GM-Cuenta',
  sesionDeCuentaDePeticion(peticion({ 'x-gm-cuenta': pasaporte }))?.cuentaId === CUENTA.id,
);
comprobar(
  'y de la cookie gm_cuenta',
  sesionDeCuentaDePeticion(peticion({ cookie: `gm_cuenta=${pasaporte}` }))?.cuentaId === CUENTA.id,
);
comprobar(
  'pero NUNCA de Authorization',
  sesionDeCuentaDePeticion(peticion({ authorization: `Bearer ${pasaporte}` })) === null,
);
comprobar(
  'y trae con qué proveedor se entró',
  sesionDeCuentaDePeticion(peticion({ 'x-gm-cuenta': pasaporte }))?.via === 'google',
);

// ---------------------------------------------------------------------------
// 3. La puerta del taller
// ---------------------------------------------------------------------------

paso('La puerta falla CERRADA cuando falta la contraseña en producción');

const conEntorno = <T>(vars: Record<string, string | undefined>, hacer: () => T): T => {
  const previos: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    previos[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return hacer();
  } finally {
    for (const [k, v] of Object.entries(previos)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
};

/*
 * `env.appPassword` se resuelve al cargar el módulo de configuración, así que
 * cambiar la variable de entorno aquí no lo mueve. Lo que sí se puede probar es
 * la rama que decide el modo abierto, que es la que tenía el fallo: sin
 * contraseña, ¿entra alguien en producción?
 */
const sinContrasena = process.env.APP_PASSWORD === undefined || process.env.APP_PASSWORD === '';

if (sinContrasena) {
  comprobar(
    'sin contraseña y FUERA de producción, se pasa (desarrollo en local)',
    conEntorno({ NODE_ENV: 'test' }, () => identidadDeTaller(peticion())?.tipo === 'abierto'),
  );
  comprobar(
    'sin contraseña y EN producción, NO se pasa',
    conEntorno({ NODE_ENV: 'production' }, () => identidadDeTaller(peticion()) === null),
  );
} else {
  comprobar('hay APP_PASSWORD en el entorno: la rama abierta no se puede medir aquí', true);
  comprobar('sin cookie no se pasa', identidadDeTaller(peticion()) === null);
}

// Y con pasaporte se entra SIEMPRE, incluso en producción y sin contraseña de
// casa: es lo que permitirá retirar `APP_PASSWORD` el día que haya cuentas.
comprobar(
  'con pasaporte de cuenta se entra, y se sabe quién es',
  conEntorno({ NODE_ENV: 'production' }, () => {
    const quien = identidadDeTaller(peticion({ 'x-gm-cuenta': pasaporte }));
    return quien?.tipo === 'cuenta' && quien.cuentaId === CUENTA.id;
  }),
);
comprobar(
  'un pasaporte caducado no abre nada',
  conEntorno({ NODE_ENV: 'production' }, () =>
    identidadDeTaller(peticion({ 'x-gm-cuenta': cerrarSobre('cuenta:v1', { cuentaId: 'x' }, -1) })) === null,
  ),
);
comprobar(
  'ni un pasaporte inventado',
  conEntorno({ NODE_ENV: 'production' }, () =>
    identidadDeTaller(peticion({ 'x-gm-cuenta': 'me.lo.invento' })) === null,
  ),
);

// ---------------------------------------------------------------------------

const leido = abrirSobre<SesionDeCuenta>('cuenta:v1', pasaporte);
comprobar('el pasaporte caduca de verdad', typeof leido?.exp === 'number' && leido.exp > 0);
comprobar(
  'y dura 90 días, no una velada',
  Boolean(leido && leido.exp - leido.iat === 60 * 60 * 24 * 90),
  leido && leido.exp - leido.iat,
);

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. La identidad se sostiene.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
