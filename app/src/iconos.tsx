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
import type { IconoDeArcade } from '../../shared/arcade';

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
export function IconoCartel(p: PropsIcono): JSX.Element {
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

/* ------------------------------------------------------------------------- */
/* Los dos de El Paso de las Sombras                                          */
/* ------------------------------------------------------------------------- */

/**
 * El torii: la puerta que marca el camino.
 *
 * Es el icono de la senda, y la elección tiene su razón: en un monte japonés, lo
 * que hay clavado en un cruce de caminos es un torii o una piedra con algo
 * escrito. El torii se reconoce a 23 píxeles por su SILUETA —dos verticales y
 * dos horizontales que sobresalen— y ningún otro icono de la barra tiene esa
 * forma. Una piedra habría sido un rectángulo más, indistinguible del tablón.
 *
 * El dintel de arriba sobresale por los dos lados y el travesaño de abajo no: es
 * lo único que separa un torii de una letra H girada, y a este tamaño es lo
 * único que se ve.
 */
export function IconoTorii(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      {/* El dintel (kasagi), que sobresale. */}
      <Path d="M6 12.5 H42" />
      {/* El travesaño (nuki), que no. */}
      <Path d="M12 20 H36" />
      {/* Los dos pilares, ligeramente inclinados hacia dentro como los de verdad. */}
      <Path d="M14 12.5 L15.5 41.5" />
      <Path d="M34 12.5 L32.5 41.5" />
      {/* El montante central. Corto: con él largo, el hueco de dentro se cierra. */}
      <Path d="M24 12.5 V20" />
    </Lienzo>
  );
}

/**
 * El abanico de guerra (軍配, gunbai): con lo que un comandante decide.
 *
 * Es el icono del consejo del alba, y es exactamente lo que significa: el gunbai
 * no es un abanico de abanicarse, es la paleta con la que se señala una orden y
 * se zanja una discusión. En un juego donde el final es una votación, no hay
 * objeto mejor.
 *
 * LA PALA VA CERRADA Y CON UNA MARCA DENTRO. A 23 píxeles, una pala vacía se
 * lee como una cuchara o como una lupa sin mango; la cruz de dentro —que en los
 * de verdad es el sello del clan— es lo que lo vuelve inconfundible.
 */
export function IconoAbanico(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      {/* La pala, con la forma de calabaza achatada que tienen los gunbai. */}
      <Path d="M24 6 C33 6 37 12 37 18 C37 24 33 29.5 24 29.5 C15 29.5 11 24 11 18 C11 12 15 6 24 6 Z" />
      {/* La marca de dentro. */}
      <Path d="M24 11.5 V24" />
      <Path d="M17.5 17.5 H30.5" />
      {/* El mango, con su tope. */}
      <Path d="M24 29.5 V41.5" />
      <Path d="M19.5 41.5 H28.5" />
    </Lienzo>
  );
}

/**
 * La aguja: el cambio de vía visto desde arriba.
 *
 * Dos raíles que se separan y la palanca que los mueve. Es el gesto del juego
 * entero —decidir por dónde va cada convoy— y a 23 px no se confunde con nada
 * de los otros tres: ningun icono de la app tiene una bifurcacion.
 */
export function IconoAguja(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      <Path d="M8 38 H40" />
      <Path d="M8 30 H24 L40 14" />
      <Circle cx={11} cy={22} r={3.5} />
      <Path d="M11 25.5 V30" />
    </Lienzo>
  );
}

/**
 * La locomotora: la caldera, la chimenea y dos ruedas.
 *
 * Es el icono del asistente. A este tamano una locomotora detallada se
 * emborrona, asi que se dibuja lo unico que la hace reconocible de un vistazo:
 * el cilindro, la chimenea alta y las dos ruedas de distinto tamano.
 */
export function IconoLocomotora(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      <Path d="M9 32 V20 h20 v12 z" />
      <Path d="M29 32 V26 h8 l3 6 z" />
      <Path d="M13 20 V13 h6 v7" />
      <Circle cx={16} cy={37} r={4.5} />
      <Circle cx={33} cy={38} r={3.2} />
      <Path d="M7 42 H41" />
    </Lienzo>
  );
}

export const ICONOS: Record<IconoId, (p: PropsIcono) => JSX.Element> = {
  papiro: IconoPapiro,
  anj: IconoAnj,
  escarabajo: IconoEscarabajo,
  torii: IconoTorii,
  abanico: IconoAbanico,
  reloj: IconoRonda,
  mascara: IconoPersonaje,
  plano: IconoMapa,
  cartel: IconoCartel,
  cuaderno: IconoCuaderno,
  copa: IconoPerfil,
  mayordomo: IconoMayordomo,
  farol: IconoFarol,
  /* Los dos de El Nudo de Valdehierro. */
  aguja: IconoAguja,
  locomotora: IconoLocomotora,
};

/**
 * ═══ Y AQUÍ EMPIEZA LA OTRA FAMILIA: LOS ICONOS DE LA SALA DE ARCADE ═══
 *
 * Tabla PROPIA, con su unión cerrada propia, y no una entrada más en `ICONOS`.
 *
 * La razón está escrita en `shared/arcade/tipos.ts` y no es de estilo: los iconos
 * de las veladas son el vocabulario de tres misterios —un torii, un escarabajo, un
 * mayordomo— y en una sala de arcade no significan nada. Juntar las dos tablas
 * obligaría a `IconoDeArcade` a ser `IconoId`, o sea a que el contrato del arcade
 * importara el de las veladas, que es exactamente la frontera que `verify:fronteras`
 * vigila.
 *
 * Y hay uno solo porque hay un juego. La disciplina es la misma que la de `IconoId`,
 * cuya lista creció juego a juego con la razón escrita al lado de cada tanda:
 * inventar cuatro iconos para cuatro juegos que no existen es adivinar qué dibujo
 * necesita un juego que nadie ha escrito.
 */

/**
 * El mando: una cruceta y dos botones.
 *
 * Es el genérico de la Sala —el arcade que no ha pedido nada mejor— y tenía que
 * ser reconocible a 23 píxeles junto a una máscara, un farol y una locomotora.
 * La silueta de un mando no se parece a ninguna de las tres, y la cruceta es lo
 * único que lo dice a ese tamaño: sin ella, el contorno redondeado se lee como una
 * pastilla de jabón.
 */
export function IconoMando(p: PropsIcono): JSX.Element {
  return (
    <Lienzo {...p}>
      <Path d="M16 16 h16 a10 10 0 0 1 10 10 v6 a6 6 0 0 1 -11 3.5 l-2 -2.5 h-10 l-2 2.5 a6 6 0 0 1 -11 -3.5 v-6 a10 10 0 0 1 10 -10 z" />
      <Path d="M15 24 v6" />
      <Path d="M12 27 h6" />
      <Circle cx={32} cy={25} r={2} />
      <Circle cx={36} cy={29} r={2} />
    </Lienzo>
  );
}

export const ICONOS_DE_ARCADE: Record<IconoDeArcade, (p: PropsIcono) => JSX.Element> = {
  mando: IconoMando,
};
