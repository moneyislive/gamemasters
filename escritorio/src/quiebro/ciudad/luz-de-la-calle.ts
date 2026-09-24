/**
 * LA LUZ DE LA CALLE, HORNEADA: un mapa visto desde arriba con lo que ilumina el suelo cada farola,
 * cada neón y cada escaparate. Y el mapa de alturas del suelo, para lo que tiene que posarse en él.
 *
 * ═══ POR QUÉ HORNEADA ═══
 *
 * Un barrio tiene unas cien farolas. Cien luces puntuales reales son cien iteraciones por píxel en
 * cada sombreador de three, y ningún teléfono lo aguanta; tres o cuatro sí (y ésas, en N2+, las pone
 * `atmosfera/luz.ts` junto a la cámara, para el brillo y las sombras). El resto del charco de luz
 * naranja bajo cada farola —lo que hace que la calle se lea de noche— no se mueve nunca: se calcula
 * una vez al construir la ciudad, en un mapa de medio punto flotante, y cada material lo lee con una
 * sola muestra (`luzDeLaCalleQ` en `glsl.ts`). Las fachadas lo leen también, un metro por delante del
 * muro y apagándose con la altura: así el bajo de un edificio junto a una farola se ilumina.
 *
 * Canal `a`: las farolas, en escalar (su color es el del sodio, `uColorDeSodio`), para que el Apagón
 * las apague con un uniforme sin rehornear. Canales `rgb`: todo lo demás, con su color.
 *
 * Irradiancia de una fuente puntual a altura `h` sobre un punto del suelo a distancia horizontal `r`:
 * E = I·h / (r² + h²)^(3/2) (ley del cuadrado y coseno de incidencia).
 *
 * Sin WebGL: sólo arrays. El comprobador lo corre en Node (mira que no haya NaN).
 */
import * as THREE from 'three';
import type { CajaXZ } from './tipos';
import { ALTURA_DE_LA_ACERA } from './tipos';

/** Una fuente de luz que se hornea. */
export interface FuenteHorneada {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Intensidad (irradiancia justo debajo ≈ intensidad / altura²). */
  readonly intensidad: number;
  /** `null` = farola (canal de sodio); si no, su color lineal. */
  readonly color: readonly [number, number, number] | null;
  /** Hasta dónde llega, en metros. */
  readonly alcance: number;
  /** Si es de fachada: la normal hacia fuera; la luz no pasa hacia dentro. */
  readonly haciaFuera?: readonly [number, number];
}

export interface LuzHorneada {
  readonly datos: Float32Array;
  readonly lado: number;
  readonly caja: CajaXZ;
}

/** Cuántos téxeles por lado. 1024 sobre ~300 m son ~0,3 m por téxel. */
export const TEXELES_DE_LA_LUZ = 1024;

export function hornearLaLuz(fuentes: readonly FuenteHorneada[], caja: CajaXZ, lado = TEXELES_DE_LA_LUZ): LuzHorneada {
  const datos = new Float32Array(lado * lado * 4);
  const ancho = caja.x1 - caja.x0;
  const fondo = caja.z1 - caja.z0;
  const px = ancho / lado;
  const pz = fondo / lado;
  for (const f of fuentes) {
    const i0 = Math.max(0, Math.floor((f.x - f.alcance - caja.x0) / px));
    const i1 = Math.min(lado - 1, Math.ceil((f.x + f.alcance - caja.x0) / px));
    const k0 = Math.max(0, Math.floor((f.z - f.alcance - caja.z0) / pz));
    const k1 = Math.min(lado - 1, Math.ceil((f.z + f.alcance - caja.z0) / pz));
    const h = Math.max(0.3, f.y - ALTURA_DE_LA_ACERA * 0.5);
    const a2 = f.alcance * f.alcance;
    for (let k = k0; k <= k1; k++) {
      const z = caja.z0 + (k + 0.5) * pz;
      const dz = z - f.z;
      for (let i = i0; i <= i1; i++) {
        const x = caja.x0 + (i + 0.5) * px;
        const dx = x - f.x;
        const r2 = dx * dx + dz * dz;
        if (r2 > a2) continue;
        if (f.haciaFuera !== undefined && dx * f.haciaFuera[0] + dz * f.haciaFuera[1] < -0.2) continue;
        /* Se apaga suave al llegar al alcance, para que no se vea el borde del disco. */
        const borde = 1 - r2 / a2;
        const e = ((f.intensidad * h) / Math.pow(r2 + h * h, 1.5)) * borde * borde;
        const j = (k * lado + i) * 4;
        if (f.color === null) {
          datos[j + 3] = (datos[j + 3] as number) + e;
        } else {
          datos[j] = (datos[j] as number) + e * f.color[0];
          datos[j + 1] = (datos[j + 1] as number) + e * f.color[1];
          datos[j + 2] = (datos[j + 2] as number) + e * f.color[2];
        }
      }
    }
  }
  return { datos, lado, caja };
}

/** La textura de media precisión para la GPU. */
export function texturaDeLaLuz(luz: LuzHorneada): THREE.DataTexture {
  const medios = new Uint16Array(luz.datos.length);
  for (let i = 0; i < luz.datos.length; i++) medios[i] = THREE.DataUtils.toHalfFloat(Math.min(60000, luz.datos[i] as number));
  const t = new THREE.DataTexture(medios, luz.lado, luz.lado, THREE.RGBAFormat, THREE.HalfFloatType);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  t.needsUpdate = true;
  return t;
}

/** La caja del mapa en el formato del uniforme: (x0, z0, 1/ancho, 1/fondo). */
export function uniformeDeLaCaja(caja: CajaXZ): THREE.Vector4 {
  return new THREE.Vector4(caja.x0, caja.z0, 1 / (caja.x1 - caja.x0), 1 / (caja.z1 - caja.z0));
}

/* ─────────────────────────── El mapa de alturas del suelo ─────────────────────────── */

/**
 * A qué altura está el suelo en cada punto: 0 en la calzada, la del bordillo en las islas. Lo leen
 * las tarjetas de reflejo y las salpicaduras de la lluvia para posarse encima (una tarjeta a cota 0
 * bajo una acera no se vería). Un byte por metro basta: el bordillo va por las líneas de las islas.
 */
export interface MapaDeAlturas {
  readonly datos: Uint8Array;
  readonly lado: number;
  readonly caja: CajaXZ;
}

export function mapaDeAlturas(islas: readonly CajaXZ[], caja: CajaXZ, porMetro = 2): MapaDeAlturas {
  const lado = Math.ceil(Math.max(caja.x1 - caja.x0, caja.z1 - caja.z0) * porMetro);
  const datos = new Uint8Array(lado * lado);
  const px = (caja.x1 - caja.x0) / lado;
  const pz = (caja.z1 - caja.z0) / lado;
  for (const s of islas) {
    const i0 = Math.max(0, Math.ceil((s.x0 - caja.x0) / px - 0.5));
    const i1 = Math.min(lado - 1, Math.floor((s.x1 - caja.x0) / px - 0.5));
    const k0 = Math.max(0, Math.ceil((s.z0 - caja.z0) / pz - 0.5));
    const k1 = Math.min(lado - 1, Math.floor((s.z1 - caja.z0) / pz - 0.5));
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) datos[k * lado + i] = 255;
  }
  return { datos, lado, caja };
}

export function texturaDeAlturas(m: MapaDeAlturas): THREE.DataTexture {
  const t = new THREE.DataTexture(m.datos, m.lado, m.lado, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  /* Un byte por téxel: las filas no son múltiplo de 4 bytes, y con la alineación de fábrica la
     textura sale cizallada en diagonal sin ningún error. */
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}
