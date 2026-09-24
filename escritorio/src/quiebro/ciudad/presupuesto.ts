/**
 * EL PRESUPUESTO DE LA CIUDAD POR NIVEL: lo que cada pieza puede costar, y la suma contra el tope del
 * juego. Puro: sin `three`, para que el comprobador lo sume en Node con los mismos números que el
 * banco enseña.
 *
 * ═══ DE DÓNDE SALEN LOS TOPES ═══
 *
 * Los del juego entero son los provisionales del diseño (§8): N0 150.000 triángulos y 60 llamadas,
 * N1 250.000 / 90, N2 600.000 / 150, N3 1.500.000 / 250, hasta que el banco en aparato real diga
 * otra cosa. La ciudad y su atmósfera se quedan con el 60 % (`CUOTA_DE_LA_CIUDAD`): el resto es de
 * los personajes, los efectos, el posproceso y el HUD, que no son de este frente.
 *
 * ═══ CADA PIEZA DECLARA SU RENGLÓN ═══
 *
 * `RENGLONES_DECLARADOS` dice lo que cada pieza puede gastar en cada nivel. La ciudad construida
 * MIDE lo que gasta (triángulos de su geometría × instancias, una llamada por malla con algo que
 * pintar) y el comprobador exige, para cada semilla, que lo medido quepa en lo declarado y que lo
 * declarado quepa en la cuota. Así una pieza que crece (un coche con más detalle, un barrio con más
 * farolas) no se come en silencio lo de otra: salta su renglón.
 *
 * Las sombras (N2+) pintan otra vez lo que las proyecta: una llamada más y sus triángulos otra vez
 * por cada malla con `sombra`. `gl.info.render` también las cuenta, y el banco lo enseña.
 */
import type { NivelDeLaCiudad } from './tipos';
import { DETALLE_DEL_NIVEL, NIVELES_DE_LA_CIUDAD } from './tipos';

export interface RenglonDeLaCiudad {
  readonly nombre: string;
  readonly llamadas: number;
  readonly triangulos: number;
  /** Si proyecta sombra (en N2+ se pinta otra vez en el mapa de sombras). */
  readonly sombra: boolean;
}

export interface Coste {
  readonly triangulos: number;
  readonly llamadas: number;
}

/** Los topes provisionales del JUEGO entero (diseño §8). */
export const TOPES_DEL_JUEGO: Readonly<Record<NivelDeLaCiudad, Coste>> = {
  0: { triangulos: 150_000, llamadas: 60 },
  1: { triangulos: 250_000, llamadas: 90 },
  2: { triangulos: 600_000, llamadas: 150 },
  3: { triangulos: 1_500_000, llamadas: 250 },
};

/** Lo que se lleva la ciudad (con su atmósfera) de cada tope. */
export const CUOTA_DE_LA_CIUDAD = 0.6;

/** Lo que la ciudad puede gastar en un nivel: la cuota del tope. */
export function topeDeLaCiudad(nivel: NivelDeLaCiudad): Coste {
  const t = TOPES_DEL_JUEGO[nivel];
  return { triangulos: Math.floor(t.triangulos * CUOTA_DE_LA_CIUDAD), llamadas: Math.floor(t.llamadas * CUOTA_DE_LA_CIUDAD) };
}

type PorNivel = Readonly<Record<NivelDeLaCiudad, Coste>>;

function igual(c: Coste): PorNivel {
  return { 0: c, 1: c, 2: c, 3: c };
}

/**
 * LO QUE CADA PIEZA PUEDE GASTAR. Los números son el peor barrio de 200 (código y noche distintos)
 * medido el 24-sep con la ciudad de ese día, más un 10-20 % y redondeado: si una pieza lo pasa, o ha
 * crecido la pieza o el barrio, y las dos cosas hay que mirarlas. Peores medidos, N0/N1/N2/N3:
 * fachadas 3.286 / 35.246 / 45.518 / 45.518 (los balcones de N1 son casi todo), mobiliario y coches
 * 20.516 / 37.576 / 43.152 / 48.728, tarjetas 480 / 680 / 1.000 / 1.094; el resto no cambia con el
 * barrio o apenas (ver el comprobador).
 */
export const RENGLONES_DECLARADOS: Readonly<Record<string, PorNivel>> = {
  fachadas: {
    0: { triangulos: 4_000, llamadas: 1 },
    1: { triangulos: 42_000, llamadas: 1 },
    2: { triangulos: 54_000, llamadas: 1 },
    3: { triangulos: 54_000, llamadas: 1 },
  },
  asfalto: igual({ triangulos: 500, llamadas: 1 }),
  aceras: igual({ triangulos: 1_200, llamadas: 1 }),
  'mobiliario y coches': {
    0: { triangulos: 24_000, llamadas: 1 },
    1: { triangulos: 44_000, llamadas: 1 },
    2: { triangulos: 50_000, llamadas: 1 },
    3: { triangulos: 56_000, llamadas: 1 },
  },
  'luces del mobiliario': igual({ triangulos: 2_600, llamadas: 1 }),
  /*
   * Toldos, aparatos de aire y banderolas en todos; escaleras de incendios y cables desde N1. Peor de
   * 4.000 noches (400 códigos × 10), medido el 24-sep: 2.296 en N0 y 13.672 en N1-N3, más un 15-30 %.
   * Lo decide el barrio con más fachadas de ladrillo altas (las escaleras de incendios son casi todo).
   */
  voladizos: {
    0: { triangulos: 3_000, llamadas: 1 },
    1: { triangulos: 16_000, llamadas: 1 },
    2: { triangulos: 16_000, llamadas: 1 },
    3: { triangulos: 16_000, llamadas: 1 },
  },
  cristal: igual({ triangulos: 600, llamadas: 1 }),
  'rótulos de neón': igual({ triangulos: 160, llamadas: 1 }),
  horizonte: igual({ triangulos: 128, llamadas: 1 }),
  /* Diez triángulos por caja lejana (`CAJAS_LEJANAS` de `anillo.ts`): 600 / 1.200 / 2.000 / 3.000. */
  'ciudad lejana': {
    0: { triangulos: 6_000, llamadas: 1 },
    1: { triangulos: 12_000, llamadas: 1 },
    2: { triangulos: 20_000, llamadas: 1 },
    3: { triangulos: 30_000, llamadas: 1 },
  },
  'tarjetas de reflejo': {
    0: { triangulos: 600, llamadas: 1 },
    1: { triangulos: 820, llamadas: 1 },
    2: { triangulos: 1_200, llamadas: 1 },
    3: { triangulos: 1_300, llamadas: 1 },
  },
  halos: igual({ triangulos: 460, llamadas: 1 }),
  'tren · coches': igual({ triangulos: 140, llamadas: 1 }),
  'tren · ventanas': igual({ triangulos: 100, llamadas: 1 }),
  vapor: {
    0: { triangulos: 24, llamadas: 1 },
    1: { triangulos: 48, llamadas: 1 },
    2: { triangulos: 72, llamadas: 1 },
    3: { triangulos: 96, llamadas: 1 },
  },
  /* Los de fuera: 44 triángulos por coche en marcha, 8 de faros, uno de halo y otro de reflejo por par. */
  'tráfico · carrocerías': {
    0: { triangulos: 4 * 48, llamadas: 1 },
    1: { triangulos: 8 * 48, llamadas: 1 },
    2: { triangulos: 16 * 48, llamadas: 1 },
    3: { triangulos: 30 * 48, llamadas: 1 },
  },
  'tráfico · faros': {
    0: { triangulos: 4 * 8, llamadas: 1 },
    1: { triangulos: 8 * 8, llamadas: 1 },
    2: { triangulos: 16 * 8, llamadas: 1 },
    3: { triangulos: 30 * 8, llamadas: 1 },
  },
  'tráfico · halos de los faros': {
    0: { triangulos: 4 * 4, llamadas: 1 },
    1: { triangulos: 8 * 4, llamadas: 1 },
    2: { triangulos: 16 * 4, llamadas: 1 },
    3: { triangulos: 30 * 4, llamadas: 1 },
  },
  'tráfico · reflejos de los faros': {
    0: { triangulos: 4 * 4, llamadas: 1 },
    1: { triangulos: 8 * 4, llamadas: 1 },
    2: { triangulos: 16 * 4, llamadas: 1 },
    3: { triangulos: 30 * 4, llamadas: 1 },
  },
  'haces de luz': {
    0: { triangulos: 0, llamadas: 0 },
    1: { triangulos: 0, llamadas: 0 },
    2: { triangulos: 90 * 32, llamadas: 1 },
    3: { triangulos: 90 * 32, llamadas: 1 },
  },
};

/** Los renglones de la atmósfera (cielo, lluvia, salpicaduras), que salen de sus números. */
export function renglonesDeLaAtmosfera(nivel: NivelDeLaCiudad): RenglonDeLaCiudad[] {
  const d = DETALLE_DEL_NIVEL[nivel];
  const renglones: RenglonDeLaCiudad[] = [
    /* Una `SphereGeometry(900, 32, 16)`: los dos casquetes son abanicos. */
    { nombre: 'cielo', llamadas: 1, triangulos: 32 * 2 + (16 - 2) * 32 * 2, sombra: false },
    { nombre: 'lluvia', llamadas: 1, triangulos: d.lluvia * 2, sombra: false },
  ];
  if (d.salpicaduras > 0) renglones.push({ nombre: 'salpicaduras', llamadas: 1, triangulos: d.salpicaduras * 2, sombra: false });
  return renglones;
}

export const RENGLONES_DECLARADOS_DE_LA_ATMOSFERA: Readonly<Record<string, PorNivel>> = Object.fromEntries(
  ['cielo', 'lluvia', 'salpicaduras'].map((nombre) => [
    nombre,
    Object.fromEntries(
      NIVELES_DE_LA_CIUDAD.map((n) => {
        const r = renglonesDeLaAtmosfera(n).find((x) => x.nombre === nombre);
        return [n, { triangulos: r?.triangulos ?? 0, llamadas: r?.llamadas ?? 0 }];
      }),
    ) as unknown as PorNivel,
  ]),
);

export interface PresupuestoSumado {
  readonly triangulos: number;
  readonly llamadas: number;
  /** De ellos, los de pintar las sombras. */
  readonly deSombra: Coste;
  readonly tope: Coste;
  readonly cabe: boolean;
  /** Las piezas que se pasan de su renglón (o que no lo tienen). */
  readonly excesos: readonly string[];
}

/** La suma de una ciudad construida (más su atmósfera) contra su cuota y sus renglones. */
export function presupuestoDeLaCiudad(renglones: readonly RenglonDeLaCiudad[], nivel: NivelDeLaCiudad): PresupuestoSumado {
  const todos = [...renglones, ...renglonesDeLaAtmosfera(nivel)];
  const conSombras = DETALLE_DEL_NIVEL[nivel].sombras > 0;
  let triangulos = 0;
  let llamadas = 0;
  let sombraT = 0;
  let sombraL = 0;
  const excesos: string[] = [];
  for (const r of todos) {
    triangulos += r.triangulos;
    llamadas += r.llamadas;
    if (conSombras && r.sombra) {
      sombraT += r.triangulos;
      sombraL += r.llamadas;
    }
    const declarado = (RENGLONES_DECLARADOS[r.nombre] ?? RENGLONES_DECLARADOS_DE_LA_ATMOSFERA[r.nombre])?.[nivel];
    if (declarado === undefined) excesos.push(`${r.nombre}: sin renglón declarado`);
    else if (r.triangulos > declarado.triangulos || r.llamadas > declarado.llamadas) {
      excesos.push(`${r.nombre}: ${String(r.triangulos)} tri / ${String(r.llamadas)} llamadas > ${String(declarado.triangulos)} / ${String(declarado.llamadas)}`);
    }
  }
  triangulos += sombraT;
  llamadas += sombraL;
  const tope = topeDeLaCiudad(nivel);
  return {
    triangulos,
    llamadas,
    deSombra: { triangulos: sombraT, llamadas: sombraL },
    tope,
    cabe: triangulos <= tope.triangulos && llamadas <= tope.llamadas && excesos.length === 0,
    excesos,
  };
}

/** Lo que suman los renglones DECLARADOS de un nivel (sin sombras): lo que el diseño reserva. */
export function sumaDeLoDeclarado(nivel: NivelDeLaCiudad): Coste {
  let triangulos = 0;
  let llamadas = 0;
  for (const tabla of [RENGLONES_DECLARADOS, RENGLONES_DECLARADOS_DE_LA_ATMOSFERA]) {
    for (const porNivel of Object.values(tabla)) {
      triangulos += porNivel[nivel].triangulos;
      llamadas += porNivel[nivel].llamadas;
    }
  }
  return { triangulos, llamadas };
}
