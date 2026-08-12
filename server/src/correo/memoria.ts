/**
 * El transporte de memoria: el correo que no sale de la máquina.
 *
 * ES EL MODO POR DEFECTO, y no por comodidad de las pruebas. Un servidor recién
 * levantado —el portátil de quien organiza, una instancia de desarrollo, la
 * primera tarde en EC2 antes de que el dominio esté verificado en SES— no tiene
 * forma de mandar correo, y el fallo que hay que evitar es el silencioso:
 * intentar mandarlo, fallar por dentro, y que doce personas se queden sin
 * invitación mientras la pantalla dice que todo ha ido bien. Con este
 * transporte, el envío SIEMPRE funciona, el enlace se ve por consola y quien
 * organiza lo puede copiar y mandar por donde ya habla con sus invitados.
 *
 * Se escribe por consola además de guardarse porque las dos cosas sirven a
 * públicos distintos: la consola es para la persona que está mirando el
 * servidor, y el array para las comprobaciones automáticas, que necesitan poder
 * abrir el sobre y mirar dentro.
 */
import type { MensajeCompuesto, Transporte } from './mensaje';

/** Un envío tal como quedó registrado, con la hora del servidor. */
export interface EnvioRegistrado extends MensajeCompuesto {
  el: string;
}

/**
 * Cuántos envíos se recuerdan.
 *
 * Hay tope porque esto vive en un proceso que puede estar meses en pie: sin
 * límite, un array global que solo crece es una fuga de memoria de manual, y de
 * las peores —crece con el uso normal del producto, así que aparece cuando la
 * plataforma empieza a ir bien—. Doscientos son muchas más invitaciones de las
 * que hacen falta para depurar una velada de doce.
 */
const TOPE = 200;

const enviados: EnvioRegistrado[] = [];

/** Los envíos guardados, del más antiguo al más reciente. */
export function enviosDeMemoria(): readonly EnvioRegistrado[] {
  return enviados;
}

/** Vacía el registro. Para las comprobaciones, que empiezan de cero cada vez. */
export function olvidarEnviosDeMemoria(): void {
  enviados.length = 0;
}

export const transporteDeMemoria: Transporte = {
  nombre: 'memoria',
  entregar(mensaje: MensajeCompuesto): Promise<void> {
    enviados.push({ ...mensaje, el: new Date().toISOString() });
    if (enviados.length > TOPE) enviados.splice(0, enviados.length - TOPE);

    console.log(`[correo:memoria] Para: ${mensaje.para} — «${mensaje.asunto}»`);
    console.log(`[correo:memoria] Enlace: ${mensaje.enlace}`);
    return Promise.resolve();
  },
};
