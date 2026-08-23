/**
 * Texturas empotradas en un GLB, en un motor sin navegador.
 *
 * EL PROBLEMA, comprobado en el código de three y no supuesto. Cuando un GLB
 * trae las imágenes dentro del binario —que es lo que devuelve Tripo con
 * `texture: true`— `GLTFLoader` hace esto:
 *
 *   1. Saca los bytes de la imagen del `bufferView`.
 *   2. Construye un `Blob` y llama a `URL.createObjectURL(blob)`.
 *   3. Se lo pasa a `THREE.TextureLoader`, que por dentro crea un `<img>`.
 *
 * Ninguna de las tres cosas existe en React Native: no hay `Blob` con URL de
 * objeto, no hay DOM y no hay decodificador de PNG ni de JPEG. La carga entera
 * revienta, y como revienta la carga NO SE VE NI LA GEOMETRÍA — que sí se
 * abriría perfectamente. El síntoma es un hueco, idéntico al de un fichero que
 * falta, y por eso costó tanto: se buscó en el disco del servidor durante días.
 *
 * (Y no vale el atajo de `manager.addHandler`: `GLTFLoader` solo consulta los
 * manejadores cuando la imagen tiene `uri`, y las empotradas no lo tienen.)
 *
 * LO QUE HACE ESTE COMPLEMENTO. `three` pregunta a sus complementos antes de
 * usar su propio cargador, así que aquí se responde con una textura lisa y la
 * carga sigue adelante. El personaje aparece con su forma y sus colores base
 * —que Tripo también escribe en el material— en vez de no aparecer.
 *
 * ES UNA DEGRADACIÓN Y SE DICE COMO TAL. Un modelo sin su textura pintada no es
 * lo prometido; es lo que se puede enseñar hoy en un teléfono. La solución
 * completa pasa por servir la textura como fichero aparte y cargarla con el
 * puente de imágenes de Expo, y eso es un trabajo con su propio diseño.
 */
import * as THREE from 'three';
import type { GLTFLoaderPlugin, GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Una textura de un píxel, blanca.
 *
 * Blanca y no gris a propósito: en un material la textura MULTIPLICA al color
 * base, así que el blanco lo deja intacto y el modelo sale con los colores que
 * Tripo escribió. Cualquier otro tono los ensuciaría todos por igual.
 *
 * Se crea una sola vez y se comparte: hay una llamada por textura del modelo, y
 * son varias.
 */
let lisa: THREE.DataTexture | undefined;
function texturaLisa(): THREE.DataTexture {
  if (lisa) return lisa;
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.needsUpdate = true;
  lisa = t;
  return t;
}

/** ¿Puede este motor decodificar una imagen empotrada? */
export function decodificaImagenes(): boolean {
  return (
    typeof URL !== 'undefined' &&
    typeof (URL as { createObjectURL?: unknown }).createObjectURL === 'function' &&
    typeof document !== 'undefined'
  );
}

/**
 * El complemento. Se registra solo donde hace falta: en un navegador estorbaría,
 * porque ahí las texturas de verdad SÍ se cargan y esto las sustituiría por
 * nada.
 */
export function texturasLisas(_parser: GLTFParser): GLTFLoaderPlugin {
  return {
    name: 'HARKANIA_texturas_lisas',
    loadTexture(): Promise<THREE.Texture> {
      return Promise.resolve(texturaLisa());
    },
  };
}
