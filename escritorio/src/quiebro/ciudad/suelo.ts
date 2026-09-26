/**
 * EL SUELO: la calzada de asfalto mojado y las «islas» de acera, bordillo y plaza.
 *
 * ═══ ISLAS Y CALZADA, SIN NADA SUPERPUESTO ═══
 *
 * Cada manzana, con sus aceras alrededor, es una ISLA levantada 15 cm (el bordillo): una losa con su
 * canto. La calzada es lo que queda entre islas, a cota 0. Así no hay dos superficies en el mismo
 * plano —ni cruces que se pisan con calles, ni aceras que se pisan con la plaza— y no puede haber
 * parpadeo de profundidad en ninguna esquina. La calzada se trocea por las líneas de las islas en
 * rectángulos que son, cada uno, un TRAMO de calle entre dos cruces o un cruce: el tramo lleva su
 * dirección y sus extremos en un atributo, y el sombreador pinta con eso la línea discontinua, los
 * pasos de cebra en las dos bocas y el bordillo mojado, sin una sola calcomanía (que a 80 m, a 1 cm
 * del asfalto, parpadearía).
 *
 * ═══ EL ASFALTO MOJADO ═══
 *
 * Albedo del asfalto seco oscurecido por lo mojado (según `uHumedad`) y ×0,3 en los charcos; los charcos
 * salen de `charcoQ` (ruido de mundo) más la cuneta junto al bordillo, con F0 = 0,02 (agua) y rugosidad
 * casi 0, y con las ondas de las gotas desde N1. El reflejo de las luces lo ponen las TARJETAS
 * (`reflejos.ts`), que leen la misma máscara; el del cielo y del «cañón de la calle», el retoque
 * `entorno`.
 *
 * ═══ LA MATERIA DEL SUELO (plan del detalle, O2-SUELO) ═══
 *
 * El asfalto y la acera llevan la materia (`materia/`) de su nivel: el grano, las manchas y el árido salen
 * de la textura de ruido (`ruidoT`, `fbmT`, `granoT`) y no de las 7-9 `fbmQ` de antes (el cuello de un
 * teléfono es la aritmética entera del hash). Lo que DECIDE (qué losa es cuál, qué tramo lleva parche)
 * sigue siendo del hash o de una lectura EXACTA de un téxel (`ruidoT(id, 0.0)` con `id` entero lee su
 * téxel sin mezclar: un número por pieza, siempre el mismo). Lo que se ve, por nivel:
 *
 *   · N0: grano de una octava; parches rectangulares de reasfaltado con su cordón sellado; la junta
 *     longitudinal sellada; la pintura con el borde irregular y gastada en la rodada; la rigola de 0,3 m;
 *     la humedad según `uHumedad` (antes un ×0,5 fijo); el bordillo en piezas con su canto biselado por la
 *     normal y el bordillo rebajado del vado; la plaza con las juntas PREFILTRADAS y el tono por pieza; el
 *     callejón en losas de 3 × 3 m con su canaleta. Como mucho 4 lecturas y ningún `fbmQ` de adorno.
 *   · N1: más las grietas transversales, el aceite de la banda de aparcamiento, el grano en tres escalas
 *     y el árido en la normal; el almohadillado del adoquín a menos de unos 12 m; el podotáctil del vado;
 *     los chicles.
 *   · N2: más la piel de cocodrilo en las rodadas (celdas de grietas finas), los destellos del árido que se apagan con el píxel, la
 *     pintura con grosor y retrorreflexión; las bandas de la plaza cada 6 m y sus piezas partidas o repuestas; las baldosas
 *     repuestas y levantadas; el moteado y los desconchados del bordillo; y la puerta del horno
 *     (`microRelieveQ`, capas 3 asfalto y 0 piedra), neutra hasta la ola 4.
 *   · N3: más la película irisada del aceite, la cavidad de las grietas, las flechas de los carriles y el
 *     paralaje de las juntas de la plaza a menos de unos 6 m (sin escribir profundidad).
 *
 * ═══ LA HUMEDAD, EN CAPAS SOBRE LA MISMA MÁSCARA ═══
 *
 * Seco (lo que asoma del árido), húmedo (todo), película (el agua que llena el poro: las rodadas, las
 * manchas bajas, la rigola) y lámina (el charco). La orilla del charco es un halo oscuro, no un recorte. Lo
 * que NO cambia es DÓNDE hay agua: `charcoQ` y `charcoDeLaAceraQ` no se tocan, y la máscara (`ch`,
 * `charcoFinal`, la cuneta) no se escribe con términos nuevos: lo vigila `verify:quiebro-ciudad`
 * (`quiebro-ciudad/suelo.ts`, c). La máscara es lo que DECIDE, y sigue en hash: en N1-N3 la cuneta es la de
 * siempre (sus dos `fbmQ`) y la máscara sale idéntica; en N0, donde §7.4 no deja `fbmQ` fuera de los charcos,
 * la cuneta lee la materia una vez y cambia de forma junto al bordillo. El agua de las juntas y de las
 * baldosas hundidas es sólo rugosidad.
 *
 * ═══ LAS JUNTAS NO SON CROMO ═══
 *
 * La junta de la baldosa tenía rugosidad 0,08: con las luces de verdad de N3 salía como una rejilla de
 * rayas blancas donde la farola pegaba de refilón (acta del plan, §13.1). Ahora es 0,25 fuera del charco,
 * y toda junta (baldosa, adoquín, losa, bordillo) se pinta con su COBERTURA filtrada (`coberturaQ`): a lo
 * lejos se queda en su tono medio en vez de apagarse (la plaza parecía agua) o de centellear.
 *
 * Las derivadas son las del preámbulo de la materia (`dPdxQ`, `dPdyQ`): el `fwidth(P.xz)` de antes es
 * exactamente `abs(dPdxQ.xz) + abs(dPdyQ.xz)`, y aquí no se deriva nada.
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { Molde } from './geometria';
import { retoqueDeLaMateria } from './materia/retoque';
import { GLSL_CHARCOS, GLSL_ONDAS, RETOQUE_ENTORNO, RETOQUE_MUNDO, RETOQUE_SOLO_BRILLO, UNIFORMES_DE_LA_CIUDAD } from './retoques';
import type { CajaXZ, CalleDelPlano, NivelDeLaCiudad } from './tipos';
import { ALTURA_DE_LA_ACERA } from './tipos';

/** Lo que es cada trozo de calzada, en `aTramo.x`. */
const TRAMO = { cruce: 0, correX: 1, correZ: 2, lejos: 3 } as const;
/** Lo que es cada cara de una isla, en `aIsla`… ver `ATRIBUTOS_DE_LAS_ISLAS`. */
const SUELO = { acera: 0, plaza: 1, patio: 2 } as const;

/**
 * EL VADO: donde la cebra llega al bordillo. A lo largo del bordillo, de `desde` a `hasta` metros de la esquina de
 * la isla (la cebra va de 1 a 4,2 m de la boca del tramo, y la boca del tramo es la esquina de la isla: la línea de
 * paso de los durmientes cae a 2 o 3 m de ella, según la acera sea de 3 o de 4). En la calzada, la rampa de `fondo`
 * metros que escribe `tapas.ts`; en la acera, el podotáctil y el bordillo rebajado que pinta la acera de aquí. Los
 * dos leen ESTOS números, así que no pueden no casar.
 */
export const VADO = { desde: 1.4, hasta: 3.8, fondo: 0.8, podotactil: 0.8 } as const;

/**
 * EL COSTE DE LOS SOMBREADORES DEL SUELO, por nivel (plan del detalle, §5.2.9 y §7.4): instrucciones estáticas de
 * fxc (`ps_5_0 /O3`) sobre el HLSL de ANGLE en su estado principal (la de N0 con el tono propio del juego, el +42
 * que el coordinador confirmó en la revisión 2 de la ola 1b), y lecturas de textura de TODOS los muestreadores en
 * el peor camino de `main`. Este módulo tiene dos materiales, el asfalto y la acera, y esta tabla es el tope COMÚN
 * de los dos (decisión (c) de la misma revisión: `verify:quiebro-gl` se queda con el menor de ésta y el de §7.4 de
 * cada uno). Son los topes de la ficha del ASFALTO, con los 40 de margen para la ola 3 en N1-N3; los de la acera son
 * más bajos (2.072 / 2.032 / 2.760 / 3.460) y los pone §7.4, salvo el margen de 40 de N1-N3, que se mide y se dice
 * en el informe del paquete. Las instrucciones no bajan al subir de nivel (§5.2.7, campo a campo).
 */
export const TOPE_DEL_SOMBREADOR_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, { readonly instrucciones: number; readonly lecturas: number }>> = {
  0: { instrucciones: 2345, lecturas: 6 },
  1: { instrucciones: 2801, lecturas: 18 },
  2: { instrucciones: 3460, lecturas: 24 },
  3: { instrucciones: 4460, lecturas: 28 },
};

/* ═══════════════════════════════ LO COMÚN ═══════════════════════════════ */

/** La oclusión horneada del suelo (`mapaDeOclusion`), leída con la caja del mapa de alturas. */
const GLSL_OCLUSION_DEL_SUELO = /* glsl */ `
uniform sampler2D uOclusionSuelo;
uniform vec4 uOclusionCaja;
float oclusionDelSueloQ(vec2 xz) {
  vec2 uvO = (xz - uOclusionCaja.xy) * uOclusionCaja.zw;
  if (uvO.x < 0.0 || uvO.y < 0.0 || uvO.x > 1.0 || uvO.y > 1.0) return 1.0;
  return texture(uOclusionSuelo, uvO).r;
}
`;

/**
 * LAS RAYAS FILTRADAS: la cobertura de una raya (junta, pintura, cordón) sobre un píxel de `px` metros, como la
 * integral de la caja del píxel sobre la raya. Conserva la media: una junta de 8 mm a 20 m no desaparece ni
 * centellea, se queda en lo que oscurece en media. Con un periodo `T`, a partir de medio periodo de píxel la
 * cobertura es la media de la rejilla (`2·medio/T`): ya no se distingue una raya de la siguiente.
 */
const GLSL_RAYAS_FILTRADAS = /* glsl */ `
float coberturaQ(float d, float medio, float px) {
  float a = abs(d);
  float h = 0.5 * max(px, 1e-4);
  return clamp((min(a + h, medio) - max(a - h, -medio)) / (2.0 * h), 0.0, 1.0);
}
float coberturaPeriodicaQ(float d, float medio, float T, float px) {
  return mix(coberturaQ(d, medio, px), 2.0 * medio / T, smoothstep(0.25 * T, 0.5 * T, px));
}
/* Un borde (0 fuera, 1 dentro) a 'd' metros por dentro, filtrado. */
float dentroQ(float d, float px) {
  return clamp(d / max(px, 1e-4) + 0.5, 0.0, 1.0);
}
`;

/* ═══════════════════════════════ LA CALZADA ═══════════════════════════════ */

const DECLARACIONES_DEL_ASFALTO = /* glsl */ `
varying vec4 vTramoQ;
varying vec4 vCalleQ;
${GLSL_OCLUSION_DEL_SUELO}
${GLSL_CHARCOS}
${GLSL_ONDAS}
${GLSL_RAYAS_FILTRADAS}
/* La película de aceite de N3: lo que se suma al F0 del reflejo (ver la sustitución de después de la luz). */
vec3 iridiscenciaQ = vec3(0.0);
/* La semilla de una celda de la piel de cocodrilo, en [0, 1)²: un hash de coma flotante sin enteros ni lecturas
   (el de Dave Hoskins). Es ADORNO: no decide nada que JavaScript tenga que saber, y con 'id' entero y por debajo de
   unos miles da lo mismo en toda GPU de coma de 32 bits. */
vec2 semillaDeLaCeldaQ(vec2 id) {
  vec3 p3 = fract(vec3(id.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
`;

const CUERPO_DEL_ASFALTO = /* glsl */ `
float charcoFinal = 0.0;
{
  vec3 P = vPosMundoQ;
  float tipo = vTramoQ.x;
  /* La huella del píxel en x y en z: lo mismo que fwidth(P.xz), con las derivadas del preámbulo. */
  vec2 fw = max(abs(dPdxQ.xz) + abs(dPdyQ.xz), vec2(1e-4));
  float px = max(fw.x, fw.y);
  /* EL LOD DE LO QUE ADORNA (grano, rodada, grietas, aceite, cocodrilo, pintura): con la huella MAYOR del píxel, no
     con la de lodQ (pxMundoQ va casi con la menor). A ras, un píxel abarca a lo largo de la mirada varias veces lo
     que de través, y con el lod de la menor las octavas finas del grano (hasta 22 ciclos por metro en N3) se leen
     por debajo de su mip a lo largo de la calle: un moaré que la rugosidad del asfalto mojado enciende al alba. Con
     la mayor, lo que ya no cabe en el píxel se queda en su media también de través (el filtro isótropo de toda la
     vida, sin anisotropía). Las bandas de la E al alba NO eran esto sino el árido (abajo): sin su relieve, el grano
     con lodQ ya no las pintaba. La máscara de los charcos no cambia de lod: su bloque sigue con lodQ, tal cual (c). */
  float lodM = log2(max(max(length(dPdxQ), length(dPdyQ)), 1e-4));
  /* s a lo largo de la calle, t de través desde el eje; y la huella del píxel en cada uno. */
  float s = tipo > 1.5 ? P.z : P.x;
  float t = (tipo > 1.5 ? P.x : P.z) - vTramoQ.y;
  float pxS = tipo > 1.5 ? fw.y : fw.x;
  float pxT = tipo > 1.5 ? fw.x : fw.y;
  float medioAncho = vCalleQ.x * 0.5;
  bool esTramo = tipo > 0.5 && tipo < 2.5;
  /* La calle de cada tramo, como número entero (para que dos calles no compartan parches ni grietas). */
  float calle = floor(vTramoQ.y * 0.25 + 0.5);
  float aBordillo = medioAncho - abs(t);

  /* EL GRANO: el de 40 cm (1 a 4 octavas según el nivel) y, desde N1, la mancha de 10 m. */
  float grano = fbmT(P.xz * 2.7, lodM + log2(2.7));
  #if NIVEL_Q >= 1
  float mancha = ruidoT(P.xz * 0.09 + 5.0, lodM + log2(0.09));
  #else
  float mancha = 0.5;
  #endif
  vec3 seco = vec3(0.11, 0.11, 0.115) * (0.75 + 0.45 * grano) * (0.82 + 0.36 * mancha);

  /* LOS PARCHES DE REASFALTADO: rectángulos a lo largo de la calle (en un cruce, de la rejilla del mundo), más
     oscuros y lisos, con el cordón de betún sellado en el canto. Qué celda lleva parche lo dice su téxel. */
  float parche = 0.0;
  float cordon = 0.0;
  {
    vec2 q = esTramo ? vec2(s, t) : P.xz;
    vec2 celda = esTramo ? vec2(7.0, max(medioAncho, 1.0)) : vec2(5.0);
    vec2 id = floor(q / celda);
    float r = ruidoT(id + vec2(calle * 3.0, calle * 17.0 + 31.0), 0.0);
    vec2 f = q - id * celda;
    vec2 a = celda * vec2(0.06 + 0.22 * fract(r * 7.13), 0.08 + 0.2 * fract(r * 3.71));
    vec2 b = celda * vec2(0.72 + 0.22 * fract(r * 5.29), 0.74 + 0.18 * fract(r * 9.17));
    vec2 dd = min(f - a, b - f);
    float hay = step(0.78, r);
    float dentro = min(dd.x, dd.y);
    parche = hay * dentroQ(dentro, px);
    cordon = hay * coberturaQ(dentro, 0.018, px);
  }
  seco = mix(seco, vec3(0.072, 0.072, 0.078) * (0.85 + 0.3 * grano), parche * 0.9);

  /* LA RODADA: donde pisan las ruedas el firme está gastado y liso. En N0, sin su ruido. */
  float rodada = 0.0;
  float junta = 0.0;
  float rigola = 0.0;
  float juntaRigola = 0.0;
  if (esTramo) {
    float carril = abs(abs(t) - medioAncho * 0.5);
    #if NIVEL_Q >= 1
    rodada = (1.0 - smoothstep(0.55, 0.95, abs(carril - 0.75) + 0.6)) * (0.6 + 0.4 * ruidoT(vec2(s * 0.15, t * 0.5), lodM + log2(0.5)));
    #else
    rodada = (1.0 - smoothstep(0.55, 0.95, abs(carril - 0.75) + 0.6)) * 0.8;
    #endif
    /* La junta longitudinal entre dos pasadas de la extendedora, sellada: un cordón que serpentea junto al eje. */
    junta = coberturaQ(t + 0.38 + 0.05 * sin(s * 0.53) + 0.02 * sin(s * 1.71), 0.01, pxT);
    /* La rigola: la franja de hormigón de 0,3 m contra el bordillo, en piezas de 1 m. */
    rigola = dentroQ(0.3 - aBordillo, pxT);
    juntaRigola = max(coberturaQ(aBordillo - 0.3, 0.006, pxT), coberturaPeriodicaQ(fract(s + 0.5) - 0.5, 0.004, 1.0, pxS) * rigola);
  }

  /* LA MÁSCARA DE LOS CHARCOS: los del ruido y la cuneta junto al bordillo; el lomo de la calle queda más seco. Es un
     bloque de texto FIJO, y fuera de él nada escribe la máscara ni lo que la mueve (quiebro-ciudad/suelo.ts, c). */
  float ch = charcoQ(P.xz);
  float cuneta = 0.0;
  if (esTramo) {
    /* La cuneta: una lámina de agua pegada al bordillo, de orilla nítida y ancho que va y viene. Es máscara (dice
       DÓNDE hay agua), no adorno: en N1-N3 sigue en hash, con los mismos fbmQ de siempre, y sale idéntica a la de
       antes del plan. Sólo se calcula junto al bordillo: el ancho es 0,25 + 0,45 · fbmQ, y fbmQ no pasa de 0,9375,
       así que a más de 0,7 m del bordillo la cuneta era 0 igual. En N0 no puede llevar fbmQ (§7.4; verify:
       quiebro-materia, b, sólo deja el hash en charcoQ y charcoDeLaAceraQ): UNA lectura para el ancho y el troceo;
       donde hay agua, de 0,42 a 0,7 m, y seca en un 38 % del bordillo. */
    #if NIVEL_Q >= 1
    if (abs(t) > medioAncho - 0.7) {
      float anchoCuneta = 0.25 + 0.45 * fbmQ(vec2(s * 0.21, 3.0));
      cuneta = step(medioAncho - anchoCuneta, abs(t)) * smoothstep(0.38, 0.46, fbmQ(vec2(s * 0.3, t * 0.5)));
    }
    #else
    float troceo = ruidoT(vec2(s * 0.3, t * 0.5), lodQ(0.5));
    float anchoCuneta = 0.25 + 0.45 * troceo;
    cuneta = step(medioAncho - anchoCuneta, abs(t)) * smoothstep(0.38, 0.46, troceo);
    #endif
    ch = max(ch * (0.55 + 0.45 * smoothstep(0.4, 2.2, abs(t))), cuneta);
  }
  charcoFinal = ch;

  /* LAS GRIETAS TRANSVERSALES (N1+): una cada 11 m como mucho, que ondula y no cruza entera; y el aceite que gotean
     los coches aparcados, en la banda de junto al bordillo. */
  float grieta = 0.0;
  float dG = 1.0;
  float aceite = 0.0;
  #if NIVEL_Q >= 1
  if (esTramo) {
    float cg = floor(s / 11.0);
    float rg = ruidoT(vec2(cg, calle * 5.0 + 91.0), 0.0);
    float ondula = (ruidoT(vec2(t * 1.3, cg * 3.0 + 40.0), lodM + log2(1.3)) - 0.5) * 0.6;
    dG = s - (cg * 11.0 + 2.0 + 7.0 * fract(rg * 4.7)) - ondula;
    float alcance = (0.3 + 0.7 * fract(rg * 8.3)) * medioAncho;
    float enElAncho = dentroQ(alcance - abs(t - (fract(rg * 2.9) - 0.5) * medioAncho), pxT);
    grieta = step(0.4, rg) * enElAncho * coberturaQ(dG, 0.005, pxS);
    /* Casi todas, selladas: un cordón de betún de 4 cm encima. */
    cordon = max(cordon, step(0.55, fract(rg * 6.1)) * step(0.4, rg) * enElAncho * coberturaQ(dG, 0.02, pxS));
    float banda = smoothstep(0.35, 0.6, aBordillo) * (1.0 - smoothstep(1.9, 2.3, aBordillo));
    float ca = floor(s / 5.5);
    float ra = ruidoT(vec2(ca, (t > 0.0 ? 7.0 : 3.0) + calle * 13.0), 0.0);
    vec2 dA = vec2((s - ca * 5.5 - 1.5 - 2.5 * fract(ra * 6.1)) / 0.8, (aBordillo - 1.1) / 0.55);
    float borde = ruidoT(vec2(s, t) * 2.1 + 11.0, lodM + log2(2.1));
    aceite = banda * step(0.35, ra) * (1.0 - smoothstep(0.55, 1.0, length(dA) + (borde - 0.5) * 0.8));
  }
  #endif

  /* LA PIEL DE COCODRILO (N2+): la red de grietas del firme cansado, en las RODADAS (donde la fatiga la abre) y a
     trozos a lo largo de la calle. Son CELDAS: los bordes de un Voronoi de 25 × 17 cm (más largas a lo largo de la
     calle), cada borde una grieta de 3 a 6 mm de ancho, fija en metros, pintada con su COBERTURA sobre la huella del
     píxel medida a través de la grieta (no engorda con la distancia: se queda en su media). No todos los bordes
     están abiertos: menos cuanto más al canto de la rodada, y la red se deshace en grietas sueltas. Oscurece y
     vuelve áspero un 30 % como mucho. Antes eran isolíneas de un ruido de valor que engordaban con el píxel: líneas
     de rotulador, blandas y con nudos, de 1 a 4 m. Sin lecturas en las celdas (su semilla es de coma flotante), y
     sólo a menos de unos 5 m (una grieta de 4 mm en un píxel de 3 cm ya es un 4 % de sombra). */
  float cocodrilo = 0.0;
  #if NIVEL_Q >= 2
  if (esTramo && rodada > 0.2 && px < 0.03) {
    float zona = smoothstep(0.45, 0.6, ruidoT(P.xz * 0.07 + 23.0, lodM + log2(0.07))) * smoothstep(0.2, 0.7, rodada);
    if (zona > 0.0) {
      vec2 escalaC = vec2(4.0, 6.0);
      vec2 qC = vec2(s, t) * escalaC;
      /* El dominio, torcido un poco (2-3 cm, en ondas de unos 40 cm): los bordes rectos del Voronoi eran de regla. Se
         tuerce el sitio y no cada borde, así que en los nudos las grietas siguen casando. */
      qC += 0.12 * vec2(sin(qC.y * 3.1 + 1.7 * sin(qC.x * 1.3)), sin(qC.x * 2.7 + 1.9 * sin(qC.y * 1.1)))
        + 0.03 * vec2(sin(qC.y * 11.3 + qC.x * 4.1), sin(qC.x * 9.7 - qC.y * 3.9));
      vec2 idC = floor(qC);
      vec2 fC = qC - idC;
      /* Las dos semillas más cercanas (relativas al píxel) y su azar. */
      float d1 = 8.0;
      float d2 = 8.0;
      vec2 r1 = vec2(0.0);
      vec2 r2 = vec2(1.0);
      vec2 h1 = vec2(0.0);
      vec2 h2 = vec2(0.0);
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 o = vec2(float(i), float(j));
          vec2 h = semillaDeLaCeldaQ(idC + o);
          vec2 r = o + h - fC;
          float dd = dot(r, r);
          if (dd < d1) {
            d2 = d1; r2 = r1; h2 = h1;
            d1 = dd; r1 = r; h1 = h;
          } else if (dd < d2) {
            d2 = dd; r2 = r; h2 = h;
          }
        }
      }
      /* La frontera entre las dos: la mediatriz. Su distancia al píxel (en celdas) y la huella del píxel a través de
         ella, con las derivadas del preámbulo pasadas a (s, t). */
      vec2 nC = normalize(r2 - r1);
      float dC = dot(0.5 * (r1 + r2), nC);
      vec2 gC = nC * escalaC;
      vec2 dSTx = tipo > 1.5 ? dPdxQ.zx : dPdxQ.xz;
      vec2 dSTy = tipo > 1.5 ? dPdyQ.zx : dPdyQ.xz;
      float huellaC = abs(dot(gC, dSTx)) + abs(dot(gC, dSTy));
      /* Cada borde, su ancho (de 1,5 a 3 mm de medio) y si está abierto: el azar de las dos celdas, simétrico. */
      float azar = fract((h1.x + h2.x) * 17.31 + (h1.y + h2.y) * 5.77);
      float abierta = step(1.0 - 0.85 * zona, fract(azar * 7.13));
      float medioC = (0.0015 + 0.0015 * azar) * length(gC);
      /* El parche de reasfaltado es firme nuevo: sin grietas. */
      cocodrilo = abierta * coberturaQ(dC, medioC, huellaC) * (1.0 - smoothstep(0.012, 0.03, px)) * (1.0 - parche);
    }
  }
  #endif

  /* LA PINTURA: línea discontinua en el eje, pasos de cebra en las bocas del tramo, la línea de parada y (N3) las
     flechas. El borde, irregular (el grano lo mueve centímetro y medio); gastada a trozos y en la rodada. */
  float pintura = 0.0;
  if (esTramo) {
    float largo = vTramoQ.w - vTramoQ.z;
    float desdeA = s - vTramoQ.z;
    float desdeB = vTramoQ.w - s;
    float bocas = min(desdeA, desdeB);
    float irregular = (grano - 0.5) * 0.03;
    float eje = coberturaQ(t + irregular, 0.06, pxT) * step(0.5, fract(s / 6.0)) * step(7.0, bocas);
    /* Cebra y línea de parada, sólo en los tramos de 10 m o más entre dos cruces (vCalleQ.z = 1: el tramo acaba en
       el canto del asfalto, en las salidas de las avenidas, donde no hay paso ni rampa). */
    float conPaso = step(10.0, largo) * step(vCalleQ.z, 0.5);
    float cebra = coberturaPeriodicaQ(fract(t + 0.25) - 0.5 + irregular, 0.25, 1.0, pxT) * step(abs(t), medioAncho - 0.35)
      * dentroQ(bocas - 1.0, pxS) * dentroQ(4.2 - bocas, pxS) * conPaso;
    float stop = coberturaQ(bocas - 4.9 + irregular, 0.2, pxS) * step(0.0, t * sign(desdeA - desdeB)) * step(abs(t), medioAncho - 0.3) * conPaso;
    pintura = max(max(eje, cebra), stop);
    #if NIVEL_Q >= 3
    {
      /* La flecha del carril que llega a la línea de parada: 3,5 m, con la punta hacia el cruce. */
      float u = 10.5 - bocas;
      float v = abs(t) - medioAncho * 0.5;
      float suCarril = step(0.0, t * sign(desdeA - desdeB)) * step(24.0, largo);
      float asta = coberturaQ(v, 0.08, pxT) * dentroQ(u, pxS) * dentroQ(2.5 - u, pxS);
      float punta = dentroQ((3.5 - u) * 0.3 - abs(v), pxT) * dentroQ(u - 2.4, pxS);
      pintura = max(pintura, suCarril * max(asta, punta));
    }
    #endif
    pintura *= (0.55 + 0.45 * smoothstep(0.3, 0.6, fbmT(P.xz * 1.9 + 3.0, lodM + log2(1.9)))) * (1.0 - 0.55 * rodada);
    pintura *= 1.0 - rigola;
  }
  vec3 blanco = vec3(0.55, 0.55, 0.52);

  /* LA HUMEDAD, en capas: húmedo (todo), película (el agua que llena el poro: rodadas, manchas bajas, la rigola) y
     lámina (el charco), con un halo oscuro en la orilla. */
  float mojado = mix(0.66, 0.42, uHumedad);
  float pelicula = clamp(rodada * 0.7 + (1.0 - smoothstep(0.25, 0.5, mancha)) * 0.45 + rigola * 0.5, 0.0, 1.0) * (0.4 + 0.6 * uHumedad);
  float orilla = 4.0 * ch * (1.0 - ch);

  vec3 alb = seco;
  alb = mix(alb, vec3(0.17, 0.17, 0.165) * (0.85 + 0.3 * grano), rigola);
  alb *= 1.0 - 0.5 * juntaRigola;
  alb = mix(alb, vec3(0.016, 0.016, 0.018), max(cordon, junta) * 0.9);
  alb *= 1.0 - max(0.7 * grieta, 0.3 * cocodrilo);
  alb = mix(alb, alb * 0.45, aceite);
  alb *= mojado * (1.0 - 0.15 * pelicula);
  alb = mix(alb, seco * 0.3, ch);
  alb *= 1.0 - 0.4 * orilla;
  /* La pintura no chupa agua: mojada se queda más clara que el asfalto. */
  alb = mix(alb, blanco * mix(0.78, 0.55, ch), pintura);

  float rug = mix(0.5 + 0.18 * grano, 0.32 + 0.16 * grano, uHumedad);
  rug = mix(rug, 0.4, rigola * 0.6);
  rug = mix(rug, 0.14, pelicula * 0.6);
  rug = mix(rug, 0.2, rodada * (1.0 - ch));
  /* El betún del cordón y de la junta: oscuro, y NUNCA más liso que el firme de al lado. A ras, lo más liso refleja
     más: con 0,3 fijo sobre un firme de 0,4 (junto al eje no hay rodada ni película), al alba cogía la franja clara
     del final de la calle y salía una raya blanca que culebreaba a 38 cm del eje. Ahora es la del firme, y 0,3 donde
     el firme es más liso (película, rodada): se lee por el color, como una raya oscura, de noche y al alba. */
  rug = mix(rug, max(rug, 0.3), max(cordon, junta));
  rug = mix(rug, 0.6, max(grieta, 0.3 * cocodrilo));
  rug = mix(rug, 0.12, aceite);
  rug = mix(rug, 0.025, ch);
  rug = mix(rug, 0.3, orilla * 0.5);
  rug = mix(rug, mix(0.4, 0.03, ch), pintura);
  /* El pie de las fachadas, el hueco bajo los coches aparcados: la oclusión horneada. */
  alb *= oclusionDelSueloQ(P.xz);

  vec3 nW = vec3(0.0, 1.0, 0.0);
  #if NIVEL_Q >= 1
  /* Las ondas, sólo dentro del charco y sólo cerca: a más de 8-12 m un anillo de 15 cm es ruido. */
  float cerca = 1.0 - smoothstep(8.0, 12.0, length(cameraPosition - P));
  if (ch > 0.01 && cerca > 0.0) {
    vec2 g = ondasQ(P.xz, uTiempo) * ch * cerca;
    nW = normalize(vec3(-g.x, 1.0, -g.y));
  }
  /* El árido: la piedra de la mezcla, en la normal; dos lecturas (ver abajo). El grano de la textura tiene celdas
     de 16, 8 y 4 téxeles (materia/ruido.ts): a 400 téxeles por metro son 4, 2 y 1 cm, las piedras y sus corros.
     A 48, como estuvo, eran 33, 17 y 8 cm: una ondulación, y en el asfalto mojado, liso, a ras y con el cielo claro
     del alba encima, eso se leía como agua movida (bandas estiradas en la franja de 5-15 m de la E). La película,
     el charco y el aceite lo tapan: donde la rugosidad baja a 0,12 (el aceite) una pendiente que cambia a cada píxel
     son chispas sueltas que titilan. Se lee con la huella MAYOR del píxel (px) y se ve sólo mientras una piedra
     de 1 cm ocupa algún píxel (a menos de unos 2-3 m); desde ahí (lodA de 1 a 3) su pendiente pasa entera a la
     rugosidad. */
  float lodA = log2(max(px * 400.0, 1e-4));
  /* SIN LA RETÍCULA: el grano de la textura es un ruido de valor en rejilla (celdas de 4, 8 y 16 téxeles), y con UNA
     lectura, de cerca (a 1,5-2 m, mirando abajo), sus celdas se leían como una trama tejida en diagonal, repetida
     cada 0,32 m (los 128 téxeles). En N1-N2 se le suma la segunda lectura girada 37 grados que granoT ya hace sola
     en N3 (materia/glsl.ts: la misma cuenta y el mismo desplazamiento), así que el grano sale igual en los tres
     niveles, sin rejilla y sin repetición a la vista. Torcer el sitio sin leer más (probado) dejaba gusanillos. La
     lectura la pagan las que la cuneta dejó de hacer (en N1-N3 vuelve al hash). */
  vec2 pA = P.xz * 400.0;
  vec3 arido = granoT(pA, lodA);
  #if NIVEL_Q <= 2
  {
    mat2 giroA = mat2(0.8, 0.6, -0.6, 0.8);
    vec3 a2 = granoT(giroA * pA + vec2(37.3, 71.9), lodA);
    vec2 g2 = transpose(giroA) * a2.yz;
    arido = vec3(0.5 + (0.5 * (arido.x + a2.x) - 0.5) * 1.41, (arido.yz + g2) * 0.705);
  }
  #endif
  float secoN = (1.0 - ch) * (1.0 - 0.6 * pelicula) * (1.0 - 0.7 * pintura) * (1.0 - aceite);
  float lejosA = smoothstep(1.0, 3.0, lodA);
  nW = normalize(nW + vec3(arido.y, 0.0, arido.z) * 0.45 * secoN * (1.0 - lejosA));
  rug = rugosidadFiltradaQ(rug, mix(varianzaPerdidaQ(lodA), varianzaPerdidaQ(7.0), lejosA) * 0.2 * secoN);
  #endif
  #if NIVEL_Q >= 2
  /* Los destellos del árido: la piedra que asoma, pulida, brilla en punta; se apagan cuando el píxel ya no la ve. */
  float destello = smoothstep(0.74, 0.8, arido.x) * (1.0 - smoothstep(0.0025, 0.006, px)) * secoN;
  rug = mix(rug, 0.07, destello * 0.7);
  /* La pintura tiene grosor (más lisa encima) y microesferas, que devuelven la luz hacia quien mira: a ras, la raya
     se enciende más que el asfalto de al lado (la retrorreflexión, sin faros: la de la luz de la calle). */
  rug = mix(rug, 0.3, pintura * (1.0 - ch) * 0.5);
  float rasante = 1.0 - clamp(normalize(cameraPosition - P).y, 0.0, 1.0);
  alb *= 1.0 + 0.6 * rasante * rasante * rasante * rasante * pintura * (1.0 - ch);
  /* La puerta del horno (capa 3, asfalto): neutra hasta la ola 4. */
  vec4 micro = microRelieveQ(3, P, pxMundoQ);
  nW = normalize(nW + vec3(micro.x, 0.0, micro.y) * secoN);
  alb *= 1.0 - micro.z;
  rug = clamp(rug + micro.w * secoN, 0.02, 1.0);
  #endif
  #if NIVEL_Q >= 3
  /* La cavidad de las grietas: se hunden (oscuras y con la normal hacia dentro) y guardan agua en el fondo. */
  if (grieta > 0.0 && esTramo) {
    float lado = -sign(dG);
    vec2 haciaDentro = tipo > 1.5 ? vec2(0.0, lado) : vec2(lado, 0.0);
    nW = normalize(nW + vec3(haciaDentro.x, 0.0, haciaDentro.y) * grieta * 0.3);
    alb *= 1.0 - 0.3 * grieta;
  }
  /* La película irisada del aceite: el color del espesor, que cambia con el ángulo. */
  {
    float cosV = clamp(normalize(cameraPosition - P).y, 0.0, 1.0);
    float espesor = mancha * 1.7 + cosV * 1.3;
    iridiscenciaQ = aceite * (1.0 - 0.5 * ch) * 0.045 * (0.5 + 0.5 * cos(6.2832 * (espesor + vec3(0.0, 0.33, 0.67))));
  }
  #endif

  diffuseColor.rgb = alb;
  roughnessFactor = rug;
  metalnessFactor = 0.0;
  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
}
`;

const RETOQUES_DEL_ASFALTO = new Map<NivelDeLaCiudad, Retoque>();

function retoqueDelAsfalto(nivel: NivelDeLaCiudad): Retoque {
  const hecho = RETOQUES_DEL_ASFALTO.get(nivel);
  if (hecho !== undefined) return hecho;
  const r: Retoque = {
    nombre: `asfalto-n${nivel}`,
    orden: 10,
    uniformes: {
      uHumedad: UNIFORMES_DE_LA_CIUDAD.uHumedad,
      uOclusionSuelo: UNIFORMES_DE_LA_CIUDAD.uOclusionSuelo,
      uOclusionCaja: UNIFORMES_DE_LA_CIUDAD.uOclusionCaja,
    },
    defines: { NIVEL_Q: String(nivel) },
    vertice: [
      {
        buscar: '#include <common>',
        como: 'despues',
        texto: 'attribute vec4 aTramo;\nattribute vec4 aCalle;\nvarying vec4 vTramoQ;\nvarying vec4 vCalleQ;',
      },
      { buscar: '#include <uv_vertex>', como: 'despues', texto: 'vTramoQ = aTramo;\nvCalleQ = aCalle;' },
    ],
    fragmento: [
      { buscar: '#include <lights_pars_begin>', como: 'antes', texto: DECLARACIONES_DEL_ASFALTO },
      { buscar: '#include <normal_fragment_maps>', como: 'despues', texto: CUERPO_DEL_ASFALTO },
      /* El agua tiene F0 = 0,02, no el 0,04 de fábrica de `MeshStandardMaterial`; el aceite de N3, su color. */
      {
        buscar: '#include <lights_physical_fragment>',
        como: 'despues',
        texto: 'material.specularColor = mix(material.specularColor, vec3(0.02), charcoFinal);\nmaterial.specularColor += iridiscenciaQ;',
      },
    ],
  };
  RETOQUES_DEL_ASFALTO.set(nivel, r);
  return r;
}

/** El material del asfalto de un nivel: la materia del nivel y el cuerpo de arriba. Cada llamada, uno nuevo. */
export function materialDelAsfalto(nivel: NivelDeLaCiudad): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0 });
  m.name = 'quiebro-asfalto';
  parchear(m, RETOQUE_MUNDO, retoqueDeLaMateria(nivel), RETOQUE_ENTORNO, RETOQUE_SOLO_BRILLO, retoqueDelAsfalto(nivel));
  nieblaEn(m);
  return m;
}

/* ═══════════════════════════════ LAS ISLAS ═══════════════════════════════ */

const DECLARACIONES_DE_LA_ACERA = /* glsl */ `
varying vec4 vIslaQ;
varying float vSueloQ;
${GLSL_OCLUSION_DEL_SUELO}
${GLSL_CHARCOS}
${GLSL_RAYAS_FILTRADAS}
`;

/**
 * El cuerpo de la acera. `vIslaQ` es la caja que enmarca la cara: la isla en la acera, el bordillo y el patio; la
 * PLAZA en la plaza (ver `construirElSuelo`), para la cenefa de su borde.
 */
const CUERPO_DE_LA_ACERA = /* glsl */ `
float charcoFinal = 0.0;
{
  vec3 P = vPosMundoQ;
  vec3 Ng = normalize(vNorMundoQ);
  vec2 fw = max(abs(dPdxQ.xz) + abs(dPdyQ.xz), vec2(1e-4));
  float px = max(fw.x, fw.y);
  float dx = min(P.x - vIslaQ.x, vIslaQ.z - P.x);
  float dz = min(P.z - vIslaQ.y, vIslaQ.w - P.z);
  float borde = min(dx, dz);
  float tipo = vSueloQ;
  /* El canto más cercano corre a lo largo de z si el borde es el de x: a lo largo, la distancia a la esquina. */
  float aLoLargo = dx < dz ? dz : dx;
  float pxLargo = dx < dz ? fw.y : fw.x;
  /* EL VADO: donde la cebra llega al bordillo (la rampa de la calzada la pone tapas.ts, con los mismos números). */
  float vado = dentroQ(aLoLargo - ${VADO.desde.toFixed(2)}, pxLargo) * dentroQ(${VADO.hasta.toFixed(2)} - aLoLargo, pxLargo);
  vec3 alb;
  float rug;
  vec3 nW = Ng;
  /* El agua que se queda en las juntas (de la baldosa, del adoquín, de la losa): más oscura y más lisa. */
  float enJunta = 0.0;
  /* Cuánto de mojada está la piedra: la de la ficha, 0,6-0,7 seca y 0,35-0,45 mojada (en el juego, uHumedad va de
     0,35 con niebla a 0,9 en el aguacero). */
  float mojadoPiedra = uHumedad;
  if (Ng.y < 0.5 || (tipo < 0.5 && borde < 0.3)) {
    /* EL BORDILLO: granito en piezas de 0,5 a 1,2 m (tramos de 1,7 m con una junta de más donde diga su téxel). */
    bool alLargoDeZ = Ng.y > 0.5 ? dx < dz : abs(Ng.x) > 0.5;
    float largo = alLargoDeZ ? P.z : P.x;
    float pxL = alLargoDeZ ? fw.y : fw.x;
    float celda = floor(largo / 1.7);
    float r = ruidoT(vec2(celda, 61.0), 0.0);
    float f = largo - celda * 1.7;
    float corte = 0.5 + 0.7 * r;
    float junta = coberturaQ(min(min(f, 1.7 - f), abs(f - corte)), 0.004, pxL);
    junta = mix(junta, 0.01, smoothstep(0.12, 0.25, pxL));
    float pieza = f < corte ? r : fract(r * 7.31);
    vec2 qB = vec2(largo, P.y + (alLargoDeZ ? P.x : P.z));
    float grano = fbmT(qB * 3.0, lodQ(3.0));
    alb = vec3(0.30, 0.29, 0.28) * 0.7 * (0.85 + 0.3 * grano) * (0.9 + 0.2 * pieza);
    /* El bordillo rebajado del vado: sólo el color, de hormigón. */
    alb = mix(alb, vec3(0.36, 0.355, 0.34) * 0.7 * (0.9 + 0.2 * grano), vado);
    alb *= 1.0 - 0.45 * junta;
    rug = mix(0.5, 0.36, mojadoPiedra);
    /* El canto, biselado sólo por la normal (sin un triángulo más en la base): 3,5 cm que se tuercen. */
    float bisel = 1.0 - smoothstep(0.02, 0.06, px);
    if (Ng.y > 0.5) {
      float c = (1.0 - smoothstep(0.0, 0.035, borde)) * bisel;
      vec2 fuera = dx < dz ? vec2(P.x - vIslaQ.x < vIslaQ.z - P.x ? -1.0 : 1.0, 0.0) : vec2(0.0, P.z - vIslaQ.y < vIslaQ.w - P.z ? -1.0 : 1.0);
      nW = normalize(vec3(fuera.x * c * 0.8, 1.0, fuera.y * c * 0.8));
    } else {
      float c = smoothstep(${(ALTURA_DE_LA_ACERA - 0.035).toFixed(3)}, ${ALTURA_DE_LA_ACERA.toFixed(3)}, P.y) * bisel;
      nW = normalize(Ng + vec3(0.0, c * 0.8, 0.0));
      /* La marca de humedad al pie: el agua de la rigola sube por el canto. */
      float pie = 1.0 - smoothstep(0.015, 0.05 + 0.03 * grano, P.y);
      alb *= 1.0 - 0.45 * pie;
      rug = mix(rug, 0.15, pie);
    }
    #if NIVEL_Q >= 2
    /* El moteado del granito y los desconchados del canto. */
    vec3 gB = granoT(qB * 24.0, lodQ(24.0));
    alb *= 0.86 + 0.3 * smoothstep(0.35, 0.75, gB.x);
    float aCanto = Ng.y > 0.5 ? borde : ${ALTURA_DE_LA_ACERA.toFixed(3)} - P.y;
    float desconchado = smoothstep(0.66, 0.7, ruidoT(qB * vec2(4.0, 9.0) + 13.0, lodQ(9.0))) * (1.0 - smoothstep(0.02, 0.06, aCanto));
    alb *= 1.0 - 0.35 * desconchado;
    rug = mix(rug, 0.7, desconchado);
    #endif
  } else if (tipo < 0.5) {
    /* LA BALDOSA de tacos de 20 cm: nueve pastillas en relieve por pieza, que se funden con la distancia. */
    vec2 q = P.xz / 0.2;
    vec2 f = fract(q);
    vec2 aJunta = (0.5 - abs(f - 0.5)) * 0.2;
    float junta = 1.0 - (1.0 - coberturaPeriodicaQ(aJunta.x, 0.006, 0.2, fw.x)) * (1.0 - coberturaPeriodicaQ(aJunta.y, 0.006, 0.2, fw.y));
    vec2 t3 = fract(f * 3.0) - 0.5;
    float taco = 1.0 - smoothstep(0.28, 0.34, length(t3));
    float cerca = 1.0 - smoothstep(0.012, 0.028, px);
    vec2 idB = floor(q);
    float pieza = hashQ(idB, 21.0);
    alb = vec3(0.26, 0.25, 0.235) * (0.85 + 0.25 * pieza) * (1.0 - 0.6 * junta);
    rug = mix(0.52, 0.4, mojadoPiedra);
    enJunta = junta;
    vec2 gt = t3 * taco * cerca * 1.2;
    #if NIVEL_Q >= 1
    /* Los chicles: manchas de 2-3 cm, planas, grises y sueltas (más junto a los portales, donde hay oclusión). */
    float chicle = smoothstep(0.935, 0.95, ruidoT(P.xz * 16.0 + 3.1, lodQ(16.0))) * (1.0 - smoothstep(0.01, 0.03, px));
    alb = mix(alb, vec3(0.11, 0.108, 0.1), chicle * 0.7);
    rug = mix(rug, 0.3, chicle);
    /* El podotáctil del vado: baldosa de botones, roja, detrás del bordillo. */
    float podotactil = vado * dentroQ(${(0.3 + VADO.podotactil).toFixed(2)} - borde, fw.x + fw.y);
    vec2 tb = fract(P.xz / 0.06) - 0.5;
    float boton = 1.0 - smoothstep(0.2, 0.3, length(tb));
    float cercaB = 1.0 - smoothstep(0.006, 0.016, px);
    alb = mix(alb, vec3(0.25, 0.11, 0.08) * (0.9 + 0.2 * pieza) * (1.0 - 0.3 * junta), podotactil);
    gt = mix(gt, tb * boton * cercaB * 1.4, podotactil);
    #endif
    #if NIVEL_Q >= 2
    /* Baldosas repuestas (otro tono, más limpias) y levantadas (torcidas por una raíz o una obra). */
    vec2 hB = hash2Q(idB, 37.0);
    float repuesta = step(0.94, hB.x);
    float levantada = step(0.965, hB.y);
    alb = mix(alb, vec3(0.3, 0.285, 0.26) * (0.95 + 0.1 * pieza) * (1.0 - 0.6 * junta), repuesta * (1.0 - podotactil));
    gt += (vec2(fract(hB.x * 13.7), fract(hB.y * 7.9)) - 0.5) * 0.2 * levantada * (1.0 - smoothstep(0.02, 0.06, px));
    #endif
    nW = normalize(vec3(gt.x, 1.0, gt.y));
    /* Lo que los tacos ya no enseñan, a la rugosidad (el brillo no centellea). */
    rug = sqrt(clamp(rug * rug + 0.05 * (1.0 - cerca), 0.0, 1.0));
  } else if (tipo < 1.5) {
    /* LA PLAZA: adoquín de granito de 0,6 × 0,4 m a matajuntas, gris frío, gastado; con la cenefa de granito de
       0,4 m en su borde. Las juntas, PREFILTRADAS: a lo lejos se quedan en su tono medio (la plaza no es agua). */
    float fila = floor(P.z / 0.4);
    float x = P.x + mod(fila, 2.0) * 0.3;
    vec2 idA = vec2(floor(x / 0.6), fila);
    vec2 local = vec2(x - idA.x * 0.6, P.z - fila * 0.4) - vec2(0.3, 0.2);
    vec2 aJunta = vec2(0.3, 0.2) - abs(local);
    float jx = mix(coberturaPeriodicaQ(aJunta.x, 0.006, 0.6, fw.x), 0.02, smoothstep(0.2, 0.4, fw.y));
    float jz = coberturaPeriodicaQ(aJunta.y, 0.006, 0.4, fw.y);
    float junta = 1.0 - (1.0 - jx) * (1.0 - jz);
    #if NIVEL_Q >= 1
    vec2 hA = hash2Q(idA, 23.0);
    #else
    vec2 hA = vec2(hashQ(idA, 23.0), 0.5);
    #endif
    /* El tono de cada piedra, hasta unos 30 m; más lejos, su media. */
    float tono = mix(0.75 + 0.4 * hA.x, 0.95, smoothstep(0.08, 0.2, px));
    float macro = fbmT(P.xz * 0.3, lodQ(0.3));
    alb = vec3(0.17, 0.165, 0.16) * tono * (0.8 + 0.4 * macro);
    /* La piedra seca es mate (0,6-0,7); mojada, 0,35-0,45: nunca un espejo fuera del charco. */
    rug = mix(mix(0.6, 0.7, hA.y), mix(0.35, 0.45, hA.y), mojadoPiedra);
    vec2 tA = vec2(0.0);
    #if NIVEL_Q >= 1
    /* El almohadillado, a menos de unos 12 m: cada piedra abombada y con el chaflán de su junta. */
    vec3 jA = aJunta.x < aJunta.y ? vec3(aJunta.x, sign(local.x), 0.0) : vec3(aJunta.y, 0.0, sign(local.y));
    vec3 rA = relieveDeJuntaQ(jA, 0.006, 0.015, 0.01, px);
    float cercaA = 1.0 - smoothstep(0.012, 0.03, px);
    tA = rA.xy + local / vec2(0.3, 0.2) * 0.1 * cercaA;
    alb *= rA.z;
    #endif
    #if NIVEL_Q >= 2
    /* Las bandas cada 6 m (encintado de granito claro) y las piedras partidas o repuestas. */
    vec2 aBanda = abs(P.xz - 6.0 * floor(P.xz / 6.0 + 0.5));
    float banda = max(coberturaPeriodicaQ(aBanda.x, 0.15, 6.0, fw.x), coberturaPeriodicaQ(aBanda.y, 0.15, 6.0, fw.y));
    alb = mix(alb, vec3(0.24, 0.235, 0.225) * (0.9 + 0.2 * hA.y), banda);
    float repuesta = step(0.92, fract(hA.y * 7.1));
    alb = mix(alb, vec3(0.22, 0.215, 0.2) * (0.9 + 0.2 * hA.x), repuesta * (1.0 - banda));
    float partida = step(0.93, fract(hA.x * 13.7)) * (1.0 - banda);
    float ang = hA.y * 3.1416;
    float grieta = partida * coberturaQ(dot(local, vec2(cos(ang), sin(ang))), 0.002, px) * (1.0 - smoothstep(0.01, 0.03, px));
    alb *= 1.0 - 0.6 * grieta;
    junta = max(junta, grieta);
    /* La puerta del horno (capa 0, piedra): neutra hasta la ola 4. */
    vec4 micro = microRelieveQ(0, P, pxMundoQ);
    tA += micro.xy;
    alb *= 1.0 - micro.z;
    rug = clamp(rug + micro.w, 0.02, 1.0);
    #endif
    #if NIVEL_Q >= 3
    /* El paralaje de las juntas, a menos de unos 6 m: la junta se lee honda porque su pared se ve de lado. */
    {
      vec3 V = normalize(cameraPosition - P);
      vec2 corrido = local - V.xz / max(V.y, 0.25) * 0.012;
      vec2 aJ2 = vec2(0.3, 0.2) - abs(corrido);
      float j2 = max(coberturaQ(min(aJ2.x, 0.3), 0.006, fw.x), coberturaQ(min(aJ2.y, 0.2), 0.006, fw.y));
      float cercaP = 1.0 - smoothstep(0.006, 0.014, px);
      junta = max(junta, j2 * 0.7 * cercaP);
    }
    #endif
    /* LA CENEFA: 0,4 m de granito oscuro, en piezas de 1 m a lo largo del borde de la plaza. */
    float cenefa = dentroQ(0.4 - borde, px);
    if (cenefa > 0.0) {
      float aLo = dx < dz ? P.z : P.x;
      float juntaC = max(coberturaPeriodicaQ(fract(aLo + 0.5) - 0.5, 0.004, 1.0, pxLargo), coberturaQ(borde - 0.4, 0.004, px));
      vec3 granito = vec3(0.12, 0.122, 0.13) * (0.9 + 0.2 * hashQ(vec2(floor(aLo), 1.0), 27.0)) * (1.0 - 0.4 * juntaC);
      alb = mix(alb, granito, cenefa);
      rug = mix(rug, mix(0.5, 0.3, mojadoPiedra), cenefa);
      junta = mix(junta, juntaC, cenefa);
      tA *= 1.0 - cenefa;
    }
    alb *= 1.0 - 0.35 * junta;
    enJunta = junta;
    nW = normalize(vec3(tA.x, 1.0, tA.y));
  } else {
    /* EL CALLEJÓN Y EL PATIO: losas de hormigón de 3 × 3 m con juntas serradas, la canaleta del centro (el
       callejón va por el centro del hueco, x = 48i o z = 48j: por ahí escurre) y manchas. */
    vec2 aJunta = (0.5 - abs(fract(P.xz / 3.0) - 0.5)) * 3.0;
    float junta = 1.0 - (1.0 - coberturaPeriodicaQ(aJunta.x, 0.005, 3.0, fw.x)) * (1.0 - coberturaPeriodicaQ(aJunta.y, 0.005, 3.0, fw.y));
    float losa = hashQ(floor(P.xz / 3.0), 29.0);
    float manchas = fbmT(P.xz * 0.5, lodQ(0.5));
    alb = vec3(0.12, 0.12, 0.115) * (0.7 + 0.6 * manchas) * (0.72 + 0.56 * losa) * (1.0 - 0.6 * junta);
    /* La canaleta: dos palmos de piedra más oscura y más lisa, un poco hundida (sólo en la rugosidad y el color). */
    vec2 alCentro = abs(P.xz - 48.0 * floor(P.xz / 48.0 + 0.5));
    float canal = max(dentroQ(0.08 - alCentro.x, fw.x), dentroQ(0.08 - alCentro.y, fw.y));
    float filo = max(coberturaQ(alCentro.x - 0.08, 0.004, fw.x), coberturaQ(alCentro.y - 0.08, 0.004, fw.y));
    rug = mix(0.78, 0.6, mojadoPiedra) - 0.12 * losa;
    rug = mix(rug, 0.42, canal * (0.5 + 0.5 * uHumedad));
    alb *= (1.0 - 0.3 * canal) * (1.0 - 0.5 * filo);
    enJunta = junta;
    #if NIVEL_Q >= 1
    /* Los cercos: manchas oscuras de lo que se derrama y se seca. */
    float cerco = smoothstep(0.62, 0.7, ruidoT(P.xz * 0.8 + 17.0, lodQ(0.8)));
    alb *= 1.0 - 0.3 * cerco;
    rug = mix(rug, rug * 0.8, cerco);
    #endif
  }
  /* Mojado: más oscuro, más liso, y charcos pequeños en los hundimientos. */
  float ch = Ng.y > 0.5 ? charcoDeLaAceraQ(P.xz) : 0.0;
  charcoFinal = ch;
  /* La orilla del charco, un halo oscuro (el charco de la acera llega como mucho a 0,8). */
  float cO = ch * 1.25;
  float orilla = 4.0 * cO * (1.0 - cO);
  alb *= mix(mix(0.72, 0.52, uHumedad), 0.35, ch);
  alb *= 1.0 - 0.3 * orilla;
  /* Mojada, pero la piedra no es un espejo fuera del charco: con la rugosidad a dos tercios, al alba la
     plaza entera reflejaba el cielo claro y era la parte más luminosa de la imagen. */
  rug = mix(rug, 0.03, ch);
  /* El agua de las juntas: más lisa, pero 0,25 y no 0,08 (eso eran rayas de cromo con las luces de verdad). */
  rug = mix(rug, 0.25, enJunta * 0.7 * (1.0 - ch));
  alb *= 1.0 - 0.25 * enJunta;
  /* La suciedad donde no llegan la lluvia ni la escoba: la oclusión oscurece y quita brillo. */
  float oclusion = oclusionDelSueloQ(P.xz);
  alb *= oclusion;
  rug = mix(rug, min(rug + 0.2, 1.0), (1.0 - oclusion) * (1.0 - ch));
  nW = normalize(mix(nW, Ng, ch));
  diffuseColor.rgb = alb;
  roughnessFactor = rug;
  metalnessFactor = 0.0;
  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
}
`;

const RETOQUES_DE_LA_ACERA = new Map<NivelDeLaCiudad, Retoque>();

function retoqueDeLaAcera(nivel: NivelDeLaCiudad): Retoque {
  const hecho = RETOQUES_DE_LA_ACERA.get(nivel);
  if (hecho !== undefined) return hecho;
  const r: Retoque = {
    nombre: `acera-n${nivel}`,
    orden: 10,
    uniformes: {
      uHumedad: UNIFORMES_DE_LA_CIUDAD.uHumedad,
      uOclusionSuelo: UNIFORMES_DE_LA_CIUDAD.uOclusionSuelo,
      uOclusionCaja: UNIFORMES_DE_LA_CIUDAD.uOclusionCaja,
    },
    defines: { NIVEL_Q: String(nivel) },
    vertice: [
      {
        buscar: '#include <common>',
        como: 'despues',
        texto: 'attribute vec4 aIsla;\nattribute float aSuelo;\nvarying vec4 vIslaQ;\nvarying float vSueloQ;',
      },
      { buscar: '#include <uv_vertex>', como: 'despues', texto: 'vIslaQ = aIsla;\nvSueloQ = aSuelo;' },
    ],
    fragmento: [
      { buscar: '#include <lights_pars_begin>', como: 'antes', texto: DECLARACIONES_DE_LA_ACERA },
      { buscar: '#include <normal_fragment_maps>', como: 'despues', texto: CUERPO_DE_LA_ACERA },
      {
        buscar: '#include <lights_physical_fragment>',
        como: 'despues',
        texto: 'material.specularColor = mix(material.specularColor, vec3(0.02), charcoFinal);',
      },
    ],
  };
  RETOQUES_DE_LA_ACERA.set(nivel, r);
  return r;
}

/** El material de la acera, el bordillo, la plaza y el callejón de un nivel. Cada llamada, uno nuevo. */
export function materialDeLaAcera(nivel: NivelDeLaCiudad): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0 });
  m.name = 'quiebro-acera';
  parchear(m, RETOQUE_MUNDO, retoqueDeLaMateria(nivel), RETOQUE_ENTORNO, RETOQUE_SOLO_BRILLO, retoqueDeLaAcera(nivel));
  nieblaEn(m);
  return m;
}

/* ═══════════════════════════════ LA GEOMETRÍA ═══════════════════════════════ */

export interface IslaDelSuelo {
  readonly caja: CajaXZ;
  readonly tipo: 'acera' | 'plaza';
  /** La manzana de dentro (el patio queda entre la acera y ella). */
  readonly manzana: CajaXZ;
}

export interface SueloConstruido {
  readonly asfalto: THREE.BufferGeometry;
  readonly islas: THREE.BufferGeometry;
}

/** Los ejes de todas las calles en x y en z, con su calzada. */
function tipoDelTrozo(cx: number, cz: number, calles: readonly CalleDelPlano[]): { tipo: number; calle: CalleDelPlano | null } {
  const enX = calles.find((c) => c.corre === 'x' && Math.abs(cz - c.en) < c.calzada / 2 + 0.01 && cx >= c.desde && cx <= c.hasta);
  const enZ = calles.find((c) => c.corre === 'z' && Math.abs(cx - c.en) < c.calzada / 2 + 0.01 && cz >= c.desde && cz <= c.hasta);
  if (enX !== undefined && enZ !== undefined) return { tipo: TRAMO.cruce, calle: enX };
  if (enX !== undefined) return { tipo: TRAMO.correX, calle: enX };
  if (enZ !== undefined) return { tipo: TRAMO.correZ, calle: enZ };
  return { tipo: TRAMO.lejos, calle: null };
}

/**
 * CONSTRUYE EL SUELO. `islas`: las manzanas con sus aceras. `calles`: todas (barrio y anillo).
 * `extension`: hasta dónde llega la calzada (más allá, el horizonte lo pone el anillo).
 *
 * `aIsla` es la caja que enmarca cada cara: la isla en la acera y en el canto del bordillo, y la PLAZA (su
 * manzana) en el suelo de la plaza, que así sabe dónde va su cenefa. `aCalle` lleva la calzada, la acera y, en z, un
 * 1 si el tramo NO acaba en un cruce por sus dos puntas (sin cebra ni línea de parada). Los triángulos son los de
 * siempre.
 */
export function construirElSuelo(islas: readonly IslaDelSuelo[], calles: readonly CalleDelPlano[], extension: CajaXZ): SueloConstruido {
  /* ─── La calzada: la rejilla de las líneas de las islas, menos las islas. ─── */
  const xs = new Set<number>([extension.x0, extension.x1]);
  const zs = new Set<number>([extension.z0, extension.z1]);
  for (const i of islas) {
    xs.add(i.caja.x0);
    xs.add(i.caja.x1);
    zs.add(i.caja.z0);
    zs.add(i.caja.z1);
  }
  const X = [...xs].filter((x) => x >= extension.x0 && x <= extension.x1).sort((a, b) => a - b);
  const Z = [...zs].filter((z) => z >= extension.z0 && z <= extension.z1).sort((a, b) => a - b);
  /*
   * Primero qué es cada rectángulo de la rejilla. La rejilla es de TODA la ciudad: una línea que sale de las islas
   * de una avenida parte también los tramos de las calles de lejos, y un tramo de 42 m quedaba en trozos de 5 y 37;
   * el de 5, al lado del cruce, no llegaba a los 10 m y la cebra no se pintaba (ni la raya del eje). Así que el
   * `desde`/`hasta` de un tramo es el de la TIRA entera de rectángulos seguidos de la misma calle, de cruce a cruce;
   * los triángulos son los mismos.
   */
  type Trozo = { readonly tipo: number; readonly calle: CalleDelPlano | null } | null;
  const nx = X.length - 1;
  const nz = Z.length - 1;
  const trozos: Trozo[] = [];
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const x0 = X[i] as number;
      const x1 = X[i + 1] as number;
      const z0 = Z[k] as number;
      const z1 = Z[k + 1] as number;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const vacio = x1 - x0 < 1e-3 || z1 - z0 < 1e-3 || islas.some((s) => cx > s.caja.x0 && cx < s.caja.x1 && cz > s.caja.z0 && cz < s.caja.z1);
      trozos.push(vacio ? null : tipoDelTrozo(cx, cz, calles));
    }
  }
  const trozo = (i: number, k: number): Trozo => (i < 0 || k < 0 || i >= nx || k >= nz ? null : (trozos[i * nz + k] ?? null));
  const mismaTira = (a: Trozo, b: Trozo): boolean => a !== null && b !== null && a.tipo === b.tipo && a.calle === b.calle;
  const asfalto = new Molde({ aTramo: 4, aCalle: 4 });
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const t = trozo(i, k);
      if (t === null) continue;
      const x0 = X[i] as number;
      const x1 = X[i + 1] as number;
      const z0 = Z[k] as number;
      const z1 = Z[k + 1] as number;
      const { tipo, calle } = t;
      const eje = calle?.en ?? 0;
      let desde = 0;
      let hasta = 0;
      /* Si la tira no acaba en un cruce por sus dos puntas (la salida de una avenida, que sigue 20 m más allá del
         borde y se acaba en el canto del asfalto), no lleva cebras: ahí no hay paso ni rampa (`tapas.ts` sólo pone
         vados entre dos cruces). */
      let entreCruces = false;
      const esCruce = (o: Trozo): boolean => o !== null && o.tipo === TRAMO.cruce;
      if (tipo === TRAMO.correX) {
        let a = i;
        let b = i;
        while (mismaTira(trozo(a - 1, k), t)) a--;
        while (mismaTira(trozo(b + 1, k), t)) b++;
        desde = X[a] as number;
        hasta = X[b + 1] as number;
        entreCruces = esCruce(trozo(a - 1, k)) && esCruce(trozo(b + 1, k));
      } else if (tipo === TRAMO.correZ) {
        let a = k;
        let b = k;
        while (mismaTira(trozo(i, a - 1), t)) a--;
        while (mismaTira(trozo(i, b + 1), t)) b++;
        desde = Z[a] as number;
        hasta = Z[b + 1] as number;
        entreCruces = esCruce(trozo(i, a - 1)) && esCruce(trozo(i, b + 1));
      }
      asfalto.poner('aTramo', tipo, eje, desde, hasta);
      asfalto.poner('aCalle', calle?.calzada ?? 6, calle?.acera ?? 3, entreCruces ? 0 : 1, 0);
      asfalto.losa(x0, z0, x1, z1, 0, true);
    }
  }

  /* ─── Las islas: losa arriba, canto de bordillo y, dentro, el patio más bajo no hace falta. ─── */
  const suelo = new Molde({ aIsla: 4, aSuelo: 1 });
  const h = ALTURA_DE_LA_ACERA;
  for (const s of islas) {
    const c = s.caja;
    suelo.poner('aIsla', c.x0, c.z0, c.x1, c.z1);
    /* Acera en anillo alrededor de la manzana y, dentro, el patio o la plaza: suelos que no se pisan. */
    const m = s.manzana;
    suelo.poner('aSuelo', SUELO.acera);
    suelo.losa(c.x0, c.z0, c.x1, m.z0, h, true);
    suelo.losa(c.x0, m.z1, c.x1, c.z1, h, true);
    suelo.losa(c.x0, m.z0, m.x0, m.z1, h, true);
    suelo.losa(m.x1, m.z0, c.x1, m.z1, h, true);
    suelo.poner('aSuelo', s.tipo === 'plaza' ? SUELO.plaza : SUELO.patio);
    /* La plaza se enmarca con su propia caja (la cenefa); el patio, con la isla (su canaleta no la necesita). */
    if (s.tipo === 'plaza') suelo.poner('aIsla', m.x0, m.z0, m.x1, m.z1);
    suelo.losa(m.x0, m.z0, m.x1, m.z1, h, true);
    suelo.poner('aIsla', c.x0, c.z0, c.x1, c.z1);
    suelo.caja(c.x0, 0, c.z0, c.x1, h, c.z1, 'nseo');
  }
  return { asfalto: asfalto.geometria(), islas: suelo.geometria() };
}

/** Las islas del barrio a partir de sus manzanas y de la glorieta, con la acera de alrededor. */
export function islasDe(manzanas: readonly CajaXZ[], plaza: CajaXZ | null, acera: number): IslaDelSuelo[] {
  const crecer = (c: CajaXZ): CajaXZ => ({ x0: c.x0 - acera, z0: c.z0 - acera, x1: c.x1 + acera, z1: c.z1 + acera });
  const salida: IslaDelSuelo[] = manzanas.map((m) => ({ caja: crecer(m), tipo: 'acera' as const, manzana: m }));
  if (plaza !== null) salida.push({ caja: crecer(plaza), tipo: 'plaza', manzana: plaza });
  return salida;
}
