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
 *   · `ALCANCE_DEL_BURGO = 570,24`: `MEDIO_LADO 432 × 1,32`. Con `LEJANIA` de `camara.ts` el
 *     ojo queda lo bastante lejos para que las cuatro esquinas del anillo (±432, ±432) caigan
 *     dentro del lienzo; `verify:burgo-escena` lo proyecta con `proyecta` de
 *     `embarcadero/camara.ts` en 16:9, 3:4 y 9:19,5 (éste con el lienzo al 58 % del alto,
 *     que es lo que la app le da) con `franjaInferior 0`.
 *   · `MIRADOR_DEL_BURGO`: rumbo 0,35 (desde el sur, algo al este: el lado 1–9 es el más
 *     cercano y lleva los edificios bajos, ver `anillo-en-3d.ts`) y 55° de altura, más
 *     alto que los 40° del delta porque hay que LEER las aceras de color.
 *   · `LIMITES_DEL_BURGO`: `masCerca 0,15` (570,24 × 0,15 = 85,54: una casilla y sus vecinas
 *     llenando el lienzo; a esa cercanía una casilla ocupa más del 45 % del alto, medido)
 *     y `masLejos 1,25`, el de siempre.
 *
 *     EL 0,15 NO SE HA TOCADO AL TRIPLICAR EL TABLERO, y ésa es la prueba de que las cifras
 *     de este fichero están bien escritas: `fondo de casilla / (alcance × masCerca)` valía
 *     48 / 38,02 y ahora vale 108 / 85,54 — el mismo 1,26. Lo mismo el dígito del precio, que
 *     se ve exactamente igual de grande porque 27/570,24 = 12/253,44. Todo lo que aquí es una
 *     FRACCIÓN del tablero sobrevive solo a un cambio de escala; lo que estuviera escrito en
 *     unidades, no —y de eso este fichero ya tuvo un caso, el corrimiento en apaisado—.
 *   · `ALTURA_MINIMA_DEL_OJO_DEL_BURGO = 12`: la de siempre; lo más alto del anillo es un
 *     `cuerpo-h` de 17,7, pero a `masCerca` el ojo queda por encima de 70.
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
import { amortiguado, proyecta } from '../embarcadero/camara';
import type { Pose } from '../embarcadero/camara';
import type { Ventana } from '../embarcadero/tipos';
import { BORDE_INTERIOR, CASILLAS, MEDIO_LADO, marcoDeCasilla } from './anillo-en-3d';
import type { RectanguloEnPuntos } from './bandeja-de-los-dados';

/** El radio del mundo que se encuadra: medio lado por 1,32. */
export const ALCANCE_DEL_BURGO = MEDIO_LADO * 1.32;

/** Más alto que el delta (40°): hay que leer las aceras. El rumbo es sólo el punto de partida. */
export const MIRADOR_DEL_BURGO: Mirador = { rumbo: 0.35, altura: (55 * Math.PI) / 180 };

/** 570,24 × 0,15 = 85,54: una casilla y sus vecinas llenando el lienzo, igual que antes (ver la cabecera). */
export const LIMITES_DEL_BURGO: LimitesDeCercania = { masCerca: 0.15, masLejos: 1.25 };

/** La de siempre: lo más alto del anillo mide 17,7 y a `masCerca` el ojo queda por encima de 70. */
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
 * factor 1 mirando al centro. En 16:9 no: a 55° de altura y 45° de campo, la esquina más
 * cercana a la cámara se sale por abajo. Barrido en Node con `proyecta`: la salida cabe si
 * el ojo se retira un 20 % (factor 1,2, por debajo de `masLejos`) Y la mirada se corre hacia
 * el lado de la cámara, que sube el anillo en el encuadre. Entre 1:1 y 16:9 se mezcla
 * linealmente, para que girar una tableta no dé un salto. `verify:burgo-escena` proyecta
 * las cuatro esquinas en las tres ventanas con esta misma función.
 *
 * ═══ EL CORRIMIENTO SE MIDE EN TABLEROS, NO EN UNIDADES ═══
 *
 * Era 16, escrito a pelo cuando el tablero medía 100 de lado. Al pasar a 384 esas dieciséis
 * unidades dejaron de significar nada —el 4 % de lo que significaban— y la esquina más
 * cercana volvió a salirse por abajo (medido: −1,12 en 16:9). Así que se declara como
 * fracción del tablero: `MEDIO_LADO × 0,32`, que daba EXACTAMENTE 16 con el tablero de 100,
 * 61,44 con el de 384 y 138,24 con el de 864. Un número escrito así no se queda atrás cuando
 * el tablero crece, y ésta es la tercera escala en la que aguanta sin tocarlo.
 */
export const RETIRO_EN_APAISADO = 0.2;
export const FRACCION_DEL_CORRIMIENTO = 0.32;
export const CORRIMIENTO_EN_APAISADO = MEDIO_LADO * FRACCION_DEL_CORRIMIENTO;

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

/**
 * ═══ LA POSE DE SALIDA AL LADO DE LA CAJA DEL BURGO ═══
 *
 * La caja del Burgo va pegada a una esquina del lienzo, y desde que es grande —la mitad del ancho en el
 * escritorio— la pose de salida dejaba detrás de ella la esquina de SALIDA y cuatro casillas: medido,
 * en 1.600 × 900 las casillas 0, 1, 2, 3 y 39, que es donde empiezan todos los peones, y un clic ahí
 * se lo quedaba la caja. Con la caja de antes, ninguna.
 *
 * Así que la pose de salida se corre lo justo para que ninguna casilla quede detrás: de cada una se
 * miran tres puntos —el canto de dentro, el de la marcha y el canto de fuera— y ninguno puede caer en el
 * rectángulo de la caja (con `AIRE_ALREDEDOR_DE_LA_CAJA` de aire), y las cuatro esquinas del anillo
 * tienen que seguir en el lienzo. Se prueba primero correr la mirada de lado —el anillo se va al hueco
 * libre y no encoge—, después subirlo o bajarlo, y sólo al final alejar el ojo, que es lo que más
 * cuesta porque el anillo se ve más pequeño. Si la de siempre ya no esconde nada, se devuelve tal cual:
 * en un móvil en vertical la caja va arriba sin tapar casillas, y ahí no se mueve nada.
 */
export const AIRE_ALREDEDOR_DE_LA_CAJA = 8;

/** ¿Deja esta cercanía todas las casillas fuera de la caja y, si se pide, las cuatro esquinas del anillo en el lienzo? */
export function elAnilloSeVeJuntoALaCaja(cercania: Cercania, ventana: Ventana, caja: RectanguloEnPuntos, conLasEsquinas: boolean): boolean {
  const { ancho, alto } = ventana;
  if (!(ancho > 0 && alto > 0)) return false;
  const pose = poseDelBurgo(cercania, MIRADOR_DEL_BURGO, ventana);
  const aspecto = ancho / alto;
  const enElLienzo = (x: number, z: number): { readonly x: number; readonly y: number } | null => {
    const p = proyecta(pose, aspecto, { x, y: 0, z });
    return p.delante ? { x: ((p.x + 1) / 2) * ancho, y: ((1 - p.y) / 2) * alto } : null;
  };
  if (conLasEsquinas) {
    for (const [x, z] of [[MEDIO_LADO, MEDIO_LADO], [-MEDIO_LADO, MEDIO_LADO], [-MEDIO_LADO, -MEDIO_LADO], [MEDIO_LADO, -MEDIO_LADO]] as const) {
      const q = enElLienzo(x, z);
      if (q === null || q.x < 0 || q.x > ancho || q.y < 0 || q.y > alto) return false;
    }
  }
  const aire = AIRE_ALREDEDOR_DE_LA_CAJA;
  for (let i = 0; i < CASILLAS; i++) {
    const m = marcoDeCasilla(i);
    const hondo = m.fuera.x * m.centro.x + m.fuera.z * m.centro.z;
    for (const k of [BORDE_INTERIOR - hondo, 0, MEDIO_LADO - hondo]) {
      const q = enElLienzo(m.centro.x + m.fuera.x * k, m.centro.z + m.fuera.z * k);
      if (q !== null && q.x >= caja.x0 - aire && q.x <= caja.x1 + aire && q.y >= caja.y0 - aire && q.y <= caja.y1 + aire) return false;
    }
  }
  return true;
}

export function poseDeSalidaAlLadoDeLaCaja(ventana: Ventana, caja: RectanguloEnPuntos | null): Cercania {
  const base = poseDeSalida(ventana);
  if (caja === null || !Number.isFinite(caja.x0) || !(ventana.ancho > 0 && ventana.alto > 0)) return base;
  if (elAnilloSeVeJuntoALaCaja(base, ventana, caja, false)) return base;
  /* La derecha de la pantalla, en el suelo: correr la mirada hacia ella lleva el anillo a la izquierda. */
  const pose = poseDelBurgo(base, MIRADOR_DEL_BURGO, ventana);
  const frente = { x: pose.objetivo.x - pose.posicion.x, z: pose.objetivo.z - pose.posicion.z };
  const largo = Math.hypot(frente.x, frente.z) || 1;
  const derecha = { x: -frente.z / largo, z: frente.x / largo };
  const haciaElOjo = { x: -frente.x / largo, z: -frente.z / largo };
  const candidatas: { readonly cercania: Cercania; readonly coste: number }[] = [];
  for (let lado = -30; lado <= 30; lado++) {
    for (let arriba = -15; arriba <= 15; arriba++) {
      for (const retiro of [0, 0.05]) {
        const l = (lado / 50) * MEDIO_LADO;
        const s = (arriba / 50) * MEDIO_LADO;
        candidatas.push({
          cercania: { factor: factorValido(base.factor + retiro, LIMITES_DEL_BURGO), centro: { x: base.centro.x + derecha.x * l + haciaElOjo.x * s, z: base.centro.z + derecha.z * l + haciaElOjo.z * s } },
          coste: Math.abs(lado) + 1.5 * Math.abs(arriba) + 200 * retiro,
        });
      }
    }
  }
  candidatas.sort((a, b) => a.coste - b.coste);
  for (const c of candidatas) if (elAnilloSeVeJuntoALaCaja(c.cercania, ventana, caja, true)) return c.cercania;
  return base;
}

/** Lo lejos que queda el ojo del centro en la pose de salida, para una proporción: `alcance × LEJANIA × alejarse`. */
export function distanciaDeSalida(proporcion: number): number {
  return ALCANCE_DEL_BURGO * LEJANIA * alejarseParaQueQuepa(proporcion);
}
