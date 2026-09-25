/**
 * EL ENVEJECIDO DE LA FACHADA: la suciedad del pie, los regueros (N1+), las manchas grandes de humedad y
 * polvo, la rugosidad del mojado abajo, el degradado del cañón de la calle y la oclusión del pie del muro.
 *
 * `TRAMO_DEL_ENVEJECIDO` es el quinto tramo del cuerpo (detrás de `TRAMO_DEL_BAJO`), dentro del `else` que
 * abrió `TRAMO_DE_LAS_PIEZAS`: se aplica al muro, a la medianera y al relieve, no a la azotea, al techo del
 * soportal ni a la barandilla.
 *
 * LEE `plano`, `tipo`, `estilo`, `semilla`, `q`, `P` y `px`; ESCRIBE `albedo` y `rug`. Usa `ruidoQ`, `fbmQ` y
 * el define `NIVEL_Q`.
 */
/** El quinto tramo del cuerpo, detrás de `TRAMO_DEL_BAJO`. */
export const TRAMO_DEL_ENVEJECIDO = /* glsl */ `
    /* ─── SUCIEDAD Y AGUA ─── */
    if (!plano) {
      float sucio = (1.0 - smoothstep(0.0, 2.5, P.y)) * 0.3;
      #if NIVEL_Q >= 1
      float reguero = smoothstep(0.6, 0.78, fbmQ(vec2(q.x * 2.2, q.y * 0.16) + semilla * 0.013)) * 0.3
        * (1.0 - smoothstep(0.03, 0.12, px.x));
      #else
      float reguero = 0.0;
      #endif
      /* Manchas grandes de humedad y de polvo, en todos los niveles: un muro de ciudad nunca es de un
         solo tono, y de lejos es lo único que le quita el aspecto de maqueta. */
      float manchas = ruidoQ(q * vec2(0.09, 0.05) + semilla * 0.37);
      if (estilo != 3 && estilo != 5) albedo *= (1.0 - sucio - reguero) * (0.86 + 0.24 * manchas);
      rug = mix(rug, rug * 0.55, 1.0 - smoothstep(0.0, 1.8, P.y));
      /* El cañón de la calle: abajo llega menos cielo que arriba. Un degradado suave que asienta los
         edificios en la calle y hace que las plantas altas, más claras, den la escala. */
      albedo *= mix(0.78, 1.0, smoothstep(1.5, 22.0, P.y));
      /* Y el pie del muro, donde se junta con la acera: metro y medio que se oscurece (la oclusión que
         no hay). Sin él, la fachada parecía posada sobre el suelo en vez de salir de él. */
      if (tipo < 0.5) albedo *= mix(0.58, 1.0, smoothstep(0.0, 1.5, P.y - 0.15));
    }`;
