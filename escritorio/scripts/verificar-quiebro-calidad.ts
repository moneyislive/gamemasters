/**
 * EL COMPROBADOR DE LA IMAGEN DEL QUIEBRO: los niveles, el gobernador, el sondeo, el camino de
 * pintado, la gradación, el tono de N0 y los uniformes de los sombreadores. Todo en Node, sin lienzo.
 *
 * ═══ QUÉ SE PRUEBA Y QUÉ NO ═══
 *
 * Se prueba lo que DECIDE: qué nivel y qué DPR con cada serie de tiempos, con qué nivel se arranca
 * con cada aparato inventado, qué camino lleva cada nivel, qué color sale de la gradación y si la LUT
 * es esa fórmula, si el tono de N0 se puede poner en la three instalada, y si cada sombreador declara
 * exactamente los uniformes que su material le da. Lo que NO se prueba aquí es que se VEA bien: eso
 * es el banco (`escritorio/banco-quiebro-imagen.html`), con los ojos.
 *
 * ═══ LAS SERIES DE TIEMPOS ═══
 *
 * El gobernador es puro: cada fotograma es una muestra `{ms, oculta, llamadas, triangulos}`. Las
 * series son las que un aparato de verdad produce: 16,7 ms a 60 Hz con sincronía; 30 ms un aparato
 * que no llega; 20 ms uno que va justo pero no cae (la histéresis); 1000 ms la pestaña oculta a 1 Hz.
 * Cada regla del §8 del diseño tiene su serie y, donde tiene sentido, su VACUNA: la misma serie con
 * la condición quitada, que tiene que dar lo contrario (así se sabe que la comprobación mira lo que
 * dice mirar y no pasa en verde por casualidad).
 *
 * Se corre con `npx tsx scripts/verificar-quiebro-calidad.ts` desde `escritorio/`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { arnes } from '../../server/scripts/arnes';
import { leerElVeredicto } from '../../escenas/compuerta-de-botas';
import type { NivelDeCalidad } from '../src/quiebro/calidad/niveles';
import {
  IGUAL_EN_TODOS_LOS_NIVELES,
  NIVELES_DE_CALIDAD,
  TABLA_DE_NIVELES,
  calidadDeFuera,
  comoNivel,
  escaleraDeDpr,
} from '../src/quiebro/calidad/niveles';
import type { CapacidadesDelAparato } from '../src/quiebro/calidad/capacidades';
import { esGraficaDedicadaDePc, veredictoDelSondeo } from '../src/quiebro/calidad/capacidades';
import type { CambioDelGobernador, EstadoDelGobernador, MuestraDelFotograma } from '../src/quiebro/calidad/gobernador';
import {
  DURACION_DE_LA_PRUEBA_MS,
  FOTOGRAMAS_DE_GRACIA,
  HOLGURA_PARA_SUBIR_MS,
  arranqueConRecuerdo,
  dprDe,
  gobernadorNuevo,
  gobernar,
  leerElRecuerdo,
  recuerdoDe,
  seRecuerda,
} from '../src/quiebro/calidad/gobernador';
import { caminoPara } from '../src/quiebro/posproceso/camino';
import {
  GRADACION_DE_LA_NOCHE,
  LADO_DE_LA_LUT,
  flotanteGlsl,
  glslDeLaGradacion,
  gradar,
  tablaDeLaLut,
} from '../src/quiebro/posproceso/gradacion';
import {
  DESENFOCAR,
  EXTRAER,
  FOGONAZO,
  LADO_DE_LA_LUT_EN_EL_UBER,
  UBER,
  UNIFORMES_DE_DESENFOCAR,
  UNIFORMES_DE_EXTRAER,
  UNIFORMES_DEL_FOGONAZO,
  UNIFORMES_DEL_UBER,
  UNIFORMES_DEL_VELO,
  VELO,
  VERTICE_DE_PANTALLA,
} from '../src/quiebro/posproceso/sombreadores';

/**
 * Las lecturas de textura del uber antes del rayo (contadas en el código del uber del contrato, 9641b1b, con los trozos
 * que interpola y sin comentarios): el rayo no suma ninguna. Las `texture(` a secas, y las llamadas a `leer(` (el
 * ayudante del uber que lee la imagen: cada llamada es una lectura más, o seis en el bucle del Remanso), sin contar su
 * definición: una llamada nueva a `leer` (un desenfoque en el golpe, por ejemplo) no cambia las `texture(`.
 */
const LECTURAS_DEL_UBER_ANTES_DEL_RAYO = 8;
const LLAMADAS_A_LEER_ANTES_DEL_RAYO = 4;
import { LINEA_DE_FABRICA, ponerElTonoPropio, textoDelTonoPropio } from '../src/quiebro/posproceso/tono';
import { ShaderChunk } from 'three';
import * as THREE from 'three';
import type { Compilador } from '../src/quiebro/calidad/precompilar';
import {
  BloqueAlCambiar,
  Compilacion,
  PINTADOS_EN_BLOQUE,
  RelevoDePieza,
  alPintarLaEscena,
  claveDelPintado,
  compilarEnBloque,
  guardarLosProgramas,
  materialesGuardados,
} from '../src/quiebro/calidad/precompilar';

const { comprobar, paso, nota, terminar } = arnes();

/* ─────────────────────────────── Utilidades ─────────────────────────────── */

/**
 * Cuántas tablas `*_POR_NIVEL` tiene la ciudad como poco (las 8 del 25-sep: el grado del barrio y de los coches, lo
 * cercano, el téxel de la luz, y las octavas, las lecturas y los PCG de la materia). Si el filtro dejara de verlas,
 * «ninguna baja» saldría verde sin mirar nada.
 */
const MINIMO_DE_PALANCAS = 8;

/** Un nombre de palanca por nivel. */
const NOMBRE_DE_PALANCA = /^[A-Z][A-Z0-9_]*_POR_NIVEL$/;

/**
 * EL TEXTO SIN COMENTARIOS, a ojo: quita los comentarios de bloque y de línea con expresiones regulares, sin saber qué
 * es una cadena. Con un '/*' DENTRO de una cadena se come el código hasta el siguiente cierre, declaraciones
 * incluidas. Por eso sólo sirve para la lista secundaria de `descubrirLasPalancas` (las declaradas que no se
 * exportan), y NUNCA para decidir qué se mira: eso lo deciden el texto crudo (`puedeTenerPalancas`) y lo que el
 * módulo exporta de verdad.
 */
const sinComentarios = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

/**
 * LAS PALANCAS DE UN FICHERO, por dos caminos (revisiones de la ola 1b): las que su módulo EXPORTA de verdad (las
 * claves del módulo importado con nombre `*_POR_NIVEL`), que son las que se miran, TODAS; y las que su código (sin
 * comentarios ni `import`) DECLARA con ese nombre —con `const`, `let` o `var`, o con un `as` de una lista de
 * `export { … }`—, que sólo sirven para poner en rojo una declarada que el módulo no exporta (no se puede mirar).
 * El texto sin comentarios puede perder alguna declarada (ver `sinComentarios`): entonces esa lista se queda corta,
 * pero ninguna tabla exportada deja de mirarse.
 */
function descubrirLasPalancas(codigo: string, exportadas: readonly string[]): { readonly aMirar: string[]; readonly sinExportar: string[] } {
  const sinImports = sinComentarios(codigo).replace(/\bimport\s[^;]*;/g, '');
  const declaradas = new Set<string>();
  for (const m of sinImports.matchAll(/\b(?:const|let|var)\s+([A-Z][A-Z0-9_]*_POR_NIVEL)\b/g)) declaradas.add(m[1] as string);
  for (const m of sinImports.matchAll(/\bas\s+([A-Z][A-Z0-9_]*_POR_NIVEL)\b/g)) declaradas.add(m[1] as string);
  const aMirar = exportadas.filter((k) => NOMBRE_DE_PALANCA.test(k));
  return { aMirar, sinExportar: [...declaradas].filter((d) => !aMirar.includes(d)) };
}

/**
 * ¿Hay que importar este fichero para buscarle palancas? Si su texto CRUDO nombra `_POR_NIVEL` en cualquier sitio
 * (revisión 2 de la ola 1b): sin quitar comentarios y sin expresiones que sepan qué es una declaración. Importar de
 * más no cuesta nada (lo que se mira son las claves exportadas); decidirlo con el texto sin comentarios dejaba sin
 * importar un fichero con un '/*' dentro de una cadena antes de su tabla, y su tabla sin mirar, en verde.
 */
function puedeTenerPalancas(crudo: string): boolean {
  return crudo.includes('_POR_NIVEL');
}

interface TablaPorNivel {
  readonly fichero: string;
  readonly nombre: string;
  readonly tabla: unknown;
}

/**
 * LAS TABLAS QUE SE MIRAN DE UN FICHERO, y lo que está mal en él: si su texto crudo nombra `_POR_NIVEL`, se importa
 * (con `importar`) y se juntan TODAS sus claves exportadas `*_POR_NIVEL`, más un problema por cada declarada que no
 * se exporta.
 */
async function palancasDelFichero(fichero: string, crudo: string, importar: () => Promise<Record<string, unknown>>): Promise<{ readonly tablas: TablaPorNivel[]; readonly problemas: string[] }> {
  if (!puedeTenerPalancas(crudo)) return { tablas: [], problemas: [] };
  let modulo: Record<string, unknown>;
  try {
    modulo = await importar();
  } catch (e) {
    return { tablas: [], problemas: [`${fichero}: no se puede importar para mirar sus *_POR_NIVEL (${String(e).slice(0, 160)})`] };
  }
  const d = descubrirLasPalancas(crudo, Object.keys(modulo));
  return {
    tablas: d.aMirar.map((nombre) => ({ fichero, nombre, tabla: modulo[nombre] })),
    problemas: d.sinExportar.map((nombre) => `${fichero}: ${nombre} no se exporta (§5.2.7: se exporta con su nombre, y así se puede mirar)`),
  };
}

/**
 * EL JUEZ DE UNA PALANCA POR NIVEL (plan del detalle, §5.2.7, y la decisión 1 del acta de la ola 1): `tabla` tiene los
 * niveles 0, 1, 2 y 3, y lo que da no baja al subir de nivel. Un número no baja; un sí/no no pasa de sí a no; una
 * tabla de objetos se mira CAMPO A CAMPO, con la misma regla en cada campo. Devuelve lo que está mal.
 */
function juzgarLaPalanca(nombre: string, tabla: unknown): string[] {
  if (tabla === null || typeof tabla !== 'object') return [`${nombre} no es una tabla por nivel`];
  const t = tabla as Record<string, unknown>;
  const faltan = [0, 1, 2, 3].filter((n) => !(String(n) in t));
  if (faltan.length > 0) return [`${nombre} no tiene los niveles ${faltan.join(', ')}`];
  const problemas: string[] = [];
  const valorQueSeMira = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'boolean' ? (v ? 1 : 0) : null);
  const serie = (campo: string | null): void => {
    const valores = [0, 1, 2, 3].map((n) => {
      const v = t[String(n)];
      return campo === null ? v : (v as Record<string, unknown> | null)?.[campo];
    });
    const numeros = valores.map(valorQueSeMira);
    const donde = campo === null ? nombre : `${nombre}.${campo}`;
    if (numeros.some((x) => x === null)) {
      problemas.push(`${donde}: ${JSON.stringify(valores)} no son números ni sí/no`);
      return;
    }
    for (let n = 1; n < 4; n++) {
      if ((numeros[n] as number) < (numeros[n - 1] as number)) problemas.push(`${donde} baja de N${String(n - 1)} a N${String(n)}: ${JSON.stringify(valores)}`);
    }
  };
  const primero = t['0'];
  if (primero !== null && typeof primero === 'object') {
    const campos = new Set<string>();
    for (const n of [0, 1, 2, 3]) {
      const v = t[String(n)];
      if (v === null || typeof v !== 'object') {
        problemas.push(`${nombre}: el nivel ${String(n)} no es un objeto como el 0`);
        return problemas;
      }
      for (const c of Object.keys(v)) campos.add(c);
    }
    if (campos.size === 0) problemas.push(`${nombre}: sus objetos no tienen campos`);
    for (const c of campos) serie(c);
  } else serie(null);
  return problemas;
}

const A_60_HZ = 1000 / 60;

interface Recorrido {
  readonly estado: EstadoDelGobernador;
  readonly cambios: readonly CambioDelGobernador[];
  /** En qué fotograma (desde el principio del recorrido) ocurrió cada cambio. */
  readonly cuando: readonly number[];
}

function muestra(ms: number, extra: Partial<MuestraDelFotograma> = {}): MuestraDelFotograma {
  return { ms, oculta: false, llamadas: 40, triangulos: 80_000, ...extra };
}

/** Pasa `n` fotogramas iguales (o los que diga la función) por el gobernador. */
function correr(
  estado: EstadoDelGobernador,
  n: number,
  cada: MuestraDelFotograma | ((i: number) => MuestraDelFotograma),
): Recorrido {
  let e = estado;
  const cambios: CambioDelGobernador[] = [];
  const cuando: number[] = [];
  for (let i = 0; i < n; i++) {
    const m = typeof cada === 'function' ? cada(i) : cada;
    const p = gobernar(e, m);
    e = p.estado;
    if (p.cambio !== null) {
      cambios.push(p.cambio);
      cuando.push(i);
    }
  }
  return { estado: e, cambios, cuando };
}

function segundos(s: number, ms: number = A_60_HZ): number {
  return Math.ceil((s * 1000) / ms);
}

function motivos(r: Recorrido): string[] {
  return r.cambios.map((c) => `${c.motivo}:N${String(c.a.nivel)}@${String(c.a.dpr)}`);
}

/** Un gobernador ya puesto en un nivel y un peldaño, sin gracia, para empezar una serie en frío. */
function enEstado(nivel: NivelDeCalidad, peldano: number, extra: Partial<EstadoDelGobernador> = {}): EstadoDelGobernador {
  return { ...gobernadorNuevo({ inicial: nivel, techo: 3, dprDelAparato: 2 }), peldano, gracia: 0, ...extra };
}

function tonoEnGrados(r: number, g: number, b: number): number {
  const mayor = Math.max(r, g, b);
  const menor = Math.min(r, g, b);
  const d = mayor - menor;
  if (d <= 0) return 0;
  let h: number;
  if (mayor === r) h = ((g - b) / d) % 6;
  else if (mayor === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  const grados = h * 60;
  return grados < 0 ? grados + 360 : grados;
}

function distanciaDeTono(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function saturacionHsv(r: number, g: number, b: number): number {
  const mayor = Math.max(r, g, b);
  return mayor <= 0 ? 0 : (mayor - Math.min(r, g, b)) / mayor;
}

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Los nombres que un texto GLSL declara con `uniform` (no mira dentro de los `#include`). */
function uniformesDeclarados(glsl: string): string[] {
  return [...glsl.matchAll(/^\s*uniform\s+(?:(?:lowp|mediump|highp)\s+)?\w+\s+(\w+)\s*;/gm)].map((m) => m[1] ?? '');
}

function mismoConjunto(a: readonly string[], b: readonly string[]): boolean {
  const x = new Set(a);
  const y = new Set(b);
  return x.size === y.size && [...x].every((n) => y.has(n)) && a.length === x.size;
}

/* ─────────────────────────────── A. La tabla de niveles ─────────────────────────────── */

paso('La tabla de niveles es la del §8 del diseño');
{
  comprobar('hay exactamente cuatro niveles, N0-N3, en orden', NIVELES_DE_CALIDAD.join(',') === '0,1,2,3' &&
    NIVELES_DE_CALIDAD.every((n) => TABLA_DE_NIVELES[n].nombre === `N${String(n)}`));

  const topes = NIVELES_DE_CALIDAD.map((n) => [TABLA_DE_NIVELES[n].topes.triangulos, TABLA_DE_NIVELES[n].topes.llamadas]);
  comprobar(
    'los topes son los provisionales del diseño: 150k/60, 250k/90, 600k/150 y 1,5M/250',
    JSON.stringify(topes) === JSON.stringify([[150_000, 60], [250_000, 90], [600_000, 150], [1_500_000, 250]]),
    topes,
  );

  const dpr = NIVELES_DE_CALIDAD.map((n) => TABLA_DE_NIVELES[n].dpr);
  comprobar(
    'el DPR de arriba de cada nivel es el del diseño (0,75; 1,0; 1,5; 2,0) y N2 no sale de 1,25-1,5 ni N3 pasa de 2',
    dpr[0]?.[0] === 0.75 && dpr[1]?.[0] === 1 && dpr[2]?.[0] === 1.5 && dpr[3]?.[0] === 2 &&
      (dpr[2] ?? []).every((d) => d >= 1.25 && d <= 1.5) && (dpr[3] ?? []).every((d) => d <= 2),
    dpr,
  );
  comprobar(
    'cada escalera de DPR baja estrictamente, y ninguna se mete por debajo de la del nivel de abajo (subir de nivel nunca quita nitidez)',
    dpr.every((e) => e.every((d, i) => i === 0 || d < (e[i - 1] ?? 0))) &&
      [1, 2, 3].every((n) => (dpr[n]?.[dpr[n].length - 1] ?? 0) >= (dpr[n - 1]?.[0] ?? 0)),
    dpr,
  );

  const crece = (f: (n: NivelDeCalidad) => number): boolean =>
    NIVELES_DE_CALIDAD.every((n, i) => i === 0 || f(n) >= f(NIVELES_DE_CALIDAD[i - 1] as NivelDeCalidad));
  const palancasQueSuben: [string, (n: NivelDeCalidad) => number][] = [
    ['lluvia', (n) => TABLA_DE_NIVELES[n].lluvia],
    ['gente de fondo', (n) => TABLA_DE_NIVELES[n].fondo.gente],
    ['coches en marcha', (n) => TABLA_DE_NIVELES[n].fondo.coches],
    ['durmientes con esqueleto', (n) => TABLA_DE_NIVELES[n].durmientes.conEsqueleto],
    ['triángulos del VAT', (n) => TABLA_DE_NIVELES[n].durmientes.triangulosDelVat],
    ['esqueletos de NPC', (n) => TABLA_DE_NIVELES[n].esqueletos.tope],
    ['cascadas de sombra', (n) => TABLA_DE_NIVELES[n].sombras.cascadas],
    ['farolas reales', (n) => TABLA_DE_NIVELES[n].fachadas.farolasReales],
  ];
  const queBajan = palancasQueSuben.filter(([, f]) => !crece(f)).map(([que]) => que);
  comprobar('ninguna palanca de adorno baja al subir de nivel', queBajan.length === 0, queBajan);

  comprobar(
    'las cifras de adorno son las del §8: lluvia 1.000/3.000/6.000/10.000; gente 0/24/60/120; coches 4/8/16/30',
    NIVELES_DE_CALIDAD.map((n) => TABLA_DE_NIVELES[n].lluvia).join() === '1000,3000,6000,10000' &&
      NIVELES_DE_CALIDAD.map((n) => TABLA_DE_NIVELES[n].fondo.gente).join() === '0,24,60,120' &&
      NIVELES_DE_CALIDAD.map((n) => TABLA_DE_NIVELES[n].fondo.coches).join() === '4,8,16,30',
  );
  comprobar(
    'posproceso: N0 ninguno, N1 barato, N2 y N3 pleno; oclusión y enfoque con profundidad sólo en N3; sin sombras en N0-N1',
    NIVELES_DE_CALIDAD.map((n) => TABLA_DE_NIVELES[n].posproceso).join() === 'ninguno,barato,pleno,pleno' &&
      NIVELES_DE_CALIDAD.map((n) => TABLA_DE_NIVELES[n].oclusion).join() === 'false,false,false,true' &&
      NIVELES_DE_CALIDAD.map((n) => TABLA_DE_NIVELES[n].enfoqueConProfundidad).join() === 'false,false,false,true' &&
      TABLA_DE_NIVELES[0].sombras.hastaM === 0 && TABLA_DE_NIVELES[1].sombras.hastaM === 0 && TABLA_DE_NIVELES[2].sombras.hastaM === 40,
  );
  comprobar(
    'lo que decide la partida no está en la tabla: 48 durmientes de guion y 60 m de contorno, una sola cifra para todos',
    IGUAL_EN_TODOS_LOS_NIVELES.durmientesDeGuion === 48 && IGUAL_EN_TODOS_LOS_NIVELES.contornoDeSiluetasM === 60 &&
      NIVELES_DE_CALIDAD.every((n) => !('durmientesDeGuion' in TABLA_DE_NIVELES[n]) && !('estructura' in TABLA_DE_NIVELES[n])),
  );

  const fuera = NIVELES_DE_CALIDAD.map((n) => calidadDeFuera(n));
  comprobar(
    'hacia fuera: N0 es `sobria` y N1-N3 `plena`, y la compuerta de Boots on Board (`leerElVeredicto`) acepta las cuatro',
    fuera.join() === 'sobria,plena,plena,plena' && fuera.every((c) => leerElVeredicto(c) === c),
    fuera,
  );
  comprobar(
    'VACUNA: la compuerta sí rechaza una palabra nueva (si el tipo se ensanchara, esto se vería)',
    leerElVeredicto('n2') === null && leerElVeredicto('media') === null,
  );

  comprobar(
    'la escalera se recorta al DPR del aparato: a 1× N2 y N3 quedan en [1]; a 3× N3 sigue entera; un DPR absurdo deja la del nivel',
    escaleraDeDpr(2, 1).join() === '1' && escaleraDeDpr(3, 1).join() === '1' && escaleraDeDpr(3, 3).join() === '2,1.75,1.5' &&
      escaleraDeDpr(0, 3).join() === '0.75,0.6' && escaleraDeDpr(1, Number.NaN).join() === '1,0.85' && escaleraDeDpr(3, 1.6).join() === '1.6,1.5',
    [escaleraDeDpr(2, 1), escaleraDeDpr(3, 1), escaleraDeDpr(3, 3), escaleraDeDpr(3, 1.6)],
  );
  comprobar(
    '`comoNivel` acota cualquier número a 0-3',
    comoNivel(-1) === 0 && comoNivel(Number.NaN) === 0 && comoNivel(1.4) === 1 && comoNivel(2.6) === 3 && comoNivel(9) === 3,
  );
}

/* ─────────────────────────────── B. El gobernador ─────────────────────────────── */

paso('El gobernador: sube despacio y a prueba');
{
  const arranque = gobernadorNuevo({ inicial: 1, techo: 3, dprDelAparato: 2 });
  comprobar('arranca en el nivel pedido, en su peldaño alto y con gracia', arranque.nivel === 1 && dprDe(arranque) === 1 &&
    arranque.gracia === FOTOGRAMAS_DE_GRACIA && arranque.fallidos.length === 0);

  /*
   * Una sola serie de 75 s a 60 Hz desde el arranque. Los instantes esperados salen de las reglas:
   * cada cambio da gracia (30 fotogramas, 0,5 s) y luego hacen falta 20 s de holgura para subir o
   * 10 s para pasar la prueba. La holgura de la prueba cuenta para el siguiente peldaño.
   */
  const g = FOTOGRAMAS_DE_GRACIA / 60;
  const holgura = HOLGURA_PARA_SUBIR_MS / 1000;
  const prueba = DURACION_DE_LA_PRUEBA_MS / 1000;
  const serie = correr(arranque, segundos(75), muestra(A_60_HZ));
  const cuando = serie.cuando.map((i) => (i + 1) / 60);
  const t1 = g + holgura;
  const t3 = t1 + g + holgura;
  const esperados = [t1, t1 + g + prueba, t3, t3 + g + holgura, t3 + g + holgura + g + prueba];
  comprobar(
    'a 60 Hz con holgura: a los 20 s sube A PRUEBA a N2 en su peldaño MÁS BAJO (1,25); pasa la prueba; sube el DPR; prueba N3 en 1,5; la pasa',
    motivos(serie).join(' ') ===
      'subir-a-prueba:N2@1.25 prueba-superada:N2@1.25 subir-dpr:N2@1.5 subir-a-prueba:N3@1.5 prueba-superada:N3@1.5',
    motivos(serie),
  );
  comprobar(
    'y cada paso llega cuando dicen las reglas (20 s de holgura, 10 s de prueba, 0,5 s de gracia), ni antes ni después',
    cuando.length === esperados.length && cuando.every((t, i) => Math.abs(t - (esperados[i] ?? -1)) < 0.05),
    { cuando, esperados },
  );
  /* Con las cifras de hoy la prueba (10 s) acaba antes que la holgura (20 s): se fuerza el caso. */
  const enPrueba = correr({ ...enEstado(2, 1), aPrueba: true, pruebaMs: 0, holguraMs: 19_500 }, segundos(9), muestra(A_60_HZ));
  comprobar(
    'mientras está a prueba no sube nada más, aunque la holgura llegue a los 20 s',
    enPrueba.cambios.length === 0 && enPrueba.estado.aPrueba && enPrueba.estado.peldano === 1,
    motivos(enPrueba),
  );

  const techoUno = correr(gobernadorNuevo({ inicial: 1, techo: 1, dprDelAparato: 2 }), segundos(300), muestra(A_60_HZ));
  comprobar('con techo N1 (sin media flotante), cinco minutos de holgura no lo suben', techoUno.cambios.length === 0 &&
    techoUno.estado.nivel === 1, motivos(techoUno));

  const inicialAlto = gobernadorNuevo({ inicial: 3, techo: 1, dprDelAparato: 2 });
  comprobar('un arranque por encima del techo se queda en el techo', inicialAlto.nivel === 1);

  const conTopeRoto = correr(enEstado(1, 0), segundos(60), muestra(A_60_HZ, { llamadas: 200 }));
  const conTopeBien = correr(enEstado(1, 0), segundos(60), muestra(A_60_HZ, { llamadas: 50 }));
  comprobar(
    'si la escena se sale de los topes de su nivel (200 llamadas en N1), no hay holgura y no sube aunque vaya a 60 Hz',
    conTopeRoto.cambios.length === 0 && conTopeRoto.estado.ultimaSobreElTope,
    motivos(conTopeRoto),
  );
  comprobar('VACUNA: la misma serie con 50 llamadas sí sube', conTopeBien.cambios[0]?.motivo === 'subir-a-prueba', motivos(conTopeBien));
}

paso('El gobernador: baja deprisa, primero el DPR');
{
  const n2 = correr(enEstado(2, 0), segundos(10, 30), muestra(30));
  const [primero, segundo] = n2.cambios;
  comprobar(
    'N2 arriba con 30 ms: la primera ventana mala baja el DPR (1,5 → 1,25) sin bajar de nivel',
    primero?.motivo === 'bajar-dpr' && primero.a.nivel === 2 && primero.a.dpr === 1.25 && n2.cuando[0] === 59,
    { cambios: motivos(n2), cuando: n2.cuando },
  );
  comprobar(
    'y la siguiente (tras la gracia) baja a N1 en su peldaño alto, y apunta N2 como fallido',
    segundo?.motivo === 'bajar-nivel' && segundo.a.nivel === 1 && segundo.a.dpr === 1 && n2.estado.fallidos.includes(2) &&
      (n2.cuando[1] ?? 0) - (n2.cuando[0] ?? 0) === FOTOGRAMAS_DE_GRACIA + 60,
    { cambios: motivos(n2), cuando: n2.cuando, fallidos: n2.estado.fallidos },
  );

  const hastaAbajo = correr(enEstado(3, 0), segundos(120, 100), muestra(100));
  comprobar(
    'un aparato que no llega nunca baja escalón a escalón hasta N0 a 0,6 y ahí se queda, sin romperse',
    hastaAbajo.estado.nivel === 0 && dprDe(hastaAbajo.estado) === 0.6 &&
      motivos(hastaAbajo).join(' ') ===
        'bajar-dpr:N3@1.75 bajar-dpr:N3@1.5 bajar-nivel:N2@1.5 bajar-dpr:N2@1.25 bajar-nivel:N1@1 bajar-dpr:N1@0.85 bajar-nivel:N0@0.75 bajar-dpr:N0@0.6',
    motivos(hastaAbajo),
  );

  const aUnoX = correr({ ...gobernadorNuevo({ inicial: 2, techo: 3, dprDelAparato: 1 }), gracia: 0 }, 60, muestra(30));
  comprobar(
    'con una pantalla de 1× la escalera de N2 es un peldaño: la ventana mala baja de nivel directamente',
    aUnoX.cambios[0]?.motivo === 'bajar-nivel' && aUnoX.estado.nivel === 1,
    motivos(aUnoX),
  );
}

paso('El gobernador: la histéresis, la prueba fallida y los niveles que ya fallaron');
{
  const justo = correr(enEstado(2, 0), segundos(120, 20), muestra(20));
  comprobar(
    'entre 18 y 22 ms (va justo pero no cae) no baja ni sube en dos minutos',
    justo.cambios.length === 0 && justo.estado.nivel === 2 && justo.estado.holguraMs === 0,
    motivos(justo),
  );
  const pasado = correr(enEstado(2, 0), 60, muestra(22.5));
  comprobar('VACUNA: a 22,5 ms la misma ventana sí baja', pasado.cambios[0]?.motivo === 'bajar-dpr', motivos(pasado));
  const holgado = correr(enEstado(2, 1), segundos(21), muestra(17.9));
  comprobar('VACUNA: a 17,9 ms sí hay holgura (y sube el DPR perdido)', holgado.cambios[0]?.motivo === 'subir-dpr', motivos(holgado));

  const aPrueba = correr(enEstado(1, 0), segundos(21), muestra(A_60_HZ));
  /* Una ventana: la de después de la gracia de la subida (que ya se gastó en los 21 s). */
  const fallida = correr(aPrueba.estado, 60, muestra(40));
  comprobar(
    'a prueba, la primera ventana mala devuelve DIRECTAMENTE al nivel de antes en su peldaño alto (sin bajar el DPR de la prueba)',
    aPrueba.estado.aPrueba && fallida.cambios[0]?.motivo === 'prueba-fallida' && fallida.cambios[0].a.nivel === 1 &&
      fallida.cambios[0].a.dpr === 1 && fallida.estado.fallidos.includes(2),
    { antes: motivos(aPrueba), despues: motivos(fallida) },
  );

  const nuncaMas = correr(fallida.estado, segundos(600), muestra(A_60_HZ));
  comprobar(
    'un nivel que falló no se vuelve a probar: diez minutos de holgura en N1 y ni un intento de N2',
    nuncaMas.estado.nivel === 1 && !nuncaMas.cambios.some((c) => c.a.nivel === 2) && nuncaMas.estado.holguraMs === HOLGURA_PARA_SUBIR_MS,
    motivos(nuncaMas),
  );
  const sinMarca = correr({ ...fallida.estado, fallidos: [] }, segundos(60), muestra(A_60_HZ));
  comprobar('VACUNA: sin la marca, la misma serie sí vuelve a probar N2', sinMarca.cambios.some((c) => c.motivo === 'subir-a-prueba' && c.a.nivel === 2),
    motivos(sinMarca));
}

paso('El gobernador: la pestaña oculta, la gracia y el tope de 100 ms');
{
  /*
   * Al volver, 21 ms por fotograma: justo por debajo del umbral. Si el fotograma de 30 s de la vuelta
   * contara (aunque sea acotado a 100 ms), subiría la media de esa ventana a 22,3 y bajaría el nivel.
   */
  const oculta = (i: number): MuestraDelFotograma => muestra(1000, { oculta: i < 300 });
  const conOculta = correr(enEstado(1, 0), 300 + 1 + 120, (i) => (i < 300 ? oculta(i) : i === 300 ? muestra(30_000) : muestra(21)));
  comprobar(
    'trescientas muestras de 1 s con la pestaña oculta, y el fotograma de 30 s al volver, no bajan nada',
    conOculta.cambios.length === 0 && conOculta.estado.nivel === 1,
    motivos(conOculta),
  );
  const vueltaContada = correr(enEstado(1, 0), 120, (i) => (i === 0 ? muestra(30_000) : muestra(21)));
  comprobar('VACUNA: ese mismo fotograma de 30 s, sin pestaña oculta delante, sí baja', vueltaContada.cambios.length > 0, motivos(vueltaContada));
  const sinMarcar = correr(enEstado(1, 0), 300, muestra(1000));
  comprobar('VACUNA: las mismas trescientas sin marcar como ocultas sí bajan', sinMarcar.cambios.length > 0, motivos(sinMarcar));

  /* 15 s de holgura, la pestaña se esconde, y 10 s más: la holgura empezó de cero al volver. */
  const antes = correr(enEstado(1, 0), segundos(15), muestra(A_60_HZ));
  const escondida = correr(antes.estado, 20, muestra(1000, { oculta: true }));
  const despues = correr(escondida.estado, 1 + segundos(10), muestra(A_60_HZ));
  const mucho = correr(despues.estado, segundos(12), muestra(A_60_HZ));
  comprobar(
    'esconder la pestaña tira la holgura acumulada: 15 s + 10 s no suben; hacen falta 20 s seguidos tras volver',
    antes.cambios.length === 0 && despues.cambios.length === 0 && mucho.cambios[0]?.motivo === 'subir-a-prueba',
    { antes: motivos(antes), despues: motivos(despues), luego: motivos(mucho) },
  );
  const seguidos = correr(enEstado(1, 0), segundos(25), muestra(A_60_HZ));
  comprobar('VACUNA: 25 s seguidos sin esconderla sí suben', seguidos.cambios[0]?.motivo === 'subir-a-prueba', motivos(seguidos));

  /*
   * Tras un cambio, medio segundo de tirón (30 fotogramas de 100 ms: compilar sombreadores, reservar
   * blancos) no cuenta. El 30 va escrito aquí y no leído de la constante: si la gracia encogiera, esto
   * tiene que verse.
   */
  const bajada = correr(enEstado(2, 0), 60, muestra(30));
  const tirones = correr(bajada.estado, 30 + 60, (i) => (i < 30 ? muestra(100) : muestra(A_60_HZ)));
  comprobar(
    'la gracia: tras bajar el DPR, los 30 fotogramas de tirón que cuesta llegar no tumban el nivel',
    bajada.cambios.length === 1 && tirones.cambios.length === 0,
    { bajada: motivos(bajada), tirones: motivos(tirones) },
  );
  const sinGracia = correr({ ...bajada.estado, gracia: 0 }, 60, (i) => (i < 30 ? muestra(100) : muestra(A_60_HZ)));
  comprobar('VACUNA: sin gracia, esos mismos tirones sí bajan', sinGracia.cambios.length === 1, motivos(sinGracia));

  const conTiron = correr(enEstado(1, 0), 60, (i) => (i === 30 ? muestra(5000) : muestra(A_60_HZ)));
  const media = conTiron.estado.ultimaMediaMs ?? 0;
  comprobar(
    'un tirón de 5 s visible cuenta como 100 ms: la ventana queda en ~18,1 ms y no baja',
    conTiron.cambios.length === 0 && Math.abs(media - (59 * A_60_HZ + 100) / 60) < 1e-9,
    media,
  );
}

paso('El recuerdo por aparato');
{
  const bueno = recuerdoDe(2, 'ANGLE (NVIDIA)');
  comprobar(
    'se lee de vuelta lo que se escribe, en texto o en objeto',
    JSON.stringify(leerElRecuerdo(JSON.stringify(bueno))) === JSON.stringify(bueno) && JSON.stringify(leerElRecuerdo(bueno)) === JSON.stringify(bueno),
  );
  const malos: unknown[] = [
    null,
    '',
    '{',
    '[]',
    [],
    { v: 2, nivel: 1, grafica: 'x' },
    { v: 1, nivel: 4, grafica: 'x' },
    { v: 1, nivel: '2', grafica: 'x' },
    { v: 1, nivel: 1, grafica: 7 },
    { v: 1, nivel: 1, grafica: 'x', de: 'más' },
    { v: 1, nivel: 1.5, grafica: 'x' },
  ];
  const aceptados = malos.filter((m) => leerElRecuerdo(m) !== null);
  comprobar('el lector es estricto: ninguna forma inesperada da un nivel', aceptados.length === 0, aceptados);
  comprobar(
    'el recuerdo manda si la gráfica es la misma, nunca por encima del techo de hoy; con otra gráfica no vale',
    arranqueConRecuerdo(1, 3, 'A', recuerdoDe(0, 'A')) === 0 && arranqueConRecuerdo(1, 1, 'A', recuerdoDe(3, 'A')) === 1 &&
      arranqueConRecuerdo(2, 3, 'B', recuerdoDe(0, 'A')) === 2 && arranqueConRecuerdo(2, 3, 'A', null) === 2,
  );
  /*
   * La RTX 4070 SUPER del panel: el sondeo dice N3, el recuerdo (aprendido con el panel oculto) N0. Se
   * arranca en N2, no en N0: un nivel por debajo del sondeo como mucho.
   */
  comprobar(
    'un recuerdo muy por debajo del sondeo de hoy sólo baja un nivel: una gráfica de N3 con un N0 recordado arranca en N2',
    arranqueConRecuerdo(3, 3, 'A', recuerdoDe(0, 'A')) === 2 && arranqueConRecuerdo(2, 3, 'A', recuerdoDe(0, 'A')) === 1 &&
      arranqueConRecuerdo(0, 1, 'A', recuerdoDe(0, 'A')) === 0,
    [arranqueConRecuerdo(3, 3, 'A', recuerdoDe(0, 'A')), arranqueConRecuerdo(2, 3, 'A', recuerdoDe(0, 'A'))],
  );
  /* Y lo que baja con los fotogramas frenados no se guarda: la serie de 1 s visible de más arriba. */
  const frenada = correr(enEstado(1, 0), 600, muestra(1000));
  const normal = correr(enEstado(2, 0), 600, muestra(30));
  const bajadasFrenadas = frenada.cambios.filter((c) => c.motivo === 'bajar-nivel' || c.motivo === 'prueba-fallida');
  const bajadasNormales = normal.cambios.filter((c) => c.motivo === 'bajar-nivel' || c.motivo === 'prueba-fallida');
  comprobar(
    'una bajada con los fotogramas frenados (media de 100 ms) se hace pero NO se recuerda; una de 30 ms, sí',
    bajadasFrenadas.length > 0 && bajadasFrenadas.every((c) => !seRecuerda(c)) && bajadasNormales.length > 0 && bajadasNormales.every((c) => seRecuerda(c)),
    { frenadas: bajadasFrenadas.map((c) => c.mediaMs), normales: bajadasNormales.map((c) => c.mediaMs) },
  );
}

/* ─────────────────────────────── C. El sondeo ─────────────────────────────── */

paso('El nivel de arranque según el aparato');
{
  const pc: CapacidadesDelAparato = {
    webgl2: true,
    mediaFlotante: true,
    flotanteEnVertices: true,
    multiDibujo: true,
    texturaMaxima: 16_384,
    muestrasMaximas: 8,
    cronometroDeGpu: false,
    grafica: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    nucleos: 12,
    memoriaGb: 8,
    pantalla: { ancho: 1920, alto: 1080, dpr: 1 },
    tactil: false,
    fallo: null,
  };
  const movil: CapacidadesDelAparato = {
    ...pc,
    grafica: 'Adreno (TM) 740',
    nucleos: 8,
    memoriaGb: 8,
    texturaMaxima: 8192,
    pantalla: { ancho: 412, alto: 915, dpr: 2.625 },
    tactil: true,
  };
  const casos: [string, CapacidadesDelAparato, NivelDeCalidad, NivelDeCalidad][] = [
    ['PC con NVIDIA', pc, 3, 3],
    ['PC con Radeon RX', { ...pc, grafica: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' }, 3, 3],
    ['PC con Intel UHD (integrada)', { ...pc, grafica: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' }, 2, 3],
    ['PC con APU de AMD («Radeon(TM) Graphics» es integrada)', { ...pc, grafica: 'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' }, 2, 3],
    ['Mac con Apple M1 a secas', { ...pc, grafica: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)' }, 2, 3],
    ['Mac con Apple M2 Max', { ...pc, grafica: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Max, Unspecified Version)' }, 3, 3],
    ['PC que no dice su gráfica', { ...pc, grafica: '' }, 1, 3],
    ['PC con NVIDIA SIN media flotante creada', { ...pc, mediaFlotante: false }, 1, 1],
    ['PC con texturas de 2048', { ...pc, texturaMaxima: 2048 }, 1, 1],
    ['móvil de gama alta (Adreno 740)', movil, 1, 2],
    ['iPhone («Apple GPU», sin memoria)', { ...movil, grafica: 'Apple GPU', memoriaGb: null, nucleos: 6 }, 1, 2],
    ['móvil modesto (Mali-G52)', { ...movil, grafica: 'Mali-G52 MC2', memoriaGb: 4 }, 0, 2],
    ['móvil viejo (Adreno 506)', { ...movil, grafica: 'Adreno (TM) 506' }, 0, 2],
    ['móvil con 3 GB y 4 núcleos', { ...movil, memoriaGb: 3, nucleos: 4 }, 0, 2],
    ['pintor por software (SwiftShader)', { ...pc, grafica: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)' }, 0, 0],
    ['sin flotante en los vértices', { ...pc, flotanteEnVertices: false }, 0, 0],
    ['sin WebGL2', { ...pc, webgl2: false }, 0, 0],
    ['sondeo reventado', { ...pc, fallo: 'contexto perdido' }, 0, 1],
    /* Manda la gráfica, no el dedo: un PC con pantalla táctil y gráfica dedicada es N3 (el panel de la casa). */
    [
      'PC táctil con RTX 4070 (puntero grueso)',
      { ...pc, grafica: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 SUPER (0x00002783) Direct3D11 vs_5_0 ps_5_0, D3D11)', tactil: true },
      3,
      3,
    ],
    ['portátil táctil con Radeon RX', { ...pc, grafica: 'ANGLE (AMD, AMD Radeon RX 7600S Direct3D11 vs_5_0 ps_5_0, D3D11)', tactil: true }, 3, 3],
    ['portátil táctil con Intel Iris (integrada)', { ...pc, grafica: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', tactil: true }, 1, 2],
    ['tableta con NVIDIA Tegra (dice «NVIDIA» y es de móvil)', { ...movil, grafica: 'NVIDIA Tegra X1 (nvgpu)/integrated' }, 1, 2],
  ];
  const mal = casos
    .map(([que, c, inicial, techo]) => ({ que, esperado: [inicial, techo], dado: veredictoDelSondeo(c) }))
    .filter((x) => x.dado.inicial !== x.esperado[0] || x.dado.techo !== x.esperado[1] || x.dado.porque.length === 0)
    .map((x) => ({ que: x.que, esperado: x.esperado, dado: [x.dado.inicial, x.dado.techo], porque: x.dado.porque }));
  comprobar(`los ${String(casos.length)} aparatos inventados arrancan donde deben, con su porqué`, mal.length === 0, mal);
  comprobar(
    'nunca se arranca por encima del techo, y un táctil sólo tiene techo N3 si su gráfica es dedicada de PC',
    casos.every(([, c]) => {
      const v = veredictoDelSondeo(c);
      return v.inicial <= v.techo && (!c.tactil || v.techo <= 2 || esGraficaDedicadaDePc(c.grafica));
    }),
  );
  comprobar(
    'una gráfica de móvil nunca pasa por dedicada, aunque diga «NVIDIA»',
    !esGraficaDedicadaDePc('NVIDIA Tegra X1 (nvgpu)/integrated') && !esGraficaDedicadaDePc('Apple GPU') && !esGraficaDedicadaDePc('Mali-G710') &&
      esGraficaDedicadaDePc('ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 SUPER (0x00002783) Direct3D11 vs_5_0 ps_5_0, D3D11)'),
  );
}

/* ─────────────────────────────── D. El camino de pintado ─────────────────────────────── */

paso('El camino de pintado de cada nivel');
{
  const c = NIVELES_DE_CALIDAD.map((n) => caminoPara(n, true));
  comprobar(
    'con media flotante: N0 directo, N1 barato, N2 pleno con brillo reducido, N3 pleno con oclusión y enfoque con profundidad',
    c.map((x) => x.camino).join() === 'directo,barato,pleno,pleno' && c[2]?.brilloReducido === true && c[2]?.oclusion === false &&
      c[3]?.oclusion === true && c[3]?.enfoqueConProfundidad === true && c[3]?.brilloReducido === false && c.every((x) => x.aviso === null),
    c,
  );
  const sinMedia = [caminoPara(2, false), caminoPara(3, false)];
  comprobar(
    'sin media flotante, N2 y N3 caen al camino barato CON aviso (y N0-N1 no cambian)',
    sinMedia.every((x) => x.camino === 'barato' && x.aviso !== null && !x.oclusion) &&
      caminoPara(0, false).camino === 'directo' && caminoPara(1, false).camino === 'barato',
    sinMedia,
  );
}

/* ─────────────────────────────── E. La gradación ─────────────────────────────── */

paso('La gradación de la noche');
{
  const [gr, gg, gb] = gradar(0.2, 0.2, 0.2);
  comprobar('un gris en sombra (0,2) sale verde-cian: más verde y más azul que rojo', gg > gr + 0.01 && gb > gr + 0.005, [gr, gg, gb]);

  const oscuro = gradar(0.04, 0.04, 0.04);
  comprobar('los negros se hunden: un gris de 0,04 baja a menos del 70 %', luma(...oscuro) < 0.04 * 0.7, oscuro);
  comprobar('el negro sigue negro (tintar multiplicando no levanta el cero)', gradar(0, 0, 0).every((v) => v === 0));
  comprobar('el blanco sigue blanco', gradar(1, 1, 1).every((v) => Math.abs(v - 1) < 0.01), gradar(1, 1, 1));

  const vivos: [string, [number, number, number], number][] = [
    ['ámbar de sodio', [1, 0.62, 0.18], 3],
    ['ámbar de sodio en sombra', [0.3, 0.18, 0.05], 3],
    ['magenta de neón', [1, 0.1, 0.8], 4],
    ['verde-cian de la Grafía', [0.1, 0.9, 0.7], 4],
  ];
  const tocados = vivos
    .map(([que, c, tolerancia]) => {
      const g = gradar(...c);
      return {
        que,
        giro: distanciaDeTono(tonoEnGrados(...c), tonoEnGrados(...g)),
        tolerancia,
        pierde: saturacionHsv(...c) - saturacionHsv(...g),
      };
    })
    .filter((x) => x.giro > x.tolerancia || x.pierde > 0.01);
  comprobar('el ámbar, el magenta y el verde de la Grafía no giran de tono ni pierden saturación', tocados.length === 0, tocados);

  const ladrillo: [number, number, number] = [0.45, 0.3, 0.25];
  comprobar('lo apagado se apaga un poco más (un ladrillo pierde saturación)', saturacionHsv(...gradar(...ladrillo)) < saturacionHsv(...ladrillo));

  let anterior = -1;
  let seDaLaVuelta = -1;
  for (let i = 0; i <= 255; i++) {
    const v = i / 255;
    const l = luma(...gradar(v, v, v));
    if (l < anterior - 1e-9) seDaLaVuelta = i;
    anterior = l;
  }
  comprobar('la rampa de grises no se da la vuelta en ningún escalón', seDaLaVuelta === -1, seDaLaVuelta);

  const lut = tablaDeLaLut();
  let distintos = 0;
  for (let b = 0; b < LADO_DE_LA_LUT; b++) {
    for (let g = 0; g < LADO_DE_LA_LUT; g++) {
      for (let r = 0; r < LADO_DE_LA_LUT; r++) {
        const esperado = gradar(r / (LADO_DE_LA_LUT - 1), g / (LADO_DE_LA_LUT - 1), b / (LADO_DE_LA_LUT - 1));
        const i = ((b * LADO_DE_LA_LUT + g) * LADO_DE_LA_LUT + r) * 4;
        if (
          lut[i] !== Math.round(esperado[0] * 255) ||
          lut[i + 1] !== Math.round(esperado[1] * 255) ||
          lut[i + 2] !== Math.round(esperado[2] * 255) ||
          lut[i + 3] !== 255
        ) {
          distintos++;
        }
      }
    }
  }
  comprobar(
    `la LUT es la fórmula en sus ${String(LADO_DE_LA_LUT ** 3)} nudos, con el rojo como eje rápido, y el uber la lee con el mismo lado`,
    lut.length === LADO_DE_LA_LUT ** 3 * 4 && distintos === 0 && LADO_DE_LA_LUT_EN_EL_UBER === LADO_DE_LA_LUT,
    { largo: lut.length, distintos, ladoDelUber: LADO_DE_LA_LUT_EN_EL_UBER },
  );
  const esquinaRoja = ((0 * LADO_DE_LA_LUT + 0) * LADO_DE_LA_LUT + (LADO_DE_LA_LUT - 1)) * 4;
  comprobar('VACUNA del orden de ejes: el nudo (31, 0, 0) es rojo, no azul', (lut[esquinaRoja] ?? 0) > 200 && (lut[esquinaRoja + 2] ?? 255) < 30,
    [lut[esquinaRoja], lut[esquinaRoja + 1], lut[esquinaRoja + 2]]);

  const glsl = glslDeLaGradacion();
  const a = GRADACION_DE_LA_NOCHE;
  const constantes = [
    a.hundimientoMinimo,
    1 - a.hundimientoMinimo,
    a.hundimientoHasta,
    a.sombrasHasta,
    a.protegeDesde,
    a.protegeDelTodo,
    a.saturacionNeutra,
    a.saturacionViva - a.saturacionNeutra,
    ...a.tinteDeSombras,
  ].map(flotanteGlsl);
  const faltan = constantes.filter((c) => !glsl.includes(c));
  comprobar('la gradación de N0 (GLSL) lleva las MISMAS constantes que la LUT', faltan.length === 0, faltan);
  comprobar(
    'los literales GLSL llevan siempre punto decimal (un «1» a secas es un entero y no compila en una operación con flotantes)',
    flotanteGlsl(1) === '1.0' && flotanteGlsl(0.5) === '0.5' && flotanteGlsl(0.86) === '0.86' && flotanteGlsl(0) === '0.0',
  );
}

/* ─────────────────────────────── F. El tono de N0 ─────────────────────────────── */

paso('El tono propio de N0 en la three instalada');
{
  const original = ShaderChunk.tonemapping_pars_fragment;
  comprobar(
    'la three instalada trae la línea de fábrica de `CustomToneMapping` que se sustituye',
    original.includes(LINEA_DE_FABRICA) || original.includes('vec3 gradarLaNoche('),
  );
  const puesto = ponerElTonoPropio();
  const parcheado = ShaderChunk.tonemapping_pars_fragment;
  comprobar(
    'ponerlo funciona: el trozo lleva la gradación y el `CustomToneMapping` nuevo, y ya no la línea de fábrica',
    puesto && parcheado.includes('vec3 gradarLaNoche(') && parcheado.includes(textoDelTonoPropio()) && !parcheado.includes(LINEA_DE_FABRICA),
  );
  comprobar(
    'el ACES está definido ANTES que el `CustomToneMapping` que lo llama (GLSL no deja usar antes de declarar)',
    parcheado.indexOf('vec3 ACESFilmicToneMapping(') >= 0 && parcheado.indexOf('vec3 ACESFilmicToneMapping(') < parcheado.indexOf('vec3 CustomToneMapping('),
  );
  ponerElTonoPropio();
  comprobar('ponerlo dos veces no cambia nada', ShaderChunk.tonemapping_pars_fragment === parcheado);
  nota(`el trozo pasa de ${String(original.length)} a ${String(parcheado.length)} caracteres`);
}

/* ─────────────────────────────── G. Los sombreadores ─────────────────────────────── */

paso('Cada sombreador declara exactamente los uniformes que su material le da');
{
  const pares: [string, string, readonly string[]][] = [
    ['uber', UBER, UNIFORMES_DEL_UBER],
    ['extraer', EXTRAER, UNIFORMES_DE_EXTRAER],
    ['desenfocar', DESENFOCAR, UNIFORMES_DE_DESENFOCAR],
    ['velo', VELO, UNIFORMES_DEL_VELO],
    ['fogonazo', FOGONAZO, UNIFORMES_DEL_FOGONAZO],
  ];
  const mal = pares
    .map(([que, texto, lista]) => ({ que, declarados: uniformesDeclarados(texto), lista }))
    .filter((x) => !mismoConjunto(x.declarados, x.lista));
  comprobar('los cinco, uniforme por uniforme', mal.length === 0, mal);
  /*
   * EL RAYO EN EL UBER (EL-RAYO.md §7: «0 lecturas extra en el posproceso»): el fogonazo y el golpe son uniformes, no
   * pasadas ni lecturas. El fogonazo sólo MULTIPLICA (lo alumbrado se dispara y los negros siguen negros: un velo
   * blanco sumado lava la noche entera), y el uber lee las mismas texturas que antes del rayo.
   */
  const codigoDelUber = UBER.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const usosDelFogonazo = codigoDelUber.split('\n').filter((l) => l.includes('uFogonazo') && !/^\s*uniform\b/.test(l));
  comprobar(
    'el fogonazo del rayo en el uber sólo multiplica lo que hay (nunca suma luz a los negros)',
    usosDelFogonazo.length >= 1 && usosDelFogonazo.every((l) => /\*=?\s*\(?\s*1\.0 \+ [0-9.]+ \* uFogonazo\b/.test(l)),
    usosDelFogonazo,
  );
  /** Las lecturas de un uber: sus `texture(` y sus llamadas a `leer(` (sin la definición del ayudante). */
  const lecturasDe = (codigo: string): { texturas: number; leer: number } => ({
    texturas: (codigo.match(/\btexture(2D)?\s*\(/g) ?? []).length,
    leer: (codigo.match(/\bleer\s*\(/g) ?? []).length - (codigo.match(/\bvec3\s+leer\s*\(/g) ?? []).length,
  });
  const comoAntes = (l: { texturas: number; leer: number }): boolean => l.texturas === LECTURAS_DEL_UBER_ANTES_DEL_RAYO && l.leer === LLAMADAS_A_LEER_ANTES_DEL_RAYO;
  const lecturasDelUber = lecturasDe(codigoDelUber);
  comprobar(
    `el rayo no añade lecturas al uber: las mismas ${String(LECTURAS_DEL_UBER_ANTES_DEL_RAYO)} texture( y ${String(LLAMADAS_A_LEER_ANTES_DEL_RAYO)} llamadas a leer( de antes (el golpe y la aberración reutilizan las suyas)`,
    comoAntes(lecturasDelUber),
    lecturasDelUber,
  );
  comprobar(
    'VACUNA de las lecturas: una llamada a leer( de más, o una texture( de más, en una copia del uber, no son «las de antes»',
    !comoAntes(lecturasDe(`${codigoDelUber}\nvec3 deMas( vec2 uv ) { return leer( uv * 0.98 ); }`)) && !comoAntes(lecturasDe(`${codigoDelUber}\nvec4 deMas2( vec2 uv ) { return texture( tDiffuse, uv ); }`)),
  );
  comprobar(
    'VACUNA: el lector de uniformes ve uno de más y uno de menos',
    !mismoConjunto(uniformesDeclarados(`${VELO}\nuniform float uDeMas;`), UNIFORMES_DEL_VELO) &&
      !mismoConjunto(uniformesDeclarados(VELO), [...UNIFORMES_DEL_VELO, 'uQueFalta']) &&
      uniformesDeclarados(UBER).length === UNIFORMES_DEL_UBER.length,
  );
  const todos = [VERTICE_DE_PANTALLA, UBER, EXTRAER, DESENFOCAR, VELO, FOGONAZO];
  comprobar(
    'ninguno incluye `colorspace_pars_fragment` (three ya lo pone en `ShaderMaterial`: repetido no compila)',
    todos.every((t) => !t.includes('colorspace_pars_fragment')),
  );
  comprobar(
    'el uber sólo incluye el trozo del mapeo tonal con ENTRADA_HDR (sin ella choca con el de three en el lienzo) y conoce sus tres variantes',
    /#ifdef ENTRADA_HDR\s*\n#include <tonemapping_pars_fragment>\s*\n#endif/.test(UBER) &&
      ['ENTRADA_HDR', 'BRILLO_PROPIO', 'CON_PROFUNDIDAD'].every((d) => UBER.includes(`#ifdef ${d}`)),
  );
  comprobar(
    'los sombreadores no usan `precision` propias ni `#version` (three las antepone y repetirlas no compila)',
    todos.every((t) => !/^\s*(precision|#version)\b/m.test(t)),
  );
}

paso('Compilar antes de pintar: la cita en el pintado, la compilación aparte, el relevo de una pieza y el bloque al cambiar de nivel');
{
  /*
   * La revisión de rendimiento (24-sep) vio cada cambio de nivel pararse 150-400 ms esperando al compilador,
   * y el muro del Bis compilarse en el primer Bis de la noche (49 ms). `calidad/precompilar.ts` decide CUÁNDO
   * se compila; aquí, con un renderizador falso: un «programa» por material y estado que no ha visto, y
   * `compileAsync` que no acaba hasta que se le dice.
   */
  class CompiladorFalso implements Compilador {
    estado = 'a';
    readonly info: { programs: { id: number }[] } = { programs: [] };
    readonly compilados: THREE.Object3D[] = [];
    private readonly claves = new Set<string>();
    private readonly pendientes: (() => void)[] = [];
    compile(objeto: THREE.Object3D): unknown {
      this.compilados.push(objeto);
      objeto.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        for (const x of m === undefined ? [] : Array.isArray(m) ? m : [m]) {
          const k = `${x.uuid}|${this.estado}`;
          if (this.claves.has(k)) continue;
          this.claves.add(k);
          this.info.programs.push({ id: this.info.programs.length });
        }
      });
      return undefined;
    }
    compileAsync(objeto: THREE.Object3D): Promise<unknown> {
      this.compile(objeto);
      return new Promise((r) => this.pendientes.push(() => r(undefined)));
    }
    acabar(): void {
      for (const f of this.pendientes.splice(0)) f();
    }
  }
  const vuelta = (): Promise<void> => new Promise((r) => setImmediate(r));
  const pieza = (): THREE.Mesh => new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  const gl = new CompiladorFalso();
  const camara = new THREE.PerspectiveCamera();
  const escena = new THREE.Scene();

  /* La cita: encadenada con el onBeforeRender que hubiera, con el renderizador de ese pintado, y se quita. */
  const vistos: string[] = [];
  escena.onBeforeRender = () => {
    vistos.push('antes');
  };
  const quitar = alPintarLaEscena(escena, (r, s, c) => {
    vistos.push(r === gl && s === escena && c === camara ? 'cita' : 'cita con otra cosa');
  });
  const pintar = (): void => (escena.onBeforeRender as unknown as (...a: unknown[]) => void).call(escena, gl, escena, camara, null);
  pintar();
  quitar();
  pintar();
  comprobar('la cita en el pintado llama con el renderizador, la escena y la cámara de ese pintado, después del onBeforeRender que hubiera, y se quita', vistos.join(',') === 'antes,cita,antes', vistos);

  /* La compilación de una pieza que aún no se pinta. */
  const p1 = pieza();
  const comp = new Compilacion(p1);
  const dijo: boolean[] = [];
  dijo.push(comp.enElPintado(gl, escena, camara));
  dijo.push(comp.enElPintado(gl, escena, camara));
  gl.acabar();
  await vuelta();
  dijo.push(comp.enElPintado(gl, escena, camara));
  gl.estado = 'b';
  dijo.push(comp.enElPintado(gl, escena, camara));
  gl.acabar();
  await vuelta();
  dijo.push(comp.enElPintado(gl, escena, camara));
  comprobar(
    'una pieza compilada aparte no está lista mientras se compila, sí cuando acaba y el pintado no le pide programas nuevos, y vuelve a compilarse si el estado del renderizador cambió',
    dijo.join(',') === 'false,false,true,false,true' && comp.pedidas === 2 && comp.rehechas === 1,
    { dijo, pedidas: comp.pedidas, rehechas: comp.rehechas },
  );
  const aMedias = new Compilacion(pieza());
  aMedias.enElPintado(gl, escena, camara);
  let soltadas = 0;
  aMedias.soltarCuandoSePueda(() => soltadas++);
  const soltadasAMedias = soltadas;
  gl.acabar();
  await vuelta();
  let soltadaYa = 0;
  new Compilacion(pieza()).soltarCuandoSePueda(() => soltadaYa++);
  comprobar('lo que se está compilando no se suelta a medias (three mira sus materiales): se suelta al acabar; lo que no se compila, ya', soltadasAMedias === 0 && soltadas === 1 && soltadaYa === 1, {
    soltadasAMedias,
    soltadas,
    soltadaYa,
  });

  /* El relevo de una pieza suelta (el cielo, la lluvia). */
  gl.estado = 'a';
  const grupo = new THREE.Group();
  const relevo = new RelevoDePieza(grupo);
  const [c1, c2, c3, c4] = [pieza(), pieza(), pieza(), pieza()];
  const sueltas: string[] = [];
  relevo.poner(c1, () => sueltas.push('c1'));
  const primeraYa = relevo.mostrada === c1 && grupo.children.length === 1 && grupo.children[0] === c1;
  relevo.poner(c2, () => sueltas.push('c2'));
  relevo.enElPintado(gl, escena, camara);
  relevo.enElPintado(gl, escena, camara);
  const esperaALaCompilacion = relevo.mostrada === c1 && grupo.children[0] === c1;
  gl.acabar();
  await vuelta();
  relevo.enElPintado(gl, escena, camara);
  const relevada = relevo.mostrada === c2 && grupo.children.length === 1 && grupo.children[0] === c2;
  const sueltasEnElRelevo = sueltas.length;
  relevo.soltarLoViejo();
  const sueltasDespues = sueltas.join(',');
  relevo.poner(c3, () => sueltas.push('c3'));
  relevo.enElPintado(gl, escena, camara);
  relevo.poner(c4, () => sueltas.push('c4'));
  const c3AMedias = sueltas.includes('c3');
  gl.acabar();
  await vuelta();
  const c3Dejada = sueltas.includes('c3') && relevo.mostrada === c2;
  relevo.liberar();
  comprobar(
    'el relevo de una pieza: la primera se ve ya, la nueva sólo cuando está compilada, la vieja se suelta en el fotograma siguiente al relevo, y una que se deja se suelta cuando acaba de compilarse',
    primeraYa && esperaALaCompilacion && relevada && sueltasEnElRelevo === 0 && sueltasDespues === 'c1' && !c3AMedias && c3Dejada && relevo.relevos === 1 && grupo.children.length === 0,
    { primeraYa, esperaALaCompilacion, relevada, sueltasEnElRelevo, sueltasDespues, c3AMedias, c3Dejada, relevos: relevo.relevos },
  );

  /* El bloque al cambiar de nivel. */
  const bloque = new BloqueAlCambiar(0);
  const toca: boolean[] = [];
  for (let k = 0; k < 3; k++) toca.push(bloque.toca('E0'));
  bloque.ponerLaClave(0);
  toca.push(bloque.toca('E0'));
  bloque.ponerLaClave(1);
  for (let k = 0; k < PINTADOS_EN_BLOQUE + 2; k++) toca.push(bloque.toca('E0'));
  toca.push(bloque.toca('E1'));
  toca.push(bloque.toca('E1'));
  const esperado = [false, false, false, false, ...Array.from({ length: PINTADOS_EN_BLOQUE }, () => true), false, false, true, false];
  const renderizador = (tono: number, color: string, sombras: boolean): Parameters<typeof claveDelPintado>[0] => ({ toneMapping: tono, outputColorSpace: color, shadowMap: { enabled: sombras } });
  const claves = new Set([
    claveDelPintado(renderizador(0, 'srgb', false), false),
    claveDelPintado(renderizador(4, 'srgb', false), false),
    claveDelPintado(renderizador(0, 'srgb-linear', false), false),
    claveDelPintado(renderizador(0, 'srgb', true), false),
    claveDelPintado(renderizador(0, 'srgb', false), true),
  ]);
  comprobar(
    `tras un cambio de nivel se compila en bloque ${String(PINTADOS_EN_BLOQUE)} pintados, y una vez cuando cambia el estado del renderizador (mapeo tonal, color de salida, sombras o blanco); nunca más`,
    toca.join(',') === esperado.join(',') && claves.size === 5 && bloque.bloques === PINTADOS_EN_BLOQUE + 1,
    { toca, esperado, claves: claves.size, bloques: bloque.bloques },
  );
  const enLaEscena = new THREE.Scene();
  const visible = pieza();
  const apagada = pieza();
  apagada.visible = false;
  const dentroApagado = pieza();
  dentroApagado.visible = false;
  visible.add(dentroApagado);
  enLaEscena.add(visible, apagada);
  const antes = gl.compilados.length;
  compilarEnBloque(gl, enLaEscena, camara);
  const pedidos = gl.compilados.slice(antes);
  comprobar(
    'el bloque pide lo que cuelga de la escena y se ve (con lo apagado de dentro: el muro del Bis está montado y apagado hasta el Bis), y no lo que está apagado entero',
    pedidos.length === 1 && pedidos[0] === visible && gl.info.programs.length > 0,
    pedidos.map((o) => o.uuid),
  );

  /* Los programas que se guardan: lo soltado no se suelta hasta que llega otro juego de su clave (o más, si se pide). */
  const soltados = new Set<string>();
  const material = (nombre: string): THREE.Material => {
    const m = new THREE.MeshBasicMaterial({ name: nombre });
    m.addEventListener('dispose', () => soltados.add(nombre));
    return m;
  };
  guardarLosProgramas('prueba-uno', [material('a1'), material('a2')]);
  const trasElPrimero = soltados.size;
  guardarLosProgramas('prueba-uno', [material('b1')]);
  const trasElSegundo = [...soltados].sort().join(',');
  guardarLosProgramas('prueba-dos', [material('c1')], 2);
  guardarLosProgramas('prueba-dos', [material('c2')], 2);
  const conDos = soltados.has('c1') || soltados.has('c2');
  guardarLosProgramas('prueba-dos', [material('c3')], 2);
  comprobar(
    'lo que se guarda con sus programas no se suelta hasta que llegan más juegos de su clave de los que se guardan, y entonces se suelta el más viejo',
    trasElPrimero === 0 && trasElSegundo === 'a1,a2' && !conDos && soltados.has('c1') && !soltados.has('c2') && materialesGuardados('prueba-uno') === 1 && materialesGuardados('prueba-dos') === 2,
    { trasElPrimero, trasElSegundo, conDos, soltados: [...soltados] },
  );
}

paso('Las palancas de la ciudad por nivel no bajan al subir de nivel, campo a campo');
{
  /*
   * PLAN DEL DETALLE DE LA CIUDAD, §5.2.7 y O1-VERIFICACION (8), con la decisión 1 del acta de la ola 1: toda tabla de
   * adorno por nivel se exporta con nombre `*_POR_NIVEL` y forma `Record<0|1|2|3, …>`, y lo que da no BAJA al subir de
   * nivel: un número no baja, un sí no pasa a no, y una tabla de objetos (`TOPE_DEL_SOMBREADOR_POR_NIVEL`, con
   * `{ instrucciones, lecturas }`) no baja en NINGUNO de sus campos. Se buscan en `src/quiebro/ciudad/**` con
   * `palancasDelFichero`: se importa todo fichero cuyo texto CRUDO nombra `_POR_NIVEL`, y se miran TODAS las claves
   * `*_POR_NIVEL` que su módulo exporta. Lo que el código declara con ese nombre (`const`, `let`, `var` o `as` en un
   * `export { … }`, leído sin comentarios) sólo sirve para lo contrario: una tabla que se declara y no se exporta no
   * se puede mirar, y es roja.
   */
  const RAIZ = fileURLToPath(new URL('../src/quiebro/ciudad/', import.meta.url));
  const tablas: TablaPorNivel[] = [];
  const problemas: string[] = [];
  for (const rel of readdirSync(RAIZ, { recursive: true }) as string[]) {
    if (!/\.tsx?$/.test(rel) || /\.d\.ts$/.test(rel)) continue;
    const ruta = join(RAIZ, rel);
    const delFichero = await palancasDelFichero(rel.replace(/\\/g, '/'), readFileSync(ruta, 'utf8'), async () => (await import(pathToFileURL(ruta).href)) as Record<string, unknown>);
    tablas.push(...delFichero.tablas);
    problemas.push(...delFichero.problemas);
  }
  const miradas = new Set<string>();
  for (const t of tablas) {
    const mal = juzgarLaPalanca(t.nombre, t.tabla);
    if (mal.length > 0) problemas.push(...mal.map((x) => `${t.fichero}: ${x}`));
    else miradas.add(t.nombre);
  }
  const distintas = new Set(tablas.map((t) => t.nombre)).size;
  nota(`${String(distintas)} tablas *_POR_NIVEL en ciudad/** (${String(tablas.length)} exportaciones): ${[...miradas].join(', ')}`);
  comprobar(
    `toda tabla *_POR_NIVEL de la ciudad se exporta y no baja al subir de nivel, campo a campo (${String(distintas)} miradas; mínimo ${String(MINIMO_DE_PALANCAS)})`,
    problemas.length === 0 && distintas >= MINIMO_DE_PALANCAS,
    problemas,
  );
  /* LAS VACUNAS: una tabla que baja, un campo que baja en una tabla de objetos, un sí que pasa a no, un nivel que falta y una forma que no se lee. */
  comprobar(
    'vacuna: una tabla que baja, un campo de una tabla de objetos que baja, un sí que pasa a no, un nivel que falta y un valor que no es número ni sí/no salen rojos; las que suben o se quedan, no',
    juzgarLaPalanca('BAJA_POR_NIVEL', { 0: 1, 1: 2, 2: 1, 3: 3 }).length > 0 &&
      juzgarLaPalanca('CAMPO_POR_NIVEL', { 0: { instrucciones: 400, lecturas: 3 }, 1: { instrucciones: 900, lecturas: 3 }, 2: { instrucciones: 1400, lecturas: 2 }, 3: { instrucciones: 2000, lecturas: 4 } }).length > 0 &&
      juzgarLaPalanca('SI_POR_NIVEL', { 0: true, 1: true, 2: false, 3: true }).length > 0 &&
      juzgarLaPalanca('FALTA_POR_NIVEL', { 0: 1, 1: 2, 3: 3 }).length > 0 &&
      juzgarLaPalanca('RARA_POR_NIVEL', { 0: 'a', 1: 'b', 2: 'c', 3: 'd' }).length > 0 &&
      juzgarLaPalanca('BIEN_POR_NIVEL', { 0: 0, 1: 4, 2: 4, 3: 8 }).length === 0 &&
      juzgarLaPalanca('OBJETOS_POR_NIVEL', { 0: { instrucciones: 461, lecturas: 3 }, 1: { instrucciones: 1000, lecturas: 3 }, 2: { instrucciones: 1500, lecturas: 4 }, 3: { instrucciones: 2000, lecturas: 4 } }).length === 0 &&
      juzgarLaPalanca('SIES_POR_NIVEL', { 0: false, 1: false, 2: true, 3: true }).length === 0,
  );
  /* LA VACUNA DE LA BÚSQUEDA: una tabla con `let`, una re-exportada con otro nombre y una sin exportar se ven (la primera versión sólo veía `const`); un `import … as X_POR_NIVEL` no es una declaración. */
  const deMentira = [
    'export let A_POR_NIVEL = { 0: 1, 1: 2, 2: 3, 3: 4 };',
    'const B_POR_NIVEL = { 0: 1, 1: 2, 2: 3, 3: 4 };',
    'const c = { 0: 1, 1: 2, 2: 3, 3: 4 };',
    'export { c as C_POR_NIVEL };',
    "import { D as D_POR_NIVEL } from './otro';",
  ].join('\n');
  const vistas = descubrirLasPalancas(deMentira, ['A_POR_NIVEL', 'C_POR_NIVEL', 'OTRA_COSA']);
  const soloImportada = descubrirLasPalancas("import { D as D_POR_NIVEL } from './otro';\nconst x = D_POR_NIVEL[0];", []);
  comprobar(
    'vacuna de la búsqueda: una tabla con `let` y una re-exportada con `as` se miran, una sin exportar sale roja, y un `import … as` no cuenta como declarada',
    puedeTenerPalancas(deMentira) && vistas.aMirar.join(',') === 'A_POR_NIVEL,C_POR_NIVEL' && vistas.sinExportar.join(',') === 'B_POR_NIVEL' && soloImportada.sinExportar.length === 0,
    { vistas, soloImportada },
  );
  /*
   * LA VACUNA DEL '/*' EN UNA CADENA (revisión 2 de la ola 1b): un fichero con esa cadena antes de su tabla, y un
   * cierre en otra cadena detrás. Quitando comentarios a ojo, la tabla desaparece del texto (la primera condición lo
   * enseña: ESE era el camino por el que no se importaba el fichero); con el texto crudo el fichero se importa, y su
   * tabla, que baja, se mira y sale roja.
   */
  const conLaCadena = ["const abre = '/*';", 'export const E_POR_NIVEL = { 0: 3, 1: 2, 2: 1, 3: 0 };', "const cierra = '*/';"].join('\n');
  const delFicheroDeMentira = await palancasDelFichero('de-mentira.ts', conLaCadena, () => Promise.resolve({ E_POR_NIVEL: { 0: 3, 1: 2, 2: 1, 3: 0 } }));
  const juzgadas = delFicheroDeMentira.tablas.flatMap((t) => juzgarLaPalanca(t.nombre, t.tabla));
  comprobar(
    "vacuna del '/*' dentro de una cadena: quitando comentarios la tabla se pierde, pero el fichero se importa por su texto crudo y su tabla, que baja, sale roja",
    !sinComentarios(conLaCadena).includes('E_POR_NIVEL') && delFicheroDeMentira.tablas.map((t) => t.nombre).join(',') === 'E_POR_NIVEL' && juzgadas.length > 0,
    { tablas: delFicheroDeMentira.tablas.map((t) => t.nombre), problemas: delFicheroDeMentira.problemas, juzgadas },
  );
}

terminar({
  escritas: 83,
  enVerde:
    'Los niveles son los del §8; el gobernador baja deprisa, sube a prueba, no vuelve a lo que falló y no se deja engañar por la pestaña oculta; el sondeo arranca a cada aparato donde toca; la gradación respeta la paleta y la LUT es su fórmula; el tono de N0 entra en la three instalada; los sombreadores declaran lo que sus materiales les dan; lo que se va a pintar se compila antes, sin esperar al compilador en el fotograma que lo usa; y ninguna palanca de la ciudad baja al subir de nivel.',
});
