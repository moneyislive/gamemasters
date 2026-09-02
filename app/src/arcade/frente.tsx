/**
 * «LA FRENTE», pintada. Es el mueble `formulario` haciendo lo suyo: vistas
 * normales, una palabra enorme y un cronómetro grande.
 *
 * ═══ LA PANTALLA MIRA A LA SALA, Y ESO MANDA EN TODO EL DISEÑO ═══
 *
 * Quien juega tiene el móvil apoyado en la frente con el cristal hacia fuera, así
 * que esta pantalla NO se lee a treinta centímetros: se lee a tres metros, de pie,
 * con poca luz, por gente que está gritando. De ahí sale todo lo que parece
 * exagerado y no lo es:
 *
 *   · La palabra ocupa media pantalla y usa la tipografía del sistema, no la de
 *     las veladas. Cinzel es una romana con filigranas preciosa en un dosier
 *     impreso y un desastre a tres metros: lo que hace falta aquí es un palo seco
 *     gordo, que es justamente lo que trae el sistema.
 *   · El cronómetro es un número y nada más. Ni barra, ni aro, ni animación: a esa
 *     distancia lo único que se lee es una cifra.
 *   · Los últimos diez segundos se ponen en ámbar. Es el único adorno del fichero
 *     y se gana el sitio: es lo que hace que la mesa acelere.
 *
 * ═══ SE PINTA DESDE LA PROYECCIÓN, NO DESDE EL ESTADO ═══
 *
 * Y es una disciplina que HOY no hace falta: con `sede: 'dispositivo'` el estado
 * entero está aquí al lado y leerlo sería más corto. Se hace igual porque es lo
 * único que demuestra que la proyección funciona, y porque el día que un arcade
 * tenga servidor esto es lo que llegará por el cable.
 *
 * Lo bonito es CUÁL se pide: `ESPECTADOR`. La pantalla común, «nadie en
 * concreto» — que en este juego resulta ser la vista MÁS informada de las dos,
 * porque el único que no puede ver la palabra es quien sujeta el aparato. La
 * proyección al revés no es una idea del comentario de un fichero: es esta línea.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { ESPECTADOR, vistaDeAsiento } from '../../../shared/arcade';
import {
  ACIERTO,
  EMPEZAR,
  FRENTE,
  OTRA_RONDA,
  partidaNueva,
  PASO,
  SEGUNDOS_DE_RONDA,
  SEGUNDOS_PARA_COLOCARSE,
  segundosQueQuedan,
} from '../../../shared/arcade/juegos';
import type { EstadoDeLaFrente, VistaDeLaSala } from '../../../shared/arcade/juegos';
import { usarArcadeLocal, usarElAparatoQuieto, usarPrimerPlano } from './local';
import { avisarQueEmpieza, avisarQueSeAcabo, usarGestoACiegas } from './entrada';
import { SALA } from './muebles';

/** A partir de aquí el número se pone en ámbar. Diez segundos es lo que se corea. */
const CUENTA_ATRAS = 10;

/**
 * EL TAMAÑO DE LA PALABRA, calculado y no delegado en `adjustsFontSizeToFit`.
 *
 * ═══ POR QUÉ NO BASTA CON LA PROPIEDAD DE SIEMPRE ═══
 *
 * `adjustsFontSizeToFit` encoge el texto hasta que cabe, y es exactamente lo que
 * hace falta aquí: las cartas van de «Topo» a «El flautista de Hamelín». En
 * nativo funciona y se deja puesta.
 *
 * EN WEB NO EXISTE. `react-native-web` no la implementa —cero apariciones en su
 * distribución— mientras que `numberOfLines` sí se traduce, y se traduce a un
 * recorte: `-webkit-line-clamp` con `overflow: hidden`. O sea que en un navegador
 * el cuerpo de 62 se quedaba fijo y la palabra larga se CORTABA en vez de
 * encogerse. Y la web no es un extra: el §7 del diseño la vende como la válvula
 * de escape que permite jugar sin pasar por la tienda, y Render sirve la web y la
 * API en el mismo servicio.
 *
 * Una palabra recortada en un juego de adivinar palabras deja la ronda a ciegas
 * por los dos lados: quien lo lleva no ve nada por definición y la sala lee media
 * carta.
 *
 * ═══ CÓMO SE CALCULA, Y POR QUÉ ES APROXIMADO A PROPÓSITO ═══
 *
 * Con dos cotas y se coge la menor. La primera es la palabra más larga que haya
 * que meter en UNA línea —partir «flautista» por la mitad no vale— y la segunda
 * es el texto entero repartido en tres. El factor 0,58 es el ancho medio de un
 * carácter de un palo seco en negrita respecto a su cuerpo; no hace falta que sea
 * exacto porque `adjustsFontSizeToFit` sigue puesta en nativo y aquí solo hay que
 * quedarse del lado corto.
 */
const ANCHO_POR_CUERPO = 0.58;
const LINEAS = 3;

export function tamanoDeLaPalabra(palabra: string, anchoUtil: number): number {
  if (palabra.length === 0 || !(anchoUtil > 0)) return 62;
  const masLarga = palabra.split(' ').reduce((cuenta, trozo) => Math.max(cuenta, trozo.length), 1);
  const porElTrozoMasLargo = anchoUtil / (masLarga * ANCHO_POR_CUERPO);
  const porElTextoEntero = (anchoUtil * LINEAS) / (palabra.length * ANCHO_POR_CUERPO);
  const cuerpo = Math.floor(Math.min(porElTrozoMasLargo, porElTextoEntero));
  return Math.max(24, Math.min(62, cuerpo));
}

export function LaFrente(): JSX.Element {
  /*
   * LA SEMILLA, y es el único sitio de todo el juego donde se mira el reloj de
   * pared. Aquí es legítimo y dentro del reductor sería el fallo que
   * `verify:pureza` existe para cazar: esto no es una regla, es de dónde sale el
   * número con el que se siembra. Se queda en un estado para que un repintado no
   * cambie la baraja a mitad de partida.
   */
  const [semilla, setSemilla] = useState<number>(() => Date.now() >>> 0);

  /*
   * ═══ CUÁNDO CORRE UN RELOJ EN PANTALLA, Y POR QUÉ SE PREGUNTA ASÍ ═══
   *
   * En los dos momentos que enseñan una cuenta atrás: los tres segundos para
   * colocarse el aparato y la ronda. En los otros dos —antes de empezar y en la
   * pantalla de resultados— los tics siguen entrando por el reductor igual, pero
   * no hay nada que repintar diez veces por segundo. Sin esto, un móvil olvidado
   * en «SE ACABÓ» encima de la mesa se repinta para siempre.
   *
   * Y se contesta desde la PROYECCIÓN, como todo lo demás de este fichero, aunque
   * el estado esté aquí al lado y mirar `estado.momento` sería más corto.
   */
  const necesitaElReloj = useCallback((suyo: EstadoDeLaFrente): boolean => {
    const momento = (vistaDeAsiento(FRENTE, suyo, ESPECTADOR) as VistaDeLaSala).momento;
    return momento === 'preparados' || momento === 'jugando';
  }, []);

  const { estado, tic, mover, reiniciar } = usarArcadeLocal<EstadoDeLaFrente>({
    arcade: FRENTE,
    partidaNueva,
    semilla,
    necesitaElReloj,
  });

  /*
   * Lo que se ve desde la sala. Ver la cabecera: se pide la proyección aunque el
   * estado esté aquí al lado.
   */
  const vista = vistaDeAsiento(FRENTE, estado, ESPECTADOR) as VistaDeLaSala;
  const corriendo = vista.momento === 'preparados' || vista.momento === 'jugando';

  /*
   * La pantalla encendida a la fuerza solo mientras corre el reloj. En la
   * pantalla de resultados el móvil vuelve a apagarse solo, como cualquier otro.
   */
  usarElAparatoQuieto(corriendo);

  const acertar = useCallback(() => mover(ACIERTO), [mover]);
  const pasar = useCallback(() => mover(PASO), [mover]);
  const gesto = usarGestoACiegas({
    alAcertar: acertar,
    alPasar: pasar,
    activo: vista.momento === 'jugando',
  });

  /*
   * ═══ LOS DOS AVISOS QUE SE NOTAN SIN VER LA PANTALLA ═══
   *
   * Quien lleva el móvil en la frente no ve nada, así que los dos instantes que
   * cambian el juego —empieza la ronda, se acabó el tiempo— tienen que llegarle
   * por otro sentido. El del final es el que faltaba y el que más falta hacía:
   * sin él, la ronda terminaba en el silencio más absoluto y quien jugaba seguía
   * adivinando y deslizando al vacío —con el gesto ya apagado, o sea que ni
   * siquiera vibraba— hasta que alguien se lo gritaba.
   */
  useEffect(() => {
    if (vista.momento === 'jugando') avisarQueEmpieza();
    else if (vista.momento === 'despues') avisarQueSeAcabo();
  }, [vista.momento, vista.ronda]);

  /*
   * El cronómetro lo calcula EL JUEGO y no este fichero, aunque restar dos números
   * aquí sería más corto. La regla de redondeo —hacia arriba, porque un cronómetro
   * que enseña «0» mientras todavía se puede jugar es mentira— tiene que estar
   * escrita una sola vez: si el mueble restara por su cuenta, la pantalla y el
   * reductor podrían discrepar justo en el último segundo, que es el que decide si
   * un acierto cuenta.
   */
  const segundos = useMemo(
    () => (corriendo ? segundosQueQuedan(vista.plazo, tic) : 0),
    [corriendo, vista.plazo, tic],
  );

  /*
   * Volver a empezar del todo pide semilla nueva, y otra ronda no. La diferencia
   * es la del juego: `OTRA_RONDA` continúa la cadena de azar donde la dejó la
   * anterior —así una tarde entera se reejecuta desde una sola semilla— mientras
   * que salir y volver a entrar es una partida distinta.
   */
  const otraPartida = useCallback(() => {
    const nueva = Date.now() >>> 0;
    setSemilla(nueva);
    reiniciar(nueva);
  }, [reiniciar]);

  /*
   * ═══ LA PALABRA DESAPARECE SI LA APP DEJA DE ESTAR DELANTE ═══
   *
   * Porque al irse al fondo el sistema le hace una foto a la pantalla y la guarda
   * para el conmutador de aplicaciones. Con la palabra dentro, esa foto es el
   * secreto entero — y el camino más probable para irse al fondo es el gesto del
   * propio juego: deslizar hacia arriba desde el borde inferior es el gesto de
   * inicio del sistema, no del juego, y quien sujeta el móvil contra la frente
   * tiene el pulgar justo ahí. Ver la cabecera de `entrada.ts` y `usarPrimerPlano`.
   */
  const delante = usarPrimerPlano();

  return (
    <GestureDetector gesture={gesto}>
      <View style={estilos.todo}>
        {vista.momento === 'antes' && <Antes alEmpezar={() => mover(EMPEZAR)} />}

        {vista.momento === 'preparados' && <Colocatelo segundos={segundos} ronda={vista.ronda} />}

        {vista.momento === 'jugando' && (
          <Jugando
            palabra={delante ? vista.palabra : null}
            segundos={segundos}
            aciertos={vista.aciertos}
          />
        )}

        {vista.momento === 'despues' && (
          <Despues
            vista={vista}
            alSeguir={() => mover(OTRA_RONDA)}
            alEmpezarDeCero={otraPartida}
          />
        )}
      </View>
    </GestureDetector>
  );
}

/**
 * Antes de empezar: lo único que hay que leer de cerca en todo el juego.
 *
 * Se explican los dos gestos y la postura, en ese orden, porque quien abre esto
 * por primera vez no sabe ni que hay que ponerse el móvil en la cabeza. Y se dice
 * «arriba» y «abajo» con flechas grandes: es lo que hay que recordar cuando ya no
 * se ve nada.
 */
function Antes({ alEmpezar }: { alEmpezar: () => void }): JSX.Element {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.titulo}>LA FRENTE</Text>
      <Text style={estilos.explicacion}>
        Pon el móvil en tu frente con la pantalla hacia los demás. Tú no vas a ver la palabra:
        ellos te dan pistas y tú adivinas.
      </Text>

      <View style={estilos.gestos}>
        <View style={estilos.gesto}>
          <Text style={estilos.flecha}>↓</Text>
          <Text style={estilos.gestoTexto}>Desliza ABAJO{'\n'}cuando aciertes</Text>
        </View>
        <View style={estilos.gesto}>
          <Text style={estilos.flecha}>↑</Text>
          <Text style={estilos.gestoTexto}>Desliza ARRIBA{'\n'}para pasar</Text>
        </View>
      </View>

      {/*
        «Por el centro» no es un consejo de acabado: los dos gestos de este juego
        son, milímetro a milímetro, los dos gestos de sistema del borde —arriba
        desde abajo es ir al inicio, abajo desde arriba abre las notificaciones— y
        si el deslizamiento empieza pegado a un borde, el sistema se lo queda
        antes de que llegue al juego. Decirlo aquí es lo único que se puede hacer
        desde dentro de la app sin una dependencia nueva. Ver `entrada.ts`.
      */}
      <Text style={estilos.explicacionMenuda}>
        Desliza por el centro de la pantalla, no pegado al borde.{'\n'}
        Vibra cada vez que el gesto entra, para que lo notes sin mirar.{'\n'}
        Al empezar tienes {SEGUNDOS_PARA_COLOCARSE} segundos para colocártelo, y luego{' '}
        {SEGUNDOS_DE_RONDA} por ronda.
      </Text>

      <Pressable
        onPress={alEmpezar}
        style={estilos.boton}
        accessibilityRole="button"
        accessibilityLabel="Empezar la ronda"
      >
        <Text style={estilos.botonTexto}>EMPEZAR</Text>
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        style={estilos.salir}
        accessibilityRole="button"
        accessibilityLabel="Volver a la portada"
      >
        <Text style={estilos.salirTexto}>Volver</Text>
      </Pressable>
    </View>
  );
}

/**
 * COLÓCATELO: los tres segundos entre pulsar el botón y ver la primera palabra.
 *
 * ═══ LA PANTALLA MÁS IMPORTANTE DEL JUEGO, Y NO ESTABA ═══
 *
 * Sin ella, la carta se repartía y se enseñaba en el mismo instante en que se
 * pulsaba EMPEZAR —con la cara delante del cristal, porque el botón está debajo
 * del texto que dice «pon el móvil en tu frente»— y la primera palabra de cada
 * ronda se quemaba siempre. Con OTRA_RONDA era peor: ese botón lo pulsa quien
 * acaba de jugar, justo antes de pasarle el aparato al siguiente.
 *
 * Aquí no se pinta la palabra porque LA PROYECCIÓN NO LA MANDA en este momento.
 * No hay ninguna condición de pintado que se pueda olvidar: si alguien borrara
 * esta pantalla entera, seguiría sin verse la palabra. La regla vive en el juego.
 *
 * La cuenta atrás es enorme por lo de siempre —se lee de lejos y de reojo— y el
 * número de ronda va debajo porque es lo que la mesa canta al cambiar de manos.
 */
function Colocatelo({ segundos, ronda }: { segundos: number; ronda: number }): JSX.Element {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.titulo}>PÓNTELO EN LA FRENTE</Text>
      <Text style={estilos.cuentaAtras}>{segundos}</Text>
      <Text style={estilos.explicacionMenuda}>
        Pantalla hacia los demás.{'\n'}
        Ronda {ronda}
      </Text>
    </View>
  );
}

/**
 * Jugando: la palabra, el cronómetro y el recuento. Nada más.
 *
 * No hay ni un botón en pantalla, y es a propósito: el único que podría pulsarlo
 * es quien no está mirando. Toda la entrada es el gesto que envuelve la pantalla
 * entera, y lo que se pinta aquí es para la sala.
 *
 * `palabra` puede llegar en `null` con la ronda en marcha, y no es un hueco: es
 * la app que ha dejado de estar en primer plano y no quiere salir en la foto que
 * el sistema le hace a la pantalla. Ver `usarPrimerPlano`.
 */
function Jugando({
  palabra,
  segundos,
  aciertos,
}: {
  palabra: string | null;
  segundos: number;
  aciertos: number;
}): JSX.Element {
  const apurado = segundos <= CUENTA_ATRAS;
  const { width } = useWindowDimensions();
  /*
   * El ancho útil es el de la ventana menos el relleno de `centro`, que son 24 a
   * cada lado. Se calcula aquí y no en la hoja de estilos porque el cuerpo de la
   * letra depende de la palabra que haya salido, y una hoja de estilos no sabe
   * qué carta es. Ver `tamanoDeLaPalabra`.
   */
  const cuerpo = tamanoDeLaPalabra(palabra ?? '', width - 48);
  return (
    <View style={estilos.centro}>
      <Text style={[estilos.reloj, apurado && estilos.relojApurado]}>{segundos}</Text>
      <Text
        style={[estilos.palabra, { fontSize: cuerpo, lineHeight: Math.round(cuerpo * 1.1) }]}
        adjustsFontSizeToFit
        numberOfLines={3}
        accessibilityLabel="La palabra que hay que adivinar"
      >
        {palabra ?? ''}
      </Text>
      <Text style={estilos.recuento}>{aciertos}</Text>
    </View>
  );
}

/**
 * Después: el recuento, y las dos listas.
 *
 * ES EL FINAL DEL JUEGO y no un resumen administrativo: aquí es donde la mesa
 * discute si «eso valía». Por eso salen las palabras enteras y no solo las cifras,
 * y por eso la que se quedó puesta al acabar el tiempo aparece con las falladas —
 * si se perdiera en silencio, el juego terminaría sin cerrar.
 */
function Despues({
  vista,
  alSeguir,
  alEmpezarDeCero,
}: {
  vista: VistaDeLaSala;
  alSeguir: () => void;
  alEmpezarDeCero: () => void;
}): JSX.Element {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.titulo}>SE ACABÓ</Text>
      <Text style={estilos.marcador}>{vista.aciertos}</Text>
      <Text style={estilos.explicacionMenuda}>
        {vista.aciertos === 1 ? 'acierto' : 'aciertos'} en la ronda {vista.ronda}
      </Text>

      {vista.acertadas.length > 0 && (
        <View style={estilos.lista}>
          <Text style={estilos.listaTitulo}>ACERTADAS</Text>
          <Text style={estilos.listaTexto}>{vista.acertadas.join(' · ')}</Text>
        </View>
      )}

      {vista.falladas.length > 0 && (
        <View style={estilos.lista}>
          <Text style={[estilos.listaTitulo, { color: SALA.fallo }]}>SE ESCAPARON</Text>
          <Text style={[estilos.listaTexto, { color: SALA.fallo }]}>{vista.falladas.join(' · ')}</Text>
        </View>
      )}

      <Pressable
        onPress={alSeguir}
        style={estilos.boton}
        accessibilityRole="button"
        accessibilityLabel="Otra ronda, para la siguiente persona"
      >
        <Text style={estilos.botonTexto}>OTRA RONDA</Text>
      </Pressable>
      {/*
        Se dice debajo del botón y no en él: quien lo pulsa suele ser quien acaba
        de jugar, y lo que pasa después —el móvil cambia de manos— es justo el
        instante que el juego protege con los tres segundos.
      */}
      <Text style={estilos.explicacionMenuda}>
        Al pulsar hay {SEGUNDOS_PARA_COLOCARSE} segundos para pasar el móvil.
      </Text>

      <Pressable
        onPress={alEmpezarDeCero}
        style={estilos.salir}
        accessibilityRole="button"
        accessibilityLabel="Empezar una partida nueva"
      >
        <Text style={estilos.salirTexto}>Empezar de cero</Text>
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        style={estilos.salir}
        accessibilityRole="button"
        accessibilityLabel="Volver a la portada"
      >
        <Text style={estilos.salirTexto}>Volver</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },

  titulo: { color: SALA.neon, fontSize: 22, fontWeight: '800', letterSpacing: 6 },

  explicacion: {
    color: SALA.palabra,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 340,
  },
  explicacionMenuda: {
    color: SALA.neonTenue,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  gestos: { flexDirection: 'row', gap: 28, marginVertical: 10 },
  gesto: { alignItems: 'center', gap: 6 },
  flecha: { color: SALA.neon, fontSize: 46, fontWeight: '800', lineHeight: 50 },
  gestoTexto: { color: SALA.palabra, fontSize: 14, textAlign: 'center', lineHeight: 19 },

  /*
   * El número del cronómetro es tabular a propósito: sin eso, al pasar de 10 a 9
   * la cifra cambia de ancho y el número entero da un salto lateral en mitad de la
   * pantalla, que a tres metros parece un parpadeo.
   */
  reloj: {
    color: SALA.neonTenue,
    fontSize: 68,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  relojApurado: { color: SALA.aviso },

  /*
   * La cuenta atrás de colocarse es todavía más grande que el cronómetro de la
   * ronda: se mira una vez, de reojo y en movimiento, mientras se levanta el
   * brazo. Y va en el verde de la sala y no en ámbar, porque ámbar aquí significa
   * «se te acaba el tiempo» y esto es lo contrario: todavía no ha empezado.
   */
  cuentaAtras: {
    color: SALA.neon,
    fontSize: 120,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  /*
   * El cuerpo y el interlineado de aquí son el TECHO y los pisa `Jugando` con el
   * tamaño que calcula para la carta que haya salido: en web no hay nadie que
   * encoja el texto por su cuenta y una carta larga se recortaría. Ver
   * `tamanoDeLaPalabra`.
   */
  palabra: {
    color: SALA.palabra,
    fontSize: 62,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 68,
  },

  recuento: { color: SALA.neon, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  marcador: { color: SALA.neon, fontSize: 90, fontWeight: '800', fontVariant: ['tabular-nums'] },

  lista: { alignItems: 'center', gap: 4, maxWidth: 360 },
  listaTitulo: { color: SALA.neon, fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  listaTexto: { color: SALA.palabra, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  boton: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 42,
    borderRadius: 999,
    backgroundColor: SALA.neon,
  },
  botonTexto: { color: SALA.fondo, fontSize: 17, fontWeight: '800', letterSpacing: 2 },

  salir: {
    /* 44 de alto: con 8 de relleno y 15 de letra se quedaba en 34. */
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  salirTexto: { color: SALA.neonTenue, fontSize: 15 },
});
