/**
 * LAS ARMAS DE RIBERAS A PIE: los materiales que sólo se encuentran andando, las recetas y lo que
 * hace cada arma en la refriega. Sólo existen en mesas `botas` (`docs/AVATARES-JUGABLES.md` §4).
 *
 * ═══ POR QUÉ AQUÍ Y NO DENTRO DE `riberas.ts` ═══
 *
 * Porque lo leen tres sitios que no deben importar el reductor entero: el reductor (para forjar), el
 * servidor de la sala (para saber cuánto daña y hasta dónde llega un golpe) y los dos clientes (para
 * pintar la forja). Es una tabla pura: ni estado, ni azar, ni red.
 *
 * ═══ NÚMEROS ═══
 *
 * El alcance va en unidades del mundo y el cono como el CUADRADO del coseno de su medio ángulo,
 * que es como lo compara el servidor sin raíces (`COSENO_CUADRADO_DEL_CONO` del canal). Los puños
 * son exactamente la refriega de antes: 1 de daño, 2,5 de alcance y 45°.
 */
import { ALCANCE_DEL_GOLPE, COSENO_CUADRADO_DEL_CONO } from '../../mecanicas/canal-de-botas';

/**
 * EL MOVIMIENTO DE FORJAR: `{ tipo: FORJAR, carga: { arma } }`, del colono que forja. Se ofrece
 * (`opcionesDeRiberas`) a quien juega la partida y le alcanzan las alforjas, sea o no su turno.
 */
export const FORJAR = 'riberas:forjar';

/** Los materiales, en el orden en que se pintan. Ninguno existe en Riberas normal. */
export const MATERIALES = ['hierro', 'pedernal', 'cuero', 'junco'] as const;
export type Material = (typeof MATERIALES)[number];

/** Cómo se dicen en pantalla. */
export const NOMBRE_DEL_MATERIAL: Readonly<Record<Material, string>> = {
  hierro: 'Hierro',
  pedernal: 'Pedernal',
  cuero: 'Cuero',
  junco: 'Junco',
};

/** Lo que lleva un colono en las alforjas: cuántos de cada material. */
export type Alforjas = Readonly<Record<Material, number>>;

/** Unas alforjas vacías. */
export const ALFORJAS_VACIAS: Alforjas = { hierro: 0, pedernal: 0, cuero: 0, junco: 0 };

/** Las armas que se forjan. Los puños no son un arma: son no llevar ninguna. */
export const ARMAS = ['honda', 'lanza', 'hacha', 'maza'] as const;
export type Arma = (typeof ARMAS)[number];

/** Lo que hace un golpe en la refriega: lo que lee el servidor. */
export interface ArmaEnLaRefriega {
  /** Cuántas vidas quita un golpe que da. */
  readonly dano: number;
  /** Hasta dónde llega, en unidades del mundo. */
  readonly alcance: number;
  /** El cuadrado del coseno del medio cono: cuanto más alto, más estrecho. */
  readonly cosenoCuadrado: number;
}

/** Sin arma: la refriega de siempre. */
export const PUNOS: ArmaEnLaRefriega = { dano: 1, alcance: ALCANCE_DEL_GOLPE, cosenoCuadrado: COSENO_CUADRADO_DEL_CONO };

/** El cuadrado del coseno de un ángulo en grados, redondeado a cuatro cifras: la tabla es literal. */
const COS2_20 = 0.883; // cos²(20°)
const COS2_30 = 0.75; // cos²(30°)
const COS2_60 = 0.25; // cos²(60°)

export interface FichaDelArma {
  readonly nombre: string;
  /** Qué se gasta al forjarla. */
  readonly receta: Readonly<Partial<Record<Material, number>>>;
  readonly refriega: ArmaEnLaRefriega;
  /** Una línea para la forja: qué la hace distinta. */
  readonly ayuda: string;
}

export const FICHA_DEL_ARMA: Readonly<Record<Arma, FichaDelArma>> = {
  honda: {
    nombre: 'Honda',
    receta: { cuero: 2, pedernal: 1 },
    refriega: { dano: 1, alcance: 6, cosenoCuadrado: COS2_20 },
    ayuda: 'Llega lejos, pero hay que apuntar bien.',
  },
  lanza: {
    nombre: 'Lanza',
    receta: { junco: 2, hierro: 1 },
    refriega: { dano: 1, alcance: 4, cosenoCuadrado: COS2_30 },
    ayuda: 'Mantiene a raya a quien se acerca.',
  },
  hacha: {
    nombre: 'Hacha',
    receta: { hierro: 2, cuero: 1 },
    refriega: { dano: 2, alcance: ALCANCE_DEL_GOLPE, cosenoCuadrado: COSENO_CUADRADO_DEL_CONO },
    ayuda: 'Dos golpes tumban a cualquiera.',
  },
  maza: {
    nombre: 'Maza',
    receta: { pedernal: 2, junco: 1 },
    refriega: { dano: 2, alcance: 2, cosenoCuadrado: COS2_60 },
    ayuda: 'Muy corta, pero barre todo lo que tiene delante.',
  },
};

/** ¿Es un arma de la tabla? Para leer cargas con desconfianza. */
export function esArma(v: unknown): v is Arma {
  return typeof v === 'string' && (ARMAS as readonly string[]).includes(v);
}

/** ¿Es un material de la tabla? */
export function esMaterial(v: unknown): v is Material {
  return typeof v === 'string' && (MATERIALES as readonly string[]).includes(v);
}

/** ¿Alcanzan estas alforjas para forjar esta arma? */
export function alcanzaParaForjar(alforjas: Alforjas, arma: Arma): boolean {
  const receta = FICHA_DEL_ARMA[arma].receta;
  for (const m of MATERIALES) if ((receta[m] ?? 0) > alforjas[m]) return false;
  return true;
}

/** Las alforjas después de forjar. Quien llama ya ha comprobado que alcanzan. */
export function gastarLaReceta(alforjas: Alforjas, arma: Arma): Alforjas {
  const receta = FICHA_DEL_ARMA[arma].receta;
  return {
    hierro: alforjas.hierro - (receta.hierro ?? 0),
    pedernal: alforjas.pedernal - (receta.pedernal ?? 0),
    cuero: alforjas.cuero - (receta.cuero ?? 0),
    junco: alforjas.junco - (receta.junco ?? 0),
  };
}

/** Lo que hace en la refriega quien lleva `arma` (o nada). */
export function refriegaDelArma(arma: Arma | null | undefined): ArmaEnLaRefriega {
  return arma === null || arma === undefined ? PUNOS : FICHA_DEL_ARMA[arma].refriega;
}

/**
 * EL ARMA DE UN ASIENTO, LEÍDA DE LA VISTA PÚBLICA de una mesa de Riberas.
 *
 * El reductor publica `armas` en la vista (opcional: sólo aparece con la primera forja) como
 * `{ [asiento]: Arma }`. Esto es lo que usa el servidor de la sala, que sólo tiene la vista de quien
 * mira sin asiento: por eso las armas son PÚBLICAS —en la refriega se ve con qué va cada uno—.
 * Cualquier cosa rara es no llevar arma.
 */
export function armaDeLaVista(vista: unknown, asiento: string): Arma | null {
  if (typeof vista !== 'object' || vista === null) return null;
  const armas = (vista as { readonly armas?: unknown }).armas;
  if (typeof armas !== 'object' || armas === null || Array.isArray(armas)) return null;
  if (!Object.prototype.hasOwnProperty.call(armas, asiento)) return null;
  const a = (armas as Record<string, unknown>)[asiento];
  return esArma(a) ? a : null;
}

/** Las alforjas de un asiento, leídas de la vista pública (`alforjas`, opcional). Vacías si no hay. */
export function alforjasDeLaVista(vista: unknown, asiento: string): Alforjas {
  if (typeof vista !== 'object' || vista === null) return ALFORJAS_VACIAS;
  const todas = (vista as { readonly alforjas?: unknown }).alforjas;
  if (typeof todas !== 'object' || todas === null || Array.isArray(todas)) return ALFORJAS_VACIAS;
  if (!Object.prototype.hasOwnProperty.call(todas, asiento)) return ALFORJAS_VACIAS;
  const a = (todas as Record<string, unknown>)[asiento];
  if (typeof a !== 'object' || a === null) return ALFORJAS_VACIAS;
  const leer = (m: Material): number => {
    const n = (a as Record<string, unknown>)[m];
    return typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : 0;
  };
  return { hierro: leer('hierro'), pedernal: leer('pedernal'), cuero: leer('cuero'), junco: leer('junco') };
}
