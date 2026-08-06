/**
 * El tablón común y la cronología pública: lo que sabe todo el mundo.
 *
 * Aquí sí se dice qué señala cada pista, porque una vez que algo está sobre la
 * mesa, interpretarlo es una conversación colectiva y no un secreto.
 */
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { usePartida } from '../../src/estado';
import {
  Cargando,
  Cuerpo,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Seccion,
  Titulo,
  color,
  espacio,
} from '../../src/ui';

export default function Tablon(): JSX.Element {
  const { vista } = usePartida();
  if (!vista) return <Pantalla><Cargando /></Pantalla>;

  const porRonda = new Map<number, typeof vista.tablon>();
  for (const p of vista.tablon) {
    if (!porRonda.has(p.round)) porRonda.set(p.round, []);
    porRonda.get(p.round)!.push(p);
  }
  const rondas = [...porRonda.keys()].sort((a, b) => b - a);

  return (
    <Pantalla>
      <Titulo style={{ fontSize: 24, marginTop: espacio.md }}>Tablón común</Titulo>
      <Cuerpo tenue style={{ marginBottom: espacio.lg }}>
        Todo lo que alguien ha encontrado y ya es de dominio público.
      </Cuerpo>

      {rondas.length === 0 ? (
        <Marco>
          <Cuerpo tenue>
            Todavía no hay nada. Lo que se encuentre en la primera ronda aparecerá aquí en cuanto
            se cierre.
          </Cuerpo>
        </Marco>
      ) : (
        rondas.map((ronda) => (
          <View key={ronda}>
            <Seccion>Ronda {ronda}</Seccion>
            {porRonda.get(ronda)!.map((p, i) => (
              <Animated.View key={p.id} entering={FadeInUp.delay(50 * i).duration(420)}>
                <Marco tono="papel">
                  <Etiqueta style={{ color: color.burdeos700 }}>{p.roomName}</Etiqueta>
                  <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
                    {p.description}
                  </Cuerpo>
                  {p.pointsTo && (
                    <View style={estilos.senala}>
                      <Cuerpo style={{ color: color.burdeos700, fontSize: 16, fontStyle: 'italic' }}>
                        {p.pointsTo}
                      </Cuerpo>
                    </View>
                  )}
                </Marco>
              </Animated.View>
            ))}
          </View>
        ))
      )}

      <Ornamento />

      <Seccion>Lo que vio todo el mundo</Seccion>
      {vista.cronologia.length === 0 ? (
        <Marco>
          <Cuerpo tenue>Esta velada no tiene hechos públicos registrados.</Cuerpo>
        </Marco>
      ) : (
        <Marco tono="papel">
          {vista.cronologia.map((m, i) => (
            <View key={i} style={estilos.momento}>
              <Cuerpo style={estilos.hora}>{m.time}</Cuerpo>
              <Cuerpo style={{ color: color.caoba700, flex: 1 }}>{m.description}</Cuerpo>
            </View>
          ))}
        </Marco>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  senala: {
    marginTop: espacio.md,
    paddingTop: espacio.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(109,26,42,0.3)',
  },
  momento: {
    flexDirection: 'row',
    gap: espacio.md,
    paddingVertical: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(62,39,35,0.18)',
  },
  hora: {
    fontFamily: 'Cinzel_600SemiBold',
    color: color.burdeos700,
    fontSize: 15,
    width: 58,
  },
});
