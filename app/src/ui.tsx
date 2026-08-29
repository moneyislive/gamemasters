/**
 * Piezas visuales comunes.
 *
 * Réplica en React Native de los patrones de `client/src/styles/theme.css`:
 * el marco art-decó, el sello, el botón de latón y el divisor con ornamento.
 * Aquí vive todo lo decorativo para que las pantallas se lean como guiones y no
 * como hojas de estilo.
 *
 * DE DÓNDE SALEN LOS COLORES, DESDE QUE HAY DOS JUEGOS. De `useTema()`, que
 * mira a qué se está jugando en esta partida (ver `tema-juego.ts`). Antes salían
 * de la constante `color`, y no podía seguir así: la app es un binario que sirve
 * para CLUEDO y para la Momia, y cuál de los dos toca no se sabe hasta que el
 * servidor manda la vista.
 *
 * CLUEDO NO CAMBIA NI UN PÍXEL, y no por cuidado sino por construcción, en dos
 * pasos. Uno: `useTema()` devuelve el MISMO objeto `color` de siempre para
 * CLUEDO y para cualquier pantalla sin partida. Dos: los `rgba(...)` que había
 * escritos a mano aquí resultaron ser todos un token con alfa —201,162,39 es
 * `oro500`, 31,18,12 es `caoba900`, 179,64,47 es `peligro`— y `conAlfa` los
 * reconstruye carácter a carácter.
 *
 * LO QUE HAY QUE SABER SI SE TOCA ESTE FICHERO: un color no puede volver a un
 * `StyleSheet.create` de módulo. Eso se evalúa UNA vez al importar, o sea antes
 * de que exista partida, y volvería a congelar el tema de CLUEDO para todo el
 * mundo. Los estilos de aquí abajo llevan a propósito solo lo que no es color
 * —medidas, bordes, disposición— y el color se pone en línea.
 */
import { forwardRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ALTO_BARRA_TOTAL,
  color,
  espacio,
  fondoMesa,
  fuente,
  radio,
  sombra,
  texto,
} from './tema';
import { conAlfa, useFondo, useOrnamento, useTema } from './tema-juego';

// ---------------------------------------------------------------------------
// Contenedores
// ---------------------------------------------------------------------------

export function Pantalla({
  children,
  scroll = true,
  padding = true,
  pie = true,
  barra = true,
  reserva = 0,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padding?: boolean;
  /** El cierre ornamental del final. Se quita en pantallas de altura fija. */
  pie?: boolean;
  /** ¿Hay barra de pestañas flotando debajo? Los modales no la tienen. */
  barra?: boolean;
  /**
   * Alto de lo que la pantalla ancle POR ENCIMA de la barra de pestañas.
   *
   * Existe por la barra de acusar de la ronda. Lo anclado no participa del
   * scroll, así que no lo empuja: se queda quieto tapando lo último de la
   * lista. Y el síntoma es de los que no se investigan solos —la última sala
   * simplemente no se puede pulsar, y parece un fallo del botón, no del hueco.
   */
  reserva?: number;
}): JSX.Element {
  const insets = useSafeAreaInsets();
  const fondo = useFondo();
  // La barra de pestañas flota sobre el contenido, así que hay que reservarle
  // su alto MÁS el margen inferior del dispositivo. Sin esto, en pantallas
  // cortas lo último del scroll queda debajo de la barra y no hay forma de
  // llegar a ello. `ALTO_BARRA_TOTAL` incluye el saliente del botón central,
  // que es la parte que más arriba llega.
  const hueco = (barra ? ALTO_BARRA_TOTAL : 0) + insets.bottom + espacio.lg + reserva;

  const contenido = (
    <View style={[padding && { paddingHorizontal: espacio.lg }]}>
      {children}
      {scroll && pie && <PieDePagina />}
    </View>
  );

  return (
    <LinearGradient colors={fondo} style={estilos.fondo}>
      <SafeAreaView style={estilos.seguro} edges={['top']}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            // `flexGrow` para que una pantalla CORTA siga llenando el alto. Sin
            // esto, el fondo de fieltro se corta donde acaba el contenido y
            // debajo queda un rectángulo negro: se nota en cuanto una pantalla
            // cabe entera sin desplazar, que es justo el caso de la portada.
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: espacio.md,
              paddingBottom: hueco,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {contenido}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingBottom: hueco }}>{contenido}</View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

/**
 * Cierre de página.
 *
 * Cumple dos funciones: rematar la pantalla con la marca de la casa, y —más
 * práctico— dejar claro que ahí se acaba el contenido. Sin un final visible,
 * en una pantalla larga nunca sabes si te queda algo por leer.
 */
export function PieDePagina(): JSX.Element {
  const t = useTema();
  return (
    <View style={estilos.pie}>
      <View style={[estilos.pieRegla, { backgroundColor: conAlfa(t.oro500, 0.4) }]} />
      <View style={estilos.pieRosa}>
        <Text style={{ color: t.oro500, fontSize: 11 }}>✦</Text>
        <Text style={[estilos.pieMarca, { color: conAlfa(t.oro500, 0.75) }]}>GameMasters</Text>
        <Text style={{ color: t.oro500, fontSize: 11 }}>✦</Text>
      </View>
      <Text style={[estilos.pieLema, { color: conAlfa(t.pergaminoTenue, 0.45) }]}>
        Juegos reales, misterios de verdad
      </Text>
    </View>
  );
}

/** El marco de latón: la caja que sostiene casi todo en esta estética. */
export function Marco({
  children,
  style,
  tono = 'oscuro',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tono?: 'oscuro' | 'papel' | 'peligro';
}): JSX.Element {
  const t = useTema();
  const paleta =
    tono === 'papel'
      ? { fondo: t.pergamino, borde: t.oro500 }
      : tono === 'peligro'
        ? { fondo: conAlfa(t.burdeos700, 0.24), borde: t.burdeos600 }
        : { fondo: conAlfa(t.caoba900, 0.72), borde: conAlfa(t.oro500, 0.35) };
  return (
    <View
      style={[
        estilos.marco,
        { backgroundColor: paleta.fondo, borderColor: paleta.borde },
        sombra,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tipografía
// ---------------------------------------------------------------------------

export function Titulo({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}): JSX.Element {
  const t = useTema();
  return <Text style={[texto.tituloGrande, { color: t.oro300 }, style]}>{children}</Text>;
}

export function Seccion({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}): JSX.Element {
  const t = useTema();
  return (
    <Text style={[texto.titulo, { color: t.oro300, marginBottom: espacio.sm }, style]}>
      {children}
    </Text>
  );
}

export function Etiqueta({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}): JSX.Element {
  const t = useTema();
  return (
    <Text
      style={[texto.microCaps, { color: t.laton, textTransform: 'uppercase' }, style]}
    >
      {children}
    </Text>
  );
}

export function Cuerpo({
  children,
  style,
  tenue,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  tenue?: boolean;
}): JSX.Element {
  const t = useTema();
  return (
    <Text style={[texto.cuerpo, { color: tenue ? t.pergaminoTenue : t.pergamino }, style]}>
      {children}
    </Text>
  );
}

/** Texto sobre papel: para los bloques que imitan un dosier impreso. */
export function CuerpoPapel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}): JSX.Element {
  const t = useTema();
  return <Text style={[texto.cuerpo, { color: t.caoba700 }, style]}>{children}</Text>;
}

export function Sello({ children }: { children: React.ReactNode }): JSX.Element {
  const t = useTema();
  return (
    <View style={[estilos.sello, { borderColor: conAlfa(t.oro500, 0.6) }]}>
      <Text style={[texto.microCaps, { color: t.oro300 }]}>{children}</Text>
    </View>
  );
}

/**
 * El divisor con su ornamento en medio.
 *
 * El glifo del centro es del JUEGO, no de la casa: en CLUEDO es el corazón
 * tipográfico de un salón art-decó y en la Momia un anj, que es lo que se pinta
 * entre dos franjas en una pared egipcia. Es un detalle diminuto y de los que
 * más trabajan: sale seis o siete veces por pantalla, así que cambiarlo tiñe
 * toda la lectura sin ocupar sitio.
 */
export function Ornamento({ style }: { style?: StyleProp<ViewStyle> }): JSX.Element {
  const t = useTema();
  /*
   * EL SIGNO SALE DE UNA TABLA Y YA NO DE UN TERNARIO. Con dos juegos, `momia ?
   * '☥' : '❦'` funcionaba; con el tercero habría hecho falta anidar otro, y ese
   * es exactamente el sitio donde un juego nuevo se olvida y hereda el signo de
   * la mansión sin que nada dé error. CLUEDO sigue recibiendo '❦' porque es el
   * respaldo de la tabla.
   */
  const signo = useOrnamento();
  const linea = { backgroundColor: conAlfa(t.oro500, 0.35) };
  return (
    <View style={[estilos.ornamento, style]}>
      <View style={[estilos.ornamentoLinea, linea]} />
      <Text style={{ color: t.oro500, fontSize: 13, marginHorizontal: espacio.sm }}>{signo}</Text>
      <View style={[estilos.ornamentoLinea, linea]} />
    </View>
  );
}

/**
 * Un bloque que se abre y se cierra.
 *
 * Existe por un problema muy concreto de esta app: hay textos que hay que tener
 * A MANO toda la velada y que solo se leen enteros una vez. Las doce reglas del
 * juego son el caso de manual —se leen al empezar, y a partir de ahí lo que se
 * busca es una sola—, y la trama igual. Ponerlos desplegados empuja al fondo del
 * scroll lo que de verdad se usa cada ronda; esconderlos en otra pestaña los
 * convierte en algo que nadie vuelve a encontrar.
 *
 * Plegado y con su rótulo a la vista, ocupan un renglón y siguen estando.
 */
export function Plegable({
  etiqueta,
  resumen,
  abierto: abiertoAlEmpezar = false,
  children,
}: {
  etiqueta: string;
  resumen?: string;
  abierto?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  const t = useTema();
  const [abierto, setAbierto] = useState(abiertoAlEmpezar);
  return (
    <View style={{ marginBottom: espacio.sm }}>
      <Pressable
        onPress={() => setAbierto((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        style={({ pressed }) => [
          estilos.plegable,
          {
            borderColor: conAlfa(t.oro500, 0.35),
            backgroundColor: conAlfa(t.caoba900, 0.72),
          },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[texto.microCaps, { color: t.laton, textTransform: 'uppercase' }]}>
            {etiqueta}
          </Text>
          {resumen ? (
            <Text
              numberOfLines={abierto ? undefined : 1}
              style={[texto.cuerpo, { color: t.pergaminoTenue, fontSize: 15, marginTop: 2 }]}
            >
              {resumen}
            </Text>
          ) : null}
        </View>
        <Text style={{ color: t.oro300, fontSize: 20, marginLeft: espacio.md }}>
          {abierto ? '−' : '+'}
        </Text>
      </Pressable>
      {abierto ? <View style={{ marginTop: espacio.sm }}>{children}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Interacción
// ---------------------------------------------------------------------------

export const Boton = forwardRef<View, {
  children: React.ReactNode;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'peligro';
  disabled?: boolean;
  cargando?: boolean;
  style?: StyleProp<ViewStyle>;
}>(function Boton(
  { children, onPress, variante = 'secundario', disabled, cargando, style },
  ref,
) {
  const t = useTema();
  const inactivo = disabled || cargando;
  return (
    <Pressable
      ref={ref}
      disabled={inactivo}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        estilos.boton,
        { borderColor: conAlfa(t.oro500, 0.55), backgroundColor: conAlfa(t.oro500, 0.08) },
        variante === 'primario' && { backgroundColor: t.oro400, borderColor: t.oro300 },
        variante === 'peligro' && {
          backgroundColor: conAlfa(t.burdeos600, 0.28),
          borderColor: t.burdeos600,
        },
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 },
        inactivo && { opacity: 0.45 },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={variante === 'primario' ? t.caoba900 : t.oro300} />
      ) : (
        <Text
          style={[
            texto.etiqueta,
            {
              color: variante === 'primario' ? t.caoba900 : t.oro300,
              textTransform: 'uppercase',
            },
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
});

/** Aviso de error discreto pero visible. */
export function Error({ children }: { children: React.ReactNode }): JSX.Element | null {
  const t = useTema();
  /*
   * El `return` temprano va DESPUÉS del hook a propósito: al revés, una pantalla
   * que pasa de tener error a no tenerlo cambiaría el número de hooks entre dos
   * renderizados y React la tira entera. Es el fallo clásico de este componente,
   * que existe justo para aparecer y desaparecer.
   */
  if (!children) return null;
  return (
    <View
      style={[
        estilos.error,
        { borderColor: conAlfa(t.peligro, 0.6), backgroundColor: conAlfa(t.peligro, 0.15) },
      ]}
    >
      <Text style={[texto.cuerpo, { color: '#f0c9c0', fontSize: 16 }]}>{children}</Text>
    </View>
  );
}

export function Cargando({ texto: t = 'Un momento…' }: { texto?: string }): JSX.Element {
  const tema = useTema();
  return (
    <View style={{ alignItems: 'center', paddingVertical: espacio.xxl }}>
      <ActivityIndicator color={tema.oro400} size="large" />
      <Cuerpo tenue style={{ marginTop: espacio.md }}>
        {t}
      </Cuerpo>
    </View>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1 },
  seguro: { flex: 1 },
  marco: {
    borderWidth: 1,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginBottom: espacio.md,
  },
  sello: {
    // Todas las cabeceras que lo usan están centradas; con `flex-start` el
    // sello se quedaba pegado a la izquierda bajo un título centrado.
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radio.redondo,
    paddingHorizontal: espacio.md,
    paddingVertical: 5,
  },
  ornamento: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: espacio.lg,
  },
  plegable: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
  },
  ornamentoLinea: {
    flex: 1,
    height: 1,
  },
  boton: {
    borderWidth: 1,
    borderRadius: radio.md,
    paddingVertical: 15,
    paddingHorizontal: espacio.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pie: {
    alignItems: 'center',
    marginTop: espacio.xxl,
    paddingTop: espacio.lg,
  },
  pieRegla: {
    width: 92,
    height: 1,
    marginBottom: espacio.md,
  },
  pieRosa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
  },
  pieMarca: {
    fontFamily: fuente.titulo,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  pieLema: {
    fontFamily: fuente.cuerpo,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
  },
  error: {
    borderWidth: 1,
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
});

export { fuente, texto, color, espacio, radio };
