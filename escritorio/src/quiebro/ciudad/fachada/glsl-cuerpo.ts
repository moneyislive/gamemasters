/**
 * EL PRINCIPIO Y EL FINAL DEL CUERPO DE LA FACHADA (lo que va después de `#include <normal_fragment_maps>`).
 *
 *   - `PREFACIO_DEL_CUERPO`, el primero: abre el bloque y DECLARA las variables que comparten todos los tramos.
 *     Lo que llega del vértice (`vCaraQ`, `vVolumenQ`, `vPlantaQ`, `vUvQ`, `vPosMundoQ`, `vNorMundoQ`) se
 *     desempaqueta aquí y en ningún otro sitio: `P`, `Ng`, `tipo`, `estilo`, `semilla`, `anchoCara`, `pb`,
 *     `techo`, `tinte`, `vanoObj`, `hp`, `bajo`, `aCam`, `dist`, `V`, `T`, `q`, `px`, `pxm`, `nV` y `vano`; y
 *     lo que los tramos van escribiendo, con su valor de partida: `albedo`, `rug`, `met`, `emision`, `nLocal`
 *     y `plano`.
 *   - `CIERRE_DEL_CUERPO`, el último (detrás de `TRAMO_DEL_ENVEJECIDO`): su primera línea cierra el `else` que
 *     abrió `TRAMO_DE_LAS_PIEZAS`; después va la rejilla de la Grafía, y al final se entrega a three lo
 *     escrito. LEE `q`, `P`, `px`, `plano`, `Ng`, `T`, `nLocal`, `rug` y `met`, y `uRejillaDeGlifos`; ESCRIBE
 *     `albedo` y `emision` (la Grafía) y los de three: `diffuseColor`, `roughnessFactor`, `metalnessFactor`,
 *     `normal` y `totalEmissiveRadiance`.
 *
 * ═══ LA GRAFÍA ES LO ÚLTIMO ═══
 *
 * El bloque de `uRejillaDeGlifos` (la rejilla verde-cian de la Bajada) tiene que ser lo último que toca el
 * color: detrás de él nadie escribe `albedo` ni `emision`, o la Bajada dejaría ver el muro de debajo. Lo marca
 * la marca `FIN-DE-LA-GRAFIA`, justo detrás del bloque, para que lo mire un comprobador. Es un comentario:
 * no cambia el programa; es la única línea del texto que no estaba antes de partir `fachadas.ts`.
 */
/** El prefacio del cuerpo: el primer tramo, después de `#include <normal_fragment_maps>`. */
export const PREFACIO_DEL_CUERPO = /* glsl */ `
{
  vec3 P = vPosMundoQ;
  vec3 Ng = normalize(vNorMundoQ);
  float tipo = vCaraQ.w;
  int estilo = int(vCaraQ.y + 0.5);
  /* La semilla es un entero, pero llega interpolada: 41234 puede entrar como 41233,998 en un píxel y
     el hash da otra ventana. Sin redondear, cada cristal era un rayado de estática. */
  float semilla = floor(vCaraQ.z + 0.5);
  float anchoCara = vCaraQ.x;
  float pb = vVolumenQ.x;
  float techo = vVolumenQ.y;
  float tinte = vVolumenQ.z;
  float vanoObj = vVolumenQ.w;
  float hp = vPlantaQ.x;
  int bajo = int(vPlantaQ.y + 0.5);
  vec3 aCam = cameraPosition - P;
  float dist = length(aCam);
  vec3 V = aCam / max(dist, 1e-4);
  vec3 T = vec3(Ng.z, 0.0, -Ng.x);
  vec2 q = vUvQ;
  vec2 px = max(fwidth(q), vec2(1e-4));
  float pxm = max(px.x, px.y);
  float nV = max(1.0, floor(anchoCara / max(vanoObj, 0.5) + 0.5));
  float vano = anchoCara / nV;

  vec3 albedo = vec3(0.3);
  float rug = 0.86;
  float met = 0.0;
  vec3 emision = vec3(0.0);
  vec3 nLocal = vec3(0.0, 0.0, 1.0);
  bool plano = abs(Ng.y) > 0.5;
`;

/** El cierre: el último tramo del cuerpo, detrás de `TRAMO_DEL_ENVEJECIDO`. */
export const CIERRE_DEL_CUERPO = /* glsl */ `
  }

  if (uRejillaDeGlifos > 0.001) {
    float g = max(lineaQ(q.x, 0.6, 0.04, px.x), lineaQ(P.y, 0.6, 0.04, px.y));
    albedo *= 1.0 - 0.85 * uRejillaDeGlifos;
    emision = emision * (1.0 - uRejillaDeGlifos) + g * uRejillaDeGlifos * vec3(0.25, 1.6, 1.0);
  }
  /* FIN-DE-LA-GRAFIA */

  diffuseColor.rgb = albedo;
  roughnessFactor = rug;
  metalnessFactor = met;
  vec3 nW = plano ? Ng : normalize(T * nLocal.x + vec3(0.0, 1.0, 0.0) * nLocal.y + Ng * nLocal.z);
  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
  totalEmissiveRadiance += emision;
}
`;
