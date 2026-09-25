/**
 * ¿LA CIUDAD DEL QUIEBRO ENLAZA, CABE Y DICE LO MISMO EN LA GPU? (plan del detalle de la ciudad, O1-VERIFICACION 3,
 * 9 y 10, y §7.4). Lo que `verify:quiebro-ciudad` mira en Node, aquí se mira en una GPU de verdad: ANGLE sobre D3D11,
 * en Edge sin ventana, con el banco `escritorio/banco-quiebro-gl.html` (`src/quiebro/ciudad/banco-gl.tsx`).
 *
 *   PUERTO=5314 npx tsx scripts/verificar-quiebro-gl.ts     (desde escritorio/, con el Vite de ESTE árbol en ese puerto)
 *   FXC=<ruta de fxc.exe>                                     (si no, el más nuevo de `Windows Kits/10/bin/<versión>/x64`)
 *   CARPETA_GL=<carpeta>                                      (dónde van el perfil de Edge y el HLSL y el ensamblador de
 *                                                              fxc; si no, `%TEMP%`. Con varios agentes a la vez, la
 *                                                              de cada uno, §4.3: sólo se separan por el puerto)
 *   PERFIL_EDGE=<carpeta>                                     (el perfil de Edge, si se quiere otro que el de CARPETA_GL)
 *
 * ═══ QUÉ AFIRMA ═══
 *
 *   · EL BANCO ES DE ESTE ÁRBOL: el servidor del puerto sirve un fichero de ESTE worktree por `/sala/@fs/…` (un Vite de
 *     otro worktree no lo sirve) y el DOM del banco dice que sale de esta carpeta (`__ARBOL_DEL_QUIEBRO__`).
 *   · (3) LA PARIDAD EN LA GPU: en 1.000 semillas, `encendidaQ`, `queTiendaQ`, `colorDeLuzQ` (con la semilla que le
 *     suma el hueco), `huecoQ` y la tienda de 6 m del GLSL de la fachada dan lo mismo que el JS del juego: `hash.ts`,
 *     `HUECO_DEL_ESTILO` y los escaparates de `escaparatesDe` (`fachada/bajo.ts`); y la copia envenenada (un umbral
 *     cambiado en cada una) no.
 *   · (9) LOS MATERIALES DE LA CIUDAD ENLAZAN en N0-N3 en cada estado del pintor (el principal del camino del nivel,
 *     sin sombras y la segunda pasada del posproceso), preguntado a GL programa a programa; y los PROGRAMAS que un
 *     pintor nuevo enlaza para pintar la ciudad en cada nivel y estado no pasan de los de hoy (anotados aquí) más 6
 *     (materia lejana, suelo lejano, luces lejanas, tubos, luz pintada y sombras cercanas) y más 3 en N1+ (lo
 *     cercano): el tope del plan es POR ESTADO, y así se cuenta (un pintor que acumula los estados haría pagar dos o
 *     tres programas a cada capa nueva). Un cambio de nivel N1 → N2 con el relevo de verdad enlaza como mucho los
 *     programas de hoy más lo que cuestan en él las 9 capas que N2 deja crecer (`PROGRAMAS_POR_CAPA_EN_EL_CAMBIO`
 *     cada una: la ciudad vieja con el estado nuevo y la nueva, en el pintado y en la segunda pasada), y sube como
 *     mucho lo que cabe en la GPU de N2 (§7.3).
 *   · LA MEMORIA: el libro de bytes de la ciudad (`bytesEnLaGpu`) cabe en el tope de §7.3 de su nivel, y three dice que
 *     tiene sus geometrías (las de la ciudad: las de las capas de prueba se restan) y sus texturas.
 *   · §7.4 CON FXC: las instrucciones estáticas (`ps_5_0 /O3`) del HLSL de ANGLE de la fachada, el asfalto, la acera y
 *     el mobiliario, en su estado principal, no pasan de su tope: el de §7.4, o el que exporte su módulo
 *     (`TOPE_DEL_SOMBREADOR_POR_NIVEL`, §5.2.9) si es menor. Sin fxc no se puede mirar, y eso no es verde: sale con 2.
 *     Un módulo que exporta la tabla con una forma que no se lee (sin `instrucciones` y `lecturas` numéricas en cada
 *     nivel) es rojo: si no, se miraría contra §7.4 creyendo que se mira contra su tabla. Las LECTURAS de esa tabla
 *     no se juzgan aquí: §7.4 las define como `texture*` en el texto resuelto (no como las `sample` del ensamblador,
 *     que el optimizador junta o desdobla), y las juzga `verify:quiebro-materia` en el peor camino; aquí las `sample`
 *     de fxc sólo se apuntan.
 *   · (10) LA PÉRDIDA DE CONTEXTO, sólo en informe hasta la ola 4: la luminancia media antes y después de forzar
 *     `WEBGL_lose_context` y restaurar.
 *
 * ═══ CÓMO SE SABE QUE MIRA ═══
 *
 * Las vacunas van en el banco y aquí: una copia del GLSL con los umbrales cambiados tiene que dar distinto en cada regla;
 * un material con una línea que no es GLSL tiene que NO enlazar, con su diagnóstico; las capas de prueba del banco
 * (montadas en la ciudad como las de verdad, en cada nivel y estado y en las dos ciudades del cambio) tienen que dejar
 * entrar el margen justo sobre lo de hoy y pasarse con una más; y el juez de fxc tiene que poner rojo un material con
 * una instrucción de más que su tope, y una tabla del módulo con una forma que no se lee. Además cada comprobación se
 * vio en rojo rompiendo una COPIA del árbol (el informe de O1-VERIFICACION).
 *
 * ═══ DECISIONES DEL COORDINADOR (revisión 2 de la ola 1b, 25-sep) ═══
 *
 *   (a) La batería ENTERA (`npm run verificar`) necesita `PUERTO` con el Vite del árbol que se comprueba: este
 *       comprobador y `verify:quiebro-materia` van `lento` en `scripts/verificar-todo.mjs` y, sin él, salen con 2, que
 *       allí es rojo. Una batería sin `PUERTO` no es verde nunca; con `--rapido` no los corre, y no dice nada de ellos.
 *   (b) Se confirma el +42 de `TONO_PROPIO_DE_N0` en el tope de §7.4 en N0 (ver su nota).
 *   (c) Un módulo con varios materiales (`suelo.ts`: el asfalto y la acera) exporta UNA `TOPE_DEL_SOMBREADOR_POR_NIVEL`,
 *       que es el tope COMÚN de todos ellos; §7.4 sigue dando a cada material el suyo, y aquí manda el menor de los dos
 *       (`topeDeFxc`).
 *   Y el número del cambio N1 → N2 (`PROGRAMAS_DEL_CAMBIO_DE_HOY`, 41) presupone que el juego pone `PCFShadowMap` en
 *   `Atmosfera.tsx`, como manda la misma revisión (ver su nota y `ponerLaSombraDelNivel` en el banco).
 *
 * Salidas, las del arnés de la casa: 0 verde; 1 rojo; 2 SE SALTÓ un bloque (sin `PUERTO`, sin el Vite de este árbol,
 * sin Edge, sin `WEBGL_debug_shaders` o sin fxc: no se ha mirado, y no es verde); 3 el guion reventó.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arnes } from '../../server/scripts/arnes';
import type { EstadoDelPintor, ResultadoDelBancoGl } from '../src/quiebro/ciudad/banco-gl';
import type { NivelDeLaCiudad } from '../src/quiebro/ciudad/tipos';
import { NIVELES_DE_LA_CIUDAD } from '../src/quiebro/ciudad/tipos';
import * as deLasFachadas from '../src/quiebro/ciudad/fachadas';
import * as deLosMateriales from '../src/quiebro/ciudad/materiales';
import * as delSuelo from '../src/quiebro/ciudad/suelo';

const { comprobar, paso, nota, terminar } = arnes();

/* ═══════════════════════════════ LO ANOTADO ═══════════════════════════════ */

/**
 * LOS PROGRAMAS DE HOY, por nivel y estado del pintor: los que un pintor NUEVO enlaza para pintar la ciudad en ese
 * estado (sin las capas de prueba del banco), medidos por este comprobador el 25-sep en `70fe237` (ola 1b), en
 * ANGLE/D3D11 con Edge sin ventana. El tope es esto más 6, y más 3 desde N1 (ver la cabecera). O4-CIERRE lo vuelve a
 * medir. En N2-N3, el principal y la segunda pasada son los 16 materiales de la ciudad más el de profundidad de la
 * sombra. (La primera versión los contaba ACUMULADOS en un pintor por nivel, y con la sombra blanda puesta antes de
 * cada `compile`, ver `ponerElEstado` en el banco: 15/30, 15/30, 33/49/67 y 33/49/67; y así una capa nueva pagaba de
 * dos a cinco programas contra un margen que se sumaba una vez.)
 */
const PROGRAMAS_DE_HOY: Readonly<Record<NivelDeLaCiudad, Partial<Record<EstadoDelPintor, number>>>> = {
  0: { principal: 15, 'segunda-pasada': 15 },
  1: { principal: 15, 'segunda-pasada': 15 },
  2: { principal: 17, 'sin-sombras': 16, 'segunda-pasada': 17 },
  3: { principal: 17, 'sin-sombras': 16, 'segunda-pasada': 17 },
};
/**
 * Los programas que un cambio de nivel N1 → N2 enlaza hoy para la ciudad (con el relevo, hasta que releva y diez
 * fotogramas más; sin las capas de prueba), medidos aquí el 25-sep. (57 en la primera versión: la sombra blanda que
 * el banco ponía en cada fotograma sacaba otra variante de cada material.) PRESUPONE EL ARREGLO DEL JUEGO que manda
 * el coordinador en la revisión 2 de la ola 1b: `Atmosfera.tsx` pone `THREE.PCFShadowMap` (no `PCFSoftShadowMap`, que
 * three r185 cambia por la otra en el primer pintado de sombras), y la pone al montar y al cambiar de nivel, no en
 * cada fotograma; el banco lo hace igual (`ponerLaSombraDelNivel`). Con la sombra blanda en el juego este número no
 * vale para el juego (con la blanda en cada fotograma eran 57; sólo al cambiar de nivel, no se ha medido).
 */
const PROGRAMAS_DEL_CAMBIO_DE_HOY = 41;
/**
 * LO QUE UNA CAPA CUESTA EN EL CAMBIO N1 → N2, medido con las capas de prueba del banco el 25-sep: la ciudad vieja con
 * el estado nuevo (el pintado y la segunda pasada) y la nueva (lo mismo), un programa en cada uno. El tope del cambio
 * es lo de hoy más esto por cada capa que N2 deja crecer; si un día una capa cuesta más (o menos) en el cambio, la
 * vacuna de las capas de prueba se pone roja y hay que volver a pensar el tope.
 */
const PROGRAMAS_POR_CAPA_EN_EL_CAMBIO = 4;
/** Las capas que el plan deja crecer, un programa cada una en cada estado: las seis y lo cercano desde N1. */
const margenDeProgramas = (n: NivelDeLaCiudad): number => 6 + (n >= 1 ? 3 : 0);
/** El tope de los programas del cambio N1 → N2 (ver arriba). */
const TOPE_DEL_CAMBIO = PROGRAMAS_DEL_CAMBIO_DE_HOY + margenDeProgramas(2) * PROGRAMAS_POR_CAPA_EN_EL_CAMBIO;

/** El tope de la memoria de la GPU de la ciudad, por nivel, en MiB (§7.3). */
const TOPE_DE_LA_GPU_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 24, 1: 48, 2: 128, 3: 256 };

/**
 * «THREE TIENE SUS GEOMETRÍAS»: las de la CIUDAD, sin las de las capas de prueba, pasan de esto (hoy, 25-sep, 14 en
 * N0-N1 y 15 en N2-N3). Antes se comparaba el total con 10, y las diez capas de prueba ponían diez geometrías: el
 * total pasaba de 10 con la ciudad sin ninguna. Ahora las capas comparten una (`GEOMETRIA_DE_LAS_CAPAS_DE_PRUEBA` en
 * el banco), y el banco dice cuántas ponen para restarlas aquí.
 */
const MINIMO_DE_GEOMETRIAS_DE_LA_CIUDAD = 10;

/** ¿Tiene three las geometrías y las texturas de la ciudad? Las de las capas de prueba no cuentan. */
function threeTieneLaCiudad(memoria: { readonly geometrias: number; readonly texturas: number; readonly geometriasDeLasCapasDePrueba?: number }): boolean {
  const deLasCapas = memoria.geometriasDeLasCapasDePrueba;
  return typeof deLasCapas === 'number' && deLasCapas >= 0 && memoria.geometrias - deLasCapas > MINIMO_DE_GEOMETRIAS_DE_LA_CIUDAD && memoria.texturas > 2;
}

/**
 * LO QUE EL TONO PROPIO DE N0 SUMA A CADA SOMBREADOR: el «hoy» de §7.4 se midió con el banco del analítico, que
 * compilaba con ACES a secas; el juego pinta N0 con el tono propio (`CustomToneMapping`: ACES y la gradación de la
 * noche, `posproceso/tono.ts`), y eso son 42 instrucciones más en los CUATRO materiales, medidas aquí el 25-sep. La
 * prueba de que es eso y nada más: N1, que pinta con ACES al lienzo, da exactamente el «hoy» del plan (7.381, 2.841,
 * 2.072 y 499), y N2-N3, que pintan a un blanco sin mapeo tonal, dan 16 menos (el ACES). El coordinador CONFIRMA
 * este +42 en el tope de §7.4 en N0 (revisión 2 de la ola 1b, 25-sep): el «≤ hoy» de N0 es el de lo que el juego pinta.
 */
const TONO_PROPIO_DE_N0 = 42;

/**
 * §7.4 del plan: las instrucciones estáticas de fxc, tope duro por material y nivel. En N0 el tope es «≤ hoy», y el hoy
 * del estado de pintado de N0 lleva el tono propio (ver arriba).
 */
const TOPES_DE_FXC_DEL_PLAN: Readonly<Record<string, Readonly<Record<NivelDeLaCiudad, number>>>> = {
  fachada: { 0: 6303 + TONO_PROPIO_DE_N0, 1: 7381, 2: 9500, 3: 12000 },
  asfalto: { 0: 2303 + TONO_PROPIO_DE_N0, 1: 2841, 2: 3500, 3: 4500 },
  acera: { 0: 2072 + TONO_PROPIO_DE_N0, 1: 2072, 2: 2800, 3: 3500 },
  mobiliario: { 0: 461 + TONO_PROPIO_DE_N0, 1: 1000, 2: 1500, 3: 2000 },
};
/**
 * El módulo de la fábrica de cada material (donde exportará su `TOPE_DEL_SOMBREADOR_POR_NIVEL`, §5.2.9). Un módulo
 * con varios materiales (`suelo.ts`: el asfalto y la acera) exporta UNA tabla, que es el tope COMÚN de todos ellos
 * (decisión (c) del coordinador, revisión 2 de la ola 1b); §7.4 sigue dando a cada uno el suyo, y `topeDeFxc` se
 * queda con el menor de los dos para cada material.
 */
const MODULO_DEL_MATERIAL: Readonly<Record<string, ModuloDelMaterial>> = {
  fachada: deLasFachadas,
  asfalto: delSuelo,
  acera: delSuelo,
  mobiliario: deLosMateriales,
};

const MiB = 1024 * 1024;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARBOL = fileURLToPath(new URL('../../', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');

/* ═══════════════════════════════ LOS JUECES ═══════════════════════════════ */

/** ¿Caben los programas de un nivel y estado en su tope? */
function cabenLosProgramas(n: NivelDeLaCiudad, estado: EstadoDelPintor, programas: number): boolean {
  const hoy = PROGRAMAS_DE_HOY[n][estado];
  return hoy !== undefined && programas <= hoy + margenDeProgramas(n);
}

/** Lo que cuestan las `k` primeras capas de prueba. */
const primeras = (capas: readonly number[], k: number): number => capas.slice(0, k).reduce((s, x) => s + x, 0);

/**
 * LA VACUNA DEL TOPE, con las capas de prueba del banco: cada una enlazó algún programa (pasó de verdad por ahí), lo de
 * `hoy` más lo que cuestan las `margen` primeras cabe en `tope`, y con una más ya no. Se mide contra lo de HOY
 * anotado y no contra lo que la ciudad enlace ese día, para que siga valiendo cuando lleguen las capas de verdad.
 */
function vacunaDelTope(hoy: number, margen: number, tope: number, capas: readonly number[]): boolean {
  return capas.length > margen && capas.every((x) => x >= 1) && hoy + primeras(capas, margen) <= tope && hoy + primeras(capas, margen + 1) > tope;
}

/** El módulo de un material, o lo que se le pase (la vacuna). */
type ModuloDelMaterial = Readonly<Record<string, unknown>>;

/**
 * El tope de fxc de un material y un nivel: el del plan, o el de su módulo si es menor. Si el módulo exporta
 * `TOPE_DEL_SOMBREADOR_POR_NIVEL` con una forma que no se lee (sin `instrucciones` y `lecturas` numéricas en ese
 * nivel: la decisión 1 del acta), eso es un problema, y no un «no hay tabla».
 */
function topeDeFxc(material: string, n: NivelDeLaCiudad, modulo: ModuloDelMaterial | undefined = MODULO_DEL_MATERIAL[material]): { readonly tope: number; readonly de: string; readonly problema: string | null } {
  const plan = TOPES_DE_FXC_DEL_PLAN[material]?.[n] ?? 0;
  if (modulo === undefined || !('TOPE_DEL_SOMBREADOR_POR_NIVEL' in modulo)) return { tope: plan, de: '§7.4', problema: null };
  const tabla = modulo['TOPE_DEL_SOMBREADOR_POR_NIVEL'] as Readonly<Record<number, unknown>> | null | undefined;
  const e = (typeof tabla === 'object' && tabla !== null ? tabla[n] : undefined) as { instrucciones?: unknown; lecturas?: unknown } | undefined;
  const numero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
  if (typeof e !== 'object' || e === null || !numero(e.instrucciones) || !numero(e.lecturas)) {
    return { tope: plan, de: '§7.4', problema: `N${String(n)} ${material}: su módulo exporta TOPE_DEL_SOMBREADOR_POR_NIVEL, pero su nivel ${String(n)} no es { instrucciones: number; lecturas: number } (${JSON.stringify(e)})` };
  }
  if (e.instrucciones < plan) return { tope: e.instrucciones, de: 'su módulo', problema: null };
  return { tope: plan, de: '§7.4', problema: null };
}

/** Lo que dice fxc de un HLSL: instrucciones estáticas y lecturas de textura, o el error. */
interface Medida {
  readonly instrucciones: number;
  readonly lecturas: number;
}

/**
 * EL HLSL DE ANGLE, COMPLETO: ANGLE deja tres marcas (`@@ PIXEL OUTPUT @@`, `@@ PIXEL MAIN PARAMETERS @@` y
 * `@@ MAIN PROLOGUE @@`) que rellena al enlazar. Se rellenan con una firma mínima de entrada y salida (como el banco
 * del analítico del plan, `mat-analitico/banco/fxc.mjs`): los `varying` como TEXCOORDn, `gl_FragCoord` y
 * `gl_FrontFacing` si se usan, y cada salida `out_*` en su SV_TARGET.
 */
function hlslCompleto(h: string): string {
  const vars = [...h.matchAll(/^static\s+(nointerpolation\s+)?(float\d?|int\d?|uint\d?)\s+(_v\w+)\s*=/gm)].map((m) => [m[1] ?? '', m[2] as string, m[3] as string] as const);
  const usaFC = /static float4 gl_FragCoord/.test(h);
  const usaFF = /static bool gl_FrontFacing/.test(h);
  const salidas = [...h.matchAll(/^static float4 (out_\w+)\s*=/gm)].map((m) => m[1] as string);
  const params = vars.map(([interp, t, n], i) => `${interp}${t} in${n} : TEXCOORD${String(i)}`);
  params.push('float4 in_fc : SV_Position');
  if (usaFF) params.push('bool in_ff : SV_IsFrontFace');
  const prologo = vars.map(([, , n]) => `${n} = in${n};`).join('\n') + (usaFC ? '\ngl_FragCoord = in_fc;' : '') + (usaFF ? '\ngl_FrontFacing = in_ff;' : '');
  const salida = `struct PS_OUTPUT { ${salidas.map((s, i) => `float4 ${s} : SV_TARGET${String(i)};`).join(' ')} };
PS_OUTPUT generateOutput() { PS_OUTPUT o; ${salidas.map((s) => `o.${s} = ${s};`).join(' ')} return o; }`;
  return h.replace('@@ PIXEL OUTPUT @@', salida).replace('@@ PIXEL MAIN PARAMETERS @@', params.join(', ')).replace('@@ MAIN PROLOGUE @@', prologo);
}

/** El ensamblador de fxc, leído: «Approximately N instruction slots used» y las líneas `sample*`. */
function leerElEnsamblador(asm: string): Medida | null {
  const m = /Approximately (\d+) instruction slots used/.exec(asm);
  if (m === null) return null;
  return { instrucciones: Number(m[1]), lecturas: asm.split(/\r?\n/).filter((l) => /^\s*sample/.test(l)).length };
}

/** fxc, si lo hay: el de `FXC` o el más nuevo del Windows SDK. */
function buscarFxc(): string | null {
  const pedido = process.env['FXC'];
  if (pedido !== undefined && pedido !== '') return existsSync(pedido) ? pedido : null;
  const raiz = 'C:/Program Files (x86)/Windows Kits/10/bin';
  if (!existsSync(raiz)) return null;
  const versiones = readdirSync(raiz)
    .filter((v) => /^\d+\.\d+\.\d+\.\d+$/.test(v) && existsSync(join(raiz, v, 'x64', 'fxc.exe')))
    .sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 4; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
      return 0;
    });
  const v = versiones[versiones.length - 1];
  return v === undefined ? null : join(raiz, v, 'x64', 'fxc.exe');
}

/* ═══════════════════════════════ EL BANCO ═══════════════════════════════ */

/** Dónde van el perfil de Edge y lo de fxc: `CARPETA_GL`, o `%TEMP%` (ver la cabecera). */
function carpetaDeTrabajo(): string {
  const pedida = process.env['CARPETA_GL'];
  return pedida !== undefined && pedida !== '' ? pedida : tmpdir();
}

async function elBanco(puerto: string): Promise<{ readonly resultado: ResultadoDelBancoGl | null; readonly arbolDelDom: string | null; readonly salto: string | null }> {
  if (!existsSync(EDGE)) return { resultado: null, arbolDelDom: null, salto: `no está Edge en ${EDGE}` };
  const sonda = `http://localhost:${puerto}/sala/@fs/${ARBOL}/escritorio/banco-quiebro-gl.html`;
  let estado = 0;
  try {
    estado = (await fetch(sonda)).status;
  } catch {
    return { resultado: null, arbolDelDom: null, salto: `no hay servidor en el puerto ${puerto}` };
  }
  if (estado !== 200) return { resultado: null, arbolDelDom: null, salto: `el servidor del puerto ${puerto} no sirve ESTE árbol (${ARBOL}): contesta ${String(estado)} a ${sonda}` };
  const perfil = process.env['PERFIL_EDGE'] ?? join(carpetaDeTrabajo(), `quiebro-gl-edge-${puerto}`);
  mkdirSync(perfil, { recursive: true });
  const r = spawnSync(
    EDGE,
    [
      '--headless=new',
      '--disable-gpu-sandbox',
      '--use-angle=d3d11',
      '--enable-unsafe-swiftshader',
      `--user-data-dir=${perfil}`,
      '--window-size=400,300',
      '--virtual-time-budget=180000',
      '--dump-dom',
      `http://localhost:${puerto}/sala/banco-quiebro-gl.html`,
    ],
    { encoding: 'utf8', timeout: 900_000, maxBuffer: 256 * 1024 * 1024 },
  );
  const dom = r.stdout ?? '';
  const arbol = /<div id="banco-gl-arbol" data-arbol="([^"]*)"/.exec(dom)?.[1] ?? null;
  const m = /<pre id="resultado-gl"[^>]*>([\s\S]*?)<\/pre>/.exec(dom);
  if (m === null) return { resultado: null, arbolDelDom: arbol, salto: null };
  const json = (m[1] as string).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return { resultado: JSON.parse(json) as ResultadoDelBancoGl, arbolDelDom: arbol, salto: null };
}

/* ═══════════════════════════════ LAS COMPROBACIONES ═══════════════════════════════ */

/** Las comprobaciones que el guion hace hoy con todo a mano (servidor de este árbol, Edge y fxc). Con menos, sale con 2. */
const ESCRITAS = 37;

async function principal(): Promise<void> {
  paso('el banco de la GPU, del Vite de ESTE árbol');
  const puerto = process.env['PUERTO'];
  if (puerto === undefined || puerto === '') {
    nota('sin PUERTO: no se ha mirado nada (PUERTO=<el Vite de este árbol> npm run verify:quiebro-gl -w escritorio)');
    return;
  }
  const { resultado, arbolDelDom, salto } = await elBanco(puerto);
  if (salto !== null) {
    nota(`${salto}: no se ha mirado nada`);
    return;
  }
  const normal = (s: string | null): string => (s ?? '').replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
  comprobar(`el DOM del banco dice que sale de ESTE árbol (${ARBOL})`, arbolDelDom !== null && normal(arbolDelDom) === normal(ARBOL), arbolDelDom);
  if (!comprobar('el banco dejó su resultado (Edge lo abrió y acabó)', resultado !== null)) return;
  const r = resultado as ResultadoDelBancoGl;
  nota(`gráfica: ${r.grafica}; extensiones: ${JSON.stringify(r.extensiones)}`);
  comprobar('el banco acabó sin errores', r.errores.length === 0, r.errores);

  paso('(3) la paridad GLSL ↔ JS, evaluada en la GPU');
  const p = r.paridad;
  if (p !== null) nota(`${String(p.semillas)} semillas; distintas de JS: ${JSON.stringify(p.distintas)}; con la copia envenenada: ${JSON.stringify(p.vacuna)}`);
  comprobar('en 1.000 semillas, encendida, queTienda, colorDeLuz, huecoQ y la tienda de 6 m dan en la GPU lo mismo que en JS', p !== null && p.semillas >= 1000 && Object.keys(p.distintas).length === 5 && Object.values(p.distintas).every((d) => d === 0), p);
  comprobar('vacuna: con un umbral cambiado en una copia del GLSL de cada una, las cinco dan distinto', p !== null && Object.keys(p.vacuna).length === 5 && Object.values(p.vacuna).every((d) => d > 0), p?.vacuna);

  paso('(9) los materiales de la ciudad enlazan en N0-N3, en cada estado del pintor, y sus programas caben');
  comprobar('el banco miró los cuatro niveles', r.niveles.length === 4 && NIVELES_DE_LA_CIUDAD.every((n) => r.niveles.some((x) => x.nivel === n)), r.niveles.map((x) => x.nivel));
  for (const nivel of r.niveles) {
    const n = nivel.nivel;
    const margen = margenDeProgramas(n);
    nota(`N${String(n)} (${nivel.camino}), programas de un pintor nuevo por estado: ${nivel.estados.map((e) => `${e.estado} ${String(e.programas)}`).join(' · ')}; memoria de three ${String(nivel.memoria.geometrias)} geometrías (${String(nivel.memoria.geometriasDeLasCapasDePrueba)} de las capas de prueba) y ${String(nivel.memoria.texturas)} texturas; libro ${(nivel.libro.total / MiB).toFixed(1)} MiB`);
    nota(`    las ${String(nivel.estados[0]?.deLasCapasDePrueba.length ?? 0)} capas de prueba, programas de cada una: ${nivel.estados.map((e) => `${e.estado} ${JSON.stringify(e.deLasCapasDePrueba)}`).join(' · ')}`);
    const esperados: EstadoDelPintor[] = n >= 2 ? ['principal', 'sin-sombras', 'segunda-pasada'] : ['principal', 'segunda-pasada'];
    comprobar(`N${String(n)}: se pintó en los estados ${esperados.join(', ')}, y todo programa enlazó`, esperados.every((e) => nivel.estados.some((x) => x.estado === e)) && nivel.estados.every((e) => e.sinEnlazar.length === 0 && e.programas > 3), nivel.estados);
    for (const e of nivel.estados) {
      const hoy = PROGRAMAS_DE_HOY[n][e.estado];
      comprobar(`N${String(n)} ${e.estado}: ${String(e.programas)} programas, no más que los ${String(hoy)} de hoy + ${String(margen)}`, cabenLosProgramas(n, e.estado, e.programas), { estado: e.estado, programas: e.programas, sinEnlazar: e.sinEnlazar });
    }
    comprobar(
      `N${String(n)}, vacuna del tope: con las capas de prueba montadas en la ciudad, en cada estado lo de hoy más ${String(margen)} capas cabe en su tope y con una más ya no`,
      nivel.estados.length === esperados.length &&
        nivel.estados.every((e) => {
          const hoy = PROGRAMAS_DE_HOY[n][e.estado];
          return hoy !== undefined && vacunaDelTope(hoy, margen, hoy + margen, e.deLasCapasDePrueba);
        }),
      nivel.estados.map((e) => ({ estado: e.estado, capas: e.deLasCapasDePrueba })),
    );
    comprobar(
      `N${String(n)}: el libro de bytes cabe en la GPU (${(nivel.libro.total / MiB).toFixed(1)} de ${String(TOPE_DE_LA_GPU_POR_NIVEL[n])} MiB) y three tiene sus geometrías (más de ${String(MINIMO_DE_GEOMETRIAS_DE_LA_CIUDAD)} sin las de las capas de prueba) y texturas`,
      nivel.libro.total > 0 && nivel.libro.total <= TOPE_DE_LA_GPU_POR_NIVEL[n] * MiB && threeTieneLaCiudad(nivel.memoria),
      { libro: nivel.libro, memoria: nivel.memoria },
    );
  }
  const v = r.vacunas;
  comprobar('vacuna: un material con una línea que no es GLSL en una copia de su retoque NO enlaza, y deja su diagnóstico', v.enlace !== null && !v.enlace.enlazado && v.enlace.diagnosticos >= 1, v.enlace);
  /* EL JUEZ de la vacuna del tope: una capa que cuesta dos programas por estado (lo que pasaba contando acumulado) no deja entrar el margen; una capa que no enlazó nada no vale. */
  const unaPorCapa = Array.from({ length: 10 }, () => 1);
  comprobar(
    'vacuna del juez del tope: con capas de un programa entra el margen justo; con capas de dos (el conteo acumulado) no, y una capa que no enlazó nada tampoco vale',
    vacunaDelTope(30, 6, 36, unaPorCapa) && !vacunaDelTope(30, 6, 36, unaPorCapa.map(() => 2)) && !vacunaDelTope(30, 6, 36, unaPorCapa.map((x, k) => (k === 3 ? 0 : x))) && !vacunaDelTope(30, 6, 37, unaPorCapa),
  );
  /* EL JUEZ de la memoria: con la ciudad casi vacía, las diez capas de prueba con una caja cada una (lo de antes) ya no la hacen pasar; tampoco la una compartida sola, ni un banco que no diga cuántas son de las capas. */
  const hoyEnN0 = { geometrias: 15, texturas: 6, geometriasDeLasCapasDePrueba: 1 };
  comprobar(
    'vacuna del juez de la memoria: la ciudad de hoy (15 geometrías, 1 de las capas) pasa; 14 con 10 de las capas (4 de la ciudad), la de las capas sola o un resultado que no diga las de las capas, no',
    threeTieneLaCiudad(hoyEnN0) &&
      !threeTieneLaCiudad({ geometrias: 14, texturas: 6, geometriasDeLasCapasDePrueba: 10 }) &&
      !threeTieneLaCiudad({ geometrias: 1, texturas: 6, geometriasDeLasCapasDePrueba: 1 }) &&
      !threeTieneLaCiudad({ geometrias: 24, texturas: 6 }),
  );

  paso('un cambio de nivel N1 → N2 con el relevo: programas enlazados y bytes subidos');
  const c = r.cambio;
  if (c !== null) nota(`${String(c.nuevos)} programas nuevos de la ciudad (de ${String(c.antes)} a ${String(c.despues)} contando las capas de prueba, que se llevan ${JSON.stringify(c.deLasCapasDePrueba)}), ${(c.bytes / MiB).toFixed(1)} MiB subidos por el relevo más ${(c.luz / MiB).toFixed(1)} de luz, en ${String(c.fotogramas)} fotogramas; relevos ${String(c.relevos)}`);
  comprobar(
    `el cambio N1 → N2 releva, todo lo que enlaza enlaza bien, no enlaza para la ciudad más que los ${String(PROGRAMAS_DEL_CAMBIO_DE_HOY)} programas de hoy + ${String(margenDeProgramas(2))} capas × ${String(PROGRAMAS_POR_CAPA_EN_EL_CAMBIO)} (${String(TOPE_DEL_CAMBIO)}), y no sube más de lo que cabe en la GPU de N2`,
    c !== null && c.relevos >= 1 && c.sinEnlazar.length === 0 && c.nuevos > 3 && c.nuevos <= TOPE_DEL_CAMBIO && c.bytes > 0 && c.bytes + c.luz <= TOPE_DE_LA_GPU_POR_NIVEL[2] * MiB,
    c,
  );
  comprobar(
    `vacuna del tope del cambio: con las capas de prueba en las dos ciudades, lo de hoy más ${String(margenDeProgramas(2))} capas cabe en ${String(TOPE_DEL_CAMBIO)} y con una más ya no`,
    c !== null && vacunaDelTope(PROGRAMAS_DEL_CAMBIO_DE_HOY, margenDeProgramas(2), TOPE_DEL_CAMBIO, c.deLasCapasDePrueba),
    c?.deLasCapasDePrueba,
  );

  paso('(10) la pérdida de contexto (sólo informe hasta la ola 4)');
  const x = r.contexto;
  nota(x === null ? 'sin WEBGL_lose_context: no se ha podido forzar' : `luminancia media ${x.antes.toFixed(2)} antes y ${x.despues.toFixed(2)} después (${x.restaurado ? 'restaurado' : 'SIN restaurar'}); nadie escucha la pérdida hasta la ola 4`);

  paso('§7.4 con fxc: las instrucciones del HLSL de ANGLE, contra su tope');
  const fxc = buscarFxc();
  if (fxc === null) {
    nota(`sin fxc (${process.env['FXC'] ?? 'Windows Kits/10/bin/*/x64/fxc.exe'}): no se han mirado los topes del sombreador, y eso no es verde`);
    return;
  }
  if (!r.extensiones.depuracion) {
    nota('sin WEBGL_debug_shaders no hay HLSL de ANGLE que medir: no se han mirado los topes del sombreador');
    return;
  }
  const carpeta = join(carpetaDeTrabajo(), `quiebro-gl-fxc-${puerto}`);
  mkdirSync(carpeta, { recursive: true });
  const filas: string[] = [];
  const pasados: string[] = [];
  let medidos = 0;
  for (const nivel of r.niveles) {
    for (const material of Object.keys(TOPES_DE_FXC_DEL_PLAN)) {
      const h = nivel.hlsl[material];
      if (h === null || h === undefined) {
        pasados.push(`N${String(nivel.nivel)} ${material}: sin HLSL`);
        continue;
      }
      const base = join(carpeta, `${material}-n${String(nivel.nivel)}`);
      writeFileSync(`${base}.hlsl`, hlslCompleto(h));
      let medida: Medida | null = null;
      try {
        execFileSync(fxc, ['/nologo', '/T', 'ps_5_0', '/E', 'main', '/O3', '/Fc', `${base}.asm`, `${base}.hlsl`], { stdio: 'pipe', timeout: 600_000 });
        medida = leerElEnsamblador(readFileSync(`${base}.asm`, 'utf8'));
      } catch (e) {
        const err = e as { stderr?: Buffer | string };
        pasados.push(`N${String(nivel.nivel)} ${material}: fxc no lo compila (${String(err.stderr ?? e).slice(0, 300)})`);
        continue;
      }
      if (medida === null) {
        pasados.push(`N${String(nivel.nivel)} ${material}: fxc no dijo sus instrucciones`);
        continue;
      }
      medidos++;
      const t = topeDeFxc(material, nivel.nivel);
      if (t.problema !== null) pasados.push(t.problema);
      filas.push(`N${String(nivel.nivel)} ${material} ${String(medida.instrucciones)} de ${String(t.tope)} (${t.de}); ${String(medida.lecturas)} sample en el ensamblador (sólo informe: las lecturas de §7.4 las juzga verify:quiebro-materia)`);
      if (medida.instrucciones > t.tope) pasados.push(`N${String(nivel.nivel)} ${material}: ${String(medida.instrucciones)} instrucciones > ${String(t.tope)} (${t.de})`);
    }
  }
  for (const f of filas) nota(f);
  comprobar(`las instrucciones de la fachada, el asfalto, la acera y el mobiliario caben en su tope en N0-N3 (${String(medidos)} de 16 medidos con ${fxc})`, pasados.length === 0 && medidos === 16, pasados);
  /* LA VACUNA del juez de fxc: un ensamblador con una instrucción más que el tope de la fachada de N0. */
  const tope = topeDeFxc('fachada', 0).tope;
  const deMas = leerElEnsamblador(`// Approximately ${String(tope + 1)} instruction slots used\n  sample_l r0.xyzw, v1.xy, t0.xyzw, s0, l(0)`);
  comprobar('vacuna: un sombreador con una instrucción más que su tope sale rojo (y el lector del ensamblador cuenta sus lecturas)', deMas !== null && deMas.instrucciones > tope && deMas.lecturas === 1, deMas);
  /* LA VACUNA de la tabla del módulo: con la forma vieja (un número por nivel) es un problema; bien formada y menor que §7.4, manda ella. */
  const niveles = (f: (n: number) => unknown): Record<number, unknown> => ({ 0: f(0), 1: f(1), 2: f(2), 3: f(3) });
  const conFormaVieja = topeDeFxc('mobiliario', 1, { TOPE_DEL_SOMBREADOR_POR_NIVEL: { 0: 461, 1: 1000, 2: 1500, 3: 2000 } });
  const sinLecturas = topeDeFxc('mobiliario', 1, { TOPE_DEL_SOMBREADOR_POR_NIVEL: niveles(() => ({ instrucciones: 900 })) });
  const conMenor = topeDeFxc('mobiliario', 1, { TOPE_DEL_SOMBREADOR_POR_NIVEL: niveles((n) => ({ instrucciones: 400 + 250 * n, lecturas: 3 })) });
  const conMayor = topeDeFxc('mobiliario', 1, { TOPE_DEL_SOMBREADOR_POR_NIVEL: niveles((n) => ({ instrucciones: 9000 + n, lecturas: 3 })) });
  const sinTabla = topeDeFxc('mobiliario', 1, {});
  comprobar(
    'vacuna: una TOPE_DEL_SOMBREADOR_POR_NIVEL del módulo con la forma vieja o sin lecturas sale roja; bien formada y menor que §7.4 manda ella, y mayor o sin tabla manda §7.4',
    conFormaVieja.problema !== null && sinLecturas.problema !== null && conMenor.problema === null && conMenor.tope === 650 && conMenor.de === 'su módulo' && conMayor.problema === null && conMayor.tope === 1000 && sinTabla.problema === null && sinTabla.tope === 1000,
    { conFormaVieja, sinLecturas, conMenor, conMayor, sinTabla },
  );
}

await principal();
terminar({
  escritas: ESCRITAS,
  enVerde:
    'La ciudad del Quiebro, en la GPU de verdad y servida por este árbol: las reglas gemelas dan lo mismo en GLSL que en JS, todo material enlaza en N0-N3 y en cada estado del pintor con sus programas en su tope, un cambio N1 → N2 enlaza y sube lo que le cabe, su libro de bytes cabe en §7.3 y sus sombreadores en las instrucciones de §7.4.',
});
