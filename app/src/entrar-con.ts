/**
 * Iniciar sesión con Google y con Apple.
 *
 * QUÉ HACE ESTE MÓDULO Y QUÉ NO. Consigue el `id_token` del proveedor y lo
 * manda al servidor. La verificación —firma, emisor, audiencia, caducidad— se
 * hace ALLÍ, contra las claves públicas del proveedor, porque un móvil es un
 * entorno hostil y cualquier comprobación hecha aquí se la salta quien quiera.
 * Aquí solo se recoge el sobre; abrirlo es cosa del servidor.
 *
 * SIN CREDENCIALES, INERTE. `disponibles()` pregunta al servidor qué hay
 * configurado y la interfaz enseña solo lo que existe. Nadie ve un botón que no
 * lleva a ningún sitio.
 *
 * EL `nonce` NO ES DECORACIÓN. Se genera aquí, viaja al proveedor, vuelve
 * dentro del testigo firmado y el servidor lo compara. Es lo que impide que un
 * testigo capturado en otra parte —o uno viejo— sirva para entrar: sin él, un
 * `id_token` legítimo de otra sesión valdría igual.
 */
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as api from './api';

/** Necesario para que el navegador de sesión se cierre solo al volver. */
WebBrowser.maybeCompleteAuthSession();

export type Proveedor = 'google' | 'apple';

export class SinProveedor extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'SinProveedor';
  }
}

/** Qué formas de entrar ofrece el servidor con el que se está hablando. */
export async function disponibles(): Promise<{ google: boolean; apple: boolean }> {
  try {
    return await api.proveedoresDisponibles();
  } catch {
    return { google: false, apple: false };
  }
}

/** Un nonce de un solo uso, y su huella para mandársela al proveedor. */
async function nonceYHuella(): Promise<{ nonce: string; huella: string }> {
  const nonce = Crypto.randomUUID();
  /*
   * Apple espera la HUELLA del nonce, no el nonce; devuelve dentro del testigo
   * el SHA-256 de lo que se le mandó. Google admite el valor tal cual. Se
   * calculan los dos y cada camino usa el suyo.
   */
  const huella = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  return { nonce, huella };
}

/**
 * Google.
 *
 * Se pide directamente el `id_token` (flujo implícito de OpenID Connect), que
 * es lo único que necesita el servidor: no se guarda ningún `access_token` ni
 * se pide ningún permiso sobre la cuenta más allá de saber quién eres.
 */
export async function entrarConGoogle(): Promise<void> {
  const clienteId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clienteId) {
    throw new SinProveedor(
      'Entrar con Google no está configurado en esta versión de la app. Usa tu código.',
    );
  }

  const { nonce } = await nonceYHuella();
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'gamemasters' });

  const peticion = new AuthSession.AuthRequest({
    clientId: clienteId,
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    scopes: ['openid', 'email', 'profile'],
    extraParams: { nonce },
  });

  const resultado = await peticion.promptAsync({
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  });

  if (resultado.type !== 'success') {
    // Cancelar no es un error: la persona cambió de idea.
    if (resultado.type === 'cancel' || resultado.type === 'dismiss') return;
    throw new Error('Google no completó la entrada.');
  }
  const idToken = resultado.params.id_token;
  if (!idToken) throw new Error('Google no devolvió testigo de identidad.');

  await api.entrarConProveedor('google', idToken, nonce);
}

/**
 * Apple.
 *
 * Solo en iOS: el diálogo nativo no existe en Android ni en la web, y ahí hace
 * falta el flujo web con un Services ID y un dominio verificado — que es la
 * fase siguiente. Mientras tanto, en esas plataformas el botón ni se ofrece.
 *
 * Y OJO CON LO QUE SOLO LLEGA UNA VEZ: Apple manda el correo y el nombre
 * ÚNICAMENTE en el primer inicio de sesión. El servidor los guarda en esa misma
 * escritura porque no vuelven nunca (ver `identidad/cuentas-proveedor.ts`).
 */
export async function entrarConApple(): Promise<void> {
  if (Platform.OS !== 'ios') {
    throw new SinProveedor('Entrar con Apple está disponible en iPhone y iPad.');
  }
  const { nonce, huella } = await nonceYHuella();

  // Importación diferida: el módulo nativo no existe en web ni en Android, y
  // cargarlo arriba rompería el arranque en esas plataformas.
  const AppleAuthentication = await import('expo-apple-authentication');
  const credencial = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    // Se manda la HUELLA; el testigo devuelve esa misma huella como `nonce`.
    nonce: huella,
  });

  if (!credencial.identityToken) throw new Error('Apple no devolvió testigo de identidad.');
  await api.entrarConProveedor('apple', credencial.identityToken, huella);
  void nonce;
}
