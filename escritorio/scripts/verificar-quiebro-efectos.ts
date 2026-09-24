/**
 * ¿LA FIRMA VISUAL DEL QUIEBRO DICE LO QUE PROMETE? La Grafía, el reloj del Remanso, el anillo que se
 * lee y el presupuesto de los efectos, comprobados sin navegador.
 *
 *   npx tsx scripts/verificar-quiebro-efectos.ts        (desde escritorio/)
 *
 * ═══ QUÉ AFIRMA ═══
 *
 *   1. LA GRAFÍA es un alfabeto y no ruido: 48 glifos de 5×7, ninguno vacío, todos distintos,
 *      ninguno igual a su espejo ni al espejo de otro, separados al menos 3 puntos entre sí y 4 de
 *      cualquier cifra (o su espejo), y hechos de los signos del español. El atlas que se sube a la GPU
 *      dice lo mismo que los dibujos, en su sitio y del derecho.
 *   2. EL RELOJ DE PRESENTACIÓN recupera EXACTAMENTE el tiempo que el Remanso quita (315 ms), sin
 *      saltos en las costuras, sin adelantarse nunca al verdadero, y el verdadero no se toca.
 *   3. LAS SEÑALES DE JUEGO van en el reloj verdadero: el anillo se cierra en el impacto exacto, la
 *      bala está donde dice la tabla de rumbos, y las piezas que las pintan leen `ahora.verdadero`.
 *   4. EL ANILLO SE LEE A 20 m en la pantalla más pobre de N0.
 *   5. EL PRESUPUESTO por nivel cabe en la parte de la escena que toca a los efectos, lo que es de
 *      juego no cambia con el nivel, y los triángulos que se declaran son los de la geometría que se
 *      monta DE VERDAD (construida aquí con three, sin GPU).
 *   6. EL SISTEMA de ranuras no confunde un anillo viejo con uno nuevo, no crece, y siembra igual.
 *
 * ═══ CÓMO SE SABE QUE MIRA ═══
 *
 * Cada juez es una función que recibe lo que juzga, y se aplica dos veces: a lo de verdad (tiene que
 * dar verde) y a una copia envenenada (tiene que dar rojo). Las VACUNAS de abajo son esas copias:
 * un alfabeto con un duplicado, con un glifo simétrico o con un siete; un reloj que recupera con
 * ×1,59; un anillo que no crece de lejos; un presupuesto que quita anillos en N0. Si un juez dejara
 * de mirar, su vacuna se pondría verde y el guion rojo.
 *
 * Además, cada comprobación se vio roja rompiendo el producto en una copia y restaurándolo (el
 * informe del frente «efectos» dice cuáles y cómo).
 *
 * ═══ POR QUÉ NO USA `server/scripts/arnes.ts` ═══
 *
 * Porque `verify:fronteras` prohíbe, con razón, que `escritorio/` importe de `server/`. Se copia la
 * forma del arnés —las mismas salidas: 0 verde, 1 rojo, 2 bloque saltado, 3 reventado— en veinte
 * líneas.
 */
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import {
  ALTO_DEL_GLIFO,
  ALTO_DEL_ATLAS,
  ANCHO_DEL_ATLAS,
  ANCHO_DEL_GLIFO,
  GLIFOS_EN_LA_GRAFIA,
  GRAFIA,
  bitsDeLaFila,
  byteEnElPunto,
  distanciaA,
  espejoDe,
  filasDelDibujo,
  pixelesDelAtlas,
  puntoEncendido,
  puntosDistintos,
  tintaDe,
} from '../src/quiebro/efectos/grafia';
import type { Glifo } from '../src/quiebro/efectos/grafia';
import {
  DURACION_DEL_REMANSO_MS,
  FRENADA_MS,
  RECUPERACION_MS,
  RETRASO_MAXIMO_MS,
  crearRelojDePresentacion,
  retrasoDeUnRemanso,
} from '../src/quiebro/efectos/reloj';
import type { RelojDePresentacion } from '../src/quiebro/efectos/reloj';
import {
  BIS_MS,
  RADIO_FINAL_DEL_ANILLO,
  RADIO_INICIAL_DEL_ANILLO,
  SALIDA_MS,
  anilloEnPantalla,
  balaAcabada,
  bisEn,
  columnasDelCielo,
  desalojoEn,
  direccionDelRumbo,
  dondeCaeLaEsquirla,
  edadDeLaOnda,
  escalaDeLectura,
  grosorDeLectura,
  impresionEn,
  progresoDelAnuncio,
  pxPorMetroA1m,
  radioDelAnillo,
  recorridoDeLaBala,
  salidaEn,
  trasvaseEn,
} from '../src/quiebro/efectos/cuentas';
import type { BalaDeEfecto } from '../src/quiebro/efectos/cuentas';
import {
  NIVELES,
  PIEZAS,
  TRIANGULOS_DE_LA_FORMA,
  capacidadDe,
  gastoDelNivel,
  instanciasDe,
  topeDeLosEfectos,
} from '../src/quiebro/efectos/presupuesto';
import type { Nivel, RenglonDePieza } from '../src/quiebro/efectos/presupuesto';
import { geometriaDeLaPieza, triangulosDe } from '../src/quiebro/efectos/geometrias';
import { FUENTES_DE_LAS_FAMILIAS, materialDe } from '../src/quiebro/efectos/materiales';
import { Anillos, crearSistemaDeEfectos } from '../src/quiebro/efectos/sistema';

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
  console.log(`\n✔ ${hechas} comprobaciones. La Grafía es un alfabeto, el Remanso devuelve lo que quita y los efectos caben.`);
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

/*
 * ═══ LO QUE SE EXIGE, ESCRITO AQUÍ Y NO LEÍDO DEL PRODUCTO ═══
 *
 * Un juez que lee su vara del mismo fichero que juzga se deja engañar por él. La campaña de
 * mutaciones lo enseñó dos veces: bajar el espacio entre Remansos a 1 s en `reloj.ts` pasaba en verde
 * porque este guion leía la misma constante, y quitar la cedilla de la Grafía Y de la lista de signos
 * de `grafia.ts` también. Así que lo que pide el diseño se copia aquí, con su párrafo al lado, y el
 * producto se mide contra esto.
 */
const EXIGE = {
  /** §1: la eñe, las dos aperturas, la cedilla, la virgulilla y las tildes. */
  signos: ['ñ', '¿', '¡', 'ç', '~', '´'] as const,
  /** §1: «la cedilla partida», con su nombre. */
  cedillaPartida: 'cedilla-partida',
  /** §4.4: «como mucho hay un efecto de Remanso cada 2,0 s». */
  espacioEntreRemansosMs: 2000,
  /** §4.6: alcance de 30 m. */
  alcanceDeLaBala: 30,
  /** La pantalla más pobre de N0 (§7 y §8): 360 puntos de alto, densidad 0,75, 75° de campo. */
  pantalla: { altoCss: 360, dpr: 0.75, fovGrados: 75 },
  /** El encargo: el anillo se lee a 20 m. Radio final, trazo y recorrido mínimos en píxeles del búfer. */
  distanciaDeLectura: 20,
  radioFinalPx: 12,
  trazoPx: 2,
  recorridoPx: 20,
  /** §4.8: la impresión tarda 1,2 s y el Trasvase 0,6 s. */
  impresionMs: 1200,
  trasvaseMs: 600,
  /** §8: el cielo de Grafía vive «tras la niebla»: el barrio mide 156 m de lado. */
  cieloDesde: 170,
  /** §8: topes provisionales de la escena entera, N0 a N3. */
  escena: [
    { triangulos: 150_000, llamadas: 60 },
    { triangulos: 250_000, llamadas: 90 },
    { triangulos: 600_000, llamadas: 150 },
    { triangulos: 1_500_000, llamadas: 250 },
  ],
  /** Lo que se pueden llevar los efectos con todo encendido: 5 % de triángulos, 20 % de llamadas. */
  parte: { triangulos: 0.05, llamadas: 0.2 },
} as const;

/** El tope de los efectos en un nivel, con los números de aquí. */
function topeExigido(n: Nivel): { triangulos: number; llamadas: number } {
  const e = EXIGE.escena[n];
  return { triangulos: Math.floor(e.triangulos * EXIGE.parte.triangulos), llamadas: Math.floor(e.llamadas * EXIGE.parte.llamadas) };
}

/** Un código sin comentarios, para las reglas de fuente: un comentario que cita la regla no la rompe. */
function soloCodigo(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/* ─────────────────────────────── 1. La Grafía ─────────────────────────────── */

/** Cifras de 5×7 de referencia, dibujadas aquí: la Grafía no se puede parecer a ninguna ni a su espejo. */
const CIFRAS: readonly string[] = [
  '.###. #...# #..## #.#.# ##..# #...# .###.',
  '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  '.###. #...# ....# ...#. ..#.. .#... #####',
  '##### ...#. ..#.. ...#. ....# #...# .###.',
  '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  '##### #.... ####. ....# ....# #...# .###.',
  '..##. .#... #.... ####. #...# #...# .###.',
  '##### ....# ...#. ..#.. .#... .#... .#...',
  '.###. #...# #...# .###. #...# #...# .###.',
  '.###. #...# #...# .#### ....# ...#. .##..',
];
const filasDeCifra = (d: string): number[] => filasDelDibujo(d).map(bitsDeLaFila);

interface JuicioDeLaGrafia {
  cuantos: number;
  formasMalas: string[];
  vacios: string[];
  nombresRepetidos: string[];
  iguales: string[];
  simetricos: string[];
  espejoDeOtro: string[];
  demasiadoCerca: string[];
  pareceCifra: string[];
  signosQueFaltan: string[];
  propios: number;
  minimo: number;
}

/** EL JUEZ DE LA GRAFÍA. Recibe un alfabeto cualquiera y dice todo lo que tiene mal. */
function juzgarLaGrafia(glifos: readonly Glifo[]): JuicioDeLaGrafia {
  const j: JuicioDeLaGrafia = {
    cuantos: glifos.length,
    formasMalas: [],
    vacios: [],
    nombresRepetidos: [],
    iguales: [],
    simetricos: [],
    espejoDeOtro: [],
    demasiadoCerca: [],
    pareceCifra: [],
    signosQueFaltan: [],
    propios: 0,
    minimo: 99,
  };
  const vistos = new Set<string>();
  for (const g of glifos) {
    if (g.dibujo.length !== ALTO_DEL_GLIFO || g.dibujo.some((f) => !new RegExp(`^[.#]{${ANCHO_DEL_GLIFO}}$`).test(f))) j.formasMalas.push(g.nombre);
    if (g.filas.length !== ALTO_DEL_GLIFO || g.filas.some((f, i) => f !== bitsDeLaFila(g.dibujo[i] ?? ''))) j.formasMalas.push(`${g.nombre} (bits ≠ dibujo)`);
    if (tintaDe(g.filas) < 5) j.vacios.push(g.nombre);
    if (vistos.has(g.nombre)) j.nombresRepetidos.push(g.nombre);
    vistos.add(g.nombre);
    if (puntosDistintos(g.filas, espejoDe(g.filas)) === 0) j.simetricos.push(g.nombre);
    for (const d of CIFRAS) {
      const c = filasDeCifra(d);
      if (Math.min(puntosDistintos(g.filas, c), puntosDistintos(g.filas, espejoDe(c))) < 4) j.pareceCifra.push(g.nombre);
    }
    if (g.de === 'propio') j.propios++;
  }
  for (let a = 0; a < glifos.length; a++) {
    for (let b = 0; b < glifos.length; b++) {
      if (a === b) continue;
      const ga = glifos[a] as Glifo;
      const gb = glifos[b] as Glifo;
      const d = puntosDistintos(ga.filas, gb.filas);
      const e = puntosDistintos(ga.filas, espejoDe(gb.filas));
      if (a < b && d === 0) j.iguales.push(`${ga.nombre}=${gb.nombre}`);
      if (e === 0) j.espejoDeOtro.push(`${ga.nombre}=espejo(${gb.nombre})`);
      const m = Math.min(d, e);
      if (a < b) j.minimo = Math.min(j.minimo, m);
      if (a < b && m < 3) j.demasiadoCerca.push(`${ga.nombre}~${gb.nombre}:${m}`);
    }
  }
  for (const s of EXIGE.signos) if (!glifos.some((g) => g.de === s)) j.signosQueFaltan.push(s);
  if (!glifos.some((g) => g.nombre === EXIGE.cedillaPartida && g.de === 'ç')) j.signosQueFaltan.push('la cedilla partida');
  return j;
}

/** ¿El juicio da un alfabeto bueno? Todo vacío, 48, y los propios en minoría (uno de cada seis como mucho). */
function grafiaBuena(j: JuicioDeLaGrafia): boolean {
  return (
    j.cuantos === GLIFOS_EN_LA_GRAFIA &&
    j.formasMalas.length === 0 &&
    j.vacios.length === 0 &&
    j.nombresRepetidos.length === 0 &&
    j.iguales.length === 0 &&
    j.simetricos.length === 0 &&
    j.espejoDeOtro.length === 0 &&
    j.demasiadoCerca.length === 0 &&
    j.pareceCifra.length === 0 &&
    j.signosQueFaltan.length === 0 &&
    j.propios * 6 <= j.cuantos
  );
}

const glifoDe = (nombre: string, de: Glifo['de'], dibujo: string): Glifo => {
  const filas = filasDelDibujo(dibujo);
  return { nombre, de, dibujo: filas, filas: filas.map(bitsDeLaFila) };
};

paso('La Grafía: 48 glifos de 5×7, un alfabeto y no ruido');
{
  const j = juzgarLaGrafia(GRAFIA);
  comprobar(`hay ${GLIFOS_EN_LA_GRAFIA} glifos`, j.cuantos === GLIFOS_EN_LA_GRAFIA, j.cuantos);
  comprobar('todos son de 7 filas de 5 puntos, y sus bits dicen lo mismo que su dibujo', j.formasMalas.length === 0, j.formasMalas);
  comprobar('ninguno está vacío: al menos 5 puntos de tinta', j.vacios.length === 0, j.vacios);
  comprobar('cada uno tiene su nombre, y ninguno se repite', j.nombresRepetidos.length === 0, j.nombresRepetidos);
  comprobar('ninguno es igual a otro', j.iguales.length === 0, j.iguales);
  comprobar('ninguno es igual a su propio espejo (ningún glifo simétrico)', j.simetricos.length === 0, j.simetricos);
  comprobar('ninguno es igual al espejo de otro (no hay pares reflejados)', j.espejoDeOtro.length === 0, j.espejoDeOtro);
  comprobar('dos glifos cualesquiera (o uno y el espejo de otro) difieren en 3 puntos o más', j.demasiadoCerca.length === 0, j.demasiadoCerca);
  comprobar('ninguno se parece a una cifra de 5×7 ni a su espejo (4 puntos o más de diferencia)', j.pareceCifra.length === 0, j.pareceCifra);
  comprobar(`están los signos del español (${EXIGE.signos.join(' ')}) y la cedilla partida`, j.signosQueFaltan.length === 0, j.signosQueFaltan);
  comprobar('los trazos propios son minoría (uno de cada seis como mucho)', j.propios * 6 <= j.cuantos, j.propios);
  nota(`separación mínima entre glifos: ${String(j.minimo)} puntos; trazos propios: ${String(j.propios)}`);

  /* VACUNAS: el juez ve cada veneno. */
  const con = (i: number, g: Glifo): Glifo[] => GRAFIA.map((x, k) => (k === i ? g : x));
  const primero = GRAFIA[0] as Glifo;
  const simetrico = glifoDe('simetrico', 'ñ', '#...# ##.## #.#.# #...# #...# #...# #...#');
  const siete = glifoDe('siete', '´', '##### ....# ...#. ..#.. .#... .#... .#...');
  const vacio = glifoDe('vacio', 'ç', '..... ..... ..#.. ..... ..... ..... .....');
  const espejado = glifoDe('espejado', 'ñ', primero.dibujo.map((f) => [...f].reverse().join('')).join(' '));
  const envenenados: readonly [string, Glifo[]][] = [
    ['un duplicado', con(5, { ...primero, nombre: 'copia' })],
    ['un glifo simétrico', con(5, simetrico)],
    ['el espejo de otro', con(5, espejado)],
    ['un siete', con(5, siete)],
    ['un glifo casi vacío', con(5, vacio)],
    ['47 glifos', GRAFIA.slice(1)],
    ['sin ninguna cedilla', GRAFIA.map((g) => (g.de === 'ç' ? { ...g, de: 'propio' as const } : g))],
  ];
  const ciegos = envenenados.filter(([, a]) => grafiaBuena(juzgarLaGrafia(a))).map(([que]) => que);
  comprobar('VACUNA: el juez de la Grafía ve un duplicado, un simétrico, un espejo, un siete, uno vacío, uno de menos y un signo que falta', ciegos.length === 0, ciegos);
}

paso('El atlas: lo que sube a la GPU dice lo mismo que los dibujos, en su sitio y del derecho');
{
  const t0 = performance.now();
  const atlas = pixelesDelAtlas();
  const ms = performance.now() - t0;
  comprobar(
    `el atlas mide ${String(ANCHO_DEL_ATLAS)}×${String(ALTO_DEL_ATLAS)} en RGBA`,
    atlas.ancho === ANCHO_DEL_ATLAS && atlas.alto === ALTO_DEL_ATLAS && atlas.datos.length === ANCHO_DEL_ATLAS * ALTO_DEL_ATLAS * 4,
    { ancho: atlas.ancho, alto: atlas.alto, bytes: atlas.datos.length },
  );
  /* En el centro de cada punto, los tres canales dicen «encendido» si y sólo si el dibujo lo dice. */
  const malos: string[] = [];
  GRAFIA.forEach((g, i) => {
    for (let y = 0; y < ALTO_DEL_GLIFO; y++) {
      for (let x = 0; x < ANCHO_DEL_GLIFO; x++) {
        const on = puntoEncendido(g.filas, x, y);
        for (const canal of [0, 1, 2] as const) {
          const b = byteEnElPunto(atlas, i, x, y, canal);
          if (on !== b > 128) malos.push(`${g.nombre}(${String(x)},${String(y)}) canal ${String(canal)}: ${String(b)}`);
        }
      }
    }
  });
  comprobar('en el centro de cada punto de cada glifo, los tres canales dicen encendido si y sólo si el dibujo lo dice', malos.length === 0, malos.slice(0, 12));
  /*
   * DEL DERECHO, con cuentas escritas aquí y no con las de `byteEnElPunto` (si las dos se volvieran
   * del revés a la vez, el anterior seguiría verde y los glifos saldrían boca abajo). La celda del
   * glifo 0 es la de ARRIBA a la izquierda: sus filas de textura van de 320 a 383, y su fila 0 del
   * dibujo ocupa las filas 372-379 (el margen es de 4 y el paso de 8). `ene` empieza `.##.#`.
   */
  const cobertura = (x: number, fila: number): number => atlas.datos[(fila * ANCHO_DEL_ATLAS + x) * 4 + 2] ?? -1;
  const ene = GRAFIA[0] as Glifo;
  comprobar(
    'del derecho: la primera fila del primer glifo está arriba del todo en la textura (`.##.#` en las filas 372-379, y `#...#` abajo en las 324-331)',
    ene.nombre === 'ene' &&
      cobertura(8, 375) === 0 &&
      cobertura(16, 375) === 255 &&
      cobertura(24, 375) === 255 &&
      cobertura(32, 375) === 0 &&
      cobertura(40, 375) === 255 &&
      cobertura(8, 327) === 255 &&
      cobertura(16, 327) === 0 &&
      cobertura(40, 327) === 255,
    [cobertura(8, 375), cobertura(16, 375), cobertura(8, 327), cobertura(16, 327)],
  );
  /* Los márgenes: fuera de la letra el campo baja del borde (128), y en la esquina de la celda es 0. */
  const esquinas: string[] = [];
  for (let i = 0; i < GLIFOS_EN_LA_GRAFIA; i++) {
    const cx = (i % 8) * 48;
    const cy = (5 - Math.floor(i / 8)) * 64;
    for (const canal of [0, 1, 2]) {
      const b = atlas.datos[(cy * ANCHO_DEL_ATLAS + cx) * 4 + canal] ?? 255;
      if (b !== 0) esquinas.push(`${String(i)}:${String(canal)}=${String(b)}`);
    }
  }
  comprobar('en la esquina de cada celda los tres canales valen 0: el halo de un glifo no se asoma al vecino', esquinas.length === 0, esquinas.slice(0, 10));
  /* Un perfil: desde el centro de un punto encendido hacia fuera el campo de los trazos no sube nunca. */
  const perfil: number[] = [];
  const palo = GRAFIA.findIndex((g) => g.nombre === 'cierra-pie');
  if (palo >= 0) {
    /* Su fila 2 es `..#..`: punto encendido en la columna 2, con la 3 y la 4 apagadas. */
    const fila = (5 - Math.floor(palo / 8)) * 64 + 4 + (ALTO_DEL_GLIFO - 1 - 2) * 8 + 4;
    const x0 = (palo % 8) * 48 + 4 + 2 * 8 + 4;
    for (let dx = 0; dx <= 12; dx++) perfil.push(atlas.datos[(fila * ANCHO_DEL_ATLAS + x0 + dx) * 4] ?? -1);
  }
  comprobar(
    'el campo de los trazos baja sin subir del centro de un punto hacia el hueco, y cruza el borde (128) a medio paso',
    perfil.length === 13 && perfil.every((v, k) => k === 0 || v <= (perfil[k - 1] as number)) && (perfil[0] as number) > 128 && (perfil[12] as number) < 128,
    perfil,
  );
  const otra = pixelesDelAtlas();
  comprobar('el atlas es determinista: dos veces, los mismos bytes', Buffer.compare(Buffer.from(atlas.datos), Buffer.from(otra.datos)) === 0);
  /* La transformada de distancia contra la fuerza bruta en una máscara pequeña. */
  const ancho = 23;
  const alto = 17;
  const mascara = new Uint8Array(ancho * alto);
  for (let i = 0; i < mascara.length; i++) mascara[i] = (i * 7919) % 13 === 0 || (i % 29 === 3 && i % 5 === 1) ? 1 : 0;
  const rapida = distanciaA(mascara, ancho, alto, 1);
  let peor = 0;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      let mejor = Infinity;
      for (let v = 0; v < alto; v++) for (let u = 0; u < ancho; u++) if (mascara[v * ancho + u] === 1) mejor = Math.min(mejor, Math.hypot(u - x, v - y));
      peor = Math.max(peor, Math.abs(mejor - (rapida[y * ancho + x] as number)));
    }
  }
  comprobar('la transformada de distancia es la exacta: igual a la fuerza bruta en una máscara de prueba', peor < 1e-9, peor);
  nota(`el atlas se genera en ${ms.toFixed(1)} ms en este aparato`);
}

/* ─────────────────────────────── 2. El reloj de presentación ─────────────────────────────── */

/** Un reloj como el de verdad pero que recupera a ×1,59: el veneno de la vacuna. */
function relojQueRecuperaMal(): RelojDePresentacion {
  const bueno = crearRelojDePresentacion();
  let inicio = Number.NaN;
  const retraso = (t: number): number => {
    if (inicio !== inicio || t <= inicio) return 0;
    const e = t - inicio;
    if (e < FRENADA_MS) return e * 0.7;
    if (e < DURACION_DEL_REMANSO_MS) return Math.max(0, RETRASO_MAXIMO_MS - (e - FRENADA_MS) * 0.59);
    return RETRASO_MAXIMO_MS - RECUPERACION_MS * 0.59;
  };
  return {
    ...bueno,
    presentado: (t) => t - retraso(t),
    retraso,
    remansar: (t) => {
      inicio = t;
      return true;
    },
  };
}

interface JuicioDelReloj {
  exacto: boolean;
  sinSaltos: boolean;
  nuncaDelante: boolean;
  monotono: boolean;
  /** El peor fotograma: cuánto avanzó el presentado dividido por lo que avanzó el verdadero. */
  pasoMinimo: number;
  pasoMaximo: number;
}

/** EL JUEZ DEL RELOJ: un Remanso en `inicio` y un barrido fino alrededor. */
function juzgarElReloj(reloj: RelojDePresentacion, inicio: number): JuicioDelReloj {
  reloj.remansar(inicio);
  const fin = inicio + DURACION_DEL_REMANSO_MS;
  let exacto = true;
  for (const t of [fin, fin + 0.25, fin + 1, fin + 1000, fin + 123456.789]) if (reloj.presentado(t) !== t) exacto = false;
  let sinSaltos = true;
  for (const b of [inicio, inicio + FRENADA_MS, fin]) {
    const e = 1e-6;
    if (Math.abs(reloj.presentado(b + e) - reloj.presentado(b - e)) > 1e-5) sinSaltos = false;
  }
  let nuncaDelante = true;
  let monotono = true;
  let antes = reloj.presentado(inicio - 50);
  /*
   * Fotogramas de 60 Hz: en cada uno el presentado avanza entre 0,3 y 1,6 veces lo que avanzó el
   * verdadero. Un salto (un tramo que no empalma, una recuperación que devuelve de golpe lo que no
   * devolvió poco a poco) sale aquí como un fotograma que avanzó de más.
   */
  let pasoMinimo = Infinity;
  let pasoMaximo = 0;
  const paso = 1000 / 60;
  let tAntes = inicio - 50;
  for (let t = inicio - 50 + paso; t <= inicio + 2500; t += paso) {
    const p = reloj.presentado(t);
    if (p > t + 1e-9 || t - p > RETRASO_MAXIMO_MS + 1e-9) nuncaDelante = false;
    if (p < antes - 1e-9) monotono = false;
    const razon = (p - antes) / (t - tAntes);
    pasoMinimo = Math.min(pasoMinimo, razon);
    pasoMaximo = Math.max(pasoMaximo, razon);
    antes = p;
    tAntes = t;
  }
  return { exacto, sinSaltos, nuncaDelante, monotono, pasoMinimo, pasoMaximo };
}

paso('El reloj de presentación: el Remanso devuelve exactamente lo que quita');
{
  comprobar(
    'las cuentas son enteras: 450 ms a ×0,3 dejan 315 atrás, que a ×1,6 se recuperan en 525; en total 975',
    FRENADA_MS === 450 && RETRASO_MAXIMO_MS === 315 && RECUPERACION_MS === 525 && DURACION_DEL_REMANSO_MS === 975,
    { FRENADA_MS, RETRASO_MAXIMO_MS, RECUPERACION_MS, DURACION_DEL_REMANSO_MS },
  );
  const inicio = 12_345_678.901;
  const j = juzgarElReloj(crearRelojDePresentacion(), inicio);
  comprobar('al acabar el Remanso el presentado es EXACTAMENTE el verdadero (con `===`), a 10⁷ ms de sesión', j.exacto);
  comprobar('sin saltos en las tres costuras (al entrar, al pasar a recuperar, al acabar)', j.sinSaltos);
  comprobar('el presentado nunca va por delante del verdadero ni más de 315 ms por detrás', j.nuncaDelante);
  comprobar('el presentado nunca retrocede', j.monotono);
  comprobar(
    'fotograma a fotograma, el presentado avanza entre ×0,3 y ×1,6 de lo que avanza el verdadero: ni se para ni salta',
    j.pasoMinimo >= 0.3 - 1e-9 && j.pasoMaximo <= 1.6 + 1e-9,
    { minimo: j.pasoMinimo, maximo: j.pasoMaximo },
  );
  const r = crearRelojDePresentacion();
  r.remansar(inicio);
  comprobar(
    'el ritmo es 0,3 frenando, 1,6 recuperando y 1 fuera; y el retraso al acabar la frenada es 315',
    r.ritmo(inicio + 10) === 0.3 &&
      r.ritmo(inicio + 449) === 0.3 &&
      r.ritmo(inicio + 451) === 1.6 &&
      r.ritmo(inicio + 974) === 1.6 &&
      r.ritmo(inicio + 976) === 1 &&
      r.ritmo(inicio - 1) === 1 &&
      Math.abs(r.retraso(inicio + FRENADA_MS) - 315) < 1e-9,
  );
  /* La integral del ritmo sobre el Remanso es su duración: 450·0,3 + 525·1,6 = 975. */
  let integral = 0;
  for (let e = 0; e < DURACION_DEL_REMANSO_MS; e += 0.5) integral += r.ritmo(inicio + e + 0.25) * 0.5;
  comprobar('la integral del ritmo durante el Remanso es exactamente su duración (975 ms)', Math.abs(integral - DURACION_DEL_REMANSO_MS) < 1e-6, integral);
  comprobar('el verdadero no se toca nunca: verdadero(t) === t también en pleno Remanso', [inicio + 1, inicio + 300, inicio + 700].every((t) => r.verdadero(t) === t));
  comprobar(
    'uno cada 2,0 s: a 1 999 ms se rechaza y no cambia nada; a 2 000 se acepta',
    r.remansar(inicio + EXIGE.espacioEntreRemansosMs - 1) === false &&
      r.ultimoInicio() === inicio &&
      r.remansar(inicio + EXIGE.espacioEntreRemansosMs) === true &&
      r.ultimoInicio() === inicio + EXIGE.espacioEntreRemansosMs,
  );
  comprobar(
    'con dos Remansos, un instante del primero se sigue contestando bien (el reloj guarda los dos últimos)',
    r.retraso(inicio + 200) === retrasoDeUnRemanso(inicio, inicio + 200) && r.retraso(inicio + 200) > 0,
  );
  comprobar(
    'la intensidad visual es 0 antes, 1 en la frenada y 0 al acabar',
    r.intensidad(inicio - 5) === 0 && r.intensidad(inicio + 300) === 1 && r.intensidad(inicio + DURACION_DEL_REMANSO_MS + 1) === 0,
  );
  const mal = juzgarElReloj(relojQueRecuperaMal(), inicio);
  comprobar('VACUNA: un reloj que recupera a ×1,59 no pasa el juez (le quedan 5 ms sin devolver)', !mal.exacto, mal);
}

/* ─────────────────────────────── 3. Las señales de juego ─────────────────────────────── */

paso('Las señales de juego: el anillo se cierra en el impacto exacto y la bala está donde dice la tabla');
{
  const inicio = 9_876_543.21;
  const impacto = inicio + 550;
  comprobar(
    'el anillo: 0 al anunciarse, 1 EXACTO en el impacto (no antes), y el radio es el final exacto',
    progresoDelAnuncio(inicio, inicio, impacto) === 0 &&
      progresoDelAnuncio(impacto - 0.001, inicio, impacto) < 1 &&
      progresoDelAnuncio(impacto, inicio, impacto) === 1 &&
      progresoDelAnuncio(impacto + 40, inicio, impacto) === 1 &&
      radioDelAnillo(progresoDelAnuncio(impacto, inicio, impacto)) === RADIO_FINAL_DEL_ANILLO &&
      radioDelAnillo(0) === RADIO_INICIAL_DEL_ANILLO,
  );
  let creciente = true;
  let antes = -1;
  for (let t = inicio - 20; t <= impacto + 20; t += 3.3) {
    const p = progresoDelAnuncio(t, inicio, impacto);
    if (p < antes) creciente = false;
    antes = p;
  }
  comprobar('el anillo se cierra sin volver atrás, y lineal: a mitad de camino, mitad de radio', creciente && Math.abs(progresoDelAnuncio(inicio + 275, inicio, impacto) - 0.5) < 1e-9);
  comprobar(
    'un impacto que no va por delante del inicio da un anillo cerrado, no una división por cero ni un NaN',
    progresoDelAnuncio(inicio, inicio, inicio) === 1 && progresoDelAnuncio(inicio - 1, inicio, inicio) === 1 && progresoDelAnuncio(inicio - 1, inicio, inicio - 5) === 1,
  );
  const norte = direccionDelRumbo(0);
  const este = direccionDelRumbo(64);
  comprobar(
    'la bala usa la tabla de rumbos del servidor: 0 es el norte (−z), 64 el este (+x)',
    Math.abs(norte.x) < 1e-9 && Math.abs(norte.z + 1) < 1e-9 && Math.abs(este.x - 1) < 1e-9 && Math.abs(este.z) < 1e-9,
    { norte, este },
  );
  const bala: BalaDeEfecto = { salida: inicio, x: 0, y: 1.35, z: 0, rumbo: 0, fin: null };
  comprobar(
    'a 20 m/s: a los 750 ms lleva 15 m, se para en el alcance (30 m) y con `fin` se para antes',
    Math.abs(recorridoDeLaBala(bala, inicio + 750) - 15) < 1e-9 &&
      recorridoDeLaBala(bala, inicio + 5000) === EXIGE.alcanceDeLaBala &&
      Math.abs(recorridoDeLaBala({ ...bala, fin: inicio + 400 }, inicio + 900) - 8) < 1e-9 &&
      recorridoDeLaBala(bala, inicio - 10) === 0,
  );
  comprobar(
    'la bala se da por acabada cuando se paró y se recogió la estela, no antes',
    !balaAcabada(bala, inicio + 1500) && balaAcabada(bala, inicio + 1500 + 161) && !balaAcabada({ ...bala, fin: inicio + 300 }, inicio + 400) && balaAcabada({ ...bala, fin: inicio + 300 }, inicio + 461),
  );
  comprobar(
    'la primera onda de aire nace cuando la bala pasa por 1,2 m (60 ms) y muere a los 420 ms',
    edadDeLaOnda(bala, 0, inicio + 59) === -1 && Math.abs(edadDeLaOnda(bala, 0, inicio + 70) - 10) < 1e-6 && edadDeLaOnda(bala, 0, inicio + 60 + 421) === -1,
  );
  /*
   * Y LAS PIEZAS LAS PINTAN EN EL RELOJ VERDADERO. Las funciones de arriba no dicen con qué reloj
   * se las llama; esto lo lee en el código que las llama (sin comentarios: el que explica la regla
   * cita la palabra prohibida).
   */
  const leer = (f: string): string => soloCodigo(readFileSync(new URL(`../src/quiebro/efectos/${f}`, import.meta.url), 'utf8'));
  const anillos = leer('anillos.tsx');
  const trazos = leer('trazos.tsx');
  const deTrazos = trazos.slice(trazos.indexOf('export function Trazos'), trazos.indexOf('export function Ondas'));
  const deOndas = trazos.slice(trazos.indexOf('export function Ondas'));
  const parteDeLasBalas = deOndas.slice(0, deOndas.indexOf('const im = sistema.impactos'));
  const verdaderoSolo = (codigo: string): boolean => /sistema\.ahora\.verdadero/.test(codigo) && !/presentado/.test(codigo);
  comprobar(
    'los anillos, el apuntado, las balas y las ondas de las balas leen `ahora.verdadero` y ni mencionan el presentado',
    anillos.length > 0 && deTrazos.length > 0 && parteDeLasBalas.length > 0 && verdaderoSolo(anillos) && verdaderoSolo(deTrazos) && verdaderoSolo(parteDeLasBalas.replace(/const tp = sistema\.ahora\.presentado;/, '')),
  );
  comprobar(
    'VACUNA: el juez de la regla ve un anillo que leyera el presentado',
    !verdaderoSolo(anillos.replace('sistema.ahora.verdadero', 'sistema.ahora.presentado')),
  );
  /* Y en el sistema: lo que es juego guarda el `t` del aparato tal cual, lo que es adorno el presentado. */
  const reloj = crearRelojDePresentacion();
  const sistema = crearSistemaDeEfectos(reloj, 0);
  reloj.remansar(1000);
  const asa = sistema.anillos.anunciar({ inicio: 1100, impacto: 1650, amenaza: 'celador', propio: true, sobre: { x: 0, y: 0, z: 0 } });
  const i = sistema.anillos.ranuras.ranuraDe(asa);
  sistema.impacto({ x: 0, y: 1, z: 0, fuerza: 1 }, 1200);
  const k = sistema.impactos.ranuras.viva.indexOf(1);
  comprobar(
    'en pleno Remanso, el anillo guarda su impacto en el reloj del aparato y el impacto (adorno) en el presentado',
    sistema.anillos.impacto[i] === 1650 && sistema.anillos.inicio[i] === 1100 && sistema.impactos.nace[k] === reloj.presentado(1200) && reloj.presentado(1200) < 1200,
    { impacto: sistema.anillos.impacto[i], nace: sistema.impactos.nace[k] },
  );
}

/* ─────────────────────────────── 4. El anillo se lee a 20 m ─────────────────────────────── */

type Escala = (distancia: number, pxPorMetro: number) => number;
/** EL JUEZ DE LA LECTURA: con una escala dada, ¿se lee el anillo a la distancia exigida en la pantalla más pobre? */
function seLeeA(distancia: number, escala: Escala): { radioFinalPx: number; trazoPx: number; recorridoPx: number; bien: boolean } {
  const pxm = pxPorMetroA1m(EXIGE.pantalla.altoCss * EXIGE.pantalla.dpr, EXIGE.pantalla.fovGrados);
  const e = escala(distancia, pxm);
  const aPx = pxm / distancia;
  const radioFinalPx = RADIO_FINAL_DEL_ANILLO * e * aPx;
  const trazoPx = grosorDeLectura(distancia, pxm, e) * aPx;
  const recorridoPx = (RADIO_INICIAL_DEL_ANILLO - RADIO_FINAL_DEL_ANILLO) * e * aPx;
  return {
    radioFinalPx,
    trazoPx,
    recorridoPx,
    bien: radioFinalPx >= EXIGE.radioFinalPx - 1e-9 && trazoPx >= EXIGE.trazoPx - 1e-9 && recorridoPx >= EXIGE.recorridoPx,
  };
}

paso('El anillo se lee a 20 m en la pantalla más pobre de N0 (360 puntos de alto, densidad 0,75, 75°)');
{
  const a20 = seLeeA(EXIGE.distanciaDeLectura, escalaDeLectura);
  comprobar(
    `a ${String(EXIGE.distanciaDeLectura)} m: radio final de ${String(EXIGE.radioFinalPx)} px o más, trazo de ${String(EXIGE.trazoPx)} px o más y ${String(EXIGE.recorridoPx)} px de recorrido o más`,
    a20.bien,
    a20,
  );
  nota(`a 20 m: radio final ${a20.radioFinalPx.toFixed(1)} px, trazo ${a20.trazoPx.toFixed(2)} px, recorrido ${a20.recorridoPx.toFixed(1)} px`);
  const pxm = pxPorMetroA1m(EXIGE.pantalla.altoCss * EXIGE.pantalla.dpr, EXIGE.pantalla.fovGrados);
  const medido = anilloEnPantalla(EXIGE.distanciaDeLectura, pxm);
  comprobar(
    '`anilloEnPantalla` (lo que enseña el banco) dice lo mismo que el juez',
    Math.abs(medido.radioFinalPx - a20.radioFinalPx) < 1e-9 && Math.abs(medido.trazoPx - a20.trazoPx) < 1e-9 && Math.abs(medido.recorridoPx - a20.recorridoPx) < 1e-9,
    { medido, a20 },
  );
  const cerca = pxPorMetroA1m(EXIGE.pantalla.altoCss * EXIGE.pantalla.dpr, EXIGE.pantalla.fovGrados);
  comprobar('de cerca (3,2 m, la cámara al hombro) el anillo tiene su tamaño de verdad: no se agranda', escalaDeLectura(3.2, cerca) === 1);
  comprobar('a 25 m (el Vigía) también se lee', seLeeA(25, escalaDeLectura).bien, seLeeA(25, escalaDeLectura));
  comprobar('VACUNA: un anillo que no crece de lejos no se lee a 20 m, y el juez lo ve', !seLeeA(EXIGE.distanciaDeLectura, () => 1).bien, seLeeA(EXIGE.distanciaDeLectura, () => 1));
}

/* ─────────────────────────────── 5. Las líneas de tiempo del adorno ─────────────────────────────── */

paso('Las líneas de tiempo: impresión en 1,2 s, desalojo, Trasvase en 0,6 s, el Bis que repite, la salida');
{
  const t0 = 50_000;
  const im = impresionEn(t0 + EXIGE.impresionMs, t0);
  const imAntes = impresionEn(t0 + EXIGE.impresionMs - 1, t0);
  comprobar(
    'la impresión: la columna llega al suelo, se compacta y el cuerpo está entero justo a los 1 200 ms (no antes)',
    impresionEn(t0 + 480, t0).caida === 1 && im.compacto === 1 && im.cuerpo === 1 && imAntes.cuerpo < 1 && im.viva,
    { im, imAntes },
  );
  comprobar('el desalojo: el cuerpo se ha ido del todo a los 1 200 ms (el REMATE)', desalojoEn(t0 + 1200, t0).cuerpo === 0 && desalojoEn(t0 + 600, t0).cuerpo > 0);
  comprobar('el Trasvase: los hilos llegan al Celador antes de los 600 ms y el Prestado está apagado a los 600', trasvaseEn(t0 + 599, t0).flujo === 1 && trasvaseEn(t0 + EXIGE.trasvaseMs, t0).prestadoApagado === 1);
  let repite = true;
  for (let x = 0; x < 1000; x += 37) {
    const a = bisEn(t0 + 200 + x, t0);
    const b = bisEn(t0 + 1200 + x, t0);
    if (a.pasada !== 0 || b.pasada !== 1 || a.tiempoRepetido !== b.tiempoRepetido || a.marco !== b.marco) repite = false;
  }
  comprobar('el Bis: las dos pasadas ven EL MISMO segundo (glifos y marco idénticos), y dura lo que dice', repite && bisEn(t0 + BIS_MS - 1, t0).viva && !bisEn(t0 + BIS_MS, t0).viva);
  comprobar('la salida: el cuerpo se deshace y los glifos llegan arriba del cable antes de acabar', salidaEn(t0 + SALIDA_MS - 1, t0).cuerpo === 0 && salidaEn(t0 + SALIDA_MS * 0.95, t0).cable === 1);
  let dentro = true;
  for (let semilla = 1; semilla < 400; semilla += 7) {
    for (let i = 0; i < 12; i++) {
      const { dx, dz } = dondeCaeLaEsquirla(i, 12, semilla);
      const r = Math.hypot(dx, dz);
      if (r < 0.3 - 1e-9 || r > 0.8 + 1e-9) dentro = false;
    }
  }
  comprobar('las esquirlas caen en corona de 0,3 a 0,8 m: dentro del radio de recogida (1,2 m) siempre', dentro);
  comprobar('las columnas del cielo están todas detrás de la niebla del barrio (170 m o más del centro)', columnasDelCielo(176, 3).every((c) => Math.hypot(c.x, c.z) >= EXIGE.cieloDesde - 1e-9));
}

/* ─────────────────────────────── 6. El presupuesto ─────────────────────────────── */

interface JuicioDelPresupuesto {
  pasados: string[];
  juegoQueCambia: string[];
  adornoQueBaja: string[];
}

function juzgarElPresupuesto(piezas: readonly RenglonDePieza[]): JuicioDelPresupuesto {
  const j: JuicioDelPresupuesto = { pasados: [], juegoQueCambia: [], adornoQueBaja: [] };
  for (const n of NIVELES) {
    const g = gastoDelNivel(n, piezas);
    const tope = topeExigido(n);
    if (g.triangulos > tope.triangulos || g.llamadas > tope.llamadas) j.pasados.push(`N${String(n)}: ${String(g.triangulos)} tri / ${String(g.llamadas)} llamadas (tope ${String(tope.triangulos)} / ${String(tope.llamadas)})`);
  }
  for (const p of piezas) {
    if (p.deJuego && new Set(p.instancias).size !== 1) j.juegoQueCambia.push(`${p.pieza}: ${p.instancias.join('/')}`);
    for (let n = 1; n < 4; n++) if ((p.instancias[n] as number) < (p.instancias[n - 1] as number)) j.adornoQueBaja.push(`${p.pieza}: N${String(n - 1)}→N${String(n)}`);
  }
  return j;
}

paso('El presupuesto: cada nivel cabe, lo de juego no cambia, y los triángulos son los de la geometría de verdad');
{
  const j = juzgarElPresupuesto(PIEZAS);
  comprobar('con TODO encendido a la vez, cada nivel cabe en su parte de la escena (5 % de los triángulos, 20 % de las llamadas)', j.pasados.length === 0, j.pasados);
  comprobar('lo que es señal de juego (anillos, apuntado y balas, esquirlas) tiene la misma cifra en los cuatro niveles', j.juegoQueCambia.length === 0, j.juegoQueCambia);
  comprobar('el adorno nunca baja al subir de nivel', j.adornoQueBaja.length === 0, j.adornoQueBaja);
  comprobar(
    'los topes que `presupuesto.ts` copia del diseño son los del diseño, y su parte de los efectos también',
    NIVELES.every((n) => topeDeLosEfectos(n).triangulos === topeExigido(n).triangulos && topeDeLosEfectos(n).llamadas === topeExigido(n).llamadas),
    NIVELES.map((n) => [topeDeLosEfectos(n), topeExigido(n)]),
  );
  const deJuego = PIEZAS.filter((p) => p.deJuego).map((p) => p.pieza).sort();
  comprobar('las piezas de juego son exactamente anillos, esquirlas y trazos', deJuego.join(',') === 'anillos,esquirlas,trazos', deJuego);
  for (const n of NIVELES) {
    const g = gastoDelNivel(n);
    nota(`N${String(n)}: ${String(g.triangulos)} triángulos y ${String(g.llamadas)} llamadas como mucho (tope ${String(topeDeLosEfectos(n).triangulos)} / ${String(topeDeLosEfectos(n).llamadas)})`);
  }
  /* LA GEOMETRÍA DE VERDAD: la que monta cada pieza, construida aquí con three. */
  const mentiras = PIEZAS.filter((p) => triangulosDe(geometriaDeLaPieza(p.pieza)) !== TRIANGULOS_DE_LA_FORMA[p.forma]).map(
    (p) => `${p.pieza}: declara ${String(TRIANGULOS_DE_LA_FORMA[p.forma])}, monta ${String(triangulosDe(geometriaDeLaPieza(p.pieza)))}`,
  );
  comprobar('cada pieza monta una geometría con los triángulos que su renglón declara', mentiras.length === 0, mentiras);
  /* Las piscinas del sistema tienen la capacidad de la pieza que las pinta. */
  const s = crearSistemaDeEfectos(crearRelojDePresentacion(), 0);
  comprobar(
    'el sistema reserva lo que las piezas pintan: chispas, esquirlas y anillos a su capacidad',
    s.chispas.capacidad === capacidadDe('chispas') &&
      s.esquirlas.capacidad === capacidadDe('esquirlas') &&
      new Anillos().ranuras.capacidad === capacidadDe('anillos') &&
      s.apuntados.ranuras.capacidad + s.balas.ranuras.capacidad === capacidadDe('trazos') &&
      s.siluetas.ranuras.capacidad + s.haces.ranuras.capacidad === capacidadDe('siluetas'),
  );
  /* Un material por familia: seis familias, y los materiales de verdad con su mezcla y su profundidad. */
  const familias = Object.keys(FUENTES_DE_LAS_FAMILIAS).sort();
  const usadas = [...new Set(PIEZAS.map((p) => p.familia))].sort();
  comprobar('seis familias de sombreador, y cada pieza usa una de ellas', familias.length === 6 && usadas.every((f) => familias.includes(f)), { familias, usadas });
  const anuncio = materialDe('anuncio');
  const tapiz = materialDe('tapices');
  const esquirla = materialDe('esquirlas');
  comprobar(
    'el anillo del anuncio se pinta encima de todo y con mezcla normal; el adorno suma luz sin escribir profundidad; la esquirla es opaca',
    anuncio.depthTest === false &&
      anuncio.blending === THREE.NormalBlending &&
      tapiz.blending === THREE.AdditiveBlending &&
      tapiz.depthWrite === false &&
      esquirla.depthWrite === true &&
      esquirla.transparent === false,
  );
  /*
   * DOS CARAS donde la orientación la pone el sombreador. El primer banco tenía la línea de apuntado,
   * las balas, los hilos y las chispas contados en las llamadas y ausentes de la imagen: sus
   * triángulos salían de espaldas la mitad de las veces y `FrontSide` los podaba sin un error.
   */
  const conUnaCara = (['cintas', 'chispas', 'ondas'] as const).filter((f) => materialDe(f).side !== THREE.DoubleSide);
  comprobar('las cintas, las chispas y las ondas se pintan por las dos caras (su orientación la decide el sombreador)', conUnaCara.length === 0, conUnaCara);
  comprobar(
    'todos los fragmentos acaban con el mapeo de tonos y el espacio de color de la escena',
    Object.values(FUENTES_DE_LAS_FAMILIAS).every((f) => f.fragmento.includes('#include <colorspace_fragment>') && f.fragmento.includes('#include <tonemapping_fragment>')),
  );
  const menos = PIEZAS.map((p) => (p.pieza === 'anillos' ? { ...p, instancias: [12, 24, 24, 24] as const } : p));
  const mas = PIEZAS.map((p) => (p.pieza === 'cielo' ? { ...p, instancias: [4000, 4000, 4000, 4000] as const } : p));
  comprobar(
    'VACUNA: el juez del presupuesto ve unos anillos que bajan en N0 y un cielo que no cabe',
    juzgarElPresupuesto(menos).juegoQueCambia.length > 0 && juzgarElPresupuesto(mas).pasados.length > 0,
  );
  const nivelDePrueba: Nivel = 0;
  nota(`anillos en N0: ${String(instanciasDe('anillos', nivelDePrueba))}; chispas en N0: ${String(instanciasDe('chispas', nivelDePrueba))}`);
}

/* ─────────────────────────────── 7. El sistema ─────────────────────────────── */

paso('El sistema: asas que caducan, ranuras que no crecen, chispas que se siembran igual');
{
  const reloj = crearRelojDePresentacion();
  const s = crearSistemaDeEfectos(reloj, 0);
  const sobre = { x: 1, y: 0, z: 2 };
  const vieja = s.anillos.anunciar({ inicio: 0, impacto: 500, amenaza: 'prestado', propio: true, sobre });
  s.fotograma(500 + 241);
  const nueva = s.anillos.anunciar({ inicio: 800, impacto: 1300, amenaza: 'celador', propio: false, sobre: 3 });
  comprobar(
    'un anillo se suelta 240 ms después del impacto, y el asa vieja no toca al que ocupa su ranura',
    s.anillos.ranuras.vivas() === 1 &&
      s.anillos.resolver(vieja, 'golpe', 900) === false &&
      s.anillos.resolver(nueva, 'limpio', 1300) === true &&
      s.anillos.quien[s.anillos.ranuras.ranuraDe(nueva)] === 3,
  );
  const arrays = [s.anillos.inicio, s.chispas.origen, s.esquirlas.tiempos];
  for (let k = 0; k < 60; k++) s.anillos.anunciar({ inicio: 2000 + k, impacto: 2600 + k, amenaza: 'celador', propio: true, sobre });
  comprobar(
    'con más anillos que ranuras se pisa el más viejo: nunca hay más de 24 y los arrays son los mismos',
    s.anillos.ranuras.vivas() === 24 && arrays[0] === s.anillos.inicio && arrays[1] === s.chispas.origen && arrays[2] === s.esquirlas.tiempos,
  );
  s.nivel = 0;
  s.impacto({ x: 0, y: 1, z: 0, fuerza: 1, dx: 1 }, 3000);
  const escritas = s.chispas.escritas;
  comprobar(
    'un impacto de fuerza 1 en N0 escribe sus 10 chispas y apunta el tramo sucio',
    escritas === 10 && s.chispas.suciasDesde === 0 && s.chispas.suciasHasta === 10,
    { escritas, desde: s.chispas.suciasDesde, hasta: s.chispas.suciasHasta },
  );
  for (let k = 0; k < 10; k++) s.impacto({ x: 0, y: 1, z: 0, fuerza: 1 }, 3100 + k);
  comprobar('en N0 las chispas dan la vuelta en su anillo de 48 y no escriben más allá', s.chispas.suciasHasta <= 48 && s.chispas.escritas === 110);
  const otro = crearSistemaDeEfectos(crearRelojDePresentacion(), 0);
  otro.nivel = 0;
  const s2 = crearSistemaDeEfectos(crearRelojDePresentacion(), 0);
  s2.nivel = 0;
  otro.impacto({ x: 0.5, y: 1, z: -2, fuerza: 0.6, dx: 0, dz: 1 }, 100);
  s2.impacto({ x: 0.5, y: 1, z: -2, fuerza: 0.6, dx: 0, dz: 1 }, 100);
  comprobar(
    'las chispas se siembran: el mismo impacto da las mismas chispas en dos sistemas',
    Buffer.compare(Buffer.from(otro.chispas.velocidad.buffer), Buffer.from(s2.chispas.velocidad.buffer)) === 0 && otro.chispas.escritas > 0,
  );
  const asas = s.soltarEsquirlas({ x: 0, y: 0, z: 0, cuantas: 3, semilla: 77 }, 4000);
  const primera = asas[0] ?? -1;
  const recogida = s.recogerEsquirla(primera, { x: 1, y: 1.2, z: 0 }, 4100);
  const dosVeces = s.recogerEsquirla(primera, { x: 1, y: 1.2, z: 0 }, 4110);
  s.fotograma(4100 + 261);
  comprobar(
    'una esquirla se recoge una vez, se suelta al acabar la recogida y deja de verse',
    asas.length === 3 && recogida && !dosVeces && s.esquirlas.ranuras.vivas() === 2 && s.esquirlas.tiempos[3] === 0,
  );
}

terminar(73);
