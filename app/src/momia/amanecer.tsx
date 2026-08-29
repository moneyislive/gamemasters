/**
 * El amanecer: cómo acabó la noche en El Misterio de la Momia.
 *
 * POR QUÉ EXISTE UNA PANTALLA PROPIA. La del desenlace es la de CLUEDO, y no
 * por dejadez: está construida sobre lo único que la plataforma sabe de un
 * final, que es «alguien acertó quién, con qué y dónde, y ganó por llegar
 * antes». Este juego no acaba así. Acaba con un bando ganando, con un orden que
 * se ejecutó y otro que era el bueno, y con gente que ganó sin acertar nada
 * porque su bando selló la tumba.
 *
 * Enseñar aquí la genérica no era un adorno mal puesto: era contar otra
 * partida. Decía «El sobre del crimen», clasificaba por «aciertos/1» y cerraba
 * con «nadie dio con la combinación completa, el crimen queda impune» — en una
 * velada en la que puede haber ganado la expedición entera.
 *
 * A RITMO Y NO DE GOLPE, igual que la genérica: primero si la tumba se selló,
 * luego los dos órdenes uno encima del otro, después quién rompió el sello y al
 * final lo tuyo. Es el único instante de la noche en el que ocho personas miran
 * el móvil a la vez y en silencio, y volcarlo todo en una pantalla lo gasta.
 *
 * LO QUE SE PUEDE ENSEÑAR AQUÍ Y EN NINGÚN OTRO SITIO: `ordenVerdadero`. Viaja
 * por una sola puerta —la proyección solo lo mete cuando la partida ha
 * terminado— y esta es la pantalla al otro lado.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePartida } from '../estado';
import { useTema } from '../tema-juego';
import { MOMIA } from '../tema-momia';
import { manifiestoDe } from '../../../shared/juegos';
import { leerEstadoMomia } from './vista';
import { Boton, Cargando, Cuerpo, Etiqueta, Marco, Ornamento, Pantalla, Seccion, Sello, Titulo, espacio, radio } from '../ui';

export function Amanecer(): JSX.Element {
  const { vista } = usePartida();
  const t = useTema();
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  if (!vista) {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }

  const estado = leerEstadoMomia(vista.estadoDelJuego);
  const fin = estado?.desenlace;

  if (!fin) {
    return (
      <Pantalla barra={false}>
        <Marco>
          <Cuerpo>Todavía no ha amanecido. El ritual no se ha ejecutado.</Cuerpo>
          <Boton onPress={() => router.back()} style={{ marginTop: espacio.lg }}>
            Volver
          </Boton>
        </Marco>
      </Pantalla>
    );
  }

  const yo = vista.yo.suspectId;
  const gane = fin.ganadores.includes(yo);
  const eraYo = fin.saqueadorId === yo;
  const nombreDe = (id: string): string => {
    /*
     * TU MISMO NO ERES «ALGUIEN». `vista.jugadores` viene del servidor SIN quien
     * la recibe (live/proyeccion.ts la filtra a proposito), pero esto se aplica
     * sobre `votos[].apoyos` y `silenciadas`, que si llevan tu id. Asi que en el
     * recuento de la votacion tu propio nombre salia como «alguien», y en una
     * pantalla que existe justo para repasar quien apoyo a quien.
     */
    if (id === vista.yo.suspectId) return 'Tú';
    const j = vista.jugadores.find((x) => x.suspectId === id);
    return j ? j.characterName || j.displayName : 'alguien';
  };

  /*
   * Los trofeos salen del manifiesto y no de una lista escrita aquí: son suyos,
   * y un juego que añada uno tiene que verlo aparecer sin tocar esta pantalla.
   */
  const catalogo = manifiestoDe(vista.sesion.juego).trofeos;
  const mios = (fin.trofeos[yo] ?? [])
    .map((id) => catalogo.find((x) => x.id === id))
    .filter((x): x is (typeof catalogo)[number] => Boolean(x));

  return (
    <Pantalla barra={false}>
      {/* ---- 1. ¿Se selló la tumba? ---- */}
      <Animated.View entering={FadeIn.duration(700)} style={estilos.centro}>
        <Sello>{fin.correcto ? 'La tumba está sellada' : 'Amaneció abierta'}</Sello>
        <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
          {fin.gana === 'expedicion' ? 'Gana la expedición' : 'Gana el saqueador'}
        </Titulo>
        <Cuerpo tenue style={{ textAlign: 'center', marginTop: espacio.sm }}>
          {fin.correcto
            ? 'Los cinco ritos se ejecutaron en el orden bueno. El sello vuelve a estar puesto.'
            : 'El orden que se ejecutó no era el bueno. Lo que se abrió anoche sigue abierto.'}
        </Cuerpo>
      </Animated.View>

      <Ornamento />

      {paso === 0 && (
        <Boton variante="primario" onPress={() => setPaso(1)}>
          ¿Cuál era el orden bueno?
        </Boton>
      )}

      {/* ---- 2. Los dos órdenes, uno debajo del otro ---- */}
      {paso >= 1 && (
        <Animated.View entering={FadeInDown.duration(500)}>
          <Seccion>El orden verdadero</Seccion>
          {fin.ordenVerdadero.map((r, i) => (
            <Fila key={`v-${r.id}`} numero={i + 1} nombre={r.nombre} tono={MOMIA.fayenza} />
          ))}

          <Seccion style={{ marginTop: espacio.lg }}>El que ejecutó la mesa</Seccion>
          {fin.ordenEjecutado.length === 0 ? (
            <Cuerpo tenue>Nadie llegó a proponer nada. La tumba se quedó como estaba.</Cuerpo>
          ) : (
            fin.ordenEjecutado.map((r, i) => (
              <Fila
                key={`e-${r.id}`}
                numero={i + 1}
                nombre={r.nombre}
                tono={fin.ordenVerdadero[i]?.id === r.id ? MOMIA.fayenza : MOMIA.profanada}
              />
            ))
          )}

          {paso === 1 && (
            <Boton variante="primario" onPress={() => setPaso(2)} style={{ marginTop: espacio.lg }}>
              ¿Quién rompió el sello?
            </Boton>
          )}
        </Animated.View>
      )}

      {/* ---- 3. El saqueador ---- */}
      {paso >= 2 && (
        <Animated.View entering={FadeInDown.duration(500)}>
          <Ornamento />
          <View style={estilos.centro}>
            <Etiqueta>Rompió el sello</Etiqueta>
            <Titulo style={{ textAlign: 'center', marginTop: espacio.xs }}>
              {eraYo ? 'Fuiste tú' : nombreDe(fin.saqueadorId)}
            </Titulo>
            {eraYo && (
              <Cuerpo tenue style={{ textAlign: 'center', marginTop: espacio.sm }}>
                Ya lo sabías desde la primera vigilia. Ahora lo sabe la mesa.
              </Cuerpo>
            )}
          </View>

          {paso === 2 && (
            <Boton variante="primario" onPress={() => setPaso(3)} style={{ marginTop: espacio.lg }}>
              ¿Y yo?
            </Boton>
          )}
        </Animated.View>
      )}

      {/* ---- 4. Lo tuyo ---- */}
      {paso >= 3 && (
        <Animated.View entering={FadeInDown.duration(500)}>
          <Ornamento />
          <View style={estilos.centro}>
            <Sello>{gane ? 'Ganaste' : 'Esta vez no'}</Sello>
            <Cuerpo tenue style={{ textAlign: 'center', marginTop: espacio.sm }}>
              {gane
                ? eraYo
                  ? 'Amaneció con la tumba abierta y nadie pudo evitarlo. Era exactamente lo que querías.'
                  : 'La expedición selló la tumba. Ganáis todos los que no rompisteis el sello.'
                : eraYo
                  ? 'La expedición te ganó la partida: la tumba volvió a cerrarse.'
                  : 'El sello no volvió a su sitio. Gana quien lo rompió.'}
            </Cuerpo>
          </View>

          {mios.length > 0 && (
            <>
              <Seccion style={{ marginTop: espacio.lg }}>Lo que te llevas</Seccion>
              {mios.map((tr) => (
                <View key={tr.id} style={[estilos.trofeo, { borderColor: t.laton }]}>
                  <Cuerpo style={{ color: t.laton }}>{tr.nombre}</Cuerpo>
                  {tr.descripcion ? <Cuerpo tenue style={{ fontSize: 13 }}>{tr.descripcion}</Cuerpo> : null}
                </View>
              ))}
            </>
          )}

          {/* Las propuestas y sus apoyos: es lo que explica por qué se ejecutó
              ese orden y no otro, que es la discusión de después. */}
          {fin.votos.length > 0 && (
            <>
              <Seccion style={{ marginTop: espacio.lg }}>Cómo se votó</Seccion>
              {fin.votos.map((v, i) => (
                <View key={`voto-${i}`} style={estilos.voto}>
                  <Cuerpo style={{ fontSize: 15 }}>
                    {v.orden.map((id) => fin.ordenVerdadero.find((r) => r.id === id)?.nombre ?? id).join(' · ')}
                  </Cuerpo>
                  <Cuerpo tenue style={{ fontSize: 13 }}>
                    {v.apoyos.length === 1 ? '1 apoyo' : `${v.apoyos.length} apoyos`}
                    {v.apoyos.length > 0 ? ` — ${v.apoyos.map(nombreDe).join(', ')}` : ''}
                  </Cuerpo>
                </View>
              ))}
              {fin.silenciadas.length > 0 && (
                <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.sm }}>
                  No contaron las propuestas de {fin.silenciadas.map(nombreDe).join(', ')}: la
                  maldición les había ganado antes.
                </Cuerpo>
              )}
            </>
          )}

          <Boton onPress={() => router.replace('/(juego)/perfil')} style={{ marginTop: espacio.lg }}>
            Ver tu vitrina
          </Boton>
        </Animated.View>
      )}
    </Pantalla>
  );
}

/** Una posición del orden, con su número delante. */
function Fila({ numero, nombre, tono }: { numero: number; nombre: string; tono: string }): JSX.Element {
  return (
    <View style={[estilos.fila, { borderLeftColor: tono }]}>
      <Cuerpo style={{ color: tono, width: 22 }}>{numero}</Cuerpo>
      <Cuerpo style={{ flex: 1 }}>{nombre}</Cuerpo>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    borderLeftWidth: 2,
    paddingLeft: espacio.md,
    paddingVertical: 7,
  },
  trofeo: {
    borderWidth: 1,
    borderRadius: radio.sm,
    padding: espacio.md,
    marginTop: espacio.sm,
  },
  voto: { paddingVertical: 6 },
});
