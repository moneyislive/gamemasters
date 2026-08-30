/**
 * La pantalla de la ronda: donde se juega.
 *
 * Cambia de piel según la fase. En la sala de espera cuenta de qué va la velada,
 * cómo se juega y te abre el dosier; con la ronda abierta manda elegir sala y
 * enseña lo que encuentras; al cerrarse, calla y te manda a hablar. Es la
 * pantalla que la gente tendrá delante durante dos horas, así que nunca muestra
 * dos cosas a la vez.
 *
 * ES TAMBIÉN LA PUERTA DE ENTRADA, y eso es nuevo. La trama y las reglas vivían
 * dentro del dosier, detrás del secreto y de la coartada de cada cual; ahora
 * están aquí, en el orden en que se necesitan: de qué va esto, cómo se juega y
 * quién eres tú. El dosier se quedó con lo único que no puede leer nadie más.
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
  Plegable,
  Sello,
  Seccion,
  Titulo,
  color,
  espacio,
  radio,
  texto,
} from '../../src/ui';
import { ALTO_BARRA_TOTAL } from '../../src/tema';
import { pantallaDe } from '../../src/pantallas';
import type { SalaVista, VistaJugador } from '../../../shared/live';
import { Foto } from '../../src/foto';

/**
 * LA TRAMA, LAS REGLAS Y EL DOSIER: los tres bloques de entrada a la partida.
 *
 * Los tres vivían en el dosier, uno detrás de otro y detrás de tu papel, y ese
 * era el orden equivocado. La trama y las reglas son de la VELADA, no tuyas: las
 * lee todo el mundo, dicen lo mismo para todos y se leen una vez, al principio.
 * Tenerlas dentro del documento confidencial obligaba a atravesar tu secreto y
 * tu coartada para llegar a «¿de qué va esto?», que es la primera pregunta que
 * se hace quien acaba de sentarse.
 *
 * Así que están aquí, que es la pestaña por la que se entra: primero de qué va,
 * luego cómo se juega, y al final la puerta a lo único que es tuyo.
 */
function LaTrama({ vista }: { vista: VistaJugador }): JSX.Element {
  return (
    <Marco tono="papel">
      <Etiqueta style={{ color: color.burdeos700 }}>Lo que ha pasado</Etiqueta>
      <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
        {vista.caso.sinopsis}
      </Cuerpo>

      {/* Sin victima no hay apartado. Antes salia «La victima · —». */}
      {vista.caso.victima ? (
        <View style={estilos.apartadoPapel}>
          <Etiqueta style={{ color: color.burdeos700 }}>
            La víctima · {vista.caso.victima.nombre}
          </Etiqueta>
          <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
            {vista.caso.victima.descripcion}
          </Cuerpo>
        </View>
      ) : null}

      <View style={estilos.apartadoPapel}>
        <Etiqueta style={{ color: color.burdeos700 }}>Dónde estáis</Etiqueta>
        <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
          {vista.caso.ambientacion}
        </Cuerpo>
      </View>
    </Marco>
  );
}

/**
 * Las reglas, en un solo bloque plegado.
 *
 * En el dosier iban en doce marcos separados, uno por regla, y ocupaban más
 * pantalla que todo lo demás junto. Se leen enteras una vez y después se
 * consulta una: apiladas dentro de una hoja de papel, con su título en versales,
 * se recorren de un vistazo sin sepultar nada.
 */
function ComoSeJuega({ reglas, abierto }: { reglas: string[]; abierto?: boolean }): JSX.Element {
  return (
    <Plegable
      etiqueta="Cómo se juega"
      resumen="Aunque nunca hayas jugado, con esto te basta."
      abierto={abierto}
    >
      <Marco tono="papel">
        {reglas.map((regla, i) => {
          const punto = regla.indexOf('. ');
          const titulo = punto > 0 ? regla.slice(0, punto) : `Regla ${i + 1}`;
          const cuerpo = punto > 0 ? regla.slice(punto + 2) : regla;
          return (
            <View key={i} style={i === 0 ? undefined : estilos.apartadoPapel}>
              <Etiqueta style={{ color: color.burdeos700 }}>{titulo}</Etiqueta>
              <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>{cuerpo}</Cuerpo>
            </View>
          );
        })}
      </Marco>
    </Plegable>
  );
}

/** La puerta al dosier. Va SIEMPRE al final: es lo último que se lee de aquí. */
function EnlaceAlDosier({
  nombre,
  papel,
}: {
  nombre: string;
  papel: string;
}): JSX.Element {
  return (
    <Marco>
      <Etiqueta>Y tú, en todo esto</Etiqueta>
      <Titulo style={{ fontSize: 24, marginTop: 4 }}>{nombre}</Titulo>
      <Cuerpo tenue style={{ marginTop: 4 }}>{papel}</Cuerpo>
      <Boton
        variante="primario"
        onPress={() => router.push('/(juego)/personaje')}
        style={{ marginTop: espacio.lg }}
      >
        Abrir tu dosier
      </Boton>
    </Marco>
  );
}

export default function Ronda(): JSX.Element {
  const { vista, cargando, error, aplicarVista } = usePartida();
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [errorSala, setErrorSala] = useState<string | null>(null);
  const [avisando, setAvisando] = useState(false);

  /*
   * ¿ESTE JUEGO TRAE SU PROPIA PANTALLA DE RONDA? Se pregunta a la tabla, no con
   * un `if` por juego. Aquí había uno por cada uno —«si es la momia, la vigilia;
   * si son las sombras, la hora»— y ese era el sitio donde un juego nuevo se
   * olvida: sin su línea, la pestaña «donde se juega» pinta la ronda de CLUEDO
   * —elegir sala, ver pistas, acusar— y la partida se juega como CLUEDO desde el
   * móvil aunque todo lo demás sea suyo. Nadie ve un error.
   *
   * VA AQUÍ Y NO ANTES: los tres `useState` de arriba tienen que ejecutarse
   * siempre. React identifica los hooks por su orden de llamada, así que un
   * `return` por encima de ellos haría que el número de hooks cambiara entre una
   * partida de CLUEDO y una de la Momia, y React tiraría la pantalla entera.
   */
  const Propia = pantallaDe(vista?.sesion.juego, 'ronda');
  if (Propia) return <Propia />;

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

        {/*
          EL ORDEN DE LECTURA DE UNA VELADA QUE EMPIEZA: de qué va, cómo se
          juega, quién eres. Estaba al revés —primero el botón del dosier, y la
          sinopsis debajo en un recuadro pequeño— y con doce personas leyendo a
          la vez el resultado era que nadie sabía de qué iba la partida hasta que
          alguien lo preguntaba en voz alta.
        */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Seccion>La trama</Seccion>
          <LaTrama vista={vista} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(260).duration(500)}>
          <ComoSeJuega reglas={vista.caso.reglas} abierto />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(320).duration(500)}>
          <EnlaceAlDosier nombre={yo.characterName} papel={yo.role} />
        </Animated.View>

        <Ornamento />

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
                Esto lo has visto tú y nadie más. Qué significa es cosa tuya, y contarlo o no
                también. Al cerrar la ronda se queda guardado en tus pistas.
              </Cuerpo>
            </>
          )}
        </>
      ) : (
        <Marco>
          <Cuerpo>
            Lo que encontraste en tu sala es tuyo: nadie más lo ha visto, y nadie lo verá si no lo
            cuentas. Es el momento de hablar y de decidir qué enseñas, qué insinúas y qué te callas.
          </Cuerpo>
          <Boton onPress={() => router.push('/(juego)/cuaderno')} style={{ marginTop: espacio.lg }}>
            Ver tus pistas
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

      {/*
        LO QUE SE LEYÓ AL EMPEZAR, SIN IRSE DE LA PESTAÑA.

        Plegados y al final: durante una ronda con el reloj corriendo lo que
        manda es la lista de salas, y estos dos bloques desplegados la habrían
        empujado fuera de la primera pantalla. Pero tienen que seguir estando —a
        media velada alguien pregunta siempre «¿cuántas veces puedo cambiarme?»—
        y mandar a buscarlos a otra pestaña es mandar a que nadie los encuentre.
      */}
      <Ornamento />
      <Plegable etiqueta="La trama" resumen={vista.caso.sinopsis}>
        <LaTrama vista={vista} />
      </Plegable>
      <ComoSeJuega reglas={vista.caso.reglas} />
      <Boton onPress={() => router.push('/(juego)/personaje')} style={{ marginTop: espacio.sm }}>
        Abrir tu dosier
      </Boton>

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
  /* Separador entre dos apartados de una misma hoja de papel. */
  apartadoPapel: {
    marginTop: espacio.md,
    paddingTop: espacio.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(109,26,42,0.22)',
  },
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
