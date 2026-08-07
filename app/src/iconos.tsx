/**
 * Los iconos de la barra, dibujados a mano.
 *
 * Antes eran emoji (⌛🎭📌✒🏆). Un emoji lo pinta el sistema operativo, así que
 * cambia de color y de forma según el móvil, y a este tamaño se lee como una
 * pegatina de colores en medio de una estética de trazo dorado. Estos son de
 * línea, comparten grosor con los ornamentos de la app y heredan el color de
 * quien los usa, que es lo que permite encenderlos al enfocar la pestaña.
 *
 * Todos viven en una caja de 48×48 y se dibujan pensando en verse a 23 píxeles:
 * cualquier hueco menor de dos unidades se cierra a ese tamaño y el icono se
 * convierte en una mancha.
 */
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

export interface PropsIcono {
  size?: number;
  color: string;
}

/** Rasgos comunes: el grosor está calculado para 23px de destino. */
const TRAZO = {
  fill: 'none',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function Lienzo({
  size = 23,
  color,
  children,
}: PropsIcono & { children: React.ReactNode }): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G stroke={color} {...TRAZO}>
        {children}
      </G>
    </Svg>
  );
}

/** La ronda: un reloj de bolsillo. La corona lo distingue de un reloj de pared. */
export function IconoRonda(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      <Circle cx={24} cy={27} r={14.5} />
      <Path d="M24 19.5 V27 l5 3.4" />
      <Path d="M20.5 8.5 h7" />
      <Path d="M24 8.5 v4" />
    </Lienzo>
  );
}

/** Tú: una máscara de teatro. Es el papel que interpretas, no tu cara. */
export function IconoPersonaje(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      <Path d="M10 12 h28 v14 a14 16 0 0 1-14 16 a14 16 0 0 1-14-16 z" />
      <Path d="M17.5 22.5 h4.5" />
      <Path d="M26 22.5 h4.5" />
      <Path d="M18.5 31.5 a7 5 0 0 0 11 0" />
    </Lienzo>
  );
}

/** El mapa: la planta de la casa, con sus estancias en el perímetro. */
export function IconoMapa(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      <Rect x={6.5} y={6.5} width={35} height={35} rx={3} />
      <Rect x={12.5} y={12.5} width={10} height={9} />
      <Rect x={25.5} y={12.5} width={10} height={9} />
      <Rect x={12.5} y={26.5} width={10} height={9} />
      <Rect x={25.5} y={26.5} width={10} height={9} />
    </Lienzo>
  );
}

/** El tablón: una cuartilla clavada con chincheta. */
export function IconoTablon(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      <Rect x={10} y={14} width={28} height={27} rx={2.5} />
      <Path d="M24 14 V7.5" />
      <Circle cx={24} cy={6} r={3.5} />
      <Path d="M16.5 23 h15" />
      <Path d="M16.5 31 h9" />
    </Lienzo>
  );
}

/** El cuaderno: la hoja escrita y la pluma cruzada. */
export function IconoCuaderno(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      <Path d="M10 7 h19 l9 9 v25 H10 z" />
      <Path d="M16.5 23.5 h11" />
      <Path d="M16.5 31.5 h15" />
      <Path d="M40 6 l3 3 -14 14 -4.5 1.5 1.5 -4.5 z" />
    </Lienzo>
  );
}

/** El perfil: la copa, que es lo que se guarda de cada velada. */
export function IconoPerfil(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      <Path d="M15 7 h18 v10 a9 9 0 0 1-18 0 z" />
      <Path d="M15 10 h-5 v3 a6 6 0 0 0 6 6" />
      <Path d="M33 10 h5 v3 a6 6 0 0 1-6 6" />
      <Path d="M24 26 v6" />
      <Path d="M16.5 41 h15 l-2.5-9 h-10 z" />
    </Lienzo>
  );
}

/**
 * El Mayordomo.
 *
 * Es el único que mezcla masa y trazo, y no es capricho: se probaron cinco
 * versiones fotografiándolas a los 30 píxeles reales del botón, y las de solo
 * línea perdían la chistera —que es justo lo que lo distingue de un detective o
 * de un mago—. La copa rellena es lo que sobrevive al tamaño; el busto de frac
 * es lo que lo hace elegante cuando se ve grande.
 */
export function IconoMayordomo({ size = 31, color }: PropsIcono): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* Copa */}
      <Path
        d="M17.5 12.6 V3.4 a1.7 1.7 0 0 1 1.7-1.7 h9.6 a1.7 1.7 0 0 1 1.7 1.7 v9.2 z"
        fill={color}
      />
      {/* Ala */}
      <Path d="M10.2 11.5 Q24 15.2 37.8 11.5 l0.5 2.9 Q24 18.1 9.7 14.4 z" fill={color} />
      <G fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={24} cy={22.4} r={5.6} />
        <Path d="M7.4 45.8 C7.4 41.4 7.9 38.4 10 36.1 C12.3 33.6 15.7 33.1 19 33.1 L24 38.6 L29 33.1 C32.3 33.1 35.7 33.6 38 36.1 C40.1 38.4 40.6 41.4 40.6 45.8 Z" />
      </G>
      {/* Pajarita */}
      <Path d="M20 30.5 L23.4 32.4 L20 34.3 Z M28 30.5 L24.6 32.4 L28 34.3 Z" fill={color} />
    </Svg>
  );
}
