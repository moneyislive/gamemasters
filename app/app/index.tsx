/**
 * La portada: se abre la app y se entra en un mundo.
 *
 * LA ESCENA. Arriba no hay una cabecera: hay una noche. Una mansión con las
 * ventanas encendidas, luna con halo, niebla cruzando, un relámpago cada tanto
 * y polvo dorado subiendo. Al hacer scroll las capas se separan en parallax y
 * el título se hunde en la escena. Todo corre en el hilo de la interfaz
 * (Reanimated + SVG): espectacular no puede significar «a tirones».
 *
 * EL ORDEN DEL CONTENIDO es el de la urgencia de quien mira:
 *
 *   1. Tu partida EN MARCHA, con su latido. Nada compite con lo que está vivo.
 *   2. Las invitaciones, como sobres lacrados. «Serás el mayordomo» mueve más
 *      que «tienes 1 invitación».
 *   3. LOS MUNDOS: el catálogo en un carrusel con perspectiva, cada juego con
 *      su paleta, su vela y su destello. Cierra con «Forja la tuya».
 *   4. La SALA DE ARCADE (minijuegos): otro color, otra forma, otro mundo.
 *      Nadie puede confundir «una noche con cinco amigos» con «treinta
 *      segundos en el metro».
 *   5. TU LEYENDA: rango con barra de progreso, vitrina de trofeos que brillan.
 *      Si aún no hay cuenta, se enseña la vitrina cerrada: el incentivo es ver
 *      lo que te falta, no un muro de texto.
 *   6. Las dos puertas: entrar con código (siempre, sin cuenta) y el taller.
 *
 * Y UNA REGLA INNEGOCIABLE: nada de lo que se enseña es mentira. Si no hay
 * minijuegos todavía, la sala está «cableándose» y se ve así; no se rellena con
 * cajas muertas. La confianza en el escaparate es el escaparate.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import * as api from '../src/api';
import { usePartida } from '../src/estado';
import { usarMarco } from '../src/marco';
import { CarruselDeMundos, PASO } from '../src/carrusel3d';
import { EscenaAvatar, type ProgresoCompartido } from '../src/escena-avatar';
import { Figura } from '../src/figura';
import { SelloDeCuenta } from '../src/sello-cuenta';
import { FondoDeSalas } from '../src/fondos-sala';
import { AVATAR_POR_DEFECTO, cargarAvatar, type Avatar } from '../src/avatar';
import { Latido, Pulsable, useMenosMovimiento } from '../src/vivo';
import { veladas } from '../src/vitrina';
import { TROFEOS } from '../../shared/live';
import { color, espacio, fuente, radio } from '../src/tema';

/** La fase, dicha como en la mesa. */
const COMO_VA: Record<string, string> = {
  lobby: 'La mesa se está llenando',
  'ronda-abierta': 'Ronda en curso',
  'ronda-cerrada': 'Puesta en común',
  acusaciones: 'Momento de acusar',
  intermedio: 'Entre jornadas',
  desenlace: 'Terminada',
};

/**
 * Los rangos: el incentivo de volver.
 *
 * Salen de las veladas jugadas, que es lo único que de verdad cuesta ganarse:
 * cada una es una noche real con gente real.
 */
const RANGOS: Array<{ desde: number; titulo: string }> = [
  { desde: 0, titulo: 'Recién llegado' },
  { desde: 1, titulo: 'Invitado habitual' },
  { desde: 3, titulo: 'Sabueso de salón' },
  { desde: 6, titulo: 'Maestro de ceremonias' },
  { desde: 10, titulo: 'Leyenda de la mesa' },
];

function rangoDe(jugadas: number): {
  titulo: string;
  siguiente?: { titulo: string; faltan: number; progreso: number };
} {
  let actual = RANGOS[0]!;
  let siguiente: (typeof RANGOS)[number] | undefined;
  for (const r of RANGOS) {
    if (jugadas >= r.desde) actual = r;
    else if (!siguiente) siguiente = r;
  }
  if (!siguiente) return { titulo: actual.titulo };
  const tramo = siguiente.desde - actual.desde;
  return {
    titulo: actual.titulo,
    siguiente: {
      titulo: siguiente.titulo,
      faltan: siguiente.desde - jugadas,
      progreso: tramo <= 0 ? 0 : (jugadas - actual.desde) / tramo,
    },
  };
}

export default function Portada(): JSX.Element {
  const { vista, cargando, refrescar } = usePartida();
  const { width, height } = useWindowDimensions();
  const [portada, setPortada] = useState<api.Portada | null>(null);

  const scrollY = useSharedValue(0);
  const alScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // El hilo que ata el carrusel de abajo al mundo 3D de arriba. El 3D no
  // quiere estado de React —re-render por fotograma sería la muerte— sino un
  // objeto mutable que su bucle lee cuando pinta.
  const scrollCarrusel = useSharedValue(0);
  const progresoRef = useRef<ProgresoCompartido>({ valor: 0 });
  const [indiceActivo, setIndiceActivo] = useState(0);
  const alCambiarProgreso = useCallback((p: number) => {
    progresoRef.current.valor = p;
    const redondo = Math.round(Math.max(p, 0));
    setIndiceActivo((previo) => (previo === redondo ? previo : redondo));
  }, []);
  useAnimatedReaction(
    () => scrollCarrusel.value / PASO,
    (p) => {
      runOnJS(alCambiarProgreso)(p);
    },
  );

  const [avatar, setAvatar] = useState<Avatar>(AVATAR_POR_DEFECTO);
  /** sala → ilustración generada, si el servidor la tiene. */
  const [fondos, setFondos] = useState<Record<string, string>>({});

  const cargarPortada = useCallback(() => {
    if (!api.hayCuenta()) {
      setPortada(null);
      return;
    }
    api
      .pedirPortada()
      .then(setPortada)
      .catch(() => setPortada(null));
  }, []);

  const cargarFigura = useCallback(() => {
    void cargarAvatar().then(setAvatar);
    // Los fondos generados: si el servidor no tiene, los telones aguantan.
    void api
      .pedirFondos()
      .then((r) => setFondos(r.fondos))
      .catch(() => undefined);
  }, []);

  useEffect(cargarPortada, [cargarPortada]);
  useEffect(cargarFigura, [cargarFigura]);
  // Al volver del editor, el avatar puede haber cambiado.
  useFocusEffect(cargarPortada);
  useFocusEffect(cargarFigura);

  const invitaciones = portada?.invitaciones ?? [];
  const jugadas = portada?.cuenta.partidas ?? [];
  const trofeos = portada?.cuenta.trofeos ?? [];
  const rango = rangoDe(jugadas.length);

  const catalogo = veladas();
  /*
   * El mundo 3D llega al borde a propósito —meterle margen dejaría una franja
   * negra que rompe la profundidad— pero la botonera de encima SÍ tiene que
   * apartarse de la hora, la batería y la muesca.
   */
  const marco = usarMarco();

  // Las salas del mundo 3D: una por juego, y la forja como cierre.
  const salas = [...catalogo.map((v) => v.id), 'forja'];

  const altoHero = Math.min(Math.max(height * 0.56, 400), 540);

  const abrirTaller = (): void => void Linking.openURL(api.urlDelTaller());

  /**
   * Canjear una invitación.
   *
   * Si el correo está verificado y la silla libre, se entra sin teclear nada.
   * Si no, el servidor responde `requiereCodigo` —que NO es un error: es el
   * camino de siempre— y se manda a la pantalla de códigos con el sitio ya
   * identificado.
   */
  const entrarDesdeInvitacion = useCallback(
    (inv: api.InvitacionVista) => {
      void (async () => {
        try {
          const r = await api.entrarDesdeInvitacion(inv.gameId, inv.suspectId);
          if (r.requiereCodigo) {
            /*
             * NO SE DESVÍA A LA PANTALLA DE CÓDIGOS. Los dos códigos son el
             * camino de quien juega SIN cuenta, y mandar ahí a quien acaba de
             * identificarse con Google —con el de la partida ya relleno y el
             * personal vacío— es pedirle que vuelva a demostrar lo que ya
             * demostró, sin decirle por qué. Se le lleva a su panel, donde cada
             * mesa explica su estado y qué falta.
             */
            router.push('/partidas');
            return;
          }
          await api.fijarToken(r.token);
          await refrescar();
          router.push('/(juego)/ronda');
        } catch {
          // Si algo falla, al panel: allí se ve el estado de cada mesa.
          router.push('/partidas');
        }
      })();
    },
    [refrescar],
  );

  return (
    <View style={estilos.raiz}>
      <Animated.ScrollView
        onScroll={alScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: espacio.xxl * 2 }}
      >
        {/* ================= LA SALA ================= */}
        {/*
          Arriba no hay una cabecera: hay una habitación en la que TU avatar
          está de pie. Al arrastrar el carrusel de abajo, las salas se deslizan
          a su alrededor mientras él se queda en el centro — la transición está
          atada al dedo, no disparada después.
        */}
        <View style={{ height: altoHero }}>
          <FondoDeSalas
            salas={salas}
            fondos={fondos}
            scrollX={scrollCarrusel}
            ancho={width}
            alto={altoHero}
          />
          {avatar.modeloUrl ? (
            <EscenaAvatar
              ancho={width}
              alto={altoHero}
              modeloUrl={avatar.modeloUrl}
              progreso={progresoRef.current}
            />
          ) : (
            /*
              SIN MODELO 3D SE ENSEÑA LA FIGURA DIBUJADA, no un reclamo.

              Antes aquí había un botón de «FORJA TU AVATAR» flotando en el
              hueco: la única forma de tener cara era subir una foto y esperar
              dos minutos a que Tripo esculpiera. Quien abría la app por primera
              vez —normalmente con prisa, camino de una cena— no era nadie.

              Ahora el primer arranque ya asigna un personaje del elenco, así
              que aquí siempre hay alguien. El lápiz de al lado sigue llevando
              al estudio, donde se cambia de personaje o se esculpe el propio.
            */
            <View style={[estilos.ctaAvatar, { top: altoHero * 0.30 }]} pointerEvents="none">
              <Figura avatar={avatar} tamano={168} conFondo={false} />
            </View>
          )}

          {/* La botonera fantasma: casi transparente, siempre a mano. */}
          <View style={[estilos.botonera, { top: marco.arriba }]} pointerEvents="box-none">
            <Text style={estilos.marcaMini}>GAMEMASTERS</Text>
            <View style={{ flexDirection: 'row', gap: espacio.sm }}>
              <BotonFantasma
                etiqueta="Código"
                accesible="Tengo un código: entrar en una velada"
                onPress={() => router.push('/entrar')}
              >
                <IconoLlave />
              </BotonFantasma>
              <BotonFantasma
                etiqueta="Crear"
                accesible="Crear una velada en el taller"
                onPress={abrirTaller}
              >
                <IconoPluma />
              </BotonFantasma>
              {/*
                EL SELLO VA EL ULTIMO Y CON OTRA FORMA. Iniciar sesion vivia al
                final de la portada, dentro de «Tu leyenda», detras de un enlace
                que decia «Saber mas»: habia que bajar por todo el catalogo sin
                ningun motivo para sospechar que estaba alli. Aqui esta donde la
                gente ya busca, y es un disco con tu figura —no un tercer boton
                fantasma— porque los otros dos son verbos y esto es una persona.
              */}
              <SelloDeCuenta
                avatar={avatar}
                nombre={portada?.cuenta.displayName ?? null}
                correo={portada?.cuenta.email ?? null}
                /*
                  Al entrar o salir se rehacen las DOS cosas: la portada (que
                  trae nombre, trofeos e invitaciones) y la figura (que puede
                  cambiar si la cuenta traía un avatar esculpido). Rehacer solo
                  una deja la pantalla contando dos versiones distintas de quién
                  eres.
                */
                onCambio={() => {
                  cargarPortada();
                  cargarFigura();
                }}
              />
            </View>
          </View>

          {/* El rótulo de la sala en la que estás: cambia con el carrusel. */}
          <View style={estilos.rotuloSala} pointerEvents="none">
            <Animated.View key={indiceActivo} entering={FadeIn.duration(420)}>
              <Text style={estilos.rotuloSalaEyebrow}>ESTÁS EN</Text>
              <Text style={estilos.rotuloSalaTexto}>
                {indiceActivo < catalogo.length
                  ? (catalogo[indiceActivo]?.nombre ?? '')
                  : 'La forja'}
              </Text>
            </Animated.View>
          </View>

          {/* Cambiar el avatar: el lápiz junto a la figura. */}
          <Pressable
            onPress={() => router.push('/avatar')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cambiar tu avatar"
            style={[estilos.editarAvatar, { top: altoHero * 0.36, left: width / 2 + 66 }]}
          >
            <Text style={{ fontSize: 14, color: color.oro300 }}>✎</Text>
          </Pressable>

          <View style={estilos.pistaAbajo} pointerEvents="none">
            <PistaDeScroll />
          </View>
        </View>

        {/* ================= 1 · EN MARCHA ================= */}
        {cargando && !vista ? (
          <Animated.View entering={FadeIn.duration(400)} style={estilos.seccion}>
            <View style={estilos.esqueleto} />
          </Animated.View>
        ) : vista ? (
          <Animated.View entering={FadeInUp.duration(650)} style={estilos.seccion}>
            <Pulsable onPress={() => router.push('/(juego)/ronda')}>
              <LinearGradient
                colors={['#2c2110', '#140f08']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={estilos.enCurso}
              >
                <View style={estilos.filaLatido}>
                  <Latido tono={color.oro400} />
                  <Text style={estilos.microOro}>EN MARCHA AHORA</Text>
                </View>
                <Text style={estilos.enCursoTitulo} numberOfLines={2}>
                  {vista.sesion.tituloPartida}
                </Text>
                <Text style={estilos.enCursoPie}>
                  {COMO_VA[vista.sesion.phase] ?? 'En juego'} · eres {vista.yo.characterName}
                </Text>
                <View style={estilos.botonFuerte}>
                  <Text style={estilos.botonFuerteTexto}>VOLVER A LA MESA</Text>
                </View>
              </LinearGradient>
            </Pulsable>
          </Animated.View>
        ) : null}

        {/* ================= 2 · TE ESPERAN ================= */}
        {invitaciones.length > 0 && (
          <View style={estilos.seccion}>
            <Titular
              texto={invitaciones.length === 1 ? 'Te esperan' : 'Te esperan en varias mesas'}
              nota="Alguien ha guardado una silla con tu nombre"
            />
            {invitaciones.map((inv, i) => (
              <Sobre
                key={`${inv.gameId}-${inv.suspectId}`}
                invitacion={inv}
                indice={i}
                alEntrar={entrarDesdeInvitacion}
              />
            ))}
          </View>
        )}

        {/* ================= 3 · LOS MUNDOS ================= */}
        <View style={estilos.seccion}>
          <Titular
            texto="Los mundos"
            nota="Veladas que se juegan en la vida real, alrededor de una mesa. Desliza."
          />
        </View>
        <CarruselDeMundos
          veladas={catalogo}
          anchoPantalla={width}
          onMontar={abrirTaller}
          scrollX={scrollCarrusel}
        />

        {/* ================= 4 · LA SALA DE ARCADE ================= */}
        <View style={estilos.seccion}>
          <Titular
            texto="La sala de arcade"
            nota="Minijuegos para ti solo, aquí mismo, en un rato muerto."
            acento="#5fd4c8"
          />
          <View style={estilos.arcade}>
            <View style={estilos.arcadeNeon} />
            <Text style={estilos.arcadeTitulo}>Cableándose…</Text>
            <Text style={estilos.arcadeCuerpo}>
              Las máquinas están llegando. Partidas de un minuto para cuando no hay mesa que
              montar: acertijos, memoria, pulso. Vuelve pronto.
            </Text>
          </View>
        </View>

        {/* ================= 5 · TU LEYENDA ================= */}
        <View style={estilos.seccion}>
          <Titular
            texto="Tu leyenda"
            nota={portada ? portada.cuenta.displayName : 'Toda mesa recuerda a los suyos'}
          />
          {portada ? (
            <Pulsable onPress={() => router.push('/cuenta')} accessibilityLabel="Abrir tu cuenta">
            <View style={estilos.vitrina}>
              <View style={estilos.filaRango}>
                <LaurelDeRango />
                <View style={{ flex: 1 }}>
                  <Text style={estilos.rango}>{rango.titulo}</Text>
                  <Text style={estilos.menudo}>
                    {jugadas.length} {jugadas.length === 1 ? 'velada jugada' : 'veladas jugadas'} ·{' '}
                    {trofeos.length} {trofeos.length === 1 ? 'trofeo' : 'trofeos'}
                  </Text>
                </View>
              </View>

              {rango.siguiente && (
                <View style={{ marginTop: espacio.md }}>
                  <BarraDeProgreso progreso={rango.siguiente.progreso} />
                  <Text style={[estilos.menudo, { marginTop: 6 }]}>
                    {rango.siguiente.faltan === 1
                      ? `Una velada más y serás ${rango.siguiente.titulo}`
                      : `${rango.siguiente.faltan} veladas más y serás ${rango.siguiente.titulo}`}
                  </Text>
                </View>
              )}

              <View style={estilos.estante}>
                {TROFEOS.map((t) => {
                  const ganado = trofeos.includes(t.id);
                  return (
                    <View key={t.id} style={estilos.pedestal}>
                      <View
                        style={[estilos.trofeo, ganado ? estilos.trofeoGanado : estilos.trofeoVacio]}
                      >
                        {ganado && <ResplandorDeTrofeo />}
                        <Text style={{ fontSize: 21, opacity: ganado ? 1 : 0.18 }}>{t.glifo}</Text>
                      </View>
                      <View style={estilos.pedestalBase} />
                    </View>
                  );
                })}
              </View>
              {jugadas.length > 0 && (
                <Text style={[estilos.menudo, { marginTop: espacio.sm }]}>
                  La última: {jugadas[jugadas.length - 1]?.titulo}
                </Text>
              )}
              <Text style={estilos.verCuenta}>Ver tu cuenta →</Text>
            </View>
            </Pulsable>
          ) : (
            /* La vitrina cerrada: se ve lo que hay dentro, y por eso apetece. */
            <View style={[estilos.vitrina, { opacity: 0.92 }]}>
              <View style={estilos.estante}>
                {TROFEOS.slice(0, 6).map((t) => (
                  <View key={t.id} style={estilos.pedestal}>
                    <View style={[estilos.trofeo, estilos.trofeoVacio]}>
                      <Text style={{ fontSize: 21, opacity: 0.16 }}>{t.glifo}</Text>
                    </View>
                    <View style={estilos.pedestalBase} />
                  </View>
                ))}
              </View>
              <Text style={[estilos.rango, { marginTop: espacio.md, fontSize: 17 }]}>
                Tu vitrina, todavía a oscuras
              </Text>
              <Text style={estilos.menudo}>
                Juega tu primera velada y acepta guardar tus partidas desde tu perfil: los trofeos,
                el rango y la crónica de cada noche se quedan aquí, esperándote.
              </Text>
              <Pressable onPress={() => router.push('/cuenta')} style={{ paddingVertical: 10 }}>
                <Text style={estilos.verCuenta}>Saber más →</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ================= 6 · LA OTRA PUERTA ================= */}
        <View style={estilos.seccion}>
          <Pulsable onPress={abrirTaller}>
            <View style={estilos.taller}>
              <Text style={estilos.tallerEyebrow}>¿NADIE TE HA INVITADO TODAVÍA?</Text>
              <Text style={estilos.tallerTitulo}>Sé tú quien reparte los papeles</Text>
              <Text style={estilos.tallerCuerpo}>
                El taller se abre en un ordenador. El agente escribe la trama contigo, imprime los
                dosieres, y tú repartes los códigos en la mesa.
              </Text>
              <Text style={estilos.tallerLlamada}>Abrir el taller →</Text>
            </View>
          </Pulsable>
        </View>

        <Pressable
          onPress={() => void Linking.openURL(api.urlDePrivacidad())}
          hitSlop={10}
          accessibilityRole="link"
          style={estilos.privacidad}
        >
          <Text style={estilos.privacidadTexto}>POLÍTICA DE PRIVACIDAD</Text>
        </Pressable>
      </Animated.ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function Titular({
  texto,
  nota,
  acento = color.oro300,
}: {
  texto: string;
  nota?: string;
  acento?: string;
}): JSX.Element {
  return (
    <View style={{ marginBottom: espacio.sm }}>
      <View style={estilos.filaTitular}>
        <View style={[estilos.guion, { backgroundColor: acento }]} />
        <Text style={[estilos.titular, { color: acento }]}>{texto.toUpperCase()}</Text>
      </View>
      {nota ? <Text style={estilos.notaTitular}>{nota}</Text> : null}
    </View>
  );
}

/** Un botón que casi no está: cristal oscuro, filo dorado, icono. */
function BotonFantasma({
  children,
  etiqueta,
  accesible,
  onPress,
}: {
  children: React.ReactNode;
  etiqueta: string;
  accesible: string;
  onPress: () => void;
}): JSX.Element {
  return (
    <View style={{ alignItems: 'center' }}>
      <Pulsable onPress={onPress} accessibilityLabel={accesible}>
        <View style={estilos.fantasma}>{children}</View>
      </Pulsable>
      <Text style={estilos.fantasmaEtiqueta}>{etiqueta.toUpperCase()}</Text>
    </View>
  );
}

function IconoLlave(): JSX.Element {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx={7} cy={7} r={4} stroke="#e8cf7f" strokeWidth={1.8} fill="none" />
      <Path d="M10 10 L16 16 M13.5 13.5 L16 11.5 M15 15 L17 13.5" stroke="#e8cf7f" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconoPluma(): JSX.Element {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path d="M4 16 C6 10 11 5 16 3 C15 8 11 13 6 15 Z" stroke="#e8cf7f" strokeWidth={1.6} fill="none" strokeLinejoin="round" />
      <Path d="M4 16 L9 11" stroke="#e8cf7f" strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

/** El chevron que invita a bajar, latiendo despacio. */
function PistaDeScroll(): JSX.Element | null {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);
  useEffect(() => {
    if (menos) return;
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, menos]);
  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.25, 0.7]),
    transform: [{ translateY: interpolate(t.value, [0, 1], [0, 6]) }],
  }));
  if (menos) return null;
  return (
    <Animated.View style={[{ alignSelf: 'center', marginTop: espacio.lg }, estilo]}>
      <Svg width={22} height={12} viewBox="0 0 22 12">
        <Path
          d="M2 2 L11 10 L20 2"
          stroke={color.oro300}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

/** Una invitación como lo que es: un sobre con lacre. */
function Sobre({
  invitacion,
  indice,
  alEntrar,
}: {
  invitacion: api.InvitacionVista;
  indice: number;
  alEntrar: (inv: api.InvitacionVista) => void;
}): JSX.Element {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);
  useEffect(() => {
    if (menos) return;
    t.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, menos]);
  const lacre = useAnimatedStyle(() => ({
    transform: [{ scale: menos ? 1 : interpolate(t.value, [0, 1], [1, 1.12]) }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(90 * indice).duration(600)}>
      <Pulsable
        onPress={invitacion.yaDentro ? undefined : () => alEntrar(invitacion)}
        accessibilityLabel={`Invitación a ${invitacion.titulo}: serás ${invitacion.personaje}`}
      >
        <View style={estilos.sobre}>
          {/* La solapa del sobre, dibujada con dos diagonales. */}
          <Svg width={72} height={96} viewBox="0 0 72 96" style={estilos.sobreSolapa}>
            <Path
              d="M0 0 L36 36 L72 0"
              stroke="rgba(212,99,111,0.5)"
              strokeWidth={1.5}
              fill="rgba(58,18,32,0.85)"
            />
          </Svg>
          <Animated.View style={[estilos.lacre, lacre]}>
            <Svg width={34} height={34}>
              <Circle cx={17} cy={17} r={16} fill="#8c2337" />
              <Circle
                cx={17}
                cy={17}
                r={11}
                fill="none"
                stroke="rgba(240,201,192,0.5)"
                strokeWidth={1}
              />
            </Svg>
            <Text style={estilos.lacreGlifo}>✦</Text>
          </Animated.View>

          <View style={{ flex: 1, paddingLeft: espacio.md }}>
            <Text style={estilos.sobreTitulo} numberOfLines={1}>
              {invitacion.titulo}
            </Text>
            <Text style={estilos.sobrePersonaje}>Serás {invitacion.personaje}</Text>
            <Text style={estilos.menudo} numberOfLines={1}>
              {COMO_VA[invitacion.fase] ?? invitacion.fase} · para {invitacion.paraEl}
            </Text>
            <Text
              style={[estilos.sobreLlamada, invitacion.yaDentro && { color: color.pergaminoTenue }]}
            >
              {invitacion.yaDentro
                ? 'Ya hay un móvil en esa silla'
                : invitacion.directa
                  ? 'Entrar sin código →'
                  : 'Abrir la invitación →'}
            </Text>
          </View>
        </View>
      </Pulsable>
    </Animated.View>
  );
}

function BarraDeProgreso({ progreso }: { progreso: number }): JSX.Element {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(Math.max(0.04, Math.min(progreso, 1)), {
      duration: 1100,
      easing: Easing.out(Easing.cubic),
    });
  }, [t, progreso]);
  const relleno = useAnimatedStyle(() => ({ width: `${t.value * 100}%` }));
  return (
    <View style={estilos.barraFondo}>
      <Animated.View style={[estilos.barraRelleno, relleno]}>
        <LinearGradient
          colors={['#b8901e', '#e8cf7f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: radio.redondo }}
        />
      </Animated.View>
    </View>
  );
}

function ResplandorDeTrofeo(): JSX.Element {
  const menos = useMenosMovimiento();
  const t = useSharedValue(0);
  useEffect(() => {
    if (menos) return;
    t.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, menos]);
  const estilo = useAnimatedStyle(() => ({
    opacity: menos ? 0.4 : interpolate(t.value, [0, 1], [0.2, 0.6]),
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, estilo]}>
      <LinearGradient
        colors={['rgba(232,207,127,0.4)', 'transparent']}
        style={{ flex: 1, borderRadius: radio.md }}
      />
    </Animated.View>
  );
}

function LaurelDeRango(): JSX.Element {
  return (
    <View style={estilos.laurel}>
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Circle
          cx={22}
          cy={22}
          r={20}
          stroke="rgba(201,162,39,0.55)"
          strokeWidth={1.5}
          fill="rgba(201,162,39,0.08)"
        />
        <Path
          d="M12 28 C15 24 15 18 13 14 M32 28 C29 24 29 18 31 14"
          stroke="rgba(201,162,39,0.7)"
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx={22} cy={20} r={4.5} fill="#c9a227" />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#050d09' },

  botonera: {
    position: 'absolute',
    left: espacio.lg,
    right: espacio.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  marcaMini: {
    fontFamily: fuente.titulo,
    fontSize: 12,
    letterSpacing: 2.6,
    color: 'rgba(232,207,127,0.75)',
    paddingTop: 10,
  },
  fantasma: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(232,207,127,0.35)',
    backgroundColor: 'rgba(5,13,9,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fantasmaEtiqueta: {
    fontFamily: fuente.titulo,
    fontSize: 9,
    letterSpacing: 1.2,
    color: 'rgba(232,207,127,0.7)',
    textAlign: 'center',
    marginTop: 3,
  },
  rotuloSala: { position: 'absolute', left: espacio.lg, bottom: espacio.lg + 14 },
  rotuloSalaEyebrow: {
    fontFamily: fuente.titulo,
    fontSize: 9.5,
    letterSpacing: 2.4,
    color: 'rgba(217,201,163,0.55)',
  },
  rotuloSalaTexto: {
    fontFamily: fuente.display,
    fontSize: 24,
    color: color.pergamino,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  editarAvatar: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(232,207,127,0.4)',
    backgroundColor: 'rgba(5,13,9,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pistaAbajo: { position: 'absolute', bottom: 4, left: 0, right: 0, alignItems: 'center' },
  verCuenta: {
    fontFamily: fuente.titulo,
    fontSize: 12,
    letterSpacing: 1.3,
    color: color.oro300,
    marginTop: espacio.md,
  },
  ctaAvatar: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },

  heroContenido: { flex: 1, justifyContent: 'flex-end', paddingBottom: espacio.xl },
  sello: {
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.5)',
    borderRadius: radio.redondo,
    paddingHorizontal: espacio.md,
    paddingVertical: 5,
    marginBottom: espacio.md,
    backgroundColor: 'rgba(5,13,9,0.4)',
  },
  selloTexto: { fontFamily: fuente.titulo, fontSize: 10.5, letterSpacing: 3, color: color.oro300 },
  marca: {
    fontFamily: fuente.display,
    fontSize: 44,
    lineHeight: 52,
    color: color.oro300,
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(201,162,39,0.45)',
    textShadowRadius: 24,
    textShadowOffset: { width: 0, height: 0 },
  },
  lemaHero: {
    fontFamily: fuente.cuerpoCursiva,
    fontSize: 17.5,
    lineHeight: 25,
    color: color.pergaminoTenue,
    textAlign: 'center',
    marginTop: espacio.sm,
  },
  filaPuertas: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espacio.md,
    marginTop: espacio.xl,
    paddingHorizontal: espacio.lg,
  },
  puertaOro: { borderRadius: radio.md, paddingHorizontal: espacio.xl, paddingVertical: 14 },
  puertaOroTexto: {
    fontFamily: fuente.titulo,
    fontSize: 13,
    letterSpacing: 1.8,
    color: color.caoba900,
  },
  puertaHumo: {
    borderRadius: radio.md,
    paddingHorizontal: espacio.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,207,127,0.5)',
    backgroundColor: 'rgba(5,13,9,0.45)',
  },
  puertaHumoTexto: {
    fontFamily: fuente.titulo,
    fontSize: 13,
    letterSpacing: 1.8,
    color: color.oro300,
  },

  seccion: { paddingHorizontal: espacio.lg, marginTop: espacio.xl },
  filaTitular: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  guion: { width: 22, height: 1 },
  titular: { fontFamily: fuente.titulo, fontSize: 15, letterSpacing: 2.6 },
  notaTitular: {
    fontFamily: fuente.cuerpo,
    fontSize: 15.5,
    lineHeight: 21,
    color: color.pergaminoTenue,
    opacity: 0.65,
    marginTop: 4,
  },

  esqueleto: { height: 140, borderRadius: radio.lg, backgroundColor: 'rgba(217,201,163,0.05)' },

  enCurso: {
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.55)',
    padding: espacio.lg,
  },
  filaLatido: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  microOro: { fontFamily: fuente.titulo, fontSize: 11, letterSpacing: 2.4, color: color.oro300 },
  enCursoTitulo: {
    fontFamily: fuente.display,
    fontSize: 26,
    lineHeight: 33,
    color: color.pergamino,
    marginTop: espacio.sm,
  },
  enCursoPie: {
    fontFamily: fuente.cuerpo,
    fontSize: 16.5,
    color: color.pergaminoTenue,
    marginTop: 2,
  },
  botonFuerte: {
    marginTop: espacio.lg,
    backgroundColor: color.oro500,
    borderRadius: radio.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  botonFuerteTexto: {
    fontFamily: fuente.titulo,
    fontSize: 13,
    letterSpacing: 1.8,
    color: color.caoba900,
  },

  sobre: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31,18,12,0.7)',
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,99,111,0.32)',
    marginBottom: espacio.sm,
    paddingRight: espacio.md,
    overflow: 'hidden',
    minHeight: 96,
  },
  sobreSolapa: { marginLeft: 2 },
  lacre: { position: 'absolute', left: 20, top: 42, alignItems: 'center', justifyContent: 'center' },
  lacreGlifo: { position: 'absolute', color: '#f0c9c0', fontSize: 13 },
  sobreTitulo: {
    fontFamily: fuente.titulo,
    fontSize: 17.5,
    color: color.pergamino,
    paddingTop: espacio.md,
  },
  sobrePersonaje: {
    fontFamily: fuente.cuerpoMedio,
    fontSize: 16.5,
    color: '#f0c9c0',
    marginTop: 1,
  },
  sobreLlamada: {
    fontFamily: fuente.titulo,
    fontSize: 12,
    letterSpacing: 1.3,
    color: color.oro300,
    marginTop: 6,
    paddingBottom: espacio.md,
  },

  arcade: {
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: 'rgba(95,212,200,0.4)',
    backgroundColor: 'rgba(10,32,30,0.55)',
    padding: espacio.lg,
    overflow: 'hidden',
  },
  arcadeNeon: {
    position: 'absolute',
    top: 0,
    left: espacio.lg,
    right: espacio.lg,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(95,212,200,0.65)',
  },
  arcadeTitulo: { fontFamily: fuente.titulo, fontSize: 17, color: '#5fd4c8', letterSpacing: 1 },
  arcadeCuerpo: {
    fontFamily: fuente.cuerpo,
    fontSize: 15.5,
    lineHeight: 22,
    color: color.pergaminoTenue,
    opacity: 0.8,
    marginTop: 6,
  },

  vitrina: {
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.3)',
    backgroundColor: 'rgba(31,18,12,0.6)',
    padding: espacio.lg,
  },
  filaRango: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  laurel: { width: 44, height: 44 },
  rango: { fontFamily: fuente.display, fontSize: 21, color: color.pergamino },
  barraFondo: {
    height: 8,
    borderRadius: radio.redondo,
    backgroundColor: 'rgba(201,162,39,0.14)',
    overflow: 'hidden',
  },
  barraRelleno: { height: 8 },
  estante: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginTop: espacio.lg },
  pedestal: { alignItems: 'center' },
  trofeo: {
    width: 44,
    height: 44,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  trofeoGanado: { borderColor: 'rgba(232,207,127,0.6)', backgroundColor: 'rgba(201,162,39,0.14)' },
  trofeoVacio: { borderColor: 'rgba(201,162,39,0.14)', backgroundColor: 'rgba(11,23,16,0.5)' },
  pedestalBase: {
    width: 30,
    height: 3,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: 'rgba(201,162,39,0.22)',
  },

  taller: {
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.3)',
    padding: espacio.lg,
    backgroundColor: 'rgba(217,201,163,0.04)',
  },
  tallerEyebrow: {
    fontFamily: fuente.titulo,
    fontSize: 10.5,
    letterSpacing: 2.2,
    color: color.pergaminoTenue,
    opacity: 0.7,
  },
  tallerTitulo: {
    fontFamily: fuente.display,
    fontSize: 23,
    lineHeight: 29,
    color: color.pergamino,
    marginTop: 6,
  },
  tallerCuerpo: {
    fontFamily: fuente.cuerpo,
    fontSize: 15.5,
    lineHeight: 22,
    color: color.pergaminoTenue,
    opacity: 0.8,
    marginTop: espacio.sm,
  },
  tallerLlamada: {
    fontFamily: fuente.titulo,
    fontSize: 12.5,
    letterSpacing: 1.4,
    color: color.oro300,
    marginTop: espacio.md,
  },

  menudo: { fontFamily: fuente.cuerpo, fontSize: 14.5, color: color.pergaminoTenue, opacity: 0.65 },
  privacidad: { alignSelf: 'center', marginTop: espacio.xl, paddingVertical: espacio.md },
  privacidadTexto: {
    fontFamily: fuente.titulo,
    fontSize: 10.5,
    letterSpacing: 2,
    color: 'rgba(217,201,163,0.4)',
  },
});
