/**
 * EL MAPA DE LA CIUDAD, SIN PINTAR NADA TODAVÍA: cómo se dibuja la ciudad en el lienzo del minimapa y del
 * plano, cómo se lleva ese lienzo al minimapa girado, dónde cae cada marca y qué hace un toque en el plano
 * (`docs/quiebro/CIUDAD-ABIERTA.md` §5.9, contrato en `../orientacion.ts`). Puro: sin React y sin el DOM
 * (el lienzo llega como un pincel con `fillRect`), para que `verify:quiebro-juego` lo mire en Node.
 *
 * ═══ SÓLO RECTÁNGULOS, Y POR QUÉ ESO SE PUEDE COMPROBAR ═══
 *
 * La ciudad va por los ejes: manzanas, calles, plazas, avenidas, callejones y todo lo que estorba son
 * cajas alineadas. Así que la ciudad entera se pinta con `fillRect` y nada más, y un pincel de mentira que
 * rasteriza rectángulos en una rejilla de 540 × 540 ve EXACTAMENTE lo que verá el lienzo. Con eso el
 * comprobador exige lo que importa de un mapa: que no haya calle pintada donde hay una pared, ni pared
 * donde se anda. Es la queja de Miguel vuelta del revés: «calles que se ven formadas y no se pueden
 * recorrer» sería, en el mapa, un píxel de calle dentro de un edificio.
 *
 * ═══ QUÉ SE PINTA ═══
 *
 * Lo que sirve para orientarse a 0,7 px por metro, y nada que sea ruido:
 *   · las calles y las aceras (todo el suelo), las avenidas un punto más claras con su mediana;
 *   · las plazas, en su tono: son donde pasa la noche;
 *   · los edificios, su planta baja con un filo y el tejado teñido por distrito (el Casco en piedra, las
 *     Torres frías): se sabe en qué distrito se está sin leer nada;
 *   · el soportal, la franja de huella que la planta baja deja libre (se anda por debajo);
 *   · lo grande que estorba en la calle (quioscos, fuentes, contenedores, coches), tenue;
 *   · los cortes de obra de la noche, en rojo apagado: cambian el camino.
 * Y NO se pintan pilares, farolas, troncos, bancos ni postes: de un metro o menos, a esta escala son
 * polvo, y se rodean sin pensarlo. `seEnsenaEnElMapa` es la lista, y el comprobador la usa.
 *
 * El lienzo se pinta UNA vez por noche (`lienzoDeLaNoche`, guardado por la identidad de la noche): la
 * noche es la misma de la Bajada al Amanecer, y lo que cambia (las marcas, el rumbo) va encima.
 *
 * ═══ EL MINIMAPA GIRA CON LA MIRADA Y LAS MARCAS NO SE DESPEGAN ═══
 *
 * El minimapa lleva la mirada de la cámara hacia arriba (`alMinimapa`). El lienzo se lleva a él con UNA
 * transformación afín (`transformacionDelMinimapa`), y las marcas se colocan con `alMinimapa`. Si las dos
 * cuentas no fueran la misma, el mapa giraría hacia un lado y las marcas hacia el otro: un Fallo al norte
 * pintado sobre la manzana del sur. El comprobador exige que coincidan punto a punto en cualquier giro.
 *
 * ═══ TOCAR EL PLANO ═══
 *
 * Un toque es un `pointerdown` (nunca `onClick`, que en la app no llega): si cae a `RADIO_DEL_TOQUE_PT` o
 * menos de un Fallo, una cabina, un refugio o un arca, tiende el rumbo a él (y si ya era el del rumbo, lo
 * suelta); si no, manda «Aquí» sobre el nudo más cercano (L8). 22 pt de radio es el dedo de 44 pt que pide
 * la casa para cualquier cosa que se toca.
 */
import type { CajaDeLaCiudad, IdDeDistrito, NocheDeLaCiudad, TipoDeCajaDeLaCiudad } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import { BORDE_DE_LA_CIUDAD, nudoMasCercano, SALIDA_DE_GLIFOS } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { FuenteDelMapa, MarcaDelMapa, OrdenesDelMapa, PuntoDelMapa, RumboTendido } from '../orientacion';
import { alMinimapa, delPlano, LADO_DEL_LIENZO, LADO_DEL_MINIMAPA_PT, PIXELES_POR_METRO, REFRESCOS_DEL_MINIMAPA } from '../orientacion';
import type { ObjetivoDelRumbo } from '../orientacion';
import { mismoObjetivo, objetivoDeLaMarca } from './rumbo';

/* ─── LAS MEDIDAS DEL MAPA ───────────────────────────────────────────────── */

/**
 * Lo que abarca el minimapa, del centro al canto: 80 m. Son 160 m en 112 pt, 0,7 pt por metro: una calle
 * de 12 m son 8 pt y un callejón de 6, 4; una emboscada a 20-35 m cae dentro, y un Fallo a 150, en el
 * borde con su flecha.
 */
export const RADIO_DEL_MINIMAPA_M = 80;
/** Los pt CSS por metro del minimapa. */
export const ESCALA_DEL_MINIMAPA = LADO_DEL_MINIMAPA_PT / 2 / RADIO_DEL_MINIMAPA_M;
/** Cada cuánto se recorta y se gira el minimapa. */
export const REFRESCO_DEL_MINIMAPA_MS = 1000 / REFRESCOS_DEL_MINIMAPA;
/** Lo que se queda dentro del canto una marca que no cabe, en pt. */
export const MARGEN_DEL_BORDE_PT = 7;
/** El radio de un toque en el plano, en pt CSS: medio dedo de 44. */
export const RADIO_DEL_TOQUE_PT = 22;
/** El plano no pasa de esto en una pantalla grande: más grande no se lee mejor. */
export const LADO_MAXIMO_DEL_PLANO_PT = 720;
/**
 * Lo que el plano enseña fuera del borde, en metros por cada lado: el cerco y las tres salidas de glifos
 * (`SALIDA_DE_GLIFOS`), para que el borde se vea como lo que es y no como un recorte del dibujo.
 */
export const MARGEN_DEL_PLANO_M = SALIDA_DE_GLIFOS + 6;
/** Los píxeles de lienzo que cubre el plano de canto a canto, con su margen. */
export const LIENZO_DEL_PLANO = LADO_DEL_LIENZO + 2 * MARGEN_DEL_PLANO_M * PIXELES_POR_METRO;

/** Los rótulos del mapa. Van a `quiebro-nombres.ts` cuando el frente de reglas los tenga (se pide en el informe). */
export const TEXTOS_DEL_MAPA = {
  plano: 'Plano',
  cerrar: 'Cerrar el plano',
  aqui: 'Aquí',
  soltarRumbo: 'Soltar el rumbo',
  tu: 'Tú',
  fallo: 'Fallo',
  cabina: 'Cabina',
  companero: 'Compañero',
  refugio: 'Refugio',
  vigia: 'Vigía',
  ayuda: 'Toca un sitio: «Aquí». Toca un Fallo o una cabina: rumbo.',
  minimapa: 'Minimapa',
} as const;

/* ─── LA PALETA ──────────────────────────────────────────────────────────── */

/**
 * LOS COLORES DEL MAPA. Oscuros y fríos, para que encima se lean las marcas con los colores que ya tienen
 * trabajo en el HUD (§1 de EL-QUIEBRO): ámbar lo del jugador, verde-cian el código (los Fallos), magenta
 * los avisos. Ningún tono del mapa es ámbar saturado. El tejado de cada distrito lleva su tinte, tenue.
 */
export interface ColoresDelMapa {
  readonly vacio: string;
  readonly calle: string;
  readonly avenida: string;
  readonly mediana: string;
  readonly plaza: string;
  readonly soportal: string;
  readonly coche: string;
  readonly estorbo: string;
  readonly corte: string;
  readonly corteClaro: string;
  readonly salida: string;
  readonly filo: Readonly<Record<IdDeDistrito, string>>;
  readonly tejado: Readonly<Record<IdDeDistrito, string>>;
}

export const COLORES_DEL_MAPA: ColoresDelMapa = {
  vacio: '#040809',
  calle: '#1f3234',
  avenida: '#2a4442',
  mediana: '#142224',
  plaza: '#2d4b43',
  soportal: '#182627',
  coche: '#172729',
  estorbo: '#0f1a1b',
  corte: '#7a2a36',
  corteClaro: '#c25060',
  salida: 'rgba(63, 242, 194, 0.55)',
  filo: { casco: '#4a5a52', ensanche: '#5a4a4c', lonja: '#5a5242', naves: '#474b50', torres: '#3f5468' },
  tejado: { casco: '#0f1513', ensanche: '#161112', lonja: '#15130e', naves: '#101113', torres: '#0b121a' },
};

/** Qué cajas se pintan: las que a 0,7 pt por metro se ven y cambian por dónde se va. */
const SE_PINTAN: ReadonlySet<TipoDeCajaDeLaCiudad> = new Set<TipoDeCajaDeLaCiudad>([
  'edificio',
  'fuente',
  'quiosco',
  'quiosco-de-prensa',
  'coche',
  'contenedor',
  'muelle',
  'estatua',
  'carretilla',
  'refugio',
  'corte',
]);

/** ¿Se pinta esta caja en el mapa? (Pilares, farolas, troncos, bancos, postes y el cerco, no.) */
export function seEnsenaEnElMapa(tipo: TipoDeCajaDeLaCiudad): boolean {
  return SE_PINTAN.has(tipo);
}

/* ─── EL PINCEL ──────────────────────────────────────────────────────────── */

/** Lo que el mapa usa de un `CanvasRenderingContext2D` para pintar la ciudad: rectángulos y nada más. */
export interface PincelDelMapa {
  fillStyle: unknown;
  fillRect(x: number, y: number, ancho: number, alto: number): void;
}

/** Lo que la ciudad pinta de una noche: la ciudad de la mesa (edificios, plazas, avenidas) y sus cajas y cortes. */
export type NocheQueSePinta = Pick<NocheDeLaCiudad, 'cajas' | 'cortes'> & {
  readonly ciudad: Pick<NocheDeLaCiudad['ciudad'], 'huecos' | 'avenidas' | 'edificios' | 'cajas'>;
};

/**
 * PINTA LA CIUDAD DE UNA NOCHE en el lienzo del mapa: norte arriba, la esquina noroeste (−270, −270) en el
 * píxel (0, 0) y `PIXELES_POR_METRO` (`alPlano`). Quien quiera otra escala pone antes su `setTransform`.
 * Devuelve cuántos rectángulos ha pintado (el comprobador los cuenta: pintar la ciudad no es gratis).
 */
export function pintarLaCiudad(pincel: PincelDelMapa, noche: NocheQueSePinta, colores: ColoresDelMapa = COLORES_DEL_MAPA): number {
  const B = BORDE_DE_LA_CIUDAD;
  const P = PIXELES_POR_METRO;
  let rectangulos = 0;
  const rect = (x0: number, z0: number, x1: number, z1: number, color: string): void => {
    const a0 = Math.max(x0, -B);
    const b0 = Math.max(z0, -B);
    const a1 = Math.min(x1, B);
    const b1 = Math.min(z1, B);
    if (!(a1 > a0 && b1 > b0)) return;
    pincel.fillStyle = color;
    pincel.fillRect((a0 + B) * P, (b0 + B) * P, (a1 - a0) * P, (b1 - b0) * P);
    rectangulos++;
  };
  const caja = (c: { readonly x0: number; readonly z0: number; readonly x1: number; readonly z1: number }, color: string): void => rect(c.x0, c.z0, c.x1, c.z1, color);

  /* 1. Todo el suelo de la ciudad se anda. */
  rect(-B, -B, B, B, colores.calle);

  /* 2. Las avenidas y su mediana, de canto a canto de lo que ocupen. */
  for (const a of noche.ciudad.avenidas) {
    const m = a.ancho / 2;
    if (a.eje === 'x') {
      rect(a.desde, a.linea - m, a.hasta, a.linea + m, colores.avenida);
      rect(a.desde, a.linea - 1, a.hasta, a.linea + 1, colores.mediana);
    } else {
      rect(a.linea - m, a.desde, a.linea + m, a.hasta, colores.avenida);
      rect(a.linea - 1, a.desde, a.linea + 1, a.hasta, colores.mediana);
    }
  }

  /* 3. Las plazas: su solar entero, antes que lo que lleven encima. */
  for (const h of noche.ciudad.huecos) if (h.uso === 'plaza') caja(h.solar, colores.plaza);

  /*
   * 4. Los edificios: la huella entera en el tono del soportal (lo que vuela sobre la acera se anda por
   * debajo) y encima la caja de choque, con su filo y su tejado. Lo que no se anda es la caja, y sólo ella.
   */
  const cajasDeLaMesa = noche.ciudad.cajas;
  for (const e of noche.ciudad.edificios) {
    caja(e.huella, colores.soportal);
    const c = cajasDeLaMesa[e.caja];
    if (c === undefined) continue;
    caja(c, colores.filo[e.distrito]);
    if (c.x1 - c.x0 > 2 && c.z1 - c.z0 > 2) rect(c.x0 + 1, c.z0 + 1, c.x1 - 1, c.z1 - 1, colores.tejado[e.distrito]);
  }

  /* 5. Lo que estorba en la calle y en las plazas (los edificios ya están, los cortes van después). */
  for (const c of noche.cajas) {
    if (c.tipo === 'edificio' || c.tipo === 'corte' || !seEnsenaEnElMapa(c.tipo)) continue;
    caja(c, c.tipo === 'coche' ? colores.coche : colores.estorbo);
  }

  /* 6. Los cortes de obra, encima de todo: una franja clara por el medio, a lo largo. */
  for (const corte of noche.cortes) {
    const c: CajaDeLaCiudad | undefined = noche.cajas[corte.caja];
    if (c === undefined) continue;
    caja(c, colores.corte);
    const ancho = c.x1 - c.x0;
    const alto = c.z1 - c.z0;
    if (ancho >= alto) {
      const m = (c.z0 + c.z1) / 2;
      rect(c.x0, m - alto / 6, c.x1, m + alto / 6, colores.corteClaro);
    } else {
      const m = (c.x0 + c.x1) / 2;
      rect(m - ancho / 6, c.z0, m + ancho / 6, c.z1, colores.corteClaro);
    }
  }
  return rectangulos;
}

/**
 * LAS SALIDAS DE GLIFOS (§2.5): donde una avenida cruza el borde, sigue `SALIDA_DE_GLIFOS` metros y se
 * deshace. Fuera del lienzo (que acaba en ±270), así que va en la misma transformación que el lienzo y se
 * pinta encima, en cada refresco: son tres rectángulos. Devuelve cuántos.
 */
export function pintarLasSalidas(pincel: PincelDelMapa, noche: Pick<NocheQueSePinta, 'ciudad'>, colores: ColoresDelMapa = COLORES_DEL_MAPA): number {
  const B = BORDE_DE_LA_CIUDAD;
  const P = PIXELES_POR_METRO;
  let n = 0;
  pincel.fillStyle = colores.salida;
  for (const a of noche.ciudad.avenidas) {
    const m = a.ancho / 2 - 2;
    for (const [extremo, sentido] of [
      [a.desde, -1],
      [a.hasta, 1],
    ] as const) {
      if (Math.abs(extremo) < B) continue;
      /* Cuatro franjas que se abren hacia fuera: el alambre que se deshace. */
      for (let k = 0; k < 4; k++) {
        const d0 = extremo + sentido * (k * SALIDA_DE_GLIFOS) / 4;
        const d1 = d0 + sentido * (SALIDA_DE_GLIFOS / 4 - 1.5);
        const lo = Math.min(d0, d1);
        const hi = Math.max(d0, d1);
        const ancho = m * (1 - k * 0.2);
        if (a.eje === 'x') pincel.fillRect((lo + B) * P, (a.linea - ancho + B) * P, (hi - lo) * P, 2 * ancho * P);
        else pincel.fillRect((a.linea - ancho + B) * P, (lo + B) * P, 2 * ancho * P, (hi - lo) * P);
        n++;
      }
    }
  }
  return n;
}

/* ─── EL LIENZO DE UNA NOCHE, UNA VEZ ────────────────────────────────────── */

/** Lo que el mapa pide de un lienzo: su tamaño y su pincel. (`HTMLCanvasElement` y `OffscreenCanvas` lo cumplen.) */
export interface LienzoDelMapa {
  width: number;
  height: number;
  getContext(tipo: '2d'): unknown;
}

const LIENZOS = new WeakMap<object, LienzoDelMapa>();

/**
 * EL LIENZO DE LA CIUDAD DE ESTA NOCHE, de `LADO_DEL_LIENZO` de lado, pintado una sola vez y guardado por
 * la identidad de la noche (la despejada es otra noche: otro objeto). `crear` hace el lienzo vacío; `null`
 * si no se puede pintar (un lienzo sin 2D).
 */
export function lienzoDeLaNoche(noche: NocheQueSePinta, crear: (lado: number) => LienzoDelMapa | null): LienzoDelMapa | null {
  const hecho = LIENZOS.get(noche);
  if (hecho !== undefined) return hecho;
  const lienzo = crear(LADO_DEL_LIENZO);
  if (lienzo === null) return null;
  lienzo.width = LADO_DEL_LIENZO;
  lienzo.height = LADO_DEL_LIENZO;
  const pincel = lienzo.getContext('2d') as PincelDelMapa | null;
  if (pincel === null) return null;
  pintarLaCiudad(pincel, noche);
  LIENZOS.set(noche, lienzo);
  return lienzo;
}

/* ─── DEL LIENZO AL MINIMAPA ─────────────────────────────────────────────── */

/** Una transformación afín como la de `setTransform(a, b, c, d, e, f)`: `X = a·u + c·v + e`, `Y = b·u + d·v + f`. */
export type Afin = readonly [number, number, number, number, number, number];

export function aplicar(m: Afin, u: number, v: number): PuntoDelMapa {
  return { u: m[0] * u + m[2] * v + m[4], v: m[1] * u + m[3] * v + m[5] };
}

/**
 * DEL LIENZO DE LA CIUDAD AL MINIMAPA: la transformación que lleva el píxel `(u, v)` del lienzo al pt
 * `(X, Y)` de un minimapa de `lado` pt, con el propio en el centro y la mirada `giro` hacia arriba, a
 * `radioM` metros del centro al canto. Es `alMinimapa` escrito como matriz: el comprobador exige que den
 * lo mismo.
 */
export function transformacionDelMinimapa(yo: { readonly x: number; readonly z: number }, giro: number, lado: number, radioM: number): Afin {
  const k = lado / 2 / (radioM * PIXELES_POR_METRO);
  const c = Math.cos(giro);
  const s = Math.sin(giro);
  const ox = (BORDE_DE_LA_CIUDAD + yo.x) * PIXELES_POR_METRO;
  const oz = (BORDE_DE_LA_CIUDAD + yo.z) * PIXELES_POR_METRO;
  return [k * c, -k * s, k * s, k * c, lado / 2 - k * (c * ox + s * oz), lado / 2 - k * (-s * ox + c * oz)];
}

/** Dónde cae una marca en el minimapa, en pt desde su esquina, y si se ha llevado al canto porque no cabía. */
export interface SitioEnElMinimapa {
  readonly u: number;
  readonly v: number;
  readonly enElBorde: boolean;
  /** Hacia dónde queda, en radianes desde arriba y hacia la derecha: para la flecha del canto. */
  readonly angulo: number;
}

/**
 * DÓNDE VA UNA MARCA en un minimapa de `lado` pt: con `alMinimapa`, y si queda más lejos que el canto
 * (menos `margen`), en el canto y en su dirección.
 */
export function sitioEnElMinimapa(
  x: number,
  z: number,
  yo: { readonly x: number; readonly z: number },
  giro: number,
  lado: number,
  radioM: number,
  margen: number = MARGEN_DEL_BORDE_PT,
): SitioEnElMinimapa {
  const k = lado / 2 / (radioM * PIXELES_POR_METRO);
  const p = alMinimapa(x - yo.x, z - yo.z, giro);
  let u = p.u * k;
  let v = p.v * k;
  const lejos = Math.hypot(u, v);
  const canto = lado / 2 - margen;
  const enElBorde = lejos > canto;
  if (enElBorde) {
    u *= canto / lejos;
    v *= canto / lejos;
  }
  return { u: lado / 2 + u, v: lado / 2 + v, enElBorde, angulo: Math.atan2(u, -v) };
}

/**
 * LO QUE FALTA GIRAR CON CSS el lienzo del minimapa, pintado con la mirada `giroPintado`, para que valga con
 * la mirada de ahora `giro`: el ángulo de `transform: rotate()` (radianes). Entre dos refrescos es lo único
 * que se escribe, a cada fotograma.
 */
export function giroQueFalta(giroPintado: number, giro: number): number {
  return giroPintado - giro;
}

/** Un punto `(u, v)` desde el centro, girado como lo gira `transform: rotate(angulo)` de CSS (la `v` hacia abajo). */
export function giradoComoCss(u: number, v: number, angulo: number): PuntoDelMapa {
  const c = Math.cos(angulo);
  const s = Math.sin(angulo);
  return { u: u * c - v * s, v: u * s + v * c };
}

/* ─── EL PLANO ───────────────────────────────────────────────────────────── */

/** Lo que el plano sabe de dónde se tocó: la caja del lienzo en pantalla (la de `getBoundingClientRect`). */
export interface CajaDelToque {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Del toque en pantalla al píxel del lienzo de la ciudad. La caja es la del plano, que enseña
 * `MARGEN_DEL_PLANO_M` de más por cada lado: su esquina es el píxel `(−margen, −margen)` del lienzo.
 * `null` si la caja no mide nada.
 */
export function puntoDelToque(clientX: number, clientY: number, caja: CajaDelToque): PuntoDelMapa | null {
  if (!(caja.width > 0 && caja.height > 0) || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  const m = MARGEN_DEL_PLANO_M * PIXELES_POR_METRO;
  return { u: ((clientX - caja.left) / caja.width) * LIENZO_DEL_PLANO - m, v: ((clientY - caja.top) / caja.height) * LIENZO_DEL_PLANO - m };
}

/** Los pt CSS por píxel de lienzo en un plano de `lado` pt. */
export function escalaDelPlano(lado: number): number {
  return lado / LIENZO_DEL_PLANO;
}

/** Del mundo al plano de `lado` pt (norte arriba, con su margen): la cuenta inversa de `puntoDelToque`. */
export function alPlanoEnPantalla(x: number, z: number, lado: number): PuntoDelMapa {
  const k = escalaDelPlano(lado);
  const m = MARGEN_DEL_PLANO_M * PIXELES_POR_METRO;
  return { u: ((x + BORDE_DE_LA_CIUDAD) * PIXELES_POR_METRO + m) * k, v: ((z + BORDE_DE_LA_CIUDAD) * PIXELES_POR_METRO + m) * k };
}

/** Lo que hace un toque en el plano. */
export type ToqueDelPlano =
  | { readonly tipo: 'rumbo'; readonly objetivo: ObjetivoDelRumbo }
  | { readonly tipo: 'soltar' }
  | { readonly tipo: 'aqui'; readonly nudo: number; readonly x: number; readonly z: number };

/** En qué orden se prefiere una marca a otra a igual distancia del dedo. */
const PREFERENCIA: Readonly<Record<string, number>> = { fallo: 0, cabina: 1, arca: 2, refugio: 3 };

/**
 * QUÉ HACE UN TOQUE en el píxel `(u, v)` del lienzo, con un dedo de `radioLienzo` píxeles de lienzo:
 *   · a esa distancia o menos de una marca con objetivo (Fallo, cabina, arca, refugio), el rumbo a la más
 *     cercana (a igual, por ese orden y luego la primera de la lista); si ya era el del rumbo, soltarlo;
 *   · si no, «Aquí» sobre el nudo más cercano del grafo de la noche;
 *   · fuera del lienzo, o sin grafo, nada (`null`).
 */
export function queHaceElToque(
  noche: Pick<NocheDeLaCiudad, 'grafo'>,
  marcas: readonly MarcaDelMapa[],
  rumbo: Pick<RumboTendido, 'objetivo'> | null,
  u: number,
  v: number,
  radioLienzo: number,
): ToqueDelPlano | null {
  if (!(u >= 0 && u <= LADO_DEL_LIENZO && v >= 0 && v <= LADO_DEL_LIENZO)) return null;
  const p = delPlano(u, v);
  const radio = radioLienzo / PIXELES_POR_METRO;
  const alcance = radio * radio;
  let mejor: ObjetivoDelRumbo | null = null;
  let mejorD = 0;
  let mejorP = 0;
  for (const m of marcas) {
    const objetivo = objetivoDeLaMarca(m);
    if (objetivo === null) continue;
    const d = (m.x - p.x) * (m.x - p.x) + (m.z - p.z) * (m.z - p.z);
    if (!(d <= alcance)) continue;
    const pref = PREFERENCIA[m.clase] ?? 9;
    if (mejor === null || d < mejorD || (d === mejorD && pref < mejorP)) {
      mejor = objetivo;
      mejorD = d;
      mejorP = pref;
    }
  }
  if (mejor !== null) return rumbo !== null && mismoObjetivo(rumbo.objetivo, mejor) ? { tipo: 'soltar' } : { tipo: 'rumbo', objetivo: mejor };
  const nudo = nudoMasCercano(noche.grafo, p.x, p.z);
  if (nudo < 0) return null;
  const n = noche.grafo.nudos[nudo] as { readonly x: number; readonly z: number };
  return { tipo: 'aqui', nudo, x: n.x, z: n.z };
}

/** Lo que el plano lee de un `pointerdown` (un `PointerEvent` de React o del DOM lo cumple). */
export interface EventoDeToque {
  readonly clientX: number;
  readonly clientY: number;
  readonly button: number;
  readonly pointerType: string;
  preventDefault(): void;
  stopPropagation(): void;
}

/**
 * UN `pointerdown` EN EL PLANO, entero: sólo el botón principal del ratón (un dedo o un lápiz, siempre),
 * el toque no sigue hacia los mandos de debajo, se decide con `queHaceElToque` y se manda por
 * `ordenes`. Devuelve lo que hizo, o `null`. El plano lo llama con el evento y la caja de su lienzo.
 */
export function tocarElPlano(e: EventoDeToque, caja: CajaDelToque, fuente: Pick<FuenteDelMapa, 'noche' | 'marcas' | 'rumbo'>, ordenes: OrdenesDelMapa): ToqueDelPlano | null {
  if (e.pointerType === 'mouse' && e.button !== 0) return null;
  e.preventDefault();
  e.stopPropagation();
  const noche = fuente.noche();
  if (noche === null) return null;
  const punto = puntoDelToque(e.clientX, e.clientY, caja);
  if (punto === null) return null;
  const toque = queHaceElToque(noche, fuente.marcas(), fuente.rumbo(), punto.u, punto.v, (RADIO_DEL_TOQUE_PT * LIENZO_DEL_PLANO) / caja.width);
  if (toque === null) return null;
  if (toque.tipo === 'aqui') ordenes.aqui(toque.nudo);
  else if (toque.tipo === 'rumbo') ordenes.tenderElRumbo(toque.objetivo);
  else ordenes.soltarElRumbo();
  return toque;
}

/** ¿Es la tecla del plano? La M suelta, sin repetir, sin modificadores y no escribiendo en un campo. */
export function esLaTeclaDelPlano(e: {
  readonly code: string;
  readonly repeat: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly target: unknown;
}, tecla: string): boolean {
  if (e.code !== tecla || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return false;
  const t = e.target as { readonly tagName?: unknown; readonly isContentEditable?: unknown } | null;
  if (t !== null && typeof t === 'object') {
    if (t.isContentEditable === true) return false;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return false;
  }
  return true;
}

/** El lado del plano en pt para un hueco de `ancho` × `alto` (sin márgenes), con la columna de al lado si cabe. */
export function ladoDelPlano(ancho: number, alto: number, columna: number): number {
  if (!(ancho > 0 && alto > 0)) return 0;
  const tumbado = ancho >= alto;
  const lado = tumbado ? Math.min(alto, ancho - columna) : Math.min(ancho, alto - columna);
  return Math.max(0, Math.floor(Math.min(lado, LADO_MAXIMO_DEL_PLANO_PT)));
}
