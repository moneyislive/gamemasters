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
