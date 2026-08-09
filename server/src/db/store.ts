/**
 * Almacenamiento de partidas, mensajes y configuración.
 *
 * Dos implementaciones tras la misma interfaz `Store`, elegidas en el arranque:
 *  - `MongoStore` si `MONGODB_URI` está definida (mongoose, schemas laxos).
 *  - `FileStore` en caso contrario (server/data/db.json, en memoria +
 *    persistencia atómica mediante fichero temporal y rename).
 */
import fsp from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import type {
  ChatMessage,
  GameSession,
  GameSummary,
  ModelId,
} from '../../../shared/types';
import type { Account, LiveSession } from '../../../shared/live';
import { env, isModelId } from '../config';
import { alDia, sesionAlDia } from '../juegos/migracion';

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

export interface Store {
  listGames(): Promise<GameSummary[]>;
  getGame(id: string): Promise<GameSession | null>;
  createGame(name?: string): Promise<GameSession>;
  saveGame(game: GameSession): Promise<GameSession>;
  deleteGame(id: string): Promise<void>;
  getMessages(gameId: string): Promise<ChatMessage[]>;
  appendMessage(gameId: string, msg: ChatMessage): Promise<void>;
  getConfigModel(): Promise<ModelId>;
  setConfigModel(m: ModelId): Promise<void>;

  // ---- Partida en vivo ----
  getLive(gameId: string): Promise<LiveSession | null>;
  /** Busca por el código corto que se dicta en la mesa. */
  getLiveByCode(code: string): Promise<LiveSession | null>;
  saveLive(session: LiveSession): Promise<LiveSession>;
  deleteLive(gameId: string): Promise<void>;

  // ---- Cuentas de jugador ----
  getAccount(id: string): Promise<Account | null>;
  getAccountByEmail(email: string): Promise<Account | null>;
  saveAccount(account: Account): Promise<Account>;
}

// ---------------------------------------------------------------------------
// Utilidades comunes
// ---------------------------------------------------------------------------

/** Lugares elegantes para el nombre por defecto de una partida nueva. */
const DEFAULT_PLACES: string[] = [
  'la Mansión Blackwood',
  'Villa Escarlata',
  'el Palacete Vergara',
  'el Gran Hotel Continental',
  'la Casa del Reloj',
  'la Hacienda del Ciprés',
  'el Château Marchand',
  'la Residencia Montenegro',
  'el Observatorio de Medianoche',
  'la Biblioteca de los Susurros',
  'el Salón Esmeralda',
  'la Torre del Faro Viejo',
];

function randomDefaultName(): string {
  const lugar = DEFAULT_PLACES[Math.floor(Math.random() * DEFAULT_PLACES.length)];
  return `Misterio en ${lugar}`;
}

/** Crea una GameSession recién estrenada, según el contrato de ARCHITECTURE.md. */
function newGameSession(name?: string): GameSession {
  const now = new Date().toISOString();
  const trimmed = name?.trim();
  return {
    id: nanoid(12),
    name: trimmed && trimmed.length > 0 ? trimmed : randomDefaultName(),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    suspects: [],
    rooms: [],
    weapons: [],
    boardMode: 'generated',
    settings: { language: 'es' },
  };
}

function toSummary(game: GameSession): GameSummary {
  return {
    id: game.id,
    name: game.name,
    status: game.status,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    suspectCount: game.suspects.length,
    roomCount: game.rooms.length,
    weaponCount: game.weapons.length,
  };
}

// ---------------------------------------------------------------------------
// FileStore — server/data/db.json
// ---------------------------------------------------------------------------

interface FileData {
  games: GameSession[];
  messages: Record<string, ChatMessage[]>;
  config: { model: ModelId };
  live: LiveSession[];
  accounts: Account[];
}

class FileStore implements Store {
  private readonly dir = path.resolve(process.cwd(), 'data');
  private readonly file = path.join(this.dir, 'db.json');
  private data: FileData = {
    games: [],
    messages: {},
    config: { model: env.defaultModel },
    live: [],
    accounts: [],
  };
  /** Cadena de escrituras para serializar los renames y evitar colisiones. */
  private writeChain: Promise<void> = Promise.resolve();

  async init(): Promise<void> {
    await fsp.mkdir(this.dir, { recursive: true });
    try {
      const raw = await fsp.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw) as Partial<FileData>;
      this.data = {
        games: Array.isArray(parsed.games) ? parsed.games : [],
        messages:
          parsed.messages && typeof parsed.messages === 'object'
            ? parsed.messages
            : {},
        config:
          parsed.config && isModelId(parsed.config.model)
            ? { model: parsed.config.model }
            : { model: env.defaultModel },
        live: Array.isArray(parsed.live) ? parsed.live : [],
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      };
    } catch {
      // El fichero aún no existe (o está corrupto): se parte de un almacén vacío.
    }
  }

  /** Persistencia atómica: escribir a un temporal y renombrar sobre db.json. */
  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.data, null, 2);
    this.writeChain = this.writeChain
      .then(async () => {
        const tmp = `${this.file}.${nanoid(6)}.tmp`;
        await fsp.writeFile(tmp, snapshot, 'utf8');
        await fsp.rename(tmp, this.file);
      })
      .catch((err) => {
        console.error('[almacén] Error al persistir db.json:', err);
      });
    return this.writeChain;
  }

  async listGames(): Promise<GameSummary[]> {
    return [...this.data.games]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toSummary);
  }

  async getGame(id: string): Promise<GameSession | null> {
    const game = this.data.games.find((g) => g.id === id);
    return game ? alDia(structuredClone(game)) : null;
  }

  async createGame(name?: string): Promise<GameSession> {
    const game = newGameSession(name);
    this.data.games.push(game);
    await this.persist();
    return structuredClone(game);
  }

  async saveGame(game: GameSession): Promise<GameSession> {
    const updated: GameSession = {
      ...structuredClone(game),
      updatedAt: new Date().toISOString(),
    };
    const index = this.data.games.findIndex((g) => g.id === game.id);
    if (index >= 0) {
      this.data.games[index] = updated;
    } else {
      this.data.games.push(updated);
    }
    await this.persist();
    return structuredClone(updated);
  }

  async deleteGame(id: string): Promise<void> {
    this.data.games = this.data.games.filter((g) => g.id !== id);
    delete this.data.messages[id];
    await this.persist();
  }

  async getMessages(gameId: string): Promise<ChatMessage[]> {
    return structuredClone(this.data.messages[gameId] ?? []);
  }

  async appendMessage(gameId: string, msg: ChatMessage): Promise<void> {
    (this.data.messages[gameId] ??= []).push(structuredClone(msg));
    await this.persist();
  }

  async getConfigModel(): Promise<ModelId> {
    return this.data.config.model;
  }

  async setConfigModel(m: ModelId): Promise<void> {
    this.data.config.model = m;
    await this.persist();
  }

  async getLive(gameId: string): Promise<LiveSession | null> {
    const s = this.data.live.find((l) => l.id === gameId);
    return s ? sesionAlDia(structuredClone(s)) : null;
  }

  async getLiveByCode(code: string): Promise<LiveSession | null> {
    const s = this.data.live.find((l) => l.code === code.toUpperCase());
    return s ? sesionAlDia(structuredClone(s)) : null;
  }

  async saveLive(session: LiveSession): Promise<LiveSession> {
    const updated = { ...structuredClone(session), updatedAt: new Date().toISOString() };
    const i = this.data.live.findIndex((l) => l.id === session.id);
    if (i >= 0) this.data.live[i] = updated;
    else this.data.live.push(updated);
    await this.persist();
    return structuredClone(updated);
  }

  async deleteLive(gameId: string): Promise<void> {
    this.data.live = this.data.live.filter((l) => l.id !== gameId);
    await this.persist();
  }

  async getAccount(id: string): Promise<Account | null> {
    const a = this.data.accounts.find((x) => x.id === id);
    return a ? structuredClone(a) : null;
  }

  async getAccountByEmail(email: string): Promise<Account | null> {
    const a = this.data.accounts.find((x) => x.email === email.trim().toLowerCase());
    return a ? structuredClone(a) : null;
  }

  async saveAccount(account: Account): Promise<Account> {
    const copia = structuredClone(account);
    const i = this.data.accounts.findIndex((x) => x.id === account.id);
    if (i >= 0) this.data.accounts[i] = copia;
    else this.data.accounts.push(copia);
    await this.persist();
    return structuredClone(copia);
  }
}

// ---------------------------------------------------------------------------
// MongoStore — mongoose con schemas laxos (strict:false)
// ---------------------------------------------------------------------------

type LooseDoc = Record<string, unknown>;

/** Margen sobre los 16 MB de MongoDB para avisar antes de que reviente el BSON. */
const LIMITE_DOCUMENTO_BYTES = 15 * 1024 * 1024;

/** Registra (o recupera) un modelo laxo; sobrevive a los reinicios de tsx watch. */
function looseModel(
  name: string,
  collection: string,
  indexField?: string,
): mongoose.Model<LooseDoc> {
  const existing = mongoose.models[name] as mongoose.Model<LooseDoc> | undefined;
  if (existing) return existing;
  const schema = new mongoose.Schema(
    {},
    {
      strict: false,
      versionKey: false,
      collection,
      minimize: false,
      // CRÍTICO: por defecto mongoose define `id` como virtual (alias de _id) y
      // descarta el `id` propio del documento al guardarlo, con lo que
      // findOne({id}) no encontraría nunca nada y replaceOne(upsert) duplicaría
      // documentos. Nuestras entidades llevan su propio `id` (nanoid).
      id: false,
    },
  );
  if (indexField) schema.index({ [indexField]: 1 });
  return mongoose.model<LooseDoc>(name, schema);
}

function stripMongo<T>(doc: LooseDoc): T {
  const { _id, __v, ...rest } = doc;
  return rest as T;
}

function stripMessage(doc: LooseDoc): ChatMessage {
  const { _id, __v, gameId, ...rest } = doc;
  return rest as unknown as ChatMessage;
}

class MongoStore implements Store {
  private readonly games = looseModel('CluedoGame', 'games', 'id');
  private readonly messages = looseModel('CluedoMessage', 'messages', 'gameId');
  private readonly config = looseModel('CluedoConfig', 'config', 'key');
  private readonly live = looseModel('CluedoLive', 'live', 'id');
  private readonly accounts = looseModel('CluedoAccount', 'accounts', 'email');

  async listGames(): Promise<GameSummary[]> {
    const docs = (await this.games
      .find({})
      .sort({ updatedAt: -1 })
      .lean()) as unknown as LooseDoc[];
    return docs.map((d) => toSummary(stripMongo<GameSession>(d)));
  }

  async getGame(id: string): Promise<GameSession | null> {
    const doc = (await this.games.findOne({ id }).lean()) as unknown as LooseDoc | null;
    return doc ? alDia(stripMongo<GameSession>(doc)) : null;
  }

  async createGame(name?: string): Promise<GameSession> {
    const game = newGameSession(name);
    await this.games.create(game as unknown as LooseDoc);
    return game;
  }

  async saveGame(game: GameSession): Promise<GameSession> {
    const updated: GameSession = { ...game, updatedAt: new Date().toISOString() };

    // MongoDB rechaza documentos de más de 16 MB con un RangeError de BSON
    // ilegible. Se comprueba antes para poder decir qué pasa y qué hacer.
    const tamano = Buffer.byteLength(JSON.stringify(updated), 'utf8');
    if (tamano > LIMITE_DOCUMENTO_BYTES) {
      throw new Error(
        `La partida ocupa ${(tamano / 1024 / 1024).toFixed(1)} MB y MongoDB no admite documentos de más de 16 MB. ` +
          'Suele deberse a fotografías muy pesadas: reduce su tamaño o quita alguna.',
      );
    }

    await this.games.replaceOne(
      { id: game.id },
      updated as unknown as LooseDoc,
      { upsert: true },
    );
    return updated;
  }

  async deleteGame(id: string): Promise<void> {
    await this.games.deleteOne({ id });
    await this.messages.deleteMany({ gameId: id });
  }

  async getMessages(gameId: string): Promise<ChatMessage[]> {
    // El orden de inserción se conserva ordenando por _id (ObjectId monótono).
    const docs = (await this.messages
      .find({ gameId })
      .sort({ _id: 1 })
      .lean()) as unknown as LooseDoc[];
    return docs.map(stripMessage);
  }

  async appendMessage(gameId: string, msg: ChatMessage): Promise<void> {
    await this.messages.create({ gameId, ...msg } as unknown as LooseDoc);
  }

  async getConfigModel(): Promise<ModelId> {
    const doc = (await this.config.findOne({ key: 'app' }).lean()) as
      | { model?: unknown }
      | null;
    const model = doc ? doc.model : undefined;
    return isModelId(model) ? model : env.defaultModel;
  }

  async setConfigModel(m: ModelId): Promise<void> {
    await this.config.updateOne(
      { key: 'app' },
      { $set: { model: m } },
      { upsert: true },
    );
  }

  async getLive(gameId: string): Promise<LiveSession | null> {
    const doc = (await this.live.findOne({ id: gameId }).lean()) as unknown as LooseDoc | null;
    return doc ? sesionAlDia(stripMongo<LiveSession>(doc)) : null;
  }

  async getLiveByCode(code: string): Promise<LiveSession | null> {
    const doc = (await this.live
      .findOne({ code: code.toUpperCase() })
      .lean()) as unknown as LooseDoc | null;
    return doc ? sesionAlDia(stripMongo<LiveSession>(doc)) : null;
  }

  async saveLive(session: LiveSession): Promise<LiveSession> {
    const updated: LiveSession = { ...session, updatedAt: new Date().toISOString() };
    await this.live.replaceOne({ id: session.id }, updated as unknown as LooseDoc, {
      upsert: true,
    });
    return updated;
  }

  async deleteLive(gameId: string): Promise<void> {
    await this.live.deleteOne({ id: gameId });
  }

  async getAccount(id: string): Promise<Account | null> {
    const doc = (await this.accounts.findOne({ id }).lean()) as unknown as LooseDoc | null;
    return doc ? stripMongo<Account>(doc) : null;
  }

  async getAccountByEmail(email: string): Promise<Account | null> {
    const doc = (await this.accounts
      .findOne({ email: email.trim().toLowerCase() })
      .lean()) as unknown as LooseDoc | null;
    return doc ? stripMongo<Account>(doc) : null;
  }

  async saveAccount(account: Account): Promise<Account> {
    await this.accounts.replaceOne({ id: account.id }, account as unknown as LooseDoc, {
      upsert: true,
    });
    return account;
  }
}

// ---------------------------------------------------------------------------
// Selección e inicialización
// ---------------------------------------------------------------------------

let activeStore: Store | null = null;
let storageKind: 'mongo' | 'file' = 'file';

/**
 * ¿La URI incluye ya un nombre de base de datos?
 * `mongodb+srv://user:pass@cluster.mongodb.net/gamemasters?retryWrites=true` sí;
 * `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true` no (que es
 * justo lo que copia y pega la consola de Atlas). Sin nombre, mongoose usaría
 * la base «test» sin avisar.
 */
function uriIncluyeBaseDeDatos(uri: string): boolean {
  const sinEsquema = uri.replace(/^mongodb(\+srv)?:\/\//i, '');
  const barra = sinEsquema.indexOf('/');
  if (barra === -1) return false;
  const base = sinEsquema.slice(barra + 1).split('?')[0] ?? '';
  return base.trim().length > 0;
}

/** Base de datos efectiva: MONGODB_DB > la de la URI > «gamemasters». */
export function resolveDbName(uri: string, explicita?: string): string | undefined {
  if (explicita?.trim()) return explicita.trim();
  return uriIncluyeBaseDeDatos(uri) ? undefined : 'gamemasters';
}

/** Decide la implementación, conecta y deja el almacén listo para usar. */
export async function initStore(): Promise<void> {
  if (env.mongoUri) {
    try {
      const dbName = resolveDbName(env.mongoUri, env.mongoDbName);
      await mongoose.connect(env.mongoUri, {
        // Sin esto, una URI errónea deja el arranque colgado 30 s.
        serverSelectionTimeoutMS: 8000,
        ...(dbName ? { dbName } : {}),
      });
      activeStore = new MongoStore();
      storageKind = 'mongo';
      console.log(
        `[almacén] Conectado a MongoDB · base de datos «${mongoose.connection.name}»`,
      );
      return;
    } catch (err) {
      console.warn(
        '[almacén] No se pudo conectar a MongoDB; se usará el almacén de fichero JSON.\n' +
          `          Motivo: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  const fileStore = new FileStore();
  await fileStore.init();
  activeStore = fileStore;
  storageKind = 'file';
}

export function getStore(): Store {
  if (!activeStore) {
    throw new Error('El almacén no está inicializado: llama antes a initStore().');
  }
  return activeStore;
}

/** Implementación activa, para informar en /api/config. */
export function getStorageKind(): 'mongo' | 'file' {
  return storageKind;
}
