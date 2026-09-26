/**
 * EL PRINCIPIO Y EL FINAL DEL CUERPO DE LA FACHADA (lo que va después de `#include <normal_fragment_maps>`).
 *
 *   - `PREFACIO_DEL_CUERPO`, el primero: abre el bloque y DECLARA las variables que comparten todos los tramos.
 *     Lo que llega del vértice (`vCaraQ`, `vVolumenQ`, `vPlantaQ`, `vUvQ`, `vPosMundoQ`, `vNorMundoQ`) se
 *     desempaqueta aquí y en ningún otro sitio: `P`, `Ng`, `tipo`, `estilo`, `semilla`, `anchoCara`, `pb`,
 *     `techo`, `tinte`, `subestiloF`, `cima`, `vanoObj`, `hp`, `bajo`, `edad`, `semillaDelEdificio`, `aCam`, `dist`, `V`,
 *     `T`, `q`, `px`, `pxm`, `nV` y `vano`; y lo que los tramos van escribiendo, con su valor de partida: `albedo`,
 *     `rug`, `met`, `emision`, `nLocal` y `plano`. Pone también lo que el muro lee por globales (`subestiloQ`,
 *     `cimaQ`, `edadQ`, `distQ`, `vistaEnLaCaraQ` y `manchaDelMuroQ`, ver `glsl-muro.ts`).
 *   - `CIERRE_DEL_CUERPO`, el último (detrás de `TRAMO_DEL_ENVEJECIDO`): su primera línea cierra el `else` que
 *     abrió `TRAMO_DE_LAS_PIEZAS`; después va la rejilla de la Grafía, y al final se entrega a three lo
 *     escrito y se pide la luz de la calle con dirección (`luz-con-direccion.ts`). LEE `q`, `P`, `px`, `plano`,
 *     `Ng`, `T`, `V`, `dist`, `nLocal`, `rug` y `met`, `varianzaDelMuroQ` y `uRejillaDeGlifos`; ESCRIBE `albedo` y
 *     `emision` (la Grafía) y los de three: `diffuseColor`, `roughnessFactor`, `metalnessFactor`, `normal` y
 *     `totalEmissiveRadiance`.
 *
 * ═══ EL TAMAÑO DEL PÍXEL, SIN DERIVAR AQUÍ ═══
 *
 * `px` era `fwidth(vUvQ)`, tomado aquí, detrás del `discard` del fundido de la ventana y del de lo lejano: en un
 * GLES de móvil una derivada tras un `discard` del mismo cuadro de 2×2 no está garantizada (acta del plan, §13,
 * decisión 12). Ahora es `|dFdx| + |dFdy|` de `vUvQ` tomados por el preámbulo de la materia, que va delante de
 * todo `discard` y en flujo uniforme (la fachada le nombra la UV con `MATERIA_UV_Q`): el mismo número, bien tomado.
 *
 * ═══ LA GRAFÍA ES LO ÚLTIMO ═══
 *
 * El bloque de `uRejillaDeGlifos` (la rejilla verde-cian de la Bajada) tiene que ser lo último que toca el
 * color: detrás de él nadie escribe `albedo` ni `emision`, o la Bajada dejaría ver el muro de debajo. Lo marca
 * la marca `FIN-DE-LA-GRAFIA`, justo detrás del bloque, para que lo mire un comprobador. Es un comentario:
 * no cambia el programa. La luz con dirección va detrás y no toca el color: escribe la luz que el relieve pone o
 * quita, y se apaga con la Grafía.
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
  /* aVolumen.z = subestilo + 4·cima + tinte (declaraciones.ts): el subestilo, a salvo de un 2,9999999. */
  float subestiloF = floor(vVolumenQ.z + 0.0005);
  float tinte = vVolumenQ.z - subestiloF;
  float cima = step(3.5, subestiloF);
  subestiloF -= 4.0 * cima;
  float vanoObj = vVolumenQ.w;
  float hp = vPlantaQ.x;
  /* aPlanta.y = bajo + 4·patrón + 32·edad (declaraciones.ts). El relieve escribe el bajo a secas. */
  vec3 plantaQ = desempaquetarLaPlantaQ(vPlantaQ.y);
  int bajo = int(plantaQ.x + 0.5);
  /* La edad, de 0 a 1: la del edificio en el muro y la medianera; el relieve (cornisas, pilares) va a media. */
  float edad = tipo < 1.5 ? plantaQ.z / 7.0 : 0.45;
  /* Un número por EDIFICIO (la semilla es por cara): lo que tiene que decir lo mismo en sus cuatro caras. */
  float semillaDelEdificio = floor(tinte * 4093.0) + subestiloF * 4099.0;
  vec3 aCam = cameraPosition - P;
  float dist = length(aCam);
  vec3 V = aCam / max(dist, 1e-4);
  vec3 T = vec3(Ng.z, 0.0, -Ng.x);
  vec2 q = vUvQ;
  /* fwidth(vUvQ), con las derivadas del preámbulo de la materia (ver la cabecera de glsl-cuerpo.ts). */
  vec2 px = max(abs(dUvdxQ) + abs(dUvdyQ), vec2(1e-4));
  float pxm = max(px.x, px.y);
  float nV = max(1.0, floor(anchoCara / max(vanoObj, 0.5) + 0.5));
  float vano = anchoCara / nV;
  /* Lo que el muro lee (glsl-muro.ts), y la mancha grande del revoco y de las piezas: en N0, la única lectura del muro. */
  subestiloQ = int(subestiloF + 0.5);
  cimaQ = cima;
  edadQ = edad;
  distQ = dist;
  vistaEnLaCaraQ = vec3(dot(V, T), V.y, dot(V, Ng));
  manchaDelMuroQ = fbmT(q * vec2(0.35, 0.18) + semilla * 0.01, lodQ(0.35));

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
  #if NIVEL_Q >= 1
  /* La pendiente que la mip se comió del grano, sumada a la rugosidad: el brillo no centellea a 10-30 m. */
  roughnessFactor = rugosidadFiltradaQ(rug, varianzaDelMuroQ);
  #else
  roughnessFactor = rug;
  #endif
  metalnessFactor = met;
  vec3 nW = plano ? Ng : normalize(T * nLocal.x + vec3(0.0, 1.0, 0.0) * nLocal.y + Ng * nLocal.z);
  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
  totalEmissiveRadiance += emision;
  #if NIVEL_Q >= 1
  /*
   * LA LUZ DE LA CALLE CON DIRECCIÓN (luz-con-direccion.ts): lo único que hace leer el relieve de noche. Su brillo
   * (N3) mira sólo el chaflán de las juntas (nJ, ya apagado fuera del muro y bajo la Grafía por el envejecido).
   */
  vec3 nJ = plano ? Ng : normalize(T * pendienteDeLaJuntaQ.x + vec3(0.0, pendienteDeLaJuntaQ.y, 0.0) + Ng);
  if (!plano) luzConDireccionQ(P, Ng, T, nW, nJ, V, rug, dist, 1.0 - uRejillaDeGlifos);
  #endif
}
`;
