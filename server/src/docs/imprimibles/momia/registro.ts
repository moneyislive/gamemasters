/**
 * Las ocho plantillas de El Misterio de la Momia.
 *
 * Estaban en la tabla exhaustiva de `docs/imprimibles/index.ts`, que es núcleo:
 * un fichero que se compila para todos importaba `momia/hojaSellado` y
 * `momia/papiroSellado` por nombre. Ahora las trae el juego.
 *
 * Son OCHO y no nueve: el índice del paquete se reutiliza —`indice-paquete`, el
 * de la casa— porque esa hoja se compone entera desde el catálogo del juego y
 * desde `manifiesto.preparacion`.
 */
import { cartelesCamara } from './cartelesCamara';
import { dosierExpedicionario } from './dosierExpedicionario';
import { fragmentosPapiro } from './fragmentosPapiro';
import { guiaExpedicion } from './guiaExpedicion';
import { hojaSellado } from './hojaSellado';
import { informePapiro } from './informePapiro';
import { papiroSellado } from './papiroSellado';
import { registrarImprimibles } from '../registro';
import { tablaMarcas } from './tablaMarcas';

registrarImprimibles('momia', {
  'guia-expedicion': guiaExpedicion,
  'dosier-expedicionario': (game, plot, _vista, opciones) =>
    dosierExpedicionario(game, plot, opciones),
  'fragmentos-papiro': (game, plot, _vista, opciones) => fragmentosPapiro(game, plot, opciones),
  'carteles-camara': (game, plot, _vista, opciones) => cartelesCamara(game, plot, opciones),
  'hoja-sellado': (game, plot, _vista, opciones) => hojaSellado(game, plot, opciones),
  'tabla-marcas': (game, plot, _vista, opciones) => tablaMarcas(game, plot, opciones),
  'papiro-sellado': papiroSellado,
  'informe-papiro': (game, plot, _vista, opciones) => informePapiro(game, plot, opciones),
});
