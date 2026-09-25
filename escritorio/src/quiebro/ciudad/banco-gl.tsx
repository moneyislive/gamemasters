/**
 * EL BANCO DE `verify:quiebro-gl` (plan del detalle de la ciudad, O1-VERIFICACION 3, 9 y 10): la ciudad abierta en
 * la GPU de verdad, sin juego alrededor. Lo abre el comprobador en Edge sin ventana (`--dump-dom`) y lee el JSON que
 * deja en `#resultado-gl`; a mano se abre en `/sala/banco-quiebro-gl.html` y enseña lo mismo en texto.
 *
 * ═══ QUÉ HACE, EN ORDEN ═══
 *
 *   1. DICE DE QUÉ ÁRBOL SALE: `#banco-gl-arbol` lleva en `data-arbol` la carpeta del worktree que sirve este Vite
 *      (`__ARBOL_DEL_QUIEBRO__`, ver `vite.config.ts`). Un comprobador con el puerto de otro árbol mediría el trabajo
 *      de otra rama: lo compara con la suya.
 *   2. LA PARIDAD EN LA GPU (3): pinta a un blanco de coma flotante, en 1.000 semillas, las reglas gemelas del GLSL de
 *      la fachada tal cual (`encendidaQ`, `queTiendaQ`, `colorDeLuzQ` con la semilla que le suma el hueco, `huecoQ` y
 *      las cuatro cuentas de la tienda de 6 m, sacadas del texto del bajo) y las compara con las de JS DEL JUEGO:
 *      `hash.ts`, `HUECO_DEL_ESTILO` y, para la tienda, los escaparates que pone `escaparatesDe` (`fachada/bajo.ts`) en
 *      una cara de ese ancho y esa semilla. Y lo mismo con una copia del GLSL con un umbral cambiado en cada una (la
 *      vacuna), que tiene que salir distinta.
 *   3. LOS MATERIALES DE LA CIUDAD EN N0-N3 (9), en cada estado del pintor del juego, con UN PINTOR NUEVO POR ESTADO:
 *        · `principal`: el camino del posproceso del nivel (`caminoPara`): N0 al lienzo con el tono propio, N1 al lienzo
 *          con ACES, N2-N3 a un blanco HalfFloat; con las sombras y las luces de verdad del nivel (`LucesDeLaNoche`);
 *        · `sin-sombras` (sólo donde hay sombras): lo mismo con el mapa de sombras apagado;
 *        · `segunda-pasada`: la capa nítida del posproceso, al lienzo y sin mapeo tonal.
 *      Un pintor nuevo por estado porque el tope del plan es POR ESTADO («por nivel y estado del pintor, hoy + 6»): lo
 *      que cuenta es lo que un pintor enlaza para pintar la ciudad en ESE estado, y no lo que un pintor acumula de un
 *      estado al siguiente (cada material saca un programa distinto en cada estado, y una capa nueva costaría dos o
 *      tres en el acumulado). En cada uno se compila y se PINTA la ciudad (pintar hace también los programas de la
 *      sombra), y se cuentan los programas y se pregunta a GL si cada uno enlazó (`compile` no lo mira en three r185).
 *      Del principal se saca el HLSL de ANGLE (`WEBGL_debug_shaders`) de la fachada, el mobiliario, el asfalto y la
 *      acera, que el comprobador pasa por fxc. Y el libro de bytes (`bytesEnLaGpu`) con lo que three dice que tiene.
 *   4. UN CAMBIO DE NIVEL N1 → N2 con el relevo de verdad (`relevo.ts`) y lo que cambia el juego a la vez (las luces,
 *      la sombra y el camino del posproceso): cuántos programas se enlazan y cuántos bytes se suben hasta que la de N2
 *      releva. La sombra se pone UNA vez al montar y otra al cambiar de nivel, como la pone el juego
 *      (`ponerLaSombraDelNivel`), no en cada fotograma; y es `PCFShadowMap`. El número del cambio que anota
 *      `verify:quiebro-gl` (41 programas, 25-sep) PRESUPONE el arreglo del juego que manda el coordinador en la
 *      revisión 2 de la ola 1b: `Atmosfera.tsx` pone `THREE.PCFShadowMap` y no `PCFSoftShadowMap`. Con la blanda,
 *      cada vez que el juego la pone (al cambiar de nivel) lo que se compile antes del primer pintado de sombras sale
 *      con una variante que three tira en ese pintado: el número no valdría (con la blanda puesta en cada fotograma
 *      eran 57; con la blanda puesta sólo al cambiar de nivel no se ha medido).
 *   5. LA PÉRDIDA DE CONTEXTO (10): pinta N1, fuerza `WEBGL_lose_context`, restaura y vuelve a pintar; da la
 *      luminancia media de antes y de después. Sólo informa: hasta la ola 4 nadie escucha la pérdida.
 *   6. LAS CAPAS DE PRUEBA DEL TOPE: en 3 y en 4, cada ciudad lleva `CAPAS_DE_PRUEBA` capas de más, montadas como las de
 *      verdad (`capasDeMas` de `construirLaCiudadAbierta`: cuelgan del grupo de la ciudad, su material es `suyo` y
 *      distinto por nivel). Sus programas se cuentan APARTE (su clave lleva `CAPA_DE_PRUEBA_DEL_TOPE`): el comprobador
 *      ve con ellas que su tope deja entrar las capas que el plan deja crecer y ni una más, en cada estado y en el
 *      cambio. Y la vacuna del enlace: un material con una línea que no es GLSL en una copia de su retoque (tiene que
 *      NO enlazar, con su diagnóstico).
 *
 * Nada de esto toca el juego: un banco, como `banco-abierto.tsx`. Pesa: la fachada tarda segundos en enlazar en
 * ANGLE, y se enlaza unas veinte veces.
 */
import * as THREE from 'three';
import { ciudadParaPintar, construirLaCiudadAbierta } from './abierta';
import type { CiudadAbiertaConstruida } from './abierta';
import { RelevoDeLaCiudad } from './relevo';
import type { SubidorDeLaCiudad } from './relevo';
import type { FabricaDeCapa } from './capas';
import { DETALLE_DEL_NIVEL, NIVELES_DE_LA_CIUDAD } from './tipos';
import type { EstiloDeFachada, NivelDeLaCiudad } from './tipos';
import { LucesDeLaNoche } from '../atmosfera/luz';
import { nieblaEnLaEscena, ponerLaNiebla } from '../atmosfera/niebla';
import { ponerLaPaleta } from '../atmosfera/paleta';
import { parchear } from '../atmosfera/parcheo';
import { caminoPara } from '../posproceso/camino';
import { ponerElTonoPropio } from '../posproceso/tono';
import { materialDelMobiliario } from './materiales';
import { GLSL_RUIDO } from './glsl';
import { GLSL_COMUN_DE_LA_FACHADA } from './fachada/glsl-comun';
import { TRAMO_DEL_HUECO } from './fachada/glsl-hueco';
import { TRAMO_DEL_BAJO } from './fachada/glsl-bajo';
import { escaparatesDe } from './fachada/bajo';
import { HUECO_DEL_ESTILO } from './fachada/tipos-de-cara';
import type { CaraDelVolumen, ObraDeLaFachada, VentanaEncendida } from './fachada/tipos-de-cara';
import { NUMERO_DEL_ESTILO, colorDeLaVentana, encendida, pcg, queTienda } from './hash';
import { bytesEnLaGpu, cuentasDeLaTienda, semillaDelColor } from '../../../scripts/quiebro-ciudad/comun';
import type { BytesEnLaGpu } from '../../../scripts/quiebro-ciudad/comun';

declare const __ARBOL_DEL_QUIEBRO__: string;

/* ═══════════════════════════════ LO QUE DEVUELVE ═══════════════════════════════ */

export type EstadoDelPintor = 'principal' | 'sin-sombras' | 'segunda-pasada';

export interface ProgramasDelEstado {
  readonly estado: EstadoDelPintor;
  /** Los programas que un pintor NUEVO enlaza para pintar la ciudad en este estado, sin los de las capas de prueba. */
  readonly programas: number;
  /** Los de cada capa de prueba del tope, en su orden (ver `CAPAS_DE_PRUEBA`). */
  readonly deLasCapasDePrueba: readonly number[];
  /** Los que GL dice que no enlazaron (con su nombre). */
  readonly sinEnlazar: readonly string[];
}

export interface ResultadoDelNivel {
  readonly nivel: NivelDeLaCiudad;
  readonly camino: string;
  readonly estados: readonly ProgramasDelEstado[];
  /**
   * Lo que three dice que tiene en la GPU tras el estado principal; y cuántas de esas geometrías son de las capas de
   * prueba (las distintas que ponen: hoy una, `GEOMETRIA_DE_LAS_CAPAS_DE_PRUEBA`), que el comprobador resta.
   */
  readonly memoria: { readonly geometrias: number; readonly texturas: number; readonly geometriasDeLasCapasDePrueba: number };
  readonly libro: BytesEnLaGpu;
  /** El HLSL de ANGLE del fragmento de cada material del §7.4, en el estado principal. */
  readonly hlsl: Readonly<Record<string, string | null>>;
}

export interface ResultadoDelBancoGl {
  readonly arbol: string;
  readonly grafica: string;
  readonly extensiones: { readonly depuracion: boolean; readonly perdida: boolean; readonly paralelo: boolean; readonly flotante: boolean };
  readonly paridad: {
    readonly semillas: number;
    readonly distintas: Readonly<Record<string, number>>;
    readonly vacuna: Readonly<Record<string, number>>;
    readonly ejemplos: readonly string[];
  } | null;
  readonly niveles: readonly ResultadoDelNivel[];
  readonly cambio: {
    /** Los programas del pintor antes y después del cambio (todos, también los de las capas de prueba). */
    readonly antes: number;
    readonly despues: number;
    /** Los que el cambio enlaza para la ciudad, sin los de las capas de prueba. */
    readonly nuevos: number;
    /** Los que el cambio enlaza para cada capa de prueba del tope (de las dos ciudades), en su orden. */
    readonly deLasCapasDePrueba: readonly number[];
    readonly sinEnlazar: readonly string[];
    readonly bytes: number;
    readonly luz: number;
    readonly relevos: number;
    readonly fotogramas: number;
  } | null;
  readonly contexto: { readonly antes: number; readonly despues: number; readonly restaurado: boolean } | null;
  readonly vacunas: {
    readonly enlace: { readonly enlazado: boolean; readonly diagnosticos: number } | null;
  };
  readonly errores: readonly string[];
}

const errores: string[] = [];

/* ═══════════════════════════════ EL PINTOR Y LA ESCENA ═══════════════════════════════ */

const ANCHO = 320;
const ALTO = 180;
/** La traza, el código y la noche de las fotos. */
const TRAZA = 0;
const CODIGO = 'K7M2P';
const NOCHE = 1;
/** Donde mira la cámara: la foto C del protocolo (la fachada a 5 m). */
const OJO: readonly [number, number, number] = [17.5, 1.7, 9.5];
const MIRA: readonly [number, number, number] = [26, 1.4, 12.5];

interface Pintor {
  readonly pintor: THREE.WebGLRenderer;
  readonly lienzo: HTMLCanvasElement;
  readonly diagnosticos: string[];
  /** El texto y el tipo de cada sombreador que se crea, y los de cada programa (ver `nuevoPintor`). */
  readonly textos: WeakMap<WebGLShader, string>;
  readonly tipos: WeakMap<WebGLShader, number>;
  readonly adjuntos: WeakMap<WebGLProgram, WebGLShader[]>;
}

function nuevoPintor(): Pintor {
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  document.body.appendChild(lienzo);
  const pintor = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  pintor.setPixelRatio(1);
  pintor.setSize(ANCHO, ALTO, false);
  pintor.debug.checkShaderErrors = true;
  const diagnosticos: string[] = [];
  pintor.debug.onShaderError = (gl, programa, vertice, fragmento): void => {
    const registro = [gl.getProgramInfoLog(programa), gl.getShaderInfoLog(vertice), gl.getShaderInfoLog(fragmento)]
      .map((x) => (x ?? '').trim())
      .filter((x) => x !== '')
      .join(' / ');
    diagnosticos.push(registro.slice(0, 400));
  };
  /*
   * three BORRA los sombreadores al enlazar (`deleteShader`), y de un sombreador borrado WebGL ya no da ni su texto ni
   * su HLSL. Así que se apunta aquí el texto y el tipo de cada uno al crearlo, y los de cada programa al adjuntarlos: el
   * HLSL se saca después compilando ese mismo texto otra vez (`hlslDe`), como el banco del analítico del plan.
   */
  const textos = new WeakMap<WebGLShader, string>();
  const tipos = new WeakMap<WebGLShader, number>();
  const adjuntos = new WeakMap<WebGLProgram, WebGLShader[]>();
  const gl = pintor.getContext() as unknown as {
    createShader(t: number): WebGLShader | null;
    shaderSource(s: WebGLShader, t: string): void;
    attachShader(p: WebGLProgram, s: WebGLShader): void;
  };
  const crear = gl.createShader.bind(gl);
  const fuente = gl.shaderSource.bind(gl);
  const adjuntar = gl.attachShader.bind(gl);
  gl.createShader = (t: number): WebGLShader | null => {
    const s = crear(t);
    if (s !== null) tipos.set(s, t);
    return s;
  };
  gl.shaderSource = (s: WebGLShader, t: string): void => {
    textos.set(s, t);
    fuente(s, t);
  };
  gl.attachShader = (p: WebGLProgram, s: WebGLShader): void => {
    const l = adjuntos.get(p) ?? [];
    l.push(s);
    adjuntos.set(p, l);
    adjuntar(p, s);
  };
  return { pintor, lienzo, diagnosticos, textos, tipos, adjuntos };
}

function soltarElPintor(p: Pintor): void {
  p.pintor.setRenderTarget(null);
  p.pintor.dispose();
  p.pintor.forceContextLoss();
  p.lienzo.remove();
}

interface ProgramaDeThree {
  readonly name: string;
  readonly cacheKey: string;
  readonly program: WebGLProgram;
}

function programasDe(p: Pintor): readonly ProgramaDeThree[] {
  return (p.pintor.info.programs ?? []) as unknown as readonly ProgramaDeThree[];
}

/** Los programas (desde el `desde`-ésimo) que GL dice que no enlazaron. */
function sinEnlazar(p: Pintor, desde = 0): string[] {
  const gl = p.pintor.getContext();
  return programasDe(p)
    .slice(desde)
    .filter((x) => gl.getProgramParameter(x.program, gl.LINK_STATUS) !== true)
    .map((x) => x.name || x.cacheKey.slice(0, 60));
}

/* ─────────────────────────────── LAS CAPAS DE PRUEBA DEL TOPE ─────────────────────────────── */

/**
 * CUÁNTAS CAPAS DE PRUEBA lleva cada ciudad del banco: más que el margen de programas de cualquier nivel (6, y 9 en
 * N1+), para que el comprobador pueda ver entrar el margen justo y pasarse la siguiente.
 */
export const CAPAS_DE_PRUEBA = 10;
/** El `define` que marca el material de cada capa de prueba (con su número), y así su programa en `info.programs`. */
const MARCA_DE_LA_CAPA_DE_PRUEBA = 'CAPA_DE_PRUEBA_DEL_TOPE';

/**
 * LA GEOMETRÍA DE TODAS LAS CAPAS DE PRUEBA, UNA (revisión 2 de la ola 1b): con una caja por capa, las diez capas
 * ponían diez geometrías en la memoria de three, y «three tiene sus geometrías» (`geometrias > 10`) salía verde con
 * la ciudad sin ninguna. Con una sola, las capas suman una; y además el banco cuenta las que ponen
 * (`geometriasDeLasCapasDePrueba`) y el comprobador las resta antes de comparar. Vive lo que la página: no la suelta
 * ninguna capa.
 */
const GEOMETRIA_DE_LAS_CAPAS_DE_PRUEBA = new THREE.BoxGeometry(0.2, 0.2, 0.2);
/** El prefijo del nombre de la malla de cada capa de prueba (para encontrarlas en la ciudad). */
const NOMBRE_DE_LA_CAPA_DE_PRUEBA = 'capa de prueba del tope';

/**
 * LA CAPA DE PRUEBA `k`, montada como una de verdad (`capasDeMas`): una caja delante del ojo, con un material suyo
 * (`suyo`: la ciudad lo guarda y lo suelta) y distinto por nivel, como los de las capas que el plan va a meter, y
 * sin proyectar sombra (sin material de profundidad propio, comparte el de three). La geometría es la de todas.
 */
function capaDePruebaDelTope(k: number): FabricaDeCapa {
  return (c) => {
    const material = c.suyo(new THREE.MeshBasicMaterial({ color: 0x808080 }));
    material.defines = { [MARCA_DE_LA_CAPA_DE_PRUEBA]: String(k), CAPA_DE_PRUEBA_DEL_NIVEL: String(c.nivel) };
    const malla = new THREE.Mesh(GEOMETRIA_DE_LAS_CAPAS_DE_PRUEBA, material);
    malla.name = `${NOMBRE_DE_LA_CAPA_DE_PRUEBA} ${String(k)}`;
    malla.position.set(MIRA[0] - 2 + 0.4 * k, MIRA[1] + 1, MIRA[2]);
    malla.frustumCulled = false;
    malla.castShadow = false;
    return { nombre: NOMBRE_DE_LA_CAPA_DE_PRUEBA, objeto: malla, renglones: () => [], estorbo: 'por-encima-de-1,9', soltar: () => undefined };
  };
}

/** Las geometrías DISTINTAS que ponen las capas de prueba montadas en `ciudad` (lo que el comprobador resta). */
function geometriasDeLasCapasDePrueba(ciudad: CiudadAbiertaConstruida): number {
  const vistas = new Set<THREE.BufferGeometry>();
  ciudad.grupo.traverse((o) => {
    if (o.name.startsWith(NOMBRE_DE_LA_CAPA_DE_PRUEBA) && (o as THREE.Mesh).isMesh === true) vistas.add((o as THREE.Mesh).geometry);
  });
  return vistas.size;
}
const CAPAS_DE_PRUEBA_DEL_TOPE: readonly FabricaDeCapa[] = Array.from({ length: CAPAS_DE_PRUEBA }, (_v, k) => capaDePruebaDelTope(k));

/** Una lista de programas, repartida: los de la ciudad, y los de cada capa de prueba (por su marca en la clave). */
function repartirLosProgramas(lista: readonly ProgramaDeThree[]): { readonly ciudad: number; readonly capas: number[] } {
  const capas = Array.from({ length: CAPAS_DE_PRUEBA }, () => 0);
  const marca = new RegExp(`(?:^|,)${MARCA_DE_LA_CAPA_DE_PRUEBA},(\\d+)(?:,|$)`);
  let ciudad = 0;
  for (const x of lista) {
    const m = marca.exec(x.cacheKey);
    const k = m === null ? -1 : Number(m[1]);
    if (k >= 0 && k < CAPAS_DE_PRUEBA) capas[k] = (capas[k] ?? 0) + 1;
    else ciudad++;
  }
  return { ciudad, capas };
}

/** La escena de un nivel: la ciudad, las luces de la noche del nivel y la niebla, como las monta el juego. */
function escenaDelNivel(n: NivelDeLaCiudad, ciudad: CiudadAbiertaConstruida | (() => CiudadAbiertaConstruida | null)): { escena: THREE.Scene; camara: THREE.PerspectiveCamera; luces: LucesDeLaNoche } {
  const escena = new THREE.Scene();
  ponerLaNiebla(escena, 'llovizna', 'madrugada');
  const paleta = ponerLaPaleta('madrugada', 1);
  const d = DETALLE_DEL_NIVEL[n];
  const deQuien = typeof ciudad === 'function' ? ciudad : () => ciudad;
  const luces = new LucesDeLaNoche(() => deQuien()?.farolas() ?? [], { reales: d.lucesReales, sombras: d.sombras });
  luces.ponerLaPaleta(paleta);
  escena.add(luces.grupo);
  const camara = new THREE.PerspectiveCamera(60, ANCHO / ALTO, 0.1, 1500);
  camara.position.set(OJO[0], OJO[1], OJO[2]);
  camara.lookAt(MIRA[0], MIRA[1], MIRA[2]);
  camara.updateMatrixWorld();
  return { escena, camara, luces };
}

/**
 * LA SOMBRA DEL NIVEL, UNA VEZ al montar el pintor o al cambiar de nivel, como la pone el juego: `Atmosfera.tsx` la
 * pone en un efecto que sólo corre cuando cambian el pintor o las sombras del nivel, y no en cada fotograma. (El
 * estado `sin-sombras` es un pintor aparte con el mapa apagado, y así se monta.)
 *
 * EL TIPO ES `PCFShadowMap`, que es con el que three r185 PINTA: el juego ponía `PCFSoftShadowMap`, pero three r185
 * la da por obsoleta y la cambia por `PCFShadowMap` en el primer pintado del mapa de sombras
 * (`WebGLShadowMap.render`). Con la blanda puesta otra vez antes de cada `compile`, cada material sacaba en N2-N3 DOS
 * programas por estado (el de `compile`, con la blanda, y el del pintado, con la otra), y cada capa costaba dos. El
 * coordinador (revisión 2 de la ola 1b) manda poner `PCFShadowMap` en `Atmosfera.tsx`; este banco pinta ya como el
 * juego pintará con ese arreglo, y los números que mide (los 41 del cambio N1 → N2, sobre todo) lo PRESUPONEN.
 */
function ponerLaSombraDelNivel(p: Pintor, n: NivelDeLaCiudad, e: EstadoDelPintor = 'principal'): void {
  const r = p.pintor;
  r.shadowMap.enabled = DETALLE_DEL_NIVEL[n].sombras > 0 && e !== 'sin-sombras';
  r.shadowMap.type = THREE.PCFShadowMap;
  r.shadowMap.needsUpdate = true;
}

/**
 * Pone el estado del pintor del juego que cambia DENTRO de un fotograma (ver la cabecera): el mapeo tonal y el blanco
 * del camino del nivel, o los de la segunda pasada. La sombra no: va con el nivel (`ponerLaSombraDelNivel`).
 */
function ponerElEstado(p: Pintor, n: NivelDeLaCiudad, e: EstadoDelPintor, blanco: THREE.WebGLRenderTarget): string {
  const r = p.pintor;
  const camino = caminoPara(n, true).camino;
  if (e === 'segunda-pasada') {
    r.toneMapping = THREE.NoToneMapping;
    r.setRenderTarget(null);
  } else if (camino === 'directo') {
    if (!ponerElTonoPropio()) errores.push('no se pudo poner el tono propio de N0');
    r.toneMapping = THREE.CustomToneMapping;
    r.setRenderTarget(null);
  } else if (camino === 'barato') {
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.setRenderTarget(null);
  } else {
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.setRenderTarget(blanco);
  }
  return camino;
}

function blancoDelNivel(): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(ANCHO, ALTO, { type: THREE.HalfFloatType, depthBuffer: true });
}

/**
 * El HLSL de ANGLE del fragmento con que se pintó `material` por última vez (o `null`): el texto que three le dio se
 * compila otra vez en un sombreador suelto (el suyo ya está borrado) y se le pide su traducción.
 */
function hlslDe(p: Pintor, material: THREE.Material): string | null {
  const gl = p.pintor.getContext();
  const dbg = gl.getExtension('WEBGL_debug_shaders') as { getTranslatedShaderSource(s: WebGLShader): string } | null;
  const prog = (p.pintor.properties.get(material) as { currentProgram?: { program?: WebGLProgram } } | undefined)?.currentProgram?.program;
  if (dbg === null || prog === undefined) return null;
  const frag = (p.adjuntos.get(prog) ?? []).find((s) => p.tipos.get(s) === gl.FRAGMENT_SHADER);
  const texto = frag === undefined ? undefined : p.textos.get(frag);
  if (texto === undefined) return null;
  const s = gl.createShader(gl.FRAGMENT_SHADER);
  if (s === null) return null;
  gl.shaderSource(s, texto);
  gl.compileShader(s);
  const hlsl = gl.getShaderParameter(s, gl.COMPILE_STATUS) === true ? dbg.getTranslatedShaderSource(s) : '';
  gl.deleteShader(s);
  return hlsl === '' ? null : hlsl;
}

/** Los materiales del §7.4 en una ciudad: la fachada y el mobiliario de la ventana, el asfalto y la acera. */
function materialesDelPlan(ciudad: CiudadAbiertaConstruida): Record<string, THREE.Material | null> {
  const porNombre = (nombre: string): THREE.Material | null => {
    let m: THREE.Material | null = null;
    ciudad.grupo.traverse((o) => {
      if (m === null && o.name === nombre) m = (o as THREE.Mesh).material as THREE.Material;
    });
    return m;
  };
  return {
    fachada: ciudad.ventana.mallas.fachadas.malla.material as THREE.Material,
    mobiliario: ciudad.ventana.mallas.mobiliario.malla.material as THREE.Material,
    asfalto: porNombre('quiebro-asfalto'),
    acera: porNombre('quiebro-aceras'),
  };
}

const unaVuelta = (ms = 0): Promise<void> => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════════════════ 2 · LA PARIDAD EN LA GPU ═══════════════════════════════ */

const SEMILLAS = 1000;

/** El fragmento que evalúa las gemelas: fila 0 encendida y tiendas, 1 el color de la luz, 2 el hueco, 3 la tienda de 6 m. */
function fragmentoDeLaParidad(glslComun: string, tramoDelHueco: string, tramoDelBajo: string): string | null {
  const semilla = semillaDelColor(tramoDelHueco);
  const tienda = cuentasDeLaTienda(tramoDelBajo);
  if (semilla === null || tienda === null) return null;
  /* Con `GLSL3`, three no declara la salida del fragmento: la declara quien escribe el sombreador. */
  return /* glsl */ `
precision highp float;
precision highp int;
layout(location = 0) out highp vec4 salidaDeLaParidadQ;
uniform highp sampler2D uEntradas;
uniform float uVentanasEncendidas;
${GLSL_RUIDO}
${glslComun}
vec4 tiendaQ(float anchoCara, float a) {
  ${tienda.join('\n  ')}
  return vec4(nT, tienda, t0, t1);
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 e = texelFetch(uEntradas, ivec2(p.x, 0), 0);
  vec4 t = texelFetch(uEntradas, ivec2(p.x, 1), 0);
  float celda = e.x;
  float planta = e.y;
  float semilla = e.z;
  int estilo = int(e.w + 0.5);
  vec4 s = vec4(0.0);
  if (p.y == 0) s = vec4(encendidaQ(celda, planta, semilla, estilo), float(queTiendaQ(celda, semilla, false)), float(queTiendaQ(celda, semilla, true)), 0.0);
  else if (p.y == 1) s = vec4(colorDeLuzQ(hashQ(vec2(celda, planta), semilla + ${semilla.toFixed(1)})), 0.0);
  else if (p.y == 2) s = huecoQ(estilo);
  else s = tiendaQ(t.x, t.y);
  salidaDeLaParidadQ = s;
}
`;
}

/** Las entradas de cada semilla (enteros exactos en coma flotante; los anchos, en cuartos de metro). */
function entradas(): { readonly e: Float32Array; readonly celda: number[]; readonly planta: number[]; readonly semilla: number[]; readonly estilo: number[]; readonly ancho: number[]; readonly a: number[] } {
  const e = new Float32Array(SEMILLAS * 2 * 4);
  const r = { celda: [] as number[], planta: [] as number[], semilla: [] as number[], estilo: [] as number[], ancho: [] as number[], a: [] as number[] };
  let s = 0x51ab;
  const azar = (tope: number): number => {
    s = pcg(s + 0x9e37);
    return s % tope;
  };
  for (let i = 0; i < SEMILLAS; i++) {
    const celda = azar(400);
    const planta = azar(40);
    const semilla = 1 + azar(1 << 20);
    const estilo = azar(6);
    const ancho = 2 + azar(153) * 0.25;
    const a = azar(Math.round(ancho * 4)) * 0.25;
    r.celda.push(celda);
    r.planta.push(planta);
    r.semilla.push(semilla);
    r.estilo.push(estilo);
    r.ancho.push(ancho);
    r.a.push(a);
    e.set([celda, planta, semilla, estilo], i * 4);
    e.set([ancho, a, 0, 0], (SEMILLAS + i) * 4);
  }
  return { e, ...r };
}

/** Pinta el fragmento de la paridad y devuelve las cuatro filas. */
function pintarLaParidad(p: Pintor, fragmento: string, datos: Float32Array): Float32Array {
  const entrada = new THREE.DataTexture(datos, SEMILLAS, 2, THREE.RGBAFormat, THREE.FloatType);
  entrada.minFilter = THREE.NearestFilter;
  entrada.magFilter = THREE.NearestFilter;
  entrada.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uEntradas: { value: entrada }, uVentanasEncendidas: { value: 1 } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: fragmento,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const escena = new THREE.Scene();
  escena.add(quad);
  const blanco = new THREE.WebGLRenderTarget(SEMILLAS, 4, { type: THREE.FloatType, depthBuffer: false });
  blanco.texture.minFilter = THREE.NearestFilter;
  blanco.texture.magFilter = THREE.NearestFilter;
  p.pintor.toneMapping = THREE.NoToneMapping;
  p.pintor.setRenderTarget(blanco);
  p.pintor.render(escena, new THREE.Camera());
  const salida = new Float32Array(SEMILLAS * 4 * 4);
  p.pintor.readRenderTargetPixels(blanco, 0, 0, SEMILLAS, 4, salida);
  p.pintor.setRenderTarget(null);
  blanco.dispose();
  entrada.dispose();
  material.dispose();
  quad.geometry.dispose();
  return salida;
}

/** Cuántas semillas no casan con JS, por regla. */
function compararLaParidad(salida: Float32Array, x: ReturnType<typeof entradas>, ejemplos: string[] | null): Record<string, number> {
  const d: Record<string, number> = { encendida: 0, queTienda: 0, colorDeLuz: 0, huecoQ: 0, tienda: 0 };
  const estilos = (Object.entries(NUMERO_DEL_ESTILO) as [EstiloDeFachada, number][]).sort((a, b) => a[1] - b[1]).map(([e]) => e);
  const px = (fila: number, i: number, c: number): number => salida[(fila * SEMILLAS + i) * 4 + c] as number;
  const cerca = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(b));
  const apuntar = (regla: string, i: number, gpu: readonly number[], js: readonly number[]): void => {
    d[regla] = (d[regla] ?? 0) + 1;
    if (ejemplos !== null && ejemplos.length < 6) ejemplos.push(`${regla} semilla ${String(i)}: GPU ${JSON.stringify(gpu)} JS ${JSON.stringify(js)}`);
  };
  for (let i = 0; i < SEMILLAS; i++) {
    const celda = x.celda[i] as number;
    const planta = x.planta[i] as number;
    const semilla = x.semilla[i] as number;
    const estilo = x.estilo[i] as number;
    const enc = encendida(celda, planta, semilla, estilo) ? 1 : 0;
    if (px(0, i, 0) !== enc) apuntar('encendida', i, [px(0, i, 0)], [enc]);
    const t0 = queTienda(celda, semilla, false);
    const t1 = queTienda(celda, semilla, true);
    if (px(0, i, 1) !== t0 || px(0, i, 2) !== t1) apuntar('queTienda', i, [px(0, i, 1), px(0, i, 2)], [t0, t1]);
    const color = colorDeLaVentana(celda, planta, semilla);
    if (!color.every((v, c) => cerca(px(1, i, c), v))) apuntar('colorDeLuz', i, [px(1, i, 0), px(1, i, 1), px(1, i, 2)], color);
    const hueco = HUECO_DEL_ESTILO[estilos[estilo] as EstiloDeFachada];
    if (!hueco.every((v, c) => cerca(px(2, i, c), v))) apuntar('huecoQ', i, [0, 1, 2, 3].map((c) => px(2, i, c)), hueco);
    const ancho = x.ancho[i] as number;
    const a = x.a[i] as number;
    const gpu = [0, 1, 2, 3].map((c) => px(3, i, c));
    const js = laTiendaDelJuego(ancho, a, semilla, gpu);
    if (js !== null) apuntar('tienda', i, gpu, js);
  }
  return d;
}

/**
 * LA TIENDA DEL JUEGO, no una copia de su cuenta: los escaparates que `escaparatesDe` (`fachada/bajo.ts`) enciende en
 * una cara de `ancho` metros con esa `semilla` y sin toques, contra lo que la GPU dice de la tienda que cae en `a`
 * (`nT`, su número y sus cantos `t0`-`t1`). Casan si la tienda de la GPU tiene escaparate encendido en el JS justo
 * en su centro cuando `queTienda` la enciende (y no lo tiene cuando no), si `a` cae dentro de ella, y si el JS
 * enciende tantas tiendas como `queTienda` en las `nT` de la GPU. Devuelve lo que se esperaba (`null` si casa).
 */
function laTiendaDelJuego(ancho: number, a: number, semilla: number, gpu: readonly number[]): number[] | null {
  const [nT = -1, tienda = -1, t0 = -1, t1 = -1] = gpu;
  const cara = { cara: { desde: 0, hasta: ancho, mira: 's', plano: 0 }, semilla, toques: [] } as unknown as CaraDelVolumen;
  const puestas: VentanaEncendida[] = [];
  escaparatesDe(cara, puestas, {} as ObraDeLaFachada);
  const centros = puestas.map((v) => v.x);
  let encendidas = 0;
  for (let t = 0; t < nT; t++) if (queTienda(t, semilla, false) === 1) encendidas++;
  const centro = (t0 + t1) / 2;
  const tieneEscaparate = centros.some((c) => Math.abs(c - centro) < 1e-4);
  const laEnciende = queTienda(tienda, semilla, false) === 1;
  const casa = nT >= 1 && tienda >= 0 && tienda < nT && a >= t0 - 1e-4 && a <= t1 + 1e-4 && tieneEscaparate === laEnciende && centros.length === encendidas;
  return casa ? null : [centros.length, encendidas, laEnciende ? 1 : 0, ...centros.slice(0, 4)];
}

/** La copia envenenada del GLSL: un umbral cambiado en cada gemela. */
function glslEnvenenado(): { readonly comun: string; readonly bajo: string } {
  let comun = GLSL_COMUN_DE_LA_FACHADA;
  /* Umbrales que cambian lo bastante semillas de las mil (el de las ventanas de vidrio, 0,16, casi nunca sale). */
  for (const [antes, despues] of [
    ['0.12 + 0.2 * hp', '0.12 + 0.3 * hp'],
    ['ht < 0.34 ? 0', 'ht < 0.35 ? 0'],
    ['if (h < 0.45)', 'if (h < 0.46)'],
    ['vec4(0.28, 0.72, 0.22, 0.80)', 'vec4(0.28, 0.72, 0.23, 0.80)'],
  ] as const) {
    if (!comun.includes(antes)) errores.push(`la vacuna de la paridad no encuentra «${antes}»`);
    comun = comun.replace(antes, despues);
  }
  if (!TRAMO_DEL_BAJO.includes('floor(anchoCara / 6.0)')) errores.push('la vacuna de la paridad no encuentra la cuenta de la tienda');
  return { comun, bajo: TRAMO_DEL_BAJO.replace('floor(anchoCara / 6.0)', 'floor(anchoCara / 7.0)') };
}

function laParidad(): ResultadoDelBancoGl['paridad'] {
  const p = nuevoPintor();
  try {
    const x = entradas();
    const real = fragmentoDeLaParidad(GLSL_COMUN_DE_LA_FACHADA, TRAMO_DEL_HUECO, TRAMO_DEL_BAJO);
    const v = glslEnvenenado();
    const vacuna = fragmentoDeLaParidad(v.comun, TRAMO_DEL_HUECO, v.bajo);
    if (real === null || vacuna === null) {
      errores.push('no se encuentran en el GLSL la semilla del color o las cuentas de la tienda');
      return null;
    }
    const ejemplos: string[] = [];
    const distintas = compararLaParidad(pintarLaParidad(p, real, x.e), x, ejemplos);
    const deLaVacuna = compararLaParidad(pintarLaParidad(p, vacuna, x.e), x, null);
    if (sinEnlazar(p).length > 0) errores.push(`la paridad no enlazó: ${p.diagnosticos.join(' | ').slice(0, 400)}`);
    return { semillas: SEMILLAS, distintas, vacuna: deLaVacuna, ejemplos };
  } finally {
    soltarElPintor(p);
  }
}

/* ═══════════════════════════════ 3 · LOS MATERIALES EN N0-N3 ═══════════════════════════════ */

function elNivel(n: NivelDeLaCiudad): ResultadoDelNivel {
  const ciudad = construirLaCiudadAbierta(ciudadParaPintar(TRAZA, CODIGO, NOCHE), n, { capasDeMas: CAPAS_DE_PRUEBA_DEL_TOPE });
  try {
    ciudad.montarYa(OJO[0], OJO[2]);
    const estados: ProgramasDelEstado[] = [];
    const lista: EstadoDelPintor[] = DETALLE_DEL_NIVEL[n].sombras > 0 ? ['principal', 'sin-sombras', 'segunda-pasada'] : ['principal', 'segunda-pasada'];
    let camino = '';
    let memoria = { geometrias: 0, texturas: 0, geometriasDeLasCapasDePrueba: 0 };
    const hlsl: Record<string, string | null> = {};
    for (const e of lista) {
      /* UN PINTOR NUEVO POR ESTADO (ver la cabecera), con su escena, sus luces y su blanco. */
      const p = nuevoPintor();
      const blanco = blancoDelNivel();
      const { escena, camara, luces } = escenaDelNivel(n, ciudad);
      try {
        escena.add(ciudad.grupo);
        if (e === lista[0]) ciudad.actualizar(camara, 1, 20);
        luces.actualizar(camara, 0.5);
        nieblaEnLaEscena(escena);
        ponerLaSombraDelNivel(p, n, e);
        const c = ponerElEstado(p, n, e, blanco);
        if (e === 'principal') camino = c;
        p.pintor.compile(escena, camara);
        p.pintor.render(escena, camara);
        const r = repartirLosProgramas(programasDe(p));
        estados.push({ estado: e, programas: r.ciudad, deLasCapasDePrueba: r.capas, sinEnlazar: sinEnlazar(p) });
        if (e === 'principal') {
          memoria = { geometrias: p.pintor.info.memory.geometries, texturas: p.pintor.info.memory.textures, geometriasDeLasCapasDePrueba: geometriasDeLasCapasDePrueba(ciudad) };
          for (const [nombre, m] of Object.entries(materialesDelPlan(ciudad))) hlsl[nombre] = m === null ? null : hlslDe(p, m);
        }
        if (p.diagnosticos.length > 0) errores.push(`N${String(n)} ${e}: ${p.diagnosticos.join(' | ').slice(0, 600)}`);
      } finally {
        escena.remove(ciudad.grupo);
        blanco.dispose();
        soltarElPintor(p);
      }
    }
    return { nivel: n, camino, estados, memoria, libro: bytesEnLaGpu(ciudad), hlsl };
  } finally {
    ciudad.liberar();
  }
}

/* ═══════════════════════════════ 4 · UN CAMBIO DE NIVEL N1 → N2 ═══════════════════════════════ */

/**
 * El subidor del relevo, como el de `CiudadAbierta.tsx` (que no se exporta): pinta cada malla sola, con un material
 * simple, en un blanco de 1 × 1, y sube las texturas con `initTexture`.
 */
function subidorDe(r: THREE.WebGLRenderer): SubidorDeLaCiudad & { liberar(): void } {
  const blanco = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const escena = new THREE.Scene();
  const simple = new THREE.MeshBasicMaterial();
  escena.overrideMaterial = simple;
  escena.matrixWorldAutoUpdate = false;
  const camara = new THREE.OrthographicCamera();
  return {
    subirMalla(malla: THREE.Object3D): void {
      const cortada = malla.frustumCulled;
      const visible = malla.visible;
      malla.frustumCulled = false;
      malla.visible = true;
      const antes = r.getRenderTarget();
      escena.children.push(malla);
      try {
        r.setRenderTarget(blanco);
        r.render(escena, camara);
      } finally {
        escena.children.length = 0;
        r.setRenderTarget(antes);
        malla.frustumCulled = cortada;
        malla.visible = visible;
      }
    },
    subirTextura(textura: THREE.Texture): void {
      r.initTexture(textura);
    },
    liberar(): void {
      blanco.dispose();
      simple.dispose();
    },
  };
}

async function elCambio(): Promise<ResultadoDelBancoGl['cambio']> {
  const p = nuevoPintor();
  const blanco = blancoDelNivel();
  /* Cada ciudad del relevo, la de N1 y la de N2, con sus capas de prueba del tope (ver `CAPAS_DE_PRUEBA`). */
  const relevo = new RelevoDeLaCiudad({
    construir: (fuente, nivel, opciones) => construirLaCiudadAbierta(fuente, nivel, { ...opciones, capasDeMas: CAPAS_DE_PRUEBA_DEL_TOPE }),
    alCrear: (c) => c.ponerElSubidor((t) => p.pintor.initTexture(t)),
  });
  const subidor = subidorDe(p.pintor);
  relevo.ponerElSubidor(subidor);
  const fuente = ciudadParaPintar(TRAZA, CODIGO, NOCHE);
  try {
    let montaje = escenaDelNivel(1, () => relevo.actual);
    const { escena, camara } = montaje;
    escena.add(relevo.grupo);
    relevo.pedir(fuente, 1);
    const primera = relevo.tomarLaNueva();
    primera?.montarYa(OJO[0], OJO[2]);
    nieblaEnLaEscena(escena);
    /* La sombra del nivel, al montar (y otra vez al cambiar, abajo): no en cada fotograma, como el juego. */
    ponerLaSombraDelNivel(p, 1);
    let f = 0;
    const fotograma = async (n: NivelDeLaCiudad): Promise<void> => {
      relevo.actualizar(camara, f / 30, f);
      relevo.tomarLaNueva();
      montaje.luces.actualizar(camara, 1 / 30);
      ponerElEstado(p, n, 'principal', blanco);
      relevo.enElPintado(p.pintor, escena, camara);
      p.pintor.render(escena, camara);
      ponerElEstado(p, n, 'segunda-pasada', blanco);
      p.pintor.compile(escena, camara);
      f++;
      await unaVuelta();
    };
    for (let k = 0; k < 20; k++) await fotograma(1);
    const antes = programasDe(p).length;
    const subidosAntes = relevo.subidos;
    const relevosAntes = relevo.relevos;
    /* El cambio: las luces, la sombra y el camino del posproceso del nivel nuevo (lo que hacen `Atmosfera` y `Posproceso`), y el relevo. */
    escena.remove(montaje.luces.grupo);
    const nuevas = escenaDelNivel(2, () => relevo.actual);
    escena.add(nuevas.luces.grupo);
    montaje = { ...montaje, luces: nuevas.luces };
    ponerLaSombraDelNivel(p, 2);
    relevo.pedir(fuente, 2);
    let tras = -1;
    for (let k = 0; k < 2400 && (tras < 0 || f - tras < 10); k++) {
      await fotograma(2);
      if (tras < 0 && relevo.relevos > relevosAntes) tras = f;
    }
    const nueva = relevo.actual;
    const luz = nueva !== null && nueva.conLuz ? nueva.luz.bytesEnLaGpu : 0;
    const r = repartirLosProgramas(programasDe(p).slice(antes));
    return {
      antes,
      despues: programasDe(p).length,
      nuevos: r.ciudad,
      deLasCapasDePrueba: r.capas,
      sinEnlazar: sinEnlazar(p, antes),
      bytes: relevo.subidos - subidosAntes,
      luz,
      relevos: relevo.relevos - relevosAntes,
      fotogramas: f,
    };
  } finally {
    relevo.liberar();
    relevo.ponerElSubidor(null);
    subidor.liberar();
    blanco.dispose();
    soltarElPintor(p);
  }
}

/* ═══════════════════════════════ 5 · LA PÉRDIDA DE CONTEXTO ═══════════════════════════════ */

function luminancia(p: Pintor): number {
  const gl = p.pintor.getContext();
  const px = new Uint8Array(ANCHO * ALTO * 4);
  gl.readPixels(0, 0, ANCHO, ALTO, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let s = 0;
  for (let i = 0; i < px.length; i += 4) s += 0.2126 * (px[i] as number) + 0.7152 * (px[i + 1] as number) + 0.0722 * (px[i + 2] as number);
  return s / (ANCHO * ALTO);
}

async function elContexto(): Promise<ResultadoDelBancoGl['contexto']> {
  const p = nuevoPintor();
  const blanco = blancoDelNivel();
  const ciudad = construirLaCiudadAbierta(ciudadParaPintar(TRAZA, CODIGO, NOCHE), 1);
  try {
    const { escena, camara, luces } = escenaDelNivel(1, ciudad);
    escena.add(ciudad.grupo);
    ciudad.montarYa(OJO[0], OJO[2]);
    luces.actualizar(camara, 0.5);
    nieblaEnLaEscena(escena);
    ponerLaSombraDelNivel(p, 1);
    const pintar = (): void => {
      ciudad.actualizar(camara, 1, 20);
      ponerElEstado(p, 1, 'principal', blanco);
      p.pintor.render(escena, camara);
    };
    for (let k = 0; k < 3; k++) pintar();
    const antes = luminancia(p);
    const ext = p.pintor.getContext().getExtension('WEBGL_lose_context');
    if (ext === null) return null;
    const perdido = new Promise<void>((r) => p.lienzo.addEventListener('webglcontextlost', () => r(), { once: true }));
    const vuelto = new Promise<void>((r) => p.lienzo.addEventListener('webglcontextrestored', () => r(), { once: true }));
    ext.loseContext();
    await Promise.race([perdido, unaVuelta(5000)]);
    await unaVuelta(50);
    ext.restoreContext();
    const restaurado = await Promise.race([vuelto.then(() => true), unaVuelta(10_000).then(() => false)]);
    await unaVuelta(50);
    for (let k = 0; k < 3; k++) pintar();
    return { antes, despues: luminancia(p), restaurado };
  } finally {
    ciudad.liberar();
    blanco.dispose();
    soltarElPintor(p);
  }
}

/* ═══════════════════════════════ 6 · LA VACUNA DEL ENLACE ═══════════════════════════════ */

/* (La del tope de programas son las capas de prueba, dentro de 3 y 4: ver `CAPAS_DE_PRUEBA`.) */
function lasVacunas(): ResultadoDelBancoGl['vacunas'] {
  const p = nuevoPintor();
  try {
    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(60, ANCHO / ALTO, 0.1, 100);
    camara.position.set(0, 0, 5);
    camara.updateMatrixWorld();
    /* El enlace: una copia del retoque del mobiliario con una línea que no es GLSL. */
    const roto = materialDelMobiliario(1);
    parchear(roto, { nombre: 'vacuna-no-es-glsl', orden: 60, fragmento: [{ buscar: '#include <normal_fragment_maps>', como: 'despues', texto: 'esto no es glsl;' }] });
    const g = new THREE.BoxGeometry(1, 1, 1);
    const a = new THREE.Mesh(g, roto);
    escena.add(a);
    const diagnosticosAntes = p.diagnosticos.length;
    p.pintor.render(escena, camara);
    const prog = (p.pintor.properties.get(roto) as { currentProgram?: { program?: WebGLProgram } } | undefined)?.currentProgram?.program;
    const gl = p.pintor.getContext();
    const enlace = { enlazado: prog === undefined ? false : gl.getProgramParameter(prog, gl.LINK_STATUS) === true, diagnosticos: p.diagnosticos.length - diagnosticosAntes };
    escena.remove(a);
    g.dispose();
    roto.dispose();
    return { enlace };
  } finally {
    soltarElPintor(p);
  }
}

/* ═══════════════════════════════ TODO, EN ORDEN ═══════════════════════════════ */

function escribir(resultado: ResultadoDelBancoGl): void {
  const pre = document.createElement('pre');
  pre.id = 'resultado-gl';
  pre.style.display = 'none';
  pre.textContent = JSON.stringify(resultado);
  document.body.appendChild(pre);
  const resumen = document.createElement('pre');
  resumen.textContent = JSON.stringify({ ...resultado, niveles: resultado.niveles.map((n) => ({ ...n, hlsl: Object.fromEntries(Object.entries(n.hlsl).map(([k, v]) => [k, v === null ? null : `${String(v.length)} caracteres`])) })) }, null, 1);
  document.body.appendChild(resumen);
  document.title = 'listo';
}

async function todo(): Promise<void> {
  const arbol = typeof __ARBOL_DEL_QUIEBRO__ === 'string' ? __ARBOL_DEL_QUIEBRO__ : '?';
  const marca = document.createElement('div');
  marca.id = 'banco-gl-arbol';
  marca.dataset['arbol'] = arbol;
  marca.textContent = `árbol ${arbol}`;
  document.body.appendChild(marca);

  const sonda = nuevoPintor();
  const gl = sonda.pintor.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
  const grafica = info === null ? '?' : String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  const extensiones = {
    depuracion: gl.getExtension('WEBGL_debug_shaders') !== null,
    perdida: gl.getExtension('WEBGL_lose_context') !== null,
    paralelo: gl.getExtension('KHR_parallel_shader_compile') !== null,
    flotante: gl.getExtension('EXT_color_buffer_float') !== null,
  };
  soltarElPintor(sonda);

  let paridad: ResultadoDelBancoGl['paridad'] = null;
  const niveles: ResultadoDelNivel[] = [];
  let cambio: ResultadoDelBancoGl['cambio'] = null;
  let contexto: ResultadoDelBancoGl['contexto'] = null;
  let vacunas: ResultadoDelBancoGl['vacunas'] = { enlace: null };
  const paso = async <T,>(nombre: string, hacer: () => T | Promise<T>): Promise<T | null> => {
    try {
      const r = await hacer();
      await unaVuelta();
      return r;
    } catch (e) {
      errores.push(`${nombre}: ${e instanceof Error ? `${e.message} ${e.stack ?? ''}` : String(e)}`.slice(0, 800));
      return null;
    }
  };
  paridad = await paso('la paridad', laParidad);
  for (const n of NIVELES_DE_LA_CIUDAD) {
    const r = await paso(`N${String(n)}`, () => elNivel(n));
    if (r !== null) niveles.push(r);
  }
  cambio = await paso('el cambio N1 → N2', elCambio);
  contexto = await paso('la pérdida de contexto', elContexto);
  vacunas = (await paso('las vacunas', lasVacunas)) ?? vacunas;
  escribir({ arbol, grafica, extensiones, paridad, niveles, cambio, contexto, vacunas, errores });
}

void todo();
