/**
 * EL MUELLE, POR DENTRO: el lienzo de tres dimensiones con el embarcadero, la
 * mesa que lo alimenta y la hoja del HUD encima.
 *
 * ═══ LO QUE ESTE FICHERO DECIDE, Y LO QUE DELEGA ═══
 *
 * Decide cuatro cosas de plataforma y ninguna de escena:
 *
 *   1. SI SE MONTA EL LIENZO. Si la mesa recuperada del bolsillo ya ha empezado,
 *      no: se va derecho al mueble del juego (`rutaDelMueble`) sin cargar un
 *      solo modelo. Es el punto 6 del flujo de `docs/EL-MUELLE.md`, y por eso
 *      `mesa.recuperando` existe: hasta que el bolsillo se ha mirado no se sabe.
 *   2. LA CALIDAD. `plena` en la web y en iOS; en Android empieza en `plena` y
 *      baja a `sobria` si el hilo de dibujo MIDE más de 22 ms por fotograma en
 *      los primeros 120. Medida y no adivinada: ver `juzgarCalidad`.
 *   3. CUÁNDO SE CAMBIA DE PANTALLA. Cuando `haEmpezado` pasa a `true` EN LA
 *      VISTA —nunca al pulsar— se arranca la coreografía de zarpar, y se navega
 *      cuando la escena dice que terminó, cuando alguien toca la pantalla, o a
 *      los 3,5 s como tope. El tope existe porque la coreografía puede no
 *      terminar nunca: un mundo que no cargó no avisa de nada.
 *   4. QUÉ SE ENSEÑA MIENTRAS EL MUNDO NO ESTÁ: un telón del color del suelo con
 *      el nombre del lugar, que se funde al primer fotograma. Si el mundo falla,
 *      el telón se queda de fondo y la hoja sigue entera: EL HUD NUNCA DEPENDE
 *      DEL `Canvas`.
 *
 * Lo que es de escena —cámara, luces, agua, aventureros, coreografías— vive en
 * `escenas/embarcadero/Embarcadero.tsx` contra el contrato de `tipos.ts`, y
 * este fichero sólo le pasa props y recibe avisos. Lo que es de HUD vive en
 * `hoja-del-muelle.tsx`.
 *
 * ═══ EL `Canvas` SALE DE `../tres/Lienzo`, Y `traer` ES UN `fetch` DE LA APP ═══
 *
 * La regla del §7 de siempre: el contexto de dibujo lo crea `Lienzo`, que tiene
 * su gemelo `.native.tsx`. Y los bytes de los `.glb` los pide LA APP —la escena
 * no puede hacer `fetch`, es agnóstica de plataforma— con `traer` de `./traer.ts`,
 * que espera a `cargarSesionGuardada()` antes de preguntar a `servidorActual()`.
 * Vivía aquí a nivel de módulo; se fue a su fichero el día que el tablero de
 * Riberas en tres dimensiones pasó a pedir modelos por la misma ruta, porque dos
 * copias de esa función son dos cachés de cargadores que no se conocen. El porqué
 * entero está en su cabecera.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { manifiestoDeArcadeSiExiste } from '../../../shared/arcade';
import type { ManifiestoDeArcade } from '../../../shared/arcade';
/* Instala los arcades del binario, por si se llega aquí por enlace directo. Ver `pintar.tsx`. */
import '../../../shared/arcade/juegos';
import { Embarcadero } from '../../../escenas/embarcadero/Embarcadero';
import type { Calidad, MesaEnElMuelle, Ventana } from '../../../escenas/embarcadero/tipos';
/*
 * Sólo la constante del mapeo tonal: el `Canvas` sigue entrando por `tres/Lienzo`,
 * que es lo que la regla del §7 protege. Ver `escena-peonza.tsx`, que hace lo mismo
 * con las geometrías.
 */
import { ACESFilmicToneMapping } from 'three';
import { esFigura } from '../../../escenas/embarcadero/figuras';
import type { FiguraId } from '../../../escenas/embarcadero/figuras';
import { temaDelMuelle } from '../../../escenas/embarcadero/tema';
import type { TemaDelMuelle } from '../../../escenas/embarcadero/tema';
import { Canvas } from '../tres/Lienzo';
import { haEmpezado } from './empezada';
import { figuraConCuenta, figuraDeEstreno, guardarFigura } from './figura';
import { HojaDelMuelle } from './hoja-del-muelle';
import { usarMesaDeArcade } from './mesa';
import { LETRA, rutaDelMueble, SALA } from './muebles';
/* La misma cara que pone la Sala cuando algo no se puede jugar. Una, no dos. */
import { NoHayNada } from './pintar';
/*
 * LA FUNCIÓN QUE PIDE LOS MODELOS ES UNA PARA TODA LA APP, y por eso no está aquí:
 * `cargadorPara` cachea un cargador por función, y dos pantallas con dos copias
 * serían dos cachés. Ver la cabecera de `traer.ts`.
 */
import { traer } from './traer';

/** Cuánto se espera a la coreografía de zarpar antes de irse igual, en ms. */
const TOPE_DE_ZARPAR_MS = 3500;

/** Lo que tarda el telón en fundirse cuando el mundo ya está, en ms. */
const FUNDIDO_MS = 600;

/**
 * ═══ LA CALIDAD SE MIDE, NO SE ADIVINA ═══
 *
 * `alMedir` llega una vez por segundo con el tiempo medio de fotograma de ese
 * segundo. No se mira el modelo del aparato ni la versión de Android: se mira
 * cuánto tarda ESTE aparato en pintar ESTA escena, que es lo único que dice si
 * va justo. El umbral es 22 ms —45 fotogramas por segundo— y la ventana son los
 * primeros 120 fotogramas, que es lo que el §10 fija como riesgo medido.
 *
 * Cada muestra cubre `1000 / ms` fotogramas aproximadamente, así que se suman
 * hasta pasar de 120 y se pondera cada muestra por los fotogramas que cubre. Una
 * muestra a cero —el andamio de la escena manda `ms: 0` mientras no mide— no
 * dice nada y se salta. Devuelve `null` mientras no hay fotogramas suficientes.
 */
const UMBRAL_MS = 22;
const FOTOGRAMAS_QUE_SE_MIRAN = 120;

/** Una muestra de `alMedir`: la media de ms del último segundo y cuántos fotogramas cubre. */
export interface MuestraDelHilo {
  readonly ms: number;
  readonly fotogramas: number;
}

export function juzgarCalidad(muestras: readonly MuestraDelHilo[]): Calidad | null {
  let fotogramas = 0;
  let tiempo = 0;
  for (const m of muestras) {
    if (!(m.ms > 0)) continue;
    /*
     * La escena dice cuántos fotogramas cubre cada media; si no lo dice —un
     * andamio, una versión vieja— se estima desde los ms, que es lo que se hacía
     * antes de que el contrato lo trajera.
     */
    const cubre = m.fotogramas > 0 ? m.fotogramas : 1000 / m.ms;
    fotogramas += cubre;
    tiempo += m.ms * cubre;
  }
  if (fotogramas < FOTOGRAMAS_QUE_SE_MIRAN) return null;
  return tiempo / fotogramas > UMBRAL_MS ? 'sobria' : 'plena';
}

/** Pinta el Muelle del arcade que pida la ruta, o dice por qué no. */
export default function EscenaDelMuelle(): JSX.Element {
  const { arcade } = useLocalSearchParams<{ arcade?: string }>();
  const id = typeof arcade === 'string' ? arcade : '';

  if (id.length === 0) {
    return <NoHayNada que="Esta dirección no dice a qué arcade quiere entrar." />;
  }
  const manifiesto = manifiestoDeArcadeSiExiste(id);
  if (manifiesto === undefined) {
    return <NoHayNada que={`Esta app no conoce ningún arcade llamado «${id}», y sin conocerlo no hay muelle que pintar.`} />;
  }
  const tema = temaDelMuelle(id);
  if (tema === undefined) {
    return (
      <NoHayNada
        que={`«${manifiesto.nombre}» no tiene muelle: se juega desde su mueble, «${manifiesto.mueble}».`}
      />
    );
  }
  /*
   * Los hooks de la pantalla viven en el componente de abajo y no aquí, para que
   * ninguno quede detrás de un `return` —que es la regla que `verify:app` lee
   * con el árbol de TypeScript— y para que la mesa no se sondee por un arcade
   * que no existe.
   */
  return <ElMuelleDe manifiesto={manifiesto} tema={tema} />;
}

function ElMuelleDe({ manifiesto, tema }: { manifiesto: ManifiestoDeArcade; tema: TemaDelMuelle }): JSX.Element {
  const mesa = usarMesaDeArcade(manifiesto.id);
  const [figura, ponerFigura] = useState<FiguraId | null>(null);
  const [medida, ponerMedida] = useState({ ancho: 0, alto: 0 });
  const [altoHoja, ponerAltoHoja] = useState(0);
  const [calidad, ponerCalidad] = useState<Calidad>('plena');
  const [listo, ponerListo] = useState(false);
  const [fallo, ponerFallo] = useState<string | null>(null);
  const [zarpando, ponerZarpando] = useState(false);
  const [lienzoMontado, ponerLienzoMontado] = useState(false);
  const telon = useRef(new Animated.Value(1)).current;
  /* Sólo se navega una vez, venga el aviso de la escena, el toque o el tope. */
  const meFui = useRef(false);
  /* Si la persona ya tocó una figura, la de la cuenta no le pisa la elección. */
  const eligioAMano = useRef(false);
  /* De qué asiento se adoptó ya la figura del servidor, para hacerlo una sola vez. */
  const adoptadaDe = useRef<string | null>(null);
  const muestras = useRef<MuestraDelHilo[]>([]);
  const calidadJuzgada = useRef(false);

  const empezada = mesa.mesa !== null && haEmpezado(mesa.mesa);

  /*
   * ═══ LA FIGURA, EN DOS TIEMPOS ═══
   *
   * Primero la del aparato, que está en el disco y llega en milisegundos: con
   * ella se monta la escena y se ve algo enseguida. Después la de la cuenta, que
   * pasa por la red y puede tardar o no llegar; si trae otra, se cambia — salvo
   * que mientras tanto la persona haya elegido con el dedo, que entonces manda
   * ella y `guardarFigura` ya la habrá subido a la cuenta.
   */
  useEffect(() => {
    let vivo = true;
    void figuraDeEstreno().then((f) => {
      if (vivo) ponerFigura((antes) => antes ?? f);
    });
    void figuraConCuenta().then((f) => {
      if (vivo && !eligioAMano.current) ponerFigura(f);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const alJuego = useCallback(() => {
    if (meFui.current) return;
    meFui.current = true;
    router.replace(rutaDelMueble(manifiesto));
  }, [manifiesto]);

  /*
   * ═══ MONTAR EL LIENZO, O SALTARSE EL MUELLE ═══
   *
   * Se decide UNA vez, en cuanto el bolsillo se ha mirado. Si hay mesa y ya ha
   * empezado, no se monta nada y se va al juego: el asiento lo recupera la
   * pantalla del juego del bolsillo, como hoy. Si no, se monta y ya no se
   * desmonta: una partida que empiece con el lienzo puesto se va por la
   * coreografía de zarpar, no por aquí.
   */
  useEffect(() => {
    if (mesa.recuperando || lienzoMontado) return;
    if (empezada) alJuego();
    else ponerLienzoMontado(true);
  }, [mesa.recuperando, lienzoMontado, empezada, alJuego]);

  /*
   * ═══ ZARPAR: CUANDO LA VISTA DICE QUE HA EMPEZADO, NUNCA AL PULSAR ═══
   *
   * Quien pulsa «Repartir el delta» no zarpa por haber pulsado: zarpa cuando el
   * sondeo trae `empezada: true`, igual que todos los demás. Así los seis aparatos
   * ven la misma coreografía a la vez y nadie se va a un tablero que el servidor
   * todavía no ha repartido.
   */
  useEffect(() => {
    if (!lienzoMontado || !empezada || zarpando) return;
    ponerZarpando(true);
    const tope = setTimeout(alJuego, TOPE_DE_ZARPAR_MS);
    return () => clearTimeout(tope);
  }, [lienzoMontado, empezada, zarpando, alJuego]);

  /*
   * ═══ SI EL ASIENTO RECUPERADO TRAE OTRA FIGURA, SE ADOPTA — UNA VEZ ═══
   *
   * Volver a una mesa desde otro aparato trae el asiento con la figura que se
   * eligió allí, y lo honrado es que este aparato la vea y la guarde. Pero sólo
   * al RECUPERAR: si se adoptara en cada sondeo, cambiar de figura aquí se
   * desharía solo al volver la respuesta anterior, que aún trae la vieja.
   */
  useEffect(() => {
    const yo = mesa.mesa?.yo ?? null;
    if (yo === null || adoptadaDe.current === yo) return;
    adoptadaDe.current = yo;
    const mia = mesa.mesa?.asientos.find((a) => a.id === yo)?.figura;
    if (esFigura(mia) && mia !== figura) {
      ponerFigura(mia);
      void guardarFigura(mia);
    }
  }, [mesa.mesa, figura]);

  useEffect(() => {
    if (!listo) return;
    Animated.timing(telon, { toValue: 0, duration: FUNDIDO_MS, useNativeDriver: true }).start();
  }, [listo, telon]);

  const alMedir = useCallback((medidaDelHilo: MuestraDelHilo & { triangulos: number; llamadas: number }) => {
    if (Platform.OS !== 'android' || calidadJuzgada.current) return;
    muestras.current.push({ ms: medidaDelHilo.ms, fotogramas: medidaDelHilo.fotogramas });
    const veredicto = juzgarCalidad(muestras.current);
    if (veredicto === null) return;
    calidadJuzgada.current = true;
    ponerCalidad(veredicto);
  }, []);

  const alEstarListo = useCallback(() => ponerListo(true), []);
  const alFallar = useCallback((motivo: string) => ponerFallo(motivo), []);

  const alElegirFigura = useCallback(
    (f: FiguraId) => {
      eligioAMano.current = true;
      ponerFigura(f);
      void guardarFigura(f);
      if (mesa.fase === 'dentro' && mesa.mesa?.yo !== null) mesa.vestir(f);
    },
    [mesa],
  );

  const medirTodo = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    ponerMedida({ ancho: width, alto: height });
  }, []);

  const mesaEnElMuelle = useMemo<MesaEnElMuelle>(
    () => ({
      codigo: mesa.mesa?.codigo ?? null,
      asientos: (mesa.mesa?.asientos ?? []).map((a) => ({
        id: a.id,
        nombre: a.nombre,
        presente: a.presente,
        ...(a.figura === undefined ? {} : { figura: a.figura }),
      })),
      yo: mesa.mesa?.yo ?? null,
      empezada,
      aforo: manifiesto.jugadores,
      tema,
    }),
    [mesa.mesa, empezada, manifiesto.jugadores, tema],
  );

  const ventana = useMemo<Ventana>(
    () => ({
      ancho: medida.ancho,
      alto: medida.alto,
      franjaInferior: medida.alto > 0 ? Math.min(1, altoHoja / medida.alto) : 0,
    }),
    [medida, altoHoja],
  );

  /*
   * La figura que se PRUEBA: la mía mientras no estoy sentado, o mientras el
   * asiento aún no la trae de vuelta. En cuanto el sondeo la confirma se deja de
   * mandar, que es lo que el contrato pide: manda sobre la del asiento mientras
   * esté puesta, y no hay que tenerla puesta más de lo necesario.
   */
  const miAsiento = mesa.mesa?.asientos.find((a) => a.id === mesa.mesa?.yo);
  const figuraQuePruebo =
    figura === null ? undefined : miAsiento === undefined || miAsiento.figura !== figura ? figura : undefined;

  return (
    <View style={estilos.todo} onLayout={medirTodo}>
      {lienzoMontado && figura !== null ? (
        <Canvas
          style={estilos.lienzo}
          gl={{ antialias: true }}
          dpr={[1, 2]}
          /*
           * El mismo mapeo tonal que el escritorio y el banco (§2): ACES a 0,95.
           * Sin esto r3f deja la exposición en 1 y lo que se juzga en el banco
           * sale un paso más claro en el móvil, cielo y brasa incluidos.
           */
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 0.95;
          }}
        >
          <Embarcadero
            mesa={mesaEnElMuelle}
            ventana={ventana}
            traer={traer}
            calidad={calidad}
            figuraQuePruebo={figuraQuePruebo}
            zarpando={zarpando}
            alEstarListo={alEstarListo}
            alZarpar={alJuego}
            alFallar={alFallar}
            alMedir={alMedir}
          />
        </Canvas>
      ) : null}

      {/*
        EL TELÓN: suelo con el nombre del lugar. Se funde al primer fotograma con
        el mundo cargado y, si el mundo falla antes de eso, se queda como fondo.
        Nunca coge toques: lo que se toca es la hoja, y al zarpar, la capa de abajo.
      */}
      <Animated.View style={[estilos.telon, { opacity: telon }]} pointerEvents="none">
        <Text style={estilos.lugar}>{tema.lugar}</Text>
        {!listo && fallo === null ? <Text style={estilos.espera}>{tema.espera}</Text> : null}
      </Animated.View>

      <HojaDelMuelle
        arcade={manifiesto.id}
        nombreDelArcade={manifiesto.nombre}
        aforo={manifiesto.jugadores}
        tema={tema}
        mesa={mesa}
        figura={figura}
        alElegirFigura={alElegirFigura}
        alMedirLaHoja={ponerAltoHoja}
        fallo={fallo}
        zarpando={zarpando}
      />

      {zarpando ? (
        <Pressable
          style={estilos.saltar}
          onPress={alJuego}
          accessibilityRole="button"
          accessibilityLabel="Saltar la salida e ir a la mesa"
        />
      ) : null}
    </View>
  );
}

/* Las cuatro capas ocupan el mismo rectángulo: el del contenedor que se mide. */
const TODA_LA_PANTALLA = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.suelo },
  lienzo: { ...TODA_LA_PANTALLA },
  telon: {
    ...TODA_LA_PANTALLA,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
    backgroundColor: SALA.suelo,
  },
  lugar: { ...LETRA.rotulo, color: SALA.palabra, fontSize: 18 },
  espera: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  /* La capa que salta la coreografía: encima de todo y sin pintar nada. */
  saltar: { ...TODA_LA_PANTALLA },
});
