/**
 * LAS PIEZAS DE LA FACHADA QUE NO SON FACHADA: la azotea (`TIPO.tejado`), el techo del soportal, la
 * barandilla de los balcones (con su `discard`), y el muro de partida de todo lo demás —la medianera y el
 * relieve (cornisas, pretiles, pilares, casetas, el depósito de madera y la chapa de la maquinaria)—.
 *
 * `TRAMO_DE_LAS_PIEZAS` es el segundo tramo del cuerpo (detrás de `PREFACIO_DEL_CUERPO`). Es una cadena de
 * `if` por el tipo de cara cuyo último `else {` se queda ABIERTO: dentro van la fachada con sus huecos
 * (`TRAMO_DEL_HUECO`), la planta baja (`TRAMO_DEL_BAJO`) y el envejecido (`TRAMO_DEL_ENVEJECIDO`), y lo
 * cierra la primera línea de `CIERRE_DEL_CUERPO`.
 *
 * LEE `tipo`, `estilo`, `semilla`, `tinte`, `vano`, `pb`, `hp`, `q`, `P`, `px` y `pxm`, y `uVentanas` y
 * `uLuzDeVentanas`; ESCRIBE `albedo`, `rug`, `met` y `emision` (y tira el píxel entre barrotes). Usa `muroQ`,
 * `lineaQ`, `hashQ`, `ruidoQ` y `fbmQ`.
 */
/** El segundo tramo del cuerpo, detrás de `PREFACIO_DEL_CUERPO`. */
export const TRAMO_DE_LAS_PIEZAS = /* glsl */ `
  if (tipo > 2.5 && tipo < 3.5) {
    /*
     * LA AZOTEA: grava y tela asfáltica a parches, con los charcos que deja la lluvia. Antes era un
     * negro liso (0,045): desde el aire el barrio eran cajas negras, y la vista aérea de las
     * referencias es justo lo contrario, azoteas claras llenas de cosas.
     */
    float n = fbmQ(P.xz * 0.35);
    float g = ruidoQ(P.xz * 5.0);
    vec3 grava = mix(vec3(0.19, 0.19, 0.175), vec3(0.27, 0.26, 0.24), n) * (0.85 + 0.3 * g * (1.0 - smoothstep(0.05, 0.2, pxm)));
    vec3 tela = vec3(0.075, 0.075, 0.072) * (0.8 + 0.4 * n);
    float parche = step(0.55, hashQ(floor(P.xz / 7.0), semilla + 3.0));
    albedo = mix(grava, tela, parche * 0.85);
    float charco = smoothstep(0.6, 0.66, fbmQ(P.xz * 0.23 + semilla * 0.01));
    albedo *= 1.0 - 0.5 * charco;
    rug = mix(0.93, 0.08, charco);
  } else if (tipo > 4.5) {
    /* El techo del soportal: yeso sucio y, cada 4 m, un plafón encendido. */
    albedo = vec3(0.22, 0.21, 0.19) * (0.8 + 0.3 * fbmQ(P.xz * 0.8));
    float plafon = 1.0 - smoothstep(0.18, 0.18 + pxm, length(fract(P.xz / 4.0) - 0.5) * 4.0);
    emision += vec3(1.0, 0.8, 0.55) * 1.6 * plafon * uVentanas * uLuzDeVentanas;
  } else if (tipo > 3.5) {
    /* Barandilla de hierro: barrotes cada 12 cm, pasamanos y travesaño. u a lo largo, v de 0 a 0.95. */
    float barra = 1.0 - smoothstep(0.012, 0.012 + px.x, abs(fract(q.x / 0.12) - 0.5) * 0.12);
    float pasamanos = step(0.9, q.y);
    float traves = 1.0 - smoothstep(0.02, 0.02 + px.y, abs(q.y - 0.1));
    float hierro = max(max(barra, pasamanos), traves);
    /* De lejos los barrotes son más finos que un píxel: en vez de tramar (que parece nieve), la
       barandilla se vuelve un paño oscuro macizo, que es como se lee un balcón a 40 m. */
    float lejos = smoothstep(0.015, 0.03, px.x);
    if (lejos < 0.5 && hierro < 0.5) discard;
    albedo = vec3(0.015);
    met = 0.5;
    rug = 0.45;
  } else {
    albedo = muroQ(estilo, q, tinte, semilla, vano, pb, hp, px, rug);
    if (tipo > 0.5 && tipo < 1.5) {
      albedo = mix(vec3(0.33, 0.31, 0.28), vec3(0.24, 0.22, 0.2), fbmQ(q * 0.12 + semilla * 0.01));
      rug = 0.9;
    }
    if (tipo > 1.5) {
      albedo = estilo == 3 ? vec3(0.35, 0.37, 0.4) : vec3(0.48, 0.45, 0.4) * (0.85 + 0.2 * fbmQ(q * 0.7));
      met = estilo == 3 ? 0.8 : 0.0;
      rug = estilo == 3 ? 0.35 : 0.8;
      if (estilo == 6) {
        /* La madera del depósito de agua: duelas verticales y los aros de hierro. */
        float duela = lineaQ(q.x, 0.18, 0.02, px.x);
        float aro = lineaQ(q.y, 0.7, 0.05, px.y);
        albedo = vec3(0.2, 0.13, 0.08) * (0.8 + 0.3 * fbmQ(q * vec2(4.0, 0.3))) * (1.0 - 0.35 * duela);
        albedo = mix(albedo, vec3(0.05), aro);
        rug = 0.85;
      } else if (estilo == 7) {
        /* Chapa galvanizada de la maquinaria y las patas. */
        albedo = vec3(0.34, 0.35, 0.35) * (0.8 + 0.3 * fbmQ(q * 1.7));
        met = 0.5;
        rug = 0.5;
      }
    }`;
