/**
 * El camino del NAVEGADOR para entrar con Google, comprobado sin tener cuenta.
 *
 *   npm run verify:puerta-google
 *
 * QUÉ PRUEBA ESTO Y QUÉ NO. No inicia sesión: eso exige credenciales de Google
 * de verdad y una persona delante. Prueba lo que sí se puede probar sin ellas, y
 * que es justo donde estaba el fallo que motivó el fichero: que el botón del
 * taller LLEVA A ALGÚN SITIO.
 *
 * Porque el primer intento puso en la puerta un enlace precioso a
 * `/api/cuenta/entrar/google`, una ruta que no existía. Compilaba, se veía bien,
 * y al pulsarlo daba un 404. Ninguna comprobación de las que había lo habría
 * notado nunca: todas miraban funciones, y un enlace roto no es una función.
 *
 * De ahí que esto levante un servidor de verdad y llame por HTTP.
 *
 * AISLAMIENTO. Proceso aparte, cwd temporal, entorno explícito y enumerado. Sin
 * esto, `dotenv` cargaría el `.env` de la casa y la prueba hablaría con el Atlas
 * de producción y con la clave de Anthropic de verdad.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const CONTRASENA = 'la-contrasena-de-la-casa';
const CLIENTE_FALSO = '1234567890-abcdefg.apps.googleusercontent.com';
const SECRETO = 'secreto-de-prueba-de-puerta-0123456789abcdef';

/*
 * El secreto se fija ANTES de importar el módulo de sobres, porque `secreto.ts`
 * lo lee al cargarse. Con él, esta prueba puede fabricar un código de canje
 * legítimo y comprobar de verdad que solo sirve una vez — en lugar de limitarse
 * a mirar que un código inventado se rechaza, que no prueba casi nada.
 */
process.env.PLAYER_TOKEN_SECRET = SECRETO;
const { cerrarSobre } = await import('../src/identidad/sobre');

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`,
  );
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

type Respuesta = { estado: number; cuerpo: string; cabeceras: Headers };

function arrancar(dir: string, puerto: number, google: boolean): ChildProcess {
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  return spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(puerto),
      NODE_ENV: 'test',
      APP_PASSWORD: CONTRASENA,
      PLAYER_TOKEN_SECRET: SECRETO,
      CLIENT_DIR: path.join(dir, 'cliente'),
      UPLOADS_DIR: path.join(dir, 'uploads'),
      ...(google ? { GOOGLE_CLIENT_IDS: CLIENTE_FALSO } : {}),
    },
    stdio: 'ignore',
  });
}

async function pedir(puerto: number, ruta: string, init?: RequestInit): Promise<Respuesta> {
  const r = await fetch(`http://127.0.0.1:${puerto}${ruta}`, { redirect: 'manual', ...init });
  return { estado: r.status, cuerpo: await r.text(), cabeceras: r.headers };
}

async function esperar(puerto: number): Promise<void> {
  for (let intento = 0; intento < 80; intento++) {
    try {
      await fetch(`http://127.0.0.1:${puerto}/api/salud`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`el servidor del puerto ${puerto} no llegó a responder`);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-puerta-'));
let sinGoogle: ChildProcess | undefined;
let conGoogle: ChildProcess | undefined;
let terceros: ChildProcess | undefined;

try {
  // -------------------------------------------------------------------------
  paso('Sin credenciales configuradas, no se ofrece lo que no hay');
  // -------------------------------------------------------------------------
  /*
   * Un botón que no lleva a ningún sitio es peor que no tener botón: quien lo
   * pulsa cree que el problema es suyo. Por eso el taller PREGUNTA antes de
   * pintarlo, y la ruta responde 503 —«no configurado»— y no 404 ni 500.
   */
  const dirA = path.join(dir, 'a');
  sinGoogle = arrancar(dirA, 5891, false);
  await esperar(5891);

  const anuncio = await pedir(5891, '/api/cuenta/proveedores');
  comprobar('el taller puede preguntar qué hay, sin contraseña', anuncio.estado === 200, anuncio);
  comprobar('y se le dice que Google no está', anuncio.cuerpo.includes('"google":false'), anuncio.cuerpo);

  const apagado = await pedir(5891, '/api/cuenta/entrar/google');
  comprobar('la ruta EXISTE aunque no esté configurada', apagado.estado !== 404, apagado.estado);
  comprobar('y responde «no configurado», no un error', apagado.estado === 503, apagado.estado);

  sinGoogle.kill();
  sinGoogle = undefined;

  // -------------------------------------------------------------------------
  paso('Con credenciales, el botón lleva de verdad a Google');
  // -------------------------------------------------------------------------
  const dirB = path.join(dir, 'b');
  conGoogle = arrancar(dirB, 5892, true);
  await esperar(5892);

  const anuncioB = await pedir(5892, '/api/cuenta/proveedores');
  comprobar('ahora sí se ofrece', anuncioB.cuerpo.includes('"google":true'), anuncioB.cuerpo);

  const ida = await pedir(5892, '/api/cuenta/entrar/google');
  comprobar('el botón redirige', ida.estado === 302, ida.estado);

  const destino = ida.cabeceras.get('location') ?? '';
  const url = destino.startsWith('http') ? new URL(destino) : null;
  comprobar('a Google, y no a otro sitio', url?.host === 'accounts.google.com', destino.slice(0, 120));
  comprobar('con el cliente configurado', url?.searchParams.get('client_id') === CLIENTE_FALSO, destino.slice(0, 200));
  comprobar(
    'pidiendo el testigo de identidad y nada más',
    url?.searchParams.get('response_type') === 'id_token',
    url?.searchParams.get('response_type'),
  );
  comprobar(
    'sin pedir permisos sobre la cuenta: solo saber quién eres',
    url?.searchParams.get('scope') === 'openid email profile',
    url?.searchParams.get('scope'),
  );
  comprobar(
    'y volviendo a la ruta de retorno de este mismo servidor',
    url?.searchParams.get('redirect_uri') === 'http://127.0.0.1:5892/api/cuenta/retorno',
    url?.searchParams.get('redirect_uri'),
  );

  /*
   * El nonce es lo que impide que un testigo capturado en otra parte sirva para
   * entrar aquí. Tiene que ir en el viaje Y quedarse guardado para la vuelta: si
   * solo fuera en el viaje, no habría contra qué compararlo al volver.
   */
  const nonceEnViaje = url?.searchParams.get('nonce') ?? '';
  comprobar('lleva un nonce', nonceEnViaje.length >= 16, nonceEnViaje);

  const galleta = ida.cabeceras.get('set-cookie') ?? '';
  comprobar('y lo deja guardado para la vuelta', galleta.includes('gm_nonce='), galleta.slice(0, 90));
  comprobar(
    'fuera del alcance de cualquier script de la página',
    /httponly/i.test(galleta),
    galleta.slice(0, 120),
  );
  comprobar(
    'y el nonce NO viaja en claro en la cookie: va firmado',
    !galleta.includes(nonceEnViaje),
    'la cookie contiene el nonce tal cual',
  );

  // -------------------------------------------------------------------------
  paso('La vuelta');
  // -------------------------------------------------------------------------
  const retorno = await pedir(5892, '/api/cuenta/retorno');
  comprobar('la página de retorno existe', retorno.estado === 200, retorno.estado);
  comprobar(
    'y recoge el testigo del fragmento, que es donde Google lo deja',
    retorno.cuerpo.includes('location.hash'),
    retorno.cuerpo.slice(0, 160),
  );

  /*
   * Sin la cookie del nonce no se puede comprobar nada, así que no se intenta.
   * Que responda 400 y no 500 importa: es la diferencia entre «esto ha caducado,
   * vuelve a empezar» y una traza de error en el registro.
   */
  const sinNonce = await pedir(5892, '/api/cuenta/entrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proveedor: 'google', idToken: 'inventado', desdeNavegador: true }),
  });
  comprobar('sin la cookie del nonce no se entra', sinNonce.estado === 400, sinNonce);

  // -------------------------------------------------------------------------
  paso('El camino de la APP, que es distinto del del taller');
  // -------------------------------------------------------------------------
  /*
   * ESTA ES LA COMPROBACIÓN QUE NO EXISTÍA, y por eso el botón de Google de la
   * app se escribió entero sin poder funcionar nunca: pedía el testigo a Google
   * con una dirección de vuelta `gamemasters://`, y Google no admite un esquema
   * propio en NINGÚN tipo de cliente. Compilaba, se veía bien, y solo lo habría
   * descubierto alguien pulsando el botón en su móvil.
   *
   * Ahora la app pasa por el servidor, y esto vigila que el rodeo sea el que se
   * dice que es.
   */
  const idaApp = await pedir(5892, '/api/cuenta/entrar/google?destino=app');
  comprobar('la app usa la MISMA puerta que el taller', idaApp.estado === 302, idaApp.estado);
  const urlApp = new URL(idaApp.cabeceras.get('location') ?? 'http://x');
  comprobar(
    'y por tanto la MISMA dirección de vuelta, que es la única dada de alta',
    urlApp.searchParams.get('redirect_uri') === 'http://127.0.0.1:5892/api/cuenta/retorno',
    urlApp.searchParams.get('redirect_uri'),
  );
  comprobar(
    'nunca un esquema propio, que Google rechaza',
    !(idaApp.cabeceras.get('location') ?? '').includes('gamemasters://'),
    idaApp.cabeceras.get('location')?.slice(0, 120),
  );
  comprobar(
    'la página de retorno sabe volver a la app',
    retorno.cuerpo.includes('gamemasters://entrar?codigo='),
    retorno.cuerpo.slice(0, 200),
  );
  comprobar(
    'y NUNCA pone el pasaporte en ese enlace: solo un código',
    !retorno.cuerpo.includes('pasaporte'),
    'la página del retorno menciona el pasaporte',
  );

  /*
   * El código de canje es de UN SOLO USO. Se puede comprobar de verdad porque
   * esta prueba conoce el secreto —lo eligió ella— y puede fabricar un sobre
   * válido. Los dos códigos de respuesta distintos son la prueba: el primero
   * llega hasta el final (y falla por la cuenta inventada), el segundo ni
   * siquiera, porque ya está gastado.
   */
  const codigo = cerrarSobre('canje:v1', { cuentaId: 'cta-inventada', jti: 'jti-de-prueba' }, 120);
  const canje = (c: string) =>
    pedir(5892, '/api/cuenta/entrar/canjear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: c }),
    });

  const basura = await canje('esto-no-es-un-sobre');
  comprobar('un código inventado no vale', basura.estado === 401, basura.estado);

  const primera = await canje(codigo);
  comprobar('un código bien firmado se abre', primera.estado === 401, primera);
  comprobar(
    'y llega hasta el final: falla por la cuenta, no por el sobre',
    primera.cuerpo.includes('cuenta'),
    primera.cuerpo.slice(0, 120),
  );

  const segunda = await canje(codigo);
  comprobar('pero el MISMO código ya no vale una segunda vez', segunda.estado === 409, segunda);

  /*
   * Y una comprobación sobre el CÓDIGO FUENTE DE LA APP, que es rara y aquí está
   * justificada: todo lo de arriba vive en el servidor, y el fallo original
   * vivía en la app. Un servidor impecable no impide que `entrar-con.ts` vuelva
   * a pedirle el testigo a Google por su cuenta con un esquema propio, que es
   * exactamente lo que no puede funcionar y lo que nadie ve hasta que alguien
   * pulsa el botón en un móvil de verdad.
   */
  const appEntrar = fs.readFileSync(path.join(REPO, 'app', 'src', 'entrar-con.ts'), 'utf8');
  /*
   * Sin los comentarios, y no por elegancia: la primera versión de esto buscaba
   * `makeRedirectUri` en el fichero entero y saltaba siempre, porque el propio
   * comentario que explica POR QUÉ no se usa lo nombra. Una comprobación que
   * falla con el código bueno se acaba desactivando, y entonces ya no protege
   * nada.
   */
  const appCodigo = appEntrar.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  comprobar(
    'la app NO le pide el testigo a Google por su cuenta',
    !appCodigo.includes('makeRedirectUri'),
    'entrar-con.ts vuelve a usar makeRedirectUri: Google rechaza los esquemas propios',
  );
  comprobar(
    'sino que abre la puerta del servidor',
    appEntrar.includes('/api/cuenta/entrar/google?destino=app'),
    'entrar-con.ts ya no abre la puerta del servidor',
  );
  comprobar(
    'y canjea el código en vez de recibir el pasaporte por el enlace',
    appEntrar.includes('canjearEntrada'),
    'entrar-con.ts ya no canjea el código',
  );

  // -------------------------------------------------------------------------
  paso('Los ficheros que Apple y Google leen en el dominio');
  // -------------------------------------------------------------------------
  /*
   * Sin configurar responden 404 A PROPÓSITO. Un fichero de asociación con un
   * hueco dentro es peor que ninguno: las plataformas lo cachean durante días y
   * en ese tiempo la aplicación queda desvinculada del dominio.
   */
  const aasaApagado = await pedir(5892, '/.well-known/apple-app-site-association');
  comprobar('sin APPLE_TEAM_ID, no se inventa nada', aasaApagado.estado === 404, aasaApagado.estado);
  const linksApagado = await pedir(5892, '/.well-known/assetlinks.json');
  comprobar('sin la huella de Android, tampoco', linksApagado.estado === 404, linksApagado.estado);

  /*
   * Y NO devuelven el index.html del taller, que es lo que hacía el comodín.
   * Es la parte que de verdad importa: un 200 con una página HTML dentro se lo
   * traga la plataforma como respuesta válida y la verificación falla en
   * silencio, días después y sin ninguna pista.
   */
  comprobar(
    'y sobre todo: NO devuelven la página del taller con un 200',
    !aasaApagado.cuerpo.includes('<!doctype html') && !aasaApagado.cuerpo.includes('<html'),
    aasaApagado.cuerpo.slice(0, 120),
  );

  const dirC = path.join(dir, 'c');
  fs.mkdirSync(path.join(dirC, 'data'), { recursive: true });
  const conDominio = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: dirC,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: '5893',
      NODE_ENV: 'test',
      APP_PASSWORD: CONTRASENA,
      PLAYER_TOKEN_SECRET: SECRETO,
      CLIENT_DIR: path.join(dirC, 'cliente'),
      UPLOADS_DIR: path.join(dirC, 'uploads'),
      APPLE_TEAM_ID: 'AB12CD34EF',
      ANDROID_CERT_SHA256: 'aa:bb:cc',
    },
    stdio: 'ignore',
  });
  terceros = conDominio;
  await esperar(5893);

  const aasa = await pedir(5893, '/.well-known/apple-app-site-association');
  comprobar('con equipo configurado, Apple recibe su fichero', aasa.estado === 200, aasa.estado);
  comprobar(
    'y con tipo JSON, que el fichero no tiene extensión y sin esto Apple lo descarta',
    (aasa.cabeceras.get('content-type') ?? '').includes('application/json'),
    aasa.cabeceras.get('content-type'),
  );

  const detalle = JSON.parse(aasa.cuerpo).applinks.details[0];
  comprobar(
    'con el identificador completo: equipo y paquete',
    detalle.appIDs[0] === 'AB12CD34EF.com.gamemasters.jugar',
    detalle.appIDs,
  );
  /*
   * ESCRITO POR INCLUSIÓN, y esta es la comprobación que lo vigila. La forma
   * cómoda —«todo el dominio menos /api»— hace que iOS reclame para la app
   * también `/` y `/cluedo/<id>`, o sea el taller entero: quien pulsara un
   * enlace del taller con la app instalada acabaría en una pantalla que no
   * existe, y nadie ataría los dos cabos.
   */
  const incluidas = detalle.components.filter((c: { exclude?: boolean }) => !c.exclude);
  comprobar(
    'y solo reclama las rutas de la app, nunca el dominio entero',
    JSON.stringify(incluidas.map((c: Record<string, string>) => c['/'])) === '["/i/*","/e/*"]',
    detalle.components,
  );
  comprobar(
    'con la API excluida antes que nada, porque gana la primera regla',
    detalle.components[0]['/'] === '/api/*' && detalle.components[0].exclude === true,
    detalle.components[0],
  );

  const links = await pedir(5893, '/.well-known/assetlinks.json');
  comprobar('Android recibe el suyo', links.estado === 200, links.estado);
  comprobar(
    'con la huella en mayúsculas, como espera Google',
    JSON.parse(links.cuerpo)[0].target.sha256_cert_fingerprints[0] === 'AA:BB:CC',
    links.cuerpo.slice(0, 160),
  );

  // -------------------------------------------------------------------------
  paso('Y nada de esto ha abierto el taller');
  // -------------------------------------------------------------------------
  /*
   * Lo más importante del fichero. Todo lo de arriba son rutas que van montadas
   * ANTES del guardián, porque quien juega tiene que poder llegar a ellas sin
   * conocer la contraseña de la casa. El riesgo evidente de montar algo delante
   * del guardián es que arrastre al resto consigo.
   */
  const taller = await pedir(5892, '/api/games');
  comprobar('el taller sigue pidiendo credenciales', taller.estado === 401, taller.estado);

  const conPasaporteInventado = await pedir(5892, '/api/games', {
    headers: { 'X-GM-Cuenta': 'esto.no.es.un.pasaporte' },
  });
  comprobar(
    'y un pasaporte inventado no lo abre',
    conPasaporteInventado.estado === 401,
    conPasaporteInventado.estado,
  );

  const fotos = await pedir(5892, '/uploads/');
  comprobar('las fotos de los invitados tampoco se sirven', fotos.estado === 401, fotos.estado);
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  sinGoogle?.kill();
  conGoogle?.kill();
  terceros?.kill();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* carpeta temporal: no merece tumbar la prueba */
  }
}

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. El botón del taller lleva a Google y a ningún otro sitio.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
