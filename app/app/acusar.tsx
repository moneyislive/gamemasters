/**
 * La acusación.
 *
 * Es el momento con más peso de la noche, así que la pantalla lo trata como
 * tal: se elige en tres pasos, se enseña la combinación completa antes de
 * entregarla, y se avisa dos veces de que no hay vuelta atrás. Gana quien
 * acierte primero, y el servidor pone la hora.
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
  const [culpable, setCulpable] = useState<string>();
  const [objeto, setObjeto] = useState<string>();
  const [sala, setSala] = useState<string>();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!vista) return <Pantalla><Cargando /></Pantalla>;

  const sospechosos: Opcion[] = [
    ...vista.jugadores.map((j) => ({ id: j.suspectId, nombre: j.characterName })),
    { id: vista.yo.suspectId, nombre: `${vista.yo.characterName} (tú)` },
  ];
  const objetos: Opcion[] = vista.objetos.map((o) => ({ id: o.id, nombre: o.name }));
  const salas: Opcion[] = vista.salas.map((s) => ({ id: s.id, nombre: s.name }));

  const completa = Boolean(culpable && objeto && sala);
  const nombreDe = (lista: Opcion[], id?: string): string =>
    lista.find((x) => x.id === id)?.nombre ?? '—';

  const enviar = async (): Promise<void> => {
    if (!culpable || !objeto || !sala) return;
    setEnviando(true);
    setError(null);
    try {
      await api.acusar(culpable, objeto, sala);
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
    return (
      <Pantalla>
        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingTop: espacio.xl }}>
          <Sello>Última oportunidad</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            ¿Es tu palabra final?
          </Titulo>
        </Animated.View>

        <Ornamento />

        <Marco tono="peligro">
          <Etiqueta style={{ color: '#f0c9c0' }}>Acusas a</Etiqueta>
          <Titulo style={{ fontSize: 24, marginTop: 4 }}>{nombreDe(sospechosos, culpable)}</Titulo>
          <Cuerpo style={{ marginTop: espacio.md }}>
            con <Cuerpo style={{ color: color.oro300 }}>{nombreDe(objetos, objeto)}</Cuerpo>
            {'\n'}
            en <Cuerpo style={{ color: color.oro300 }}>{nombreDe(salas, sala)}</Cuerpo>
          </Cuerpo>
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
    <Pantalla>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingTop: espacio.md }}>
          <Sello>Acusación</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.md, fontSize: 26 }}>
            Quién, con qué y dónde
          </Titulo>
        </View>

        <Ornamento />

        <Animated.View entering={FadeInUp.duration(400)}>
          <Selector titulo="El culpable" opciones={sospechosos} elegido={culpable} alElegir={setCulpable} />
          <Selector titulo="El objeto" opciones={objetos} elegido={objeto} alElegir={setObjeto} />
          <Selector titulo="La sala" opciones={salas} elegido={sala} alElegir={setSala} />
        </Animated.View>

        <Boton
          variante="peligro"
          onPress={() => setConfirmando(true)}
          disabled={!completa}
        >
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
