/**
 * LAS COMPROBACIONES DEL SUELO en `verify:quiebro-ciudad` (plan del detalle, §5.2.8 y la ficha O2-SUELO). Dueño:
 * O2-SUELO. Cada resultado lleva su mínimo de inspeccionados (cero inspeccionados es cero fallos, y se leería como
 * vigilado) y cada juez tiene aquí su VACUNA: una copia envenenada que tiene que salir roja.
 *
 *   (a) LOS VADOS: para cada tramo «paso» de la red de aceras (`laRedDeAceras`, los que andan los durmientes), en
 *       cada bordillo que cruza hay una rampa en la celda que lo cubre, pegada al bordillo, que entra en la calzada,
 *       con su centro a ±1 m de la línea de paso, y DENTRO DE LA CEBRA: de 1 a 4,2 m de la boca de su tramo, en un
 *       tramo de 10 m o más que pinta cebras (lo que el asfalto pinta, `suelo.ts`, leído de los atributos de la
 *       calzada de verdad). Y al revés: cada extremo de cebra PINTADA contra un bordillo tiene su rampa. Y ninguna
 *       rampa flota: toda rampa escrita tiene un bordillo detrás en todo su largo. Y EL MAPA DE ALTURAS tiene el
 *       sha256 de `d4402d0` (el mapa se queda binario, §3.3). Vacunas: las rampas corridas 3 m; el extremo de cebra
 *       corrido 3 m; un téxel del mapa tocado; una rampa suelta en medio de la calzada.
 *   (b) EL TECHO: todo lo que escribe `tapas.ts` (el escritor del suelo, solo, en cada celda de la traza 0, en cada
 *       nivel y en cada grado del nivel) queda por debajo de 0,2 m contando la acera, y nada por debajo del suelo.
 *       Vacuna: el mismo escritor con una tapa más a 0,25.
 *   (c) LOS CHARCOS: los sombreadores del asfalto y de la acera (N0-N3), de las tarjetas, de las salpicaduras y del
 *       reflejo en pantalla llevan el `GLSL_CHARCOS` de siempre (sha fijo), y ni el asfalto ni la acera escriben la
 *       máscara (`ch`, `charcoFinal`, la cuneta) con términos nuevos: la máscara es un BLOQUE de texto fijo, suelto en
 *       el cuerpo, y fuera de él nada escribe la máscara ni sus entradas (por ámbitos, palabra a palabra: ver
 *       `juzgarLaMascara`). Vacunas: las 33 grafías de la zanja (`GRAFIAS_DE_LA_ZANJA`: las nueve de la revisión y
 *       24 más, delante y detrás del bloque) y un consumidor sin los charcos.
 *
 * Los números anotados (el sha del mapa y el de los charcos) son los de `d4402d0`: el mapa sale de las islas
 * (`lejos.ts`, `anillo-de-la-ciudad.ts`) y de `luz-de-la-calle.ts`, que no han cambiado desde entonces (sólo
 * nombres en `shared/`), y el de los charcos es el de `verify:quiebro-materia` (f).
 */
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import type { ComprobarElPaquete, ContextoDeLaCiudad, Resultado } from './comun';
import { obraAPasos, soloCodigo, textoDelFragmento } from './comun';
import type { EscritorDeLaCelda } from '../../src/quiebro/ciudad/celdas';
import type { GeometriaVolcada } from '../../src/quiebro/ciudad/geometria';
import type { CajaXZ, GradoDeLaCelda, NivelDeLaCiudad } from '../../src/quiebro/ciudad/tipos';
import { NIVELES_DE_LA_CIUDAD } from '../../src/quiebro/ciudad/tipos';
import { GRADOS_DEL_NIVEL } from '../../src/quiebro/ciudad/grados';
import { TECHO_DEL_SUELO, sueloDeLaCelda } from '../../src/quiebro/ciudad/tapas';
import { VADO, materialDeLaAcera, materialDelAsfalto } from '../../src/quiebro/ciudad/suelo';
import { GLSL_CHARCOS } from '../../src/quiebro/ciudad/glsl';
import { materialDeLasTarjetas } from '../../src/quiebro/ciudad/reflejos';
import { crearLasSalpicaduras } from '../../src/quiebro/atmosfera/lluvia';
import { UBER } from '../../src/quiebro/posproceso/sombreadores';
import { celdaDe, indiceDeCelda } from '../../../shared/arcade/juegos/quiebro-ciudad';

/* ═══════════════════════════════ LO ANOTADO ═══════════════════════════════ */

/** El sha256 del mapa de alturas (los bytes de `texturaAlturas`, 1.200 × 1.200) de las trazas que se miran, en `d4402d0`. */
export const SHA_DEL_MAPA_DE_ALTURAS: Readonly<Record<number, string>> = {
  0: '7dcedfcfa197da9b1393eba1eeb3390355f9c1ab547496838aba660ed7bcfe56',
  13: '57f4c2258b0ef2f0e0c522d55de2eb67dec6d6aabe2cb5591d5d62bed75eb6d6',
};
/** El sha256 de `GLSL_CHARCOS` en `d4402d0` (el mismo de `verify:quiebro-materia`, f). */
export const SHA_DE_LOS_CHARCOS = 'f6800cfb68cfad54616dccee76f7ac77708138251d3b8f5576434736ff42c4b9';

/**
 * Las trazas y los niveles de (a): otra simetría en N1 y la 0 (la de las fotos) en N0 y N3. En este orden: el
 * contexto guarda sólo la última base, y (b) sigue con la 0.
 */
const VADOS_QUE_SE_MIRAN: readonly { readonly traza: number; readonly nivel: NivelDeLaCiudad }[] = [
  { traza: 13, nivel: 1 },
  { traza: 0, nivel: 0 },
  { traza: 0, nivel: 3 },
];

/** Los dos materiales que escriben la máscara. */
export type MaterialDeLaMascara = 'asfalto' | 'acera';

/**
 * EL BLOQUE DE LA MÁSCARA de cada material: el texto FIJO que calcula `ch`, la cuneta y `charcoFinal`, igual en los
 * cuatro niveles (el `#if` va dentro). Se compara palabra a palabra, sin espacios ni comentarios. Tiene que estar UNA
 * vez, suelto en el cuerpo (no dentro de un `if`, de un bloque ni de un `#if`), y fuera de él nada escribe la máscara
 * ni lo que la mueve (ver `juzgarLaMascara`). En N1-N3 la cuneta es la de `d4402d0`, con sus dos `fbmQ` y los mismos
 * argumentos (la máscara sale idéntica: es lo que pide la aceptación de la ficha), calculada sólo a menos de 0,7 m
 * del bordillo, donde podía no ser 0. En N0 no puede llevar `fbmQ` (§7.4; `verify:quiebro-materia`, b, sólo deja el
 * hash dentro de `charcoQ` y `charcoDeLaAceraQ`): una sola lectura de la materia para el ancho y el troceo.
 */
export const BLOQUE_DE_LA_MASCARA: Readonly<Record<MaterialDeLaMascara, string>> = {
  asfalto: `
  float ch = charcoQ(P.xz);
  float cuneta = 0.0;
  if (esTramo) {
    #if NIVEL_Q >= 1
    if (abs(t) > medioAncho - 0.7) {
      float anchoCuneta = 0.25 + 0.45 * fbmQ(vec2(s * 0.21, 3.0));
      cuneta = step(medioAncho - anchoCuneta, abs(t)) * smoothstep(0.38, 0.46, fbmQ(vec2(s * 0.3, t * 0.5)));
    }
    #else
    float troceo = ruidoT(vec2(s * 0.3, t * 0.5), lodQ(0.5));
    float anchoCuneta = 0.25 + 0.45 * troceo;
    cuneta = step(medioAncho - anchoCuneta, abs(t)) * smoothstep(0.38, 0.46, troceo);
    #endif
    ch = max(ch * (0.55 + 0.45 * smoothstep(0.4, 2.2, abs(t))), cuneta);
  }
  charcoFinal = ch;`,
  acera: `
  float ch = Ng.y > 0.5 ? charcoDeLaAceraQ(P.xz) : 0.0;
  charcoFinal = ch;`,
};

/**
 * LAS ENTRADAS DEL BLOQUE: sus declaraciones de siempre, cada una UNA vez, en el cuerpo y antes del bloque. Es lo
 * único que puede escribir fuera del bloque lo que el bloque lee (más `float charcoFinal = 0.0;`, justo antes del
 * cuerpo).
 */
export const ENTRADAS_DE_LA_MASCARA: Readonly<Record<MaterialDeLaMascara, readonly string[]>> = {
  asfalto: [
    'vec3 P = vPosMundoQ;',
    'float tipo = vTramoQ.x;',
    'float s = tipo > 1.5 ? P.z : P.x;',
    'float t = (tipo > 1.5 ? P.x : P.z) - vTramoQ.y;',
    'float medioAncho = vCalleQ.x * 0.5;',
    'bool esTramo = tipo > 0.5 && tipo < 2.5;',
  ],
  acera: ['vec3 P = vPosMundoQ;', 'vec3 Ng = normalize(vNorMundoQ);'],
};

/**
 * LO QUE SE VIGILA EN EL CUERPO: la máscara (`ch`, la cuneta) y las entradas del bloque (también `pxMundoQ`, que
 * mueve la mip de la cuneta). `charcoFinal` se vigila desde su declaración hasta el final de `main` (la lee el
 * trozo de después de la luz).
 */
const VIGILADOS_EN_EL_CUERPO: Readonly<Record<MaterialDeLaMascara, readonly string[]>> = {
  asfalto: ['ch', 'cuneta', 'P', 'tipo', 's', 't', 'medioAncho', 'esTramo', 'pxMundoQ'],
  acera: ['ch', 'P', 'Ng'],
};

/* ═══════════════════════════════ LOS JUECES ═══════════════════════════════ */

const sha256 = (datos: Uint8Array | string): string => createHash('sha256').update(datos).digest('hex');

/** Una caja en planta con la altura que alcanza. */
interface CajaDeRampa extends CajaXZ {
  readonly y1: number;
}

/**
 * LAS RAMPAS DE UNA GEOMETRÍA: los triángulos inclinados como una rampa de vado (la normal entre 5 y 20 grados de la
 * vertical) y grandes (más de 0,1 m²; una tapa no tiene ninguno así), en su caja. Las dos mitades de una rampa dan la
 * misma caja: se juntan.
 */
export function rampasDe(g: GeometriaVolcada): CajaDeRampa[] {
  const pos = g.datos.get('position');
  if (pos === undefined) return [];
  const salida: CajaDeRampa[] = [];
  const idx = g.indices;
  for (let k = 0; k < idx.length; k += 3) {
    const a = (idx[k] as number) * 3;
    const b = (idx[k + 1] as number) * 3;
    const c = (idx[k + 2] as number) * 3;
    const ax = pos[a] as number;
    const ay = pos[a + 1] as number;
    const az = pos[a + 2] as number;
    const ux = (pos[b] as number) - ax;
    const uy = (pos[b + 1] as number) - ay;
    const uz = (pos[b + 2] as number) - az;
    const vx = (pos[c] as number) - ax;
    const vy = (pos[c + 1] as number) - ay;
    const vz = (pos[c + 2] as number) - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-9) continue;
    const area = l / 2;
    const cy = Math.abs(ny) / l;
    if (area < 0.1 || cy < Math.cos((20 * Math.PI) / 180) || cy > Math.cos((5 * Math.PI) / 180)) continue;
    const xs = [ax, pos[b] as number, pos[c] as number];
    const ys = [ay, pos[b + 1] as number, pos[c + 1] as number];
    const zs = [az, pos[b + 2] as number, pos[c + 2] as number];
    const caja = { x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs), y1: Math.max(...ys) };
    if (!salida.some((r) => Math.abs(r.x0 - caja.x0) < 1e-3 && Math.abs(r.x1 - caja.x1) < 1e-3 && Math.abs(r.z0 - caja.z0) < 1e-3 && Math.abs(r.z1 - caja.z1) < 1e-3)) salida.push(caja);
  }
  return salida;
}

/** Un tramo de paso: la línea de un bordillo a otro por donde cruzan los durmientes. */
export interface LineaDePaso {
  readonly eje: 'x' | 'z';
  /** La coordenada fija (z si el paso corre por x). */
  readonly en: number;
  readonly desde: number;
  readonly hasta: number;
}

/** Un bordillo que cruza un paso: dónde, y hacia dónde queda la calzada (−1 o +1 en el eje del paso). */
export interface BordilloDelPaso {
  readonly paso: LineaDePaso;
  /** La coordenada del bordillo en el eje del paso. */
  readonly en: number;
  readonly calzada: -1 | 1;
}

const dentroDe = (x: number, z: number, c: CajaXZ): boolean => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1;

/**
 * LOS BORDILLOS QUE CRUZA UN PASO: los cantos de las islas que la línea atraviesa entre sus dos puntas, con calzada
 * de verdad al otro lado (si al otro lado hay otra isla, no es un bordillo).
 */
export function bordillosDelPaso(p: LineaDePaso, islas: readonly CajaXZ[]): BordilloDelPaso[] {
  const salida: BordilloDelPaso[] = [];
  const punto = (a: number): [number, number] => (p.eje === 'x' ? [a, p.en] : [p.en, a]);
  for (const i of islas) {
    const [o0, o1] = p.eje === 'x' ? [i.z0, i.z1] : [i.x0, i.x1];
    if (!(p.en > o0 && p.en < o1)) continue;
    const [e0, e1] = p.eje === 'x' ? [i.x0, i.x1] : [i.z0, i.z1];
    for (const [e, calzada] of [
      [e0, -1],
      [e1, 1],
    ] as const) {
      if (!(e > p.desde + 1e-3 && e < p.hasta - 1e-3)) continue;
      const [fx, fz] = punto(e + calzada * VADO.fondo * 0.5);
      if (islas.some((j) => dentroDe(fx, fz, j))) continue;
      salida.push({ paso: p, en: e, calzada });
    }
  }
  return salida;
}

/** Lo que dice la calzada en un punto: el tramo del asfalto de verdad que lo cubre (`aTramo`, `aCalle`), o `null`. */
export interface TramoDelAsfalto {
  readonly tipo: number;
  /** El eje de la calle (`aTramo.y`). */
  readonly eje: number;
  readonly desde: number;
  readonly hasta: number;
  /** El ancho de la calzada (`aCalle.x`). */
  readonly calzada: number;
  /** Si pinta cebras en sus bocas (`aCalle.z` = 0: acaba en un cruce por sus dos puntas). */
  readonly conPaso: boolean;
}

/** Los rectángulos de la calzada (cada losa del asfalto) con su `aTramo` y su `aCalle`. */
export function tramosDelAsfalto(asfalto: THREE.BufferGeometry): { readonly caja: CajaXZ; readonly tramo: TramoDelAsfalto }[] {
  const pos = asfalto.getAttribute('position');
  const tr = asfalto.getAttribute('aTramo');
  const ca = asfalto.getAttribute('aCalle');
  const idx = asfalto.getIndex();
  const salida: { caja: CajaXZ; tramo: TramoDelAsfalto }[] = [];
  if (idx === null) return salida;
  for (let k = 0; k < idx.count; k += 6) {
    const vs = [0, 1, 2, 3, 4, 5].map((d) => idx.getX(k + d));
    const xs = vs.map((v) => pos.getX(v));
    const zs = vs.map((v) => pos.getZ(v));
    const v0 = vs[0] as number;
    salida.push({
      caja: { x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) },
      tramo: { tipo: tr.getX(v0), eje: tr.getY(v0), desde: tr.getZ(v0), hasta: tr.getW(v0), calzada: ca.getX(v0), conPaso: ca.getZ(v0) < 0.5 },
    });
  }
  return salida;
}

/** Un extremo de cebra PINTADA contra el bordillo de una isla: dónde tiene que estar el centro de su rampa. */
export interface ExtremoDeCebra {
  readonly x: number;
  readonly z: number;
  /** Hacia dónde corre la calle. */
  readonly alLargo: 'x' | 'z';
  readonly que: string;
}

/**
 * LOS EXTREMOS DE CEBRA PINTADA de la calzada de verdad: en cada tira de 10 m o más que pinta cebras (lo mismo que
 * mira el sombreador del asfalto), en cada boca y en cada lado, si detrás del bordillo hay una isla. Con
 * `todasConPaso`, como si ninguna tira llevara la marca de «sin paso» (lo de antes, para ver qué cambia).
 */
export function extremosDeCebra(asfalto: readonly { readonly tramo: TramoDelAsfalto }[], islas: readonly CajaXZ[], todasConPaso = false): ExtremoDeCebra[] {
  const vistas = new Set<string>();
  const salida: ExtremoDeCebra[] = [];
  for (const { tramo: t } of asfalto) {
    if ((t.tipo !== 1 && t.tipo !== 2) || t.hasta - t.desde < 10 || !(t.conPaso || todasConPaso)) continue;
    const clave = `${String(t.tipo)}|${String(t.eje)}|${String(t.desde)}|${String(t.hasta)}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    for (const [boca, hacia] of [
      [t.desde, 1],
      [t.hasta, -1],
    ] as const) {
      for (const lado of [-1, 1] as const) {
        const s = boca + hacia * ((VADO.desde + VADO.hasta) / 2);
        const bordillo = t.eje + (lado * t.calzada) / 2;
        const [ax, az] = t.tipo === 1 ? [s, bordillo + lado * 0.5] : [bordillo + lado * 0.5, s];
        if (!islas.some((i) => dentroDe(ax, az, i))) continue;
        const r = bordillo - (lado * VADO.fondo) / 2;
        const [x, z] = t.tipo === 1 ? [s, r] : [r, s];
        salida.push({ x, z, alLargo: t.tipo === 1 ? 'x' : 'z', que: `la cebra de la calle ${t.tipo === 1 ? 'en x' : 'en z'} de eje ${t.eje.toFixed(1)}, boca ${boca.toFixed(1)}, bordillo ${bordillo.toFixed(1)}` });
      }
    }
  }
  return salida;
}

/**
 * EL JUICIO DE UN BORDILLO DE PASO: entre las rampas de su celda, una pegada al bordillo (a 2 cm), que entra en la
 * calzada al menos 0,7 m, con su centro a ±1 m de la línea de paso, y cuyo largo cae entero en la cebra de su tramo.
 * Devuelve lo que falla, o `null`.
 */
export function juzgarElBordillo(b: BordilloDelPaso, rampas: readonly CajaDeRampa[], asfalto: readonly { readonly caja: CajaXZ; readonly tramo: TramoDelAsfalto }[]): string | null {
  const p = b.paso;
  const donde = `el paso ${p.eje === 'x' ? 'z' : 'x'} = ${p.en.toFixed(1)} en el bordillo ${p.eje} = ${b.en.toFixed(1)}`;
  const suya = rampas.find((r) => {
    const [t0, t1] = p.eje === 'x' ? [r.x0, r.x1] : [r.z0, r.z1];
    const [a0, a1] = p.eje === 'x' ? [r.z0, r.z1] : [r.x0, r.x1];
    const pegada = b.calzada < 0 ? Math.abs(t1 - b.en) < 0.02 : Math.abs(t0 - b.en) < 0.02;
    const entra = t1 - t0 >= 0.7;
    return pegada && entra && Math.abs((a0 + a1) / 2 - p.en) <= 1 && a0 <= p.en + 1 && a1 >= p.en - 1;
  });
  if (suya === undefined) return `${donde}: no hay rampa pegada al bordillo a ±1 m de la línea de paso`;
  const [a0, a1] = p.eje === 'x' ? [suya.z0, suya.z1] : [suya.x0, suya.x1];
  const cx = p.eje === 'x' ? b.en + b.calzada * 0.4 : (a0 + a1) / 2;
  const cz = p.eje === 'x' ? (a0 + a1) / 2 : b.en + b.calzada * 0.4;
  const t = asfalto.find((r) => dentroDe(cx, cz, r.caja));
  if (t === undefined) return `${donde}: bajo la rampa no hay calzada`;
  const correLaRampa = p.eje === 'x' ? 2 : 1;
  if (t.tramo.tipo !== correLaRampa) return `${donde}: la rampa no está en un tramo de la calle que cruza (tipo ${String(t.tramo.tipo)})`;
  const largo = t.tramo.hasta - t.tramo.desde;
  if (largo < 10) return `${donde}: su tramo mide ${largo.toFixed(1)} m, y la cebra sólo se pinta en los de 10 o más`;
  if (!t.tramo.conPaso) return `${donde}: su tramo lleva la marca de «sin paso» (no acaba en un cruce por sus dos puntas) y no pinta cebra`;
  for (const a of [a0, a1]) {
    const bocas = Math.min(a - t.tramo.desde, t.tramo.hasta - a);
    if (bocas < 1 - 0.01 || bocas > 4.2 + 0.01) return `${donde}: la rampa llega a ${bocas.toFixed(2)} m de la boca, fuera de la cebra (1-4,2 m)`;
  }
  return null;
}

/** ¿Tiene esta rampa un bordillo detrás en todo su largo? Lo que falla, o `null`. */
export function juzgarQueNoFlota(r: CajaDeRampa, islas: readonly CajaXZ[]): string | null {
  const tolerancia = 0.02;
  const pegada = islas.some((i) => {
    const alLargoDeZ = Math.abs(r.x1 - i.x0) < tolerancia || Math.abs(r.x0 - i.x1) < tolerancia;
    const alLargoDeX = Math.abs(r.z1 - i.z0) < tolerancia || Math.abs(r.z0 - i.z1) < tolerancia;
    if (alLargoDeZ && r.z0 >= i.z0 - tolerancia && r.z1 <= i.z1 + tolerancia) return true;
    if (alLargoDeX && r.x0 >= i.x0 - tolerancia && r.x1 <= i.x1 + tolerancia) return true;
    return false;
  });
  return pegada ? null : `la rampa (${r.x0.toFixed(2)}, ${r.z0.toFixed(2)})-(${r.x1.toFixed(2)}, ${r.z1.toFixed(2)}) no tiene bordillo detrás`;
}

/** Lo más alto y lo más bajo de una geometría, y cuántos vértices miró. */
export function alturasDe(g: GeometriaVolcada): { readonly max: number; readonly min: number; readonly vertices: number } {
  const pos = g.datos.get('position');
  let max = -Infinity;
  let min = Infinity;
  if (pos === undefined) return { max, min, vertices: 0 };
  for (let k = 0; k < g.vertices; k++) {
    const y = pos[k * 3 + 1] as number;
    if (y > max) max = y;
    if (y < min) min = y;
  }
  return { max, min, vertices: g.vertices };
}

/** EL JUICIO DEL TECHO: nada por encima de `TECHO_DEL_SUELO` ni por debajo del suelo. */
export function juzgarElTecho(a: { readonly max: number; readonly min: number }): string | null {
  if (a.max >= TECHO_DEL_SUELO) return `llega a ${a.max.toFixed(3)} m (el techo es ${TECHO_DEL_SUELO.toFixed(2)})`;
  if (a.min < -1e-4) return `baja a ${a.min.toFixed(3)} m, por debajo del suelo`;
  return null;
}

/*
 * ─── (c) La máscara, por ámbitos ───
 *
 * La primera regla buscaba asignaciones detrás de `;`, `{`, `}` o un salto de línea, y la revisión la pasó con seis
 * grafías de ocho (un `if` en una línea, un `else`, la asignación dentro de una expresión, la coma, una función
 * `inout`, la máscara retocada detrás de `charcoFinal = ch;`): cerraba la grafía y no la puerta. Ésta no busca
 * asignaciones con una expresión regular: parte el código en palabras y mira CADA aparición de cada nombre vigilado en
 * su ámbito, y la tiene por escritura si le sigue una asignación o un `++`/`--` (también tras `.xz` o `[i]`), si le
 * precede un `++`/`--` o un tipo (una declaración, también la que hace sombra), si va suelto tras una coma fuera de
 * paréntesis (lista de declaraciones o coma), o si se pasa suelto a una función con parámetros `out`/`inout`, a
 * `modf` y compañía o a una que no está en el texto. Toda escritura tiene que caer dentro del bloque fijo o ser una de
 * las declaraciones de siempre, en su sitio. Y ningún `#define`/`#undef` toca un nombre del bloque.
 */

const RE_PALABRAS = /#[^\n]*|[A-Za-z_]\w*|\d+\.\d*(?:[eE][+-]?\d+)?[fF]?|\.\d+(?:[eE][+-]?\d+)?[fF]?|\d+(?:[eE][+-]?\d+)?[uU]?|<<=|>>=|\+\+|--|&&|\|\||\^\^|<<|>>|[-+*/%&|^!=<>]=|\S/g;

/** Las palabras de un código GLSL (sin comentarios): nombres, números, operadores; una línea de preprocesador es una. */
export function palabrasDe(codigo: string): string[] {
  return [...codigo.matchAll(RE_PALABRAS)].map((m) => (m[0].startsWith('#') ? m[0].replace(/\s+/g, ' ').trim() : m[0]));
}

const ES_NOMBRE = /^[A-Za-z_]\w*$/;
const ASIGNACIONES = new Set(['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '|=', '^=']);
const TIPOS_Y_CALIFICADORES = /^(?:void|float|int|uint|bool|[iub]?vec[234]|mat[234](?:x[234])?|highp|mediump|lowp|const|in|out|inout|precise|flat|smooth)$/;
/** Las funciones de GLSL ES 3.0 con un parámetro de salida. */
const CON_SALIDA = new Set(['modf', 'frexp', 'uaddCarry', 'usubBorrow', 'umulExtended', 'imulExtended']);
/** Las funciones de GLSL (y las palabras con paréntesis) que sólo leen lo que se les pasa. */
const SOLO_LEEN = new Set(
  (
    'if while for switch return radians degrees sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh pow exp log ' +
    'exp2 log2 sqrt inversesqrt abs sign floor trunc round roundEven ceil fract mod min max clamp mix step smoothstep isnan ' +
    'isinf floatBitsToInt floatBitsToUint intBitsToFloat uintBitsToFloat length distance dot cross normalize faceforward ' +
    'reflect refract matrixCompMult outerProduct transpose determinant inverse lessThan lessThanEqual greaterThan ' +
    'greaterThanEqual equal notEqual any all not texture textureLod textureProj textureGrad textureOffset texelFetch ' +
    'textureSize dFdx dFdy fwidth packUnorm2x16 packSnorm2x16 packHalf2x16 unpackUnorm2x16 unpackSnorm2x16 unpackHalf2x16'
  ).split(' '),
);

/** Las funciones definidas en un código, y si alguna de las del mismo nombre tiene un parámetro `out` o `inout`. */
function funcionesDe(codigo: string): Map<string, boolean> {
  const salida = new Map<string, boolean>();
  for (const m of codigo.matchAll(/\b[A-Za-z_]\w*\s+([A-Za-z_]\w*)\s*\(([^()]*)\)\s*\{/g)) {
    const nombre = m[1] as string;
    salida.set(nombre, (salida.get(nombre) ?? false) || /\b(?:out|inout)\b/.test(m[2] as string));
  }
  return salida;
}

/** Dónde está una secuencia de palabras dentro de [desde, hasta): todas las veces. */
function posicionesDe(T: readonly string[], aguja: readonly string[], desde: number, hasta: number): number[] {
  const salida: number[] = [];
  for (let k = desde; k + aguja.length <= hasta; k++) {
    let igual = true;
    for (let j = 0; j < aguja.length && igual; j++) igual = T[k + j] === aguja[j];
    if (igual) salida.push(k);
  }
  return salida;
}

/** Si la aparición `k` de un nombre es una escritura, por qué; si es una lectura (o es otro nombre), `null`. */
function escrituraEn(T: readonly string[], k: number, parentesis: readonly number[], abre: readonly number[], funciones: ReadonlyMap<string, boolean>): string | null {
  const antes = T[k - 1] ?? '';
  if (antes === '.') return null;
  let j = k + 1;
  for (;;) {
    if (T[j] === '.' && ES_NOMBRE.test(T[j + 1] ?? '')) j += 2;
    else if (T[j] === '[') {
      let h = 1;
      j++;
      while (j < T.length && h > 0) {
        if (T[j] === '[') h++;
        else if (T[j] === ']') h--;
        j++;
      }
    } else break;
  }
  const despues = T[j] ?? '';
  if (ASIGNACIONES.has(despues)) return `asigna con «${despues}»`;
  if (despues === '++' || despues === '--' || antes === '++' || antes === '--') return 'lo incrementa';
  if (TIPOS_Y_CALIFICADORES.test(antes)) return 'lo declara';
  const p = parentesis[k] ?? 0;
  if (antes === ',' && p === 0) return 'va tras una coma (una lista de declaraciones o una coma)';
  if ((antes === '(' || antes === ',') && (despues === ')' || despues === ',') && p >= 1) {
    const funcion = T[(abre[k] ?? 0) - 1] ?? '';
    if (!ES_NOMBRE.test(funcion)) return null;
    if (CON_SALIDA.has(funcion)) return `se pasa a ${funcion}, que escribe en él`;
    const definida = funciones.get(funcion);
    if (definida === true) return `se pasa a ${funcion}, que tiene un parámetro out o inout`;
    if (definida === false || SOLO_LEEN.has(funcion) || TIPOS_Y_CALIFICADORES.test(funcion)) return null;
    return `se pasa a ${funcion}, que no está en el texto`;
  }
  return null;
}

/** ¿Acaba aquí una sentencia (`;`, `{`, `}` o una línea de preprocesador)? */
const esFrontera = (w: string | undefined): boolean => w === ';' || w === '{' || w === '}' || (w ?? '').startsWith('#');

/** La sentencia que contiene la palabra `k`: de la frontera anterior al `;`. */
function sentenciaEn(T: readonly string[], k: number): { readonly desde: number; readonly texto: string } {
  let a = k;
  while (a > 0 && !esFrontera(T[a - 1])) a--;
  let b = k;
  while (b < T.length && T[b] !== ';') b++;
  return { desde: a, texto: T.slice(a, b + 1).join(' ') };
}

/**
 * EL JUICIO DE LA MÁSCARA de un texto de sombreador: si lleva los charcos de siempre y, con `material`, si su máscara
 * es la del bloque fijo y nadie más la escribe (ver arriba). `vigilados`: las apariciones de nombres vigilados que se
 * han mirado.
 */
export function juzgarLaMascara(texto: string, material: MaterialDeLaMascara | null): { readonly problemas: string[]; readonly vigilados: number } {
  const problemas: string[] = [];
  if (!texto.includes(GLSL_CHARCOS)) problemas.push('no lleva el GLSL_CHARCOS de siempre');
  if (material === null) return { problemas, vigilados: 0 };
  const codigo = soloCodigo(texto);
  const T = palabrasDe(codigo);
  const funciones = funcionesDe(codigo);
  /* Llaves, paréntesis (con el que abre cada palabra) y #if abiertos, palabra a palabra. */
  const llaves: number[] = [];
  const parentesis: number[] = [];
  const abre: number[] = [];
  const condicionales: number[] = [];
  {
    let l = 0;
    let c = 0;
    const pila: number[] = [];
    for (let k = 0; k < T.length; k++) {
      const w = T[k] as string;
      if (w === '}') l--;
      if (w === ')') pila.pop();
      if (/^#\s*endif\b/.test(w)) c--;
      llaves.push(l);
      parentesis.push(pila.length);
      abre.push(pila[pila.length - 1] ?? -1);
      condicionales.push(c);
      if (w === '{') l++;
      if (w === '(') pila.push(k);
      if (/^#\s*if/.test(w)) c++;
    }
  }
  const finDelAmbito = (k: number): number => {
    let f = k;
    while (f < T.length && (llaves[f] as number) >= (llaves[k] as number)) f++;
    return f;
  };
  /* La declaración de charcoFinal y, detrás, el cuerpo. */
  const declaracion = palabrasDe('float charcoFinal = 0.0;');
  const d = posicionesDe(T, declaracion, 0, T.length)[0];
  if (d === undefined || T[d + declaracion.length] !== '{') {
    problemas.push('no está «float charcoFinal = 0.0;» seguido del cuerpo');
    return { problemas, vigilados: 0 };
  }
  const c0 = d + declaracion.length;
  const c1 = finDelAmbito(c0 + 1);
  const finDeMain = finDelAmbito(d);
  /* El bloque: una vez, suelto en el cuerpo y fuera de todo #if que no esté ya abierto en la declaración. */
  const bloque = palabrasDe(soloCodigo(BLOQUE_DE_LA_MASCARA[material]));
  const dondeB = posicionesDe(T, bloque, c0, c1);
  const b0 = dondeB[0];
  if (dondeB.length !== 1 || b0 === undefined) {
    problemas.push(`el bloque de la máscara está ${String(dondeB.length)} veces en el cuerpo (tiene que estar una, tal cual)`);
    return { problemas, vigilados: 0 };
  }
  const b1 = b0 + bloque.length;
  if (llaves[b0] !== (llaves[c0] as number) + 1) problemas.push('el bloque de la máscara no va suelto en el cuerpo (está dentro de otro bloque)');
  if (!esFrontera(T[b0 - 1])) problemas.push(`el bloque de la máscara va tras «${T[b0 - 1] ?? ''}» (condicional)`);
  if (condicionales[b0] !== condicionales[d]) problemas.push('el bloque de la máscara está dentro de un #if');
  /* Los nombres del bloque y de sus entradas no se tocan con el preprocesador; en el cuerpo, ni #define ni #undef. */
  const entradas = ENTRADAS_DE_LA_MASCARA[material].map((e) => palabrasDe(e).join(' '));
  const nombres = new Set([...bloque, ...entradas.flatMap((e) => e.split(' '))].filter((w) => ES_NOMBRE.test(w)));
  /* Ni una macro cuyo cuerpo escriba lo vigilado (`#define MOJAR ch = 0.9`, y luego `MOJAR;` no nombra a ch). */
  const vigiladosTodos = new Set(['charcoFinal', ...VIGILADOS_EN_EL_CUERPO[material]]);
  for (let k = 0; k < T.length; k++) {
    const m = /^#\s*(define|undef)\s+([A-Za-z_]\w*)(.*)$/.exec(T[k] as string);
    if (m === null) continue;
    const enElCuerpo = (m[3] ?? '').match(/[A-Za-z_]\w*/g) ?? [];
    if (nombres.has(m[2] as string)) problemas.push(`«${T[k] as string}» toca un nombre de la máscara`);
    else if (enElCuerpo.some((w) => vigiladosTodos.has(w))) problemas.push(`«${T[k] as string}» lleva un nombre vigilado dentro`);
    else if (k > c0 && k < c1) problemas.push(`«${T[k] as string}» dentro del cuerpo`);
  }
  /* Cada aparición de un nombre vigilado, en su ámbito. */
  const usadas = new Map<string, number>();
  let vigilados = 0;
  const mirar = (nombre: string, desde: number, hasta: number): void => {
    for (let k = desde; k < hasta; k++) {
      if (T[k] !== nombre) continue;
      vigilados++;
      const porque = escrituraEn(T, k, parentesis, abre, funciones);
      if (porque === null || (k >= b0 && k < b1)) continue;
      const s = sentenciaEn(T, k);
      if (nombre === 'charcoFinal' && k === d + 1) continue;
      const i = entradas.indexOf(s.texto);
      const suya = i >= 0 && s.texto.split(' ')[1] === nombre && k > c0 && k < b0 && llaves[k] === (llaves[c0] as number) + 1 && s.desde === k - 1;
      if (suya) {
        usadas.set(s.texto, (usadas.get(s.texto) ?? 0) + 1);
        continue;
      }
      problemas.push(`${nombre} ${porque} fuera del bloque: «${s.texto}»`);
    }
  };
  mirar('charcoFinal', d, finDeMain);
  for (const n of VIGILADOS_EN_EL_CUERPO[material]) mirar(n, c0, c1);
  for (const e of entradas) if (usadas.get(e) !== 1) problemas.push(`la entrada «${e}» está ${String(usadas.get(e) ?? 0)} veces en el cuerpo antes del bloque (tiene que estar una)`);
  /* Y la máscara llega al reflejo: el F0 del agua sale de charcoFinal, detrás del cuerpo. */
  const alReflejo = palabrasDe('material.specularColor = mix(material.specularColor, vec3(0.02), charcoFinal);');
  if (posicionesDe(T, alReflejo, c1, finDeMain).length !== 1) problemas.push('el F0 del agua no sale de charcoFinal detrás del cuerpo');
  return { problemas, vigilados };
}

/* ═══════════════════════════════ LAS COMPROBACIONES ═══════════════════════════════ */

/** El escritor del suelo, solo. */
const SOLO_EL_SUELO: readonly { readonly nombre: string; readonly escribir: EscritorDeLaCelda }[] = [{ nombre: 'suelo', escribir: sueloDeLaCelda }];

/** El escritor del suelo con una tapa de más a 0,25 m (la vacuna de b). */
const SUELO_CON_UNA_TAPA_ALTA: readonly { readonly nombre: string; readonly escribir: EscritorDeLaCelda }[] = [
  {
    nombre: 'suelo-con-una-tapa-alta',
    escribir: function* (obra, parte) {
      yield* sueloDeLaCelda(obra, parte);
      const cx = (parte.caja.x0 + parte.caja.x1) / 2;
      const cz = (parte.caja.z0 + parte.caja.z1) / 2;
      obra.m.mobiliario.cilindro(cx, cz, 0.235, 0.25, 0.36, 0.34, 10, true);
      yield;
    },
  },
];

/** (a) Los vados de una traza en un nivel, y el mapa de alturas. */
function losVados(ctx: ContextoDeLaCiudad, traza: number, nivel: NivelDeLaCiudad): Resultado[] {
  const base = ctx.base(traza);
  const fuente = ctx.fuente(traza);
  const red = fuente.noche.ciudad.aceras;
  const islas = base.suelo.cajasDeLasIslas;
  const asfalto = tramosDelAsfalto(base.suelo.asfalto);
  const grado: GradoDeLaCelda = GRADOS_DEL_NIVEL[nivel][GRADOS_DEL_NIVEL[nivel].length - 1] as GradoDeLaCelda;
  const porCelda = new Map<number, CajaDeRampa[]>();
  const rampasDeLaCelda = (k: number): CajaDeRampa[] => {
    let r = porCelda.get(k);
    if (r === undefined) {
      const parte = base.partes.celdas[k];
      r = parte === undefined ? [] : rampasDe(obraAPasos(parte, base.partes, nivel, grado, false, SOLO_EL_SUELO).volcar().mobiliario);
      porCelda.set(k, r);
    }
    return r;
  };
  const problemas: string[] = [];
  const corridos: string[] = [];
  let bordillos = 0;
  let pasos = 0;
  for (const t of red.tramos) {
    if (t.tipo !== 'paso') continue;
    const a = red.nudos[t.a];
    const b = red.nudos[t.b];
    if (a === undefined || b === undefined) continue;
    pasos++;
    const linea: LineaDePaso = t.eje === 'x' ? { eje: 'x', en: a.z, desde: Math.min(a.x, b.x), hasta: Math.max(a.x, b.x) } : { eje: 'z', en: a.x, desde: Math.min(a.z, b.z), hasta: Math.max(a.z, b.z) };
    for (const bo of bordillosDelPaso(linea, islas)) {
      bordillos++;
      const cx = linea.eje === 'x' ? bo.en + bo.calzada * 0.4 : linea.en;
      const cz = linea.eje === 'x' ? linea.en : bo.en + bo.calzada * 0.4;
      const celda = celdaDe(cx, cz);
      if (celda === null) {
        problemas.push(`el bordillo (${cx.toFixed(1)}, ${cz.toFixed(1)}) no cae en ninguna celda`);
        continue;
      }
      const rampas = rampasDeLaCelda(indiceDeCelda(celda.i, celda.j));
      const mal = juzgarElBordillo(bo, rampas, asfalto);
      if (mal !== null) problemas.push(mal);
      /* La vacuna: las mismas rampas, corridas 3 m a lo largo del bordillo, no valen. */
      const movidas = rampas.map((r) => (linea.eje === 'x' ? { ...r, z0: r.z0 + 3, z1: r.z1 + 3 } : { ...r, x0: r.x0 + 3, x1: r.x1 + 3 }));
      if (juzgarElBordillo(bo, movidas, asfalto) === null) corridos.push(`${linea.eje} ${linea.en.toFixed(1)} / ${bo.en.toFixed(1)}`);
    }
  }
  /*
   * Y al revés: cada extremo de cebra PINTADA contra un bordillo tiene su rampa, en la celda que cubre su centro. Lo
   * vio la revisión: las salidas de las avenidas pintaban cebras a 267-290 m, en el canto, donde no hay celda ni rampa
   * (ahora esas tiras llevan la marca de «sin paso»). Vacuna: el mismo punto corrido 3 m a lo largo de la calle.
   */
  const tieneRampa = (x: number, z: number): boolean => {
    const celda = celdaDe(x, z);
    if (celda === null) return false;
    return rampasDeLaCelda(indiceDeCelda(celda.i, celda.j)).some((q) => x > q.x0 - 0.05 && x < q.x1 + 0.05 && z > q.z0 - 0.05 && z < q.z1 + 0.05);
  };
  const extremos = extremosDeCebra(asfalto, islas);
  const sinRampa = extremos.filter((e) => !tieneRampa(e.x, e.z)).map((e) => `${e.que}: sin rampa`);
  const corridosConRampa = extremos.filter((e) => (e.alLargo === 'x' ? tieneRampa(e.x + 3, e.z) : tieneRampa(e.x, e.z + 3))).length;
  const comoAntes = extremosDeCebra(asfalto, islas, true).filter((e) => !tieneRampa(e.x, e.z)).length;
  /* Ninguna rampa escrita flota: todas, de todas las celdas miradas (las de los pasos y las de las cebras). */
  const flotan: string[] = [];
  let rampas = 0;
  for (const lista of porCelda.values()) {
    for (const r of lista) {
      rampas++;
      const mal = juzgarQueNoFlota(r, islas);
      if (mal !== null) flotan.push(mal);
    }
  }
  /* La vacuna: una rampa suelta en medio de la calzada de la calle x = 24 (entre las islas de 21 y 27). */
  const sueltaFlota = juzgarQueNoFlota({ x0: 24.2, z0: 0.5, x1: 24.2 + VADO.fondo, z1: 3, y1: 0.15 }, islas) !== null;
  const r: Resultado[] = [
    {
      que: `(a) traza ${String(traza)}, N${String(nivel)}: cada bordillo de cada paso de cebra tiene su rampa a ±1 m y dentro de la cebra (${String(pasos)} pasos)`,
      bien: problemas.length === 0,
      detalle: problemas.slice(0, 12),
      inspeccionados: bordillos,
      minimo: 600,
    },
    {
      que: `(a) traza ${String(traza)}, N${String(nivel)}: vacuna, las rampas corridas 3 m a lo largo del bordillo salen rojas en todos`,
      bien: corridos.length === 0 && bordillos > 0,
      detalle: corridos.slice(0, 12),
      inspeccionados: bordillos,
      minimo: 600,
    },
    {
      que: `(a) traza ${String(traza)}, N${String(nivel)}: ninguna rampa flota (todas con bordillo detrás), y una suelta en la calzada sale roja`,
      bien: flotan.length === 0 && sueltaFlota,
      detalle: flotan.slice(0, 12),
      inspeccionados: rampas,
      minimo: 600,
    },
    {
      que: `(a) traza ${String(traza)}, N${String(nivel)}: cada extremo de cebra pintada contra un bordillo tiene su rampa (sin la marca de «sin paso», ${String(comoAntes)} no la tendrían)`,
      bien: sinRampa.length === 0,
      detalle: sinRampa.slice(0, 12),
      inspeccionados: extremos.length,
      minimo: 600,
    },
    {
      que: `(a) traza ${String(traza)}, N${String(nivel)}: vacuna, con el punto corrido 3 m a lo largo de la calle ningún extremo encuentra rampa`,
      bien: corridosConRampa === 0 && extremos.length > 0,
      detalle: { corridosConRampa },
      inspeccionados: extremos.length,
      minimo: 600,
    },
  ];
  const esperado = SHA_DEL_MAPA_DE_ALTURAS[traza];
  if (esperado !== undefined) {
    const datos = base.texturaAlturas.image.data as Uint8Array;
    const sha = sha256(datos);
    const tocado = new Uint8Array(datos);
    tocado[tocado.length >> 1] = (tocado[tocado.length >> 1] as number) ^ 1;
    r.push({
      que: `(a) traza ${String(traza)}: el mapa de alturas es el de d4402d0, byte a byte (y con un téxel tocado, no)`,
      bien: sha === esperado && sha256(tocado) !== esperado,
      detalle: { sha, esperado },
      inspeccionados: datos.length,
      minimo: 1_000_000,
    });
  }
  return r;
}

/** (b) El techo de lo que escribe `tapas.ts`, en todas las celdas de la traza 0, en cada nivel y grado. */
function elTecho(ctx: ContextoDeLaCiudad): Resultado[] {
  const base = ctx.base(0);
  const problemas: string[] = [];
  let vertices = 0;
  let max = -Infinity;
  let vacunaRoja = true;
  let vacunas = 0;
  for (const nivel of NIVELES_DE_LA_CIUDAD) {
    for (const grado of GRADOS_DEL_NIVEL[nivel]) {
      for (const parte of base.partes.celdas) {
        const g = obraAPasos(parte, base.partes, nivel, grado, false, SOLO_EL_SUELO).volcar().mobiliario;
        const a = alturasDe(g);
        vertices += a.vertices;
        if (a.vertices > 0 && a.max > max) max = a.max;
        const mal = a.vertices > 0 ? juzgarElTecho(a) : null;
        if (mal !== null) problemas.push(`N${String(nivel)} g${String(grado)} celda ${String(parte.indice)}: ${mal}`);
      }
      /* La vacuna, en la celda del centro: el mismo escritor con una tapa a 0,25. */
      const centro = base.partes.celdas[indiceDeCelda(0, 0)];
      if (centro !== undefined) {
        vacunas++;
        const g = obraAPasos(centro, base.partes, nivel, grado, false, SUELO_CON_UNA_TAPA_ALTA).volcar().mobiliario;
        if (juzgarElTecho(alturasDe(g)) === null) vacunaRoja = false;
      }
    }
  }
  return [
    {
      que: `(b) todo lo de tapas.ts, en las 169 celdas de la traza 0 y en cada nivel y grado, por debajo de ${TECHO_DEL_SUELO.toFixed(2)} m contando la acera (lo más alto: ${max.toFixed(3)} m)`,
      bien: problemas.length === 0,
      detalle: problemas.slice(0, 12),
      inspeccionados: vertices,
      minimo: 50_000,
    },
    {
      que: '(b) vacuna: el escritor del suelo con una tapa a 0,25 m sale rojo en cada nivel y grado',
      bien: vacunaRoja && vacunas === 6,
      inspeccionados: vacunas,
      minimo: 6,
    },
  ];
}

/**
 * LAS GRAFÍAS DE LA ZANJA (las vacunas de c): cada una, una manera de mojar donde no hay charco o de mover la máscara,
 * metida en una copia del texto de verdad (delante, detrás o en lugar de su ancla, que tiene que estar). Las nueve de
 * la revisión (ocho en el asfalto, una en la acera) van como las escribió, casi todas delante de `charcoFinal = ch;`,
 * que ahora es dentro del bloque; y las que escriben, también DETRÁS del bloque, que es donde la regla vieja no las
 * veía. Más las entradas tocadas, el bloque envuelto, las macros, `modf`, los bucles y las sombras.
 */
interface GrafiaDeLaZanja {
  readonly nombre: string;
  readonly material: MaterialDeLaMascara;
  readonly cambios: readonly (readonly [ancla: string, como: 'antes' | 'despues' | 'en-lugar', texto: string])[];
}

const TRAS_EL_BLOQUE = 'charcoFinal = ch;';
const ANTES_DEL_BLOQUE_DEL_ASFALTO = 'float ch = charcoQ(P.xz);';

export const GRAFIAS_DE_LA_ZANJA: readonly GrafiaDeLaZanja[] = [
  /* Las de la revisión, tal cual. */
  { nombre: 'la zanja del informe', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'antes', 'ch = max(ch, zanja);\n']] },
  { nombre: 'if en una línea (revisión)', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'antes', 'if (esTramo) ch = max(ch, 0.9);\n']] },
  { nombre: 'else en una línea (revisión)', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'antes', 'if (esTramo) {} else ch = max(ch, 0.9);\n']] },
  { nombre: 'asignación en una expresión (revisión)', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'antes', 'float zz = (ch = max(ch, 0.9));\n']] },
  { nombre: 'coma (revisión)', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'antes', 'float zz = 0.0, yy = (charcoFinal = 1.0);\n']] },
  { nombre: 'inout (revisión)', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'antes', 'mojarQ(ch);\n']] },
  { nombre: 'la máscara tras charcoFinal (revisión)', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nif (esTramo) charcoFinal = max(charcoFinal, 0.9);']] },
  { nombre: 'ternario (revisión)', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\ncharcoFinal = esTramo ? max(ch, 0.9) : ch;']] },
  { nombre: 'acera con if en una línea (revisión)', material: 'acera', cambios: [[TRAS_EL_BLOQUE, 'antes', 'if (tipo < 0.5) ch = 0.8;\n']] },
  /* Las mismas, y más, detrás del bloque. */
  { nombre: 'la cuneta con otro término', material: 'asfalto', cambios: [['ch = max(ch * (0.55', 'en-lugar', 'ch = max(ch * (0.6']] },
  { nombre: 'if en una línea, detrás', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nif (esTramo) ch = max(ch, 0.9);']] },
  { nombre: 'else en una línea, detrás', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nif (esTramo) {} else ch = max(ch, 0.9);']] },
  { nombre: 'asignación en una expresión, detrás', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nfloat zz = (ch = max(ch, 0.9));']] },
  { nombre: 'coma con declaración que hace sombra', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nfloat zz = 0.0, ch;']] },
  { nombre: 'una sombra en un bloque', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\n{ float ch = 0.9; }']] },
  { nombre: 'un ++', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nch++;']] },
  { nombre: 'una función que no está en el texto', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nmojarQ(ch);']] },
  {
    nombre: 'una función inout definida',
    material: 'asfalto',
    cambios: [
      ['void main', 'antes', 'void mojarQ(inout float c) { c = max(c, 0.9); }\n'],
      [TRAS_EL_BLOQUE, 'despues', '\nmojarQ(charcoFinal);'],
    ],
  },
  { nombre: 'modf, que escribe en su segundo', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nfloat zz = modf(1.5, ch);']] },
  { nombre: 'una entrada movida antes del bloque (P)', material: 'asfalto', cambios: [[ANTES_DEL_BLOQUE_DEL_ASFALTO, 'antes', 'P.xz += 3.0;\n']] },
  { nombre: 'el ancho de la calle tocado', material: 'asfalto', cambios: [[ANTES_DEL_BLOQUE_DEL_ASFALTO, 'antes', 'medioAncho *= 0.5;\n']] },
  { nombre: 'la mip de la cuneta tocada', material: 'asfalto', cambios: [[ANTES_DEL_BLOQUE_DEL_ASFALTO, 'antes', 'pxMundoQ *= 8.0;\n']] },
  { nombre: 'una entrada declarada otra vez', material: 'asfalto', cambios: [[ANTES_DEL_BLOQUE_DEL_ASFALTO, 'antes', 'float t = 0.0;\n']] },
  {
    nombre: 'el bloque dentro de un if',
    material: 'asfalto',
    cambios: [
      [ANTES_DEL_BLOQUE_DEL_ASFALTO, 'antes', 'if (esTramo) {\n'],
      [TRAS_EL_BLOQUE, 'despues', '\n}'],
    ],
  },
  {
    nombre: 'el bloque dentro de un #if',
    material: 'asfalto',
    cambios: [
      [ANTES_DEL_BLOQUE_DEL_ASFALTO, 'antes', '\n#if NIVEL_Q > 8\n'],
      [TRAS_EL_BLOQUE, 'despues', '\n#endif\n'],
    ],
  },
  { nombre: 'un #define del ruido de los charcos', material: 'asfalto', cambios: [['void main', 'antes', '#define charcoQ(p) 0.9\n']] },
  {
    nombre: 'una macro que escribe la máscara sin nombrarla donde se usa',
    material: 'asfalto',
    cambios: [
      ['void main', 'antes', '#define MOJAR ch = max(ch, 0.9)\n'],
      [TRAS_EL_BLOQUE, 'despues', '\nMOJAR;'],
    ],
  },
  { nombre: 'un bucle que llena el charco', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nwhile (ch < 0.9) ch += 0.1;']] },
  { nombre: 'una declaración con precisión que hace sombra', material: 'asfalto', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nhighp float ch = 0.9;']] },
  { nombre: 'el reflejo sin charcoFinal', material: 'asfalto', cambios: [['vec3(0.02), charcoFinal);', 'en-lugar', 'vec3(0.02), 0.0);']] },
  { nombre: 'acera con la máscara escrita de otra cosa', material: 'acera', cambios: [[TRAS_EL_BLOQUE, 'en-lugar', 'charcoFinal = max(ch, zanja);']] },
  { nombre: 'acera con if en una línea, detrás', material: 'acera', cambios: [[TRAS_EL_BLOQUE, 'despues', '\nif (tipo < 0.5) ch = 0.8;']] },
  { nombre: 'acera con la normal tocada antes del bloque', material: 'acera', cambios: [['float ch = Ng.y', 'antes', 'Ng.y = 1.0;\n']] },
];

/** Una grafía metida en su texto, o `null` si falta alguna de sus anclas. */
function conLaGrafia(texto: string, g: GrafiaDeLaZanja): string | null {
  let t = texto;
  for (const [ancla, como, nuevo] of g.cambios) {
    const i = t.indexOf(ancla);
    if (i < 0) return null;
    const puesto = como === 'antes' ? nuevo + ancla : como === 'despues' ? ancla + nuevo : nuevo;
    t = t.slice(0, i) + puesto + t.slice(i + ancla.length);
  }
  return t;
}

/** (c) Los charcos: el texto de siempre en sus cinco consumidores, y la máscara sin términos nuevos. */
function losCharcos(): Resultado[] {
  const problemas: string[] = [];
  let textos = 0;
  let vigilados = 0;
  let asfaltoN1 = '';
  let aceraN2 = '';
  for (const nivel of NIVELES_DE_LA_CIUDAD) {
    for (const [nombre, m] of [
      ['asfalto', materialDelAsfalto(nivel)],
      ['acera', materialDeLaAcera(nivel)],
    ] as const) {
      const texto = textoDelFragmento(m);
      m.dispose();
      textos++;
      if (nombre === 'asfalto' && nivel === 1) asfaltoN1 = texto;
      if (nombre === 'acera' && nivel === 2) aceraN2 = texto;
      const j = juzgarLaMascara(texto, nombre);
      vigilados += j.vigilados;
      for (const p of j.problemas) problemas.push(`${nombre} N${String(nivel)}: ${p}`);
      if (j.vigilados < (nombre === 'asfalto' ? 70 : 35)) problemas.push(`${nombre} N${String(nivel)}: sólo ${String(j.vigilados)} apariciones vigiladas (¿mira lo que debe?)`);
    }
  }
  const tarjetas = materialDeLasTarjetas();
  const salpicaduras = crearLasSalpicaduras(1, 1);
  const consumidores: readonly (readonly [string, string])[] = [
    ['tarjetas', tarjetas.fragmentShader],
    ['salpicaduras', (salpicaduras.material as THREE.ShaderMaterial).vertexShader],
    ['reflejo en pantalla', UBER],
  ];
  for (const [nombre, texto] of consumidores) {
    textos++;
    for (const p of juzgarLaMascara(texto, null).problemas) problemas.push(`${nombre}: ${p}`);
  }
  tarjetas.dispose();
  salpicaduras.geometry.dispose();
  (salpicaduras.material as THREE.Material).dispose();
  const shaBien = sha256(GLSL_CHARCOS) === SHA_DE_LOS_CHARCOS;
  /* Las vacunas: cada grafía de la zanja, en una copia, sale roja (y su ancla está: la copia cambia); y un consumidor
     sin los charcos. */
  const pasan: string[] = [];
  let grafias = 0;
  for (const g of GRAFIAS_DE_LA_ZANJA) {
    const base = g.material === 'asfalto' ? asfaltoN1 : aceraN2;
    const t = conLaGrafia(base, g);
    grafias++;
    if (t === null || t === base) pasan.push(`${g.nombre}: no encuentra su ancla`);
    else if (juzgarLaMascara(t, g.material).problemas.length === 0) pasan.push(`${g.nombre}: PASA la regla`);
  }
  const sinCharcos = juzgarLaMascara(UBER.replace(GLSL_CHARCOS, ''), null).problemas.length > 0;
  return [
    {
      que: '(c) asfalto y acera (N0-N3), tarjetas, salpicaduras y reflejo en pantalla llevan el GLSL_CHARCOS de d4402d0, y la máscara es el bloque fijo y nada más la escribe',
      bien: problemas.length === 0 && shaBien,
      detalle: { problemas: problemas.slice(0, 12), shaBien, vigilados },
      inspeccionados: textos + vigilados,
      minimo: 11 + 4 * 70 + 4 * 35,
    },
    {
      que: `(c) vacunas: las ${String(GRAFIAS_DE_LA_ZANJA.length)} grafías de la zanja (las nueve de la revisión y más, delante y detrás del bloque) y el reflejo sin los charcos salen rojos`,
      bien: pasan.length === 0 && sinCharcos && grafias >= 33,
      detalle: { pasan, sinCharcos },
      inspeccionados: grafias + 1,
      minimo: 34,
    },
  ];
}

export const comprobar: ComprobarElPaquete = (ctx) => {
  const r: Resultado[] = [];
  for (const { traza, nivel } of VADOS_QUE_SE_MIRAN) r.push(...losVados(ctx, traza, nivel));
  r.push(...elTecho(ctx));
  r.push(...losCharcos());
  return r;
};
