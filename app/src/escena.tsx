/**
 * La escena del vestíbulo: una mansión de noche, viva.
 *
 * QUÉ ES ESTO. El fondo de la portada no es un color: es un lugar. Un cielo
 * profundo con estrellas que titilan, una luna con halo que respira, la
 * silueta de una mansión con ventanas encendidas que parpadean como velas,
 * bancos de niebla que cruzan despacio, luciérnagas, y —cada muchos segundos—
 * el resplandor de un relámpago lejano. Al hacer scroll, las capas se separan
 * (parallax): la mansión baja más deprisa que las estrellas, y la escena gana
 * profundidad de diorama.
 *
 * CÓMO ESTÁ HECHO SIN ARRUINAR EL RENDIMIENTO. Todo son transformaciones y
 * opacidades animadas con Reanimated —que corre en el hilo de la interfaz, no
 * en el de JavaScript— y formas de SVG estáticas. Nada de sombras enormes, nada
 * de blur, nada que se pinte a trompicones en un Android modesto. Los periodos
 * de las animaciones salen del índice de cada elemento con números primos, para
 * que el conjunto nunca entre en fase: el ojo no encuentra el bucle.
 *
 * Y todo lo que se mueve se detiene si el sistema pide menos movimiento.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useMenosMovimiento } from './vivo';

// ---------------------------------------------------------------------------
// Estrellas
// ---------------------------------------------------------------------------

function Estrella({ indice, ancho, alto }: { indice: number; ancho: number; alto: number }): JSX.Element {
  const menos = useMenosMovimiento();
  /*
   * Posición derivada del índice: la misma noche en cada arranque.
   *
   * Los módulos son primos entre sí y lejanos (97 y 89): con pasos que
   * comparten factor con el módulo, los restos ciclan en dos o tres valores y
   * las estrellas salen EN FILA — pasó, y una constelación en formación militar
   * rompe la noche entera.
   */
  const x = ((indice * 41) % 97) / 97;
  const y = (((indice * 53) % 89) / 89) * 0.92;
  const tamano = 1 + ((indice * 7) % 3) * 0.7;
  const duracion = 2600 + ((indice * 997) % 2600);
  const retardo = (indice * 613) % 4000;
  const brillo = 0.25 + ((indice * 11) % 6) * 0.09;

  const t = useSharedValue(0);
  useEffect(() => {
    if (menos) return;
    t.value = withDelay(
      retardo,
      withRepeat(withTiming(1, { duration: duracion, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [t, duracion, retardo, menos]);

  const estilo = useAnimatedStyle(() => ({
    opacity: menos ? brillo : interpolate(t.value, [0, 1], [brillo * 0.35, brillo]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x * ancho,
          top: y * alto,
          width: tamano,
          height: tamano,
          borderRadius: tamano,
          backgroundColor: '#e8e2cf',
        },
        estilo,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// La luna
// ---------------------------------------------------------------------------

function Luna({ ancho, alto }: { ancho: number; alto: number }): JSX.Element {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);
  useEffect(() => {
    if (menos) return;
    t.value = withRepeat(withTiming(1, { duration: 8600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, menos]);

  const halo = useAnimatedStyle(() => ({
    opacity: menos ? 0.8 : interpolate(t.value, [0, 1], [0.6, 1]),
    transform: [{ scale: menos ? 1 : interpolate(t.value, [0, 1], [1, 1.05]) }],
  }));

  const cx = ancho * 0.76;
  const cy = alto * 0.2;

  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, halo]}>
        <Svg width={ancho} height={alto}>
          <Defs>
            <RadialGradient id="haloLuna" cx={`${(cx / ancho) * 100}%`} cy={`${(cy / alto) * 100}%`} r="40%">
              <Stop offset="0%" stopColor="#e8d9a8" stopOpacity={0.34} />
              <Stop offset="45%" stopColor="#c9b878" stopOpacity={0.1} />
              <Stop offset="100%" stopColor="#c9b878" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={ancho} height={alto} fill="url(#haloLuna)" />
        </Svg>
      </Animated.View>
      <Svg width={ancho} height={alto} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={cx} cy={cy} r={17} fill="#efe6c8" opacity={0.95} />
        {/* El mordisco: una sombra del color del cielo la vuelve menguante. */}
        <Circle cx={cx - 7} cy={cy - 4} r={15} fill="#0a1512" opacity={0.55} />
      </Svg>
    </>
  );
}

// ---------------------------------------------------------------------------
// La mansión
// ---------------------------------------------------------------------------

/** Ventanas encendidas: [x, y, ancho, alto] en el lienzo 375×190. */
const VENTANAS: Array<[number, number, number, number]> = [
  [27, 118, 6, 9],
  [27, 140, 6, 9],
  [63, 138, 7, 10],
  [86, 138, 7, 10],
  [126, 146, 7, 10],
  [163, 96, 6, 9],
  [178, 96, 6, 9],
  [193, 96, 6, 9],
  [170, 126, 7, 10],
  [186, 126, 7, 10],
  [232, 132, 7, 10],
  [254, 132, 7, 10],
  [276, 132, 7, 10],
  [310, 146, 6, 9],
  [338, 122, 6, 9],
];

function Ventana({
  indice,
  x,
  y,
  w,
  h,
  escalaX,
  escalaY,
}: {
  indice: number;
  x: number;
  y: number;
  w: number;
  h: number;
  escalaX: number;
  escalaY: number;
}): JSX.Element {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);
  const duracion = 1800 + ((indice * 997) % 2400);
  const retardo = (indice * 719) % 5200;

  useEffect(() => {
    if (menos) return;
    t.value = withDelay(
      retardo,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duracion, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.35, { duration: 140 }),
          withTiming(0.9, { duration: 180 }),
          withTiming(0, { duration: duracion * 0.8, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [t, duracion, retardo, menos]);

  const estilo = useAnimatedStyle(() => ({
    opacity: menos ? 0.6 : interpolate(t.value, [0, 1], [0.28, 0.85]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x * escalaX,
          top: y * escalaY,
          width: w * escalaX,
          height: h * escalaY,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          backgroundColor: '#f0c96a',
        },
        estilo,
      ]}
    />
  );
}

export function Mansion({ ancho, alto }: { ancho: number; alto: number }): JSX.Element {
  const escalaX = ancho / 375;
  const escalaY = alto / 190;
  const tinta = '#040a07';

  return (
    <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, width: ancho, height: alto }}>
      <Svg width={ancho} height={alto} viewBox="0 0 375 190" preserveAspectRatio="none">
        {/* Torre izquierda, con aguja */}
        <Polygon points="14,190 14,104 30,78 46,104 46,190" fill={tinta} />
        <Rect x={28} y={62} width={4} height={20} fill={tinta} />
        {/* Ala izquierda */}
        <Polygon points="46,190 46,132 80,108 114,132 114,190" fill={tinta} />
        <Rect x={70} y={92} width={7} height={22} fill={tinta} />
        {/* Cuerpo bajo */}
        <Rect x={114} y={140} width={36} height={50} fill={tinta} />
        {/* Torre central: la más alta, con su aguja */}
        <Polygon points="150,190 150,88 178,46 206,88 206,190" fill={tinta} />
        <Rect x={176} y={26} width={4} height={26} fill={tinta} />
        <Circle cx={178} cy={24} r={2.5} fill={tinta} />
        {/* Cuerpo derecho */}
        <Polygon points="206,190 206,122 258,94 306,122 306,190" fill={tinta} />
        <Rect x={242} y={80} width={8} height={22} fill={tinta} />
        {/* Ala baja derecha y torreta */}
        <Rect x={306} y={140} width={22} height={50} fill={tinta} />
        <Polygon points="328,190 328,116 344,94 360,116 360,190" fill={tinta} />
        {/* El suelo */}
        <Rect x={0} y={184} width={375} height={6} fill={tinta} />
      </Svg>
      {VENTANAS.map(([x, y, w, h], i) => (
        <Ventana key={i} indice={i} x={x} y={y} w={w} h={h} escalaX={escalaX} escalaY={escalaY} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Niebla
// ---------------------------------------------------------------------------

function BancoDeNiebla({
  ancho,
  abajo,
  altura,
  duracion,
  opacidad,
}: {
  ancho: number;
  abajo: number;
  altura: number;
  duracion: number;
  opacidad: number;
}): JSX.Element | null {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);
  useEffect(() => {
    if (menos) return;
    t.value = withRepeat(withTiming(1, { duration: duracion, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, duracion, menos]);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: menos ? 0 : interpolate(t.value, [0, 1], [-ancho * 0.4, 0]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', bottom: abajo, width: ancho * 1.8, height: altura }, estilo]}
    >
      <LinearGradient
        colors={[
          'transparent',
          `rgba(168,190,178,${opacidad})`,
          `rgba(168,190,178,${opacidad * 1.6})`,
          `rgba(168,190,178,${opacidad})`,
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1, borderRadius: altura }}
      />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// El relámpago lejano
// ---------------------------------------------------------------------------

function Relampago({ ancho, alto }: { ancho: number; alto: number }): JSX.Element | null {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);

  useEffect(() => {
    if (menos) return;
    t.value = withRepeat(
      withSequence(
        // La espera larga entre tormentas.
        withTiming(0, { duration: 11400 }),
        // Doble destello, como los de verdad.
        withTiming(1, { duration: 90 }),
        withTiming(0.15, { duration: 70 }),
        withTiming(0.8, { duration: 110 }),
        withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [t, menos]);

  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0, 0.09]),
  }));

  if (menos) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', width: ancho, height: alto, backgroundColor: '#dce9f5' },
        estilo,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// La escena completa
// ---------------------------------------------------------------------------

export function EscenaVestibulo({
  ancho,
  alto,
  scrollY,
}: {
  ancho: number;
  alto: number;
  scrollY: SharedValue<number>;
}): JSX.Element {
  const altoMansion = Math.min(alto * 0.58, 240);

  // Parallax: el cielo casi quieto, la mansión bajando más deprisa. Es lo que
  // convierte una imagen en un diorama con fondo y primer término.
  const capaCielo = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, alto], [0, alto * 0.18]) }],
  }));
  const capaMansion = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, alto], [0, alto * 0.42]) }],
  }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: ancho, height: alto, overflow: 'hidden' }}>
      <LinearGradient
        colors={['#050d0a', '#0a1512', '#0c1b13', '#081209']}
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, capaCielo]}>
        {Array.from({ length: 26 }, (_, i) => (
          <Estrella key={i} indice={i} ancho={ancho} alto={alto * 0.7} />
        ))}
        <Luna ancho={ancho} alto={alto} />
      </Animated.View>

      <Relampago ancho={ancho} alto={alto} />

      <Animated.View style={[StyleSheet.absoluteFill, capaMansion]}>
        <Mansion ancho={ancho} alto={altoMansion} />
        <BancoDeNiebla ancho={ancho} abajo={0} altura={64} duracion={34000} opacidad={0.05} />
        <BancoDeNiebla ancho={ancho} abajo={26} altura={44} duracion={26000} opacidad={0.04} />
      </Animated.View>

      {/* La viñeta: oscurece los bordes para que el centro mande. */}
      <Svg width={ancho} height={alto} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="vineta" cx="50%" cy="42%" r="75%">
            <Stop offset="0%" stopColor="#000" stopOpacity={0} />
            <Stop offset="72%" stopColor="#000" stopOpacity={0} />
            <Stop offset="100%" stopColor="#000" stopOpacity={0.5} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={ancho} height={alto} fill="url(#vineta)" />
      </Svg>

      {/* El fundido al cuerpo de la página: la escena no termina, se hunde. */}
      <LinearGradient
        colors={['transparent', 'rgba(5,13,9,0.86)', '#050d09']}
        style={{ position: 'absolute', bottom: 0, width: ancho, height: alto * 0.3 }}
      />
    </View>
  );
}
