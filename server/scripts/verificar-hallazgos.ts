/**
 * VERIFICA LOS HALLAZGOS Y LAS ARMAS DE LA SALA DE BOOTS ON BOARD (`server/src/botas/`), con el
 * reloj en la mano. Ver `docs/AVATARES-JUGABLES.md` §2 y §4.
 *
 * ═══ QUÉ SE MIRA ═══
 *
 *   1. LA LISTA SOLA (`BrotesDeLaSala`): los sitios salen de la arena y cabe alguien en todos;
 *      brotan N, en sitios distintos y lejos de quien está; los ids sólo crecen; la clase sale por
 *      peso; el radio de recoger es exacto en el borde; la cadena `brotes` se lee con el lector
 *      estricto del aparato y se serializa una vez por cambio; cuando la arena cambia, lo que se
 *      queda sin sitio se recoloca con su id o se quita; un juego sin tabla no tiene brotes.
 *   2. LA SALA: `brotes` justo después de `vidas` al entrar, con `brotesDeLaMesa(sentados)`; un
 *      juego sin tabla no manda ninguno; se recoge AL PASAR —`recoge` y luego `brotes` a toda la sala,
 *      y el movimiento a la mesa con `movimientoDelHallazgo`—; el rebrote a los `REBROTE_MS` con id
 *      nuevo; el tope por asiento deja el brote en el suelo; quien no tiene canal no recoge ni aunque
 *      esté encima; quien está caído no recoge; si la mesa no lo quiere (sin efecto, rechazado,
 *      revienta) el brote se queda sin `recoge` ni tope, y no se le pregunta en cada paso; mientras
 *      la mesa decide, quien llega después no se lo lleva; el tope por mesa con ocho corriendo; y el
 *      mundo que cambia debajo de un brote.
 *   3. LAS ARMAS: los puños son EXACTAMENTE los números de antes; el hacha quita 2 y la vida no baja
 *      de cero; la honda llega a 6 u pero no fuera de su cono de 20°; los puños no llegan a 4 u; el
 *      arma se lee una vez por revisión y cambia cuando cambia la vista.
 *   4. CON LA MESA DE VERDAD: `meterElHallazgoDeVerdad` mete `arcade:hallazgo` en una mesa `botas`
 *      del Burgo por la vía interna, en nombre de nadie, y queda en el diario.
 *
 * Cada comprobación que recorre una lista se pone roja si la lista está vacía: cero inspeccionados
 * no es cero fallos.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  leerMensajeDelServidor,
  RECARGA_DEL_GOLPE_MS,
  VERSION_DEL_CANAL,
  VIDA_ENTERA,
  ALCANCE_DEL_GOLPE,
  COSENO_CUADRADO_DEL_CONO,
} from '../../shared/mecanicas/canal-de-botas';
import type { MensajeDelServidor } from '../../shared/mecanicas/canal-de-botas';
import { RADIO_DEL_PASEANTE, rumboDeRadianes } from '../../shared/mecanicas/andar';
import { deNumero, UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena, MundoDeclarado } from '../../shared/mecanicas/mundo';
import {
  brotesDeLaMesa,
  HALLAZGOS_POR_ASIENTO_Y_MINUTO,
  HALLAZGOS_POR_MESA_Y_MINUTO,
  RADIO_DE_RECOGER,
  REBROTE_MS,
  sitiosDeHallazgo,
} from '../../shared/mecanicas/hallazgos';
import type { ClaseDeHallazgo } from '../../shared/mecanicas/hallazgos';
import { leerElHallazgo, movimientoDelHallazgo, TIPO_DEL_HALLAZGO } from '../../shared/arcade/juegos/hallazgo';
import { armaEnLaRefriega } from '../../shared/arcade/juegos/mundos';
import { PUNOS } from '../../shared/arcade/juegos/riberas-armas';
import { CanalDeBotas, enElCono, ESPERA_TRAS_NEGATIVA_MS, GOLPE_DE_PUNOS, golpeDelArma } from '../src/botas/canal';
import type { Conexion, Enchufe, LaMesa, LosMundos, Reloj, SalidaDelBotin, Temporizador } from '../src/botas/canal';
import { azarConSemilla, BrotesDeLaSala, LEJOS_DE_TODOS_AL_BROTAR } from '../src/botas/hallazgos';

/* La carpeta de las mesas de verdad de la última parte, ANTES de que nada cargue `mesas.ts`. */
const CARPETA_DE_MESAS = fs.mkdtempSync(path.join(os.tmpdir(), 'hallazgos-'));
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

async function vaciar(): Promise<void> {
  for (let i = 0; i < 3; i++) await new Promise<void>((r) => setImmediate(r));
}

const U = UNO;

// ---------------------------------------------------------------------------
// EL RELOJ, LOS ENCHUFES, LA MESA Y LOS MUNDOS, DE MENTIRA (los de `verify:sala-de-botas`)
// ---------------------------------------------------------------------------

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

class EnchufeDeMentira implements Enchufe {
  readonly textos: string[] = [];
  cierre: { codigo: number; razon: string } | null = null;

  enviar(texto: string): void {
    if (this.cierre === null) this.textos.push(texto);
  }

  cerrar(codigo: number, razon: string): void {
    if (this.cierre === null) this.cierre = { codigo, razon };
  }

  pendientes(): number {
    return 0;
  }

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
}

interface MesaDeMentira {
  arcade: string;
  rev: number;
  asientos: string[];
  llaves: Map<string, string>;
  mundo: MundoDeclarado | null;
  armas?: Record<string, string>;
  /**
   * Lo que contesta a cada hallazgo: por defecto `entro`. `lanza` es una mesa que revienta, y
   * `colgada` una que no contesta hasta que la prueba la suelta (`COLGADAS`).
   */
  respuesta?: SalidaDelBotin | 'lanza' | 'colgada';
}

const MESAS = new Map<string, MesaDeMentira>();

/** Lo que la sala le ha pedido meter a la mesa de mentira, leído como lo lee un reductor. */
const HALLAZGOS_PEDIDOS: { codigo: string; tipo: string; carga: unknown; leido: { para: string; clase: string } | null }[] = [];

/** Las respuestas que la mesa de mentira tiene colgadas: la prueba las suelta con lo que quiera. */
const COLGADAS: ((salida: SalidaDelBotin) => void)[] = [];

const LA_MESA: LaMesa = {
  hallazgo: async (codigo, para, clase) => {
    const m = MESAS.get(codigo);
    const mov = movimientoDelHallazgo(para, clase);
    const clases = (TABLAS.get(m?.arcade ?? '') ?? []).map((c) => c.clase);
    HALLAZGOS_PEDIDOS.push({ codigo, tipo: mov.tipo, carga: mov.carga, leido: leerElHallazgo(mov.carga, null, m?.asientos ?? [], clases) });
    const r = m?.respuesta ?? 'entro';
    if (r === 'lanza') throw new Error('la mesa de mentira revienta al meter el hallazgo');
    if (r === 'colgada') {
      const salida = await new Promise<SalidaDelBotin>((soltar) => COLGADAS.push(soltar));
      return { salida };
    }
    return r === 'rechazado' ? { salida: r, motivo: 'ha quebrado' } : { salida: r };
  },
  quienEsLaLlave: async (codigo, llave) => {
    const m = MESAS.get(codigo);
    const id = m?.llaves.get(llave);
    return id === undefined ? null : { id, modalidad: 'botas' };
  },
  revision: async (codigo) => {
    const m = MESAS.get(codigo);
    return m === undefined ? null : { rev: m.rev, terminada: false };
  },
  vista: async (codigo) => {
    const m = MESAS.get(codigo);
    if (m === undefined) return null;
    return {
      arcade: m.arcade,
      rev: m.rev,
      terminada: false,
      asientos: [...m.asientos],
      vista: m.armas === undefined ? { mundo: m.mundo } : { mundo: m.mundo, armas: { ...m.armas } },
    };
  },
};

/** Las tablas de prueba: el campo tiene dos clases con pesos 3 y 1; el prado, ninguna. */
const TABLAS = new Map<string, readonly ClaseDeHallazgo[]>([
  [
    'campo',
    [
      { clase: 'moneda', peso: 3 },
      { clase: 'joya', peso: 1 },
    ],
  ],
]);

/** Cuántas veces ha leído la sala el arma de alguien: tiene que ser una por asiento y revisión. */
let lecturasDeArma = 0;

const LOS_MUNDOS: LosMundos = {
  sePuedeRecorrer: (arcade) => arcade === 'campo' || arcade === 'prado' || arcade === 'riberas' || arcade === 'burgo',
  mundoDeLaMesa: (_arcade, vista) => (vista as { mundo: MundoDeclarado | null }).mundo,
  hallazgosDelJuego: (arcade) => TABLAS.get(arcade) ?? [],
  armaEnLaRefriega: (arcade, vista, asiento) => {
    lecturasDeArma++;
    return armaEnLaRefriega(arcade, vista, asiento);
  },
};

// ---------------------------------------------------------------------------
// LOS MUNDOS DE PRUEBA
// ---------------------------------------------------------------------------

/*
 * EL CAMPO: tres por tres casillas de 16 unidades —de −24 a 24—, sin nada en medio, y ocho sitios de
 * nacer repartidos. Pequeño a propósito: de cualquier brote a cualquier otro se llega en pocos
 * segundos, y así los topes del minuto se alcanzan dentro del minuto.
 */
const CASILLAS_DEL_CAMPO: { x: number; y: number }[] = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) CASILLAS_DEL_CAMPO.push({ x, y });
const NACE_EN_EL_CAMPO = [
  { x: -12, z: -12, rumbo: 0 },
  { x: 12, z: -12, rumbo: 0 },
  { x: -12, z: 12, rumbo: 0 },
  { x: 12, z: 12, rumbo: 0 },
  { x: 0, z: -18, rumbo: 0 },
  { x: 0, z: 18, rumbo: 0 },
  { x: -18, z: 0, rumbo: 0 },
  { x: 18, z: 0, rumbo: 0 },
];
function campo(sin: readonly { x: number; y: number }[] = []): MundoDeclarado {
  return {
    lado: 16,
    pisables: CASILLAS_DEL_CAMPO.filter((c) => !sin.some((s) => s.x === c.x && s.y === c.y)),
    vados: [],
    cuerpos: [],
    nace: NACE_EN_EL_CAMPO,
  };
}
const ARENA_DEL_CAMPO: Arena = arenaDe(campo());

/* EL RUEDO, para las armas: el de `verify:sala-de-botas`, con el segundo DOS unidades al norte del primero. */
const CASILLAS_DEL_RUEDO: { x: number; y: number }[] = [];
for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) CASILLAS_DEL_RUEDO.push({ x, y });
function ruedo(): MundoDeclarado {
  return {
    lado: 16,
    pisables: CASILLAS_DEL_RUEDO,
    vados: [],
    cuerpos: [],
    nace: [
      { x: 0, z: 0, rumbo: 0 },
      { x: 0, z: -2, rumbo: Math.PI },
      { x: 60, z: 0, rumbo: 0 },
    ],
  };
}

let serie = 0;

function mesaNueva(opciones: Partial<MesaDeMentira> & { asientos?: string[] } = {}): { codigo: string; llave: (a: string) => string } {
  serie++;
  const codigo = `HZ${String(serie).padStart(3, '0')}`;
  const asientos = opciones.asientos ?? ['a-uno', 'a-dos', 'a-tres'];
  const llaves = new Map<string, string>();
  for (const a of asientos) llaves.set(`llave-${codigo}-${a}`, a);
  MESAS.set(codigo, { arcade: 'campo', rev: 1, mundo: campo(), ...opciones, asientos, llaves });
  return { codigo, llave: (a) => `llave-${codigo}-${a}` };
}

const LO_QUE_SE_REGISTRA: string[] = [];

function canalNuevo(): { canal: CanalDeBotas; reloj: RelojDeMentira } {
  const reloj = new RelojDeMentira();
  const canal = new CanalDeBotas({
    reloj,
    mesa: LA_MESA,
    mundos: LOS_MUNDOS,
    registrar: (linea) => LO_QUE_SE_REGISTRA.push(linea),
    semillaDeLaSala: () => 0x5eed,
  });
  return { canal, reloj };
}

const j = (v: unknown): string => JSON.stringify(v);

interface Dentro {
  canal: CanalDeBotas;
  conexion: Conexion;
  enchufe: EnchufeDeMentira;
  yo: string;
  x: number;
  z: number;
  n: number;
}

async function entrar(canal: CanalDeBotas, codigo: string, llave: string): Promise<Dentro> {
  const enchufe = new EnchufeDeMentira();
  const conexion = canal.abrir(codigo, enchufe);
  conexion.recibir(j({ t: 'hola', v: VERSION_DEL_CANAL, llave }));
  await vaciar();
  const d = enchufe.ultimo('dentro');
  return { canal, conexion, enchufe, yo: d?.yo ?? '', x: d?.x ?? NaN, z: d?.z ?? NaN, n: 0 };
}

type Resultado = 'aceptado' | 'corregido' | 'ignorado';

function paso3(d: Dentro, x: number, z: number): Resultado {
  const antes = d.canal.diagnostico().aceptados;
  const corriges = d.enchufe.de('corrige').length;
  d.n++;
  d.conexion.recibir(j({ t: 'aqui', n: d.n, x, z, r: 0, m: 2 }));
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

const PASO = deNumero(0.9);

/** Un paso de un tic hacia `(x, z)`, en línea recta; el último, justo en el sitio. */
function unPasoHacia(d: Dentro, x: number, z: number): Resultado {
  const dx = x - d.x;
  const dz = z - d.z;
  const l = Math.hypot(dx, dz);
  if (l <= PASO) return paso3(d, x, z);
  return paso3(d, d.x + Math.round((dx * PASO) / l), d.z + Math.round((dz * PASO) / l));
}

/** Lleva a alguien en línea recta hasta `(x, z)`, un paso cada 50 ms. `true` si llega sin que le corrijan. */
async function irRecto(reloj: RelojDeMentira, d: Dentro, x: number, z: number): Promise<boolean> {
  for (let i = 0; i < 4000 && (d.x !== x || d.z !== z); i++) {
    await reloj.avanzar(50);
    if (unPasoHacia(d, x, z) !== 'aceptado') return false;
  }
  return d.x === x && d.z === z;
}

type Punto = { readonly x: number; readonly z: number };

/** La distancia de `p` al tramo `a`-`b`, en Q16.16. En coma flotante: esto es la prueba, no arbitra nada. */
function distanciaAlTramo(p: Punto, a: Punto, b: Punto): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
  return Math.hypot(a.x + t * dx - p.x, a.z + t * dz - p.z);
}

const LEJOS_DEL_BROTE = deNumero(2.2);

/**
 * Lleva a alguien hasta `(x, z)` SIN PASAR a menos de 2,2 u de `evitar`: en recta si se puede, y si
 * no, por un sitio de paso que lo rodee. `true` si llega.
 */
async function irEsquivando(reloj: RelojDeMentira, arena: Arena, d: Dentro, x: number, z: number, evitar: Punto): Promise<boolean> {
  const hasta = { x, z };
  if (distanciaAlTramo(evitar, d, hasta) >= LEJOS_DEL_BROTE) return irRecto(reloj, d, x, z);
  const lejos = deNumero(8);
  const candidatos = [
    { x, z: z + lejos },
    { x, z: z - lejos },
    { x: x + lejos, z },
    { x: x - lejos, z },
    { x: d.x, z: d.z + lejos },
    { x: d.x, z: d.z - lejos },
    { x: d.x + lejos, z: d.z },
    { x: d.x - lejos, z: d.z },
  ];
  for (const w of candidatos) {
    if (!sePuedeEstar(arena, w.x, w.z, RADIO_DEL_PASEANTE)) continue;
    if (distanciaAlTramo(evitar, d, w) < LEJOS_DEL_BROTE || distanciaAlTramo(evitar, w, hasta) < LEJOS_DEL_BROTE) continue;
    if (!(await irRecto(reloj, d, w.x, w.z))) return false;
    return irRecto(reloj, d, x, z);
  }
  return false;
}

type BroteVisto = readonly [number, string, number, number];

function brotesQueVe(d: Dentro): readonly BroteVisto[] {
  return d.enchufe.ultimo('brotes')?.b ?? [];
}

function masCercanoA(d: Dentro): BroteVisto | undefined {
  let mejor: BroteVisto | undefined;
  let menor = Infinity;
  for (const b of brotesQueVe(d)) {
    const dd = Math.hypot(b[2] - d.x, b[3] - d.z);
    if (dd < menor) {
      menor = dd;
      mejor = b;
    }
  }
  return mejor;
}

function recogesDe(d: Dentro, por?: string): number {
  return d.enchufe.de('recoge').filter((r) => por === undefined || r.por === por).length;
}

/** Va hasta el brote más cercano; `true` si lo ha recogido él (o cualquier otro por el camino). */
async function irAlMasCercano(reloj: RelojDeMentira, d: Dentro): Promise<boolean> {
  const b = masCercanoA(d);
  if (b === undefined) return false;
  const antes = recogesDe(d, d.yo);
  for (let i = 0; i < 4000 && recogesDe(d, d.yo) === antes && (d.x !== b[2] || d.z !== b[3]); i++) {
    await reloj.avanzar(50);
    if (unPasoHacia(d, b[2], b[3]) !== 'aceptado') return false;
  }
  return recogesDe(d, d.yo) > antes;
}

function rumboHacia(desde: Punto, hacia: Punto): number {
  return rumboDeRadianes(Math.atan2(hacia.x - desde.x, -(hacia.z - desde.z)));
}

function golpear(d: Dentro, r: number): void {
  d.n++;
  d.conexion.recibir(j({ t: 'golpe', n: d.n, r }));
}

// ---------------------------------------------------------------------------
// 1 · LA LISTA SOLA
// ---------------------------------------------------------------------------

paso('La lista de brotes, sola: sitios, siembra, ids, pesos, radio, cadena y arena que cambia');
{
  const sitios = sitiosDeHallazgo(ARENA_DEL_CAMPO);
  comprobar('el campo tiene sitios donde brotar', sitios.length > 10, sitios.length);
  comprobar(
    'y en todos cabe alguien con holgura',
    sitios.length > 0 && sitios.every((s) => sePuedeEstar(ARENA_DEL_CAMPO, s.x, s.z, RADIO_DEL_PASEANTE * 2)),
  );

  const clases = TABLAS.get('campo') ?? [];
  const lista = new BrotesDeLaSala(clases, azarConSemilla(1));
  const alguien = { x: 0, z: 0 };
  const hayAlguien = (x: number, z: number): boolean =>
    Math.abs(x - alguien.x) < LEJOS_DE_TODOS_AL_BROTAR && Math.abs(z - alguien.z) < LEJOS_DE_TODOS_AL_BROTAR;
  lista.ponerLaArena(ARENA_DEL_CAMPO, hayAlguien);
  comprobar('rellenar dice que ha brotado algo', lista.rellenar(6, hayAlguien));
  const brotados = lista.lista();
  comprobar('brotan los que se piden: seis', brotados.length === 6, brotados.length);
  comprobar('en seis sitios distintos', new Set(brotados.map((b) => `${String(b.x)},${String(b.z)}`)).size === 6);
  const claves = new Set(sitios.map((s) => `${String(s.x)},${String(s.z)}`));
  comprobar('todos en sitios de la rejilla', brotados.length > 0 && brotados.every((b) => claves.has(`${String(b.x)},${String(b.z)}`)));
  comprobar('ninguno encima de quien está', brotados.length > 0 && brotados.every((b) => !hayAlguien(b.x, b.z)));
  comprobar('los ids empiezan en uno y crecen', brotados.map((b) => b.id).join() === '1,2,3,4,5,6', brotados.map((b) => b.id));
  comprobar('con clases de la tabla', brotados.length > 0 && brotados.every((b) => b.clase === 'moneda' || b.clase === 'joya'));
  comprobar('rellenar sin que falte nada no hace nada', !lista.rellenar(6, hayAlguien));

  const t1 = lista.texto();
  comprobar('la cadena se guarda: la misma mientras no cambie', lista.texto() === t1);
  const leido = leerMensajeDelServidor(t1);
  comprobar(
    'y el lector estricto del aparato la lee entera',
    leido !== null && leido.t === 'brotes' && leido.b.length === 6 && leido.b.every((e, i) => e[0] === brotados[i]?.id && e[2] === brotados[i]?.x),
    t1,
  );
  const quitado = brotados[2];
  comprobar('quitar uno que está dice que sí', quitado !== undefined && lista.quitar(quitado.id));
  comprobar('y uno que no está, que no', !lista.quitar(999));
  comprobar('tras quitar, otra cadena', lista.texto() !== t1);
  lista.rellenar(6, hayAlguien);
  const nuevo = lista.lista().find((b) => !brotados.some((v) => v.id === b.id));
  comprobar('el que vuelve a brotar lleva un id nuevo, mayor que todos', nuevo !== undefined && nuevo.id === 7, nuevo);

  /* EL RADIO, en el borde exacto: 1,5 u es 98.304 en Q16.16. */
  const b = lista.lista()[0];
  if (b === undefined) comprobar('hay un brote para medir el radio', false);
  else {
    const radio = RADIO_DE_RECOGER * U;
    comprobar('a 1,5 u justas, al alcance', lista.alAlcance(b.x + radio, b.z)?.id === b.id);
    comprobar('a 1,5 u y un pelo, no', lista.alAlcance(b.x + radio + 1, b.z) === null || lista.alAlcance(b.x + radio + 1, b.z)?.id !== b.id);
    comprobar('encima, al alcance', lista.alAlcance(b.x, b.z)?.id === b.id);
    comprobar('en diagonal dentro del radio, al alcance', lista.alAlcance(b.x + 69000, b.z - 69000)?.id === b.id);
    comprobar('en diagonal a 1,5 u por eje (2,12 u), no', lista.alAlcance(b.x + radio, b.z + radio)?.id !== b.id);
  }

  /* LOS PESOS: 3 a 1, en cuatro mil siembras. */
  const pesada = new BrotesDeLaSala(
    [
      { clase: 'a', peso: 6 },
      { clase: 'b', peso: 3 },
      { clase: 'c', peso: 1 },
      { clase: 'nunca', peso: 0 },
    ],
    azarConSemilla(99),
  );
  pesada.ponerLaArena(ARENA_DEL_CAMPO, () => false);
  const veces: Record<string, number> = { a: 0, b: 0, c: 0, nunca: 0 };
  const TIRADAS = 4000;
  for (let i = 0; i < TIRADAS; i++) {
    pesada.rellenar(1, () => false);
    const uno = pesada.lista()[0];
    if (uno === undefined) break;
    veces[uno.clase] = (veces[uno.clase] ?? 0) + 1;
    pesada.quitar(uno.id);
  }
  const total = (veces.a ?? 0) + (veces.b ?? 0) + (veces.c ?? 0) + (veces.nunca ?? 0);
  comprobar('se han sembrado las cuatro mil', total === TIRADAS, veces);
  comprobar(
    'la clase sale por peso: 60 %, 30 %, 10 %, y la de peso cero nunca',
    Math.abs((veces.a ?? 0) / TIRADAS - 0.6) < 0.04 &&
      Math.abs((veces.b ?? 0) / TIRADAS - 0.3) < 0.04 &&
      Math.abs((veces.c ?? 0) / TIRADAS - 0.1) < 0.03 &&
      veces.nunca === 0,
    veces,
  );

  /* LA ARENA CAMBIA: la casilla de un brote desaparece. */
  const movida = new BrotesDeLaSala(clases, azarConSemilla(5));
  movida.ponerLaArena(ARENA_DEL_CAMPO, () => false);
  movida.rellenar(4, () => false);
  const victima = movida.lista()[0];
  if (victima === undefined) comprobar('hay un brote al que quitarle el suelo', false);
  else {
    const casilla = { x: Math.round(victima.x / U / 16), y: Math.round(-victima.z / U / 16) };
    const sinSuelo = arenaDe(campo([casilla]));
    const otros = movida.lista().filter((b) => b.id !== victima.id);
    comprobar('con otra arena, la lista cambia', movida.ponerLaArena(sinSuelo, () => false));
    const despues = movida.lista().find((b) => b.id === victima.id);
    const nuevosSitios = new Set(sitiosDeHallazgo(sinSuelo).map((s) => `${String(s.x)},${String(s.z)}`));
    comprobar(
      'el que se quedó sin suelo se recoloca: mismo id, misma clase, en un sitio de la arena nueva',
      despues !== undefined &&
        despues.clase === victima.clase &&
        (despues.x !== victima.x || despues.z !== victima.z) &&
        nuevosSitios.has(`${String(despues.x)},${String(despues.z)}`),
      { victima, despues },
    );
    comprobar(
      'los que seguían en un sitio bueno no se mueven',
      otros.length > 0 && otros.every((o) => movida.lista().some((b) => b.id === o.id && b.x === o.x && b.z === o.z)),
    );
    /*
     * Y una arena sin sitios: una sola casilla de cuatro unidades, la (4, 4), que cubre x en [14, 18) y
     * z en (−18, −14] —las filas van por −z—: ningún múltiplo de seis cae dentro. La (5, 5) que había
     * aquí SÍ contiene el punto (18, −18); sólo parecía vacía porque la rejilla se tomaba por z a secas.
     */
    const enana = arenaDe({ lado: 4, pisables: [{ x: 4, y: 4 }], vados: [], cuerpos: [], nace: [] });
    comprobar('una arena sin sitios, de verdad sin sitios', sitiosDeHallazgo(enana).length === 0);
    movida.ponerLaArena(enana, () => false);
    comprobar('sin sitio para nadie, los brotes se quitan', movida.cuantos === 0, movida.lista());
  }

  const sinTabla = new BrotesDeLaSala([], azarConSemilla(3));
  sinTabla.ponerLaArena(ARENA_DEL_CAMPO, () => false);
  comprobar('un juego sin tabla no tiene brotes', !sinTabla.hayTabla && !sinTabla.rellenar(6, () => false) && sinTabla.cuantos === 0);
}

// ---------------------------------------------------------------------------
// 2 · LA SALA
// ---------------------------------------------------------------------------

paso('Al entrar: `brotes` justo después de `vidas`, con los que tocan; y un juego sin tabla, ninguno');
{
  const { canal } = canalNuevo();
  const m = mesaNueva();
  const a = await entrar(canal, m.codigo, m.llave('a-uno'));
  const tipos = a.enchufe.mensajes().map((x) => x?.t);
  comprobar('dentro, vidas, brotes, en ese orden', tipos.slice(0, 3).join() === 'dentro,vidas,brotes', tipos);
  const b = brotesQueVe(a);
  comprobar('brotan brotesDeLaMesa(3) = 6', b.length === brotesDeLaMesa(3) && b.length === 6, b.length);
  const sala = MESAS.get(m.codigo);
  comprobar(
    'ninguno nace encima de nadie (los tres de pie en su sitio de nacer)',
    b.length > 0 &&
      b.every((e) =>
        NACE_EN_EL_CAMPO.slice(0, 3).every(
          (n) => Math.abs(e[2] - deNumero(n.x)) >= LEJOS_DE_TODOS_AL_BROTAR || Math.abs(e[3] - deNumero(n.z)) >= LEJOS_DE_TODOS_AL_BROTAR,
        ),
      ),
    { b, asientos: sala?.asientos },
  );
  comprobar('el diagnóstico los cuenta', canal.diagnostico().brotesVivos === 6, canal.diagnostico().brotesVivos);
  const otro = await entrar(canal, m.codigo, m.llave('a-dos'));
  comprobar('quien entra después recibe la MISMA cadena', otro.enchufe.textos[2] === a.enchufe.textos[2]);

  const { canal: canal2 } = canalNuevo();
  const sinTabla = mesaNueva({ arcade: 'prado' });
  const p = await entrar(canal2, sinTabla.codigo, sinTabla.llave('a-uno'));
  comprobar('un juego sin tabla no manda `brotes`', p.enchufe.de('dentro').length === 1 && p.enchufe.de('brotes').length === 0, p.enchufe.textos);
  comprobar('ni tiene brotes vivos', canal2.diagnostico().brotesVivos === 0);
  canal.apagar();
  canal2.apagar();
}

paso('Se recoge al pasar: `recoge` y `brotes` a toda la sala, y el hallazgo a la mesa');
{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const a = await entrar(canal, m.codigo, m.llave('a-uno'));
  const b = await entrar(canal, m.codigo, m.llave('a-dos'));
  const pedidosAntes = HALLAZGOS_PEDIDOS.length;
  const objetivo = masCercanoA(a);
  if (objetivo === undefined) comprobar('hay un brote al que ir', false);
  else {
    /*
     * PASAR, NO PARARSE: a una unidad de él, de lado, y seguir cinco más en la misma dirección. Se
     * llega al punto de al lado esquivándolo, y luego se cruza.
     */
    const [id, clase, bx, bz] = objetivo;
    const lado = sePuedeEstar(ARENA_DEL_CAMPO, bx + deNumero(1), bz + deNumero(3), RADIO_DEL_PASEANTE) ? 1 : -1;
    const desde = { x: bx + deNumero(1), z: bz + lado * deNumero(3) };
    const llego = await irEsquivando(reloj, ARENA_DEL_CAMPO, a, desde.x, desde.z, { x: bx, z: bz });
    comprobar('se llega a un lado del brote sin haberlo recogido', llego && brotesQueVe(a).some((e) => e[0] === id), { llego });
    const recogesAntes = recogesDe(a);
    const textosDeBAntes = b.enchufe.textos.length;
    const vivosAntes = brotesQueVe(b).length;
    const dgAntes = canal.diagnostico().hallazgos;
    const pedidosAntes2 = HALLAZGOS_PEDIDOS.length;
    /* Cruzando, un paso por tic; se apunta CUÁNDO se recoge, que es desde cuando cuenta el rebrote. */
    let recogidoEn: number | null = null;
    const hastaX = bx + deNumero(1);
    const hastaZ = bz - lado * deNumero(3);
    for (let i = 0; i < 200 && (a.x !== hastaX || a.z !== hastaZ); i++) {
      await reloj.avanzar(50);
      unPasoHacia(a, hastaX, hastaZ);
      if (recogidoEn === null && recogesDe(a) > recogesAntes) recogidoEn = reloj.t;
    }
    await vaciar();
    if (recogidoEn === null && recogesDe(a) > recogesAntes) recogidoEn = reloj.t;
    const suyo = a.enchufe.de('recoge').find((r) => r.h === id);
    comprobar('al pasar a una unidad, se recoge: `recoge` con su id, quién y la clase', suyo !== undefined && suyo.por === 'a-uno' && suyo.clase === clase, a.enchufe.de('recoge'));
    comprobar('y ninguno más por el camino que el que se cruzó', recogesDe(a) === recogesAntes + 1, recogesDe(a) - recogesAntes);
    const deB = b.enchufe.mensajes().slice(textosDeBAntes).filter((x) => x !== null && (x.t === 'recoge' || x.t === 'brotes'));
    comprobar(
      'el otro de la sala lo ve: `recoge` y DETRÁS el `brotes` nuevo, sin él',
      deB.length === 2 && deB[0]?.t === 'recoge' && deB[1]?.t === 'brotes' && deB[1].b.length === vivosAntes - 1 && !deB[1].b.some((e) => e[0] === id),
      { deB, vivosAntes },
    );
    comprobar('(la mesa de mentira no había recibido nada al cruzar)', pedidosAntes2 >= pedidosAntes);
    const pedidos = HALLAZGOS_PEDIDOS.slice(pedidosAntes2);
    const pedido = pedidos[0];
    comprobar(
      'la mesa recibe UN movimiento `arcade:hallazgo {para, clase}` que su lector acepta',
      pedidos.length === 1 &&
        pedido !== undefined &&
        pedido.codigo === m.codigo &&
        pedido.tipo === TIPO_DEL_HALLAZGO &&
        pedido.leido !== null &&
        pedido.leido.para === 'a-uno' &&
        pedido.leido.clase === clase,
      pedidos,
    );
    await vaciar();
    const dg = canal.diagnostico();
    comprobar(
      'el diagnóstico cuenta el recogido y el que entró',
      dg.hallazgos.recogidos === dgAntes.recogidos + 1 && dg.hallazgos.entro === dgAntes.entro + 1,
      { antes: dgAntes, despues: dg.hallazgos },
    );

    /*
     * EL REBROTE: a los REBROTE_MS de recogerlo, y no antes. Si por el camino hasta el lado se recogió
     * otro, su rebrote llega antes: se mira el que falta por el de ESTE brote.
     */
    const faltanAhora = brotesDeLaMesa(3) - brotesQueVe(b).length;
    comprobar('(se sabe cuándo se recogió)', recogidoEn !== null);
    const t0 = recogidoEn ?? reloj.t;
    await reloj.avanzar(t0 + REBROTE_MS - 100 - reloj.t);
    comprobar(
      'un poco antes de su rebrote, sigue faltando al menos él',
      brotesQueVe(b).length <= brotesDeLaMesa(3) - 1 && faltanAhora >= 1,
      { ahora: brotesQueVe(b).length, faltanAhora },
    );
    await reloj.avanzar(200);
    const ahora = brotesQueVe(b);
    const maxAntes = Math.max(...(a.enchufe.de('brotes')[0]?.b ?? []).map((e) => e[0]));
    comprobar('a los REBROTE_MS vuelve a haber seis', ahora.length === 6, ahora.length);
    comprobar(
      'el nuevo lleva un id mayor que todos los de antes',
      ahora.some((e) => e[0] > maxAntes && e[0] !== id),
      { ahora: ahora.map((e) => e[0]), maxAntes },
    );
    const nuevo = ahora.find((e) => e[0] > maxAntes);
    comprobar(
      'y no brota encima de nadie',
      nuevo !== undefined &&
        [a, b].every((d) => Math.abs(nuevo[2] - d.x) >= LEJOS_DE_TODOS_AL_BROTAR || Math.abs(nuevo[3] - d.z) >= LEJOS_DE_TODOS_AL_BROTAR),
      { nuevo, a: [a.x, a.z], b: [b.x, b.z] },
    );
    comprobar('el diagnóstico cuenta el rebrote', canal.diagnostico().hallazgos.rebrotes >= 1, canal.diagnostico().hallazgos);
  }
  canal.apagar();
}

paso('El tope por asiento: el quinto del minuto se queda en el suelo; y sin canal no se recoge');
{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const a = await entrar(canal, m.codigo, m.llave('a-uno'));
  const b = await entrar(canal, m.codigo, m.llave('a-dos'));
  let primero: number | null = null;
  for (let i = 0; i < 12 && recogesDe(a, 'a-uno') < HALLAZGOS_POR_ASIENTO_Y_MINUTO; i++) {
    await irAlMasCercano(reloj, a);
    if (primero === null && recogesDe(a, 'a-uno') > 0) primero = reloj.t;
  }
  comprobar('recoge los cuatro del minuto', recogesDe(a, 'a-uno') === HALLAZGOS_POR_ASIENTO_Y_MINUTO, recogesDe(a, 'a-uno'));
  const quinto = masCercanoA(a);
  if (quinto === undefined || primero === null) comprobar('queda un quinto al que ir', false);
  else {
    const topesAntes = canal.diagnostico().hallazgos.porTopeDeAsiento;
    await irRecto(reloj, a, quinto[2], quinto[3]);
    const dentroDelMinuto = reloj.t - primero < 60_000;
    comprobar('(la prueba sigue dentro del minuto del primero)', dentroDelMinuto, reloj.t - primero);
    comprobar('encima del quinto, dentro del minuto: no se recoge', recogesDe(a, 'a-uno') === HALLAZGOS_POR_ASIENTO_Y_MINUTO);
    comprobar('el brote se queda en el suelo', brotesQueVe(b).some((e) => e[0] === quinto[0]));
    comprobar('y el tope se cuenta', canal.diagnostico().hallazgos.porTopeDeAsiento > topesAntes, canal.diagnostico().hallazgos);

    /* SIN CANAL: se va encima del brote, y pasa el minuto. Nadie anda por él: sigue ahí. */
    a.conexion.seCerro();
    const recogidos = canal.diagnostico().hallazgos.recogidos;
    for (let t = 0; t < 70_000; t += 10_000) {
      await reloj.avanzar(10_000);
      /* El otro se mueve un paso de vez en cuando, para que no le cierren por quieto; cerca de su sitio. */
      unPasoHacia(b, b.x + (t % 20_000 === 0 ? PASO : -PASO), b.z);
    }
    comprobar('pasado el minuto, quien se fue sigue de pie encima y NO lo recoge', canal.diagnostico().hallazgos.recogidos === recogidos);
    comprobar('el brote sigue en la lista de la sala', brotesQueVe(b).some((e) => e[0] === quinto[0]), brotesQueVe(b));
    /* Vuelve, donde estaba, y da un paso sin moverse: ahora sí. */
    const vuelve = await entrar(canal, m.codigo, m.llave('a-uno'));
    comprobar('al volver, está donde se quedó y el brote en su lista', vuelve.x === quinto[2] && vuelve.z === quinto[3] && brotesQueVe(vuelve).some((e) => e[0] === quinto[0]));
    await reloj.avanzar(50);
    paso3(vuelve, vuelve.x, vuelve.z);
    await vaciar();
    comprobar('y al andar (aunque sea quieto), pasado el minuto, lo recoge', vuelve.enchufe.de('recoge').some((r) => r.h === quinto[0] && r.por === 'a-uno'));
  }
  canal.apagar();
}

paso('Quien está caído no recoge');
{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ asientos: ['a-uno', 'a-dos'] });
  const a = await entrar(canal, m.codigo, m.llave('a-uno'));
  const b = await entrar(canal, m.codigo, m.llave('a-dos'));
  const brote = masCercanoA(a);
  if (brote === undefined) comprobar('hay un brote', false);
  else {
    const [id, , bx, bz] = brote;
    const signo = sePuedeEstar(ARENA_DEL_CAMPO, bx + deNumero(3.6), bz, RADIO_DEL_PASEANTE) ? 1 : -1;
    const sitioDeA = { x: bx + signo * deNumero(2.4), z: bz };
    const sitioDeB = { x: bx + signo * deNumero(3.6), z: bz };
    const llegaA = await irEsquivando(reloj, ARENA_DEL_CAMPO, a, sitioDeA.x, sitioDeA.z, { x: bx, z: bz });
    const llegaB = await irEsquivando(reloj, ARENA_DEL_CAMPO, b, sitioDeB.x, sitioDeB.z, { x: bx, z: bz });
    comprobar('los dos llegan sin haberlo recogido', llegaA && llegaB && brotesQueVe(a).some((e) => e[0] === id), { llegaA, llegaB });
    await reloj.avanzar(400);
    for (let g = 0; g < VIDA_ENTERA; g++) {
      golpear(b, rumboHacia(b, a));
      await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 50);
    }
    const caido = a.enchufe.de('cae').some((c) => c.a === 'a-uno');
    comprobar('le tumban a tres golpes', caido, a.enchufe.de('da'));
    /* Un paso legal hasta 1,2 u del brote: de pie se recogería. */
    paso3(a, bx + signo * deNumero(1.2), bz);
    await reloj.avanzar(50);
    paso3(a, bx + signo * deNumero(1.2), bz);
    comprobar('caído, ni se mueve ni recoge', !a.enchufe.de('recoge').some((r) => r.h === id) && brotesQueVe(b).some((e) => e[0] === id));
    comprobar('su vida es cero y está caído', a.enchufe.ultimo('da')?.vida === 0 && a.enchufe.ultimo('cae')?.a === 'a-uno');
  }
  canal.apagar();
}

paso('La mesa no lo quiere (sin efecto, rechazado, revienta): el brote se queda, sin `recoge` y sin gastar topes');
{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const mesa = MESAS.get(m.codigo) as MesaDeMentira;
  const a = await entrar(canal, m.codigo, m.llave('a-uno'));
  const b = await entrar(canal, m.codigo, m.llave('a-dos'));
  const cuantosHay = brotesQueVe(b).length;
  mesa.respuesta = 'sinEfecto';
  const objetivo = masCercanoA(a);
  if (objetivo === undefined) comprobar('hay un brote', false);
  else {
    const pedidos0 = HALLAZGOS_PEDIDOS.length;
    await irRecto(reloj, a, objetivo[2], objetivo[3]);
    await vaciar();
    const dg1 = canal.diagnostico().hallazgos;
    comprobar('se le ha pedido a la mesa', HALLAZGOS_PEDIDOS.length > pedidos0, HALLAZGOS_PEDIDOS.length - pedidos0);
    comprobar('sin efecto: ni un `recoge` a nadie', recogesDe(a) === 0 && recogesDe(b) === 0, a.enchufe.de('recoge'));
    comprobar('el brote sigue en el suelo, y todos los demás', brotesQueVe(b).some((e) => e[0] === objetivo[0]) && brotesQueVe(b).length === cuantosHay);
    comprobar('se cuenta como sin efecto y no como recogido', dg1.sinEfecto >= 1 && dg1.recogidos === 0, dg1);

    /* PARADO ENCIMA: no se pregunta a la mesa en cada paso, sino tras la espera. */
    const pedidos1 = HALLAZGOS_PEDIDOS.length;
    for (let t = 0; t < ESPERA_TRAS_NEGATIVA_MS - 300; t += 50) {
      await reloj.avanzar(50);
      paso3(a, a.x, a.z);
    }
    await vaciar();
    comprobar('parado encima durante la espera, ni una pregunta más a la mesa', HALLAZGOS_PEDIDOS.length === pedidos1, HALLAZGOS_PEDIDOS.length - pedidos1);
    mesa.respuesta = 'rechazado';
    for (let t = 0; t < 600; t += 50) {
      await reloj.avanzar(50);
      paso3(a, a.x, a.z);
    }
    await vaciar();
    comprobar('pasada la espera, se vuelve a preguntar UNA vez', HALLAZGOS_PEDIDOS.length === pedidos1 + 1, HALLAZGOS_PEDIDOS.length - pedidos1);
    const dg2 = canal.diagnostico().hallazgos;
    comprobar('rechazado (ha quebrado): el brote se queda y no se recoge', dg2.rechazado >= 1 && dg2.recogidos === 0 && brotesQueVe(b).some((e) => e[0] === objetivo[0]), dg2);

    mesa.respuesta = 'lanza';
    for (let t = 0; t < ESPERA_TRAS_NEGATIVA_MS + 100; t += 50) {
      await reloj.avanzar(50);
      paso3(a, a.x, a.z);
    }
    await vaciar();
    const dg3 = canal.diagnostico().hallazgos;
    comprobar('la mesa revienta: se cuenta el fallo, y el brote se queda', dg3.fallos >= 1 && dg3.recogidos === 0 && brotesQueVe(b).some((e) => e[0] === objetivo[0]), dg3);
    comprobar('y el fallo va al registro', LO_QUE_SE_REGISTRA.some((l) => l.includes('no ha podido entrar')));

    mesa.respuesta = 'entro';
    for (let t = 0; t < ESPERA_TRAS_NEGATIVA_MS + 100 && recogesDe(b) === 0; t += 50) {
      await reloj.avanzar(50);
      paso3(a, a.x, a.z);
    }
    await vaciar();
    comprobar('cuando la mesa por fin lo quiere, es suyo', b.enchufe.de('recoge').some((r) => r.h === objetivo[0] && r.por === 'a-uno'));
    const dg4 = canal.diagnostico().hallazgos;
    comprobar('y sólo ése gasta tope: uno recogido, ningún tope mordido', dg4.recogidos === 1 && dg4.porTopeDeAsiento === 0 && dg4.porTopeDeMesa === 0, dg4);
  }
  canal.apagar();
}

paso('Mientras la mesa decide, el brote está apartado: quien llega después no se lo lleva');
{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva({ asientos: ['a-uno', 'a-dos'] });
  const mesa = MESAS.get(m.codigo) as MesaDeMentira;
  const a = await entrar(canal, m.codigo, m.llave('a-uno'));
  const b = await entrar(canal, m.codigo, m.llave('a-dos'));
  const brote = masCercanoA(a);
  if (brote === undefined) comprobar('hay un brote', false);
  else {
    const [id, , bx, bz] = brote;
    const signo = sePuedeEstar(ARENA_DEL_CAMPO, bx + deNumero(2.2), bz, RADIO_DEL_PASEANTE) ? 1 : -1;
    const llegaA = await irEsquivando(reloj, ARENA_DEL_CAMPO, a, bx + signo * deNumero(2.2), bz, { x: bx, z: bz });
    const llegaB = await irEsquivando(reloj, ARENA_DEL_CAMPO, b, bx, bz - signo * deNumero(2.2), { x: bx, z: bz });
    await vaciar();
    comprobar('los dos a 2,2 u del brote, sin haberlo tocado', llegaA && llegaB && brotesQueVe(a).some((e) => e[0] === id), { llegaA, llegaB });
    mesa.respuesta = 'colgada';
    COLGADAS.length = 0;
    const pedidos0 = HALLAZGOS_PEDIDOS.length;
    await reloj.avanzar(50);
    paso3(a, bx + signo * deNumero(1), bz);
    await vaciar();
    comprobar('llega el primero: UNA petición a la mesa, colgada', HALLAZGOS_PEDIDOS.length === pedidos0 + 1 && COLGADAS.length === 1, HALLAZGOS_PEDIDOS.length - pedidos0);
    comprobar('y el brote sigue a la vista de todos', brotesQueVe(b).some((e) => e[0] === id) && recogesDe(b) === 0);
    await reloj.avanzar(50);
    paso3(b, bx, bz - signo * deNumero(1));
    await reloj.avanzar(50);
    paso3(b, bx, bz);
    await vaciar();
    comprobar('llega el segundo, encima: no se pide nada por él', HALLAZGOS_PEDIDOS.length === pedidos0 + 1, HALLAZGOS_PEDIDOS.length - pedidos0);
    COLGADAS.shift()?.('entro');
    await vaciar();
    const suyo = b.enchufe.de('recoge').find((r) => r.h === id);
    comprobar('la mesa contesta que entró: es del primero, y lo ven los dos', suyo !== undefined && suyo.por === 'a-uno' && a.enchufe.de('recoge').some((r) => r.h === id));
    comprobar('y el segundo no se lleva nada', !b.enchufe.de('recoge').some((r) => r.por === 'a-dos'));
    mesa.respuesta = 'entro';
  }
  canal.apagar();
}

paso('El tope por mesa: ocho corriendo a la vez, veinte en el minuto y ni uno más');
{
  const { canal, reloj } = canalNuevo();
  const asientos = ['o-1', 'o-2', 'o-3', 'o-4', 'o-5', 'o-6', 'o-7', 'o-8'];
  const m = mesaNueva({ asientos });
  const todos: Dentro[] = [];
  for (const s of asientos) todos.push(await entrar(canal, m.codigo, m.llave(s)));
  comprobar('con ocho sentados brotan once', brotesQueVe(todos[0] as Dentro).length === brotesDeLaMesa(8), brotesQueVe(todos[0] as Dentro).length);
  const inicio = reloj.t;
  let primero: number | null = null;
  const testigo = todos[0] as Dentro;
  while (reloj.t - inicio < 120_000) {
    await reloj.avanzar(50);
    for (const d of todos) {
      const b = masCercanoA(d);
      if (b === undefined) paso3(d, d.x, d.z);
      else unPasoHacia(d, b[2], b[3]);
    }
    if (primero === null && recogesDe(testigo) > 0) primero = reloj.t;
    if (primero !== null && reloj.t - primero >= 57_000) break;
  }
  const recoges = testigo.enchufe.de('recoge');
  comprobar('(alguien ha recogido algo)', primero !== null && recoges.length > 0, recoges.length);
  comprobar('en el primer minuto se recogen justo HALLAZGOS_POR_MESA_Y_MINUTO', recoges.length === HALLAZGOS_POR_MESA_Y_MINUTO, recoges.length);
  const porAsiento = new Map<string, number>();
  for (const r of recoges) porAsiento.set(r.por, (porAsiento.get(r.por) ?? 0) + 1);
  comprobar(
    'y nadie pasa de los suyos',
    porAsiento.size > 0 && [...porAsiento.values()].every((n) => n <= HALLAZGOS_POR_ASIENTO_Y_MINUTO),
    Object.fromEntries(porAsiento),
  );
  comprobar('el tope de la mesa ha mordido', canal.diagnostico().hallazgos.porTopeDeMesa > 0, canal.diagnostico().hallazgos);
  canal.apagar();
}

paso('El mundo cambia debajo de un brote: se recoloca con su id');
{
  const { canal, reloj } = canalNuevo();
  const m = mesaNueva();
  const a = await entrar(canal, m.codigo, m.llave('a-uno'));
  const ante = brotesQueVe(a);
  /* Uno que no esté en la casilla de nadie: así nadie tiene que ser rescatado. */
  const ocupadas = new Set([a].map((d) => `${String(Math.round(d.x / U / 16))},${String(Math.round(d.z / U / 16))}`));
  for (const n of NACE_EN_EL_CAMPO.slice(0, 3)) ocupadas.add(`${String(Math.round(n.x / 16))},${String(Math.round(n.z / 16))}`);
  const victima = ante.find((e) => !ocupadas.has(`${String(Math.round(e[2] / U / 16))},${String(Math.round(e[3] / U / 16))}`));
  if (victima === undefined) comprobar('hay un brote en una casilla sin nadie', false, ante);
  else {
    const casilla = { x: Math.round(victima[2] / U / 16), y: Math.round(-victima[3] / U / 16) };
    const mesa = MESAS.get(m.codigo);
    if (mesa !== undefined) {
      mesa.mundo = campo([casilla]);
      mesa.rev++;
    }
    const cuantosAntes = a.enchufe.de('brotes').length;
    for (let i = 0; i < 40 && a.enchufe.de('brotes').length === cuantosAntes; i++) await reloj.avanzar(100);
    const despues = brotesQueVe(a);
    const movido = despues.find((e) => e[0] === victima[0]);
    const sitios = new Set(sitiosDeHallazgo(arenaDe(campo([casilla]))).map((s) => `${String(s.x)},${String(s.z)}`));
    comprobar('llega un `brotes` nuevo', a.enchufe.de('brotes').length > cuantosAntes);
    comprobar(
      'el brote sin suelo sigue, con su id y su clase, en un sitio del mundo nuevo',
      movido !== undefined && movido[1] === victima[1] && sitios.has(`${String(movido[2])},${String(movido[3])}`),
      { victima, movido },
    );
    /* Los que siguen en un sitio bueno del mundo nuevo no se mueven (los del borde de la casilla quitada pueden). */
    const quietos = ante.filter((e) => e[0] !== victima[0] && sitios.has(`${String(e[2])},${String(e[3])}`));
    comprobar(
      'los demás, si su sitio sigue siendo bueno, siguen donde estaban',
      quietos.length > 0 && quietos.every((e) => despues.some((d) => d[0] === e[0] && d[2] === e[2] && d[3] === e[3])),
      { quietos: quietos.length },
    );
    comprobar('y siguen siendo los que tocan', despues.length === ante.length, despues.length);
  }
  canal.apagar();
}

// ---------------------------------------------------------------------------
// 3 · LAS ARMAS
// ---------------------------------------------------------------------------

paso('Las armas: los puños de siempre, el hacha, la honda y su cono, y una lectura por revisión');
{
  comprobar(
    'los puños son exactamente los números de antes',
    GOLPE_DE_PUNOS.dano === 1 &&
      GOLPE_DE_PUNOS.alcance === deNumero(ALCANCE_DEL_GOLPE) &&
      GOLPE_DE_PUNOS.alcanceAlCuadrado === deNumero(ALCANCE_DEL_GOLPE) ** 2 &&
      GOLPE_DE_PUNOS.cono === BigInt(deNumero(COSENO_CUADRADO_DEL_CONO)),
    { ...GOLPE_DE_PUNOS, cono: String(GOLPE_DE_PUNOS.cono) },
  );
  const dePunos = golpeDelArma(PUNOS);
  comprobar(
    'y `PUNOS` de la tabla de armas da lo mismo',
    dePunos.dano === GOLPE_DE_PUNOS.dano && dePunos.alcance === GOLPE_DE_PUNOS.alcance && dePunos.cono === GOLPE_DE_PUNOS.cono,
  );
  /* Por valor y no por identidad: tsx puede cargar `riberas-armas.ts` dos veces, y serían dos `PUNOS`. */
  const fuera = armaEnLaRefriega('burgo', { armas: { x: 'hacha' } }, 'x');
  comprobar(
    'fuera de Riberas, siempre los puños',
    fuera.dano === PUNOS.dano && fuera.alcance === PUNOS.alcance && fuera.cosenoCuadrado === PUNOS.cosenoCuadrado,
    fuera,
  );
  const raro = golpeDelArma({ dano: -3, alcance: Number.NaN, cosenoCuadrado: 7 });
  comprobar('un arma rara pega como los puños', raro.dano === 1 && raro.alcance === GOLPE_DE_PUNOS.alcance && raro.cono === GOLPE_DE_PUNOS.cono);
  /* El cono por defecto es el de siempre: en su borde exacto (45°), con y sin el argumento. */
  let casos = 0;
  let iguales = 0;
  for (let dx = -40; dx <= 40; dx += 7) {
    for (let dz = -40; dz <= 40; dz += 7) {
      casos++;
      if (enElCono(dx * 4096, dz * 4096, 0, -U) === enElCono(dx * 4096, dz * 4096, 0, -U, GOLPE_DE_PUNOS.cono)) iguales++;
    }
  }
  comprobar('el cono sin arma y el de los puños dicen lo mismo en toda una rejilla', casos > 100 && iguales === casos, { casos, iguales });

  /* EL HACHA: quita dos, y la vida no baja de cero. */
  {
    const { canal, reloj } = canalNuevo();
    const m = mesaNueva({ arcade: 'riberas', mundo: ruedo(), asientos: ['r-uno', 'r-dos'], armas: { 'r-uno': 'hacha' } });
    const a = await entrar(canal, m.codigo, m.llave('r-uno'));
    const b = await entrar(canal, m.codigo, m.llave('r-dos'));
    comprobar('(el ruedo no tiene tabla: no hay brotes)', a.enchufe.de('brotes').length === 0);
    await reloj.avanzar(300);
    lecturasDeArma = 0;
    golpear(a, 0);
    const primero = b.enchufe.ultimo('da');
    comprobar('con hacha, un golpe quita DOS: de 3 a 1', primero !== undefined && primero.a === 'r-dos' && primero.vida === VIDA_ENTERA - 2, primero);
    await reloj.avanzar(RECARGA_DEL_GOLPE_MS + 10);
    golpear(a, 0);
    const segundo = b.enchufe.ultimo('da');
    comprobar('el segundo la deja en cero, no en −1', segundo !== undefined && segundo.vida === 0, segundo);
    comprobar('y cae', b.enchufe.de('cae').some((c) => c.a === 'r-dos' && c.por === 'r-uno'));
    comprobar('el arma se ha leído UNA vez para dos golpes', lecturasDeArma === 1, lecturasDeArma);
    canal.apagar();
  }

  /* LA HONDA: llega a 6 u, no a 6,5, y no fuera de su cono de 20°; y la revisión nueva cambia el arma. */
  {
    const { canal, reloj } = canalNuevo();
    const m = mesaNueva({ arcade: 'riberas', mundo: ruedo(), asientos: ['r-uno', 'r-dos'], armas: { 'r-uno': 'honda' } });
    const a = await entrar(canal, m.codigo, m.llave('r-uno'));
    const b = await entrar(canal, m.codigo, m.llave('r-dos'));
    const daA = (): number => b.enchufe.de('da').length;

    const probar = async (x: number, z: number, r: number): Promise<boolean> => {
      await irRecto(reloj, b, deNumero(x), deNumero(z));
      await reloj.avanzar(Math.max(300, RECARGA_DEL_GOLPE_MS + 10));
      const antes = daA();
      golpear(a, r);
      return daA() > antes;
    };

    comprobar('con honda, a 5,5 u delante: da', await probar(0, -5.5, 0));
    comprobar('a 6 u justas: da', await probar(0, -6, 0));
    comprobar('a 6,5 u: no llega', !(await probar(0, -6.5, 0)));
    const lejosLanza = a.enchufe.de('lanza').length;
    comprobar('(los golpes que no dan se lanzan igual)', lejosLanza >= 3, lejosLanza);
    /* A 5,5 u pero 30° a un lado: fuera de los 20° de la honda. Mirando hacia él, dentro. */
    const x30 = 5.5 * Math.sin(Math.PI / 6);
    const z30 = -5.5 * Math.cos(Math.PI / 6);
    comprobar('a 5,5 u y 30° de la mirada: fuera del cono', !(await probar(x30, z30, 0)));
    comprobar(
      'mirándole de frente, dentro',
      await probar(x30, z30, rumboHacia({ x: 0, z: 0 }, { x: deNumero(x30), z: deNumero(z30) })),
    );
    const vida = b.enchufe.ultimo('da')?.vida;
    comprobar('la honda quita uno por golpe: tres aciertos, vida cero', vida === 0, b.enchufe.de('da'));

    /* LA REVISIÓN NUEVA: se le quita la honda (se rompe). Tras volver a derivar, pega con los puños. */
    const mesa = MESAS.get(m.codigo);
    if (mesa !== undefined) {
      mesa.armas = {};
      mesa.rev++;
    }
    await reloj.avanzar(3000 + 5000); /* revisar, derivar, y que b renazca */
    const lecturas = lecturasDeArma;
    /* B renace donde sea: se le trae a 4 u delante de A. */
    const renacio = b.enchufe.de('renace').some((r) => r.a === 'r-dos');
    comprobar('(b ha renacido)', renacio);
    b.x = b.enchufe.ultimo('renace')?.x ?? b.x;
    b.z = b.enchufe.ultimo('renace')?.z ?? b.z;
    await reloj.avanzar(2100); /* que pase lo intocable */
    comprobar('sin honda, a 4 u con los puños: no llega', !(await probar(0, -4, 0)));
    comprobar('la revisión nueva ha hecho leer el arma otra vez', lecturasDeArma === lecturas + 1, { lecturasDeArma, lecturas });
    comprobar('a 2,4 u con los puños: da uno', await probar(0, -2.4, 0));
    comprobar('y quita uno', b.enchufe.ultimo('da')?.vida === VIDA_ENTERA - 1, b.enchufe.ultimo('da'));
    canal.apagar();
  }
}

// ---------------------------------------------------------------------------
// 4 · CON LA MESA DE VERDAD
// ---------------------------------------------------------------------------

paso('Con la mesa de verdad: `arcade:hallazgo` entra por la vía interna y queda en el diario');
await import('../../shared/arcade/juegos');
const mesas = await import('../src/arcade/mesas');
const botas = await import('../src/botas/index');
const { meterElHallazgoDeVerdad } = await import('../src/botas/hallazgo');
{
  comprobar('el alta del arranque da de alta El Burgo', botas.darDeAltaLosQueSeRecorren().includes('burgo'));
  comprobar('la mesa de verdad trae `hallazgo`', botas.LA_MESA_DE_VERDAD.hallazgo === meterElHallazgoDeVerdad);
  comprobar(
    'los mundos de verdad traen la tabla y las armas',
    botas.LOS_MUNDOS_DE_VERDAD.hallazgosDelJuego !== undefined &&
      botas.LOS_MUNDOS_DE_VERDAD.armaEnLaRefriega !== undefined &&
      (botas.LOS_MUNDOS_DE_VERDAD.hallazgosDelJuego('burgo').length ?? 0) > 0,
  );
  const abierta = await mesas.abrir({ arcade: 'burgo', nombre: 'Ana', modalidad: 'botas', plazoSegundos: 0 });
  const codigo = abierta.mesa.codigo;
  const bea = await mesas.sentarse(codigo, 'Bea');
  const vista0 = await mesas.mirar(codigo, abierta.silla.llave);
  const empezar = vista0.opciones.find((o) => o.tipo === 'burgo:empezar');
  await mesas.mover(codigo, abierta.silla.llave, vista0.rev, { tipo: 'burgo:empezar', carga: empezar?.carga ?? null });
  const antes = await mesas.mirar(codigo, null);
  let fue: Awaited<ReturnType<typeof meterElHallazgoDeVerdad>> | { salida: 'lanzó'; motivo: string };
  try {
    fue = await meterElHallazgoDeVerdad(codigo, bea.id, 'propina');
  } catch (error) {
    fue = { salida: 'lanzó', motivo: error instanceof Error ? error.message : String(error) };
  }
  const despues = await mesas.mirar(codigo, null);
  comprobar('en un Burgo empezado, una propina ENTRA y sube la revisión', fue.salida === 'entro' && despues.rev === antes.rev + 1, {
    fue,
    antes: antes.rev,
    despues: despues.rev,
  });
  let diario: { movimiento: { tipo: string; carga?: unknown }; ctx: { quien: string | null } }[] = [];
  for (let i = 0; i < 20 && diario.length === 0; i++) {
    try {
      const texto = fs.readFileSync(path.join(CARPETA_DE_MESAS, `${codigo}.json`), 'utf8');
      diario = (JSON.parse(texto) as { mesa: { mesa: { diario: typeof diario } } }).mesa.mesa.diario;
    } catch {
      await new Promise<void>((r) => setTimeout(r, 50));
    }
  }
  const ultimo = diario[diario.length - 1];
  comprobar(
    'y queda en el diario como `arcade:hallazgo {para, clase}` en nombre de nadie',
    ultimo !== undefined &&
      ultimo.movimiento.tipo === TIPO_DEL_HALLAZGO &&
      ultimo.ctx.quien === null &&
      JSON.stringify(ultimo.movimiento.carga) === JSON.stringify({ para: bea.id, clase: 'propina' }),
    ultimo,
  );
  let malo: Awaited<ReturnType<typeof meterElHallazgoDeVerdad>> | { salida: 'lanzó'; motivo: string };
  try {
    malo = await meterElHallazgoDeVerdad(codigo, bea.id, 'lingote');
  } catch (error) {
    malo = { salida: 'lanzó', motivo: error instanceof Error ? error.message : String(error) };
  }
  comprobar('una clase que no es de la tabla del Burgo se rechaza', malo.salida === 'rechazado', malo);
  const sinMesa = await meterElHallazgoDeVerdad('NOEXISTE', bea.id, 'propina');
  comprobar('y sin mesa, `sinMesa`', sinMesa.salida === 'sinMesa', sinMesa);
}

try {
  fs.rmSync(CARPETA_DE_MESAS, { recursive: true, force: true });
} catch {
  /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
}

console.log('');
if (fallos.length > 0) {
  console.log(`✘ ${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`   · ${f}`);
  if (LO_QUE_SE_REGISTRA.length > 0) console.log(`\n  (la sala registró: ${LO_QUE_SE_REGISTRA.slice(-5).join(' | ')})`);
  process.exit(1);
}

/* EL GUARDIA DE «NO SE HAN HECHO TODAS»: un comprobador que se cae a mitad se parece mucho a uno verde. */
const COMPROBACIONES_ESCRITAS = 117;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.log(`Sólo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones escritas.`);
  process.exit(2);
}

console.log(
  `✔ ${String(hechas)} comprobaciones. Los hallazgos de Boots on Board: brotan los que tocan donde se puede\n` +
    '  estar y lejos de todos, se recogen al pasar con `recoge` y `brotes` a toda la sala y el movimiento a la\n' +
    '  mesa —y si la mesa no lo quiere, o aún no ha contestado, el brote se queda—, rebrotan con id nuevo,\n' +
    '  los topes por asiento y por mesa, sin canal y caído no se recoge, y el mundo que cambia los recoloca; y las armas: los puños de siempre, el hacha quita dos, la honda llega a\n' +
    '  6 u dentro de su cono, y el arma se lee una vez por revisión.',
);
process.exit(0);
