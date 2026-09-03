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
 *   · Los últimos diez segundos se ponen en `SALA.alarma`. Es lo único cálido de
 *     toda la pantalla y por eso avisa: es lo que hace que la mesa acelere.
 *
 * ═══ LO QUE LA IDENTIDAD DE LA SALA CAMBIÓ AQUÍ, Y POR QUÉ ═══
 *
 * El cronómetro iba en el gris de apoyo, a 3,11:1 sobre el fondo. Era la peor
 * flaqueza de la Sala entera y justo en el sitio peor: es lo que se mira durante
 * cincuenta de los sesenta segundos de una ronda, a tres metros y con poca luz.
 * Ahora las cifras grandes van en `SALA.blanco` —el blanco de énfasis de la tabla,
 * que existe para esto— y sólo se tiñen cuando el tiempo quema.
 *
 * El acento no se reparte: en esta pantalla vive en lo que se toca —el botón, que
 * es un campo de color grande, y las dos flechas, que son el gesto entero de este
 * juego—. Todo lo demás es gris frío, y las superficies se separan por un filo de
 * un píxel, nunca por un material.
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
import { LinearGradient } from 'expo-linear-gradient';
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
import { LETRA, RADIO, SALA } from './muebles';

/** A partir de aquí el número quema. Diez segundos es lo que se corea. */
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
 * EL BOTÓN GRANDE: el único campo de color de la pantalla.
 *
 * Está aquí y no repetido dos veces porque el degradado del acento es lo que hace
 * que se lea como un plano encendido y no como un rectángulo pintado, y dos copias
 * de tres propiedades se separan a la primera. La tabla declara `acentoHondo`
 * justo para esto: es el fondo del degradado, no un segundo acento.
 *
 * El texto va en `SALA.blanco` y no en el color del suelo: sobre el acento, lo que
 * se lee es blanco. Y el borde de un píxel es el filo de la Sala haciendo lo suyo
 * —levantar el plano sin inventar un material—, así que se le resta al relleno en
 * vez de sumarse por fuera.
 */
function BotonPrincipal({
  texto,
  alPulsar,
  etiqueta,
}: {
  texto: string;
  alPulsar: () => void;
  etiqueta: string;
}): JSX.Element {
  return (
    <Pressable
      onPress={alPulsar}
      style={estilos.boton}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <LinearGradient
        colors={[SALA.acento, SALA.acentoHondo]}
        /* La diagonal de la maqueta: casi vertical, con una pizca de caída a la derecha. */
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={estilos.botonCampo}
      >
        <Text style={estilos.botonTexto}>{texto}</Text>
      </LinearGradient>
    </Pressable>
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

      {/*
        Los dos gestos van en una teja con las dos celdas separadas por un filo, que
        es la misma anatomía que la fila de datos de una ficha de la Sala. Antes eran
        dos columnas sueltas sobre el fondo: se leían como texto y no como las dos
        únicas cosas que hay que memorizar antes de dejar de ver la pantalla.
      */}
      <View style={estilos.gestos}>
        <View style={estilos.gesto}>
          <Text style={estilos.flecha}>↓</Text>
          <Text style={estilos.gestoTexto}>Desliza ABAJO{'\n'}cuando aciertes</Text>
        </View>
        <View style={[estilos.gesto, estilos.gestoSegundo]}>
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

      <BotonPrincipal texto="EMPEZAR" alPulsar={alEmpezar} etiqueta="Empezar la ronda" />

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

      {/*
        Las que se escaparon van en el gris de apoyo y las acertadas en el texto
        normal. La Sala no tiene color de fallo, y aquí no hace falta ninguno: lo
        que distingue a las dos listas es que una se apaga. Pintarlas de rojo sería
        además decirle a la mesa que se ha hecho algo mal, y en este juego fallar
        una carta es la mitad de la gracia.
      */}
      {vista.falladas.length > 0 && (
        <View style={estilos.lista}>
          <Text style={estilos.listaTitulo}>SE ESCAPARON</Text>
          <Text style={[estilos.listaTexto, estilos.listaTextoApagada]}>
            {vista.falladas.join(' · ')}
          </Text>
        </View>
      )}

      <BotonPrincipal
        texto="OTRA RONDA"
        alPulsar={alSeguir}
        etiqueta="Otra ronda, para la siguiente persona"
      />
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
  todo: { flex: 1, backgroundColor: SALA.suelo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },

  /*
   * El rótulo de cada pantalla ya no es de color: un título no es una cosa que se
   * pueda tocar, y el acento de la Sala significa exactamente eso. Lo que lo hace
   * cartel es lo que dice `LETRA.rotulo` —peso 800, caja alta y tracking—, que es
   * de donde sale la voz de un rótulo cuando no hay una condensada instalada.
   * El tracking baja de 6 a 1,4: a seis, veintidós píxeles de letra se deshacen en
   * letras sueltas en vez de leerse como una palabra.
   */
  titulo: { color: SALA.palabra, fontSize: 22, ...LETRA.rotulo },

  explicacion: {
    color: SALA.palabra,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 340,
    ...LETRA.cuerpo,
  },
  explicacionMenuda: {
    color: SALA.tenue,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    ...LETRA.cuerpo,
  },

  /*
   * La teja de los gestos: una superficie levantada sobre el suelo, separada por un
   * filo de un píxel y por nada más. Sin borde el bloque flotaría, que es
   * justamente lo que hacía antes.
   */
  gestos: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    maxWidth: 340,
    marginVertical: 10,
    backgroundColor: SALA.teja,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: SALA.filo,
    overflow: 'hidden',
  },
  gesto: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 12 },
  /* El mismo filo que separa el bloque del fondo separa las dos celdas entre sí. */
  gestoSegundo: { borderLeftWidth: 1, borderLeftColor: SALA.filo },
  /*
   * Las flechas SÍ son acento, y es el único sitio de la pantalla donde el color
   * aparece sin ser un botón: en este juego el gesto ES el mando —no hay ni una
   * cosa que pulsar mientras se juega— así que las dos flechas son literalmente lo
   * que se puede tocar, dicho antes de que deje de verse la pantalla.
   */
  flecha: { color: SALA.acento, fontSize: 46, fontWeight: '800', lineHeight: 50 },
  gestoTexto: {
    color: SALA.palabra,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 19,
    ...LETRA.cuerpo,
  },

  /*
   * EL CRONÓMETRO. Iba en el gris de apoyo, a 3,11:1 sobre el fondo, y es la cifra
   * que se mira durante cincuenta de los sesenta segundos de una ronda: a tres
   * metros y con poca luz eso no era un color secundario, era un número borroso.
   * `SALA.blanco` es el blanco de énfasis de la tabla, y su comentario dice para
   * qué está: las cifras grandes.
   *
   * Y es tabular a propósito: sin eso, al pasar de 10 a 9 la cifra cambia de ancho
   * y el número entero da un salto lateral en mitad de la pantalla, que a tres
   * metros parece un parpadeo.
   */
  reloj: {
    color: SALA.blanco,
    fontSize: 68,
    ...LETRA.rotulo,
    fontVariant: ['tabular-nums'],
  },
  /* Lo único cálido de la pantalla, y por eso avisa. Ver `SALA.alarma`. */
  relojApurado: { color: SALA.alarma },

  /*
   * La cuenta atrás de colocarse es todavía más grande que el cronómetro de la
   * ronda: se mira una vez, de reojo y en movimiento, mientras se levanta el brazo.
   * Va en el mismo blanco que el cronómetro y NO en la alarma, porque la alarma
   * significa «se te acaba el tiempo» y esto es lo contrario: todavía no ha
   * empezado. Que las dos cuentas compartan color es lo que hace que el naranja de
   * los diez últimos segundos signifique algo.
   */
  cuentaAtras: {
    color: SALA.blanco,
    fontSize: 120,
    ...LETRA.rotulo,
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

  /*
   * El recuento acompaña, no se lee primero: la jerarquía a tres metros es la
   * palabra, el reloj y después los aciertos. Por eso va en el gris secundario y no
   * en `SALA.cifra`, que a ese tamaño repetiría el mismo 3:1 que se acaba de quitar
   * del cronómetro. Y no es acento: no se toca.
   */
  recuento: { color: SALA.tenue, fontSize: 30, ...LETRA.rotulo, fontVariant: ['tabular-nums'] },
  /* El resultado de la ronda: la cifra más grande de la pantalla, y es una cifra. */
  marcador: { color: SALA.blanco, fontSize: 90, ...LETRA.rotulo, fontVariant: ['tabular-nums'] },

  /*
   * Cada lista es una teja, no texto suelto sobre el fondo: aquí es donde la mesa
   * discute si «eso valía», y una superficie con filo dice dónde empieza y acaba lo
   * que se está discutiendo.
   */
  lista: {
    alignSelf: 'stretch',
    maxWidth: 360,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: SALA.teja,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: SALA.filo,
  },
  /* 13 es el mínimo de texto de la casa; estaba en 12. */
  listaTitulo: { color: SALA.tenue, fontSize: 13, ...LETRA.rotuloChico },
  listaTexto: {
    color: SALA.palabra,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    ...LETRA.cuerpo,
  },
  listaTextoApagada: { color: SALA.tenue },

  /*
   * El botón deja de ser una pastilla de 999 y toma el radio de mando de la Sala:
   * los redondeos son pocos y cada uno tiene un trabajo. El relleno pierde un píxel
   * por lado para pagar el filo sin crecer, y aun así el alto pasa de 50.
   */
  boton: {
    marginTop: 8,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: SALA.filoVivo,
    overflow: 'hidden',
  },
  botonCampo: { paddingVertical: 15, paddingHorizontal: 41, alignItems: 'center' },
  botonTexto: { color: SALA.blanco, fontSize: 17, ...LETRA.rotulo, letterSpacing: 2 },

  /*
   * Los mandos secundarios llevan filo y no relleno: se ven, se tocan y no compiten
   * con el campo de acento. Los 44 de alto siguen siendo 44 —el borde entra dentro,
   * y el relleno baja de 8 a 7 para no comérselo.
   */
  salir: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: SALA.filo,
  },
  salirTexto: { color: SALA.tenue, fontSize: 15, ...LETRA.cuerpo },
});
