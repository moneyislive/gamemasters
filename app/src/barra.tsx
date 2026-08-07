/**
 * La barra de abajo: seis pestañas y, en el centro, el Mayordomo.
 *
 * El botón del asistente era antes una pastilla flotante encima de la barra.
 * Funcionaba, pero se veía como lo que era: otra cosa puesta encima. Aquí la
 * barra se abre para hacerle sitio —una muesca cóncava, con su filete y su filo
 * dorado siguiendo la curva— y el botón se aloja dentro. La forma la calcula
 * `barra-geometria.ts`; esto solo la pinta y la hace pulsable.
 *
 * Dos cosas que no son obvias y conviene no deshacer:
 *
 *  · El disco del botón es OPACO. Si fuera translúcido como la barra, en la
 *    zona donde se solapan las dos capas las transparencias se multiplicarían y
 *    aparecería una media luna más oscura justo alrededor del botón, delatando
 *    que son dos piezas. Opaco no hay nada que sumar.
 *
 *  · El botón vive DENTRO de los límites de esta vista, no por encima. En
 *    Android una vista que sobresale del rectángulo de su padre se dibuja pero
 *    no recibe toques: el saliente sería decorativo y solo se podría pulsar la
 *    mitad de abajo.
 */
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bordeSuperior, geometriaMuesca, siluetaBarra } from './barra-geometria';
import {
  IconoCuaderno,
  IconoMapa,
  IconoMayordomo,
  IconoPerfil,
  IconoPersonaje,
  IconoRonda,
  IconoTablon,
  type PropsIcono,
} from './iconos';
import {
  ALTO_BARRA,
  FILETE_BARRA,
  HOLGURA_BOTON,
  R_BOTON,
  SALIENTE_BOTON,
  color,
  fuente,
} from './tema';

/** Qué icono le toca a cada ruta. La clave es el nombre del fichero. */
const ICONOS: Record<string, (p: PropsIcono) => JSX.Element> = {
  ronda: IconoRonda,
  personaje: IconoPersonaje,
  mapa: IconoMapa,
  tablon: IconoTablon,
  cuaderno: IconoCuaderno,
  perfil: IconoPerfil,
};

export function BarraDeJuego({ state, descriptors, navigation }: BottomTabBarProps): JSX.Element {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const ALTO = ALTO_BARRA + insets.bottom;
  const H = SALIENTE_BOTON + ALTO;
  const forma = {
    ANCHO: width,
    ALTO,
    R: R_BOTON,
    SALIENTE: SALIENTE_BOTON,
    HOLGURA: HOLGURA_BOTON,
    FILETE: FILETE_BARRA,
  };
  const g = geometriaMuesca(forma);

  // Tres a cada lado de la muesca.
  const mitad = Math.ceil(state.routes.length / 2);
  const anchoLado = g.ax;
  // Con seis pestañas, en una pantalla de 320 puntos cada una se queda en 37 y
  // «Tablón» no entra. El rótulo se encoge antes que partirse en dos líneas.
  const estrecho = anchoLado / mitad < 42;

  const pestana = (ruta: (typeof state.routes)[number], indice: number): JSX.Element => {
    const { options } = descriptors[ruta.key]!;
    const enfocada = indice === state.index;
    const Icono = ICONOS[ruta.name];
    const tinta = enfocada ? color.oro300 : 'rgba(217,201,163,0.42)';

    return (
      <Pressable
        key={ruta.key}
        accessibilityRole="button"
        accessibilityState={enfocada ? { selected: true } : {}}
        accessibilityLabel={options.title ?? ruta.name}
        onPress={() => {
          const evento = navigation.emit({
            type: 'tabPress',
            target: ruta.key,
            canPreventDefault: true,
          });
          if (!enfocada && !evento.defaultPrevented) {
            void Haptics.selectionAsync();
            navigation.navigate(ruta.name);
          }
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: ruta.key })}
        style={({ pressed }) => [estilos.pestana, pressed && { opacity: 0.6 }]}
      >
        {Icono ? <Icono color={tinta} /> : null}
        <Text
          numberOfLines={1}
          style={[
            estilos.rotulo,
            { color: tinta, fontSize: estrecho ? 7.8 : 9, letterSpacing: estrecho ? 0.15 : 0.6 },
          ]}
        >
          {options.title ?? ruta.name}
        </Text>
      </Pressable>
    );
  };

  const lado = { top: SALIENTE_BOTON, height: ALTO, paddingBottom: insets.bottom };

  return (
    <View style={[estilos.raiz, { height: H, pointerEvents: 'box-none' }]}>
      <Svg
        width={width}
        height={H}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      >
        <Defs>
          <LinearGradient id="filoBarra" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color.laton} stopOpacity="0.25" />
            <Stop offset="0.5" stopColor={color.oro300} stopOpacity="1" />
            <Stop offset="1" stopColor={color.laton} stopOpacity="0.25" />
          </LinearGradient>
        </Defs>
        <Path d={siluetaBarra(forma)} fill="rgba(11,23,16,0.94)" />
        {/* El doble filete de la casa, el mismo que remata el pie de página. */}
        <Path
          d={bordeSuperior({ ...forma, offset: 4 })}
          fill="none"
          stroke={color.laton}
          strokeWidth={0.75}
          strokeOpacity={0.35}
        />
        <Path d={bordeSuperior(forma)} fill="none" stroke="url(#filoBarra)" strokeWidth={1} />
      </Svg>

      <View style={[estilos.lado, lado, { left: 0, width: anchoLado }]}>
        {state.routes.slice(0, mitad).map((r, i) => pestana(r, i))}
      </View>
      <View style={[estilos.lado, lado, { right: 0, width: anchoLado }]}>
        {state.routes.slice(mitad).map((r, i) => pestana(r, i + mitad))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Habla con el Mayordomo, tu asistente del juego con IA"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/consejero');
        }}
        style={({ pressed }) => [
          estilos.boton,
          {
            left: g.cx - R_BOTON,
            width: R_BOTON * 2,
            height: R_BOTON * 2,
            borderRadius: R_BOTON,
          },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        <IconoMayordomo color={color.oro300} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  lado: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  pestana: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
    paddingHorizontal: 1,
  },
  rotulo: {
    fontFamily: fuente.titulo,
    textTransform: 'uppercase',
  },
  boton: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Opaco a propósito: ver la cabecera del fichero.
    backgroundColor: color.caoba900,
    borderWidth: 1.5,
    borderColor: color.oro400,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
});
