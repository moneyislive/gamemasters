/**
 * EL GLSL DE LA MATERIA: las funciones que los materiales de la ciudad llaman para tener relieve,
 * grano, juntas y envejecimiento, leyendo la textura de ruido (`ruido.ts`) en vez de encadenar PCG.
 *
 * ═══ LA API, CONGELADA EN LA OLA 1 (plan del detalle, §5.2.6) ═══
 *
 * Quien la cambie avisa al coordinador: las familias de la ola 2 escriben contra ella a la vez.
 *
 * Globales que pone el PREÁMBULO (una vez, al principio de `main`, en flujo uniforme):
 *
 *   float pxMundoQ          la huella del píxel en metros sobre la superficie (entre el eje fino y el grueso)
 *   vec3  dPdxQ, dPdyQ      las derivadas de pantalla de `vPosMundoQ`
 *   vec2  dUvdxQ, dUvdyQ    las de la UV que el material nombre con el define `MATERIA_UV_Q` (0 si no nombra)
 *
 * Funciones (todas con sufijo Q o T; T = lee la textura):
 *
 *   float lodQ(float frecuencia)                    el mip para leer algo de `frecuencia` téxeles por metro
 *   float ruidoT(vec2 p, float lod)                 ruido de valor suave en [0, 1]; p en celdas; UNA lectura
 *   float fbmT(vec2 p, float lod)                   OCTAVAS_Q octavas de `ruidoT` (1-4 según el nivel)
 *   vec3  granoT(vec2 p, float lod)                 (altura, d/dpx, d/dpy) del grano; UNA lectura (dos en N3)
 *   float varianzaPerdidaQ(float lod)               la pendiente que la mip se ha comido
 *   float rugosidadFiltradaQ(float rug, float var)  la rugosidad con esa pendiente sumada (antialias especular)
 *   vec2  hash2Q(vec2 p, float semilla)             dos hash de 16 bits con UNA cadena PCG
 *   vec3  juntaQ(vec2 q, vec2 pieza, float desfase, out vec2 id)
 *                                                   distancia al eje de la junta (x) y su dirección (yz)
 *   vec3  relieveDeJuntaQ(vec3 j, float medio, float bisel, float hondo, float px)
 *                                                   pendiente del chaflán (xy) y oclusión (z), en forma cerrada
 *   vec2  humedadDelPieQ(vec2 q, float y, float semilla)
 *                                                   (humedad capilar 0-1, salitre 0-1) al pie de un muro
 *   float chorretonQ(float dx, float dy, float medioX, vec2 q, float semilla)
 *                                                   el chorretón bajo un alféizar (0-1)
 *   vec3  normalPorDerivadasQ(vec3 N, vec2 gradUv, float amp)
 *                                                   normal de mundo con una altura dada por su gradiente en la
 *                                                   UV de `MATERIA_UV_Q`, sin tangentes (Mikkelsen)
 *   vec3  normalPorGradienteQ(vec3 N, vec3 gradMundo, float amp)
 *                                                   ídem con el gradiente ya en mundo
 *   vec4  microRelieveQ(int capa, vec3 p, float px) la fase 2 (el horno): (pendiente xy, cavidad, +rug).
 *                                                   NEUTRA hasta la ola 4: devuelve 0. Es la ÚNICA puerta.
 *   float grietaQ(vec3 p, float px)                 el gancho de la grieta del Estampado. Neutra: 0.
 *
 * Y lo de las familias (`familias.ts`): `AcabadoQ decodificarAcabadoQ(vec2)`, `EntradaQ`, `SuperficieQ`,
 * `SuperficieQ superficieQ(int familia, EntradaQ e)`, `void recordarSuperficieQ(SuperficieQ s)`, que
 * guarda el barniz y la emisión para el lóbulo de después de la luz (`retoque.ts`), y
 * `vec2 rugYMetalQ(vec2 a)`, la receta de N0.
 *
 * ═══ N0: NI STRUCT NI REPARTO ═══
 *
 * En N0 `superficieQ` no reparte, así que construir el `EntradaQ` (y decodificar el `AcabadoQ`) sería
 * gasto sin nada a cambio: el prototipo subía el mobiliario de 461 a 560 instrucciones sólo por eso. En
 * N0 el que llama NO decodifica ni llama a `superficieQ`; saca la rugosidad y el metal con
 * `rugYMetalQ(vAcabadoQ)`, que es la API de N0 y vale para toda familia. Es exactamente esto, dos `fract`
 * sin struct, sin marcas y sin enteros:
 *
 *   rug   = fract(vAcabadoQ.x);    // quita la familia de la parte entera
 *   metal = fract(vAcabadoQ.y);    // quita las marcas (4·chaflán + 2·barniz) de la parte entera
 *
 * Y el cableado de un material, con la receta de N0 en su sitio:
 *
 *   #if MATERIA_Q >= 1
 *   AcabadoQ acab = decodificarAcabadoQ(vAcabadoQ);
 *   SuperficieQ s = superficieQ(acab.familia, EntradaQ(acab, albedo, n, p, uv));
 *   recordarSuperficieQ(s);           // OBLIGATORIO: el barniz y la emisión sólo llegan por aquí
 *   …
 *   #else
 *   vec2 rm = rugYMetalQ(vAcabadoQ);  // (rug, metal); en N0 no hay barniz ni emisión de familia
 *   #endif
 *
 * Leer `vAcabadoQ` tal cual en N0 está MAL en cuanto la familia no sea 0: la rugosidad sería «familia + rug».
 * Y el metal 1,0 no existe en el acabado: `acabado()` lo deja en 0,999, porque `fract(1,0)` es 0 (ver la
 * cabecera de `familias.ts`, el cromo).
 *
 * ═══ EL ORDEN DEL PREÁMBULO: DELANTE DE TODO `discard` ═══
 *
 * El preámbulo deriva (`dFdx`, `dFdy`). Una derivada se calcula en el cuadro de 2×2 píxeles, restando lo
 * de los vecinos; si antes de ella un vecino ha hecho `discard` en una rama que no han tomado los cuatro,
 * GLSL ES 3.00 la deja SIN DEFINIR (el flujo ya no es uniforme). En D3D (ANGLE en Windows) el píxel
 * descartado sigue corriendo como «ayudante» hasta el final y la derivada sale bien, y por eso ahí no se
 * vería nunca; pero nada obliga a un controlador de GLES de móvil (ni a ANGLE sobre Vulkan, donde el
 * `discard` puede ser un `OpKill` que termina el píxel) a hacer lo mismo, y entonces la derivada es basura:
 * una normal rota justo en la franja del fundido. No vale fiarse del ayudante.
 *
 * Así que el preámbulo va ANTES de `#include <clipping_planes_fragment>` (`retoque.ts`), y los descartes
 * de la ciudad —el fundido del detalle en la fachada y el mobiliario de la ventana, y el de lo lejano,
 * los dos de orden 5 con su `if (…) discard;` DESPUÉS de ese `#include`— y el propio recorte de three
 * quedan todos DETRÁS: el preámbulo deriva con el cuadro entero, guarda sus globales, y lo que se descarte
 * luego ya no importa, porque después nadie deriva (todo lee con `textureLod` y un lod explícito). Lo
 * vigila `verify:quiebro-materia` (d) sobre el texto MONTADO de la ventana con el fundido (N1-N3) y de lo
 * lejano real con el suyo, y la vacuna es el ancla de antes, que dejaba el `discard` delante.
 *
 * ═══ LAS REGLAS (las vigila `verify:quiebro-materia`) ═══
 *
 *   · DERIVADAS SÓLO EN EL PREÁMBULO. `dFdx`, `dFdy`, `fwidth` y `texture()` con mip implícito no están
 *     definidos dentro de una rama que no tomen todos los píxeles del cuadro de 2×2: el prototipo derivaba
 *     dentro del `if` de la familia del mobiliario, y en un aparato eso es una normal de basura. Aquí se
 *     deriva UNA vez, sin ramas, y todo lo demás lee con `textureLod` y un lod explícito (`lodQ`).
 *   · NI DERIVADAS NI LECTURAS POR MACRO NI POR PARÁMETRO. Un `#define` con argumentos, o cuyo cuerpo
 *     nombre `dFdx`, `dFdy`, `fwidth`, una `texture*`/`texelFetch*`, `pcgQ` o `uRuidoQ`, o que pegue fichas
 *     con `##`, es rojo; y también una función con un parámetro `sampler*` o un sampler que no sea un
 *     `uniform` suelto. Con cualquiera de ellos una derivada o una lectura se esconden a la regla de fuente
 *     y al contador del presupuesto, que cuenta `texture*(uRuidoQ, …)` y nada más: por eso `uRuidoQ` sólo
 *     se nombra como primer argumento de una lectura (lo mira también sobre el texto montado).
 *   · LAS COORDENADAS DEL RUIDO SE REDUCEN MÓDULO EL PERIODO ANTES DE LEER. A 300 m, `x · 48` son 14.400
 *     téxeles; reducido, la coma flotante sigue teniendo decimales para la bilineal.
 *   · SIN BUCLES: `fbmT` va desenrollado a mano (el compilador de D3D dejaba el bucle, y el de un móvil puede
 *     hacer lo mismo), y el presupuesto de lecturas se cuenta sobre el texto.
 *   · LO QUE DECIDE SIGUE EN `hashQ`. Ventanas, tiendas, colores y tarjetas no leen esta textura.
 *   · NADA DE ESTO ENTRA EN LOS CHARCOS. `GLSL_CHARCOS` (`../glsl.ts`) no se toca: su sha lo vigila el
 *     comprobador.
 *   · El relieve de la materia se anula bajo `uRejillaDeGlifos > 0,5`, y el bloque de la Grafía sigue
 *     siendo lo último del cuerpo de la fachada. Eso es del que cablea (PAREDES), no de aquí.
 *
 * ═══ POR NIVEL ═══
 *
 * `MATERIA_Q` es el nivel (0 en lo lejano) y `OCTAVAS_Q` sale de él (1/2/3/4). N0 no lleva relieve de
 * materia ni reparte familias; N1 añade el borde con ruido de la humedad y los chorretones; N2 el
 * salitre; N3 la segunda lectura girada del grano, para que no se note la repetición de 128 téxeles
 * desde la Vigía.
 *
 * Todo necesita el retoque `mundo` (`vPosMundoQ`, `pcgQ`), que va antes (orden −10 contra −5).
 */

/** Las declaraciones y las funciones. Van justo detrás de las de `mundo` (ver `retoque.ts`). */
export const GLSL_DE_LA_MATERIA = /* glsl */ `
uniform sampler2D uRuidoQ;
uniform float uVarianzaDelGranoQ[8];
float pxMundoQ;
vec3 dPdxQ;
vec3 dPdyQ;
vec2 dUvdxQ;
vec2 dUvdyQ;
float lodQ(float frecuencia) { return log2(max(pxMundoQ * frecuencia, 1e-4)); }
/* Ruido de valor suave en [0, 1] con UNA lectura: Hermite encima de la bilineal. p en celdas (téxeles). */
float ruidoT(vec2 p, float lod) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  i = mod(i, 128.0);
  return textureLod(uRuidoQ, (i + u + 0.5) * (1.0 / 128.0), max(lod, 0.0)).r;
}
/* Las octavas del nivel, desenrolladas; cada una sube su mip, y la que no está vale su media. */
float fbmT(vec2 p, float lod) {
  float s = 0.5 * ruidoT(p, lod);
  #if OCTAVAS_Q >= 2
  s += 0.25 * ruidoT(p * 2.03 + vec2(17.1, 9.7), lod + 1.02);
  #else
  s += 0.25 * 0.5;
  #endif
  #if OCTAVAS_Q >= 3
  s += 0.125 * ruidoT(p * 4.1209 + vec2(51.8, 29.4), lod + 2.04);
  #else
  s += 0.125 * 0.5;
  #endif
  #if OCTAVAS_Q >= 4
  s += 0.0625 * ruidoT(p * 8.3654 + vec2(122.3, 69.4), lod + 3.06);
  #else
  s += 0.0625 * 0.5;
  #endif
  return s;
}
/* El grano: altura (x) y gradiente (yz) por unidad de p, de UNA lectura filtrada por las mips. */
vec3 granoT(vec2 p, float lod) {
  float l = max(lod, 0.0);
  vec4 t = textureLod(uRuidoQ, mod(p, 128.0) * (1.0 / 128.0), l);
  vec3 g = vec3(t.g, (t.ba * 2.0 - 1.0) * 0.35);
  #if MATERIA_Q >= 3
  /* La segunda lectura, girada 37 grados y desplazada: desde arriba ya no se ve la baldosa de 128. La
     media de dos granos pierde contraste; se le devuelve (x 1,41) para que la varianza tabulada valga. */
  mat2 giro = mat2(0.8, 0.6, -0.6, 0.8);
  vec4 t2 = textureLod(uRuidoQ, mod(giro * p + vec2(37.3, 71.9), 128.0) * (1.0 / 128.0), l);
  vec2 g2 = transpose(giro) * ((t2.ba * 2.0 - 1.0) * 0.35);
  g = vec3(0.5 + (0.5 * (t.g + t2.g) - 0.5) * 1.41, (g.yz + g2) * 0.705);
  #endif
  return g;
}
/* La varianza de la pendiente que la mip se ha comido (tabulada en JS al generar la textura). */
float varianzaPerdidaQ(float lod) {
  return uVarianzaDelGranoQ[int(clamp(lod, 0.0, 7.0))];
}
/* La rugosidad que absorbe la pendiente que ya no se ve: el brillo no centellea a 10-30 m. */
float rugosidadFiltradaQ(float rug, float varianza) {
  return sqrt(clamp(rug * rug + varianza, 0.0, 1.0));
}
/* Dos hash de 16 bits con UNA cadena PCG (en vez de dos hashQ). Para adorno por pieza, no para decidir. */
vec2 hash2Q(vec2 p, float semilla) {
  uvec2 q = uvec2(ivec2(floor(p)) + 65536);
  uint h = pcgQ(q.x + pcgQ(q.y + pcgQ(uint(max(semilla, 0.0)) * 9973u)));
  return vec2(float(h & 65535u), float(h >> 16u)) * (1.0 / 65536.0);
}
/*
 * Un aparejo (sillar, ladrillo, azulejo, adoquín, baldosa): piezas de 'pieza' metros, cada fila desplazada
 * 'desfase'. Devuelve (distancia al eje de la junta más cercana, su dirección en x, en y) y el id de la pieza.
 */
vec3 juntaQ(vec2 q, vec2 pieza, float desfase, out vec2 id) {
  float fila = floor(q.y / pieza.y);
  float x = q.x + mod(fila, 2.0) * desfase;
  id = vec2(floor(x / pieza.x), fila);
  vec2 f = vec2(x - id.x * pieza.x, q.y - fila * pieza.y);
  vec2 d = min(f, pieza - f);
  vec2 s = vec2(f.x < pieza.x * 0.5 ? -1.0 : 1.0, f.y < pieza.y * 0.5 ? -1.0 : 1.0);
  return d.x < d.y ? vec3(d.x, s.x, 0.0) : vec3(d.y, 0.0, s.y);
}
/*
 * El perfil de una junta en forma cerrada: la cara de la pieza a 0 y la llaga hundida 'hondo', con un
 * chaflán de ancho 'bisel' a partir de 'medio' (media llaga). Devuelve (pendiente x, y; oclusión). La
 * amplitud se apaga cuando el píxel es más ancho que el chaflán: lo que ya no cabe lo pone la rugosidad.
 */
vec3 relieveDeJuntaQ(vec3 j, float medio, float bisel, float hondo, float px) {
  float t = clamp((j.x - medio) / bisel, 0.0, 1.0);
  float pendiente = hondo / bisel * 6.0 * t * (1.0 - t);
  float cabe = 1.0 - smoothstep(bisel * 0.5, bisel * 1.5, px);
  float ao = mix(0.55, 1.0, smoothstep(0.0, medio + bisel, j.x));
  return vec3(j.yz * pendiente * cabe, mix(1.0, ao, cabe * 0.8 + 0.2));
}
/*
 * La humedad capilar del pie de un muro, a la altura 'y' (m sobre la acera). N0: una banda analítica a
 * 0,7 m, sin lecturas. N1+: el borde sube y baja con el ruido. N2+: el salitre en el borde. Devuelve
 * (húmedo 0-1, salitre 0-1): el que cablea oscurece el albedo, baja la rugosidad y pinta el salitre.
 */
vec2 humedadDelPieQ(vec2 q, float y, float semilla) {
  #if MATERIA_Q >= 1
  float alto = 0.45 + 0.65 * fbmT(vec2(q.x * 0.6, semilla * 0.37), lodQ(0.6));
  #else
  float alto = 0.7;
  #endif
  float humedo = 1.0 - smoothstep(alto - 0.1, alto, y);
  float salitre = 0.0;
  #if MATERIA_Q >= 2
  salitre = smoothstep(alto - 0.1, alto - 0.03, y) * (1.0 - smoothstep(alto - 0.01, alto + 0.05, y));
  salitre *= smoothstep(0.4, 0.7, ruidoT(q * vec2(3.0, 9.0), lodQ(9.0)));
  #endif
  return vec2(humedo, salitre);
}
/*
 * El chorretón bajo un alféizar: 'dy' metros por debajo del hueco, 'dx' del centro, 'medioX' medio ancho
 * del hueco. 0 en N0 (sin lecturas).
 */
float chorretonQ(float dx, float dy, float medioX, vec2 q, float semilla) {
  #if MATERIA_Q >= 1
  if (dy < 0.0 || dy > 2.2 || abs(dx) > medioX + 0.15) return 0.0;
  float veta = smoothstep(0.35, 0.75, ruidoT(vec2(q.x * 7.0 + semilla, q.y * 0.35), lodQ(7.0)));
  return veta * exp(-dy * 1.1) * (1.0 - smoothstep(medioX - 0.05, medioX + 0.15, abs(dx)));
  #else
  return 0.0;
  #endif
}
/*
 * La normal de mundo de una superficie con altura h, dado el gradiente de h en la UV del material
 * (define MATERIA_UV_Q): el gradiente de superficie de Mikkelsen con las derivadas que tomó el
 * preámbulo. Sin tangentes, vale para cualquier pieza girada, y NO deriva: se puede llamar en una rama.
 */
vec3 normalPorDerivadasQ(vec3 N, vec2 gradUv, float amp) {
  float dhx = dot(gradUv, dUvdxQ) * amp;
  float dhy = dot(gradUv, dUvdyQ) * amp;
  vec3 r1 = cross(dPdyQ, N);
  vec3 r2 = cross(N, dPdxQ);
  float det = dot(dPdxQ, r1);
  if (abs(det) < 1e-14) return N;
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * N - grad);
}
/* Ídem con el gradiente de la altura ya en mundo: se quita su parte normal y se inclina la normal. */
vec3 normalPorGradienteQ(vec3 N, vec3 gradMundo, float amp) {
  return normalize(N - amp * (gradMundo - dot(gradMundo, N) * N));
}
/*
 * EL MICRO-RELIEVE DEL HORNO (fase 2, ola 4, sólo N2-N3): (pendiente tangente x, y; cavidad a restar de la
 * oclusión; rugosidad a sumar) de la capa 0 piedra, 1 barro cocido, 2 hormigón, 3 asfalto, 4 metal
 * pintado, 5 madera. Hasta que exista el horno es neutra: todo 0, y el que la llama no cambia nada.
 */
vec4 microRelieveQ(int capa, vec3 p, float px) {
  return vec4(0.0);
}
/*
 * EL GANCHO DE LA GRIETA DEL ESTAMPADO (uGrietasQ[8], que hoy no existe): 0-1 de grieta en p. Neutro; lo
 * rellena el frente de efectos, no este plan.
 */
float grietaQ(vec3 p, float px) {
  return 0.0;
}
`;

/**
 * EL PREÁMBULO: lo ÚNICO de la materia que deriva. Va al principio de `main`, justo ANTES de
 * `#include <clipping_planes_fragment>` (delante de todo `discard`: ver `retoque.ts`), en código recto: sin
 * `if`, sin `?`, sin bucles (lo vigila `verify:quiebro-materia`, d). Las directivas del preprocesador no
 * son ramas, pero un `#define` que nombre una derivada o una lectura sí está prohibido en `materia/**`.
 */
export const GLSL_PREAMBULO_DE_LA_MATERIA = /* glsl */ `
{
  dPdxQ = dFdx(vPosMundoQ);
  dPdyQ = dFdy(vPosMundoQ);
  float lxQ = length(dPdxQ);
  float lyQ = length(dPdyQ);
  pxMundoQ = mix(min(lxQ, lyQ), max(lxQ, lyQ), 0.3);
  #ifdef MATERIA_UV_Q
  dUvdxQ = dFdx(MATERIA_UV_Q);
  dUvdyQ = dFdy(MATERIA_UV_Q);
  #else
  dUvdxQ = vec2(0.0);
  dUvdyQ = vec2(0.0);
  #endif
}
`;

/**
 * EL LÓBULO DE BARNIZ Y LA EMISIÓN, después de la luz (antes de `#include <aomap_fragment>`), para todos:
 * lo que una familia deja en `recordarSuperficieQ` (la carrocería, su barniz) se suma aquí con el cielo
 * falso de la ciudad. Con barniz 0 y emisión 0 no hace nada; en N0 ni se compila. Necesita el retoque
 * `entorno` (`cieloReflejadoQ`), que llevan todos los materiales iluminados de la ciudad.
 */
export const GLSL_BARNIZ_DE_LA_MATERIA = /* glsl */ `
#if MATERIA_Q >= 1 && defined( STANDARD )
{
  totalEmissiveRadiance += emisionQ;
  #if defined( RE_IndirectSpecular )
  if (barnizQ > 0.0) {
    vec3 nB = normalize(normal * mat3(viewMatrix));
    vec3 vB = normalize(cameraPosition - vPosMundoQ);
    float cB = 1.0 - clamp(dot(nB, vB), 0.0, 1.0);
    float fB = 0.04 + 0.96 * cB * cB * cB * cB * cB;
    reflectedLight.indirectSpecular += barnizQ * fB * cieloReflejadoQ(reflect(-vB, nB), rugBarnizQ);
  }
  #endif
}
#endif
`;
