/**
 * EL RÓTULO CON EL NOMBRE DE QUIEN ANDA: una placa encima de la cabeza, que se lee desde el hombro.
 *
 * ═══ POR QUÉ TRIÁNGULOS Y NO UNA TEXTURA ═══
 *
 * Lo obvio es pintar el nombre en un `<canvas>` y pegarlo en un sprite. En la app no se puede: en
 * React Native no hay `document`, y un rótulo que sale en el escritorio y vacío en el teléfono es
 * exactamente el fallo que esta casa no admite (ningún juego sólo para PC). Así que el nombre se
 * compone con el ALFABETO DEL TABLERO —`CONTORNOS_DE_LA_LETRA` en `escenas/iconos.ts`, sacado de un
 * tipo de letra de verdad al compilar—, que es lo mismo con lo que el Burgo escribe los nombres de
 * sus casillas y no pide nada del navegador. Una placa oscura detrás, una tesela del color del
 * asiento delante del nombre, y todo en UNA geometría con el color por vértice: una llamada de
 * dibujo por persona, se llame como se llame.
 *
 * (El Burgo tiene su propia `geometriaDeUnaLetra` en `burgo/ciudad-en-3d.ts`, agarrada por el
 * centro de su avance y metida en una ciudad entera. Ésta agarra por el origen del glifo, que es
 * lo que pide componer un nombre, y no arrastra el Burgo a Las Lindes. Si un día se juntan, ésta es
 * la que no sabe de ningún juego.)
 *
 * ═══ LO QUE NO TIENE DIBUJO ═══
 *
 * El alfabeto son mayúsculas, eñe, vocales con tilde y diéresis, cifras y unos pocos signos. Un
 * nombre se escribe en mayúsculas; una letra con un acento que no está —`À`, `Ç`, `Ö`— se escribe
 * sin él; un espacio es un hueco; y lo demás —un emoji, un guion bajo— no se escribe. Si no queda
 * nada, sale una interrogación: una placa vacía encima de alguien se lee como un fallo.
 *
 * ═══ Y SE LEE DESDE EL HOMBRO, A LA DISTANCIA QUE SEA ═══
 *
 * La placa no es un objeto del mundo sino un cartel, y tiene que ocupar lo mismo en la pantalla esté
 * quien la lleva al lado o a cien metros: la misma cuenta que `tallaDeUnaMarca` en `escala.ts`,
 * acotada por arriba y por abajo (`altoDelRotulo`). Con `PARTE_DE_LA_PANTALLA` una mayúscula son
 * 12,8 puntos en un lienzo de 400 de alto —el del teléfono con la hoja abajo— y 28,8 en uno de 900.
 * `verify:canal-del-paseo` lo mide de 5 a 450 unidades de la cámara.
 */
import * as THREE from 'three';
import { ALTURA_DE_UNA_PERSONA } from '../escala';
import { ALTO_DE_LA_LETRA, AVANCE_DE_LA_LETRA, CONTORNOS_DE_LA_LETRA, ORIGEN_DE_LA_LETRA } from '../iconos';

/** Lo que ocupa una mayúscula del rótulo en la pantalla, en fracción de su alto. */
export const PARTE_DE_LA_PANTALLA = 0.032;

/** Lo más pequeña y lo más grande que se hace una mayúscula en el mundo, en unidades. */
export const ALTO_MINIMO_DEL_ROTULO = 0.12;
export const ALTO_MAXIMO_DEL_ROTULO = 12;

/** Cuántas letras se escriben como mucho: un nombre de la mesa, no una frase. */
export const LETRAS_DEL_ROTULO = 20;

/** A qué altura sobre los pies va el canto de abajo de la placa: un pelo por encima de la cabeza. */
export const ALTURA_DEL_ROTULO = ALTURA_DE_UNA_PERSONA * 1.1;

/** El hueco de un espacio, en mayúsculas. */
const HUECO_DE_UN_ESPACIO = 0.4;

/** El relleno de la placa alrededor del nombre, en mayúsculas. */
const MARGEN_A_LOS_LADOS = 0.5;
const MARGEN_ARRIBA_Y_ABAJO = 0.4;

/** La tesela del color del asiento: una mayúscula de lado, y su hueco hasta el nombre. */
const LADO_DE_LA_TESELA = 1;
const HUECO_TRAS_LA_TESELA = 0.35;

/** Lo que se adelanta el nombre sobre la placa, para que la gane en la profundidad. */
const DELANTE_DE_LA_PLACA = 0.02;

/** La placa y la tinta: las mismas de las cámaras y los carteles de encima del valle. */
export const COLOR_DE_LA_PLACA = '#1b2411';
export const COLOR_DE_LA_TINTA = '#f3ecd8';

/** Las letras con acento que el alfabeto no trae, a la suya sin acento. */
const SIN_ACENTO: Readonly<Record<string, string>> = {
  À: 'A', Â: 'A', Ä: 'A', Ã: 'A', Å: 'A',
  È: 'E', Ê: 'E', Ë: 'E',
  Ì: 'I', Î: 'I', Ï: 'I',
  Ò: 'O', Ô: 'O', Ö: 'O', Õ: 'O', Ø: 'O',
  Ù: 'U', Û: 'U',
  Ç: 'C', Ý: 'Y', Ÿ: 'Y',
};

/** ¿Tiene dibujo este carácter? */
function tieneDibujo(c: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONTORNOS_DE_LA_LETRA, c);
}

/**
 * LO QUE SE ESCRIBE DE UN NOMBRE, carácter a carácter: `' '` es un hueco. Ver la cabecera.
 *
 * Se recorre con `for…of` y no por índice para no partir en dos lo que no cabe en una unidad de
 * UTF-16 —un emoji son dos—, que saldría como dos caracteres raros en vez de ninguno.
 */
export function letrasDelRotulo(nombre: string): string[] {
  const salida: string[] = [];
  for (const c of nombre.toUpperCase()) {
    if (salida.length >= LETRAS_DEL_ROTULO) break;
    if (tieneDibujo(c)) salida.push(c);
    else if (SIN_ACENTO[c] !== undefined && tieneDibujo(SIN_ACENTO[c] as string)) salida.push(SIN_ACENTO[c] as string);
    else if (/\s/.test(c) && salida.length > 0 && salida[salida.length - 1] !== ' ') salida.push(' ');
  }
  while (salida.length > 0 && salida[salida.length - 1] === ' ') salida.pop();
  return salida.length > 0 ? salida : ['?'];
}

/** Lo que avanza un carácter, en mayúsculas. */
function avanceDe(c: string): number {
  if (c === ' ') return HUECO_DE_UN_ESPACIO;
  return (AVANCE_DE_LA_LETRA[c] ?? ALTO_DE_LA_LETRA / 2) / ALTO_DE_LA_LETRA;
}

/**
 * EL ALTO DE UNA MAYÚSCULA, en unidades del mundo, a esta distancia de la cámara.
 *
 * `campo` es el campo vertical de la cámara en radianes. A distancia `d` la pantalla abarca
 * `2·d·tan(campo/2)` de alto; se pide `PARTE_DE_LA_PANTALLA` de eso, entre los dos topes. Con datos
 * imposibles, el mínimo: un rótulo pequeño se sigue viendo, uno de tamaño `NaN` desaparece.
 */
export function altoDelRotulo(distancia: number, campo: number): number {
  if (!Number.isFinite(distancia) || !Number.isFinite(campo) || distancia <= 0 || campo <= 0) return ALTO_MINIMO_DEL_ROTULO;
  const quiere = 2 * distancia * Math.tan(campo / 2) * PARTE_DE_LA_PANTALLA;
  if (!Number.isFinite(quiere)) return ALTO_MINIMO_DEL_ROTULO;
  return Math.min(ALTO_MAXIMO_DEL_ROTULO, Math.max(ALTO_MINIMO_DEL_ROTULO, quiere));
}

/** Los triángulos de una letra, en mayúsculas desde su origen: listos para copiarse en la placa. */
interface Glifo {
  readonly posiciones: Float32Array;
  readonly indices: readonly number[];
}

/* Una letra se triangula una vez por proceso: el mismo alfabeto sirve a todos los nombres. */
const GLIFOS = new Map<string, Glifo | null>();

/**
 * LOS TRIÁNGULOS DE UNA LETRA, agarrada por su origen sobre la línea de base y con la mayúscula de
 * alto uno. La vuelta en `y` y el giro de los triángulos son los de `formas.ts`: en el lienzo del
 * icono la `y` crece hacia abajo, y al reflejar hay que invertir cada triángulo o se ve por detrás.
 */
function glifoDe(letra: string): Glifo | null {
  const hecho = GLIFOS.get(letra);
  if (hecho !== undefined) return hecho;
  const contornos = CONTORNOS_DE_LA_LETRA[letra];
  let glifo: Glifo | null = null;
  if (contornos !== undefined) {
    const camino = new THREE.ShapePath();
    for (const tira of contornos) {
      if (tira.length < 6) continue;
      camino.moveTo(tira[0] as number, tira[1] as number);
      for (let i = 2; i + 1 < tira.length; i += 2) camino.lineTo(tira[i] as number, tira[i + 1] as number);
    }
    const formas = camino.subPaths.length === 0 ? [] : camino.toShapes();
    if (formas.length > 0) {
      const g = new THREE.ShapeGeometry(formas);
      g.scale(1, -1, 1);
      g.translate(-ORIGEN_DE_LA_LETRA.x, ORIGEN_DE_LA_LETRA.y, 0);
      g.scale(1 / ALTO_DE_LA_LETRA, 1 / ALTO_DE_LA_LETRA, 1);
      const posicion = g.getAttribute('position') as THREE.BufferAttribute | undefined;
      const indice = g.getIndex();
      if (posicion !== undefined && posicion.count > 0) {
        const indices: number[] = [];
        if (indice !== null) {
          for (let i = 0; i + 2 < indice.count; i += 3) indices.push(indice.getX(i + 2), indice.getX(i + 1), indice.getX(i));
        } else {
          for (let i = 0; i + 2 < posicion.count; i += 3) indices.push(i + 2, i + 1, i);
        }
        glifo = { posiciones: Float32Array.from(posicion.array as ArrayLike<number>), indices };
      }
      g.dispose();
    }
  }
  GLIFOS.set(letra, glifo);
  return glifo;
}

/** Lo que se va juntando para la geometría del rótulo. */
interface Montaje {
  readonly posiciones: number[];
  readonly colores: number[];
  readonly indices: number[];
}

function anadirRectangulo(m: Montaje, x0: number, y0: number, x1: number, y1: number, z: number, color: THREE.Color): void {
  const base = m.posiciones.length / 3;
  m.posiciones.push(x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z);
  for (let i = 0; i < 4; i++) m.colores.push(color.r, color.g, color.b);
  /* En sentido contrario a las agujas mirando desde +z: la cara de delante mira a la cámara. */
  m.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function anadirGlifo(m: Montaje, glifo: Glifo, dx: number, dy: number, z: number, color: THREE.Color): void {
  const base = m.posiciones.length / 3;
  const p = glifo.posiciones;
  for (let i = 0; i + 2 < p.length; i += 3) {
    m.posiciones.push((p[i] as number) + dx, (p[i + 1] as number) + dy, z);
    m.colores.push(color.r, color.g, color.b);
  }
  for (const k of glifo.indices) m.indices.push(base + k);
}

/** El ancho de un nombre ya escrito, en mayúsculas. */
export function anchoDelNombre(letras: readonly string[]): number {
  let ancho = 0;
  for (const c of letras) ancho += avanceDe(c);
  return ancho;
}

/**
 * LA PLACA DE UN NOMBRE, en mayúsculas de alto uno: centrada a lo ancho, con el canto de abajo en
 * el cero y la cara hacia `+z`. Quien la pinta la escala con `altoDelRotulo` y la gira con la
 * cámara. `null` sólo si ni la interrogación tuviera dibujo.
 */
export function geometriaDelRotulo(nombre: string, color: string): THREE.BufferGeometry | null {
  const letras = letrasDelRotulo(nombre);
  const anchoDelTexto = anchoDelNombre(letras);
  const ancho = LADO_DE_LA_TESELA + HUECO_TRAS_LA_TESELA + anchoDelTexto;
  const izquierda = -ancho / 2;
  const abajo = MARGEN_ARRIBA_Y_ABAJO;
  const m: Montaje = { posiciones: [], colores: [], indices: [] };

  const placa = new THREE.Color(COLOR_DE_LA_PLACA);
  const tinta = new THREE.Color(COLOR_DE_LA_TINTA);
  /* `THREE.Color` con un color que no entiende avisa y se queda en blanco: se mira antes. */
  const suyo = new THREE.Color(/^#[0-9a-f]{6}$/i.test(color) ? color : COLOR_DE_LA_TINTA);

  anadirRectangulo(
    m,
    izquierda - MARGEN_A_LOS_LADOS,
    0,
    izquierda + ancho + MARGEN_A_LOS_LADOS,
    abajo + 1 + MARGEN_ARRIBA_Y_ABAJO,
    0,
    placa,
  );
  anadirRectangulo(m, izquierda, abajo, izquierda + LADO_DE_LA_TESELA, abajo + LADO_DE_LA_TESELA, DELANTE_DE_LA_PLACA, suyo);

  let x = izquierda + LADO_DE_LA_TESELA + HUECO_TRAS_LA_TESELA;
  let letrasPuestas = 0;
  for (const c of letras) {
    const glifo = c === ' ' ? null : glifoDe(c);
    if (glifo !== null) {
      anadirGlifo(m, glifo, x, abajo, DELANTE_DE_LA_PLACA, tinta);
      letrasPuestas++;
    }
    x += avanceDe(c);
  }
  if (letrasPuestas === 0) return null;

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(m.posiciones, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(m.colores, 3));
  g.setIndex(m.indices);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/** Lo que mide la placa, en mayúsculas: para que quien la pinte sepa dónde acaba. */
export function altoDeLaPlaca(): number {
  return 1 + MARGEN_ARRIBA_Y_ABAJO * 2;
}
