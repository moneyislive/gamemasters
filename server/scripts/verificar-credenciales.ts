/**
 * La cadena de credenciales, comprobada.
 *
 *   npm run verify:credenciales
 *
 * Esto existe porque la auditoría encontró un agujero que se pudo REPRODUCIR:
 * la clave con la que se firmaban los testigos de los jugadores era, cuando no
 * había contraseña de la casa, una constante escrita en el código fuente. Con
 * ella y el `participanteId` de otro jugador —que la propia vista te da— cualquier
 * invitado fabricaba la credencial de un rival, le leía el dosier entero y
 * encontraba al culpable en la ronda uno.
 *
 * Un arreglo de seguridad sin una prueba que falle antes y pase después es una
 * declaración de intenciones. Estas comprobaciones son la prueba, y están
 * escritas desde el punto de vista del atacante: si alguna vuelve a pasar, es
 * que el agujero ha vuelto.
 */
import crypto from 'node:crypto';
import {
  credencialDePeticion,
  credencialValidaPara,
  emitirCredencial,
  verificarCredencial,
} from '../src/live/token';
import { firmarConSecreto, secretoDeFirma } from '../src/secreto';

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (!condicion) {
    fallos.push(`${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 200)}`}`);
  }
}

const b64url = (d: Buffer | string): string =>
  Buffer.from(d).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// ---------------------------------------------------------------------------
// 1. La falsificación que SÍ funcionaba
// ---------------------------------------------------------------------------

/** Lo que hacía el atacante: firmar con la constante que estaba en el código. */
function falsificarConClaveVieja(gameId: string, participanteId: string): string {
  const carga = b64url(JSON.stringify({ gameId, participanteId, iat: Math.floor(Date.now() / 1000) }));
  const firma = b64url(
    crypto.createHmac('sha256', 'gamemasters:jugador:v1:sin-contrasena').update(carga).digest(),
  );
  return `${carga}.${firma}`;
}

comprobar(
  'la constante del código ya no sirve para firmar',
  verificarCredencial(falsificarConClaveVieja('p1', 'culpable')) === null,
);

// Y tampoco sirve derivándola de la contraseña, que era el otro camino.
function falsificarDesdeContrasena(gameId: string, participanteId: string, pass: string): string {
  const carga = b64url(JSON.stringify({ gameId, participanteId, iat: 1, exp: 2 ** 31 }));
  const firma = b64url(
    crypto.createHmac('sha256', `gamemasters:jugador:v1:${pass}`).update(carga).digest(),
  );
  return `${carga}.${firma}`;
}
comprobar(
  'ni adivinando la contraseña de la casa',
  verificarCredencial(falsificarDesdeContrasena('p1', 'culpable', 'secreta')) === null,
);

// ---------------------------------------------------------------------------
// 2. El secreto es de verdad un secreto
// ---------------------------------------------------------------------------

const secreto = secretoDeFirma();
comprobar('el secreto tiene entropía suficiente', secreto.length >= 32, secreto.length);
comprobar(
  'y no es ninguna de las constantes que hubo',
  !['sin-contrasena', 'gamemasters:jugador:v1:sin-contrasena'].includes(secreto),
);

// La firma de la cookie del taller ya no permite probar contraseñas sin
// conexión: sin el secreto, no se puede calcular ni una candidata.
const cookieReal = firmarConSecreto('gamemasters:sesion:v2:hola1234');
const cookieAdivinada = b64url(
  crypto.createHmac('sha256', 'hola1234').update('gamemasters:sesion:v1').digest('hex'),
);
comprobar('la cookie ya no se puede reproducir sabiendo la contraseña', cookieReal !== cookieAdivinada);

// ---------------------------------------------------------------------------
// 3. Un testigo legítimo sigue funcionando
// ---------------------------------------------------------------------------

const bueno = emitirCredencial('partida', 'jugador-1', 'sesion-a');
const leido = verificarCredencial(bueno);
comprobar('un testigo emitido por el servidor vale', leido !== null);
comprobar('y dice quién es', leido?.participanteId === 'jugador-1' && leido.gameId === 'partida');
comprobar('lleva caducidad', typeof leido?.exp === 'number' && leido.exp > Math.floor(Date.now() / 1000));
comprobar('y la sesión en la que se emitió', leido?.sid === 'sesion-a');

comprobar(
  'se lee de la cabecera Authorization',
  credencialDePeticion(`Bearer ${bueno}`)?.participanteId === 'jugador-1',
);
comprobar('y una cabecera sin Bearer no cuela', credencialDePeticion(bueno) === null);

// ---------------------------------------------------------------------------
// 4. Manipular el contenido invalida la firma
// ---------------------------------------------------------------------------

const [cargaBuena] = bueno.split('.');
const cargaManipulada = b64url(
  JSON.stringify({ ...leido, participanteId: 'otro-jugador' }),
);
comprobar(
  'cambiar a quién dice ser rompe la firma',
  verificarCredencial(`${cargaManipulada}.${bueno.split('.')[1]}`) === null,
);
comprobar(
  'y una firma inventada tampoco pasa',
  verificarCredencial(`${cargaBuena}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`) === null,
);

// ---------------------------------------------------------------------------
// 5. La caducidad
// ---------------------------------------------------------------------------

const caducado = (() => {
  const carga = b64url(
    JSON.stringify({ gameId: 'p', participanteId: 'j', iat: 1000, exp: Math.floor(Date.now() / 1000) - 60 }),
  );
  return `${carga}.${firmarConSecreto(carga)}`;
})();
comprobar('un testigo caducado se rechaza aunque la firma sea buena', verificarCredencial(caducado) === null);

const sinCaducidad = (() => {
  const carga = b64url(JSON.stringify({ gameId: 'p', participanteId: 'j', iat: 1000 }));
  return `${carga}.${firmarConSecreto(carga)}`;
})();
comprobar(
  'un testigo antiguo, sin caducidad, tampoco vale',
  verificarCredencial(sinCaducidad) === null,
);

// ---------------------------------------------------------------------------
// 6. Reabrir la partida echa a los móviles viejos
// ---------------------------------------------------------------------------

const deLaSesionVieja = verificarCredencial(emitirCredencial('partida', 'jugador-1', 'sesion-a'))!;

comprobar(
  'el testigo vale en su propia sesión',
  credencialValidaPara(deLaSesionVieja, { sid: 'sesion-a' }),
);
comprobar(
  'y deja de valer en cuanto se reabre la partida',
  !credencialValidaPara(deLaSesionVieja, { sid: 'sesion-b' }),
);
comprobar(
  'una sesión anterior a este cambio no echa a nadie a media partida',
  credencialValidaPara(deLaSesionVieja, {}),
);

// ---------------------------------------------------------------------------

console.log('\nLa cadena de credenciales');
console.log(`${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('\nLa falsificación que la auditoría reprodujo ya no funciona.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
