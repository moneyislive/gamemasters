/**
 * La acusación.
 *
 * Es el momento con más peso de la noche, así que la pantalla lo trata como
 * tal: se elige eje por eje, se enseña la combinación completa antes de
 * entregarla, y se avisa dos veces de que no hay vuelta atrás. Gana quien
 * acierte primero, y el servidor pone la hora.
 *
 * No sabe a qué se está jugando. Antes pintaba tres selectores escritos a mano
 * —culpable, objeto y sala—, que es tanto como decir que solo servía para
 * CLUEDO. Ahora recorre `vista.ejes`, que compone el servidor desde el
 * manifiesto del juego: con dos ejes o con cinco, esta pantalla sale bien sin
 * tocar una línea.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as api from '../src/api';
import { usePartida } from '../src/estado';
import {
  Boton,
  Cargando,
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
} from '../src/ui';

interface Opcion {
  id: string;
  nombre: string;
}

function Selector({
  titulo,
  opciones,
  elegido,
  alElegir,
}: {
  titulo: string;
  opciones: Opcion[];
  elegido?: string;
  alElegir: (id: string) => void;
}): JSX.Element {
  return (
    <View style={{ marginBottom: espacio.lg }}>
      <Etiqueta>{titulo}</Etiqueta>
      <View style={estilos.opciones}>
        {opciones.map((o) => {
          const activo = elegido === o.id;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityState={activo ? { selected: true } : {}}
              onPress={() => {
                void Haptics.selectionAsync();
                alElegir(o.id);
              }}
              style={({ pressed }) => [
                estilos.opcion,
                activo && estilos.opcionActiva,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Cuerpo
                style={{
                  fontSize: 16,
                  color: activo ? color.caoba900 : color.pergamino,
                  fontFamily: activo ? 'Cinzel_600SemiBold' : undefined,
                }}
              >
                {o.nombre}
              </Cuerpo>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Acusar(): JSX.Element {
  const { vista, refrescar } = usePartida();
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!vista) return <Pantalla><Cargando /></Pantalla>;

  const ejes = vista.ejes ?? [];
  const completa = ejes.length > 0 && ejes.every((e) => respuestas[e.ejeId]);

  const nombreElegido = (ejeId: string): string => {
    const eje = ejes.find((e) => e.ejeId === ejeId);
    return eje?.opciones.find((o) => o.id === respuestas[ejeId])?.nombre ?? '—';
  };

  const enviar = async (): Promise<void> => {
    if (!completa) return;
    setEnviando(true);
    setError(null);
    try {
      await api.acusar(respuestas);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refrescar();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la acusación.');
      setConfirmando(false);
    } finally {
      setEnviando(false);
    }
  };

  if (confirmando) {
    // El primer eje encabeza —«acusas a Fulano»— y el resto se lee debajo.
    const [primero, ...resto] = ejes;
    return (
      <Pantalla barra={false}>
        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingTop: espacio.xl }}>
          <Sello>Última oportunidad</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            ¿Es tu palabra final?
          </Titulo>
        </Animated.View>

        <Ornamento />

        <Marco tono="peligro">
          <Etiqueta style={{ color: '#f0c9c0' }}>Acusas a</Etiqueta>
          <Titulo style={{ fontSize: 24, marginTop: 4 }}>
            {primero ? nombreElegido(primero.ejeId) : '—'}
          </Titulo>
          {resto.length > 0 && (
            <View style={{ marginTop: espacio.md }}>
              {resto.map((e) => (
                <Cuerpo key={e.ejeId}>
                  {e.rotulo.toLowerCase()}{' '}
                  <Cuerpo style={{ color: color.oro300 }}>{nombreElegido(e.ejeId)}</Cuerpo>
                </Cuerpo>
              ))}
            </View>
          )}
        </Marco>

        <AvisoError>{error}</AvisoError>

        <Cuerpo tenue style={{ textAlign: 'center', marginBottom: espacio.md }}>
          No podrás cambiarla. Gana quien acierte primero.
        </Cuerpo>

        <Boton variante="peligro" onPress={() => void enviar()} cargando={enviando}>
          Entregar mi acusación
        </Boton>
        <Boton onPress={() => setConfirmando(false)} style={{ marginTop: espacio.sm }}>
          Volver a pensarlo
        </Boton>
      </Pantalla>
    );
  }

  return (
    <Pantalla barra={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingTop: espacio.md }}>
          <Sello>Acusación</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.md, fontSize: 26 }}>
            {ejes.map((e) => e.rotulo).join(', ')}
          </Titulo>
        </View>

        <Ornamento />

        <Animated.View entering={FadeInUp.duration(400)}>
          {ejes.map((e) => (
            <Selector
              key={e.ejeId}
              titulo={e.pregunta}
              opciones={e.opciones}
              elegido={respuestas[e.ejeId]}
              alElegir={(id) => setRespuestas((r) => ({ ...r, [e.ejeId]: id }))}
            />
          ))}
        </Animated.View>

        <Boton variante="peligro" onPress={() => setConfirmando(true)} disabled={!completa}>
          Revisar mi acusación
        </Boton>
        <Boton onPress={() => router.back()} style={{ marginTop: espacio.sm }}>
          Todavía no
        </Boton>
      </ScrollView>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginTop: espacio.sm },
  opcion: {
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.32)',
    backgroundColor: 'rgba(31,18,12,0.5)',
    borderRadius: radio.md,
    paddingVertical: 10,
    paddingHorizontal: espacio.md,
  },
  opcionActiva: {
    backgroundColor: color.oro400,
    borderColor: color.oro300,
  },
});
