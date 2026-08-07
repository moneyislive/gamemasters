/**
 * El consejero: un mayordomo al que preguntar cuando estás perdido.
 *
 * Solo sabe lo que tú sabes —recibe la misma proyección que tu móvil—, así que
 * puedes insistir todo lo que quieras: no puede contarte quién fue porque no lo
 * sabe. Está para las reglas, para tu propio personaje y para ordenar lo que ya
 * has visto.
 */
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as api from '../src/api';
import {
  Boton,
  Cuerpo,
  Error as AvisoError,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Sello,
  Titulo,
  color,
  espacio,
  radio,
  texto,
} from '../src/ui';

interface Turno {
  mio: boolean;
  texto: string;
}

const SUGERENCIAS = [
  '¿Cómo se juega exactamente?',
  '¿Quién soy y qué escondo?',
  '¿Con quién me conviene hablar?',
  'Repásame lo que sabemos',
];

export default function Consejero(): JSX.Element {
  const [turnos, setTurnos] = useState<Turno[]>([
    {
      mio: false,
      texto:
        'Usted dirá. Le advierto de antemano: sé lo mismo que usted y ni una palabra más, así que no me pregunte quién fue.',
    },
  ]);
  const [pregunta, setPregunta] = useState('');
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  const enviar = async (texto_: string): Promise<void> => {
    const limpia = texto_.trim();
    if (!limpia || pensando) return;
    setPregunta('');
    setError(null);
    setTurnos((t) => [...t, { mio: true, texto: limpia }]);
    setPensando(true);
    try {
      const r = await api.preguntarAlConsejero(limpia);
      setTurnos((t) => [...t, { mio: false, texto: r.respuesta }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'El consejero no responde.');
    } finally {
      setPensando(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pantalla scroll={false} barra={false}>
        <View style={{ alignItems: 'center', marginBottom: espacio.md }}>
          <Sello>El consejero</Sello>
        </View>

        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: espacio.lg }}
        >
          {turnos.map((t, i) => (
            <Animated.View key={i} entering={FadeInUp.duration(320)}>
              <View style={[estilos.burbuja, t.mio ? estilos.mia : estilos.suya]}>
                {!t.mio && <Etiqueta style={{ marginBottom: 4 }}>Mayordomo</Etiqueta>}
                <Cuerpo style={{ fontSize: 17 }}>{t.texto}</Cuerpo>
              </View>
            </Animated.View>
          ))}
          {pensando && (
            <View style={[estilos.burbuja, estilos.suya]}>
              <Cuerpo tenue style={{ fontStyle: 'italic' }}>Consultando sus notas…</Cuerpo>
            </View>
          )}
        </ScrollView>

        <AvisoError>{error}</AvisoError>

        {turnos.length <= 1 && (
          <View style={estilos.sugerencias}>
            {SUGERENCIAS.map((s) => (
              <Boton key={s} onPress={() => void enviar(s)} style={estilos.sugerencia}>
                {s}
              </Boton>
            ))}
          </View>
        )}

        <View style={estilos.barra}>
          <TextInput
            value={pregunta}
            onChangeText={setPregunta}
            placeholder="Pregunte lo que quiera…"
            placeholderTextColor="rgba(217,201,163,0.35)"
            style={estilos.campo}
            multiline
            onSubmitEditing={() => void enviar(pregunta)}
          />
          <Boton
            variante="primario"
            onPress={() => void enviar(pregunta)}
            disabled={!pregunta.trim()}
            cargando={pensando}
            style={{ paddingHorizontal: espacio.lg }}
          >
            Enviar
          </Boton>
        </View>

        <Ornamento style={{ marginVertical: espacio.sm }} />
        <Boton onPress={() => router.back()}>Volver a la partida</Boton>
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  burbuja: {
    borderWidth: 1,
    borderRadius: radio.lg,
    padding: espacio.md,
    marginBottom: espacio.sm,
    maxWidth: '92%',
  },
  suya: {
    alignSelf: 'flex-start',
    borderColor: 'rgba(201,162,39,0.32)',
    backgroundColor: 'rgba(31,18,12,0.6)',
  },
  mia: {
    alignSelf: 'flex-end',
    borderColor: 'rgba(201,162,39,0.5)',
    backgroundColor: 'rgba(201,162,39,0.12)',
  },
  sugerencias: { gap: espacio.sm, marginBottom: espacio.sm },
  sugerencia: { paddingVertical: 11 },
  barra: { flexDirection: 'row', gap: espacio.sm, alignItems: 'flex-end' },
  campo: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.4)',
    borderRadius: radio.md,
    backgroundColor: 'rgba(11,23,16,0.6)',
    color: color.pergamino,
    paddingVertical: 12,
    paddingHorizontal: espacio.md,
    maxHeight: 120,
    ...texto.cuerpo,
  },
});
