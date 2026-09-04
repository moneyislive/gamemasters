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
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as api from '../src/api';
import { usePartida } from '../src/estado';
import { usarMarco } from '../src/marco';
import { CarruselDeMundos, PASO } from '../src/carrusel3d';
import { EscenaAvatar, type ProgresoCompartido } from '../src/escena-avatar';
import { Figura } from '../src/figura';
import { SelloDeCuenta } from '../src/sello-cuenta';
import { FondoDeSalas } from '../src/fondos-sala';
import { AVATAR_POR_DEFECTO, cargarAvatar, olvidarModelo3D, type Avatar } from '../src/avatar';
import { Latido, Pulsable, useMenosMovimiento } from '../src/vivo';
import { arcadesDeEsteBinario, laSala, veladas } from '../src/vitrina';
import type { Minijuego } from '../src/vitrina';
import { loQueLlega, queSeEnsena } from '../src/arcade/del-servidor';
import type { ArcadeDelCatalogo, EstadoDelCatalogo } from '../src/arcade/del-servidor';
import { todosLosTrofeos } from '../../shared/juegos';
import { color, conAlfa, espacio, fuente, radio } from '../src/tema';
/*
 * LA TABLA DE LA SALA, y ni un color de la Sala escrito fuera de ella.
 *
 * Esta pantalla llevaba el turquesa de la Sala a mano —`#5fd4c8`, el
 * `rgba(95,212,200,…)` de sus filos y, lo peor, sufijos de alfa concatenados a la
 * cadena del acento (`paleta.acento + 'a6'`)—. El compilador no delataba nada de
 * eso: son cadenas, y una cadena de más o de menos sólo se ve mirando la pantalla.
 *
 * Y no es sólo higiene. La Sala se repinta entera cambiando tres valores de
 * `TEMAS_DE_SALA`; cada literal escrito aquí es un sitio que NO se enteraría de
 * ese cambio, así que la primera vez que alguien probara el ámbar la portada se
 * quedaría con la única tarjeta turquesa del producto.
 *
 * `muebles.ts` no importa nada en ejecución —sólo tipos de `expo-router` y del
 * contrato— así que no arrastra Skia al grafo de la portada, que es lo que la
 * dejaría en blanco en web y lo que vigila un comprobador.
 */
import { CUENTA_DE_AFORO, LETRA, RADIO, SALA } from '../src/arcade/muebles';
import {
  LuzDeEsquina,
  PastillaDeEstado,
  RailDeAforo,
  VeloDeLaPortada,
} from '../src/arcade/piezas';

/*
 * TODOS los trofeos que puede haber, no solo los seis de la plataforma. La
 * vitrina se mira al día siguiente, sin ninguna partida abierta: con la lista
 * corta, quien selló una tumba no encontraba aquí ni «El Sellador» ni «Ojo de
 * Horus» —los tenía concedidos y guardados— y un trofeo que no se puede enseñar
 * no es un trofeo.
 */
const VITRINA = todosLosTrofeos();

/** La fase, dicha como en la mesa. */
const COMO_VA: Record<string, string> = {
  lobby: 'La mesa se está llenando',
  'ronda-abierta': 'Ronda en curso',
  'ronda-cerrada': 'Puesta en común',
  respuestas: 'Momento de acusar',
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
  /*
   * EL CATÁLOGO DE LA SALA, que es lo único de esta pantalla que viene del
   * servidor sin credencial. Empieza en `pidiendo` y no en `sin-servidor`: son
   * dos cosas distintas y confundirlas haría que la Sala dijera «no se ha podido
   * hablar con el servidor» durante el primer segundo de cada arranque.
   */
  const [catalogoDeArcade, setCatalogoDeArcade] = useState<EstadoDelCatalogo>({ que: 'pidiendo' });

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
  /** El modelo 3D no se ha podido enseñar en esta sesión. */
  const [modeloRoto, setModeloRoto] = useState(false);
  /** sala → ilustración generada, si el servidor la tiene. */
  const [fondos, setFondos] = useState<Record<string, string>>({});

  const cargarPortada = useCallback(() => {
    void (async () => {
      // El disco antes que la pregunta: si no, en el arranque «no hay cuenta» y
      // la portada se queda sin tus sobres de invitación.
      await api.cargarSesionGuardada();
      if (!api.hayCuenta()) {
        setPortada(null);
        return;
      }
      try {
        setPortada(await api.pedirPortada());
      } catch {
        setPortada(null);
      }
    })();
  }, []);

  /**
   * EL CATÁLOGO DE LA SALA, aparte de la portada y a propósito.
   *
   * ═══ POR QUÉ NO VA DENTRO DE `cargarPortada` ═══
   *
   * Porque `cargarPortada` se rinde antes de preguntar si no hay cuenta —tiene
   * que hacerlo: lo que pide son TUS invitaciones y TUS partidas— y la Sala no es
   * tuya. Metiéndolo ahí, el escaparate desaparecería justo para quien todavía no
   * ha entrado, que es a quien hay que enseñárselo.
   *
   * Y falla en silencio a propósito. Un servidor que no contesta NO puede dejar
   * esta pantalla sin Sala: La Frente, El Arcade y La Peonza corren dentro del
   * aparato y se juegan sin cobertura. Lo que se pierde sin red es lo que hubiera
   * instalado el servidor, y eso se DICE debajo de la lista en vez de dejar un
   * hueco. Es la misma doctrina que `arcade/marcador.ts` escribe para el
   * marcador: nada de lo que hay aquí puede impedir jugar.
   */
  const cargarCatalogo = useCallback(() => {
    setCatalogoDeArcade({ que: 'pidiendo' });
    void (async () => {
      try {
        /*
         * ═══ EL DISCO ANTES QUE LA PREGUNTA, Y AQUÍ TAMBIÉN ═══
         *
         * `cargarSesionGuardada()` no carga sólo la sesión: carga LA DIRECCIÓN DEL
         * SERVIDOR que alguien eligió. Sin esta línea, `peticion` usa todavía la de
         * por defecto —en web, el origen de la página— y la primera petición del
         * arranque se va al sitio equivocado.
         *
         * Medido y no supuesto: sin ella, con la app servida por Metro en el 8081,
         * el catálogo se pedía a `localhost:8081/api/arcade`. Metro contesta 200
         * con otra cosa, `loQueLlega` la rechaza —que es su trabajo— y la Sala
         * enseñaba «no se ha podido preguntar a este servidor» teniendo el servidor
         * perfectamente levantado al lado. Un fallo que se ve como red y es de
         * orden.
         *
         * `cargarPortada` empieza con esta misma línea y por esta misma razón. Que
         * las dos la necesiten no es repetición: son dos cargas independientes y
         * ninguna puede dar por hecho que la otra ya corrió.
         */
        await api.cargarSesionGuardada();
        const arcades = loQueLlega(await api.pedirCatalogoDeArcade());
        setCatalogoDeArcade(arcades === null ? { que: 'sin-servidor' } : { que: 'puesto', arcades });
      } catch {
        setCatalogoDeArcade({ que: 'sin-servidor' });
      }
    })();
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
  /*
   * El catálogo se pide UNA VEZ al montar y NO con `useFocusEffect`. Lo que hay
   * instalado en un servidor no cambia mientras alguien tiene la app abierta, y
   * volver a pedirlo cada vez que se vuelve a esta pantalla sería una petición
   * por cada ida y vuelta a un juego. Si falla, hay un botón para reintentar, que
   * es lo que de verdad hace falta.
   */
  useEffect(cargarCatalogo, [cargarCatalogo]);
  // Al volver del editor, el avatar puede haber cambiado.
  useFocusEffect(cargarPortada);
  useFocusEffect(cargarFigura);

  const invitaciones = portada?.invitaciones ?? [];
  const jugadas = portada?.cuenta.partidas ?? [];
  const trofeos = portada?.cuenta.trofeos ?? [];
  const rango = rangoDe(jugadas.length);

  const catalogo = veladas();
  /*
   * Y LA SALA, que ya no es sólo lo que trae el binario.
   *
   * Se FUSIONA lo compilado con lo que dice el servidor, y lo compilado es un
   * suelo que no se quita nunca. Las otras dos formas de hacer esto están mal y
   * conviene dejarlo dicho para que nadie las «arregle» de vuelta:
   *
   *   · Esperar al servidor esconde La Frente, El Arcade y La Peonza —que corren
   *     dentro del aparato y se juegan en el metro— hasta que conteste alguien, o
   *     para siempre si no hay red. Enseñar «no hay nada» teniendo tres cosas
   *     jugables a mano es tan mentira como una caja muerta.
   *   · Sustituir lo compilado por lo del servidor borraría una tarjeta buena
   *     porque una respuesta no habla de ella.
   *
   * Fusionar es además UNA SOLA REGLA en los tres momentos —pidiendo, puesto y
   * sin servidor— así que no hay transición que parpadee. El razonamiento entero
   * está en `queSeEnsena`, en `app/src/arcade/del-servidor.ts`.
   *
   * Los dos registros siguen siendo dos: `veladas()` arriba y esto aquí. Ver
   * `app/src/vitrina.ts`, donde está escrito por qué no se pueden confundir.
   */
  const { arcades: arcadesDeLaSala, sinServidor } = queSeEnsena(
    catalogoDeArcade,
    arcadesDeEsteBinario(),
  );
  const sala = laSala(arcadesDeLaSala);
  /*
   * ═══ Y EL MANIFIESTO VIAJA AL LADO DE LA TARJETA ═══
   *
   * `laSala` devuelve lo que hace falta para DECIDIR —nombre, gancho, ruta y la
   * razón cuando no hay ruta—, y la tarjeta pinta además lo que el juego DECLARA:
   * el aforo del raíl, la sede, el ritmo, si esconde algo y qué cifra publica. Eso
   * vive en el manifiesto y no en `Minijuego`.
   *
   * El MUEBLE se lee y no se pinta, y conviene que quede dicho porque aquí ponía
   * que sí. Llegó a ser el antetítulo de la tarjeta durante una tarde, y se quitó
   * al ver la pantalla: los valores reales son «tablero», «lienzo», «escena» y
   * «formulario», y ese último encima de «LA FRENTE» —póntelo en la frente, todos
   * lo ven menos tú— no dice el género del juego, dice cómo está hecha la
   * pantalla. Sigue decidiendo si la tarjeta se puede tocar, que es su trabajo.
   *
   * Se lleva en un índice por `id` y no fiándose de que las dos listas vayan en el
   * mismo orden: hoy `laSala` es un `.map` y van, pero eso es un detalle de otro
   * fichero y el día que deje de serlo el fallo sería mudo —cada ficha con el aforo
   * de la de al lado— que es exactamente la clase de error que nadie ve en un
   * diff. `queSeEnsena` ya fusiona por `id`, así que aquí no hay repetidos.
   *
   * Ampliar `Minijuego` con estos seis campos habría sido lo otro razonable, y no
   * se hace porque `vitrina.ts` es de otro y esto se pinta con lo que ya hay.
   */
  const fichasPorId = new Map(arcadesDeLaSala.map((m) => [m.id, m] as const));
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
          const r = await api.entrarDesdeInvitacion(inv.gameId, inv.participanteId);
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
          await api.fijarToken(r.token, inv.gameId);
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
          {/*
            LA CONDICION MIRA `usa3D`, NO SOLO QUE HAYA MODELO. Antes bastaba
            con que existiera `modeloUrl` para que ganara siempre: elegir un
            personaje del elenco se guardaba y la portada seguia enseñando el
            3D, asi que la eleccion parecia no servir para nada.
          */}
          {avatar.modeloUrl && avatar.usa3D && !modeloRoto ? (
            <EscenaAvatar
              ancho={width}
              alto={altoHero}
              modeloUrl={avatar.modeloUrl}
              progreso={progresoRef.current}
              /*
                SI EL MODELO NO SE PUEDE ENSEÑAR, SE ENSEÑA LA FIGURA. Antes la
                escena se quedaba vacía sin decir nada: el fichero desaparecía
                del servidor —los modelos viven en el disco de las subidas, que
                sin disco persistente se borra en cada despliegue— y la portada
                se quedaba sin nadie, sin ninguna pista de por qué.
              */
              alFallar={(definitivo) => {
                setModeloRoto(true);
                // Solo se borra si el fichero ya no existe. Mala cobertura no
                // es motivo para quitarle a nadie el avatar que esculpió.
                if (definitivo) void olvidarModelo3D().then(cargarFigura);
              }}
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
        {portada && (
          <View style={estilos.seccion}>
            <Titular
              texto={
                invitaciones.length === 0
                  ? 'Tus partidas'
                  : invitaciones.length === 1
                    ? 'Te esperan'
                    : 'Te esperan en varias mesas'
              }
              nota={
                invitaciones.length === 0
                  ? 'Todo lo que has jugado y lo que está por venir'
                  : 'Alguien ha guardado una silla con tu nombre'
              }
            />
            {invitaciones.map((inv, i) => (
              <Sobre
                key={`${inv.gameId}-${inv.participanteId}`}
                invitacion={inv}
                indice={i}
                alEntrar={entrarDesdeInvitacion}
              />
            ))}

            {/*
              LA ENTRADA AL PANEL, EN LA PORTADA Y NO SOLO EN EL SELLO.
              La primera version lo dejo colgando del menu de cuenta, que es
              exactamente donde estaba el inicio de sesion cuando dijimos que
              parecia escondido — y por el mismo motivo: hay que saber que esta
              ahi para ir a buscarlo. Aqui aparece SIEMPRE que hay cuenta,
              tambien cuando no hay ninguna invitacion, porque es entonces
              cuando la historia es lo unico que queda por ver.
            */}
            <Pulsable
              onPress={() => router.push('/partidas')}
              accessibilityLabel="Ver todas tus partidas"
            >
              <View style={estilos.verPanel}>
                <Text style={estilos.verPanelTexto}>
                  {invitaciones.length === 0
                    ? 'VER TUS PARTIDAS'
                    : 'VER TODAS TUS PARTIDAS'}
                </Text>
                <Text style={estilos.verPanelFlecha}>›</Text>
              </View>
            </Pulsable>
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
        {/*
          ═══ ESTA SECCIÓN ANUNCIABA UNA PROMESA VIEJA ═══

          Decía «Partidas de un minuto para cuando no hay mesa que montar», debajo
          de un rótulo que llamaba a esto «el relleno de los ratos muertos». Las
          dos frases las ha declarado obsoletas el propietario, y las dos decían lo
          mismo: que la Sala es lo que se hace cuando no se puede hacer lo bueno.

          Es la SEGUNDA CATEGORÍA DE JUEGOS de la plataforma, con su propio motor y
          su propio contrato, y La Frente no es un rato muerto: son doce personas
          de pie gritándole a alguien que lleva un móvil en la cabeza. Anunciarlo
          como relleno era vender mal lo que hay.

          Y la regla de la cabecera de este fichero sigue mandando: nada de lo que
          se enseña es mentira. Antes no había ninguno y se decía; hoy son cinco
          —aquí ponía «uno», y se quedó viejo— y sale cada uno con su gancho y su
          ficha. El día que la Sala se quede vacía —un reparto de servidor sin
          arcades— vuelve a salir el aviso de que no hay nada, en vez de un hueco.
        */}
        {/*
          ═══ Y LA SALA TIENE SU PROPIO SUELO, QUE ES POR DONDE EMPIEZA ═══

          No es una sección más de la portada: es la puerta al otro mundo, y el
          resto de esta pantalla es fieltro verde, caoba y oro. La banda de
          `SALA.suelo` con un filo arriba y otro abajo es lo que hace que las
          fichas se lean como una sala y no como cinco cajas sueltas sobre la
          mesa del taller — y es lo mismo que hace la pila de `(arcade)/`, que
          pinta ese mismo suelo detrás de todos sus muebles.

          Va a sangre —los márgenes se meten dentro— porque un suelo con margen
          es un panel, y un panel vuelve a ser una sección de la portada.

          Y la cabecera es de la Sala y no el `Titular` de la casa: aquél rotula
          con Cinzel y en oro, que son las letras del taller. Aquí manda el palo
          seco del sistema, y el peso, la caja alta y el tracking hacen de cartel.
        */}
        <View style={estilos.salaBanda}>
          <CabeceraDeSala cuantas={sala.length} />
          {sala.length === 0 ? (
            <View style={estilos.salaVacia}>
              <Text style={estilos.salaVaciaTitulo}>Cableándose…</Text>
              <Text style={estilos.salaVaciaCuerpo}>
                Este servidor no trae ninguna máquina instalada todavía. Vuelve pronto.
              </Text>
            </View>
          ) : (
            /*
              ═══ UNA ESTANTERÍA Y NO UNA PILA ═══

              Aquí había cinco tarjetas a lo ancho de la columna, apiladas, con la
              primera más grande para dar por dónde empezar a mirar. Se cambió
              porque el problema no era el orden sino el FORMATO: a 378 de ancho,
              una portada casi cuadrada con el nombre abajo se lee como un banner
              y no como una tarjeta, y encima quedaba a tres dedos de la estantería
              de veladas, que hace lo contrario y se ve bien.

              Así que la Sala se hojea igual que el taller. Y con eso desaparece
              también la destacada: cinco tarjetas iguales en un carrusel no
              necesitan una que abra la fila, porque la que abre es siempre la que
              está en el centro.
            */
            <View style={{ gap: espacio.lg }}>
              <CarruselDeMaquinas maquinas={sala} fichas={fichasPorId} anchoPantalla={width} />
              {/*
                ═══ Y SI EL SERVIDOR NO CONTESTÓ, SE DICE DEBAJO ═══

                Debajo y no en lugar de la lista: lo de arriba se puede jugar
                igual, porque viene dentro de la app. Lo que falta es lo que
                hubiera instalado el servidor, y eso es una frase, no un hueco.

                Y no se dice mientras se está pidiendo. «Pidiendo» y «no contestó»
                son dos cosas distintas, y confundirlas haría que esta línea
                apareciera durante el primer segundo de cada arranque —o sea que
                se aprendería a ignorarla justo cuando importa—.
              */}
              {sinServidor && (
                <Pulsable onPress={cargarCatalogo} accessibilityLabel="Reintentar la sala">
                  <View style={estilos.salaSinRed}>
                    <Text style={estilos.salaSinRedTexto}>
                      Éstos vienen dentro de la app. No se ha podido preguntar a este servidor
                      si tiene alguno más instalado.
                    </Text>
                    {/*
                      EL ÚNICO ACENTO DE ESTE AVISO ES LA PALABRA QUE SE PUEDE
                      TOCAR. El texto es informativo —«no hay red» no quema y no
                      mata—, así que va en `tenue`; «Reintentar» sí se pulsa, y
                      ahí es donde el acento significa algo.
                    */}
                    <Text style={estilos.salaSinRedAccion}>Reintentar ›</Text>
                  </View>
                </Pulsable>
              )}
            </View>
          )}
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
                {VITRINA.map((t) => {
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
                {VITRINA.slice(0, 6).map((t) => (
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

/**
 * ═══ LO QUE LLEGA POR EL CABLE NO ESTÁ COMPROBADO, Y ESTAS CUATRO LO COMPRUEBAN ═══
 *
 * `loQueLlega` valida CUATRO campos —`id`, `nombre`, `gancho`, `mueble` y `sede`—
 * y lo dice: los demás no los tocaba esta pantalla, y validarlos allí era copiar a
 * mano `problemasDelManifiesto` y quedarse desincronizado con él.
 *
 * La anatomía nueva SÍ los toca. El raíl cuenta `jugadores.maximo`, la fila de
 * datos dice el ritmo, la línea de menores dice si esconde algo y la pastilla dice
 * qué cifra publica — o sea que un servidor con un manifiesto a medias mete aquí
 * `undefined` donde TypeScript promete un número, y desreferenciar `jugadores.maximo`
 * de un `undefined` lanza durante el render. Esta pantalla no tiene `ErrorBoundary`:
 * el throw desmonta la raíz y deja la portada en blanco PARA TODOS LOS JUEGOS.
 *
 * Así que se lee cada campo como lo que de verdad es —`unknown`— y lo que no venga
 * bien no se pinta. Una ficha sin raíl es un juego que sale; una excepción es la
 * app que no abre. Es la misma doctrina que ya sostiene el resto de este camino.
 *
 * Y va aquí y no en `loQueLlega` porque son dos preguntas distintas: allí se decide
 * si una tarjeta EXISTE, y aquí si un adorno se puede dibujar. Un arcade al que le
 * falte el `tickHz` se juega igual.
 */
function leerAforo(ficha: ArcadeDelCatalogo | undefined): { minimo: number; maximo: number } | null {
  const a: unknown = ficha?.jugadores;
  if (typeof a !== 'object' || a === null) return null;
  const min: unknown = (a as { minimo?: unknown }).minimo;
  const max: unknown = (a as { maximo?: unknown }).maximo;
  if (typeof min !== 'number' || typeof max !== 'number') return null;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const minimo = Math.round(min);
  const maximo = Math.round(max);
  if (maximo < 1 || minimo < 0 || minimo > maximo) return null;
  return { minimo, maximo };
}

/** El ritmo. `0` no es «sin dato»: es un juego por turnos, y son cosas distintas. */
function leerRitmo(ficha: ArcadeDelCatalogo | undefined): string {
  const hz: unknown = ficha?.tickHz;
  if (typeof hz !== 'number' || !Number.isFinite(hz) || hz < 0) return '—';
  return hz === 0 ? 'Por turnos' : `${hz} por segundo`;
}

/**
 * QUÉ CIFRA PUBLICA, en las tres respuestas que la ficha sabe pintar.
 *
 * `sin-decir` no es lo mismo que `ninguno`, y por eso son tres y no dos: `ninguno`
 * es una palabra que alguien escribió a propósito en su manifiesto —la línea de
 * menores puede decir «sin marcador» con todas las letras— y `sin-decir` es un
 * manifiesto que llegó roto, del que esta ficha no puede afirmar nada. Fundirlos
 * haría que la app inventara una renuncia que el juego no ha firmado.
 */
type CifraDeLaFicha =
  | { estado: 'sin-decir' }
  | { estado: 'ninguno' }
  | { estado: 'cifra'; rotulo: string; sentido: 'mas-alto' | 'mas-bajo' };

function leerMarcador(ficha: ArcadeDelCatalogo | undefined): CifraDeLaFicha {
  const m: unknown = ficha?.marcador;
  if (typeof m !== 'object' || m === null) return { estado: 'sin-decir' };
  const tipo: unknown = (m as { tipo?: unknown }).tipo;
  if (tipo === 'ninguno') return { estado: 'ninguno' };
  if (tipo !== 'cifra') return { estado: 'sin-decir' };
  const rotulo: unknown = (m as { rotulo?: unknown }).rotulo;
  if (typeof rotulo !== 'string' || rotulo.length === 0) return { estado: 'sin-decir' };
  const sentido: unknown = (m as { sentido?: unknown }).sentido;
  return { estado: 'cifra', rotulo, sentido: sentido === 'mas-bajo' ? 'mas-bajo' : 'mas-alto' };
}

/**
 * ═══ EL RAÍL, LA PASTILLA, LA LUZ Y EL VELO VIVEN EN `piezas.tsx` ═══
 *
 * Estaban escritos aquí, y el raíl además estaba escrito otras dos veces —en la
 * espera de El Arcade y en La Peonza—. Las tres copias se habían separado: aquí
 * las muescas apagadas acabaron en blanco al 70 % después de medirlas, y las otras
 * dos seguían en `SALA.filoVivo`, que es blanco al 14 % y no se ve. La corrección
 * no llegó a las otras dos porque nada las ataba.
 *
 * Así que las piezas que comparten la portada y las pantallas de dentro se han ido
 * a `app/src/arcade/piezas.tsx` con su medida escrita al lado. Aquí queda lo que es
 * de la tarjeta y de nadie más.
 */

/**
 * ═══ LA TARJETA DE UNA MÁQUINA, CONSTRUIDA SOBRE LA DE VELADA ═══
 *
 * No es una tarjeta de arcade retocada para parecerse a la de velada: es el
 * esqueleto de la tarjeta de velada —`TarjetaMundo`, en `app/src/carrusel3d.tsx`—
 * con la piel violeta de la Sala encima. Ése fue el encargo, con estas palabras:
 * partir de un layout que ya está bien en proporción y modificarlo, en vez de
 * seguir adaptando uno que no lo estaba.
 *
 * LO QUE SE COPIA DE ELLA, con su medida:
 *
 *   · el formato: 252 de ancho por un alto fijo, retrato, en carrusel horizontal
 *     — y no una caja a lo ancho de la columna, que era el fallo de raíz: a 378
 *     de ancho una portada casi cuadrada con el título abajo se lee como un
 *     banner, no como una tarjeta;
 *   · el radio de 20 y el borde de 1 teñido del acento (allí `${acento}66`, o sea
 *     el 40 %; aquí `conAlfa(SALA.acento, 0.42)`);
 *   · el relleno de 20 por los cuatro lados, y con él la única vertical de la que
 *     cuelga todo;
 *   · la composición: fila alta con la insignia de estado a la derecha, un
 *     separador `flex: 1` que empuja el texto contra el suelo, y la cascada
 *     nombre → gancho apoyada abajo;
 *   · la escora del carrusel, que es la firma del movimiento de la estantería de
 *     arriba: perspectiva 900, giro de ±16°, escala 0,9 y caída de 14.
 *
 * LO QUE NO SE COPIA, Y POR QUÉ:
 *
 *   · EL COLOR. Allí es un campo oscuro con el acento de tinta; aquí es un campo
 *     de acento con la tinta blanca. Son dos familias del mismo mueble, que era
 *     lo pedido: distinto al taller, pero conviviendo con él.
 *   · EL DESVANECIDO DE LAS VECINAS. La de velada baja las de los lados a
 *     `opacity: 0.62`. Aquí no, y no es un olvido: el blanco de esta portada pasa
 *     el mínimo de contraste con 5,61:1 gracias al velo, y un 0,62 encima se lo
 *     come entero. La escala y el giro ya dicen cuál es la del centro.
 *   · EL PASO. `PASO` es una constante de módulo que importa `fondos-sala.tsx`
 *     para saber en qué velada está el fondo 3D. Esta tarjeta declara el suyo
 *     —hoy vale lo mismo, 266— porque compartir el símbolo haría que cambiar el
 *     ancho de una estantería desincronizara los fondos de la otra sin ningún
 *     error a la vista.
 *   · EL `scrollX`. El del carrusel de veladas no es una posición: es el índice
 *     de velada que leen el fondo 3D, el avatar y el rótulo «estás en». Éste
 *     tiene el suyo y no lo comparte con nadie.
 *   · EL ICONO. `ICONOS_DE_ARCADE` tiene hoy una sola entrada, así que el anillo
 *     que la de velada lleva arriba a la izquierda enseñaría el mismo mando cinco
 *     veces. Ese hueco se queda libre, que además es donde irá la foto.
 *
 * ═══ EL PIE OSCURO, QUE ES LO QUE ELLA NO TIENE ═══
 *
 * La de velada mete sus datos y su llamada DENTRO del campo, separados por un
 * filete. Aquí van en una franja propia sobre `SALA.teja`, porque el encargo pide
 * abajo «más datos y botones de acción» y porque una llamada de texto sobre el
 * acento no se puede: medido, el acento sobre su propio hondo no llega ni a 2:1.
 * En la franja oscura, en cambio, el botón puede ser un botón de verdad.
 *
 * ═══ EL ACENTO ES EL DE LA SALA, Y NO EL DE LA PALETA DE CADA JUEGO ═══
 *
 * `minijuego.paleta` ya no existe. No es un descuido: esa paleta no la declaraba
 * el juego en su manifiesto —era una tabla indexada por `id`, con un turquesa
 * para todo el que no estuviera— y pintar cinco portadas de cinco colores
 * desharía la decisión que sostiene la identidad. La Sala se repinta entera de
 * ámbar, de verde o de carmesí cambiando tres valores.
 *
 * `gancho` y no `lema`: el lema de una velada es literatura para un dosier
 * impreso; el gancho es la línea que hace que alguien toque la tarjeta, de pie y
 * con prisa. El contrato del arcade los separa a propósito.
 */
function TarjetaDeArcade({
  minijuego,
  ficha,
  indice,
  desplazamiento,
}: {
  minijuego: Minijuego;
  ficha: ArcadeDelCatalogo | undefined;
  indice: number;
  desplazamiento: SharedValue<number>;
}): JSX.Element {
  /*
   * Sin ruta, la tarjeta no es pulsable y lo dice. Pasa cuando el arcade declara
   * un mueble que esta versión de la app no sabe pintar: el registro es de
   * ejecución y la app es un binario. Fingir que se puede tocar y no hacer nada al
   * tocarla sería exactamente el fallo mudo que esta portada tiene prohibido.
   */
  const ruta = minijuego.ruta;
  const viva = ruta !== null;

  const aforo = leerAforo(ficha);
  const cifra = leerMarcador(ficha);
  const enElServidor = ficha?.sede === 'servidor';

  /*
   * LA LÍNEA DE DATOS. Es la tabla de tres columnas que tenía la tarjeta ancha,
   * dicha en una frase: aquella tabla se rompía —«RITMO / POR / TURNOS» partido
   * en tres renglones de una columna de 126— y una tabla que se rompe es peor que
   * una frase que se lee. El orden es el de la de velada: primero cuántos caben,
   * después a qué ritmo va.
   */
  const datos: string[] = [];
  if (aforo !== null) {
    datos.push(
      aforo.minimo === aforo.maximo
        ? `${aforo.maximo} ${aforo.maximo === 1 ? 'persona' : 'personas'}`
        : `${aforo.minimo} a ${aforo.maximo} personas`,
    );
  } else if (ficha !== undefined) {
    /*
     * SIN AFORO, SE DICE QUE NO SE SABE. Aquí se imprimía «Aforo —», que es lo que
     * quedaba de la tabla de tres columnas: allí el guion tenía sentido porque
     * estaba debajo de un rótulo que decía AFORO. Suelto en una frase, un guion no
     * es una respuesta, y este renglón sólo puede darse cuando el manifiesto trajo
     * `jugadores` roto o ausente — que es justo el caso en el que hay que decir que
     * no se sabe, y no dibujar una raya.
     */
    datos.push('Aforo sin declarar');
  }
  const ritmo = leerRitmo(ficha);
  if (ritmo !== '—') datos.push(ritmo);

  /*
   * EL MARCADOR, DICHO Y NO INSINUADO. Estuvo arriba, en una cápsula con un
   * triángulo de 8×6 al lado del rótulo, y tenía dos problemas: el plato de esa
   * segunda cápsula no se recortaba del fondo a esa altura (2,56 en carmesí, y no
   * hay alfa que lo arregle), y el triángulo solo dejaba «▲ ESQUIVADAS», que hay
   * que adivinar. Aquí abajo cabe la frase entera y no hace falta adivinar nada.
   */
  const marcador =
    cifra.estado === 'cifra'
      ? `Marcador: ${cifra.rotulo}, ${cifra.sentido === 'mas-alto' ? 'más alto' : 'más bajo'}`
      : null;

  /*
   * ═══ LAS ESPECIFICACIONES MENORES ═══
   *
   *   · LA SEDE va aquí y no en la línea de datos: allí dejaba la frase en dos
   *     renglones con «aparato» solo en el segundo, y además la está diciendo la
   *     pastilla de arriba —«Pide mesa» ES estar en el servidor—. Abajo no
   *     compite, y es donde alguien busca si esto necesita red.
   *   · SÓLO SE JUEGA LLENA gana siempre que sea cierto, porque cambia lo que hay
   *     que hacer: La Ronda con tres personas no empieza. Es el único de todos
   *     que puede dejarte esperando.
   *   · SIN MARCADOR sólo cuando el juego ha dicho `ninguno` con esa palabra. Si
   *     el manifiesto vino roto no se dice nada: inventar una renuncia que el
   *     juego no ha firmado es peor que callarse.
   *   · Y CUANDO HAY CIFRA no se dice aquí, porque ya lo está diciendo la pastilla
   *     de la portada, arriba y con su sentido.
   */
  const soloLlena = aforo !== null && aforo.minimo === aforo.maximo && aforo.maximo > 1;
  const menores: string[] = [];
  if (ficha !== undefined) menores.push(enElServidor ? 'En el servidor' : 'En este aparato');
  if (typeof ficha?.secretos === 'boolean') {
    menores.push(ficha.secretos ? 'con secretos' : 'sin secretos');
  }
  if (soloLlena) menores.push('sólo se juega llena');
  else if (cifra.estado === 'ninguno') menores.push('sin marcador');

  /*
   * EL PILOTO SE ENCIENDE CUANDO SE PUEDE JUGAR AHORA MISMO Y SIN NADIE MÁS. Un
   * arcade de servidor no está apagado: está esperando mesa, que es otra cosa y
   * por eso el piloto es un aro frío y no una luz roja.
   */
  const estado = !viva ? 'No disponible' : enElServidor ? 'Pide mesa' : 'Se juega ya';

  /*
   * LA ESCORA. Copiada de `TarjetaMundo` (carrusel3d.tsx:146-160) con los mismos
   * números, menos la opacidad. Se copia y no se comparte porque compartirla
   * obligaría a compartir `PASO`, que es justo lo que no puede pasar.
   */
  const escora = useAnimatedStyle(() => {
    const centro = indice * PASO_MAQUINA;
    const entrada = [centro - PASO_MAQUINA, centro, centro + PASO_MAQUINA];
    return {
      transform: [
        // La perspectiva primero: sin ella, rotateY sólo encoge, no gira.
        { perspective: 900 },
        { rotateY: `${interpolate(desplazamiento.value, entrada, [16, 0, -16], 'clamp')}deg` },
        { scale: interpolate(desplazamiento.value, entrada, [0.9, 1, 0.9], 'clamp') },
        { translateY: interpolate(desplazamiento.value, entrada, [14, 0, 14], 'clamp') },
      ],
    };
  });

  const cuerpo = (
    <View style={[estilos.maquina, viva && { borderColor: conAlfa(SALA.acento, 0.42) }]}>
      {/*
        LA PORTADA. El orden de las capas es el que deja sitio a la foto: primero
        iría la imagen, luego el degradado, luego la luz, luego el velo, y el
        contenido encima de todo. Hoy la imagen no está y el degradado hace de
        fondo; el día que esté, se mete debajo y no se mueve nada más.
      */}
      <View style={estilos.portada}>
        <LinearGradient
          colors={viva ? [SALA.acento, SALA.acentoHondo] : [SALA.tejaAlta, SALA.teja]}
          /*
           * VERTICAL Y CON EL CORTE EN EL 40 %, y las dos cosas son contraste.
           *
           * La tarjeta ancha lo tenía en diagonal —`end={{x: 0.45, y: 1}}`— y eso
           * al estrechar a 252 se vuelve un fallo: la esquina de arriba a la
           * derecha pasa a caer en t≈0,52, que en ámbar y en verde es exactamente
           * la banda donde ni el blanco ni la tinta oscura llegan a 4,5:1. En
           * vertical, la altura de un elemento determina su fondo y se puede
           * medir; en diagonal depende también de dónde caiga a lo ancho.
           *
           * Y el corte sube del 62 % al 40 % para que el bloque de texto se apoye
           * en hondo del todo y no en una mezcla a medio camino, que es lo que
           * dejaba el nombre en 4,64:1 —catorce centésimas por encima del mínimo—
           * en dos de los cuatro temas.
           */
          locations={[0, 0.4]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {viva && <LuzDeEsquina id={minijuego.id} />}
        <VeloDeLaPortada />

        <View style={estilos.portadaDentro}>
          <View style={estilos.pastillas}>
            <PastillaDeEstado texto={estado} encendido={viva && !enElServidor} />
          </View>

          {/* El hueco de la portada: lo que apoya el texto abajo. Es el `flex: 1` de la de velada. */}
          <View style={estilos.hueco} />

          <RailDeAforo aforo={aforo} viva={viva} estilo={estilos.railDeLaTarjeta} />
          {/*
            ═══ EL TOPE DE AMPLIACIÓN DE LETRA, QUE ES UNA CONCESIÓN Y SE DICE ═══

            La portada es una caja de alto FIJO —228— y `overflow: 'hidden'`, así
            que el texto que no quepa no se reajusta: se corta. Con la ampliación
            de letra del sistema al 200 % —«Texto más grande» de iOS, «Tamaño de
            fuente» de Android— el nombre y el gancho suman 89 + 88·m píxeles, y a
            m=2 eso es 265 contra 228 disponibles.

            El tope está calculado, no elegido a ojo: cabe hasta m=1,58, y se pone
            1,5 para no depender del redondeo. Es una limitación real —quien use
            el sistema por encima del 150 % ve esta tarjeta más pequeña de lo que
            ha pedido— y la alternativa era peor: dejar que se corte el gancho a
            mitad de palabra sin que nada avise.

            El PIE no lo lleva, y a propósito: allí el texto puede crecer porque lo
            único que hay debajo es el botón, que se queda pegado al suelo con su
            `marginTop: 'auto'`.
          */}
          <Text
            style={[estilos.nombre, !viva && estilos.tintaApagada]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.5}
          >
            {minijuego.nombre}
          </Text>
          <Text
            style={[estilos.gancho, !viva && estilos.ganchoApagado]}
            numberOfLines={3}
            maxFontSizeMultiplier={1.5}
          >
            {minijuego.gancho}
          </Text>
        </View>
      </View>

      <View style={estilos.pie}>
        {datos.length > 0 && (
          <Text style={estilos.datos} numberOfLines={2}>
            {datos.join(' · ')}
          </Text>
        )}
        {marcador !== null && (
          <Text style={estilos.menores} numberOfLines={1}>
            {marcador}
          </Text>
        )}
        {/*
          ═══ EN UNA TARJETA APAGADA, LA LÍNEA MENUDA CEDE SU SITIO ═══

          Cuando no se puede jugar, lo que hay que leer es POR QUÉ, y esa razón
          puede medir 161 caracteres —seis las hay, y la más larga es ésa—. Con la
          línea menuda delante sólo quedaban cuatro renglones para la razón y se
          cortaba a mitad de frase; sin ella caben seis de sobra, porque además no
          hay botón que alimentar.

          Y lo que se cede es lo que menos importa en ese caso: dónde vive la
          máquina y si guarda secretos son datos de una partida que aquí no se va
          a poder empezar.
        */}
        {viva && menores.length > 0 && (
          <Text style={estilos.menores} numberOfLines={2}>
            {menores.join(' · ')}
          </Text>
        )}
        {/*
          ═══ LA RAZÓN, EN SU PROPIO RENGLÓN Y CADA UNA LA SUYA ═══

          Aquí había una sola frase para todos los casos: «esta versión de la app
          todavía no sabe pintarlo». Servía cuando la Sala sólo listaba lo que
          venía dentro, porque entonces era el único motivo posible. Desde que se
          lista también lo del SERVIDOR hay cuatro, y esa frase es falsa en tres:
          un juego puede faltar porque el mueble es desconocido, porque sus
          píxeles viven en otro binario, porque no hay ni mesa ni reglas aquí, o
          porque el juego no publica nada que pintar. Quien las lee hace algo
          distinto con cada una —actualizar, esperar, o nada—, y darle la
          equivocada es mandarle a hacer algo que no sirve.

          Cuatro renglones y no dos: en una tarjeta apagada no hay botón, así que
          este texto hereda su sitio. La más larga de las seis razones mide 161
          caracteres, que a este cuerpo son cuatro renglones justos.

          Y no lleva color de fallo: la Sala no tiene ninguno. Un juego que no se
          pinta aquí no es un error, es una máquina que no está instalada en este
          mueble, así que se dice en `tenue` y en cursiva —voz de la casa— y no en
          la alarma, que está reservada a lo que se acaba y a lo que mata dentro
          de una partida.
        */}
        {minijuego.porque !== null && (
          <Text style={estilos.motivo} numberOfLines={6}>
            {minijuego.porque}
          </Text>
        )}
        {viva && (
          /*
            EL BOTÓN VA RELLENO DE ACENTO CON TINTA OSCURA, y es la única pareja
            sólida que pasa en los cuatro temas a la vez: 5,01 en violeta, 9,22 en
            ámbar, 8,69 en verde y 5,40 en carmesí. En blanco se caería a 1,98 en
            ámbar, que es el mismo fallo que ya costó una corrección en la placa.
            Y el relleno se recorta de la teja del pie con 4,58 en el peor caso.

            No es pulsable por su cuenta: la tarjeta entera ya es el botón —el
            `Pulsable` de abajo le pone `accessibilityRole="button"`— y un control
            dentro de otro control es un conflicto de gestos y una parada de
            tabulador de más que dice lo mismo. Por eso va oculto a accesibilidad:
            se ve, se pulsa con el resto de la tarjeta, y no se anuncia dos veces.
          */
          <View
            style={estilos.boton}
            /*
              LAS TRES PROPIEDADES, PORQUE CADA UNA SIRVE EN UN SITIO.
              `importantForAccessibility` sólo existe en Android; iOS necesita
              `accessibilityElementsHidden`, y react-native-web descarta las dos y
              sólo entiende `aria-hidden`. Con una sola, el botón se anunciaba
              aparte en las otras dos plataformas y el lector leía «Echar una» a
              continuación de la etiqueta de la tarjeta, que ya dice lo mismo.
            */
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            aria-hidden
          >
            <Text style={estilos.botonTexto}>Echar una</Text>
            <Svg width={7} height={11} viewBox="0 0 7 11">
              <Path
                d="M1.2 1.2 L5.4 5.5 L1.2 9.8"
                stroke={SALA.suelo}
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Animated.View style={escora}>
      {ruta === null ? (
        cuerpo
      ) : (
        <Pulsable
          onPress={() => router.push(ruta)}
          /*
            EL ESTADO VA EN LA ETIQUETA, y no sólo en la pastilla. La pastilla vive
            dentro del `Pulsable`, que es un único elemento accesible: su texto no
            se anuncia por separado. Sin esto, con lector de pantalla se oía «Jugar
            a La Ronda, botón» y nunca «Pide mesa» — o sea, se perdía la diferencia
            entre poder jugar ahora y tener que esperar mesa, que es exactamente lo
            que la pastilla existe para decir.
          */
          accessibilityLabel={`Jugar a ${minijuego.nombre}. ${estado}. ${minijuego.gancho}`}
        >
          {cuerpo}
        </Pulsable>
      )}
    </Animated.View>
  );
}

/**
 * LA ESTANTERÍA DE MÁQUINAS: el mismo carrusel que el de las veladas.
 *
 * Mismo centrado —la del medio queda en el eje de la pantalla y las vecinas
 * asoman escoradas—, mismo imantado y mismo hueco. Lo que NO comparte con aquél
 * es el valor de desplazamiento: allí ese número es el índice de velada del que
 * cuelgan el fondo 3D, el giro del avatar y el rótulo «estás en», y enchufarle
 * una segunda barra los movería a todos.
 *
 * EN LA WEB NO IMANTA, y conviene saberlo antes de que parezca un fallo:
 * `react-native-web` no implementa `snapToInterval` —lo único que traduce a
 * `scroll-snap` de CSS es `pagingEnabled`, que pagina por pantallas enteras y no
 * por tarjetas—, así que en el navegador ruedan libres. Es exactamente lo que ya
 * hace el carrusel de veladas desde el primer día, o sea que las dos estanterías
 * se comportan igual, que era la idea.
 */
function CarruselDeMaquinas({
  maquinas,
  fichas,
  anchoPantalla,
}: {
  maquinas: Minijuego[];
  fichas: Map<string, ArcadeDelCatalogo>;
  anchoPantalla: number;
}): JSX.Element {
  const desplazamiento = useSharedValue(0);
  const alScroll = useAnimatedScrollHandler((e) => {
    desplazamiento.value = e.contentOffset.x;
  });
  const margen = Math.max((anchoPantalla - ANCHO_MAQUINA) / 2, espacio.lg);

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={PASO_MAQUINA}
      onScroll={alScroll}
      scrollEventThrottle={16}
      style={estilos.estanteria}
      contentContainerStyle={{
        paddingHorizontal: margen,
        paddingVertical: espacio.sm,
        gap: HUECO_MAQUINA,
      }}
    >
      {maquinas.map((maquina, i) => (
        <TarjetaDeArcade
          key={maquina.id}
          minijuego={maquina}
          ficha={fichas.get(maquina.id)}
          indice={i}
          desplazamiento={desplazamiento}
        />
      ))}
    </Animated.ScrollView>
  );
}

/**
 * LA CABECERA DE LA SALA: cómo se llama, cuántas máquinas hay y qué son.
 *
 * El recuento va en cifra de dos dígitos porque es un letrero de sala y no una
 * frase, y porque así no baila de ancho cuando entre la sexta máquina.
 */
function CabeceraDeSala({ cuantas }: { cuantas: number }): JSX.Element {
  return (
    <View style={{ marginBottom: espacio.lg }}>
      <View style={estilos.salaCabeceraFila}>
        <Text style={estilos.salaTitulo}>La sala de arcade</Text>
        <Text style={estilos.salaRecuento}>
          {String(cuantas).padStart(2, '0')} {cuantas === 1 ? 'máquina' : 'máquinas'}
        </Text>
      </View>
      <Text style={estilos.salaSubtitulo}>
        Juegos para ahora mismo: se abre y se juega, sin montar nada.
      </Text>
      <View style={estilos.salaFilete} />
    </View>
  );
}

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

/**
 * EL FILO DE LA SALA: un píxel, y OCUPA SITIO.
 *
 * No hay materia en esta sala —ni metal, ni textura, ni relieve, ni sombra de
 * objeto físico—, así que lo único que separa una superficie de otra es este
 * borde de un píxel y la elevación. Va como constante y no escrito en cada estilo
 * porque el día que deje de ser uno tiene que dejar de serlo en los once sitios a
 * la vez; el COLOR es `SALA.filo` y vive en la tabla.
 *
 * Y de aquí sale el hueco de abajo. En React Native un borde empuja el contenido
 * hacia dentro, así que una tarjeta con borde de 1 y `padding: 20` deja el texto a
 * 21 del canto, y las DOS superficies de la ficha —portada y pie— dejarían de
 * alinear entre sí y con la tarjeta de velada de la misma pantalla. Se resta del
 * hueco en vez de ignorarlo.
 *
 * Eran dos huecos —uno ancho para la placa y otro estrecho para las tres franjas
 * de datos— y ha quedado uno solo porque las tres franjas ya no existen. Un único
 * margen para toda la tarjeta es también lo que hace la de velada, y es la mitad
 * de la razón por la que aquélla se lee aplomada: todo cuelga de la misma vertical.
 */
const FILO = 1;
/**
 * EL MARGEN DE LA TARJETA. Son los `espacio.lg` —20— de la tarjeta de velada, y
 * van SIN descontar el filo.
 *
 * Estuvo en `espacio.lg - FILO`, con el argumento de que en React Native el borde
 * empuja el contenido hacia dentro y hay que compensarlo. Es cierto, pero aquí
 * hacía justo lo contrario de lo que pretendía: la de velada lleva borde de 1 Y
 * relleno de 20, o sea el texto a 21 del canto; descontando el filo, aquí quedaba
 * a 20. La compensación tenía sentido cuando esta ficha tenía cuatro franjas que
 * alinear con un raíl que iba por fuera; con dos superficies y todo dentro, lo que
 * hay que igualar es la otra tarjeta.
 */
const HUECO = espacio.lg;

/**
 * ═══ LAS MEDIDAS DE UNA MÁQUINA, QUE SON LAS DE UNA VELADA ═══
 *
 * `ANCHO_MAQUINA` es el `ANCHO_MUNDO` de `carrusel3d.tsx` copiado a mano, y tiene
 * que seguir siéndolo: las dos estanterías se ven a la vez en esta pantalla y un
 * ancho distinto se lee como un descuido, no como dos familias.
 *
 * El ALTO sí difiere —392 contra 340— y es porque esta tarjeta tiene una franja
 * que aquélla no: la de velada mete sus datos y su llamada dentro del campo de
 * color, y aquí el encargo pide abajo un pie oscuro con más datos y un botón.
 * De los 392: 228 de portada, 162 de pie y 2 de filo.
 *
 * Y `PASO_MAQUINA` se declara aquí en vez de importar `PASO`. Hoy valen lo mismo,
 * 266, y aun así no pueden ser el mismo símbolo: `PASO` lo importa
 * `fondos-sala.tsx` para saber en qué velada está el fondo 3D, así que cambiar el
 * ancho de ESTA estantería desincronizaría los fondos de la OTRA, sin ningún
 * error y sin nada que lo delate en pantalla salvo que el fondo se queda a medio
 * camino. Dos constantes con el mismo valor y motivos distintos son dos
 * constantes.
 */
const ANCHO_MAQUINA = 252;
const ALTO_PORTADA = 228;
const ALTO_MAQUINA = 392;
const HUECO_MAQUINA = espacio.md;
const PASO_MAQUINA = ANCHO_MAQUINA + HUECO_MAQUINA;

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
  verPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espacio.md,
    paddingVertical: 14,
    paddingHorizontal: espacio.md,
    borderWidth: 1,
    borderColor: 'rgba(232,207,127,0.24)',
    borderRadius: radio.md,
    backgroundColor: 'rgba(232,207,127,0.05)',
  },
  verPanelTexto: {
    fontFamily: fuente.titulo,
    fontSize: 12,
    letterSpacing: 1.4,
    color: color.oro300,
  },
  verPanelFlecha: { fontSize: 20, color: 'rgba(232,207,127,0.6)' },

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

  /* ═══════════════════ LA SALA DE ARCADE ═══════════════════
   *
   * NI UNA `fontFamily` EN TODO ESTE BLOQUE, y es a propósito. La app sólo trae
   * Cinzel y Cormorant, que son las letras del taller de veladas; la Sala usa el
   * palo seco DEL SISTEMA —que en cada aparato es el que mejor se lee en ese
   * aparato— y el trabajo de cartel lo hacen el peso, la caja alta y el tracking
   * de `LETRA`. Nombrar una fuente que no está instalada no da error: cae en la
   * del sistema en silencio, y entonces la tabla miente.
   *
   * LOS TAMAÑOS NO SON LOS DE LA MAQUETA AL PIE DE LA LETRA, y conviene decir por
   * qué. La maqueta rotula en 8,5 y 9 píxeles, que es lo normal en una lámina de
   * diseño y está por debajo del mínimo de texto de esta casa, que es 13. Lo que
   * se conserva es la JERARQUÍA —el nombre manda, el gancho acompaña, los rótulos
   * son la letra pequeña— subiendo el escalón más bajo a 13 y escalando el resto
   * para que las proporciones aguanten. Un rótulo ilegible no es sobrio, es un
   * rótulo que no está.
   */

  salaBanda: {
    marginTop: espacio.xl,
    paddingTop: espacio.xl,
    paddingBottom: espacio.xl,
    paddingHorizontal: espacio.lg,
    backgroundColor: SALA.suelo,
    borderTopWidth: FILO,
    borderBottomWidth: FILO,
    borderColor: SALA.filo,
  },
  salaCabeceraFila: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: espacio.md,
  },
  salaTitulo: { ...LETRA.rotulo, fontSize: 15, color: SALA.palabra },
  salaRecuento: { ...LETRA.rotuloChico, fontSize: 13, color: SALA.cifra },
  salaSubtitulo: {
    ...LETRA.cuerpo,
    fontSize: 15,
    lineHeight: 21,
    color: SALA.tenue,
    marginTop: espacio.sm,
  },
  /* A sangre: el filete cruza la banda entera, que es lo que la cierra por arriba. */
  salaFilete: {
    height: FILO,
    backgroundColor: SALA.filo,
    marginTop: espacio.md,
    marginHorizontal: -espacio.lg,
  },

  /*
   * LA SALA VACÍA. Sin acento: no hay nada vivo que señalar.
   *
   * `RADIO.tarjeta` y no `RADIO.ficha`: esta caja ocupa el sitio de las tarjetas
   * y se mira desde la misma distancia, así que el radio de un panel de dentro de
   * partida —14— la dejaba con una esquina distinta de todo lo que la rodea.
   */
  salaVacia: {
    borderRadius: RADIO.tarjeta,
    borderWidth: FILO,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
    padding: espacio.lg - FILO,
    gap: 6,
  },
  salaVaciaTitulo: { ...LETRA.rotulo, fontSize: 20, color: SALA.palabra },
  salaVaciaCuerpo: { ...LETRA.cuerpo, fontSize: 15, lineHeight: 21, color: SALA.tenue },

  /*
   * EL RAÍL DEL AFORO, que vive en la portada justo encima del nombre.
   *
   * Ése es el sitio que en la tarjeta de velada ocupa el GÉNERO —«misterio y
   * deducción»—, y el raíl hace aquí su papel: es el escalón pequeño que abre la
   * cascada de texto. Con una diferencia a favor: el género es una etiqueta y el
   * raíl es un dato. Doce muescas, cuatro, una — las cinco máquinas se distinguen
   * por el largo del raíl antes de leer una palabra.
   *
   * Las medidas son de `CUENTA_DE_AFORO`; el hueco lo calcula `huecoDelRail`.
   */
  /*
   * EL RAÍL LO PINTA `piezas.tsx`; lo único que es de la tarjeta es el hueco que
   * deja entre él y el nombre. Va aquí y no en la pieza porque en la espera de El
   * Arcade el raíl no lleva nada debajo, y un margen metido en la pieza sería una
   * decisión de esta pantalla cobrada a las otras dos.
   */
  railDeLaTarjeta: { marginBottom: 10 },

  /*
   * LAS PASTILLAS SE APILAN Y SE VAN A LA DERECHA. Ocupan la esquina que en la
   * tarjeta de velada ocupa la insignia DISPONIBLE/MUY PRONTO, que es de donde
   * sale esta composición. La cápsula en sí la pinta `piezas.tsx`.
   */
  pastillas: { alignItems: 'flex-end', gap: 6 },

  /*
   * LA ESTANTERÍA SANGRA POR LOS DOS LADOS. `salaBanda` tiene 20 de margen y un
   * carrusel con margen no es un carrusel: las tarjetas se cortarían contra un
   * canto invisible en vez de salirse por el borde de la pantalla. El mismo
   * truco que ya usa `salaFilete` aquí al lado.
   */
  estanteria: { marginHorizontal: -espacio.lg },

  /*
   * LA TARJETA. Radio 20 y borde teñido del acento: los dos son los de la
   * tarjeta de velada —allí el borde es `${paleta.acento}66`, o sea el 40 %—. En
   * una máquina que no se puede jugar el borde vuelve a `SALA.filo`, porque el
   * acento en esta sala significa una sola cosa y no puede decirla en una ficha
   * apagada.
   */
  maquina: {
    width: ANCHO_MAQUINA,
    height: ALTO_MAQUINA,
    borderRadius: RADIO.tarjeta,
    borderWidth: FILO,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
    overflow: 'hidden',
  },

  /*
   * LA PORTADA: el único sitio donde vive el color, y ocupa casi dos tercios de
   * la tarjeta. Lo que había antes de todo esto hacía justo lo contrario —un filo
   * turquesa, un neón turquesa, un icono turquesa, un título turquesa y una
   * flecha turquesa— y ésa es la razón medible de que se leyera barata: un acento
   * repartido en veinte detalles se apaga; concentrado en un plano grande, brilla.
   *
   * `overflow: 'hidden'` porque dentro van cuatro capas absolutas —y una quinta
   * el día de la foto— y ninguna puede asomar por el pie.
   */
  /*
   * EL FILO DE ABAJO ES PARA LA TARJETA APAGADA. En una viva no hace falta: entre
   * el hondo del acento y la teja del pie hay un escalón de color que separa solo.
   * En una apagada la portada acaba en `SALA.teja` y el pie ES `SALA.teja`, o sea
   * 1,04:1 — la tarjeta se queda en una losa lisa de 252×392 con texto encima y no
   * se distingue dónde acaba la portada. Un píxel de `SALA.filo` lo resuelve, y en
   * la viva se pierde bajo el acento sin molestar.
   */
  portada: {
    height: ALTO_PORTADA,
    overflow: 'hidden',
    borderBottomWidth: FILO,
    borderBottomColor: SALA.filo,
  },
  portadaDentro: { flex: 1, padding: HUECO },
  hueco: { flex: 1 },

  /*
   * EL BLOQUE DE TEXTO. Los cuerpos salen de la tarjeta de velada bajados un
   * escalón: allí el nombre va a 30/36 en Cinzel, una serif estrecha; aquí a
   * 26/31 en el palo seco del sistema a peso 800 y en caja alta, que a igualdad
   * de cuerpo ocupa bastante más. Medido, «LA FRENTE» a 26 mide 167 de los 210
   * útiles; a 30 se iría a 193 y cualquier nombre de diez letras se partiría.
   *
   * Los dos van a BLANCO ENTERO. Sobre el hondo con el velo encima y la luz de
   * esquina contada, el peor de los cuatro temas da 5,61 para el nombre y 7,33
   * para el gancho; con un 90 % de opacidad se quedarían en 4,6 y 5,9, y el margen
   * es justo lo que hace que esto siga pasando el día que alguien meta una
   * animación de entrada.
   */
  nombre: { ...LETRA.rotulo, fontSize: 26, lineHeight: 31, color: SALA.blanco },
  gancho: {
    ...LETRA.cuerpo,
    fontSize: 14.5,
    lineHeight: 19,
    color: SALA.blanco,
    marginTop: 4,
  },
  /* En una ficha apagada la portada es gris, así que la tinta deja de ser blanca. */
  tintaApagada: { color: SALA.palabra },
  ganchoApagado: { color: SALA.tenue },

  /*
   * EL PIE OSCURO. Ocupa lo que sobra —162 de los 392— y ordena de arriba abajo:
   * los datos, la letra menuda, y el botón pegado al suelo con `marginTop: 'auto'`.
   * Ese `auto` es lo que mantiene el botón en la misma línea en las cinco tarjetas
   * aunque una tenga dos renglones de datos y otra uno.
   */
  pie: { flex: 1, paddingHorizontal: HUECO, paddingTop: 13, paddingBottom: 16, gap: 3 },
  /*
   * 13,5 Y SEPARADOR ESTRECHO. La línea más larga de las cinco máquinas es «2 a 12
   * personas · 10 por segundo»: a 14 y con el separador de dos espacios medía 224
   * de los 210 útiles y partía dejando «segundo» solo en el segundo renglón. A
   * 13,5 y con ` · ` cabe en uno. La de velada resuelve lo mismo con menos texto
   * —«4 a 12 personas · Una noche», 27 caracteres contra 32— y por eso puede
   * permitirse 14,5.
   */
  datos: { ...LETRA.cuerpo, fontSize: 13.5, lineHeight: 19, color: SALA.tenue },
  /*
   * LA LÍNEA MENUDA EN CAJA BAJA, y no en las versalitas con tracking que llevaba.
   * El pie tenía cuatro voces —frase, versalitas, cursiva y versalitas de acento—
   * donde la tarjeta de velada tiene dos, y un pie con cuatro tipografías se lee
   * como una ficha técnica por mucho que las cajas hayan desaparecido. La
   * jerarquía la da el escalón de cuerpo —12,5 contra 14— y no una rebaja de
   * alfa: `tenue` entero da 5,95 sobre la teja, y al 85 % se quedaría en 4,64.
   */
  menores: { ...LETRA.cuerpo, fontSize: 12.5, lineHeight: 17, color: SALA.tenue },
  motivo: {
    ...LETRA.cuerpo,
    fontSize: 12.5,
    lineHeight: 17,
    fontStyle: 'italic',
    color: SALA.tenue,
  },

  /*
   * EL BOTÓN. Relleno de acento con tinta `SALA.suelo`: los números y el porqué
   * están donde se pinta. Alto 42, que pasa del mínimo de 44 de área táctil sólo
   * porque el área táctil de verdad es la tarjeta entera, de 252 por 392.
   */
  boton: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: RADIO.mando,
    backgroundColor: SALA.acento,
  },
  botonTexto: { ...LETRA.rotulo, fontSize: 14, color: SALA.suelo },

  /*
   * El aviso de que no se pudo preguntar al servidor. Con borde discontinuo, que
   * es como esta casa dice «esto no es contenido, es un estado», y sin acento
   * salvo en la palabra que se pulsa.
   */
  salaSinRed: {
    /* Mismo radio que las tarjetas: está tres píxeles debajo de ellas, en la misma banda. */
    borderRadius: RADIO.tarjeta,
    borderWidth: FILO,
    borderStyle: 'dashed',
    borderColor: SALA.filo,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg - FILO,
    gap: 8,
  },
  salaSinRedTexto: { ...LETRA.cuerpo, fontSize: 15, lineHeight: 21, color: SALA.tenue },
  salaSinRedAccion: { ...LETRA.rotuloChico, fontSize: 13, color: SALA.acento },

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
