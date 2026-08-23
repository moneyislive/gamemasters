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

/**
 * Qué formas de entrar ofrece el servidor con el que se está hablando.
 *
 * DEVUELVE TRES CASOS Y NO DOS, y la razón es un defecto que tuvo este fichero:
 * antes atrapaba el error de red y devolvía `{google:false, apple:false}`, o
 * sea EXACTAMENTE lo mismo que cuando el servidor está bien y no tiene ningún
 * proveedor configurado. Dos problemas muy distintos con la misma cara:
 *
 *   · «este servidor no ofrece entrar con Google» — no hay nada que hacer, y la
 *     app debe explicar cómo se consigue una cuenta hoy.
 *   · «no llego al servidor» — puede ser el wifi, puede ser que el servidor
 *     esté dormido, o puede que la app se compilara apuntando a una dirección
 *     equivocada. Callarlo hace que se busque el fallo donde no está.
 *
 * Y el tercer caso lo pide el sitio donde vive esto: un servidor gratuito que
 * se duerme tarda cerca de un minuto en despertar, así que «no llego» es un
 * estado NORMAL y pasajero que hay que saber contar.
 */
export type Proveedores =
  | { estado: 'listo'; google: boolean; apple: boolean }
  | { estado: 'sin-servidor' };

export async function disponibles(): Promise<Proveedores> {
  try {
    const { google, apple } = await api.proveedoresDisponibles();
    return { estado: 'listo', google, apple };
  } catch {
    return { estado: 'sin-servidor' };
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
 * Google, a través del servidor.
 *
 * LA APP NO HABLA CON GOOGLE, y este es el motivo, que costó descubrir: Google
 * no admite un esquema propio como `harkania://` en la dirección de vuelta
 * de ningún tipo de cliente. El cliente **web** solo acepta `http` y `https`;
 * el de **iOS** obliga a que el esquema sea su propio identificador invertido
 * (`com.googleusercontent.apps.…`); y el de **Android** ni siquiera tiene campo
 * para una dirección de vuelta.
 *
 * La primera versión de este fichero pedía el testigo directamente con
 * `AuthSession.makeRedirectUri({ scheme: 'harkania' })`, y eso NO PODÍA
 * funcionar contra Google de verdad: devuelve `redirect_uri_mismatch`. Compilaba,
 * se veía bien, y solo lo habría descubierto una persona pulsando el botón en su
 * móvil — porque el comprobador solo recorría el camino del navegador.
 *
 * Ahora se abre una página DEL SERVIDOR en el navegador de sesión. El servidor
 * hace el viaje a Google con la única dirección de vuelta que hay dada de alta
 * —la del dominio— y devuelve a `harkania://entrar?codigo=…` un código de un
 * solo uso y dos minutos, que se cambia aquí por la sesión.
 *
 * Ese rodeo compra tres cosas: un solo identificador de cliente que mantener,
 * ninguna credencial dentro del binario de la app, y la misma puerta servirá
 * mañana para Apple en Android, que tiene exactamente el mismo problema.
 */
export async function entrarConGoogle(): Promise<void> {
  const servidor = api.urlDelServidor();
  const resultado = await WebBrowser.openAuthSessionAsync(
    `${servidor}/api/cuenta/entrar/google?destino=app`,
    'harkania://entrar',
  );

  if (resultado.type !== 'success') {
    // Cancelar no es un error: la persona cambió de idea.
    return;
  }

  const codigo = new URL(resultado.url).searchParams.get('codigo');
  if (!codigo) throw new Error('La entrada no se completó. Inténtalo otra vez.');

  await api.canjearEntrada(codigo);
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
