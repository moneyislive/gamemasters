/**
 * LA CIUDAD TROCEADA EN CELDAS (§5.7 de `docs/quiebro/CIUDAD-ABIERTA.md`): de la ciudad del contrato
 * (`NocheDeLaCiudad` de `shared/arcade/juegos/quiebro-ciudad.ts`) a lo que el pintor pone en cada celda de
 * 48 m, y cómo se construye una celda A TROZOS.
 *
 * ═══ UNA CELDA ES UN HUECO Y LA MITAD DE SUS CALLES ═══
 *
 * La celda `(i, j)` cubre `[48i − 24, 48i + 24)` en los dos ejes (la de la columna: `rectanguloDeLaCelda`):
 * una manzana o una plaza en el centro y la media calle de cada lado. Todo lo que se pinta va a la celda
 * de su CENTRO, con la misma regla que `cajasDeLaCelda` reparte las cajas: un punto justo en la raya cae
 * en la de la derecha. Así pintar celda a celda no pinta nada dos veces ni se deja nada, y lo pintado de
 * una celda está encima de SUS cajas. Lo único que cruza las rayas es lo que va por encima de la cabeza:
 * la viga del Elevado (se corta en la raya), los cables de fachada a fachada (van a la celda de su punto
 * medio) y la copa de los árboles de la mediana (la de su tronco). Los edificios nunca: entre dos huecos
 * siempre hay una calle, y la fila del cerco (`anillo-de-la-ciudad.ts`) se parte en las rayas.
 *
 * ═══ LO QUE DICE EL CONTRATO Y LO QUE DECIDE EL PINTOR ═══
 *
 * Del contrato sale todo lo que estorba o tiene que verse igual en todos los aparatos: cada caja con su
 * tipo (y su frente), los edificios con sus tramos, fachadas y soportales, los rótulos con su texto, las
 * cabinas, el viaducto, los cortes. El pintor decide lo que el contrato le deja (el adorno): qué coche es
 * un taxi, las farolas de pared de las calles sin farolas de pie (§2.4: «van de pared, sin caja»), los
 * toldos, los cables, las alcantarillas. Siempre con el hash del sitio, así que dos aparatos ven lo mismo.
 *
 * ═══ CONSTRUIR A TROZOS, CONTANDO TRIÁNGULOS ═══
 *
 * `construirLaCelda` es un GENERADOR: cede el paso después de cada pieza (una cara de fachada, un puñado
 * de balcones, una farola, un coche) diciendo cuántos triángulos escribió. Quien la construye (la ventana,
 * `ventana.ts`) para cuando ha gastado su tope del fotograma. Se mide contando triángulos y no
 * cronometrando (§5.7): un reloj en un teléfono ocupado miente, y un triángulo cuesta lo mismo siempre.
 *
 * ═══ LA OBRA Y SUS ESCRITORES ═══
 *
 * Lo que se escribe en una celda lo escriben SIETE escritores, uno por familia de piezas y en este orden
 * (`ESCRITORES_DE_LA_CELDA`): las fachadas, el mobiliario (`celda-mobiliario.ts`), el viaducto (`viaducto.ts`),
 * los coches (`coches.ts`), lo que cuelga (`voladizos.ts`), los rótulos (`neones.ts`) y el suelo (`tapas.ts`).
 * Todos escriben en la misma OBRA (`ObraDeLaCelda`): el nivel, el grado de la celda (`grados.ts`), los moldes de
 * las cinco familias y lo que sale de la celda (sus luces, lo que estorba, sus rótulos, sus bocas). Cada pieza es
 * un generador que cede: entre dos cesiones no escribe más que el trozo del nivel (600 triángulos en N0, 1.000 en
 * N1-N3, sumando familias), porque la ventana sólo empieza un trozo si le cabe entero. Quien escribe una familia
 * nueva lo hace en su fichero, sin tocar éste.
 *
 * Sin React y sin WebGL: el comprobador trocea y construye en Node con esto mismo.
 */
import type { CajaDeLaCiudad, EdificioDeLaCiudad, NocheDeLaCiudad } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import {
  ALTO_DEL_VIADUCTO,
  BORDE_DE_LA_CIUDAD,
  CELDAS,
  CELDA_MAXIMA,
  CELDA_MINIMA,
  MEDIANA_DE_AVENIDA,
  CALZADA_DE_AVENIDA,
  ACERA_DE_AVENIDA,
  EJES_DE_LA_CIUDAD,
  ANCHO_DE_ACERA,
  ANCHO_DE_CALZADA,
  celdaDe,
  celdaDelIndice,
  indiceDeCelda,
  rectanguloDeLaCelda,
} from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { CabinaDelPlano, CajaXZ, CalleDelPlano, CocheDelPlano, DetalleDelNivel, EdificioDelPlano, FarolaDelPlano, FuenteDelPlano, GradoDeLaCelda, NivelDeLaCiudad, Orientacion, PiezaConFrente, RotuloDelPlano, Volumen } from './tipos';
import { DETALLE_DEL_NIVEL } from './tipos';
import type { GeometriaVolcada, V3 } from './geometria';
import { Molde, MoldeQueNoGuarda } from './geometria';
import type { VentanaEncendida } from './fachadas';
import { ATRIBUTOS_DE_LA_FACHADA, carasDeCalle, fachadasPorPartes } from './fachadas';
import { ATRIBUTOS_DEL_MOBILIARIO, ATRIBUTOS_DE_LO_EMISIVO } from './materiales';
import type { LuzDelMobiliario } from './mobiliario';
import { mobiliarioDeLaCelda } from './celda-mobiliario';
import { viaductoDeLaCelda } from './viaducto';
import type { TramoDeViaducto } from './viaducto';
import { cochesDeLaCelda } from './coches';
import { cablesDeLasCalles, voladizosDeLaCelda } from './voladizos';
import type { AtlasDeGlifos, FuenteDeRotulo } from './neones';
import { ATRIBUTOS_DE_LOS_NEONES, rotulosDeLaCelda } from './neones';
import { sueloDeLaCelda } from './tapas';
import { GRADO_DEL_CENTRO, gradoDeLosCoches } from './grados';
import type { FuentesDeLuz } from './fuentes';
import type { FuenteHorneada } from './luz-de-la-calle';
import { repartirLasLuces } from './fuentes';
import { cocheDelPlano, edificioDelPlano, orientacionDelRumbo, rotuloDelPlano } from './plano';
import type { AnilloDeLaCiudad } from './anillo-de-la-ciudad';
import type { SalidaDeAvenida } from './sintetica';
import { mezclar } from './azar';

/* ═══════════════════════════════ LAS FAMILIAS ═══════════════════════════════ */

/**
 * LAS FAMILIAS DE LA VENTANA: una malla (una llamada) cada una, con todo lo de las celdas de la ventana.
 * El mobiliario lleva también los coches, los voladizos, los cables, las chapas de los rótulos y el
 * viaducto: comparten material (color y acabado por vértice), así que fundirlos es una llamada menos.
 */
export type Familia = 'fachadas' | 'mobiliario' | 'emisivo' | 'cristal' | 'neones';
export const FAMILIAS: readonly Familia[] = ['fachadas', 'mobiliario', 'emisivo', 'cristal', 'neones'];

/** Los atributos del molde de cada familia (sus nombres y tamaños salen de `Molde.atributos()`). */
function moldeDe(f: Familia, guardar: boolean): Molde {
  const Clase = guardar ? Molde : MoldeQueNoGuarda;
  if (f === 'fachadas') return new Clase(ATRIBUTOS_DE_LA_FACHADA);
  if (f === 'mobiliario') return new Clase(ATRIBUTOS_DEL_MOBILIARIO, true);
  if (f === 'emisivo') return new Clase(ATRIBUTOS_DE_LO_EMISIVO, true);
  if (f === 'neones') return new Clase(ATRIBUTOS_DE_LOS_NEONES);
  return new Clase({}, false);
}

/** Los atributos que lleva cada familia, en el orden de `Molde.volcar`. */
export function atributosDeLaFamilia(f: Familia): readonly { readonly nombre: string; readonly tam: number }[] {
  return moldeDe(f, true).atributos();
}

/* ═══════════════════════════════ LA CIUDAD PARTIDA ═══════════════════════════════ */

/** Una farola de pared: en una fachada, a `alto` metros, mirando a la calle. Sin caja. */
export interface LamparaDePared {
  readonly x: number;
  readonly z: number;
  readonly mira: Orientacion;
  readonly alto: number;
}

/** LO QUE VA EN UNA CELDA: sus piezas ya en la forma del pintor, y sus cajas. */
export interface ParteDeLaCelda {
  readonly i: number;
  readonly j: number;
  readonly indice: number;
  readonly caja: CajaXZ;
  /** Los edificios de su hueco y, en el anillo, los de la fila del cerco. */
  readonly edificios: readonly EdificioDelPlano[];
  /** Volúmenes de las celdas de al lado que tocan a los suyos (la fila del cerco es continua). */
  readonly vecinos: readonly Volumen[];
  readonly rotulos: readonly RotuloDelPlano[];
  readonly coches: readonly CocheDelPlano[];
  readonly cabinas: readonly CabinaDelPlano[];
  readonly farolas: readonly FarolaDelPlano[];
  readonly lamparas: readonly LamparaDePared[];
  readonly bancos: readonly PiezaConFrente[];
  readonly fuentes: readonly FuenteDelPlano[];
  readonly quioscos: readonly PiezaConFrente[];
  readonly quioscosDePrensa: readonly PiezaConFrente[];
  readonly troncos: readonly CajaXZ[];
  readonly estatuas: readonly CajaXZ[];
  readonly contenedores: readonly PiezaConFrente[];
  readonly carretillas: readonly PiezaConFrente[];
  readonly muelles: readonly PiezaConFrente[];
  readonly cortes: readonly CajaXZ[];
  readonly vallas: readonly CajaXZ[];
  readonly pilares: readonly CajaXZ[];
  /** Pilares de soportal que no son de ningún edificio (el soportal perimetral de una plaza) y su techo. */
  readonly pilaresDePlaza: readonly CajaXZ[];
  readonly techosDePlaza: readonly CajaXZ[];
  readonly viaducto: TramoDeViaducto | null;
  readonly cables: readonly (readonly V3[])[];
  /** Las cajas del cerco que cruzan la salida de una avenida: las pinta el borde de glifos. */
  readonly cortinas: readonly CajaXZ[];
  /** TODAS las cajas de la celda (por su centro), tal cual: lo que el comprobador cruza con lo pintado. */
  readonly estructura: readonly CajaXZ[];
}

export interface PartesDeLaCiudad {
  /** Las 169 celdas, en el orden de `indiceDeCelda`. */
  readonly celdas: readonly ParteDeLaCelda[];
  readonly atlas: AtlasDeGlifos;
  /** Las calles como las pinta el suelo (las avenidas, en dos calzadas). */
  readonly calles: readonly CalleDelPlano[];
  readonly semilla: number;
  /** La ciudad que se juega: de acera a acera. */
  readonly limite: CajaXZ;
  readonly salidas: readonly SalidaDeAvenida[];
}

interface ParteEnObra {
  edificios: EdificioDelPlano[];
  rotulos: RotuloDelPlano[];
  coches: CocheDelPlano[];
  cabinas: CabinaDelPlano[];
  farolas: FarolaDelPlano[];
  bancos: PiezaConFrente[];
  fuentes: FuenteDelPlano[];
  quioscos: PiezaConFrente[];
  quioscosDePrensa: PiezaConFrente[];
  troncos: CajaXZ[];
  estatuas: CajaXZ[];
  contenedores: PiezaConFrente[];
  carretillas: PiezaConFrente[];
  muelles: PiezaConFrente[];
  cortes: CajaXZ[];
  vallas: CajaXZ[];
  pilares: CajaXZ[];
  pilaresDePlaza: CajaXZ[];
  techosDePlaza: CajaXZ[];
  viaducto: TramoDeViaducto | null;
  cables: V3[][];
  cortinas: CajaXZ[];
  estructura: CajaXZ[];
}

function rect(c: { readonly x0: number; readonly z0: number; readonly x1: number; readonly z1: number }): CajaXZ {
  return { x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1 };
}

function conFrente(c: CajaDeLaCiudad): PiezaConFrente {
  return { caja: rect(c), mira: orientacionDelRumbo(c.mira) };
}

/** Las calles del pintor: cada línea de la rejilla fuera de las avenidas, y cada avenida en sus dos calzadas. */
export function callesDelPintor(noche: NocheDeLaCiudad): CalleDelPlano[] {
  const calles: CalleDelPlano[] = [];
  const av = noche.ciudad.avenidas;
  for (const corre of ['x', 'z'] as const) {
    for (const en of EJES_DE_LA_CIUDAD) {
      /* Lo que de esta línea es avenida se quita (va aparte, en dos calzadas). */
      const tapan = av.filter((a) => a.eje === corre && a.linea === en).map((a) => [a.desde, a.hasta] as const);
      let desde = -BORDE_DE_LA_CIUDAD;
      const trozos: [number, number][] = [];
      for (const [a0, a1] of [...tapan].sort((p, q) => p[0] - q[0])) {
        if (a0 > desde) trozos.push([desde, a0]);
        desde = Math.max(desde, a1);
      }
      if (desde < BORDE_DE_LA_CIUDAD) trozos.push([desde, BORDE_DE_LA_CIUDAD]);
      for (const [a, b] of trozos) if (b - a > 1) calles.push({ corre, en, desde: a, hasta: b, acera: ANCHO_DE_ACERA, calzada: ANCHO_DE_CALZADA });
    }
  }
  for (const a of av) {
    const d = MEDIANA_DE_AVENIDA / 2 + CALZADA_DE_AVENIDA / 2;
    for (const s of [-1, 1]) calles.push({ corre: a.eje, en: a.linea + s * d, desde: a.desde, hasta: a.hasta, acera: ACERA_DE_AVENIDA, calzada: CALZADA_DE_AVENIDA });
  }
  return calles;
}

/** Un índice tosco de huellas por celdas de 24 m, para preguntar «¿hay una fachada a mano?». */
function indiceDeHuellas(huellas: readonly CajaXZ[]): (x: number, z: number, radio: number) => boolean {
  const lado = 24;
  const mapa = new Map<number, CajaXZ[]>();
  const clave = (i: number, k: number): number => (i + 64) * 256 + (k + 64);
  for (const h of huellas) {
    for (let i = Math.floor(h.x0 / lado); i <= Math.floor(h.x1 / lado); i++) {
      for (let k = Math.floor(h.z0 / lado); k <= Math.floor(h.z1 / lado); k++) {
        const c = clave(i, k);
        const l = mapa.get(c);
        if (l === undefined) mapa.set(c, [h]);
        else l.push(h);
      }
    }
  }
  return (x, z, radio) => {
    for (let i = Math.floor((x - radio) / lado); i <= Math.floor((x + radio) / lado); i++) {
      for (let k = Math.floor((z - radio) / lado); k <= Math.floor((z + radio) / lado); k++) {
        for (const h of mapa.get(clave(i, k)) ?? []) {
          if (Math.hypot(Math.max(h.x0 - x, 0, x - h.x1), Math.max(h.z0 - z, 0, z - h.z1)) < radio) return true;
        }
      }
    }
    return false;
  };
}

/**
 * PARTE UNA NOCHE EN CELDAS. `anillo` es lo de detrás del cerco (su fila va a las celdas del anillo);
 * `salidas`, las de las avenidas; `atlas`, el de las letras de los rótulos de la ciudad; `semilla`, la de
 * la mesa (para el adorno). Una vez por noche: son listas, sin geometría (unos milisegundos).
 */
export function partirLaCiudad(noche: NocheDeLaCiudad, anillo: AnilloDeLaCiudad, salidas: readonly SalidaDeAvenida[], atlas: AtlasDeGlifos, semilla: number): PartesDeLaCiudad {
  const mesa = noche.ciudad;
  const obras: ParteEnObra[] = [];
  for (let k = 0; k < CELDAS; k++) {
    obras.push({
      edificios: [],
      rotulos: [],
      coches: [],
      cabinas: [],
      farolas: [],
      bancos: [],
      fuentes: [],
      quioscos: [],
      quioscosDePrensa: [],
      troncos: [],
      estatuas: [],
      contenedores: [],
      carretillas: [],
      muelles: [],
      cortes: [],
      vallas: [],
      pilares: [],
      pilaresDePlaza: [],
      techosDePlaza: [],
      viaducto: null,
      cables: [],
      cortinas: [],
      estructura: [],
    });
  }
  const celdaDelPunto = (x: number, z: number): ParteEnObra | null => {
    const c = celdaDe(x, z);
    return c === null ? null : (obras[indiceDeCelda(c.i, c.j)] as ParteEnObra);
  };
  const celdaDeLaCaja = (c: CajaXZ): ParteEnObra | null => celdaDelPunto((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2);

  /* ─── Los edificios, con su caja de choque y la de sus pilares ─── */
  const cajas = noche.cajas;
  const edificiosDelPlano = new Map<number, EdificioDelPlano>();
  for (const e of mesa.edificios) {
    const bajo = cajas[e.caja];
    if (bajo === undefined) continue;
    const plano = edificioDelPlano(e, rect(bajo), e.soportales, e.pilares.map((p) => rect(cajas[p] as CajaDeLaCiudad)));
    edificiosDelPlano.set(e.indice, plano);
    celdaDeLaCaja(bajo)?.edificios.push(plano);
  }
  /* Los rótulos, a la celda de su edificio. */
  for (const r of mesa.rotulos) {
    const e = mesa.edificios[r.edificio] as EdificioDeLaCiudad | undefined;
    const bajo = e === undefined ? undefined : cajas[e.caja];
    const parte = bajo === undefined ? celdaDelPunto(r.x, r.z) : celdaDeLaCaja(bajo);
    parte?.rotulos.push(rotuloDelPlano(r));
  }
  /* La fila del cerco, a las celdas del anillo. */
  for (const [k, lista] of anillo.porCelda) (obras[k] as ParteEnObra).edificios.push(...lista);

  /* ─── Las cajas, por su tipo ─── */
  const postes = new Map<number, { x: number; z: number }>();
  for (const c of mesa.cabinas) postes.set(c.caja, c.poste);
  /* Los pilares de soportal que pinta su edificio; los demás (los de una plaza) los pinta la celda. */
  const pilaresDeEdificio = new Set<number>();
  for (const e of mesa.edificios) for (const p of e.pilares) pilaresDeEdificio.add(p);
  const enUnaSalida = (c: CajaXZ): boolean =>
    salidas.some((s) => {
      const a = s.eje === 'x' ? (c.z0 + c.z1) / 2 : (c.x0 + c.x1) / 2;
      const fuera = s.eje === 'x' ? (c.x0 + c.x1) / 2 : (c.z0 + c.z1) / 2;
      return Math.sign(fuera) === s.sentido && Math.abs(a - s.linea) < 12 - 0.01;
    });
  cajas.forEach((c, n) => {
    const parte = celdaDeLaCaja(c);
    if (parte === null) return;
    const r = rect(c);
    parte.estructura.push(r);
    switch (c.tipo) {
      case 'edificio':
        return;
      case 'pilar-de-soportal':
        if (!pilaresDeEdificio.has(n)) parte.pilaresDePlaza.push(r);
        return;
      case 'fachada-exterior':
        if (enUnaSalida(r)) parte.cortinas.push(r);
        return;
      case 'farola':
        parte.farolas.push({
          x: (c.x0 + c.x1) / 2,
          z: (c.z0 + c.z1) / 2,
          altura: c.plaza > 0 ? 4.6 : 6.2,
          brazo: c.plaza > 0 ? null : orientacionDelRumbo(c.mira),
          caja: r,
        });
        return;
      case 'coche':
        parte.coches.push(cocheDelPlano(r, c.mira));
        return;
      case 'fuente':
        parte.fuentes.push({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, radio: (c.x1 - c.x0) / 2, caja: r });
        return;
      case 'quiosco':
        parte.quioscos.push(conFrente(c));
        return;
      case 'banco':
        parte.bancos.push(conFrente(c));
        return;
      case 'quiosco-de-prensa':
        parte.quioscosDePrensa.push(conFrente(c));
        return;
      case 'cabina':
      case 'refugio': {
        const poste = postes.get(n) ?? { x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2 };
        parte.cabinas.push({ x: poste.x, z: poste.z, mira: orientacionDelRumbo(c.mira), refugio: c.tipo === 'refugio', caja: r });
        return;
      }
      case 'pilar-del-tren':
        parte.pilares.push(r);
        return;
      case 'tronco':
        parte.troncos.push(r);
        return;
      case 'estatua':
        parte.estatuas.push(r);
        return;
      case 'contenedor':
        parte.contenedores.push(conFrente(c));
        return;
      case 'carretilla':
        parte.carretillas.push(conFrente(c));
        return;
      case 'muelle':
        parte.muelles.push(conFrente(c));
        return;
      case 'corte':
        parte.cortes.push(r);
        return;
      case 'valla':
        parte.vallas.push(r);
        return;
    }
  });

  /*
   * ─── El techo del soportal de cada plaza: de la línea de sus pilares a la raya del solar, a lo largo de
   * los pilares de cada lado (el soportal perimetral de la Porticada, §2.3). Va por encima de la cabeza.
   */
  for (const h of mesa.huecos) {
    if (h.uso !== 'plaza') continue;
    const s = h.solar;
    const parte = celdaDelPunto((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2);
    if (parte === null || parte.pilaresDePlaza.length === 0) continue;
    const lados: { caja: CajaXZ }[] = [];
    const hacia = (dentro: (p: CajaXZ) => number, techo: (a: number, b: number, l: number) => CajaXZ): void => {
      const cerca = parte.pilaresDePlaza.filter((p) => dentro(p) > 0 && dentro(p) < 4.5);
      if (cerca.length < 2) return;
      const linea = Math.max(...cerca.map((p) => dentro(p)));
      lados.push({ caja: techo(0, 0, linea + 0.3) });
    };
    hacia((p) => p.z0 - s.z0, (_a, _b, l) => ({ x0: s.x0, z0: s.z0, x1: s.x1, z1: s.z0 + l }));
    hacia((p) => s.z1 - p.z1, (_a, _b, l) => ({ x0: s.x0, z0: s.z1 - l, x1: s.x1, z1: s.z1 }));
    hacia((p) => p.x0 - s.x0, (_a, _b, l) => ({ x0: s.x0, z0: s.z0, x1: s.x0 + l, z1: s.z1 }));
    hacia((p) => s.x1 - p.x1, (_a, _b, l) => ({ x0: s.x1 - l, z0: s.z0, x1: s.x1, z1: s.z1 }));
    for (const l of lados) parte.techosDePlaza.push(l.caja);
  }

  /* ─── El viaducto del Elevado, cortado en las rayas de las celdas ─── */
  const elevado = mesa.avenidas.find((a) => a.id === 'elevado');
  if (elevado !== undefined) {
    for (let k = CELDA_MINIMA; k <= CELDA_MAXIMA; k++) {
      const a0 = Math.max(48 * k - 24, elevado.desde);
      const a1 = Math.min(48 * k + 24, elevado.hasta);
      if (a1 - a0 < 0.01) continue;
      const medio = (a0 + a1) / 2;
      const parte = elevado.eje === 'x' ? celdaDelPunto(medio, elevado.linea) : celdaDelPunto(elevado.linea, medio);
      if (parte !== null) parte.viaducto = { eje: elevado.eje, linea: elevado.linea, desde: a0, hasta: a1, alto: ALTO_DEL_VIADUCTO };
    }
  }

  /* ─── Los cables, calle a calle, a la celda de su punto medio (no por donde pasa el viaducto) ─── */
  const calles = callesDelPintor(noche);
  const huellas = [...edificiosDelPlano.values()].map((e) => e.huella);
  const hay = indiceDeHuellas(huellas);
  const limite: CajaXZ = { x0: -BORDE_DE_LA_CIUDAD, z0: -BORDE_DE_LA_CIUDAD, x1: BORDE_DE_LA_CIUDAD, z1: BORDE_DE_LA_CIUDAD };
  const sinViaducto = calles.filter((c) => !(elevado !== undefined && elevado.eje === c.corre && Math.abs(elevado.linea - c.en) < 13));
  for (const cable of cablesDeLasCalles(sinViaducto, limite, semilla, (x, z) => hay(x, z, 1.2))) {
    const a = cable[0] as V3;
    const b = cable[cable.length - 1] as V3;
    celdaDelPunto((a[0] + b[0]) / 2, (a[2] + b[2]) / 2)?.cables.push(cable);
  }

  /* ─── Las celdas, con sus farolas de pared y los volúmenes de sus vecinas ─── */
  const celdas: ParteDeLaCelda[] = obras.map((o, k) => {
    const { i, j } = celdaDelIndice(k);
    const caja = rectanguloDeLaCelda(i, j);
    const vecinos: Volumen[] = [];
    for (const [di, dj] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const vi = i + di;
      const vj = j + dj;
      if (vi < CELDA_MINIMA || vi > CELDA_MAXIMA || vj < CELDA_MINIMA || vj > CELDA_MAXIMA) continue;
      for (const e of (obras[indiceDeCelda(vi, vj)] as ParteEnObra).edificios) {
        for (const v of e.volumenes) {
          if (v.x1 >= caja.x0 - 0.05 && v.x0 <= caja.x1 + 0.05 && v.z1 >= caja.z0 - 0.05 && v.z0 <= caja.z1 + 0.05) vecinos.push(v);
        }
      }
    }
    return {
      i,
      j,
      indice: k,
      caja,
      edificios: o.edificios,
      vecinos,
      rotulos: o.rotulos,
      coches: o.coches,
      cabinas: o.cabinas,
      farolas: o.farolas,
      lamparas: lamparasDePared(o.edificios, o.farolas, semilla),
      bancos: o.bancos,
      fuentes: o.fuentes,
      quioscos: o.quioscos,
      quioscosDePrensa: o.quioscosDePrensa,
      troncos: o.troncos,
      estatuas: o.estatuas,
      contenedores: o.contenedores,
      carretillas: o.carretillas,
      muelles: o.muelles,
      cortes: o.cortes,
      vallas: o.vallas,
      pilares: o.pilares,
      pilaresDePlaza: o.pilaresDePlaza,
      techosDePlaza: o.techosDePlaza,
      viaducto: o.viaducto,
      cables: o.cables,
      cortinas: o.cortinas,
      estructura: o.estructura,
    };
  });
  return { celdas, atlas, calles, semilla, limite, salidas };
}

/** Cada cuánto va una farola de pared, y lo que tiene que haber a la farola de pie más cercana para ponerla. */
const LAMPARAS_CADA = 16;
const SIN_FAROLA_A = 9;

/**
 * LAS FAROLAS DE PARED de unos edificios: en las caras de calle del cuerpo (el volumen que arranca en la
 * planta baja), una cada 16 m y a 0,8 m sobre el bajo, salvo donde ya hay una farola de pie cerca. Las del
 * anillo, no: dan a la calle de fuera, y las de la ciudad ya la iluminan.
 */
function lamparasDePared(edificios: readonly EdificioDelPlano[], farolas: readonly FarolaDelPlano[], semilla: number): LamparaDePared[] {
  const salida: LamparaDePared[] = [];
  for (const c of carasDeCalle(edificios)) {
    if (c.indice !== 1) continue;
    const e = c.edificio;
    const [cx, cz] = c.punto(0);
    if (Math.abs(cx) > BORDE_DE_LA_CIUDAD - 0.5 || Math.abs(cz) > BORDE_DE_LA_CIUDAD - 0.5) continue;
    const ancho = c.hasta - c.desde;
    const n = Math.floor(ancho / LAMPARAS_CADA);
    for (let k = 0; k < n; k++) {
      const u = (ancho - (n - 1) * LAMPARAS_CADA) / 2 + k * LAMPARAS_CADA;
      const [x, z] = c.punto(u);
      const a = c.mira === 'n' || c.mira === 's' ? x : z;
      const y = e.plantaBaja + 0.8;
      if (c.tapado(a, y)) continue;
      if (farolas.some((f) => Math.hypot(f.x - x, f.z - z) < SIN_FAROLA_A)) continue;
      if (mezclar(semilla, Math.round(x * 4), Math.round(z * 4), 0x1a) % 7 === 0) continue;
      salida.push({ x, z, mira: c.mira, alto: y });
    }
  }
  return salida;
}

/* ═══════════════════════════════ LA OBRA DE UNA CELDA ═══════════════════════════════ */

/** Una luz de un coche aparcado que sigue encendida (la de «libre» de los taxis): para los halos. */
export interface CocheEncendido {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly color: readonly [number, number, number];
}

/**
 * LA OBRA DE UNA CELDA: lo que saben todos sus escritores (el nivel, el grado, los moldes de las cinco familias)
 * y lo que sale de ella. Los escritores escriben en los moldes y APUNTAN aquí lo suyo: las luces de sus piezas,
 * las cajas que estorban, las luces de los coches, las fuentes de los rótulos, las bocas de alcantarilla y las
 * ventanas encendidas de las fachadas. Con ellas `construirLaCelda` reparte las fuentes de luz de la celda.
 *
 * El barrio viejo (`construir.ts`) escribe sus piezas con una obra suya (`obraNueva`), con su grado
 * (`gradoDelBarrio`).
 */
export interface ObraDeLaCelda {
  readonly nivel: NivelDeLaCiudad;
  /** El grado de la celda en su ventana (`gradoDeLaCelda` de `grados.ts`). */
  readonly grado: GradoDeLaCelda;
  /** El relieve de hoy (`relieveDeHoy`: en N1, sólo la celda del centro), aparte del grado hasta O3-SILUETA. */
  readonly relieveDeHoy: boolean;
  /** El grado de los coches horneados (`gradoDeLosCoches` de `grados.ts`). */
  readonly gradoDeLosCoches: GradoDeLaCelda;
  readonly detalle: DetalleDelNivel;
  /** Los lados de los cilindros (los del nivel). */
  readonly lados: number;
  readonly ciudad: PartesDeLaCiudad;
  /** Los moldes de las cinco familias (que guardan, o que sólo cuentan: ver `MoldeQueNoGuarda`). */
  readonly m: Readonly<Record<Familia, Molde>>;
  readonly luces: LuzDelMobiliario[];
  readonly estorba: CajaXZ[];
  readonly cochesEncendidos: CocheEncendido[];
  readonly rotulos: FuenteDeRotulo[];
  readonly bocas: { x: number; z: number }[];
  /** Las ventanas encendidas bajas y los escaparates que apuntan las fachadas (tarjetas y luz horneada). */
  readonly ventanas: VentanaEncendida[];
}

/**
 * EL ESCRITOR DE UNA FAMILIA en una celda. Cada `yield` es un paso: entre dos, como mucho el trozo del nivel (600
 * triángulos en N0, 1.000 en N1-N3), sumando las cinco familias.
 */
export type EscritorDeLaCelda = (obra: ObraDeLaCelda, parte: ParteDeLaCelda) => Generator<void, void, void>;

/**
 * EL ESCRITOR DE UNA PIEZA (mobiliario, farolas, coches, viaducto, voladizos, rótulos, tapas): también cede, con el
 * mismo tope entre dos `yield`, y devuelve sus luces (quien la escribe las apunta en la obra). Las piezas que hoy
 * escriben de una vez son generadores de un solo paso.
 */
export type EscritorDePieza<P> = (obra: ObraDeLaCelda, pieza: P) => Generator<void, LuzDelMobiliario | readonly LuzDelMobiliario[] | void, void>;

/** Los moldes de las cinco familias: que guardan, o que sólo cuentan (`MoldeQueNoGuarda`). */
export function moldesDeLaObra(guardar: boolean): Record<Familia, Molde> {
  return {
    fachadas: moldeDe('fachadas', guardar),
    mobiliario: moldeDe('mobiliario', guardar),
    emisivo: moldeDe('emisivo', guardar),
    cristal: moldeDe('cristal', guardar),
    neones: moldeDe('neones', guardar),
  };
}

export interface OpcionesDeLaObra {
  readonly nivel: NivelDeLaCiudad;
  readonly grado: GradoDeLaCelda;
  readonly relieveDeHoy: boolean;
  /** Por omisión, el del nivel y el grado (`gradoDeLosCoches`). */
  readonly gradoDeLosCoches?: GradoDeLaCelda;
  readonly ciudad: PartesDeLaCiudad;
  readonly m: Readonly<Record<Familia, Molde>>;
}

/** UNA OBRA NUEVA, vacía: la de una celda o la del barrio viejo. */
export function obraNueva(o: OpcionesDeLaObra): ObraDeLaCelda {
  const detalle = DETALLE_DEL_NIVEL[o.nivel];
  return {
    nivel: o.nivel,
    grado: o.grado,
    relieveDeHoy: o.relieveDeHoy,
    gradoDeLosCoches: o.gradoDeLosCoches ?? gradoDeLosCoches(o.nivel, o.grado),
    detalle,
    lados: detalle.lados,
    ciudad: o.ciudad,
    m: o.m,
    luces: [],
    estorba: [],
    cochesEncendidos: [],
    rotulos: [],
    bocas: [],
    ventanas: [],
  };
}

/** LAS FACHADAS DE UNA CELDA (el primer escritor): cara a cara, con sus ventanas encendidas; sus cajas estorban. */
function* fachadasDeLaCelda(obra: ObraDeLaCelda, parte: ParteDeLaCelda): Generator<void, void, void> {
  yield* fachadasPorPartes(obra.m.fachadas, parte.edificios, { relieve: obra.relieveDeHoy, grado: obra.grado, ventanas: true, vecinos: parte.vecinos }, obra.ventanas);
  for (const e of parte.edificios) obra.estorba.push(e.caja, ...e.pilares);
}

/**
 * LOS SIETE ESCRITORES DE UNA CELDA, en el orden en que escriben (ver la cabecera). El orden no se toca: de él
 * sale el de los vértices de cada familia.
 */
export const ESCRITORES_DE_LA_CELDA: readonly { readonly nombre: string; readonly escribir: EscritorDeLaCelda }[] = [
  { nombre: 'fachadas', escribir: fachadasDeLaCelda },
  { nombre: 'mobiliario', escribir: mobiliarioDeLaCelda },
  { nombre: 'viaducto', escribir: viaductoDeLaCelda },
  { nombre: 'coches', escribir: cochesDeLaCelda },
  { nombre: 'voladizos', escribir: voladizosDeLaCelda },
  { nombre: 'rotulos', escribir: rotulosDeLaCelda },
  { nombre: 'suelo', escribir: sueloDeLaCelda },
];

/* ═══════════════════════════════ LA CELDA CONSTRUIDA ═══════════════════════════════ */

export interface CeldaConstruida {
  readonly indice: number;
  readonly nivel: NivelDeLaCiudad;
  /** El grado con que se construyó. */
  readonly grado: GradoDeLaCelda;
  /** Si se construyó con relieve (en N1, sólo la del centro de la ventana). */
  readonly relieve: boolean;
  /** Lo escrito de cada familia. */
  readonly familias: Readonly<Record<Familia, GeometriaVolcada>>;
  readonly triangulos: number;
  readonly fuentes: FuentesDeLuz;
  readonly alcantarillas: readonly { readonly x: number; readonly z: number }[];
  /** Las huellas de sus edificios (tapan los reflejos de las fuentes de detrás). */
  readonly tapan: readonly CajaXZ[];
  /** Lo pintado que estorba al paso, en planta. */
  readonly estorba: readonly CajaXZ[];
}

/**
 * LA OBRA DE LA LUZ: grado 1 y los coches más sencillos, en moldes que no guardan. Es lo más barato de CPU, y las
 * fuentes de luz de una celda son las mismas en todos sus grados (las farolas, los rótulos, los escaparates y las
 * ventanas encendidas no se mueven con el grado). El relieve, el de hoy del nivel: así la luz da los mismos pasos
 * que antes (cada paso le cuesta lo suyo en `losetas.ts`) y llega en los mismos fotogramas.
 */
function obraDeLaLuz(ciudad: PartesDeLaCiudad, nivel: NivelDeLaCiudad): ObraDeLaCelda {
  return obraNueva({ nivel, grado: 1, relieveDeHoy: DETALLE_DEL_NIVEL[nivel].relieve, gradoDeLosCoches: 1, ciudad, m: moldesDeLaObra(false) });
}

/** Las fuentes de luz de una celda sin su geometría: las de la luz horneada de las celdas fuera de la ventana. */
export function fuentesDeLaCelda(parte: ParteDeLaCelda, ciudad: PartesDeLaCiudad, nivel: NivelDeLaCiudad): FuentesDeLuz {
  return deUnTiron(construirConLaObra(parte, obraDeLaLuz(ciudad, nivel))).fuentes;
}

/** Las fuentes horneadas de una celda sin su geometría, a pasos: lo que pide la luz por losetas. */
export function* fuentesDeLaCeldaAPasos(parte: ParteDeLaCelda, ciudad: PartesDeLaCiudad, nivel: NivelDeLaCiudad): Generator<number, readonly FuenteHorneada[], void> {
  const g = construirConLaObra(parte, obraDeLaLuz(ciudad, nivel));
  for (;;) {
    const r = g.next();
    if (r.done === true) return r.value.fuentes.horneadas;
    yield 0;
  }
}

/**
 * CONSTRUYE UNA CELDA A TROZOS: cede después de cada pieza con los triángulos que escribió desde la última
 * vez, y al final devuelve la celda. Con `guardar` a `false` no escribe geometría (moldes que no guardan):
 * sólo saca sus fuentes de luz, con las mismas cuentas. `grado`: el de la celda en su ventana (por omisión, el
 * del centro de la ventana del nivel); `relieve`: el de hoy (por omisión, el del nivel).
 */
export function* construirLaCelda(
  parte: ParteDeLaCelda,
  ciudad: PartesDeLaCiudad,
  nivel: NivelDeLaCiudad,
  guardar = true,
  grado: GradoDeLaCelda = GRADO_DEL_CENTRO[nivel],
  relieve: boolean = DETALLE_DEL_NIVEL[nivel].relieve,
): Generator<number, CeldaConstruida, void> {
  return yield* construirConLaObra(parte, obraNueva({ nivel, grado, relieveDeHoy: relieve, ciudad, m: moldesDeLaObra(guardar) }));
}

/** Los siete escritores sobre una obra, contando los triángulos de cada paso (las cinco familias juntas). */
function* construirConLaObra(parte: ParteDeLaCelda, obra: ObraDeLaCelda): Generator<number, CeldaConstruida, void> {
  const m = obra.m;
  let antes = 0;
  const paso = (): number => {
    const n = m.fachadas.triangulos + m.mobiliario.triangulos + m.emisivo.triangulos + m.cristal.triangulos + m.neones.triangulos;
    const d = n - antes;
    antes = n;
    return d;
  };
  for (const e of ESCRITORES_DE_LA_CELDA) for (const _ of e.escribir(obra, parte)) yield paso();

  const fuentes = repartirLasLuces(obra.luces, obra.rotulos, obra.cochesEncendidos, obra.ventanas, Math.ceil(obra.detalle.reflejosDeVentanas / 9));
  const familias = {
    fachadas: m.fachadas.volcar(),
    mobiliario: m.mobiliario.volcar(),
    emisivo: m.emisivo.volcar(),
    cristal: m.cristal.volcar(),
    neones: m.neones.volcar(),
  };
  let triangulos = 0;
  for (const f of FAMILIAS) triangulos += familias[f].indices.length / 3;
  return {
    indice: parte.indice,
    nivel: obra.nivel,
    grado: obra.grado,
    relieve: obra.relieveDeHoy,
    familias,
    triangulos,
    fuentes,
    alcantarillas: obra.bocas,
    tapan: parte.edificios.map((e) => e.huella),
    estorba: obra.estorba,
  };
}

/** Un generador de un tirón: lo que devuelve al acabar. */
export function deUnTiron<T>(g: Generator<unknown, T, void>): T {
  for (;;) {
    const r = g.next();
    if (r.done === true) return r.value;
  }
}

/** Construye una celda de un tirón (el comprobador y lo que no tiene prisa), con el grado y el relieve que se pidan. */
export function construirLaCeldaYa(
  parte: ParteDeLaCelda,
  ciudad: PartesDeLaCiudad,
  nivel: NivelDeLaCiudad,
  grado: GradoDeLaCelda = GRADO_DEL_CENTRO[nivel],
  relieve: boolean = DETALLE_DEL_NIVEL[nivel].relieve,
): CeldaConstruida {
  return deUnTiron(construirLaCelda(parte, ciudad, nivel, true, grado, relieve));
}
