/**
 * LOS MATERIALES DE LOS EFECTOS: uno por familia, seis en total.
 *
 * ═══ UN PROGRAMA POR FAMILIA ═══
 *
 * Cada familia es UN sombreador, y todas sus piezas lo comparten: three guarda los programas por su
 * código, así que el muro del Bis, el cielo, las pantallas y las siluetas —cuatro mallas de la
 * familia de los tapices— compilan UNA vez. Lo que cambia de una pieza a otra va en atributos por
 * instancia (el modo, el tamaño, la lluvia, el momento), no en `#define`s: un `#define` distinto
 * sería un programa distinto, y una compilación a mitad de partida es un tirón.
 *
 *   · anuncio   — el anillo que se cierra. Mezcla normal y SIN prueba de profundidad: es la señal
 *                 del juego, y un anillo tapado por un quiosco no le dice a nadie cuándo quebrar.
 *                 Lleva un borde oscuro debajo del trazo para leerse sobre neón y sobre negro.
 *   · ondas     — aros de aire tras las balas, la onda y el destello de un impacto.
 *   · cintas    — líneas de apuntado, balas con estela, hilos del Trasvase y el cable de la salida.
 *   · tapices   — columnas de glifos: cielo, pantallas, muro y marco del Bis, impresión, desalojo,
 *                 salida y el haz de la cabina.
 *   · chispas   — trazos analíticos: la CPU escribe al nacer y el sombreador los mueve.
 *   · esquirlas — cristales ámbar con facetas, opacos.
 *
 * Todas menos las esquirlas SUMAN luz (mezcla aditiva, sin escribir profundidad) y sacan la
 * intensidad ya multiplicada en el color, con alfa 1: así un glifo puede pasar de 1 y el brillo del
 * posproceso lo recoge, y el orden de pintado entre ellas da igual.
 *
 * ═══ LAS CINTAS, LAS CHISPAS Y LAS ONDAS SE VEN DE LAS DOS CARAS ═══
 *
 * Una cinta se pone de cara a la cámara con `cross(tangente, al ojo)`, y el lado al que sale ese
 * producto depende de hacia dónde corre la cinta en la pantalla: la mitad de las veces sus
 * triángulos quedan de espaldas. Con `FrontSide` se podaban sin un error —la primera versión del
 * banco tenía la línea de apuntado, las balas, los hilos y las chispas en la cuenta de llamadas y en
 * ninguna parte de la imagen—. Las ondas de aire van en el plano perpendicular a la bala y se miran
 * de los dos lados. Los tapices y el anillo, en cambio, se orientan con la derecha de la cámara y
 * salen siempre de frente: con una cara basta (y el muro del Bis pide las dos, porque es un muro).
 */
import * as THREE from 'three';
import { atlasDeLaGrafia } from './atlas';
import {
  ALTURA_DE_LA_ESQUIRLA,
  COLORES,
  RECOGIDA_DE_LA_ESQUIRLA_MS,
  SALTO_DE_LA_ESQUIRLA_MS,
  VAIVEN_DE_LA_ESQUIRLA,
} from './cuentas';
import type { Familia } from './presupuesto';
import {
  flotante,
  GLSL_AZAR,
  GLSL_GRAFIA,
  GLSL_NIEBLA_PARS_FRAGMENTO,
  GLSL_NIEBLA_PARS_VERTICE,
  GLSL_NIEBLA_VERTICE,
  GLSL_SALIDA,
  GLSL_SILUETA,
} from './glsl';

/** Un color sRGB de la paleta pasado a lineal, para uniformes. */
function lineal(color: number): THREE.Color {
  return new THREE.Color(color);
}

/* ─────────────────────────────── Tapices ─────────────────────────────── */

const TAPICES_VERTICE = /* glsl */ `
${GLSL_AZAR}
${GLSL_NIEBLA_PARS_VERTICE}
attribute vec4 aBase;     // xyz: centro de abajo; w: modo (0 de cara, 1 fijo, 2 en pantalla, 3 silueta)
attribute vec4 aTamano;   // ancho, alto, orientación (modo 1), temblor
attribute vec4 aLluvia;   // columnas, filas por segundo (<0 sube), semilla, cola en filas
attribute vec4 aColor;    // rgb lineal, intensidad
attribute vec4 aSilueta;  // alto, hombros, cadera, prenda
attribute vec4 aMomento;  // compacto o núcleo, frente (m), clase, tiempo propio (s; <0 el del reloj)
uniform float uTiempo;
uniform vec2 uResolucion;
varying vec2 vUv;
varying vec2 vLocal;
varying vec2 vTamano;
varying vec4 vLluvia;
varying vec4 vColor;
varying vec4 vSilueta;
varying vec4 vMomento;
varying float vModo;
varying float vTiempo;
void main() {
  float modo = aBase.w;
  float t = aMomento.w >= 0.0 ? aMomento.w : uTiempo;
  vec2 local = vec2((position.x - 0.5) * aTamano.x, position.y * aTamano.y);
  // El temblor va a saltos de 1/24 s y cada paño salta a su aire: un fallo, no un vaivén.
  float temblor = aTamano.w * (azar2(floor(t * 24.0), aLluvia.z * 7.0 + 3.0) - 0.5) * 2.0;
  if (modo > 1.5 && modo < 2.5) {
    gl_Position = vec4(aBase.xy + position.xy * aTamano.xy + vec2(temblor * 0.01, 0.0), 0.0, 1.0);
    vLocal = position.xy * aTamano.xy * 0.5 * uResolucion;
    vTamano = aTamano.xy * 0.5 * uResolucion;
    #ifdef USE_FOG
      vFogDepth = 0.0;
    #endif
  } else {
    vec3 derecha;
    vec3 base = aBase.xyz;
    if (modo > 0.5 && modo < 1.5) {
      derecha = vec3(cos(aTamano.z), 0.0, -sin(aTamano.z));
    } else {
      vec3 c = cameraPosition - aBase.xyz;
      c.y = 0.0;
      float l = length(c);
      c = l > 1e-4 ? c / l : vec3(0.0, 0.0, 1.0);
      derecha = vec3(c.z, 0.0, -c.x);
      // La silueta se adelanta medio metro hacia el ojo: en su sitio exacto quedaría DENTRO del
      // cuerpo que se imprime o se desaloja, y el cuerpo la taparía (lo enseñó el banco).
      if (modo > 2.5) base += c * 0.45;
    }
    vec3 mundo = base + derecha * (local.x + temblor) + vec3(0.0, local.y, 0.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(mundo, 1.0);
    vLocal = local;
    vTamano = aTamano.xy;
    ${GLSL_NIEBLA_VERTICE}
  }
  vUv = position.xy;
  vLluvia = aLluvia;
  vColor = aColor;
  vSilueta = aSilueta;
  vMomento = aMomento;
  vModo = modo;
  vTiempo = t;
}
`;

const TAPICES_FRAGMENTO = /* glsl */ `
${GLSL_AZAR}
${GLSL_GRAFIA}
${GLSL_SILUETA}
${GLSL_NIEBLA_PARS_FRAGMENTO}
varying vec2 vUv;
varying vec2 vLocal;
varying vec2 vTamano;
varying vec4 vLluvia;
varying vec4 vColor;
varying vec4 vSilueta;
varying vec4 vMomento;
varying float vModo;
varying float vTiempo;
void main() {
  float columnas = max(1.0, vLluvia.x);
  float anchoCelda = vTamano.x / columnas;
  float altoCelda = anchoCelda * (TEXELES_DE_LA_CELDA.y / TEXELES_DE_LA_CELDA.x);
  vec2 q = vec2(vUv.x * columnas, vLocal.y / altoCelda);
  float filas = max(1.0, vTamano.y / altoCelda);
  float col = floor(q.x);
  float fila = floor(q.y);
  float semilla = vLluvia.z;
  float h1 = azar2(col + 11.0, semilla);
  float h2 = azar2(col + 5003.0, semilla + 1.0);
  float velocidad = abs(vLluvia.y) * (0.55 + 0.9 * h1);
  float cola = max(2.0, vLluvia.w);
  float periodo = filas + cola + 3.0;
  // Cuántas filas lleva recorridas la gota desde su origen: de arriba si cae, de abajo si sube.
  float recorrida = vLluvia.y >= 0.0 ? (filas - 1.0 - fila) : fila;
  float d1 = mod(vTiempo * velocidad + h1 * periodo, periodo) - recorrida;
  float d2 = mod(vTiempo * velocidad * 0.73 + h2 * periodo, periodo) - recorrida;
  float b1 = (d1 >= 0.0 && d1 < cola) ? pow(1.0 - d1 / cola, 1.6) : 0.0;
  float b2 = (d2 >= 0.0 && d2 < cola * 0.6) ? pow(1.0 - d2 / (cola * 0.6), 1.6) * 0.7 : 0.0;
  float brillo = max(b1, b2);
  float cabeza = (d1 >= 0.0 && d1 < 1.0) ? 1.0 : 0.0;
  // Cada celda cambia de glifo a su ritmo.
  float ritmo = 2.0 + 5.0 * azar2(col * 3.0 + 1.0, fila + 17.0);
  float g = floor(azar2(col * 131.0 + fila + 1.0, floor(vTiempo * ritmo) + semilla) * 48.0);
  vec4 m = celdaDeGrafia(g, q);
  float tinta = tintaDelCampo(m.g, q, 0.5);
  float halo = smoothstep(0.1, 0.5, m.g) * 0.3;
  float mascara = 1.0;
  float extra = 0.0;
  // Lo que se suma sin pasar por la máscara: el contorno de una silueta.
  float resalte = 0.0;
  if (vModo > 2.5) {
    vec2 p = vLocal;
    float sdf = silueta(p, vSilueta);
    float dentro = 1.0 - smoothstep(-0.012, 0.018, sdf);
    // El contorno: sin él, a diez metros una silueta rellena de glifos es una mancha con forma de
    // nada. Con él se lee la persona (y el sombrero, y la falda) antes que los glifos.
    float contorno = 1.0 - smoothstep(0.0, 0.035, abs(sdf + 0.01));
    float frente = vMomento.y;
    float compacto = vMomento.x;
    if (vMomento.z < 0.5) {
      // IMPRESIÓN: por encima del frente que baja hay columna; al llegar abajo se aprieta en silueta.
      float medio = mix(vTamano.x * 0.5, vSilueta.y + 0.05, compacto);
      float columna = step(abs(p.x), medio) * step(frente, p.y);
      mascara = mix(columna, dentro, compacto);
      extra = exp(-abs(p.y - frente) * 7.0) * (1.0 - compacto) * step(abs(p.x), medio) * 1.5;
      resalte = contorno * compacto * 1.2;
    } else {
      // DESALOJO Y SALIDA: el cuerpo se va desde los pies; por encima de la cabeza, glifos que suben.
      float cuerpo = dentro * step(frente, p.y);
      float encima = step(abs(p.x), vSilueta.y) * step(vSilueta.x, p.y) * exp(-(p.y - vSilueta.x) / 1.6) * compacto;
      mascara = max(cuerpo, encima);
      extra = dentro * exp(-abs(p.y - frente) * 9.0) * step(0.02, frente);
      resalte = contorno * step(frente, p.y) * 1.2;
    }
    brillo = max(brillo, 0.35);
  } else if (vModo < 1.5) {
    // El núcleo de un haz: una línea que late en el centro, y un resplandor que llena el ancho. A
    // ochenta metros el haz mide pocos píxeles, y sin ellos era un hilo que no se encontraba.
    float nucleo = exp(-abs(vLocal.x) / max(0.25, vTamano.x * 0.12));
    float resplandor = pow(max(0.0, 1.0 - abs(vLocal.x) / (vTamano.x * 0.5)), 2.0);
    extra = vMomento.x * (nucleo * 1.4 + resplandor * 0.35);
    // Los bordes del paño se funden: una pantalla no es un recorte duro, y el cielo tampoco.
    mascara *= smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
  }
  vec3 color = mix(vColor.rgb, vec3(1.0), cabeza * 0.7);
  float a = ((tinta + halo) * brillo * mascara + extra * mascara + resalte) * vColor.a;
  gl_FragColor = vec4(color * a, 1.0);
  // En los modos de cara y fijo, vMomento.y dice cuánto resiste la niebla (el haz de la cabina
  // se tiene que ver a dos calles). En la silueta, vMomento.y es el frente y no cuenta aquí.
  float resiste = vModo < 1.5 ? clamp(vMomento.y, 0.0, 1.0) : 0.0;
  gl_FragColor.rgb *= 1.0 - nieblaQueApaga() * (1.0 - resiste);
  ${GLSL_SALIDA}
}
`;

/* ─────────────────────────────── Cintas ─────────────────────────────── */

const CINTAS_VERTICE = /* glsl */ `
${GLSL_NIEBLA_PARS_VERTICE}
attribute vec4 aA;        // xyz: principio; w: ancho en metros
attribute vec4 aB;        // xyz: final; w: ancho mínimo en píxeles
attribute vec4 aC;        // xyz: punto de control; w: tipo (0 apuntado, 1 bala, 2 hilo, 3 cable)
attribute vec4 aColorA;   // rgb lineal en el principio; a: intensidad
attribute vec4 aColorB;   // rgb lineal en el final; a: semilla
attribute vec4 aTramo;    // cola (0-1), frente (0-1), flujo de glifos (m/s), destello
uniform float uPxPorMetro;
varying vec2 vUV;
varying float vLargo;
varying float vAncho;
varying vec4 vColor;
varying vec4 vTramo;
varying float vTipo;
varying float vSemilla;
void main() {
  float u = position.x;
  vec3 A = aA.xyz;
  vec3 B = aB.xyz;
  vec3 C = aC.xyz;
  float w = 1.0 - u;
  vec3 P = w * w * A + 2.0 * u * w * C + u * u * B;
  vec3 T = 2.0 * w * (C - A) + 2.0 * u * (B - C);
  if (length(T) < 1e-5) T = vec3(1.0, 0.0, 0.0);
  vec3 alOjo = cameraPosition - P;
  float distancia = max(length(alOjo), 1e-3);
  vec3 lado = cross(normalize(T), alOjo / distancia);
  float l = length(lado);
  lado = l > 1e-4 ? lado / l : vec3(0.0, 1.0, 0.0);
  float ancho = max(aA.w, aB.w * distancia / max(uPxPorMetro, 1.0));
  vec3 mundo = P + lado * position.y * ancho * 0.5;
  gl_Position = projectionMatrix * viewMatrix * vec4(mundo, 1.0);
  vUV = vec2(u, position.y);
  vLargo = length(C - A) + length(B - C);
  vAncho = ancho;
  vColor = vec4(mix(aColorA.rgb, aColorB.rgb, u), aColorA.a);
  vTramo = aTramo;
  vTipo = aC.w;
  vSemilla = aColorB.a;
  ${GLSL_NIEBLA_VERTICE}
}
`;

const CINTAS_FRAGMENTO = /* glsl */ `
${GLSL_AZAR}
${GLSL_GRAFIA}
${GLSL_NIEBLA_PARS_FRAGMENTO}
uniform float uTiempo;
varying vec2 vUV;
varying float vLargo;
varying float vAncho;
varying vec4 vColor;
varying vec4 vTramo;
varying float vTipo;
varying float vSemilla;
void main() {
  float u = vUV.x;
  float v = vUV.y;
  float cola = vTramo.x;
  float frente = vTramo.y;
  if (u < cola || u > frente) discard;
  float nucleo = pow(max(0.0, 1.0 - abs(v)), 2.0);
  // Un espinazo de dos o tres píxeles por el centro, a cualquier distancia: la cinta es tan ancha
  // como sus glifos, y sin esto una línea de glifos de lejos sería una mancha sin dirección.
  float pxDeLado = 1.0 / max(fwidth(v), 1e-4);
  float espinazo = 1.0 - smoothstep(0.6, 1.5, abs(v) * pxDeLado);
  // Glifos a lo largo, del alto de la cinta, que fluyen hacia el final.
  float anchoCelda = max(vAncho * 0.75, 1e-3);
  float x = u * vLargo / anchoCelda - uTiempo * vTramo.z / anchoCelda;
  vec2 q = vec2(x, (v + 1.0) * 0.5);
  float g = floor(azar2(floor(x) + 4096.0, vSemilla + floor(uTiempo * 7.0)) * 48.0);
  float tinta = tintaDelCampo(celdaDeGrafia(g, q).r, q, 0.5);
  float brillo;
  if (vTipo < 0.5) {
    // APUNTADO: línea fina de glifos y una marca que late donde va a dar.
    float marca = exp(-(1.0 - u) * vLargo * 1.5);
    brillo = espinazo * 1.5 + tinta * 0.55 + marca * 1.6 * nucleo;
  } else if (vTipo < 1.5) {
    // BALA: el núcleo al frente y la estela que se apaga hacia atrás.
    float k = (u - cola) / max(frente - cola, 1e-4);
    float cabeza = smoothstep(0.8, 1.0, k);
    brillo = nucleo * (0.2 + 1.4 * k * k * k) + cabeza * 2.4 * nucleo + tinta * 0.35 * k;
  } else {
    // HILOS Y CABLE: glifos que corren, con el frente encendido.
    float alFrente = exp(-(frente - u) * 7.0);
    brillo = espinazo * (0.7 + 1.2 * alFrente) + tinta * (0.45 + 1.1 * alFrente) + alFrente * nucleo;
  }
  float a = brillo * vColor.a * (1.0 + vTramo.w * 2.5);
  gl_FragColor = vec4(vColor.rgb * a, 1.0);
  gl_FragColor.rgb *= 1.0 - nieblaQueApaga();
  ${GLSL_SALIDA}
}
`;

/* ─────────────────────────────── El anuncio ─────────────────────────────── */

const ANUNCIO_VERTICE = /* glsl */ `
attribute vec4 aCentro;   // xyz: centro; w: medio lado del cuadro (m)
attribute vec4 aRadios;   // radio del que se cierra, radio final, grosor, alto de los glifos
attribute vec4 aColor;    // rgb lineal, opacidad
attribute vec4 aEstado;   // progreso, trazos, remate (0 nada, 1 limpio, 2 esquivado, 3 golpe, 4 parado), edad del remate (0-1)
attribute vec4 aExtra;    // semilla, propio, tras el impacto sin veredicto (0-1), —
varying vec2 vLocal;
varying vec4 vRadios;
varying vec4 vColor;
varying vec4 vEstado;
varying vec4 vExtra;
void main() {
  vec3 derecha = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 arriba = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vLocal = position.xy * aCentro.w;
  vec3 mundo = aCentro.xyz + (derecha * position.x + arriba * position.y) * aCentro.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(mundo, 1.0);
  vRadios = aRadios;
  vColor = aColor;
  vEstado = aEstado;
  vExtra = aExtra;
}
`;

const ANUNCIO_FRAGMENTO = /* glsl */ `
${GLSL_AZAR}
${GLSL_GRAFIA}
uniform float uTiempo;
uniform vec3 uAmbar;
varying vec2 vLocal;
varying vec4 vRadios;
varying vec4 vColor;
varying vec4 vEstado;
varying vec4 vExtra;
float aro(float r, float radio, float grosor, float aa) {
  return 1.0 - smoothstep(grosor * 0.5 - aa, grosor * 0.5 + aa, abs(r - radio));
}
void main() {
  float r = length(vLocal);
  float aa = max(fwidth(r) * 0.8, 1e-4);
  float R = vRadios.x;
  float R1 = vRadios.y;
  float grosor = vRadios.z;
  float h = vRadios.w;
  float p = vEstado.x;
  float trazos = vEstado.y;
  float remate = vEstado.z;
  float edad = vEstado.w;
  float propio = vExtra.y;
  float tras = vExtra.z;
  vec3 color = vColor.rgb;

  // 1. El anillo fijo: donde se va a cerrar. Fino, y se enciende al acercarse el golpe.
  float fijo = aro(r, R1, grosor * 0.5, aa) * (0.5 + 0.5 * smoothstep(0.65, 1.0, p));
  // 2. El que se cierra: uno, dos o tres trazos hacia fuera según la amenaza.
  float movil = 0.0;
  for (int k = 0; k < 3; k++) {
    if (float(k) >= trazos) break;
    movil = max(movil, aro(r, R + float(k) * grosor * 2.1, grosor, aa));
  }
  // 3. La banda de glifos por fuera del último trazo: sólo en los anillos propios.
  float glifos = 0.0;
  float dentroDeLaBanda = R + (trazos - 1.0) * grosor * 2.1 + grosor * 1.1;
  if (propio > 0.5 && remate < 0.5 && h > 0.0) {
    float n = max(6.0, floor(6.2831853 * (dentroDeLaBanda + h * 0.5) / (h * 0.78)));
    float angulo = atan(vLocal.y, vLocal.x) / 6.2831853 + 0.5;
    float giro = uTiempo * (0.04 + 0.3 * p * p);
    vec2 q = vec2(fract(angulo + giro) * n, (r - dentroDeLaBanda) / h);
    // Derivadas del ángulo sin el salto de la costura: d(atan(y,x)) = (x dy − y dx) / r².
    vec2 dlx = dFdx(vLocal);
    vec2 dly = dFdy(vLocal);
    float r2 = max(r * r, 1e-6);
    float dax = (vLocal.x * dlx.y - vLocal.y * dlx.x) / r2 / 6.2831853 * n;
    float day = (vLocal.x * dly.y - vLocal.y * dly.x) / r2 / 6.2831853 * n;
    vec2 dqx = vec2(dax, dot(vLocal, dlx) / max(r, 1e-4) / h);
    vec2 dqy = vec2(day, dot(vLocal, dly) / max(r, 1e-4) / h);
    if (q.y >= 0.0 && q.y <= 1.0) {
      float celda = floor(q.x);
      float g = floor(azar2(celda + 1.0, vExtra.x + floor(uTiempo * (3.0 + 10.0 * p))) * 48.0);
      glifos = tintaDelCampoD(celdaDeGrafiaD(g, q, dqx, dqy).r, dqx, dqy, 0.5) * smoothstep(0.0, 0.12, p) * 0.85;
    }
  }
  // 4. El disco de dentro se va cargando: se lee la cercanía sin mirar el radio.
  float relleno = propio * (1.0 - smoothstep(R - aa, R + aa, r)) * (0.03 + 0.2 * p * p);

  float tinta = max(max(fijo, movil), glifos);
  float brillo = 1.0 + 0.8 * smoothstep(0.85, 1.0, p);
  float opacidad = vColor.a;

  // 5. El remate: qué pasó con el golpe.
  if (remate > 0.5) {
    float queda = 1.0 - edad;
    if (remate < 1.5) {
      // LIMPIO: el anillo estalla hacia fuera en ámbar, que es el color de lo que ganas.
      float radio = R1 * (1.0 + 1.6 * edad);
      tinta = aro(r, radio, grosor * (1.0 + 2.0 * (1.0 - edad)), aa) + aro(r, radio * 1.25, grosor * 0.5, aa) * 0.6;
      color = uAmbar;
      brillo = 2.2;
      relleno = 0.0;
    } else if (remate < 2.5) {
      // ESQUIVADO: se apaga sin más.
      tinta = max(fijo, movil) * 0.7;
      relleno = 0.0;
    } else if (remate < 3.5) {
      // GOLPE: el disco se llena del color de la amenaza y se va.
      relleno = (1.0 - smoothstep(R1 * 1.2 - aa, R1 * 1.2 + aa, r)) * 0.55;
      brillo = 1.8;
    } else {
      // PARADO: un aro blanco que se abre un poco.
      tinta = aro(r, R1 * (1.0 + 0.5 * edad), grosor * 1.5, aa);
      color = vec3(1.0);
    }
    opacidad *= queda;
  } else if (tras > 0.0) {
    // El impacto sin veredicto todavía: un fogonazo corto y el anillo quieto, apagándose.
    brillo = 1.0 + 2.5 * max(0.0, 1.0 - tras * 4.0);
    opacidad *= 1.0 - tras * 0.6;
  }

  // Contraste: una sombra oscura bajo los trazos para que se lean sobre neón y sobre negro.
  float sombra = max(aro(r, R, grosor * 3.2, aa * 2.0), aro(r, R1, grosor * 2.4, aa * 2.0)) * 0.5;
  float alfa = clamp(max(max(tinta, relleno), sombra) * opacidad, 0.0, 1.0);
  if (alfa <= 0.002) discard;
  float peso = clamp(max(tinta, relleno) / max(max(max(tinta, relleno), sombra), 1e-4), 0.0, 1.0);
  vec3 salida = mix(vec3(0.0), color * brillo, peso);
  gl_FragColor = vec4(salida, alfa);
  ${GLSL_SALIDA}
}
`;

/* ─────────────────────────────── Ondas ─────────────────────────────── */

const ONDAS_VERTICE = /* glsl */ `
${GLSL_NIEBLA_PARS_VERTICE}
attribute vec4 aCentro;   // xyz, radio (m)
attribute vec4 aEje;      // normal xyz; w: 1 plano fijo, 0 de cara a la cámara
attribute vec4 aForma;    // grosor (m), relleno (0-1), —, opacidad
attribute vec3 aColor;
varying vec2 vLocal;
varying vec4 vForma;
varying vec3 vColor;
varying float vRadio;
void main() {
  vec3 e1;
  vec3 e2;
  if (aEje.w > 0.5) {
    vec3 n = normalize(aEje.xyz);
    vec3 ref = abs(n.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    e1 = normalize(cross(ref, n));
    e2 = cross(n, e1);
  } else {
    e1 = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    e2 = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  }
  float lado = aCentro.w + aForma.x * 2.0;
  vLocal = position.xy * lado;
  vec3 mundo = aCentro.xyz + (e1 * position.x + e2 * position.y) * lado;
  gl_Position = projectionMatrix * viewMatrix * vec4(mundo, 1.0);
  vForma = aForma;
  vColor = aColor;
  vRadio = aCentro.w;
  ${GLSL_NIEBLA_VERTICE}
}
`;

const ONDAS_FRAGMENTO = /* glsl */ `
${GLSL_NIEBLA_PARS_FRAGMENTO}
varying vec2 vLocal;
varying vec4 vForma;
varying vec3 vColor;
varying float vRadio;
void main() {
  float r = length(vLocal);
  float aa = max(fwidth(r), 1e-4);
  float g = vForma.x;
  float aro = 1.0 - smoothstep(g * 0.5 - aa, g * 0.5 + aa, abs(r - vRadio));
  // Un aro de aire no es una línea: tiene un brillo suave por dentro del borde, que se apaga
  // hacia el centro en cuatro grosores (no un disco gris: eso fue la primera versión).
  float dentro = smoothstep(vRadio - g * 4.0, vRadio, r) * step(r, vRadio) * 0.25;
  float disco = vForma.y * pow(max(0.0, 1.0 - r / max(vRadio, 1e-3)), 2.0);
  float a = (aro + dentro * (1.0 - vForma.y) + disco * 2.0) * vForma.w;
  if (a <= 0.002) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
  gl_FragColor.rgb *= 1.0 - nieblaQueApaga();
  ${GLSL_SALIDA}
}
`;

/* ─────────────────────────────── Chispas ─────────────────────────────── */

const CHISPAS_VERTICE = /* glsl */ `
${GLSL_NIEBLA_PARS_VERTICE}
attribute vec3 aOrigen;
attribute vec3 aVelocidad;
attribute vec4 aTiempos;  // nace (s), vida (s), talla (m), semilla
attribute vec3 aColor;
uniform float uTiempo;
varying vec2 vTrazo;
varying float vEdad;
varying vec3 vColor;
const vec3 GRAVEDAD = vec3(0.0, -9.0, 0.0);
const float FRENO = 2.4;
vec3 sitioEn(float tau) {
  float k = (1.0 - exp(-FRENO * tau)) / FRENO;
  return aOrigen + aVelocidad * k + 0.5 * GRAVEDAD * tau * tau;
}
void main() {
  float tau = uTiempo - aTiempos.x;
  float vida = aTiempos.y;
  if (vida <= 0.0 || tau < 0.0 || tau > vida) {
    // Fuera del recorte: los cuatro vértices en el mismo sitio y fuera de la pantalla.
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vTrazo = vec2(0.0);
    vEdad = 1.0;
    vColor = vec3(0.0);
    return;
  }
  vec3 cabeza = sitioEn(tau);
  vec3 cola = sitioEn(max(0.0, tau - 0.07));
  vec3 eje = cabeza - cola;
  float largo = length(eje);
  eje = largo > 1e-5 ? eje / largo : vec3(0.0, 1.0, 0.0);
  vec3 alOjo = normalize(cameraPosition - cabeza);
  vec3 lado = cross(eje, alOjo);
  float l = length(lado);
  lado = l > 1e-5 ? lado / l : vec3(1.0, 0.0, 0.0);
  float s = tau / vida;
  float talla = aTiempos.z * (1.0 - 0.6 * s);
  vec3 mundo = mix(cola - eje * talla, cabeza + eje * talla * 0.5, position.x) + lado * position.y * talla * 0.5;
  gl_Position = projectionMatrix * viewMatrix * vec4(mundo, 1.0);
  vTrazo = position.xy;
  vEdad = s;
  vColor = aColor;
  ${GLSL_NIEBLA_VERTICE}
}
`;

const CHISPAS_FRAGMENTO = /* glsl */ `
${GLSL_NIEBLA_PARS_FRAGMENTO}
varying vec2 vTrazo;
varying float vEdad;
varying vec3 vColor;
void main() {
  float a = pow(max(0.0, 1.0 - abs(vTrazo.y)), 2.0) * (0.35 + 0.65 * vTrazo.x) * pow(1.0 - vEdad, 1.5) * 3.0;
  if (a <= 0.002) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
  gl_FragColor.rgb *= 1.0 - nieblaQueApaga();
  ${GLSL_SALIDA}
}
`;

/* ─────────────────────────────── Esquirlas ─────────────────────────────── */

const ESQUIRLAS_VERTICE = /* glsl */ `
#include <fog_pars_vertex>
attribute vec3 aSitio;
attribute vec3 aDesde;
attribute vec3 aHacia;
attribute vec4 aTiempos;  // nace (s), recogida (s, <0 si no), semilla, visible
uniform float uTiempo;
varying vec3 vNormal;
varying vec3 vMundo;
varying float vDestello;
mat3 giroY(float a) { float c = cos(a); float s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 giroX(float a) { float c = cos(a); float s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
void main() {
  if (aTiempos.w < 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vNormal = vec3(0.0, 1.0, 0.0);
    vMundo = vec3(0.0);
    vDestello = 0.0;
    return;
  }
  float t = uTiempo;
  float semilla = aTiempos.z;
  float salto = clamp((t - aTiempos.x) / ${flotante(SALTO_DE_LA_ESQUIRLA_MS / 1000)}, 0.0, 1.0);
  vec3 sitio = aSitio + vec3(0.0, ${flotante(ALTURA_DE_LA_ESQUIRLA)} + ${flotante(VAIVEN_DE_LA_ESQUIRLA)} * sin(t * 4.6 + semilla * 6.2831853), 0.0);
  vec3 p = mix(aDesde, sitio, salto) + vec3(0.0, 3.2 * salto * (1.0 - salto), 0.0);
  float escala = 0.25 * smoothstep(0.0, 0.3, salto);
  if (aTiempos.y >= 0.0) {
    float r = clamp((t - aTiempos.y) / ${flotante(RECOGIDA_DE_LA_ESQUIRLA_MS / 1000)}, 0.0, 1.0);
    p = mix(p, aHacia, r * r);
    escala *= 1.0 - r;
  }
  mat3 giro = giroY(t * 1.7 + semilla * 6.2831853) * giroX(0.35 + 0.2 * sin(t * 1.3 + semilla * 9.0));
  vNormal = giro * normal;
  vMundo = p + giro * (position * escala);
  vec4 mv = viewMatrix * vec4(vMundo, 1.0);
  gl_Position = projectionMatrix * mv;
  vDestello = 0.5 + 0.5 * sin(t * 3.1 + semilla * 40.0);
  #ifdef USE_FOG
    vFogDepth = -mv.z;
  #endif
}
`;

const ESQUIRLAS_FRAGMENTO = /* glsl */ `
#include <fog_pars_fragment>
uniform vec3 uAmbar;
uniform vec3 uAmbarClaro;
varying vec3 vNormal;
varying vec3 vMundo;
varying float vDestello;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vMundo);
  // La luz de una farola de sodio, desde arriba y algo de lado: la del barrio.
  float luz = 0.35 + 0.65 * max(0.0, dot(n, normalize(vec3(0.3, 0.9, 0.2))));
  float borde = pow(1.0 - max(0.0, dot(n, v)), 2.5);
  float destello = pow(max(0.0, dot(reflect(-v, n), normalize(vec3(-0.2, 0.95, 0.3)))), 24.0) * (0.6 + 0.4 * vDestello);
  vec3 c = uAmbar * (0.6 + 0.9 * luz) + uAmbarClaro * (borde * 1.6 + destello * 3.0);
  gl_FragColor = vec4(c, 1.0);
  ${GLSL_SALIDA}
  #include <fog_fragment>
}
`;

/* ─────────────────────────────── Las fábricas ─────────────────────────────── */

export interface OpcionesDelMaterial {
  /** Pintar encima de todo (el marco del Bis está en pantalla). */
  readonly encima?: boolean;
  /** Las dos caras (el muro del Bis se ve desde dentro y desde fuera). */
  readonly dosCaras?: boolean;
  /** Que la niebla de la escena lo apague. El cielo no: vive detrás de ella. */
  readonly niebla?: boolean;
}

/** Los uniformes de un material con la niebla de three debajo (sin clonar el atlas: ver abajo). */
function uniformes(niebla: boolean, propios: Record<string, THREE.IUniform>): Record<string, THREE.IUniform> {
  /*
   * `UniformsUtils.merge` CLONA los valores, y clonar una textura es otra subida a la GPU. Así que
   * se mezcla sólo lo de la niebla y los propios se ponen encima tal cual.
   */
  const base = niebla ? THREE.UniformsUtils.clone(THREE.UniformsLib.fog) : {};
  return Object.assign(base, propios);
}

/** El material de una familia. Cada llamada da un material nuevo (sus uniformes); el programa es el mismo. */
export function materialDe(familia: Familia, opciones: OpcionesDelMaterial = {}): THREE.ShaderMaterial {
  const niebla = opciones.niebla ?? true;
  const comun = {
    transparent: true,
    depthWrite: false,
    depthTest: opciones.encima !== true,
    blending: THREE.AdditiveBlending,
    side: opciones.dosCaras === true ? THREE.DoubleSide : THREE.FrontSide,
    fog: niebla,
  } as const;
  switch (familia) {
    case 'tapices':
      return new THREE.ShaderMaterial({
        ...comun,
        name: 'efectos-tapices',
        vertexShader: TAPICES_VERTICE,
        fragmentShader: TAPICES_FRAGMENTO,
        uniforms: uniformes(niebla, {
          uGrafia: { value: atlasDeLaGrafia() },
          uTiempo: { value: 0 },
          uResolucion: { value: new THREE.Vector2(1, 1) },
        }),
      });
    case 'cintas':
      return new THREE.ShaderMaterial({
        ...comun,
        /* DOS CARAS: ver «las cintas se ven de las dos caras» en la cabecera. */
        side: THREE.DoubleSide,
        name: 'efectos-cintas',
        vertexShader: CINTAS_VERTICE,
        fragmentShader: CINTAS_FRAGMENTO,
        uniforms: uniformes(niebla, {
          uGrafia: { value: atlasDeLaGrafia() },
          uTiempo: { value: 0 },
          uPxPorMetro: { value: 500 },
        }),
      });
    case 'anuncio':
      return new THREE.ShaderMaterial({
        ...comun,
        /* La señal de juego: mezcla normal, encima de todo, sin niebla. Ver la cabecera. */
        blending: THREE.NormalBlending,
        depthTest: false,
        fog: false,
        name: 'efectos-anuncio',
        vertexShader: ANUNCIO_VERTICE,
        fragmentShader: ANUNCIO_FRAGMENTO,
        uniforms: {
          uGrafia: { value: atlasDeLaGrafia() },
          uTiempo: { value: 0 },
          uAmbar: { value: lineal(COLORES.ambar) },
        },
      });
    case 'ondas':
      return new THREE.ShaderMaterial({
        ...comun,
        side: THREE.DoubleSide,
        name: 'efectos-ondas',
        vertexShader: ONDAS_VERTICE,
        fragmentShader: ONDAS_FRAGMENTO,
        uniforms: uniformes(niebla, {}),
      });
    case 'chispas':
      return new THREE.ShaderMaterial({
        ...comun,
        side: THREE.DoubleSide,
        name: 'efectos-chispas',
        vertexShader: CHISPAS_VERTICE,
        fragmentShader: CHISPAS_FRAGMENTO,
        uniforms: uniformes(niebla, { uTiempo: { value: 0 } }),
      });
    case 'esquirlas':
      return new THREE.ShaderMaterial({
        name: 'efectos-esquirlas',
        transparent: false,
        depthWrite: true,
        depthTest: true,
        blending: THREE.NormalBlending,
        fog: niebla,
        vertexShader: ESQUIRLAS_VERTICE,
        fragmentShader: ESQUIRLAS_FRAGMENTO,
        uniforms: uniformes(niebla, {
          uTiempo: { value: 0 },
          uAmbar: { value: lineal(COLORES.ambar) },
          uAmbarClaro: { value: lineal(COLORES.ambarClaro) },
        }),
      });
  }
}

/** Los fuentes de cada familia, para el comprobador (que los lee sin GPU). */
export const FUENTES_DE_LAS_FAMILIAS: Readonly<Record<Familia, { vertice: string; fragmento: string }>> = {
  tapices: { vertice: TAPICES_VERTICE, fragmento: TAPICES_FRAGMENTO },
  cintas: { vertice: CINTAS_VERTICE, fragmento: CINTAS_FRAGMENTO },
  anuncio: { vertice: ANUNCIO_VERTICE, fragmento: ANUNCIO_FRAGMENTO },
  ondas: { vertice: ONDAS_VERTICE, fragmento: ONDAS_FRAGMENTO },
  chispas: { vertice: CHISPAS_VERTICE, fragmento: CHISPAS_FRAGMENTO },
  esquirlas: { vertice: ESQUIRLAS_VERTICE, fragmento: ESQUIRLAS_FRAGMENTO },
};
