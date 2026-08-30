/**
 * Herramientas del asistente del taller.
 *
 * - `agentTools`: las de CLUEDO, tal cual estaban. Se sigue exportando con este
 *   nombre porque lo importa el taller y lo congela el maestro de oro.
 * - `herramientasDe(game)`: las que le tocan a ESTA partida. CLUEDO recibe las
 *   suyas; cualquier otro juego, las de sus categorías generadas desde su
 *   manifiesto (`momia-herramientas.ts`) más las comunes.
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
import type {
  GameSession,
  HighlightTarget,
  Room,
  Suspect,
  UiCommand,
  Weapon,
} from '../../../shared/types';
import { getStore } from '../db/store';
import { normalizeStylePrompt } from '../plot/style';
import { CLUEDO, entidadesDe, manifiestoDe } from '../../../shared/juegos';
import {
  ejecutarHerramientaDeCategoria,
  faltanMinimos,
  herramientasDeCategorias,
} from './momia-herramientas';

/** Objetivos válidos para realce/navegación en la interfaz. */
const OBJETIVOS_UI: HighlightTarget[] = [
  'suspects',
  'rooms',
  'weapons',
  'board',
  'documents',
  'generate',
];

/** Mínimos exigidos antes de poder generar la trama. */
export const MINIMOS = { sospechosos: 3, salas: 4, armas: 3 } as const;


/**
 * Las que valen para cualquier juego.
 *
 * Renombrar la partida, fijar el estilo, mirar el estado, mover la interfaz y
 * lanzar la generación no dependen de si se juega a un asesinato o a un
 * sellado: solo cambian las palabras del juego, y esas las pone el system
 * prompt. Tener una sola copia evita que dentro de tres juegos haya cinco
 * variantes de `ui_popup` que se hayan ido separando.
 */
const HERRAMIENTAS_COMUNES: Anthropic.Messages.Tool[] = [
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
          enum: ['suspects', 'rooms', 'weapons', 'board', 'documents', 'generate'],
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
          enum: ['suspects', 'rooms', 'weapons', 'board', 'documents', 'generate'],
          description: 'Pestaña de destino.',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'start_generation',
    description:
      'Lanza la generación de tablero, trama y dosieres. SOLO cuando la partida cumpla los mínimos (3 sospechosos, 4 salas, 3 armas) Y el usuario haya confirmado explícitamente que terminó de configurar. Si ya existe una trama, la nueva la reemplazará: adviértelo antes.',
    input_schema: { type: 'object', properties: {} },
  },
];


/**
 * Las herramientas que se le pasan al asistente de ESTA partida.
 *
 * CLUEDO recibe las suyas de siempre; cualquier otro juego recibe las de sus
 * categorías, generadas desde su manifiesto, más las comunes. Un juego con
 * «ritos» puede así darlos de alta, cosa que con `upsert_weapon` no tenía
 * manera de hacer.
 */
export function herramientasDe(game: GameSession): Anthropic.Messages.Tool[] {
  return [
    ...herramientasDeCategorias(manifiestoDe(game.settings?.juego)),
    ...HERRAMIENTAS_COMUNES,
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
       * Para un juego que no sea CLUEDO, el resumen va POR CATEGORÍA: llamar
       * «armas» a las reliquias de una tumba y «sospechosos» a una expedición
       * confunde al asistente en cada consulta, y además dejaba fuera cualquier
       * categoría que no fuese una de las tres.
       *
       * LO QUE NO SALE, NI AQUÍ NI EN LA RAMA DE CLUEDO: nada de `game.plot`
       * salvo el título. Ni la solución, ni los secretos, ni el orden verdadero
       * de los ritos, ni qué fragmentos son falsos. Es la única defensa que
       * funciona —no dárselo— y la vigila `npm run verify:secretos-agente`.
       */
      const manifiesto = manifiestoDe(game.settings?.juego);
      if (manifiesto.id !== CLUEDO.id) {
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

      const resumen = {
        id: game.id,
        nombre: game.name,
        estado: game.status,
        modoTablero: game.boardMode,
        sospechosos: game.suspects.map((s) => ({
          id: s.id,
          nombre: s.name,
          email: s.email ?? null,
          descripcion: s.description ?? null,
          tieneFoto: Boolean(s.photoUrl),
        })),
        salas: game.rooms.map((r) => ({
          id: r.id,
          nombre: r.name,
          descripcion: r.description ?? null,
          tieneFoto: Boolean(r.photoUrl),
        })),
        armas: game.weapons.map((w) => ({
          id: w.id,
          nombre: w.name,
          descripcion: w.description ?? null,
          tieneFoto: Boolean(w.photoUrl),
        })),
        tramaGenerada: Boolean(game.plot),
        tituloTrama: game.plot?.title ?? null,
        dosieres: game.documents?.length ?? 0,
        minimos: MINIMOS,
      };
      return { result: JSON.stringify(resumen) };
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
      if (!objetivo || !OBJETIVOS_UI.includes(objetivo as HighlightTarget)) {
        return {
          result: `Error: target inválido. Usa uno de: ${OBJETIVOS_UI.join(', ')}.`,
        };
      }
      return {
        result: `Panel «${objetivo}» realzado en la interfaz.`,
        ui: { kind: 'highlight', target: objetivo as HighlightTarget },
      };
    }

    case 'ui_navigate': {
      const objetivo = texto(datos, 'target');
      if (!objetivo || !OBJETIVOS_UI.includes(objetivo as HighlightTarget)) {
        return {
          result: `Error: target inválido. Usa uno de: ${OBJETIVOS_UI.join(', ')}.`,
        };
      }
      return {
        result: `Navegación a la pestaña «${objetivo}».`,
        ui: { kind: 'navigate', target: objetivo as HighlightTarget },
      };
    }

    case 'start_generation': {
      /*
       * Los mínimos de un juego que no sea CLUEDO salen de su manifiesto, que es
       * donde los declara. Escritos aquí a mano, un juego nuevo habría podido
       * generar sin sus cinco ritos y la partida habría salido sin puzle.
       */
      if (manifiestoDe(game.settings?.juego).id !== CLUEDO.id) {
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

      const faltantes: string[] = [];
      if (game.suspects.length < MINIMOS.sospechosos) {
        faltantes.push(`sospechosos: hay ${game.suspects.length}, mínimo ${MINIMOS.sospechosos}`);
      }
      if (game.rooms.length < MINIMOS.salas) {
        faltantes.push(`salas: hay ${game.rooms.length}, mínimo ${MINIMOS.salas}`);
      }
      if (game.weapons.length < MINIMOS.armas) {
        faltantes.push(`armas: hay ${game.weapons.length}, mínimo ${MINIMOS.armas}`);
      }
      if (faltantes.length > 0) {
        return {
          result: `No se puede generar todavía. Faltan mínimos (${faltantes.join('; ')}). Pide al usuario los datos que faltan.`,
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
