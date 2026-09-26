/**
 * EL MURO SIN HUECOS (`muroQ`): la fábrica de cada estilo —sillería, ladrillo, hormigón, vidrio, azulejo y
 * revoco— con sus juntas, su color y, desde N1, su RELIEVE (la materia, `materia/glsl.ts`). Lo llama el cuerpo (el
 * muro de todas las caras que no son azotea ni barandilla, en `glsl-piezas.ts`), una vez por píxel.
 *
 * ═══ LA FIRMA ES LA DE SIEMPRE; LO NUEVO VA POR GLOBALES ═══
 *
 * `muroQ` la llama un tramo que no es de este paquete (`glsl-piezas.ts`), así que su firma no cambia: devuelve el
 * albedo y la rugosidad por el último argumento. Lo que necesita de más lo lee de globales que pone el prefacio
 * (`glsl-cuerpo.ts`): el SUBESTILO del edificio (`subestiloQ`: el aparejo, el mortero, la piedra), si el volumen es
 * su CIMA (`cimaQ`: su techo es el remate de verdad), su EDAD (`edadQ`, de 0 a 1), la distancia (`distQ`), la vista en el marco de la cara (`vistaEnLaCaraQ`: x a lo largo, y
 * arriba, z hacia fuera) y la mancha grande que comparten el revoco y las piezas (`manchaDelMuroQ`). Y lo que deja
 * para los tramos de después lo escribe en otras: el albedo (`albedoDelMuroQ`, que el fondo del hueco usaba
 * llamando otra vez a `muroQ`), la pendiente del relieve en el marco de la cara (`pendienteDelMuroQ`), la oclusión
 * de las juntas (`oclusionDelMuroQ`), la varianza que la mip se comió (`varianzaDelMuroQ`, para la rugosidad
 * filtrada del cierre) y la altura del grano (`granoDelMuroQ`, las salpicaduras del envejecido). Quien aplica el
 * relieve es el envejecido (`glsl-envejecer.ts`), fuera de los huecos (`paredQ`) y nunca bajo la Grafía.
 *
 * ═══ LO QUE SE LEE DE LEJOS: EL COLOR A GRAN ESCALA ═══
 *
 * Una fachada a 5-60 m no se lee por el microrrelieve (a 25 m un píxel son dos centímetros) sino por cómo varía su
 * COLOR a la escala de las piezas y de los paños. Así que cada fábrica lleva, desde N0 y sin lecturas nuevas (con el
 * hash de cada pieza y la mancha del prefacio):
 *
 *   - la sillería, un tono por sillar (±12 %, un punto más frío o más cálido) y la junta OSCURA, más la hilada que la
 *     llaga (la pieza de encima le hace sombra), con el almohadillado de la baja en junta ancha;
 *   - el ladrillo, un tono por pieza, la llaga CLARA y los ladrillos sueltos requemados (uno de cada doce, casi
 *     morado) o pálidos (uno de cada veinte);
 *   - el hormigón, un tono por panel (cada hormigonada) sobre las tablillas del encofrado y los berenjenos;
 *   - el azulejo, un tono por placa (±14 %), una placa REPUESTA de otra hornada de cada treinta y la junta clara en el
 *     edificio nuevo y sucia en el viejo;
 *   - el revoco, el MOTEADO (la mancha del prefacio; desde N1 con un fbm estirado de medio metro a tres, ±12-18 %) y
 *     los PARCHES de reparación en algunos paños: un rectángulo de enlucido nuevo, repintado o de cemento sin pintar,
 *     con su borde neto y su labio (`parcheDelRevocoQ`).
 *
 * Las juntas de lejos (`juntaLejanaQ`) se apagan cuando su periodo baja de cuatro píxeles a dos, no de seis a
 * tres como `lineaQ`: el aparejo se lee a 10-15 m. El tono de cada pieza (`piezaVisibleQ`), igual: más pequeña, el
 * hash centellearía, y se funde a su media.
 *
 * ═══ POR NIVEL ═══
 *
 *   N0  el color a gran escala de arriba, con el ruido de la textura en vez del hash (y ninguna lectura propia: la
 *       mancha es la del prefacio), el aparejo y el mortero de cada subestilo y el tono de cada edificio. Sin relieve.
 *   N1  las juntas en relieve con su chaflán y su cavidad a menos de 20 m (el almohadillado de la baja en la
 *       sillería, la llaga rehundida del ladrillo, el bisel del azulejo con la ondulación del vidriado y el
 *       berenjeno del hormigón), los desconchones del revoco con el ladrillo debajo (al pie y bajo el remate, a
 *       menos de 30 m), el moteado fino del revoco, los latiguillos y el ÓXIDO bajo los anclajes del hormigón y la
 *       banda de antepecho del muro cortina.
 *   N2  el relieve hasta 60 m, el grano de cada fábrica (el poro de la piedra, el fratasado del revoco), la
 *       rugosidad de cada pieza (sólo en lo áspero: en la placa vidriada, nada), sus esquinas desportilladas, cada
 *       ladrillo de su hornada de cerca (el canto requemado y el otro más claro, con media cero) y la puerta del
 *       micro-relieve del horno (capas 0, 1 y 2: neutra hasta la ola 4).
 *   N3  el paralaje de la llaga a menos de 6 m (un paso), el poro a menos de 8 m, la segunda lectura girada del
 *       grano (la de la materia) y, a menos de 13 m, lo de CERCA DEL TODO: en el ladrillo, la arista sucia, la llaga
 *       honda en sombra y la cara moteada (con la media del paño de N1: lo que oscurecen la arista y la llaga se lo
 *       devuelve la cara); en el sillar, la arista gastada y las nubes de la cantera.
 *
 * Lo que se añade de cerca no mueve el tono del paño: sólo oscureciendo, la O y la J salían en N3 un 13-18 % más
 * oscuras que en N1, y el tono saltaba al cambiar de nivel (la revisión del remate).
 *
 * Desde N1 deja además la pendiente de la junta sola (`pendienteDeLaJuntaQ`, sin el grano) para la seudoluz y su
 * brillo (`luz-con-direccion.ts`) y para el canto gastado del envejecido.
 *
 * Usa `lineaQ` (`glsl-comun.ts`), `hashQ` (`GLSL_RUIDO`), la materia (`fbmT`, `ruidoT`, `granoT`, `lodQ`,
 * `juntaQ`, `relieveDeJuntaQ`, `hash2Q`, `varianzaPerdidaQ`, `microRelieveQ`) y el define `NIVEL_Q`. No usa
 * ninguna variable del cuerpo.
 */
/** `muroQ` y lo suyo: el tercer tramo, detrás de `GLSL_COMUN_DE_LA_FACHADA`. */
export const GLSL_DEL_MURO = /* glsl */ `
/* Lo que el prefacio le da al muro y lo que el muro deja a los demás tramos (ver la cabecera de glsl-muro.ts). */
int subestiloQ = 0;
float cimaQ = 0.0;
float edadQ = 0.0;
float distQ = 0.0;
vec3 vistaEnLaCaraQ = vec3(0.0, 0.0, 1.0);
float manchaDelMuroQ = 0.5;
vec3 albedoDelMuroQ = vec3(0.3);
vec2 pendienteDelMuroQ = vec2(0.0);
vec2 pendienteDeLaJuntaQ = vec2(0.0);
float oclusionDelMuroQ = 1.0;
float varianzaDelMuroQ = 0.0;
float granoDelMuroQ = 0.5;

/*
 * EL APAREJO de una fábrica de piezas: (largo, alto, desfase de una hilada a la siguiente), por estilo y subestilo.
 * La sillería: caliza de 1,1 × 0,5 (0 y 3), granito de 0,9 × 0,4 (1) o arenisca de 1,3 × 0,45 (2). El ladrillo, a
 * soga (0, 1 y 3) o a la inglesa (2: una hilada de sogas y otra de tizones). El azulejo: placa de 60 × 30 a
 * matajuntas (0 y 3), cuadrada de 30 en retícula (1) y de 20 × 40 en vertical (2).
 */
vec3 aparejoQ(int estilo, int sub, float fila) {
  if (estilo == 0) return sub == 1 ? vec3(0.9, 0.4, 0.45) : sub == 2 ? vec3(1.3, 0.45, 0.65) : vec3(1.1, 0.5, 0.55);
  if (estilo == 1) {
    float largo = sub == 2 && mod(fila, 2.0) > 0.5 ? 0.125 : 0.25;
    return vec3(largo, 0.075, largo * 0.5);
  }
  return sub == 1 ? vec3(0.3, 0.3, 0.0) : sub == 2 ? vec3(0.2, 0.4, 0.1) : vec3(0.6, 0.3, 0.3);
}

/* La junta que se lee de lejos: 1 en la junta, con el borde del píxel, y apagada con el periodo entre 4 y 2 píxeles. */
float juntaLejanaQ(float x, float periodo, float grosor, float px) {
  float f = abs(fract(x / periodo + 0.5) - 0.5) * periodo;
  float l = 1.0 - smoothstep(grosor * 0.5, grosor * 0.5 + px, f);
  return l * (1.0 - smoothstep(periodo / 4.0, periodo / 2.0, px));
}

/* Cuánto se ve el tono de cada pieza: entero con la pieza de cuatro píxeles o más; con dos, se funde a su media. */
float piezaVisibleQ(float lado, float px) {
  return 1.0 - smoothstep(lado / 4.0, lado / 2.0, px);
}

/*
 * LOS PARCHES DEL REVOCO (N0+, sin lecturas): enlucido nuevo sobre el viejo. El paño se parte en celdas de 2,9 × 2,3 m
 * (a matajuntas) y en una de cada seis u ocho (más cuanto más viejo el edificio) hay un rectángulo de 0,9-2,3 × 0,6-1,8 m:
 * el borde recto a regla pero no a escuadra (lo tuerce la mancha, lo ondula un seno de pocos centímetros) y, en él,
 * el labio de la capa nueva. Devuelve (dentro 0-1, labio 0-1, qué parche 0-1).
 */
vec3 parcheDelRevocoQ(vec2 q, float semilla, float px) {
  const vec2 CELDA = vec2(2.9, 2.3);
  float filaP = floor(q.y / CELDA.y);
  float xP = q.x + mod(filaP, 2.0) * 1.37;
  vec2 idP = vec2(floor(xP / CELDA.x), filaP);
  float hP = hashQ(idP, semilla + 61.0);
  if (hP > 0.12 + 0.12 * edadQ) return vec3(0.0);
  vec2 f = vec2(xP, q.y) - idP * CELDA;
  vec2 tam = CELDA * vec2(0.32 + 0.48 * fract(hP * 71.3), 0.26 + 0.52 * fract(hP * 37.9));
  vec2 org = (CELDA - tam) * vec2(fract(hP * 13.1), fract(hP * 5.7));
  vec2 d = abs(f - org - 0.5 * tam) - 0.5 * tam;
  float sd = max(d.x, d.y) + (manchaDelMuroQ - 0.5) * 0.08 + 0.018 * sin(f.x * 5.3 + hP * 40.0) * sin(f.y * 4.1 + hP * 17.0);
  float dentro = 1.0 - smoothstep(-0.5 * px, 0.5 * px, sd);
  float labio = 1.0 - smoothstep(0.004, 0.012 + px, abs(sd));
  return vec3(dentro, labio, fract(hP * 97.1));
}

#if NIVEL_Q >= 1
/*
 * EL RELIEVE DE UNA FÁBRICA DE PIEZAS (N1+): la junta con su chaflán y su cavidad (relieveDeJuntaQ, en forma
 * cerrada), y los ladrillos, apenas, torcidos (junta.w). La piedra, el hormigón y la placa vidriada NO se tuercen:
 * con una farola de pared a un palmo, el brillo es un lóbulo estirado a ras del muro, y medio grado de más en una
 * pieza lo partía en escalones del tamaño de la pieza (medido en la foto C de N3; en la placa, un mosaico: la
 * revisión 1). Desde N2, la rugosidad de cada pieza (sólo en lo áspero, por lo mismo) y el canto desportillado de
 * una de cada cuatro; en N3, a menos de 6 m, el paralaje de la llaga: lo que
 * se ve de ella está más dentro, y el rayo lo encuentra corrido hacia donde mira (un paso, sin gl_FragDepth).
 * junta = (media llaga, chaflán, hondo, torcido), en metros. Deja la pendiente y la oclusión en las globales.
 */
vec2 relieveDeLaFabricaQ(vec2 q, vec3 ap, vec4 junta, float semilla, float px, inout float rugosidad) {
  vec2 id;
  vec3 j = juntaQ(q, ap.xy, ap.z, id);
  #if NIVEL_Q >= 3
  if (distQ < 6.0) {
    float dentro = junta.z * (1.0 - clamp((j.x - junta.x) / junta.y, 0.0, 1.0));
    j = juntaQ(q - vistaEnLaCaraQ.xy / max(vistaEnLaCaraQ.z, 0.25) * dentro, ap.xy, ap.z, id);
  }
  #endif
  vec3 r = relieveDeJuntaQ(j, junta.x, junta.y, junta.z, px);
  vec2 h = hash2Q(id, semilla + 11.0);
  /* El chaflán, sólo cuando mide dos píxeles o más: más fino, cada junta sería una línea que tiembla. */
  pendienteDeLaJuntaQ = r.xy * (1.0 - smoothstep(junta.y * 0.35, junta.y * 0.9, px));
  pendienteDelMuroQ = pendienteDeLaJuntaQ + (h - 0.5) * junta.w * (1.0 - smoothstep(0.02, 0.08, px));
  oclusionDelMuroQ = r.z;
  #if NIVEL_Q >= 2
  /*
   * La rugosidad de cada pieza, apenas, y SÓLO en lo áspero: en la placa vidriada (0,2) cada pieza con su rugosidad
   * partía el lóbulo de la farola de pared en rectángulos del tamaño de la placa (la revisión 2, C de N2 y N3).
   */
  rugosidad = clamp(rugosidad + (h.y - 0.5) * 0.025 * smoothstep(0.35, 0.8, rugosidad), 0.05, 0.98);
  /*
   * El desportillado: una esquina mellada en una pieza de cada cuatro, de uno a cinco centímetros según la pieza
   * (en el ladrillo, un dedo): más honda y más oscura, con el canto hacia la junta. La esquina más cercana sale de
   * dónde cae el punto dentro de su pieza.
   */
  vec2 f = vec2(q.x + mod(id.y, 2.0) * ap.z - id.x * ap.x, q.y - id.y * ap.y);
  float esquina = length(min(f, ap.xy - f));
  float nMella = ruidoT(q * 29.0 + h * 57.0, lodQ(29.0));
  float radio = min(0.035, ap.y * (0.1 + 0.2 * nMella));
  float mella = step(0.74, h.x) * (1.0 - smoothstep(radio * 0.55, radio, esquina)) * (1.0 - smoothstep(0.003, 0.008, px));
  pendienteDelMuroQ += j.yz * mella * 0.3;
  oclusionDelMuroQ *= 1.0 - 0.15 * mella;
  /*
   * LA SOMBRA DE LA LLAGA: la luz le llega de arriba (el cielo, la farola), y en la llaga HORIZONTAL la mitad de
   * arriba queda bajo el canto de la pieza de encima, en sombra; la de abajo, al aire. Es lo que hace leer una
   * fábrica rehundida al alba. (juntaQ: j.z = −1 es la mitad de la llaga que queda justo debajo de su pieza.) Se
   * funde cuando media llaga no llega a un píxel y medio: más fina, sería una raya que tiembla.
   */
  float mitadDeArriba = step(0.5, abs(j.z)) * step(j.z, 0.0) * (1.0 - smoothstep(junta.x * 0.5, junta.x + junta.y * 0.4, j.x));
  /* Lo que la sombra le quita al paño (media llaga de cada hilada) se lo devuelve la pieza: el tono no salta de N1 a N2. */
  float sombraDeLaLlaga = 0.45 * (1.0 - smoothstep(junta.x * 0.6, junta.x * 1.6, px));
  oclusionDelMuroQ *= (1.0 - sombraDeLaLlaga * mitadDeArriba) / (1.0 - sombraDeLaLlaga * junta.x / ap.y);
  #endif
  return h;
}
#endif

/* El muro sin huecos: devuelve el albedo, y la rugosidad sale por el último argumento. */
vec3 muroQ(int estilo, vec2 q, float tinte, float semilla, float vano, float pb, float hp, vec2 px, out float rugosidad) {
  rugosidad = 0.88;
  pendienteDelMuroQ = vec2(0.0);
  pendienteDeLaJuntaQ = vec2(0.0);
  oclusionDelMuroQ = 1.0;
  varianzaDelMuroQ = 0.0;
  float pxm = max(px.x, px.y);
  /* Lo que el relieve necesita: el aparejo (x 0: no es de piezas), dónde empieza, la junta y el grano. */
  vec3 ap = vec3(0.0);
  vec2 origen = vec2(0.0);
  vec4 junta = vec4(0.0);
  float granoF = 0.0;
  float granoA = 0.0;
  /* Cuánto tiñe el grano (el ladrillo de tejar es moteado; la placa vidriada, casi nada) y cuánto varía cada pieza de tono en N2+. */
  float granoColor = 0.1;
  float tonoDePieza = 0.0;
  vec3 c;
  if (estilo == 0) {
    /* Sillería: hiladas de 0,4-0,5 m, piezas de 0,9-1,3 a matajuntas. */
    ap = aparejoQ(0, subestiloQ, 0.0);
    float fila = floor(q.y / ap.y);
    float x = q.x + mod(fila, 2.0) * ap.z;
    float pieza = hashQ(vec2(floor(x / ap.x), fila), semilla + 3.0);
    /* El almohadillado de la planta baja (subestilos 1 y 3): la junta ancha, en V. */
    float almohadillado = q.y < pb && (subestiloQ == 1 || subestiloQ == 3) ? 1.0 : 0.0;
    float jH = juntaLejanaQ(q.y, ap.y, mix(0.018, 0.045, almohadillado), px.y);
    float jV = juntaLejanaQ(x, ap.x, mix(0.014, 0.04, almohadillado), px.x);
    vec3 base = tinte < 0.4 ? vec3(0.48, 0.45, 0.38) : tinte < 0.7 ? vec3(0.44, 0.43, 0.40) : vec3(0.5, 0.44, 0.35);
    /* El granito, más gris y más frío que la caliza; la arenisca, más dorada. */
    base *= subestiloQ == 1 ? vec3(0.86, 0.89, 0.94) : subestiloQ == 2 ? vec3(1.04, 0.98, 0.88) : vec3(1.0);
    /* Cada sillar de su cantera: ±12 % de tono y un punto más frío o más cálido (lo que hace leer las hiladas a 15 m). */
    vec3 tonoS = (0.88 + 0.24 * pieza) * mix(vec3(1.03, 1.0, 0.965), vec3(0.97, 1.0, 1.035), fract(pieza * 53.7));
    c = base * mix(vec3(1.0), tonoS, piezaVisibleQ(ap.y, pxm));
    /*
     * La junta, oscura: la hilada más que la llaga (la pieza de encima le hace sombra). Oscura de verdad de 10 m en
     * adelante, que es donde tiene que leerse; de cerca, menos, que ya la dibuja su relieve (con lo mismo a 5 m, cada
     * sillar salía perfilado a rotulador).
     */
    c *= 1.0 - mix(0.24, 0.42, smoothstep(5.0, 10.0, distQ)) * max(jH, 0.72 * jV);
    #if NIVEL_Q >= 3
    /*
     * DE CERCA DEL TODO (N3, a menos de 13 m): la arista de cada sillar, gastada y sucia (dos o tres dedos más oscuros), y
     * en la cara, las nubes de la cantera (±12 %): lo que separa un sillar de verdad de un rectángulo de color.
     */
    float cerca3S = 1.0 - smoothstep(9.0, 13.0, distQ);
    vec2 fS = vec2(x - floor(x / ap.x) * ap.x, q.y - fila * ap.y);
    float aristaS = 1.0 - smoothstep(0.012, 0.045, min(min(fS.x, ap.x - fS.x), min(fS.y, ap.y - fS.y)));
    float cantera = ruidoT(q * vec2(6.0, 9.0) + pieza * 31.0, lodQ(9.0));
    c *= (1.0 - 0.36 * aristaS * cerca3S) * (1.0 + 0.24 * (cantera - 0.5) * cerca3S);
    #endif
    /* El almohadillado: llaga honda y ancha, y cada sillar abombado (el relieve, N1+). */
    junta = almohadillado > 0.5 ? vec4(0.009, 0.03, 0.015, 0.0) : vec4(0.005, 0.014, 0.007, 0.0);
    granoF = 30.0;
    granoA = 0.09;
  } else if (estilo == 1) {
    float fila = floor(q.y / 0.075);
    ap = aparejoQ(1, subestiloQ, fila);
    float x = q.x + mod(fila, 2.0) * ap.z;
    vec2 idL = vec2(floor(x / ap.x), fila);
    float j = max(juntaLejanaQ(q.y, 0.075, 0.012, px.y), juntaLejanaQ(x, ap.x, 0.012, px.x));
    float pieza = hashQ(idL, semilla + 5.0);
    /* Ladrillo viejo y sucio, no rojo de catálogo: saturado, bajo la luz cálida, salía naranja. */
    vec3 claro = tinte < 0.6 ? vec3(0.27, 0.13, 0.085) : vec3(0.41, 0.32, 0.21);
    vec3 oscuro = tinte < 0.6 ? vec3(0.2, 0.085, 0.055) : vec3(0.34, 0.26, 0.16);
    vec3 ladrillo = mix(oscuro, claro, pieza);
    /* A soga con el tizón quemado (3): una pieza de cada cuatro, algo más oscura. */
    if (subestiloQ == 3 && mod(idL.x, 4.0) < 0.5) ladrillo *= 0.8;
    /*
     * LOS SUELTOS: uno de cada doce requemado (oscuro, casi morado: el que cocía junto al fuego) y uno de cada veinte
     * pálido; los demás, un 3 % más claros, para que la media del paño no baje (0,085·0,56 + 0,05·1,17 + 0,865·1,03 = 1).
     */
    float suelto = fract(pieza * 91.7);
    ladrillo *= suelto < 0.085 ? vec3(0.6, 0.52, 0.58) : suelto > 0.95 ? vec3(1.22, 1.15, 1.05) : vec3(1.03);
    /*
     * El mortero: de cemento (0 y 2), de cal, claro (1), o viejo y ahumado (3). Siempre más claro que el ladrillo:
     * la LLAGA CLARA es lo que hace leer el aparejo a 10-15 m (con un mortero casi negro, la primera versión del 3,
     * la fábrica de cerca se leía como una mancha marrón).
     */
    vec3 mortero = subestiloQ == 1 ? vec3(0.42, 0.4, 0.35) : subestiloQ == 3 ? vec3(0.25, 0.24, 0.22) : vec3(0.33, 0.32, 0.29);
    /* De lejos, la media de las piezas y un quinto de mortero (lo que ocupa la llaga). */
    vec3 media = mix(0.5 * (claro + oscuro), mortero, 0.2);
    c = mix(media, mix(ladrillo, mortero, j * 0.72), piezaVisibleQ(0.075, px.y));
    #if NIVEL_Q >= 2
    /*
     * CADA LADRILLO DE SU HORNADA, de cerca (a menos de 12 m): el canto que miraba al fuego, requemado, y el otro, más
     * claro. A 2 m es lo que separa una fábrica de verdad de una de catálogo. Con MEDIA CERO (la media de
     * smoothstep(0,3, 1, x) en la pieza es 0,35): sólo oscureciendo, el paño de N2-N3 salía un 10 % más oscuro que el de
     * N1 y el tono saltaba al cambiar de nivel (la revisión del remate: la O y la J).
     */
    float cercaL = 1.0 - smoothstep(7.0, 12.0, distQ);
    vec2 enLaPieza = vec2((x - idL.x * ap.x) / ap.x, q.y / 0.075 - fila);
    float haciaElFuego = fract(pieza * 17.3) < 0.5 ? enLaPieza.x : 1.0 - enLaPieza.x;
    c *= 1.0 - (smoothstep(0.3, 1.0, haciaElFuego) - 0.35) * (0.12 + 0.3 * fract(pieza * 41.7)) * cercaL * (1.0 - j);
    #if NIVEL_Q >= 3
    /*
     * DE CERCA DEL TODO (N3, a menos de 13 m): la arista de cada pieza, más sucia (el polvo se queda en el canto), y la
     * llaga, honda, en sombra: a 2 m es lo que hace de la fábrica un volumen y no un dibujo. Lo que oscurecen se lo
     * devuelve la cara de la pieza (se divide por la media: la llaga es lo que ocupa su grueso más el píxel, y la arista
     * un 12 % de la pieza), para que el paño tenga el tono de N1.
     */
    float cerca3L = 1.0 - smoothstep(9.0, 13.0, distQ);
    vec2 aLaArista = min(enLaPieza, 1.0 - enLaPieza) * vec2(ap.x, 0.075);
    float arista = 1.0 - smoothstep(0.004, 0.014, min(aLaArista.x, aLaArista.y));
    float enLlaga = min(1.0, (0.012 + px.y) / 0.075 + (0.012 + px.x) / ap.x);
    c *= (1.0 - (0.38 * arista * (1.0 - j) + 0.45 * j) * cerca3L) / (1.0 - (0.45 * enLlaga + 0.046 * (1.0 - enLlaga)) * cerca3L);
    /* Y la cara de cada pieza, moteada (el barro no es de un color): manchas de dos dedos, ±20 %. */
    float barro = ruidoT(q * vec2(38.0, 52.0) + idL * 7.1, lodQ(52.0));
    c *= 1.0 + 0.4 * (barro - 0.5) * (1.0 - j) * cerca3L;
    #endif
    #endif
    /* La llaga rehundida: canto vivo, dedo y medio de hondo. */
    junta = vec4(0.005, 0.004, 0.007, 0.002);
    granoF = 40.0;
    granoA = 0.12;
    /* Moteado y tono de cada pieza, con mesura: con 0,36 y 0,3 el paño de cerca salía sucio (la revisión 1). */
    granoColor = 0.18;
    tonoDePieza = 0.18;
  } else if (estilo == 2) {
    float j = max(lineaQ(q.x, vano, 0.025, px.x), lineaQ(q.y - pb, hp, 0.025, px.y));
    vec3 base = vec3(0.27, 0.27, 0.26) * (0.8 + 0.35 * tinte);
    #if NIVEL_Q >= 1
    base *= 0.82 + 0.3 * fbmT(q * vec2(0.5, 0.09) + semilla * 0.01, lodQ(0.5));
    #else
    base *= 0.82 + 0.3 * manchaDelMuroQ;
    #endif
    /* Cada panel de su hormigonada: ±7 % de un vano y una planta al siguiente. */
    base *= 0.93 + 0.14 * hashQ(vec2(floor(q.x / vano), floor((q.y - pb) / hp)), semilla + 47.0) * piezaVisibleQ(hp, pxm);
    /* El encofrado de tablillas de 12 cm (subestilos 0 y 1), cada una de su tono y con su junta. */
    float tabla = floor((q.y - pb) / 0.12);
    if (subestiloQ < 2) base *= (0.94 + 0.12 * hashQ(vec2(tabla, floor(q.x / 2.4)), semilla + 23.0)) * (1.0 - 0.16 * lineaQ(q.y - pb, 0.12, 0.004, px.y));
    c = base * (1.0 - 0.22 * j);
    #if NIVEL_Q >= 1
    /* Los latiguillos del encofrado (subestilo 2): los agujeros tapados, cada 60 × 50 cm. */
    vec2 fL = fract(q / vec2(0.6, 0.5) + vec2(0.5, 0.25)) - 0.5;
    if (subestiloQ == 2) c *= 1.0 - 0.55 * (1.0 - smoothstep(0.013, 0.013 + pxm, length(fL * vec2(0.6, 0.5)))) * (1.0 - smoothstep(0.01, 0.03, pxm));
    /*
     * EL ÓXIDO BAJO LOS ANCLAJES (N1+): de uno de cada cinco latiguillos (subestilo 2) o de un perno de cada cuatro
     * en la línea del forjado (los demás), una lengua de óxido de dos a cuatro dedos que baja de 15 cm a un metro.
     */
    vec2 celA = subestiloQ == 2 ? vec2(0.6, 0.5) : vec2(0.5 * vano, hp);
    /* uA: el anclaje de encima de cada celda, en la raya y = 0 de la celda de arriba y x = 0,5 (los latiguillos, como arriba). */
    vec2 uA = subestiloQ == 2 ? q / celA + vec2(0.5, 0.75) : (q - vec2(0.0, pb)) / celA + vec2(0.5, 0.0);
    vec2 kA = floor(uA);
    float bajoA = fract(uA.y) * celA.y;
    float hA = hashQ(kA + vec2(0.0, 1.0), semilla + 83.0);
    float largoA = 0.15 + (subestiloQ == 2 ? 0.45 : 0.9) * fract(hA * 7.7);
    float dxA = abs(fract(uA.x) - 0.5) * celA.x;
    float bajada = (celA.y - bajoA) / largoA;
    float oxido = step(hA, subestiloQ == 2 ? 0.2 : 0.25) * (1.0 - smoothstep(0.012, 0.022 + 0.02 * bajada + pxm, dxA)) * (1.0 - smoothstep(0.25, 1.0, bajada)) * step(0.0, bajada);
    c = mix(c, vec3(0.3, 0.15, 0.065), 0.7 * oxido);
    #endif
    /* El berenjeno: la junta del panel en V, cada vano y cada forjado. */
    ap = vec3(vano, hp, 0.0);
    origen = vec2(0.0, pb);
    junta = vec4(0.005, 0.018, 0.01, 0.0);
    granoF = 26.0;
    granoA = 0.07;
  } else if (estilo == 3) {
    rugosidad = 0.1;
    c = vec3(0.012, 0.016, 0.02) + vec3(0.0, 0.004, 0.006) * tinte;
    #if NIVEL_Q >= 1
    /* LA BANDA DE ANTEPECHO: el paño opaco delante del forjado, de otro color que el vidrio y con su junta. */
    float fy = fract((q.y - pb) / hp);
    float antepecho = max(step(0.81, fy), 1.0 - step(0.035, fy)) * step(pb, q.y);
    vec3 panel = subestiloQ == 0 ? vec3(0.03, 0.036, 0.04) : subestiloQ == 1 ? vec3(0.055, 0.047, 0.036) : subestiloQ == 2 ? vec3(0.02, 0.03, 0.046) : vec3(0.07, 0.072, 0.075);
    c = mix(c, panel, antepecho);
    rugosidad = mix(rugosidad, 0.3, antepecho);
    c *= 1.0 - 0.5 * lineaQ(q.y - pb, hp, 0.02, px.y);
    #endif
  } else if (estilo == 5) {
    /*
     * Placa cerámica vidriada a matajuntas o en retícula: brilla, y cada pieza tiene su tono. Era un azulejo de
     * 15 cm con la junta clara: de lejos, un cuarto de baño.
     */
    ap = aparejoQ(5, subestiloQ, 0.0);
    float fila = floor(q.y / ap.y);
    float x = q.x + mod(fila, 2.0) * ap.z;
    float j = max(juntaLejanaQ(q.y, ap.y, 0.008, px.y), juntaLejanaQ(x, ap.x, 0.008, px.x));
    float hA = hashQ(vec2(floor(x / ap.x), fila), semilla + 7.0);
    vec3 a = tinte < 0.3 ? vec3(0.13, 0.17, 0.22) : tinte < 0.55 ? vec3(0.12, 0.19, 0.17) : tinte < 0.8 ? vec3(0.34, 0.29, 0.2) : vec3(0.42, 0.42, 0.4);
    /* LAS REPUESTAS: una placa de cada treinta es de otra hornada, más fría y oscura o más clara, y se ve a 40 m. */
    float repuesta = fract(hA * 67.3);
    vec3 tonoA = (0.86 + 0.28 * hA) * (repuesta < 0.022 ? vec3(0.76, 0.83, 0.93) : repuesta < 0.034 ? vec3(1.18, 1.13, 1.02) : vec3(1.0));
    float vis = piezaVisibleQ(ap.y, px.y);
    vec3 teja = a * mix(vec3(1.0), tonoA, vis);
    rugosidad = 0.2;
    /* La junta: clara en el edificio nuevo; en el viejo, sucia (el polvo se queda en lo rehundido), y la placa se lee a 20 m. */
    c = mix(teja, mix(teja * 1.18 + 0.012, teja * 0.55, smoothstep(0.3, 0.6, edadQ)), j * 0.5 * vis);
    #if NIVEL_Q >= 3
    /*
     * DE CERCA DEL TODO (N3, a menos de 13 m): el canto de cada placa, con la mugre del rejuntado que se le ha subido
     * (un par de dedos más oscuro, más en el edificio viejo).
     */
    float cerca3A = 1.0 - smoothstep(9.0, 13.0, distQ);
    vec2 fA = vec2(x - floor(x / ap.x) * ap.x, q.y - fila * ap.y);
    float aristaA = 1.0 - smoothstep(0.006, 0.03, min(min(fA.x, ap.x - fA.x), min(fA.y, ap.y - fA.y)));
    c *= 1.0 - (0.18 + 0.2 * edadQ) * aristaA * (1.0 - j) * cerca3A;
    #endif
    /*
     * El bisel de la placa (el canto redondeado, de un centímetro: lo que la seudoluz de la farola raspa de noche) y, en
     * el grano, la ondulación del vidriado, larga y suave. SIN torcer cada placa: vidriada (rugosidad 0,2) y con una
     * farola de pared a un palmo, una placa torcida un grado se enciende entera o se apaga, y el paño era un mosaico
     * de rectángulos claros y oscuros (C y J de noche, E al alba).
     */
    junta = vec4(0.003, 0.01, 0.004, 0.0);
    granoF = 1.5;
    granoA = 0.03;
    granoColor = 0.03;
  } else {
    /* Revoco pintado: ocre, crema, almagre o gris azulado. */
    /* Apagados a propósito: saturados, bajo el sodio y el ACES, salían de dibujo animado. */
    vec3 base = tinte < 0.3 ? vec3(0.47, 0.39, 0.28) : tinte < 0.55 ? vec3(0.55, 0.51, 0.43)
      : tinte < 0.8 ? vec3(0.41, 0.28, 0.22) : vec3(0.36, 0.38, 0.38);
    /*
     * EL MOTEADO: la pintura que el sol y el agua han comido a trozos, de medio metro a tres, estirado en vertical
     * (el agua baja): en N0 la mancha del prefacio; desde N1, con un fbm más fino (±12-18 %).
     */
    float moteado = manchaDelMuroQ;
    #if NIVEL_Q >= 1
    moteado = 0.45 * manchaDelMuroQ + 0.55 * fbmT(q * vec2(1.05, 0.42) + semilla * 0.017 + vec2(3.7, 1.3), lodQ(1.05));
    #endif
    c = base * (0.82 + 0.36 * smoothstep(0.2, 0.8, moteado));
    /* LOS PARCHES de reparación, en siete paños de cada diez: repintados (más claros) o de cemento sin pintar (gris). */
    vec3 parche = parcheDelRevocoQ(q, semilla, pxm) * step(0.3, fract(semilla * 0.6180339));
    vec3 cemento = vec3(dot(c, vec3(0.3, 0.59, 0.11))) * vec3(0.97, 0.99, 1.02);
    vec3 nuevo = parche.z < 0.55 ? c * vec3(1.18, 1.14, 1.07) : mix(c, cemento, 0.8) * 0.86;
    c = mix(c, nuevo, parche.x);
    c *= 1.0 - 0.16 * parche.y;
    #if NIVEL_Q >= 1
    /*
     * LOS DESCONCHONES: donde se ha caído la pintura con el enlucido asoma el ENFOSCADO gris de debajo, y donde se ha
     * caído también el enfoscado, el LADRILLO. Sólo donde se cae de verdad: al pie (la humedad que sube) y bajo el
     * remate (el agua de la cornisa). En medio del paño, NUNCA: ahí el umbral pasa de 1 y el ruido no llega (con un
     * umbral que sólo bajaba al pie, en medio salían óvalos marrones de medio metro, pegatinas en la fachada: la
     * revisión 1). El borde, roto: dos octavas. En el canto, el grueso de la capa (más claro) y su sombra sobre lo de
     * dentro; en el ladrillo, sus llagas y restos de mortero. Casi todos se quedan en el enfoscado y sólo los grandes
     * llegan al ladrillo: un corro gris con un corazón de ladrillo, no una mancha marrón. Más cuanto más viejo el
     * edificio, y se van de 18 a 30 m: de lejos eran manchas.
     */
    float alPie = 1.0 - smoothstep(0.5, 2.2, q.y);
    /* El remate de verdad es el del volumen más alto (cimaQ): el techo de la planta baja no gotea. */
    float bajoElRemate = (1.0 - smoothstep(0.3, 1.4, vVolumenQ.y - q.y)) * cimaQ;
    float donde = max(alPie, bajoElRemate) * (1.0 - smoothstep(18.0, 30.0, distQ));
    if (donde > 0.0) {
      float nFino = ruidoT(q * vec2(4.7, 6.1) + 13.0, lodQ(6.1));
      float nD = 0.7 * ruidoT(q * vec2(1.1, 1.7) + semilla * 0.013 + 41.0, lodQ(1.7)) + 0.3 * nFino;
      float umbral = 1.0 - donde * (0.15 + 0.1 * edadQ);
      float caido = smoothstep(umbral, umbral + 0.006, nD);
      float aLadrillo = smoothstep(umbral + 0.06, umbral + 0.066, nD);
      float canto = smoothstep(umbral - 0.02, umbral, nD) * (1.0 - caido);
      vec3 enfoscado = vec3(0.35, 0.34, 0.31) * (0.88 + 0.24 * nFino);
      float filaD = floor(q.y / 0.075);
      float xD = q.x + mod(filaD, 2.0) * 0.125;
      float jD = max(lineaQ(q.y, 0.075, 0.012, px.y), lineaQ(xD, 0.25, 0.012, px.x));
      vec3 ladrillo = mix(vec3(0.29, 0.15, 0.1), vec3(0.38, 0.22, 0.14), hashQ(vec2(floor(xD / 0.25), filaD), semilla + 5.0));
      /* La llaga, y el mortero que se quedó pegado a trozos (donde la octava fina baja). */
      ladrillo = mix(ladrillo, vec3(0.33, 0.31, 0.28), max(jD * 0.55, (1.0 - smoothstep(0.34, 0.42, nFino)) * 0.7));
      /* La sombra del canto sobre lo de dentro, en el primer par de dedos de cada capa. */
      float sombra = max(1.0 - smoothstep(umbral + 0.006, umbral + 0.025, nD), (1.0 - smoothstep(umbral + 0.066, umbral + 0.08, nD)) * aLadrillo);
      vec3 fondo = mix(enfoscado, ladrillo, aLadrillo) * (1.0 - 0.3 * sombra);
      c = mix(c, c * 1.15 + 0.04, canto * 0.8);
      c = mix(c, fondo, caido);
      rugosidad = mix(rugosidad, 0.93, caido);
      oclusionDelMuroQ = 1.0 - 0.12 * caido * sombra;
    }
    #endif
    /* El fratasado: el grano del revoco. */
    granoF = 60.0;
    granoA = 0.06;
  }
  #if NIVEL_Q >= 1
  #if NIVEL_Q >= 2
  const float ALCANCE_DEL_RELIEVE_Q = 60.0;
  #else
  const float ALCANCE_DEL_RELIEVE_Q = 20.0;
  #endif
  if (ap.x > 0.0 && distQ < ALCANCE_DEL_RELIEVE_Q) {
    vec2 hPieza = relieveDeLaFabricaQ(q - origen, ap, junta, semilla, pxm, rugosidad);
    #if NIVEL_Q >= 2
    c *= 1.0 + tonoDePieza * (hPieza.x - 0.5);
    #endif
    #if NIVEL_Q == 1
    /* En N1 el relieve se acaba a 20 m: se va entre 15 y 20, sin escalón. */
    float cerca = 1.0 - smoothstep(15.0, 20.0, distQ);
    pendienteDelMuroQ *= cerca;
    pendienteDeLaJuntaQ *= cerca;
    oclusionDelMuroQ = mix(1.0, oclusionDelMuroQ, cerca);
    #endif
  }
  /* EL GRANO: el poro de la piedra, el del ladrillo, el del hormigón y el fratasado (N2+); en N1, sólo la ondulación del vidriado del azulejo. */
  #if NIVEL_Q == 1
  if (estilo != 5) granoA = 0.0;
  #endif
  if (granoA > 0.0 && distQ < ALCANCE_DEL_RELIEVE_Q) {
    float f = granoF * 4.0;
    float lod = lodQ(f);
    vec3 g = granoT(q * f, lod);
    pendienteDelMuroQ += g.yz * granoA;
    varianzaDelMuroQ = varianzaPerdidaQ(lod) * granoA * granoA;
    granoDelMuroQ = g.x;
    c *= 1.0 + granoColor * (g.x - 0.5);
  }
  #if NIVEL_Q >= 3
  /*
   * EL PORO (N3, a menos de 8 m): una segunda octava del grano, catorce veces más fina, con sus picaduras (un punto
   * oscuro donde el poro se abre; en la placa vidriada, casi nada).
   */
  if (granoA > 0.0 && distQ < 8.0) {
    float f2 = granoF * 14.0;
    float lod2 = lodQ(f2);
    vec3 g2 = granoT(q * f2 + 17.0, lod2);
    float cerca3 = 1.0 - smoothstep(5.0, 8.0, distQ);
    pendienteDelMuroQ += g2.yz * granoA * 0.8 * cerca3;
    varianzaDelMuroQ += varianzaPerdidaQ(lod2) * granoA * granoA * 0.64 * cerca3;
    c *= 1.0 - (granoColor > 0.05 ? 0.22 : 0.03) * smoothstep(0.66, 0.82, g2.x) * cerca3;
  }
  #endif
  #endif
  #if NIVEL_Q >= 2
  /* La puerta del micro-relieve del horno (ola 4): piedra (0), barro cocido (1) y hormigón (2). Hoy, neutra. */
  vec4 micro = microRelieveQ(estilo == 0 ? 0 : estilo == 1 || estilo == 5 ? 1 : 2, vec3(q, semilla), pxm);
  pendienteDelMuroQ += micro.xy;
  oclusionDelMuroQ *= 1.0 - micro.z;
  rugosidad = clamp(rugosidad + micro.w, 0.03, 1.0);
  #endif
  /*
   * El tono de cada edificio: un punto más claro o más oscuro, continuo, dentro de su paleta. Con un 4 % de más en la
   * media: la suciedad nueva (chorretones, velos, regueros, zócalo, juntas) se come un 8-10 % del paño, y el paño tiene
   * que seguir siendo el de antes (±10 %: la ciudad es la misma, más vieja).
   */
  c *= 0.97 + 0.14 * fract(tinte * 37.13);
  albedoDelMuroQ = c;
  return c;
}
`;
