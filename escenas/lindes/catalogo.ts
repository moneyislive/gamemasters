/**
 * EL CATÁLOGO DEL TABLERO: abrir `tablero.glb`, sacar de cada modelo sus partes y su caja, y
 * decir hacia dónde se estira una pieza larga.
 *
 * `three` sin React. Vivía dentro de `Lindes.tsx`, y ahí sólo lo puede mirar un navegador;
 * aquí `verify:lindes-escena` lo corre en Node con el `.glb` de verdad —abre el tablero como
 * lo abre la escena y mide la caja de cada modelo como la mide la escena—, así que lo que se
 * comprueba es lo que se pinta y no una copia de ello.
 *
 * ═══ EL TABLERO SE ABRE CON LOS COMPLEMENTOS QUE DIGA QUIEN MONTA LA ESCENA ═══
 *
 * `tablero.glb` lleva su atlas EMPOTRADO como PNG, y Hermes no decodifica PNG. En el teléfono
 * `GLTFLoader` no llega a construir la textura, y según por dónde se rompa o revienta la carga
 * entera —lo que cuenta la cabecera de `texturas-nativas.ts`— o, con la `three` de esta casa
 * (0.185, que se traga el fallo de la imagen), deja el mapa en `null`: cada casa, cada tramo de
 * muralla y cada árbol del valle SIN UN SOLO COLOR, porque todo el color del pack vive en ese
 * atlas y el `.glb` no trae color por vértice. Medido en Node, que tampoco tiene con qué
 * decodificar una imagen: sin complemento, ninguna de las partes que pinta Las Lindes llega
 * con el atlas.
 *
 * Riberas lo arregló en su pantalla con `texturasDelTablero` (`app/src/tres/texturas-nativas.ts`,
 * el atlas compilado a bytes), porque allí es la pantalla la que abre el `.glb`. Aquí lo abre la
 * escena, así que el complemento tiene que LLEGARLE: lo pasa la app, que es la única que sabe si
 * está en un teléfono, y `escenas/` sigue sin importar nada de `app/` —el escritorio no puede
 * arrastrar la carpeta del móvil, ni la tabla del atlas que no le hace falta—. En un navegador
 * no se pasa ninguno y el PNG se decodifica de verdad, como siempre.
 *
 * ═══ Y UNA PIEZA LARGA SE ESTIRA POR SU LARGO ═══
 *
 * Ver `ejeDelLargo`: la valla del pack es larga en `z`, y el `largo` del reparto se aplicaba
 * siempre a la `x`. Las vallas estiradas salían más GRUESAS, no más largas.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF, GLTFLoaderPlugin, GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ESCALA_DEL_PACK } from '../escala';
import type { CajaDelModelo } from './desierto';

/* ─────────────────────────────── Abrir el tablero ─────────────────────────────── */

/** Un complemento de `GLTFLoader`, como los de `app/src/tres/texturas-nativas.ts`. */
export type ComplementoDelCargador = (parser: GLTFParser) => GLTFLoaderPlugin;

/**
 * ABRE LOS BYTES DE `tablero.glb` con los complementos que se le den, en ese orden.
 *
 * Sin complementos es exactamente lo que hacía `abrirGlb` (`embarcadero/cargar.ts`): un
 * `GLTFLoader` nuevo y `parse`, que trabaja sobre el `ArrayBuffer` sin tocar la red.
 */
export function abrirElTablero(bytes: ArrayBuffer, complementos: readonly ComplementoDelCargador[]): Promise<GLTF> {
  const cargador = new GLTFLoader();
  for (const complemento of complementos) cargador.register(complemento);
  return new Promise((resolver, rechazar) => {
    cargador.parse(
      bytes,
      '',
      (gltf) => {
        resolver(gltf);
      },
      (fallo) => {
        rechazar(fallo instanceof Error ? fallo : new Error(String((fallo as { message?: string }).message ?? fallo)));
      },
    );
  });
}

/* ──────────────────────────────── El catálogo ──────────────────────────────── */

/** Una parte de un modelo, ya lista para instanciar. */
export interface ParteDelModelo {
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
}

/**
 * LAS PARTES DE UN MODELO DEL PACK, en coordenadas del modelo.
 *
 * Un nodo del `.glb` puede traer varias mallas dentro con materiales distintos —una casa con
 * su tejado y su pared—, así que se aplanan todas y se guarda cada una con SU material y SU
 * matriz ya aplicada. Instanciar un grupo entero no se puede; instanciar cada malla suelta sí.
 */
export function partesDe(nodo: THREE.Object3D): ParteDelModelo[] {
  const partes: ParteDelModelo[] = [];
  nodo.updateWorldMatrix(true, true);
  const inversa = new THREE.Matrix4().copy(nodo.matrixWorld).invert();
  nodo.traverse((hijo) => {
    const malla = hijo as THREE.Mesh;
    if (!malla.isMesh || malla.geometry === undefined) return;
    const g = malla.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inversa, malla.matrixWorld));
    const material = Array.isArray(malla.material) ? malla.material[0] : malla.material;
    if (material === undefined) return;
    partes.push({ geometria: g, material });
  });
  return partes;
}

/** Los modelos del tablero por su nombre, cada uno con sus partes. */
export interface Catalogo {
  readonly partes: ReadonlyMap<string, readonly ParteDelModelo[]>;
  /**
   * Suelta las geometrías, que son copias suyas. Los materiales y sus texturas NO: el atlas del
   * teléfono es uno por app y lo comparte con Riberas.
   */
  readonly soltar: () => void;
}

export function catalogoDe(raiz: THREE.Object3D): Catalogo {
  const partes = new Map<string, readonly ParteDelModelo[]>();
  for (const hijo of raiz.children) {
    if (hijo.name.length === 0) continue;
    partes.set(hijo.name, partesDe(hijo));
  }
  return {
    partes,
    soltar: () => {
      for (const lista of partes.values()) for (const p of lista) p.geometria.dispose();
    },
  };
}

/* ────────────────────────────── La caja de un modelo ────────────────────────────── */

/**
 * LA CAJA DE UNAS PARTES, en unidades del pack: su ancho (`x`), su alto (`y`) y su fondo (`z`).
 *
 * Es el único sitio donde se sabe de verdad lo que mide una pieza, y cada medida sirve para una
 * cosa: el ALTO, para sentar algo encima —la caja bajo el reloj—; el LADO MAYOR, para decidir lo
 * grande que se ve —las piedras del desierto, porque el alto de una piedra plana no dice nada:
 * `roca-a` es cuatro veces y media más ancha que alta—; y el ANCHO contra el FONDO, para saber
 * hacia dónde es larga (`ejeDelLargo`).
 *
 * Una tabla de medidas escrita a mano se quedaría vieja en silencio el día que alguien recompile
 * `tablero.glb`; esto no.
 */
export function cajaDeLasPartes(partes: readonly ParteDelModelo[]): CajaDelModelo {
  let ancho = 0;
  let alto = 0;
  let fondo = 0;
  for (const parte of partes) {
    parte.geometria.computeBoundingBox();
    const caja = parte.geometria.boundingBox;
    if (caja === null) continue;
    ancho = Math.max(ancho, caja.max.x - caja.min.x);
    alto = Math.max(alto, caja.max.y - caja.min.y);
    fondo = Math.max(fondo, caja.max.z - caja.min.z);
  }
  return { ancho, alto, fondo };
}

/** La caja de un modelo del catálogo por su nombre. Ceros si no está. */
export function cajaDelModelo(catalogo: Catalogo, nombre: string): CajaDelModelo {
  return cajaDeLasPartes(catalogo.partes.get(nombre) ?? []);
}

/* ─────────────────────────── Hacia dónde se estira ─────────────────────────── */

/** El eje del MODELO que estira el `largo` de una puesta. */
export type EjeDelLargo = 'x' | 'z';

/**
 * CUÁNTAS VECES TIENE QUE PASAR UN LADO AL OTRO PARA QUE LA PIEZA «TENGA UN LARGO».
 *
 * Medido en `tablero.glb`: la `valla` mide 1,155 de fondo por 0,1 de ancho —once veces y
 * media— y la `valla-puerta`, 1,155 por 0,14; el `muro`, 2 de ancho por 0,8 de fondo —dos
 * veces y media, hacia el otro lado—. Una casa (0,875 × 1,099) o un trigal (1,874 × 2,094) no
 * son largos hacia ningún sitio. Con dos, las vallas y los muros caen cada uno en su lado con
 * holgura, y lo que es casi cuadrado se queda con la costumbre de la casa.
 */
export const VECES_QUE_HACEN_UN_LARGO = 2;

/**
 * HACIA DÓNDE ES LARGA UNA PIEZA, leído en su caja.
 *
 * ═══ EL FALLO: LAS VALLAS SALÍAN MÁS GRUESAS, NO MÁS LARGAS ═══
 *
 * El reparto pide `largo: 1,7` para la cerca de la ermita y `largo: 1,8` para las vallas de la
 * senda —«cuánto se estira SÓLO a lo largo»—, y la escena lo aplicaba siempre a la `x` del
 * modelo. Eso vale para el muro, que es largo en `x`. La valla es larga en `z`: estirarle la `x`
 * la dejaba igual de larga y un 70-80 % más gorda, un tablón en vez de una cerca.
 *
 * ═══ POR QUÉ `x` ES LO QUE SE QUEDA SI NO ES LARGA EN `z` ═══
 *
 * Porque es la costumbre sobre la que está escrito el mundo con el que se choca:
 * `cajasDeLaPuesta` (`shared/arcade/juegos/lindes-mundo.ts`) estira la `x` de la huella con el
 * mismo `largo`, y los muros —lo único que choca y se estira— tienen que seguir pintándose como
 * chocan. Las vallas son menudas y no chocan (`comoEstorba`), así que su caja no existe y no hay
 * nada que desacordar; `verify:lindes-escena` exige que siga siendo así: nada que choque puede
 * estirarse por la `z`.
 */
export function ejeDelLargo(caja: CajaDelModelo): EjeDelLargo {
  return caja.fondo >= caja.ancho * VECES_QUE_HACEN_UN_LARGO ? 'z' : 'x';
}

/** Tres números con nombre, que es lo que tiene un `THREE.Vector3` y lo que se escribe aquí. */
export interface TresEjes {
  x: number;
  y: number;
  z: number;
}

/**
 * LA ESCALA DE UNA PUESTA en el marco del modelo: la del pack por la suya, y el `largo` sólo por
 * el eje que es largo. Escribe en `salida` y la devuelve, para que el fotograma no fabrique un
 * objeto por pieza —son miles, sesenta veces por segundo—.
 */
export function escalaDeLaPuesta(escala: number, largo: number, eje: EjeDelLargo, salida: TresEjes): TresEjes {
  const s = escala * ESCALA_DEL_PACK;
  salida.x = eje === 'x' ? s * largo : s;
  salida.y = s;
  salida.z = eje === 'z' ? s * largo : s;
  return salida;
}
