/**
 * «LA PEONZA» EN TRES DIMENSIONES. La puerta del mueble `escena`, abierta.
 *
 * ═══ LO QUE ESTE FICHERO DEMUESTRA, QUE ES LO ÚNICO QUE PRETENDE ═══
 *
 * Que el 3D entra por `app/src/tres/Lienzo` y por ningún otro sitio, y que un
 * arcade que se pinta con él se escribe exactamente igual que uno de sprites: un
 * manifiesto, un reductor puro y `usarArcadeLocal`. El juego no sabe que es 3D; la
 * pantalla no sabe qué es una peonza. Lo que hay en medio es un ángulo entero.
 *
 * ═══ EL `Canvas` SALE DE `../tres/Lienzo` Y NO DE `@react-three/fiber` ═══
 *
 * Y esto es la regla entera del §7: «tres dimensiones, única y exclusivamente a
 * través de `app/src/tres/Lienzo.tsx` y `Lienzo.native.tsx`. Ningún arcade importa
 * `three` ni `@react-three/fiber` directamente».
 *
 * La razón no es de orden. Aquel fichero tiene un gemelo `.native.tsx` que Metro
 * elige al compilar para iOS o Android, porque el `Canvas` de web pinta sobre
 * WebGL del navegador y el nativo sobre `expo-gl`. Un arcade que importara la
 * librería a pelo funcionaría en web y saldría en negro en el móvil, sin un error
 * en ninguna consola — el fallo mudo de siempre.
 *
 * Y hay una segunda razón que es la que de verdad la sostiene: `@react-three/fiber`
 * está CONGELADO en la 9.7 porque la v10 sacó React Native del núcleo y ya no
 * exporta `./native`. El día que haya relevo —un `@react-three/native` publicado,
 * o `react-native-webgpu`— la mudanza es de dos ficheros si todos los arcades
 * entran por esta puerta, y de tantos ficheros como arcades si no.
 *
 * `three` sí se importa aquí, y no es una excepción a lo anterior: lo que la regla
 * protege es el `Canvas` —quién crea el contexto de dibujo—, no el vocabulario de
 * geometrías. La malla y el material son datos, y una escena sin ellos sería una
 * escena vacía.
 *
 * ═══ LA TRIGONOMETRÍA VIVE AQUÍ Y NO EN LAS REGLAS ═══
 *
 * El reductor lleva el ángulo en MILÉSIMAS DE VUELTA, con enteros, porque
 * `verify:pureza` prohíbe `Math.sin` y compañía en `shared/arcade/`: la
 * especificación las deja *implementation-approximated* y Hermes y V8 redondean
 * distinto, así que la misma partida daría dos resultados en dos móviles.
 *
 * Aquí abajo, en cambio, `Math.PI` es perfectamente legítimo: nadie sincroniza una
 * rotación con nadie, y si un móvil la dibuja medio grado desviada, no pasa
 * absolutamente nada. La frontera es la misma que ordena el árbol entero:
 * `shared/` son las reglas, y lo que se ve es consecuencia.
 *
 * ═══ LA SALA, AQUÍ DENTRO: UN MATERIAL NO ES UN ESTILO ═══
 *
 * Los colores salen de `SALA` —`./muebles`— y de ningún otro sitio, y en esta
 * pantalla eso obliga a una traducción que en un panel plano no existe.
 *
 *   · LA PLACA DE COLOR DE LA SALA ES, AQUÍ, LA PEONZA. El diseño manda que el
 *     acento viva en UN SOLO SITIO Y GRANDE; en una ficha eso es la placa del
 *     nombre y en esta pantalla es el objeto que ocupa media pantalla y es el
 *     juego entero. Por eso todo lo de abajo —panel, rótulos, raíl— es gris frío,
 *     y el acento sólo vuelve a aparecer en DOS sitios: el piloto de «esto está
 *     vivo» y el filo del botón que empuja. El de salir no lo lleva, y por eso
 *     mismo: aquí el acento dice «esto es lo que has venido a hacer».
 *
 *     Eran TRES. La tercera eran las muescas encendidas del raíl, y se cayó
 *     midiendo: ver el raíl más abajo. El acento no se ha ido de la pantalla por
 *     gusto de simetría —el argumento de arriba sigue en pie— sino porque en ese
 *     sitio concreto hacía que el medidor se leyera al revés.
 *
 *   · EL MISMO VIOLETA ILUMINADO NO ES EL MISMO VIOLETA. `SALA.acento` plano se
 *     ve tal cual; puesto en un `MeshStandardMaterial` sólo lo da la cara que
 *     mira a la luz, y las otras caen a un morado sucio. El cuerpo lleva por eso
 *     `emissive: SALA.acentoHondo`, que no es un adorno: es el degradado de la
 *     placa —`acento` arriba, `acentoHondo` abajo— dicho en tres dimensiones. Sin
 *     él la peonza se apaga justo por donde el diseño quiere que grite.
 *
 *   · HAY COLORES DE LA TABLA QUE NO PUEDEN ENTRAR EN UN MATERIAL: los que llevan
 *     alfa —`filo`, `filoVivo`, `halo`—. `THREE.Color` se queda con el RGB y tira
 *     la transparencia, así que `filo` —blanco al 7,5 %— pintaría una peonza
 *     BLANCA sin un solo aviso. En los materiales entran únicamente las entradas
 *     hexadecimales de `SALA`; el alfa es cosa de la interfaz.
 *
 *   · Y `metalness: 0` EN LAS DOS. La primera decisión del diseño es que no hay
 *     materia —ni metal, ni relieve—, y un brillo especular contradice esa frase
 *     en el sitio donde más se mira. El pincho era metal de verdad —0,6— y ahora
 *     es mate: lo que lo separa del cuerpo es el color, no el material.
 *
 * ═══ EL RAÍL DE MUESCAS CUENTA EL GIRO, Y NO EL AFORO ═══
 *
 * La firma de la Sala es un raíl de muescas que cuenta cuántos caben en la
 * máquina. Aquí dentro esa cuenta no dice nada: el aforo de La Peonza es 1–1 y una
 * sola muesca es un adorno mudo, que es exactamente la clase de ornamento que el
 * diseño rechaza. Así que se conserva la GRAMÁTICA —el grosor, los dos altos y el
 * hueco salen de `MUESCA` y de las dos medidas que `piezas.tsx` exporta con ella,
 * sin copiar un número— y se le da lo único que
 * de verdad se mueve en esta pantalla: el giro. Diez muescas, una por cada diez
 * por ciento.
 *
 * ═══ Y POR ESO NO ES `RailDeAforo` DE `piezas.tsx`, QUE ES LA PREGUNTA OBVIA ═══
 *
 * Aquella pieza existe para que las tres copias del raíl de aforo dejen de
 * separarse, y ésta NO es una cuarta copia: es otro instrumento con la misma
 * gramática. `RailDeAforo` recibe `{minimo, maximo}` y se anuncia con
 * `accessibilityRole="image"` y la etiqueta «Aforo: de N a M jugadores». Pasarle
 * el giro haría que un lector de pantalla dijera que esta peonza admite de tres a
 * diez jugadores —falso— y costaría además el `progressbar` con valor vivo de aquí
 * abajo, que es lo único de esta pantalla que la revisión dio por bien resuelto.
 *
 * Lo que SÍ se ha traído de la pieza es la FORMA entera: `MUESCA` exporta el
 * grosor, los dos altos, el radio y los cuatro colores, así que este medidor y el
 * raíl de aforo son el mismo objeto físico con dos significados. Es lo que impide
 * que vuelva a pasar lo de antes: la corrección de la apagada —del 14 % al 70 %,
 * porque al 14 se separa de su fondo por 1,53:1— tendría otra vez dos sitios
 * adonde llegar si cada instrumento declarase sus colores.
 *
 * ═══ LO QUE FALTA ANTES DE PROMETER 3D EN PRODUCCIÓN, DICHO AQUÍ ═══
 *
 * El §7 lo tiene apuntado y sigue pendiente: **probar una escena en un iPhone
 * FÍSICO**. La documentación de r3f advierte de cierres `EXC_BAD_ACCESS` en el
 * simulador, y el comentario de `escena-avatar.tsx` —la otra escena de esta casa—
 * admite que esa prueba nunca se hizo. No hay comprobador que pueda cubrir esto:
 * un guion de Node no abre un contexto de GL. Queda escrito donde lo va a leer
 * quien escriba el segundo arcade de escena, que es el único sitio donde sirve.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as THREE from 'three';
import { Canvas } from '../tres/Lienzo';
import {
  EMPUJAR,
  estaGirando,
  GIRO_MAXIMO,
  MANIFIESTO_PEONZA,
  partidaNuevaDeLaPeonza,
  PEONZA,
  VUELTA,
} from '../../../shared/arcade/juegos';
import type { EstadoDeLaPeonza } from '../../../shared/arcade/juegos';
import { usarMarco } from '../marco';
import { conAlfa } from '../tema';
import { usarArcadeLocal } from './local';
import { LETRA, RADIO, SALA } from './muebles';
import { ALTO_DE_MUESCAS, HUECO_DE_MUESCAS, MUESCA } from './piezas';

/**
 * La semilla, aunque este juego no use el azar.
 *
 * `usarArcadeLocal` la exige porque viaja en el contexto de cada movimiento y un
 * arcade de dispositivo la elige él —no hay a quién engañar—. Aquí es una
 * constante y no `Date.now()` a propósito: un número que cambia sin que nadie lo
 * use sería exactamente la clase de impureza que luego cuesta una tarde encontrar.
 */
const SEMILLA = 1;

/** Cuántas muescas tiene el raíl. Diez, para que cada una valga un diez por ciento. */
const MUESCAS_DEL_GIRO = 10;

/**
 * El raíl, montado una sola vez.
 *
 * Mientras la peonza gira esta pantalla se repinta treinta veces por segundo, y un
 * array nuevo en cada fotograma es basura que recoger sin que nadie la haya pedido
 * — la misma razón por la que la geometría y los materiales van en `useMemo`. Como
 * la longitud es fija, esto ni siquiera necesita entrar en el componente.
 */
const MUESCAS = Array.from({ length: MUESCAS_DEL_GIRO }, (_, indice) => indice);

/**
 * El estilo del botón según esté pulsado o no, resuelto fuera del componente por lo
 * mismo: a treinta fotogramas por segundo, una función nueva por repintado no la
 * usa nadie y hay que recogerla igual.
 */
const estiloDelBoton = ({ pressed }: { pressed: boolean }) => [
  estilos.boton,
  pressed ? estilos.botonPulsado : null,
];

export default function EscenaDeLaPeonza(): JSX.Element {
  /*
   * ═══ EL SUELO DEL PANEL LO DICE EL APARATO, Y NO UN 22 ESCRITO A MANO ═══
   *
   * Aquí había `marginBottom: 22` en el botón con un comentario que decía que ese
   * número existía justamente para que la barra de gestos no se comiera el único
   * mando de la pantalla. No llegaba: la raya del iPhone reserva 34 pt en vertical
   * —21 en horizontal— y 22 se queda doce por debajo. El botón se veía entero y el
   * toque en su franja de abajo se lo llevaba el sistema, que es peor que no verlo.
   *
   * `usarMarco` estaba montado desde hace tiempo —`SafeAreaProvider` cuelga de
   * `app/app/_layout.tsx`— y NINGUNA pantalla del grupo `(arcade)` preguntaba por
   * él. El comprobador que vigila esto sólo mira la portada, el avatar y la cuenta,
   * así que el verde no cubría nada de aquí.
   *
   * El mínimo se pasa en 22 y no en los 8 por defecto para no PERDER aire en los
   * móviles sin raya, que informan de cero: allí sigue habiendo exactamente los 22
   * de antes, y donde hay barra se abre hasta lo que el aparato pida. El mínimo de
   * arriba no se usa —el lienzo llega al borde a propósito, como el mundo 3D de la
   * portada— y por eso va a cero en vez de reservar doce píxeles que nadie mira.
   */
  const { abajo: aireAbajo } = usarMarco(0, 22);

  const mesa = usarArcadeLocal<EstadoDeLaPeonza>({
    arcade: PEONZA,
    partidaNueva: partidaNuevaDeLaPeonza,
    semilla: SEMILLA,
    /*
     * Mientras gira hay que repintar en cada tic; parada, no. El estado es OPACO
     * para `local.ts` —no puede saber si hay algo moviéndose ahí dentro— así que la
     * pregunta la contesta quien pinta. Sin esto, una peonza quieta repintaría una
     * escena 3D treinta veces por segundo para siempre, que en un móvil es la
     * batería.
     */
    necesitaElReloj: estaGirando,
  });

  /* De milésimas de vuelta a radianes. La única línea de trigonometría que hay. */
  const giroEnRadianes = (mesa.estado.angulo / VUELTA) * 2 * Math.PI;

  /*
   * Si está viva lo dice `estaGirando` y no un `> 0` escrito aquí: es la misma
   * pregunta que decide si corre el reloj, y contestarla dos veces es cómo se
   * llega a que el piloto diga una cosa y el motor haga otra.
   */
  const girando = estaGirando(mesa.estado);
  const porCiento = Math.round((mesa.estado.giro / GIRO_MAXIMO) * 100);
  /*
   * Cuántas muescas encendidas. `ceil` y no `round`: con `round`, una peonza que
   * aún gira despacio enseñaría el raíl entero apagado mientras el piloto dice que
   * está viva, y dos adornos que se contradicen valen menos que ninguno.
   */
  const encendidas = Math.ceil((mesa.estado.giro / GIRO_MAXIMO) * MUESCAS_DEL_GIRO);

  /*
   * La geometría y el material se crean UNA VEZ. Sin esto se construyen en cada
   * fotograma y el recolector de basura acaba marcando el ritmo de la escena, que
   * se ve como un tirón periódico que nadie sabe de dónde sale.
   */
  const cuerpo = useMemo(() => new THREE.ConeGeometry(0.6, 1.2, 6), []);
  const pincho = useMemo(() => new THREE.CylinderGeometry(0.05, 0.02, 0.5, 8), []);
  const materialDelCuerpo = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: SALA.acento,
        /* El fondo del degradado de la placa, para que la cara en sombra no caiga a morado sucio. */
        emissive: SALA.acentoHondo,
        emissiveIntensity: 0.35,
        /* Sin materia: mate y sin brillo de metal. Ver la cabecera. */
        metalness: 0,
        roughness: 0.55,
      }),
    [],
  );
  const materialDelPincho = useMemo(
    /* Gris frío y mate: el pincho acompaña, no es el color de la pantalla. */
    () => new THREE.MeshStandardMaterial({ color: SALA.tenue, metalness: 0, roughness: 0.7 }),
    [],
  );

  /*
   * El suelo del panel va en `useMemo` por lo mismo que la geometría: a treinta
   * fotogramas por segundo, un array y un objeto nuevos por repintado son basura
   * que recoger sin que nadie los haya pedido. Depende del aparato, así que no
   * puede vivir en la tabla de estilos, pero cambia una vez por rotación de
   * pantalla y no treinta veces por segundo.
   */
  const estiloDelPanel = useMemo(
    () => [estilos.panel, { paddingBottom: aireAbajo }],
    [aireAbajo],
  );

  return (
    <View style={estilos.todo}>
      {/*
       * ═══ DOS TERCIOS DE PANTALLA NO PUEDEN SER UN HUECO MUDO ═══
       *
       * El lienzo es la jugada entera y no tenía ni rol ni nombre: con un lector
       * de pantalla, todo lo de arriba del panel no existía. Se nombra el GRUPO y
       * no el `Canvas` a propósito —dentro hay además el halo, que es decoración—
       * y con `accessible` los dos se leen como un solo elemento.
       *
       * La etiqueta dice el ESTADO y no el porcentaje, aunque el porcentaje esté a
       * mano: la cifra exacta ya la lleva el `progressbar` de aquí abajo con valor
       * vivo, y repetirla aquí obligaría a oírla dos veces por recorrido y montaría
       * una cadena nueva en cada uno de los treinta fotogramas por segundo.
       */}
      <View
        style={estilos.escena}
        accessible
        accessibilityRole="image"
        accessibilityLabel={girando ? 'La peonza, girando' : 'La peonza, parada'}
      >
        <Canvas style={estilos.lienzo} camera={{ position: [0, 1.6, 3], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 2]} intensity={1.1} />
          <group rotation={[0, giroEnRadianes, 0]}>
            {/* La punta hacia abajo: un cono girado media vuelta sobre el eje X. */}
            <mesh geometry={cuerpo} material={materialDelCuerpo} rotation={[Math.PI, 0, 0]} position={[0, 0.6, 0]} />
            <mesh geometry={pincho} material={materialDelPincho} position={[0, 1.35, 0]} />
          </group>
        </Canvas>
        {/*
         * El halo de la maqueta: el acento casi transparente cayendo desde arriba,
         * como el resplandor de la máquina. Va ENCIMA del lienzo y no detrás, que
         * es lo natural, por una razón de plataforma: la superficie de `expo-gl`
         * no se puede dar por transparente en Android, y un halo puesto debajo se
         * vería en web y no en el móvil — el fallo mudo de siempre. Encima se ve
         * en los dos, y como lo que tiñe es la propia peonza violeta, no ensucia
         * nada. `pointerEvents` a `none` para que no se coma ningún toque.
         */}
        <LinearGradient
          colors={[SALA.halo, conAlfa(SALA.acento, 0)]}
          style={estilos.halo}
          pointerEvents="none"
        />
      </View>

      <View style={estiloDelPanel}>
        <View style={estilos.cabecera}>
          {/*
           * El nombre sale del MANIFIESTO y ya no escrito a mano. Estaba duplicado
           * aquí y en la espera de `escena.tsx`, o sea que renombrar la máquina en
           * su manifiesto la dejaba con dos nombres y ningún error a la vista. Es
           * lo que ya hace la espera de El Arcade con `MANIFIESTO_EL_ARCADE.nombre`.
           */}
          <Text style={estilos.nombre}>{MANIFIESTO_PEONZA.nombre}</Text>
          <Text style={estilos.recuento}>{mesa.estado.empujones} empujones</Text>
        </View>

        <View style={estilos.franja}>
          <View style={estilos.estado}>
            <View style={estilos.estadoIzquierda}>
              <View style={[estilos.piloto, girando ? estilos.pilotoVivo : estilos.pilotoFrio]} />
              {/*
               * `accessibilityLiveRegion` AQUÍ Y NO EN LA FILA ENTERA, que es la
               * diferencia entre avisar y ser ruido: este rótulo cambia dos veces
               * por giro —al empujar y al pararse—, mientras que el porcentaje de al
               * lado cambia treinta veces por segundo. Puesto en la fila, Android
               * leería una cifra nueva en voz alta cada 33 ms hasta que la peonza
               * parase.
               *
               * Es sólo de Android; iOS no tiene región viva y su forma —
               * `announceForAccessibility`— es imperativa y no cabe aquí sin un
               * efecto que vigile el estado. Queda dicho: en iOS el cambio sigue sin
               * anunciarse solo.
               */}
              <Text style={estilos.estadoRotulo} accessibilityLiveRegion="polite">
                {girando ? 'GIRANDO' : 'PARADA · EMPÚJALA'}
              </Text>
            </View>
            <Text style={estilos.porCiento}>{porCiento} %</Text>
          </View>

          {/*
           * El raíl es ornamento que INFORMA, y por eso también tiene que informar a
           * quien no lo ve: sin esto sería un adorno mudo para un lector de pantalla
           * y la cifra de al lado tendría que leerse dos veces.
           */}
          <View
            style={estilos.rail}
            accessibilityRole="progressbar"
            accessibilityLabel="Giro de la peonza"
            accessibilityValue={{ min: 0, max: 100, now: porCiento }}
          >
            {MUESCAS.map((indice) => (
              <View
                key={indice}
                style={[
                  MUESCA.base,
                  indice < encendidas ? MUESCA.alta : MUESCA.baja,
                  indice < encendidas ? MUESCA.viva : MUESCA.fria,
                ]}
              />
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => mesa.mover(EMPUJAR)}
          style={estiloDelBoton}
          accessibilityRole="button"
          accessibilityLabel="Empujar la peonza"
          /* Qué va a pasar, porque el resultado no se anuncia solo en iOS. */
          accessibilityHint="Acelera el giro. El porcentaje de encima dice cuánto queda."
        >
          <Text style={estilos.botonRotulo}>EMPUJAR</Text>
        </Pressable>

        {/*
         * ═══ LA SALIDA, QUE NO ESTABA ═══
         *
         * La pila del grupo monta con `headerShown: false` —`app/app/(arcade)/
         * _layout.tsx`— así que de esta pantalla sólo se salía con el gesto del
         * sistema, con el botón físico de Android o con el atrás del navegador. Los
         * tres arcades hermanos pintan esta misma pastilla de filo, con estos mismos
         * 44 y este mismo `RADIO.mando`; aquí no hay nada que inventar, sólo que
         * faltaba.
         */}
        <Pressable
          onPress={() => router.back()}
          style={estilos.salir}
          accessibilityRole="button"
          accessibilityLabel="Volver a la portada"
        >
          <Text style={estilos.salirTexto}>Volver</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  /* La pantalla entera: suelo, que es el fondo de todo lo demás. */
  todo: { flex: 1, backgroundColor: SALA.suelo },

  escena: { flex: 1 },
  lienzo: { flex: 1 },
  /*
   * Un tercio de alto y desde el borde de arriba, que es donde la maqueta pone su
   * resplandor. Más abajo empezaría a lavar la peonza en vez de rodearla.
   */
  halo: { position: 'absolute', top: 0, left: 0, right: 0, height: '34%' },

  /*
   * El panel es una FICHA que sube desde abajo: teja, redondeada sólo por arriba
   * —por abajo se apoya en el borde de la pantalla— y separada del suelo por un
   * filo de un píxel. No hay sombra ni bisel: la elevación se dice con el cambio
   * de superficie, que es la primera decisión del diseño.
   *
   * Se apoya en el borde de la pantalla pero NO mete nada debajo de la barra de
   * gestos: el `paddingBottom` se lo pone el componente con lo que diga el aparato.
   * Va en el panel y no en el botón porque lo que tiene que respetar el borde es
   * todo lo que se toca, y ahora abajo hay dos mandos y no uno.
   */
  panel: {
    backgroundColor: SALA.teja,
    borderTopWidth: 1,
    borderTopColor: SALA.filo,
    borderTopLeftRadius: RADIO.ficha,
    borderTopRightRadius: RADIO.ficha,
    /* Para que la franja levantada no se salga por las esquinas redondeadas. */
    overflow: 'hidden',
  },

  /*
   * ═══ `flexShrink: 1` EN LOS DOS, Y NO ES UN ADORNO DE LAYOUT ═══
   *
   * En React Native el `flexShrink` por defecto es 0 —al revés que en la web—, así
   * que dos textos en una fila `space-between` no se encogen ni se reparten: se
   * salen. Y esta fila vive dentro de un panel con `overflow: 'hidden'`, o sea que
   * lo que se sale no asoma: se corta a media palabra, sin aviso.
   *
   * Con la ampliación de letra del sistema la fila crece y se pasa a partir de
   * ~115 % en una pantalla de 320 dp y de ~145 % en una de 375. Con esto, en vez de
   * cortarse, los dos textos parten renglón y la fila crece hacia abajo — que aquí
   * se puede porque ni la cabecera ni el panel tienen alto fijo: el `flex: 1` de la
   * escena cede sitio y el lienzo se hace más bajo.
   *
   * Y por eso mismo NO lleva `maxFontSizeMultiplier`: el tope de la tarjeta de la
   * portada existe porque aquella portada es una caja de 228 clavados. Aquí no hay
   * ninguna, así que capar la letra sería quitarle al usuario lo que ha pedido a
   * cambio de nada.
   */
  cabecera: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  /*
   * El nombre de la máquina, que aquí SÍ es el titular de la pantalla: `palabra`.
   * El acento no entra en un título —no se pulsa, no está vivo—, y sin familia
   * propia la voz de cartel la ponen entera el peso, la caja alta y el tracking de
   * `LETRA.rotulo`.
   */
  nombre: { color: SALA.palabra, fontSize: 15, ...LETRA.rotulo, flexShrink: 1 },
  /*
   * ═══ LA CUENTA DE EMPUJONES ES DATO DE APOYO, PERO ES TEXTO ═══
   *
   * Iba en `SALA.cifra` —blanco al 34 %— y eso sobre la teja compone rgb(99,101,106)
   * y da 3,11:1. El mínimo de un texto que hay que leer es 4,5:1, y éste es
   * precisamente el dato que contesta si el botón ha hecho algo. `SALA.tenue` en el
   * mismo sitio da 5,95:1 y es el color que la casa reserva a lo que acompaña.
   *
   * La jerarquía no se pierde: la da el CUERPO —13 contra los 15 del nombre— y la
   * caja alta, que es como la resuelve el pie de la tarjeta de la portada. Bajarla
   * con alfa es lo que trajo el 3,11.
   *
   * Los tres colores son neutros, así que el 3,11 y el 5,95 son idénticos en
   * violeta, ámbar, verde y carmesí: esto no lo arreglaba ningún tema.
   *
   * Con esto `SALA.cifra` ya no se usa en este fichero ni como texto ni como trazo.
   * Su docstring en `muebles.ts` sigue prometiéndolo para «los rótulos pequeños y
   * las cifras de apoyo», y no da para eso sobre ninguna de las superficies de esta
   * Sala; queda dicho aquí porque aquella tabla es de otro.
   */
  recuento: {
    color: SALA.tenue,
    fontSize: 13,
    flexShrink: 1,
    ...LETRA.rotuloChico,
    /*
     * `LETRA.dato` es `as const` y su `fontVariant` sale de sólo lectura; el tipo
     * de React Native pide un array normal, así que se copia. Copiar el ARRAY no
     * es copiar el valor: la tabla sigue siendo la única que dice cuál es.
     */
    fontVariant: [...LETRA.dato.fontVariant],
  },

  /*
   * La franja levantada dentro de la ficha —lo que en la Sala es la fila de datos—:
   * `tejaAlta` entre dos filos. Aquí lleva el estado y el raíl, que son las dos
   * cosas que cambian solas.
   */
  franja: {
    backgroundColor: SALA.tejaAlta,
    borderTopWidth: 1,
    borderTopColor: SALA.filo,
    borderBottomWidth: 1,
    borderBottomColor: SALA.filo,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 13,
  },
  /* El `flexShrink` de los dos lados: el porqué está en `cabecera`, aquí arriba. */
  estado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  estadoIzquierda: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },

  piloto: { width: 6, height: 6, borderRadius: 3 },
  /* Viva: acento macizo. Es una de las dos cosas a las que el diseño se lo reserva. */
  pilotoVivo: { backgroundColor: SALA.acento },
  /*
   * Parada: el mismo punto en hueco. No se apaga con un gris más oscuro sino con la
   * AUSENCIA de relleno, que es lo que se lee de un vistazo.
   *
   * El aro era `SALA.cifra` y da 3,11:1 sobre la teja alta: pasa el 3:1 de elemento
   * no textual por once centésimas, y en un aro de UN píxel alrededor de un punto de
   * seis, once centésimas no son margen. Blanco al 55 % —lo que la tarjeta de la
   * portada puso en este mismo sitio— da 6,01:1.
   */
  pilotoFrio: { borderWidth: 1, borderColor: conAlfa(SALA.blanco, 0.55) },

  /* Trece es el mínimo de la Sala, y este rótulo es de los que se leen de lejos. */
  estadoRotulo: { color: SALA.tenue, fontSize: 13, flexShrink: 1, ...LETRA.rotuloChico },
  /* La cifra sí es énfasis —es LO que está pasando—, y por eso va en blanco. */
  porCiento: { color: SALA.blanco, fontSize: 13, ...LETRA.dato, fontVariant: [...LETRA.dato.fontVariant] },

  /*
   * ═══ EL ALTO SALE DE LA TABLA, Y LA LÍNEA DE APOYO SE HA IDO ═══
   *
   * El comentario que había aquí decía que el alto, el grosor, los dos altos de
   * muesca y el hueco salían de `CUENTA_DE_AFORO`. Tres de las cuatro cosas sí; el
   * ALTO no: la tabla dice 15 y aquí ponía 19 escrito a mano, heredado —junto con el
   * radio 2 y la apagada en `filoVivo`— de la espera de El Arcade, que conserva el
   * raíl anterior entero. Ahora sale de la tabla y la frase es verdad.
   *
   * Y las muescas ya no se apoyan en ninguna línea. Era `SALA.filo` —blanco al
   * 7,5 %— sobre `tejaAlta`: 1,23:1, o sea que no estaba. Un carril invisible no es
   * un carril discreto; y el raíl de la Sala —`RailDeAforo`, en `piezas.tsx`— no
   * lleva ninguno, así que esto era una tercera divergencia y no una decisión.
   */
  rail: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: ALTO_DE_MUESCAS,
    marginTop: 12,
    gap: HUECO_DE_MUESCAS,
  },
  /*
   * ═══ LA TINTA ES BLANCA EN LAS DOS, Y LA DIFERENCIA LA LLEVA EL ALTO ═══
   *
   * Aquí la apagada era `SALA.filoVivo` —blanco al 14 %— y el comentario decía
   * «apagada no es invisible: es un trazo, y un trazo es `filoVivo`». Medido sobre
   * su fondo real dice lo contrario: compone rgb(55,59,66) sobre `tejaAlta`
   * rgb(22,27,35) y da 1,53:1, contra el 3:1 que pide un elemento no textual. A
   * media distancia entre el mínimo y el 1,0 que es no estar dibujado.
   *
   * Y no es un matiz, porque LAS APAGADAS SON LAS QUE DIBUJAN EL LARGO: con la
   * peonza parada desaparecían las diez a la vez y no quedaba nada donde el 100 %
   * había enseñado un medidor, mientras el `accessibilityValue` seguía diciendo 0 %.
   * O sea que el medidor sólo existía cuando estaba lleno. Al 70 % da 8,89:1.
   * Los dos colores son neutros: el 1,53 era idéntico en los cuatro temas.
   *
   * La ENCENDIDA pierde el acento, y eso es lo segundo que cambia. En acento pasaba
   * de sobra —4,37 en violeta, 8,05 en ámbar, 7,58 en verde, 4,71 en carmesí— pero
   * junto a una apagada al 70 % (8,89) el violeta y el carmesí dejaban el medidor
   * AL REVÉS: las muescas «off» más luminosas que las «on». Por eso la regla de la
   * casa es que la distinción la lleve sólo la ALTURA —15 contra 7— y la tinta sea
   * una sola, elegida por el fondo donde cae. Sobre la teja alta, blanca.
   */
  /*
   * Y LOS TRES ESTILOS DE LA MUESCA YA NO SE DECLARAN AQUÍ: son `MUESCA.base`,
   * `MUESCA.alta` + `MUESCA.viva` y `MUESCA.baja` + `MUESCA.fria`, de `piezas.tsx`.
   * Todo lo que dice el párrafo de arriba sigue siendo cierto; lo que cambia es que
   * ahora hay UN sitio donde cambiarlo.
   */

  /*
   * El mando que juega —el otro sólo sale—. El acento entra aquí como FILO y no como campo:
   * el campo de color grande ya lo ocupa la peonza, y dos planos de acento en la
   * misma pantalla se roban el uno al otro. El relleno es un blanco al 4 %, lo
   * justo para que el botón sea una superficie y no un dibujo.
   *
   * Los 44 del dedo los garantiza `minHeight` y nada más. Aquí había una cuenta
   * —«12 + 1 de borde + 18 de línea + 1 + 12»— que suma 44 y era cierta, pero sólo
   * a escala de letra 1: el 18 era un `lineHeight` fijo y el 15 de al lado un
   * `fontSize` que la ampliación del sistema multiplica, así que la igualdad se
   * rompía en cuanto alguien subía el tamaño de letra —y entonces la línea se
   * quedaba corta para su propio texto—. Describía una coincidencia como si fuera
   * una restricción. El `lineHeight` se ha ido con ella.
   *
   * El aire de abajo ya no es un número de aquí: lo pone `usarMarco`, y el porqué
   * está en la cabecera del componente.
   */
  boton: {
    minHeight: 44,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: SALA.acento,
    backgroundColor: conAlfa(SALA.blanco, 0.04),
  },
  /*
   * Al pulsar, el relleno pasa de blanco al 4 % a acento al 18 %, y lo que cambia es
   * el TONO y casi nada el brillo: rgb(27,31,38) contra rgb(45,33,68) son 1,12:1 de
   * luminancia en violeta, 1,26 en ámbar, 1,25 en verde y 1,10 en carmesí.
   *
   * Aquí ponía que «el acento se derrama del filo al plano», y eso promete un
   * derrame que el píxel no entrega: de un gris neutro a un morado apagado se nota,
   * pero el brillo es lo que sobrevive al sol y a los ojos cansados, y el brillo casi
   * no se mueve. No es incumplimiento —un estado de pulsado no tiene mínimo— pero la
   * frase no se sostenía y el número sí, así que queda el número: quien quiera que
   * este botón conteste MÁS al dedo tiene que mover la luminancia, no el tono.
   */
  botonPulsado: { backgroundColor: conAlfa(SALA.acento, 0.18) },
  /* Sobre el filo de acento el texto va en `blanco` de énfasis. */
  botonRotulo: { color: SALA.blanco, fontSize: 15, ...LETRA.rotulo },

  /*
   * LA SALIDA: la misma pastilla de filo que los tres arcades hermanos —44 de alto,
   * `RADIO.mando`, borde `SALA.filo` y rótulo en `tenue`, que da 5,95:1 sobre la
   * teja—. Va centrada y sin acento a propósito: en esta Sala el acento significa
   * «esto es lo que has venido a hacer», y salir no lo es.
   */
  salir: {
    minHeight: 44,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: SALA.filo,
  },
  salirTexto: { color: SALA.tenue, fontSize: 15, ...LETRA.cuerpo },
});
