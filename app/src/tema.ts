/**
 * Sistema visual de la app, calcado del de la plataforma web.
 *
 * Los valores salen literalmente de `client/src/styles/theme.css`: la app y el
 * taller del Game Master tienen que parecer el mismo producto, no dos primos
 * lejanos. Si allí se cambia un color, aquí también.
 */

export const color = {
  feltoscuro: '#0b1710',
  felt900: '#10241a',
  felt800: '#14301f',
  felt700: '#1a3f2a',
  caoba900: '#1f120c',
  caoba800: '#2b1a12',
  caoba700: '#3e2723',
  oro500: '#c9a227',
  oro400: '#d9b64a',
  oro300: '#e8cf7f',
  laton: '#b08d2e',
  burdeos700: '#6d1a2a',
  burdeos600: '#8c2337',
  pergamino: '#f1e5c9',
  pergaminoTenue: '#d9c9a3',
  tinta: '#1c1410',
  peligro: '#b3402f',
} as const;

export const fuente = {
  // La web usa Cinzel Decorative para los títulos grandes; a tamaño de móvil su
  // filigrana se emborrona, así que aquí manda Cinzel Bold, que es su hermana.
  display: 'Cinzel_700Bold',
  titulo: 'Cinzel_600SemiBold',
  tituloFuerte: 'Cinzel_700Bold',
  cuerpo: 'CormorantGaramond_400Regular',
  cuerpoMedio: 'CormorantGaramond_600SemiBold',
  cuerpoCursiva: 'CormorantGaramond_400Regular_Italic',
} as const;

export const espacio = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

/**
 * Alto de la barra de pestañas.
 *
 * Vive aquí porque lo necesitan dos sitios: la propia barra y el hueco que
 * cada pantalla tiene que dejar debajo. Cuando el valor estaba solo en la
 * barra, el contenido reservaba menos de lo que ella ocupa y en pantallas
 * cortas lo último del scroll quedaba escondido detrás.
 */
export const ALTO_BARRA = 74;

/**
 * El botón del Mayordomo, encajado en la muesca central de la barra.
 *
 * Estos cuatro valores son los mandos de la forma; `barra-geometria.ts` deduce
 * de ellos todo lo demás. Salieron de montar la barra y fotografiarla a 320,
 * 375 y 430 puntos:
 *
 *  · R = 30 da un botón de 60, por encima del mínimo de 44 que se puede pulsar
 *    sin apuntar.
 *  · SALIENTE = 26 deja fuera el 43% del botón: emerge de la barra sin llegar a
 *    flotar sobre ella.
 *  · HOLGURA = 7 es el aire entre el botón y el filo. Menos y se tocan; más y
 *    deja de parecer que uno encaja en el otro.
 *  · FILETE = 14 es lo que suaviza la entrada a la muesca. Sin él hay un
 *    ángulo duro y la muesca parece un mordisco.
 *
 * Cuidado al tocarlos: la muesca se hunde hasta 2R + HOLGURA, que no depende
 * del saliente. Con R por encima de 42 perfora la barra por abajo y el filo
 * dorado se parte en dos trozos sueltos.
 */
export const R_BOTON = 30;
export const SALIENTE_BOTON = 26;
export const HOLGURA_BOTON = 7;
export const FILETE_BARRA = 14;

/**
 * Lo que ocupa la barra contando el saliente del botón.
 *
 * Es lo que cada pantalla tiene que reservar por debajo de su contenido. Si se
 * reserva solo `ALTO_BARRA`, la cúspide del botón tapa lo último del scroll,
 * que es exactamente el fallo que costó arreglar cuando la barra creció.
 */
export const ALTO_BARRA_TOTAL = ALTO_BARRA + SALIENTE_BOTON;

export const radio = {
  sm: 6,
  md: 10,
  lg: 16,
  redondo: 999,
} as const;

/** Tamaños pensados para leerse a media luz y con prisa. */
export const texto = {
  microCaps: { fontFamily: fuente.titulo, fontSize: 11, letterSpacing: 2.2 },
  etiqueta: { fontFamily: fuente.titulo, fontSize: 12.5, letterSpacing: 1.6 },
  cuerpo: { fontFamily: fuente.cuerpo, fontSize: 18, lineHeight: 27 },
  cuerpoGrande: { fontFamily: fuente.cuerpo, fontSize: 20, lineHeight: 30 },
  titulo: { fontFamily: fuente.titulo, fontSize: 20, letterSpacing: 1.2 },
  tituloGrande: { fontFamily: fuente.display, fontSize: 30, lineHeight: 38 },
  numero: { fontFamily: fuente.tituloFuerte, fontSize: 44, letterSpacing: 2 },
} as const;

/** Degradado de fondo: el fieltro de la mesa con luz de lámpara al fondo. */
export const fondoMesa = [color.feltoscuro, color.felt900, '#0d1c14'] as const;
/** Fondo de las pantallas "de papel": el dosier sobre la mesa. */
export const fondoPapel = ['#f6ecd6', color.pergamino, '#e9dbba'] as const;

export const sombra = {
  shadowColor: '#000',
  shadowOpacity: 0.5,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 10,
} as const;

/**
 * Un color con transparencia.
 *
 * ═══ POR QUÉ VIVE AQUÍ Y NO EN `tema-juego.ts` ═══
 *
 * Estaba allí, que es donde se usa, y allí NO SE PODÍA COMPROBAR: `tema-juego`
 * importa el contexto de la partida, o sea React, así que un comprobador que
 * quisiera ejecutarlo tendría que arrastrar media app. El resultado fue que
 * `verificar-tema.mjs` se escribió una COPIA de esta función y comparaba su copia
 * contra una lista escrita a mano: aritmética entre dos constantes, verde
 * garantizado, imposible de romper.
 *
 * Este fichero no importa nada. Con la función aquí, el comprobador carga la de
 * verdad y la aplica a los colores de verdad, que es la diferencia entre
 * comprobar y aparentar. `tema-juego` la reexporta, así que ni un solo `import`
 * de los diez que la usan ha tenido que cambiar.
 *
 * ═══ QUÉ HACE, Y POR QUÉ IMPORTA TANTO ═══
 *
 * `ui.tsx` estaba lleno de `rgba(201,162,39,0.35)` escritos a mano, y resulta que
 * TODOS eran un token de aquí arriba con alfa: 201,162,39 es `oro500`, 31,18,12
 * es `caoba900`, 179,64,47 es `peligro`. Sustituirlos por `conAlfa(p.oro500,
 * 0.35)` devuelve para CLUEDO exactamente la misma cadena, carácter a carácter,
 * así que el cambio no puede alterar un píxel suyo aunque se quiera; y para los
 * otros juegos sale gratis el tinte equivalente de su oro.
 *
 * Se pasa el hexadecimal y no un objeto de color porque los estilos de React
 * Native se comparan por valor: devolver siempre una cadena mantiene el
 * `StyleSheet` comparable y no obliga a memorizar nada.
 */
export function conAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}
