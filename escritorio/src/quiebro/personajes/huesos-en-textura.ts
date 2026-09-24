/**
 * LA ANIMACIÓN HORNEADA EN TEXTURA: las matrices de los huesos de cada fotograma de cada clip, en una
 * `DataTexture` que la multitud y los cuerpos lejanos leen desde el sombreador.
 *
 * ═══ POR QUÉ HUESOS Y NO VÉRTICES ═══
 *
 * El VAT clásico hornea la POSICIÓN de cada vértice en cada fotograma. Con el maniquí de 400 triángulos
 * serían unos 300 vértices, pero con el LOD de 1.500 ya son mil, cada figura necesita su textura, el
 * paraguas la suya, y cualquier cambio de la forja obliga a volver a hornear en Node y a subir un `.bin`
 * que se queda viejo sin avisar. Horneando los HUESOS (57 por fotograma, tres texeles cada uno) la misma
 * textura sirve para todas las figuras del mismo esqueleto y para cualquier LOD, el paraguas cuelga del
 * hueso del agarre en la misma textura, y el sombreador hace la piel de siempre (cuatro huesos por
 * vértice) leyendo de ella. Cuesta doce lecturas de textura por vértice en vez de una o dos: con 48
 * maniquíes son unas 170.000 lecturas por fotograma, nada para la GPU de un teléfono.
 *
 * ═══ POR QUÉ AL CARGAR Y NO EN UN `.bin` ═══
 *
 * Porque así no puede quedarse viejo: se hornea con el esqueleto y los clips que se acaban de cargar,
 * los mismos que mueven a los cuerpos con esqueleto. El reparto puede cambiar un clip y la multitud lo
 * pinta en la siguiente carga, sin guion de horneado que alguien se olvide de correr.
 *
 * ═══ A TROZOS, Y NUNCA DENTRO DE UN FOTOGRAMA DE PELEA ═══
 *
 * La primera versión horneaba de una vez la primera vez que un rebaño hacía falta: 35-46 ms en frío por
 * figura DENTRO de `useFrame`, justo cuando un Celador se alejaba a más de 12 m en N0, en plena pelea (lo
 * midió la revisión). Ahora cada textura la hace un `HornoDeHuesos` que avanza fila a fila con un
 * presupuesto de milisegundos por fotograma (`trabajar`), el director pide TODO lo que el nivel va a
 * necesitar al montar (`preparar`) y la Bajada lo tapa. Con los 31 gestos de los cuerpos lejanos son
 * unas 1.300 filas por figura: a 2,5 ms por fotograma, menos de un segundo por figura en un PC.
 *
 * ═══ MEDIA PRECISIÓN ═══
 *
 * Una fila son 57 × 3 texeles; mil trescientas filas en `RGBA32F` son 3,5 MB por figura, y en N0 hacen
 * falta seis figuras. En `RGBA16F` (que WebGL2 lee sin extensiones) son la mitad, y el error de la media
 * precisión en una matriz de piel es de uno o dos milímetros (lo mide el comprobador): nada a los
 * 12 m desde los que un cuerpo va en textura, y un píxel como mucho en el durmiente más cercano.
 *
 * ═══ LA FORMA DE LA TEXTURA ═══
 *
 * Una fila por fotograma de clip, tres texeles por hueso (las tres primeras filas de la matriz de piel
 * `mundo · inversa`, la cuarta es 0 0 0 1). Los clips en bucle guardan N fotogramas (el N+1 es el 0);
 * los de una vez, N+1 (el último incluido). Filtro `Nearest`: el sombreador interpola él mismo entre dos
 * filas.
 *
 * ═══ LA POSTURA ENCIMA, UNA VEZ ═══
 *
 * La postura del paraguas se pone encima de cada fila, y se BORRA antes de la siguiente (ver
 * `PoseGuardada` en `postura.ts`): el mezclador no reescribe los huesos que un clip trae quietos, y un
 * giro relativo se acumulaba fila tras fila (los dedos daban 1,25 rad por fila).
 */
import * as THREE from 'three';

/** Fotogramas por segundo del horneado (los de la forja). */
export const FPS_DEL_HORNEADO = 30;

/** Dónde vive un clip en la textura. */
export interface ClipHorneado {
  readonly inicio: number;
  readonly filas: number;
  readonly bucle: boolean;
  readonly duracion: number;
}

export interface HuesosEnTextura {
  readonly textura: THREE.DataTexture;
  readonly clips: ReadonlyMap<string, ClipHorneado>;
  readonly huesos: number;
  readonly filas: number;
  /** Lo que lleva de horneado, en ms (para el banco), sumando todos sus trozos. */
  readonly msHorneado: number;
  /** Si ya está entera (hasta entonces no se pinta con ella). */
  readonly lista: boolean;
  /** Media precisión (lo de la GPU) o entera (el comprobador, para medir la cuenta sin el redondeo). */
  readonly media: boolean;
  /** La matriz de piel del hueso `j` en la fila `fila`, tal como la lee la GPU. */
  matriz(fila: number, j: number, salida: THREE.Matrix4): THREE.Matrix4;
}

/** Un clip que hornear, con la postura que se le pone encima (el paraguas) si la hay. */
export interface ClipAHornear {
  readonly nombre: string;
  readonly clip: THREE.AnimationClip;
  readonly bucle: boolean;
  readonly postura?: ((raiz: THREE.Object3D) => void) | undefined;
}

const ahoraMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * UN HORNO: hornea unos clips sobre un esqueleto, a trozos. `raiz` es una COPIA de la plantilla de
 * huesos de la figura (en su origen, fuera de cualquier escena: el horno la mueve), `huesos` los nombres
 * en el orden de la piel y `inversas` sus inversas. La textura existe desde el principio; se sube a la
 * GPU cuando está entera.
 */
export class HornoDeHuesos implements HuesosEnTextura {
  readonly textura: THREE.DataTexture;
  readonly clips: ReadonlyMap<string, ClipHorneado>;
  readonly huesos: number;
  readonly filas: number;
  readonly media: boolean;
  msHorneado = 0;
  lista = false;
  private readonly datos16: Uint16Array | null;
  private readonly datos32: Float32Array | null;
  private readonly nodos: THREE.Object3D[];
  private readonly todos: THREE.Object3D[] = [];
  private readonly guardadas: { q: THREE.Quaternion; p: THREE.Vector3; s: THREE.Vector3 }[] = [];
  private readonly reposo: { q: THREE.Quaternion; p: THREE.Vector3; s: THREE.Vector3 }[] = [];
  private readonly mezclador: THREE.AnimationMixer;
  private accion: THREE.AnimationAction | null = null;
  private cual = 0;
  private fila = 0;
  private readonly m = new THREE.Matrix4();
  private readonly raizInversa = new THREE.Matrix4();
  private readonly ancho: number;

  constructor(
    private readonly raiz: THREE.Object3D,
    huesos: readonly string[],
    private readonly inversas: readonly THREE.Matrix4[],
    private readonly pedidos: readonly ClipAHornear[],
    media = true,
  ) {
    this.nodos = huesos.map((n) => {
      const o = raiz.getObjectByName(n);
      if (o === undefined) throw new Error(`La plantilla no tiene el hueso ${n}`);
      return o;
    });
    raiz.traverse((o) => {
      this.todos.push(o);
      this.guardadas.push({ q: o.quaternion.clone(), p: o.position.clone(), s: o.scale.clone() });
      this.reposo.push({ q: o.quaternion.clone(), p: o.position.clone(), s: o.scale.clone() });
    });
    const sitios = new Map<string, ClipHorneado>();
    let filas = 0;
    for (const c of pedidos) {
      const n = Math.max(1, Math.round(c.clip.duration * FPS_DEL_HORNEADO));
      const cuantas = c.bucle ? n : n + 1;
      sitios.set(c.nombre, { inicio: filas, filas: cuantas, bucle: c.bucle, duracion: c.clip.duration });
      filas += cuantas;
    }
    this.clips = sitios;
    this.filas = Math.max(1, filas);
    this.huesos = huesos.length;
    this.ancho = huesos.length * 3;
    this.media = media;
    const n = this.ancho * this.filas * 4;
    this.datos16 = media ? new Uint16Array(n) : null;
    this.datos32 = media ? null : new Float32Array(n);
    this.textura = new THREE.DataTexture(media ? this.datos16 : this.datos32, this.ancho, this.filas, THREE.RGBAFormat, media ? THREE.HalfFloatType : THREE.FloatType);
    this.textura.minFilter = THREE.NearestFilter;
    this.textura.magFilter = THREE.NearestFilter;
    this.textura.generateMipmaps = false;
    this.textura.name = 'huesos-en-textura';
    this.mezclador = new THREE.AnimationMixer(raiz);
    if (pedidos.length === 0) this.acabar();
  }

  /** Cuántas filas le quedan. */
  get quedan(): number {
    if (this.lista) return 0;
    let hechas = 0;
    for (let k = 0; k < this.cual; k++) hechas += this.clips.get((this.pedidos[k] as ClipAHornear).nombre)?.filas ?? 0;
    return this.filas - hechas - this.fila;
  }

  /**
   * HORNEA FILAS hasta gastar `presupuestoMs` (al menos una fila). Devuelve `true` cuando está entera.
   * Con `Infinity`, de una vez (el comprobador).
   */
  trabajar(presupuestoMs: number): boolean {
    if (this.lista) return true;
    const t0 = ahoraMs();
    do {
      this.unaFila();
      if (this.lista) break;
    } while (ahoraMs() - t0 < presupuestoMs);
    this.msHorneado += ahoraMs() - t0;
    return this.lista;
  }

  private unaFila(): void {
    const c = this.pedidos[this.cual];
    if (c === undefined) {
      this.acabar();
      return;
    }
    const sitio = this.clips.get(c.nombre) as ClipHorneado;
    if (this.accion === null) {
      this.accion = this.mezclador.clipAction(c.clip);
      this.accion.reset();
      this.accion.setLoop(THREE.LoopOnce, 1);
      this.accion.clampWhenFinished = true;
      this.accion.play();
    }
    const raiz = this.raiz;
    this.accion.time = Math.min(c.clip.duration, this.fila / FPS_DEL_HORNEADO);
    this.mezclador.update(0);
    if (c.postura !== undefined) {
      /* La pose del mezclador, guardada: la postura va encima y se borra al acabar la fila. */
      for (let i = 0; i < this.todos.length; i++) {
        const o = this.todos[i] as THREE.Object3D;
        const g = this.guardadas[i] as { q: THREE.Quaternion; p: THREE.Vector3; s: THREE.Vector3 };
        g.q.copy(o.quaternion);
        g.p.copy(o.position);
        g.s.copy(o.scale);
      }
      raiz.updateMatrixWorld(true);
      c.postura(raiz);
    }
    raiz.updateMatrixWorld(true);
    this.raizInversa.copy(raiz.matrixWorld).invert();
    const fila = sitio.inicio + this.fila;
    const d16 = this.datos16;
    const d32 = this.datos32;
    for (let j = 0; j < this.nodos.length; j++) {
      this.m.multiplyMatrices(this.raizInversa, (this.nodos[j] as THREE.Object3D).matrixWorld).multiply(this.inversas[j] as THREE.Matrix4);
      const e = this.m.elements;
      const base = (fila * this.ancho + j * 3) * 4;
      for (let r = 0; r < 3; r++) {
        const k = base + r * 4;
        if (d16 !== null) {
          d16[k] = THREE.DataUtils.toHalfFloat(e[r] as number);
          d16[k + 1] = THREE.DataUtils.toHalfFloat(e[4 + r] as number);
          d16[k + 2] = THREE.DataUtils.toHalfFloat(e[8 + r] as number);
          d16[k + 3] = THREE.DataUtils.toHalfFloat(e[12 + r] as number);
        } else if (d32 !== null) {
          d32[k] = e[r] as number;
          d32[k + 1] = e[4 + r] as number;
          d32[k + 2] = e[8 + r] as number;
          d32[k + 3] = e[12 + r] as number;
        }
      }
    }
    if (c.postura !== undefined) {
      for (let i = 0; i < this.todos.length; i++) {
        const o = this.todos[i] as THREE.Object3D;
        const g = this.guardadas[i] as { q: THREE.Quaternion; p: THREE.Vector3; s: THREE.Vector3 };
        o.quaternion.copy(g.q);
        o.position.copy(g.p);
        o.scale.copy(g.s);
      }
    }
    this.fila++;
    if (this.fila >= sitio.filas) {
      this.accion.stop();
      this.mezclador.uncacheAction(c.clip);
      this.accion = null;
      this.fila = 0;
      this.cual++;
      if (this.cual >= this.pedidos.length) this.acabar();
    }
  }

  private acabar(): void {
    if (this.lista) return;
    this.mezclador.stopAllAction();
    this.mezclador.uncacheRoot(this.raiz);
    /* La plantilla, como estaba. */
    for (let i = 0; i < this.todos.length; i++) {
      const o = this.todos[i] as THREE.Object3D;
      const r = this.reposo[i] as { q: THREE.Quaternion; p: THREE.Vector3; s: THREE.Vector3 };
      o.quaternion.copy(r.q);
      o.position.copy(r.p);
      o.scale.copy(r.s);
    }
    this.raiz.updateMatrixWorld(true);
    this.textura.needsUpdate = true;
    this.lista = true;
  }

  matriz(fila: number, j: number, salida: THREE.Matrix4): THREE.Matrix4 {
    const base = (fila * this.ancho + j * 3) * 4;
    const e = salida.elements;
    const leer = (k: number): number => (this.datos16 !== null ? THREE.DataUtils.fromHalfFloat(this.datos16[k] as number) : ((this.datos32 as Float32Array)[k] as number));
    for (let r = 0; r < 3; r++) {
      e[r] = leer(base + r * 4);
      e[4 + r] = leer(base + r * 4 + 1);
      e[8 + r] = leer(base + r * 4 + 2);
      e[12 + r] = leer(base + r * 4 + 3);
    }
    e[3] = 0;
    e[7] = 0;
    e[11] = 0;
    e[15] = 1;
    return salida;
  }
}

/**
 * HORNEA de una vez (el comprobador): lo mismo que un `HornoDeHuesos` trabajado hasta el final. `media`
 * elige la precisión (la de la GPU es media).
 */
export function hornearHuesos(raiz: THREE.Object3D, huesos: readonly string[], inversas: readonly THREE.Matrix4[], clips: readonly ClipAHornear[], media = true): HuesosEnTextura {
  const h = new HornoDeHuesos(raiz, huesos, inversas, clips, media);
  h.trabajar(Number.POSITIVE_INFINITY);
  return h;
}

/** Las dos filas y la mezcla entre ellas para un clip en el tiempo `t` (s). */
export interface FilasDeAnimacion {
  a: number;
  b: number;
  mezcla: number;
}

/**
 * La fila (con decimales) de un clip en `t` segundos: en bucle da la vuelta; si no, se queda al final.
 * `bucle` puede pedir que un clip horneado en bucle se quede en su último fotograma (un gesto sostenido
 * con un clip que la forja hizo en bucle, como el desalojable).
 */
function filaCon(c: ClipHorneado, t: number, bucle: boolean): number {
  const f = t * FPS_DEL_HORNEADO;
  if (bucle && c.bucle) {
    const r = f % c.filas;
    return r < 0 ? r + c.filas : r;
  }
  return Math.min(c.filas - 1, Math.max(0, f));
}

/**
 * LAS FILAS DE UN CLIP en `t`: la de antes, la de después y cuánto de la segunda. En bucle, la
 * siguiente del último fotograma es el primero. `bucle` falso lo deja clavado al final aunque se
 * horneara en bucle.
 */
export function filasEn(c: ClipHorneado, t: number, salida: FilasDeAnimacion, bucle = c.bucle): FilasDeAnimacion {
  const enBucle = bucle && c.bucle;
  const f = filaCon(c, t, enBucle);
  const i = Math.floor(f);
  const siguiente = enBucle ? (i + 1) % c.filas : Math.min(c.filas - 1, i + 1);
  salida.a = c.inicio + i;
  salida.b = c.inicio + siguiente;
  salida.mezcla = f - i;
  return salida;
}

/**
 * LAS FILAS DE UNA MEZCLA DE DOS CLIPS (andar y estar parado, al llegar al bordillo; o el gesto que sale
 * y el que entra en un cuerpo lejano): con los dos pesando, el fotograma más cercano de cada uno y la
 * mezcla entre ellos; con uno solo, sus dos filas.
 */
export function filasDeLaMezcla(
  a: ClipHorneado,
  ta: number,
  b: ClipHorneado,
  tb: number,
  pesoB: number,
  salida: FilasDeAnimacion,
  bucleA = a.bucle,
  bucleB = b.bucle,
): FilasDeAnimacion {
  if (pesoB <= 0.02) return filasEn(a, ta, salida, bucleA);
  if (pesoB >= 0.98) return filasEn(b, tb, salida, bucleB);
  salida.a = a.inicio + (Math.round(filaCon(a, ta, bucleA && a.bucle)) % a.filas);
  salida.b = b.inicio + (Math.round(filaCon(b, tb, bucleB && b.bucle)) % b.filas);
  salida.mezcla = pesoB;
  return salida;
}
