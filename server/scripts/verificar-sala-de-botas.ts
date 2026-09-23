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
 *   · La gracia al irse: dentro de cinco segundos se vuelve donde se estaba; después, a nacer.
 *   · La foto: cada dos tics, LA MISMA cadena a todos, y al atascado se le salta.
 *   · El temporizador: UNO para todas las salas, y parado sin salas.
 *   · EL MUNDO QUE CAMBIA DEBAJO DE ALGUIEN: una caja nueva encima, o el suelo que se va, y se le
 *     saca al sitio libre más cercano con un `corrige`. Sin eso, el servidor le dejaría clavado.
 *   · Mesa cerrada, mesa olvidada, `SIGTERM`: fuera todos, con su código.
 *   · Y paseos LEGALES de verdad —`pasoDelTic` sobre Las Lindes llenas y sobre el Burgo— no se
 *     corrigen, mientras que la recta sola sí los habría corregido.
 */
import {
  CIERRE,
  GRACIA_AL_IRSE_MS,
  leerMensajeDelServidor,
  MENSAJES_DE_GOLPE,
  PLAZO_DEL_HOLA_MS,
  QUIETO_HASTA_CERRAR_MS,
  VERSION_DEL_CANAL,
} from '../../shared/mecanicas/canal-de-botas';
import type { MensajeDelServidor } from '../../shared/mecanicas/canal-de-botas';
import { pasoDelTic, RADIO_DEL_PASEANTE, TICS_POR_SEGUNDO } from '../../shared/mecanicas/andar';
import { deNumero, UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { loQueSeVe } from '../../shared/arcade/juegos/lindes';
import { mundoDeLaMesa } from '../../shared/arcade/juegos/mundos';
import { ESPECTADOR, NADIE_SENTADO } from '../../shared/arcade/tipos';
import {
  ATASCO_BYTES,
  CanalDeBotas,
  seAndaElTramo,
  TOPE_DEL_PRESUPUESTO,
  UN_TIC_CON_HOLGURA,
} from '../src/botas/canal';
import type { Conexion, Enchufe, LaMesa, LosMundos, Reloj, Temporizador } from '../src/botas/canal';
import { codigoDeLaRuta, origenAdmitido } from '../src/botas/enchufe';
import { jugarLasLindes } from './robot-de-las-lindes';

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
}

const MESAS = new Map<string, MesaDeMentira>();
let revisiones = 0;
let vistas = 0;

const LA_MESA: LaMesa = {
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

const U = UNO;

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
    'un `hola` de otra versión del canal: `sinHola`, y el motivo lo dice',
    otraVersion.cierre?.codigo === CIERRE.sinHola && (otraVersion.ultimo('fuera')?.motivo ?? '').includes('versión'),
    otraVersion.textos,
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

paso('La gracia: quien vuelve en cinco segundos, donde estaba; después, a nacer');

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
    'mientras dura la gracia, los demás le siguen viendo donde estaba, parado (marcha 0)',
    enGracia !== undefined && enGracia[1] === donde.x && enGracia[4] === 0,
    enGracia,
  );
  await reloj.avanzar(GRACIA_AL_IRSE_MS - 1000);
  const vuelve = await entrar(canal, m.codigo, m.llave('a-uno'));
  comprobar('vuelve a los 4,2 segundos: aparece donde estaba', vuelve.x === donde.x && vuelve.z === donde.z, [vuelve.x, donde.x]);

  vuelve.conexion.seCerro();
  await reloj.avanzar(GRACIA_AL_IRSE_MS + 100);
  const sinGracia = enLaFoto(mira.enchufe, 'a-uno');
  comprobar('pasada la gracia, desaparece de la foto', sinGracia === undefined, mira.enchufe.ultimo('foto'));
  const tarde = await entrar(canal, m.codigo, m.llave('a-uno'));
  comprobar(
    'y quien vuelve tarde nace otra vez en su sitio de nacer',
    tarde.x === 0 && tarde.z === 0,
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
  const otra = mesaNueva();
  const c = await entrar(canal, otra.codigo, otra.llave('a-uno'));
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
    'la foto lleva a los dos de la sala, y no al de la otra mesa',
    f !== undefined && f.p.length === 2 && f.p.some((e) => e[0] === 'a-uno') && f.p.some((e) => e[0] === 'a-dos'),
    f,
  );
  comprobar('la otra sala tiene sus propias fotos', c.enchufe.de('foto').length > 0 && (c.enchufe.ultimo('foto')?.p.length ?? 0) === 1);

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

paso('La ruta del canal, el origen, y que ninguna llave llega al registro');

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
const COMPROBACIONES_ESCRITAS = 133;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.log(`Sólo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones escritas.`);
  process.exit(2);
}

console.log(
  `✔ ${String(hechas)} comprobaciones. La sala de Boots on Board, con el reloj en la mano: el saludo y su\n` +
    '  plazo, la entrada, un canal por asiento, el presupuesto de distancia, la estructura (con la escuadra\n' +
    '  de un tic), lo que viene de camino tras corregir, el cubo, el quieto, la gracia, una foto por sala y\n' +
    '  un solo temporizador parado sin salas, el mundo que cambia debajo de alguien, los cierres, y paseos\n' +
    '  legales de verdad sin una corrección.',
);
process.exit(0);
