/**
 * Los hechos: lo que sabe todo el mundo y nadie discute.
 *
 * ESTA PANTALLA ERA EL TABLÓN COMÚN, y ha perdido justo la mitad que no debía
 * existir. Al cerrar cada ronda, las pistas de todas las salas que hubiera
 * pisado cualquiera se volcaban aquí para todos: daba igual dónde hubieras
 * entrado, porque un minuto después lo tenías todo. Contar lo que habías visto
 * no le servía a nadie, y con ello se iba la mitad de la conversación de la
 * mesa. Lo que se encuentra en una sala es ahora de quien lo encuentra, y vive
 * en la pestaña de Pistas, que es privada.
 *
 * Aquí queda lo que de verdad es público: la cronología de la velada y las
 * revelaciones que se van estableciendo al cerrar cada ronda. Es el suelo firme
 * de la investigación —lo único sobre lo que no cabe discutir— y por eso tiene
 * pantalla propia en vez de repartirse por las demás.
 */
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { usePartida } from '../estado';
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
} from '../ui';
import { leerBloqueDePistas } from '../../../shared/mecanicas/pistas';

/*
 * ═══ ESTA PANTALLA ES DE CLUEDO, Y POR ESO VIVE AQUI ═══
 *
 * Estaba en `app/(juego)/`, que es el enrutador: el sitio de las pantallas de
 * la PLATAFORMA. Y no lo era: solo CLUEDO declara esta pestana en su barra, y
 * lo que pinta —pistas, hechos establecidos— solo existe en CLUEDO.
 *
 * Mientras estuvo ahi, la ruta se llevaba la pantalla de CLUEDO para cualquier
 * juego que declarase una pestana con ese nombre, sin avisar. Ahora la
 * plataforma dispatcha por la tabla de `src/pantallas.ts`, igual que con la
 * ronda y el desenlace, y dos juegos pueden tener cada uno la suya.
 */
export function Hechos(): JSX.Element {
  const { vista } = usePartida();
  if (!vista) return <Pantalla><Cargando /></Pantalla>;

  /*
   * Las revelaciones, de la más reciente a la más antigua. Es material público
   * —el mismo que quien dirige va pegando en el cartel de la línea temporal— y
   * el servidor no manda la de una ronda hasta que esa ronda ha cerrado.
   *
   * En orden inverso porque lo que se busca al abrir esta pantalla es lo último
   * que se ha establecido, no el principio de la noche: eso ya se sabe.
   */
  /*
   * Los hechos vienen en el bloque de CLUEDO, no en la vista comun: alli
   * estaban al lado de la fase y de quien esta sentado, y llegaban vacios a los
   * dos juegos que no tienen linea temporal publica.
   */
  const estado = leerBloqueDePistas(vista.estadoDelJuego);
  const revelaciones = [...(estado?.hechos ?? [])].sort((a, b) => b.round - a.round);

  return (
    <Pantalla>
      <Titulo style={{ fontSize: 24, marginTop: espacio.md }}>Los hechos</Titulo>
      <Cuerpo tenue style={{ marginBottom: espacio.lg }}>
        Lo que ocurrió delante de todos. Aquí no hay secretos ni interpretaciones: es la versión
        que la mesa entera comparte, y sobre esto no se discute.
      </Cuerpo>

      <Seccion>Lo que se ha ido estableciendo</Seccion>
      {revelaciones.length === 0 ? (
        <Marco>
          <Cuerpo tenue>
            Todavía nada. Al cerrar cada ronda se dará por probado un trozo más de lo que pasó
            aquella noche, y aparecerá aquí.
          </Cuerpo>
        </Marco>
      ) : (
        revelaciones.map((h, i) => (
          <Animated.View key={`${h.round}-${h.time}`} entering={FadeInUp.delay(50 * i).duration(420)}>
            <Marco tono="papel">
              <Etiqueta style={{ color: color.burdeos700 }}>
                Al cerrar la ronda {h.round} · {h.time}
              </Etiqueta>
              <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>{h.fact}</Cuerpo>
            </Marco>
          </Animated.View>
        ))
      )}

      <Ornamento />

      <Seccion>Lo que vio todo el mundo</Seccion>
      <Cuerpo tenue style={{ fontSize: 15, marginBottom: espacio.md }}>
        La cronología de la velada. El hueco que falta es la partida.
      </Cuerpo>
      {vista.cronologia.length === 0 ? (
        <Marco>
          <Cuerpo tenue>Esta velada no tiene hechos públicos registrados.</Cuerpo>
        </Marco>
      ) : (
        <Marco tono="papel">
          {vista.cronologia.map((m, i) => (
            <View
              key={i}
              style={[
                estilos.momento,
                i === vista.cronologia.length - 1 && estilos.momentoUltimo,
              ]}
            >
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
  momento: {
    flexDirection: 'row',
    gap: espacio.md,
    paddingVertical: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(62,39,35,0.18)',
  },
  momentoUltimo: { borderBottomWidth: 0 },
  hora: {
    fontFamily: 'Cinzel_600SemiBold',
    color: color.burdeos700,
    fontSize: 15,
    width: 58,
  },
});
