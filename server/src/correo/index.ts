/**
 * Mandar la invitación. Una sola función, y dos maneras de entregarla.
 *
 * TODO EL CORREO DE LA PLATAFORMA PASA POR AQUÍ, y conviene que siga siendo
 * así: es el único punto donde se decide qué se cuenta y a quién, y esa clase
 * de decisión repartida por cinco ficheros acaba filtrando algo. Si algún día
 * hace falta un segundo correo —«tu velada empieza en una hora»— se añade una
 * función hermana en este módulo, no un `fetch` suelto en una ruta.
 *
 * EL MODO SE ELIGE CON `CORREO_MODO`:
 *
 *   · sin definir, o `memoria` — no sale nada de la máquina. Es el modo por
 *     defecto y el único que funciona sin configurar nada (ver `memoria.ts`).
 *   · `ses` — Amazon SES por HTTPS, que es lo que hay donde esto se despliega.
 *
 * Y UN VALOR DESCONOCIDO NO CAE AL MODO DE MEMORIA: revienta. Caer al de
 * memoria sería el peor de los fallos posibles —una errata como `CORREO_MODO=SES `
 * con un espacio, o `aws`, dejaría a todo el mundo sin invitación mientras el
 * panel dice «doce enviadas»—. Aquí se admite mayúsculas y espacios sobrantes,
 * que es lo que de verdad pasa al copiar una variable, y cualquier otra cosa se
 * niega a arrancar el envío.
 */
import { env } from '../config';
import { componerInvitacion } from './mensaje';
import { transporteDeMemoria } from './memoria';
import { transporteSes } from './ses';
import type { Invitada, MensajeCompuesto, Transporte } from './mensaje';

export type ModoDeCorreo = 'memoria' | 'ses';

export { componerInvitacion } from './mensaje';
export { enviosDeMemoria, olvidarEnviosDeMemoria } from './memoria';
export type { EnvioRegistrado } from './memoria';
export type { Invitada, MensajeCompuesto, Transporte } from './mensaje';

/** Qué modo está configurado. Se lee en cada envío: no hay nada que cachear. */
export function modoDeCorreo(): ModoDeCorreo {
  const bruto = (process.env.CORREO_MODO ?? 'memoria').trim().toLowerCase();
  if (bruto === '' || bruto === 'memoria') return 'memoria';
  if (bruto === 'ses') return 'ses';
  throw new Error(
    `CORREO_MODO vale «${process.env.CORREO_MODO}», que no es ningún modo conocido. Son «memoria» ` +
      '(no sale nada de la máquina) o «ses». Antes que mandar las invitaciones a un sitio que no ' +
      'existe, no se manda ninguna.',
  );
}

function transporte(): Transporte {
  return modoDeCorreo() === 'ses' ? transporteSes : transporteDeMemoria;
}

/** Un filtro grosero, solo para no intentar mandar a «pepe» o a una celda vacía. */
function pareceCorreo(valor: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(valor);
}

/**
 * Manda la invitación de una persona a una velada.
 *
 * Devuelve el mensaje tal como se compuso —con su enlace— porque quien organiza
 * lo necesita: en el modo de memoria es lo único que hay, y en el modo real
 * sigue haciendo falta para el caso de siempre, que es el invitado que dice que
 * no le ha llegado nada y hay que pasárselo por otro sitio.
 *
 * SE NIEGA A MANDAR UN ENLACE RELATIVO, y esa es la comprobación que parece de
 * más y no lo es. `enlaceDeInvitacion` cae a una ruta sin origen cuando no hay
 * `PUBLIC_ORIGIN` configurada, lo cual está bien dentro de la app pero es
 * inservible dentro de un correo: llega un «/i/eyJ…» que no es un enlace en
 * ninguna parte. Y un correo, a diferencia de una pantalla, no se puede
 * corregir después de mandarlo.
 */
export async function enviarInvitacion(invitada: Invitada): Promise<MensajeCompuesto> {
  if (!pareceCorreo(invitada.para)) {
    throw new Error(`«${invitada.para}» no parece una dirección de correo.`);
  }
  if (!env.publicOrigin) {
    throw new Error(
      'No hay PUBLIC_ORIGIN configurada, así que el enlace de la invitación saldría sin dominio y ' +
        'no llevaría a ninguna parte. Configúrala con la dirección pública del servidor.',
    );
  }

  const mensaje = componerInvitacion(invitada, env.publicOrigin);
  await transporte().entregar(mensaje);
  return mensaje;
}
