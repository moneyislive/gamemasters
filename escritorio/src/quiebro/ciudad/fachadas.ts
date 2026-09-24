/**
 * LAS FACHADAS: los edificios del barrio en UNA geometría y UN material, con las ventanas, los
 * interiores, las tiendas y la suciedad sacadas del sombreador.
 *
 * ═══ POR QUÉ LA VENTANA NO ES GEOMETRÍA ═══
 *
 * Un barrio de 3×3 manzanas tiene del orden de diez mil huecos. Modelarlos (marco, cristal, alféizar)
 * son cientos de miles de triángulos y, peor, cientos de miles de aristas que tiemblan a 80 m. Aquí
 * cada cara de un edificio es UN cuadrilátero, y el sombreador saca de sus UV en metros (ver
 * `geometria.ts`) la rejilla: las plantas del barrio (la baja de 4,5 m y las demás de lo que diga el
 * edificio), vanos que reparten el ancho de la cara en un número entero (así ninguna ventana queda
 * cortada en una esquina), la moldura con su normal analítica, el derrame en sombra y el cristal.
 * Lo que sí es geometría es lo que da SILUETA: los retranqueos, las cornisas, los pretiles, los
 * balcones de hierro, los pilares del soportal y la maquinaria de las azoteas (N1+).
 *
 * ═══ LOS INTERIORES FALSOS ═══
 *
 * Cada hueco es una habitación: el rayo de la cámara entra por el cristal y choca con la caja del
 * cuarto (fondo, paredes, suelo y techo) en forma cerrada, con colores y un mueble sacados del hash
 * de la ventana y una lámpara en el techo si hay luz. Sin atlas de fotos. Se hace sólo desde N1 y a
 * menos de 60 m (se funde entre 45 y 60 con la ventana plana), que es donde se nota el paralaje; más
 * lejos, y en N0 siempre, la ventana es un plano emisivo con degradado, visillos y persiana.
 *
 * ═══ QUÉ SE VE Y QUÉ NO: LAS MEDIANERAS ═══
 *
 * Dos edificios pegados comparten pared. La parte tapada por el vecino no se pinta (no se ve y cuesta
 * relleno); la parte que asoma por encima de un vecino más bajo es una MEDIANERA: pared ciega, sin
 * ventanas, como en cualquier manzana de Madrid. Se calcula por segmentos con las cajas de los
 * volúmenes, así que vale para cualquier barrio.
 *
 * ═══ DE QUIÉN ES CADA NÚMERO ═══
 *
 * La regla de «ventana encendida» y la de «qué tienda» viven dos veces, aquí en GLSL y en
 * `hash.ts`, porque las tarjetas de reflejo y la luz horneada se colocan desde JavaScript bajo lo que
 * el sombreador enciende. Si se toca una, se toca la otra.
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { UNIFORMES_DE_LA_LUZ } from '../atmosfera/paleta';
import { Molde } from './geometria';
import { LARGO_DE_UNA_TIENDA, NUMERO_DEL_ESTILO, colorDeLaVentana, encendida, hashQ as hashDelJs, queTienda } from './hash';
import { RETOQUE_ENTORNO, RETOQUE_MUNDO, RETOQUE_SOLO_BRILLO, UNIFORMES_DE_LA_CIUDAD } from './retoques';
import type { BajoDeLaFachada, CajaXZ, EdificioDelPlano, EstiloDeFachada, NivelDeLaCiudad, Orientacion, Volumen } from './tipos';
import { DETALLE_DEL_NIVEL } from './tipos';
import { azarEn, mezclar } from './azar';

/** El hueco de cada estilo en fracciones del vano y de la planta: [x0, x1, y0, y1]. Igual que `huecoQ`. */
const HUECO_DEL_ESTILO: Readonly<Record<EstiloDeFachada, readonly [number, number, number, number]>> = {
  piedra: [0.3, 0.7, 0.1, 0.84],
  ladrillo: [0.28, 0.72, 0.22, 0.8],
  hormigon: [0.08, 0.92, 0.28, 0.78],
  vidrio: [0.04, 0.96, 0.04, 0.8],
  revoco: [0.3, 0.7, 0.1, 0.84],
  azulejo: [0.3, 0.7, 0.14, 0.82],
};

/** Qué es cada cara, como lo lee el sombreador en `aCara.w`. */
const TIPO = { fachada: 0, medianera: 1, relieve: 2, tejado: 3, barandilla: 4, techoDeSoportal: 5 } as const;

/** Qué hay en la planta baja, en `aPlanta.y`. `sinCalle`: una cara que no da a ninguna calle. */
const BAJO: Readonly<Record<BajoDeLaFachada | 'sinCalle', number>> = { tiendas: 0, portales: 1, soportal: 2, sinCalle: 3 };

/* ═══════════════════════════════ EL SOMBREADOR ═══════════════════════════════ */

const DECLARACIONES_DEL_VERTICE = /* glsl */ `
attribute vec4 aCara;
attribute vec4 aVolumen;
attribute vec2 aPlanta;
varying vec4 vCaraQ;
varying vec4 vVolumenQ;
varying vec2 vPlantaQ;
varying vec2 vUvQ;
`;

const DECLARACIONES_DEL_FRAGMENTO = /* glsl */ `
varying vec4 vCaraQ;
varying vec4 vVolumenQ;
varying vec2 vPlantaQ;
varying vec2 vUvQ;
uniform float uVentanas;
uniform float uRejillaDeGlifos;
uniform float uLuzDeVentanas;
uniform float uVentanasEncendidas;
uniform float uClaridad;

vec3 colorDeLuzQ(float h) {
  if (h < 0.45) return vec3(1.0, 0.56, 0.24);
  if (h < 0.70) return vec3(1.0, 0.74, 0.46);
  if (h < 0.90) return vec3(0.70, 0.86, 1.0);
  return vec3(0.35, 0.5, 1.0);
}

float encendidaQ(float celda, float planta, float semilla, int estilo) {
  float hv = hashQ(vec2(celda, planta), semilla);
  float hp = hashQ(vec2(planta, 91.0), semilla);
  float prob = estilo == 3 ? (hp < 0.16 ? 0.8 : 0.04) : 0.12 + 0.2 * hp;
  /* La luz del barrio apaga una parte (al alba quedan pocas): un segundo sorteo, así que las que siguen
     encendidas son un subconjunto de las de la regla de hash.ts, que es la que coloca los reflejos. */
  float sigue = hashQ(vec2(celda, planta), semilla + 53.0) < uVentanasEncendidas ? 1.0 : 0.0;
  return hv < prob ? sigue : 0.0;
}

/* Igual que queTienda() de hash.ts: 0 persiana, 1 escaparate encendido, 2 portal, 3 apagado o reja. */
int queTiendaQ(float tienda, float semilla, bool portales) {
  float ht = hashQ(vec2(tienda, 3.0), semilla);
  if (portales) return ht < 0.35 ? 2 : ht < 0.7 ? 3 : 0;
  return ht < 0.34 ? 0 : ht < 0.66 ? 1 : ht < 0.8 ? 2 : 3;
}

vec4 huecoQ(int estilo) {
  if (estilo == 0 || estilo == 4) return vec4(0.30, 0.70, 0.10, 0.84);
  if (estilo == 1) return vec4(0.28, 0.72, 0.22, 0.80);
  if (estilo == 2) return vec4(0.08, 0.92, 0.28, 0.78);
  if (estilo == 3) return vec4(0.04, 0.96, 0.04, 0.80);
  return vec4(0.30, 0.70, 0.14, 0.82);
}

/* 1 en la junta, 0 fuera; con el borde del tamaño del píxel, y apagada si el periodo cabe en 3 píxeles. */
float lineaQ(float x, float periodo, float grosor, float px) {
  float f = abs(fract(x / periodo + 0.5) - 0.5) * periodo;
  float l = 1.0 - smoothstep(grosor * 0.5, grosor * 0.5 + px, f);
  return l * (1.0 - smoothstep(periodo / 6.0, periodo / 3.0, px));
}

/* El muro sin huecos: devuelve el albedo, y la rugosidad sale por el último argumento. */
vec3 muroQ(int estilo, vec2 q, float tinte, float semilla, float vano, float pb, float hp, vec2 px, out float rugosidad) {
  rugosidad = 0.88;
  if (estilo == 0) {
    /* Sillería de caliza: hiladas de 0,5 m, piezas de 1,1 a matajuntas, llagas finas. */
    float fila = floor(q.y / 0.5);
    float x = q.x + mod(fila, 2.0) * 0.55;
    float j = max(lineaQ(q.y, 0.5, 0.012, px.y), lineaQ(x, 1.1, 0.012, px.x));
    float pieza = hashQ(vec2(floor(x / 1.1), fila), semilla + 3.0);
    vec3 base = tinte < 0.4 ? vec3(0.48, 0.45, 0.38) : tinte < 0.7 ? vec3(0.44, 0.43, 0.40) : vec3(0.5, 0.44, 0.35);
    /* La llaga, apenas: con un 30 % más oscura la sillería era una cuadrícula dibujada. */
    return base * (0.92 + 0.14 * pieza) * (1.0 - 0.1 * j);
  }
  if (estilo == 1) {
    vec2 b = vec2(0.25, 0.075);
    float fila = floor(q.y / b.y);
    float x = q.x + mod(fila, 2.0) * b.x * 0.5;
    float j = max(lineaQ(q.y, b.y, 0.012, px.y), lineaQ(x, b.x, 0.012, px.x));
    float pieza = hashQ(vec2(floor(x / b.x), fila), semilla + 5.0);
    /* Ladrillo viejo y sucio, no rojo de catálogo: saturado, bajo la luz cálida, salía naranja. */
    vec3 ladrillo = tinte < 0.6
      ? mix(vec3(0.2, 0.085, 0.055), vec3(0.27, 0.13, 0.085), pieza)
      : mix(vec3(0.34, 0.26, 0.16), vec3(0.41, 0.32, 0.21), pieza);
    vec3 mortero = vec3(0.21, 0.2, 0.18);
    float lejos = smoothstep(b.y / 6.0, b.y / 3.0, px.y);
    ladrillo = mix(ladrillo, mix(ladrillo, mortero, 0.15), lejos);
    return mix(ladrillo, mortero, j * 0.45);
  }
  if (estilo == 2) {
    float j = max(lineaQ(q.x, vano, 0.025, px.x), lineaQ(q.y - pb, hp, 0.025, px.y));
    vec3 base = vec3(0.27, 0.27, 0.26) * (0.8 + 0.35 * tinte);
    base *= 0.82 + 0.3 * fbmQ(q * vec2(0.5, 0.09) + semilla * 0.01);
    return base * (1.0 - 0.18 * j);
  }
  if (estilo == 3) {
    rugosidad = 0.1;
    return vec3(0.012, 0.016, 0.02) + vec3(0.0, 0.004, 0.006) * tinte;
  }
  if (estilo == 5) {
    /*
     * Placa cerámica vidriada de 60 × 30 cm a matajuntas: brilla, y cada pieza tiene su tono. Era un
     * azulejo de 15 cm con la junta clara: de lejos, un cuarto de baño.
     */
    vec2 b = vec2(0.6, 0.3);
    float fila = floor(q.y / b.y);
    float x = q.x + mod(fila, 2.0) * b.x * 0.5;
    float j = max(lineaQ(q.y, b.y, 0.006, px.y), lineaQ(x, b.x, 0.006, px.x));
    vec2 celda = vec2(floor(x / b.x), fila);
    vec3 a = tinte < 0.3 ? vec3(0.13, 0.17, 0.22) : tinte < 0.55 ? vec3(0.12, 0.19, 0.17) : tinte < 0.8 ? vec3(0.34, 0.29, 0.2) : vec3(0.42, 0.42, 0.4);
    float lejos = smoothstep(0.02, 0.05, px.y);
    vec3 teja = a * (0.9 + 0.16 * hashQ(celda, semilla + 7.0) * (1.0 - lejos));
    rugosidad = 0.2;
    return mix(teja, teja * 1.15 + 0.01, j * 0.35 * (1.0 - lejos));
  }
  /* Revoco pintado: ocre, crema, almagre o gris azulado, con manchas grandes. */
  /* Apagados a propósito: saturados, bajo el sodio y el ACES, salían de dibujo animado. */
  vec3 base = tinte < 0.3 ? vec3(0.47, 0.39, 0.28) : tinte < 0.55 ? vec3(0.55, 0.51, 0.43)
    : tinte < 0.8 ? vec3(0.41, 0.28, 0.22) : vec3(0.36, 0.38, 0.38);
  #if NIVEL_Q >= 1
  float mancha = fbmQ(q * vec2(0.35, 0.18) + semilla * 0.01);
  #else
  float mancha = ruidoQ(q * vec2(0.35, 0.18) + semilla * 0.01);
  #endif
  return base * (0.78 + 0.4 * mancha);
}

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
`;

const CUERPO_DEL_FRAGMENTO = /* glsl */ `
{
  vec3 P = vPosMundoQ;
  vec3 Ng = normalize(vNorMundoQ);
  float tipo = vCaraQ.w;
  int estilo = int(vCaraQ.y + 0.5);
  /* La semilla es un entero, pero llega interpolada: 41234 puede entrar como 41233,998 en un píxel y
     el hash da otra ventana. Sin redondear, cada cristal era un rayado de estática. */
  float semilla = floor(vCaraQ.z + 0.5);
  float anchoCara = vCaraQ.x;
  float pb = vVolumenQ.x;
  float techo = vVolumenQ.y;
  float tinte = vVolumenQ.z;
  float vanoObj = vVolumenQ.w;
  float hp = vPlantaQ.x;
  int bajo = int(vPlantaQ.y + 0.5);
  vec3 aCam = cameraPosition - P;
  float dist = length(aCam);
  vec3 V = aCam / max(dist, 1e-4);
  vec3 T = vec3(Ng.z, 0.0, -Ng.x);
  vec2 q = vUvQ;
  vec2 px = max(fwidth(q), vec2(1e-4));
  float pxm = max(px.x, px.y);
  float nV = max(1.0, floor(anchoCara / max(vanoObj, 0.5) + 0.5));
  float vano = anchoCara / nV;

  vec3 albedo = vec3(0.3);
  float rug = 0.86;
  float met = 0.0;
  vec3 emision = vec3(0.0);
  vec3 nLocal = vec3(0.0, 0.0, 1.0);
  bool plano = abs(Ng.y) > 0.5;

  if (tipo > 2.5 && tipo < 3.5) {
    /*
     * LA AZOTEA: grava y tela asfáltica a parches, con los charcos que deja la lluvia. Antes era un
     * negro liso (0,045): desde el aire el barrio eran cajas negras, y la vista aérea de las
     * referencias es justo lo contrario, azoteas claras llenas de cosas.
     */
    float n = fbmQ(P.xz * 0.35);
    float g = ruidoQ(P.xz * 5.0);
    vec3 grava = mix(vec3(0.19, 0.19, 0.175), vec3(0.27, 0.26, 0.24), n) * (0.85 + 0.3 * g * (1.0 - smoothstep(0.05, 0.2, pxm)));
    vec3 tela = vec3(0.075, 0.075, 0.072) * (0.8 + 0.4 * n);
    float parche = step(0.55, hashQ(floor(P.xz / 7.0), semilla + 3.0));
    albedo = mix(grava, tela, parche * 0.85);
    float charco = smoothstep(0.6, 0.66, fbmQ(P.xz * 0.23 + semilla * 0.01));
    albedo *= 1.0 - 0.5 * charco;
    rug = mix(0.93, 0.08, charco);
  } else if (tipo > 4.5) {
    /* El techo del soportal: yeso sucio y, cada 4 m, un plafón encendido. */
    albedo = vec3(0.22, 0.21, 0.19) * (0.8 + 0.3 * fbmQ(P.xz * 0.8));
    float plafon = 1.0 - smoothstep(0.18, 0.18 + pxm, length(fract(P.xz / 4.0) - 0.5) * 4.0);
    emision += vec3(1.0, 0.8, 0.55) * 1.6 * plafon * uVentanas * uLuzDeVentanas;
  } else if (tipo > 3.5) {
    /* Barandilla de hierro: barrotes cada 12 cm, pasamanos y travesaño. u a lo largo, v de 0 a 0.95. */
    float barra = 1.0 - smoothstep(0.012, 0.012 + px.x, abs(fract(q.x / 0.12) - 0.5) * 0.12);
    float pasamanos = step(0.9, q.y);
    float traves = 1.0 - smoothstep(0.02, 0.02 + px.y, abs(q.y - 0.1));
    float hierro = max(max(barra, pasamanos), traves);
    /* De lejos los barrotes son más finos que un píxel: en vez de tramar (que parece nieve), la
       barandilla se vuelve un paño oscuro macizo, que es como se lee un balcón a 40 m. */
    float lejos = smoothstep(0.015, 0.03, px.x);
    if (lejos < 0.5 && hierro < 0.5) discard;
    albedo = vec3(0.015);
    met = 0.5;
    rug = 0.45;
  } else {
    albedo = muroQ(estilo, q, tinte, semilla, vano, pb, hp, px, rug);
    if (tipo > 0.5 && tipo < 1.5) {
      albedo = mix(vec3(0.33, 0.31, 0.28), vec3(0.24, 0.22, 0.2), fbmQ(q * 0.12 + semilla * 0.01));
      rug = 0.9;
    }
    if (tipo > 1.5) {
      albedo = estilo == 3 ? vec3(0.35, 0.37, 0.4) : vec3(0.48, 0.45, 0.4) * (0.85 + 0.2 * fbmQ(q * 0.7));
      met = estilo == 3 ? 0.8 : 0.0;
      rug = estilo == 3 ? 0.35 : 0.8;
      if (estilo == 6) {
        /* La madera del depósito de agua: duelas verticales y los aros de hierro. */
        float duela = lineaQ(q.x, 0.18, 0.02, px.x);
        float aro = lineaQ(q.y, 0.7, 0.05, px.y);
        albedo = vec3(0.2, 0.13, 0.08) * (0.8 + 0.3 * fbmQ(q * vec2(4.0, 0.3))) * (1.0 - 0.35 * duela);
        albedo = mix(albedo, vec3(0.05), aro);
        rug = 0.85;
      } else if (estilo == 7) {
        /* Chapa galvanizada de la maquinaria y las patas. */
        albedo = vec3(0.34, 0.35, 0.35) * (0.8 + 0.3 * fbmQ(q * 1.7));
        met = 0.5;
        rug = 0.5;
      }
    }
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
        if (estilo != 3 && estilo != 2) {
          /* Alféizar: 12 cm bajo el hueco y 12 más ancho a cada lado; su canto mira al cielo. */
          float bajoHueco = step(abs(l.x), medio.x + 0.12) * (1.0 - smoothstep(0.0, pxm, -medio.y - l.y - 0.13)) * smoothstep(-pxm, 0.0, -medio.y - l.y - marco * 0.5);
          albedo = mix(albedo, piedraClara * 1.05, bajoHueco);
          nLocal.y += bajoHueco * 0.9;
          /* Dintel: una pieza clara sobre el hueco, y bajo ella la sombra que echa dentro. */
          float dintel = step(abs(l.x), medio.x + marco) * smoothstep(-pxm, 0.0, l.y - medio.y - marco * 0.5) * (1.0 - smoothstep(0.0, pxm, l.y - medio.y - 0.24));
          albedo = mix(albedo, piedraClara, dintel * (estilo == 1 ? 1.0 : 0.6));
        }
        albedo = mix(albedo, albedo * 0.4, derrame);
        nLocal.xy -= gdir * derrame * 0.8;
        if (cristal > 0.0) {
          float luz = encendidaQ(celda, planta, semilla, estilo);
          float hv = hashQ(vec2(celda, planta), semilla);
          float hc = hashQ(vec2(celda, planta), semilla + 17.0);
          vec3 colorLuz = colorDeLuzQ(hc);
          if (hc > 0.9) colorLuz *= 0.45 + 0.55 * ruidoQ(vec2(uTiempo * 5.0, celda + planta * 7.0));
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
              float rugR;
              vec3 muroR = muroQ(estilo, q, tinte, semilla, vano, pb, hp, px, rugR);
              vec3 colorR = techoR ? muroR * 0.3 : sueloR ? muroR * 0.95 : muroR * 0.55;
              albedo = mix(albedo, colorR, revelado);
              emision *= 1.0 - revelado;
              rug = mix(rug, 0.85, revelado);
              met = mix(met, 0.0, revelado);
            }
          }
        }
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
      }
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
    }
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
    }
  }

  if (uRejillaDeGlifos > 0.001) {
    float g = max(lineaQ(q.x, 0.6, 0.04, px.x), lineaQ(P.y, 0.6, 0.04, px.y));
    albedo *= 1.0 - 0.85 * uRejillaDeGlifos;
    emision = emision * (1.0 - uRejillaDeGlifos) + g * uRejillaDeGlifos * vec3(0.25, 1.6, 1.0);
  }

  diffuseColor.rgb = albedo;
  roughnessFactor = rug;
  metalnessFactor = met;
  vec3 nW = plano ? Ng : normalize(T * nLocal.x + vec3(0.0, 1.0, 0.0) * nLocal.y + Ng * nLocal.z);
  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
  totalEmissiveRadiance += emision;
}
`;

/** El retoque de la fachada para un nivel. El nivel entra en el nombre: cambia el texto. */
function retoqueDeLaFachada(nivel: NivelDeLaCiudad): Retoque {
  return {
    nombre: `fachada-n${String(nivel)}`,
    orden: 10,
    uniformes: {
      uVentanas: UNIFORMES_DE_LA_CIUDAD.uVentanas,
      uRejillaDeGlifos: UNIFORMES_DE_LA_CIUDAD.uRejillaDeGlifos,
      uLuzDeVentanas: UNIFORMES_DE_LA_LUZ.uLuzDeVentanas,
      uVentanasEncendidas: UNIFORMES_DE_LA_LUZ.uVentanasEncendidas,
      uClaridad: UNIFORMES_DE_LA_LUZ.uClaridad,
    },
    defines: { NIVEL_Q: DETALLE_DEL_NIVEL[nivel].interiores ? '1' : '0' },
    vertice: [
      { buscar: '#include <common>', como: 'despues', texto: DECLARACIONES_DEL_VERTICE },
      { buscar: '#include <uv_vertex>', como: 'despues', texto: 'vCaraQ = aCara;\nvVolumenQ = aVolumen;\nvPlantaQ = aPlanta;\nvUvQ = uv;' },
    ],
    fragmento: [
      { buscar: '#include <lights_pars_begin>', como: 'antes', texto: DECLARACIONES_DEL_FRAGMENTO },
      { buscar: '#include <normal_fragment_maps>', como: 'despues', texto: CUERPO_DEL_FRAGMENTO },
    ],
  };
}

/** El material de las fachadas para un nivel. */
export function materialDeFachada(nivel: NivelDeLaCiudad): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  m.name = 'quiebro-fachada';
  parchear(m, RETOQUE_MUNDO, RETOQUE_ENTORNO, RETOQUE_SOLO_BRILLO, retoqueDeLaFachada(nivel));
  nieblaEn(m);
  return m;
}

/* ═══════════════════════════════ LA GEOMETRÍA ═══════════════════════════════ */

/** Una ventana encendida en las plantas bajas, o un escaparate: de aquí salen reflejos y luz. */
export interface VentanaEncendida {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly color: readonly [number, number, number];
  readonly escaparate: boolean;
  /** Hacia fuera de la fachada, en planta. */
  readonly normal: readonly [number, number];
}

interface Cara {
  readonly mira: Orientacion;
  /** Coordenada del plano de la cara (x para e/o, z para n/s). */
  readonly plano: number;
  /** Tramo a lo largo de la cara, en coordenada creciente del otro eje. */
  readonly desde: number;
  readonly hasta: number;
  readonly y0: number;
  readonly y1: number;
}

function carasDe(v: Volumen): Cara[] {
  return [
    { mira: 'n', plano: v.z0, desde: v.x0, hasta: v.x1, y0: v.y0, y1: v.y1 },
    { mira: 's', plano: v.z1, desde: v.x0, hasta: v.x1, y0: v.y0, y1: v.y1 },
    { mira: 'e', plano: v.x1, desde: v.z0, hasta: v.z1, y0: v.y0, y1: v.y1 },
    { mira: 'o', plano: v.x0, desde: v.z0, hasta: v.z1, y0: v.y0, y1: v.y1 },
  ];
}

const EPS = 0.05;

interface Toque {
  readonly desde: number;
  readonly hasta: number;
  readonly y0: number;
  readonly y1: number;
}

/** ¿Toca este volumen la cara por detrás (su cara opuesta en el mismo plano)? Devuelve su tramo. */
function tocaLaCara(c: Cara, o: Volumen): Toque | null {
  let plano: number;
  let desde: number;
  let hasta: number;
  if (c.mira === 'n') [plano, desde, hasta] = [o.z1, o.x0, o.x1];
  else if (c.mira === 's') [plano, desde, hasta] = [o.z0, o.x0, o.x1];
  else if (c.mira === 'e') [plano, desde, hasta] = [o.x0, o.z0, o.z1];
  else [plano, desde, hasta] = [o.x1, o.z0, o.z1];
  if (Math.abs(plano - c.plano) > EPS) return null;
  const a = Math.max(desde, c.desde);
  const b = Math.min(hasta, c.hasta);
  if (b - a < EPS) return null;
  return { desde: a, hasta: b, y0: o.y0, y1: o.y1 };
}

/** Resta de un intervalo [y0, y1] una lista de intervalos. Devuelve lo que queda, ordenado. */
function restar(y0: number, y1: number, quitar: readonly (readonly [number, number])[]): [number, number][] {
  let quedan: [number, number][] = [[y0, y1]];
  for (const [a, b] of quitar) {
    const nuevos: [number, number][] = [];
    for (const [c, d] of quedan) {
      if (b <= c + EPS || a >= d - EPS) {
        nuevos.push([c, d]);
        continue;
      }
      if (a > c + EPS) nuevos.push([c, a]);
      if (b < d - EPS) nuevos.push([b, d]);
    }
    quedan = nuevos;
  }
  return quedan.filter(([a, b]) => b - a > EPS);
}

/** Una rejilla espacial tosca para no mirar todos los volúmenes contra todos. */
function indiceDeVolumenes(todos: readonly Volumen[]): (c: Cara) => Volumen[] {
  const celda = 24;
  const mapa = new Map<string, Volumen[]>();
  for (const v of todos) {
    for (let i = Math.floor((v.x0 - EPS) / celda); i <= Math.floor((v.x1 + EPS) / celda); i++) {
      for (let k = Math.floor((v.z0 - EPS) / celda); k <= Math.floor((v.z1 + EPS) / celda); k++) {
        const clave = `${String(i)},${String(k)}`;
        const lista = mapa.get(clave);
        if (lista === undefined) mapa.set(clave, [v]);
        else lista.push(v);
      }
    }
  }
  return (c) => {
    const vistos = new Set<Volumen>();
    const [x0, x1, z0, z1] =
      c.mira === 'n' || c.mira === 's' ? [c.desde, c.hasta, c.plano, c.plano] : [c.plano, c.plano, c.desde, c.hasta];
    for (let i = Math.floor((x0 - EPS) / celda); i <= Math.floor((x1 + EPS) / celda); i++) {
      for (let k = Math.floor((z0 - EPS) / celda); k <= Math.floor((z1 + EPS) / celda); k++) {
        for (const v of mapa.get(`${String(i)},${String(k)}`) ?? []) vistos.add(v);
      }
    }
    return [...vistos];
  };
}

/** Escribe un muro de una cara, de `a` a `b` a lo largo y de `ya` a `yb` en alto. */
function muroDeLaCara(m: Molde, c: Cara, a: number, b: number, ya: number, yb: number): void {
  if (c.mira === 'n') m.muro(b, c.plano, a, c.plano, ya, yb, c.hasta - b);
  else if (c.mira === 's') m.muro(a, c.plano, b, c.plano, ya, yb, a - c.desde);
  else if (c.mira === 'e') m.muro(c.plano, b, c.plano, a, ya, yb, c.hasta - b);
  else m.muro(c.plano, a, c.plano, b, ya, yb, a - c.desde);
}

/** El vector normal de una orientación. */
export function normalDe(o: Orientacion): readonly [number, number] {
  return o === 'n' ? [0, -1] : o === 's' ? [0, 1] : o === 'e' ? [1, 0] : [-1, 0];
}

/** El punto en planta de una `u` a lo largo de una cara (u desde el borde izquierdo mirándola). */
function puntoDeLaCara(c: Cara, u: number): readonly [number, number] {
  if (c.mira === 'n') return [c.hasta - u, c.plano];
  if (c.mira === 's') return [c.desde + u, c.plano];
  if (c.mira === 'e') return [c.plano, c.hasta - u];
  return [c.plano, c.desde + u];
}

/** Semilla entera de una cara (< 2^16, exacta en el atributo y en el hash). */
function semillaDeLaCara(edificio: EdificioDelPlano, v: number, c: Orientacion): number {
  return mezclar(edificio.semilla, v, c.charCodeAt(0)) % 65536;
}

export interface OpcionesDeLasFachadas {
  /** Cornisas, pretiles, impostas, balcones y azoteas. */
  readonly relieve: boolean;
  /** Recoger ventanas encendidas y escaparates (para las tarjetas y la luz horneada). */
  readonly ventanas: boolean;
  /**
   * Volúmenes que NO se escriben pero tapan: los de los edificios de al lado que van en otra celda (el
   * cerco es una fila continua de fachadas partida en las rayas de las celdas). Sin ellos, la cara que da
   * al vecino de la otra celda saldría con ventanas en vez de medianera.
   */
  readonly vecinos?: readonly Volumen[];
}

/** Los atributos del molde de las fachadas. */
export const ATRIBUTOS_DE_LA_FACHADA = { aCara: 4, aVolumen: 4, aPlanta: 2 } as const;

/**
 * UNA CAJA DE RELIEVE con los atributos de la fachada: pared lisa del estilo, sin huecos. Para lo que va con
 * las fachadas sin ser un edificio (la viga y los pilares del Elevado en lo lejano).
 */
export function cajaDeRelieve(m: Molde, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, estilo: EstiloDeFachada, caras = 'nseoa'): void {
  m.poner('aCara', 1, NUMERO_DEL_ESTILO[estilo], 0, TIPO.relieve);
  m.poner('aVolumen', 4.5, y1, 0.5, 3);
  m.poner('aPlanta', 3, BAJO.sinCalle);
  m.caja(x0, y0, z0, x1, y1, z1, caras);
}

/** Lo que estorba de las fachadas: la planta baja de cada edificio y los pilares de su soportal. */
export function huellasDeLasFachadas(edificios: readonly EdificioDelPlano[]): CajaXZ[] {
  return edificios.flatMap((e) => [e.caja, ...e.pilares]);
}

/**
 * ESCRIBE LAS FACHADAS de una lista de edificios en un molde con los atributos de la fachada.
 * Devuelve las ventanas encendidas bajas y los escaparates (si se piden).
 */
export function escribirLasFachadas(m: Molde, edificios: readonly EdificioDelPlano[], opciones: OpcionesDeLasFachadas): VentanaEncendida[] {
  const ventanas: VentanaEncendida[] = [];
  for (const _ of fachadasPorPartes(m, edificios, opciones, ventanas)) {
    /* de un tirón */
  }
  return ventanas;
}

/** Cada cuántos balcones se cede el paso: seis son unos 700 triángulos con sus barandillas. */
const BALCONES_POR_TROZO = 6;

/**
 * LAS FACHADAS A TROZOS: lo mismo que `escribirLasFachadas`, cediendo el paso después de cada cara, de
 * cada azotea y de cada puñado de balcones. Es lo que usa la ventana de celdas (`celdas.ts`) para que el
 * trabajo de un fotograma no pase de su tope de triángulos: una cara con balcones son 1.500 triángulos, y
 * un edificio entero de N3 pasa de 5.000. Las ventanas encendidas y los escaparates van a `ventanas`.
 */
export function* fachadasPorPartes(m: Molde, edificios: readonly EdificioDelPlano[], opciones: OpcionesDeLasFachadas, ventanas: VentanaEncendida[]): Generator<void, void, void> {
  const todos: Volumen[] = [...edificios.flatMap((e) => e.volumenes), ...(opciones.vecinos ?? [])];
  const cerca = indiceDeVolumenes(todos);

  for (const e of edificios) {
    const estilo = NUMERO_DEL_ESTILO[e.estilo];
    const tinte = Math.min(0.99, Math.max(0, e.tono + (azarEn(e.semilla, 7) - 0.5) * 0.1));
    const balcones = opciones.relieve && e.balcones && e.estilo !== 'vidrio' && e.estilo !== 'hormigon';
    for (let iv = 0; iv < e.volumenes.length; iv++) {
      const v = e.volumenes[iv] as Volumen;
      for (const c of carasDe(v)) {
        const ancho = c.hasta - c.desde;
        const semilla = semillaDeLaCara(e, iv, c.mira);
        const fachada = e.fachadas.find((f) => f.mira === c.mira);
        const bajo = fachada === undefined ? BAJO.sinCalle : BAJO[fachada.bajo];
        /* Los tramos: se corta la cara por donde empiezan y acaban los volúmenes que la tocan. */
        const toques = cerca(c)
          .filter((o) => o !== v)
          .map((o) => tocaLaCara(c, o))
          .filter((t): t is Toque => t !== null);
        const cortes = [c.desde, c.hasta, ...toques.flatMap((t) => [t.desde, t.hasta])]
          .filter((x) => x >= c.desde - EPS && x <= c.hasta + EPS)
          .sort((p, q) => p - q);
        for (let i = 0; i < cortes.length - 1; i++) {
          const a = cortes[i] as number;
          const b = cortes[i + 1] as number;
          if (b - a < EPS) continue;
          const tapan = toques.filter((t) => t.desde <= a + EPS && t.hasta >= b - EPS);
          const visibles = restar(c.y0, c.y1, tapan.map((t) => [Math.max(c.y0, t.y0), Math.min(c.y1, t.y1)] as const));
          const ciega = tapan.length > 0 && fachada === undefined;
          for (const [ya, yb] of visibles) {
            m.poner('aCara', ancho, estilo, semilla, ciega ? TIPO.medianera : TIPO.fachada);
            m.poner('aVolumen', e.plantaBaja, v.y1, tinte, e.vano);
            m.poner('aPlanta', e.alturaDePlanta, bajo);
            muroDeLaCara(m, c, a, b, ya, yb);
          }
        }
        yield;
        if (fachada !== undefined && (opciones.ventanas || balcones)) {
          const huecos: (readonly [number, number])[] = [];
          recorrerLosHuecos(e, v, c, toques, (celda, planta, ux, y, ySuelo) => {
            const [nx, nz] = normalDe(c.mira);
            const [px, pz] = puntoDeLaCara(c, ux);
            if (opciones.ventanas && planta <= 3 && encendida(celda, planta, semilla, estilo)) {
              ventanas.push({ x: px + nx * 0.05, y, z: pz + nz * 0.05, color: colorDeLaVentana(celda, planta, semilla), escaparate: false, normal: [nx, nz] });
            }
            if (balcones && planta <= 5) huecos.push([ux, ySuelo]);
          });
          for (let k = 0; k < huecos.length; k++) {
            const [ux, ySuelo] = huecos[k] as readonly [number, number];
            escribirUnBalcon(m, e, c, ux, ySuelo, estilo, semilla, ancho, v.y1, tinte);
            if ((k + 1) % BALCONES_POR_TROZO === 0) yield;
          }
          if (huecos.length % BALCONES_POR_TROZO !== 0) yield;
        }
        if (opciones.ventanas && fachada !== undefined && fachada.bajo !== 'portales' && v.y0 < 0.01) {
          escaparatesDe(c, semilla, toques, ventanas);
        }
      }
      /* La azotea. */
      m.poner('aCara', 1, estilo, 0, TIPO.tejado);
      m.poner('aVolumen', e.plantaBaja, v.y1, tinte, e.vano);
      m.poner('aPlanta', e.alturaDePlanta, BAJO.sinCalle);
      m.losa(v.x0, v.z0, v.x1, v.z1, v.y1, true);
      if (opciones.relieve) escribirElRemate(m, e, v, estilo, tinte, iv);
      yield;
    }
    escribirElSoportal(m, e, estilo, tinte);
    yield;
  }
}

/**
 * Recorre los huecos de una cara con la MISMA rejilla del sombreador (vanos enteros, plantas desde
 * la baja, sólo las que caben enteras bajo el remate) y avisa por cada uno que no tape un vecino.
 */
function recorrerLosHuecos(
  e: EdificioDelPlano,
  v: Volumen,
  c: Cara,
  toques: readonly Toque[],
  avisar: (celda: number, planta: number, u: number, yCentro: number, ySuelo: number) => void,
): void {
  const ancho = c.hasta - c.desde;
  const nV = Math.max(1, Math.floor(ancho / Math.max(e.vano, 0.5) + 0.5));
  const vano = ancho / nV;
  const hueco = HUECO_DEL_ESTILO[e.estilo];
  const hp = e.alturaDePlanta;
  for (let planta = 0; ; planta++) {
    const suelo = e.plantaBaja + planta * hp;
    if (suelo + hp > v.y1 + 0.01) break;
    if (suelo < v.y0 - 0.01) continue;
    for (let celda = 0; celda < nV; celda++) {
      const u = (celda + 0.5) * vano;
      const y = suelo + ((hueco[2] + hueco[3]) / 2) * hp;
      const a = c.mira === 'n' || c.mira === 'e' ? c.hasta - u : c.desde + u;
      if (toques.some((t) => a >= t.desde && a <= t.hasta && y >= t.y0 && y <= t.y1)) continue;
      avisar(celda, planta, u, y, suelo + hueco[2] * hp);
    }
  }
}

/** La losa de un balcón con su barandilla, bajo el hueco. */
function escribirUnBalcon(
  m: Molde,
  e: EdificioDelPlano,
  c: Cara,
  u: number,
  ySuelo: number,
  estilo: number,
  semilla: number,
  anchoCara: number,
  techo: number,
  tinte: number,
): void {
  const hueco = HUECO_DEL_ESTILO[e.estilo];
  const nV = Math.max(1, Math.floor(anchoCara / Math.max(e.vano, 0.5) + 0.5));
  const vano = anchoCara / nV;
  const medio = ((hueco[1] - hueco[0]) * vano) / 2 + 0.3;
  const fondo = 0.55;
  const [nx, nz] = normalDe(c.mira);
  const [px, pz] = puntoDeLaCara(c, u);
  /* Tangente a la derecha de quien mira la cara: T = (n.z, 0, −n.x). */
  const tx = nz;
  const tz = -nx;
  const y0 = ySuelo - 0.14;
  const y1 = ySuelo;
  m.poner('aCara', anchoCara, estilo, semilla, TIPO.relieve);
  m.poner('aVolumen', e.plantaBaja, techo, tinte, e.vano);
  m.poner('aPlanta', e.alturaDePlanta, BAJO.sinCalle);
  const esq = (s: number, f: number, y: number): [number, number, number] => [px + tx * s + nx * f, y, pz + tz * s + nz * f];
  const n: [number, number, number] = [nx, 0, nz];
  m.quad(esq(-medio, fondo, y0), esq(medio, fondo, y0), esq(medio, fondo, y1), esq(-medio, fondo, y1), n, [0, y0, 1, y0, 1, y1, 0, y1]);
  m.quad(esq(-medio, fondo, y1), esq(medio, fondo, y1), esq(medio, 0, y1), esq(-medio, 0, y1), [0, 1, 0], [0, y1, 1, y1, 1, y1, 0, y1]);
  m.quad(esq(-medio, 0, y0), esq(medio, 0, y0), esq(medio, fondo, y0), esq(-medio, fondo, y0), [0, -1, 0], [0, y0, 1, y0, 1, y0, 0, y0]);
  m.quad(esq(medio, fondo, y0), esq(medio, 0, y0), esq(medio, 0, y1), esq(medio, fondo, y1), [tx, 0, tz], [0, y0, 1, y0, 1, y1, 0, y1]);
  m.quad(esq(-medio, 0, y0), esq(-medio, fondo, y0), esq(-medio, fondo, y1), esq(-medio, 0, y1), [-tx, 0, -tz], [0, y0, 1, y0, 1, y1, 0, y1]);
  /* La barandilla: delante y a los lados, con UV propias (u a lo largo en metros, v de 0 a 0.95). */
  m.poner('aCara', anchoCara, estilo, semilla, TIPO.barandilla);
  const f2 = fondo - 0.03;
  const alto = 0.95;
  const lado = 2 * medio;
  m.quad(esq(-medio, f2, y1), esq(medio, f2, y1), esq(medio, f2, y1 + alto), esq(-medio, f2, y1 + alto), n, [0, 0, lado, 0, lado, alto, 0, alto]);
  m.quad(esq(medio, f2, y1), esq(-medio, f2, y1), esq(-medio, f2, y1 + alto), esq(medio, f2, y1 + alto), [-nx, 0, -nz], [0, 0, lado, 0, lado, alto, 0, alto]);
  for (const s of [-medio + 0.03, medio - 0.03]) {
    const fuera: [number, number, number] = [s < 0 ? -tx : tx, 0, s < 0 ? -tz : tz];
    const dentro: [number, number, number] = [-fuera[0], 0, -fuera[2]];
    m.quad(esq(s, 0, y1), esq(s, f2, y1), esq(s, f2, y1 + alto), esq(s, 0, y1 + alto), s < 0 ? fuera : dentro, [0, 0, f2, 0, f2, alto, 0, alto]);
    m.quad(esq(s, f2, y1), esq(s, 0, y1), esq(s, 0, y1 + alto), esq(s, f2, y1 + alto), s < 0 ? dentro : fuera, [0, 0, f2, 0, f2, alto, 0, alto]);
  }
}

/** Cuatro listones que vuelan `vuelo` fuera de las caras de un volumen, entre `y0` e `y1`. */
function anilloQueVuela(m: Molde, v: CajaXZ, y0: number, y1: number, vuelo: number): void {
  m.caja(v.x0 - vuelo, y0, v.z0 - vuelo, v.x1 + vuelo, y1, v.z0, 'neoab');
  m.caja(v.x0 - vuelo, y0, v.z1, v.x1 + vuelo, y1, v.z1 + vuelo, 'seoab');
  m.caja(v.x1, y0, v.z0, v.x1 + vuelo, y1, v.z1, 'eab');
  m.caja(v.x0 - vuelo, y0, v.z0, v.x0, y1, v.z1, 'oab');
}

/** Cornisa, pretil, imposta de la planta baja y maquinaria de azotea. */
function escribirElRemate(m: Molde, e: EdificioDelPlano, v: Volumen, estilo: number, tinte: number, iv: number): void {
  m.poner('aCara', 1, estilo, 0, TIPO.relieve);
  m.poner('aVolumen', e.plantaBaja, v.y1, tinte, e.vano);
  m.poner('aPlanta', e.alturaDePlanta, BAJO.sinCalle);
  const vidrio = e.estilo === 'vidrio';
  const vuelo = vidrio ? 0.12 : 0.35;
  const canto = vidrio ? 0.25 : 0.4;
  /* La cornisa vuela FUERA del muro (nunca encima del tejado: ahí pelearía en profundidad con la
     azotea). Sus caras de abajo se ven desde la calle. La planta baja no lleva: lleva la imposta. */
  if (iv > 0) anilloQueVuela(m, v, v.y1 - canto, v.y1, vuelo);
  /* El pretil: un murete de 0,9 m retranqueado. */
  if (!vidrio && iv > 0) {
    const r = 0.1;
    m.caja(v.x0 + r, v.y1, v.z0 + r, v.x1 - r, v.y1 + 0.9, v.z0 + r + 0.25, 'nseoa');
    m.caja(v.x0 + r, v.y1, v.z1 - r - 0.25, v.x1 - r, v.y1 + 0.9, v.z1 - r, 'nseoa');
    m.caja(v.x0 + r, v.y1, v.z0 + r, v.x0 + r + 0.25, v.y1 + 0.9, v.z1 - r, 'nseoa');
    m.caja(v.x1 - r - 0.25, v.y1, v.z0 + r, v.x1 - r, v.y1 + 0.9, v.z1 - r, 'nseoa');
  }
  /* La imposta sobre la planta baja, en el cuerpo: vuela sobre la acera, por encima de la cabeza. */
  if (iv === 1 && !vidrio) anilloQueVuela(m, v, e.plantaBaja - 0.02, e.plantaBaja + 0.24, 0.12);
  /* Maquinaria: uno a cuatro bultos en la azotea del volumen más alto. */
  if (iv === e.volumenes.length - 1) {
    const cuantos = 1 + Math.floor(azarEn(e.semilla, 21) * 4);
    const anchoV = v.x1 - v.x0;
    const fondoV = v.z1 - v.z0;
    m.poner('aCara', 1, CHAPA_DE_AZOTEA, 0, TIPO.relieve);
    for (let i = 0; i < cuantos; i++) {
      const w = 1.2 + azarEn(e.semilla, 30 + i) * 2.2;
      const d = 1.0 + azarEn(e.semilla, 40 + i) * 1.8;
      const h = 1.0 + azarEn(e.semilla, 50 + i) * 1.8;
      if (w > anchoV - 2 || d > fondoV - 2) continue;
      const x = v.x0 + 1 + azarEn(e.semilla, 60 + i) * (anchoV - 2 - w);
      const z = v.z0 + 1 + azarEn(e.semilla, 70 + i) * (fondoV - 2 - d);
      m.caja(x, v.y1, z, x + w, v.y1 + h, z + d, 'nseoa');
    }
    escribirLaAzotea(m, e, v, estilo);
  }
}

/** El «estilo» de lo que es de chapa en una azotea y de lo que es de madera (lo lee el sombreador). */
const CHAPA_DE_AZOTEA = 7;
const MADERA_DE_AZOTEA = 6;

/**
 * LO QUE HAY EN UNA AZOTEA, además de la maquinaria: la caseta de la escalera y, en los edificios de
 * ladrillo, piedra y revoco, a veces el depósito de agua de madera sobre sus patas con su tejadillo
 * cónico, que es lo que dice «ciudad americana» desde el aire. Todo por el hash del edificio, igual en
 * todos los aparatos, y sólo con relieve (N1+ en el barrio, N2+ en el anillo). Cuesta unos 150
 * triángulos por edificio; nada de esto estorba ni se choca: está en la azotea.
 */
function escribirLaAzotea(m: Molde, e: EdificioDelPlano, v: Volumen, estilo: number): void {
  const anchoV = v.x1 - v.x0;
  const fondoV = v.z1 - v.z0;
  if (anchoV < 8 || fondoV < 8) return;
  const h = (k: number): number => azarEn(e.semilla, 200 + k);
  /* La caseta: en una esquina, de 2,6 a 3,6 m de lado y 2,8 de alto. */
  m.poner('aCara', 1, estilo === 3 ? 2 : estilo, 0, TIPO.relieve);
  const lc = 2.6 + h(1) * 1.0;
  const cx = h(2) < 0.5 ? v.x0 + 1.2 : v.x1 - 1.2 - lc;
  const cz = h(3) < 0.5 ? v.z0 + 1.2 : v.z1 - 1.2 - lc;
  m.caja(cx, v.y1, cz, cx + lc, v.y1 + 2.8, cz + lc, 'nseoa');
  /* El depósito de agua. */
  if (e.estilo !== 'vidrio' && e.estilo !== 'hormigon' && h(4) < 0.55) {
    const r = 1.2 + h(5) * 0.6;
    const px = h(6) < 0.5 ? v.x1 - 2.2 - r : v.x0 + 2.2 + r;
    const pz = h(7) < 0.5 ? v.z1 - 2.2 - r : v.z0 + 2.2 + r;
    const patas = 1.6 + h(8) * 0.8;
    const alto = 2.4 + h(9) * 1.2;
    m.poner('aCara', 1, CHAPA_DE_AZOTEA, 0, TIPO.relieve);
    const g = 0.09;
    const o = r * 0.62;
    for (const [dx, dz] of [[-o, -o], [o, -o], [-o, o], [o, o]] as const) {
      m.caja(px + dx - g, v.y1, pz + dz - g, px + dx + g, v.y1 + patas, pz + dz + g, 'nseo');
    }
    m.poner('aCara', 1, MADERA_DE_AZOTEA, 0, TIPO.relieve);
    m.cilindro(px, pz, v.y1 + patas, v.y1 + patas + alto, r, r, 10, true);
    m.cilindro(px, pz, v.y1 + patas + alto, v.y1 + patas + alto + r * 0.7, r * 1.06, 0.08, 10, false);
  }
}

/** El techo del soportal (la cara de abajo del cuerpo que vuela) y sus pilares. */
function escribirElSoportal(m: Molde, e: EdificioDelPlano, estilo: number, tinte: number): void {
  if (e.soportales.length === 0) return;
  const h = e.huella;
  const b = e.caja;
  const y = e.plantaBaja;
  m.poner('aCara', 1, estilo, 0, TIPO.techoDeSoportal);
  m.poner('aVolumen', e.plantaBaja, y, tinte, e.vano);
  m.poner('aPlanta', e.alturaDePlanta, BAJO.sinCalle);
  /* Con soportal en dos caras que hacen esquina, el techo de la esquina lo pone el de la cara norte o sur:
     dos losas en el mismo plano parpadearían. */
  const tiene = (o: string): boolean => e.soportales.some((x) => x.mira === o);
  const z0 = tiene('n') ? b.z0 : h.z0;
  const z1 = tiene('s') ? b.z1 : h.z1;
  for (const { mira: s } of e.soportales) {
    if (s === 'n') m.losa(h.x0, h.z0, h.x1, b.z0, y, false);
    else if (s === 's') m.losa(h.x0, b.z1, h.x1, h.z1, y, false);
    else if (s === 'e') m.losa(b.x1, z0, h.x1, z1, y, false);
    else m.losa(h.x0, z0, b.x0, z1, y, false);
  }
  m.poner('aCara', 1, estilo, 0, TIPO.relieve);
  for (const p of e.pilares) m.caja(p.x0, 0, p.z0, p.x1, y, p.z1, 'nseo');
}

/** Los escaparates encendidos: la MISMA cuenta que el sombreador (`queTienda`), una tienda cada 6 m. */
function escaparatesDe(c: Cara, semilla: number, toques: readonly Toque[], ventanas: VentanaEncendida[]): void {
  const ancho = c.hasta - c.desde;
  const nT = Math.max(1, Math.floor(ancho / LARGO_DE_UNA_TIENDA));
  for (let t = 0; t < nT; t++) {
    if (queTienda(t, semilla, false) !== 1) continue;
    const t0 = t * LARGO_DE_UNA_TIENDA;
    const t1 = t === nT - 1 ? ancho : t0 + LARGO_DE_UNA_TIENDA;
    const a = c.desde + (t0 + t1) / 2;
    if (toques.some((k) => a >= k.desde && a <= k.hasta && k.y0 < 2)) continue;
    const hc = hashDelJs(t, 5, semilla);
    const color: readonly [number, number, number] = hc < 0.5 ? [0.85, 0.95, 1.0] : hc < 0.8 ? [1.0, 0.78, 0.5] : [1.0, 0.6, 0.85];
    const [nx, nz] = normalDe(c.mira);
    const [px, pz] = c.mira === 'n' || c.mira === 's' ? [a, c.plano] : [c.plano, a];
    ventanas.push({ x: px + nx * 0.05, y: 1.7, z: pz + nz * 0.05, color, escaparate: true, normal: [nx, nz] });
  }
}

/**
 * UNA CARA DE CALLE, para lo que se cuelga de ella (toldos, aparatos de aire, escaleras de incendios:
 * `voladizos.ts`). Da las mismas cuentas que el sombreador: dónde cae cada hueco y cada tienda, y qué
 * tramos tapa un vecino.
 */
export interface CaraDeCalle {
  readonly edificio: EdificioDelPlano;
  readonly indice: number;
  readonly mira: Orientacion;
  readonly desde: number;
  readonly hasta: number;
  readonly y0: number;
  readonly y1: number;
  readonly bajo: BajoDeLaFachada;
  readonly semilla: number;
  /** El punto en planta a `u` metros de su borde izquierdo (mirándola). */
  punto(u: number): readonly [number, number];
  /** ¿Tapa un vecino el punto `a` (coordenada del mundo a lo largo de la cara) a la altura `y`? */
  tapado(a: number, y: number): boolean;
  /** Los huecos, con la rejilla del sombreador: celda, planta, u, altura del centro y del alféizar. */
  huecos(avisar: (celda: number, planta: number, u: number, yCentro: number, ySuelo: number) => void): void;
}

/** Las caras de los edificios que dan a una calle (las que tienen fachada). */
export function carasDeCalle(edificios: readonly EdificioDelPlano[], vecinos: readonly Volumen[] = []): CaraDeCalle[] {
  const todos: Volumen[] = [...edificios.flatMap((e) => e.volumenes), ...vecinos];
  const cerca = indiceDeVolumenes(todos);
  const salida: CaraDeCalle[] = [];
  for (const e of edificios) {
    e.volumenes.forEach((v, iv) => {
      for (const c of carasDe(v)) {
        const fachada = e.fachadas.find((f) => f.mira === c.mira);
        if (fachada === undefined) continue;
        const toques = cerca(c)
          .filter((o) => o !== v)
          .map((o) => tocaLaCara(c, o))
          .filter((t): t is Toque => t !== null);
        salida.push({
          edificio: e,
          indice: iv,
          mira: c.mira,
          desde: c.desde,
          hasta: c.hasta,
          y0: c.y0,
          y1: c.y1,
          bajo: fachada.bajo,
          semilla: semillaDeLaCara(e, iv, c.mira),
          punto: (u) => puntoDeLaCara(c, u),
          tapado: (a, y) => toques.some((t) => a >= t.desde && a <= t.hasta && y >= t.y0 && y <= t.y1),
          huecos: (avisar) => recorrerLosHuecos(e, v, c, toques, avisar),
        });
      }
    });
  }
  return salida;
}

/** Construye las fachadas del barrio para un nivel. */
export function construirLasFachadas(
  edificios: readonly EdificioDelPlano[],
  nivel: NivelDeLaCiudad,
): { geometria: THREE.BufferGeometry; ventanas: VentanaEncendida[]; huellas: CajaXZ[] } {
  const m = new Molde(ATRIBUTOS_DE_LA_FACHADA);
  const ventanas = escribirLasFachadas(m, edificios, { relieve: DETALLE_DEL_NIVEL[nivel].relieve, ventanas: true });
  return { geometria: m.geometria(), ventanas, huellas: huellasDeLasFachadas(edificios) };
}
