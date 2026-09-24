/**
 * EL REPARTO LEÍDO: qué figura, qué ropa y qué clip le toca a cada cuerpo, sacado del manifiesto que
 * escribe el frente «reparto» (`recursos/reparto.json`) y de nada más. Puro: sin three ni DOM, para que
 * el comprobador lo juzgue en Node con el mismo manifiesto que carga el navegador.
 *
 * ═══ POR QUÉ NINGÚN NOMBRE DE FICHERO NI DE CLIP ESCRITO A MANO ═══
 *
 * El manifiesto lo dice en su nota: los ficheros se reemplazan en los mismos nombres y lo provisional
 * va marcado. Si aquí se escribiera `'seguida-2'` para la Entrada, el día que la forja entregue el clip
 * propio de la Entrada el juego seguiría pegando con el cruzado y nadie lo vería. Así que el gesto se
 * traduce con `gestos[gesto].clip` del manifiesto, las figuras con `clases`, y la marcha (reposo, andar,
 * trotar, correr) con los clips de esos cuatro gestos. Las únicas excepciones son los clips de la marcha
 * hacia atrás y de lado, que el manifiesto todavía no nombra en `gestos` (no son gestos del juego: son
 * cómo se ve andar con el cuerpo girado hacia el blanco); se buscan por su nombre y, si faltan, se anda
 * de frente. El informe pide al reparto que los declare.
 *
 * ═══ LO QUE NO SALE, AUNQUE LA FIGURA LO TRAIGA ═══
 *
 * El diseño (§1) es tajante: los desvelados NO llevan gafas oscuras, el cuero negro largo con gafas es
 * de la lista de lo que no sale, y los Celadores NO llevan auricular. Las figuras del prototipo de la
 * forja los traen (el desvelado es una gabardina de cuero negro con gafas, el celador lleva el cable
 * del auricular). Mientras la forja no los quite, se quitan aquí: esas zonas no entran en la malla
 * (`ZONAS_QUE_NO_SALEN`) y el abrigo del desvelado se tiñe de tela en colores apagados, no de cuero
 * negro. Es una regla de la casa, no un gusto: por eso vive en datos y el comprobador la mira.
 *
 * ═══ EL SEXO DEL DESVELADO Y LA ROPA DEL PRESTADO ═══
 *
 * El manifiesto deja al cliente elegir el sexo por asiento: los asientos impares son hombre y los pares
 * mujer, fijo por número, para que el asiento 2 se vea igual en los seis aparatos. El Prestado trae en
 * `variante` el índice del durmiente del que salió (`partida.ts`), y su ropa es la de ese durmiente
 * (`AspectoDelDurmiente` de `quiebro-durmientes.ts`): «un Prestado conserva su ropa» (diseño §1).
 */
import type { ClaseDeCuerpo, Gesto } from '../cuerpos';

/* ─────────────────────────────── El manifiesto ─────────────────────────────── */

export type Sexo = 'hombre' | 'mujer';
export type Direccion = 'delante' | 'derecha' | 'atras' | 'izquierda';

export interface EsqueletoDelReparto {
  /** El `.glb` con los clips de este esqueleto. */
  readonly clips: string;
  readonly huesos: readonly string[];
  readonly raiz: string;
  readonly caderas: string;
  readonly cabeza: string;
  readonly agarre: { readonly derecha: string; readonly izquierda: string };
}

export interface LodDelReparto {
  readonly archivo: string;
  readonly bytes: number;
  readonly triangulos: number;
  readonly mallas: Readonly<Record<string, number>>;
  readonly materiales: readonly string[];
}

/** Una variante de una figura (una ropa, un estilo, una silueta): una malla con nombre en el fichero. */
export interface VarianteDeFigura {
  /** La escala de la figura entera con esta variante (el Celador alto, 1,06). */
  readonly escala: number;
  /** Triángulos por LOD, del más detallado al más ligero. */
  readonly triangulos: readonly number[];
  readonly zonas: readonly string[];
}

export interface FiguraDelReparto {
  readonly esqueleto: string;
  /** De más detalle a menos. */
  readonly lods: readonly LodDelReparto[];
  /** Las zonas de la familia en el orden de `_zona` (si no, los materiales del LOD0 por orden alfabético). */
  readonly zonas?: readonly string[];
  readonly variantes?: Readonly<Record<string, VarianteDeFigura>>;
}

/** Una pieza que se engancha a un hueso, fabricada por la forja (ya en el marco de su hueso). */
export interface PiezaDelReparto {
  readonly archivo: string;
  readonly triangulos: number;
  readonly materiales: readonly string[];
  readonly hueso: string;
}

export interface ClipDelReparto {
  readonly duracionMs: number;
  readonly fotogramas: number;
  readonly fps: number;
  readonly bucle: boolean;
  /** El clip mueve la raíz (se le quita: el juego mueve el cuerpo). */
  readonly raiz: boolean;
  readonly descripcion: string;
  /** Metros que avanza un ciclo, y a qué velocidad se hizo: sólo la marcha. */
  readonly zancadaM?: number;
  readonly velocidadMs?: number;
  /** Cuándo llega el golpe, desde el principio del clip: sólo los golpes. */
  readonly impactoMs?: number;
}

export interface GestoDelReparto {
  readonly clip: string;
  readonly provisional?: boolean;
  readonly porDireccion?: Readonly<Partial<Record<Direccion, string>>>;
}

/** Una figura para un sexo, con las mallas que se ven (`null`: todas). */
export interface FiguraElegida {
  readonly figura: string;
  readonly mallas: readonly string[] | null;
}

export interface VarianteDeDesvelado {
  readonly estilo: string;
  readonly hombre: FiguraElegida;
  readonly mujer: FiguraElegida;
  readonly provisional?: boolean;
}

export interface VarianteDeCelador extends FiguraElegida {
  readonly silueta: string;
  /** La escala de la figura entera (la del manifiesto; si falta, la de `SILUETAS`). */
  readonly escala?: number;
  readonly provisional?: boolean;
}

export interface CuerpoDeDurmiente {
  readonly sexo: Sexo;
  readonly figura: string;
  readonly ropas: readonly { readonly mallas: readonly string[] | null; readonly provisional?: boolean }[];
  readonly provisional?: boolean;
}

export interface Reparto {
  readonly version: number;
  readonly estado: string;
  readonly esqueletos: Readonly<Record<string, EsqueletoDelReparto>>;
  readonly figuras: Readonly<Record<string, FiguraDelReparto>>;
  readonly clases: {
    readonly desvelado: { readonly variantes: readonly VarianteDeDesvelado[]; readonly tenibles: Readonly<Record<string, string>> };
    readonly celador: {
      readonly variantes: readonly VarianteDeCelador[];
      readonly tenibles: Readonly<Record<string, string>>;
      /** Los cuatro colores del traje (§1), si el manifiesto los trae. */
      readonly paletaDelTraje?: Readonly<Record<string, string>>;
    };
    readonly tirador: { readonly como: string; readonly pieza: string | null };
    readonly prestado: { readonly como: string };
  };
  readonly durmientes: { readonly cuerpos: readonly CuerpoDeDurmiente[]; readonly paraguas: string | null };
  readonly piezas: Readonly<Record<string, PiezaDelReparto>>;
  readonly clips: Readonly<Record<string, ClipDelReparto>>;
  readonly gestos: Readonly<Record<string, GestoDelReparto>>;
  /** Clips de la marcha girada, si el reparto los declara (ver la cabecera). */
  readonly marcha?: Readonly<Partial<Record<'atras' | 'izquierda' | 'derecha', string>>>;
}

/* ─────────────────────────────── Leerlo sin fiarse ─────────────────────────────── */

function esObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * LEE EL MANIFIESTO y lo devuelve tipado, o LANZA diciendo todo lo que falta. No se fía de la forma:
 * el fichero lo escribe otro frente con Python, y un campo que falta aquí es un cuerpo que no sale en la
 * partida sin un error en la consola. Lo que no usa, lo deja pasar.
 */
export function leerElReparto(crudo: unknown): Reparto {
  const faltas: string[] = [];
  const pide = (cond: boolean, que: string): void => {
    if (!cond) faltas.push(que);
  };
  if (!esObjeto(crudo)) throw new Error('reparto.json no es un objeto');
  const r = crudo;
  pide(typeof r.version === 'number', 'version');
  for (const k of ['esqueletos', 'figuras', 'clases', 'durmientes', 'clips', 'gestos']) pide(esObjeto(r[k]), k);
  if (faltas.length > 0) throw new Error(`reparto.json: falta ${faltas.join(', ')}`);
  const esqueletos = r.esqueletos as Record<string, unknown>;
  for (const [n, e] of Object.entries(esqueletos)) {
    if (!esObjeto(e)) {
      faltas.push(`esqueletos.${n}`);
      continue;
    }
    pide(typeof e.clips === 'string', `esqueletos.${n}.clips`);
    pide(Array.isArray(e.huesos) && e.huesos.every((h) => typeof h === 'string'), `esqueletos.${n}.huesos`);
    for (const k of ['raiz', 'caderas', 'cabeza']) pide(typeof e[k] === 'string', `esqueletos.${n}.${k}`);
    pide(esObjeto(e.agarre) && typeof e.agarre.derecha === 'string' && typeof e.agarre.izquierda === 'string', `esqueletos.${n}.agarre`);
  }
  const figuras = r.figuras as Record<string, unknown>;
  for (const [n, f] of Object.entries(figuras)) {
    if (!esObjeto(f)) {
      faltas.push(`figuras.${n}`);
      continue;
    }
    pide(typeof f.esqueleto === 'string' && f.esqueleto in esqueletos, `figuras.${n}.esqueleto (que exista)`);
    pide(Array.isArray(f.lods) && f.lods.length > 0, `figuras.${n}.lods`);
    if (Array.isArray(f.lods)) {
      f.lods.forEach((l: unknown, i: number) => {
        pide(esObjeto(l) && typeof l.archivo === 'string' && typeof l.triangulos === 'number' && Array.isArray(l.materiales), `figuras.${n}.lods[${String(i)}]`);
      });
    }
  }
  const clips = r.clips as Record<string, unknown>;
  for (const [n, c] of Object.entries(clips)) {
    pide(esObjeto(c) && typeof c.duracionMs === 'number' && typeof c.bucle === 'boolean' && typeof c.raiz === 'boolean', `clips.${n}`);
  }
  const gestos = r.gestos as Record<string, unknown>;
  for (const [n, g] of Object.entries(gestos)) {
    pide(esObjeto(g) && typeof g.clip === 'string', `gestos.${n}.clip`);
  }
  const clases = r.clases as Record<string, unknown>;
  pide(esObjeto(clases.desvelado) && Array.isArray(clases.desvelado.variantes), 'clases.desvelado.variantes');
  pide(esObjeto(clases.celador) && Array.isArray(clases.celador.variantes), 'clases.celador.variantes');
  const durmientes = r.durmientes as Record<string, unknown>;
  pide(Array.isArray(durmientes.cuerpos) && durmientes.cuerpos.length > 0, 'durmientes.cuerpos');
  if (faltas.length > 0) throw new Error(`reparto.json: falta o está mal ${faltas.join(', ')}`);
  const desvelado = clases.desvelado as Record<string, unknown>;
  const celador = clases.celador as Record<string, unknown>;
  /* Las piezas: sólo las que traen fichero y hueso (las demás no se pueden enganchar). */
  const piezas: Record<string, PiezaDelReparto> = {};
  if (esObjeto(r.piezas)) {
    for (const [n, p] of Object.entries(r.piezas)) {
      if (esObjeto(p) && typeof p.archivo === 'string' && typeof p.hueso === 'string') {
        piezas[n] = { archivo: p.archivo, hueso: p.hueso, triangulos: typeof p.triangulos === 'number' ? p.triangulos : 0, materiales: Array.isArray(p.materiales) ? (p.materiales as string[]) : [] };
      }
    }
  }
  /* Los tenibles pueden venir como `{mat: papel}` o como `{mat: {por: papel}}`. */
  const tenibles = (x: unknown): Record<string, string> => {
    const salida: Record<string, string> = {};
    if (!esObjeto(x)) return salida;
    for (const [k, v] of Object.entries(x)) {
      if (typeof v === 'string') salida[k] = v;
      else if (esObjeto(v) && typeof v.por === 'string') salida[k] = v.por;
    }
    return salida;
  };
  return {
    ...(r as unknown as Reparto),
    clases: {
      desvelado: { variantes: desvelado.variantes as VarianteDeDesvelado[], tenibles: tenibles(desvelado.tenibles) },
      celador: {
        variantes: celador.variantes as VarianteDeCelador[],
        tenibles: tenibles(celador.tenibles),
        ...(esObjeto(celador.paletaDelTraje) ? { paletaDelTraje: celador.paletaDelTraje as Record<string, string> } : {}),
      },
      tirador: (esObjeto(clases.tirador) ? clases.tirador : { como: 'celador', pieza: null }) as { como: string; pieza: string | null },
      prestado: (esObjeto(clases.prestado) ? clases.prestado : { como: 'durmiente' }) as { como: string },
    },
    piezas,
  };
}

/* ─────────────────────────────── Las zonas ─────────────────────────────── */

/**
 * LAS ZONAS DE UNA FIGURA, en el orden en que las numera el atributo `_zona` del LOD1: los materiales
 * del LOD0 en orden alfabético. Así lo escribe la forja (`malla.fundir_materiales_lod`), y el
 * comprobador lo contrasta con los colores horneados del LOD1: si un día cambia el orden, se ve rojo
 * antes de que un civil salga con la piel del color del abrigo.
 */
export function zonasDeLaFigura(reparto: Reparto, figura: string): readonly string[] {
  const f = reparto.figuras[figura];
  if (f === undefined) throw new Error(`No hay figura «${figura}» en el reparto`);
  if (f.zonas !== undefined && f.zonas.length > 0) return f.zonas;
  const lod0 = f.lods[0] as LodDelReparto;
  return [...lod0.materiales].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * LOS TRIÁNGULOS DE UNA FIGURA EN UN LOD con unas mallas (sus variantes). Un fichero puede traer
 * varias variantes (las cuatro ropas de un durmiente) y sólo se pinta una: su cuenta, y no la del
 * fichero entero, es la que cuesta. Con `mallas` nulas, la variante MÁS CARA (el peor caso).
 */
export function triangulosDeLaFigura(reparto: Reparto, figura: string, lod: number, mallas: readonly string[] | null): number {
  const f = reparto.figuras[figura];
  const l = f?.lods[lod];
  if (f === undefined || l === undefined) return 0;
  const porMalla = (n: string): number => f.variantes?.[n]?.triangulos[lod] ?? l.mallas[n] ?? 0;
  const nombres = Object.keys(f.variantes ?? l.mallas);
  if (nombres.length === 0) return l.triangulos;
  if (mallas === null) return Math.max(...nombres.map(porMalla));
  return mallas.reduce((s, n) => s + porMalla(n), 0);
}

/** Las variantes de una figura (los nombres de sus mallas), o `[]` si es de una sola. */
export function variantesDeLaFigura(reparto: Reparto, figura: string): readonly string[] {
  const f = reparto.figuras[figura];
  if (f === undefined) return [];
  return Object.keys(f.variantes ?? f.lods[0]?.mallas ?? {});
}

/**
 * LA VARIANTE MÁS LIGERA de una figura en un LOD: el maniquí de la multitud y de los cuerpos lejanos
 * (ver `director.ts`: una geometría por figura y no una por ropa, para que la multitud quepa en dos
 * llamadas).
 */
export function varianteMasLigera(reparto: Reparto, figura: string, lod: number): readonly string[] | null {
  const vs = variantesDeLaFigura(reparto, figura);
  if (vs.length <= 1) return null;
  let mejor = vs[0] as string;
  for (const v of vs) if (triangulosDeLaFigura(reparto, figura, lod, [v]) < triangulosDeLaFigura(reparto, figura, lod, [mejor])) mejor = v;
  return [mejor];
}

/** La escala de una figura con unas mallas (la del manifiesto; 1 si no la dice). */
export function escalaDeLaVariante(reparto: Reparto, figura: string, mallas: readonly string[] | null): number {
  const n = mallas?.[0];
  return n === undefined ? 1 : (reparto.figuras[figura]?.variantes?.[n]?.escala ?? 1);
}

/**
 * EL PASO DE UN CLIP PARA UN ESQUELETO: zancada y velocidad. El manifiesto da las del esqueleto de
 * referencia y, si difieren, las de otro esqueleto bajo su nombre (`clips.andar.mujer`); si no las da,
 * `null` para ese esqueleto (y el director escala por la altura de las caderas).
 */
export function pasoDelClip(reparto: Reparto, clip: string, esqueleto: string | null): { zancada: number; velocidad: number; propio: boolean } | null {
  const c = reparto.clips[clip] as (ClipDelReparto & Record<string, unknown>) | undefined;
  if (c === undefined || c.zancadaM === undefined || c.velocidadMs === undefined) return null;
  const suyo = esqueleto !== null ? c[esqueleto] : undefined;
  if (esObjeto(suyo) && typeof suyo.zancadaM === 'number' && typeof suyo.velocidadMs === 'number') {
    return { zancada: suyo.zancadaM, velocidad: suyo.velocidadMs, propio: true };
  }
  return { zancada: c.zancadaM, velocidad: c.velocidadMs, propio: false };
}

/** Cuántas zonas caben en el sombreador (uniformes por zona). */
export const ZONAS_COMO_MUCHO = 16;

/**
 * LO QUE NO SALE POR CLASE, aunque la figura lo traiga: ver la cabecera. Las zonas se quitan de la
 * malla al fundirla (no se pintan de negro ni se esconden con un truco del sombreador: no existen).
 */
export const ZONAS_QUE_NO_SALEN: Readonly<Record<ClaseDeCuerpo | 'durmiente', readonly string[]>> = {
  /* «Los desvelados no llevan gafas oscuras» y «el cuero negro largo con gafas redondas» no sale. */
  desvelado: ['mat_gafas', 'mat_montura'],
  /* «No llevan auricular». Las gafas oscuras sí: son de los Celadores. */
  celador: ['mat_cable'],
  tirador: ['mat_cable'],
  prestado: [],
  durmiente: [],
};

/* ─────────────────────────────── Las paletas ─────────────────────────────── */

/**
 * LOS COLORES DE LA ROPA, en sRGB (lo que se ve). Apagados todos: la ropa no compite con el contorno,
 * que es lo que se lee a 60 m. Cada tabla dice de dónde sale.
 */
export const PALETAS = {
  /**
   * El abrigo de cada estilo (§3): gabardina de tela color tabaco, chaqueta corta pizarra, abrigo grueso
   * de paño pardo oscuro. Tela, no cuero: ver «Lo que no sale» en la cabecera.
   */
  abrigoDelEstilo: ['#5f5443', '#3e464d', '#4a4036'],
  rugosidadDelAbrigo: [0.78, 0.7, 0.92],
  /** Los cuatro trajes de los Celadores (§1): marengo, pardo, verde botella y azul noche. */
  trajes: ['#3b3e44', '#58483a', '#22402f', '#1d2640'],
  camisaDelCelador: '#bdbdb6',
  corbataDelCelador: '#121417',
  /** Cuatro ropas de durmiente por cuerpo: abrigo, pantalón y camisa (camel, gris, marino, granate). */
  ropasDeDurmiente: [
    { abrigo: '#6b5a42', tela: '#2e2e30', camisa: '#8a8378' },
    { abrigo: '#4a4e52', tela: '#3c3a36', camisa: '#6d7c86' },
    { abrigo: '#2a3346', tela: '#25282e', camisa: '#9a8f7c' },
    { abrigo: '#4d2a2e', tela: '#34302c', camisa: '#7a6b72' },
  ],
  /** Pelo y piel de los durmientes, por índice (se reparten con un paso que no se alinea con la ropa). */
  pelos: ['#1a1410', '#3a2a1c', '#6f6a64', '#5a2e1a'],
  pieles: ['#c9a58c', '#a87e62', '#e0bda2', '#7a5642'],
  /** Telas de los paraguas: negro, marino, granate, verde oscuro, gris. */
  paraguas: ['#141518', '#1b2338', '#3d1a1f', '#1c2e24', '#3a3c40'],
} as const;

/** Cómo se ve la ropa de un cuerpo: color por zona (sRGB) y rugosidad por zona, sobre la de la figura. */
export interface TinteDelCuerpo {
  readonly colores: Readonly<Record<string, string>>;
  readonly rugosidad: Readonly<Record<string, number>>;
}

/** El color del asiento, apagado, para el forro (o lo que haga de forro). */
export function forroDelAsiento(color: string): string {
  const n = Number.parseInt(color.slice(1), 16);
  if (!Number.isFinite(n) || color.length !== 7) return '#555555';
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  /* A media luz y un poco hacia el gris: se ve de qué asiento es sin brillar como el contorno. */
  const gris = (r + g + b) / 3;
  const f = (c: number): number => Math.round((c * 0.7 + gris * 0.3) * 0.6);
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Lo que el durmiente lleva: su ropa y cuerpo vienen de `quiebro-durmientes.ts`. */
export interface AspectoLeido {
  readonly cuerpo: number;
  readonly ropa: number;
  readonly paraguas: boolean;
}

/** El pelo, la piel y el paraguas de un durmiente (índices en `PALETAS`). */
export interface DetalleDelDurmiente {
  readonly pelo: number;
  readonly piel: number;
  readonly paraguas: number;
}
const DETALLES = new Map<number, DetalleDelDurmiente>();

/**
 * El pelo, la piel y el paraguas del durmiente `i`: pasos primos para que no vayan de la mano. Se
 * recuerda por índice (se pide en cada fotograma por cabeza: no asigna después de la primera vez).
 */
export function detalleDelDurmiente(i: number): DetalleDelDurmiente {
  const k = Math.abs(Math.trunc(i));
  const hecho = DETALLES.get(k);
  if (hecho !== undefined) return hecho;
  const nuevo = { pelo: (k * 3 + 1) % PALETAS.pelos.length, piel: (k * 5 + 2) % PALETAS.pieles.length, paraguas: (k * 7 + 3) % PALETAS.paraguas.length };
  if (DETALLES.size < 4096) DETALLES.set(k, nuevo);
  return nuevo;
}

/* ─────────────────────────────── La figura de cada cuerpo ─────────────────────────────── */

/** Cómo se deforma una silueta de Celador mientras la forja no traiga las cuatro figuras. */
export interface Silueta {
  /** Escala de la figura entera: ancho, alto, fondo. */
  readonly escala: readonly [number, number, number];
  /** Encorvado de la espalda, en radianes (el mayor). */
  readonly encorvado: number;
  /** Piezas que se le añaden (el sombrero del mayor). */
  readonly piezas: readonly string[];
}

/**
 * LAS CUATRO SILUETAS DE CELADOR (§1: alto y enjuto, ancho, mujer, mayor con sombrero), mientras sean la
 * misma figura: escalas que se leen de lejos sin romper la malla. Provisional como el manifiesto: el día
 * que el reparto traiga una figura por silueta, estas escalas se quedan en 1.
 */
export const SILUETAS: Readonly<Record<string, Silueta>> = {
  alto: { escala: [0.93, 1.06, 0.93], encorvado: 0, piezas: [] },
  ancho: { escala: [1.13, 0.99, 1.1], encorvado: 0, piezas: [] },
  mujer: { escala: [0.92, 0.95, 0.92], encorvado: 0, piezas: [] },
  mayor: { escala: [1.03, 0.96, 1.03], encorvado: 0.14, piezas: ['sombrero'] },
};
const SILUETA_NEUTRA: Silueta = { escala: [1, 1, 1], encorvado: 0, piezas: [] };

/** Lo que hay que pintar para un cuerpo: la figura, cómo se deforma, qué lleva y de qué color. */
export interface FiguraDelCuerpo {
  readonly figura: string;
  readonly esqueleto: string;
  readonly sexo: Sexo;
  readonly mallas: readonly string[] | null;
  readonly silueta: Silueta;
  /** Piezas enganchadas (pistola, sombrero, paraguas), por nombre de pieza. */
  readonly piezas: readonly string[];
  readonly tinte: TinteDelCuerpo;
  /** Zonas que no entran en la malla (ver «Lo que no sale»). */
  readonly sinZonas: readonly string[];
  /** Clave de la malla fundida: misma clave, misma geometría compartida. */
  readonly claveDeMalla: string;
}

/**
 * LA CLAVE DE UNA MALLA FUNDIDA: todo lo que cambia la geometría (figura, mallas, zonas quitadas y
 * piezas) y nada más. Dos cuerpos con la misma clave comparten la geometría; el tinte no entra, porque
 * va en el material de cada uno.
 */
export function claveDeMalla(figura: string, mallas: readonly string[] | null, sinZonas: readonly string[], piezas: readonly string[]): string {
  return `${figura}|${(mallas ?? ['*']).join('+')}|-${sinZonas.join('-')}|${piezas.join('+')}`;
}

/** La misma figura con otras piezas (y otras mallas, si se dan): para el rebaño, que no lleva piezas. */
export function conOtrasPiezas(f: FiguraDelCuerpo, piezas: readonly string[], mallas: readonly string[] | null = f.mallas): FiguraDelCuerpo {
  return { ...f, piezas, mallas, claveDeMalla: claveDeMalla(f.figura, mallas, f.sinZonas, piezas) };
}

/** El sexo de un asiento: impares hombre, pares mujer (ver la cabecera). */
export function sexoDelAsiento(id: number): Sexo {
  return Math.abs(Math.trunc(id)) % 2 === 1 ? 'hombre' : 'mujer';
}

function modulo(a: number, n: number): number {
  return ((Math.trunc(a) % n) + n) % n;
}

function esqueletoDe(reparto: Reparto, figura: string): string {
  const f = reparto.figuras[figura];
  if (f === undefined) throw new Error(`El reparto nombra la figura «${figura}» y no la trae`);
  return f.esqueleto;
}

/**
 * ¿Trae la figura sus variantes (una malla por ropa, estilo o silueta, con sus colores y su escala)?
 * Basta con que el manifiesto las DECLARE, aunque sea una: la Celadora es una figura con una sola
 * variante («mujer», escala 1), y la primera versión exigía más de una, así que la tomaba por el
 * prototipo y la encogía con la deformación de `SILUETAS` (0,92 × 0,95: la midió la revisión).
 */
export function conVariantes(reparto: Reparto, figura: string): boolean {
  const f = reparto.figuras[figura];
  if (f === undefined) return false;
  if (f.variantes !== undefined && Object.keys(f.variantes).length >= 1) return true;
  return Object.keys(f.lods[0]?.mallas ?? {}).length > 1;
}

/** Una silueta que sólo escala la figura entera, igual en los tres ejes. */
function siluetaDeEscala(e: number): Silueta {
  return { escala: [e, e, e], encorvado: 0, piezas: [] };
}

/**
 * EL TINTE DE UN DURMIENTE (o de un Prestado, que es él). Con ropas de verdad en el reparto (una malla
 * por ropa, cada una con sus colores) la ropa no se toca: se varían el pelo y la piel, que es lo que
 * distingue a dos personas vestidas igual. Con la figura del prototipo (una sola ropa), la ropa se tiñe
 * con `PALETAS.ropasDeDurmiente`.
 */
export function tinteDelDurmiente(indice: number, ropa: number, ropasPropias: boolean): TinteDelCuerpo {
  const d = detalleDelDurmiente(indice);
  const pelo = { mat_pelo: PALETAS.pelos[d.pelo] as string, mat_piel: PALETAS.pieles[d.piel] as string };
  if (ropasPropias) return { colores: pelo, rugosidad: {} };
  const r = PALETAS.ropasDeDurmiente[modulo(ropa, PALETAS.ropasDeDurmiente.length)] as (typeof PALETAS.ropasDeDurmiente)[number];
  return { colores: { mat_abrigo: r.abrigo, mat_tela: r.tela, mat_camisa: r.camisa, ...pelo }, rugosidad: { mat_abrigo: 0.8 } };
}

const TRAJES = new WeakMap<Reparto, readonly string[]>();

/** Los colores del traje de los Celadores: los del manifiesto, o los de `PALETAS`. Leídos una vez. */
export function coloresDelTraje(reparto: Reparto): readonly string[] {
  const hecho = TRAJES.get(reparto);
  if (hecho !== undefined) return hecho;
  const p = reparto.clases.celador.paletaDelTraje;
  const del = p !== undefined ? Object.values(p) : [];
  const trajes = del.length > 0 ? del : PALETAS.trajes;
  TRAJES.set(reparto, trajes);
  return trajes;
}

/**
 * LA FIGURA DE UN CUERPO. `aspecto` es el del durmiente cuando se sabe (Prestados), o `null`.
 * Lanza si el manifiesto no trae lo que nombra: mejor un error en el banco que un cuerpo invisible.
 */
export function figuraDelCuerpo(
  reparto: Reparto,
  c: { readonly id: number; readonly clase: ClaseDeCuerpo; readonly variante: number; readonly color: string | null },
  aspecto: AspectoLeido | null,
): FiguraDelCuerpo {
  if (c.clase === 'desvelado') {
    const vs = reparto.clases.desvelado.variantes;
    const estilo = modulo(c.variante, Math.max(1, vs.length));
    const v = vs[estilo] as VarianteDeDesvelado;
    const sexo = sexoDelAsiento(c.id);
    const elegida = sexo === 'hombre' ? v.hombre : v.mujer;
    const asiento = c.color ?? '#808080';
    /*
     * El forro del color del asiento (§1), saturado: es lo que se lee a 60 m. Si la figura trae la zona
     * `mat_forro` (o el manifiesto marca otra como del asiento), es ésa; si no (el prototipo), hace de
     * forro la camisa que asoma por la gabardina abierta, a media luz.
     */
    const zonas = zonasDeLaFigura(reparto, elegida.figura);
    const colores: Record<string, string> = {};
    if (zonas.includes('mat_forro')) colores.mat_forro = asiento;
    else colores.mat_camisa = forroDelAsiento(asiento);
    for (const [mat, papel] of Object.entries(reparto.clases.desvelado.tenibles)) if (papel === 'asiento' && zonas.includes(mat)) colores[mat] = asiento;
    /* El prototipo era cuero negro para los tres estilos: se tiñe de tela (ver «Lo que no sale»). */
    const propias = conVariantes(reparto, elegida.figura);
    if (!propias) colores.mat_abrigo = PALETAS.abrigoDelEstilo[estilo % PALETAS.abrigoDelEstilo.length] as string;
    return {
      figura: elegida.figura,
      esqueleto: esqueletoDe(reparto, elegida.figura),
      sexo,
      mallas: elegida.mallas,
      silueta: siluetaDeEscala(escalaDeLaVariante(reparto, elegida.figura, elegida.mallas)),
      piezas: [],
      tinte: { colores, rugosidad: propias ? {} : { mat_abrigo: PALETAS.rugosidadDelAbrigo[estilo % PALETAS.rugosidadDelAbrigo.length] as number } },
      sinZonas: ZONAS_QUE_NO_SALEN.desvelado,
      claveDeMalla: claveDeMalla(elegida.figura, elegida.mallas, ZONAS_QUE_NO_SALEN.desvelado, []),
    };
  }
  if (c.clase === 'celador' || c.clase === 'tirador') {
    const vs = reparto.clases.celador.variantes;
    const v = vs[modulo(c.variante, Math.max(1, vs.length))] as VarianteDeCelador;
    /* La silueta la da la variante; el color del traje, el número (16 combinaciones estables por id). */
    const trajes = coloresDelTraje(reparto);
    const traje = trajes[modulo(Math.floor(c.id / 4), trajes.length)] as string;
    const propias = conVariantes(reparto, v.figura);
    /* Con figuras por silueta, la escala es la del manifiesto; con el prototipo, la deformación de `SILUETAS`. */
    const silueta = propias ? siluetaDeEscala(v.escala ?? escalaDeLaVariante(reparto, v.figura, v.mallas)) : (SILUETAS[v.silueta] ?? SILUETA_NEUTRA);
    const pieza = c.clase === 'tirador' ? (reparto.clases.tirador.pieza ?? 'pistola') : null;
    const piezas = [...silueta.piezas, ...(pieza !== null ? [pieza] : [])];
    const sin = ZONAS_QUE_NO_SALEN[c.clase];
    const zonas = zonasDeLaFigura(reparto, v.figura);
    const colores: Record<string, string> = {};
    for (const [mat, papel] of Object.entries(reparto.clases.celador.tenibles)) if (papel === 'paleta' && zonas.includes(mat)) colores[mat] = traje;
    if (!zonas.includes('mat_traje')) {
      colores.mat_abrigo = traje;
      colores.mat_tela = traje;
      colores.mat_camisa = PALETAS.camisaDelCelador;
      colores.mat_corbata = PALETAS.corbataDelCelador;
    }
    return {
      figura: v.figura,
      esqueleto: esqueletoDe(reparto, v.figura),
      sexo: esqueletoDe(reparto, v.figura) === 'mujer' || v.silueta === 'mujer' ? 'mujer' : 'hombre',
      mallas: v.mallas,
      silueta,
      piezas,
      tinte: { colores, rugosidad: {} },
      sinZonas: sin,
      claveDeMalla: claveDeMalla(v.figura, v.mallas, sin, piezas),
    };
  }
  /* Prestado: el durmiente del que salió, con su ropa. */
  const indice = c.variante;
  const a = aspecto ?? { cuerpo: modulo(indice, reparto.durmientes.cuerpos.length), ropa: modulo(indice, 4), paraguas: false };
  return figuraDelDurmiente(reparto, indice, a, false);
}

/**
 * LA FIGURA DE UN DURMIENTE (en la multitud o con esqueleto, si está entre los más cercanos en N2+).
 * `conParaguas`: si se le engancha el paraguas (el Prestado lo suelta al ponerse a pelear).
 */
export function figuraDelDurmiente(reparto: Reparto, indice: number, aspecto: AspectoLeido, conParaguas: boolean): FiguraDelCuerpo {
  const cuerpos = reparto.durmientes.cuerpos;
  const cuerpo = cuerpos[modulo(aspecto.cuerpo, cuerpos.length)] as CuerpoDeDurmiente;
  const ropa = cuerpo.ropas[modulo(aspecto.ropa, Math.max(1, cuerpo.ropas.length))];
  const mallas = ropa?.mallas ?? null;
  const piezas = conParaguas ? [reparto.durmientes.paraguas ?? 'paraguas'] : [];
  const propias = conVariantes(reparto, cuerpo.figura);
  /* Si el cuerpo de mujer todavía es la figura de hombre (el prototipo), se nota menos un poco más baja. */
  const figuraDeMujerPrestada = cuerpo.sexo === 'mujer' && esqueletoDe(reparto, cuerpo.figura) !== 'mujer';
  const tinte = tinteDelDurmiente(indice, aspecto.ropa, propias);
  const tela = PALETAS.paraguas[detalleDelDurmiente(indice).paraguas] as string;
  /* La tela del paraguas: la zona de la pieza de la forja o la de la de código, la que haya. */
  const colores = conParaguas ? { ...tinte.colores, mat_paraguas: tela, pieza_tela: tela } : tinte.colores;
  return {
    figura: cuerpo.figura,
    esqueleto: esqueletoDe(reparto, cuerpo.figura),
    sexo: cuerpo.sexo,
    mallas,
    silueta: figuraDeMujerPrestada ? { escala: [0.93, 0.94, 0.93], encorvado: 0, piezas: [] } : siluetaDeEscala(escalaDeLaVariante(reparto, cuerpo.figura, mallas)),
    piezas,
    tinte: { colores, rugosidad: tinte.rugosidad },
    sinZonas: ZONAS_QUE_NO_SALEN.durmiente,
    claveDeMalla: claveDeMalla(cuerpo.figura, mallas, ZONAS_QUE_NO_SALEN.durmiente, piezas),
  };
}

/* ─────────────────────────────── El clip de cada gesto ─────────────────────────────── */

export interface ClipElegido {
  readonly clip: string;
  /** Hay que pintarlo en espejo (el lado contrario del que se horneó). */
  readonly espejo: boolean;
}

const LADO_OPUESTO: Readonly<Record<'izquierda' | 'derecha', 'izquierda' | 'derecha'>> = { izquierda: 'derecha', derecha: 'izquierda' };

/**
 * EL CLIP DE UN GESTO, hacia una dirección relativa al cuerpo (o `null`). Si el manifiesto manda la
 * derecha al clip de la izquierda (lo provisional de hoy), y no hay un `…-derecha` horneado, se pinta la
 * izquierda en ESPEJO: quebrar a la derecha con un paso a la izquierda sería mentir al que mira.
 */
export function clipDelGesto(reparto: Reparto, gesto: Gesto, direccion: Direccion | null): ClipElegido {
  const g = reparto.gestos[gesto] ?? reparto.gestos.reposo;
  if (g === undefined) throw new Error(`El reparto no trae el gesto «${gesto}» ni el reposo`);
  const nombre = (direccion !== null ? g.porDireccion?.[direccion] : undefined) ?? g.clip;
  if (direccion === 'izquierda' || direccion === 'derecha') {
    const otro = LADO_OPUESTO[direccion];
    const sufijo = `-${otro}`;
    if (nombre.endsWith(sufijo)) {
      const propio = `${nombre.slice(0, -sufijo.length)}-${direccion}`;
      if (reparto.clips[propio] !== undefined) return { clip: propio, espejo: false };
      return { clip: nombre, espejo: true };
    }
  }
  return { clip: nombre, espejo: false };
}

/** Todos los clips que el reparto puede pedir por gestos (para el comprobador y para cargar). */
export function clipsPedidos(reparto: Reparto): readonly string[] {
  const salida = new Set<string>();
  for (const g of Object.values(reparto.gestos)) {
    salida.add(g.clip);
    for (const c of Object.values(g.porDireccion ?? {})) if (c !== undefined) salida.add(c);
  }
  for (const c of Object.values(clipsDeLaMarchaGirada(reparto))) if (c !== null) salida.add(c);
  return [...salida].sort();
}

/* ─────────────────────────────── La marcha ─────────────────────────────── */

/** Un punto del espacio de mezcla de la marcha: un clip, a qué velocidad se hizo y cuánto avanza. */
export interface PuntoDeLaMarcha {
  readonly gesto: 'reposo' | 'andar' | 'trotar' | 'correr';
  readonly clip: string;
  readonly velocidad: number;
  readonly zancada: number;
  readonly duracionMs: number;
}

/**
 * LA MARCHA HACIA DELANTE, de parado a correr, ordenada por velocidad: los clips de los gestos
 * `reposo`, `andar`, `trotar` y `correr`, con la velocidad y la zancada con que se hornearon. Un clip
 * de marcha sin zancada no puede acompasarse con el suelo: se salta (y el comprobador lo pinta rojo).
 */
export function marchaDelReparto(reparto: Reparto, esqueleto: string | null = null): readonly PuntoDeLaMarcha[] {
  const salida: PuntoDeLaMarcha[] = [];
  const poner = (gesto: PuntoDeLaMarcha['gesto'], clip: string): void => {
    const c = reparto.clips[clip];
    if (c === undefined) return;
    if (gesto === 'reposo') {
      salida.push({ gesto, clip, velocidad: 0, zancada: 0, duracionMs: c.duracionMs });
      return;
    }
    const p = pasoDelClip(reparto, clip, esqueleto);
    if (p === null || p.zancada <= 0 || p.velocidad <= 0) return;
    salida.push({ gesto, clip, velocidad: p.velocidad, zancada: p.zancada, duracionMs: c.duracionMs });
  };
  for (const gesto of ['reposo', 'andar', 'trotar', 'correr'] as const) {
    const g = reparto.gestos[gesto];
    if (g !== undefined) poner(gesto, g.clip);
  }
  /*
   * `pasear`: el paso de calle de 1,3 m/s, por debajo del `andar` decidido de 2 m/s (el manifiesto lo
   * dice en `usoDeLosClips`, no en `gestos`: no es un gesto del juego, es a qué ritmo va el cuerpo).
   */
  if (reparto.clips.pasear !== undefined && !salida.some((p) => p.clip === 'pasear')) poner('andar', 'pasear');
  return salida.sort((a, b) => a.velocidad - b.velocidad);
}

/**
 * Los clips de andar hacia atrás y de lado. Del manifiesto si los declara en `marcha`; si no, por su
 * nombre de hoy (ver la cabecera); `null` si no están.
 */
export function clipsDeLaMarchaGirada(reparto: Reparto): Readonly<Record<'atras' | 'izquierda' | 'derecha', string | null>> {
  const busca = (lado: 'atras' | 'izquierda' | 'derecha', porNombre: string): string | null => {
    const declarado = reparto.marcha?.[lado];
    if (declarado !== undefined && reparto.clips[declarado] !== undefined) return declarado;
    return reparto.clips[porNombre] !== undefined ? porNombre : null;
  };
  return { atras: busca('atras', 'retroceder'), izquierda: busca('izquierda', 'lateral-izquierda'), derecha: busca('derecha', 'lateral-derecha') };
}
