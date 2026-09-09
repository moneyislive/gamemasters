/**
 * LA CÁMARA DEL BURGO: alcance, mirador de salida, topes de cercanía, y «seguir al que
 * mueve». Sin `three`.
 *
 * ═══ SE COMPONE, NO SE COPIA (decisión 14) ═══
 *
 * `escenas/camara.ts` dice desde dónde se mira (rumbo y altura, siempre a la misma
 * distancia) y `escenas/acercar.ts` cuánto se acerca y adónde. Las dos llevan las
 * constantes del delta dentro, y las dos aceptan las de otro tablero POR PARÁMETRO
 * (`factorValido(f, limites)`, `acercando(c, pasos, limites)`, `pellizcando(c, e, s,
 * limites)`, `ojoYMira(c, alcance, ojo, alturaMinima)`). Aquí están las del Burgo, y las
 * funciones de este fichero son las composiciones que los dos clientes llaman en su
 * `useFrame`: el escritorio con `CamaraAerea`, la app con `usarMiradorTactil`. Ninguna
 * constante de `camara.ts` ni de `acercar.ts` se toca.
 *
 * ═══ LAS CIFRAS, Y DE DÓNDE SALEN ═══
 *
 *   · `ALCANCE_DEL_BURGO = 66`: `MEDIO_LADO 50 × 1,32`. Con `LEJANIA` de `camara.ts` el
 *     ojo queda a 117 del centro en 16:9 y las cuatro esquinas del anillo (±50, ±50) caen
 *     dentro del lienzo; `verify:burgo-escena` lo proyecta con `proyecta` de
 *     `embarcadero/camara.ts` en 16:9, 3:4 y 9:19,5 (éste con el lienzo al 58 % del alto,
 *     que es lo que la app le da) con `franjaInferior 0`.
 *   · `MIRADOR_DEL_BURGO`: rumbo 0,35 (desde el sur, algo al este: el lado 1–9 es el más
 *     cercano y lleva los edificios bajos, ver `anillo-en-3d.ts`) y 55° de altura, más
 *     alto que los 40° del delta porque hay que LEER las aceras de color.
 *   · `LIMITES_DEL_BURGO`: `masCerca 0,15` (66 × 0,15 ≈ 10: una casilla y sus vecinas
 *     llenando el lienzo; a esa cercanía una casilla ocupa más del 45 % del alto, medido)
 *     y `masLejos 1,25`, el de siempre.
 *   · `ALTURA_MINIMA_DEL_OJO_DEL_BURGO = 12`: la de siempre; `torre-b` mide 13,6 pero es
 *     delgada y está en el canto.
 *   · `CERCANIA_DE_SEGUIMIENTO 0,42` al que mueve; `CERCANIA_DE_ALMONEDA 0,5` a la casilla.
 *
 * ═══ SEGUIR AL QUE MUEVE ═══
 *
 * Al empezar un `mueve` la cercanía objetivo pasa a `{ factor: 0,42, centro: el aventurero }`
 * y `seguir` la persigue con `amortiguado(dt, 3)` hasta que acaba el salto; 1,2 s después
 * (`REPOSO_TRAS_SEGUIR`) vuelve a la que tenía el usuario. Cualquier gesto del usuario
 * durante el seguimiento lo cancela para ese recorrido; eso lo decide el cliente, aquí
 * sólo está la persecución.
 */
import { LEJANIA, PROPORCION_DE_REFERENCIA, alejarseParaQueQuepa, ojoDelMirador } from '../camara';
import type { Mirador } from '../camara';
import { CERCANIA_DE_SALIDA, acotadoAlTablero, factorValido, ojoYMira } from '../acercar';
import type { Cercania, LimitesDeCercania } from '../acercar';
import { amortiguado } from '../embarcadero/camara';
import type { Pose } from '../embarcadero/camara';
import type { Ventana } from '../embarcadero/tipos';
import { MEDIO_LADO } from './anillo-en-3d';

/** El radio del mundo que se encuadra: medio lado por 1,32. */
export const ALCANCE_DEL_BURGO = MEDIO_LADO * 1.32;

/** Más alto que el delta (40°): hay que leer las aceras. El rumbo es sólo el punto de partida. */
export const MIRADOR_DEL_BURGO: Mirador = { rumbo: 0.35, altura: (55 * Math.PI) / 180 };

/** 66 × 0,15 ≈ 10: una casilla y sus vecinas llenando el lienzo. */
export const LIMITES_DEL_BURGO: LimitesDeCercania = { masCerca: 0.15, masLejos: 1.25 };

/** La de siempre: torre-b mide 13,6 pero es delgada. */
export const ALTURA_MINIMA_DEL_OJO_DEL_BURGO = 12;

export const CERCANIA_DE_SEGUIMIENTO = 0.42;
export const CERCANIA_DE_ALMONEDA = 0.5;

/** Cuánto se espera tras el salto antes de devolver la cámara a lo que tenía el usuario. */
export const REPOSO_TRAS_SEGUIR = 1.2;
/** La constante del amortiguado de `seguir`. */
export const AMORTIGUACION_DEL_SEGUIMIENTO = 3;

/** El campo vertical con el que montan el `Canvas` los dos clientes. Va aquí para que el comprobador use el mismo. */
export const CAMPO_DE_LA_CAMARA = 45;

/** Al abrir, la cámara nace sobre la Puerta Mayor a 0,5 y en `APERTURA` segundos se abre a la pose de salida. */
export const CERCANIA_DE_NACIMIENTO: Cercania = { factor: 0.5, centro: { x: MEDIO_LADO * 0.865, z: MEDIO_LADO * 0.865 } };
export const APERTURA = 1.4;

/** La proporción con la que la cámara encuadra una ventana: ancho / alto, o la de referencia si no hay medida. */
export function proporcionDe(ventana: Ventana): number {
  if (!(ventana.ancho > 0) || !(ventana.alto > 0)) return PROPORCION_DE_REFERENCIA;
  return ventana.ancho / ventana.alto;
}

/**
 * LA POSE DE SALIDA: el anillo entero.
 *
 * ═══ EN RETRATO BASTA EL CENTRO; EN APAISADO HAY QUE RETIRARSE Y CORRER LA MIRADA ═══
 *
 * En retrato, `alejarseParaQueQuepa` (dentro de `ojoDelMirador`) ya retira el ojo lo que
 * hace falta para que el ancho del mundo sea el de un monitor, y el anillo cabe con
 * factor 1 mirando al centro (medido: la peor esquina queda a 0,80 del semialto en 9:19,5
 * con el lienzo al 58 %). En 16:9 no: a 55° de altura y 45° de campo, la esquina más
 * cercana a la cámara se sale por abajo (a −1,58). Barrido en Node con `proyecta`: con el
 * alcance de 66 la salida cabe si el ojo se retira un 20 % (factor 1,2, por debajo de
 * `masLejos`) Y la mirada se corre 16 unidades hacia el lado de la cámara, que sube el
 * anillo en el encuadre; así la peor esquina queda a 0,85. Entre 1:1 y 16:9 se mezcla
 * linealmente, para que girar una tableta no dé un salto. `verify:burgo-escena` proyecta
 * las cuatro esquinas en las tres ventanas con esta misma función.
 */
export const RETIRO_EN_APAISADO = 0.2;
export const CORRIMIENTO_EN_APAISADO = 16;

export function poseDeSalida(ventana: Ventana): Cercania {
  const proporcion = proporcionDe(ventana);
  const t = Math.min(1, Math.max(0, (proporcion - 1) / (PROPORCION_DE_REFERENCIA - 1)));
  if (t === 0) return CERCANIA_DE_SALIDA;
  const s = CORRIMIENTO_EN_APAISADO * t;
  return {
    factor: factorValido(1 + RETIRO_EN_APAISADO * t, LIMITES_DEL_BURGO),
    centro: { x: Math.sin(MIRADOR_DEL_BURGO.rumbo) * s, z: Math.cos(MIRADOR_DEL_BURGO.rumbo) * s },
  };
}

/**
 * SEGUIR AL QUE MUEVE: la cercanía se acerca a `{ 0,42, objetivo }` con un amortiguado
 * exponencial independiente del fotograma. El objetivo se acota al tablero, como hace
 * `arrastrandoLaMirada`.
 */
export function seguir(actual: Cercania, objetivo: { x: number; z: number }, dt: number): Cercania {
  return hacia(actual, { factor: CERCANIA_DE_SEGUIMIENTO, centro: acotadoAlTablero(objetivo, ALCANCE_DEL_BURGO) }, dt);
}

/** Ir hacia una cercanía cualquiera con el mismo amortiguado. Es lo que usa `seguir` y lo que usa la vuelta. */
export function hacia(actual: Cercania, objetivo: Cercania, dt: number): Cercania {
  const k = amortiguado(dt, AMORTIGUACION_DEL_SEGUIMIENTO);
  const factor = factorValido(actual.factor + (objetivo.factor - actual.factor) * k, LIMITES_DEL_BURGO);
  return {
    factor,
    centro: {
      x: actual.centro.x + (objetivo.centro.x - actual.centro.x) * k,
      z: actual.centro.z + (objetivo.centro.z - actual.centro.z) * k,
    },
  };
}

/** La cercanía de la almoneda: la casilla a 0,5. */
export function cercaniaDeAlmoneda(casilla: { x: number; z: number }): Cercania {
  return { factor: CERCANIA_DE_ALMONEDA, centro: acotadoAlTablero(casilla, ALCANCE_DEL_BURGO) };
}

/**
 * DÓNDE VA EL OJO Y ADÓNDE MIRA, ya compuesto: es EXACTAMENTE lo que hacen los dos
 * clientes en su `useFrame` —`ojoYMira(cercania, ALCANCE_DEL_BURGO, (d) =>
 * ojoDelMirador(mirador, d, proporcion), ALTURA_MINIMA_DEL_OJO_DEL_BURGO)`—, escrito una
 * vez para que el comprobador proyecte con la misma cuenta. Devuelve una `Pose` de
 * `embarcadero/camara.ts` para poder llamar a `proyecta`.
 */
export function poseDelBurgo(cercania: Cercania, mirador: Mirador, ventana: Ventana): Pose {
  const proporcion = proporcionDe(ventana);
  const { ojo, mira } = ojoYMira(cercania, ALCANCE_DEL_BURGO, (d) => ojoDelMirador(mirador, d, proporcion), ALTURA_MINIMA_DEL_OJO_DEL_BURGO);
  return {
    posicion: { x: ojo[0], y: ojo[1], z: ojo[2] },
    objetivo: { x: mira[0], y: mira[1], z: mira[2] },
    fov: CAMPO_DE_LA_CAMARA,
  };
}

/** Lo lejos que queda el ojo del centro en la pose de salida, para una proporción: `alcance × LEJANIA × alejarse`. */
export function distanciaDeSalida(proporcion: number): number {
  return ALCANCE_DEL_BURGO * LEJANIA * alejarseParaQueQuepa(proporcion);
}
