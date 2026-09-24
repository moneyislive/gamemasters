/**
 * LA CIUDAD SINTÉTICA: una ciudad de 540 m con la FORMA exacta de los contratos de la columna
 * (`CiudadDeLaMesa` y `NocheDeLaCiudad` de `shared/arcade/juegos/quiebro-ciudad.ts`), para construir y
 * comprobar el pintor de la ciudad abierta mientras el frente Traza escribe la de verdad.
 *
 * ═══ QUÉ ES Y QUÉ NO ES ═══
 *
 * NO es la ciudad del juego ni la imita en lo que decide la partida: no lleva zonas, ni sitios de nacer,
 * ni el grafo de verdad, ni la red de aceras (van vacías o mínimas, y nada del pintor las lee). Es un
 * banco de pruebas del PINTOR: lo que el pintor lee (huecos, edificios con sus tramos y fachadas, rótulos,
 * cajas con su tipo y su orden, calles, tramos, avenidas, plazas, cabinas, refugios, cortes, el tren, el
 * tiempo y la hora) sale con las medidas y las reglas del §2 de `docs/quiebro/CIUDAD-ABIERTA.md`: rejilla de
 * 48 m, 11 × 11 huecos, el Elevado y el Bulevar de 24 m comiéndose 6 m de sus manzanas, 6 plazas, el cerco
 * de ±270 a ±272 cortado en las tres salidas de las avenidas, 20 cabinas y 10 refugios, 4-6 cortes de obra
 * por noche y las 8 simetrías con las funciones de la columna. `ciudadParaPintar` (en `abierta.ts`) la usa
 * SÓLO mientras `ciudadDeLaMesa` lance `CiudadSinEscribir`, y lo dice en su `origen`.
 *
 * ═══ DE DÓNDE SALEN LAS MANZANAS: DEL GENERADOR DE VERDAD ═══
 *
 * El barrio de hoy (`barrioDeLaNoche`) es un trozo de 3 × 3 de la MISMA rejilla de 48 m: sus celdas
 * (manzana y medias calles alrededor) caen en las mismas rayas que las de la ciudad. Así que cada hueco
 * de la ciudad sintética es una celda de un barrio de verdad, trasladada: sus edificios con sus tramos,
 * fachadas, soportales y pilares, sus rótulos, sus farolas, sus coches y sus quioscos de prensa. Las
 * plazas son la glorieta de un barrio (sin los pilares del tren, que ahora va por el Elevado), y la
 * Porticada y el Patio llevan además una estatua y contenedores, carretillas y un muelle, para que el
 * pintor tenga que pintar las cajas nuevas del contrato. Las manzanas que dan a una avenida pierden 6 m por
 * ese lado: los edificios se recortan, y lo que queda en la avenida se va.
 *
 * Todo es puro y determinista: la misma (traza, código, noche) da la misma ciudad, en cualquier aparato.
 */
import type { Barrio, Cara, CajaDelBarrio, EdificioDelBarrio, FachadaDelEdificio, Punto, Rectangulo, RotuloDelBarrio, SitioDelBarrio, Tiempo } from '../../../../shared/arcade/juegos/quiebro-barrio';
import { barrioDeLaNoche } from '../../../../shared/arcade/juegos/quiebro-barrio';
import type {
  AvenidaDeLaCiudad,
  CabinaDeLaCiudad,
  CajaDeLaCiudad,
  CalleDeLaCiudad,
  CeldaDeLaCiudad,
  CiudadDeLaMesa,
  ClaseDeCalle,
  CorteDeObra,
  EdificioDeLaCiudad,
  HuecoDeLaCiudad,
  IdDeDistrito,
  IdDePlantilla,
  LadoDelTramo,
  NocheDeLaCiudad,
  PlazaDeLaCiudad,
  RefugioDeLaCiudad,
  TipoDeCajaDeLaCiudad,
  TramoDeLaCiudad,
  TrenDeLaCiudad,
} from '../../../../shared/arcade/juegos/quiebro-ciudad';
import {
  ACERA_DE_AVENIDA,
  ALTO_DEL_VIADUCTO,
  ANCHO_DE_AVENIDA,
  ANCHO_DE_CALLE,
  BORDE_DE_LA_CIUDAD,
  CELDAS,
  CERCO_DE_LA_CIUDAD,
  EJES_DE_LA_CIUDAD,
  EJE_DEL_BULEVAR,
  EJE_DEL_ELEVADO,
  HUECOS,
  HUECO_MAXIMO,
  METROS_DEL_TREN_POR_TIC,
  PASO_DE_LA_REJILLA,
  SALIDA_DE_GLIFOS,
  TICS_ENTRE_TRENES,
  caraSimetrica,
  celdaDe,
  celdaDelIndice,
  distritoDelHueco,
  ejeSimetrico,
  huecoAntesDeLaSimetria,
  huecoDelIndice,
  indiceDeCelda,
  indiceDeHueco,
  partesDeLaTraza,
  puntoSimetrico,
  rectanguloDeLaCelda,
  rectanguloSimetrico,
  rumboSimetrico,
} from '../../../../shared/arcade/juegos/quiebro-ciudad';
import { hashDeTexto, mezclar } from './azar';

/* ─── La traza dibujada (simetría 0) ─────────────────────────────────────── */

interface PlazaDibujada {
  readonly i: number;
  readonly j: number;
  readonly plantilla: IdDePlantilla;
}

/** Las seis plazas: la 1 es la Glorieta del Relojero, en el centro. Ninguna junto a una avenida (§2.3). */
const PLAZAS_DIBUJADAS: readonly PlazaDibujada[] = [
  { i: 0, j: 0, plantilla: 'glorieta' },
  { i: -2, j: 2, plantilla: 'porticada' },
  { i: 0, j: -4, plantilla: 'patio' },
  { i: -4, j: -1, plantilla: 'porticada' },
  { i: 4, j: 1, plantilla: 'glorieta' },
  { i: -1, j: 4, plantilla: 'glorieta' },
];

/** Cuántos barrios de verdad se prestan manzanas por mesa: las 121 salen de estos. */
const BARRIOS_DEL_POZO = 12;

/** Las celdas de barrio con manzana edificada (la del centro es la glorieta). */
const CELDAS_DEL_BARRIO: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/** Los tipos de caja del barrio que NO se prestan: el cerco y las vallas del barrio, y su tren. */
const NO_SE_PRESTAN = new Set<string>(['valla', 'fachada-exterior', 'pilar-del-tren', 'cabina']);

/** Los barrios del pozo, guardados: son muchos pedidos iguales (8 simetrías × noches). */
const POZO = new Map<string, Barrio>();
function barrioDelPozo(codigo: string, k: number, noche: number): Barrio {
  const clave = `${codigo}#${String(k)}#${String(noche)}`;
  let b = POZO.get(clave);
  if (b === undefined) {
    b = barrioDeLaNoche(`${codigo}S${String(k)}`, noche);
    if (POZO.size > 96) {
      const primera = POZO.keys().next();
      if (primera.done !== true) POZO.delete(primera.value);
    }
    POZO.set(clave, b);
  }
  return b;
}

/* ─── Transformaciones: de la celda del barrio al hueco dibujado, y del dibujo a la traza ─── */

/** Lleva un punto del barrio (celda a, b) al hueco dibujado (id, jd) y de ahí a la traza con la simetría s. */
interface Llevar {
  readonly s: number;
  readonly dx: number;
  readonly dz: number;
}

function llevarPunto(l: Llevar, x: number, z: number): Punto {
  return puntoSimetrico(l.s, x + l.dx, z + l.dz);
}

function llevarRect(l: Llevar, r: Rectangulo): Rectangulo {
  return rectanguloSimetrico(l.s, { x0: r.x0 + l.dx, z0: r.z0 + l.dz, x1: r.x1 + l.dx, z1: r.z1 + l.dz });
}

function llevarFachada(l: Llevar, f: FachadaDelEdificio): FachadaDelEdificio {
  const horizontal = f.cara === 'norte' || f.cara === 'sur';
  const a = horizontal ? llevarPunto(l, f.desde, f.linea) : llevarPunto(l, f.linea, f.desde);
  const b = horizontal ? llevarPunto(l, f.hasta, f.linea) : llevarPunto(l, f.linea, f.hasta);
  const cara = caraSimetrica(l.s, f.cara);
  const enZ = cara === 'norte' || cara === 'sur';
  return {
    cara,
    linea: enZ ? a.z : a.x,
    desde: enZ ? Math.min(a.x, b.x) : Math.min(a.z, b.z),
    hasta: enZ ? Math.max(a.x, b.x) : Math.max(a.z, b.z),
    bajo: f.bajo,
  };
}

/* ─── El recorte de las manzanas que dan a una avenida ────────────────────── */

/** Las caras de un hueco dibujado que dan a una avenida (§2.1: el Elevado en z = −120, el Bulevar en x = 120 al sur de él). */
function carasQueDanAAvenida(i: number, j: number): Cara[] {
  const caras: Cara[] = [];
  if (j === -3) caras.push('sur');
  if (j === -2) caras.push('norte');
  if (j >= -2 && i === 2) caras.push('este');
  if (j >= -2 && i === 3) caras.push('oeste');
  return caras;
}

const RECORTE_DE_AVENIDA = (ANCHO_DE_AVENIDA - ANCHO_DE_CALLE) / 2;

/** El solar dibujado de un hueco, ya recortado por sus avenidas. */
function solarDibujado(i: number, j: number): Rectangulo {
  const r = { x0: PASO_DE_LA_REJILLA * i - 18, z0: PASO_DE_LA_REJILLA * j - 18, x1: PASO_DE_LA_REJILLA * i + 18, z1: PASO_DE_LA_REJILLA * j + 18 };
  return recortar(r, carasQueDanAAvenida(i, j), RECORTE_DE_AVENIDA);
}

function recortar(r: Rectangulo, caras: readonly Cara[], m: number): Rectangulo {
  return {
    x0: r.x0 + (caras.includes('oeste') ? m : 0),
    x1: r.x1 - (caras.includes('este') ? m : 0),
    z0: r.z0 + (caras.includes('norte') ? m : 0),
    z1: r.z1 - (caras.includes('sur') ? m : 0),
  };
}

/** ¿Cae el rectángulo (dibujado) sobre una avenida? Lo que cae se quita. */
function sobreUnaAvenida(r: Rectangulo): boolean {
  const cz = (r.z0 + r.z1) / 2;
  const cx = (r.x0 + r.x1) / 2;
  const medio = ANCHO_DE_AVENIDA / 2;
  if (Math.abs(cz - EJE_DEL_ELEVADO) < medio) return true;
  return Math.abs(cx - EJE_DEL_BULEVAR) < medio && cz > EJE_DEL_ELEVADO;
}

/* ─── Lo que se va escribiendo ────────────────────────────────────────────── */

interface EdificioEnObra {
  readonly hueco: number;
  readonly distrito: IdDeDistrito;
  readonly original: EdificioDelBarrio;
  readonly huella: Rectangulo;
  readonly fachadas: readonly FachadaDelEdificio[];
  readonly soportales: readonly Cara[];
  readonly caja: Rectangulo;
  readonly pilares: readonly Rectangulo[];
  readonly rotulos: readonly RotuloDelBarrio[];
}

interface CajaEnObra {
  readonly r: Rectangulo;
  readonly tipo: TipoDeCajaDeLaCiudad;
  readonly alto: number;
  readonly mira: number;
  readonly edificio: number | null;
  readonly despejable: boolean;
  readonly hueco: number | null;
  readonly plaza: number;
}

function caja(o: CajaEnObra): CajaDeLaCiudad {
  return { ...o.r, tipo: o.tipo, clase: 'alta', alto: o.alto, mira: o.mira, edificio: o.edificio, despejable: o.despejable, hueco: o.hueco, plaza: o.plaza };
}

/**
 * Un edificio del barrio en el hueco dibujado, recortado por sus avenidas. `null` si el recorte lo deja
 * en menos de 8 m, o si su soportal da a la avenida (se quedaría sin pilares).
 */
function edificioRecortado(
  e: EdificioDelBarrio,
  barrio: Barrio,
  dx: number,
  dz: number,
  caras: readonly Cara[],
): { huella: Rectangulo; fachadas: FachadaDelEdificio[]; caja: Rectangulo; pilares: Rectangulo[]; tocadas: Cara[] } | null {
  const mover = (r: Rectangulo): Rectangulo => ({ x0: r.x0 + dx, z0: r.z0 + dz, x1: r.x1 + dx, z1: r.z1 + dz });
  const huella0 = mover(e.huella);
  const solar = { x0: huella0.x0, z0: huella0.z0, x1: huella0.x1, z1: huella0.z1 };
  let huella = solar;
  const tocadas: Cara[] = [];
  for (const c of caras) {
    /* ¿Da el edificio a ese lado de su solar? El norte de un solar dibujado cae en 48j − 18 (≡ 30 módulo 48). */
    const toca =
      (c === 'norte' && Math.abs(((huella.z0 % 48) + 48) % 48 - 30) < 0.01) ||
      (c === 'sur' && Math.abs(((huella.z1 % 48) + 48) % 48 - 18) < 0.01) ||
      (c === 'oeste' && Math.abs(((huella.x0 % 48) + 48) % 48 - 30) < 0.01) ||
      (c === 'este' && Math.abs(((huella.x1 % 48) + 48) % 48 - 18) < 0.01);
    if (!toca) continue;
    tocadas.push(c);
    huella = recortar(huella, [c], RECORTE_DE_AVENIDA);
  }
  if (huella.x1 - huella.x0 < 8 || huella.z1 - huella.z0 < 8) return null;
  if (e.soportal !== null && tocadas.includes(e.soportal)) return null;
  const cajaOriginal = mover(barrio.cajas[e.caja] as Rectangulo);
  const caja = {
    x0: Math.max(cajaOriginal.x0, huella.x0),
    z0: Math.max(cajaOriginal.z0, huella.z0),
    x1: Math.min(cajaOriginal.x1, huella.x1),
    z1: Math.min(cajaOriginal.z1, huella.z1),
  };
  const fachadas: FachadaDelEdificio[] = [];
  for (const f0 of e.fachadas) {
    const f = { ...f0, linea: f0.cara === 'norte' || f0.cara === 'sur' ? f0.linea + dz : f0.linea + dx, desde: f0.cara === 'norte' || f0.cara === 'sur' ? f0.desde + dx : f0.desde + dz, hasta: f0.cara === 'norte' || f0.cara === 'sur' ? f0.hasta + dx : f0.hasta + dz };
    if (f.cara === 'norte') fachadas.push({ ...f, linea: huella.z0 });
    else if (f.cara === 'sur') fachadas.push({ ...f, linea: huella.z1 });
    else if (f.cara === 'oeste') fachadas.push({ ...f, linea: huella.x0 });
    else fachadas.push({ ...f, linea: huella.x1 });
  }
  const recortadas = fachadas.map((f) => {
    const enX = f.cara === 'norte' || f.cara === 'sur';
    return { ...f, desde: Math.max(f.desde, enX ? huella.x0 : huella.z0), hasta: Math.min(f.hasta, enX ? huella.x1 : huella.z1) };
  });
  const pilares = e.pilares.map((p) => mover(barrio.cajas[p] as Rectangulo));
  return { huella, fachadas: recortadas.filter((f) => f.hasta - f.desde > 1), caja, pilares, tocadas };
}

/** Un rótulo del barrio en el hueco dibujado: sigue a su fachada si el recorte la movió, y se va si ya no cae en ella. */
function rotuloRecortado(r: RotuloDelBarrio, dx: number, dz: number, huella: Rectangulo, tocadas: readonly Cara[]): RotuloDelBarrio | null {
  let x = r.x + dx;
  let z = r.z + dz;
  if (tocadas.includes(r.cara)) {
    if (r.cara === 'norte') z = huella.z0;
    else if (r.cara === 'sur') z = huella.z1;
    else if (r.cara === 'oeste') x = huella.x0;
    else x = huella.x1;
  }
  const enX = r.cara === 'norte' || r.cara === 'sur';
  const a = enX ? x : z;
  const [a0, a1] = enX ? [huella.x0, huella.x1] : [huella.z0, huella.z1];
  if (a - r.ancho / 2 < a0 - 0.01 || a + r.ancho / 2 > a1 + 0.01) return null;
  return { ...r, x, z };
}

/* ─── LA CIUDAD DE LA MESA ────────────────────────────────────────────────── */

const CIUDADES = new Map<string, CiudadDeLaMesa>();

/**
 * LA CIUDAD SINTÉTICA DE UNA MESA: la traza `traza` (0-31) con su simetría y las manzanas prestadas del
 * `codigo`. Guardada (las 16 últimas).
 */
export function ciudadSintetica(traza: number, codigo: string): CiudadDeLaMesa {
  const clave = `${String(traza)}#${codigo.toUpperCase()}`;
  const hecha = CIUDADES.get(clave);
  if (hecha !== undefined) return hecha;
  const ciudad = escribirLaCiudad(traza, codigo.toUpperCase());
  if (CIUDADES.size >= 16) {
    const primera = CIUDADES.keys().next();
    if (primera.done !== true) CIUDADES.delete(primera.value);
  }
  CIUDADES.set(clave, ciudad);
  return ciudad;
}

/** Qué celda del barrio y de qué barrio del pozo lleva el hueco dibujado. */
function prestamoDe(codigo: string, dibujo: number, i: number, j: number): { k: number; a: number; b: number } {
  const h = mezclar(hashDeTexto(codigo), dibujo, i + 64, j + 64, 0x5171);
  const celda = CELDAS_DEL_BARRIO[h % CELDAS_DEL_BARRIO.length] as readonly [number, number];
  return { k: (h >>> 8) % BARRIOS_DEL_POZO, a: celda[0], b: celda[1] };
}

function escribirLaCiudad(traza: number, codigo: string): CiudadDeLaMesa {
  const { dibujo, simetria: s } = partesDeLaTraza(traza);
  const plazaDibujada = (i: number, j: number): number => PLAZAS_DIBUJADAS.findIndex((p) => p.i === i && p.j === j) + 1;

  /* ─── Los huecos, en su orden (el de la traza, no el del dibujo) ─── */
  const edificiosEnObra: EdificioEnObra[] = [];
  const cajasDeManzana: CajaEnObra[][] = [];
  const cajasDePlaza: CajaEnObra[][] = PLAZAS_DIBUJADAS.map(() => []);
  const prestadasDeCabina: { poste: Punto; mira: number; r: Rectangulo; distrito: IdDeDistrito }[] = [];
  const huecos: HuecoDeLaCiudad[] = [];
  const plazas: PlazaDeLaCiudad[] = new Array<PlazaDeLaCiudad>(PLAZAS_DIBUJADAS.length);

  for (let indice = 0; indice < HUECOS; indice++) {
    const { i, j } = huecoDelIndice(indice);
    const d = huecoAntesDeLaSimetria(s, i, j);
    const distrito = distritoDelHueco(s, i, j);
    const plaza = plazaDibujada(d.i, d.j);
    const lista: CajaEnObra[] = [];
    cajasDeManzana.push(lista);
    const solar = rectanguloSimetrico(s, solarDibujado(d.i, d.j));
    const prestamo = prestamoDe(codigo, dibujo, d.i, d.j);
    const barrio = barrioDelPozo(codigo, prestamo.k, 1);
    const a = plaza > 0 ? 0 : prestamo.a;
    const b = plaza > 0 ? 0 : prestamo.b;
    const dx = PASO_DE_LA_REJILLA * (d.i - a);
    const dz = PASO_DE_LA_REJILLA * (d.j - b);
    const l: Llevar = { s, dx, dz };
    const enLaCelda = (r: Rectangulo): boolean => {
      const c = celdaDe((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2);
      return c !== null && c.i === a && c.j === b;
    };
    const indicesDeEdificio: number[] = [];
    if (plaza === 0) {
      const caras = carasQueDanAAvenida(d.i, d.j);
      const manzana = barrio.manzanas.find((m) => Math.abs((m.solar.x0 + m.solar.x1) / 2 - 48 * a) < 1 && Math.abs((m.solar.z0 + m.solar.z1) / 2 - 48 * b) < 1);
      for (const ei of manzana?.edificios ?? []) {
        const e = barrio.edificios[ei] as EdificioDelBarrio;
        const r = edificioRecortado(e, barrio, dx, dz, caras);
        if (r === null) continue;
        const rotulos = barrio.adorno.rotulos
          .filter((ro) => ro.edificio === ei)
          .map((ro) => rotuloRecortado(ro, dx, dz, r.huella, r.tocadas))
          .filter((ro): ro is RotuloDelBarrio => ro !== null);
        indicesDeEdificio.push(edificiosEnObra.length);
        edificiosEnObra.push({
          hueco: indice,
          distrito,
          original: e,
          huella: rectanguloSimetrico(s, r.huella),
          fachadas: r.fachadas.map((f) => llevarFachada({ s, dx: 0, dz: 0 }, f)),
          soportales: e.soportal === null ? [] : [caraSimetrica(s, e.soportal)],
          caja: rectanguloSimetrico(s, r.caja),
          pilares: r.pilares.map((p) => rectanguloSimetrico(s, p)),
          rotulos: rotulos.map((ro) => {
            const p = puntoSimetrico(s, ro.x, ro.z);
            return { ...ro, x: p.x, z: p.z, cara: caraSimetrica(s, ro.cara) };
          }),
        });
      }
      /* Las farolas de sus aceras (las de pie: el resto de la calle es de la noche). */
      for (const c of barrio.cajas) {
        if (c.tipo !== 'farola' || !enLaCelda(c)) continue;
        const r = { x0: c.x0 + dx, z0: c.z0 + dz, x1: c.x1 + dx, z1: c.z1 + dz };
        if (sobreUnaAvenida(r)) continue;
        lista.push({ r: rectanguloSimetrico(s, r), tipo: 'farola', alto: c.alto, mira: rumboSimetrico(s, c.mira), edificio: null, despejable: false, hueco: indice, plaza: 0 });
      }
    } else {
      /* La plaza: lo fijo de la glorieta (fuente y farolas) y lo que trae su plantilla. */
      for (const c of barrio.cajas) {
        if (NO_SE_PRESTAN.has(c.tipo) || !enLaCelda(c) || c.tipo === 'quiosco' || c.tipo === 'banco' || c.tipo === 'coche' || c.tipo === 'quiosco-de-prensa') continue;
        if (c.tipo === 'edificio' || c.tipo === 'pilar-de-soportal') continue;
        const pl = PLAZAS_DIBUJADAS[plaza - 1] as PlazaDibujada;
        if (pl.plantilla === 'patio' && c.tipo === 'fuente') continue;
        (cajasDePlaza[plaza - 1] as CajaEnObra[]).push({
          r: llevarRect(l, c),
          tipo: c.tipo,
          alto: c.alto,
          mira: rumboSimetrico(s, c.mira),
          edificio: null,
          despejable: c.despejable,
          hueco: indice,
          plaza,
        });
      }
      const pl = PLAZAS_DIBUJADAS[plaza - 1] as PlazaDibujada;
      const cx = 48 * d.i;
      const cz = 48 * d.j;
      const fija = (x0: number, z0: number, x1: number, z1: number, tipo: TipoDeCajaDeLaCiudad, alto: number, mira = 0): void => {
        (cajasDePlaza[plaza - 1] as CajaEnObra[]).push({ r: rectanguloSimetrico(s, { x0: cx + x0, z0: cz + z0, x1: cx + x1, z1: cz + z1 }), tipo, alto, mira: rumboSimetrico(s, mira), edificio: null, despejable: false, hueco: indice, plaza });
      };
      if (pl.plantilla === 'porticada') fija(-8, -8, -6, -6, 'estatua', 4.5);
      if (pl.plantilla === 'patio') {
        fija(-12, -12, -6, -9.5, 'contenedor', 2.6, 64);
        fija(-12, -6, -6, -3.5, 'contenedor', 2.6, 64);
        fija(6, 8, 12, 10.5, 'contenedor', 2.6, 64);
        fija(-2, 4, -0.5, 6.5, 'carretilla', 2.2, 0);
        fija(8, -14, 16, -10, 'muelle', 1.2, 128);
      }
      const centro = puntoSimetrico(s, cx, cz);
      const limite = rectanguloSimetrico(s, { x0: cx - 30, z0: cz - 30, x1: cx + 30, z1: cz + 30 });
      const nace: SitioDelBarrio[] = [];
      for (let k = 0; k < 6; k++) {
        const p = puntoSimetrico(s, cx - 7.5 + 3 * k, cz + 12);
        nace.push({ x: p.x, z: p.z, rumbo: rumboSimetrico(s, 0) });
      }
      plazas[plaza - 1] = {
        numero: plaza,
        hueco: indice,
        distrito,
        plantilla: pl.plantilla,
        nombre: plaza - 1,
        centro,
        limite,
        nudo: 0,
        objeto: centro,
        nace,
      };
    }
    /* Las cabinas prestadas de la celda: candidatas a cabina y a refugio. */
    for (const cab of [...barrio.cabinas, barrio.refugio]) {
      const c = barrio.cajas[cab.caja] as CajaDelBarrio;
      if (!enLaCelda(c)) continue;
      const r = { x0: c.x0 + dx, z0: c.z0 + dz, x1: c.x1 + dx, z1: c.z1 + dz };
      if (sobreUnaAvenida(r)) continue;
      prestadasDeCabina.push({ poste: llevarPunto(l, cab.poste.x, cab.poste.z), mira: rumboSimetrico(s, cab.mira), r: rectanguloSimetrico(s, r), distrito });
    }
    huecos.push({
      indice,
      i,
      j,
      distrito,
      solar,
      uso: plaza > 0 ? 'plaza' : 'edificio',
      callejon: null,
      plaza,
      soportales: [],
      edificios: indicesDeEdificio,
    });
  }

  /* ─── Las cajas de la mesa, en el orden del contrato ─── */
  const cajas: CajaDeLaCiudad[] = [];
  /* 1 · El cerco: un tramo por celda del anillo, y la salida de cada avenida aparte. */
  const salidas = salidasDeLasAvenidas(s);
  for (const r of trozosDelCerco(salidas)) cajas.push(caja({ r, tipo: 'fachada-exterior', alto: 12, mira: 0, edificio: null, despejable: false, hueco: null, plaza: 0 }));
  /* 2 · Las manzanas: edificio, pilares y farolas, hueco a hueco. */
  const edificios: EdificioDeLaCiudad[] = [];
  const rotulos: RotuloDelBarrio[] = [];
  for (let h = 0; h < HUECOS; h++) {
    for (const e of edificiosEnObra) {
      if (e.hueco !== h) continue;
      const indiceDelEdificio = edificios.length;
      const cajaDelEdificio = cajas.length;
      cajas.push(caja({ r: e.caja, tipo: 'edificio', alto: e.original.alto, mira: 0, edificio: indiceDelEdificio, despejable: false, hueco: h, plaza: 0 }));
      const pilares: number[] = [];
      for (const p of e.pilares) {
        pilares.push(cajas.length);
        cajas.push(caja({ r: p, tipo: 'pilar-de-soportal', alto: e.original.tramos[0]?.hasta ?? 4.5, mira: 0, edificio: indiceDelEdificio, despejable: false, hueco: h, plaza: 0 }));
      }
      edificios.push({
        indice: indiceDelEdificio,
        hueco: h,
        distrito: e.distrito,
        huella: e.huella,
        tramos: e.original.tramos,
        alto: e.original.alto,
        estilo: e.original.estilo,
        tono: e.original.tono,
        vano: e.original.vano,
        balcones: e.original.balcones,
        semilla: e.original.semilla,
        fachadas: e.fachadas,
        soportales: e.soportales,
        caja: cajaDelEdificio,
        pilares,
      });
      for (const r of e.rotulos) rotulos.push({ ...r, edificio: indiceDelEdificio });
    }
    for (const c of cajasDeManzana[h] as CajaEnObra[]) cajas.push(caja(c));
  }
  /* 3 · Las avenidas: los pilares del viaducto, y los troncos y bancos del Bulevar. */
  const avenidas: AvenidaDeLaCiudad[] = [];
  {
    const elevado: number[] = [];
    for (let x = -264; x <= 264; x += 12) {
      if (Math.abs(((x - 24) % 48 + 48) % 48) < 7 || Math.abs(((x - 24) % 48 + 48) % 48) > 41) continue;
      elevado.push(cajas.length);
      cajas.push(caja({ r: rectanguloSimetrico(s, { x0: x - 0.5, z0: EJE_DEL_ELEVADO - 0.5, x1: x + 0.5, z1: EJE_DEL_ELEVADO + 0.5 }), tipo: 'pilar-del-tren', alto: ALTO_DEL_VIADUCTO, mira: 0, edificio: null, despejable: false, hueco: null, plaza: 0 }));
    }
    const bulevar: number[] = [];
    for (let z = EJE_DEL_ELEVADO + 16; z <= 264; z += 8) {
      const f = ((z - 24) % 48 + 48) % 48;
      if (f < 8 || f > 40) continue;
      bulevar.push(cajas.length);
      cajas.push(caja({ r: rectanguloSimetrico(s, { x0: EJE_DEL_BULEVAR - 0.25, z0: z - 0.25, x1: EJE_DEL_BULEVAR + 0.25, z1: z + 0.25 }), tipo: 'tronco', alto: 6, mira: 0, edificio: null, despejable: false, hueco: null, plaza: 0 }));
      if (f === 24) {
        bulevar.push(cajas.length);
        cajas.push(caja({ r: rectanguloSimetrico(s, { x0: EJE_DEL_BULEVAR - 0.25, z0: z + 2, x1: EJE_DEL_BULEVAR + 0.25, z1: z + 4 }), tipo: 'banco', alto: 0.9, mira: rumboSimetrico(s, 64), edificio: null, despejable: false, hueco: null, plaza: 0 }));
      }
    }
    const lineaDe = (eje: 'x' | 'z', linea: number): number => {
      const p = eje === 'x' ? puntoSimetrico(s, 0, linea) : puntoSimetrico(s, linea, 0);
      return ejeSimetrico(s, eje) === 'x' ? p.z : p.x;
    };
    const rango = (eje: 'x' | 'z', linea: number, desde: number, hasta: number): [number, number] => {
      const a = eje === 'x' ? puntoSimetrico(s, desde, linea) : puntoSimetrico(s, linea, desde);
      const b = eje === 'x' ? puntoSimetrico(s, hasta, linea) : puntoSimetrico(s, linea, hasta);
      const enX = ejeSimetrico(s, eje) === 'x';
      const u = enX ? a.x : a.z;
      const v = enX ? b.x : b.z;
      return [Math.min(u, v), Math.max(u, v)];
    };
    const [e0, e1] = rango('x', EJE_DEL_ELEVADO, -BORDE_DE_LA_CIUDAD, BORDE_DE_LA_CIUDAD);
    avenidas.push({ id: 'elevado', eje: ejeSimetrico(s, 'x'), linea: lineaDe('x', EJE_DEL_ELEVADO), desde: e0, hasta: e1, ancho: ANCHO_DE_AVENIDA, cajas: elevado });
    const [b0, b1] = rango('z', EJE_DEL_BULEVAR, EJE_DEL_ELEVADO, BORDE_DE_LA_CIUDAD);
    avenidas.push({ id: 'bulevar', eje: ejeSimetrico(s, 'z'), linea: lineaDe('z', EJE_DEL_BULEVAR), desde: b0, hasta: b1, ancho: ANCHO_DE_AVENIDA, cajas: bulevar });
  }
  /* 4 · Las plazas: lo fijo de cada plantilla. */
  for (const lista of cajasDePlaza) for (const c of lista) cajas.push(caja(c));
  /* 5 · Las cabinas y los refugios. */
  const cabinas: CabinaDeLaCiudad[] = [];
  const refugios: RefugioDeLaCiudad[] = [];
  prestadasDeCabina.forEach((p, k) => {
    const n = cajas.length;
    const esRefugio = k % 3 === 2 && refugios.length < 10;
    if (!esRefugio && cabinas.length >= 20) return;
    cajas.push(caja({ r: p.r, tipo: esRefugio ? 'refugio' : 'cabina', alto: 2.6, mira: p.mira, edificio: null, despejable: false, hueco: null, plaza: 0 }));
    if (esRefugio) refugios.push({ indice: refugios.length, distrito: p.distrito, sitios: [{ x: p.poste.x, z: p.poste.z, rumbo: p.mira }], zona: 123 + refugios.length, caja: n, tramo: 0 });
    else cabinas.push({ indice: cabinas.length, distrito: p.distrito, poste: p.poste, mira: p.mira, sitio: p.poste, zona: 103 + cabinas.length, caja: n, tramo: 0 });
  });

  /* ─── Calles, cruces y tramos ─── */
  const calles: CalleDeLaCiudad[] = [];
  const avenidaEn = (eje: 'x' | 'z', linea: number): AvenidaDeLaCiudad | undefined => avenidas.find((a) => a.eje === eje && a.linea === linea);
  for (const eje of ['x', 'z'] as const) {
    for (const linea of EJES_DE_LA_CIUDAD) {
      const av = avenidaEn(eje, linea);
      const clase: ClaseDeCalle = av !== undefined ? 'avenida' : Math.abs(linea) === 264 ? 'exterior' : Math.abs(linea) === 120 ? 'mayor' : 'calle';
      calles.push({ indice: calles.length, eje, linea, clase, ancho: av !== undefined ? ANCHO_DE_AVENIDA : ANCHO_DE_CALLE, nombre: av !== undefined ? -1 : calles.length });
    }
  }
  const cruces: Punto[] = [];
  for (const z of EJES_DE_LA_CIUDAD) for (const x of EJES_DE_LA_CIUDAD) cruces.push({ x, z });
  const tramos: TramoDeLaCiudad[] = [];
  const huecoEn = (x: number, z: number): number | null => {
    const i = Math.round(x / 48);
    const j = Math.round(z / 48);
    return Math.abs(i) <= HUECO_MAXIMO && Math.abs(j) <= HUECO_MAXIMO ? indiceDeHueco(i, j) : null;
  };
  for (const calle of calles) {
    for (let k = 0; k < EJES_DE_LA_CIUDAD.length - 1; k++) {
      const desde = EJES_DE_LA_CIUDAD[k] as number;
      const hasta = EJES_DE_LA_CIUDAD[k + 1] as number;
      const medio = (desde + hasta) / 2;
      const f = EJES_DE_LA_CIUDAD.indexOf(calle.linea);
      const cruceA = calle.eje === 'x' ? f * 12 + k : k * 12 + f;
      const cruceB = calle.eje === 'x' ? f * 12 + k + 1 : (k + 1) * 12 + f;
      const lado = (signo: number): LadoDelTramo => {
        const h = calle.eje === 'x' ? huecoEn(medio, calle.linea + signo * 24) : huecoEn(calle.linea + signo * 24, medio);
        if (h === null) return { hueco: null, frente: 'borde', soportal: false };
        const hu = huecos[h] as HuecoDeLaCiudad;
        return { hueco: h, frente: hu.uso === 'plaza' ? 'plaza' : 'edificio', soportal: false };
      };
      const lados: [LadoDelTramo, LadoDelTramo] = [lado(-1), lado(1)];
      tramos.push({
        indice: tramos.length,
        calle: calle.indice,
        eje: calle.eje,
        centro: calle.linea,
        desde,
        hasta,
        cruces: [cruceA, cruceB],
        clase: calle.clase,
        ancho: calle.ancho,
        lados,
        daAPlaza: lados.some((x) => x.frente === 'plaza'),
      });
    }
  }

  /* ─── Las celdas ─── */
  const celdas: CeldaDeLaCiudad[] = [];
  for (let k = 0; k < CELDAS; k++) {
    const { i, j } = celdaDelIndice(k);
    const dentro = Math.abs(i) <= HUECO_MAXIMO && Math.abs(j) <= HUECO_MAXIMO;
    const hueco = dentro ? indiceDeHueco(i, j) : null;
    const caja = rectanguloDeLaCelda(i, j);
    celdas.push({
      i,
      j,
      indice: k,
      caja,
      hueco,
      distrito: hueco === null ? null : (huecos[hueco] as HuecoDeLaCiudad).distrito,
      edificios: hueco === null ? [] : (huecos[hueco] as HuecoDeLaCiudad).edificios.slice(),
      tramos: tramos.filter((t) => {
        const cx = t.eje === 'x' ? (t.desde + t.hasta) / 2 : t.centro;
        const cz = t.eje === 'x' ? t.centro : (t.desde + t.hasta) / 2;
        return cx >= caja.x0 - 24 && cx < caja.x1 + 24 && cz >= caja.z0 - 24 && cz < caja.z1 + 24;
      }).map((t) => t.indice),
      cajas: cajas
        .map((c, n) => ({ c, n }))
        .filter(({ c }) => {
          const x = celdaDe((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2);
          return x !== null && indiceDeCelda(x.i, x.j) === k;
        })
        .map(({ n }) => n),
    });
  }

  /* ─── El grafo mínimo (los cruces y sus tramos) y las distancias entre plazas ─── */
  const aristas = tramos.map((t) => ({ a: t.cruces[0], b: t.cruces[1], largo: t.hasta - t.desde, tramo: t.indice }));
  const distancias = plazas.map((p) => plazas.map((q) => Math.abs(p.centro.x - q.centro.x) + Math.abs(p.centro.z - q.centro.z)));

  return {
    traza,
    dibujo,
    simetria: s,
    codigo,
    huecos,
    plazas,
    calles,
    cruces,
    tramos,
    avenidas,
    callejones: [],
    edificios,
    rotulos,
    cajas,
    cabinas,
    refugios,
    zonas: [],
    grafo: { nudos: cruces, aristas },
    aceras: { nudos: [], tramos: [] },
    distancias,
    celdas,
  };
}

/** Las salidas de las avenidas por el borde (§2.5): el Elevado por sus dos cantos y el Bulevar por el sur, en la traza. */
export interface SalidaDeAvenida {
  /** El eje a lo largo del que sale la avenida, y hacia dónde (+1 o −1). */
  readonly eje: 'x' | 'z';
  readonly sentido: 1 | -1;
  /** La coordenada del eje de la avenida en el otro eje. */
  readonly linea: number;
}

function salidasDeLasAvenidas(s: number): SalidaDeAvenida[] {
  const dibujadas: { eje: 'x' | 'z'; sentido: 1 | -1; linea: number }[] = [
    { eje: 'x', sentido: -1, linea: EJE_DEL_ELEVADO },
    { eje: 'x', sentido: 1, linea: EJE_DEL_ELEVADO },
    { eje: 'z', sentido: 1, linea: EJE_DEL_BULEVAR },
  ];
  return dibujadas.map((d) => {
    const p = d.eje === 'x' ? puntoSimetrico(s, d.sentido * BORDE_DE_LA_CIUDAD, d.linea) : puntoSimetrico(s, d.linea, d.sentido * BORDE_DE_LA_CIUDAD);
    const eje = ejeSimetrico(s, d.eje);
    return { eje, sentido: (eje === 'x' ? Math.sign(p.x) : Math.sign(p.z)) as 1 | -1, linea: eje === 'x' ? p.z : p.x };
  });
}

/**
 * EL CERCO, en trozos: por cada lado, de esquina a esquina (±272), cortado en las rayas de las celdas y,
 * aparte, el trozo que cruza la salida de cada avenida (ahí se pinta la cortina de glifos, no una fachada).
 */
function trozosDelCerco(salidas: readonly SalidaDeAvenida[]): Rectangulo[] {
  const trozos: Rectangulo[] = [];
  const medio = ANCHO_DE_AVENIDA / 2;
  for (const lado of [-1, 1] as const) {
    for (const eje of ['x', 'z'] as const) {
      /* `eje` es el eje a lo largo del que corre este lado del cerco; está en la otra coordenada = lado · 270. */
      const cortes = new Set<number>([-CERCO_DE_LA_CIUDAD, CERCO_DE_LA_CIUDAD]);
      for (let k = -6; k <= 5; k++) cortes.add(48 * k + 24);
      const salida = salidas.find((x) => x.eje !== eje && x.sentido === lado);
      if (salida !== undefined) {
        cortes.add(salida.linea - medio);
        cortes.add(salida.linea + medio);
      }
      const lista = [...cortes].filter((c) => Math.abs(c) <= CERCO_DE_LA_CIUDAD).sort((a, b) => a - b);
      for (let k = 0; k < lista.length - 1; k++) {
        const a = lista[k] as number;
        const b = lista[k + 1] as number;
        /* Las esquinas sólo las lleva el lado que corre por x, para no pisar dos cajas. */
        const a2 = eje === 'z' ? Math.max(a, -BORDE_DE_LA_CIUDAD) : a;
        const b2 = eje === 'z' ? Math.min(b, BORDE_DE_LA_CIUDAD) : b;
        if (b2 - a2 < 0.01) continue;
        const d0 = lado < 0 ? -CERCO_DE_LA_CIUDAD : BORDE_DE_LA_CIUDAD;
        const d1 = lado < 0 ? -BORDE_DE_LA_CIUDAD : CERCO_DE_LA_CIUDAD;
        trozos.push(eje === 'x' ? { x0: a2, z0: d0, x1: b2, z1: d1 } : { x0: d0, z0: a2, x1: d1, z1: b2 });
      }
    }
  }
  return trozos;
}

/* ─── LA NOCHE ─────────────────────────────────────────────────────────────── */

const TIEMPOS: readonly Tiempo[] = ['llovizna', 'aguacero', 'niebla'];

/**
 * LA NOCHE SINTÉTICA de una ciudad: sus coches y quioscos (prestados de las mismas celdas de barrio, en esa
 * noche), lo variable de las plazas, 4-6 cortes de obra en tramos que no dan a una plaza, el tren del
 * Elevado, el tiempo y la hora. `fallos` como en el contrato; el grafo, el de la mesa.
 */
export function nocheSintetica(ciudad: CiudadDeLaMesa, noche: number, fallos: readonly number[] = []): NocheDeLaCiudad {
  const codigo = ciudad.codigo;
  const s = ciudad.simetria;
  const cajas: CajaDeLaCiudad[] = [...ciudad.cajas];
  const cajasDeLaMesa = cajas.length;
  const plazasVariables: CajaDeLaCiudad[][] = ciudad.plazas.map(() => []);
  /* 6 · Lo de las calles de la noche, hueco a hueco. */
  for (const h of ciudad.huecos) {
    const d = huecoAntesDeLaSimetria(s, h.i, h.j);
    const prestamo = prestamoDe(codigo, ciudad.dibujo, d.i, d.j);
    const barrio = barrioDelPozo(codigo, prestamo.k, noche);
    const a = h.plaza > 0 ? 0 : prestamo.a;
    const b = h.plaza > 0 ? 0 : prestamo.b;
    const l: Llevar = { s, dx: 48 * (d.i - a), dz: 48 * (d.j - b) };
    for (const c of barrio.cajas) {
      const esDeCalle = c.tipo === 'coche' || c.tipo === 'quiosco-de-prensa';
      const esDePlaza = h.plaza > 0 && (c.tipo === 'quiosco' || c.tipo === 'banco');
      if (!esDeCalle && !esDePlaza) continue;
      const cc = celdaDe((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2);
      if (cc === null || cc.i !== a || cc.j !== b) continue;
      const dibujado = { x0: c.x0 + l.dx, z0: c.z0 + l.dz, x1: c.x1 + l.dx, z1: c.z1 + l.dz };
      if (sobreUnaAvenida(dibujado)) continue;
      const nueva: CajaDeLaCiudad = { ...llevarRect(l, c), tipo: c.tipo, clase: 'alta', alto: c.alto, mira: rumboSimetrico(s, c.mira), edificio: null, despejable: c.despejable, hueco: h.indice, plaza: esDePlaza ? h.plaza : 0 };
      if (esDePlaza) (plazasVariables[h.plaza - 1] as CajaDeLaCiudad[]).push(nueva);
      else cajas.push(nueva);
    }
  }
  /* 7 · Lo variable de las plazas. */
  for (const lista of plazasVariables) cajas.push(...lista);
  /* 8 · Los cortes de obra: tramos de calle (no de avenida, no junto a una plaza, no en el borde). */
  const h = mezclar(hashDeTexto(codigo), noche, 0xc0e7e);
  const cuantos = 4 + (h % 3);
  const candidatos = ciudad.tramos.filter((t) => !t.daAPlaza && t.clase !== 'avenida' && t.clase !== 'exterior' && t.lados.every((x) => x.frente === 'edificio'));
  const cortes: CorteDeObra[] = [];
  const usados = new Set<number>();
  for (let k = 0; cortes.length < cuantos && k < 200; k++) {
    const t = candidatos[mezclar(h, k) % candidatos.length] as TramoDeLaCiudad;
    if (usados.has(t.indice)) continue;
    usados.add(t.indice);
    const medio = (t.desde + t.hasta) / 2;
    const r: Rectangulo = t.eje === 'x' ? { x0: medio - 1.5, z0: t.centro - 3, x1: medio + 1.5, z1: t.centro + 3 } : { x0: t.centro - 3, z0: medio - 1.5, x1: t.centro + 3, z1: medio + 1.5 };
    /* Lo que el corte pisa se va (un coche aparcado en la obra). */
    for (let n = cajas.length - 1; n >= cajasDeLaMesa; n--) {
      const c = cajas[n] as CajaDeLaCiudad;
      if (c.x0 < r.x1 && c.x1 > r.x0 && c.z0 < r.z1 && c.z1 > r.z0) cajas.splice(n, 1);
    }
    cortes.push({ tramo: t.indice, caja: -1 });
  }
  cortes.sort((a, b) => a.tramo - b.tramo);
  const conCortes: CorteDeObra[] = cortes.map((c) => {
    const t = ciudad.tramos[c.tramo] as TramoDeLaCiudad;
    const medio = (t.desde + t.hasta) / 2;
    const r: Rectangulo = t.eje === 'x' ? { x0: medio - 1.5, z0: t.centro - 3, x1: medio + 1.5, z1: t.centro + 3 } : { x0: t.centro - 3, z0: medio - 1.5, x1: t.centro + 3, z1: medio + 1.5 };
    const n = cajas.length;
    cajas.push({ ...r, tipo: 'corte', clase: 'alta', alto: 1.1, mira: t.eje === 'x' ? 64 : 0, edificio: null, despejable: false, hueco: null, plaza: 0 });
    return { tramo: c.tramo, caja: n };
  });
  const elevado = ciudad.avenidas.find((a) => a.id === 'elevado') as AvenidaDeLaCiudad;
  const tren: TrenDeLaCiudad = {
    eje: elevado.eje,
    linea: elevado.linea,
    desde: elevado.desde - SALIDA_DE_GLIFOS,
    hasta: elevado.hasta + SALIDA_DE_GLIFOS,
    alto: ALTO_DEL_VIADUCTO,
    largo: 36,
    desfaseTics: mezclar(h, 7) % TICS_ENTRE_TRENES,
    sentido: mezclar(h, 8) % 2 === 0 ? 1 : -1,
  };
  const semaforos = ciudad.cruces.map((_, k) => mezclar(h, k, 11) % 1200);
  return {
    ciudad,
    noche,
    fallos,
    plazasDespejadas: false,
    cajas,
    cajasDeLaMesa,
    cortes: conCortes,
    grafo: ciudad.grafo,
    semaforos,
    tren,
    tiempo: TIEMPOS[mezclar(h, 3) % TIEMPOS.length] as Tiempo,
    hora: { h: 1 + (mezclar(h, 4) % 4), m: mezclar(h, 5) % 60 },
  };
}

/** Dónde va el tren sintético en un tic: la misma cuenta que el del barrio, a lo largo del Elevado. */
export function trenSinteticoEn(tren: TrenDeLaCiudad, tic: number): { readonly cabeza: number; readonly cola: number } | null {
  const largo = tren.hasta - tren.desde;
  const tics = Math.ceil((largo + tren.largo) / METROS_DEL_TREN_POR_TIC);
  const fase = ((((Math.floor(tic) - tren.desfaseTics) % TICS_ENTRE_TRENES) + TICS_ENTRE_TRENES) % TICS_ENTRE_TRENES);
  if (fase >= tics) return null;
  const recorrido = fase * METROS_DEL_TREN_POR_TIC;
  const cabezaDesdeElPrincipio = Math.min(recorrido, largo);
  const colaDesdeElPrincipio = Math.max(0, recorrido - tren.largo);
  if (tren.sentido > 0) return { cabeza: tren.desde + cabezaDesdeElPrincipio, cola: tren.desde + Math.min(colaDesdeElPrincipio, largo) };
  return { cabeza: tren.hasta - cabezaDesdeElPrincipio, cola: tren.hasta - Math.min(colaDesdeElPrincipio, largo) };
}

/** Las salidas de las avenidas de una ciudad cualquiera (de verdad o sintética), leídas de sus avenidas. */
export function salidasDe(ciudad: Pick<CiudadDeLaMesa, 'avenidas'>): SalidaDeAvenida[] {
  const salidas: SalidaDeAvenida[] = [];
  for (const a of ciudad.avenidas) {
    if (Math.abs(a.desde + BORDE_DE_LA_CIUDAD) < 0.01) salidas.push({ eje: a.eje, sentido: -1, linea: a.linea });
    if (Math.abs(a.hasta - BORDE_DE_LA_CIUDAD) < 0.01) salidas.push({ eje: a.eje, sentido: 1, linea: a.linea });
  }
  return salidas;
}

export { ACERA_DE_AVENIDA };
