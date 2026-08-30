/**
 * Herramientas del asistente del taller.
 *
 * - `herramientasDe(game)`: las que le tocan a ESTA partida. Las de sus
 *   categorías, generadas desde su manifiesto, más las comunes. Ya no hay
 *   ninguna rama para CLUEDO: entra por donde entran los demás.
 * - `executeTool`: ejecuta una herramienta sobre la partida. Las de mutación
 *   guardan con el store y devuelven la partida actualizada; las `ui_*`
 *   devuelven un comando de interfaz; `get_game_state` devuelve un resumen JSON.
 *
 * LO QUE NO SALE DE AQUÍ, PASE LO QUE PASE: nada de `game.plot` salvo el
 * título. Ni la solución, ni los secretos, ni el orden verdadero de los ritos,
 * ni qué fragmentos son falsos. `get_game_state` es la única herramienta que
 * LEE, así que es la que hay que vigilar, y la vigila
 * `npm run verify:secretos-agente`. Si algún día se añade otra de lectura, hay
 * que ampliar esa prueba — y ese es justo el momento en el que se olvidaría.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import { PANELES_DEL_TALLER } from '../../../shared/types';
import type { GameSession, HighlightTarget, UiCommand } from '../../../shared/types';
import { getStore } from '../db/store';
import { normalizeStylePrompt } from '../plot/style';
import { entidadesDe, manifiestoDe } from '../../../shared/juegos';
import {
  ejecutarHerramientaDeCategoria,
  faltanMinimos,
  herramientasDeCategorias,
} from './momia-herramientas';

/**
 * Los paneles del taller de ESTA partida: uno por categoria, mas los fijos.
 *
 * ═══ ERA UNA CONSTANTE, Y ESTABA ESCRITA EN CLUEDO ═══
 *
 *     ['suspects', 'rooms', 'weapons', 'board', 'documents', 'generate']
 *
 * Con eso, el asistente de El Misterio de la Momia solo sabia mandar mirar
 * paneles llamados «sospechosos», «salas» y «armas», que en una tumba no
 * existen. El taller lo tapaba traduciendo por el almacen heredado —una
 * traduccion que, si fallaba, no daba error: dejaba la pantalla quieta.
 *
 * Ahora sale del manifiesto y va en el `enum` de la herramienta, asi que el
 * modelo ve la lista de verdad y no puede pedir otra cosa.
 *
 * Los mínimos que había aquí —`{ sospechosos: 3, salas: 4, armas: 3 }`— se han
 * ido por lo mismo: son tres números de CLUEDO, y encima uno de ellos no
 * coincidía con su propio manifiesto. Los declara cada categoría y los cuenta
 * `faltanMinimos`, que es la función que la generación hace valer de verdad.
 */
function panelesDe(game: GameSession): HighlightTarget[] {
  return [
    ...manifiestoDe(game.settings?.juego).categorias.map((c) => c.id),
    ...PANELES_DEL_TALLER,
  ];
}


/**
 * Las que valen para cualquier juego.
 *
 * Renombrar la partida, fijar el estilo, mirar el estado, mover la interfaz y
 * lanzar la generación no dependen de si se juega a un asesinato o a un
 * sellado: solo cambian las palabras del juego, y esas las pone el system
 * prompt. Tener una sola copia evita que dentro de tres juegos haya cinco
 * variantes de `ui_popup` que se hayan ido separando.
 */
function herramientasComunes(game: GameSession): Anthropic.Messages.Tool[] {
  const paneles = panelesDe(game);
  return [
  {
    name: 'set_game_name',
    description: 'Cambia el nombre de la partida. Úsala cuando el usuario bautice o renombre la velada.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nuevo nombre de la partida.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'set_game_style',
    description:
      'Fija el meta-prompt de estilo de la partida: el ambiente que quiere el anfitrión ' +
      '(«más formal», «una comedia disparatada», «ambientado en una estación espacial»…). ' +
      'Afecta solo al tono y a la ambientación de la trama y los dosieres, nunca a las reglas ' +
      'del juego. Úsala cuando el usuario describa qué aire quiere darle a la velada. ' +
      'Con una cadena vacía se retira el estilo y se vuelve al clásico de los años 20.',
    input_schema: {
      type: 'object',
      properties: {
        style: {
          type: 'string',
          description:
            'Descripción breve del estilo deseado, en español y en una o dos frases. Cadena vacía para quitarlo.',
        },
      },
      required: ['style'],
    },
  },
  {
    name: 'get_game_state',
    description:
      'Devuelve un resumen JSON del estado actual de la partida (ids incluidos). Úsala antes de actualizar o borrar si no estás seguro de los ids o de qué hay registrado.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'ui_popup',
    description:
      'Muestra una tarjeta emergente teatral en la interfaz. Resérvala para momentos importantes: bienvenida, todo listo para generar, un giro notable. No la uses en cada mensaje.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título breve de la tarjeta.' },
        body: { type: 'string', description: 'Cuerpo del mensaje (1-3 frases).' },
        tone: {
          type: 'string',
          enum: ['info', 'success', 'mystery'],
          description: 'Tono visual: info (neutro), success (celebración), mystery (dramatismo).',
        },
      },
      required: ['title', 'body', 'tone'],
    },
  },
  {
    name: 'ui_highlight',
    description:
      'Realza visualmente un panel de la interfaz para dirigir la mirada del usuario. Úsala cuando le indiques dónde mirar o qué toca rellenar. Máximo un realce por mensaje.',
    input_schema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          enum: paneles,
          description: 'Panel a realzar.',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'ui_navigate',
    description:
      'Cambia la pestaña activa del estudio para llevar al usuario a un panel concreto. Úsala cuando el siguiente paso ocurra en otra pestaña.',
    input_schema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          enum: paneles,
          description: 'Pestaña de destino.',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'start_generation',
    description:
      'Lanza la generación de tablero, trama y dosieres. SOLO cuando la partida cumpla los mínimos ' +
      `(${minimosEnPalabras(game)}) Y el usuario haya confirmado explícitamente que terminó de ` +
      'configurar. Si ya existe una trama, la nueva la reemplazará: adviértelo antes.',
    input_schema: { type: 'object', properties: {} },
  },
  ];
}

/**
 * «3 sospechosos, 4 salas, 3 armas» — con las palabras de ESTE juego.
 *
 * Estaba escrito a mano en la descripción de `start_generation`, así que el
 * asistente de una expedición leía que hacían falta tres sospechosos y cuatro
 * salas, y se lo pedía al anfitrión. Que luego no existieran no lo enteraba de
 * nada: la herramienta contestaba con otros mínimos distintos.
 */
function minimosEnPalabras(game: GameSession): string {
  return manifiestoDe(game.settings?.juego)
    .categorias.map((c) => `${c.exacto ?? c.minimo} ${c.plural}${c.exacto !== undefined ? ' exactos' : ''}`)
    .join(', ');
}


/**
 * Las herramientas que se le pasan al asistente de ESTA partida.
 *
 * Las de sus categorías, generadas desde su manifiesto, más las comunes. Un
 * juego con «ritos» puede así darlos de alta, cosa que con `upsert_weapon` no
 * tenía manera de hacer.
 */
export function herramientasDe(game: GameSession): Anthropic.Messages.Tool[] {
  return [
    ...herramientasDeCategorias(manifiestoDe(game.settings?.juego)),
    ...herramientasComunes(game),
  ];
}

/** Lee una propiedad string del input de la herramienta, ya parseado por el SDK. */
function texto(input: Record<string, unknown>, clave: string): string | undefined {
  const valor = input[clave];
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined;
}

/**
 * Ejecuta una herramienta sobre la partida.
 * Las mutaciones guardan con el store y devuelven la partida actualizada en `game`;
 * las herramientas de interfaz devuelven el comando en `ui`.
 */
export async function executeTool(
  game: GameSession,
  name: string,
  // El input llega ya parseado del bloque tool_use del SDK; forma libre por contrato.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any,
): Promise<{ result: string; game?: GameSession; ui?: UiCommand }> {
  const store = getStore();
  const datos: Record<string, unknown> =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  /*
   * Las altas y bajas POR CATEGORIA, para todos los juegos.
   *
   * Aqui habia un `if (manifiesto.id !== CLUEDO.id)`: CLUEDO no pasaba por este
   * camino porque tenia sus propias herramientas escritas a mano —
   * `upsert_suspect`, `upsert_room`, `upsert_weapon`— y ciento ochenta lineas de
   * `case` para atenderlas.
   *
   * Eran exactamente lo que este generador produce, con otros nombres. Ahora
   * CLUEDO entra por donde entran los demas y sus herramientas se llaman
   * `upsert_sospechoso`, `upsert_sala` y `upsert_objeto`, que salen del
   * `singular` de sus categorias.
   *
   * Devuelve `null` cuando el nombre no es de una categoria de este juego, y
   * entonces se sigue al `switch` de las comunes.
   */
  const atendida = await ejecutarHerramientaDeCategoria(game, name, datos);
  if (atendida) return atendida;

  switch (name) {
    case 'set_game_name': {
      const nombre = texto(datos, 'name');
      if (!nombre) return { result: 'Error: falta el nuevo nombre de la partida.' };
      const actualizada = await store.saveGame({ ...game, name: nombre });
      return { result: `La partida pasa a llamarse «${nombre}».`, game: actualizada };
    }

    case 'set_game_style': {
      const estilo = normalizeStylePrompt(datos.style);
      const settings = { ...game.settings, language: 'es' as const };
      if (estilo) {
        settings.stylePrompt = estilo;
      } else {
        delete settings.stylePrompt;
      }
      const actualizada = await store.saveGame({ ...game, settings });
      return {
        result: estilo
          ? `Estilo de la velada anotado: «${estilo}». Condicionará el tono de la trama y de los dosieres.`
          : 'Estilo retirado: la velada vuelve al clásico de los años 20.',
        game: actualizada,
        ui: { kind: 'highlight', target: 'style' },
      };
    }

    case 'get_game_state': {
      /*
       * LO QUE NO SALE DE AQUÍ: nada de `game.plot`
       * salvo el título. Ni la solución, ni los secretos, ni el orden verdadero
       * de los ritos, ni qué fragmentos son falsos. Es la única defensa que
       * funciona —no dárselo— y la vigila `npm run verify:secretos-agente`.
       */
      const manifiesto = manifiestoDe(game.settings?.juego);
      /*
       * ═══ AQUI HABIA DOS RESUMENES ═══
       *
       * Uno por categoria para todos los juegos, y otro escrito a mano para
       * CLUEDO —`sospechosos`, `salas`, `armas`, leidos de `game.suspects` y
       * companyia— detras de un `if (manifiesto.id !== CLUEDO.id)`.
       *
       * Hacian LO MISMO. El de CLUEDO existia porque fue el primero y nadie lo
       * borro al escribir el generico; el precio de tenerlo era que cualquier
       * arreglo habia que hacerlo dos veces, y que una categoria nueva de
       * CLUEDO —si algun dia la tiene— no habria salido en su resumen.
       *
       * El generico gana ademas en dos cosas concretas: nombra las categorias
       * como las llama el juego, y manda `tieneCorreo: bool` en vez del correo
       * entero, que es un dato personal que el modelo no necesita para nada.
       */
      return {
        result: JSON.stringify({
          id: game.id,
          nombre: game.name,
          juego: manifiesto.id,
          estado: game.status,
          modoTablero: game.boardMode,
          categorias: Object.fromEntries(
            manifiesto.categorias.map((cat) => [
              cat.id,
              entidadesDe(game, cat.id).map((e) => ({
                id: e.id,
                nombre: e.name,
                descripcion: e.description ?? null,
                tieneFoto: Boolean(e.photoUrl),
                ...(cat.admiteEmail ? { tieneCorreo: Boolean(e.email) } : {}),
              })),
            ]),
          ),
          tramaGenerada: Boolean(game.plot),
          tituloTrama: game.plot?.title ?? null,
          dosieres: game.documents?.length ?? 0,
          faltan: faltanMinimos(game),
        }),
      };
    }

    case 'ui_popup': {
      const titulo = texto(datos, 'title');
      const cuerpo = texto(datos, 'body');
      const tono = texto(datos, 'tone');
      if (!titulo || !cuerpo) {
        return { result: 'Error: el popup necesita título y cuerpo.' };
      }
      const tonoValido: 'info' | 'success' | 'mystery' =
        tono === 'success' || tono === 'mystery' ? tono : 'info';
      return {
        result: `Tarjeta emergente mostrada: «${titulo}».`,
        ui: { kind: 'popup', title: titulo, body: cuerpo, tone: tonoValido },
      };
    }

    case 'ui_highlight': {
      const objetivo = texto(datos, 'target');
      const paneles = panelesDe(game);
      if (!objetivo || !paneles.includes(objetivo)) {
        return { result: `Error: target inválido. Usa uno de: ${paneles.join(', ')}.` };
      }
      return {
        result: `Panel «${objetivo}» realzado en la interfaz.`,
        ui: { kind: 'highlight', target: objetivo },
      };
    }

    case 'ui_navigate': {
      const objetivo = texto(datos, 'target');
      const paneles = panelesDe(game);
      if (!objetivo || !paneles.includes(objetivo)) {
        return { result: `Error: target inválido. Usa uno de: ${paneles.join(', ')}.` };
      }
      return {
        result: `Navegación a la pestaña «${objetivo}».`,
        ui: { kind: 'navigate', target: objetivo },
      };
    }

    case 'start_generation': {
      /*
       * Tambien tenia dos ramas, y la de CLUEDO comparaba `game.suspects`,
       * `game.rooms` y `game.weapons` contra tres numeros escritos aqui:
       * `{ sospechosos: 3, salas: 4, armas: 3 }`. Uno de ellos ni siquiera
       * coincidia con el manifiesto de CLUEDO —que decia tres salas— asi que
       * el taller enseñaba «al menos tres estancias» y luego el servidor se
       * negaba a generar con tres.
       *
       * `faltanMinimos` lee el manifiesto y es la misma cuenta que hace valer
       * la generacion de verdad. Con una sola, no puede haber contradiccion.
       */
      const faltan = faltanMinimos(game);
      if (faltan.length > 0) {
        return {
          result: `No se puede generar todavía. Faltan mínimos (${faltan.join('; ')}). Pide al usuario los datos que faltan.`,
        };
      }
      return {
        result:
          'Orden de generación enviada a la interfaz: el cliente lanzará ahora el proceso de tablero, trama y dosieres.',
        ui: { kind: 'start_generation' },
      };
    }

    default:
      return { result: `Error: herramienta desconocida «${name}».` };
  }
}
