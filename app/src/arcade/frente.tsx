/**
 * «LA FRENTE», pintada. Y LA PINTA ESTE FICHERO, no el mueble.
 *
 * Aquí decía «es el mueble `formulario` haciendo lo suyo», y es falso por una
 * línea concreta: `pintados.ts` resuelve con `LOS_QUE_PINTA[id] ??
 * LOS_MUEBLES_GENERICOS[mueble]`, y como La Frente tiene entrada propia por
 * identificador, el pintor genérico del mueble NO LLEGA A CONSULTARSE NUNCA. La
 * frase importa porque confunde a quien venga a escribir el segundo arcade de
 * `formulario`: declarando `opciones()` no obtiene nada parecido a esta pantalla,
 * obtiene `LOS_MUEBLES_GENERICOS`, que es otra cosa. Lo que sí comparte con el
 * mueble es la RUTA —`/formulario`, con el juego como parámetro— y la clase de
 * vistas que pide: normales, una palabra enorme y un cronómetro grande.
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
 * El cronómetro iba en el gris de apoyo, a 3,02:1 sobre el fondo. Era la peor
 * flaqueza de la Sala entera y justo en el sitio peor: es lo que se mira durante
 * cincuenta de los sesenta segundos de una ronda, a tres metros y con poca luz.
 * Ahora las cifras grandes van en `SALA.blanco` —el blanco de énfasis de la tabla,
 * que existe para esto— y sólo se tiñen cuando el tiempo quema.
 *
 * (AQUÍ DECÍA 3,11 Y LA CIFRA NO SALE. `SALA.cifra` es blanco al 34 %; compuesto
 * sobre `SALA.suelo` da (92 · 93 · 96), L=0,1100, y contra L=0,0030 son 3,019:1.
 * La diferencia es del 3 % y no cambia ninguna decisión, pero el número estaba
 * citado dos veces en este fichero y no se reproduce contando, que es la manera
 * de enseñar que aquí los comentarios no se comprueban. Ver `frente.ts:150-158`,
 * que tiene escrito por qué eso importa.)
 *
 * El acento no se reparte: en esta pantalla vive en lo que se toca —el botón que
 * arranca la ronda y los tres mandos secundarios— más UNA excepción, que se
 * declara porque antes se rompía la regla en la misma frase que la enunciaba: las
 * dos flechas del gesto son acento y NO son pulsables. Se sostiene porque en este
 * juego el gesto ES el mando —mientras se juega no hay una sola cosa que pulsar—
 * así que las flechas son literalmente lo que se toca, dicho antes de dejar de ver
 * la pantalla. Importa dejarlo escrito: la regla «acento = esto se toca» gobierna
 * dónde puede aparecer el color en el resto de la Sala (`muebles.ts:236-249`,
 * `tablero-en-linea.tsx`), y una excepción sin declarar la deroga en silencio.
 *
 * Todo lo demás es gris frío, y las superficies se separan por un filo de un
 * píxel, nunca por un material. Con una salvedad medida que también se dice:
 * `SALA.teja` sobre `SALA.suelo` es 1,09:1 y `SALA.filoVivo` sobre el suelo es
 * 1,42:1, así que las dos tejas de esta pantalla NO se recortan del fondo a la
 * vista. Se separan lo que la tabla de la casa permite separarlas.
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
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { AccessibilityActionEvent } from 'react-native';
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
import { Pulsable } from '../vivo';
import { usarArcadeLocal, usarElAparatoQuieto, usarPrimerPlano } from './local';
import { avisarQueEmpieza, avisarQueSeAcabo, usarGestoACiegas } from './entrada';
import { BOTON, LETRA, RADIO, SALA } from './muebles';
import { Pantalla } from './piezas';

/** A partir de aquí el número quema. Diez segundos es lo que se corea. */
const CUENTA_ATRAS = 10;

/**
 * El filo de un píxel, escrito una vez.
 *
 * Estaba a mano en los cinco sitios donde esta pantalla dibuja un borde —las dos
 * tejas, la separación entre las celdas de gestos, el botón y los mandos
 * secundarios—. El día que deje de ser uno tiene que dejar de serlo en los cinco a
 * la vez, y cinco literales no hacen eso.
 */
const FILO = 1;

/**
 * El relleno de las cuatro pantallas, y es un número que se usa DOS veces: como
 * margen de la columna y como resta en el ancho útil del que sale el cuerpo de la
 * palabra (`tamanoDeLaPalabra`). Estaba escrito 24 en la hoja de estilos y 48 —el
 * doble, a mano— en el cálculo; separarlos es cambiar el relleno y que la palabra
 * se salga sin que nada lo diga.
 */
const RELLENO = 24;

/**
 * ═══ EL TOPE DE AMPLIACIÓN DE LETRA, Y SÓLO LO LLEVAN LAS CIFRAS ═══
 *
 * El sistema multiplica el cuerpo de todo el texto hasta ×2 —«Texto más grande» de
 * iOS, «Tamaño de fuente» de Android—, y aquí no lo topaba nadie. Con las cuatro
 * pantallas ya desplazables (ver `Pantalla`), crecer dejó de tirar el botón fuera
 * del borde, así que el texto que se lee de cerca —la explicación, los gestos, las
 * listas, los mandos— NO lleva tope: es exactamente el texto para el que existe
 * esa opción de accesibilidad, y ahora hay sitio para que crezca.
 *
 * LAS CIFRAS SÍ, y es una concesión medida. La cuenta atrás mide 120, el marcador
 * 90 y el cronómetro 68: son de cinco a nueve veces el cuerpo de una frase, y ya
 * están dimensionadas para leerse a tres metros, que es lo que la ampliación
 * intentaría conseguir. A ×2 la cuenta atrás son 240 píxeles —el 37 % de los 647
 * útiles de un iPhone SE— empujando hacia abajo justamente el texto menudo que
 * quien ha pedido letra grande necesita ver. A ×1,5 son 180 de alto y 108 de
 * ancho por dígito (avance tabular ≈ 0,6 em) sobre los 272 útiles a 320 de
 * ventana, y el cronómetro de dos cifras 122 sobre esos mismos 272: caben los dos.
 * Ahí es donde la cifra deja de crecer y siguen creciendo las palabras.
 */
const TOPE_DE_CIFRA = 1.5;

/**
 * LAS DOS JUGADAS, DICHAS PARA QUIEN NO PUEDE HACER EL GESTO.
 *
 * Toda la entrada de una ronda es un `Gesture.Pan` que envuelve la pantalla, y con
 * un lector de pantalla encendido ESO NO EXISTE: VoiceOver y TalkBack se quedan
 * los arrastres de un dedo antes de que lleguen al reconocedor. O sea que la
 * persona ciega —que es el candidato ideal para llevar el aparato en la frente,
 * porque no ve la palabra por definición— era exactamente la que no podía jugar:
 * la ronda corría sus sesenta segundos y terminaba con cero aciertos sin que nada
 * lo explicara.
 *
 * Una acción de accesibilidad es la misma jugada por el otro camino: llama a
 * `mover(ACIERTO)` y a `mover(PASO)`, que es lo que llama el gesto. No hay ninguna
 * regla nueva, y a propósito: si el lector está apagado esto no se anuncia ni se
 * puede invocar, así que el juego de la mesa es el mismo de siempre.
 */
const ACCIONES_A_CIEGAS = [
  { name: 'acertar', label: 'Acertar esta palabra' },
  { name: 'pasar', label: 'Pasar esta palabra' },
];

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
            /*
             * Las mismas dos respuestas que recibe el gesto, por el camino que un
             * lector de pantalla sí deja pasar. Ver `ACCIONES_A_CIEGAS`.
             */
            alAcertar={acertar}
            alPasar={pasar}
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
 * ═══ ERA UN DEGRADADO CON LA ETIQUETA EN BLANCO, Y LA ETIQUETA NO SE LEÍA ═══
 *
 * Y el comentario que había aquí no describía mal el resultado: lo DEFENDÍA como
 * criterio —«el texto va en `SALA.blanco` y no en el color del suelo: sobre el
 * acento, lo que se lee es blanco»—, o sea que quien copiara este botón para el
 * siguiente arcade se llevaba el fallo con la razón incluida. La Sala midió lo
 * contrario dos veces y lo dejó escrito con números (`index.tsx`, en el botón de
 * la tarjeta y en el plato de la pastilla).
 *
 * `SALA.blanco` es #F4F6FA, L=0,9205. Sobre el acento PURO da 3,66 en violeta,
 * 1,98 en ámbar, 2,11 en verde y 3,39 en carmesí. Y el degradado no salvaba nada,
 * porque su eje iba de (0,0) a (0,4·W, H): la PRIMERA letra de la etiqueta caía en
 * t≈0,50 para «EMPEZAR» (botón de ~179) y en t≈0,44 para «OTRA RONDA» (~220), o
 * sea sobre acento a medio virar y no sobre el hondo. Medido ahí: 4,91 / 2,97 /
 * 3,05 / 4,96 para «EMPEZAR» y 4,74 / 2,83 / 2,91 / 4,74 para «OTRA RONDA». El
 * mínimo exigible es 4,5:1 —17 px en peso 800 NO es texto grande, que empieza en
 * 18,66 px en negrita— así que fallaba en ámbar y en verde, y raspaba en los otros
 * dos. A tres metros, que es la distancia para la que esta pantalla está diseñada,
 * la mitad izquierda de la etiqueta se leía como una mancha más clara.
 *
 * ES `BOTON.primario` Y NADA MÁS: relleno sólido de `SALA.acento` con tinta
 * `SALA.suelo`, que da 5,01 / 9,23 / 8,69 / 5,40 en los cuatro temas. Es la única
 * pareja sólida que pasa a la vez el 4,5:1 del texto y el 3:1 del recorte del
 * relleno, y por eso vive en la tabla de `muebles.ts` y no se reinventa aquí.
 *
 * Y SE VA EL DEGRADADO ENTERO, no se le mueve el corte. La casa tiene receta para
 * una placa de acento con texto encima —`locations={[0, 0.4]}`, eje vertical, un
 * hueco `flex: 1` y `justifyContent: 'flex-end'` para que el texto caiga donde el
 * degradado ya es hondo— pero ésa es la receta de una PORTADA, que es un plano
 * grande donde el degradado cuenta algo. Un botón de 50 de alto no tiene sitio
 * para que un degradado diga nada, y sostenerlo aquí obligaría a mantener cuatro
 * números que sólo valen mientras la etiqueta mida lo que mide hoy. El relleno
 * plano no depende de la longitud de la palabra.
 *
 * El borde de un píxel se queda —es el filo de la Sala levantando el plano sin
 * inventar un material— y ahora es del acento, como manda `BOTON.primario`.
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
    /*
     * `Pulsable` y no un `Pressable` desnudo: hunde a 0,965 y vuelve con rebote.
     * Sin esa respuesta, el único botón de la pantalla no se distingue de una
     * pastilla pintada hasta que la pantalla entera cambia —y entre pulsar EMPEZAR
     * y que aparezca la cuenta atrás hay un repintado por medio—.
     */
    <Pulsable onPress={alPulsar} style={estilos.boton} accessibilityLabel={etiqueta}>
      <Text style={estilos.botonTexto}>{texto}</Text>
    </Pulsable>
  );
}

/**
 * UN MANDO SECUNDARIO: «Volver», «Empezar de cero».
 *
 * ═══ SU ÚNICO DISTINTIVO ESTABA EN 1,17:1 ═══
 *
 * Llevaba borde de `SALA.filo` —blanco al 7,5 %— sobre `SALA.suelo`. Compuesto
 * eso da (26,5 · 28,4 · 32,1), L=0,0118, y contra el L=0,0030 del suelo son
 * 1,17:1, con 3:1 exigible para el contorno de un control (WCAG 1.4.11). El texto
 * sí se veía —`SALA.tenue` sobre el suelo da 6,50— así que lo que no existía era
 * el BOTÓN: en una sala con poca luz, que es el escenario declarado en la cabecera
 * de este fichero, los tres se leían como texto suelto sobre el fondo negro. Y el
 * comentario que había afirmaba justo lo contrario: «se ven, se tocan».
 *
 * Ahora es `BOTON.secundario`: sin relleno, tinta y borde en `SALA.acento` pleno.
 * El acento sobre el suelo pasa de largo el 3:1 del contorno y el 4,5:1 del texto
 * en los cuatro temas —sobre la teja, que es un fondo más claro, la casa lo midió
 * en 4,58 / 8,44 / 7,96 / 4,94, y sobre el suelo sube—. Un borde de acento
 * atenuado no vale: al 42 % se queda en 1,77 y deja de recortarse.
 *
 * Y que se vuelvan de acento no rompe la regla de la cabecera, la cumple: son
 * cosas que se tocan. Lo que no puede pasar es que compitan con el botón grande, y
 * no lo hacen — aquél es un CAMPO de color y éstos son un contorno, que es
 * exactamente la distancia que la tabla de `muebles.ts` pone entre los dos.
 */
function MandoSecundario({
  texto,
  alPulsar,
  etiqueta,
}: {
  texto: string;
  alPulsar: () => void;
  etiqueta: string;
}): JSX.Element {
  return (
    <Pulsable onPress={alPulsar} style={estilos.salir} accessibilityLabel={etiqueta}>
      <Text style={estilos.salirTexto}>{texto}</Text>
    </Pulsable>
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
    <Pantalla hueco={RELLENO}>
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

        <MandoSecundario
          texto="Volver"
          alPulsar={() => router.back()}
          etiqueta="Volver a la portada"
        />
      </View>
    </Pantalla>
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
  const cuenta = `${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`;
  return (
    <Pantalla hueco={RELLENO}>
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>PÓNTELO EN LA FRENTE</Text>
        {/*
          LA CIFRA DICE QUÉ ES, y no sólo cuánto vale. Era un número desnudo: un
          lector de pantalla leía «3» y nada más. Lleva región viva porque cambia
          una vez por segundo y sólo tres veces —«3», «2», «1» es exactamente lo
          que la mesa canta— y ése es el único sitio de esta pantalla donde
          anunciar un cambio informa en vez de estorbar; el cronómetro de la ronda
          se repinta diez veces por segundo y no la lleva. `accessibilityLiveRegion`
          sólo existe en Android: en iOS esto se oye al enfocarlo, no solo, y
          arreglarlo pediría `AccessibilityInfo.announceForAccessibility`, que es
          un efecto y no una propiedad.
        */}
        <Text
          style={estilos.cuentaAtras}
          maxFontSizeMultiplier={TOPE_DE_CIFRA}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${cuenta} para ponértelo en la frente`}
        >
          {segundos}
        </Text>
        <Text style={estilos.explicacionMenuda}>
          Pantalla hacia los demás.{'\n'}
          Ronda {ronda}
        </Text>
      </View>
    </Pantalla>
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
 *
 * ═══ Y ES LA ÚNICA DE LAS CUATRO QUE NO SE PUEDE DESPLAZAR ═══
 *
 * Las otras tres van dentro de `Pantalla`, que es un `ScrollView`. Ésta no, y no
 * es un olvido: aquí el `Gesture.Pan` que envuelve la pantalla ESTÁ ACTIVO
 * —`usarGestoACiegas` lo enciende sólo en `jugando`— y un `ScrollView` debajo de
 * un `Pan` vertical son dos reconocedores peleándose por el mismo arrastre. El
 * gesto es toda la entrada del juego; perderlo para ganar un desplazamiento que
 * aquí no hace falta sería cambiar un defecto por una avería.
 *
 * Y no hace falta: esta pantalla son tres cosas de alto fijo —68 de reloj, la
 * palabra con su cuerpo calculado y 30 de recuento, unos 250 a 350 píxeles con los
 * huecos— contra los 568 útiles del móvil más apretado que se contempla. Lo que sí
 * podía desbordarla era la ampliación de letra del sistema, y eso se ataja donde
 * nace: las cifras llevan tope y la palabra no se amplía dos veces (ver abajo).
 */
function Jugando({
  palabra,
  segundos,
  aciertos,
  alAcertar,
  alPasar,
}: {
  palabra: string | null;
  segundos: number;
  aciertos: number;
  alAcertar: () => void;
  alPasar: () => void;
}): JSX.Element {
  const apurado = segundos <= CUENTA_ATRAS;
  const { width } = useWindowDimensions();
  /*
   * El ancho útil es el de la ventana menos el relleno de la pantalla, a los dos
   * lados. Sale de `RELLENO` y no de un 48 escrito a mano: era el mismo número dos
   * veces en dos sitios que nadie ataba, y el día que el relleno cambie la palabra
   * se saldría por los lados sin que nada avisara. Se calcula aquí y no en la hoja
   * de estilos porque el cuerpo de la letra depende de la palabra que haya salido,
   * y una hoja de estilos no sabe qué carta es. Ver `tamanoDeLaPalabra`.
   */
  const cuerpo = tamanoDeLaPalabra(palabra ?? '', width - RELLENO * 2);

  const responder = useCallback(
    (e: AccessibilityActionEvent) => {
      if (e.nativeEvent.actionName === 'acertar') alAcertar();
      else if (e.nativeEvent.actionName === 'pasar') alPasar();
    },
    [alAcertar, alPasar],
  );

  const quedan = `${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`;
  const llevas = `${aciertos} ${aciertos === 1 ? 'acierto' : 'aciertos'}`;

  return (
    /*
     * ═══ LA PANTALLA ENTERA ES UN SOLO ELEMENTO ACCESIBLE, CON DOS ACCIONES ═══
     *
     * Con el lector encendido el `Gesture.Pan` no llega nunca (ver
     * `ACCIONES_A_CIEGAS`), así que esto es la única forma de jugar que le queda a
     * quien no ve — y es justo quien mejor lleva el aparato en la frente.
     *
     * Va agrupado en UN elemento y no en cuatro sueltos porque lo que hay aquí es
     * un estado, no una lista: al enfocarlo se oye qué queda y cuánto llevas, y las
     * dos jugadas están en el rotor. El cronómetro se dice AL ENFOCAR y no en una
     * región viva a propósito: se repinta diez veces por segundo, y un lector
     * anunciando eso no informa, tapa la mesa.
     *
     * El recuento de abajo sigue pintándose para la sala; su valor viaja en
     * `accessibilityValue` para que no se lea dos veces.
     */
    <View
      style={estilos.centroFijo}
      accessible
      accessibilityLabel={`La ronda está en marcha. Quedan ${quedan}.`}
      accessibilityValue={{ text: llevas }}
      accessibilityHint="Desliza hacia abajo para acertar y hacia arriba para pasar."
      accessibilityActions={ACCIONES_A_CIEGAS}
      onAccessibilityAction={responder}
    >
      <Text
        style={[estilos.reloj, apurado && estilos.relojApurado]}
        maxFontSizeMultiplier={TOPE_DE_CIFRA}
      >
        {segundos}
      </Text>
      {/*
        ═══ LA PALABRA NO LLEGA AL LECTOR DE PANTALLA, Y ES LA REGLA DEL JUEGO ═══

        Tenía `accessibilityLabel="La palabra que hay que adivinar"`, que en iOS y
        en Android SUSTITUYE al contenido: se anunciaba esa frase fija y nunca la
        carta, ronda tras ronda, y cuando la app se iba al fondo seguía anunciándola
        encima de un `Text` vacío. Ocultarla es lo correcto y hasta ahora no estaba
        dicho en ninguna parte: el lector suena en el aparato que sujeta la persona
        que NO puede oír la palabra. Es la misma protección que ya hace
        `usarPrimerPlano` con la foto del conmutador, por el otro canal.

        Van las tres propiedades porque cada una sirve en un sitio:
        `importantForAccessibility` sólo existe en Android, iOS necesita
        `accessibilityElementsHidden`, y `react-native-web` descarta las dos y sólo
        entiende `aria-hidden`. Es el patrón que la tarjeta de la portada ya usa.

        `maxFontSizeMultiplier={1}` porque el cuerpo YA está calculado contra el
        ancho de la ventana (`tamanoDeLaPalabra`), y el multiplicador del sistema lo
        volvería a aplicar encima: a ×2 un cuerpo de 52 se pinta a 104 y la palabra
        se sale por los lados, que es el único desbordamiento que no se puede
        desplazar. No es una pérdida de accesibilidad — esta letra mide entre 24 y
        62 y ya es la más grande de la app con mucha diferencia.
      */}
      <Text
        style={[estilos.palabra, { fontSize: cuerpo, lineHeight: Math.round(cuerpo * 1.1) }]}
        adjustsFontSizeToFit
        numberOfLines={3}
        maxFontSizeMultiplier={1}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        aria-hidden
      >
        {palabra ?? ''}
      </Text>
      <Text style={estilos.recuento} maxFontSizeMultiplier={TOPE_DE_CIFRA}>
        {aciertos}
      </Text>
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
  const resultado =
    `${vista.aciertos} ${vista.aciertos === 1 ? 'acierto' : 'aciertos'} ` +
    `en la ronda ${vista.ronda}`;
  return (
    /*
     * ═══ ES LA PANTALLA QUE SE SALÍA POR ABAJO, Y POR ESO SE DESPLAZA ═══
     *
     * Las dos listas salen enteras de la proyección y crecen con lo bien que hayas
     * jugado —una ronda resuelve diez o quince cartas—, así que la pila medía 727
     * píxeles a 320 de ancho con cinco renglones de acertadas y dos de falladas:
     * 48 de relleno + 26 de título + 107 de marcador + 20 + 156 + 90 + 60 de botón
     * + 20 + 44 + 44, más siete huecos de 14. Contra 647 útiles en un iPhone SE y
     * unos 568 en un Android de 640 dp con sus barras. Con `justifyContent:
     * 'center'` el sobrante se repartía arriba y abajo, o sea que «Empezar de cero»
     * y «Volver» quedaban por debajo del borde SIN forma de llegar a ellos: la
     * única salida era el gesto del sistema, que es justo el que `entrada.ts` dice
     * que se pelea con los gestos de este juego. Cuanto mejor la partida, más
     * seguro el encierro.
     *
     * `Pantalla` es el `ScrollView` con `flexGrow: 1` y `justifyContent: 'center'`
     * en el contenedor de contenido: mientras quepa sigue centrado exactamente
     * igual que antes, y cuando no quepa se desplaza. Aquí no hay ningún gesto que
     * atropellar — `usarGestoACiegas` sólo está encendido en `jugando`.
     */
    <Pantalla hueco={RELLENO}>
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>SE ACABÓ</Text>
        {/*
          LA CIFRA Y SU FRASE SON UNA SOLA COSA, y se agrupan para decirlo. Sueltas,
          un lector leía «12» y después «aciertos en la ronda 2», que son dos
          anuncios para una frase partida por la mitad; y el número, que es el
          resultado del juego, no decía de qué era. El hueco interior baja de 14 a 6
          por lo mismo: lo que se lee junto se pinta junto.
        */}
        <View
          style={estilos.bloqueDelMarcador}
          accessible
          accessibilityRole="text"
          accessibilityLabel={resultado}
        >
          <Text style={estilos.marcador} maxFontSizeMultiplier={TOPE_DE_CIFRA}>
            {vista.aciertos}
          </Text>
          <Text style={estilos.explicacionMenuda}>
            {vista.aciertos === 1 ? 'acierto' : 'aciertos'} en la ronda {vista.ronda}
          </Text>
        </View>

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

        <MandoSecundario
          texto="Empezar de cero"
          alPulsar={alEmpezarDeCero}
          etiqueta="Empezar una partida nueva"
        />

        <MandoSecundario
          texto="Volver"
          alPulsar={() => router.back()}
          etiqueta="Volver a la portada"
        />
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.suelo },
  /*
   * ═══ LA COLUMNA DE CONTENIDO, QUE YA NO CENTRA POR SÍ SOLA ═══
   *
   * Era `flex: 1` con `justifyContent: 'center'` y el relleno dentro. Centraba muy
   * bien y recortaba por los dos extremos en cuanto el contenido pasaba del alto de
   * la pantalla, que es exactamente lo que pasaba en «Después» y en «Antes» (ver el
   * comentario de `Despues`). El centrado y el relleno se los ha quedado `Pantalla`
   * —`flexGrow: 1` más `justifyContent: 'center'` en el contenedor de contenido del
   * `ScrollView`, que centra mientras quepa y desplaza cuando no— y aquí sólo queda
   * lo que un `ScrollView` no sabe hacer por su contenido: alinearlo al eje y
   * separarlo.
   *
   * `centroFijo` es la misma pila SIN desplazamiento, y sólo la usa «Jugando»,
   * donde el gesto está vivo y un `ScrollView` sería un competidor. Ahí sí hace
   * falta el `flex: 1` y el `justifyContent`, porque no hay nadie encima que centre.
   */
  centro: { alignItems: 'center', gap: 14 },
  centroFijo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: RELLENO,
    gap: 14,
  },
  /* La cifra del resultado y la frase que dice de qué es: se leen juntas. */
  bloqueDelMarcador: { alignItems: 'center', gap: 6 },

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
   * ═══ LA TEJA DE LOS GESTOS, Y LO QUE SU FILO NO PUEDE HACER ═══
   *
   * Aquí decía «sin borde el bloque flotaría, que es justamente lo que hacía
   * antes», y prometía una separación que el ojo no recibe. Medido: `SALA.teja`
   * (#12161D) sobre `SALA.suelo` (#080A0E) da 1,09:1, y el borde en `SALA.filo`
   * —blanco al 7,5 %, compuesto (26,5 · 28,4 · 32,1), L=0,0118— da 1,17:1 contra
   * el L=0,0030 del suelo. Con `SALA.filoVivo`, que es el filo que la tabla declara
   * «cuando tiene que verse», sube a 1,42:1. Sigue sin ser un recorte: para llegar
   * a 3:1 sobre este suelo haría falta blanco al 34 % —el valor de `SALA.cifra`—, y
   * eso ya no es un filo, es una raya.
   *
   * Se sube a `filoVivo` porque es lo mejor que la tabla de la casa permite sin
   * inventar un token, y se deja escrito lo que da: 1,42, no 3. Un contorno de
   * agrupación no es un control, así que no le aplica el 3:1 de WCAG 1.4.11 —a los
   * mandos de abajo sí, y ésos sí se han arreglado—; lo que se pierde es la
   * intención del bloque, no un requisito. Si algún día esta teja tiene que
   * separarse de verdad, lo que hay que cambiar es la superficie, no el filo.
   */
  gestos: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    maxWidth: 340,
    marginVertical: 10,
    backgroundColor: SALA.teja,
    borderRadius: RADIO.ficha,
    borderWidth: FILO,
    borderColor: SALA.filoVivo,
    overflow: 'hidden',
  },
  gesto: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 12 },
  /*
   * El filo de dentro se queda en `SALA.filo`: separa dos celdas de la MISMA teja y
   * no la teja del suelo, y ahí un filo más vivo dibujaría una costura por el medio
   * de un bloque que es uno solo.
   */
  gestoSegundo: { borderLeftWidth: FILO, borderLeftColor: SALA.filo },
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
   * EL CRONÓMETRO. Iba en el gris de apoyo, a 3,02:1 sobre el fondo —la cabecera
   * decía 3,11 en dos sitios y la cuenta da 3,019; ver allí—, y es la cifra
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
   * discute si «eso valía». Decía que «una superficie con filo dice dónde empieza y
   * acaba lo que se está discutiendo», y con los mismos números que la teja de los
   * gestos —1,09:1 la superficie, 1,42:1 el filo vivo— eso no es lo que hace: lo
   * que de verdad separa las dos listas del resto es el relleno y el rótulo de
   * cabecera, no el contorno. El filo sube a `filoVivo` por lo mismo que allí, y
   * por lo mismo se dice lo que da.
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
    borderWidth: FILO,
    borderColor: SALA.filoVivo,
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
   * EL BOTÓN, ya sin degradado y sin capa interior. Los números están en
   * `BotonPrincipal`; aquí sólo la anatomía.
   *
   * El radio es el de mando de la Sala —los redondeos son pocos y cada uno tiene un
   * trabajo— y el relleno de la etiqueta vive ahora en el propio botón: al quitar
   * el `LinearGradient` desapareció el `botonCampo`, que era la única razón de que
   * hubiera dos estilos. El alto sigue pasando de 50 con 15 de relleno vertical.
   */
  boton: {
    marginTop: 8,
    paddingVertical: 15,
    paddingHorizontal: 41,
    alignItems: 'center',
    borderRadius: RADIO.mando,
    borderWidth: FILO,
    borderColor: BOTON.primario.borde,
    backgroundColor: BOTON.primario.fondo,
  },
  /*
   * El `letterSpacing: 2` escrito a mano se ha ido: `LETRA.rotulo` trae 1,4 y
   * pisarlo aquí era tener dos voces de rótulo en la misma Sala. Es la misma
   * corrección que ya se le hizo al título de `pintar.tsx`.
   */
  botonTexto: { color: BOTON.primario.tinta, fontSize: 17, ...LETRA.rotulo },

  /*
   * Los mandos secundarios llevan contorno y no relleno, para no competir con el
   * campo de acento del botón grande. El contorno y la tinta son `BOTON.secundario`
   * —el porqué y las cifras están en `MandoSecundario`—. Los 44 de alto siguen
   * siendo 44: el borde entra dentro, y el relleno baja de 8 a 7 para no comérselo.
   */
  salir: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: RADIO.mando,
    borderWidth: FILO,
    borderColor: BOTON.secundario.borde,
    backgroundColor: BOTON.secundario.fondo,
  },
  salirTexto: { color: BOTON.secundario.tinta, fontSize: 15, ...LETRA.cuerpo },
});
