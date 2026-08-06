/**
 * Tu dosier. Es el documento impreso, pero vivo: el conocimiento se va
 * desbloqueando ronda a ronda y los giros aparecen cuando te los entregan.
 */
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import {
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
} from '../../src/ui';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }): JSX.Element | null {
  if (!valor) return null;
  return (
    <View style={{ marginBottom: espacio.md }}>
      <Etiqueta style={{ color: color.burdeos700 }}>{etiqueta}</Etiqueta>
      <Cuerpo style={{ color: color.caoba700, marginTop: 2 }}>{valor}</Cuerpo>
    </View>
  );
}

export default function Personaje(): JSX.Element {
  const { vista } = usePartida();
  if (!vista) return <Pantalla><Cargando /></Pantalla>;
  const { yo, sesion } = vista;

  return (
    <Pantalla>
      <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
        <Sello>Confidencial · solo para ti</Sello>
        {yo.photoUrl ? (
          <Image
            source={{ uri: `${api.servidorActual()}${yo.photoUrl}` }}
            style={estilos.retrato}
          />
        ) : (
          <View style={[estilos.retrato, estilos.retratoVacio]}>
            <Titulo style={{ fontSize: 32 }}>
              {yo.characterName.slice(0, 1).toUpperCase()}
            </Titulo>
          </View>
        )}
        <Titulo style={{ textAlign: 'center', fontSize: 26 }}>{yo.characterName}</Titulo>
        <Cuerpo tenue style={{ textAlign: 'center', fontStyle: 'italic' }}>{yo.role}</Cuerpo>
      </Animated.View>

      {yo.soyCulpable && (
        <Animated.View entering={FadeInUp.delay(120).duration(500)}>
          <Marco tono="peligro">
            <Etiqueta style={{ color: '#f0c9c0' }}>Tú lo hiciste</Etiqueta>
            <Cuerpo style={{ marginTop: espacio.sm }}>
              Nadie más lo sabe. Tu partida no es acertar: es que no te acierten. Miente con
              cuidado, ofrece coartadas verificables y no seas el primero en señalar a nadie.
            </Cuerpo>
          </Marco>
        </Animated.View>
      )}

      <Ornamento />

      <Animated.View entering={FadeInUp.delay(180).duration(500)}>
        <Marco tono="papel">
          <Dato etiqueta="Quién crees ser ante los demás" valor={yo.publicPersona} />
          <Dato etiqueta="Tu secreto" valor={yo.secret} />
          <Dato etiqueta="Tu motivo" valor={yo.motive} />
          <Dato etiqueta="Tu coartada" valor={yo.alibi} />
          <Dato etiqueta="Cómo interpretarlo" valor={yo.personalHook} />
        </Marco>
      </Animated.View>

      <Seccion>Lo que sabes de los demás</Seccion>
      {yo.conocimiento.length === 0 ? (
        <Marco>
          <Cuerpo tenue>
            Todavía nada. Irás recordando cosas según avance la velada.
          </Cuerpo>
        </Marco>
      ) : (
        yo.conocimiento.map((k, i) => (
          <Animated.View key={i} entering={FadeInUp.delay(60 * i).duration(420)}>
            <Marco tono="papel">
              <Cuerpo style={{ color: color.caoba700 }}>{k}</Cuerpo>
            </Marco>
          </Animated.View>
        ))
      )}
      {yo.conocimientoPendiente > 0 && (
        <Cuerpo tenue style={{ fontStyle: 'italic', fontSize: 15 }}>
          Aún recordarás {yo.conocimientoPendiente}{' '}
          {yo.conocimientoPendiente === 1 ? 'cosa más' : 'cosas más'} en próximas rondas.
        </Cuerpo>
      )}

      {yo.giros.length > 0 && (
        <>
          <Ornamento />
          <Seccion>Lo que acabas de descubrir</Seccion>
          {yo.giros.map((g) => (
            <Animated.View key={g.id} entering={FadeInUp.duration(520)}>
              <Marco tono="peligro">
                <Etiqueta style={{ color: '#f0c9c0' }}>Ronda {g.round}</Etiqueta>
                <Cuerpo style={{ marginTop: espacio.sm }}>{g.instruction}</Cuerpo>
              </Marco>
            </Animated.View>
          ))}
        </>
      )}

      <Ornamento />
      <Seccion>En la mesa</Seccion>
      {vista.jugadores.map((j) => (
        <View key={j.suspectId} style={estilos.fila}>
          <View style={[estilos.punto, { backgroundColor: j.conectado ? color.oro400 : 'rgba(217,201,163,0.25)' }]} />
          <View style={{ flex: 1 }}>
            <Cuerpo style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 16 }}>
              {j.characterName}
            </Cuerpo>
            <Cuerpo tenue style={{ fontSize: 14 }}>
              {j.displayName}
              {j.salaActual ? ` · en ${j.salaActual}` : ''}
              {j.yaAcuso ? ' · ya acusó' : ''}
            </Cuerpo>
          </View>
        </View>
      ))}

      <Cuerpo tenue style={{ fontSize: 14, marginTop: espacio.lg, textAlign: 'center' }}>
        Código de la partida: {sesion.code}
      </Cuerpo>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  retrato: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: color.oro500,
    marginVertical: espacio.lg,
  },
  retratoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,63,42,0.6)',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingVertical: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,39,0.15)',
  },
  punto: { width: 8, height: 8, borderRadius: radio.redondo },
});
