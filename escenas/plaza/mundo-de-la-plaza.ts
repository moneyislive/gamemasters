/**
 * EL MUNDO DE LA PLAZA: de la composición a geometría de `three`.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ DENTRO DE `Plaza.tsx` ═══
 *
 * Por la misma razón que `burgo/ciudad-en-3d.ts` no está dentro de `Burgo.tsx`: aquí se
 * importa `three` PERO NO se abre un contexto de dibujo ni se toca React, así que un
 * comprobador de Node puede pedir la geometría de verdad y CONTARLE LOS TRIÁNGULOS. Eso
 * es lo que convierte el presupuesto en una medida y no en una promesa: `verify:plaza`
 * carga `burgo.glb` con el `GLTFLoader` real, funde la plaza con ESTA función —la misma
 * que usa la escena— y suma lo que sale.
 *
 * ═══ LA ESCALA YA VA HORNEADA: AQUÍ NO SE MULTIPLICA POR NADA ═══
 *
 * `matrizDePuesta` de `embarcadero/cargar.ts` multiplica por `ESCALA_DEL_PACK` (5,469),
 * que es lo que necesita el pack hexagonal del Muelle. `burgo.glb` sale del compilador
 * YA a escala del mundo (ver la cabecera de `burgo/piezas.ts`), así que usarla aquí
 * daría una plaza seis veces mayor sin un solo error. Por eso este fichero tiene su
 * propia `matrizDeLaPlaza`, que es traslación, giro en Y y talla, y nada más — la misma
 * cuenta que `matrizDelBurgo` de `Burgo.tsx`, escrita aquí para no importar la escena
 * del tablero entera (React, r3f y la ciudad) dentro del lobby.
 *
 * ═══ TODO LO QUE NO SE MUEVE, EN UNA SOLA MALLA ═══
 *
 * La calle, las aceras, las fachadas, el monumento, los bancos, las farolas, las
 * terrazas, el arbolado y los coches aparcados se funden en UNA geometría con UN
 * material: una llamada de dibujo para ciento y pico piezas. Lo que no entra en el
 * fundido es lo que cambia con la mesa —los seis estandartes, que se tiñen del color de
 * su asiento— y lo que se mueve —los aventureros—. Es la misma decisión que toma el
 * Muelle con su cala y el tablero con su ciudad.
 *
 * ═══ DOS MANERAS DE TOCAR EL COLOR, Y NO SON LO MISMO ═══
 *
 * · TEÑIR (`tenir`) es para las piezas con máscara `_TINTE`: se sustituye el color de
 *   los vértices marcados conservando su luminancia relativa. Lo usa el monumento, que
 *   es la `figura` del pack pasada a bronce.
 * · MATIZAR (`matiz`) es para las fachadas: el color del pack se MULTIPLICA por un
 *   factor cercano a uno para que dos casas del mismo modelo no salgan idénticas. El
 *   factor viene codificado en un `#rrggbb` donde 128 es «por uno», y se decodifica a
 *   mano —sin `THREE.Color`— a propósito: `THREE.Color` convierte de sRGB a lineal, y
 *   una RAZÓN no se convierte, se multiplica.
 */
import * as THREE from 'three';
import { aplana, fundir } from '../embarcadero/cargar';
import type { Instanciable, ParteAFundir } from '../embarcadero/cargar';
import { ATRIBUTO_DE_TINTE_CARGADO, AZUL_DE_LAS_FICHAS, PIEZA } from '../burgo/piezas';
import { geometriaAGris, geometriaTenidaDe } from '../burgo/tinte-del-burgo';
import { geometriaDeUnBulto } from '../burgo/ciudad-en-3d';
import type { BultoDeLaPlaza, LaPlaza, PuestaDeLaPlaza } from './la-plaza';
import { piezasQueSePintan } from './la-plaza';

/** Un catálogo de `burgo.glb`: nombre de pieza → nodo, sin tocar. Lo trae `catalogoDelBurgoDe`. */
export type CatalogoDeLaPlaza = ReadonlyMap<string, THREE.Object3D>;

const EJE_Y = new THREE.Vector3(0, 1, 0);

/** La matriz de una puesta de la plaza: SIN la escala del pack, que ya va horneada. */
export function matrizDeLaPlaza(x: number, y: number, z: number, giro: number, talla: number, destino = new THREE.Matrix4()): THREE.Matrix4 {
  return destino.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(EJE_Y, giro),
    new THREE.Vector3(talla, talla, talla),
  );
}

/** El factor por el que se multiplica el color de un vértice, sacado del `#rrggbb` del matiz (128 = por uno). */
function factorDelMatiz(matiz: string): [number, number, number] {
  const n = parseInt(matiz.slice(1), 16);
  return [((n >> 16) & 255) / 128, ((n >> 8) & 255) / 128, (n & 255) / 128];
}

/** Una copia de la geometría con su color multiplicado por el factor. Ver la cabecera. */
function geometriaMatizada(geometria: THREE.BufferGeometry, matiz: string): THREE.BufferGeometry {
  const color = geometria.getAttribute('color');
  if (color === undefined) return geometria;
  const [fr, fg, fb] = factorDelMatiz(matiz);
  const copia = geometria.clone();
  const n = color.count;
  const nuevo = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    nuevo[i * 3] = Math.min(1, color.getX(i) * fr);
    nuevo[i * 3 + 1] = Math.min(1, color.getY(i) * fg);
    nuevo[i * 3 + 2] = Math.min(1, color.getZ(i) * fb);
  }
  copia.setAttribute('color', new THREE.BufferAttribute(nuevo, 3));
  return copia;
}

/**
 * LA GEOMETRÍA DE UN BULTO PROPIO, ya a su tamaño y con su color horneado.
 *
 * `geometriaDeUnBulto` de la ciudad devuelve una caja UNITARIA apoyada en y = 0, con el
 * color de sus caras a uno (y la banda de ventanas a un tercio), pensada para pintarse
 * con `instanceColor`. Aquí no hay instancias: el pedestal y el llano entran en el
 * fundido, así que se clona, se escala y se le escribe el color encima. Se clona
 * SIEMPRE: esa geometría es de una caché que comparte el tablero, y escribir en ella
 * repintaría media ciudad.
 *
 * La escala es positiva en los tres ejes a propósito: un factor negativo daría la
 * vuelta al sentido de giro de las caras y `three` tiraría las horizontales, que es el
 * fallo que costó los tejados de la ciudad entera. `verify:plaza` le pasa la lupa
 * cenital a lo que sale de aquí.
 */
export function geometriaDeUnBultoDeLaPlaza(bulto: BultoDeLaPlaza): THREE.BufferGeometry {
  const unidad = geometriaDeUnBulto(bulto.triangulos, bulto.alto <= 0);
  const copia = unidad.clone();
  copia.scale(Math.abs(bulto.ancho), Math.abs(bulto.alto), Math.abs(bulto.fondo));
  const color = copia.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (color !== undefined) {
    const tinta = new THREE.Color(bulto.color);
    for (let i = 0; i < color.count; i++) {
      /* El color de la caja viene en 1 (cuerpo) o 0,34 (banda): se conserva como matiz. */
      const matiz = color.getX(i);
      color.setXYZ(i, tinta.r * matiz, tinta.g * matiz, tinta.b * matiz);
    }
    color.needsUpdate = true;
  }
  return copia;
}

/* ─────────────────────────────── El mundo ─────────────────────────────── */

export interface MundoDeLaPlaza {
  /** Todo lo que no se mueve, en una sola geometría y un solo material. */
  readonly fundido: { readonly geometria: THREE.BufferGeometry; readonly material: THREE.Material } | null;
  /** El estandarte a gris, listo para `instanceColor`: uno por puesto, con el color de su asiento. */
  readonly estandarte: { readonly geometria: THREE.BufferGeometry; readonly material: THREE.Material } | null;
  /** Cuántos triángulos tiene lo fundido, contados de verdad. */
  readonly triangulosFundidos: number;
  /** Las piezas de la composición que el catálogo no trae: si hay alguna, falta arte. */
  readonly desconocidas: readonly string[];
  readonly soltar: () => void;
}

/** Todas las mallas de una pieza en una sola geometría, conservando la máscara de tinte. Como `unaGeometria` de `Burgo.tsx`. */
function unaGeometria(partes: readonly Instanciable[]): THREE.BufferGeometry | null {
  const primera = partes[0];
  if (primera === undefined) return null;
  if (partes.length === 1) return primera.geometria;
  const conMascara = partes.every((p) => p.geometria.getAttribute(ATRIBUTO_DE_TINTE_CARGADO) !== undefined);
  const listas = partes.map((p) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', p.geometria.getAttribute('position').clone());
    if (p.geometria.getAttribute('normal') === undefined) p.geometria.computeVertexNormals();
    g.setAttribute('normal', p.geometria.getAttribute('normal').clone());
    const color = p.geometria.getAttribute('color');
    const n = p.geometria.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      c[i * 3] = color === undefined ? 1 : color.getX(i);
      c[i * 3 + 1] = color === undefined ? 1 : color.getY(i);
      c[i * 3 + 2] = color === undefined ? 1 : color.getZ(i);
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (conMascara) g.setAttribute(ATRIBUTO_DE_TINTE_CARGADO, p.geometria.getAttribute(ATRIBUTO_DE_TINTE_CARGADO).clone());
    const idx = p.geometria.getIndex();
    if (idx !== null) g.setIndex(idx.clone());
    return g;
  });
  const fundida = mergeSinPerderNada(listas);
  for (const g of listas) g.dispose();
  return fundida;
}

/** `fundir` normaliza y pierde la máscara; para una sola pieza hace falta conservarla. */
function mergeSinPerderNada(listas: readonly THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  const primera = listas[0];
  if (primera === undefined) return null;
  if (listas.length === 1) return primera.clone();
  const partes: ParteAFundir[] = listas.map((g) => ({ geometria: g, matriz: new THREE.Matrix4() }));
  return fundir(partes);
}

/**
 * CONSTRUYE EL MUNDO FIJO de una plaza con el catálogo de `burgo.glb`.
 *
 * Devuelve también cómo soltarlo: todas las geometrías de aquí son copias nuestras
 * (`aplana` clona, `fundir` crea y las teñidas salen de una caché propia), y sin
 * `dispose` se quedan en la tarjeta al cambiar de mesa.
 */
export function construirElMundoDeLaPlaza(plaza: LaPlaza, catalogo: CatalogoDeLaPlaza): MundoDeLaPlaza {
  const propias: THREE.BufferGeometry[] = [];
  const porPieza = new Map<string, Instanciable[]>();
  const desconocidas: string[] = [];
  const partesDe = (nombre: string): Instanciable[] => {
    const hechas = porPieza.get(nombre);
    if (hechas !== undefined) return hechas;
    const nodo = catalogo.get(nombre);
    if (nodo === undefined) {
      if (!desconocidas.includes(nombre)) desconocidas.push(nombre);
      porPieza.set(nombre, []);
      return [];
    }
    const partes = aplana(nodo);
    for (const p of partes) propias.push(p.geometria);
    porPieza.set(nombre, partes);
    return partes;
  };

  const aFundir: ParteAFundir[] = [];
  let material: THREE.Material | null = null;
  const matriz = (p: PuestaDeLaPlaza): THREE.Matrix4 => matrizDeLaPlaza(p.x, p.y, p.z, p.giro, p.talla);
  for (const puesta of piezasQueSePintan(plaza)) {
    const m = matriz(puesta);
    for (const parte of partesDe(puesta.pieza)) {
      let geometria = parte.geometria;
      if (puesta.tenir !== undefined) geometria = geometriaTenidaDe(puesta.pieza, geometria, puesta.tenir);
      if (puesta.matiz !== undefined) {
        const matizada = geometriaMatizada(geometria, puesta.matiz);
        if (matizada !== geometria) propias.push(matizada);
        geometria = matizada;
      }
      aFundir.push({ geometria, matriz: m });
      material ??= parte.material;
    }
  }
  /* Los bultos propios: el pedestal y el llano del fondo, ya a su tamaño y con su color. */
  for (const bulto of plaza.bultos) {
    const geometria = geometriaDeUnBultoDeLaPlaza(bulto);
    propias.push(geometria);
    aFundir.push({ geometria, matriz: matrizDeLaPlaza(bulto.x, bulto.y, bulto.z, bulto.giro, 1) });
  }

  const geometriaFundida = fundir(aFundir);
  if (geometriaFundida !== null) propias.push(geometriaFundida);
  const fundido = geometriaFundida === null || material === null ? null : { geometria: geometriaFundida, material };
  const indice = geometriaFundida?.getIndex() ?? null;
  const triangulosFundidos =
    geometriaFundida === null
      ? 0
      : indice !== null
        ? indice.count / 3
        : (geometriaFundida.getAttribute('position') as THREE.BufferAttribute).count / 3;

  /*
   * EL ESTANDARTE, A GRIS Y UNA SOLA VEZ.
   *
   * Es una pieza teñida ENTERA (`PIEZAS_TENIDAS_ENTERAS` de `burgo/piezas.ts`), así que
   * se prepara guardando en cada vértice su luminancia relativa al azul del pack y se
   * pinta con `instanceColor`: una `InstancedMesh` para los seis, con seis colores. Se
   * mide contra `AZUL_DE_LAS_FICHAS` —el azul de Board Game Bits, que es de donde sale
   * este banderín— y no contra el del hexagonal.
   */
  let estandarte: MundoDeLaPlaza['estandarte'] = null;
  {
    const partes = partesDe(PIEZA.bandera);
    const junta = unaGeometria(partes);
    if (junta !== null) {
      if (junta !== partes[0]?.geometria) propias.push(junta);
      const gris = geometriaAGris(junta, AZUL_DE_LAS_FICHAS);
      const suMaterial = partes[0]?.material ?? material;
      if (suMaterial !== null && suMaterial !== undefined) estandarte = { geometria: gris, material: suMaterial };
    }
  }

  return {
    fundido,
    estandarte,
    triangulosFundidos,
    desconocidas,
    soltar: () => {
      for (const g of propias) g.dispose();
    },
  };
}
