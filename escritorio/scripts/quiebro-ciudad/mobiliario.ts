/**
 * LAS COMPROBACIONES DEL MOBILIARIO en `verify:quiebro-ciudad` (plan del detalle, §5.2.8 y la ficha O2-MOBILIARIO).
 * Dueño: O2-MOBILIARIO. Miran las piezas de `mobiliario.ts` (banco, fuente, quiosco de la plaza, quiosco de prensa,
 * cabina y refugio) y el material del mobiliario (las familias de la materia):
 *
 *   (a) LOS TOPES POR PIEZA Y GRADO (§3.1, `TOPE_POR_PIEZA`): cada pieza de las trazas, construida sola en cada nivel
 *       y cada grado que ese nivel lleva, escribe como mucho su tope (mobiliario, emisivo y cristal juntos).
 *   (b) NINGÚN NIVEL PINTA MENOS QUE EL DE ABAJO: cada pieza, en el grado mayor de cada nivel (N0 g1, N1 g1, N2 g3, N3
 *       g3) y en el anillo (N2 g2, N3 g2), escribe N0 ≤ N1 ≤ N2 ≤ N3; y la suma por tipo, lo mismo. La pieza se
 *       reconoce en todos los niveles por `dondeDeLaPieza` (traza, celda y su puesto en la celda); lo inspeccionado
 *       son las escaleras de una pieza sola que tienen dos peldaños o más.
 *   (c) LA CABINA Y EL REFUGIO SE CONSTRUYEN DISTINTOS, y el auricular de la cabina tiene su rango de vértices en lo
 *       emisivo y su pivote: el rango no está vacío, cabe en el molde, es ámbar, cuelga del pivote (todos sus
 *       vértices a menos de 40 cm y por debajo de él) y el pivote es el mismo en todos los grados.
 *   (d) TODA FAMILIA QUE SE ESCRIBE TIENE SU RAMA en el GLSL: los números de familia de `aAcabado` en el mobiliario
 *       de las celdas (todas las piezas, no sólo las mías) tienen su función en `FUNCION_DE_LA_FAMILIA`, su texto en
 *       `GLSL_DE_LAS_FAMILIAS` y su rama en el reparto; y las del mobiliario (1-8), su fila en la receta
 *       (`RECETAS_POR_FAMILIA`, `familias/liso.ts`) distinta de la neutra, y la tabla escrita en el sombreador.
 *   (e) LA LUZ DE `MoldeQueNoGuarda` ES LA DEL MOLDE QUE GUARDA: el mobiliario de cada celda, con moldes que guardan y
 *       con moldes que sólo cuentan, da las mismas luces (±1 mm), en cada nivel y grado.
 *   (f) LOS TROZOS DE MIS PIEZAS (VERIFICACIÓN 12, pieza a pieza): entre dos `yield` de una pieza no se escriben más de
 *       600 (N0) o 1.000 (N1-N3) triángulos, sumando familias, en todos sus grados.
 *   (g) LAS PLANAS DEL QUIOSCO DE PRENSA TIENEN DIBUJO: construido solo en cada nivel y grado, cada cara vertical con
 *       plástico de cartel lleva al menos cinco colores (papel, cabecera, tinta, foto: `plana` de `mobiliario.ts`), y
 *       los dos costados los llevan. Los carteles eran rectángulos de un color, y se leían como textura que falta.
 *
 * Cada juez es una función que recibe lo que juzga, y se aplica también a una VACUNA (un banco de g1 con 200
 * triángulos, un banco que en N3 pinta menos que en N1 y las medidas de verdad con UNA prensa del anillo vacía, un
 * auricular corrido una caja, una familia sin rama, una luz que se mueve 2 mm, una fuente de g3 que no cede, un quiosco
 * de prensa con los carteles lisos): si la
 * vacuna sale verde, el juez no mira y el resultado sale rojo. Cada resultado lleva su mínimo de inspeccionados.
 */
import type { ComprobarElPaquete, Resultado } from './comun';
import { TROZO_POR_NIVEL } from './comun';
import type { CeldaConstruida, ObraDeLaCelda, ParteDeLaCelda, PartesDeLaCiudad } from '../../src/quiebro/ciudad/celdas';
import { FAMILIAS, moldesDeLaObra, obraNueva } from '../../src/quiebro/ciudad/celdas';
import type { LuzDelMobiliario, PiezaDelMobiliario } from '../../src/quiebro/ciudad/mobiliario';
import { TOPE_POR_PIEZA, auricularesDeLaObra, banco, cabina, fuente, pivoteDelAuricular, quiosco, quioscoDePrensa, refugio } from '../../src/quiebro/ciudad/mobiliario';
import { mobiliarioDeLaCelda } from '../../src/quiebro/ciudad/celda-mobiliario';
import { FAMILIA, FUNCION_DE_LA_FAMILIA, GLSL_DE_LAS_FAMILIAS } from '../../src/quiebro/ciudad/materia/familias';
import { RECETAS_POR_FAMILIA, RECETA_NEUTRA } from '../../src/quiebro/ciudad/materia/familias/liso';
import type { CabinaDelPlano, GradoDeLaCelda, NivelDeLaCiudad, PiezaConFrente } from '../../src/quiebro/ciudad/tipos';
import { GRADOS_DEL_NIVEL } from '../../src/quiebro/ciudad/grados';

type Generador = Generator<void, LuzDelMobiliario | readonly LuzDelMobiliario[] | void, void>;
type Escritor = (obra: ObraDeLaCelda) => Generador;

/** Las piezas de una celda, cada una con su tipo y cómo se escribe. */
function piezasDe(parte: ParteDeLaCelda): { readonly tipo: PiezaDelMobiliario; readonly escribir: Escritor }[] {
  return [
    ...parte.bancos.map((b) => ({ tipo: 'banco' as const, escribir: (o: ObraDeLaCelda): Generador => banco(o, b) })),
    ...parte.fuentes.map((f) => ({ tipo: 'fuente' as const, escribir: (o: ObraDeLaCelda): Generador => fuente(o, f) })),
    ...parte.quioscos.map((q) => ({ tipo: 'quiosco' as const, escribir: (o: ObraDeLaCelda): Generador => quiosco(o, q) })),
    ...parte.quioscosDePrensa.map((q) => ({ tipo: 'prensa' as const, escribir: (o: ObraDeLaCelda): Generador => quioscoDePrensa(o, q) })),
    ...parte.cabinas.map((c) => ({
      tipo: (c.refugio ? 'refugio' : 'cabina') as PiezaDelMobiliario,
      escribir: (o: ObraDeLaCelda): Generador => (c.refugio ? refugio(o, c) : cabina(o, c)),
    })),
  ];
}

/** Las combinaciones de nivel y grado que la ventana construye (`GRADOS_DEL_NIVEL`). */
const COMBINACIONES: readonly (readonly [NivelDeLaCiudad, GradoDeLaCelda])[] = ([0, 1, 2, 3] as const).flatMap((n) => GRADOS_DEL_NIVEL[n].map((g) => [n, g] as const));

/** Una obra nueva, con moldes que guardan (o que sólo cuentan). */
function obraDe(partes: PartesDeLaCiudad, nivel: NivelDeLaCiudad, grado: GradoDeLaCelda, guardar = true): ObraDeLaCelda {
  return obraNueva({ nivel, grado, relieveDeHoy: true, ciudad: partes, m: moldesDeLaObra(guardar) });
}

const totalDe = (obra: ObraDeLaCelda): number => FAMILIAS.reduce((s, f) => s + obra.m[f].triangulos, 0);

/** Lo que escribe una pieza en una obra: sus triángulos (todas las familias) y su paso mayor entre dos `yield`. */
function medirLaPieza(obra: ObraDeLaCelda, escribir: Escritor): { readonly triangulos: number; readonly pasoMayor: number } {
  const antes = totalDe(obra);
  let desde = antes;
  let pasoMayor = 0;
  const g = escribir(obra);
  for (;;) {
    const r = g.next();
    pasoMayor = Math.max(pasoMayor, totalDe(obra) - desde);
    desde = totalDe(obra);
    if (r.done === true) break;
  }
  return { triangulos: totalDe(obra) - antes, pasoMayor };
}

/* ═══════════════════════════════ LOS JUECES ═══════════════════════════════ */

/** Una medida de una pieza: su tipo, dónde, en qué nivel y grado, y lo que escribió. */
export interface MedidaDeLaPieza {
  readonly tipo: PiezaDelMobiliario;
  readonly donde: string;
  readonly nivel: NivelDeLaCiudad;
  readonly grado: GradoDeLaCelda;
  readonly triangulos: number;
  readonly pasoMayor: number;
}

/** (a) Las piezas por encima de su tope de §3.1. */
export function juzgarLosTopes(medidas: readonly MedidaDeLaPieza[]): string[] {
  const malas: string[] = [];
  for (const m of medidas) {
    const tope = TOPE_POR_PIEZA[m.tipo][m.grado];
    if (m.triangulos > tope && malas.length < 6) malas.push(`${m.tipo} ${m.donde} N${String(m.nivel)} g${String(m.grado)}: ${String(m.triangulos)} > ${String(tope)}`);
  }
  return malas;
}

/**
 * Dónde está una pieza: su traza, su celda y su puesto `k` entre las piezas de la celda (`piezasDe`). Es la MISMA
 * cadena para la misma pieza en todos los niveles y grados, y así (b) junta sus peldaños: con un contador que cambia
 * en cada medida, cada pieza tendría un solo peldaño y la escalera pieza a pieza no se recorrería nunca.
 */
export function dondeDeLaPieza(traza: number, celda: number, k: number): string {
  return `traza ${String(traza)} celda ${String(celda)} #${String(k)}`;
}

/** Lo que dice (b): los peldaños que bajan, y cuántas escaleras de una pieza sola (con dos peldaños o más) se miraron. */
export interface JuicioDeLosNiveles {
  readonly malas: string[];
  readonly escalerasDePieza: number;
}

/** (b) Las piezas (y los tipos) que en un nivel escriben menos que en el de abajo, en el grado mayor y en el anillo. */
export function juzgarLosNiveles(medidas: readonly MedidaDeLaPieza[]): JuicioDeLosNiveles {
  const malas: string[] = [];
  const porPieza = new Map<string, Map<string, number>>();
  const porTipo = new Map<string, Map<string, number>>();
  for (const m of medidas) {
    const nivelYGrado = `${String(m.nivel)}g${String(m.grado)}`;
    const clave = `${m.tipo} ${m.donde}`;
    const n = porPieza.get(clave) ?? new Map<string, number>();
    n.set(nivelYGrado, m.triangulos);
    porPieza.set(clave, n);
    const t = porTipo.get(m.tipo) ?? new Map<string, number>();
    t.set(nivelYGrado, (t.get(nivelYGrado) ?? 0) + m.triangulos);
    porTipo.set(m.tipo, t);
  }
  const escaleras: readonly (readonly string[])[] = [
    ['0g1', '1g1', '2g3', '3g3'],
    ['0g1', '1g1', '2g2', '3g2'],
  ];
  let escalerasDePieza = 0;
  const recorrer = (quien: string, mapa: Map<string, number>): number => {
    let recorridas = 0;
    for (const escalera of escaleras) {
      /* Cada peldaño contra el mayor de los de abajo que haya (un nivel que falta no rompe la escalera). */
      let mayor: { readonly donde: string; readonly cuanto: number } | null = null;
      let peldanos = 0;
      for (const peldano of escalera) {
        const b = mapa.get(peldano);
        if (b === undefined) continue;
        peldanos++;
        if (mayor !== null && b < mayor.cuanto && malas.length < 6) malas.push(`${quien}: N${mayor.donde} ${String(mayor.cuanto)} > N${peldano} ${String(b)}`);
        if (mayor === null || b > mayor.cuanto) mayor = { donde: peldano, cuanto: b };
      }
      if (peldanos >= 2) recorridas++;
    }
    return recorridas;
  };
  for (const [quien, mapa] of porPieza) escalerasDePieza += recorrer(quien, mapa);
  for (const [t, mapa] of porTipo) recorrer(`todos los ${t}`, mapa);
  return { malas, escalerasDePieza };
}

/** (f) Las piezas cuyo paso mayor pasa del trozo de su nivel. */
export function juzgarLosTrozos(medidas: readonly MedidaDeLaPieza[]): string[] {
  const malas: string[] = [];
  for (const m of medidas) {
    if (m.pasoMayor > TROZO_POR_NIVEL[m.nivel] && malas.length < 6) malas.push(`${m.tipo} ${m.donde} N${String(m.nivel)} g${String(m.grado)}: ${String(m.pasoMayor)} triángulos entre dos pasos > ${String(TROZO_POR_NIVEL[m.nivel])}`);
  }
  return malas;
}

/** Lo que se sabe del auricular de una cabina construida sola. */
interface AuricularMedido {
  readonly desde: number;
  readonly hasta: number;
  readonly pivote: readonly [number, number, number];
  readonly vertices: number;
  readonly posiciones: Float32Array;
  readonly colores: Float32Array;
}

/** (c) Lo que está mal en un auricular: el rango, el color, que cuelgue del pivote. */
export function juzgarElAuricular(a: AuricularMedido): string[] {
  const p: string[] = [];
  if (!(a.hasta > a.desde)) p.push(`el rango del auricular está vacío (${String(a.desde)}-${String(a.hasta)})`);
  if (a.hasta > a.vertices) p.push(`el rango del auricular (${String(a.desde)}-${String(a.hasta)}) se sale del molde de lo emisivo (${String(a.vertices)} vértices)`);
  for (let i = a.desde; i < Math.min(a.hasta, a.vertices); i++) {
    const x = a.posiciones[i * 3] as number;
    const y = a.posiciones[i * 3 + 1] as number;
    const z = a.posiciones[i * 3 + 2] as number;
    const d = Math.hypot(x - a.pivote[0], y - a.pivote[1], z - a.pivote[2]);
    if (d > 0.4 || y > a.pivote[1] + 0.01) {
      p.push(`el vértice ${String(i)} del auricular está a ${d.toFixed(2)} m del pivote y a ${(y - a.pivote[1]).toFixed(2)} m de su altura: no cuelga de él`);
      break;
    }
    const r = a.colores[i * 3] as number;
    const g = a.colores[i * 3 + 1] as number;
    const b = a.colores[i * 3 + 2] as number;
    if (!(r > 1 && r > g && g > b)) {
      p.push(`el vértice ${String(i)} del auricular no es ámbar (${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)})`);
      break;
    }
  }
  return p;
}

/** Una huella de lo escrito en los moldes de una obra (posiciones redondeadas al mm). */
function huella(obra: ObraDeLaCelda): string {
  let h = 0;
  for (const f of FAMILIAS) {
    const pos = obra.m[f].volcar().datos.get('position');
    if (pos === undefined) continue;
    for (let i = 0; i < pos.length; i++) h = (Math.imul(h, 31) + Math.round((pos[i] as number) * 1000)) | 0;
  }
  return String(h);
}

/** (d) Los números de familia escritos que no tienen su rama, su función, su texto o (1-8) su fila de la receta. */
export function juzgarLasFamilias(familias: ReadonlySet<number>, glsl: string, funciones: Readonly<Record<number, string>>): string[] {
  const p: string[] = [];
  for (const f of familias) {
    const fn = funciones[f];
    if (fn === undefined) {
      p.push(`la familia ${String(f)} se escribe y no tiene función en FUNCION_DE_LA_FAMILIA`);
      continue;
    }
    if (!new RegExp(`SuperficieQ\\s+${fn}\\s*\\(\\s*EntradaQ\\s+e\\s*\\)`).test(glsl)) p.push(`la familia ${String(f)} (${fn}) no tiene su texto en GLSL_DE_LAS_FAMILIAS`);
    if (f !== 0 && !glsl.includes(`if (familia == ${String(f)}) return ${fn}(e);`)) p.push(`la familia ${String(f)} (${fn}) no tiene su rama en el reparto`);
    if (f >= 1 && f <= 8) {
      const fila = RECETAS_POR_FAMILIA[f];
      if (fila === undefined || JSON.stringify(fila) === JSON.stringify(RECETA_NEUTRA)) p.push(`la familia ${String(f)} es del mobiliario y no tiene fila en la receta (familias/liso.ts)`);
    }
  }
  if (!/const vec4 RECETAS_MOQ\[64\]/.test(glsl)) p.push('la tabla de la receta (RECETAS_MOQ[64]) no está en el GLSL de las familias');
  return p;
}

/** Las familias que se escriben en el mobiliario de una celda construida (la parte entera de `aAcabado.x`). */
function familiasEscritas(celda: CeldaConstruida, salida: Set<number>): number {
  const a = celda.familias.mobiliario.datos.get('aAcabado');
  if (a === undefined) return 0;
  for (let i = 0; i < a.length; i += 2) salida.add(Math.floor(a[i] as number));
  return a.length / 2;
}

/** (e) Las luces de dos listas que no casan (en orden, a ±1 mm). */
export function juzgarLasLuces(a: readonly LuzDelMobiliario[], b: readonly LuzDelMobiliario[]): string[] {
  if (a.length !== b.length) return [`${String(a.length)} luces con el molde que guarda y ${String(b.length)} con el que sólo cuenta`];
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as LuzDelMobiliario;
    const y = b[i] as LuzDelMobiliario;
    if (x.tipo !== y.tipo || Math.hypot(x.x - y.x, x.y - y.y, x.z - y.z) > 0.001) {
      return [`la luz ${String(i)} (${x.tipo}) está en (${x.x.toFixed(3)}, ${x.y.toFixed(3)}, ${x.z.toFixed(3)}) y en (${y.x.toFixed(3)}, ${y.y.toFixed(3)}, ${y.z.toFixed(3)})`];
    }
  }
  return [];
}

/** Lo que (g) mira de un quiosco de prensa construido solo: su mobiliario volcado. */
export interface PlanasVolcadas {
  readonly vertices: number;
  readonly normales: Float32Array;
  readonly colores: Float32Array;
  readonly acabados: Float32Array;
}

/** Los colores distintos que (g) pide en cada cara con planas: la revista de g1 lleva cinco (ver `plana`). */
export const COLORES_POR_CARA_CON_PLANAS = 5;

/**
 * (g) Las caras del quiosco con plástico de cartel (familia 6, verticales), agrupadas por su normal, y cuántos colores
 * distintos lleva cada una: la que lleva menos de `COLORES_POR_CARA_CON_PLANAS` es un cartel liso. También es rojo que
 * no haya dos caras (los dos costados). Devuelve los problemas y cuántas caras miró.
 */
export function juzgarLasPlanas(v: PlanasVolcadas): { readonly malas: string[]; readonly caras: number } {
  const porCara = new Map<string, Set<string>>();
  for (let i = 0; i < v.vertices; i++) {
    if (Math.floor(v.acabados[i * 2] as number) !== FAMILIA.plastico) continue;
    if (Math.abs(v.normales[i * 3 + 1] as number) > 0.1) continue;
    const cara = `${(v.normales[i * 3] as number).toFixed(1)},${(v.normales[i * 3 + 2] as number).toFixed(1)}`;
    const colores = porCara.get(cara) ?? new Set<string>();
    colores.add([0, 1, 2].map((k) => (v.colores[i * 3 + k] as number).toFixed(3)).join(','));
    porCara.set(cara, colores);
  }
  const malas: string[] = [];
  if (porCara.size < 2) malas.push(`${String(porCara.size)} caras con planas (los dos costados las llevan)`);
  for (const [cara, colores] of porCara) {
    if (colores.size < COLORES_POR_CARA_CON_PLANAS) malas.push(`la cara de normal (${cara}) lleva ${String(colores.size)} colores: un cartel liso`);
  }
  return { malas, caras: porCara.size };
}

/* ═══════════════════════════════ LAS COMPROBACIONES ═══════════════════════════════ */

/** Los mínimos de inspeccionados (las 32 trazas tienen unas 120 piezas de las mías cada una). */
const MINIMOS = {
  piezas: 20_000,
  /* Unas 3.900 piezas en las 32 trazas, cada una con sus dos escaleras (el centro y el anillo). */
  escalerasDePieza: 6_000,
  vertices: 1_000_000,
  celdasConLuces: 2_000,
  auriculares: 6,
  /* (g): `PRENSAS_CON_PLANAS` quioscos, con dos caras en g1 y g2 y tres en g3: 14 por quiosco en las seis combinaciones. */
  carasConPlanas: 250,
} as const;

/** Cuántos quioscos de prensa construye (g) solos, de las primeras trazas. */
const PRENSAS_CON_PLANAS = 20;

export const comprobar: ComprobarElPaquete = (ctx) => {
  const resultados: Resultado[] = [];
  const medidas: MedidaDeLaPieza[] = [];
  const familias = new Set<number>();
  let verticesMirados = 0;
  let celdasConLuces = 0;
  const lucesMal: string[] = [];
  let unaCabina: { partes: PartesDeLaCiudad; c: CabinaDelPlano } | null = null;
  const prensas: { readonly partes: PartesDeLaCiudad; readonly q: PiezaConFrente }[] = [];
  for (let traza = 0; traza < ctx.trazas; traza++) {
    const partes = ctx.base(traza).partes;
    for (const parte of partes.celdas) for (const q of parte.quioscosDePrensa) if (prensas.length < PRENSAS_CON_PLANAS) prensas.push({ partes, q });
    for (const [n, g] of COMBINACIONES) {
      const obra = obraDe(partes, n, g);
      for (const parte of partes.celdas) {
        const piezas = piezasDe(parte);
        for (let k = 0; k < piezas.length; k++) {
          const p = piezas[k] as (typeof piezas)[number];
          const m = medirLaPieza(obra, p.escribir);
          medidas.push({ tipo: p.tipo, donde: dondeDeLaPieza(traza, parte.indice, k), nivel: n, grado: g, triangulos: m.triangulos, pasoMayor: m.pasoMayor });
        }
      }
    }
    if (unaCabina === null) {
      for (const parte of partes.celdas) {
        const c = parte.cabinas.find((x) => !x.refugio);
        if (c !== undefined) {
          unaCabina = { partes, c };
          break;
        }
      }
    }
    /* (d) y (e), en las ocho primeras trazas: el mobiliario entero de cada celda. */
    if (traza < 8) {
      for (const [n, g] of COMBINACIONES) {
        for (const parte of partes.celdas) {
          const guarda = obraDe(partes, n, g, true);
          const cuenta = obraDe(partes, n, g, false);
          for (const _ of mobiliarioDeLaCelda(guarda, parte)) void _;
          for (const _ of mobiliarioDeLaCelda(cuenta, parte)) void _;
          if (guarda.luces.length > 0) celdasConLuces++;
          for (const l of juzgarLasLuces(guarda.luces, cuenta.luces)) if (lucesMal.length < 4) lucesMal.push(`traza ${String(traza)} N${String(n)} g${String(g)} celda ${String(parte.indice)}: ${l}`);
        }
      }
      for (const n of [1, 3] as const) {
        for (let k = 0; k < partes.celdas.length; k += 3) verticesMirados += familiasEscritas(ctx.celda(traza, k, n, n === 1 ? 1 : 3), familias);
      }
    }
  }

  /* (a) Los topes. */
  const topes = juzgarLosTopes(medidas);
  const vacunaDeTopes = juzgarLosTopes([{ tipo: 'banco', donde: 'vacuna', nivel: 1, grado: 1, triangulos: 200, pasoMayor: 200 }]);
  const mayores = new Map<string, number>();
  for (const m of medidas) mayores.set(`${m.tipo} g${String(m.grado)}`, Math.max(mayores.get(`${m.tipo} g${String(m.grado)}`) ?? 0, m.triangulos));
  resultados.push({
    que: `(a) cada pieza cabe en su tope de §3.1 por grado (el mayor: ${[...mayores].map(([k, v]) => `${k} ${String(v)}`).join(', ')}); y un banco de g1 con 200 triángulos sale rojo`,
    bien: topes.length === 0 && vacunaDeTopes.length === 1,
    detalle: { topes, vacunaDeTopes },
    inspeccionados: medidas.length,
    minimo: MINIMOS.piezas,
  });

  /* (b) Los niveles. Las vacunas pasan por el mismo camino que las medidas: la misma `dondeDeLaPieza`, y la segunda
     son las medidas DE VERDAD con UNA pieza del anillo de N2 vacía (la suma de su tipo no lo nota: sólo pieza a
     pieza sale rojo). */
  const niveles = juzgarLosNiveles(medidas);
  const vacunaDeNiveles = juzgarLosNiveles([
    { tipo: 'banco', donde: dondeDeLaPieza(-1, 0, 0), nivel: 1, grado: 1, triangulos: 110, pasoMayor: 110 },
    { tipo: 'banco', donde: dondeDeLaPieza(-1, 0, 0), nivel: 3, grado: 3, triangulos: 100, pasoMayor: 100 },
  ]).malas;
  const victima = medidas.find((m) => m.tipo === 'prensa' && m.nivel === 2 && m.grado === 2 && m.triangulos > 0) ?? medidas.find((m) => m.nivel === 2 && m.grado === 2 && m.triangulos > 0);
  const vacunaDeUnaPieza = victima === undefined ? [] : juzgarLosNiveles(medidas.map((m) => (m === victima ? { ...m, triangulos: 0 } : m))).malas.filter((x) => x.startsWith(`${victima.tipo} ${victima.donde}:`));
  resultados.push({
    que: `(b) ninguna pieza ni ningún tipo pinta menos en un nivel que en el de abajo (N0 ≤ N1 ≤ N2 ≤ N3, en el centro y en el anillo; ${String(niveles.escalerasDePieza)} escaleras de una pieza sola); y un banco que en N3 pinta menos que en N1, o UNA prensa del anillo de N2 vacía entre las medidas de verdad, salen rojos`,
    bien: niveles.malas.length === 0 && vacunaDeNiveles.length > 0 && vacunaDeUnaPieza.length > 0,
    detalle: { niveles: niveles.malas, vacunaDeNiveles, vacunaDeUnaPieza },
    inspeccionados: niveles.escalerasDePieza,
    minimo: MINIMOS.escalerasDePieza,
  });

  /* (c) La cabina, el refugio y el auricular. */
  const problemasDeLaCabina: string[] = [];
  let auriculares = 0;
  let vacunaDelAuricular: string[] = [];
  if (unaCabina === null) problemasDeLaCabina.push('ninguna traza tiene una cabina');
  else {
    const { partes, c } = unaCabina;
    const pivotes = new Set<string>();
    for (const [n, g] of COMBINACIONES) {
      const deCabina = obraDe(partes, n, g);
      for (const _ of cabina(deCabina, c)) void _;
      const deRefugio = obraDe(partes, n, g);
      for (const _ of refugio(deRefugio, c)) void _;
      if (huella(deCabina) === huella(deRefugio)) problemasDeLaCabina.push(`N${String(n)} g${String(g)}: la cabina y el refugio se construyen iguales`);
      const lista = auricularesDeLaObra(deCabina);
      const a = lista[0];
      if (lista.length !== 1 || a === undefined) {
        problemasDeLaCabina.push(`N${String(n)} g${String(g)}: la cabina apunta ${String(lista.length)} auriculares`);
        continue;
      }
      const v = deCabina.m.emisivo.volcar();
      const medido: AuricularMedido = {
        desde: a.desde,
        hasta: a.hasta,
        pivote: a.pivote,
        vertices: v.vertices,
        posiciones: v.datos.get('position') ?? new Float32Array(0),
        colores: v.datos.get('color') ?? new Float32Array(0),
      };
      problemasDeLaCabina.push(...juzgarElAuricular(medido).map((x) => `N${String(n)} g${String(g)}: ${x}`));
      auriculares++;
      pivotes.add(a.pivote.map((x) => x.toFixed(4)).join(','));
      const puro = pivoteDelAuricular(c).pivote;
      if (Math.hypot(puro[0] - a.pivote[0], puro[1] - a.pivote[1], puro[2] - a.pivote[2]) > 1e-6) problemasDeLaCabina.push(`N${String(n)} g${String(g)}: el pivote apuntado no es el de pivoteDelAuricular`);
      /* La vacuna: el mismo auricular corrido una caja (24 vértices) ya no cuelga de su pivote ni es ámbar. */
      if (vacunaDelAuricular.length === 0) vacunaDelAuricular = juzgarElAuricular({ ...medido, desde: medido.desde + 24, hasta: medido.hasta + 24 });
    }
    if (pivotes.size !== 1) problemasDeLaCabina.push(`el pivote del auricular cambia con el nivel o el grado (${[...pivotes].join(' | ')})`);
  }
  resultados.push({
    que: '(c) la cabina y el refugio se construyen distintos, y el auricular de la cabina tiene su rango ámbar en lo emisivo, cuelga de su pivote y el pivote no cambia con el grado; y el auricular corrido una caja sale rojo',
    bien: problemasDeLaCabina.length === 0 && vacunaDelAuricular.length > 0,
    detalle: { problemasDeLaCabina, vacunaDelAuricular },
    inspeccionados: auriculares,
    minimo: MINIMOS.auriculares,
  });

  /* (d) Las familias. */
  const deFamilias = juzgarLasFamilias(familias, GLSL_DE_LAS_FAMILIAS, FUNCION_DE_LA_FAMILIA);
  const vacunaDeFamilias = juzgarLasFamilias(new Set([...familias, 15]), GLSL_DE_LAS_FAMILIAS, FUNCION_DE_LA_FAMILIA);
  const vacunaSinRama = juzgarLasFamilias(new Set([1]), GLSL_DE_LAS_FAMILIAS, { ...FUNCION_DE_LA_FAMILIA, 1: 'superficieInventadaQ' });
  resultados.push({
    que: `(d) toda familia escrita en el mobiliario (${[...familias].sort((a, b) => a - b).join(', ')}) tiene su función, su texto y su rama en el GLSL, y las del mobiliario su fila en la receta; y una familia 15, o una rama que no está, salen rojas`,
    bien: deFamilias.length === 0 && vacunaDeFamilias.length > 0 && vacunaSinRama.length > 0 && [1, 2, 3, 7].every((f) => familias.has(f)),
    detalle: { deFamilias, vacunaDeFamilias, vacunaSinRama },
    inspeccionados: verticesMirados,
    minimo: MINIMOS.vertices,
  });

  /* (e) Las luces con MoldeQueNoGuarda. */
  const vacunaDeLuces = juzgarLasLuces([{ x: 0, y: 1.3, z: 0, tipo: 'cabina' }], [{ x: 0, y: 1.302, z: 0, tipo: 'cabina' }]);
  resultados.push({
    que: '(e) el mobiliario de cada celda da las mismas luces con moldes que guardan y con moldes que sólo cuentan (MoldeQueNoGuarda), en cada nivel y grado; y una luz que se mueve 2 mm sale roja',
    bien: lucesMal.length === 0 && vacunaDeLuces.length > 0,
    detalle: { lucesMal, vacunaDeLuces },
    inspeccionados: celdasConLuces,
    minimo: MINIMOS.celdasConLuces,
  });

  /* (f) Los trozos de mis piezas. */
  const trozos = juzgarLosTrozos(medidas);
  const pasoMayor = new Map<string, number>();
  for (const m of medidas) pasoMayor.set(`N${String(m.nivel)} g${String(m.grado)}`, Math.max(pasoMayor.get(`N${String(m.nivel)} g${String(m.grado)}`) ?? 0, m.pasoMayor));
  const unaFuenteDeG3 = medidas.find((m) => m.tipo === 'fuente' && m.grado === 3 && m.nivel === 3);
  const vacunaDeTrozos = unaFuenteDeG3 === undefined ? [] : juzgarLosTrozos([{ ...unaFuenteDeG3, pasoMayor: unaFuenteDeG3.triangulos }]);
  resultados.push({
    que: `(f) ninguna pieza del mobiliario escribe más que el trozo de su nivel entre dos pasos (paso mayor: ${[...pasoMayor].map(([k, v]) => `${k} ${String(v)}`).join(', ')}); y una fuente de g3 que no cede sale roja`,
    bien: trozos.length === 0 && vacunaDeTrozos.length > 0,
    detalle: { trozos, vacunaDeTrozos },
    inspeccionados: medidas.length,
    minimo: MINIMOS.piezas,
  });
  /* (g) Las planas del quiosco de prensa. La vacuna es un quiosco DE VERDAD con el plástico de cada cara de un solo
     color (los carteles lisos de antes): por el mismo juez, sale rojo. */
  const planasMal: string[] = [];
  let carasConPlanas = 0;
  let vacunaDePlanas: string[] = [];
  for (const { partes, q } of prensas) {
    for (const [n, g] of COMBINACIONES) {
      const obra = obraDe(partes, n, g);
      for (const _ of quioscoDePrensa(obra, q)) void _;
      const v = obra.m.mobiliario.volcar();
      const volcadas: PlanasVolcadas = {
        vertices: v.vertices,
        normales: v.datos.get('normal') ?? new Float32Array(0),
        colores: v.datos.get('color') ?? new Float32Array(0),
        acabados: v.datos.get('aAcabado') ?? new Float32Array(0),
      };
      const juicio = juzgarLasPlanas(volcadas);
      carasConPlanas += juicio.caras;
      for (const x of juicio.malas) if (planasMal.length < 6) planasMal.push(`prensa (${q.caja.x0.toFixed(1)}, ${q.caja.z0.toFixed(1)}) N${String(n)} g${String(g)}: ${x}`);
      if (vacunaDePlanas.length === 0) {
        const lisos = volcadas.colores.slice();
        for (let i = 0; i < volcadas.vertices; i++) if (Math.floor(volcadas.acabados[i * 2] as number) === FAMILIA.plastico) lisos.set([0.5, 0.45, 0.4], i * 3);
        vacunaDePlanas = juzgarLasPlanas({ ...volcadas, colores: lisos }).malas;
      }
    }
  }
  resultados.push({
    que: `(g) las planas del quiosco de prensa tienen dibujo: cada cara con cartel lleva al menos ${String(COLORES_POR_CARA_CON_PLANAS)} colores, y los dos costados las llevan, en ${String(prensas.length)} quioscos y todos sus grados; y un quiosco con los carteles lisos sale rojo`,
    bien: planasMal.length === 0 && vacunaDePlanas.length > 0,
    detalle: { planasMal, vacunaDePlanas },
    inspeccionados: carasConPlanas,
    minimo: MINIMOS.carasConPlanas,
  });
  ctx.nota(`mobiliario: ${String(medidas.length)} piezas medidas en ${String(ctx.trazas)} trazas y ${String(COMBINACIONES.length)} combinaciones de nivel y grado; familias escritas ${[...familias].sort((a, b) => a - b).join(', ')}`);
  return resultados;
};
