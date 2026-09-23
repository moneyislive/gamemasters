/**
 * EL CANAL DE BOOTS ON BOARD, DEL LADO DEL SERVIDOR: la sala de cada mesa, la validación de cada
 * paso y la foto que ven todos.
 *
 * ═══ EL APARATO ANDA; EL SERVIDOR VALIDA Y CORRIGE ═══
 *
 * `docs/BOOTS-ON-BOARD.md` §7.3 A: cada aparato anda con su mundo entero —estructura y adorno— y
 * manda cada tic dónde está. Aquí no se resimula nada: se COTEJA lo que dice con la ESTRUCTURA del
 * mundo de la mesa, que es lo que el servidor puede derivar de la vista pública, y si no cuadra se
 * le devuelve al último sitio bueno (`corrige`). Lo que se impide es exactamente lo que da ventaja
 * en una arena lenta: atravesar murallas y edificios, correr de más y teletransportarse.
 * Atravesar un barril no se impide, porque el barril es adorno y el servidor no sabe que existe.
 *
 * El contrato —mensajes, topes, cierres y lectores estrictos— está en
 * `shared/mecanicas/canal-de-botas.ts` y aquí no se redefine nada de él. Este fichero no sabe de
 * WebSocket ni de HTTP: recibe texto por un `Enchufe` y lo contesta por el mismo, con un `Reloj`
 * y una `LaMesa` inyectados. Así las reglas de tiempo se prueban en proceso con un reloj de mentira
 * —sesenta segundos de «quieto» en un milisegundo— y la red de verdad la pone `enchufe.ts`.
 *
 * ═══ LA VALIDACIÓN DE UN `aqui`, EN SU ORDEN ═══
 *
 *   1. EL TIC CRECE. Un `n` que no pasa del último que llegó por este canal se ignora: viejo o
 *      repetido. No se corrige: no dice nada nuevo.
 *   2. SI HAY UNA CORRECCIÓN PENDIENTE —se le mandó `corrige` o `dentro` y todavía no ha dado un
 *      paso desde ahí—, lo que no esté a un tic del sitio corregido se ignora EN SILENCIO durante
 *      un segundo. Es lo que ya venía de camino cuando salió la corrección: contestar a cada uno
 *      con otro `corrige` haría que el aparato, que ya estaba corregido, volviera a saltar atrás
 *      por cada paso que tenía en vuelo. Pasado el segundo, se vuelve a corregir.
 *   3. EL PRESUPUESTO DE DISTANCIA, por asiento: se rellena a `VELOCIDAD_CORRIENDO` por el tiempo
 *      DE PARED que ha pasado, con un 25 % de holgura y un tope de un segundo acumulado. Un tramo
 *      más largo que lo que queda es correr de más o teletransportarse: `corrige`. Es por ASIENTO y
 *      no por canal para que abrir otro canal no rellene nada.
 *   4. LA ESTRUCTURA: el tramo desde el último sitio bueno se tiene que poder andar en línea recta
 *      (`seAndaEnRecta` de `mundo.ts`, con el radio de quien anda). Y una sola tolerancia, medida:
 *      un tramo de UN TIC que no pasa en recta pero sí en ESCUADRA —primero un eje y luego el
 *      otro— se admite. Ver `seAndaElTramo`.
 *
 * ═══ UNA FOTO POR SALA, LA MISMA CADENA PARA TODOS, Y UN SOLO RELOJ ═══
 *
 * Un solo temporizador para todo el proceso, a `TICS_POR_SEGUNDO`, que recorre las salas con gente
 * y cada `TICS_POR_SEGUNDO / FOTOS_POR_SEGUNDO` tics serializa UNA foto por sala y manda la MISMA
 * cadena a todos sus canales. Por eso la foto no lleva nada de nadie en particular. Quien tiene el
 * búfer de salida atascado se salta esa foto —y se cuenta—: una foto es una instantánea, y
 * amontonarlas en un canal que no da abasto sólo retrasa la siguiente.
 *
 * Sin salas, el temporizador está PARADO: un servidor sin nadie andando no hace ni un tic.
 *
 * ═══ DESALOJO POR CONTENIDO ═══
 *
 * Quien no cambia de sitio aceptado en `QUIETO_HASTA_CERRAR_MS` se cierra con `quieto`. Por
 * contenido y no por tráfico: una pestaña en segundo plano sigue mandando mensajes y parece viva;
 * lo que no hace es moverse. Cerrar el canal no le echa de la mesa —la partida sigue siendo suya—:
 * el aparato vuelve a abrirlo cuando se vuelva a andar.
 */
import {
  CIERRE,
  FOTOS_POR_SEGUNDO,
  GRACIA_AL_IRSE_MS,
  leerMensajeDelAparato,
  MENSAJES_DE_GOLPE,
  MENSAJES_POR_SEGUNDO,
  PLAZO_DEL_HOLA_MS,
  QUIETO_HASTA_CERRAR_MS,
  VERSION_DEL_CANAL,
} from '../../../shared/mecanicas/canal-de-botas';
import type { Aqui, Corrige, Dentro, Foto, Fuera } from '../../../shared/mecanicas/canal-de-botas';
import { DT_DEL_TIC, RADIO_DEL_PASEANTE, TICS_POR_SEGUNDO, VELOCIDAD_CORRIENDO } from '../../../shared/mecanicas/andar';
import type { Marcha } from '../../../shared/mecanicas/andar';
import { por } from '../../../shared/mecanicas/fijo';
import { arenaDe, seAndaEnRecta, sePuedeEstar } from '../../../shared/mecanicas/mundo';
import type { Andante, Arena, MundoDeclarado } from '../../../shared/mecanicas/mundo';
import { dondeSeNace, SEPARACION_AL_NACER, sitioDondeCabe } from './sitios';

/* ─── LOS NÚMEROS DE LA VALIDACIÓN ───────────────────────────────────────── */

/** Cuánto más de lo que da de sí correr se tolera: un 25 %. Lo que se come la red al agrupar. */
export const HOLGURA_DEL_PRESUPUESTO = 1.25;

/** Cuánto presupuesto se puede acumular estando quieto: un segundo de correr, con su holgura. */
export const TOPE_DEL_PRESUPUESTO = VELOCIDAD_CORRIENDO * HOLGURA_DEL_PRESUPUESTO;

/** A qué ritmo se rellena, en Q16.16 por milisegundo de pared. */
export const PRESUPUESTO_POR_MS = (VELOCIDAD_CORRIENDO * HOLGURA_DEL_PRESUPUESTO) / 1000;

/**
 * Lo más que se anda en un tic, con la holgura: `por(VELOCIDAD_CORRIENDO, DT_DEL_TIC)` son 1,32
 * unidades, y con el 25 % 1,65. Es la medida de «a un tic de», para la corrección pendiente y para
 * la escuadra.
 */
export const UN_TIC_CON_HOLGURA = por(VELOCIDAD_CORRIENDO, DT_DEL_TIC) * HOLGURA_DEL_PRESUPUESTO;

/** Cuánto se calla una corrección pendiente antes de repetirse. Ver la cabecera, punto 2. */
export const RECORDAR_LA_CORRECCION_MS = 1000;

/** Cuántos mensajes mal formados se aguantan. El siguiente es `atropello`. */
export const MAL_FORMADOS_TOLERADOS = 3;

/** Cada cuánto, como mucho, se pregunta a la mesa si ha cambiado. */
export const REVISAR_LA_MESA_CADA_MS = 1000;

/**
 * Cuántos bytes pueden esperar a salir por un canal antes de saltarle las fotos: dieciséis kilos,
 * unas setenta fotos de cinco personas. Un canal sano está a cero: lo que se manda va derecho al
 * sistema.
 */
export const ATASCO_BYTES = 16 * 1024;

/** Cada cuántos tics hay foto. Tiene que ser entero: si no, las fotos no caerían en tics. */
export const TICS_POR_FOTO = TICS_POR_SEGUNDO / FOTOS_POR_SEGUNDO;
if (!Number.isInteger(TICS_POR_FOTO) || TICS_POR_FOTO < 1) {
  throw new Error(
    `Los tics por segundo (${String(TICS_POR_SEGUNDO)}) no son múltiplo de las fotos por segundo ` +
      `(${String(FOTOS_POR_SEGUNDO)}): la foto no caería siempre en un tic.`,
  );
}

/** Lo que dura un tic del temporizador, en milisegundos: 50. */
export const MS_POR_TIC = 1000 / TICS_POR_SEGUNDO;

/* ─── LO QUE SE INYECTA ──────────────────────────────────────────────────── */

/** Un canal abierto, visto desde aquí: por dónde se contesta. Lo pone `enchufe.ts`. */
export interface Enchufe {
  enviar(texto: string): void;
  cerrar(codigo: number, razon: string): void;
  /** Cuántos bytes esperan a salir. */
  pendientes(): number;
}

export interface Temporizador {
  parar(): void;
}

/** El reloj de pared y sus dos temporizadores. En las pruebas, uno de mentira. */
export interface Reloj {
  ahora(): number;
  cada(ms: number, hacer: () => void): Temporizador;
  dentroDe(ms: number, hacer: () => void): Temporizador;
}

/** Lo que el canal necesita saber de una llave: de qué asiento es, y cómo se juega su mesa. */
export interface AsientoDeLaLlave {
  readonly id: string;
  readonly modalidad: string;
}

/** Lo que el canal necesita de la vista de espectador de una mesa. */
export interface VistaDeLaMesa {
  readonly arcade: string;
  readonly rev: number;
  readonly terminada: boolean;
  /** Los asientos, en el orden en que se sentaron. */
  readonly asientos: readonly string[];
  /** Lo que el juego deja ver a quien mira sin asiento: de aquí sale el mundo. */
  readonly vista: unknown;
}

/**
 * LO QUE EL CANAL LE PREGUNTA A LA MESA. Las tres son de LECTURA, y `null` quiere decir «esa
 * mesa no existe». Lo real está en `index.ts` (`quienEsLaLlave`, `revisionDe` y `mirar` de
 * `arcade/mesas.ts`, las tres sin llave, como un espectador).
 */
export interface LaMesa {
  quienEsLaLlave(codigo: string, llave: string): Promise<AsientoDeLaLlave | null>;
  revision(codigo: string): Promise<{ readonly rev: number; readonly terminada: boolean } | null>;
  vista(codigo: string): Promise<VistaDeLaMesa | null>;
}

/** De dónde sale el mundo: `sePuedeRecorrer` y `mundoDeLaMesa` de `shared/arcade/juegos/mundos.ts`. */
export interface LosMundos {
  sePuedeRecorrer(arcade: string): boolean;
  mundoDeLaMesa(arcade: string, vista: unknown, codigo: string): MundoDeclarado | null;
}

export interface OpcionesDelCanal {
  readonly reloj: Reloj;
  readonly mesa: LaMesa;
  readonly mundos: LosMundos;
  /** Dónde se escribe lo que pasa. NUNCA recibe una llave. */
  readonly registrar?: (linea: string) => void;
}

/* ─── LO QUE SE CUENTA ───────────────────────────────────────────────────── */

/** Por qué se cerró un canal: los códigos del contrato, más los que no son de nadie. */
export type PorQueSeCierra = keyof typeof CIERRE | 'apagado' | 'fallo' | 'seFue';

/** Por qué se corrigió a alguien. */
export type PorQueSeCorrige = 'presupuesto' | 'estructura' | 'rescate' | 'repetida';

/**
 * LO QUE DICE EL DIAGNÓSTICO. Sólo cuentas: ni un código de mesa, ni un asiento, ni una llave.
 * `/api/arcade/diagnostico` se sirve sin credencial.
 */
export interface DiagnosticoDeBotas {
  salas: number;
  canales: number;
  enSala: number;
  temporizador: boolean;
  tics: number;
  /** Cuántas fotos se han SERIALIZADO: una por sala y foto, se mande a cuantos se mande. */
  fotosCompuestas: number;
  /** Cuántas se han MANDADO: una por canal y foto. */
  fotos: number;
  fotosSaltadas: number;
  bytesDeFotos: number;
  aceptados: number;
  porEscuadra: number;
  ignorados: number;
  ignoradosTrasCorregir: number;
  correcciones: Record<PorQueSeCorrige, number>;
  rederivaciones: number;
  fallosAlRederivar: number;
  entradas: number;
  origenesNegados: number;
  cierres: Record<PorQueSeCierra, number>;
}

/** Todas las cuentas a cero: lo que dice un canal recién hecho, o uno que no se ha montado. */
export function cuentasVacias(): DiagnosticoDeBotas {
  return {
    salas: 0,
    canales: 0,
    enSala: 0,
    temporizador: false,
    tics: 0,
    fotosCompuestas: 0,
    fotos: 0,
    fotosSaltadas: 0,
    bytesDeFotos: 0,
    aceptados: 0,
    porEscuadra: 0,
    ignorados: 0,
    ignoradosTrasCorregir: 0,
    correcciones: { presupuesto: 0, estructura: 0, rescate: 0, repetida: 0 },
    rederivaciones: 0,
    fallosAlRederivar: 0,
    entradas: 0,
    origenesNegados: 0,
    cierres: {
      sinHola: 0,
      llaveMala: 0,
      mesaQueNo: 0,
      reemplazado: 0,
      quieto: 0,
      atropello: 0,
      mesaCerrada: 0,
      apagado: 0,
      fallo: 0,
      seFue: 0,
    },
  };
}

/** Los códigos de cierre de lo que no es del contrato: los estándar de WebSocket. */
const CIERRE_APAGADO = 1001;
const CIERRE_FALLO = 1011;

/* ─── LA ESTRUCTURA: RECTA, O ESCUADRA DE UN TIC ─────────────────────────── */

/**
 * ¿SE PUEDE ANDAR ESTE TRAMO? La recta de `mundo.ts`, y una tolerancia.
 *
 * ═══ LA TOLERANCIA, Y POR QUÉ ESTÁ MEDIDA Y NO PUESTA A OJO ═══
 *
 * El paso del aparato (`unPaso`, que llama `pasoDelTic`) mira sólo el sitio de LLEGADA de cada
 * tic. La recta mira el camino a trozos de un radio. Casi siempre es lo mismo; cuando un paso en
 * diagonal pasa rozando la esquina de una caja, no: la llegada está libre, el paso es legal para el
 * aparato, y la recta muerde la esquina. Medido con 720.000 pasos de `pasoDelTic` al azar en tres
 * Lindes llenas y tres Burgos: la recta sola rechaza el 0,08-0,14 % de los pasos que se mueven —una
 * corrección cada 35-60 segundos de paseo, siempre en diagonal, siempre en una esquina—. Con la
 * escuadra de reserva quedan 2 de 720.000.
 *
 * La escuadra sólo vale para tramos de UN TIC (con su holgura): es lo que un paso del aparato
 * puede recortar de una esquina, y nada más. Cada lado de la escuadra se mira con la misma recta,
 * a trozos de un radio, así que por una escuadra no se atraviesa nada: se rodea una esquina. Lo
 * que se gana con ella haciendo trampas es, como mucho, un 41 % más de camino en un tic junto a
 * una esquina.
 *
 * Lo que de verdad quitaría la tolerancia es que el paso del aparato no dé nunca un paso cuya
 * recta no esté libre. Eso es de `shared/mecanicas/mundo.ts` y no de aquí.
 */
export function seAndaElTramo(arena: Arena, desde: Andante, hasta: Andante, radio: number): 'recta' | 'escuadra' | null {
  if (seAndaEnRecta(arena, desde, hasta, radio)) return 'recta';
  const dx = hasta.x - desde.x;
  const dz = hasta.z - desde.z;
  if (dx === 0 || dz === 0) return null;
  if (Math.hypot(dx, dz) > UN_TIC_CON_HOLGURA) return null;
  const primeroX = { x: hasta.x, z: desde.z };
  if (seAndaEnRecta(arena, desde, primeroX, radio) && seAndaEnRecta(arena, primeroX, hasta, radio)) return 'escuadra';
  const primeroZ = { x: desde.x, z: hasta.z };
  if (seAndaEnRecta(arena, desde, primeroZ, radio) && seAndaEnRecta(arena, primeroZ, hasta, radio)) return 'escuadra';
  return null;
}

/* ─── LO QUE VIVE EN MEMORIA ─────────────────────────────────────────────── */

type Estado = 'saludo' | 'entrando' | 'dentro' | 'cerrada';

/** Un asiento dentro de la sala. Vive mientras tenga canal, y la gracia después. */
interface Ocupante {
  readonly id: string;
  /** El último sitio BUENO, en Q16.16: el aceptado, el de nacer o el del rescate. */
  x: number;
  z: number;
  /** Hacia dónde MIRA (0 a 255), tal cual lo dijo su último `aqui` aceptado. No se valida. */
  r: number;
  m: Marcha;
  conexion: Conexion | null;
  /** Cuándo se quedó sin canal. `null` mientras lo tiene. */
  idoEn: number | null;
  presupuesto: number;
  recargadoEn: number;
}

/** La sala de una mesa: su mundo y quién anda por él. Vive mientras haya alguien. */
interface Sala {
  readonly codigo: string;
  readonly arcade: string;
  arena: Arena;
  rev: number;
  asientos: readonly string[];
  readonly ocupantes: Map<string, Ocupante>;
  /** Los tics de ESTA sala, desde que se abrió. Es la `k` de sus fotos. */
  k: number;
  revisando: boolean;
  revisadaEn: number;
  cerrada: boolean;
}

/** Una mesa que no se puede recorrer ahora, y cómo se le dice a quien llama. */
interface Negativa {
  readonly clave: PorQueSeCierra;
  readonly motivo: string;
}

function esSala(v: Sala | Negativa): v is Sala {
  return (v as Sala).ocupantes !== undefined;
}

/** Lo pendiente de una corrección: dónde se le dijo que estaba, y cuándo. */
interface Pendiente {
  readonly x: number;
  readonly z: number;
  desde: number;
}

/**
 * UN CANAL ABIERTO. Lo crea `CanalDeBotas.abrir` y le llegan los mensajes por `recibir`; cuando
 * el otro lado cierra, `seCerro`.
 */
export class Conexion {
  estado: Estado = 'saludo';
  sala: Sala | null = null;
  ocupante: Ocupante | null = null;
  plazo: Temporizador | null = null;
  ultimoN = 0;
  movidoEn = 0;
  pendiente: Pendiente | null = null;
  malos = 0;
  cubo: number = MENSAJES_DE_GOLPE;
  cuboEn: number;

  constructor(
    private readonly canal: CanalDeBotas,
    readonly codigo: string,
    readonly enchufe: Enchufe,
    ahora: number,
  ) {
    this.cuboEn = ahora;
  }

  /*
   * Las dos puertas de entrada las llaman los eventos del WebSocket, y una excepción que se
   * escapara de un evento llegaría a `uncaughtException`, que en `index.ts` TERMINA EL PROCESO:
   * un mensaje raro de un aparato tiraría el servidor de todos. Por eso aquí se recoge todo y, si
   * algo revienta, se cierra ESTE canal y se sigue.
   */

  /** Llega un mensaje de texto. `null` si no era texto (un marco binario). */
  recibir(texto: string | null): void {
    try {
      this.canal.recibir(this, texto);
    } catch (error) {
      this.canal.fallo(this, error);
    }
  }

  /** El otro lado se ha ido, o el canal ha terminado de cerrarse. */
  seCerro(): void {
    try {
      this.canal.seCerro(this);
    } catch (error) {
      this.canal.fallo(this, error);
    }
  }
}

/* ─── EL CANAL ───────────────────────────────────────────────────────────── */

export class CanalDeBotas {
  private readonly reloj: Reloj;
  private readonly mesa: LaMesa;
  private readonly mundos: LosMundos;
  private readonly registrar: (linea: string) => void;
  private readonly salas = new Map<string, Sala>();
  private readonly creando = new Map<string, Promise<Sala | Negativa>>();
  private readonly conexiones = new Set<Conexion>();
  private temporizador: Temporizador | null = null;
  private apagado = false;
  private readonly cuentas = cuentasVacias();

  constructor(opciones: OpcionesDelCanal) {
    this.reloj = opciones.reloj;
    this.mesa = opciones.mesa;
    this.mundos = opciones.mundos;
    this.registrar = opciones.registrar ?? ((linea) => console.log(`[botas] ${linea}`));
  }

  /* ── Entrar ──────────────────────────────────────────────────────────── */

  /** Un canal nuevo para la mesa `codigo`. Tiene `PLAZO_DEL_HOLA_MS` para decir `hola`. */
  abrir(codigo: string, enchufe: Enchufe): Conexion {
    const c = new Conexion(this, codigo, enchufe, this.reloj.ahora());
    this.conexiones.add(c);
    if (this.apagado) {
      this.echar(c, 'apagado', 'El servidor se está reiniciando: vuelve a entrar en unos segundos.');
      return c;
    }
    c.plazo = this.reloj.dentroDe(PLAZO_DEL_HOLA_MS, () => {
      if (c.estado === 'saludo') this.echar(c, 'sinHola', 'No se ha presentado a tiempo.');
    });
    return c;
  }

  /** Lo que llega por un canal. Ver la cabecera para el orden de la validación. */
  recibir(c: Conexion, texto: string | null): void {
    if (c.estado === 'cerrada') return;
    const ahora = this.reloj.ahora();

    /* El cubo, antes de leer nada: cuenta todo lo que llega, bien o mal escrito. */
    c.cubo = Math.min(MENSAJES_DE_GOLPE, c.cubo + ((ahora - c.cuboEn) * MENSAJES_POR_SEGUNDO) / 1000);
    c.cuboEn = ahora;
    if (c.cubo < 1) {
      this.echar(c, 'atropello', 'Demasiados mensajes seguidos.');
      return;
    }
    c.cubo -= 1;

    const m = texto === null ? null : leerMensajeDelAparato(texto);

    if (c.estado === 'saludo') {
      if (m === null || m.t !== 'hola') {
        this.echar(c, 'sinHola', 'Lo primero tenía que ser el saludo.');
        return;
      }
      if (m.v !== VERSION_DEL_CANAL) {
        this.echar(
          c,
          'sinHola',
          `Este aparato habla la versión ${String(m.v)} del canal y el servidor la ${String(VERSION_DEL_CANAL)}: hay que actualizar.`,
        );
        return;
      }
      c.plazo?.parar();
      c.plazo = null;
      c.estado = 'entrando';
      void this.entrar(c, m.llave);
      return;
    }

    if (m === null || m.t === 'hola') {
      c.malos++;
      if (c.malos > MAL_FORMADOS_TOLERADOS) this.echar(c, 'atropello', 'Demasiados mensajes mal formados.');
      return;
    }

    if (c.estado === 'entrando') {
      /* Un paso antes de `dentro` no sale de ningún sitio que el servidor haya dicho. */
      this.cuentas.ignorados++;
      return;
    }

    this.validar(c, m, ahora);
  }

  /** El otro lado cerró. Si ya lo había cerrado el servidor, no hay nada más que hacer. */
  seCerro(c: Conexion): void {
    if (c.estado === 'cerrada') return;
    c.estado = 'cerrada';
    c.plazo?.parar();
    c.plazo = null;
    this.soltar(c, false);
    this.conexiones.delete(c);
    this.cuentas.cierres.seFue++;
  }

  private async entrar(c: Conexion, llave: string): Promise<void> {
    try {
      const asiento = await this.mesa.quienEsLaLlave(c.codigo, llave);
      if (c.estado !== 'entrando') return;
      if (asiento === null) {
        this.echar(c, 'llaveMala', 'Esa llave no es de ningún asiento de esta mesa.');
        return;
      }
      if (asiento.modalidad !== 'botas') {
        this.echar(c, 'mesaQueNo', 'Esta mesa se juega desde arriba: no es de Boots on Board.');
        return;
      }
      const sala = await this.salaDe(c.codigo);
      if (c.estado !== 'entrando') return;
      if (!esSala(sala)) {
        this.echar(c, sala.clave, sala.motivo);
        return;
      }
      this.sentar(c, sala, asiento.id);
    } catch (error) {
      this.registrar(`no se ha podido entrar en la mesa ${c.codigo}: ${error instanceof Error ? error.message : String(error)}`);
      this.echar(c, 'fallo', 'El servidor no ha podido preparar el tablero. Vuelve a intentarlo.');
    }
  }

  /** La sala de una mesa: la que hay, o una nueva con su mundo derivado. Una sola por mesa. */
  private salaDe(codigo: string): Promise<Sala | Negativa> {
    const hay = this.salas.get(codigo);
    if (hay !== undefined) return Promise.resolve(hay);
    const enCamino = this.creando.get(codigo);
    if (enCamino !== undefined) return enCamino;
    const nueva = this.crearSala(codigo).finally(() => this.creando.delete(codigo));
    this.creando.set(codigo, nueva);
    return nueva;
  }

  private async crearSala(codigo: string): Promise<Sala | Negativa> {
    const v = await this.mesa.vista(codigo);
    if (v === null) return { clave: 'mesaQueNo', motivo: 'Esa mesa ya no existe.' };
    if (v.terminada) return { clave: 'mesaCerrada', motivo: 'La partida ya se ha acabado.' };
    if (!this.mundos.sePuedeRecorrer(v.arcade)) {
      return { clave: 'mesaQueNo', motivo: 'Este juego no se puede recorrer en este servidor.' };
    }
    const mundo = this.mundos.mundoDeLaMesa(v.arcade, v.vista, codigo);
    if (mundo === null) {
      return { clave: 'mesaQueNo', motivo: 'Todavía no hay tablero que recorrer: la partida no ha empezado.' };
    }
    const sala: Sala = {
      codigo,
      arcade: v.arcade,
      arena: arenaDe(mundo),
      rev: v.rev,
      asientos: v.asientos,
      ocupantes: new Map(),
      k: 0,
      revisando: false,
      revisadaEn: this.reloj.ahora(),
      cerrada: false,
    };
    this.salas.set(codigo, sala);
    this.encenderElReloj();
    this.registrar(`se abre la sala de la mesa ${codigo} (${v.arcade})`);
    return sala;
  }

  /** Pone a este canal en su asiento de la sala y le dice dónde está. */
  private sentar(c: Conexion, sala: Sala, id: string): void {
    const ahora = this.reloj.ahora();
    if (sala.cerrada) {
      this.echar(c, 'mesaCerrada', 'La partida ya se ha acabado.');
      return;
    }
    /* Pudo vaciarse y borrarse entre medias: se vuelve a poner, que es la misma. */
    if (this.salas.get(sala.codigo) !== sala) {
      this.salas.set(sala.codigo, sala);
      this.encenderElReloj();
    }

    let o = sala.ocupantes.get(id);
    if (o?.conexion) {
      this.echar(o.conexion, 'reemplazado', 'Se ha abierto otro canal con este asiento: sigue en el nuevo.');
    }
    if (o === undefined) {
      const turno = sala.asientos.indexOf(id);
      const nace = dondeSeNace(sala.arena, turno >= 0 ? turno : sala.ocupantes.size, (x, z) => this.hayAlguien(sala, x, z));
      o = {
        id,
        x: nace.x,
        z: nace.z,
        r: nace.r,
        m: 0,
        conexion: null,
        idoEn: null,
        presupuesto: TOPE_DEL_PRESUPUESTO,
        recargadoEn: ahora,
      };
      sala.ocupantes.set(id, o);
    }
    /*
     * Quien vuelve dentro de la gracia vuelve donde estaba, y ese sitio es bueno en el mundo de
     * AHORA: si el mundo cambió mientras no estaba, `rescatar` ya le sacó, porque recorre a todos
     * los de la sala —con canal o sin él— cada vez que se vuelve a derivar.
     */

    o.conexion = c;
    o.idoEn = null;
    c.estado = 'dentro';
    c.sala = sala;
    c.ocupante = o;
    c.ultimoN = 0;
    c.movidoEn = ahora;
    c.pendiente = { x: o.x, z: o.z, desde: ahora };
    this.cuentas.entradas++;
    const dentro: Dentro = { t: 'dentro', yo: id, x: o.x, z: o.z, r: o.r, hz: TICS_POR_SEGUNDO };
    c.enchufe.enviar(JSON.stringify(dentro));
  }

  /* ── Andar ───────────────────────────────────────────────────────────── */

  private validar(c: Conexion, m: Aqui, ahora: number): void {
    const o = c.ocupante;
    const sala = c.sala;
    if (o === null || sala === null) return;

    if (m.n <= c.ultimoN) {
      this.cuentas.ignorados++;
      return;
    }
    c.ultimoN = m.n;

    if (c.pendiente !== null) {
      const cerca = Math.hypot(m.x - c.pendiente.x, m.z - c.pendiente.z) <= UN_TIC_CON_HOLGURA;
      if (!cerca) {
        if (ahora - c.pendiente.desde < RECORDAR_LA_CORRECCION_MS) {
          this.cuentas.ignoradosTrasCorregir++;
          return;
        }
        this.corregir(c, m.n, 'repetida', ahora);
        return;
      }
    }

    o.presupuesto = Math.min(TOPE_DEL_PRESUPUESTO, o.presupuesto + (ahora - o.recargadoEn) * PRESUPUESTO_POR_MS);
    o.recargadoEn = ahora;

    const d = Math.hypot(m.x - o.x, m.z - o.z);
    if (d > 0) {
      if (d > o.presupuesto) {
        this.corregir(c, m.n, 'presupuesto', ahora);
        return;
      }
      const como = seAndaElTramo(sala.arena, o, m, RADIO_DEL_PASEANTE);
      if (como === null) {
        this.corregir(c, m.n, 'estructura', ahora);
        return;
      }
      if (como === 'escuadra') this.cuentas.porEscuadra++;
      o.presupuesto -= d;
      o.x = m.x;
      o.z = m.z;
      c.movidoEn = ahora;
    }
    o.r = m.r;
    o.m = m.m;
    c.pendiente = null;
    this.cuentas.aceptados++;
  }

  private corregir(c: Conexion, n: number, porque: PorQueSeCorrige, ahora: number): void {
    const o = c.ocupante;
    if (o === null) return;
    const corrige: Corrige = { t: 'corrige', n, x: o.x, z: o.z };
    c.enchufe.enviar(JSON.stringify(corrige));
    c.pendiente = { x: o.x, z: o.z, desde: ahora };
    this.cuentas.correcciones[porque]++;
  }

  /** ¿Hay alguien de esta sala a menos de `SEPARACION_AL_NACER` de este punto? */
  private hayAlguien(sala: Sala, x: number, z: number): boolean {
    for (const o of sala.ocupantes.values()) {
      if (Math.abs(o.x - x) < SEPARACION_AL_NACER && Math.abs(o.z - z) < SEPARACION_AL_NACER) return true;
    }
    return false;
  }

  /** Adónde se saca a quien el mundo ha dejado dentro de una caja o sin suelo. */
  private sitioDeRescate(sala: Sala, o: Ocupante): Andante {
    const libre = sitioDondeCabe(sala.arena, o.x, o.z, RADIO_DEL_PASEANTE);
    if (libre !== null) return libre;
    /* Nada a 38 unidades: a un sitio de nacer, como si entrara. */
    const turno = sala.asientos.indexOf(o.id);
    const otros = (x: number, z: number): boolean => {
      for (const p of sala.ocupantes.values()) {
        if (p === o) continue;
        if (Math.abs(p.x - x) < SEPARACION_AL_NACER && Math.abs(p.z - z) < SEPARACION_AL_NACER) return true;
      }
      return false;
    };
    return dondeSeNace(sala.arena, turno >= 0 ? turno : 0, otros);
  }

  /* ── El tic ──────────────────────────────────────────────────────────── */

  private encenderElReloj(): void {
    if (this.temporizador !== null || this.apagado) return;
    this.temporizador = this.reloj.cada(MS_POR_TIC, () => this.tic());
  }

  private apagarElReloj(): void {
    this.temporizador?.parar();
    this.temporizador = null;
  }

  /**
   * UN TIC DE TODAS LAS SALAS. Lo llama el único temporizador del proceso.
   *
   * Se recorren los `Map` en vivo y no copias: borrar la entrada que se está visitando es seguro
   * en un `Map`, y copiar las salas y sus asientos veinte veces por segundo es basura para nada.
   * Cada sala va en su `try`: lo que reviente en una no se lleva el tic de las demás, ni —por el
   * `uncaughtException` de `index.ts`— el proceso.
   */
  tic(): void {
    const ahora = this.reloj.ahora();
    this.cuentas.tics++;
    for (const sala of this.salas.values()) {
      try {
        this.ticDeLaSala(sala, ahora);
      } catch (error) {
        this.registrar(`el tic de la mesa ${sala.codigo} ha fallado: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (this.salas.size === 0) this.apagarElReloj();
  }

  private ticDeLaSala(sala: Sala, ahora: number): void {
    sala.k++;
    for (const o of sala.ocupantes.values()) {
      if (o.conexion === null) {
        if (o.idoEn !== null && ahora - o.idoEn >= GRACIA_AL_IRSE_MS) sala.ocupantes.delete(o.id);
        continue;
      }
      if (ahora - o.conexion.movidoEn >= QUIETO_HASTA_CERRAR_MS) {
        this.echar(o.conexion, 'quieto', 'Un minuto sin moverte: el canal se cierra hasta que vuelvas a andar.');
      }
    }
    if (sala.ocupantes.size === 0) {
      this.borrarSala(sala);
      return;
    }
    if (!sala.revisando && ahora - sala.revisadaEn >= REVISAR_LA_MESA_CADA_MS) void this.revisar(sala);
    if (sala.k % TICS_POR_FOTO === 0) this.mandarLaFoto(sala);
  }

  /**
   * UNA foto por sala, serializada UNA vez, la misma cadena a todos.
   *
   * Una entrada por ASIENTO y nunca dos: sale de `sala.ocupantes`, que va por asiento, y quien
   * vuelve con otro canal —dentro de la gracia, o desbancando al suyo— retoma la MISMA entrada.
   * El lector del aparato rechaza una foto con un asiento repetido. El cuarto número es hacia
   * dónde MIRA, tal cual lo dijo su `aqui`: aquí no se valida, se reparte.
   */
  private mandarLaFoto(sala: Sala): void {
    let alguien = false;
    for (const o of sala.ocupantes.values()) {
      if (o.conexion !== null) {
        alguien = true;
        break;
      }
    }
    if (!alguien) return;
    const p: [string, number, number, number, number][] = [];
    for (const o of sala.ocupantes.values()) p.push([o.id, o.x, o.z, o.r, o.conexion === null ? 0 : o.m]);
    const foto: Foto = { t: 'foto', k: sala.k, p };
    const texto = JSON.stringify(foto);
    this.cuentas.fotosCompuestas++;
    for (const o of sala.ocupantes.values()) {
      const c = o.conexion;
      if (c === null) continue;
      if (c.enchufe.pendientes() > ATASCO_BYTES) {
        this.cuentas.fotosSaltadas++;
        continue;
      }
      c.enchufe.enviar(texto);
      this.cuentas.fotos++;
      this.cuentas.bytesDeFotos += texto.length;
    }
  }

  /**
   * ¿HA CAMBIADO LA MESA? Como mucho una vez por segundo y por sala. Si ha cambiado la revisión,
   * se vuelve a derivar el mundo, y a quien haya quedado dentro de un cuerpo o sin suelo se le
   * saca al sitio libre más cercano y se le dice con un `corrige`.
   */
  private async revisar(sala: Sala): Promise<void> {
    sala.revisando = true;
    sala.revisadaEn = this.reloj.ahora();
    try {
      const r = await this.mesa.revision(sala.codigo);
      if (sala.cerrada || this.salas.get(sala.codigo) !== sala) return;
      if (r === null) {
        this.cerrarLaSala(sala, 'La mesa ya no existe.');
        return;
      }
      if (r.terminada) {
        this.cerrarLaSala(sala, 'La partida se ha acabado.');
        return;
      }
      if (r.rev === sala.rev) return;
      const v = await this.mesa.vista(sala.codigo);
      if (sala.cerrada || this.salas.get(sala.codigo) !== sala) return;
      if (v === null) {
        this.cerrarLaSala(sala, 'La mesa ya no existe.');
        return;
      }
      if (v.terminada) {
        this.cerrarLaSala(sala, 'La partida se ha acabado.');
        return;
      }
      const mundo = this.mundos.mundoDeLaMesa(sala.arcade, v.vista, sala.codigo);
      sala.rev = v.rev;
      sala.asientos = v.asientos;
      /* Un mundo que desaparece no deja a nadie en el vacío: se sigue con el que había. */
      if (mundo === null) return;
      sala.arena = arenaDe(mundo);
      this.cuentas.rederivaciones++;
      this.rescatar(sala);
    } catch (error) {
      this.cuentas.fallosAlRederivar++;
      this.registrar(
        `no se ha podido volver a derivar el mundo de la mesa ${sala.codigo}; se sigue con el que había: ` +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      sala.revisando = false;
    }
  }

  /** A quien el mundo nuevo deja dentro de una caja o sin suelo, al sitio libre más cercano. */
  private rescatar(sala: Sala): void {
    const ahora = this.reloj.ahora();
    for (const o of sala.ocupantes.values()) {
      if (sePuedeEstar(sala.arena, o.x, o.z, RADIO_DEL_PASEANTE)) continue;
      const libre = this.sitioDeRescate(sala, o);
      o.x = libre.x;
      o.z = libre.z;
      const c = o.conexion;
      if (c === null || c.estado !== 'dentro') {
        this.cuentas.correcciones.rescate++;
        continue;
      }
      this.corregir(c, c.ultimoN, 'rescate', ahora);
    }
  }

  /* ── Salir ───────────────────────────────────────────────────────────── */

  /**
   * CIERRA UN CANAL: dice `fuera` con el motivo, que se lee en pantalla, y cierra con su código.
   * Lo que quede de su asiento se queda la gracia, salvo si le reemplaza otro canal.
   */
  private echar(c: Conexion, clave: PorQueSeCierra, motivo: string): void {
    if (c.estado === 'cerrada') return;
    c.estado = 'cerrada';
    c.plazo?.parar();
    c.plazo = null;
    this.soltar(c, clave === 'reemplazado');
    this.conexiones.delete(c);
    this.cuentas.cierres[clave]++;
    const codigo = clave === 'apagado' ? CIERRE_APAGADO : clave === 'fallo' || clave === 'seFue' ? CIERRE_FALLO : CIERRE[clave];
    const fuera: Fuera = { t: 'fuera', motivo };
    try {
      c.enchufe.enviar(JSON.stringify(fuera));
      c.enchufe.cerrar(codigo, clave);
    } catch (error) {
      this.registrar(`no se ha podido cerrar limpio un canal de la mesa ${c.codigo}: ${String(error)}`);
    }
  }

  /** Algo ha reventado atendiendo a un canal: se dice en el registro y se cierra ESE canal. */
  fallo(c: Conexion, error: unknown): void {
    this.registrar(
      `un canal de la mesa ${c.codigo} ha fallado y se cierra: ${error instanceof Error ? error.message : String(error)}`,
    );
    try {
      this.echar(c, 'fallo', 'El servidor ha tenido un problema con este canal. Vuelve a entrar.');
    } catch {
      /* Si ni cerrar se puede, el enchufe se cierra solo al irse el otro lado. */
    }
  }

  /** El asiento se queda sin este canal. Si nadie lo retoma, se va cuando pase la gracia. */
  private soltar(c: Conexion, reemplazado: boolean): void {
    const o = c.ocupante;
    if (o !== null && o.conexion === c) {
      o.conexion = null;
      if (!reemplazado) {
        o.idoEn = this.reloj.ahora();
        o.m = 0;
      }
    }
    c.ocupante = null;
    c.sala = null;
  }

  private borrarSala(sala: Sala): void {
    if (this.salas.get(sala.codigo) === sala) this.salas.delete(sala.codigo);
  }

  private cerrarLaSala(sala: Sala, motivo: string): void {
    sala.cerrada = true;
    this.borrarSala(sala);
    for (const o of [...sala.ocupantes.values()]) {
      if (o.conexion !== null) this.echar(o.conexion, 'mesaCerrada', motivo);
    }
    sala.ocupantes.clear();
    this.registrar(`se cierra la sala de la mesa ${sala.codigo}: ${motivo}`);
    if (this.salas.size === 0) this.apagarElReloj();
  }

  /** LA MESA SE HA CERRADO U OLVIDADO: `mesaCerrada` a todos los que andan por ella. */
  cerrarLaMesa(codigo: string, motivo: string): void {
    const sala = this.salas.get(codigo);
    if (sala !== undefined) this.cerrarLaSala(sala, motivo);
  }

  /** SIGTERM: todos los canales se cierran con 1001 y no se abre ninguno más. */
  apagar(): void {
    this.apagado = true;
    this.apagarElReloj();
    for (const c of [...this.conexiones]) {
      this.echar(c, 'apagado', 'El servidor se está reiniciando: vuelve a entrar en unos segundos.');
    }
    this.salas.clear();
  }

  /* ── Mirar desde fuera ───────────────────────────────────────────────── */

  /** Un origen que no se admite: lo cuenta el enchufe, que es quien lo ve. */
  contarOrigenNegado(): void {
    this.cuentas.origenesNegados++;
  }

  diagnostico(): DiagnosticoDeBotas {
    let enSala = 0;
    for (const c of this.conexiones) if (c.estado === 'dentro') enSala++;
    return {
      ...this.cuentas,
      salas: this.salas.size,
      canales: this.conexiones.size,
      enSala,
      temporizador: this.temporizador !== null,
      correcciones: { ...this.cuentas.correcciones },
      cierres: { ...this.cuentas.cierres },
    };
  }
}
