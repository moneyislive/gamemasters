/**
 * Verificación de los testigos de identidad de Google y Apple.
 *
 * SE VERIFICA AQUÍ, EN EL SERVIDOR, Y LOCALMENTE. El móvil manda un `id_token`
 * firmado por el proveedor; este fichero comprueba la firma contra las claves
 * públicas del proveedor y lee lo que dice dentro. No se llama a ningún
 * endpoint de «dime si este testigo vale»: Google lo desaconseja expresamente
 * para producción, añade una dependencia de red en el camino crítico del login,
 * y no hace falta para nada.
 *
 * SIN LIBRERÍAS. Node trae desde hace tiempo todo lo necesario —importar una
 * clave en formato JWK y verificar una firma RS256— así que meter una
 * dependencia nueva sería añadir superficie que auditar a cambio de ahorrar
 * cuarenta líneas.
 *
 * LOS CINCO SITIOS DONDE SE ESTRELLA TODO EL MUNDO, y por qué este código los
 * trata como los trata:
 *
 *   1. `aud` ES UN CONJUNTO, NO UNA CONSTANTE. Es el error número uno. Google,
 *      en móvil nativo, firma con el identificador de cliente WEB (el de la
 *      plataforma va en `azp`). Apple, en iOS nativo, firma con el BUNDLE ID de
 *      la app —`com.harkania.jugar`— y no con el Services ID, que es el que
 *      usa en web y en Android. Comparar contra un solo valor deja fuera a la
 *      mitad de tus usuarios, y el mensaje de error no dice por qué.
 *   2. `iss` DE GOOGLE TIENE DOS FORMAS: `accounts.google.com` y
 *      `https://accounts.google.com`. Las dos son legítimas. Apple solo emite
 *      `https://appleid.apple.com`.
 *   3. `email_verified` LLEGA A VECES COMO CADENA. Apple lo manda unas veces
 *      como booleano y otras como `"true"`. Comparar con `=== true` deja fuera
 *      la mitad de los inicios de sesión, de forma intermitente.
 *   4. HAY CORREOS QUE NO SON CORREOS. «Ocultar mi correo» de Apple entrega una
 *      dirección `@privaterelay.appleid.com` distinta por aplicación. No se
 *      parece en nada a la que el Game Master escribió, así que no puede casar
 *      invitaciones, y hay que saberlo desde el primer momento.
 *   5. APPLE SOLO MANDA EL NOMBRE Y EL CORREO LA PRIMERA VEZ. Si no se guardan
 *      en esa misma escritura, no vuelven jamás.
 *
 * LA COSTURA DE PRUEBAS. Los emisores y las direcciones de las claves se pueden
 * sobrescribir por entorno, pero SOLO fuera de producción, y el arranque se
 * niega a levantar si alguien lo intenta en producción. Es lo que permite
 * probar los nueve modos de fallo hoy, contra un juego de claves propio, sin
 * cuenta de Google ni de Apple.
 */
import crypto from 'node:crypto';
import type { IdentidadDeProveedor, ProveedorId } from '../../../shared/identidad';

// ---------------------------------------------------------------------------
// Configuración de cada proveedor
// ---------------------------------------------------------------------------

interface Proveedor {
  /** Emisores admitidos. Google tiene dos formas legítimas. */
  emisores: string[];
  jwks: string;
  /** Identificadores de cliente admitidos: SIEMPRE varios. Ver el punto 1. */
  audiencias: string[];
}

function listaDeEntorno(nombre: string): string[] {
  return (process.env[nombre] ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** ¿Se están usando las costuras de prueba? El arranque lo consulta. */
export function costurasDePruebaActivas(): boolean {
  return Object.keys(process.env).some((k) => k.startsWith('OIDC_ISS_') || k.startsWith('OIDC_JWKS_'));
}

function proveedores(): Record<ProveedorId, Proveedor> {
  const enPruebas = process.env.NODE_ENV !== 'production';
  const sobrescribir = (nombre: string, porDefecto: string): string =>
    (enPruebas && process.env[nombre]?.trim()) || porDefecto;

  return {
    google: {
      emisores: enPruebas && process.env.OIDC_ISS_GOOGLE
        ? [process.env.OIDC_ISS_GOOGLE]
        : ['https://accounts.google.com', 'accounts.google.com'],
      jwks: sobrescribir('OIDC_JWKS_GOOGLE', 'https://www.googleapis.com/oauth2/v3/certs'),
      audiencias: listaDeEntorno('GOOGLE_CLIENT_IDS'),
    },
    apple: {
      emisores: enPruebas && process.env.OIDC_ISS_APPLE
        ? [process.env.OIDC_ISS_APPLE]
        : ['https://appleid.apple.com'],
      jwks: sobrescribir('OIDC_JWKS_APPLE', 'https://appleid.apple.com/auth/keys'),
      // El bundle id de la app y el Services ID: los dos son legítimos.
      audiencias: listaDeEntorno('APPLE_CLIENT_IDS'),
    },
  };
}

/** ¿Hay credenciales configuradas para este proveedor? */
export function proveedorConfigurado(id: ProveedorId): boolean {
  return proveedores()[id].audiencias.length > 0;
}

// ---------------------------------------------------------------------------
// Las claves públicas, cacheadas
// ---------------------------------------------------------------------------

interface Cache {
  claves: Map<string, crypto.KeyObject>;
  hasta: number;
}
const cacheDeClaves = new Map<string, Cache>();

/** Cuánto se puede guardar la respuesta, según lo que diga el propio proveedor. */
function segundosDeCache(cabecera: string | null): number {
  const maxAge = /max-age=(\d+)/i.exec(cabecera ?? '')?.[1];
  const segundos = maxAge ? Number(maxAge) : 3600;
  // Ni tan poco que se pida en cada inicio de sesión, ni tanto que una rotación
  // de claves del proveedor nos deje rechazando testigos legítimos.
  return Math.min(Math.max(segundos, 300), 86_400);
}

async function clavesDe(url: string): Promise<Map<string, crypto.KeyObject>> {
  const guardadas = cacheDeClaves.get(url);
  if (guardadas && guardadas.hasta > Date.now()) return guardadas.claves;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`no se pudieron leer las claves del proveedor (${r.status})`);
  const cuerpo = (await r.json()) as { keys?: Array<Record<string, unknown>> };

  const claves = new Map<string, crypto.KeyObject>();
  for (const jwk of cuerpo.keys ?? []) {
    const kid = typeof jwk.kid === 'string' ? jwk.kid : undefined;
    if (!kid) continue;
    try {
      claves.set(kid, crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' }));
    } catch {
      // Una clave que no sabemos leer no invalida las demás.
    }
  }
  cacheDeClaves.set(url, {
    claves,
    hasta: Date.now() + segundosDeCache(r.headers.get('cache-control')) * 1000,
  });
  return claves;
}

/** Solo para las pruebas: olvida lo cacheado. */
export function olvidarClaves(): void {
  cacheDeClaves.clear();
}

// ---------------------------------------------------------------------------
// La verificación
// ---------------------------------------------------------------------------

const deB64url = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** Los algoritmos que se admiten, y cómo se verifica cada uno. */
const ALGORITMOS: Record<string, { hash: string; opciones?: crypto.SignPrivateKeyInput }> = {
  RS256: { hash: 'RSA-SHA256' },
  ES256: { hash: 'SHA256' },
};

export class TestigoInvalido extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'TestigoInvalido';
  }
}

/**
 * Comprueba un `id_token` y devuelve la identidad que afirma.
 *
 * Lanza `TestigoInvalido` ante cualquier duda. No hay «casi válido».
 */
export async function verificarIdToken(
  proveedor: ProveedorId,
  idToken: string,
  nonceEsperado?: string,
): Promise<Omit<IdentidadDeProveedor, 'vinculadaEl' | 'vistaEl'>> {
  const config = proveedores()[proveedor];
  if (config.audiencias.length === 0) {
    throw new TestigoInvalido(`No hay credenciales configuradas para ${proveedor}.`);
  }

  const partes = idToken.split('.');
  if (partes.length !== 3) throw new TestigoInvalido('El testigo no tiene forma de JWT.');
  const [cabeceraB64, cargaB64, firmaB64] = partes as [string, string, string];

  let cabecera: { kid?: string; alg?: string };
  let claims: Record<string, unknown>;
  try {
    cabecera = JSON.parse(deB64url(cabeceraB64).toString('utf8'));
    claims = JSON.parse(deB64url(cargaB64).toString('utf8'));
  } catch {
    throw new TestigoInvalido('El testigo no se puede leer.');
  }

  const algoritmo = ALGORITMOS[cabecera.alg ?? ''];
  if (!algoritmo) throw new TestigoInvalido(`Algoritmo no admitido: ${cabecera.alg}.`);
  if (!cabecera.kid) throw new TestigoInvalido('El testigo no dice con qué clave se firmó.');

  const claves = await clavesDe(config.jwks);
  const clave = claves.get(cabecera.kid);
  if (!clave) throw new TestigoInvalido('El testigo se firmó con una clave desconocida.');

  const firmaOk = crypto.verify(
    algoritmo.hash,
    Buffer.from(`${cabeceraB64}.${cargaB64}`),
    cabecera.alg === 'ES256' ? { key: clave, dsaEncoding: 'ieee-p1363' } : clave,
    deB64url(firmaB64),
  );
  if (!firmaOk) throw new TestigoInvalido('La firma no cuadra.');

  // --- Quién lo emitió ---
  if (!config.emisores.includes(String(claims.iss))) {
    throw new TestigoInvalido('El testigo no lo emitió quien dice.');
  }

  // --- Para quién ---
  // `aud` puede venir como cadena o como lista: el estándar admite las dos.
  const audiencias = Array.isArray(claims.aud) ? claims.aud.map(String) : [String(claims.aud)];
  if (!audiencias.some((a) => config.audiencias.includes(a))) {
    throw new TestigoInvalido('El testigo es para otra aplicación.');
  }

  // --- Cuándo ---
  const ahora = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp < ahora) {
    throw new TestigoInvalido('El testigo ha caducado.');
  }
  // Margen de un minuto: los relojes no van sincronizados al segundo.
  if (typeof claims.iat === 'number' && claims.iat > ahora + 60) {
    throw new TestigoInvalido('El testigo viene del futuro.');
  }

  // --- Que sea el de esta petición y no uno reutilizado ---
  if (nonceEsperado && String(claims.nonce ?? '') !== nonceEsperado) {
    throw new TestigoInvalido('El testigo no corresponde a este intento de entrada.');
  }

  const sub = String(claims.sub ?? '');
  if (!sub) throw new TestigoInvalido('El testigo no identifica a nadie.');

  const correo = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : undefined;

  return {
    proveedor,
    sub,
    correo,
    // Como cadena a propósito: ver el punto 3 de la cabecera.
    correoVerificado: String(claims.email_verified) === 'true',
    esRelay:
      String(claims.is_private_email) === 'true' ||
      Boolean(correo?.endsWith('@privaterelay.appleid.com')),
    nombre: typeof claims.name === 'string' ? claims.name : undefined,
  };
}
