/**
 * LO COMÚN DE `verify:quiebro-ciudad` (plan del detalle de la ciudad, §5.2.8 y O1-VERIFICACION): lo que usan el
 * comprobador y las comprobaciones de cada paquete (`quiebro-ciudad/<paquete>.ts`), y los JUECES de lo que la ola 1b
 * vigila antes de que las familias lo cambien.
 *
 * ═══ LAS COMPROBACIONES DE CADA PAQUETE ═══
 *
 * Cada paquete de las olas 2-4 es dueño de SU fichero, `quiebro-ciudad/<paquete>.ts`, que exporta
 * `comprobar(ctx): Resultado[]`. El comprobador los importa todos (la lista de `PAQUETES_DE_LA_CIUDAD`, en
 * `verificar-quiebro-ciudad.ts`), les da el mismo contexto (`ContextoDeLaCiudad`: las trazas, sus bases, sus
 * celdas en cualquier nivel y grado, sus ciudades abiertas y el texto final de un sombreador) y exige de cada
 * resultado dos cosas: que esté en verde y que haya mirado al menos lo que dice (`inspeccionados ≥ minimo`).
 * Cero inspeccionados es cero fallos, y se lee como vigilado: por eso cada resultado trae su mínimo. Un paquete
 * no toca `verificar-quiebro-ciudad.ts` ni este fichero para comprobar lo suyo.
 *
 * ═══ LOS JUECES ═══
 *
 * Cada juez es una función que recibe lo que juzga y devuelve lo que está mal (y lo que miró). El comprobador los
 * aplica a la ciudad de verdad y, además, a una copia envenenada (las VACUNAS, en el comprobador): si un juez
 * dejara de mirar, su vacuna saldría verde y el comprobador, rojo.
 *
 *   · LA FRANJA DE ANDAR (1): lo pintado entre 0,2 y 1,9 m cae dentro de una caja de la estructura, y toda caja
 *     tiene algo pintado; y cada capa cumple lo que declara de su estorbo (`estorboDeLaCapa`).
 *   · LAS CARAS AL REVÉS (2): en las familias con material de una sola cara, el sentido de cada triángulo casa con
 *     su normal (`carasAlReves`).
 *   · LA PARIDAD GLSL ↔ JS (3): los literales de las reglas gemelas, en orden (`paridadDeLasGemelas`).
 *   · LA GRAFÍA ES LO ÚLTIMO (4): detrás del bloque de `uRejillaDeGlifos` va la marca y nadie escribe `albedo` ni
 *     `emision` (`juzgarLaGrafia`).
 *   · LA MEMORIA (5): los bytes de la GPU (`bytesEnLaGpu`) y los de JS (`bytesDeLaCelda`, `bytesDeLosMoldes`).
 *   · EL RELEVO (6): toda textura de un material de la ciudad se sube antes de enseñarla (`juzgarElRelevo`).
 *   · LAS FUENTES NO DEPENDEN DEL GRADO (11) (`diferenciasDeLasFuentes`).
 *   · LOS TROZOS POR PIEZA Y GRADO (12) (`pasosDeLaCelda`, `obraAPasos`).
 *   · LAS CAPAS CUENTAN (13): lo que pinta cada capa es lo que declara (`juzgarLasLlamadas`).
 *
 * Sin `node:*`: lo importa también el banco de `verify:quiebro-gl` (`ciudad/banco-gl.tsx`), en el navegador.
 */
import * as THREE from 'three';
import type { CapaDeLaCiudad, Tri } from '../../src/quiebro/ciudad/capas';
import type { CeldaConstruida, EscritorDeLaCelda, Familia, ObraDeLaCelda, ParteDeLaCelda, PartesDeLaCiudad } from '../../src/quiebro/ciudad/celdas';
import { ESCRITORES_DE_LA_CELDA, FAMILIAS, construirLaCelda, moldesDeLaObra, obraNueva } from '../../src/quiebro/ciudad/celdas';
import type { FuentesDeLuz } from '../../src/quiebro/ciudad/fuentes';
import { repartirLasLuces } from '../../src/quiebro/ciudad/fuentes';
import type { GeometriaVolcada, Molde } from '../../src/quiebro/ciudad/geometria';
import type { CajaXZ, GradoDeLaCelda, NivelDeLaCiudad } from '../../src/quiebro/ciudad/tipos';
import type { BaseDeLaCiudad, CiudadAbiertaConstruida, CiudadParaPintar } from '../../src/quiebro/ciudad/abierta';
import { ciudadParaPintar, construirLaBase, construirLaCiudadAbierta } from '../../src/quiebro/ciudad/abierta';
import { piezasPorSubir } from '../../src/quiebro/ciudad/relevo';
import { PRESUPUESTO_DE_LA_VENTANA } from '../../src/quiebro/ciudad/ventana';
import { materialesDe } from '../../src/quiebro/atmosfera/parcheo';
import { atlasDeLaGrafia } from '../../src/quiebro/efectos/atlas';
import { MARCA_DE_LA_MATERIA, bytesDelRuido } from '../../src/quiebro/ciudad/materia/ruido';

/* ═══════════════════════════════ LOS RESULTADOS Y EL CONTEXTO ═══════════════════════════════ */

/** Lo que devuelve una comprobación de paquete: si está en verde y cuánto miró (con su mínimo). */
export interface Resultado {
  readonly que: string;
  readonly bien: boolean;
  readonly detalle?: unknown;
  /** Cuántas cosas miró (celdas, triángulos, textos…). */
  readonly inspeccionados: number;
  /** Lo menos que tiene que haber mirado para que su verde signifique algo. */
  readonly minimo: number;
}

/** Lo que el comprobador da a cada paquete (ver la cabecera). */
export interface ContextoDeLaCiudad {
  /** El código de la mesa de las trazas (`K7M2P`, el de las fotos). */
  readonly codigo: string;
  /** Cuántas trazas hay (0 … trazas − 1). */
  readonly trazas: number;
  /** La ciudad de la noche de una traza (la misma que mira el comprobador). */
  fuente(traza: number): CiudadParaPintar;
  /** Su base (las partes, lo lejano, el suelo, el borde, los mapas). Se guarda la última. */
  base(traza: number): BaseDeLaCiudad;
  /** Una celda construida de un tirón con el grado pedido (y el relieve de hoy del nivel, si no se dice). */
  celda(traza: number, k: number, nivel: NivelDeLaCiudad, grado: GradoDeLaCelda, relieve?: boolean): CeldaConstruida;
  /** La ciudad abierta de una traza y un nivel, con la ventana montada en (0, 0). Se guarda la última. */
  ciudad(traza: number, nivel: NivelDeLaCiudad): CiudadAbiertaConstruida;
  /** El texto FINAL del fragmento de un material (parcheado como en three r185, con los `#include` resueltos). */
  textoDelFragmento(material: THREE.Material): string;
  /** Una línea de informe, sangrada. No comprueba nada. */
  nota(texto: string): void;
}

/** La comprobación de un paquete (`quiebro-ciudad/<paquete>.ts`). */
export type ComprobarElPaquete = (ctx: ContextoDeLaCiudad) => Resultado[];

/** EL CONTEXTO de `verify:quiebro-ciudad`: se construye lo que se pide y se guarda lo último (la memoria no da para más). */
export function contextoDeLaCiudad(codigo: string, trazas: number, nota: (texto: string) => void): ContextoDeLaCiudad & { soltar(): void } {
  let ultimaBase: { traza: number; base: BaseDeLaCiudad } | null = null;
  let ultimaCiudad: { traza: number; nivel: NivelDeLaCiudad; ciudad: CiudadAbiertaConstruida } | null = null;
  const fuentes = new Map<number, CiudadParaPintar>();
  const fuente = (traza: number): CiudadParaPintar => {
    let f = fuentes.get(traza);
    if (f === undefined) {
      f = ciudadParaPintar(traza, codigo, 1 + (traza % 10));
      fuentes.set(traza, f);
    }
    return f;
  };
  const soltarLaCiudad = (): void => {
    ultimaCiudad?.ciudad.liberar();
    ultimaCiudad = null;
  };
  const base = (traza: number): BaseDeLaCiudad => {
    if (ultimaBase !== null && ultimaBase.traza === traza) return ultimaBase.base;
    if (ultimaCiudad !== null && ultimaCiudad.traza !== traza) soltarLaCiudad();
    if (ultimaBase !== null) {
      ultimaBase.base.usos--;
      if (ultimaBase.base.usos <= 0) ultimaBase.base.liberar();
    }
    const b = construirLaBase(fuente(traza));
    /* Un uso del contexto: la base no se suelta al soltar una ciudad hecha sobre ella. */
    b.usos++;
    ultimaBase = { traza, base: b };
    return b;
  };
  return {
    codigo,
    trazas,
    fuente,
    base,
    celda(traza, k, nivel, grado, relieve) {
      const b = base(traza);
      const parte = b.partes.celdas[k];
      if (parte === undefined) throw new Error(`la traza ${String(traza)} no tiene la celda ${String(k)}`);
      return deUnaVez(construirLaCelda(parte, b.partes, nivel, true, grado, relieve));
    },
    ciudad(traza, nivel) {
      if (ultimaCiudad !== null && ultimaCiudad.traza === traza && ultimaCiudad.nivel === nivel) return ultimaCiudad.ciudad;
      soltarLaCiudad();
      const c = construirLaCiudadAbierta(fuente(traza), nivel, { base: base(traza) });
      c.montarYa(0, 0);
      ultimaCiudad = { traza, nivel, ciudad: c };
      return c;
    },
    textoDelFragmento,
    nota,
    soltar(): void {
      soltarLaCiudad();
      if (ultimaBase !== null) {
        ultimaBase.base.usos--;
        if (ultimaBase.base.usos <= 0) ultimaBase.base.liberar();
      }
      ultimaBase = null;
    },
  };
}

function deUnaVez<T>(g: Generator<unknown, T, void>): T {
  for (;;) {
    const r = g.next();
    if (r.done === true) return r.value;
  }
}

/* ═══════════════════════════════ EL TEXTO FINAL DE UN SOMBREADOR ═══════════════════════════════ */

const INCLUIR = /^[ \t]*#include +<([\w\d./]+)>/gm;

/** Los `#include <…>` de three resueltos con sus trozos (recursivo). */
export function resolverLosTrozos(texto: string): string {
  return texto.replace(INCLUIR, (_m, n: string) => {
    const c = (THREE.ShaderChunk as Record<string, string>)[n];
    if (c === undefined) throw new Error(`three no tiene el trozo ${n}`);
    return resolverLosTrozos(c);
  });
}

/** El sombreador de partida de three para un material (el que parchea su `onBeforeCompile`). */
function sombreadorDeThree(m: THREE.Material): { vertexShader: string; fragmentShader: string } | null {
  if (m instanceof THREE.ShaderMaterial) return { vertexShader: m.vertexShader, fragmentShader: m.fragmentShader };
  if (m instanceof THREE.MeshPhysicalMaterial) return THREE.ShaderLib.physical;
  if (m instanceof THREE.MeshStandardMaterial) return THREE.ShaderLib.standard;
  if (m instanceof THREE.MeshBasicMaterial) return THREE.ShaderLib.basic;
  if (m instanceof THREE.MeshLambertMaterial) return THREE.ShaderLib.lambert;
  if (m instanceof THREE.MeshPhongMaterial) return THREE.ShaderLib.phong;
  return null;
}

/** El sombreador de un material tras su `onBeforeCompile` (como three r185), con sus uniformes. `null` si no se sabe. */
export function sombreadorParcheado(m: THREE.Material): { vertice: string; fragmento: string; uniformes: Record<string, THREE.IUniform> } | null {
  const base = sombreadorDeThree(m);
  if (base === null) return null;
  const sh = {
    vertexShader: base.vertexShader,
    fragmentShader: base.fragmentShader,
    uniforms: m instanceof THREE.ShaderMaterial ? { ...m.uniforms } : {},
    defines: {},
  } as unknown as Parameters<THREE.Material['onBeforeCompile']>[0];
  m.onBeforeCompile(sh, undefined as unknown as THREE.WebGLRenderer);
  return { vertice: sh.vertexShader, fragmento: sh.fragmentShader, uniformes: sh.uniforms };
}

/** El texto FINAL del fragmento de un material, con los trozos resueltos (vacío si no se sabe montarlo). */
export function textoDelFragmento(m: THREE.Material): string {
  const s = sombreadorParcheado(m);
  return s === null ? '' : resolverLosTrozos(s.fragmento);
}

/** El código sin comentarios de C (lo que usan las reglas prohibitivas: un comentario que cite algo no cuenta). */
export function soloCodigo(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/* ═══════════════════════════════ (1) LA FRANJA DE ANDAR ═══════════════════════════════ */

/** La franja de andar: por encima del bordillo y por debajo de la cabeza. */
export const FRANJA: readonly [number, number] = [0.2, 1.9];
/** Tolerancia al comparar con las cajas (las caras de un muro caen justo en el borde). */
export const HOLGURA = 0.03;
/** El canto de la ciudad: lo que queda a este lado de ±270 es de la ciudad (el borde, fuera). */
export const CANTO_DE_LA_CIUDAD = 270;
/** Lo más que se separa del muro lo que declara ir `pegado-al-muro`. */
export const HOLGURA_DEL_MURO = 0.15;

export type { Tri };

/** El polígono del triángulo recortado a la franja de andar (Sutherland-Hodgman en y). */
export function recortarALaFranja(t: Tri): THREE.Vector3[] {
  let poli = [t.a, t.b, t.c];
  for (const [limite, dentroSi] of [
    [FRANJA[0], (y: number) => y >= FRANJA[0]],
    [FRANJA[1], (y: number) => y <= FRANJA[1]],
  ] as const) {
    const nuevo: THREE.Vector3[] = [];
    for (let i = 0; i < poli.length; i++) {
      const p = poli[i] as THREE.Vector3;
      const q = poli[(i + 1) % poli.length] as THREE.Vector3;
      const pd = dentroSi(p.y);
      const qd = dentroSi(q.y);
      if (pd) nuevo.push(p);
      if (pd !== qd && Math.abs(q.y - p.y) > 1e-9) nuevo.push(p.clone().lerp(q, (limite - p.y) / (q.y - p.y)));
    }
    poli = nuevo;
    if (poli.length === 0) break;
  }
  return poli;
}

export function dentroDeAlguna(x: number, z: number, cajas: readonly CajaXZ[], holgura = HOLGURA): boolean {
  for (const c of cajas) {
    if (x >= c.x0 - holgura && x <= c.x1 + holgura && z >= c.z0 - holgura && z <= c.z1 + holgura) return true;
  }
  return false;
}

/** Los triángulos de una geometría volcada que tocan la franja de andar. */
export function franjaDe(g: GeometriaVolcada, salida: Tri[]): void {
  const pos = g.datos.get('position');
  if (pos === undefined) return;
  const idx = g.indices;
  for (let k = 0; k < idx.length; k += 3) {
    const a = (idx[k] as number) * 3;
    const b = (idx[k + 1] as number) * 3;
    const c = (idx[k + 2] as number) * 3;
    const y0 = Math.min(pos[a + 1] as number, pos[b + 1] as number, pos[c + 1] as number);
    const y1 = Math.max(pos[a + 1] as number, pos[b + 1] as number, pos[c + 1] as number);
    if (y1 < FRANJA[0] || y0 > FRANJA[1]) continue;
    salida.push({
      a: new THREE.Vector3(pos[a] as number, pos[a + 1] as number, pos[a + 2] as number),
      b: new THREE.Vector3(pos[b] as number, pos[b + 1] as number, pos[b + 2] as number),
      c: new THREE.Vector3(pos[c] as number, pos[c + 1] as number, pos[c + 2] as number),
    });
  }
}

/** Las cajas en celdas de 8 m, para preguntar «¿está este punto en alguna?» sin mirarlas todas. */
export function rejillaDeCajas(cajas: readonly CajaXZ[], holgura = HOLGURA): (x: number, z: number) => boolean {
  const m = new Map<number, CajaXZ[]>();
  for (const c of cajas) {
    for (let i = Math.floor((c.x0 - holgura) / 8); i <= Math.floor((c.x1 + holgura) / 8); i++) {
      for (let k = Math.floor((c.z0 - holgura) / 8); k <= Math.floor((c.z1 + holgura) / 8); k++) {
        const clave = (i + 128) * 512 + (k + 128);
        const l = m.get(clave);
        if (l === undefined) m.set(clave, [c]);
        else l.push(c);
      }
    }
  }
  return (x, z) => dentroDeAlguna(x, z, m.get((Math.floor(x / 8) + 128) * 512 + (Math.floor(z / 8) + 128)) ?? [], holgura);
}

export class RejillaDeTriangulos {
  private readonly celda = 4;
  private readonly mapa = new Map<string, Tri[]>();

  constructor(tris: readonly Tri[]) {
    for (const t of tris) {
      const x0 = Math.floor(Math.min(t.a.x, t.b.x, t.c.x) / this.celda);
      const x1 = Math.floor(Math.max(t.a.x, t.b.x, t.c.x) / this.celda);
      const z0 = Math.floor(Math.min(t.a.z, t.b.z, t.c.z) / this.celda);
      const z1 = Math.floor(Math.max(t.a.z, t.b.z, t.c.z) / this.celda);
      for (let i = x0; i <= x1; i++) {
        for (let k = z0; k <= z1; k++) {
          const clave = `${String(i)},${String(k)}`;
          const lista = this.mapa.get(clave);
          if (lista === undefined) this.mapa.set(clave, [t]);
          else lista.push(t);
        }
      }
    }
  }

  cerca(x0: number, z0: number, x1: number, z1: number): Set<Tri> {
    const salida = new Set<Tri>();
    for (let i = Math.floor(Math.min(x0, x1) / this.celda); i <= Math.floor(Math.max(x0, x1) / this.celda); i++) {
      for (let k = Math.floor(Math.min(z0, z1) / this.celda); k <= Math.floor(Math.max(z0, z1) / this.celda); k++) {
        for (const t of this.mapa.get(`${String(i)},${String(k)}`) ?? []) salida.add(t);
      }
    }
    return salida;
  }
}

const rayo = new THREE.Ray();
const golpe = new THREE.Vector3();

/** ¿Tiene esta caja algo pintado? 12 rayos desde fuera hacia su centro, a tres alturas. */
export function cajaPintada(c: CajaXZ, rejilla: RejillaDeTriangulos): boolean {
  const cx = (c.x0 + c.x1) / 2;
  const cz = (c.z0 + c.z1) / 2;
  const salidas: readonly (readonly [number, number])[] = [
    [c.x0 - 0.6, cz],
    [c.x1 + 0.6, cz],
    [cx, c.z0 - 0.6],
    [cx, c.z1 + 0.6],
  ];
  const cercanos = rejilla.cerca(c.x0 - 1, c.z0 - 1, c.x1 + 1, c.z1 + 1);
  for (const y of [0.3, 0.9, 1.5]) {
    for (const [sx, sz] of salidas) {
      rayo.origin.set(sx, y, sz);
      rayo.direction.set(cx - sx, 0, cz - sz).normalize();
      for (const t of cercanos) {
        const p = rayo.intersectTriangle(t.a, t.b, t.c, false, golpe);
        if (p === null) continue;
        if (p.x >= c.x0 - HOLGURA && p.x <= c.x1 + HOLGURA && p.z >= c.z0 - HOLGURA && p.z <= c.z1 + HOLGURA) return true;
      }
    }
  }
  return false;
}

export interface JuicioDeLaFranja {
  /** Cuántos triángulos de la franja quedan (en algún punto) fuera de toda caja, dentro de ±270. */
  readonly fuera: number;
  /** Unos ejemplos, con su sitio. */
  readonly ejemplos: readonly string[];
  /** Las cajas sin nada pintado. */
  readonly sinPintar: readonly CajaXZ[];
  readonly triangulos: number;
  readonly cajas: number;
}

/**
 * EL JUEZ DE LA FRANJA: nada pintado en la franja de andar queda fuera de una caja dentro de ±270, y toda caja
 * tiene algo pintado (de 12 rayos que la buscan desde fuera, alguno toca un triángulo dentro de ella).
 */
export function juzgarLaFranja(tris: readonly Tri[], cajas: readonly CajaXZ[], mirarLasCajas = true): JuicioDeLaFranja {
  const enUnaCaja = rejillaDeCajas(cajas);
  let fuera = 0;
  const ejemplos: string[] = [];
  for (const t of tris) {
    const poli = recortarALaFranja(t);
    if (poli.length < 3) continue;
    const cx = poli.reduce((s, q) => s + q.x, 0) / poli.length;
    const cz = poli.reduce((s, q) => s + q.z, 0) / poli.length;
    for (const [px, pz] of [...poli.map((q) => [q.x, q.z] as const), [cx, cz] as const]) {
      if (Math.abs(px) >= CANTO_DE_LA_CIUDAD - 0.01 || Math.abs(pz) >= CANTO_DE_LA_CIUDAD - 0.01) continue;
      if (!enUnaCaja(px, pz)) {
        if (ejemplos.length < 3) ejemplos.push(`(${px.toFixed(2)}, ${pz.toFixed(2)})`);
        fuera++;
        break;
      }
    }
  }
  const sinPintar: CajaXZ[] = [];
  if (mirarLasCajas) {
    const rejilla = new RejillaDeTriangulos(tris);
    for (const c of cajas) if (!cajaPintada(c, rejilla)) sinPintar.push(c);
  }
  return { fuera, ejemplos, sinPintar, triangulos: tris.length, cajas: mirarLasCajas ? cajas.length : 0 };
}

/** Los vértices (en el mundo, con las instancias) de lo que pinta un objeto. */
export function verticesDe(objeto: THREE.Object3D, visitar: (x: number, y: number, z: number) => void): number {
  objeto.updateMatrixWorld(true);
  let n = 0;
  const v = new THREE.Vector3();
  const mi = new THREE.Matrix4();
  const m = new THREE.Matrix4();
  objeto.traverse((o) => {
    const malla = o as THREE.Mesh;
    if (!(malla.isMesh === true || (o as THREE.Points).isPoints === true || (o as THREE.Line).isLine === true)) return;
    const pos = malla.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (pos === undefined) return;
    const instancias = o instanceof THREE.InstancedMesh ? o.count : 1;
    for (let k = 0; k < instancias; k++) {
      if (o instanceof THREE.InstancedMesh) {
        o.getMatrixAt(k, mi);
        m.multiplyMatrices(o.matrixWorld, mi);
      } else m.copy(o.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m);
        visitar(v.x, v.y, v.z);
        n++;
      }
    }
  });
  return n;
}

/**
 * LO QUE UNA CAPA DECLARA DE SU ESTORBO, mirado en su geometría: `por-encima-de-1,9` (ningún vértice por debajo),
 * `fuera-de-la-ciudad` (ninguno dentro de ±270), `pegado-al-muro` (ninguno a más de `HOLGURA_DEL_MURO` de una caja
 * de la noche), o una función, que mete sus triángulos en la franja para cruzarlos con las cajas.
 */
export function estorboDeLaCapa(capa: CapaDeLaCiudad, cajas: readonly CajaXZ[]): { readonly tris: Tri[]; readonly problemas: string[]; readonly mirados: number } {
  const tris: Tri[] = [];
  const problemas: string[] = [];
  const e = capa.estorbo;
  if (typeof e === 'function') {
    e(tris);
    return { tris, problemas, mirados: tris.length };
  }
  let malos = 0;
  let ejemplo = '';
  const cercaDeUnMuro = e === 'pegado-al-muro' ? rejillaDeCajas(cajas, HOLGURA_DEL_MURO) : null;
  const mirados = verticesDe(capa.objeto, (x, y, z) => {
    const mal =
      e === 'por-encima-de-1,9'
        ? y < FRANJA[1] - 1e-3
        : e === 'fuera-de-la-ciudad'
          ? Math.max(Math.abs(x), Math.abs(z)) < CANTO_DE_LA_CIUDAD - 0.01
          : !(cercaDeUnMuro as (x: number, z: number) => boolean)(x, z);
    if (!mal) return;
    malos++;
    if (ejemplo === '') ejemplo = `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`;
  });
  if (malos > 0) problemas.push(`la capa «${capa.nombre}» declara «${e}» y ${String(malos)} vértices no lo cumplen, p. ej. ${ejemplo}`);
  return { tris, problemas, mirados };
}

/* ═══════════════════════════════ (2) LAS CARAS AL REVÉS ═══════════════════════════════ */

/**
 * LAS CARAS AL REVÉS de una geometría con un material de una cara: los triángulos cuyo sentido (el producto
 * vectorial de sus lados) no casa con la normal de sus vértices. Con `FrontSide` three los tira vistos desde donde
 * miran (o los ilumina por detrás); con `BackSide`, al revés; con `DoubleSide` no hay nada que mirar. Devuelve el
 * centro y la normal (la media de las de sus vértices) de cada uno, y cuántos se miraron (los degenerados, de área
 * nula, no cuentan).
 */
export function carasAlReves(g: GeometriaVolcada, lado: THREE.Side): { readonly centros: CaraAlReves[]; readonly mirados: number } {
  const centros: CaraAlReves[] = [];
  if (lado === THREE.DoubleSide) return { centros, mirados: 0 };
  const pos = g.datos.get('position');
  const nor = g.datos.get('normal');
  if (pos === undefined || nor === undefined) return { centros, mirados: 0 };
  const signo = lado === THREE.BackSide ? -1 : 1;
  const idx = g.indices;
  let mirados = 0;
  for (let k = 0; k < idx.length; k += 3) {
    const i0 = (idx[k] as number) * 3;
    const i1 = (idx[k + 1] as number) * 3;
    const i2 = (idx[k + 2] as number) * 3;
    const ux = (pos[i1] as number) - (pos[i0] as number);
    const uy = (pos[i1 + 1] as number) - (pos[i0 + 1] as number);
    const uz = (pos[i1 + 2] as number) - (pos[i0 + 2] as number);
    const wx = (pos[i2] as number) - (pos[i0] as number);
    const wy = (pos[i2 + 1] as number) - (pos[i0 + 1] as number);
    const wz = (pos[i2 + 2] as number) - (pos[i0 + 2] as number);
    const nx = uy * wz - uz * wy;
    const ny = uz * wx - ux * wz;
    const nz = ux * wy - uy * wx;
    const area = Math.hypot(nx, ny, nz);
    if (area < 1e-8) continue;
    mirados++;
    const mx = (nor[i0] as number) + (nor[i1] as number) + (nor[i2] as number);
    const my = (nor[i0 + 1] as number) + (nor[i1 + 1] as number) + (nor[i2 + 1] as number);
    const mz = (nor[i0 + 2] as number) + (nor[i1 + 2] as number) + (nor[i2 + 2] as number);
    const largo = Math.hypot(mx, my, mz);
    if (largo < 1e-6) continue;
    if ((signo * (nx * mx + ny * my + nz * mz)) / (area * largo) < -1e-3) {
      centros.push({
        centro: [
          ((pos[i0] as number) + (pos[i1] as number) + (pos[i2] as number)) / 3,
          ((pos[i0 + 1] as number) + (pos[i1 + 1] as number) + (pos[i2 + 1] as number)) / 3,
          ((pos[i0 + 2] as number) + (pos[i1 + 2] as number) + (pos[i2 + 2] as number)) / 3,
        ],
        normal: [mx / largo, my / largo, mz / largo],
      });
    }
  }
  return { centros, mirados };
}

/** Una cara al revés: su centro y hacia dónde dice mirar. */
export interface CaraAlReves {
  readonly centro: readonly [number, number, number];
  readonly normal: readonly [number, number, number];
}

/**
 * La clave de una cara al revés: la celda, la familia, la posición de su centro redondeada al centímetro y su normal a
 * la décima (dos caras en el mismo sitio que miran a lados contrarios, como las de un costado de dos caras, son dos).
 */
export function claveDeLaCara(celda: number, familia: Familia, c: CaraAlReves): string {
  const p = c.centro;
  const n = c.normal.map((v) => String(Math.round(v * 10) + 0));
  return `${String(celda)}|${familia}|${String(Math.round(p[0] * 100))},${String(Math.round(p[1] * 100))},${String(Math.round(p[2] * 100))}|${n.join(',')}`;
}

/**
 * LA FIRMA de una cara al revés, sin sitio: la familia, su normal a la décima y la altura de su centro al decímetro.
 * En las trazas que no son la anotada no se puede exigir el MISMO conjunto (otras calles, otros toldos), pero sí que
 * toda cara al revés tenga la firma de una de las de hoy: hoy las 706 son el costado de los toldos, a 2,7 m, con
 * cuatro firmas; una pieza nueva al revés trae otra familia, otra normal u otra altura.
 */
export function firmaDeLaCara(familia: Familia, c: CaraAlReves): string {
  /* Sacada de la clave, y no redondeando otra vez desde la cara: así una cara y su clave anotada dan la misma firma. */
  return firmaDeLaClave(claveDeLaCara(0, familia, c)) ?? `${familia}|?`;
}

/** La firma de una clave de `claveDeLaCara` (la de su cara), o `null` si la clave no se lee. */
export function firmaDeLaClave(clave: string): string | null {
  const [, familia, centro, normal] = clave.split('|');
  const y = Number(centro?.split(',')[1]);
  if (familia === undefined || normal === undefined || !Number.isFinite(y)) return null;
  return `${familia}|${normal}|${String(Math.round(y / 10) + 0)}`;
}

/* ═══════════════════════════════ (3) LA PARIDAD GLSL ↔ JS ═══════════════════════════════ */

/** Los literales numéricos de un texto (sin comentarios), en orden, como números. */
export function literales(texto: string): number[] {
  const salida: number[] = [];
  const re = /(?<![\w.])(\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?(?![\w.])/g;
  for (const m of soloCodigo(texto).matchAll(re)) salida.push(Number(m[0]));
  return salida;
}

/** El cuerpo (entre llaves) de la primera función cuya cabecera casa con `cabecera`; `null` si no está. */
export function cuerpoDeLaFuncion(fuente: string, cabecera: RegExp): string | null {
  const m = cabecera.exec(fuente);
  if (m === null) return null;
  const abre = fuente.indexOf('{', m.index + m[0].length - 1);
  if (abre < 0) return null;
  let hondo = 0;
  for (let i = abre; i < fuente.length; i++) {
    const ch = fuente[i];
    if (ch === '{') hondo++;
    else if (ch === '}') {
      hondo--;
      if (hondo === 0) return fuente.slice(abre + 1, i);
    }
  }
  return null;
}

/** El valor de un literal de `huecoQ` para cada estilo: una evaluación mínima de sus `if (estilo == N || …) return vec4(…);`. */
export function evaluarHuecoQ(cuerpo: string, estilo: number): readonly number[] | null {
  const codigo = soloCodigo(cuerpo);
  const re = /(?:if\s*\(([^)]*)\)\s*)?return\s+vec4\s*\(([^)]*)\)\s*;/g;
  for (const m of codigo.matchAll(re)) {
    const cond = m[1];
    const valores = (m[2] as string).split(',').map((s) => Number(s.trim()));
    if (cond === undefined) return valores;
    const casa = cond.split('||').some((c) => {
      const q = /^\s*estilo\s*==\s*(\d+)\s*$/.exec(c);
      return q !== null && Number(q[1]) === estilo;
    });
    if (casa) return valores;
  }
  return null;
}

export interface TextosDeLaParidad {
  /** El fuente de `hash.ts`. */
  readonly hashJs: string;
  /** `GLSL_COMUN_DE_LA_FACHADA` (las funciones gemelas). */
  readonly glslComun: string;
  /** `TRAMO_DEL_HUECO` (donde se llama a `colorDeLuzQ` con su semilla). */
  readonly tramoDelHueco: string;
  /** `TRAMO_DEL_BAJO` (el reparto de las tiendas). */
  readonly tramoDelBajo: string;
  /** `HUECO_DEL_ESTILO`, por número de estilo (`NUMERO_DEL_ESTILO`). */
  readonly huecoDelEstilo: readonly (readonly number[])[];
  /** `LARGO_DE_UNA_TIENDA`. */
  readonly largoDeUnaTienda: number;
}

/**
 * LO QUE EL GLSL DE `encendidaQ` LLEVA DE MÁS: la segunda lotería (`sigue`), que sólo APAGA ventanas de las que
 * enciende la regla de `hash.ts` (al alba quedan pocas), y el `0.0` de su `return`. No tiene gemela: las tarjetas y
 * la luz horneada se ponen con la regla de antes, y lo que la lotería apaga es un subconjunto.
 */
export const LITERALES_DE_MAS_EN_ENCENDIDA = [53, 1, 0, 0] as const;

/** Iguales como listas de números. */
function mismosNumeros(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((x, i) => Math.abs(x - (b[i] as number)) < 1e-9);
}

/** La llamada del hueco que da el color de la luz de dentro: `hc = hashQ(vec2(celda, planta), semilla + N)` y después `colorDeLuzQ(hc)`. */
const LLAMADA_DEL_COLOR = /float\s+(\w+)\s*=\s*hashQ\s*\(\s*vec2\s*\(\s*celda\s*,\s*planta\s*\)\s*,\s*semilla\s*\+\s*([\d.]+)\s*\)\s*;[\s\S]*?colorDeLuzQ\s*\(\s*\1\s*\)/;

/** La semilla que el hueco le suma al hash del color de la luz (`null` si la llamada no se encuentra). */
export function semillaDelColor(tramoDelHueco: string): number | null {
  const m = LLAMADA_DEL_COLOR.exec(soloCodigo(tramoDelHueco));
  return m === null ? null : Number(m[2]);
}

/** Las cuatro cuentas del reparto de las tiendas de la planta baja (la tienda de 6 m), en su orden. */
export const CUENTAS_DE_LA_TIENDA: readonly (readonly [string, RegExp])[] = [
  ['nT', /float\s+nT\s*=\s*max\s*\(\s*1\.0\s*,\s*floor\s*\(\s*anchoCara\s*\/\s*([\d.]+)\s*\)\s*\)\s*;/],
  ['tienda', /float\s+tienda\s*=\s*min\s*\(\s*floor\s*\(\s*a\s*\/\s*([\d.]+)\s*\)\s*,\s*nT\s*-\s*1\.0\s*\)\s*;/],
  ['t0', /float\s+t0\s*=\s*tienda\s*\*\s*([\d.]+)\s*;/],
  ['t1', /float\s+t1\s*=\s*tienda\s*>=\s*nT\s*-\s*1\.0\s*\?\s*anchoCara\s*:\s*t0\s*\+\s*([\d.]+)\s*;/],
];

/**
 * Las cuatro cuentas de la tienda TAL CUAL las lleva el GLSL del bajo (para evaluarlas en la GPU, `verify:quiebro-gl`),
 * o `null` si falta alguna.
 */
export function cuentasDeLaTienda(tramoDelBajo: string): string[] | null {
  const bajo = soloCodigo(tramoDelBajo);
  const salida: string[] = [];
  for (const [, re] of CUENTAS_DE_LA_TIENDA) {
    const m = re.exec(bajo);
    if (m === null) return null;
    salida.push(m[0]);
  }
  return salida;
}

/**
 * EL JUEZ DE LA PARIDAD en Node: los literales de cada función gemela, en orden, iguales (ver `encendida`,
 * `queTienda` y `colorDeLaVentana` de `hash.ts`), `huecoQ` contra `HUECO_DEL_ESTILO` estilo a estilo y la tienda de
 * 6 m contra `LARGO_DE_UNA_TIENDA`. Devuelve lo que no casa y cuántos números comparó.
 */
export function paridadDeLasGemelas(t: TextosDeLaParidad): { readonly problemas: string[]; readonly comparados: number } {
  const problemas: string[] = [];
  let comparados = 0;
  const par = (nombre: string, js: string | null, glsl: string | null): [number[], number[]] | null => {
    if (js === null || glsl === null) {
      problemas.push(`${nombre}: no se encuentra ${js === null ? 'la función de hash.ts' : 'la del GLSL'}`);
      return null;
    }
    return [literales(js), literales(glsl)];
  };
  /* encendida ↔ encendidaQ */
  const enc = par('encendida', cuerpoDeLaFuncion(t.hashJs, /export\s+function\s+encendida\s*\(/), cuerpoDeLaFuncion(t.glslComun, /float\s+encendidaQ\s*\(/));
  if (enc !== null) {
    const [js, glsl] = enc;
    const esperado = [...js, ...LITERALES_DE_MAS_EN_ENCENDIDA];
    comparados += glsl.length;
    if (!mismosNumeros(glsl, esperado)) problemas.push(`encendida: el GLSL lleva ${JSON.stringify(glsl)} y hash.ts ${JSON.stringify(js)} (más la lotería ${JSON.stringify(LITERALES_DE_MAS_EN_ENCENDIDA)})`);
    if (js.length < 5) problemas.push(`encendida: sólo ${String(js.length)} literales en hash.ts: el filtro no mira`);
  }
  /* queTienda ↔ queTiendaQ */
  const tie = par('queTienda', cuerpoDeLaFuncion(t.hashJs, /export\s+function\s+queTienda\s*\(/), cuerpoDeLaFuncion(t.glslComun, /int\s+queTiendaQ\s*\(/));
  if (tie !== null) {
    const [js, glsl] = tie;
    comparados += glsl.length;
    if (!mismosNumeros(glsl, js)) problemas.push(`queTienda: el GLSL lleva ${JSON.stringify(glsl)} y hash.ts ${JSON.stringify(js)}`);
    if (js.length < 8) problemas.push(`queTienda: sólo ${String(js.length)} literales en hash.ts: el filtro no mira`);
  }
  /* colorDeLaVentana ↔ la semilla de la llamada + colorDeLuzQ */
  const col = par('colorDeLaVentana', cuerpoDeLaFuncion(t.hashJs, /export\s+function\s+colorDeLaVentana\s*\(/), cuerpoDeLaFuncion(t.glslComun, /vec3\s+colorDeLuzQ\s*\(/));
  if (col !== null) {
    const [js, glsl] = col;
    const semilla = semillaDelColor(t.tramoDelHueco);
    if (semilla === null) problemas.push('colorDeLaVentana: no se encuentra en el hueco la llamada `colorDeLuzQ(hashQ(vec2(celda, planta), semilla + N))`');
    else {
      const esperado = [semilla, ...glsl];
      comparados += esperado.length;
      if (!mismosNumeros(js, esperado)) problemas.push(`colorDeLaVentana: hash.ts lleva ${JSON.stringify(js)} y el GLSL ${JSON.stringify(esperado)} (la semilla de la llamada y colorDeLuzQ)`);
    }
    if (js.length < 10) problemas.push(`colorDeLaVentana: sólo ${String(js.length)} literales en hash.ts: el filtro no mira`);
  }
  /* huecoQ ↔ HUECO_DEL_ESTILO */
  const hueco = cuerpoDeLaFuncion(t.glslComun, /vec4\s+huecoQ\s*\(/);
  if (hueco === null) problemas.push('huecoQ: no se encuentra en el GLSL');
  else {
    t.huecoDelEstilo.forEach((js, estilo) => {
      const glsl = evaluarHuecoQ(hueco, estilo);
      comparados += js.length;
      if (glsl === null || !mismosNumeros(glsl, js)) problemas.push(`huecoQ(${String(estilo)}): el GLSL da ${JSON.stringify(glsl)} y HUECO_DEL_ESTILO ${JSON.stringify(js)}`);
    });
    if (t.huecoDelEstilo.length < 6) problemas.push(`huecoQ: sólo ${String(t.huecoDelEstilo.length)} estilos: el filtro no mira`);
  }
  /* La tienda de 6 m: las cuatro cuentas del reparto de la planta baja. */
  const bajo = soloCodigo(t.tramoDelBajo);
  for (const [nombre, re] of CUENTAS_DE_LA_TIENDA) {
    const m = re.exec(bajo);
    if (m === null) problemas.push(`la tienda de ${String(t.largoDeUnaTienda)} m: no se encuentra la cuenta de «${nombre}» en el bajo`);
    else {
      comparados++;
      if (Math.abs(Number(m[1]) - t.largoDeUnaTienda) > 1e-9) problemas.push(`la tienda: «${nombre}» usa ${String(m[1])} m y LARGO_DE_UNA_TIENDA es ${String(t.largoDeUnaTienda)}`);
    }
  }
  return { problemas, comparados };
}

/*
 * ─── LA TIENDA DE 6 M EN EL JS DEL JUEGO (revisión de la ola 1b) ───
 *
 * La paridad de arriba sólo mira que el GLSL lleve `LARGO_DE_UNA_TIENDA`; y la de la GPU comparaba con una COPIA de la
 * cuenta escrita en el banco. Las gemelas de verdad son `escaparatesDe` (`fachada/bajo.ts`, las tarjetas de reflejo de
 * los escaparates) y el reparto de los toldos de `voladizos.ts`: la primera se LLAMA, y la segunda (que no se deja
 * llamar: escribe toldos en un molde) tiene que llevar las mismas cuentas que la primera, texto a texto.
 */

/**
 * Las cuatro cuentas de la tienda del GLSL, evaluadas en JS con sus literales (las expresiones las fija
 * `CUENTAS_DE_LA_TIENDA`: sólo cambian los números): da `[nT, tienda, t0, t1]` para una cara de `ancho` y un punto `a`
 * de ella, o `null` si falta alguna cuenta.
 */
export function tiendaDelGlsl(tramoDelBajo: string): ((ancho: number, a: number) => readonly [number, number, number, number]) | null {
  const bajo = soloCodigo(tramoDelBajo);
  const l: number[] = [];
  for (const [, re] of CUENTAS_DE_LA_TIENDA) {
    const m = re.exec(bajo);
    if (m === null) return null;
    l.push(Number(m[1]));
  }
  const [l0 = 0, l1 = 0, l2 = 0, l3 = 0] = l;
  return (ancho, a) => {
    const nT = Math.max(1, Math.floor(ancho / l0));
    const tienda = Math.min(Math.floor(a / l1), nT - 1);
    const t0 = tienda * l2;
    const t1 = tienda >= nT - 1 ? ancho : t0 + l3;
    return [nT, tienda, t0, t1];
  };
}

/**
 * EL JUEZ DE LA TIENDA DEL JUEGO: en cada cara de la muestra (`ancho` en cuartos de metro y `semilla`), los escaparates
 * que pone el JS del juego (`escaparates`: los centros de `escaparatesDe`) son EXACTAMENTE los centros de las tiendas
 * del GLSL (recorridas en pasos de 0,25 m) que `enciende` enciende.
 */
export function juzgarLasTiendas(
  glsl: (ancho: number, a: number) => readonly number[],
  escaparates: (ancho: number, semilla: number) => readonly number[],
  enciende: (tienda: number, semilla: number) => boolean,
  muestras: readonly { readonly ancho: number; readonly semilla: number }[],
): { readonly problemas: string[]; readonly caras: number; readonly tiendas: number } {
  const problemas: string[] = [];
  let tiendas = 0;
  for (const { ancho, semilla } of muestras) {
    const vistas = new Map<number, number>();
    for (let a = 0; a < ancho; a += 0.25) {
      const [, tienda = -1, t0 = 0, t1 = 0] = glsl(ancho, a);
      if (!vistas.has(tienda)) vistas.set(tienda, (t0 + t1) / 2);
    }
    tiendas += vistas.size;
    const esperados = [...vistas].filter(([t]) => enciende(t, semilla)).map(([, c]) => c).sort((x, y) => x - y);
    const puestos = [...escaparates(ancho, semilla)].sort((x, y) => x - y);
    const casan = esperados.length === puestos.length && esperados.every((c, i) => Math.abs(c - (puestos[i] as number)) < 1e-6);
    if (!casan && problemas.length < 4) problemas.push(`cara de ${String(ancho)} m, semilla ${String(semilla)}: el GLSL enciende tiendas con centro en ${JSON.stringify(esperados)} y escaparatesDe pone ${JSON.stringify(puestos)}`);
  }
  return { problemas, caras: muestras.length, tiendas };
}

/**
 * Las tres cuentas del reparto de las tiendas (`const nT = …;`, `const t0 = …;` y `const t1 = …;`) dentro de la
 * función cuya cabecera casa con `funcion`, sin espacios; `null` si falta la función o alguna cuenta.
 */
export function repartoDeLasTiendasEnJs(fuente: string, funcion: RegExp): string[] | null {
  const cuerpo = cuerpoDeLaFuncion(soloCodigo(fuente), funcion);
  if (cuerpo === null) return null;
  const salida: string[] = [];
  for (const nombre of ['nT', 't0', 't1']) {
    const m = new RegExp(`\\bconst\\s+${nombre}\\s*=\\s*([^;]+);`).exec(cuerpo);
    if (m === null) return null;
    salida.push(`${nombre} = ${(m[1] as string).replace(/\s+/g, '')}`);
  }
  return salida;
}

/** ¿Reparten los toldos de `voladizos.ts` las tiendas con las mismas cuentas que `escaparatesDe` de `bajo.ts`? */
export function juzgarLosToldos(bajoJs: string, voladizosJs: string): string[] {
  const bajo = repartoDeLasTiendasEnJs(bajoJs, /export\s+function\s+escaparatesDe\s*\(/);
  const toldos = repartoDeLasTiendasEnJs(voladizosJs, /export\s+function\s*\*\s*voladizosDeLasCaras\s*\(/);
  if (bajo === null) return ['no se encuentran en escaparatesDe (bajo.ts) las cuentas nT, t0 y t1 del reparto de las tiendas'];
  if (toldos === null) return ['no se encuentran en voladizosDeLasCaras (voladizos.ts) las cuentas nT, t0 y t1 del reparto de las tiendas'];
  return bajo.flatMap((b, i) => (b === toldos[i] ? [] : [`los toldos reparten «${String(toldos[i])}» y los escaparates «${b}»`]));
}

/* ═══════════════════════════════ (4) LA GRAFÍA ES LO ÚLTIMO ═══════════════════════════════ */

/** La marca que va justo detrás del bloque de la Grafía (`fachada/glsl-cuerpo.ts`). */
export const MARCA_DEL_FIN_DE_LA_GRAFIA = '/* FIN-DE-LA-GRAFIA */';

/** Una escritura de `albedo` o de `emision` (asignación, compuesta o por componentes, o `++`/`--`). */
const ESCRIBE_EL_COLOR = /\b(?:albedo|emision)\b(?:\s*\.\s*[xyzwrgba]+|\s*\[[^\]]*\])?\s*(?:[-+*/]?=(?!=)|\+\+|--)|(?:\+\+|--)\s*\b(?:albedo|emision)\b/;

/**
 * EL JUEZ DE LA GRAFÍA sobre el texto final de un fragmento: hay UN bloque `if (uRejillaDeGlifos > …) { … }`, justo
 * detrás de él (sólo espacio en medio) va la marca `FIN-DE-LA-GRAFIA`, y de la marca al final nadie escribe `albedo`
 * ni `emision` (sin contar comentarios).
 */
export function juzgarLaGrafia(fragmento: string): string[] {
  const problemas: string[] = [];
  const bloques = [...fragmento.matchAll(/if\s*\(\s*uRejillaDeGlifos\s*>[^)]*\)\s*\{/g)];
  if (bloques.length !== 1) {
    problemas.push(`el texto lleva ${String(bloques.length)} bloques de uRejillaDeGlifos (tiene que ser uno)`);
    return problemas;
  }
  const b = bloques[0] as RegExpMatchArray;
  const abre = (b.index as number) + b[0].length - 1;
  let hondo = 0;
  let cierra = -1;
  for (let i = abre; i < fragmento.length; i++) {
    if (fragmento[i] === '{') hondo++;
    else if (fragmento[i] === '}') {
      hondo--;
      if (hondo === 0) {
        cierra = i;
        break;
      }
    }
  }
  if (cierra < 0) {
    problemas.push('el bloque de uRejillaDeGlifos no se cierra');
    return problemas;
  }
  const marcas = fragmento.split(MARCA_DEL_FIN_DE_LA_GRAFIA).length - 1;
  if (marcas !== 1) problemas.push(`el texto lleva ${String(marcas)} marcas ${MARCA_DEL_FIN_DE_LA_GRAFIA} (tiene que ser una)`);
  const detras = fragmento.slice(cierra + 1);
  if (!detras.trimStart().startsWith(MARCA_DEL_FIN_DE_LA_GRAFIA)) problemas.push(`detrás del bloque de uRejillaDeGlifos no va la marca, sino «${detras.trimStart().slice(0, 60)}…»`);
  const desdeLaMarca = fragmento.indexOf(MARCA_DEL_FIN_DE_LA_GRAFIA);
  if (desdeLaMarca >= 0) {
    const resto = soloCodigo(fragmento.slice(desdeLaMarca + MARCA_DEL_FIN_DE_LA_GRAFIA.length));
    const linea = resto.split('\n').find((l) => ESCRIBE_EL_COLOR.test(l));
    if (linea !== undefined) problemas.push(`detrás de la Grafía se escribe el color: «${linea.trim()}»`);
  }
  return problemas;
}

/* ═══════════════════════════════ (5) LA MEMORIA ═══════════════════════════════ */

/** Los bytes de JS de una celda construida (lo que guarda la ventana: sus cinco familias volcadas). */
export function bytesDeLaCelda(c: CeldaConstruida): number {
  let b = 0;
  for (const f of FAMILIAS) {
    const g = c.familias[f];
    for (const [, d] of g.datos) b += d.byteLength;
    b += g.indices.byteLength;
  }
  return b;
}

/**
 * Los bytes de JS de los moldes de una obra: todas las listas tipadas que cuelgan de cada molde (y de sus mapas y
 * listas de atributos), sin mirar cómo se llaman: las reserva el molde al crecer, y crecen al doble.
 */
export function bytesDeLosMoldes(m: Readonly<Record<Familia, Molde>>): number {
  const vistos = new Set<ArrayBufferLike>();
  let b = 0;
  const sumar = (v: unknown, hondo: number): void => {
    if (ArrayBuffer.isView(v)) {
      if (!vistos.has(v.buffer)) {
        vistos.add(v.buffer);
        b += v.buffer.byteLength;
      }
      return;
    }
    if (hondo <= 0 || v === null || typeof v !== 'object') return;
    if (v instanceof Map) for (const x of v.values()) sumar(x, hondo - 1);
    else if (Array.isArray(v)) for (const x of v) sumar(x, hondo - 1);
    else for (const x of Object.values(v as Record<string, unknown>)) sumar(x, hondo - 1);
  };
  for (const f of FAMILIAS) for (const v of Object.values(m[f] as unknown as Record<string, unknown>)) sumar(v, 2);
  return b;
}

/** Lo que una ciudad abierta lleva en la GPU (ver §7.3 del plan). */
export interface BytesEnLaGpu {
  /** Las geometrías de lo que pinta (la ventana con sus dos mitades, lo lejano, el suelo, el borde, las capas, lo instanciado). */
  readonly geometrias: number;
  /** Las texturas que se suben con ella (los mapas de su base, el atlas de sus rótulos, las de sus capas). */
  readonly texturas: number;
  /** Su luz por losetas (las dos texturas). */
  readonly luz: number;
  /** La textura de ruido de la materia, si algún material suyo la lleva. */
  readonly materia: number;
  readonly total: number;
}

/** LOS BYTES DE LA GPU de una ciudad: el libro de bytes de `verify:quiebro-ciudad` y del banco de `verify:quiebro-gl`. */
export function bytesEnLaGpu(c: CiudadAbiertaConstruida): BytesEnLaGpu {
  let geometrias = 0;
  let texturas = 0;
  for (const p of piezasPorSubir(c)) {
    if ('textura' in p) texturas += p.bytes;
    else geometrias += p.bytes;
  }
  const luz = c.conLuz ? c.luz.bytesEnLaGpu : 0;
  let materia = 0;
  for (const [t] of texturasDeLosMateriales(c.grupo)) {
    if ((t.userData as { materiaQ?: unknown }).materiaQ === MARCA_DE_LA_MATERIA) {
      materia = bytesDelRuido();
      break;
    }
  }
  return { geometrias, texturas, luz, materia, total: geometrias + texturas + luz + materia };
}

/* ═══════════════════════════════ (6) EL RELEVO ═══════════════════════════════ */

/** Las texturas que referencian los materiales que cuelgan de un objeto (en sus uniformes, con sus retoques, y en sus mapas). */
export function texturasDeLosMateriales(objeto: THREE.Object3D): Map<THREE.Texture, string> {
  const salida = new Map<THREE.Texture, string>();
  const vistos = new Set<THREE.Material>();
  objeto.traverse((o) => {
    for (const m of materialesDe(o)) {
      if (vistos.has(m)) continue;
      vistos.add(m);
      const s = sombreadorParcheado(m);
      const uniformes: Record<string, THREE.IUniform> = { ...(m instanceof THREE.ShaderMaterial ? m.uniforms : {}), ...(s?.uniformes ?? {}) };
      for (const [nombre, u] of Object.entries(uniformes)) {
        const v = (u as { value?: unknown } | undefined)?.value;
        const lista = Array.isArray(v) ? v : [v];
        for (const x of lista) if ((x as THREE.Texture | undefined)?.isTexture === true && !salida.has(x as THREE.Texture)) salida.set(x as THREE.Texture, `${m.name || m.type}.${nombre}`);
      }
      for (const [nombre, v] of Object.entries(m)) {
        if ((v as THREE.Texture | undefined)?.isTexture === true && !salida.has(v as THREE.Texture)) salida.set(v as THREE.Texture, `${m.name || m.type}.${nombre}`);
      }
    }
  });
  return salida;
}

/**
 * LOS ALMACENES YA SUBIDOS: texturas que un material de la ciudad referencia sin ser de la ciudad que se releva, y
 * que ya están en la GPU cuando llega una ciudad nueva. Cada una con su porqué:
 *   · la luz por losetas de la ciudad: la sube su propio subidor, fila a fila (`losetas.ts`);
 *   · el atlas de la Grafía (`atlasDeLaGrafia`): uno por página, lo usan los efectos y el borde desde la primera;
 *   · la textura de ruido de la materia (marcada con `MARCA_DE_LA_MATERIA`): una por página, desde la primera.
 */
export function almacenDe(t: THREE.Texture, c: CiudadAbiertaConstruida): string | null {
  if (c.conLuz) {
    const deLaLuz = (c.luz as unknown as { texturas?: readonly THREE.Texture[] }).texturas ?? [c.luz.textura_];
    if (deLaLuz.includes(t) || t === c.luz.textura_) return 'la luz por losetas';
  }
  if (t === atlasDeLaGrafia()) return 'el atlas de la Grafía';
  if ((t.userData as { materiaQ?: unknown }).materiaQ === MARCA_DE_LA_MATERIA) return 'el ruido de la materia';
  return null;
}

/**
 * EL JUEZ DEL RELEVO: toda textura que referencia un material de la ciudad está en `piezasPorSubir` (el relevo la
 * sube antes de enseñarla) o es de un almacén ya subido (`almacenDe`). Si no, la ciudad nueva se enseñaría con una
 * textura sin subir: three la subiría ENTERA en el fotograma del relevo.
 */
export function juzgarElRelevo(c: CiudadAbiertaConstruida): { readonly problemas: string[]; readonly texturas: number; readonly deAlmacen: string[] } {
  const subidas = new Set<THREE.Texture>();
  for (const p of piezasPorSubir(c)) if ('textura' in p) subidas.add(p.textura);
  const problemas: string[] = [];
  const deAlmacen: string[] = [];
  const texturas = texturasDeLosMateriales(c.grupo);
  for (const [t, quien] of texturas) {
    if (subidas.has(t)) continue;
    const almacen = almacenDe(t, c);
    if (almacen !== null) deAlmacen.push(`${quien} (${almacen})`);
    else problemas.push(`${quien}: la textura «${t.name}» no está en piezasPorSubir ni es de un almacén ya subido`);
  }
  return { problemas, texturas: texturas.size, deAlmacen };
}

/* ═══════════════════════════════ (11) LAS FUENTES NO DEPENDEN DEL GRADO ═══════════════════════════════ */

type Punto = { readonly x: number; readonly y: number; readonly z: number };

/** Lo que tiene que casar además del sitio, por clase de fuente. */
function firma(clase: keyof FuentesDeLuz, f: Punto): string {
  const r = (v: number): string => v.toFixed(5);
  const c = (v: readonly number[] | null | undefined): string => (v === null || v === undefined ? '-' : v.map(r).join(','));
  const x = f as unknown as Record<string, unknown>;
  if (clase === 'horneadas') return `${r(x['intensidad'] as number)}|${c(x['color'] as number[] | null)}|${r(x['alcance'] as number)}|${c(x['haciaFuera'] as number[] | undefined)}`;
  if (clase === 'reflejos') return `${r(x['tamano'] as number)}|${c(x['color'] as number[])}|${String(x['farola'])}`;
  if (clase === 'halos') return `${r(x['radio'] as number)}|${c(x['color'] as number[])}|${String(x['farola'])}|${r(x['parpadeo'] as number)}`;
  return '';
}

/**
 * EL JUEZ DE LAS FUENTES: las de `a` y las de `b`, clase a clase (horneadas, reflejos, halos, cabezas), son las
 * mismas: cada una casa con una de la otra lista a `tolerancia` metros como mucho y con lo demás igual.
 */
export function diferenciasDeLasFuentes(a: FuentesDeLuz, b: FuentesDeLuz, tolerancia = 0.01): string[] {
  const problemas: string[] = [];
  for (const clase of ['horneadas', 'reflejos', 'halos', 'cabezas'] as const) {
    const la = a[clase] as readonly Punto[];
    const lb = b[clase] as readonly Punto[];
    if (la.length !== lb.length) {
      problemas.push(`${clase}: ${String(la.length)} contra ${String(lb.length)}`);
      continue;
    }
    const cajas = new Map<string, number[]>();
    const clave = (p: Punto): string => `${String(Math.floor(p.x))},${String(Math.floor(p.z))}`;
    lb.forEach((p, i) => {
      const k = clave(p);
      const l = cajas.get(k);
      if (l === undefined) cajas.set(k, [i]);
      else l.push(i);
    });
    const usadas = new Set<number>();
    for (const p of la) {
      let hallada = -1;
      for (let dx = -1; dx <= 1 && hallada < 0; dx++) {
        for (let dz = -1; dz <= 1 && hallada < 0; dz++) {
          for (const i of cajas.get(`${String(Math.floor(p.x) + dx)},${String(Math.floor(p.z) + dz)}`) ?? []) {
            if (usadas.has(i)) continue;
            const q = lb[i] as Punto;
            if (Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) <= tolerancia && firma(clase, p) === firma(clase, q)) {
              hallada = i;
              break;
            }
          }
        }
      }
      if (hallada < 0) {
        problemas.push(`${clase}: la de (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) no tiene pareja a ${String(tolerancia * 100)} cm`);
        break;
      }
      usadas.add(hallada);
    }
  }
  return problemas;
}

/* ═══════════════════════════════ (12) LOS TROZOS POR PIEZA Y GRADO ═══════════════════════════════ */

/**
 * El trozo de la ventana de cada nivel (`PRESUPUESTO_DE_LA_VENTANA`, 600 en N0 y 1.000 en N1-N3): lo más que se escribe
 * entre dos pasos, sumando familias, porque la ventana sólo empieza un trozo si le cabe entero.
 */
export const TROZO_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, number>> = {
  0: PRESUPUESTO_DE_LA_VENTANA[0].trozo,
  1: PRESUPUESTO_DE_LA_VENTANA[1].trozo,
  2: PRESUPUESTO_DE_LA_VENTANA[2].trozo,
  3: PRESUPUESTO_DE_LA_VENTANA[3].trozo,
};

/**
 * UNA CELDA CONSTRUIDA A PASOS con `construirLaCelda` (la de la ventana): el paso mayor y la COLA, lo escrito
 * después del último paso (lo que la ventana escribe en el mismo trozo que lo primero de la celda siguiente).
 */
export function pasosDeLaCelda(
  parte: ParteDeLaCelda,
  partes: PartesDeLaCiudad,
  nivel: NivelDeLaCiudad,
  grado: GradoDeLaCelda,
  relieve: boolean,
): { readonly celda: CeldaConstruida; readonly mayor: number; readonly cola: number; readonly pasos: number } {
  const g = construirLaCelda(parte, partes, nivel, true, grado, relieve);
  let suma = 0;
  let mayor = 0;
  let pasos = 0;
  for (;;) {
    const r = g.next();
    if (r.done === true) {
      const cola = r.value.triangulos - suma;
      return { celda: r.value, mayor: Math.max(mayor, cola), cola, pasos };
    }
    pasos++;
    suma += r.value;
    if (r.value > mayor) mayor = r.value;
  }
}

/**
 * UNA OBRA A PASOS con los escritores que se den (por omisión, los de la celda): para NOMBRAR al escritor que se pasa
 * del trozo, para medir sus moldes, y para las vacunas (un escritor de prueba añadido). Cada paso se apunta al
 * escritor que cede; lo que uno escribe después de su último paso se le apunta a él como cola.
 */
export function obraAPasos(
  parte: ParteDeLaCelda,
  partes: PartesDeLaCiudad,
  nivel: NivelDeLaCiudad,
  grado: GradoDeLaCelda,
  relieve: boolean,
  escritores: readonly { readonly nombre: string; readonly escribir: EscritorDeLaCelda }[] = ESCRITORES_DE_LA_CELDA,
): { readonly obra: ObraDeLaCelda; readonly mayor: number; readonly deQuien: string; readonly moldes: number; volcar(): Record<Familia, GeometriaVolcada>; fuentes(): FuentesDeLuz } {
  const obra = obraNueva({ nivel, grado, relieveDeHoy: relieve, ciudad: partes, m: moldesDeLaObra(true) });
  const total = (): number => FAMILIAS.reduce((s, f) => s + obra.m[f].triangulos, 0);
  let antes = 0;
  let mayor = 0;
  let deQuien = '';
  for (const e of escritores) {
    const g = e.escribir(obra, parte);
    for (;;) {
      const r = g.next();
      const d = total() - antes;
      if (r.done === true) {
        if (d > mayor) {
          mayor = d;
          deQuien = `${e.nombre} (después de su último paso)`;
        }
        break;
      }
      if (d > mayor) {
        mayor = d;
        deQuien = e.nombre;
      }
      antes = total();
    }
    antes = total();
  }
  return {
    obra,
    mayor,
    deQuien,
    moldes: bytesDeLosMoldes(obra.m),
    volcar: () => ({
      fachadas: obra.m.fachadas.volcar(),
      mobiliario: obra.m.mobiliario.volcar(),
      emisivo: obra.m.emisivo.volcar(),
      cristal: obra.m.cristal.volcar(),
      neones: obra.m.neones.volcar(),
    }),
    fuentes: () => repartirLasLuces(obra.luces, obra.rotulos, obra.cochesEncendidos, obra.ventanas, Math.ceil(obra.detalle.reflejosDeVentanas / 9)),
  };
}

/* ═══════════════════════════════ (13) LAS CAPAS CUENTAN ═══════════════════════════════ */

/** Cuántas llamadas pinta un objeto: una por malla, puntos o línea que cuelgue de él (visible o no). */
export function mallasDe(objeto: THREE.Object3D): number {
  let n = 0;
  objeto.traverse((o) => {
    if ((o as THREE.Mesh).isMesh === true || (o as THREE.Points).isPoints === true || (o as THREE.Line).isLine === true) n++;
  });
  return n;
}

/**
 * EL JUEZ DE LAS LLAMADAS: cada capa pinta las llamadas que declaran sus renglones (ni una malla sin renglón, ni un
 * renglón sin malla), y la ciudad entera pinta lo que suman sus piezas. Así «las capas que aún no pintan nada no
 * añaden llamadas» mira algo: una capa que cuelga una malla sin declararla sale aquí.
 */
export function juzgarLasLlamadas(c: CiudadAbiertaConstruida): { readonly problemas: string[]; readonly capas: number; readonly llamadas: number } {
  const problemas: string[] = [];
  for (const capa of c.capas) {
    const pinta = mallasDe(capa.objeto);
    const declara = capa.renglones().reduce((s, r) => s + r.llamadas, 0);
    if (pinta !== declara) problemas.push(`la capa «${capa.nombre}» cuelga ${String(pinta)} mallas y declara ${String(declara)} llamadas`);
  }
  const pinta = mallasDe(c.grupo);
  const declara = c.piezas().reduce((s, p) => s + p.llamadas, 0);
  if (pinta !== declara) problemas.push(`la ciudad cuelga ${String(pinta)} mallas y sus piezas declaran ${String(declara)} llamadas`);
  return { problemas, capas: c.capas.length, llamadas: pinta };
}
