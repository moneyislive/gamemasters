/**
 * EL HUECO: las plantas de viviendas u oficinas, con su ventana. Dos tramos:
 *
 *   - `GLSL_DEL_HUECO`, el último de las declaraciones del fragmento (detrás de `GLSL_DEL_MURO`): el cuarto
 *     falso (`cuartoQ`), la ventana plana (`planaQ`), los visillos y persianas (`visillosQ`) y, desde N1, el
 *     chorretón bajo el alféizar (`chorretonDelAlfeizarQ`). Usan `hashQ`, `lineaQ`, `uClaridad` y la materia.
 *   - `TRAMO_DEL_HUECO`, el tercero del cuerpo (detrás de `TRAMO_DE_LAS_PIEZAS`): la rejilla de plantas y vanos
 *     del sombreador, el recerco, el alféizar con su sombra de contacto, el dintel con su vuelo, el derrame, el
 *     chorretón, la carpintería, el cristal con su cuarto, el fondo del hueco, la faja de la imposta en cada
 *     forjado y, en las torres de vidrio y de hormigón, las plantas de oficina encendidas, los montantes, el paño
 *     ladeado y la corona.
 *
 * ═══ LAS VARIABLES DEL CUERPO ═══
 *
 * `TRAMO_DEL_HUECO` LEE `tipo`, `plano`, `q`, `pb`, `hp`, `techo`, `vano`, `estilo`, `semilla`,
 * `semillaDelEdificio`, `subestiloF`, `cima`, `edad`, `tinte`, `px`, `pxm`, `dist`, `V`, `T` y `Ng`, `albedoDelMuroQ`
 * (el muro, para el fondo del hueco) y los uniformes `uTiempo`, `uVentanas`, `uLuzDeVentanas` y
 * `uVentanasEncendidas`; ESCRIBE `albedo`, `rug`, `met`, `emision`, `nLocal` y `paredQ` (dónde se ve la fábrica).
 * Abre `if (tipo < 0.5 && !plano && q.y >= pb) {`, que cierra el primer carácter de `TRAMO_DEL_BAJO` (`} else if …`).
 *
 * ═══ LO QUE NO VIVE DOS VECES ═══
 *
 * Las plantas de oficina enteras encendidas de las torres son un término APARTE de `encendidaQ`, y sólo de la
 * cuarta planta arriba: `hash.ts` (las tarjetas de reflejo y la luz horneada) no mira más que las plantas 0-3, así
 * que no hace falta gemela. Se deciden por EDIFICIO (`semillaDelEdificio`), no por cara: una planta encendida lo
 * está en las cuatro fachadas de la torre. La corona, igual.
 *
 * ═══ LO QUE VIVE DOS VECES ═══
 *
 * La rejilla (vanos enteros, plantas desde la baja, sólo las que caben enteras bajo el techo) es la de
 * `recorrerLosHuecos` (`caras.ts`), que pone las tarjetas de las ventanas encendidas y los balcones bajo los
 * huecos; y la faja de la imposta (cada forjado; en el ladrillo, uno de cada tres; en el revoco, uno de cada
 * dos) es la regla que tendrán que seguir las impostas en bulto.
 */

/** El cuarto falso, la ventana plana y los visillos: el último tramo de las declaraciones, detrás de `GLSL_DEL_MURO`. */
export const GLSL_DEL_HUECO = /* glsl */ `
/* EL CUARTO FALSO. p: punto del cristal en el cuarto (m); d: rayo (x derecha, y arriba, z adentro). */
vec3 cuartoQ(vec2 p, vec3 d, vec3 tam, float h, float luz, vec3 colorLuz, float potencia) {
  d.z = max(d.z, 0.04);
  vec3 o = vec3(p, 0.0);
  float tx = d.x > 0.0 ? (tam.x - o.x) / d.x : o.x / max(-d.x, 1e-4);
  float ty = d.y > 0.0 ? (tam.y - o.y) / d.y : o.y / max(-d.y, 1e-4);
  float tz = tam.z / d.z;
  /* Qué cara se toca, con comparaciones y no con «t == tz»: el compilador de algunos motores (ANGLE
     sobre D3D) no garantiza que min() devuelva el mismo bit, y la igualdad fallaba a píxeles sueltos:
     un rayado de estática en todos los cristales. */
  int cara = tz <= tx && tz <= ty ? 0 : ty <= tx ? 1 : 2;
  float t = cara == 0 ? tz : cara == 1 ? ty : tx;
  vec3 c = o + d * t;
  float h1 = fract(h * 13.73);
  float h2 = fract(h * 31.31);
  float h3 = fract(h * 71.97);
  vec3 pared = h1 < 0.25 ? vec3(0.62, 0.56, 0.45) : h1 < 0.5 ? vec3(0.42, 0.52, 0.48)
    : h1 < 0.75 ? vec3(0.55, 0.42, 0.40) : vec3(0.45, 0.50, 0.58);
  vec3 suelo = h2 < 0.6 ? vec3(0.22, 0.13, 0.07) : vec3(0.32, 0.31, 0.29);
  vec3 alb;
  if (cara == 0) {
    alb = pared * 0.85;
    vec2 k = vec2(c.x / tam.x - 0.5 + (h3 - 0.5) * 0.4, c.y - tam.y * 0.5);
    if (abs(k.x) < 0.12 && abs(k.y) < 0.35) alb = mix(vec3(0.1, 0.08, 0.06), vec3(0.5, 0.3, 0.2), h3);
  } else if (cara == 1) {
    alb = d.y > 0.0 ? vec3(0.72) : suelo;
  } else {
    alb = pared;
  }
  if (potencia < 0.99 && cara != 1 && c.y > 0.35 && c.y < 2.3) {
    /* Una tienda: baldas cada 45 cm en el fondo y en los lados, con cajas y botes de colores. */
    float u = cara == 0 ? c.x : c.z;
    float fila = floor((c.y - 0.35) / 0.45);
    float fy = fract((c.y - 0.35) / 0.45);
    float balda = 1.0 - step(0.06, fy);
    float celdaP = u / 0.18 + fila * 3.1;
    float producto = floor(celdaP);
    float hp = hashQ(vec2(producto, fila), 71.0);
    vec3 colorP = 0.3 + 0.35 * vec3(hashQ(vec2(producto, 1.0), fila + 3.0), hashQ(vec2(producto, 2.0), fila + 3.0), hashQ(vec2(producto, 4.0), fila + 3.0));
    colorP = mix(vec3(dot(colorP, vec3(0.333))), colorP, 0.55);
    float hay = step(fy, 0.35 + 0.5 * hp) * step(0.2, hp) * step(0.1, fract(celdaP));
    alb = mix(mix(alb, colorP, hay), vec3(0.55), balda);
  }
  float zf = tam.z * (0.4 + 0.3 * h3);
  float tf = zf / d.z;
  if (tf < t) {
    vec3 cf = o + d * tf;
    float x0 = tam.x * (0.05 + 0.3 * h1);
    float x1 = x0 + tam.x * (0.35 + 0.35 * h2);
    float hf = 0.75 + 0.6 * h3;
    if (cf.y < hf && cf.x > x0 && cf.x < x1) {
      alb = mix(vec3(0.08, 0.06, 0.05), vec3(0.25, 0.12, 0.1), h2);
      c = cf;
    }
  }
  vec3 lampara = vec3(tam.x * 0.5, tam.y - 0.25, tam.z * 0.45);
  float dl = length(c - lampara);
  vec3 ilum = luz * colorLuz * potencia * (0.12 + 2.0 / (1.0 + dl * dl * 0.5));
  /* Un cuarto apagado no es negro: de madrugada le llega la calle; al alba, la luz del día por la ventana. */
  ilum += (1.0 - luz) * mix(vec3(0.006, 0.008, 0.011), vec3(0.07, 0.08, 0.078), uClaridad);
  return alb * ilum;
}

/* LA VENTANA PLANA (lejos o N0): un degradado hacia el techo y la intensidad del hash. */
vec3 planaQ(vec2 w, float h, float luz, vec3 colorLuz) {
  float grad = mix(0.55, 1.1, w.y);
  vec3 apagada = mix(vec3(0.003, 0.004, 0.005), vec3(0.03, 0.036, 0.035) * (0.6 + 0.8 * fract(h * 3.7)), uClaridad);
  return luz * colorLuz * grad * (0.35 + 0.65 * fract(h * 7.13)) + (1.0 - luz) * apagada;
}

/* VISILLOS Y PERSIANAS: lo que tapa el cuarto desde dentro. w en 0-1 dentro del hueco. */
vec3 visillosQ(vec3 dentro, vec2 w, float h, float luz, vec3 colorLuz, vec2 px) {
  float h4 = fract(h * 97.31);
  float h5 = fract(h * 51.77);
  float bajada = h4 < 0.55 ? h5 * 0.7 : 0.0;
  float persiana = step(1.0 - bajada, w.y);
  float lama = 1.0 - 0.35 * lineaQ(w.y * 2.2, 0.05, 0.012, px.y);
  vec3 plastico = mix(vec3(0.30, 0.28, 0.24), vec3(0.18, 0.2, 0.22), h5) * lama * 0.05;
  float lado = h4 > 0.7 ? 0.28 : 0.0;
  float visillo = (1.0 - step(lado, w.x)) + step(1.0 - lado, w.x);
  vec3 tela = luz * colorLuz * vec3(0.9, 0.85, 0.75) * 0.55 + vec3(0.004);
  vec3 salida = mix(dentro, tela, clamp(visillo, 0.0, 1.0) * 0.85);
  return mix(salida, plastico, persiana);
}

#if NIVEL_Q >= 1
/*
 * EL CHORRETÓN BAJO UN ALFÉIZAR (N1+): el agua que cae del vierteaguas se lleva el polvo y lo deja debajo, en una
 * lengua ancha como el vierteaguas, oscura arriba y que se va hacia abajo, más larga bajo los dos extremos (por
 * donde escurre más) y que ACABA EN DEDOS: cada punto baja lo que dice la veta (del 65 al 100 %), oscuro entero casi
 * la primera mitad y luego a menos hasta la punta, así que el final es una orla de puntas, no una raya. La veta tiñe
 * poco (del 85 al 100 %): con vetas de borde duro, cada ventana llevaba debajo un código de barras (la primera
 * versión del remate), y con un 40 % de contraste, una rejilla de rayas (la revisión del remate). dx: del centro del
 * hueco; dy: por debajo del canto del vierteaguas; medio: el medio ancho del hueco; largo: cuánto baja como mucho
 * (lo pone quien llama: de medio metro a dos y medio por hash de la ventana, pero no más que hasta el dintel de la
 * ventana de abajo; con más, llegaba al dintel todavía oscura y el dintel la cortaba en seco: un bloque rayado). El
 * corte de la función, en 1,3·largo, es donde acaba el dedo más largo (el de un extremo): ahí ya vale 0. Se ve de 2
 * a 60 m: de lejos la veta se apaga a su media con la mip y queda la lengua. N3 le pone una segunda octava a la
 * veta, suave.
 */
float chorretonDelAlfeizarQ(float dx, float dy, float medio, float largo, vec2 q, float semilla) {
  if (dy < 0.0 || dy > largo * 1.3 || abs(dx) > medio + 0.18) return 0.0;
  float veta = ruidoT(vec2(q.x * 5.0 + semilla * 0.1, q.y * 0.55), lodQ(5.0));
  #if NIVEL_Q >= 3
  veta = 0.82 * veta + 0.18 * ruidoT(vec2(q.x * 19.0 + 7.0, q.y * 1.3), lodQ(19.0));
  #endif
  float extremos = 1.0 - smoothstep(0.0, 0.2, abs(abs(dx) - medio * 0.9));
  float hasta = largo * mix(0.65, 1.0, smoothstep(0.25, 0.75, veta)) * (1.0 + 0.3 * extremos);
  float t = clamp(dy / hasta, 0.0, 1.0);
  float lengua = (1.0 - smoothstep(medio * 0.8, medio + 0.16, abs(dx))) * smoothstep(0.0, 0.02, dy);
  /* Oscura entera casi la primera mitad y luego se va hasta la punta de cada dedo. */
  return lengua * (1.0 - smoothstep(0.45, 1.0, t)) * mix(0.85, 1.0, veta);
}
#endif
`;

/** El tercer tramo del cuerpo, detrás de `TRAMO_DE_LAS_PIEZAS`. */
export const TRAMO_DEL_HUECO = /* glsl */ `
    if (tipo < 0.5 && !plano && q.y >= pb) {
      /* ─── LAS PLANTAS DE VIVIENDAS U OFICINAS ─── */
      float fp = (q.y - pb) / hp;
      float planta = floor(fp);
      float fy = fract(fp);
      float cabe = step(pb + (planta + 1.0) * hp, techo + 0.01);
      if (cabe > 0.5) {
        float celda = floor(q.x / vano);
        float fx = fract(q.x / vano);
        vec4 h = huecoQ(estilo);
        vec2 centro = vec2((h.x + h.y) * 0.5 * vano, (h.z + h.w) * 0.5 * hp);
        vec2 medio = vec2((h.y - h.x) * 0.5 * vano, (h.w - h.z) * 0.5 * hp);
        vec2 l = vec2(fx * vano, fy * hp) - centro;
        vec2 dd = abs(l) - medio;
        float sd = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0);
        vec2 gdir = dd.x > dd.y ? vec2(sign(l.x), 0.0) : vec2(0.0, sign(l.y));
        /*
         * EL HUECO, COMO LO HACE UN ALBAÑIL: el recerco (moldura del color de la piedra, un punto más
         * claro, no un marco de dibujo animado), el derrame en sombra, el alféizar que vuela debajo y
         * mira al cielo, el dintel encima, y dentro la carpintería con su parteluz y su travesaño, que
         * es lo que hace que una ventana se lea como ventana y no como un agujero de luz.
         */
        /* El recerco, fino (un 40 % menos que la primera versión, que era un marco de dibujo animado). */
        float marco = (estilo == 0 || estilo == 4 || estilo == 5) ? 0.066 : estilo == 1 ? 0.04 : estilo == 3 ? 0.03 : 0.04;
        float enMarco = (1.0 - smoothstep(marco, marco + pxm, sd)) * smoothstep(-pxm, 0.0, sd);
        float cristal = 1.0 - smoothstep(-0.09 - pxm, -0.09, sd);
        float derrame = (1.0 - smoothstep(-pxm, 0.0, sd)) * (1.0 - cristal);
        vec3 piedraClara = estilo == 1 ? vec3(0.34, 0.32, 0.29) : albedo * 1.1 + 0.01;
        vec3 colorMarco = estilo == 2 ? albedo * 0.6 : estilo == 3 ? vec3(0.32, 0.34, 0.37) : piedraClara;
        albedo = mix(albedo, colorMarco, enMarco);
        met = mix(met, estilo == 3 ? 0.6 : 0.0, enMarco);
        rug = mix(rug, estilo == 3 ? 0.45 : 0.75, enMarco);
        nLocal.xy += gdir * enMarco * smoothstep(marco * 0.4, marco, sd) * 0.7;
        /* La fábrica se ve fuera del hueco y del recerco: ahí pone el envejecido su relieve y su agua. */
        paredQ = 1.0 - max(max(cristal, derrame), enMarco);
        float hv = hashQ(vec2(celda, planta), semilla);
        if (estilo != 3 && estilo != 2) {
          /* Alféizar: 12 cm bajo el hueco y 12 más ancho a cada lado; su canto mira al cielo. */
          float bajoHueco = step(abs(l.x), medio.x + 0.12) * (1.0 - smoothstep(0.0, pxm, -medio.y - l.y - 0.13)) * smoothstep(-pxm, 0.0, -medio.y - l.y - marco * 0.5);
          albedo = mix(albedo, piedraClara * 1.05, bajoHueco);
          nLocal.y += bajoHueco * 0.9;
          #if NIVEL_Q >= 1
          /* La sombra de contacto bajo el vierteaguas (N1+): de 4 a 8 cm de muro que no ven el cielo. */
          float bajoDelVierteaguas = -medio.y - 0.13 - l.y;
          float contacto = step(0.0, bajoDelVierteaguas) * (1.0 - smoothstep(0.0, 0.04 + 0.04 * fract(hv * 5.3), bajoDelVierteaguas)) * step(abs(l.x), medio.x + 0.12);
          albedo *= 1.0 - 0.45 * contacto;
          #endif
          /* Dintel: una pieza clara sobre el hueco, y bajo ella la sombra que echa dentro. */
          float dintel = step(abs(l.x), medio.x + marco) * smoothstep(-pxm, 0.0, l.y - medio.y - marco * 0.5) * (1.0 - smoothstep(0.0, pxm, l.y - medio.y - 0.24));
          albedo = mix(albedo, piedraClara, dintel * (estilo == 1 ? 1.0 : 0.6));
          #if NIVEL_Q >= 1
          /* Y vuela un dedo (N1+): su canto de arriba mira al cielo y el de abajo al suelo. */
          float yD = l.y - medio.y - marco * 0.5;
          nLocal.y += dintel * (0.6 * smoothstep(0.19 - marco * 0.5, 0.235 - marco * 0.5, yD) - 0.5 * (1.0 - smoothstep(0.0, 0.035, yD)));
          #endif
          paredQ *= (1.0 - bajoHueco) * (1.0 - dintel);
        }
        albedo = mix(albedo, albedo * 0.4, derrame);
        nLocal.xy -= gdir * derrame * 0.8;
        #if NIVEL_Q >= 1
        /* EL CHORRETÓN bajo el vierteaguas de este hueco y, por encima de él, el del hueco de la planta de arriba. */
        if (estilo != 3) {
          float arriba = step(pb + (planta + 2.0) * hp, techo + 0.01);
          float dyC = l.y < -medio.y - 0.13 ? -medio.y - 0.13 - l.y : mix(-1.0, hp - medio.y - 0.13 - l.y, arriba);
          /*
           * Cuánto hay hasta el dintel de la ventana de abajo (en la primera planta, hasta el forjado de la baja): los dedos
           * del medio se acaban ahí, y sólo los de los extremos, ya casi sin tinte, llegan a tocarlo. Con el largo del hash sin
           * más, llegaba al dintel oscura y el dintel la cortaba recto (la revisión del remate, la C: un bloque rayado entre
           * ventana y ventana).
           */
          float hastaElDintel = l.y < -medio.y - 0.13 && planta < 0.5 ? centro.y - medio.y - 0.13 : hp - 2.0 * medio.y - 0.13 - (estilo == 2 ? marco : 0.24);
          float ch = chorretonDelAlfeizarQ(l.x, dyC, medio.x, min(0.6 + 2.0 * fract(hv * 7.31), hastaElDintel), q, semilla) * paredQ;
          /* Oscuro de verdad (del 65 al 95 % en el corazón, según la edad): a 25-60 m es lo que se lee de cada ventana. */
          albedo *= 1.0 - (0.65 + 0.3 * edad) * ch;
        }
        #endif
        if (cristal > 0.0) {
          float luz = encendidaQ(celda, planta, semilla, estilo);
          float hc = hashQ(vec2(celda, planta), semilla + 17.0);
          vec3 colorLuz = colorDeLuzQ(hc);
          if (hc > 0.9) colorLuz *= 0.45 + 0.55 * ruidoT(vec2(uTiempo * 5.0, celda + planta * 7.0), 0.0);
          #if NIVEL_Q >= 1
          /* LAS PLANTAS DE OFICINA de las torres, enteras encendidas y de fluorescente, de la cuarta arriba (la cabecera). */
          if ((estilo == 3 || estilo == 2) && planta >= 4.0 && hashQ(vec2(planta, 131.0), semillaDelEdificio) < 0.14 * smoothstep(0.2, 0.9, uVentanasEncendidas)) {
            luz = 1.0;
            colorLuz = vec3(0.8, 0.9, 1.0);
          }
          #endif
          vec2 w = clamp((l + medio) / (2.0 * medio), 0.0, 1.0);
          vec3 dentro = planaQ(w, hv, luz, colorLuz);
          #if NIVEL_Q >= 1
          if (dist < 60.0) {
            vec3 dLoc = vec3(dot(-V, T), -V.y, dot(V, Ng));
            vec3 tam = vec3(vano, hp, 3.5 + 3.5 * hashQ(vec2(celda, planta), semilla + 29.0));
            vec3 cerca = cuartoQ(vec2(fx * vano, fy * hp), dLoc, tam, hv, luz, colorLuz, 1.0);
            dentro = mix(cerca, dentro, smoothstep(45.0, 60.0, dist));
          }
          #endif
          dentro = visillosQ(dentro, w, hv, luz, colorLuz, px);
          /* La carpintería: bastidor de 4 cm, parteluz si el hueco pasa de 0,9 m y travesaño al 70 %.
             Con el píxel más grueso que el perfil se funde en un tono medio en vez de tramar. */
          float anchoH = 2.0 * medio.x;
          float altoH = 2.0 * medio.y;
          float perfil = 0.045;
          float bastidor = 1.0 - smoothstep(-0.09 - perfil - pxm, -0.09 - perfil, sd);
          bastidor = cristal - bastidor;
          float parteluz = anchoH > 0.9 && estilo != 3 ? 1.0 - smoothstep(perfil * 0.5, perfil * 0.5 + pxm, abs(w.x - 0.5) * anchoH) : 0.0;
          float travesano = estilo != 3 ? 1.0 - smoothstep(perfil * 0.5, perfil * 0.5 + pxm, abs(w.y - 0.72) * altoH) : 0.0;
          float carpinteria = clamp(max(bastidor, max(parteluz, travesano) * cristal), 0.0, 1.0) * (1.0 - smoothstep(0.02, 0.05, pxm));
          float hk = hashQ(vec2(floor(celda / 3.0), 61.0), semilla);
          vec3 colorCarp = estilo == 3 ? vec3(0.3, 0.32, 0.34) : hk < 0.4 ? vec3(0.62, 0.6, 0.56) : hk < 0.7 ? vec3(0.035, 0.05, 0.042) : vec3(0.12, 0.075, 0.045);
          float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(V, Ng), 0.0), 5.0);
          float vidrio = cristal * (1.0 - carpinteria);
          albedo = mix(albedo, vec3(0.015, 0.017, 0.019), vidrio);
          albedo = mix(albedo, colorCarp, carpinteria);
          rug = mix(rug, 0.05, vidrio);
          rug = mix(rug, 0.45, carpinteria);
          met = mix(met, 0.0, cristal);
          emision += dentro * vidrio * (1.0 - fresnel) * uVentanas * uLuzDeVentanas;
          vec2 inclina = vec2(hashQ(vec2(celda, planta), semilla + 41.0), hashQ(vec2(celda, planta), semilla + 43.0)) - 0.5;
          nLocal.xy += inclina * 0.05 * vidrio;
          #if NIVEL_Q >= 3
          /* EL PAÑO LADEADO del muro cortina: cada dos por dos vanos, ±0,03; el reflejo de la torre se quiebra por paños. */
          if (estilo == 3) nLocal.xy += (hash2Q(floor(vec2(celda, planta) * 0.5), semilla + 3.0) - 0.5) * 0.06 * vidrio;
          #endif
          /*
           * EL HUECO TIENE FONDO. La carpintería va 14 cm metida en el muro: el rayo que entra por el
           * borde del hueco, en vez de dar en el cristal, da en la jamba, en el dintel por debajo o en el
           * alféizar, según hacia dónde se mire (desde la calle, el dintel se ve por debajo, en sombra).
           * Sin geometría: dónde cae el rayo a 14 cm de profundidad, y si cae fuera del cristal.
           */
          if (estilo != 3) {
            vec3 rR = vec3(dot(-V, T), -V.y, max(dot(V, Ng), 0.08));
            vec2 mG = medio - vec2(0.09);
            vec2 finR = l + rR.xy / rR.z * 0.14;
            vec2 sobraR = abs(finR) - mG;
            float revelado = smoothstep(-pxm, pxm, max(sobraR.x, sobraR.y)) * cristal;
            if (revelado > 0.0) {
              bool techoR = sobraR.y > sobraR.x && finR.y > 0.0;
              bool sueloR = sobraR.y > sobraR.x && finR.y < 0.0;
              /* El muro de la jamba es el de la cara: el que muroQ ya pintó en este píxel (sin volver a llamarlo). */
              vec3 muroR = albedoDelMuroQ;
              vec3 colorR = techoR ? muroR * 0.3 : sueloR ? muroR * 0.95 : muroR * 0.55;
              albedo = mix(albedo, colorR, revelado);
              emision *= 1.0 - revelado;
              rug = mix(rug, 0.85, revelado);
              met = mix(met, 0.0, revelado);
            }
          }
        }
        #if NIVEL_Q >= 2
        if (estilo == 3) {
          /* LOS MONTANTES del muro cortina: cada dos o tres vanos, un perfil de aluminio de 12 cm, de arriba abajo. */
          float cadaM = vano * (mod(subestiloF, 2.0) > 0.5 ? 3.0 : 2.0);
          float montante = 1.0 - smoothstep(0.06, 0.06 + px.x, abs(fract(q.x / cadaM + 0.5) - 0.5) * cadaM);
          albedo = mix(albedo, vec3(0.2, 0.21, 0.22), montante);
          met = mix(met, 0.7, montante);
          rug = mix(rug, 0.35, montante);
          emision *= 1.0 - montante;
          nLocal.xy = mix(nLocal.xy, vec2(sign(fract(q.x / cadaM + 0.5) - 0.5) * 0.5, 0.0), montante * (1.0 - smoothstep(0.02, 0.05, pxm)));
        }
        #endif
      }
      /* La imposta: una faja clara en cada forjado (en el revoco, uno sí y otro no), que da el ritmo
         horizontal de las fachadas de piedra. Su canto de arriba mira al cielo. */
      if (estilo == 0 || estilo == 4 || estilo == 1) {
        float fp0 = (q.y - pb) - planta * hp;
        float toca = estilo == 4 ? step(mod(planta, 2.0), 0.5) : estilo == 1 ? step(mod(planta, 3.0), 0.5) : 1.0;
        float faja = (1.0 - smoothstep(0.16, 0.16 + px.y, fp0)) * toca * (1.0 - smoothstep(0.05, 0.12, px.y));
        vec3 clara = estilo == 1 ? vec3(0.34, 0.32, 0.29) : albedo * 1.08 + 0.01;
        albedo = mix(albedo, clara, faja);
        nLocal.y += faja * smoothstep(0.08, 0.16, fp0) * 0.8;
        paredQ *= 1.0 - faja;
      }
      #if NIVEL_Q >= 1
      /* LA CORONA de una de cada tres torres de más de 45 m: una banda encendida bajo el remate de su cima (al alba, apagada). */
      if ((estilo == 3 || estilo == 2) && cima > 0.5 && techo > 45.0 && q.y > techo - 1.7 && hashQ(vec2(7.0, 29.0), semillaDelEdificio) < 0.3) {
        float banda = smoothstep(techo - 1.6, techo - 1.45, q.y) * (1.0 - smoothstep(techo - 0.55, techo - 0.4, q.y));
        albedo = mix(albedo, vec3(0.04), banda);
        emision = mix(emision, vec3(0.95, 0.92, 0.84) * 1.3 * uVentanas * smoothstep(0.2, 0.9, uVentanasEncendidas), banda);
        paredQ *= 1.0 - banda;
      }
      #endif`;
