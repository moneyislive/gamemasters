/**
 * Las nueve plantillas de El Nudo de Valdehierro.
 *
 * Estaban en la tabla exhaustiva de `docs/imprimibles/index.ts`, que es núcleo:
 * un fichero que se compila para todos tenía que conocer por nombre el material
 * de cada juego. Ahora las trae el juego, y este módulo se importa desde
 * `juegos/instalados.ts`. Si nadie lo importa, el paquete sale SIN UN SOLO
 * documento y el servidor arranca sin quejarse: por eso el alta va aquí, junta y
 * al lado del manifiesto, donde se ve de un vistazo si falta alguna.
 *
 * ═══ SON NUEVE Y EL MANIFIESTO DECLARA DIEZ ═══
 *
 * La que falta es `indice-paquete` —«Empieza por aquí»— y no se escribe aquí a
 * propósito: SE REUTILIZA LA DE LA CASA, igual que hacen El Misterio de la Momia
 * y El Paso de las Sombras. Esa hoja se compone entera desde el catálogo del
 * juego y desde `manifiesto.preparacion`, así que no lee ni un campo de la trama
 * de este juego: no habla de convoyes, ni de franjas, ni de telegramas. Escribir
 * una propia sería un id más para decir exactamente lo mismo, y una copia más
 * que actualizar el día que cambie el procedimiento de imprimir un paquete.
 *
 * La regla que decide dónde va cada documento es esa: es de la casa mientras se
 * componga solo con lo que el manifiesto declara; en cuanto lee un campo del
 * juego, es del juego y se registra aquí. `plantillaDe` busca primero lo del
 * juego y luego lo de la casa, así que el día que este juego quiera su propio
 * «Empieza por aquí» con la imprenta de estraza, basta con añadirlo a esta tabla.
 *
 * ═══ POR QUÉ OCHO DE LAS NUEVE LLEVAN ENVOLTORIO ═══
 *
 * El registro sirve plantillas con la firma `(game, plot, vista, opciones)`,
 * donde `vista` es la `VistaGm` —quién dirige y qué puede saber—. La guía de la
 * noche es la única que cambia según eso y la recibe entera. Las otras ocho no
 * la miran, y en vez de aceptarla y no usarla se envuelven aquí: así el día que
 * una empiece a necesitarla hay que tocar esta línea, que es donde se ve.
 */
import { registrarImprimibles } from '../registro';
import { cuadroEnBlanco } from './cuadroEnBlanco';
import { cuadroVerdadero } from './cuadroVerdadero';
import { dosierFerroviario } from './dosierFerroviario';
import { guiaDeLaNoche } from './guiaDeLaNoche';
import { hojasDePorte } from './hojasDePorte';
import { informeDelCuadro } from './informeDelCuadro';
import { rotulosDePuesto } from './rotulosDePuesto';
import { tablaDeLaNoche } from './tablaDeLaNoche';
import { tirasTelegrama } from './tirasTelegrama';

registrarImprimibles('nudo', {
  'guia-de-la-noche': guiaDeLaNoche,
  'dosier-ferroviario': (game, plot, _vista, opciones) => dosierFerroviario(game, plot, opciones),
  'tiras-telegrama': (game, plot, _vista, opciones) => tirasTelegrama(game, plot, opciones),
  'cuadro-en-blanco': (game, plot, _vista, opciones) => cuadroEnBlanco(game, plot, opciones),
  'hojas-de-porte': (game, plot, _vista, opciones) => hojasDePorte(game, plot, opciones),
  'rotulos-de-puesto': (game, plot, _vista, opciones) => rotulosDePuesto(game, plot, opciones),
  'tabla-de-la-noche': (game, plot, _vista, opciones) => tablaDeLaNoche(game, plot, opciones),
  'cuadro-verdadero': (game, plot, _vista, opciones) => cuadroVerdadero(game, plot, opciones),
  'informe-del-cuadro': (game, plot, _vista, opciones) => informeDelCuadro(game, plot, opciones),
});
