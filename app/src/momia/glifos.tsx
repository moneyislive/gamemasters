/**
 * Los símbolos de la Momia, dibujados a mano.
 *
 * ═══ POR QUÉ DIBUJADOS Y NO ESCRITOS ═══
 *
 * La primera versión de estas pantallas usaba jeroglíficos de verdad —𓂀 para
 * lo que solo tú has leído, 𓋴 para la cámara profanada, 𓉔 para una cámara sin
 * foto— porque es lo suyo en un juego egipcio, y en el navegador de este
 * ordenador se veían perfectos.
 *
 * Ahí estaba la trampa. Windows trae «Segoe UI Historic», que cubre el bloque
 * Egyptian Hieroglyphs (U+13000 en adelante). **iOS y Android no traen ninguna
 * fuente que lo cubra.** O sea: la app se veía impecable exactamente en el único
 * sitio donde nadie va a jugar, y en los dos donde sí —un móvil, en una cena—
 * habría enseñado un cuadradito vacío en la cabecera de CADA tarjeta de
 * fragmento y en el aviso de la cámara profanada, que son las dos cosas que más
 * se miran.
 *
 * Es la clase de fallo que no se encuentra leyendo el código, ni compilando, ni
 * mirando la pantalla: se encuentra la noche de la partida y en el teléfono de
 * otra persona. Así que todo lo que tiene que verse va dibujado, con el mismo
 * trazo que los iconos de la barra.
 *
 * LO QUE SÍ SE ESCRIBE COMO CARÁCTER es el anj (☥, U+2625). Está en el plano
 * básico, lo cubre cualquier fuente de sistema desde hace veinte años, y es el
 * único símbolo egipcio del que se puede uno fiar sin dibujarlo.
 *
 * Todos viven en una caja de 24×24 y se dibujan pensando en verse a 22 píxeles.
 */
import Svg, { Circle, Path } from 'react-native-svg';
import type { DonId } from '../../../shared/juegos';

export interface PropsGlifo {
  size?: number;
  color: string;
}

/** El trazo común. Grosor calculado para 22 px de destino. */
const T = {
  fill: 'none',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/**
 * El ojo abierto: lo que está a la vista de todos.
 *
 * Es el wedjat sin las lágrimas —esas son de la marca de la maldición, y tenían
 * que distinguirse—. Aquí solo hay párpado e iris: mira, y no le ha pasado nada.
 */
export function OjoAbierto({ size = 22, color }: PropsGlifo): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2.5 12c3.6-5 6.7-7 9.5-7s5.9 2 9.5 7c-3.6 5-6.7 7-9.5 7s-5.9-2-9.5-7z" stroke={color} {...T} />
      <Circle cx={12} cy={12} r={3.1} fill={color} />
    </Svg>
  );
}

/**
 * El lacre: lo que solo tú has leído.
 *
 * Un disco con su cordel. El disco va RELLENO porque a 15 píxeles —el tamaño al
 * que sale en la cabecera de la tarjeta— un anillo hueco se cierra y se ve como
 * una mancha sucia; relleno se ve como lo que es, un sello de cera.
 */
export function Lacre({ size = 22, color }: PropsGlifo): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.5 3.5 L10 9 M17.5 3.5 L14 9" stroke={color} {...T} />
      <Circle cx={12} cy={15} r={6} fill={color} />
      {/* La impronta: el trazo que queda marcado en la cera. */}
      <Path d="M9.6 15 h4.8 M12 12.6 v4.8" stroke="#000" strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * La cámara sin foto: una puerta de tumba.
 *
 * Trapecio y no rectángulo: una puerta egipcia se estrecha hacia arriba, y esa
 * inclinación es lo único que a este tamaño la distingue de un armario.
 */
export function Puerta({ size = 22, color }: PropsGlifo): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 21 L6.5 4 h11 l2 17 z" stroke={color} {...T} />
      <Path d="M9.5 21 v-8.5 h5 V21" stroke={color} {...T} />
    </Svg>
  );
}

/**
 * La grieta de la profanación.
 *
 * Es el sello roto: una línea que baja y se parte. No es un símbolo egipcio de
 * nada, y da igual —lo que tiene que decir es «esto está abierto y no debería»,
 * y una grieta lo dice en cualquier cultura.
 */
export function Grieta({ size = 22, color }: PropsGlifo): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13.5 2 L9 10.5 h5 L8 22" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17.5 5.5 L20 8 M4 15 L6.5 17" stroke={color} strokeWidth={1.6} strokeOpacity={0.6} strokeLinecap="round" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Los dones
// ---------------------------------------------------------------------------

/**
 * Un símbolo por don.
 *
 * SIETE Y DISTINTOS ENTRE SÍ, aunque cueste más que poner el mismo para todos.
 * El don es lo único que esa persona puede hacer y nadie más, y se consulta a lo
 * largo de toda la noche: si los siete llevaran el mismo adorno, la tarjeta
 * dejaría de reconocerse de un vistazo y habría que leerla entera cada vez.
 *
 * Ninguno es un jeroglífico auténtico, y es a conciencia: son objetos —un ojo,
 * una cruz, un escudo, una bolsa, una cámara, un pico, una serpiente— porque a
 * 26 píxeles lo que se reconoce es la cosa, no la escritura.
 */
export function GlifoDeDon({ don, size = 26, color }: PropsGlifo & { don: DonId }): JSX.Element {
  switch (don) {
    // Epigrafista: el ojo que lee lo que nadie sabe leer.
    case 'descifrar':
      return <OjoAbierto size={size} color={color} />;

    // Médico: la cruz. Anacrónica en 1923 y legible al instante, que gana.
    case 'sanar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 4 V20 M4 12 H20" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
        </Svg>
      );

    // Guardián: el escudo.
    case 'proteger':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 2.5 L20 5.5 v6.5c0 5-3.6 8-8 9.5-4.4-1.5-8-4.5-8-9.5V5.5z" stroke={color} {...T} />
          <Path d="M9 12 l2.2 2.4 L15.4 9.6" stroke={color} {...T} />
        </Svg>
      );

    // Mecenas: la bolsa de dinero con la que se compra la información.
    case 'sobornar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 7.5 a3 3 0 0 1 6 0" stroke={color} {...T} />
          <Path d="M8 7.5 h8 l3 8.5a5 5 0 0 1-5 5.5H10a5 5 0 0 1-5-5.5z" stroke={color} {...T} />
          <Path d="M12 11.5 v6 M10.3 13 h3.4 M10.3 16 h3.4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );

    // Fotógrafo: la cámara. Lo que hace público lo que solo él vio.
    case 'documentar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 8.5h4l1.6-2.5h6.8L17 8.5h4v11.5H3z" stroke={color} {...T} />
          <Circle cx={12} cy={14} r={3.6} stroke={color} {...T} />
        </Svg>
      );

    // Capataz: el pico. Excavar cuesta, y se ve que cuesta.
    case 'excavar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3.5 9.5c5.5-5 11.5-5 17 0" stroke={color} {...T} />
          <Path d="M3.5 9.5c3-1.4 5.7-2 8.5-2s5.5.6 8.5 2" stroke={color} strokeWidth={1.4} strokeOpacity={0.55} fill="none" />
          <Path d="M12 7.5 V21" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
        </Svg>
      );

    /*
     * El saqueador: la serpiente.
     *
     * Es el único glifo con lengua bífida, y no es adorno: es el único don que
     * miente, y quien lo tiene abre esta tarjeta muchas veces a lo largo de la
     * noche. Que se le note en el dibujo que juega a otra cosa es la mitad de la
     * gracia de tenerlo.
     */
    case 'falsificar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4.5 21c0-4.5 5.5-4 5.5-8.5 0-3 2-4.5 4.2-4.5" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Circle cx={16.6} cy={7.4} r={2.6} fill={color} />
          <Path d="M19 6.2 L22.5 5 M19 8.6 L22.5 9.8" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
  }
}
