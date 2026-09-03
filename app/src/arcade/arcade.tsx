/**
 * «EL ARCADE», POR FUERA: esperar a que Skia esté y traerlo entonces.
 *
 * Todo el juego —el lienzo, el bucle, los sprites— vive en `arcade-lienzo.tsx`.
 * Aquí no hay juego: hay la puerta y la espera, y cada línea de la puerta está
 * por un motivo que cuesta caro descubrir a mano.
 *
 * ═══ POR QUÉ EL JUEGO ENTRA CON `React.lazy` Y NO CON UN `import` NORMAL ═══
 *
 * Porque en web `@shopify/react-native-skia` hace esto AL CARGARSE el módulo:
 *
 *     export const Skia = JsiSkApi(global.CanvasKit);
 *
 * CanvasKit es el binario de WebAssembly, y no está hasta que `LoadSkiaWeb`
 * termina de descargarlo. O sea que importar el paquete antes de tiempo no falla
 * al pintar: falla EN LA LÍNEA DEL `import`.
 *
 * Y eso alcanzaría mucho más lejos de lo que parece. La PORTADA lee la Sala de
 * Arcade para saber qué tarjetas son pulsables —`vitrina.ts` → `pintados.ts` →
 * este fichero— así que un `import` estático de Skia aquí arriba se ejecutaría al
 * abrir la app, antes de que nadie haya tocado nada, y dejaría la portada entera
 * en blanco en web. Un fallo mudo, en la primera pantalla, por una importación
 * que parece inocente.
 *
 * Con `lazy`, el módulo del juego no se toca hasta que se RENDERIZA, y solo se
 * renderiza cuando `usarCanvasKit()` dice que sí.
 *
 * Por lo mismo, lo que este fichero importa arriba tiene que seguir siendo barato
 * y mudo: `shared/arcade/juegos` es TypeScript pelado —lo carga ya `pintados.ts`
 * en el mismo grafo— y `expo-linear-gradient` viaja dentro de la app desde antes
 * de que existiera la Sala. Ninguno de los dos toca la GPU al importarse.
 *
 * ═══ POR QUÉ NO SE USA `WithSkiaWeb`, QUE HACE ESTO MISMO ═══
 *
 * Porque vive en `@shopify/react-native-skia/lib/module/web` y trae detrás el
 * cargador de Emscripten y el `.wasm`. Importarlo aquí metería todo eso en el
 * paquete de Android y de iOS para no ejecutarlo jamás — allí Skia viaja dentro
 * del binario. El reparto por plataforma lo hace `./skia.ts` y `./skia.web.ts`,
 * que es el mismo que la app ya usa para el 3D.
 */
import { lazy, Suspense, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MANIFIESTO_EL_ARCADE } from '../../../shared/arcade/juegos';
import { conAlfa } from '../tema';
import { CUENTA_DE_AFORO, LETRA, RADIO, SALA } from './muebles';
import { usarCanvasKit } from './skia';

/**
 * El juego, traído solo cuando hace falta.
 *
 * Se crea aquí, en el ámbito del módulo, y crearlo NO importa nada: `lazy` guarda
 * la función y la llama la primera vez que el componente se renderiza. Ponerlo
 * dentro del componente lo volvería a crear en cada renderizado, y React trataría
 * cada uno como un componente distinto: el juego se desmontaría y se volvería a
 * montar sesenta veces por segundo, o sea la partida reiniciándose sola.
 */
const ElJuego = lazy(() => import('./arcade-lienzo'));

/**
 * El aforo, LEÍDO DEL MANIFIESTO Y NO ESCRITO A MANO.
 *
 * El raíl de muescas dice cuántas personas caben y cuántas hacen falta, y esa
 * cuenta es un dato del juego. Con un `1` escrito aquí, el día que este arcade
 * admitiera dos, la espera seguiría enseñando una sola muesca sin que fallara
 * nada: una mentira muda, que es justo la clase de fallo que la Sala entera
 * intenta no tener.
 */
const AFORO = MANIFIESTO_EL_ARCADE.jugadores;

/**
 * EL LATIDO DE LA ESPERA, y por qué es gris y por qué no está en el texto.
 *
 * En web esto puede durar segundos —son megabytes de WebAssembly que hay que
 * descargar y compilar— y una pantalla completamente quieta durante ese rato no
 * se lee como «preparando» sino como «colgado». Basta un piloto que respira.
 *
 * Respira el PILOTO y no la frase, porque bajarle la opacidad a un texto le baja
 * el contraste, y el contraste flojo era la peor flaqueza de la Sala anterior. Y
 * es GRIS y no del acento porque en esta Sala el acento significa «esto está vivo
 * o se puede tocar», y una máquina que todavía no tiene lienzo no se puede tocar.
 *
 * `useNativeDriver` porque solo se anima la opacidad: así el latido no pasa por el
 * hilo de JavaScript, que es precisamente el que está ocupado montando Skia.
 */
function usarLatido(): Animated.Value {
  const latido = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(latido, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    bucle.start();
    return () => bucle.stop();
  }, [latido]);
  return latido;
}

/**
 * EL RAÍL DE AFORO: la firma de la Sala, tantas muescas como cabe y encendidas
 * las que hacen falta para empezar. Aquí, una y encendida.
 *
 * Va también en la espera —y no solo en la Sala— porque es lo que hace que esta
 * pantalla se reconozca como la misma casa antes de leer una palabra.
 */
function RailDeAforo(): JSX.Element {
  return (
    <View
      style={estilos.rail}
      accessibilityRole="image"
      accessibilityLabel={`Aforo: de ${AFORO.minimo} a ${AFORO.maximo} jugadores.`}
    >
      {Array.from({ length: AFORO.maximo }, (_, i) => (
        <View key={i} style={estilos.muesca}>
          {i < AFORO.minimo ? (
            <>
              {/*
               * El resplandor de la muesca encendida se pinta como un PLANO
               * detrás y no como sombra. La sombra de React Native es la de un
               * objeto físico —y en Android es `elevation`, que además dibuja
               * hacia abajo—, y en esta Sala no hay materia: hay luz.
               */}
              <View style={estilos.halo} />
              <View style={estilos.encendida} />
            </>
          ) : (
            <View style={estilos.apagada} />
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * LO QUE SE VE MIENTRAS EL LIENZO NO ESTÁ: la ficha de la máquina, no un cargador.
 *
 * Es la misma anatomía de la Sala —raíl de aforo, placa de acento con el nombre y
 * el gancho, y una barra abajo con el estado—, así que quien acaba de tocar la
 * tarjeta sigue viendo la tarjeta que tocó mientras su pantalla se calienta. Una
 * rueda girando sobre negro sería una pantalla de sistema, y esta Sala no tiene
 * ninguna.
 *
 * Falta a propósito la fila de tres datos —aforo, sede, ritmo— que la ficha sí
 * lleva en la Sala: ahí sirve para comparar cinco máquinas, y aquí ya se ha
 * elegido una. El raíl se queda porque no es dato repetido: es la firma.
 *
 * El nombre y el gancho salen del MANIFIESTO. Escritos a mano se quedarían viejos
 * el día que el juego cambie los suyos, y entonces la espera diría una cosa y la
 * Sala otra.
 */
function Esperando(): JSX.Element {
  const latido = usarLatido();
  return (
    <View style={estilos.centro}>
      <View style={estilos.columna}>
        <RailDeAforo />
        <View style={estilos.ficha}>
          {/*
           * LA PLACA: el único sitio donde vive el color, y por eso es grande. El
           * degradado cae hacia abajo escorado a la derecha, como los 158° de la
           * maqueta; `acentoHondo` existe justamente para ser su fondo.
           */}
          <LinearGradient
            colors={[SALA.acento, SALA.acentoHondo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={estilos.placa}
          >
            <Text style={estilos.nombre}>{MANIFIESTO_EL_ARCADE.nombre}</Text>
            <Text style={estilos.gancho}>{MANIFIESTO_EL_ARCADE.gancho}</Text>
          </LinearGradient>
          <View style={estilos.barra}>
            <Animated.View style={[estilos.piloto, { opacity: latido }]} />
            {/*
             * Dice QUÉ FALTA y no «cargando». Y va en `palabra` y no en `tenue`
             * —que es el gris de los estados en la Sala— porque allí el estado
             * acompaña a cinco fichas y aquí es la única frase de la pantalla: lo
             * que se ha venido a leer.
             */}
            <Text style={estilos.estado}>Preparando el lienzo…</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function ElArcade(): JSX.Element {
  const listo = usarCanvasKit();
  if (!listo) return <Esperando />;
  return (
    <Suspense fallback={<Esperando />}>
      <ElJuego />
    </Suspense>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: SALA.suelo,
  },
  /** El ancho de una ficha de la Sala; más allá, la placa se convierte en un cartel. */
  columna: { width: '100%', maxWidth: 360 },

  /* ---------- El raíl de aforo ---------- */
  rail: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: CUENTA_DE_AFORO.huecoDestacada,
    height: 19,
    borderBottomWidth: 1,
    borderBottomColor: SALA.filo,
    marginBottom: 11,
  },
  muesca: {
    width: CUENTA_DE_AFORO.grosor,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  encendida: {
    width: CUENTA_DE_AFORO.grosor,
    height: CUENTA_DE_AFORO.altoEncendida,
    borderRadius: 2,
    backgroundColor: SALA.acento,
  },
  apagada: {
    width: CUENTA_DE_AFORO.grosor,
    height: CUENTA_DE_AFORO.altoApagada,
    borderRadius: 2,
    backgroundColor: SALA.filoVivo,
  },
  halo: {
    position: 'absolute',
    bottom: -4,
    width: 13,
    height: CUENTA_DE_AFORO.altoEncendida + 8,
    borderRadius: 7,
    backgroundColor: SALA.halo,
  },

  /* ---------- La ficha ---------- */
  ficha: {
    borderRadius: RADIO.ficha,
    /* Un filo de un píxel y un escalón de gris: es todo lo que separa la ficha
       del suelo. Ni sombra, ni bisel, ni relieve. */
    borderWidth: 1,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
    overflow: 'hidden',
  },
  placa: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 24 },
  nombre: { ...LETRA.rotulo, fontSize: 26, lineHeight: 30, color: SALA.blanco },
  gancho: {
    ...LETRA.cuerpo,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    /* Un punto por debajo del blanco del nombre: la jerarquía sin meter un
       segundo color encima del acento. */
    color: conAlfa(SALA.blanco, 0.94),
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    /* El filo de arriba ocupa un píxel y se le resta al hueco, que si no la
       franja queda un pelo más alta por arriba que por abajo. */
    paddingTop: 12,
    paddingBottom: 13,
    borderTopWidth: 1,
    borderTopColor: SALA.filo,
    /** Una franja levantada dentro de la ficha: `tejaAlta`, un escalón sobre la teja. */
    backgroundColor: SALA.tejaAlta,
  },
  piloto: { width: 7, height: 7, borderRadius: 4, backgroundColor: SALA.tenue },
  estado: { ...LETRA.rotuloChico, fontSize: 13, color: SALA.palabra, flexShrink: 1 },
});
