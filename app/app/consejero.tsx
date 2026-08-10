/**
 * El Mayordomo: el asistente con IA al que preguntar cuando estás perdido.
 *
 * Sabe bastante MENOS que tú. El servidor le arma un contexto del que quedan
 * fuera las pistas, el tablón, la cronología y los giros —los tuyos incluidos—,
 * así que puedes insistir todo lo que quieras: no puede contarte quién fue
 * porque nadie se lo ha contado. Está para las reglas y para tu papel.
 *
 * Lo comprueba `server/scripts/verificar-mayordomo.ts`.
 */
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
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
  '¿Cómo interpreto a mi personaje?',
  '¿Qué puedo preguntar a los demás?',
];

export default function Consejero(): JSX.Element {
  const [turnos, setTurnos] = useState<Turno[]>([
    {
      mio: false,
      texto:
        'Usted dirá. Le aviso de entrada: no conozco la solución, ni las pistas, ni lo que esconden los demás. ' +
        'Estoy para las reglas y para su papel. Lo otro tendrá que sacarlo de la mesa.',
    },
  ]);
  const [pregunta, setPregunta] = useState('');
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Turnos ya denunciados, por su posición: para no repetir ni confundir. */
  const [denunciados, setDenunciados] = useState<Set<number>>(new Set());
  const scroll = useRef<ScrollView>(null);

  /**
   * Denunciar una respuesta.
   *
   * Google Play lo exige a toda app que genere contenido con IA, y con estas
   * palabras: tiene que poder hacerse DENTRO de la app, sin salir de ella. Aquí
   * encaja además con la realidad de la velada, porque la denuncia va a parar a
   * la partida y la ve quien la dirige, que es quien está en la habitación.
   */
  const denunciar = async (indice: number): Promise<void> => {
    const respuesta = turnos[indice];
    if (!respuesta || denunciados.has(indice)) return;
    // La pregunta que lo provocó es el turno anterior, si fue mío.
    const anterior = turnos[indice - 1];
    // Se marca antes de mandarla: si falla la red no se va a volver a intentar
    // desde aquí, y dejar el botón vivo invita a pulsarlo diez veces.
    setDenunciados((previos) => new Set(previos).add(indice));
    try {
      await api.denunciarRespuesta(anterior?.mio ? anterior.texto : '', respuesta.texto);
    } catch {
      // Silencio a propósito: quien denuncia ya ha hecho su parte, y un error
      // técnico en este momento no le aporta nada.
    }
  };

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
          <Sello>El Mayordomo · asistente con IA</Sello>
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
                {!t.mio && <Etiqueta style={{ marginBottom: 4 }}>El Mayordomo</Etiqueta>}
                <Cuerpo style={{ fontSize: 17 }}>{t.texto}</Cuerpo>
                {!t.mio && (
                  <Pressable
                    onPress={() => void denunciar(i)}
                    disabled={denunciados.has(i)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Denunciar esta respuesta del Mayordomo"
                    style={estilos.denunciar}
                  >
                    <Etiqueta style={{ fontSize: 10, color: 'rgba(217,201,163,0.55)' }}>
                      {denunciados.has(i) ? 'Denunciada · gracias' : 'Denunciar respuesta'}
                    </Etiqueta>
                  </Pressable>
                )}
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
  // Discreto a propósito: tiene que estar SIEMPRE, pero el Mayordomo es para
  // divertirse y una denuncia en rojo en cada burbuja pondría a la mesa a mirar
  // el botón en vez de jugar.
  denunciar: { alignSelf: 'flex-end', marginTop: 8, paddingVertical: 2 },
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
