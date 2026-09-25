/**
 * LAS DECLARACIONES DEL SOMBREADOR DE LA FACHADA: los atributos que lee el vértice, los `varying` con que se
 * los pasa al fragmento y los uniformes que el fragmento lee. Es lo primero del texto: todo lo de `glsl-*.ts`
 * las usa.
 *
 * ═══ CÓMO SE MONTA EL TEXTO DE LA FACHADA ═══
 *
 * El texto va partido en tramos CONTIGUOS (uno o dos por fichero de `fachada/`), y `fachadas.ts` los pega en
 * su orden sin envolverlos en funciones: pegados, dan el texto de siempre byte a byte (salvo la marca `FIN-DE-LA-GRAFIA` de
 * la Grafía, ver `glsl-cuerpo.ts`). Cada tramo empieza con un salto de línea; si acaba también con uno (la
 * comilla de cierre en su propia línea), entre él y el siguiente queda una línea en blanco. Quien toque un
 * tramo, que lo sepa: una línea en blanco de más o de menos es otro texto, y otro sha.
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
 *     relieve; 0 es lo de hoy) y qué es la cara (`TIPO`, en `tipos-de-cara.ts`);
 *   - `aVolumen`: la altura de la planta baja, el techo del volumen, el tinte y el vano;
 *   - `aPlanta`: la altura de planta y qué hay en el bajo (`BAJO`).
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
`;
