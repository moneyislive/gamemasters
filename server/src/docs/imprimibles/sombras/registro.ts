/**
 * Las ocho plantillas de El Paso de las Sombras.
 *
 * `guia-del-paso` es la única de este juego que recibe la `vista`: es el único
 * documento que cambia según quien dirija conozca o no la solución.
 *
 * Igual que la Momia, son ocho y no nueve: el índice del paquete se reutiliza.
 */
import { cartelesPaso } from './cartelesPaso';
import { dosierEscolta } from './dosierEscolta';
import { guiaDelPaso } from './guiaDelPaso';
import { hitosCamino } from './hitosCamino';
import { hojaConsejo } from './hojaConsejo';
import { informeSenda } from './informeSenda';
import { registrarImprimibles } from '../registro';
import { sendaVerdadera } from './sendaVerdadera';
import { tablaRastro } from './tablaRastro';

registrarImprimibles('sombras', {
  'guia-del-paso': guiaDelPaso,
  'dosier-escolta': (game, plot, _vista, opciones) => dosierEscolta(game, plot, opciones),
  'hitos-camino': (game, plot, _vista, opciones) => hitosCamino(game, plot, opciones),
  'carteles-paso': (game, plot, _vista, opciones) => cartelesPaso(game, plot, opciones),
  'hoja-consejo': (game, plot, _vista, opciones) => hojaConsejo(game, plot, opciones),
  'tabla-rastro': (game, plot, _vista, opciones) => tablaRastro(game, plot, opciones),
  'senda-verdadera': (game, plot, _vista, opciones) => sendaVerdadera(game, plot, opciones),
  'informe-senda': (game, plot, _vista, opciones) => informeSenda(game, plot, opciones),
});
