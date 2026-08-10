/**
 * El carrusel de mundos: cada juego es un portal, y se hojean como naipes.
 *
 * LA FÍSICA DEL EFECTO. Las tarjetas giran en perspectiva según su distancia al
 * centro del carrusel —la del centro te mira de frente, las de los lados se
 * escoran hacia dentro como un abanico— y todo se calcula en el hilo de la
 * interfaz a partir de la posición de scroll. No hay ningún «fotograma»
 * calculado en JavaScript: mover el dedo ES mover las tarjetas, sin retraso
 * perceptible, que es la diferencia entre un efecto y un truco.
 *
 * Cada tarjeta está viva por dentro: un destello de lámina de oro la recorre
 * cada pocos segundos, y las de mundo sangriento llevan una vela encendida en
 * la esquina cuyo resplandor tiembla como una llama de verdad.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ICONOS } from './iconos';
import { Pulsable, useMenosMovimiento } from './vivo';
import { color, espacio, fuente, radio } from './tema';
import type { Velada } from './vitrina';

export const ANCHO_MUNDO = 252;
export const ALTO_MUNDO = 340;
const HUECO = espacio.md;
const PASO = ANCHO_MUNDO + HUECO;

// ---------------------------------------------------------------------------
// El destello de lámina de oro
// ---------------------------------------------------------------------------

function Destello({ retardo = 0 }: { retardo?: number }): JSX.Element | null {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);

  useEffect(() => {
    if (menos) return;
    t.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 3400 + retardo }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [t, menos, retardo]);

  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.12, 0.88, 1], [0, 0.5, 0.5, 0]),
    transform: [
      { translateX: interpolate(t.value, [0, 1], [-ANCHO_MUNDO * 0.7, ANCHO_MUNDO * 1.25]) },
      { rotate: '16deg' },
    ],
  }));

  if (menos) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: -40, width: 64, height: ALTO_MUNDO + 80 }, estilo]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,241,200,0.42)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// La vela de los mundos de sangre
// ---------------------------------------------------------------------------

function Vela({ tono }: { tono: string }): JSX.Element {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);

  useEffect(() => {
    if (menos) return;
    // Duraciones desiguales a propósito: una llama no respira a compás.
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 620, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.55, { duration: 240 }),
        withTiming(0.9, { duration: 480, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 380 }),
      ),
      -1,
      true,
    );
  }, [t, menos]);

  const estilo = useAnimatedStyle(() => ({
    opacity: menos ? 0.5 : interpolate(t.value, [0, 1], [0.3, 0.75]),
    transform: [{ scale: menos ? 1 : interpolate(t.value, [0, 1], [0.94, 1.08]) }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[estilos.vela, estilo]}>
      <Svg width={130} height={130}>
        <Defs>
          <RadialGradient id="llama" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={tono} stopOpacity={0.55} />
            <Stop offset="55%" stopColor={tono} stopOpacity={0.16} />
            <Stop offset="100%" stopColor={tono} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={130} height={130} fill="url(#llama)" />
        <Circle cx={65} cy={65} r={3} fill="#ffd98a" opacity={0.9} />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Una tarjeta-mundo
// ---------------------------------------------------------------------------

function TarjetaMundo({
  velada,
  indice,
  scrollX,
  onMontar,
}: {
  velada: Velada;
  indice: number;
  scrollX: SharedValue<number>;
  onMontar: () => void;
}): JSX.Element {
  const Icono = ICONOS[velada.icono];

  const escora = useAnimatedStyle(() => {
    const centro = indice * PASO;
    const entrada = [centro - PASO, centro, centro + PASO];
    return {
      transform: [
        // La perspectiva primero: sin ella, rotateY solo encoge, no gira.
        { perspective: 900 },
        { rotateY: `${interpolate(scrollX.value, entrada, [16, 0, -16], 'clamp')}deg` },
        { scale: interpolate(scrollX.value, entrada, [0.9, 1, 0.9], 'clamp') },
        { translateY: interpolate(scrollX.value, entrada, [14, 0, 14], 'clamp') },
      ],
      opacity: interpolate(scrollX.value, entrada, [0.62, 1, 0.62], 'clamp'),
    };
  });

  const esSangre = velada.paleta.acento === '#d4636f';

  return (
    <Animated.View style={escora}>
      <Pulsable onPress={onMontar} accessibilityLabel={`${velada.nombre}. ${velada.lema}`}>
        <View style={[estilos.mundo, { borderColor: `${velada.paleta.acento}66` }]}>
          <LinearGradient
            colors={velada.paleta.fondo}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* La luz de la esquina: lo que separa un color plano de un lugar. */}
          <Svg width={ANCHO_MUNDO} height={ALTO_MUNDO} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id={`luz-${velada.id}`} cx="22%" cy="12%" r="70%">
                <Stop offset="0%" stopColor={velada.paleta.acento} stopOpacity={0.2} />
                <Stop offset="100%" stopColor={velada.paleta.acento} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={ANCHO_MUNDO} height={ALTO_MUNDO} fill={`url(#luz-${velada.id})`} />
          </Svg>
          {esSangre && <Vela tono="#e8a04a" />}

          <View style={estilos.mundoDentro}>
            <View style={estilos.filaAlta}>
              <View style={[estilos.anillo, { borderColor: `${velada.paleta.acento}88` }]}>
                {Icono ? <Icono color={velada.paleta.acento} /> : null}
              </View>
              <View style={[estilos.insignia, { borderColor: `${velada.paleta.acento}66` }]}>
                <Text style={[estilos.insigniaTexto, { color: velada.paleta.acento }]}>
                  {velada.disponible ? 'DISPONIBLE' : 'MUY PRONTO'}
                </Text>
              </View>
            </View>

            <View style={{ flex: 1 }} />

            <Text style={[estilos.genero, { color: velada.paleta.acento }]}>
              {velada.genero.toUpperCase()}
            </Text>
            <Text style={estilos.nombre} numberOfLines={2}>
              {velada.nombre}
            </Text>
            <Text style={estilos.lema} numberOfLines={2}>
              {velada.lema}
            </Text>

            <View style={[estilos.filete, { backgroundColor: `${velada.paleta.acento}44` }]} />
            <View style={estilos.filaMeta}>
              <Text style={estilos.meta}>{velada.gente} personas</Text>
              <Text style={estilos.meta}>·</Text>
              <Text style={estilos.meta}>{velada.duracion}</Text>
            </View>
            <Text style={[estilos.llamada, { color: velada.paleta.acento }]}>
              Montar esta velada →
            </Text>
          </View>

          <Destello retardo={(indice * 1300) % 2600} />
        </View>
      </Pulsable>
    </Animated.View>
  );
}

/** El cierre del carrusel: forjar la tuya. */
function TarjetaForja({ indice, scrollX, onAbrir }: { indice: number; scrollX: SharedValue<number>; onAbrir: () => void }): JSX.Element {
  const menos = useMenosMovimiento();
  const giro = useSharedValue(0);
  useEffect(() => {
    if (menos) return;
    giro.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1, false);
  }, [giro, menos]);
  const estrella = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(giro.value, [0, 1], [0, 360])}deg` }],
  }));

  const escora = useAnimatedStyle(() => {
    const centro = indice * PASO;
    const entrada = [centro - PASO, centro, centro + PASO];
    return {
      transform: [
        { perspective: 900 },
        { rotateY: `${interpolate(scrollX.value, entrada, [16, 0, -16], 'clamp')}deg` },
        { scale: interpolate(scrollX.value, entrada, [0.9, 1, 0.9], 'clamp') },
      ],
      opacity: interpolate(scrollX.value, entrada, [0.62, 1, 0.62], 'clamp'),
    };
  });

  return (
    <Animated.View style={escora}>
      <Pulsable onPress={onAbrir} accessibilityLabel="Forjar tu propia velada en el taller">
        <View style={[estilos.mundo, estilos.forja]}>
          <Animated.View style={estrella}>
            <Text style={estilos.forjaGlifo}>✦</Text>
          </Animated.View>
          <Text style={estilos.forjaTitulo}>Forja la tuya</Text>
          <Text style={estilos.forjaCuerpo}>
            El agente escribe la trama contigo: los personajes son tus invitados, el escenario es tu
            casa, y el crimen es asunto vuestro.
          </Text>
          <Text style={[estilos.llamada, { color: color.oro300 }]}>Abrir el taller →</Text>
        </View>
      </Pulsable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// El carrusel
// ---------------------------------------------------------------------------

export function CarruselDeMundos({
  veladas,
  anchoPantalla,
  onMontar,
}: {
  veladas: Velada[];
  anchoPantalla: number;
  onMontar: () => void;
}): JSX.Element {
  const scrollX = useSharedValue(0);
  const alScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });
  const margen = Math.max((anchoPantalla - ANCHO_MUNDO) / 2, espacio.lg);

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={PASO}
      onScroll={alScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{
        paddingHorizontal: margen,
        paddingVertical: espacio.md,
        gap: HUECO,
      }}
    >
      {veladas.map((v, i) => (
        <TarjetaMundo key={v.id} velada={v} indice={i} scrollX={scrollX} onMontar={onMontar} />
      ))}
      <TarjetaForja indice={veladas.length} scrollX={scrollX} onAbrir={onMontar} />
    </Animated.ScrollView>
  );
}

// ---------------------------------------------------------------------------

const estilos = StyleSheet.create({
  mundo: {
    width: ANCHO_MUNDO,
    height: ALTO_MUNDO,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mundoDentro: { flex: 1, padding: espacio.lg },
  filaAlta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  anillo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  insignia: {
    borderWidth: 1,
    borderRadius: radio.redondo,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  insigniaTexto: { fontFamily: fuente.titulo, fontSize: 9, letterSpacing: 1.6 },
  genero: { fontFamily: fuente.titulo, fontSize: 10.5, letterSpacing: 2.2 },
  nombre: {
    fontFamily: fuente.display,
    fontSize: 30,
    lineHeight: 36,
    color: color.pergamino,
    marginTop: 4,
  },
  lema: {
    fontFamily: fuente.cuerpoCursiva,
    fontSize: 16,
    lineHeight: 21,
    color: color.pergaminoTenue,
    opacity: 0.85,
    marginTop: 4,
  },
  filete: { height: 1, marginVertical: espacio.md },
  filaMeta: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  meta: { fontFamily: fuente.cuerpo, fontSize: 14.5, color: color.pergaminoTenue, opacity: 0.7 },
  llamada: {
    fontFamily: fuente.titulo,
    fontSize: 12.5,
    letterSpacing: 1.4,
    marginTop: espacio.md,
  },
  vela: { position: 'absolute', right: -30, bottom: -30 },

  forja: {
    borderColor: 'rgba(201,162,39,0.4)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(217,201,163,0.05)',
    padding: espacio.lg,
    justifyContent: 'center',
  },
  forjaGlifo: { fontSize: 34, color: color.oro400 },
  forjaTitulo: {
    fontFamily: fuente.display,
    fontSize: 26,
    color: color.pergamino,
    marginTop: espacio.md,
  },
  forjaCuerpo: {
    fontFamily: fuente.cuerpo,
    fontSize: 15.5,
    lineHeight: 21,
    color: color.pergaminoTenue,
    opacity: 0.8,
    marginTop: espacio.sm,
  },
});
