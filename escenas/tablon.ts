/**
 * LA MESA HECHA GEOMETRÍA: la tapa con su veta por vértice, las sombras de contacto
 * fundidas en una pieza y el tapete del turno. Con `three`, sin React.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ DENTRO DE `delta.tsx` ═══
 *
 * Porque lo que se pinta tiene que poder CONTARSE. `triangulosDeLaMesa(segmentos)` en
 * `presupuesto-del-delta.ts` promete `12 · segmentos + 590` y `TOPE_DE_LA_MESA` lo frena;
 * si las geometrías se construyeran dentro del componente, el comprobador sólo podría
 * repetir la cuenta de cabeza y afirmar que dos números escritos a mano coinciden. Aquí
 * están sueltas: `verify:escena` las construye con el `three` de verdad, cuenta los
 * índices y compara con la promesa. El componente llama a ESTAS funciones —lo afirma el
 * comprobador sobre su texto— y por tanto pinta exactamente lo que se ha contado.
 *
 * ═══ POR QUÉ COLOR POR VÉRTICE Y NO UNA TEXTURA NI UN SOMBREADOR ═══
 *
 * Es la decisión 6 de `docs/LA-MESA-DE-RIBERAS.md`: el móvil no carga PNG
 * (`app/src/tres/texturas-nativas.ts`) y un `ShaderMaterial` propio no lo ilumina nadie
 * —habría que rehacer las tres luces y la tapa se vería con otra luz que las piezas de
 * al lado—. `COLOR_0` con un `MeshStandardMaterial` blanco es lo que ya hace el
 * embarcadero, y la veta que lo llena (`escenas/mesa.ts`) se mide en Node.
 */
import * as THREE from 'three';
import { aLineal, coloresDeLaMadera, mezcla, vetaDelTablon } from './mesa';
import type { ColorEnBytes } from './mesa';

/** Cuántos lados tiene cada disco de sombra. Veinte: a esta escala se lee redondo. */
export const SEGMENTOS_DE_LA_SOMBRA = 20;
/**
 * EL ALFA DE LA SOMBRA EN SU CENTRO; en el borde es cero. 0,35 es lo que hace que un
 * posavasos al 92 % se lea apoyado y no pegado, sin manchar la veta alrededor.
 */
export const ALFA_DE_LA_SOMBRA = 0.35;
/**
 * EL RADIO DE LA SOMBRA, en lados del hueco: doce centésimas más que el zócalo (0,5), que
 * es lo que asoma por fuera y se ve. Una sombra del radio exacto del zócalo quedaría
 * entera debajo de él y no haría nada.
 */
export const RADIO_DE_LA_SOMBRA = 0.62;
/** A cuánto sobre la tapa se tumban las sombras y el tapete, para no pelear la profundidad. */
export const SOBRE_LA_TAPA = 0.002;
/** La rugosidad de la madera: mate, como la de las cajas del pack. */
export const RUGOSIDAD_DE_LA_MADERA = 0.8;
/** Cuánto del ancho del hueco de los dados cubre el tapete, y cuánto de fondo, en lados. */
export const FONDO_DEL_TAPETE = 0.8;
/** La transparencia del tapete: el 55 % deja ver la veta y se lee como el color del colono. */
export const OPACIDAD_DEL_TAPETE = 0.55;

/** Los dos colores de la madera ya en lineal, listos para el atributo `color`. */
export interface MaderaEnLineal {
  oscura: readonly [number, number, number];
  clara: readonly [number, number, number];
}

export function maderaEnLineal(
  colores: { oscura: ColorEnBytes; clara: ColorEnBytes } = coloresDeLaMadera(),
): MaderaEnLineal {
  return { oscura: aLineal(colores.oscura), clara: aLineal(colores.clara) };
}

/**
 * LA TAPA: un `PlaneGeometry` de `segmentos × filas` TUMBADO (normal hacia arriba), con
 * la veta escrita en el atributo `color` en lineal.
 *
 * `PlaneGeometry` nace de pie en XY y recorre sus vértices fila a fila desde ARRIBA; girado
 * −90° sobre X, la fila 0 (`y = +fondo/2`) cae en `z = −fondo/2`, o sea la más LEJANA de la
 * cámara. Así la `y` de la veta (`j / filas`) crece hacia la cámara, que es el dominio
 * escrito en `mesa.ts`, y el orden de los vértices es exactamente el de `vetaDelTablon`.
 * Son `2 · segmentos · filas` triángulos, sin canto: el frente queda fuera del lienzo.
 */
export function geometriaDeLaTapa(
  segmentos: number,
  filas: number,
  ancho: number,
  fondo: number,
  madera: MaderaEnLineal = maderaEnLineal(),
): THREE.BufferGeometry {
  const geometria = new THREE.PlaneGeometry(ancho, fondo, segmentos, filas);
  geometria.rotateX(-Math.PI / 2);
  const veta = vetaDelTablon(segmentos, filas);
  const colores = new Float32Array(veta.length * 3);
  for (let k = 0; k < veta.length; k++) {
    const [r, g, b] = mezcla(madera.oscura, madera.clara, veta[k] ?? 0);
    colores[k * 3] = r;
    colores[k * 3 + 1] = g;
    colores[k * 3 + 2] = b;
  }
  geometria.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  return geometria;
}

/**
 * LAS SOMBRAS DE CONTACTO: un disco por centro, negro, con el alfa EN EL VÉRTICE (0,35 en
 * el centro, 0 en el borde), todos fundidos en UNA geometría → una llamada.
 *
 * `three` lee un atributo `color` de CUATRO componentes como color más alfa por vértice
 * (`USE_COLOR_ALPHA`), y con eso el degradado del disco no cuesta ni textura ni
 * sombreador. Se funden a mano y no con `mergeGeometries` porque son abanicos de veinte
 * triángulos y la fusión a mano son diez líneas que no dependen de
 * `three/examples`, que la app no ha cargado nunca. Los centros vienen en el plano de la
 * tapa (`x`, `z`); la `y` la pone quien coloca la malla, a `SOBRE_LA_TAPA` de la cota.
 * Son `segmentos` triángulos por disco.
 */
export function geometriaDeLasSombras(
  centros: ReadonlyArray<{ x: number; z: number; radio: number }>,
  segmentos = SEGMENTOS_DE_LA_SOMBRA,
  alfaEnElCentro = ALFA_DE_LA_SOMBRA,
): THREE.BufferGeometry {
  const porDisco = segmentos + 1;
  const posiciones = new Float32Array(centros.length * porDisco * 3);
  const normales = new Float32Array(centros.length * porDisco * 3);
  const colores = new Float32Array(centros.length * porDisco * 4);
  const indices = new Uint16Array(centros.length * segmentos * 3);
  centros.forEach((c, d) => {
    const base = d * porDisco;
    for (let v = 0; v < porDisco; v++) {
      const k = base + v;
      const angulo = ((v - 1) / segmentos) * Math.PI * 2;
      const enElBorde = v > 0;
      posiciones[k * 3] = c.x + (enElBorde ? Math.cos(angulo) * c.radio : 0);
      posiciones[k * 3 + 1] = 0;
      posiciones[k * 3 + 2] = c.z + (enElBorde ? Math.sin(angulo) * c.radio : 0);
      normales[k * 3 + 1] = 1;
      colores[k * 4 + 3] = enElBorde ? 0 : alfaEnElCentro;
    }
    for (let t = 0; t < segmentos; t++) {
      const i = (d * segmentos + t) * 3;
      const a = base + 1 + t;
      const b = base + 1 + ((t + 1) % segmentos);
      /* Vistos desde arriba (+y), a contrarreloj: la cara que mira a la cámara. */
      indices[i] = base;
      indices[i + 1] = b;
      indices[i + 2] = a;
    }
  });
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geometria.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
  geometria.setAttribute('color', new THREE.BufferAttribute(colores, 4));
  geometria.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometria;
}

/** EL TAPETE: un rectángulo tumbado de dos triángulos, centrado en el origen. */
export function geometriaDelTapete(ancho: number, fondo: number): THREE.BufferGeometry {
  const geometria = new THREE.PlaneGeometry(ancho, fondo, 1, 1);
  geometria.rotateX(-Math.PI / 2);
  return geometria;
}

/** Cuántos triángulos pinta una geometría, indexada o no. Lo que cuenta el comprobador. */
export function triangulosDe(geometria: THREE.BufferGeometry): number {
  const indice = geometria.getIndex();
  if (indice !== null) return indice.count / 3;
  return geometria.getAttribute('position').count / 3;
}
