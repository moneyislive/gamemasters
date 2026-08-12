/**
 * La verificación de identidad de Google y Apple, comprobada de verdad.
 *
 *   npm run verify:tokens
 *
 * SIN NINGUNA CUENTA DE GOOGLE NI DE APPLE. Se genera aquí mismo un par de
 * claves RSA, se levanta un servidor efímero que sirve su JWKS igual que lo
 * haría un proveedor, y se firman testigos a medida. Eso permite probar HOY los
 * modos de fallo que de otro modo solo se descubren en producción, con un
 * usuario real delante y sin forma de reproducirlo.
 *
 * Las nueve trampas que se cubren, y por qué cada una:
 *
 *   1. Firma manipulada → rechazo. Lo obvio, pero hay que tenerlo.
 *   2. Clave desconocida (`kid` que no está en el JWKS) → rechazo.
 *   3. Emisor ajeno → rechazo. Un testigo de otro sitio no vale aquí.
 *   4. Las DOS formas del emisor de Google → las dos valen. Google emite
 *      `accounts.google.com` y `https://accounts.google.com` indistintamente.
 *   5. Audiencia fuera del conjunto → rechazo.
 *   6. Audiencia = bundle id Y audiencia = Services ID → las dos valen. Es EL
 *      error número uno de las integraciones con Apple: iOS nativo firma con el
 *      bundle id, y web y Android con el Services ID.
 *   7. Caducado → rechazo.
 *   8. `nonce` distinto → rechazo. Es lo que impide reutilizar un testigo.
 *   9. `email_verified` como CADENA «true» → verificado. Apple lo manda unas
 *      veces así y otras como booleano; compararlo con `=== true` deja fuera la
 *      mitad de los inicios de sesión, de forma intermitente.
 *
 * Y dos más que importan tanto como esas: el correo de «Ocultar mi correo» se
 * reconoce como lo que es, y un segundo inicio de sesión de Apple SIN correo ni
 * nombre —que es lo que ocurre siempre a partir de la segunda vez— sigue
 * identificando a la misma persona por su `sub`.
 */
import crypto from 'node:crypto';
import http from 'node:http';

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

// ---------------------------------------------------------------------------
// Un proveedor de mentira, con claves de verdad
// ---------------------------------------------------------------------------

const KID = 'clave-de-prueba-1';
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwkPublica = { ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' };

const servidorDeClaves = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=600' });
  res.end(JSON.stringify({ keys: [jwkPublica] }));
});
await new Promise<void>((r) => servidorDeClaves.listen(0, '127.0.0.1', r));
const dir = servidorDeClaves.address();
const PUERTO = typeof dir === 'object' && dir ? dir.port : 0;
const JWKS = `http://127.0.0.1:${PUERTO}/keys`;

const EMISOR_GOOGLE = 'https://accounts.google.com';
const EMISOR_GOOGLE_CORTO = 'accounts.google.com';
const EMISOR_APPLE = 'https://appleid.apple.com';
const CLIENTE_WEB = '111-web.apps.googleusercontent.com';
const BUNDLE = 'com.harkania.jugar';
const SERVICES_ID = 'com.harkania.jugar.web';

/*
 * Las costuras. Solo se leen fuera de producción, y el arranque del servidor se
 * niega a levantar si están puestas en producción — que es lo que impide que
 * esto se convierta en una puerta trasera.
 */
process.env.NODE_ENV = 'test';
process.env.OIDC_JWKS_GOOGLE = JWKS;
process.env.OIDC_JWKS_APPLE = JWKS;
process.env.GOOGLE_CLIENT_IDS = CLIENTE_WEB;
process.env.APPLE_CLIENT_IDS = `${BUNDLE},${SERVICES_ID}`;

// Se importa DESPUÉS de poner el entorno: la configuración se lee al llamar.
const { verificarIdToken, TestigoInvalido, olvidarClaves, costurasDePruebaActivas } = await import(
  '../src/identidad/oidc'
);

const b64url = (d: Buffer | string): string =>
  Buffer.from(d).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Firma un testigo como lo haría el proveedor. */
function firmar(claims: Record<string, unknown>, opciones: { kid?: string } = {}): string {
  const cabecera = b64url(JSON.stringify({ alg: 'RS256', kid: opciones.kid ?? KID, typ: 'JWT' }));
  const ahora = Math.floor(Date.now() / 1000);
  const carga = b64url(JSON.stringify({ iat: ahora, exp: ahora + 3600, ...claims }));
  const firma = crypto.sign('RSA-SHA256', Buffer.from(`${cabecera}.${carga}`), privateKey);
  return `${cabecera}.${carga}.${b64url(firma)}`;
}

const deGoogle = (extra: Record<string, unknown> = {}, emisor = EMISOR_GOOGLE): string =>
  firmar({ iss: emisor, aud: CLIENTE_WEB, sub: 'g-12345', email: 'ana@ejemplo.com', email_verified: true, ...extra });

/** ¿Rechaza? Devuelve el motivo, o null si lo aceptó (que sería el fallo). */
async function rechaza(proveedor: 'google' | 'apple', testigo: string, nonce?: string): Promise<string | null> {
  try {
    await verificarIdToken(proveedor, testigo, nonce);
    return null;
  } catch (e) {
    return e instanceof TestigoInvalido ? e.message : `otro error: ${String(e)}`;
  }
}

try {
  paso('Un testigo legítimo pasa');

  const bueno = await verificarIdToken('google', deGoogle());
  comprobar('se acepta', bueno.sub === 'g-12345', bueno);
  comprobar('con su correo', bueno.correo === 'ana@ejemplo.com', bueno.correo);
  comprobar('marcado como verificado', bueno.correoVerificado === true);
  comprobar('y no es una dirección de reenvío', bueno.esRelay === false);

  paso('Las nueve formas de que un testigo NO valga');

  // 1. Firma manipulada.
  const manipulado = deGoogle();
  const partes = manipulado.split('.');
  comprobar(
    'con la firma cambiada, no',
    (await rechaza('google', `${partes[0]}.${partes[1]}.${b64url('mentira')}`)) !== null,
  );

  // La carga alterada tiene que invalidar la firma, que es lo mismo pero al revés.
  const otraCarga = b64url(JSON.stringify({ iss: EMISOR_GOOGLE, aud: CLIENTE_WEB, sub: 'IMPOSTOR', exp: 2 ** 31 }));
  comprobar(
    'ni cambiando lo que dice dentro',
    (await rechaza('google', `${partes[0]}.${otraCarga}.${partes[2]}`)) !== null,
  );

  // 2. Clave desconocida.
  comprobar(
    'firmado con una clave que no está publicada, no',
    (await rechaza('google', firmar({ iss: EMISOR_GOOGLE, aud: CLIENTE_WEB, sub: 'x' }, { kid: 'otra' }))) !== null,
  );

  // 3. Emisor ajeno.
  comprobar(
    'emitido por otro, no',
    (await rechaza('google', deGoogle({}, 'https://malo.example.com'))) !== null,
  );

  // 5. Audiencia fuera del conjunto.
  comprobar(
    'para otra aplicación, no',
    (await rechaza('google', firmar({ iss: EMISOR_GOOGLE, aud: 'otra-app.apps.googleusercontent.com', sub: 'x' }))) !== null,
  );

  // 7. Caducado.
  const ahora = Math.floor(Date.now() / 1000);
  comprobar(
    'caducado, no',
    (await rechaza('google', firmar({ iss: EMISOR_GOOGLE, aud: CLIENTE_WEB, sub: 'x', iat: ahora - 7200, exp: ahora - 3600 }))) !== null,
  );

  // 8. Nonce distinto.
  comprobar(
    'con un nonce que no es el de esta entrada, no',
    (await rechaza('google', deGoogle({ nonce: 'el-de-otro' }), 'el-mio')) !== null,
  );
  comprobar(
    'y con el correcto, sí',
    (await rechaza('google', deGoogle({ nonce: 'el-mio' }), 'el-mio')) === null,
  );

  // Un testigo de Google no vale como testigo de Apple.
  comprobar(
    'un testigo de Google no pasa por Apple',
    (await rechaza('apple', deGoogle())) !== null,
  );

  paso('4. Google emite el emisor de DOS formas, y las dos son legítimas');

  comprobar('con https://', (await rechaza('google', deGoogle({}, EMISOR_GOOGLE))) === null);
  comprobar('y sin él', (await rechaza('google', deGoogle({}, EMISOR_GOOGLE_CORTO))) === null);

  paso('6. Apple firma con DOS audiencias distintas según de dónde vengas');

  // Es el error número uno: comparar `aud` contra una constante deja fuera a
  // la mitad de los usuarios y el mensaje no dice por qué.
  const deApple = (aud: string, extra: Record<string, unknown> = {}): string =>
    firmar({ iss: EMISOR_APPLE, aud, sub: 'a-999', ...extra });

  comprobar(
    'iOS nativo firma con el bundle id, y vale',
    (await rechaza('apple', deApple(BUNDLE))) === null,
  );
  comprobar(
    'web y Android firman con el Services ID, y también vale',
    (await rechaza('apple', deApple(SERVICES_ID))) === null,
  );
  comprobar(
    'pero un identificador que no es ninguno de los dos, no',
    (await rechaza('apple', deApple('com.otro.app'))) !== null,
  );

  paso('9. `email_verified` llega a veces como CADENA');

  const comoCadena = await verificarIdToken(
    'apple',
    deApple(BUNDLE, { email: 'bruno@ejemplo.com', email_verified: 'true' }),
  );
  comprobar('«true» como cadena cuenta como verificado', comoCadena.correoVerificado === true);

  const comoBooleano = await verificarIdToken(
    'apple',
    deApple(BUNDLE, { email: 'bruno@ejemplo.com', email_verified: true }),
  );
  comprobar('y como booleano, también', comoBooleano.correoVerificado === true);

  const sinDecirlo = await verificarIdToken('apple', deApple(BUNDLE, { email: 'x@ejemplo.com' }));
  comprobar('si no lo dice, NO se da por verificado', sinDecirlo.correoVerificado === false);

  paso('«Ocultar mi correo» se reconoce como lo que es');

  const relayPorClaim = await verificarIdToken(
    'apple',
    deApple(BUNDLE, { email: 'raro@ejemplo.com', email_verified: true, is_private_email: 'true' }),
  );
  comprobar('lo dice el propio testigo', relayPorClaim.esRelay === true);

  const relayPorDominio = await verificarIdToken(
    'apple',
    deApple(BUNDLE, { email: 'abc123@privaterelay.appleid.com', email_verified: true }),
  );
  comprobar('o se ve en el dominio', relayPorDominio.esRelay === true);

  paso('El segundo inicio de sesión de Apple no trae correo ni nombre');

  // A partir de la segunda vez, Apple no manda ni `email` ni `name`. Si el
  // servidor dependiera de ellos para identificar a alguien, cada persona
  // tendría una cuenta nueva en cada entrada.
  const primera = await verificarIdToken(
    'apple',
    deApple(BUNDLE, { email: 'carla@ejemplo.com', email_verified: true, name: 'Carla' }),
  );
  const segunda = await verificarIdToken('apple', deApple(BUNDLE));
  comprobar('la identidad es la misma', primera.sub === segunda.sub, [primera.sub, segunda.sub]);
  comprobar('aunque la segunda venga sin correo', segunda.correo === undefined, segunda.correo);
  comprobar('y sin nombre', segunda.nombre === undefined, segunda.nombre);
  comprobar('la primera sí los traía', primera.correo === 'carla@ejemplo.com' && primera.nombre === 'Carla');

  paso('Sin credenciales configuradas no se verifica nada');

  const guardadas = process.env.GOOGLE_CLIENT_IDS;
  delete process.env.GOOGLE_CLIENT_IDS;
  comprobar(
    'un proveedor sin identificadores de cliente rechaza todo',
    (await rechaza('google', deGoogle())) !== null,
  );
  process.env.GOOGLE_CLIENT_IDS = guardadas;

  comprobar('y las costuras de prueba se detectan, para poder prohibirlas', costurasDePruebaActivas());

  olvidarClaves();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  await new Promise<void>((r) => servidorDeClaves.close(() => r()));
}

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. Los testigos de identidad se verifican de verdad.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
