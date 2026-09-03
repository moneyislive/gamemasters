/**
 * LO QUE DE LA ESCENA SE PUEDE COMPROBAR SIN UNA TARJETA GRÁFICA.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ DENTRO DE `delta.tsx` ═══
 *
 * Porque estaba, y no se podía probar. `delta.tsx` importa `three` y usa JSX: un
 * guion de Node que lo importara para mirar la tabla de colores arrastraría el
 * motor de dibujo entero, y `verify:escena` dejaría de poder correr en la batería.
 *
 * Aquí vive lo que es DATO y CUENTA —de qué color es cada terreno, cuántos puntos
 * lleva un número— y allí lo que es pintado. La frontera es la misma que ordena el
 * árbol: se separa por lo que se puede comprobar, no por lo que va junto en la
 * pantalla.
 */

/**
 * DE QUÉ COLOR ES CADA TERRENO, y qué pasa con uno que no conozcamos.
 *
 * Un juego trae los terrenos que quiera y esta tabla no puede conocerlos todos. Lo
 * importante es lo de abajo, en `colorDeTerreno`: un terreno desconocido NO
 * revienta la escena ni deja un hueco negro. Es la lección de `MUEBLES[m.mueble]`,
 * que este repositorio ya pagó una vez: un `Record` de claves finitas indexado con
 * un dato que llega por la red devuelve `undefined` sin que el compilador diga
 * nada, y revienta al pintar.
 */
export const PALETA: Readonly<Record<string, string>> = {
  /* Los seis de Riberas. */
  marisma: '#6a7f4f',
  carrizal: '#93a15a',
  salina: '#d8cfa8',
  cantil: '#8a8f96',
  vega: '#c8a44e',
  duna: '#e2d3a8',
  /* Y el vocabulario de colonización más corriente, para el juego nuevo. */
  bosque: '#3f6b45',
  pradera: '#8fae55',
  campo: '#d9b04a',
  colina: '#b1653c',
  montana: '#7d8590',
  desierto: '#e3d5a6',
};

/**
 * El color de reserva.
 *
 * Es un gris que se ve RARO a propósito entre teselas de colores: un terreno sin
 * color declarado tiene que cantar, no disimular. Si fuera un verde razonable,
 * nadie se enteraría de que falta una entrada en la tabla.
 */
export const TERRENO_DESCONOCIDO = '#5b5f66';

/** El color de un terreno, o el de reserva si esta versión no lo conoce. */
export function colorDeTerreno(terreno: string): string {
  return PALETA[terreno] ?? TERRENO_DESCONOCIDO;
}

/**
 * CUÁNTOS PUNTOS LLEVA UN NÚMERO.
 *
 * Son las formas de sacarlo con dos dados: el 2 y el 12 salen de una sola
 * combinación, el 7 de seis. Se calcula en vez de escribirse en una tabla porque
 * una tabla a mano es una tabla que alguien copia mal — y `verify:escena` la
 * contrasta contra los treinta y seis resultados por fuerza bruta, así que
 * «optimizar» esta fórmula rompe una comprobación en vez de un tablero.
 *
 * Fuera del 2..12 devuelve cero en vez de un número negativo: un juego puede usar
 * otro reparto de dados y esto no es quién para negarse.
 */
export function puntosDeLaCifra(cifra: number): number {
  const formas = 6 - Math.abs(7 - cifra);
  return formas > 0 ? formas : 0;
}
