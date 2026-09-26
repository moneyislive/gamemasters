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
 *   7. EL RAYO (EL-RAYO.md) es un destello: llega en 50 ms como mucho, sus descargas caben en 90 ms y a 300 ms
 *      no queda casi nada; el fogonazo es uno, breve y sólo desde media carga; la onda llega al área exacta; el
 *      canal se siembra y se quiebra sin desbocarse; la tangente empaquetada no pierde; su paleta es la del
 *      jugador; es UNA pieza nueva y N0 sigue en 12 llamadas; el impacto propio predicho se concilia con el de
 *      la sala; la luz del estallido se enciende y se apaga; y en `escenificar.ts` la carga de otro sale de su
 *      estado de cargar, se cancela con gracia, no se cancela si sale su bala, y su pleno cercano sacude.
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
  PICO_DE_LA_REJILLA_DESDE_MS,
  PICO_DE_LA_REJILLA_MS,
  crearRelojDePresentacion,
  rejillaDelRemanso,
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
  cieloVistoDesde,
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
import { COLORES } from '../src/quiebro/efectos/cuentas';
import { POR_NIVEL, RAYOS_A_LA_VEZ } from '../src/quiebro/efectos/presupuesto';
import {
  COLORES_DEL_RAYO,
  DESCARGAS_MS,
  FOCO_DEL_DESTELLO,
  FOGONAZO_MAXIMO,
  ONDA_SIN_AREA_M,
  brilloDelCanal,
  descargasDelRayo,
  desempaquetarDireccion,
  duracionDeLaOnda,
  empaquetarDireccion,
  evaluarLosRayos,
  fogonazoDelRayo,
  golpeDelRayo,
  llegadaDelRayo,
  ondaDelSuelo,
  puntosDelCanal,
} from '../src/quiebro/efectos/rayo';
import { UNIFORMES_DEL_DESTELLO, cargaDe, estadoDelRayoApagado } from '../src/quiebro/rayo/contrato';
import type { DisparoDelRayo, EfectosDelRayo } from '../src/quiebro/rayo/contrato';
import '../../shared/arcade/juegos';
import { avanzarConMotivo, vistaDeAsiento } from '../../shared/arcade';
import { lizaDeLaMesa } from '../../shared/arcade/juegos/lizas';
import { ACCION_DEL_QUIEBRO, ESTADO_DEL_QUIEBRO, NIVELES_DEL_RAYO } from '../../shared/arcade/juegos/quiebro-reglas';
import type { NivelDelRayo } from '../../shared/arcade/juegos/quiebro-reglas';
import { leerVistaDelQuiebro } from '../../shared/arcade/juegos/quiebro-vista';
import { deNumero, UNO } from '../../shared/mecanicas/fijo';
import { paradaDeLaBalaEn } from '../../shared/mecanicas/liza/proyectiles';
import type { EfectoDeclarado, LizaDeclarada, PuestaDeEstado, TiroDeclarado } from '../../shared/mecanicas/liza/declaracion';
import type { SucesoDelTic } from '../../shared/mecanicas/liza/protocolo';
import { leerLaLiza } from '../src/quiebro/red/diccionario';
import { Escenificador } from '../src/quiebro/red/escenificar';
import type { Partida } from '../src/quiebro/red/partida';
import type { BalaVista, EstadoVisto, Novedad } from '../src/quiebro/red/sala-vista';
import type { Sonido } from '../src/quiebro/sonido';

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
  const centro = inicio + PICO_DE_LA_REJILLA_DESDE_MS + PICO_DE_LA_REJILLA_MS / 2;
  comprobar(
    'la rejilla de glifos del pico: 0,3 s dentro de la frenada, llena en el centro, nada fuera ni sin Remanso',
    PICO_DE_LA_REJILLA_MS === 300 &&
      PICO_DE_LA_REJILLA_DESDE_MS + PICO_DE_LA_REJILLA_MS <= FRENADA_MS &&
      rejillaDelRemanso(inicio, centro) === 1 &&
      rejillaDelRemanso(inicio, inicio + 10) === 0 &&
      rejillaDelRemanso(inicio, inicio + PICO_DE_LA_REJILLA_DESDE_MS + PICO_DE_LA_REJILLA_MS + 1) === 0 &&
      rejillaDelRemanso(null, centro) === 0,
  );
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
  /*
   * En la ciudad abierta de 540 m, 170 m del CENTRO caen dentro de la ciudad (el 24-sep, un paño de glifos
   * pegado a una torre de las Torres): las columnas siguen a quien mira (`cieloVistoDesde`). Desde cualquier
   * sitio de la ciudad, y del borde, todas quedan detrás de la niebla, a 170-290 m del ojo.
   */
  const columnas = columnasDelCielo(176, 3);
  const bases = new Float32Array(176 * 4);
  let peorCerca = Infinity;
  let peorLejos = 0;
  let ojos = 0;
  for (let x = -272; x <= 272; x += 34) {
    for (let z = -272; z <= 272; z += 34) {
      bases.fill(Number.NaN);
      cieloVistoDesde(bases, columnas, 176, x, z);
      ojos++;
      for (let i = 0; i < 176; i++) {
        const d = Math.hypot((bases[i * 4] as number) - x, (bases[i * 4 + 2] as number) - z);
        peorCerca = Number.isNaN(d) ? -1 : Math.min(peorCerca, d);
        peorLejos = Math.max(peorLejos, d);
      }
    }
  }
  comprobar(
    `las columnas del cielo siguen a quien mira: desde ${String(ojos)} sitios de la ciudad abierta (±272) todas quedan a 170-290 m del ojo`,
    peorCerca >= EXIGE.cieloDesde - 1e-3 && peorLejos <= 290 + 1e-3,
    { peorCerca, peorLejos },
  );
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

/* ─────────────────────────────── 8. El rayo ─────────────────────────────── */

/**
 * LOS JUECES DEL RAYO (EL-RAYO.md §4: «prácticamente no se ve, es un destello»), cada uno con su vacuna. Reciben lo
 * que juzgan y devuelven lo que está mal (vacío = bien).
 */
function juzgarLaLlegada(llegada: (c: number) => number, descargas: (c: number, n: Nivel) => number): string[] {
  const malos: string[] = [];
  for (let k = 0; k <= 20; k++) {
    const c = k / 20;
    const l = llegada(c);
    if (!(l >= 25 && l <= 50)) malos.push(`c ${String(c)}: llega en ${String(l)} ms`);
    for (const n of NIVELES) {
      const d = descargas(c, n);
      if (!(d >= 1 && d <= 3) || (DESCARGAS_MS[d - 1] as number) > 90) malos.push(`N${String(n)} c ${String(c)}: ${String(d)} descargas`);
    }
  }
  if (descargas(0, 3) !== 1) malos.push('el chispazo lleva más de una descarga');
  if (descargas(1, 3) < 2) malos.push('el pleno de N3 no repite la descarga');
  return malos;
}

function juzgarElDestello(brillo: (ms: number, c: number, d: number) => number): string[] {
  const malos: string[] = [];
  for (const c of [0, 0.58, 1]) {
    const d = descargasDelRayo(c, 3);
    const l = llegadaDelRayo(c);
    let pico = 0;
    for (let ms = 0; ms <= 600; ms++) pico = Math.max(pico, brillo(ms, c, d));
    if (!(pico >= 0.9)) malos.push(`c ${String(c)}: el pico es ${pico.toFixed(2)}`);
    if (brillo(l - 1, c, d) > 0.5 * pico) malos.push(`c ${String(c)}: antes de llegar ya brilla`);
    const queda = brillo(l + 300, c, d) / pico;
    if (queda > 0.05) malos.push(`c ${String(c)}: a 300 ms de llegar queda el ${(queda * 100).toFixed(0)} %`);
    for (let k = 1; k < d; k++) {
      const en = l + (DESCARGAS_MS[k] as number);
      if (!(brillo(en, c, d) > brillo(en - 3, c, d) * 1.5)) malos.push(`c ${String(c)}: la descarga ${String(k + 1)} no se ve`);
    }
  }
  return malos;
}

function juzgarElFogonazo(fogonazo: (ms: number, c: number) => number, golpe: (ms: number, c: number) => number): string[] {
  const malos: string[] = [];
  for (const c of [0, 0.2, 0.5]) for (let ms = 0; ms <= 400; ms += 2) if (fogonazo(ms, c) !== 0 || (c < 0.5 && golpe(ms, c) !== 0)) malos.push(`c ${String(c)} en ${String(ms)} ms`);
  const l = llegadaDelRayo(1);
  let pico = 0;
  let antes = Number.POSITIVE_INFINITY;
  let sube = false;
  for (let ms = l; ms <= l + 400; ms++) {
    const f = fogonazo(ms, 1);
    pico = Math.max(pico, f);
    if (f > antes + 1e-12) sube = true;
    antes = f;
  }
  if (!(pico > 0 && pico <= FOGONAZO_MAXIMO)) malos.push(`el pico del pleno es ${String(pico)}`);
  if (sube) malos.push('el fogonazo vuelve a subir: no es UNO');
  if (fogonazo(l + 150, 1) > 0.05 * pico) malos.push('a 150 ms sigue el fogonazo');
  return malos;
}

function juzgarLaOnda(onda: (ms: number, area: number) => { radio: number; fuerza: number }): string[] {
  const malos: string[] = [];
  for (const area of [0, 1, 2, 3]) {
    const dura = duracionDeLaOnda(area);
    const final = area > 0 ? area : ONDA_SIN_AREA_M;
    if (onda(dura, area).radio !== final) malos.push(`área ${String(area)}: llega a ${String(onda(dura, area).radio)}`);
    let antes = 0;
    for (let ms = 0; ms <= dura; ms += 5) {
      const r = onda(ms, area).radio;
      if (r < antes - 1e-9 || r > final + 1e-9) malos.push(`área ${String(area)}: ${String(r)} en ${String(ms)} ms`);
      antes = r;
    }
    if (onda(dura * 1.6, area).radio !== 0) malos.push(`área ${String(area)}: no se apaga`);
  }
  return malos;
}

/** Una mesa por la misma puerta que la de verdad (como `verificar-quiebro-rayo.ts`), y su tiro si aún no lo declara. */
function lizaConTiro(): LizaDeclarada | null {
  let estado: unknown = undefined;
  const asientos = ['s1', 's2', 's3'];
  const sentados = asientos.map((asiento) => ({ asiento, nombre: asiento }));
  const mandar = (quien: string | null, tipo: string, carga: unknown): void => {
    const s = avanzarConMotivo('quiebro', estado, { tipo, carga }, { quien, azar: 20260926, tic: 0, asientos });
    if (s.motivo === null) estado = s.estado;
  };
  const vista = (): unknown => vistaDeAsiento('quiebro', estado, null, sentados);
  mandar('s1', 'empezar', null);
  const enLaBajada = leerVistaDelQuiebro(vista());
  if (enLaBajada?.reloj !== null && enLaBajada?.reloj !== undefined) mandar(null, 'arcade:reloj', { id: enLaBajada.reloj.id });
  const l = lizaDeLaMesa('quiebro', vista(), 'RAYOS');
  if (l === null || l.asientos.every((a) => a.tiro !== null && a.tiro !== undefined)) return l;
  const puesta = (e: number, tics: number): PuestaDeEstado => ({ estado: e, tics, intocableTics: 0, soltableDesdeTic: tics, distanciaExtra: 0 });
  const efecto = (dano: number, p: PuestaDeEstado | null, empuje: number): EfectoDeclarado => ({
    dano,
    danoAlRitmo: dano,
    puntos: 10,
    puntosAlRitmo: 10,
    puesta: p,
    empuje,
    alChocar: { dano: 0, tics: 0 },
    rompeGuardia: false,
  });
  let cargar = 0;
  for (const e of l.estados) cargar = Math.max(cargar, e.id);
  cargar++;
  let primera = 0;
  for (const p of l.proyectiles) primera = Math.max(primera, p.id);
  primera++;
  const deja = (n: NivelDelRayo): PuestaDeEstado => puesta(ESTADO_DEL_QUIEBRO[n.deja], n.dejaTics);
  const tiro: TiroDeclarado = {
    apuntar: ACCION_DEL_QUIEBRO.apuntarRayo,
    soltar: ACCION_DEL_QUIEBRO.soltarRayo,
    puesta: puesta(cargar, 40),
    niveles: NIVELES_DEL_RAYO.map((n, i) => ({
      desdeMs: n.desdeMs,
      proyectil: primera + i,
      ancho: deNumero(0.2),
      area: deNumero(n.areaMetros),
      efectoDelArea: n.areaMetros === 0 ? null : efecto(n.dano, deja(n), deNumero(n.empujeMetros)),
      recargaTics: n.recargaTics,
    })),
    enganche: { radio: deNumero(45), conoRumbos: 8, holgura: deNumero(0.5) },
    holgura: deNumero(0.6),
    cargaMaximaMs: 2000,
  };
  const balas = NIVELES_DEL_RAYO.map((n, i) => ({
    id: primera + i,
    apuntarTics: 1,
    balas: 1,
    cadaTics: 0,
    velocidad: deNumero(400),
    radio: deNumero(0.05),
    alcance: deNumero(n.alcanceMetros),
    efecto: efecto(n.dano, deja(n), deNumero(n.empujeMetros)),
  }));
  return {
    ...l,
    asientos: l.asientos.map((a) => ({ ...a, tiro })),
    estados: [...l.estados, { id: cargar, bloqueaPaso: true, bloqueaAccion: false, cancelaCon: [], seCortaConDano: true }],
    proyectiles: [...l.proyectiles, ...balas],
  };
}

paso('El rayo: un destello que llega en tres fotogramas, se siembra, cabe, alumbra, se apaga, y el de otro se ve cargar');
{
  const llegada = juzgarLaLlegada(llegadaDelRayo, descargasDelRayo);
  comprobar(
    'el rayo llega en 50 ms como mucho (el pleno en 25): el chispazo es UNA descarga y el pleno de N3 se repite, todo dentro de 90 ms',
    llegada.length === 0,
    llegada,
  );
  const destello = juzgarElDestello(brilloDelCanal);
  comprobar('el canal es un destello: nada antes de llegar la cabeza, un pico por descarga y a 300 ms menos del 5 % del pico', destello.length === 0, destello);
  const fogonazo = juzgarElFogonazo(fogonazoDelRayo, golpeDelRayo);
  comprobar(
    'el fogonazo de pantalla es UNO, breve (a 150 ms, menos del 5 %) y tope 6 %, y ni él ni el golpe salen hasta media carga',
    fogonazo.length === 0,
    fogonazo,
  );
  const onda = juzgarLaOnda((ms, area) => ondaDelSuelo(ms, area));
  comprobar('la onda del suelo crece sin volver atrás hasta el radio EXACTO del área (o 1 m sin área) y se apaga', onda.length === 0, onda);
  comprobar(
    'VACUNA: los jueces del rayo ven uno que tarda 80 ms, un canal que se queda encendido, un fogonazo en el chispazo y una onda que no llega',
    juzgarLaLlegada((c) => 80 - 25 * c, descargasDelRayo).length > 0 &&
      juzgarLaLlegada(llegadaDelRayo, () => 1).length > 0 &&
      juzgarElDestello((ms, c, d) => Math.max(0.3, brilloDelCanal(ms, c, d))).length > 0 &&
      juzgarElFogonazo((ms) => 0.03 * Math.exp(-ms / 45), golpeDelRayo).length > 0 &&
      juzgarLaOnda((ms, area) => ({ radio: 0.9 * ondaDelSuelo(ms, area).radio, fuerza: 1 })).length > 0,
  );

  /* EL CANAL, sembrado y quebrado. */
  const a = new Float32Array(13 * 3);
  const b = new Float32Array(13 * 3);
  let rectos = 0;
  let desbocados = 0;
  let mal = 0;
  let mirados = 0;
  for (let semilla = 1; semilla <= 60; semilla++) {
    for (const c of [0, 1]) {
      mirados++;
      puntosDelCanal(semilla, 0, 1.35, 0, 0, 1.35, -30, c, 12, a);
      puntosDelCanal(semilla, 0, 1.35, 0, 0, 1.35, -30, c, 12, b);
      if (!a.every((v, i) => v === b[i] && Number.isFinite(v))) mal++;
      if (a[0] !== 0 || Math.abs((a[1] as number) - 1.35) > 1e-6 || a[36] !== 0 || Math.abs((a[38] as number) + 30) > 1e-5) mal++;
      let mayor = 0;
      for (let k = 1; k < 12; k++) {
        const lado = Math.abs(a[k * 3] as number);
        const alto = Math.abs((a[k * 3 + 1] as number) - 1.35);
        mayor = Math.max(mayor, lado);
        if (lado > 3 + 1e-5 || alto > 1.65 + 1e-5) desbocados++;
      }
      if (mayor < 0.3) rectos++;
    }
  }
  puntosDelCanal(2, 0, 1.35, 0, 0, 1.35, -30, 1, 12, b);
  puntosDelCanal(1, 0, 1.35, 0, 0, 1.35, -30, 1, 12, a);
  comprobar(
    'el canal se siembra (la misma semilla, el mismo rayo en todos los aparatos; otra, otro), sale de la boca, llega a su sitio, se quiebra y no se aparta más de 3 m',
    mirados === 120 && mal === 0 && rectos === 0 && desbocados === 0 && !a.every((v, i) => v === b[i]),
    { mirados, mal, rectos, desbocados },
  );
  let peorGrado = 0;
  let noCabe = 0;
  let empaquetadas = 0;
  for (let k = 0; k < 4000; k++) {
    const u = ((k * 0.61803398875) % 1) * 2 - 1;
    const f = ((k * 0.7548776662) % 1) * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const x = r * Math.cos(f);
    const y = u;
    const z = r * Math.sin(f);
    const p = empaquetarDireccion(x, y, z);
    if (Math.fround(1 + p) !== 1 + p) noCabe++;
    const [ux, uy, uz] = desempaquetarDireccion(p);
    peorGrado = Math.max(peorGrado, (Math.acos(Math.min(1, x * ux + y * uy + z * uz)) * 180) / Math.PI);
    empaquetadas++;
  }
  comprobar(
    'la tangente de la costura viaja empaquetada en un float sin perder: vuelve con menos de 0,2° de error y cabe entera en la mantisa',
    empaquetadas === 4000 && peorGrado < 0.2 && noCabe === 0,
    { peorGrado, noCabe },
  );
  const calidos = (['nucleo', 'filo', 'caliente', 'frio', 'chispa'] as const).filter((k) => {
    const v = COLORES_DEL_RAYO[k];
    const r = (v >> 16) & 255;
    const g = (v >> 8) & 255;
    const bl = v & 255;
    /* Cálido: el rojo por encima del verde y éste del azul; el núcleo es casi blanco, pero con calor. */
    return !(r >= g && g >= bl && r - bl >= (k === 'nucleo' ? 10 : 30));
  });
  comprobar(
    'el rayo es del jugador: blanco cálido y ámbar (nada de cian del código ni de magenta de los rótulos), y la carga es el ámbar de la paleta',
    calidos.length === 0 && COLORES_DEL_RAYO.carga === COLORES.ambar,
    calidos,
  );
  const rayos = PIEZAS.find((p) => p.pieza === 'rayos');
  const antes = ['anillos', 'trazos', 'ondas', 'chispas', 'siluetas', 'hilos', 'muro', 'marco', 'esquirlas', 'cielo', 'pantallas'];
  const nuevas = PIEZAS.map((p) => p.pieza).filter((p) => !antes.includes(p));
  comprobar(
    'el rayo es UNA pieza nueva (las cintas del rayo), de adorno, y N0 sigue en 12 llamadas como mucho',
    rayos !== undefined && !rayos.deJuego && rayos.familia === 'cintas' && nuevas.join(',') === 'rayos' && gastoDelNivel(0).llamadas <= 12,
    { nuevas, llamadas: gastoDelNivel(0).llamadas },
  );
  comprobar(
    'las descargas y la estela del rayo por nivel: N0 una descarga y la estela más corta; N3 tres y la más larga',
    POR_NIVEL.descargasDelRayo[0] === 1 && POR_NIVEL.descargasDelRayo[3] === 3 && POR_NIVEL.estelaDelRayo[0] < POR_NIVEL.estelaDelRayo[3],
  );

  /* EL SISTEMA: predice el impacto propio, lo concilia con el de la sala, y no crece. */
  const s = crearSistemaDeEfectos(crearRelojDePresentacion(), 0);
  s.nivel = 3;
  s.rayos.yo = 1;
  const disparo = (bala: number, t: number, dio: boolean | null, c = 1, quien = 1): DisparoDelRayo => ({
    quien,
    bala,
    origen: { x: 0, y: 1.35, z: 0 },
    destino: { x: 0, y: 1.35, z: -20 },
    nivel: c >= 1 ? 4 : 1,
    c,
    area: c >= 1 ? 0 : 3,
    dio,
    semilla: 7,
    t,
  });
  const ranura = (t0: number): number => {
    for (let i = 0; i < RAYOS_A_LA_VEZ; i++) if (s.rayos.vivo[i] === 1 && s.rayos.t0[i] === t0) return i;
    return -1;
  };
  s.rayo.soltar(disparo(0, 1000, true));
  const i1 = ranura(1000);
  const predicho = i1 >= 0 && s.rayos.impacto[i1] === 1 && s.rayos.dz[i1] === -20 && s.rayos.tImpacto[i1] === 1000 + llegadaDelRayo(1);
  s.rayo.estallar({ quien: 1, bala: 55, x: 0.5, y: 1.35, z: -20.4, nivel: 4, area: 0, t: 1060 });
  const quieto = i1 >= 0 && s.rayos.dz[i1] === -20 && s.rayos.bala[i1] === 55 && s.rayos.confirmado[i1] === 1;
  s.rayo.soltar(disparo(0, 2000, true));
  const i2 = ranura(2000);
  s.rayo.estallar({ quien: 1, bala: 56, x: 0, y: 1.35, z: -9, nivel: 4, area: 0, t: 2040 });
  /* Lejos, pero SOBRE el canal (un cuerpo que se cruza): el estallido va allí y el canal se recorta, con su forma. */
  const movido = i2 >= 0 && Math.abs((s.rayos.iz[i2] as number) + 9) < 1e-9 && s.rayos.dz[i2] === -20 && Math.abs((s.rayos.corte[i2] as number) - 0.45) < 1e-9;
  /* Lejos y FUERA del canal (a seis metros de su recta): el canal va a él. */
  s.rayo.soltar(disparo(0, 2500, true));
  const i3 = ranura(2500);
  s.rayo.estallar({ quien: 1, bala: 57, x: 6, y: 1.35, z: -8, nivel: 4, area: 0, t: 2540 });
  const retrazado = i3 >= 0 && s.rayos.ix[i3] === 6 && s.rayos.dx[i3] === 6 && s.rayos.dz[i3] === -8 && s.rayos.corte[i3] === 1;
  s.rayo.estallar({ quien: 3, bala: 90, x: 5, y: 1.35, z: 5, nivel: 2, area: 2, t: 2100 });
  let sinCanal = false;
  for (let i = 0; i < RAYOS_A_LA_VEZ; i++) if (s.rayos.vivo[i] === 1 && s.rayos.bala[i] === 90) sinCanal = s.rayos.sinCanal[i] === 1;
  comprobar(
    'el rayo propio predice su impacto al soltar; la sala lo confirma cerca y se queda (no salta); lo pone lejos sobre el canal y el canal se RECORTA ahí con su forma (no se vuelve a sembrar), o fuera de él y el canal va a él; un `estalla` sin rayo visto estalla solo',
    predicho && quieto && movido && retrazado && sinCanal,
    { predicho, quieto, movido, retrazado, sinCanal },
  );
  const arrays = [s.rayos.vivo, s.rayos.t0, s.rayos.marcaViva];
  for (let k = 0; k < 50; k++) s.rayo.soltar(disparo(0, 3000 + k, true));
  let vivos = 0;
  for (let i = 0; i < RAYOS_A_LA_VEZ; i++) vivos += s.rayos.vivo[i] as number;
  comprobar(
    'con más rayos que ranuras se pisa el más viejo: nunca más de los que caben, y los arrays son los mismos',
    vivos === RAYOS_A_LA_VEZ && arrays[0] === s.rayos.vivo && arrays[1] === s.rayos.t0 && arrays[2] === s.rayos.marcaViva,
  );

  /* LA LUZ Y LA IMAGEN: el estallido alumbra y se apaga; el fogonazo y la viñeta son del propio. */
  const l = crearSistemaDeEfectos(crearRelojDePresentacion(), 0);
  l.nivel = 3;
  l.rayos.yo = 1;
  l.localizar = (quien, salida) => {
    salida.x = quien === 1 ? 0 : 40;
    salida.y = 0;
    salida.z = 0;
    return true;
  };
  l.rayo.soltar(disparo(0, 1000, true));
  evaluarLosRayos(l, 1000 + llegadaDelRayo(1) + 4);
  const pos = UNIFORMES_DEL_DESTELLO.uDestelloQ.value;
  const col = UNIFORMES_DEL_DESTELLO.uDestelloColorQ.value;
  let alumbraElImpacto = false;
  for (let k = 0; k < 4; k++) if ((pos[k * 4 + 3] as number) > 0 && Math.abs((pos[k * 4 + 2] as number) + 20) < 1 && (col[k * 4] as number) > (col[k * 4 + 2] as number)) alumbraElImpacto = true;
  const focoEncendido = FOCO_DEL_DESTELLO.intensidad > 0;
  const fogonazoPropio = l.rayos.imagen.fogonazo;
  evaluarLosRayos(l, 1000 + 2500);
  let apagado = FOCO_DEL_DESTELLO.intensidad === 0 && l.rayos.imagen.fogonazo === 0;
  for (let k = 0; k < 4; k++) if ((pos[k * 4 + 3] as number) !== 0) apagado = false;
  comprobar(
    'el estallido del pleno alumbra donde estalla (luz cálida en los uniformes del destello y en el foco), el fogonazo es del que dispara, y a los 2,5 s todo apagado',
    alumbraElImpacto && focoEncendido && fogonazoPropio > 0 && apagado,
    { alumbraElImpacto, focoEncendido, fogonazoPropio, apagado },
  );
  l.rayo.soltar({ ...disparo(70, 5000, true, 1, 2), origen: { x: 40, y: 1.35, z: 0 }, destino: { x: 40, y: 1.35, z: -20 } });
  evaluarLosRayos(l, 5000 + llegadaDelRayo(1) + 4);
  const fogonazoAjenoLejos = l.rayos.imagen.fogonazo;
  const estado = estadoDelRayoApagado();
  estado.activo = true;
  estado.c = 0.6;
  estado.nivel = 3;
  estado.desdeMs = 7000;
  l.rayo.actualizarCarga(2, estado, 7300);
  evaluarLosRayos(l, 7300);
  const vinetaAjena = l.rayos.imagen.carga;
  l.rayo.actualizarCarga(1, estado, 7300);
  evaluarLosRayos(l, 7310);
  const vinetaPropia = l.rayos.imagen.carga;
  comprobar(
    'el pleno de otro a 40 m no me ciega la pantalla, y la viñeta de la carga es sólo de la mía',
    fogonazoAjenoLejos === 0 && vinetaAjena === 0 && vinetaPropia > 0.5,
    { fogonazoAjenoLejos, vinetaAjena, vinetaPropia },
  );

  /* LOS AJENOS en `escenificar.ts`: su carga sale de su estado de cargar, se cancela con gracia y no si sale su rayo. */
  const liza = lizaConTiro();
  const lectura = liza === null ? null : leerLaLiza(liza, 1);
  const tiro = lectura?.tiroDelAsiento(2) ?? null;
  if (lectura === null || tiro === null) {
    comprobar('la liza de la mesa, con su tiro, para probar los rayos ajenos', false, { liza: liza === null });
  } else {
    const sistema = crearSistemaDeEfectos(crearRelojDePresentacion(), 0);
    const llamadas: string[] = [];
    const cargas: number[] = [];
    const destinos: number[] = [];
    const espia: EfectosDelRayo = {
      empezarCarga: (quien) => void llamadas.push(`empezar ${String(quien)}`),
      actualizarCarga: (quien, e) => {
        llamadas.push(`actualizar ${String(quien)}`);
        if (quien === 2) cargas.push(e.c);
      },
      cancelarCarga: (quien) => void llamadas.push(`cancelar ${String(quien)}`),
      soltar: (d) => {
        llamadas.push(`soltar ${String(d.quien)}`);
        destinos.push(Math.hypot(d.destino.x - d.origen.x, d.destino.z - d.origen.z));
      },
      estallar: (e) => void llamadas.push(`estallar ${String(e.quien)}`),
    };
    sistema.rayo = espia;
    const sonados: string[] = [];
    const sonido = { sonar: (id: string) => void sonados.push(id), remanso: () => undefined, cabina: () => undefined } as unknown as Sonido;
    const estados = new Map<number, EstadoVisto>();
    const cola: Novedad[] = [];
    /* Los cuerpos pintados (para predecir dónde para un cuerpo el rayo de otro): vacío hasta la prueba de eso. */
    const cuerpos: { id: number; x: number; z: number; gesto: string }[] = [];
    const partida = {
      lectura,
      sala: { yo: 1, estados },
      paraLaEscena: cola,
      pulsacionesAtendidas: [],
      sitioDe: (n: number) => (n === 1 ? { x: 0, z: 0 } : null),
      pintadoDe: () => null,
      cuerpos: () => cuerpos,
    } as unknown as Partida;
    const escena = new Escenificador(partida, sistema, sonido);
    const cargando = (desdeMs: number): EstadoVisto => ({ est: tiro.estado, desdeMs, hastaMs: desdeMs + 5000, intocableHastaMs: 0 });
    estados.set(2, cargando(1000));
    estados.set(1, cargando(1000));
    estados.set(20, cargando(1000));
    for (let t = 1000; t <= 1400; t += 16) escena.cadaFotograma(t, null);
    const cuantas = (x: string): number => llamadas.filter((c) => c === x).length;
    const ultima = cargas[cargas.length - 1] ?? -1;
    const sube = cargas.every((c, i) => i === 0 || c >= (cargas[i - 1] as number));
    const cargaBien =
      cuantas('empezar 2') === 1 &&
      cuantas('actualizar 2') === 26 &&
      !llamadas.some((c) => c.endsWith(' 1') || c.endsWith(' 20')) &&
      sube &&
      Math.abs(ultima - cargaDe(tiro, 400)) < 1e-9 &&
      sistema.rayos.yo === 1;
    estados.delete(2);
    for (let t = 1416; t <= 1600; t += 16) escena.cadaFotograma(t, null);
    const antesDeLaGracia = cuantas('cancelar 2');
    for (let t = 1616; t <= 1800; t += 16) escena.cadaFotograma(t, null);
    const despues = cuantas('cancelar 2');
    comprobar(
      'la carga de otro sale de su estado de cargar (una vez, cada fotograma, subiendo con la cuenta de su tiro; ni la mía ni la de una entidad) y se cancela pasada la gracia, una vez',
      cargaBien && antesDeLaGracia === 0 && despues === 1,
      { cargaBien, sube, ultima, esperada: cargaDe(tiro, 400), antesDeLaGracia, despues, llamadas: llamadas.slice(0, 6) },
    );
    /*
     * El asiento 3 carga y sale su bala; su estado de cargar sigue un momento en la sala (llega en otro tic): se suelta,
     * no vuelve a empezar, y al irse el estado no se cancela nada.
     */
    const pleno = tiro.niveles[tiro.niveles.length - 1] as (typeof tiro.niveles)[number];
    const chispazo = tiro.niveles[0] as (typeof tiro.niveles)[number];
    estados.set(3, cargando(2000));
    for (let t = 2000; t <= 3400; t += 16) escena.cadaFotograma(t, null);
    /*
     * Desde (33; 24,4): hacia el norte (rumbo 0) una fachada lo para a unos 6 m; hacia el oeste (192) la calle está
     * libre y llega a su alcance. El pleno va al norte y el chispazo al oeste: uno parado y otro entero.
     */
    const vista = (id: number, de: number, p: number, r: number): BalaVista => ({ id, de, p, x: 33, z: 24.4, r, salidaMs: 3410 });
    const suceso = (sc: SucesoDelTic, bala: BalaVista | null): Novedad => ({ tipo: 'suceso', k: 1, llegoMs: 3410, suceso: sc, anuncio: null, bala, entidad: null, monton: null, apuntado: null });
    cola.push(suceso({ e: 'bala', id: 41, de: 3, p: pleno.proyectil, x: 3300, z: 2440, r: 0, t: 5 }, vista(41, 3, pleno.proyectil, 0)));
    escena.drenar(3410);
    for (let t = 3416; t <= 3600; t += 16) escena.cadaFotograma(t, null);
    estados.delete(3);
    for (let t = 3616; t <= 3900; t += 16) escena.cadaFotograma(t, null);
    const sacudidaAntes = escena.sacudida;
    cola.push(suceso({ e: 'estalla', bala: 41, x: 150, z: 0 }, vista(41, 3, pleno.proyectil, 0)));
    escena.drenar(3950);
    const sacudidaDelPleno = escena.sacudida;
    escena.sacudida = 0;
    cola.push(suceso({ e: 'bala', id: 42, de: 2, p: chispazo.proyectil, x: 3300, z: 2440, r: 192, t: 5 }, vista(42, 2, chispazo.proyectil, 192)));
    cola.push(suceso({ e: 'estalla', bala: 42, x: 150, z: 0 }, vista(42, 2, chispazo.proyectil, 192)));
    escena.drenar(4000);
    const sacudidaDelChispazo = escena.sacudida;
    /* Hasta dónde lo pinta: donde lo para la cuenta de la sala (la estructura, el límite), sin pasar de su alcance. */
    const hasta = (n: (typeof tiro.niveles)[number], r: number): number => {
      const pr = lectura.proyectil(n.proyectil);
      if (pr === null) return n.alcance;
      const { parada } = paradaDeLaBalaEn(lectura.liza, lectura.arena, Math.round(33 * UNO), Math.round(24.4 * UNO), r, pr);
      return Math.min(n.alcance, parada / UNO);
    };
    const esperados = [hasta(pleno, 0), hasta(chispazo, 192)];
    comprobar(
      'la carga de otro que acaba en su `bala` se suelta, no se cancela ni vuelve a empezar aunque su estado de cargar tarde en irse; su rayo llega hasta donde lo para la cuenta de la sala (sin pasar de su alcance); su pleno a 1,5 m me sacude y su chispazo no',
      cuantas('soltar 3') === 1 &&
        cuantas('empezar 3') === 1 &&
        cuantas('cancelar 3') === 0 &&
        destinos.length === 2 &&
        destinos.every((d, i) => Math.abs(d - (esperados[i] as number)) < 1e-6 && d > 0) &&
        sacudidaAntes === 0 &&
        sacudidaDelPleno > 0.3 &&
        sacudidaDelChispazo === 0,
      { llamadas: llamadas.filter((c) => c.endsWith(' 3')), destinos, esperados, sacudidaAntes, sacudidaDelPleno, sacudidaDelChispazo },
    );
    nota(`rayos ajenos de prueba: el pleno llega a ${(destinos[0] ?? 0).toFixed(2)} m (alcance ${pleno.alcance.toFixed(0)}), el chispazo a ${(destinos[1] ?? 0).toFixed(2)} m`);
    comprobar(
      'y suena: la carga de otro con su voz, su pleno con el rayo y el trueno, su chispazo corto',
      sonados.includes('carga-rayo') && sonados.includes('rayo') && sonados.includes('trueno') && sonados.includes('rayo-corto'),
      sonados,
    );
    /*
     * Un cuerpo que se cruza: el rayo de otro se pinta HASTA ÉL (lo predice `escenificar.ts`, como el propio), no hasta
     * la estructura para luego saltar cuando llega su `estalla`. Un asiento (sin fuego amigo) y uno que ya se va, no.
     */
    cuerpos.push({ id: 1, x: 31, z: 24.4, gesto: 'reposo' }, { id: 21, x: 30, z: 24.4, gesto: 'desalojable' }, { id: 30, x: 29, z: 24.5, gesto: 'reposo' });
    cola.push(suceso({ e: 'bala', id: 43, de: 2, p: chispazo.proyectil, x: 3300, z: 2440, r: 192, t: 5 }, vista(43, 2, chispazo.proyectil, 192)));
    escena.drenar(4100);
    const alCuerpo = destinos[2] ?? -1;
    /* Entra en el corro de medio metro del cuerpo que está a 4 m y a 0,1 m de la recta. */
    const alCorro = 4 - Math.sqrt(0.25 - 0.01);
    comprobar(
      'el rayo de otro se pinta hasta el primer ENEMIGO que se le cruza (predicho): ni hasta la estructura, ni lo paran un asiento (sin fuego amigo) o uno que ya se va',
      destinos.length === 3 && Math.abs(alCuerpo - alCorro) < 1e-6 && (destinos[1] as number) > 10,
      { alCuerpo, alCorro, sinCuerpos: destinos[1] },
    );
  }
}

/*
 * EL RAYO, ENCHUFADO AL JUEGO (revisión 1 del frente: quitando cualquiera de estas cuatro conexiones, la batería seguía
 * en verde). En la fuente sin comentarios: la raíz de los efectos pinta la pieza del rayo y pone el rayo al día en su
 * fotograma; el posproceso le pasa al compositor lo que el rayo pone en la imagen; y las luces encienden el foco del
 * destello en cada fotograma. Lo que se VE (que el canal se pinta, que el foco alumbra, que llega el fogonazo) lo mira
 * `verify:quiebro-gl` en la GPU con el banco del rayo.
 */
{
  const fuente = (ruta: string): string => soloCodigo(readFileSync(new URL(`../src/quiebro/${ruta}`, import.meta.url), 'utf8'));
  /** El trozo de `texto` que va de `desde` a la primera aparición de `hasta` después (vacío si falta alguno). */
  const trozo = (texto: string, desde: RegExp, hasta: string): string => {
    const m = desde.exec(texto);
    if (m === null) return '';
    const fin = texto.indexOf(hasta, m.index + m[0].length);
    return fin < 0 ? '' : texto.slice(m.index, fin + hasta.length);
  };
  const juezDelCableado = (efectos: string, posproceso: string, luz: string): string[] => {
    const malos: string[] = [];
    const fotograma = trozo(efectos, /useFrame\(\(\) => \{/, '}, -1);');
    if (!/sistema\.fotograma\(ahora\);[\s\S]*evaluarLosRayos\(sistema, ahora\);/.test(fotograma)) malos.push('Efectos.tsx: el fotograma de la raíz no llama a evaluarLosRayos(sistema, ahora) tras sistema.fotograma');
    if (!/<RayosDelRayo sistema=\{sistema\} \/>/.test(efectos)) malos.push('Efectos.tsx: no monta <RayosDelRayo sistema={sistema} />');
    const pinta = trozo(posproceso, /c\.pintar\(estado\.scene, estado\.camera, \{/, '});');
    if (!/\brayo\b/.test(pinta)) malos.push('Posproceso.tsx: el compositor no recibe `rayo`');
    if (!/props\.sistema\?\.rayos\.imagen/.test(posproceso)) malos.push('Posproceso.tsx: no lee sistema.rayos.imagen');
    const actualizar = trozo(luz, /\n {2}actualizar\(/, '\n  }\n');
    if (!/this\.seguirElDestello\(\);/.test(actualizar)) malos.push('luz.ts: LucesDeLaNoche.actualizar no llama a seguirElDestello');
    return malos;
  };
  const efectos = fuente('efectos/Efectos.tsx');
  const posproceso = fuente('posproceso/Posproceso.tsx');
  const luz = fuente('atmosfera/luz.ts');
  const malos = juezDelCableado(efectos, posproceso, luz);
  comprobar('el rayo está ENCHUFADO: Efectos.tsx monta su pieza y lo pone al día en el fotograma, Posproceso.tsx le pasa al compositor su imagen y luz.ts enciende el foco en cada fotograma', malos.length === 0, malos);
  /* LA VACUNA: sin cada una de las cuatro conexiones (las mutaciones A, C, D y E de la revisión), el juez la señala. */
  const sin = (texto: string, quitar: string): string => (texto.includes(quitar) ? texto.replace(quitar, '') : `${texto}\n/* no estaba: ${quitar} */`);
  const vacunas = [
    juezDelCableado(sin(efectos, 'evaluarLosRayos(sistema, ahora);'), posproceso, luz),
    juezDelCableado(sin(efectos, '<RayosDelRayo sistema={sistema} />'), posproceso, luz),
    juezDelCableado(efectos, sin(posproceso, '...(imagen === undefined ? {} : { rayo }),'), luz),
    juezDelCableado(efectos, posproceso, sin(luz, 'this.seguirElDestello();')),
  ];
  comprobar(
    'VACUNA del cableado: sin evaluarLosRayos, sin la pieza, sin la imagen al compositor o sin el foco, el juez señala esa conexión (y sólo ésa)',
    vacunas.every((v) => v.length === 1),
    vacunas,
  );
}

terminar(95);
