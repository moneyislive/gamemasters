/**
 * LA CALA: la geografía del muelle, sembrada con el código de la mesa.
 *
 * ═══ POR QUÉ ESTO ES ARITMÉTICA Y NO UNA ESCENA ═══
 *
 * Los seis aparatos de una mesa tienen que ver EXACTAMENTE la misma orilla —los
 * mismos juncos, las mismas rocas, la misma arboleda— y dos mesas distintas se
 * tienen que distinguir a primera vista. Eso sólo se cumple si la cala sale de
 * una función pura de la semilla, sin `Math.random`, sin fecha y sin tocar
 * `three`. Así la misma función corre en Node y `verify:embarcadero` compara el
 * `JSON.stringify` de dos llamadas byte a byte, que es la única prueba de
 * determinismo que no se autoengaña.
 *
 * ═══ LA FORMA, EN UNA FRASE ═══
 *
 * Un remanso de agua de unos 24 u de radio metido en un semicírculo de tierra de
 * 66 u, abierto al mar por delante (hacia −z) con una boca que se ensancha. La
 * cámara está sobre el muelle, en +z, mirando al mar: la playa queda detrás de
 * ella, los brazos de tierra a los lados, el caserío en una terraza del brazo
 * derecho y las montañas al fondo, recortadas contra la brasa. Todo en unidades
 * de mundo de `escala.ts`, sobre la misma malla de subteselas que el tablero,
 * para que el día que exista la vista en tercera persona esto sea un sitio de
 * ese mundo.
 *
 * ═══ LO QUE ES FIJO Y LO QUE ES SEMBRADO ═══
 *
 * Los SEIS AMARRES, el muelle y la terraza son fijos: la cámara de `camara.ts`
 * se comprueba contra ellos y un amarre que se moviera con la semilla podría
 * salirse del encuadre en una mesa concreta que nadie probó. La semilla mueve la
 * línea de costa unos pocos metros, y reparte rocas, juncos, nenúfares, árboles,
 * arboledas, montañas, nubes y los barcos de nadie.
 *
 * ═══ LAS ORILLAS SE RESUELVEN AQUÍ Y NO EN `aguas.ts`, A SABIENDAS ═══
 *
 * `aguas.ts` tiene la tabla que traduce «qué lados tocan agua» a «qué pieza de
 * costa y con qué giro» (`piezaDeOrilla`), y es la misma lógica que hace falta
 * aquí. No se importa porque `aguas.ts` arrastra el relieve y el río del
 * tablero —mil setecientas líneas de otra línea de trabajo que cambia a su
 * ritmo— y porque `escenas/embarcadero/` tiene que poder compilarse en la app
 * sin traer el tablero entero. Se replica lo MÍNIMO (unas cuarenta líneas) con
 * los nombres de `piezas.ts`. Si la regla cambia allí, `verify:embarcadero`
 * seguirá pasando aquí: es una copia consciente, no un olvido.
 */
import { centroDeHex, mallaDeRadio, vecinos } from '../../shared/mecanicas/malla-hexagonal';
import type { Hex } from '../../shared/mecanicas/malla-hexagonal';
import { ESCALON, LAMINA, RADIO_DE_TESELA } from '../escala';
import { PIEZA } from './piezas';
import type { NombreDePieza } from './piezas';

/* ────────────────────────── La semilla y el sorteo ────────────────────────── */

/** La semilla de la orilla, cuando no hay mesa. Fija para que la portada no cambie sola. */
export const SEMILLA_DE_LA_ORILLA = 0x5eed_0b1e;

/**
 * Cinco letras → un entero. Un hash multiplicativo basta: no hay que repartir
 * criptografía, sólo que dos códigos distintos den calas distintas casi siempre.
 */
export function semillaDeCodigo(codigo: string | null | undefined): number {
  if (codigo === null || codigo === undefined || codigo.length === 0) return SEMILLA_DE_LA_ORILLA;
  let h = 0x811c_9dc5;
  const texto = codigo.toUpperCase();
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x0100_0193) >>> 0;
  }
  return h >>> 0;
}

/** Un sorteo reproducible (mulberry32). Devuelve fracciones en [0, 1). */
export function sorteo(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b_79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─────────────────────────────── Los tipos ─────────────────────────────── */

export type ClaseDeTesela = 'tierra' | 'orilla' | 'agua';

export interface TeselaDeLaCala {
  readonly q: number;
  readonly r: number;
  readonly x: number;
  readonly z: number;
  readonly clase: ClaseDeTesela;
  /** 0 la pradera, 1 la terraza del caserío. */
  readonly nivel: 0 | 1;
  /** La pieza de suelo que se pinta, o `null` en el agua (el mar lo pinta el sombreador). */
  readonly pieza: NombreDePieza | null;
  readonly giro: number;
}

export interface Punto3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Amarre {
  /** 0 es el local, en la cabeza del muelle. */
  readonly indice: number;
  readonly x: number;
  readonly z: number;
  /** Hacia dónde mira la plataforma: rotación en Y que se aplica a la pieza `muelle`. */
  readonly giro: number;
  /** Donde se pone de pie el aventurero. `y` es la cota del agua; la escena suma las tablas. */
  readonly pie: Punto3;
  /** El barco del asiento, atracado al costado. */
  readonly barco: { readonly x: number; readonly z: number; readonly giro: number };
  /** El poste de la bandera y el farol, sobre la plataforma. */
  readonly bandera: { readonly x: number; readonly z: number };
  readonly farol: { readonly x: number; readonly z: number };
  /** Desde dónde llega el barco cuando alguien se sienta: fuera, en la niebla. */
  readonly llegadaDesde: { readonly x: number; readonly z: number };
}

/** Un tramo del muelle de madera entre la playa y la cabeza. */
export interface TramoDeMuelle {
  readonly x: number;
  readonly z: number;
  readonly giro: number;
}

/** Qué hace la escena con una pieza además de ponerla. Lo que no se anima no lleva nada. */
export type Animacion = 'nube' | 'barco-de-nadie' | 'bote' | 'molino';

export interface PiezaPuesta {
  readonly pieza: NombreDePieza;
  readonly x: number;
  /** La cota resuelta: `nivel · ESCALON` en tierra, la lámina en el agua, el cielo en las nubes. */
  readonly y: number;
  readonly z: number;
  readonly giro: number;
  readonly talla: number;
  readonly nivel: number;
  readonly animacion?: Animacion;
}

export interface Cala {
  readonly semilla: number;
  readonly teselas: readonly TeselaDeLaCala[];
  readonly muelle: readonly TramoDeMuelle[];
  readonly amarres: readonly Amarre[];
  readonly piezas: readonly PiezaPuesta[];
  /** Dónde está la taberna (para su luz y su humo) y la atalaya (para su fuego). */
  readonly taberna: Punto3;
  readonly atalaya: Punto3;
  /** Hacia dónde se puso el sol: el eje de la brasa, la luz rasante y el brillo del agua. */
  readonly sol: { readonly x: number; readonly z: number };
}

/* ───────────────────────────── La geometría fija ───────────────────────────── */

const R = RADIO_DE_TESELA;

/** El remanso: centro y radio del agua interior. El pie del muelle local está en el origen. */
const CENTRO_DEL_REMANSO = { x: 0, z: -14 };
const RADIO_DEL_REMANSO = 24;
/** Hasta dónde llega la tierra. Más allá, mar abierto hasta la niebla. */
const RADIO_DE_LA_CALA = 66;
/** La boca al mar: medio ancho a la altura del centro del remanso, y cuánto abre por unidad de fondo. */
const MEDIA_BOCA = 22;
const APERTURA_DE_LA_BOCA = 0.06;
/** La terraza del caserío, en el brazo derecho. */
const CENTRO_DE_LA_TERRAZA = { x: 38, z: -28 };
const RADIO_DE_LA_TERRAZA = 11.5;
/** Hacia dónde se fue el sol: un poco a la izquierda del eje de la boca. */
const SOL = { x: -0.25, z: -0.968 };

/** Cuánto sobresale del agua lo que flota, para que la lámina no lo corte. */
const A_FLOTE = LAMINA + 0.06;

/**
 * LOS SEIS AMARRES, EN ABANICO Y RETROCEDIENDO.
 *
 * El 0 es el local, en la cabeza del muelle. Los otros cinco se abren a los dos
 * lados de la boca y cada uno está más lejos que el anterior, para que en
 * retrato se lean como profundidad y no como una fila. El abanico carga un poco
 * a la derecha porque en panorámico el local va en el tercio izquierdo y el
 * resto del encuadre es para los demás.
 *
 * Ángulos desde el eje −z (el mar), y distancia al local. Están dentro del
 * remanso con margen de una tesela, que es lo que exige «cada amarre sobre agua».
 */
const ABANICO: readonly { readonly angulo: number; readonly distancia: number }[] = [
  { angulo: 0, distancia: 0 },
  { angulo: -26, distancia: 12 },
  { angulo: 30, distancia: 14 },
  { angulo: -6, distancia: 19 },
  { angulo: 20, distancia: 23 },
  { angulo: 8, distancia: 28 },
];

const GRADOS = Math.PI / 180;

function amarres(): Amarre[] {
  return ABANICO.map((a, indice) => {
    const rad = a.angulo * GRADOS;
    const x = Math.sin(rad) * a.distancia;
    const z = -Math.cos(rad) * a.distancia;
    /* La plataforma mira hacia la playa (+z); las del abanico, hacia la cabeza del muelle. */
    const giro = indice === 0 ? 0 : Math.atan2(-x, -z) + Math.PI;
    /* Los ejes de la plataforma en el mundo: `d` su lado largo (x local), `n` su lado corto (z local). */
    const dx = Math.cos(giro);
    const dz = -Math.sin(giro);
    const nx = Math.sin(giro);
    const nz = Math.cos(giro);
    /*
     * EL BARCO, AL COSTADO Y DEL LADO DEL MAR. La plataforma del pack mide 10,9 de
     * largo por 2,7 de ancho y el barco 12,4 por 5,5: puesto en la punta del lado
     * largo, como estaba, el casco atravesaba las tablas. Va paralelo a ella, a 5,5
     * del centro por el lado corto que da al mar —el opuesto a la cámara en la
     * cabeza del muelle, el opuesto a la cabeza en el abanico— y corrido 3,5 por el
     * lado largo, para que el mástil no tape al aventurero desde la cámara.
     */
    const lado = indice === 0 ? -1 : 1;
    const costado = 5.5;
    const corrido = 3.5;
    const barcoX = x + nx * costado * lado + dx * corrido;
    const barcoZ = z + nz * costado * lado + dz * corrido;
    return {
      indice,
      x,
      z,
      giro,
      pie: { x, y: 0, z },
      barco: { x: barcoX, z: barcoZ, giro: giro + Math.PI / 2 },
      bandera: { x: x - dx * 1.7, z: z - dz * 1.7 },
      farol: { x: x + dx * 1.6, z: z + dz * 1.6 - 1.0 },
      llegadaDesde: { x: barcoX - SOL.x * 70 * 0.4, z: barcoZ - 70 },
    };
  });
}

/** El muelle de madera: de la cabeza (el amarre 0) hacia la playa, a tramos de seis unidades. */
function tramosDelMuelle(): TramoDeMuelle[] {
  return [
    { x: 0, z: 6, giro: 0 },
    { x: 0, z: 12, giro: 0 },
  ];
}

/* ─────────────────────────── La línea de costa ─────────────────────────── */

/**
 * ¿ES TIERRA ESTE PUNTO? La única función de forma; todo lo demás la consulta.
 *
 * La semilla ondula el radio del remanso unos tres metros, salvo hacia la playa
 * (+z), donde se anula: si el remanso creciera hacia atrás, el muelle aterrizaría
 * en el agua; si encogiera, las tablas quedarían sobre hierba. Y nunca baja de
 * 21 u, que es lo que deja a los seis amarres una tesela de margen.
 */
function esTierra(x: number, z: number, fase1: number, fase2: number): boolean {
  const dx = x - CENTRO_DEL_REMANSO.x;
  const dz = z - CENTRO_DEL_REMANSO.z;
  const d = Math.hypot(dx, dz);
  if (d >= RADIO_DE_LA_CALA) return false;
  const angulo = Math.atan2(dz, dx);
  const haciaLaPlaya = Math.max(0, Math.sin(angulo));
  const peso = 1 - haciaLaPlaya * haciaLaPlaya;
  const costa = RADIO_DEL_REMANSO + peso * (2 * Math.sin(3 * angulo + fase1) + Math.sin(5 * angulo + fase2));
  if (d <= costa) return false;
  if (dz < 0) {
    const boca = MEDIA_BOCA + APERTURA_DE_LA_BOCA * -dz;
    if (Math.abs(dx) < boca) return false;
  }
  return true;
}

function esTerraza(x: number, z: number): boolean {
  return Math.hypot(x - CENTRO_DE_LA_TERRAZA.x, z - CENTRO_DE_LA_TERRAZA.z) < RADIO_DE_LA_TERRAZA;
}

/* ─────────────── La pieza de orilla: réplica mínima de `aguas.ts` ─────────────── */

/** Una tirada contigua de lados con agua: cuántos y en cuál empieza. `null` si no es una sola tirada. */
function tiradaDe(bits: number): { largo: number; primero: number } | null {
  let cuantos = 0;
  for (let k = 0; k < 6; k++) if ((bits & (1 << k)) !== 0) cuantos++;
  if (cuantos === 0) return { largo: 0, primero: 0 };
  if (cuantos > 4) return null;
  let primero = -1;
  let arranques = 0;
  for (let k = 0; k < 6; k++) {
    if ((bits & (1 << k)) === 0) continue;
    if ((bits & (1 << ((k + 5) % 6))) !== 0) continue;
    arranques++;
    primero = k;
  }
  if (arranques !== 1) return null;
  return { largo: cuantos, primero };
}

/** Si el patrón no tiene pieza, la tirada más larga de hasta cuatro lados; seis lados es una isla. */
function tiradaMasLarga(bits: number): number {
  if (bits === 0b111111) return 0b001111;
  let mejor = 0;
  let mejorLargo = 0;
  for (let inicio = 0; inicio < 6; inicio++) {
    if ((bits & (1 << inicio)) === 0) continue;
    if ((bits & (1 << ((inicio + 5) % 6))) !== 0) continue;
    let largo = 0;
    let tramo = 0;
    for (let k = 0; k < 6; k++) {
      const lado = (inicio + k) % 6;
      if ((bits & (1 << lado)) === 0) break;
      if (largo === 4) break;
      tramo |= 1 << lado;
      largo++;
    }
    if (largo > mejorLargo) {
      mejorLargo = largo;
      mejor = tramo;
    }
  }
  return mejor;
}

/**
 * La pieza de costa para un conjunto de lados con agua. Los «primeros canónicos»
 * están medidos sobre los `.gltf` del pack (ver `aguas.ts`): la A trae su agua en
 * el lado 5 y las otras tres en el 4. La E no tiene agua y no se usa.
 */
export function piezaDeOrillaDeLaCala(bits: number): { pieza: NombreDePieza; giro: number } | null {
  const tirada = tiradaDe(bits) ?? tiradaDe(tiradaMasLarga(bits));
  if (tirada === null || tirada.largo === 0) return null;
  const cuales: readonly { pieza: NombreDePieza; canonico: number }[] = [
    { pieza: PIEZA.orillaA, canonico: 5 },
    { pieza: PIEZA.orillaB, canonico: 4 },
    { pieza: PIEZA.orillaC, canonico: 4 },
    { pieza: PIEZA.orillaD, canonico: 4 },
  ];
  const cual = cuales[tirada.largo - 1];
  if (cual === undefined) return null;
  return {
    pieza: cual.pieza,
    giro: ((((tirada.primero - cual.canonico) % 6) + 6) % 6) * (Math.PI / 3),
  };
}

/* ────────────────────────── De punto a tesela ────────────────────────── */

/** La subtesela bajo un punto del mundo (x, z). La inversa de `centroDeHex`, redondeada en cubo. */
export function hexBajo(x: number, z: number): Hex {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * z) / R;
  const r = ((2 / 3) * z) / R;
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

export function llaveDeTesela(q: number, r: number): string {
  return `${String(q)},${String(r)}`;
}

/** La tesela bajo un punto, si la cala la tiene. Fuera de la malla, `undefined`: es mar. */
export function teselaBajo(cala: Cala, x: number, z: number): TeselaDeLaCala | undefined {
  const h = hexBajo(x, z);
  return cala.teselas.find((t) => t.q === h.q && t.r === h.r);
}

/* ─────────────────────────────── La cala ─────────────────────────────── */

/** Cuántas teselas de malla hacen falta para cubrir el semicírculo entero con una de sobra. */
const RADIO_DE_LA_MALLA = 9;

export function generarCala(semilla: number): Cala {
  const azar = sorteo(semilla);
  const fase1 = azar() * Math.PI * 2;
  const fase2 = azar() * Math.PI * 2;
  const tierra = (x: number, z: number): boolean => esTierra(x, z, fase1, fase2);

  /* 1. La rejilla, clasificada. */
  const malla = mallaDeRadio(RADIO_DE_LA_MALLA);
  const esTierraEn = new Map<string, boolean>();
  for (const h of malla) {
    const c = centroDeHex(h, R);
    esTierraEn.set(llaveDeTesela(h.q, h.r), tierra(c.x, c.y));
  }
  const tierraEn = (h: Hex): boolean => esTierraEn.get(llaveDeTesela(h.q, h.r)) ?? false;

  const teselas: TeselaDeLaCala[] = [];
  for (const h of malla) {
    const c = centroDeHex(h, R);
    if (!tierraEn(h)) {
      teselas.push({ q: h.q, r: h.r, x: c.x, z: c.y, clase: 'agua', nivel: 0, pieza: null, giro: 0 });
      continue;
    }
    let bits = 0;
    vecinos(h).forEach((v, k) => {
      if (!tierraEn(v)) bits |= 1 << k;
    });
    const nivel: 0 | 1 = esTerraza(c.x, c.y) ? 1 : 0;
    if (bits === 0) {
      teselas.push({ q: h.q, r: h.r, x: c.x, z: c.y, clase: 'tierra', nivel, pieza: PIEZA.tesela, giro: 0 });
      continue;
    }
    const orilla = piezaDeOrillaDeLaCala(bits);
    /* Una orilla en la terraza sería una playa a cinco metros sobre el mar: la terraza se queda en tierra. */
    teselas.push({
      q: h.q,
      r: h.r,
      x: c.x,
      z: c.y,
      clase: 'orilla',
      nivel: 0,
      pieza: orilla?.pieza ?? PIEZA.tesela,
      giro: orilla?.giro ?? 0,
    });
  }

  const losAmarres = amarres();
  const elMuelle = tramosDelMuelle();
  const piezas: PiezaPuesta[] = [];
  const pon = (
    pieza: NombreDePieza,
    x: number,
    y: number,
    z: number,
    giro = 0,
    talla = 1,
    nivel = 0,
    animacion?: Animacion,
  ): void => {
    piezas.push(animacion === undefined ? { pieza, x, y, z, giro, talla, nivel } : { pieza, x, y, z, giro, talla, nivel, animacion });
  };

  /* 2. Los tramos del muelle y las plataformas de los amarres, que son la misma pieza. */
  for (const t of elMuelle) pon(PIEZA.muelle, t.x, 0, t.z, t.giro);

  /* 3. Debajo de la terraza, un fondo por tesela: sin él se vería el hueco entre los dos niveles. */
  for (const t of teselas) if (t.nivel === 1) pon(PIEZA.fondo, t.x, 0, t.z, 0, 1, 0);

  /* 4. Los trastos del muelle, a los lados de las tablas. Sitios fijos: son el primer plano. */
  pon(PIEZA.barril, 1.9, 0, 4.6, 0.4);
  pon(PIEZA.barril, 2.5, 0, 6.3, 1.9);
  pon(PIEZA.caja, -2.1, 0, 8.6, 0.2);
  pon(PIEZA.cajaGrande, -2.3, 0, 11.4, -0.3);
  pon(PIEZA.saco, 1.8, 0, 10.4, 2.4);
  pon(PIEZA.ancla, -1.7, 0, 3.4, 2.1);
  pon(PIEZA.cubo, 2.2, 0, 8.9, 0);
  pon(PIEZA.bote, -3.4, A_FLOTE, 6.0, 0.35, 1, 0, 'bote');

  /* 5. El caserío del embarque: en la terraza lo que cabe en ella, el resto en la pradera de al lado. */
  const terraza = teselas
    .filter((t) => t.nivel === 1)
    .sort(
      (a, b) =>
        Math.hypot(a.x - CENTRO_DE_LA_TERRAZA.x, a.z - CENTRO_DE_LA_TERRAZA.z) -
        Math.hypot(b.x - CENTRO_DE_LA_TERRAZA.x, b.z - CENTRO_DE_LA_TERRAZA.z),
    );
  const ocupadas = new Set<string>();
  const enLaTesela = (
    t: TeselaDeLaCala | undefined,
    pieza: NombreDePieza,
    giro: number,
    animacion?: Animacion,
  ): Punto3 => {
    if (t === undefined) return { x: 0, y: 0, z: 0 };
    ocupadas.add(llaveDeTesela(t.q, t.r));
    const y = t.nivel * ESCALON;
    pon(pieza, t.x, y, t.z, giro, 1, t.nivel, animacion);
    return { x: t.x, y, z: t.z };
  };
  const haciaElMuelle = (t: TeselaDeLaCala | undefined): number =>
    t === undefined ? 0 : Math.atan2(-t.x, -t.z) + Math.PI;
  const taberna = enLaTesela(terraza[0], PIEZA.taberna, haciaElMuelle(terraza[0]));
  enLaTesela(terraza[1], PIEZA.casa, haciaElMuelle(terraza[1]) + 0.3);
  enLaTesela(terraza[2], PIEZA.pozo, 0.6);
  enLaTesela(terraza[3], PIEZA.casaB, haciaElMuelle(terraza[3]) - 0.4);

  const tierraCerca = (x: number, z: number, nivel: 0 | 1 = 0): TeselaDeLaCala | undefined =>
    teselas
      .filter((t) => t.clase !== 'agua' && t.nivel === nivel && !ocupadas.has(llaveDeTesela(t.q, t.r)))
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
  const orillaCerca = (x: number, z: number): TeselaDeLaCala | undefined =>
    teselas
      .filter((t) => t.clase === 'orilla' && !ocupadas.has(llaveDeTesela(t.q, t.r)))
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];

  /*
   * El caserío del §2 y nada más: taberna, dos casas, pozo, astillero, atalaya y
   * molino. Hubo un mercado y una vigía (4.600 triángulos entre los dos) y se
   * quitaron para que seis aventureros de casi nueve mil triángulos cada uno
   * quepan en el presupuesto; `verify:embarcadero` suma la cala de verdad.
   */
  const astillero = orillaCerca(-27, -4);
  enLaTesela(astillero, PIEZA.astillero, haciaElMuelle(astillero) + Math.PI);
  const atalaya = enLaTesela(tierraCerca(-40, -38), PIEZA.atalaya, 0.2);
  enLaTesela(tierraCerca(-31, -54), PIEZA.molino, 0.9, 'molino');
  const varadero = orillaCerca(-14, 12);
  enLaTesela(varadero, PIEZA.varadero, haciaElMuelle(varadero) + 1.2);
  if (varadero !== undefined) pon(PIEZA.bote, varadero.x + 4.5, 0.1, varadero.z + 2.0, 0.9);
  const cerca = tierraCerca(24, 6);
  if (cerca !== undefined) {
    ocupadas.add(llaveDeTesela(cerca.q, cerca.r));
    pon(PIEZA.valla, cerca.x - 3, 0, cerca.z, 0.3);
    pon(PIEZA.vallaPuerta, cerca.x + 2.5, 0, cerca.z, 0.3);
    pon(PIEZA.almiar, cerca.x, 0, cerca.z - 3.5, 1.1);
    pon(PIEZA.carro, cerca.x + 1.5, 0, cerca.z + 3.2, 2.2);
  }

  /* 6. Lo sembrado en tierra: arboledas, árboles sueltos, tocones y rocas, lejos del muelle y del caserío. */
  const cercaDelMuelle = (t: TeselaDeLaCala): boolean => Math.hypot(t.x, t.z - 10) < 2 * R;
  /*
   * Sólo las arboledas medianas y pequeñas (480 y 432 triángulos): la grande y la
   * B pesan el doble y en una cala salían diez, o sea once mil triángulos de
   * follaje que se llevaban el presupuesto de dos aventureros.
   */
  const arboledas: readonly NombreDePieza[] = [PIEZA.arboledaMedia, PIEZA.arboledaPequena];
  const rocas: readonly NombreDePieza[] = [PIEZA.rocaA, PIEZA.rocaC];
  for (const t of teselas) {
    if (t.clase === 'agua' || ocupadas.has(llaveDeTesela(t.q, t.r)) || cercaDelMuelle(t)) continue;
    const u = azar();
    const giro = azar() * Math.PI * 2;
    const y = t.nivel * ESCALON;
    if (t.clase === 'orilla') {
      /* En la playa sólo rocas sueltas, y pocas: el resto es arena limpia. */
      if (u < 0.16) pon(rocas[u < 0.08 ? 0 : 1] ?? PIEZA.rocaA, t.x, y, t.z, giro, 0.7 + azar() * 0.5, t.nivel);
      continue;
    }
    if (t.nivel === 1) {
      if (u < 0.3) pon(PIEZA.arbolA, t.x, y, t.z, giro, 1, 1);
      continue;
    }
    if (u < 0.14) {
      const cual = arboledas[Math.floor(azar() * arboledas.length)] ?? PIEZA.arboledaMedia;
      pon(cual, t.x, y, t.z, giro, 0.9 + azar() * 0.3, 0);
    } else if (u < 0.46) {
      /* Tres árboles A (50 triángulos) por cada B (220): el B es el frondoso y se reserva. */
      pon(azar() < 0.75 ? PIEZA.arbolA : PIEZA.arbolB, t.x + (azar() - 0.5) * 3, y, t.z + (azar() - 0.5) * 3, giro, 0.9 + azar() * 0.4, 0);
    } else if (u < 0.52) {
      pon(PIEZA.tocon, t.x, y, t.z, giro, 1, 0);
    } else if (u < 0.6) {
      pon(rocas[azar() < 0.5 ? 0 : 1] ?? PIEZA.rocaA, t.x, y, t.z, giro, 0.8 + azar() * 0.6, 0);
    }
  }

  /* 7. Juncos y nenúfares en los remansos: en el agua pegada a cada orilla, del lado del agua. */
  /* Tres juncos ligeros por cada uno de los frondosos: el B pesa dos veces y media el A. */
  const juncos: readonly NombreDePieza[] = [PIEZA.juncoA, PIEZA.juncoA, PIEZA.juncoA, PIEZA.juncoB];
  for (const t of teselas) {
    if (t.clase !== 'orilla') continue;
    const u = azar();
    if (u > 0.5) continue;
    /* El lado del agua: la media de las direcciones hacia los vecinos mojados. */
    let dx = 0;
    let dz = 0;
    for (const v of vecinos({ q: t.q, r: t.r })) {
      if (tierraEn(v)) continue;
      const c = centroDeHex(v, R);
      dx += c.x - t.x;
      dz += c.y - t.z;
    }
    const largo = Math.hypot(dx, dz);
    if (largo < 1e-6) continue;
    dx /= largo;
    dz /= largo;
    const lejos = R * (0.75 + azar() * 0.5);
    const x = t.x + dx * lejos + (azar() - 0.5) * 2;
    const z = t.z + dz * lejos + (azar() - 0.5) * 2;
    /* Nada dentro del abanico de amarres: allí atracan barcos. */
    if (losAmarres.some((a) => Math.hypot(a.x - x, a.z - z) < 7)) continue;
    if (u < 0.3) pon(juncos[Math.floor(azar() * juncos.length)] ?? PIEZA.juncoA, x, LAMINA - 0.3, z, azar() * Math.PI * 2, 0.9 + azar() * 0.4);
    else pon(PIEZA.nenufarA, x, A_FLOTE, z, azar() * Math.PI * 2, 1);
  }

  /* 8. El fondo: montañas recortadas contra la brasa, colinas en las puntas, nubes bajas y dos barcos de nadie. */
  const montanas: readonly NombreDePieza[] = [PIEZA.montanaA, PIEZA.montanaB, PIEZA.montanaVerde];
  const cuantasMontanas = 8;
  for (let i = 0; i < cuantasMontanas; i++) {
    /* Repartidas por el arco frontal, con un poco de azar dentro de su sector para que no formen fila. */
    const sector = -75 + (150 * (i + 0.5)) / cuantasMontanas;
    const angulo = (sector + (azar() - 0.5) * 12) * GRADOS;
    const distancia = 190 + azar() * 220;
    const talla = 4.5 + azar() * 4;
    const cual = montanas[Math.floor(azar() * montanas.length)] ?? PIEZA.montanaA;
    pon(cual, Math.sin(angulo) * distancia, -0.6, -Math.cos(angulo) * distancia, azar() * Math.PI * 2, talla);
  }
  pon(PIEZA.colinasArboladas, 44, 0, -82, 0.4, 1.6);
  pon(PIEZA.colinaB, -46, 0, -78, 2.1, 1.5);
  const cuantasNubes = 6;
  for (let i = 0; i < cuantasNubes; i++) {
    const angulo = (-70 + (140 * (i + 0.5)) / cuantasNubes + (azar() - 0.5) * 14) * GRADOS;
    const distancia = 160 + azar() * 260;
    pon(
      /* Una grande y cinco pequeñas: la grande pesa casi el doble y de lejos no se nota. */
      i === 0 ? PIEZA.nubeGrande : PIEZA.nubePequena,
      Math.sin(angulo) * distancia,
      60 + azar() * 50,
      -Math.cos(angulo) * distancia,
      azar() * Math.PI * 2,
      3 + azar() * 3,
      0,
      'nube',
    );
  }
  for (let i = 0; i < 2; i++) {
    const angulo = (i === 0 ? -34 : 24) * GRADOS + (azar() - 0.5) * 10 * GRADOS;
    const distancia = 105 + azar() * 70;
    pon(PIEZA.barcoDeNadie, Math.sin(angulo) * distancia, A_FLOTE, -Math.cos(angulo) * distancia, azar() * Math.PI * 2, 1.4, 0, 'barco-de-nadie');
  }

  return {
    semilla,
    teselas,
    muelle: elMuelle,
    amarres: losAmarres,
    piezas,
    taberna,
    atalaya,
    sol: SOL,
  };
}

/* ─────────────────────── Lo que los comprobadores preguntan ─────────────────────── */

/** ¿Hay tablas de muelle bajo este punto? Una plataforma de amarre o un tramo, a menos de media pieza. */
export function hayMuelleEn(cala: Cala, x: number, z: number): boolean {
  const alcance = 3.6;
  if (cala.amarres.some((a) => Math.hypot(a.x - x, a.z - z) < alcance)) return true;
  return cala.muelle.some((t) => Math.hypot(t.x - x, t.z - z) < alcance);
}

/** Cuántas teselas de tierra (con orilla) tiene la cala. Debería rondar las noventa. */
export function teselasDeTierra(cala: Cala): number {
  return cala.teselas.filter((t) => t.clase !== 'agua').length;
}
