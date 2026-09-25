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
 *
 * ═══ LAS PRIMITIVAS DE OFICIO (torno, caja biselada, perfil suave, seccionado, cornisa) ═══
 *
 * Las piezas de la ciudad eran cajas, cilindros y perfiles de caras planas: un banco de fundición era
 * un cajón y una farola, tres conos. Estas cinco dan la forma de oficio SIN salirse del molde:
 *
 *   · `torno`: una superficie de revolución (basas, fustes, tazas, balaustres, estatuas).
 *   · `cajaBiselada`: la caja con sus doce aristas en chaflán y sus ocho esquinas (44 triángulos).
 *   · `perfil(…, { suave })`: el perfil de siempre con las normales promediadas donde la curva es curva.
 *   · `seccionado`: el «loft», secciones puestas a lo largo de x y cosidas (coche, tren).
 *   · `extruirPerfil`: un perfil corrido a lo largo de un camino, con ingletes en las esquinas (cornisas).
 *
 * Las cinco escriben SÓLO con `vertice` y `tri` (y `caja` en el caso degenerado de la biselada), sin
 * mirar lo que devuelven más que para coser sus propios triángulos, así que valen igual en
 * `MoldeQueNoGuarda`: la luz de una celda se saca con las mismas cuentas que su geometría. Las UV van en
 * metros con el convenio de arriba (`v` a lo largo del contorno arranca en la altura de su primer punto,
 * así que en un tramo vertical es la altura de mundo). `verify:quiebro-molde` comprueba el sentido de
 * cada triángulo contra su normal, el volumen de las cerradas, las UV y el recuento de cada una contra
 * su fórmula (`triangulosDel…`), y cuenta lo que cuesta cada triángulo en CPU contra `caja` y `cilindro`
 * (la tabla, contada y no cronometrada, es `TABLA_DE_COSTE` de `scripts/verificar-quiebro-molde.ts`: con
 * matriz, el torno cuesta 0,45 cajas por triángulo, la biselada 1,11 y el seccionado 1,33).
 *
 * EL SENTIDO DE LOS CONTORNOS, uno para todas: un contorno plano se recorre con LA MATERIA A LA
 * IZQUIERDA (antihorario alrededor de la sección, con el primer eje a la derecha y el segundo arriba), y
 * la normal de cada tramo es la de su derecha, `(dy, −dx)`. En el torno el plano es (r, y) y se sube por
 * fuera; en la cornisa es (fuera, arriba) y se sale de la pared por abajo y se vuelve por arriba; en el
 * seccionado es (z, y). Así un contorno que vuelve al eje (el torno) o a la pared (la cornisa) cierra.
 */
import * as THREE from 'three';

/** Un vector de tres, sin objetos. */
export type V3 = readonly [number, number, number];

/** Un punto de un contorno plano: (r, y) en el torno, (fuera, arriba) en la cornisa, (z, y) en una sección. */
export type P2 = readonly [number, number];

/** Una sección del `seccionado`: su polígono en el plano (z, y), puesto en `x`. */
export interface SeccionDelMolde {
  readonly x: number;
  readonly puntos: readonly P2[];
}

/**
 * El ángulo por debajo del cual dos tramos seguidos de un contorno comparten normal (se ven como una
 * curva) en `torno`, `perfil`, `seccionado` y `extruirPerfil`. Por encima, arista viva.
 */
export const SUAVE_POR_DEFECTO = Math.PI / 4;

/** Un tramo más corto que esto no existe: se salta, y a su lado la normal no se promedia. */
const TRAMO_NULO = 1e-6;

/** Un radio de torno por debajo de esto está en el eje: su anillo es un punto y el tramo, un abanico. */
const EN_EL_EJE = 1e-6;

const RAIZ_DE_UN_TERCIO = 1 / Math.sqrt(3);

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
   *
   * `suave` (un ángulo): las franjas llevan en cada punto la normal promediada de sus dos aristas si
   * éstas se tuercen menos que eso (una marquesina curva, el lomo de un coche), y `v` corre SEGUIDA a lo
   * largo del contorno (metros desde el primer punto, con su costura al cerrar), así que una curva
   * hecha de tramos se pinta como una curva. Sin `suave`, lo de siempre byte a byte: cada franja plana
   * y su `v` desde cero. Triángulos: `triangulosDelPerfil`.
   */
  perfil(
    puntos: readonly (readonly [number, number])[],
    z0: number,
    z1: number,
    opciones: { readonly tapas?: boolean; readonly lados?: (i: number) => boolean; readonly suave?: number } = {},
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
    if (opciones.suave !== undefined) {
      const lados = opciones.lados;
      this.lateralesSuaves(ccw, z0, z1, opciones.suave, lados === undefined ? null : (i) => lados(indiceOriginal(i)));
      return;
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

  /** Las franjas del `perfil` con `suave`: el polígono ya viene antihorario. `dibujar(i)`: la arista i sí. */
  private lateralesSuaves(
    ccw: readonly (readonly [number, number])[],
    z0: number,
    z1: number,
    suave: number,
    dibujar: ((i: number) => boolean) | null,
  ): void {
    const m = ccw.length;
    const { nr: nx, ny, largo, acumulado, entra, sale } = normalesDelContorno(ccw, true, suave);
    const ancho = z1 - z0;
    for (let i = 0; i < m; i++) {
      if ((dibujar !== null && !dibujar(i)) || (largo[i] as number) < TRAMO_NULO) continue;
      const a = ccw[i] as readonly [number, number];
      const b = ccw[(i + 1) % m] as readonly [number, number];
      const j = (i + 1) % m;
      const na = sale[i] as number;
      const nb = entra[j] as number;
      const va = acumulado[i] as number;
      const vb = acumulado[i + 1] as number;
      const nax = nx[na] as number;
      const nay = ny[na] as number;
      const nbx = nx[nb] as number;
      const nby = ny[nb] as number;
      const p0 = this.vertice(a[0], a[1], z1, nax, nay, 0, 0, va);
      const p1 = this.vertice(a[0], a[1], z0, nax, nay, 0, ancho, va);
      const p2 = this.vertice(b[0], b[1], z0, nbx, nby, 0, ancho, vb);
      const p3 = this.vertice(b[0], b[1], z1, nbx, nby, 0, 0, vb);
      this.tri(p0, p1, p2);
      this.tri(p0, p2, p3);
    }
  }

  /**
   * EL TORNO: la superficie de revolución del `contorno` (puntos (r, y), subiendo por fuera: ver la
   * cabecera) alrededor del eje vertical que pasa por (cx, cz), en `lados` sectores.
   *
   * - Normales: alrededor del eje, siempre suaves (como `cilindro`); a lo largo del contorno, promediadas
   *   entre dos tramos que se tuercen menos que `suave` (por defecto `SUAVE_POR_DEFECTO`) y vivas si no.
   * - Un punto en el eje (r = 0) cierra su tramo en abanico: un triángulo por sector, ninguno degenerado.
   * - `tapas` (por defecto sí): un disco en el primer punto (mirando abajo) y otro en el último (mirando
   *   arriba) si no están en el eje. Un contorno que empieza y acaba en el eje ya es cerrado.
   * - UV: `u` = ángulo × el radio mayor del contorno (como `cilindro`), con costura en el ángulo 0; `v` =
   *   la altura del primer punto más lo recorrido por el contorno, seguido de tramo a tramo. Tapas en (x, z).
   *   Donde el radio es r, la `u` va apretada R/r (×2 en el balaustre del comprobador). Una `u` por anillo
   *   (ángulo × r de cada anillo) no aprieta pero TUERCE: la franja entre dos radios distintos se inclina
   *   hacia la costura, y contado en el comprobador sale peor (×4,05 el balaustre, ×6,18 la taza, contra
   *   ×2,02). Una pieza con radios muy distintos que lleve dibujo en la `u` (una farola de basa ancha y
   *   fuste fino) se hace con DOS tornos, cada uno con su radio mayor.
   *
   * Triángulos (`triangulosDelTorno`): por tramo, 2·lados, o `lados` si un extremo está en el eje, o 0 si
   * lo están los dos (o mide cero); más `lados` por tapa. Vértices: lados + 1 por anillo (`lados` si está en
   * el eje), un anillo por punto donde la unión es suave y dos donde es viva; y lados + 1 por tapa.
   */
  torno(
    cx: number,
    cz: number,
    contorno: readonly P2[],
    lados: number,
    opciones: { readonly suave?: number; readonly tapas?: boolean } = {},
  ): void {
    const n = contorno.length;
    if (n < 2 || lados < 3) return;
    let radioDeU = 0;
    for (const p of contorno) radioDeU = Math.max(radioDeU, p[0]);
    if (radioDeU <= EN_EL_EJE) return;
    /* Los senos y cosenos, una vez por torno: en el último sector se repite el primero exacto, para que
       la costura cierre sin una rendija de redondeo. */
    const cos = new Float64Array(lados + 1);
    const sen = new Float64Array(lados + 1);
    for (let k = 0; k < lados; k++) {
      const a = (k / lados) * Math.PI * 2;
      cos[k] = Math.cos(a);
      sen[k] = Math.sin(a);
    }
    cos[lados] = cos[0] as number;
    sen[lados] = sen[0] as number;
    const paso = (Math.PI * 2) / lados;
    const { nr, ny, largo, acumulado, entra, sale } = normalesDelContorno(contorno, false, opciones.suave ?? SUAVE_POR_DEFECTO);
    const y0 = (contorno[0] as P2)[1];
    let anillo0: number[] = [];
    let anillo1: number[] = [];
    /* El tramo anterior se escribió y acaba donde empieza éste: su anillo de arriba vale de anillo de abajo. */
    let anterior = -1;
    for (let s = 0; s < n - 1; s++) {
      if ((largo[s] as number) < TRAMO_NULO) continue;
      const p0 = contorno[s] as P2;
      const p1 = contorno[s + 1] as P2;
      const eje0 = p0[0] <= EN_EL_EJE;
      const eje1 = p1[0] <= EN_EL_EJE;
      if (eje0 && eje1) continue;
      const v0 = y0 + (acumulado[s] as number);
      const v1 = y0 + (acumulado[s + 1] as number);
      /* En una unión suave los dos tramos llevan la MISMA normal (el mismo índice), la misma u y la misma v:
         los vértices serían idénticos, así que se comparten. */
      if (!(anterior === s - 1 && !eje0 && entra[s] === sale[s])) {
        this.anilloDelTorno(anillo0, cx, cz, p0, sale[s] as number, nr, ny, v0, lados, cos, sen, paso, radioDeU, eje0);
      }
      this.anilloDelTorno(anillo1, cx, cz, p1, entra[s + 1] as number, nr, ny, v1, lados, cos, sen, paso, radioDeU, eje1);
      anterior = s;
      for (let k = 0; k < lados; k++) {
        /* a, b abajo (ángulo k y k+1); d, c arriba. Visto desde fuera: a, d, c y a, c, b. */
        const a = anillo0[k] as number;
        const d = anillo1[k] as number;
        if (eje0) {
          this.tri(a, d, anillo1[k + 1] as number);
        } else if (eje1) {
          this.tri(a, d, anillo0[k + 1] as number);
        } else {
          const b = anillo0[k + 1] as number;
          const c = anillo1[k + 1] as number;
          this.tri(a, d, c);
          this.tri(a, c, b);
        }
      }
      const cambio = anillo0;
      anillo0 = anillo1;
      anillo1 = cambio;
    }
    if (opciones.tapas === false) return;
    const primero = contorno[0] as P2;
    const ultimo = contorno[n - 1] as P2;
    if (primero[0] > EN_EL_EJE) this.discoDelTorno(cx, cz, primero[0], primero[1], false, lados, cos, sen);
    if (ultimo[0] > EN_EL_EJE) this.discoDelTorno(cx, cz, ultimo[0], ultimo[1], true, lados, cos, sen);
  }

  /**
   * Un anillo del torno en `lista` (se vacía antes). En el eje, `lados` vértices en el centro de cada
   * sector (el vértice del abanico lleva la normal y la `u` de su sector); si no, `lados + 1`.
   */
  private anilloDelTorno(
    lista: number[],
    cx: number,
    cz: number,
    p: P2,
    normal: number,
    nr: Float64Array,
    ny: Float64Array,
    v: number,
    lados: number,
    cos: Float64Array,
    sen: Float64Array,
    paso: number,
    radioDeU: number,
    enElEje: boolean,
  ): void {
    lista.length = 0;
    const r = p[0];
    const y = p[1];
    const qr = nr[normal] as number;
    const qy = ny[normal] as number;
    if (enElEje) {
      for (let k = 0; k < lados; k++) {
        const a = (k + 0.5) * paso;
        const c = Math.cos(a);
        const s = Math.sin(a);
        lista.push(this.vertice(cx, y, cz, qr * c, qy, qr * s, a * radioDeU, v));
      }
      return;
    }
    for (let k = 0; k <= lados; k++) {
      const c = cos[k] as number;
      const s = sen[k] as number;
      lista.push(this.vertice(cx + c * r, y, cz + s * r, qr * c, qy, qr * s, k * paso * radioDeU, v));
    }
  }

  /** Una tapa del torno: el disco de radio `r` en `y`, mirando arriba o abajo, con UV = (x, z). */
  private discoDelTorno(cx: number, cz: number, r: number, y: number, arriba: boolean, lados: number, cos: Float64Array, sen: Float64Array): void {
    const ny = arriba ? 1 : -1;
    const centro = this.vertice(cx, y, cz, 0, ny, 0, cx, cz);
    const primero = this.vertice(cx + r, y, cz, 0, ny, 0, cx + r, cz);
    let antes = primero;
    for (let k = 1; k <= lados; k++) {
      const x = cx + (cos[k] as number) * r;
      const z = cz + (sen[k] as number) * r;
      const este = k === lados ? primero : this.vertice(x, y, z, 0, ny, 0, x, z);
      if (arriba) this.tri(centro, este, antes);
      else this.tri(centro, antes, este);
      antes = este;
    }
  }

  /**
   * LA CAJA BISELADA: la caja de `caja` con sus aristas en chaflán de `bisel` metros (a 45°) y sus
   * esquinas cortadas por un triángulo. Con las seis caras son 44 triángulos: 6 caras × 2, 12 chaflanes
   * × 2 y 8 esquinas. `caras` elige cuáles, como en `caja`: una cara que falta deja abierto su lado, y las
   * caras y chaflanes que llegan a él llegan hasta el borde de la caja (una caja sin fondo posada en el
   * suelo no enseña rendija). En general `triangulosDeLaCajaBiselada(caras)` = 2·caras + 2·(aristas con
   * sus dos caras) + (esquinas con sus tres caras).
   *
   * `alChaflan(true)` se llama antes de escribir chaflanes y esquinas y `alChaflan(false)` antes de las
   * caras y al acabar: es donde quien la usa pone el bit de chaflán del acabado (`molde.poner`), para que
   * el sombreador gaste el canto. El bisel se recorta a lo que cabe (0,49 del lado menor); sin bisel es la
   * `caja` de siempre. UV de cada cara por el convenio de la cabecera (chaflanes y esquinas, como la cara
   * vertical que les da la tangente horizontal de su normal).
   */
  cajaBiselada(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    bisel: number,
    caras: string = 'nseoab',
    opciones: { readonly alChaflan?: (enChaflan: boolean) => void } = {},
  ): void {
    const b = Math.min(bisel, 0.49 * Math.min(x1 - x0, y1 - y0, z1 - z0));
    const avisar = opciones.alChaflan;
    if (!(b > TRAMO_NULO)) {
      avisar?.(false);
      this.caja(x0, y0, z0, x1, y1, z1, caras);
      return;
    }
    const lo = [x0, y0, z0];
    const hi = [x1, y1, z1];
    /* hay[eje][0] es la cara del lado menor de ese eje; hay[eje][1], la del mayor. x: o/e, y: b/a, z: n/s. */
    const hay = [
      [caras.includes('o'), caras.includes('e')],
      [caras.includes('b'), caras.includes('a')],
      [caras.includes('n'), caras.includes('s')],
    ];
    const hayCara = (eje: number, lado: number): boolean => (hay[eje] as boolean[])[lado] as boolean;
    const borde = (eje: number, lado: number): number => (lado === 1 ? (hi[eje] as number) : (lo[eje] as number));
    /* Hasta dónde llega una cara por el lado `lado` del eje `eje`: el borde menos el bisel si ahí hay otra cara. */
    const dentro = (eje: number, lado: number): number =>
      lado === 1 ? (hi[eje] as number) - (hayCara(eje, 1) ? b : 0) : (lo[eje] as number) + (hayCara(eje, 0) ? b : 0);
    const punto = (e: number, ve: number, f: number, vf: number, g: number, vg: number): V3 => {
      const p = [0, 0, 0];
      p[e] = ve;
      p[f] = vf;
      p[g] = vg;
      return p as unknown as V3;
    };
    avisar?.(false);
    for (let e = 0; e < 3; e++) {
      for (let lado = 0; lado < 2; lado++) {
        if (!hayCara(e, lado)) continue;
        const f = (e + 1) % 3;
        const g = (e + 2) % 3;
        const c = borde(e, lado);
        const n = [0, 0, 0];
        n[e] = lado === 1 ? 1 : -1;
        this.caraPlana(
          [
            punto(e, c, f, dentro(f, 0), g, dentro(g, 0)),
            punto(e, c, f, dentro(f, 1), g, dentro(g, 0)),
            punto(e, c, f, dentro(f, 1), g, dentro(g, 1)),
            punto(e, c, f, dentro(f, 0), g, dentro(g, 1)),
          ],
          n as unknown as V3,
        );
      }
    }
    avisar?.(true);
    /* Los chaflanes: uno por arista con sus dos caras, a lo largo del tercer eje. */
    for (let e = 0; e < 3; e++) {
      for (let f = e + 1; f < 3; f++) {
        const g = 3 - e - f;
        for (let le = 0; le < 2; le++) {
          for (let lf = 0; lf < 2; lf++) {
            if (!hayCara(e, le) || !hayCara(f, lf)) continue;
            const n = [0, 0, 0];
            n[e] = le === 1 ? Math.SQRT1_2 : -Math.SQRT1_2;
            n[f] = lf === 1 ? Math.SQRT1_2 : -Math.SQRT1_2;
            const g0 = dentro(g, 0);
            const g1 = dentro(g, 1);
            this.caraPlana(
              [
                punto(e, borde(e, le), f, dentro(f, lf), g, g0),
                punto(e, borde(e, le), f, dentro(f, lf), g, g1),
                punto(e, dentro(e, le), f, borde(f, lf), g, g1),
                punto(e, dentro(e, le), f, borde(f, lf), g, g0),
              ],
              n as unknown as V3,
            );
          }
        }
      }
    }
    /* Las esquinas: un triángulo donde se juntan tres caras. */
    for (let lx = 0; lx < 2; lx++) {
      for (let ly = 0; ly < 2; ly++) {
        for (let lz = 0; lz < 2; lz++) {
          if (!hayCara(0, lx) || !hayCara(1, ly) || !hayCara(2, lz)) continue;
          const bx = borde(0, lx);
          const by = borde(1, ly);
          const bz = borde(2, lz);
          const dx = dentro(0, lx);
          const dy = dentro(1, ly);
          const dz = dentro(2, lz);
          this.caraPlana(
            [
              [bx, dy, dz],
              [dx, by, dz],
              [dx, dy, bz],
            ],
            [(lx === 1 ? 1 : -1) * RAIZ_DE_UN_TERCIO, (ly === 1 ? 1 : -1) * RAIZ_DE_UN_TERCIO, (lz === 1 ? 1 : -1) * RAIZ_DE_UN_TERCIO],
          );
        }
      }
    }
    avisar?.(false);
  }

  /**
   * Un polígono plano y convexo con sus puntos en orden (en cualquiera de los dos sentidos) y su normal
   * `n`: se escribe en abanico mirando hacia `n`, con UV por el convenio de la cabecera (horizontal: (x, z);
   * si no, `u` a lo largo de la tangente horizontal desde el borde izquierdo y `v` = altura).
   */
  private caraPlana(p: readonly V3[], n: V3): void {
    const horizontal = Math.abs(n[1]) > 0.999;
    let tx = 0;
    let tz = 0;
    let desde = 0;
    if (!horizontal) {
      const l = Math.hypot(n[0], n[2]);
      tx = n[2] / l;
      tz = -n[0] / l;
      desde = Infinity;
      for (const q of p) desde = Math.min(desde, q[0] * tx + q[2] * tz);
    }
    const a = p[0] as V3;
    const b = p[1] as V3;
    const c = p[2] as V3;
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const wx = c[0] - a[0];
    const wy = c[1] - a[1];
    const wz = c[2] - a[2];
    const derecho = (uy * wz - uz * wy) * n[0] + (uz * wx - ux * wz) * n[1] + (ux * wy - uy * wx) * n[2] >= 0;
    const indices: number[] = [];
    for (const q of p) {
      indices.push(this.vertice(q[0], q[1], q[2], n[0], n[1], n[2], horizontal ? q[0] : q[0] * tx + q[2] * tz - desde, horizontal ? q[2] : q[1]));
    }
    const i0 = indices[0] as number;
    for (let i = 1; i + 1 < indices.length; i++) {
      if (derecho) this.tri(i0, indices[i] as number, indices[i + 1] as number);
      else this.tri(i0, indices[i + 1] as number, indices[i] as number);
    }
  }

  /**
   * EL SECCIONADO (el «loft»): las `secciones`, polígonos en el plano (z, y) puestos a lo largo de x de
   * menos a más, cosidas punto a punto. Todas llevan los mismos puntos, en el mismo orden. Es el coche
   * visto desde delante, el vagón o una moldura que cambia de forma.
   *
   * - `cerrada` (por defecto sí): cada sección es un anillo; se le da la vuelta a todas si la primera
   *   viene horaria. Abierta, el contorno lleva la materia a su izquierda (ver la cabecera).
   * - Normales, decididas por ARISTA: a lo largo del anillo, suaves salvo en los puntos de `aristasVivas`
   *   (índices del contorno tal y como llega), tuerza lo que tuerza el anillo ahí: una esquina de 90° que
   *   no se declara sale redondeada, con una sola normal; de una sección a la siguiente, suaves si las dos
   *   caras se tuercen menos que `suave`. En cada punto, las caras unidas por aristas suaves forman un
   *   grupo y todo el grupo lleva la misma normal (la suma de las suyas); entre dos grupos, una arista
   *   viva. Una arista que mide cero en una sección cierra su franja en un solo triángulo.
   * - `tapas` (por defecto sí, si es cerrada): la primera sección mirando a −x y la última a +x.
   * - UV: `u` = x; `v` = lo recorrido por el anillo de su sección desde el primer punto (costura en él).
   *
   * Triángulos (`triangulosDelSeccionado`): 2 por franja (secciones − 1 por aristas del anillo), 1 donde
   * una de sus dos aristas mide cero y 0 donde miden cero las dos; más los de las tapas (n − 2 cada una en
   * un polígono simple de n puntos sin puntos alineados; los alineados los quita la triangulación).
   */
  seccionado(
    secciones: readonly SeccionDelMolde[],
    opciones: { readonly aristasVivas?: readonly number[]; readonly suave?: number; readonly tapas?: boolean; readonly cerrada?: boolean } = {},
  ): void {
    const ns = secciones.length;
    if (ns < 2) return;
    const cerrada = opciones.cerrada !== false;
    const np = (secciones[0] as SeccionDelMolde).puntos.length;
    if (np < (cerrada ? 3 : 2)) return;
    for (let s = 0; s < ns; s++) {
      const sec = secciones[s] as SeccionDelMolde;
      if (sec.puntos.length !== np) throw new Error('seccionado: todas las secciones llevan los mismos puntos');
      if (s > 0 && !(sec.x > (secciones[s - 1] as SeccionDelMolde).x)) throw new Error('seccionado: las secciones van de menos x a más x');
    }
    const alReves = cerrada && areaFirmada((secciones[0] as SeccionDelMolde).puntos) < 0;
    const punto = (s: number, k: number): P2 => (secciones[s] as SeccionDelMolde).puntos[alReves ? np - 1 - k : k] as P2;
    const vivas = new Set<number>();
    for (const i of opciones.aristasVivas ?? []) vivas.add(alReves ? np - 1 - i : i);
    const aristas = cerrada ? np : np - 1;
    const cosSuave = Math.cos(opciones.suave ?? SUAVE_POR_DEFECTO);
    /* Lo recorrido por el anillo de cada sección hasta cada punto (la v). */
    const recorrido = new Float64Array(ns * (np + 1));
    for (let s = 0; s < ns; s++) {
      for (let k = 0; k < np; k++) {
        const a = punto(s, k);
        const b = punto(s, (k + 1) % np);
        recorrido[s * (np + 1) + k + 1] = (recorrido[s * (np + 1) + k] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]);
      }
    }
    /* La normal de cada cara (franja s, arista k), de sus dos triángulos a, d, c y a, c, b. */
    const caras = (ns - 1) * aristas;
    const fx = new Float64Array(caras);
    const fy = new Float64Array(caras);
    const fz = new Float64Array(caras);
    const forma = new Uint8Array(caras); /* 0 nada, 1 sólo a d c, 2 sólo a c b, 3 los dos */
    /* Una sola lista de tres para todas las cuentas de normales: nada nuevo por cara ni por esquina. */
    const n3 = new Float64Array(3);
    for (let s = 0; s < ns - 1; s++) {
      const xa = (secciones[s] as SeccionDelMolde).x;
      const xd = (secciones[s + 1] as SeccionDelMolde).x;
      for (let k = 0; k < aristas; k++) {
        const pa = punto(s, k);
        const pb = punto(s, (k + 1) % np);
        const pc = punto(s + 1, (k + 1) % np);
        const pd = punto(s + 1, k);
        const abajoNula = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) < TRAMO_NULO;
        const arribaNula = Math.hypot(pc[0] - pd[0], pc[1] - pd[1]) < TRAMO_NULO;
        const f = s * aristas + k;
        forma[f] = abajoNula && arribaNula ? 0 : abajoNula ? 1 : arribaNula ? 2 : 3;
        /* Puntos en (x, y, z): a = (xa, pa.y, pa.z)… */
        n3.fill(0);
        if (forma[f] === 1 || forma[f] === 3) sumarNormal(n3, xa, pa[1], pa[0], xd, pd[1], pd[0], xd, pc[1], pc[0]);
        if (forma[f] === 2 || forma[f] === 3) sumarNormal(n3, xa, pa[1], pa[0], xd, pc[1], pc[0], xa, pb[1], pb[0]);
        const l = Math.hypot(n3[0] as number, n3[1] as number, n3[2] as number) || 1;
        fx[f] = (n3[0] as number) / l;
        fy[f] = (n3[1] as number) / l;
        fz[f] = (n3[2] as number) / l;
      }
    }
    const columna = (k: number): number => (cerrada ? (k + aristas) % aristas : k);
    const existe = (s: number, k: number): boolean => s >= 0 && s < ns - 1 && (cerrada || (k >= 0 && k < aristas));
    /*
     * La suavidad se decide por ARISTA, y es la misma vista desde sus dos caras: a lo largo del anillo
     * (la arista que va de sección a sección por el punto k), suave si k no es arista viva; entre dos
     * secciones (la arista del anillo en una sección), suave si las dos caras se tuercen menos que
     * `suave`. Alrededor de un punto hay hasta cuatro caras en abanico, en este orden:
     *
     *     0 = (gs − 1, gk − 1)   1 = (gs − 1, gk)   2 = (gs, gk)   3 = (gs, gk − 1)
     *
     * y la arista entre 0 y 1 y entre 3 y 2 es la del anillo por el punto gk; entre 1 y 2 y entre 0 y 3,
     * la de la sección gs. La normal de una esquina es la suma de las caras a las que se llega desde la
     * suya cruzando SÓLO aristas suaves: así todas las caras de un mismo grupo llevan la misma normal (antes
     * cada cara sumaba sus vecinas por su cuenta, y un punto salía con tres o cuatro normales casi iguales).
     */
    const abanico = new Int32Array(4);
    const suaveHaciaElSiguiente = new Uint8Array(4);
    const alcanzada = new Uint8Array(4);
    const esSuaveEntre = (g: number, h: number): boolean =>
      (fx[g] as number) * (fx[h] as number) + (fy[g] as number) * (fy[h] as number) + (fz[g] as number) * (fz[h] as number) >= cosSuave;
    const esquina = (s: number, k: number, gs: number, gk: number): Float64Array => {
      for (let j = 0; j < 4; j++) {
        const os = j < 2 ? gs - 1 : gs;
        const okCrudo = j === 0 || j === 3 ? gk - 1 : gk;
        let g = -1;
        if (existe(os, okCrudo)) {
          g = os * aristas + columna(okCrudo);
          if ((forma[g] as number) === 0) g = -1;
        }
        abanico[j] = g;
      }
      const puntoVivo = vivas.has(gk % np);
      for (let j = 0; j < 4; j++) {
        const g = abanico[j] as number;
        const h = abanico[(j + 1) % 4] as number;
        /* j → j+1: 0→1 y 2→3 cruzan el anillo por gk; 1→2 y 3→0, la sección gs. */
        suaveHaciaElSiguiente[j] = g >= 0 && h >= 0 && g !== h && (j === 0 || j === 2 ? !puntoVivo : esSuaveEntre(g, h)) ? 1 : 0;
      }
      const f = s * aristas + k;
      let desde = 0;
      while (desde < 3 && (abanico[desde] as number) !== f) desde++;
      alcanzada.fill(0);
      alcanzada[desde] = 1;
      /* Hacia delante y hacia atrás por el abanico, mientras la arista sea suave. */
      for (let j = desde; suaveHaciaElSiguiente[j] === 1; ) {
        j = (j + 1) % 4;
        if (alcanzada[j] === 1) break;
        alcanzada[j] = 1;
      }
      for (let j = desde; suaveHaciaElSiguiente[(j + 3) % 4] === 1; ) {
        j = (j + 3) % 4;
        if (alcanzada[j] === 1) break;
        alcanzada[j] = 1;
      }
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (let j = 0; j < 4; j++) {
        if (alcanzada[j] === 0) continue;
        const g = abanico[j] as number;
        sx += fx[g] as number;
        sy += fy[g] as number;
        sz += fz[g] as number;
      }
      const l = Math.hypot(sx, sy, sz) || 1;
      n3[0] = sx / l;
      n3[1] = sy / l;
      n3[2] = sz / l;
      return n3;
    };
    for (let s = 0; s < ns - 1; s++) {
      const xa = (secciones[s] as SeccionDelMolde).x;
      const xd = (secciones[s + 1] as SeccionDelMolde).x;
      for (let k = 0; k < aristas; k++) {
        const f = s * aristas + k;
        const tipo = forma[f] as number;
        if (tipo === 0) continue;
        const k1 = (k + 1) % np;
        const pa = punto(s, k);
        const pb = punto(s, k1);
        const pc = punto(s + 1, k1);
        const pd = punto(s + 1, k);
        const va = recorrido[s * (np + 1) + k] as number;
        const vd = recorrido[(s + 1) * (np + 1) + k] as number;
        /* La v del final de la arista: en la costura, el anillo entero (no la del punto 0). */
        const vb = recorrido[s * (np + 1) + k + 1] as number;
        const vc = recorrido[(s + 1) * (np + 1) + k + 1] as number;
        /* `esquina` escribe en `n3`: cada normal se usa en cuanto se calcula. */
        let e = esquina(s, k, s, k);
        const a = this.vertice(xa, pa[1], pa[0], e[0] as number, e[1] as number, e[2] as number, xa, va);
        e = esquina(s, k, s + 1, k);
        const d = this.vertice(xd, pd[1], pd[0], e[0] as number, e[1] as number, e[2] as number, xd, vd);
        if (tipo === 1) {
          e = esquina(s, k, s + 1, k + 1);
          const c = this.vertice(xd, pc[1], pc[0], e[0] as number, e[1] as number, e[2] as number, xd, vc);
          this.tri(a, d, c);
        } else if (tipo === 2) {
          e = esquina(s, k, s, k + 1);
          const b = this.vertice(xa, pb[1], pb[0], e[0] as number, e[1] as number, e[2] as number, xa, vb);
          this.tri(a, d, b);
        } else {
          e = esquina(s, k, s, k + 1);
          const b = this.vertice(xa, pb[1], pb[0], e[0] as number, e[1] as number, e[2] as number, xa, vb);
          e = esquina(s, k, s + 1, k + 1);
          const c = this.vertice(xd, pc[1], pc[0], e[0] as number, e[1] as number, e[2] as number, xd, vc);
          this.tri(a, d, c);
          this.tri(a, c, b);
        }
      }
    }
    if (!cerrada || opciones.tapas === false) return;
    for (const [s, haciaMas] of [
      [0, false],
      [ns - 1, true],
    ] as const) {
      const x = (secciones[s] as SeccionDelMolde).x;
      const anillo: P2[] = [];
      for (let k = 0; k < np; k++) anillo.push(punto(s, k));
      /* En (z, y) antihorario, un triángulo mira a −x: la tapa de delante lo toma así y la de detrás, al revés. */
      this.tapaPlana(
        anillo,
        (q) => [x, q[1], q[0]],
        haciaMas ? [1, 0, 0] : [-1, 0, 0],
        !haciaMas,
      );
    }
  }

  /**
   * Una tapa triangulada: el polígono `anillo` (antihorario en su plano) llevado a 3D con `en`, mirando a
   * `n`. `comoViene`: si los triángulos antihorarios del plano ya miran a `n`. UV por el convenio.
   */
  private tapaPlana(anillo: readonly P2[], en: (q: P2) => V3, n: V3, comoViene: boolean): void {
    const tris = THREE.ShapeUtils.triangulateShape(
      anillo.map(([a, b]) => new THREE.Vector2(a, b)),
      [],
    );
    if (tris.length === 0) return;
    const puntos = anillo.map(en);
    const horizontal = Math.abs(n[1]) > 0.999;
    let tx = 0;
    let tz = 0;
    let desde = 0;
    if (!horizontal) {
      const l = Math.hypot(n[0], n[2]);
      tx = n[2] / l;
      tz = -n[0] / l;
      desde = Infinity;
      for (const q of puntos) desde = Math.min(desde, q[0] * tx + q[2] * tz);
    }
    const indices = puntos.map((q) =>
      this.vertice(q[0], q[1], q[2], n[0], n[1], n[2], horizontal ? q[0] : q[0] * tx + q[2] * tz - desde, horizontal ? q[2] : q[1]),
    );
    for (const t of tris) {
      /* La triangulación no promete el sentido: se mira cada uno en el plano (como en `perfil`). */
      const [i, j, k] = t as [number, number, number];
      const pi = anillo[i] as P2;
      const pj = anillo[j] as P2;
      const pk = anillo[k] as P2;
      const giro = (pj[0] - pi[0]) * (pk[1] - pi[1]) - (pj[1] - pi[1]) * (pk[0] - pi[0]);
      const antihorario = giro >= 0;
      if (antihorario === comoViene) this.tri(indices[i] as number, indices[j] as number, indices[k] as number);
      else this.tri(indices[i] as number, indices[k] as number, indices[j] as number);
    }
  }

  /**
   * EL PERFIL CORRIDO (la cornisa): el `perfil` (puntos (fuera, arriba), saliendo de la pared por abajo y
   * volviendo por arriba: ver la cabecera) llevado a lo largo del `camino`, una polilínea casi horizontal
   * cuyos puntos dan la altura de la pared en ese punto. «Fuera» es la derecha de quien anda el camino
   * visto desde arriba: la misma cara que `muro` pinta de (xa, za) a (xb, zb). Un edificio se rodea como
   * lo recorren los muros de `caja`: (x1, z0) → (x0, z0) → (x0, z1) → (x1, z1).
   *
   * - `ingletes` (por defecto sí): en cada esquina el perfil se pone en la bisectriz, estirado lo justo
   *   para que los dos tramos se junten sin rendija ni solape (en una esquina muy aguda el estirón se
   *   corta a 5 veces). Sin ingletes, cada tramo es un perfil corrido suelto, a escuadra y con sus tapas.
   * - `cerrado`: el camino vuelve a su primer punto (el contorno de un edificio).
   * - `perfilCerrado`: el perfil también cierra (su último punto con el primero). Si no, queda abierto
   *   por la pared, que es lo que es una cornisa.
   * - `tapas` (por defecto sí, en un camino abierto): el polígono del perfil en cada extremo.
   * - Normales: la del tramo (esquinas vivas); a lo largo del perfil, suaves por debajo de `suave`.
   * - UV: `u` = lo andado por el camino; `v` = la altura del camino más la del primer punto del perfil
   *   más lo recorrido por el perfil (en un perfil vertical, la altura de mundo).
   *
   * Triángulos (`triangulosDeExtruirPerfil`): 2 por tramo del camino y arista del perfil (las que miden
   * cero no cuentan), más n − 2 por tapa (polígono simple de n puntos sin alineados).
   */
  extruirPerfil(
    camino: readonly V3[],
    perfil: readonly P2[],
    opciones: {
      readonly ingletes?: boolean;
      readonly cerrado?: boolean;
      readonly perfilCerrado?: boolean;
      readonly suave?: number;
      readonly tapas?: boolean;
    } = {},
  ): void {
    const cerrado = opciones.cerrado === true;
    const np = perfil.length;
    const puntos = camino;
    const nc = puntos.length;
    if (np < 2 || nc < 2) return;
    if (opciones.ingletes === false) {
      const tramos = cerrado ? nc : nc - 1;
      for (let i = 0; i < tramos; i++) {
        this.extruirPerfil([puntos[i] as V3, puntos[(i + 1) % nc] as V3], perfil, { ...opciones, ingletes: true, cerrado: false });
      }
      return;
    }
    const tramos = cerrado ? nc : nc - 1;
    /* La normal hacia fuera (en planta) de cada tramo y lo andado hasta cada punto. */
    const tnx = new Float64Array(tramos);
    const tnz = new Float64Array(tramos);
    const andado = new Float64Array(tramos + 1);
    for (let i = 0; i < tramos; i++) {
      const a = puntos[i] as V3;
      const b = puntos[(i + 1) % nc] as V3;
      const dx = b[0] - a[0];
      const dz = b[2] - a[2];
      const l = Math.hypot(dx, dz);
      andado[i + 1] = (andado[i] as number) + l;
      if (l < TRAMO_NULO) continue;
      tnx[i] = -dz / l;
      tnz[i] = dx / l;
    }
    /* El inglete de cada punto: hacia dónde se aparta el perfil y cuánto se estira. */
    const mx = new Float64Array(nc);
    const mz = new Float64Array(nc);
    const estira = new Float64Array(nc);
    for (let i = 0; i < nc; i++) {
      const antes = cerrado ? (i - 1 + tramos) % tramos : i - 1;
      const despues = cerrado ? i % tramos : i < tramos ? i : -1;
      const hayAntes = antes >= 0 && Math.abs(tnx[antes] as number) + Math.abs(tnz[antes] as number) > 0;
      const hayDespues = despues >= 0 && Math.abs(tnx[despues] as number) + Math.abs(tnz[despues] as number) > 0;
      let ax = 0;
      let az = 0;
      if (hayAntes) {
        ax += tnx[antes] as number;
        az += tnz[antes] as number;
      }
      if (hayDespues) {
        ax += tnx[despues] as number;
        az += tnz[despues] as number;
      }
      const l = Math.hypot(ax, az);
      if (l < TRAMO_NULO) {
        mx[i] = hayDespues ? (tnx[despues] as number) : hayAntes ? (tnx[antes] as number) : 0;
        mz[i] = hayDespues ? (tnz[despues] as number) : hayAntes ? (tnz[antes] as number) : 0;
        estira[i] = 1;
        continue;
      }
      mx[i] = ax / l;
      mz[i] = az / l;
      const ref = hayDespues ? despues : antes;
      const coseno = (mx[i] as number) * (tnx[ref] as number) + (mz[i] as number) * (tnz[ref] as number);
      estira[i] = 1 / Math.max(0.2, coseno);
    }
    const perfilCerrado = opciones.perfilCerrado === true;
    const { nr: pnh, ny: pnv, largo, acumulado, entra, sale } = normalesDelContorno(perfil, perfilCerrado, opciones.suave ?? SUAVE_POR_DEFECTO);
    const aristas = perfilCerrado ? np : np - 1;
    const arriba0 = (perfil[0] as P2)[1];
    /* Los puntos del perfil en cada punto del camino, una vez: los dos tramos de una esquina cosen exacto. */
    const px = new Float64Array(nc * np);
    const py = new Float64Array(nc * np);
    const pz = new Float64Array(nc * np);
    for (let i = 0; i < nc; i++) {
      const c = puntos[i] as V3;
      const e = estira[i] as number;
      for (let j = 0; j < np; j++) {
        const q = perfil[j] as P2;
        px[i * np + j] = c[0] + (mx[i] as number) * q[0] * e;
        py[i * np + j] = c[1] + q[1];
        pz[i * np + j] = c[2] + (mz[i] as number) * q[0] * e;
      }
    }
    for (let t = 0; t < tramos; t++) {
      const nx = tnx[t] as number;
      const nz = tnz[t] as number;
      if (Math.abs(nx) + Math.abs(nz) === 0) continue;
      const i0 = t;
      const i1 = (t + 1) % nc;
      const u0 = andado[t] as number;
      const u1 = andado[t + 1] as number;
      const base0 = (puntos[i0] as V3)[1] + arriba0;
      const base1 = (puntos[i1] as V3)[1] + arriba0;
      for (let j = 0; j < aristas; j++) {
        if ((largo[j] as number) < TRAMO_NULO) continue;
        const j1 = (j + 1) % np;
        const ns = sale[j] as number;
        const ne = entra[j1] as number;
        const sh = pnh[ns] as number;
        const sv = pnv[ns] as number;
        const eh = pnh[ne] as number;
        const ev = pnv[ne] as number;
        const vj = acumulado[j] as number;
        const vj1 = acumulado[j + 1] as number;
        const a = this.vertice(px[i0 * np + j] as number, py[i0 * np + j] as number, pz[i0 * np + j] as number, nx * sh, sv, nz * sh, u0, base0 + vj);
        const b = this.vertice(px[i0 * np + j1] as number, py[i0 * np + j1] as number, pz[i0 * np + j1] as number, nx * eh, ev, nz * eh, u0, base0 + vj1);
        const c = this.vertice(px[i1 * np + j1] as number, py[i1 * np + j1] as number, pz[i1 * np + j1] as number, nx * eh, ev, nz * eh, u1, base1 + vj1);
        const d = this.vertice(px[i1 * np + j] as number, py[i1 * np + j] as number, pz[i1 * np + j] as number, nx * sh, sv, nz * sh, u1, base1 + vj);
        this.tri(a, d, c);
        this.tri(a, c, b);
      }
    }
    if (cerrado || opciones.tapas === false) return;
    for (const [i, t, haciaDelante] of [
      [0, 0, false],
      [nc - 1, tramos - 1, true],
    ] as const) {
      const nx = tnx[t] as number;
      const nz = tnz[t] as number;
      if (Math.abs(nx) + Math.abs(nz) === 0) continue;
      /* Adelante es (nz, −nx). En (fuera, arriba) antihorario, un triángulo mira hacia atrás. */
      const n: V3 = haciaDelante ? [nz, 0, -nx] : [-nz, 0, nx];
      const c = puntos[i] as V3;
      const e = estira[i] as number;
      const cmx = mx[i] as number;
      const cmz = mz[i] as number;
      this.tapaPlana(perfil, (q) => [c[0] + cmx * q[0] * e, c[1] + q[1], c[2] + cmz * q[0] * e], n, !haciaDelante);
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

/** El área firmada de un polígono plano: positiva si va antihorario (primer eje a la derecha, segundo arriba). */
export function areaFirmada(puntos: readonly P2[]): number {
  let area = 0;
  for (let i = 0; i < puntos.length; i++) {
    const a = puntos[i] as P2;
    const b = puntos[(i + 1) % puntos.length] as P2;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

/** Suma a `n` el producto vectorial (b − a) × (c − a), sin normalizar. */
function sumarNormal(n: Float64Array, ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number): void {
  const ux = bx - ax;
  const uy = by - ay;
  const uz = bz - az;
  const wx = cx - ax;
  const wy = cy - ay;
  const wz = cz - az;
  n[0] = (n[0] as number) + uy * wz - uz * wy;
  n[1] = (n[1] as number) + uz * wx - ux * wz;
  n[2] = (n[2] as number) + ux * wy - uy * wx;
}

/**
 * LAS NORMALES DE UN CONTORNO PLANO, tramo a tramo y punto a punto. `nr`/`ny` son las normales (la
 * derecha de cada tramo, `(dy, −dx)`): primero una por tramo, en su índice, y detrás las promediadas.
 * `entra[i]` es el índice de la normal con la que el tramo que llega al punto i lo pinta, y `sale[i]` la
 * del que sale; en una unión suave (los dos tramos se tuercen menos que `suave`) son la misma. `largo[s]`
 * es lo que mide el tramo s y `acumulado[i]` lo recorrido hasta el punto i (en un contorno cerrado,
 * `acumulado[n]` es el perímetro: la costura).
 */
function normalesDelContorno(
  puntos: readonly P2[],
  cerrado: boolean,
  suave: number,
): { nr: Float64Array; ny: Float64Array; largo: Float64Array; acumulado: Float64Array; entra: Int32Array; sale: Int32Array } {
  const n = puntos.length;
  const tramos = cerrado ? n : n - 1;
  const nr = new Float64Array(tramos + n);
  const ny = new Float64Array(tramos + n);
  const largo = new Float64Array(Math.max(tramos, 0));
  const acumulado = new Float64Array(n + 1);
  for (let s = 0; s < tramos; s++) {
    const a = puntos[s] as P2;
    const b = puntos[(s + 1) % n] as P2;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    largo[s] = l;
    acumulado[s + 1] = (acumulado[s] as number) + l;
    if (l >= TRAMO_NULO) {
      nr[s] = dy / l;
      ny[s] = -dx / l;
    }
  }
  const entra = new Int32Array(n).fill(-1);
  const sale = new Int32Array(n).fill(-1);
  const cosSuave = Math.cos(suave);
  let libres = tramos;
  for (let i = 0; i < n; i++) {
    const llega = i > 0 ? i - 1 : cerrado ? tramos - 1 : -1;
    const parte = i < tramos ? i : -1;
    entra[i] = llega;
    sale[i] = parte;
    if (llega < 0 || parte < 0) continue;
    if ((largo[llega] as number) < TRAMO_NULO || (largo[parte] as number) < TRAMO_NULO) continue;
    const r = (nr[llega] as number) + (nr[parte] as number);
    const y = (ny[llega] as number) + (ny[parte] as number);
    const coseno = (nr[llega] as number) * (nr[parte] as number) + (ny[llega] as number) * (ny[parte] as number);
    if (coseno < cosSuave) continue;
    const l = Math.hypot(r, y);
    nr[libres] = r / l;
    ny[libres] = y / l;
    entra[i] = libres;
    sale[i] = libres;
    libres++;
  }
  return { nr, ny, largo, acumulado, entra, sale };
}

/** Los triángulos de una tapa triangulada: n − 2 en un polígono simple sin puntos alineados ni repetidos. */
function triangulosDeLaTapa(puntos: readonly P2[]): number {
  return THREE.ShapeUtils.triangulateShape(
    puntos.map(([a, b]) => new THREE.Vector2(a, b)),
    [],
  ).length;
}

/** Los triángulos que escribe `Molde.torno` con esos datos (la fórmula de su comentario). */
export function triangulosDelTorno(contorno: readonly P2[], lados: number, opciones: { readonly tapas?: boolean } = {}): number {
  const n = contorno.length;
  if (n < 2 || lados < 3) return 0;
  if (!contorno.some((p) => p[0] > EN_EL_EJE)) return 0;
  let t = 0;
  for (let s = 0; s < n - 1; s++) {
    const a = contorno[s] as P2;
    const b = contorno[s + 1] as P2;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < TRAMO_NULO) continue;
    const enElEje = (a[0] <= EN_EL_EJE ? 1 : 0) + (b[0] <= EN_EL_EJE ? 1 : 0);
    t += enElEje === 0 ? 2 * lados : enElEje === 1 ? lados : 0;
  }
  if (opciones.tapas !== false) {
    if ((contorno[0] as P2)[0] > EN_EL_EJE) t += lados;
    if ((contorno[n - 1] as P2)[0] > EN_EL_EJE) t += lados;
  }
  return t;
}

/** Los triángulos que escribe `Molde.cajaBiselada` con esas caras (con bisel; sin él, los de `caja`). */
export function triangulosDeLaCajaBiselada(caras: string = 'nseoab'): number {
  const hay = [
    [caras.includes('o'), caras.includes('e')],
    [caras.includes('b'), caras.includes('a')],
    [caras.includes('n'), caras.includes('s')],
  ] as const;
  let t = 0;
  for (const eje of hay) for (const lado of eje) if (lado) t += 2;
  for (let e = 0; e < 3; e++) {
    for (let f = e + 1; f < 3; f++) {
      for (const le of [0, 1]) for (const lf of [0, 1]) if (hay[e]?.[le] === true && hay[f]?.[lf] === true) t += 2;
    }
  }
  for (const lx of [0, 1]) for (const ly of [0, 1]) for (const lz of [0, 1]) if (hay[0][lx] && hay[1][ly] && hay[2][lz]) t += 1;
  return t;
}

/** Los triángulos que escribe `Molde.perfil` con esas opciones. */
export function triangulosDelPerfil(
  puntos: readonly P2[],
  opciones: { readonly tapas?: boolean; readonly lados?: (i: number) => boolean } = {},
): number {
  const n = puntos.length;
  let t = 0;
  if (opciones.tapas !== false) {
    const ccw = areaFirmada(puntos) > 0 ? [...puntos] : [...puntos].reverse();
    t += 2 * triangulosDeLaTapa(ccw);
  }
  for (let i = 0; i < n; i++) {
    if (opciones.lados !== undefined && !opciones.lados(i)) continue;
    const a = puntos[i] as P2;
    const b = puntos[(i + 1) % n] as P2;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < TRAMO_NULO) continue;
    t += 2;
  }
  return t;
}

/** Los triángulos que escribe `Molde.seccionado` con esas secciones y opciones. */
export function triangulosDelSeccionado(
  secciones: readonly SeccionDelMolde[],
  opciones: { readonly tapas?: boolean; readonly cerrada?: boolean } = {},
): number {
  const ns = secciones.length;
  if (ns < 2) return 0;
  const cerrada = opciones.cerrada !== false;
  const np = (secciones[0] as SeccionDelMolde).puntos.length;
  if (np < (cerrada ? 3 : 2)) return 0;
  const aristas = cerrada ? np : np - 1;
  const mide = (s: number, k: number): boolean => {
    const p = (secciones[s] as SeccionDelMolde).puntos;
    const a = p[k] as P2;
    const b = p[(k + 1) % np] as P2;
    return Math.hypot(b[0] - a[0], b[1] - a[1]) >= TRAMO_NULO;
  };
  let t = 0;
  for (let s = 0; s < ns - 1; s++) for (let k = 0; k < aristas; k++) t += (mide(s, k) ? 1 : 0) + (mide(s + 1, k) ? 1 : 0);
  if (cerrada && opciones.tapas !== false) {
    const pon = (p: readonly P2[]): P2[] => (areaFirmada((secciones[0] as SeccionDelMolde).puntos) < 0 ? [...p].reverse() : [...p]);
    t += triangulosDeLaTapa(pon((secciones[0] as SeccionDelMolde).puntos));
    t += triangulosDeLaTapa(pon((secciones[ns - 1] as SeccionDelMolde).puntos));
  }
  return t;
}

/** Los triángulos que escribe `Molde.extruirPerfil` con ese camino, ese perfil y esas opciones. */
export function triangulosDeExtruirPerfil(
  camino: readonly V3[],
  perfil: readonly P2[],
  opciones: { readonly ingletes?: boolean; readonly cerrado?: boolean; readonly perfilCerrado?: boolean; readonly tapas?: boolean } = {},
): number {
  const nc = camino.length;
  const np = perfil.length;
  if (np < 2 || nc < 2) return 0;
  const cerrado = opciones.cerrado === true;
  const tramos = cerrado ? nc : nc - 1;
  let tramosQueMiden = 0;
  for (let i = 0; i < tramos; i++) {
    const a = camino[i] as V3;
    const b = camino[(i + 1) % nc] as V3;
    if (Math.hypot(b[0] - a[0], b[2] - a[2]) >= TRAMO_NULO) tramosQueMiden++;
  }
  const aristasDelPerfil = opciones.perfilCerrado === true ? np : np - 1;
  let aristasQueMiden = 0;
  for (let j = 0; j < aristasDelPerfil; j++) {
    const a = perfil[j] as P2;
    const b = perfil[(j + 1) % np] as P2;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= TRAMO_NULO) aristasQueMiden++;
  }
  const tapa = triangulosDeLaTapa(perfil);
  if (opciones.ingletes === false) {
    return tramosQueMiden * (2 * aristasQueMiden + (opciones.tapas !== false ? 2 * tapa : 0));
  }
  let t = 2 * tramosQueMiden * aristasQueMiden;
  if (!cerrado && opciones.tapas !== false) {
    const mide = (i: number): boolean => {
      const a = camino[i] as V3;
      const b = camino[i + 1] as V3;
      return Math.hypot(b[0] - a[0], b[2] - a[2]) >= TRAMO_NULO;
    };
    if (mide(0)) t += tapa;
    if (mide(tramos - 1)) t += tapa;
  }
  return t;
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
