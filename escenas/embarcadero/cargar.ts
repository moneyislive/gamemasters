/**
 * CARGAR: de los bytes de un `.glb` a algo que la escena pueda poner.
 *
 * ═══ LA FRONTERA: LOS BYTES ENTRAN, NADA SALE A LA RED ═══
 *
 * Este módulo no sabe qué es `fetch` ni Expo: recibe la función `traer` del
 * contrato (`tipos.ts`) y abre lo que le devuelve con `GLTFLoader.parse`, que
 * trabaja sobre un `ArrayBuffer` sin tocar ni la red ni el DOM. Es lo que hace
 * que el mismo código corra en `expo-gl` y en WebGL. Ver `app/src/escena-avatar.tsx`
 * para la historia de por qué `parse` y no `load`.
 *
 * ═══ UNA CACHÉ POR RUTA, Y CARGA PROGRESIVA ═══
 *
 * Seis asientos con la misma figura son UN fichero, no seis: la promesa se
 * guarda por ruta desde que se pide, así dos peticiones simultáneas comparten
 * la misma. Y el orden lo decide quien llama: `Embarcadero.tsx` pide primero el
 * embarcadero y la figura local (lo que hace falta para quitar el telón), luego
 * la biblioteca de animaciones y luego las figuras de los demás según llegan.
 *
 * ═══ POR QUÉ SE FUNDEN LAS MALLAS ═══
 *
 * El presupuesto del §2 es de setenta llamadas de dibujo con seis sentados. Un
 * aventurero del pack trae varias mallas con la misma piel y el mismo material
 * (el color va por vértice), y cada una es una llamada. Aquí se funden en UNA
 * `SkinnedMesh` cuando comparten esqueleto y matriz de enlace; si no se puede, se
 * dejan como vienen y se pierde presupuesto, no la figura. Lo mismo vale para
 * la cala: todo lo que no se mueve se funde en una sola malla estática
 * (`fundir`), que es una llamada para cien teselas, treinta árboles y un caserío.
 *
 * ═══ LA ALTURA DE LAS TABLAS SE MIDE, NO SE SUPONE ═══
 *
 * El aventurero se pone de pie sobre la plataforma del `muelle`, y a qué altura
 * están sus tablas lo sabe la geometría y no este código. Se mide al cargar:
 * el nivel con más vértices por encima de cero es el de las tablas, porque un
 * entarimado es donde se concentran.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as clonaConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ESCALA_DEL_PACK } from '../escala';
import { PIEZA } from './piezas';
import { rutaDeLasAnimaciones, rutaDelAventurero, rutaDelEmbarcadero } from './figuras';
import type { FiguraId } from './figuras';
import type { Traer } from './tipos';

/* ───────────────────────────── Abrir un `.glb` ───────────────────────────── */

export function abrirGlb(bytes: ArrayBuffer): Promise<GLTF> {
  return new Promise((resolver, rechazar) => {
    new GLTFLoader().parse(
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

/* ────────────────────────────── El catálogo ────────────────────────────── */

export interface CatalogoDelEmbarcadero {
  /** Nombre de `piezas.ts` → el nodo original, que no se toca. */
  readonly piezas: ReadonlyMap<string, THREE.Object3D>;
  /** A qué altura del mundo están las tablas del `muelle`, medida. */
  readonly alturaDeLasTablas: number;
}

export interface AventureroCargado {
  readonly figura: FiguraId;
  /** La escena original con su rig y su piel fundida. Se clona; nunca se pone tal cual. */
  readonly escena: THREE.Object3D;
  /** Los clips que trae el propio fichero (normalmente ninguno). */
  readonly clips: readonly THREE.AnimationClip[];
  readonly altura: number;
}

export interface Cargador {
  embarcadero(): Promise<CatalogoDelEmbarcadero>;
  animaciones(): Promise<readonly THREE.AnimationClip[]>;
  aventurero(id: FiguraId): Promise<AventureroCargado>;
}

/** Catálogo de los hijos directos con nombre, como `catalogoDeModelos` en `escenas/modelos.ts`. */
function catalogo(raiz: THREE.Object3D): Map<string, THREE.Object3D> {
  const salida = new Map<string, THREE.Object3D>();
  for (const hijo of raiz.children) if (hijo.name.length > 0) salida.set(hijo.name, hijo);
  return salida;
}

/** El nivel de las tablas del muelle, en unidades de mundo. Cero si no se puede medir. */
export function medirTablas(muelle: THREE.Object3D | undefined): number {
  if (muelle === undefined) return 0;
  const cubos = new Map<number, number>();
  for (const parte of aplana(muelle)) {
    const pos = parte.geometria.getAttribute('position');
    if (pos === undefined) continue;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y <= 0.01) continue;
      const cubo = Math.round(y / 0.02);
      cubos.set(cubo, (cubos.get(cubo) ?? 0) + 1);
    }
  }
  let mejor = -1;
  let cuantos = 0;
  for (const [cubo, n] of cubos) {
    if (n > cuantos) {
      cuantos = n;
      mejor = cubo;
    }
  }
  return mejor < 0 ? 0 : mejor * 0.02 * ESCALA_DEL_PACK;
}

/* ─────────────────────── Aplanar, normalizar y fundir ─────────────────────── */

/** Una malla lista para instanciar o fundir: geometría con las transformaciones del nodo aplicadas. */
export interface Instanciable {
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
}

/**
 * UNA COPIA DE LA GEOMETRÍA SIN BÚFERES ENTRELAZADOS, y en silencio.
 *
 * El compilador deja los atributos del `.glb` entrelazados en un solo búfer, y
 * `BufferGeometry.clone()` los desentrelaza avisando por consola UNA VEZ POR
 * ATRIBUTO: doscientas líneas de «Cloning an interleaved buffer attribute» al
 * montar la cala, que entierran cualquier aviso de verdad. Aquí se hace la
 * misma copia a mano —flotantes ya desnormalizados, que es lo que `getX` da—
 * sin decir nada. Un atributo que no venga entrelazado se clona tal cual.
 */
export function copiaDesentrelazada(geometria: THREE.BufferGeometry): THREE.BufferGeometry {
  const copia = new THREE.BufferGeometry();
  for (const nombre of Object.keys(geometria.attributes)) {
    const atributo = geometria.getAttribute(nombre);
    if ((atributo as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) {
      const n = atributo.count;
      const tamano = atributo.itemSize;
      const plano = new Float32Array(n * tamano);
      for (let i = 0; i < n; i++) for (let k = 0; k < tamano; k++) plano[i * tamano + k] = atributo.getComponent(i, k);
      copia.setAttribute(nombre, new THREE.BufferAttribute(plano, tamano));
    } else {
      copia.setAttribute(nombre, (atributo as THREE.BufferAttribute).clone());
    }
  }
  const indice = geometria.getIndex();
  if (indice !== null) copia.setIndex(indice.clone());
  return copia;
}

/** Como `aplana` en `delta.tsx`: TODAS las mallas del modelo, en el marco del nodo raíz. */
export function aplana(modelo: THREE.Object3D): Instanciable[] {
  const copia = modelo.clone(true);
  copia.updateWorldMatrix(true, true);
  const inversa = new THREE.Matrix4().copy(copia.matrixWorld).invert();
  const salida: Instanciable[] = [];
  copia.traverse((n) => {
    const malla = n as THREE.Mesh;
    if (!malla.isMesh) return;
    malla.updateWorldMatrix(true, false);
    const geometria = copiaDesentrelazada(malla.geometry);
    geometria.applyMatrix4(new THREE.Matrix4().copy(inversa).multiply(malla.matrixWorld));
    const material = Array.isArray(malla.material) ? (malla.material[0] as THREE.Material) : malla.material;
    salida.push({ geometria, material });
  });
  return salida;
}

/** Un color de vértice de tres flotantes, venga como venga (bytes normalizados, cuatro componentes o nada). */
function colorEnTresFlotantes(geometria: THREE.BufferGeometry): THREE.BufferAttribute {
  const n = geometria.getAttribute('position').count;
  const salida = new Float32Array(n * 3);
  const color = geometria.getAttribute('color');
  if (color === undefined) {
    salida.fill(1);
  } else {
    for (let i = 0; i < n; i++) {
      salida[i * 3] = color.getX(i);
      salida[i * 3 + 1] = color.getY(i);
      salida[i * 3 + 2] = color.getZ(i);
    }
  }
  return new THREE.BufferAttribute(salida, 3);
}

/**
 * LA GEOMETRÍA EN FORMA CANÓNICA para fundirla: posición, normal y color de tres
 * componentes, indexada, y nada más. `mergeGeometries` exige que todas lleven
 * los mismos atributos, y las piezas del pack traen UV muertas o `_tinte` según
 * cuál sea. Los atributos de piel se conservan si se pide, para los aventureros.
 */
export function normaliza(geometria: THREE.BufferGeometry, conPiel = false): THREE.BufferGeometry {
  const salida = new THREE.BufferGeometry();
  salida.setAttribute('position', geometria.getAttribute('position').clone());
  if (geometria.getAttribute('normal') === undefined) geometria.computeVertexNormals();
  salida.setAttribute('normal', geometria.getAttribute('normal').clone());
  salida.setAttribute('color', colorEnTresFlotantes(geometria));
  if (conPiel) {
    const indice = geometria.getAttribute('skinIndex');
    const peso = geometria.getAttribute('skinWeight');
    if (indice !== undefined && peso !== undefined) {
      salida.setAttribute('skinIndex', indice.clone());
      salida.setAttribute('skinWeight', peso.clone());
    }
  }
  const idx = geometria.getIndex();
  if (idx !== null) {
    salida.setIndex(idx.clone());
  } else {
    const n = geometria.getAttribute('position').count;
    const plano = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
    for (let i = 0; i < n; i++) plano[i] = i;
    salida.setIndex(new THREE.BufferAttribute(plano, 1));
  }
  return salida;
}

export interface ParteAFundir {
  readonly geometria: THREE.BufferGeometry;
  readonly matriz: THREE.Matrix4;
}

/** Todas las partes en UNA geometría, cada una con su matriz aplicada. `null` si no se pudieron fundir. */
export function fundir(partes: readonly ParteAFundir[]): THREE.BufferGeometry | null {
  if (partes.length === 0) return null;
  const listas = partes.map((p) => normaliza(p.geometria).applyMatrix4(p.matriz));
  const fundida = mergeGeometries(listas, false) as THREE.BufferGeometry | null;
  for (const g of listas) g.dispose();
  if (fundida === null) return null;
  fundida.computeBoundingSphere();
  fundida.computeBoundingBox();
  return fundida;
}

/** La matriz de una puesta: posición, giro en Y y escala uniforme del pack por la talla. */
export function matrizDePuesta(x: number, y: number, z: number, giro: number, talla: number): THREE.Matrix4 {
  const s = ESCALA_DEL_PACK * talla;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro),
    new THREE.Vector3(s, s, s),
  );
}

/* ────────────────────────────── Los aventureros ────────────────────────────── */

/**
 * FUNDE LAS MALLAS CON PIEL de una figura en una sola, si comparten esqueleto y
 * matriz de enlace. Se hace UNA vez sobre el original; los clones ya salen fundidos.
 */
function fundePiel(raiz: THREE.Object3D): void {
  const mallas: THREE.SkinnedMesh[] = [];
  raiz.traverse((n) => {
    if ((n as THREE.SkinnedMesh).isSkinnedMesh) mallas.push(n as THREE.SkinnedMesh);
  });
  if (mallas.length < 2) {
    for (const m of mallas) m.frustumCulled = false;
    return;
  }
  const primera = mallas[0] as THREE.SkinnedMesh;
  const mismoEsqueleto = mallas.every(
    (m) =>
      m.skeleton === primera.skeleton &&
      m.parent === primera.parent &&
      m.bindMatrix.equals(primera.bindMatrix) &&
      m.matrix.equals(primera.matrix) &&
      !Array.isArray(m.material),
  );
  if (!mismoEsqueleto) {
    for (const m of mallas) m.frustumCulled = false;
    return;
  }
  const geometrias = mallas.map((m) => normaliza(m.geometry, true));
  if (geometrias.some((g) => g.getAttribute('skinIndex') === undefined)) return;
  const fundida = mergeGeometries(geometrias, false) as THREE.BufferGeometry | null;
  for (const g of geometrias) g.dispose();
  if (fundida === null) return;
  const material = primera.material as THREE.Material;
  const nueva = new THREE.SkinnedMesh(fundida, material);
  nueva.name = primera.name;
  nueva.matrix.copy(primera.matrix);
  nueva.matrix.decompose(nueva.position, nueva.quaternion, nueva.scale);
  nueva.frustumCulled = false;
  nueva.castShadow = true;
  const padre = primera.parent;
  if (padre === null) return;
  for (const m of mallas) padre.remove(m);
  padre.add(nueva);
  nueva.bind(primera.skeleton, primera.bindMatrix);
}

function alturaDe(objeto: THREE.Object3D): number {
  const caja = new THREE.Box3().setFromObject(objeto);
  return caja.max.y - caja.min.y;
}

/** Un clon con su propio esqueleto, listo para su propio mezclador. */
export function clonarAventurero(a: AventureroCargado): THREE.Object3D {
  const clon = clonaConEsqueleto(a.escena);
  clon.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.isMesh) {
      m.frustumCulled = false;
      m.castShadow = true;
    }
  });
  return clon;
}

/** Los clips de una figura: los suyos más los de la biblioteca que no repitan nombre. */
export function fundirClips(propios: readonly THREE.AnimationClip[], biblioteca: readonly THREE.AnimationClip[]): THREE.AnimationClip[] {
  const salida = [...biblioteca];
  for (const c of propios) if (!salida.some((b) => b.name === c.name)) salida.push(c);
  return salida;
}

/* ─────────────────────────────── El cargador ─────────────────────────────── */

const cargadores = new WeakMap<Traer, Cargador>();

/**
 * UN CARGADOR POR FUNCIÓN `traer`, con caché por ruta. Si el cliente da la misma
 * función, recibe el mismo cargador y no vuelve a pedir nada que ya pidió.
 */
export function cargadorPara(traer: Traer): Cargador {
  const hecho = cargadores.get(traer);
  if (hecho !== undefined) return hecho;

  const porRuta = new Map<string, Promise<GLTF>>();
  const gltfDe = (ruta: string): Promise<GLTF> => {
    const pendiente = porRuta.get(ruta);
    if (pendiente !== undefined) return pendiente;
    const promesa = traer(ruta)
      .then((bytes) => abrirGlb(bytes))
      .catch((fallo: unknown) => {
        /* Un fallo no se queda en la caché: el siguiente intento vuelve a pedir. */
        porRuta.delete(ruta);
        throw fallo instanceof Error ? fallo : new Error(String(fallo));
      });
    porRuta.set(ruta, promesa);
    return promesa;
  };

  let elEmbarcadero: Promise<CatalogoDelEmbarcadero> | null = null;
  let lasAnimaciones: Promise<readonly THREE.AnimationClip[]> | null = null;
  const losAventureros = new Map<FiguraId, Promise<AventureroCargado>>();

  const cargador: Cargador = {
    embarcadero() {
      elEmbarcadero ??= gltfDe(rutaDelEmbarcadero())
        .then((gltf) => {
          const piezas = catalogo(gltf.scene);
          return { piezas, alturaDeLasTablas: medirTablas(piezas.get(PIEZA.muelle)) };
        })
        .catch((fallo: unknown) => {
          elEmbarcadero = null;
          throw fallo;
        });
      return elEmbarcadero;
    },
    animaciones() {
      lasAnimaciones ??= gltfDe(rutaDeLasAnimaciones())
        .then((gltf) => gltf.animations)
        .catch((fallo: unknown) => {
          lasAnimaciones = null;
          throw fallo;
        });
      return lasAnimaciones;
    },
    aventurero(id) {
      const pendiente = losAventureros.get(id);
      if (pendiente !== undefined) return pendiente;
      const promesa = gltfDe(rutaDelAventurero(id))
        .then((gltf) => {
          fundePiel(gltf.scene);
          return { figura: id, escena: gltf.scene, clips: gltf.animations, altura: alturaDe(gltf.scene) };
        })
        .catch((fallo: unknown) => {
          losAventureros.delete(id);
          throw fallo;
        });
      losAventureros.set(id, promesa);
      return promesa;
    },
  };
  cargadores.set(traer, cargador);
  return cargador;
}
