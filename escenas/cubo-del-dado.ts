/**
 * EL CUBO DEL DADO HECHO GEOMETRÍA: el respaldo procedimental con sus veintiún puntos, y
 * el cuaternión que pone cada valor mirando arriba. Con `three`, sin React.
 *
 * ═══ POR QUÉ HAY UN RESPALDO, Y POR QUÉ ESTÁ AQUÍ Y NO DENTRO DE `delta.tsx` ═══
 *
 * `Dados` pinta el D6 de KayKit horneado (`escenas/modelos/dados.glb`, `MODELO.dado`) si
 * el catálogo lo trae, y ESTO si no: un despliegue sin `dados.glb`, un 404, un fichero
 * roto. Sin respaldo la mesa se quedaría sin dados sin un error en ninguna consola, que
 * es el fallo silencioso de siempre. Y está suelto, como las geometrías de `tablon.ts`,
 * porque lo que se pinta tiene que poder CONTARSE: `TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS`
 * promete 444 para los dos y `verify:escena` los construye con el `three` de verdad y
 * cuenta los índices.
 *
 * ═══ LOS PUNTOS VAN EN LAS MISMAS CARAS QUE EN EL PACK, Y ESO NO ES ADORNO ═══
 *
 * Cada valor se pinta en la cara que dice `CARA_DEL_VALOR` (`caras-del-dado.ts`, medido
 * sobre el D6 del pack al compilar). Así el cuaternión objetivo de un valor es EL MISMO
 * para el modelo y para el respaldo, y quien pinta no tiene dos tablas de caras que puedan
 * discrepar: si el pack no llega, el dado sigue enseñando el número que salió.
 */
import * as THREE from 'three';
import { CARA_DEL_VALOR, NORMAL_DEL_VALOR } from './caras-del-dado';
import type { CaraDelDado, ValorDelDado } from './caras-del-dado';
import { PUNTO_DEL_DADO } from './dados';

/** Cuántos lados tiene cada punto del respaldo. Diez: a 4 puntos de pantalla se lee redondo. */
export const SEGMENTOS_DEL_PUNTO = 10;
/** A qué fracción de la arista, desde el centro de la cara, caen los puntos de las esquinas. */
export const PASO_DE_LOS_PUNTOS = 0.27;
/** Cuánto se separan los puntos de la cara para no pelear la profundidad con ella, en aristas. */
export const PUNTO_SOBRE_LA_CARA = 0.004;

/** Los seis valores, para recorrerlos sin escribir `[1, 2, 3, 4, 5, 6]` en cada sitio. */
export const VALORES_DEL_DADO: readonly ValorDelDado[] = [1, 2, 3, 4, 5, 6];

/**
 * DÓNDE VAN LOS PUNTOS DE CADA VALOR, en el plano de su cara: `u` y `v` en {−1, 0, 1}, a
 * multiplicar por `PASO_DE_LOS_PUNTOS · arista`. Es la disposición de cualquier dado: el
 * 1 en el centro, el 2 y el 3 en diagonal, el 4 y el 5 en las esquinas, el 6 en dos
 * columnas de tres.
 */
export const PUNTOS_DEL_VALOR: Readonly<Record<ValorDelDado, ReadonlyArray<readonly [number, number]>>> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, 1], [-1, 1], [1, -1]],
  5: [[-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0]],
  6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
};

/** La normal de una cara del modelo, como vector de `three`. */
export function normalDeLaCara(cara: CaraDelDado): THREE.Vector3 {
  const signo = cara[0] === '+' ? 1 : -1;
  const eje = cara[1];
  return new THREE.Vector3(eje === 'x' ? signo : 0, eje === 'y' ? signo : 0, eje === 'z' ? signo : 0);
}

/** EL CUERPO DEL RESPALDO: una caja de `arista`, doce triángulos. */
export function geometriaDelCuerpoDelDado(arista: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(arista, arista, arista);
}

/**
 * LOS VEINTIÚN PUNTOS DEL RESPALDO, fundidos en UNA geometría → una llamada por dado.
 *
 * Cada punto es un disco de `SEGMENTOS_DEL_PUNTO` lados con diámetro `PUNTO_DEL_DADO ·
 * arista`, tumbado sobre su cara (girado para que su normal sea la de la cara) y un pelo
 * por fuera de ella. Se funden a mano, como las sombras de `tablon.ts`, porque son
 * abanicos y `mergeGeometries` vive en `three/examples`, que la app no carga. Son
 * `21 · SEGMENTOS_DEL_PUNTO` triángulos: 210 con diez lados.
 */
export function geometriaDeLosPuntosDelDado(arista: number): THREE.BufferGeometry {
  const radio = (PUNTO_DEL_DADO * arista) / 2;
  const paso = PASO_DE_LOS_PUNTOS * arista;
  const porDisco = SEGMENTOS_DEL_PUNTO + 1;
  const discos = VALORES_DEL_DADO.reduce((n, v) => n + v, 0);
  const posiciones = new Float32Array(discos * porDisco * 3);
  const normales = new Float32Array(discos * porDisco * 3);
  const indices = new Uint16Array(discos * SEGMENTOS_DEL_PUNTO * 3);
  const arriba = new THREE.Vector3(0, 0, 1);
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  let disco = 0;
  for (const valor of VALORES_DEL_DADO) {
    const normal = normalDeLaCara(CARA_DEL_VALOR[valor]);
    /* Del plano XY, donde nace el disco, a la cara: la normal +z va a la de la cara. */
    q.setFromUnitVectors(arriba, normal);
    const centroDeLaCara = normal.clone().multiplyScalar(arista / 2 + PUNTO_SOBRE_LA_CARA * arista);
    for (const [u, v] of PUNTOS_DEL_VALOR[valor]) {
      const base = disco * porDisco;
      for (let k = 0; k < porDisco; k++) {
        const angulo = ((k - 1) / SEGMENTOS_DEL_PUNTO) * Math.PI * 2;
        const enElBorde = k > 0;
        p.set(u * paso + (enElBorde ? Math.cos(angulo) * radio : 0), v * paso + (enElBorde ? Math.sin(angulo) * radio : 0), 0);
        p.applyQuaternion(q).add(centroDeLaCara);
        const i = (base + k) * 3;
        posiciones[i] = p.x;
        posiciones[i + 1] = p.y;
        posiciones[i + 2] = p.z;
        normales[i] = normal.x;
        normales[i + 1] = normal.y;
        normales[i + 2] = normal.z;
      }
      for (let t = 0; t < SEGMENTOS_DEL_PUNTO; t++) {
        const i = (disco * SEGMENTOS_DEL_PUNTO + t) * 3;
        indices[i] = base;
        indices[i + 1] = base + 1 + t;
        indices[i + 2] = base + 1 + ((t + 1) % SEGMENTOS_DEL_PUNTO);
      }
      disco++;
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geometria.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
  geometria.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometria;
}

/**
 * EL CUATERNIÓN QUE ENSEÑA UN VALOR: lleva la normal de su cara (en el espacio del
 * modelo, `NORMAL_DEL_VALOR`) a la vertical del mundo, y después gira `giro` radianes
 * alrededor de esa vertical, que es el grado de libertad que el valor no fija. Vale para
 * el D6 del pack y para el respaldo porque los dos ponen cada valor en la misma cara.
 */
export function cuaternionDelValor(valor: ValorDelDado, giro: number, destino = new THREE.Quaternion()): THREE.Quaternion {
  const normal = new THREE.Vector3(...NORMAL_DEL_VALOR[valor]);
  destino.setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));
  const alrededor = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro);
  return destino.premultiply(alrededor);
}

/**
 * QUÉ VALOR MIRA ARRIBA con un cuaternión dado: la cara cuya normal, girada, queda más
 * cerca de +Y. Es lo que `verify:escena` pregunta después de `cuaternionDelValor` para
 * afirmar que la ida y la vuelta cuadran en los seis valores.
 */
export function valorQueMiraArriba(cuaternion: THREE.Quaternion): ValorDelDado {
  let mejor: ValorDelDado = 1;
  let masAlto = -Infinity;
  for (const valor of VALORES_DEL_DADO) {
    const y = new THREE.Vector3(...NORMAL_DEL_VALOR[valor]).applyQuaternion(cuaternion).y;
    if (y > masAlto) {
      masAlto = y;
      mejor = valor;
    }
  }
  return mejor;
}
