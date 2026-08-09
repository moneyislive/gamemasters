/**
 * La barra de abajo: las pestañas del juego y, en el centro, su asistente.
 *
 * La FORMA no cambia nunca —la muesca, el botón, el filo dorado— porque es la
 * identidad del producto. Lo que cambia es qué hay dentro: cuántas pestañas,
 * cómo se llaman, qué icono llevan, y a quién representa el botón central. Todo
 * eso lo declara cada juego en su manifiesto; aquí no hay ni una pestaña
 * escrita a mano.
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
import { ICONOS } from './iconos';
import { manifiestoDe } from '../../shared/juegos';
import { usePartida } from './estado';
import {
  ALTO_BARRA,
  FILETE_BARRA,
  HOLGURA_BOTON,
  R_BOTON,
  SALIENTE_BOTON,
  color,
  fuente,
} from './tema';

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

  // Qué pestañas hay y cómo se llaman lo dice el juego, no este fichero. Un
  // misterio necesita tablón y cuaderno; una oca, ni lo uno ni lo otro.
  const { vista } = usePartida();
  const manifiesto = manifiestoDe(vista?.sesion.juego);

  // Se recorre el orden del manifiesto y se busca su ruta. Una pestaña que el
  // juego no declare no se pinta, aunque su pantalla exista en el paquete.
  const pestanas = manifiesto.barra
    .map((p) => ({ decl: p, ruta: state.routes.find((r) => r.name === p.pantalla) }))
    .filter((x): x is { decl: (typeof manifiesto.barra)[number]; ruta: (typeof state.routes)[number] } =>
      Boolean(x.ruta),
    );

  // Repartidas a los dos lados de la muesca. Con número impar, la de más va a
  // la izquierda: es donde primero cae el pulgar.
  const mitad = Math.ceil(pestanas.length / 2);
  const anchoLado = g.ax;
  // Con seis pestañas, en una pantalla de 320 puntos cada una se queda en 37 y
  // «Tablón» no entra. El rótulo se encoge antes que partirse en dos líneas.
  // Con menos pestañas hay sitio de sobra y no hace falta encogerlo.
  const estrecho = mitad > 0 && anchoLado / mitad < 42;

  const pestana = ({
    decl,
    ruta,
  }: (typeof pestanas)[number]): JSX.Element => {
    const enfocada = state.routes[state.index]?.key === ruta.key;
    const Icono = ICONOS[decl.icono];
    const tinta = enfocada ? color.oro300 : 'rgba(217,201,163,0.42)';

    return (
      <Pressable
        key={ruta.key}
        accessibilityRole="button"
        accessibilityState={enfocada ? { selected: true } : {}}
        accessibilityLabel={decl.rotulo}
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
          {decl.rotulo}
        </Text>
      </Pressable>
    );
  };

  const lado = { top: SALIENTE_BOTON, height: ALTO, paddingBottom: insets.bottom };
  const IconoAsistente = ICONOS[manifiesto.asistente.icono];

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
        {pestanas.slice(0, mitad).map(pestana)}
      </View>
      <View style={[estilos.lado, lado, { right: 0, width: anchoLado }]}>
        {pestanas.slice(mitad).map(pestana)}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Habla con ${manifiesto.asistente.nombre}, ${manifiesto.asistente.descripcion.toLowerCase()}`}
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
        <IconoAsistente color={color.oro300} />
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
