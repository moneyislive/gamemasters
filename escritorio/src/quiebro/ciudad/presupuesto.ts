/**
 * EL PRESUPUESTO DE LA CIUDAD POR NIVEL: lo que cada pieza puede costar, y la suma contra el tope del
 * juego. Puro: sin `three`, para que el comprobador lo sume en Node con los mismos números que el
 * banco enseña.
 *
 * ═══ DE DÓNDE SALEN LOS TOPES ═══
 *
 * Los del juego entero son los provisionales del diseño (§8): N0 150.000 triángulos y 60 llamadas,
 * N1 250.000 / 90, N2 600.000 / 150, N3 1.500.000 / 250, hasta que el banco en aparato real diga
 * otra cosa. La ciudad y su atmósfera se quedan con el 50 % (`CUOTA_DE_LA_CIUDAD`; el 60 % hasta la
 * ciudad abierta, §5.7 de `docs/quiebro/CIUDAD-ABIERTA.md`, que la baja para dejar sitio a los personajes
 * de calidad): el resto es de los personajes, los efectos, el posproceso y el HUD, que no son de este
 * frente.
 *
 * ═══ DOS LIBROS: EL BARRIO Y LA CIUDAD ABIERTA ═══
 *
 * El barrio de hoy (`construir.ts`) y la ciudad abierta (`abierta.ts`) tienen piezas distintas, y cada una
 * su libro de renglones: `RENGLONES_DECLARADOS` y `RENGLONES_DE_LA_CIUDAD_ABIERTA`. Los dos caben en la
 * misma cuota. El barrio se va cuando el juego monte la ciudad (ola B); su libro, con él.
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
 *
 * ═══ LA RESERVA PROVISIONAL DEL DETALLE (§7.2 y §7.6 del plan del detalle de la ciudad) ═══
 *
 * Mientras las familias ganan detalle (olas 2 y 3), cada renglón de la ciudad abierta se queda en lo que el plan
 * les da (lo medido hoy más lo que suman todos los paquetes que lo tocan, más un 15 %), y los renglones de las
 * capas nuevas ya están declarados: así nadie tiene que tocar este fichero para crecer, y el que se pase de su
 * renglón PARA y lo dice. La única excepción es N2 fachadas: 80.000 y no 71.000, porque O3-SILUETA baja primero
 * los balcones y después sube las cornisas. En el barrio viejo sólo sube el mobiliario de N2 y N3 (sus piezas en
 * grado 2, `gradoDelBarrio`). El cierre (O4-CIERRE) lo baja todo a lo medido más un 15 %.
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
export const CUOTA_DE_LA_CIUDAD = 0.5;

/** Lo que la ciudad puede gastar en un nivel: la cuota del tope. */
export function topeDeLaCiudad(nivel: NivelDeLaCiudad): Coste {
  const t = TOPES_DEL_JUEGO[nivel];
  return { triangulos: Math.floor(t.triangulos * CUOTA_DE_LA_CIUDAD), llamadas: Math.floor(t.llamadas * CUOTA_DE_LA_CIUDAD) };
}

export type PorNivel = Readonly<Record<NivelDeLaCiudad, Coste>>;

function igual(c: Coste): PorNivel {
  return { 0: c, 1: c, 2: c, 3: c };
}

/**
 * LO QUE CADA PIEZA PUEDE GASTAR. Los números son el peor barrio de 200 (código y noche distintos)
 * medido el 24-sep con la ciudad de ese día, más un 10-20 % y redondeado: si una pieza lo pasa, o ha
 * crecido la pieza o el barrio, y las dos cosas hay que mirarlas. Peores medidos, N0/N1/N2/N3:
 * fachadas 3.286 / 35.246 / 45.518 / 45.518 (los balcones de N1 son casi todo), mobiliario y coches
 * 20.516 / 37.576 / 43.152 / 48.728, tarjetas 480 / 680 / 1.000 / 1.094; el resto no cambia con el
 * barrio o apenas (ver el comprobador). Con la cuota al 50 %, las fachadas y el mobiliario de N1 se
 * quedan con un 12 % sobre lo medido (antes, un 20 %): lo declarado de N1 tiene que caber en 125.000.
 */
export const RENGLONES_DECLARADOS: Readonly<Record<string, PorNivel>> = {
  fachadas: {
    0: { triangulos: 4_000, llamadas: 1 },
    1: { triangulos: 39_500, llamadas: 1 },
    2: { triangulos: 54_000, llamadas: 1 },
    3: { triangulos: 54_000, llamadas: 1 },
  },
  asfalto: igual({ triangulos: 500, llamadas: 1 }),
  aceras: igual({ triangulos: 1_200, llamadas: 1 }),
  /* Reserva provisional (ver la cabecera): N2 y N3 suben de 50.000 / 56.000 por las piezas en grado 2. */
  'mobiliario y coches': {
    0: { triangulos: 24_000, llamadas: 1 },
    1: { triangulos: 42_000, llamadas: 1 },
    2: { triangulos: 60_000, llamadas: 1 },
    3: { triangulos: 66_000, llamadas: 1 },
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

/**
 * EL LIBRO DE LA CIUDAD ABIERTA. La ventana lleva lo de sus celdas y cambia al andar: su renglón es el PEOR
 * de todas las ventanas de las 32 trazas (lo recorre `verify:quiebro-ciudad` celda a celda), más un 15 %.
 * Lo lejano, el suelo y el borde son de toda la ciudad y no cambian al andar. Lo instanciado (tarjetas,
 * halos, vapor, haces) sigue a la ventana. Los números los mide el comprobador y los enseña; si uno se
 * pasa, o ha crecido la pieza o la ciudad.
 */
export const RENGLONES_DE_LA_CIUDAD_ABIERTA: Readonly<Record<string, PorNivel>> = {
  /*
   * Peores medidos el 24-sep en las 3.200 ventanas (32 trazas de la columna × 25 cámaras × 4 niveles),
   * N0/N1/N2/N3: fachadas 790 / 9.270 / 76.454 / 107.346 (en N1, relieve sólo en la celda del centro),
   * mobiliario 15.038 / 37.850 / 62.424 / 105.218, emisivo 1.202 / 1.202 / 1.940 / 2.982, cristal
   * 340 / 340 / 538 / 768, neones 2.190 / 2.190 / 3.616 / 5.692, lejos 11.952, tarjetas 528 / 722 / 1.768 /
   * 3.256, halos 306 / 306 / 536 / 818, haces — / — / 3.840 / 5.920.
   *
   * Lo declarado es la RESERVA PROVISIONAL del detalle (ver la cabecera; §7.1 del plan). Lo de antes, en el
   * orden de los renglones: fachadas 1.200 / 11.000 / 88.000 / 124.000, mobiliario 17.500 / 43.500 / 72.000 /
   * 121.000, emisivo 1.400 / 1.400 / 2.300 / 3.500, cristal 400 / 400 / 650 / 900, neones 2.600 / 2.600 / 4.200 /
   * 6.600, lejos 14.000, horizonte 128, ciudad lejana 3.000 / 6.000 / 10.000 / 15.000, tarjetas 700 / 1.000 /
   * 2.100 / 3.800, halos 500 / 500 / 800 / 1.000, tren 140 y 100, vapor 24 / 48 / 72 / 96.
   */
  'ventana · fachadas': {
    0: { triangulos: 7_200, llamadas: 1 },
    1: { triangulos: 24_000, llamadas: 1 },
    2: { triangulos: 80_000, llamadas: 1 },
    3: { triangulos: 210_000, llamadas: 1 },
  },
  'ventana · mobiliario': {
    0: { triangulos: 21_500, llamadas: 1 },
    1: { triangulos: 44_000, llamadas: 1 },
    2: { triangulos: 101_000, llamadas: 1 },
    3: { triangulos: 236_000, llamadas: 1 },
  },
  'ventana · emisivo': {
    0: { triangulos: 2_200, llamadas: 1 },
    1: { triangulos: 2_400, llamadas: 1 },
    2: { triangulos: 5_200, llamadas: 1 },
    3: { triangulos: 8_900, llamadas: 1 },
  },
  'ventana · cristal': {
    0: { triangulos: 700, llamadas: 1 },
    1: { triangulos: 1_350, llamadas: 1 },
    2: { triangulos: 3_700, llamadas: 1 },
    3: { triangulos: 6_000, llamadas: 1 },
  },
  'ventana · neones': {
    0: { triangulos: 2_900, llamadas: 1 },
    1: { triangulos: 3_200, llamadas: 1 },
    2: { triangulos: 5_500, llamadas: 1 },
    3: { triangulos: 9_000, llamadas: 1 },
  },
  /* La LOD1, con los hitos y la sección del Elevado (O3-LEJANO). */
  lejos: igual({ triangulos: 14_300, llamadas: 1 }),
  'suelo · asfalto': igual({ triangulos: 2_600, llamadas: 1 }),
  'suelo · aceras': igual({ triangulos: 4_600, llamadas: 1 }),
  borde: igual({ triangulos: 80, llamadas: 1 }),
  /* La capa lejana (`capas/lejana.ts`): el horizonte, con segunda fila en N2+, y la ciudad lejana. */
  horizonte: {
    0: { triangulos: 192, llamadas: 1 },
    1: { triangulos: 192, llamadas: 1 },
    2: { triangulos: 384, llamadas: 1 },
    3: { triangulos: 384, llamadas: 1 },
  },
  /* Diez triángulos por caja lejana: la mitad de cajas que en el barrio (ver `capas/lejana.ts`). */
  'ciudad lejana': {
    0: { triangulos: 3_000, llamadas: 1 },
    1: { triangulos: 6_000, llamadas: 1 },
    2: { triangulos: 12_000, llamadas: 1 },
    3: { triangulos: 50_000, llamadas: 1 },
  },
  'tarjetas de reflejo': {
    0: { triangulos: 800, llamadas: 1 },
    1: { triangulos: 1_100, llamadas: 1 },
    2: { triangulos: 2_300, llamadas: 1 },
    3: { triangulos: 4_200, llamadas: 1 },
  },
  halos: {
    0: { triangulos: 500, llamadas: 1 },
    1: { triangulos: 600, llamadas: 1 },
    2: { triangulos: 900, llamadas: 1 },
    3: { triangulos: 1_200, llamadas: 1 },
  },
  'tren · coches': {
    0: { triangulos: 300, llamadas: 1 },
    1: { triangulos: 500, llamadas: 1 },
    2: { triangulos: 3_000, llamadas: 1 },
    3: { triangulos: 7_000, llamadas: 1 },
  },
  'tren · ventanas': {
    0: { triangulos: 200, llamadas: 1 },
    1: { triangulos: 200, llamadas: 1 },
    2: { triangulos: 300, llamadas: 1 },
    3: { triangulos: 300, llamadas: 1 },
  },
  vapor: {
    0: { triangulos: 48, llamadas: 1 },
    1: { triangulos: 80, llamadas: 1 },
    2: { triangulos: 220, llamadas: 1 },
    3: { triangulos: 400, llamadas: 1 },
  },
  'haces de luz': {
    0: { triangulos: 0, llamadas: 0 },
    1: { triangulos: 0, llamadas: 0 },
    2: { triangulos: 4_500, llamadas: 1 },
    3: { triangulos: 6_900, llamadas: 1 },
  },
  /* ─── Las capas nuevas (`capas.ts`), declaradas desde ya: hoy no pintan nada ─── */
  'suelo lejano': igual({ triangulos: 256, llamadas: 1 }),
  'luces lejanas': {
    0: { triangulos: 2_200, llamadas: 1 },
    1: { triangulos: 2_900, llamadas: 1 },
    2: { triangulos: 3_500, llamadas: 1 },
    3: { triangulos: 5_500, llamadas: 1 },
  },
  'remates de lo lejano': {
    0: { triangulos: 0, llamadas: 0 },
    1: { triangulos: 0, llamadas: 0 },
    2: { triangulos: 19_000, llamadas: 1 },
    3: { triangulos: 26_500, llamadas: 1 },
  },
  'tubos de neón': {
    0: { triangulos: 0, llamadas: 0 },
    1: { triangulos: 0, llamadas: 0 },
    2: { triangulos: 5_000, llamadas: 1 },
    3: { triangulos: 22_000, llamadas: 1 },
  },
  'luz pintada': {
    0: { triangulos: 0, llamadas: 0 },
    1: { triangulos: 200, llamadas: 1 },
    2: { triangulos: 800, llamadas: 1 },
    3: { triangulos: 800, llamadas: 1 },
  },
  /* Sólo proyectan sombra: sus 3.000 triángulos se pintan otra vez en el mapa de sombras (no cuenta en lo declarado). */
  'sombras de lo cercano': {
    0: { triangulos: 0, llamadas: 0 },
    1: { triangulos: 0, llamadas: 0 },
    2: { triangulos: 0, llamadas: 0 },
    3: { triangulos: 3_000, llamadas: 1 },
  },
  'cercanos · mobiliario': {
    0: { triangulos: 0, llamadas: 0 },
    1: { triangulos: 2_100, llamadas: 1 },
    2: { triangulos: 6_900, llamadas: 1 },
    3: { triangulos: 32_200, llamadas: 1 },
  },
  'cercanos · cristal': {
    0: { triangulos: 0, llamadas: 0 },
    1: { triangulos: 150, llamadas: 1 },
    2: { triangulos: 420, llamadas: 1 },
    3: { triangulos: 1_400, llamadas: 1 },
  },
  'cercanos · emisivo': {
    0: { triangulos: 0, llamadas: 0 },
    1: { triangulos: 100, llamadas: 1 },
    2: { triangulos: 210, llamadas: 1 },
    3: { triangulos: 400, llamadas: 1 },
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

/**
 * La reserva provisional de la atmósfera (ver la cabecera; §7.1 y §7.2 del plan): lo que el libro guarda
 * aunque sus números midan menos. Las salpicaduras de N3 pasan de 640 a 1.280 (LUZ-EN-EL-AIRE las dobla).
 * Es sólo lo DECLARADO: `renglonesDeLaAtmosfera` sigue midiendo lo que hay, y lo medido se compara con esto.
 */
const RESERVA_DE_LA_ATMOSFERA: Readonly<Record<string, Partial<Record<NivelDeLaCiudad, Coste>>>> = {
  salpicaduras: { 3: { triangulos: 1_280, llamadas: 1 } },
};

/** Lo declarado de la atmósfera: lo que miden sus números, o la reserva si es mayor. */
export const RENGLONES_DECLARADOS_DE_LA_ATMOSFERA: Readonly<Record<string, PorNivel>> = Object.fromEntries(
  ['cielo', 'lluvia', 'salpicaduras'].map((nombre) => [
    nombre,
    Object.fromEntries(
      NIVELES_DE_LA_CIUDAD.map((n) => {
        const r = renglonesDeLaAtmosfera(n).find((x) => x.nombre === nombre);
        const reserva = RESERVA_DE_LA_ATMOSFERA[nombre]?.[n];
        return [
          n,
          {
            triangulos: Math.max(r?.triangulos ?? 0, reserva?.triangulos ?? 0),
            llamadas: Math.max(r?.llamadas ?? 0, reserva?.llamadas ?? 0),
          },
        ];
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

/**
 * La suma de una ciudad construida (más su atmósfera) contra su cuota y sus renglones. `libro`: el del
 * barrio (de salida) o el de la ciudad abierta.
 */
export function presupuestoDeLaCiudad(
  renglones: readonly RenglonDeLaCiudad[],
  nivel: NivelDeLaCiudad,
  libro: Readonly<Record<string, PorNivel>> = RENGLONES_DECLARADOS,
): PresupuestoSumado {
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
    const declarado = (libro[r.nombre] ?? RENGLONES_DECLARADOS_DE_LA_ATMOSFERA[r.nombre])?.[nivel];
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

/** Lo que suman los renglones DECLARADOS de un nivel (sin sombras) en un libro: lo que el diseño reserva. */
export function sumaDeLoDeclarado(nivel: NivelDeLaCiudad, libro: Readonly<Record<string, PorNivel>> = RENGLONES_DECLARADOS): Coste {
  let triangulos = 0;
  let llamadas = 0;
  for (const tabla of [libro, RENGLONES_DECLARADOS_DE_LA_ATMOSFERA]) {
    for (const porNivel of Object.values(tabla)) {
      triangulos += porNivel[nivel].triangulos;
      llamadas += porNivel[nivel].llamadas;
    }
  }
  return { triangulos, llamadas };
}
