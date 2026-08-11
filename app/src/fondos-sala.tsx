/**
 * Los fondos de sala: la ilustración generada de cada juego, cruzándose con el
 * carrusel.
 *
 * CÓMO SE MUEVE. Cada sala es una capa a pantalla completa cuya opacidad y
 * deriva lateral dependen de la distancia entre su índice y la posición del
 * carrusel: la sala activa está plena y quieta, la vecina asoma desplazada y
 * apagándose. La imagen va un 8 % más grande que el marco para que la deriva
 * nunca enseñe un borde. Todo por Reanimated, atado al dedo.
 *
 * MIENTRAS NO HAY IMAGEN GENERADA, cada sala tiene su telón de degradado con
 * el color de su mundo. No es un «placeholder gris»: es la misma composición
 * con la atmósfera mínima, y el día que el servidor genere el fondo 4K la capa
 * lo enseña sin que cambie nada más.
 */
import { Image, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PASO } from './carrusel3d';
import * as api from './api';

/** El telón de cada mundo mientras su ilustración no existe. */
const TELONES: Record<string, readonly [string, string, string]> = {
  cluedo: ['#2a0e18', '#3a1220', '#12060a'],
  forja: ['#2c1c0c', '#3a2410', '#140b04'],
};
const TELON_GENERICO = ['#101d16', '#16281e', '#070f0a'] as const;

function CapaDeFondo({
  sala,
  indice,
  url,
  scrollX,
  ancho,
  alto,
}: {
  sala: string;
  indice: number;
  url?: string;
  scrollX: SharedValue<number>;
  ancho: number;
  alto: number;
}): JSX.Element {
  const estilo = useAnimatedStyle(() => {
    const p = scrollX.value / PASO;
    const distancia = indice - p;
    return {
      opacity: interpolate(Math.abs(distancia), [0, 0.6, 1], [1, 0.35, 0], 'clamp'),
      transform: [{ translateX: distancia * ancho * 0.22 }],
    };
  });

  const telon = TELONES[sala] ?? TELON_GENERICO;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, estilo]}>
      {url ? (
        <Image
          source={{ uri: api.urlAbsoluta(url) }}
          resizeMode="cover"
          // Un 8 % de sobra a cada lado: la deriva nunca enseña el borde.
          style={{
            position: 'absolute',
            left: -ancho * 0.08,
            top: 0,
            width: ancho * 1.16,
            height: alto,
          }}
        />
      ) : (
        <LinearGradient colors={[...telon]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      )}
    </Animated.View>
  );
}

export function FondoDeSalas({
  salas,
  fondos,
  scrollX,
  ancho,
  alto,
}: {
  salas: string[];
  /** sala → ruta firmada de su ilustración, si el servidor la tiene. */
  fondos: Record<string, string>;
  scrollX: SharedValue<number>;
  ancho: number;
  alto: number;
}): JSX.Element {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: ancho, height: alto, overflow: 'hidden' }}>
      {salas.map((sala, i) => (
        <CapaDeFondo
          key={`${sala}-${i}`}
          sala={sala}
          indice={i}
          url={fondos[sala]}
          scrollX={scrollX}
          ancho={ancho}
          alto={alto}
        />
      ))}
      {/* El remate de cine: viñeta arriba y fundido al cuerpo de la página. */}
      <LinearGradient
        colors={['rgba(5,13,9,0.5)', 'transparent']}
        style={{ position: 'absolute', top: 0, width: ancho, height: 80 }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(5,13,9,0.9)', '#050d09']}
        style={{ position: 'absolute', bottom: 0, width: ancho, height: alto * 0.24 }}
      />
    </View>
  );
}
