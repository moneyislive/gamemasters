/**
 * LA MÁQUINA DE GESTOS, SIN three: qué hace cada gesto con su clip, cómo se funden, a qué ritmo va el
 * paso y cómo se estira la preparación de un golpe para que el puño llegue en el instante anunciado.
 * Puro: números entran, números salen. `cuerpo.ts` lo aplica a las `AnimationAction` de three, y el
 * comprobador lo juzga en Node con relojes de mentira.
 *
 * ═══ LA ANTICIPACIÓN ELÁSTICA (diseño §7, «Cómo se siente el combate») ═══
 *
 * El golpe propio arranca al pulsar, con un instante de impacto PREDICHO; cuando vuelve el anuncio del
 * servidor, llega el de verdad, que puede caer 30 ms antes o 60 después. Un clip a velocidad fija
 * pegaría fuera de tiempo, y el parón de impacto (que esconde la espera del veredicto) caería con el
 * puño todavía atrás. Así que la preparación se ESTIRA o se ENCOGE: en cada fotograma se mira cuánto
 * clip falta hasta su fotograma de impacto (`impactoMs` del manifiesto) y cuánto reloj falta hasta el
 * `impactoMs` del cuerpo, y el `timeScale` es el cociente. Si el anuncio se mueve, el cociente cambia
 * en el siguiente fotograma y el puño sigue llegando a su hora, sin saltos: el clip nunca se teletransporta.
 * El cociente se acota (`RITMO_ELASTICO`): una preparación a ×8 se ve como un tirón, y a ×0,1 como
 * una estatua. Dentro de la cota el impacto cae en el instante, a menos de un fotograma; fuera, lo
 * más cerca que se pueda, y el comprobador distingue los dos casos.
 *
 * Después del impacto el clip sigue a su ritmo: la recuperación no se estira.
 *
 * ═══ POR QUÉ LOS PESOS LOS LLEVA ESTO Y NO `crossFadeTo` ═══
 *
 * `crossFadeTo` de three funde dos acciones y no normaliza: si llega un gesto nuevo cuando el anterior
 * aún se estaba fundiendo (una Tanda: Entrada, Seguida, Seguida y Cierre en 1,15 s), las tres acciones
 * suman menos de 1 durante unos fotogramas y three rellena lo que falta con la POSE DE REPOSO del
 * esqueleto: la pose A de la forja, con los brazos abiertos a 55°. Un parpadeo de espantapájaros en
 * mitad del combo. Aquí cada capa tiene su peso y su objetivo, todas se mueven a la vez y en cada
 * fotograma la suma se lleva a 1: un fundido cruzado de verdad, también con tres capas vivas.
 *
 * ═══ LA MARCHA: FASE COMPARTIDA Y SIN PATINAR ═══
 *
 * Andar, trotar y correr se mezclan por velocidad (y hacia atrás o de lado por la dirección del paso
 * respecto de la cara), y TODOS llevan la misma fase del ciclo: si andar va por el apoyo del pie
 * izquierdo, trotar también. Por eso no se usa el `warp` de three, que interpola el ritmo de una acción
 * hacia el de la otra con la velocidad fija: aquí la velocidad cambia mientras se funde. El ritmo sale
 * de la zancada del manifiesto: ciclos por segundo = velocidad / Σ(peso × zancada). Así el pie de apoyo
 * va hacia atrás exactamente a la velocidad con que el juego mueve el cuerpo: no patina.
 */
import type { Gesto } from '../cuerpos';
import type { Direccion, PuntoDeLaMarcha } from './reparto';

/* ─────────────────────────────── Qué es cada gesto ─────────────────────────────── */

/**
 * `marcha`: el espacio de mezcla de andar (reposo, andar, trotar, correr).
 * `bucle`: un clip que se repite mientras dure el gesto.
 * `una-vez`: se pinta una vez y se queda en su última pose.
 * `golpe`: una vez, con la preparación elástica hacia `impactoMs`.
 * `sostenido`: una vez y quieto al final, aunque dure mucho (derribado, desalojable…).
 * `carrera`: el clip de correr, orientado hacia `direccionDelGesto` (la acometida).
 */
export type TipoDeGesto = 'marcha' | 'bucle' | 'una-vez' | 'golpe' | 'sostenido' | 'carrera';

export interface InfoDelGesto {
  readonly tipo: TipoDeGesto;
  /** Lo que dura en el juego (del diseño), si se sabe: para ajustar a ella un clip de otra longitud. */
  readonly duracionMs: number | null;
  /** El fundido con que entra, en ms. */
  readonly entraMs: number;
  /**
   * Qué hace con `direccionDelGesto`: `clip` elige el clip por la dirección relativa a la cara (el
   * quiebro a la derecha es otro paso que a la izquierda); `cuerpo` gira el cuerpo hacia ella (la
   * acometida); `no` la ignora.
   */
  readonly direccion: 'no' | 'clip' | 'cuerpo';
  /** Ritmo base del clip (el quiebro torpe va más pesado que el limpio). */
  readonly ritmo: number;
}

/**
 * LOS GESTOS DE `cuerpos.ts`, TODOS: un `Record` sobre la unión, así que un gesto nuevo en el contrato
 * no compila hasta que alguien diga aquí qué es. Las duraciones salen del diseño (§4.3-§4.8) en tics de
 * 50 ms: quiebro 9, tocado 12, Réplica 3, remate 24.
 */
export const INFO_DE_GESTOS: Readonly<Record<Gesto, InfoDelGesto>> = {
  reposo: { tipo: 'marcha', duracionMs: null, entraMs: 220, direccion: 'no', ritmo: 1 },
  andar: { tipo: 'marcha', duracionMs: null, entraMs: 180, direccion: 'no', ritmo: 1 },
  trotar: { tipo: 'marcha', duracionMs: null, entraMs: 160, direccion: 'no', ritmo: 1 },
  correr: { tipo: 'marcha', duracionMs: null, entraMs: 160, direccion: 'no', ritmo: 1 },
  quiebro: { tipo: 'una-vez', duracionMs: 450, entraMs: 50, direccion: 'clip', ritmo: 1 },
  'quiebro-torpe': { tipo: 'una-vez', duracionMs: 450, entraMs: 90, direccion: 'clip', ritmo: 0.8 },
  tocado: { tipo: 'una-vez', duracionMs: 600, entraMs: 45, direccion: 'no', ritmo: 1 },
  descolocado: { tipo: 'sostenido', duracionMs: null, entraMs: 80, direccion: 'no', ritmo: 0.7 },
  derribado: { tipo: 'sostenido', duracionMs: null, entraMs: 70, direccion: 'no', ritmo: 1 },
  levantarse: { tipo: 'una-vez', duracionMs: null, entraMs: 60, direccion: 'no', ritmo: 1 },
  entrada: { tipo: 'golpe', duracionMs: null, entraMs: 70, direccion: 'cuerpo', ritmo: 1 },
  'seguida-1': { tipo: 'golpe', duracionMs: null, entraMs: 60, direccion: 'cuerpo', ritmo: 1 },
  'seguida-2': { tipo: 'golpe', duracionMs: null, entraMs: 60, direccion: 'cuerpo', ritmo: 1 },
  cierre: { tipo: 'golpe', duracionMs: null, entraMs: 60, direccion: 'cuerpo', ritmo: 1 },
  empellon: { tipo: 'golpe', duracionMs: null, entraMs: 70, direccion: 'cuerpo', ritmo: 1 },
  replica: { tipo: 'golpe', duracionMs: null, entraMs: 40, direccion: 'cuerpo', ritmo: 1 },
  avance: { tipo: 'carrera', duracionMs: null, entraMs: 60, direccion: 'cuerpo', ritmo: 1 },
  guardia: { tipo: 'bucle', duracionMs: null, entraMs: 160, direccion: 'no', ritmo: 1 },
  respuesta: { tipo: 'golpe', duracionMs: null, entraMs: 60, direccion: 'cuerpo', ritmo: 1 },
  'golpe-de-prestado': { tipo: 'golpe', duracionMs: null, entraMs: 90, direccion: 'cuerpo', ritmo: 1 },
  apuntar: { tipo: 'bucle', duracionMs: null, entraMs: 150, direccion: 'cuerpo', ritmo: 0.6 },
  disparar: { tipo: 'golpe', duracionMs: null, entraMs: 50, direccion: 'cuerpo', ritmo: 1 },
  desalojable: { tipo: 'sostenido', duracionMs: null, entraMs: 150, direccion: 'no', ritmo: 1 },
  rematar: { tipo: 'bucle', duracionMs: null, entraMs: 150, direccion: 'cuerpo', ritmo: 1 },
  absorber: { tipo: 'sostenido', duracionMs: null, entraMs: 200, direccion: 'no', ritmo: 1 },
  rescatar: { tipo: 'sostenido', duracionMs: null, entraMs: 200, direccion: 'cuerpo', ritmo: 1 },
  descolgar: { tipo: 'sostenido', duracionMs: null, entraMs: 200, direccion: 'no', ritmo: 1 },
  imprimirse: { tipo: 'sostenido', duracionMs: 1200, entraMs: 0, direccion: 'no', ritmo: 1 },
  salir: { tipo: 'sostenido', duracionMs: 900, entraMs: 150, direccion: 'no', ritmo: 1 },
  desconectado: { tipo: 'sostenido', duracionMs: null, entraMs: 90, direccion: 'no', ritmo: 1 },
  victoria: { tipo: 'sostenido', duracionMs: null, entraMs: 200, direccion: 'no', ritmo: 1 },
};

/** Los gestos, en el orden del contrato (para recorrerlos). */
export const GESTOS: readonly Gesto[] = Object.keys(INFO_DE_GESTOS) as Gesto[];

/**
 * EL FUNDIDO DE UN GESTO A OTRO, en ms. El de entrada del nuevo, salvo tres casos: dentro de la Tanda
 * (golpe a golpe) se funde en 60 ms para que el combo no se emborrone; de `derribado` a `levantarse`,
 * `FUNDIDO_DE_LEVANTARSE_MS`; y al volver a andar desde algo que no es andar, 200 ms, para que el cuerpo
 * no se «despierte» de golpe.
 *
 * `derribado` → `levantarse` era de 40 ms porque los clips empalman: el CUERPO del último fotograma de
 * uno es el del primero del otro (0,0 cm, medido). La TELA no: el faldón salta 34 cm, y en 40 ms se veía
 * el bajo de la gabardina teletransportarse (lo midió la revisión). Con 160 ms el cuerpo no se entera
 * (funde dos poses iguales) y la tela cae en su sitio.
 */
export const FUNDIDO_DE_LEVANTARSE_MS = 160;
export function fundidoEntre(de: Gesto | null, a: Gesto): number {
  const info = INFO_DE_GESTOS[a];
  if (de === null) return 0;
  const antes = INFO_DE_GESTOS[de];
  if (antes.tipo === 'golpe' && info.tipo === 'golpe') return 60;
  if (de === 'derribado' && a === 'levantarse') return FUNDIDO_DE_LEVANTARSE_MS;
  if (info.tipo === 'marcha' && antes.tipo !== 'marcha') return 200;
  return info.entraMs;
}

/* ─────────────────────────────── Direcciones ─────────────────────────────── */

/** Un ángulo en (−π, π]. */
export function normalizarAngulo(a: number): number {
  let x = a % (2 * Math.PI);
  if (x <= -Math.PI) x += 2 * Math.PI;
  if (x > Math.PI) x -= 2 * Math.PI;
  return x;
}

/**
 * HACIA DÓNDE VA UN GESTO respecto de la cara. Los dos ángulos en el convenio de `cuerpos.ts` (0 al
 * norte, creciendo hacia el este, es decir, en el sentido de las agujas vistas desde arriba): girar +90°
 * desde la cara es ir hacia la DERECHA del que mira.
 */
export function direccionRelativa(rumbo: number, direccion: number): Direccion {
  const rel = normalizarAngulo(direccion - rumbo);
  const q = Math.PI / 4;
  if (Math.abs(rel) <= q) return 'delante';
  if (rel > q && rel <= 3 * q) return 'derecha';
  if (rel < -q && rel >= -3 * q) return 'izquierda';
  return 'atras';
}

/* ─────────────────────────────── La anticipación elástica ─────────────────────────────── */

/** La cota del ritmo de la preparación: más allá se ve un tirón o una estatua. */
export const RITMO_ELASTICO = { minimo: 0.35, maximo: 3 } as const;

/**
 * EL TIEMPO DE CLIP CON QUE EMPIEZA UN GOLPE que se ve por primera vez en `ahora` (ms), si empezó en
 * `desde` y tiene que llegar en `impacto`, con el impacto del clip en `impactoClipMs`. El ideal es
 * empezar en 0 y estirar; si el anuncio es tan corto que ni al ritmo máximo llega, se entra ya avanzado
 * en la preparación (se salta el principio) para que el impacto caiga en su sitio igualmente. Si el
 * cuerpo aparece con el golpe ya dado, se entra por la recuperación. En segundos de clip.
 */
export function inicioDelGolpe(desde: number, ahora: number, impacto: number, impactoClipMs: number): number {
  const T = impactoClipMs / 1000;
  if (ahora >= impacto) return T + (ahora - impacto) / 1000;
  const total = Math.max(1, impacto - desde);
  const ritmo = Math.min(RITMO_ELASTICO.maximo, Math.max(RITMO_ELASTICO.minimo, impactoClipMs / total));
  /* La recta que pasa por (impacto, T) con ese ritmo, evaluada ahora: el clip «debería» ir por aquí. */
  const debido = T - (ritmo * (impacto - ahora)) / 1000;
  return Math.min(T, Math.max(0, debido));
}

/**
 * EL RITMO DE LA PREPARACIÓN PARA EL TRAMO DE `antes` A `ahora` (ms): el que lleva el clip, que en
 * `antes` iba por `clipS` (s), a donde tiene que estar en `ahora`. Es el `timeScale` que se pone justo
 * antes de avanzar el mezclador ese tramo.
 *
 *   · Si el tramo acaba antes del impacto, el clip va a la recta que llega a su impacto justo en
 *     `impacto`: (T − clipS) · (ahora − antes) / (impacto − antes).
 *   · Si el tramo CRUZA el impacto, el clip va a donde estaría un clip que llegó a su hora y siguió a su
 *     ritmo base: T + (ahora − impacto) · base. Con un solo ritmo para todo el tramo se llega exacto.
 *
 * ¡Ojo con el instante! La primera versión medía lo que faltaba desde `ahora` y no desde `antes`, que es
 * a donde corresponde `clipS`: cada fotograma se quedaba un tramo corto y el golpe llegaba unos 30 ms
 * tarde. La simulación pura no lo veía (medía con el mismo convenio equivocado); lo vio la prueba de
 * punta a punta con el mezclador de three.
 */
export function ritmoElastico(clipS: number, antes: number, ahora: number, impacto: number, impactoClipMs: number, base = 1): number {
  const T = impactoClipMs / 1000;
  const tramo = (ahora - antes) / 1000;
  if (clipS >= T || tramo <= 1e-6) return base;
  let objetivo: number;
  if (ahora <= impacto) {
    const falta = (impacto - antes) / 1000;
    if (falta <= 1e-6) return RITMO_ELASTICO.maximo;
    objetivo = clipS + ((T - clipS) * tramo) / falta;
  } else {
    objetivo = T + ((ahora - impacto) / 1000) * base;
  }
  const r = (objetivo - clipS) / tramo;
  return Math.min(RITMO_ELASTICO.maximo, Math.max(RITMO_ELASTICO.minimo, r));
}

/**
 * EL RITMO CON QUE UN CLIP CABE EN LO QUE DURA SU GESTO (el quiebro: 800 ms de clip en 450 de juego),
 * acotado para no hacer de un paso un espasmo. Sin duración declarada, el ritmo base.
 */
export function ritmoParaDurar(clipMs: number, info: InfoDelGesto): number {
  if (info.duracionMs === null || info.tipo === 'golpe' || info.tipo === 'marcha' || info.tipo === 'bucle') return info.ritmo;
  const r = (clipMs / info.duracionMs) * info.ritmo;
  return Math.min(1.8, Math.max(0.6, r));
}

/** ¿Se repite el clip de este gesto? La regla de `cuerpo.ts`: un sostenido se queda en su final. */
export function gestoEnBucle(info: InfoDelGesto, clipEnBucle: boolean): boolean {
  return info.tipo === 'bucle' || info.tipo === 'carrera' || (clipEnBucle && info.tipo !== 'sostenido' && info.tipo !== 'una-vez' && info.tipo !== 'golpe');
}

/**
 * EN QUÉ SEGUNDO DEL CLIP VA UN GESTO en `t` (ms), sin estado: lo que usan los cuerpos SIN esqueleto
 * (el rebaño), que no tienen mezclador que integre un `timeScale`. Un golpe con anuncio va por la misma
 * recta que la anticipación elástica (`inicioDelGolpe` da en cada instante dónde «debería» ir el clip
 * para llegar a su impacto en `impacto`) y después del impacto a su ritmo; lo demás, a su ritmo desde
 * `desde`. Así el puño de un Celador a 20 m también cae en su instante, y no en reposo.
 */
export function tiempoDelGesto(info: InfoDelGesto, clipMs: number, impactoClipMs: number | null, desde: number, impacto: number | null, t: number): number {
  if (info.tipo === 'golpe' && impacto !== null && impactoClipMs !== null) return inicioDelGolpe(desde, t, impacto, impactoClipMs);
  return (Math.max(0, t - desde) / 1000) * ritmoParaDurar(clipMs, info);
}

/* ─────────────────────────────── Las capas y sus pesos ─────────────────────────────── */

interface Capa {
  readonly nombre: string;
  peso: number;
  objetivo: number;
  /** Peso por ms. */
  ritmo: number;
}

/**
 * LAS CAPAS DE UN CUERPO y sus pesos: una activa (la que entra) y las que salen. Ver «Por qué los pesos
 * los lleva esto» en la cabecera. Sin asignaciones por fotograma salvo al entrar una capa nueva.
 */
export class MezclaDeCapas {
  private readonly capas: Capa[] = [];
  private readonly salidas: string[] = [];
  private readonly vivos: string[] = [];

  /** Entra `nombre` (objetivo 1) en `fundidoMs`; todas las demás van a 0 en el mismo tiempo. */
  entrar(nombre: string, fundidoMs: number): void {
    const ritmo = fundidoMs > 0 ? 1 / fundidoMs : Number.POSITIVE_INFINITY;
    let esta = false;
    for (const c of this.capas) {
      c.objetivo = c.nombre === nombre ? 1 : 0;
      c.ritmo = ritmo;
      if (c.nombre === nombre) esta = true;
    }
    if (!esta) this.capas.push({ nombre, peso: this.capas.length === 0 ? 1 : 0, objetivo: 1, ritmo });
    if (fundidoMs <= 0) {
      for (const c of this.capas) c.peso = c.objetivo;
    }
  }

  /**
   * Mueve los pesos `dtMs` hacia su objetivo, los normaliza a 1 y devuelve los nombres de las capas que
   * ya no pesan nada (para parar su acción). La lista devuelta se reutiliza: no guardarla.
   */
  avanzar(dtMs: number): readonly string[] {
    this.salidas.length = 0;
    for (const c of this.capas) {
      /* Un fundido de 0 ms es ritmo infinito: se llega ya (∞ × 0 ms sería NaN y el cuerpo, la pose A). */
      if (!Number.isFinite(c.ritmo)) {
        c.peso = c.objetivo;
        continue;
      }
      const paso = c.ritmo * Math.max(0, dtMs);
      c.peso = c.objetivo > c.peso ? Math.min(c.objetivo, c.peso + paso) : Math.max(c.objetivo, c.peso - paso);
    }
    let suma = 0;
    for (const c of this.capas) suma += c.peso;
    if (suma <= 1e-9) {
      /* Nadie pesa (una capa nueva que entra con fundido desde cero): manda la activa. */
      for (const c of this.capas) c.peso = c.objetivo;
      suma = 0;
      for (const c of this.capas) suma += c.peso;
    }
    if (suma > 0) for (const c of this.capas) c.peso /= suma;
    for (let i = this.capas.length - 1; i >= 0; i--) {
      const c = this.capas[i] as Capa;
      if (c.objetivo === 0 && c.peso <= 1e-4) {
        this.salidas.push(c.nombre);
        this.capas.splice(i, 1);
      }
    }
    if (this.salidas.length > 0) {
      let s = 0;
      for (const c of this.capas) s += c.peso;
      if (s > 0) for (const c of this.capas) c.peso /= s;
    }
    return this.salidas;
  }

  peso(nombre: string): number {
    for (const c of this.capas) if (c.nombre === nombre) return c.peso;
    return 0;
  }

  /** La capa que entra (la de objetivo 1), o `null`. */
  activa(): string | null {
    for (const c of this.capas) if (c.objetivo === 1) return c.nombre;
    return null;
  }

  /** Los nombres vivos (con peso u objetivo), para recorrerlos. La lista se reutiliza: no guardarla. */
  nombres(): readonly string[] {
    this.vivos.length = 0;
    for (const c of this.capas) this.vivos.push(c.nombre);
    return this.vivos;
  }

  /** La suma de los pesos (1 salvo que no haya capas): para el comprobador. */
  suma(): number {
    let s = 0;
    for (const c of this.capas) s += c.peso;
    return s;
  }

  vaciar(): void {
    this.capas.length = 0;
  }
}

/* ─────────────────────────────── La marcha ─────────────────────────────── */

/** Clips de la marcha girada (de `clipsDeLaMarchaGirada`), con su zancada. */
export interface MarchaGirada {
  readonly clip: string;
  readonly zancada: number;
  readonly velocidad: number;
  readonly duracionMs: number;
}

/**
 * Lo que sale de mezclar la marcha: el peso de cada clip y el ritmo de la fase común. Los pesos van en
 * dos listas paralelas que se reutilizan (`clips[i]` pesa `pesos[i]`, las `cuantos` primeras): un `Map`
 * que se vacía en cada fotograma rehace su tabla, y recorrerlo asigna.
 */
export interface MezclaDeLaMarcha {
  readonly clips: string[];
  /** Suman 1. */
  readonly pesos: number[];
  cuantos: number;
  /** Ciclos de paso por segundo de la fase común (la de los clips con zancada). */
  ciclosPorSegundo: number;
  /** Σ peso × zancada de los clips con zancada (m por ciclo): lo que avanza un ciclo de la mezcla. */
  zancadaMezclada: number;
}

export function mezclaDeLaMarchaNueva(): MezclaDeLaMarcha {
  return { clips: [], pesos: [], cuantos: 0, ciclosPorSegundo: 0, zancadaMezclada: 0 };
}

/** El peso de un clip en una mezcla de la marcha (0 si no está). */
export function pesoEnLaMarcha(m: MezclaDeLaMarcha, clip: string): number {
  for (let i = 0; i < m.cuantos; i++) if (m.clips[i] === clip) return m.pesos[i] as number;
  return 0;
}

/** La mezcla como `Map` (para el comprobador: asigna). */
export function pesosDeLaMarcha(m: MezclaDeLaMarcha): Map<string, number> {
  const salida = new Map<string, number>();
  for (let i = 0; i < m.cuantos; i++) salida.set(m.clips[i] as string, m.pesos[i] as number);
  return salida;
}

/** Por encima de esto no se anda de lado ni hacia atrás: se corre de frente. */
export const GIRADA_HASTA_MS = 3;
/**
 * ENTRE DOS PASOS DE CARRERA la mezcla es estrecha. Mezclar andar con trotar va bien (a 2 m/s el pie
 * apoyado resbala 4 cm/s), pero trotar con correr no: los dos tienen fase de vuelo y apoyos de distinta
 * largura, y la media de dos poses de carrera deja un pie que no apoya en ninguna (medido: 0,4 m/s de
 * resbalón a 5 m/s con los dos clips limpios por separado). Basta un 6 % del otro: su pie va por el aire
 * a 10 m/s mientras el de éste apoya. Así que entre dos clips de más de `CARRERA_DESDE_MS` cada uno cubre
 * su tramo acelerando o frenando la cadencia, y sólo se funden en `ANCHO_ENTRE_CARRERAS` alrededor del
 * punto medio de sus velocidades. (La primera versión lo ponía en la media geométrica, 5,22 m/s entre
 * trotar y correr, y medio tramo caía sobre los 5 m/s del trote del juego: justo la velocidad a la que
 * se trota casi siempre.)
 */
export const CARRERA_DESDE_MS = 3;
export const ANCHO_ENTRE_CARRERAS = 0.3;
/** El tope de ciclos por segundo: la acometida vuela a 25 m/s y no se dan 6 zancadas por segundo. */
export const CICLOS_COMO_MUCHO = 2.4;

function sumar(m: MezclaDeLaMarcha, clip: string, p: number): void {
  if (p <= 0) return;
  for (let i = 0; i < m.cuantos; i++) {
    if (m.clips[i] === clip) {
      m.pesos[i] = (m.pesos[i] as number) + p;
      return;
    }
  }
  m.clips[m.cuantos] = clip;
  m.pesos[m.cuantos] = p;
  m.cuantos++;
}

/**
 * La parte `p` de la marcha que va girada con el clip `g`: su peso (a menos velocidad que la suya se
 * mezcla con reposo: el clip girado tiene su zancada a su velocidad) y la zancada que aporta. No asigna.
 */
function girada(pesos: MezclaDeLaMarcha, p: number, g: MarchaGirada | null, velocidad: number, puntos: readonly PuntoDeLaMarcha[]): number {
  if (g === null || p <= 0) return 0;
  const f = Math.min(1, velocidad / Math.max(1e-6, g.velocidad));
  sumar(pesos, g.clip, p * f);
  const reposo = puntos[0];
  if (reposo !== undefined && f < 1) sumar(pesos, reposo.clip, p * (1 - f));
  return p * f * g.zancada;
}

/**
 * LA MEZCLA DE LA MARCHA para una velocidad `v` (m/s) y una dirección del paso relativa a la cara `rel`
 * (radianes, 0 de frente, +π/2 a la derecha). Escribe en `salida` y la devuelve.
 *
 * De frente: los dos puntos de `puntos` que rodean `v`, por interpolación lineal (bajo el primer paso,
 * reposo y andar: menos zancada al mismo ritmo, que es como arranca una persona). De lado o hacia atrás:
 * los clips girados, repartidos por ángulo entre las dos direcciones vecinas, y sólo hasta
 * `GIRADA_HASTA_MS`. El ritmo: `v` / Σ(peso × zancada) ciclos por segundo, con la cadencia nominal de
 * andar si casi no hay zancada.
 */
export function mezclarLaMarcha(
  v: number,
  rel: number,
  puntos: readonly PuntoDeLaMarcha[],
  giradas: Readonly<Record<'atras' | 'izquierda' | 'derecha', MarchaGirada | null>>,
  salida: MezclaDeLaMarcha,
): MezclaDeLaMarcha {
  const pesos = salida;
  pesos.cuantos = 0;
  const velocidad = Math.max(0, v);
  /* ── El reparto por dirección: delante, derecha, atrás, izquierda, cada 90° ── */
  let pDelante = 1;
  let pDerecha = 0;
  let pAtras = 0;
  let pIzquierda = 0;
  if (velocidad > 0.2 && velocidad < GIRADA_HASTA_MS + 1) {
    const a = normalizarAngulo(rel);
    const cuarto = Math.PI / 2;
    /* Las dos cardinales que rodean `a` (0 delante, 1 derecha, 2 atrás, 3 izquierda), con su parte lineal. */
    const t = (a + 2 * Math.PI) % (2 * Math.PI);
    const k = Math.floor(t / cuarto) % 4;
    const f = (t - k * cuarto) / cuarto;
    const k2 = (k + 1) % 4;
    pDelante = (k === 0 ? 1 - f : 0) + (k2 === 0 ? f : 0);
    pDerecha = (k === 1 ? 1 - f : 0) + (k2 === 1 ? f : 0);
    pAtras = (k === 2 ? 1 - f : 0) + (k2 === 2 ? f : 0);
    pIzquierda = (k === 3 ? 1 - f : 0) + (k2 === 3 ? f : 0);
    /* Más allá de `GIRADA_HASTA_MS` se va enderezando hasta ser de frente. */
    const girado = Math.min(1, Math.max(0, GIRADA_HASTA_MS + 1 - velocidad));
    pDerecha *= girado;
    pAtras *= girado;
    pIzquierda *= girado;
    /* Sin clip girado, esa parte va de frente. */
    if (giradas.derecha === null) pDerecha = 0;
    if (giradas.atras === null) pAtras = 0;
    if (giradas.izquierda === null) pIzquierda = 0;
    pDelante = 1 - pDerecha - pAtras - pIzquierda;
  }
  /* ── De frente: interpolación por velocidad ── */
  let zancada = 0;
  if (puntos.length > 0) {
    let i = 0;
    while (i < puntos.length - 1 && (puntos[i + 1] as PuntoDeLaMarcha).velocidad < velocidad) i++;
    const a = puntos[i] as PuntoDeLaMarcha;
    const b = puntos[Math.min(i + 1, puntos.length - 1)] as PuntoDeLaMarcha;
    let fa = 1;
    let fb = 0;
    if (b !== a && velocidad >= a.velocidad) {
      let t = (velocidad - a.velocidad) / Math.max(1e-6, b.velocidad - a.velocidad);
      if (a.velocidad >= CARRERA_DESDE_MS) {
        /* Dos carreras: tramo estrecho alrededor del punto medio (ver la constante). */
        const umbral = (a.velocidad + b.velocidad) / 2;
        t = (velocidad - (umbral - ANCHO_ENTRE_CARRERAS / 2)) / ANCHO_ENTRE_CARRERAS;
      }
      fb = Math.min(1, Math.max(0, t));
      fa = 1 - fb;
    } else if (velocidad < a.velocidad) {
      fa = 1;
    }
    sumar(pesos, a.clip, fa * pDelante);
    sumar(pesos, b.clip, fb * pDelante);
    zancada += pDelante * (fa * a.zancada + fb * b.zancada);
  }
  zancada += girada(pesos, pDerecha, giradas.derecha, velocidad, puntos);
  zancada += girada(pesos, pAtras, giradas.atras, velocidad, puntos);
  zancada += girada(pesos, pIzquierda, giradas.izquierda, velocidad, puntos);
  salida.zancadaMezclada = zancada;
  /* La cadencia: la que hace que el pie de apoyo vaya hacia atrás a `v` (ver la cabecera). */
  let andar: PuntoDeLaMarcha | undefined;
  for (const p of puntos) {
    if (p.zancada > 0) {
      andar = p;
      break;
    }
  }
  const nominal = andar !== undefined ? andar.velocidad / andar.zancada : 1;
  salida.ciclosPorSegundo = zancada > 0.05 ? Math.min(CICLOS_COMO_MUCHO, velocidad / zancada) : nominal;
  return salida;
}

/* ─────────────────────────────── El paso de la multitud ─────────────────────────────── */

/**
 * LA FASE DE ANDAR DE UN DURMIENTE en el tic `tic`: la de un paso de `pasoPorTicM` metros por tic con
 * la zancada del clip de andar, más un desfase por persona para que la cuadrilla no marche al unísono.
 * Del tic y de nada más: el mismo pie en el mismo sitio en todos los aparatos (no hace falta, pero sale
 * gratis y así el Bis repite el mismo gesto). En ciclos (0 a 1).
 */
export function faseDeAndar(tic: number, pasoPorTicM: number, zancadaM: number, indice: number): number {
  const ciclos = (tic * pasoPorTicM) / Math.max(1e-6, zancadaM) + ((indice * 0.618034) % 1);
  return ciclos - Math.floor(ciclos);
}
