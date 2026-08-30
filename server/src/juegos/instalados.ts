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

/*
 * Primero los imprimibles DE LA CASA: los que sirven a cualquier juego que los
 * declare. Van antes que ningun juego porque lo de un juego manda sobre lo de
 * la casa, y asi el orden de lectura coincide con el de precedencia.
 */
import '../docs/imprimibles/casa';

// CLUEDO.
import './cluedo-acciones';
import './cluedo-trofeos';
/*
 * Y sus trece plantillas de imprimible. Estaban en una tabla exhaustiva dentro
 * de `docs/imprimibles/index.ts` y el compilador exigia que estuvieran todas;
 * ahora es un registro, asi que si nadie importa este modulo el paquete sale
 * SIN UN SOLO DOCUMENTO y no falla nada al arrancar. Es el mismo fallo que ya
 * estuvo a punto de ocurrir con los reductores de la Momia.
 */
import '../docs/imprimibles/cluedo/registro';
/*
 * Y como escribe su trama, con el modelo o sin el. Esto vivia DENTRO de la
 * tuberia —doscientas lineas de un juego concreto en el camino por el que pasan
 * todos— y ahora es `cluedo-generacion.ts`, hermano de `momia-generacion.ts` y
 * `sombras-generacion.ts`.
 *
 * Sin esta linea NADIE puede generar una trama de CLUEDO, y el fallo saldria al
 * pulsar el boton: desde que se elige por registro y no por un ternario, no
 * cargar el modulo es no tener generador.
 */
import '../plot/cluedo-generacion';
/*
 * Y como pone al dia una trama suya que se quedo vieja. Vivia dentro de
 * `refresh.ts` —o sea en el camino de cualquier juego— y ahora es
 * `cluedo-ampliacion.ts`.
 *
 * OJO: al partir el fichero, el alta se quedo en un modulo que NO importaba
 * nadie. Sin esta linea, `ampliacionDe('cluedo')` devuelve undefined,
 * `runRefresh` se salta la etapa entera y la partida sale marcada `ready` con
 * los personajes que faltan sin escribir. Sin un solo error.
 */
import '../plot/cluedo-ampliacion';

// El Misterio de la Momia: reductores, proyección del estado y trofeos.
/*
 * OJO: hoy la Momia y las Sombras se registrarian IGUAL sin esta linea, porque
 * sus datos de imprimible (`docs/imprimibles/momia/datos.ts`) importan su modulo
 * de generacion para leerle el sabor, y ese si se carga desde aqui. Es una
 * dependencia accidental y no se puede confiar en ella: el dia que alguien
 * reordene esos imports, el alta desaparece sin que nada falle al arrancar. La
 * linea explicita es lo que hace que el alta dependa de una decision y no de una
 * casualidad.
 */
import '../plot/momia-generacion';
/*
 * Y la voz de su asistente en el taller. Esta NO tiene ninguna importacion
 * accidental que la salve: `systemPrompt.ts` la importaba, y desde que elige por
 * registro ya no. Sin esta linea, quien prepare una expedicion habla con Edmund
 * el mayordomo de CLUEDO --sin ningun error, y con la cara y el nombre de El
 * Escriba al lado, porque esos si salen del manifiesto--.
 */
import '../agent/momia-escriba';
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

// Y sus ocho plantillas de imprimible. Ver el porque en la linea de CLUEDO.
import '../docs/imprimibles/momia/registro';

// El Paso de las Sombras: reductores, proyección del estado, consejo y trofeos.
import '../plot/sombras-generacion';
import '../agent/sombras-guia';
import './sombras-acciones';
import './sombras-proyeccion';
import './sombras-consejo';
/*
 * Y su ampliación, que vive con la trama sin IA. La importan los reductores por
 * `estadoInicial`, así que ya estaría cargada; se pone explícita porque
 * depender de un import indirecto para que un registro corra es exactamente la
 * clase de cosa que se rompe al reordenar imports y no falla hasta la noche.
 */
import './sombras-trama';

// Y su dosier por persona, que lo sirve el taller. Ver el porqué arriba.
import '../docs/imprimibles/sombras/dosierEscolta';

// Y sus ocho plantillas de imprimible. Ver el porque en la linea de CLUEDO.
import '../docs/imprimibles/sombras/registro';

/**
 * No exporta nada, y es a propósito.
 *
 * El efecto de este módulo son sus imports. Exportar algo invitaría a llamarlo
 * desde donde hiciera falta, y entonces volvería a depender de que alguien se
 * acuerde: lo que se quiere es justo lo contrario, que baste con importarlo una
 * vez en el arranque.
 */
export {};
