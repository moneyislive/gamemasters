/**
 * Las trece plantillas de CLUEDO.
 *
 * Estaban en `index.ts`, dentro de la tabla exhaustiva que compartían los tres
 * juegos. Aquí no cambia ninguna: es la misma lista, con las mismas
 * adaptaciones de firma, movida al sitio donde se puede leer al lado del
 * manifiesto que las declara.
 *
 * Los FICHEROS de estas plantillas siguen en la raíz de `docs/imprimibles/`, y
 * eso es deuda anotada, no descuido: `manualGm.ts`, `hojaSolucion.ts` y las
 * demás hablan de sospechosos, salas y del culpable, o sea que son de CLUEDO
 * viviendo en la carpeta genérica. Mudarlos a `imprimibles/cluedo/` es la
 * continuación natural de esto y toca solo rutas de import, así que se hace
 * aparte para que este cambio se pueda leer.
 */
import { cartaImprevistos } from './cartaImprevistos';
import { cartelesSala } from './cartelesSala';
import { desenlace } from './desenlace';
import { guiaPreparador } from './guiaPreparador';
import { hojaSolucion } from './hojaSolucion';
import { hojasInvestigacion } from './hojasInvestigacion';
import { informeValidacion } from './informeValidacion';
import { lineaTemporal } from './lineaTemporal';
import { manualGm } from './manualGm';
import { matrizConocimiento } from './matrizConocimiento';
import { registrarImprimibles } from './registro';
import { tarjetasEnsobrar } from './tarjetasEnsobrar';

/*
 * Once, no trece: «Empieza por aqui» y «Etiquetas de sobres» son de la
 * casa y viven en `casa.ts`. Las dos las declara tambien la Momia. Lo enseño
 * `verify:juegos` al partir la tabla: la primera salia vacia en los otros dos
 * juegos, y la segunda ni siquiera tenia plantilla que buscar.
 */
registrarImprimibles('cluedo', {
  'manual-gm': manualGm,
  'hojas-investigacion': (_game, plot, _vista, opciones) => hojasInvestigacion(plot, opciones),
  'carteles-sala': (game, plot, _vista, opciones) => cartelesSala(game, plot, opciones),
  'linea-temporal': (_game, plot, _vista, opciones) => lineaTemporal(plot, opciones),
  'carta-imprevistos': cartaImprevistos,
  'tarjetas-ensobrar': tarjetasEnsobrar,
  'guia-preparador': (game, plot, _vista, opciones) => guiaPreparador(game, plot, opciones),
  'hoja-solucion': (game, plot, _vista, opciones) => hojaSolucion(game, plot, opciones),
  'matriz-conocimiento': (game, plot, _vista, opciones) => matrizConocimiento(game, plot, opciones),
  desenlace: (game, plot, _vista, opciones) => desenlace(game, plot, opciones),
  'informe-validacion': (game, plot, _vista, opciones) => informeValidacion(game, plot, opciones),
});
