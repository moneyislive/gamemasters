/**
 * El alta de todos los juegos, en un solo sitio.
 *
 * QUÉ DA DE ALTA UN JUEGO. Su manifiesto es un dato y vive en `shared/`, que es
 * lo que ven los tres paquetes. Pero un juego además tiene CÓDIGO en el
 * servidor —qué hace cada acción, qué ve cada persona de su estado, qué trofeos
 * reparte— y ese código se registra al importar el módulo que lo contiene. Si
 * nadie lo importa, el registro se queda vacío.
 *
 * POR QUÉ ESTE FICHERO EXISTE. Antes, los reductores de CLUEDO se daban de alta
 * con un import suelto en `routes/jugar.ts`: funcionaba porque toda partida
 * pasa por esa ruta tarde o temprano. Con dos juegos eso deja de ser una
 * elección y pasa a ser una trampa, por dos razones:
 *
 *   · Hay que acordarse de añadir la línea, y el sitio donde hay que añadirla
 *     no tiene nada que ver con el juego que se está escribiendo.
 *   · Si se olvida, no falla al arrancar: falla en la PRIMERA PARTIDA de ese
 *     juego, con «eso no se puede hacer en esta partida», que es un mensaje que
 *     no lleva a ningún sitio. Y falla en producción mientras el verificador del
 *     juego pasa en verde, porque el verificador importa los módulos a mano.
 *
 * Ese fallo estuvo a punto de ocurrir con El Misterio de la Momia: sus
 * reductores, su proyección y sus trofeos estaban escritos y no los importaba
 * nadie que corriera de verdad.
 *
 * Así que ahora hay un sitio, y solo uno. Un juego nuevo añade su línea aquí y
 * se acabó. El arranque del servidor lo carga, de modo que si un import está
 * mal escrito el servidor no arranca — que es infinitamente mejor que
 * descubrirlo con doce personas esperando.
 */

// CLUEDO.
import './cluedo-acciones';

// El Misterio de la Momia: reductores, proyección del estado y trofeos.
import './momia-acciones';
import './momia-proyeccion';
import './momia-sellado';

/*
 * Y su dosier por persona, que lo sirve el taller.
 *
 * Se importa AQUÍ y no solo desde el catálogo de imprimibles porque el taller
 * puede pedir el dosier de alguien antes de haber compuesto ningún imprimible.
 * Si el alta no ha corrido, `renderPlayerDocument` cae en el genérico de CLUEDO
 * en silencio, que es exactamente el fallo que esto viene a cerrar.
 */
import '../docs/imprimibles/momia/dosierExpedicionario';

/**
 * No exporta nada, y es a propósito.
 *
 * El efecto de este módulo son sus imports. Exportar algo invitaría a llamarlo
 * desde donde hiciera falta, y entonces volvería a depender de que alguien se
 * acuerde: lo que se quiere es justo lo contrario, que baste con importarlo una
 * vez en el arranque.
 */
export {};
