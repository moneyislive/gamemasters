/**
 * EL RUMBO: a qué se tiende el hilo, con qué campo se mide, y por dónde van sus glifos por el suelo
 * (`docs/quiebro/CIUDAD-ABIERTA.md` §5.9, contrato en `../orientacion.ts`). Puro, sin React ni three: lo
 * leen el minimapa, el plano y quien pinte el hilo en la escena, y `verify:quiebro-juego` lo llama en Node.
 *
 * ═══ LOS METROS SON LOS DE LA SALA ═══
 *
 * Nada de aquí mide a su manera. El campo de un objetivo es `campoHasta` (el Dijkstra con orden total de
 * `quiebro-ciudad.ts`), los metros que se enseñan son `distanciaPorCalles` redondeados por
 * `metrosQueSeEnsenan`, y el camino es `caminoPorElCampo`: las mismas funciones que usan la sala, los
 * robots y el comprobador. Si el HUD dijera 140 m y la sala midiera 152, el jugador aprendería a no
 * creerse el HUD.
 *
 * ═══ LOS GLIFOS SE QUEDAN QUIETOS EN EL SUELO ═══
 *
 * El hilo va `METROS_DEL_HILO` por delante del propio, y el propio anda. Si los glifos se pusieran cada
 * `PASO_DEL_GLIFO` metros CONTANDO DESDE EL PROPIO, resbalarían por el suelo con cada paso, como una
 * cinta transportadora. Se ponen donde la distancia por calles a la meta es un múltiplo exacto del paso:
 * ese sitio es del mundo, no del que anda, y el glifo que hay en él (uno de los 48 de la Grafía, sacado
 * de ese múltiplo y de la meta) es el mismo mientras el rumbo no cambie. Andar hace que aparezcan por
 * delante y se apaguen por detrás; nunca que se muevan. Con un paso de 1,25 m (exacto en binario, como
 * los cuartos de la ciudad) son 49 glifos como mucho: 98 triángulos de los `TRIANGULOS_DEL_HILO`.
 *
 * ═══ EL HILO EMPIEZA DONDE ESTÁ EL PROPIO, NO DETRÁS ═══
 *
 * El nudo más cercano puede haber quedado atrás: quien anda entre dos nudos ya ha pasado uno. Un hilo que
 * empezara en él saldría hacia atrás y daría la vuelta a los pies del jugador. Así que el hilo empieza en
 * la PROYECCIÓN del propio sobre el tramo de la ruta en que está: el que sale del nudo más cercano si ya lo
 * pasó, o el que llega a él si aún no. Con eso, además, la distancia del principio a la meta no salta
 * cuando el nudo más cercano cambia (un tramo de 24 m hasta el centro de una plaza la haría saltar 12 m, y
 * asomarían diez glifos de golpe al fondo). Los METROS que se enseñan no cambian por esto: son siempre los
 * de `distanciaPorCalles`, los de la sala.
 *
 * ═══ EL HILO ACABA DONDE SE DESCUELGA, NO EN LA CALZADA ═══
 *
 * Los nudos van por el centro de la calzada; una cabina se descuelga en su SITIO, en la acera y detrás de
 * su poste, a `radio` (1,5 m) del centro de su zona. El nudo más cercano a ese sitio queda a 4,5-6 m (las
 * 640 cabinas de las 32 trazas), así que un hilo que acabara en el nudo dejaba al jugador en la calzada con
 * «1 m» en el pie del minimapa y sin poder descolgar: la Llamada se perdía al final del rumbo (revisión del
 * 24-sep, noche 4). Por eso el rumbo a un objetivo con sitio (una cabina, un refugio, una zona suelta)
 * sigue del nudo meta a su sitio por un ÚLTIMO TRAMO (`tramoFinal`): en recta si se anda, y si no —el
 * poste está justo en medio, en todas— rodeándolo por la acera, `RODEO_DEL_POSTE` a un lado. Los metros
 * cuentan hasta el sitio como los cuenta el productor al elegir la cabina (`distanciaPorCalles` hasta el
 * sitio: el campo del nudo más lo que hay de él al sitio por los ejes), y a `CERCA_DEL_SITIO` o menos,
 * en recta por los ejes: en el sitio, 0.
 *
 * ═══ LOS CAMPOS SE GUARDAN POR META ═══
 *
 * Un campo cuesta un Dijkstra entero (≈ 0,3 ms con la ciudad) y se lee con una suma. Se calcula una vez
 * por objetivo y noche (`CamposPorMeta`, los `CAMPOS_GUARDADOS` últimos) y se guarda por la IDENTIDAD del
 * grafo: el grafo de otra noche —con otros cortes de obra— es otro objeto y da otro campo, aunque sus
 * nudos sean los mismos.
 */
import type { CampoDeDistancias, GrafoDeLaCiudad, NocheDeLaCiudad } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import { caminoPorElCampo, campoHasta, distanciaPorCalles, nudoMasCercano, queZonaEs } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { MarcaDelMapa, ObjetivoDelRumbo, RumboTendido } from '../orientacion';
import { METROS_DEL_HILO, metrosQueSeEnsenan, TRIANGULOS_DEL_HILO } from '../orientacion';

/* ─── LAS MEDIDAS DEL HILO ───────────────────────────────────────────────── */

/** Un glifo cada tanto, contado en metros por calles hasta la meta. 1,25 es exacto en binario. */
export const PASO_DEL_GLIFO = 1.25;
/** Lo que se deja libre a los pies del propio antes del primer glifo. */
export const INICIO_DEL_HILO = 1.5;
/** Lo que se funde al final del hilo, para que no acabe de golpe. */
export const FUNDIDO_DEL_HILO = 15;
/** Cada glifo es un cuadrado en el suelo: dos triángulos. */
export const TRIANGULOS_POR_GLIFO = 2;
/** Los glifos de la Grafía (§1 de EL-QUIEBRO): 48. */
export const GLIFOS_DE_LA_GRAFIA = 48;
/** Cuántos glifos caben como mucho en el búfer del hilo: el tope de triángulos manda. */
export const GLIFOS_DEL_HILO_COMO_MUCHO = Math.floor(TRIANGULOS_DEL_HILO / TRIANGULOS_POR_GLIFO);
/** Cada glifo son cinco números: `x`, `z`, rumbo (radianes, 0 al norte, hacia el este), glifo (0-47) y brillo (0-1). */
export const NUMEROS_POR_GLIFO = 5;
/** La ruta entera que pintan los mapas, en puntos `[x, z]`: una travesía de canto a canto son unos 180. */
export const PUNTOS_DE_LA_RUTA = 512;
/** Cuántos campos se guardan: 3 Fallos, 2 propinas, 2 cabinas y un «Aquí». */
export const CAMPOS_GUARDADOS = 8;
/**
 * Lo que el último tramo se aparta del poste de una cabina o de un refugio para rodearlo por la acera: medio
 * poste (0,25) más el radio de una persona (0,35), y holgura. Medido en las 640 cabinas: en recta no se
 * anda en ninguna, y con este rodeo, en todas.
 */
export const RODEO_DEL_POSTE = 1;
/** A cuánto del sitio de un objetivo los metros se cuentan en recta por los ejes y no dando la vuelta por el nudo meta. */
export const CERCA_DEL_SITIO = 12;
/** El radio con que el último tramo esquiva las cajas: el de una persona, un pelo menos (las cajas se ensanchan en cuadrado). */
const RADIO_DEL_TRAMO = 0.3;

/** Un punto del suelo, en metros. */
interface PuntoDelSuelo {
  readonly x: number;
  readonly z: number;
}

/* ─── LOS OBJETIVOS ──────────────────────────────────────────────────────── */

/** ¿A qué objetivo tiende el rumbo tocar esta marca? Los Fallos por su plaza; cabinas, refugios y arcas por su zona. `null` si no tiende a nada. */
export function objetivoDeLaMarca(marca: Pick<MarcaDelMapa, 'clase' | 'quien'>): ObjetivoDelRumbo | null {
  if (!Number.isInteger(marca.quien) || marca.quien <= 0) return null;
  switch (marca.clase) {
    case 'fallo':
      return { tipo: 'fallo', plaza: marca.quien };
    case 'cabina':
    case 'refugio':
    case 'arca':
      return { tipo: 'zona', zona: marca.quien };
    default:
      return null;
  }
}

/** ¿Son el mismo objetivo? (tocar el objetivo del rumbo tendido lo suelta). */
export function mismoObjetivo(a: ObjetivoDelRumbo | null, b: ObjetivoDelRumbo | null): boolean {
  if (a === null || b === null) return false;
  if (a.tipo === 'fallo') return b.tipo === 'fallo' && a.plaza === b.plaza;
  if (a.tipo === 'zona') return b.tipo === 'zona' && a.zona === b.zona;
  return b.tipo === 'nudo' && a.nudo === b.nudo;
}

type NocheQueOrienta = Pick<NocheDeLaCiudad, 'ciudad' | 'grafo' | 'cajas'>;

/**
 * EL SITIO DE UN OBJETIVO: donde se hace lo que se va a hacer allí, fuera del grafo; `null` si el objetivo
 * ES un nudo (un Fallo, que se mide desde el nudo de su plaza; la zona del Fallo de una plaza; un «Aquí») o
 * si la noche no lo tiene:
 *   · una cabina, su `sitio`: el centro de su zona, donde se planta quien descuelga;
 *   · un refugio, su primer sitio;
 *   · cualquier otra zona, el centro de su caja.
 */
export function sitioDelObjetivo(noche: Pick<NocheDeLaCiudad, 'ciudad'>, objetivo: ObjetivoDelRumbo): PuntoDelSuelo | null {
  if (objetivo.tipo !== 'zona') return null;
  const que = queZonaEs(objetivo.zona);
  if (que === null || (que.que === 'plaza' && que.tipo === 'fallo')) return null;
  const ciudad = noche.ciudad;
  if (que.que === 'cabina') return ciudad.cabinas[que.k]?.sitio ?? null;
  if (que.que === 'refugio') return ciudad.refugios[que.k]?.sitios[0] ?? null;
  const zona = ciudad.zonas.find((z) => z.id === objetivo.zona);
  return zona === undefined ? null : { x: (zona.caja.x0 + zona.caja.x1) / 2, z: (zona.caja.z0 + zona.caja.z1) / 2 };
}

/**
 * EL NUDO META DE UN OBJETIVO en el grafo de la noche, o −1 si esa noche no lo tiene:
 *   · un Fallo, el `nudo` de su plaza (de donde se miden las distancias entre plazas);
 *   · la zona del Fallo de una plaza, lo mismo; cualquier otra zona, el nudo más cercano a su sitio
 *     (`sitioDelObjetivo`), del que sigue el último tramo (`tramoFinal`);
 *   · un nudo, él mismo.
 * Los nudos son los mismos en todas las noches (contrato de `NocheDeLaCiudad`), así que el meta de un
 * objetivo no cambia con los cortes; su campo, sí.
 */
export function nudoDelObjetivo(noche: Pick<NocheDeLaCiudad, 'ciudad' | 'grafo'>, objetivo: ObjetivoDelRumbo): number {
  const nudos = noche.grafo.nudos.length;
  const ciudad = noche.ciudad;
  if (objetivo.tipo === 'nudo') return Number.isInteger(objetivo.nudo) && objetivo.nudo >= 0 && objetivo.nudo < nudos ? objetivo.nudo : -1;
  if (objetivo.tipo === 'fallo') {
    const plaza = ciudad.plazas.find((p) => p.numero === objetivo.plaza);
    return plaza !== undefined && plaza.nudo >= 0 && plaza.nudo < nudos ? plaza.nudo : -1;
  }
  const que = queZonaEs(objetivo.zona);
  if (que === null) return -1;
  if (que.que === 'plaza' && que.tipo === 'fallo') return nudoDelObjetivo(noche, { tipo: 'fallo', plaza: que.plaza });
  const sitio = sitioDelObjetivo(noche, objetivo);
  return sitio === null ? -1 : nudoMasCercano(noche.grafo, sitio.x, sitio.z);
}

/* ─── EL ÚLTIMO TRAMO: DEL NUDO META AL SITIO ────────────────────────────── */

/** Un punto del último tramo y lo que le falta hasta el sitio, en metros «por calles» (de `extra` a 0). */
export interface PuntoDelTramo {
  readonly x: number;
  readonly z: number;
  readonly falta: number;
}

/**
 * EL ÚLTIMO TRAMO de un rumbo (ver la cabecera): del nudo `meta` al `sitio`.
 *   · `extra`: lo que se anda del nudo al sitio por los ejes (`|Δx| + |Δz|`), lo que suma el productor a los
 *     metros del campo cuando mide una cabina (`distanciaPorCalles` hasta su sitio).
 *   · `puntos`: por dónde va después del nudo, el último el sitio; lo que les falta se reparte de `extra` a
 *     0 por lo largo del tramo (con rodeo es un poco más largo que `extra`: los glifos se separan un poco más).
 */
export interface TramoFinal {
  readonly meta: number;
  readonly sitio: PuntoDelSuelo;
  readonly extra: number;
  readonly puntos: readonly PuntoDelTramo[];
}

/** ¿Se anda en recta de `a` a `b` sin tocar ninguna caja, con `RADIO_DEL_TRAMO`? La prueba de losa en el plano, con la caja ensanchada. */
export function seAndaSinCajas(cajas: NocheDeLaCiudad['cajas'], a: PuntoDelSuelo, b: PuntoDelSuelo, radio = RADIO_DEL_TRAMO): boolean {
  const minX = Math.min(a.x, b.x) - radio;
  const maxX = Math.max(a.x, b.x) + radio;
  const minZ = Math.min(a.z, b.z) - radio;
  const maxZ = Math.max(a.z, b.z) + radio;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  for (const c of cajas) {
    if (c.x0 - radio >= maxX || c.x1 + radio <= minX || c.z0 - radio >= maxZ || c.z1 + radio <= minZ) continue;
    let entra = 0;
    let sale = 1;
    let fuera = false;
    for (const [desde, d, lo, hi] of [
      [a.x, dx, c.x0 - radio, c.x1 + radio],
      [a.z, dz, c.z0 - radio, c.z1 + radio],
    ] as const) {
      if (Math.abs(d) < 1e-12) {
        if (desde <= lo || desde >= hi) fuera = true;
        continue;
      }
      let t0 = (lo - desde) / d;
      let t1 = (hi - desde) / d;
      if (t0 > t1) {
        const t = t0;
        t0 = t1;
        t1 = t;
      }
      if (t0 > entra) entra = t0;
      if (t1 < sale) sale = t1;
    }
    if (!fuera && entra < sale) return false;
  }
  return true;
}

function construirElTramo(noche: NocheQueOrienta, meta: number, sitio: PuntoDelSuelo): TramoFinal | null {
  const m = noche.grafo.nudos[meta];
  if (m === undefined) return null;
  const extra = Math.abs(m.x - sitio.x) + Math.abs(m.z - sitio.z);
  if (extra === 0) return null;
  let camino: readonly PuntoDelSuelo[] = [sitio];
  if (!seAndaSinCajas(noche.cajas, m, sitio)) {
    /* El rodeo va a lo largo de la calle (el eje en que menos se separan), primero por el lado del nudo. */
    const aLoLargoEnX = Math.abs(sitio.z - m.z) > Math.abs(sitio.x - m.x);
    const lado = aLoLargoEnX ? m.x - sitio.x : m.z - sitio.z;
    const primero = lado < 0 ? -1 : 1;
    for (const s of [primero, -primero]) {
      const p = aLoLargoEnX ? { x: sitio.x + s * RODEO_DEL_POSTE, z: sitio.z } : { x: sitio.x, z: sitio.z + s * RODEO_DEL_POSTE };
      if (seAndaSinCajas(noche.cajas, m, p) && seAndaSinCajas(noche.cajas, p, sitio)) {
        camino = [p, sitio];
        break;
      }
    }
  }
  let largo = 0;
  let antes: PuntoDelSuelo = m;
  for (const p of camino) {
    largo += Math.hypot(p.x - antes.x, p.z - antes.z);
    antes = p;
  }
  const puntos: PuntoDelTramo[] = [];
  let andado = 0;
  antes = m;
  for (let i = 0; i < camino.length; i++) {
    const p = camino[i] as PuntoDelSuelo;
    andado += Math.hypot(p.x - antes.x, p.z - antes.z);
    antes = p;
    puntos.push(Object.freeze({ x: p.x, z: p.z, falta: i === camino.length - 1 ? 0 : extra * (1 - andado / largo) }));
  }
  return Object.freeze({ meta, sitio: Object.freeze({ x: sitio.x, z: sitio.z }), extra, puntos: Object.freeze(puntos) });
}

/** Los tramos hechos, por noche (su identidad: otra noche puede tener otras cajas) y objetivo. */
const TRAMOS = new WeakMap<object, Map<string, TramoFinal | null>>();

/**
 * EL ÚLTIMO TRAMO DEL RUMBO A UN OBJETIVO en esta noche, o `null` si el objetivo es un nudo (ver
 * `sitioDelObjetivo`) o está en él. Se hace una vez por noche y objetivo, y se guarda.
 */
export function tramoFinal(noche: NocheQueOrienta, objetivo: ObjetivoDelRumbo): TramoFinal | null {
  const llave = objetivo.tipo === 'zona' ? `z${String(objetivo.zona)}` : objetivo.tipo === 'fallo' ? `f${String(objetivo.plaza)}` : `n${String(objetivo.nudo)}`;
  let deLaNoche = TRAMOS.get(noche);
  if (deLaNoche === undefined) {
    deLaNoche = new Map();
    TRAMOS.set(noche, deLaNoche);
  }
  const hecho = deLaNoche.get(llave);
  if (hecho !== undefined) return hecho;
  const sitio = sitioDelObjetivo(noche, objetivo);
  const meta = sitio === null ? -1 : nudoDelObjetivo(noche, objetivo);
  const tramo = sitio === null || meta < 0 ? null : construirElTramo(noche, meta, sitio);
  deLaNoche.set(llave, tramo);
  return tramo;
}

/* ─── LOS CAMPOS, UNO POR META ───────────────────────────────────────────── */

/**
 * LOS CAMPOS GUARDADOS, uno por (grafo, meta), los `tope` últimos usados. Pedir el mismo dos veces da EL
 * MISMO objeto: quien lo guarde en un `RumboTendido` puede compararlo por identidad.
 */
export class CamposPorMeta {
  private readonly guardados: { readonly grafo: GrafoDeLaCiudad; readonly meta: number; readonly campo: CampoDeDistancias }[] = [];
  /** Cuántos Dijkstras se han hecho: para el diagnóstico y para el comprobador (se CUENTAN, no se cronometran). */
  calculados = 0;

  constructor(readonly tope: number = CAMPOS_GUARDADOS) {}

  campo(grafo: GrafoDeLaCiudad, meta: number): CampoDeDistancias {
    for (let i = 0; i < this.guardados.length; i++) {
      const g = this.guardados[i];
      if (g !== undefined && g.grafo === grafo && g.meta === meta) {
        if (i > 0) {
          this.guardados.splice(i, 1);
          this.guardados.unshift(g);
        }
        return g.campo;
      }
    }
    const campo = campoHasta(grafo, meta);
    this.calculados++;
    this.guardados.unshift({ grafo, meta, campo });
    if (this.guardados.length > this.tope) this.guardados.length = this.tope;
    return campo;
  }
}

/** EL RUMBO HACIA UN OBJETIVO en esta noche, con su campo guardado; `null` si la noche no tiene ese objetivo. */
export function rumboHacia(noche: NocheQueOrienta, objetivo: ObjetivoDelRumbo, deQuien: number, campos: CamposPorMeta): RumboTendido | null {
  const nudo = nudoDelObjetivo(noche, objetivo);
  if (nudo < 0) return null;
  return { objetivo, nudo, campo: campos.campo(noche.grafo, nudo), deQuien };
}

/** Los metros por calles de `(x, z)` a la meta del campo, como se enseñan: al metro, o −1. Los de la sala. */
export function metrosPorCalles(grafo: GrafoDeLaCiudad, campo: CampoDeDistancias, x: number, z: number): number {
  return metrosQueSeEnsenan(distanciaPorCalles(grafo, campo, x, z));
}

/**
 * LOS METROS HASTA EL SITIO de un objetivo con último tramo, como se enseñan (sin tramo, o con el de otra
 * meta, `metrosPorCalles`): por calles hasta el nudo meta más lo que hay de él al sitio por los ejes —lo
 * mismo que mide el productor con `distanciaPorCalles` hasta el sitio de la cabina—, y a `CERCA_DEL_SITIO`
 * o menos, lo que haya en recta por los ejes si es menos. En el sitio, 0; en el nudo meta, lo que falta
 * de verdad (4,5-6 m) y no 0.
 */
export function metrosHastaElSitio(grafo: GrafoDeLaCiudad, campo: CampoDeDistancias, tramo: TramoFinal | null, x: number, z: number): number {
  if (tramo === null || tramo.meta !== campo.meta) return metrosPorCalles(grafo, campo, x, z);
  const hastaElNudo = distanciaPorCalles(grafo, campo, x, z);
  if (!(hastaElNudo >= 0)) return -1;
  const enRecta = Math.abs(x - tramo.sitio.x) + Math.abs(z - tramo.sitio.z);
  const porElNudo = hastaElNudo + tramo.extra;
  return metrosQueSeEnsenan(enRecta <= CERCA_DEL_SITIO && enRecta < porElNudo ? enRecta : porElNudo);
}

/** Los metros de `(x, z)` al objetivo de un rumbo tendido en esta noche: hasta su sitio si lo tiene (`metrosHastaElSitio`). */
export function metrosDelRumbo(noche: NocheQueOrienta, rumbo: Pick<RumboTendido, 'objetivo' | 'campo'>, x: number, z: number): number {
  return metrosHastaElSitio(noche.grafo, rumbo.campo, tramoFinal(noche, rumbo.objetivo), x, z);
}

/* ─── EL HILO ────────────────────────────────────────────────────────────── */

/**
 * EL HILO DE RUMBO de este momento. Se reutiliza entre fotogramas sin asignar (`hiloNuevo` una vez).
 *
 *   · `glifos`: `cuantos` glifos de `NUMEROS_POR_GLIFO` números, del más cercano al más lejano.
 *   · `ruta`: la ruta ENTERA hasta la meta, `puntos` pares `[x, z]`, empezando donde empieza el hilo (los
 *     mapas la pintan; si no cabe en `PUNTOS_DE_LA_RUTA`, se corta, y `rutaEntera` lo dice).
 *   · `metros`: los que se enseñan (`metrosPorCalles`), −1 si no se llega.
 *   · `llega`: si la meta cae dentro del hilo.
 */
export interface HiloDeRumbo {
  cuantos: number;
  readonly glifos: Float32Array;
  puntos: number;
  readonly ruta: Float32Array;
  rutaEntera: boolean;
  metros: number;
  llega: boolean;
}

export function hiloNuevo(): HiloDeRumbo {
  return {
    cuantos: 0,
    glifos: new Float32Array(GLIFOS_DEL_HILO_COMO_MUCHO * NUMEROS_POR_GLIFO),
    puntos: 0,
    ruta: new Float32Array(PUNTOS_DE_LA_RUTA * 2),
    rutaEntera: true,
    metros: -1,
    llega: false,
  };
}

/** Los vecinos de cada nudo, en listas planas, guardados por la identidad del grafo (como el índice de `quiebro-ciudad.ts`). */
interface VecinosDelGrafo {
  readonly inicio: Int32Array;
  readonly vecinos: Int32Array;
  readonly largos: Float64Array;
}
const VECINOS = new WeakMap<GrafoDeLaCiudad, VecinosDelGrafo>();

function vecinosDe(grafo: GrafoDeLaCiudad): VecinosDelGrafo {
  const hecho = VECINOS.get(grafo);
  if (hecho !== undefined) return hecho;
  const cuantos = grafo.nudos.length;
  const inicio = new Int32Array(cuantos + 1);
  for (const a of grafo.aristas) {
    inicio[a.a + 1] = (inicio[a.a + 1] as number) + 1;
    inicio[a.b + 1] = (inicio[a.b + 1] as number) + 1;
  }
  for (let n = 0; n < cuantos; n++) inicio[n + 1] = (inicio[n + 1] as number) + (inicio[n] as number);
  const vecinos = new Int32Array(inicio[cuantos] as number);
  const largos = new Float64Array(inicio[cuantos] as number);
  const puesto = inicio.slice(0, cuantos);
  for (const a of grafo.aristas) {
    const p = grafo.nudos[a.a] as { readonly x: number; readonly z: number };
    const q = grafo.nudos[a.b] as { readonly x: number; readonly z: number };
    const largo = Math.abs(q.x - p.x) + Math.abs(q.z - p.z);
    let k = puesto[a.a] as number;
    vecinos[k] = a.b;
    largos[k] = largo;
    puesto[a.a] = k + 1;
    k = puesto[a.b] as number;
    vecinos[k] = a.a;
    largos[k] = largo;
    puesto[a.b] = k + 1;
  }
  const hechos = { inicio, vecinos, largos };
  VECINOS.set(grafo, hechos);
  return hechos;
}

/** El glifo de la Grafía que va en el múltiplo `k` del paso hacia la meta `meta`: fijo en el mundo, distinto de su vecino. */
export function glifoDelSitio(k: number, meta: number): number {
  const h = (Math.imul(k + 1, 0x9e3779b1) ^ Math.imul(meta + 7, 0x85ebca6b)) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) % GLIFOS_DE_LA_GRAFIA;
}

/** El rumbo de ir de `(dx, dz)`: 0 al norte (−z), creciendo hacia el este, como `andar.ts`. */
function rumboDe(dx: number, dz: number): number {
  return Math.atan2(dx, -dz);
}

/*
 * LOS VÉRTICES DE LA RUTA ENTERA: los nudos del camino (a cada uno le falta su campo más el último tramo) y
 * detrás los puntos del último tramo. Funciones sueltas y no cierres: el hilo se tiende a 10 Hz.
 */
function xDelVertice(nudos: GrafoDeLaCiudad['nudos'], camino: readonly number[], tramo: TramoFinal | null, i: number): number {
  return i < camino.length ? (nudos[camino[i] as number] as PuntoDelSuelo).x : ((tramo as TramoFinal).puntos[i - camino.length] as PuntoDelTramo).x;
}
function zDelVertice(nudos: GrafoDeLaCiudad['nudos'], camino: readonly number[], tramo: TramoFinal | null, i: number): number {
  return i < camino.length ? (nudos[camino[i] as number] as PuntoDelSuelo).z : ((tramo as TramoFinal).puntos[i - camino.length] as PuntoDelTramo).z;
}
function faltaDelVertice(campo: CampoDeDistancias, camino: readonly number[], tramo: TramoFinal | null, i: number): number {
  return i < camino.length ? (campo.metros[camino[i] as number] as number) + (tramo === null ? 0 : tramo.extra) : ((tramo as TramoFinal).puntos[i - camino.length] as PuntoDelTramo).falta;
}

/**
 * TIENDE EL HILO desde `(x, z)` por el campo del rumbo, en `hilo` (que se devuelve), y si el objetivo
 * tiene sitio, por su último tramo hasta él (`tramoFinal`; uno de otra meta no se mira). Sin rumbo que
 * medir —grafo vacío, campo de otro grafo, o un sitio desde el que no se llega— lo deja vacío con `metros` −1.
 */
export function tenderElHilo(grafo: GrafoDeLaCiudad, rumbo: Pick<RumboTendido, 'campo'>, x: number, z: number, hilo: HiloDeRumbo, final: TramoFinal | null = null): HiloDeRumbo {
  hilo.cuantos = 0;
  hilo.puntos = 0;
  hilo.rutaEntera = true;
  hilo.llega = false;
  hilo.metros = -1;
  const campo = rumbo.campo;
  const nudos = grafo.nudos;
  if (nudos.length === 0 || campo.metros.length !== nudos.length || !Number.isFinite(x) || !Number.isFinite(z)) return hilo;
  hilo.metros = metrosHastaElSitio(grafo, campo, final, x, z);
  const n0 = nudoMasCercano(grafo, x, z);
  if (n0 < 0 || (campo.metros[n0] as number) < 0) return hilo;
  const camino = caminoPorElCampo(grafo, campo, n0, Number.POSITIVE_INFINITY);
  /* El último tramo sale de la meta: sólo si es el de esta meta y el camino llega a ella. */
  const tramo = final !== null && final.meta === campo.meta && camino[camino.length - 1] === campo.meta ? final : null;
  const extra = tramo === null ? 0 : tramo.extra;
  const vertices = camino.length + (tramo === null ? 0 : tramo.puntos.length);

  /*
   * Dónde empieza: en la proyección del propio sobre el tramo de la ruta en que está. Si ya ha pasado el
   * nudo más cercano, sobre el tramo que sale de él (el primero del camino); si aún no ha llegado, sobre el
   * que LLEGA a él desde un vecino más lejos de la meta. Así la distancia del principio a la meta cambia
   * sin saltos mientras se anda por la ruta —un tramo de 24 m hasta el centro de una plaza ya no la hace
   * saltar 12 m cuando el más cercano pasa a ser el otro extremo—, y lo que asoma al fondo del hilo es un
   * glifo cada paso y no diez de golpe.
   */
  const a = nudos[n0] as { readonly x: number; readonly z: number };
  let sx = a.x;
  let sz = a.z;
  let ds = (campo.metros[n0] as number) + extra;
  /* El primer vértice por delante del principio: el 1 (el nudo más cercano ya quedó atrás o es el principio). */
  let siguiente = 1;
  let proyectado = false;
  if (camino.length >= 2) {
    const b = nudos[camino[1] as number] as { readonly x: number; readonly z: number };
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const largo = Math.abs(ex) + Math.abs(ez);
    if (largo > 0) {
      const t = ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez);
      if (t > 0) {
        const tt = t < 1 ? t : 1;
        sx = a.x + ex * tt;
        sz = a.z + ez * tt;
        ds -= largo * tt;
        proyectado = true;
      }
    }
  }
  if (!proyectado) {
    const v = vecinosDe(grafo);
    let mejorLado = Number.POSITIVE_INFINITY;
    for (let k = v.inicio[n0] as number; k < (v.inicio[n0 + 1] as number); k++) {
      const u = v.vecinos[k] as number;
      const du = campo.metros[u] as number;
      const largo = v.largos[k] as number;
      if (du < 0 || largo <= 0 || du !== (campo.metros[n0] as number) + largo) continue;
      const p = nudos[u] as { readonly x: number; readonly z: number };
      const ex = a.x - p.x;
      const ez = a.z - p.z;
      const t = ((x - p.x) * ex + (z - p.z) * ez) / (ex * ex + ez * ez);
      if (!(t > 0 && t < 1)) continue;
      const lado = Math.abs((x - p.x) * ez - (z - p.z) * ex) / largo;
      if (lado < mejorLado) {
        mejorLado = lado;
        sx = p.x + ex * t;
        sz = p.z + ez * t;
        ds = du - largo * t + extra;
        siguiente = 0;
      }
    }
  }
  /*
   * Cerca del sitio, el principio puede estar en el último tramo: quien ya ha bajado de la calzada a la
   * acera no tiene que ver el hilo volver al nudo. Gana el punto del tramo si queda más cerca del propio que
   * el de la ruta.
   */
  if (tramo !== null && Math.abs(x - tramo.sitio.x) + Math.abs(z - tramo.sitio.z) <= CERCA_DEL_SITIO) {
    let mejor = Math.hypot(x - sx, z - sz);
    const m = nudos[campo.meta] as PuntoDelSuelo;
    let px = m.x;
    let pz = m.z;
    let pf = extra;
    for (let j = 0; j < tramo.puntos.length; j++) {
      const q = tramo.puntos[j] as PuntoDelTramo;
      const ex = q.x - px;
      const ez = q.z - pz;
      const l2 = ex * ex + ez * ez;
      const t0 = l2 > 0 ? ((x - px) * ex + (z - pz) * ez) / l2 : 0;
      const t = t0 < 0 ? 0 : t0 > 1 ? 1 : t0;
      const cx = px + ex * t;
      const cz = pz + ez * t;
      const d = Math.hypot(x - cx, z - cz);
      if (d < mejor) {
        mejor = d;
        sx = cx;
        sz = cz;
        ds = pf + (q.falta - pf) * t;
        siguiente = camino.length + j;
      }
      px = q.x;
      pz = q.z;
      pf = q.falta;
    }
  }

  /* La ruta entera, para los mapas. */
  const ponerPunto = (px: number, pz: number): void => {
    if (hilo.puntos >= PUNTOS_DE_LA_RUTA) {
      hilo.rutaEntera = false;
      return;
    }
    hilo.ruta[hilo.puntos * 2] = px;
    hilo.ruta[hilo.puntos * 2 + 1] = pz;
    hilo.puntos++;
  };
  ponerPunto(sx, sz);
  for (let i = siguiente; i < vertices; i++) ponerPunto(xDelVertice(nudos, camino, tramo, i), zDelVertice(nudos, camino, tramo, i));

  /* Los glifos: donde la distancia a la meta es k · paso, entre INICIO y METROS_DEL_HILO por delante. */
  const kMax = Math.floor((ds - INICIO_DEL_HILO) / PASO_DEL_GLIFO);
  const kMin = Math.max(0, Math.ceil((ds - METROS_DEL_HILO) / PASO_DEL_GLIFO));
  hilo.llega = ds - METROS_DEL_HILO <= 0;
  if (kMax < kMin) return hilo;
  /*
   * Se recorre la ruta una sola vez: `(cx, cz)` es el principio del tramo en curso y `dc` su distancia a la
   * meta. Los nudos llevan la distancia EXACTA del campo (sumas de cuartos, más el `extra` del último tramo,
   * también en cuartos) y el sitio lleva 0: así el último glifo cae justo en la meta, sin que un error de
   * redondeo de la proyección lo deje fuera.
   */
  let cx = sx;
  let cz = sz;
  let dc = ds;
  let rumboDelTramo = 0;
  for (let k = kMax; k >= kMin && hilo.cuantos < GLIFOS_DEL_HILO_COMO_MUCHO; k--) {
    const dk = k * PASO_DEL_GLIFO;
    /* Avanza hasta el tramo que contiene dk: la distancia baja al andar hacia la meta. */
    while (siguiente < vertices) {
      const falta = faltaDelVertice(campo, camino, tramo, siguiente);
      if (falta <= dk) break;
      const x1 = xDelVertice(nudos, camino, tramo, siguiente);
      const z1 = zDelVertice(nudos, camino, tramo, siguiente);
      if (x1 !== cx || z1 !== cz) rumboDelTramo = rumboDe(x1 - cx, z1 - cz);
      cx = x1;
      cz = z1;
      dc = falta;
      siguiente++;
    }
    let vx = cx;
    let vz = cz;
    let dv = dc;
    if (siguiente < vertices) {
      vx = xDelVertice(nudos, camino, tramo, siguiente);
      vz = zDelVertice(nudos, camino, tramo, siguiente);
      dv = faltaDelVertice(campo, camino, tramo, siguiente);
      if (vx !== cx || vz !== cz) rumboDelTramo = rumboDe(vx - cx, vz - cz);
    } else if (dk !== dc) {
      /* Al final de la ruta sólo cabe un glifo justo en la meta. */
      break;
    }
    const baja = dc - dv;
    const f = baja > 0 ? (dc - dk) / baja : 0;
    const delante = ds - dk;
    const brillo = Math.max(0, Math.min(1, (delante - INICIO_DEL_HILO + PASO_DEL_GLIFO) / 3, (METROS_DEL_HILO - delante) / FUNDIDO_DEL_HILO + 0.08));
    const o = hilo.cuantos * NUMEROS_POR_GLIFO;
    hilo.glifos[o] = cx + (vx - cx) * f;
    hilo.glifos[o + 1] = cz + (vz - cz) * f;
    hilo.glifos[o + 2] = rumboDelTramo;
    hilo.glifos[o + 3] = glifoDelSitio(k, campo.meta);
    hilo.glifos[o + 4] = brillo;
    hilo.cuantos++;
  }
  return hilo;
}
