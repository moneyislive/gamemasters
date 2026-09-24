/**
 * LAS PLANTILLAS DE PLAZA DE «EL QUIEBRO»: la Glorieta, la Porticada y el Patio de carga
 * (`docs/quiebro/CIUDAD-ABIERTA.md` §2.3). Son DATOS: ni una cuenta, ni un sorteo.
 *
 * ═══ QUÉ ES UNA PLANTILLA ═══
 *
 * Una plaza es un hueco sin edificar de 36 × 36 m y sus cuatro calles, como la glorieta de hoy. La
 * plantilla dice lo que hay en ella, RELATIVO A SU CENTRO y en la orientación dibujada (simetría 0; `x`
 * al este, `z` al sur, rumbos de la tabla de 256):
 *
 *   · `fijas`: las cajas de la ciudad de la mesa (las mismas las diez noches);
 *   · `variables`: grupos de sitios de los que la MESA elige cuántos (el quiosco en uno de cuatro
 *     cuadrantes, de dos a cuatro bancos del borde…), con el chorro del código y no el de la noche: la
 *     plaza es la misma las diez noches, porque en la de la Bajada la sala deja donde está a quien ya
 *     estaba dentro (ver el paso 7 de `vestirLaNoche`). Un sitio `despejable` es lo que quita «Plazas
 *     despejadas» en las plazas de los Fallos;
 *   · `impresion`: las 8 zonas donde cae la columna de glifos de un Celador;
 *   · `fallo` y `objeto`: la zona del Fallo (de donde se mide el «a 30 m») y el punto del objeto que
 *     falla y se lee (la Lectura: a 1,5 m o menos de él, ver `objeto`);
 *   · `nace`: los 6 sitios de asiento, mirando hacia fuera;
 *   · `lineas`: las coordenadas de su subgrafo, las mismas en `x` y en `z`, SÓLO por los ejes: la ciudad
 *     cruza todas con todas dentro de ±24 (hasta el eje de las cuatro calles) y se queda las aristas que
 *     se andan con el radio de una persona contra TODO lo que puede estorbar (lo fijo, cada sitio de lo
 *     variable y los dieciséis coches de la plaza). Una línea en diagonal no se puede ni escribir;
 *   · `centro`: el nudo de la plaza, de donde se miden sus distancias por calles (no es el centro
 *     exacto: ahí están la fuente, la estatua o el muelle).
 *
 * Las 8 BOCAS y los 16 COCHES DE LA PLAZA son de las calles que la rodean y no de la plantilla: son los
 * mismos para las tres (`BOCAS_DE_LA_PLAZA`, `COCHES_DE_LA_PLAZA`).
 *
 * ═══ POR QUÉ LAS MEDIDAS DE AQUÍ SON LAS QUE SON ═══
 *
 * La calle que rodea la plaza tiene la acera por bandas de `quiebro-barrio.ts`: la línea de solar en
 * ±18, farolas y postes de 2,25 a 2,75 m hacia la calzada, coches de 3,25 a 5, y el eje en ±24. Los
 * coches de la acera de la plaza van en cuatro sitios por lado, SIMÉTRICOS respecto al centro del lado
 * (de −12 a −7,5, de −5,5 a −1, de 1 a 5,5 y de 7,5 a 12), y dejan tres huecos de 2 m centrados en
 * −6,5, 0 y 6,5. Por eso la línea de ±7 entra en la plaza por el hueco de ±6,5 con 0,65 m de holgura a
 * cada lado, y la de ±13,75 por donde ya no aparca nadie: un subgrafo que no pasara entre los coches
 * sólo entraría por las esquinas, y un Prestado pegado a un coche daría la vuelta a la manzana (lo vio
 * la revisión del barrio). La simetría de los sitios no es estética: la ciudad se dibuja en una
 * orientación y se juega en ocho (§2.6), y un hueco que no fuera simétrico dejaría el subgrafo girado
 * encima de un coche.
 *
 * Todo en cuartos de metro, como el barrio: exacto en binario y en Q16.16.
 *
 * ═══ LAS TRES DE LA V1 ═══
 *
 *   · LA GLORIETA es la de hoy, sacada de `levantarLaGlorieta` de `quiebro-barrio.ts` con sus mismas
 *     cajas: la fuente, el anillo de cuatro bancos, las ocho farolas, el quiosco en uno de cuatro
 *     cuadrantes y de dos a cuatro bancos del borde. Pierde los pilares del tren (el tren pasa ahora
 *     por el Elevado) y la cabina de refugio (los refugios son de la traza, dos por distrito).
 *     `verify:quiebro-barrio` compara lo fijo con la glorieta del barrio caja a caja.
 *   · LA PORTICADA: soportal perimetral con un pilar cada 6 m en la línea de ±15 (el soportal va de
 *     15 a 18), la estatua en medio, cuatro bancos mirándola y cuatro farolas en las esquinas del
 *     soportal. Los pilares caen en −15, −9, −3, 3, 9 y 15: el eje de cada lado (0) y los huecos de
 *     ±6,5 quedan entre dos pilares, para que las líneas de 0 y de ±7 pasen.
 *   · EL PATIO DE CARGA: diez contenedores de 6 × 2,5 m (dos pegados en cada cuadrante y dos en el eje
 *     norte-sur), un muelle bajo de 4 × 4 en medio, cuatro farolas y dos carretillas de ocho sitios
 *     (despejables). Sus líneas son las de ±15,5 y no las de ±13,75: un contenedor de 6 m no cabe entre
 *     ±7 y ±13,75 con la holgura de una persona, y entre ±7 y ±15,5 sí.
 */
import type { Cara, Rectangulo, SitioDelBarrio } from './quiebro-barrio';
import type { IdDePlantilla, TipoDeCajaDeLaCiudad } from './quiebro-ciudad';

/** Una caja de plantilla: relativa al centro de la plaza, en la orientación dibujada. */
export interface CajaDePlantilla extends Rectangulo {
  readonly tipo: TipoDeCajaDeLaCiudad;
  readonly alto: number;
  /** El rumbo (0-255) al que da su frente; 0 en lo que no lo tiene. */
  readonly mira: number;
  readonly despejable: boolean;
}

/**
 * UN GRUPO DE LO VARIABLE: `sitios` donde puede ir, y cuántos pone la mesa (de `minimo` a `maximo`,
 * sin repetir sitio). Cada sitio de cada grupo es compatible con TODO lo demás de la plantilla, con
 * cualquier otro sitio y con los coches de la plaza: se sortea sin mirar nada.
 */
export interface GrupoVariable {
  readonly sitios: readonly CajaDePlantilla[];
  readonly minimo: number;
  readonly maximo: number;
}

/** UNA PLANTILLA DE PLAZA. Ver la cabecera. */
export interface PlantillaDePlaza {
  readonly id: IdDePlantilla;
  readonly fijas: readonly CajaDePlantilla[];
  readonly variables: readonly GrupoVariable[];
  readonly impresion: readonly Rectangulo[];
  readonly fallo: Rectangulo;
  readonly objeto: { readonly x: number; readonly z: number };
  readonly nace: readonly SitioDelBarrio[];
  readonly lineas: readonly number[];
  readonly centro: { readonly x: number; readonly z: number };
}

/** La mitad del solar de una plaza, y el eje de las cuatro calles que la rodean. */
export const MEDIA_PLAZA = 18;
export const EJE_DE_LAS_CALLES_DE_LA_PLAZA = 24;

/* ─── Ayudas para escribir los datos ─────────────────────────────────────── */

function caja(x0: number, z0: number, x1: number, z1: number, tipo: TipoDeCajaDeLaCiudad, alto: number, mira = 0, despejable = false): CajaDePlantilla {
  return { x0, z0, x1, z1, tipo, alto, mira, despejable };
}

function cuadrado(x: number, z: number, medio: number): Rectangulo {
  return { x0: x - medio, z0: z - medio, x1: x + medio, z1: z + medio };
}

function cajaCuadrada(x: number, z: number, medio: number, tipo: TipoDeCajaDeLaCiudad, alto: number, mira = 0, despejable = false): CajaDePlantilla {
  return caja(x - medio, z - medio, x + medio, z + medio, tipo, alto, mira, despejable);
}

/** Lo que se mira hacia dentro de la plaza desde cada lado. */
const HACIA_DENTRO: Readonly<Record<Cara, number>> = { norte: 128, este: 192, sur: 0, oeste: 64 };

/* ─── Lo común a las tres: bocas, coches de la plaza, nacer ──────────────── */

/**
 * LAS 8 BOCAS: de cada una de las cuatro esquinas de la plaza (los cruces en (±24, ±24)) salen dos
 * calles hacia fuera, y en cada una la boca son los 6 m de calzada nada más pasar el cruce (de 3,5 a
 * 9,5 m del centro del cruce, 5 m de ancho sobre el eje), donde no aparca nadie: los coches de un tramo
 * empiezan a 6 m de la línea de solar, 12 del cruce. Por filas de esquinas (norte, luego sur), de oeste
 * a este, y en cada esquina primero la que sale por `x` y luego la que sale por `z`.
 */
export const BOCAS_DE_LA_PLAZA: readonly Rectangulo[] = ((): Rectangulo[] => {
  const salida: Rectangulo[] = [];
  const e = EJE_DE_LAS_CALLES_DE_LA_PLAZA;
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const x = sx * e;
      const z = sz * e;
      const a = sx * (e + 3.5);
      const b = sx * (e + 9.5);
      salida.push({ x0: Math.min(a, b), z0: z - 2.5, x1: Math.max(a, b), z1: z + 2.5 });
      const c = sz * (e + 3.5);
      const d = sz * (e + 9.5);
      salida.push({ x0: x - 2.5, z0: Math.min(c, d), x1: x + 2.5, z1: Math.max(c, d) });
    }
  }
  return salida;
})();

/** Dónde empieza cada coche a lo largo de un lado de 36 m, contado desde la esquina: simétricos (ver la cabecera). */
export const SITIOS_DE_COCHE_EN_36: readonly number[] = [6, 12.5, 19, 25.5];
/** Y en un lado de 30 (una manzana junto a una avenida): simétricos respecto a 15. */
export const SITIOS_DE_COCHE_EN_30: readonly number[] = [6, 12.75, 19.5];
/** Lo que mide un coche aparcado, y la banda de la acera por la que va (desde la línea de solar). */
export const LARGO_DE_COCHE = 4.5;
export const BANDA_DE_COCHE: readonly [number, number] = [3.25, 5];

/**
 * LOS 16 SITIOS DE COCHE DE LA PLAZA: los de la acera de la plaza de sus cuatro calles, cuatro por lado,
 * en la banda de los coches y en los sitios simétricos. `mira` es el rumbo de ir por la calle hacia el
 * este (lados norte y sur) o hacia el sur (este y oeste); la noche le da la vuelta a la mitad.
 */
export const COCHES_DE_LA_PLAZA: readonly CajaDePlantilla[] = ((): CajaDePlantilla[] => {
  const salida: CajaDePlantilla[] = [];
  const m = MEDIA_PLAZA;
  const [d0, d1] = BANDA_DE_COCHE;
  for (const cara of ['norte', 'este', 'sur', 'oeste'] as const) {
    for (const s of SITIOS_DE_COCHE_EN_36) {
      const a0 = -m + s;
      const a1 = a0 + LARGO_DE_COCHE;
      if (cara === 'norte') salida.push(caja(a0, -m - d1, a1, -m - d0, 'coche', 1.5, 64, true));
      else if (cara === 'sur') salida.push(caja(a0, m + d0, a1, m + d1, 'coche', 1.5, 64, true));
      else if (cara === 'este') salida.push(caja(m + d0, a0, m + d1, a1, 'coche', 1.5, 128, true));
      else salida.push(caja(-m - d1, a0, -m - d0, a1, 'coche', 1.5, 128, true));
    }
  }
  return salida;
})();

/** Cuántos coches aparca la mesa en la acera de cada plaza (los mismos todas sus noches). */
export const COCHES_DE_LA_PLAZA_POR_NOCHE: readonly [number, number] = [2, 3];

/**
 * Los seis sitios de asiento: a 4 m del centro, entre lo de en medio (la fuente, la estatua o el muelle,
 * que no pasan de 2,5) y lo que rodea (los bancos a 6, o los contenedores a 7,75), mirando hacia fuera,
 * que es por donde viene el Sistema. Los de la glorieta de hoy.
 */
const NACE_EN_LA_PLAZA: readonly SitioDelBarrio[] = [
  { x: 0, z: -4, rumbo: 0 },
  { x: 4, z: 0, rumbo: 64 },
  { x: 0, z: 4, rumbo: 128 },
  { x: -4, z: 0, rumbo: 192 },
  { x: 4, z: -4, rumbo: 32 },
  { x: -4, z: 4, rumbo: 160 },
];

/** La zona del Fallo: 2 × 1 m entre lo de en medio y el anillo, al sur del centro. */
const ZONA_DEL_FALLO: Rectangulo = { x0: -1, z0: 3, x1: 1, z1: 4 };
/** El nudo de la plaza: el del sitio de asiento del sur. */
const CENTRO_DEL_SUBGRAFO = { x: 0, z: 4 };

/* ─── La Glorieta ─────────────────────────────────────────────────────────── */

/** Los ocho bancos del borde de la glorieta de hoy: (x, z, ¿a lo largo de x?). */
const BANCOS_DEL_BORDE: readonly (readonly [number, number, boolean])[] = [
  [-9, -16.25, true],
  [9, -16.25, true],
  [-9, 16.25, true],
  [9, 16.25, true],
  [-16.25, -9, false],
  [-16.25, 9, false],
  [16.25, -9, false],
  [16.25, 9, false],
];

/** El rumbo que mira hacia el centro desde un cuadrante (signos de x y de z): el del quiosco de hoy. */
function alCentroDesde(sx: number, sz: number): number {
  if (sx < 0 && sz < 0) return 96;
  if (sx > 0 && sz < 0) return 160;
  if (sx > 0 && sz > 0) return 224;
  return 32;
}

const GLORIETA: PlantillaDePlaza = {
  id: 'glorieta',
  fijas: [
    cajaCuadrada(0, 0, 2.5, 'fuente', 1),
    caja(6, -1, 6.5, 1, 'banco', 0.5, 192),
    caja(-6.5, -1, -6, 1, 'banco', 0.5, 64),
    caja(-1, -6.5, 1, -6, 'banco', 0.5, 128),
    caja(-1, 6, 1, 6.5, 'banco', 0.5, 0),
    cajaCuadrada(-16.5, -16.5, 0.25, 'farola', 4.5),
    cajaCuadrada(16.5, -16.5, 0.25, 'farola', 4.5),
    cajaCuadrada(-16.5, 16.5, 0.25, 'farola', 4.5),
    cajaCuadrada(16.5, 16.5, 0.25, 'farola', 4.5),
    cajaCuadrada(0, -16.5, 0.25, 'farola', 4.5),
    cajaCuadrada(16.5, 0, 0.25, 'farola', 4.5),
    cajaCuadrada(0, 16.5, 0.25, 'farola', 4.5),
    cajaCuadrada(-16.5, 0, 0.25, 'farola', 4.5),
  ],
  variables: [
    {
      /* El quiosco de 4 × 4, centrado en (±11, ±11): cuadrantes NO, NE, SE, SO, como hoy. */
      sitios: [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz]) => cajaCuadrada(11 * (sx as number), 11 * (sz as number), 2, 'quiosco', 3, alCentroDesde(sx as number, sz as number))),
      minimo: 1,
      maximo: 1,
    },
    {
      sitios: BANCOS_DEL_BORDE.map(([x, z, aLoLargo]) => {
        const mira = aLoLargo ? (z < 0 ? HACIA_DENTRO.norte : HACIA_DENTRO.sur) : x < 0 ? HACIA_DENTRO.oeste : HACIA_DENTRO.este;
        return aLoLargo ? caja(x - 1, z - 0.25, x + 1, z + 0.25, 'banco', 0.5, mira, true) : caja(x - 0.25, z - 1, x + 0.25, z + 1, 'banco', 0.5, mira, true);
      }),
      minimo: 2,
      maximo: 4,
    },
  ],
  impresion: [cuadrado(11, 0, 1.25), cuadrado(0, 11, 1.25), cuadrado(-11, 0, 1.25), cuadrado(0, -11, 1.25), cuadrado(14.5, -14.5, 0.75), cuadrado(14.5, 14.5, 0.75), cuadrado(-14.5, 14.5, 0.75), cuadrado(-14.5, -14.5, 0.75)],
  fallo: ZONA_DEL_FALLO,
  /* El borde sur de la fuente: quien se planta en la zona del Fallo la tiene a menos de 1,5 m. */
  objeto: { x: 0, z: 2.5 },
  nace: NACE_EN_LA_PLAZA,
  lineas: [-13.75, -7, -4, 0, 4, 7, 13.75],
  centro: CENTRO_DEL_SUBGRAFO,
};

/* ─── La Porticada ────────────────────────────────────────────────────────── */

/** Dónde van los pilares a lo largo de cada lado del soportal perimetral, en la línea de ±15. */
const PILARES_DE_LA_PORTICADA: readonly number[] = [-15, -9, -3, 3, 9, 15];
const LINEA_DEL_SOPORTAL = 15;

const PORTICADA: PlantillaDePlaza = {
  id: 'porticada',
  fijas: ((): CajaDePlantilla[] => {
    const salida: CajaDePlantilla[] = [cajaCuadrada(0, 0, 1, 'estatua', 3.5)];
    /* Los pilares: los del norte y el sur con sus esquinas, los del este y el oeste sin ellas. */
    for (const a of PILARES_DE_LA_PORTICADA) {
      salida.push(cajaCuadrada(a, -LINEA_DEL_SOPORTAL, 0.25, 'pilar-de-soportal', 4.5));
      salida.push(cajaCuadrada(a, LINEA_DEL_SOPORTAL, 0.25, 'pilar-de-soportal', 4.5));
    }
    for (const a of PILARES_DE_LA_PORTICADA) {
      if (Math.abs(a) === LINEA_DEL_SOPORTAL) continue;
      salida.push(cajaCuadrada(-LINEA_DEL_SOPORTAL, a, 0.25, 'pilar-de-soportal', 4.5));
      salida.push(cajaCuadrada(LINEA_DEL_SOPORTAL, a, 0.25, 'pilar-de-soportal', 4.5));
    }
    /* Los cuatro bancos, a 8 m, mirando a la estatua. */
    salida.push(caja(-1, -8.25, 1, -7.75, 'banco', 0.5, 128));
    salida.push(caja(7.75, -1, 8.25, 1, 'banco', 0.5, 192));
    salida.push(caja(-1, 7.75, 1, 8.25, 'banco', 0.5, 0));
    salida.push(caja(-8.25, -1, -7.75, 1, 'banco', 0.5, 64));
    /* Las farolas, en las esquinas del soportal. */
    for (const [x, z] of [
      [-16.5, -16.5],
      [16.5, -16.5],
      [16.5, 16.5],
      [-16.5, 16.5],
    ] as const) {
      salida.push(cajaCuadrada(x, z, 0.25, 'farola', 4.5));
    }
    return salida;
  })(),
  variables: [],
  impresion: [cuadrado(11, 0, 1.25), cuadrado(0, 11, 1.25), cuadrado(-11, 0, 1.25), cuadrado(0, -11, 1.25), cuadrado(12.5, -12.5, 0.75), cuadrado(12.5, 12.5, 0.75), cuadrado(-12.5, 12.5, 0.75), cuadrado(-12.5, -12.5, 0.75)],
  /* La estatua mide 2 × 2: la zona del Fallo se acerca a su borde sur para quedar a 1,5 m o menos de ella. */
  fallo: { x0: -1, z0: 1.5, x1: 1, z1: 2.5 },
  objeto: { x: 0, z: 1 },
  nace: NACE_EN_LA_PLAZA,
  lineas: [-13.75, -7, -4, 0, 4, 7, 13.75],
  centro: CENTRO_DEL_SUBGRAFO,
};

/* ─── El Patio de carga ───────────────────────────────────────────────────── */

/** Un contenedor de 6 × 2,5 m: a lo largo de `x` o de `z`, desde su esquina de menor coordenada. */
function contenedor(x0: number, z0: number, aLoLargoDeX: boolean): CajaDePlantilla {
  return aLoLargoDeX ? caja(x0, z0, x0 + 6, z0 + 2.5, 'contenedor', 2.5) : caja(x0, z0, x0 + 2.5, z0 + 6, 'contenedor', 2.5);
}

const PATIO: PlantillaDePlaza = {
  id: 'patio',
  fijas: [
    cajaCuadrada(0, 0, 2, 'muelle', 1.25),
    /* Dos pegados en cada cuadrante, de 7,75 a 13,75 y de ±8,25 a ±13,25. */
    contenedor(7.75, -13.25, true),
    contenedor(7.75, -10.75, true),
    contenedor(7.75, 8.25, true),
    contenedor(7.75, 10.75, true),
    contenedor(-13.75, 8.25, true),
    contenedor(-13.75, 10.75, true),
    contenedor(-13.75, -13.25, true),
    contenedor(-13.75, -10.75, true),
    /* Y dos en el eje norte-sur, de 8 a 14. */
    contenedor(-1.25, -14, false),
    contenedor(-1.25, 8, false),
    cajaCuadrada(-16.5, -16.5, 0.25, 'farola', 6),
    cajaCuadrada(16.5, -16.5, 0.25, 'farola', 6),
    cajaCuadrada(16.5, 16.5, 0.25, 'farola', 6),
    cajaCuadrada(-16.5, 16.5, 0.25, 'farola', 6),
  ],
  variables: [
    {
      /* Las carretillas, de 1 × 1, entre las líneas de 4 y de 7 y entre las de 7 y 15,5. */
      sitios: [
        [5.5, -11, 0],
        [11, -5.5, 64],
        [11, 5.5, 128],
        [5.5, 11, 192],
        [-5.5, 11, 0],
        [-11, 5.5, 64],
        [-11, -5.5, 128],
        [-5.5, -11, 192],
      ].map(([x, z, mira]) => cajaCuadrada(x as number, z as number, 0.5, 'carretilla', 1.25, mira as number, true)),
      minimo: 2,
      maximo: 2,
    },
  ],
  impresion: [cuadrado(11, 0, 1.25), cuadrado(0, 16, 0.5), cuadrado(-11, 0, 1.25), cuadrado(0, -16, 0.5), cuadrado(14.5, -14.5, 0.75), cuadrado(14.5, 14.5, 0.75), cuadrado(-14.5, 14.5, 0.75), cuadrado(-14.5, -14.5, 0.75)],
  fallo: ZONA_DEL_FALLO,
  objeto: { x: 0, z: 2 },
  nace: NACE_EN_LA_PLAZA,
  lineas: [-15.5, -7, -4, 0, 4, 7, 15.5],
  centro: CENTRO_DEL_SUBGRAFO,
};

/** LAS TRES PLANTILLAS DE LA V1, por su id. */
export const PLANTILLAS_DE_PLAZA: Readonly<Record<IdDePlantilla, PlantillaDePlaza>> = { glorieta: GLORIETA, porticada: PORTICADA, patio: PATIO };
