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
import { conAlfa, useTema } from './tema-juego';
import {
  ALTO_BARRA,
  FILETE_BARRA,
  HOLGURA_BOTON,
  R_BOTON,
  SALIENTE_BOTON,
  fuente,
} from './tema';

export function BarraDeJuego({ state, descriptors, navigation }: BottomTabBarProps): JSX.Element {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /*
   * La barra es lo ÚNICO que se ve en las seis pantallas, así que es donde más
   * rinde que el color sea del juego: se cambia de pestaña y la tumba sigue
   * siendo la tumba. La forma —la muesca, el saliente, el filete— no cambia,
   * que es la identidad del producto; cambia de qué está hecha.
   */
  const t = useTema();

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
  const hueco = mitad > 0 ? anchoLado / mitad : 0;
  /*
   * SEGUNDO MOTIVO PARA ENCOGER: que el rótulo sea largo, no que la pantalla sea
   * pequeña.
   *
   * Lo de arriba se midió con los rótulos de CLUEDO, cuyo más largo es «Tablón»
   * —seis— y con esa medida la regla del ancho basta. La Momia trae «Sellado»,
   * que son siete, y a 390 puntos entra en el hueco por los pelos: la app se
   * veía perfecta y la pestaña ponía «SELLAD…». Un rótulo cortado en la barra es
   * de los fallos que no se notan revisando código y se notan enseguida en la
   * mano de alguien.
   *
   * LA CONDICIÓN ESTÁ PUESTA PARA QUE CLUEDO NO PUEDA ENTRAR EN ELLA, y no por
   * cortesía: si la fórmula se aplicara a rótulos de seis, habría anchos
   * intermedios —alrededor de 360 puntos— en los que CLUEDO pasaría de 9 a 7,8 y
   * su barra cambiaría de aspecto. Con el corte en siete, ningún rótulo suyo la
   * alcanza y su barra queda intacta por construcción. El día que un juego traiga
   * «Cuaderno», entrará solo.
   *
   * El 7,2 es lo que ocupa un carácter de Cinzel en mayúsculas a tamaño 9 con su
   * espaciado, medido sobre la propia barra y no deducido de la métrica de la
   * fuente, que en web y en el móvil no dan lo mismo.
   */
  const masLargo = pestanas.reduce((n, p) => Math.max(n, p.decl.rotulo.length), 0);
  const estrecho = (mitad > 0 && hueco < 42) || (masLargo >= 7 && hueco < masLargo * 7.2);

  const pestana = ({
    decl,
    ruta,
  }: (typeof pestanas)[number]): JSX.Element => {
    const enfocada = state.routes[state.index]?.key === ruta.key;
    const Icono = ICONOS[decl.icono];
    /*
     * La pestaña inactiva estaba al 0,42 de opacidad, que sobre el fondo de la
     * barra da un contraste de 2,9:1 — por debajo del 4,5:1 que se considera
     * legible. A 0,68 se lee sin esfuerzo y la activa sigue destacando, que es
     * de lo que iba la diferencia.
     *
     * Se toca el COLOR y nada más: ni el tamaño del rótulo ni la geometría, que
     * están medidos para que «Tablón» quepa a 320 puntos.
     */
    const tinta = enfocada ? t.oro300 : conAlfa(t.pergaminoTenue, 0.68);

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
            <Stop offset="0" stopColor={t.laton} stopOpacity="0.25" />
            <Stop offset="0.5" stopColor={t.oro300} stopOpacity="1" />
            <Stop offset="1" stopColor={t.laton} stopOpacity="0.25" />
          </LinearGradient>
        </Defs>
        <Path d={siluetaBarra(forma)} fill={conAlfa(t.feltoscuro, 0.94)} />
        {/* El doble filete de la casa, el mismo que remata el pie de página. */}
        <Path
          d={bordeSuperior({ ...forma, offset: 4 })}
          fill="none"
          stroke={t.laton}
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
            backgroundColor: t.caoba900,
            borderColor: t.oro400,
            left: g.cx - R_BOTON,
            width: R_BOTON * 2,
            height: R_BOTON * 2,
            borderRadius: R_BOTON,
          },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        <IconoAsistente color={t.oro300} />
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
    // El fondo y el borde van en línea (son del juego); opaco a propósito, ver
    // la cabecera del fichero.
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
});
