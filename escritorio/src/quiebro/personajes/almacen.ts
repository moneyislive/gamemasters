/**
 * EL ALMACÉN DE LOS PERSONAJES: cada `.glb` se carga UNA vez, se guarda por ruta, y lo que se saca de él
 * (clips procesados, espejos, plantillas de huesos, mallas fundidas, texturas de huesos) se hace una vez
 * por montaje y se suelta entero al desmontar.
 *
 * ═══ DOS MEMORIAS, CON DUEÑOS DISTINTOS ═══
 *
 *   · Los `.glb` leídos viven en una memoria del MÓDULO, contada por usos: si el juego desmonta y vuelve
 *     a montar los personajes (React en modo estricto lo hace siempre en desarrollo; y cambiar de mesa
 *     también), no se vuelve a descargar ni a leer nada. Cuando el último almacén los suelta se olvidan
 *     en la vuelta siguiente del bucle de eventos, por si el que desmontó vuelve a montar enseguida. Lo
 *     leído nunca llega a la GPU (no se pinta nunca: se funde), así que olvidarlo es soltar memoria de JS.
 *   · Lo derivado —geometrías fundidas, texturas de huesos— SÍ está en la GPU y es de este almacén:
 *     `liberar()` lo tira todo. Un almacén liberado no se vuelve a usar.
 *
 * ═══ LOS CLIPS SE PREPARAN AL CARGAR ═══
 *
 * A cada clip se le quita la pista de posición de la raíz (el juego mueve el cuerpo: los clips van con
 * la raíz en el sitio, aunque el reparto marque `raiz: true` en los que la traen), y el espejo de un clip
 * se hace la primera vez que alguien lo pide (`espejo.ts`). Para volver a empezar un clip que todavía se
 * está fundiendo (dos `tocado` seguidos) hace falta una segunda acción del mismo clip, y three guarda las
 * acciones por clip: `gemelo()` da un clon (que comparte las pistas) para esa segunda acción.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';
import { clipEnEspejo, espejoDelEsqueleto } from './espejo';
import type { EspejoDelEsqueleto } from './espejo';
import { HornoDeHuesos } from './huesos-en-textura';
import type { ClipAHornear, HuesosEnTextura } from './huesos-en-textura';
import { fundirElLod, paletaBase, simplificarMalla } from './malla';
import type { MallaFundida, ZonaBase } from './malla';
import { construirPieza, esPieza, piezaDeLaForja } from './piezas';
import type { HuesoDePieza, PiezaConstruida } from './piezas';
import { zonasDeLaFigura } from './reparto';
import type { FiguraDelCuerpo, Reparto } from './reparto';
import type { LodElegido } from './presupuesto';

/* ─────────────────────────────── Los .glb, por ruta y contados ─────────────────────────────── */

interface Leido {
  readonly promesa: Promise<GLTF>;
  usos: number;
  gltf: GLTF | null;
}

const LEIDOS = new Map<string, Leido>();

/** Cómo se lee un `.glb`: en el navegador, con el cargador; en Node, el comprobador pone el suyo. */
export type Lector = (url: string) => Promise<GLTF>;

/**
 * El cargador con el descompresor de meshopt: los `.glb` del reparto van comprimidos
 * (`EXT_meshopt_compression`) y sin él la carga falla entera. El descompresor viene con three.
 */
export function cargador(): GLTFLoader {
  const l = new GLTFLoader();
  l.setMeshoptDecoder(MeshoptDecoder);
  return l;
}

export const leerConElCargador: Lector = (url) => cargador().loadAsync(url);

function tomar(url: string, lector: Lector): Leido {
  let l = LEIDOS.get(url);
  if (l === undefined) {
    const nuevo: Leido = { promesa: lector(url), usos: 0, gltf: null };
    nuevo.promesa.then(
      (g) => {
        nuevo.gltf = g;
      },
      () => {
        /* Un fallo no se guarda: el siguiente que lo pida lo vuelve a intentar. */
        if (LEIDOS.get(url) === nuevo) LEIDOS.delete(url);
      },
    );
    LEIDOS.set(url, nuevo);
    l = nuevo;
  }
  l.usos++;
  return l;
}

function soltar(url: string): void {
  const l = LEIDOS.get(url);
  if (l === undefined) return;
  l.usos = Math.max(0, l.usos - 1);
  if (l.usos > 0) return;
  setTimeout(() => {
    const otra = LEIDOS.get(url);
    if (otra !== undefined && otra.usos === 0) LEIDOS.delete(url);
  }, 0);
}

/** Cuántos `.glb` hay en la memoria del módulo (para el banco y el comprobador). */
export function leidosEnMemoria(): number {
  return LEIDOS.size;
}

/* ─────────────────────────────── Los clips de un esqueleto ─────────────────────────────── */

export class ClipsDelEsqueleto {
  private readonly espejos = new Map<string, THREE.AnimationClip>();
  private readonly gemelos = new Map<string, THREE.AnimationClip>();
  private espejo: EspejoDelEsqueleto | null = null;

  constructor(
    readonly porNombre: ReadonlyMap<string, THREE.AnimationClip>,
    private readonly reposo: THREE.Object3D,
  ) {}

  /**
   * El clip, o su espejo. `null` si no está. Si el esqueleto no admite espejo (no es simétrico), da el
   * clip sin espejo y lo dice una vez: se llama desde el fotograma, y lanzar ahí tumbaría la noche.
   */
  clip(nombre: string, enEspejo: boolean): THREE.AnimationClip | null {
    const c = this.porNombre.get(nombre);
    if (c === undefined) return null;
    if (!enEspejo) return c;
    let e = this.espejos.get(nombre);
    if (e === undefined) {
      try {
        this.espejo ??= espejoDelEsqueleto(this.reposo);
        e = clipEnEspejo(c, this.espejo);
      } catch (error) {
        console.warn(`[quiebro] personajes: sin espejo para ${nombre}: ${error instanceof Error ? error.message : String(error)}`);
        e = c;
      }
      this.espejos.set(nombre, e);
    }
    return e;
  }

  private readonly apoyos = new Map<string, number>();

  /** A qué altura está un hueso en el reposo de este esqueleto (m), o `null` si no lo tiene. */
  altura(hueso: string): number | null {
    const o = this.reposo.getObjectByName(hueso);
    if (o === undefined) return null;
    this.reposo.updateWorldMatrix(true, true);
    return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).y;
  }

  /**
   * LA FASE DEL APOYO de un clip de paso: en qué punto de su ciclo (0 a 1) pisa el pie izquierdo, medida
   * sobre el esqueleto en reposo de los propios clips (el momento en que el pie está más bajo, en media
   * circular de los fotogramas a menos de 5 mm del suelo). Es la marca de sincronía de la marcha: andar,
   * trotar y correr no pisan en el mismo punto de su ciclo, y mezclarlos con la misma fase sin alinearlos
   * deja un pie que no apoya en ninguno (el comprobador lo midió: 0,4 m/s de resbalón a 5 m/s, entre
   * trotar y correr, con los dos clips limpios por separado). 0 si no hay pie izquierdo.
   */
  apoyo(nombre: string): number {
    const hecho = this.apoyos.get(nombre);
    if (hecho !== undefined) return hecho;
    const c = this.porNombre.get(nombre);
    let fase = 0;
    if (c !== undefined) {
      const copia = this.reposo.clone(true);
      const pie = copia.getObjectByName('pie_L');
      if (pie !== undefined) {
        const mezclador = new THREE.AnimationMixer(copia);
        const accion = mezclador.clipAction(c);
        accion.play();
        const n = 48;
        const alturas: number[] = [];
        const p = new THREE.Vector3();
        for (let k = 0; k < n; k++) {
          accion.time = (k / n) * c.duration;
          mezclador.update(0);
          copia.updateMatrixWorld(true);
          pie.getWorldPosition(p);
          alturas.push(p.y);
        }
        const minimo = Math.min(...alturas);
        let sx = 0;
        let sy = 0;
        alturas.forEach((y, k) => {
          if (y > minimo + 0.005) return;
          sx += Math.cos((k / n) * Math.PI * 2);
          sy += Math.sin((k / n) * Math.PI * 2);
        });
        fase = ((Math.atan2(sy, sx) / (Math.PI * 2)) % 1 + 1) % 1;
        mezclador.stopAllAction();
        mezclador.uncacheRoot(copia);
      }
    }
    this.apoyos.set(nombre, fase);
    return fase;
  }

  /** Un clon del clip (mismas pistas) para una segunda acción del mismo clip. */
  gemelo(c: THREE.AnimationClip): THREE.AnimationClip {
    let g = this.gemelos.get(c.uuid);
    if (g === undefined) {
      g = new THREE.AnimationClip(`${c.name}#2`, c.duration, c.tracks, c.blendMode);
      this.gemelos.set(c.uuid, g);
    }
    return g;
  }
}

/** Quita la posición de la raíz de un clip: el juego mueve el cuerpo. */
export function clipEnElSitio(clip: THREE.AnimationClip, raiz: string): THREE.AnimationClip {
  const pistas = clip.tracks.filter((t) => t.name !== `${raiz}.position`);
  return new THREE.AnimationClip(clip.name, clip.duration, pistas, clip.blendMode);
}

/* ─────────────────────────────── El almacén ─────────────────────────────── */

/** Un LOD dado por su índice es ese LOD sin simplificar. */
function aLod(lod: LodElegido | number): LodElegido {
  return typeof lod === 'number' ? { indice: lod, simplificado: null } : lod;
}

/** Un clip que se pide hornear: con qué nombre queda en la textura, de qué clip sale y su postura. */
export interface PedidoDeHorneado {
  readonly nombre: string;
  readonly clip: string;
  readonly espejo?: boolean;
  readonly bucle: boolean;
  readonly postura?: ((raiz: THREE.Object3D) => void) | undefined;
}

export class Almacen {
  private readonly urls = new Set<string>();
  private readonly clips = new Map<string, ClipsDelEsqueleto>();
  private readonly plantillas = new Map<string, THREE.Object3D>();
  private readonly paletas = new Map<string, ZonaBase[]>();
  private readonly fundidas = new Map<string, MallaFundida>();
  private readonly texturas = new Map<string, HuesosEnTextura>();
  private readonly pendientes = new Map<string, Promise<void>>();
  private readonly piezas = new Map<string, PiezaConstruida>();
  private liberado = false;
  /** Lo que tardó en hornear cada textura de huesos (ms), para el banco. */
  readonly horneados: { clave: string; ms: number; filas: number }[] = [];
  /** Errores de carga, para el banco (y la consola, una vez). */
  readonly errores: string[] = [];

  constructor(
    readonly reparto: Reparto,
    private readonly urlDe: (archivo: string) => string,
    private readonly lector: Lector = leerConElCargador,
  ) {}

  private leer(archivo: string): Promise<GLTF> {
    const url = this.urlDe(archivo);
    if (!this.urls.has(url)) {
      this.urls.add(url);
      return tomar(url, this.lector).promesa;
    }
    return LEIDOS.get(url)?.promesa ?? tomar(url, this.lector).promesa;
  }

  private apuntar(e: unknown, que: string): void {
    const texto = `${que}: ${e instanceof Error ? e.message : String(e)}`;
    if (!this.errores.includes(texto)) {
      this.errores.push(texto);
      console.warn(`[quiebro] personajes: ${texto}`);
    }
  }

  /** Una vez por clave: lo que ya se pidió no se vuelve a pedir. */
  private unaVez(clave: string, hacer: () => Promise<void>): Promise<void> {
    let p = this.pendientes.get(clave);
    if (p === undefined) {
      p = hacer().catch((e: unknown) => {
        this.apuntar(e, clave);
        this.pendientes.delete(clave);
      });
      this.pendientes.set(clave, p);
    }
    return p;
  }

  /* ── Clips ── */

  /** Carga los clips de un esqueleto (por nombre del manifiesto). */
  prepararClips(esqueleto: string): Promise<void> {
    return this.unaVez(`clips:${esqueleto}`, async () => {
      const e = this.reparto.esqueletos[esqueleto];
      if (e === undefined) throw new Error(`No hay esqueleto «${esqueleto}»`);
      const g = await this.leer(e.clips);
      if (this.liberado) return;
      const porNombre = new Map<string, THREE.AnimationClip>();
      for (const c of g.animations) porNombre.set(c.name, clipEnElSitio(c, e.raiz));
      this.clips.set(esqueleto, new ClipsDelEsqueleto(porNombre, g.scene));
    });
  }

  clipsDe(esqueleto: string): ClipsDelEsqueleto | null {
    return this.clips.get(esqueleto) ?? null;
  }

  /* ── Figuras ── */

  private claveDeLod(figura: FiguraDelCuerpo, lod: LodElegido): string {
    return `${figura.claveDeMalla}@${String(lod.indice)}${lod.simplificado !== null ? `~${String(lod.simplificado)}` : ''}`;
  }

  /**
   * UNA PIEZA por nombre: la de la forja si el manifiesto la trae (`piezas`), la de código si no. Con
   * el sufijo `-ligero` se pide la de código aunque haya otra: la multitud lleva 48 paraguas y el de la
   * forja son 400 triángulos (el de código, 64). `null` si no hay ni una ni otra.
   */
  private async pieza(nombre: string): Promise<PiezaConstruida | null> {
    const hecha = this.piezas.get(nombre);
    if (hecha !== undefined) return hecha;
    const ligera = nombre.endsWith('-ligero') ? nombre.slice(0, -'-ligero'.length) : null;
    const deLaForja = ligera === null ? this.reparto.piezas[nombre] : undefined;
    let p: PiezaConstruida | null = null;
    if (deLaForja !== undefined) {
      const g = await this.leer(deLaForja.archivo);
      p = piezaDeLaForja(nombre, g.scene, deLaForja.hueso);
    } else {
      const base = ligera ?? nombre;
      if (esPieza(base)) p = construirPieza(base);
    }
    if (p !== null) this.piezas.set(nombre, p);
    return p;
  }

  /**
   * Prepara el LOD `lod` de una figura con sus piezas y sus zonas quitadas: lee el `.glb`, saca la
   * plantilla de huesos y la paleta base la primera vez, funde la malla y, si el LOD lo pide, la
   * simplifica (el maniquí: ver `simplificarMalla`). `lod` es un índice o un `LodElegido`.
   */
  prepararLod(figura: FiguraDelCuerpo, lodPedido: LodElegido | number): Promise<void> {
    const lod = aLod(lodPedido);
    const clave = this.claveDeLod(figura, lod);
    return this.unaVez(`lod:${clave}`, async () => {
      const f = this.reparto.figuras[figura.figura];
      const l = f?.lods[lod.indice];
      if (f === undefined || l === undefined) throw new Error(`No hay LOD ${String(lod.indice)} de «${figura.figura}»`);
      if (lod.simplificado !== null) {
        /* El maniquí sale del LOD sin simplificar: se prepara (o se espera) primero. */
        const sin: LodElegido = { indice: lod.indice, simplificado: null };
        await this.prepararLod(figura, sin);
        const base = this.fundidas.get(this.claveDeLod(figura, sin));
        if (base === undefined || this.liberado) return;
        await MeshoptSimplifier.ready;
        if (this.liberado) return;
        const simple = simplificarMalla(base, lod.simplificado, (indices, posiciones, objetivo) => MeshoptSimplifier.simplify(indices, posiciones, 3, objetivo, 1)[0]);
        this.fundidas.set(clave, simple);
        return;
      }
      const g = await this.leer(l.archivo);
      if (this.liberado) return;
      const esqueleto = this.reparto.esqueletos[f.esqueleto];
      if (esqueleto === undefined) throw new Error(`No hay esqueleto «${f.esqueleto}»`);
      if (!this.plantillas.has(figura.figura)) this.plantillas.set(figura.figura, plantillaDeHuesos(g.scene, esqueleto.raiz));
      const zonas = zonasDeLaFigura(this.reparto, figura.figura);
      /* La paleta es de la variante (ver `paletaBase`) y la saca el primer LOD que llega: así no cambia de tono al cambiar de LOD. */
      const clavePaleta = `${figura.figura}|${(figura.mallas ?? ['*']).join('+')}`;
      if (!this.paletas.has(clavePaleta)) this.paletas.set(clavePaleta, paletaBase(g.scene, zonas, figura.mallas));
      const piezas = (await Promise.all(figura.piezas.map((n) => this.pieza(n)))).filter((p): p is PiezaConstruida => p !== null);
      if (this.liberado) return;
      const huesoDe = (h: HuesoDePieza): string => (h === 'cabeza' ? esqueleto.cabeza : esqueleto.agarre.derecha);
      const fundida = fundirElLod(g.scene, { zonas, sinZonas: figura.sinZonas, mallas: figura.mallas, piezas, huesoDe, base: this.paletas.get(clavePaleta) ?? null });
      this.fundidas.set(clave, fundida);
    });
  }

  /**
   * La malla fundida de un LOD si ya está (`exacta`); si no, la del mismo LOD sin simplificar o la del
   * LOD cargado más cercano, para no dejar de pintar mientras llega; `null` si ninguna.
   */
  fundida(figura: FiguraDelCuerpo, lodPedido: LodElegido | number): { malla: MallaFundida; exacta: boolean; clave: string } | null {
    const lod = aLod(lodPedido);
    const clave = this.claveDeLod(figura, lod);
    const exacta = this.fundidas.get(clave);
    if (exacta !== undefined) return { malla: exacta, exacta: true, clave };
    const n = this.reparto.figuras[figura.figura]?.lods.length ?? 0;
    for (let d = 0; d < n; d++) {
      for (const k of d === 0 ? [lod.indice] : [lod.indice + d, lod.indice - d]) {
        const otra = this.claveDeLod(figura, { indice: k, simplificado: null });
        const m = this.fundidas.get(otra);
        if (m !== undefined) return { malla: m, exacta: false, clave: otra };
      }
    }
    return null;
  }

  private readonly paletasDeVariante = new Map<string, ZonaBase[]>();

  /**
   * LOS COLORES DE UNA VARIANTE (una ropa, un estilo) sin fundir su malla: para la tabla de ropas de la
   * multitud, que pinta todas las ropas con un solo maniquí (ver `director.ts`). `null` mientras no se
   * haya leído su `.glb` (y lo pide).
   */
  paletaDeVariante(figura: string, lod: number, mallas: readonly string[] | null): ZonaBase[] | null {
    const clave = `${figura}|${String(lod)}|${(mallas ?? ['*']).join('+')}`;
    const hecha = this.paletasDeVariante.get(clave);
    if (hecha !== undefined) return hecha;
    void this.unaVez(`paleta:${clave}`, async () => {
      const l = this.reparto.figuras[figura]?.lods[lod];
      if (l === undefined) throw new Error(`No hay LOD ${String(lod)} de «${figura}»`);
      const g = await this.leer(l.archivo);
      if (this.liberado) return;
      this.paletasDeVariante.set(clave, paletaBase(g.scene, zonasDeLaFigura(this.reparto, figura), mallas));
    });
    return null;
  }

  /** La plantilla de huesos de una figura (en reposo), si ya se leyó algún LOD suyo. */
  plantilla(figura: string): THREE.Object3D | null {
    return this.plantillas.get(figura) ?? null;
  }

  /**
   * LA TEXTURA DE HUESOS de una figura para unos clips (con la postura que lleve cada uno). La primera
   * vez se pone en la cola del horno y se devuelve A MEDIO HACER (`lista` falso): la hornea `trabajar`,
   * a trozos, entre fotogramas (ver «A trozos» en `huesos-en-textura.ts`). Hace falta la plantilla y los
   * clips del esqueleto; `null` si aún no están. `clave` identifica los pedidos (quien pide los mismos
   * clips con la misma clave recibe la misma textura).
   */
  texturaDeHuesos(figura: string, esqueleto: string, malla: MallaFundida, pedidos: readonly PedidoDeHorneado[], clave: string): HuesosEnTextura | null {
    const completa = `${figura}|${String(malla.huesos.length)}|${malla.huesos[0] ?? ''}|${clave}`;
    const hecha = this.texturas.get(completa);
    if (hecha !== undefined) return hecha;
    const plantilla = this.plantillas.get(figura);
    const clips = this.clips.get(esqueleto);
    if (plantilla === undefined || clips === undefined) return null;
    const lista: ClipAHornear[] = [];
    for (const c of pedidos) {
      const clip = clips.clip(c.clip, c.espejo === true);
      if (clip === null) {
        this.apuntar(new Error(`falta el clip ${c.clip}`), `horneado de ${figura}`);
        continue;
      }
      lista.push({ nombre: c.nombre, clip, bucle: c.bucle, postura: c.postura });
    }
    /* Se hornea sobre una copia: la plantilla es de todos los cuerpos de esta figura. */
    const horno = new HornoDeHuesos(plantilla.clone(true), malla.huesos, malla.inversas, lista);
    this.texturas.set(completa, horno);
    this.cola.push({ horno, clave: `${figura} · ${clave} (${String(lista.length)} clips)` });
    return horno;
  }

  private readonly cola: { horno: HornoDeHuesos; clave: string }[] = [];

  /**
   * HORNEA lo que haya en la cola durante `presupuestoMs` como mucho (al menos una fila si hay algo). Se
   * llama una vez por fotograma. Devuelve cuántas texturas quedan por acabar.
   */
  trabajar(presupuestoMs: number): number {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    while (this.cola.length > 0 && !this.liberado) {
      const primera = this.cola[0] as { horno: HornoDeHuesos; clave: string };
      const queda = presupuestoMs - ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
      if (queda <= 0) break;
      if (!primera.horno.trabajar(queda)) break;
      this.cola.shift();
      this.horneados.push({ clave: primera.clave, ms: primera.horno.msHorneado, filas: primera.horno.filas });
    }
    return this.cola.length;
  }

  /** Cuántas texturas esperan al horno (para el banco y el comprobador). */
  get porHornear(): number {
    return this.cola.length;
  }

  /** SUELTA todo: lo de la GPU se tira, los `.glb` se devuelven a la memoria del módulo. */
  liberar(): void {
    if (this.liberado) return;
    this.liberado = true;
    this.cola.length = 0;
    for (const f of this.fundidas.values()) f.geometria.dispose();
    for (const t of this.texturas.values()) t.textura.dispose();
    for (const p of this.piezas.values()) p.geometria.dispose();
    this.fundidas.clear();
    this.texturas.clear();
    this.plantillas.clear();
    this.clips.clear();
    for (const u of this.urls) soltar(u);
    this.urls.clear();
  }

  get estaLiberado(): boolean {
    return this.liberado;
  }
}

/**
 * LA PLANTILLA DE HUESOS de una figura: el nodo que cuelga el esqueleto (el `esqueleto` de la forja),
 * con su sitio, y sólo el árbol de huesos debajo, sin las mallas de la forja. De ella salen los cuerpos
 * con `SkeletonUtils.clone`.
 */
export function plantillaDeHuesos(escena: THREE.Object3D, raiz: string): THREE.Object3D {
  const hueso = escena.getObjectByName(raiz);
  if (hueso === undefined) throw new Error(`La figura no tiene el hueso raíz «${raiz}»`);
  escena.updateWorldMatrix(true, true);
  const plantilla = new THREE.Group();
  plantilla.name = 'plantilla-de-huesos';
  const padre = hueso.parent;
  const colgador = new THREE.Object3D();
  colgador.name = padre?.name ?? 'esqueleto';
  if (padre !== null) padre.matrixWorld.decompose(colgador.position, colgador.quaternion, colgador.scale);
  colgador.add(hueso.clone(true));
  plantilla.add(colgador);
  plantilla.updateMatrixWorld(true);
  return plantilla;
}
