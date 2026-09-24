/**
 * EL DIRECTOR DE LOS PERSONAJES: lo que pasa en cada fotograma entre la `FuenteDeCuerpos` del juego y
 * lo que se pinta. Sin React: el componente (`CuerposDelQuiebro.tsx`) lo crea al montar, le llama en su
 * `useFrame` y lo suelta al desmontar; el banco hace lo mismo con una fuente de mentira.
 *
 * ═══ EL FOTOGRAMA, EN ORDEN ═══
 *
 *   0. El horno avanza unos milisegundos (`PRESUPUESTO_DEL_HORNO_MS`) con las texturas de huesos que el
 *      nivel pidió al montar (`preparar`): nunca se hornea de golpe dentro de un fotograma de pelea.
 *   1. Se leen los cuerpos del juego y se reparte el detalle (`repartirElDetalle`): el propio con
 *      esqueleto siempre; los demás por distancia hasta agotar los esqueletos del nivel; el resto, a un
 *      rebaño de textura de huesos.
 *   2. Cada cuerpo con esqueleto se crea (o se rehace si cambió de figura) y se actualiza con SU reloj:
 *      el verdadero el propio, el del Remanso los demás. Si su malla aún no ha llegado, ese fotograma va
 *      en su rebaño (si ya existe) en vez de no pintarse: la primera versión dejaba un fotograma en
 *      blanco al pasar de rebaño a esqueleto.
 *   3. Los cuerpos que ya no vienen se desvanecen en un cuarto de segundo (con el mismo tramado de lo
 *      tenue) SI CABEN: un hueco de esqueleto libre y su LOD de lejos ya cargado (`cabeUnoQueSeVa` en
 *      `presupuesto.ts`). Si no, se van de golpe, como se fueron del juego.
 *   4. La multitud: los 48 del guion (`multitud.ts`), menos los Prestados y menos los que en N2+ llevan
 *      esqueleto por ser los más cercanos. Sin barrio (se acabó la noche) no hay multitud, y los
 *      durmientes con esqueleto se sueltan: la primera versión los dejaba congelados en la acera.
 *
 * ═══ LA MULTITUD EN DOS LLAMADAS ═══
 *
 * El reparto trae cuatro ropas por cuerpo, cada una su malla: ocho geometrías, y un rebaño instanciado
 * por geometría serían ocho llamadas (más los paraguas). Así que la multitud pinta a todos con UN
 * MANIQUÍ por cuerpo —la ropa más ligera del LOD de la multitud— teñido por cabeza con los colores de
 * SU ropa (la tabla sale de los materiales de cada ropa del propio reparto), y con el paraguas de código
 * fundido en la misma malla, plegado en quien no lo lleva: dos llamadas, una por cuerpo, con paraguas y
 * todo. De cerca no hay maniquí: los durmientes más cercanos en N2+ y todos los Prestados con esqueleto
 * llevan su ropa de verdad y el paraguas de la forja. Lo mismo para los cuerpos lejanos sin esqueleto
 * de N0 y N1: un maniquí por figura, teñido, con TODOS los gestos horneados (`lejanos.ts`).
 *
 * ═══ SIN ASIGNAR POR FOTOGRAMA ═══
 *
 * La primera versión pedía unos 430 KiB por fotograma en N0 y 570 en N2 (25-34 MB/s a 60 fps, lo midió
 * la revisión): la figura de cada cuerpo y de cada durmiente se recalculaba en cada fotograma (con su
 * clave de malla), el maniquí de cada rebaño se buscaba construyendo su clave antes de mirar la caché,
 * el LOD de cada cuerpo se elegía otra vez, y había copias de listas y cierres por todas partes. Ahora
 * lo que depende de un cuerpo se recuerda por id mientras no cambie, lo que depende de un durmiente
 * mientras no cambie el barrio, y lo que depende de una figura y un tope, en mapas anidados que no
 * construyen claves. El comprobador mide los bytes por fotograma con el perfil de V8.
 *
 * ═══ LO QUE AÚN NO HA LLEGADO ═══
 *
 * Todo se carga a demanda y una vez (`almacen.ts`); lo de cada cuerpo se pide en cuanto aparece, aunque
 * sea lejos, para que al acercarse ya esté. Mientras el `.glb` de un LOD no está, el cuerpo usa el LOD
 * cargado más cercano; si no hay ninguno todavía, ese fotograma no se pinta (lo normal es un segundo al
 * empezar la Bajada, que es justo lo que la Bajada tapa: §2.1).
 */
import * as THREE from 'three';
import type { Barrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import { DURMIENTES, guionDeLosDurmientes } from '../../../../shared/arcade/juegos/quiebro-durmientes';
import type { CuerpoPintado, FuenteDeCuerpos } from '../cuerpos';
import { Almacen } from './almacen';
import type { Lector, PedidoDeHorneado } from './almacen';
import { CuerpoConEsqueleto, PASEAR_CON_PARAGUAS, TENUE, colorDelContorno, corteDelGesto, esAmenaza, llenoDelContorno } from './cuerpo';
import type { ContextoDeLosCuerpos, CorteDelCuerpo, MarchaDelEsqueleto } from './cuerpo';
import { INFO_DE_GESTOS } from './gestos';
import type { MarchaGirada } from './gestos';
import { filasDeLaMezcla, filasEn } from './huesos-en-textura';
import type { FilasDeAnimacion, HuesosEnTextura } from './huesos-en-textura';
import { AnimacionDeLosLejanos, clipsDeLosLejanos, poseDelLejanoNueva } from './lejanos';
import type { MarchaDelLejano, PoseDelLejano } from './lejanos';
import { crearLaMultitud, durmientesMasCercanos, moverLaMultitud, ticPintado } from './multitud';
import type { Multitud, Obstaculo } from './multitud';
import { huesosDelBrazoDerecho, posturaDelParaguas } from './postura';
import { CUERPOS_COMO_MUCHO, HISTERESIS_M, POLITICA, cabeUnoQueSeVa, detalleDe, lodElegido, lodParaTope, repartirElDetalle } from './presupuesto';
import type { LodElegido } from './presupuesto';
import type { CuerpoAMedir, DetalleDelCuerpo, Nivel } from './presupuesto';
import { Rebano, TABLA_DE_CELADORES, TABLA_DE_DESVELADOS, TABLA_DE_DURMIENTES, cabezaNueva } from './rebano';
import type { TablaDelRebano } from './rebano';
import {
  clipsDeLaMarchaGirada,
  coloresDelTraje,
  conOtrasPiezas,
  detalleDelDurmiente,
  figuraDelCuerpo,
  figuraDelDurmiente,
  marchaDelReparto,
  pasoDelClip,
  varianteMasLigera,
} from './reparto';
import type { AspectoLeido, FiguraDelCuerpo, Reparto } from './reparto';
import { Sombras } from './sombras';

/** Lo que tarda en desvanecerse un cuerpo que ya no viene. */
export const DESVANECER_MS = 250;
/** Lo que el horno puede gastar en cada fotograma (ms): ver «A trozos» en `huesos-en-textura.ts`. */
export const PRESUPUESTO_DEL_HORNO_MS = 2.5;
/** Más allá de esto la niebla ya ha borrado a cualquiera (aguacero: el 97 % a 150 m). */
const LEJOS_DEL_TODO_M = 150;
/** Hasta dónde se pone mancha de contacto a los durmientes de la multitud. */
const SOMBRA_DE_LA_MULTITUD_M = 35;
/** Los ids de los durmientes con esqueleto, para no chocar con los de la Liza (1-6 y 16+). */
export const PRIMER_ID_DE_DURMIENTE = 100000;
/** El paraguas de la multitud: el de código, ligero (ver «La multitud en dos llamadas»). */
const PARAGUAS_LIGERO = 'paraguas-ligero';

/** Lo que el banco quiere saber de un fotograma. */
export interface MedidaDeLosPersonajes {
  llamadas: number;
  triangulos: number;
  conEsqueleto: number;
  enRebano: number;
  multitud: number;
  paraguas: number;
  yendose: number;
  horneados: readonly { clave: string; ms: number; filas: number }[];
  porHornear: number;
  errores: readonly string[];
}

type TipoDeRebano = 'multitud' | 'lejanos';

interface RebanoHecho {
  readonly rebano: Rebano;
  readonly textura: HuesosEnTextura;
  /** El clip de pasear sin paraguas y con él, y el de estar parado con él, tal como quedan en la textura. */
  readonly pasear: string;
  readonly pasearConParaguas: string;
  readonly reposoConParaguas: string;
  readonly reposo: string;
}

/** Un rebaño que el nivel va a querer: se crea en cuanto se pueda (y su textura se hornea a trozos). */
interface RebanoDeseado {
  readonly figura: FiguraDelCuerpo;
  readonly tope: number;
  readonly tipo: TipoDeRebano;
  readonly clase: CuerpoPintado['clase'];
}

/** Lo que se recuerda de la figura de un cuerpo mientras no cambie lo que la decide. */
interface FiguraRecordada {
  clase: CuerpoPintado['clase'];
  variante: number;
  color: string | null;
  barrio: Barrio | null;
  figura: FiguraDelCuerpo;
}

/**
 * La longitud de un vector, sin `Math.hypot`: en V8 `Math.hypot` reserva una lista de dobles en CADA
 * llamada (no la reduce el optimizador), y con 48 durmientes por veinte cuerpos eran unos 80 KiB por
 * fotograma sólo en apartarse (medido con el perfil de V8).
 */
export function distancia3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/** Lo que pasó al llevar un cuerpo a su rebaño. */
type AlRebano = 'pintado' | 'fuera' | 'sin-rebano';

export class DirectorDeLosPersonajes {
  readonly grupo = new THREE.Group();
  readonly almacen: Almacen;
  private readonly ctx: ContextoDeLosCuerpos;
  private readonly marchas = new Map<string, MarchaDelEsqueleto>();
  private readonly cuerpos = new Map<number, CuerpoConEsqueleto>();
  /** La última foto de cada cuerpo con esqueleto (copia propia: el juego reutiliza sus objetos). */
  private readonly fotos = new Map<number, CuerpoPintado>();
  /** Cuándo empezó a irse cada cuerpo que ya no viene. */
  private readonly idas = new Map<number, number>();
  /* El detalle de este fotograma y el del anterior: se intercambian (copiar uno en otro asigna). */
  private detalle = new Map<number, DetalleDelCuerpo>();
  private detalleAnterior = new Map<number, DetalleDelCuerpo>();
  private readonly relojes = new Map<number, number>();
  private readonly rebanos = new Map<string, RebanoHecho>();
  /** Los mismos rebaños en una lista: recorrer un `Map` en cada fotograma asigna su iterador. */
  private readonly listaDeRebanos: RebanoHecho[] = [];
  /** Los rebaños por tipo y clase, figura y tope: sin construir claves en cada fotograma. */
  private readonly rebanosRapidos = new Map<string, Map<string, Map<number, RebanoHecho>>>();
  private readonly deseados: RebanoDeseado[] = [];
  private readonly lejanos: AnimacionDeLosLejanos;
  private readonly multitud: Multitud = crearLaMultitud();
  private readonly sombras = new Sombras(CUERPOS_COMO_MUCHO + DURMIENTES);
  private readonly frustum = new THREE.Frustum();
  private readonly pv = new THREE.Matrix4();
  private readonly esfera = new THREE.Sphere(new THREE.Vector3(), 1.2);
  private readonly cabeza = cabezaNueva();
  private readonly filas: FilasDeAnimacion = { a: 0, b: 0, mezcla: 0 };
  private readonly poseLejana: PoseDelLejano = poseDelLejanoNueva();
  private readonly corte: CorteDelCuerpo = { altura: 0, modo: 0 };
  private readonly medir: CuerpoAMedir[] = [];
  private readonly medirReserva: { id: number; distancia: number }[] = [];
  private readonly obstaculos: Obstaculo[] = [];
  private readonly obstaculosReserva: { x: number; z: number }[] = [];
  private readonly cercanos: number[] = [];
  private readonly esCercano = new Uint8Array(DURMIENTES);
  /** Los ids pintados en este fotograma, con el número del fotograma (vaciar un `Set` asigna su tabla). */
  private readonly vivos = new Map<number, number>();
  private vuelta = 0;
  /** Qué durmientes llevan esqueleto (N2+), y cuántos. */
  private readonly durmientesConEsqueleto = new Uint8Array(DURMIENTES);
  private cuantosDurmientes = 0;
  /* Lo que suman `medirElFotograma` y las podas sin cierres nuevos ni iteradores. */
  private cuentaLlamadas = 0;
  private cuentaTriangulos = 0;
  private readonly contarCuerpo = (c: CuerpoConEsqueleto): void => {
    if (!c.raiz.visible || c.triangulos === 0) return;
    this.cuentaLlamadas++;
    this.cuentaTriangulos += c.triangulos;
  };
  private readonly podarReloj = (_v: number, id: number): void => {
    if (!this.esVivo(id) && !this.cuerpos.has(id)) this.relojes.delete(id);
  };
  private readonly podarFigura = (_v: FiguraRecordada, id: number): void => {
    if (!this.esVivo(id) && !this.cuerpos.has(id)) this.figurasRecordadas.delete(id);
  };
  private readonly zancadas = new Float64Array(DURMIENTES);
  private readonly zancadaDe = (i: number): number => this.zancadas[i] as number;
  private readonly figurasRecordadas = new Map<number, FiguraRecordada>();
  private readonly maniquis = new Map<string, Map<number, { lod: LodElegido; maniqui: readonly string[] | null }>>();
  private readonly escalas = new WeakMap<FiguraDelCuerpo, number>();
  private readonly marchasLejanas = new WeakMap<FiguraDelCuerpo, MarchaDelLejano>();
  private readonly colores = new Map<string, THREE.Color>();
  /** Lo que depende de cada durmiente, por barrio: su aspecto y su figura (sin paraguas y con él). */
  private barrioDeLosDurmientes: Barrio | null = null;
  private readonly aspectos: (AspectoLeido | null)[] = new Array<AspectoLeido | null>(DURMIENTES).fill(null);
  private readonly figurasDeDurmiente: (FiguraDelCuerpo | null)[] = new Array<FiguraDelCuerpo | null>(DURMIENTES).fill(null);
  private readonly figurasConParaguas: (FiguraDelCuerpo | null)[] = new Array<FiguraDelCuerpo | null>(DURMIENTES).fill(null);
  private barrio: Barrio | null = null;
  private nivelPreparado: Nivel | null = null;
  private ultimoAhora = Number.NaN;
  private ultimoPresentado = Number.NaN;
  readonly medida: MedidaDeLosPersonajes = { llamadas: 0, triangulos: 0, conEsqueleto: 0, enRebano: 0, multitud: 0, paraguas: 0, yendose: 0, horneados: [], porHornear: 0, errores: [] };

  constructor(reparto: Reparto, urlDe: (archivo: string) => string, lector?: Lector) {
    this.almacen = new Almacen(reparto, urlDe, lector);
    this.ctx = { reparto, almacen: this.almacen, marchaDe: (e) => this.marchaDe(e) };
    this.lejanos = new AnimacionDeLosLejanos(reparto);
    this.grupo.name = 'personajes-del-quiebro';
    this.grupo.add(this.sombras.malla);
    for (const e of Object.keys(reparto.esqueletos)) void this.almacen.prepararClips(e);
  }

  get reparto(): Reparto {
    return this.ctx.reparto;
  }

  /** La marcha de un esqueleto, con sus zancadas (las del manifiesto para él, o las de referencia). */
  marchaDe(esqueleto: string): MarchaDelEsqueleto {
    const hecha = this.marchas.get(esqueleto);
    if (hecha !== undefined) return hecha;
    const r = this.ctx.reparto;
    const g = clipsDeLaMarchaGirada(r);
    const girada = (clip: string | null): MarchaGirada | null => {
      if (clip === null) return null;
      const p = pasoDelClip(r, clip, esqueleto);
      const c = r.clips[clip];
      return p === null || c === undefined ? null : { clip, zancada: p.zancada, velocidad: p.velocidad, duracionMs: c.duracionMs };
    };
    const m: MarchaDelEsqueleto = { marcha: marchaDelReparto(r, esqueleto), giradas: { atras: girada(g.atras), izquierda: girada(g.izquierda), derecha: girada(g.derecha) } };
    this.marchas.set(esqueleto, m);
    return m;
  }

  /* ─────────────────────────────── Cargas ─────────────────────────────── */

  /**
   * ADELANTA lo que un nivel va a pedir seguro: las figuras de los desvelados, y los rebaños con sus
   * texturas de huesos: la multitud y los cuerpos lejanos de cada figura. Los lejanos también en N2 y N3,
   * donde ningún cuerpo va en rebaño: si el gobernador baja a N0 en plena pelea, la textura (que no
   * depende del nivel: el mismo esqueleto, todos los gestos) ya está, y sólo falta el maniquí de N0,
   * que se funde en unos milisegundos. Lo llama el componente al montar y al cambiar de nivel, y el
   * propio fotograma si nadie lo llamó.
   */
  preparar(nivel: Nivel): void {
    this.nivelPreparado = nivel;
    const p = POLITICA[nivel];
    const r = this.ctx.reparto;
    for (const id of [1, 2]) {
      for (let v = 0; v < r.clases.desvelado.variantes.length; v++) {
        const f = figuraDelCuerpo(r, { id, clase: 'desvelado', variante: v, color: null }, null);
        for (const tope of [p.trisPropio, p.trisCerca, p.trisLejos]) void this.almacen.prepararLod(f, lodElegido(r, f.figura, tope, f.mallas));
      }
    }
    this.deseados.length = 0;
    r.durmientes.cuerpos.forEach((_c, k) => {
      const f = figuraDelDurmiente(r, 0, { cuerpo: k, ropa: 0, paraguas: false }, false);
      this.deseados.push({ figura: f, tope: p.trisMultitud, tipo: 'multitud', clase: 'prestado' });
    });
    const vistas = new Set<string>();
    const desear = (f: FiguraDelCuerpo, clase: CuerpoPintado['clase']): void => {
      const clave = `${f.figura}|${clase}`;
      if (vistas.has(clave)) return;
      vistas.add(clave);
      this.deseados.push({ figura: f, tope: p.trisRebano, tipo: 'lejanos', clase });
    };
    for (const id of [1, 2]) desear(figuraDelCuerpo(r, { id, clase: 'desvelado', variante: 0, color: null }, null), 'desvelado');
    r.clases.celador.variantes.forEach((_v, k) => desear(figuraDelCuerpo(r, { id: 16, clase: 'celador', variante: k, color: null }, null), 'celador'));
    this.prepararLoDeseado();
  }

  /** Crea los rebaños deseados que ya se puedan crear (sus cargas se piden la primera vez). */
  private prepararLoDeseado(): void {
    for (const d of this.deseados) this.rebano(d.figura, d.tope, d.tipo, d.clase, true);
  }

  /* ─────────────────────────────── Los rebaños ─────────────────────────────── */

  /**
   * Los clips que hornea un rebaño: los de estar parado y pasear con y sin paraguas en la multitud; y
   * TODOS los de los gestos (`clipsDeLosLejanos`): los hacen los lejanos, y los Prestados, que van en el
   * rebaño de la multitud. En todos los niveles: la textura no depende del nivel (ver `preparar`).
   */
  private pedidos(esqueleto: string, tipo: TipoDeRebano): { pedidos: PedidoDeHorneado[]; pasear: string; conParaguas: string; paradoConParaguas: string; reposo: string } {
    const r = this.ctx.reparto;
    const vistos = new Set<string>();
    const pedidos: PedidoDeHorneado[] = [];
    const pedir = (nombre: string, clip: string, espejo: boolean): void => {
      if (vistos.has(nombre) || r.clips[clip] === undefined) return;
      vistos.add(nombre);
      pedidos.push({ nombre, clip, espejo, bucle: r.clips[clip]?.bucle ?? false });
    };
    const pasear = r.clips.pasear !== undefined ? 'pasear' : (r.gestos.andar?.clip ?? 'andar');
    const reposo = r.gestos.reposo?.clip ?? 'reposo';
    pedir(reposo, reposo, false);
    pedir(pasear, pasear, false);
    let conParaguas = pasear;
    let paradoConParaguas = reposo;
    if (tipo === 'multitud') {
      const agarre = r.esqueletos[esqueleto]?.agarre.derecha ?? 'agarre_R';
      const postura = (raiz: THREE.Object3D): void => {
        const h = huesosDelBrazoDerecho(raiz, agarre);
        if (h !== null) posturaDelParaguas(raiz, h, 1);
      };
      /* Pasear con paraguas: el clip de la forja si lo trae; si no, pasear con la postura encima. */
      if (r.clips[PASEAR_CON_PARAGUAS] !== undefined) {
        pedir(PASEAR_CON_PARAGUAS, PASEAR_CON_PARAGUAS, false);
        conParaguas = PASEAR_CON_PARAGUAS;
      } else {
        conParaguas = `${pasear}~paraguas`;
        pedidos.push({ nombre: conParaguas, clip: pasear, bucle: true, postura });
      }
      paradoConParaguas = `${reposo}~paraguas`;
      pedidos.push({ nombre: paradoConParaguas, clip: reposo, bucle: true, postura });
    }
    for (const c of clipsDeLosLejanos(r)) pedir(c.nombre, c.clip, c.espejo);
    return { pedidos, pasear, conParaguas, paradoConParaguas, reposo };
  }

  /**
   * LA TABLA DE ROPAS de un rebaño: los colores (abrigo, pantalón, camisa) de cada ropa, estilo o traje,
   * sacados de los materiales de cada variante del reparto (ver «La multitud en dos llamadas»). `null`
   * mientras falte alguna paleta por leer. Sin variantes (el prototipo), las tablas de `rebano.ts`.
   */
  private tabla(figura: FiguraDelCuerpo, tipo: TipoDeRebano, clase: CuerpoPintado['clase'], lod: number): TablaDelRebano | null {
    const r = this.ctx.reparto;
    const hex = (c: THREE.Color | undefined): string => `#${(c ?? new THREE.Color(0.3, 0.3, 0.3)).getHexString()}`;
    const deVariantes = (listas: readonly (readonly string[] | null)[], camisaDelContorno: boolean): TablaDelRebano | null => {
      const ropas: { abrigo: string; tela: string; camisa: string }[] = [];
      for (const mallas of listas) {
        const p = this.almacen.paletaDeVariante(figura.figura, lod, mallas);
        if (p === null) return null;
        const f = this.ctx.reparto.figuras[figura.figura];
        const zonas = f?.zonas ?? [];
        const z = (n: string): THREE.Color | undefined => p[zonas.indexOf(n)]?.color;
        ropas.push({ abrigo: hex(z('mat_abrigo') ?? z('mat_traje')), tela: hex(z('mat_tela') ?? z('mat_traje')), camisa: hex(z('mat_camisa')) });
      }
      return { ropas, camisaDelContorno };
    };
    if (tipo === 'multitud' || clase === 'prestado') {
      const cuerpo = r.durmientes.cuerpos.find((c) => c.figura === figura.figura);
      if (cuerpo === undefined || cuerpo.ropas.every((x) => x.mallas === null)) return TABLA_DE_DURMIENTES;
      return deVariantes(
        cuerpo.ropas.map((x) => x.mallas),
        false,
      );
    }
    if (clase === 'desvelado') {
      const listas = r.clases.desvelado.variantes.map((v) => (figura.sexo === 'hombre' ? v.hombre.mallas : v.mujer.mallas));
      if (listas.every((x) => x === null)) return TABLA_DE_DESVELADOS;
      return deVariantes(listas, true);
    }
    /* Celadores: el traje de cada color de la paleta (la del manifiesto, o la de `rebano.ts`). */
    const trajes = coloresDelTraje(r);
    const camisa = TABLA_DE_CELADORES.ropas[0]?.camisa ?? '#bdbdb6';
    return { ropas: trajes.map((t) => ({ abrigo: t, tela: t, camisa })), camisaDelContorno: false };
  }

  /**
   * EL MANIQUÍ de una figura con un tope: la variante más ligera del LOD que toque, y ese LOD simplificado
   * al tope si ni así cabe (ver `simplificarMalla`). Recordado por figura y tope.
   */
  private maniqui(figura: string, tope: number): { lod: LodElegido; maniqui: readonly string[] | null } {
    let porTope = this.maniquis.get(figura);
    if (porTope === undefined) {
      porTope = new Map();
      this.maniquis.set(figura, porTope);
    }
    const hecho = porTope.get(tope);
    if (hecho !== undefined) return hecho;
    const r = this.ctx.reparto;
    const indice = lodParaTope(r, figura, tope, varianteMasLigera(r, figura, 0));
    const maniqui = varianteMasLigera(r, figura, indice);
    const nuevo = { lod: lodElegido(r, figura, tope, maniqui), maniqui };
    porTope.set(tope, nuevo);
    return nuevo;
  }

  /** La clase de rebaño: los desvelados, la ropa de los durmientes (multitud y Prestados) y los trajes. */
  private static claseDeRebano(tipo: TipoDeRebano, clase: CuerpoPintado['clase']): string {
    return tipo === 'multitud' || clase === 'prestado' ? 'multitud|p' : clase === 'desvelado' ? 'lejanos|d' : 'lejanos|c';
  }

  /**
   * El rebaño de una figura con un tope: el maniquí de la figura (ver la cabecera), con el paraguas
   * fundido si es la multitud. Se crea la primera vez que todo lo que necesita está cargado (y su textura
   * se pone en la cola del horno); `null` hasta que la textura está entera. Con `crear` falso sólo se
   * busca (para no crear rebaños que el nivel no preparó).
   */
  private rebano(figura: FiguraDelCuerpo, tope: number, tipo: TipoDeRebano, clase: CuerpoPintado['clase'], crear: boolean): RebanoHecho | null {
    const claseDeRebano = DirectorDeLosPersonajes.claseDeRebano(tipo, clase);
    const rapido = this.rebanosRapidos.get(claseDeRebano)?.get(figura.figura)?.get(tope);
    if (rapido !== undefined) return rapido.textura.lista ? rapido : null;
    if (!crear) return null;
    const e = this.maniqui(figura.figura, tope);
    const lod = e.lod;
    const clave = `${claseDeRebano}|${figura.figura}|${String(lod.indice)}~${String(lod.simplificado)}`;
    let hecho = this.rebanos.get(clave);
    if (hecho === undefined) {
      const tipoReal: TipoDeRebano = claseDeRebano.startsWith('multitud') ? 'multitud' : 'lejanos';
      /*
       * Las piezas fundidas en el maniquí, plegadas en quien no las lleva: el paraguas de la multitud, y
       * la pistola en el de los Celadores (el tirador lejano TELEGRAFÍA el disparo con ella en la mano).
       */
      const pistola = this.ctx.reparto.clases.tirador.pieza ?? 'pistola';
      const piezas = tipoReal === 'multitud' ? [PARAGUAS_LIGERO] : claseDeRebano === 'lejanos|c' ? [pistola] : [];
      const geometria = conOtrasPiezas(figura, piezas, e.maniqui ?? figura.mallas);
      const f = this.almacen.fundida(geometria, lod);
      if (f === null || !f.exacta) {
        void this.almacen.prepararLod(geometria, lod);
        return null;
      }
      const tabla = this.tabla(figura, tipoReal, clase, lod.indice);
      const p = this.pedidos(figura.esqueleto, tipoReal);
      const textura = tabla === null ? null : this.almacen.texturaDeHuesos(figura.figura, figura.esqueleto, f.malla, p.pedidos, tipoReal);
      if (tabla === null || textura === null) return null;
      const rebano = new Rebano(`rebano-${clave}`, f.malla, textura, tipoReal === 'multitud' ? DURMIENTES + CUERPOS_COMO_MUCHO : CUERPOS_COMO_MUCHO, tabla);
      hecho = { rebano, textura, pasear: p.pasear, pasearConParaguas: p.conParaguas, reposoConParaguas: p.paradoConParaguas, reposo: p.reposo };
      this.rebanos.set(clave, hecho);
      this.listaDeRebanos.push(hecho);
      this.grupo.add(rebano.malla);
    }
    let porFigura = this.rebanosRapidos.get(claseDeRebano);
    if (porFigura === undefined) {
      porFigura = new Map();
      this.rebanosRapidos.set(claseDeRebano, porFigura);
    }
    let porTope = porFigura.get(figura.figura);
    if (porTope === undefined) {
      porTope = new Map();
      porFigura.set(figura.figura, porTope);
    }
    porTope.set(tope, hecho);
    return hecho.textura.lista ? hecho : null;
  }

  /* ─────────────────────────────── Ayudas ─────────────────────────────── */

  private visible(x: number, z: number): boolean {
    this.esfera.center.set(x, 0.9, z);
    return this.frustum.intersectsSphere(this.esfera);
  }

  /** Un color sRGB en lineal, recordado (`Color.set` con texto asigna al leerlo). */
  private color(texto: string): THREE.Color {
    let c = this.colores.get(texto);
    if (c === undefined) {
      c = new THREE.Color(texto);
      this.colores.set(texto, c);
    }
    return c;
  }

  /** Rehace lo que depende de los durmientes de este barrio (aspecto y figura de cada uno). */
  private durmientesDe(barrio: Barrio | null): void {
    if (barrio === this.barrioDeLosDurmientes) return;
    this.barrioDeLosDurmientes = barrio;
    this.aspectos.fill(null);
    this.figurasDeDurmiente.fill(null);
    this.figurasConParaguas.fill(null);
    if (barrio === null) return;
    const r = this.ctx.reparto;
    const guion = guionDeLosDurmientes(barrio);
    const cuerpos = r.durmientes.cuerpos;
    const pasear = r.clips.pasear !== undefined ? 'pasear' : (r.gestos.andar?.clip ?? 'andar');
    for (let i = 0; i < DURMIENTES; i++) {
      const a = guion.durmientes[i];
      if (a === undefined) continue;
      const aspecto: AspectoLeido = { cuerpo: a.cuerpo, ropa: a.ropa, paraguas: a.paraguas };
      this.aspectos[i] = aspecto;
      this.figurasDeDurmiente[i] = figuraDelDurmiente(r, i, aspecto, false);
      this.figurasConParaguas[i] = figuraDelDurmiente(r, i, aspecto, aspecto.paraguas);
      /* La zancada de pasear de cada uno: la de su esqueleto (la mujer da pasos más cortos). */
      const cuerpo = cuerpos[a.cuerpo % Math.max(1, cuerpos.length)];
      const esq = cuerpo !== undefined ? (r.figuras[cuerpo.figura]?.esqueleto ?? null) : null;
      this.zancadas[i] = pasoDelClip(r, pasear, esq)?.zancada ?? 1.3;
    }
  }

  /**
   * LA FIGURA DE UN CUERPO, recordada por id mientras no cambien su clase, su variante, su color ni (en
   * los Prestados) el barrio. La primera vez que se ve, se piden ya sus LODs de esqueleto: cuando se
   * acerque, estarán.
   */
  private figuraDe(c: CuerpoPintado, nivel: Nivel): FiguraDelCuerpo {
    const barrio = c.clase === 'prestado' ? this.barrio : null;
    const hecha = this.figurasRecordadas.get(c.id);
    if (hecha !== undefined && hecha.clase === c.clase && hecha.variante === c.variante && hecha.color === c.color && hecha.barrio === barrio) return hecha.figura;
    const aspecto = c.clase === 'prestado' && Number.isInteger(c.variante) && c.variante >= 0 && c.variante < DURMIENTES ? this.aspectos[c.variante] ?? null : null;
    const figura = figuraDelCuerpo(this.ctx.reparto, c, aspecto);
    if (hecha !== undefined) {
      hecha.clase = c.clase;
      hecha.variante = c.variante;
      hecha.color = c.color;
      hecha.barrio = barrio;
      hecha.figura = figura;
    } else {
      this.figurasRecordadas.set(c.id, { clase: c.clase, variante: c.variante, color: c.color, barrio, figura });
    }
    const p = POLITICA[nivel];
    const r = this.ctx.reparto;
    for (const tope of [p.trisCerca, p.trisLejos]) void this.almacen.prepararLod(figura, lodElegido(r, figura.figura, tope, figura.mallas));
    return figura;
  }

  /**
   * LA ESCALA DE LA ZANCADA de una figura. La de su esqueleto la da el manifiesto (`clips.andar.mujer`);
   * si no la diera, se escala por la altura de las caderas frente al esqueleto de referencia (el
   * `hombre`): la primera vez que se probó sin esto, la mujer que trota a 5 m/s resbalaba 0,3 m/s (lo
   * midió el comprobador: fallaban justo los cuerpos de mujer). Encima, la altura de su silueta: el
   * Celador alto da pasos más largos. Recordada por figura en cuanto se puede calcular del todo.
   */
  escalaDeZancada(figura: FiguraDelCuerpo): number {
    const hecha = this.escalas.get(figura);
    if (hecha !== undefined) return hecha;
    const r = this.ctx.reparto;
    const andar = r.gestos.andar?.clip ?? 'andar';
    const propia = pasoDelClip(r, andar, figura.esqueleto)?.propio === true;
    let esqueleto = 1;
    let completa = true;
    const referencia = r.esqueletos.hombre !== undefined ? 'hombre' : (Object.keys(r.esqueletos)[0] ?? figura.esqueleto);
    if (!propia && referencia !== figura.esqueleto) {
      const suyas = this.almacen.clipsDe(figura.esqueleto)?.altura(r.esqueletos[figura.esqueleto]?.caderas ?? 'caderas') ?? null;
      const de = this.almacen.clipsDe(referencia)?.altura(r.esqueletos[referencia]?.caderas ?? 'caderas') ?? null;
      if (suyas !== null && de !== null && de > 0) esqueleto = suyas / de;
      else completa = false;
    }
    const escala = esqueleto * figura.silueta.escala[1];
    if (completa) this.escalas.set(figura, escala);
    return escala;
  }

  /** La marcha de un cuerpo lejano de esta figura (sus puntos, su escala y la fase de apoyo de cada clip). */
  private marchaLejana(figura: FiguraDelCuerpo): MarchaDelLejano {
    const hecha = this.marchasLejanas.get(figura);
    if (hecha !== undefined) return hecha;
    const clips = this.almacen.clipsDe(figura.esqueleto);
    const m: MarchaDelLejano = { puntos: this.marchaDe(figura.esqueleto).marcha, escala: this.escalaDeZancada(figura), apoyo: (clip) => clips?.apoyo(clip) ?? 0 };
    if (clips !== null) this.marchasLejanas.set(figura, m);
    return m;
  }

  /** Crea (o rehace si cambió de figura) el cuerpo con esqueleto de `id`. `null` si aún no se puede. */
  private cuerpoCon(id: number, figura: FiguraDelCuerpo, detalle: DetalleDelCuerpo): CuerpoConEsqueleto | null {
    const hecho = this.cuerpos.get(id);
    if (hecho !== undefined && hecho.figura.claveDeMalla === figura.claveDeMalla) return hecho;
    const lod = lodElegido(this.ctx.reparto, figura.figura, detalle.tope, figura.mallas);
    const f = this.almacen.fundida(figura, lod);
    if (f === null || !f.exacta) void this.almacen.prepararLod(figura, lod);
    const plantilla = this.almacen.plantilla(figura.figura);
    const clips = this.almacen.clipsDe(figura.esqueleto);
    if (f === null || plantilla === null || clips === null) return hecho ?? null;
    if (hecho !== undefined) this.soltarCuerpo(id);
    const nuevo = new CuerpoConEsqueleto(this.ctx, figura, plantilla, clips, f.malla, this.escalaDeZancada(figura));
    this.cuerpos.set(id, nuevo);
    this.grupo.add(nuevo.raiz);
    return nuevo;
  }

  private soltarCuerpo(id: number): void {
    this.cuerpos.get(id)?.liberar();
    this.cuerpos.delete(id);
    this.fotos.delete(id);
    this.idas.delete(id);
  }

  /** Guarda una copia de la foto de un cuerpo (reutilizando la suya, campo a campo: `Object.assign` asigna). */
  private guardarFoto(c: CuerpoPintado): void {
    const f = this.fotos.get(c.id);
    if (f === undefined) {
      this.fotos.set(c.id, { ...c });
      return;
    }
    f.clase = c.clase;
    f.variante = c.variante;
    f.color = c.color;
    f.x = c.x;
    f.z = c.z;
    f.rumbo = c.rumbo;
    f.velocidad = c.velocidad;
    f.gesto = c.gesto;
    f.gestoDesdeMs = c.gestoDesdeMs;
    f.impactoMs = c.impactoMs;
    f.direccionDelGesto = c.direccionDelGesto;
    f.contorno = c.contorno;
    f.tenue = c.tenue;
  }

  /* ─────────────────────────────── El fotograma ─────────────────────────────── */

  /**
   * UN FOTOGRAMA. `ahora` en ms de `performance.now()`; `presentado` el reloj de presentación de los
   * cuerpos ajenos y del adorno (el Remanso), o la identidad.
   */
  fotograma(fuente: FuenteDeCuerpos, nivel: Nivel, barrio: Barrio | null, camara: THREE.Camera, ahora: number, presentado: (t: number) => number): void {
    if (this.nivelPreparado !== nivel) this.preparar(nivel);
    const pol = POLITICA[nivel];
    this.barrio = barrio;
    this.durmientesDe(barrio);
    /* ── 0. El horno, y los rebaños que el nivel quiere ── */
    if (this.almacen.trabajar(PRESUPUESTO_DEL_HORNO_MS) > 0 || this.algunoSinHacer()) this.prepararLoDeseado();
    const tPresentado = presentado(ahora);
    const dtPresentado = Number.isNaN(this.ultimoPresentado) ? 0 : Math.max(0, Math.min(250, tPresentado - this.ultimoPresentado));
    this.ultimoAhora = ahora;
    this.ultimoPresentado = tPresentado;
    camara.updateMatrixWorld();
    this.pv.multiplyMatrices(camara.projectionMatrix, camara.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pv);
    const cx = camara.position.x;
    const cy = camara.position.y;
    const cz = camara.position.z;

    /* ── 1. El detalle ── */
    const yo = fuente.yo();
    const lista = fuente.cuerpos();
    this.medir.length = 0;
    for (let i = 0; i < lista.length; i++) {
      const c = lista[i] as CuerpoPintado;
      let m = this.medirReserva[i];
      if (m === undefined) {
        m = { id: 0, distancia: 0 };
        this.medirReserva.push(m);
      }
      m.id = c.id;
      m.distancia = distancia3(c.x - cx, 1.1 - cy, c.z - cz);
      this.medir.push(m);
    }
    const anterior = this.detalle;
    this.detalle = this.detalleAnterior;
    this.detalleAnterior = anterior;
    repartirElDetalle(this.medir, yo, nivel, this.detalleAnterior, this.detalle);

    for (const rb of this.listaDeRebanos) rb.rebano.empezar();
    this.sombras.empezar();
    this.lejanos.empezar();
    this.vuelta++;
    if (this.vivos.size > 4 * CUERPOS_COMO_MUCHO) this.vivos.clear();
    this.obstaculos.length = 0;
    let conEsqueleto = 0;
    let enRebano = 0;
    const lejosDelRebano = detalleDe('rebano', pol.trisRebano, 0, false);

    /* ── 2. Los cuerpos del juego ── */
    for (let i = 0; i < lista.length; i++) {
      const c = lista[i] as CuerpoPintado;
      const d = (this.medir[i] as CuerpoAMedir).distancia;
      let o = this.obstaculosReserva[i];
      if (o === undefined) {
        o = { x: 0, z: 0 };
        this.obstaculosReserva.push(o);
      }
      o.x = c.x;
      o.z = c.z;
      this.obstaculos.push(o);
      if (d > LEJOS_DEL_TODO_M && c.id !== yo) continue;
      const detalle = this.detalle.get(c.id) ?? lejosDelRebano;
      const tCuerpo = c.id === yo ? ahora : tPresentado;
      const antes = this.relojes.get(c.id);
      const dt = antes === undefined ? 0 : Math.max(0, Math.min(250, tCuerpo - antes));
      this.relojes.set(c.id, tCuerpo);
      const figura = this.figuraDe(c, nivel);
      this.vivos.set(c.id, this.vuelta);
      if (detalle.modo === 'esqueleto') {
        const cuerpo = this.cuerpoCon(c.id, figura, detalle);
        if (cuerpo === null) {
          /* Su malla aún no está: este fotograma va en su rebaño, si ya existe (no se crea uno). */
          if (this.alRebano(c, figura, pol.trisRebano, tCuerpo, dt, d, false) === 'pintado') enRebano++;
          continue;
        }
        this.lejanos.olvidar(c.id);
        this.idas.delete(c.id);
        cuerpo.yendose = 0;
        cuerpo.raiz.visible = true;
        cuerpo.actualizar(c, tCuerpo, dt, detalle, d, 0);
        this.guardarFoto(c);
        conEsqueleto++;
        this.sombras.poner(c.x, c.z, 1);
      } else {
        /*
         * Sin esqueleto: a su rebaño, y si tenía esqueleto se suelta. Pero si su rebaño aún no está (el
         * nivel acaba de bajar y el maniquí se está fundiendo), sigue con el esqueleto que tenía, con el
         * LOD de los lejanos: mejor unos fotogramas de más que un cuerpo que desaparece en plena pelea.
         */
        const hecho = this.alRebano(c, figura, detalle.tope, tCuerpo, dt, d, true);
        const tenia = this.cuerpos.get(c.id);
        if (hecho === 'sin-rebano' && tenia !== undefined) {
          tenia.actualizar(c, tCuerpo, dt, detalleDe('esqueleto', pol.trisLejos, 0, false), d, 0);
          this.guardarFoto(c);
          conEsqueleto++;
          continue;
        }
        if (tenia !== undefined) this.soltarCuerpo(c.id);
        if (hecho === 'pintado') enRebano++;
      }
    }

    /*
     * ── 3. Los que se van: sólo si caben (ver `cabeUnoQueSeVa`) ──
     * Casi nunca se va nadie: si los cuerpos con esqueleto son los vivos y los durmientes, ni se recorren.
     */
    let yendose = 0;
    const deLejos = detalleDe('esqueleto', pol.trisLejos, 0, false);
    if (this.cuerpos.size > conEsqueleto + this.cuantosDurmientes) for (const [id, cuerpo] of this.cuerpos) {
      if (this.esVivo(id) || id >= PRIMER_ID_DE_DURMIENTE) continue;
      const foto = this.fotos.get(id);
      let desde = this.idas.get(id);
      if (desde === undefined) desde = ahora;
      const t = (ahora - desde) / DESVANECER_MS;
      if (t >= 1 || foto === undefined || !cabeUnoQueSeVa(nivel, conEsqueleto, yendose)) {
        this.soltarCuerpo(id);
        this.relojes.delete(id);
        continue;
      }
      cuerpo.yendose = Math.min(0.97, t);
      cuerpo.actualizar(foto, tPresentado, dtPresentado, deLejos, distancia3(foto.x - cx, 1.1 - cy, foto.z - cz), 0);
      /* Con el LOD de los lejanos o nada: ocupa el hueco que dejó sin pasar de él. */
      if (!cuerpo.conSuLod) {
        this.soltarCuerpo(id);
        this.relojes.delete(id);
        continue;
      }
      this.idas.set(id, desde);
      yendose++;
    }
    if (this.relojes.size > lista.length) this.relojes.forEach(this.podarReloj);
    if (this.figurasRecordadas.size > lista.length) this.figurasRecordadas.forEach(this.podarFigura);
    this.lejanos.podar();

    /* ── 4. La multitud (y sin barrio, nadie: se sueltan los durmientes con esqueleto) ── */
    let multitud = 0;
    let paraguas = 0;
    if (barrio !== null) {
      const cuentas = this.pintarLaMultitud(fuente, barrio, nivel, ahora, tPresentado, dtPresentado, cx, cy, cz);
      multitud = cuentas >> 8;
      paraguas = cuentas & 255;
    } else {
      this.soltarLosDurmientes();
    }

    for (const rb of this.listaDeRebanos) rb.rebano.terminar();
    this.sombras.terminar();
    this.medirElFotograma(conEsqueleto, enRebano, multitud, paraguas, yendose);
  }

  /** ¿Se pintó `id` en este fotograma? */
  private esVivo(id: number): boolean {
    return this.vivos.get(id) === this.vuelta;
  }

  /** Cuántos durmientes llevan esqueleto ahora (para el banco y el comprobador). */
  get durmientesConEsqueletoAhora(): number {
    return this.cuantosDurmientes;
  }

  /** ¿Queda algún rebaño deseado sin hacer? */
  private algunoSinHacer(): boolean {
    for (const d of this.deseados) {
      const rb = this.rebanosRapidos.get(DirectorDeLosPersonajes.claseDeRebano(d.tipo, d.clase))?.get(d.figura.figura)?.get(d.tope);
      if (rb === undefined) return true;
    }
    return false;
  }

  /** Suelta a todos los durmientes con esqueleto. */
  private soltarLosDurmientes(): void {
    if (this.cuantosDurmientes === 0) return;
    for (let i = 0; i < DURMIENTES; i++) if (this.durmientesConEsqueleto[i] === 1) this.soltarCuerpo(PRIMER_ID_DE_DURMIENTE + i);
    this.durmientesConEsqueleto.fill(0);
    this.cuantosDurmientes = 0;
  }

  /** Pinta la multitud. Devuelve `multitud << 8 | paraguas` (sin asignar un objeto por fotograma). */
  private pintarLaMultitud(fuente: FuenteDeCuerpos, barrio: Barrio, nivel: Nivel, ahora: number, tPresentado: number, dt: number, cx: number, cy: number, cz: number): number {
    const r = this.ctx.reparto;
    const pol = POLITICA[nivel];
    const reposo = r.clips[r.gestos.reposo?.clip ?? 'reposo'];
    const tic = ticPintado(fuente.ticDeLosDurmientes(), ahora, tPresentado);
    const m = this.multitud;
    moverLaMultitud(m, barrio, tic, dt, fuente.prestados(), this.obstaculos, this.zancadaDe, reposo?.duracionMs ?? 2000);
    /* Los más cercanos, con esqueleto (N2 y N3); los que dejan de serlo vuelven a la multitud. */
    durmientesMasCercanos(m, cx, cz, pol.durmientesConEsqueleto, this.cercanos, this.durmientesConEsqueleto, HISTERESIS_M);
    this.esCercano.fill(0);
    for (const i of this.cercanos) this.esCercano[i] = 1;
    for (let i = 0; i < DURMIENTES; i++) {
      if (this.durmientesConEsqueleto[i] !== 1 || (this.esCercano[i] === 1 && m.visible[i] === 1)) continue;
      this.soltarCuerpo(PRIMER_ID_DE_DURMIENTE + i);
      this.durmientesConEsqueleto[i] = 0;
      this.cuantosDurmientes--;
    }
    let multitud = 0;
    let paraguas = 0;
    for (let i = 0; i < DURMIENTES; i++) {
      if (m.visible[i] !== 1) continue;
      const aspecto = this.aspectos[i];
      const figura = this.figurasDeDurmiente[i];
      if (aspecto === null || aspecto === undefined || figura === null || figura === undefined) continue;
      const x = (m.x[i] as number) + (m.apartX[i] as number);
      const z = (m.z[i] as number) + (m.apartZ[i] as number);
      const d = distancia3(x - cx, 1.1 - cy, z - cz);
      if (this.esCercano[i] === 1 && this.durmienteConEsqueleto(i, x, z, aspecto, tPresentado, dt, d, pol.trisLejos)) {
        if (this.durmientesConEsqueleto[i] !== 1) {
          this.durmientesConEsqueleto[i] = 1;
          this.cuantosDurmientes++;
        }
        this.sombras.poner(x, z, 0.8);
        continue;
      }
      if (d > LEJOS_DEL_TODO_M || !this.visible(x, z)) continue;
      const rb = this.rebano(figura, pol.trisMultitud, 'multitud', 'prestado', true);
      if (rb === null) continue;
      const cA = rb.textura.clips.get(aspecto.paraguas ? rb.reposoConParaguas : rb.reposo);
      const cB = rb.textura.clips.get(aspecto.paraguas ? rb.pasearConParaguas : rb.pasear);
      if (cA === undefined || cB === undefined) continue;
      filasDeLaMezcla(cA, (m.faseReposo[i] as number) * cA.duracion, cB, (m.faseAndar[i] as number) * cB.duracion, m.andando[i] as number, this.filas);
      const k = this.cabeza;
      const det = detalleDelDurmiente(i);
      k.x = x;
      k.z = z;
      k.giro = Math.PI - (m.rumbo[i] as number);
      k.escalaX = figura.silueta.escala[0];
      k.escalaY = figura.silueta.escala[1];
      k.escalaZ = figura.silueta.escala[2];
      k.filaA = this.filas.a;
      k.filaB = this.filas.b;
      k.mezcla = this.filas.mezcla;
      k.lleno = 0;
      k.ropa = aspecto.ropa;
      k.pelo = det.pelo;
      k.piel = det.piel;
      k.paraguas = aspecto.paraguas;
      k.tela = det.paraguas;
      k.amenaza = false;
      k.fuerza = 0;
      k.tenue = 0;
      k.corteAltura = 0;
      k.corteModo = 0;
      if (rb.rebano.poner(k)) {
        multitud++;
        if (aspecto.paraguas) paraguas++;
      }
      if (d < SOMBRA_DE_LA_MULTITUD_M) this.sombras.poner(x, z, 0.75);
    }
    return (multitud << 8) | paraguas;
  }

  /** Un durmiente cercano con esqueleto (N2+). Devuelve `false` si aún no se puede. */
  private durmienteConEsqueleto(i: number, x: number, z: number, aspecto: AspectoLeido, t: number, dt: number, d: number, tope: number): boolean {
    const m = this.multitud;
    const id = PRIMER_ID_DE_DURMIENTE + i;
    const figura = this.figurasConParaguas[i];
    if (figura === null || figura === undefined) return false;
    const detalle = detalleDe('esqueleto', tope, 0, false);
    const cuerpo = this.cuerpoCon(id, figura, detalle);
    if (cuerpo === null) return false;
    const andando = m.andando[i] as number;
    let foto = this.fotos.get(id);
    if (foto === undefined) {
      foto = { id, clase: 'prestado', variante: i, color: null, x, z, rumbo: 0, velocidad: 0, gesto: 'andar', gestoDesdeMs: 0, impactoMs: null, direccionDelGesto: null, contorno: false, tenue: false };
      this.fotos.set(id, foto);
    }
    foto.x = x;
    foto.z = z;
    foto.rumbo = m.rumbo[i] as number;
    foto.velocidad = (m.rapidez[i] as number) * andando;
    cuerpo.raiz.visible = true;
    cuerpo.actualizar(foto, t, dt, detalle, d, aspecto.paraguas ? 1 : 0);
    return true;
  }

  /**
   * Un cuerpo del juego sin esqueleto, a su rebaño: el clip de su gesto (TODOS están horneados: ver
   * `lejanos.ts`), con el fundido del que sale, su rumbo, su contorno, lo tenue y el corte. Con `crear`
   * falso sólo se usa un rebaño que ya exista.
   */
  private alRebano(c: CuerpoPintado, figura: FiguraDelCuerpo, tope: number, t: number, dt: number, d: number, crear: boolean): AlRebano {
    if (!this.visible(c.x, c.z)) return 'fuera';
    const pol = this.nivelPreparado !== null ? POLITICA[this.nivelPreparado] : POLITICA[0];
    const esPrestado = c.clase === 'prestado';
    const rb = esPrestado ? this.rebano(figura, pol.trisMultitud, 'multitud', 'prestado', crear) : this.rebano(figura, tope, 'lejanos', c.clase, crear);
    if (rb === null) return 'sin-rebano';
    const pose = this.lejanos.pose(c, t, dt, this.marchaLejana(figura), this.poseLejana);
    const reposo = rb.textura.clips.get(rb.reposo);
    const cB = rb.textura.clips.get(pose.b) ?? reposo;
    const cA = rb.textura.clips.get(pose.a) ?? reposo;
    if (cA === undefined || cB === undefined) return 'sin-rebano';
    if (pose.mezcla >= 1) filasEn(cB, pose.tb, this.filas, pose.bucleB);
    else filasDeLaMezcla(cA, pose.ta, cB, pose.tb, pose.mezcla, this.filas, pose.bucleA, pose.bucleB);
    const info = INFO_DE_GESTOS[c.gesto];
    const rumbo = info.direccion === 'cuerpo' && c.direccionDelGesto !== null ? c.direccionDelGesto : c.rumbo;
    const k = this.cabeza;
    k.x = c.x;
    k.z = c.z;
    k.giro = Math.PI - rumbo;
    k.escalaX = figura.silueta.escala[0];
    k.escalaY = figura.silueta.escala[1];
    k.escalaZ = figura.silueta.escala[2];
    k.filaA = this.filas.a;
    k.filaB = this.filas.b;
    k.mezcla = this.filas.mezcla;
    k.lleno = llenoDelContorno(d);
    const r = this.ctx.reparto;
    const trajes = coloresDelTraje(r).length;
    const aspecto = esPrestado && Number.isInteger(c.variante) && c.variante >= 0 && c.variante < DURMIENTES ? this.aspectos[c.variante] : null;
    k.ropa = esPrestado ? (aspecto?.ropa ?? 0) : c.clase === 'desvelado' ? c.variante : Math.floor(c.id / 4) % trajes;
    const det = detalleDelDurmiente(c.variante);
    k.pelo = det.pelo;
    k.piel = det.piel;
    /* La pieza fundida: el Prestado soltó el paraguas al ponerse a pelear; el tirador lleva la pistola. */
    k.paraguas = c.clase === 'tirador';
    k.tela = 0;
    k.amenaza = esAmenaza(c.clase);
    k.contorno.copy(this.color(colorDelContorno(c)));
    k.fuerza = c.contorno ? 1 : 0;
    k.tenue = c.tenue ? TENUE : 0;
    const corte = corteDelGesto(c.gesto, c.gestoDesdeMs, t, this.corte);
    k.corteAltura = corte.altura;
    k.corteModo = corte.modo;
    this.sombras.poner(c.x, c.z, 0.9);
    return rb.rebano.poner(k) ? 'pintado' : 'fuera';
  }

  /** Cuenta lo que se pinta de verdad (para el banco): una llamada por malla visible. */
  private medirElFotograma(conEsqueleto: number, enRebano: number, multitud: number, paraguas: number, yendose: number): void {
    const m = this.medida;
    this.cuentaLlamadas = 0;
    this.cuentaTriangulos = 0;
    this.cuerpos.forEach(this.contarCuerpo);
    let llamadas = this.cuentaLlamadas;
    let triangulos = this.cuentaTriangulos;
    for (const rb of this.listaDeRebanos) {
      if (rb.rebano.cuantas === 0) continue;
      llamadas++;
      triangulos += rb.rebano.cuantas * rb.rebano.triangulosPorCabeza;
    }
    if (this.sombras.cuantas > 0) {
      llamadas++;
      triangulos += this.sombras.cuantas * 2;
    }
    m.llamadas = llamadas;
    m.triangulos = triangulos;
    m.conEsqueleto = conEsqueleto;
    m.enRebano = enRebano;
    m.multitud = multitud;
    m.paraguas = paraguas;
    m.yendose = yendose;
    m.horneados = this.almacen.horneados;
    m.porHornear = this.almacen.porHornear;
    m.errores = this.almacen.errores;
  }

  /** Los LOD en uso ahora, por figura (para el banco: se calcula al pedirlo, no en cada fotograma). */
  lodsEnUso(): Record<string, number> {
    const lods: Record<string, number> = {};
    for (const c of this.cuerpos.values()) {
      if (!c.raiz.visible || c.triangulos === 0) continue;
      const k = `${c.figura.figura} LOD${c.lod}`;
      lods[k] = (lods[k] ?? 0) + 1;
    }
    return lods;
  }

  /** El último fotograma, en ms de `performance.now()` (para el banco). */
  get ultimo(): number {
    return this.ultimoAhora;
  }

  /** Para el banco: el cuerpo con esqueleto de `id`, si lo hay. */
  cuerpo(id: number): CuerpoConEsqueleto | null {
    return this.cuerpos.get(id) ?? null;
  }

  /** Para el banco y el comprobador: los rebaños hechos, por clave. */
  rebanosHechos(): ReadonlyMap<string, { readonly rebano: Rebano; readonly textura: HuesosEnTextura }> {
    return this.rebanos;
  }

  /** SUELTA todo lo que es suyo. */
  liberar(): void {
    for (const id of [...this.cuerpos.keys()]) this.soltarCuerpo(id);
    this.durmientesConEsqueleto.fill(0);
    this.cuantosDurmientes = 0;
    for (const rb of this.listaDeRebanos) {
      rb.rebano.liberar();
      rb.rebano.malla.removeFromParent();
    }
    this.rebanos.clear();
    this.listaDeRebanos.length = 0;
    this.rebanosRapidos.clear();
    this.sombras.liberar();
    this.almacen.liberar();
    this.grupo.removeFromParent();
  }
}
