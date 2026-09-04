/**
 * LA CÁMARA DEL MUELLE: aritmética pura de poses, respiración y encuadre.
 *
 * ═══ POR QUÉ AQUÍ NO HAY `three` ═══
 *
 * Lo que se comprueba de una cámara no es que pinte, es DÓNDE deja las cosas: si
 * el aventurero local queda entero por encima de la hoja del HUD en un móvil de
 * 9:19,5 con la hoja abierta al 36 %, eso es una proyección, o sea cuatro
 * productos escalares y una división. Escribir la matriz de perspectiva a mano
 * (son doce líneas) compra que `verify:embarcadero` lo compruebe en Node para
 * tres relaciones de aspecto y cuatro aforos sin abrir un contexto de dibujo, y
 * que la escena y el comprobador usen EXACTAMENTE la misma cuenta.
 *
 * ═══ TODA POSE ES UN OBJETIVO ═══
 *
 * Nada de aquí se asigna a la cámara en seco: `Embarcadero.tsx` interpola hacia
 * lo que estas funciones devuelven con un amortiguado exponencial, salvo en el
 * primer fotograma. Por eso las funciones son de «dónde debería estar», no de
 * «muévete».
 *
 * ═══ LA HOJA MANDA, Y CÓMO SE CUMPLE ═══
 *
 * `Ventana.franjaInferior` es la fracción del alto que tapa la hoja. El local
 * tiene que quedar entero por encima de ella y, además, no pegado a su borde:
 * los pies nunca bajan del 22 % del alto ÚTIL (lo que queda sobre la hoja). Para
 * subirlo en el encuadre la cámara INCLINA hacia abajo —baja el punto al que
 * mira—, que es lo contrario de lo que sugiere la intuición: mirar más alto
 * empuja las cosas hacia abajo en la imagen. Se resuelve por bisección sobre la
 * altura del objetivo, con la misma proyección que después comprueba el
 * resultado. Si con la hoja cerrada ya cumple, no se toca nada.
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Pose {
  readonly posicion: Vec3;
  readonly objetivo: Vec3;
  /** Vertical, en grados. */
  readonly fov: number;
}

/* ───────────────────────── Las poses de reposo del §3 ───────────────────────── */

/**
 * Retrato: ojos a 2,4 u, a 8,6 u del local, 50° de campo. El local en el centro.
 *
 * Estuvo a 7,5 u con 55°: la cabeza rozaba el tercio superior y no había aire.
 * Con la hoja del móvil, la bisección de `encuadre` clava los pies del local en
 * su límite, así que la única forma de ganar aire por arriba es que el local sea
 * más pequeño en pantalla: más lejos y con menos campo. El cono horizontal que
 * queda en 9:19,5 es de ±12°, y a él se ajusta el abanico de `cala.ts`.
 */
export const POSE_RETRATO: Pose = {
  posicion: { x: 0, y: 2.4, z: 8.6 },
  objetivo: { x: 0, y: 1.35, z: 0 },
  fov: 50,
};

/**
 * Panorámico: a 9 u sobre el eje del muelle, 32°, girada 13° a la derecha y con
 * la mirada 4° por debajo de la horizontal, hacia el mar. El local cae en
 * x ≈ −0,45 del encuadre (el tercio izquierdo de verdad) y la mirada cruza el
 * abanico de amarres y llega al horizonte.
 *
 * ═══ POR QUÉ SOBRE EL EJE Y NO CORRIDA A LA DERECHA, Y POR QUÉ 32° ═══
 *
 * La primera versión corría la cámara 1,8 u a la derecha. Eso mueve al local
 * —que está a 9 u— once grados a la izquierda, y a los amarres —a 20 o 40 u—
 * sólo tres o cuatro: todo el abanico se apilaba a la derecha del local en una
 * franja de 0,07 del ancho, unos detrás de otros. Sobre el eje, los azimuts son
 * los mismos que en retrato, y el abanico se reparte a los dos lados de él.
 * Y 32° en vez de 38° porque con dieciséis novenos el campo horizontal es casi
 * el triple que en el móvil: seis figuras que en retrato distan 3,3° se
 * juntarían a 0,09 del ancho, y el 6 % que exige `verify:embarcadero` sale
 * exactamente con 32°. El local ocupa la mitad del alto, que es un plano medio.
 */
export const POSE_PANORAMICA: Pose = {
  posicion: { x: 0, y: 2.4, z: 9.0 },
  objetivo: { x: 30 * Math.sin((13 * Math.PI) / 180), y: 2.4 - 30 * Math.tan((4 * Math.PI) / 180), z: 9.0 - 30 * Math.cos((13 * Math.PI) / 180) },
  fov: 32,
};

/** Desde el aire, para el zarpe: la grúa sube hasta aquí mientras el cielo amanece. */
export const POSE_AEREA: Pose = {
  posicion: { x: 0, y: 46, z: 34 },
  objetivo: { x: 0, y: 0, z: -40 },
  fov: 44,
};

/** Entre qué aspectos se mezcla: por debajo es retrato puro, por encima panorámico puro. */
const ASPECTO_RETRATO = 0.5;
const ASPECTO_PANORAMICO = 1.6;

/** El 22 % del alto útil que el local nunca pierde sobre la hoja. */
export const MARGEN_SOBRE_LA_HOJA = 0.22;

/** Cuánto retrocede la cámara por cada ocupado más que el local. */
export const RETROCESO_POR_OCUPADO = 0.1;

/**
 * El encuadre ÚTIL para un amarre: hasta dónde puede proyectar su punto de pie
 * para que la figura quede dentro con la respiración de la cámara encima (la
 * órbita de ±3° mueve un punto lejano unos 0,16 del semiancho en retrato). Y la
 * separación mínima entre dos amarres en x proyectada: el 6 % del ancho de la
 * pantalla, o sea 0,12 en coordenadas de −1 a 1.
 */
export const BORDE_UTIL = 0.9;
export const SEPARACION_ENTRE_AMARRES = 0.12;

export const DURACION_DE_LA_LLEGADA = 0.8;
export const DURACION_DEL_ZARPE = 3.2;

/* ───────────────────────────── Aritmética de vectores ───────────────────────────── */

const suma = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const resta = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const por = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const punto = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cruz = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const largo = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
const unitario = (a: Vec3): Vec3 => {
  const l = largo(a);
  return l < 1e-9 ? { x: 0, y: 0, z: -1 } : por(a, 1 / l);
};
const mezcla = (a: number, b: number, t: number): number => a + (b - a) * t;
const mezcla3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: mezcla(a.x, b.x, t),
  y: mezcla(a.y, b.y, t),
  z: mezcla(a.z, b.z, t),
});
const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
const suave = (t: number): number => t * t * (3 - 2 * t);

export function mezclaDePoses(a: Pose, b: Pose, t: number): Pose {
  return {
    posicion: mezcla3(a.posicion, b.posicion, t),
    objetivo: mezcla3(a.objetivo, b.objetivo, t),
    fov: mezcla(a.fov, b.fov, t),
  };
}

export function easeInOutQuart(x: number): number {
  const t = pinza(x, 0, 1);
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

/* ───────────────────────────── La proyección a mano ───────────────────────────── */

/** Un punto del mundo en coordenadas normalizadas de pantalla (−1…1) para una pose y un aspecto. */
export function proyecta(
  pose: Pose,
  aspecto: number,
  p: Vec3,
): { readonly x: number; readonly y: number; readonly delante: boolean } {
  const frente = unitario(resta(pose.objetivo, pose.posicion));
  const arriba: Vec3 = { x: 0, y: 1, z: 0 };
  const derecha = unitario(cruz(frente, arriba));
  const alto = cruz(derecha, frente);
  const d = resta(p, pose.posicion);
  const xc = punto(d, derecha);
  const yc = punto(d, alto);
  const zc = punto(d, frente);
  if (zc <= 1e-6) return { x: 0, y: 0, delante: false };
  const medio = Math.tan((pose.fov * Math.PI) / 360);
  return { x: xc / zc / (medio * aspecto), y: yc / zc / medio, delante: true };
}

/* ───────────────────────────── El encuadre de reposo ───────────────────────────── */

/** La pose de reposo por aspecto y aforo, ANTES de la hoja. */
function poseBase(ocupados: number, aspecto: number): Pose {
  const t = suave(pinza((aspecto - ASPECTO_RETRATO) / (ASPECTO_PANORAMICO - ASPECTO_RETRATO), 0, 1));
  const base = mezclaDePoses(POSE_RETRATO, POSE_PANORAMICA, t);
  /*
   * Con más gente la cámara retrocede un poco por su eje, hasta medio metro con
   * los seis. Es poco a propósito: la cala se enciende amarre a amarre y el
   * encuadre no debe dar un salto cada vez que alguien se sienta. Fue 0,24 por
   * ocupado cuando el abanico no cabía; ahora el abanico está hecho para el cono
   * y el retroceso sólo da un respiro.
   */
  const extra = pinza(ocupados - 1, 0, 5) * RETROCESO_POR_OCUPADO;
  const eje = unitario(resta(base.posicion, base.objetivo));
  return { ...base, posicion: suma(base.posicion, por(eje, extra)) };
}

/** Dónde tiene que quedar el pie del local, en pantalla, para una franja. */
export function limiteDeLosPies(franjaInferior: number): number {
  const f = pinza(franjaInferior, 0, 0.8);
  return -1 + 2 * f + MARGEN_SOBRE_LA_HOJA * 2 * (1 - f);
}

/**
 * LA POSE OBJETIVO DE REPOSO: aspecto, aforo y hoja.
 *
 * `franjaInferior` baja el objetivo por bisección hasta que el pie del local (el
 * origen) queda en su límite. Veinticuatro pasos dejan un error de una millonésima
 * de unidad, que es nada.
 */
export function encuadre(ocupados: number, aspecto: number, franjaInferior: number): Pose {
  const base = poseBase(ocupados, aspecto);
  const limite = limiteDeLosPies(franjaInferior);
  const pies: Vec3 = { x: 0, y: 0, z: 0 };
  if (proyecta(base, aspecto, pies).y >= limite) return base;

  let alto = base.objetivo.y;
  let bajo = base.objetivo.y - 9;
  for (let i = 0; i < 24; i++) {
    const medio = (alto + bajo) / 2;
    const prueba: Pose = { ...base, objetivo: { ...base.objetivo, y: medio } };
    if (proyecta(prueba, aspecto, pies).y >= limite) bajo = medio;
    else alto = medio;
  }
  return { ...base, objetivo: { ...base.objetivo, y: bajo } };
}

/**
 * ¿QUEDA EL LOCAL ENTERO Y ENCIMA DE LA HOJA? Lo que comprueba el guion.
 *
 * Se proyectan los pies, la cabeza y los dos hombros del local (de pie en el
 * origen, de `alturaDelLocal` de alto y unos 0,9 u de ancho). Cabe si los pies
 * están por encima del límite, la cabeza dentro del encuadre y los hombros
 * también.
 */
export function mira(
  aspecto: number,
  franjaInferior: number,
  alturaDelLocal: number,
  ocupados = 1,
): { readonly cabe: boolean; readonly pies: number; readonly cabeza: number; readonly hombros: readonly [number, number] } {
  const pose = encuadre(ocupados, aspecto, franjaInferior);
  const pies = proyecta(pose, aspecto, { x: 0, y: 0, z: 0 });
  const cabeza = proyecta(pose, aspecto, { x: 0, y: alturaDelLocal, z: 0 });
  const izq = proyecta(pose, aspecto, { x: -0.45, y: alturaDelLocal * 0.8, z: 0 });
  const der = proyecta(pose, aspecto, { x: 0.45, y: alturaDelLocal * 0.8, z: 0 });
  const limite = limiteDeLosPies(franjaInferior);
  const cabe =
    pies.delante &&
    cabeza.delante &&
    pies.y >= limite - 1e-6 &&
    cabeza.y <= 0.97 &&
    Math.abs(izq.x) <= 0.97 &&
    Math.abs(der.x) <= 0.97;
  return { cabe, pies: pies.y, cabeza: cabeza.y, hombros: [izq.x, der.x] };
}

/* ───────────────────────────── La respiración ───────────────────────────── */

/**
 * ÓRBITA, ALTURA Y TRAVELLING con tres periodos que no se alcanzan (23, 11 y 40
 * s): el patrón no se repite en menos de una hora y media, que es lo que separa
 * una cámara viva de una cámara en bucle.
 */
export function respiracion(t: number): { readonly orbita: number; readonly altura: number; readonly avance: number } {
  return {
    orbita: (3 * Math.PI / 180) * Math.sin((2 * Math.PI * t) / 23),
    altura: 0.08 * Math.sin((2 * Math.PI * t) / 11),
    /* De 7,5 a 7,9: el centro está 0,2 más lejos que la pose y oscila ±0,2. */
    avance: 0.2 + 0.2 * Math.sin((2 * Math.PI * t) / 40),
  };
}

/** Aplica la respiración a una pose: gira alrededor del objetivo, sube y retrocede por el eje. */
export function conRespiracion(pose: Pose, t: number): Pose {
  const r = respiracion(t);
  const radio = resta(pose.posicion, pose.objetivo);
  const cos = Math.cos(r.orbita);
  const sin = Math.sin(r.orbita);
  const girado: Vec3 = { x: radio.x * cos + radio.z * sin, y: radio.y, z: -radio.x * sin + radio.z * cos };
  const eje = unitario(girado);
  const posicion = suma(suma(pose.objetivo, girado), suma(por(eje, r.avance), { x: 0, y: r.altura, z: 0 }));
  return { ...pose, posicion };
}

/* ───────────────────────────── Llegada y zarpe ───────────────────────────── */

/**
 * AL LLEGAR ALGUIEN: la cámara abre 1,5 u y gira 6° hacia su amarre, y vuelve.
 * `u` va de 0 a 1 en 0,8 s; el empujón es un seno para salir y volver sin golpe.
 */
export function poseDeLlegada(base: Pose, amarre: { readonly x: number; readonly z: number }, u: number): Pose {
  const empuje = Math.sin(Math.PI * pinza(u, 0, 1));
  const eje = unitario(resta(base.posicion, base.objetivo));
  const lado = Math.sign(amarre.x - base.objetivo.x) || 1;
  const giro = (6 * Math.PI / 180) * empuje * lado;
  const radio = resta(base.posicion, base.objetivo);
  const cos = Math.cos(giro);
  const sin = Math.sin(giro);
  const girado: Vec3 = { x: radio.x * cos + radio.z * sin, y: radio.y, z: -radio.x * sin + radio.z * cos };
  return {
    ...base,
    posicion: suma(suma(base.objetivo, girado), por(eje, 1.5 * empuje)),
  };
}

/** AL ZARPAR: la grúa sube de la pose de reposo a la aérea con `easeInOutQuart`; `u` en 0…1. */
export function poseDeZarpe(base: Pose, u: number): Pose {
  return mezclaDePoses(base, POSE_AEREA, easeInOutQuart(u));
}

/** El factor de un amortiguado exponencial independiente del fotograma: `1 − e^(−k·dt)`. */
export function amortiguado(dt: number, k: number): number {
  return 1 - Math.exp(-k * Math.max(0, dt));
}
