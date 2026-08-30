/**
 * Los imprimibles DE LA CASA: los que sirven a cualquier juego que los declare.
 *
 * Hoy hay uno solo, y su prueba de pertenencia es sencilla: «Empieza por aquí»
 * se compone entera desde `manifiesto.documentos` y `manifiesto.preparacion`,
 * sin leer un solo campo propio de ningún juego. Por eso los tres manifiestos
 * la declaran y ninguno la reescribe.
 *
 * Es la misma idea que `TROFEOS_DE_LA_CASA` en `shared/live.ts`: hay cosas de
 * la plataforma y cosas de cada juego, y confundirlas es lo que llevó a que el
 * material de CLUEDO fuera el respaldo de todos.
 *
 * PARA AÑADIR UNO AQUÍ hay que poder decir que no lee nada de ningún juego. Si
 * lo lee, va con su juego aunque se parezca mucho a algo común: un documento
 * casi genérico registrado aquí es exactamente cómo se empieza a fingir campos.
 */
import { etiquetasSobres } from './etiquetasSobres';
import { indicePaquete } from './indicePaquete';
import { registrarImprimiblesDeLaCasa } from './registro';

registrarImprimiblesDeLaCasa({
  'indice-paquete': (game, plot, _vista, opciones) => indicePaquete(game, plot, opciones),
  /*
   * Las etiquetas tambien, y su codigo lo dice con todas las letras:
   * `inventarioSobres` tiene una rama escrita a proposito para un juego SIN
   * pistas —«El Misterio de la Momia hace `clues: []` a proposito, porque lo
   * suyo son tiras de papiro»— y entonces rotula por ronda, que es lo unico
   * que la plataforma sabe con certeza de cualquier juego.
   */
  'etiquetas-sobres': (game, plot, _vista, opciones) => etiquetasSobres(game, plot, opciones),
});
