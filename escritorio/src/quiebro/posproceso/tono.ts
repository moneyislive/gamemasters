/**
 * EL TONO PROPIO DE N0: el mapeo tonal de three con la gradación de la noche dentro, en cada material.
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * N0 no tiene pases: la escena se pinta directa en el lienzo y el único sitio donde se puede tocar el
 * color es el final de cada sombreador, donde three aplica el mapeo tonal (`tonemapping_fragment`).
 * Sin esto N0 sería una ciudad ACES neutra y N1-N3 una ciudad verde-cian: dos juegos distintos según
 * el aparato. El diseño lo llama «tono en el material» (§8, fila «Posproceso» de N0).
 *
 * three tiene para esto una puerta oficial: `renderer.toneMapping = CustomToneMapping` llama a la
 * función `CustomToneMapping` del trozo `tonemapping_pars_fragment`, que de fábrica devuelve el color
 * tal cual. Aquí se sustituye ESA línea por ACES seguido de la gradación (`glslDeLaGradacion`, con las
 * mismas constantes que la LUT de N1-N3). Afecta sólo a los programas que se compilan con
 * `CustomToneMapping`: el resto de la casa usa ACES y no ve el cambio.
 *
 * ═══ POR QUÉ NO VA POR EL PARCHEADOR DE LA ATMÓSFERA ═══
 *
 * `atmosfera/parcheo.ts` se presenta como la única capa que toca los sombreadores de three, y lo es
 * para `onBeforeCompile`, que es una función POR MATERIAL que se pisan unos a otros. Esto no es eso:
 * es el trozo GLOBAL de three que la propia three ofrece para sustituirse, no toca `onBeforeCompile`
 * de nadie y no puede pisar un retoque. Queda dicho aquí para que nadie lo busque allí.
 *
 * ═══ UNA LÍNEA QUE NO SE ENCUENTRA NO SE CALLA ═══
 *
 * Si three cambia el texto de su `CustomToneMapping` de fábrica, `replace` no encuentra nada y N0 se
 * pintaría sin gradación sin decir nada. Por eso `ponerElTonoPropio` devuelve si lo consiguió, lo
 * apunta en `falloDelTono()` y lo dice UNA vez en la consola; quien lo llama cae entonces a ACES a
 * secas (el aspecto de N0 cambia, la partida no). El comprobador mira que la línea exista en la three
 * instalada, para que eso salga en rojo al subir de versión y no en la cara de un jugador.
 */
import * as THREE from 'three';
import { glslDeLaGradacion } from './gradacion';

/** La línea de fábrica de three r185 (`tonemapping_pars_fragment`), literal. */
export const LINEA_DE_FABRICA = 'vec3 CustomToneMapping( vec3 color ) { return color; }';

/** Lo que la sustituye: ACES y, encima, la gradación en espacio de pantalla aproximado (√ y ²). */
export function textoDelTonoPropio(): string {
  return `${glslDeLaGradacion()}
vec3 CustomToneMapping( vec3 color ) {
	vec3 lineal = ACESFilmicToneMapping( color );
	vec3 pantalla = gradarLaNoche( sqrt( max( lineal, vec3( 0.0 ) ) ) );
	return pantalla * pantalla;
}`;
}

/** Un trozo ya parcheado lleva esto dentro: poner el tono dos veces no hace nada. */
const MARCA = 'vec3 gradarLaNoche(';

let fallo: string | null = null;
let dicho = false;

/**
 * Sustituye la línea de fábrica en el trozo global de three. Devuelve si el tono propio está puesto
 * (ahora o de antes). Es idempotente y no se deshace nunca: deshacerlo obligaría a recompilar todo
 * lo que ya lo usa, y no estorba a quien no pida `CustomToneMapping`.
 */
export function ponerElTonoPropio(): boolean {
  const trozo = THREE.ShaderChunk.tonemapping_pars_fragment;
  if (trozo.includes(MARCA)) return true;
  if (!trozo.includes(LINEA_DE_FABRICA)) {
    fallo =
      'three ya no trae la línea de fábrica de `CustomToneMapping` en `tonemapping_pars_fragment`: ' +
      'N0 se pinta con ACES a secas, sin la gradación de la noche';
    if (!dicho) {
      dicho = true;
      console.warn(`[quiebro/tono] ${fallo}`);
    }
    return false;
  }
  THREE.ShaderChunk.tonemapping_pars_fragment = trozo.replace(LINEA_DE_FABRICA, textoDelTonoPropio());
  fallo = null;
  return true;
}

/** Por qué no se pudo poner el tono propio, o null. El banco lo enseña en rojo. */
export function falloDelTono(): string | null {
  return fallo;
}
