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
 *     juego entero. Por eso todo lo de abajo —panel, rótulos, muescas apagadas—
 *     es gris frío, y el acento sólo vuelve a aparecer en las tres cosas que la
 *     tabla le reserva: el piloto de «esto está vivo», las muescas encendidas y
 *     el filo del único botón.
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
 * hueco salen de `CUENTA_DE_AFORO`, sin copiar un número— y se le da lo único que
 * de verdad se mueve en esta pantalla: el giro. Diez muescas, una por cada diez
 * por ciento.
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
import * as THREE from 'three';
import { Canvas } from '../tres/Lienzo';
import {
  EMPUJAR,
  estaGirando,
  GIRO_MAXIMO,
  partidaNuevaDeLaPeonza,
  PEONZA,
  VUELTA,
} from '../../../shared/arcade/juegos';
import type { EstadoDeLaPeonza } from '../../../shared/arcade/juegos';
import { conAlfa } from '../tema';
import { usarArcadeLocal } from './local';
import { CUENTA_DE_AFORO, LETRA, RADIO, SALA } from './muebles';

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

  return (
    <View style={estilos.todo}>
      <View style={estilos.escena}>
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

      <View style={estilos.panel}>
        <View style={estilos.cabecera}>
          <Text style={estilos.nombre}>LA PEONZA</Text>
          <Text style={estilos.recuento}>{mesa.estado.empujones} empujones</Text>
        </View>

        <View style={estilos.franja}>
          <View style={estilos.estado}>
            <View style={estilos.estadoIzquierda}>
              <View style={[estilos.piloto, girando ? estilos.pilotoVivo : estilos.pilotoFrio]} />
              <Text style={estilos.estadoRotulo}>{girando ? 'GIRANDO' : 'PARADA · EMPÚJALA'}</Text>
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
                style={[estilos.muesca, indice < encendidas ? estilos.muescaEncendida : estilos.muescaApagada]}
              />
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => mesa.mover(EMPUJAR)}
          style={estiloDelBoton}
          accessibilityRole="button"
          accessibilityLabel="Empujar la peonza"
        >
          <Text style={estilos.botonRotulo}>EMPUJAR</Text>
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
  nombre: { color: SALA.palabra, fontSize: 15, ...LETRA.rotulo },
  /*
   * La cuenta de empujones es dato de apoyo, no titular: `cifra`. Va con las
   * columnas cuadradas de `LETRA.dato` para que no baile al pasar de 9 a 10, y con
   * la caja alta de un rótulo pequeño.
   */
  recuento: {
    color: SALA.cifra,
    fontSize: 13,
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
  estado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  estadoIzquierda: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  piloto: { width: 6, height: 6, borderRadius: 3 },
  /* Viva: acento macizo. Es una de las tres cosas a las que el diseño se lo reserva. */
  pilotoVivo: { backgroundColor: SALA.acento },
  /*
   * Parada: el mismo punto en hueco, con un aro de `cifra`. No se apaga con un gris
   * más oscuro sino con la AUSENCIA de relleno, que es lo que se lee de un vistazo.
   */
  pilotoFrio: { borderWidth: 1, borderColor: SALA.cifra },

  /* Trece es el mínimo de la Sala, y este rótulo es de los que se leen de lejos. */
  estadoRotulo: { color: SALA.tenue, fontSize: 13, ...LETRA.rotuloChico },
  /* La cifra sí es énfasis —es LO que está pasando—, y por eso va en blanco. */
  porCiento: { color: SALA.blanco, fontSize: 13, ...LETRA.dato, fontVariant: [...LETRA.dato.fontVariant] },

  /*
   * El raíl: las muescas se apoyan en una línea, como en la Sala. Alto, grosor,
   * los dos altos de muesca y el hueco salen de `CUENTA_DE_AFORO`; lo único que
   * cambia es qué cuenta.
   */
  rail: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 19,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: SALA.filo,
    gap: CUENTA_DE_AFORO.huecoHilera,
  },
  muesca: { width: CUENTA_DE_AFORO.grosor, borderRadius: 2 },
  muescaEncendida: { height: CUENTA_DE_AFORO.altoEncendida, backgroundColor: SALA.acento },
  /* Apagada no es invisible: es un trazo, y un trazo es `filoVivo`. */
  muescaApagada: { height: CUENTA_DE_AFORO.altoApagada, backgroundColor: SALA.filoVivo },

  /*
   * El único mando de la pantalla. El acento entra aquí como FILO y no como campo:
   * el campo de color grande ya lo ocupa la peonza, y dos planos de acento en la
   * misma pantalla se roban el uno al otro. El relleno es un blanco al 4 %, lo
   * justo para que el botón sea una superficie y no un dibujo.
   *
   * Los 44 del dedo salen exactos y con el borde DESCONTADO del hueco: 12 + 1 de
   * borde + 18 de línea + 1 + 12. Ignorar el borde daría 46 y el número dejaría de
   * significar nada.
   */
  boton: {
    minHeight: 44,
    marginHorizontal: 16,
    marginTop: 14,
    /*
     * Más aire abajo que arriba: en un móvil sin marco la barra de gestos se come
     * los últimos píxeles, y este botón es lo único que se puede tocar.
     */
    marginBottom: 22,
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
   * Al pulsar, el acento se derrama del filo al plano. Es la respuesta al dedo
   * dicha con el color que ya significa «esto se puede tocar», sin inventar otro.
   */
  botonPulsado: { backgroundColor: conAlfa(SALA.acento, 0.18) },
  /*
   * Sobre el filo de acento el texto va en `blanco` de énfasis, y la línea de 18
   * no es decorativa: es la que hace que la cuenta de los 44 cuadre.
   */
  botonRotulo: { color: SALA.blanco, fontSize: 15, lineHeight: 18, ...LETRA.rotulo },
});
