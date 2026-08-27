/**
 * El reloj de la ronda.
 *
 * Se sincroniza con la hora del SERVIDOR, no con la del móvil: doce teléfonos
 * con relojes ligeramente distintos darían doce cuentas atrás distintas, y la
 * discusión sobre cuánto queda arruina el final de cada ronda.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { espacio, fuente, texto } from './tema';
import { conAlfa, useTema } from './tema-juego';

export function Reloj({
  terminaEn,
  ahoraServidor,
}: {
  terminaEn?: string;
  ahoraServidor: string;
}): JSX.Element | null {
  const t = useTema();
  // Diferencia entre el reloj del móvil y el del servidor, medida una vez.
  const desfase = useRef(0);
  useEffect(() => {
    desfase.current = new Date(ahoraServidor).getTime() - Date.now();
  }, [ahoraServidor]);

  const [restante, setRestante] = useState(0);
  const pulso = useSharedValue(1);

  useEffect(() => {
    if (!terminaEn) return;
    const calcular = (): void => {
      const fin = new Date(terminaEn).getTime();
      setRestante(Math.max(0, fin - (Date.now() + desfase.current)));
    };
    calcular();
    const id = setInterval(calcular, 500);
    return () => clearInterval(id);
  }, [terminaEn]);

  const apurado = restante > 0 && restante < 60_000;

  useEffect(() => {
    if (apurado) {
      pulso.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 480 }), withTiming(1, { duration: 480 })),
        -1,
      );
    } else {
      pulso.value = withTiming(1, { duration: 200 });
    }
  }, [apurado, pulso]);

  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: pulso.value }] }));

  if (!terminaEn) return null;

  const totalSeg = Math.floor(restante / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  const agotado = restante <= 0;

  return (
    <Animated.View
      style={[
        estilos.caja,
        /*
         * El reloj es del juego. Su caja llevaba el verde fieltro cosido en el
         * `StyleSheet` —`rgba(11,23,16,0.55)` es `feltoscuro`— y en una partida
         * de la Momia salía un recuadro verde de casino en mitad de una pantalla
         * de arena y lapislázuli. Se veía a un metro, y es de esas cosas que no
         * se encuentran leyendo: hay que abrir la pantalla y mirarla.
         *
         * Para CLUEDO no cambia un píxel: `conAlfa` reconstruye las mismas
         * cadenas que había escritas a mano, carácter a carácter.
         */
        { borderColor: conAlfa(t.oro500, 0.35), backgroundColor: conAlfa(t.feltoscuro, 0.55) },
        apurado && {
          borderColor: conAlfa(t.peligro, 0.7),
          backgroundColor: conAlfa(t.burdeos700, 0.22),
        },
        estilo,
      ]}
    >
      <Text style={[texto.microCaps, { color: apurado ? '#f0c9c0' : t.laton }]}>
        {agotado ? 'Tiempo cumplido' : 'Queda'}
      </Text>
      <Text
        style={[
          estilos.digitos,
          { color: agotado ? '#e8a0a0' : apurado ? '#f0c9c0' : t.oro300 },
        ]}
      >
        {agotado ? '00:00' : `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`}
      </Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    alignItems: 'center',
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  digitos: {
    fontFamily: fuente.tituloFuerte,
    fontSize: 34,
    letterSpacing: 3,
    marginTop: 2,
  },
});

export function BarraDeProgreso({ valor }: { valor: number }): JSX.Element {
  const t = useTema();
  const ancho = useSharedValue(0);
  useEffect(() => {
    ancho.value = withTiming(Math.max(0, Math.min(1, valor)), { duration: 500 });
  }, [valor, ancho]);
  const estilo = useAnimatedStyle(() => ({ width: `${ancho.value * 100}%` }));
  return (
    <View style={[barra.pista, { backgroundColor: conAlfa(t.oro500, 0.18) }]}>
      <Animated.View style={[barra.relleno, { backgroundColor: t.oro400 }, estilo]} />
    </View>
  );
}

const barra = StyleSheet.create({
  pista: { height: 4, borderRadius: 2, overflow: 'hidden' },
  relleno: { height: 4 },
});
