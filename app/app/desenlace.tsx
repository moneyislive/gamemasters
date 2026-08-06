/**
 * El desenlace: el momento por el que se juega toda la noche.
 *
 * Se revela por partes y a ritmo, no de golpe: primero quién, luego cómo,
 * después la confesión, y al final la clasificación. Volcarlo todo en una
 * pantalla desperdiciaría el único instante de la velada en el que doce
 * personas están mirando el móvil a la vez y en silencio.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePartida } from '../src/estado';
import {
  Boton,
  Cargando,
  Cuerpo,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Sello,
  Seccion,
  Titulo,
  color,
  espacio,
  radio,
} from '../src/ui';

export default function Desenlace(): JSX.Element {
  const { vista } = usePartida();
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  if (!vista) return <Pantalla><Cargando /></Pantalla>;
  const fin = vista.desenlace;
  if (!fin) {
    return (
      <Pantalla>
        <Marco>
          <Cuerpo>Todavía no se ha abierto el sobre del crimen.</Cuerpo>
          <Boton onPress={() => router.back()} style={{ marginTop: espacio.lg }}>
            Volver
          </Boton>
        </Marco>
      </Pantalla>
    );
  }

  const gane = fin.ganador?.suspectId === vista.yo.suspectId;
  const eraYo = fin.murdererId === vista.yo.suspectId;

  return (
    <Pantalla>
      <Animated.View entering={FadeInDown.duration(700)} style={{ alignItems: 'center', paddingTop: espacio.lg }}>
        <Sello>El sobre del crimen</Sello>
      </Animated.View>

      <Ornamento />

      <Animated.View entering={FadeIn.delay(300).duration(800)}>
        <Marco tono="peligro">
          <Etiqueta style={{ color: '#f0c9c0', textAlign: 'center' }}>Fue</Etiqueta>
          <Titulo style={{ textAlign: 'center', fontSize: 30, marginTop: espacio.sm }}>
            {fin.murdererName}
          </Titulo>
          <Cuerpo style={{ textAlign: 'center', marginTop: espacio.md, fontSize: 19 }}>
            con {fin.weaponName}
            {'\n'}en {fin.roomName}
          </Cuerpo>
          {eraYo && (
            <Cuerpo style={{ textAlign: 'center', marginTop: espacio.md, color: color.oro300 }}>
              Eras tú. {fin.ganador ? 'Te pillaron.' : 'Y nadie te descubrió.'}
            </Cuerpo>
          )}
        </Marco>
      </Animated.View>

      {paso >= 1 && (
        <Animated.View entering={FadeInUp.duration(600)}>
          <Marco tono="papel">
            <Etiqueta style={{ color: color.burdeos700 }}>El motivo</Etiqueta>
            <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>{fin.motive}</Cuerpo>
            <View style={estilos.separador} />
            <Etiqueta style={{ color: color.burdeos700 }}>Cómo ocurrió</Etiqueta>
            <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
              {fin.reconstruccion}
            </Cuerpo>
          </Marco>
        </Animated.View>
      )}

      {paso >= 2 && fin.confesion && (
        <Animated.View entering={FadeInUp.duration(600)}>
          <Marco tono="peligro">
            <Etiqueta style={{ color: '#f0c9c0' }}>La confesión</Etiqueta>
            <Cuerpo style={{ marginTop: espacio.sm, fontStyle: 'italic' }}>{fin.confesion}</Cuerpo>
          </Marco>
        </Animated.View>
      )}

      {paso >= 3 && (
        <Animated.View entering={FadeInUp.duration(600)}>
          {fin.ganador ? (
            <Marco style={gane ? estilos.marcoGanador : undefined}>
              <Etiqueta style={{ textAlign: 'center' }}>
                {gane ? 'Lo resolviste tú' : 'Lo resolvió'}
              </Etiqueta>
              <Titulo style={{ textAlign: 'center', fontSize: 26, marginTop: espacio.sm }}>
                {gane ? '🏆' : ''} {fin.ganador.displayName}
              </Titulo>
            </Marco>
          ) : (
            <Marco>
              <Cuerpo style={{ textAlign: 'center' }}>
                Nadie dio con la combinación completa. El crimen queda impune.
              </Cuerpo>
            </Marco>
          )}

          <Seccion>Cómo quedó la mesa</Seccion>
          {fin.clasificacion.map((c, i) => (
            <View key={c.suspectId} style={estilos.fila}>
              <Cuerpo style={estilos.puesto}>{i + 1}</Cuerpo>
              <Cuerpo style={{ flex: 1, fontSize: 17 }}>{c.displayName}</Cuerpo>
              <Cuerpo
                style={{
                  color: c.acerto ? color.oro300 : color.pergaminoTenue,
                  fontFamily: 'Cinzel_600SemiBold',
                  fontSize: 15,
                }}
              >
                {c.at ? `${c.aciertos}/3` : 'sin acusar'}
              </Cuerpo>
            </View>
          ))}

          {fin.epilogo && (
            <>
              <Ornamento />
              <Marco tono="papel">
                <Etiqueta style={{ color: color.burdeos700 }}>Epílogo</Etiqueta>
                <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
                  {fin.epilogo}
                </Cuerpo>
              </Marco>
            </>
          )}
        </Animated.View>
      )}

      <View style={{ height: espacio.lg }} />
      {paso < 3 ? (
        <Boton
          variante="primario"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setPaso((p) => p + 1);
          }}
        >
          {paso === 0 ? 'Ver cómo ocurrió' : paso === 1 ? 'Oír la confesión' : 'Ver quién ganó'}
        </Boton>
      ) : (
        <Boton onPress={() => router.replace('/(juego)/perfil')}>Ver tus trofeos</Boton>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  separador: {
    height: 1,
    backgroundColor: 'rgba(109,26,42,0.25)',
    marginVertical: espacio.md,
  },
  marcoGanador: {
    borderColor: color.oro300,
    backgroundColor: 'rgba(201,162,39,0.14)',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,39,0.15)',
  },
  puesto: {
    width: 26,
    height: 26,
    borderRadius: radio.redondo,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.4)',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
  },
});
