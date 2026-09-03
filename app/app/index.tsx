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
   * razón cuando no hay ruta—, y la anatomía nueva de la ficha pinta además lo que
   * el juego DECLARA: el aforo del raíl, la sede, el ritmo, el mueble, si esconde
   * algo y qué cifra publica. Eso vive en el manifiesto y no en `Minijuego`.
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
              LA PRIMERA VA GRANDE. No porque sea mejor, sino porque una fila de
              cinco cajas iguales no tiene por dónde empezar a mirarse: la
              destacada da el tamaño de la placa y las otras cuatro se leen como
              variaciones de ella. Es la misma anatomía en las cinco.
            */
            <View style={{ gap: espacio.xl }}>
              {sala.map((minijuego, i) => (
                <TarjetaDeArcade
                  key={minijuego.id}
                  minijuego={minijuego}
                  ficha={fichasPorId.get(minijuego.id)}
                  destacada={i === 0}
                />
              ))}
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

/** El aforo dicho como cifra, que es lo que el raíl no puede decir cuando falta. */
function aforoEnCifra(aforo: { minimo: number; maximo: number } | null): string {
  return aforo === null ? '—' : `${aforo.minimo}–${aforo.maximo}`;
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
 * LA FIRMA DE LA SALA: el raíl de muescas del aforo.
 *
 * Tantas muescas como personas admite la máquina y encendidas las que hacen falta
 * para empezar. La Frente son doce con dos —el raíl más largo—, La Ronda cuatro y
 * las cuatro porque sólo se juega llena, El Arcade y La Peonza una sola. Puestas
 * en fila, las cinco se distinguen por la longitud del raíl antes de leer una
 * palabra: es ornamento que informa, que es el único que sobrevive a que alguien
 * añada un juego. Las medidas son de `CUENTA_DE_AFORO` y no de aquí.
 *
 * ═══ EL HUECO SE ENCOGE, EL NÚMERO DE MUESCAS NO ═══
 *
 * Un arcade de fuera puede declarar el aforo que quiera, y con el hueco fijo un
 * aforo de veinte se saldría de la ficha por la derecha. Recortar muescas estaba
 * descartado: el raíl dejaría de contar, que es lo único que hace. Así que lo que
 * cede es la separación, y el raíl nunca pasa del largo del más largo que hay.
 *
 * Por encima de cuarenta no se dibuja nada. Cuarenta rayas no se cuentan de un
 * vistazo —dejan de ser una cuenta y pasan a ser una textura— y la cifra exacta
 * está dos renglones más abajo, en la celda de AFORO, que es donde no engaña.
 */
const TOPE_DEL_RAIL = 12;
const MAS_MUESCAS_DE_LAS_QUE_SE_CUENTAN = 40;

function huecoDelRail(muescas: number, base: number): number {
  if (muescas <= 1) return 0;
  const { grosor } = CUENTA_DE_AFORO;
  const largoDelMasLargo = TOPE_DEL_RAIL * grosor + (TOPE_DEL_RAIL - 1) * base;
  if (muescas <= TOPE_DEL_RAIL) return base;
  return Math.max(2, (largoDelMasLargo - muescas * grosor) / (muescas - 1));
}

function RailDeAforo({
  aforo,
  destacada,
  viva,
}: {
  aforo: { minimo: number; maximo: number } | null;
  destacada: boolean;
  viva: boolean;
}): JSX.Element | null {
  if (aforo === null || aforo.maximo > MAS_MUESCAS_DE_LAS_QUE_SE_CUENTAN) return null;
  const hueco = huecoDelRail(
    aforo.maximo,
    destacada ? CUENTA_DE_AFORO.huecoDestacada : CUENTA_DE_AFORO.huecoHilera,
  );
  const encendidas = Math.min(aforo.minimo, aforo.maximo);
  return (
    <View
      style={[estilos.rail, { gap: hueco }]}
      accessibilityRole="image"
      accessibilityLabel={`Aforo: de ${aforo.minimo} a ${aforo.maximo} jugadores`}
    >
      {Array.from({ length: aforo.maximo }, (_, i) => (
        <View
          key={i}
          style={[
            estilos.muesca,
            i < encendidas ? estilos.muescaEncendida : estilos.muescaApagada,
            /*
              Y EN UNA MÁQUINA QUE NO SE PUEDE JUGAR AQUÍ, EL RAÍL NO SE ENCIENDE.
              El acento sólo significa una cosa en esta sala —esto está vivo o se
              puede tocar—; un raíl de acento sobre una ficha apagada diría que sí
              con el color mientras el pie dice que no con la palabra.
            */
            i < encendidas && !viva && estilos.muescaSinCorriente,
          ]}
        />
      ))}
    </View>
  );
}

/** La cifra que publica el juego, arriba a la derecha DENTRO de la placa. */
function PastillaDeMarcador({
  rotulo,
  sentido,
  estrecha,
}: {
  rotulo: string;
  sentido: 'mas-alto' | 'mas-bajo';
  estrecha: boolean;
}): JSX.Element {
  return (
    <View style={estilos.pastilla}>
      <Text style={estilos.pastillaRotulo} numberOfLines={1}>
        Marcador
      </Text>
      <Text style={estilos.pastillaValor} numberOfLines={1}>
        {rotulo}
      </Text>
      {/* Con la placa compacta no cabe el sentido, y el rótulo es lo que importa. */}
      {!estrecha && (
        <View style={estilos.pastillaSentido}>
          <Svg width={8} height={6} viewBox="0 0 8 6">
            <Path
              d={sentido === 'mas-alto' ? 'M4 0 L8 6 L0 6 Z' : 'M4 6 L8 0 L0 0 Z'}
              fill={conAlfa(SALA.blanco, 0.8)}
            />
          </Svg>
          <Text style={estilos.pastillaSentidoTexto}>
            {sentido === 'mas-alto' ? 'Más alto' : 'Más bajo'}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Una de las tres columnas de datos: el rótulo encima y el valor debajo.
 *
 * `tabique` es el filo que separa una columna de la siguiente, y lo pone la celda
 * de la DERECHA y no la de la izquierda: así la primera no tiene que saber que es
 * la primera y la fila no queda con una raya suelta contra el canto de la ficha.
 */
function DatoDeFicha({
  etiqueta,
  valor,
  tabique,
  cifra,
}: {
  etiqueta: string;
  valor: string;
  tabique?: boolean;
  cifra?: boolean;
}): JSX.Element {
  return (
    <View style={[estilos.celda, tabique === true && estilos.celdaConTabique]}>
      <Text style={estilos.celdaEtiqueta}>{etiqueta}</Text>
      <Text
        style={[estilos.celdaValor, cifra === true && estilos.celdaValorCifra]}
        numberOfLines={2}
      >
        {valor}
      </Text>
    </View>
  );
}

/**
 * LA TARJETA DE UNA MÁQUINA. De arriba abajo: raíl, placa, datos, menores, pie.
 *
 * ═══ EL COLOR VIVE EN UN SOLO SITIO Y ES GRANDE ═══
 *
 * La placa del nombre es un campo de acento saturado que ocupa media ficha, y todo
 * lo demás es gris frío. Lo que había antes hacía justo lo contrario —un filo
 * turquesa, un neón turquesa, un icono turquesa, un título turquesa y una flecha
 * turquesa— y ésa es la razón medible de que se leyera barata: un acento repartido
 * en veinte detalles se apaga; concentrado en un plano grande, brilla.
 *
 * ═══ EL ACENTO ES EL DE LA SALA, Y NO EL DE LA PALETA DE CADA JUEGO ═══
 *
 * `minijuego.paleta` sigue existiendo y esta ficha ya no lo mira. No es un
 * descuido: esa paleta no la declara el juego en su manifiesto —es una tabla de
 * `vitrina.ts` indexada por `id`, con un turquesa para todo el que no esté— y
 * pintar cinco placas de cinco colores desharía la decisión de arriba, que es la
 * que sostiene la identidad. La Sala se repinta entera de ámbar, de verde o de
 * carmesí cambiando tres valores de `TEMAS_DE_SALA`, y con la paleta por juego esa
 * tabla no serviría para nada.
 *
 * ═══ Y NO HAY ICONO, QUE ES LO QUE AQUÍ SE PINTABA PRIMERO ═══
 *
 * La anatomía elegida no lo lleva: quien manda es el nombre en caja alta sobre el
 * acento. De paso desaparece el agujero que este fichero documentaba —indexar
 * `ICONOS_DE_ARCADE` con un campo que escribe otro repositorio devolvía `undefined`
 * y `<undefined />` lanza durante el render, dejando la portada en blanco para
 * todos los juegos—. La normalización que lo tapaba sigue en `laSala`, intacta y
 * sin este consumidor.
 *
 * `gancho` y no `lema`: el lema de una velada es literatura para un dosier
 * impreso; el gancho es la línea que hace que alguien toque la tarjeta, de pie y
 * con prisa. El contrato del arcade los separa a propósito.
 */
function TarjetaDeArcade({
  minijuego,
  ficha,
  destacada,
}: {
  minijuego: Minijuego;
  ficha: ArcadeDelCatalogo | undefined;
  destacada: boolean;
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
   * ═══ LAS ESPECIFICACIONES MENORES: TRES COSAS Y NO CUATRO ═══
   *
   * Es una línea de letra pequeña y aguanta tres datos; a la cuarta deja de
   * leerse de un vistazo y se convierte en un párrafo disfrazado. Así que el
   * tercer sitio lo pelean tres hechos y gana el que más dice de esta máquina:
   *
   *   · SÓLO SE JUEGA LLENA es el que gana siempre que sea cierto, porque cambia
   *     lo que hay que hacer: La Ronda con tres personas no empieza. Es el único
   *     de los tres que puede dejarte esperando.
   *   · SIN MARCADOR sólo cuando el juego ha dicho `ninguno` con esa palabra. Si
   *     el manifiesto vino roto no se dice nada: inventar una renuncia que el
   *     juego no ha firmado es peor que callarse.
   *   · Y CUANDO HAY CIFRA no se dice aquí, porque ya lo está diciendo la
   *     pastilla de la placa, en grande y con su sentido. Repetirlo sería la
   *     misma cosa dicha dos veces a dos tamaños.
   */
  const soloLlena = aforo !== null && aforo.minimo === aforo.maximo && aforo.maximo > 1;
  const menores: string[] = [];
  if (typeof ficha?.mueble === 'string' && ficha.mueble.length > 0) {
    menores.push(`Mueble ${ficha.mueble}`);
  }
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
  const estado = !viva
    ? 'No se puede aquí'
    : enElServidor
      ? 'Pide mesa'
      : 'Se juega ahora · sin red';

  const cuerpo = (
    <View>
      <RailDeAforo aforo={aforo} destacada={destacada} viva={viva} />

      <View style={estilos.ficha}>
        {/*
          LA PLACA. Degradado del acento a su fondo, y en una máquina que no se
          puede jugar aquí, los dos grises de la casa: apagarla es la forma más
          corta de decir que no se puede tocar, y la razón se lee debajo.
        */}
        <LinearGradient
          colors={viva ? [SALA.acento, SALA.acentoHondo] : [SALA.tejaAlta, SALA.teja]}
          /*
           * EL HONDO LLEGA AL 62 % Y NO AL FINAL, Y ESTO ES CONTRASTE Y NO GUSTO.
           *
           * El texto de la placa es blanco, y el blanco sólo aguanta sobre el
           * extremo HONDO del degradado: medido, sobre el claro da 3,66:1 en
           * violeta y 1,98:1 en ámbar, o sea el nombre del juego casi ilegible.
           * Sobre el hondo da 6,57 y 4,64, que pasan.
           *
           * Con el degradado repartido hasta el 100 %, el nombre se apoyaba en
           * una mezcla a medio camino. Cerrándolo en el 62 % el tercio de abajo
           * —donde se apoya el texto, por el `flex-end` de aquí abajo— es hondo
           * del todo, y la mitad de arriba sigue siendo el acento vivo, que es
           * lo que tiene que brillar.
           */
          locations={[0, 0.62]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.45, y: 1 }}
          style={[
            estilos.placa,
            destacada ? estilos.placaDestacada : estilos.placaHilera,
            cifra.estado === 'cifra' && !destacada && estilos.placaConPastilla,
          ]}
        >
          {cifra.estado === 'cifra' && (
            <PastillaDeMarcador
              rotulo={cifra.rotulo}
              sentido={cifra.sentido}
              estrecha={!destacada}
            />
          )}
          <Text
            style={[
              estilos.nombre,
              destacada ? estilos.nombreDestacado : estilos.nombreHilera,
              !viva && estilos.textoApagado,
            ]}
          >
            {minijuego.nombre}
          </Text>
          <Text
            style={[
              estilos.gancho,
              destacada ? estilos.ganchoDestacado : estilos.ganchoHilera,
              !viva && estilos.ganchoApagado,
            ]}
          >
            {minijuego.gancho}
          </Text>
        </LinearGradient>

        {/* LOS TRES DATOS, en la franja levantada y cada uno con su rótulo encima. */}
        <View style={estilos.datos}>
          <DatoDeFicha etiqueta="Aforo" valor={aforoEnCifra(aforo)} cifra />
          <DatoDeFicha
            etiqueta="Sede"
            valor={ficha === undefined ? '—' : enElServidor ? 'Servidor' : 'Dispositivo'}
            tabique
          />
          <DatoDeFicha etiqueta="Ritmo" valor={leerRitmo(ficha)} tabique />
        </View>

        {(menores.length > 0 || minijuego.porque !== null) && (
          <View style={estilos.menores}>
            {menores.length > 0 && (
              <Text style={estilos.menoresTexto}>{menores.join(' · ')}</Text>
            )}
            {/*
              ═══ LA RAZÓN, EN SU PROPIO RENGLÓN Y CADA UNA LA SUYA ═══

              Aquí había una sola frase pegada al gancho: «— esta versión de la app
              todavía no sabe pintarlo». Servía cuando la Sala sólo listaba lo que
              venía dentro, porque entonces era el único motivo posible. Desde que
              se lista también lo del SERVIDOR hay cuatro, y esa frase es falsa en
              tres: un juego puede faltar porque el mueble es desconocido, porque
              sus píxeles viven en otro binario, porque no hay ni mesa ni reglas
              aquí, o porque el juego no publica nada que pintar. Quien las lee hace
              algo distinto con cada una —actualizar, esperar, o nada—, y darle la
              equivocada es mandarle a hacer algo que no sirve.

              Va en renglón aparte y no pegada al gancho porque son dos voces: el
              gancho lo escribió el juego para atraer, y esto lo escribe la app para
              explicar. Juntas se leen como si el juego se disculpara.

              Y no lleva color de fallo: la Sala no tiene ninguno. Un juego que no
              se pinta aquí no es un error, es una máquina que no está instalada en
              este mueble, así que se dice en `tenue` y en cursiva —voz de la casa—
              y no en la alarma, que está reservada a lo que se acaba y a lo que
              mata dentro de una partida.
            */}
            {minijuego.porque !== null && (
              <Text style={estilos.menoresMotivo}>{minijuego.porque}</Text>
            )}
          </View>
        )}

        {/* EL PIE: el estado a la izquierda con su piloto, la acción a la derecha. */}
        <View style={estilos.pie}>
          <View style={estilos.estado}>
            <View
              style={[
                estilos.piloto,
                viva && !enElServidor ? estilos.pilotoVivo : estilos.pilotoFrio,
              ]}
            />
            <Text style={estilos.estadoTexto} numberOfLines={1}>
              {estado}
            </Text>
          </View>
          {viva && (
            <View style={estilos.accion}>
              <Text style={estilos.accionTexto}>Echar una</Text>
              <Svg width={7} height={11} viewBox="0 0 7 11">
                <Path
                  d="M1.2 1.2 L5.4 5.5 L1.2 9.8"
                  stroke={SALA.acento}
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
    </View>
  );

  if (ruta === null) return cuerpo;
  return (
    <Pulsable
      onPress={() => router.push(ruta)}
      accessibilityLabel={`Jugar a ${minijuego.nombre}`}
    >
      {cuerpo}
    </Pulsable>
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
 * Y de aquí salen los dos huecos de abajo. En React Native un borde empuja el
 * contenido hacia dentro, así que una ficha con borde de 1 y `padding: 14` deja el
 * texto a 15 del canto: las cuatro franjas de la ficha —placa, datos, menores,
 * pie— dejarían de alinear con el raíl de encima. Se resta del hueco en vez de
 * ignorarlo.
 */
const FILO = 1;
/** El hueco de las franjas estrechas de la ficha, con el filo ya descontado. */
const HUECO = 14 - FILO;
/** El de la placa, que es más ancho porque el nombre es lo más grande de la Sala. */
const HUECO_PLACA = 20 - FILO;

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

  /* LA SALA VACÍA. Sin acento: no hay nada vivo que señalar. */
  salaVacia: {
    borderRadius: RADIO.ficha,
    borderWidth: FILO,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
    padding: espacio.lg - FILO,
    gap: 6,
  },
  salaVaciaTitulo: { ...LETRA.rotulo, fontSize: 20, color: SALA.palabra },
  salaVaciaCuerpo: { ...LETRA.cuerpo, fontSize: 15, lineHeight: 21, color: SALA.tenue },

  /* EL RAÍL DEL AFORO. Las medidas son de `CUENTA_DE_AFORO`; el hueco lo pone quien pinta. */
  rail: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    borderBottomWidth: FILO,
    borderBottomColor: SALA.filo,
    marginBottom: 11,
  },
  muesca: { width: CUENTA_DE_AFORO.grosor, borderRadius: 2 },
  muescaEncendida: { height: CUENTA_DE_AFORO.altoEncendida, backgroundColor: SALA.acento },
  muescaApagada: { height: CUENTA_DE_AFORO.altoApagada, backgroundColor: conAlfa(SALA.blanco, 0.15) },
  muescaSinCorriente: { backgroundColor: SALA.filoVivo },

  ficha: {
    borderRadius: RADIO.ficha,
    borderWidth: FILO,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
    overflow: 'hidden',
  },

  /* LA PLACA: el único sitio donde vive el color, y ocupa media ficha. */
  placa: { paddingHorizontal: HUECO_PLACA },
  placaDestacada: {
    minHeight: 232,
    justifyContent: 'flex-end',
    paddingTop: 21,
    paddingBottom: 21,
  },
  /*
   * LAS DE LA HILERA APOYAN EL TEXTO ABAJO, IGUAL QUE LA DESTACADA, y por la
   * misma razón que ella: ahí es donde el degradado ya es hondo y el blanco se
   * lee. Sin `flex-end` el nombre flotaba en mitad de la placa, encima del
   * acento vivo, y en ámbar y en verde se quedaba en 2:1.
   *
   * El `minHeight` es lo que deja sitio para que se vea la franja viva por
   * encima del texto: sin él la placa mide lo que mide el texto y el degradado
   * no tiene recorrido donde lucir.
   */
  placaHilera: {
    paddingHorizontal: HUECO,
    minHeight: 104,
    justifyContent: 'flex-end',
    paddingTop: 15,
    paddingBottom: 16,
  },
  /* Con pastilla y sin sitio: se le reserva el hueco en vez de dejar que se pisen. */
  placaConPastilla: { minHeight: 96, paddingRight: 150 },

  nombre: { ...LETRA.rotulo, color: SALA.blanco },
  nombreDestacado: { fontSize: 38, lineHeight: 42 },
  nombreHilera: { fontSize: 20, lineHeight: 24 },
  textoApagado: { color: SALA.palabra },
  /*
   * EL GANCHO VA A BLANCO ENTERO Y NO AL 92 %, y es la diferencia entre pasar y
   * no pasar. Sobre el hondo de ámbar y de verde, ese 8 % de transparencia baja
   * el contraste a 4,18:1, justo por debajo del mínimo de texto normal; a opacidad
   * llena sube a 4,64. La suavidad del 92 % era un gusto de la maqueta; la
   * legibilidad de la frase que explica a qué se juega, no.
   */
  gancho: { ...LETRA.cuerpo, color: SALA.blanco },
  ganchoDestacado: { fontSize: 17, lineHeight: 24, marginTop: 11, maxWidth: 268 },
  ganchoHilera: { fontSize: 15, lineHeight: 20, marginTop: 6 },
  ganchoApagado: { color: SALA.tenue },

  /*
   * LA PASTILLA DEL MARCADOR. Sus blancos salen de `conAlfa(SALA.blanco, …)` y no
   * de un `rgba(255,255,255,…)` escrito a mano: es el mismo blanco de la tabla, y
   * `conAlfa` se importa de `../src/tema` porque este repositorio ya pagó una vez
   * el haberla duplicado.
   */
  pastilla: {
    position: 'absolute',
    top: 13,
    right: 13,
    maxWidth: 138,
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 8,
    borderRadius: RADIO.mando,
    borderWidth: FILO,
    borderColor: conAlfa(SALA.blanco, 0.24),
    backgroundColor: conAlfa(SALA.blanco, 0.12),
  },
  pastillaRotulo: { ...LETRA.rotuloChico, fontSize: 13, color: conAlfa(SALA.blanco, 0.7) },
  pastillaValor: {
    ...LETRA.rotulo,
    fontSize: 15,
    lineHeight: 18,
    marginTop: 3,
    color: SALA.blanco,
  },
  pastillaSentido: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  pastillaSentidoTexto: { ...LETRA.rotuloChico, fontSize: 13, color: conAlfa(SALA.blanco, 0.75) },

  /* LOS TRES DATOS, en la franja levantada. */
  datos: { flexDirection: 'row', backgroundColor: SALA.tejaAlta, paddingVertical: 13 },
  celda: { flex: 1, paddingHorizontal: HUECO },
  celdaConTabique: { borderLeftWidth: FILO, borderLeftColor: SALA.filo },
  /*
   * El rótulo va en `tenue` y no en `cifra`. `cifra` es blanco al 34 %, que sobre
   * la teja se queda en 3,2:1 — el mismo contraste que era la peor flaqueza de la
   * Sala anterior y la razón por la que se rehízo. Un rótulo que hay que leer para
   * saber qué es el número de debajo no puede estar en el escalón que no se lee.
   */
  celdaEtiqueta: { ...LETRA.rotuloChico, fontSize: 13, color: SALA.tenue },
  celdaValor: {
    ...LETRA.dato,
    /*
     * `fontVariant` se copia a un array nuevo: la tabla es `as const`, así que su
     * tupla es de sólo lectura y `TextStyle` pide una mutable. Copiarla aquí es
     * más honesto que aflojar la tabla, que está congelada por buenas razones.
     */
    fontVariant: [...LETRA.dato.fontVariant],
    textTransform: 'uppercase',
    fontSize: 16,
    lineHeight: 19,
    marginTop: 4,
    color: SALA.palabra,
  },
  /* La cifra del aforo, en el blanco de énfasis: es el dato que el raíl dibuja. */
  celdaValorCifra: { color: SALA.blanco },

  menores: {
    paddingHorizontal: HUECO,
    paddingTop: 10,
    paddingBottom: 11,
    borderTopWidth: FILO,
    borderTopColor: SALA.filo,
    gap: 6,
  },
  menoresTexto: { ...LETRA.rotuloChico, fontSize: 13, lineHeight: 18, color: SALA.tenue },
  menoresMotivo: {
    ...LETRA.cuerpo,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    color: SALA.tenue,
  },

  /* EL PIE. Un escalón por debajo de la teja, que es como esta sala hunde una franja. */
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.sm,
    paddingLeft: HUECO,
    paddingRight: 10,
    paddingVertical: 9,
    borderTopWidth: FILO,
    borderTopColor: SALA.filo,
    backgroundColor: SALA.pared,
  },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  piloto: { width: 6, height: 6, borderRadius: 3 },
  pilotoVivo: { backgroundColor: SALA.acento },
  pilotoFrio: { borderWidth: FILO, borderColor: SALA.filoVivo },
  estadoTexto: { ...LETRA.rotuloChico, fontSize: 13, color: SALA.tenue, flexShrink: 1 },
  accion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: RADIO.mando,
    borderWidth: FILO,
    borderColor: SALA.acento,
    backgroundColor: conAlfa(SALA.blanco, 0.04),
  },
  accionTexto: { ...LETRA.rotulo, fontSize: 14, color: SALA.blanco },

  /*
   * El aviso de que no se pudo preguntar al servidor. Con borde discontinuo, que
   * es como esta casa dice «esto no es contenido, es un estado», y sin acento
   * salvo en la palabra que se pulsa.
   */
  salaSinRed: {
    borderRadius: RADIO.ficha,
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
