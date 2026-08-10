/**
 * Las piezas que hacen que la portada respire.
 *
 * POR QUÉ EXISTE ESTE FICHERO. Una pantalla quieta parece un formulario; una
 * pantalla que se mueve parece un sitio. Pero el movimiento en una app se
 * estropea de dos maneras muy fáciles: metiendo animaciones que van a saltos
 * porque cruzan el puente de JavaScript en cada fotograma, y metiendo tantas
 * que marean. Aquí todo va por `react-native-reanimated`, que anima en el hilo
 * de la interfaz, y todo es LENTO —ciclos de ocho a veinte segundos— para que
 * se note como ambiente y no como parpadeo.
 *
 * Y todo se apaga si el sistema pide menos movimiento. No es un detalle de
 * cortesía: hay gente a quien el movimiento le provoca mareo de verdad.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';

/** ¿El sistema pide menos movimiento? */
export function useMenosMovimiento(): boolean {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    let vivo = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (vivo) setMenos(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setMenos);
    return () => {
      vivo = false;
      sub.remove();
    };
  }, []);
  return menos;
}

/**
 * Polvo en suspensión sobre un haz de luz.
 *
 * Es lo que convierte un rectángulo oscuro en una habitación. Las motas suben
 * despacio y con periodos distintos —números primos-ish a propósito— para que
 * el ojo no encuentre el bucle.
 */
export function Polvo({
  ancho,
  alto,
  cantidad = 18,
  tono = '#e8cf7f',
}: {
  ancho: number;
  alto: number;
  cantidad?: number;
  tono?: string;
}): JSX.Element | null {
  const menos = useMenosMovimiento();
  if (menos) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: ancho, height: alto }}>
      {Array.from({ length: cantidad }, (_, i) => (
        <Mota key={i} indice={i} ancho={ancho} alto={alto} tono={tono} />
      ))}
    </View>
  );
}

function Mota({
  indice,
  ancho,
  alto,
  tono,
}: {
  indice: number;
  ancho: number;
  alto: number;
  tono: string;
}): JSX.Element {
  // Nada de `Math.random`: con una posición derivada del índice, la escena es
  // la misma en cada arranque y se puede mirar dos veces igual.
  const x = ((indice * 137.5) % 100) / 100;
  const tamano = 1.2 + ((indice * 7) % 5) * 0.5;
  const duracion = 9000 + ((indice * 13) % 11) * 1100;
  const retardo = ((indice * 29) % 17) * 420;
  const opacidadMax = 0.14 + ((indice * 11) % 7) * 0.05;

  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(0, { duration: retardo }),
        withTiming(1, { duration: duracion, easing: Easing.linear }),
      ),
      -1,
      false,
    );
  }, [t, duracion, retardo]);

  const estilo = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [alto * 0.95, -12]) },
      // Un vaivén lateral suave: sin él las motas parecen caer por un raíl.
      { translateX: interpolate(t.value, [0, 0.5, 1], [0, 9, 0]) },
    ],
    opacity: interpolate(t.value, [0, 0.15, 0.85, 1], [0, opacidadMax, opacidadMax, 0]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x * ancho,
          width: tamano,
          height: tamano,
          borderRadius: tamano,
          backgroundColor: tono,
        },
        estilo,
      ]}
    />
  );
}

/**
 * El halo de la lámpara: un resplandor que late muy despacio.
 *
 * Va en SVG y no como sombra de una vista porque las sombras grandes en Android
 * se pintan a trompicones, y esto tiene que estar siempre de fondo.
 */
export function Halo({
  ancho,
  alto,
  tono = '#c9a227',
  intensidad = 0.3,
}: {
  ancho: number;
  alto: number;
  tono?: string;
  intensidad?: number;
}): JSX.Element {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);

  useEffect(() => {
    if (menos) return;
    t.value = withRepeat(withTiming(1, { duration: 7200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, menos]);

  const estilo = useAnimatedStyle(() => ({
    opacity: menos ? 0.85 : interpolate(t.value, [0, 1], [0.72, 1]),
    transform: [{ scale: menos ? 1 : interpolate(t.value, [0, 1], [1, 1.06]) }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, estilo]}>
      <Svg width={ancho} height={alto}>
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="34%" r="62%">
            <Stop offset="0%" stopColor={tono} stopOpacity={intensidad} />
            <Stop offset="55%" stopColor={tono} stopOpacity={intensidad * 0.28} />
            <Stop offset="100%" stopColor={tono} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={ancho} height={alto} fill="url(#halo)" />
      </Svg>
    </Animated.View>
  );
}

/** Un punto que late. Para «esto está pasando ahora mismo». */
export function Latido({ tono, tamano = 9 }: { tono: string; tamano?: number }): JSX.Element {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);

  useEffect(() => {
    if (menos) return;
    t.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false);
  }, [t, menos]);

  const onda = useAnimatedStyle(() => ({
    opacity: menos ? 0 : interpolate(t.value, [0, 1], [0.5, 0]),
    transform: [{ scale: menos ? 1 : interpolate(t.value, [0, 1], [1, 2.6]) }],
  }));

  return (
    <View style={{ width: tamano, height: tamano, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: tamano,
            height: tamano,
            borderRadius: tamano,
            backgroundColor: tono,
          },
          onda,
        ]}
      />
      <View
        style={{ width: tamano, height: tamano, borderRadius: tamano, backgroundColor: tono }}
      />
    </View>
  );
}

/**
 * Una tarjeta que responde al dedo.
 *
 * El hundimiento al pulsar es lo que separa «una imagen» de «algo que se toca».
 * Va por Reanimated y no por el `pressed` de `Pressable` para que la vuelta
 * tenga rebote en vez de cortarse en seco.
 */
export function Pulsable({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}): JSX.Element {
  const escala = useSharedValue(1);
  const animado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  return (
    <Animated.View style={animado}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => {
          escala.value = withTiming(0.965, { duration: 110, easing: Easing.out(Easing.quad) });
        }}
        onPressOut={() => {
          escala.value = withTiming(1, { duration: 220, easing: Easing.elastic(1.4) });
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
