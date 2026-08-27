/**
 * El telón de avisos: lo que ocurre en pantalla cuando pasa algo en la mesa.
 *
 * No es una notificación discreta a propósito. Que el Game Master abra una
 * ronda tiene que sentirse: la pantalla se oscurece, entra un rótulo con el
 * ornamento de la casa y el móvil vibra. Es el equivalente a que alguien
 * golpee una copa con el tenedor y se calle todo el mundo.
 */
import { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { usePartida } from './estado';
import { color, espacio, texto } from './tema';
import { conAlfa, useTema } from './tema-juego';
import type { AvisoClave } from '../../shared/live';

const { width } = Dimensions.get('window');

/** Cada momento tiene su rótulo y su color. */
const ROTULO: Record<AvisoClave, { titulo: string; tono: string }> = {
  'ronda-abierta': { titulo: 'Comienza la ronda', tono: color.oro300 },
  'ronda-cerrada': { titulo: 'Se cierra la ronda', tono: color.oro400 },
  giro: { titulo: 'Algo ha cambiado', tono: '#e8a0a0' },
  ayuda: { titulo: 'Una ayuda', tono: color.oro300 },
  acusaciones: { titulo: 'Hora de acusar', tono: '#f0c9c0' },
  sellado: { titulo: 'Se abre El Sellado', tono: '#f0c9c0' },
  desenlace: { titulo: 'El sobre del crimen', tono: '#f0c9c0' },
  ganador: { titulo: 'Alguien lo ha resuelto', tono: color.oro300 },
};

export function TelonDeAvisos(): JSX.Element | null {
  const { aviso, descartarAviso } = usePartida();
  /*
   * El tema, ANTES del `return null` de más abajo. Este componente existe para
   * aparecer y desaparecer, así que si el hook fuese detrás del `return` el
   * número de hooks cambiaría en cuanto saltase el primer aviso de la noche y
   * React tiraría la pantalla entera. Es el mismo cuidado que en `ui.tsx`.
   */
  const t = useTema();
  const opacidad = useSharedValue(0);
  const escala = useSharedValue(0.92);
  const deslizar = useSharedValue(18);

  useEffect(() => {
    if (!aviso) return;

    // Salida garantizada, al margen de la animación. Reanimated no avanza si la
    // app está en segundo plano o el sistema está ahorrando batería, y un telón
    // que no se retira deja el juego bloqueado. Esto es el seguro.
    const seguro = setTimeout(descartarAviso, 3600);

    opacidad.value = 0;
    escala.value = 0.92;
    deslizar.value = 18;
    opacidad.value = withSequence(
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withDelay(
        2600,
        withTiming(0, { duration: 420 }, (fin) => {
          if (fin) runOnJS(descartarAviso)();
        }),
      ),
    );
    escala.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.3)) });
    deslizar.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });

    return () => clearTimeout(seguro);
  }, [aviso, opacidad, escala, deslizar, descartarAviso]);

  const estiloTelon = useAnimatedStyle(() => ({ opacity: opacidad.value }));
  const estiloTarjeta = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }, { translateY: deslizar.value }],
  }));

  if (!aviso) return null;
  const rotulo = ROTULO[aviso.clave] ?? { titulo: 'Atención', tono: color.oro300 };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, estilos.telon, estiloTelon]} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={descartarAviso} />
      <Animated.View style={[estilos.tarjeta, estiloTarjeta]}>
        <LinearGradient
          /*
           * El aviso salta en TODAS las rondas de las dos partidas, asi que su
           * degradado tenia que dejar de ser el caoba-sobre-fieltro de CLUEDO.
           * `conAlfa` devuelve para CLUEDO las mismas dos cadenas que habia.
           */
          colors={[conAlfa(t.caoba900, 0.98), conAlfa(t.feltoscuro, 0.98)]}
          style={estilos.degradado}
        >
          <View style={estilos.filaOrnamento}>
            <View style={[estilos.linea, { backgroundColor: rotulo.tono }]} />
            <Text style={{ color: rotulo.tono, fontSize: 14, marginHorizontal: espacio.sm }}>✦</Text>
            <View style={[estilos.linea, { backgroundColor: rotulo.tono }]} />
          </View>
          <Text style={[texto.titulo, { color: rotulo.tono, textAlign: 'center' }]}>
            {rotulo.titulo}
          </Text>
          <Text
            style={[
              texto.cuerpo,
              { color: color.pergamino, textAlign: 'center', marginTop: espacio.sm },
            ]}
          >
            {aviso.texto}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  telon: {
    backgroundColor: 'rgba(4,10,7,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  tarjeta: {
    width: Math.min(width - 48, 400),
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.5)',
  },
  degradado: { paddingVertical: espacio.xl, paddingHorizontal: espacio.lg },
  filaOrnamento: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: espacio.md,
  },
  linea: { flex: 1, height: 1, opacity: 0.5 },
});
