/**
 * LA CARROCERÍA: la familia 11 (carrocería) de `FAMILIA` (`../familias.ts`). Lo que la lleva: la chapa pintada de
 * los coches aparcados y de los de lo cercano (`coches.ts`).
 *
 *   · N1+: el BARNIZ (sólo con su marca: la pieza lo pide con `acabado(…, { barniz: true })`), que en N1 refleja el
 *     muro sin rejilla (rugosidad del barniz 0,22) y desde N2 la rejilla de ventanas nítida (0,02).
 *   · N2+: las COSTURAS de las puertas (en lo que mira de lado, del estribo a la cintura: una ranura oscura de 3 mm
 *     que se apaga cuando el píxel pasa de 2 cm) y las GOTAS en lo horizontal (capó, techo, maletero): perlas de
 *     lluvia sobre el barniz, por el grano de la materia, que se apagan cuando el píxel pasa de 8 mm.
 *   · N3: los REGUEROS, agua sucia que baja por los costados desde las lunas.
 *
 * TODO lo de esta familia lo paga el sombreador del mobiliario entero (el reparto de `superficieQ` compila todas
 * las familias en el mismo texto, y fxc las cuenta todas), así que en N1 lleva lo justo: medido con fxc sobre el
 * mobiliario con la materia cableada (`materia/prueba.ts`), las costuras en N1 costaban unas 60 instrucciones. La
 * SUCIEDAD BAJA (el polvo y el barro que salpican las ruedas) no es de aquí: va en el color de los vértices del
 * estribo (`coches.ts`), que no le cuesta nada al sombreador y se ve también en N0.
 *
 * ═══ QUÉ CARROCERÍA ES ═══
 *
 * Las costuras no están en el mismo sitio en un compacto que en una furgoneta. El número de carrocería viaja en la
 * UV del cuerpo (`coches.ts`, `NUMERO_DE_CARROCERIA`): `u` es la x del coche en metros y `v` la altura (en lo que
 * mira de lado) o la z (en lo de arriba), más 10 por el número. `COSTURAS_DE_LA_CARROCERIA` es la tabla de cada
 * número, y el texto de abajo sale de ella.
 *
 * Reglas de la materia (`../glsl.ts`): nada de derivadas ni de `texture()` aquí, toda lectura con `textureLod` y
 * un lod de `lodQ`, nada que decida, y lo que sube de nivel dentro de su `#if MATERIA_Q >= n`. La firma es fija:
 * `SuperficieQ superficieCarroceriaQ(EntradaQ e)`.
 */

/** Las costuras de cada carrocería, por su número (`NUMERO_DE_CARROCERIA` de `coches.ts`). Metros, en el coche. */
export const COSTURAS_DE_LA_CARROCERIA: readonly {
  /** Las tres costuras verticales de las puertas: el canto de delante, el del pilar B y el de atrás. */
  readonly puertas: readonly [number, number, number];
  /** Hasta dónde suben (la cintura). */
  readonly alto: number;
}[] = [
  /* 0 compacto */ { puertas: [0.72, -0.47, -1.22], alto: 0.875 },
  /* 1 berlina */ { puertas: [0.9, -0.12, -1.12], alto: 0.875 },
  /* 2 familiar */ { puertas: [0.9, -0.12, -1.12], alto: 0.875 },
  /* 3 furgoneta */ { puertas: [1.25, 0.28, -0.72], alto: 1.75 },
  /* 4 taxi */ { puertas: [0.9, -0.12, -1.12], alto: 0.875 },
];

const n = (x: number): string => x.toFixed(3);

/** La familia 11, carrocería. */
export const GLSL_FAMILIA_CARROCERIA = /* glsl */ `
const vec4 COSTURAS_Q[5] = vec4[5](${COSTURAS_DE_LA_CARROCERIA.map((c) => `vec4(${c.puertas.map(n).join(', ')}, ${n(c.alto)})`).join(', ')});
SuperficieQ superficieCarroceriaQ(EntradaQ e) {
  SuperficieQ s = superficieNeutraQ(e);
  #if MATERIA_Q >= 1
  if (e.acabado.barniz) {
    s.barniz = 1.0;
    #if MATERIA_Q >= 2
    s.rugBarniz = 0.02;
    #else
    s.rugBarniz = 0.22;
    #endif
  }
  #endif
  #if MATERIA_Q >= 2
  /* Las costuras de las puertas. */
  float k = floor(e.uv.y * 0.1 + 0.5);
  vec4 c = COSTURAS_Q[int(clamp(k, 0.0, 4.0))];
  float v = e.uv.y - 10.0 * k;
  vec3 d = abs(e.uv.xxx - c.xyz);
  float costura = (1.0 - smoothstep(0.003, 0.003 + pxMundoQ * 1.5, min(min(d.x, d.y), d.z))) * step(0.33, v) * step(v, c.w) * step(abs(e.n.y), 0.55) * step(pxMundoQ, 0.02);
  s.albedo *= 1.0 - 0.7 * costura;
  /* Las gotas en lo horizontal, que se apagan con la distancia. */
  vec3 g = granoT(e.p.xz * 22.0, lodQ(22.0));
  float gota = smoothstep(0.64, 0.74, g.x) * step(0.7, e.n.y) * step(pxMundoQ, 0.008);
  s.n = normalize(s.n - vec3(g.y, 0.0, g.z) * (2.2 * gota));
  #endif
  #if MATERIA_Q >= 3
  /* Los regueros: agua sucia que baja por los costados. */
  float reguero = smoothstep(0.62, 0.8, granoT(vec2(e.uv.x * 9.0, v * 0.55), lodQ(9.0)).x) * step(0.34, v) * step(abs(e.n.y), 0.55) * step(pxMundoQ, 0.015);
  s.albedo *= 1.0 - 0.2 * reguero;
  #endif
  return s;
}
`;
