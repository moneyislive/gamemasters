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
import { conAlfa, useJuego, useTema } from './tema-juego';
import { manifiestoDe, manifiestoSiExiste } from '../../shared/juegos';
import type { AvisoClave } from '../../shared/live';

const { width } = Dimensions.get('window');

/**
 * Cada momento tiene su rótulo y su color.
 *
 * ═══ LOS RÓTULOS LOS PONE EL JUEGO ═══
 *
 * Aquí había tres tablas: la de abajo con las palabras de CLUEDO, y dos de
 * excepciones —`ROTULO_MOMIA` y `ROTULO_SOMBRAS`— escritas al lado. Eso tenía dos
 * problemas.
 *
 * El primero, que la de la Momia solo cubría DOS de los ocho rótulos, así que el
 * telón de abrir vigilia decía «Comienza la ronda» encima de un cuerpo que decía
 * «Vigilia 3 de 5». Título de un juego y cuerpo de otro, en la misma pantalla y a
 * tamaño grande, que es donde más se nota.
 *
 * El segundo es más sintomático: el rótulo por defecto de `sellado` era «Se abre
 * El Sellado», o sea que la tabla de CLUEDO llevaba dentro el nombre de una fase
 * de la Momia. Las palabras se habían mezclado en las dos direcciones.
 *
 * Ahora cada juego declara los suyos en su manifiesto, junto al resto de sus
 * palabras —el cuerpo del telón ya salía de ahí— y esta tabla se queda como
 * RESPALDO, que es lo que hace que CLUEDO no cambie: sus ocho siguen aquí y él no
 * declara ninguno.
 */
/*
 * ═══ AQUI HABIA OCHO ROTULOS, Y ERAN LOS DE CLUEDO ═══
 *
 *     'ronda-abierta': 'Comienza la ronda'
 *     respuestas:      'Hora de acusar'
 *     desenlace:       'El sobre del crimen'
 *
 * Con el comentario, escrito al lado, de que «aqui solo van las palabras de
 * CLUEDO». Los otros dos juegos declaraban las suyas en su manifiesto y este no
 * hacia falta que las declarara: las suyas ERAN el respaldo.
 *
 * Eso es lo que significa que un juego este dentro de la plataforma en vez de al
 * lado, y se nota en el unico sitio donde importa: un juego nuevo que se olvide
 * de declarar sus rotulos no ve un error —ve el telon de un asesinato en una
 * mansion en mitad de su partida.
 *
 * Ahora CLUEDO los declara como los demas y aqui no queda ninguno. El respaldo
 * es el TONO, que no es una palabra sino lo que el color significa: rojo para
 * lo que pesa, oro para lo que celebra. Eso si es de la plataforma.
 */
const TONO: Partial<Record<AvisoClave, string>> = {
  'ronda-abierta': color.oro300,
  'ronda-cerrada': color.oro400,
  giro: '#e8a0a0',
  ayuda: color.oro300,
  respuestas: '#f0c9c0',
  desenlace: '#f0c9c0',
  ganador: color.oro300,
  sellado: '#f0c9c0',
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
  const juego = useJuego();
  /*
   * El TÍTULO puede venir del juego; el TONO no. El color dice qué clase de
   * momento es —dorado si algo empieza, rosa si algo se decide— y eso significa
   * lo mismo en cualquier juego; además ya sale de la paleta, así que un juego
   * con otros colores lo recibe teñido sin declarar nada.
   */
  const rotulosDelJuego = manifiestoSiExiste(juego)?.rotulosDeAviso ?? {};
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
  /*
   * El TITULO lo pone el juego; el TONO, siempre esta tabla. Aqui habia ademas
   * un respaldo de titulos con las siete palabras de CLUEDO —«Hora de acusar»,
   * «El sobre del crimen»— que ya estaban REPETIDAS en su manifiesto, asi que
   * no las usaba nadie y solo servian para que un juego que se olvidara de
   * declarar las suyas viera las de un asesinato sin enterarse.
   */
  const rotulo = {
    titulo: rotulosDelJuego[aviso.clave] ?? 'Atención',
    tono: TONO[aviso.clave] ?? color.oro300,
  };

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
