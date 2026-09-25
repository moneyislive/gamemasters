/**
 * LA PLANTA BAJA en el sombreador: una tienda cada 6 m desde el borde de la cara —persiana con pintadas,
 * escaparate encendido con su género (y su cuarto desde N1, a menos de 60 m), portal con su reja o ventana
 * baja enrejada—, la franja del rótulo y el zócalo.
 *
 * `TRAMO_DEL_BAJO` es el cuarto tramo del cuerpo (detrás de `TRAMO_DEL_HUECO`). Su primer carácter cierra el
 * `if` de las plantas que abrió `TRAMO_DEL_HUECO` (`} else if (tipo < 0.5 && !plano) {`), y su última línea
 * cierra ese `else if`.
 *
 * LEE `tipo`, `plano`, `Ng`, `anchoCara`, `q`, `pb`, `bajo`, `semilla`, `px`, `pxm`, `dist`, `V` y `T`, y los
 * uniformes `uVentanas` y `uLuzDeVentanas`; ESCRIBE `albedo`, `rug`, `met`, `emision` y `nLocal`. Dentro del
 * escaparate declara su propio `hp` (el hash del género), que tapa al de la planta sólo en ese bloque.
 *
 * ═══ LO QUE VIVE DOS VECES ═══
 *
 * El reparto de las tiendas (una cada 6 m, la última hasta el canto) y `queTiendaQ` son los de `escaparatesDe`
 * (`bajo.ts`, con `LARGO_DE_UNA_TIENDA`) y `queTienda` (`hash.ts`), que ponen las tarjetas de los escaparates
 * encendidos. Si se toca uno, se toca el otro.
 */
/** El cuarto tramo del cuerpo, detrás de `TRAMO_DEL_HUECO`. */
export const TRAMO_DEL_BAJO = /* glsl */ `
    } else if (tipo < 0.5 && !plano) {
      /* ─── LA PLANTA BAJA: tiendas cada 6 m (como los rótulos del barrio), portales y persianas ─── */
      bool alReves = Ng.z < -0.5 || Ng.x > 0.5;
      float a = alReves ? anchoCara - q.x : q.x;
      float nT = max(1.0, floor(anchoCara / 6.0));
      float tienda = min(floor(a / 6.0), nT - 1.0);
      float t0 = tienda * 6.0;
      float t1 = tienda >= nT - 1.0 ? anchoCara : t0 + 6.0;
      float wT = t1 - t0;
      float ft = (a - t0) / wT;
      float alto = pb - 1.5;
      vec2 cT = vec2(0.5 * wT, (alto + 0.2) * 0.5);
      vec2 mT = vec2(0.5 * wT - 0.4, (alto - 0.2) * 0.5);
      vec2 lT = vec2(ft * wT, q.y) - cT;
      vec2 ddT = abs(lT) - mT;
      float sdT = length(max(ddT, 0.0)) + min(max(ddT.x, ddT.y), 0.0);
      float hueco = bajo == 3 ? 0.0 : 1.0 - smoothstep(-pxm, 0.0, sdT);
      float franja = step(alto + 0.05, q.y);
      albedo *= mix(1.0, 0.6, franja);
      vec2 w = clamp((lT + mT) / (2.0 * mT), 0.0, 1.0);
      if (alReves) w.x = 1.0 - w.x;
      int cual = queTiendaQ(tienda, semilla, bajo == 1);
      float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(V, Ng), 0.0), 5.0);
      if (cual == 0) {
        float onda = sin(q.y * 52.0) * (1.0 - smoothstep(0.02, 0.05, px.y));
        vec3 chapa = vec3(0.19, 0.2, 0.2) * (0.8 + 0.4 * ruidoQ(q * vec2(0.8, 3.0)));
        /* Pintadas: trazos (las crestas de un ruido) dentro de una mancha, no manchas lisas. */
        vec2 qg = q + vec2(tienda * 3.1, semilla * 0.01);
        float zona = smoothstep(0.48, 0.56, fbmQ(qg * 0.45));
        float trazo = 1.0 - smoothstep(0.025, 0.05 + px.x * 2.0, abs(fbmQ(qg * vec2(1.7, 2.9)) - 0.5));
        float relleno = smoothstep(0.62, 0.66, fbmQ(qg * vec2(0.9, 1.4) + 5.0)) * 0.6;
        float pintada = zona * max(trazo, relleno) * step(q.y, 2.3) * step(0.35, hashQ(vec2(tienda, 9.0), semilla));
        float hg = hashQ(vec2(tienda, 11.0), semilla);
        vec3 spray = hg < 0.3 ? vec3(0.5, 0.08, 0.3) : hg < 0.6 ? vec3(0.05, 0.3, 0.45) : hg < 0.8 ? vec3(0.55, 0.45, 0.05) : vec3(0.04);
        chapa = mix(chapa, spray, pintada);
        albedo = mix(albedo, chapa, hueco);
        met = mix(met, 0.55 * (1.0 - pintada), hueco);
        rug = mix(rug, 0.4, hueco);
        nLocal.y += onda * 0.35 * hueco;
      } else if (cual == 1) {
        float hc = hashQ(vec2(tienda, 5.0), semilla);
        vec3 colorLuz = hc < 0.5 ? vec3(0.85, 0.95, 1.0) : hc < 0.8 ? vec3(1.0, 0.78, 0.5) : vec3(1.0, 0.6, 0.85);
        /* De lejos (y en N0) el escaparate es plano, pero no liso: un fondo con baldas y género. */
        vec3 dentro;
        {
          float u = w.x * 2.0 * mT.x;
          float fila = floor((q.y - 0.4) / 0.5);
          float fy = fract((q.y - 0.4) / 0.5);
          float producto = floor(u / 0.22 + fila * 3.1);
          float hp = hashQ(vec2(producto, fila), 71.0);
          vec3 colorP = 0.3 + 0.35 * vec3(hashQ(vec2(producto, 1.0), fila + 3.0), hashQ(vec2(producto, 2.0), fila + 3.0), hashQ(vec2(producto, 4.0), fila + 3.0));
          /* El género, apagado: de lejos, cajas de colores puros eran confeti encima del cristal. */
          colorP = mix(vec3(dot(colorP, vec3(0.333))), colorP, 0.45);
          float hay = step(fy, 0.3 + 0.5 * hp) * step(0.25, hp) * step(0.4, q.y) * step(q.y, 2.4);
          float balda = (1.0 - step(0.06, fy)) * step(0.4, q.y) * step(q.y, 2.5);
          vec3 fondo = mix(vec3(0.5, 0.48, 0.45), colorP, hay);
          fondo = mix(fondo, vec3(0.6), balda);
          dentro = fondo * colorLuz * 0.55 * mix(0.55, 1.0, w.y) * (1.0 - 0.5 * smoothstep(0.1, 0.0, abs(w.x - 0.5) - 0.4));
        }
        #if NIVEL_Q >= 1
        if (dist < 60.0) {
          vec3 dLoc = vec3(dot(-V, T), -V.y, dot(V, Ng));
          vec3 tam = vec3(2.0 * mT.x, alto, 5.5);
          vec3 cerca = cuartoQ(vec2(w.x * 2.0 * mT.x, q.y), dLoc, tam, hashQ(vec2(tienda, 7.0), semilla), 1.0, colorLuz, 0.7);
          dentro = mix(cerca, dentro, smoothstep(45.0, 60.0, dist));
        }
        #endif
        float montante = max(1.0 - smoothstep(0.03, 0.03 + px.x, abs(ft - 0.5) * wT),
                             1.0 - smoothstep(0.03, 0.03 + px.y, abs(q.y - 2.4)));
        albedo = mix(albedo, mix(vec3(0.015), vec3(0.4), montante), hueco);
        met = mix(met, montante, hueco);
        rug = mix(rug, 0.06, hueco);
        emision += dentro * hueco * (1.0 - montante) * (1.0 - fresnel) * uVentanas * uLuzDeVentanas;
      } else if (cual == 2) {
        vec2 lp = vec2((ft - 0.5) * wT, q.y - 1.35);
        vec2 dp = abs(lp) - vec2(0.7, 1.35);
        float sp = length(max(dp, 0.0)) + min(max(dp.x, dp.y), 0.0);
        float puerta = 1.0 - smoothstep(-pxm, 0.0, sp);
        float vidrio = (1.0 - smoothstep(-0.18 - pxm, -0.18, sp)) * step(1.0, q.y);
        albedo = mix(albedo, vec3(0.07, 0.04, 0.025), puerta);
        rug = mix(rug, 0.5, puerta);
        /* El cristal del portal: la luz del zaguán detrás de una reja de forja. */
        float reja = max(1.0 - smoothstep(0.015, 0.015 + px.x, abs(fract(lp.x / 0.16) - 0.5) * 0.16),
                         1.0 - smoothstep(0.02, 0.02 + px.y, abs(fract((q.y - 1.0) / 0.55) - 0.5) * 0.55));
        float zaguan = hashQ(vec2(tienda, 17.0), semilla) < 0.6 ? 1.0 : 0.15;
        emision += vec3(1.0, 0.68, 0.36) * 0.16 * zaguan * mix(0.6, 1.0, (q.y - 1.0) / 1.5) * vidrio * (1.0 - reja) * uVentanas * uLuzDeVentanas;
        albedo = mix(albedo, mix(vec3(0.01), vec3(0.02), reja), vidrio);
        nLocal.xy -= (dp.x > dp.y ? vec2(sign(lp.x), 0.0) : vec2(0.0, sign(lp.y))) * (puerta - vidrio) * smoothstep(-0.18, -0.05, sp) * 0.6;
      } else if (bajo == 1) {
        /* Ventana baja con reja: un hueco de 1,4 × 1,6 m con barrotes; a veces con luz. */
        vec2 lv = vec2((ft - 0.5) * wT, q.y - 1.9);
        vec2 dv = abs(lv) - vec2(0.7, 0.8);
        float sv = length(max(dv, 0.0)) + min(max(dv.x, dv.y), 0.0);
        float ventana = 1.0 - smoothstep(-pxm, 0.0, sv);
        float barrote = 1.0 - smoothstep(0.012, 0.012 + px.x, abs(fract(lv.x / 0.14) - 0.5) * 0.14);
        float luz = step(0.72, hashQ(vec2(tienda, 13.0), semilla));
        vec3 dentro = planaQ(clamp((lv + vec2(0.7, 0.8)) / vec2(1.4, 1.6), 0.0, 1.0), hashQ(vec2(tienda, 15.0), semilla), luz, vec3(1.0, 0.7, 0.4));
        albedo = mix(albedo, mix(vec3(0.015), vec3(0.02), barrote), ventana);
        rug = mix(rug, mix(0.05, 0.5, barrote), ventana);
        met = mix(met, 0.4 * barrote, ventana);
        emision += dentro * ventana * (1.0 - barrote) * (1.0 - fresnel) * uVentanas * uLuzDeVentanas;
      } else {
        albedo = mix(albedo, vec3(0.012), hueco);
        rug = mix(rug, 0.05, hueco);
        emision += vec3(0.004, 0.005, 0.006) * hueco;
      }
      /* Zócalo de granito oscuro, por debajo del hueco. */
      float zocalo = 1.0 - step(0.2, q.y);
      albedo = mix(albedo, vec3(0.08, 0.08, 0.075), zocalo * (1.0 - hueco));
    }`;
