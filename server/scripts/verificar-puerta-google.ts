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
      PLAYER_TOKEN_SECRET: 'secreto-de-prueba-de-puerta-0123456789abcdef',
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
