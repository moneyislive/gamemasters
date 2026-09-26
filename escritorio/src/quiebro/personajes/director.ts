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
 *   4. La multitud (`multitud.ts`): los 48 del barrio, o en la ciudad abierta los cercanos de sus unos 630
 *      (§5.8 de CIUDAD-ABIERTA: 64 como mucho, con los candidatos a Prestado de cada jugador siempre),
 *      menos los Prestados y menos los que en N2+ llevan esqueleto por ser los más cercanos. Sin gente (se
 *      acabó la noche) no hay multitud, y los durmientes con esqueleto se sueltan: la primera versión los
 *      dejaba congelados en la acera.
 *
 * ═══ DE DÓNDE SALE LA GENTE ═══
 *
 * `fotograma` recibe el barrio (lo que le pasa `CuerposDelQuiebro.tsx`), pero la gente la pide primero a
 * la fuente (`genteDeLaFuente`): el juego (`red/partida.ts`) sabe si la noche es el barrio o la ciudad y
 * da la suya; el banco de los personajes no da ninguna y se pinta su barrio. Lo que depende de cada
 * durmiente (su aspecto, su figura, su zancada) se mira la primera vez que se pinta y se recuerda
 * mientras la gente sea la misma: en la ciudad nadie mira 630 figuras para pintar 64.
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
 * ═══ LOS DESVELADOS LEJANOS, UN REBAÑO POR CUERPO Y NO POR ESTILO ═══
 *
 * El reparto de la forja hizo de cada estilo su propia figura (gabardina, ligera y mole, de hombre y de
 * mujer): seis figuras de desvelado, y un rebaño por figura eran seis llamadas sólo para los desvelados
 * lejanos. Con los dos Celadores, el peor caso de N0 subía a 19 llamadas contra las 15 de su cuota
 * (`verify:quiebro-personajes`). Así que el desvelado lejano va en el maniquí del PRIMER estilo de su
 * cuerpo (`figuraDelRebano`), teñido con la ropa de SU estilo —la tabla sale de la paleta de cada figura
 * de estilo— y el forro y el contorno de su asiento: dos llamadas, hombre y mujer. Lo que se pierde a
 * más de doce metros es el corte del abrigo (el faldón de la gabardina, el volumen de la mole), que en el
 * maniquí de 400 triángulos ya no se leía; el color del estilo y el del asiento, que es lo que se lee a
 * sesenta metros, se quedan.
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
 *
 * ═══ UN PROGRAMA QUE NO SE ENLAZA DOS VECES ═══
 *
 * Todos los cuerpos con esqueleto comparten el programa de sombreado `personaje-quiebro` (85 KB de
 * fragmento), y three lo tira en cuanto se desecha el último material que lo usa. Entre noches no queda
 * nadie, y sin cuerpo propio (caído a Vigía, un despliegue) en N0 puede no quedar ningún cuerpo con
 * esqueleto: se desechaba el material del último, y al volver alguien el programa se compilaba y enlazaba
 * otra vez con el mismo fuente (la revisión de rendimiento del 24-sep lo vio enlazarse 9 veces en 18
 * minutos, una con una tarea de 78 ms). Lo mismo cuando un número de entidad que se reutiliza cambia de
 * figura: su cuerpo se suelta y se rehace en el mismo fotograma, y el material viejo se desechaba antes de
 * que el nuevo se pintara. Así que un cuerpo que se suelta sale de la escena en el acto pero se desecha al
 * fotograma SIGUIENTE (`porLiberar`), cuando ya se ha pintado quien sigue; y si no queda nadie, el último
 * soltado se guarda sin desechar hasta que vuelva alguien: su material tiene el programa cogido. Cambiar de
 * LOD no suelta el cuerpo (cuelga otra malla con el mismo material). `verify:quiebro-personajes` cuenta en
 * qué fotograma se desecha cada material.
 */
import * as THREE from 'three';
import type { Barrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import type { CuerpoPintado, FuenteDeCuerpos } from '../cuerpos';
import { ALTO_DE_LA_BOCA_SIN_MANO } from '../rayo/contrato';
import type { BocaDe } from '../rayo/contrato';
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
import { DURMIENTES_PINTADOS_COMO_MUCHO, crearLaMultitud, durmientesMasCercanos, genteDeLaFuente, moverLaMultitud, ticPintado } from './multitud';
import type { GenteDeLaNoche, Multitud, Obstaculo } from './multitud';
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
  /** La gente de la noche (su `clave`) de la que sale un Prestado, o `null`. */
  gente: object | null;
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
  /** La fuente del último fotograma: con ella sabe `bocaDe` dónde está cada cuerpo. */
  private ultimaFuente: FuenteDeCuerpos | null = null;
  /**
   * LA BOCA DEL RAYO (`rayo/contrato.ts`): dónde está la mano derecha del cuerpo `id` en este fotograma.
   * `Quiebro.tsx` la cuelga del sistema de efectos (`sistema.boca`) al montarse el director.
   *
   * FASE 0 (el stub del contrato): todavía no hay mano, así que da el PIVOTE del cuerpo —su sitio pintado, a
   * `ALTO_DE_LA_BOCA_SIN_MANO`— de la fuente del último fotograma. ANIMACIÓN la cambia por la mano de verdad
   * (`huesosDelBrazoDerecho` en los cuerpos con esqueleto; en los lejanos, la pose horneada), con la misma firma.
   */
  readonly bocaDe: BocaDe = (id, salida) => {
    const fuente = this.ultimaFuente;
    if (fuente === null) return false;
    const lista = fuente.cuerpos();
    for (let i = 0; i < lista.length; i++) {
      const c = lista[i] as CuerpoPintado;
      if (c.id !== id) continue;
      salida.x = c.x;
      salida.y = ALTO_DE_LA_BOCA_SIN_MANO;
      salida.z = c.z;
      return true;
    }
    return false;
  };
  private readonly ctx: ContextoDeLosCuerpos;
  private readonly marchas = new Map<string, MarchaDelEsqueleto>();
  private readonly cuerpos = new Map<number, CuerpoConEsqueleto>();
  /** Los cuerpos soltados que aún no se han desechado (ver «Un programa que no se enlaza dos veces»). */
  private readonly porLiberar: CuerpoConEsqueleto[] = [];
  /** Cuántos cuerpos con esqueleto quedaron puestos al acabar el fotograma anterior: ya se han pintado. */
  private puestosAntes = 0;
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
  private readonly sombras = new Sombras(CUERPOS_COMO_MUCHO + DURMIENTES_PINTADOS_COMO_MUCHO);
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
  /** Los desvelados de este fotograma (sus candidatos a Prestado se pintan siempre) y desde dónde se elige la multitud. */
  private readonly jugadores: Obstaculo[] = [];
  private readonly centroDeLaMultitud = { x: 0, z: 0 };
  private readonly mirada = { centro: this.centroDeLaMultitud, jugadores: this.jugadores as readonly Obstaculo[] };
  private readonly cercanos: number[] = [];
  /* Lo de cada durmiente, del tamaño de la gente de la noche (`durmientesDe`). */
  private esCercano = new Uint8Array(0);
  /** Los ids pintados en este fotograma, con el número del fotograma (vaciar un `Set` asigna su tabla). */
  private readonly vivos = new Map<number, number>();
  private vuelta = 0;
  /** Qué durmientes llevan esqueleto (N2+), y cuántos. */
  private durmientesConEsqueleto = new Uint8Array(0);
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
  private zancadas = new Float64Array(0);
  private readonly zancadaDe = (i: number): number => {
    this.asegurarElDurmiente(i);
    return this.zancadas[i] as number;
  };
  private readonly figurasRecordadas = new Map<number, FiguraRecordada>();
  private readonly maniquis = new Map<string, Map<number, { lod: LodElegido; maniqui: readonly string[] | null }>>();
  /** La figura del rebaño de los desvelados lejanos, por cuerpo (ver «Los desvelados lejanos»). */
  private readonly figurasDelRebano = new Map<string, FiguraDelCuerpo>();
  private readonly escalas = new WeakMap<FiguraDelCuerpo, number>();
  private readonly marchasLejanas = new WeakMap<FiguraDelCuerpo, MarchaDelLejano>();
  private readonly colores = new Map<string, THREE.Color>();
  /**
   * Lo que depende de cada durmiente, por gente de la noche: su aspecto y su figura (sin paraguas y con
   * él), mirados la primera vez que hacen falta (`asegurarElDurmiente`).
   */
  private genteDeLosDurmientes: GenteDeLaNoche | null = null;
  private aspectos: (AspectoLeido | null)[] = [];
  private figurasDeDurmiente: (FiguraDelCuerpo | null)[] = [];
  private figurasConParaguas: (FiguraDelCuerpo | null)[] = [];
  private gente: GenteDeLaNoche | null = null;
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
      const porEstilo = r.clases.desvelado.variantes.map((v) => (figura.sexo === 'hombre' ? v.hombre : v.mujer));
      /*
       * Cada estilo, su figura (el reparto de la forja): la ropa de cada uno sale de SU paleta, en su LOD
       * más ligero, aunque el rebaño pinte el maniquí del primero (ver «Los desvelados lejanos»).
       */
      if (porEstilo.some((e) => e.figura !== figura.figura)) {
        const ropas: { abrigo: string; tela: string; camisa: string }[] = [];
        for (const e of porEstilo) {
          const lods = r.figuras[e.figura]?.lods.length ?? 1;
          const paleta = this.almacen.paletaDeVariante(e.figura, Math.max(0, lods - 1), e.mallas);
          if (paleta === null) return null;
          const zonas = r.figuras[e.figura]?.zonas ?? [];
          const z = (n: string): THREE.Color | undefined => paleta[zonas.indexOf(n)]?.color;
          ropas.push({ abrigo: hex(z('mat_abrigo') ?? z('mat_traje')), tela: hex(z('mat_tela') ?? z('mat_traje')), camisa: hex(z('mat_camisa')) });
        }
        return { ropas, camisaDelContorno: true };
      }
      const listas = porEstilo.map((e) => e.mallas);
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

  /**
   * LA FIGURA DEL REBAÑO de un cuerpo lejano: la suya, salvo el desvelado, que va en la del primer estilo
   * de su cuerpo (ver «Los desvelados lejanos»). Recordada por cuerpo: no se construye en cada fotograma.
   */
  private figuraDelRebano(c: CuerpoPintado, figura: FiguraDelCuerpo): FiguraDelCuerpo {
    if (c.clase !== 'desvelado') return figura;
    let f = this.figurasDelRebano.get(figura.sexo);
    if (f === undefined) {
      f = figuraDelCuerpo(this.ctx.reparto, { id: c.id, clase: 'desvelado', variante: 0, color: null }, null);
      this.figurasDelRebano.set(figura.sexo, f);
    }
    return f;
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
      const rebano = new Rebano(`rebano-${clave}`, f.malla, textura, tipoReal === 'multitud' ? DURMIENTES_PINTADOS_COMO_MUCHO + CUERPOS_COMO_MUCHO : CUERPOS_COMO_MUCHO, tabla);
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

  /**
   * La gente de la noche cambió: lo de cada durmiente, del tamaño nuevo y sin mirar a nadie todavía (ver
   * `asegurarElDurmiente`). Los durmientes con esqueleto de la gente de antes se sueltan: sus índices ya
   * no son de nadie.
   */
  private durmientesDe(gente: GenteDeLaNoche | null): void {
    if (gente === this.genteDeLosDurmientes) return;
    this.soltarLosDurmientes();
    this.genteDeLosDurmientes = gente;
    const total = gente === null ? 0 : gente.total;
    this.aspectos = new Array<AspectoLeido | null>(total).fill(null);
    this.figurasDeDurmiente = new Array<FiguraDelCuerpo | null>(total).fill(null);
    this.figurasConParaguas = new Array<FiguraDelCuerpo | null>(total).fill(null);
    this.zancadas = new Float64Array(total).fill(1.3);
    this.esCercano = new Uint8Array(total);
    this.durmientesConEsqueleto = new Uint8Array(total);
    this.cuantosDurmientes = 0;
  }

  /**
   * LO DE UN DURMIENTE, mirado la primera vez que hace falta y recordado mientras la gente sea la misma: su
   * aspecto (cuerpo, ropa, paraguas), su figura sin paraguas y con el suyo, y la zancada de pasear de su
   * esqueleto (la mujer da pasos más cortos). `null` si no hay gente o el índice no es de ella.
   */
  private asegurarElDurmiente(i: number): AspectoLeido | null {
    const gente = this.genteDeLosDurmientes;
    if (gente === null || !Number.isInteger(i) || i < 0 || i >= gente.total) return null;
    const hecho = this.aspectos[i];
    if (hecho !== null && hecho !== undefined) return hecho;
    const r = this.ctx.reparto;
    const a = gente.aspecto(i);
    const aspecto: AspectoLeido = { cuerpo: a.cuerpo, ropa: a.ropa, paraguas: a.paraguas };
    this.aspectos[i] = aspecto;
    this.figurasDeDurmiente[i] = figuraDelDurmiente(r, i, aspecto, false);
    this.figurasConParaguas[i] = figuraDelDurmiente(r, i, aspecto, aspecto.paraguas);
    const cuerpos = r.durmientes.cuerpos;
    const pasear = r.clips.pasear !== undefined ? 'pasear' : (r.gestos.andar?.clip ?? 'andar');
    const cuerpo = cuerpos[a.cuerpo % Math.max(1, cuerpos.length)];
    const esq = cuerpo !== undefined ? (r.figuras[cuerpo.figura]?.esqueleto ?? null) : null;
    this.zancadas[i] = pasoDelClip(r, pasear, esq)?.zancada ?? 1.3;
    return aspecto;
  }

  /**
   * LA FIGURA DE UN CUERPO, recordada por id mientras no cambien su clase, su variante, su color ni (en
   * los Prestados) la gente de la noche. La primera vez que se ve, se piden ya sus LODs de esqueleto:
   * cuando se acerque, estarán.
   */
  private figuraDe(c: CuerpoPintado, nivel: Nivel): FiguraDelCuerpo {
    const gente = c.clase === 'prestado' ? (this.gente?.clave ?? null) : null;
    const hecha = this.figurasRecordadas.get(c.id);
    if (hecha !== undefined && hecha.clase === c.clase && hecha.variante === c.variante && hecha.color === c.color && hecha.gente === gente) return hecha.figura;
    const aspecto = c.clase === 'prestado' ? this.asegurarElDurmiente(c.variante) : null;
    const figura = figuraDelCuerpo(this.ctx.reparto, c, aspecto);
    if (hecha !== undefined) {
      hecha.clase = c.clase;
      hecha.variante = c.variante;
      hecha.color = c.color;
      hecha.gente = gente;
      hecha.figura = figura;
    } else {
      this.figurasRecordadas.set(c.id, { clase: c.clase, variante: c.variante, color: c.color, gente, figura });
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

  /** Suelta el cuerpo de `id`: fuera de la escena ya, desechado cuando toque (`liberarLosSoltados`). */
  private soltarCuerpo(id: number): void {
    const cuerpo = this.cuerpos.get(id);
    if (cuerpo !== undefined) {
      cuerpo.raiz.removeFromParent();
      this.porLiberar.push(cuerpo);
    }
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
   * cuerpos ajenos y del adorno (el Remanso), o la identidad. `barrio`, el de la noche si la fuente no da
   * su gente (ver «De dónde sale la gente»).
   */
  fotograma(fuente: FuenteDeCuerpos, nivel: Nivel, barrio: Barrio | null, camara: THREE.Camera, ahora: number, presentado: (t: number) => number): void {
    this.ultimaFuente = fuente;
    this.liberarLosSoltados();
    if (this.nivelPreparado !== nivel) this.preparar(nivel);
    const pol = POLITICA[nivel];
    const gente = genteDeLaFuente(fuente, barrio);
    this.gente = gente;
    this.durmientesDe(gente);
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

    /* ── 4. La multitud (y sin gente, nadie: se sueltan los durmientes con esqueleto) ── */
    let multitud = 0;
    let paraguas = 0;
    if (gente !== null) {
      const cuentas = this.pintarLaMultitud(fuente, gente, nivel, ahora, tPresentado, dtPresentado, cx, cy, cz);
      multitud = cuentas >> 8;
      paraguas = cuentas & 255;
    } else {
      this.soltarLosDurmientes();
    }

    for (const rb of this.listaDeRebanos) rb.rebano.terminar();
    this.sombras.terminar();
    this.medirElFotograma(conEsqueleto, enRebano, multitud, paraguas, yendose);
    this.puestosAntes = this.cuerpos.size;
  }

  /**
   * DESECHA LOS CUERPOS SOLTADOS (ver «Un programa que no se enlaza dos veces»): todos si al acabar el
   * fotograma anterior quedaba alguien puesto —ya se ha pintado, y su material tiene el programa—; si no,
   * todos menos el último, que guarda el programa hasta que vuelva alguien.
   */
  private liberarLosSoltados(): void {
    const guardar = this.puestosAntes > 0 ? 0 : 1;
    while (this.porLiberar.length > guardar) (this.porLiberar.shift() as CuerpoConEsqueleto).liberar();
  }

  /** Cuántos cuerpos soltados esperan a desecharse (para el comprobador: como mucho uno sin nadie puesto). */
  get soltadosSinDesechar(): number {
    return this.porLiberar.length;
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
    for (let i = 0; i < this.durmientesConEsqueleto.length; i++) if (this.durmientesConEsqueleto[i] === 1) this.soltarCuerpo(PRIMER_ID_DE_DURMIENTE + i);
    this.durmientesConEsqueleto.fill(0);
    this.cuantosDurmientes = 0;
  }

  /**
   * Desde dónde elige la multitud de la ciudad a quién pinta: el propio si lo hay y si no la cámara, y los
   * desvelados de este fotograma (sus candidatos a Prestado, siempre). En el barrio no cuenta: van todos.
   */
  private mirarDesde(fuente: FuenteDeCuerpos, cx: number, cz: number): void {
    const yo = fuente.yo();
    const lista = fuente.cuerpos();
    this.centroDeLaMultitud.x = cx;
    this.centroDeLaMultitud.z = cz;
    this.jugadores.length = 0;
    for (let i = 0; i < lista.length; i++) {
      const c = lista[i] as CuerpoPintado;
      if (c.clase !== 'desvelado') continue;
      if (c.id === yo) {
        this.centroDeLaMultitud.x = c.x;
        this.centroDeLaMultitud.z = c.z;
      }
      /* Los obstáculos ya llevan el sitio de cada cuerpo, en el mismo orden: se reutilizan. */
      const o = this.obstaculos[i];
      if (o !== undefined) this.jugadores.push(o);
    }
  }

  /** Pinta la multitud. Devuelve `multitud << 8 | paraguas` (sin asignar un objeto por fotograma). */
  private pintarLaMultitud(fuente: FuenteDeCuerpos, gente: GenteDeLaNoche, nivel: Nivel, ahora: number, tPresentado: number, dt: number, cx: number, cy: number, cz: number): number {
    const r = this.ctx.reparto;
    const pol = POLITICA[nivel];
    const reposo = r.clips[r.gestos.reposo?.clip ?? 'reposo'];
    const tic = ticPintado(fuente.ticDeLosDurmientes(), ahora, tPresentado);
    const m = this.multitud;
    this.mirarDesde(fuente, cx, cz);
    moverLaMultitud(m, gente, tic, dt, fuente.prestados(), this.obstaculos, this.zancadaDe, reposo?.duracionMs ?? 2000, this.mirada);
    /* Los más cercanos, con esqueleto (N2 y N3); los que dejan de serlo vuelven a la multitud. */
    durmientesMasCercanos(m, cx, cz, pol.durmientesConEsqueleto, this.cercanos, this.durmientesConEsqueleto, HISTERESIS_M);
    this.esCercano.fill(0);
    for (const i of this.cercanos) this.esCercano[i] = 1;
    if (this.cuantosDurmientes > 0) {
      for (let i = 0; i < this.durmientesConEsqueleto.length; i++) {
        if (this.durmientesConEsqueleto[i] !== 1 || (this.esCercano[i] === 1 && m.visible[i] === 1)) continue;
        this.soltarCuerpo(PRIMER_ID_DE_DURMIENTE + i);
        this.durmientesConEsqueleto[i] = 0;
        this.cuantosDurmientes--;
      }
    }
    let multitud = 0;
    let paraguas = 0;
    for (let q = 0; q < m.cuantos; q++) {
      const i = m.lista[q] as number;
      if (m.visible[i] !== 1) continue;
      const aspecto = this.asegurarElDurmiente(i);
      const figura = this.figurasDeDurmiente[i];
      if (aspecto === null || figura === null || figura === undefined) continue;
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
    const rb = esPrestado ? this.rebano(figura, pol.trisMultitud, 'multitud', 'prestado', crear) : this.rebano(this.figuraDelRebano(c, figura), tope, 'lejanos', c.clase, crear);
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
    const aspecto = esPrestado ? this.asegurarElDurmiente(c.variante) : null;
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
    for (const c of this.porLiberar) c.liberar();
    this.porLiberar.length = 0;
    this.puestosAntes = 0;
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
