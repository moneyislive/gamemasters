/**
 * UN CUERPO CON ESQUELETO: la figura de la forja clonada, sus mallas por LOD, su mezclador y la máquina
 * de gestos (`gestos.ts`) aplicada a las `AnimationAction` de three.
 *
 * ═══ UN ESQUELETO, VARIAS MALLAS ═══
 *
 * Cada cuerpo clona con `SkeletonUtils.clone` la plantilla de huesos de su figura (el árbol de huesos,
 * sin mallas) y cuelga de ella una `SkinnedMesh` por LOD que llegue a usar, todas con la MISMA lista de
 * huesos y el mismo material. Cambiar de LOD es cambiar qué malla se ve: el mezclador, el gesto en curso
 * y la fase del paso siguen donde estaban. La malla que no se ve no gasta nada (three no actualiza el
 * esqueleto de lo que no pinta).
 *
 * ═══ EL RELOJ ═══
 *
 * Cada cuerpo avanza con SU reloj de presentación (`ahora` y `dtMs` los da el componente: el verdadero
 * para el propio, el del Remanso para los demás), porque `gestoDesdeMs` e `impactoMs` vienen en ese
 * reloj (contrato de `cuerpos.ts`). Un cuerpo lejano en N0 anima a 7 Hz: se acumula el tiempo y el
 * mezclador se avanza de una vez.
 *
 * Un cuerpo lejano en N0 anima a 7 Hz, salvo mientras da un golpe: de su principio hasta un poco después
 * del impacto se anima en cada fotograma. A 7 Hz la preparación elástica se integraba a saltos de 143 ms
 * y el puño llegaba 33 ms tarde de mediana y 91 en el peor golpe (lo midió la revisión): justo lo que la
 * anticipación elástica existe para que no pase. Un gesto nuevo también fuerza la vuelta del mezclador,
 * para que no empiece hasta 143 ms tarde.
 *
 * ═══ LO QUE SE HACE DESPUÉS DEL MEZCLADOR ═══
 *
 * En este orden: el encorvado del Celador mayor, la postura del paraguas (durmientes con esqueleto) y
 * los muelles del faldón. Los tres escriben encima de la pose del clip, y los tres se BORRAN antes de la
 * siguiente vuelta del mezclador (`PoseGuardada`, ver `postura.ts`): los dedos quietos del clip de
 * reposo no los reescribe el mezclador, y el cierre de los dedos se sumaba fotograma a fotograma.
 *
 * ═══ LA ESFERA DE RECORTE ═══
 *
 * Cada malla con piel lleva la esfera fija de `malla.ts` (1,7 m alrededor de la cintura). Sin ella, three
 * recorta una `SkinnedMesh` con la esfera que calcula él con la primera pose (0,94 m de radio), y un
 * cuerpo tumbado asomaba de ella: con la cámara rozando, se habría dejado de pintar entero.
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CuerpoPintado, Gesto } from '../cuerpos';
import type { Almacen, ClipsDelEsqueleto } from './almacen';
import {
  INFO_DE_GESTOS,
  MezclaDeCapas,
  direccionRelativa,
  fundidoEntre,
  inicioDelGolpe,
  mezclaDeLaMarchaNueva,
  mezclarLaMarcha,
  pesoEnLaMarcha,
  normalizarAngulo,
  ritmoElastico,
  ritmoParaDurar,
} from './gestos';
import type { MarchaGirada } from './gestos';
import type { MallaFundida } from './malla';
import { COLOR_DE_AMENAZA, COLOR_DE_SALIDA, alPintar, materialDeCuerpo, tenir } from './material';
import type { MaterialDeCuerpo } from './material';
import { MuellesDelFaldon } from './muelles';
import { PoseGuardada, huesosDelBrazoDerecho, huesosQueTocaLaPostura, posturaDelParaguas } from './postura';
import type { HuesosDelBrazo } from './postura';
import type { DetalleDelCuerpo } from './presupuesto';
import { lodElegido } from './presupuesto';
import type { LodElegido } from './presupuesto';
import { clipDelGesto } from './reparto';
import type { FiguraDelCuerpo, PuntoDeLaMarcha, Reparto } from './reparto';

/** La marcha de un esqueleto: de frente (por velocidad) y girada (hacia atrás y de lado). */
export interface MarchaDelEsqueleto {
  readonly marcha: readonly PuntoDeLaMarcha[];
  readonly giradas: Readonly<Record<'atras' | 'izquierda' | 'derecha', MarchaGirada | null>>;
}

/** Lo que comparten todos los cuerpos de un montaje. */
export interface ContextoDeLosCuerpos {
  readonly reparto: Reparto;
  readonly almacen: Almacen;
  /** La marcha con la zancada de cada esqueleto (el manifiesto da la de la mujer aparte). */
  readonly marchaDe: (esqueleto: string) => MarchaDelEsqueleto;
}

/** El clip de pasear con el paraguas, si el reparto lo trae (sustituye a `pasear` en quien lo lleva). */
export const PASEAR_CON_PARAGUAS = 'andar-paraguas';

/** Lo alto que es una persona, para el corte de la impresión y de la salida. */
const ALTO_DEL_CORTE = 1.95;
/** Lo que tarda la impresión (§4.8: 1,2 s) y la salida por la cabina. */
const IMPRESION_MS = 1200;
const SALIDA_MS = 900;
/** Hasta cuánto después del impacto se anima un golpe en cada fotograma aunque el cuerpo sea lejano. */
export const GOLPE_A_TODO_RITMO_MS = 150;

/** El corte de un cuerpo: la altura (m) y el modo (0 ninguno, 1 imprimirse: se ve por debajo, 2 salir: por encima). */
export interface CorteDelCuerpo {
  altura: number;
  modo: number;
}

/**
 * EL CORTE DE IMPRIMIRSE Y DE SALIR de un gesto en `ahora` (el reloj del cuerpo): la raya sube de los
 * pies a la cabeza en lo que dura. Lo usan el cuerpo con esqueleto y el rebaño, igual. Escribe en
 * `salida` y la devuelve.
 */
export function corteDelGesto(gesto: Gesto, desde: number, ahora: number, salida: CorteDelCuerpo): CorteDelCuerpo {
  if (gesto === 'imprimirse') {
    salida.altura = ALTO_DEL_CORTE * Math.min(1, Math.max(0, (ahora - desde) / IMPRESION_MS));
    salida.modo = 1;
  } else if (gesto === 'salir') {
    salida.altura = ALTO_DEL_CORTE * Math.min(1, Math.max(0, (ahora - desde) / SALIDA_MS));
    salida.modo = 2;
  } else {
    salida.altura = 0;
    salida.modo = 0;
  }
  return salida;
}
/** Lo tenue: la parte de píxeles que se descarta. */
export const TENUE = 0.55;
/** A qué ritmo gira el cuerpo hacia su rumbo (rad/s): deprisa, pero sin chasquidos. */
const GIRO_DEL_CUERPO = 14;

/** El relleno del contorno por distancia: nada de cerca, casi toda la figura a 60 m (ver `material.ts`). */
export function llenoDelContorno(distancia: number): number {
  const t = Math.min(1, Math.max(0, (distancia - 15) / 45));
  return t * t * (3 - 2 * t) * 0.6;
}

/** El color del contorno de un cuerpo, en sRGB, y si es de amenaza. */
export function contornoDe(c: Pick<CuerpoPintado, 'clase' | 'color'>): { color: string; amenaza: boolean } {
  return { color: colorDelContorno(c), amenaza: esAmenaza(c.clase) };
}

/** ¿Lleva el contorno de amenaza? Todo lo que no es un desvelado. */
export function esAmenaza(clase: CuerpoPintado['clase']): boolean {
  return clase !== 'desvelado';
}

/** El color del contorno en sRGB (sin asignar: se pide en cada fotograma). */
export function colorDelContorno(c: Pick<CuerpoPintado, 'clase' | 'color'>): string {
  return c.clase === 'desvelado' ? (c.color ?? '#ffffff') : COLOR_DE_AMENAZA;
}

interface CapaDeGesto {
  readonly accion: THREE.AnimationAction;
  readonly gesto: Gesto;
  /** El impacto del clip (ms desde su principio), si es un golpe con preparación elástica. */
  readonly impactoClipMs: number | null;
  /** El ritmo del clip fuera de la preparación elástica. */
  readonly ritmo: number;
  /** Entró en este fotograma: el mezclador no la avanza todavía. */
  recien: boolean;
}

export class CuerpoConEsqueleto {
  /** El nodo que se coloca en el mundo (sitio y rumbo). */
  readonly raiz = new THREE.Group();
  private readonly silueta = new THREE.Group();
  private readonly huesos: THREE.Object3D;
  private readonly porNombre = new Map<string, THREE.Object3D>();
  private readonly lods = new Map<string, THREE.SkinnedMesh>();
  private lodVisible = '';
  private readonly mat: MaterialDeCuerpo;
  private readonly mixer: THREE.AnimationMixer;
  private readonly mezcla = new MezclaDeCapas();
  private readonly capas = new Map<string, CapaDeGesto>();
  private readonly deLaMarcha = new Map<string, THREE.AnimationAction>();
  /** Las mismas, en dos listas: recorrer un `Map` en cada fotograma asigna. */
  private readonly marchaClips: string[] = [];
  private readonly marchaAcciones: THREE.AnimationAction[] = [];
  private readonly mezclaDeLaMarcha = mezclaDeLaMarchaNueva();
  private fase = 0;
  /** El gesto que se está pintando y cuándo empezó (para ver si llega otro). */
  private gestoVisto: Gesto | null = null;
  private desdeVisto = Number.NaN;
  private gestoAnterior: Gesto | null = null;
  /** El LOD del último tope pedido, y si su malla ya es la exacta (si no, se vuelve a mirar). */
  private topeVisto = -1;
  private lodPedido: LodElegido = { indice: 0, simplificado: null };
  private lodExacto = false;
  private readonly pose = new PoseGuardada();
  private readonly corte: CorteDelCuerpo = { altura: 0, modo: 0 };
  private bandaVista = 0;
  /** Los clips de la marcha que tienen zancada (los que van en la fase común). */
  private readonly conZancada: ReadonlySet<string>;
  private readonly colorDelContorno = new THREE.Color();
  private ultimoContorno = '';
  private px = Number.NaN;
  private pz = Number.NaN;
  private vx = 0;
  private vz = 0;
  private ax = 0;
  private az = 0;
  private rumboPintado = Number.NaN;
  private giro = 0;
  private acumulado = 0;
  private readonly muelles: MuellesDelFaldon;
  private readonly brazo: HuesosDelBrazo | null;
  private readonly columna: THREE.Object3D | null;
  private readonly pecho: THREE.Object3D | null;
  private readonly clips: ClipsDelEsqueleto;
  private readonly qTmp = new THREE.Quaternion();
  private readonly eje = new THREE.Vector3(1, 0, 0);
  /** Lo que se desvanece al irse (0 nada; sube hasta 1 y se suelta). */
  yendose = 0;

  constructor(
    private readonly ctx: ContextoDeLosCuerpos,
    readonly figura: FiguraDelCuerpo,
    plantilla: THREE.Object3D,
    clips: ClipsDelEsqueleto,
    primera: MallaFundida,
    escalaDeZancada = 1,
  ) {
    this.clips = clips;
    this.huesos = SkeletonUtils.clone(plantilla);
    this.huesos.traverse((o) => {
      if (o.name !== '') this.porNombre.set(o.name, o);
    });
    const [ex, ey, ez] = figura.silueta.escala;
    this.silueta.scale.set(ex, ey, ez);
    this.silueta.add(this.huesos);
    this.raiz.add(this.silueta);
    this.raiz.name = `cuerpo-${figura.figura}`;
    this.mat = materialDeCuerpo(primera);
    tenir(this.mat.u, primera, figura.tinte.colores, figura.tinte.rugosidad);
    this.mixer = new THREE.AnimationMixer(this.huesos);
    const esqueleto = ctx.reparto.esqueletos[figura.esqueleto];
    this.muelles = new MuellesDelFaldon(this.huesos, esqueleto?.raiz ?? 'raiz', esqueleto?.caderas ?? 'caderas');
    this.brazo = figura.piezas.some((p) => p === 'paraguas' || p === ctx.reparto.durmientes.paraguas)
      ? huesosDelBrazoDerecho(this.huesos, esqueleto?.agarre.derecha ?? 'agarre_R')
      : null;
    this.columna = this.porNombre.get('columna1') ?? null;
    this.pecho = this.porNombre.get('pecho') ?? null;
    /* Lo que se retoca encima del mezclador, vigilado (ver «Lo que se hace después del mezclador»). */
    if (figura.silueta.encorvado > 0) this.pose.vigilar([this.columna, this.pecho]);
    if (this.brazo !== null) this.pose.vigilar(huesosQueTocaLaPostura(this.brazo));
    this.pose.vigilar(this.muelles.huesos);
    const base = ctx.marchaDe(figura.esqueleto);
    /*
     * Quien lleva paraguas (los durmientes cercanos con esqueleto) pasea con el clip del paraguas si el
     * reparto lo trae: el brazo ya va recogido en él y la postura de `postura.ts` sólo hace falta parado.
     */
    const conParaguas = this.brazo !== null && ctx.reparto.clips[PASEAR_CON_PARAGUAS] !== undefined;
    this.paseaConParaguas = conParaguas;
    const marcha = conParaguas ? base.marcha.map((p) => (p.clip === 'pasear' ? { ...p, clip: PASEAR_CON_PARAGUAS } : p)) : base.marcha;
    const conZancada = new Set<string>();
    for (const p of marcha) if (p.zancada > 0) conZancada.add(p.clip);
    for (const g of Object.values(base.giradas)) if (g !== null) conZancada.add(g.clip);
    this.conZancada = conZancada;
    /* La zancada de ESTE cuerpo: la de su esqueleto por la escala de su figura (ver `escalaDeZancada`). */
    this.marcha = marcha.map((p) => ({ ...p, zancada: p.zancada * escalaDeZancada, velocidad: p.velocidad * escalaDeZancada }));
    const g = base.giradas;
    const escalar = (x: MarchaGirada | null): MarchaGirada | null => (x === null ? null : { ...x, zancada: x.zancada * escalaDeZancada, velocidad: x.velocidad * escalaDeZancada });
    this.giradas = { atras: escalar(g.atras), izquierda: escalar(g.izquierda), derecha: escalar(g.derecha) };
  }

  /** La marcha y la marcha girada con la zancada de este cuerpo. */
  private readonly paseaConParaguas: boolean;
  private readonly marcha: readonly PuntoDeLaMarcha[];
  private readonly giradas: Readonly<Record<'atras' | 'izquierda' | 'derecha', MarchaGirada | null>>;

  /**
   * Cuelga (si no estaba) la malla del LOD de `tope` y la deja como la visible. Sólo mira el almacén
   * cuando cambia el tope o mientras la malla exacta no ha llegado: en cada fotograma no asigna nada.
   */
  private verLod(tope: number): void {
    if (tope === this.topeVisto && this.lodExacto) return;
    if (tope !== this.topeVisto) {
      this.topeVisto = tope;
      this.lodPedido = lodElegido(this.ctx.reparto, this.figura.figura, tope, this.figura.mallas);
    }
    const lod = this.lodPedido;
    const f = this.ctx.almacen.fundida(this.figura, lod);
    if (f === null) return;
    this.lodExacto = f.exacta;
    if (!f.exacta) void this.ctx.almacen.prepararLod(this.figura, lod);
    if (f.clave === this.lodVisible) return;
    let m = this.lods.get(f.clave);
    if (m === undefined) {
      const huesos = f.malla.huesos.map((n) => {
        const b = this.porNombre.get(n);
        if (b === undefined) throw new Error(`La malla pide el hueso ${n} y la plantilla no lo tiene`);
        return b as THREE.Bone;
      });
      const esqueleto = new THREE.Skeleton(huesos, f.malla.inversas as THREE.Matrix4[]);
      m = new THREE.SkinnedMesh(f.malla.geometria, this.mat.material);
      m.name = `${this.figura.figura}-${f.clave.slice(f.clave.lastIndexOf('@') + 1)}`;
      m.bind(esqueleto, new THREE.Matrix4());
      /* La esfera fija de la malla, y no la que three calcularía con la primera pose (ver la cabecera). */
      m.boundingSphere = (f.malla.geometria.boundingSphere ?? new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.7)).clone();
      const u = this.mat.u;
      m.onBeforeRender = (renderer): void => alPintar(u, renderer);
      this.huesos.add(m);
      this.lods.set(f.clave, m);
    }
    for (const [k, otra] of this.lods) otra.visible = k === f.clave;
    this.lodVisible = f.clave;
  }

  /** ¿Pinta ya la malla EXACTA de su tope? (un cuerpo que se desvanece sólo se deja si sí: ver el director). */
  get conSuLod(): boolean {
    return this.lodExacto;
  }

  /** Cuántos triángulos pinta ahora (para el banco). */
  get triangulos(): number {
    const m = this.lods.get(this.lodVisible);
    return m === undefined || !m.visible ? 0 : (m.geometry.getIndex()?.count ?? 0) / 3;
  }

  /** El LOD que se ve: su índice y, si va simplificado, `~triángulos` (para el banco). */
  get lod(): string {
    return this.lodVisible.slice(this.lodVisible.lastIndexOf('@') + 1);
  }

  /** Para el banco: el clip de la capa activa, en qué segundo va y cuánto pesa (o `null` en la marcha). */
  gestoEnCurso(): { clip: string; tiempo: number; peso: number; ritmo: number; impactoClipMs: number | null } | null {
    const activa = this.mezcla.activa();
    if (activa === null || activa === 'marcha') return null;
    const capa = this.capas.get(activa);
    if (capa === undefined) return null;
    return { clip: capa.accion.getClip().name, tiempo: capa.accion.time, peso: this.mezcla.peso(activa), ritmo: capa.accion.timeScale, impactoClipMs: capa.impactoClipMs };
  }

  /** Para el banco: la suma de los pesos de todas las capas (tiene que ser 1). */
  sumaDePesos(): number {
    return this.mezcla.suma();
  }

  /* ─────────────────────────────── Los gestos ─────────────────────────────── */

  private accionDeMarcha(clip: string): THREE.AnimationAction | null {
    let a = this.deLaMarcha.get(clip);
    if (a !== undefined) return a;
    const c = this.clips.clip(clip, false);
    if (c === null) return null;
    a = this.mixer.clipAction(c);
    a.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
    a.enabled = true;
    a.setEffectiveWeight(0);
    this.deLaMarcha.set(clip, a);
    this.marchaClips.push(clip);
    this.marchaAcciones.push(a);
    return a;
  }

  /** Entra un gesto nuevo (o el mismo, vuelto a empezar). */
  private entrar(c: CuerpoPintado, ahora: number): void {
    const info = INFO_DE_GESTOS[c.gesto];
    const fundido = fundidoEntre(this.gestoAnterior, c.gesto);
    this.gestoAnterior = c.gesto;
    if (info.tipo === 'marcha') {
      this.mezcla.entrar('marcha', fundido);
      return;
    }
    const direccion = info.direccion === 'clip' && c.direccionDelGesto !== null ? direccionRelativa(c.rumbo, c.direccionDelGesto) : null;
    const elegido = clipDelGesto(this.ctx.reparto, c.gesto, direccion);
    const base = this.clips.clip(elegido.clip, elegido.espejo);
    if (base === null) {
      this.mezcla.entrar('marcha', fundido);
      return;
    }
    /*
     * Si el mismo clip todavía pesa (otro golpe igual en la Tanda, dos `tocado` seguidos), la acción
     * nueva es la de su gemelo: se usa la de las dos que menos pese, que es la que ya casi ha salido.
     */
    const gemelo = this.clips.gemelo(base);
    const pesoBase = this.mezcla.peso(base.uuid) + (this.mezcla.activa() === base.uuid ? 1 : 0);
    const pesoGemelo = this.mezcla.peso(gemelo.uuid) + (this.mezcla.activa() === gemelo.uuid ? 1 : 0);
    const clip = pesoBase > pesoGemelo ? gemelo : base;
    const capa = clip.uuid;
    const accion = this.mixer.clipAction(clip);
    const datos = this.ctx.reparto.clips[elegido.clip];
    const bucle = info.tipo === 'bucle' || info.tipo === 'carrera' || (datos?.bucle === true && info.tipo !== 'sostenido' && info.tipo !== 'una-vez' && info.tipo !== 'golpe');
    accion.reset();
    accion.setLoop(bucle ? THREE.LoopRepeat : THREE.LoopOnce, bucle ? Number.POSITIVE_INFINITY : 1);
    accion.clampWhenFinished = true;
    const impactoClipMs = info.tipo === 'golpe' && c.impactoMs !== null && datos?.impactoMs !== undefined ? datos.impactoMs : null;
    const ritmo = ritmoParaDurar(clip.duration * 1000, info);
    const pasado = Math.max(0, ahora - c.gestoDesdeMs);
    let t = impactoClipMs !== null && c.impactoMs !== null ? inicioDelGolpe(c.gestoDesdeMs, ahora, c.impactoMs, impactoClipMs) : (pasado / 1000) * ritmo;
    if (!bucle) t = Math.min(clip.duration, t);
    accion.time = t;
    accion.timeScale = ritmo;
    accion.setEffectiveWeight(0);
    accion.play();
    this.capas.set(capa, { accion, gesto: c.gesto, impactoClipMs, ritmo, recien: true });
    this.mezcla.entrar(capa, fundido);
  }

  /** La marcha de este fotograma: pesos por velocidad y dirección, y la fase común. */
  private moverLaMarcha(c: CuerpoPintado, dtS: number, pesoDeLaMarcha: number): void {
    /* La dirección del paso respecto de la cara, de lo que se ha movido (el contrato no la trae). */
    const rapidez = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
    let rel = 0;
    if (rapidez > 0.25) rel = normalizarAngulo(Math.atan2(this.vx, -this.vz) - this.rumboPintado);
    const m = mezclarLaMarcha(c.velocidad, rel, this.marcha, this.giradas, this.mezclaDeLaMarcha);
    this.fase = (this.fase + dtS * m.ciclosPorSegundo) % 1;
    /*
     * Los pasos que no pesan, parados: el mezclador de three avanza el tiempo de toda acción que corre,
     * pese o no. Al volver a pesar entran en la fase común (abajo).
     */
    for (let k = 0; k < this.marchaAcciones.length; k++) {
      const a = this.marchaAcciones[k] as THREE.AnimationAction;
      if (pesoEnLaMarcha(m, this.marchaClips[k] as string) > 0) continue;
      a.setEffectiveWeight(0);
      if (a.isRunning()) a.stop();
    }
    for (let i = 0; i < m.cuantos; i++) {
      const clip = m.clips[i] as string;
      const peso = m.pesos[i] as number;
      const a = this.accionDeMarcha(clip);
      if (a === null) continue;
      const w = peso * pesoDeLaMarcha;
      const dur = a.getClip().duration;
      const conZancada = this.conZancada.has(clip);
      /*
       * La fase común cuenta desde el apoyo del pie izquierdo: cada clip va a su tiempo de apoyo más la
       * fase (ver `apoyo` en `almacen.ts`), así los tres pisan a la vez aunque no se hornearan igual.
       */
      const debido = (((this.fase + (conZancada ? this.clips.apoyo(clip) : 0)) % 1) + 1) % 1 * dur;
      if (!a.isRunning()) {
        a.reset();
        a.play();
        /* Entra en la fase común: el pie que toca, no el principio del clip. */
        if (conZancada) a.time = debido;
      }
      a.setEffectiveWeight(w);
      if (conZancada) {
        a.timeScale = m.ciclosPorSegundo * dur;
        /* La guarda de la fase: si la cuenta del mezclador se ha ido, se recoloca. */
        const desvio = Math.abs(((a.time - debido + dur * 1.5) % dur) - dur * 0.5);
        if (desvio > 0.03) a.time = debido;
      } else {
        a.timeScale = 1;
      }
    }
  }

  /* ─────────────────────────────── El fotograma ─────────────────────────────── */

  /**
   * PINTA ESTE CUERPO en este fotograma. `ahora` y `dtMs` en su reloj de presentación; `distancia` a la
   * cámara; `detalle` lo que dijo `repartirElDetalle`; `conParaguas` el peso de la postura (0 o 1).
   */
  actualizar(c: CuerpoPintado, ahora: number, dtMs: number, detalle: DetalleDelCuerpo, distancia: number, conParaguas: number): void {
    const dtS = Math.max(0, Math.min(0.25, dtMs / 1000));
    /* ── El sitio y el movimiento (para la dirección del paso y los muelles) ── */
    if (Number.isNaN(this.px)) {
      this.px = c.x;
      this.pz = c.z;
      this.rumboPintado = c.rumbo;
    }
    if (dtS > 0) {
      const ivx = (c.x - this.px) / dtS;
      const ivz = (c.z - this.pz) / dtS;
      const k = Math.min(1, dtS * 12);
      const nvx = this.vx + (ivx - this.vx) * k;
      const nvz = this.vz + (ivz - this.vz) * k;
      this.ax += ((nvx - this.vx) / dtS - this.ax) * Math.min(1, dtS * 8);
      this.az += ((nvz - this.vz) / dtS - this.az) * Math.min(1, dtS * 8);
      this.vx = nvx;
      this.vz = nvz;
    }
    this.px = c.x;
    this.pz = c.z;
    const info = INFO_DE_GESTOS[c.gesto];
    const objetivo = info.direccion === 'cuerpo' && c.direccionDelGesto !== null ? c.direccionDelGesto : c.rumbo;
    const antes = this.rumboPintado;
    const falta = normalizarAngulo(objetivo - this.rumboPintado);
    const paso = GIRO_DEL_CUERPO * dtS;
    this.rumboPintado = normalizarAngulo(this.rumboPintado + Math.max(-paso, Math.min(paso, falta)));
    this.giro = dtS > 0 ? normalizarAngulo(this.rumboPintado - antes) / dtS : 0;
    this.raiz.position.set(c.x, 0, c.z);
    /* El rumbo de `cuerpos.ts` (0 al norte, −z, creciendo al este) sobre una figura que mira a +Z. */
    this.raiz.rotation.set(0, Math.PI - this.rumboPintado, 0);

    /* ── El LOD ── */
    this.verLod(detalle.tope);

    /* ── El mezclador, a su ritmo (y a todo ritmo si llega un gesto o hay un golpe en curso) ── */
    const nuevo = c.gesto !== this.gestoVisto || c.gestoDesdeMs !== this.desdeVisto;
    const golpe = info.tipo === 'golpe' && c.impactoMs !== null && ahora < c.impactoMs + GOLPE_A_TODO_RITMO_MS;
    this.acumulado += dtMs;
    const periodo = detalle.hz > 0 ? 1000 / detalle.hz : 0;
    if (nuevo || golpe || this.acumulado >= periodo) {
      const dt = this.acumulado;
      this.acumulado = 0;
      /* Lo de encima del fotograma anterior, fuera: el mezclador parte de su pose. */
      this.pose.restaurar();
      if (nuevo) {
        this.gestoVisto = c.gesto;
        this.desdeVisto = c.gestoDesdeMs;
        this.entrar(c, ahora);
      }
      for (const fuera of this.mezcla.avanzar(dt)) {
        if (fuera === 'marcha') {
          for (const a of this.marchaAcciones) {
            a.stop();
            a.setEffectiveWeight(0);
          }
        } else {
          this.capas.get(fuera)?.accion.stop();
          this.capas.delete(fuera);
        }
      }
      for (const nombre of this.mezcla.nombres()) {
        if (nombre === 'marcha') continue;
        const capa = this.capas.get(nombre);
        if (capa === undefined) continue;
        capa.accion.setEffectiveWeight(this.mezcla.peso(nombre));
        if (capa.recien) {
          /*
           * Recién entrada: su tiempo ya es el de `ahora` (ver `entrar`). Si el mezclador la avanzara
           * este tramo, empezaría un fotograma por delante.
           */
          capa.recien = false;
          capa.accion.timeScale = 0;
        } else if (capa.impactoClipMs !== null && c.impactoMs !== null && this.mezcla.activa() === nombre) {
          /* La anticipación elástica: el `timeScale` que hace llegar el golpe a su hora. */
          capa.accion.timeScale = ritmoElastico(capa.accion.time, ahora - dt, ahora, c.impactoMs, capa.impactoClipMs, INFO_DE_GESTOS[capa.gesto].ritmo);
        } else if (capa.gesto === 'avance') {
          const correr = this.marcha[this.marcha.length - 1];
          const ciclos = correr !== undefined && correr.zancada > 0 ? Math.min(2.4, Math.max(0.8, c.velocidad / correr.zancada)) : 1.6;
          capa.accion.timeScale = ciclos * capa.accion.getClip().duration;
        } else {
          capa.accion.timeScale = capa.ritmo;
        }
      }
      const pesoDeLaMarcha = this.mezcla.peso('marcha');
      if (pesoDeLaMarcha > 0 || this.mezcla.activa() === 'marcha') this.moverLaMarcha(c, dt / 1000, pesoDeLaMarcha);
      this.mixer.update(dt / 1000);
      this.pose.guardar();

      /* ── Encima del clip ── */
      if (this.figura.silueta.encorvado > 0) {
        this.qTmp.setFromAxisAngle(this.eje, this.figura.silueta.encorvado * 0.5);
        this.columna?.quaternion.multiply(this.qTmp);
        this.pecho?.quaternion.multiply(this.qTmp);
      }
      if (this.brazo !== null && conParaguas > 0) {
        /* Con el clip de pasear con paraguas, la postura sólo pesa lo que pese estar parado. */
        const reposo = this.marcha[0]?.clip ?? '';
        const parado = this.paseaConParaguas ? pesoEnLaMarcha(this.mezclaDeLaMarcha, reposo) * this.mezcla.peso('marcha') + (1 - this.mezcla.peso('marcha')) : 1;
        posturaDelParaguas(this.silueta, this.brazo, conParaguas * parado);
      }
      if (detalle.muelles && this.muelles.tiene) {
        /* La aceleración y el giro, del mundo al espacio del cuerpo. */
        const g = Math.PI - this.rumboPintado;
        const cs = Math.cos(g);
        const sn = Math.sin(g);
        const axL = this.ax * cs - this.az * sn;
        const azL = this.ax * sn + this.az * cs;
        const vF = this.vx * sn + this.vz * cs;
        this.muelles.paso(dt / 1000, axL, azL, this.giro, vF);
        this.muelles.aplicar(1);
      } else {
        this.muelles.reiniciar();
      }
    }

    /* ── El material: contorno, relleno, lo tenue y el corte ── */
    const u = this.mat.u;
    const colorTexto = colorDelContorno(c);
    if (colorTexto !== this.ultimoContorno) {
      this.ultimoContorno = colorTexto;
      this.colorDelContorno.set(colorTexto);
    }
    const color = this.colorDelContorno;
    u.uContornoQ.value.set(color.r, color.g, color.b, c.contorno ? 1 : 0);
    u.uModoQ.value = esAmenaza(c.clase) ? 1 : 0;
    u.uLlenoQ.value = llenoDelContorno(distancia);
    u.uTenueQ.value = Math.max(c.tenue ? TENUE : 0, this.yendose);
    u.uRelojQ.value = ahora / 1000;
    const corte = corteDelGesto(c.gesto, c.gestoDesdeMs, ahora, this.corte);
    u.uCorteQ.value.set(corte.altura, corte.modo);
    if (corte.modo !== 0 && corte.modo !== this.bandaVista) {
      this.bandaVista = corte.modo;
      u.uBandaQ.value.set(corte.modo === 1 ? COLOR_DE_AMENAZA : COLOR_DE_SALIDA);
    }
  }

  /** Suelta el mezclador, el material y los esqueletos (las geometrías son del almacén). */
  liberar(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.huesos);
    for (const m of this.lods.values()) m.skeleton.dispose();
    this.mat.material.dispose();
    this.raiz.removeFromParent();
  }
}
