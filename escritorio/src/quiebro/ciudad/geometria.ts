/**
 * EL MOLDE: cómo se fabrica la geometría de la ciudad, fundida desde el principio.
 *
 * ═══ POR QUÉ UN ACUMULADOR Y NO `mergeGeometries` DE MIL CAJAS ═══
 *
 * La ciudad es estática y se pinta en pocas llamadas: todo lo que comparte material va en UNA
 * geometría. Fabricar una `BoxGeometry` por cornisa y fundirlas al final cuesta mil objetos, mil
 * listas de atributos y un fundido que copia todo otra vez; y `mergeGeometries` exige que todas
 * traigan exactamente los mismos atributos, que es justo lo que no pasa cuando una pieza lleva el
 * dato de la fachada y otra no. El molde escribe los vértices directamente en listas planas, con
 * los atributos propios de su material declarados al crearlo y un «valor actual» para cada uno, y
 * al final da una sola `BufferGeometry` indexada. `mergeGeometries` se sigue usando donde de verdad
 * se juntan piezas ya hechas (ver `ciudad.ts`).
 *
 * ═══ LAS COORDENADAS DE TEXTURA SON METROS ═══
 *
 * Los sombreadores de la ciudad son procedurales: la rejilla de ventanas, la baldosa y el ladrillo
 * se sacan de las UV. Por eso las UV van en METROS y con un convenio fijo: en una cara vertical, `u`
 * crece hacia la derecha de quien la mira de frente (la tangente `T = (n.z, 0, −n.x)`) empezando en
 * el borde izquierdo de la cara, y `v` es la altura de mundo; en una cara horizontal, `u = x`,
 * `v = z`. Así una ventana mide lo mismo en un edificio de 8 m que en uno de 40.
 *
 * Sin DOM y sin WebGL: el comprobador fabrica la ciudad entera en Node con esto.
 */
import * as THREE from 'three';

/** Un vector de tres, sin objetos. */
export type V3 = readonly [number, number, number];

/** Una lista tipada con sitio de sobra: crece al doble cuando se llena. */
function crecer(a: Float32Array, cabe: number): Float32Array<ArrayBuffer> {
  const b = new Float32Array(cabe);
  b.set(a);
  return b;
}

export class Molde {
  /*
   * Las listas son TIPADAS y crecen al doble: con listas de números de JavaScript, cada celda de la ciudad
   * abierta (que se construye a trozos mientras se juega) soltaba miles de reservas y el recolector paraba un
   * fotograma de vez en cuando uno o dos milisegundos. Los valores son los mismos: antes se pasaban a 32 bits
   * al hacer la geometría, ahora al escribirlos.
   */
  private cabenV = 256;
  private cabenI = 768;
  private nV = 0;
  private nI = 0;
  private pos = new Float32Array(3 * 256);
  private nor = new Float32Array(3 * 256);
  private uvs = new Float32Array(2 * 256);
  private col: Float32Array;
  private idx = new Uint32Array(768);
  private readonly extras = new Map<string, { tam: number; datos: Float32Array; actual: number[] }>();
  private readonly listaDeExtras: { tam: number; datos: Float32Array; actual: number[] }[] = [];
  private readonly conColor: boolean;
  private colorActual: V3 = [1, 1, 1];
  private matriz: THREE.Matrix4 | null = null;
  private matrizNormal: THREE.Matrix3 | null = null;
  /** Una matriz de normales por nivel de `con`, que se reutilizan (antes, una nueva por pieza). */
  private readonly normales: THREE.Matrix3[] = [];
  private profundidad = 0;
  private readonly v = new THREE.Vector3();

  /**
   * `extras`: los atributos propios del material, nombre → tamaño (1-4). `conColor`: si lleva
   * color por vértice.
   */
  constructor(extras: Readonly<Record<string, number>> = {}, conColor = false) {
    for (const [nombre, tam] of Object.entries(extras)) {
      const e = { tam, datos: new Float32Array(tam * 256), actual: new Array<number>(tam).fill(0) };
      this.extras.set(nombre, e);
      this.listaDeExtras.push(e);
    }
    this.conColor = conColor;
    this.col = new Float32Array(conColor ? 3 * 256 : 0);
  }

  private crecerV(): void {
    const cabe = this.cabenV * 2;
    this.pos = crecer(this.pos, cabe * 3);
    this.nor = crecer(this.nor, cabe * 3);
    this.uvs = crecer(this.uvs, cabe * 2);
    if (this.conColor) this.col = crecer(this.col, cabe * 3);
    for (const e of this.listaDeExtras) e.datos = crecer(e.datos, cabe * e.tam);
    this.cabenV = cabe;
  }

  private crecerI(): void {
    const cabe = this.cabenI * 2;
    const b = new Uint32Array(cabe);
    b.set(this.idx);
    this.idx = b;
    this.cabenI = cabe;
  }

  /** El valor que llevarán los vértices siguientes en el atributo `nombre`. */
  poner(nombre: string, ...valores: readonly number[]): this {
    const e = this.extras.get(nombre);
    if (e === undefined) throw new Error(`el molde no tiene el atributo ${nombre}`);
    for (let i = 0; i < e.tam; i++) e.actual[i] = valores[i] ?? 0;
    return this;
  }

  /** El color de los vértices siguientes (lineal). */
  color(r: number, g: number, b: number): this {
    this.colorActual = [r, g, b];
    return this;
  }

  /**
   * Lo que se añada dentro de `hacer` se transforma con `m` (posiciones y normales). No se anida:
   * una pieza se describe en su sitio local y se coloca una vez.
   */
  con(m: THREE.Matrix4, hacer: () => void): void {
    const antes = this.matriz;
    const antesN = this.matrizNormal;
    let n = this.normales[this.profundidad];
    if (n === undefined) {
      n = new THREE.Matrix3();
      this.normales[this.profundidad] = n;
    }
    this.profundidad++;
    this.matriz = m;
    this.matrizNormal = n.getNormalMatrix(m);
    try {
      hacer();
    } finally {
      this.profundidad--;
      this.matriz = antes;
      this.matrizNormal = antesN;
    }
  }

  /** Añade un vértice y devuelve su índice. */
  vertice(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number): number {
    if (this.nV >= this.cabenV) this.crecerV();
    const k = this.nV;
    const k3 = k * 3;
    if (this.matriz !== null && this.matrizNormal !== null) {
      this.v.set(x, y, z).applyMatrix4(this.matriz);
      this.pos[k3] = this.v.x;
      this.pos[k3 + 1] = this.v.y;
      this.pos[k3 + 2] = this.v.z;
      this.v.set(nx, ny, nz).applyMatrix3(this.matrizNormal).normalize();
      this.nor[k3] = this.v.x;
      this.nor[k3 + 1] = this.v.y;
      this.nor[k3 + 2] = this.v.z;
    } else {
      this.pos[k3] = x;
      this.pos[k3 + 1] = y;
      this.pos[k3 + 2] = z;
      this.nor[k3] = nx;
      this.nor[k3 + 1] = ny;
      this.nor[k3 + 2] = nz;
    }
    this.uvs[k * 2] = u;
    this.uvs[k * 2 + 1] = w;
    if (this.conColor) {
      this.col[k3] = this.colorActual[0];
      this.col[k3 + 1] = this.colorActual[1];
      this.col[k3 + 2] = this.colorActual[2];
    }
    for (const e of this.listaDeExtras) for (let i = 0; i < e.tam; i++) e.datos[k * e.tam + i] = e.actual[i] as number;
    this.nV = k + 1;
    return k;
  }

  tri(a: number, b: number, c: number): void {
    if (this.nI + 3 > this.cabenI) this.crecerI();
    this.idx[this.nI] = a;
    this.idx[this.nI + 1] = b;
    this.idx[this.nI + 2] = c;
    this.nI += 3;
  }

  /**
   * Un cuadrilátero plano de cuatro esquinas en sentido ANTIHORARIO visto desde el lado de `n`,
   * con sus cuatro UV.
   */
  quad(p0: V3, p1: V3, p2: V3, p3: V3, n: V3, uv: readonly [number, number, number, number, number, number, number, number]): void {
    const a = this.vertice(p0[0], p0[1], p0[2], n[0], n[1], n[2], uv[0], uv[1]);
    const b = this.vertice(p1[0], p1[1], p1[2], n[0], n[1], n[2], uv[2], uv[3]);
    const c = this.vertice(p2[0], p2[1], p2[2], n[0], n[1], n[2], uv[4], uv[5]);
    const d = this.vertice(p3[0], p3[1], p3[2], n[0], n[1], n[2], uv[6], uv[7]);
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  /**
   * Una cara vertical de un muro: el segmento en planta de (xa, za) a (xb, zb) VISTO DE FRENTE de
   * izquierda a derecha, de y0 a y1. La normal sale hacia quien la mira. UV en metros (ver cabecera);
   * `u0` es la `u` del borde izquierdo.
   */
  muro(xa: number, za: number, xb: number, zb: number, y0: number, y1: number, u0 = 0): void {
    const dx = xb - xa;
    const dz = zb - za;
    const largo = Math.hypot(dx, dz);
    if (largo < 1e-6 || y1 - y0 < 1e-6) return;
    /* T = (n.z, 0, −n.x) ⇒ n = (−T.z, 0, T.x). */
    const tx = dx / largo;
    const tz = dz / largo;
    const n: V3 = [-tz, 0, tx];
    this.quad(
      [xa, y0, za],
      [xb, y0, zb],
      [xb, y1, zb],
      [xa, y1, za],
      n,
      [u0, y0, u0 + largo, y0, u0 + largo, y1, u0, y1],
    );
  }

  /** Una cara horizontal (arriba si `arriba`), con UV = (x, z). */
  losa(x0: number, z0: number, x1: number, z1: number, y: number, arriba = true): void {
    if (arriba) {
      this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [x0, z1, x1, z1, x1, z0, x0, z0]);
    } else {
      this.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, -1, 0], [x0, z0, x1, z0, x1, z1, x0, z1]);
    }
  }

  /**
   * Una caja alineada con los ejes. `caras` elige cuáles (por defecto las seis): n s e o arriba abajo.
   */
  caja(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    caras: string = 'nseoab',
  ): void {
    /* Norte (−z): mirada desde el norte, la izquierda es el este. */
    if (caras.includes('n')) this.muro(x1, z0, x0, z0, y0, y1);
    if (caras.includes('s')) this.muro(x0, z1, x1, z1, y0, y1);
    if (caras.includes('e')) this.muro(x1, z1, x1, z0, y0, y1);
    if (caras.includes('o')) this.muro(x0, z0, x0, z1, y0, y1);
    if (caras.includes('a')) this.losa(x0, z0, x1, z1, y1, true);
    if (caras.includes('b')) this.losa(x0, z0, x1, z1, y0, false);
  }

  /**
   * Un cilindro (o tronco de cono) vertical de `lados` caras, de y0 a y1, con tapas opcionales.
   * UV: `u` = ángulo × radio (metros de perímetro), `v` = y.
   */
  cilindro(cx: number, cz: number, y0: number, y1: number, r0: number, r1: number, lados: number, tapas = true): void {
    const base: number[] = [];
    const cima: number[] = [];
    const inclinacion = (r0 - r1) / Math.max(1e-6, y1 - y0);
    for (let i = 0; i <= lados; i++) {
      const a = (i / lados) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const nl = Math.hypot(1, inclinacion);
      const nx = c / nl;
      const ny = inclinacion / nl;
      const nz = s / nl;
      const u = a * Math.max(r0, r1);
      base.push(this.vertice(cx + c * r0, y0, cz + s * r0, nx, ny, nz, u, y0));
      cima.push(this.vertice(cx + c * r1, y1, cz + s * r1, nx, ny, nz, u, y1));
    }
    for (let i = 0; i < lados; i++) {
      const a = base[i] as number;
      const b = base[i + 1] as number;
      const c = cima[i + 1] as number;
      const d = cima[i] as number;
      /* Visto desde fuera, el ángulo crece hacia la izquierda con z al sur: a, d, c y a, c, b. */
      this.tri(a, d, c);
      this.tri(a, c, b);
    }
    if (tapas) {
      const centroA = this.vertice(cx, y1, cz, 0, 1, 0, cx, cz);
      const centroB = this.vertice(cx, y0, cz, 0, -1, 0, cx, cz);
      const anilloA: number[] = [];
      const anilloB: number[] = [];
      for (let i = 0; i <= lados; i++) {
        const a = (i / lados) * Math.PI * 2;
        const x = cx + Math.cos(a) * r1;
        const z = cz + Math.sin(a) * r1;
        anilloA.push(this.vertice(x, y1, z, 0, 1, 0, x, z));
        const xb = cx + Math.cos(a) * r0;
        const zb = cz + Math.sin(a) * r0;
        anilloB.push(this.vertice(xb, y0, zb, 0, -1, 0, xb, zb));
      }
      for (let i = 0; i < lados; i++) {
        this.tri(centroA, anilloA[i + 1] as number, anilloA[i] as number);
        this.tri(centroB, anilloB[i] as number, anilloB[i + 1] as number);
      }
    }
  }

  /**
   * Un tubo a lo largo de una polilínea en 3D, de sección circular de `lados`. Para barandillas,
   * brazos de farola y el cable del auricular. Sin tapas.
   */
  tubo(puntos: readonly V3[], radio: number, lados: number): void {
    if (puntos.length < 2) return;
    const anillos: number[][] = [];
    const t = new THREE.Vector3();
    const n = new THREE.Vector3();
    const b = new THREE.Vector3();
    const arriba = new THREE.Vector3(0, 1, 0);
    let acumulado = 0;
    for (let i = 0; i < puntos.length; i++) {
      const p = puntos[i] as V3;
      const prev = puntos[Math.max(0, i - 1)] as V3;
      const next = puntos[Math.min(puntos.length - 1, i + 1)] as V3;
      t.set(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize();
      if (i > 0) {
        const q = puntos[i - 1] as V3;
        acumulado += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      }
      n.crossVectors(t, Math.abs(t.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : arriba).normalize();
      b.crossVectors(t, n).normalize();
      const anillo: number[] = [];
      for (let k = 0; k <= lados; k++) {
        const a = (k / lados) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const nx = n.x * c + b.x * s;
        const ny = n.y * c + b.y * s;
        const nz = n.z * c + b.z * s;
        anillo.push(this.vertice(p[0] + nx * radio, p[1] + ny * radio, p[2] + nz * radio, nx, ny, nz, (k / lados) * radio * 6.283, acumulado));
      }
      anillos.push(anillo);
    }
    for (let i = 0; i < anillos.length - 1; i++) {
      const a = anillos[i] as number[];
      const c = anillos[i + 1] as number[];
      for (let k = 0; k < lados; k++) {
        this.tri(a[k] as number, a[k + 1] as number, c[k + 1] as number);
        this.tri(a[k] as number, c[k + 1] as number, c[k] as number);
      }
    }
  }

  /**
   * UN PERFIL EXTRUIDO: un polígono en el plano XY (x a lo largo, y arriba) estirado en Z de `z0` a
   * `z1`. Es la forma de un coche, de un banco o de una marquesina vistos de lado. `tapas` pone las
   * dos caras del polígono; `lados(i)` elige qué aristas del contorno llevan su franja (la arista i
   * va del punto i al i+1), para repartir un mismo perfil entre moldes: la chapa en uno, el cristal
   * en otro. El polígono puede venir en cualquier sentido; se da la vuelta si hace falta.
   */
  perfil(
    puntos: readonly (readonly [number, number])[],
    z0: number,
    z1: number,
    opciones: { readonly tapas?: boolean; readonly lados?: (i: number) => boolean } = {},
  ): void {
    let area = 0;
    for (let i = 0; i < puntos.length; i++) {
      const a = puntos[i] as readonly [number, number];
      const b = puntos[(i + 1) % puntos.length] as readonly [number, number];
      area += a[0] * b[1] - b[0] * a[1];
    }
    const ccw = area > 0 ? [...puntos] : [...puntos].reverse();
    const indiceOriginal = (i: number): number => (area > 0 ? i : (puntos.length - 2 - i + puntos.length) % puntos.length);
    if (opciones.tapas !== false) {
      const contorno = ccw.map(([x, y]) => new THREE.Vector2(x, y));
      const tris = THREE.ShapeUtils.triangulateShape(contorno, []);
      const delante: number[] = [];
      const detras: number[] = [];
      for (const [x, y] of ccw) {
        delante.push(this.vertice(x, y, z1, 0, 0, 1, x, y));
        detras.push(this.vertice(x, y, z0, 0, 0, -1, x, y));
      }
      for (const t of tris) {
        /* Earcut no promete el sentido de sus triángulos: se mira cada uno y se le da la vuelta si hace falta. */
        const [a, b, c] = t as [number, number, number];
        const pa = ccw[a] as readonly [number, number];
        const pb = ccw[b] as readonly [number, number];
        const pc = ccw[c] as readonly [number, number];
        const giro = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
        const [i, j, k] = giro >= 0 ? [a, b, c] : [a, c, b];
        this.tri(delante[i] as number, delante[j] as number, delante[k] as number);
        this.tri(detras[i] as number, detras[k] as number, detras[j] as number);
      }
    }
    for (let i = 0; i < ccw.length; i++) {
      if (opciones.lados !== undefined && !opciones.lados(indiceOriginal(i))) continue;
      const a = ccw[i] as readonly [number, number];
      const b = ccw[(i + 1) % ccw.length] as readonly [number, number];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy);
      if (l < 1e-6) continue;
      const n: V3 = [dy / l, -dx / l, 0];
      this.quad([a[0], a[1], z1], [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], n, [0, 0, z1 - z0, 0, z1 - z0, l, 0, l]);
    }
  }

  /** Triángulos escritos hasta ahora. */
  get triangulos(): number {
    return this.nI / 3;
  }

  get vacio(): boolean {
    return this.nI === 0;
  }

  /** Los atributos que escribe este molde, en el orden en que `volcar` los da. */
  atributos(): readonly AtributoDelMolde[] {
    const lista: AtributoDelMolde[] = [
      { nombre: 'position', tam: 3 },
      { nombre: 'normal', tam: 3 },
      { nombre: 'uv', tam: 2 },
    ];
    if (this.conColor) lista.push({ nombre: 'color', tam: 3 });
    for (const [nombre, e] of this.extras) lista.push({ nombre, tam: e.tam });
    return lista;
  }

  /**
   * LO ESCRITO, EN LISTAS TIPADAS y sin `BufferGeometry`: lo que guarda una celda de la ventana (ver
   * `celdas.ts`) para copiarlo a trozos en la mitad de atrás de la malla de su familia. Mismo orden de
   * atributos que `atributos()`.
   */
  volcar(): GeometriaVolcada {
    const n = this.nV;
    const datos = new Map<string, Float32Array>();
    datos.set('position', this.pos.slice(0, n * 3));
    datos.set('normal', this.nor.slice(0, n * 3));
    datos.set('uv', this.uvs.slice(0, n * 2));
    if (this.conColor) datos.set('color', this.col.slice(0, n * 3));
    for (const [nombre, e] of this.extras) datos.set(nombre, e.datos.slice(0, n * e.tam));
    return { vertices: n, atributos: this.atributos(), datos, indices: this.idx.slice(0, this.nI) };
  }

  /** La geometría indexada, con `position`, `normal`, `uv`, `color` si lo lleva, y los extras. */
  geometria(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    const n = this.nV;
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor.slice(0, n * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uvs.slice(0, n * 2), 2));
    if (this.conColor) g.setAttribute('color', new THREE.BufferAttribute(this.col.slice(0, n * 3), 3));
    for (const [nombre, e] of this.extras) g.setAttribute(nombre, new THREE.BufferAttribute(e.datos.slice(0, n * e.tam), e.tam));
    const indices = this.idx.subarray(0, this.nI);
    g.setIndex(n > 65535 ? new THREE.BufferAttribute(indices.slice(), 1) : new THREE.BufferAttribute(Uint16Array.from(indices), 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

/** Un atributo de un molde: su nombre en el sombreador y cuántos números lleva por vértice. */
export interface AtributoDelMolde {
  readonly nombre: string;
  readonly tam: number;
}

/** Lo que `Molde.volcar` devuelve: los vértices, cada atributo en su lista y los índices. */
export interface GeometriaVolcada {
  readonly vertices: number;
  readonly atributos: readonly AtributoDelMolde[];
  readonly datos: ReadonlyMap<string, Float32Array>;
  readonly indices: Uint32Array;
}

/**
 * UN MOLDE QUE NO GUARDA NADA: recorre los mismos constructores (las mismas matrices, los mismos
 * sorteos por hash) sin escribir un solo vértice. Sirve para sacar las FUENTES DE LUZ de una celda que
 * no está en la ventana —la luz horneada llega más lejos que el detalle— con las mismas cuentas que
 * cuando se construye de verdad, sin copiar la lógica de cada pieza en otro sitio.
 */
export class MoldeQueNoGuarda extends Molde {
  override vertice(): number {
    return 0;
  }

  override tri(): void {
    /* nada */
  }

  override con(_m: THREE.Matrix4, hacer: () => void): void {
    hacer();
  }
}

/**
 * RELLENA LAS INSTANCIAS de una malla instanciada con listas nuevas (una por atributo instanciado, ya en su
 * forma) y deja `count` en `cuantas`. Si una lista no cabe en su atributo, el atributo se cambia por uno
 * más grande (con holgura, para que no vuelva a pasar al andar). Lo usan las piezas que siguen a la ventana
 * de celdas —tarjetas, halos, vapor y haces—: su llamada es la misma, sólo cambia lo que llevan dentro.
 */
export function rellenarInstancias(malla: THREE.InstancedMesh, datos: Readonly<Record<string, Float32Array>>, cuantas: number): void {
  const g = malla.geometry;
  for (const [nombre, lista] of Object.entries(datos)) {
    const a = g.getAttribute(nombre) as THREE.InstancedBufferAttribute | undefined;
    if (a === undefined) throw new Error(`la malla ${malla.name} no tiene el atributo ${nombre}`);
    if (lista.length <= a.array.length) {
      (a.array as Float32Array).set(lista);
      a.clearUpdateRanges();
      a.addUpdateRange(0, Math.max(a.itemSize, lista.length));
      a.needsUpdate = true;
    } else {
      const nuevo = new THREE.InstancedBufferAttribute(new Float32Array(Math.ceil((lista.length / a.itemSize) * 1.5) * a.itemSize), a.itemSize);
      nuevo.setUsage(THREE.DynamicDrawUsage);
      nuevo.array.set(lista);
      g.setAttribute(nombre, nuevo);
    }
  }
  malla.count = cuantas;
}

/** Los triángulos que pinta una geometría (indexada o no). */
export function triangulosDe(g: THREE.BufferGeometry): number {
  const indice = g.getIndex();
  if (indice !== null) return indice.count / 3;
  const pos = g.getAttribute('position');
  return pos === undefined ? 0 : pos.count / 3;
}

/** ¿Hay algún NaN o infinito en los atributos de una geometría? Devuelve el nombre del primero. */
export function atributoRoto(g: THREE.BufferGeometry): string | null {
  for (const [nombre, atributo] of Object.entries(g.attributes)) {
    const datos = (atributo as THREE.BufferAttribute).array;
    for (let i = 0; i < datos.length; i++) {
      if (!Number.isFinite(datos[i] as number)) return nombre;
    }
  }
  return null;
}
