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
import type { IconoId } from '../../shared/juegos';

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

/**
 * El farol: el asistente de un juego que no transcurre en una casa señorial.
 *
 * Existe para demostrar que el icono del botón central es del juego y no de la
 * plataforma. Un mayordomo no pinta nada en una campaña de aventuras; un farol
 * —quien alumbra el camino— sí, y sirve igual para una oca o un juego de
 * exploración.
 */
export function IconoFarol({ size = 31, color }: PropsIcono): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* Asa y remate */}
      <G fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M17 8 a7 7 0 0 1 14 0" />
        <Path d="M24 4.5 V8" />
        <Path d="M14.5 12.5 h19" />
        <Path d="M16.5 41.5 h15" />
      </G>
      {/* Caja de cristal */}
      <Path
        d="M17.5 12.5 h13 l2.5 24 a1.6 1.6 0 0 1-1.6 1.8 H16.6 a1.6 1.6 0 0 1-1.6-1.8 z"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      {/* La llama */}
      <Path d="M24 20.5 c3.4 3.2 4.2 5.4 4.2 7.6 a4.2 4.2 0 0 1-8.4 0 c0-2.2 0.8-4.4 4.2-7.6 z" fill={color} />
    </Svg>
  );
}

/**
 * Todos los iconos, por su nombre en el manifiesto.
 *
 * Es un `Record` sobre la unión cerrada a propósito: si alguien añade un icono
 * al contrato y olvida dibujarlo, esto no compila. Sin eso, la pestaña saldría
 * en blanco en el móvil y nadie se enteraría hasta la noche de la partida.
 */
/**
 * Los tres iconos de El Misterio de la Momia.
 *
 * LO QUE ESTABA MAL EN LOS ANDAMIOS QUE SUSTITUYEN. No era el dibujo: era que
 * hablaban otro idioma. Venían en una caja de 24 con trazo 1,6, mientras que los
 * seis de CLUEDO viven en una de 48 con trazo 3. Puestos en la misma barra, los
 * de la Momia salían un 40% más finos que sus vecinos —el navegador escala la
 * caja pero no compensa el grosor— y se veía como lo que era: iconos de otro
 * juego de iconos pegados al lado. Estos comparten lienzo, grosor y remates con
 * los demás, así que la barra se lee como UNA barra aunque cambie de juego.
 *
 * Se dibujan pensando en 23 píxeles, igual que el resto: nada por debajo de dos
 * unidades sobrevive a ese tamaño.
 */

/**
 * El papiro: un rollo abierto, sujeto por sus dos varillas.
 *
 * Tenía que distinguirse a 23 píxeles de otros dos iconos de PAPEL que ya
 * existen —el tablón, que es una cuartilla con chincheta, y el cuaderno, que es
 * hoja y pluma—. Lo que los separa a ese tamaño no es el detalle sino la
 * silueta: el tablón es un rectángulo con un punto arriba, el cuaderno tiene una
 * diagonal cruzada, y este tiene dos barras horizontales gruesas arriba y abajo.
 * Se reconoce por el contorno, que es lo único que queda cuando el icono se
 * hace pequeño.
 */
export function IconoPapiro(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      {/* Las varillas del rollo. */}
      <Rect x={7.5} y={6.5} width={33} height={7} rx={3.5} />
      <Rect x={7.5} y={34.5} width={33} height={7} rx={3.5} />
      {/* La hoja tendida entre las dos. */}
      <Path d="M11 13.5 V34.5" />
      <Path d="M37 13.5 V34.5" />
      {/* Dos renglones, no tres: con tres el hueco entre ellos baja de dos
          unidades y a 23 píxeles la hoja se ve como una mancha rayada. */}
      <Path d="M16 21 h16" />
      <Path d="M16 27.5 h11" />
    </Lienzo>
  );
}

/**
 * El anj: la llave de la vida, que es de lo que va el sellado.
 *
 * El lazo es una elipse y no un círculo a propósito. Con círculo, para que el
 * hueco de dentro siga viéndose a 23 píxeles hay que agrandar el radio, y
 * entonces la cabeza se come el travesaño y el conjunto deja de leerse como un
 * anj y pasa a leerse como una llave inglesa. Alargándolo se gana hueco interior
 * sin robar anchura.
 */
export function IconoAnj(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      <Path d="M24 6 a7 8.5 0 0 1 0 17 a7 8.5 0 0 1 0-17 z" />
      <Path d="M24 22.5 V42" />
      <Path d="M11.5 27.5 H36.5" />
    </Lienzo>
  );
}

/**
 * El escarabajo: El Escriba, el asistente de la Momia.
 *
 * Va en el botón central, que es el único que se ve a 31 píxeles, así que aquí
 * —igual que el Mayordomo— se puede mezclar masa y trazo. Y hace falta: un
 * escarabajo de solo línea a ese tamaño es una mancha ovalada con patas, y no
 * se distingue de una araña ni de una tortuga.
 *
 * Lo que lo hace inconfundible es el DISCO SOLAR, que va relleno y encima. No es
 * adorno: Jepri es el escarabajo que empuja el sol, y esa forma —un círculo
 * macizo sobre una cúpula— no se parece a ningún otro bicho. Es exactamente la
 * misma lección que la copa del Mayordomo: lo que sobrevive al tamaño pequeño es
 * la masa, no el detalle.
 */
export function IconoEscarabajo({ size = 31, color }: PropsIcono): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* El sol que empuja. Relleno: es lo que aguanta a 31 píxeles. */}
      <Circle cx={24} cy={7.5} r={5} fill={color} />
      <G
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* El escudo del tórax, apoyado justo debajo del disco. */}
        <Path d="M14.5 20.5 a10 8.5 0 0 1 19 0 z" />
        {/* Los élitros. */}
        <Path d="M15 20.5 h18 v7.5 a9 12.5 0 0 1-18 0 z" />
        {/* La juntura de las alas: lo que lo vuelve escarabajo y no escudo. */}
        <Path d="M24 21.5 V40" />
        {/* Tres pares de patas, abriéndose hacia fuera. */}
        <Path d="M15.5 19 L7 13.5" />
        <Path d="M32.5 19 L41 13.5" />
        <Path d="M15 26.5 H6" />
        <Path d="M33 26.5 H42" />
        <Path d="M17 33.5 L9.5 39.5" />
        <Path d="M31 33.5 L38.5 39.5" />
      </G>
    </Svg>
  );
}

export const ICONOS: Record<IconoId, (p: PropsIcono) => JSX.Element> = {
  papiro: IconoPapiro,
  anj: IconoAnj,
  escarabajo: IconoEscarabajo,
  reloj: IconoRonda,
  mascara: IconoPersonaje,
  plano: IconoMapa,
  tablon: IconoTablon,
  cuaderno: IconoCuaderno,
  copa: IconoPerfil,
  mayordomo: IconoMayordomo,
  farol: IconoFarol,
};
