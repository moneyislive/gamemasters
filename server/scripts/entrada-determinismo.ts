/**
 * EL PUNTO DE ENTRADA QUE SE EMPAQUETA Y SE PASA A LOS DOS MOTORES.
 *
 * Cuatro líneas, y cada una está por un motivo:
 *
 *   · Juega la tanda —ver `guion-determinismo.ts`— y la convierte en una línea de
 *     texto. Se compara TEXTO y no objetos porque lo que sale de Hermes es lo que
 *     escribe por su salida estándar: no hay otra forma de traerlo.
 *   · Y la escribe con `print` si existe y con `console.log` si no. Hermes no
 *     tiene `console.log` garantizado en su intérprete de línea de órdenes —tiene
 *     `print`— y Node no tiene `print`. Con esto, EL MISMO PAQUETE corre en los
 *     dos, que es más fuerte que empaquetar dos veces: si hubiera dos paquetes,
 *     una diferencia entre ellos podría explicar una diferencia entre motores.
 *
 * No importa nada de `node:` y no puede: la mitad de las veces esto corre dentro
 * de Hermes, donde no hay `require`, ni `fs`, ni `process`.
 */
import { jugarLaTanda } from './guion-determinismo';

const linea = JSON.stringify(jugarLaTanda());

/*
 * `print` es de Hermes y `console.log` es de todos. Se busca el primero con
 * cuidado —en Node ni siquiera existe el identificador, así que mirarlo directo
 * lanzaría `ReferenceError`— y por eso se pregunta a través del ámbito global y
 * no por el nombre suelto.
 */
const global_ = globalThis as unknown as { print?: (texto: string) => void };
if (typeof global_.print === 'function') global_.print(linea);
else console.log(linea);
