/**
 * LA SALA DE BOOTS ON BOARD, EN PROCESO: las reglas de tiempo con un reloj de mentira.
 *
 *   npm run verify:sala-de-botas
 *
 * ═══ POR QUÉ EN PROCESO, Y NO SÓLO CON EL SERVIDOR DE VERDAD ═══
 *
 * Porque las reglas del canal son de TIEMPO —cinco segundos para decir `hola`, un segundo de
 * presupuesto, sesenta de «quieto», cinco de gracia, veinticinco mensajes por segundo— y con el
 * reloj de pared una prueba de «quieto» tarda un minuto y sale distinta según lo ocupada que esté
 * la máquina. Aquí el reloj lo mueve la prueba (`RelojDeMentira`), los enchufes son de mentira y
 * apuntan todo lo que se les dice, y la mesa es una tabla: sesenta segundos pasan en un
 * milisegundo y pasan siempre igual. Lo que esto no ve —el `upgrade` de verdad, `ws`, la mesa de
 * verdad, el arranque— lo ve `verify:botas`, que levanta el servidor.
 *
 * TODO LO QUE MANDA EL SERVIDOR SE LEE CON `leerMensajeDelServidor`, el lector estricto del
 * aparato: un mensaje que el aparato no sabría leer es un fallo aunque la regla haya ido bien.
 *
 * ═══ LO QUE AFIRMA ═══
 *
 *   · El plazo del `hola`, lo primero que se dice, y la versión.
 *   · La entrada: llave mala, mesa normal, juego sin mundo, mesa sin tablero, mesa acabada; y la
 *     buena, con su sitio de nacer repartido por asiento y libre.
 *   · Un canal por asiento: el nuevo desbanca al viejo, que recibe `reemplazado`.
 *   · El presupuesto de distancia: correr se acepta, correr al doble acaba corregido, el tope de
 *     un segundo acumulado, el teletransporte.
 *   · La estructura: cruzar una pared se corrige; recortar la esquina de una caja en UN tic se
 *     admite por escuadra —y la recta sola no lo admitiría—; en dos tics, no.
 *   · Tras una corrección, lo que venía de camino se calla un segundo y luego se repite.
 *   · El tic viejo o repetido se ignora; el cubo de mensajes; los mal formados.
 *   · Quieto sesenta segundos: fuera. Moverse reinicia la cuenta.
 *   · Quien se va no sale de la sala: sigue en la foto donde se quedó, y vuelve ahí aunque tarde.
 *   · La foto: cada dos tics, LA MISMA cadena a todos —con TODOS los sentados, bajen o no—, y al
 *     atascado se le salta.
 *   · El temporizador: UNO para todas las salas, y parado sin salas.
 *   · EL MUNDO QUE CAMBIA DEBAJO DE ALGUIEN: una caja nueva encima, o el suelo que se va, y se le
 *     saca al sitio libre más cercano con un `corrige`. Sin eso, el servidor le dejaría clavado.
 *   · Mesa cerrada, mesa olvidada, `SIGTERM`: fuera todos, con su código.
 *   · LA REFRIEGA, con su caso que no debe pasar al lado de cada regla: el golpe va a su manejador y
 *     ya no envenena la foto; `lanza` y `da` a toda la sala; la recarga desde el último ACEPTADO y el
 *     tic que crece; fuera de alcance, fuera del cono, a la espalda y con muro en medio, no da; al más
 *     cercano, uno solo, y si ése tiene un muro, al siguiente; el rebobinado de 250 ms, y no uno más;
 *     tres golpes y `cae`, el caído que ni anda ni golpea ni recibe, `renace` a los cinco segundos
 *     lejos de quien lo tumbó (el suyo, el siguiente libre y lejano, o el más lejano), el intocable,
 *     y `vidas` al entrar y al volver.
 *   · NADIE ES INMUNE POR NO BAJAR: a quien nunca abrió su canal y a quien lo cerró se le golpea, se
 *     le tumba, renace y se le pide botín; y la sala que se vacía se borra, pero su libro de botines no.
 *   · LOS TOPES DEL BOTÍN, con la mesa de mentira contestando lo que se le pide: una vez por pareja y
 *     minuto —en su sentido—, seis por mesa y minuto, y sólo cuenta lo que ENTRA; cada salida contada.
 *   · El canal atascado: `corrige` y `lanza` se saltan; `da` y `dentro` cierran con `atascado`.
 *   · Y paseos LEGALES de verdad —`pasoDelTic` sobre Las Lindes llenas y sobre el Burgo— no se
 *     corrigen, mientras que la recta sola sí los habría corregido.
 *   · LA VÍA INTERNA DE LA MESA (`meterDeLaPlataforma`), con mesas de verdad de los tres juegos: el
 *     botín entra, sale sin efecto o se rechaza, y la mesa terminada, el arcade apartado y la mesa que
 *     no existe se dicen; el diario lo guarda en nombre de nadie, el plazo entra antes, y ni un tipo de
 *     juego ni el tic pasan por ella, ni el botín por `mover`.
 *   · Y AL FINAL, CON EL MONTAJE DE VERDAD: `montarElCanalDeBotas` sobre un servidor HTTP de este
 *     proceso, la mesa de verdad (`mesas.ts`, con su carpeta temporal) y dos aparatos por `ws`, que se
 *     tumban por el cable y cuyo botín llega a la mesa de verdad por el respaldo de `botin.ts`; y la
 *     señal `SIGTERM` emitida aquí dentro, porque Windows no la entrega a un hijo —la técnica de
 *     `verify:mesa` para el volcado—: los canales se cierran con 1001 DENTRO de la despedida.
 */
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import {
  BOTIN_CADA_PAREJA_MS,
  CAIDO,
  CAIDO_MS,
  CIERRE,
  DE_PIE,
  GRACIA_AL_IRSE_MS,
  INTOCABLE,
  INTOCABLE_MS,
  leerMensajeDelServidor,
  MENSAJES_DE_GOLPE,
  PLAZO_DEL_HOLA_MS,
  QUIETO_HASTA_CERRAR_MS,
  REBOBINADO_MAXIMO_MS,
  RECARGA_DEL_GOLPE_MS,
  rutaDelCanal,
  VERSION_DEL_CANAL,
  VIDA_ENTERA,
} from '../../shared/mecanicas/canal-de-botas';
import type { MensajeDelServidor } from '../../shared/mecanicas/canal-de-botas';
import { pasoDelTic, RADIO_DEL_PASEANTE, rumboDeRadianes, TICS_POR_SEGUNDO } from '../../shared/mecanicas/andar';
import { deNumero, UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
/* Sólo el tipo: `mesas.ts` se carga a mano más abajo, cuando ya está puesta su carpeta. */
import type { SalidaDeLaPlataforma } from '../src/arcade/mesas';
import { movimientoDelBotin } from '../../shared/arcade/juegos/botin';
import { loQueSeVe } from '../../shared/arcade/juegos/lindes';
import { mundoDeLaMesa } from '../../shared/arcade/juegos/mundos';
import { ESPECTADOR, NADIE_SENTADO } from '../../shared/arcade/tipos';
import {
  abrirMesa as abrirMesaDelArbitro,
  cerrarMesa as cerrarMesaDelArbitro,
  meterDeLaPlataforma as meterEnElArbitro,
  MovimientoRechazado,
} from '../src/arcade/arbitro';
import {
  ATASCO_BYTES,
  CanalDeBotas,
  LEJOS_AL_RENACER,
  REBOBINADO_MS,
  RECORDAR_LA_CORRECCION_MS,
  seAndaElTramo,
  TOPE_DE_BOTINES_POR_MINUTO,
  TOPE_DEL_PRESUPUESTO,
  UN_TIC_CON_HOLGURA,
} from '../src/botas/canal';
import type { Conexion, Enchufe, LaMesa, LosMundos, Reloj, SalidaDelBotin, Temporizador } from '../src/botas/canal';
import { codigoDeLaRuta, enchufarElCanal, origenAdmitido } from '../src/botas/enchufe';
import { jugarLasLindes } from './robot-de-las-lindes';

/*
 * La carpeta de las mesas de la última parte, ANTES de que nada cargue `mesas.ts` —que la lee al
 * cargarse—: sin esto las mesas de prueba acabarían en la carpeta de datos del portátil. Nada de lo
 * importado arriba lo carga; la última parte lo importa a mano.
 */
const CARPETA_DE_MESAS = fs.mkdtempSync(path.join(os.tmpdir(), 'sala-de-botas-'));
process.env.MESAS_DIR = CARPETA_DE_MESAS;

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 600)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/** Deja correr las promesas pendientes: la entrada y la revisión de la mesa son asíncronas. */
async function vaciar(): Promise<void> {
  for (let i = 0; i < 3; i++) await new Promise<void>((r) => setImmediate(r));
}

// ---------------------------------------------------------------------------
// EL RELOJ, LOS ENCHUFES Y LA MESA, DE MENTIRA
// ---------------------------------------------------------------------------

/** Un reloj que sólo avanza cuando se le dice, y dispara los temporizadores en su orden. */
class RelojDeMentira implements Reloj {
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

  /** Cuántos temporizadores periódicos hay vivos. El canal tiene que tener uno o ninguno. */
  periodicos(): number {
    let n = 0;
    for (const p of this.pendientes.values()) if (p.cada !== null) n++;
    return n;
  }

  /**
   * Pasa `ms` milisegundos, disparando los temporizadores en su orden. Y después de CADA uno deja
   * correr lo asíncrono que haya soltado —la pregunta a la mesa—, como hace el bucle de eventos de
   * verdad entre un temporizador y el siguiente. Sin eso, una revisión que empieza en un tic no
   * acabaría nunca mientras la prueba no suelte el hilo, y se mediría otra cosa.
   */
  async avanzar(ms: number): Promise<void> {
    const fin = this.t + ms;
    for (;;) {
      let elegido: { id: number; cuando: number } | null = null;
      for (const [id, p] of this.pendientes) {
        if (p.cuando > fin) continue;
        if (elegido === null || p.cuando < elegido.cuando || (p.cuando === elegido.cuando && id < elegido.id)) {
          elegido = { id, cuando: p.cuando };
        }
      }
      if (elegido === null) break;
      const p = this.pendientes.get(elegido.id);
      if (p === undefined) break;
      this.t = p.cuando;
      if (p.cada === null) this.pendientes.delete(elegido.id);
      else p.cuando += p.cada;
      p.hacer();
      await new Promise<void>((r) => setImmediate(r));
    }
    this.t = fin;
  }
}

/** Un enchufe que apunta lo que se le manda y cómo se le cierra. */
class EnchufeDeMentira implements Enchufe {
  readonly textos: string[] = [];
  cierre: { codigo: number; razon: string } | null = null;
  atasco = 0;

  enviar(texto: string): void {
    if (this.cierre === null) this.textos.push(texto);
  }

  cerrar(codigo: number, razon: string): void {
    if (this.cierre === null) this.cierre = { codigo, razon };
  }

  pendientes(): number {
    return this.atasco;
  }

  /** Lo recibido, leído con el lector ESTRICTO del aparato. Un `null` es un mensaje ilegible. */
  mensajes(): (MensajeDelServidor | null)[] {
    return this.textos.map((t) => leerMensajeDelServidor(t));
  }

  de<T extends MensajeDelServidor['t']>(t: T): Extract<MensajeDelServidor, { t: T }>[] {
    return this.mensajes().filter((m): m is Extract<MensajeDelServidor, { t: T }> => m !== null && m.t === t);
  }

  ultimo<T extends MensajeDelServidor['t']>(t: T): Extract<MensajeDelServidor, { t: T }> | undefined {
    const todos = this.de(t);
    return todos[todos.length - 1];
  }

  ilegibles(): number {
    return this.mensajes().filter((m) => m === null).length;
  }

  /** Cuántas fotos traen el mismo asiento dos veces. El aparato las rechaza: tienen que ser cero. */
  fotosConAsientoRepetido(): number {
    return this.de('foto').filter((f) => new Set(f.p.map((e) => e[0])).size !== f.p.length).length;
  }
}

interface MesaDeMentira {
  arcade: string;
  rev: number;
  terminada: boolean;
  existe: boolean;
  modalidad: string;
  asientos: string[];
  llaves: Map<string, string>;
  mundo: MundoDeclarado | null;
  /**
   * Lo que contesta la mesa a cada botín que se le pide, en orden; cuando se acaba, `entro`. `lanza`
   * es una mesa que revienta al meterlo.
   */
  botines?: (SalidaDelBotin | 'lanza')[];
}

const MESAS = new Map<string, MesaDeMentira>();
let revisiones = 0;
let vistas = 0;

/** Los botines que el canal le ha pedido a la mesa de mentira, en orden. */
const BOTINES_PEDIDOS: { codigo: string; pierde: string; gana: string }[] = [];

const LA_MESA: LaMesa = {
  botin: async (codigo, pierde, gana) => {
    BOTINES_PEDIDOS.push({ codigo, pierde, gana });
    const salida = MESAS.get(codigo)?.botines?.shift() ?? 'entro';
    if (salida === 'lanza') throw new Error('la mesa de mentira revienta al meter el botín');
    return salida === 'rechazado' ? { salida, motivo: 'no juega esta partida' } : { salida };
  },
  quienEsLaLlave: async (codigo, llave) => {
    const m = MESAS.get(codigo);
    if (m === undefined || !m.existe) return null;
    const id = m.llaves.get(llave);
    return id === undefined ? null : { id, modalidad: m.modalidad };
  },
  revision: async (codigo) => {
    const m = MESAS.get(codigo);
    revisiones++;
    if (m === undefined || !m.existe) return null;
    return { rev: m.rev, terminada: m.terminada };
  },
  vista: async (codigo) => {
    const m = MESAS.get(codigo);
    vistas++;
    if (m === undefined || !m.existe) return null;
    return { arcade: m.arcade, rev: m.rev, terminada: m.terminada, asientos: [...m.asientos], vista: { mundo: m.mundo } };
  },
};

const RECORRIBLES = new Set(['prado', 'lindes', 'burgo']);
const LOS_MUNDOS: LosMundos = {
  sePuedeRecorrer: (arcade) => RECORRIBLES.has(arcade),
  mundoDeLaMesa: (_arcade, vista) => (vista as { mundo: MundoDeclarado | null }).mundo,
};

// ---------------------------------------------------------------------------
// EL MUNDO DE PRUEBA: UN PRADO CON UNA PARED Y UNA CAJA
// ---------------------------------------------------------------------------

/*
 * Cinco por cinco casillas de 16 unidades —de −40 a 40 en los dos ejes—, una PARED de dos
 * unidades de grueso en x ∈ [10, 12] que va de z = −30 a z = 30, y una CAJA en la esquina de
 * abajo a la izquierda, para recortarle la esquina. Tres sitios de nacer.
 */
const PARED: Cuerpo = { x0: 10, z0: -30, x1: 12, z1: 30 };
const CAJA: Cuerpo = { x0: -20, z0: -20, x1: -15, z1: -15 };
const CASILLAS: { x: number; y: number }[] = [];
for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) CASILLAS.push({ x, y });

function prado(extra: readonly Cuerpo[] = [], sinCasillas: readonly { x: number; y: number }[] = []): MundoDeclarado {
  return {
    lado: 16,
    pisables: CASILLAS.filter((c) => !sinCasillas.some((s) => s.x === c.x && s.y === c.y)),
    vados: [],
    cuerpos: [PARED, CAJA, ...extra],
    nace: [
      { x: 0, z: 0, rumbo: 0 },
      { x: 0, z: 6, rumbo: Math.PI },
      { x: -6, z: 0, rumbo: Math.PI / 2 },
    ],
  };
}

const ARENA_DEL_PRADO: Arena = arenaDe(prado());

let serie = 0;

/** Una mesa nueva, con sus asientos y sus llaves. Devuelve el código y las llaves por asiento. */
function mesaNueva(opciones: Partial<MesaDeMentira> & { asientos?: string[] } = {}): { codigo: string; llave: (a: string) => string } {
  serie++;
  const codigo = `PR${String(serie).padStart(3, '0')}`;
  const asientos = opciones.asientos ?? ['a-uno', 'a-dos', 'a-tres'];
  const llaves = new Map<string, string>();
  for (const a of asientos) llaves.set(`llave-${codigo}-${a}-secreta`, a);
  MESAS.set(codigo, {
    arcade: 'prado',
    rev: 1,
    terminada: false,
    existe: true,
    modalidad: 'botas',
    mundo: prado(),
    ...opciones,
    asientos,
    llaves,
  });
  return { codigo, llave: (a) => `llave-${codigo}-${a}-secreta` };
}

const LO_QUE_SE_REGISTRA: string[] = [];

function canalNuevo(): { canal: CanalDeBotas; reloj: RelojDeMentira } {
  const reloj = new RelojDeMentira();
  const canal = new CanalDeBotas({
    reloj,
    mesa: LA_MESA,
    mundos: LOS_MUNDOS,
    registrar: (linea) => LO_QUE_SE_REGISTRA.push(linea),
  });
  return { canal, reloj };
}

const j = (v: unknown): string => JSON.stringify(v);
const hola = (llave: string, v: number = VERSION_DEL_CANAL): string => j({ t: 'hola', v, llave });
const aqui = (n: number, x: number, z: number, r = 0, m: 0 | 1 | 2 = 2): string => j({ t: 'aqui', n, x, z, r, m });

interface Dentro {
  canal: CanalDeBotas;
  conexion: Conexion;
  enchufe: EnchufeDeMentira;
  x: number;
  z: number;
  n: number;
}

/** Abre un canal, dice `hola` y espera a estar dentro. */
async function entrar(canal: CanalDeBotas, codigo: string, llave: string): Promise<Dentro> {
  const enchufe = new EnchufeDeMentira();
  const conexion = canal.abrir(codigo, enchufe);
  conexion.recibir(hola(llave));
  await vaciar();
  const d = enchufe.ultimo('dentro');
  return { canal, conexion, enchufe, x: d?.x ?? NaN, z: d?.z ?? NaN, n: 0 };
}

type Resultado = 'aceptado' | 'corregido' | 'ignorado';

/**
 * Manda un paso —el siguiente tic— y dice qué fue de él. El servidor no contesta a lo que acepta,
 * así que se sabe por sus cuentas: aceptado, corregido (y entonces se va adonde dice el
 * `corrige`), o ignorado en silencio (y entonces no se mueve).
 */
function paso3(d: Dentro, x: number, z: number, m: 0 | 1 | 2 = 2): Resultado {
  const antes = d.canal.diagnostico().aceptados;
  const corriges = d.enchufe.de('corrige').length;
  d.n++;
  d.conexion.recibir(aqui(d.n, x, z, 0, m));
  if (d.enchufe.de('corrige').length > corriges) {
    const c = d.enchufe.ultimo('corrige');
    if (c !== undefined) {
      d.x = c.x;
      d.z = c.z;
    }
    return 'corregido';
  }
  if (d.canal.diagnostico().aceptados > antes) {
    d.x = x;
    d.z = z;
    return 'aceptado';
  }
  return 'ignorado';
}

/** Lo mismo, y `true` si lo corrigieron. */
function andar(d: Dentro, x: number, z: number, m: 0 | 1 | 2 = 2): boolean {
  return paso3(d, x, z, m) === 'corregido';
}

/** Lleva a alguien andando, en pasos de menos de un tic, hasta `(x, z)`. */
async function llevar(reloj: RelojDeMentira, d: Dentro, x: number, z: number): Promise<void> {
  const PASO = deNumero(0.9);
  for (let i = 0; i < 400 && (d.x !== x || d.z !== z); i++) {
    await reloj.avanzar(50);
    const dx = Math.max(-PASO, Math.min(PASO, x - d.x));
    const dz = Math.max(-PASO, Math.min(PASO, z - d.z));
    paso3(d, d.x + dx, d.z + dz);
  }
}

/** Dónde dice la última foto que está `asiento`, según `enchufe`. */
function enLaFoto(enchufe: EnchufeDeMentira, asiento: string): readonly [string, number, number, number, number] | undefined {
  return enchufe.ultimo('foto')?.p.find((e) => e[0] === asiento);
}

/** Un golpe de `d`, en su siguiente tic, mirando a `r`. */
function golpear(d: Dentro, r: number): void {
  d.n++;
  d.conexion.recibir(j({ t: 'golpe', n: d.n, r }));
}

/** El rumbo (0-255) que mira de `desde` hacia `hacia`. En coma flotante: esto es la prueba, no arbitra nada. */
function rumboHacia(desde: { x: number; z: number }, hacia: { x: number; z: number }): number {
  return rumboDeRadianes(Math.atan2(hacia.x - desde.x, -(hacia.z - desde.z)));
}

/** Cuántos mensajes de tipo `t` ha leído `enchufe`. */
function cuantos(enchufe: EnchufeDeMentira, t: MensajeDelServidor['t']): number {
  return enchufe.de(t).length;
}

/** El `vidas` más reciente que ha recibido `enchufe`, como mapa de asiento a `[vida, estado]`. */
function vidasEn(enchufe: EnchufeDeMentira): Map<string, readonly [number, number]> {
  return new Map((enchufe.ultimo('vidas')?.v ?? []).map((e) => [e[0], [e[1], e[2]] as const]));
}

const U = UNO;

/*
 * EL RUEDO, para la refriega: nueve por nueve casillas de 16 unidades —de −72 a 72—, sin nada en
 * medio salvo lo que ponga cada prueba, y cinco sitios de nacer. El primero en el centro, mirando al
 * norte; el segundo DOS unidades al norte del primero, mirando al sur —dentro del alcance y del cono
 * de quien nace en el primero—; y tres lejos, a sesenta.
 */
const CASILLAS_DEL_RUEDO: { x: number; y: number }[] = [];
for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) CASILLAS_DEL_RUEDO.push({ x, y });
const NACE_EN_EL_RUEDO = [
  { x: 0, z: 0, rumbo: 0 },
  { x: 0, z: -2, rumbo: Math.PI },
  { x: 60, z: 0, rumbo: 0 },
  { x: -60, z: 0, rumbo: 0 },
  { x: 0, z: 60, rumbo: 0 },
];
const ASIENTOS_DEL_RUEDO = ['r-uno', 'r-dos', 'r-tres', 'r-cuatro', 'r-cinco'];
function ruedo(cuerpos: readonly Cuerpo[] = []): MundoDeclarado {
  return { lado: 16, pisables: CASILLAS_DEL_RUEDO, vados: [], cuerpos: [...cuerpos], nace: NACE_EN_EL_RUEDO };
}

/*
 * EL CORRO, para los topes del botín: dos que golpean —en (0, 0) y en (20, 0)— y, alrededor de cada
 * uno, cuatro que no bajan nunca, a 2,4 unidades al norte, al este, al sur y al oeste. Mirando a uno,
 * los de al lado quedan a noventa grados: fuera del cono. Cada asiento nace en su sitio.
 */
const EN_EL_CORRO: readonly (readonly [string, number, number])[] = [
  ['c-a', 0, 0],
  ['c-z', 20, 0],
  ['a-n', 0, -2.4],
  ['a-e', 2.4, 0],
  ['a-s', 0, 2.4],
  ['a-o', -2.4, 0],
  ['z-n', 20, -2.4],
  ['z-e', 22.4, 0],
  ['z-s', 20, 2.4],
  ['z-o', 17.6, 0],
];
function corro(): MundoDeclarado {
  return { lado: 16, pisables: CASILLAS_DEL_RUEDO, vados: [], cuerpos: [], nace: EN_EL_CORRO.map(([, x, z]) => ({ x, z, rumbo: 0 })) };
}

// ---------------------------------------------------------------------------
// 1 · EL SALUDO
// ---------------------------------------------------------------------------

paso('El saludo: `hola` en cinco segundos, lo primero, y en esta versión');

{
  const { canal, reloj } = canalNuevo();
  const { codigo } = mesaNueva();

  const callado = new EnchufeDeMentira();
  canal.abrir(codigo, callado);
  await reloj.avanzar(PLAZO_DEL_HOLA_MS - 1);
  comprobar('quien no dice nada sigue abierto un milisegundo antes del plazo', callado.cierre === null, callado.cierre);
  await reloj.avanzar(1);
  comprobar(
    'y al cumplirse el plazo se le cierra con `sinHola` (4000)',
    callado.cierre?.codigo === CIERRE.sinHola,
    callado.cierre,
  );
  comprobar(
    'diciéndole antes POR QUÉ, con un `fuera` que el aparato sabe leer',
    callado.de('fuera').length === 1 && callado.textos.length === 1,
    callado.textos,
  );

  const conPrisa = new EnchufeDeMentira();
  canal.abrir(codigo, conPrisa).recibir(aqui(1, 0, 0));
  comprobar(
    'lo primero que dice es un `aqui`: `sinHola` en el acto, sin esperar al plazo',
    conPrisa.cierre?.codigo === CIERRE.sinHola,
    conPrisa.cierre,
  );

  const otraVersion = new EnchufeDeMentira();
  canal.abrir(codigo, otraVersion).recibir(hola('lo-que-sea', VERSION_DEL_CANAL + 1));
  comprobar(
    'un `hola` de otra versión del canal: `versionVieja` (4007) y no `sinHola`, y el motivo lo dice',
    otraVersion.cierre?.codigo === CIERRE.versionVieja && (otraVersion.ultimo('fuera')?.motivo ?? '').includes('versión'),
    otraVersion.textos,
  );
  comprobar(
    'y el diagnóstico lo cuenta aparte',
    canal.diagnostico().cierres.versionVieja === 1,
    canal.diagnostico().cierres,
  );

  const basura = new EnchufeDeMentira();
  canal.abrir(codigo, basura).recibir('{"t":"hola"');
  comprobar('lo primero es basura: `sinHola`', basura.cierre?.codigo === CIERRE.sinHola, basura.cierre);

  const binario = new EnchufeDeMentira();
  canal.abrir(codigo, binario).recibir(null);
  comprobar('lo primero es un marco binario: `sinHola`', binario.cierre?.codigo === CIERRE.sinHola, binario.cierre);

  const aTiempo = new EnchufeDeMentira();
  const buena = mesaNueva();
  const c = canal.abrir(buena.codigo, aTiempo);
  await reloj.avanzar(PLAZO_DEL_HOLA_MS - 100);
  c.recibir(hola(buena.llave('a-uno')));
  await vaciar();
  await reloj.avanzar(1000);
  comprobar(
    'quien dice `hola` a tiempo —a 4,9 s— no se cierra al cumplirse el plazo: está dentro',
    aTiempo.cierre === null && aTiempo.de('dentro').length === 1,
    { cierre: aTiempo.cierre, textos: aTiempo.textos.slice(0, 2) },
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 2 · LA ENTRADA
// ---------------------------------------------------------------------------

paso('La entrada: llave, modalidad, juego con mundo, tablero, y la mesa sin acabar');

{
  const { canal } = canalNuevo();
  const buena = mesaNueva();

  const mala = await entrar(canal, buena.codigo, 'X'.repeat(24));
  comprobar('una llave que no es de la mesa: `llaveMala` (4001)', mala.enchufe.cierre?.codigo === CIERRE.llaveMala, mala.enchufe.textos);
  comprobar('con su `fuera` delante', mala.enchufe.de('fuera').length === 1, mala.enchufe.textos);

  const deOtraMesa = mesaNueva();
  const cruzada = await entrar(canal, buena.codigo, deOtraMesa.llave('a-uno'));
  comprobar(
    'la llave BUENA de otra mesa: `llaveMala` también',
    cruzada.enchufe.cierre?.codigo === CIERRE.llaveMala,
    cruzada.enchufe.cierre,
  );

  const inexistente = await entrar(canal, 'NOHAY', 'X'.repeat(24));
  comprobar(
    'y en una mesa que no existe, lo mismo que con la llave mala: no se distingue «no existe» de «no es tuya»',
    inexistente.enchufe.cierre?.codigo === CIERRE.llaveMala,
    inexistente.enchufe.cierre,
  );

  const normal = mesaNueva({ modalidad: 'normal' });
  const enNormal = await entrar(canal, normal.codigo, normal.llave('a-uno'));
  comprobar('una mesa `normal`: `mesaQueNo` (4002)', enNormal.enchufe.cierre?.codigo === CIERRE.mesaQueNo, enNormal.enchufe.textos);

  const sinMundo = mesaNueva({ arcade: 'la-ronda' });
  const enSinMundo = await entrar(canal, sinMundo.codigo, sinMundo.llave('a-uno'));
  comprobar(
    'una mesa `botas` de un juego que no se recorre: `mesaQueNo`',
    enSinMundo.enchufe.cierre?.codigo === CIERRE.mesaQueNo,
    enSinMundo.enchufe.textos,
  );

  const sinTablero = mesaNueva({ mundo: null });
  const enSinTablero = await entrar(canal, sinTablero.codigo, sinTablero.llave('a-uno'));
  comprobar(
    'una mesa cuyo juego aún no tiene tablero: `mesaQueNo`, y el motivo lo dice',
    enSinTablero.enchufe.cierre?.codigo === CIERRE.mesaQueNo &&
      (enSinTablero.enchufe.ultimo('fuera')?.motivo ?? '').includes('tablero'),
    enSinTablero.enchufe.textos,
  );

  const acabada = mesaNueva({ terminada: true });
  const enAcabada = await entrar(canal, acabada.codigo, acabada.llave('a-uno'));
  comprobar('una mesa ya acabada: `mesaCerrada` (4006)', enAcabada.enchufe.cierre?.codigo === CIERRE.mesaCerrada, enAcabada.enchufe.textos);

  const uno = await entrar(canal, buena.codigo, buena.llave('a-uno'));
  const d = uno.enchufe.ultimo('dentro');
  comprobar('la buena: `dentro`, con su asiento', d !== undefined && d.yo === 'a-uno', uno.enchufe.textos);
  comprobar('y a `TICS_POR_SEGUNDO`', d?.hz === TICS_POR_SEGUNDO, d);
  comprobar(
    'y en un sitio donde se puede estar',
    d !== undefined && sePuedeEstar(ARENA_DEL_PRADO, d.x, d.z, RADIO_DEL_PASEANTE),
    d,
  );
  comprobar(
    'que es el sitio de nacer de su asiento: el primero para el primero',
    d !== undefined && d.x === 0 && d.z === 0,
    d,
  );

  const dos = await entrar(canal, buena.codigo, buena.llave('a-dos'));
  const d2 = dos.enchufe.ultimo('dentro');
  comprobar(
    'el segundo asiento nace en el SEGUNDO sitio, no encima del primero',
    d2 !== undefined && d2.x === 0 && d2.z === deNumero(6),
    d2,
  );

  const alReves = mesaNueva();
  const tercero = await entrar(canal, alReves.codigo, alReves.llave('a-tres'));
  comprobar(
    'el reparto es por el ORDEN DEL ASIENTO y no por el de llegada: el tercero, llegando solo, nace en el tercer sitio',
    tercero.x === deNumero(-6) && tercero.z === 0,
    [tercero.x / U, tercero.z / U],
  );

  /*
   * El tercer asiento entra con los tres sitios de nacer tapados —uno por cada uno de los dos de
   * dentro, y el suyo con una caja encima en una mesa aparte—: tiene que salir a un sitio libre y
   * sin nadie encima, no al suyo ni al de otro.
   */
  const tapada = mesaNueva({ mundo: prado([{ x0: -8, z0: -2, x1: -4, z1: 2 }]) });
  const t1 = await entrar(canal, tapada.codigo, tapada.llave('a-uno'));
  const t2 = await entrar(canal, tapada.codigo, tapada.llave('a-dos'));
  const t3 = await entrar(canal, tapada.codigo, tapada.llave('a-tres'));
  const d3 = t3.enchufe.ultimo('dentro');
  const arenaTapada = arenaDe(prado([{ x0: -8, z0: -2, x1: -4, z1: 2 }]));
  const lejosDe = (a: { x: number; z: number }, b: { x: number; z: number }): boolean =>
    Math.abs(a.x - b.x) >= RADIO_DEL_PASEANTE * 4 || Math.abs(a.z - b.z) >= RADIO_DEL_PASEANTE * 4;
  comprobar(
    'con su sitio tapado y los otros dos ocupados, nace en uno LIBRE y sin nadie encima',
    d3 !== undefined &&
      sePuedeEstar(arenaTapada, d3.x, d3.z, RADIO_DEL_PASEANTE) &&
      lejosDe(d3, t1) &&
      lejosDe(d3, t2),
    { d3, t1: [t1.x, t1.z], t2: [t2.x, t2.z] },
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 3 · UN CANAL POR ASIENTO
// ---------------------------------------------------------------------------

paso('Un canal por asiento: el nuevo desbanca al viejo');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const viejo = await entrar(canal, m.codigo, m.llave('a-uno'));
  await reloj.avanzar(50);
  andar(viejo, viejo.x + deNumero(1), viejo.z);
  const donde = { x: viejo.x, z: viejo.z };
  const nuevo = await entrar(canal, m.codigo, m.llave('a-uno'));
  comprobar(
    'el viejo recibe `reemplazado` (4003), con su `fuera`',
    viejo.enchufe.cierre?.codigo === CIERRE.reemplazado && viejo.enchufe.de('fuera').length === 1,
    viejo.enchufe.cierre,
  );
  comprobar(
    'y el nuevo sigue DONDE ESTABA el asiento, no en el sitio de nacer',
    nuevo.x === donde.x && nuevo.z === donde.z,
    { nuevo: [nuevo.x, nuevo.z], donde },
  );
  await reloj.avanzar(50);
  const corregido = andar(nuevo, nuevo.x + deNumero(1), nuevo.z);
  comprobar('y anda desde ahí, contando sus tics desde uno', !corregido && nuevo.n === 1, nuevo.enchufe.textos);
  /* Que el `close` del viejo llegue tarde no le quita el asiento al nuevo. */
  viejo.conexion.seCerro();
  await reloj.avanzar(100);
  comprobar(
    'y el cierre tardío del viejo no le quita el asiento al nuevo: la foto le sigue viendo',
    enLaFoto(nuevo.enchufe, 'a-uno') !== undefined && nuevo.enchufe.cierre === null,
    nuevo.enchufe.textos.slice(-2),
  );
  comprobar(
    'y la foto no repite el asiento: el canal nuevo retoma la MISMA entrada',
    nuevo.enchufe.de('foto').length > 0 && nuevo.enchufe.fotosConAsientoRepetido() === 0 && enLaFoto(nuevo.enchufe, 'a-uno') !== undefined,
    nuevo.enchufe.ultimo('foto'),
  );

  /* Y hacia dónde mira, tal cual lo dice su `aqui`: el servidor no lo toca, lo reparte. */
  await reloj.avanzar(50);
  nuevo.n++;
  nuevo.conexion.recibir(aqui(nuevo.n, nuevo.x, nuevo.z, 200, 1));
  await reloj.avanzar(100);
  const mira = enLaFoto(nuevo.enchufe, 'a-uno');
  comprobar('hacia dónde mira sale en la foto tal cual lo dijo, con su marcha', mira !== undefined && mira[3] === 200 && mira[4] === 1, mira);
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 4 · EL PRESUPUESTO DE DISTANCIA
// ---------------------------------------------------------------------------

paso('El presupuesto: correr sí, correr al doble no, el tope de un segundo, el teletransporte');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const quien = await entrar(canal, m.codigo, m.llave('a-uno'));

  /* Tres segundos corriendo hacia el oeste —de x = 0 a x = −35 hay prado libre—, un tic cada 50 ms. */
  const pasoCorriendo = Math.floor((1730150 * 3277) / U);
  let corregidos = 0;
  for (let i = 0; i < 20 * 3 - 30; i++) {
    await reloj.avanzar(50);
    if (andar(quien, quien.x - pasoCorriendo, quien.z)) corregidos++;
  }
  comprobar('treinta tics corriendo a la velocidad de correr: ni una corrección', corregidos === 0, { corregidos });

  /*
   * Al doble: 2,64 unidades por tic, de ida y vuelta entre x = −39 y x = 7,6 (la pared empieza en
   * 10), para que haya pista. El presupuesto lleno (33 u) aguanta un rato y luego no.
   */
  let recorrido = 0;
  let aceptadosAlDoble = 0;
  let ignoradosAlDoble = 0;
  let sentido = 1;
  corregidos = 0;
  for (let i = 0; i < 40; i++) {
    await reloj.avanzar(50);
    let destino = quien.x + sentido * pasoCorriendo * 2;
    if (destino > deNumero(7.6) || destino < deNumero(-39)) {
      sentido = -sentido;
      destino = quien.x + sentido * pasoCorriendo * 2;
    }
    const antes = quien.x;
    const r = paso3(quien, destino, quien.z);
    if (r === 'corregido') corregidos++;
    else if (r === 'aceptado') {
      aceptadosAlDoble++;
      recorrido += Math.abs(quien.x - antes) / U;
    } else ignoradosAlDoble++;
  }
  comprobar(
    'corriendo al doble, el presupuesto acaba corrigiendo',
    corregidos > 0 && aceptadosAlDoble > 0,
    { corregidos, aceptadosAlDoble, ignoradosAlDoble, recorrido },
  );
  comprobar(
    'y lo que llega después a más de un tic del sitio corregido se ignora en silencio',
    ignoradosAlDoble > 0,
    { corregidos, aceptadosAlDoble, ignoradosAlDoble },
  );
  comprobar(
    'y lo que se deja andar no pasa de lo que da el presupuesto: el lleno más lo rellenado en dos segundos',
    recorrido > 0 && recorrido <= TOPE_DEL_PRESUPUESTO / U + (1730150 * 1.25 * 2) / U + 1e-6,
    { recorrido, tope: TOPE_DEL_PRESUPUESTO / U },
  );

  /* El tope de un segundo acumulado: diez segundos quieto no dan diez segundos de carrera. */
  const quieto = await entrar(canal, m.codigo, m.llave('a-dos'));
  await reloj.avanzar(50);
  andar(quieto, quieto.x, quieto.z);
  for (let i = 0; i < 20; i++) {
    await reloj.avanzar(500);
    andar(quieto, quieto.x, quieto.z, 0);
  }
  const antesDelSalto = { x: quieto.x, z: quieto.z };
  await reloj.avanzar(50);
  /* Hacia el oeste por z = 6, que está libre de x = 0 a x = −35. 34 u es más que el tope (33). */
  const saltoLargo = andar(quieto, quieto.x - deNumero(34), quieto.z);
  comprobar(
    'tras diez segundos quieto, un tramo de 34 u de golpe se corrige: el presupuesto no pasa de un segundo',
    saltoLargo && quieto.x === antesDelSalto.x,
    quieto.enchufe.ultimo('corrige'),
  );
  await reloj.avanzar(1100);
  andar(quieto, antesDelSalto.x, antesDelSalto.z, 0);
  await reloj.avanzar(1100);
  const saltoCorto = andar(quieto, antesDelSalto.x - deNumero(30), antesDelSalto.z);
  comprobar(
    'y uno de 30 u, que cabe en el segundo acumulado, se acepta',
    !saltoCorto && quieto.x === antesDelSalto.x - deNumero(30),
    { x: quieto.x / U },
  );

  /* El teletransporte, dentro del prado y con la recta libre: sólo lo para el presupuesto. */
  await reloj.avanzar(50);
  const antesDelTeletransporte = { x: quieto.x, z: quieto.z };
  const tele = andar(quieto, quieto.x + deNumero(38), quieto.z - deNumero(5));
  const c = quieto.enchufe.ultimo('corrige');
  comprobar(
    'un teletransporte se corrige con el ÚLTIMO SITIO BUENO, y no se mueve',
    tele && c !== undefined && c.x === antesDelTeletransporte.x && c.z === antesDelTeletransporte.z,
    { c, antesDelTeletransporte },
  );
  await reloj.avanzar(100);
  const enFoto = enLaFoto(quieto.enchufe, 'a-dos');
  comprobar(
    'y la foto lo sigue enseñando donde estaba',
    enFoto !== undefined && enFoto[1] === antesDelTeletransporte.x && enFoto[2] === antesDelTeletransporte.z,
    enFoto,
  );
  comprobar(
    'todo lo que ha mandado el servidor lo lee el lector estricto del aparato',
    quien.enchufe.ilegibles() === 0 && quieto.enchufe.ilegibles() === 0,
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 5 · LA ESTRUCTURA
// ---------------------------------------------------------------------------

paso('La estructura: la pared no se cruza; la esquina de una caja, en un tic, sí; en dos, no');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const quien = await entrar(canal, m.codigo, m.llave('a-uno'));
  /* Hasta pegado a la pared, por la izquierda: x = 9 (la pared empieza en 10, y el radio es 0,4). */
  const pegado = deNumero(9);
  await llevar(reloj, quien, pegado, quien.z);
  comprobar('se llega andando hasta la pared', quien.x === pegado, quien.x / U);
  await reloj.avanzar(1000);
  andar(quien, quien.x, quien.z, 0);
  await reloj.avanzar(50);
  /* Al otro lado: x = 13 + radio. La llegada está libre; el camino cruza la pared. */
  const alOtroLado = deNumero(13.5);
  comprobar(
    'el otro lado de la pared es un sitio donde se puede estar (si no, esto no probaría nada)',
    sePuedeEstar(ARENA_DEL_PRADO, alOtroLado, quien.z, RADIO_DEL_PASEANTE),
  );
  const cruzar = andar(quien, alOtroLado, quien.z);
  comprobar(
    'cruzar la pared —4,5 u, dentro del presupuesto— se corrige',
    cruzar && quien.x === pegado,
    quien.enchufe.ultimo('corrige'),
  );

  /* La esquina de la CAJA (x ∈ [−20, −15], z ∈ [−20, −15]), por fuera, de abajo-izquierda a arriba-derecha. */
  const desde = { x: deNumero(-15) + RADIO_DEL_PASEANTE - deNumero(0.45), z: deNumero(-15) + RADIO_DEL_PASEANTE + deNumero(0.05) };
  const hasta = { x: deNumero(-15) + RADIO_DEL_PASEANTE + deNumero(0.05), z: deNumero(-15) + RADIO_DEL_PASEANTE - deNumero(0.45) };
  comprobar(
    'el paso de la esquina tiene las dos puntas libres y es de menos de un tic',
    sePuedeEstar(ARENA_DEL_PRADO, desde.x, desde.z, RADIO_DEL_PASEANTE) &&
      sePuedeEstar(ARENA_DEL_PRADO, hasta.x, hasta.z, RADIO_DEL_PASEANTE) &&
      Math.hypot(hasta.x - desde.x, hasta.z - desde.z) <= UN_TIC_CON_HOLGURA,
  );
  comprobar(
    'y la recta sola lo rechazaría: roza la esquina (la vacuna de la escuadra)',
    !seAndaEnRecta(ARENA_DEL_PRADO, desde, hasta, RADIO_DEL_PASEANTE),
  );
  comprobar('la escuadra lo admite', seAndaElTramo(ARENA_DEL_PRADO, desde, hasta, RADIO_DEL_PASEANTE) === 'escuadra');
  const lejos = { x: hasta.x + deNumero(1.5), z: hasta.z - deNumero(1.5) };
  comprobar(
    'pero un tramo de DOS tics por la misma esquina, no: la escuadra es sólo para un paso',
    !seAndaEnRecta(ARENA_DEL_PRADO, desde, lejos, RADIO_DEL_PASEANTE) &&
      seAndaElTramo(ARENA_DEL_PRADO, desde, lejos, RADIO_DEL_PASEANTE) === null,
  );
  /*
   * Y por escuadra no se atraviesa nada: un muro FINO —dos décimas— que un tic en diagonal
   * saltaría con las dos puntas libres. Ni la recta ni ninguna de las dos escuadras lo dejan.
   */
  const fino = arenaDe({ lado: 16, pisables: CASILLAS, vados: [], cuerpos: [{ x0: -5, z0: 20, x1: 5, z1: 20.2 }], nace: [] });
  const antesDelMuro = { x: 0, z: deNumero(19.35) };
  const trasElMuro = { x: deNumero(0.5), z: deNumero(20.65) };
  comprobar(
    'un tic en diagonal a través de un muro fino, con las dos puntas libres, no pasa ni en recta ni en escuadra',
    sePuedeEstar(fino, antesDelMuro.x, antesDelMuro.z, RADIO_DEL_PASEANTE) &&
      sePuedeEstar(fino, trasElMuro.x, trasElMuro.z, RADIO_DEL_PASEANTE) &&
      Math.hypot(trasElMuro.x - antesDelMuro.x, trasElMuro.z - antesDelMuro.z) <= UN_TIC_CON_HOLGURA &&
      seAndaElTramo(fino, antesDelMuro, trasElMuro, RADIO_DEL_PASEANTE) === null,
  );

  /* Y por el canal: se lleva a alguien a `desde` y se le hace recortar la esquina. */
  const otro = await entrar(canal, m.codigo, m.llave('a-dos'));
  await llevar(reloj, otro, desde.x, 0);
  await llevar(reloj, otro, desde.x, desde.z);
  comprobar('se llega a la esquina andando', otro.x === desde.x && otro.z === desde.z, [otro.x / U, otro.z / U]);
  const antes = canal.diagnostico().porEscuadra;
  await reloj.avanzar(50);
  const recortar = andar(otro, hasta.x, hasta.z);
  comprobar(
    'y por el canal el recorte de un tic se acepta, contado como escuadra',
    !recortar && canal.diagnostico().porEscuadra === antes + 1,
    { recortar, porEscuadra: canal.diagnostico().porEscuadra },
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 6 · LO QUE VIENE DE CAMINO TRAS UNA CORRECCIÓN, Y EL TIC
// ---------------------------------------------------------------------------

paso('Tras corregir: lo que venía de camino se calla un segundo; y el tic viejo se ignora');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const q = await entrar(canal, m.codigo, m.llave('a-uno'));
  await reloj.avanzar(50);
  andar(q, q.x - deNumero(1), q.z);
  const bueno = { x: q.x, z: q.z };

  await reloj.avanzar(50);
  /* 36 u de golpe: más que el presupuesto lleno (33), por prado libre. */
  const primero = andar(q, q.x - deNumero(36), q.z);
  comprobar('un salto más largo que el presupuesto corrige', primero, q.enchufe.textos.slice(-1));
  const correcciones = q.enchufe.de('corrige').length;

  /* Tres pasos que ya iban de camino, desde el sitio malo. */
  for (let i = 1; i <= 3; i++) {
    await reloj.avanzar(50);
    q.n++;
    q.conexion.recibir(aqui(q.n, bueno.x - deNumero(36 - i), bueno.z));
  }
  comprobar(
    'los tres pasos que venían de camino NO provocan otra corrección cada uno',
    q.enchufe.de('corrige').length === correcciones,
    q.enchufe.textos.slice(-3),
  );
  comprobar('y se cuentan como ignorados tras corregir', canal.diagnostico().ignoradosTrasCorregir === 3, canal.diagnostico());

  await reloj.avanzar(1000);
  q.n++;
  q.conexion.recibir(aqui(q.n, bueno.x - deNumero(30), bueno.z));
  comprobar(
    'pasado un segundo sin volver al sitio corregido, se le repite la corrección',
    q.enchufe.de('corrige').length === correcciones + 1 && canal.diagnostico().correcciones.repetida === 1,
    canal.diagnostico().correcciones,
  );

  await reloj.avanzar(50);
  const vuelta = andar(q, bueno.x - deNumero(1), bueno.z);
  comprobar('un paso desde el sitio corregido se acepta y acaba la corrección', !vuelta && q.x === bueno.x - deNumero(1), q.x / U);

  const n = q.n;
  const antes = { x: q.x, z: q.z };
  await reloj.avanzar(50);
  q.conexion.recibir(aqui(n, q.x - deNumero(1), q.z));
  q.conexion.recibir(aqui(n - 3, q.x - deNumero(1), q.z));
  await reloj.avanzar(100);
  const foto = enLaFoto(q.enchufe, 'a-uno');
  comprobar(
    'un `aqui` con el tic repetido o viejo se ignora: ni se mueve ni se corrige',
    foto !== undefined && foto[1] === antes.x && foto[2] === antes.z && canal.diagnostico().ignorados >= 2,
    { foto, antes },
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 7 · EL CUBO DE MENSAJES Y LOS MAL FORMADOS
// ---------------------------------------------------------------------------

paso('El cubo: cuarenta de golpe sí, cuarenta y uno no; veinte por segundo, siempre; y los mal formados');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const rafaga = await entrar(canal, m.codigo, m.llave('a-uno'));
  /* El `hola` ya gastó uno. Treinta y nueve más en el mismo instante caben. */
  for (let i = 0; i < MENSAJES_DE_GOLPE - 1; i++) {
    rafaga.n++;
    rafaga.conexion.recibir(aqui(rafaga.n, rafaga.x, rafaga.z, 0, 0));
  }
  comprobar('cuarenta mensajes de golpe (el `hola` incluido) caben', rafaga.enchufe.cierre === null, rafaga.enchufe.cierre);
  rafaga.n++;
  rafaga.conexion.recibir(aqui(rafaga.n, rafaga.x, rafaga.z, 0, 0));
  comprobar('el cuarenta y uno: `atropello` (4005)', rafaga.enchufe.cierre?.codigo === CIERRE.atropello, rafaga.enchufe.cierre);

  const aparato = await entrar(canal, m.codigo, m.llave('a-dos'));
  for (let i = 0; i < 20 * 30; i++) {
    await reloj.avanzar(50);
    aparato.n++;
    aparato.conexion.recibir(aqui(aparato.n, aparato.x, aparato.z, 0, i % 100 < 50 ? 0 : 1));
    if (i % 40 === 0) {
      /* Y que se mueva de vez en cuando, que si no le cierra el «quieto». */
      andar(aparato, aparato.x + (i % 80 === 0 ? deNumero(0.5) : -deNumero(0.5)), aparato.z);
    }
  }
  comprobar(
    'un aparato que manda un `aqui` por tic —y alguno más— durante treinta segundos no se atropella',
    aparato.enchufe.cierre === null,
    aparato.enchufe.cierre,
  );

  const sucio = await entrar(canal, m.codigo, m.llave('a-tres'));
  await reloj.avanzar(100);
  sucio.conexion.recibir('{"t":"aqui"}');
  sucio.conexion.recibir(null);
  sucio.conexion.recibir(hola(m.llave('a-tres')));
  comprobar('tres mal formados —uno binario y un `hola` fuera de sitio— se aguantan', sucio.enchufe.cierre === null, sucio.enchufe.cierre);
  sucio.conexion.recibir(j({ t: 'aqui', n: 99, x: 1.5, z: 0, r: 0, m: 0 }));
  comprobar('el cuarto: `atropello`', sucio.enchufe.cierre?.codigo === CIERRE.atropello, sucio.enchufe.cierre);
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 8 · QUIETO
// ---------------------------------------------------------------------------

paso('Quieto: sesenta segundos sin cambiar de sitio aceptado cierran el canal');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const q = await entrar(canal, m.codigo, m.llave('a-uno'));
  /* Manda su sitio dos veces por segundo, sin moverse, como una pestaña en segundo plano. */
  let t = 0;
  while (t < QUIETO_HASTA_CERRAR_MS - 500) {
    await reloj.avanzar(500);
    t += 500;
    andar(q, q.x, q.z, 0);
  }
  await reloj.avanzar(450);
  comprobar('a 59,95 segundos sigue abierto, aunque no se haya movido', q.enchufe.cierre === null, q.enchufe.cierre);
  await reloj.avanzar(100);
  comprobar(
    'a los sesenta: `quieto` (4004), con su `fuera`',
    q.enchufe.cierre?.codigo === CIERRE.quieto && q.enchufe.de('fuera').length === 1,
    q.enchufe.cierre,
  );

  const r = await entrar(canal, m.codigo, m.llave('a-dos'));
  await reloj.avanzar(30_000);
  andar(r, r.x + deNumero(1), r.z);
  await reloj.avanzar(QUIETO_HASTA_CERRAR_MS - 1000);
  comprobar('moverse a los treinta segundos vuelve a poner la cuenta a cero', r.enchufe.cierre === null, r.enchufe.cierre);
  await reloj.avanzar(1100);
  comprobar('y cierra sesenta segundos después del último paso', r.enchufe.cierre?.codigo === CIERRE.quieto, r.enchufe.cierre);
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 9 · LA GRACIA AL IRSE
// ---------------------------------------------------------------------------

paso('Quien se va no sale de la sala: sigue en la foto donde se quedó, y vuelve ahí, dure lo que dure');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const mira = await entrar(canal, m.codigo, m.llave('a-dos'));
  const q = await entrar(canal, m.codigo, m.llave('a-uno'));
  for (let i = 0; i < 10; i++) {
    await reloj.avanzar(50);
    andar(q, q.x - deNumero(1), q.z);
  }
  const donde = { x: q.x, z: q.z };
  q.conexion.seCerro();
  await reloj.avanzar(200);
  const enGracia = enLaFoto(mira.enchufe, 'a-uno');
  comprobar(
    'al irse, los demás le siguen viendo donde estaba, parado (marcha 0)',
    enGracia !== undefined && enGracia[1] === donde.x && enGracia[4] === 0,
    enGracia,
  );
  await reloj.avanzar(GRACIA_AL_IRSE_MS - 1000);
  const vuelve = await entrar(canal, m.codigo, m.llave('a-uno'));
  comprobar('vuelve a los 4,2 segundos: aparece donde estaba', vuelve.x === donde.x && vuelve.z === donde.z, [vuelve.x, donde.x]);

  vuelve.conexion.seCerro();
  await reloj.avanzar(GRACIA_AL_IRSE_MS + 100);
  const sinGracia = enLaFoto(mira.enchufe, 'a-uno');
  comprobar(
    'y pasados los cinco segundos, con otro dentro, SIGUE en la foto donde se quedó, quieto: nadie es inmune por irse',
    sinGracia !== undefined && sinGracia[1] === donde.x && sinGracia[2] === donde.z && sinGracia[4] === 0,
    mira.enchufe.ultimo('foto'),
  );
  const tarde = await entrar(canal, m.codigo, m.llave('a-uno'));
  comprobar(
    'y quien vuelve tarde aparece donde se quedó, no en su sitio de nacer',
    tarde.x === donde.x && tarde.z === donde.z,
    [tarde.x / U, tarde.z / U],
  );
  await reloj.avanzar(200);
  comprobar(
    'y en ninguna foto de todo esto sale un asiento dos veces',
    mira.enchufe.de('foto').length > 0 && mira.enchufe.fotosConAsientoRepetido() === 0 && tarde.enchufe.fotosConAsientoRepetido() === 0,
    mira.enchufe.ultimo('foto'),
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 10 · LA FOTO Y EL TEMPORIZADOR
// ---------------------------------------------------------------------------

paso('La foto: cada dos tics, la misma cadena a todos; el atascado se salta. Y UN temporizador, parado sin salas');

{
  const { canal, reloj } = canalNuevo();
  comprobar('sin salas, el temporizador está parado', !canal.diagnostico().temporizador && reloj.periodicos() === 0);
  const m = mesaNueva();
  const a = await entrar(canal, m.codigo, m.llave('a-uno'));
  const b = await entrar(canal, m.codigo, m.llave('a-dos'));
  comprobar('con una sala, un temporizador', canal.diagnostico().temporizador && reloj.periodicos() === 1);
  const otra = mesaNueva({ asientos: ['o-uno', 'o-dos'] });
  const c = await entrar(canal, otra.codigo, otra.llave('o-uno'));
  comprobar(
    'con dos salas, SIGUE habiendo un solo temporizador',
    reloj.periodicos() === 1 && canal.diagnostico().salas === 2,
    { periodicos: reloj.periodicos(), salas: canal.diagnostico().salas },
  );

  const antesA = a.enchufe.de('foto').length;
  const compuestas = canal.diagnostico().fotosCompuestas;
  const mandadas = canal.diagnostico().fotos;
  await reloj.avanzar(1000);
  comprobar(
    'en un segundo se SERIALIZAN diez fotos por sala —veinte entre las dos— y se MANDAN treinta: una cadena para los dos de la misma sala',
    canal.diagnostico().fotosCompuestas - compuestas === 20 && canal.diagnostico().fotos - mandadas === 30,
    { compuestas: canal.diagnostico().fotosCompuestas - compuestas, mandadas: canal.diagnostico().fotos - mandadas },
  );
  const nuevasA = a.enchufe.textos.filter((t) => t.startsWith('{"t":"foto"')).slice(-10);
  const nuevasB = b.enchufe.textos.filter((t) => t.startsWith('{"t":"foto"')).slice(-10);
  comprobar(
    `en un segundo, ${String(TICS_POR_SEGUNDO / 2)} fotos por canal`,
    a.enchufe.de('foto').length - antesA === 10,
    a.enchufe.de('foto').length - antesA,
  );
  comprobar(
    'y cada foto es LA MISMA cadena para los dos de la sala',
    nuevasA.length === 10 && nuevasA.every((t, i) => t === nuevasB[i]),
    { a: nuevasA.slice(-1), b: nuevasB.slice(-1) },
  );
  const ks = a.enchufe.de('foto').map((f) => f.k);
  comprobar('con la `k` de la sala subiendo de dos en dos', ks.slice(-5).every((k, i, t) => i === 0 || k === (t[i - 1] as number) + 2), ks.slice(-5));
  const f = a.enchufe.ultimo('foto');
  comprobar(
    'la foto lleva a los TRES sentados de la sala —también al que no ha bajado— y a nadie de la otra mesa',
    f !== undefined && f.p.map((e) => e[0]).sort().join(',') === 'a-dos,a-tres,a-uno',
    f,
  );
  comprobar(
    'y el que no ha bajado sale de pie en su sitio de nacer, quieto',
    f !== undefined && f.p.some((e) => e[0] === 'a-tres' && e[1] === deNumero(-6) && e[2] === 0 && e[4] === 0),
    f,
  );
  comprobar(
    'la otra sala tiene sus propias fotos, con sus dos sentados',
    c.enchufe.de('foto').length > 0 && (c.enchufe.ultimo('foto')?.p.map((e) => e[0]).sort().join(',') ?? '') === 'o-dos,o-uno',
    c.enchufe.ultimo('foto'),
  );

  b.enchufe.atasco = ATASCO_BYTES + 1;
  const antesB = b.enchufe.de('foto').length;
  const saltadas = canal.diagnostico().fotosSaltadas;
  await reloj.avanzar(500);
  comprobar(
    'a quien tiene el búfer atascado se le saltan las fotos, y se cuentan',
    b.enchufe.de('foto').length === antesB && canal.diagnostico().fotosSaltadas === saltadas + 5,
    { fotos: b.enchufe.de('foto').length - antesB, saltadas: canal.diagnostico().fotosSaltadas - saltadas },
  );
  comprobar('mientras al otro le siguen llegando', a.enchufe.de('foto').length - antesA === 15);
  b.enchufe.atasco = 0;

  a.conexion.seCerro();
  b.conexion.seCerro();
  c.conexion.seCerro();
  await reloj.avanzar(GRACIA_AL_IRSE_MS - 100);
  comprobar('durante la gracia de los últimos, la sala y el temporizador siguen', canal.diagnostico().salas === 2 && reloj.periodicos() === 1);
  await reloj.avanzar(200);
  comprobar(
    'y al acabar la gracia sin nadie, las salas se van y el temporizador SE PARA',
    canal.diagnostico().salas === 0 && !canal.diagnostico().temporizador && reloj.periodicos() === 0,
    { salas: canal.diagnostico().salas, periodicos: reloj.periodicos() },
  );
  const tics = canal.diagnostico().tics;
  await reloj.avanzar(60_000);
  comprobar('y un minuto sin nadie no da ni un tic', canal.diagnostico().tics === tics, canal.diagnostico().tics - tics);
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 11 · EL MUNDO QUE CAMBIA DEBAJO DE ALGUIEN
// ---------------------------------------------------------------------------

paso('El mundo cambia debajo: una caja encima, o el suelo que se va, y se le saca con un `corrige`');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const q = await entrar(canal, m.codigo, m.llave('a-uno'));
  /* A (−30, 20), en la casilla (−2, −1). */
  await llevar(reloj, q, deNumero(-30), deNumero(20));
  comprobar('se llega andando a (−30, 20)', q.x === deNumero(-30) && q.z === deNumero(20), [q.x / U, q.z / U]);

  /* La mesa cambia: una choza de 4 × 4 justo encima. */
  const choza: Cuerpo = { x0: -32, z0: 18, x1: -28, z1: 22 };
  const mesa = MESAS.get(m.codigo);
  if (mesa !== undefined) {
    mesa.rev = 2;
    mesa.mundo = prado([choza]);
  }
  const antes = q.enchufe.de('corrige').length;
  await reloj.avanzar(1100);
  await vaciar();
  const c = q.enchufe.ultimo('corrige');
  const nueva = arenaDe(prado([choza]));
  comprobar(
    'al rederivar el mundo, a quien la choza ha dejado dentro se le manda un `corrige`',
    q.enchufe.de('corrige').length === antes + 1 && c !== undefined,
    q.enchufe.textos.slice(-3),
  );
  comprobar(
    'a un sitio donde, en el mundo nuevo, se puede estar',
    c !== undefined && sePuedeEstar(nueva, c.x, c.z, RADIO_DEL_PASEANTE),
    c,
  );
  comprobar(
    'y cerca: el borde de la choza está a 2 u, y el rescate no se va más lejos de lo necesario',
    c !== undefined && Math.hypot(c.x - deNumero(-30), c.z - deNumero(20)) <= deNumero(4),
    c === undefined ? null : [c.x / U, c.z / U],
  );
  if (c !== undefined) {
    q.x = c.x;
    q.z = c.z;
  }
  await reloj.avanzar(50);
  const sale = andar(q, q.x + deNumero(0.3), q.z);
  comprobar('y desde ahí se anda: no se queda clavado', !sale, q.enchufe.textos.slice(-2));
  comprobar('el rescate se cuenta', canal.diagnostico().correcciones.rescate === 1, canal.diagnostico().correcciones);

  /* Y el suelo que se va: se quita la casilla (−2, −1) —donde está— y se le saca a otra. */
  if (mesa !== undefined) {
    mesa.rev = 3;
    mesa.mundo = prado([choza], [{ x: -2, y: -1 }]);
  }
  await reloj.avanzar(1100);
  await vaciar();
  const c2 = q.enchufe.ultimo('corrige');
  const sinSuelo = arenaDe(prado([choza], [{ x: -2, y: -1 }]));
  comprobar(
    'sin suelo debajo, también: un `corrige` a un sitio con suelo y sin cuerpo',
    canal.diagnostico().correcciones.rescate === 2 && c2 !== undefined && sePuedeEstar(sinSuelo, c2.x, c2.z, RADIO_DEL_PASEANTE),
    { c2, correcciones: canal.diagnostico().correcciones },
  );
  comprobar('el mundo se ha vuelto a derivar dos veces', canal.diagnostico().rederivaciones === 2, canal.diagnostico().rederivaciones);

  /* Y quien estaba en la gracia cuando cambió el mundo vuelve a un sitio bueno. */
  const g = await entrar(canal, m.codigo, m.llave('a-dos'));
  await llevar(reloj, g, deNumero(5), deNumero(-35));
  comprobar('el segundo llega andando a (5, −35)', g.x === deNumero(5) && g.z === deNumero(-35), [g.x / U, g.z / U]);
  g.conexion.seCerro();
  const conOtraCaja = prado([choza, { x0: 3, z0: -37, x1: 7, z1: -33 }], [{ x: -2, y: -1 }]);
  if (mesa !== undefined) {
    mesa.rev = 4;
    mesa.mundo = conOtraCaja;
  }
  await reloj.avanzar(1100);
  await vaciar();
  const vuelve = await entrar(canal, m.codigo, m.llave('a-dos'));
  comprobar(
    'quien se fue antes del cambio y vuelve en la gracia aparece fuera de la caja nueva, y cerca',
    sePuedeEstar(arenaDe(conOtraCaja), vuelve.x, vuelve.z, RADIO_DEL_PASEANTE) &&
      Math.hypot(vuelve.x - deNumero(5), vuelve.z - deNumero(-35)) <= deNumero(4),
    [vuelve.x / U, vuelve.z / U],
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 12 · MESA CERRADA, OLVIDADA, Y SIGTERM
// ---------------------------------------------------------------------------

paso('Mesa cerrada u olvidada: `mesaCerrada` a todos. SIGTERM: 1001 a todos, y no entra nadie más');

{
  const { canal, reloj } = canalNuevo();
  const cerrada = mesaNueva();
  const a = await entrar(canal, cerrada.codigo, cerrada.llave('a-uno'));
  const b = await entrar(canal, cerrada.codigo, cerrada.llave('a-dos'));
  canal.cerrarLaMesa(cerrada.codigo, 'La partida se ha acabado.');
  comprobar(
    'el gancho de mesa cerrada: `mesaCerrada` (4006) a los dos, con su `fuera`',
    a.enchufe.cierre?.codigo === CIERRE.mesaCerrada && b.enchufe.cierre?.codigo === CIERRE.mesaCerrada && a.enchufe.de('fuera').length === 1,
    [a.enchufe.cierre, b.enchufe.cierre],
  );

  const acaba = mesaNueva();
  const c = await entrar(canal, acaba.codigo, acaba.llave('a-uno'));
  const mesa = MESAS.get(acaba.codigo);
  if (mesa !== undefined) mesa.terminada = true;
  await reloj.avanzar(1100);
  await vaciar();
  comprobar(
    'una mesa que se acaba sin gancho (el `POST /cerrar`) se ve al preguntar la revisión: `mesaCerrada`',
    c.enchufe.cierre?.codigo === CIERRE.mesaCerrada,
    c.enchufe.cierre,
  );

  const borrada = mesaNueva();
  const d = await entrar(canal, borrada.codigo, borrada.llave('a-uno'));
  const mb = MESAS.get(borrada.codigo);
  if (mb !== undefined) mb.existe = false;
  await reloj.avanzar(1100);
  await vaciar();
  comprobar(
    'y una mesa que desaparece (el `DELETE`), igual',
    d.enchufe.cierre?.codigo === CIERRE.mesaCerrada && (d.enchufe.ultimo('fuera')?.motivo ?? '').includes('no existe'),
    d.enchufe.textos.slice(-2),
  );

  const viva = mesaNueva();
  const e = await entrar(canal, viva.codigo, viva.llave('a-uno'));
  const saludando = new EnchufeDeMentira();
  canal.abrir(viva.codigo, saludando);
  canal.apagar();
  comprobar(
    'SIGTERM: 1001 a quien está dentro y a quien aún no ha saludado, con su `fuera`',
    e.enchufe.cierre?.codigo === 1001 && saludando.cierre?.codigo === 1001 && e.enchufe.de('fuera').length === 1,
    [e.enchufe.cierre, saludando.cierre],
  );
  comprobar('y el temporizador parado', !canal.diagnostico().temporizador && reloj.periodicos() === 0);
  const tarde = new EnchufeDeMentira();
  canal.abrir(viva.codigo, tarde);
  comprobar('y quien llega después, 1001 en el acto', tarde.cierre?.codigo === 1001, tarde.cierre);
}

// ---------------------------------------------------------------------------
// 12 BIS · DERIVAR MUNDOS POR TURNO
// ---------------------------------------------------------------------------

paso('Derivar mundos por turno: de uno en uno, abrir delante de volver a derivar, y nunca más de la quinta parte del hilo');

{
  /*
   * Un productor que CUESTA 200 ms en un cronómetro de mentira —lo que cuesta Las Lindes llena en
   * frío—. Sin turno, tres salas que se abren a la vez o que mueven a la vez se derivarían seguidas
   * y el hilo se iría 600 ms sin leer un enchufe; con turno van de una en una, y cada una espera
   * cuatro veces lo que costó la anterior. Y abrir va DELANTE: hay alguien esperando su `dentro`.
   */
  let cronometro = 0;
  let coste = 200;
  const llamadas: { codigo: string; t: number }[] = [];
  const reloj = new RelojDeMentira();
  const canal = new CanalDeBotas({
    reloj,
    mesa: LA_MESA,
    mundos: {
      sePuedeRecorrer: (arcade) => RECORRIBLES.has(arcade),
      mundoDeLaMesa: (_arcade, vista, codigo) => {
        llamadas.push({ codigo, t: reloj.ahora() });
        cronometro += coste;
        return (vista as { mundo: MundoDeclarado | null }).mundo;
      },
    },
    registrar: (linea) => LO_QUE_SE_REGISTRA.push(linea),
    cronometro: () => cronometro,
  });
  const cuatro = [mesaNueva(), mesaNueva(), mesaNueva(), mesaNueva()];
  const moverLasMesas = (cuantas: number): void => {
    for (const m of cuatro.slice(0, cuantas)) {
      const mesa = MESAS.get(m.codigo);
      if (mesa !== undefined) mesa.rev++;
    }
  };

  /* 1 · Tres salas caras que se abren a la vez. */
  const enchufes = cuatro.slice(0, 3).map((m) => {
    const e = new EnchufeDeMentira();
    canal.abrir(m.codigo, e).recibir(hola(m.llave('a-uno')));
    return e;
  });
  await vaciar();
  const dentros = (): number => enchufes.filter((e) => e.de('dentro').length === 1).length;
  comprobar('tres salas caras que se abren a la vez: la primera entra en el acto, las otras esperan turno', dentros() === 1, dentros());
  await reloj.avanzar(800);
  comprobar('la segunda entra cuatro veces lo que costó la primera después (800 ms)', dentros() === 2, dentros());
  await reloj.avanzar(800);
  comprobar('y la tercera, 800 ms más tarde: ninguna se queda sin entrar', dentros() === 3, dentros());

  /* 2 · Las tres mesas mueven a la vez. */
  await reloj.avanzar(1000);
  llamadas.length = 0;
  moverLasMesas(3);
  const fotosAntes = (enchufes[0] as EnchufeDeMentira).de('foto').length;
  await reloj.avanzar(6000);
  const ts = llamadas.map((l) => l.t);
  comprobar(
    'las tres vuelven a derivar su mundo, una vez cada una',
    llamadas.length === 3 && new Set(llamadas.map((l) => l.codigo)).size === 3,
    llamadas,
  );
  comprobar(
    'de una en una y con turno: cada una, al menos cuatro veces lo que costó la anterior (800 ms) después',
    ts.length === 3 && ts.every((t, i) => i === 0 || t - (ts[i - 1] as number) >= 800),
    ts.map((t) => t - (ts[0] ?? 0)),
  );
  comprobar(
    'mientras esperan, las salas siguen: las fotos no se paran',
    (enchufes[0] as EnchufeDeMentira).de('foto').length - fotosAntes >= 50,
    (enchufes[0] as EnchufeDeMentira).de('foto').length - fotosAntes,
  );

  /*
   * 3 · Vuelven a mover, ahora con derivaciones de 500 ms —así la siguiente espera dos segundos—, y
   * se deja que las TRES se pongan a la cola antes de que llegue alguien a abrir la cuarta: la
   * primera deriva y las otras dos esperan turno cuando llega. Sin prioridad, la cuarta iría la
   * última; con ella, la siguiente.
   */
  coste = 500;
  llamadas.length = 0;
  moverLasMesas(3);
  for (let i = 0; i < 40 && llamadas.length === 0; i++) await reloj.avanzar(50);
  await reloj.avanzar(1100);
  comprobar(
    'con la primera derivando, las otras dos esperan turno en la cola',
    llamadas.length === 1 && canal.diagnostico().colaParaDerivar === 2,
    { llamadas: llamadas.length, cola: canal.diagnostico().colaParaDerivar },
  );
  const cuarta = new EnchufeDeMentira();
  canal.abrir((cuatro[3] as { codigo: string }).codigo, cuarta).recibir(hola((cuatro[3] as { llave: (a: string) => string }).llave('a-uno')));
  await vaciar();
  await reloj.avanzar(8000);
  const orden = llamadas.map((l) => l.codigo);
  comprobar(
    'abrir va DELANTE de volver a derivar: la sala nueva se deriva antes que las dos que ya esperaban',
    orden.length === 4 && orden[1] === (cuatro[3] as { codigo: string }).codigo,
    orden,
  );
  comprobar('y quien la abrió entra', cuarta.de('dentro').length === 1, cuarta.textos.slice(0, 2));
  comprobar(
    'la cola se vacía, y el diagnóstico cuenta el trabajo: seis derivaciones de 200 ms y cuatro de 500',
    canal.diagnostico().colaParaDerivar === 0 && canal.diagnostico().msDerivando === 3200 && canal.diagnostico().rederivaciones === 6,
    { cola: canal.diagnostico().colaParaDerivar, ms: canal.diagnostico().msDerivando, rederivaciones: canal.diagnostico().rederivaciones },
  );

  /* 4 · Y si derivar es barato, no se espera nada más que lo que tarda en preguntarse la revisión. */
  coste = 0;
  llamadas.length = 0;
  const movidas = reloj.ahora();
  moverLasMesas(4);
  await reloj.avanzar(1300);
  comprobar(
    'y si derivar es barato no se espera nada: las cuatro dentro del segundo en que se pregunta la revisión',
    llamadas.length === 4 && llamadas.every((l) => l.t - movidas <= 1050),
    llamadas.map((l) => l.t - movidas),
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 16 · LA REFRIEGA: EL GOLPE, A SU MANEJADOR
// ---------------------------------------------------------------------------

paso('El golpe va a su manejador y no a la validación: no mueve a nadie, y la foto de la sala sigue legible');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: ruedo(), asientos: ASIENTOS_DEL_RUEDO });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  const b = await entrar(canal, m.codigo, m.llave('r-dos'));
  await reloj.avanzar(50);
  andar(a, a.x, a.z + deNumero(0.5), 1);
  await reloj.avanzar(300);
  const aceptados = canal.diagnostico().aceptados;
  const antes = enLaFoto(b.enchufe, 'r-uno');
  golpear(a, 128);
  await reloj.avanzar(200);
  const despues = enLaFoto(b.enchufe, 'r-uno');
  comprobar(
    'un golpe al aire —al sur, donde no hay nadie—: `lanza` a los dos de la sala, y ningún `da`',
    cuantos(a.enchufe, 'lanza') === 1 && cuantos(b.enchufe, 'lanza') === 1 && cuantos(a.enchufe, 'da') === 0 && cuantos(b.enchufe, 'da') === 0,
    b.enchufe.textos.slice(-3),
  );
  comprobar(
    'y no pasa por la validación: ni un paso aceptado más, ni se mueve nadie',
    canal.diagnostico().aceptados === aceptados && despues !== undefined && antes !== undefined && despues[1] === antes[1] && despues[2] === antes[2],
    { antes, despues },
  );
  comprobar(
    'y la foto de toda la sala sigue legible, con la marcha de quien golpeó bien dicha: el golpe ya no la envenena',
    a.enchufe.ilegibles() === 0 && b.enchufe.ilegibles() === 0 && despues !== undefined && despues[4] === 1,
    b.enchufe.textos.slice(-1),
  );
  comprobar('y se cuenta como golpe', canal.diagnostico().golpes === 1, canal.diagnostico().golpes);
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 17 · LANZA, DA, Y LA RECARGA
// ---------------------------------------------------------------------------

paso('`lanza` y `da` a toda la sala; la recarga cuenta desde el último golpe ACEPTADO; y el tic del golpe crece');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: ruedo(), asientos: ASIENTOS_DEL_RUEDO });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  const b = await entrar(canal, m.codigo, m.llave('r-dos'));
  const lejos = await entrar(canal, m.codigo, m.llave('r-tres'));
  await reloj.avanzar(300);
  golpear(a, 0);
  const primero = b.enchufe.ultimo('da');
  comprobar(
    'A golpea al norte y le da a B, que nace a dos unidades delante: `da` con la vida que le queda',
    primero?.de === 'r-uno' && primero.a === 'r-dos' && primero.vida === VIDA_ENTERA - 1,
    b.enchufe.textos.slice(-3),
  );
  comprobar(
    'y `lanza` y `da` le llegan a TODA la sala, también a quien está a sesenta unidades, y a quien golpea',
    cuantos(lejos.enchufe, 'lanza') === 1 && cuantos(lejos.enchufe, 'da') === 1 && cuantos(a.enchufe, 'lanza') === 1 && cuantos(a.enchufe, 'da') === 1,
    lejos.enchufe.textos.slice(-3),
  );
  await reloj.avanzar(400);
  golpear(a, 0);
  comprobar(
    'a los 400 ms, en recarga: ni `lanza` ni `da`, y se cuenta como ignorado',
    cuantos(b.enchufe, 'lanza') === 1 && cuantos(b.enchufe, 'da') === 1 && canal.diagnostico().golpesIgnorados === 1,
    canal.diagnostico().golpesIgnorados,
  );
  await reloj.avanzar(450);
  golpear(a, 0);
  comprobar(
    'a los 850 ms del primero —y 450 del ignorado— entra: la recarga cuenta desde el último ACEPTADO',
    cuantos(b.enchufe, 'da') === 2 && b.enchufe.ultimo('da')?.vida === VIDA_ENTERA - 2,
    b.enchufe.textos.slice(-2),
  );
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 100);
  a.conexion.recibir(j({ t: 'golpe', n: a.n, r: 0 }));
  comprobar(
    'un golpe con el mismo tic que el anterior se ignora, aunque ya haya pasado la recarga',
    cuantos(b.enchufe, 'da') === 2 && canal.diagnostico().golpesIgnorados === 2,
    canal.diagnostico().golpesIgnorados,
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 18 · A QUIÉN LE DA: ALCANCE, CONO, DETRÁS, MURO, EL MÁS CERCANO
// ---------------------------------------------------------------------------

paso('A quién le da: a dos unidades y media como mucho, dentro del cono, no por detrás, sin muro en medio, y al más cercano');

{
  const MURO: Cuerpo = { x0: 20, z0: -1.1, x1: 30, z1: -0.9 };
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: ruedo([MURO]), asientos: ASIENTOS_DEL_RUEDO });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  const b = await entrar(canal, m.codigo, m.llave('r-dos'));
  /* Pone a B en `(x, z)`, deja pasar más que el rebobinado y la recarga, y dice si el golpe de A le dio. */
  const leDa = async (x: number, z: number, r: number): Promise<boolean> => {
    await llevar(reloj, b, deNumero(x), deNumero(z));
    await reloj.avanzar(RECARGA_DEL_GOLPE_MS + REBOBINADO_MS);
    const antes = cuantos(b.enchufe, 'da');
    golpear(a, r);
    return cuantos(b.enchufe, 'da') > antes;
  };
  comprobar('a 2,6 unidades, delante: no le da', !(await leDa(0, -2.6, 0)));
  comprobar('a 2,4, delante: le da', await leDa(0, -2.4, 0));
  const a50 = [2 * Math.sin((50 * Math.PI) / 180), -2 * Math.cos((50 * Math.PI) / 180)] as const;
  const a40 = [2 * Math.sin((40 * Math.PI) / 180), -2 * Math.cos((40 * Math.PI) / 180)] as const;
  comprobar('a dos unidades pero a 50 grados de la mirada, fuera del cono: no le da', !(await leDa(a50[0], a50[1], 0)));
  comprobar('a 40 grados, dentro: le da', await leDa(a40[0], a40[1], 0));
  comprobar('a dos unidades, a la espalda: no le da', !(await leDa(0, 2, 0)));
  await llevar(reloj, a, deNumero(25), 0);
  comprobar(
    'con un muro fino en medio, a dos unidades, delante y en el cono: no le da',
    sePuedeEstar(arenaDe(ruedo([MURO])), deNumero(25), deNumero(-2), RADIO_DEL_PASEANTE) && !(await leDa(25, -2, 0)),
  );
  await llevar(reloj, a, deNumero(35), 0);
  comprobar('y lo mismo diez unidades más allá, donde el muro ya no está: le da', await leDa(35, -2, 0));
  canal.apagar();
}

{
  /*
   * EL MÁS CERCANO, UNO SOLO; y si el más cercano tiene un muro delante, el siguiente. En el ruedo con
   * un muro corto al oeste, a cuarenta unidades del centro.
   */
  const MURITO: Cuerpo = { x0: -39.8, z0: -1.1, x1: -39, z1: -1 };
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: ruedo([MURITO]), asientos: ASIENTOS_DEL_RUEDO });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  const b = await entrar(canal, m.codigo, m.llave('r-dos'));
  const c = await entrar(canal, m.codigo, m.llave('r-tres'));
  await llevar(reloj, c, deNumero(0.3), deNumero(-1.5));
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS + REBOBINADO_MS);
  golpear(a, 0);
  const das = a.enchufe.de('da');
  comprobar(
    'con B a dos unidades y C a 1,5, los dos delante: un solo `da`, y para C, el más cercano',
    das.length === 1 && das[0]?.a === 'r-tres',
    das,
  );
  await llevar(reloj, a, deNumero(-40), 0);
  await llevar(reloj, c, deNumero(-39.4), deNumero(-1.8));
  await llevar(reloj, b, deNumero(-40.6), deNumero(-2.2));
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS + REBOBINADO_MS);
  golpear(a, 0);
  const otro = a.enchufe.ultimo('da');
  comprobar(
    'con C más cerca pero detrás de un muro, y B más lejos y a la vista: le da a B, uno solo',
    a.enchufe.de('da').length === 2 && otro?.a === 'r-dos',
    a.enchufe.de('da'),
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 19 · EL REBOBINADO
// ---------------------------------------------------------------------------

paso(`El rebobinado: se le ve donde lo veía quien golpeó, hasta ${String(REBOBINADO_MS)} ms atrás; y ni uno más`);

{
  comprobar(
    'se rebobinan 250 ms: los 150 con que se pinta a los demás más 100 de ida y vuelta, y nunca más que el tope del contrato',
    REBOBINADO_MS === 250 && REBOBINADO_MS <= REBOBINADO_MAXIMO_MS,
    REBOBINADO_MS,
  );
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: ruedo(), asientos: ASIENTOS_DEL_RUEDO });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  const b = await entrar(canal, m.codigo, m.llave('r-dos'));
  await reloj.avanzar(1000);
  /* B se va del alcance en dos pasos de 1,5 unidades, y A golpea 230 ms después del primero. */
  andar(b, 0, deNumero(-3.5));
  await reloj.avanzar(50);
  andar(b, 0, deNumero(-5));
  await reloj.avanzar(180);
  golpear(a, 0);
  comprobar(
    'B se fue hace 230 ms y ya está a cinco unidades, pero A lo veía delante: le da',
    cuantos(b.enchufe, 'da') === 1 && b.x === 0 && b.z === deNumero(-5),
    b.enchufe.textos.slice(-2),
  );
  await llevar(reloj, b, 0, deNumero(-2));
  await reloj.avanzar(1000);
  andar(b, 0, deNumero(-3.5));
  await reloj.avanzar(50);
  andar(b, 0, deNumero(-5));
  await reloj.avanzar(260);
  golpear(a, 0);
  comprobar(
    'pero si se fue hace 310 ms, más de lo que se rebobina, no le da',
    cuantos(b.enchufe, 'da') === 1,
    b.enchufe.textos.slice(-2),
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 20 · CAER, EL CAÍDO, RENACER, EL INTOCABLE, Y `vidas`
// ---------------------------------------------------------------------------

paso('Caer y renacer: tres golpes y `cae`; el caído ni anda, ni golpea, ni recibe; `renace` lejos; el intocable; y `vidas`');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: ruedo(), asientos: ['r-uno', 'r-dos', 'r-tres', 'r-cuatro', 'r-cinco'] });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  comprobar(
    'al entrar, lo primero es `dentro` y justo después `vidas`, con TODOS los sentados, de pie y con la vida entera',
    a.enchufe.mensajes()[0]?.t === 'dentro' &&
      a.enchufe.mensajes()[1]?.t === 'vidas' &&
      vidasEn(a.enchufe).size === 5 &&
      [...vidasEn(a.enchufe).values()].every(([vida, estado]) => vida === VIDA_ENTERA && estado === DE_PIE),
    a.enchufe.textos.slice(0, 2),
  );
  const b = await entrar(canal, m.codigo, m.llave('r-dos'));
  const d = await entrar(canal, m.codigo, m.llave('r-cuatro'));
  /* D se aparta dos unidades al norte de su sitio de nacer (−60, 0), y mira al sur, hacia él. */
  await llevar(reloj, d, deNumero(-60), deNumero(-2));
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS);
  const pedidos = BOTINES_PEDIDOS.length;
  golpear(a, 0);
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
  golpear(a, 0);
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
  golpear(a, 0);
  const cayoEn = reloj.ahora();
  const cae = d.enchufe.ultimo('cae');
  comprobar(
    'tres golpes: `da` con 2, 1 y 0, y detrás `cae`, a toda la sala',
    b.enchufe.de('da').map((x) => x.vida).join(',') === '2,1,0' &&
      cae?.a === 'r-dos' &&
      cae.por === 'r-uno' &&
      cuantos(a.enchufe, 'cae') === 1 &&
      cuantos(b.enchufe, 'cae') === 1,
    d.enchufe.textos.slice(-4),
  );
  comprobar(
    'y se pide el botín a la mesa: lo pierde quien cae y se lo lleva quien lo tumbó',
    BOTINES_PEDIDOS.length === pedidos + 1 &&
      BOTINES_PEDIDOS[pedidos]?.codigo === m.codigo &&
      BOTINES_PEDIDOS[pedidos]?.pierde === 'r-dos' &&
      BOTINES_PEDIDOS[pedidos]?.gana === 'r-uno',
    BOTINES_PEDIDOS.slice(pedidos),
  );
  await reloj.avanzar(200);
  const ignorados = canal.diagnostico().ignorados;
  andar(b, b.x, b.z - deNumero(1));
  await reloj.avanzar(200);
  const tumbado = enLaFoto(a.enchufe, 'r-dos');
  comprobar(
    'el caído no anda: su paso se ignora sin corregirle, y la foto le sigue enseñando donde cayó, quieto',
    canal.diagnostico().ignorados === ignorados + 1 &&
      cuantos(b.enchufe, 'corrige') === 0 &&
      tumbado !== undefined &&
      tumbado[1] === 0 &&
      tumbado[2] === deNumero(-2) &&
      tumbado[4] === 0,
    tumbado,
  );
  const lanzas = cuantos(a.enchufe, 'lanza');
  golpear(b, 128);
  comprobar('ni golpea: su golpe no da ni `lanza`', cuantos(a.enchufe, 'lanza') === lanzas, a.enchufe.textos.slice(-1));
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS);
  golpear(a, 0);
  comprobar(
    'ni se le golpea en el suelo: el golpe de A sale (`lanza`) y no le da',
    cuantos(a.enchufe, 'lanza') === lanzas + 1 && cuantos(b.enchufe, 'da') === 3,
    b.enchufe.textos.slice(-2),
  );
  const e = await entrar(canal, m.codigo, m.llave('r-cinco'));
  comprobar(
    'quien entra con alguien en el suelo lo sabe por `vidas`: sin vida y caído',
    JSON.stringify(vidasEn(e.enchufe).get('r-dos')) === JSON.stringify([0, CAIDO]),
    e.enchufe.ultimo('vidas'),
  );

  await reloj.avanzar(cayoEn + CAIDO_MS - 100 - reloj.ahora());
  comprobar('a CAIDO_MS menos 100 ms, sigue en el suelo', cuantos(b.enchufe, 'renace') === 0);
  await reloj.avanzar(200);
  const renace = d.enchufe.ultimo('renace');
  comprobar(
    'a los CAIDO_MS, `renace` a toda la sala',
    renace?.a === 'r-dos' && cuantos(a.enchufe, 'renace') === 1 && cuantos(b.enchufe, 'renace') === 1 && cuantos(e.enchufe, 'renace') === 1,
    d.enchufe.textos.slice(-2),
  );
  comprobar(
    'y lejos de quien lo tumbó: su sitio está a dos unidades de A, el siguiente lo ocupa quien no ha bajado, y el de después, libre desde que D se apartó, está a sesenta',
    renace?.x === deNumero(-60) && renace.z === 0,
    renace,
  );
  await reloj.avanzar(100);
  const nacido = enLaFoto(a.enchufe, 'r-dos');
  comprobar('y la foto le enseña ahí', nacido !== undefined && nacido[1] === deNumero(-60) && nacido[2] === 0, nacido);

  /* Lo que ya venía de camino desde donde cayó se calla; desde donde renació, se acepta. */
  const correcciones = cuantos(b.enchufe, 'corrige');
  andar(b, 0, deNumero(-3));
  comprobar('un paso que venía de camino desde donde cayó se ignora en silencio', cuantos(b.enchufe, 'corrige') === correcciones);

  /*
   * PASADO EL REBOBINADO Y DENTRO DE LO INTOCABLE. Justo al renacer, el rebobinado aún le ve donde
   * cayó —es lo que los demás tenían pintado—, así que un golpe entonces no le daría ni sin la
   * protección, y esta comprobación no probaría nada: se vio en verde con lo intocable quitado. A
   * los 250 ms ya se le ve donde renació, y lo único que le guarda es ser intocable.
   */
  await reloj.avanzar(REBOBINADO_MS);
  golpear(d, 128);
  comprobar(
    'recién nacido es intocable: pasado el rebobinado —que ya le ve donde renació— D, a dos unidades y mirándole, no le da',
    cuantos(b.enchufe, 'da') === 3 && cuantos(d.enchufe, 'lanza') > 0,
    b.enchufe.textos.slice(-2),
  );
  const vuelta = await entrar(canal, m.codigo, m.llave('r-cinco'));
  comprobar(
    'y quien vuelve a entrar lo sabe por su `vidas` nuevo: la vida entera, intocable',
    JSON.stringify(vidasEn(vuelta.enchufe).get('r-dos')) === JSON.stringify([VIDA_ENTERA, INTOCABLE]),
    vuelta.enchufe.ultimo('vidas'),
  );
  b.x = deNumero(-60);
  b.z = 0;
  await reloj.avanzar(50);
  comprobar('desde el sitio de renacer se anda: la validación sigue desde ahí', paso3(b, b.x + deNumero(0.3), b.z) === 'aceptado');
  await reloj.avanzar(INTOCABLE_MS);
  andar(b, deNumero(-60), 0);
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS + REBOBINADO_MS);
  golpear(d, 128);
  comprobar(
    'pasado INTOCABLE_MS, D sí le da',
    cuantos(b.enchufe, 'da') === 4 && b.enchufe.ultimo('da')?.de === 'r-cuatro' && b.enchufe.ultimo('da')?.vida === VIDA_ENTERA - 1,
    b.enchufe.textos.slice(-2),
  );

  /* Y LA PAREJA AL REVÉS es otra: B va hasta A y lo tumba, y hay botín. */
  const deVuelta = BOTINES_PEDIDOS.length;
  await llevar(reloj, b, 0, deNumero(-2));
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS + REBOBINADO_MS);
  for (let i = 0; i < 3; i++) {
    golpear(b, 128);
    await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
  }
  comprobar(
    'y la pareja al revés es otra pareja: cuando B tumba a A, también se pide botín',
    a.enchufe.ultimo('cae')?.a === 'r-uno' &&
      BOTINES_PEDIDOS.length === deVuelta + 1 &&
      BOTINES_PEDIDOS[deVuelta]?.pierde === 'r-uno' &&
      BOTINES_PEDIDOS[deVuelta]?.gana === 'r-dos',
    BOTINES_PEDIDOS.slice(deVuelta),
  );
  comprobar(
    'y el diagnóstico lo cuenta: golpes, aciertos, caídas y renacidas',
    canal.diagnostico().caidas === 2 && canal.diagnostico().renacidas === 1 && canal.diagnostico().aciertos === 7,
    { caidas: canal.diagnostico().caidas, renacidas: canal.diagnostico().renacidas, aciertos: canal.diagnostico().aciertos },
  );
  comprobar('todo lo mandado en la refriega lo lee el lector del aparato', [a, b, d, e, vuelta].every((x) => x.enchufe.ilegibles() === 0));
  canal.apagar();
}

{
  /*
   * EL MÁS CERCANO A DONDE CAYÓ, de los que están lejos de quien lo tumbó, aunque el suyo sea otro. A
   * tumba a V en (5, −2). Lejos de A —más de los 52,8 que éste corre mientras dura lo intocable—
   * están (−60, 0), que es EL SUYO (el segundo de la lista, como su asiento), a 65 de donde cayó;
   * (0, −60), a 58; y (60, 0), a 55. Renace en (60, 0): con la regla primera («el suyo, si está libre
   * y lejos») habría renacido en (−60, 0), y en Las Lindes eso llegaba a ser el otro lado del tablero.
   */
  const { canal, reloj } = canalNuevo();
  const mundo: MundoDeclarado = {
    ...ruedo(),
    nace: [
      { x: 0, z: 0, rumbo: 0 },
      { x: -60, z: 0, rumbo: 0 },
      { x: 0, z: -60, rumbo: 0 },
      { x: 60, z: 0, rumbo: 0 },
    ],
  };
  const m = mesaNueva({ mundo, asientos: ['r-uno', 'r-tres'] });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  const v = await entrar(canal, m.codigo, m.llave('r-tres'));
  await llevar(reloj, a, deNumero(5), 0);
  await llevar(reloj, v, deNumero(5), deNumero(-2));
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS + REBOBINADO_MS);
  for (let i = 0; i < 3; i++) {
    golpear(a, 0);
    await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
  }
  await reloj.avanzar(CAIDO_MS);
  const renace = a.enchufe.ultimo('renace');
  comprobar(
    'de los sitios libres lejos de quien lo tumbó —a más de los 52,8 que éste corre mientras dura lo intocable—, renace en el MÁS CERCANO a donde cayó, y no en el suyo',
    renace?.a === 'r-tres' && renace.x === deNumero(60) && renace.z === 0 && Math.round((LEJOS_AL_RENACER / U) * 10) === 528,
    renace,
  );
  canal.apagar();
}

{
  /*
   * EL MÁS LEJANO: si ningún sitio libre está lejos, el libre más lejano de quien lo tumbó. En el
   * prado —tres sitios a seis unidades— con A en (0, 3) y B cayendo en (0, 1): el suyo, (0, 6), está a
   * 3 de A; el de A, (0, 0), a 3; y (−6, 0) a 6,7. Ni el suyo ni el primero de la lista.
   */
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ asientos: ['a-uno', 'a-dos'] });
  const a = await entrar(canal, m.codigo, m.llave('a-uno'));
  const b = await entrar(canal, m.codigo, m.llave('a-dos'));
  await llevar(reloj, a, 0, deNumero(3));
  await llevar(reloj, b, 0, deNumero(1));
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS + REBOBINADO_MS);
  for (let i = 0; i < 3; i++) {
    golpear(a, 0);
    await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
  }
  await reloj.avanzar(CAIDO_MS);
  const renace = a.enchufe.ultimo('renace');
  comprobar(
    'sin ningún sitio libre lejos, renace en el libre MÁS LEJANO de quien lo tumbó, mirando hacia donde mira ese sitio',
    renace?.a === 'a-dos' && renace.x === deNumero(-6) && renace.z === 0 && renace.r === 64,
    renace,
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 21 · NADIE ES INMUNE POR NO BAJAR
// ---------------------------------------------------------------------------

paso('Nadie es inmune por no bajar: a quien nunca abrió su canal, y a quien lo cerró, se le golpea, se le tumba y se le pide botín');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: ruedo(), asientos: ['r-uno', 'r-dos'] });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  await reloj.avanzar(200);
  const quieto = enLaFoto(a.enchufe, 'r-dos');
  comprobar(
    'quien no ha bajado nunca está en la sala: en la foto, de pie en su sitio de nacer, y en `vidas`',
    quieto !== undefined && quieto[1] === 0 && quieto[2] === deNumero(-2) && quieto[4] === 0 && vidasEn(a.enchufe).has('r-dos'),
    quieto,
  );
  const pedidos = BOTINES_PEDIDOS.length;
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS);
  for (let i = 0; i < 3; i++) {
    golpear(a, 0);
    await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
  }
  comprobar(
    'y se le golpea y se le tumba: `da` tres veces y `cae`',
    a.enchufe.de('da').filter((x) => x.a === 'r-dos').length === 3 && a.enchufe.ultimo('cae')?.a === 'r-dos',
    a.enchufe.textos.slice(-4),
  );
  comprobar(
    'y se le pide su botín, como a cualquiera',
    BOTINES_PEDIDOS.length === pedidos + 1 && BOTINES_PEDIDOS[pedidos]?.pierde === 'r-dos',
    BOTINES_PEDIDOS.slice(pedidos),
  );
  await reloj.avanzar(CAIDO_MS);
  comprobar('y renace sin canal, y se le dice a la sala', a.enchufe.ultimo('renace')?.a === 'r-dos', a.enchufe.textos.slice(-2));
  const baja = await entrar(canal, m.codigo, m.llave('r-dos'));
  const renace = a.enchufe.ultimo('renace');
  comprobar(
    'y cuando por fin baja, aparece donde renació y no en su sitio de nacer',
    renace !== undefined && baja.x === renace.x && baja.z === renace.z && baja.z !== deNumero(-2),
    [baja.x / U, baja.z / U],
  );
  canal.apagar();
}

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: ruedo(), asientos: ['r-uno', 'r-dos'] });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  const b = await entrar(canal, m.codigo, m.llave('r-dos'));
  await reloj.avanzar(100);
  b.conexion.seCerro();
  await reloj.avanzar(GRACIA_AL_IRSE_MS + RECARGA_DEL_GOLPE_MS);
  golpear(a, 0);
  comprobar(
    'a quien CERRÓ su canal también: sigue donde estaba y el golpe le da',
    a.enchufe.ultimo('da')?.a === 'r-dos' && a.enchufe.ultimo('da')?.vida === VIDA_ENTERA - 1,
    a.enchufe.textos.slice(-2),
  );
  const vuelve = await entrar(canal, m.codigo, m.llave('r-dos'));
  comprobar(
    'y al volver, vuelve con la vida que tenga, y lo sabe por su `vidas`',
    JSON.stringify(vidasEn(vuelve.enchufe).get('r-dos')) === JSON.stringify([VIDA_ENTERA - 1, DE_PIE]),
    vuelve.enchufe.ultimo('vidas'),
  );
  canal.apagar();
}

{
  /*
   * LA SALA SE VA, EL LIBRO SE QUEDA: A tumba a B —que no baja—, se va, la sala se borra a los cinco
   * segundos y con ella las vidas; A vuelve, vuelve a tumbar a B antes del minuto, y NO hay botín.
   */
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: ruedo(), asientos: ['r-uno', 'r-dos'] });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS);
  const pedidos = BOTINES_PEDIDOS.length;
  for (let i = 0; i < 3; i++) {
    golpear(a, 0);
    await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
  }
  a.conexion.seCerro();
  await reloj.avanzar(GRACIA_AL_IRSE_MS + 100);
  comprobar('sin nadie con canal, la sala se borra a los cinco segundos', canal.diagnostico().salas === 0, canal.diagnostico().salas);
  const otraVez = await entrar(canal, m.codigo, m.llave('r-uno'));
  comprobar(
    'y la sala nueva empieza de cero: B de pie en su sitio y con la vida entera',
    JSON.stringify(vidasEn(otraVez.enchufe).get('r-dos')) === JSON.stringify([VIDA_ENTERA, DE_PIE]),
    otraVez.enchufe.ultimo('vidas'),
  );
  const porPareja = canal.diagnostico().botines.porPareja;
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS);
  for (let i = 0; i < 3; i++) {
    golpear(otraVez, 0);
    await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
  }
  comprobar(
    'pero el libro de botines no se fue con ella: la misma pareja, antes del minuto, no cobra otra vez',
    otraVez.enchufe.ultimo('cae')?.a === 'r-dos' &&
      BOTINES_PEDIDOS.length === pedidos + 1 &&
      canal.diagnostico().botines.porPareja === porPareja + 1,
    { pedidos: BOTINES_PEDIDOS.length - pedidos, porPareja: canal.diagnostico().botines.porPareja - porPareja },
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 22 · LOS TOPES DEL BOTÍN
// ---------------------------------------------------------------------------

paso(`Los topes del botín: una vez por pareja cada ${String(BOTIN_CADA_PAREJA_MS / 1000)} s, ${String(TOPE_DE_BOTINES_POR_MINUTO)} por mesa y minuto, y sólo cuenta lo que ENTRA`);

/**
 * UNA REFRIEGA EN EL CORRO: A y Z tumban, a la vez, a los cuatro que tienen alrededor —norte, este,
 * sur y oeste— sin que ninguno de ellos haya bajado. Devuelve el canal, el reloj y los dos que
 * golpean, para seguir.
 */
async function refriegaEnElCorro(botines: (SalidaDelBotin | 'lanza')[]): Promise<{
  canal: CanalDeBotas;
  reloj: RelojDeMentira;
  codigo: string;
  a: Dentro;
  z: Dentro;
}> {
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: corro(), asientos: EN_EL_CORRO.map(([id]) => id), botines });
  const a = await entrar(canal, m.codigo, m.llave('c-a'));
  const z = await entrar(canal, m.codigo, m.llave('c-z'));
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS);
  for (const r of [0, 64, 128, 192]) {
    for (let i = 0; i < 3; i++) {
      golpear(a, r);
      golpear(z, r);
      await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
    }
  }
  return { canal, reloj, codigo: m.codigo, a, z };
}

/** Tumba otra vez al que está al norte de `d`: tres golpes. */
async function tumbarAlDelNorte(reloj: RelojDeMentira, d: Dentro): Promise<void> {
  for (let i = 0; i < 3; i++) {
    golpear(d, 0);
    await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
  }
}

/** Un paso de nada y vuelta, para que el «quieto» no cierre a quien lleva un rato golpeando sin moverse. */
async function menearse(reloj: RelojDeMentira, d: Dentro): Promise<void> {
  const x = d.x;
  await reloj.avanzar(50);
  andar(d, x + deNumero(0.1), d.z, 1);
  await reloj.avanzar(50);
  andar(d, x, d.z, 0);
}

{
  const pedidos = BOTINES_PEDIDOS.length;
  const { canal, reloj, codigo, a, z } = await refriegaEnElCorro([]);
  const deEsta = (): typeof BOTINES_PEDIDOS => BOTINES_PEDIDOS.slice(pedidos).filter((p) => p.codigo === codigo);
  comprobar(
    'ocho caídas de ocho parejas distintas en diez segundos: seis botines ENTRAN y el séptimo y el octavo no se piden, por el tope de la mesa',
    a.enchufe.de('cae').length === 8 &&
      deEsta().length === TOPE_DE_BOTINES_POR_MINUTO &&
      canal.diagnostico().botines.entro === 6 &&
      canal.diagnostico().botines.porTope === 2,
    { caidas: a.enchufe.de('cae').length, pedidos: deEsta().length, botines: canal.diagnostico().botines },
  );
  /* El del norte de A cayó el primero y ya ha renacido —en su sitio, el único libre— y dejado de ser intocable. */
  await reloj.avanzar(INTOCABLE_MS);
  await tumbarAlDelNorte(reloj, a);
  comprobar(
    'la misma pareja otra vez antes del minuto: no se pide, por la pareja (se mira antes que el tope)',
    a.enchufe.ultimo('cae')?.a === 'a-n' && deEsta().length === TOPE_DE_BOTINES_POR_MINUTO && canal.diagnostico().botines.porPareja === 1,
    canal.diagnostico().botines,
  );
  for (let s = 0; s < 5; s++) {
    await reloj.avanzar(10_000);
    await menearse(reloj, a);
    await menearse(reloj, z);
  }
  await tumbarAlDelNorte(reloj, a);
  comprobar(
    'y pasado el minuto, la pareja y la mesa vuelven a cobrar',
    a.enchufe.ultimo('cae')?.a === 'a-n' && deEsta().length === TOPE_DE_BOTINES_POR_MINUTO + 1,
    { pedidos: deEsta().length, botines: canal.diagnostico().botines },
  );
  comprobar('y ninguno de los dos que golpean se ha cerrado por quieto', a.enchufe.cierre === null && z.enchufe.cierre === null, [a.enchufe.cierre, z.enchufe.cierre]);
  canal.apagar();
}

{
  const pedidos = BOTINES_PEDIDOS.length;
  const { canal, reloj, codigo, a } = await refriegaEnElCorro(['sinEfecto', 'sinEfecto', 'sinEfecto', 'sinEfecto', 'sinEfecto', 'sinEfecto']);
  const deEsta = (): typeof BOTINES_PEDIDOS => BOTINES_PEDIDOS.slice(pedidos).filter((p) => p.codigo === codigo);
  comprobar(
    'si los seis primeros no entran —sin efecto—, no gastan el tope: el séptimo y el octavo sí se piden',
    deEsta().length === 8 && canal.diagnostico().botines.sinEfecto === 6 && canal.diagnostico().botines.porTope === 0,
    canal.diagnostico().botines,
  );
  await reloj.avanzar(INTOCABLE_MS);
  await tumbarAlDelNorte(reloj, a);
  comprobar(
    'ni la pareja: la que no cobró, vuelve a pedirlo aunque no haya pasado el minuto',
    deEsta().length === 9 && canal.diagnostico().botines.porPareja === 0,
    canal.diagnostico().botines,
  );
  canal.apagar();
}

{
  const lineas = LO_QUE_SE_REGISTRA.length;
  const { canal, reloj, a } = await refriegaEnElCorro(['lanza', 'rechazado', 'terminada', 'apartado', 'sinMesa']);
  await reloj.avanzar(100);
  const b = canal.diagnostico().botines;
  comprobar(
    'y cada salida de la mesa se cuenta aparte —cinco raras y, de las ocho caídas, tres que entran—; la que revienta, como fallo y dicho en el registro, sin tumbar la sala',
    b.fallos === 1 &&
      b.rechazado === 1 &&
      b.terminada === 1 &&
      b.apartado === 1 &&
      b.sinMesa === 1 &&
      b.entro === 3 &&
      LO_QUE_SE_REGISTRA.slice(lineas).some((l) => l.includes('botín') && l.includes('no ha podido entrar')) &&
      a.enchufe.cierre === null,
    { botines: b, registro: LO_QUE_SE_REGISTRA.slice(lineas) },
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 23 · LO QUE SE PUEDE PERDER Y LO QUE NO, CON EL CANAL ATASCADO
// ---------------------------------------------------------------------------

paso('Con el canal atascado: `corrige` y `lanza` se saltan; `da` y `dentro` cierran con `atascado`; el `fuera` de quien se cierra, también se salta');

{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ mundo: ruedo(), asientos: ASIENTOS_DEL_RUEDO });
  const a = await entrar(canal, m.codigo, m.llave('r-uno'));
  const b = await entrar(canal, m.codigo, m.llave('r-dos'));
  await reloj.avanzar(300);
  /* Un paso sin moverse acaba la corrección pendiente del `dentro`: lo que venga lejos ya se corrige. */
  andar(a, a.x, a.z, 0);

  a.enchufe.atasco = ATASCO_BYTES + 1;
  const corriges = cuantos(a.enchufe, 'corrige');
  const saltados = canal.diagnostico().saltados;
  const presupuesto = canal.diagnostico().correcciones.presupuesto;
  a.n++;
  a.conexion.recibir(aqui(a.n, a.x + deNumero(50), a.z));
  comprobar(
    'un `corrige` a un canal atascado se salta —y se cuenta—, pero la corrección queda hecha',
    cuantos(a.enchufe, 'corrige') === corriges &&
      canal.diagnostico().saltados === saltados + 1 &&
      canal.diagnostico().correcciones.presupuesto === presupuesto + 1 &&
      a.enchufe.cierre === null,
    canal.diagnostico(),
  );
  a.enchufe.atasco = 0;
  await reloj.avanzar(RECORDAR_LA_CORRECCION_MS + 50);
  a.n++;
  a.conexion.recibir(aqui(a.n, a.x + deNumero(50), a.z));
  comprobar(
    'y como seguía pendiente, al insistir desde el sitio malo con el canal ya libre se le repite',
    cuantos(a.enchufe, 'corrige') === corriges + 1 && a.enchufe.ultimo('corrige')?.x === a.x && canal.diagnostico().correcciones.repetida === 1,
    { textos: a.enchufe.textos.slice(-1), correcciones: canal.diagnostico().correcciones },
  );

  b.enchufe.atasco = ATASCO_BYTES + 1;
  const lanzasDeB = cuantos(b.enchufe, 'lanza');
  golpear(a, 128);
  comprobar(
    'un `lanza` a un canal atascado se salta, y el canal sigue abierto',
    cuantos(b.enchufe, 'lanza') === lanzasDeB && cuantos(a.enchufe, 'lanza') === 1 && b.enchufe.cierre === null,
    b.enchufe.textos.slice(-1),
  );
  await reloj.avanzar(RECARGA_DEL_GOLPE_MS + REBOBINADO_MS);
  golpear(a, 0);
  comprobar(
    'pero un `da` no se salta: al atascado se le cierra con `atascado` (4008), sin un `fuera` que no le cabe',
    b.enchufe.cierre?.codigo === CIERRE.atascado && cuantos(b.enchufe, 'da') === 0 && cuantos(b.enchufe, 'fuera') === 0 && canal.diagnostico().cierres.atascado === 1,
    { cierre: b.enchufe.cierre, textos: b.enchufe.textos.slice(-2) },
  );
  await reloj.avanzar(200);
  comprobar(
    'y a los demás el `da` les llega, y su asiento sigue en la sala',
    a.enchufe.ultimo('da')?.a === 'r-dos' && enLaFoto(a.enchufe, 'r-dos') !== undefined,
    a.enchufe.textos.slice(-2),
  );

  const nacido = new EnchufeDeMentira();
  nacido.atasco = ATASCO_BYTES + 1;
  canal.abrir(m.codigo, nacido).recibir(hola(m.llave('r-tres')));
  await vaciar();
  comprobar(
    'y un canal que no da abasto ni para su `dentro` no se queda a medias: se cierra con `atascado`, sin nada dentro',
    nacido.cierre?.codigo === CIERRE.atascado && nacido.textos.length === 0,
    { cierre: nacido.cierre, textos: nacido.textos },
  );
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 13 · PASEOS LEGALES DE VERDAD, SOBRE LOS MUNDOS DE VERDAD
// ---------------------------------------------------------------------------

paso('Paseos legales con `pasoDelTic` sobre Las Lindes llenas y el Burgo: no se corrigen');

/** Un sorteo sembrado: el mismo número, el mismo paseo. */
function sorteo(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return x / 4294967296;
  };
}

async function pasearPorElCanal(nombre: string, arcade: string, mundo: MundoDeclarado, pasos: number, semilla: number): Promise<void> {
  const { canal, reloj } = canalNuevo();
  const arena = arenaDe(mundo);
  const m = mesaNueva({ arcade, mundo, asientos: ['a-uno', 'a-dos', 'a-tres', 'a-cuatro', 'a-cinco'] });
  const gente: Dentro[] = [];
  for (const a of ['a-uno', 'a-dos', 'a-tres', 'a-cuatro', 'a-cinco']) gente.push(await entrar(canal, m.codigo, m.llave(a)));
  const azar = sorteo(semilla);
  const rumbos = gente.map(() => Math.floor(azar() * 256));
  let dados = 0;
  let conMovimiento = 0;
  let laRectaSola = 0;
  for (let t = 0; t < pasos; t++) {
    await reloj.avanzar(50);
    for (let i = 0; i < gente.length; i++) {
      const q = gente[i] as Dentro;
      if (azar() < 0.08) rumbos[i] = Math.floor(azar() * 256);
      const marcha = azar() < 0.6 ? 2 : 1;
      const desde = { x: q.x, z: q.z };
      const hasta = pasoDelTic(arena, desde, rumbos[i] as number, marcha);
      if (hasta.x === desde.x && hasta.z === desde.z) rumbos[i] = Math.floor(azar() * 256);
      else {
        conMovimiento++;
        if (!seAndaEnRecta(arena, desde, hasta, RADIO_DEL_PASEANTE)) laRectaSola++;
      }
      andar(q, hasta.x, hasta.z, marcha);
      dados++;
    }
  }
  const d = canal.diagnostico();
  const correcciones = d.correcciones.presupuesto + d.correcciones.estructura + d.correcciones.repetida;
  console.log(
    `  ${nombre}: ${String(dados)} pasos (${String(conMovimiento)} moviéndose), ${String(d.aceptados)} aceptados, ` +
      `${String(d.porEscuadra)} por escuadra, ${String(correcciones)} correcciones; la recta sola habría corregido ${String(laRectaSola)}`,
  );
  comprobar(`${nombre}: se han dado de verdad los pasos (suelo)`, conMovimiento >= pasos * 5 * 0.9, { conMovimiento });
  comprobar(`${nombre}: ningún paso legal se corrige`, correcciones === 0, d.correcciones);
  comprobar(
    `${nombre}: y el paseo pasa por esquinas —la recta sola habría corregido alguno—, o esto no probaría la escuadra`,
    laRectaSola > 0 && d.porEscuadra === laRectaSola,
    { laRectaSola, porEscuadra: d.porEscuadra },
  );
  comprobar(`${nombre}: nadie se ha cerrado`, gente.every((q) => q.enchufe.cierre === null), gente.map((q) => q.enchufe.cierre));
  comprobar(`${nombre}: todo lo mandado se lee con el lector del aparato`, gente.every((q) => q.enchufe.ilegibles() === 0));
  comprobar(
    `${nombre}: cada foto trae a los cinco, sin repetir ninguno`,
    gente.every((q) => q.enchufe.fotosConAsientoRepetido() === 0 && (q.enchufe.ultimo('foto')?.p.length ?? 0) === 5),
  );
  /* Y la foto siguiente dice dónde está cada uno, que es donde se le aceptó el último paso. */
  await reloj.avanzar(100);
  const ultima = (gente[0] as Dentro).enchufe.ultimo('foto');
  comprobar(
    `${nombre}: la foto dice dónde está cada uno, al bit`,
    ultima !== undefined && gente.every((q, i) => ultima.p.some((e) => e[0] === ['a-uno', 'a-dos', 'a-tres', 'a-cuatro', 'a-cinco'][i] && e[1] === q.x && e[2] === q.z)),
  );
  canal.apagar();
}

{
  const partida = jugarLasLindes(1, 3);
  const vista = loQueSeVe(partida.estado, ESPECTADOR, NADIE_SENTADO);
  const lindes = mundoDeLaMesa('lindes', vista, 'LIN01');
  comprobar('el mundo de una Lindes llena se deriva', lindes !== null && lindes.cuerpos.length > 500, lindes?.cuerpos.length);
  if (lindes !== null) await pasearPorElCanal('Las Lindes llenas', 'lindes', lindes, 1200, 3);
  const burgo = mundoDeLaMesa('burgo', null, 'BURG1');
  comprobar('el mundo del Burgo se deriva', burgo !== null && burgo.cuerpos.length > 500, burgo?.cuerpos.length);
  if (burgo !== null) await pasearPorElCanal('El Burgo', 'burgo', burgo, 1200, 5);
}

// ---------------------------------------------------------------------------
// 14 · LA RUTA Y EL ORIGEN, Y QUE LA LLAVE NO SE ESCRIBE
// ---------------------------------------------------------------------------

paso('La ruta del canal, el origen, que ninguna llave llega al registro, y que una subida que revienta no tira el servidor');

{
  comprobar('la ruta del contrato da su código', codigoDeLaRuta('/api/arcade/mesas/AB2CD/botas') === 'AB2CD');
  comprobar('en minúsculas también, y sale en mayúsculas', codigoDeLaRuta('/api/arcade/mesas/ab2cd/botas') === 'AB2CD');
  comprobar('con una consulta detrás, también', codigoDeLaRuta('/api/arcade/mesas/AB2CD/botas?x=1') === 'AB2CD');
  for (const ruta of ['/api/arcade/mesas/AB2CD', '/api/arcade/mesas/AB2CD/botas/mas', '/api/arcade/mesas//botas', '/api/arcade/mesas/A%2FB/botas', '/api/arcade/mesas/%E0%A4%A/botas', '/botas', undefined]) {
    comprobar(`«${String(ruta)}» no es la ruta del canal`, codigoDeLaRuta(ruta) === null, codigoDeLaRuta(ruta));
  }
  const casa = { produccion: true, publico: 'https://harkania.com', extra: [] as string[] };
  comprobar('sin `Origin` se admite (curl, los comprobadores)', origenAdmitido(undefined, 'harkania.onrender.com', casa));
  comprobar('un origen propio se admite', origenAdmitido('https://harkania.onrender.com', 'harkania.onrender.com', casa));
  comprobar(
    'el MISMO origen que el anfitrión se admite: es lo que manda React Native contra el portátil',
    origenAdmitido('http://192.168.1.50:5174', '192.168.1.50:5174', { ...casa, produccion: false }),
  );
  comprobar('un origen ajeno, no', !origenAdmitido('https://malvado.example', 'harkania.onrender.com', casa));
  comprobar('`null`, no', !origenAdmitido('null', 'harkania.onrender.com', casa));
  comprobar('el bucle local en producción, no', !origenAdmitido('http://localhost:5175', 'harkania.onrender.com', casa));
  comprobar('fuera de producción, sí', origenAdmitido('http://localhost:5175', 'localhost:5231', { ...casa, produccion: false }));
  comprobar(
    'un origen que se parece al propio, no',
    !origenAdmitido('https://harkania.onrender.com.malvado.example', 'harkania.onrender.com', casa),
  );

  const conLlave = LO_QUE_SE_REGISTRA.filter((l) => /llave-PR\d+-/.test(l) || l.includes('X'.repeat(24)));
  comprobar(
    'ninguna línea del registro lleva una llave',
    LO_QUE_SE_REGISTRA.length > 0 && conLlave.length === 0,
    { lineas: LO_QUE_SE_REGISTRA.length, conLlave },
  );
}

{
  /*
   * UNA SUBIDA QUE REVIENTA DENTRO DEL CANAL se lleva su enchufe y nada más. El `upgrade` corre en
   * un evento del servidor HTTP: lo que se escapara de él llegaría a `uncaughtException`, que en
   * `index.ts` termina el proceso —con las mesas de todos—. Aquí el canal revienta al abrir, a
   * propósito, y se mira que el aparato ve su enchufe caído, que no se escapa nada y que el servidor
   * sigue atendiendo.
   */
  const escapadas: string[] = [];
  const alEscaparse = (e: unknown): void => {
    escapadas.push(e instanceof Error ? e.message : String(e));
  };
  process.on('uncaughtException', alEscaparse);
  const quePetardea = {
    abrir: () => {
      throw new Error('el canal revienta al abrir');
    },
    contarOrigenNegado: () => {},
  } as unknown as CanalDeBotas;
  const servidor = http.createServer((_peticion, respuesta) => {
    respuesta.statusCode = 404;
    respuesta.end();
  });
  enchufarElCanal(servidor, quePetardea, { produccion: false, extra: [] });
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', () => r()));
  const puerto = (servidor.address() as AddressInfo).port;
  const abiertos: WebSocket[] = [];
  const intento = (): Promise<string> =>
    new Promise<string>((r) => {
      const ws = new WebSocket(`ws://127.0.0.1:${String(puerto)}${rutaDelCanal('AB2CD')}`, { handshakeTimeout: 3000 });
      abiertos.push(ws);
      const plazo = setTimeout(() => r('sigue abierto'), 2000);
      ws.on('close', (c) => {
        clearTimeout(plazo);
        r(`cerrado ${String(c)}`);
      });
      ws.on('error', (e) => {
        clearTimeout(plazo);
        r(`error: ${e.message}`);
      });
    });
  const primero = await intento();
  comprobar('una subida que revienta dentro del canal se cierra: el aparato ve su enchufe caído', primero !== 'sigue abierto', primero);
  comprobar('y no se escapa nada a `uncaughtException`, que en `index.ts` termina el proceso', escapadas.length === 0, escapadas);
  const segundo = await intento();
  const normal = await new Promise<number>((r) => {
    http
      .get(`http://127.0.0.1:${String(puerto)}/`, (respuesta) => {
        respuesta.resume();
        r(respuesta.statusCode ?? 0);
      })
      .on('error', () => r(0));
  });
  comprobar(
    'y el servidor sigue atendiendo: otra subida igual se cierra igual, y una petición normal se contesta',
    segundo !== 'sigue abierto' && normal === 404 && escapadas.length === 0,
    { segundo, normal, escapadas },
  );
  for (const ws of abiertos) ws.terminate();
  servidor.closeAllConnections();
  await Promise.race([
    new Promise<void>((r) => servidor.close(() => r())),
    new Promise<void>((r) => setTimeout(r, 2000)),
  ]);
  process.off('uncaughtException', alEscaparse);
}

// ---------------------------------------------------------------------------
// 14 BIS · LA VÍA INTERNA DE LA MESA, CON LAS MESAS DE VERDAD DE LOS TRES JUEGOS
// ---------------------------------------------------------------------------

paso('La vía interna de la mesa: el botín por la puerta de la plataforma, con mesas de verdad de los tres juegos');

/*
 * A MANO Y AQUÍ, NO ARRIBA: `mesas.ts` lee su carpeta al cargarse, y la de esta prueba se puso al
 * principio del fichero (`CARPETA_DE_MESAS`). Esto y la parte siguiente usan la MISMA carga.
 */
await import('../../shared/arcade/juegos');
const mesas = await import('../src/arcade/mesas');
const botas = await import('../src/botas/index');
const presupuesto = await import('../src/arcade/presupuesto');
{
  const dadas = botas.darDeAltaLosQueSeRecorren();
  comprobar('el alta del arranque da de alta Las Lindes, que se recorre', dadas.includes('lindes'), dadas);
}

/** Lo que de verdad se guardó de una mesa: su fichero en la carpeta de esta prueba. `null` si no hay. */
interface Guardada {
  readonly texto: string;
  readonly rev: number;
  readonly diario: readonly { movimiento: { tipo: string; carga?: unknown }; ctx: { quien: string | null; asientos: string[] } }[];
}
function guardada(codigo: string): Guardada | null {
  try {
    const texto = fs.readFileSync(path.join(CARPETA_DE_MESAS, `${codigo}.json`), 'utf8');
    const leido = JSON.parse(texto) as { mesa: { mesa: { rev: number; diario: Guardada['diario'] } } };
    return { texto, rev: leido.mesa.mesa.rev, diario: leido.mesa.mesa.diario };
  } catch {
    return null;
  }
}

/** Una mesa `botas` de verdad con Ana y Bea sentadas, empezada con la opción que ofrece el juego si se pide. */
async function mesaDeVerdad(
  arcade: string,
  empezar: string | null,
  plazoSegundos = 0,
): Promise<{ codigo: string; ana: { id: string; llave: string }; bea: { id: string; llave: string } }> {
  const abierta = await mesas.abrir({ arcade, nombre: 'Ana', modalidad: 'botas', plazoSegundos });
  const codigo = abierta.mesa.codigo;
  const bea = await mesas.sentarse(codigo, 'Bea');
  if (empezar !== null) {
    const vista = await mesas.mirar(codigo, abierta.silla.llave);
    const opcion = vista.opciones.find((o) => o.tipo === empezar);
    await mesas.mover(codigo, abierta.silla.llave, vista.rev, { tipo: empezar, carga: opcion?.carga ?? null });
  }
  return { codigo, ana: abierta.silla, bea };
}

/**
 * LA VÍA INTERNA, SIN QUE UNA EXCEPCIÓN SE LLEVE POR DELANTE LA PRUEBA: lo que lanza sale como una
 * salida más (`lanzó`), para que la comprobación que lo mira se ponga roja con su nombre en vez de
 * tumbar el comprobador entero a mitad.
 */
async function meter(
  codigo: string,
  movimiento: { tipo: string; carga?: unknown },
): Promise<SalidaDeLaPlataforma | { readonly salida: 'lanzó'; readonly error: string }> {
  try {
    return await mesas.meterDeLaPlataforma(codigo, movimiento);
  } catch (error) {
    return { salida: 'lanzó', error: error instanceof Error ? error.message : String(error) };
  }
}

/** Lo que lanza, o `null`. Para las puertas que tienen que negarse con una excepción. */
async function loQueLanza(hacer: () => Promise<unknown> | unknown): Promise<unknown> {
  try {
    await hacer();
    return null;
  } catch (error) {
    return error;
  }
}

const dineroDe = (vista: unknown, asiento: string): number =>
  (vista as { jugadores: { asiento: string; mrs: number }[] }).jugadores.find((j) => j.asiento === asiento)?.mrs ?? NaN;

{
  /* ENTRA: El Burgo empezado, donde todos llevan dinero. */
  const burgo = await mesaDeVerdad('burgo', 'burgo:empezar');
  const antes = await mesas.mirar(burgo.codigo, null);
  const r = await meter(burgo.codigo, movimientoDelBotin(burgo.bea.id, burgo.ana.id));
  const despues = await mesas.mirar(burgo.codigo, null);
  comprobar(
    'El Burgo empezado: el botín ENTRA, sube la revisión en uno y se guarda',
    r.salida === 'entro' && r.subio && r.guardada && r.rev === antes.rev + 1 && despues.rev === antes.rev + 1,
    { r, antes: antes.rev, despues: despues.rev },
  );
  const bea0 = dineroDe(antes.vista, burgo.bea.id);
  const bea1 = dineroDe(despues.vista, burgo.bea.id);
  const ana0 = dineroDe(antes.vista, burgo.ana.id);
  const ana1 = dineroDe(despues.vista, burgo.ana.id);
  comprobar(
    'y `mirar` enseña lo que cambió de manos: lo que pierde Bea lo gana Ana',
    bea1 < bea0 && bea0 - bea1 === ana1 - ana0,
    { bea: [bea0, bea1], ana: [ana0, ana1] },
  );
  const g = guardada(burgo.codigo);
  const ultimo = g?.diario[g.diario.length - 1];
  comprobar(
    'y en el diario del disco, como un movimiento más: en nombre de NADIE y con los sentados en el contexto',
    g !== null &&
      r.salida === 'entro' &&
      g.rev === r.rev &&
      ultimo?.movimiento.tipo === 'arcade:botin' &&
      ultimo.ctx.quien === null &&
      JSON.stringify(ultimo.ctx.asientos) === JSON.stringify([burgo.ana.id, burgo.bea.id]),
    ultimo,
  );
  comprobar(
    'un botín no pasa el turno, así que no le toca los relojes a nadie: `turnoDesde` igual',
    despues.turnoDesde === antes.turnoDesde,
    { antes: antes.turnoDesde, despues: despues.turnoDesde },
  );

  /* APARTADO: el arcade en cuarentena no acepta nada, y la mesa se queda como estaba. */
  try {
    presupuesto.pesarElEstado('burgo', 'x'.repeat(presupuesto.TOPE_BYTES + 16));
  } catch {
    /* se aparta, que es lo que se quería */
  }
  const enCuarentena = await meter(burgo.codigo, movimientoDelBotin(burgo.bea.id, burgo.ana.id));
  const tras = await mesas.mirar(burgo.codigo, null);
  comprobar(
    'con el arcade apartado por el presupuesto: `apartado`, y ni la revisión ni el dinero se mueven',
    enCuarentena.salida === 'apartado' && tras.rev === despues.rev && dineroDe(tras.vista, burgo.bea.id) === bea1,
    enCuarentena,
  );
  presupuesto.olvidarLoMedido();

  /* Y LA PUERTA NO SE ABRE A NADA MÁS. */
  const deUnJuego = await meter(burgo.codigo, { tipo: 'burgo:tirar' });
  const elTic = await meter(burgo.codigo, { tipo: 'arcade:tic' });
  comprobar(
    'por la vía interna no entra un movimiento de un juego, ni el tic —que tiene su puerta y adelanta el reloj—',
    deUnJuego.salida === 'lanzó' && elTic.salida === 'lanzó' && (await mesas.mirar(burgo.codigo, null)).rev === tras.rev,
    [deUnJuego, elTic],
  );
  const porLaPublica = await loQueLanza(async () => {
    const v = await mesas.mirar(burgo.codigo, burgo.ana.llave);
    return mesas.mover(burgo.codigo, burgo.ana.llave, v.rev, movimientoDelBotin(burgo.bea.id, burgo.ana.id));
  });
  comprobar(
    'y `mover`, la puerta de los aparatos, sigue negando el prefijo `arcade:` aunque sea el botín',
    porLaPublica instanceof mesas.MovimientoReservado,
    String(porLaPublica),
  );
  {
    const sinNadie = abrirMesaDelArbitro({ id: 'ARB01', arcade: 'burgo', semilla: 1, asientos: ['a', 'b'] });
    const deJuego = await loQueLanza(() => meterEnElArbitro(sinNadie, { tipo: 'burgo:tirar' }));
    const tic = await loQueLanza(() => meterEnElArbitro(sinNadie, { tipo: 'arcade:tic' }));
    const acabada = await loQueLanza(() => meterEnElArbitro(cerrarMesaDelArbitro(sinNadie), movimientoDelBotin('a', 'b')));
    comprobar(
      'y la puerta del árbitro se niega ella misma, la llame quien la llame: ni un tipo de juego, ni el tic, ni una mesa terminada',
      deJuego instanceof Error &&
        !(deJuego instanceof MovimientoRechazado) &&
        tic instanceof Error &&
        !(tic instanceof MovimientoRechazado) &&
        acabada instanceof MovimientoRechazado &&
        acabada.motivo === 'mesa-terminada',
      [String(deJuego), String(tic), String(acabada)],
    );
  }
}

{
  /* SIN EFECTO: Riberas recién empezada, colocando, sin una ficha en ningún almacén. */
  const riberas = await mesaDeVerdad('riberas', 'riberas:empezar');
  const antes = guardada(riberas.codigo);
  const r = await meter(riberas.codigo, movimientoDelBotin(riberas.bea.id, riberas.ana.id));
  const despues = guardada(riberas.codigo);
  comprobar(
    'Riberas colocando, sin nada que llevarse: `sinEfecto`, sin subir la revisión y sin tocar el disco',
    r.salida === 'sinEfecto' && !r.subio && antes !== null && despues !== null && despues.texto === antes.texto,
    { r, antes: antes?.rev, despues: despues?.rev },
  );
}

{
  /* RECHAZADO: Las Lindes sin empezar. Y TERMINADA, y SIN MESA. */
  const lindes = await mesaDeVerdad('lindes', null);
  const antes = guardada(lindes.codigo);
  const r = await meter(lindes.codigo, movimientoDelBotin(lindes.bea.id, lindes.ana.id));
  comprobar(
    'Las Lindes sin empezar: `rechazado` con el motivo del juego, sin subir la revisión ni tocar el disco',
    r.salida === 'rechazado' && r.motivo.includes('no ha empezado') && !r.subio && guardada(lindes.codigo)?.texto === antes?.texto,
    r,
  );
  await mesas.cerrar(lindes.codigo, lindes.ana.llave);
  const acabada = await meter(lindes.codigo, movimientoDelBotin(lindes.bea.id, lindes.ana.id));
  comprobar('con la mesa terminada: `terminada`', acabada.salida === 'terminada' && !acabada.subio, acabada);
  const noHay = await meter('QQQQQ', movimientoDelBotin(lindes.bea.id, lindes.ana.id));
  comprobar('y en una mesa que no existe: `sinMesa`, sin lanzar', noHay.salida === 'sinMesa', noHay);
}

{
  /*
   * EL PLAZO PRIMERO, como en `mover`: una mesa del Burgo con un segundo por turno, y el botín llega
   * cuando ya ha vencido. El tic de El Burgo juega por el ausente, así que entra; y tiene que quedar
   * en el diario DELANTE del botín —si el botín entra, que con los dados de esa mesa puede que no:
   * una subasta abierta lo deja sin efecto—.
   */
  const conPrisa = await mesaDeVerdad('burgo', 'burgo:empezar', 1);
  const antes = guardada(conPrisa.codigo);
  await new Promise<void>((r) => setTimeout(r, 1150));
  const r = await meter(conPrisa.codigo, movimientoDelBotin(conPrisa.bea.id, conPrisa.ana.id));
  const despues = guardada(conPrisa.codigo);
  const nuevos = (despues?.diario ?? []).slice(antes?.diario.length ?? 0).map((d) => d.movimiento.tipo);
  comprobar(
    'con el plazo vencido, el tic entra ANTES que el botín, y la revisión sube aunque el botín no entre',
    r.salida !== 'sinMesa' && r.salida !== 'lanzó' &&
      r.subio &&
      nuevos[0] === 'arcade:tic' &&
      (r.salida === 'entro' ? nuevos[nuevos.length - 1] === 'arcade:botin' : !nuevos.includes('arcade:botin')),
    { salida: r.salida, nuevos },
  );
}

// ---------------------------------------------------------------------------
// 15 · SIGTERM, CON EL MONTAJE DE VERDAD
// ---------------------------------------------------------------------------

paso('SIGTERM con el montaje de verdad: la mesa de `mesas.ts`, el enchufe, dos aparatos por `ws`, y la despedida');

/** Un aparato de verdad por el bucle local: abre, saluda, y apunta lo que le dicen y cómo se cierra. */
const DE_VERDAD: WebSocket[] = [];

function aparatoDeVerdad(puerto: number, codigo: string, llave: string | null): {
  mensajes: (MensajeDelServidor | null)[];
  cierre: () => number | null;
  abierto: Promise<boolean>;
  enviar: (texto: string) => void;
} {
  const mensajes: (MensajeDelServidor | null)[] = [];
  let cierre: number | null = null;
  const ws = new WebSocket(`ws://127.0.0.1:${String(puerto)}${rutaDelCanal(codigo)}`, { handshakeTimeout: 5000 });
  DE_VERDAD.push(ws);
  const abierto = new Promise<boolean>((r) => {
    ws.once('open', () => {
      if (llave !== null) ws.send(hola(llave));
      r(true);
    });
    ws.once('error', () => r(false));
  });
  ws.on('message', (d) => mensajes.push(leerMensajeDelServidor(d.toString())));
  ws.on('close', (c) => {
    cierre = c;
  });
  ws.on('error', () => {});
  const enviar = (texto: string): void => {
    if (ws.readyState === WebSocket.OPEN) ws.send(texto);
  };
  return { mensajes, cierre: () => cierre, abierto, enviar };
}

async function hasta(que: () => boolean, ms = 3000): Promise<boolean> {
  const fin = Date.now() + ms;
  while (Date.now() < fin && !que()) await new Promise<void>((r) => setTimeout(r, 15));
  return que();
}

{
  const servidor = http.createServer((_peticion, respuesta) => {
    respuesta.statusCode = 404;
    respuesta.end();
  });
  const despedidas: string[] = [];
  botas.montarElCanalDeBotas(servidor, { produccion: false, extra: [] }, (senal) => despedidas.push(senal));
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', () => r()));
  const puerto = (servidor.address() as AddressInfo).port;

  const abierta = await mesas.abrir({ arcade: 'lindes', nombre: 'Ana', modalidad: 'botas', plazoSegundos: 0 });
  const codigo = abierta.mesa.codigo;
  const bea = await mesas.sentarse(codigo, 'Bea');
  const vista = await mesas.mirar(codigo, abierta.silla.llave);
  const empezar = vista.opciones.find((o) => o.tipo === 'lindes:empezar');
  await mesas.mover(codigo, abierta.silla.llave, vista.rev, { tipo: 'lindes:empezar', carga: empezar?.carga ?? null });

  const ana = aparatoDeVerdad(puerto, codigo, abierta.silla.llave);
  const otra = aparatoDeVerdad(puerto, codigo, bea.llave);
  const dentro = (a: { mensajes: (MensajeDelServidor | null)[] }): boolean => a.mensajes.some((m) => m?.t === 'dentro');
  await hasta(() => dentro(ana) && dentro(otra));
  comprobar(
    'con la mesa de VERDAD y el montaje de verdad, las dos entran: `dentro`',
    dentro(ana) && dentro(otra),
    { ana: ana.mensajes.slice(0, 2), otra: otra.mensajes.slice(0, 2) },
  );

  {
    /*
     * Y LA REFRIEGA CON EL MONTAJE DE VERDAD. La mesa de `index.ts` no trae `botin`, así que el canal
     * usa el de `botin.ts`, que llega a la vía interna de `mesas.ts` con un `import()`. Con Las Lindes
     * recién empezada hay una sola losa, así que Bea nace a un paso de Ana; y nadie tiene puntos, así
     * que el botín sale SIN EFECTO: que vuelva contado así es lo que prueba que llegó a la mesa de
     * verdad y volvió.
     */
    const sitioDe = (a: { mensajes: (MensajeDelServidor | null)[] }): { x: number; z: number } => {
      const d = a.mensajes.find((m) => m?.t === 'dentro');
      return d?.t === 'dentro' ? { x: d.x, z: d.z } : { x: NaN, z: NaN };
    };
    const pa = sitioDe(ana);
    let pb = sitioDe(otra);
    let n = 0;
    for (let i = 0; i < 40 && Math.hypot(pb.x - pa.x, pb.z - pa.z) > deNumero(2); i++) {
      const d = Math.hypot(pa.x - pb.x, pa.z - pb.z);
      const tramo = Math.min(deNumero(0.5), d - deNumero(1.8));
      pb = { x: pb.x + Math.round(((pa.x - pb.x) / d) * tramo), z: pb.z + Math.round(((pa.z - pb.z) / d) * tramo) };
      n++;
      otra.enviar(JSON.stringify({ t: 'aqui', n, x: pb.x, z: pb.z, r: 0, m: 1 }));
      await new Promise<void>((r) => setTimeout(r, 60));
    }
    await new Promise<void>((r) => setTimeout(r, REBOBINADO_MS + 50));
    const r = rumboHacia(pa, pb);
    for (let i = 1; i <= 3; i++) {
      ana.enviar(JSON.stringify({ t: 'golpe', n: i, r }));
      await new Promise<void>((res) => setTimeout(res, RECARGA_DEL_GOLPE_MS + 60));
    }
    await hasta(() => botas.diagnosticoDeBotas().botines.sinEfecto > 0, 3000);
    comprobar(
      'con el montaje de verdad, tres golpes por el cable tumban: `cae`, leído por el lector del aparato',
      ana.mensajes.some((m) => m?.t === 'cae' && m.a === bea.id) && otra.mensajes.some((m) => m?.t === 'cae' && m.a === bea.id),
      { distancia: Math.hypot(pb.x - pa.x, pb.z - pa.z) / U, ultimos: ana.mensajes.slice(-4) },
    );
    comprobar(
      'y el botín va a la mesa de VERDAD por el respaldo de `botin.ts` —sin efecto: nadie tiene puntos todavía— y vuelve contado',
      botas.diagnosticoDeBotas().botines.sinEfecto === 1 && botas.diagnosticoDeBotas().botines.fallos === 0,
      botas.diagnosticoDeBotas().botines,
    );
  }

  const callada = aparatoDeVerdad(puerto, codigo, null);
  await callada.abierto;

  process.emit('SIGTERM', 'SIGTERM');
  await hasta(() => ana.cierre() !== null && otra.cierre() !== null && callada.cierre() !== null);
  comprobar(
    'SIGTERM: la despedida de `mesas.ts` cierra los canales con 1001 —«el servidor se va»—, también al que aún no saludó',
    ana.cierre() === 1001 && otra.cierre() === 1001 && callada.cierre() === 1001,
    [ana.cierre(), otra.cierre(), callada.cierre()],
  );
  comprobar(
    'diciéndoles antes por qué, con un `fuera` que el aparato sabe leer',
    ana.mensajes.some((m) => m?.t === 'fuera') && otra.mensajes.some((m) => m?.t === 'fuera'),
    ana.mensajes.slice(-2),
  );
  comprobar(
    'y DESPUÉS termina como terminaba: la señal sigue su camino, una vez',
    despedidas.length === 1 && despedidas[0] === 'SIGTERM',
    despedidas,
  );
  const tarde = aparatoDeVerdad(puerto, codigo, abierta.silla.llave);
  await hasta(() => tarde.cierre() !== null);
  comprobar('y quien llega después no entra: 1001 en el acto', tarde.cierre() === 1001, tarde.cierre());
  comprobar('el diagnóstico lo cuenta', (botas.diagnosticoDeBotas().cierres.apagado ?? 0) >= 3, botas.diagnosticoDeBotas().cierres);

  /*
   * Y se recoge TODO, pase lo que pase arriba: un enchufe que quedara abierto —por ejemplo, si
   * alguien rompe el cierre de SIGTERM— retendría el servidor y `close` no volvería nunca. Un
   * comprobador que se cuelga en vez de ponerse rojo es el peor de los dos.
   */
  for (const ws of DE_VERDAD) ws.terminate();
  servidor.closeAllConnections();
  await Promise.race([
    new Promise<void>((r) => servidor.close(() => r())),
    new Promise<void>((r) => setTimeout(r, 2000)),
  ]);
  try {
    fs.rmSync(CARPETA_DE_MESAS, { recursive: true, force: true });
  } catch {
    /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
  }
}

console.log('');
console.log(`  (la mesa de mentira contestó ${String(revisiones)} revisiones y ${String(vistas)} vistas)`);
console.log('');
if (fallos.length > 0) {
  console.log(`✘ ${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`   · ${f}`);
  process.exit(1);
}

/*
 * EL GUARDIA DE «NO SE HAN HECHO TODAS»: un comprobador que se cae a mitad sin decirlo se parece
 * mucho a uno verde. El número es el que se hace hoy, contado, y se sube al añadir comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 236;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.log(`Sólo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones escritas.`);
  process.exit(2);
}

console.log(
  `✔ ${String(hechas)} comprobaciones. La sala de Boots on Board, con el reloj en la mano: el saludo y su\n` +
    '  plazo, la entrada, un canal por asiento, el presupuesto de distancia, la estructura (con la escuadra\n' +
    '  de un tic), lo que viene de camino tras corregir, el cubo, el quieto, quien se va sin salir de la\n' +
    '  sala, una foto por sala con todos los sentados y un solo temporizador parado sin salas, el mundo que\n' +
    '  cambia debajo de alguien, los cierres; la refriega entera —alcance, cono, muro, el más cercano, el\n' +
    '  rebobinado, caer, renacer, el intocable, `vidas`—, nadie inmune por no bajar, los topes del botín y el\n' +
    '  canal atascado; paseos legales de verdad sin una corrección; la vía interna de la mesa con los tres\n' +
    '  juegos; y con el montaje de verdad, una caída por el cable con su botín en la mesa de verdad, y\n' +
    '  SIGTERM cerrando los canales con 1001 dentro de la despedida de la mesa.',
);
process.exit(0);
