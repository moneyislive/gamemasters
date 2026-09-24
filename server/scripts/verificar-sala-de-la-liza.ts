/**
 * LA SALA DE LA LIZA DEL LADO DEL SERVIDOR: la E/S con el reloj en la mano, y de punta a punta.
 *
 *   npm run verify:sala-de-la-liza
 *   npm run verify:sala-de-la-liza -- --sin-servidor     (sólo lo de proceso: sale con 2, bloque saltado)
 *
 * ═══ DOS MITADES, Y POR QUÉ LAS DOS ═══
 *
 * LA DE PROCESO, RÁPIDA. `server/src/liza/canal.ts` no sabe de WebSocket ni de mesas ni de reglas: se le
 * inyectan. Aquí el reloj es de mentira (`RelojDeMentira`: quince segundos de silencio pasan en un
 * milisegundo, y siempre igual), los enchufes apuntan lo que se les manda, la mesa es una tabla y la SALA
 * TAMBIÉN ES DE MENTIRA (`MotorDeMentira`): apunta lo que le entra en cada paso y devuelve lo que la prueba
 * le pide. Así se mira la E/S sola, sin que un fallo de las reglas se confunda con uno del cable: qué
 * entra en la sala y cuándo (la conexión sólo con `hola` Y pong; el desfase exacto; el `aqui` con el suyo),
 * qué sale y a quién y en qué orden (bienvenidas, correcciones, `tic` partidos, la foto una vez), los
 * veredictos en cadena, la mesa leída como mucho una vez por segundo, el aforo, los cierres con su código,
 * el ancla que se mueve, la gracia, el temporizador único. TODO lo que manda la sala se lee con
 * `leerMensajeDeLaSala`, el lector estricto del aparato: lo que el aparato no sabría leer es un fallo
 * aunque la regla haya ido bien.
 *
 * Y en proceso también, el ENCHUFE con `ws` de verdad por el bucle local (las rutas, el origen, el 404,
 * el tope de 256 bytes, el ping que el cliente contesta solo), el diagnóstico en su ruta, y el MONTAJE DE
 * VERDAD (`montarLaLiza` con la mesa de `mesas.ts` en una carpeta temporal) con `SIGTERM` emitida aquí
 * dentro, porque Windows no la entrega a un hijo: los canales se cierran con 1001 y la despedida de la mesa
 * sigue su camino una vez.
 *
 * ═══ LO QUE LA SALA DE MENTIRA NO PUEDE DECIR ═══
 *
 * La sala de mentira acepta lo que le echen, y ése fue el agujero de la primera pasada: «quien se sienta
 * después espera a que la declaración traiga su asiento» salía en verde contra ella, y con la de verdad
 * —que no cambia de asientos— la noche se quedaba parada en la bajada (revisión del frente, hallazgo 3).
 * Así que lo que depende de cómo se porta la sala pura se mira TAMBIÉN con la de verdad, la mesa de
 * verdad y el registro de verdad, con el reloj en la mano para que dure segundos (bloque `C1`).
 *
 * LA DE PUNTA A PUNTA, LENTA (tres o cuatro minutos: dos arranques y una oleada entera, que acaba
 * vaciada o cuando vence su reloj de ciento cincuenta segundos). Lo que en proceso no se ve
 * —que `index.ts` monte la Liza, que el registro de verdad dé la liza de la mesa, que la sala de verdad
 * juegue, que `ws` se porte igual en el servidor arrancado— se mira levantando el servidor como hijo en un
 * puerto que da el sistema (nunca uno de `.claude/launch.json`, que son de otros árboles): se abre una mesa
 * de El Quiebro por HTTP, se empieza la noche, bajan robots por `ws` que andan, quiebran y golpean, y se
 * comprueba lo que dice el encargo. Ver el bloque `D` más abajo para el detalle.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { sembrar } from '../../shared/mecanicas/azar';
import { UNO } from '../../shared/mecanicas/fijo';
import {
  arenaDeLaLiza,
  MS_POR_TIC,
  problemasDeLaDeclaracion,
  VERSION_DE_LA_DECLARACION,
  veredictoDeAusente,
  veredictoDeReloj,
} from '../../shared/mecanicas/liza/declaracion';
import type {
  AccionDeclarada,
  EfectoDeclarado,
  LizaDeclarada,
  PuestaDeEstado,
  ReglasDeAsiento,
  VeredictoDeLaLiza,
} from '../../shared/mecanicas/liza/declaracion';
import {
  CIERRE_DE_LA_LIZA,
  leerMensajeDeLaSala,
  MENSAJES_DE_GOLPE,
  PLAZO_DEL_HOLA_MS,
  rutaDeLaLiza,
  SILENCIO_HASTA_CERRAR_MS,
  textoDelAparato,
  TOPE_DE_SUCESOS,
  VERSION_DE_LA_LIZA,
} from '../../shared/mecanicas/liza/protocolo';
import type { MensajeDeLaSala, MensajeDelAparato, SucesoDelTic, TuplaDeFoto } from '../../shared/mecanicas/liza/protocolo';
import type {
  Bienvenida,
  Correccion,
  EntradaDeLaSala,
  EstadoDeLaSala,
  PasoDeLaSala,
  SucesoDeLaSala,
} from '../../shared/mecanicas/liza/tipos-de-la-sala';
import { costeDeLaLiza, PRESUPUESTO_DE_LAS_LIZAS } from '../../shared/arcade/juegos/lizas';
import {
  ADELANTO_DEL_APARATO_MS,
  ATASCO_PARA_CERRAR,
  ATASCO_PARA_SALTAR,
  CanalDeLaLiza,
  ESPERA_DEL_ASIENTO_MS,
  graciaDe,
  PASOS_SEGUIDOS_COMO_MUCHO,
  PASOS_SIN_BIENVENIDA,
  REVISAR_LA_MESA_CADA_MS,
} from '../src/liza/canal';
import type {
  ConexionDeLaLiza,
  EnchufeDeLaLiza,
  LaMesaDeLaLiza,
  LasLizas,
  LoQueFueDelVeredicto,
  MotorDeLaSala,
  RelojDeLaLiza,
  SalidaDelVeredicto,
  Temporizador,
} from '../src/liza/canal';
import { codigoDeLaRutaDeLaLiza, enchufarLaLiza } from '../src/liza/enchufe';
import { esLaRutaDelDiagnostico, RUTA_DEL_DIAGNOSTICO, servirElDiagnostico, VIGENCIA_DEL_DIAGNOSTICO_MS } from '../src/liza/diagnostico';
import { arnes } from './arnes';

/*
 * La carpeta de las mesas del montaje de verdad, ANTES de que nada cargue `mesas.ts` —que la lee al
 * cargarse—: sin esto las mesas de prueba acabarían en la carpeta de datos del portátil. Nada de lo
 * importado arriba la carga; el bloque C la importa a mano.
 */
const CARPETA_DE_MESAS = fs.mkdtempSync(path.join(os.tmpdir(), 'sala-de-la-liza-'));
process.env.MESAS_DIR = CARPETA_DE_MESAS;

const SIN_SERVIDOR = process.argv.includes('--sin-servidor');

/** Las comprobaciones que hace este guion hoy, contando el suelo (ver `arnes.ts`). */
const ESCRITAS = 169;
const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

const { comprobar, paso, nota, terminar } = arnes();

/** Deja correr las promesas pendientes: la entrada, la lectura de la mesa y los veredictos son asíncronos. */
async function vaciar(vueltas = 4): Promise<void> {
  for (let i = 0; i < vueltas; i++) await new Promise<void>((r) => setImmediate(r));
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const u = (n: number): number => Math.round(n * UNO);

/** El asiento de una entrada de la sala (la vista no tiene: 0). */
function asientoDe(e: EntradaDeLaSala): number {
  return e.tipo === 'vista' ? 0 : e.asiento;
}

// ---------------------------------------------------------------------------
// EL RELOJ, LOS ENCHUFES, LA MESA Y LA SALA, DE MENTIRA
// ---------------------------------------------------------------------------

/** Un reloj que sólo avanza cuando se le dice, y dispara los temporizadores en su orden. */
class RelojDeMentira implements RelojDeLaLiza {
  t = 1_000_000;
  private siguiente = 1;
  private readonly pendientes = new Map<number, { cuando: number; cada: number | null; hacer: () => void }>();

  ahora(): number {
    return this.t;
  }

  cada(ms: number, hacer: () => void): Temporizador {
    const id = this.siguiente++;
    this.pendientes.set(id, { cuando: this.t + ms, cada: ms, hacer });
    return { parar: () => this.pendientes.delete(id) };
  }

  dentroDe(ms: number, hacer: () => void): Temporizador {
    const id = this.siguiente++;
    this.pendientes.set(id, { cuando: this.t + ms, cada: null, hacer });
    return { parar: () => this.pendientes.delete(id) };
  }

  periodicos(): number {
    let n = 0;
    for (const p of this.pendientes.values()) if (p.cada !== null) n++;
    return n;
  }

  /**
   * Pasa `ms`, disparando los temporizadores en su orden, y después de CADA uno deja correr lo asíncrono
   * que haya soltado —la lectura de la mesa, un veredicto—, como el bucle de eventos de verdad.
   */
  async avanzar(ms: number): Promise<void> {
    const fin = this.t + ms;
    for (;;) {
      let elegido: { id: number; cuando: number } | null = null;
      for (const [id, p] of this.pendientes) {
        if (p.cuando > fin) continue;
        if (elegido === null || p.cuando < elegido.cuando || (p.cuando === elegido.cuando && id < elegido.id)) elegido = { id, cuando: p.cuando };
      }
      if (elegido === null) break;
      const p = this.pendientes.get(elegido.id);
      if (p === undefined) break;
      this.t = p.cuando;
      if (p.cada === null) this.pendientes.delete(elegido.id);
      else p.cuando += p.cada;
      p.hacer();
      await vaciar();
    }
    this.t = fin;
    await vaciar();
  }

  /**
   * EL PROCESO SE PARA `ms`: el tiempo pasa sin que se dispare nada, y los periódicos que tocaban se
   * disparan UNA vez al volver (lo que hace un temporizador de verdad tras una parada larga).
   */
  async pararElProceso(ms: number): Promise<void> {
    this.t += ms;
    for (const p of this.pendientes.values()) if (p.cada !== null && p.cuando < this.t) p.cuando = this.t;
    await this.avanzar(0);
  }
}

/** Un aparato de mentira: el enchufe que ve la sala, y lo que se le dice por él. */
class AparatoDeMentira implements EnchufeDeLaLiza {
  readonly textos: string[] = [];
  cierre: { codigo: number; razon: string } | null = null;
  atasco = 0;
  readonly pings: number[] = [];
  saludos = 0;
  conexion: ConexionDeLaLiza | null = null;

  enviar(texto: string): void {
    if (this.cierre === null) this.textos.push(texto);
  }

  cerrar(codigo: number, razon: string): void {
    if (this.cierre === null) this.cierre = { codigo, razon };
  }

  pendientes(): number {
    return this.atasco;
  }

  ping(numero: number): void {
    this.pings.push(numero);
  }

  saludo(): void {
    this.saludos++;
  }

  decir(m: MensajeDelAparato): void {
    this.conexion?.recibir(textoDelAparato(m));
  }

  crudo(texto: string | null): void {
    this.conexion?.recibir(texto);
  }

  /** Contesta los pings que tenga pendientes (lo que hace el navegador solo). */
  contestar(): void {
    for (const n of this.pings.splice(0)) this.conexion?.pong(n);
  }

  mensajes(): (MensajeDeLaSala | null)[] {
    return this.textos.map((t) => leerMensajeDeLaSala(t));
  }

  de<T extends MensajeDeLaSala['t']>(t: T): Extract<MensajeDeLaSala, { t: T }>[] {
    return this.mensajes().filter((m): m is Extract<MensajeDeLaSala, { t: T }> => m !== null && m.t === t);
  }

  ilegibles(): number {
    return this.mensajes().filter((m) => m === null).length;
  }

  /** Los sucesos de todos sus `tic`, en orden. */
  sucesos(): SucesoDelTic[] {
    return this.de('tic').flatMap((t) => [...t.ev]);
  }
}

interface MesaApuntada {
  arcade: string;
  rev: number;
  terminada: boolean;
  existe: boolean;
  llaves: Map<string, string>;
  /** La vista que ve el espectador: `{ liza }` con la declaración, o `{ ilegible: true }`. */
  vista: { liza: LizaDeclarada } | { ilegible: true };
  /** Lo que contesta a cada veredicto, en orden; cuando se acaba, `entro`. `lanza` = revienta. */
  respuestas: (SalidaDelVeredicto | 'lanza')[];
}

/** La mesa de mentira: una tabla, y cuenta lo que se le pregunta. */
class MesaDeMentira {
  readonly mesas = new Map<string, MesaApuntada>();
  revisiones = 0;
  vistas = 0;
  readonly metidos: { codigo: string; veredicto: VeredictoDeLaLiza }[] = [];
  /** En orden: `vista` cada vez que se lee la vista, y `dentro:<tipo>` cuando un veredicto acaba de entrar. */
  readonly sucedido: string[] = [];
  /** Cuántos veredictos se están metiendo a la vez, y el máximo visto: tiene que ser 1. */
  aLaVez = 0;
  masALaVez = 0;
  /** Cuántas vueltas del bucle tarda en contestar un veredicto. */
  tardanza = 3;

  readonly puerta: LaMesaDeLaLiza = {
    quienEsLaLlave: async (codigo, llave) => {
      const m = this.mesas.get(codigo);
      if (m === undefined || !m.existe) return null;
      return m.llaves.get(llave) ?? null;
    },
    revision: async (codigo) => {
      this.revisiones++;
      const m = this.mesas.get(codigo);
      if (m === undefined || !m.existe) return null;
      return { rev: m.rev, terminada: m.terminada };
    },
    vista: async (codigo) => {
      this.vistas++;
      this.sucedido.push('vista');
      const m = this.mesas.get(codigo);
      if (m === undefined || !m.existe) return null;
      return { arcade: m.arcade, rev: m.rev, terminada: m.terminada, vista: m.vista };
    },
    meter: async (codigo, veredicto): Promise<LoQueFueDelVeredicto> => {
      this.aLaVez++;
      this.masALaVez = Math.max(this.masALaVez, this.aLaVez);
      try {
        this.metidos.push({ codigo, veredicto });
        for (let i = 0; i < this.tardanza; i++) await new Promise<void>((r) => setImmediate(r));
        const salida = this.mesas.get(codigo)?.respuestas.shift() ?? 'entro';
        if (salida === 'lanza') throw new Error('la mesa de mentira revienta al meter el veredicto');
        this.sucedido.push(`dentro:${veredicto.tipo === 'arcade:reloj' ? veredicto.carga.id : veredicto.tipo}`);
        return salida === 'rechazado' ? { salida, motivo: 'no toca ahora' } : { salida };
      } finally {
        this.aLaVez--;
      }
    },
  };

  poner(codigo: string, liza: LizaDeclarada, llaves: Record<string, string>, arcade = 'juguete'): MesaApuntada {
    const m: MesaApuntada = {
      arcade,
      rev: 1,
      terminada: false,
      existe: true,
      llaves: new Map(Object.entries(llaves)),
      vista: { liza },
      respuestas: [],
    };
    this.mesas.set(codigo, m);
    return m;
  }
}

const LAS_LIZAS_DE_MENTIRA: LasLizas = {
  sePuedeLidiar: (arcade) => arcade === 'juguete',
  lizaDeLaMesa: (_arcade, vista) => {
    const v = vista as { liza?: LizaDeclarada; ilegible?: boolean };
    return v.liza ?? null;
  },
};

/** Lo que la prueba le pide a la sala de mentira para UN paso. Lo que no se diga, lo de siempre. */
interface GuionDelPaso {
  sucesos?: SucesoDeLaSala[];
  veredictos?: VeredictoDeLaLiza[];
  correcciones?: Correccion[];
  bienvenidas?: Bienvenida[];
  /** `undefined` = la de siempre (una cada dos tics); `null` = ninguna. */
  foto?: TuplaDeFoto[] | null;
  revienta?: boolean;
}

/**
 * LA SALA DE MENTIRA. Cumple las firmas de `tipos-de-la-sala.ts` con un estado mínimo pero del tipo de
 * verdad, apunta cada paso (qué sala, qué tic, qué entradas) y devuelve lo que diga `guion`. Sin guion:
 * una bienvenida por cada `EntradaConexion` y una foto cada dos tics con los asientos conectados.
 */
class MotorDeMentira {
  private siguienteId = 1;
  private readonly idDe = new WeakMap<EstadoDeLaSala, number>();
  private readonly conectados = new Map<number, Set<number>>();
  readonly pasos: { sala: number; tic: number; entradas: EntradaDeLaSala[] }[] = [];
  readonly nacidas: { sala: number; declaracion: LizaDeclarada; semilla: number }[] = [];
  guion: (sala: number, tic: number, entradas: readonly EntradaDeLaSala[]) => GuionDelPaso | null = () => null;

  private estado(declaracion: LizaDeclarada, tic: number, id: number): EstadoDeLaSala {
    const e: EstadoDeLaSala = {
      tic,
      declaracion,
      arena: arenaDeLaLiza(declaracion),
      fase: { clave: declaracion.fase.clave, desdeTic: 0, relojDado: false },
      azar: sembrar(declaracion.fase.semilla),
      asientos: [],
      entidades: [],
      balas: [],
      montones: [],
      anuncios: [],
      encuentro: null,
      recurso: 0,
      siguienteNumero: 16,
      siguienteAnuncio: 1,
    };
    this.idDe.set(e, id);
    return e;
  }

  idDeLaSala(e: EstadoDeLaSala): number {
    return this.idDe.get(e) ?? 0;
  }

  /** Los pasos de una sala, en orden. */
  pasosDe(sala: number): { tic: number; entradas: EntradaDeLaSala[] }[] {
    return this.pasos.filter((p) => p.sala === sala);
  }

  /** Todas las entradas que recibió una sala, en orden. */
  entradasDe(sala: number): EntradaDeLaSala[] {
    return this.pasosDe(sala).flatMap((p) => p.entradas);
  }

  readonly puerta: MotorDeLaSala = {
    salaNueva: (declaracion, semilla) => {
      const id = this.siguienteId++;
      this.nacidas.push({ sala: id, declaracion, semilla });
      this.conectados.set(id, new Set());
      return this.estado(declaracion, 0, id);
    },
    avanzarLaSala: (sala, entradas): PasoDeLaSala => {
      const id = this.idDeLaSala(sala);
      const tic = sala.tic + 1;
      this.pasos.push({ sala: id, tic, entradas: [...entradas] });
      const g = this.guion(id, tic, entradas) ?? {};
      if (g.revienta === true) throw new Error('la sala de mentira revienta a propósito');
      const conectados = this.conectados.get(id) ?? new Set<number>();
      const bienvenidas: Bienvenida[] = [];
      let declaracion = sala.declaracion;
      for (const e of entradas) {
        if (e.tipo === 'conexion') {
          conectados.add(e.asiento);
          bienvenidas.push({ asiento: e.asiento, x: u(e.asiento), z: u(-e.asiento), r: 32 });
        } else if (e.tipo === 'desconexion') {
          conectados.delete(e.asiento);
        } else if (e.tipo === 'vista') {
          declaracion = e.declaracion;
        }
      }
      const fotoDeSiempre: TuplaDeFoto[] | null =
        tic % 2 === 0 ? [...conectados].sort((a, b) => a - b).map((n): TuplaDeFoto => [n, n * 100, -n * 100, 32, 1, 0]) : null;
      return {
        sala: this.estado(declaracion, tic, id),
        sucesos: g.sucesos ?? [],
        veredictos: g.veredictos ?? [],
        fotoDebida: g.foto === undefined ? fotoDeSiempre : g.foto,
        correcciones: g.correcciones ?? [],
        bienvenidas: g.bienvenidas ?? bienvenidas,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// UNA LIZA DE JUGUETE (la de `verify:liza-protocolo`, en calma y con N asientos)
// ---------------------------------------------------------------------------

const nada = (estado: number, tics: number, intocableTics = 0, distanciaExtra = 0, soltableDesdeTic = tics): PuestaDeEstado => ({
  estado,
  tics,
  intocableTics,
  distanciaExtra,
  soltableDesdeTic,
});

function efecto(dano: number, puesta: PuestaDeEstado | null, empuje = 0): EfectoDeclarado {
  return {
    dano,
    danoAlRitmo: dano,
    puntos: 10,
    puntosAlRitmo: 10,
    puesta,
    empuje,
    alChocar: { dano: empuje > 0 ? 15 : 0, tics: empuje > 0 && puesta !== null ? 10 : 0 },
    rompeGuardia: false,
  };
}

function golpe(id: number, extra: Partial<AccionDeclarada>): AccionDeclarada {
  return {
    id,
    anuncioTics: 8,
    alcance: u(1.1),
    holgura: u(1.2),
    enganche: { radio: u(7), conoRumbos: 43, holgura: u(0.5) },
    avance: 0,
    cadena: null,
    efecto: efecto(10, nada(2, 12)),
    imparable: false,
    recargaTics: 0,
    recuperacionTics: 0,
    soloEn: [],
    alFallar: nada(8, 8),
    ...extra,
  };
}

function reglas(asiento: string): ReglasDeAsiento {
  return {
    asiento,
    cuerpo: {
      radio: u(0.35),
      marchas: [u(2), u(5), u(7)],
      aceleracionTics: 3,
      presupuestoCorto: { velocidad: u(8.75), acumulaTics: 20 },
      presupuestoLargo: { distancia: u(80), enTics: 200 },
      vidaTope: 100,
      vidaAlRematar: 10,
      firmeCadaTics: 0,
      guardaTics: 3,
    },
    acciones: [
      golpe(1, { avance: u(5.5) }),
      golpe(2, {
        anuncioTics: 5,
        cadena: { tras: [1], antesMs: 100, despuesMs: 250, ritmoMs: 75, anuncioTicsAlRitmo: 4, soloSiDio: false },
        efecto: efecto(10, nada(2, 10), u(3)),
      }),
      golpe(3, { anuncioTics: 3, imparable: true, soloEn: [3], alFallar: null, efecto: efecto(25, nada(4, 30)) }),
    ],
    esquiva: {
      accion: 10,
      puesta: nada(1, 9, 0, u(4), 6),
      ventanaMs: 200,
      esquivaHastaMs: 250,
      primeras: { cuantas: 3, ventanaMs: 300 },
      torpe: { cada: 3, enTics: 24 },
      alAcertar: { puesta: nada(3, 20, 20), alAutor: nada(8, 20) },
      contraProyectil: { distancia: u(10), tics: 8, accion: 3 },
      ruptura: { coste: 50, desde: [2], puesta: nada(1, 9, 6, u(4), 6) },
    },
    rescate: { accion: 11, radio: u(1.5), mantenerTics: 30, puesta: nada(5, 30), vidaAlVolver: 40, medidorAmbos: 0 },
    medidor: { tope: 100, porLimpia: 35, porRitmo: 5, porRemate: 20, porChoque: 10 },
    puntos: { factor: UNO, multiplicador: { paso: 6554, tope: 2 * UNO }, porLimpia: 50, porChoque: 30, porRemate: 100, porRescate: 75, porSalir: 150 },
    alEmpezar: { vida: 100, medidor: 0, lleva: [{ portable: 1, n: 0 }] },
  };
}

/**
 * UNA LIZA DE JUGUETE en calma: la estructura de la de `verify:liza-protocolo` —la misma que vigila
 * `problemasDeLaDeclaracion`—, con los asientos que se pidan y la clave de fase que se pida.
 */
function juguete(asientos: readonly string[], clave = 'f1', aforo = { entidades: 14, balas: 12, montones: 8 }): LizaDeclarada {
  const pisables: { x: number; y: number }[] = [];
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) pisables.push({ x, y });
  const caja = (x0: number, z0: number, x1: number, z1: number): { x0: number; z0: number; x1: number; z1: number } => ({
    x0: u(x0),
    z0: u(z0),
    x1: u(x1),
    z1: u(z1),
  });
  const estado = (id: number, bloqueaPaso: boolean, bloqueaAccion: boolean, cancelaCon: number[], seCortaConDano = false) => ({
    id,
    bloqueaPaso,
    bloqueaAccion,
    cancelaCon,
    seCortaConDano,
  });
  return {
    version: VERSION_DE_LA_DECLARACION,
    mundo: {
      metrosPorUnidad: UNO,
      suelo: { lado: 2, pisables, vados: [], cuerpos: [{ x0: -1, z0: -1, x1: 1, z1: 1 }], nace: [] },
      clasesDeCaja: [1],
      zonas: [{ id: 1, clase: 1, caja: caja(8, 8, 10, 10) }],
      limites: [{ id: 1, caja: caja(-12, -12, 12, 12) }],
      grafo: { nudos: [{ x: u(-6), z: u(-6) }, { x: u(6), z: u(-6) }], aristas: [[0, 1]] },
      nace: [
        { papel: 'asiento', x: u(-3), z: u(-3), rumbo: 32 },
        { papel: 'asiento', x: u(3), z: u(-3), rumbo: 224 },
        { papel: 'reaparicion', x: 0, z: u(-8), rumbo: 0 },
      ],
    },
    fase: { clave, modo: 'calma', limite: 1, semilla: 777, reloj: null, encuentro: null },
    asientos: asientos.map(reglas),
    estados: [
      estado(1, false, true, []),
      estado(2, true, true, [10]),
      estado(3, false, false, []),
      estado(4, true, true, []),
      estado(5, true, true, [], true),
      estado(6, true, true, []),
      estado(7, true, true, []),
      estado(8, true, true, []),
      estado(9, true, true, []),
      estado(10, false, false, []),
    ],
    clases: [
      {
        id: 2,
        vida: 20,
        radio: u(0.35),
        velocidad: u(4),
        acciones: [golpe(42, { anuncioTics: 14, enganche: null, alFallar: null, efecto: efecto(8, null) })],
        proyectil: 0,
        guardia: null,
        cerebro: { distanciaMinima: 0, distanciaMaxima: u(1.1), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 0, sigueElGrafo: false },
        aparicion: { modo: 'desdePunto', tics: 10 },
        alCaer: { tipo: 'irse' },
      },
    ],
    proyectiles: [],
    turnos: { cuerpoACuerpo: 2, disparo: 1, anunciosALaVez: 3, excluyen: [3, 6, 7, 10], alargarConLaRed: true, repetirTrasTics: 0 },
    portables: [{ id: 1, tope: 12, radioDeRecogida: u(1.2), montonTics: 400, pago: { tipo: 'triangular', porUnidad: 10 } }],
    equipo: { recurso: 3, caida: nada(4, 240), reaparicion: { coste: 1, esperaTics: 160, vida: 60, puesta: nada(10, 40, 40) } },
    sinCuerpo: { estado: 6 },
    presencia: { ausenteTrasTics: 40, estadoAusente: 7, veredictoTrasTics: 1200 },
    avisos: { clases: [{ id: 1, vidaTics: 80, objetivo: 'entidad' }], cadaTics: 20 },
    red: { compBaseMs: 25, compTopeMs: 150, esperaDeSitiosMs: 250 },
    veredictos: { columnas: [{ que: 'puntos' }, { que: 'lleva', portable: 1 }, { que: 'vida' }, { que: 'salio' }] },
    aforo,
  };
}

// ---------------------------------------------------------------------------
// LO DE CADA PRUEBA
// ---------------------------------------------------------------------------

const reloj = new RelojDeMentira();
const registro: string[] = [];

function canalNuevo(mesa: MesaDeMentira, motor: MotorDeMentira): CanalDeLaLiza {
  return new CanalDeLaLiza({ reloj, mesa: mesa.puerta, lizas: LAS_LIZAS_DE_MENTIRA, motor: motor.puerta, registrar: (l) => registro.push(l) });
}

function abrir(canal: CanalDeLaLiza, codigo: string): AparatoDeMentira {
  const a = new AparatoDeMentira();
  a.conexion = canal.abrir(codigo, a);
  return a;
}

/**
 * ENTRA UN APARATO: abre, contesta su primer ping a los `idaYVuelta` ms, dice `hola` con su reloj en `c`
 * y deja pasar un tic entero para que su conexión llegue a la sala y vuelva su `dentro`.
 */
async function entrar(canal: CanalDeLaLiza, codigo: string, llave: string, c = 30, idaYVuelta = 40): Promise<AparatoDeMentira> {
  const a = abrir(canal, codigo);
  await reloj.avanzar(idaYVuelta);
  a.contestar();
  a.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave, c });
  await vaciar();
  await reloj.avanzar(MS_POR_TIC);
  return a;
}

// ===========================================================================
// A · LA E/S EN PROCESO, CON LA SALA DE MENTIRA
// ===========================================================================

paso('A0 · La liza de juguete es una declaración válida');
{
  const problemas = problemasDeLaDeclaracion(juguete(['a1', 'a2', 'a3']));
  comprobar('la liza de juguete de tres asientos no tiene problemas', problemas.length === 0, problemas);
}

paso('A1 · El saludo: el ping sale al abrir, y hacen falta el `hola` Y el pong');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('SALUD', juguete(['a1', 'a2']), { L1: 'a1', L2: 'a2' });

  const callado = abrir(canal, 'SALUD');
  comprobar('el primer ping sale en el acto, antes de que el aparato diga nada', callado.pings.length === 1, callado.pings);
  await reloj.avanzar(PLAZO_DEL_HOLA_MS - 1);
  comprobar('un milisegundo antes del plazo sigue abierto', callado.cierre === null);
  await reloj.avanzar(1);
  comprobar('sin `hola` en el plazo: `sinHola` (4100), con su `fuera`', callado.cierre?.codigo === CIERRE_DE_LA_LIZA.sinHola && callado.de('fuera').length === 1, callado.cierre);

  const sinPong = abrir(canal, 'SALUD');
  sinPong.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'L1', c: 5 });
  await reloj.avanzar(PLAZO_DEL_HOLA_MS);
  comprobar('con `hola` pero sin pong en el plazo: también `sinHola` —sin ida y vuelta no se mide nada—', sinPong.cierre?.codigo === CIERRE_DE_LA_LIZA.sinHola, sinPong.cierre);
  comprobar('y a la sala no ha llegado nada de ninguno de los dos', motor.nacidas.length === 0 && motor.pasos.length === 0, motor.nacidas.length);
  comprobar('el `hola` suelta el hueco de «sin saludar» de la capa de cuotas', sinPong.saludos === 1 && callado.saludos === 0);

  const otraCosa = abrir(canal, 'SALUD');
  otraCosa.contestar();
  otraCosa.decir({ t: 'eco', c: 1 });
  comprobar('lo primero que no es un `hola`: `sinHola` en el acto', otraCosa.cierre?.codigo === CIERRE_DE_LA_LIZA.sinHola, otraCosa.cierre);

  const vieja = abrir(canal, 'SALUD');
  vieja.decir({ t: 'hola', v: VERSION_DE_LA_LIZA + 1, llave: 'L1', c: 1 });
  comprobar('otra versión: `versionVieja` (4107)', vieja.cierre?.codigo === CIERRE_DE_LA_LIZA.versionVieja, vieja.cierre);

  const malo = abrir(canal, 'SALUD');
  malo.crudo('{"t":"hola","v":1,"llave":"L1","c":1,"x":2}');
  comprobar('un mensaje con una clave de más: `atropello` (4105) a la primera', malo.cierre?.codigo === CIERRE_DE_LA_LIZA.atropello, malo.cierre);
  const binario = abrir(canal, 'SALUD');
  binario.crudo(null);
  comprobar('un marco binario: `atropello`', binario.cierre?.codigo === CIERRE_DE_LA_LIZA.atropello, binario.cierre);

  /* El orden de los dos no importa: pong antes que `hola`, y `hola` antes que pong. */
  const antes = abrir(canal, 'SALUD');
  await reloj.avanzar(20);
  antes.contestar();
  antes.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'L1', c: 3 });
  await vaciar();
  const despues = abrir(canal, 'SALUD');
  despues.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'L2', c: 3 });
  await vaciar();
  await reloj.avanzar(MS_POR_TIC + 10);
  const salaDeAntes = motor.nacidas[0]?.sala ?? 0;
  const conexionesAntesDelPong = motor.entradasDe(salaDeAntes).filter((e) => e.tipo === 'conexion' && asientoDe(e) === 2).length;
  despues.contestar();
  await vaciar();
  await reloj.avanzar(MS_POR_TIC * 2);
  const sala = motor.nacidas[0]?.sala ?? 0;
  const conexiones = motor.entradasDe(sala).filter((e) => e.tipo === 'conexion').map(asientoDe);
  comprobar('con el `hola` dicho y sin pong todavía, su conexión no ha llegado a la sala', conexionesAntesDelPong === 0, conexionesAntesDelPong);
  comprobar('pong y luego `hola`, o `hola` y luego pong: los dos entran', conexiones.length === 2 && conexiones.includes(1) && conexiones.includes(2), conexiones);
  comprobar('y los dos reciben su `dentro`', antes.de('dentro').length === 1 && despues.de('dentro').length === 1, [antes.textos.slice(0, 2), despues.textos.slice(0, 2)]);
  comprobar('nada de lo que ha salido es ilegible para el aparato', antes.ilegibles() + despues.ilegibles() === 0);
  canal.apagar();
}

paso('A2 · La entrada: llave mala, mesa que no, juego que no se lidia, liza ilegible o con problemas, mesa acabada');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('BUENA', juguete(['a1']), { L1: 'a1' });
  const ajena = mesa.poner('AJENA', juguete(['a1']), { L1: 'a1' }, 'otrojuego');
  void ajena;
  const ilegible = mesa.poner('ILEGI', juguete(['a1']), { L1: 'a1' });
  ilegible.vista = { ilegible: true };
  const rota = juguete(['a1']);
  mesa.poner('ROTA', { ...rota, aforo: { entidades: 0, balas: 0, montones: 0 } }, { L1: 'a1' });
  const acabada = mesa.poner('ACABA', juguete(['a1']), { L1: 'a1' });
  acabada.terminada = true;

  const llaveMala = await entrar(canal, 'BUENA', 'NOES');
  comprobar('una llave que no es de nadie: `llaveMala` (4101)', llaveMala.cierre?.codigo === CIERRE_DE_LA_LIZA.llaveMala, llaveMala.cierre);
  comprobar('y no abre sala', motor.nacidas.length === 0);
  const sinMesa = await entrar(canal, 'NOHAY', 'L1');
  comprobar('una mesa que no existe: `llaveMala` también —la llave no es de nadie de ESA mesa, y no se dice si existe—', sinMesa.cierre?.codigo === CIERRE_DE_LA_LIZA.llaveMala, sinMesa.cierre);
  const noSeLidia = await entrar(canal, 'AJENA', 'L1');
  comprobar('un juego que no está en el registro de lizas: `mesaQueNo` (4102)', noSeLidia.cierre?.codigo === CIERRE_DE_LA_LIZA.mesaQueNo, noSeLidia.cierre);
  const conVistaIlegible = await entrar(canal, 'ILEGI', 'L1');
  comprobar('una vista de la que el registro no saca liza: `mesaQueNo`', conVistaIlegible.cierre?.codigo === CIERRE_DE_LA_LIZA.mesaQueNo, conVistaIlegible.cierre);
  const conProblemas = await entrar(canal, 'ROTA', 'L1');
  comprobar('una liza con problemas (`problemasDeLaDeclaracion`): `mesaQueNo`, y se dice en el registro', conProblemas.cierre?.codigo === CIERRE_DE_LA_LIZA.mesaQueNo && registro.some((l) => l.includes('ROTA')), conProblemas.cierre);
  const tarde = await entrar(canal, 'ACABA', 'L1');
  comprobar('una mesa acabada: `mesaCerrada` (4106)', tarde.cierre?.codigo === CIERRE_DE_LA_LIZA.mesaCerrada, tarde.cierre);
  comprobar('ninguna de ellas llega a tener sala', motor.nacidas.length === 0, motor.nacidas.length);
  const buena = await entrar(canal, 'BUENA', 'L1');
  comprobar('y la buena sí: su `dentro`', buena.de('dentro').length === 1 && buena.cierre === null, buena.textos.slice(0, 3));
  comprobar('la sala nace con la declaración de la vista y la semilla de su fase —la misma llamada tras un despliegue—', motor.nacidas.length === 1 && motor.nacidas[0]?.semilla === 777 && motor.nacidas[0]?.declaracion.fase.clave === 'f1', motor.nacidas.map((n) => n.semilla));
  canal.apagar();
}

paso('A3 · Lo que entra en la sala: la conexión con la red ya medida, el desfase exacto, el `aqui` y el `eco`');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('DESFA', juguete(['a1', 'a2']), { L1: 'a1', L2: 'a2' });

  /*
   * El aparato abre en T; su pong vuelve en T+40 (ida y vuelta de 40 ms) y su `hola` llega en T+40 con
   * c = 30: su reloj era 30 cuando lo mandó, veinte milisegundos antes de llegar. El desfase contra la
   * pared es 30 + 20 − (T+40); contra la sala, eso más el ancla. El ancla es la vuelta del temporizador
   * en que nació la sala, que aquí es la primera: la sala nace en ese mismo instante (T+40).
   */
  const t0 = reloj.t;
  const a = abrir(canal, 'DESFA');
  await reloj.avanzar(40);
  a.contestar();
  a.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'L1', c: 30 });
  await vaciar();
  const ancla = t0 + 40;
  const esperado = Math.round(30 + 20 - (t0 + 40) + ancla);
  await reloj.avanzar(MS_POR_TIC);
  const sala = motor.nacidas[0]?.sala ?? 0;
  const primeras = motor.entradasDe(sala);
  const conexion = primeras.find((e) => e.tipo === 'conexion');
  comprobar(
    'la `EntradaConexion` llega con la ida y vuelta del ping y el desfase exacto (c + rtt/2 − reloj de la sala al llegar)',
    conexion?.tipo === 'conexion' && conexion.asiento === 1 && conexion.rttMs === 40 && conexion.desfaseMs === esperado,
    { conexion, esperado },
  );
  const dentro = a.de('dentro')[0];
  comprobar(
    '`dentro` con su número, el tic de la sala, el sitio de su bienvenida y veinte tics por segundo',
    dentro !== undefined && dentro.yo === 1 && dentro.k === 1 && dentro.x === u(1) && dentro.z === u(-1) && dentro.r === 32 && dentro.hz === 20,
    dentro,
  );

  /* Un `aqui` antes de su `dentro` no entra; después, entra con todo y con el desfase de ahora. */
  const b = abrir(canal, 'DESFA');
  await reloj.avanzar(10);
  b.contestar();
  b.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'L2', c: 0 });
  await vaciar();
  b.decir({ t: 'aqui', n: 1, x: 0, z: 0, r: 0, m: 0, a: 0 });
  a.decir({ t: 'aqui', n: 7, x: u(1.5), z: u(-2), r: 64, m: 2, a: [10, 355, 0] });
  await reloj.avanzar(MS_POR_TIC);
  const segundo = motor.pasosDe(sala).at(-1)?.entradas ?? [];
  const aquiDeA = segundo.find((e) => e.tipo === 'aqui' && e.asiento === 1);
  comprobar(
    'el `aqui` va entero a la sala: sitio, mira, marcha, la acción con su ms del aparato y su blanco, y el desfase',
    aquiDeA?.tipo === 'aqui' &&
      aquiDeA.n === 7 &&
      aquiDeA.x === u(1.5) &&
      aquiDeA.z === u(-2) &&
      aquiDeA.r === 64 &&
      aquiDeA.m === 2 &&
      aquiDeA.accion?.id === 10 &&
      aquiDeA.accion.msDelAparato === 355 &&
      aquiDeA.accion.blanco === 0 &&
      aquiDeA.desfaseMs === esperado,
    aquiDeA,
  );
  comprobar(
    'el `aqui` de quien aún no ha recibido su `dentro` no llega a la sala',
    !segundo.some((e) => e.tipo === 'aqui' && asientoDe(e) === 2),
    segundo.map((e) => e.tipo),
  );
  const ordenB = segundo.filter((e) => asientoDe(e) === 2).map((e) => e.tipo);
  comprobar('y su conexión, sí', ordenB[0] === 'conexion', ordenB);

  /* El `eco`: se contesta en el acto con el tic y el reloj de la sala, y es otra muestra del desfase. */
  await reloj.avanzar(13);
  const antesDelEco = a.textos.length;
  a.decir({ t: 'eco', c: 1234 });
  const respuesta = a.textos.length === antesDelEco + 1 ? leerMensajeDeLaSala(a.textos[antesDelEco] as string) : null;
  const tic = motor.pasosDe(sala).at(-1)?.tic ?? -1;
  comprobar(
    'el `eco` se contesta EN EL ACTO —antes del siguiente tic— con su `c`, el tic de la sala y su reloj',
    respuesta?.t === 'eco' && respuesta.c === 1234 && respuesta.k === tic && respuesta.ms === Math.round(reloj.t - ancla),
    { respuesta, tic, reloj: reloj.t - ancla },
  );
  await reloj.avanzar(MS_POR_TIC);
  const eco = motor.pasosDe(sala).at(-1)?.entradas.find((e) => e.tipo === 'eco');
  /* La muestra nueva va a la mediana con la del `hola`: la media de las dos. */
  const muestra = 1234 + 20 - (reloj.t - MS_POR_TIC);
  const deLaSalaDelHola = 30 + 20 - (t0 + 40);
  const conDos = Math.round((muestra + deLaSalaDelHola) / 2 + ancla);
  comprobar('y a la sala le llega su `EntradaEco` con la ida y vuelta y el desfase de la mediana', eco?.tipo === 'eco' && eco.asiento === 1 && eco.rttMs === 40 && eco.desfaseMs === conDos, { eco, conDos });

  /* Un aviso por segundo como mucho. */
  a.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  a.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await reloj.avanzar(MS_POR_TIC);
  const avisos = (motor.pasosDe(sala).at(-1)?.entradas ?? []).filter((e) => e.tipo === 'aviso');
  comprobar('dos avisos seguidos: a la sala llega uno', avisos.length === 1, avisos);
  canal.apagar();
}

paso('A3b · Un `eco` que llega antes de que el canal tenga sala no se contesta: nada de `{k:0, ms:0}`');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('ECOSS', juguete(['a1', 'a2']), { L1: 'a1', L2: 'a2' });
  await entrar(canal, 'ECOSS', 'L1');
  const sala = motor.nacidas[0]?.sala ?? 0;
  /* La sala lleva un segundo dando pasos: un cero en su reloj sería una medida falsa de veinte tics. */
  await reloj.avanzar(1000);
  /* Como el aparato de verdad: `hola` y el primer `eco` justo detrás, mientras se mira su llave. */
  const b = abrir(canal, 'ECOSS');
  await reloj.avanzar(20);
  b.contestar();
  b.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'L2', c: 5 });
  b.decir({ t: 'eco', c: 6 });
  comprobar(
    'el primer `eco`, que llega mientras se mira la llave, no se contesta —ninguna medida falsa— y se cuenta',
    b.de('eco').length === 0 && canal.diagnostico().ecosSinSala === 1,
    { ecos: b.de('eco'), sinSala: canal.diagnostico().ecosSinSala },
  );
  await vaciar();
  await reloj.avanzar(MS_POR_TIC);
  b.decir({ t: 'eco', c: 90 });
  const respuesta = b.de('eco')[0];
  const tic = motor.pasosDe(sala).at(-1)?.tic ?? -1;
  comprobar(
    'con su sala, el siguiente sí: con el tic y el reloj de ESA sala, que ya van por el veintitantos',
    b.de('dentro').length === 1 && respuesta !== undefined && respuesta.c === 90 && respuesta.k === tic && tic > 20 && respuesta.ms >= tic * MS_POR_TIC,
    { respuesta, tic },
  );
  canal.apagar();
}

paso('A4 · Lo que sale de un paso: a quién, en qué orden, partido si no cabe, y la foto una vez');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('REPAR', juguete(['a1', 'a2', 'a3']), { L1: 'a1', L2: 'a2', L3: 'a3' });
  const a1 = await entrar(canal, 'REPAR', 'L1');
  const a2 = await entrar(canal, 'REPAR', 'L2');
  const a3 = await entrar(canal, 'REPAR', 'L3');
  const sala = motor.nacidas[0]?.sala ?? 0;

  const recurso = (n: number): SucesoDelTic => ({ e: 'recurso', n });
  motor.guion = (_s, _t, entradas) => {
    if (!entradas.some((e) => e.tipo === 'aviso')) return null;
    return {
      sucesos: [
        { para: 0, suceso: recurso(1) },
        { para: 1, suceso: recurso(2) },
        { para: 2, suceso: recurso(3) },
        { para: 0, suceso: recurso(4) },
      ],
      correcciones: [{ asiento: 2, n: 5, x: u(1), z: u(2) }],
      foto: [[1, 0, 0, 0, 0, 0]],
    };
  };
  const antes = [a1.textos.length, a2.textos.length, a3.textos.length];
  a1.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await reloj.avanzar(MS_POR_TIC);
  motor.guion = () => null;
  const nuevos = (a: AparatoDeMentira, i: number): (MensajeDeLaSala | null)[] => a.textos.slice(antes[i]).map((t) => leerMensajeDeLaSala(t));
  const ns = (a: AparatoDeMentira, i: number): number[] =>
    nuevos(a, i)
      .filter((m): m is Extract<MensajeDeLaSala, { t: 'tic' }> => m?.t === 'tic')
      .flatMap((m) => m.ev.map((s) => (s.e === 'recurso' ? s.n : -1)));
  comprobar('cada canal recibe los `para 0` y los suyos, en el orden en que salieron', ns(a1, 0).join() === '1,2,4' && ns(a2, 1).join() === '1,3,4' && ns(a3, 2).join() === '1,4', [ns(a1, 0), ns(a2, 1), ns(a3, 2)]);
  const tipos2 = nuevos(a2, 1).map((m) => m?.t);
  comprobar('y en el orden del contrato: `corrige`, luego el `tic`, luego la foto', tipos2.join() === 'corrige,tic,foto', tipos2);
  const corrige = nuevos(a2, 1)[0];
  comprobar('la corrección va sólo a su asiento, con su `n` y su sitio', corrige?.t === 'corrige' && corrige.n === 5 && corrige.x === u(1) && corrige.z === u(2) && !nuevos(a1, 0).some((m) => m?.t === 'corrige'), corrige);
  const fotos = [a1, a2, a3].map((a, i) => a.textos.slice(antes[i]).filter((t) => t.startsWith('{"t":"foto"')));
  comprobar('la foto: la MISMA cadena a los tres', fotos.every((f) => f.length === 1 && f[0] === fotos[0]?.[0]), fotos);

  /* Una bienvenida en el mismo paso que sucesos y foto: `dentro` primero. */
  const d0 = canal.diagnostico();
  motor.guion = (_s, _t, entradas) =>
    entradas.some((e) => e.tipo === 'conexion') ? { sucesos: [{ para: 0, suceso: recurso(9) }], foto: [[1, 0, 0, 0, 0, 0]] } : { foto: null };
  const a4 = abrir(canal, 'REPAR');
  await reloj.avanzar(10);
  a4.contestar();
  a4.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'L2', c: 0 });
  await vaciar();
  await reloj.avanzar(MS_POR_TIC);
  motor.guion = () => null;
  const tipos4 = a4.mensajes().map((m) => m?.t);
  comprobar('quien entra recibe `dentro` antes que el `tic` y la foto de ese mismo paso', tipos4.join() === 'dentro,tic,foto', tipos4);
  comprobar('y el canal viejo de ese asiento se cierra con `reemplazado` (4103)', a2.cierre?.codigo === CIERRE_DE_LA_LIZA.reemplazado, a2.cierre);
  const d1 = canal.diagnostico();
  comprobar('el diagnóstico cuenta una foto COMPUESTA y una MANDADA por canal', d1.fotosCompuestas - d0.fotosCompuestas === 1 && d1.fotos - d0.fotos === 3, { compuestas: d1.fotosCompuestas - d0.fotosCompuestas, mandadas: d1.fotos - d0.fotos });
  const desconexiones = motor.entradasDe(sala).filter((e) => e.tipo === 'desconexion');
  comprobar('el reemplazado NO mete su desconexión: el nuevo ya trajo su conexión', desconexiones.length === 0, desconexiones);

  /* Muchos sucesos: varios `tic` con el mismo `k`, en orden, todos legibles. */
  const muchos = 2 * TOPE_DE_SUCESOS + 88;
  motor.guion = (_s, _t, entradas) =>
    entradas.some((e) => e.tipo === 'aviso') ? { sucesos: Array.from({ length: muchos }, (_, i) => ({ para: 0, suceso: recurso(i) })) } : null;
  const antes1 = a1.textos.length;
  await reloj.avanzar(1000);
  a3.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await reloj.avanzar(MS_POR_TIC);
  motor.guion = () => null;
  const tics = a1.textos.slice(antes1).map((t) => leerMensajeDeLaSala(t)).filter((m): m is Extract<MensajeDeLaSala, { t: 'tic' }> => m?.t === 'tic');
  const juntos = tics.flatMap((t) => t.ev.map((s) => (s.e === 'recurso' ? s.n : -1)));
  comprobar(
    `${String(muchos)} sucesos en un paso: tres \`tic\` con el mismo \`k\`, los ${String(muchos)} en orden, y el aparato los lee todos`,
    tics.length === 3 && tics.every((t) => t.k === tics[0]?.k) && juntos.length === muchos && juntos.every((n, i) => n === i),
    { tics: tics.length, ks: tics.map((t) => t.k), n: juntos.length },
  );
  const sinNada = a1.textos.length;
  await reloj.avanzar(MS_POR_TIC);
  const tipoDeLoQueSalio = a1.textos.slice(sinNada).map((t) => /^\{"t":"([a-z]+)"/.exec(t)?.[1] ?? '?');
  comprobar('un paso sin sucesos no manda ningún `tic` (ni vacío)', !tipoDeLoQueSalio.includes('tic'), tipoDeLoQueSalio);

  /* La corrección del tic 0 del aparato: sale como del 0, que el lector admite como el del `aqui`. */
  motor.guion = (_s, _t, entradas) => (entradas.some((e) => e.tipo === 'aviso') ? { correcciones: [{ asiento: 1, n: 0, x: 0, z: 0 }] } : null);
  const antesCero = a1.textos.length;
  await reloj.avanzar(1000);
  a1.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await reloj.avanzar(MS_POR_TIC);
  motor.guion = () => null;
  const cero = a1.textos.slice(antesCero).map((t) => leerMensajeDeLaSala(t)).find((m) => m?.t === 'corrige');
  comprobar('la corrección del tic 0 del aparato sale como del 0, sin inventarse otro tic, y el aparato la lee', cero?.t === 'corrige' && cero.n === 0, cero);
  comprobar('nada de lo que ha salido en todo el bloque es ilegible', a1.ilegibles() + a3.ilegibles() + a4.ilegibles() === 0);
  canal.apagar();
}

paso('A5 · El canal atascado: lo sustituible se salta, lo imprescindible cierra con `atascado`');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('ATASC', juguete(['a1', 'a2']), { L1: 'a1', L2: 'a2' });
  const a1 = await entrar(canal, 'ATASC', 'L1');
  const a2 = await entrar(canal, 'ATASC', 'L2');
  a1.atasco = ATASCO_PARA_SALTAR + 1;
  const d0 = canal.diagnostico();
  motor.guion = (_s, _t, entradas) =>
    entradas.some((e) => e.tipo === 'aviso')
      ? { sucesos: [{ para: 0, suceso: { e: 'recurso', n: 1 } }], correcciones: [{ asiento: 1, n: 3, x: 0, z: 0 }], foto: [[1, 0, 0, 0, 0, 0]] }
      : null;
  const antes = a1.textos.length;
  a2.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await reloj.avanzar(MS_POR_TIC);
  const llego = a1.textos.slice(antes).map((t) => leerMensajeDeLaSala(t)?.t);
  const d1 = canal.diagnostico();
  comprobar(
    'con más de 16 kB esperando: la foto y el `corrige` se saltan (y se cuentan), el `tic` sale',
    llego.join() === 'tic' && d1.fotosSaltadas - d0.fotosSaltadas === 1 && d1.saltados - d0.saltados === 1 && a1.cierre === null,
    { llego, saltadas: d1.fotosSaltadas - d0.fotosSaltadas },
  );
  a1.atasco = ATASCO_PARA_CERRAR + 1;
  await reloj.avanzar(1000);
  a2.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await reloj.avanzar(MS_POR_TIC);
  motor.guion = () => null;
  comprobar('con más de un mensaje entero esperando, un `tic` que no se puede perder cierra con `atascado` (4108)', a1.cierre?.codigo === CIERRE_DE_LA_LIZA.atascado, a1.cierre);
  comprobar('y a los demás no les pasa nada', a2.cierre === null && a2.de('tic').length === 2, a2.de('tic').length);
  canal.apagar();
}

paso('A6 · Los veredictos: a la mesa en cadena, en su orden, contados; y con la mesa acabada, fuera todos');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  const m = mesa.poner('VERED', juguete(['a1', 'a2']), { L1: 'a1', L2: 'a2' });
  m.respuestas = ['entro', 'rechazado', 'sinEfecto', 'lanza'];
  const a1 = await entrar(canal, 'VERED', 'L1');
  mesa.tardanza = 6;
  let tanda = 0;
  motor.guion = (_s, _t, entradas) => {
    if (!entradas.some((e) => e.tipo === 'aviso')) return null;
    tanda++;
    return tanda === 1
      ? { veredictos: [veredictoDeReloj('uno'), veredictoDeReloj('dos')] }
      : { veredictos: [veredictoDeReloj('tres'), veredictoDeAusente('a2')] };
  };
  a1.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await reloj.avanzar(MS_POR_TIC);
  await reloj.avanzar(1000);
  a1.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await reloj.avanzar(MS_POR_TIC);
  motor.guion = () => null;
  await vaciar(60);
  const orden = mesa.metidos.map((x) => (x.veredicto.tipo === 'arcade:reloj' ? x.veredicto.carga.id : x.veredicto.tipo));
  comprobar('los cuatro, en el orden en que salieron, aunque la mesa tarde', orden.join() === 'uno,dos,tres,arcade:ausente', orden);
  comprobar('uno detrás de otro: nunca dos a la vez camino de la mesa', mesa.masALaVez === 1, mesa.masALaVez);
  const d = canal.diagnostico();
  comprobar(
    'cada salida contada —entró, rechazado, sin efecto— y la mesa que revienta como fallo, sin tumbar nada',
    d.veredictos.entro === 1 && d.veredictos.rechazado === 1 && d.veredictos.sinEfecto === 1 && d.veredictos.fallos === 1 && a1.cierre === null,
    d.veredictos,
  );
  comprobar('el rechazo se dice en el registro, con su motivo', registro.some((l) => l.includes('VERED') && l.includes('no toca ahora')));
  m.respuestas = ['terminada'];
  motor.guion = (_s, _t, entradas) => (entradas.some((e) => e.tipo === 'aviso') ? { veredictos: [veredictoDeReloj('cuatro')] } : null);
  await reloj.avanzar(1000);
  a1.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await reloj.avanzar(MS_POR_TIC);
  motor.guion = () => null;
  await vaciar(30);
  comprobar('un veredicto que encuentra la mesa acabada cierra la sala: `mesaCerrada` a todos', a1.cierre?.codigo === CIERRE_DE_LA_LIZA.mesaCerrada, a1.cierre);
  comprobar('y sin salas, el temporizador se para', !canal.diagnostico().temporizador && canal.diagnostico().salas === 0, canal.diagnostico().salas);
  canal.apagar();
}

paso('A6b · La cadena de veredictos es de la MESA: la sala que renace espera a que entren los de la que murió');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('CADEN', juguete(['a1']), { L1: 'a1' });
  const a1 = await entrar(canal, 'CADEN', 'L1');
  /* Una mesa lenta: cada veredicto tarda en entrar muchas vueltas del bucle. */
  mesa.tardanza = 40;
  let tanda = 0;
  motor.guion = (_s, _t, entradas) => {
    if (tanda === 1) {
      tanda++;
      return { revienta: true };
    }
    if (!entradas.some((e) => e.tipo === 'aviso')) return null;
    tanda++;
    return { veredictos: [veredictoDeReloj('primero'), veredictoDeReloj('segundo')] };
  };
  a1.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await reloj.avanzar(2 * MS_POR_TIC);
  motor.guion = () => null;
  const cerrada = a1.cierre?.codigo === 1011;
  const vistasAntes = mesa.sucedido.lastIndexOf('vista');
  const otra = await entrar(canal, 'CADEN', 'L1');
  await vaciar(200);
  await reloj.avanzar(2 * MS_POR_TIC);
  const orden = mesa.sucedido.slice(vistasAntes + 1);
  comprobar(
    'la sala que dio dos veredictos revienta; la que nace detrás lee la vista DESPUÉS de que entren los dos',
    cerrada && orden.join() === 'dentro:primero,dentro:segundo,vista' && otra.de('dentro').length === 1,
    { cerrada, orden, dentro: otra.de('dentro').length },
  );
  canal.apagar();
}

paso('A7 · La mesa, como mucho una lectura por segundo; lo que se mete y lo que no');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  const m = mesa.poner('LEERM', juguete(['a1', 'a2']), { L1: 'a1', L2: 'a2' });
  const a1 = await entrar(canal, 'LEERM', 'L1');
  const sala = motor.nacidas[0]?.sala ?? 0;
  const r0 = mesa.revisiones;
  const v0 = mesa.vistas;
  /* La mesa cambia de revisión en CADA tic durante tres segundos. */
  for (let i = 0; i < 60; i++) {
    m.rev++;
    await reloj.avanzar(MS_POR_TIC);
  }
  const revisiones = mesa.revisiones - r0;
  const vistas = mesa.vistas - v0;
  comprobar(
    'tres segundos con la mesa cambiando cada tic: tres lecturas de la revisión y tres de la vista, no sesenta',
    revisiones >= 2 && revisiones <= 3 && vistas >= 2 && vistas <= 3,
    { revisiones, vistas, cada: REVISAR_LA_MESA_CADA_MS },
  );
  const vistasEntradas = motor.entradasDe(sala).filter((e) => e.tipo === 'vista');
  comprobar('cada vista nueva llega a la sala como `EntradaVista`', vistasEntradas.length === vistas, { vistasEntradas: vistasEntradas.length, vistas });
  const conOtroAforo = juguete(['a1', 'a2'], 'f2', { entidades: 20, balas: 12, montones: 8 });
  m.vista = { liza: conOtroAforo };
  m.rev++;
  await reloj.avanzar(REVISAR_LA_MESA_CADA_MS + MS_POR_TIC);
  const rota = { ...juguete(['a1', 'a2'], 'f3'), asientos: [] as ReglasDeAsiento[] };
  m.vista = { liza: { ...rota, fase: { ...rota.fase, limite: 99 } } };
  m.rev++;
  await reloj.avanzar(REVISAR_LA_MESA_CADA_MS + MS_POR_TIC);
  m.vista = { ilegible: true };
  m.rev++;
  await reloj.avanzar(REVISAR_LA_MESA_CADA_MS + MS_POR_TIC);
  const claves = motor
    .entradasDe(sala)
    .filter((e) => e.tipo === 'vista')
    .map((e) => (e.tipo === 'vista' ? e.declaracion.fase.clave : ''));
  const d = canal.diagnostico();
  comprobar(
    'una declaración con OTRO aforo, una con problemas y una vista ilegible NO se meten: la sala sigue con la suya',
    !claves.includes('f2') && !claves.includes('f3') && d.lecturas.conOtroAforo === 1 && d.lecturas.conProblemas === 1 && d.lecturas.ilegibles === 1,
    { claves: [...new Set(claves)], lecturas: d.lecturas },
  );
  m.vista = { liza: juguete(['a1', 'a2'], 'f4') };
  m.rev++;
  await reloj.avanzar(REVISAR_LA_MESA_CADA_MS + MS_POR_TIC);
  const ultima = motor.entradasDe(sala).filter((e) => e.tipo === 'vista').at(-1);
  comprobar('y la siguiente buena, con otra clave de fase, sí', ultima?.tipo === 'vista' && ultima.declaracion.fase.clave === 'f4', ultima?.tipo);
  m.terminada = true;
  await reloj.avanzar(REVISAR_LA_MESA_CADA_MS + MS_POR_TIC);
  comprobar('la mesa se acaba: `mesaCerrada` a todos en menos de un segundo', a1.cierre?.codigo === CIERRE_DE_LA_LIZA.mesaCerrada, a1.cierre);
  const m2 = mesa.poner('BORRA', juguete(['a1']), { L1: 'a1' });
  const b1 = await entrar(canal, 'BORRA', 'L1');
  m2.existe = false;
  await reloj.avanzar(REVISAR_LA_MESA_CADA_MS + MS_POR_TIC);
  comprobar('la mesa desaparece: `mesaCerrada` también', b1.cierre?.codigo === CIERRE_DE_LA_LIZA.mesaCerrada, b1.cierre);
  canal.apagar();
}

paso('A8 · Quien se sienta con la sala abierta: la sala se REHACE —la pura no cambia de asientos— y todos vuelven a entrar');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  const m = mesa.poner('TARDE', juguete(['a1']), { L1: 'a1', L2: 'a2', L3: 'a3' });
  const primera = await entrar(canal, 'TARDE', 'L1');
  const sala = motor.nacidas[0]?.sala ?? 0;
  const tarde = await entrar(canal, 'TARDE', 'L2');
  comprobar('sin su asiento en la declaración, no entra ni se cierra: espera', tarde.cierre === null && tarde.de('dentro').length === 0, tarde.textos);
  /* La mesa lo trae; y con otros asientos, otro aforo, que la sala nueva se vuelve a admitir. */
  const conLosDos = juguete(['a1', 'a2'], 'f1', { entidades: 20, balas: 12, montones: 8 });
  m.vista = { liza: conLosDos };
  m.rev++;
  await reloj.avanzar(REVISAR_LA_MESA_CADA_MS + MS_POR_TIC * 2);
  const d = canal.diagnostico();
  comprobar(
    'la vista con otros asientos NO se le mete a la sala (la de verdad la ignoraría): la sala se rehace',
    !motor.entradasDe(sala).some((e) => e.tipo === 'vista') && d.salasRehechas === 1 && d.salas === 0 && !d.temporizador,
    { rehechas: d.salasRehechas, salas: d.salas },
  );
  comprobar(
    'y sus canales —el que estaba dentro y el que esperaba— se cierran con 1012 para volver a entrar, diciendo por qué',
    primera.cierre?.codigo === 1012 && tarde.cierre?.codigo === 1012 && primera.de('fuera').length === 1 && d.cierres.rehecha === 2,
    [primera.cierre, tarde.cierre],
  );
  const otraVez = await entrar(canal, 'TARDE', 'L1');
  const yaSentada = await entrar(canal, 'TARDE', 'L2');
  comprobar(
    'al volver, la sala nace de la vista nueva, con los dos asientos: `dentro` a cada uno con su número',
    motor.nacidas.length === 2 && motor.nacidas[1]?.declaracion.asientos.length === 2 && otraVez.de('dentro')[0]?.yo === 1 && yaSentada.de('dentro')[0]?.yo === 2,
    { nacidas: motor.nacidas.length, yo: [otraVez.de('dentro')[0]?.yo, yaSentada.de('dentro')[0]?.yo] },
  );
  comprobar(
    'y se admite con su aforo: el coste declarado es el de la vista nueva',
    canal.diagnostico().costeDeclarado === costeDeLaLiza(conLosDos),
    { declarado: canal.diagnostico().costeDeclarado, nuevo: costeDeLaLiza(conLosDos) },
  );
  const nunca = await entrar(canal, 'TARDE', 'L3');
  await reloj.avanzar(ESPERA_DEL_ASIENTO_MS);
  comprobar('y quien no aparece en tres lecturas se cierra con `llaveMala`', nunca.cierre?.codigo === CIERRE_DE_LA_LIZA.llaveMala, nunca.cierre);
  canal.apagar();
}

paso('A9 · Silencio, el cubo (los `aqui` por su reloj, lo demás por fichas), desconexión');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('SILEN', juguete(['a1', 'a2', 'a3', 'a4']), { L1: 'a1', L2: 'a2', L3: 'a3', L4: 'a4' });
  const hablador = await entrar(canal, 'SILEN', 'L1');
  const callado = await entrar(canal, 'SILEN', 'L2');
  const sala = motor.nacidas[0]?.sala ?? 0;
  for (let t = 0; t < SILENCIO_HASTA_CERRAR_MS + 1000; t += 2000) {
    hablador.decir({ t: 'eco', c: t });
    hablador.contestar();
    await reloj.avanzar(2000);
  }
  comprobar('quince segundos sin decir nada: `silencio` (4104)', callado.cierre?.codigo === CIERRE_DE_LA_LIZA.silencio, callado.cierre);
  comprobar('quien manda su `eco` cada dos segundos sigue dentro aunque no ande', hablador.cierre === null);
  const desconexion = motor.entradasDe(sala).find((e) => e.tipo === 'desconexion');
  comprobar('el cerrado por silencio llega a la sala como `EntradaDesconexion`', desconexion?.tipo === 'desconexion' && desconexion.asiento === 2, desconexion);
  comprobar('y mientras dura, el ping sale cada dos segundos (y vuelve)', canal.diagnostico().pongs >= 8, canal.diagnostico().pongs);
  for (let i = 0; i < MENSAJES_DE_GOLPE + 1; i++) hablador.decir({ t: 'eco', c: i });
  comprobar('cuarenta y un `eco` de golpe: `atropello`', hablador.cierre?.codigo === CIERRE_DE_LA_LIZA.atropello, hablador.cierre);

  /*
   * UN CORTE DE RED DE CUATRO SEGUNDOS: el aparato siguió escribiendo un `aqui` por tic, a su hora, y la
   * red se los entrega todos juntos al volver —ochenta, con sus dos `eco`—. Contados al llegar eran un
   * `atropello`; contados por su reloj son lo que un aparato honrado escribe en cuatro segundos.
   */
  const cortado = await entrar(canal, 'SILEN', 'L2');
  await reloj.avanzar(4500);
  const aquisAntes = motor.entradasDe(sala).filter((e) => e.tipo === 'aqui' && e.asiento === 2).length;
  for (let n = 1; n <= 80; n++) {
    cortado.decir({ t: 'aqui', n, x: 0, z: 0, r: 0, m: 0, a: 0 });
    if (n % 40 === 0) cortado.decir({ t: 'eco', c: n * MS_POR_TIC });
  }
  comprobar('tras un corte de cuatro segundos, ochenta `aqui` a su hora y dos `eco` de golpe: sigue abierto', cortado.cierre === null, cortado.cierre);
  await reloj.avanzar(MS_POR_TIC);
  const llegados = motor.entradasDe(sala).filter((e) => e.tipo === 'aqui' && e.asiento === 2).map((e) => (e.tipo === 'aqui' ? e.n : -1)).slice(aquisAntes);
  comprobar('y los ochenta llegan a la sala, en su orden', llegados.length === 80 && llegados.every((n, i) => n === i + 1), llegados.length);

  /* Lo que se adelanta a lo que el canal lleva abierto no va por su reloj: gasta ficha, y se acaba. */
  const futuro = Math.ceil((4500 + 2 * MS_POR_TIC + ADELANTO_DEL_APARATO_MS) / MS_POR_TIC) + 1000;
  const d0 = canal.diagnostico();
  for (let i = 0; i < MENSAJES_DE_GOLPE + 1 && cortado.cierre === null; i++) cortado.decir({ t: 'aqui', n: futuro + i, x: 0, z: 0, r: 0, m: 0, a: 0 });
  comprobar(
    'unos `aqui` que se adelantan a su reloj gastan ficha: con el cubo gastado, `atropello`',
    cortado.cierre?.codigo === CIERRE_DE_LA_LIZA.atropello && canal.diagnostico().aquiFueraDeSuReloj - d0.aquiFueraDeSuReloj >= MENSAJES_DE_GOLPE - 2,
    { cierre: cortado.cierre, fuera: canal.diagnostico().aquiFueraDeSuReloj - d0.aquiFueraDeSuReloj },
  );
  const repite = await entrar(canal, 'SILEN', 'L3');
  for (let i = 0; i < MENSAJES_DE_GOLPE + 2 && repite.cierre === null; i++) repite.decir({ t: 'aqui', n: 3, x: 0, z: 0, r: 0, m: 0, a: 0 });
  comprobar(
    'y uno que repite su `n`: el primero va por su reloj, los repetidos gastan ficha, y se acaba en `atropello`',
    repite.cierre?.codigo === CIERRE_DE_LA_LIZA.atropello,
    repite.cierre,
  );
  /*
   * El cubo de lo demás se rellena a lo que queda de la media del contrato (cinco por segundo): diez
   * `eco` por segundo lo vacían en ocho. A los veinticinco de antes, no se vaciaría nunca, y la media
   * total —con los veinte `aqui` por su reloj— pasaría de la que dice el contrato.
   */
  const charlatan = await entrar(canal, 'SILEN', 'L4');
  let segundos = 0;
  for (let i = 0; i < 150 && charlatan.cierre === null; i++) {
    charlatan.decir({ t: 'eco', c: i * 100 });
    await reloj.avanzar(100);
    segundos = (i + 1) / 10;
  }
  comprobar(
    'diez `eco` por segundo —el doble de lo que queda de la media— acaban en `atropello` antes de quince segundos',
    charlatan.cierre?.codigo === CIERRE_DE_LA_LIZA.atropello && segundos < 15,
    { cierre: charlatan.cierre, segundos },
  );
  canal.apagar();
}

paso('A10 · El aforo: la sala que no cabe no se abre (`llena`); la que vive no se echa');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  const coste = costeDeLaLiza(juguete(['a1']));
  const caben = Math.floor(PRESUPUESTO_DE_LAS_LIZAS / coste);
  const dentro: AparatoDeMentira[] = [];
  for (let i = 0; i < caben; i++) {
    const codigo = `AF${String(i).padStart(3, '0')}`;
    mesa.poner(codigo, juguete(['a1']), { L1: 'a1' });
    dentro.push(await entrar(canal, codigo, 'L1'));
  }
  mesa.poner('AFULL', juguete(['a1']), { L1: 'a1' });
  const sobra = await entrar(canal, 'AFULL', 'L1');
  comprobar(
    `con ${String(caben)} salas de ${String(coste)} µs/s abiertas (presupuesto ${String(PRESUPUESTO_DE_LAS_LIZAS)}), la siguiente: \`llena\` (4109)`,
    sobra.cierre?.codigo === CIERRE_DE_LA_LIZA.llena && dentro.every((a) => a.cierre === null && a.de('dentro').length === 1),
    { cierre: sobra.cierre, dentro: dentro.filter((a) => a.de('dentro').length === 1).length },
  );
  const d = canal.diagnostico();
  comprobar('el diagnóstico dice el coste declarado de las que viven y la que no cupo', d.costeDeclarado === caben * coste && d.salasQueNoCupieron === 1, { declarado: d.costeDeclarado, noCupieron: d.salasQueNoCupieron });
  comprobar('un solo temporizador para todas', reloj.periodicos() === 1, reloj.periodicos());
  const m0 = mesa.mesas.get('AF000');
  if (m0 !== undefined) m0.terminada = true;
  await reloj.avanzar(REVISAR_LA_MESA_CADA_MS + MS_POR_TIC);
  const otraVez = await entrar(canal, 'AFULL', 'L1');
  comprobar('cuando una se cierra, cabe la que no cabía', otraVez.de('dentro').length === 1 && otraVez.cierre === null, otraVez.cierre);
  canal.apagar();
  comprobar('y apagado el canal, ningún temporizador', reloj.periodicos() === 0, reloj.periodicos());
}

paso('A11 · El reloj de la sala: un paso por tic, pegado a la pared; tras una parada larga, el ancla se mueve');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('ANCLA', juguete(['a1', 'a2']), { L1: 'a1', L2: 'a2' });
  const a1 = await entrar(canal, 'ANCLA', 'L1');
  const sala = motor.nacidas[0]?.sala ?? 0;
  const pasos0 = motor.pasosDe(sala).length;
  await reloj.avanzar(1000);
  comprobar('un segundo, veinte pasos', motor.pasosDe(sala).length - pasos0 === 20, motor.pasosDe(sala).length - pasos0);

  /* Se para el proceso 800 ms (dieciséis tics) con un `aqui` en la cola; y entra alguien mientras. */
  const conexion = motor.entradasDe(sala).find((e) => e.tipo === 'conexion');
  const desfaseAntes = conexion?.tipo === 'conexion' ? conexion.desfaseMs : NaN;
  a1.decir({ t: 'aqui', n: 900, x: 0, z: 0, r: 0, m: 0, a: 0 });
  const b = abrir(canal, 'ANCLA');
  b.contestar();
  b.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'L2', c: 0 });
  await vaciar();
  const d0 = canal.diagnostico();
  const pasosAntes = motor.pasosDe(sala).length;
  await reloj.pararElProceso(800);
  const tras = motor.pasosDe(sala).slice(pasosAntes);
  const d1 = canal.diagnostico();
  const perdidos = 16 - PASOS_SEGUIDOS_COMO_MUCHO;
  comprobar(
    `tras 800 ms parado, una vuelta da ${String(PASOS_SEGUIDOS_COMO_MUCHO)} pasos seguidos y da por perdidos ${String(perdidos)}`,
    tras.length === PASOS_SEGUIDOS_COMO_MUCHO && d1.reanclajes - d0.reanclajes === 1 && d1.pasosPerdidos - d0.pasosPerdidos === perdidos,
    { pasos: tras.length, reanclajes: d1.reanclajes - d0.reanclajes, perdidos: d1.pasosPerdidos - d0.pasosPerdidos },
  );
  const primero = tras[0]?.entradas ?? [];
  const eco = primero[0];
  const delta = perdidos * MS_POR_TIC;
  comprobar(
    'lo PRIMERO que entra es el desfase nuevo de quien estaba dentro: el viejo más lo que se movió el ancla',
    eco?.tipo === 'eco' && eco.asiento === 1 && eco.desfaseMs - Math.round(desfaseAntes) === delta,
    { eco, desfaseAntes, delta },
  );
  const aqui = primero.find((e) => e.tipo === 'aqui');
  const conexionB = primero.find((e) => e.tipo === 'conexion' && e.asiento === 2);
  comprobar(
    'y lo que esperaba en la cola se corrige en el sitio: el `aqui` y la conexión de quien entraba, `Δ` más',
    aqui?.tipo === 'aqui' && aqui.desfaseMs - Math.round(desfaseAntes) === delta && conexionB?.tipo === 'conexion',
    { aqui, conexionB },
  );
  const pasosTras = motor.pasosDe(sala).length;
  await reloj.avanzar(1000);
  comprobar('y después, otra vez veinte pasos por segundo', motor.pasosDe(sala).length - pasosTras === 20, motor.pasosDe(sala).length - pasosTras);
  canal.apagar();
}

paso('A12 · La gracia de una sala sin nadie, el paso que revienta, y la sala que renace de la mesa');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  const liza = juguete(['a1']);
  mesa.poner('GRACI', liza, { L1: 'a1' });
  const a1 = await entrar(canal, 'GRACI', 'L1');
  const sala = motor.nacidas[0]?.sala ?? 0;
  a1.conexion?.seCerro();
  const gracia = graciaDe(liza);
  const pasosAlIrse = motor.pasosDe(sala).length;
  await reloj.avanzar(gracia - 1000);
  comprobar(
    `sin nadie, la sala sigue dando pasos durante su gracia (${String(gracia / 1000)} s: lo que tarda en dar a alguien por ausente, y un margen)`,
    canal.diagnostico().salas === 1 && motor.pasosDe(sala).length - pasosAlIrse >= (gracia - 1000) / MS_POR_TIC - 1,
    motor.pasosDe(sala).length - pasosAlIrse,
  );
  await reloj.avanzar(2000);
  comprobar('vencida la gracia, se borra y el temporizador se para', canal.diagnostico().salas === 0 && reloj.periodicos() === 0, canal.diagnostico().salas);
  const vuelve = await entrar(canal, 'GRACI', 'L1');
  comprobar('quien vuelve después hace nacer otra, de la misma vista y con la misma semilla', motor.nacidas.length === 2 && motor.nacidas[1]?.semilla === motor.nacidas[0]?.semilla && vuelve.de('dentro').length === 1, motor.nacidas.length);

  const nueva = motor.nacidas[1]?.sala ?? 0;
  motor.guion = (s) => (s === nueva ? { revienta: true } : null);
  await reloj.avanzar(MS_POR_TIC);
  motor.guion = () => null;
  comprobar('un paso que revienta cierra ESA sala: 1011 a los suyos, y se cuenta', vuelve.cierre?.codigo === 1011 && canal.diagnostico().pasosRotos === 1, vuelve.cierre);
  comprobar('y lo dice en el registro, con la mesa y el tic', registro.some((l) => l.includes('GRACI') && l.includes('reventado')));
  const otra = await entrar(canal, 'GRACI', 'L1');
  comprobar('y quien vuelve a entrar la rehace desde la mesa', otra.de('dentro').length === 1 && motor.nacidas.length === 3, motor.nacidas.length);
  canal.apagar();
}

paso('A13 · El coste medido, y el diagnóstico sin un código, sin un asiento y sin una llave');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('COSTE', juguete(['a1']), { SECRETA: 'a1' });
  await entrar(canal, 'COSTE', 'SECRETA');
  await reloj.avanzar(1100);
  const d = canal.diagnostico();
  comprobar('tras un segundo de pasos, la sala tiene un coste medido', d.costeMedidoPorSala.length === 1 && d.costeMedido > 0 && d.costeMedido === d.costeMedidoPorSala[0], { medido: d.costeMedido });
  const texto = JSON.stringify(d);
  comprobar('el diagnóstico no dice el código de la mesa, ni el asiento, ni la llave', !texto.includes('COSTE') && !texto.includes('SECRETA') && !texto.includes('"a1"'), texto.slice(0, 300));
  comprobar('y dice la ida y vuelta mediana de quien está dentro', d.idaYVueltaMs === 40 && d.enSala === 1, { ida: d.idaYVueltaMs, enSala: d.enSala });
  comprobar('el registro tampoco ha dicho nunca una llave', !registro.some((l) => l.includes('SECRETA') || l.includes('"L1"')));
  canal.apagar();
}

paso('A13b · Sacar y validar la declaración va al coste medido de su sala y al diagnóstico');
{
  /*
   * Un cronómetro de mentira que sólo avanza cuando el registro saca una liza: siete milisegundos cada
   * vez. Así lo único que cuesta es eso, y se ve exacto dónde va a parar.
   */
  let cpu = 0;
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const m = mesa.poner('VALID', juguete(['a1']), { L1: 'a1' });
  const caras: LasLizas = {
    sePuedeLidiar: LAS_LIZAS_DE_MENTIRA.sePuedeLidiar,
    lizaDeLaMesa: (arcade, vista, codigo) => {
      cpu += 7;
      return LAS_LIZAS_DE_MENTIRA.lizaDeLaMesa(arcade, vista, codigo);
    },
  };
  const canal = new CanalDeLaLiza({ reloj, mesa: mesa.puerta, lizas: caras, motor: motor.puerta, registrar: (l) => registro.push(l), cronometro: () => cpu });
  await entrar(canal, 'VALID', 'L1');
  let masCaro = 0;
  for (let i = 0; i < 30; i++) {
    await reloj.avanzar(MS_POR_TIC);
    masCaro = Math.max(masCaro, canal.diagnostico().costeMedidoPorSala[0] ?? 0);
  }
  const d1 = canal.diagnostico();
  comprobar(
    'la declaración que abre la sala (siete milisegundos) va a su primer segundo de coste, y a `validaciones`',
    masCaro === 7000 && d1.validaciones.veces === 1 && d1.validaciones.ms === 7,
    { masCaro, validaciones: d1.validaciones },
  );
  /*
   * Antes de cambiar la mesa, un segundo entero sin leer nada, que cuesta cero: si no, el segundo de la
   * apertura (7.000) seguiría siendo el último entero y se tomaría por el del cambio.
   */
  for (let i = 0; i < 60 && (canal.diagnostico().costeMedidoPorSala[0] ?? -1) !== 0; i++) await reloj.avanzar(MS_POR_TIC);
  const enCero = canal.diagnostico().costeMedidoPorSala[0] === 0;
  m.rev++;
  masCaro = 0;
  for (let i = 0; i < 60; i++) {
    await reloj.avanzar(MS_POR_TIC);
    masCaro = Math.max(masCaro, canal.diagnostico().costeMedidoPorSala[0] ?? 0);
  }
  const d2 = canal.diagnostico();
  comprobar(
    'y la de cada cambio de mesa, al segundo en que se lee (tras uno que no leyó nada y costó cero)',
    enCero && masCaro === 7000 && d2.validaciones.veces === 2 && d2.validaciones.msMasLenta === 7,
    { enCero, masCaro, validaciones: d2.validaciones },
  );
  canal.apagar();
}

paso('A14 · Apagar (SIGTERM): 1001 a todos con su `fuera`, y no entra nadie más');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('APAGA', juguete(['a1']), { L1: 'a1' });
  const dentro = await entrar(canal, 'APAGA', 'L1');
  const saludando = abrir(canal, 'APAGA');
  canal.apagar();
  comprobar('quien estaba dentro y quien aún saludaba: 1001, con su `fuera`', dentro.cierre?.codigo === 1001 && saludando.cierre?.codigo === 1001 && dentro.de('fuera').length === 1, [dentro.cierre, saludando.cierre]);
  const tarde = abrir(canal, 'APAGA');
  comprobar('quien llega después: 1001 en el acto', tarde.cierre?.codigo === 1001, tarde.cierre);
  comprobar('sin temporizador', reloj.periodicos() === 0 && !canal.diagnostico().temporizador);
}

paso('A15 · Quien no recibe su bienvenida en sus pasos: 1011 para que vuelva a entrar, y no se queda colgado');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  const canal = canalNuevo(mesa, motor);
  mesa.poner('BIENV', juguete(['a1', 'a2']), { L1: 'a1', L2: 'a2' });
  /* Una sala que no reconoce al asiento 2: su conexión entra y no sale bienvenida. */
  motor.guion = (_s, _t, entradas) => (entradas.some((e) => e.tipo === 'conexion' && e.asiento === 2) ? { bienvenidas: [] } : null);
  const bien = await entrar(canal, 'BIENV', 'L1');
  const olvidado = await entrar(canal, 'BIENV', 'L2');
  await reloj.avanzar((PASOS_SIN_BIENVENIDA - 4) * MS_POR_TIC);
  comprobar('unos pasos antes de su plazo, sigue esperando', olvidado.cierre === null && olvidado.de('dentro').length === 0, olvidado.cierre);
  await reloj.avanzar(6 * MS_POR_TIC);
  motor.guion = () => null;
  comprobar(
    `pasados ${String(PASOS_SIN_BIENVENIDA)} pasos sin su \`dentro\`: 1011 con su \`fuera\`, contado, y a los demás no les pasa nada`,
    olvidado.cierre?.codigo === 1011 && olvidado.de('fuera').length === 1 && canal.diagnostico().sinBienvenida === 1 && bien.cierre === null,
    { cierre: olvidado.cierre, sinBienvenida: canal.diagnostico().sinBienvenida },
  );
  canal.apagar();
}

// ===========================================================================
// B · EL ENCHUFE Y EL DIAGNÓSTICO, CON `ws` DE VERDAD POR EL BUCLE LOCAL
// ===========================================================================

paso('B1 · La ruta de la Liza');
comprobar(
  'la del contrato da su código; las demás, nada',
  codigoDeLaRutaDeLaLiza(rutaDeLaLiza('ABCDE')) === 'ABCDE' &&
    codigoDeLaRutaDeLaLiza('/api/arcade/mesas/abcde/liza?x=1') === 'ABCDE' &&
    codigoDeLaRutaDeLaLiza('/api/arcade/mesas/ABCDE/botas') === null &&
    codigoDeLaRutaDeLaLiza('/api/arcade/mesas/ABC%FF/liza') === null &&
    codigoDeLaRutaDeLaLiza('/api/arcade/mesas/A-B/liza') === null &&
    codigoDeLaRutaDeLaLiza(undefined) === null,
);
comprobar(
  'la del diagnóstico, exacta y con o sin `?…`',
  esLaRutaDelDiagnostico(RUTA_DEL_DIAGNOSTICO) && esLaRutaDelDiagnostico(`${RUTA_DEL_DIAGNOSTICO}?x`) && !esLaRutaDelDiagnostico(`${RUTA_DEL_DIAGNOSTICO}/mas`) && !esLaRutaDelDiagnostico('/api/arcade/diagnostico'),
);

/** Un cliente `ws` de verdad: apunta lo que recibe (leído con el lector estricto) y cómo se cierra. */
class ClienteDeVerdad {
  readonly ws: WebSocket;
  readonly mensajes: (MensajeDeLaSala | null)[] = [];
  cierre: number | null = null;
  rechazo: number | null = null;
  readonly abierto: Promise<boolean>;
  constructor(puerto: number, ruta: string, opciones: { origen?: string } = {}) {
    this.ws = new WebSocket(`ws://127.0.0.1:${String(puerto)}${ruta}`, {
      handshakeTimeout: 5000,
      ...(opciones.origen === undefined ? {} : { origin: opciones.origen }),
    });
    this.abierto = new Promise<boolean>((resolver) => {
      this.ws.once('open', () => resolver(true));
      this.ws.once('unexpected-response', (peticion, respuesta) => {
        this.rechazo = respuesta.statusCode ?? 0;
        respuesta.resume();
        peticion.destroy();
        resolver(false);
      });
      this.ws.once('error', () => resolver(false));
    });
    this.ws.on('message', (d) => this.mensajes.push(leerMensajeDeLaSala(d.toString())));
    this.ws.on('close', (c) => {
      this.cierre = c;
    });
    this.ws.on('error', () => {});
  }
  decir(m: MensajeDelAparato): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(textoDelAparato(m));
  }
  de<T extends MensajeDeLaSala['t']>(t: T): Extract<MensajeDeLaSala, { t: T }>[] {
    return this.mensajes.filter((m): m is Extract<MensajeDeLaSala, { t: T }> => m !== null && m.t === t);
  }
}

async function hasta(que: () => boolean, ms = 3000): Promise<boolean> {
  const fin = Date.now() + ms;
  while (Date.now() < fin && !que()) await dormir(15);
  return que();
}

/** El reloj de verdad para el enchufe: monótono y con temporizadores de verdad. */
const RELOJ_DE_VERDAD: RelojDeLaLiza = {
  ahora: () => performance.now(),
  cada: (ms, hacer) => {
    const t = setInterval(hacer, ms);
    return { parar: () => clearInterval(t) };
  },
  dentroDe: (ms, hacer) => {
    const t = setTimeout(hacer, ms);
    return { parar: () => clearTimeout(t) };
  },
};

paso('B2 · El enchufe con `ws` de verdad: entra, el ping lo contesta el cliente solo, y las rutas ajenas');
{
  const mesa = new MesaDeMentira();
  const motor = new MotorDeMentira();
  mesa.poner('ENCHU', juguete(['a1']), { L1: 'a1' });
  const canal = new CanalDeLaLiza({ reloj: RELOJ_DE_VERDAD, mesa: mesa.puerta, lizas: LAS_LIZAS_DE_MENTIRA, motor: motor.puerta, registrar: (l) => registro.push(l) });
  const servidor = http.createServer((_q, r) => {
    r.statusCode = 404;
    r.end();
  });
  enchufarLaLiza(servidor, canal, { produccion: false, extra: [] });
  let compuestos = 0;
  servirElDiagnostico(servidor, () => {
    compuestos++;
    return canal.diagnostico();
  });
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', () => r()));
  const puerto = (servidor.address() as AddressInfo).port;

  const bueno = new ClienteDeVerdad(puerto, rutaDeLaLiza('ENCHU'));
  await bueno.abierto;
  bueno.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'L1', c: 0 });
  await hasta(() => bueno.de('dentro').length > 0);
  comprobar('un cliente `ws` que sólo dice `hola` entra: el ping de protocolo lo contesta él solo', bueno.de('dentro').length === 1, bueno.mensajes.slice(0, 3));
  await hasta(() => bueno.de('foto').length > 0);
  comprobar('y le llegan las fotos, legibles', bueno.de('foto').length > 0 && bueno.mensajes.every((m) => m !== null));
  const conexion = motor.entradasDe(motor.nacidas[0]?.sala ?? 0).find((e) => e.tipo === 'conexion');
  comprobar('su ida y vuelta, medida con el ping, es la del bucle local (pocos ms)', conexion?.tipo === 'conexion' && conexion.rttMs >= 0 && conexion.rttMs < 200, conexion);

  const grande = new ClienteDeVerdad(puerto, rutaDeLaLiza('ENCHU'));
  await grande.abierto;
  grande.ws.send('x'.repeat(300));
  await hasta(() => grande.cierre !== null);
  comprobar('un mensaje de más de 256 bytes lo corta `ws` con 1009', grande.cierre === 1009, grande.cierre);

  const ajeno = new ClienteDeVerdad(puerto, rutaDeLaLiza('ENCHU'), { origen: 'https://ajeno.example' });
  await ajeno.abierto;
  comprobar('desde un origen ajeno no se abre: 403', ajeno.rechazo === 403, ajeno.rechazo);
  const otraRuta = new ClienteDeVerdad(puerto, '/api/arcade/mesas/ENCHU/otra');
  await otraRuta.abierto;
  comprobar('una ruta que no es de nadie: 404', otraRuta.rechazo === 404, otraRuta.rechazo);
  const deBotasSinBotas = new ClienteDeVerdad(puerto, '/api/arcade/mesas/ENCHU/botas');
  await deBotasSinBotas.abierto;
  comprobar('la de botas sin nadie más escuchando: 404 también (no se deja colgada)', deBotasSinBotas.rechazo === 404, deBotasSinBotas.rechazo);

  /* Y con otro oyente de `upgrade` que atiende la de botas, ésa se le deja a él. */
  const deBotas: string[] = [];
  servidor.on('upgrade', (req, socket) => {
    if ((req.url ?? '').endsWith('/botas')) {
      deBotas.push(req.url ?? '');
      socket.write('HTTP/1.1 418 Botas\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
    }
  });
  const conBotas = new ClienteDeVerdad(puerto, '/api/arcade/mesas/ENCHU/botas');
  await conBotas.abierto;
  comprobar('con botas escuchando, su ruta es suya: la Liza no la toca', conBotas.rechazo === 418 && deBotas.length === 1, conBotas.rechazo);
  const otraConBotas = new ClienteDeVerdad(puerto, '/api/arcade/mesas/ENCHU/otra');
  await otraConBotas.abierto;
  comprobar('y lo que no es de ninguno de los dos sigue siendo 404', otraConBotas.rechazo === 404, otraConBotas.rechazo);

  const diag = await fetch(`http://127.0.0.1:${String(puerto)}${RUTA_DEL_DIAGNOSTICO}`);
  const cuerpo = (await diag.json().catch(() => ({}))) as { salas?: unknown; enSala?: unknown; cierres?: { atropello?: unknown } };
  comprobar(
    'el diagnóstico en su ruta: 200, sin caché, con salas, canales y cierres',
    diag.status === 200 && diag.headers.get('cache-control') === 'no-store' && cuerpo.salas === 1 && cuerpo.enSala === 1,
    { estado: diag.status, cuerpo },
  );
  const antesDeLaRafaga = compuestos;
  const rafaga = await Promise.all(Array.from({ length: 20 }, () => fetch(`http://127.0.0.1:${String(puerto)}${RUTA_DEL_DIAGNOSTICO}`).then((r) => r.status)));
  const enLaRafaga = compuestos - antesDeLaRafaga;
  await dormir(VIGENCIA_DEL_DIAGNOSTICO_MS + 50);
  await fetch(`http://127.0.0.1:${String(puerto)}${RUTA_DEL_DIAGNOSTICO}`);
  comprobar(
    'veinte peticiones de golpe contestan las veinte y componen el diagnóstico una vez como mucho; pasado su cuarto de segundo, otra',
    rafaga.every((s) => s === 200) && enLaRafaga <= 1 && compuestos - antesDeLaRafaga === enLaRafaga + 1,
    { enLaRafaga, despues: compuestos - antesDeLaRafaga },
  );
  const otra = await fetch(`http://127.0.0.1:${String(puerto)}/api/cualquier/otra`);
  const post = await fetch(`http://127.0.0.1:${String(puerto)}${RUTA_DEL_DIAGNOSTICO}`, { method: 'POST' });
  comprobar('y todo lo demás —otra ruta, u otro método en la suya— sigue yendo a quien ya atendía', otra.status === 404 && post.status === 404, [otra.status, post.status]);

  canal.apagar();
  await hasta(() => bueno.cierre !== null);
  comprobar('apagar cierra el canal de verdad con 1001', bueno.cierre === 1001, bueno.cierre);
  for (const c of [bueno, grande, ajeno, otraRuta, deBotasSinBotas, conBotas, otraConBotas]) c.ws.terminate();
  servidor.closeAllConnections();
  await Promise.race([new Promise<void>((r) => servidor.close(() => r())), dormir(2000)]);
}

// ===========================================================================
// C · EL MONTAJE DE VERDAD, EN PROCESO: LA MESA DE `mesas.ts` Y SIGTERM
// ===========================================================================

/*
 * LA SALA PURA ES DE OTRO FRENTE (`shared/mecanicas/liza/sala.ts`) y el montaje la importa: sin ella el
 * servidor no arranca. Si no está, se dice en ROJO y no se sigue —lo que viene la necesita—: un «no
 * estaba, me lo salto» sería un verde que no ha mirado nada.
 */
const HAY_SALA = fs.existsSync(path.join(REPO, 'shared', 'mecanicas', 'liza', 'sala.ts'));
if (!comprobar('la sala pura existe (`shared/mecanicas/liza/sala.ts`): sin ella el montaje no carga', HAY_SALA)) {
  terminar({ escritas: ESCRITAS });
}

paso('C1 · La sala, la mesa y el registro de VERDAD, con el reloj en la mano: quien se sienta con la sala abierta');
{
  /*
   * El hallazgo 3 de la revisión, jugado con todo de verdad menos el reloj: Ana entra en la reunión; Bea
   * se sienta DESPUÉS, con la sala abierta, y entra; se empieza. Con la sala de verdad —que no toma una
   * declaración con otros asientos— la noche tiene que seguir: la sala se rehace, las dos vuelven a entrar
   * solas (como el aparato tras un cierre que se reintenta), la sala toma la vista de la noche y la
   * bajada vence. En la primera pasada, Bea se quedaba sin `dentro` y la mesa, parada en la bajada.
   */
  await import('../../shared/arcade/juegos');
  const mesas = await import('../src/arcade/mesas');
  const deVerdad = await import('../src/liza/index');
  const lizasDeVerdad = await import('../../shared/arcade/juegos/lizas');
  const vistaDelQuiebro = await import('../../shared/arcade/juegos/quiebro-vista');
  const { RobotDeLaLiza } = await import('./medir-liza');
  const { ponerCanal } = await import('../src/canal');
  const { canalDeSondeo } = await import('../src/canal/sondeo');
  /* El canal de sondeo, como lo pone `index.ts`: avisar a quien mira es parte de meter un veredicto. */
  ponerCanal(canalDeSondeo);

  const canal = new CanalDeLaLiza({
    reloj,
    mesa: deVerdad.LA_MESA_DE_LA_LIZA,
    lizas: deVerdad.LAS_LIZAS_DE_VERDAD,
    motor: deVerdad.EL_MOTOR_DE_VERDAD,
    registrar: (l) => registro.push(l),
  });
  const abierta = await mesas.abrir({ arcade: 'quiebro', nombre: 'Ana', plazoSegundos: 300 });
  const codigo = abierta.mesa.codigo;
  /* La liza de los robots: la MISMA función que el servidor, sobre la vista de espectador. */
  const declarada: { liza: LizaDeclarada | null } = { liza: null };
  const alDia = async (): Promise<void> => {
    const v = await mesas.mirar(codigo, null);
    declarada.liza = lizasDeVerdad.lizaDeLaMesa(v.arcade, v.vista, codigo);
  };
  await alDia();

  /* Los cierres tras los que el aparato NO vuelve a entrar solo: los de `CIERRES_SIN_VUELTA` del cliente. */
  const L = CIERRE_DE_LA_LIZA;
  const SIN_VUELTA: readonly number[] = [L.llaveMala, L.reemplazado, L.mesaCerrada, L.versionVieja, L.mesaQueNo];
  interface EnProceso {
    readonly robot: InstanceType<typeof RobotDeLaLiza>;
    readonly buzon: string[];
    readonly cierres: number[];
    conexion: ConexionDeLaLiza | null;
    vuelveEn: number | null;
  }
  const robots: EnProceso[] = [];
  const conectar = (r: EnProceso): void => {
    const cx = canal.abrir(codigo, {
      enviar: (texto) => r.buzon.push(texto),
      cerrar: (codigoDeCierre) => {
        if (r.conexion !== cx) return;
        r.cierres.push(codigoDeCierre);
        r.conexion = null;
        r.robot.dentro = false;
        /* Como el aparato: lo que se reintenta, medio segundo después. */
        if (!SIN_VUELTA.includes(codigoDeCierre)) r.vuelveEn = reloj.t + 500;
      },
      pendientes: () => 0,
      /* El navegador contesta el ping solo; aquí, en la vuelta siguiente del bucle. */
      ping: (n) => void Promise.resolve().then(() => cx.pong(n)),
    });
    r.conexion = cx;
    r.robot.abrir();
  };
  const bajar = (llave: string): EnProceso => {
    const r: EnProceso = {
      robot: new RobotDeLaLiza({ llave, reloj: () => reloj.t, liza: () => declarada.liza, mandar: (texto) => r.conexion?.recibir(texto) }),
      buzon: [],
      cierres: [],
      conexion: null,
      vuelveEn: null,
    };
    robots.push(r);
    conectar(r);
    return r;
  };
  /*
   * Corre `ms` del reloj de mentira a pasos de 25: los robots leen lo que les bajó, vuelven a entrar si
   * toca y mandan su `aqui`. Cada medio segundo, la liza al día y un respiro de verdad para lo que la
   * mesa de verdad escribe en disco.
   */
  const correr = async (ms: number): Promise<void> => {
    const fin = reloj.t + ms;
    let vuelta = 0;
    while (reloj.t < fin) {
      await reloj.avanzar(25);
      for (const r of robots) {
        if (r.vuelveEn !== null && reloj.t >= r.vuelveEn) {
          r.vuelveEn = null;
          conectar(r);
        }
        for (const texto of r.buzon.splice(0)) r.robot.recibir(texto);
        r.robot.latir();
      }
      if (++vuelta % 20 === 0) {
        await alDia();
        await dormir(1);
      }
    }
  };

  const ana = bajar(abierta.silla.llave);
  await correr(2000);
  comprobar('Ana entra en la reunión, sola: `dentro` con el número 1', ana.robot.dentro && ana.robot.yo === 1, { cierres: ana.cierres, registro: registro.slice(-3) });
  const sentada = await mesas.sentarse(codigo, 'Bea');
  await alDia();
  const bea = bajar(sentada.llave);
  await correr(4000);
  const d1 = canal.diagnostico();
  comprobar(
    'Bea se sienta con la sala abierta: la vista trae otros asientos y la sala se rehace (1012 a quien estaba)',
    d1.salasRehechas >= 1 && ana.cierres.includes(1012),
    { rehechas: d1.salasRehechas, ana: ana.cierres, bea: bea.cierres },
  );
  comprobar(
    'y las dos vuelven a entrar solas en la sala nueva: `dentro` con su número, 1 y 2, y nadie colgado',
    ana.robot.dentro && bea.robot.dentro && ana.robot.yo === 1 && bea.robot.yo === 2 && d1.sinBienvenida === 0,
    { ana: [ana.robot.dentro, ana.robot.yo], bea: [bea.robot.dentro, bea.robot.yo], sinBienvenida: d1.sinBienvenida },
  );
  const reunida = await mesas.mirar(codigo, abierta.silla.llave);
  const empezar = reunida.opciones.find((o) => o.tipo === vistaDelQuiebro.MOVIMIENTO_DEL_QUIEBRO.empezar);
  await mesas.mover(codigo, abierta.silla.llave, reunida.rev, { tipo: vistaDelQuiebro.MOVIMIENTO_DEL_QUIEBRO.empezar, carga: empezar?.carga ?? null });
  await alDia();
  const faseDeLaReunion = ana.robot.fase;
  const revEmpezada = (await mesas.mirar(codigo, null)).rev;
  await correr(3000);
  const dEmpezada = canal.diagnostico();
  comprobar(
    'se empieza: la sala TOMA la vista de la noche —mismos asientos: no se rehace— y las dos oyen la fase nueva',
    ana.robot.fase.length > 0 &&
      ana.robot.fase !== faseDeLaReunion &&
      ana.robot.fase === bea.robot.fase &&
      dEmpezada.salasRehechas === d1.salasRehechas &&
      dEmpezada.lecturas.declaracionesNuevas > d1.lecturas.declaracionesNuevas &&
      ana.robot.dentro &&
      bea.robot.dentro,
    { antes: faseDeLaReunion, ana: ana.robot.fase, bea: bea.robot.fase, rehechas: [d1.salasRehechas, dEmpezada.salasRehechas] },
  );
  await correr(15_000);
  const revTras = (await mesas.mirar(codigo, null)).rev;
  const d2 = canal.diagnostico();
  comprobar(
    'y la noche sigue: la sala hace vencer la bajada —su `arcade:reloj` entra en la mesa— y nacen entidades',
    revTras > revEmpezada && d2.veredictos.entro >= 1 && (ana.robot.cuentas.sucesos.nace ?? 0) > 0,
    { rev: [revEmpezada, revTras], veredictos: d2.veredictos, sucesos: ana.robot.cuentas.sucesos },
  );
  canal.apagar();
}

paso('C · `montarLaLiza` con la mesa de verdad: un veredicto por la vía interna, el diagnóstico, y SIGTERM');
{
  /* Los arcades de la casa dados de alta, como en el servidor; y la mesa, con su carpeta temporal. */
  await import('../../shared/arcade/juegos');
  const mesas = await import('../src/arcade/mesas');
  const liza = await import('../src/liza/index');
  const servidor = http.createServer((_q, r) => {
    r.statusCode = 404;
    r.end();
  });
  /*
   * La mesa y el montaje DE VERDAD; el registro y la sala, de mentira: una mesa de Las Lindes (que no se
   * lidia) hace de mesa cualquiera, y un registro de juguete le da una liza. Lo que se mira aquí es el
   * montaje —la llave que reconoce `mesas.ts`, el veredicto que entra por `meterDeLaPlataforma`, la
   * despedida—; la liza de verdad de un juego de verdad, en el bloque D.
   */
  const motor = new MotorDeMentira();
  const abierta = await mesas.abrir({ arcade: 'lindes', nombre: 'Ana', plazoSegundos: 0 });
  const codigo = abierta.mesa.codigo;
  const bea = await mesas.sentarse(codigo, 'Bea');
  const lizaDeLaMesa: LasLizas = { sePuedeLidiar: (a) => a === 'lindes', lizaDeLaMesa: () => juguete([abierta.silla.id, bea.id]) };
  const despedidas: string[] = [];
  mesas.ponerLaDespedida((senal) => despedidas.push(senal));
  const canal = liza.montarLaLiza(servidor, { produccion: false, extra: [] }, { lizas: lizaDeLaMesa, motor: motor.puerta, registrar: (l) => registro.push(l) });
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', () => r()));
  const puerto = (servidor.address() as AddressInfo).port;
  const ana = new ClienteDeVerdad(puerto, rutaDeLaLiza(codigo));
  const otra = new ClienteDeVerdad(puerto, rutaDeLaLiza(codigo));
  await Promise.all([ana.abierto, otra.abierto]);
  ana.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: abierta.silla.llave, c: 0 });
  otra.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: bea.llave, c: 0 });
  await hasta(() => ana.de('dentro').length > 0 && otra.de('dentro').length > 0);
  comprobar('con la mesa de VERDAD, las dos llaves entran: `dentro` a cada una con su número', ana.de('dentro')[0]?.yo === 1 && otra.de('dentro')[0]?.yo === 2, [ana.mensajes.slice(0, 2), otra.mensajes.slice(0, 2)]);
  const mala = new ClienteDeVerdad(puerto, rutaDeLaLiza(codigo));
  await mala.abierto;
  mala.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'no-es-de-nadie', c: 0 });
  await hasta(() => mala.cierre !== null);
  comprobar('y una llave que `mesas.ts` no reconoce: 4101', mala.cierre === CIERRE_DE_LA_LIZA.llaveMala, mala.cierre);

  const revAntes = (await mesas.mirar(codigo, null)).rev;
  motor.guion = (_s, _t, entradas) => (entradas.some((e) => e.tipo === 'aviso') ? { veredictos: [veredictoDeAusente(bea.id)] } : null);
  ana.decir({ t: 'aviso', clase: 1, objetivo: 0 });
  await hasta(() => {
    const v = canal.diagnostico().veredictos;
    return v.entro + v.rechazado + v.sinEfecto + v.fallos + v.apartado > 0;
  });
  motor.guion = () => null;
  const v = canal.diagnostico().veredictos;
  const revDespues = (await mesas.mirar(codigo, null)).rev;
  comprobar(
    'un veredicto de la sala llega a la mesa de verdad por la vía interna y vuelve contado (Las Lindes no lo conoce: sin efecto o rechazado, nunca un fallo)',
    v.fallos === 0 && v.rechazado + v.sinEfecto === 1 && revDespues === revAntes,
    { v, revAntes, revDespues },
  );
  const diag = await fetch(`http://127.0.0.1:${String(puerto)}${RUTA_DEL_DIAGNOSTICO}`);
  const d = (await diag.json().catch(() => ({}))) as { montado?: unknown; enSala?: unknown };
  comprobar('el diagnóstico del montaje dice `montado` y cuenta a las dos', d.montado === true && d.enSala === 2, d);

  const saludando = new ClienteDeVerdad(puerto, rutaDeLaLiza(codigo));
  await saludando.abierto;
  process.emit('SIGTERM', 'SIGTERM');
  await hasta(() => ana.cierre !== null && otra.cierre !== null && saludando.cierre !== null);
  comprobar('SIGTERM: 1001 a quien estaba dentro y a quien aún saludaba —delante de la despedida de la mesa—', ana.cierre === 1001 && otra.cierre === 1001 && saludando.cierre === 1001, [ana.cierre, otra.cierre, saludando.cierre]);
  comprobar('diciéndoles antes por qué, con un `fuera` legible', ana.de('fuera').length === 1 && otra.de('fuera').length === 1);
  comprobar('y la despedida de la mesa sigue su camino, UNA vez: la de la Liza no la ha pisado', despedidas.length === 1 && despedidas[0] === 'SIGTERM', despedidas);
  const tarde = new ClienteDeVerdad(puerto, rutaDeLaLiza(codigo));
  await hasta(() => tarde.cierre !== null);
  comprobar('quien llega después no entra: 1001', tarde.cierre === 1001, tarde.cierre);
  for (const c of [ana, otra, mala, saludando, tarde]) c.ws.terminate();
  servidor.closeAllConnections();
  await Promise.race([new Promise<void>((r) => servidor.close(() => r())), dormir(2000)]);
}

paso('C2 · La Liza es genérica, y su montaje es una línea');
{
  const carpeta = path.join(REPO, 'server', 'src', 'liza');
  const ficheros = fs.readdirSync(carpeta).filter((f) => f.endsWith('.ts'));
  const NOMBRES_DE_JUEGO =
    /\b(quiebr\w*|celador\w*|prestad[oa]s?|esquirlas?|desvelad[oa]s?|durmientes?|remanso|glorieta|tandas?|gabardina|cabinas?|estampad\w*|acometid\w*|rachas?|r[ée]plicas?|empell[oó]n\w*|desaloj\w*|trasvase|vig[ií]as?|monedas?|oleadas?|aver[ií]as?|retoques?|contramedidas?|foco|aguante|noches?|glifos?|graf[ií]a)\b/i;
  const nombran: string[] = [];
  const importan: string[] = [];
  for (const f of ficheros) {
    const texto = fs.readFileSync(path.join(carpeta, f), 'utf8');
    const m = NOMBRES_DE_JUEGO.exec(texto);
    if (m !== null) nombran.push(`${f}: «${m[0]}»`);
    for (const imp of texto.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const donde = imp[1] as string;
      if (donde.includes('arcade/juegos/') && !donde.endsWith('arcade/juegos/lizas')) importan.push(`${f}: ${donde}`);
    }
  }
  comprobar('se miran los cuatro ficheros de server/src/liza', ficheros.length === 4, ficheros);
  comprobar('ninguno dice el vocabulario de un juego, ni en los comentarios', nombran.length === 0, nombran);
  comprobar('ninguno importa de los juegos salvo el registro de lizas', importan.length === 0, importan);
  const indice = fs.readFileSync(path.join(REPO, 'server', 'src', 'index.ts'), 'utf8');
  const montajes = [...indice.matchAll(/^montarLaLiza\(servidorHttp, contextoDelCors\);$/gm)];
  const botas = indice.indexOf('montarElCanalDeBotas(servidorHttp, contextoDelCors);');
  comprobar(
    '`index.ts` monta la Liza con UNA línea, junto al canal de botas',
    montajes.length === 1 && botas >= 0 && (montajes[0]?.index ?? -1) > botas && indice.split('montarLaLiza').length - 1 === 2,
    { montajes: montajes.length, botas },
  );
}

// ===========================================================================
// D · DE PUNTA A PUNTA: EL SERVIDOR DE VERDAD, UNA MESA DE EL QUIEBRO Y ROBOTS
// ===========================================================================

if (SIN_SERVIDOR) {
  nota('(--sin-servidor: el bloque D no se corre; esto NO es un verde)');
  terminar({ escritas: ESCRITAS });
}

/*
 * ═══ D · DE PUNTA A PUNTA (LENTO: un arranque, una Bajada, una oleada jugada y un rearranque) ═══
 *
 * El servidor de verdad, como hijo —`index.ts` con `tsx`, un puerto que da el sistema, `MESAS_DIR` y
 * `UPLOADS_DIR` temporales, entorno explícito—, y El Quiebro por su puerta de siempre:
 *
 *   1. El diagnóstico de la Liza está en su ruta y el servidor arrancó sin salas ni temporizador.
 *   2. Se abre una mesa de El Quiebro por HTTP (`POST /api/arcade/mesas`), se sienta un segundo, y se
 *      empieza con la opción que ofrece la propia mesa.
 *   3. Una llave mala cierra con 4101; la ruta de botas sigue siendo de botas (su canal contesta con SU
 *      código: la mesa es `normal`); una ruta de nadie, 404.
 *   4. Bajan dos robots por `ws` (el de `medir-liza.ts`: andan, quiebran cuando les anuncian un golpe y
 *      golpean lo que tienen a tiro) y les llegan `dentro`, fotos y `tic`, todo legible.
 *   5. Uno salta treinta unidades de golpe: le llega `corrige` con su `n` y su último sitio bueno, vuelve
 *      ahí, y lo que anda después se acepta.
 *   6. La sala hace vencer el reloj de la Bajada: `arcade:reloj` entra en la mesa —la revisión sube y
 *      la vista pasa a la oleada— y la sala se entera sola y saca entidades.
 *   7. A media oleada se MATA el servidor (sin despedida: un fallo, no un despliegue) y se levanta otro
 *      con la misma carpeta: los robots vuelven a entrar y la sala RENACE de la mesa en la misma fase —la
 *      misma clave, el encuentro desde su principio, entidades otra vez—.
 *   8. Y se juega hasta que la oleada acaba —vaciada, o aguantada cuando vence su reloj—: `arcade:ronda`
 *      entra en la mesa (la revisión sube y la vista pasa a la pausa con los puntos de la ronda). Ana
 *      golpea y sus golpes dan; y Bea, que tras renacer sólo quiebra, quiebra limpio alguna vez. Y lo
 *      que dice que el desfase de la E/S está bien: cada golpe contra ella le llega con la antelación que
 *      declara, en SU reloj (quebrar limpio no lo dice: el robot pulsa contra lo que le llega).
 */
paso('D · De punta a punta: el servidor de verdad, una mesa de El Quiebro y robots por `ws` (LENTO)');
{
  const lizasDeVerdad = await import('../../shared/arcade/juegos/lizas');
  const vistaDelQuiebro = await import('../../shared/arcade/juegos/quiebro-vista');
  const botas = await import('../../shared/mecanicas/canal-de-botas');
  const { RobotDeLaLiza } = await import('./medir-liza');
  const ARCADE = 'quiebro';

  if (!comprobar('El Quiebro está en el registro de lizas (`FILAS_DE_LIZAS`)', lizasDeVerdad.sePuedeLidiar(ARCADE), lizasDeVerdad.arcadesQueSeLidian())) {
    terminar({ escritas: ESCRITAS });
  }

  const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
  const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), 'liza-de-punta-'));
  const puerto = await new Promise<number>((resolver, rechazar) => {
    const sonda = http.createServer();
    sonda.once('error', rechazar);
    sonda.listen(0, '127.0.0.1', () => {
      const donde = sonda.address() as AddressInfo;
      sonda.close(() => resolver(donde.port));
    });
  });
  const BASE = `http://127.0.0.1:${String(puerto)}`;
  let dicho = '';
  let hijo: ChildProcess | null = null;
  const vivos: WebSocket[] = [];
  const latidos: NodeJS.Timeout[] = [];

  const levantar = (): ChildProcess => {
    const p = spawn(process.execPath, [TSX, SERVIDOR], {
      cwd: CARPETA,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        PORT: String(puerto),
        NODE_ENV: 'test',
        MESAS_DIR: path.join(CARPETA, 'mesas'),
        UPLOADS_DIR: path.join(CARPETA, 'subidas'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    p.stdout?.on('data', (d: Buffer) => (dicho += d.toString()));
    p.stderr?.on('data', (d: Buffer) => (dicho += d.toString()));
    return p;
  };
  const esperarAlServidor = async (): Promise<boolean> => {
    for (let i = 0; i < 240; i++) {
      try {
        if ((await fetch(`${BASE}/api/salud`)).ok) return true;
      } catch {
        /* todavía no escucha */
      }
      await dormir(250);
    }
    return false;
  };
  const matar = async (): Promise<void> => {
    const p = hijo;
    hijo = null;
    if (p === null || p.exitCode !== null || p.signalCode !== null) return;
    await new Promise<void>((r) => {
      p.once('exit', () => r());
      p.kill();
    });
  };
  const pedir = async (ruta: string, o: { metodo?: string; cuerpo?: unknown; llave?: string } = {}): Promise<{ estado: number; datos: unknown }> => {
    const r = await fetch(`${BASE}${ruta}`, {
      method: o.metodo ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(o.llave === undefined ? {} : { 'x-asiento': o.llave }) },
      ...(o.cuerpo === undefined ? {} : { body: JSON.stringify(o.cuerpo) }),
    });
    const texto = await r.text();
    let datos: unknown = texto;
    try {
      datos = JSON.parse(texto);
    } catch {
      /* no era JSON */
    }
    return { estado: r.status, datos };
  };
  interface MesaDeLaRuta {
    codigo: string;
    rev: number;
    vista: unknown;
    opciones: { tipo: string; carga?: unknown }[];
  }
  const laMesa = async (codigo: string, llave?: string): Promise<MesaDeLaRuta | null> => {
    const r = await pedir(`/api/arcade/mesas/${codigo}`, llave === undefined ? {} : { llave });
    return r.estado === 200 ? (r.datos as { mesa: MesaDeLaRuta }).mesa : null;
  };
  const faseDe = (m: MesaDeLaRuta | null): string => {
    const v = m === null ? null : vistaDelQuiebro.leerVistaDelQuiebro(m.vista);
    if (v === null) return 'ilegible';
    return v.fase.tipo === 'oleada' || v.fase.tipo === 'pausa' ? `${v.fase.tipo}${String(v.fase.oleada)}` : v.fase.tipo;
  };
  const diagnostico = async (): Promise<Record<string, unknown>> => (await pedir('/api/arcade/liza/diagnostico')).datos as Record<string, unknown>;

  try {
    hijo = levantar();
    const arranco = await esperarAlServidor();
    if (!comprobar('el servidor de verdad arranca con la Liza montada', arranco, dicho.slice(-1500))) throw new Error('no arrancó');

    /* 1 · El diagnóstico. */
    const d0 = await diagnostico();
    comprobar(
      'su diagnóstico está en `/api/arcade/liza/diagnostico`, montado, sin salas y con el temporizador parado',
      d0.montado === true && d0.salas === 0 && d0.temporizador === false,
      d0,
    );
    comprobar('y el arranque lo dice', dicho.includes('[liza] canal en /api/arcade/mesas/:codigo/liza'), dicho.slice(-800));

    /* 2 · La mesa. */
    const abierta = await pedir('/api/arcade/mesas', { metodo: 'POST', cuerpo: { arcade: ARCADE, nombre: 'Ana', plazoSegundos: 300 } });
    const datosAbierta = abierta.datos as { codigo?: string; llave?: string };
    const codigo = datosAbierta.codigo ?? '';
    const llaveAna = datosAbierta.llave ?? '';
    if (!comprobar('se abre una mesa de El Quiebro por HTTP', abierta.estado === 201 && codigo.length > 0, abierta)) throw new Error('sin mesa');
    const sentada = await pedir(`/api/arcade/mesas/${codigo}/asientos`, { metodo: 'POST', cuerpo: { nombre: 'Bea' } });
    const llaveBea = (sentada.datos as { llave?: string }).llave ?? '';
    comprobar('y se sienta una segunda', sentada.estado === 200 && llaveBea.length > 0, sentada);
    const reunida = await laMesa(codigo, llaveAna);
    const empezar = reunida?.opciones.find((o) => o.tipo === vistaDelQuiebro.MOVIMIENTO_DEL_QUIEBRO.empezar);
    const empezada = await pedir(`/api/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: llaveAna,
      cuerpo: { rev: reunida?.rev ?? 0, tipo: vistaDelQuiebro.MOVIMIENTO_DEL_QUIEBRO.empezar, carga: empezar?.carga ?? null },
    });
    comprobar('y se empieza con la opción que ofrece la mesa: la noche baja', empezada.estado === 200 && faseDe(await laMesa(codigo)) === 'bajada', { empezada: empezada.estado, fase: faseDe(await laMesa(codigo)) });

    /* La liza de los robots: la MISMA función que el servidor, sobre la vista de espectador. */
    const declarada: { liza: LizaDeclarada | null } = { liza: null };
    const ponerAlDia = async (): Promise<void> => {
      const m = await laMesa(codigo);
      if (m !== null) declarada.liza = lizasDeVerdad.lizaDeLaMesa(ARCADE, m.vista, codigo);
    };
    await ponerAlDia();
    latidos.push(setInterval(() => void ponerAlDia().catch(() => undefined), 500));
    const primera = declarada.liza;
    comprobar('el registro de verdad saca la liza de la mesa, y es válida', primera !== null && problemasDeLaDeclaracion(primera).length === 0, primera === null ? null : problemasDeLaDeclaracion(primera).slice(0, 3));

    /* 3 · Llave mala, la ruta de botas y la de nadie. */
    const mala = new ClienteDeVerdad(puerto, rutaDeLaLiza(codigo));
    await mala.abierto;
    mala.decir({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'no-es-de-nadie', c: 0 });
    await hasta(() => mala.cierre !== null, 5000);
    comprobar('una llave que no es de la mesa: 4101, con su `fuera`', mala.cierre === CIERRE_DE_LA_LIZA.llaveMala && mala.de('fuera').length === 1, mala.cierre);
    const deBotas = new WebSocket(`ws://127.0.0.1:${String(puerto)}${botas.rutaDelCanal(codigo)}`, { handshakeTimeout: 5000 });
    vivos.push(deBotas);
    let cierreDeBotas: number | null = null;
    deBotas.on('close', (c) => (cierreDeBotas = c));
    deBotas.on('error', () => {});
    const abreBotas = await new Promise<boolean>((r) => {
      deBotas.once('open', () => r(true));
      deBotas.once('unexpected-response', () => r(false));
      deBotas.once('error', () => r(false));
    });
    if (abreBotas) deBotas.send(JSON.stringify({ t: 'hola', v: botas.VERSION_DEL_CANAL, llave: llaveAna }));
    await hasta(() => cierreDeBotas !== null, 5000);
    comprobar(
      'la ruta de botas sigue siendo de botas: abre, y su canal contesta con SU código (la mesa es `normal`: 4002)',
      abreBotas && cierreDeBotas === botas.CIERRE.mesaQueNo,
      { abreBotas, cierreDeBotas },
    );
    const nadie = new ClienteDeVerdad(puerto, `/api/arcade/mesas/${codigo}/nadie`);
    await nadie.abierto;
    comprobar('y una ruta de nadie, 404', nadie.rechazo === 404, nadie.rechazo);
    vivos.push(mala.ws, nadie.ws);

    /* 4 · Los robots. */
    const bajarUnRobot = (
      llave: string,
      golpea = true,
    ): { robot: InstanceType<typeof RobotDeLaLiza>; ws: WebSocket; cierre: () => number | null } => {
      const ws = new WebSocket(`ws://127.0.0.1:${String(puerto)}${rutaDeLaLiza(codigo)}`, { handshakeTimeout: 5000 });
      vivos.push(ws);
      let cierre: number | null = null;
      const robot = new RobotDeLaLiza({
        llave,
        golpea,
        reloj: () => performance.now(),
        liza: () => declarada.liza,
        mandar: (texto) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(texto);
        },
      });
      ws.on('open', () => robot.abrir());
      ws.on('message', (d) => robot.recibir(d.toString()));
      ws.on('close', (c) => {
        cierre = c;
        robot.dentro = false;
      });
      ws.on('error', () => {});
      latidos.push(setInterval(() => robot.latir(), 20));
      return { robot, ws, cierre: () => cierre };
    };
    const ana = bajarUnRobot(llaveAna);
    const bea = bajarUnRobot(llaveBea);
    await hasta(() => ana.robot.dentro && bea.robot.dentro && ana.robot.cuentas.fotos > 0 && bea.robot.cuentas.fotos > 0 && ana.robot.cuentas.tics > 0 && bea.robot.cuentas.tics > 0, 8000);
    comprobar(
      'los dos robots entran: `dentro` con su número, fotos y `tic`',
      ana.robot.yo === 1 && bea.robot.yo === 2 && ana.robot.cuentas.fotos > 0 && bea.robot.cuentas.fotos > 0 && bea.robot.cuentas.tics > 0,
      { ana: ana.robot.cuentas, bea: bea.robot.cuentas },
    );
    comprobar(
      'y todo lo que les llega —y les llega algo— se lee con el lector estricto',
      ana.robot.cuentas.bytesBajados > 0 && bea.robot.cuentas.bytesBajados > 0 && ana.robot.cuentas.ilegibles === 0 && bea.robot.cuentas.ilegibles === 0,
      { ana: ana.robot.cuentas.bytesBajados, bea: bea.robot.cuentas.bytesBajados },
    );
    comprobar('el primer suceso de la fase les dice dónde están', ana.robot.fase.length > 0 && ana.robot.fase === bea.robot.fase, [ana.robot.fase, bea.robot.fase]);

    /* 5 · Una corrección que corrige. */
    await dormir(600);
    const antesDelSalto = { x: ana.robot.x, z: ana.robot.z };
    const corregidasAntes = ana.robot.corregidos.length;
    ana.robot.saltar(u(30), 0);
    await hasta(() => ana.robot.corregidos.length > corregidasAntes, 3000);
    const correccion = ana.robot.corregidos[corregidasAntes];
    comprobar(
      'un salto de treinta unidades: `corrige` al último sitio bueno (donde estaba antes de saltar)',
      correccion !== undefined && Math.abs(correccion.x - antesDelSalto.x) <= u(0.5) && Math.abs(correccion.z - antesDelSalto.z) <= u(0.5),
      { correccion, antesDelSalto },
    );
    const tras = ana.robot.corregidos.length;
    const aquisAntes = ana.robot.ultimoAqui?.n ?? -1;
    await dormir(1500);
    comprobar(
      'y desde ahí sigue mandando sus pasos sin que le vuelvan a corregir',
      correccion !== undefined && (ana.robot.ultimoAqui?.n ?? -1) > aquisAntes + 10 && ana.robot.corregidos.length === tras && ana.robot.fuera === null,
      { nuevas: ana.robot.corregidos.slice(tras), aquis: [aquisAntes, ana.robot.ultimoAqui?.n] },
    );

    /* 6 · La Bajada vence: `arcade:reloj` entra en la mesa, y la sala se entera sola. */
    const revEnLaBajada = (await laMesa(codigo))?.rev ?? -1;
    let enOleada = false;
    for (let i = 0; i < 60 && !enOleada; i++) {
      await dormir(250);
      enOleada = faseDe(await laMesa(codigo)).startsWith('oleada');
    }
    const trasLaBajada = await laMesa(codigo);
    comprobar(
      'la sala hace vencer la Bajada: su `arcade:reloj` entra en la mesa —sube la revisión y la vista pasa a la oleada—',
      enOleada && (trasLaBajada?.rev ?? -1) > revEnLaBajada,
      { fase: faseDe(trasLaBajada), rev: trasLaBajada?.rev, antes: revEnLaBajada },
    );
    await hasta(() => (ana.robot.cuentas.sucesos.nace ?? 0) > 0, 15000);
    const claveDeLaOleada = ana.robot.fase;
    comprobar('y la sala se entera sola: fase nueva por el canal y entidades que nacen', (ana.robot.cuentas.sucesos.nace ?? 0) > 0 && claveDeLaOleada.length > 0, ana.robot.cuentas.sucesos);

    /* 7 · A media oleada, el servidor se muere; otro renace de la mesa. */
    await dormir(1500);
    const revAntesDeMorir = (await laMesa(codigo))?.rev ?? -1;
    const faseAntesDeMorir = faseDe(await laMesa(codigo));
    await matar();
    await hasta(() => ana.cierre() !== null && bea.cierre() !== null, 5000);
    comprobar(
      'matado el servidor, los canales que estaban dentro se caen sin despedida (1006)',
      ana.robot.cuentas.dentros > 0 && bea.robot.cuentas.dentros > 0 && ana.cierre() === 1006 && bea.cierre() === 1006,
      [ana.cierre(), bea.cierre()],
    );
    hijo = levantar();
    comprobar('otro servidor arranca en el mismo puerto y con la misma carpeta', await esperarAlServidor(), dicho.slice(-800));
    const trasRenacer = await laMesa(codigo);
    comprobar('la mesa sigue donde estaba: la misma fase y la misma revisión', faseDe(trasRenacer) === faseAntesDeMorir && trasRenacer?.rev === revAntesDeMorir, {
      fase: faseDe(trasRenacer),
      antes: faseAntesDeMorir,
    });
    const ana2 = bajarUnRobot(llaveAna);
    /*
     * Tras renacer, Bea SÓLO QUIEBRA: si las dos golpearan, casi todo golpe contra ellas se quedaría
     * «cortado» (su autor cae antes del impacto) y el juicio de la esquiva —que es lo que mide si el
     * desfase de la E/S está bien— apenas se vería. Ana golpea por las dos.
     */
    const bea2 = bajarUnRobot(llaveBea, false);
    await hasta(() => ana2.robot.dentro && bea2.robot.dentro && (ana2.robot.cuentas.sucesos.nace ?? 0) > 0, 15000);
    comprobar(
      'los robots vuelven a entrar y la sala RENACE en la misma fase: la misma clave, y entidades otra vez',
      ana2.robot.dentro && bea2.robot.dentro && ana2.robot.fase === claveDeLaOleada && (ana2.robot.cuentas.sucesos.nace ?? 0) > 0,
      { clave: ana2.robot.fase, antes: claveDeLaOleada, sucesos: ana2.robot.cuentas.sucesos },
    );
    const d1 = await diagnostico();
    comprobar('el diagnóstico del servidor nuevo: una sala, dos dentro, el temporizador en marcha', d1.salas === 1 && d1.enSala === 2 && d1.temporizador === true, d1);
    /* La declaración de la oleada, para saber luego cuánta antelación declara cada golpe. */
    const lizaDeLaOleada = declarada.liza;

    /*
     * 8 · Se juega hasta que la oleada acaba: `arcade:ronda` entra en la mesa. Acaba vaciándola o, si no,
     * cuando vence el reloj del encuentro (`aguantada`): se espera lo que declara ese reloj, contado desde
     * que la sala renació, y veinte segundos más. Así el veredicto se mira aunque los robots no la vacíen.
     */
    const revAntesDeLaRonda = (await laMesa(codigo))?.rev ?? -1;
    const relojDelEncuentro = (declarada.liza?.fase.encuentro?.relojTics ?? 3000) * MS_POR_TIC;
    const hastaLaRonda = Date.now() + relojDelEncuentro + 20_000;
    let enPausa = false;
    while (!enPausa && Date.now() < hastaLaRonda) {
      await dormir(250);
      enPausa = faseDe(await laMesa(codigo)).startsWith('pausa');
    }
    const trasLaRonda = await laMesa(codigo);
    const vistaTras = vistaDelQuiebro.leerVistaDelQuiebro(trasLaRonda?.vista);
    const d2 = await diagnostico();
    comprobar(
      'los robots acaban la oleada y su `arcade:ronda` entra en la mesa: sube la revisión y la vista pasa a la pausa',
      enPausa && (trasLaRonda?.rev ?? -1) > revAntesDeLaRonda && ((d2.veredictos as { entro?: number } | undefined)?.entro ?? 0) >= 1,
      { fase: faseDe(trasLaRonda), rev: trasLaRonda?.rev, d2: d2.veredictos, robots: [ana2.robot.cuentas, bea2.robot.cuentas] },
    );
    comprobar(
      'con lo que se jugó dentro: la ronda trae puntos a la mesa',
      vistaTras !== null && vistaTras.asientos.some((a) => a.puntos > 0),
      vistaTras?.asientos.map((a) => ({ puntos: a.puntos, contadores: a.contadores })),
    );
    comprobar(
      'los robots golpean y sus golpes dan, sin un mensaje ilegible en toda la oleada',
      ana2.robot.cuentas.golpesQueDieron + bea2.robot.cuentas.golpesQueDieron > 0 &&
        ana2.robot.cuentas.ilegibles + bea2.robot.cuentas.ilegibles === 0,
      [ana2.robot.cuentas, bea2.robot.cuentas],
    );
    const juicio = (c: typeof bea2.robot.cuentas): Record<string, number> => ({
      anuncios: c.anunciosContraMi,
      pulsadas: c.esquivasPulsadas,
      limpias: c.limpias,
      esquivadas: c.esquivadas,
      dieron: c.meDieron,
      fallaron: c.fallaronContraMi,
      cortadas: c.cortadas,
      antelacionMinima: c.antelaciones.length === 0 ? NaN : Math.min(...c.antelaciones),
    });
    comprobar(
      'y los enemigos les atacan y quien sólo quiebra quiebra limpio alguna vez: el anillo llega a tiempo en SU reloj',
      bea2.robot.cuentas.anunciosContraMi > 0 && bea2.robot.cuentas.limpias > 0,
      { bea: juicio(bea2.robot.cuentas), ana: juicio(ana2.robot.cuentas) },
    );
    /*
     * EL DESFASE, MEDIDO. Quebrar limpio no lo mide: el robot pulsa contra el instante que le llega, y
     * con un desfase torcido en doscientos milisegundos seguiría quebrando (revisión del frente). Lo que
     * sí lo mide es la ANTELACIÓN: cada golpe contra Bea le tiene que llegar con la que declara —sus
     * `anuncioTics`, más el `comp` si la liza alarga con la red—, menos lo que tardó en viajar por el bucle
     * local. Un desfase mal calculado la corre entera: la primera pasada lo vio con 400 ms de más, 1.135 en
     * vez de unos 720. Los de la puesta al día no cuentan: son golpes que ya estaban en vuelo.
     */
    const alarga = lizaDeLaOleada?.turnos.alargarConLaRed === true;
    const compTope = Math.ceil((lizaDeLaOleada?.red.compTopeMs ?? 0) / MS_POR_TIC);
    const ticsDe = (acc: number): number[] => {
      const tics: number[] = [];
      for (const c of lizaDeLaOleada?.clases ?? []) for (const a of c.acciones) if (a.id === acc) tics.push(a.anuncioTics);
      return tics;
    };
    const juzgados = bea2.robot.cuentas.anunciosRecibidos
      .filter((a) => a.trasDentro > 500)
      .map((a) => {
        const tics = ticsDe(a.acc);
        const bien = tics.some((k) => a.antelacion >= k * MS_POR_TIC - 200 && a.antelacion <= (k + (alarga ? compTope : 0)) * MS_POR_TIC + 100);
        return { ...a, tics, bien };
      });
    const torcidos = juzgados.filter((j) => !j.bien);
    comprobar(
      'y cada golpe contra ella le llega con la antelación que declara (sus `anuncioTics`, más el `comp` si alarga): el desfase de la E/S es el bueno',
      juzgados.length > 0 && torcidos.length === 0,
      { juzgados: juzgados.length, torcidos: torcidos.slice(0, 5), alarga, compTope },
    );
    comprobar('y el servidor no ha dicho ninguna llave', !dicho.includes(llaveAna) && !dicho.includes(llaveBea));
  } catch (error) {
    comprobar('el bloque de punta a punta llega al final', false, `${error instanceof Error ? error.message : String(error)}\n${dicho.slice(-1500)}`);
  } finally {
    for (const t of latidos) clearInterval(t);
    for (const ws of vivos) ws.terminate();
    await matar();
    try {
      fs.rmSync(CARPETA, { recursive: true, force: true });
    } catch {
      /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
    }
  }
}

try {
  fs.rmSync(CARPETA_DE_MESAS, { recursive: true, force: true });
} catch {
  /* ídem */
}

terminar({
  escritas: ESCRITAS,
  enVerde:
    'La E/S de la Liza: el saludo con su ping, la red medida antes de entrar, el desfase exacto, el `eco`\n' +
    '  que no se contesta sin sala, lo que entra y lo que sale de cada paso en su orden, la foto una vez, los\n' +
    '  `tic` partidos, los veredictos en cadena por mesa, la mesa una vez por segundo y lo que cuesta leerla,\n' +
    '  la sala que se rehace si cambian los asientos, el aforo, el ancla, la gracia, el cubo por el reloj del\n' +
    '  aparato, los cierres; el enchufe y el diagnóstico con `ws` de verdad; la sala, la mesa y el registro\n' +
    '  de verdad con quien se sienta tarde; el montaje con SIGTERM; y de punta a punta, El Quiebro jugado por\n' +
    '  robots con un servidor que se muere a media oleada y renace de la mesa, y el desfase medido.',
});
