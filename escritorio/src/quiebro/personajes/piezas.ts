/**
 * LAS PIEZAS QUE SE ENGANCHAN A UN HUESO: el paraguas de los durmientes, la pistola del Celador
 * tirador y el sombrero del Celador mayor. Geometría de código, pocas decenas de triángulos cada una.
 *
 * ═══ POR QUÉ DE CÓDIGO Y NO DE LA FORJA ═══
 *
 * El manifiesto todavía no trae ninguna (`piezas: {}`, `paraguas: null`, `tirador.pieza: null`). Sin
 * paraguas no hay madrugada de lluvia, y sin pistola el tirador no se distingue del Celador hasta que
 * dispara. Estas son dignas a la distancia a la que se miran (el paraguas de un durmiente a 10 m, la
 * pistola en una mano a 8 m) y se sustituyen solas el día que la forja traiga las suyas: `malla.ts`
 * sólo las usa si el reparto no nombra una pieza con ese nombre.
 *
 * ═══ POR QUÉ SE FUNDEN CON EL CUERPO Y NO SE CUELGAN DEL HUESO ═══
 *
 * Colgar una malla de `agarre_R` es lo natural en three, y es UNA LLAMADA MÁS por cuerpo: 48 paraguas
 * serían 48 llamadas, casi todo N0. Aquí cada pieza se escribe en el espacio del hueso y `malla.ts` la
 * pasa al reposo y la mete en la malla fundida del cuerpo con todo su peso en ese hueso: se mueve con
 * la mano como si colgara de ella, y no cuesta ninguna llamada. En la multitud, igual, con los huesos
 * de la textura.
 *
 * ═══ LOS EJES DEL AGARRE (del informe de la forja) ═══
 *
 * +Y sale por el lado del pulgar (hacia arriba del puño: el mástil del paraguas), +X hacia los
 * nudillos (el cañón de la pistola), +Z = X × Y. La cabeza: +Y hacia arriba desde la base del cráneo.
 */
import * as THREE from 'three';
import { TRIANGULOS_DE_PIEZA } from './presupuesto';

export type NombreDePieza = 'paraguas' | 'pistola' | 'sombrero';
export const PIEZAS: readonly NombreDePieza[] = ['paraguas', 'pistola', 'sombrero'];

/** De qué hueso cuelga, por papel (se traduce a nombre con el manifiesto: `agarre.derecha`, `cabeza`). */
export type HuesoDePieza = 'agarre-derecha' | 'cabeza';

/** Las zonas que estrenan las piezas, con su color, rugosidad y metal por defecto (sRGB). */
export const ZONAS_DE_PIEZA: Readonly<Record<string, { color: string; rugosidad: number; metal: number }>> = {
  pieza_tela: { color: '#141518', rugosidad: 0.55, metal: 0 },
  pieza_metal: { color: '#1b1c1f', rugosidad: 0.38, metal: 0.7 },
  pieza_fieltro: { color: '#24211e', rugosidad: 0.95, metal: 0 },
};

export interface PiezaConstruida {
  readonly nombre: string;
  readonly hueso: HuesoDePieza;
  /** El hueso por su nombre, si la pieza lo dice (las de la forja: `agarre_R`); si no, por su papel. */
  readonly huesoNombre?: string;
  /** Sin índice: `position`, `normal` y `zonaPieza` (índice en `zonas`). En el espacio del hueso. */
  readonly geometria: THREE.BufferGeometry;
  readonly zonas: readonly string[];
  /** Color (lineal), rugosidad y metal de cada zona, si la pieza los trae (las de la forja). */
  readonly base?: Readonly<Record<string, { readonly color: THREE.Color; readonly rugosidad: number; readonly metal: number }>>;
}

/**
 * UNA PIEZA DE LA FORJA como pieza de fundir: sus mallas (sin piel, ya en el marco de su hueso) en una
 * geometría sin índice, con la zona de cada triángulo por el nombre de su material y los colores de
 * esos materiales. Así la pistola y el paraguas de la forja entran en la malla del cuerpo igual que las
 * de código: con todo el peso en su hueso y sin una llamada más.
 */
export function piezaDeLaForja(nombre: string, escena: THREE.Object3D, hueso: string): PiezaConstruida {
  escena.updateWorldMatrix(true, true);
  const raizInversa = escena.matrixWorld.clone().invert();
  const pos: number[] = [];
  const zona: number[] = [];
  const zonas: string[] = [];
  const base: Record<string, { color: THREE.Color; rugosidad: number; metal: number }> = {};
  const v = new THREE.Vector3();
  const m = new THREE.Matrix4();
  escena.traverse((o) => {
    const malla = o as THREE.Mesh;
    if (!malla.isMesh) return;
    const material = (Array.isArray(malla.material) ? malla.material[0] : malla.material) as THREE.MeshStandardMaterial;
    const nombreDeZona = material.name !== '' ? material.name : `pieza_${nombre}`;
    let z = zonas.indexOf(nombreDeZona);
    if (z < 0) {
      z = zonas.length;
      zonas.push(nombreDeZona);
      base[nombreDeZona] = { color: material.color?.clone() ?? new THREE.Color(0.2, 0.2, 0.2), rugosidad: material.roughness ?? 0.6, metal: material.metalness ?? 0 };
    }
    m.multiplyMatrices(raizInversa, malla.matrixWorld);
    const P = malla.geometry.getAttribute('position');
    const I = malla.geometry.getIndex();
    const n = I !== null ? I.count : P.count;
    for (let k = 0; k < n; k++) {
      v.fromBufferAttribute(P, I !== null ? I.getX(k) : k).applyMatrix4(m);
      pos.push(v.x, v.y, v.z);
      zona.push(z);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('zonaPieza', new THREE.Float32BufferAttribute(zona, 1));
  g.computeVertexNormals();
  return { nombre, hueso: 'agarre-derecha', huesoNombre: hueso, geometria: g, zonas, base };
}

/** Un puñado de triángulos con su zona, que se vuelca en una geometría sin índice. */
class Taller {
  readonly pos: number[] = [];
  readonly zona: number[] = [];
  triangulo(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, z: number): void {
    this.pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    this.zona.push(z, z, z);
  }
  cuadro(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, z: number): void {
    this.triangulo(a, b, c, z);
    this.triangulo(a, c, d, z);
  }
  /** Una caja alineada con los ejes, de `min` a `max`: 12 triángulos hacia fuera. */
  caja(min: THREE.Vector3, max: THREE.Vector3, z: number): void {
    const v = (x: number, y: number, w: number): THREE.Vector3 => new THREE.Vector3(x, y, w);
    const [a, b] = [min, max];
    const p000 = v(a.x, a.y, a.z);
    const p100 = v(b.x, a.y, a.z);
    const p010 = v(a.x, b.y, a.z);
    const p110 = v(b.x, b.y, a.z);
    const p001 = v(a.x, a.y, b.z);
    const p101 = v(b.x, a.y, b.z);
    const p011 = v(a.x, b.y, b.z);
    const p111 = v(b.x, b.y, b.z);
    this.cuadro(p001, p101, p111, p011, z); /* +z */
    this.cuadro(p100, p000, p010, p110, z); /* −z */
    this.cuadro(p101, p100, p110, p111, z); /* +x */
    this.cuadro(p000, p001, p011, p010, z); /* −x */
    this.cuadro(p011, p111, p110, p010, z); /* +y */
    this.cuadro(p000, p100, p101, p001, z); /* −y */
  }
  geometria(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('zonaPieza', new THREE.Float32BufferAttribute(this.zona, 1));
    g.computeVertexNormals();
    return g;
  }
}

function anillo(n: number, radio: number, y: number, giro = 0): THREE.Vector3[] {
  const salida: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = giro + (i / n) * Math.PI * 2;
    salida.push(new THREE.Vector3(Math.cos(a) * radio, y, Math.sin(a) * radio));
  }
  return salida;
}

/**
 * EL PARAGUAS, a lo largo de +Y del agarre: el puño lo coge a un palmo del mango. Copa de ocho
 * varillas en dos tramos (el de fuera cae más, como la tela entre varillas), por fuera y por dentro
 * (se ve desde abajo), mástil de sección cuadrada y el mango en gancho.
 */
function paraguas(): PiezaConstruida {
  const t = new Taller();
  const tela = 0;
  const metal = 1;
  const n = 8;
  const punta = new THREE.Vector3(0, 0.9, 0);
  const a = anillo(n, 0.5, 0.74);
  const b = anillo(n, 0.57, 0.62, Math.PI / n);
  for (let i = 0; i < n; i++) {
    const i1 = (i + 1) % n;
    /* Por fuera (hacia arriba y hacia fuera)… */
    t.triangulo(punta, a[i1] as THREE.Vector3, a[i] as THREE.Vector3, tela);
    t.cuadro(a[i] as THREE.Vector3, a[i1] as THREE.Vector3, b[i] as THREE.Vector3, b[(i + n - 1) % n] as THREE.Vector3, tela);
    /* …y por dentro, con las caras al revés. */
    t.triangulo(punta, a[i] as THREE.Vector3, a[i1] as THREE.Vector3, tela);
    t.cuadro(a[i1] as THREE.Vector3, a[i] as THREE.Vector3, b[(i + n - 1) % n] as THREE.Vector3, b[i] as THREE.Vector3, tela);
  }
  /* El mástil: de debajo del puño a la copa, 4 caras. */
  const g = 0.009;
  const abajo = -0.14;
  const arriba = 0.9;
  const esq = [new THREE.Vector3(-g, 0, -g), new THREE.Vector3(g, 0, -g), new THREE.Vector3(g, 0, g), new THREE.Vector3(-g, 0, g)];
  for (let i = 0; i < 4; i++) {
    const p = esq[i] as THREE.Vector3;
    const q = esq[(i + 1) % 4] as THREE.Vector3;
    t.cuadro(new THREE.Vector3(q.x, abajo, q.z), new THREE.Vector3(p.x, abajo, p.z), new THREE.Vector3(p.x, arriba, p.z), new THREE.Vector3(q.x, arriba, q.z), metal);
  }
  /* El gancho del mango: dos tramos de sección plana hacia los nudillos y hacia arriba. */
  const h = 0.016;
  const g0 = new THREE.Vector3(0, abajo, 0);
  const g1 = new THREE.Vector3(0.05, abajo - 0.05, 0);
  const g2 = new THREE.Vector3(0.1, abajo - 0.01, 0);
  for (const [p, q] of [
    [g0, g1],
    [g1, g2],
  ] as const) {
    t.cuadro(new THREE.Vector3(p.x, p.y, -h), new THREE.Vector3(q.x, q.y, -h), new THREE.Vector3(q.x, q.y, h), new THREE.Vector3(p.x, p.y, h), metal);
    t.cuadro(new THREE.Vector3(p.x, p.y, h), new THREE.Vector3(q.x, q.y, h), new THREE.Vector3(q.x, q.y, -h), new THREE.Vector3(p.x, p.y, -h), metal);
  }
  return { nombre: 'paraguas', hueso: 'agarre-derecha', geometria: t.geometria(), zonas: ['pieza_tela', 'pieza_metal'] };
}

/**
 * LA PISTOLA: empuñadura dentro del puño, corredera y cañón hacia los nudillos (+X), guardamonte.
 * Negra y mate: se lee por la silueta del brazo estirado, no por el brillo.
 */
function pistola(): PiezaConstruida {
  const t = new Taller();
  const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
  t.caja(v(-0.035, -0.055, -0.014), v(0.01, 0.045, 0.014), 0);
  t.caja(v(-0.04, 0.045, -0.013), v(0.16, 0.078, 0.013), 0);
  t.caja(v(0.16, 0.052, -0.007), v(0.19, 0.07, 0.007), 0);
  /* El guardamonte: un prisma triangular bajo la corredera, por delante de la empuñadura. */
  const a0 = v(0.01, 0.045, -0.006);
  const b0 = v(0.06, 0.045, -0.006);
  const c0 = v(0.02, 0.005, -0.006);
  const a1 = v(0.01, 0.045, 0.006);
  const b1 = v(0.06, 0.045, 0.006);
  const c1 = v(0.02, 0.005, 0.006);
  t.triangulo(a0, b0, c0, 0);
  t.triangulo(a1, c1, b1, 0);
  t.cuadro(b1, c1, c0, b0, 0);
  t.cuadro(c1, a1, a0, c0, 0);
  t.cuadro(a1, b1, b0, a0, 0);
  return { nombre: 'pistola', hueso: 'agarre-derecha', geometria: t.geometria(), zonas: ['pieza_metal'] };
}

/**
 * EL SOMBRERO del Celador mayor: ala ancha (por encima y por debajo) y copa hundida en ocho caras.
 * Se lee a 60 m, que es para lo que está: el mayor se distingue por la silueta de la cabeza.
 */
function sombrero(): PiezaConstruida {
  const t = new Taller();
  const n = 8;
  const alaDentro = anillo(n, 0.1, 0.165);
  const alaFuera = anillo(n, 0.2, 0.15);
  const copaBaja = anillo(n, 0.108, 0.16);
  const copaAlta = anillo(n, 0.098, 0.285);
  const hundido = new THREE.Vector3(0, 0.27, 0);
  for (let i = 0; i < n; i++) {
    const i1 = (i + 1) % n;
    /* El ala, por arriba y por abajo. */
    t.cuadro(alaDentro[i] as THREE.Vector3, alaDentro[i1] as THREE.Vector3, alaFuera[i1] as THREE.Vector3, alaFuera[i] as THREE.Vector3, 0);
    t.cuadro(alaDentro[i1] as THREE.Vector3, alaDentro[i] as THREE.Vector3, alaFuera[i] as THREE.Vector3, alaFuera[i1] as THREE.Vector3, 0);
    /* La copa, y su tapa hundida. */
    t.cuadro(copaBaja[i1] as THREE.Vector3, copaBaja[i] as THREE.Vector3, copaAlta[i] as THREE.Vector3, copaAlta[i1] as THREE.Vector3, 0);
    t.triangulo(hundido, copaAlta[i1] as THREE.Vector3, copaAlta[i] as THREE.Vector3, 0);
  }
  return { nombre: 'sombrero', hueso: 'cabeza', geometria: t.geometria(), zonas: ['pieza_fieltro'] };
}

const CONSTRUCTORES: Readonly<Record<NombreDePieza, () => PiezaConstruida>> = { paraguas, pistola, sombrero };

/** Construye una pieza por nombre. Cada llamada da una geometría nueva (quien la pide la libera). */
export function construirPieza(nombre: NombreDePieza): PiezaConstruida {
  return CONSTRUCTORES[nombre]();
}

/** ¿Es un nombre de pieza de las de aquí? */
export function esPieza(nombre: string): nombre is NombreDePieza {
  return (PIEZAS as readonly string[]).includes(nombre);
}

/** Los triángulos de una pieza construida (para el comprobador, contra `TRIANGULOS_DE_PIEZA`). */
export function triangulosDe(p: PiezaConstruida): number {
  return p.geometria.getAttribute('position').count / 3;
}

/** Lo declarado, para el que no quiera importar el presupuesto. */
export const TRIANGULOS_DECLARADOS = TRIANGULOS_DE_PIEZA;
