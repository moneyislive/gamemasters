/**
 * EL DESIERTO DE ALREDEDOR: lo que hay MÁS ALLÁ del tablero.
 *
 * ═══ QUÉ PROBLEMA RESUELVE, QUE NO ES DECORAR ═══
 *
 * Debajo del tablero hay una mesa (`geometriaDeLaMesa`), y era de un verde casi negro
 * —`#2b3524`, luminancia 50— para que las juntas entre losas no enseñaran el cielo. Eso lo
 * cumplía y traía dos cosas malas que Miguel vio en cuanto se sentó:
 *
 *   · El tablero parecía flotar sobre un agujero. Un plano negro no es un sitio.
 *   · Y el reloj de arena, con su marco horneado casi negro, se perdía contra él.
 *
 * Contado en luminancia, que es lo que decide si dos cosas se distinguen: el prado va a 139,
 * la senda a 142 y la villa a 148 — **las tres casi iguales**—, el faldón de la losa a 61 y la
 * mesa vieja a 50. O sea que el canto oscuro de cada losa se confundía con el fondo, que es
 * justo lo que hace que un tablero no se lea como piezas puestas.
 *
 * Con la arena a 200 el faldón recorta contra ella con 140 de diferencia, y el reloj también.
 *
 * ═══ Y POR QUÉ OCHO Y NO CUARENTA ═══
 *
 * Porque lo que rodea al tablero no puede competir con él. Ocho piezas grandes y separadas
 * dicen «esto es un desierto» y se leen de un vistazo desde la cámara de mesa; cuarenta
 * piezas pequeñas dicen «aquí hay cosas» y convierten el borde en ruido. Es la misma regla
 * que el atrezo de las losas, donde lo menudo se recorta por distancia.
 *
 * ═══ CÓMO SE REPARTEN, QUE NO ES AL AZAR ═══
 *
 * Al azar salen apelotonadas: ocho tiradas independientes dejan huecos de medio tablero y
 * parejas pegadas, y eso no se lee como un paisaje sino como un descuido. Se reparte el
 * contorno en OCHO SECTORES y se pone una pieza en cada uno, con su ángulo y su distancia
 * movidos dentro del sector. Así nunca hay dos juntas ni un lado vacío, y sigue sin parecer
 * una fila.
 *
 * Todo sale de la semilla de la mesa: la misma partida enseña el mismo desierto en las cinco
 * pantallas y después de recargar.
 */
import { GRUESO_DE_LOSA, LADO_DE_LOSA } from './medidas';
import { ALTURA_DE_UNA_PERSONA } from '../escala';
import { sorteo } from './losa';
import { MODELO } from '../nombres';

/**
 * CUÁNTO SOBRESALE LA ARENA POR CADA LADO DEL TABLERO.
 *
 * Eran 0,75 losas, lo justo para que no se viera el canto de la mesa. Ahora hace falta sitio
 * donde poner el desierto: dos losas dan una banda de 350 unidades —ciento cuarenta personas—
 * por la que el paisaje respira sin que la mesa crezca tanto que el tablero parezca pequeño.
 */
export const MARGEN_DE_LA_ARENA = LADO_DE_LOSA * 2;

/** Cuántas piezas hay en el desierto. Las que pidió Miguel: muy pocas y desperdigadas. */
export const CUANTAS_EN_EL_DESIERTO = 8;

/**
 * LO QUE CRECE EN LA ARENA.
 *
 * Roca, piedra y tocón, y nada más. No es una lista de gustos: son las piezas del pack cuyo
 * color horneado —grises y pardos— no pelea con la arena, y las únicas que un sitio seco
 * puede tener sin mentir. Un árbol o un almiar aquí dirían que esto es un prado.
 *
 * Todas están ya en `tablero.glb` porque las losas las usan, así que el desierto no baja ni
 * un byte de más.
 */
export const LO_QUE_CRECE_EN_LA_ARENA: readonly string[] = [
  MODELO.rocaA,
  MODELO.rocaB,
  MODELO.rocaC,
  MODELO.rocaD,
  MODELO.rocaE,
  MODELO.piedra,
];

/**
 * LO ALTOS QUE SALEN, EN PERSONAS.
 *
 * ═══ POR QUÉ EN PERSONAS Y NO EN «ESCALA» ═══
 *
 * Porque las piezas del pack NO miden lo mismo. Medido en `tablero.glb`, a escala uno:
 * `roca-a` 0,15 personas, `roca-b` 0,29, `roca-d` 0,35, `roca-c` y `roca-e` 0,42,
 * `piedra` 0,60. **Cuatro veces de diferencia entre la mayor y la menor.** Con una escala
 * común, la misma cuenta daba un peñasco y un guijarro, y en el tablero se veía: parecía
 * gravilla tirada en vez de un desierto.
 *
 * Así que aquí se pide el ALTO y es la escena la que, midiendo la caja del modelo que le
 * toque, saca la escala que hace falta. Eso además sobrevive al día que alguien recompile el
 * pack con otro tamaño, que con una tabla de escalas a mano no pasaría.
 *
 * Entre cuatro y nueve personas: peñascos de siete a veintitrés metros. Se leen desde la
 * cámara de mesa —a quinientas unidades y con un lienzo de novecientos, cincuenta píxeles— y
 * al pasar andando al lado siguen siendo rocas y no montañas.
 */
const MAS_BAJO = ALTURA_DE_UNA_PERSONA * 4;
const MAS_ALTO = ALTURA_DE_UNA_PERSONA * 9;

/**
 * A QUÉ DISTANCIA DEL CANTO DEL TABLERO, en losas.
 *
 * ═══ POR QUÉ TAN CERCA, Y NO REPARTIDAS POR TODA LA ARENA ═══
 *
 * Porque `camaraDeMesa` CIÑE el tablero: lo encuadra con un 4 % de aire, así que lo que está
 * fuera del tablero está fuera de la pantalla salvo por la holgura que deja el desajuste
 * entre la forma del tablero y la del lienzo. Medido con la sonda en un tablero de dos losas
 * sobre un lienzo de 604x922: **setenta y dos unidades de holgura a cada lado**, o sea 0,41
 * losas. Repartidas por la banda entera, siete de las ocho caían fuera de cuadro y el
 * desierto no existía para quien juega.
 *
 * Entre dos y ocho décimas de losa quedan justo fuera del canto —sin taparlo— y dentro del
 * cuadro por el lado que tiene holgura. Las que caen por el lado ceñido se ven al andar, que
 * es la otra mitad de para qué están.
 */
const MAS_CERCA = 0.2;
const MAS_LEJOS = 0.8;

/** Una pieza del desierto, ya en coordenadas del mundo. */
export interface EnElDesierto {
  readonly pieza: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly giro: number;
  /** Lo alto que tiene que salir, en unidades del mundo. La escala la saca quien la pinta. */
  readonly alto: number;
}

/** El rectángulo que ocupan las losas puestas, en unidades del mundo. */
function loQueOcupanLasLosas(
  losas: readonly { readonly x: number; readonly y: number }[],
): { x0: number; x1: number; z0: number; z1: number } | null {
  if (losas.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const l of losas) {
    if (l.x < minX) minX = l.x;
    if (l.x > maxX) maxX = l.x;
    if (l.y < minY) minY = l.y;
    if (l.y > maxY) maxY = l.y;
  }
  /* La `y` del tablero crece al norte y la `z` al sur: por eso se cruzan. */
  return {
    x0: (minX - 0.5) * LADO_DE_LOSA,
    x1: (maxX + 0.5) * LADO_DE_LOSA,
    z0: -(maxY + 0.5) * LADO_DE_LOSA,
    z1: -(minY - 0.5) * LADO_DE_LOSA,
  };
}

/**
 * DÓNDE CORTA UN RAYO DESDE EL CENTRO AL BORDE DE UN RECTÁNGULO.
 *
 * Es lo que permite repartir por sectores sin que las piezas se metan en el tablero: para
 * cada ángulo se sabe a qué distancia empieza la arena (el borde del tablero) y a cuál se
 * acaba (el borde de la mesa), y la pieza va entre las dos.
 */
function hastaElBorde(medioAncho: number, medioAlto: number, angulo: number): number {
  const cx = Math.abs(Math.cos(angulo));
  const cz = Math.abs(Math.sin(angulo));
  const porX = cx < 1e-9 ? Number.POSITIVE_INFINITY : medioAncho / cx;
  const porZ = cz < 1e-9 ? Number.POSITIVE_INFINITY : medioAlto / cz;
  return Math.min(porX, porZ);
}

/**
 * LO QUE HAY EN EL DESIERTO, para un tablero y una semilla.
 *
 * Devuelve las piezas ya en coordenadas del mundo, listas para instanciar. Sin `three` y sin
 * ganchos: un comprobador de Node puede pedirlas y medir dónde caen, que es la única forma de
 * saber que ninguna se ha metido encima de una losa.
 */
export function loQueHayEnElDesierto(
  losas: readonly { readonly x: number; readonly y: number }[],
  semilla: number,
): readonly EnElDesierto[] {
  const caja = loQueOcupanLasLosas(losas);
  if (caja === null) return [];

  const centroX = (caja.x0 + caja.x1) / 2;
  const centroZ = (caja.z0 + caja.z1) / 2;
  const medioAncho = (caja.x1 - caja.x0) / 2;
  const medioAlto = (caja.z1 - caja.z0) / 2;

  const tira = sorteo(semilla ^ 0x5eed);
  const salida: EnElDesierto[] = [];
  for (let i = 0; i < CUANTAS_EN_EL_DESIERTO; i++) {
    /*
     * El ángulo se mueve dentro de su sector y no de cero a dos pi: así ninguna pieza se le
     * echa encima a la de al lado, y el reparto sigue sin ser una fila.
     */
    const angulo = ((i + 0.15 + tira() * 0.7) / CUANTAS_EN_EL_DESIERTO) * Math.PI * 2;
    const empiezaLaArena = hastaElBorde(medioAncho, medioAlto, angulo);
    /*
     * La distancia se mide EN LOSAS desde el canto del tablero, y no como fracción de la
     * banda de arena: así no cambia de sitio el día que la banda se haga más ancha, y se
     * puede razonar en la misma unidad en la que se razona todo lo demás aquí.
     */
    const radio = empiezaLaArena + LADO_DE_LOSA * (MAS_CERCA + tira() * (MAS_LEJOS - MAS_CERCA));

    const alto = MAS_BAJO + tira() * (MAS_ALTO - MAS_BAJO);
    const cual = LO_QUE_CRECE_EN_LA_ARENA[Math.floor(tira() * LO_QUE_CRECE_EN_LA_ARENA.length)];
    salida.push({
      pieza: cual ?? MODELO.rocaA,
      x: centroX + Math.cos(angulo) * radio,
      z: centroZ + Math.sin(angulo) * radio,
      /* Apoyadas en la mesa, que está un pelo por debajo de la cara de abajo de las losas. */
      y: -GRUESO_DE_LOSA * 1.02,
      giro: tira() * Math.PI * 2,
      alto,
    });
  }
  return salida;
}
