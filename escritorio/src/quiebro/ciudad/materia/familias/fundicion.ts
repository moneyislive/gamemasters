/**
 * LA FUNDICIÓN DE LAS TAPAS: la familia 9 (fundición de tapa) de `FAMILIA` (`../familias.ts`). Lo que la lleva:
 * las tapas de alcantarilla y su marco, las rejillas de los imbornales, los registros de servicios y las rejas de
 * los alcorques (`tapas.ts`, O2-SUELO).
 *
 * ═══ QUÉ PIEZA ES: LA PARTE ENTERA DE LA `u`, DE 10 EN 10 ═══
 *
 * `tapas.ts` escribe la UV de sus caras de arriba como METROS desde el centro de la pieza, alineados con x y z, y
 * le suma a la `u` diez veces el número de la pieza (`PIEZA_DE_FUNDICION`): 0 tapa, 1 rejilla con los barrotes
 * sucediéndose a lo largo de x, 2 registro, 3 marco, 4 reja de alcorque, 5 rejilla con los barrotes sucediéndose a
 * lo largo de z. Aquí se deshace:
 * `pieza = floor(u / 10 + 0,5)` y `q = uv − (10·pieza, 0)`. Como `q` va en metros de mundo alineados con x y z,
 * el gradiente del dibujo en `q` ES el gradiente en (x, z), y la normal sale con `normalPorGradienteQ` sin
 * tangentes ni derivadas. Los cantos (normal horizontal) no llevan dibujo: sólo el hierro gastado.
 *
 * ═══ EL DIBUJO, EN RELIEVE POR LA NORMAL ═══
 *
 *   · La tapa: rombos en relieve de 5,5 cm hasta 0,27 m del centro, un cordón en 0,3 y el canto liso.
 *   · La rejilla: barrotes de 2,5 cm con la ranura entre ellos, que es un HUECO (se ve oscuro, como el pozo).
 *   · El registro: estrías en diagonal cada 3 cm.
 *   · El marco: liso, lo más gastado de todo.
 *   · La reja del alcorque: cuadrícula de agujeros de 3,5 cm cada 6 cm.
 *
 * Lo alto está GASTADO: pulido por las ruedas y los pies, brilla como hierro (metal alto, rugosidad baja); lo hondo
 * guarda mugre y óxido (una lectura de ruido). El relieve se apaga cuando el píxel ya no lo ve (`pxMundoQ`), y
 * entonces el color y el brillo van a su media: a 10 m una tapa es una mancha de hierro, no un centelleo.
 *
 * La firma es fija: `SuperficieQ superficieFundicionQ(EntradaQ e)`. `superficieQ` la llama sólo con
 * `MATERIA_Q >= 1` (en N0 no se reparten familias, y `tapas.ts` escribe allí las piezas con la familia 0). Reglas
 * de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`, `fwidth` ni `texture()` aquí; toda lectura con
 * `textureLod` y un lod de `lodQ`; nada que decida; y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 *
 * NECESITA que el material que la reparte pase la UV del molde en `EntradaQ.uv` (el contrato de §2.2: «la UV del
 * molde, metros»). Con otra UV, la pieza sale como una tapa lisa.
 */

/** La familia 9, fundición de tapa. */
export const GLSL_FAMILIA_FUNDICION = /* glsl */ `
/* (valor, derivada) de smoothstep(a, b, x). */
vec2 escalonFundicionQ(float a, float b, float x) {
  float t = clamp((x - a) / (b - a), 0.0, 1.0);
  return vec2(t * t * (3.0 - 2.0 * t), 6.0 * t * (1.0 - t) / (b - a));
}
SuperficieQ superficieFundicionQ(EntradaQ e) {
  SuperficieQ s = superficieNeutraQ(e);
  #if MATERIA_Q >= 1
  float pieza = floor(e.uv.x * 0.1 + 0.5);
  vec2 q = e.uv - vec2(10.0 * pieza, 0.0);
  float px = pxMundoQ;
  float cerca = 1.0 - smoothstep(0.004, 0.014, px);
  /* h: 0 lo hondo, 1 lo alto (gastado); g: su gradiente en (x, z) por metro; hueco: 1 = se ve por dentro. */
  float h = 0.85;
  vec2 g = vec2(0.0);
  float hueco = 0.0;
  float hMedio = 0.85;
  float huecoMedio = 0.0;
  if (e.n.y > 0.6) {
    if (pieza < 0.5) {
      /* LA TAPA: rombos (cuadros girados 45 grados) hasta 0,27 m, el cordón en 0,3 y el canto liso. */
      float r = length(q);
      vec2 w = vec2(q.x + q.y, q.y - q.x) * (0.7071 / 0.055);
      vec2 f = fract(w) - 0.5;
      vec2 af = abs(f);
      vec2 sd = escalonFundicionQ(0.26, 0.36, max(af.x, af.y));
      vec2 gw = -sd.y * (af.x > af.y ? vec2(sign(f.x), 0.0) : vec2(0.0, sign(f.y))) * (0.7071 / 0.055);
      vec2 gRombo = vec2(gw.x - gw.y, gw.x + gw.y);
      float dentro = 1.0 - smoothstep(0.255, 0.27, r);
      vec2 a1 = escalonFundicionQ(0.285, 0.298, r);
      vec2 a2 = escalonFundicionQ(0.312, 0.325, r);
      float cordon = a1.x * (1.0 - a2.x);
      vec2 gCordon = (a1.y * (1.0 - a2.x) - a1.x * a2.y) * q / max(r, 1e-4);
      h = max((1.0 - sd.x) * dentro, cordon);
      g = (1.0 - sd.x) * dentro > cordon ? gRombo * dentro : gCordon;
      h = r > 0.335 ? 0.9 : h;
      hMedio = 0.55;
    } else if (pieza < 1.5 || pieza > 4.5) {
      /* LA REJILLA: barrotes de 2,5 cm cada 5 cm, redondos por arriba; entre ellos, la ranura. */
      float a = pieza < 1.5 ? q.x : q.y;
      float fb = fract(a / 0.05) - 0.5;
      float barrote = 1.0 - smoothstep(0.22, 0.28, abs(fb));
      h = barrote * (1.0 - 0.5 * (fb / 0.25) * (fb / 0.25));
      float dh = -barrote * (fb / 0.25) * (1.0 / 0.25) * (1.0 / 0.05);
      g = pieza < 1.5 ? vec2(dh, 0.0) : vec2(0.0, dh);
      hueco = 1.0 - barrote;
      hMedio = 0.45;
      huecoMedio = 0.5;
    } else if (pieza < 2.5) {
      /* EL REGISTRO: estrías en diagonal cada 3 cm. */
      float fe = fract((q.x + q.y) * (0.7071 / 0.03)) - 0.5;
      vec2 se = escalonFundicionQ(0.15, 0.3, abs(fe));
      h = 1.0 - se.x;
      g = -se.y * sign(fe) * vec2(1.0, 1.0) * (0.7071 / 0.03);
      hMedio = 0.6;
    } else if (pieza < 3.5) {
      /* EL MARCO: liso y lo más gastado. */
      h = 0.95;
      hMedio = 0.95;
    } else {
      /* LA REJA DEL ALCORQUE: agujeros cuadrados de 3,5 cm cada 6 cm. */
      vec2 fr = abs(fract(q / 0.06) - 0.5);
      float agujero = (1.0 - smoothstep(0.27, 0.31, fr.x)) * (1.0 - smoothstep(0.27, 0.31, fr.y));
      h = 1.0 - agujero;
      hueco = agujero;
      hMedio = 0.65;
      huecoMedio = 0.34;
    }
  }
  h = mix(hMedio, h, cerca);
  hueco = mix(huecoMedio, hueco, cerca);
  /* Lo hondo guarda mugre y óxido; lo alto es hierro pulido. */
  float oxido = smoothstep(0.45, 0.75, ruidoT(e.p.xz * 6.0 + 19.0, lodQ(6.0)));
  vec3 hondo = e.albedo * mix(vec3(0.75), vec3(1.0, 0.72, 0.48), oxido * 0.7);
  vec3 alto = mix(e.albedo * 1.6, vec3(0.3, 0.295, 0.285), 0.55);
  s.albedo = mix(hondo, alto, h) * (1.0 - 0.92 * hueco);
  s.rug = mix(mix(e.acabado.rug, 0.75, oxido * 0.4), 0.28, h);
  s.rug = mix(s.rug, 0.95, hueco);
  s.metal = mix(e.acabado.metal * 0.5, 0.8, h) * (1.0 - hueco);
  s.n = normalPorGradienteQ(e.n, vec3(g.x, 0.0, g.y) * 0.003, cerca);
  #endif
  return s;
}
`;
