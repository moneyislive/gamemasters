/**
 * UNA CIUDAD DE ENSAYO PARA EL MAPA, y sólo para él: la usan `verify:quiebro-juego` y el banco del mapa
 * mientras `ciudadDeLaMesa` lance `CiudadSinEscribir` (la escribe el frente Traza, `docs/quiebro/
 * CIUDAD-ABIERTA.md` §6.3, ola A). El juego NO la importa nunca: una ciudad de mentira en la partida se
 * leería como la ciudad. En cuanto la de verdad exista, el comprobador mira las dos.
 *
 * ═══ QUÉ TIENE DE VERDAD Y QUÉ NO ═══
 *
 * Tiene la FORMA de la columna (`quiebro-ciudad.ts`), que es lo que el mapa lee:
 *   · la rejilla de 48 m: 11 × 11 huecos con solares de 36 m (30 junto a una avenida), 12 ejes por sentido,
 *     144 cruces y 264 tramos, en el orden y con los índices del contrato;
 *   · los cinco distritos del molinete (`distritoDelHueco` con la simetría 0), seis plazas con sus tres
 *     plantillas, ocho callejones de 6 m que parten la manzana en 15 + 6 + 15, soportales retranqueados 3 m
 *     con un pilar cada 6, el Elevado y el Bulevar de 24 m;
 *   · las cajas en el orden del contrato (cerco, manzanas, plazas, cabinas y refugios; y en la noche coches,
 *     quioscos y dos cortes de obra), 20 cabinas, 10 refugios y las 148 zonas con la numeración de verdad;
 *   · el grafo sólo por los ejes, un nudo cada 6 m y los 144 cruces primero (1.992 nudos por las calles,
 *     más las plazas y los callejones), y el de la noche sin las aristas que cruzan un corte.
 * Y simplifica lo que el mapa no lee: una sola línea de grafo por avenida, sin pilares del viaducto ni
 * troncos, sin farolas, sin fachadas ni rótulos, y la red de aceras vacía.
 */
import type { Cara, Eje, Punto, Rectangulo, SitioDelBarrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import type {
  AvenidaDeLaCiudad,
  CabinaDeLaCiudad,
  CajaDeLaCiudad,
  CalleDeLaCiudad,
  CallejonDeLaCiudad,
  CeldaDeLaCiudad,
  CiudadDeLaMesa,
  ClaseDeCalle,
  CorteDeObra,
  EdificioDeLaCiudad,
  GrafoDeLaCiudad,
  HuecoDeLaCiudad,
  IdDeDistrito,
  IdDePlantilla,
  LadoDelTramo,
  NocheDeLaCiudad,
  PlazaDeLaCiudad,
  RefugioDeLaCiudad,
  TipoDeCajaDeLaCiudad,
  TramoDeLaCiudad,
  ZonaDeLaCiudad,
} from '../../../../shared/arcade/juegos/quiebro-ciudad';
import {
  CELDA_MAXIMA,
  CELDA_MINIMA,
  CLASE_DE_ZONA_DE_CABINA,
  CLASE_DE_ZONA_DE_REFUGIO,
  EJES_DE_LA_CIUDAD,
  HUECO_MAXIMO,
  campoHasta,
  celdaDe,
  claseDeZonaDeArca,
  claseDeZonaDePlaza,
  distritoDelHueco,
  idDeZonaDeArca,
  idDeZonaDeCabina,
  idDeZonaDePlaza,
  idDeZonaDeRefugio,
  indiceDeCelda,
  indiceDeHueco,
  rectanguloDeLaCelda,
} from '../../../../shared/arcade/juegos/quiebro-ciudad';

/** El código de la mesa de ensayo. */
export const CODIGO_DE_ENSAYO = 'ENSAYO';

/** Las plazas de ensayo: número, hueco y plantilla. La 1, la Glorieta, en (0, 0). */
const PLAZAS: readonly { readonly i: number; readonly j: number; readonly plantilla: IdDePlantilla }[] = [
  { i: 0, j: 0, plantilla: 'glorieta' },
  { i: 1, j: 2, plantilla: 'porticada' },
  { i: -3, j: 1, plantilla: 'porticada' },
  { i: 0, j: -4, plantilla: 'patio' },
  { i: 4, j: -1, plantilla: 'glorieta' },
  { i: -1, j: 3, plantilla: 'glorieta' },
];

/** Los Fallos de la noche de ensayo: la Bajada en la Glorieta y un trío válido (192 m entre cada dos). */
export const FALLOS_DE_ENSAYO: readonly number[] = [1, 3, 6];

/** Los callejones: hueco y eje por el que corre el pasaje. */
const CALLEJONES: readonly { readonly i: number; readonly j: number; readonly eje: Eje }[] = [
  { i: -1, j: -1, eje: 'z' },
  { i: 1, j: 1, eje: 'x' },
  { i: -2, j: 1, eje: 'z' },
  { i: -4, j: -1, eje: 'x' },
  { i: -1, j: -4, eje: 'z' },
  { i: 2, j: -5, eje: 'x' },
  { i: -3, j: 4, eje: 'z' },
  { i: -4, j: 4, eje: 'x' },
];

const PLANTAS: Readonly<Record<IdDeDistrito, number>> = { casco: 4, ensanche: 6, lonja: 4, naves: 2, torres: 16 };
const ESTILO = { casco: 'piedra', ensanche: 'ladrillo', lonja: 'revoco', naves: 'hormigon', torres: 'vidrio' } as const;

function soportalesDe(distrito: IdDeDistrito, i: number, j: number): readonly Cara[] {
  if (distrito === 'casco' && (((i + j) % 3) + 3) % 3 === 0) return ['sur', 'este'];
  if (distrito === 'lonja' && (((i + j) % 2) + 2) % 2 === 0) return ['norte'];
  if (distrito === 'ensanche' && (i * j) % 4 === 0) return ['oeste'];
  return [];
}

const EJE = EJES_DE_LA_CIUDAD;
const clave = (x: number, z: number): string => `${String(x)},${String(z)}`;

function claseDeLaLinea(eje: Eje, linea: number): ClaseDeCalle {
  if (Math.abs(linea) === 264) return 'exterior';
  if ((eje === 'x' && linea === -120) || (eje === 'z' && linea === 120)) return 'avenida';
  if (Math.abs(linea) === 120) return 'mayor';
  return 'calle';
}

let hecha: CiudadDeLaMesa | null = null;

/** LA CIUDAD DE ENSAYO (una sola, guardada). */
export function ciudadDeEnsayo(): CiudadDeLaMesa {
  if (hecha !== null) return hecha;
  const cajas: CajaDeLaCiudad[] = [];
  const meter = (r: Rectangulo, tipo: TipoDeCajaDeLaCiudad, alto: number, extra: Partial<Pick<CajaDeLaCiudad, 'edificio' | 'despejable' | 'hueco' | 'plaza' | 'mira'>> = {}): number => {
    cajas.push({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, tipo, clase: 'alta', alto, mira: extra.mira ?? 0, edificio: extra.edificio ?? null, despejable: extra.despejable ?? false, hueco: extra.hueco ?? null, plaza: extra.plaza ?? 0 });
    return cajas.length - 1;
  };

  /* 1. El cerco. */
  meter({ x0: -272, z0: -272, x1: 272, z1: -270 }, 'fachada-exterior', 14);
  meter({ x0: -272, z0: 270, x1: 272, z1: 272 }, 'fachada-exterior', 14);
  meter({ x0: -272, z0: -270, x1: -270, z1: 270 }, 'fachada-exterior', 14);
  meter({ x0: 270, z0: -270, x1: 272, z1: 270 }, 'fachada-exterior', 14);

  /* Los huecos y sus solares (30 m en el eje en que dan a una avenida). */
  const plazaDelHueco = (i: number, j: number): number => PLAZAS.findIndex((p) => p.i === i && p.j === j) + 1;
  const callejonDelHueco = (i: number, j: number): Eje | null => CALLEJONES.find((c) => c.i === i && c.j === j)?.eje ?? null;
  const solarDe = (i: number, j: number): Rectangulo => {
    let x0 = 48 * i - 18;
    let x1 = 48 * i + 18;
    let z0 = 48 * j - 18;
    let z1 = 48 * j + 18;
    if (j === -3) z1 -= 6;
    if (j === -2) z0 += 6;
    if (j >= -2 && i === 2) x1 -= 6;
    if (j >= -2 && i === 3) x0 += 6;
    return { x0, z0, x1, z1 };
  };

  /* 2. Las manzanas, hueco a hueco: edificio (dos con callejón) y los pilares de sus soportales. */
  const huecos: HuecoDeLaCiudad[] = [];
  const edificios: EdificioDeLaCiudad[] = [];
  const callejones: CallejonDeLaCiudad[] = [];
  for (let j = -HUECO_MAXIMO; j <= HUECO_MAXIMO; j++) {
    for (let i = -HUECO_MAXIMO; i <= HUECO_MAXIMO; i++) {
      const indice = indiceDeHueco(i, j);
      const distrito = distritoDelHueco(0, i, j);
      const solar = solarDe(i, j);
      const plaza = plazaDelHueco(i, j);
      const pasaje = plaza > 0 ? null : callejonDelHueco(i, j);
      const soportales = plaza > 0 || pasaje !== null ? [] : soportalesDe(distrito, i, j);
      const suyos: number[] = [];
      if (plaza === 0) {
        const partes: Rectangulo[] =
          pasaje === 'z'
            ? [
                { ...solar, x1: 48 * i - 3 },
                { ...solar, x0: 48 * i + 3 },
              ]
            : pasaje === 'x'
              ? [
                  { ...solar, z1: 48 * j - 3 },
                  { ...solar, z0: 48 * j + 3 },
                ]
              : [solar];
        if (pasaje !== null) {
          const caja = pasaje === 'z' ? { x0: 48 * i - 3, z0: solar.z0, x1: 48 * i + 3, z1: solar.z1 } : { x0: solar.x0, z0: 48 * j - 3, x1: solar.x1, z1: 48 * j + 3 };
          callejones.push({ hueco: indice, eje: pasaje, caja, nombre: callejones.length });
        }
        for (const huella of partes) {
          const e = edificios.length;
          const choque = {
            x0: huella.x0 + (soportales.includes('oeste') ? 3 : 0),
            z0: huella.z0 + (soportales.includes('norte') ? 3 : 0),
            x1: huella.x1 - (soportales.includes('este') ? 3 : 0),
            z1: huella.z1 - (soportales.includes('sur') ? 3 : 0),
          };
          const caja = meter(choque, 'edificio', PLANTAS[distrito] * 3.25, { edificio: e, hueco: indice });
          const pilares: number[] = [];
          for (const cara of soportales) {
            const largo = cara === 'norte' || cara === 'sur' ? huella.x1 - huella.x0 : huella.z1 - huella.z0;
            for (let d = 3; d < largo; d += 6) {
              const r =
                cara === 'norte'
                  ? { x0: huella.x0 + d - 0.5, z0: huella.z0, x1: huella.x0 + d + 0.5, z1: huella.z0 + 1 }
                  : cara === 'sur'
                    ? { x0: huella.x0 + d - 0.5, z0: huella.z1 - 1, x1: huella.x0 + d + 0.5, z1: huella.z1 }
                    : cara === 'oeste'
                      ? { x0: huella.x0, z0: huella.z0 + d - 0.5, x1: huella.x0 + 1, z1: huella.z0 + d + 0.5 }
                      : { x0: huella.x1 - 1, z0: huella.z0 + d - 0.5, x1: huella.x1, z1: huella.z0 + d + 0.5 };
              pilares.push(meter(r, 'pilar-de-soportal', 3.5, { edificio: e, hueco: indice }));
            }
          }
          edificios.push({
            indice: e,
            hueco: indice,
            distrito,
            huella,
            tramos: [],
            alto: PLANTAS[distrito] * 3.25,
            estilo: ESTILO[distrito],
            tono: 0.5,
            vano: 3,
            balcones: false,
            semilla: e * 7919,
            fachadas: [],
            soportales,
            caja,
            pilares,
          });
          suyos.push(e);
        }
      }
      huecos.push({ indice, i, j, distrito, solar, uso: plaza > 0 ? 'plaza' : pasaje !== null ? 'callejon' : 'edificio', callejon: pasaje, plaza, soportales, edificios: suyos });
    }
  }

  /* 3. Las avenidas (en el ensayo, sin pilares ni troncos). */
  const avenidas: AvenidaDeLaCiudad[] = [
    { id: 'elevado', eje: 'x', linea: -120, desde: -270, hasta: 270, ancho: 24, cajas: [] },
    { id: 'bulevar', eje: 'z', linea: 120, desde: -120, hasta: 270, ancho: 24, cajas: [] },
  ];

  /* 4. Las plazas, de la 1 a la 6: lo fijo de su plantilla, lejos de las líneas del grafo que la cruzan. */
  const plazas: PlazaDeLaCiudad[] = [];
  PLAZAS.forEach((p, k) => {
    const numero = k + 1;
    const cx = 48 * p.i;
    const cz = 48 * p.j;
    const hueco = indiceDeHueco(p.i, p.j);
    const d = { hueco, plaza: numero };
    if (p.plantilla === 'glorieta') {
      meter({ x0: cx - 11, z0: cz - 11, x1: cx - 8, z1: cz - 8 }, 'quiosco', 3, d);
      meter({ x0: cx + 6, z0: cz + 6, x1: cx + 10, z1: cz + 10 }, 'fuente', 1.2, d);
      meter({ x0: cx - 14, z0: cz + 8, x1: cx - 12, z1: cz + 8.5 }, 'banco', 0.5, { ...d, despejable: true });
    } else if (p.plantilla === 'porticada') {
      meter({ x0: cx + 8, z0: cz - 11, x1: cx + 10, z1: cz - 9 }, 'estatua', 4, d);
    } else {
      meter({ x0: cx - 14, z0: cz - 12, x1: cx - 8, z1: cz - 9.5 }, 'contenedor', 2.6, d);
      meter({ x0: cx + 8, z0: cz + 9, x1: cx + 14, z1: cz + 11.5 }, 'contenedor', 2.6, d);
      meter({ x0: cx + 8, z0: cz - 16, x1: cx + 16, z1: cz - 13 }, 'muelle', 1.1, d);
    }
  });

  /* 5. Las cabinas (4 por distrito) y los refugios (2 por distrito), en la acera de su manzana. */
  const huecosDeCabina: readonly (readonly [number, number])[] = [
    [-1, 1], [2, 0], [0, 2], [-2, -1],
    [4, 0], [5, -1], [3, 3], [5, 5],
    [-1, 5], [1, 4], [-4, 5], [-2, 3],
    [-5, 1], [-3, -1], [-5, -4], [-4, 2],
    [0, -3], [3, -4], [-2, -5], [5, -3],
  ];
  const cabinas: CabinaDeLaCiudad[] = [];
  for (const [i, j] of huecosDeCabina) {
    const poste = { x: 48 * i - 5.5, z: 48 * j - 19 };
    const caja = meter({ x0: poste.x - 0.5, z0: poste.z - 0.5, x1: poste.x + 0.5, z1: poste.z + 0.5 }, 'cabina', 2.4, { mira: 0 });
    const f = j + 5;
    const c = i + 5;
    cabinas.push({ indice: cabinas.length, distrito: distritoDelHueco(0, i, j), poste, mira: 0, sitio: { x: poste.x, z: poste.z - 1.5 }, zona: idDeZonaDeCabina(cabinas.length), caja, tramo: f * 11 + c });
  }
  const huecosDeRefugio: readonly (readonly [number, number])[] = [
    [1, -1], [-1, 2], [4, 1], [3, 4], [2, 5], [-4, 3], [-5, -1], [-3, 0], [1, -5], [-2, -4],
  ];
  const refugios: RefugioDeLaCiudad[] = [];
  for (const [i, j] of huecosDeRefugio) {
    const caja = meter({ x0: 48 * i + 4, z0: 48 * j + 18.5, x1: 48 * i + 6, z1: 48 * j + 20.5 }, 'refugio', 2.6);
    const sitios: SitioDelBarrio[] = [8, 10, 12].map((dx) => ({ x: 48 * i + dx, z: 48 * j + 22.5, rumbo: 0 }));
    const f = j + 6;
    const c = i + 5;
    refugios.push({ indice: refugios.length, distrito: distritoDelHueco(0, i, j), sitios, zona: idDeZonaDeRefugio(refugios.length), caja, tramo: f * 11 + c });
  }

  /* Las calles y los tramos, en el orden del contrato. */
  const calles: CalleDeLaCiudad[] = [];
  EJE.forEach((linea) => {
    const clase = claseDeLaLinea('x', linea);
    calles.push({ indice: calles.length, eje: 'x', linea, clase, ancho: clase === 'avenida' ? 24 : 12, nombre: clase === 'avenida' ? -1 : calles.length });
  });
  EJE.forEach((linea) => {
    const clase = claseDeLaLinea('z', linea);
    calles.push({ indice: calles.length, eje: 'z', linea, clase, ancho: clase === 'avenida' ? 24 : 12, nombre: clase === 'avenida' ? -1 : calles.length });
  });
  const cruces: Punto[] = [];
  for (let f = 0; f < 12; f++) for (let c = 0; c < 12; c++) cruces.push({ x: EJE[c] as number, z: EJE[f] as number });
  const ladoDe = (i: number, j: number, cara: Cara): LadoDelTramo => {
    if (Math.abs(i) > HUECO_MAXIMO || Math.abs(j) > HUECO_MAXIMO) return { hueco: null, frente: 'borde', soportal: false };
    const h = huecos[indiceDeHueco(i, j)] as HuecoDeLaCiudad;
    return { hueco: h.indice, frente: h.uso, soportal: h.soportales.includes(cara) };
  };
  const tramos: TramoDeLaCiudad[] = [];
  for (let f = 0; f < 12; f++) {
    for (let c = 0; c < 11; c++) {
      const linea = EJE[f] as number;
      const lados: [LadoDelTramo, LadoDelTramo] = [ladoDe(c - 5, f - 6, 'sur'), ladoDe(c - 5, f - 5, 'norte')];
      const clase = claseDeLaLinea('x', linea);
      tramos.push({ indice: tramos.length, calle: f, eje: 'x', centro: linea, desde: EJE[c] as number, hasta: EJE[c + 1] as number, cruces: [f * 12 + c, f * 12 + c + 1], clase, ancho: clase === 'avenida' ? 24 : 12, lados, daAPlaza: lados[0].frente === 'plaza' || lados[1].frente === 'plaza' });
    }
  }
  for (let c = 0; c < 12; c++) {
    for (let f = 0; f < 11; f++) {
      const linea = EJE[c] as number;
      const lados: [LadoDelTramo, LadoDelTramo] = [ladoDe(c - 6, f - 5, 'este'), ladoDe(c - 5, f - 5, 'oeste')];
      const desde = EJE[f] as number;
      const clase = linea === 120 && desde < -120 ? 'mayor' : claseDeLaLinea('z', linea);
      tramos.push({ indice: tramos.length, calle: 12 + c, eje: 'z', centro: linea, desde, hasta: EJE[f + 1] as number, cruces: [f * 12 + c, (f + 1) * 12 + c], clase, ancho: clase === 'avenida' ? 24 : 12, lados, daAPlaza: lados[0].frente === 'plaza' || lados[1].frente === 'plaza' });
    }
  }

  /* El grafo: los cruces, las calles (un nudo cada 6 m), las plazas y los callejones. */
  const nudos: Punto[] = [...cruces];
  const cual = new Map<string, number>();
  cruces.forEach((p, n) => cual.set(clave(p.x, p.z), n));
  const aristas: { a: number; b: number; largo: number; tramo: number | null }[] = [];
  const nudo = (x: number, z: number): number => {
    const k = clave(x, z);
    const ya = cual.get(k);
    if (ya !== undefined) return ya;
    nudos.push({ x, z });
    cual.set(k, nudos.length - 1);
    return nudos.length - 1;
  };
  for (const t of tramos) {
    let antes = t.cruces[0];
    for (let s = 1; s <= 8; s++) {
      const d = t.desde + 6 * s;
      const n = s === 8 ? t.cruces[1] : t.eje === 'x' ? nudo(d, t.centro) : nudo(t.centro, d);
      aristas.push({ a: antes, b: n, largo: 6, tramo: t.indice });
      antes = n;
    }
  }
  for (const p of PLAZAS) {
    const cx = 48 * p.i;
    const cz = 48 * p.j;
    const centro = nudo(cx, cz);
    for (const [dx, dz] of [
      [0, -24],
      [24, 0],
      [0, 24],
      [-24, 0],
    ] as const) {
      const borde = cual.get(clave(cx + dx, cz + dz));
      if (borde !== undefined) aristas.push({ a: centro, b: borde, largo: 24, tramo: null });
    }
  }
  for (const c of callejones) {
    const h = huecos[c.hueco] as HuecoDeLaCiudad;
    const cx = 48 * h.i;
    const cz = 48 * h.j;
    let antes = c.eje === 'z' ? nudo(cx, cz - 24) : nudo(cx - 24, cz);
    for (let s = 1; s <= 8; s++) {
      const d = -24 + 6 * s;
      const n = c.eje === 'z' ? nudo(cx, cz + d) : nudo(cx + d, cz);
      aristas.push({ a: antes, b: n, largo: 6, tramo: null });
      antes = n;
    }
  }
  const grafo: GrafoDeLaCiudad = { nudos, aristas };

  /* Las plazas con su nudo, sus sitios de asiento y su objeto. */
  PLAZAS.forEach((p, k) => {
    const cx = 48 * p.i;
    const cz = 48 * p.j;
    const hueco = huecos[indiceDeHueco(p.i, p.j)] as HuecoDeLaCiudad;
    plazas.push({
      numero: k + 1,
      hueco: hueco.indice,
      distrito: hueco.distrito,
      plantilla: p.plantilla,
      nombre: k,
      centro: { x: cx, z: cz },
      limite: { x0: cx - 30, z0: cz - 30, x1: cx + 30, z1: cz + 30 },
      nudo: cual.get(clave(cx, cz)) as number,
      objeto: { x: cx, z: cz - 6 },
      nace: [-5, -3, -1, 1, 3, 5].map((dx) => ({ x: cx + dx, z: cz + 4, rumbo: 0 })),
    });
  });

  /* Las zonas, en orden de id. */
  const zonas: ZonaDeLaCiudad[] = [];
  const cuadro = (x: number, z: number, m: number): Rectangulo => ({ x0: x - m, z0: z - m, x1: x + m, z1: z + m });
  const IMPRESION = [[-12, -4], [-4, -12], [4, -12], [12, -4], [12, 4], [4, 12], [-4, 12], [-12, 4]] as const;
  const BOCAS = [[22, 6], [22, -6], [-22, 6], [-22, -6], [6, 22], [-6, 22], [6, -22], [-6, -22]] as const;
  for (const p of plazas) {
    const { x, z } = p.centro;
    zonas.push({ id: idDeZonaDePlaza(p.numero, 'fallo', 0), clase: claseDeZonaDePlaza(p.numero, 'fallo'), caja: cuadro(x, z, 2) });
    IMPRESION.forEach(([dx, dz], k) => zonas.push({ id: idDeZonaDePlaza(p.numero, 'impresion', k), clase: claseDeZonaDePlaza(p.numero, 'impresion'), caja: cuadro(x + dx, z + dz, 1) }));
    BOCAS.forEach(([dx, dz], k) => zonas.push({ id: idDeZonaDePlaza(p.numero, 'boca', k), clase: claseDeZonaDePlaza(p.numero, 'boca'), caja: cuadro(x + dx, z + dz, 1) }));
  }
  for (const c of cabinas) zonas.push({ id: c.zona, clase: CLASE_DE_ZONA_DE_CABINA, caja: cuadro(c.sitio.x, c.sitio.z, 0.5) });
  for (const r of refugios) {
    const a = r.sitios[0] as SitioDelBarrio;
    const b = r.sitios[r.sitios.length - 1] as SitioDelBarrio;
    zonas.push({ id: r.zona, clase: CLASE_DE_ZONA_DE_REFUGIO, caja: { x0: a.x - 1, z0: a.z - 1, x1: b.x + 1, z1: b.z + 1 } });
  }
  for (let k = 0; k < 16; k++) {
    const i = (k % 8) - 4;
    const j = k < 8 ? -2 : 2;
    zonas.push({ id: idDeZonaDeArca(k), clase: claseDeZonaDeArca(k), caja: cuadro(48 * i + 12, 48 * j + 22.5, 1) });
  }

  /* Las distancias entre plazas, por calles y con el grafo base. */
  const distancias = plazas.map((a) => {
    const campo = campoHasta(grafo, a.nudo);
    return plazas.map((b) => campo.metros[b.nudo] as number);
  });

  /* Las celdas del cliente. */
  const seTocan = (a: Rectangulo, b: Rectangulo): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
  const celdas: CeldaDeLaCiudad[] = [];
  for (let j = CELDA_MINIMA; j <= CELDA_MAXIMA; j++) {
    for (let i = CELDA_MINIMA; i <= CELDA_MAXIMA; i++) {
      const caja = rectanguloDeLaCelda(i, j);
      const dentro = Math.abs(i) <= HUECO_MAXIMO && Math.abs(j) <= HUECO_MAXIMO;
      const deLaCelda: number[] = [];
      cajas.forEach((c, n) => {
        const celda = celdaDe((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2);
        if (celda !== null && celda.i === i && celda.j === j) deLaCelda.push(n);
      });
      celdas.push({
        i,
        j,
        indice: indiceDeCelda(i, j),
        caja,
        hueco: dentro ? indiceDeHueco(i, j) : null,
        distrito: dentro ? distritoDelHueco(0, i, j) : null,
        edificios: edificios.filter((e) => seTocan(e.huella, caja)).map((e) => e.indice),
        tramos: tramos
          .filter((t) => {
            const m = t.ancho / 2;
            const r = t.eje === 'x' ? { x0: t.desde, z0: t.centro - m, x1: t.hasta, z1: t.centro + m } : { x0: t.centro - m, z0: t.desde, x1: t.centro + m, z1: t.hasta };
            return seTocan(r, caja);
          })
          .map((t) => t.indice),
        cajas: deLaCelda,
      });
    }
  }

  hecha = {
    traza: 0,
    dibujo: 0,
    simetria: 0,
    codigo: CODIGO_DE_ENSAYO,
    huecos,
    plazas,
    calles,
    cruces,
    tramos,
    avenidas,
    callejones,
    edificios,
    rotulos: [],
    cajas,
    cabinas,
    refugios,
    zonas,
    grafo,
    aceras: { nudos: [], tramos: [] },
    distancias,
    celdas,
  };
  return hecha;
}

/** ¿Pasa la arista `a-b` (por un eje) a 0,35 m o menos de la caja? */
function cortaLaArista(grafo: GrafoDeLaCiudad, a: number, b: number, c: Rectangulo): boolean {
  const p = grafo.nudos[a] as Punto;
  const q = grafo.nudos[b] as Punto;
  const r = 0.35;
  return Math.min(p.x, q.x) - r < c.x1 && c.x0 < Math.max(p.x, q.x) + r && Math.min(p.z, q.z) - r < c.z1 && c.z0 < Math.max(p.z, q.z) + r;
}

/** Los tramos de ensayo con obra: uno por `x` y otro por `z`, que no dan a ninguna plaza. */
const TRAMOS_CON_OBRA: readonly number[] = [6 * 11 + 7, 132 + 4 * 11 + 3];

/**
 * UNA NOCHE DE ENSAYO: coches en uno de cada tres tramos que no dan a una plaza, quioscos de prensa, y dos
 * cortes de obra (si `conCortes`), con el grafo de la noche sin lo que cruzan. `fallos` como en el contrato.
 */
export function nocheDeEnsayo(noche = 1, fallos: readonly number[] = FALLOS_DE_ENSAYO, conCortes = true): NocheDeLaCiudad {
  const ciudad = ciudadDeEnsayo();
  const cajas: CajaDeLaCiudad[] = [...ciudad.cajas];
  const meter = (r: Rectangulo, tipo: TipoDeCajaDeLaCiudad, alto: number, despejable = false): number => {
    cajas.push({ ...r, tipo, clase: 'alta', alto, mira: 0, edificio: null, despejable, hueco: null, plaza: 0 });
    return cajas.length - 1;
  };
  /* 6. Lo de las calles de la noche, tramo a tramo. */
  for (const t of ciudad.tramos) {
    if (t.daAPlaza || t.clase === 'avenida' || (t.indice + noche) % 3 !== 0) continue;
    const m = (t.desde + t.hasta) / 2;
    if (t.eje === 'x') {
      meter({ x0: m - 10, z0: t.centro + 1, x1: m - 5.5, z1: t.centro + 3 }, 'coche', 1.5);
      meter({ x0: m + 4, z0: t.centro + 1, x1: m + 8.5, z1: t.centro + 3 }, 'coche', 1.5);
    } else if ((t.indice + noche) % 2 === 0) {
      meter({ x0: t.centro - 5.5, z0: m - 1, x1: t.centro - 3.5, z1: m + 1 }, 'quiosco-de-prensa', 2.4);
    }
  }
  /* 8. Los cortes de obra, en orden de tramo: toda la calle, 3 m a lo largo. */
  const cortes: CorteDeObra[] = [];
  if (conCortes) {
    for (const k of TRAMOS_CON_OBRA) {
      const t = ciudad.tramos[k] as TramoDeLaCiudad;
      const m = (t.desde + t.hasta) / 2;
      const r = t.eje === 'x' ? { x0: m - 1.5, z0: t.centro - 6, x1: m + 1.5, z1: t.centro + 6 } : { x0: t.centro - 6, z0: m - 1.5, x1: t.centro + 6, z1: m + 1.5 };
      cortes.push({ tramo: k, caja: meter(r, 'corte', 1.2) });
    }
  }
  const aristas = ciudad.grafo.aristas.filter((a) => !cortes.some((c) => cortaLaArista(ciudad.grafo, a.a, a.b, cajas[c.caja] as Rectangulo)));
  return {
    ciudad,
    noche,
    fallos,
    plazasDespejadas: false,
    cajas,
    cajasDeLaMesa: ciudad.cajas.length,
    cortes,
    grafo: { nudos: ciudad.grafo.nudos, aristas },
    semaforos: ciudad.cruces.map(() => 0),
    tren: { eje: 'x', linea: -120, desde: -290, hasta: 290, alto: 7.5, largo: 40, desfaseTics: 0, sentido: 1 },
    tiempo: 'llovizna',
    hora: { h: 3, m: 12 },
  };
}
