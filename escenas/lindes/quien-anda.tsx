/**
 * QUIEN ANDA POR LAS LINDES: se ha mudado al paseo común.
 *
 * La marioneta nació aquí porque Las Lindes era el único sitio donde se andaba, y no sabía nada
 * de losas: leía un paseante y pintaba una figura. Vive ahora en `escenas/paseo/quien-anda.tsx`,
 * leyendo una pose que escribe el paseo —y el día de mañana la red—, con los dos fallos de la
 * animación arreglados: el clip de correr que no sonaba nunca y los pies que patinaban por tres
 * (ver `escenas/paseo/zancada.ts`).
 *
 * Esto sólo reexporta, para que quien la buscara aquí la siga encontrando. No se escribe nada en
 * este fichero: una segunda marioneta es un arreglo que un día llega a una y no a la otra.
 */
export { QuienAnda } from '../paseo/quien-anda';
export type { PoseQueSePinta, QuienAndaProps } from '../paseo/quien-anda';
