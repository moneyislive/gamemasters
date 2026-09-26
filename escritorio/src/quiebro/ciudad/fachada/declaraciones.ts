/**
 * LAS DECLARACIONES DEL SOMBREADOR DE LA FACHADA: los atributos que lee el vértice, los `varying` con que se
 * los pasa al fragmento y los uniformes que el fragmento lee. Es lo primero del texto: todo lo de `glsl-*.ts`
 * las usa.
 *
 * ═══ CÓMO SE MONTA EL TEXTO DE LA FACHADA ═══
 *
 * El texto va partido en tramos CONTIGUOS (uno o dos por fichero de `fachada/`), y `fachadas.ts` los pega en
 * su orden sin envolverlos en funciones. Cada tramo empieza con un salto de línea; si acaba también con uno (la
 * comilla de cierre en su propia línea), entre él y el siguiente queda una línea en blanco. Desde la ola 2 del
 * plan del detalle el texto ya no es el de antes de partir `fachadas.ts` (la materia, el relieve, el
 * envejecimiento): lo que sigue valiendo es el orden de los tramos y lo que cada uno lee y escribe.
 *
 * Las declaraciones del fragmento son cuatro tramos, en este orden: `DECLARACIONES_DEL_FRAGMENTO` (aquí),
 * `GLSL_COMUN_DE_LA_FACHADA` (`glsl-comun.ts`), `GLSL_DEL_MURO` (`glsl-muro.ts`) y `GLSL_DEL_HUECO`
 * (`glsl-hueco.ts`). El cuerpo son seis: el prefacio (`glsl-cuerpo.ts`), las piezas (`glsl-piezas.ts`), el
 * hueco (`glsl-hueco.ts`), el bajo (`glsl-bajo.ts`), el envejecido (`glsl-envejecer.ts`) y el cierre
 * (`glsl-cuerpo.ts`).
 *
 * ═══ LOS ATRIBUTOS ═══
 *
 * Los del muro los escribe `atributosDelMuro` (`caras.ts`), y los del relieve cada escritor de relieve (el
 * remate, los balcones, el soportal, `cajaDeRelieve`). Lo que lleva cada uno:
 *   - `aCara`: el ancho de la cara, el estilo, la semilla de la cara (en `cajaDeRelieve`, el subtipo de
 *     relieve; 0 es lo de siempre) y qué es la cara (`TIPO`, en `tipos-de-cara.ts`);
 *   - `aVolumen`: la altura de la planta baja, el techo del volumen, el SUBESTILO, la CIMA y el TINTE, y el vano.
 *     En el muro, `subestilo + 4·cima + tinte` con el tinte en [0,001; 0,989] (el subestilo: el aparejo, el
 *     mortero, la piedra, la variedad por edificio; la cima: 1 en el volumen más alto del edificio, el de la
 *     corona); en el relieve, el tinte a secas (subestilo 0, cima 0). Se lee con `floor(z + 0,0005)`: una
 *     interpolación que dé 2,9999999 en vez de 3 no cambia de subestilo. Su gemela JS, `desempaquetarElVolumen`;
 *   - `aPlanta`: la altura de planta y, en `y`, un entero EMPAQUETADO: `bajo + 4·patrón + 32·edad` (qué hay
 *     en el bajo, `BAJO`; el reparto de los balcones, `patronDeBalcon`, 0-7; la edad del edificio, 0-7). El
 *     relieve escribe el bajo a secas (patrón y edad 0). Lo desempaqueta `desempaquetarLaPlantaQ`, aquí,
 *     con su gemela en `caras.ts` (`desempaquetarLaPlanta`); `verify:quiebro-ciudad` (paredes, e) las hace
 *     dar la vuelta con todos los bajos, patrones y edades.
 *
 * ═══ LO QUE LOS TRAMOS SE DEJAN UNOS A OTROS ═══
 *
 * `paredQ` es 1 donde se ve la fábrica y 0 en un hueco (el cristal y el recerco de una ventana, el hueco de una
 * tienda): lo ponen el hueco (`glsl-hueco.ts`) y el bajo, y lo lee el envejecido, que es quien pone el relieve
 * de la fábrica y el agua. Es una variable global con su valor de partida: cada píxel empieza en 1.
 */
/** Los atributos del vértice y los `varying` que los llevan al fragmento. Va después de `#include <common>`. */
export const DECLARACIONES_DEL_VERTICE = /* glsl */ `
attribute vec4 aCara;
attribute vec4 aVolumen;
attribute vec2 aPlanta;
varying vec4 vCaraQ;
varying vec4 vVolumenQ;
varying vec2 vPlantaQ;
varying vec2 vUvQ;
`;

/** Lo que pone el vértice después de `#include <uv_vertex>`: los atributos, al fragmento. */
export const PASO_DE_LOS_ATRIBUTOS = 'vCaraQ = aCara;\nvVolumenQ = aVolumen;\nvPlantaQ = aPlanta;\nvUvQ = uv;';

/**
 * El desempaquetado de `aPlanta.y` en el GLSL: `(bajo, patrón, edad)`. Escrito con `float` y `floor` a propósito:
 * los enteros son exactos en coma flotante hasta 2^24 y las divisiones son por potencias de dos, así que da lo
 * mismo en la GPU que evaluado en JS (`verify:quiebro-ciudad`, paredes e). Su gemela es `desempaquetarLaPlanta`.
 */
export const GLSL_DESEMPAQUETAR_LA_PLANTA = /* glsl */ `
vec3 desempaquetarLaPlantaQ(float y) {
  float c = floor(y + 0.5);
  float edad = floor(c / 32.0);
  float resto = c - 32.0 * edad;
  float patron = floor(resto / 4.0);
  return vec3(resto - 4.0 * patron, patron, edad);
}
`;

/** Los `varying` y los uniformes del fragmento: el primer tramo de lo que va antes de `#include <lights_pars_begin>`. */
export const DECLARACIONES_DEL_FRAGMENTO = /* glsl */ `
varying vec4 vCaraQ;
varying vec4 vVolumenQ;
varying vec2 vPlantaQ;
varying vec2 vUvQ;
uniform float uVentanas;
uniform float uRejillaDeGlifos;
uniform float uLuzDeVentanas;
uniform float uVentanasEncendidas;
uniform float uClaridad;
uniform float uHumedad;
float paredQ = 1.0;
${GLSL_DESEMPAQUETAR_LA_PLANTA}`;
