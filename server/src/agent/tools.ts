/**
 * Herramientas del agente de CLUEDO.
 *
 * - `agentTools`: definiciones (formato Tool de Anthropic) que se pasan al
 *   modelo en cada petición de chat.
 * - `executeTool`: ejecuta una herramienta sobre la partida. Las de mutación
 *   guardan con el store y devuelven la partida actualizada; las `ui_*`
 *   devuelven un comando de interfaz; `get_game_state` devuelve un resumen JSON.
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

export const agentTools: Anthropic.Messages.Tool[] = [
  {
    name: 'upsert_suspect',
    description:
      'Crea o actualiza un sospechoso (una persona real que jugará la partida). Llámala en cuanto el usuario mencione a una persona, con toda la descripción personal que haya dado (carácter, aficiones, papel en el grupo): esa descripción alimenta la generación de la trama. Con `id` actualiza el sospechoso existente; sin `id` crea uno nuevo.',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Id del sospechoso existente a actualizar. Omitir para crear.',
        },
        name: { type: 'string', description: 'Nombre de la persona.' },
        email: {
          type: 'string',
          description: 'Correo electrónico (opcional, para enviarle su dosier).',
        },
        description: {
          type: 'string',
          description:
            'Descripción personal y psicológica: carácter, aficiones, relación con el grupo. Cuanto más rica, mejor trama.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'remove_suspect',
    description: 'Elimina un sospechoso de la partida por su id.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Id del sospechoso a eliminar.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'upsert_room',
    description:
      'Crea o actualiza una sala (una habitación o zona real del espacio físico donde se jugará). Llámala en cuanto el usuario mencione una habitación, con su descripción (ambiente, objetos llamativos, tamaño). Con `id` actualiza; sin `id` crea.',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Id de la sala existente a actualizar. Omitir para crear.',
        },
        name: { type: 'string', description: 'Nombre de la sala (p. ej. «Cocina»).' },
        description: {
          type: 'string',
          description: 'Descripción del espacio real: ambiente, mobiliario, rasgos útiles para la trama.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'remove_room',
    description: 'Elimina una sala de la partida por su id.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Id de la sala a eliminar.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'upsert_weapon',
    description:
      'Crea o actualiza un arma (un objeto real que hará de arma del crimen: un candelabro, un abrecartas, una plancha...). Llámala en cuanto el usuario mencione un objeto candidato. Con `id` actualiza; sin `id` crea.',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Id del arma existente a actualizar. Omitir para crear.',
        },
        name: { type: 'string', description: 'Nombre del objeto (p. ej. «Candelabro de plata»).' },
        description: {
          type: 'string',
          description: 'Descripción del objeto y dónde suele estar.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'remove_weapon',
    description: 'Elimina un arma de la partida por su id.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Id del arma a eliminar.' },
      },
      required: ['id'],
    },
  },
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

  switch (name) {
    case 'upsert_suspect': {
      const nombre = texto(datos, 'name');
      const id = texto(datos, 'id');
      if (!nombre && !id) {
        return { result: 'Error: falta el nombre del sospechoso.' };
      }
      const sospechosos = [...game.suspects];
      const indice = id ? sospechosos.findIndex((s) => s.id === id) : -1;
      if (id && indice === -1) {
        return { result: `Error: no existe ningún sospechoso con id «${id}».` };
      }
      let guardado: Suspect;
      if (indice >= 0) {
        const previo = sospechosos[indice];
        guardado = {
          ...previo,
          name: nombre ?? previo.name,
          email: texto(datos, 'email') ?? previo.email,
          description: texto(datos, 'description') ?? previo.description,
        };
        sospechosos[indice] = guardado;
      } else {
        guardado = {
          id: nanoid(),
          name: nombre as string,
          email: texto(datos, 'email'),
          description: texto(datos, 'description'),
        };
        sospechosos.push(guardado);
      }
      const actualizada = await store.saveGame({ ...game, suspects: sospechosos });
      return {
        result: `Sospechoso «${guardado.name}» guardado (id: ${guardado.id}). Total: ${actualizada.suspects.length}.`,
        game: actualizada,
      };
    }

    case 'remove_suspect': {
      const id = texto(datos, 'id');
      if (!id) return { result: 'Error: falta el id del sospechoso a eliminar.' };
      const objetivo = game.suspects.find((s) => s.id === id);
      if (!objetivo) return { result: `Error: no existe ningún sospechoso con id «${id}».` };
      const actualizada = await store.saveGame({
        ...game,
        suspects: game.suspects.filter((s) => s.id !== id),
      });
      return {
        result: `Sospechoso «${objetivo.name}» eliminado. Quedan ${actualizada.suspects.length}.`,
        game: actualizada,
      };
    }

    case 'upsert_room': {
      const nombre = texto(datos, 'name');
      const id = texto(datos, 'id');
      if (!nombre && !id) return { result: 'Error: falta el nombre de la sala.' };
      const salas = [...game.rooms];
      const indice = id ? salas.findIndex((r) => r.id === id) : -1;
      if (id && indice === -1) {
        return { result: `Error: no existe ninguna sala con id «${id}».` };
      }
      let guardada: Room;
      if (indice >= 0) {
        const previa = salas[indice];
        guardada = {
          ...previa,
          name: nombre ?? previa.name,
          description: texto(datos, 'description') ?? previa.description,
        };
        salas[indice] = guardada;
      } else {
        guardada = {
          id: nanoid(),
          name: nombre as string,
          description: texto(datos, 'description'),
        };
        salas.push(guardada);
      }
      const actualizada = await store.saveGame({ ...game, rooms: salas });
      return {
        result: `Sala «${guardada.name}» guardada (id: ${guardada.id}). Total: ${actualizada.rooms.length}.`,
        game: actualizada,
      };
    }

    case 'remove_room': {
      const id = texto(datos, 'id');
      if (!id) return { result: 'Error: falta el id de la sala a eliminar.' };
      const objetivo = game.rooms.find((r) => r.id === id);
      if (!objetivo) return { result: `Error: no existe ninguna sala con id «${id}».` };
      const actualizada = await store.saveGame({
        ...game,
        rooms: game.rooms.filter((r) => r.id !== id),
      });
      return {
        result: `Sala «${objetivo.name}» eliminada. Quedan ${actualizada.rooms.length}.`,
        game: actualizada,
      };
    }

    case 'upsert_weapon': {
      const nombre = texto(datos, 'name');
      const id = texto(datos, 'id');
      if (!nombre && !id) return { result: 'Error: falta el nombre del arma.' };
      const armas = [...game.weapons];
      const indice = id ? armas.findIndex((w) => w.id === id) : -1;
      if (id && indice === -1) {
        return { result: `Error: no existe ningún arma con id «${id}».` };
      }
      let guardada: Weapon;
      if (indice >= 0) {
        const previa = armas[indice];
        guardada = {
          ...previa,
          name: nombre ?? previa.name,
          description: texto(datos, 'description') ?? previa.description,
        };
        armas[indice] = guardada;
      } else {
        guardada = {
          id: nanoid(),
          name: nombre as string,
          description: texto(datos, 'description'),
        };
        armas.push(guardada);
      }
      const actualizada = await store.saveGame({ ...game, weapons: armas });
      return {
        result: `Arma «${guardada.name}» guardada (id: ${guardada.id}). Total: ${actualizada.weapons.length}.`,
        game: actualizada,
      };
    }

    case 'remove_weapon': {
      const id = texto(datos, 'id');
      if (!id) return { result: 'Error: falta el id del arma a eliminar.' };
      const objetivo = game.weapons.find((w) => w.id === id);
      if (!objetivo) return { result: `Error: no existe ningún arma con id «${id}».` };
      const actualizada = await store.saveGame({
        ...game,
        weapons: game.weapons.filter((w) => w.id !== id),
      });
      return {
        result: `Arma «${objetivo.name}» eliminada. Quedan ${actualizada.weapons.length}.`,
        game: actualizada,
      };
    }

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
