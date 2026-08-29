/**
 * De qué color es la app AHORA MISMO.
 *
 * EL PROBLEMA. Hasta la Momia había un solo tema y podía ser una constante:
 * `tema.ts` exporta `color`, cuarenta pantallas lo importan y se acabó. Con dos
 * juegos eso deja de valer, y no por gusto de tener dos paletas: **a qué se
 * juega no se sabe hasta que hay partida**. La app es UN binario que sirve para
 * los dos, la elección del juego la hizo quien dirige en el taller, y llega al
 * móvil dentro de la vista (`vista.sesion.juego`). Una constante de módulo se
 * fija al importar, que es antes de que exista ninguna partida y antes de haber
 * hablado con el servidor: no hay ningún instante en el arranque en el que la
 * respuesta sea conocida.
 *
 * Y no es un caso raro de laboratorio: el mismo teléfono juega a CLUEDO un
 * sábado y a la Momia el siguiente sin reinstalar nada, y la app se recarga en
 * caliente en web. Lo que decide el color es la partida, no la compilación.
 *
 * POR QUÉ UN HOOK Y NO UN `Provider` PROPIO. Porque el dato ya está en un
 * contexto que envuelve toda la app —el de la partida— y montar un segundo
 * proveedor encima solo añadiría una capa que copia el valor del de al lado y
 * una forma nueva de que se desincronicen. El hook lee la fuente directamente.
 *
 * POR QUÉ NO PASA NADA CON CLUEDO. Para CLUEDO —y para cualquier vista sin
 * partida: la portada, la entrada, un error de red— esto devuelve el MISMO
 * objeto `color` de siempre, por identidad, no una copia con los mismos valores.
 * Así que allí donde se pinta CLUEDO se pintan exactamente los mismos bytes que
 * antes de que este fichero existiera. La regla que manda se cumple por
 * construcción, no por cuidado.
 */
import { color, fondoMesa } from './tema';
import { COLOR_MOMIA, type Paleta } from './tema-momia';
import { COLOR_SOMBRAS } from './tema-sombras';
import { usePartidaSiLaHay } from './estado';
import type { JuegoId } from '../../shared/juegos';

/**
 * La paleta de un juego, sin React de por medio.
 *
 * Aparte del hook para poder EJECUTARLA en una comprobación: que CLUEDO siga
 * recibiendo el objeto de siempre es la clase de invariante que se afirma en un
 * comentario y se rompe seis meses después. Aquí se puede afirmar con `===`.
 */
/**
 * PASA A SER UNA TABLA, y eso arregla una trampa que el manual señalaba con el
 * dedo: «`paletaDe()` no es una tabla: es un ternario contra 'momia', de modo
 * que escribir tu paleta y olvidar esa rama deja la app entera con el tema de la
 * casa sin un solo error». Con un tercer juego, un ternario anidado habría
 * hecho la trampa el doble de fácil.
 *
 * CLUEDO SIGUE RECIBIENDO EL MISMO OBJETO POR IDENTIDAD, que es lo único que no
 * se puede tocar: la tabla no lo incluye y el respaldo es `color`, el de
 * siempre. Lo comprueba con `===` la propia app.
 */
const PALETAS: Record<string, Paleta> = {
  momia: COLOR_MOMIA,
  sombras: COLOR_SOMBRAS,
};

export function paletaDe(juego: JuegoId | undefined): Paleta {
  return PALETAS[juego ?? ''] ?? color;
}

/** La paleta del juego que se está jugando en este móvil ahora mismo. */
export function useTema(): Paleta {
  const partida = usePartidaSiLaHay();
  return paletaDe(partida?.vista?.sesion.juego);
}

/** A qué se juega en este móvil ahora mismo. `undefined` fuera de una partida. */
export function useJuego(): JuegoId | undefined {
  const partida = usePartidaSiLaHay();
  return partida?.vista?.sesion.juego;
}

/*
 * AQUÍ HABÍA `useEsMomia()` Y `useEsSombras()`, y se han retirado por dos
 * motivos que conviene dejar escritos.
 *
 * El primero es que no los llamaba nadie: quedaron muertos al pasar el fondo y
 * el ornamento a tablas. El segundo importa más: son la FORMA equivocada. Un
 * predicado por juego invita a escribir `if (esMomia) …` en una pantalla común,
 * que es exactamente el reparto que este fichero existe para evitar. Lo que un
 * juego tiene de propio se declara en una tabla —`PALETAS`, `ORNAMENTOS`,
 * `FONDOS`— y se pregunta por clave; así, añadir un juego es añadir una fila y
 * no encontrar todos los sitios donde alguien preguntó por el suyo.
 *
 * Si algún día hace falta saber a qué se juega, ahí está `useJuego()`.
 */

/**
 * El signo que va en medio del divisor ornamental.
 *
 * Es un detalle diminuto y de los que más trabajan: sale seis o siete veces por
 * pantalla, así que cambiarlo tiñe toda la lectura sin ocupar sitio. Estaba
 * escrito como un ternario dentro de `ui.tsx`; sacarlo aquí es lo que permite
 * que un tercer juego traiga el suyo sin tocar un componente común.
 *
 * TODOS SON DEL PLANO BÁSICO. Un carácter fuera de él se pinta en Windows y sale
 * como un cuadradito en iOS y en Android, que es donde de verdad se mira esto.
 */
const ORNAMENTOS: Record<string, string> = {
  momia: '☥',
  /* Un rombo hueco: la marca de camino, y lo más parecido a un mon sin serlo. */
  sombras: '◇',
};

export function useOrnamento(): string {
  return ORNAMENTOS[useJuego() ?? ''] ?? '❦';
}

/**
 * El degradado de fondo del juego que se esté jugando.
 *
 * TABLA, como la paleta y el ornamento. Era una cadena de `if` por juego y era
 * la última que quedaba en este fichero: la trampa que describe el manual de
 * montaje —«se olvida la rama del fondo y la app sale con marcos y botones del
 * color nuevo sobre el fieltro verde de CLUEDO, que engaña más que no
 * tematizarla»— vivía justo aquí.
 */
/**
 * El fondo de la Momia: la piedra caliza tostada arriba, la noche del desierto
 * abajo. El tercer tono tira a azul a propósito —es la única frialdad de toda
 * la paleta— porque sin ella el degradado entero es marrón y la pantalla se ve
 * sucia en vez de nocturna.
 */
const FONDO_MOMIA = ['#0b0805', '#150e07', '#0a0c16'] as const;

/**
 * El fondo de El Paso de las Sombras: la noche del monte.
 *
 * Al revés que el de la Momia. Allí el degradado va de caliente a frío porque
 * hay una lámpara dentro y la noche está fuera; aquí la noche está DENTRO —se
 * anda por el monte— y lo que hay lejos es el añil del cielo. El tercer tono
 * tira a verde muy oscuro: es el bosque, y sin él los tres azules se leen como
 * un degradado de aplicación en vez de como un sitio.
 */
const FONDO_SOMBRAS = ['#080a11', '#0f1526', '#0a1211'] as const;

/*
 * LA TABLA VA DEBAJO DE LOS DOS DEGRADADOS, y no es cuestión de gusto: un
 * `const` de módulo se evalúa al importar, en orden, así que una tabla escrita
 * ARRIBA que los nombre revienta con «Cannot access 'FONDO_MOMIA' before
 * initialization» al cargar el fichero — y este lo carga `ui.tsx`, o sea la app
 * entera, en blanco y antes de la primera pantalla. Se escribió así primero y se
 * cazó al ejecutarlo, no al compilarlo.
 */
const FONDOS: Record<string, readonly [string, string, string]> = {
  momia: FONDO_MOMIA,
  sombras: FONDO_SOMBRAS,
};

export function useFondo(): readonly [string, string, string] {
  return FONDOS[useJuego() ?? ''] ?? fondoMesa;
}

/**
 * `conAlfa` se REEXPORTA desde `tema.ts`, donde vive ahora.
 *
 * Se mudó para que se pueda comprobar: este fichero importa el contexto de la
 * partida —React— y `tema.ts` no importa nada, así que allí el comprobador puede
 * cargar la función de verdad en vez de escribirse una copia. Se reexporta desde
 * aquí para que ninguno de los diez ficheros que la importan tenga que cambiar.
 */
export { conAlfa } from './tema';
