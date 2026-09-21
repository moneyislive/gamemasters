/**
 * EL MUNDO DE PRUEBA Y EL PASEO QUE SE CORRE EN LOS DOS MOTORES.
 *
 * Vive aparte de `verificar-mundo.ts` por una razón concreta: el comprobador EMPAQUETA este
 * paseo con esbuild y lo ejecuta en Hermes. Si viviera dentro del comprobador, el paquete
 * arrastraría también sus efectos al cargarse —levantar Hermes, escribir temporales— y el
 * banco se lanzaría a sí mismo dentro de sí mismo. Un fichero sin efectos es lo que se puede
 * empaquetar.
 *
 * Por lo mismo, aquí NO se importa nada de `node:`: `--platform=neutral` lo rechazaría, y el
 * mensaje que sale cuando eso pasa se lee como «los motores no coinciden», que no es.
 */
import { por, UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, hayPiso, unPaso } from '../../shared/mecanicas/mundo';
import type { Andante, Casilla, Cuerpo, MundoDeclarado, Sitio } from '../../shared/mecanicas/mundo';

/** El lado de una losa de Las Lindes, en unidades del mundo. */
export const LADO = 175;
/** Piezas por losa: el peor caso medido de Las Lindes. */
export const PIEZAS_POR_LOSA = 42;
export const LOSAS_ANCHO = 9;
export const LOSAS_FONDO = 8;

export const PASOS = 40000;
export const RADIO = 0.4;
/** La velocidad de paseo de Las Lindes, que es la que se anda de verdad. */
export const VELOCIDAD = 26.4;

/**
 * El mundo de prueba se siembra con un generador entero propio y NO con `Math.random`: este
 * mundo se recorre en dos motores y se comparan las huellas, así que tiene que ser el mismo
 * mundo en los dos. Con azar sin semilla la comparación no compararía nada.
 */
export function mundoDePrueba(): MundoDeclarado {
  let semilla = 12345;
  const siguiente = (): number => {
    semilla = (Math.imul(semilla, 1103515245) + 12345) | 0;
    return (semilla >>> 8) / 16777216;
  };
  const pisables: Casilla[] = [];
  const cuerpos: Cuerpo[] = [];
  for (let y = 0; y < LOSAS_FONDO; y++) {
    for (let x = 0; x < LOSAS_ANCHO; x++) {
      pisables.push({ x, y });
      /*
       * Las piezas van DENTRO de su losa, y por eso el `- 0.5`: una casilla `i` ocupa
       * `[i·LADO − LADO/2, i·LADO + LADO/2]`, porque el índice se saca redondeando —es el
       * convenio que ya usa `hayLosaEn` en `paseo.ts` y se hereda a propósito—. Sin restar
       * medio lado, las piezas caen a caballo entre dos casillas y la mitad quedan fuera de
       * lo pisable, donde el paseante nunca las va a tocar.
       */
      for (let p = 0; p < PIEZAS_POR_LOSA; p++) {
        const px = x * LADO + (siguiente() - 0.5) * LADO;
        const pz = -y * LADO - (siguiente() - 0.5) * LADO;
        const w = 0.5 + siguiente() * 2;
        cuerpos.push({ x0: px, z0: pz, x1: px + w, z1: pz + w });
      }
    }
  }
  const nace: Sitio[] = [{ x: LADO / 2, z: -LADO / 2 }];
  return { lado: LADO, pisables, cuerpos, nace };
}

/**
 * Lo que devuelve un paseo: la huella y CON QUÉ se topó, contado por separado.
 *
 * Separar «me paró un cuerpo» de «me paró el borde» no es cosmética, y se vio rompiéndolo: con
 * un solo contador, dejar los cuerpos invisibles —vaciar el índice, poner el radio a cero—
 * seguía dando miles de paradas, porque el borde del tablero para igual. El suelo se quedaba
 * en verde con la mitad de la capa apagada.
 */
export interface Paseo {
  huella: number;
  /** Paradas en seco por tropezar con un cuerpo. */
  porCuerpo: number;
  /** Paradas en seco por llegar al borde de lo pisable. */
  porBorde: number;
  /** Pasos en los que sólo se pudo avanzar por un eje. */
  resbalados: number;
  /** Veces que acabó fuera de lo pisable. Tiene que ser cero. */
  fuera: number;
  x: number;
  z: number;
}

/**
 * OCHO RUMBOS, ESCRITOS Y NO CALCULADOS.
 *
 * Nada de seno ni coseno: son fracciones exactas del triángulo 3-4-5, así que el paso es
 * entero en los dos motores sin pasar por una trascendental. Ocho bastan para que el recorrido
 * cruce el tablero en diagonal y de canto, que es lo que hace falta para toparse con cosas.
 */
const RUMBOS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0.6, 0.8],
  [0, 1],
  [-0.6, 0.8],
  [-1, 0],
  [-0.6, -0.8],
  [0, -1],
  [0.6, -0.8],
];

/** Cada cuántos pasos se cambia de rumbo. 512 × 0,44 u ≈ 225 unidades: se cruzan losas. */
const PASOS_POR_TRAMO = 512;

/** El paseo. La misma función en proceso y dentro del paquete. */
export function pasear(): Paseo {
  const a = arenaDe(mundoDePrueba());
  const radio = Math.round(RADIO * UNO);
  const dt = Math.round(UNO / 60);
  /* Se nace en el CENTRO de una casilla, que es donde el convenio de redondeo la pone. */
  let quien: Andante = { x: 0, z: 0 };
  let rumbo = 0;
  let sorteo = 987654321;
  let vx = Math.round(VELOCIDAD * (RUMBOS[0] as readonly [number, number])[0] * UNO);
  let vz = Math.round(VELOCIDAD * (RUMBOS[0] as readonly [number, number])[1] * UNO);
  let h = 0;
  let porCuerpo = 0;
  let porBorde = 0;
  let resbalados = 0;
  let fuera = 0;
  for (let k = 0; k < PASOS; k++) {
    if (k % PASOS_POR_TRAMO === 0) {
      /* Un rumbo nuevo, sorteado con aritmética entera para que salga el mismo en los dos. */
      sorteo = (Math.imul(sorteo, 1103515245) + 12345) | 0;
      rumbo = (sorteo >>> 8) % RUMBOS.length;
      const r = RUMBOS[rumbo] as readonly [number, number];
      vx = Math.round(VELOCIDAD * r[0] * UNO);
      vz = Math.round(VELOCIDAD * r[1] * UNO);
    }
    const antes = quien;
    quien = unPaso(a, quien, vx, vz, dt, radio);
    const movioX = quien.x !== antes.x;
    const movioZ = quien.z !== antes.z;
    if (!movioX && !movioZ) {
      /*
       * QUÉ lo paró, no sólo QUE lo pararon. Si el destino no tenía piso, fue el borde; si lo
       * tenía, fue un cuerpo. Sin esta distinción el suelo del comprobador lo cumple el borde
       * él solo y los cuerpos pueden estar apagados enteros.
       */
      const destinoX = antes.x + por(vx, dt);
      const destinoZ = antes.z + por(vz, dt);
      if (hayPiso(a, destinoX, destinoZ)) porCuerpo++;
      else porBorde++;
    } else if (!movioX || !movioZ) resbalados++;
    if (!hayPiso(a, quien.x, quien.z)) fuera++;
    h = (h ^ quien.x) | 0;
    h = Math.imul(h, 2654435761) | 0;
    h = (h ^ (h >>> 15)) | 0;
    h = (h ^ quien.z) | 0;
    h = Math.imul(h, 2654435761) | 0;
    h = (h ^ (h >>> 15)) | 0;
  }
  return { huella: h >>> 0, porCuerpo, porBorde, resbalados, fuera, x: quien.x, z: quien.z };
}
