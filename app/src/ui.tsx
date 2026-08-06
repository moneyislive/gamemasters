/**
 * Piezas visuales comunes.
 *
 * Réplica en React Native de los patrones de `client/src/styles/theme.css`:
 * el marco art-decó, el sello, el botón de latón y el divisor con ornamento.
 * Aquí vive todo lo decorativo para que las pantallas se lean como guiones y no
 * como hojas de estilo.
 */
import { forwardRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, espacio, fondoMesa, fuente, radio, sombra, texto } from './tema';

// ---------------------------------------------------------------------------
// Contenedores
// ---------------------------------------------------------------------------

export function Pantalla({
  children,
  scroll = true,
  padding = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padding?: boolean;
}): JSX.Element {
  const contenido = (
    <View style={[padding && { paddingHorizontal: espacio.lg, paddingBottom: espacio.xxl }]}>
      {children}
    </View>
  );
  return (
    <LinearGradient colors={fondoMesa} style={estilos.fondo}>
      <SafeAreaView style={estilos.seguro} edges={['top']}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: espacio.md }}
            keyboardShouldPersistTaps="handled"
          >
            {contenido}
          </ScrollView>
        ) : (
          contenido
        )}
      </SafeAreaView>
    </LinearGradient>
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
  const paleta =
    tono === 'papel'
      ? { fondo: color.pergamino, borde: color.oro500 }
      : tono === 'peligro'
        ? { fondo: 'rgba(109,26,42,0.24)', borde: color.burdeos600 }
        : { fondo: 'rgba(31,18,12,0.72)', borde: 'rgba(201,162,39,0.35)' };
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
  return <Text style={[texto.tituloGrande, { color: color.oro300 }, style]}>{children}</Text>;
}

export function Seccion({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}): JSX.Element {
  return (
    <Text style={[texto.titulo, { color: color.oro300, marginBottom: espacio.sm }, style]}>
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
  return (
    <Text
      style={[texto.microCaps, { color: color.laton, textTransform: 'uppercase' }, style]}
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
  return (
    <Text style={[texto.cuerpo, { color: tenue ? color.pergaminoTenue : color.pergamino }, style]}>
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
  return <Text style={[texto.cuerpo, { color: color.caoba700 }, style]}>{children}</Text>;
}

export function Sello({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <View style={estilos.sello}>
      <Text style={[texto.microCaps, { color: color.oro300 }]}>{children}</Text>
    </View>
  );
}

export function Ornamento({ style }: { style?: StyleProp<ViewStyle> }): JSX.Element {
  return (
    <View style={[estilos.ornamento, style]}>
      <View style={estilos.ornamentoLinea} />
      <Text style={{ color: color.oro500, fontSize: 13, marginHorizontal: espacio.sm }}>❦</Text>
      <View style={estilos.ornamentoLinea} />
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
        variante === 'primario' && estilos.botonPrimario,
        variante === 'peligro' && estilos.botonPeligro,
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 },
        inactivo && { opacity: 0.45 },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={variante === 'primario' ? color.caoba900 : color.oro300} />
      ) : (
        <Text
          style={[
            texto.etiqueta,
            {
              color: variante === 'primario' ? color.caoba900 : color.oro300,
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
  if (!children) return null;
  return (
    <View style={estilos.error}>
      <Text style={[texto.cuerpo, { color: '#f0c9c0', fontSize: 16 }]}>{children}</Text>
    </View>
  );
}

export function Cargando({ texto: t = 'Un momento…' }: { texto?: string }): JSX.Element {
  return (
    <View style={{ alignItems: 'center', paddingVertical: espacio.xxl }}>
      <ActivityIndicator color={color.oro400} size="large" />
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
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.6)',
    borderRadius: radio.redondo,
    paddingHorizontal: espacio.md,
    paddingVertical: 5,
  },
  ornamento: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: espacio.lg,
  },
  ornamentoLinea: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(201,162,39,0.35)',
  },
  boton: {
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.55)',
    borderRadius: radio.md,
    paddingVertical: 15,
    paddingHorizontal: espacio.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,162,39,0.08)',
  },
  botonPrimario: {
    backgroundColor: color.oro400,
    borderColor: color.oro300,
  },
  botonPeligro: {
    backgroundColor: 'rgba(140,35,55,0.28)',
    borderColor: color.burdeos600,
  },
  error: {
    borderWidth: 1,
    borderColor: 'rgba(179,64,47,0.6)',
    backgroundColor: 'rgba(179,64,47,0.15)',
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
});

export { fuente, texto, color, espacio, radio };
