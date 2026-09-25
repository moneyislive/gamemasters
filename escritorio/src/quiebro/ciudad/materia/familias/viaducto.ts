/**
 * EL HORMIGÓN DEL VIADUCTO: la familia 14 (hormigón del viaducto) de `FAMILIA` (`../familias.ts`). Lo que la lleva:
 * los pilares y las vigas del Elevado (`viaducto.ts`).
 *
 * En N1 no hace nada (se pliega en el reparto): todo lo de esta familia lo paga el mobiliario entero, porque
 * `superficieQ` compila todas las familias en el mismo texto, y en N1 no cabía (medido con fxc sobre el mobiliario
 * con la materia cableada).
 *
 *   · N2+: los CHORRETONES: bajo cada junta de la viga (cada 24 m) el agua que ha bajado años por el alma deja una
 *     mancha oscura que se abre hacia abajo; bajo los apoyos, la mancha baja por el capitel y el fuste del pilar, en
 *     vetas. Y el moteado del hormigón. Todo de UNA lectura del grano de la materia.
 *   · N3: el árido por normal, que se apaga pasado 3 cm de píxel.
 *
 * La UV (`viaducto.ts`): en la viga `u` es la coordenada de mundo a lo largo del eje y `v` la altura; en el pilar
 * `u` rodea el fuste y `v` es la altura. La viga y el pilar se distinguen por la altura: la viga arranca en
 * `ALTO_DEL_VIADUCTO` (la cabeza de los pilares).
 *
 * Reglas de la materia (`../glsl.ts`): nada de derivadas ni de `texture()` aquí, toda lectura con `textureLod` y un
 * lod de `lodQ`, nada que decida, y lo que sube de nivel dentro de su `#if MATERIA_Q >= n`. La firma es fija:
 * `SuperficieQ superficieViaductoQ(EntradaQ e)`.
 */
import { ALTO_DEL_VIADUCTO } from '../../../../../../shared/arcade/juegos/quiebro-ciudad';

/** Cada cuánto van las juntas de la viga (metros de mundo a lo largo del eje): las mismas que dibuja `viaducto.ts`. */
export const JUNTAS_DEL_VIADUCTO = 24;

const n = (x: number): string => x.toFixed(3);

/** La familia 14, hormigón del viaducto. */
export const GLSL_FAMILIA_VIADUCTO = /* glsl */ `
SuperficieQ superficieViaductoQ(EntradaQ e) {
  SuperficieQ s = superficieNeutraQ(e);
  #if MATERIA_Q >= 2
  /* Una lectura, estirada en vertical: el moteado y las vetas de los chorretones. */
  float y = e.p.y;
  float g = granoT(vec2(e.uv.x * 4.0, y * 0.5), lodQ(4.0)).x;
  float viga = step(${n(ALTO_DEL_VIADUCTO - 0.02)}, y);
  float dj = abs(e.uv.x - ${n(JUNTAS_DEL_VIADUCTO)} * floor(e.uv.x * ${n(1 / JUNTAS_DEL_VIADUCTO)} + 0.5));
  float junta = (1.0 - smoothstep(0.1, 0.9, dj - (${n(ALTO_DEL_VIADUCTO + 0.9)} - y) * 0.35)) * viga * (0.6 + 0.4 * g);
  float apoyo = smoothstep(0.55, 0.7, g) * smoothstep(${n(ALTO_DEL_VIADUCTO - 3.2)}, ${n(ALTO_DEL_VIADUCTO - 0.2)}, y) * (1.0 - viga);
  s.albedo *= (0.9 + 0.2 * g) * (1.0 - 0.45 * max(junta, apoyo) * step(abs(e.n.y), 0.7));
  #endif
  #if MATERIA_Q >= 3
  /* El árido por normal, apagado con la distancia. */
  vec3 a = granoT(vec2(e.uv.x, y) * 40.0, lodQ(40.0));
  s.n = normalize(s.n + vec3(a.y, 0.0, a.z) * (0.3 * step(pxMundoQ, 0.03)));
  #endif
  return s;
}
`;
