/**
 * La pantalla de la ronda: donde se juega.
 *
 * Cambia de piel según la fase. En la sala de espera invita a mirar tu
 * personaje; con la ronda abierta manda elegir sala y enseña lo que encuentras;
 * al cerrarse, calla y te empuja al tablón. Es la pantalla que la gente tendrá
 * delante durante dos horas, así que nunca muestra dos cosas a la vez.
 *
 * ═══ Y CUANDO NO ES CLUEDO ═══
 *
 * Todo lo de abajo es de CLUEDO: salas, pistas, tablón, acusar. La Momia usa
 * esta misma pestaña —es «la pantalla donde se juega», y eso lo tienen los dos—
 * pero dentro no se parece en nada: cámaras profanadas, marcas, amuletos y
 * dones. Así que se bifurca ARRIBA, en una línea, y lo de la Momia vive entero
 * en `src/momia/vigilia.tsx`.
 *
 * POR QUÉ ASÍ Y NO CON `if` REPARTIDOS. Porque la regla que manda es que CLUEDO
 * no cambie de comportamiento, y un fichero con dos juegos entrelazados la
 * incumple tarde o temprano sin que nadie lo note: se toca un marco para la
 * Momia y se mueve un píxel de CLUEDO tres fases más abajo. Con la bifurcación
 * en la primera línea, todo lo que sigue es CLUEDO y solo CLUEDO, y se puede
 * leer sin tener el otro juego en la cabeza. El precio es un fichero más; la
 * alternativa era uno de mil líneas donde cada arreglo es un riesgo.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import { Reloj } from '../../src/reloj';
import { AvisoDeLaPartida } from '../../src/conexion';
import { PanelDeAcciones } from '../../src/acciones';
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
  Seccion,
  Titulo,
  color,
  espacio,
  radio,
  texto,
} from '../../src/ui';
import { ALTO_BARRA_TOTAL } from '../../src/tema';
import { Vigilia } from '../../src/momia/vigilia';
import { Hora } from '../../src/sombras/hora';
import type { SalaVista } from '../../../shared/live';
import { Foto } from '../../src/foto';

export default function Ronda(): JSX.Element {
  const { vista, cargando, error, aplicarVista } = usePartida();
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [errorSala, setErrorSala] = useState<string | null>(null);
  const [avisando, setAvisando] = useState(false);

  /*
   * La bifurcación por juego, y va AQUÍ y no antes: los tres `useState` de
   * arriba tienen que ejecutarse siempre. React identifica los hooks por su
   * orden de llamada, así que un `return` por encima de ellos haría que el
   * número de hooks cambiara entre una partida de CLUEDO y una de la Momia y
   * React tiraría la pantalla entera. Son tres líneas de coste y ninguna
   * consecuencia: la Momia no las usa y CLUEDO las usa igual que siempre.
   */
  if (vista?.sesion.juego === 'momia') return <Vigilia />;
  /*
   * Y la de El Paso de las Sombras, por lo mismo. La bifurcación se queda en una
   * línea por juego: en cuanto haya que escribir un `if` dentro del cuerpo,
   * empezará a moverse un píxel de CLUEDO cada vez que se toque otro juego.
   */
  if (vista?.sesion.juego === 'sombras') return <Hora />;

  if (cargando && !vista) return <Pantalla><Cargando texto="Buscando la partida…" /></Pantalla>;
  if (!vista) {
    return (
      <Pantalla>
        <AvisoError>{error ?? 'No hay ninguna partida activa.'}</AvisoError>
        <Boton onPress={() => router.replace('/')}>Volver a entrar</Boton>
      </Pantalla>
    );
  }

  const { sesion, yo, salas, misPistas, miSala, narracion } = vista;

  const avisar = async (listo: boolean): Promise<void> => {
    setErrorSala(null);
    setAvisando(true);
    try {
      const r = await api.avisarListo(listo);
      aplicarVista(r.vista);
    } catch (e) {
      setErrorSala(e instanceof Error ? e.message : 'No se pudo avisar.');
    } finally {
      setAvisando(false);
    }
  };

  const elegir = async (sala: SalaVista): Promise<void> => {
    setErrorSala(null);
    setEligiendo(sala.id);
    try {
      const r = await api.elegirSala(sala.id);
      aplicarVista(r.vista);
    } catch (e) {
      setErrorSala(e instanceof Error ? e.message : 'No se pudo entrar en esa sala.');
    } finally {
      setEligiendo(null);
    }
  };

  // ---- Sala de espera ----
  if (sesion.phase === 'lobby') {
    return (
      <Pantalla>
        <Animated.View entering={FadeInDown.duration(500)} style={estilos.centro}>
          <Sello>Sala de espera</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            {sesion.tituloPartida}
          </Titulo>
          <Cuerpo tenue style={{ textAlign: 'center', fontStyle: 'italic', marginTop: 4 }}>
            {sesion.lema}
          </Cuerpo>
        </Animated.View>

        <Ornamento />

        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Marco>
            <Etiqueta>Eres</Etiqueta>
            <Titulo style={{ fontSize: 24, marginTop: 4 }}>{yo.characterName}</Titulo>
            <Cuerpo tenue style={{ marginTop: 4 }}>{yo.role}</Cuerpo>
            <Boton
              variante="primario"
              onPress={() => router.push('/(juego)/personaje')}
              style={{ marginTop: espacio.lg }}
            >
              Leer tu dosier
            </Boton>
          </Marco>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(280).duration(500)}>
          <Marco tono="papel">
            <Etiqueta style={{ color: color.burdeos700 }}>Lo que ha pasado</Etiqueta>
            <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
              {vista.caso.sinopsis}
            </Cuerpo>
          </Marco>
        </Animated.View>

        {/* Avisar de que estás listo. No abre la ronda —eso lo decide quien
            dirige— pero le ahorra ir preguntando uno por uno. */}
        <Animated.View entering={FadeInUp.delay(360).duration(500)}>
          <Marco style={yo.pediEmpezar ? estilos.marcoListo : undefined}>
            <Etiqueta style={{ textAlign: 'center' }}>
              {sesion.listos} de {sesion.total} ya están listos
            </Etiqueta>
            <Cuerpo tenue style={{ textAlign: 'center', marginTop: 6, fontSize: 16 }}>
              {yo.pediEmpezar
                ? 'Has avisado. La partida arrancará en cuanto quien dirige la abra.'
                : 'Avisa cuando te hayas leído el papel y estés en la mesa.'}
            </Cuerpo>
            <Boton
              variante={yo.pediEmpezar ? 'secundario' : 'primario'}
              cargando={avisando}
              onPress={() => void avisar(!yo.pediEmpezar)}
              style={{ marginTop: espacio.lg }}
            >
              {yo.pediEmpezar ? 'Todavía no, espera' : 'Estoy listo · que empiece'}
            </Boton>
          </Marco>
        </Animated.View>

        {/* En la sala de espera es cuando más gente se pierde: acaban de
            sentarse, no han jugado nunca y todavía no saben ni de qué va. El
            Mayordomo está en la barra a todas horas, pero aquí conviene que se
            vea escrito y con sitio de sobra. */}
        <Animated.View entering={FadeInUp.delay(440).duration(500)}>
          <Marco>
            <Etiqueta>¿Primera vez?</Etiqueta>
            <Cuerpo tenue style={{ marginTop: 6, fontSize: 16 }}>
              El Mayordomo te explica las reglas y te ayuda a meterte en tu papel. No sabe quién
              fue, así que ni lo intentes.
            </Cuerpo>
            <Boton onPress={() => router.push('/consejero')} style={{ marginTop: espacio.lg }}>
              Preguntar al Mayordomo
            </Boton>
          </Marco>
        </Animated.View>

        <AvisoError>{errorSala}</AvisoError>

      </Pantalla>
    );
  }

  // ---- Entre jornadas ----
  // Una campaña se levanta de la mesa sin terminar. Sin esta rama, la pantalla
  // caía en la de «ronda cerrada» y decía que fueran al tablón, cuando lo que
  // toca es leer lo que pasó y esperar al sábado que viene.
  if (sesion.phase === 'intermedio') {
    return (
      <Pantalla>
        <Animated.View entering={FadeInDown.duration(500)} style={estilos.centro}>
          <Sello>Hasta la próxima</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            Se levanta la mesa
          </Titulo>
          <Cuerpo tenue style={{ textAlign: 'center', marginTop: 4 }}>
            La partida sigue viva. Quien dirige la retomará.
          </Cuerpo>
        </Animated.View>

        <Ornamento />

        {vista.cronica.length === 0 ? (
          <Marco>
            <Cuerpo tenue>Todavía no hay nada apuntado de esta jornada.</Cuerpo>
          </Marco>
        ) : (
          [...vista.cronica].reverse().map((e, i) => (
            <Animated.View key={e.encuentro} entering={FadeInUp.delay(80 * i).duration(460)}>
              <Marco tono="papel">
                <Etiqueta style={{ color: color.burdeos700 }}>Jornada {e.encuentro}</Etiqueta>
                <Cuerpo style={{ color: color.caoba700, fontFamily: 'Cinzel_600SemiBold', marginTop: 4 }}>
                  {e.titulo}
                </Cuerpo>
                <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
                  {e.resumen || 'Sin resumen.'}
                </Cuerpo>
              </Marco>
            </Animated.View>
          ))
        )}
      </Pantalla>
    );
  }

  // ---- Desenlace ----
  if (sesion.phase === 'desenlace') {
    return (
      <Pantalla>
        <Animated.View entering={FadeIn.duration(600)} style={estilos.centro}>
          <Sello>Se ha abierto el sobre</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>El desenlace</Titulo>
        </Animated.View>
        <Ornamento />
        <Boton variante="primario" onPress={() => router.push('/desenlace')}>
          Ver quién fue
        </Boton>
      </Pantalla>
    );
  }

  // ---- Acusaciones ----
  if (sesion.phase === 'acusaciones') {
    const yaAcuso = Boolean(vista.miAcusacion);
    return (
      <Pantalla>
        <Animated.View entering={FadeInDown.duration(500)} style={estilos.centro}>
          <Sello>Momento de la verdad</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            {yaAcuso ? 'Tu acusación está entregada' : 'Acusa'}
          </Titulo>
        </Animated.View>
        <Ornamento />
        <Marco tono={yaAcuso ? 'oscuro' : 'peligro'}>
          <Cuerpo>
            {yaAcuso
              ? 'Ya no se puede cambiar. Ahora toca esperar a que se abra el sobre del crimen y ver quién estuvo más cerca.'
              : 'Una sola combinación: quién, con qué y dónde. No podrás cambiarla, y gana quien acierte primero.'}
          </Cuerpo>
          {!yaAcuso && (
            <Boton
              variante="peligro"
              onPress={() => router.push('/acusar')}
              style={{ marginTop: espacio.lg }}
            >
              Escribir mi acusación
            </Boton>
          )}
        </Marco>
      </Pantalla>
    );
  }

  // ---- Ronda abierta o cerrada ----
  const abierta = sesion.phase === 'ronda-abierta';

  return (
    <>
    <Pantalla reserva={ALTO_ACUSAR}>
      <AvisoDeLaPartida />
      <View style={estilos.cabeceraRonda}>
        <View style={{ flex: 1 }}>
          <Etiqueta>
            Ronda {sesion.round} de {sesion.totalRounds}
          </Etiqueta>
          <Titulo style={{ fontSize: 24, marginTop: 2 }}>
            {abierta ? (miSala ? 'Estás investigando' : 'Elige dónde entrar') : 'Ronda cerrada'}
          </Titulo>
        </View>
        {abierta && <Reloj terminaEn={sesion.roundEndsAt} ahoraServidor={sesion.ahora} />}
      </View>

      {narracion && (
        <Animated.View entering={FadeInDown.duration(500)}>
          <Marco tono="papel">
            <Etiqueta style={{ color: color.burdeos700 }}>{narracion.title}</Etiqueta>
            <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
              {narracion.text}
            </Cuerpo>
          </Marco>
        </Animated.View>
      )}

      <AvisoError>{errorSala}</AvisoError>

      {abierta ? (
        <>
          <Seccion>{miSala ? 'Puedes cambiarte una vez' : 'Salas'}</Seccion>
          {salas.map((sala, i) => {
            const dentro = miSala === sala.id;
            return (
              <Animated.View
                key={sala.id}
                entering={FadeInUp.delay(60 * i).duration(400)}
                layout={Layout.springify()}
              >
                <Pressable
                  onPress={() => void elegir(sala)}
                  disabled={dentro || eligiendo !== null}
                  style={({ pressed }) => [
                    estilos.sala,
                    dentro && estilos.salaDentro,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Foto
                    url={sala.photoUrl}
                    style={estilos.salaFoto}
                    respaldo={
                      <View style={[estilos.salaFoto, estilos.salaFotoVacia]}>
                        <Cuerpo tenue style={{ fontSize: 22 }}>⌂</Cuerpo>
                      </View>
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Cuerpo style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 17 }}>
                      {sala.name}
                    </Cuerpo>
                    <Cuerpo tenue style={{ fontSize: 15 }}>
                      {sala.ocupantes === 0
                        ? 'No hay nadie'
                        : sala.ocupantes === 1
                          ? 'Hay alguien dentro'
                          : `${sala.ocupantes} personas dentro`}
                    </Cuerpo>
                  </View>
                  {dentro && <Cuerpo style={{ color: color.oro300, fontSize: 20 }}>✓</Cuerpo>}
                </Pressable>
              </Animated.View>
            );
          })}

          {misPistas.length > 0 && (
            <>
              <Ornamento />
              <Seccion>Lo que encuentras aquí</Seccion>
              {misPistas.map((pista, i) => (
                <Animated.View key={pista.id} entering={FadeInUp.delay(120 * i).duration(520)}>
                  <Marco tono="papel">
                    <Etiqueta style={{ color: color.burdeos700 }}>{pista.roomName}</Etiqueta>
                    <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
                      {pista.description}
                    </Cuerpo>
                  </Marco>
                </Animated.View>
              ))}
              <Cuerpo tenue style={{ fontStyle: 'italic', fontSize: 15 }}>
                Qué significa es cosa tuya. Al cerrar la ronda pasará al tablón común.
              </Cuerpo>
            </>
          )}
        </>
      ) : (
        <Marco>
          <Cuerpo>
            Todo lo que se ha encontrado esta ronda está ya en el tablón común. Es el momento de
            hablar: contrasta lo tuyo con lo de los demás antes de que empiece la siguiente.
          </Cuerpo>
          <Boton onPress={() => router.push('/(juego)/tablon')} style={{ marginTop: espacio.lg }}>
            Ir al tablón
          </Boton>
        </Marco>
      )}

      {/* Lo que el juego permita hacer y no tenga pantalla propia. En CLUEDO
          suele estar vacío —entrar en una sala ya tiene la suya, más rica— y
          en un juego nuevo es lo que lo hace jugable el primer día. */}
      <PanelDeAcciones
        acciones={vista.acciones.filter((a) => a.id !== 'entrar-en-sala' && a.id !== 'acusar')}
        alHacer={aplicarVista}
      />

    </Pantalla>
    <BarraDeAcusar yaAcuso={Boolean(vista.miAcusacion)} />
    </>
  );
}

/**
 * ACUSAR, SIEMPRE A LA VISTA.
 *
 * Antes había que esperar a que quien dirige abriera una «ronda de
 * acusaciones», y eso convertía en cola lo que es una carrera: gana quien
 * acierta ANTES. Si hay que pedir vez, arriesgarse pronto no premia y esperar
 * no cuesta, así que todo el mundo acusa a la vez al final y la decisión —el
 * único momento en que se apuesta algo— deja de existir.
 *
 * ANCLADA, NO AL FINAL DEL SCROLL. La pantalla de ronda se desplaza, y la lista
 * de salas es larga: puesta al final, «siempre disponible» sería «disponible
 * para quien se acuerde de bajar». Aquí no se puede no verla.
 *
 * ENCIMA DE LAS PESTAÑAS, sin invadirlas: `ALTO_BARRA_TOTAL` incluye el saliente
 * del botón del asistente, que es la parte que más arriba llega. Restándole solo
 * `ALTO_BARRA` se solaparía justo con ese botón —el único redondo y el más
 * pulsado de la app.
 *
 * Y ENTREGADA NO ES INVISIBLE: cuando ya se ha acusado, la barra se queda
 * diciéndolo en vez de desaparecer. Un control que se esfuma deja la duda de si
 * llegó a enviarse, y esa duda en mitad de una velada se resuelve preguntando en
 * voz alta —que es exactamente lo que arruina el secreto.
 */
const ALTO_ACUSAR = 78;

function BarraDeAcusar({ yaAcuso }: { yaAcuso: boolean }): JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInUp.duration(400)}
      style={[estilos.barraAcusar, { bottom: ALTO_BARRA_TOTAL + insets.bottom }]}
    >
      <View style={{ flex: 1 }}>
        <Etiqueta style={{ color: yaAcuso ? color.laton : '#f0c9c0' }}>
          {yaAcuso ? 'Tu acusación' : 'Cuando lo tengas claro'}
        </Etiqueta>
        <Cuerpo tenue style={{ fontSize: 13, marginTop: 2 }}>
          {yaAcuso ? 'Entregada. Ya no se puede cambiar.' : 'Una sola vez. Gana quien acierte antes.'}
        </Cuerpo>
      </View>
      {!yaAcuso && (
        <Boton variante="peligro" onPress={() => router.push('/acusar')}>
          Acusar
        </Boton>
      )}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingTop: espacio.xl },
  barraAcusar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ALTO_ACUSAR,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingHorizontal: espacio.lg,
    borderTopWidth: 1,
    borderTopColor: color.burdeos600,
    // Opaca a propósito: debajo pasa el scroll, y con fondo translúcido el
    // texto de las salas se leería a través de la barra.
    backgroundColor: '#2a0f16',
  },
  marcoListo: {
    borderColor: color.oro400,
    backgroundColor: 'rgba(201,162,39,0.12)',
  },
  cabeceraRonda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    marginBottom: espacio.lg,
  },
  sala: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.28)',
    backgroundColor: 'rgba(31,18,12,0.55)',
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  salaDentro: {
    borderColor: color.oro400,
    backgroundColor: 'rgba(201,162,39,0.14)',
  },
  salaFoto: { width: 52, height: 52, borderRadius: radio.sm },
  salaFotoVacia: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,23,16,0.7)',
  },
});
