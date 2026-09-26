/**
 * EL ENVEJECIDO DE LA FACHADA: el relieve de la fábrica, puesto donde se ve la fábrica, y el agua y la suciedad
 * donde las deja un edificio de verdad. Sustituye al reguero de ruido de antes (un fbm que manchaba en cualquier
 * sitio) por envejecimiento con sentido arquitectónico, que es lo que hace leer una fachada a 25-60 m:
 *
 *   - el RELIEVE de `glsl-muro.ts` (pendiente, oclusión de las juntas y varianza del grano), sólo en el muro de la
 *     fachada, fuera de los huecos (`paredQ`) y apagado bajo la Grafía (`uRejillaDeGlifos` > 0,5);
 *   - el ZÓCALO de granito de los edificios de revoco, ladrillo y azulejo de subestilo 2 y 3;
 *   - las MANCHAS grandes y la suciedad del pie (todos los niveles), más cuanto más viejo el edificio;
 *   - los REGUEROS DESDE LA AZOTEA: el agua que cae del remate se lleva el polvo en tiras verticales de borde neto,
 *     largas donde más baja (de 2 a 18 m) y nunca por debajo del dintel de la planta baja, y el LAVADO A FRANJAS que
 *     las acompaña (N1+; desde N2, con su hebra);
 *   - el VELO bajo la cornisa del volumen más alto y bajo cada IMPOSTA (lo que suelta al gotear, con el borde de
 *     abajo roto por los regueros; N1+);
 *   - la HUMEDAD DEL PIE, la capilaridad: de medio metro a metro y pico (en N0, una banda; desde N1, con el borde de
 *     ruido), más alta en las ESQUINAS (dos caras chupan agua), un 20-30 % más oscura, y con la EFLORESCENCIA del
 *     salitre en su borde en N2 (con una segunda octava en N3); y las SALPICADURAS del pie (N2+);
 *   - el HOLLÍN sobre el dintel de las tiendas que tiznan (una de cada tres, en lenguas suaves; en el ladrillo, no;
 *     N1+);
 *   - el MOJADO por `uHumedad` (desde 0,45: con el tiempo de siempre, 0,55, apenas): el muro poroso al 60-70 % de
 *     su albedo y a 0,3-0,4 de rugosidad, más abajo y en los regueros, seco bajo la cornisa (N2+), con hilos de agua
 *     que escurren en N3 (con `uTiempo`, que el Remanso frena);
 *   - el degradado del cañón de la calle y la oclusión del pie del muro, los de siempre.
 *
 * Todo lo que ensucia pasa por `sucia`: el vidrio no se ensucia, la placa vidriada un punto menos (al 90 %: la lluvia
 * la lava) y lo demás entero. (Antes el azulejo no llevaba nada: los edificios de placa eran los únicos limpios de la
 * calle.)
 *
 * El chorretón bajo cada alféizar lo pone el hueco (`glsl-hueco.ts`), que es quien sabe dónde está cada uno.
 *
 * `TRAMO_DEL_ENVEJECIDO` es el quinto tramo del cuerpo (detrás de `TRAMO_DEL_BAJO`), dentro del `else` que
 * abrió `TRAMO_DE_LAS_PIEZAS`: se aplica al muro, a la medianera y al relieve, no a la azotea, al techo del
 * soportal ni a la barandilla.
 *
 * LEE `plano`, `tipo`, `estilo`, `subestiloF`, `cima`, `tinte`, `edad`, `bajo`, `semilla`, `anchoCara`, `pb`, `hp`,
 * `techo`, `q`, `P` y `Ng`, lo que dejó el muro (`pendienteDelMuroQ`, `oclusionDelMuroQ`, `varianzaDelMuroQ`,
 * `granoDelMuroQ`, `manchaDelMuroQ`, `pendienteDeLaJuntaQ`) y `paredQ`, y los uniformes `uRejillaDeGlifos`,
 * `uHumedad` y `uTiempo`; ESCRIBE `albedo`, `rug`, `nLocal`, `varianzaDelMuroQ` y `pendienteDeLaJuntaQ` (apagada
 * fuera del muro y bajo la Grafía, como el relieve). Usa la materia (`ruidoT`, `lodQ`, `humedadDelPieQ`) y el define
 * `NIVEL_Q`. TODA suma a `nLocal` de este tramo pasa por `sinGrafia` (lo mira `verify:quiebro-ciudad`, paredes d).
 *
 * ═══ EL REPARTO DE LAS TIENDAS Y DE LAS IMPOSTAS, LEÍDO Y NO DECIDIDO ═══
 *
 * El hollín necesita saber dónde está el centro de cada tienda: usa el reparto de `TRAMO_DEL_BAJO` (una cada
 * 6 m desde el borde de la cara, la última hasta el canto), y sólo para adornar. El velo de las impostas, igual,
 * con la regla de la faja de `TRAMO_DEL_HUECO` (cada forjado; en el ladrillo, uno de cada tres; en el revoco, uno de
 * cada dos). Si ese reparto cambia, el hollín o el velo se corren, pero nada que JS tenga que saber depende de esto.
 */
/** El quinto tramo del cuerpo, detrás de `TRAMO_DEL_BAJO`. */
export const TRAMO_DEL_ENVEJECIDO = /* glsl */ `
    /* ─── EL ENVEJECIDO: el relieve, el agua y la suciedad ─── */
    if (!plano) {
      /* El relieve de la fábrica (glsl-muro.ts): sólo en el muro de la fachada, fuera de los huecos, nunca bajo la Grafía. */
      float muro = tipo < 0.5 ? paredQ : 0.0;
      float sinGrafia = 1.0 - step(0.5, uRejillaDeGlifos);
      vec2 pendiente = pendienteDelMuroQ * min(1.0, 1.2 / max(length(pendienteDelMuroQ), 1e-4));
      nLocal.xy += pendiente * muro * sinGrafia;
      pendienteDeLaJuntaQ *= muro * sinGrafia;
      albedo *= mix(1.0, oclusionDelMuroQ, muro * sinGrafia);
      varianzaDelMuroQ *= muro;
      /* Lo que chupa agua (el vidrio nada, el azulejo poco), lo que se ensucia (ver la cabecera) y dónde se ve la fábrica (en la medianera y el relieve, en todas partes). */
      float poroso = estilo == 3 ? 0.0 : estilo == 5 ? 0.3 : 1.0;
      float sucia = estilo == 3 ? 0.0 : estilo == 5 ? 0.9 : 1.0;
      float fabrica = tipo < 0.5 ? paredQ : 1.0;
      /* EL ZÓCALO de granito de los edificios de revoco, ladrillo o azulejo de subestilo 2 y 3: de 0,6 a 0,9 m. */
      if (tipo < 0.5 && subestiloF > 1.5 && (estilo == 4 || estilo == 1 || estilo == 5)) {
        float altoZ = 0.6 + 0.3 * fract(tinte * 13.7);
        float zocalo = (1.0 - step(altoZ, P.y)) * paredQ;
        albedo = mix(albedo, vec3(0.12, 0.118, 0.112) * (0.8 + 0.4 * manchaDelMuroQ), zocalo);
        rug = mix(rug, 0.55, zocalo);
        #if NIVEL_Q >= 1
        nLocal.y += 0.7 * zocalo * smoothstep(altoZ - 0.03, altoZ - 0.005, P.y) * sinGrafia;
        #endif
        poroso = mix(poroso, 0.35, zocalo);
      }
      /* Manchas grandes de humedad y de polvo, en todos los niveles: un muro de ciudad nunca es de un
         solo tono, y de lejos es lo único que le quita el aspecto de maqueta. */
      float manchas = ruidoT(q * vec2(0.09, 0.05) + semilla * 0.37, lodQ(0.09));
      /* La suciedad del pie, más en los edificios viejos. */
      float sucio = (1.0 - smoothstep(0.0, 2.5, P.y)) * (0.2 + 0.2 * edad);
      float franjas = 0.5;
      float velo = 0.0;
      float reguero = 0.0;
      #if NIVEL_Q >= 1
      /* EL LAVADO A FRANJAS: la lluvia que baja por la fachada se lleva el polvo en tiras de medio metro a un metro. */
      franjas = ruidoT(vec2(q.x * 1.3 + manchaDelMuroQ * 1.7 + semilla * 0.07, q.y * 0.05), lodQ(1.3));
      float desdeArriba = techo - P.y;
      /*
       * LOS REGUEROS DESDE LA AZOTEA: donde el lavado pasa de un valor, una tira oscura de borde neto que baja del
       * remate, más larga cuanto más alto el valor (de 2 a 18 m). Del volumen más alto enteros; de uno con otro
       * encima, a media (su azotea también gotea, menos).
       */
      float largoR = 2.0 + 16.0 * smoothstep(0.55, 0.85, franjas);
      /*
       * El borde, neto pero no de cuchilla (el doble de ancho que el de 0,53-0,6 de antes). Y se acaba en el dintel de la
       * planta baja: lo de debajo (la persiana, el escaparate, los machones) se friega y se pinta; hasta el suelo, los
       * machones de ladrillo de la O salían un 10 % más oscuros que antes (la revisión del remate).
       */
      reguero = smoothstep(0.48, 0.66, franjas) * (1.0 - smoothstep(0.3 * largoR, largoR, desdeArriba)) * mix(0.55, 1.0, cima) * smoothstep(pb - 1.9, pb - 1.4, q.y);
      #if NIVEL_Q >= 2
      /* Su hebra (N2+): dentro de cada tira, hilos más finos, que es como se ve de cerca el polvo que el agua arrastra. */
      reguero *= 0.55 + 0.9 * ruidoT(vec2(q.x * 4.3 + semilla * 0.05, q.y * 0.12), lodQ(4.3));
      #endif
      /*
       * EL VELO BAJO LA CORNISA: lo que suelta al gotear, más largo donde baja un reguero. Sólo bajo la cornisa DE
       * VERDAD, la del volumen más alto (cima): el techo de la planta baja y el de un cuerpo con otro encima no
       * gotean, y con el velo en todos el paño de encima de las tiendas salía un 40 % más oscuro (la revisión 1: el
       * ladrillo de la O, «oscuro y sucio»).
       */
      velo = (1.0 - smoothstep(0.15, 1.4 + 3.0 * franjas, desdeArriba)) * (0.34 + 0.28 * edad) * cima;
      /*
       * Y BAJO CADA IMPOSTA (la faja de TRAMO_DEL_HUECO, en su reparto): lo que gotea del vuelo de la faja, medio metro
       * a metro y pico, con el borde de abajo roto por el lavado. Da el ritmo horizontal a 25-60 m.
       */
      if (tipo < 0.5 && q.y > pb && (estilo == 0 || estilo == 4 || estilo == 1)) {
        float fpI = (q.y - pb) / hp;
        float encima = floor(fpI) + 1.0;
        float tocaI = (estilo == 4 ? step(mod(encima, 2.0), 0.5) : estilo == 1 ? step(mod(encima, 3.0), 0.5) : 1.0) * step(pb + encima * hp + 0.2, techo);
        float bajoLaFaja = (1.0 - fract(fpI)) * hp;
        velo += tocaI * (1.0 - smoothstep(0.05, 0.5 + 1.2 * franjas, bajoLaFaja)) * (0.38 + 0.3 * edad);
      }
      #endif
      /*
       * El ladrillo, que no es liso ni claro, se lava a franjas y se mancha de regueros a medias: con lo mismo que la piedra
       * salía rayado de sucio. Y el polvo del pie y el velo, al 70 %: el polvo es más claro que el ladrillo y lo agrisa más
       * que oscurecerlo (con todo entero, los machones de la O salían un 13 % más oscuros que antes).
       */
      float aMedias = estilo == 1 ? 0.55 : 1.0;
      float suciedad = clamp((sucio + velo) * (estilo == 1 ? 0.7 : 1.0) + reguero * (0.22 + 0.25 * edad) * aMedias, 0.0, 0.75);
      albedo *= 1.0 - suciedad * sucia;
      albedo *= mix(1.0, (0.84 + 0.3 * manchas) * (1.0 + (franjas - 0.5) * (0.12 + 0.18 * edad) * aMedias), sucia);
      /*
       * LA HUMEDAD DEL PIE: la capilaridad sube del suelo (en N0, una banda; desde N1, con el borde de ruido), hasta
       * cuarenta centímetros más en las esquinas del edificio, donde el muro chupa por dos caras.
       */
      float esquina = tipo < 0.5 ? 1.0 - smoothstep(0.2, 1.8, min(q.x, anchoCara - q.x)) : 0.0;
      vec2 hum = humedadDelPieQ(q, P.y - 0.4 * esquina, semilla) * fabrica * poroso;
      albedo *= 1.0 - (0.2 + 0.12 * edad) * hum.x;
      #if NIVEL_Q >= 2
      /* La eflorescencia: el salitre blanco que deja el agua al secarse en el borde de la mancha. */
      float sal = hum.y * (0.4 + 0.6 * edad);
      #if NIVEL_Q >= 3
      sal *= 0.5 + ruidoT(q * vec2(9.0, 14.0) + 5.0, lodQ(14.0));
      #endif
      albedo = mix(albedo, vec3(0.52, 0.51, 0.48), clamp(sal, 0.0, 1.0) * 0.55);
      /* Las salpicaduras: el barro que sube de la acera con la lluvia, a motas, hasta 40 cm. */
      albedo *= 1.0 - 0.3 * (1.0 - smoothstep(0.05, 0.4, P.y)) * smoothstep(0.52, 0.72, granoDelMuroQ) * fabrica * poroso;
      #endif
      #if NIVEL_Q >= 1
      /*
       * EL HOLLÍN sobre el dintel de las tiendas que tiznan (bares, hornos): sube del hueco y se abre (ver la cabecera).
       * En el LADRILLO, no: sobre un paño ya oscuro y con la franja del rótulo apenas se lee, y le quitaba el tono (con el
       * 55 %, el paño de encima de las persianas de la O salía un 30 % más oscuro que antes; aun al 15 %, un 5 %: la
       * revisión del remate).
       */
      if (tipo < 0.5 && bajo == 0 && estilo != 1 && q.y > pb - 1.6 && q.y < pb + 2.5) {
        float aT = Ng.z < -0.5 || Ng.x > 0.5 ? anchoCara - q.x : q.x;
        float nT6 = max(1.0, floor(anchoCara / 6.0));
        float t6 = min(floor(aT / 6.0), nT6 - 1.0);
        float wT6 = (t6 >= nT6 - 1.0 ? anchoCara : t6 * 6.0 + 6.0) - t6 * 6.0;
        float c6 = t6 * 6.0 + 0.5 * wT6;
        /*
         * Una de cada tres tiendas: un tizne que nace en el dintel, a todo lo ancho del hueco, y sube en LENGUAS de metro y
         * medio a tres de ancho (dos senos con la fase de la tienda), de un palmo a dos metros, más altas en el medio.
         * Con una campana de Gauss por tienda era una mancha redonda en medio del paño (la primera versión del remate, la O
         * de N1). Las lenguas, suaves de lado, y los bordes de la tienda, BLANDOS (un metro): con la altura tomada del
         * lavado (que en un palmo pasa de nada a todo), cada lengua tenía un canto vertical que cruzaba el lóbulo de la
         * farola de pared (la revisión del remate, la C de N2 y N3).
         */
        float subida = q.y - (pb - 1.5);
        float hH = hashQ(vec2(t6, 19.0), semilla);
        float medioH = max(0.5 * wT6 - 0.4, 0.5);
        float dentroH = 1.0 - smoothstep(medioH - 0.8, medioH + 0.3, abs(aT - c6));
        float alturaH = 0.5 + 0.3 * sin(aT * 1.9 + hH * 37.0) + 0.2 * sin(aT * 4.3 + hH * 91.0);
        float lengua = 0.35 + 1.8 * alturaH * (1.0 - 0.5 * min(abs(aT - c6) / medioH, 1.0));
        float humo = step(hH, 0.34) * dentroH * smoothstep(-0.03, 0.04, subida) * (1.0 - smoothstep(0.0, lengua, subida));
        albedo *= 1.0 - 0.62 * humo * fabrica * sucia;
      }
      #endif
      /* EL MOJADO: con lluvia, el muro poroso oscurece y se alisa; más abajo, donde salpica, y en los regueros. */
      /* Todo el muro un poco, el pie (lo que salpica) del todo y, desde N1, los regueros: tiras del mismo ancho de arriba abajo. */
      float dondeMoja = max(0.35, 1.0 - smoothstep(0.4, 1.4, P.y));
      #if NIVEL_Q >= 1
      dondeMoja = max(dondeMoja, 0.85 * smoothstep(0.56, 0.74, franjas));
      #endif
      /*
       * Desde una humedad de 0,45: el muro se seca antes que la calle. Con 0,25 el tiempo de siempre (0,55) dejaba
       * todas las fachadas a medio mojar, más oscuras y a franjas, sin llover (la revisión 1: el ladrillo, sucio).
       */
      float mojado = smoothstep(0.45, 0.95, uHumedad) * poroso * fabrica * dondeMoja;
      #if NIVEL_Q >= 2
      /* Seco bajo el vuelo de la cornisa (la del volumen más alto, como el velo). */
      mojado *= mix(1.0, smoothstep(0.2, 1.0, techo - P.y), cima);
      #endif
      mojado = clamp(mojado, 0.0, 1.0);
      albedo *= 1.0 - 0.35 * mojado;
      rug = mix(rug, min(rug, 0.35), mojado);
      /*
       * El canto gastado es áspero: donde la JUNTA se tuerce (su chaflán, no el grano), la rugosidad sube, y la farola
       * no hace de cada chaflán un espejo. Con la pendiente de todo el relieve, el grano del vidriado subía la rugosidad
       * de la placa a manchas y el lóbulo de la farola de pared salía roto (la revisión 2, C de N2 y N3).
       */
      rug = mix(rug, max(rug, 0.75), clamp(length(pendienteDeLaJuntaQ) * 1.5, 0.0, 1.0) * muro);
      #if NIVEL_Q >= 3
      /*
       * EL AGUA QUE ESCURRE: hilos de un dedo que siguen los regueros de arriba abajo (donde el lavado pasa por un
       * valor, una línea casi vertical) y brillan a golpes que bajan con el tiempo. De cerca: más fino que un píxel,
       * sería un rayado.
       */
      float hilo = (1.0 - smoothstep(0.004, 0.02, abs(franjas - 0.68))) * (0.55 + 0.45 * smoothstep(0.2, 0.9, fract(P.y * 0.7 + uTiempo * 0.6)))
        * (1.0 - smoothstep(0.004, 0.015, pxm));
      rug = mix(rug, 0.08, hilo * mojado);
      albedo *= 1.0 - 0.15 * hilo * mojado;
      #endif
      /* El cañón de la calle: abajo llega menos cielo que arriba. Un degradado suave que asienta los
         edificios en la calle y hace que las plantas altas, más claras, den la escala. */
      albedo *= mix(0.78, 1.0, smoothstep(1.5, 22.0, P.y));
      /* Y el pie del muro, donde se junta con la acera: metro y medio que se oscurece (la oclusión que
         no hay). Sin él, la fachada parecía posada sobre el suelo en vez de salir de él. */
      if (tipo < 0.5) albedo *= mix(0.58, 1.0, smoothstep(0.0, 1.5, P.y - 0.15));
    }`;
