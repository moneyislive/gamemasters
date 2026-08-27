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
import { usePartidaSiLaHay } from './estado';
import type { JuegoId } from '../../shared/juegos';

/**
 * La paleta de un juego, sin React de por medio.
 *
 * Aparte del hook para poder EJECUTARLA en una comprobación: que CLUEDO siga
 * recibiendo el objeto de siempre es la clase de invariante que se afirma en un
 * comentario y se rompe seis meses después. Aquí se puede afirmar con `===`.
 */
export function paletaDe(juego: JuegoId | undefined): Paleta {
  return juego === 'momia' ? COLOR_MOMIA : color;
}

/** La paleta del juego que se está jugando en este móvil ahora mismo. */
export function useTema(): Paleta {
  const partida = usePartidaSiLaHay();
  return paletaDe(partida?.vista?.sesion.juego);
}

/** `true` si lo que hay abierto es una partida de la Momia. */
export function useEsMomia(): boolean {
  const partida = usePartidaSiLaHay();
  return partida?.vista?.sesion.juego === 'momia';
}

/** El degradado de fondo del juego que se esté jugando. */
export function useFondo(): readonly [string, string, string] {
  return useEsMomia() ? FONDO_MOMIA : fondoMesa;
}

/**
 * El fondo de la Momia: la piedra caliza tostada arriba, la noche del desierto
 * abajo. El tercer tono tira a azul a propósito —es la única frialdad de toda
 * la paleta— porque sin ella el degradado entero es marrón y la pantalla se ve
 * sucia en vez de nocturna.
 */
const FONDO_MOMIA = ['#0b0805', '#150e07', '#0a0c16'] as const;

/**
 * Un color de la paleta con transparencia.
 *
 * ESTO ES LO QUE HACE QUE EL TEMA SEA POSIBLE SIN TOCAR CLUEDO. `ui.tsx` estaba
 * lleno de `rgba(201,162,39,0.35)` escritos a mano, y resulta que TODOS eran un
 * token de `tema.ts` con alfa: 201,162,39 es `oro500`, 31,18,12 es `caoba900`,
 * 179,64,47 es `peligro`. Sustituirlos por `conAlfa(p.oro500, 0.35)` devuelve
 * para CLUEDO exactamente la misma cadena, carácter a carácter, así que el
 * cambio no puede alterar un píxel suyo aunque se quiera; y para la Momia sale
 * gratis el tinte equivalente de su oro.
 *
 * Se pasa el hexadecimal y no un objeto de color porque los estilos de React
 * Native se comparan por valor: devolver siempre una cadena mantiene el
 * `StyleSheet` comparable y no obliga a memorizar nada.
 */
export function conAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}
