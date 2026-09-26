/**
 * LOS BROTES DE UNA SALA DE BOOTS ON BOARD: qué hay brotado ahora por el tablero, dónde, y cómo se
 * vuelve a sembrar. La mecánica y sus números son de `shared/mecanicas/hallazgos.ts`; qué brota en
 * cada juego, de su tabla (`hallazgosDelJuego` de `shared/arcade/juegos/mundos.ts`). Ver
 * `docs/AVATARES-JUGABLES.md` §2.
 *
 * ═══ QUÉ ES DE AQUÍ Y QUÉ ES DEL CANAL ═══
 *
 * Esto es la LISTA: los sitios posibles de la arena, los brotes vivos, el azar que los siembra y la
 * cadena `brotes` ya serializada. No sabe de canales, ni de relojes, ni de topes, ni de la mesa: eso
 * es de `canal.ts`, que decide CUÁNDO se recoge, cuándo se vuelve a brotar y a quién se le dice.
 * Así la lista se prueba sola y el canal no crece con aritmética de rejillas.
 *
 * ═══ EL AZAR ES DE LA SALA, NO DE LA MESA ═══
 *
 * Dónde brota algo no entra en el diario: al juego sólo le llega el veredicto (`arcade:hallazgo`),
 * y eso sí queda escrito. Por eso el azar no es el de la mesa —que es parte del estado y se
 * reproduce— sino uno propio, sembrado al abrir la sala. Si la sala se borra y se vuelve a abrir, se
 * siembra de nuevo: los brotes mueren con ella, como las vidas.
 *
 * ═══ LOS IDS SÓLO CRECEN ═══
 *
 * El aparato sustituye su lista por la que llega, y avisa del `recoge` por su `h`: un id que se
 * reutilizara podría confundir el aviso de uno con el brote nuevo que ocupa su número.
 *
 * ═══ UNA CADENA POR CAMBIO ═══
 *
 * `texto()` serializa la lista una vez y la guarda hasta el siguiente cambio: la misma cadena va a
 * todos los de la sala y a quien entra, como la foto.
 */
import {
  PASO_DE_LA_REJILLA,
  RADIO_DE_RECOGER,
  RADIO_DE_RECOGER_AL_CUADRADO_FIJO,
  sitiosDeHallazgo,
} from '../../../shared/mecanicas/hallazgos';
import type { Brote, ClaseDeHallazgo, SitioDeHallazgo } from '../../../shared/mecanicas/hallazgos';
import type { Brotes } from '../../../shared/mecanicas/canal-de-botas';
import { UNO } from '../../../shared/mecanicas/fijo';
import type { Arena } from '../../../shared/mecanicas/mundo';

/** Un generador de números en [0, 1). El de la sala; en las pruebas, el que se quiera. */
export type Azar = () => number;

/**
 * MULBERRY32: pequeño, rápido y suficiente para decidir en qué baldosa aparece una cartera. No es
 * criptográfico ni lo necesita: quien adivinara la semilla sabría dónde va a brotar algo que de
 * todas formas ve brotar en su pantalla.
 */
export function azarConSemilla(semilla: number): Azar {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * LO LEJOS QUE TIENE QUE QUEDAR UN BROTE NUEVO DE CUALQUIERA, en Q16.16 y por eje: dos radios de
 * recoger. Un brote que naciera encima de alguien sería suyo en el siguiente paso sin haber corrido.
 */
export const LEJOS_DE_TODOS_AL_BROTAR = 2 * RADIO_DE_RECOGER * UNO;

/** Cuántas veces se prueba un sitio al azar antes de recorrer la lista entera buscando uno libre. */
const INTENTOS_AL_AZAR = 24;

/** ¿Hay alguien en (o cerca de) este punto? Lo contesta el canal, que sabe dónde está cada uno. */
export type HayAlguien = (x: number, z: number) => boolean;

/** El paso de la rejilla de sitios, en Q16.16: todos los sitios son múltiplos suyos en los dos ejes. */
const PASO_EN_FIJO = PASO_DE_LA_REJILLA * UNO;

/**
 * La clave de un sitio de la rejilla: un número y no una cadena, porque el Burgo tiene 18.000 sitios
 * y montar 18.000 cadenas cuesta más que buscarlos. Los sitios son múltiplos de `PASO_EN_FIJO`, así
 * que sus índices son enteros pequeños; un punto fuera de la rejilla da una clave con decimales, que
 * no es la de ningún sitio.
 */
function claveDelSitio(x: number, z: number): number {
  return (x / PASO_EN_FIJO) * 1_000_003 + z / PASO_EN_FIJO;
}

/**
 * ¿DAN ESTAS DOS ARENAS LOS MISMOS SITIOS? Si el suelo y las cajas son los mismos, sí: es lo único que
 * mira `sitiosDeHallazgo`. Los sitios de nacer no cuentan. Comparar los bytes es lineal y barato; lo
 * caro es preguntar por cada punto de la rejilla.
 */
export function mismaArenaParaBrotar(a: Arena, b: Arena): boolean {
  if (a === b) return true;
  if (a.lado !== b.lado || a.desdeX !== b.desdeX || a.desdeY !== b.desdeY || a.anchura !== b.anchura || a.fondo !== b.fondo) {
    return false;
  }
  if (a.pisable.length !== b.pisable.length || a.cuerpos.length !== b.cuerpos.length) return false;
  for (let i = 0; i < a.pisable.length; i++) if (a.pisable[i] !== b.pisable[i]) return false;
  for (let i = 0; i < a.cuerpos.length; i++) if (a.cuerpos[i] !== b.cuerpos[i]) return false;
  return true;
}

export class BrotesDeLaSala {
  private sitios: readonly SitioDeHallazgo[] = [];
  /** Los sitios, como claves numéricas (`claveDelSitio`): para saber en O(1) si un brote sigue en un sitio bueno. */
  private claves = new Set<number>();
  /** La arena de la que salen los sitios; `null` hasta la primera. */
  private arena: Arena | null = null;
  private readonly vivos = new Map<number, Brote>();
  /**
   * Los brotes APARTADOS: alguien ha llegado a ellos y la mesa todavía no ha dicho si el hallazgo
   * entra. Siguen en la lista —en el suelo, a la vista de todos— pero nadie más los puede recoger
   * hasta que se sepa: si entra se quitan, y si no, se sueltan y siguen ahí.
   */
  private readonly apartados = new Set<number>();
  private siguienteId = 1;
  private readonly pesoTotal: number;
  private cadena: string | null = null;

  constructor(
    private readonly clases: readonly ClaseDeHallazgo[],
    private readonly azar: Azar,
  ) {
    let total = 0;
    for (const c of clases) if (c.peso > 0) total += c.peso;
    this.pesoTotal = total;
  }

  /** ¿Brota algo en este juego? Un juego sin tabla —o con todos los pesos a cero— no. */
  get hayTabla(): boolean {
    return this.pesoTotal > 0;
  }

  /** Cuántos brotes vivos hay. */
  get cuantos(): number {
    return this.vivos.size;
  }

  /** Cuántos sitios posibles tiene la arena de ahora. */
  get cuantosSitios(): number {
    return this.sitios.length;
  }

  /** Los brotes vivos, en el orden en que brotaron. */
  lista(): readonly Brote[] {
    return [...this.vivos.values()];
  }

  /**
   * LA ARENA HA CAMBIADO (o es la primera): se recalculan los sitios, y cada brote que se ha quedado
   * donde ya no se puede estar se recoloca en otro sitio libre, con su MISMO id y su misma clase —no
   * se ha recogido: el tablero se ha movido debajo—; si no queda ninguno libre, se quita. `true` si
   * la lista ha cambiado.
   */
  ponerLaArena(arena: Arena, hayAlguien: HayAlguien): boolean {
    /*
     * Lo normal al volver a derivar es que el suelo y las cajas no cambien —en el Burgo, nunca: su
     * ciudad es la del código—, y rehacer la rejilla son 18.000 preguntas. Si es la misma, nada.
     */
    if (this.arena !== null && mismaArenaParaBrotar(this.arena, arena)) {
      this.arena = arena;
      return false;
    }
    this.arena = arena;
    this.sitios = sitiosDeHallazgo(arena);
    this.claves = new Set(this.sitios.map((s) => claveDelSitio(s.x, s.z)));
    let cambio = false;
    for (const b of [...this.vivos.values()]) {
      if (this.claves.has(claveDelSitio(b.x, b.z))) continue;
      this.vivos.delete(b.id);
      cambio = true;
      const sitio = this.sitioLibre(hayAlguien);
      if (sitio !== null) this.vivos.set(b.id, { id: b.id, clase: b.clase, x: sitio.x, z: sitio.z });
      else this.apartados.delete(b.id);
    }
    if (cambio) this.cadena = null;
    return cambio;
  }

  /**
   * SIEMBRA hasta que haya `objetivo` brotes vivos, en sitios libres y con clase sorteada por peso.
   * Se para antes si no quedan sitios libres. `true` si ha brotado alguno.
   */
  rellenar(objetivo: number, hayAlguien: HayAlguien): boolean {
    if (!this.hayTabla) return false;
    let cambio = false;
    while (this.vivos.size < objetivo) {
      const sitio = this.sitioLibre(hayAlguien);
      if (sitio === null) break;
      const id = this.siguienteId++;
      this.vivos.set(id, { id, clase: this.sortearClase(), x: sitio.x, z: sitio.z });
      cambio = true;
    }
    if (cambio) this.cadena = null;
    return cambio;
  }

  /**
   * EL BROTE MÁS CERCANO a `(x, z)` que está a `RADIO_DE_RECOGER` o menos, o `null`. En enteros y
   * sin raíces: primero la caja —descarta casi todos sin multiplicar— y luego el cuadrado exacto,
   * que con el radio de 1,5 u cabe de sobra en un doble. A igual distancia, el que brotó antes.
   */
  alAlcance(x: number, z: number): Brote | null {
    const radio = RADIO_DE_RECOGER * UNO;
    let mejor: Brote | null = null;
    let mejorD2 = Infinity;
    for (const b of this.vivos.values()) {
      if (this.apartados.has(b.id)) continue;
      const dx = b.x - x;
      const dz = b.z - z;
      if (dx > radio || dx < -radio || dz > radio || dz < -radio) continue;
      const d2 = dx * dx + dz * dz;
      if (d2 > RADIO_DE_RECOGER_AL_CUADRADO_FIJO || d2 >= mejorD2) continue;
      mejor = b;
      mejorD2 = d2;
    }
    return mejor;
  }

  /** Quita un brote (se ha recogido). `true` si estaba. */
  quitar(id: number): boolean {
    this.apartados.delete(id);
    const hay = this.vivos.delete(id);
    if (hay) this.cadena = null;
    return hay;
  }

  /** Aparta un brote mientras la mesa decide: `alAlcance` deja de verlo. No cambia la lista que se ve. */
  apartar(id: number): void {
    if (this.vivos.has(id)) this.apartados.add(id);
  }

  /** La mesa no lo ha querido: vuelve a estar a disposición de quien pase. */
  soltar(id: number): void {
    this.apartados.delete(id);
  }

  /** El mensaje `brotes`, serializado una vez por cambio. */
  texto(): string {
    if (this.cadena === null) {
      const brotes: Brotes = { t: 'brotes', b: [...this.vivos.values()].map((b) => [b.id, b.clase, b.x, b.z] as const) };
      this.cadena = JSON.stringify(brotes);
    }
    return this.cadena;
  }

  /** Una clase al azar, según los pesos de la tabla. */
  private sortearClase(): string {
    let tiro = this.azar() * this.pesoTotal;
    for (const c of this.clases) {
      if (c.peso <= 0) continue;
      if (tiro < c.peso) return c.clase;
      tiro -= c.peso;
    }
    /* Sólo por redondeo en el último céntimo: la última clase con peso. */
    for (let i = this.clases.length - 1; i >= 0; i--) {
      const c = this.clases[i] as ClaseDeHallazgo;
      if (c.peso > 0) return c.clase;
    }
    return '';
  }

  /** ¿Está libre este sitio: sin brote y sin nadie cerca? */
  private libre(s: SitioDeHallazgo, hayAlguien: HayAlguien): boolean {
    for (const b of this.vivos.values()) if (b.x === s.x && b.z === s.z) return false;
    return !hayAlguien(s.x, s.z);
  }

  /**
   * UN SITIO LIBRE AL AZAR, o `null` si no queda ninguno. Primero unos cuantos tiros al azar —con
   * pocos brotes en una rejilla grande aciertan casi siempre al primero—, y si fallan, la lista
   * entera desde un punto al azar, que encuentra uno si lo hay.
   */
  private sitioLibre(hayAlguien: HayAlguien): SitioDeHallazgo | null {
    const n = this.sitios.length;
    if (n === 0) return null;
    for (let i = 0; i < INTENTOS_AL_AZAR; i++) {
      const s = this.sitios[Math.floor(this.azar() * n) % n] as SitioDeHallazgo;
      if (this.libre(s, hayAlguien)) return s;
    }
    const desde = Math.floor(this.azar() * n) % n;
    for (let j = 0; j < n; j++) {
      const s = this.sitios[(desde + j) % n] as SitioDeHallazgo;
      if (this.libre(s, hayAlguien)) return s;
    }
    return null;
  }
}
