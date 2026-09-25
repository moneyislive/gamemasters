/**
 * LA TEXTURA DE RUIDO DE LA MATERIA: la única textura del sistema de materiales de la fase 1.
 *
 * ═══ POR QUÉ UNA TEXTURA Y NO EL HASH DE SIEMPRE ═══
 *
 * En Adreno y Mali el cuello de los sombreadores de la ciudad es la aritmética entera del hash: un
 * `fbmQ` son 4 `ruidoQ` × 4 `hashQ` × 3 `pcgQ`, y el asfalto de N1 llama siete u ocho veces a `fbmQ`.
 * La materia cambia esas cadenas de PCG por LECTURAS de una textura de 128×128 que se genera aquí, una
 * vez, con el MISMO PCG de `hash.ts`: los mismos bytes en todos los aparatos, así que su sha256 es fijo
 * y el comprobador lo vigila (`verify:quiebro-materia`, c). Medido en el prototipo con fxc sobre el
 * HLSL de ANGLE: el asfalto de N1 baja de 2.841 instrucciones a 819, y sus enteras de 1.606 a 85.
 *
 * ═══ QUÉ LLEVA CADA CANAL ═══
 *
 *   · r: la retícula de un ruido de valor. `ruidoT` hace la interpolación de Hermite encima de la
 *     bilineal del muestreador: UNA lectura por octava, donde `ruidoQ` hacía cuatro hash.
 *   · g: un «grano» ya suave y periódico, tres octavas de ruido de valor con celdas de 16, 8 y 4 téxeles.
 *   · b, a: el gradiente ANALÍTICO de ese grano (d/du, d/dv), normalizado a ±1 y guardado en 0,5 ± 0,5.
 *     Es un mapa de derivadas: la normal del grano sale de una sola lectura (`granoT`).
 *
 * Las mipmaps filtran solas: la media de r y de g es 0,5 y la del gradiente 0, así que de lejos el
 * ruido se apaga a su media y la normal se aplana sin centelleo y sin un «si está lejos». Lo que la mip
 * se come de pendiente no se tira: `VARIANZA_POR_MIP` lo tabula, y `rugosidadFiltradaQ` se lo suma a la
 * rugosidad (el antialias especular «LEAN» de pobre).
 *
 * ═══ LO QUE DECIDE NO SALE DE AQUÍ ═══
 *
 * Qué ventana está encendida, qué tienda hay, el color de una luz o dónde cae una tarjeta de reflejo
 * los sigue decidiendo `hashQ` entero, con su gemelo en `hash.ts`. Esta textura sólo ADORNA: una lectura
 * filtrada no da lo mismo bit a bit en dos GPU, y lo que JavaScript tiene que saber no puede depender
 * de eso. Y los charcos tampoco la usan: `charcoQ` y `charcoDeLaAceraQ` siguen en hash.
 *
 * ═══ EL SAMPLER SIEMPRE ATADO ═══
 *
 * La textura se genera al cargar este módulo (unos milisegundos; el tope es 20 ms en Node), antes de que
 * nadie pueda compilar un material con la materia: no hay un fotograma con `uRuidoQ` sin textura, tampoco
 * en Node. `UNIFORMES_DE_LA_MATERIA` son OBJETOS COMPARTIDOS, como `UNIFORMES_DE_LA_CIUDAD`: todos los
 * materiales llevan el mismo. Para saber si un uniforme es «el de la materia» no se compara con `===`
 * (`tsx` puede cargar dos veces un módulo y habría dos objetos iguales que no son el mismo): la textura
 * lleva una marca, `userData.materiaQ === MARCA_DE_LA_MATERIA`.
 *
 * Memoria: 65.536 B más 21.844 B de mips. La pérdida de contexto no la toca nadie: una `DataTexture` la
 * vuelve a subir three sola.
 */
import * as THREE from 'three';
import { pcg } from '../hash';

/** El lado de la textura, en téxeles. El periodo del ruido: las coordenadas se reducen módulo esto. */
export const LADO_DEL_RUIDO = 128;

/** La amplitud del gradiente del grano en el sombreador (`granoT`): la varianza se tabula con ella. */
export const AMPLITUD_DEL_GRANO = 0.35;

/** Cuántos niveles de mip tabula `VARIANZA_POR_MIP` (y lee `uVarianzaDelGranoQ[8]`). */
export const MIPS_TABULADAS = 8;

/** La marca que identifica la textura de la materia (ver la cabecera). Cambia si cambian los bytes. */
export const MARCA_DE_LA_MATERIA = 'materia-ruido-128-v1';

/** El sha256 de los bytes de la textura. Fijo: sale del PCG entero. Lo vigila `verify:quiebro-materia`. */
export const SHA_DEL_RUIDO = '5d9df310578ac622b85d6ec6d7d82bf884110dfa2b381a5e67f22da2f45ad238';

/** Las octavas del grano (canal g): celda en téxeles y peso. */
const OCTAVAS_DEL_GRANO: readonly (readonly [number, number])[] = [
  [16, 0.5],
  [8, 0.3],
  [4, 0.2],
];

/** Lo que sale de generar: los bytes RGBA8 y la varianza de pendiente que se come cada mip. */
export interface DatosDelRuido {
  readonly datos: Uint8Array;
  readonly varianza: Float32Array;
}

/**
 * Genera los bytes. Función pura: dos llamadas dan lo mismo byte a byte. La usan el singleton de abajo
 * y el comprobador (para medir el tiempo y comparar dos generaciones).
 */
export function generarElRuido(): DatosDelRuido {
  const N = LADO_DEL_RUIDO;
  const d = new Uint8Array(N * N * 4);
  /* r: la retícula. */
  for (let i = 0; i < N * N; i++) d[i * 4] = pcg(i + 40503) >>> 24;
  /* g, b, a: el grano y su gradiente analítico. */
  const reticulas = OCTAVAS_DEL_GRANO.map(([celda, peso], k) => {
    const M = N / celda;
    const L = new Float32Array(M * M);
    for (let i = 0; i < M * M; i++) L[i] = pcg(i * 7 + k * 104729 + 12345) / 4294967296;
    return { M, celda, peso, L };
  });
  const H = new Float32Array(N * N);
  const GX = new Float32Array(N * N);
  const GY = new Float32Array(N * N);
  let gmax = 1e-9;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let h = 0;
      let gx = 0;
      let gy = 0;
      for (let o = 0; o < reticulas.length; o++) {
        const { M, celda, peso, L } = reticulas[o] as (typeof reticulas)[number];
        const u = (x + 0.5) / celda;
        const v = (y + 0.5) / celda;
        const iu = Math.floor(u);
        const iv = Math.floor(v);
        const fu = u - iu;
        const fv = v - iv;
        const su = fu * fu * (3 - 2 * fu);
        const sv = fv * fv * (3 - 2 * fv);
        const du = (6 * fu * (1 - fu)) / celda;
        const dv = (6 * fv * (1 - fv)) / celda;
        const i0 = ((iu % M) + M) % M;
        const i1 = (i0 + 1) % M;
        const j0 = ((iv % M) + M) % M;
        const j1 = (j0 + 1) % M;
        const a = L[j0 * M + i0] as number;
        const b = L[j0 * M + i1] as number;
        const c = L[j1 * M + i0] as number;
        const e = L[j1 * M + i1] as number;
        const k = a - b - c + e;
        h += peso * (a + (b - a) * su + (c - a) * sv + k * su * sv);
        gx += peso * (b - a + k * sv) * du;
        gy += peso * (c - a + k * su) * dv;
      }
      const i = y * N + x;
      H[i] = h;
      GX[i] = gx;
      GY[i] = gy;
      gmax = Math.max(gmax, Math.abs(gx), Math.abs(gy));
    }
  }
  let hmin = Infinity;
  let hmax = -Infinity;
  for (let i = 0; i < N * N; i++) {
    const h = H[i] as number;
    if (h < hmin) hmin = h;
    if (h > hmax) hmax = h;
  }
  for (let i = 0; i < N * N; i++) {
    d[i * 4 + 1] = Math.round((((H[i] as number) - hmin) / (hmax - hmin)) * 255);
    d[i * 4 + 2] = Math.round((0.5 + 0.5 * ((GX[i] as number) / gmax)) * 255);
    d[i * 4 + 3] = Math.round((0.5 + 0.5 * ((GY[i] as number) / gmax)) * 255);
  }
  /*
   * La varianza de pendiente que se come cada mip: la media, en bloques de 2^L téxeles, de
   * E[g²] − E[g]², con g ya en las unidades del sombreador (× AMPLITUD_DEL_GRANO). El filtro de las mips
   * de la GPU es una caja de 2×2 por nivel, que es este bloque. Nunca negativa (el nivel 0 da un cero de
   * redondeo).
   */
  const varianza = new Float32Array(MIPS_TABULADAS);
  for (let nivel = 0; nivel < MIPS_TABULADAS; nivel++) {
    const b = 1 << nivel;
    let suma = 0;
    let bloques = 0;
    for (let by = 0; by < N; by += b) {
      for (let bx = 0; bx < N; bx += b) {
        let mx = 0;
        let my = 0;
        let m2 = 0;
        for (let y = by; y < by + b; y++) {
          for (let x = bx; x < bx + b; x++) {
            const i = y * N + x;
            const gx = ((GX[i] as number) / gmax) * AMPLITUD_DEL_GRANO;
            const gy = ((GY[i] as number) / gmax) * AMPLITUD_DEL_GRANO;
            mx += gx;
            my += gy;
            m2 += gx * gx + gy * gy;
          }
        }
        const n = b * b;
        suma += m2 / n - (mx / n) * (mx / n) - (my / n) * (my / n);
        bloques++;
      }
    }
    varianza[nivel] = Math.max(0, suma / bloques);
  }
  return { datos: d, varianza };
}

const DATOS: DatosDelRuido = generarElRuido();

/** La varianza de pendiente que se come cada mip (0-7). La lee `uVarianzaDelGranoQ[8]`. */
export const VARIANZA_POR_MIP: Float32Array = DATOS.varianza;

let textura: THREE.DataTexture | null = null;

/**
 * La textura de ruido, singleton: 128², RGBA8, repetida, con mipmaps trilineales. Es DATO, no color
 * (`NoColorSpace`): three no la convierte de sRGB.
 */
export function texturaDeRuido(): THREE.DataTexture {
  if (textura !== null) return textura;
  const t = new THREE.DataTexture(DATOS.datos, LADO_DEL_RUIDO, LADO_DEL_RUIDO, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.name = 'quiebro-materia-ruido';
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.NoColorSpace;
  t.userData.materiaQ = MARCA_DE_LA_MATERIA;
  t.needsUpdate = true;
  textura = t;
  return t;
}

/**
 * Los uniformes de la materia: OBJETOS COMPARTIDOS (ver la cabecera). `retoqueDeLaMateria` los pone en
 * todo material que la lleve; nadie más los crea.
 */
export const UNIFORMES_DE_LA_MATERIA = {
  /** La textura de ruido. Siempre atada: se genera al cargar el módulo. */
  uRuidoQ: { value: texturaDeRuido() as THREE.Texture },
  /** La varianza de pendiente perdida por mip (8 números), para `rugosidadFiltradaQ`. */
  uVarianzaDelGranoQ: { value: Array.from(VARIANZA_POR_MIP) },
};

/** Bytes de la textura en la GPU, con sus mips (128² + 64² + … + 1², RGBA8). */
export function bytesDelRuido(): number {
  let bytes = 0;
  for (let lado = LADO_DEL_RUIDO; lado >= 1; lado >>= 1) bytes += lado * lado * 4;
  return bytes;
}
