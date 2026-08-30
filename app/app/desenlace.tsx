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
import { pantallaDe } from '../src/pantallas';
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
import { conAlfa, useTema } from '../src/tema-juego';

export default function Desenlace(): JSX.Element {
  const { vista } = usePartida();
  const [paso, setPaso] = useState(0);
  const t = useTema();

  /*
   * LA MOMIA TIENE SU PROPIA PANTALLA, y se desvía aquí por el mismo sitio y
   * por el mismo motivo que la vigilia se desvía en `ronda.tsx`: lo de abajo
   * está construido sobre lo único que la plataforma sabe de un final —alguien
   * acertó quién, con qué y dónde, y ganó por llegar antes— y este juego no
   * acaba así. Enseñárselo decía «El sobre del crimen» y cerraba con «el crimen
   * queda impune» en una velada que puede haber ganado la expedición entera.
   *
   * VA DESPUÉS DE TODOS LOS HOOKS Y ANTES DE CUALQUIER OTRA COSA, y el orden no
   * es un detalle de estilo: un `return` colado ENTRE dos hooks cambia cuántos
   * se ejecutan según el juego, y React tira la pantalla entera con el error
   * 300 en el momento más caro de la noche. Costó verlo porque el fallo no es
   * de la rama nueva: es de la vieja, que deja de contar igual.
   */
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  /*
   * Se pregunta a la tabla de `src/pantallas.ts`, no con un `if` por juego. Aquí
   * había uno por cada uno, y con el de la ronda hacían cuatro sitios repartidos
   * donde un juego nuevo tiene que acordarse de entrar. El Paso de las Sombras
   * tiene el suyo por un motivo propio, además: allí se puede PERDER habiendo
   * acertado la senda —si el rastro llegó al tope— y no gana una persona, gana un
   * bando. La clasificación por aciertos de abajo contaría otra partida.
   */
  const Propio = pantallaDe(vista?.sesion.juego, 'desenlace');
  if (Propio) return <Propio />;

  if (!vista) return <Pantalla><Cargando /></Pantalla>;
  const fin = vista.desenlace;
  if (!fin) {
    return (
      <Pantalla barra={false}>
        <Marco>
          <Cuerpo>Todavía no se ha abierto el sobre del crimen.</Cuerpo>
          <Boton onPress={() => router.back()} style={{ marginTop: espacio.lg }}>
            Volver
          </Boton>
        </Marco>
      </Pantalla>
    );
  }

  const gane = fin.ganador?.participanteId === vista.yo.participanteId;
  const eraYo = fin.senaladoId === vista.yo.participanteId;
  // El primer eje del juego es el que abre el sobre; el resto se lee debajo.
  // En CLUEDO eso es «fue Fulano, con el candelabro, en la cocina», pero la
  // pantalla ya no sabe que son tres ni cómo se llaman.
  const [principal, ...secundarias] = fin.respuestas;

  return (
    <Pantalla barra={false}>
      <Animated.View entering={FadeInDown.duration(700)} style={{ alignItems: 'center', paddingTop: espacio.lg }}>
        <Sello>El sobre del crimen</Sello>
      </Animated.View>

      <Ornamento />

      <Animated.View entering={FadeIn.delay(300).duration(800)}>
        <Marco tono="peligro">
          <Etiqueta style={{ color: '#f0c9c0', textAlign: 'center' }}>Fue</Etiqueta>
          <Titulo style={{ textAlign: 'center', fontSize: 30, marginTop: espacio.sm }}>
            {principal?.nombre ?? ''}
          </Titulo>
          {secundarias.length > 0 && (
            <Cuerpo style={{ textAlign: 'center', marginTop: espacio.md, fontSize: 19 }}>
              {secundarias.map((r, i) => (
                <Cuerpo key={r.ejeId} style={{ fontSize: 19 }}>
                  {i > 0 ? '\n' : ''}
                  {r.rotulo.toLowerCase()}: {r.nombre}
                </Cuerpo>
              ))}
            </Cuerpo>
          )}
          {eraYo && (
            <Cuerpo style={{ textAlign: 'center', marginTop: espacio.md, color: t.oro300 }}>
              Eras tú. {fin.ganador ? 'Te pillaron.' : 'Y nadie te descubrió.'}
            </Cuerpo>
          )}
        </Marco>
      </Animated.View>

      {paso >= 1 && (
        <>
          {/* Sin motivo no hay apartado: antes salia el marco vacio. */}
          {fin.motive ? (
            <Animated.View entering={FadeInUp.duration(600)}>
              <Marco tono="papel">
                <Etiqueta style={{ color: t.burdeos700 }}>El motivo</Etiqueta>
                <Cuerpo style={{ color: t.caoba700, marginTop: espacio.sm }}>{fin.motive}</Cuerpo>
              </Marco>
            </Animated.View>
          ) : null}
          <Animated.View entering={FadeInUp.delay(140).duration(600)}>
            <Marco tono="papel">
              <Etiqueta style={{ color: t.burdeos700 }}>Cómo ocurrió</Etiqueta>
              <Cuerpo style={{ color: t.caoba700, marginTop: espacio.sm }}>
                {fin.reconstruccion}
              </Cuerpo>
            </Marco>
          </Animated.View>
        </>
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
          {/*
            El resalte de quien gana va EN LÍNEA y no en la hoja de estilos: la
            hoja se construye al importar el módulo, que es antes de que exista
            ninguna partida, así que ahí no se puede saber a qué se juega. Era el
            oro de CLUEDO enmarcando al ganador de cualquier juego.
          */}
          {fin.ganador ? (
            <Marco
              style={
                gane
                  ? { borderColor: t.oro300, backgroundColor: conAlfa(t.oro500, 0.14) }
                  : undefined
              }
            >
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
            <View key={c.participanteId} style={estilos.fila}>
              <Cuerpo style={estilos.puesto}>{i + 1}</Cuerpo>
              <Cuerpo style={{ flex: 1, fontSize: 17 }}>{c.displayName}</Cuerpo>
              <Cuerpo
                style={{
                  color: c.acerto ? t.oro300 : t.pergaminoTenue,
                  fontFamily: 'Cinzel_600SemiBold',
                  fontSize: 15,
                }}
              >
                {/*
                  El total sale de cuántas respuestas trae el desenlace, no de
                  un 3 escrito a mano. CLUEDO tiene tres ejes —culpable, objeto
                  y lugar— pero el motor ya sostiene juegos con dos, y allí un
                  «2/3» sería mentira. El servidor garantiza un renglón por eje.
                */}
                {c.at ? `${c.aciertos}/${fin.respuestas.length}` : 'sin acusar'}
              </Cuerpo>
            </View>
          ))}

          {fin.epilogo && (
            <>
              <Ornamento />
              <Marco tono="papel">
                <Etiqueta style={{ color: t.burdeos700 }}>Epílogo</Etiqueta>
                <Cuerpo style={{ color: t.caoba700, marginTop: espacio.sm }}>
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
