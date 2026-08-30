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
import { useJuego } from '../src/tema-juego';
import { accionDeAcusacion, manifiestoDe } from '../../shared/juegos';
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
import { useTema } from '../src/tema-juego';

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
  // El selector también se pinta con el tema del juego, no con el de la casa.
  const t = useTema();
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
                /*
                 * El resalte de lo elegido va EN LÍNEA y no en la hoja de
                 * estilos: una hoja se construye al importar el módulo, que es
                 * antes de que exista ninguna partida, así que ahí no se puede
                 * saber a qué se juega. Era el oro de CLUEDO sobre la opción
                 * marcada, en la pantalla en la que la mesa entera señala.
                 */
                activo && { backgroundColor: t.oro400, borderColor: t.oro300 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Cuerpo
                style={{
                  fontSize: 16,
                  color: activo ? t.caoba900 : t.pergamino,
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

/**
 * Lo que se dice al responder, por juego.
 *
 * ERA UN TERNARIO CONTRA `esMomia`, y con un tercer juego se convirtió en el
 * fallo que esta entrega ha ido persiguiendo por toda la app: El Paso de las
 * Sombras no es la Momia, luego caía en la rama de CLUEDO y el consejo del alba
 * —al que se llega desde `consejo.tsx`— prometía «Gana quien acierte primero».
 * Allí no gana quien acierta primero: se señala una sola vez, no se sabe hasta
 * el amanecer, y se puede perder habiendo acertado.
 *
 * CLUEDO ES EL RESPALDO, con las mismas palabras de siempre, y la Momia tiene
 * aquí las suyas sin cambiar una letra.
 */
interface PalabrasDeAcusar {
  verbo: string;
  consecuencia: string;
  entregar: string;
  revisar: string;
}

const PALABRAS_DE_CLUEDO: PalabrasDeAcusar = {
  verbo: 'Acusas a',
  consecuencia: 'No podrás cambiarla. Gana quien acierte primero.',
  entregar: 'Entregar mi acusación',
  revisar: 'Revisar mi acusación',
};

const PALABRAS_DE_ACUSAR: Record<string, PalabrasDeAcusar> = {
  momia: {
    verbo: 'Señalas a',
    consecuencia: 'No podrás cambiarlo. Se sabrá al amanecer si acertaste.',
    entregar: 'Entregarlo',
    revisar: 'Revisarlo',
  },
  sombras: {
    verbo: 'Señalas a',
    consecuencia: 'No podrás cambiarlo. Se señala una vez y para toda la partida.',
    entregar: 'Entregarlo',
    revisar: 'Revisarlo',
  },
};

export default function Acusar(): JSX.Element {
  const { vista, refrescar } = usePartida();
  const palabras = PALABRAS_DE_ACUSAR[useJuego() ?? ''] ?? PALABRAS_DE_CLUEDO;
  const t = useTema();
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
      await api.responder(respuestas);
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

  /*
   * LAS PALABRAS SALEN DEL JUEGO, no de CLUEDO.
   *
   * Esta pantalla es genérica —recorre los ejes que declare el manifiesto— pero
   * sus rótulos estaban escritos en el vocabulario de la casa: «Acusación»,
   * «Acusas a», «Gana quien acierte primero». En El Misterio de la Momia nadie
   * acusa a nadie de un asesinato: se señala a quien rompió el sello, y acertar
   * antes no gana nada porque se gana por bandos. Es la pantalla que toca la
   * mesa entera, así que hablar ahí el idioma del otro juego se nota más que en
   * ningún otro sitio.
   *
   * El rótulo de la acción y el del eje ya vienen del manifiesto; lo único que
   * hacía falta era dejar de escribir alrededor lo que solo vale para CLUEDO.
   */
  const accion = accionDeAcusacion(manifiestoDe(vista?.sesion.juego));
  const titulo = accion?.rotulo ?? 'Acusación';
  const verbo = palabras.verbo;
  const consecuencia = palabras.consecuencia;

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
          <Etiqueta style={{ color: '#f0c9c0' }}>{verbo}</Etiqueta>
          <Titulo style={{ fontSize: 24, marginTop: 4 }}>
            {primero ? nombreElegido(primero.ejeId) : '—'}
          </Titulo>
          {resto.length > 0 && (
            <View style={{ marginTop: espacio.md }}>
              {resto.map((e) => (
                <Cuerpo key={e.ejeId}>
                  {e.rotulo.toLowerCase()}{' '}
                  <Cuerpo style={{ color: t.oro300 }}>{nombreElegido(e.ejeId)}</Cuerpo>
                </Cuerpo>
              ))}
            </View>
          )}
        </Marco>

        <AvisoError>{error}</AvisoError>

        <Cuerpo tenue style={{ textAlign: 'center', marginBottom: espacio.md }}>
          {consecuencia}
        </Cuerpo>

        <Boton variante="peligro" onPress={() => void enviar()} cargando={enviando}>
          {palabras.entregar}
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
          <Sello>{titulo}</Sello>
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
          {palabras.revisar}
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
});
