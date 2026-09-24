/**
 * LA MALLA FUNDIDA: cada LOD de una figura, con lo que lleva enganchado, en UNA geometría y para UNA
 * llamada de dibujo.
 *
 * ═══ QUÉ SE FUNDE Y CÓMO ═══
 *
 * La forja exporta un primitivo por material: el desvelado del LOD0 son diez `SkinnedMesh` (piel, pelo,
 * camisa, tela, calzado, suela, abrigo, ojos…), y el LOD1 dos (`mat_lod_mate` y `mat_lod_brillo`) con la
 * zona de cada vértice en el atributo `_zona`. Aquí todos se vuelcan en una sola geometría con:
 *
 *   · `zona`: el índice de su zona en `zonas` (los materiales del LOD0 en orden alfabético, que es como
 *     numera `_zona` el LOD1, más las zonas de las piezas). El sombreador pinta cada zona con su color
 *     de la paleta del cuerpo: así se tiñe el traje de cada Celador o la ropa de cada Prestado sin un
 *     material por zona.
 *   · `color`: rgb = la PINTURA (1 salvo en los ojos, que traen el iris pintado por vértice) y
 *     a = la OCLUSIÓN horneada. La forja la guarda distinto en cada LOD —en el LOD0 va en el gris del
 *     rgb, en el LOD1 en el alfa y el rgb trae el color de la zona ya multiplicado— y aquí se deja igual
 *     en los dos: al cambiar de LOD el cuerpo no cambia de tono.
 *   · `skinIndex`/`skinWeight` en el orden de huesos de `huesos`, que es el de la piel del fichero.
 *
 * Los materiales de doble cara (las lentes y la montura de las gafas del Celador) entran UNA vez, con la
 * cara hacia donde apuntan sus normales. La primera versión duplicaba sus caras al revés para que una
 * lente vista desde dentro no fuera un agujero, y eso eran 500 triángulos por Celador que el renglón no
 * contaba (16.248 pintados frente a 15.748 declarados: lo midió la revisión). Desde dentro de una lente
 * sólo se mira desde dentro de la cabeza; y las 500 caras de la forja traen el giro de acuerdo con sus
 * normales (medido: 500 de 500), así que la cara que queda es la de fuera. El comprobador exige que cada
 * LOD fundido tenga los triángulos que declara el manifiesto.
 *
 * ═══ LO QUE NO ENTRA ═══
 *
 * Las zonas de `sinZonas` (las gafas del desvelado, el auricular del Celador: ver `reparto.ts`) no se
 * copian: sus triángulos no existen en la malla fundida, no se esconden. Y si el reparto pide sólo
 * algunas mallas de la figura (`mallas`), el resto tampoco.
 *
 * ═══ LAS PIEZAS ═══
 *
 * Cada pieza de `piezas.ts` viene en el espacio de su hueso. Se pasa al espacio de enlace con la
 * inversa de la matriz inversa de ese hueso (su sitio en reposo) y entra con todo el peso en él: se
 * mueve con la mano o con la cabeza como si colgara de ellas, en la misma llamada.
 */
import * as THREE from 'three';
import type { HuesoDePieza, PiezaConstruida } from './piezas';
import { ZONAS_DE_PIEZA } from './piezas';
import { ZONAS_COMO_MUCHO } from './reparto';

/** Las zonas con dibujo propio por vértice: se pintan con el rgb del vértice, no con la paleta. */
export const ZONAS_PINTADAS: readonly string[] = ['mat_ojos'];

/** Lo que cada zona es por defecto, en color de trabajo (lineal). */
export interface ZonaBase {
  readonly color: THREE.Color;
  readonly rugosidad: number;
  readonly metal: number;
  readonly pintada: boolean;
}

export interface MallaFundida {
  readonly geometria: THREE.BufferGeometry;
  readonly zonas: readonly string[];
  readonly base: readonly ZonaBase[];
  /** Los nombres de los huesos, en el orden de `skinIndex`. */
  readonly huesos: readonly string[];
  /** La inversa de cada hueso en reposo (espacio de enlace), en el mismo orden. */
  readonly inversas: readonly THREE.Matrix4[];
  readonly triangulos: number;
  /** Cuántos índices son del cuerpo (los primeros); los que siguen son de las piezas. */
  readonly indicesDelCuerpo: number;
  /** Cuántas zonas son de la figura (las primeras); las que siguen las estrenan las piezas. */
  readonly zonasDelCuerpo: number;
}

/**
 * EL MANIQUÍ: una malla fundida con el cuerpo simplificado a `triangulos` (las piezas no se tocan), con
 * el simplificador de meshoptimizer que trae three. Devuelve otra malla que COMPARTE los atributos con
 * la de partida y sólo cambia el índice: los mismos vértices, los mismos pesos de piel y las mismas
 * zonas, sin nada que recalcular.
 *
 * ═══ POR QUÉ, SI EL REPARTO YA TRAE UN LOD LIGERO ═══
 *
 * Porque el más ligero del reparto son unos 1.000 triángulos por ropa, y 48 durmientes a 1.000 son
 * 48.000: más que el cuarto entero de N0 (37.500). El §8 pide «maniquí de 400» en N0, y con él la
 * multitud, el paraguas de código y los cuerpos lejanos caben. Simplificar al cargar cuesta unos
 * milisegundos por figura y no pide ficheros nuevos.
 *
 * Las costuras de zona (vértices repetidos en el mismo sitio, uno por material) meshoptimizer las
 * reconoce como costuras y las respeta: el abrigo no se come la camisa.
 */
export function simplificarMalla(
  fundida: MallaFundida,
  triangulos: number,
  simplificar: (indices: Uint32Array, posiciones: Float32Array, objetivo: number) => Uint32Array,
): MallaFundida {
  const indice = fundida.geometria.getIndex();
  if (indice === null) return fundida;
  const todos = Uint32Array.from(indice.array as ArrayLike<number>);
  const cuerpo = todos.subarray(0, fundida.indicesDelCuerpo);
  const piezas = todos.subarray(fundida.indicesDelCuerpo);
  const objetivo = Math.max(3, Math.floor(triangulos) * 3);
  if (cuerpo.length <= objetivo) return fundida;
  const posiciones = (fundida.geometria.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
  const simple = simplificar(Uint32Array.from(cuerpo), posiciones, objetivo);
  const nuevo = new Uint32Array(simple.length + piezas.length);
  nuevo.set(simple, 0);
  nuevo.set(piezas, simple.length);
  const geometria = new THREE.BufferGeometry();
  for (const [k, v] of Object.entries(fundida.geometria.attributes)) geometria.setAttribute(k, v);
  const vertices = fundida.geometria.getAttribute('position').count;
  geometria.setIndex(vertices > 65535 ? new THREE.Uint32BufferAttribute(nuevo, 1) : new THREE.Uint16BufferAttribute(Array.from(nuevo), 1));
  geometria.boundingSphere = fundida.geometria.boundingSphere?.clone() ?? null;
  geometria.boundingBox = fundida.geometria.boundingBox?.clone() ?? null;
  return { ...fundida, geometria, triangulos: nuevo.length / 3, indicesDelCuerpo: simple.length };
}

export interface OpcionesDeFundir {
  /** Las zonas de la figura (ver `zonasDeLaFigura`). */
  readonly zonas: readonly string[];
  readonly sinZonas: readonly string[];
  /** Sólo estas mallas (por nombre de nodo, el grupo o el primitivo); `null`, todas. */
  readonly mallas: readonly string[] | null;
  readonly piezas: readonly PiezaConstruida[];
  /** El nombre del hueso de cada papel de pieza (del manifiesto). */
  readonly huesoDe: (h: HuesoDePieza) => string;
  /** La paleta base de la figura si ya se sacó de otro LOD (para que los LOD no cambien de tono). */
  readonly base?: readonly ZonaBase[] | null;
}

function mallasDe(escena: THREE.Object3D): THREE.SkinnedMesh[] {
  const salida: THREE.SkinnedMesh[] = [];
  escena.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) salida.push(o as THREE.SkinnedMesh);
  });
  return salida;
}

function materialDe(m: THREE.SkinnedMesh): THREE.Material {
  return Array.isArray(m.material) ? (m.material[0] as THREE.Material) : m.material;
}

function entra(m: THREE.SkinnedMesh, mallas: readonly string[] | null): boolean {
  if (mallas === null) return true;
  for (let o: THREE.Object3D | null = m; o !== null; o = o.parent) if (mallas.includes(o.name)) return true;
  return false;
}

/**
 * LA PALETA BASE DE UNA FIGURA (con unas mallas) a partir de un LOD: del material de cada primitivo si
 * es el LOD0, o del color horneado por zona (rgb/a) si es el LOD1 o el LOD2. Ver la cabecera.
 */
export function paletaBase(escena: THREE.Object3D, zonas: readonly string[], mallas: readonly string[] | null = null): ZonaBase[] {
  const suma = zonas.map(() => ({ r: 0, g: 0, b: 0, n: 0, rugosidad: 0.7, metal: 0 }));
  /*
   * Sólo las mallas de la variante: en un fichero con varias, una zona puede tener un material por
   * variante con el mismo nombre y otro color (el abrigo de la gabardina no es el de la chaqueta).
   */
  for (const m of mallasDe(escena).filter((x) => entra(x, mallas))) {
    const mat = materialDe(m) as THREE.MeshStandardMaterial;
    const zonaAttr = m.geometry.getAttribute('_zona') as THREE.BufferAttribute | undefined;
    if (zonaAttr === undefined) {
      const z = zonas.indexOf(mat.name);
      const s = suma[z];
      if (s === undefined) continue;
      s.r = mat.color?.r ?? 0.5;
      s.g = mat.color?.g ?? 0.5;
      s.b = mat.color?.b ?? 0.5;
      s.n = 1;
      s.rugosidad = mat.roughness ?? 0.7;
      s.metal = mat.metalness ?? 0;
      continue;
    }
    const color = m.geometry.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < zonaAttr.count; i++) {
      const s = suma[Math.round(zonaAttr.getX(i))];
      if (s === undefined || s.n < 0) continue;
      const a = color.getW(i);
      if (a < 0.05) continue;
      s.r += color.getX(i) / a;
      s.g += color.getY(i) / a;
      s.b += color.getZ(i) / a;
      s.n++;
      s.rugosidad = mat.roughness ?? 0.7;
      s.metal = mat.metalness ?? 0;
    }
  }
  return zonas.map((nombre, i) => {
    const s = suma[i] as (typeof suma)[number];
    const n = Math.max(1, s.n);
    const pieza = ZONAS_DE_PIEZA[nombre];
    if (pieza !== undefined) {
      return { color: new THREE.Color(pieza.color), rugosidad: pieza.rugosidad, metal: pieza.metal, pintada: false };
    }
    return {
      color: s.n > 0 ? new THREE.Color(s.r / n, s.g / n, s.b / n) : new THREE.Color(0.5, 0.5, 0.5),
      rugosidad: s.rugosidad,
      metal: s.metal,
      pintada: ZONAS_PINTADAS.includes(nombre),
    };
  });
}

/**
 * FUNDE UN LOD. `escena` es la de su `.glb` tal como la da el cargador (en reposo). Lanza si la figura
 * trae más zonas de las que caben en el sombreador o si un primitivo usa otra piel.
 */
export function fundirElLod(escena: THREE.Object3D, o: OpcionesDeFundir): MallaFundida {
  escena.updateWorldMatrix(true, true);
  const mallas = mallasDe(escena);
  const primera = mallas[0];
  if (primera === undefined) throw new Error('El LOD no trae ninguna malla con piel');
  const esqueleto = primera.skeleton;
  const huesos = esqueleto.bones.map((b) => b.name);
  const inversas = esqueleto.boneInverses.map((m) => m.clone());
  const zonas = [...o.zonas];
  for (const p of o.piezas) for (const z of p.zonas) if (!zonas.includes(z)) zonas.push(z);
  if (zonas.length > ZONAS_COMO_MUCHO) throw new Error(`La figura tiene ${String(zonas.length)} zonas y caben ${String(ZONAS_COMO_MUCHO)}`);
  const quitadas = new Set<number>();
  for (const z of o.sinZonas) {
    const i = zonas.indexOf(z);
    if (i >= 0) quitadas.add(i);
  }

  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const pesos: number[] = [];
  const zona: number[] = [];
  const indice: number[] = [];
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (const m of mallas) {
    if (!entra(m, o.mallas)) continue;
    /* Otra piel: se traduce hueso a hueso por nombre (o se lanza si falta alguno). */
    const traduccion = m.skeleton.bones.map((b) => {
      const k = huesos.indexOf(b.name);
      if (k < 0) throw new Error(`El primitivo ${m.name} usa el hueso ${b.name}, que no está en la piel`);
      return k;
    });
    const g = m.geometry;
    const P = g.getAttribute('position') as THREE.BufferAttribute;
    const N = g.getAttribute('normal') as THREE.BufferAttribute;
    const C = g.getAttribute('color') as THREE.BufferAttribute | undefined;
    const I = g.getAttribute('skinIndex') as THREE.BufferAttribute;
    const W = g.getAttribute('skinWeight') as THREE.BufferAttribute;
    const Z = g.getAttribute('_zona') as THREE.BufferAttribute | undefined;
    const mat = materialDe(m);
    const zonaDelMaterial = zonas.indexOf(mat.name);
    /* La malla puede no estar en el origen del esqueleto (la forja la deja en él, pero no se da por hecho). */
    const aEnlace = m.bindMatrix.clone();
    const normalAEnlace = new THREE.Matrix3().getNormalMatrix(aEnlace);
    const primero = pos.length / 3;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(aEnlace);
      n.fromBufferAttribute(N, i).applyMatrix3(normalAEnlace).normalize();
      pos.push(v.x, v.y, v.z);
      nor.push(n.x, n.y, n.z);
      const z = Z !== undefined ? Math.round(Z.getX(i)) : zonaDelMaterial;
      zona.push(z);
      const pintada = z >= 0 && ZONAS_PINTADAS.includes(zonas[z] ?? '');
      const r = C?.getX(i) ?? 1;
      const gg = C?.getY(i) ?? 1;
      const b = C?.getZ(i) ?? 1;
      const a = C?.getW(i) ?? 1;
      if (Z !== undefined) {
        /* LOD1: la oclusión en el alfa; el rgb es color de zona × oclusión. */
        const ao = Math.max(0.02, a);
        if (pintada) col.push(Math.min(1, r / ao), Math.min(1, gg / ao), Math.min(1, b / ao), ao);
        else col.push(1, 1, 1, ao);
      } else if (pintada) {
        col.push(r, gg, b, 1);
      } else {
        /* LOD0: la oclusión es el gris. */
        col.push(1, 1, 1, (r + gg + b) / 3);
      }
      for (let k = 0; k < 4; k++) {
        idx.push(traduccion[I.getComponent(i, k)] ?? 0);
        pesos.push(W.getComponent(i, k));
      }
    }
    const index = g.getIndex();
    const cuenta = index !== null ? index.count : P.count;
    const vertice = (k: number): number => (index !== null ? index.getX(k) : k);
    for (let k = 0; k < cuenta; k += 3) {
      const a = vertice(k);
      const b = vertice(k + 1);
      const c = vertice(k + 2);
      if (quitadas.has(zona[primero + a] as number)) continue;
      indice.push(primero + a, primero + b, primero + c);
    }
  }

  const indicesDelCuerpo = indice.length;
  /* Las piezas, del espacio de su hueso al de enlace, con todo el peso en él. */
  const reposo = new THREE.Matrix4();
  const normalDelReposo = new THREE.Matrix3();
  for (const p of o.piezas) {
    const nombre = p.huesoNombre ?? o.huesoDe(p.hueso);
    const k = huesos.indexOf(nombre);
    if (k < 0) throw new Error(`La pieza ${p.nombre} cuelga de ${nombre}, que no está en la piel`);
    reposo.copy(inversas[k] as THREE.Matrix4).invert();
    normalDelReposo.getNormalMatrix(reposo);
    const P = p.geometria.getAttribute('position') as THREE.BufferAttribute;
    const N = p.geometria.getAttribute('normal') as THREE.BufferAttribute;
    const ZP = p.geometria.getAttribute('zonaPieza') as THREE.BufferAttribute;
    const primero = pos.length / 3;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(reposo);
      n.fromBufferAttribute(N, i).applyMatrix3(normalDelReposo).normalize();
      pos.push(v.x, v.y, v.z);
      nor.push(n.x, n.y, n.z);
      col.push(1, 1, 1, 1);
      zona.push(zonas.indexOf(p.zonas[Math.round(ZP.getX(i))] ?? ''));
      idx.push(k, 0, 0, 0);
      pesos.push(1, 0, 0, 0);
      indice.push(primero + i);
    }
  }

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometria.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  /* El color en bytes normalizados: la oclusión y la pintura no necesitan más, y pesan la cuarta parte. */
  geometria.setAttribute('color', new THREE.Uint8BufferAttribute(col.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255)), 4, true));
  geometria.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geometria.setAttribute('skinWeight', new THREE.Float32BufferAttribute(pesos, 4));
  geometria.setAttribute('zona', new THREE.Float32BufferAttribute(zona, 1));
  geometria.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(indice, 1) : new THREE.Uint16BufferAttribute(indice, 1));
  /*
   * Una esfera generosa y FIJA: la de reposo (1,8 m de pie) no contiene al cuerpo tumbado ni con el
   * brazo estirado, y recalcularla con los huesos en cada fotograma cuesta más que pintarlo. ¡Ojo! Una
   * `SkinnedMesh` NO recorta con la esfera de su geometría sino con la SUYA (`SkinnedMesh.boundingSphere`,
   * que se calcula sola con la primera pose: 0,94 m de radio, y un Celador tumbado asomaba 8 cm por
   * fuera). `cuerpo.ts` le da ésta a cada malla con piel.
   */
  geometria.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.7);
  geometria.boundingBox = new THREE.Box3(new THREE.Vector3(-1.2, -0.2, -1.2), new THREE.Vector3(1.2, 2.2, 1.2));
  const base = o.base ?? paletaBase(escena, zonas, o.mallas);
  /* Si la paleta vino de otro LOD y le faltan las zonas de las piezas, se completan. */
  const completa = zonas.map((z, i) => {
    const b = base[i];
    if (b !== undefined && o.zonas.includes(z)) return b;
    for (const p of o.piezas) {
      const suya = p.base?.[z];
      if (suya !== undefined) return { color: suya.color.clone(), rugosidad: suya.rugosidad, metal: suya.metal, pintada: false };
    }
    const pieza = ZONAS_DE_PIEZA[z];
    return pieza !== undefined
      ? { color: new THREE.Color(pieza.color), rugosidad: pieza.rugosidad, metal: pieza.metal, pintada: false }
      : (b ?? { color: new THREE.Color(0.5, 0.5, 0.5), rugosidad: 0.7, metal: 0, pintada: false });
  });
  return { geometria, zonas, base: completa, huesos, inversas, triangulos: indice.length / 3, indicesDelCuerpo, zonasDelCuerpo: o.zonas.length };
}
