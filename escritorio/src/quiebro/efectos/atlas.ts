/**
 * EL ATLAS DE LA GRAFÍA EN LA GPU: los bytes de `grafia.ts` subidos como `DataTexture`.
 *
 * ═══ POR QUÉ UNA `DataTexture` Y NO UN PNG ═══
 *
 * Porque no hay PNG que valga: el alfabeto es de esta casa y se genera al cargar, en unos pocos
 * milisegundos, a partir de los dibujos. No hay fichero que descargar, ni licencia que acreditar, ni
 * decodificador de imágenes del que depender (el WebView de la app lo tendría, pero así no hace
 * falta preguntárselo). Es el mismo patrón que `escenas/embarcadero/particulas.ts`.
 *
 * ═══ FILTRADO: LINEAL CON MIPMAPS, Y POR QUÉ ═══
 *
 * El campo de distancia se lee con filtro lineal: es lo que convierte 8 píxeles por punto en un
 * borde nítido a 200 píxeles de alto. Los mipmaps hacen falta para el cielo, donde un glifo mide 6
 * píxeles y sin ellos centellea al moverse la cámara. Los sombreadores leen con `textureGrad` y las
 * derivadas de la coordenada CONTINUA (no de la fraccionaria), para que el salto de una celda a la
 * siguiente no elija el mipmap más pequeño y dibuje una raya en cada costura.
 *
 * Una sola textura para toda la página: `atlasDeLaGrafia()` la crea la primera vez y la devuelve
 * después. `soltarElAtlas()` libera su copia de la GPU al desmontar los efectos; la próxima que la
 * pida recibe el mismo objeto y three la vuelve a subir sola.
 */
import * as THREE from 'three';
import { pixelesDelAtlas } from './grafia';

let atlas: THREE.DataTexture | null = null;

/** La Grafía en una textura: R trazos, G puntos, B cobertura. Ver `grafia.ts`. */
export function atlasDeLaGrafia(): THREE.DataTexture {
  if (atlas !== null) return atlas;
  const { ancho, alto, datos } = pixelesDelAtlas();
  const t = new THREE.DataTexture(datos, ancho, alto, THREE.RGBAFormat, THREE.UnsignedByteType);
  /* Datos, no color: el campo de distancia no se pasa por la curva sRGB. */
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 1;
  t.name = 'grafia';
  t.needsUpdate = true;
  atlas = t;
  return t;
}

/** Suelta la copia de la GPU del atlas. Ver la cabecera. */
export function soltarElAtlas(): void {
  atlas?.dispose();
}
