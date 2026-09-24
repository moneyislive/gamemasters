/**
 * LA GRADACIÓN DE LA NOCHE: el color del Quiebro, escrito UNA vez en números. Sin `three`.
 *
 * ═══ QUÉ BUSCA ═══
 *
 * La paleta del §1 del diseño: verde-cian de pantalla vieja para el código, ámbar de farola de sodio
 * para todo lo que es del jugador y magenta de neón para los rótulos. La gradación empuja lo NEUTRO
 * —asfalto, fachadas, gente, niebla— hacia el verde-cian en las sombras y le quita un poco de
 * saturación, hunde los negros, y deja en paz lo VIVO: un color saturado (el ámbar, el magenta, el
 * verde de la Grafía) no se tiñe y hasta gana un punto. El resultado es una ciudad apagada en la que
 * sólo brilla lo que tiene que leerse.
 *
 * ═══ LOS TRES PASOS, Y POR QUÉ EN ESTE ORDEN ═══
 *
 *   1. HUNDIR LOS NEGROS por la luma, escalando los tres canales a la vez: así no cambia ni el tono ni
 *      la saturación de un color oscuro (hundir canal a canal saturaría los oscuros). La pendiente en
 *      el cero es `hundimientoMinimo` y a partir de `hundimientoHasta` ya no se toca nada.
 *   2. TEÑIR LAS SOMBRAS multiplicando (no sumando: sumar levantaría el negro, que acabamos de
 *      hundir), y sólo en lo que no está protegido. El peso cae de 1 en el negro a 0 en
 *      `sombrasHasta`.
 *   3. SATURACIÓN alrededor de la luma: `saturacionNeutra` para lo neutro, `saturacionViva` para lo
 *      protegido.
 *
 * LO PROTEGIDO se mide con la saturación HSV (croma / máximo), no con la croma a secas: un ámbar de
 * sodio en sombra (0,30; 0,18; 0,05) tiene poca croma absoluta pero es tan ámbar como el de la farola,
 * y teñirlo de verde lo volvería barro. Lo casi negro (máximo por debajo de 0,02) no se protege: ahí
 * la «saturación» es ruido.
 *
 * ═══ DÓNDE SE USA, Y POR QUÉ HAY DOS COPIAS DE LA FÓRMULA ═══
 *
 *   · N1-N3: `tablaDeLaLut` evalúa `gradar` en una rejilla de 32³ y el pase «uber» la lee como
 *     textura 3D. Es la fórmula exacta, en espacio de pantalla (sRGB).
 *   · N0: no hay pases, así que la gradación va DENTRO de cada material, en el mapeo tonal propio
 *     (`tono.ts`). `glslDeLaGradacion` escribe la MISMA fórmula en GLSL con las MISMAS constantes
 *     (salen de este objeto, no se copian a mano), con una sola aproximación: el paso a pantalla es
 *     `sqrt` en vez de la curva sRGB, porque va en cada píxel de cada material del aparato más flojo.
 *
 * El comprobador (`escritorio/scripts/verificar-quiebro-calidad.ts`) mira las propiedades que importan:
 * el gris en sombra sale verde-cian, el negro se hunde, el blanco sigue blanco, el ámbar y el magenta
 * no cambian de tono, la rampa de grises no se da la vuelta, y la LUT es la fórmula en sus nudos.
 */

export interface AjustesDeLaGradacion {
  /** Pendiente en el negro: cuánto queda de un color muy oscuro (0,55 = se hunde un 45 %). */
  readonly hundimientoMinimo: number;
  /** Luma de pantalla a partir de la cual ya no se hunde nada. */
  readonly hundimientoHasta: number;
  /** Tinte multiplicativo de las sombras (rojo, verde, azul): verde-cian. */
  readonly tinteDeSombras: readonly [number, number, number];
  /** Luma de pantalla en la que el tinte ya se ha apagado del todo. */
  readonly sombrasHasta: number;
  /** Saturación HSV a partir de la cual un color empieza a protegerse, y la de protección completa. */
  readonly protegeDesde: number;
  readonly protegeDelTodo: number;
  /** Saturación final de lo neutro y de lo protegido (1 = sin tocar). */
  readonly saturacionNeutra: number;
  readonly saturacionViva: number;
}

/** El color de la noche. Provisional hasta verlo en el banco en aparato; se cambia AQUÍ. */
export const GRADACION_DE_LA_NOCHE: AjustesDeLaGradacion = {
  hundimientoMinimo: 0.55,
  hundimientoHasta: 0.22,
  tinteDeSombras: [0.86, 1.06, 1.03],
  sombrasHasta: 0.55,
  protegeDesde: 0.4,
  protegeDelTodo: 0.8,
  saturacionNeutra: 0.88,
  saturacionViva: 1.08,
};

/** Lado de la LUT: 32³ basta con interpolación trilineal y cabe en 128 kB. */
export const LADO_DE_LA_LUT = 32;

/** Los pesos de la luma (Rec. 709), los mismos que usa three en `luminance()`. */
export const PESOS_DE_LA_LUMA: readonly [number, number, number] = [0.2126, 0.7152, 0.0722];

function suave(borde0: number, borde1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - borde0) / (borde1 - borde0)));
  return t * t * (3 - 2 * t);
}

function luma(r: number, g: number, b: number): number {
  return PESOS_DE_LA_LUMA[0] * r + PESOS_DE_LA_LUMA[1] * g + PESOS_DE_LA_LUMA[2] * b;
}

/** Cuánto se protege un color (0 = neutro, se tiñe; 1 = vivo, no se toca). */
export function proteccion(r: number, g: number, b: number, a: AjustesDeLaGradacion = GRADACION_DE_LA_NOCHE): number {
  const mayor = Math.max(r, g, b);
  const menor = Math.min(r, g, b);
  const saturacion = (mayor - menor) / Math.max(mayor, 1e-4);
  return suave(a.protegeDesde, a.protegeDelTodo, saturacion) * suave(0.02, 0.1, mayor);
}

/** La gradación de un color de PANTALLA (sRGB, 0..1). Devuelve otro color de pantalla, acotado. */
export function gradar(
  r0: number,
  g0: number,
  b0: number,
  a: AjustesDeLaGradacion = GRADACION_DE_LA_NOCHE,
): [number, number, number] {
  const p = proteccion(r0, g0, b0, a);

  /* 1. Hundir los negros por la luma: el tono y la saturación no cambian. */
  const l0 = luma(r0, g0, b0);
  const h = a.hundimientoMinimo + (1 - a.hundimientoMinimo) * suave(0, a.hundimientoHasta, l0);
  let r = r0 * h;
  let g = g0 * h;
  let b = b0 * h;

  /* 2. Teñir las sombras de lo que no está protegido, multiplicando. */
  const peso = (1 - suave(0, a.sombrasHasta, l0 * h)) * (1 - p);
  r *= 1 + (a.tinteDeSombras[0] - 1) * peso;
  g *= 1 + (a.tinteDeSombras[1] - 1) * peso;
  b *= 1 + (a.tinteDeSombras[2] - 1) * peso;

  /* 3. Saturación alrededor de la luma: menos en lo neutro, un punto más en lo vivo. */
  const s = a.saturacionNeutra + (a.saturacionViva - a.saturacionNeutra) * p;
  const l = luma(r, g, b);
  r = l + (r - l) * s;
  g = l + (g - l) * s;
  b = l + (b - l) * s;

  return [Math.min(1, Math.max(0, r)), Math.min(1, Math.max(0, g)), Math.min(1, Math.max(0, b))];
}

/**
 * La LUT 3D en bytes RGBA, con el rojo como eje más rápido (así la sube `Data3DTexture`: x = rojo,
 * y = verde, z = azul). Cada nudo es `gradar` del color exacto de ese nudo.
 */
export function tablaDeLaLut(lado: number = LADO_DE_LA_LUT, a: AjustesDeLaGradacion = GRADACION_DE_LA_NOCHE): Uint8Array {
  const datos = new Uint8Array(lado * lado * lado * 4);
  const paso = 1 / (lado - 1);
  for (let azul = 0; azul < lado; azul++) {
    for (let verde = 0; verde < lado; verde++) {
      for (let rojo = 0; rojo < lado; rojo++) {
        const [r, g, b] = gradar(rojo * paso, verde * paso, azul * paso, a);
        const i = ((azul * lado + verde) * lado + rojo) * 4;
        datos[i] = Math.round(r * 255);
        datos[i + 1] = Math.round(g * 255);
        datos[i + 2] = Math.round(b * 255);
        datos[i + 3] = 255;
      }
    }
  }
  return datos;
}

/** Un número como literal GLSL (siempre con punto decimal, que `1` a secas es un entero en GLSL). */
export function flotanteGlsl(n: number): string {
  const texto = n.toFixed(6).replace(/0+$/, '');
  return texto.endsWith('.') ? `${texto}0` : texto;
}

/**
 * La misma gradación en GLSL, para N0 (va dentro de cada material). Recibe y devuelve color de
 * PANTALLA aproximado (quien la llama pasa de lineal a pantalla con `sqrt` y vuelve con el cuadrado).
 * Las constantes salen de `a`: cambiar la gradación es cambiar el objeto, y las dos copias siguen.
 */
export function glslDeLaGradacion(a: AjustesDeLaGradacion = GRADACION_DE_LA_NOCHE): string {
  const f = flotanteGlsl;
  const [lr, lg, lb] = PESOS_DE_LA_LUMA;
  const [tr, tg, tb] = a.tinteDeSombras;
  return /* glsl */ `
vec3 gradarLaNoche( vec3 c ) {
	const vec3 PESOS = vec3( ${f(lr)}, ${f(lg)}, ${f(lb)} );
	float mayor = max( c.r, max( c.g, c.b ) );
	float menor = min( c.r, min( c.g, c.b ) );
	float p = smoothstep( ${f(a.protegeDesde)}, ${f(a.protegeDelTodo)}, ( mayor - menor ) / max( mayor, 0.0001 ) ) * smoothstep( 0.02, 0.1, mayor );
	float l0 = dot( c, PESOS );
	float h = ${f(a.hundimientoMinimo)} + ${f(1 - a.hundimientoMinimo)} * smoothstep( 0.0, ${f(a.hundimientoHasta)}, l0 );
	c *= h;
	float peso = ( 1.0 - smoothstep( 0.0, ${f(a.sombrasHasta)}, l0 * h ) ) * ( 1.0 - p );
	c *= vec3( 1.0 ) + ( vec3( ${f(tr)}, ${f(tg)}, ${f(tb)} ) - vec3( 1.0 ) ) * peso;
	float s = ${f(a.saturacionNeutra)} + ${f(a.saturacionViva - a.saturacionNeutra)} * p;
	float l = dot( c, PESOS );
	return clamp( vec3( l ) + ( c - vec3( l ) ) * s, 0.0, 1.0 );
}`;
}
