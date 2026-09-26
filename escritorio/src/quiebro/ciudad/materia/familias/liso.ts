/**
 * LO LISO: la familia 0 (liso) de `FAMILIA` (`../familias.ts`). Lo que la lleva: el acabado de hoy sin
 * materia: lo que no dice familia (la tabla `ACABADO`, el tráfico del barrio, el agua de la fuente, el cromo).
 * Lo liso es la rugosidad y el metal del acabado, tal cual: devuelve su entrada, y su receta es toda ceros.
 *
 * ═══ Y LA RECETA COMÚN DEL MOBILIARIO ═══
 *
 * Este texto va el PRIMERO de las familias (`GLSL_DE_CADA_FAMILIA`, por número), así que lo que se declara aquí
 * lo ven todas las demás. Es el motor de las familias del mobiliario (O2-MOBILIARIO: hierro, madera, piedra,
 * hormigón, caucho, plástico, chapa y ondulada).
 *
 * POR QUÉ UNA RECETA Y NO UNA RAMA POR FAMILIA. Medido con fxc sobre el HLSL de ANGLE (N1, el mobiliario de la
 * ventana): con una rama propia por familia, cada una con su lectura de variación, su mojado y su normal, las
 * ocho costaban 438 instrucciones, y el reparto solo, con ocho ramas que escriben albedo, rugosidad, metal y
 * normal, 144: el compilador no comparte nada entre ramas. Con la receta, las ocho familias son una FILA de
 * números en una tabla constante (`RECETAS_MOQ`, que fxc indexa en una instrucción) y el trabajo se hace UNA vez
 * por píxel, sea de la familia que sea: una lectura de variación, una normal, un mojado. Cada familia sigue en su
 * fichero (`familias/<nombre>.ts`) con su fila y su rama; la rama queda para lo que una receta no sepa hacer, y
 * las del mobiliario hoy no lo necesitan: devuelven su entrada.
 *
 * LA FILA de una familia, cuatro `vec4` (`RecetaDeLaFamilia`):
 *
 *   0 · tono     la variación GRANDE en el albedo (una lectura a unos 3 m): dos bancos no son del mismo tono
 *       gris     el gris de la intemperie (la madera vieja pierde el color, más donde le da la lluvia)
 *       poro     lo que oscurece al mojarse (1 madera y hormigón; 0,1 lo pintado)
 *       pintura  1: pintado. La superficie es dieléctrica (metal 0) y el METAL del acabado es el de debajo, que
 *                sólo asoma donde se gasta el canto. Así N0, que no reparte familias, lo pinta como siempre.
 *   1 · escala u, escala v   el grano (N2+), en téxeles por metro de la UV del molde (anisótropo: la veta)
 *       relieve  la amplitud del grano en la normal, en metros
 *       mota     el grano en el albedo (el moteado del granito, el árido del hormigón, la veta)
 *   2 · pie      la mugre al pie (N2+): la salpicadura de la acera, hasta unos 60 cm
 *       canto    con la marca de chaflán (N2+): > 0, la pintura SALTA a trozos (de 3 a 6 cm, pocos y de borde
 *                roto: dos lecturas) y deja el metal desnudo; < 0, la madera se pule (más clara y más lisa, donde
 *                se sienta la gente)
 *       onda     la chapa ondulada: número de onda en `u` (la onda vertical de un contenedor); con la marca de
 *                chaflán, ×1,66 en `v` (las lamas de una persiana, 12 cm). N1: sólo en el color; N2+: en la normal
 *       reguero  la mugre que escurre en regueros verticales (N2+)
 *   3 · óxido    el óxido (N3): en los regueros y en lo desnudo
 *       pegatinas  la parte de casillas de 0,6 × 0,45 m con pegatina (N3), por hash (adorno, no decide nada): con
 *                marco, cabecera, renglones sin letras, desteñida por arriba y despegada a trozos (una lectura)
 *       desnudo  la luminancia del metal de debajo de la pintura
 *       capa     la capa del horno de la fase 2 (`microRelieveQ`), o −1: la puerta está, neutra con `MICRO_Q` 0
 *
 * El motor (`recetaMoQ`) lo llama el cuerpo del mobiliario después de repartir (`materiales.ts`). Las familias
 * de otros paquetes no tienen fila (ceros: el motor no les hace nada, salvo el mojado de la humedad, que con
 * poro 0 tampoco) y pueden pedir una.
 *
 *   · `humedadMoQ`: lo mojada que está la noche, 0-1 (`uHumedad`). Una GLOBAL con valor por omisión, no un
 *     uniforme: este texto entra en TODO material que lleve la materia (fachada, suelo, lo lejano), y un
 *     uniforme que no declarara alguno de ellos rompería su compilación. El mobiliario la rellena.
 *   · `pieMoQ(y)`: 1 al pie de una pieza posada en la acera y 0 a partir de unos 60 cm.
 *
 * Por nivel: N1 la variación, el gris, la pintura, las lamas en el color y el mojado (unas 40 instrucciones de
 * fxc en todo el motor); N2 el grano, la normal, la mugre, el canto y los regueros; N3 el óxido y las pegatinas.
 * Lo que decide sigue en `hashQ`; esto sólo adorna.
 *
 * La firma es fija: `SuperficieQ superficieLisoQ(EntradaQ e)`. `superficieQ` la llama sólo con `MATERIA_Q
 * >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`,
 * `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la normal sale
 * de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida (eso es
 * `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */
import { RECETA_DEL_CAUCHO } from './caucho';
import { RECETA_DE_LA_CHAPA, RECETA_DE_LA_ONDULADA } from './chapa';
import { RECETA_DEL_HIERRO } from './hierro';
import { RECETA_DEL_HORMIGON } from './hormigon';
import { RECETA_DE_LA_MADERA } from './madera';
import { RECETA_DE_LA_PIEDRA } from './piedra';
import { RECETA_DEL_PLASTICO } from './plastico';

/** Una fila de la receta: cuatro `vec4` (ver la cabecera). */
export type RecetaDeLaFamilia = readonly [
  readonly [tono: number, gris: number, poro: number, pintura: number],
  readonly [escalaU: number, escalaV: number, relieve: number, mota: number],
  readonly [pie: number, canto: number, onda: number, reguero: number],
  readonly [oxido: number, pegatinas: number, desnudo: number, capa: number],
];

/** La receta que no hace nada (lo liso, y las familias que no tienen fila). */
export const RECETA_NEUTRA: RecetaDeLaFamilia = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, -1],
];

/** Cuántas familias caben en la tabla (los números de `FAMILIA` van de 0 a 14). */
export const FAMILIAS_EN_LA_RECETA = 16;

/** Las filas por número de familia: las del mobiliario; las demás, neutras. */
export const RECETAS_POR_FAMILIA: Readonly<Record<number, RecetaDeLaFamilia>> = {
  0: RECETA_NEUTRA,
  1: RECETA_DEL_HIERRO,
  2: RECETA_DE_LA_MADERA,
  3: RECETA_DE_LA_PIEDRA,
  4: RECETA_DEL_HORMIGON,
  5: RECETA_DEL_CAUCHO,
  6: RECETA_DEL_PLASTICO,
  7: RECETA_DE_LA_CHAPA,
  8: RECETA_DE_LA_ONDULADA,
};

/** Un número como literal GLSL de coma flotante. */
function flotante(x: number): string {
  const s = String(x);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

/** La tabla constante del sombreador: `FAMILIAS_EN_LA_RECETA` × 4 `vec4`, en el orden de la cabecera. */
function tablaDeLasRecetas(): string {
  const filas: string[] = [];
  for (let f = 0; f < FAMILIAS_EN_LA_RECETA; f++) {
    const r = RECETAS_POR_FAMILIA[f] ?? RECETA_NEUTRA;
    for (const v of r) filas.push(`vec4(${v.map(flotante).join(', ')})`);
  }
  return `const vec4 RECETAS_MOQ[${String(FAMILIAS_EN_LA_RECETA * 4)}] = vec4[${String(FAMILIAS_EN_LA_RECETA * 4)}](\n  ${filas.join(',\n  ')}\n);`;
}

/** La familia 0, liso, y la receta común del mobiliario (ver la cabecera). */
export const GLSL_FAMILIA_LISO = /* glsl */ `
${tablaDeLasRecetas()}
float humedadMoQ = 0.5;
float pieMoQ(float y) {
  return 1.0 - smoothstep(0.18, 0.6, y);
}
void recetaMoQ(inout SuperficieQ s, EntradaQ e) {
  int f = clamp(e.acabado.familia, 0, ${String(FAMILIAS_EN_LA_RECETA - 1)}) * 4;
  vec4 r0 = RECETAS_MOQ[f];
  vec4 r2 = RECETAS_MOQ[f + 2];
  vec4 r3 = RECETAS_MOQ[f + 3];
  float v = ruidoT(e.p.xz * 0.37 + vec2(e.p.y * 0.23, 17.0), lodQ(0.37));
  s.albedo *= 1.0 + r0.x * (v - 0.5);
  float gris = dot(s.albedo, vec3(0.3, 0.5, 0.2)) * 1.4 + 0.01;
  s.albedo = mix(s.albedo, vec3(gris), r0.y * (1.0 - v) * (0.6 + 0.4 * max(e.n.y, 0.0)));
  float lamas = e.acabado.chaflan ? 1.0 : 0.0;
  float k = r2.z * (1.0 + 0.66 * lamas);
  float t = mix(e.uv.x, e.uv.y, lamas);
  float cabe = step(0.001, k) * (1.0 - smoothstep(0.25, 0.5, pxMundoQ * k * 0.159));
  s.albedo *= 1.0 - 0.2 * cabe * smoothstep(0.2, 1.0, -sin(t * k));
  float desnudo = 0.0;
  #if MATERIA_Q >= 2
  vec4 r1 = RECETAS_MOQ[f + 1];
  float escala = max(r1.x, r1.y);
  float lodG = lodQ(max(escala, 1.0));
  vec3 g = granoT(e.uv * r1.xy, lodG);
  s.albedo *= 1.0 + r1.w * (g.x - 0.5);
  /* El grano también en el brillo: lo oscuro, más liso. De noche lo que más se ve de una pieza es el reflejo del
     cielo falso (la luz difusa es poca), y una veta sólo en el albedo casi no se veía. */
  s.rug *= 1.0 + 0.3 * r1.w * (0.5 - g.x);
  vec2 pendiente = g.yz * r1.xy * r1.z + vec2(1.0 - lamas, lamas) * cos(t * k) * k * mix(0.006, 0.0035, lamas) * cabe;
  s.n = normalPorDerivadasQ(s.n, pendiente, 1.0);
  float gano = r1.z * escala;
  s.rug = rugosidadFiltradaQ(s.rug, varianzaPerdidaQ(lodG) * gano * gano);
  s.albedo *= 1.0 - r2.x * pieMoQ(e.p.y);
  if (e.acabado.chaflan && r2.y != 0.0) {
    /* El desconchón: saltados de 3 a 6 cm, pocos, con el borde roto por un ruido fino (no motas sueltas de 2 cm,
       que en la chapa mojada se leían como sal; ni manchas de 10 cm, que en la pata del banco eran camuflaje). De
       lejos la mip lleva las dos lecturas a su media y el saltado se apaga: no centellea. */
    float base = ruidoT(e.uv * 20.0 + vec2(e.p.y * 7.0, 5.0), lodQ(20.0));
    float roto = ruidoT(e.uv * 60.0 + vec2(0.0, e.p.y * 21.0), lodQ(60.0));
    float mancha = smoothstep(0.84, 0.88, base + 0.3 * (roto - 0.5));
    desnudo = max(r2.y, 0.0) * mancha;
    float pulido = max(-r2.y, 0.0);
    s.albedo *= 1.0 + 0.3 * pulido;
    s.rug *= 1.0 - 0.25 * pulido;
  }
  float reguero = 0.0;
  if (r2.w + r3.x > 0.0) {
    /* Regueros finos (celdas de 6 cm a lo ancho), que bajan de lo alto y se juntan al pie. */
    reguero = smoothstep(0.6, 0.85, ruidoT(vec2(e.uv.x * 16.0, e.p.y * 1.2), lodQ(16.0))) * (1.0 - abs(e.n.y));
  }
  float mugre = r2.w * reguero;
  s.albedo = mix(s.albedo, s.albedo * 0.45 + 0.01, mugre * 0.7);
  s.rug = mix(s.rug, 0.75, mugre * 0.5);
  #endif
  vec3 metal = vec3(r3.z);
  #if MATERIA_Q >= 3
  /* El óxido, pardo y no naranja (de lejos, una mancha naranja grande se lee como un resplandor), y sobre todo en
     los últimos 30 cm, donde se para el agua: en una cara estrecha (el canto de la pata de un banco) el reguero la
     cubre entera, y a toda la altura era camuflaje. */
  float oxido = r3.x * reguero * (0.1 + 0.9 * pieMoQ(e.p.y + 0.1));
  s.albedo = mix(s.albedo, vec3(0.07, 0.03, 0.013), oxido);
  s.rug = mix(s.rug, 0.85, oxido);
  metal = mix(metal, vec3(0.11, 0.05, 0.025), 0.25 * step(0.001, r3.x));
  if (r3.y > 0.0 && abs(e.n.y) < 0.5) {
    /* LAS PEGATINAS: una por casilla de 0,6 × 0,45 m (en la parte r3.y de ellas, por hash), con su tamaño, sitio y color.
       Dentro, en metros desde su esquina de abajo: un marco claro de 1 cm, una franja de cabecera de otro color,
       renglones de «texto» (rayas oscuras de largo desigual, sin letras), el sol que la destiñe por arriba y el
       borde que se despega a trozos. Todo se apaga con la huella del píxel: los renglones a partir de 6 mm, el
       marco a partir de 1 cm y la pegatina entera a partir de 3 cm, así que de lejos no centellea. */
    vec2 c = e.uv * vec2(1.0 / 0.6, 1.0 / 0.45);
    vec2 h = hash2Q(floor(c), 31.0);
    vec2 medio = vec2(0.13 + 0.17 * h.y, 0.1 + 0.12 * fract(h.x * 7.31));
    vec2 q = fract(c) - 0.5 + (h.yx - 0.5) * 0.35;
    vec2 d = abs(q) - medio;
    float px = pxMundoQ * 2.0 + 1e-4;
    vec2 mitad = medio * vec2(0.6, 0.45);
    vec2 l = q * vec2(0.6, 0.45) + mitad;
    float alto = l.y / (2.0 * mitad.y);
    float despegado = smoothstep(0.8, 0.86, ruidoT(e.uv * 28.0 + h * 97.0, lodQ(28.0)) + 0.16 * smoothstep(0.7, 1.0, max(abs(q.x) / medio.x, abs(q.y) / medio.y)));
    float pegatina = step(h.x, r3.y) * (1.0 - smoothstep(-px, px, max(d.x, d.y) * 0.5)) * (1.0 - smoothstep(0.012, 0.03, pxMundoQ)) * (1.0 - despegado);
    vec3 color = h.y < 0.3 ? vec3(0.7, 0.66, 0.55) : h.y < 0.55 ? vec3(0.45, 0.06, 0.05) : h.y < 0.8 ? vec3(0.05, 0.13, 0.32) : vec3(0.6, 0.45, 0.05);
    vec3 otro = h.y < 0.3 ? vec3(0.45, 0.06, 0.05) : vec3(0.72, 0.7, 0.62);
    float marco = (1.0 - smoothstep(0.004, 0.01, pxMundoQ)) * (1.0 - smoothstep(0.008, 0.012, min(min(l.x, 2.0 * mitad.x - l.x), min(l.y, 2.0 * mitad.y - l.y))));
    float cabecera = step(0.74, alto);
    float renglon = fract(alto * 9.0);
    float largo = 0.35 + 0.55 * fract(h.x * 13.1 + floor(alto * 9.0) * 0.37);
    float texto = step(0.18, alto) * step(alto, 0.64) * step(0.45, renglon) * step(0.08, l.x / (2.0 * mitad.x)) * step(l.x / (2.0 * mitad.x), largo) * (1.0 - smoothstep(0.003, 0.006, pxMundoQ));
    vec3 dibujo = mix(color, otro, cabecera);
    dibujo = mix(dibujo, dibujo * 0.3, texto);
    dibujo = mix(dibujo, vec3(0.75, 0.73, 0.68), marco);
    dibujo = mix(dibujo, vec3(dot(dibujo, vec3(0.3, 0.5, 0.2))) * 1.1, 0.35 * alto);
    s.albedo = mix(s.albedo, dibujo * (0.8 + 0.4 * v), pegatina);
    s.rug = mix(s.rug, 0.55, pegatina);
    desnudo *= 1.0 - pegatina;
  }
  #endif
  s.albedo = mix(s.albedo, metal, desnudo);
  s.metal = mix(s.metal, e.acabado.metal * desnudo, r0.w);
  s.rug = mix(s.rug, 0.5, desnudo);
  #if MICRO_Q >= 1
  if (r3.w >= 0.0) {
    vec4 m = microRelieveQ(int(r3.w), e.p, pxMundoQ);
    s.n = normalPorDerivadasQ(s.n, m.xy, 1.0);
    s.albedo *= 1.0 - m.z;
    s.rug = clamp(s.rug + m.w, 0.0, 1.0);
  }
  #endif
  s.albedo *= 1.0 - 0.45 * r0.z * humedadMoQ * (0.4 + 0.6 * smoothstep(0.2, 0.9, s.n.y));
}
SuperficieQ superficieLisoQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
