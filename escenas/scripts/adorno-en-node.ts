/**
 * LOS TRES MUNDOS QUE SE ANDAN, CON SU ADORNO QUE CHOCA, MONTADOS EN NODE.
 *
 * Lo usa `verify:paseo` para medir el adorno que choca (`escenas/paseo/adorno-que-choca.ts`) sobre los
 * mundos de verdad y no sobre cajas de prueba: el Burgo de una mesa, un delta de diecinueve comarcas
 * y un valle de Las Lindes con todas sus losas, cada uno con su adorno medido en su `.glb` con el
 * `GLTFLoader` de three —sin texturas, que en Node no se pueden abrir y no cuentan para nada de esto—.
 * Sin efectos al cargarse: sólo funciones.
 *
 * ═══ DE DÓNDE SALE CADA ADORNO, Y DÓNDE NO ES EL DE LA ESCENA ═══
 *
 *   · EL BURGO: `ciudadDelCodigo` —la misma ciudad que pinta la escena, en su calidad más llena— y
 *     `adornoQueChocaDelBurgo` con `sueloDelBurgo`, lo mismo que monta `Burgo.tsx`.
 *   · LAS LINDES: `adornoQueChocaDeLasLindes` con lo menudo pintado, lo mismo que monta `Lindes.tsx`.
 *   · RIBERAS: el plan de `delta.tsx` vive dentro del componente y no se puede llamar desde Node, así
 *     que aquí se siembra la TIERRA como la siembra él —`esTierraDeSiembra`, la poda del caserío y
 *     `queVaEn` con su tercer argumento, igual que `verify:escena`— sin saltarse los caminos, que aquí
 *     no hay red. Es MÁS adorno que el de la escena, nunca menos: si aquí nadie se queda encerrado, en
 *     la escena tampoco. Lo del agua —rocas y botes en lo hondo, barcos, muelles, juncos— no se siembra:
 *     lo hondo no se pisa, y lo demás no choca (`noChocaEnElDelta`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF, GLTFLoaderPlugin } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mundoDelBurgo } from '../../shared/arcade/juegos/burgo-mundo';
import { mundoDeLasLindes } from '../../shared/arcade/juegos/lindes-mundo';
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';
import { LAS_LOSAS } from '../../shared/arcade/juegos/lindes-losas';
import { mundoDeRiberas } from '../../shared/arcade/juegos/riberas-mundo';
import { deNumero } from '../../shared/mecanicas/fijo';
import { mallaDeRadio, verticesDe } from '../../shared/mecanicas/malla-hexagonal';
import { sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { RADIO_DEL_PASEANTE } from '../../shared/mecanicas/andar';
import { sueloDelBurgo } from '../burgo/a-pie';
import { ciudadDelCodigo } from '../burgo/ciudad';
import type { LaCiudad } from '../burgo/ciudad';
import { adornoQueChocaDelBurgo } from '../burgo/estorbos-del-burgo';
import { alturaAPie, sueloPintadoDe } from '../delta-a-pie';
import { ESCALA_DEL_PACK } from '../escala';
import { adornoQueChocaDelDelta } from '../estorbos-del-delta';
import type { CopiaDelAdorno } from '../estorbos-del-delta';
import { cajaDelModelo, catalogoDe, ejeDelLargo } from '../lindes/catalogo';
import { adornoQueChocaDeLasLindes, rodajasQueChocanDelCatalogo } from '../lindes/adorno-de-las-lindes';
import type { LosaDelAdorno } from '../lindes/adorno-de-las-lindes';
import { catalogoDeModelos } from '../modelos';
import type { CatalogoDeModelos } from '../modelos';
import { ALTO_DE_UNA_RODAJA_QUE_CHOCA, TOPE_DE_RODAJAS_QUE_CHOCAN } from '../paseo/adorno-que-choca';
import type { Estorbo } from '../paseo/estorbos';
import { rodajasDelCatalogo } from '../paseo/rodajas-del-catalogo';
import { esTierraDeSiembra, podaDelCaserio, queVaEn } from '../poblar';
import { crearRelieve } from '../relieve';
import type { Relieve } from '../relieve';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

/** Un `.glb` de `escenas/modelos/`, abierto con el `GLTFLoader` de three y sin texturas. */
export async function abrirSinTexturas(nombre: string): Promise<GLTF> {
  const crudo = fs.readFileSync(path.join(AQUI, '..', 'modelos', nombre));
  const bytes = crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.byteLength) as ArrayBuffer;
  const cargador = new GLTFLoader();
  const sinTexturas = (): GLTFLoaderPlugin =>
    ({ name: 'sin-texturas', loadTexture: () => Promise.resolve(new THREE.Texture()) }) as unknown as GLTFLoaderPlugin;
  cargador.register(sinTexturas);
  return new Promise((resolver, rechazar) => {
    cargador.parse(bytes, '', resolver, (f) => rechazar(f instanceof Error ? f : new Error(String(f))));
  });
}

/** Un mundo que se anda, con su adorno que choca. */
export interface MundoConAdorno {
  readonly mundo: MundoDeclarado;
  readonly adorno: readonly Cuerpo[];
}

/* ─── El Burgo ───────────────────────────────────────────────────────────── */

export interface BurgoConAdorno extends MundoConAdorno {
  readonly ciudad: LaCiudad;
  readonly rodajasDe: (pieza: string) => readonly Estorbo[] | null;
  readonly suelo: (x: number, z: number) => number;
}

/** El catálogo de `burgo.glb`, una vez. */
let catalogoDelBurgo: Promise<CatalogoDeModelos> | null = null;
export function elCatalogoDelBurgo(): Promise<CatalogoDeModelos> {
  catalogoDelBurgo ??= abrirSinTexturas('burgo.glb').then((g) => catalogoDeModelos(g.scene));
  return catalogoDelBurgo;
}

/** EL BURGO DE UNA MESA, con el adorno que monta `Burgo.tsx`. */
export async function burgoConAdorno(codigo: string): Promise<BurgoConAdorno> {
  const catalogo = await elCatalogoDelBurgo();
  const ciudad = ciudadDelCodigo(codigo);
  const rodajasDe = rodajasDelCatalogo(catalogo, ALTO_DE_UNA_RODAJA_QUE_CHOCA, TOPE_DE_RODAJAS_QUE_CHOCAN);
  const suelo = sueloDelBurgo(ciudad);
  return { mundo: mundoDelBurgo(codigo), adorno: adornoQueChocaDelBurgo(ciudad, rodajasDe, suelo), ciudad, rodajasDe, suelo };
}

/* ─── Riberas ────────────────────────────────────────────────────────────── */

/** El catálogo de `tablero.glb`, una vez: Riberas y Las Lindes pintan de él. */
let catalogoDelTablero: Promise<{ modelos: CatalogoDeModelos; gltf: GLTF }> | null = null;
export function elCatalogoDelTablero(): Promise<{ modelos: CatalogoDeModelos; gltf: GLTF }> {
  catalogoDelTablero ??= abrirSinTexturas('tablero.glb').then((gltf) => ({ modelos: catalogoDeModelos(gltf.scene), gltf }));
  return catalogoDelTablero;
}

const TERRENOS_DE_RIBERAS = ['carrizal', 'marisma', 'salina', 'vega', 'cantil', 'duna'];

export interface DeltaConAdorno extends MundoConAdorno {
  readonly relieve: Relieve;
}

/**
 * UN DELTA DE DIECINUEVE COMARCAS CON TRES COLONOS, y la tierra sembrada como la siembra `delta.tsx`
 * (ver la cabecera: más adorno que la escena, nunca menos).
 */
export async function deltaConAdorno(semilla: number): Promise<DeltaConAdorno> {
  const { modelos } = await elCatalogoDelTablero();
  const hexes = mallaDeRadio(2);
  const islas = hexes.map((hex, i) => ({
    hex,
    terreno: TERRENOS_DE_RIBERAS[(i + semilla) % TERRENOS_DE_RIBERAS.length] as string,
    cifra: i === 0 ? null : 2 + ((i + semilla) % 11),
  }));
  const vertices = verticesDe(hexes);
  const vertice = (i: number): string => vertices[(i + semilla * 5) % vertices.length] as string;
  const vista = {
    desde: 'riberas',
    momento: 'jugando',
    islas,
    colonos: [
      { asiento: 'A', chozas: [vertice(0), vertice(20)], torres: [vertice(33)] },
      { asiento: 'B', chozas: [vertice(7)], torres: [] },
      { asiento: 'C', chozas: [], torres: [] },
    ],
    estiaje: '1,-1',
  };
  const relieve = crearRelieve(
    islas.map((i) => ({ hex: i.hex, terreno: i.terreno })),
    semilla,
  );
  const cosas = new Map<string, CopiaDelAdorno[]>();
  for (const isla of islas) {
    const teselas = relieve.subteselasDe(isla.hex).filter((t) => esTierraDeSiembra(t));
    const podadas = podaDelCaserio(teselas, isla.terreno);
    for (const t of teselas) {
      for (const p of queVaEn(t, isla.terreno, podadas.has(t))) {
        const copia: CopiaDelAdorno = {
          posicion: { x: t.centro.x + p.donde.x, y: t.altura, z: t.centro.y + p.donde.y },
          giro: p.giro,
          escala: { x: ESCALA_DEL_PACK * p.talla },
        };
        const llave = `${String(isla.hex.q)},${String(isla.hex.r)}|${p.modelo}`;
        const lista = cosas.get(llave);
        if (lista === undefined) cosas.set(llave, [copia]);
        else lista.push(copia);
      }
    }
  }
  const suelo = sueloPintadoDe(relieve);
  const rodajasDe = rodajasDelCatalogo(modelos, ALTO_DE_UNA_RODAJA_QUE_CHOCA / ESCALA_DEL_PACK, TOPE_DE_RODAJAS_QUE_CHOCAN);
  const adorno = adornoQueChocaDelDelta(cosas, [], rodajasDe, (x, z) => alturaAPie(suelo, x, z));
  return { mundo: mundoDeRiberas(vista), adorno, relieve };
}

/* ─── Las Lindes ─────────────────────────────────────────────────────────── */

/**
 * UN VALLE CON TODAS LAS LOSAS DEL MAZO EN SUS CUATRO GIROS, en un cuadrado: no es una partida —los
 * bordes no casan—, pero cada losa lleva su reparto de verdad, y lo menudo de todas está.
 */
export async function lindesConAdorno(semilla: number): Promise<MundoConAdorno & { readonly losas: readonly LosaDelAdorno[] }> {
  const { gltf } = await elCatalogoDelTablero();
  const catalogo = catalogoDe(gltf.scene);
  const losas: LosaDelAdorno[] = [];
  const todas = LAS_LOSAS.flatMap((l) => ([0, 1, 2, 3] as Giro[]).map((giro) => ({ losa: l.id, giro })));
  const lado = Math.ceil(Math.sqrt(todas.length));
  todas.forEach((l, i) => losas.push({ x: i % lado, y: Math.floor(i / lado), losa: l.losa, giro: l.giro }));
  const adorno = adornoQueChocaDeLasLindes(
    losas,
    semilla,
    rodajasQueChocanDelCatalogo(catalogo.partes),
    (pieza) => ejeDelLargo(cajaDelModelo(catalogo, pieza)),
    true,
  );
  return { mundo: mundoDeLasLindes(losas, semilla), adorno, losas };
}

/* ─── Los bolsillos: lo que el adorno deja aparte ────────────────────────── */

/** Un trozo de suelo libre que el adorno ha dejado aparte del resto de su zona. */
export interface Bolsillo {
  /** Cuántas celdas de la rejilla tiene. */
  readonly celdas: number;
  /** Su superficie, en unidades cuadradas. */
  readonly area: number;
  /** Una de sus celdas, en unidades del mundo. */
  readonly x: number;
  readonly z: number;
}

export interface BolsillosDelMundo {
  /** El lado de la celda de la rejilla, en unidades. */
  readonly lado: number;
  /** Celdas donde se puede estar con la estructura sola, y con estructura y adorno. */
  readonly libresSinAdorno: number;
  readonly libresConAdorno: number;
  /** Lo que el adorno deja aparte: trozos libres que no son el mayor de su zona de la estructura. */
  readonly bolsillos: readonly Bolsillo[];
  /** ¿En qué bolsillo cae un punto (unidades del mundo)? `null` si en ninguno. */
  readonly bolsilloDe: (x: number, z: number) => Bolsillo | null;
  /**
   * ¿Se llega andando a menos de `alcance` de este punto desde lo principal de su zona? Es lo que pide
   * un brote de hallazgo: que alguien pueda ponerse a `RADIO_DE_RECOGER` de él.
   */
  readonly seLlegaCerca: (x: number, z: number, alcance: number) => boolean;
}

/**
 * LOS BOLSILLOS QUE EL ADORNO DEJA APARTE, en una rejilla de `lado` unidades.
 *
 * Se marca cada celda donde se puede estar —con la estructura sola y con estructura y adorno—, se
 * juntan por vecinas de lado, y en cada zona de la estructura el trozo MAYOR con adorno es por donde
 * se anda; los demás trozos de esa zona son bolsillos: sitios donde se puede estar y de los que no se
 * sale al resto sin atravesar adorno. Una celda de 0,25 es menos que el radio de quien anda, así que
 * un paso que existe no se pierde por la rejilla —puede aparecer algún bolsillo de más, nunca de
 * menos—.
 */
export function medirBolsillos(arena: Arena, estructura: Arena, lado = 0.25): BolsillosDelMundo {
  const ladoCasilla = estructura.lado / 65536;
  const x0 = (estructura.desdeX - 0.5) * ladoCasilla;
  const x1 = (estructura.desdeX + estructura.anchura - 0.5) * ladoCasilla;
  /* La casilla `y` crece hacia la `z` negativa. */
  const z0 = -(estructura.desdeY + estructura.fondo - 0.5) * ladoCasilla;
  const z1 = -(estructura.desdeY - 0.5) * ladoCasilla;
  const ancho = Math.ceil((x1 - x0) / lado);
  const fondo = Math.ceil((z1 - z0) / lado);
  const n = ancho * fondo;
  const libreS = new Uint8Array(n);
  const libreA = new Uint8Array(n);
  for (let j = 0; j < fondo; j++) {
    const z = deNumero(z0 + (j + 0.5) * lado);
    for (let i = 0; i < ancho; i++) {
      const x = deNumero(x0 + (i + 0.5) * lado);
      if (!sePuedeEstar(estructura, x, z, RADIO_DEL_PASEANTE)) continue;
      libreS[j * ancho + i] = 1;
      if (sePuedeEstar(arena, x, z, RADIO_DEL_PASEANTE)) libreA[j * ancho + i] = 1;
    }
  }
  const etiquetas = (libre: Uint8Array): { etiqueta: Int32Array; tamanos: number[] } => {
    const etiqueta = new Int32Array(n).fill(-1);
    const tamanos: number[] = [];
    const cola = new Int32Array(n);
    for (let s = 0; s < n; s++) {
      if (libre[s] !== 1 || (etiqueta[s] as number) >= 0) continue;
      const e = tamanos.length;
      let cabeza = 0;
      let cuenta = 0;
      cola[cuenta++] = s;
      etiqueta[s] = e;
      while (cabeza < cuenta) {
        const c = cola[cabeza++] as number;
        const ci = c % ancho;
        const vecinas = [ci > 0 ? c - 1 : -1, ci < ancho - 1 ? c + 1 : -1, c - ancho, c + ancho];
        for (const v of vecinas) {
          if (v < 0 || v >= n || libre[v] !== 1 || (etiqueta[v] as number) >= 0) continue;
          etiqueta[v] = e;
          cola[cuenta++] = v;
        }
      }
      tamanos.push(cuenta);
    }
    return { etiqueta, tamanos };
  };
  const s = etiquetas(libreS);
  const a = etiquetas(libreA);
  /* De cada zona de la estructura, su trozo mayor con adorno. */
  const mayorDeLaZona = new Map<number, number>();
  const zonaDelTrozo = new Map<number, number>();
  const unaCelda = new Map<number, number>();
  for (let c = 0; c < n; c++) {
    const t = a.etiqueta[c] as number;
    if (t < 0 || zonaDelTrozo.has(t)) continue;
    const zona = s.etiqueta[c] as number;
    zonaDelTrozo.set(t, zona);
    unaCelda.set(t, c);
    const antes = mayorDeLaZona.get(zona);
    if (antes === undefined || (a.tamanos[t] as number) > (a.tamanos[antes] as number)) mayorDeLaZona.set(zona, t);
  }
  const porTrozo = new Map<number, Bolsillo>();
  for (const [t, zona] of zonaDelTrozo) {
    if (mayorDeLaZona.get(zona) === t) continue;
    const c = unaCelda.get(t) as number;
    const celdas = a.tamanos[t] as number;
    porTrozo.set(t, { celdas, area: celdas * lado * lado, x: x0 + ((c % ancho) + 0.5) * lado, z: z0 + (Math.floor(c / ancho) + 0.5) * lado });
  }
  const bolsilloDe = (x: number, z: number): Bolsillo | null => {
    const i = Math.floor((x - x0) / lado);
    const j = Math.floor((z - z0) / lado);
    if (i < 0 || j < 0 || i >= ancho || j >= fondo) return null;
    return porTrozo.get(a.etiqueta[j * ancho + i] as number) ?? null;
  };
  let libresS = 0;
  let libresA = 0;
  for (let c = 0; c < n; c++) {
    libresS += libreS[c] as number;
    libresA += libreA[c] as number;
  }
  const seLlegaCerca = (x: number, z: number, alcance: number): boolean => {
    const r = Math.floor(alcance / lado);
    const ci = Math.floor((x - x0) / lado);
    const cj = Math.floor((z - z0) / lado);
    for (let j = cj - r; j <= cj + r; j++) {
      for (let i = ci - r; i <= ci + r; i++) {
        if (i < 0 || j < 0 || i >= ancho || j >= fondo) continue;
        const cx = x0 + (i + 0.5) * lado;
        const cz = z0 + (j + 0.5) * lado;
        if (Math.hypot(cx - x, cz - z) > alcance) continue;
        const t = a.etiqueta[j * ancho + i] as number;
        if (t >= 0 && !porTrozo.has(t)) return true;
      }
    }
    return false;
  };
  return {
    lado,
    libresSinAdorno: libresS,
    libresConAdorno: libresA,
    bolsillos: [...porTrozo.values()].sort((p, q) => q.celdas - p.celdas),
    bolsilloDe,
    seLlegaCerca,
  };
}
