/**
 * ¿SE SOSTIENE LA ARITMÉTICA DEL MUELLE? La cala, la cámara, los gestos, el
 * presupuesto y la paleta, en Node y sin abrir un contexto de dibujo.
 *
 * ═══ QUÉ COMPRA ESTE GUION ═══
 *
 * `escenas/embarcadero/` separa a propósito lo que es aritmética pura (`cala.ts`,
 * `camara.ts`, `gestos.ts`, `presupuesto.ts`, `tema.ts`) de lo que dibuja. Esto
 * recorre lo primero y comprueba lo que, si estuviera mal, no daría ningún error
 * en ninguna consola:
 *
 *   · Que la cala es DETERMINISTA: la misma semilla da byte a byte el mismo JSON,
 *     y dos códigos distintos dan calas distintas. Es lo que hace que los seis
 *     aparatos de una mesa vean la misma orilla.
 *   · Que hay exactamente SEIS amarres, sobre agua o sobre tablas, separados más
 *     de cuatro unidades, con tablas bajo cada punto de pie y el barco en el
 *     agua. Un amarre en tierra sería un barco atracado en la hierba.
 *   · Que las orillas CIERRAN: ninguna tesela de tierra toca agua sin una pieza de
 *     costa. Sin esto se ve un canto de tierra cortado a pico sobre el mar.
 *   · Que la CÁMARA deja al aventurero local entero y por encima de la hoja del
 *     HUD en 9:19,5 con la hoja al 36 %, 3:4 con 0,3 y 16:9 con 0, y con 1, 2, 4 y
 *     6 ocupados. Es la promesa del §3 y se comprueba con la misma proyección que
 *     usa la escena.
 *   · Que los GESTOS nunca devuelven `t-pose` en diez mil pasos con sucesos al
 *     azar sembrados, que todos los clips que piden existen en `animaciones.glb`
 *     con la duración que `gestos.ts` tiene apuntada, y que toda fase transitoria
 *     se sale sola.
 *   · Que el PRESUPUESTO del §2 se cumple con las multiplicidades REALES de una
 *     cala llena (la que genera `cala.ts`, no una estimación) y los triángulos
 *     por pieza leídos de `embarcadero.glb`, más lo que la escena añade a mano
 *     (`presupuesto.ts`) y seis aventureros. Se imprime la tabla para que quien
 *     ajuste sepa dónde pesa.
 *   · Que la PALETA de colonos de `tema.ts` es la de `riberas.ts`, leída como
 *     texto porque el juego no la exporta.
 *
 * ═══ SIN `three`, A PROPÓSITO ═══
 *
 * Los módulos que se importan aquí no traen el motor de dibujo. Los `.glb` se
 * abren con `@gltf-transform`, que sólo lee. Lo que hace `three` al cargar lo
 * comprueba `verificar-embarcadero-modelos.ts`.
 *
 * Lo que este guion NO prueba: que se vea bien, ni cuántas llamadas de dibujo
 * salen de verdad. Eso lo enseña el banco `escritorio/lobby3d.html`.
 */
import { NodeIO } from '@gltf-transform/core';
import type { Node } from '@gltf-transform/core';
import fs from 'node:fs';
import path from 'node:path';
import { ALTURA_DE_UNA_PERSONA } from '../escala';
import {
  generarCala,
  hayMuelleEn,
  SEMILLA_DE_LA_ORILLA,
  semillaDeCodigo,
  sorteo,
  teselaBajo,
  teselasDeTierra,
} from '../embarcadero/cala';
import type { Cala } from '../embarcadero/cala';
import { DURACION_DEL_ZARPE as ZARPE_DE_LA_CAMARA, encuadre, limiteDeLosPies, mira, proyecta } from '../embarcadero/camara';
import { CLIP, FIGURAS } from '../embarcadero/figuras';
import type { NombreDeClip } from '../embarcadero/figuras';
import {
  clipQueToca,
  DURACION,
  DURACION_DEL_ZARPE,
  nacer,
  progresoDeZarpe,
  siguiente,
} from '../embarcadero/gestos';
import type { EstadoDeAventurero, Fase, ModoDeNacer, Suceso } from '../embarcadero/gestos';
import { PIEZA, PIEZAS_DEL_EMBARCADERO } from '../embarcadero/piezas';
import { renglonesFijos, TOPE_DE_TRIANGULOS } from '../embarcadero/presupuesto';
import { temaDelMuelle } from '../embarcadero/tema';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : ` — ${JSON.stringify(detalle)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..');
const EMBARCADERO = path.join(RAIZ, 'modelos', 'embarcadero.glb');
const AVENTUREROS = path.join(RAIZ, 'modelos', 'aventureros');
const RIBERAS = path.resolve(RAIZ, '..', 'shared', 'arcade', 'juegos', 'riberas.ts');

const ORILLAS: readonly string[] = [PIEZA.orillaA, PIEZA.orillaB, PIEZA.orillaC, PIEZA.orillaD, PIEZA.orillaE];
const CODIGOS = ['ABCDE', 'QWERT', 'ZXCVB', 'MNBVC', 'HOLAA', 'RIBER', 'DELTA', 'MUELL'];

// ---------------------------------------------------------------------------
paso('La cala es determinista, y distinta para dos códigos');
// ---------------------------------------------------------------------------

{
  const a = JSON.stringify(generarCala(semillaDeCodigo('ABCDE')));
  const b = JSON.stringify(generarCala(semillaDeCodigo('ABCDE')));
  const c = JSON.stringify(generarCala(semillaDeCodigo('QWERT')));
  comprobar('la misma semilla da byte a byte la misma cala', a === b);
  comprobar('y dos códigos distintos dan calas distintas', a !== c);
  comprobar('sin código se usa la semilla fija de la orilla', semillaDeCodigo(null) === SEMILLA_DE_LA_ORILLA && semillaDeCodigo('') === SEMILLA_DE_LA_ORILLA);
  comprobar('y el código no distingue mayúsculas', semillaDeCodigo('abcde') === semillaDeCodigo('ABCDE'));
}

// ---------------------------------------------------------------------------
paso('Seis amarres, sobre agua o tablas, separados y con suelo bajo los pies');
// ---------------------------------------------------------------------------

const calas: Cala[] = CODIGOS.map((c) => generarCala(semillaDeCodigo(c)));
const cala = calas[0] as Cala;

{
  comprobar('exactamente seis amarres', cala.amarres.length === 6, cala.amarres.length);
  const enTierra = cala.amarres.filter((a) => {
    const t = teselaBajo(cala, a.x, a.z);
    return t !== undefined && t.clase !== 'agua' && !hayMuelleEn(cala, a.x, a.z);
  });
  comprobar('cada amarre está sobre agua o sobre tablas', enTierra.length === 0, enTierra.map((a) => a.indice));
  const juntos: string[] = [];
  for (const a of cala.amarres) {
    for (const b of cala.amarres) {
      if (a.indice < b.indice && Math.hypot(a.x - b.x, a.z - b.z) <= 4) juntos.push(`${String(a.indice)}-${String(b.indice)}`);
    }
  }
  comprobar('y a más de cuatro unidades entre sí', juntos.length === 0, juntos);
  const sinSuelo = cala.amarres.filter((a) => !hayMuelleEn(cala, a.pie.x, a.pie.z));
  comprobar('la tesela bajo cada punto de pie tiene tablas', sinSuelo.length === 0, sinSuelo.map((a) => a.indice));
  const barcosEnTierra = calas.flatMap((c) =>
    c.amarres.filter((a) => {
      const t = teselaBajo(c, a.barco.x, a.barco.z);
      return t !== undefined && t.clase === 'tierra';
    }),
  );
  comprobar('y el barco de cada amarre flota en el agua, en todas las semillas probadas', barcosEnTierra.length === 0, barcosEnTierra.map((a) => a.indice));
  const fijos = calas.every((c) => JSON.stringify(c.amarres) === JSON.stringify(cala.amarres) && JSON.stringify(c.muelle) === JSON.stringify(cala.muelle));
  comprobar('los amarres y el muelle son los mismos con cualquier semilla: la cámara se comprueba contra ellos', fijos);
}

// ---------------------------------------------------------------------------
paso('Las orillas cierran y la cala tiene lo que el §2 dice');
// ---------------------------------------------------------------------------

{
  const abiertas: string[] = [];
  const raras: string[] = [];
  const tierras: number[] = [];
  for (const c of calas) {
    const porLlave = new Map(c.teselas.map((t) => [`${String(t.q)},${String(t.r)}`, t]));
    const vecinosDe = (q: number, r: number): Array<{ q: number; r: number }> => [
      { q: q + 1, r },
      { q: q + 1, r: r - 1 },
      { q, r: r - 1 },
      { q: q - 1, r },
      { q: q - 1, r: r + 1 },
      { q, r: r + 1 },
    ];
    for (const t of c.teselas) {
      if (t.clase === 'agua') continue;
      const tocaAgua = vecinosDe(t.q, t.r).some((v) => {
        const vecina = porLlave.get(`${String(v.q)},${String(v.r)}`);
        return vecina === undefined || vecina.clase === 'agua';
      });
      if (tocaAgua && (t.pieza === null || !ORILLAS.includes(t.pieza))) abiertas.push(`${String(c.semilla)}:${String(t.q)},${String(t.r)}`);
      if (!tocaAgua && t.pieza !== PIEZA.tesela) raras.push(`${String(c.semilla)}:${String(t.q)},${String(t.r)}`);
    }
    tierras.push(teselasDeTierra(c));
  }
  comprobar('ninguna tesela de tierra toca agua sin pieza de orilla, en ocho semillas', abiertas.length === 0, abiertas.slice(0, 8));
  comprobar('y ninguna tesela interior lleva pieza de orilla', raras.length === 0, raras.slice(0, 8));
  comprobar('la tierra ronda las noventa teselas', tierras.every((n) => n >= 60 && n <= 130), tierras);

  const nombres = new Set(PIEZAS_DEL_EMBARCADERO.map((p) => p.nombre));
  const desconocidas = calas.flatMap((c) => c.piezas.filter((p) => !nombres.has(p.pieza)).map((p) => p.pieza));
  comprobar('toda pieza puesta existe en piezas.ts', desconocidas.length === 0, desconocidas);

  const caserio: readonly string[] = [PIEZA.taberna, PIEZA.casa, PIEZA.casaB, PIEZA.pozo, PIEZA.astillero, PIEZA.atalaya, PIEZA.molino, PIEZA.varadero];
  const mal: string[] = [];
  for (const c of calas) {
    for (const nombre of caserio) {
      const puestas = c.piezas.filter((p) => p.pieza === nombre);
      if (puestas.length !== 1) {
        mal.push(`${String(c.semilla)}:${nombre}×${String(puestas.length)}`);
        continue;
      }
      const p = puestas[0];
      const t = p === undefined ? undefined : teselaBajo(c, p.x, p.z);
      if (t === undefined || t.clase === 'agua') mal.push(`${String(c.semilla)}:${nombre} en el agua`);
    }
  }
  comprobar('el caserío del §2 está una vez y en tierra: taberna, dos casas, pozo, astillero, atalaya, molino y varadero', mal.length === 0, mal);
}

// ---------------------------------------------------------------------------
paso('La cámara deja al local entero y por encima de la hoja');
// ---------------------------------------------------------------------------

{
  const ventanas: ReadonlyArray<{ nombre: string; aspecto: number; franja: number }> = [
    { nombre: '9:19,5 con hoja 0,36', aspecto: 9 / 19.5, franja: 0.36 },
    { nombre: '3:4 con hoja 0,3', aspecto: 3 / 4, franja: 0.3 },
    { nombre: '16:9 sin hoja', aspecto: 16 / 9, franja: 0 },
  ];
  for (const v of ventanas) {
    for (const ocupados of [1, 2, 4, 6]) {
      const m = mira(v.aspecto, v.franja, ALTURA_DE_UNA_PERSONA, ocupados);
      comprobar(`${v.nombre} y ${String(ocupados)} ocupados: el local cabe`, m.cabe, {
        pies: Number(m.pies.toFixed(3)),
        limite: Number(limiteDeLosPies(v.franja).toFixed(3)),
        cabeza: Number(m.cabeza.toFixed(3)),
        hombros: m.hombros.map((h) => Number(h.toFixed(3))),
      });
    }
  }
  /* Y la pose aérea del zarpe mira hacia la cala, no al revés. */
  const base = encuadre(6, 16 / 9, 0);
  const mar = proyecta(base, 16 / 9, { x: 0, y: 0, z: -30 });
  comprobar('desde el reposo, el mar queda delante de la cámara y por encima del local en pantalla', mar.delante && mar.y > proyecta(base, 16 / 9, { x: 0, y: 0, z: 0 }).y);
}

// ---------------------------------------------------------------------------
paso('Los gestos nunca piden t-pose, los clips existen y toda fase transitoria se sale');
// ---------------------------------------------------------------------------

const clipsDelFichero = new Map<string, number>();
{
  const io = new NodeIO();
  const doc = await io.read(path.join(AVENTUREROS, 'animaciones.glb'));
  for (const anim of doc.getRoot().listAnimations()) {
    let fin = 0;
    for (const s of anim.listSamplers()) {
      const entrada = s.getInput();
      if (entrada !== null) fin = Math.max(fin, entrada.getMax([])[0] ?? 0);
    }
    clipsDelFichero.set(anim.getName(), fin);
  }
}

{
  const SUCESOS: readonly Suceso[] = ['tic', 'tic', 'tic', 'tic', 'saluda', 'se-ausenta', 'vuelve', 'se-viste', 'zarpa'];
  const MODOS: readonly ModoDeNacer[] = ['aparecer', 'quieto', 'barco'];
  const conTPose: string[] = [];
  const sinClip: string[] = [];
  const fases = new Set<Fase>();
  const azar = sorteo(0xc0ffee);
  let ahora = 0;
  let e: EstadoDeAventurero = nacer(1, ahora, 'quieto', 0.3);
  for (let i = 0; i < 10_000; i++) {
    ahora += azar() * 0.6;
    const suceso = SUCESOS[Math.floor(azar() * SUCESOS.length)] ?? 'tic';
    e = siguiente(e, suceso, ahora);
    /* Cada mil pasos, vuelve a nacer de otro modo, para recorrer los tres. */
    if (i % 1000 === 999) e = nacer(i, ahora, MODOS[Math.floor(i / 1000) % MODOS.length] ?? 'quieto', azar() * 1.5, azar() < 0.8);
    fases.add(e.fase);
    const clip = clipQueToca(e, ahora);
    if (clip.clip === CLIP.tPose) conTPose.push(`${String(i)}:${e.fase}`);
    if (!clipsDelFichero.has(clip.clip)) sinClip.push(`${String(i)}:${clip.clip}`);
  }
  comprobar('en diez mil pasos con sucesos al azar nunca sale t-pose', conTPose.length === 0, conTPose.slice(0, 5));
  comprobar('y todos los clips pedidos están en animaciones.glb', sinClip.length === 0, sinClip.slice(0, 5));
  comprobar('el recorrido pasa por todas las fases', ['naciendo', 'llegando', 'esperando', 'ausente', 'vistiendose', 'zarpando', 'zarpado'].every((f) => fases.has(f as Fase)), [...fases]);

  const duracionesMal: string[] = [];
  for (const nombre of Object.values(CLIP)) {
    const enFichero = clipsDelFichero.get(nombre);
    const apuntada = DURACION[nombre as NombreDeClip];
    if (enFichero === undefined) duracionesMal.push(`${nombre}: no está en el fichero`);
    else if (nombre !== CLIP.tPose && Math.abs(enFichero - apuntada) > 0.02) duracionesMal.push(`${nombre}: ${String(enFichero.toFixed(3))} en el fichero, ${String(apuntada)} apuntado`);
  }
  comprobar('las duraciones de gestos.ts son las de los clips compilados', duracionesMal.length === 0, duracionesMal);

  /* Toda fase transitoria se sale sola con tics, en un tiempo acotado. */
  const atascadas: string[] = [];
  const transitorias: Fase[] = ['naciendo', 'llegando', 'vistiendose', 'zarpando'];
  const prueba = (nombre: string, inicial: EstadoDeAventurero, desde: number): void => {
    let est = inicial;
    let t = desde;
    for (let i = 0; i < 400; i++) {
      t += 0.05;
      est = siguiente(est, 'tic', t);
      if (!transitorias.includes(est.fase)) return;
    }
    atascadas.push(`${nombre} se queda en ${est.fase}`);
  };
  for (const modo of MODOS) {
    for (const presente of [true, false]) {
      const inicial = nacer(7, 0, modo, 1.2, presente);
      prueba(`nacer ${modo}${presente ? '' : ' ausente'}`, inicial, 0);
      prueba(`vestirse tras nacer ${modo}`, siguiente(inicial, 'se-viste', 0.1), 0.1);
      prueba(`zarpar tras nacer ${modo}`, siguiente(inicial, 'zarpa', 0.1), 0.1);
    }
  }
  comprobar('toda fase transitoria se sale sola en menos de veinte segundos', atascadas.length === 0, atascadas);

  const zarpando = siguiente(nacer(3, 0, 'quieto', 1.0), 'zarpa', 5);
  const alFinal = siguiente(zarpando, 'tic', 5 + DURACION_DEL_ZARPE + 0.01);
  comprobar('el zarpe termina en 3,2 s con el retraso del asiento incluido, y coincide con el de la cámara', alFinal.fase === 'zarpado' && progresoDeZarpe(alFinal, 5 + DURACION_DEL_ZARPE + 0.01).etapa === 'hecho' && DURACION_DEL_ZARPE === ZARPE_DE_LA_CAMARA && DURACION_DEL_ZARPE <= 3.2, {
    fase: alFinal.fase,
    gestos: DURACION_DEL_ZARPE,
    camara: ZARPE_DE_LA_CAMARA,
  });
}

// ---------------------------------------------------------------------------
paso('Una cala llena con seis sentados cabe en el presupuesto del §2');
// ---------------------------------------------------------------------------

/** Los triángulos bajo un nodo, con sus hijos. */
function triangulosDe(nodo: Node): number {
  let t = 0;
  const malla = nodo.getMesh();
  if (malla !== null) {
    for (const prim of malla.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos !== null) t += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
    }
  }
  for (const h of nodo.listChildren()) t += triangulosDe(h);
  return t;
}

{
  const io = new NodeIO();
  const triangulosPorPieza = new Map<string, number>();
  if (fs.existsSync(EMBARCADERO)) {
    const doc = await io.read(EMBARCADERO);
    for (const raiz of doc.getRoot().listScenes().flatMap((e) => e.listChildren())) triangulosPorPieza.set(raiz.getName(), triangulosDe(raiz));
  }
  comprobar('embarcadero.glb está compilado y trae triángulos por pieza', triangulosPorPieza.size > 0);

  const porFigura = new Map<string, number>();
  for (const f of FIGURAS) {
    const ruta = path.join(AVENTUREROS, f.fichero);
    if (!fs.existsSync(ruta)) continue;
    const doc = await io.read(ruta);
    porFigura.set(f.id, doc.getRoot().listScenes().flatMap((e) => e.listChildren()).reduce((s, n) => s + triangulosDe(n), 0));
  }
  comprobar('los seis aventureros están compilados', porFigura.size === FIGURAS.length, [...porFigura.keys()]);
  const figuras = [...porFigura.values()];
  const media = figuras.length === 0 ? 0 : figuras.reduce((a, b) => a + b, 0) / figuras.length;
  const peor = figuras.reduce((a, b) => Math.max(a, b), 0);

  /* La cala más pesada de las probadas: las multiplicidades reales, no una estimación. */
  let peorCala: { semilla: number; total: number; filas: Array<[string, number, number]> } | null = null;
  for (const c of calas) {
    const cuantos = new Map<string, number>();
    const suma = (n: string): void => {
      cuantos.set(n, (cuantos.get(n) ?? 0) + 1);
    };
    for (const t of c.teselas) if (t.pieza !== null) suma(t.pieza);
    for (const p of c.piezas) suma(p.pieza);
    let total = 0;
    const filas: Array<[string, number, number]> = [];
    for (const [n, k] of cuantos) {
      const tri = (triangulosPorPieza.get(n) ?? 0) * k;
      total += tri;
      filas.push([n, k, tri]);
    }
    if (peorCala === null || total > peorCala.total) peorCala = { semilla: c.semilla, total, filas };
  }
  const laCala = peorCala ?? { semilla: 0, total: 0, filas: [] };
  laCala.filas.sort((a, b) => b[2] - a[2]);
  const fijos = renglonesFijos(triangulosPorPieza, media, 6);
  const totalFijo = fijos.reduce((s, r) => s + r.triangulos, 0);
  const total = laCala.total + totalFijo;
  const conLaPeorFigura = total - fijos.filter((r) => r.que.startsWith('aventureros')).reduce((s, r) => s + r.triangulos, 0) + 6 * peor;

  console.log(`  La cala más pesada (semilla ${String(laCala.semilla)}): ${Math.round(laCala.total).toLocaleString('es-ES')} triángulos en ${String(laCala.filas.reduce((s, f) => s + f[1], 0))} piezas puestas`);
  for (const [n, k, tri] of laCala.filas.slice(0, 14)) console.log(`    ${n.padEnd(20)} × ${String(k).padStart(3)} = ${Math.round(tri).toLocaleString('es-ES').padStart(7)}`);
  console.log('  Lo que la escena añade con seis sentados:');
  for (const r of fijos) console.log(`    ${r.que.padEnd(34)} × ${String(r.cuantos).padStart(3)} = ${Math.round(r.triangulos).toLocaleString('es-ES').padStart(7)}`);
  console.log(`  Aventureros: media ${Math.round(media).toLocaleString('es-ES')}, el más pesado ${Math.round(peor).toLocaleString('es-ES')} (${[...porFigura.entries()].map(([f, t]) => `${f} ${String(Math.round(t))}`).join(', ')})`);
  console.log(`  TOTAL ${Math.round(total).toLocaleString('es-ES')} triángulos con figuras medias; ${Math.round(conLaPeorFigura).toLocaleString('es-ES')} si los seis fueran la más pesada; tope ${TOPE_DE_TRIANGULOS.toLocaleString('es-ES')}`);

  comprobar(`una cala llena con seis sentados baja de ${TOPE_DE_TRIANGULOS.toLocaleString('es-ES')} triángulos`, total > 0 && total < TOPE_DE_TRIANGULOS, Math.round(total));
  comprobar('la cala sola no pasa de 43.000: el resto es de los aventureros y de lo que la escena añade', laCala.total > 0 && laCala.total < 43_000, Math.round(laCala.total));
  const sinTriangulos = laCala.filas.filter(([, , tri]) => tri === 0).map(([n]) => n);
  comprobar('toda pieza que la cala pone tiene geometría en el fichero', sinTriangulos.length === 0, sinTriangulos);
}

// ---------------------------------------------------------------------------
paso('La paleta de colonos de tema.ts es la de riberas.ts');
// ---------------------------------------------------------------------------

{
  const texto = fs.existsSync(RIBERAS) ? fs.readFileSync(RIBERAS, 'utf8') : '';
  const bloque = /COLORES_DE_COLONO\s*:\s*readonly string\[\]\s*=\s*\[([^\]]*)\]/.exec(texto);
  const delJuego = bloque === null ? [] : [...(bloque[1] ?? '').matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toLowerCase());
  const tema = temaDelMuelle('riberas');
  comprobar('riberas.ts declara COLORES_DE_COLONO con seis #rrggbb', delJuego.length === 6, delJuego);
  comprobar('tema.ts tiene muelle para riberas con seis colores #rrggbb', tema !== undefined && tema.colonos.length === 6 && tema.colonos.every((c) => /^#[0-9a-f]{6}$/.test(c)), tema?.colonos);
  comprobar('y son los mismos seis, en el mismo orden', JSON.stringify(delJuego) === JSON.stringify(tema?.colonos.map((c) => c.toLowerCase())), { juego: delJuego, tema: tema?.colonos });
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS». Ver `verificar-escena.ts`: un guion que se
 * cae a la mitad termina con código cero y una lista corta de aciertos, y eso se lee
 * como verde. El número va a mano y hay que subirlo al añadir comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 42;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones que ` +
      'tiene escritas este guion: se ha caído por el camino sin decirlo. ' +
      'Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`${String(hechas)} comprobaciones`);
  console.log(
    '\nLa cala sale igual para la misma semilla y distinta para otro código; los seis amarres están\n' +
      'en el agua con tablas bajo los pies; las orillas cierran; la cámara deja al local entero sobre\n' +
      'la hoja en las tres ventanas y los cuatro aforos; los gestos nunca piden t-pose y salen de toda\n' +
      'fase; una cala llena con seis sentados cabe en el presupuesto; y la paleta es la de Riberas.\n' +
      'Lo que esto NO prueba es que se vea bien ni cuántas llamadas salen: eso es del banco.',
  );
  process.exit(0);
}

process.exit(1);
