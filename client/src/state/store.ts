import { create } from 'zustand';
import type {
  AppConfig,
  ChatMessage,
  GameSession,
  GameSummary,
  Room,
  Suspect,
  UiPopupCommand,
  Weapon,
} from '../../../shared/types';
import * as api from '../api/client';

export interface AgentPopup extends UiPopupCommand {
  id: string;
}

/**
 * Qué pestaña del taller está abierta, o cuál resalta el agente.
 *
 * Es `string` y no `HighlightTarget`, y el motivo es concreto: las pestañas de
 * categoría se identifican por el ID DE SU CATEGORÍA —`sospechosos`, `salas`,
 * `expedicionarios`, `ritos`—, y esa unión solo conoce las tres de CLUEDO.
 * Ampliarla habría obligado a escribir en `shared/types.ts`, que es contrato
 * común, los nombres de las categorías de un juego concreto; y el juego
 * siguiente añadiría los suyos. Lo que se pierde es la exhaustividad del
 * compilador; se pierde en el mismo sitio y por la misma razón por la que
 * `JuegoId` es `string` y no una unión, y allí ya está razonado.
 *
 * Lo que llega del agente sigue siendo `HighlightTarget`: es un subconjunto,
 * así que entra sin conversión.
 */
export type PestanaDelTaller = string;

interface AppState {
  // Datos
  config: AppConfig | null;
  games: GameSummary[];
  game: GameSession | null;
  loadingGame: boolean;
  chatMessages: ChatMessage[];

  // Estado de UI gobernado por el agente
  highlight: PestanaDelTaller | null;
  popups: AgentPopup[];
  /** Pestaña activa del estudio */
  activeTab: PestanaDelTaller;

  // Generación
  generating: boolean;
  generationStage: string | null;
  generationLog: string;

  // Acciones
  fetchConfig: () => Promise<void>;
  fetchGames: () => Promise<void>;
  createGame: (name?: string, juego?: string) => Promise<GameSession>;
  loadGame: (id: string) => Promise<void>;
  setGame: (game: GameSession) => void;
  patchGame: (patch: Partial<GameSession>) => Promise<void>;

  /**
   * Alta o edición de una entidad, por categoría.
   *
   * Las tres funciones con nombre de abajo siguen ahí porque las usan pantallas
   * que aún no se han generalizado, pero lo nuevo pasa por aquí: una categoría
   * más no añade dos métodos más.
   */
  upsertEntidad: (categoria: string, datos: Record<string, unknown>) => Promise<void>;
  removeEntidad: (categoria: string, id: string) => Promise<void>;
  upsertSuspect: (suspect: Partial<Suspect>) => Promise<void>;
  removeSuspect: (participanteId: string) => Promise<void>;
  upsertRoom: (room: Partial<Room>) => Promise<void>;
  removeRoom: (lugarId: string) => Promise<void>;
  upsertWeapon: (weapon: Partial<Weapon>) => Promise<void>;
  removeWeapon: (weaponId: string) => Promise<void>;
  regenerateBoard: () => Promise<void>;

  addChatMessage: (message: ChatMessage) => void;
  appendToLastAssistant: (delta: string) => void;

  setHighlight: (target: PestanaDelTaller | null) => void;
  setActiveTab: (tab: PestanaDelTaller) => void;
  pushPopup: (popup: UiPopupCommand) => void;
  dismissPopup: (id: string) => void;

  setGenerating: (generating: boolean) => void;
  setGenerationStage: (stage: string | null) => void;
  appendGenerationLog: (delta: string) => void;
  resetGenerationLog: () => void;
}

let popupSeq = 0;

/**
 * A qué ruta del servidor va cada categoría.
 *
 * El servidor tiene DOS puertas y aquí se usan las dos:
 *
 *   · Las tres de siempre —`/suspects`, `/rooms`, `/weapons`— por las que
 *     CLUEDO guarda desde el primer día.
 *   · Una genérica, `/entidades/:categoria`, que sirve a cualquier juego y por
 *     la que entra todo lo demás. Es la que hace posible `ritos`, que no tiene
 *     campo heredado donde vivir.
 *
 * QUE SIGAN SIENDO DOS NO ES INDECISIÓN. Mover el alta de un sospechoso a la
 * ruta nueva no le aporta nada a nadie y sí puede romper algo que hoy funciona;
 * y el taller de CLUEDO es justamente lo que no se puede tocar. Cuando el
 * almacén heredado desaparezca, se borra esta tabla y la función de abajo se
 * queda en una línea.
 */
const RUTA_HEREDADA: Record<string, string> = {
  sospechosos: 'suspects',
  salas: 'rooms',
  objetos: 'weapons',
};

function rutaDeCategoria(categoria: string): string {
  return RUTA_HEREDADA[categoria] ?? `entidades/${categoria}`;
}

export const useAppStore = create<AppState>((set, get) => ({
  config: null,
  games: [],
  game: null,
  loadingGame: false,
  chatMessages: [],
  highlight: null,
  popups: [],
  activeTab: 'suspects',
  generating: false,
  generationStage: null,
  generationLog: '',

  fetchConfig: async () => {
    const config = await api.getConfig();
    set({ config });
  },

  fetchGames: async () => {
    const games = await api.listGames();
    set({ games });
  },

  createGame: async (name?: string, juego?: string) => {
    const game = await api.createGame(name, juego);
    set({ game, chatMessages: [] });
    return game;
  },

  loadGame: async (id: string) => {
    set({ loadingGame: true });
    try {
      const game = await api.getGame(id);
      set({ game, loadingGame: false });
    } catch (error) {
      set({ loadingGame: false });
      throw error;
    }
  },

  setGame: (game) => set({ game }),

  patchGame: async (patch) => {
    const { game } = get();
    if (!game) return;
    const updated = await api.updateGame(game.id, patch);
    set({ game: updated });
  },

  upsertEntidad: async (categoria, datos) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.upsertEntidad(game.id, rutaDeCategoria(categoria), datos) });
  },
  removeEntidad: async (categoria, id) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.removeEntidad(game.id, rutaDeCategoria(categoria), id) });
  },
  upsertSuspect: async (suspect) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.upsertSuspect(game.id, suspect) });
  },
  removeSuspect: async (participanteId) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.removeSuspect(game.id, participanteId) });
  },
  upsertRoom: async (room) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.upsertRoom(game.id, room) });
  },
  removeRoom: async (lugarId) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.removeRoom(game.id, lugarId) });
  },
  upsertWeapon: async (weapon) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.upsertWeapon(game.id, weapon) });
  },
  removeWeapon: async (weaponId) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.removeWeapon(game.id, weaponId) });
  },
  regenerateBoard: async () => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.generateBoard(game.id) });
  },

  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  appendToLastAssistant: (delta) =>
    set((state) => {
      const messages = [...state.chatMessages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = { ...last, content: last.content + delta };
      }
      return { chatMessages: messages };
    }),

  setHighlight: (target) => set({ highlight: target }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  pushPopup: (popup) =>
    set((state) => ({
      popups: [...state.popups, { ...popup, id: `popup-${popupSeq++}` }],
    })),
  dismissPopup: (id) =>
    set((state) => ({ popups: state.popups.filter((p) => p.id !== id) })),

  setGenerating: (generating) => set({ generating }),
  setGenerationStage: (stage) => set({ generationStage: stage }),
  appendGenerationLog: (delta) =>
    set((state) => ({ generationLog: state.generationLog + delta })),
  resetGenerationLog: () => set({ generationLog: '' }),
}));
