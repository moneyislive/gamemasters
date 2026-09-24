/**
 * LOS CUERPOS LEJANOS: qué clip pinta, y en qué segundo, un cuerpo del juego que va SIN esqueleto (en un
 * rebaño de textura de huesos: los de más de 12 m en N0, los que no caben en N1, los Prestados lejanos).
 * Puro: sin three. `director.ts` lo usa en cada fotograma y el comprobador lo juzga con el manifiesto.
 *
 * ═══ POR QUÉ TODOS LOS GESTOS, Y NO ONCE ═══
 *
 * La primera versión horneaba para los lejanos once clips (reposo, la marcha, guardia, tocado, derribado,
 * levantarse, seguida-2, quiebro y golpe-de-prestado) y pintaba lo demás en reposo: un tirador a 15 m en
 * N0 apuntaba y disparaba de brazos caídos, el desalojable salía de pie, el Celador que se imprimía
 * aparecía en reposo, el quiebro a la derecha salía siempre a la izquierda y quien paseaba a 1 m/s
 * resbalaba de pie porque `pasear` no se horneaba (lo midió la revisión). Los tiradores se quedan a
 * 8-18 m: en N0, justo fuera de los esqueletos. El cuerpo lejano es el que TELEGRAFÍA el disparo.
 *
 * Así que `clipsDeLosLejanos` es CADA gesto del contrato en CADA dirección (con su espejo si lo pide),
 * más la marcha entera con `pasear`: lo que se hornea sale de aquí, y lo que se pinta también sale de
 * aquí (`nombreDelClipLejano`), así que no pueden separarse sin que el comprobador lo vea.
 *
 * ═══ SIN MEZCLADOR, PERO CON FUNDIDO ═══
 *
 * El rebaño pinta cada cabeza con dos filas de la textura y una mezcla. Al cambiar de gesto, la fila A es
 * el gesto que sale (que sigue avanzando a su ritmo) y la B el que entra, con el mismo fundido que
 * `fundidoEntre` da a los cuerpos con esqueleto: a 20 m un golpe no «salta» de pose. El segundo de cada
 * clip sale de `tiempoDelGesto`, sin estado (el golpe llega a su instante por la misma recta que la
 * anticipación elástica), y el de la marcha de una fase por cuerpo acompasada con su velocidad y su
 * zancada: nadie resbala, ni a 0,5 m/s (pasea despacio: pasos cortos y lentos, no de pie).
 */
import type { CuerpoPintado, Gesto } from '../cuerpos';
import { CICLOS_COMO_MUCHO, GESTOS, INFO_DE_GESTOS, direccionRelativa, fundidoEntre, gestoEnBucle, tiempoDelGesto } from './gestos';
import type { InfoDelGesto } from './gestos';
import { clipDelGesto, marchaDelReparto } from './reparto';
import type { Direccion, PuntoDeLaMarcha, Reparto } from './reparto';

/** Un clip que un cuerpo lejano puede pintar: su nombre en la textura, de qué clip sale y si va en espejo. */
export interface ClipDelLejano {
  readonly nombre: string;
  readonly clip: string;
  readonly espejo: boolean;
  /** Si el clip se horneó en bucle (el del manifiesto). Si el GESTO lo repite lo dice `gestoEnBucle`. */
  readonly bucle: boolean;
}

const DIRECCIONES: readonly (Direccion | null)[] = [null, 'delante', 'derecha', 'atras', 'izquierda'];

/** El nombre de un clip en una textura de huesos: el clip, o `clip~espejo`. */
export function nombreHorneado(clip: string, espejo: boolean): string {
  return espejo ? `${clip}~espejo` : clip;
}

/** Por reparto y gesto, el nombre horneado de cada dirección (índice en `DIRECCIONES`). */
const NOMBRES = new WeakMap<Reparto, Map<Gesto, readonly string[]>>();

/**
 * EL CLIP QUE PINTA UN GESTO hacia una dirección (relativa a la cara, o `null`), por su nombre en la
 * textura. Recordado: se pide en cada fotograma por cabeza y no asigna.
 */
export function nombreDelClipLejano(reparto: Reparto, gesto: Gesto, direccion: Direccion | null): string {
  let porGesto = NOMBRES.get(reparto);
  if (porGesto === undefined) {
    porGesto = new Map();
    NOMBRES.set(reparto, porGesto);
  }
  let nombres = porGesto.get(gesto);
  if (nombres === undefined) {
    nombres = DIRECCIONES.map((d) => {
      const e = clipDelGesto(reparto, gesto, d);
      return nombreHorneado(e.clip, e.espejo);
    });
    porGesto.set(gesto, nombres);
  }
  return nombres[DIRECCIONES.indexOf(direccion)] as string;
}

/** La dirección de un gesto que elige clip por dirección (el quiebro), o `null`. */
export function direccionDelLejano(c: Pick<CuerpoPintado, 'gesto' | 'rumbo' | 'direccionDelGesto'>): Direccion | null {
  const info = INFO_DE_GESTOS[c.gesto];
  return info.direccion === 'clip' && c.direccionDelGesto !== null ? direccionRelativa(c.rumbo, c.direccionDelGesto) : null;
}

/**
 * TODO LO QUE PUEDE PINTAR UN CUERPO LEJANO: cada gesto del contrato en cada dirección y la marcha entera
 * (con `pasear`), sin repetir. Es la lista que se hornea (ver la cabecera).
 */
export function clipsDeLosLejanos(reparto: Reparto, gestos: readonly Gesto[] = GESTOS): readonly ClipDelLejano[] {
  const salida: ClipDelLejano[] = [];
  const vistos = new Set<string>();
  const poner = (clip: string, espejo: boolean): void => {
    const nombre = nombreHorneado(clip, espejo);
    if (vistos.has(nombre) || reparto.clips[clip] === undefined) return;
    vistos.add(nombre);
    salida.push({ nombre, clip, espejo, bucle: reparto.clips[clip]?.bucle ?? false });
  };
  for (const g of gestos) {
    for (const d of DIRECCIONES) {
      const e = clipDelGesto(reparto, g, d);
      poner(e.clip, e.espejo);
    }
  }
  for (const esqueleto of [null, ...Object.keys(reparto.esqueletos)]) for (const p of marchaDelReparto(reparto, esqueleto)) poner(p.clip, false);
  return salida;
}

/* ─────────────────────────────── La pose de cada fotograma ─────────────────────────────── */

/** Lo que el rebaño necesita de un cuerpo lejano en un fotograma: el clip que sale, el que entra y la mezcla. */
export interface PoseDelLejano {
  a: string;
  ta: number;
  bucleA: boolean;
  b: string;
  tb: number;
  bucleB: boolean;
  /** El peso de `b` (1: sólo `b`). */
  mezcla: number;
}

export function poseDelLejanoNueva(): PoseDelLejano {
  return { a: '', ta: 0, bucleA: false, b: '', tb: 0, bucleB: false, mezcla: 1 };
}

/** Un gesto en curso de un cuerpo lejano (reutilizado: se reescribe al cambiar). */
interface Tramo {
  nombre: string;
  bucle: boolean;
  marcha: boolean;
  info: InfoDelGesto;
  clipMs: number;
  impactoClipMs: number | null;
  desde: number;
  impacto: number | null;
  /** El segundo en que se quedó (sólo el que sale de la marcha: la fase deja de correr). */
  congelado: number;
}

function tramoNuevo(): Tramo {
  return { nombre: '', bucle: false, marcha: false, info: INFO_DE_GESTOS.reposo, clipMs: 1000, impactoClipMs: null, desde: 0, impacto: null, congelado: 0 };
}

interface EstadoDelLejano {
  gesto: Gesto | null;
  desde: number;
  direccion: Direccion | null;
  actual: Tramo;
  previo: Tramo;
  /** Cuándo cambió (ms del reloj del cuerpo) y en cuánto se funde. */
  cambio: number;
  fundido: number;
  /** La fase de la marcha, en ciclos. */
  fase: number;
  /** Visto en el último fotograma (para podar a los que se fueron). */
  visto: number;
}

/** La marcha de un cuerpo lejano: los puntos de su esqueleto y la escala de su zancada. */
export interface MarchaDelLejano {
  readonly puntos: readonly PuntoDeLaMarcha[];
  readonly escala: number;
  /** En qué punto de su ciclo pisa el pie izquierdo cada clip (0 a 1): la fase común de la marcha. */
  readonly apoyo: (clip: string) => number;
}

/**
 * LOS CUERPOS LEJANOS ANIMADOS: el estado de cada uno entre fotogramas (qué gesto lleva, cuál sale, su
 * fase de la marcha). Un estado por id, que se crea una vez y se reutiliza; los que dejan de venir se
 * olvidan con `podar`.
 */
export class AnimacionDeLosLejanos {
  private readonly estados = new Map<number, EstadoDelLejano>();
  private vuelta = 0;

  constructor(private readonly reparto: Reparto) {}

  /** Empieza un fotograma (para `podar`). */
  empezar(): void {
    this.vuelta++;
  }

  private vistos = 0;
  private readonly podarUno = (e: EstadoDelLejano, id: number): void => {
    if (e.visto !== this.vuelta) this.estados.delete(id);
  };

  /** Olvida a los que no se pidieron en este fotograma (sólo recorre si sobra alguno). */
  podar(): void {
    if (this.estados.size > this.vistos) this.estados.forEach(this.podarUno);
    this.vistos = 0;
  }

  /** Olvida a uno (pasa a tener esqueleto). */
  olvidar(id: number): void {
    this.estados.delete(id);
  }

  /**
   * LA POSE DE UN CUERPO LEJANO en `t` (ms de SU reloj de presentación), `dtMs` después del anterior.
   * Escribe en `salida` y la devuelve.
   */
  pose(c: CuerpoPintado, t: number, dtMs: number, marcha: MarchaDelLejano, salida: PoseDelLejano): PoseDelLejano {
    let e = this.estados.get(c.id);
    if (e === undefined) {
      e = { gesto: null, desde: Number.NaN, direccion: null, actual: tramoNuevo(), previo: tramoNuevo(), cambio: -1e9, fundido: 0, fase: 0, visto: 0 };
      this.estados.set(c.id, e);
    }
    if (e.visto !== this.vuelta) this.vistos++;
    e.visto = this.vuelta;
    const info = INFO_DE_GESTOS[c.gesto];
    const esMarcha = info.tipo === 'marcha';
    const direccion = direccionDelLejano(c);
    /* ── La marcha: el clip por velocidad, la fase por zancada ── */
    let marchaNombre = '';
    let marchaMs = 1000;
    if (esMarcha) {
      const v = Math.max(0, c.velocidad);
      const k = marcha.escala;
      let elegido: PuntoDeLaMarcha | undefined = marcha.puntos[0];
      if (v > 0.2) {
        /*
         * Andando: el paso más rápido que no se pase de la velocidad; si ninguno, el más lento (pasear
         * despacio). Y si ese paso tuviera que ir a más de `CICLOS_COMO_MUCHO` para no resbalar, el
         * siguiente: a 4 m/s, andar pediría 2,7 pasos por segundo; se trota a 1,2.
         */
        elegido = undefined;
        for (const p of marcha.puntos) {
          if (p.zancada <= 0) continue;
          if (elegido === undefined || p.velocidad * k <= v * 1.15 || v / (elegido.zancada * k) > CICLOS_COMO_MUCHO) elegido = p;
        }
        elegido ??= marcha.puntos[0];
      }
      marchaNombre = elegido?.clip ?? 'reposo';
      marchaMs = elegido?.duracionMs ?? 1000;
      const zancada = elegido !== undefined && elegido.zancada > 0 ? elegido.zancada * k : 0;
      const ciclos = zancada > 0 ? Math.min(CICLOS_COMO_MUCHO, v / zancada) : 1000 / Math.max(1, marchaMs);
      e.fase = (e.fase + (Math.max(0, dtMs) / 1000) * ciclos) % 1;
    }
    /*
     * ── ¿Gesto nuevo? El que había pasa a salir, con el fundido de los cuerpos con esqueleto ──
     * De un paso de la marcha a otro no hay cambio: la fase es común y el clip lo elige la velocidad.
     */
    const nombre = esMarcha ? marchaNombre : nombreDelClipLejano(this.reparto, c.gesto, direccion);
    const eraMarcha = e.gesto !== null && INFO_DE_GESTOS[e.gesto].tipo === 'marcha';
    const cambia = e.gesto === null || (esMarcha ? !eraMarcha : e.gesto !== c.gesto || e.desde !== c.gestoDesdeMs || e.direccion !== direccion);
    if (cambia) {
      const viejo = e.previo;
      e.previo = e.actual;
      e.actual = viejo;
      /* El que sale, si era marcha, se queda en su segundo (su fase ya no corre). */
      if (e.previo.marcha) e.previo.congelado = this.segundoDeLaMarcha(e, e.previo, marcha);
      e.fundido = e.gesto === null ? 0 : fundidoEntre(e.gesto, c.gesto);
      e.cambio = t;
      e.desde = c.gestoDesdeMs;
      e.direccion = direccion;
      const a = e.actual;
      a.info = info;
      a.marcha = esMarcha;
      a.desde = c.gestoDesdeMs;
      if (esMarcha) {
        a.bucle = true;
        a.impactoClipMs = null;
      } else {
        const base = clipDelGesto(this.reparto, c.gesto, direccion).clip;
        const datos = this.reparto.clips[base];
        a.clipMs = datos?.duracionMs ?? 1000;
        a.impactoClipMs = datos?.impactoMs ?? null;
        a.bucle = gestoEnBucle(info, datos?.bucle === true);
      }
    }
    e.gesto = c.gesto;
    const a = e.actual;
    a.nombre = nombre;
    a.impacto = c.impactoMs;
    if (esMarcha) a.clipMs = marchaMs;
    const mezcla = e.fundido > 0 ? Math.min(1, Math.max(0, (t - e.cambio) / e.fundido)) : 1;
    salida.b = a.nombre;
    salida.tb = esMarcha ? this.segundoDeLaMarcha(e, a, marcha) : tiempoDelGesto(a.info, a.clipMs, a.impactoClipMs, a.desde, a.impacto, t);
    salida.bucleB = a.bucle;
    salida.mezcla = mezcla;
    const p = e.previo;
    if (mezcla < 1 && p.nombre !== '') {
      salida.a = p.nombre;
      salida.ta = p.marcha ? p.congelado : tiempoDelGesto(p.info, p.clipMs, p.impactoClipMs, p.desde, p.impacto, t);
      salida.bucleA = p.bucle;
    } else {
      salida.a = a.nombre;
      salida.ta = salida.tb;
      salida.bucleA = a.bucle;
      salida.mezcla = 1;
    }
    return salida;
  }

  /** El segundo del clip de la marcha: la fase común más el apoyo de su clip (ver `apoyo` en `almacen.ts`). */
  private segundoDeLaMarcha(e: EstadoDelLejano, tramo: Tramo, marcha: MarchaDelLejano): number {
    const f = (((e.fase + marcha.apoyo(tramo.nombre)) % 1) + 1) % 1;
    return (f * tramo.clipMs) / 1000;
  }

  /** Cuántos recuerda (para el comprobador). */
  get cuantos(): number {
    return this.estados.size;
  }
}
