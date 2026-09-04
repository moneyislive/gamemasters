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
 * y mudo, y la lista creció al traer esta espera a la gramática de la Sala, así
 * que se dice de cada uno por qué sigue sin costar nada: `shared/arcade/juegos` es
 * TypeScript pelado —lo carga ya `pintados.ts` en el mismo grafo—;
 * `expo-linear-gradient` viaja dentro de la app desde antes de que existiera la
 * Sala; `./piezas` y `../tema` viajan en ESTE MISMO GRAFO, porque los importa la
 * portada, que es quien importa este fichero; y `expo-router` es el router de la
 * app, montado mucho antes de que nadie pueda tocar una tarjeta. Ninguno toca la
 * GPU al importarse, que es la única prueba que hay que pasar.
 *
 * ═══ POR QUÉ NO SE USA `WithSkiaWeb`, QUE HACE ESTO MISMO ═══
 *
 * Porque vive en `@shopify/react-native-skia/lib/module/web` y trae detrás el
 * cargador de Emscripten y el `.wasm`. Importarlo aquí metería todo eso en el
 * paquete de Android y de iOS para no ejecutarlo jamás — allí Skia viaja dentro
 * del binario. El reparto por plataforma lo hace `./skia.ts` y `./skia.web.ts`,
 * que es el mismo que la app ya usa para el 3D.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MANIFIESTO_EL_ARCADE } from '../../../shared/arcade/juegos';
import { conAlfa, espacio } from '../tema';
import { LETRA, RADIO, SALA } from './muebles';
import { LuzDeEsquina, Pantalla, RailDeAforo, VeloDeLaPortada } from './piezas';
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
 * EL HUECO, UNO SOLO PARA LAS DOS SUPERFICIES.
 *
 * Había cuatro rellenos distintos en esta pantalla —24 en el marco, 20/26/24 en
 * la placa y 16 en la barra—, así que el rótulo de estado sobresalía cuatro
 * píxeles por la izquierda respecto del nombre que tiene justo encima, dentro de
 * la misma caja. Y el 24 ni siquiera estaba en la escala: `espacio` tiene 20 y 28.
 * Es el mismo HUECO único que la tarjeta de la Sala usa en la portada y en el pie,
 * y por el mismo motivo: todo cuelga de la misma vertical.
 */
const HUECO = espacio.lg;

/** El filo de la casa: un píxel, y también se le resta al hueco cuando ocupa. */
const FILO = 1;

/**
 * EL TOPE DE ANCHO, QUE NO ES EL DE NINGUNA FICHA.
 *
 * Decía «el ancho de una ficha de la Sala», y ninguna mide 360: la tarjeta mide 252
 * y la ficha ancha que hubo antes medía 378. Era un número huérfano con una
 * explicación prestada, que es peor que un número sin explicación — quien lo leyera
 * creería estar copiando una medida del sistema.
 *
 * Se queda en 360 y ahora con la razón que sí tiene, que es el LARGO DE RENGLÓN: el
 * gancho a 14,5 en los 320 útiles cae en unos 44 caracteres por línea, dentro de los
 * 45-75 que se leen de un vistazo. A pantalla completa de tableta serían más de 90 y
 * el ojo pierde el renglón al volver. No es el ancho de una ficha: es el punto en el
 * que la placa dejaría de ser una ficha para ser un cartel.
 */
const ANCHO_DE_LA_ESPERA = 360;

/**
 * ═══ EL CIELO DE LA PLACA: EL DEGRADADO, ANCLADO EN PÍXELES Y NO EN FRACCIONES ═══
 *
 * La regla de la casa para una placa de acento con texto encima es degradado
 * VERTICAL con `locations={[0, 0.4]}`, para que las palabras caigan donde el color
 * ya es hondo. Aquí hace falta un paso más, y es la única divergencia de esta
 * placa contra la tarjeta de la Sala:
 *
 *   · ALLÍ la portada mide 228 FIJOS, así que ese 40 % son 91 píxeles que no se
 *     mueven, y el bloque de texto, apoyado abajo, cae siempre por debajo.
 *   · AQUÍ la placa NO tiene alto fijo, y eso es a propósito: es lo que hace que
 *     nada se trunque cuando el sistema amplía la letra. Pero un 40 % de una caja
 *     que crece baja la banda clara encima de las palabras: con la ampliación al
 *     200 % el bloque de texto mide unos 244 y el corte se iría a 98, justo sobre
 *     el nombre.
 *
 * Así que el degradado no es la placa entera: es una BANDA de alto fijo pegada
 * arriba, sobre el `acentoHondo` liso de la placa. La transición termina en
 * `CIELO * 0,4` —48 píxeles— y de ahí para abajo todo es hondo entero, mida la
 * placa lo que mida y esté la letra del sistema donde esté. Es la misma regla, con
 * la cuenta hecha en píxeles en vez de en fracciones de una caja que se mueve.
 */
const CIELO = 120;
const HONDO_DESDE = CIELO * 0.4;

/**
 * EL LATIDO DE LA ESPERA, y por qué no está en el texto y por qué no baja de 0,65.
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
 * ═══ EL VALLE ERA 0,25, O SEA QUE EL PUNTO DESAPARECÍA ═══
 *
 * `tenue` compuesto sobre la franja `tejaAlta` da 5,67:1 al 100 %; al 25 % da
 * 1,49:1, que sobre ese fondo no es un piloto tenue: es un piloto que no está. El
 * punto no respiraba, parpadeaba entre visible e invisible, que es lo contrario de
 * lo que estas líneas dicen buscar — y a media luz media animación no se ve.
 *
 * El 3:1 que la casa exige a un elemento no textual se alcanza en alfa 0,63
 * —0,60 da 2,89—, así que el valle se pone en 0,65 para no depender del redondeo:
 * 3,13:1. Sigue siendo una respiración clara, porque lo que se lee no es el número
 * sino la diferencia entre los dos extremos.
 *
 * `useNativeDriver` porque solo se anima la opacidad: así el latido no pasa por el
 * hilo de JavaScript, que es precisamente el que está ocupado montando Skia.
 */
function usarLatido(): Animated.Value {
  const latido = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 0.65, duration: 900, useNativeDriver: true }),
        Animated.timing(latido, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    bucle.start();
    return () => bucle.stop();
  }, [latido]);
  return latido;
}

/**
 * ═══ CUÁNDO DEJA DE SER UNA ESPERA Y PASA A SER UNA PROMESA FALSA ═══
 *
 * «Preparando el lienzo…» puede no cumplirse NUNCA, y hasta ahora esta pantalla no
 * tenía forma de admitirlo. Si falta `canvaskit.wasm` o `locateFile` apunta mal
 * —los dos fallos que `skia.web.ts` documenta y los dos con el mismo síntoma—, la
 * promesa del cargador cae en su `.catch`, que deja el fallo en la consola y NO
 * llama a `setListo`: `usarCanvasKit()` devuelve `false` para siempre. El propio
 * cargador lo dice con todas las letras: «quien pinta enseña "cargando" para
 * siempre».
 *
 * Y quien lo estaba enseñando era esto, sin tiempo de espera, sin estado de error
 * y sin ningún control: el grupo va con `headerShown: false` y el único «Volver»
 * de todo el mueble vive DENTRO del juego (`arcade-lienzo.tsx`), que es
 * precisamente lo que no ha llegado a montarse. Con el piloto latiendo, además, la
 * pantalla parecía viva mientras no lo estaba.
 *
 * DOCE SEGUNDOS, y el número tiene los dos lados escritos: por debajo hay
 * conexiones lentas legítimas —son megabytes— y avisar antes sería llamar avería a
 * una descarga; por encima, quien espera ya ha decidido por su cuenta que algo va
 * mal, y lo único que le falta es una salida. No se cancela nada: la descarga sigue
 * y si llega, entra el juego. Lo que cambia es que la pantalla deja de prometer.
 *
 * En Android y en iOS esto no se ve casi nunca —allí `usarCanvasKit()` dice que sí
 * a la primera y lo único que queda por delante es el `React.lazy`—, pero el aviso
 * no se limita a la web: un `lazy` que no resuelve deja exactamente la misma
 * pantalla colgada, y ésa sí puede pasar en cualquier plataforma.
 */
const ESPERA_QUE_YA_ES_RARA = 12000;

function usarEsperaLarga(): boolean {
  const [tarda, setTarda] = useState(false);
  useEffect(() => {
    const aviso = setTimeout(() => setTarda(true), ESPERA_QUE_YA_ES_RARA);
    return () => clearTimeout(aviso);
  }, []);
  return tarda;
}

/** Salir de una máquina que no ha llegado a arrancar. */
function volverALaSala(): void {
  /*
   * `canGoBack` primero: esta pantalla se abre casi siempre desde la portada y
   * entonces «atrás» es exactamente lo que se espera. Pero en web se puede llegar
   * a `/lienzo` escribiendo la dirección, y ahí no hay nada detrás: sin esta
   * comprobación, el único botón de la pantalla no haría nada.
   */
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * LO QUE SE VE MIENTRAS EL LIENZO NO ESTÁ: la ficha de la máquina, no un cargador.
 *
 * ═══ AQUÍ DECÍA «ES LA MISMA ANATOMÍA DE LA SALA». NO LO ERA ═══
 *
 * Decía que quien acababa de tocar la tarjeta «sigue viendo la tarjeta que tocó», y
 * era falso punto por punto: la tarjeta de la Sala es un retrato de 252×392 con
 * radio 20, degradado VERTICAL cortado al 40 %, luz de esquina, velo, pastilla de
 * estado y el raíl DENTRO de la portada; esto era un panel apaisado de radio 14,
 * con degradado diagonal, sin velo, sin luz, sin pastilla y con el raíl fuera. La
 * frase no era un adorno: era la promesa de continuidad que justificaba el fichero
 * entero. Así que se ha cumplido donde se podía, y donde no, se dice.
 *
 * LO QUE AHORA SÍ SE COMPARTE, y son las piezas de verdad y no una copia:
 * `RailDeAforo`, `LuzDeEsquina` y `VeloDeLaPortada` de `./piezas`, el radio de
 * tarjeta, el borde teñido de acento, el hueco único, los cuerpos del bloque de
 * texto y el orden de las capas —degradado, luz, velo, contenido—.
 *
 * LO QUE NO, Y POR QUÉ:
 *
 *   · EL FORMATO. Sigue siendo apaisado y no el retrato de 252×392. Aquel alto va
 *     repartido entre 228 de portada y 162 de PIE, y aquí no hay pie: no hay datos
 *     que comparar —ya se ha elegido máquina— ni botón de entrar, porque entrar es
 *     lo que está pasando.
 *   · EL RAÍL VA FUERA DE LA PLACA, y es contraste y no gusto. `piezas.tsx` lo
 *     pinta en blanco, que es lo que vale en los tres fondos donde vive, y sobre el
 *     suelo da 18,3:1. Metido en la parte alta de la placa caería sobre el acento
 *     VIVO, donde el blanco da 1,98:1 en ámbar: la firma de la Sala, invisible en
 *     dos de los cuatro temas.
 *   · LA PASTILLA DE ESTADO. La franja de abajo hace su papel y no es la cápsula de
 *     `piezas.tsx` por una razón que se perdería al copiarla: el piloto de la
 *     pastilla es FIJO y el de aquí tiene que LATIR, que es lo único que separa
 *     «preparando» de «colgado» en una pantalla donde no hay nada que hacer.
 *
 * Falta a propósito la línea de datos —cuántos caben, dónde vive, a qué ritmo— que
 * la tarjeta sí lleva en su pie: ahí sirve para comparar cinco máquinas, y aquí ya
 * se ha elegido una. El raíl se queda porque no es dato repetido: es la firma.
 *
 * El nombre y el gancho salen del MANIFIESTO. Escritos a mano se quedarían viejos
 * el día que el juego cambie los suyos, y entonces la espera diría una cosa y la
 * Sala otra.
 */
function Esperando(): JSX.Element {
  const latido = usarLatido();
  const tarda = usarEsperaLarga();
  return (
    /*
     * `Pantalla` de `./piezas` y no un `View` de `flex: 1` con `justifyContent:
     * 'center'`, que es lo que había. Aquello centra muy bien y RECORTA POR LOS DOS
     * EXTREMOS en cuanto el contenido pasa del alto de la pantalla, sin que quede
     * forma de alcanzar lo que sobra. Y pasa: con la letra del sistema al 200 % el
     * bloque se va de unos 233 a más de 400, y un teléfono en horizontal deja 300.
     * `flexGrow: 1` más `justifyContent: 'center'` en el contenedor de contenido
     * hace que no haya que elegir: centrado mientras quepa, desplazable cuando no.
     */
    <Pantalla ancho={ANCHO_DE_LA_ESPERA}>
      {/*
        EL RAÍL LO PINTA `piezas.tsx`. Aquí había una copia con sus propias muescas,
        su halo y su filete, y se había separado de las otras dos: las apagadas iban
        en `filoVivo` —blanco al 14 %, o sea 1,42:1 sobre el suelo— que es el valor
        que la casa ya midió y rechazó. Hoy no se veía nunca, porque el aforo de este
        arcade es {1, 1} y la única muesca sale encendida; el riesgo era de copia,
        que es exactamente como llegó aquí.
      */}
      <RailDeAforo aforo={AFORO} estilo={estilos.rail} />

      <View style={estilos.ficha}>
        {/*
          ═══ LA PLACA: EL DEGRADADO ERA DIAGONAL, Y ESO ERA UN FALLO DE CONTRASTE ═══

          Decía «cae hacia abajo escorado a la derecha, como los 158° de la maqueta»,
          y las dos mitades eran falsas:

            · El ángulo. Con la placa real de 358×111 el vector es (179, 111) y el
              equivalente sale 121,8°; en un móvil de 360 dp sale 125,6°. No caía
              escorado: caía casi de lado, más horizontal que vertical.
            · Y la consecuencia: en diagonal el fondo de una letra depende de dónde
              caiga A LO ANCHO, así que la primera letra del nombre caía en t=0,183
              —acento casi puro— y la última en t=0,849. «EL ARCADE» en blanco
              empezaba en 2,29:1 en ámbar y acababa en 4,04, y el mínimo que la casa
              se aplica a sí misma para el nombre es 4,5. El gancho, además, no
              llegaba en NINGUNO de los cuatro temas: 3,97 en violeta, que es el que
              se envía hoy.

          Ahora es vertical con el corte al 40 %, como la tarjeta, y con el
          hundimiento anclado en píxeles (ver `CIELO`). Medido sobre el hondo entero
          y SIN contar el velo, que sólo suma: blanco a 6,60:1 en violeta, 4,69 en
          ámbar, 4,68 en verde y 7,34 en carmesí. Los cuatro pasan el 4,5 del texto
          normal, que es lo que ni el nombre ni el gancho hacían en ninguno.

          El orden de las capas es el de la casa y no es negociable: degradado, luz,
          velo, contenido. El velo lleva escrito en su cabecera que no es decoración
          y no es opcional; aquí, además, es lo que deja esta placa preparada para el
          día que el fondo sea una foto.
        */}
        <View style={estilos.placa}>
          <LinearGradient
            colors={[SALA.acento, SALA.acentoHondo]}
            locations={[0, 0.4]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={estilos.cielo}
          />
          <LuzDeEsquina id={MANIFIESTO_EL_ARCADE.id} />
          <VeloDeLaPortada />

          <View style={estilos.placaDentro}>
            {/*
              El separador que apoya el texto abajo: es el `flex: 1` de la tarjeta,
              con un MÍNIMO, y el mínimo es el que manda. `flexGrow` sólo reparte lo
              que sobra, y aquí no sobra nada porque la placa mide lo que mide su
              contenido; los 56 son los 48 donde el cielo termina de hundirse, más
              ocho de margen. Con ellos, el nombre nunca empieza por encima de 76.
            */}
            <View style={estilos.hueco} />
            <Text style={estilos.nombre}>{MANIFIESTO_EL_ARCADE.nombre}</Text>
            {/*
              El gancho iba en `conAlfa(SALA.blanco, 0.94)` «un punto por debajo del
              blanco del nombre», dos líneas después de que este mismo fichero
              explicara que bajarle el alfa a un texto le baja el contraste. Va en
              blanco entero, como en la tarjeta: la jerarquía la dan el cuerpo y la
              caja —26 en peso 800 contra 14,5 en 500—, que es de donde sale de
              verdad, y no una transparencia que sólo resta.
            */}
            <Text style={estilos.gancho}>{MANIFIESTO_EL_ARCADE.gancho}</Text>
          </View>
        </View>

        {/*
          LA BARRA ANUNCIA QUE ESTO ESTÁ OCUPADO, y antes no lo anunciaba. No había
          `progressbar`, ni `busy`, ni región viva: con lector de pantalla se oía una
          vez «Aforo», «El Arcade», el gancho y «Preparando el lienzo…», y después
          nada — ni progreso, ni fin, ni el cambio a la partida. En una espera de
          segundos, eso es la diferencia entre esperar y creer que se ha colgado.

          `accessibilityLiveRegion` cubre Android y la web; iOS no tiene región viva
          declarativa, así que allí el cambio de frase se oye al volver a recorrer la
          pantalla y no solo.

          Y `busy` se APAGA a los doce segundos, que es lo contrario de lo que parece:
          «ocupado» es una promesa de que esto termina, y pasado ese rato ya no se
          puede sostener. Mantenerlo encendido para siempre sería decirle al lector de
          pantalla exactamente la mentira que el texto acaba de dejar de decir.
        */}
        <View
          style={estilos.barra}
          accessibilityRole="progressbar"
          accessibilityState={{ busy: !tarda }}
          aria-busy={!tarda}
        >
          <Animated.View style={[estilos.piloto, { opacity: latido }]} />
          {/*
            Dice QUÉ FALTA y no «cargando». Y va en `palabra` y no en `tenue`: aquí
            decía que `tenue` «es el gris de los estados en la Sala», y ya no lo es
            —desde que el estado vive en la pastilla va en blanco de 13 sobre un plato
            oscuro—. El argumento bueno es el otro, y ese sigue en pie: allí el estado
            acompaña a cinco fichas y aquí es la única frase de la pantalla. Sobre la
            franja `tejaAlta`, `palabra` da 14,6:1.
          */}
          <Text
            style={estilos.estado}
            accessibilityLiveRegion="polite"
            aria-live="polite"
          >
            {tarda ? 'El lienzo no llega' : 'Preparando el lienzo…'}
          </Text>
        </View>

        {tarda && (
          <View style={estilos.salida}>
            <Text style={estilos.porque}>
              Puede que no haya podido descargarse el motor de dibujo. Se puede seguir
              esperando —a veces llega— o volver a la Sala e intentarlo más tarde.
            </Text>
            {/*
              EL BOTÓN NO ES DE ACENTO, y no es timidez: en esta Sala el acento
              significa «esto está vivo», y lo que está vivo aquí es la salida, no la
              máquina. Se pinta como el «Volver» de dentro del juego —filo y rótulo,
              sin gota de color— con dos correcciones medidas: el filo es `filoVivo`
              y no `filo`, porque un borde discreto obliga a que sea el TEXTO el que
              se recorte, y el texto es `palabra` y no `tenue`, que da 15,3:1 sobre la
              teja en vez de 5,87 y sobre todo no se confunde con `BOTON.quieto`, que
              es exactamente ese par y significa «apagado». Los 44 de alto son el
              mínimo de dedo.
            */}
            <Pressable
              onPress={volverALaSala}
              style={estilos.volver}
              accessibilityRole="button"
              accessibilityLabel="Volver a la Sala de Arcade"
            >
              <Text style={estilos.volverTexto}>Volver</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pantalla>
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
  /*
   * El raíl no lleva nada debajo en esta pantalla, así que el hueco con la ficha lo
   * pone quien lo usa y no la pieza — igual que en la tarjeta de la Sala. Los 10 son
   * los suyos. Ya no lleva filete inferior: con un aforo de una persona ese filete
   * medía tres píxeles.
   */
  rail: { marginBottom: 10 },

  /* ---------- La ficha ---------- */
  ficha: {
    /*
     * RADIO 20 Y NO 14. Los 14 son de `RADIO.ficha`, que la propia tabla reserva
     * para «paneles de DENTRO de una partida», que nadie ve al lado de una velada.
     * Esto es lo primero que se ve al tocar una tarjeta y se mira desde la misma
     * distancia: con otro radio no se lee como dos familias, se lee como un descuido.
     */
    borderRadius: RADIO.tarjeta,
    /*
     * Un filo de un píxel y un escalón de gris: es todo lo que separa la ficha del
     * suelo. Ni sombra, ni bisel, ni relieve. Teñido del acento al 42 %, que es lo
     * que la Sala pinta en una máquina VIVA — y ésta lo está: se está entrando en
     * ella. `SALA.filo` es el borde de la que no se puede jugar.
     */
    borderWidth: FILO,
    borderColor: conAlfa(SALA.acento, 0.42),
    backgroundColor: SALA.teja,
    overflow: 'hidden',
  },

  /*
   * La placa lleva el hondo LISO de fondo y el degradado como banda: es lo que hace
   * que por debajo de los 48 del cielo el color no dependa del alto de la caja.
   * El relleno va en `placaDentro` y no aquí, como en la portada de la tarjeta,
   * porque en Yoga el relleno del padre desplaza a los hijos absolutos y las tres
   * capas de arriba tienen que llegar a los bordes.
   */
  placa: { backgroundColor: SALA.acentoHondo },
  cielo: { position: 'absolute', top: 0, left: 0, right: 0, height: CIELO },
  placaDentro: { padding: HUECO },
  hueco: { flexGrow: 1, minHeight: HONDO_DESDE + 8 },

  /*
   * Los cuerpos son los de la tarjeta: 26/31 el nombre y 14,5/19 el gancho con 4 de
   * separación. Estaban en 26/30 y 15/21 con 10, que no era otra decisión sino la
   * misma sin poner de acuerdo. El mínimo de texto de esta casa es 13 y los dos lo
   * pasan.
   */
  nombre: { ...LETRA.rotulo, fontSize: 26, lineHeight: 31, color: SALA.blanco },
  gancho: { ...LETRA.cuerpo, fontSize: 14.5, lineHeight: 19, marginTop: 4, color: SALA.blanco },

  /* ---------- La barra de estado ---------- */
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: HUECO,
    /* El filo de arriba ocupa un píxel y se le resta al hueco, que si no la franja
       queda un pelo más alta por arriba que por abajo. */
    paddingTop: HUECO - FILO,
    paddingBottom: HUECO,
    borderTopWidth: FILO,
    borderTopColor: SALA.filo,
    /** Una franja levantada dentro de la ficha: `tejaAlta`, un escalón sobre la teja. */
    backgroundColor: SALA.tejaAlta,
  },
  /* 6×6 con radio 3, que son los del piloto de la casa. Estaba en 7×7 con radio 4,
     o sea con más radio que la mitad del lado: un círculo dibujado por accidente. */
  piloto: { width: 6, height: 6, borderRadius: 3, backgroundColor: SALA.tenue },
  estado: { ...LETRA.rotuloChico, fontSize: 13, color: SALA.palabra, flexShrink: 1 },

  /* ---------- La salida, cuando la espera ya es rara ---------- */
  salida: { padding: HUECO, gap: 12 },
  porque: { ...LETRA.cuerpo, fontSize: 13.5, lineHeight: 19, color: SALA.tenue },
  volver: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: HUECO - FILO,
    borderRadius: RADIO.mando,
    borderWidth: FILO,
    borderColor: SALA.filoVivo,
  },
  volverTexto: { ...LETRA.rotuloChico, fontSize: 13, color: SALA.palabra },
});
