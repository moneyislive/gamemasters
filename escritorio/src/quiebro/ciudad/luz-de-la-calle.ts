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
  for (const f of fuentes) hornearUnaFuente(f, caja, lado, datos);
  return { datos, lado, caja };
}

/**
 * HORNEA UNA FUENTE en un mapa de `lado × lado` téxeles que cubre `caja`, sumando a `datos`. Devuelve los
 * téxeles que ha mirado: es la medida del trabajo con la que la luz por losetas (`losetas.ts`) reparte el
 * horneado entre fotogramas.
 */
export function hornearUnaFuente(f: FuenteHorneada, caja: CajaXZ, lado: number, datos: Float32Array): number {
  const px = (caja.x1 - caja.x0) / lado;
  const pz = (caja.z1 - caja.z0) / lado;
  const i0 = Math.max(0, Math.floor((f.x - f.alcance - caja.x0) / px));
  const i1 = Math.min(lado - 1, Math.ceil((f.x + f.alcance - caja.x0) / px));
  const k0 = Math.max(0, Math.floor((f.z - f.alcance - caja.z0) / pz));
  const k1 = Math.min(lado - 1, Math.ceil((f.z + f.alcance - caja.z0) / pz));
  if (i1 < i0 || k1 < k0) return 0;
  const h = Math.max(0.3, f.y - ALTURA_DE_LA_ACERA * 0.5);
  const h2 = h * h;
  const ih = f.intensidad * h;
  const a2 = f.alcance * f.alcance;
  const inversoA2 = 1 / a2;
  const fuera = f.haciaFuera;
  const color = f.color;
  let mirados = 0;
  /*
   * Fila a fila, y en cada fila sólo el tramo que cae dentro del disco (el resto no suma nada): es lo mismo
   * que recorrer el cuadrado entero, en tres cuartos del trabajo. `s·√s` es `s^1,5` sin `Math.pow`, que era
   * la mitad del coste de la luz por losetas.
   */
  for (let k = k0; k <= k1; k++) {
    const z = caja.z0 + (k + 0.5) * pz;
    const dz = z - f.z;
    const dz2 = dz * dz;
    if (dz2 > a2) continue;
    const w = Math.sqrt(a2 - dz2);
    const desde = Math.max(i0, Math.ceil((f.x - w - caja.x0) / px - 0.5));
    const hasta = Math.min(i1, Math.floor((f.x + w - caja.x0) / px - 0.5));
    mirados += Math.max(0, hasta - desde + 1);
    for (let i = desde; i <= hasta; i++) {
      const x = caja.x0 + (i + 0.5) * px;
      const dx = x - f.x;
      const r2 = dx * dx + dz2;
      if (r2 > a2) continue;
      if (fuera !== undefined && dx * fuera[0] + dz * fuera[1] < -0.2) continue;
      /* Se apaga suave al llegar al alcance, para que no se vea el borde del disco. */
      const borde = 1 - r2 * inversoA2;
      const s = r2 + h2;
      const e = (ih / (s * Math.sqrt(s))) * borde * borde;
      const j = (k * lado + i) * 4;
      if (color === null) {
        datos[j + 3] = (datos[j + 3] as number) + e;
      } else {
        datos[j] = (datos[j] as number) + e * color[0];
        datos[j + 1] = (datos[j + 1] as number) + e * color[1];
        datos[j + 2] = (datos[j + 2] as number) + e * color[2];
      }
    }
  }
  return mirados;
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

/* ─────────────────────────── La oclusión del suelo ─────────────────────────── */

/**
 * Algo que le tapa el cielo al suelo de alrededor: un edificio, un coche aparcado, un banco, el pie de
 * una farola. `fuerza` es cuánto oscurece pegado a su canto (0-1), `alcance` hasta dónde llega (m) y
 * `debajo` cuánta luz queda justo debajo (lo que se ve bajo un coche o un banco).
 */
export interface Oclusor {
  readonly caja: CajaXZ;
  readonly fuerza: number;
  readonly alcance: number;
  readonly debajo: number;
}

/**
 * LA OCLUSIÓN DEL SUELO, HORNEADA: cuánto cielo y cuánta calle le llegan a cada trozo de acera y de
 * calzada (255 todo, 0 nada). El pie de una fachada, el hueco bajo un coche o un banco y el de una
 * farola se oscurecen: son las sombras de contacto que una ciudad tiene siempre, con cualquier luz, y
 * sin las que todo parecía posado encima del suelo en vez de estar en él. Misma caja y mismo paso que
 * el mapa de alturas (dos téxeles por metro), así que el suelo los lee con la misma cuenta.
 */
export function mapaDeOclusion(oclusores: readonly Oclusor[], caja: CajaXZ, porMetro = 2): MapaDeAlturas {
  const g = mapaDeOclusionAPasos(oclusores, caja, porMetro);
  for (;;) {
    const r = g.next();
    if (r.done === true) return r.value;
  }
}

/** Los téxeles que mira cada paso de `mapaDeOclusionAPasos` (unos 3-4 ms de PC). */
const TEXELES_DE_OCLUSION_POR_PASO = 400_000;

/**
 * El mismo mapa A PASOS: los mismos oclusores en el mismo orden (el resultado es el mismo byte a byte), con
 * una pausa cada vez que lo mirado pasa de `TEXELES_DE_OCLUSION_POR_PASO`. La ciudad de 540 m son unos 25 ms
 * de PC de una vez: con la base de la noche construida a pasos (`abierta.ts`), no para el juego.
 */
export function* mapaDeOclusionAPasos(oclusores: readonly Oclusor[], caja: CajaXZ, porMetro = 2): Generator<void, MapaDeAlturas, void> {
  const lado = Math.ceil(Math.max(caja.x1 - caja.x0, caja.z1 - caja.z0) * porMetro);
  const luz = new Float32Array(lado * lado).fill(1);
  const px = (caja.x1 - caja.x0) / lado;
  const pz = (caja.z1 - caja.z0) / lado;
  let mirados = 0;
  for (const o of oclusores) {
    const c = o.caja;
    const i0 = Math.max(0, Math.floor((c.x0 - o.alcance - caja.x0) / px));
    const i1 = Math.min(lado - 1, Math.ceil((c.x1 + o.alcance - caja.x0) / px));
    const k0 = Math.max(0, Math.floor((c.z0 - o.alcance - caja.z0) / pz));
    const k1 = Math.min(lado - 1, Math.ceil((c.z1 + o.alcance - caja.z0) / pz));
    mirados += Math.max(0, i1 - i0 + 1) * Math.max(0, k1 - k0 + 1);
    if (mirados > TEXELES_DE_OCLUSION_POR_PASO) {
      mirados = 0;
      yield;
    }
    for (let k = k0; k <= k1; k++) {
      const z = caja.z0 + (k + 0.5) * pz;
      const dz = Math.max(c.z0 - z, 0, z - c.z1);
      for (let i = i0; i <= i1; i++) {
        const x = caja.x0 + (i + 0.5) * px;
        const dx = Math.max(c.x0 - x, 0, x - c.x1);
        const d = Math.hypot(dx, dz);
        let queda: number;
        if (d <= 0) queda = o.debajo;
        else if (d >= o.alcance) continue;
        else {
          const t = 1 - d / o.alcance;
          queda = 1 - o.fuerza * t * t;
        }
        const j = k * lado + i;
        luz[j] = (luz[j] as number) * queda;
      }
    }
  }
  const datos = new Uint8Array(lado * lado);
  for (let j = 0; j < datos.length; j++) datos[j] = Math.round(Math.min(1, Math.max(0, luz[j] as number)) * 255);
  return { datos, lado, caja };
}

/** La oclusión del suelo para la GPU: un byte por téxel, con filtro (sus bordes son suaves). */
export function texturaDeOclusion(m: MapaDeAlturas): THREE.DataTexture {
  const t = texturaDeAlturas(m);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  return t;
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
