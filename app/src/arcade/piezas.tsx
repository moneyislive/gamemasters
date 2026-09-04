/**
 * ═══ LAS PIEZAS DE LA SALA: EL VOCABULARIO QUE COMPARTEN LAS SIETE PANTALLAS ═══
 *
 * Este fichero existe por una razón medida y no por gusto de ordenar. Cuando la
 * tarjeta de la portada estrenó anatomía, el raíl de aforo estaba escrito TRES
 * veces —en la portada, en la espera de El Arcade y en La Peonza— y las tres se
 * habían separado: la portada pinta las muescas apagadas en blanco al 70 % y las
 * otras dos en `SALA.filoVivo`, que es blanco al 14 % y no se ve. La corrección
 * que se hizo en una no llegó a las otras dos, y no porque nadie mirase: porque
 * eran tres ficheros distintos y nada las ataba.
 *
 * Lo mismo pasó con el argumento de apagar un botón: `retablo.tsx` dedica ocho
 * renglones a explicar por qué un estado desactivado NO se pinta con `opacity`
 * —apaga también la letra, y una ayuda al 50 % se queda en 2,32:1— y el fichero
 * de al lado, `tablero-en-linea.tsx`, lo seguía haciendo en dos sitios.
 *
 * Así que aquí no vive «lo común» en abstracto: vive lo que ya se ha demostrado
 * que diverge. Cada pieza trae su medida en el comentario, para que el día que
 * alguien la cambie sepa contra qué está peleando.
 */
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { conAlfa, espacio, radio } from '../tema';
import { CUENTA_DE_AFORO, LETRA, SALA } from './muebles';

const FILO = 1;

// ---------------------------------------------------------------------------
// La pantalla
// ---------------------------------------------------------------------------

/**
 * ═══ EL MARCO DE UNA PANTALLA DE PARTIDA, Y POR QUÉ SE PUEDE DESPLAZAR ═══
 *
 * Las cuatro pantallas de dentro de partida se escribieron con la misma forma: un
 * `View` con `flex: 1` y `justifyContent: 'center'`, que centra muy bien y recorta
 * por los dos extremos en cuanto el contenido pasa del alto de la pantalla. Y el
 * contenido pasa:
 *
 *   · La Frente termina una ronda enseñando las palabras jugadas, y esa lista
 *     crece con lo bien que hayas jugado. Cuanto mejor sea la partida, más
 *     probable es que «Otra ronda» quede por debajo del borde.
 *   · El vestíbulo del tablero tiene DOS campos de texto y ningún
 *     `KeyboardAvoidingView`: al abrirse el teclado quedan unos 340 píxeles útiles
 *     contra 553 de contenido, así que el botón de entrar se va debajo del
 *     teclado sin manera de subirlo.
 *   · Y con la ampliación de letra del sistema al 130 % —que no es un caso raro,
 *     es una opción de accesibilidad de las dos plataformas— «Antes» de La Frente
 *     pasa de 608 a 750 píxeles contra 647 útiles en un iPhone SE. El botón de
 *     EMPEZAR es lo primero que se cae, o sea que el juego no arranca.
 *
 * LA RECETA ES `flexGrow: 1` MÁS `justifyContent: 'center'` EN EL CONTENEDOR DE
 * CONTENIDO, y es lo que hace que no haya que elegir: mientras el contenido quepa,
 * se queda centrado exactamente igual que antes; cuando no quepa, se desplaza. Un
 * `ScrollView` con `justifyContent` en el estilo del propio ScrollView no hace eso
 * —ahí el centrado no se aplica— y es el error fácil.
 *
 * `keyboardShouldPersistTaps="handled"` porque si no, con el teclado abierto el
 * primer toque en un botón sólo lo cierra y hay que tocar dos veces; en un juego
 * eso se lee como que el botón no funciona.
 */
export function Pantalla({
  children,
  hueco = espacio.lg,
  ancho,
  estilo,
}: {
  children: ReactNode;
  /** El relleno de la pantalla. Por defecto los 20 de la casa. */
  hueco?: number;
  /** El ancho máximo de la columna de contenido, si lo hay. */
  ancho?: number;
  estilo?: StyleProp<ViewStyle>;
}): JSX.Element {
  return (
    <KeyboardAvoidingView
      style={estilos.pantalla}
      /*
       * En iOS el teclado se superpone y hay que empujar; en Android el sistema
       * ya redimensiona la ventana por defecto (`adjustResize`), y añadir aquí un
       * `behavior` lo empuja dos veces y deja un hueco muerto encima del teclado.
       */
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={estilos.pantalla}
        contentContainerStyle={[estilos.dentro, { padding: hueco }, estilo]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[estilos.columna, ancho !== undefined && { maxWidth: ancho }]}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// El raíl de aforo
// ---------------------------------------------------------------------------

/**
 * ═══ EL HUECO SE ENCOGE, EL NÚMERO DE MUESCAS NO ═══
 *
 * Un arcade de fuera puede declarar el aforo que quiera, y con el hueco fijo un
 * aforo de veinte se saldría de la tarjeta por la derecha. Recortar muescas
 * estaba descartado: el raíl dejaría de contar, que es lo único que hace. Así que
 * lo que cede es la separación, y el raíl nunca pasa del largo del más largo.
 *
 * Por encima de cuarenta no se dibuja nada. Cuarenta rayas no se cuentan de un
 * vistazo —dejan de ser una cuenta y pasan a ser una textura— y el aforo exacto
 * está escrito con todas las letras en el pie de la tarjeta.
 */
const TOPE_DEL_RAIL = 12;
const MAS_MUESCAS_DE_LAS_QUE_SE_CUENTAN = 40;

function huecoDelRail(muescas: number): number {
  if (muescas <= 1) return 0;
  const { grosor, hueco } = CUENTA_DE_AFORO;
  const largoDelMasLargo = TOPE_DEL_RAIL * grosor + (TOPE_DEL_RAIL - 1) * hueco;
  if (muescas <= TOPE_DEL_RAIL) return hueco;
  return Math.max(2, (largoDelMasLargo - muescas * grosor) / (muescas - 1));
}

/**
 * LA FIRMA DE LA SALA: tantas muescas como personas admite la máquina, encendidas
 * las que hacen falta para empezar.
 *
 * La Frente son doce con dos —el raíl más largo—, La Ronda cuatro y las cuatro
 * porque sólo se juega llena, El Arcade y La Peonza una sola. Puestas en fila, las
 * cinco se distinguen por la longitud antes de leer una palabra: es ornamento que
 * informa, que es el único que sobrevive a que alguien añada un juego.
 *
 * ═══ LA TINTA ES BLANCA EN LOS TRES SITIOS DONDE VIVE ═══
 *
 * Estuvo en `SALA.acento` cuando el raíl flotaba sobre el suelo negro, y en tinta
 * oscura la tarde que se metió en una portada ancha. Es blanca porque es lo único
 * que vale en los tres fondos donde este raíl aparece —el suelo de la Sala, la
 * portada de la tarjeta con su velo, y la espera de El Arcade—, y porque sobre una
 * FOTO, el día que la portada la lleve, el velo garantiza el fondo y lo que se lee
 * encima del velo es lo blanco.
 *
 * ═══ Y LA APAGADA VA AL 70 %, QUE ES LA CORRECCIÓN QUE MÁS COSTÓ VER ═══
 *
 * Estuvo al 34 % en la portada y en `SALA.filoVivo` —blanco al 14 %— en las otras
 * dos copias. Al 34 % la apagada se separa de su fondo por 1,80 en ámbar y en
 * verde; al 14 %, por 1,5 sobre el suelo. O sea: desaparece.
 *
 * Y desaparecer no es «se ve menos». LAS APAGADAS SON LAS QUE DIBUJAN EL LARGO, y
 * el largo es lo único que hace que esto informe. Con las diez apagadas de La
 * Frente invisibles, La Frente (2 de 12) y Riberas (2 de 6) se leen las dos como
 * un raíl de dos, iguales entre sí y MÁS CORTAS que La Ronda, que enseña cuatro.
 * El raíl no informaría menos: ordenaría las máquinas al revés.
 *
 * Al 70 % da entre 3,13 y 4,32 en los cuatro temas. Y no se pierde la distinción
 * encendida / apagada, porque ésa nunca la llevó el alfa: la llevan los 15 píxeles
 * de alto contra los 7 de `CUENTA_DE_AFORO`.
 */
export function RailDeAforo({
  aforo,
  viva = true,
  estilo,
}: {
  aforo: { minimo: number; maximo: number } | null;
  /** Una máquina que no se puede jugar aquí no enciende el raíl del todo. */
  viva?: boolean;
  estilo?: StyleProp<ViewStyle>;
}): JSX.Element | null {
  if (aforo === null || aforo.maximo > MAS_MUESCAS_DE_LAS_QUE_SE_CUENTAN) return null;
  const hueco = huecoDelRail(aforo.maximo);
  const encendidas = Math.min(aforo.minimo, aforo.maximo);
  return (
    <View
      style={[estilos.rail, { gap: hueco }, estilo]}
      accessibilityRole="image"
      /*
       * «UNA PERSONA» Y NO «DE 1 A 1 JUGADORES». La fórmula genérica sale mal en
       * las dos máquinas de un solo jugador —El Arcade y La Peonza—, que son dos de
       * las cinco: un lector de pantalla leía «aforo: de uno a uno jugadores».
       * Es la misma frase que la tarjeta compone en su pie, y aquí es la ÚNICA
       * versión que se oye, porque en las pantallas de dentro no hay pie.
       */
      accessibilityLabel={
        aforo.minimo === aforo.maximo
          ? `Aforo: ${aforo.maximo} ${aforo.maximo === 1 ? 'persona' : 'personas'}`
          : `Aforo: de ${aforo.minimo} a ${aforo.maximo} personas`
      }
    >
      {Array.from({ length: aforo.maximo }, (_, i) => (
        <View
          key={i}
          style={[
            MUESCA.base,
            i < encendidas ? MUESCA.alta : MUESCA.baja,
            viva
              ? i < encendidas
                ? MUESCA.viva
                : MUESCA.fria
              : i < encendidas
                ? MUESCA.muertaViva
                : MUESCA.muertaFria,
          ]}
        />
      ))}
    </View>
  );
}

/**
 * ═══ LA GRAMÁTICA DE UNA MUESCA, SUELTA Y EXPORTADA ═══
 *
 * El raíl de aforo no es el único instrumento de muescas de esta Sala: La Peonza
 * pinta con ellas un MEDIDOR DE GIRO —diez muescas, una por cada diez por ciento
 * de giro restante— y hace bien en no usar `RailDeAforo`, porque aquello se
 * anuncia como «aforo de N a M personas» y esto es un `progressbar` con valor
 * vivo. Pasarle el giro haría que un lector de pantalla dijera que esta peonza
 * admite de tres a diez jugadores.
 *
 * Pero son el MISMO objeto físico, y si cada uno declara sus tres colores, vuelve
 * exactamente el fallo que `piezas.tsx` existe para cerrar: la corrección de la
 * muesca apagada —del 34 % al 70 %, porque al 34 se separa de su fondo por 1,80:1
 * en ámbar— tendría otra vez dos sitios adonde llegar.
 *
 * Así que la forma se exporta y el instrumento se queda en quien lo pinta. El
 * `HUECO` va aquí también para que nadie tenga que importar `CUENTA_DE_AFORO`:
 * quien nombra esa tabla está dibujando un raíl de aforo, y sólo hay uno.
 */
export const HUECO_DE_MUESCAS = CUENTA_DE_AFORO.hueco;
export const ALTO_DE_MUESCAS = CUENTA_DE_AFORO.altoEncendida;

export const MUESCA = StyleSheet.create({
  /*
   * RADIO 1 Y NO 2. Con 2, una muesca apagada —3 de ancho por 7 de alto— sale
   * redondeada hasta parecer un punto, y el raíl deja de leerse como una cuenta de
   * rayas para leerse como una fila de lunares. La encendida, que mide 15, no lo
   * notaba; la apagada lo era casi entera.
   */
  base: { width: CUENTA_DE_AFORO.grosor, borderRadius: 1 },
  /* La diferencia entre encendida y apagada la lleva el ALTO, nunca el alfa. */
  alta: { height: CUENTA_DE_AFORO.altoEncendida },
  baja: { height: CUENTA_DE_AFORO.altoApagada },
  viva: { backgroundColor: SALA.blanco },
  fria: { backgroundColor: conAlfa(SALA.blanco, 0.7) },
  muertaViva: { backgroundColor: conAlfa(SALA.blanco, 0.5) },
  muertaFria: { backgroundColor: conAlfa(SALA.blanco, 0.4) },
});

// ---------------------------------------------------------------------------
// La pastilla de estado
// ---------------------------------------------------------------------------

/**
 * LA PASTILLA DE ESTADO: el «DISPONIBLE» de la tarjeta de velada, aquí.
 *
 * VA SOBRE UN PLATO OSCURO, que es lo que la de velada no necesita: allí el campo
 * es oscuro y el acento hace de tinta; aquí la pastilla vive en la parte ALTA de
 * una portada de acento, donde el degradado todavía es el acento VIVO, y el blanco
 * sobre ese extremo da 3,66:1 en violeta y 1,98:1 en ámbar. Sobre el plato
 * —`SALA.suelo` al 78 %— da entre 12,8 y 14,5 en los cuatro temas, y el propio
 * plato se recorta del fondo con 3,14 en el peor, así que no flota.
 *
 * El 78 y no el 72: al 72 el recorte se quedaba en 3,01 sobre el violeta, o sea
 * que pasaba el mínimo de 3,0 por una centésima.
 *
 * El PILOTO va dentro y no a cuatro renglones de distancia: lleno si se juega aquí
 * y ahora, aro frío si hay que pedir mesa.
 */
export function PastillaDeEstado({
  texto,
  encendido,
}: {
  texto: string;
  encendido: boolean;
}): JSX.Element {
  return (
    <View style={estilos.pastilla} accessible accessibilityLabel={texto}>
      <View style={[estilos.piloto, encendido ? estilos.pilotoVivo : estilos.pilotoFrio]} />
      <Text style={estilos.pastillaTexto} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Las capas de una portada
// ---------------------------------------------------------------------------

/**
 * LA LUZ DE LA ESQUINA: lo que separa un color plano de un lugar.
 *
 * Está copiada de la tarjeta de velada del carrusel —mismo centro, mismo radio— y
 * es la mitad de la razón por la que aquella portada se lee como una portada. Un
 * campo de acento sin gradiente radial es una mancha.
 *
 * El `id` lleva el del juego porque varios degradados con el mismo identificador
 * en el mismo documento son UN degradado: en la web, todas las tarjetas se
 * quedarían con la luz de la primera.
 */
export function LuzDeEsquina({ id }: { id: string }): JSX.Element {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id={`luz-arcade-${id}`} cx="22%" cy="12%" r="72%">
          <Stop offset="0%" stopColor={SALA.blanco} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={SALA.blanco} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#luz-arcade-${id})`} />
    </Svg>
  );
}

/**
 * ═══ EL VELO: LA CAPA QUE HACE LEGIBLE LO QUE HAYA DEBAJO ═══
 *
 * Un degradado de nada a `SALA.suelo` al 38 %, que empieza en el 26 % de la
 * portada y llega a pleno en el 72 %. Debajo del raíl, del nombre y del gancho.
 *
 * NO ES DECORACIÓN Y NO ES OPCIONAL. Sin él, el blanco sobre el extremo hondo del
 * degradado da 4,64:1 en ámbar y en verde: pasa el mínimo de 4,5 por catorce
 * centésimas, y cualquier cosa que lo roce —un `opacity` en un contenedor, una
 * animación de entrada, un modo de ahorro que atenúe la pantalla— lo rompe sin que
 * ninguna comprobación se entere. Con el velo, ese mismo peor caso sube a 5,61.
 *
 * Y ES LA PIEZA QUE DEJA UNA PORTADA PREPARADA PARA LA FOTO. El día que aquí entre
 * una imagen del juego, todos los números medidos contra el degradado dejan de
 * valer —una foto es un fondo arbitrario y ninguna comprobación automática lo va a
 * coger, porque el color deja de estar en la tabla—. Lo único que sigue valiendo
 * es esto: el velo se sube a 0,82 y el blanco vuelve a dar 11,20:1 incluso sobre
 * una foto de nieve. La estructura ya está; ese día se cambia un número.
 */
export const VELO_DE_LA_PORTADA = 0.38;

export function VeloDeLaPortada(): JSX.Element {
  return (
    <LinearGradient
      colors={[conAlfa(SALA.suelo, 0), conAlfa(SALA.suelo, VELO_DE_LA_PORTADA)]}
      locations={[0.26, 0.72]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

// ---------------------------------------------------------------------------

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: SALA.suelo },
  /* `flexGrow` y no `flex`: es lo que centra mientras quepa y desplaza cuando no. */
  dentro: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  columna: { width: '100%' },

  rail: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CUENTA_DE_AFORO.altoEncendida,
  },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 172,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radio.redondo,
    borderWidth: FILO,
    borderColor: conAlfa(SALA.blanco, 0.22),
    backgroundColor: conAlfa(SALA.suelo, 0.78),
  },
  /* 13 es el mínimo de texto de esta casa, y una cápsula no es una excepción. */
  pastillaTexto: { ...LETRA.rotuloChico, fontSize: 13, color: SALA.blanco, flexShrink: 1 },
  piloto: { width: 6, height: 6, borderRadius: 3 },
  pilotoVivo: { backgroundColor: SALA.acento },
  pilotoFrio: { borderWidth: FILO, borderColor: conAlfa(SALA.blanco, 0.55) },
});
