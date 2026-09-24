/**
 * ¿LOS PERSONAJES DEL QUIEBRO HACEN LO QUE PROMETEN? El reparto, los gestos, el golpe en su instante,
 * el paso sin patinar, el espejo, el presupuesto y la multitud en el sitio del guion, comprobados sin
 * navegador y con los `.glb` de verdad.
 *
 *   npx tsx scripts/verificar-quiebro-personajes.ts        (desde escritorio/)
 *
 * ═══ QUÉ AFIRMA ═══
 *
 *   1. EL MANIFIESTO (`recursos/reparto.json`) se lee, y leerlo rechaza uno roto. Todo `Gesto` de
 *      `cuerpos.ts` tiene clip, y todo clip pedido (por gesto, por dirección y de la marcha) está en el
 *      `.glb` de clips de CADA esqueleto con su duración; los golpes traen su instante de impacto dentro
 *      del clip; los clips de marcha, su zancada.
 *   2. LOS MATERIALES: los que el manifiesto nombra están en cada `.glb`; las zonas que se tiñen (abrigo,
 *      traje, forro, ropa, pelo, piel) existen en la figura que las necesita; y la numeración de zonas
 *      del LOD1 es la del LOD0 (se contrasta con los colores horneados).
 *   3. LO QUE NO SALE (§1 del diseño): la malla fundida del desvelado no tiene gafas, la del Celador no
 *      tiene auricular, y el abrigo del desvelado no es cuero negro.
 *   4. LA ANTICIPACIÓN ELÁSTICA: con relojes de mentira, fotogramas desiguales y el anuncio movido a
 *      mitad, el clip cruza su fotograma de impacto a menos de un milisegundo del `impactoMs` (dentro de
 *      la cota de ritmo; fuera, entrando ya avanzado). Y lo mismo de punta a punta, con el mezclador de
 *      three y el clip de verdad en un cuerpo con esqueleto.
 *   5. LOS FUNDIDOS suman 1 siempre, con tres capas vivas, gestos que se reinician y fundidos de 0 ms.
 *   6. EL PASO SIN PATINAR: la mezcla de la marcha hace que el pie de apoyo vaya hacia atrás a la
 *      velocidad del cuerpo, y de punta a punta el pie apoyado de un cuerpo que anda en línea recta no
 *      resbala por el suelo.
 *   7. EL ESPEJO: cada hueso del clip en espejo cae en el reflejo de su pareja, a menos de un milímetro.
 *   8. EL PRESUPUESTO: el renglón de cada nivel cabe en un cuarto del tope del juego, las piezas tienen
 *      los triángulos que declaran, y `repartirElDetalle` nunca da más de lo que el renglón suma.
 *   9. LA MULTITUD: en cada tic entero cada durmiente está EXACTAMENTE donde `sitioDelDurmiente` dice;
 *      entre tics, en el tramo que los une; los Prestados no se pintan; nadie se aparta más de medio
 *      metro. Y la textura de huesos da la misma piel que el esqueleto de three.
 *  9 bis. LA MULTITUD DE LA CIUDAD ABIERTA (CIUDAD-ABIERTA §5.8): de sus unos 630 se pintan los cercanos,
 *      los mismos que dice `durmientesCercaEnLaCiudad` (64 a 90 m), cada uno EXACTAMENTE en su sitio del
 *      guion; los candidatos a Prestado de cada jugador (40 m) siempre; nunca más de 64; el presupuesto
 *      con 64 durmientes a la vista cabe; el director pinta la gente que le da la fuente del juego; y
 *      pintar la ciudad no asigna más por fotograma que el barrio.
 *  10. LA CARGA: cada `.glb` se lee una vez aunque lo pidan muchos, y liberar suelta lo de la GPU.
 *  10 bis. EL PROGRAMA DE LOS PERSONAJES NO SE ENLAZA DOS VECES: un cuerpo soltado se desecha al fotograma
 *      siguiente y nunca en el mismo, y sin nadie el último se guarda sin desechar hasta que vuelve alguien.
 *
 * ═══ CÓMO SE SABE QUE MIRA ═══
 *
 * Cada juez es una función que recibe lo que juzga y se aplica dos veces: a lo de verdad (verde) y a una
 * VACUNA, una copia envenenada que tiene que dar rojo (un manifiesto sin un gesto, un espejo ingenuo, un
 * ritmo fijo, una mezcla sin normalizar, un paso sin acompasar, una multitud desplazada…). Si un juez
 * dejara de mirar, su vacuna saldría verde y el guion rojo. Además cada bloque se vio rojo rompiendo el
 * producto en una copia (el informe del frente «personajes» dice cuáles).
 *
 * ═══ POR QUÉ NO USA `server/scripts/arnes.ts` ═══
 *
 * Porque `verify:fronteras` prohíbe que `escritorio/` importe de `server/`. Se copia la forma del arnés
 * —0 verde, 1 rojo, 2 bloque saltado, 3 reventado— como los demás comprobadores de `escritorio/`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { barrioDeLaNoche } from '../../shared/arcade/juegos/quiebro-barrio';
import type { Barrio } from '../../shared/arcade/juegos/quiebro-barrio';
import { DURMIENTES, guionDeLosDurmientes, sitioDelDurmiente } from '../../shared/arcade/juegos/quiebro-durmientes';
import { UNO } from '../../shared/mecanicas/fijo';
import type { CuerpoPintado, FuenteDeCuerpos, Gesto } from '../src/quiebro/cuerpos';
import { Almacen, cargador, clipEnElSitio, plantillaDeHuesos } from '../src/quiebro/personajes/almacen';
import { TENUE, contornoDe, corteDelGesto, llenoDelContorno } from '../src/quiebro/personajes/cuerpo';
import { DirectorDeLosPersonajes, PRIMER_ID_DE_DURMIENTE } from '../src/quiebro/personajes/director';
import { clipsDeLosLejanos, direccionDelLejano, nombreDelClipLejano } from '../src/quiebro/personajes/lejanos';
import { huesosDelBrazoDerecho, posturaDelParaguas } from '../src/quiebro/personajes/postura';
import { clipEnEspejo, espejoDelEsqueleto, parejaDe } from '../src/quiebro/personajes/espejo';
import type { EspejoDelEsqueleto } from '../src/quiebro/personajes/espejo';
import {
  GESTOS,
  INFO_DE_GESTOS,
  MezclaDeCapas,
  RITMO_ELASTICO,
  direccionRelativa,
  inicioDelGolpe,
  mezclaDeLaMarchaNueva,
  mezclarLaMarcha,
  pesosDeLaMarcha,
  ritmoElastico,
  tiempoDelGesto,
} from '../src/quiebro/personajes/gestos';
import type { MarchaGirada } from '../src/quiebro/personajes/gestos';
import { HornoDeHuesos, filasDeLaMezcla, filasEn, hornearHuesos } from '../src/quiebro/personajes/huesos-en-textura';
import type { HuesosEnTextura } from '../src/quiebro/personajes/huesos-en-textura';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';
import { fundirElLod, paletaBase, simplificarMalla } from '../src/quiebro/personajes/malla';
import { COLOR_DE_AMENAZA } from '../src/quiebro/personajes/material';
import { crearLaMultitud, genteDeLaCiudad, genteDelBarrio, moverLaMultitud, ticPintado, APARTE_COMO_MUCHO_M, DURMIENTES_PINTADOS_COMO_MUCHO } from '../src/quiebro/personajes/multitud';
import type { GenteDeLaNoche, MiradaDeLaMultitud } from '../src/quiebro/personajes/multitud';
import { ciudadDeLaMesa, ciudadDeLaNoche, DURMIENTES_QUE_SE_PINTAN, RADIO_DE_LO_QUE_SE_PINTA, RADIO_DE_LOS_CANDIDATOS } from '../../shared/arcade/juegos/quiebro-ciudad';
import type { NocheDeLaCiudad } from '../../shared/arcade/juegos/quiebro-ciudad';
import { durmientesCercaEnLaCiudad, durmientesDeLaCiudad, sitioDelDurmienteEnLaCiudad } from '../../shared/arcade/juegos/quiebro-durmientes';
import { PIEZAS, construirPieza, triangulosDe } from '../src/quiebro/personajes/piezas';
import { TABLA_DE_NIVELES } from '../src/quiebro/calidad/niveles';
import {
  CUERPOS_COMO_MUCHO,
  NIVELES,
  cabeUnoQueSeVa,
  POLITICA,
  TRIANGULOS_DE_PIEZA,
  MINIMO_DEL_MANIQUI,
  cuotaDelNivel,
  lodElegido,
  lodParaTope,
  renglonDeLosPersonajes,
  RESTO_DEL_JUEGO_MEDIDO,
  triangulosConTope,
  triangulosDelLod,
  repartirElDetalle,
} from '../src/quiebro/personajes/presupuesto';
import type { CuerpoAMedir, DetalleDelCuerpo, Nivel, RenglonDeLosPersonajes } from '../src/quiebro/personajes/presupuesto';
import {
  PALETAS,
  ZONAS_QUE_NO_SALEN,
  clipDelGesto,
  clipsDeLaMarchaGirada,
  clipsPedidos,
  figuraDelCuerpo,
  figuraDelDurmiente,
  leerElReparto,
  marchaDelReparto,
  triangulosDeLaFigura,
  variantesDeLaFigura,
  varianteMasLigera,
  zonasDeLaFigura,
} from '../src/quiebro/personajes/reparto';
import type { Reparto } from '../src/quiebro/personajes/reparto';

/* ─────────────────────────────── El arnés, en corto ─────────────────────────────── */

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, bien: boolean, detalle?: unknown): boolean {
  hechas++;
  if (!bien) {
    let texto = '';
    if (detalle !== undefined) {
      try {
        texto = ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`.slice(0, 900);
      } catch {
        texto = ` — ${String(detalle)}`;
      }
    }
    fallos.push(`${que}${texto}`);
  }
  return bien;
}
/** Un juez aplicado a lo de verdad (tiene que dar verde) y a su vacuna (tiene que dar rojo). */
function juzgar<T>(que: string, juez: (x: T) => { bien: boolean; detalle?: unknown }, verdad: T, vacuna: T, queVacuna: string): void {
  const v = juez(verdad);
  comprobar(que, v.bien, v.detalle);
  const e = juez(vacuna);
  comprobar(`la vacuna «${queVacuna}» sale roja (si sale verde, el juez de «${que}» no mira)`, !e.bien);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}
function nota(texto: string): void {
  console.log(`  ${texto}`);
}
function terminar(escritas: number): never {
  hechas++;
  const saltado = hechas < escritas;
  if (fallos.length > 0) {
    console.log(`\n${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
    for (const f of fallos) console.log(`  ✗ ${f}`);
  }
  if (saltado) {
    console.error(`\nSólo se han hecho ${hechas} de las ${escritas} comprobaciones escritas: SE HA SALTADO UN BLOQUE.`);
    process.exit(2);
  }
  if (fallos.length > 0) process.exit(1);
  console.log(`\n✔ ${hechas} comprobaciones. Cada gesto tiene su clip, el golpe llega a su hora, el pie no patina, el espejo refleja, el renglón cabe y la multitud está donde el guion.`);
  if (hechas > escritas) console.log(`  (El suelo dice ${escritas} y se han hecho ${hechas}: sube \`escritas\`.)`);
  process.exit(0);
}
const reventar = (error: unknown): void => {
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.error(`\nEL GUION HA REVENTADO después de ${hechas} comprobaciones: no es un veredicto sobre el producto.\n`);
  console.error(error);
  process.exit(3);
};
process.on('uncaughtException', reventar);
process.on('unhandledRejection', reventar);

/* ─────────────────────────────── Lo que se lee del disco ─────────────────────────────── */

const AQUI = dirname(fileURLToPath(import.meta.url));
const RECURSOS = join(AQUI, '..', 'src', 'quiebro', 'recursos');
const PERSONAJES = join(AQUI, '..', 'src', 'quiebro', 'personajes');
const crudo: unknown = JSON.parse(readFileSync(join(RECURSOS, 'reparto.json'), 'utf8'));

let lecturas = 0;
const leidos = new Map<string, GLTF>();
async function leer(archivo: string): Promise<GLTF> {
  const hecho = leidos.get(archivo);
  if (hecho !== undefined) return hecho;
  lecturas++;
  const b = readFileSync(join(RECURSOS, archivo));
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  const g = await new Promise<GLTF>((ok, mal) => cargador().parse(ab, '', ok, mal));
  leidos.set(archivo, g);
  return g;
}
/** El lector del almacén en Node: la «url» es la ruta del fichero. Cuenta cuántas veces lee. */
let lecturasDelAlmacen = 0;
const lectorDeNode = (url: string): Promise<GLTF> => {
  lecturasDelAlmacen++;
  const b = readFileSync(url);
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  return new Promise<GLTF>((ok, mal) => cargador().parse(ab, '', ok, mal));
};

function copia<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/* ═══════════════════════════════ 1. El manifiesto ═══════════════════════════════ */

paso('El manifiesto se lee, y uno roto no');
const reparto = leerElReparto(crudo);
comprobar('reparto.json se lee y trae esqueletos, figuras, clips y gestos', Object.keys(reparto.esqueletos).length > 0 && Object.keys(reparto.figuras).length > 0);
{
  const roto = copia(crudo) as Record<string, unknown>;
  delete roto.gestos;
  let lanzo = false;
  try {
    leerElReparto(roto);
  } catch {
    lanzo = true;
  }
  comprobar('un manifiesto sin «gestos» se rechaza al leerlo (no se pinta a medias)', lanzo);
  const otro = copia(crudo) as { figuras: Record<string, { esqueleto: string }> };
  const primera = Object.keys(otro.figuras)[0] as string;
  (otro.figuras[primera] as { esqueleto: string }).esqueleto = 'no-existe';
  let lanzo2 = false;
  try {
    leerElReparto(otro);
  } catch {
    lanzo2 = true;
  }
  comprobar('una figura con un esqueleto que no está se rechaza', lanzo2);
}

paso('Todo Gesto de cuerpos.ts tiene su clip en el manifiesto');
const juezDeGestos = (r: Reparto): { bien: boolean; detalle?: unknown } => {
  const faltan: string[] = [];
  for (const g of GESTOS) {
    const e = r.gestos[g];
    if (e === undefined) faltan.push(`${g}: sin gesto`);
    else if (r.clips[e.clip] === undefined) faltan.push(`${g}: clip ${e.clip} no está`);
    else for (const [d, c] of Object.entries(e.porDireccion ?? {})) if (c !== undefined && r.clips[c] === undefined) faltan.push(`${g}/${d}: ${c}`);
  }
  return { bien: faltan.length === 0 && GESTOS.length === 31, detalle: { faltan, gestos: GESTOS.length } };
};
{
  const vacuna = copia(reparto) as Reparto & { gestos: Record<string, unknown> };
  delete vacuna.gestos.desalojable;
  juzgar('los 31 gestos del contrato tienen clip, y sus clips por dirección existen', juezDeGestos, reparto, vacuna as Reparto, 'sin el gesto desalojable');
}
for (const g of GESTOS) {
  const info = INFO_DE_GESTOS[g];
  if (info.tipo !== 'golpe') continue;
  const clip = reparto.gestos[g]?.clip ?? '';
  const c = reparto.clips[clip];
  comprobar(`el golpe «${g}» va a un clip (${clip}) con su instante de impacto dentro del clip`, c?.impactoMs !== undefined && c.impactoMs >= 0 && c.impactoMs < c.duracionMs, c);
}
const marcha = marchaDelReparto(reparto);
comprobar(
  'la marcha tiene reposo y al menos tres pasos con zancada y velocidad (andar, trotar, correr), ordenados',
  marcha.length >= 4 && marcha[0]?.gesto === 'reposo' && marcha.slice(1).every((p, i, a) => p.zancada > 0 && (i === 0 || p.velocidad > (a[i - 1] as { velocidad: number }).velocidad)),
  marcha.map((p) => `${p.clip} ${String(p.velocidad)} m/s`),
);
{
  const deMujer = marchaDelReparto(reparto, 'mujer');
  const andarH = marcha.find((p) => p.gesto === 'andar' && p.velocidad >= 1.9);
  const andarM = deMujer.find((p) => p.clip === andarH?.clip);
  comprobar(
    'la marcha de la mujer lleva su propia zancada (si el manifiesto la da), no la del hombre',
    andarH !== undefined && andarM !== undefined && (reparto.clips[andarH.clip] as unknown as Record<string, unknown>).mujer !== undefined ? andarM.zancada < andarH.zancada : true,
    { hombre: andarH?.zancada, mujer: andarM?.zancada },
  );
}

paso('Todo clip pedido está en el .glb de clips de cada esqueleto');
const clipsDeCadaEsqueleto = new Map<string, THREE.AnimationClip[]>();
for (const [nombre, e] of Object.entries(reparto.esqueletos)) {
  const g = await leer(e.clips);
  clipsDeCadaEsqueleto.set(nombre, g.animations);
}
const juezDeClips = (r: Reparto): { bien: boolean; detalle?: unknown } => {
  const faltan: string[] = [];
  for (const [esq, animaciones] of clipsDeCadaEsqueleto) {
    const porNombre = new Map(animaciones.map((a) => [a.name, a]));
    for (const c of clipsPedidos(r)) {
      const a = porNombre.get(c);
      const m = r.clips[c];
      if (a === undefined) faltan.push(`${esq}: ${c} no está`);
      else if (m === undefined) faltan.push(`${esq}: ${c} no está en el manifiesto`);
      else if (Math.abs(a.duration * 1000 - m.duracionMs) > 1000 / 30) faltan.push(`${esq}: ${c} dura ${String(a.duration)} s y el manifiesto dice ${String(m.duracionMs)} ms`);
    }
  }
  return { bien: faltan.length === 0, detalle: faltan };
};
{
  const vacuna = copia(reparto) as Reparto & { gestos: Record<string, { clip: string }> };
  (vacuna.gestos.tocado as { clip: string }).clip = 'golpe-que-no-existe';
  (vacuna as unknown as { clips: Record<string, unknown> }).clips['golpe-que-no-existe'] = { duracionMs: 500, bucle: false, raiz: false };
  juzgar('cada clip pedido está en clips-hombre.glb y clips-mujer.glb, y dura lo que dice el manifiesto', juezDeClips, reparto, vacuna, 'un gesto que pide un clip que no se horneó');
}
{
  const [esq, animaciones] = [...clipsDeCadaEsqueleto][0] as [string, THREE.AnimationClip[]];
  const e = reparto.esqueletos[esq];
  const nodos = new Set<string>();
  (await leer(e?.clips ?? '')).scene.traverse((o) => nodos.add(o.name));
  const sinNodo = animaciones.flatMap((a) => a.tracks.map((t) => t.name.slice(0, t.name.lastIndexOf('.')))).filter((n) => !nodos.has(n));
  comprobar(`todas las pistas de los clips de «${esq}» apuntan a un hueso del esqueleto`, sinNodo.length === 0, [...new Set(sinNodo)].slice(0, 5));
  comprobar(
    'los huesos que declara el manifiesto son los de la piel de los clips (en el orden de la piel)',
    Object.values(reparto.esqueletos).every((x) => x.huesos.every((h) => nodos.has(h)) && x.huesos.includes(x.raiz) && x.huesos.includes(x.agarre.derecha) && x.huesos.includes(x.cabeza)),
  );
  const quitado = clipEnElSitio(animaciones[0] as THREE.AnimationClip, e?.raiz ?? 'raiz');
  comprobar('al preparar un clip se le quita la posición de la raíz (el juego mueve el cuerpo)', !quitado.tracks.some((t) => t.name === `${e?.raiz ?? 'raiz'}.position`));
}

/* ═══════════════════════════════ 2. Materiales y zonas ═══════════════════════════════ */

paso('Los materiales pedidos existen, y las zonas del LOD1 son las del LOD0');
const juezDeMateriales = async (r: Reparto): Promise<{ bien: boolean; detalle?: unknown }> => {
  const faltan: string[] = [];
  for (const [nombre, f] of Object.entries(r.figuras)) {
    for (const lod of f.lods) {
      const g = await leer(lod.archivo);
      const hay = new Set<string>();
      g.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m instanceof THREE.Material) hay.add(m.name);
      });
      for (const m of lod.materiales) if (!hay.has(m)) faltan.push(`${nombre}/${lod.archivo}: ${m}`);
    }
  }
  /* Las zonas que se tiñen, en la figura que las necesita. */
  const pide = (figura: string, zonas: readonly string[]): void => {
    const hay = zonasDeLaFigura(r, figura);
    for (const z of zonas) if (!hay.includes(z)) faltan.push(`${figura}: falta la zona ${z}`);
  };
  for (const v of r.clases.desvelado.variantes) {
    for (const f of [v.hombre.figura, v.mujer.figura]) {
      /* El forro del asiento: `mat_forro` si la figura lo trae, o la camisa que asoma (el prototipo). */
      pide(f, zonasDeLaFigura(r, f).includes('mat_forro') ? ['mat_abrigo', 'mat_forro'] : ['mat_abrigo', 'mat_camisa']);
    }
  }
  for (const v of r.clases.celador.variantes) pide(v.figura, zonasDeLaFigura(r, v.figura).includes('mat_traje') ? ['mat_traje', 'mat_camisa'] : ['mat_abrigo', 'mat_tela', 'mat_camisa']);
  for (const c of r.durmientes.cuerpos) pide(c.figura, ['mat_abrigo', 'mat_tela', 'mat_camisa', 'mat_pelo', 'mat_piel']);
  return { bien: faltan.length === 0, detalle: faltan };
};
{
  const v = await juezDeMateriales(reparto);
  comprobar('los materiales de cada LOD están en su .glb, y cada figura trae las zonas que se le tiñen', v.bien, v.detalle);
  const vacuna = copia(reparto) as Reparto;
  const fig = Object.values(vacuna.figuras)[0] as unknown as { lods: { materiales: string[] }[] };
  fig.lods[0]?.materiales.push('mat_forro_que_no_esta');
  const e = await juezDeMateriales(vacuna);
  comprobar('la vacuna «un material que el .glb no trae» sale roja', !e.bien);
}
const juezDeZonasDelLod1 = (base0: readonly { color: THREE.Color }[], base1: readonly { color: THREE.Color }[]): { bien: boolean; detalle?: unknown } => {
  const malas: string[] = [];
  base1.forEach((b, i) => {
    const a = base0[i];
    if (a === undefined) return;
    const d = Math.max(Math.abs(a.color.r - b.color.r), Math.abs(a.color.g - b.color.g), Math.abs(a.color.b - b.color.b));
    if (d > 0.02 && b.color.r + b.color.g + b.color.b > 0) malas.push(`${String(i)}: ${d.toFixed(3)}`);
  });
  return { bien: malas.length === 0, detalle: malas };
};
for (const [nombre, f] of Object.entries(reparto.figuras)) {
  if (f.lods.length < 2) continue;
  const zonas = zonasDeLaFigura(reparto, nombre);
  const g0 = await leer((f.lods[0] as { archivo: string }).archivo);
  /* Por variante: dos variantes pueden tener un material del mismo nombre y otro color («mismoNombre»). */
  const variante = variantesDeLaFigura(reparto, nombre)[0];
  const mallas = variante !== undefined ? [variante] : null;
  const b0 = paletaBase(g0.scene, zonas, mallas);
  for (let k = 1; k < f.lods.length; k++) {
    const g1 = await leer((f.lods[k] as { archivo: string }).archivo);
    /* Sólo las zonas que ese LOD usa: la montura, por ejemplo, puede no entrar en él. */
    const usadas = new Set<number>();
    g1.scene.traverse((o) => {
      const z = (o as THREE.Mesh).geometry?.getAttribute('_zona') as THREE.BufferAttribute | undefined;
      if (z === undefined) return;
      let dentro = mallas === null;
      for (let x: THREE.Object3D | null = o; x !== null && !dentro; x = x.parent) if (mallas?.includes(x.name) === true) dentro = true;
      if (dentro) for (let i = 0; i < z.count; i++) usadas.add(Math.round(z.getX(i)));
    });
    const b1 = paletaBase(g1.scene, zonas, mallas).map((b, i) => (usadas.has(i) && !['mat_ojos'].includes(zonas[i] ?? '') ? b : { ...b, color: new THREE.Color(0, 0, 0) }));
    const desplazada = [...b1.slice(1), b1[0] as (typeof b1)[number]];
    juzgar(
      `las zonas del LOD${String(k)} de «${nombre}»${variante !== undefined ? ` (${variante})` : ''} tienen el color del material del mismo nombre del LOD0`,
      (x: typeof b1) => juezDeZonasDelLod1(b0, x),
      b1,
      desplazada,
      'las zonas corridas un puesto',
    );
  }
}

/* ═══════════════════════════════ 3. Lo que no sale ═══════════════════════════════ */

paso('Lo que no sale (§1): gafas del desvelado, auricular del Celador, cuero negro');
const huesoDePrueba = (r: Reparto, esq: string) => (h: 'agarre-derecha' | 'cabeza'): string => (h === 'cabeza' ? (r.esqueletos[esq]?.cabeza ?? 'cabeza') : (r.esqueletos[esq]?.agarre.derecha ?? 'agarre_R'));
const juezDeLoQueNoSale = (x: { malla: ReturnType<typeof fundirElLod>; prohibidas: readonly string[] }): { bien: boolean; detalle?: unknown } => {
  const zona = x.malla.geometria.getAttribute('zona') as THREE.BufferAttribute;
  const indice = x.malla.geometria.getIndex() as THREE.BufferAttribute;
  const prohibidas = new Set(x.prohibidas.map((z) => x.malla.zonas.indexOf(z)).filter((i) => i >= 0));
  let hay = 0;
  for (let k = 0; k < indice.count; k++) if (prohibidas.has(Math.round(zona.getX(indice.getX(k))))) hay++;
  return { bien: hay === 0, detalle: { verticesProhibidos: hay } };
};
for (const [clase, id, variante] of [
  ['desvelado', 1, 0],
  ['celador', 16, 0],
] as const) {
  const f = figuraDelCuerpo(reparto, { id, clase, variante, color: '#ff4d6d' }, null);
  const lod = reparto.figuras[f.figura]?.lods[0];
  if (lod === undefined) continue;
  const g = await leer(lod.archivo);
  const zonas = zonasDeLaFigura(reparto, f.figura);
  const malla = fundirElLod(g.scene, { zonas, sinZonas: f.sinZonas, mallas: f.mallas, piezas: [], huesoDe: huesoDePrueba(reparto, f.esqueleto) });
  const conTodo = fundirElLod(g.scene, { zonas, sinZonas: [], mallas: f.mallas, piezas: [], huesoDe: huesoDePrueba(reparto, f.esqueleto) });
  const prohibidas = ZONAS_QUE_NO_SALEN[clase];
  const trae = prohibidas.some((z) => zonas.includes(z));
  if (trae) {
    juzgar(`la malla fundida del ${clase} no tiene ${prohibidas.join(' ni ')}`, juezDeLoQueNoSale, { malla, prohibidas }, { malla: conTodo, prohibidas }, `el ${clase} fundido sin quitar nada`);
  } else {
    comprobar(`la figura del ${clase} ya no trae ${prohibidas.join(' ni ')} (la forja lo quitó)`, true);
  }
  malla.geometria.dispose();
  conTodo.geometria.dispose();
}
{
  /*
   * El abrigo que se VE de cada estilo: el que tiñe el cliente si lo tiñe (el prototipo era cuero negro
   * y se teñía de tela), o el del material de la variante del reparto si no.
   */
  const luz = (c: THREE.Color): number => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const vistos: { estilo: string; luz: number; rugosidad: number }[] = [];
  for (const [k, v] of reparto.clases.desvelado.variantes.entries()) {
    for (const id of [1, 2]) {
      const f = figuraDelCuerpo(reparto, { id, clase: 'desvelado', variante: k, color: '#ff4d6d' }, null);
      const lod = reparto.figuras[f.figura]?.lods[0];
      if (lod === undefined) continue;
      const g = await leer(lod.archivo);
      const zonas = zonasDeLaFigura(reparto, f.figura);
      const base = paletaBase(g.scene, zonas, f.mallas)[zonas.indexOf('mat_abrigo')];
      const tenido = f.tinte.colores.mat_abrigo;
      const color = tenido !== undefined ? new THREE.Color(tenido) : (base?.color ?? new THREE.Color(0, 0, 0));
      const rugosidad = f.tinte.rugosidad.mat_abrigo ?? base?.rugosidad ?? 0;
      vistos.push({ estilo: `${v.estilo}/${f.sexo}`, luz: luz(color), rugosidad });
    }
  }
  comprobar(
    'el abrigo de cada estilo y sexo es tela en colores apagados, no cuero negro (luminancia lineal ≥ 0,03 y rugosidad ≥ 0,6)',
    vistos.length > 0 && vistos.every((x) => x.luz >= 0.03 && x.rugosidad >= 0.6),
    vistos.map((x) => `${x.estilo}: ${x.luz.toFixed(3)} / ${x.rugosidad.toFixed(2)}`),
  );
  const f = figuraDelCuerpo(reparto, { id: 1, clase: 'desvelado', variante: 0, color: '#ff4d6d' }, null);
  const forro = f.tinte.colores.mat_forro ?? f.tinte.colores.mat_camisa;
  comprobar('el forro del desvelado lleva el color de su asiento', forro !== undefined && (forro === '#ff4d6d' || f.tinte.colores.mat_forro === undefined), f.tinte.colores);
}

/* ═══════════════════════════════ 4. La anticipación elástica ═══════════════════════════════ */

paso('La anticipación elástica: el golpe cae en su instante');
/** Un azar sembrado para los relojes de mentira (mulberry32). */
function azar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** El ritmo para el tramo de `antes` a `ahora` (el convenio de `ritmoElastico`). */
type Ritmo = (clipS: number, antes: number, ahora: number, impacto: number, impactoClipMs: number) => number;
/**
 * Simula golpes con fotogramas desiguales y un anuncio que se corrige a mitad, como los avanza el
 * mezclador (el ritmo de cada tramo se pone antes de avanzarlo), y devuelve el mayor error (ms) en el
 * primer fotograma en o tras el impacto: el clip tendría que ir por su impacto más lo que pasó desde él.
 */
function errorDelGolpe(ritmo: Ritmo, dentroDeLaCota: boolean): number {
  const r = azar(dentroDeLaCota ? 7 : 11);
  let peor = 0;
  for (let caso = 0; caso < 400; caso++) {
    const T = 150 + r() * 250;
    const desde = 1000;
    /* Dentro de la cota el anuncio pide un ritmo entre 0,45 y 2,75; fuera, anuncios cortísimos. */
    const duracion = dentroDeLaCota ? T / (0.45 + r() * 2.3) : 20 + r() * 40;
    let impacto = desde + duracion;
    const corregirEn = desde + duracion * (0.2 + r() * 0.4);
    const correccion = (r() - 0.5) * (dentroDeLaCota ? Math.min(60, duracion * 0.2) : 0);
    let t = desde;
    let c = inicioDelGolpe(desde, t, impacto, T);
    let error = Number.NaN;
    while (t < impacto + 300 && Number.isNaN(error)) {
      const dt = 6 + r() * 34;
      if (t < corregirEn && t + dt >= corregirEn) impacto += correccion;
      c += (ritmo(c, t, t + dt, impacto, T) * dt) / 1000;
      t += dt;
      if (t >= impacto) error = Math.abs(c * 1000 - (T + (t - impacto)));
    }
    peor = Math.max(peor, Number.isNaN(error) ? 1e9 : error);
  }
  return peor;
}
{
  const bueno: Ritmo = (c, a, b, i, T) => ritmoElastico(c, a, b, i, T);
  /* El fallo de la primera versión: lo que falta, medido desde el final del tramo y no desde su principio. */
  const desdeElFinal: Ritmo = (c, _a, b, i, T) => (b >= i || c >= T / 1000 ? 1 : Math.min(3, Math.max(0.35, (T / 1000 - c) / Math.max(1e-6, (i - b) / 1000))));
  juzgar(
    'con fotogramas de 6 a 40 ms y el anuncio corregido ±30 ms a mitad, en el fotograma del impacto el clip va por su impacto (< 1 ms, 400 golpes)',
    (f: Ritmo) => {
      const e = errorDelGolpe(f, true);
      return { bien: e < 1, detalle: `peor ${e.toFixed(3)} ms` };
    },
    bueno,
    desdeElFinal,
    'lo que falta medido desde el final del tramo (el fallo de la primera versión)',
  );
  comprobar('un clip a ritmo fijo, sin estirar, llega fuera de tiempo (la simulación distingue)', errorDelGolpe(() => 1, true) > 20);
  const e2 = errorDelGolpe(bueno, false);
  comprobar('con anuncios más cortos de lo que da el ritmo máximo, se entra avanzado y el impacto también llega a < 1 ms', e2 < 1, `peor ${e2.toFixed(3)} ms`);
  comprobar(
    'el ritmo de la preparación nunca sale de su cota (ni tirón ni estatua)',
    [0.01, 0.2, 1, 5, 50, 5000].every((falta) => {
      const x = ritmoElastico(0, 0, 16, falta, 300);
      return x >= RITMO_ELASTICO.minimo && x <= RITMO_ELASTICO.maximo;
    }),
  );
}

/* ═══════════════════════════════ 5. Los fundidos ═══════════════════════════════ */

paso('Los fundidos suman 1, también con tres capas vivas y fundidos de 0 ms');
interface Mezcla {
  entrar(n: string, ms: number): void;
  avanzar(dt: number): readonly string[];
  suma(): number;
  peso(n: string): number;
  activa(): string | null;
}
/** Lo que hace `crossFadeTo` de three: cada capa se funde por su cuenta y nadie normaliza. */
class MezclaIngenua implements Mezcla {
  private capas = new Map<string, { p: number; o: number; r: number }>();
  entrar(n: string, ms: number): void {
    for (const c of this.capas.values()) {
      c.o = 0;
    }
    const r = ms > 0 ? 1 / ms : Number.POSITIVE_INFINITY;
    this.capas.set(n, { p: this.capas.size === 0 ? 1 : 0, o: 1, r });
    for (const c of this.capas.values()) if (c.o === 0 && c.r === 0) c.r = r;
  }
  avanzar(dt: number): readonly string[] {
    for (const c of this.capas.values()) {
      const r = Number.isFinite(c.r) ? c.r : 1e9;
      c.p = c.o > c.p ? Math.min(1, c.p + r * dt) : Math.max(0, c.p - (r === 0 ? 1 / 120 : r) * dt * 0.7);
    }
    return [];
  }
  suma(): number {
    let s = 0;
    for (const c of this.capas.values()) s += c.p;
    return s;
  }
  peso(n: string): number {
    return this.capas.get(n)?.p ?? 0;
  }
  activa(): string | null {
    return null;
  }
}
const juezDeLaMezcla = (crear: () => Mezcla): { bien: boolean; detalle?: unknown } => {
  const r = azar(3);
  let peor = 0;
  let nan = false;
  for (let serie = 0; serie < 200; serie++) {
    const m = crear();
    for (let k = 0; k < 40; k++) {
      /* Una Tanda: capas nuevas cada pocos fotogramas, a veces la misma, a veces con fundido 0. */
      if (k % 3 === 0) m.entrar(`capa${String(Math.floor(r() * 4))}`, r() < 0.15 ? 0 : 40 + r() * 200);
      m.avanzar(r() < 0.1 ? 0 : 8 + r() * 30);
      const s = m.suma();
      if (Number.isNaN(s)) nan = true;
      peor = Math.max(peor, Math.abs(s - 1));
    }
  }
  return { bien: !nan && peor < 1e-9, detalle: { peor, nan } };
};
juzgar('la suma de los pesos es 1 en cada fotograma de 200 Tandas al azar, sin NaN', juezDeLaMezcla, () => new MezclaDeCapas(), () => new MezclaIngenua(), 'fundidos de three sin normalizar');
{
  const m = new MezclaDeCapas();
  m.entrar('a', 0);
  m.avanzar(0);
  m.entrar('b', 100);
  m.avanzar(50);
  const aMitad = m.peso('b');
  m.avanzar(60);
  comprobar('un fundido cruzado de 100 ms va por la mitad a los 50 ms y acaba a los 100', Math.abs(aMitad - 0.5) < 1e-9 && m.peso('b') === 1 && m.peso('a') === 0 && m.activa() === 'b');
}

/* ═══════════════════════════════ 6. El paso sin patinar ═══════════════════════════════ */

paso('El paso sin patinar: la mezcla de la marcha y el pie apoyado de verdad');
const giradasDelReparto = (() => {
  const g = clipsDeLaMarchaGirada(reparto);
  const una = (clip: string | null): MarchaGirada | null => {
    if (clip === null) return null;
    const c = reparto.clips[clip];
    return c?.zancadaM !== undefined && c.velocidadMs !== undefined ? { clip, zancada: c.zancadaM, velocidad: c.velocidadMs, duracionMs: c.duracionMs } : null;
  };
  return { atras: una(g.atras), izquierda: una(g.izquierda), derecha: una(g.derecha) };
})();
type Cadencia = (v: number, rel: number) => { pesos: Map<string, number>; ciclos: number };
const cadenciaBuena: Cadencia = (v, rel) => {
  const m = mezclarLaMarcha(v, rel, marcha, giradasDelReparto, mezclaDeLaMarchaNueva());
  return { pesos: pesosDeLaMarcha(m), ciclos: m.ciclosPorSegundo };
};
/** La de siempre: el ritmo de andar escalado por la velocidad, sin mirar la mezcla. */
const cadenciaIngenua: Cadencia = (v, rel) => {
  const m = mezclarLaMarcha(v, rel, marcha, giradasDelReparto, mezclaDeLaMarchaNueva());
  const andar = marcha[1];
  return { pesos: pesosDeLaMarcha(m), ciclos: andar !== undefined ? v / andar.zancada : 1 };
};
const juezDeLaCadencia = (f: Cadencia): { bien: boolean; detalle?: unknown } => {
  const zancadaDe = (clip: string): number => marcha.find((p) => p.clip === clip)?.zancada ?? Object.values(giradasDelReparto).find((g) => g?.clip === clip)?.zancada ?? 0;
  let peor = 0;
  let donde = '';
  for (let v = 0.4; v <= 6.4; v += 0.2) {
    for (const rel of [0, 0.4, Math.PI / 2, 2.4, Math.PI, -Math.PI / 2]) {
      const { pesos, ciclos } = f(v, rel);
      let suma = 0;
      let zancada = 0;
      for (const [c, p] of pesos) {
        suma += p;
        zancada += p * zancadaDe(c);
      }
      if (Math.abs(suma - 1) > 1e-9) return { bien: false, detalle: `pesos que suman ${String(suma)}` };
      if (zancada < 0.05 || ciclos >= 2.4 - 1e-9) continue;
      const pie = zancada * ciclos;
      const e = Math.abs(pie - v) / v;
      if (e > peor) {
        peor = e;
        donde = `v ${v.toFixed(1)}, rel ${rel.toFixed(2)}: el pie va a ${pie.toFixed(2)} m/s`;
      }
    }
  }
  return { bien: peor < 0.01, detalle: `peor ${(peor * 100).toFixed(2)} % (${donde})` };
};
juzgar('en la mezcla de la marcha el pie de apoyo va hacia atrás a la velocidad del cuerpo (±1 %), de frente, de lado y hacia atrás', juezDeLaCadencia, cadenciaBuena, cadenciaIngenua, 'el ritmo de andar escalado sin mirar la mezcla');

/* El cuerpo de verdad: el director con los .glb, un desvelado que anda en línea recta. */
const camara = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 400);
camara.position.set(0, 1.7, 6);
camara.lookAt(0, 1, 0);
camara.updateMatrixWorld();
camara.updateProjectionMatrix();

function cuerpoDePrueba(id: number, clase: CuerpoPintado['clase'], variante: number): CuerpoPintado {
  return { id, clase, variante, color: '#46c8ff', x: 0, z: 0, rumbo: 0, velocidad: 0, gesto: 'reposo', gestoDesdeMs: 0, impactoMs: null, direccionDelGesto: null, contorno: true, tenue: false };
}
function fuenteDe(lista: CuerpoPintado[], yo: number | null, prestados: ReadonlySet<number> = new Set(), tic = 0): FuenteDeCuerpos {
  return { cuerpos: () => lista, prestados: () => prestados, ticDeLosDurmientes: () => tic, yo: () => yo };
}
const director = new DirectorDeLosPersonajes(reparto, (a) => join(RECURSOS, a), lectorDeNode);
/** Da fotogramas hasta que el cuerpo tenga esqueleto (el almacén carga en segundo plano). */
async function esperarCuerpo(fuente: FuenteDeCuerpos, id: number, nivel: Nivel): Promise<void> {
  for (let k = 0; k < 1500 && director.cuerpo(id) === null; k++) {
    director.fotograma(fuente, nivel, null, camara, k * 16, (t) => t);
    await new Promise((r) => setTimeout(r, 5));
  }
}
/** La mediana de lo que resbala el pie apoyado de un cuerpo que anda a `v` m/s (m/s). */
async function resbalon(v: number, idBase: number): Promise<{ mediana: number; apoyos: number }> {
  const c = cuerpoDePrueba(idBase, 'desvelado', 0);
  const f = fuenteDe([c], idBase);
  await esperarCuerpo(f, idBase, 1);
  const cuerpo = director.cuerpo(idBase);
  if (cuerpo === null) return { mediana: Number.NaN, apoyos: 0 };
  /*
   * Lo que apoya: tobillo y puntera de cada pie, cada uno con su suelo (el talón apoya con el tobillo
   * bajo; al despegar rueda y apoya la puntera). Cada punto se juzga en los fotogramas en que está en
   * lo más bajo de su recorrido: ahí es donde no puede moverse por el suelo.
   */
  const pies = ['pie_L', 'punta_L', 'pie_R', 'punta_R'].map((n) => cuerpo.raiz.getObjectByName(n) as THREE.Object3D);
  const dt = 1000 / 60;
  const muestras: { y: number; x: number; z: number }[][] = pies.map(() => []);
  const p = new THREE.Vector3();
  c.gesto = v > 6 ? 'correr' : v > 3 ? 'trotar' : 'andar';
  c.gestoDesdeMs = 100000;
  c.velocidad = v;
  /* Hacia el este (rumbo π/2), a velocidad constante. */
  c.rumbo = Math.PI / 2;
  for (let k = 0; k < 480; k++) {
    const t = 100000 + k * dt;
    c.x = (v * (k * dt)) / 1000;
    director.fotograma(f, 1, null, camara, t, (x) => x);
    cuerpo.raiz.updateMatrixWorld(true);
    if (k < 60) continue;
    pies.forEach((pie, i) => {
      pie.getWorldPosition(p);
      (muestras[i] as { y: number; x: number; z: number }[]).push({ y: p.y, x: p.x, z: p.z });
    });
  }
  const velocidades: number[] = [];
  for (const m of muestras) {
    const minimo = Math.min(...m.map((s) => s.y));
    for (let k = 1; k < m.length; k++) {
      const a = m[k - 1] as { y: number; x: number; z: number };
      const b = m[k] as { y: number; x: number; z: number };
      if (a.y > minimo + 0.008 || b.y > minimo + 0.008) continue;
      velocidades.push(Math.hypot(b.x - a.x, b.z - a.z) / (dt / 1000));
    }
  }
  velocidades.sort((a, b) => a - b);
  if (velocidades.length === 0) {
    nota(`sin apoyos a ${v.toFixed(1)} m/s: ${muestras.map((m) => `${String(m.length)} muestras, y de ${Math.min(...m.map((s) => s.y)).toFixed(3)} a ${Math.max(...m.map((s) => s.y)).toFixed(3)}`).join(' · ')}`);
  }
  return { mediana: velocidades[Math.floor(velocidades.length / 2)] ?? Number.NaN, apoyos: velocidades.length };
}
{
  const resultados: string[] = [];
  let bien = true;
  for (const [v, id] of [
    [1.4, 2],
    [2.0, 3],
    [4.2, 5],
    [5.0, 4],
    [6.5, 6],
  ] as const) {
    const r = await resbalon(v, id);
    resultados.push(`${v.toFixed(1)} m/s: ${r.mediana.toFixed(3)} m/s en ${String(r.apoyos)} apoyos`);
    /* La forja midió 0,35 m/s como umbral de lo que resbala; en la marcha exigimos la mitad. */
    if (!(r.mediana < 0.18) || r.apoyos < 8) bien = false;
  }
  nota(`pie apoyado: ${resultados.join(' · ')}`);
  if (director.almacen.errores.length > 0) nota(`errores del almacén: ${director.almacen.errores.join(' · ')}`);
  comprobar('el pie apoyado de un desvelado que anda a 1,4, 2, 4,2, 5 y 6,5 m/s no resbala (mediana < 0,18 m/s)', bien, resultados);
  /* La vacuna: el clip de andar a su ritmo horneado mientras el cuerpo va a 2 m/s. */
  const g = await leer(reparto.figuras[figuraDelCuerpo(reparto, { id: 1, clase: 'desvelado', variante: 0, color: null }, null).figura]?.lods[1]?.archivo ?? '');
  const esq = reparto.esqueletos.hombre;
  const plantilla = plantillaDeHuesos(g.scene, esq?.raiz ?? 'raiz');
  const clips = clipsDeCadaEsqueleto.get('hombre') ?? [];
  const lento = marcha.find((m) => m.zancada > 0);
  const andar = clipEnElSitio(clips.find((a) => a.name === (lento?.clip ?? 'andar')) as THREE.AnimationClip, 'raiz');
  const deprisa = (lento?.velocidad ?? 1.3) * 1.55;
  /** Un clip a su ritmo horneado sobre la plantilla, moviéndola a `v` m/s: lo que resbala el pie. */
  const crudo = (clip: THREE.AnimationClip, v: number): number => {
    const copia = plantilla.clone(true);
    const mezclador = new THREE.AnimationMixer(copia);
    mezclador.clipAction(clip).play();
    const puntos = ['pie_L', 'punta_L', 'pie_R', 'punta_R'].map((n) => copia.getObjectByName(n) as THREE.Object3D);
    const serie: { y: number; x: number }[][] = puntos.map(() => []);
    const pp = new THREE.Vector3();
    /* Hacia +Z, que es hacia donde mira la figura en su espacio. */
    for (let k = 0; k < 240; k++) {
      mezclador.update(1 / 60);
      copia.position.z = (v * k) / 60;
      copia.updateMatrixWorld(true);
      puntos.forEach((o, i) => {
        o.getWorldPosition(pp);
        (serie[i] as { y: number; x: number }[]).push({ y: pp.y, x: pp.z });
      });
    }
    const vs: number[] = [];
    for (const s of serie) {
      const min = Math.min(...s.map((x) => x.y));
      for (let k = 1; k < s.length; k++) if ((s[k - 1]?.y ?? 9) < min + 0.008 && (s[k]?.y ?? 9) < min + 0.008) vs.push(Math.abs(((s[k]?.x ?? 0) - (s[k - 1]?.x ?? 0)) * 60));
    }
    vs.sort((a, b) => a - b);
    mezclador.stopAllAction();
    return vs[Math.floor(vs.length / 2)] ?? 0;
  };
  const medianaVacuna = crudo(andar, deprisa);
  comprobar(`la vacuna «${andar.name} a su ritmo horneado yendo a ${deprisa.toFixed(1)} m/s» resbala (mediana ≥ 0,18 m/s): el juez del pie mira`, medianaVacuna >= 0.18, `${medianaVacuna.toFixed(3)} m/s`);
  /* La referencia: cada clip de la marcha a SU velocidad horneada, sin mezcla ni cadencia nuestra. */
  const referencia = marcha
    .filter((m) => m.zancada > 0)
    .map((m) => {
      const c = clipEnElSitio(clips.find((a) => a.name === m.clip) as THREE.AnimationClip, 'raiz');
      return `${m.clip} a ${m.velocidad.toFixed(1)} m/s: ${crudo(c, m.velocidad).toFixed(3)} m/s`;
    });
  nota(`referencia (el clip solo, a su velocidad): ${referencia.join(' · ')}`);
}

paso('De punta a punta: el golpe de un cuerpo con esqueleto llega a su hora, y los pesos suman 1');
{
  const c = cuerpoDePrueba(10, 'celador', 0);
  c.rumbo = Math.PI;
  const f = fuenteDe([c], null);
  await esperarCuerpo(f, 10, 2);
  const cuerpo = director.cuerpo(10);
  const errores: number[] = [];
  let peorSuma = 0;
  const r = azar(21);
  let t = 50000;
  for (const [gesto, anuncio] of [
    ['cierre', 480],
    ['seguida-2', 250],
    ['seguida-2', 300],
    ['seguida-1', 220],
    ['cierre', 700],
  ] as const) {
    c.gesto = gesto;
    c.gestoDesdeMs = t;
    c.impactoMs = t + anuncio;
    const T = reparto.clips[reparto.gestos[gesto]?.clip ?? '']?.impactoMs ?? 0;
    let medido = false;
    const fin = t + anuncio + 400;
    while (t < fin) {
      const dt = 8 + r() * 25;
      const antes = t;
      t += dt;
      director.fotograma(f, 2, null, camara, t, (x) => x);
      peorSuma = Math.max(peorSuma, Math.abs((cuerpo?.sumaDePesos() ?? 0) - 1));
      const g = cuerpo?.gestoEnCurso();
      if (!medido && antes < c.impactoMs && t >= c.impactoMs && g !== null && g !== undefined) {
        medido = true;
        /* En el primer fotograma tras el impacto, el clip va por su impacto más lo que pasó desde él. */
        errores.push(Math.abs(g.tiempo * 1000 - (T + (t - c.impactoMs))));
      }
    }
  }
  comprobar(
    'con el mezclador de three y los clips de verdad, en el fotograma del impacto el clip va por su impacto (< 2 ms), en cinco golpes seguidos',
    errores.length === 5 && errores.every((e) => e < 2),
    errores.map((e) => e.toFixed(2)),
  );
  comprobar('en toda la Tanda de punta a punta los pesos de las capas suman 1', peorSuma < 1e-6, peorSuma);
}

/* ═══════════════════════════════ 7. El espejo ═══════════════════════════════ */

paso('El espejo: cada hueso cae en el reflejo de su pareja');
const reposoDeLosClips = (await leer(reparto.esqueletos.hombre?.clips ?? '')).scene;
const espejo = espejoDelEsqueleto(reposoDeLosClips);
/**
 * El mayor error (m) entre el hueso b del clip reflejado y el reflejo del hueso m(b) del original: de
 * los huesos del cuerpo y, aparte, de los de tela (ver «Los faldones no son simétricos» en `espejo.ts`).
 */
function errorDelEspejo(original: THREE.AnimationClip, reflejado: THREE.AnimationClip): { cuerpo: number; tela: number } {
  const a = reposoDeLosClips.clone(true);
  const b = reposoDeLosClips.clone(true);
  const ma = new THREE.AnimationMixer(a);
  const mb = new THREE.AnimationMixer(b);
  const aa = ma.clipAction(original);
  const ab = mb.clipAction(reflejado);
  aa.play();
  ab.play();
  let peor = 0;
  let peorTela = 0;
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  /*
   * Un punto de prueba pegado a cada hueso, 7 cm fuera de su cabeza en diagonal: el sitio de la
   * articulación no ve si un hueso sin hijos (el pulgar) gira al revés; un punto pegado a él, sí.
   */
  a.updateMatrixWorld(true);
  b.updateMatrixWorld(true);
  const desvio = new THREE.Vector3(0.04, 0.03, 0.05);
  const reposoInverso = new Map<string, THREE.Matrix4>();
  const puntoDePrueba = new Map<string, THREE.Vector3>();
  a.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    reposoInverso.set(o.name, o.matrixWorld.clone().invert());
    puntoDePrueba.set(o.name, new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).add(desvio));
  });
  for (const t of [0, 0.1, 0.27, 0.4, 0.55, 0.7]) {
    aa.time = Math.min(t, original.duration);
    ab.time = Math.min(t, reflejado.duration);
    ma.update(0);
    mb.update(0);
    a.updateMatrixWorld(true);
    b.updateMatrixWorld(true);
    a.traverse((o) => {
      if (!(o as THREE.Bone).isBone) return;
      const par = b.getObjectByName(parejaDe(o.name));
      if (par === undefined) return;
      const puntoA = puntoDePrueba.get(o.name);
      const invA = reposoInverso.get(o.name);
      const invPar = reposoInverso.get(par.name);
      if (puntoA === undefined || invA === undefined || invPar === undefined) return;
      /* El punto con el hueso en la pose original, y su reflejo pegado a la pareja en la pose reflejada. */
      p.copy(puntoA).applyMatrix4(invA).applyMatrix4(o.matrixWorld);
      q.set(-puntoA.x, puntoA.y, puntoA.z).applyMatrix4(invPar).applyMatrix4(par.matrixWorld);
      const e = Math.hypot(-p.x - q.x, p.y - q.y, p.z - q.z);
      if (o.name.startsWith('faldon')) peorTela = Math.max(peorTela, e);
      else peor = Math.max(peor, e);
    });
  }
  return { cuerpo: peor, tela: peorTela };
}
/** El espejo de siempre: nombre cambiado de lado y (x, −y, −z, w) en todos los huesos. */
function espejoIngenuo(clip: THREE.AnimationClip): THREE.AnimationClip {
  const pistas = clip.tracks.map((t) => {
    const punto = t.name.lastIndexOf('.');
    const nombre = `${parejaDe(t.name.slice(0, punto))}${t.name.slice(punto)}`;
    const v = Float32Array.from(t.values);
    if (t.name.endsWith('.quaternion')) for (let k = 0; k < v.length; k += 4) [v[k + 1], v[k + 2]] = [-(v[k + 1] as number), -(v[k + 2] as number)];
    else if (t.name.endsWith('.position')) for (let k = 0; k < v.length; k += 3) v[k] = -(v[k] as number);
    return t.name.endsWith('.quaternion') ? new THREE.QuaternionKeyframeTrack(nombre, Float32Array.from(t.times), v) : new THREE.VectorKeyframeTrack(nombre, Float32Array.from(t.times), v);
  });
  return new THREE.AnimationClip(`${clip.name}~ingenuo`, clip.duration, pistas);
}
{
  const clips = clipsDeCadaEsqueleto.get('hombre') ?? [];
  const deQuiebro = clipDelGesto(reparto, 'quiebro', 'izquierda').clip;
  const original = clips.find((c) => c.name === deQuiebro) as THREE.AnimationClip;
  const puno = clips.find((c) => c.name === reparto.gestos['seguida-2']?.clip) as THREE.AnimationClip;
  for (const c of [original, puno]) {
    const bueno = clipEnEspejo(c, espejo);
    juzgar(
      `el espejo de «${c.name}» deja cada hueso del cuerpo en el reflejo de su pareja (< 1 mm, pulgares incluidos) y la tela a menos de 4 cm`,
      (x: THREE.AnimationClip) => {
        const e = errorDelEspejo(c, x);
        return { bien: e.cuerpo < 0.001 && e.tela < 0.04, detalle: `cuerpo ${(e.cuerpo * 1000).toFixed(2)} mm, tela ${(e.tela * 1000).toFixed(1)} mm` };
      },
      bueno,
      espejoIngenuo(c),
      'cambiar el lado del nombre y negar y, z en todos',
    );
  }
  const d = clipDelGesto(reparto, 'quiebro', 'derecha');
  const i = clipDelGesto(reparto, 'quiebro', 'izquierda');
  comprobar(
    'quebrar a la derecha pinta el paso de la izquierda en espejo mientras no haya uno horneado; a la izquierda, sin espejo',
    (d.espejo && d.clip === i.clip) || (!d.espejo && d.clip !== i.clip && d.clip.endsWith('-derecha')),
    { d, i },
  );
  comprobar(
    'la dirección relativa: +90° desde la cara es la derecha, −90° la izquierda, 180° atrás',
    direccionRelativa(0, Math.PI / 2) === 'derecha' && direccionRelativa(1, 1 - Math.PI / 2) === 'izquierda' && direccionRelativa(-2, -2 + Math.PI) === 'atras' && direccionRelativa(3, 3.1) === 'delante',
  );
  comprobar(
    'el esqueleto de la forja es simétrico salvo la tela: sólo huesos de faldón se apartan de la simetría',
    espejo.d.size > 50 && [...espejo.desvios.keys()].every((n) => n.startsWith('faldon')),
    Object.fromEntries([...espejo.desvios].map(([k, v]) => [k, v.toFixed(3)])),
  );
}

/* ═══════════════════════════════ 8. El presupuesto ═══════════════════════════════ */

paso('El presupuesto: el renglón de cada nivel cabe en un cuarto del tope');
for (const n of NIVELES) {
  const r = renglonDeLosPersonajes(reparto, n);
  const cuota = cuotaDelNivel(n);
  comprobar(
    `N${String(n)}: el peor caso de los personajes (${String(r.llamadas)} llamadas, ${r.triangulos.toLocaleString('es')} triángulos) cabe en su cuarto (${String(cuota.llamadas)}, ${cuota.triangulos.toLocaleString('es')})`,
    r.llamadas <= cuota.llamadas && r.triangulos <= cuota.triangulos,
    r.desglose.filter((d) => d.triangulos > 0).map((d) => `${d.que}: ${d.triangulos} tri, ${String(d.llamadas)} ll.`),
  );
}
/*
 * LO QUE MANDA ES EL TOPE DEL JUEGO ENTERO: el peor caso de los personajes más lo que el resto del juego
 * gastó en el peor fotograma medido en el juego real (`RESTO_DEL_JUEGO_MEDIDO`, con cómo se midió). La
 * cuota de un cuarto es un reparto; esto es la cuenta que decide si hace falta cambiarlo.
 */
for (const n of NIVELES) {
  const r = renglonDeLosPersonajes(reparto, n);
  const resto = RESTO_DEL_JUEGO_MEDIDO[n];
  const tope = TABLA_DE_NIVELES[n].topes;
  comprobar(
    `N${String(n)}: el juego entero cabe en su tope: ${String(r.llamadas)} de los personajes + ${String(resto.llamadas)} medidas del resto ≤ ${String(tope.llamadas)} llamadas, y ${(r.triangulos + resto.triangulos).toLocaleString('es')} ≤ ${tope.triangulos.toLocaleString('es')} triángulos`,
    resto.llamadas > 0 && resto.triangulos > 0 && r.llamadas + resto.llamadas <= tope.llamadas && r.triangulos + resto.triangulos <= tope.triangulos,
    { personajes: [r.llamadas, r.triangulos], resto, tope },
  );
}
{
  const ligeros = Object.entries(reparto.figuras).map(([n, f]) => `${n}: ${f.lods.map((l) => l.triangulos).join('/')}`);
  nota(`LODs del reparto: ${ligeros.join(' · ')}`);
}
{
  /*
   * El maniquí: el LOD más ligero de la multitud simplificado de verdad (con el simplificador que trae
   * three), en Node, contra lo que el renglón da por hecho. Si meshoptimizer no llegara al objetivo, el
   * renglón mentiría: aquí se vería.
   */
  await MeshoptSimplifier.ready;
  const simplificar = (indices: Uint32Array, posiciones: Float32Array, objetivo: number): Uint32Array => MeshoptSimplifier.simplify(indices, posiciones, 3, objetivo, 1)[0];
  const resultados: string[] = [];
  let bien = true;
  for (const c of reparto.durmientes.cuerpos) {
    for (const n of NIVELES) {
      const tope = POLITICA[n].trisMultitud;
      const indice = lodParaTope(reparto, c.figura, tope, varianteMasLigera(reparto, c.figura, 0));
      const maniqui = varianteMasLigera(reparto, c.figura, indice);
      const elegido = lodElegido(reparto, c.figura, tope, maniqui);
      if (elegido.simplificado === null) continue;
      const g = await leer(reparto.figuras[c.figura]?.lods[elegido.indice]?.archivo ?? '');
      const esq = reparto.figuras[c.figura]?.esqueleto ?? 'hombre';
      const malla = fundirElLod(g.scene, { zonas: zonasDeLaFigura(reparto, c.figura), sinZonas: [], mallas: maniqui, piezas: [construirPieza('paraguas')], huesoDe: huesoDePrueba(reparto, esq) });
      const simple = simplificarMalla(malla, elegido.simplificado, simplificar);
      const cuerpo = simple.indicesDelCuerpo / 3;
      resultados.push(`${c.figura} N${String(n)}: ${String(malla.indicesDelCuerpo / 3)} → ${String(cuerpo)} (objetivo ${String(elegido.simplificado)}), paraguas ${String(simple.triangulos - cuerpo)}`);
      if (cuerpo > elegido.simplificado || cuerpo < MINIMO_DEL_MANIQUI * 0.8 || simple.triangulos - cuerpo !== TRIANGULOS_DE_PIEZA.paraguas) bien = false;
      malla.geometria.dispose();
      simple.geometria.dispose();
    }
  }
  nota(`maniquí: ${resultados.join(' · ') || 'no hace falta en ningún nivel'}`);
  comprobar('el maniquí de la multitud, simplificado de verdad, no pasa de lo que el renglón declara y el paraguas fundido queda entero', bien, resultados);
}
for (const nombre of PIEZAS) {
  const p = construirPieza(nombre);
  const t = triangulosDe(p);
  comprobar(`la pieza «${nombre}» tiene los ${String(TRIANGULOS_DE_PIEZA[nombre])} triángulos que declara el renglón`, t === TRIANGULOS_DE_PIEZA[nombre], t);
  p.geometria.dispose();
}
/** Los triángulos del maniquí de una figura (la variante más ligera, simplificada si toca: como el rebaño). */
function triangulosDelManiqui(f: string, tope: number): number {
  const lod = lodParaTope(reparto, f, tope, varianteMasLigera(reparto, f, 0));
  const maniqui = varianteMasLigera(reparto, f, lod);
  return triangulosDelLod(reparto, f, lodElegido(reparto, f, tope, maniqui), maniqui);
}
/** Lo que un reparto del detalle gastaría en triángulos y llamadas con las figuras más caras. */
function gastoDelReparto(nivel: Nivel, detalle: ReadonlyMap<number, DetalleDelCuerpo>): { tri: number; ll: number; esq: number } {
  const figuras = Object.keys(reparto.figuras);
  let tri = 0;
  let ll = 0;
  let esq = 0;
  for (const d of detalle.values()) {
    const peor = Math.max(...figuras.map((f) => (d.modo === 'rebano' ? triangulosDelManiqui(f, d.tope) : triangulosConTope(reparto, f, d.tope))));
    if (d.modo === 'esqueleto') {
      tri += peor;
      ll++;
      esq++;
    } else {
      tri += peor;
    }
  }
  void nivel;
  return { tri, ll, esq };
}
const juezDelReparto = (repartir: typeof repartirElDetalle): { bien: boolean; detalle?: unknown } => {
  const r = azar(5);
  for (const nivel of NIVELES) {
    const pol = POLITICA[nivel];
    const renglon = renglonDeLosPersonajes(reparto, nivel);
    const cuerposDelRenglon = renglon.desglose.slice(0, 4).reduce((s, d) => s + d.triangulos, 0);
    let anterior = new Map<number, DetalleDelCuerpo>();
    for (let escena = 0; escena < 400; escena++) {
      const n = 1 + Math.floor(r() * CUERPOS_COMO_MUCHO);
      const cuerpos: CuerpoAMedir[] = Array.from({ length: n }, (_, k) => ({ id: k + 1, distancia: r() < 0.5 ? r() * 12 : r() * 90 }));
      const salida = repartir(cuerpos, 1, nivel, anterior, new Map());
      const g = gastoDelReparto(nivel, salida);
      let cerca = 0;
      for (const [id, d] of salida) {
        if (d.modo === 'esqueleto' && id !== 1 && d.tope === pol.trisCerca && pol.trisCerca !== pol.trisLejos) cerca++;
        const dist = cuerpos.find((c) => c.id === id)?.distancia ?? 0;
        if (d.modo === 'esqueleto' && id !== 1 && pol.soloCercanosM !== null && dist > pol.soloCercanosM + 1.5) return { bien: false, detalle: `N${String(nivel)}: esqueleto a ${dist.toFixed(1)} m` };
      }
      if (g.esq > pol.esqueletos) return { bien: false, detalle: `N${String(nivel)}: ${String(g.esq)} esqueletos` };
      if (cerca > pol.cuantosCerca) return { bien: false, detalle: `N${String(nivel)}: ${String(cerca)} con el LOD de cerca` };
      if (g.tri > cuerposDelRenglon + 1) return { bien: false, detalle: `N${String(nivel)}: ${String(g.tri)} tri de cuerpos > ${String(cuerposDelRenglon)} del renglón` };
      if (salida.get(1)?.modo !== 'esqueleto') return { bien: false, detalle: 'el propio sin esqueleto' };
      anterior = salida;
    }
  }
  return { bien: true };
};
{
  const todosConEsqueleto: typeof repartirElDetalle = (cuerpos, yo, nivel, _a, salida) => {
    for (const c of cuerpos) salida.set(c.id, { modo: 'esqueleto', tope: c.id === yo ? POLITICA[nivel].trisPropio : POLITICA[nivel].trisCerca, hz: 0, muelles: false });
    return salida;
  };
  juzgar('en 1.600 escenas al azar, lo que reparte el detalle nunca pasa de los esqueletos, del LOD de cerca ni de los triángulos del renglón', juezDelReparto, repartirElDetalle, todosConEsqueleto, 'todos con esqueleto y LOD de cerca');
}

paso('El contorno se lee igual en todos los niveles, y la amenaza no es un color de asiento');
{
  const asientos = ['#ff4d6d', '#46c8ff', '#b4ff4a', '#c38bff', '#ff9a3c', '#fff04d'];
  const a = new THREE.Color(COLOR_DE_AMENAZA);
  const lejos = Math.min(
    ...asientos.map((s) => {
      const c = new THREE.Color(s);
      return Math.hypot(c.r - a.r, c.g - a.g, c.b - a.b);
    }),
  );
  comprobar('el verde-cian de la amenaza dista de todos los colores de asiento (> 0,3 en lineal)', lejos > 0.3, lejos.toFixed(3));
  comprobar(
    'los enemigos llevan el contorno de amenaza y los desvelados el de su asiento',
    contornoDe({ clase: 'celador', color: null }).amenaza && contornoDe({ clase: 'prestado', color: null }).amenaza && !contornoDe({ clase: 'desvelado', color: '#46c8ff' }).amenaza && contornoDe({ clase: 'desvelado', color: '#46c8ff' }).color === '#46c8ff',
  );
  comprobar('el relleno del contorno es nada a 10 m y más de la mitad de la figura a 60 m', llenoDelContorno(10) === 0 && llenoDelContorno(60) >= 0.55, [llenoDelContorno(10), llenoDelContorno(60)]);
  /* Sólo el código: los comentarios dicen, con razón, «igual en todos los niveles». */
  const sinComentarios = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const codigo = sinComentarios(readFileSync(join(PERSONAJES, 'material.ts'), 'utf8')) + sinComentarios(readFileSync(join(PERSONAJES, 'cuerpo.ts'), 'utf8'));
  const juezDelContorno = (texto: string): { bien: boolean; detalle?: unknown } => {
    const lineas = texto.split('\n').filter((l) => /contorno|Contorno|uLlenoQ|uModoQ/.test(l) && /nivel|Nivel/.test(l));
    return { bien: lineas.length === 0, detalle: lineas.slice(0, 3) };
  };
  juzgar('ni el material ni el cuerpo miran el nivel para el contorno (el mismo sombreador en N0-N3)', juezDelContorno, codigo, `${codigo}\nconst uContornoQ = nivel > 0 ? 1 : 0;`, 'un contorno que depende del nivel');
}

/* ═══════════════════════════════ 9. La multitud ═══════════════════════════════ */

paso('La multitud: el sitio del guion, sin Prestados, y el medio metro de apartarse');
type Mover = typeof moverLaMultitud;
const moverDesplazado: Mover = (m, gente, tic, dt, pres, obs, z, r) => {
  moverLaMultitud(m, gente, tic, dt, pres, obs, z, r);
  for (let i = 0; i < DURMIENTES; i++) m.x[i] = (m.x[i] as number) + 0.25;
};
const juezDelSitio = (mover: Mover): { bien: boolean; detalle?: unknown } => {
  const r = azar(13);
  let peor = 0;
  let donde = '';
  for (const [codigo, noche] of [
    ['BANCO', 2],
    ['XK7QPA', 1],
    ['LLUVIA', 4],
  ] as const) {
    const barrio: Barrio = barrioDeLaNoche(codigo, noche);
    const m = crearLaMultitud();
    for (let k = 0; k < 120; k++) {
      const tic = Math.floor(r() * 200000) - 100000;
      mover(m, genteDelBarrio(barrio), tic, 16, new Set(), [], 1.3, 2000);
      for (let i = 0; i < DURMIENTES; i++) {
        const s = sitioDelDurmiente(barrio, i, tic);
        const e = Math.hypot((m.x[i] as number) - s.x / UNO, (m.z[i] as number) - s.z / UNO);
        if (e > peor) {
          peor = e;
          donde = `${codigo}/${String(noche)} tic ${String(tic)} durmiente ${String(i)}`;
        }
      }
    }
  }
  return { bien: peor < 1e-9, detalle: `peor ${peor.toExponential(2)} m (${donde})` };
};
juzgar('en 360 tics enteros al azar de tres noches, los 48 están EXACTAMENTE donde sitioDelDurmiente', juezDelSitio, moverLaMultitud, moverDesplazado, 'la multitud corrida 25 cm');
{
  const barrio = barrioDeLaNoche('BANCO', 2);
  const m = crearLaMultitud();
  const r = azar(17);
  let fuera = 0;
  for (let k = 0; k < 200; k++) {
    const base = Math.floor(r() * 50000);
    const f = r();
    moverLaMultitud(m, genteDelBarrio(barrio), base + f, 16, new Set(), [], 1.3, 2000);
    for (let i = 0; i < DURMIENTES; i++) {
      const a = sitioDelDurmiente(barrio, i, base);
      const b = sitioDelDurmiente(barrio, i, base + 1);
      const ax = a.x / UNO;
      const az = a.z / UNO;
      const bx = b.x / UNO;
      const bz = b.z / UNO;
      const x = m.x[i] as number;
      const z = m.z[i] as number;
      const salta = Math.abs(bx - ax) > 2 || Math.abs(bz - az) > 2;
      const enElTramo = salta ? Math.hypot(x - ax, z - az) < 1e-9 : Math.abs((x - ax) * (bz - az) - (z - az) * (bx - ax)) < 1e-9 && Math.min(ax, bx) - 1e-9 <= x && x <= Math.max(ax, bx) + 1e-9;
      if (!enElTramo) fuera++;
    }
  }
  comprobar('entre dos tics cada durmiente está en el tramo que une sus dos sitios (o en el primero, si salta)', fuera === 0, fuera);
  moverLaMultitud(m, genteDelBarrio(barrio), 1234, 16, new Set([3, 17, 40]), [], 1.3, 2000);
  comprobar('los durmientes que son Prestados no se pintan como civiles', m.visible[3] === 0 && m.visible[17] === 0 && m.visible[40] === 0 && m.visible[4] === 1);
  /* Un cuerpo encima de cada durmiente, en muchos fotogramas: nadie se aparta más de medio metro. */
  let peor = 0;
  for (let k = 0; k < 120; k++) {
    const obs = Array.from({ length: DURMIENTES }, (_, i) => ({ x: (m.x[i] as number) + (r() - 0.5) * 0.4, z: (m.z[i] as number) + (r() - 0.5) * 0.4 }));
    obs.push(...obs.map((o) => ({ x: o.x + 0.3, z: o.z })));
    moverLaMultitud(m, genteDelBarrio(barrio), 1234 + k * 0.3, 16, new Set(), obs, 1.3, 2000);
    for (let i = 0; i < DURMIENTES; i++) peor = Math.max(peor, Math.hypot(m.apartX[i] as number, m.apartZ[i] as number));
  }
  comprobar('con cuerpos encima, ningún durmiente se aparta más de medio metro de su sitio (§8)', peor <= APARTE_COMO_MUCHO_M + 1e-9 && peor > 0.1, peor);
  comprobar('el tic pintado es el de la sala sin Remanso, y va 315 ms (6,3 tics) atrás en el peor momento del Remanso', ticPintado(500, 1000, 1000) === 500 && Math.abs(ticPintado(500, 1000, 685) - 493.7) < 1e-9);
}


/* ═══════════════════════════════ 9 bis. La multitud de la ciudad ═══════════════════════════════ */

paso('La multitud de la ciudad: los cercanos de sus unos 630, exactos en su sitio, y los candidatos siempre');
/** Tres noches de tres ciudades (tres trazas con tres simetrías distintas), con la Bajada en su plaza. */
const NOCHES_DE_LA_CIUDAD: readonly NocheDeLaCiudad[] = (
  [
    [3, 'QUIEB', 2, [1]],
    [14, 'TKQRY', 1, [2]],
    [27, 'LLUVIA', 4, [5]],
  ] as const
).map(([traza, codigo, noche, fallos]) => ciudadDeLaNoche(ciudadDeLaMesa(traza, codigo), codigo, noche, fallos));
type MoverEnLaCiudad = (m: ReturnType<typeof crearLaMultitud>, gente: GenteDeLaNoche, tic: number, mirada: MiradaDeLaMultitud) => void;
const moverEnLaCiudad: MoverEnLaCiudad = (m, gente, tic, mirada) => moverLaMultitud(m, gente, tic, 16, new Set(), [], 1.3, 2000, mirada);
/** La vacuna: elige desde doce metros más al este de donde está el centro. */
const moverDesdeOtroSitio: MoverEnLaCiudad = (m, gente, tic, mirada) => moverLaMultitud(m, gente, tic, 16, new Set(), [], 1.3, 2000, { centro: { x: mirada.centro.x + 12, z: mirada.centro.z }, jugadores: mirada.jugadores });
/** La vacuna de los candidatos: se olvida de los jugadores. */
const moverSinJugadores: MoverEnLaCiudad = (m, gente, tic, mirada) => moverLaMultitud(m, gente, tic, 16, new Set(), [], 1.3, 2000, { centro: mirada.centro, jugadores: [] });
{
  const r = azar(41);
  /* Puntos de la calle de cada noche: nudos del grafo, al azar. */
  const puntos = NOCHES_DE_LA_CIUDAD.map((n) => Array.from({ length: 40 }, () => n.grafo.nudos[Math.floor(r() * n.grafo.nudos.length)] as { x: number; z: number }));
  const tics = Array.from({ length: 40 }, () => Math.floor(r() * 400000) - 200000);
  const juezDeLaLista = (mover: MoverEnLaCiudad): { bien: boolean; detalle?: unknown } => {
    let distintas = 0;
    let fuera = 0;
    let mirados = 0;
    let pintados = 0;
    let donde = '';
    NOCHES_DE_LA_CIUDAD.forEach((noche, k) => {
      const gente = genteDeLaCiudad(noche);
      (puntos[k] as { x: number; z: number }[]).forEach((c, j) => {
        const tic = tics[j] as number;
        const m = crearLaMultitud();
        mover(m, gente, tic, { centro: c, jugadores: [] });
        const esperado = durmientesCercaEnLaCiudad(noche, tic, Math.round(c.x * UNO), Math.round(c.z * UNO), RADIO_DE_LO_QUE_SE_PINTA, DURMIENTES_QUE_SE_PINTAN);
        const lista = Array.from(m.lista.subarray(0, m.cuantos));
        mirados++;
        if (lista.join() !== esperado.join()) {
          distintas++;
          if (donde === '') donde = `traza ${String(noche.ciudad.traza)} en (${String(c.x)}, ${String(c.z)}), tic ${String(tic)}: ${String(lista.length)} frente a ${String(esperado.length)}`;
        }
        for (const i of lista) {
          pintados++;
          const s = sitioDelDurmienteEnLaCiudad(noche, i, tic);
          if (s === null || Math.abs((m.x[i] as number) - s.x / UNO) > 1e-9 || Math.abs((m.z[i] as number) - s.z / UNO) > 1e-9) fuera++;
        }
      });
    });
    return { bien: distintas === 0 && fuera === 0 && mirados === 120 && pintados > 3000, detalle: { distintas, fuera, mirados, pintados, donde } };
  };
  juzgar(
    'en 120 sitios y tics al azar de tres ciudades, se pintan justo los que dice durmientesCercaEnLaCiudad (64 a 90 m, por distancia e índice) y cada uno EXACTAMENTE en su sitio del guion',
    juezDeLaLista,
    moverEnLaCiudad,
    moverDesdeOtroSitio,
    'la lista elegida desde doce metros más allá',
  );
  const juezDeLosCandidatos = (mover: MoverEnLaCiudad): { bien: boolean; detalle?: unknown } => {
    let faltan = 0;
    let mirados = 0;
    let masDeLaCuenta = 0;
    let candidatosComoMucho = 0;
    NOCHES_DE_LA_CIUDAD.forEach((noche, k) => {
      const gente = genteDeLaCiudad(noche);
      (puntos[k] as { x: number; z: number }[]).forEach((c, j) => {
        const tic = tics[j] as number;
        /* El propio en el centro y un compañero a 70 m: fuera de los 64 más cercanos al centro, casi siempre. */
        const otro = { x: c.x + (j % 2 === 0 ? 70 : -70), z: c.z };
        const m = crearLaMultitud();
        mover(m, gente, tic, { centro: c, jugadores: [c, otro] });
        const enLaLista = new Set(Array.from(m.lista.subarray(0, m.cuantos)));
        const candidatos = new Set<number>();
        for (const jg of [c, otro]) for (const i of durmientesCercaEnLaCiudad(noche, tic, Math.round(jg.x * UNO), Math.round(jg.z * UNO), RADIO_DE_LOS_CANDIDATOS, 1000)) candidatos.add(i);
        candidatosComoMucho = Math.max(candidatosComoMucho, candidatos.size);
        if (m.cuantos > DURMIENTES_QUE_SE_PINTAN) masDeLaCuenta++;
        if (candidatos.size > DURMIENTES_QUE_SE_PINTAN) return;
        mirados++;
        for (const i of candidatos) if (!enLaLista.has(i)) faltan++;
      });
    });
    return { bien: faltan === 0 && masDeLaCuenta === 0 && mirados >= 100, detalle: { faltan, masDeLaCuenta, mirados, candidatosComoMucho } };
  };
  juzgar(
    'con el propio y un compañero a 70 m, los candidatos a Prestado de los dos (a 40 m) se pintan SIEMPRE, y nunca más de 64',
    juezDeLosCandidatos,
    moverEnLaCiudad,
    moverSinJugadores,
    'la multitud que no mira a los jugadores',
  );
  /* Andando por la ciudad, fotograma a fotograma: la lista cambia, los Prestados no se pintan y quien sale deja de pintarse. */
  const noche = NOCHES_DE_LA_CIUDAD[0] as NocheDeLaCiudad;
  const gente = genteDeLaCiudad(noche);
  const m = crearLaMultitud();
  const prestados = new Set<number>();
  let visiblesFuera = 0;
  let prestadosPintados = 0;
  let masDeLaCuenta = 0;
  let cambios = 0;
  let antes = '';
  const nudos = noche.grafo.nudos;
  for (let f = 0; f < 1200; f++) {
    const c = nudos[Math.floor(f / 40) * 37 % nudos.length] as { x: number; z: number };
    const tic = 5000 + f / 3;
    if (f % 90 === 0 && m.cuantos > 3) {
      prestados.clear();
      prestados.add(m.lista[1] as number);
      prestados.add(m.lista[2] as number);
    }
    moverLaMultitud(m, gente, tic, 16, prestados, [], 1.3, 2000, { centro: c, jugadores: [c] });
    const lista = Array.from(m.lista.subarray(0, m.cuantos));
    const clave = lista.join();
    if (clave !== antes) cambios++;
    antes = clave;
    if (m.cuantos > DURMIENTES_PINTADOS_COMO_MUCHO) masDeLaCuenta++;
    const enLaLista = new Set(lista);
    for (let i = 0; i < m.visible.length; i++) {
      if (m.visible[i] === 1 && !enLaLista.has(i)) visiblesFuera++;
      if (m.visible[i] === 1 && prestados.has(i)) prestadosPintados++;
    }
  }
  comprobar(
    `andando 1.200 fotogramas por la ciudad (${String(cambios)} listas distintas): ningún Prestado se pinta, nadie fuera de la lista se pinta, y nunca más de ${String(DURMIENTES_PINTADOS_COMO_MUCHO)}`,
    visiblesFuera === 0 && prestadosPintados === 0 && masDeLaCuenta === 0 && cambios > 20,
    { visiblesFuera, prestadosPintados, masDeLaCuenta, cambios },
  );
  comprobar(
    'la gente de la ciudad es toda la de la mesa (durmientesDeLaCiudad), y la multitud se hace de su tamaño',
    gente.total === durmientesDeLaCiudad(noche.ciudad) && gente.total > 500 && m.x.length === gente.total,
    { total: gente.total, arrays: m.x.length },
  );
}

paso('El presupuesto con la ciudad: con los 64 durmientes a la vista, el juego entero cabe en su tope');
/*
 * `personajes/presupuesto.ts` (de otro frente) cuenta los 48 del barrio. Con la ciudad se pintan hasta
 * `DURMIENTES_PINTADOS_COMO_MUCHO` (64): lo mismo que el renglón, más los que faltan con el maniquí de su
 * línea de la multitud (misma llamada: el mismo rebaño) y su sombra de contacto. Lo que MANDA es el tope
 * del juego entero (§8 de EL-QUIEBRO), con lo medido del resto; el cuarto de los personajes es un reparto,
 * y si no cabe se dice (en N0 no cabe: 16 maniquíes más son unos 6.800 triángulos, y la ciudad bajó su
 * cuota del 60 al 50 % precisamente para dejar sitio a los personajes, §5.7 de CIUDAD-ABIERTA).
 */
for (const n of NIVELES) {
  const r = renglonDeLosPersonajes(reparto, n);
  const linea = r.desglose.find((d) => /durmientes en la multitud/.test(d.que));
  const cuantosEnLaLinea = Number(/^(\d+)/.exec(linea?.que ?? '')?.[1] ?? 'NaN');
  const porCabeza = linea === undefined || !(cuantosEnLaLinea > 0) ? Number.NaN : linea.triangulos / cuantosEnLaLinea;
  const mas = DURMIENTES_PINTADOS_COMO_MUCHO - DURMIENTES;
  const triangulos = r.triangulos + mas * (porCabeza + 2);
  const cuota = cuotaDelNivel(n);
  const resto = RESTO_DEL_JUEGO_MEDIDO[n];
  const tope = TABLA_DE_NIVELES[n].topes;
  comprobar(
    `N${String(n)}: con ${String(DURMIENTES_PINTADOS_COMO_MUCHO)} durmientes a la vista, los personajes (${triangulos.toLocaleString('es')} tri, ${String(r.llamadas)} ll.) más lo medido del resto (${resto.triangulos.toLocaleString('es')}, ${String(resto.llamadas)}) caben en el tope del juego (${tope.triangulos.toLocaleString('es')}, ${String(tope.llamadas)})`,
    Number.isFinite(porCabeza) && porCabeza > 0 && triangulos + resto.triangulos <= tope.triangulos && r.llamadas + resto.llamadas <= tope.llamadas,
    { porCabeza, triangulos, resto, tope },
  );
  if (triangulos > cuota.triangulos || r.llamadas > cuota.llamadas) {
    nota(`N${String(n)}: con la ciudad los personajes pasan de su cuarto (${triangulos.toLocaleString('es')} de ${cuota.triangulos.toLocaleString('es')} triángulos): lo decide el dueño de presupuesto.ts.`);
  }
}

paso('La textura de huesos da la misma piel que el esqueleto de three');
{
  const f = figuraDelDurmiente(reparto, 0, { cuerpo: 0, ropa: 0, paraguas: false }, false);
  const lod = reparto.figuras[f.figura]?.lods[lodParaTope(reparto, f.figura, 5000, f.mallas)];
  const g = await leer(lod?.archivo ?? '');
  const esq = reparto.esqueletos[f.esqueleto];
  const zonas = zonasDeLaFigura(reparto, f.figura);
  const malla = fundirElLod(g.scene, { zonas, sinZonas: [], mallas: f.mallas, piezas: [], huesoDe: huesoDePrueba(reparto, f.esqueleto) });
  const plantilla = plantillaDeHuesos(g.scene, esq?.raiz ?? 'raiz');
  const clips = clipsDeCadaEsqueleto.get(f.esqueleto) ?? [];
  const andar = clipEnElSitio(clips.find((c) => c.name === (reparto.gestos.andar?.clip ?? 'andar')) as THREE.AnimationClip, 'raiz');
  /* La de la GPU (media precisión) y la entera: la entera mide la cuenta, la media lo que se pinta. */
  const tex = hornearHuesos(plantilla.clone(true), malla.huesos, malla.inversas, [{ nombre: 'andar', clip: andar, bucle: true }], false);
  const media = hornearHuesos(plantilla.clone(true), malla.huesos, malla.inversas, [{ nombre: 'andar', clip: andar, bucle: true }], true);
  /* La misma pose con three: la malla fundida con su esqueleto, en el fotograma 7 de andar. */
  const copiaDeHuesos = plantilla.clone(true);
  const huesos = malla.huesos.map((n) => copiaDeHuesos.getObjectByName(n) as THREE.Bone);
  const piel = new THREE.SkinnedMesh(malla.geometria, new THREE.MeshBasicMaterial());
  copiaDeHuesos.add(piel);
  piel.bind(new THREE.Skeleton(huesos, malla.inversas as THREE.Matrix4[]), new THREE.Matrix4());
  const mezclador = new THREE.AnimationMixer(copiaDeHuesos);
  const accion = mezclador.clipAction(andar);
  accion.play();
  accion.time = 7 / 30;
  mezclador.update(0);
  copiaDeHuesos.updateMatrixWorld(true);
  piel.skeleton.update();
  const sitio = tex.clips.get('andar');
  const filas = filasEn(sitio ?? { inicio: 0, filas: 1, bucle: true, duracion: 1 }, 7 / 30, { a: 0, b: 0, mezcla: 0 });
  const P = malla.geometria.getAttribute('position') as THREE.BufferAttribute;
  const I = malla.geometria.getAttribute('skinIndex') as THREE.BufferAttribute;
  const W = malla.geometria.getAttribute('skinWeight') as THREE.BufferAttribute;
  const m4 = new THREE.Matrix4();
  const deLaTextura = (t: HuesosEnTextura, i: number, fila: number): THREE.Vector3 => {
    const v = new THREE.Vector3().fromBufferAttribute(P, i);
    const salida = new THREE.Vector3();
    for (let k = 0; k < 4; k++) {
      const w = W.getComponent(i, k);
      if (w === 0) continue;
      salida.addScaledVector(v.clone().applyMatrix4(t.matriz(fila, I.getComponent(i, k), m4)), w);
    }
    return salida;
  };
  let peor = 0;
  let peorMedia = 0;
  let peorDesplazada = 0;
  const v = new THREE.Vector3();
  for (let i = 0; i < P.count; i += 7) {
    v.fromBufferAttribute(P, i);
    piel.applyBoneTransform(i, v);
    peor = Math.max(peor, v.distanceTo(deLaTextura(tex, i, filas.a)));
    peorMedia = Math.max(peorMedia, v.distanceTo(deLaTextura(media, i, filas.a)));
    peorDesplazada = Math.max(peorDesplazada, v.distanceTo(deLaTextura(tex, i, filas.a + 5)));
  }
  comprobar('la piel leída de la textura de huesos coincide con la de three en el fotograma 7 de andar (< 1 mm)', peor < 0.001 && filas.mezcla < 1e-6, `${(peor * 1000).toFixed(3)} mm`);
  comprobar('y en la media precisión que va a la GPU, a menos de 3 mm (un píxel en el durmiente más cercano)', peorMedia < 0.003, `${(peorMedia * 1000).toFixed(2)} mm`);
  comprobar('la vacuna «leer cinco filas más abajo» no coincide (el juez de la textura mira)', peorDesplazada > 0.01, `${(peorDesplazada * 1000).toFixed(1)} mm`);
  nota(`piel de la textura frente a three: ${(peor * 1000).toFixed(3)} mm entera, ${(peorMedia * 1000).toFixed(2)} mm en media precisión`);
  /*
   * EL HORNO A TROZOS da lo mismo que de una vez, y cada trozo cabe en su presupuesto (más una fila, que
   * es lo menos que hace). La primera versión horneaba entero dentro del fotograma: 35-46 ms en frío.
   */
  {
    const pedidos = [{ nombre: 'andar', clip: andar, bucle: true }, { nombre: 'andar2', clip: andar, bucle: false }];
    const entero = hornearHuesos(plantilla.clone(true), malla.huesos, malla.inversas, pedidos, true);
    const horno = new HornoDeHuesos(plantilla.clone(true), malla.huesos, malla.inversas, pedidos, true);
    let trozos = 0;
    let peorTrozo = 0;
    let unaFila = Number.POSITIVE_INFINITY;
    while (!horno.lista && trozos < 10000) {
      const t0 = performance.now();
      horno.trabajar(0.25);
      const ms = performance.now() - t0;
      peorTrozo = Math.max(peorTrozo, ms);
      unaFila = Math.min(unaFila, ms);
      trozos++;
    }
    const a = entero.textura.image.data as Uint16Array;
    const b = horno.textura.image.data as Uint16Array;
    let distintos = 0;
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) distintos++;
    comprobar(
      `el horno a trozos (${String(trozos)} trozos de 0,25 ms) da la misma textura que de una vez, y ningún trozo pasa de su presupuesto más unas filas (< 4 ms)`,
      horno.lista && trozos > 3 && distintos === 0 && a.length === b.length && peorTrozo < 4,
      { trozos, distintos, peorTrozo: peorTrozo.toFixed(2) },
    );
    entero.textura.dispose();
    horno.textura.dispose();
  }
  media.textura.dispose();
  const l = filasEn({ inicio: 10, filas: 30, bucle: true, duracion: 1 }, 29.5 / 30, { a: 0, b: 0, mezcla: 0 });
  comprobar('en un clip en bucle, la fila siguiente a la última es la primera', l.a === 39 && l.b === 10 && Math.abs(l.mezcla - 0.5) < 1e-9, l);
  const u = filasEn({ inicio: 0, filas: 31, bucle: false, duracion: 1 }, 5, { a: 0, b: 0, mezcla: 0 });
  comprobar('en un clip de una vez, pasado el final se queda en la última fila', u.a === 30 && u.b === 30, u);
  const mz = filasDeLaMezcla({ inicio: 0, filas: 60, bucle: true, duracion: 2 }, 0.5, { inicio: 60, filas: 30, bucle: true, duracion: 1 }, 0.25, 0.4, { a: 0, b: 0, mezcla: 0 });
  comprobar('mezclando dos clips, una fila de cada uno y la mezcla es el peso del segundo', mz.a === 15 && mz.b === 60 + 8 && Math.abs(mz.mezcla - 0.4) < 1e-9, mz);
  nota(`horneado de «andar» en Node: ${tex.msHorneado.toFixed(1)} ms, ${String(tex.filas)} filas`);
  tex.textura.dispose();
  malla.geometria.dispose();
}

/* ═══════════════════════════════ 10. La carga ═══════════════════════════════ */

paso('La carga: cada .glb se lee una vez, y liberar suelta lo de la GPU');
{
  /*
   * Rutas con otra grafía (`recursos/./x.glb`) para no reutilizar lo que el director de arriba ya leyó:
   * la memoria del módulo va por ruta, y aquí se quiere contar desde cero.
   */
  const porRuta = new Map<string, number>();
  const lectorContado = (url: string): Promise<GLTF> => {
    porRuta.set(url, (porRuta.get(url) ?? 0) + 1);
    return lectorDeNode(url);
  };
  const urlNueva = (a: string): string => join(RECURSOS, '.', '.', a).replace(/\\/g, '/').replace('/recursos/', '/recursos/./');
  const antes = lecturasDelAlmacen;
  const almacen = new Almacen(reparto, urlNueva, lectorContado);
  const figs = [1, 3, 5].map((id) => figuraDelCuerpo(reparto, { id, clase: 'desvelado', variante: id % 3, color: '#46c8ff' }, null));
  await Promise.all([...figs.map((f) => almacen.prepararLod(f, 1)), ...figs.map((f) => almacen.prepararLod(f, 1)), almacen.prepararClips('hombre'), almacen.prepararClips('hombre')]);
  const archivos = new Set(figs.map((f) => reparto.figuras[f.figura]?.lods[1]?.archivo));
  const leidasAhora = lecturasDelAlmacen - antes;
  comprobar(
    'tres cuerpos de la misma figura, pedidos dos veces cada uno, más los clips dos veces, leen cada .glb una sola vez',
    leidasAhora === archivos.size + 1 && [...porRuta.values()].every((n) => n === 1) && almacen.errores.length === 0,
    { leidasAhora, porRuta: Object.fromEntries(porRuta), errores: almacen.errores },
  );
  let tiradas = 0;
  const f0 = almacen.fundida(figs[0] as (typeof figs)[number], 1);
  f0?.malla.geometria.addEventListener('dispose', () => tiradas++);
  almacen.liberar();
  comprobar('al liberar el almacén, la geometría fundida se tira de la GPU', tiradas === 1 && almacen.estaLiberado);
  const otro = new Almacen(reparto, urlNueva, lectorContado);
  await otro.prepararLod(figs[0] as (typeof figs)[number], 1);
  comprobar('un almacén nuevo justo después vuelve a usar lo leído (el módulo lo guarda por usos)', lecturasDelAlmacen - antes === leidasAhora);
  otro.liberar();
}

paso('Ninguna palabra de la franquicia en los ficheros de los personajes');
{
  /*
   * Con fronteras de LETRA y no `\b`: en JavaScript `\b` sólo conoce el ASCII, y «cráneo» casaba con
   * «neo» (la «á» no cuenta como letra para `\b`). Lo vio este mismo comprobador en `piezas.ts`.
   */
  const vetadas = /(?<![\p{L}\p{N}_])(matrix|neo|morpheus|morfeo|trinity|smith|or[aá]culo|zion|nabucodonosor|sentinel|centinela|bullet[- ]?time)(?![\p{L}\p{N}_])/iu;
  const ficheros = readdirSync(PERSONAJES).filter((f) => /\.(ts|tsx)$/.test(f));
  const con = ficheros.filter((f) => vetadas.test(readFileSync(join(PERSONAJES, f), 'utf8')));
  comprobar(`los ${String(ficheros.length)} ficheros de personajes/ no nombran nada de la lista del §1`, con.length === 0 && ficheros.length > 10, con);
  comprobar(
    'la vacuna «un comentario con el nombre del agente» se caza, y ni «cráneo» ni `THREE.Matrix4`',
    vetadas.test('// como el Agente Smith') && vetadas.test('Neo.') && !vetadas.test('la base del cráneo') && !vetadas.test('new THREE.Matrix4()'),
  );
}

/* ═══════════════════════════════ 11. Lo que encontró la revisión ═══════════════════════════════ */

/*
 * La revisión adversaria de la primera entrega midió doce fallos que las 104 comprobaciones de arriba
 * no veían. Cada bloque de aquí mira uno, de punta a punta con los `.glb` de verdad, y se vio ROJO con
 * el fallo puesto (ver el informe del frente «personajes»).
 */
const anguloEntre = (a: THREE.Quaternion, b: THREE.Quaternion): number =>
  /* Normalizado: las claves de la forja no son unitarias (|q|² = 0,9999) y dos iguales «girarían» 0,012 rad. */
  2 * Math.acos(Math.min(1, Math.abs(a.dot(b)) / Math.max(1e-12, a.length() * b.length())));
const esperarUnPoco = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const noche2 = barrioDeLaNoche('BANCO', 2);

paso('Los dedos del paraguas no giran: ni con esqueleto ni en la textura de la multitud');
{
  const f = figuraDelDurmiente(reparto, 0, { cuerpo: 0, ropa: 0, paraguas: true }, false);
  const lods = reparto.figuras[f.figura]?.lods ?? [];
  const g = await leer(lods[lods.length - 1]?.archivo ?? '');
  const esq = reparto.esqueletos[f.esqueleto];
  const malla = fundirElLod(g.scene, { zonas: zonasDeLaFigura(reparto, f.figura), sinZonas: [], mallas: f.mallas, piezas: [], huesoDe: huesoDePrueba(reparto, f.esqueleto) });
  const plantilla = plantillaDeHuesos(g.scene, esq?.raiz ?? 'raiz');
  const clips = clipsDeCadaEsqueleto.get(f.esqueleto) ?? [];
  const reposo = clipEnElSitio(clips.find((c) => c.name === (reparto.gestos.reposo?.clip ?? 'reposo')) as THREE.AnimationClip, esq?.raiz ?? 'raiz');
  const agarre = esq?.agarre.derecha ?? 'agarre_R';
  const postura = (raiz: THREE.Object3D): void => {
    const h = huesosDelBrazoDerecho(raiz, agarre);
    if (h !== null) posturaDelParaguas(raiz, h, 1);
  };
  const j = malla.huesos.indexOf('dedos_R');
  /** Lo más que gira la piel de los dedos de una fila a la siguiente en el clip de estar parado con paraguas. */
  const juezDeLaTextura = (t: Pick<HuesosEnTextura, 'clips' | 'matriz'>): { bien: boolean; detalle?: unknown } => {
    const c = t.clips.get('r');
    if (c === undefined || j < 0) return { bien: false, detalle: 'sin clip o sin dedos_R' };
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();
    let peor = 0;
    for (let k = 1; k < c.filas; k++) {
      t.matriz(c.inicio + k - 1, j, m).decompose(p, qa, s);
      t.matriz(c.inicio + k, j, m).decompose(p, qb, s);
      peor = Math.max(peor, anguloEntre(qa, qb));
    }
    return { bien: peor < 0.01, detalle: `giro de los dedos entre filas: ${peor.toFixed(4)} rad` };
  };
  /** El horno de la primera versión: la postura encima de cada fila, sin devolver la pose del mezclador. */
  const hornoIngenuo = (): Pick<HuesosEnTextura, 'clips' | 'matriz'> => {
    const raiz = plantilla.clone(true);
    const nodos = malla.huesos.map((n) => raiz.getObjectByName(n) as THREE.Object3D);
    const filas = Math.round(reposo.duration * 30);
    const datos: THREE.Matrix4[] = [];
    const mezclador = new THREE.AnimationMixer(raiz);
    const accion = mezclador.clipAction(reposo);
    accion.play();
    const inv = new THREE.Matrix4();
    for (let k = 0; k < filas; k++) {
      accion.time = k / 30;
      mezclador.update(0);
      raiz.updateMatrixWorld(true);
      postura(raiz);
      raiz.updateMatrixWorld(true);
      inv.copy(raiz.matrixWorld).invert();
      datos.push(new THREE.Matrix4().multiplyMatrices(inv, (nodos[j] as THREE.Object3D).matrixWorld).multiply(malla.inversas[j] as THREE.Matrix4));
    }
    return { clips: new Map([['r', { inicio: 0, filas, bucle: true, duracion: reposo.duration }]]), matriz: (fila, _j, salida) => salida.copy(datos[fila] as THREE.Matrix4) };
  };
  const bueno = hornearHuesos(plantilla.clone(true), malla.huesos, malla.inversas, [{ nombre: 'r', clip: reposo, bucle: true, postura }], true);
  juzgar('en la textura de la multitud los dedos del que espera con paraguas no giran de una fila a otra (< 0,01 rad)', juezDeLaTextura, bueno, hornoIngenuo(), 'la postura encima de cada fila sin devolver la pose (la primera versión)');
  bueno.textura.dispose();

  /* Con esqueleto: un durmiente con paraguas, parado, entre los más cercanos en N2. */
  const guion = guionDeLosDurmientes(noche2);
  let elegido = -1;
  let tic0 = 0;
  buscar: for (let tic = 1000; tic < 40000; tic += 20) {
    for (let i = 0; i < DURMIENTES; i++) {
      if (guion.durmientes[i]?.paraguas !== true) continue;
      let parado = true;
      for (let k = 0; k <= 160; k += 10) if (sitioDelDurmiente(noche2, i, tic + k).anda) parado = false;
      if (parado) {
        elegido = i;
        tic0 = tic;
        break buscar;
      }
    }
  }
  const s = sitioDelDurmiente(noche2, Math.max(0, elegido), tic0);
  const x = s.x / UNO;
  const z = s.z / UNO;
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 400);
  cam.position.set(x + 2.5, 1.6, z + 2.5);
  cam.lookAt(x, 1.1, z);
  cam.updateMatrixWorld();
  const d2 = new DirectorDeLosPersonajes(reparto, (a) => join(RECURSOS, a), lectorDeNode);
  let tic = tic0;
  const fuente: FuenteDeCuerpos = { cuerpos: () => [], prestados: () => new Set(), ticDeLosDurmientes: () => tic, yo: () => null };
  let t = 0;
  for (let k = 0; k < 3000 && d2.cuerpo(PRIMER_ID_DE_DURMIENTE + elegido) === null; k++) {
    d2.fotograma(fuente, 2, noche2, cam, t, (v) => v);
    await esperarUnPoco(3);
  }
  const cuerpo = d2.cuerpo(PRIMER_ID_DE_DURMIENTE + elegido);
  type Paso = () => THREE.Quaternion;
  const juezDelEsqueleto = (paso: Paso): { bien: boolean; detalle?: unknown } => {
    const antes = new THREE.Quaternion();
    let peor = 0;
    for (let k = 0; k < 180; k++) {
      antes.copy(paso());
      const q = paso();
      if (k > 30) peor = Math.max(peor, anguloEntre(antes, q));
    }
    return { bien: peor < 0.001, detalle: `giro de los dedos entre fotogramas: ${peor.toFixed(4)} rad` };
  };
  const dedos = cuerpo?.raiz.getObjectByName('dedos_R') ?? null;
  const pasoDelDirector: Paso = () => {
    t += 1000 / 60;
    tic = tic0 + t / 50;
    d2.fotograma(fuente, 2, noche2, cam, t, (v) => v);
    return (dedos as THREE.Object3D).quaternion;
  };
  /* La primera versión: el mezclador en reposo y la postura encima en cada fotograma, sin borrarla. */
  const ingenuo = plantilla.clone(true);
  const mezcladorIngenuo = new THREE.AnimationMixer(ingenuo);
  mezcladorIngenuo.clipAction(reposo).play();
  const dedosIngenuos = ingenuo.getObjectByName('dedos_R') as THREE.Object3D;
  const pasoIngenuo: Paso = () => {
    mezcladorIngenuo.update(1 / 60);
    ingenuo.updateMatrixWorld(true);
    postura(ingenuo);
    return dedosIngenuos.quaternion;
  };
  if (cuerpo === null || dedos === null) comprobar('el durmiente con paraguas llega a tener esqueleto en N2', false, d2.almacen.errores);
  else juzgar('un durmiente con esqueleto que espera con el paraguas no gira los dedos de un fotograma a otro (< 0,001 rad)', juezDelEsqueleto, pasoDelDirector, pasoIngenuo, 'el cierre de los dedos encima de cada fotograma sin borrarlo');

  paso('Al acabarse la noche (barrio nulo) no quedan durmientes con esqueleto en la escena');
  for (let k = 0; k < 600 && d2.durmientesConEsqueletoAhora < 8; k++) {
    t += 1000 / 60;
    tic = tic0 + t / 50;
    d2.fotograma(fuente, 2, noche2, cam, t, (v) => v);
    if (k % 5 === 0) await esperarUnPoco(2);
  }
  const conBarrio = d2.durmientesConEsqueletoAhora;
  const enEscena = (): number => {
    let n = 0;
    d2.grupo.traverse((o) => {
      if (o.name.startsWith('cuerpo-durmiente') && o.visible) n++;
    });
    return n;
  };
  const antesDeAcabar = enEscena();
  t += 1000 / 60;
  d2.fotograma(fuente, 2, null, cam, t, (v) => v);
  comprobar(
    `con la noche en curso hay durmientes con esqueleto (${String(conBarrio)}), y el fotograma sin barrio los quita de la escena`,
    conBarrio >= 4 && antesDeAcabar >= 4 && enEscena() === 0 && d2.durmientesConEsqueletoAhora === 0 && d2.medida.llamadas === 0,
    { conBarrio, antesDeAcabar, despues: enEscena(), llamadas: d2.medida.llamadas },
  );
  d2.liberar();
}

paso('Los cuerpos lejanos (el rebaño) pintan su gesto, en su dirección, y pasean sin resbalar');
/** Los once gestos que la primera versión horneaba para los lejanos. */
const GESTOS_DE_LA_PRIMERA_VERSION: readonly Gesto[] = ['reposo', 'andar', 'trotar', 'correr', 'guardia', 'tocado', 'derribado', 'levantarse', 'seguida-2', 'quiebro', 'golpe-de-prestado'];
{
  const juezDeLoHorneado = (lista: readonly { nombre: string }[]): { bien: boolean; detalle?: unknown } => {
    const hay = new Set(lista.map((c) => c.nombre));
    const faltan: string[] = [];
    for (const g of GESTOS) {
      for (const d of [null, 'delante', 'derecha', 'atras', 'izquierda'] as const) {
        const n = nombreDelClipLejano(reparto, g, d);
        if (!hay.has(n)) faltan.push(`${g}${d !== null ? `/${d}` : ''} → ${n}`);
      }
    }
    for (const p of marchaDelReparto(reparto)) if (!hay.has(p.clip)) faltan.push(`marcha ${p.clip}`);
    return { bien: faltan.length === 0, detalle: faltan.slice(0, 8) };
  };
  juzgar(
    'todo gesto del contrato, en toda dirección, y toda la marcha (con pasear) tiene su clip en la textura de los lejanos',
    juezDeLoHorneado,
    clipsDeLosLejanos(reparto),
    clipsDeLosLejanos(reparto, GESTOS_DE_LA_PRIMERA_VERSION),
    'los once gestos de la primera versión',
  );
  /* De punta a punta: un tirador a 15 m en N0 va en el rebaño; se lee la fila que se manda a la GPU. */
  const d3 = new DirectorDeLosPersonajes(reparto, (a) => join(RECURSOS, a), lectorDeNode);
  const yo = cuerpoDePrueba(1, 'desvelado', 0);
  const tir = cuerpoDePrueba(21, 'tirador', 0);
  tir.z = -15;
  tir.color = null;
  const lista = [yo, tir];
  const fuente = fuenteDe(lista, 1);
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 400);
  cam.position.set(0, 1.7, 3);
  cam.lookAt(0, 1, -15);
  cam.updateMatrixWorld();
  let t = 100000;
  const hecho = (): boolean => [...d3.rebanosHechos().values()].filter((rb) => rb.textura.lista).length >= 3 && d3.medida.porHornear === 0;
  for (let k = 0; k < 6000 && !hecho(); k++) {
    t += 16.7;
    d3.fotograma(fuente, 0, null, cam, t, (v) => v);
    if (k % 3 === 0) await esperarUnPoco(2);
  }
  /** El clip que el rebaño pinta ahora para el cuerpo en (x, z): el de la fila B (la que entra). */
  const quePinta = (c: CuerpoPintado): string => {
    for (const [clave, rb] of d3.rebanosHechos()) {
      if (!clave.startsWith('lejanos')) continue;
      const m = rb.rebano.malla.instanceMatrix.array;
      const anim = rb.rebano.malla.geometry.getAttribute('aAnimQ').array;
      for (let i = 0; i < rb.rebano.cuantas; i++) {
        if (Math.abs((m[i * 16 + 12] as number) - c.x) > 0.01 || Math.abs((m[i * 16 + 14] as number) - c.z) > 0.01) continue;
        const fila = anim[i * 4 + 1] as number;
        for (const [n, cl] of rb.textura.clips) if (fila >= cl.inicio && fila < cl.inicio + cl.filas) return n;
      }
    }
    return '(nada)';
  };
  const vistos: string[] = [];
  let bien = true;
  for (const [g, hacia] of [
    ['apuntar', 0],
    ['disparar', 0],
    ['desalojable', 0],
    ['imprimirse', 0],
    ['victoria', 0],
    ['quiebro', Math.PI / 2],
    ['quiebro', -Math.PI / 2],
  ] as const) {
    tir.gesto = g;
    tir.gestoDesdeMs = t;
    tir.impactoMs = INFO_DE_GESTOS[g].tipo === 'golpe' ? t + 300 : null;
    tir.direccionDelGesto = tir.rumbo + hacia;
    for (let k = 0; k < 30; k++) {
      t += 16.7;
      d3.fotograma(fuente, 0, null, cam, t, (v) => v);
    }
    const esperado = nombreDelClipLejano(reparto, g, direccionDelLejano(tir));
    const pinta = quePinta(tir);
    vistos.push(`${g}${hacia !== 0 ? (hacia > 0 ? '→der' : '→izq') : ''}: ${pinta}`);
    if (pinta !== esperado || pinta === (reparto.gestos.reposo?.clip ?? 'reposo')) bien = false;
  }
  comprobar('un tirador a 15 m en N0 (sin esqueleto) apunta, dispara, se desaloja, se imprime y quiebra a cada lado con su clip', bien, vistos);
  tir.gesto = 'andar';
  tir.gestoDesdeMs = t;
  tir.velocidad = 0.8;
  tir.rumbo = Math.PI / 2;
  for (let k = 0; k < 40; k++) {
    t += 16.7;
    tir.x += (0.8 * 16.7) / 1000;
    d3.fotograma(fuente, 0, null, cam, t, (v) => v);
  }
  const paseo = quePinta(tir);
  const conZancada = marchaDelReparto(reparto).some((p) => p.clip === paseo && p.zancada > 0);
  comprobar('un lejano que anda a 0,8 m/s pinta un paso con zancada (pasea despacio), no el reposo', conZancada, paseo);

  paso('Los lejanos también salen tenues y se imprimen de abajo arriba');
  tir.x = 0;
  tir.gesto = 'imprimirse';
  tir.gestoDesdeMs = t;
  tir.tenue = true;
  t += 300;
  d3.fotograma(fuente, 0, null, cam, t, (v) => v);
  let corte: readonly [number, number, number] | null = null;
  for (const [clave, rb] of d3.rebanosHechos()) {
    if (!clave.startsWith('lejanos')) continue;
    for (let i = 0; i < rb.rebano.cuantas; i++) if (Math.abs((rb.rebano.malla.instanceMatrix.array[i * 16 + 14] as number) - tir.z) < 0.01) corte = rb.rebano.corteDe(i);
  }
  const alto = corteDelGesto('imprimirse', tir.gestoDesdeMs, t, { altura: 0, modo: 0 }).altura;
  comprobar(
    'el rebaño recibe por cabeza lo tenue y el corte de imprimirse (la altura del instante)',
    corte !== null && Math.abs(corte[0] - TENUE) < 1e-6 && Math.abs(corte[1] - alto) < 1e-4 && corte[2] === 1 && alto > 0.3 && alto < 0.7,
    { corte, alto },
  );
  /* Y el sombreador del rebaño descarta con eso (el texto del material, parcheado como lo compila three). */
  const rb0 = [...d3.rebanosHechos().values()][0];
  const mat = rb0?.rebano.malla.material as THREE.MeshStandardMaterial | undefined;
  const sombreador = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} as Record<string, THREE.IUniform> };
  mat?.onBeforeCompile(sombreador as unknown as Parameters<THREE.Material['onBeforeCompile']>[0], undefined as unknown as THREE.WebGLRenderer);
  comprobar(
    'el sombreador del rebaño descarta por lo tenue y por la altura del corte de CADA cabeza (el atributo aCorteQ)',
    /bayerQ\(gl_FragCoord\.xy\) < vCorteQ\.x\) discard/.test(sombreador.fragmentShader) && /vCorteQ\.y - vAlturaQ/.test(sombreador.fragmentShader) && /vCorteQ = aCorteQ/.test(sombreador.vertexShader),
  );
  tir.tenue = false;
  d3.liberar();
}

paso('El golpe de un lejano sin esqueleto va por la misma recta que la anticipación elástica');
{
  const r = azar(29);
  let peor = 0;
  for (let k = 0; k < 400; k++) {
    const T = 150 + r() * 400;
    const desde = 1000;
    const impacto = desde + T / (0.5 + r() * 2);
    const antes = tiempoDelGesto(INFO_DE_GESTOS.cierre, 1000, T, desde, impacto, impacto) * 1000;
    const despues = tiempoDelGesto(INFO_DE_GESTOS.cierre, 1000, T, desde, impacto, impacto + 100) * 1000;
    peor = Math.max(peor, Math.abs(antes - T), Math.abs(despues - (T + 100)));
  }
  comprobar('en el instante del impacto el clip del lejano está en su impacto, y 100 ms después, 100 ms más allá (400 golpes)', peor < 1e-6, `peor ${peor.toExponential(2)} ms`);
}

paso('El golpe de un cuerpo con esqueleto LEJANO (N0: a 7 Hz) llega a su hora');
{
  const d4 = new DirectorDeLosPersonajes(reparto, (a) => join(RECURSOS, a), lectorDeNode);
  const cel = cuerpoDePrueba(16, 'celador', 0);
  cel.z = -9;
  cel.color = null;
  const yo = cuerpoDePrueba(1, 'desvelado', 0);
  yo.z = 1;
  const fuente = fuenteDe([yo, cel], 1);
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 400);
  cam.position.set(0, 1.7, 2);
  cam.lookAt(0, 1, -8);
  cam.updateMatrixWorld();
  let t = 100000;
  for (let k = 0; k < 3000 && d4.cuerpo(16) === null; k++) {
    t += 16.7;
    d4.fotograma(fuente, 0, null, cam, t, (v) => v);
    await esperarUnPoco(2);
  }
  for (let k = 0; k < 60; k++) {
    t += 16.7;
    d4.fotograma(fuente, 0, null, cam, t, (v) => v);
  }
  const errores: number[] = [];
  const r = azar(31);
  for (let n = 0; n < 12; n++) {
    cel.gesto = n % 2 === 1 ? 'entrada' : 'cierre';
    cel.gestoDesdeMs = t;
    cel.impactoMs = t + 400 + r() * 300;
    cel.direccionDelGesto = cel.rumbo;
    const T = reparto.clips[reparto.gestos[cel.gesto]?.clip ?? '']?.impactoMs ?? 0;
    let antes = t;
    for (let k = 0; k < 60; k++) {
      t += 14 + r() * 8;
      d4.fotograma(fuente, 0, null, cam, t, (v) => v);
      const g = d4.cuerpo(16)?.gestoEnCurso();
      if (g !== null && g !== undefined && antes < cel.impactoMs && t >= cel.impactoMs) errores.push(Math.abs(g.tiempo * 1000 - (T + (t - cel.impactoMs))));
      antes = t;
    }
    cel.gesto = 'reposo';
    cel.gestoDesdeMs = t;
    cel.impactoMs = null;
    for (let k = 0; k < 30; k++) {
      t += 16.7;
      d4.fotograma(fuente, 0, null, cam, t, (v) => v);
    }
  }
  const hz = d4.cuerpo(16) !== null ? repartirElDetalle([{ id: 1, distancia: 1 }, { id: 16, distancia: 9.6 }], 1, 0, new Map(), new Map()).get(16)?.hz : -1;
  comprobar(
    `un Celador a unos 9,5 m en N0 (animado a ${String(hz)} Hz) pega en su instante (< 2 ms) en 12 golpes con fotogramas desiguales`,
    hz === POLITICA[0].hzLejanos && errores.length === 12 && errores.every((e) => e < 2),
    errores.map((e) => e.toFixed(2)),
  );

  paso('La esfera de recorte contiene al cuerpo tumbado');
  cel.gesto = 'derribado';
  cel.gestoDesdeMs = t;
  for (let k = 0; k < 120; k++) {
    t += 16.7;
    d4.fotograma(fuente, 0, null, cam, t, (v) => v);
  }
  const cu = d4.cuerpo(16);
  const pieles: THREE.SkinnedMesh[] = [];
  cu?.raiz.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh && o.visible) pieles.push(o as THREE.SkinnedMesh);
  });
  cu?.raiz.updateMatrixWorld(true);
  const juezDeLaEsfera = (esfera: THREE.Sphere): { bien: boolean; detalle?: unknown } => {
    const piel = pieles[0];
    if (piel === undefined) return { bien: false, detalle: 'sin malla con piel' };
    const s = esfera.clone().applyMatrix4(piel.matrixWorld);
    let fuera = -Infinity;
    const p = new THREE.Vector3();
    cu?.raiz.traverse((o) => {
      if (!(o as THREE.Bone).isBone) return;
      o.getWorldPosition(p);
      fuera = Math.max(fuera, p.distanceTo(s.center) - s.radius);
    });
    return { bien: fuera < -0.1, detalle: `el hueso más lejano queda a ${fuera.toFixed(2)} m del borde (negativo: dentro)` };
  };
  const primera = pieles[0]?.boundingSphere?.clone() ?? new THREE.Sphere();
  /* La que three se calcula sola: la de los vértices en la pose de enlace (de pie, 0,94 m de radio). */
  const deThree = (() => {
    const p = pieles[0];
    if (p === undefined) return new THREE.Sphere();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', p.geometry.getAttribute('position'));
    g.computeBoundingSphere();
    return g.boundingSphere?.clone() ?? new THREE.Sphere();
  })();
  juzgar('el Celador tumbado cabe con holgura en la esfera con la que three recorta su malla con piel', juezDeLaEsfera, primera, deThree, 'la esfera que three calcula con la pose de enlace');
  d4.liberar();
}

paso('El que se va sólo se desvanece si cabe: nunca más llamadas ni triángulos que el renglón');
{
  const escena = async (nivel: Nivel, npcs: number): Promise<{ peorLl: number; peorTri: number; fuera: number; yendose: number; renglon: RenglonDeLosPersonajes }> => {
    const d5 = new DirectorDeLosPersonajes(reparto, (a) => join(RECURSOS, a), lectorDeNode);
    const renglon = renglonDeLosPersonajes(reparto, nivel);
    const lista: CuerpoPintado[] = [];
    let siguiente = 16;
    const nuevo = (x: number, z: number): CuerpoPintado => {
      const c = cuerpoDePrueba(siguiente, siguiente % 3 === 0 ? 'tirador' : 'celador', siguiente % 4);
      c.x = x;
      c.z = z;
      c.color = null;
      siguiente++;
      return c;
    };
    /*
     * Los que más llamadas piden: dos desvelados cerca y tres lejos (hombre y mujer en el rebaño), y los
     * NPC cinco cerca y el resto lejos (Celador y Celadora en el rebaño). Con la multitud y las sombras,
     * N0 pinta justo las 15 llamadas del renglón: un cuerpo más que se desvanezca es la 16.
     */
    lista.push(cuerpoDePrueba(1, 'desvelado', 0));
    for (let k = 0; k < 5; k++) {
      const c = cuerpoDePrueba(2 + k, 'desvelado', k % 3);
      c.x = -4 + k * 2;
      c.z = k < 2 ? -3 : -30 - k;
      lista.push(c);
    }
    for (let k = 0; k < npcs; k++) lista.push(k < 5 ? nuevo(-6 + k * 3, -6) : nuevo(-30 + k * 5, -25 - k));
    let tic = 3000;
    const fuente: FuenteDeCuerpos = { cuerpos: () => lista, prestados: () => new Set(), ticDeLosDurmientes: () => tic, yo: () => 1 };
    const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 400);
    cam.position.set(0, 3, 4);
    cam.lookAt(0, 1, -10);
    cam.updateMatrixWorld();
    let t = 100000;
    for (let k = 0; k < 6000; k++) {
      t += 16.7;
      tic += 1 / 3;
      d5.fotograma(fuente, nivel, noche2, cam, t, (v) => v);
      if (k % 3 === 0) await esperarUnPoco(2);
      if (k > 400 && d5.medida.porHornear === 0 && k % 100 === 0) break;
    }
    let peorLl = 0;
    let peorTri = 0;
    let fuera = 0;
    let yendose = 0;
    for (let k = 0; k < 60 * 12; k++) {
      t += 16.7;
      tic += 1 / 3;
      if (k % 30 === 0) {
        const i = 6 + ((k / 30) % Math.min(5, npcs));
        const viejo = lista[i] as CuerpoPintado;
        lista[i] = nuevo(viejo.x + 0.3, viejo.z);
      }
      d5.fotograma(fuente, nivel, noche2, cam, t, (v) => v);
      peorLl = Math.max(peorLl, d5.medida.llamadas);
      peorTri = Math.max(peorTri, d5.medida.triangulos);
      if (d5.medida.llamadas > renglon.llamadas || d5.medida.triangulos > renglon.triangulos) fuera++;
      yendose = Math.max(yendose, d5.medida.yendose);
    }
    d5.liberar();
    return { peorLl, peorTri, fuera, yendose, renglon };
  };
  const llena = await escena(0, 14);
  comprobar(
    `N0 con los ocho esqueletos ocupados y un cercano que se va y otro que llega cada medio segundo: ni un fotograma pasa del renglón (${String(llena.peorLl)}/${String(llena.renglon.llamadas)} llamadas, ${String(llena.peorTri)}/${String(llena.renglon.triangulos)} tri)`,
    llena.fuera === 0 && llena.peorLl <= llena.renglon.llamadas,
    llena,
  );
  const holgada = await escena(0, 3);
  comprobar(
    'con esqueletos libres el que se va SÍ se desvanece (lo hace sin pasar del renglón)',
    holgada.yendose >= 1 && holgada.fuera === 0,
    holgada,
  );
  comprobar('la regla del hueco: con los esqueletos del nivel ocupados no cabe uno más que se vaya', !cabeUnoQueSeVa(0, POLITICA[0].esqueletos, 0) && cabeUnoQueSeVa(0, POLITICA[0].esqueletos - 1, 0) && !cabeUnoQueSeVa(0, POLITICA[0].esqueletos - 1, 1));
}

paso('La Celadora y todas las siluetas con la escala del manifiesto');
{
  const malas: string[] = [];
  reparto.clases.celador.variantes.forEach((v, k) => {
    const f = figuraDelCuerpo(reparto, { id: 16 + k, clase: 'celador', variante: k, color: null }, null);
    const e = v.escala ?? 1;
    if (f.silueta.escala.some((x) => Math.abs(x - e) > 1e-9)) malas.push(`${v.silueta}: ${JSON.stringify(f.silueta.escala)} frente a ${String(e)}`);
  });
  comprobar('cada silueta de Celador (la Celadora incluida, que es una figura de una sola variante) se pinta con la escala del manifiesto', malas.length === 0, malas);
}

paso('Cada LOD fundido tiene los triángulos que declara el manifiesto (las gafas de doble cara incluidas)');
{
  const declarado = (r: Reparto, x: { figura: string; lod: number; variante: string }): number => r.figuras[x.figura]?.variantes?.[x.variante]?.triangulos[x.lod] ?? -1;
  const juezDeLosTriangulos = (r: Reparto): { bien: boolean; detalle?: unknown } => {
    const malos = reales.filter((x) => x.real !== declarado(r, x));
    return { bien: malos.length === 0 && reales.length > 20, detalle: malos.slice(0, 6).map((x) => ({ ...x, declarado: declarado(r, x) })) };
  };
  const reales: { figura: string; lod: number; variante: string; real: number }[] = [];
  for (const [nombre, f] of Object.entries(reparto.figuras)) {
    for (let lod = 0; lod < f.lods.length; lod++) {
      const g = await leer((f.lods[lod] as { archivo: string }).archivo);
      for (const variante of Object.keys(f.variantes ?? {})) {
        const m = fundirElLod(g.scene, { zonas: zonasDeLaFigura(reparto, nombre), sinZonas: [], mallas: [variante], piezas: [], huesoDe: huesoDePrueba(reparto, f.esqueleto) });
        reales.push({ figura: nombre, lod, variante, real: m.triangulos });
        m.geometria.dispose();
      }
    }
  }
  const vacuna = copia(reparto) as Reparto;
  const cel = (vacuna.figuras as Record<string, { variantes?: Record<string, { triangulos: number[] }> }>)['celador-hombre']?.variantes?.alto;
  if (cel !== undefined) cel.triangulos[0] = (cel.triangulos[0] ?? 0) - 500;
  juzgar(`los ${String(reales.length)} LOD y variantes fundidos tienen exactamente los triángulos del manifiesto`, juezDeLosTriangulos, reparto, vacuna, 'un manifiesto que declara 500 triángulos de menos (las lentes duplicadas de la primera versión)');
}

paso('Lo que el nivel necesita se hornea antes de que haga falta, y a trozos');
{
  const d6 = new DirectorDeLosPersonajes(reparto, (a) => join(RECURSOS, a), lectorDeNode);
  d6.preparar(0);
  const nadie: FuenteDeCuerpos = { cuerpos: () => [], prestados: () => new Set(), ticDeLosDurmientes: () => 0, yo: () => null };
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 400);
  cam.updateMatrixWorld();
  let t = 0;
  let k = 0;
  const listos = (): number => [...d6.rebanosHechos().values()].filter((rb) => rb.textura.lista).length;
  for (; k < 6000 && !(listos() >= 6 && d6.medida.porHornear === 0); k++) {
    t += 16.7;
    d6.fotograma(nadie, 0, null, cam, t, (v) => v);
    if (k % 3 === 0) await esperarUnPoco(2);
  }
  const rebanos = [...d6.rebanosHechos().keys()];
  const trozos = d6.medida.horneados;
  comprobar(
    `al preparar N0, sin un solo cuerpo en la calle, quedan horneados los rebaños de la multitud y de los lejanos de cada figura (${String(rebanos.length)})`,
    listos() >= 6 && rebanos.some((c) => c.startsWith('lejanos|c')) && rebanos.some((c) => c.startsWith('lejanos|d')) && rebanos.some((c) => c.startsWith('multitud')),
    { rebanos, fotogramas: k },
  );
  nota(`horneado de N0 en Node: ${trozos.map((h) => `${h.clave}: ${h.ms.toFixed(0)} ms, ${String(h.filas)} filas`).join(' · ')}; ${String(k)} fotogramas`);
  d6.liberar();
}

paso('Si el gobernador baja de N2 a N0 en plena pelea, nadie desaparece ni un fotograma');
{
  /*
   * En N2 los veinte llevan esqueleto; en N0 los de más de 12 m van en rebaño. La textura de los lejanos
   * se hornea en todos los niveles (`preparar`), así que al bajar sólo falta fundir el maniquí de N0; y
   * mientras tanto el que tenía esqueleto lo conserva. Se cuenta, fotograma a fotograma, si cada cuerpo
   * se pinta (con esqueleto visible o como cabeza de un rebaño).
   */
  const d8 = new DirectorDeLosPersonajes(reparto, (a) => join(RECURSOS, a), lectorDeNode);
  const yo = cuerpoDePrueba(1, 'desvelado', 0);
  const lejos: CuerpoPintado[] = [16, 17, 18].map((id, k) => ({ ...cuerpoDePrueba(id, id === 18 ? 'tirador' : 'celador', k), color: null, x: -3 + k * 3, z: -20 }));
  const fuente = fuenteDe([yo, ...lejos], 1);
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 400);
  cam.position.set(0, 1.7, 3);
  cam.lookAt(0, 1, -20);
  cam.updateMatrixWorld();
  const pintado = (c: CuerpoPintado): boolean => {
    const cu = d8.cuerpo(c.id);
    if (cu !== null && cu.raiz.visible && cu.raiz.parent !== null) return true;
    for (const rb of d8.rebanosHechos().values()) {
      const m = rb.rebano.malla.instanceMatrix.array;
      for (let i = 0; i < rb.rebano.cuantas; i++) if (Math.abs((m[i * 16 + 12] as number) - c.x) < 0.01 && Math.abs((m[i * 16 + 14] as number) - c.z) < 0.01) return true;
    }
    return false;
  };
  let t = 100000;
  for (let k = 0; k < 6000 && !(lejos.every((c) => d8.cuerpo(c.id) !== null) && d8.medida.porHornear === 0 && k > 60); k++) {
    t += 16.7;
    d8.fotograma(fuente, 2, null, cam, t, (v) => v);
    if (k % 3 === 0) await esperarUnPoco(2);
  }
  const conEsqueletoEnN2 = lejos.filter((c) => d8.cuerpo(c.id) !== null).length;
  let huecos = 0;
  for (let k = 0; k < 90; k++) {
    t += 16.7;
    d8.fotograma(fuente, 0, null, cam, t, (v) => v);
    for (const c of lejos) if (!pintado(c)) huecos++;
    if (k % 3 === 0) await esperarUnPoco(2);
  }
  const enRebano = d8.medida.enRebano;
  comprobar(
    `tres NPC a 20 m con esqueleto en N2 (${String(conEsqueletoEnN2)}); al bajar a N0 no hay un solo fotograma sin pintarlos, y acaban en el rebaño (${String(enRebano)})`,
    conEsqueletoEnN2 === 3 && huecos === 0 && enRebano === 3,
    { conEsqueletoEnN2, huecos, enRebano },
  );
  d8.liberar();
}

paso('Un cuerpo que se suelta no se desecha hasta que otro se ha pintado: el programa de los personajes no se enlaza dos veces');
{
  /*
   * three tira el programa de sombreado de un material en cuanto se desecha el último material que lo usa.
   * Entre noches no queda nadie, y sin cuerpo propio en N0 puede no quedar ningún cuerpo con esqueleto: si el
   * material del último se desechaba, `personaje-quiebro` (85 KB de fragmento) se volvía a compilar y
   * enlazar con el mismo fuente al volver alguien (revisión de rendimiento del 24-sep: 9 veces en 18
   * minutos, una con una tarea de 78 ms). Se cuenta en qué fotograma se suelta cada cuerpo y en cuál se
   * desecha su material: un NPC que cambia de figura (un número de entidad que se reutiliza), el paso de N2
   * a N0 con tres NPC a 20 m, luego sin nadie, luego con alguien otra vez, y al liberar el director.
   */
  const d9 = new DirectorDeLosPersonajes(reparto, (a) => join(RECURSOS, a), lectorDeNode);
  const yo = cuerpoDePrueba(1, 'desvelado', 0);
  const lejos: CuerpoPintado[] = [16, 17, 18].map((id, k) => ({ ...cuerpoDePrueba(id, id === 18 ? 'tirador' : 'celador', k), color: null, x: -3 + k * 3, z: -20 }));
  const todos = [yo, ...lejos];
  const lista: CuerpoPintado[] = [...todos];
  const fuente = fuenteDe(lista, 1);
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 400);
  cam.position.set(0, 1.7, 3);
  cam.lookAt(0, 1, -20);
  cam.updateMatrixWorld();
  type Cuerpo = NonNullable<ReturnType<typeof d9.cuerpo>>;
  let n = 0;
  const idDe = new Map<Cuerpo, number>();
  const soltadoEn = new Map<Cuerpo, number>();
  const desechadoEn = new Map<Cuerpo, number>();
  /* Cuántas veces un número estrenó cuerpo en el mismo fotograma en que soltó el suyo. */
  let rehechos = 0;
  let t = 300000;
  const fotograma = (nivel: Nivel): void => {
    n++;
    t += 16.7;
    d9.fotograma(fuente, nivel, null, cam, t, (v) => v);
    for (const c of todos) {
      const cu = d9.cuerpo(c.id);
      if (cu === null || idDe.has(cu)) continue;
      idDe.set(cu, c.id);
      let material: THREE.Material | null = null;
      cu.raiz.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (material === null && m instanceof THREE.Material) material = m;
      });
      (material as THREE.Material | null)?.addEventListener('dispose', () => {
        if (!desechadoEn.has(cu)) desechadoEn.set(cu, n);
      });
    }
    for (const [cu, id] of idDe) {
      if (soltadoEn.has(cu) || d9.cuerpo(id) === cu) continue;
      soltadoEn.set(cu, n);
      if (d9.cuerpo(id) !== null) rehechos++;
    }
  };
  for (let k = 0; k < 6000 && !(lejos.every((c) => d9.cuerpo(c.id) !== null) && d9.medida.porHornear === 0 && k > 60); k++) {
    fotograma(2);
    if (k % 3 === 0) await esperarUnPoco(2);
  }
  const enN2 = lejos.filter((c) => d9.cuerpo(c.id) !== null).length;
  /* El Celador 16 pasa a ser otro (otra silueta): su cuerpo se suelta y se rehace en el mismo fotograma. */
  const antesDeCambiar = d9.cuerpo(16);
  (lejos[0] as CuerpoPintado).variante = 1;
  for (let k = 0; k < 1500 && d9.cuerpo(16) === antesDeCambiar; k++) {
    fotograma(2);
    if (k % 3 === 0) await esperarUnPoco(2);
  }
  fotograma(2);
  for (let k = 0; k < 90; k++) {
    fotograma(0);
    if (k % 3 === 0) await esperarUnPoco(2);
  }
  const soltadosConGente = soltadoEn.size;
  const mismoFotograma = [...soltadoEn].filter(([cu, s]) => desechadoEn.get(cu) === s).length;
  const sinDesechar = [...soltadoEn].filter(([cu, s]) => s < n && !desechadoEn.has(cu)).length;
  /* Sin nadie: se suelta todo, y el último se guarda sin desechar (su material tiene el programa). */
  lista.length = 0;
  for (let k = 0; k < 600 && !(todos.every((c) => d9.cuerpo(c.id) === null) && k > 10); k++) fotograma(0);
  for (let k = 0; k < 10; k++) fotograma(0);
  const guardados = d9.soltadosSinDesechar;
  const quedanSinDesechar = [...soltadoEn].filter(([cu]) => !desechadoEn.has(cu)).length;
  const todosSueltos = todos.every((c) => d9.cuerpo(c.id) === null);
  /* Vuelve alguien: en cuanto se ha pintado, el guardado se desecha. */
  lista.push(yo);
  for (let k = 0; k < 400 && d9.cuerpo(1) === null; k++) {
    fotograma(0);
    if (k % 3 === 0) await esperarUnPoco(2);
  }
  fotograma(0);
  fotograma(0);
  const trasVolver = d9.soltadosSinDesechar;
  const soltados = soltadoEn.size;
  const desechadosAntesDeLiberar = [...soltadoEn].filter(([cu]) => desechadoEn.has(cu)).length;
  d9.liberar();
  const alLiberar = [...idDe.keys()].filter((cu) => !desechadoEn.has(cu)).length;
  comprobar(
    `un cuerpo soltado se desecha al fotograma siguiente, nunca en el mismo (${String(soltadosConGente)} soltados con gente delante, ${String(rehechos)} de ellos rehechos en el acto al cambiar de figura); sin nadie, el último se guarda sin desechar hasta que alguien se pinta; y al liberar el director no queda ninguno`,
    enN2 === 3 && rehechos >= 1 && soltadosConGente >= 4 && mismoFotograma === 0 && sinDesechar === 0 && todosSueltos && guardados === 1 && quedanSinDesechar === 1 && trasVolver === 0 && desechadosAntesDeLiberar === soltados && alLiberar === 0 && d9.soltadosSinDesechar === 0,
    { enN2, rehechos, soltadosConGente, mismoFotograma, sinDesechar, todosSueltos, guardados, quedanSinDesechar, trasVolver, soltados, desechadosAntesDeLiberar, alLiberar },
  );
}


paso('El director pinta la gente de la ciudad que le da la fuente del juego, y nunca más de 64');
{
  /*
   * El juego da su gente por la fuente (`genteDeLaNoche`, lo que hace `red/partida.ts`); el barrio que le
   * pasa `CuerposDelQuiebro.tsx` es entonces `null`. Sin eso el director no pintaba a nadie en la ciudad.
   */
  const noche = NOCHES_DE_LA_CIUDAD[0] as NocheDeLaCiudad;
  const gente = genteDeLaCiudad(noche);
  const plaza = noche.ciudad.plazas[0]?.centro ?? { x: 0, z: 0 };
  const lista: CuerpoPintado[] = [{ ...cuerpoDePrueba(1, 'desvelado', 0), x: plaza.x, z: plaza.z + 20 }];
  let tic = 7000;
  const prestados = new Set<number>();
  const conGente = { cuerpos: () => lista, prestados: () => prestados, ticDeLosDurmientes: () => tic, yo: () => 1, genteDeLaNoche: () => gente };
  const sinGente: FuenteDeCuerpos = { cuerpos: () => lista, prestados: () => prestados, ticDeLosDurmientes: () => tic, yo: () => 1 };
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 400);
  cam.position.set(plaza.x, 30, plaza.z + 45);
  cam.lookAt(plaza.x, 0, plaza.z);
  cam.updateMatrixWorld();
  const pintar = async (fuente: FuenteDeCuerpos, n: number): Promise<{ maximo: number; ultimo: number }> => {
    const d = new DirectorDeLosPersonajes(reparto, (a) => join(RECURSOS, a), lectorDeNode);
    let t = 200000;
    let maximo = 0;
    for (let k = 0; k < n; k++) {
      t += 1000 / 60;
      tic += 1 / 3;
      d.fotograma(fuente, 0, null, cam, t, (v) => v);
      maximo = Math.max(maximo, d.medida.multitud);
      if (k % 4 === 0) await esperarUnPoco(2);
    }
    const ultimo = d.medida.multitud;
    d.liberar();
    return { maximo, ultimo };
  };
  const con = await pintar(conGente, 900);
  const sin = await pintar(sinGente, 120);
  comprobar(
    `con la gente de la ciudad en la fuente (y el barrio nulo) se pinta la multitud: ${String(con.maximo)} a la vez como mucho, de ${String(DURMIENTES_PINTADOS_COMO_MUCHO)}; sin gente ni barrio, nadie`,
    con.maximo > 16 && con.maximo <= DURMIENTES_PINTADOS_COMO_MUCHO && sin.maximo === 0,
    { con, sin },
  );
}

paso('Sin asignar por fotograma (lo que asigna el código de los personajes, sin contar el mezclador de three)');
{
  /*
   * Con el perfil de muestreo de V8 (en el propio proceso): se cuenta lo que se asigna mientras corre
   * `fotograma`, salvo lo que asigna three por su cuenta (su `AnimationMixer` pide unos 5 KiB por
   * esqueleto y fotograma, y eso no es de aquí). La primera versión pedía ~430 KiB por fotograma en N0.
   */
  const { Session } = await import('node:inspector/promises');
  const sesion = new Session();
  sesion.connect();
  await sesion.post('HeapProfiler.enable');
  const medirBytes = async (paso: () => void, n: number): Promise<number> => {
    await sesion.post('HeapProfiler.startSampling', { samplingInterval: 256, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    for (let k = 0; k < n; k++) paso();
    const { profile } = (await sesion.post('HeapProfiler.stopSampling')) as { profile: { head: NodoDelPerfil } };
    let bytes = 0;
    const recorrer = (nodo: NodoDelPerfil, deThree: boolean, dentro: boolean): void => {
      const url = nodo.callFrame.url;
      const esThree = /three\/build|three\\build/.test(url);
      const esNuestro = /personajes|verificar-quiebro-personajes/.test(url);
      /* La primera función con fichero decide de quién es lo asignado debajo de ella. */
      const three = url === '' ? deThree : esThree;
      const nuestro = dentro || esNuestro;
      if (nodo.selfSize > 0 && nuestro && !three) bytes += nodo.selfSize;
      for (const h of nodo.children) recorrer(h, three, nuestro);
    };
    recorrer(profile.head, false, false);
    return bytes / n;
  };
  interface NodoDelPerfil {
    readonly callFrame: { readonly url: string; readonly functionName: string };
    readonly selfSize: number;
    readonly children: readonly NodoDelPerfil[];
  }
  /*
   * Los topes: N0 16 KiB y N2 28 KiB (medido: unos 10 y 20; lo que queda son sobre todo números que
   * V8 encajona al devolverlos, y en N2 los cuerpos que se crean cuando un durmiente entra entre los
   * ocho más cercanos). La primera versión eran 430 y 570.
   */
  const TOPE_DE_BYTES: Readonly<Record<0 | 2, number>> = { 0: 16 * 1024, 2: 28 * 1024 };
  /*
   * Y en la ciudad abierta (N0), con la gente de la ciudad en la fuente: elegir a los 64 de entre unos
   * 630 una vez por tic no tiene que asignar más que pintar a los 48 del barrio.
   */
  const gentePorNivel: Readonly<Record<string, GenteDeLaNoche | null>> = { '0': null, '2': null, ciudad: genteDeLaCiudad(NOCHES_DE_LA_CIUDAD[0] as NocheDeLaCiudad) };
  for (const vuelta of ['0', '2', 'ciudad'] as const) {
    const nivel = vuelta === '2' ? 2 : 0;
    const genteDeLaVuelta = gentePorNivel[vuelta] ?? null;
    const d7 = new DirectorDeLosPersonajes(reparto, (a) => join(RECURSOS, a), lectorDeNode);
    const lista: CuerpoPintado[] = [];
    for (let id = 1; id <= 6; id++) lista.push(cuerpoDePrueba(id, 'desvelado', id % 3));
    for (let k = 0; k < 5; k++) lista.push({ ...cuerpoDePrueba(16 + k, 'celador', k), color: null });
    for (let k = 0; k < 3; k++) lista.push({ ...cuerpoDePrueba(21 + k, 'tirador', k), color: null });
    for (let k = 0; k < 6; k++) lista.push({ ...cuerpoDePrueba(24 + k, 'prestado', k * 7), color: null });
    const prestados = new Set([0, 7, 14, 21, 28, 35]);
    let tic = 5000;
    const fuente: FuenteDeCuerpos =
      genteDeLaVuelta === null
        ? { cuerpos: () => lista, prestados: () => prestados, ticDeLosDurmientes: () => tic, yo: () => 1 }
        : ({ cuerpos: () => lista, prestados: () => prestados, ticDeLosDurmientes: () => tic, yo: () => 1, genteDeLaNoche: () => genteDeLaVuelta } as FuenteDeCuerpos);
    const gestos: readonly Gesto[] = ['correr', 'trotar', 'andar', 'reposo', 'guardia', 'entrada', 'seguida-1', 'tocado', 'quiebro'];
    const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 400);
    cam.position.set(0, 1.7, 0.01);
    cam.lookAt(0, 1.1, -20);
    cam.updateMatrixWorld();
    let t = 100000;
    const mover = (): void => {
      lista.forEach((c, i) => {
        const r = 3 + i * 1.6;
        const a = (t / 1000) * (4 / r) + i;
        c.x = Math.cos(a) * r;
        c.z = Math.sin(a) * r;
        c.rumbo = Math.atan2(-Math.sin(a), -Math.cos(a));
        c.velocidad = 4;
        const gesto = gestos[Math.floor((t / 1500 + i) % gestos.length)] as Gesto;
        if (c.gesto !== gesto) {
          c.gesto = gesto;
          c.gestoDesdeMs = t;
          c.impactoMs = gesto === 'entrada' || gesto === 'seguida-1' ? t + 350 : null;
          c.direccionDelGesto = gesto === 'quiebro' ? c.rumbo + (i % 2 === 1 ? 1.5 : -1.5) : null;
        }
      });
    };
    const paso = (): void => {
      t += 1000 / 60;
      tic += 1 / 3;
      mover();
      d7.fotograma(fuente, nivel, genteDeLaVuelta === null ? noche2 : null, cam, t, (v) => v);
    };
    for (let k = 0; k < 2400; k++) {
      paso();
      if (k % 3 === 0) await esperarUnPoco(2);
    }
    for (let k = 0; k < 600; k++) paso();
    const basura: unknown[] = [];
    const juezDeLaMemoria = async (p: () => void): Promise<{ bien: boolean; detalle?: unknown }> => {
      const b = await medirBytes(p, 600);
      return { bien: b < TOPE_DE_BYTES[nivel], detalle: `${(b / 1024).toFixed(1)} KiB por fotograma` };
    };
    const v = await juezDeLaMemoria(paso);
    const deQue = genteDeLaVuelta === null ? 'la multitud' : 'la multitud de la CIUDAD (64 de unos 630)';
    comprobar(`N${String(nivel)} con 20 cuerpos cambiando de gesto y ${deQue}: el código de los personajes asigna menos de ${String(TOPE_DE_BYTES[nivel] / 1024)} KiB por fotograma`, v.bien, v.detalle);
    nota(`N${String(nivel)}${genteDeLaVuelta === null ? '' : ' (ciudad)'}: ${String(v.detalle)} (sin contar el mezclador de three)`);
    const e = await juezDeLaMemoria(() => {
      paso();
      basura.push(new Array(4000).fill(0));
      if (basura.length > 50) basura.length = 0;
    });
    comprobar(`la vacuna «32 KiB más por fotograma» sale roja en N${String(nivel)}${genteDeLaVuelta === null ? '' : ' con la ciudad'} (el juez de la memoria mira)`, !e.bien, e.detalle);
    d7.liberar();
  }
  sesion.disconnect();
}

director.liberar();
terminar(171);
