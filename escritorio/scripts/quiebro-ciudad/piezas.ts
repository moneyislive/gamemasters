/**
 * LAS COMPROBACIONES DE LAS FAROLAS Y LAS PIEZAS en `verify:quiebro-ciudad` (plan del detalle, §5.2.8 y la ficha de
 * O2-FAROLAS-Y-PIEZAS). Dueño: O2-FAROLAS-Y-PIEZAS.
 *
 * Se escriben TODAS las piezas del paquete (farolas de calle, de plaza y de pared, árboles, estatuas, contenedores,
 * carretillas, muelles y cortes) de las 32 trazas, en cada nivel y cada grado que su celda puede llevar (§3.1: N0 {1},
 * N1 {1}, N2 {2, 3}, N3 {2, 3}; y el grado 1 de N2 y N3, el de la luz de fuera de la ventana, para las luces), una a
 * una y cediendo como en la ventana, y se juzga lo escrito:
 *
 *   (a) LAS LUCES NO SE MUEVEN: la luz que devuelve cada farola es la de `d4402d0` a ±1 cm (las cuentas de entonces,
 *       copiadas aquí: calle a 1,35 m por el brazo y 6,0 m; plaza a 4,15 m en su eje; pared a 0,7 m del muro y 0,2 m
 *       por debajo de su altura), en todo grado; y cae a menos de 10 cm de la caja de su vidrio (la cabeza y el halo
 *       coinciden). Vacunas: una cabeza 10 cm más alta; un vidrio a 30 cm de su luz.
 *   (b) LAS RAMAS, POR ENCIMA DE 1,9 M O DENTRO DEL RADIO DEL TRONCO: todo vértice del árbol. Vacuna: un vértice a
 *       1,5 m de alto y 0,8 m del tronco.
 *   (c) LOS TOPES POR PIEZA Y GRADO (§3.1, y los de la ficha para lo que §3.1 no lista), en el mobiliario y en lo
 *       emisivo (en grado 1, lo emisivo de antes: N0 y N1 no pagan vidrio); y ninguna pieza escribe entre dos pasos
 *       más que el trozo de su nivel. El corte se cuenta SIN sus barreras (son de `mobiliario.ts`). Vacuna: una farola
 *       de pared de grado 1 con 61 triángulos.
 *   (d) LAS BANDEROLAS NO ATRAVIESAN EL FUSTE NUEVO (`voladizos.ts`): en la altura de la lona, el fuste de toda farola
 *       de calle queda por dentro de la lona, y a la altura de la varilla, por fuera de su punta (la varilla entra en
 *       el fuste y no cuelga en el aire). La lona y la varilla se sacan de la geometría de una banderola de verdad.
 *       Vacunas: un anillo de 14 cm a 3,5 m; un fuste de 4 cm a la altura de la varilla.
 *   (e) EL VIDRIO LLEVA SU COORDENADA RADIAL (el contrato con O4-SEMAFOROS): todo vértice del vidrio de una farola es
 *       de tipo 1 (`aEmisor.x`) con `aEmisor.y` entre 0 y 1, y el que tiene lámpara (el cuenco y la ampolla de la
 *       calle, los paños con centro de la hechura 4) va de 0 a 1. Vacuna: un vidrio de tipo 0.
 *   (f) EL PRESUPUESTO DE LA FICHA: lo que estas piezas AÑADEN a cada ventana (la de 3 × 3, 4 × 4 o 5 × 5 celdas de su
 *       nivel, con sus grados de §3.1), contra lo que escribía cada pieza en `d4402d0` (medido y copiado aquí), no pasa
 *       de +500 / +800 / +7.000 / +27.000 triángulos de mobiliario ni de +0 / +0 / +1.200 / +2.500 de emisivo (plan,
 *       ficha de O2-FAROLAS-Y-PIEZAS). Vacuna: 600 triángulos de más en una celda de N0.
 *   (g) NINGUNA CARA AL REVÉS en estas piezas (mobiliario y emisivo son de una cara): las de hoy (el costado de los
 *       toldos, que vigila `verify:quiebro-ciudad`, 2) no son de aquí, y aquí no se admite ninguna. Lo pidió el rizo
 *       de la voluta de la farola de pared, que con `Molde.tubo` salía retorcido (ver `tubo` en `farolas.ts`).
 *       Vacuna: una farola de pared con un triángulo al revés.
 *   (h) NINGUNA CARA QUE SE PISE CON OTRA de la misma pieza: mirando al mismo lado, a menos de 3 mm (`MISMO_PLANO`: con
 *       el plano cercano de 0,1 m, la profundidad de 24 bits ya no separa 3 mm a 70 m) y compartiendo más de 1 cm².
 *       Parpadean a rayas: los topes del muelle contra su frente, en la revisión. Una pieza de cada tipo, nivel, grado y
 *       traza. Vacuna: un muelle con una cara repetida 1 mm por delante.
 *   (i) NINGUNA RENDIJA en las piezas macizas (el contenedor y el muelle): todo rayo desde fuera que atraviesa su
 *       macizo da antes en una cara que le mira (las de espaldas no se pintan); si no, se ve a través. La rendija de
 *       2 cm entre la chapa ondulada y los largueros del contenedor de grado 3, en la revisión. Dos piezas de cada tipo,
 *       nivel y grado, en ocho rumbos y tres alturas de mirada. Vacuna: un contenedor sin sus costados largos.
 *
 * Cada resultado lleva su mínimo de inspeccionados: cero inspeccionados es cero fallos, y se leería como vigilado.
 */
import type { ComprobarElPaquete, ContextoDeLaCiudad, Resultado } from './comun';
import { FRANJA, HOLGURA, TROZO_POR_NIVEL } from './comun';
import type { ObraDeLaCelda, ParteDeLaCelda, PartesDeLaCiudad } from '../../src/quiebro/ciudad/celdas';
import { moldesDeLaObra, obraNueva } from '../../src/quiebro/ciudad/celdas';
import type { GeometriaVolcada, V3 } from '../../src/quiebro/ciudad/geometria';
import { farola, farolaDePared, hechuraDe } from '../../src/quiebro/ciudad/farolas';
import type { Hechura } from '../../src/quiebro/ciudad/farolas';
import { arbol, carretilla, contenedor, corte, estatua, filasDelCorte, muelle } from '../../src/quiebro/ciudad/piezas';
import type { LuzDelMobiliario } from '../../src/quiebro/ciudad/mobiliario';
import { H, barrerasDeObra } from '../../src/quiebro/ciudad/mobiliario';
import { normalDe } from '../../src/quiebro/ciudad/fachadas';
import { escribirLasBanderolas } from '../../src/quiebro/ciudad/voladizos';
import { GRADOS_DEL_NIVEL } from '../../src/quiebro/ciudad/grados';
import type { CajaXZ, FarolaDelPlano, GradoDeLaCelda, NivelDeLaCiudad } from '../../src/quiebro/ciudad/tipos';
import { NIVELES_DE_LA_CIUDAD } from '../../src/quiebro/ciudad/tipos';

/* ═══════════════════════════════ LO QUE SE MIDE ═══════════════════════════════ */

export type TipoDePieza = 'farola de calle' | 'farola de plaza' | 'farola de pared' | 'árbol' | 'estatua' | 'contenedor' | 'carretilla' | 'muelle' | 'corte';
export const TIPOS_DE_PIEZA: readonly TipoDePieza[] = ['farola de calle', 'farola de plaza', 'farola de pared', 'árbol', 'estatua', 'contenedor', 'carretilla', 'muelle', 'corte'];

/**
 * LOS TOPES POR PIEZA Y GRADO, en triángulos de mobiliario: los de §3.1 del plan (farolas, árbol, estatua,
 * contenedor) y, para lo que §3.1 no lista, los de la ficha (la carretilla, el muelle y el corte sin sus barreras).
 */
export const TOPE_POR_PIEZA: Readonly<Record<TipoDePieza, Readonly<Record<GradoDeLaCelda, number>>>> = {
  'farola de calle': { 1: 90, 2: 260, 3: 500 },
  'farola de plaza': { 1: 110, 2: 300, 3: 600 },
  'farola de pared': { 1: 60, 2: 120, 3: 200 },
  árbol: { 1: 120, 2: 350, 3: 650 },
  estatua: { 1: 120, 2: 400, 3: 1500 },
  contenedor: { 1: 132, 2: 200, 3: 400 },
  carretilla: { 1: 150, 2: 300, 3: 450 },
  muelle: { 1: 60, 2: 150, 3: 200 },
  corte: { 1: 20, 2: 100, 3: 200 },
};

/**
 * LOS TOPES DE LO EMISIVO por pieza y grado. En grado 1, lo de `d4402d0` (N0 y N1 no pagan vidrio: +0 en la ficha);
 * desde el 2, el cuenco de 8 lados y la ampolla (calle) y los paños con centro (plaza y pared, hechura 4). La calle
 * en grado 2, 9 como mucho: el barrio viejo pinta en grado 2 hasta 66 farolas de calle (HPXHV#6) y su renglón de
 * luces (2.600, `presupuesto.ts`) tenía 2.120 gastados con el vidrio de 2 triángulos.
 */
export const TOPE_EMISIVO_POR_PIEZA: Readonly<Record<TipoDePieza, Readonly<Record<GradoDeLaCelda, number>>>> = {
  'farola de calle': { 1: 2, 2: 9, 3: 40 },
  'farola de plaza': { 1: 12, 2: 12, 3: 24 },
  'farola de pared': { 1: 10, 2: 10, 3: 20 },
  árbol: { 1: 0, 2: 0, 3: 0 },
  estatua: { 1: 0, 2: 0, 3: 0 },
  contenedor: { 1: 0, 2: 0, 3: 0 },
  carretilla: { 1: 0, 2: 0, 3: 0 },
  muelle: { 1: 0, 2: 0, 3: 0 },
  corte: { 1: 0, 2: 0, 3: 0 },
};

/**
 * LO QUE ESCRIBÍA CADA PIEZA EN `d4402d0` (medido el 25-sep sobre 2481247, que no las había tocado): [mobiliario,
 * emisivo] por nivel, igual en todo grado (entonces sólo cambiaban con los lados del nivel). El corte, sin sus
 * barreras (las de `mobiliario.ts`: 336 y 144, que siguen contándose aparte).
 */
export const LO_DE_ANTES: Readonly<Record<NivelDeLaCiudad, Readonly<Record<TipoDePieza, readonly [number, number]>>>> = {
  0: { 'farola de calle': [84, 2], 'farola de plaza': [92, 12], 'farola de pared': [40, 10], árbol: [46, 0], estatua: [116, 0], contenedor: [132, 0], carretilla: [144, 0], muelle: [52, 0], corte: [12, 0] },
  1: { 'farola de calle': [112, 2], 'farola de plaza': [100, 12], 'farola de pared': [48, 10], árbol: [62, 0], estatua: [136, 0], contenedor: [132, 0], carretilla: [144, 0], muelle: [52, 0], corte: [12, 0] },
  2: { 'farola de calle': [140, 2], 'farola de plaza': [108, 12], 'farola de pared': [56, 10], árbol: [78, 0], estatua: [156, 0], contenedor: [132, 0], carretilla: [144, 0], muelle: [52, 0], corte: [12, 0] },
  3: { 'farola de calle': [168, 2], 'farola de plaza': [116, 12], 'farola de pared': [64, 10], árbol: [94, 0], estatua: [176, 0], contenedor: [132, 0], carretilla: [144, 0], muelle: [52, 0], corte: [12, 0] },
};

/** El presupuesto de la ficha: lo que el paquete puede añadir a la peor ventana, [mobiliario, emisivo] por nivel. */
export const PRESUPUESTO_DE_LA_FICHA: Readonly<Record<NivelDeLaCiudad, readonly [number, number]>> = {
  0: [500, 0],
  1: [800, 0],
  2: [7000, 1200],
  3: [27000, 2500],
};

/** Una pieza escrita: qué es, dónde, cuánto escribió y lo que devolvió. */
export interface PiezaEscrita {
  readonly tipo: TipoDePieza;
  readonly traza: number;
  readonly celda: number;
  readonly nivel: NivelDeLaCiudad;
  readonly grado: GradoDeLaCelda;
  readonly hechura: Hechura;
  /** Triángulos de mobiliario y de emisivo (el corte, sin sus barreras). */
  readonly mob: number;
  readonly emi: number;
  /** Lo más que escribió entre dos pasos (todas las familias). */
  readonly paso: number;
  /** Las luces que devolvió. */
  readonly luces: readonly LuzDelMobiliario[];
  /** Su geometría: los vértices de sus triángulos de mobiliario y de emisivo (x, y, z; y aEmisor en lo emisivo). */
  readonly vertices: Float32Array;
  readonly vidrio: Float32Array;
  readonly emisor: Float32Array;
  /** Las normales de esos mismos vértices, de tres en tres (mobiliario y emisivo). */
  readonly normales: Float32Array;
  readonly normalesDelVidrio: Float32Array;
  /** La luz que tenía que devolver (las farolas), por las cuentas de `d4402d0`. */
  readonly esperada: V3 | null;
  /** Su sitio en planta (el tronco, el fuste). */
  readonly x: number;
  readonly z: number;
  /** La semilla de las banderolas y la farola del plano (las de calle). */
  readonly farola: FarolaDelPlano | null;
  readonly semilla: number;
  /** El medio lado de la caja (el radio del tronco para las ramas). */
  readonly radioDeLaCaja: number;
  /** La caja de las piezas macizas (el contenedor y el muelle), para (i); `null` en las demás. */
  readonly caja: CajaXZ | null;
}

/** Las variantes de cada nivel: los grados de su ventana y, para las luces, el 1 (la luz de fuera de la ventana). */
function variantes(n: NivelDeLaCiudad): { grado: GradoDeLaCelda; soloLuces: boolean }[] {
  const g = GRADOS_DEL_NIVEL[n].map((grado) => ({ grado, soloLuces: false }));
  return GRADOS_DEL_NIVEL[n].includes(1) ? g : [...g, { grado: 1, soloLuces: true }];
}

/** Los triángulos de las barreras de un corte (de `mobiliario.ts`), para restarlos: [mobiliario, emisivo]. */
function barrerasDelCorte(c: CajaXZ): readonly [number, number] {
  const m = moldesDeLaObra(true);
  for (const f of filasDelCorte(c)) barrerasDeObra(m.mobiliario, m.emisivo, f);
  return [m.mobiliario.triangulos, m.emisivo.triangulos];
}

/** Los vértices de los triángulos [t0, t1) de una geometría volcada: posiciones (y, si se pide, un atributo más). */
function verticesDe(g: GeometriaVolcada, t0: number, t1: number, atributo?: string): { pos: Float32Array; extra: Float32Array } {
  const pos = g.datos.get('position') as Float32Array;
  const ex = atributo === undefined ? undefined : g.datos.get(atributo);
  const tam = ex === undefined ? 0 : (g.atributos.find((a) => a.nombre === atributo)?.tam ?? 0);
  const n = (t1 - t0) * 3;
  const salida = new Float32Array(n * 3);
  const extra = new Float32Array(n * tam);
  for (let i = 0; i < n; i++) {
    const v = g.indices[t0 * 3 + i] as number;
    salida[i * 3] = pos[v * 3] as number;
    salida[i * 3 + 1] = pos[v * 3 + 1] as number;
    salida[i * 3 + 2] = pos[v * 3 + 2] as number;
    if (ex !== undefined) for (let k = 0; k < tam; k++) extra[i * tam + k] = ex[v * tam + k] as number;
  }
  return { pos: salida, extra };
}

/** La luz que devolvía en `d4402d0` una farola de pie (las cuentas de entonces). */
function luzDeAntes(f: FarolaDelPlano): V3 {
  if (f.brazo === null) return [f.x, H + 4.15, f.z];
  const [dx, dz] = normalDe(f.brazo);
  return [f.x + dx * 1.35, H + 6.0, f.z + dz * 1.35];
}

/**
 * ESCRIBE LAS PIEZAS de una celda en un nivel y un grado, en UNA obra (como la ventana), cediendo como ella, y
 * devuelve cada pieza con lo suyo (sus triángulos son un tramo seguido de los de su familia).
 */
function escribirLaCelda(parte: ParteDeLaCelda, partes: PartesDeLaCiudad, traza: number, k: number, nivel: NivelDeLaCiudad, grado: GradoDeLaCelda, barreras: Map<string, readonly [number, number]>): PiezaEscrita[] {
  const obra: ObraDeLaCelda = obraNueva({ nivel, grado, relieveDeHoy: false, ciudad: partes, m: moldesDeLaObra(true) });
  const m = obra.m;
  const total = (): number => m.mobiliario.triangulos + m.emisivo.triangulos + m.cristal.triangulos;
  const tramos: { tipo: TipoDePieza; m0: number; m1: number; e0: number; e1: number; paso: number; luces: LuzDelMobiliario[]; esperada: V3 | null; x: number; z: number; farola: FarolaDelPlano | null; radio: number; restar: readonly [number, number]; caja: CajaXZ | null }[] = [];
  const escribir = <T>(tipo: TipoDePieza, g: Generator<void, T, void>, extra: { esperada: V3 | null; x: number; z: number; farola: FarolaDelPlano | null; radio: number; restar?: readonly [number, number]; caja?: CajaXZ }): void => {
    const m0 = m.mobiliario.triangulos;
    const e0 = m.emisivo.triangulos;
    let ultimo = total();
    let paso = 0;
    let vuelta: T | undefined;
    for (;;) {
      const r = g.next();
      const ahora = total();
      paso = Math.max(paso, ahora - ultimo);
      ultimo = ahora;
      if (r.done === true) {
        vuelta = r.value;
        break;
      }
    }
    const luces: LuzDelMobiliario[] = vuelta === undefined ? [] : Array.isArray(vuelta) ? [...(vuelta as LuzDelMobiliario[])] : [vuelta as unknown as LuzDelMobiliario];
    tramos.push({ tipo, m0, m1: m.mobiliario.triangulos, e0, e1: m.emisivo.triangulos, paso, luces, ...extra, restar: extra.restar ?? [0, 0], caja: extra.caja ?? null });
  };
  const radio = (c: CajaXZ): number => Math.min(c.x1 - c.x0, c.z1 - c.z0) / 2;
  const medio = (c: CajaXZ): [number, number] => [(c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2];
  for (const f of parte.farolas) escribir(f.brazo === null ? 'farola de plaza' : 'farola de calle', farola(obra, f), { esperada: luzDeAntes(f), x: f.x, z: f.z, farola: f, radio: radio(f.caja) });
  for (const l of parte.lamparas) {
    const [nx, nz] = normalDe(l.mira);
    escribir('farola de pared', farolaDePared(obra, l), { esperada: [l.x + nx * 0.7, l.alto - 0.2, l.z + nz * 0.7], x: l.x, z: l.z, farola: null, radio: 0 });
  }
  for (const c of parte.cortes) {
    const clave = `${String(c.x1 - c.x0)}×${String(c.z1 - c.z0)}`;
    let b = barreras.get(clave);
    if (b === undefined) {
      b = barrerasDelCorte(c);
      barreras.set(clave, b);
    }
    const [x, z] = medio(c);
    escribir('corte', corte(obra, c), { esperada: null, x, z, farola: null, radio: radio(c), restar: b });
  }
  for (const t of parte.troncos) {
    const [x, z] = medio(t);
    escribir('árbol', arbol(obra, t), { esperada: null, x, z, farola: null, radio: radio(t) });
  }
  for (const e of parte.estatuas) {
    const [x, z] = medio(e);
    escribir('estatua', estatua(obra, e), { esperada: null, x, z, farola: null, radio: radio(e) });
  }
  for (const c of parte.contenedores) escribir('contenedor', contenedor(obra, c), { esperada: null, x: 0, z: 0, farola: null, radio: 0, caja: c.caja });
  for (const c of parte.carretillas) escribir('carretilla', carretilla(obra, c), { esperada: null, x: 0, z: 0, farola: null, radio: 0 });
  for (const c of parte.muelles) escribir('muelle', muelle(obra, c), { esperada: null, x: 0, z: 0, farola: null, radio: 0, caja: c.caja });
  if (tramos.length === 0) return [];
  const mob = m.mobiliario.volcar();
  const emi = m.emisivo.volcar();
  const hechura = hechuraDe(obra);
  return tramos.map((t) => {
    const vm = verticesDe(mob, t.m0, t.m1, 'normal');
    const ve = verticesDe(emi, t.e0, t.e1, 'aEmisor');
    const ne = verticesDe(emi, t.e0, t.e1, 'normal');
    return {
      tipo: t.tipo,
      traza,
      celda: k,
      nivel,
      grado,
      hechura,
      mob: t.m1 - t.m0 - t.restar[0],
      emi: t.e1 - t.e0 - t.restar[1],
      paso: t.paso,
      luces: t.luces,
      vertices: vm.pos,
      vidrio: ve.pos,
      emisor: ve.extra,
      normales: vm.extra,
      normalesDelVidrio: ne.extra,
      esperada: t.esperada,
      x: t.x,
      z: t.z,
      farola: t.farola,
      semilla: partes.semilla,
      radioDeLaCaja: t.radio,
      caja: t.caja,
    };
  });
}

/* ═══════════════════════════════ LOS JUECES ═══════════════════════════════ */

/** (a) Las luces de las farolas, en su sitio de antes (±1 cm) y a menos de 10 cm de la caja de su vidrio. */
export function juzgarLasLuces(piezas: readonly Pick<PiezaEscrita, 'tipo' | 'esperada' | 'luces' | 'vidrio' | 'nivel' | 'grado' | 'traza' | 'celda'>[]): { problemas: string[]; mirados: number } {
  const problemas: string[] = [];
  let mirados = 0;
  for (const p of piezas) {
    if (p.esperada === null) continue;
    mirados++;
    const donde = `traza ${String(p.traza)} N${String(p.nivel)} g${String(p.grado)} celda ${String(p.celda)} ${p.tipo}`;
    const luz = p.luces.length === 1 ? p.luces[0] : undefined;
    if (luz === undefined || luz.tipo !== 'farola') {
      problemas.push(`${donde}: devuelve ${String(p.luces.length)} luces (o no de farola)`);
      continue;
    }
    const d = Math.hypot(luz.x - p.esperada[0], luz.y - p.esperada[1], luz.z - p.esperada[2]);
    if (!(d <= 0.01)) problemas.push(`${donde}: la luz está a ${d.toFixed(3)} m de la de antes`);
    if (p.vidrio.length === 0) {
      /* Sin vidrio escrito sólo puede ser un molde que no guarda: aquí se escribe siempre, así que es un fallo. */
      problemas.push(`${donde}: no tiene vidrio`);
      continue;
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let z1 = -Infinity;
    for (let i = 0; i < p.vidrio.length; i += 3) {
      x0 = Math.min(x0, p.vidrio[i] as number);
      x1 = Math.max(x1, p.vidrio[i] as number);
      y0 = Math.min(y0, p.vidrio[i + 1] as number);
      y1 = Math.max(y1, p.vidrio[i + 1] as number);
      z0 = Math.min(z0, p.vidrio[i + 2] as number);
      z1 = Math.max(z1, p.vidrio[i + 2] as number);
    }
    const fuera = Math.hypot(Math.max(0, x0 - luz.x, luz.x - x1), Math.max(0, y0 - luz.y, luz.y - y1), Math.max(0, z0 - luz.z, luz.z - z1));
    if (!(fuera <= 0.1)) problemas.push(`${donde}: la luz está a ${fuera.toFixed(3)} m de la caja de su vidrio`);
  }
  return { problemas, mirados };
}

/** (b) Todo vértice del árbol, por encima de la franja de andar o dentro del radio de su tronco (su caja y la holgura). */
export function juzgarLasRamas(piezas: readonly Pick<PiezaEscrita, 'tipo' | 'vertices' | 'x' | 'z' | 'radioDeLaCaja' | 'traza' | 'celda' | 'nivel' | 'grado'>[]): { problemas: string[]; mirados: number; arboles: number } {
  const problemas: string[] = [];
  let mirados = 0;
  let arboles = 0;
  for (const p of piezas) {
    if (p.tipo !== 'árbol') continue;
    arboles++;
    for (let i = 0; i < p.vertices.length; i += 3) {
      mirados++;
      const y = p.vertices[i + 1] as number;
      if (y >= FRANJA[1]) continue;
      const d = Math.hypot((p.vertices[i] as number) - p.x, (p.vertices[i + 2] as number) - p.z);
      if (d <= p.radioDeLaCaja + HOLGURA) continue;
      if (problemas.length < 6) problemas.push(`traza ${String(p.traza)} N${String(p.nivel)} g${String(p.grado)} celda ${String(p.celda)}: un vértice a ${y.toFixed(2)} m de alto y ${d.toFixed(2)} m del tronco`);
      else break;
    }
  }
  return { problemas, mirados, arboles };
}

/** Lo más que escribe cada tipo en cada grado, y el paso mayor de cada nivel. */
export interface MedidaDeLosTopes {
  readonly mob: Map<string, number>;
  readonly emi: Map<string, number>;
  readonly paso: Map<NivelDeLaCiudad, number>;
}

export function medirLosTopes(piezas: readonly Pick<PiezaEscrita, 'tipo' | 'grado' | 'nivel' | 'mob' | 'emi' | 'paso'>[]): MedidaDeLosTopes {
  const mob = new Map<string, number>();
  const emi = new Map<string, number>();
  const paso = new Map<NivelDeLaCiudad, number>();
  for (const p of piezas) {
    const clave = `${p.tipo}|${String(p.grado)}`;
    mob.set(clave, Math.max(mob.get(clave) ?? 0, p.mob));
    emi.set(clave, Math.max(emi.get(clave) ?? 0, p.emi));
    paso.set(p.nivel, Math.max(paso.get(p.nivel) ?? 0, p.paso));
  }
  return { mob, emi, paso };
}

/** (c) Los topes por pieza y grado, en mobiliario y emisivo, y el paso de cada nivel contra su trozo. */
export function juzgarLosTopes(m: MedidaDeLosTopes): string[] {
  const problemas: string[] = [];
  for (const [clave, v] of m.mob) {
    const [tipo, g] = clave.split('|') as [TipoDePieza, string];
    const tope = TOPE_POR_PIEZA[tipo]?.[Number(g) as GradoDeLaCelda];
    if (tope === undefined || v > tope) problemas.push(`${tipo} en grado ${g}: ${String(v)} triángulos de mobiliario (tope ${String(tope)})`);
  }
  for (const [clave, v] of m.emi) {
    const [tipo, g] = clave.split('|') as [TipoDePieza, string];
    const tope = TOPE_EMISIVO_POR_PIEZA[tipo]?.[Number(g) as GradoDeLaCelda];
    if (tope === undefined || v > tope) problemas.push(`${tipo} en grado ${g}: ${String(v)} triángulos emisivos (tope ${String(tope)})`);
  }
  for (const [n, v] of m.paso) if (v > TROZO_POR_NIVEL[n]) problemas.push(`N${String(n)}: una pieza escribe ${String(v)} triángulos entre dos pasos (trozo ${String(TROZO_POR_NIVEL[n])})`);
  return problemas;
}

/** La lona y la varilla de una banderola de verdad: el radio de la lona más cerca del eje, su alto y la punta de la varilla. */
export interface LaBanderola {
  readonly radioDeLaLona: number;
  readonly lonaDesde: number;
  readonly lonaHasta: number;
  readonly radioDeLaVarilla: number;
  readonly alturaDeLaVarilla: number;
}

/** Saca la banderola de `voladizos.ts` de la primera farola de calle que la lleve. `null` si ninguna la lleva. */
export function banderolaDeVerdad(piezas: readonly Pick<PiezaEscrita, 'farola' | 'semilla'>[]): LaBanderola | null {
  for (const p of piezas) {
    const f = p.farola;
    if (f === null || f.brazo === null) continue;
    const m = moldesDeLaObra(true).mobiliario;
    escribirLasBanderolas(m, [f], p.semilla);
    if (m.triangulos === 0) continue;
    const g = m.volcar();
    const pos = g.datos.get('position') as Float32Array;
    let alto = -Infinity;
    for (let i = 1; i < pos.length; i += 3) alto = Math.max(alto, pos[i] as number);
    /* La varilla es lo de arriba del todo (3 cm); la lona, lo de debajo. */
    let rLona = Infinity;
    let rVarilla = Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < pos.length; i += 3) {
      const r = Math.hypot((pos[i] as number) - f.x, (pos[i + 2] as number) - f.z);
      const y = pos[i + 1] as number;
      if (y >= alto - 0.035) rVarilla = Math.min(rVarilla, r);
      else {
        rLona = Math.min(rLona, r);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
    return { radioDeLaLona: rLona, lonaDesde: y0, lonaHasta: y1, radioDeLaVarilla: rVarilla, alturaDeLaVarilla: alto - 0.015 };
  }
  return null;
}

/**
 * Lo más lejos del eje (cx, cz) que llega una pieza entre las alturas y0 e y1, contando sólo lo que está a menos de
 * `rMax` del eje: sus vértices en la banda y los cortes de sus aristas con y0 e y1 (un fuste de un solo tramo no tiene
 * vértices en medio; en su sección, sí). `v` son los vértices de sus triángulos, de tres en tres.
 */
export function radioEnLaBanda(v: Float32Array, cx: number, cz: number, y0: number, y1: number, rMax = 0.3): number {
  let r = 0;
  const mirar = (x: number, z: number): void => {
    const d = Math.hypot(x - cx, z - cz);
    if (d <= rMax && d > r) r = d;
  };
  for (let t = 0; t + 8 < v.length; t += 9) {
    for (let e = 0; e < 3; e++) {
      const a = t + e * 3;
      const b = t + ((e + 1) % 3) * 3;
      const ya = v[a + 1] as number;
      const yb = v[b + 1] as number;
      if (ya >= y0 && ya <= y1) mirar(v[a] as number, v[a + 2] as number);
      for (const h of [y0, y1]) {
        if ((ya - h) * (yb - h) >= 0) continue;
        const s = (h - ya) / (yb - ya);
        mirar((v[a] as number) + s * ((v[b] as number) - (v[a] as number)), (v[a + 2] as number) + s * ((v[b + 2] as number) - (v[a + 2] as number)));
      }
    }
  }
  /* Un vértice suelto (la vacuna) también cuenta. */
  for (let i = v.length - (v.length % 9); i + 2 < v.length; i += 3) {
    const y = v[i + 1] as number;
    if (y >= y0 && y <= y1) mirar(v[i] as number, v[i + 2] as number);
  }
  return r;
}

/**
 * (d) El fuste de cada farola de calle, contra la banderola: en el alto de la lona, todo lo que está a menos de 30 cm
 * del eje (el fuste y sus anillos; el brazo va más arriba) queda por dentro de la lona; y a la altura de la varilla, el
 * fuste llega a la punta de la varilla.
 */
export function juzgarElFuste(piezas: readonly Pick<PiezaEscrita, 'tipo' | 'vertices' | 'x' | 'z' | 'traza' | 'celda' | 'nivel' | 'grado'>[], b: LaBanderola): { problemas: string[]; mirados: number } {
  const problemas: string[] = [];
  let mirados = 0;
  for (const p of piezas) {
    if (p.tipo !== 'farola de calle') continue;
    mirados++;
    const enLaLona = radioEnLaBanda(p.vertices, p.x, p.z, b.lonaDesde, b.lonaHasta);
    const enLaVarilla = radioEnLaBanda(p.vertices, p.x, p.z, b.alturaDeLaVarilla, b.alturaDeLaVarilla);
    const donde = `traza ${String(p.traza)} N${String(p.nivel)} g${String(p.grado)} celda ${String(p.celda)}`;
    if (!(enLaLona < b.radioDeLaLona - 0.003)) problemas.push(`${donde}: el fuste llega a ${enLaLona.toFixed(3)} m del eje en el alto de la lona (que empieza a ${b.radioDeLaLona.toFixed(3)})`);
    if (!(enLaVarilla >= b.radioDeLaVarilla)) problemas.push(`${donde}: el fuste mide ${enLaVarilla.toFixed(3)} m a la altura de la varilla, que acaba a ${b.radioDeLaVarilla.toFixed(3)}: cuelga en el aire`);
    if (problemas.length >= 6) break;
  }
  return { problemas, mirados };
}

/** (e) El vidrio de las farolas: tipo 1 y coordenada radial en [0, 1]; con lámpara, de 0 a 1. */
export function juzgarElVidrio(piezas: readonly Pick<PiezaEscrita, 'tipo' | 'hechura' | 'emisor' | 'traza' | 'celda' | 'nivel' | 'grado'>[]): { problemas: string[]; mirados: number } {
  const problemas: string[] = [];
  let mirados = 0;
  for (const p of piezas) {
    if (p.tipo !== 'farola de calle' && p.tipo !== 'farola de plaza' && p.tipo !== 'farola de pared') continue;
    let min = Infinity;
    let max = -Infinity;
    let malos = 0;
    for (let i = 0; i < p.emisor.length; i += 2) {
      mirados++;
      const tipo = p.emisor[i] as number;
      const radial = p.emisor[i + 1] as number;
      if (Math.abs(tipo - 1) > 1e-6 || !(radial >= 0 && radial <= 1)) malos++;
      min = Math.min(min, radial);
      max = Math.max(max, radial);
    }
    const donde = `traza ${String(p.traza)} N${String(p.nivel)} g${String(p.grado)} celda ${String(p.celda)} ${p.tipo}`;
    if (malos > 0) problemas.push(`${donde}: ${String(malos)} vértices de vidrio que no son de farola o con la radial fuera de [0, 1]`);
    const conLampara = (p.tipo === 'farola de calle' && p.hechura >= 2) || p.hechura === 4;
    if (conLampara && !(min <= 0.01 && max >= 0.99)) problemas.push(`${donde}: el vidrio con lámpara va de ${min.toFixed(2)} a ${max.toFixed(2)} (tiene que ir de 0 a 1)`);
    if (problemas.length >= 6) break;
  }
  return { problemas, mirados };
}

/**
 * (g) Ninguna cara al revés en estas piezas: el sentido de cada triángulo (de mobiliario y de lo emisivo, que son
 * de una cara) casa con la suma de las normales de sus vértices, como `carasAlReves` de `comun.ts`. Las de hoy (el
 * costado de los toldos) no son de este paquete: aquí no se admite ninguna.
 */
export function juzgarLasCaras(piezas: readonly Pick<PiezaEscrita, 'tipo' | 'vertices' | 'normales' | 'vidrio' | 'normalesDelVidrio' | 'traza' | 'celda' | 'nivel' | 'grado'>[]): { problemas: string[]; mirados: number } {
  const problemas: string[] = [];
  let mirados = 0;
  const mirar = (v: Float32Array, n: Float32Array, p: (typeof piezas)[number], familia: string): void => {
    for (let t = 0; t + 8 < v.length && t + 8 < n.length; t += 9) {
      const ux = (v[t + 3] as number) - (v[t] as number);
      const uy = (v[t + 4] as number) - (v[t + 1] as number);
      const uz = (v[t + 5] as number) - (v[t + 2] as number);
      const wx = (v[t + 6] as number) - (v[t] as number);
      const wy = (v[t + 7] as number) - (v[t + 1] as number);
      const wz = (v[t + 8] as number) - (v[t + 2] as number);
      const gx = uy * wz - uz * wy;
      const gy = uz * wx - ux * wz;
      const gz = ux * wy - uy * wx;
      const area = Math.hypot(gx, gy, gz);
      if (area < 1e-8) continue;
      mirados++;
      const mx = (n[t] as number) + (n[t + 3] as number) + (n[t + 6] as number);
      const my = (n[t + 1] as number) + (n[t + 4] as number) + (n[t + 7] as number);
      const mz = (n[t + 2] as number) + (n[t + 5] as number) + (n[t + 8] as number);
      const largo = Math.hypot(mx, my, mz);
      if (largo < 1e-6) continue;
      if ((gx * mx + gy * my + gz * mz) / (area * largo) < -1e-3 && problemas.length < 6) {
        problemas.push(`traza ${String(p.traza)} N${String(p.nivel)} g${String(p.grado)} celda ${String(p.celda)} ${p.tipo} (${familia}): una cara al revés en (${[(v[t] as number) + (v[t + 3] as number) + (v[t + 6] as number), (v[t + 1] as number) + (v[t + 4] as number) + (v[t + 7] as number), (v[t + 2] as number) + (v[t + 5] as number) + (v[t + 8] as number)].map((c) => (c / 3).toFixed(2)).join(', ')})`);
      }
    }
  };
  for (const p of piezas) {
    mirar(p.vertices, p.normales, p, 'mobiliario');
    mirar(p.vidrio, p.normalesDelVidrio, p, 'emisivo');
  }
  return { problemas, mirados };
}

/* ─────────────── (h) LAS CARAS QUE SE PISAN y (i) LAS RENDIJAS ─────────────── */

/**
 * A cuánto dos caras paralelas son «el mismo plano» para el búfer de profundidad: 3 mm. Con el plano cercano de 0,1 m
 * (`Quiebro.tsx`) y 24 bits, la profundidad separa unos z² / (0,1 · 2²⁴) m: 1 mm a 40 m y 3 mm a 70 m, que es hasta
 * donde se pinta el grado 3 de N3. El detector de O2-VEHICULOS mira 1 mm (su ficha); aquí se pide lo que no parpadea
 * en la foto.
 */
export const MISMO_PLANO = 0.003;
/** Lo que tienen que pisarse dos caras para contar: 1 cm² (dos triángulos vecinos sólo comparten una arista). */
const AREA_QUE_SE_PISA = 1e-4;

/** Los triángulos de unas listas (9 números cada uno), en coordenadas relativas a `o` y en doble precisión. */
function trianglesRelativos(listas: readonly Float32Array[], o: V3): Float64Array {
  let total = 0;
  for (const l of listas) total += Math.floor(l.length / 9);
  const p = new Float64Array(total * 9);
  let k = 0;
  for (const l of listas) {
    const n = Math.floor(l.length / 9) * 9;
    for (let i = 0; i < n; i += 3) {
      p[k++] = (l[i] as number) - o[0];
      p[k++] = (l[i + 1] as number) - o[1];
      p[k++] = (l[i + 2] as number) - o[2];
    }
  }
  return p;
}

/** Un polígono convexo (x, y, x, y…) recortado por el lado izquierdo de la recta a → b (Sutherland-Hodgman). */
function recortarPorLaIzquierda(poli: readonly number[], ax: number, ay: number, bx: number, by: number): number[] {
  const salida: number[] = [];
  const n = poli.length / 2;
  const lado = (x: number, y: number): number => (bx - ax) * (y - ay) - (by - ay) * (x - ax);
  for (let k = 0; k < n; k++) {
    const cx = poli[k * 2] as number;
    const cy = poli[k * 2 + 1] as number;
    const px = poli[((k + n - 1) % n) * 2] as number;
    const py = poli[((k + n - 1) % n) * 2 + 1] as number;
    const sc = lado(cx, cy);
    const sp = lado(px, py);
    if (sc >= 0) {
      if (sp < 0) {
        const t = sp / (sp - sc);
        salida.push(px + t * (cx - px), py + t * (cy - py));
      }
      salida.push(cx, cy);
    } else if (sp >= 0) {
      const t = sp / (sp - sc);
      salida.push(px + t * (cx - px), py + t * (cy - py));
    }
  }
  return salida;
}

/**
 * (h) CARAS QUE SE PISAN en una pieza: dos triángulos que miran al mismo lado (menos de 1,1° entre sus normales), en el
 * mismo plano (cada vértice de uno a menos de `MISMO_PLANO` del plano del otro) y que comparten más de 1 cm² (el uno
 * recortado por el otro en su plano). Es el parpadeo de los topes del muelle contra su frente: el búfer de
 * profundidad no sabe cuál va delante. Se miran juntos el mobiliario y lo emisivo (también se pisan entre sí).
 */
export function carasQueSePisan(listas: readonly Float32Array[]): { mirados: number; pisadas: number; donde: V3 | null } {
  const primera = listas.find((l) => l.length >= 9);
  if (primera === undefined) return { mirados: 0, pisadas: 0, donde: null };
  const o: V3 = [primera[0] as number, primera[1] as number, primera[2] as number];
  const p = trianglesRelativos(listas, o);
  const n = p.length / 9;
  const nor = new Float64Array(n * 3);
  const dis = new Float64Array(n);
  const caja = new Float64Array(n * 6);
  const vale = new Uint8Array(n);
  for (let t = 0; t < n; t++) {
    const b = t * 9;
    const ux = (p[b + 3] as number) - (p[b] as number);
    const uy = (p[b + 4] as number) - (p[b + 1] as number);
    const uz = (p[b + 5] as number) - (p[b + 2] as number);
    const wx = (p[b + 6] as number) - (p[b] as number);
    const wy = (p[b + 7] as number) - (p[b + 1] as number);
    const wz = (p[b + 8] as number) - (p[b + 2] as number);
    const gx = uy * wz - uz * wy;
    const gy = uz * wx - ux * wz;
    const gz = ux * wy - uy * wx;
    const l = Math.hypot(gx, gy, gz);
    if (l < 1e-9) continue;
    vale[t] = 1;
    nor[t * 3] = gx / l;
    nor[t * 3 + 1] = gy / l;
    nor[t * 3 + 2] = gz / l;
    dis[t] = (gx * (p[b] as number) + gy * (p[b + 1] as number) + gz * (p[b + 2] as number)) / l;
    for (let e = 0; e < 3; e++) {
      caja[t * 6 + e] = Math.min(p[b + e] as number, p[b + 3 + e] as number, p[b + 6 + e] as number);
      caja[t * 6 + 3 + e] = Math.max(p[b + e] as number, p[b + 3 + e] as number, p[b + 6 + e] as number);
    }
  }
  /* La distancia más grande de los tres vértices de `j` al plano de `i`. */
  const lejos = (i: number, j: number): number => {
    let m = 0;
    for (let v = 0; v < 3; v++) {
      const b = j * 9 + v * 3;
      m = Math.max(m, Math.abs((nor[i * 3] as number) * (p[b] as number) + (nor[i * 3 + 1] as number) * (p[b + 1] as number) + (nor[i * 3 + 2] as number) * (p[b + 2] as number) - (dis[i] as number)));
    }
    return m;
  };
  /* Lo que comparten `i` y `j`, proyectados en el plano de `i` (los dos en el mismo sentido: miran al mismo lado). */
  const loQueComparten = (i: number, j: number): number => {
    const b = i * 9;
    let e1x = (p[b + 3] as number) - (p[b] as number);
    let e1y = (p[b + 4] as number) - (p[b + 1] as number);
    let e1z = (p[b + 5] as number) - (p[b + 2] as number);
    const l1 = Math.hypot(e1x, e1y, e1z) || 1;
    e1x /= l1;
    e1y /= l1;
    e1z /= l1;
    const nx = nor[i * 3] as number;
    const ny = nor[i * 3 + 1] as number;
    const nz = nor[i * 3 + 2] as number;
    const e2x = ny * e1z - nz * e1y;
    const e2y = nz * e1x - nx * e1z;
    const e2z = nx * e1y - ny * e1x;
    const plano = (t: number): number[] => {
      const s: number[] = [];
      for (let v = 0; v < 3; v++) {
        const c = t * 9 + v * 3;
        const x = p[c] as number;
        const y = p[c + 1] as number;
        const z = p[c + 2] as number;
        s.push(x * e1x + y * e1y + z * e1z, x * e2x + y * e2y + z * e2z);
      }
      /* Antihorario: si no, se le da la vuelta. */
      const area = ((s[2] as number) - (s[0] as number)) * ((s[5] as number) - (s[1] as number)) - ((s[4] as number) - (s[0] as number)) * ((s[3] as number) - (s[1] as number));
      return area >= 0 ? s : [s[0] as number, s[1] as number, s[4] as number, s[5] as number, s[2] as number, s[3] as number];
    };
    const a = plano(i);
    let poli = plano(j);
    for (let k = 0; k < 3 && poli.length >= 6; k++) {
      poli = recortarPorLaIzquierda(poli, a[k * 2] as number, a[k * 2 + 1] as number, a[((k + 1) % 3) * 2] as number, a[((k + 1) % 3) * 2 + 1] as number);
    }
    let area = 0;
    const m = poli.length / 2;
    for (let k = 0; k < m; k++) area += (poli[k * 2] as number) * (poli[((k + 1) % m) * 2 + 1] as number) - (poli[((k + 1) % m) * 2] as number) * (poli[k * 2 + 1] as number);
    return Math.abs(area) / 2;
  };
  let mirados = 0;
  let pisadas = 0;
  let donde: V3 | null = null;
  for (let i = 0; i < n; i++) {
    if (vale[i] !== 1) continue;
    mirados++;
    for (let j = i + 1; j < n; j++) {
      if (vale[j] !== 1) continue;
      if ((nor[i * 3] as number) * (nor[j * 3] as number) + (nor[i * 3 + 1] as number) * (nor[j * 3 + 1] as number) + (nor[i * 3 + 2] as number) * (nor[j * 3 + 2] as number) < 0.9998) continue;
      let fuera = false;
      for (let e = 0; e < 3 && !fuera; e++) fuera = (caja[i * 6 + 3 + e] as number) < (caja[j * 6 + e] as number) - MISMO_PLANO || (caja[j * 6 + 3 + e] as number) < (caja[i * 6 + e] as number) - MISMO_PLANO;
      if (fuera) continue;
      if (lejos(i, j) > MISMO_PLANO || lejos(j, i) > MISMO_PLANO) continue;
      if (loQueComparten(i, j) <= AREA_QUE_SE_PISA) continue;
      pisadas++;
      if (donde === null) {
        const b = i * 9;
        donde = [((p[b] as number) + (p[b + 3] as number) + (p[b + 6] as number)) / 3 + o[0], ((p[b + 1] as number) + (p[b + 4] as number) + (p[b + 7] as number)) / 3 + o[1], ((p[b + 2] as number) + (p[b + 5] as number) + (p[b + 8] as number)) / 3 + o[2]];
      }
    }
  }
  return { mirados, pisadas, donde };
}

/** (h) Ninguna pieza con caras que se pisan (las muestras de cada tipo, nivel, grado y traza). */
export function juzgarLasPisadas(piezas: readonly Pick<PiezaEscrita, 'tipo' | 'vertices' | 'vidrio' | 'traza' | 'celda' | 'nivel' | 'grado'>[]): { problemas: string[]; mirados: number; piezas: number } {
  const problemas: string[] = [];
  let mirados = 0;
  for (const p of piezas) {
    const r = carasQueSePisan([p.vertices, p.vidrio]);
    mirados += r.mirados;
    if (r.pisadas > 0 && problemas.length < 6) {
      problemas.push(`traza ${String(p.traza)} N${String(p.nivel)} g${String(p.grado)} celda ${String(p.celda)} ${p.tipo}: ${String(r.pisadas)} pares de caras en el mismo plano (±${String(MISMO_PLANO * 1000)} mm) que se pisan, la primera en (${(r.donde ?? [0, 0, 0]).map((c) => c.toFixed(2)).join(', ')})`);
    }
  }
  return { problemas, mirados, piezas: piezas.length };
}

/** El alto del macizo de las piezas que (i) mira, sobre la acera: el contenedor y el muelle. */
export const ALTO_DEL_MACIZO: Partial<Readonly<Record<TipoDePieza, number>>> = { contenedor: 2.55, muelle: 1.05 };

/**
 * (i) LAS RENDIJAS de una pieza maciza: desde fuera, todo rayo que atraviesa su macizo (la caja 5 cm por dentro, de
 * 3 cm sobre la acera a 3 cm bajo su techo) tiene que dar en una cara de la pieza que le mire ANTES de entrar en él.
 * Las caras de espaldas no cuentan: no se pintan, y se ve a través de ellas, como en la pantalla. Si lo primero que se
 * ve está dentro del macizo, se ve el interior; si no hay nada, lo de detrás: la rendija de 2 cm del contenedor de
 * grado 3 entre la chapa ondulada y los largueros. Lo que queda bajo la acera no cuenta (la tapa el suelo), ni el rayo
 * que sale del suelo dentro de la planta de la pieza. Ocho rumbos y tres alturas de mirada (25° hacia abajo, de frente
 * y 12° hacia arriba); cada uno en dos pasadas, fina en vertical (las rendijas tumbadas) y fina en horizontal (las de
 * pie), a `paso` metros.
 */
export function rendijas(tri: Float32Array, caja: CajaXZ, alto: number, paso = 0.005, alMalo?: (o: V3, d: V3, tIn: number, tOut: number, mejor: number, deFrente: boolean) => void): { rayos: number; malos: number; donde: V3 | null } {
  const c: V3 = [(caja.x0 + caja.x1) / 2, H + alto / 2, (caja.z0 + caja.z1) / 2];
  const p = trianglesRelativos([tri], c);
  const n = p.length / 9;
  const mx = (caja.x1 - caja.x0) / 2 - 0.05;
  const mz = (caja.z1 - caja.z0) / 2 - 0.05;
  const my = alto / 2 - 0.03;
  const suelo = H - c[1];
  const LEJOS = 20;
  const GRUESO = 0.3;
  const CELDA = 0.1;
  let rayos = 0;
  let malos = 0;
  let donde: V3 | null = null;
  for (const elevacion of [-25, 0, 12]) {
    for (let rumbo = 0; rumbo < 8; rumbo++) {
      const el = (elevacion * Math.PI) / 180;
      const az = (rumbo * Math.PI) / 4;
      const d: V3 = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
      /* La base del plano de los rayos: u horizontal, v hacia arriba. */
      const lu = Math.hypot(d[2], d[0]);
      const u: V3 = [-d[2] / lu, 0, d[0] / lu];
      const v: V3 = [u[1] * d[2] - u[2] * d[1], u[2] * d[0] - u[0] * d[2], u[0] * d[1] - u[1] * d[0]];
      let u0 = Infinity;
      let u1 = -Infinity;
      let v0 = Infinity;
      let v1 = -Infinity;
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const q: V3 = [sx * mx, sy * my, sz * mz];
            const a = q[0] * u[0] + q[1] * u[1] + q[2] * u[2];
            const b = q[0] * v[0] + q[1] * v[1] + q[2] * v[2];
            u0 = Math.min(u0, a);
            u1 = Math.max(u1, a);
            v0 = Math.min(v0, b);
            v1 = Math.max(v1, b);
          }
        }
      }
      /* Los triángulos, en cubos de 10 cm del plano de los rayos. */
      const cu = Math.max(1, Math.ceil((u1 - u0) / CELDA) + 2);
      const cv = Math.max(1, Math.ceil((v1 - v0) / CELDA) + 2);
      const cubos: number[][] = Array.from({ length: cu * cv }, () => []);
      for (let t = 0; t < n; t++) {
        let a0 = Infinity;
        let a1 = -Infinity;
        let b0 = Infinity;
        let b1 = -Infinity;
        for (let k = 0; k < 3; k++) {
          const q = t * 9 + k * 3;
          const a = (p[q] as number) * u[0] + (p[q + 1] as number) * u[1] + (p[q + 2] as number) * u[2];
          const b = (p[q] as number) * v[0] + (p[q + 1] as number) * v[1] + (p[q + 2] as number) * v[2];
          a0 = Math.min(a0, a);
          a1 = Math.max(a1, a);
          b0 = Math.min(b0, b);
          b1 = Math.max(b1, b);
        }
        const i0 = Math.max(0, Math.floor((a0 - u0) / CELDA) + 1);
        const i1 = Math.min(cu - 1, Math.floor((a1 - u0) / CELDA) + 1);
        const j0 = Math.max(0, Math.floor((b0 - v0) / CELDA) + 1);
        const j1 = Math.min(cv - 1, Math.floor((b1 - v0) / CELDA) + 1);
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) (cubos[j * cu + i] as number[]).push(t);
      }
      const rayo = (a: number, b: number): void => {
        const o: V3 = [u[0] * a + v[0] * b - d[0] * LEJOS, u[1] * a + v[1] * b - d[1] * LEJOS, u[2] * a + v[2] * b - d[2] * LEJOS];
        /* Por dónde entra y sale del macizo (losas). */
        let tIn = -Infinity;
        let tOut = Infinity;
        const medio: V3 = [mx, my, mz];
        for (let e = 0; e < 3; e++) {
          const de = d[e] as number;
          const oe = o[e] as number;
          const me = medio[e] as number;
          if (Math.abs(de) < 1e-12) {
            if (oe < -me || oe > me) return;
            continue;
          }
          const ta = (-me - oe) / de;
          const tb = (me - oe) / de;
          tIn = Math.max(tIn, Math.min(ta, tb));
          tOut = Math.min(tOut, Math.max(ta, tb));
        }
        if (!(tIn < tOut)) return;
        /* Lo que queda bajo la acera no se ve: ni el tramo del rayo bajo ella ni el rayo que sale del suelo DENTRO de
           la planta de la pieza (para verlo habría que estar bajo tierra). */
        let lo = 0;
        let hi = Infinity;
        if (d[1] > 1e-9) {
          const tg = (suelo - o[1]) / d[1];
          if (tg > tIn) return;
          if (Math.abs(o[0] + d[0] * tg) <= mx + 0.05 && Math.abs(o[2] + d[2] * tg) <= mz + 0.05) return;
          lo = tg;
        } else if (d[1] < -1e-9) {
          hi = (suelo - o[1]) / d[1];
        }
        rayos++;
        const i = Math.floor((a - u0) / CELDA) + 1;
        const j = Math.floor((b - v0) / CELDA) + 1;
        const cubo = cubos[j * cu + i] ?? [];
        /* La cara más cercana QUE LE MIRA (las de espaldas no se pintan: se ve a través de ellas). */
        let mejor = Infinity;
        const EPS = 1e-6;
        for (const t of cubo) {
          const q = t * 9;
          const ax = p[q] as number;
          const ay = p[q + 1] as number;
          const az2 = p[q + 2] as number;
          const e1x = (p[q + 3] as number) - ax;
          const e1y = (p[q + 4] as number) - ay;
          const e1z = (p[q + 5] as number) - az2;
          const e2x = (p[q + 6] as number) - ax;
          const e2y = (p[q + 7] as number) - ay;
          const e2z = (p[q + 8] as number) - az2;
          const px = d[1] * e2z - d[2] * e2y;
          const py = d[2] * e2x - d[0] * e2z;
          const pz = d[0] * e2y - d[1] * e2x;
          const det = e1x * px + e1y * py + e1z * pz;
          /* det > 0: la cara mira al rayo (su normal geométrica va contra `d`); las demás no se pintan. */
          if (det < 1e-12) continue;
          const inv = 1 / det;
          const tx = o[0] - ax;
          const ty = o[1] - ay;
          const tz = o[2] - az2;
          const bu = (tx * px + ty * py + tz * pz) * inv;
          if (bu < -EPS || bu > 1 + EPS) continue;
          const qx = ty * e1z - tz * e1y;
          const qy = tz * e1x - tx * e1z;
          const qz = tx * e1y - ty * e1x;
          const bv = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
          if (bv < -EPS || bu + bv > 1 + EPS) continue;
          const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (tt <= lo || tt >= hi || tt >= mejor) continue;
          mejor = tt;
        }
        /* Lo primero que se ve tiene que estar antes del macizo: si está dentro, se ve el interior; si no hay nada, lo
           de detrás. */
        if (mejor <= tIn + 1e-4) return;
        malos++;
        alMalo?.([o[0] + c[0], o[1] + c[1], o[2] + c[2]], d, tIn, tOut, mejor, mejor !== Infinity);
        if (donde === null) {
          const tt = Math.max(tIn, lo);
          donde = [o[0] + d[0] * tt + c[0], o[1] + d[1] * tt + c[1], o[2] + d[2] * tt + c[2]];
        }
      };
      /* Una irracional de desfase: que los rayos no caigan justo en las aristas de la rejilla de la pieza. */
      const desfase = 0.000731;
      for (let b = v0 + desfase; b <= v1; b += paso) for (let a = u0 + GRUESO / 2 + desfase; a <= u1; a += GRUESO) rayo(a, b);
      for (let a = u0 + desfase; a <= u1; a += paso) for (let b = v0 + GRUESO / 2 + desfase; b <= v1; b += GRUESO) rayo(a, b);
    }
  }
  return { rayos, malos, donde };
}

/** (i) Ninguna rendija en el contenedor ni en el muelle (las muestras de cada tipo, nivel y grado). */
export function juzgarLasRendijas(piezas: readonly Pick<PiezaEscrita, 'tipo' | 'vertices' | 'caja' | 'traza' | 'celda' | 'nivel' | 'grado'>[]): { problemas: string[]; mirados: number; piezas: number } {
  const problemas: string[] = [];
  let mirados = 0;
  let vistas = 0;
  for (const p of piezas) {
    const alto = ALTO_DEL_MACIZO[p.tipo];
    if (alto === undefined || p.caja === null) continue;
    vistas++;
    const r = rendijas(p.vertices, p.caja, alto);
    mirados += r.rayos;
    if (r.malos > 0 && problemas.length < 6) {
      problemas.push(`traza ${String(p.traza)} N${String(p.nivel)} g${String(p.grado)} celda ${String(p.celda)} ${p.tipo}: ${String(r.malos)} de ${String(r.rayos)} rayos lo atraviesan (se ve lo de detrás), el primero entra en (${(r.donde ?? [0, 0, 0]).map((c) => c.toFixed(3)).join(', ')})`);
    }
  }
  return { problemas, mirados, piezas: vistas };
}

/** Lo que cada celda lleva de cada tipo y lo que escribió, por traza, nivel y grado. */
export interface CeldaMedida {
  readonly traza: number;
  readonly celda: number;
  readonly nivel: NivelDeLaCiudad;
  readonly grado: GradoDeLaCelda;
  readonly cuantas: Readonly<Record<TipoDePieza, number>>;
  readonly mob: number;
  readonly emi: number;
}

/** El lado de la ventana de cada nivel y el grado de cada celda en ella (§3.1; el de `grados.ts`). */
const LADO_DE_LA_VENTANA: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 3, 1: 3, 2: 4, 3: 5 };
function gradoEnLaVentana(n: NivelDeLaCiudad, a: number, b: number): GradoDeLaCelda {
  if (n === 2) return (a === 1 || a === 2) && (b === 1 || b === 2) ? 3 : 2;
  if (n === 3) return a >= 1 && a <= 3 && b >= 1 && b <= 3 ? 3 : 2;
  return 1;
}

/**
 * (f) Lo que las piezas añaden a cada ventana de cada traza, contra lo de antes (`LO_DE_ANTES`), por nivel:
 * [mobiliario, emisivo], y dónde. El corte se cuenta sin sus barreras en los dos lados.
 */
export function loQueAnadenLasVentanas(celdas: readonly CeldaMedida[]): Record<NivelDeLaCiudad, { mob: number; emi: number; dondeMob: string; ventanas: number }> {
  const salida = {} as Record<NivelDeLaCiudad, { mob: number; emi: number; dondeMob: string; ventanas: number }>;
  const indice = new Map<string, CeldaMedida>();
  const trazas = new Set<number>();
  for (const c of celdas) {
    indice.set(`${String(c.traza)}|${String(c.celda)}|${String(c.nivel)}|${String(c.grado)}`, c);
    trazas.add(c.traza);
  }
  for (const n of NIVELES_DE_LA_CIUDAD) {
    const lado = LADO_DE_LA_VENTANA[n];
    let mob = -Infinity;
    let emi = -Infinity;
    let dondeMob = '';
    let ventanas = 0;
    for (const t of trazas) {
      for (let i0 = -6; i0 <= 6; i0++) {
        for (let j0 = -6; j0 <= 6; j0++) {
          let dm = 0;
          let de = 0;
          let alguna = false;
          for (let a = 0; a < lado; a++) {
            for (let b = 0; b < lado; b++) {
              const i = i0 + a;
              const j = j0 + b;
              if (i > 6 || j > 6) continue;
              const k = (j + 6) * 13 + (i + 6);
              const c = indice.get(`${String(t)}|${String(k)}|${String(n)}|${String(gradoEnLaVentana(n, a, b))}`);
              if (c === undefined) continue;
              alguna = true;
              let antesM = 0;
              let antesE = 0;
              for (const tipo of TIPOS_DE_PIEZA) {
                antesM += c.cuantas[tipo] * LO_DE_ANTES[n][tipo][0];
                antesE += c.cuantas[tipo] * LO_DE_ANTES[n][tipo][1];
              }
              dm += c.mob - antesM;
              de += c.emi - antesE;
            }
          }
          if (!alguna) continue;
          ventanas++;
          if (dm > mob) {
            mob = dm;
            dondeMob = `traza ${String(t)}, ventana desde la celda (${String(i0)}, ${String(j0)})`;
          }
          emi = Math.max(emi, de);
        }
      }
    }
    salida[n] = { mob, emi, dondeMob, ventanas };
  }
  return salida;
}

export function juzgarElPresupuesto(anade: Record<NivelDeLaCiudad, { mob: number; emi: number }>): string[] {
  const problemas: string[] = [];
  for (const n of NIVELES_DE_LA_CIUDAD) {
    const [pm, pe] = PRESUPUESTO_DE_LA_FICHA[n];
    const a = anade[n];
    if (!(a.mob <= pm)) problemas.push(`N${String(n)}: la peor ventana gana ${String(a.mob)} triángulos de mobiliario (ficha: +${String(pm)})`);
    if (!(a.emi <= pe)) problemas.push(`N${String(n)}: la peor ventana gana ${String(a.emi)} triángulos emisivos (ficha: +${String(pe)})`);
  }
  return problemas;
}

/* ═══════════════════════════════ LA COMPROBACIÓN ═══════════════════════════════ */

/** Junta lo que dice un juez de una celda con lo de las anteriores (los problemas, los seis primeros). */
function sumar(a: { problemas: string[]; mirados: number }, b: { problemas: string[]; mirados: number }): void {
  a.mirados += b.mirados;
  for (const p of b.problemas) if (a.problemas.length < 6) a.problemas.push(p);
}

export const comprobar: ComprobarElPaquete = (ctx: ContextoDeLaCiudad): Resultado[] => {
  const celdas: CeldaMedida[] = [];
  const barreras = new Map<string, readonly [number, number]>();
  /* La banderola de verdad, de las farolas de calle de la traza 0 (no depende de cómo se dibuje la farola). */
  const partes0 = ctx.base(0).partes;
  const banderola = banderolaDeVerdad(partes0.celdas.flatMap((p) => (p === undefined ? [] : p.farolas.map((f) => ({ farola: f, semilla: partes0.semilla })))));
  /*
   * Se juzga celda a celda y se guarda sólo lo que se suma: con la geometría de todas las piezas de las 32 trazas en
   * seis variantes serían cientos de megas. De cada tipo se guarda UNA pieza, la muestra de las vacunas.
   */
  const luces = { problemas: [] as string[], mirados: 0 };
  const ramas = { problemas: [] as string[], mirados: 0 };
  const fuste = { problemas: [] as string[], mirados: 0 };
  const vidrio = { problemas: [] as string[], mirados: 0 };
  const caras = { problemas: [] as string[], mirados: 0 };
  /* (h) y (i) cuestan más (pares de caras y rayos): una pieza por tipo, nivel, grado y traza (h) y dos por tipo, nivel
     y grado (i), juzgadas al verlas. */
  const pisadas = { problemas: [] as string[], mirados: 0 };
  const rendijasVistas = { problemas: [] as string[], mirados: 0 };
  const yaPisadas = new Set<string>();
  const yaRendijas = new Map<string, number>();
  let piezasPisadas = 0;
  let piezasConRendijas = 0;
  const gradosConRendijas = new Set<string>();
  let arboles = 0;
  let farolas = 0;
  let calles = 0;
  let lucesDeFuera = 0;
  let piezasDeLaVentana = 0;
  const topes: MedidaDeLosTopes = { mob: new Map(), emi: new Map(), paso: new Map() };
  const muestras = new Map<TipoDePieza, PiezaEscrita>();
  for (let traza = 0; traza < ctx.trazas; traza++) {
    const partes = ctx.base(traza).partes;
    for (let k = 0; k < partes.celdas.length; k++) {
      const parte = partes.celdas[k];
      if (parte === undefined) continue;
      const cuantas: Record<TipoDePieza, number> = {
        'farola de calle': parte.farolas.filter((f) => f.brazo !== null).length,
        'farola de plaza': parte.farolas.filter((f) => f.brazo === null).length,
        'farola de pared': parte.lamparas.length,
        árbol: parte.troncos.length,
        estatua: parte.estatuas.length,
        contenedor: parte.contenedores.length,
        carretilla: parte.carretillas.length,
        muelle: parte.muelles.length,
        corte: parte.cortes.length,
      };
      for (const nivel of NIVELES_DE_LA_CIUDAD) {
        for (const v of variantes(nivel)) {
          const escritas = escribirLaCelda(parte, partes, traza, k, nivel, v.grado, barreras);
          /* (a) en todas las variantes, también el grado 1 de N2 y N3 (la luz de fuera de la ventana). */
          sumar(luces, juzgarLasLuces(escritas));
          const conLuz = escritas.filter((p) => p.esperada !== null).length;
          farolas += conLuz;
          if (v.soloLuces) {
            lucesDeFuera += conLuz;
            continue;
          }
          piezasDeLaVentana += escritas.length;
          const r = juzgarLasRamas(escritas);
          sumar(ramas, r);
          arboles += r.arboles;
          if (banderola !== null) sumar(fuste, juzgarElFuste(escritas, banderola));
          calles += escritas.filter((p) => p.tipo === 'farola de calle').length;
          sumar(vidrio, juzgarElVidrio(escritas));
          sumar(caras, juzgarLasCaras(escritas));
          for (const p of escritas) {
            const clave = `${p.tipo}|${String(nivel)}|${String(v.grado)}`;
            if (!yaPisadas.has(`${clave}|${String(traza)}`)) {
              yaPisadas.add(`${clave}|${String(traza)}`);
              const r = juzgarLasPisadas([p]);
              sumar(pisadas, r);
              piezasPisadas += r.piezas;
            }
            const vistas = yaRendijas.get(clave) ?? 0;
            if (ALTO_DEL_MACIZO[p.tipo] !== undefined && vistas < 2) {
              yaRendijas.set(clave, vistas + 1);
              const r = juzgarLasRendijas([p]);
              sumar(rendijasVistas, r);
              piezasConRendijas += r.piezas;
              gradosConRendijas.add(`${p.tipo}|${String(v.grado)}`);
            }
          }
          const t = medirLosTopes(escritas);
          for (const [c, n] of t.mob) topes.mob.set(c, Math.max(topes.mob.get(c) ?? 0, n));
          for (const [c, n] of t.emi) topes.emi.set(c, Math.max(topes.emi.get(c) ?? 0, n));
          for (const [c, n] of t.paso) topes.paso.set(c, Math.max(topes.paso.get(c) ?? 0, n));
          for (const p of escritas) if (!muestras.has(p.tipo) && p.vertices.length > 0) muestras.set(p.tipo, p);
          let mob = 0;
          let emi = 0;
          for (const p of escritas) {
            mob += p.mob;
            emi += p.emi;
          }
          celdas.push({ traza, celda: k, nivel, grado: v.grado, cuantas, mob, emi });
        }
      }
    }
  }
  const resultados: Resultado[] = [];

  /* (a) */
  resultados.push({ que: '(a) cada farola devuelve su luz de d4402d0 (±1 cm) en todo grado, y la luz cae en su vidrio (a menos de 10 cm)', bien: luces.problemas.length === 0, detalle: luces.problemas, inspeccionados: luces.mirados, minimo: Math.max(1, farolas) });
  {
    const una = muestras.get('farola de calle');
    const alta = una === undefined ? null : { ...una, luces: una.luces.map((l) => ({ ...l, y: l.y + 0.1 })) };
    const lejos = una === undefined ? null : { ...una, vidrio: una.vidrio.map((c, i) => (i % 3 === 1 ? c + 0.3 : c)) };
    const rojaAlta = alta !== null && juzgarLasLuces([alta]).problemas.length > 0;
    const rojaLejos = lejos !== null && juzgarLasLuces([lejos]).problemas.length > 0;
    resultados.push({ que: '(a) vacunas: una cabeza 10 cm más alta y un vidrio 30 cm por encima de su luz salen rojas', bien: rojaAlta && rojaLejos, detalle: { rojaAlta, rojaLejos }, inspeccionados: una === undefined ? 0 : 2, minimo: 2 });
  }
  ctx.nota(`(a) ${String(farolas)} farolas mirando su luz (${String(lucesDeFuera)} de ellas en el grado 1 de N2 y N3, el de la luz de fuera de la ventana)`);

  /* (b) */
  resultados.push({ que: '(b) todo el árbol por encima de 1,9 m o dentro del radio de su tronco', bien: ramas.problemas.length === 0, detalle: ramas.problemas, inspeccionados: ramas.mirados, minimo: Math.max(1, arboles * 40) });
  {
    const uno = muestras.get('árbol');
    const malo = uno === undefined ? null : { ...uno, vertices: Float32Array.from([...uno.vertices, uno.x + 0.8, 1.5, uno.z]) };
    const roja = malo !== null && juzgarLasRamas([malo]).problemas.length > 0;
    resultados.push({ que: '(b) vacuna: un vértice del árbol a 1,5 m de alto y 0,8 m del tronco sale rojo', bien: roja, inspeccionados: malo === null ? 0 : 1, minimo: 1 });
  }

  /* (c) */
  const problemasDeTopes = juzgarLosTopes(topes);
  resultados.push({ que: '(c) los topes por pieza y grado (§3.1 y la ficha), en mobiliario y emisivo, y ninguna pieza por encima del trozo de su nivel', bien: problemasDeTopes.length === 0, detalle: problemasDeTopes, inspeccionados: piezasDeLaVentana, minimo: TIPOS_DE_PIEZA.length });
  {
    const tiposVistos = new Set([...topes.mob.keys()].map((c) => c.split('|')[0]));
    resultados.push({ que: '(c) se han medido los nueve tipos de pieza', bien: TIPOS_DE_PIEZA.every((t) => tiposVistos.has(t)), detalle: [...tiposVistos], inspeccionados: tiposVistos.size, minimo: TIPOS_DE_PIEZA.length });
    const malo = medirLosTopes([{ tipo: 'farola de pared', grado: 1, nivel: 0, mob: 61, emi: 10, paso: 71 }]);
    resultados.push({ que: '(c) vacuna: una farola de pared de grado 1 con 61 triángulos sale roja', bien: juzgarLosTopes(malo).length > 0, inspeccionados: 1, minimo: 1 });
  }
  ctx.nota(
    `(c) lo más que escribe cada pieza (mobiliario/emisivo) en g1 · g2 · g3: ${TIPOS_DE_PIEZA.map(
      (t) => `${t} ${([1, 2, 3] as const).map((g) => `${String(topes.mob.get(`${t}|${String(g)}`) ?? '—')}/${String(topes.emi.get(`${t}|${String(g)}`) ?? '—')}`).join(' · ')}`,
    ).join('; ')}`,
  );

  /* (d) */
  if (banderola === null) {
    resultados.push({ que: '(d) hay una banderola de verdad con la que medir el fuste', bien: false, inspeccionados: 0, minimo: 1 });
  } else {
    resultados.push({ que: `(d) las banderolas no atraviesan el fuste (lona desde ${banderola.radioDeLaLona.toFixed(3)} m del eje, de ${banderola.lonaDesde.toFixed(2)} a ${banderola.lonaHasta.toFixed(2)} m) y su varilla entra en él`, bien: fuste.problemas.length === 0, detalle: fuste.problemas, inspeccionados: fuste.mirados, minimo: Math.max(1, calles) });
    const una = muestras.get('farola de calle');
    const anillo = una === undefined ? null : { ...una, vertices: Float32Array.from([...una.vertices, una.x + 0.14, (banderola.lonaDesde + banderola.lonaHasta) / 2, una.z]) };
    const flaco = una === undefined ? null : { ...una, vertices: Float32Array.from([una.x + 0.04, banderola.alturaDeLaVarilla, una.z]) };
    const rojaAnillo = anillo !== null && juzgarElFuste([anillo], banderola).problemas.length > 0;
    const rojaFlaco = flaco !== null && juzgarElFuste([flaco], banderola).problemas.length > 0;
    resultados.push({ que: '(d) vacunas: un anillo de 14 cm en la lona y un fuste de 4 cm en la varilla salen rojos', bien: rojaAnillo && rojaFlaco, detalle: { rojaAnillo, rojaFlaco }, inspeccionados: una === undefined ? 0 : 2, minimo: 2 });
  }

  /* (e) */
  resultados.push({ que: '(e) el vidrio de toda farola es de tipo 1 con su coordenada radial en [0, 1], y de 0 a 1 donde tiene lámpara', bien: vidrio.problemas.length === 0, detalle: vidrio.problemas, inspeccionados: vidrio.mirados, minimo: Math.max(1, farolas) });
  {
    const una = muestras.get('farola de calle');
    const mala = una === undefined ? null : { ...una, emisor: una.emisor.map((c, i) => (i % 2 === 0 ? 0 : c)) };
    resultados.push({ que: '(e) vacuna: un vidrio de tipo 0 sale rojo', bien: mala !== null && juzgarElVidrio([mala]).problemas.length > 0, inspeccionados: mala === null ? 0 : 1, minimo: 1 });
  }

  /* (g) */
  resultados.push({ que: '(g) ninguna cara al revés en las piezas del paquete, en mobiliario ni en lo emisivo, en ningún nivel ni grado', bien: caras.problemas.length === 0, detalle: caras.problemas, inspeccionados: caras.mirados, minimo: Math.max(1, piezasDeLaVentana * 10) });
  {
    const una = muestras.get('farola de pared');
    let mala: PiezaEscrita | null = null;
    if (una !== undefined && una.vertices.length >= 9) {
      /* Se le da la vuelta al primer triángulo: se cambian sus dos últimos vértices. */
      const v = Float32Array.from(una.vertices);
      for (let k = 0; k < 3; k++) {
        const a = v[3 + k] as number;
        v[3 + k] = v[6 + k] as number;
        v[6 + k] = a;
      }
      mala = { ...una, vertices: v };
    }
    resultados.push({ que: '(g) vacuna: una farola de pared con un triángulo al revés sale roja', bien: mala !== null && juzgarLasCaras([mala]).problemas.length > 0, inspeccionados: mala === null ? 0 : 1, minimo: 1 });
  }

  /* (h) */
  resultados.push({
    que: `(h) ninguna pieza con dos caras en el mismo plano (±${String(MISMO_PLANO * 1000)} mm) que se pisan: una de cada tipo, nivel, grado y traza`,
    bien: pisadas.problemas.length === 0,
    detalle: pisadas.problemas,
    inspeccionados: pisadas.mirados,
    minimo: Math.max(TIPOS_DE_PIEZA.length * 6 * 20, piezasPisadas * 20),
  });
  ctx.nota(`(h) ${String(piezasPisadas)} piezas y ${String(pisadas.mirados)} caras mirando si se pisan`);
  {
    const una = muestras.get('muelle');
    let mala: PiezaEscrita | null = null;
    if (una !== undefined && una.vertices.length >= 9) {
      /* Su primer triángulo, otra vez, 1 mm por delante de sí mismo. */
      const v = una.vertices;
      const ux = (v[3] as number) - (v[0] as number);
      const uy = (v[4] as number) - (v[1] as number);
      const uz = (v[5] as number) - (v[2] as number);
      const wx = (v[6] as number) - (v[0] as number);
      const wy = (v[7] as number) - (v[1] as number);
      const wz = (v[8] as number) - (v[2] as number);
      const g: V3 = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
      const l = Math.hypot(g[0], g[1], g[2]) || 1;
      const copia = Array.from(v.slice(0, 9), (c, i) => c + ((g[i % 3] as number) / l) * 0.001);
      mala = { ...una, vertices: Float32Array.from([...v, ...copia]) };
    }
    resultados.push({ que: '(h) vacuna: un muelle con una cara repetida 1 mm por delante sale rojo', bien: mala !== null && juzgarLasPisadas([mala]).problemas.length > 0, inspeccionados: mala === null ? 0 : 1, minimo: 1 });
  }

  /* (i) */
  resultados.push({
    que: '(i) ni el contenedor ni el muelle tienen rendijas: todo rayo que atraviesa su macizo da antes en una cara que le mira',
    bien: rendijasVistas.problemas.length === 0 && gradosConRendijas.size >= 6,
    detalle: { problemas: rendijasVistas.problemas, vistos: [...gradosConRendijas] },
    inspeccionados: rendijasVistas.mirados,
    minimo: Math.max(100000, piezasConRendijas * 50000),
  });
  ctx.nota(`(i) ${String(piezasConRendijas)} contenedores y muelles, ${String(rendijasVistas.mirados)} rayos por su macizo (${[...gradosConRendijas].sort().join(', ')})`);
  {
    const uno = muestras.get('contenedor');
    let malo: PiezaEscrita | null = null;
    if (uno !== undefined && uno.caja !== null) {
      /* Sin los costados largos (lo que les mira en horizontal): se ve de lado a lado. */
      const enX = uno.caja.x1 - uno.caja.x0 >= uno.caja.z1 - uno.caja.z0;
      const v = uno.vertices;
      const quedan: number[] = [];
      for (let t = 0; t + 8 < v.length; t += 9) {
        const ux = (v[t + 3] as number) - (v[t] as number);
        const uy = (v[t + 4] as number) - (v[t + 1] as number);
        const uz = (v[t + 5] as number) - (v[t + 2] as number);
        const wx = (v[t + 6] as number) - (v[t] as number);
        const wy = (v[t + 7] as number) - (v[t + 1] as number);
        const wz = (v[t + 8] as number) - (v[t + 2] as number);
        const gx = uy * wz - uz * wy;
        const gz = ux * wy - uy * wx;
        const l = Math.hypot(gx, uz * wx - ux * wz, gz) || 1;
        if (Math.abs((enX ? gz : gx) / l) > 0.9) continue;
        for (let k = 0; k < 9; k++) quedan.push(v[t + k] as number);
      }
      malo = { ...uno, vertices: Float32Array.from(quedan) };
    }
    resultados.push({ que: '(i) vacuna: un contenedor sin sus costados largos sale rojo', bien: malo !== null && juzgarLasRendijas([malo]).problemas.length > 0, inspeccionados: malo === null ? 0 : 1, minimo: 1 });
  }

  /* (f) */
  const anade = loQueAnadenLasVentanas(celdas);
  const problemasDelPresupuesto = juzgarElPresupuesto(anade);
  const ventanas = NIVELES_DE_LA_CIUDAD.reduce<number>((s, n) => s + anade[n].ventanas, 0);
  resultados.push({ que: '(f) lo que las piezas añaden a la peor ventana cabe en el presupuesto de la ficha (+500 / +800 / +7.000 / +27.000 de mobiliario, +0 / +0 / +1.200 / +2.500 de emisivo)', bien: problemasDelPresupuesto.length === 0, detalle: problemasDelPresupuesto, inspeccionados: ventanas, minimo: ctx.trazas * 4 * 100 });
  ctx.nota(`(f) la peor ventana gana, N0-N3: ${NIVELES_DE_LA_CIUDAD.map((n) => `${String(anade[n].mob)}/${String(anade[n].emi)} (${anade[n].dondeMob})`).join(' · ')} (mobiliario/emisivo)`);
  {
    const una = celdas.find((c) => c.nivel === 0);
    const inflada = una === undefined ? null : celdas.map((c) => (c === una ? { ...c, mob: c.mob + 600 } : c));
    const roja = inflada !== null && juzgarElPresupuesto(loQueAnadenLasVentanas(inflada)).length > 0;
    resultados.push({ que: '(f) vacuna: 600 triángulos de más en una celda de N0 salen rojos', bien: roja, inspeccionados: una === undefined ? 0 : 1, minimo: 1 });
  }
  return resultados;
};
