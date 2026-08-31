/**
 * La entrada de El Nudo de Valdehierro: el teleindicador de la estación.
 *
 * ═══ POR QUÉ NO ES UN FUNDIDO ═══
 *
 * Los cuatro juegos entraban con el mismo `FadeInDown.duration(500)` sobre el
 * bloque entero. Funciona y no dice nada: el título de una expedición al Valle
 * de los Reyes aparecía exactamente igual que el de una estación de tren.
 *
 * Aquí el título no aparece: SE COMPONE. Cada letra es una tablilla que gira
 * sobre su eje pasando por unos cuantos caracteres antes de asentarse, que es
 * como daba las salidas un teleindicador de aguja hasta hace nada.
 *
 * Y no es decoración prestada de otro sitio: la partida empieza porque ARDIÓ EL
 * CUADRO DE MARCHAS. Lo primero que hace la pantalla es escribir un cuadro a la
 * vista de todos, con el sonido de tablilla que se le supone. La animación
 * cuenta la premisa en vez de acompañarla.
 *
 * ═══ CÓMO ESTÁ HECHO, Y POR QUÉ ASÍ ═══
 *
 * El giro va por Reanimated —hilo de interfaz, sin cruzar el puente en cada
 * fotograma— y el REVOLTIJO de caracteres va por JavaScript, porque el hilo de
 * interfaz no puede cambiar el texto de un `Text`. Para que eso no cueste caro
 * hay UN SOLO temporizador para todo el cartel: cada tablilla deduce qué
 * carácter le toca del tiempo transcurrido y de su propio índice. Con un
 * temporizador por tablilla, un título de treinta y cinco letras montaba
 * treinta y cinco intervalos para minuto y medio de nada.
 *
 * El revoltijo se apaga solo cuando la última tablilla se asienta: un intervalo
 * que sigue latiendo detrás de una pantalla quieta es batería regalada.
 *
 * Y lo que decide la letra buena es el RELOJ, no cuántas veces haya latido ese
 * intervalo. El porqué está en `transcurrido`, unas líneas más abajo, y es la
 * diferencia entre un adorno y un título que se queda en jeroglífico.
 *
 * NADA DE `Math.random`. Igual que en `vivo.tsx`: la escena tiene que ser la
 * misma en cada arranque para poder mirarla dos veces y comparar.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useMenosMovimiento } from '../vivo';
import { conAlfa } from '../tema-juego';
import { COLOR_NUDO as C } from '../tema-nudo';
import { fuente } from '../tema';
import type { StyleProp, ViewStyle } from 'react-native';

/*
 * Lo que enseña una tablilla mientras da vueltas.
 *
 * Solo mayúsculas y dígitos, que es lo que llevaba un teleindicador de verdad:
 * metiendo minúsculas y signos el revoltijo parece ruido de terminal en vez de
 * un mecanismo con un juego de fichas contado.
 */
const RODILLO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789';

/** Cuánto tarda una tablilla en asentarse desde que empieza a girar. */
const GIRO_MS = 400;
/** Cada cuánto cambia el carácter mientras gira. */
const PASO_MS = 55;
/*
 * Techo de la cascada. Sin él, «Misterio en la Residencia Montenegro» —treinta
 * y cinco letras— tardaba casi dos segundos en terminar de escribirse, y una
 * entrada que se hace esperar deja de ser una entrada.
 */
const CASCADA_MAX_MS = 820;

/** El tamaño de tablilla que le cabe al título sin partirlo en cuatro filas. */
function medidaPara(largo: number): { ancho: number; alto: number; letra: number } {
  if (largo <= 16) return { ancho: 26, alto: 36, letra: 20 };
  if (largo <= 28) return { ancho: 21, alto: 30, letra: 16 };
  return { ancho: 17, alto: 25, letra: 13 };
}

/**
 * El título, compuesto tablilla a tablilla.
 *
 * `texto` se pone en mayúsculas: un teleindicador no tiene caja baja, y además
 * iguala la altura óptica de todas las fichas, que es lo que hace que la fila
 * se lea como un cartel y no como una palabra troceada.
 */
export function Teleindicador({
  texto,
  style,
}: {
  texto: string;
  style?: StyleProp<ViewStyle>;
}): JSX.Element {
  const menos = useMenosMovimiento();
  const letras = useMemo(() => [...texto.toUpperCase()], [texto]);
  const medida = useMemo(() => medidaPara(letras.length), [letras.length]);

  /*
   * ═══ SE PARTE POR PALABRAS, NO POR FICHAS ═══
   *
   * Con las tablillas sueltas en un `flexWrap`, el salto de línea caía donde
   * cupiera: «EL NUDO DE VALD / EHIERRO». Un teleindicador de verdad tampoco
   * parte palabras — reparte la fila y sigue en la siguiente —, y leerlo
   * partido cuesta el doble.
   *
   * Cada palabra es una fila que NO envuelve, y lo que envuelve es el cartel.
   * El índice global se lleva aparte para que la cascada no se reinicie en cada
   * palabra: lo que tiene que verse es una sola ola cruzando el cartel.
   */
  const palabras = useMemo(() => {
    const trozos: string[][] = [];
    let actual: string[] = [];
    for (const l of letras) {
      if (l === ' ') {
        if (actual.length) trozos.push(actual);
        actual = [];
      } else {
        actual.push(l);
      }
    }
    if (actual.length) trozos.push(actual);
    return trozos;
  }, [letras]);

  /* La cascada se aprieta cuando el título es largo, y nunca pasa del techo. */
  const paso = letras.length > 1 ? Math.min(38, CASCADA_MAX_MS / (letras.length - 1)) : 0;
  const finMs = paso * Math.max(0, letras.length - 1) + GIRO_MS;

  /*
   * ═══ EL RELOJ DE PARED, Y NO UNA CUENTA DE PULSOS ═══
   *
   * La primera versión contaba pulsos: cada latido del intervalo subía un
   * contador, y una tablilla se daba por asentada cuando el contador por 55 ms
   * pasaba de su retardo. Se veía bien en el escritorio y estaba MAL.
   *
   * Un navegador —y un móvil con la app en segundo plano— estrangula los
   * temporizadores a uno por segundo. Con eso, el intervalo se cortaba a los
   * 1,2 s de reloj real habiendo latido dos veces, la cuenta se quedaba en 110
   * de los 400 que hacían falta, y NINGUNA tablilla llegaba a su letra: el
   * título se quedaba en jeroglífico para siempre. Basta con mirar el móvil, ir
   * a otra app y volver.
   *
   * Ahora se mide tiempo REAL transcurrido. Si el navegador estrangula, el
   * revoltijo se ve a tirones —que da igual, es adorno— pero las tablillas se
   * asientan cuando toca. Y el remate lo pone el temporizador final, que da el
   * cartel por escrito aunque el intervalo no haya latido ni una vez: el estado
   * bueno no puede depender de que alguien nos deje animar.
   */
  const [transcurrido, setTranscurrido] = useState(menos ? finMs : 0);
  useEffect(() => {
    if (menos) {
      setTranscurrido(finMs);
      return undefined;
    }
    const arranque = Date.now();
    const reloj = setInterval(() => setTranscurrido(Date.now() - arranque), PASO_MS);
    const alto = setTimeout(() => {
      clearInterval(reloj);
      setTranscurrido(finMs);
    }, finMs + 60);
    return () => {
      clearInterval(reloj);
      clearTimeout(alto);
    };
  }, [menos, finMs]);

  return (
    <View
      style={[estilos.cartel, style]}
      accessible
      accessibilityRole="header"
      /*
       * El lector de pantalla lee el TÍTULO, no treinta y cinco letras sueltas.
       * Las tablillas son un efecto visual; deletrearlas sería castigar a quien
       * no las ve.
       */
      accessibilityLabel={texto}
    >
      {palabras.map((palabra, p) => {
        /* Cuántas fichas van delante de esta palabra, para no cortar la ola. */
        const antes = palabras.slice(0, p).reduce((n, w) => n + w.length, 0);
        return (
          <View key={`p${p}`} style={estilos.palabra}>
            {palabra.map((letra, j) => {
              const i = antes + j;
              return (
                <Tablilla
                  key={`${i}-${letra}`}
                  letra={letra}
                  indice={i}
                  retardo={paso * i}
                  transcurrido={transcurrido}
                  medida={medida}
                  quieta={menos}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function Tablilla({
  letra,
  indice,
  retardo,
  transcurrido,
  medida,
  quieta,
}: {
  letra: string;
  indice: number;
  retardo: number;
  transcurrido: number;
  medida: { ancho: number; alto: number; letra: number };
  quieta: boolean;
}): JSX.Element | null {
  const giro = useSharedValue(quieta ? 1 : 0);

  useEffect(() => {
    if (quieta) {
      giro.value = 1;
      return;
    }
    giro.value = withDelay(
      retardo,
      withTiming(1, { duration: GIRO_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [giro, retardo, quieta]);

  const animado = useAnimatedStyle(() => ({
    opacity: interpolate(giro.value, [0, 0.25, 1], [0, 1, 1]),
    transform: [
      /* Sin perspectiva, un `rotateX` es un aplastamiento vertical y no un giro. */
      { perspective: 420 },
      { rotateX: `${interpolate(giro.value, [0, 1], [-92, 0])}deg` },
    ],
  }));

  /*
   * Se asienta un poco antes de que el giro termine, no al final: la letra
   * buena tiene que estar ya puesta cuando la ficha llega a plano. Cambiandola
   * justo al acabar, el ojo pilla el cambio y parece que se corrige sola.
   */
  const asentada = quieta || transcurrido >= retardo + GIRO_MS * 0.72;
  /*
   * El desfase por indice es lo que evita que todas las tablillas ensenen la
   * misma letra a la vez: sin el, el cartel entero parpadea en bloque y parece
   * un fallo de pintado en vez de un mecanismo.
   */
  const vuelta = Math.floor(transcurrido / PASO_MS);
  const enGiro = RODILLO[(vuelta * 5 + indice * 11) % RODILLO.length] ?? letra;

  return (
    <Animated.View
      style={[
        estilos.tablilla,
        { width: medida.ancho, height: medida.alto },
        animado,
      ]}
    >
      <Text
        style={[
          estilos.letra,
          {
            fontSize: medida.letra,
            /* Mientras gira, la ficha está a contraluz: aún no es su letra. */
            color: asentada ? C.oro300 : conAlfa(C.oro300, 0.45),
          },
        ]}
        numberOfLines={1}
      >
        {asentada ? letra : enGiro}
      </Text>
      {/* La juntura del bastidor, que es lo que delata que la ficha es de dos mitades. */}
      <View style={[estilos.juntura, { top: medida.alto / 2 - 0.5 }]} />
    </Animated.View>
  );
}

/**
 * La vía, tendiéndose desde el centro.
 *
 * Sustituye al `Ornamento` genérico —una filigrana que llevan los cuatro
 * juegos— por lo único que hay debajo de una estación. Crece con `scaleX`
 * desde el centro, que es el origen que trae puesto una vista, así que no hace
 * falta medir nada ni compensar traslaciones.
 */
export function Via({ style }: { style?: StyleProp<ViewStyle> }): JSX.Element {
  const menos = useMenosMovimiento();
  const tender = useSharedValue(menos ? 1 : 0);

  useEffect(() => {
    if (menos) {
      tender.value = 1;
      return;
    }
    tender.value = withDelay(
      620,
      withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }),
    );
  }, [tender, menos]);

  const animado = useAnimatedStyle(() => ({
    opacity: interpolate(tender.value, [0, 0.2, 1], [0, 1, 1]),
    transform: [{ scaleX: tender.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[estilos.via, animado, style]}>
      <View style={estilos.carril} />
      <View style={estilos.traviesas}>
        {Array.from({ length: 13 }, (_, i) => (
          <View key={i} style={estilos.traviesa} />
        ))}
      </View>
      <View style={estilos.carril} />
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  cartel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    /* Ancho entre palabras, estrecho entre fichas: es lo que hace legible una
       fila de mayusculas sueltas. Las dos separaciones salen de aqui y de
       `palabra`, y no de un hueco falso hecho con una vista vacia. */
    columnGap: 11,
    rowGap: 5,
  },
  palabra: { flexDirection: 'row', gap: 3 },
  tablilla: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.caoba900,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: conAlfa(C.laton, 0.5),
    overflow: 'hidden',
  },
  letra: {
    fontFamily: fuente.tituloFuerte,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  juntura: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: conAlfa(C.feltoscuro, 0.85),
  },
  via: { alignSelf: 'stretch', gap: 3 },
  carril: { height: 1.5, backgroundColor: conAlfa(C.laton, 0.75), borderRadius: 1 },
  traviesas: { flexDirection: 'row', justifyContent: 'space-between' },
  traviesa: { width: 2, height: 5, backgroundColor: conAlfa(C.laton, 0.4) },
});
