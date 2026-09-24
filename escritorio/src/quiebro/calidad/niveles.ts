/**
 * LOS NIVELES DE CALIDAD DEL QUIEBRO, N0-N3: qué palanca mueve cada uno. Sin `three`, sin React.
 *
 * ═══ QUÉ ES UN NIVEL Y QUÉ NO ═══
 *
 * Un nivel decide cuánto ADORNO se pinta: resolución, posproceso, gotas de lluvia, gente de fondo,
 * sombras, esqueletos. No decide nada de la partida. La estructura con la que se choca, los anillos,
 * las líneas de apuntado, las balas, los 48 durmientes de guion y las siluetas con contorno hasta
 * 60 m son IDÉNTICOS en todos (diseño §8): por eso no están en la tabla —una fila por nivel sería la
 * invitación a variarlos— sino en `IGUAL_EN_TODOS_LOS_NIVELES`, que es una sola cifra para todos.
 * El Burgo ya enseñó lo que pasa si no: en `sobria` salían 2.808 obstáculos menos y dos jugadores
 * andaban dos Burgos distintos.
 *
 * ═══ POR QUÉ NO SE ENSANCHA `Calidad` ═══
 *
 * La casa tiene exactamente dos calidades, `'plena' | 'sobria'` (`escenas/embarcadero/tipos.ts`), y
 * ese tipo es también la puerta de Boots on Board: `leerElVeredicto` sólo acepta esas dos palabras,
 * la llave del almacén es por aparato y hay `Record<Calidad, …>` en el Burgo y en Las Lindes que
 * dejarían de compilar. Aquí la escalera es propia y más fina, y hacia fuera se informa con
 * `calidadDeFuera`: N0 es `sobria` y N1-N3 son `plena`, que es lo que el §8 del diseño pide.
 *
 * ═══ LAS CIFRAS SON PROVISIONALES ═══
 *
 * Son las del §8 del diseño, que dice que no hay ni una medida en un teléfono. Salen de aquí y de
 * ningún otro sitio para que el día del banco en aparato real se cambien en UNA tabla. Los peldaños
 * de DPR de N0 (0,6) y de N1 (0,85) no están en el diseño: son el margen que el gobernador usa ANTES
 * de bajar de nivel (el diseño pide DPR dinámico dentro del nivel y sólo da la horquilla de N2 y el
 * techo de N3), y son igual de provisionales.
 *
 * ═══ QUIÉN LEE ESTO ═══
 *
 * El gobernador (`gobernador.ts`) lee la escalera de DPR y los topes; el posproceso lee
 * `posproceso`, `oclusion` y `enfoqueConProfundidad`; la ciudad, la atmósfera y los personajes leen
 * sus palancas. El gancho que junta todo en la escena es `usarElNivel` (`usar-el-nivel.ts`).
 */
import type { Calidad } from '../../../../escenas/embarcadero/tipos';

/** Los cuatro niveles del §8: N0 Android modesto, N1 gama media, N2 gama alta o PC integrada, N3 PC con gráfica. */
export type NivelDeCalidad = 0 | 1 | 2 | 3;
export const NIVELES_DE_CALIDAD: readonly NivelDeCalidad[] = [0, 1, 2, 3];

/**
 * Qué posproceso lleva el nivel:
 *   · `ninguno`: el lienzo pinta directo, y el tono va DENTRO de cada material (mapeo tonal propio).
 *   · `barato`:  la escena se pinta en el lienzo como en N0 y encima va UN pase «uber» de 8 bits, con
 *                el brillo calculado a un cuarto de resolución.
 *   · `pleno`:   compositor de media coma flotante (HalfFloat) —sólo si el sondeo lo CREÓ— con brillo
 *                por niveles, gradación y SMAA.
 */
export type PosprocesoDelNivel = 'ninguno' | 'barato' | 'pleno';

export interface PalancasDelNivel {
  readonly nombre: 'N0' | 'N1' | 'N2' | 'N3';
  /** Para qué aparato se pensó, en palabras del diseño. */
  readonly para: string;
  /**
   * La escalera de DPR, de MAYOR a menor. El gobernador baja peldaños antes de bajar de nivel y los
   * sube antes de probar el nivel de arriba. Se recorta al DPR del aparato (`escaleraDeDpr`).
   */
  readonly dpr: readonly number[];
  readonly posproceso: PosprocesoDelNivel;
  /** Oclusión ambiental a media resolución (N3, «si rinde»: el gobernador lo dirá). */
  readonly oclusion: boolean;
  /** El enfoque del Remanso mira la profundidad (DOF de verdad) en vez de sólo la distancia al centro. */
  readonly enfoqueConProfundidad: boolean;
  /** Reflejo en espacio de pantalla, SÓLO en la máscara de charcos. */
  readonly reflejoEnCharcos: boolean;
  readonly charcos: { readonly ondas: boolean; readonly salpicaduras: boolean };
  readonly fachadas: {
    /** Interiores falsos analíticos a menos de estos metros; 0 = ventanas emisivas planas. */
    readonly interioresHastaM: number;
    /** Farolas que pasan a ser luces de verdad cerca de la cámara. */
    readonly farolasReales: number;
    /** Haces de luz de las farolas en la niebla. */
    readonly haces: boolean;
  };
  /** Sombras de la luz principal: distancia en metros y cascadas. 0 y 0 = sin sombras. */
  readonly sombras: { readonly hastaM: number; readonly cascadas: number };
  /** Rayas de lluvia. */
  readonly lluvia: number;
  /**
   * Cómo se pintan los 48 durmientes de guion. CUÁNTOS hay no es del nivel (ver la cabecera): sólo
   * con cuántos triángulos y cuántos, de los más cercanos, llevan esqueleto en vez de VAT.
   */
  readonly durmientes: { readonly triangulosDelVat: number; readonly conEsqueleto: number };
  /** Gente fuera del límite jugable (balcones, calles cortadas) y coches en marcha por las avenidas. */
  readonly fondo: { readonly gente: number; readonly coches: number };
  /**
   * Esqueletos de los NPC. `soloCercanos`: sólo los que están a menos de 12 m (los lejanos van por
   * VAT); `hzLejanos`: a cuántos hercios se anima lo lejano (0 = en cada fotograma).
   */
  readonly esqueletos: { readonly tope: number; readonly soloCercanos: boolean; readonly hzLejanos: number };
  /** Lo más que el nivel puede costar, contado con `gl.info.render` sobre la ESCENA (sin los pases). */
  readonly topes: { readonly triangulos: number; readonly llamadas: number };
}

/** Lo que NO depende del nivel, en una sola cifra para todos: ver la cabecera. */
export const IGUAL_EN_TODOS_LOS_NIVELES = {
  /** Los durmientes de guion: de ellos salen los Prestados, así que son parte de la partida. */
  durmientesDeGuion: 48,
  /** Hasta dónde se ven las siluetas con contorno de los enemigos. */
  contornoDeSiluetasM: 60,
} as const;

/** El §8 del diseño, fila a fila. */
export const TABLA_DE_NIVELES: Readonly<Record<NivelDeCalidad, PalancasDelNivel>> = {
  0: {
    nombre: 'N0',
    para: 'Android modesto',
    dpr: [0.75, 0.6],
    posproceso: 'ninguno',
    oclusion: false,
    enfoqueConProfundidad: false,
    reflejoEnCharcos: false,
    charcos: { ondas: false, salpicaduras: false },
    fachadas: { interioresHastaM: 0, farolasReales: 0, haces: false },
    sombras: { hastaM: 0, cascadas: 0 },
    lluvia: 1000,
    durmientes: { triangulosDelVat: 400, conEsqueleto: 0 },
    fondo: { gente: 0, coches: 4 },
    /* «Los cercanos» (§8) no trae cifra: 8 es la de aquí, provisional como las demás. */
    esqueletos: { tope: 8, soloCercanos: true, hzLejanos: 7 },
    topes: { triangulos: 150_000, llamadas: 60 },
  },
  1: {
    nombre: 'N1',
    para: 'gama media',
    dpr: [1.0, 0.85],
    posproceso: 'barato',
    oclusion: false,
    enfoqueConProfundidad: false,
    reflejoEnCharcos: false,
    charcos: { ondas: true, salpicaduras: false },
    fachadas: { interioresHastaM: 60, farolasReales: 0, haces: false },
    sombras: { hastaM: 0, cascadas: 0 },
    lluvia: 3000,
    durmientes: { triangulosDelVat: 1500, conEsqueleto: 0 },
    fondo: { gente: 24, coches: 8 },
    esqueletos: { tope: 12, soloCercanos: false, hzLejanos: 0 },
    topes: { triangulos: 250_000, llamadas: 90 },
  },
  2: {
    nombre: 'N2',
    para: 'gama alta o PC con gráfica integrada',
    dpr: [1.5, 1.25],
    posproceso: 'pleno',
    oclusion: false,
    enfoqueConProfundidad: false,
    reflejoEnCharcos: false,
    charcos: { ondas: true, salpicaduras: true },
    /* Los haces, desde N2 y no sólo en N3 como decía la primera tabla: en un PC con integrada cuestan una
       llamada y son lo que más «noche mojada» pone por su precio. */
    fachadas: { interioresHastaM: 60, farolasReales: 4, haces: true },
    sombras: { hastaM: 40, cascadas: 1 },
    lluvia: 6000,
    durmientes: { triangulosDelVat: 1500, conEsqueleto: 8 },
    fondo: { gente: 60, coches: 16 },
    esqueletos: { tope: 20, soloCercanos: false, hzLejanos: 0 },
    topes: { triangulos: 600_000, llamadas: 150 },
  },
  3: {
    nombre: 'N3',
    para: 'PC con gráfica dedicada',
    dpr: [2.0, 1.75, 1.5],
    posproceso: 'pleno',
    oclusion: true,
    enfoqueConProfundidad: true,
    reflejoEnCharcos: true,
    charcos: { ondas: true, salpicaduras: true },
    fachadas: { interioresHastaM: 60, farolasReales: 4, haces: true },
    sombras: { hastaM: 40, cascadas: 3 },
    lluvia: 10_000,
    durmientes: { triangulosDelVat: 1500, conEsqueleto: 16 },
    fondo: { gente: 120, coches: 30 },
    esqueletos: { tope: 20, soloCercanos: false, hzLejanos: 0 },
    topes: { triangulos: 1_500_000, llamadas: 250 },
  },
};

/** Hacia fuera sólo hay dos palabras (ver la cabecera): N0 es `sobria` y el resto `plena`. */
export function calidadDeFuera(nivel: NivelDeCalidad): Calidad {
  return nivel === 0 ? 'sobria' : 'plena';
}

/** Un número cualquiera como nivel, acotado: lo que no es un nivel entero de 0 a 3 cae al más cercano. */
export function comoNivel(n: number): NivelDeCalidad {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 3) return 3;
  return (Math.round(n) as NivelDeCalidad);
}

/**
 * La escalera de DPR del nivel en ESTE aparato: cada peldaño recortado al DPR nativo de la pantalla
 * —pintar por encima del nativo es gastar en píxeles que no existen; el SMAA ya se ocupa del
 * dentado— y sin peldaños repetidos. Nunca vacía: si el aparato dice un DPR absurdo, vale el del
 * nivel tal cual.
 */
export function escaleraDeDpr(nivel: NivelDeCalidad, dprDelAparato: number): readonly number[] {
  const nativo = Number.isFinite(dprDelAparato) && dprDelAparato > 0 ? dprDelAparato : Number.POSITIVE_INFINITY;
  const escalera: number[] = [];
  for (const d of TABLA_DE_NIVELES[nivel].dpr) {
    const recortado = Math.min(d, nativo);
    if (!escalera.some((e) => Math.abs(e - recortado) < 1e-6)) escalera.push(recortado);
  }
  return escalera.length > 0 ? escalera : TABLA_DE_NIVELES[nivel].dpr;
}
