/**
 * El transporte de verdad: Amazon SES por HTTPS, firmado a mano.
 *
 * POR QUÉ NO EL SDK DE AWS. Esto se despliega en EC2 y la única operación que
 * hace falta es UNA: mandar un correo. `@aws-sdk/client-sesv2` arrastra decenas
 * de paquetes y varios megas para eso, y cada dependencia nueva en el servidor
 * es superficie que hay que mantener al día. Firmar una petición SigV4 son
 * cuarenta líneas de `node:crypto` y no cambia nunca: el algoritmo lleva
 * congelado desde 2012 y AWS no puede romperlo sin romper media internet.
 *
 * POR QUÉ NO SMTP. También sirve, y también obligaría a una dependencia
 * (`nodemailer`) — pero además el puerto 25 sale bloqueado de fábrica en EC2 y
 * el 587 exige unas credenciales SMTP distintas de las de IAM, que es un
 * segundo secreto que guardar y rotar. Por HTTPS se sale siempre.
 *
 * LO QUE ESTA IMPLEMENTACIÓN NO PUEDE PROBAR SOLA. Que AWS acepte la firma solo
 * se sabe hablando con AWS, y eso no lo puede hacer una comprobación
 * automática de este repositorio. Lo que sí se comprueba —y es donde estaría el
 * fallo si lo hubiera— es que la petición que sale lleva la firma que le
 * corresponde AL CUERPO QUE SE ESTÁ MANDANDO: el modo de fallo clásico de una
 * firma escrita a mano es firmar una cosa y enviar otra, y eso deja un 403 de
 * AWS que no dice por qué. Ver `verificar-enlaces`, que recompone la firma por
 * su cuenta y la compara.
 */
import crypto from 'node:crypto';
import type { MensajeCompuesto, Transporte } from './mensaje';

const ALGORITMO = 'AWS4-HMAC-SHA256';
const SERVICIO = 'ses';
/** La operación de SES v2 que manda un correo ya redactado. */
const RUTA = '/v2/email/outbound-emails';

/** Lo que hace falta para poder mandar. Sin esto no se intenta siquiera. */
interface Credenciales {
  claveId: string;
  claveSecreta: string;
  /** Solo con credenciales temporales (un rol de instancia, por ejemplo). */
  testigoDeSesion?: string;
  region: string;
  /** El «De:», que en SES tiene que ser una dirección ya verificada. */
  remitente: string;
  /** A dónde se manda. Configurable para poder probarlo: ver abajo. */
  endpoint: string;
}

/**
 * Reúne la configuración, o explica exactamente qué falta.
 *
 * Falla con el nombre de la variable dentro del mensaje a propósito: este error
 * lo va a leer alguien a quien las invitaciones no le han salido, probablemente
 * con invitados esperando, y «falta configuración» no le sirve de nada.
 */
function credenciales(): Credenciales {
  const claveId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const claveSecreta = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const region = (process.env.SES_REGION ?? process.env.AWS_REGION)?.trim();
  const remitente = process.env.CORREO_REMITENTE?.trim();

  const faltan: string[] = [];
  if (!claveId) faltan.push('AWS_ACCESS_KEY_ID');
  if (!claveSecreta) faltan.push('AWS_SECRET_ACCESS_KEY');
  if (!region) faltan.push('SES_REGION (o AWS_REGION)');
  if (!remitente) faltan.push('CORREO_REMITENTE');
  if (!claveId || !claveSecreta || !region || !remitente) {
    throw new Error(
      `CORREO_MODO=ses pero falta ${faltan.join(', ')}. Sin eso no se puede mandar ni un correo; ` +
        'quita CORREO_MODO para volver al modo de memoria, que al menos deja copiar los enlaces.',
    );
  }

  /*
   * EL ENDPOINT SE PUEDE APUNTAR A OTRO SITIO, y hace falta que se pueda: sin
   * ello, la firma solo se podría comprobar mandando correos de verdad desde
   * una cuenta de AWS, o sea nunca. Es la misma costura que ya tiene la
   * verificación de identidad con `OIDC_ISS_*`.
   *
   * Y por eso mismo, en producción tiene que ser HTTPS. Un endpoint en claro
   * ahí significaría o bien que alguien se ha equivocado, o bien que las
   * invitaciones —con nombre, correo y título de la velada— están saliendo hacia
   * donde no toca; en los dos casos, mejor no mandar nada.
   */
  const endpoint = process.env.SES_ENDPOINT?.trim() || `https://email.${region}.amazonaws.com`;
  if (process.env.NODE_ENV === 'production' && !endpoint.startsWith('https://')) {
    throw new Error(
      `SES_ENDPOINT apunta a «${endpoint}», que no es HTTPS, y esto es producción. Por ahí saldrían ` +
        'en claro el nombre y el correo de cada persona invitada.',
    );
  }

  return {
    claveId,
    claveSecreta,
    testigoDeSesion: process.env.AWS_SESSION_TOKEN?.trim() || undefined,
    region,
    remitente,
    endpoint,
  };
}

function sha256(dato: string): string {
  return crypto.createHash('sha256').update(dato, 'utf8').digest('hex');
}

function hmac(clave: crypto.BinaryLike, dato: string): Buffer {
  return crypto.createHmac('sha256', clave).update(dato, 'utf8').digest();
}

/**
 * La clave de firma del día.
 *
 * Se deriva en cuatro pasos —fecha, región, servicio, sufijo— y el orden
 * importa: es lo que hace que una clave robada del tráfico de un día no valga
 * para otro día, otra región u otro servicio.
 */
function claveDeFirma(secreta: string, fecha: string, region: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secreta}`, fecha), region), SERVICIO), 'aws4_request');
}

/** El cuerpo de la petición de SES, tal como lo espera la API v2. */
function cuerpoDeSes(mensaje: MensajeCompuesto, remitente: string): string {
  return JSON.stringify({
    FromEmailAddress: remitente,
    Destination: { ToAddresses: [mensaje.para] },
    Content: {
      Simple: {
        Subject: { Data: mensaje.asunto, Charset: 'UTF-8' },
        Body: {
          Text: { Data: mensaje.texto, Charset: 'UTF-8' },
          Html: { Data: mensaje.html, Charset: 'UTF-8' },
        },
      },
    },
  });
}

/**
 * Firma la petición con SigV4 y devuelve todo lo que hace falta para mandarla.
 *
 * Está separada del envío para poder mirarla desde fuera sin hablar con AWS. La
 * hora se pasa por parámetro por lo mismo: una firma que dependa de `Date.now()`
 * por dentro no se puede comparar contra nada.
 */
export function firmarPeticion(
  cuerpo: string,
  cfg: Credenciales,
  ahora: Date,
): { url: string; cabeceras: Record<string, string> } {
  const marca = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dia = marca.slice(0, 8);
  const host = new URL(cfg.endpoint).host;
  const ambito = `${dia}/${cfg.region}/${SERVICIO}/aws4_request`;
  const huellaDelCuerpo = sha256(cuerpo);

  /*
   * Las cabeceras firmadas van en minúsculas y ordenadas, y la lista tiene que
   * coincidir EXACTAMENTE con la que se declara en `SignedHeaders`. Es el
   * detalle en el que se falla: basta con añadir una cabecera a la petición y
   * olvidarse de meterla aquí (o al revés) para que AWS conteste 403 sin más
   * pista que «la firma no coincide».
   */
  const firmadas: Array<[string, string]> = [
    ['content-type', 'application/json'],
    ['host', host],
    ['x-amz-date', marca],
  ];
  if (cfg.testigoDeSesion) firmadas.push(['x-amz-security-token', cfg.testigoDeSesion]);
  firmadas.sort(([a], [b]) => (a < b ? -1 : 1));

  const canonicas = firmadas.map(([n, v]) => `${n}:${v.trim()}\n`).join('');
  const nombres = firmadas.map(([n]) => n).join(';');

  const peticionCanonica = [
    'POST',
    RUTA,
    '', // sin parámetros de consulta
    canonicas,
    nombres,
    huellaDelCuerpo,
  ].join('\n');

  const aFirmar = [ALGORITMO, marca, ambito, sha256(peticionCanonica)].join('\n');
  const firma = hmac(claveDeFirma(cfg.claveSecreta, dia, cfg.region), aFirmar).toString('hex');

  const cabeceras: Record<string, string> = {
    Authorization:
      `${ALGORITMO} Credential=${cfg.claveId}/${ambito}, SignedHeaders=${nombres}, Signature=${firma}`,
    // `x-amz-content-sha256` no lo exige SES, pero mandarlo cuesta nada y deja
    // el fallo a la vista: si el cuerpo y la firma se separaran alguna vez, se
    // ve comparando esta cabecera con el cuerpo en lugar de adivinando.
    'x-amz-content-sha256': huellaDelCuerpo,
  };
  for (const [n, v] of firmadas) {
    // `host` la pone la propia pila de red; repetirla en `fetch` es un error.
    if (n !== 'host') cabeceras[n] = v;
  }

  return { url: `${cfg.endpoint.replace(/\/+$/, '')}${RUTA}`, cabeceras };
}

export const transporteSes: Transporte = {
  nombre: 'ses',
  async entregar(mensaje: MensajeCompuesto): Promise<void> {
    const cfg = credenciales();
    const cuerpo = cuerpoDeSes(mensaje, cfg.remitente);
    const { url, cabeceras } = firmarPeticion(cuerpo, cfg, new Date());

    /*
     * CON PLAZO. Sin él, una petición que se queda colgada deja colgada también
     * a la persona que pulsó «mandar las invitaciones», y con doce destinatarios
     * en fila el panel se queda quieto sin decir nada. Diez segundos son de
     * sobra para SES y suficientemente poco para que se note el problema.
     */
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: cabeceras,
      body: cuerpo,
      signal: AbortSignal.timeout(10_000),
    });

    if (!respuesta.ok) {
      const detalle = (await respuesta.text().catch(() => '')).slice(0, 300);
      throw new Error(`SES respondió ${respuesta.status}: ${detalle || 'sin detalle'}`);
    }
  },
};
