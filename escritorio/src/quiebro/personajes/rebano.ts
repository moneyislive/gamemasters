/**
 * EL REBAÑO: muchas cabezas de la misma figura en UNA llamada, con la piel leída de una textura de
 * huesos (`huesos-en-textura.ts`). Lo usan los 48 durmientes (con el paraguas fundido en la malla), los
 * Prestados lejanos —que visten la ropa de su durmiente y van en el rebaño de la multitud— y los
 * cuerpos sin esqueleto que el nivel manda lejos (Celadores y desvelados, uno por figura).
 *
 * ═══ LO QUE LLEVA CADA CABEZA ═══
 *
 * Su matriz (sitio, rumbo y escala de la silueta) y cuatro atributos de instancia: la animación (dos
 * filas de la textura, la mezcla y el relleno del contorno), el vestido (ropa, pelo, piel y si el
 * contorno es de amenaza), el contorno (color lineal y fuerza) y el corte (lo tenue, y la altura y el
 * modo del corte de imprimirse o salir: un Celador lejano también se imprime de abajo arriba). Nada de
 * uniformes por cabeza: una llamada, sea cual sea el número.
 *
 * ═══ SÓLO SE ENVÍA LO QUE SE VE ═══
 *
 * La matriz de instancias se rellena cada fotograma con las cabezas que caen en el campo de visión (una
 * esfera de 1,2 m contra el frustum de la cámara) y a menos de la distancia a la que la niebla ya las
 * ha borrado. Así el vértice de un durmiente de espaldas a la cámara no se calcula, y los triángulos que
 * cuenta `gl.info` son los que se pintan de verdad. El peor caso (todas a la vista) es el del renglón.
 */
import * as THREE from 'three';
import type { HuesosEnTextura } from './huesos-en-textura';
import type { MallaFundida } from './malla';
import { alPintar, materialDeRebano, ROPAS_COMO_MUCHO } from './material';
import type { UniformesDelRebano } from './material';
import { PALETAS } from './reparto';

/** Lo que el rebaño pone en la tabla de ropas: por fila, abrigo, tela y camisa (sRGB). */
export interface TablaDelRebano {
  readonly ropas: readonly { readonly abrigo: string; readonly tela: string; readonly camisa: string }[];
  /** La camisa sale del color del contorno (el forro del asiento de un desvelado). */
  readonly camisaDelContorno: boolean;
}

/** La tabla de los durmientes (y de los Prestados lejanos). */
export const TABLA_DE_DURMIENTES: TablaDelRebano = { ropas: PALETAS.ropasDeDurmiente, camisaDelContorno: false };
/** La tabla de los Celadores: el traje de cada color (§1). */
export const TABLA_DE_CELADORES: TablaDelRebano = {
  ropas: PALETAS.trajes.map((t) => ({ abrigo: t, tela: t, camisa: PALETAS.camisaDelCelador })),
  camisaDelContorno: false,
};
/** La tabla de los desvelados: el abrigo de cada estilo, y el forro del color del asiento. */
export const TABLA_DE_DESVELADOS: TablaDelRebano = {
  ropas: PALETAS.abrigoDelEstilo.map((a) => ({ abrigo: a, tela: '#2a2b2e', camisa: '#555555' })),
  camisaDelContorno: true,
};
/** La tabla de los paraguas: la «ropa» es el color de la tela. */
export const TABLA_DE_PARAGUAS: TablaDelRebano = {
  ropas: PALETAS.paraguas.map((p) => ({ abrigo: p, tela: p, camisa: p })),
  camisaDelContorno: false,
};

/** Una cabeza, tal como se le da al rebaño. Reutilizable. */
export interface Cabeza {
  x: number;
  z: number;
  /** Giro de three alrededor de Y (ya convertido del rumbo). */
  giro: number;
  escalaX: number;
  escalaY: number;
  escalaZ: number;
  filaA: number;
  filaB: number;
  mezcla: number;
  lleno: number;
  ropa: number;
  pelo: number;
  piel: number;
  /** Lleva el paraguas fundido en la malla (sólo la multitud), y de qué tela. */
  paraguas: boolean;
  tela: number;
  amenaza: boolean;
  /** Color del contorno en lineal, y su fuerza (0 sin contorno). */
  contorno: THREE.Color;
  fuerza: number;
  /** Lo tenue (la parte de píxeles que se descarta) y el corte de imprimirse o salir (altura y modo). */
  tenue: number;
  corteAltura: number;
  corteModo: number;
}

export function cabezaNueva(): Cabeza {
  return {
    x: 0,
    z: 0,
    giro: 0,
    escalaX: 1,
    escalaY: 1,
    escalaZ: 1,
    filaA: 0,
    filaB: 0,
    mezcla: 0,
    lleno: 0,
    ropa: 0,
    pelo: 0,
    piel: 0,
    paraguas: false,
    tela: 0,
    amenaza: false,
    contorno: new THREE.Color(1, 1, 1),
    fuerza: 0,
    tenue: 0,
    corteAltura: 0,
    corteModo: 0,
  };
}

export class Rebano {
  readonly malla: THREE.InstancedMesh;
  readonly u: UniformesDelRebano;
  readonly capacidad: number;
  private readonly anim: THREE.InstancedBufferAttribute;
  private readonly vestido: THREE.InstancedBufferAttribute;
  private readonly contorno: THREE.InstancedBufferAttribute;
  private readonly corte: THREE.InstancedBufferAttribute;
  private readonly geometria: THREE.BufferGeometry;
  private readonly atributos: readonly THREE.InstancedBufferAttribute[];
  private n = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly arriba = new THREE.Vector3(0, 1, 0);
  /** Triángulos de una cabeza. */
  readonly triangulosPorCabeza: number;

  constructor(nombre: string, fundida: MallaFundida, huesos: HuesosEnTextura, capacidad: number, tabla: TablaDelRebano) {
    this.capacidad = capacidad;
    this.triangulosPorCabeza = fundida.triangulos;
    /* La geometría se comparte con los cuerpos; los atributos de instancia son de este rebaño. */
    this.geometria = new THREE.BufferGeometry();
    for (const [k, v] of Object.entries(fundida.geometria.attributes)) this.geometria.setAttribute(k, v);
    this.geometria.setIndex(fundida.geometria.getIndex());
    this.anim = new THREE.InstancedBufferAttribute(new Float32Array(capacidad * 4), 4);
    this.vestido = new THREE.InstancedBufferAttribute(new Float32Array(capacidad * 4), 4);
    this.contorno = new THREE.InstancedBufferAttribute(new Float32Array(capacidad * 4), 4);
    this.corte = new THREE.InstancedBufferAttribute(new Float32Array(capacidad * 4), 4);
    this.atributos = [this.anim, this.vestido, this.contorno, this.corte];
    for (const a of this.atributos) a.setUsage(THREE.DynamicDrawUsage);
    this.geometria.setAttribute('aAnimQ', this.anim);
    this.geometria.setAttribute('aVestidoQ', this.vestido);
    this.geometria.setAttribute('aContornoQ', this.contorno);
    this.geometria.setAttribute('aCorteQ', this.corte);
    const { material, u } = materialDeRebano(fundida);
    this.u = u;
    u.uHuesosQ.value = huesos.textura;
    tabla.ropas.slice(0, ROPAS_COMO_MUCHO).forEach((r, i) => {
      (u.uTablaQ.value[i * 3] as THREE.Color).set(r.abrigo);
      (u.uTablaQ.value[i * 3 + 1] as THREE.Color).set(r.tela);
      (u.uTablaQ.value[i * 3 + 2] as THREE.Color).set(r.camisa);
    });
    PALETAS.pelos.forEach((c, i) => (u.uPelosQ.value[i] as THREE.Color | undefined)?.set(c));
    PALETAS.pieles.forEach((c, i) => (u.uPielesQ.value[i] as THREE.Color | undefined)?.set(c));
    u.uZonas2Q.value.y = tabla.camisaDelContorno ? 1 : 0;
    /* Con forro propio, lo que se tiñe del asiento es el forro y no la camisa (ver `figuraDelCuerpo`). */
    const forro = fundida.zonas.indexOf('mat_forro');
    if (tabla.camisaDelContorno && forro >= 0) u.uZonasQ.value.z = forro;
    PALETAS.paraguas.forEach((c, i) => (u.uParaguasQ.value[i] as THREE.Color | undefined)?.set(c));
    this.malla = new THREE.InstancedMesh(this.geometria, material, capacidad);
    this.malla.name = nombre;
    this.malla.count = 0;
    this.malla.frustumCulled = false;
    this.malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.malla.onBeforeRender = (renderer): void => {
      alPintar(u, renderer);
      u.uRelojQ.value = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
    };
  }

  /** Empieza un fotograma: nadie. */
  empezar(): void {
    this.n = 0;
  }

  /** Pone una cabeza. Devuelve `false` si ya no caben más. */
  poner(c: Cabeza): boolean {
    if (this.n >= this.capacidad) return false;
    const i = this.n;
    this.p.set(c.x, 0, c.z);
    this.q.setFromAxisAngle(this.arriba, c.giro);
    this.s.set(c.escalaX, c.escalaY, c.escalaZ);
    this.m.compose(this.p, this.q, this.s);
    this.malla.setMatrixAt(i, this.m);
    const a = this.anim.array as Float32Array;
    a[i * 4] = c.filaA;
    a[i * 4 + 1] = c.filaB;
    a[i * 4 + 2] = c.mezcla;
    a[i * 4 + 3] = c.lleno;
    /* Empaquetado como lo lee el sombreador (`material.ts`): ropa + 8·paraguas, pelo + 4·tela. */
    const v = this.vestido.array as Float32Array;
    v[i * 4] = (c.ropa % 8) + (c.paraguas ? 8 : 0);
    v[i * 4 + 1] = (c.pelo % 4) + 4 * c.tela;
    v[i * 4 + 2] = c.piel;
    v[i * 4 + 3] = c.amenaza ? 1 : 0;
    const k = this.contorno.array as Float32Array;
    k[i * 4] = c.contorno.r;
    k[i * 4 + 1] = c.contorno.g;
    k[i * 4 + 2] = c.contorno.b;
    k[i * 4 + 3] = c.fuerza;
    const t = this.corte.array as Float32Array;
    t[i * 4] = c.tenue;
    t[i * 4 + 1] = c.corteAltura;
    t[i * 4 + 2] = c.corteModo;
    t[i * 4 + 3] = 0;
    this.n++;
    return true;
  }

  /** Lo que se escribió de la cabeza `i` en este fotograma (para el comprobador): tenue, altura y modo del corte. */
  corteDe(i: number): readonly [number, number, number] {
    const t = this.corte.array as Float32Array;
    return [t[i * 4] as number, t[i * 4 + 1] as number, t[i * 4 + 2] as number];
  }

  /** Cierra el fotograma: cuenta y marca lo escrito. */
  terminar(): void {
    this.malla.count = this.n;
    this.malla.visible = this.n > 0;
    if (this.n === 0) return;
    /* Sin rangos: `addUpdateRange` crea un objeto por llamada, y el tampón entero son unos pocos KiB. */
    this.malla.instanceMatrix.needsUpdate = true;
    for (const at of this.atributos) at.needsUpdate = true;
  }

  /** Cuántas cabezas hay en este fotograma. */
  get cuantas(): number {
    return this.n;
  }

  /**
   * Suelta lo que es suyo: el material, las instancias y su geometría (que sólo es un envoltorio: los
   * atributos son de la malla fundida, y three los vuelve a subir si un cuerpo los sigue pintando).
   */
  liberar(): void {
    const m = this.malla.material;
    if (m instanceof THREE.Material) m.dispose();
    this.malla.dispose();
    this.geometria.dispose();
  }
}
