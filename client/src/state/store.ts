import { create } from 'zustand';
import type {
  AppConfig,
  ChatMessage,
  GameSession,
  GameSummary,
  HighlightTarget,
  Room,
  Suspect,
  UiPopupCommand,
  Weapon,
} from '../../../shared/types';
import * as api from '../api/client';

export interface AgentPopup extends UiPopupCommand {
  id: string;
}

interface AppState {
  // Datos
  config: AppConfig | null;
  games: GameSummary[];
  game: GameSession | null;
  loadingGame: boolean;
  chatMessages: ChatMessage[];

  // Estado de UI gobernado por el agente
  highlight: HighlightTarget | null;
  popups: AgentPopup[];
  /** Pestaña activa del estudio */
  activeTab: HighlightTarget;

  // Generación
  generating: boolean;
  generationStage: string | null;
  generationLog: string;

  // Acciones
  fetchConfig: () => Promise<void>;
  fetchGames: () => Promise<void>;
  createGame: (name?: string) => Promise<GameSession>;
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
  removeSuspect: (suspectId: string) => Promise<void>;
  upsertRoom: (room: Partial<Room>) => Promise<void>;
  removeRoom: (roomId: string) => Promise<void>;
  upsertWeapon: (weapon: Partial<Weapon>) => Promise<void>;
  removeWeapon: (weaponId: string) => Promise<void>;
  regenerateBoard: () => Promise<void>;

  addChatMessage: (message: ChatMessage) => void;
  appendToLastAssistant: (delta: string) => void;

  setHighlight: (target: HighlightTarget | null) => void;
  setActiveTab: (tab: HighlightTarget) => void;
  pushPopup: (popup: UiPopupCommand) => void;
  dismissPopup: (id: string) => void;

  setGenerating: (generating: boolean) => void;
  setGenerationStage: (stage: string | null) => void;
  appendGenerationLog: (delta: string) => void;
  resetGenerationLog: () => void;
}

let popupSeq = 0;

/**
 * Categoría del juego → segmento de la ruta del servidor.
 *
 * Es la última tabla del cliente que conoce a la vez un id de categoría y un
 * nombre heredado de CLUEDO. Cuando el almacenamiento se generalice del todo,
 * desaparece.
 */
const RUTA_DE_CATEGORIA: Record<string, string> = {
  sospechosos: 'suspects',
  salas: 'rooms',
  objetos: 'weapons',
};

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

  createGame: async (name?: string) => {
    const game = await api.createGame(name);
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
    // El servidor ya genera sus rutas de entidades recorriendo una tabla; esto
    // es su reflejo en el cliente, y el único sitio que traduce una categoría
    // del juego al nombre heredado de su ruta.
    const ruta = RUTA_DE_CATEGORIA[categoria];
    if (!ruta) throw new Error(`No sé dónde guardar «${categoria}».`);
    set({ game: await api.upsertEntidad(game.id, ruta, datos) });
  },
  removeEntidad: async (categoria, id) => {
    const { game } = get();
    if (!game) return;
    const ruta = RUTA_DE_CATEGORIA[categoria];
    if (!ruta) throw new Error(`No sé de dónde quitar «${categoria}».`);
    set({ game: await api.removeEntidad(game.id, ruta, id) });
  },
  upsertSuspect: async (suspect) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.upsertSuspect(game.id, suspect) });
  },
  removeSuspect: async (suspectId) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.removeSuspect(game.id, suspectId) });
  },
  upsertRoom: async (room) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.upsertRoom(game.id, room) });
  },
  removeRoom: async (roomId) => {
    const { game } = get();
    if (!game) return;
    set({ game: await api.removeRoom(game.id, roomId) });
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
