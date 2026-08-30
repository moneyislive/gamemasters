/**
 * Tus partidas: todo lo jugado y todo lo que espera, con su estado.
 *
 * POR QUÉ EXISTE. Antes, lo único que la app enseñaba de tus veladas eran los
 * sobres de invitación de la portada — y solo los de partidas que todavía no
 * habían empezado. Una vez jugada, la velada desaparecía: no había forma de ver
 * cuándo fue, cómo acabó ni quién ganó. Y si quien organiza te apuntaba en una
 * mesa, no te enterabas hasta que abrieras el correo.
 *
 * AQUÍ APARECEN SOLAS. No hay que canjear nada ni abrir ningún enlace: en
 * cuanto alguien te sienta en una mesa con el correo de tu cuenta, la partida
 * sale en esta lista. El enlace del correo es un atajo, no el único camino.
 *
 * LO QUE NO SE VE AQUÍ: nada del misterio de una partida en curso. El resultado
 * solo aparece cuando la velada ya terminó, que es cuando deja de ser secreto.
 */
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import * as api from '../src/api';
import { usarMarco } from '../src/marco';
import { usePartidaSiLaHay } from '../src/estado';
import { Pulsable } from '../src/vivo';

const ORO = '#e8cf7f';

/**
 * Cómo se pinta cada estado.
 *
 * CON COLOR Y CON PALABRA, no solo con color: en una mesa con doce personas hay
 * siempre alguien que no distingue el verde del ámbar, y un estado que solo se
 * dice con un tono es un estado que esa persona no puede leer.
 */
const SELLOS: Record<string, { texto: string; color: string; fondo: string }> = {
  espera: { texto: 'ESPERANDO A QUIEN DIRIGE', color: '#e8cf7f', fondo: 'rgba(232,207,127,0.12)' },
  'en-curso': { texto: 'EN CURSO', color: '#7fd4a0', fondo: 'rgba(127,212,160,0.14)' },
  pausada: { texto: 'PAUSADA', color: '#9bb4d4', fondo: 'rgba(155,180,212,0.14)' },
  terminada: { texto: 'TERMINADA', color: '#d9c9a3', fondo: 'rgba(217,201,163,0.10)' },
  retirada: { texto: 'YA NO ESTÁ', color: '#b09a8a', fondo: 'rgba(176,154,138,0.10)' },
};

/** La fecha, en el idioma y la zona del teléfono. */
function cuando(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Partidas(): JSX.Element {
  const marco = usarMarco();
  const [partidas, setPartidas] = useState<api.PartidaDelPanel[] | null>(null);
  /*
   * `SiLaHay` y no `usePartida()`: este panel se abre tambien desde la portada,
   * sin ninguna partida abierta, y la version que lanza dejaria la pantalla en
   * blanco. Sin partida no hay aviso que dar, que es exactamente lo correcto.
   */
  const avisoDePartida = usePartidaSiLaHay()?.avisoDePartida ?? null;
  const [fallo, setFallo] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(() => {
    void (async () => {
      // Primero el disco. Preguntar por la cuenta antes de haberla leído
      // contesta que no hay, y esta pantalla se queda diciendo que no te han
      // sentado en ninguna mesa cuando sí. Es gratis a partir de la primera vez.
      await api.cargarSesionGuardada();
      if (!api.hayCuenta()) {
        setPartidas([]);
        return;
      }
      try {
        setPartidas(await api.pedirPartidas());
        setFallo(false);
      } catch {
        setFallo(true);
      }
    })();
  }, []);

  /*
   * Se recarga al VOLVER a la pantalla, no solo al montarla: se sale a jugar y
   * se vuelve, y si la lista se quedara como estaba diría que la partida sigue
   * en la sala de espera cuando ya terminó.
   */
  useFocusEffect(cargar);

  const entrar = useCallback(
    (p: api.PartidaDelPanel) => {
      void (async () => {
        try {
          const r = await api.entrarEnPartida(p.gameId, p.participanteId);
          if (r.requiereCodigo) {
            /*
             * NO SE MANDA A LA PANTALLA DE CÓDIGOS SIN MÁS. Los dos códigos son
             * el camino de quien juega SIN cuenta; mandar ahí a quien acaba de
             * identificarse, y encima con un campo relleno y otro vacío, es
             * pedirle que demuestre otra vez lo que ya demostró. Se le dice qué
             * pasa y se le deja elegir.
             */
            setPartidas((antes) =>
              (antes ?? []).map((x) =>
                x.gameId === p.gameId
                  ? { ...x, puedeEntrar: false, motivo: r.motivo ?? 'Hace falta el código.' }
                  : x,
              ),
            );
            return;
          }
          await api.fijarToken(r.token, p.gameId);
          router.push('/(juego)/ronda');
        } catch {
          setFallo(true);
        }
      })();
    },
    [],
  );

  return (
    <View style={estilos.raiz}>
      <ScrollView
        contentContainerStyle={[
          estilos.contenido,
          { paddingTop: marco.arriba + 8, paddingBottom: marco.abajo + 40 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            tintColor={ORO}
            onRefresh={() => {
              setRefrescando(true);
              cargar();
              setRefrescando(false);
            }}
          />
        }
      >
        <View style={estilos.cabecera}>
          <Text style={estilos.titulo}>Tus partidas</Text>
          <Pulsable onPress={() => router.back()} accessibilityLabel="Volver">
            <Text style={estilos.cerrar}>✕</Text>
          </Pulsable>
        </View>

        {partidas === null && !fallo && <Text style={estilos.parrafo}>Buscando tus mesas…</Text>}

        {fallo && (
          <View style={estilos.marco}>
            <Text style={estilos.parrafo}>
              No se llega al servidor. Puede ser la conexión, o que esté despertando. Desliza
              hacia abajo para reintentar.
            </Text>
          </View>
        )}

        {partidas?.length === 0 && !fallo && (
          <View style={estilos.marco}>
            <Text style={estilos.parrafo}>
              {api.hayCuenta()
                ? 'Todavía no te han sentado en ninguna mesa. Cuando quien organiza te apunte con el correo de tu cuenta, la partida aparecerá aquí sola.'
                : 'Inicia sesión y tus partidas aparecerán aquí sin que tengas que pedirle el código a nadie.'}
            </Text>
          </View>
        )}

        {partidas?.map((p, i) => {
          const sello = SELLOS[p.estado] ?? SELLOS.terminada!;
          return (
            <Animated.View key={`${p.gameId}-${p.participanteId}`} entering={FadeInUp.delay(i * 60)}>
              <View style={estilos.ficha}>
                <View style={[estilos.sello, { backgroundColor: sello.fondo }]}>
                  <Text style={[estilos.selloTexto, { color: sello.color }]}>{sello.texto}</Text>
                </View>

                {avisoDePartida?.gameId === p.gameId && (
                  /*
                   * EL AVISO DE ESTA PARTIDA, y solo de esta.
                   *
                   * Antes esto era una franja a lo ancho de la app. Estaba mal:
                   * que tu sesión de una velada haya caducado no dice nada de
                   * las demás, y anunciarlo a pantalla completa hace creer que
                   * lo que falla es la app. Aquí va donde se puede hacer algo al
                   * respecto —la fila de su partida, con su botón de entrar al
                   * lado— y solo mientras dura.
                   */
                  <View style={estilos.avisoDeLaPartida}>
                    <Text style={estilos.avisoDeLaPartidaTexto}>{avisoDePartida.texto}</Text>
                  </View>
                )}

                <Text style={estilos.velada}>{p.titulo}</Text>
                <Text style={estilos.personaje}>Tu papel: {p.personaje}</Text>
                {p.cuando ? <Text style={estilos.fecha}>{cuando(p.cuando)}</Text> : null}

                {p.resultado && (
                  <View style={estilos.resultado}>
                    <Text style={estilos.resultadoTitulo}>
                      {p.resultado.gane
                        ? 'Ganaste tú'
                        : p.resultado.ganador
                          ? `Ganó ${p.resultado.ganador}`
                          : 'Nadie acertó'}
                    </Text>
                    {!p.resultado.gane && p.resultado.acerte && (
                      <Text style={estilos.menudo}>Acertaste, pero alguien se te adelantó.</Text>
                    )}
                  </View>
                )}

                {p.puedeEntrar && (
                  <Pulsable onPress={() => entrar(p)}>
                    <View style={estilos.boton}>
                      <Text style={estilos.botonTexto}>ENTRAR EN LA MESA</Text>
                    </View>
                  </Pulsable>
                )}

                {/*
                  El motivo se cuenta SIEMPRE que no se puede entrar. Un botón
                  que desaparece sin explicación se lee como que la app se ha
                  equivocado, y quien lo mira acaba pidiendo ayuda por algo que
                  tiene una respuesta de una línea.
                */}
                {!p.puedeEntrar && p.motivo && <Text style={estilos.menudo}>{p.motivo}</Text>}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  /*
   * Discreto a proposito. No es una alarma: es un dato sobre una velada
   * concreta, y la fila entera ya dice de cual. Ambar y no rojo porque casi
   * siempre se arregla volviendo a entrar.
   */
  avisoDeLaPartida: {
    backgroundColor: 'rgba(232,207,127,0.12)',
    borderLeftWidth: 2,
    borderLeftColor: ORO,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  avisoDeLaPartidaTexto: {
    fontSize: 13,
    lineHeight: 18,
    color: ORO,
  },
  raiz: { flex: 1, backgroundColor: '#050d09' },
  contenido: { paddingHorizontal: 20 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titulo: { fontSize: 26, color: ORO, letterSpacing: 0.4 },
  cerrar: { fontSize: 20, color: 'rgba(232,207,127,0.75)', paddingHorizontal: 6 },

  marco: {
    borderWidth: 1,
    borderColor: 'rgba(232,207,127,0.18)',
    borderRadius: 10,
    padding: 16,
  },
  parrafo: { fontSize: 15, lineHeight: 22, color: '#d9c9a3' },

  ficha: {
    borderWidth: 1,
    borderColor: 'rgba(232,207,127,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  sello: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  selloTexto: { fontSize: 10, letterSpacing: 1.1 },

  velada: { fontSize: 19, color: '#f0e6cd' },
  personaje: { fontSize: 14, color: ORO, opacity: 0.85, marginTop: 3 },
  fecha: { fontSize: 12.5, color: '#d9c9a3', opacity: 0.6, marginTop: 6 },

  resultado: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232,207,127,0.14)',
  },
  resultadoTitulo: { fontSize: 16, color: ORO },

  boton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: ORO,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(232,207,127,0.08)',
  },
  botonTexto: { fontSize: 12.5, letterSpacing: 1.2, color: ORO },

  menudo: { fontSize: 12.5, lineHeight: 18, color: '#d9c9a3', opacity: 0.7, marginTop: 10 },
});
