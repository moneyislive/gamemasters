/**
 * LO QUE EL APARATO PUEDE, COMO DATOS, Y EL NIVEL CON EL QUE SE EMPIEZA. Sin `three` ni WebGL.
 *
 * ═══ POR QUÉ ESTÁ PARTIDO EN DOS ═══
 *
 * El sondeo de verdad (`sondeo.ts`) necesita un contexto WebGL: crea un blanco de media coma
 * flotante, pinta en él, lo lee; sube una textura flotante y la lee DESDE UN SOMBREADOR DE VÉRTICES,
 * que es exactamente lo que hace el esqueleto de three. Eso no corre en Node. Lo que sí corre en
 * Node es la DECISIÓN que se toma con lo sondeado, y es la parte que se equivoca: una expresión
 * regular que confunde una gráfica integrada con una dedicada manda a un portátil a N3. Así que el
 * sondeo devuelve un objeto de datos (`CapacidadesDelAparato`) y aquí se decide con él, y el
 * comprobador (`escritorio/scripts/verificar-quiebro-calidad.ts`) lo prueba con aparatos inventados.
 *
 * ═══ QUÉ SE CREE Y QUÉ NO ═══
 *
 * Se cree lo que se CREÓ: `mediaFlotante` sólo es cierto si el sondeo pintó un 2,0 en un blanco
 * HalfFloat y lo leyó de vuelta (un blanco sin `EXT_color_buffer_half_float` sale NEGRO y sin un
 * error, y expo-gl anuncia extensiones que luego no tiene: por eso nunca `getExtension` a secas).
 * Lo demás —el nombre de la gráfica, los núcleos, la memoria— es una PISTA para elegir el nivel de
 * arranque, nunca un techo: el que manda después es el gobernador, que mide.
 *
 * ═══ LA REGLA DE ARRANQUE (diseño §8) ═══
 *
 *   · arranca en N1, o en lo que diga el sondeo;
 *   · sin media coma flotante creada de verdad, el techo es N1 (el compositor pleno no puede existir);
 *   · un pintor por software (SwiftShader, llvmpipe…) o una gráfica de móvil vieja arranca en N0;
 *   · un PC con gráfica dedicada arranca en N3, uno con integrada en N2;
 *   · un aparato táctil nunca pasa de N2 (N3 es «PC con gráfica dedicada»).
 */
import type { NivelDeCalidad } from './niveles';

export interface CapacidadesDelAparato {
  /** El contexto es WebGL2 (three r185 no arranca sin él, pero se dice). */
  readonly webgl2: boolean;
  /** Se CREÓ un blanco HalfFloat completo, se pintó un valor mayor que 1 y se leyó bien. */
  readonly mediaFlotante: boolean;
  /** Una textura FloatType se lee bien desde el sombreador de VÉRTICES (lo que usa el esqueleto). */
  readonly flotanteEnVertices: boolean;
  /** `WEBGL_multi_draw` (lo usa `BatchedMesh`). */
  readonly multiDibujo: boolean;
  /** `MAX_TEXTURE_SIZE`. */
  readonly texturaMaxima: number;
  /** `MAX_SAMPLES` para blancos multimuestra. */
  readonly muestrasMaximas: number;
  /** Hay cronómetro de GPU (`EXT_disjoint_timer_query_webgl2`). Sólo informa: nadie lo usa aún. */
  readonly cronometroDeGpu: boolean;
  /** El nombre de la gráfica, desenmascarado si el navegador lo deja; '' si no dice nada. */
  readonly grafica: string;
  /** `navigator.hardwareConcurrency`, o null. */
  readonly nucleos: number | null;
  /** `navigator.deviceMemory` en GB (sólo Chromium), o null. */
  readonly memoriaGb: number | null;
  /** La pantalla en píxeles CSS y su DPR nativo. */
  readonly pantalla: { readonly ancho: number; readonly alto: number; readonly dpr: number };
  /** El puntero principal es un dedo (`(pointer: coarse)`), no sólo «hay pantalla táctil». */
  readonly tactil: boolean;
  /** Si el sondeo falló entero (una excepción): entonces todo lo demás es el mínimo prudente. */
  readonly fallo: string | null;
}

export interface VeredictoDelSondeo {
  /** Con qué nivel se empieza. */
  readonly inicial: NivelDeCalidad;
  /** Por encima de este nivel no se sube nunca en este aparato. */
  readonly techo: NivelDeCalidad;
  /** Cada decisión con su porqué, en castellano: el banco lo enseña tal cual. */
  readonly porque: readonly string[];
}

/** Lo que se supone cuando no se ha podido sondear: ni flotantes ni nada; se arranca abajo. */
export const CAPACIDADES_MINIMAS: CapacidadesDelAparato = {
  webgl2: false,
  mediaFlotante: false,
  flotanteEnVertices: false,
  multiDibujo: false,
  texturaMaxima: 2048,
  muestrasMaximas: 0,
  cronometroDeGpu: false,
  grafica: '',
  nucleos: null,
  memoriaGb: null,
  pantalla: { ancho: 0, alto: 0, dpr: 1 },
  tactil: false,
  fallo: 'sin sondear',
};

/*
 * LAS PISTAS POR NOMBRE. Son listas cortas y deliberadamente conservadoras: fallar hacia abajo cuesta
 * unos segundos con peor aspecto (el gobernador sube a prueba tras 20 s de holgura), fallar hacia
 * arriba cuesta tirones al empezar la noche.
 */

/** Pintores por software: ni la GPU existe. */
const POR_SOFTWARE = /swiftshader|llvmpipe|softpipe|basic render|software rasterizer|mesa offscreen/i;

/**
 * Gráficas de móvil de gama baja o viejas: Mali-4xx y Mali-T, Mali-G31/G51/G52/G57, Adreno 3xx a 5xx
 * y 60x-61x, PowerVR SGX y las Rogue GE/GM, Vivante, VideoCore y los Tegra viejos.
 */
const MOVIL_MODESTO =
  /mali-(?:4\d\d|t\d+|g31|g51|g52|g57)\b|adreno[^0-9]*(?:[345]\d\d|6[01]\d)\b|powervr (?:sgx|rogue g[em])|vivante|videocore|tegra [234]\b/i;

/**
 * Gráficas dedicadas de PC. «AMD Radeon(TM) Graphics» a secas es la integrada de los APU y NO entra;
 * «Radeon RX», «Radeon Pro» y las series viejas numeradas sí. Los Apple M «Pro/Max/Ultra» se tratan
 * como dedicadas; un «Apple GPU» a secas (Safari lo enmascara así) no.
 */
const DEDICADA_DE_PC =
  /nvidia|geforce|quadro|\brtx\b|\bgtx\b|radeon(?:\(tm\))? ?(?:rx|pro|r9|r7|hd [5-9]\d{3})|intel\(r\) arc|\barc\(tm\) a\d|apple m\d (?:pro|max|ultra)/i;

const NIVEL_MAS_BAJO = (a: NivelDeCalidad, b: NivelDeCalidad): NivelDeCalidad => (a < b ? a : b);

/** El nivel de arranque y el techo, con su porqué. Pura: la prueba el comprobador con aparatos inventados. */
export function veredictoDelSondeo(c: CapacidadesDelAparato): VeredictoDelSondeo {
  const porque: string[] = [];

  if (c.fallo !== null) {
    porque.push(`el sondeo no llegó al final (${c.fallo}): se arranca en N0 y el gobernador decidirá`);
    return { inicial: 0, techo: 1, porque };
  }
  if (!c.webgl2) {
    porque.push('sin WebGL2 no hay ni N0 de three r185: se deja todo al mínimo');
    return { inicial: 0, techo: 0, porque };
  }
  if (POR_SOFTWARE.test(c.grafica)) {
    porque.push(`«${c.grafica}» pinta por software: N0 y sin subir`);
    return { inicial: 0, techo: 0, porque };
  }

  let techo: NivelDeCalidad = c.tactil ? 2 : 3;
  if (c.tactil) porque.push('aparato táctil: el techo es N2 (N3 es para PC con gráfica dedicada)');

  if (!c.mediaFlotante) {
    techo = NIVEL_MAS_BAJO(techo, 1);
    porque.push('no se pudo CREAR un blanco HalfFloat: sin compositor pleno, techo N1');
  }
  if (!c.flotanteEnVertices) {
    techo = 0;
    porque.push('una textura flotante no se lee en el sombreador de vértices: los esqueletos no funcionarían; N0');
  }
  if (c.texturaMaxima < 4096) {
    techo = NIVEL_MAS_BAJO(techo, 1);
    porque.push(`texturas de ${String(c.texturaMaxima)} como mucho: gráfica vieja, techo N1`);
  }

  let inicial: NivelDeCalidad;
  const modesto =
    MOVIL_MODESTO.test(c.grafica) ||
    (c.memoriaGb !== null && c.memoriaGb <= 2) ||
    (c.nucleos !== null && c.nucleos <= 2) ||
    (c.tactil && c.memoriaGb !== null && c.memoriaGb <= 3 && c.nucleos !== null && c.nucleos <= 4);
  if (modesto) {
    inicial = 0;
    porque.push('pistas de aparato modesto (gráfica, memoria o núcleos): se arranca en N0');
  } else if (c.tactil) {
    inicial = 1;
    porque.push('móvil o tableta sin pistas de modesto: se arranca en N1, como pide el diseño');
  } else if (DEDICADA_DE_PC.test(c.grafica)) {
    inicial = 3;
    porque.push(`«${c.grafica}» parece una gráfica dedicada de PC: se arranca en N3`);
  } else if (c.grafica === '') {
    inicial = 1;
    porque.push('el navegador no dice qué gráfica hay: se arranca en N1');
  } else {
    inicial = 2;
    porque.push(`«${c.grafica}» parece una gráfica integrada de PC: se arranca en N2`);
  }

  if (inicial > techo) {
    porque.push(`el arranque (N${String(inicial)}) no puede pasar del techo: N${String(techo)}`);
    inicial = techo;
  }
  return { inicial, techo, porque };
}
