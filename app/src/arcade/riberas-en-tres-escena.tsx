/**
 * RIBERAS EN TRES DIMENSIONES, POR DENTRO: la misma mesa que pinta el mueble
 * `tablero`, con el delta de `escenas/delta.tsx` donde antes iba el `Retablo`.
 *
 * ═══ ESTO ES UN PINTOR, NO UN MOTOR, Y NO SABE NI UNA REGLA ═══
 *
 * Aquí no se decide dónde se puede construir, ni qué cuesta, ni a quién se le puede
 * proponer un trueque. Todo lo que la escena necesita saber de Riberas lo traduce
 * UNA vez `shared/arcade/juegos/riberas-en-tres.ts` —de la vista a lo que se pinta,
 * y de lo que se toca al movimiento que se manda— y esta pantalla sólo junta las
 * dos puntas: `usarMesaDeArcade` por un lado y `<Delta>` por el otro. Si el
 * servidor rechaza un movimiento, lo dice el aviso de la mesa, que ya sabía
 * hacerlo; si mañana la traducción cambia, este fichero no se entera.
 *
 * Es el mismo precedente que La Frente sobre `formulario`: un juego del binario
 * con pantalla propia sobre un mueble genérico. Riberas sigue con `mueble:
 * 'tablero'`, su vista y sus opciones no cambian, y `ElTableroEnLinea` sigue
 * pintando cualquier arcade de fuera con tablero.
 *
 * ═══ LO QUE SE REUTILIZA DEL MUEBLE GENÉRICO, Y POR QUÉ ═══
 *
 * La barra de la mesa, la línea del turno, el aviso, los botones de opción y la
 * crónica son los de `tablero-en-linea.tsx`, importados y no copiados: la barra ya
 * se separó sola una vez cuando estuvo escrita dos veces, y una tercera copia con
 * la identidad nueva —diez estilos— sería una promesa que se rompe sola. Lo único
 * que esta pantalla pinta con sus manos es el lienzo, el telón mientras el modelo
 * llega, la nota del respaldo y la hoja de «¿a quién?».
 *
 * ═══ EL RESPALDO NO ES OPCIONAL ═══
 *
 * Si el modelo no llega —sin cobertura, un servidor viejo que no sirve `.glb`, un
 * aparato que no abre el fichero— se pinta EL RETABLO SVG DE SIEMPRE, con una nota
 * en tenue de por qué. Es lo que hace que la partida se pueda jugar pase lo que
 * pase: una pantalla de partida que depende de que baje un fichero de varios
 * megabytes no es una pantalla de partida, es una demostración.
 *
 * ═══ Y EL MÓVIL NATIVO VERÁ EL TABLERO GRIS HASTA QUE SE HORNEE ═══
 *
 * `tablero.glb` lleva hoy la textura EMPOTRADA, y Hermes no decodifica ese PNG. En
 * el navegador se ve bien; en iOS y Android el complemento `texturasLisas` pone
 * una textura blanca de un píxel para que la carga no reviente entera —que es lo
 * que pasaba con los avatares, y costó días— y las piezas salen con su forma y sin
 * su pintura. No es lo prometido y se dice: la solución es hornear el color a
 * vértice como ya hace `embarcadero.glb` (quinta decisión de `docs/EL-MUELLE.md`),
 * y eso es trabajo de quien compila el modelo, no de esta pantalla.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
/*
 * `three` entra aquí por lo mismo que en `muelle-escena.tsx` y `escena-peonza.tsx`:
 * el `Canvas` sigue saliendo de `tres/Lienzo`, que es lo que la regla del §7
 * protege; lo que se importa del motor son la constante del mapeo tonal y los
 * tipos de la cámara y la niebla.
 */
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { manifiestoDeArcadeSiExiste } from '../../../shared/arcade';
/* Instala los arcades del binario, por si se llega aquí por enlace directo. Ver `pintar.tsx`. */
import '../../../shared/arcade/juegos';
import { opcionesSueltas, tableroDeLaVista } from '../../../shared/mecanicas/tablero-declarado';
import {
  barraEnTres,
  BIEN_EN_LA_ESCENA,
  bienDeRiberas,
  bienesQueSeCambianPor,
  colocandoEnTres,
  esVistaQueSePinta,
  manoEnTres,
  opcionesFueraDelTablero,
  seVeEnTres,
  tableroEnTres,
  truequesPosibles,
} from '../../../shared/arcade/juegos/riberas-en-tres';
import type {
  ColocandoEnTres,
  IdDeLaBarra,
  TableroEnTres,
  TruequePosible,
} from '../../../shared/arcade/juegos/riberas-en-tres';
/*
 * LA SEMILLA DEL MUNDO SALE DEL CÓDIGO DE LA MESA, y el cálculo es el compartido.
 * El relieve, los árboles y los ríos del delta son una función de la semilla; con
 * la de `shared/mecanicas/semilla.ts` los seis asientos de una mesa —en la app y en el
 * escritorio— ven el mismo mundo, que es lo que hace que «detrás de la colina»
 * signifique algo dicho en voz alta. Hubo una copia local de este hash aquí, y la
 * cabecera de aquel fichero cuenta por qué tres copias acabaron divergiendo.
 */
import { semillaDelCodigo } from '../../../shared/mecanicas/semilla';
import { Delta, encuadreDelDelta } from '../../../escenas/delta';
import { ojoDelMirador } from '../../../escenas/camara';
import type { Mirador } from '../../../escenas/camara';
import { catalogoDeModelos } from '../../../escenas/modelos';
import type { CatalogoDeModelos } from '../../../escenas/modelos';
/* La ruta y nada más: importarla de las figuras del embarcadero arrastraba la tabla de aventureros. */
import { rutaDelTablero } from '../../../escenas/ruta-de-modelos';
import type { Sitio } from '../../../escenas/sitios';
import { Canvas } from '../tres/Lienzo';
import { decodificaImagenes, texturasLisas } from '../tres/texturas-nativas';
import { conAlfa } from '../tema';
import { usarMesaDeArcade } from './mesa';
import type { MesaVista, OpcionDeMesa } from './mesa';
import { usarMiradorTactil } from './mirador-tactil';
import { LETRA, RADIO, SALA } from './muebles';
import { Pantalla } from './piezas';
import { PLAZOS } from './plazos';
import { Retablo } from './retablo';
import {
  BarraDeLaMesa,
  ElAviso,
  ESTILOS_DE_LA_MESA,
  LaCronica,
  LasOpciones,
  LineaDelTurno,
} from './tablero-en-linea';
import { traer } from './traer';

/** El azul del cielo de mediodía, que es también el color al que se funde la niebla. Ver `banco3d`. */
const COLOR_DEL_CIELO = '#9ec9e2';

/**
 * CUÁNTO ALTO SE LLEVA EL LIENZO: el 58 % de la pantalla y nunca menos de 360.
 *
 * Fijo y no elástico, al revés que la caja del `Retablo`: un `flex: 1` sin suelo se
 * encoge hasta cero antes de que nada se desplace, y un lienzo de tres dimensiones
 * a cero de alto es un contexto de GL que se crea y se destruye por nada. El pie
 * —opciones sueltas y crónica— es lo que cede y se desplaza por dentro.
 */
const PARTE_DEL_ALTO = 0.58;
const ALTO_MINIMO_DEL_LIENZO = 360;

/**
 * LA NOTA DE CUANDO SOIS MÁS DE CUATRO. El atlas del tablero sólo trae cuatro
 * colores de jugador, y `tableroEnTres` devuelve `null` con cinco o seis colonos
 * aunque haya islas: dos colonos del mismo color serían injugables. La partida
 * sigue, sobre el retablo SVG, y se dice por qué.
 */
const NOTA_DE_MAS_DE_CUATRO =
  'Sois más de cuatro: el delta en tres dimensiones sólo sabe pintar cuatro colores todavía. Se juega sobre el tablero de siempre.';

/**
 * DÓNDE SE ENSEÑA EL DELTA HOY: EN LA WEB SÍ, EN EL MÓVIL NATIVO TODAVÍA NO.
 *
 * ═══ Y NO ES UNA PREFERENCIA, ES QUE SALDRÍA GRIS ═══
 *
 * `tablero.glb` lleva la textura EMPOTRADA, y todo su aspecto —el color de cada
 * bioma, el color de cada jugador— vive en las UV de ese atlas. Hermes no
 * decodifica un PNG empotrado, así que en iOS y en Android `texturas-nativas.ts`
 * lo sustituye por blanco para que la carga no reviente entera: la geometría
 * llega, y llega SIN UN SOLO COLOR. Un delta gris no es una versión más pobre
 * del tablero; es un tablero en el que no se distingue una salina de un cantil,
 * o sea uno que no se puede jugar.
 *
 * Así que hasta que el modelo se hornee a color por vértice —como ya está
 * `embarcadero.glb`, ver `docs/EL-MUELLE.md` §1.5— el móvil juega sobre el
 * retablo de siempre, que es completo y legible. Y no se pide el modelo siquiera:
 * son dos megas de datos de nadie por una escena que no se va a montar.
 *
 * EL DÍA DEL HORNEADO SE BORRA ESTA CONSTANTE Y NADA MÁS. No hay ninguna otra
 * diferencia entre las dos plataformas en este fichero: la escena, los gestos y
 * la traducción son los mismos.
 */
const EL_DELTA_SE_VE_AQUI = Platform.OS === 'web';

/** Lo que se dice en el móvil, sin prometer una fecha y sin llamarlo error. */
const NOTA_DEL_MOVIL =
  'El delta en tres dimensiones todavía se ve sólo en la web. Aquí se juega sobre el tablero de siempre, que es la misma partida.';

// ---------------------------------------------------------------------------
// El catálogo de modelos: una vez por app
// ---------------------------------------------------------------------------

/**
 * EL `.glb` SE PIDE UNA VEZ POR APP, y la promesa vive en el módulo.
 *
 * Salir de la mesa y volver, o girar la pantalla, monta esta pantalla otra vez; sin
 * la caché cada montaje volvería a bajar el tablero entero y a abrirlo, y en nativo
 * `fetch` no tiene caché de disco de serie. Se cachea la PROMESA y no el resultado
 * para que dos montajes seguidos —la recarga en caliente, sin ir más lejos—
 * compartan la misma petición en vez de lanzar dos.
 *
 * Y un fallo NO se cachea: se olvida para que la siguiente visita vuelva a intentar.
 * La causa más probable de que no llegue es la cobertura del salón, y una caché que
 * recordara el fallo convertiría un túnel de treinta segundos en una partida entera
 * sobre el respaldo SVG hasta cerrar la app.
 */
let catalogoPrometido: Promise<CatalogoDeModelos> | null = null;

function catalogoDelTablero(): Promise<CatalogoDeModelos> {
  if (catalogoPrometido === null) {
    const promesa = (async (): Promise<CatalogoDeModelos> => {
      const bytes = await traer(rutaDelTablero());
      const cargador = new GLTFLoader();
      /*
       * SIN NAVEGADOR, LAS TEXTURAS EMPOTRADAS NO SE PUEDEN DECODIFICAR, y su fallo
       * se lleva por delante la carga ENTERA: ni la geometría se vería. El
       * complemento sólo se registra donde hace falta; en un navegador sustituiría
       * las texturas de verdad por nada. Ver `tres/texturas-nativas.ts`.
       */
      if (!decodificaImagenes()) cargador.register(texturasLisas);
      const gltf = await new Promise<GLTF>((resolver, rechazar) => {
        cargador.parse(bytes, '', resolver, rechazar);
      });
      return catalogoDeModelos(gltf.scene);
    })();
    catalogoPrometido = promesa;
    promesa.catch(() => {
      if (catalogoPrometido === promesa) catalogoPrometido = null;
    });
  }
  return catalogoPrometido;
}

type EstadoDelCatalogo =
  | { readonly que: 'llegando' }
  | { readonly que: 'listo'; readonly modelos: CatalogoDeModelos }
  | { readonly que: 'fallo'; readonly porque: string };

/**
 * El catálogo, y sólo SI HACE FALTA: con el delta apagado (móvil) no se piden dos
 * megas para una escena que no se monta. El gancho se llama siempre —las reglas de
 * los ganchos—; lo que se condiciona es la petición.
 */
function usarCatalogoDelTablero(hazFalta: boolean): EstadoDelCatalogo {
  const [estado, ponerEstado] = useState<EstadoDelCatalogo>({ que: 'llegando' });
  useEffect(() => {
    if (!hazFalta) return undefined;
    let vivo = true;
    catalogoDelTablero().then(
      (modelos) => {
        if (vivo) ponerEstado({ que: 'listo', modelos });
      },
      (fallo: unknown) => {
        if (vivo) ponerEstado({ que: 'fallo', porque: textoDelFallo(fallo) });
      },
    );
    return () => {
      vivo = false;
    };
  }, [hazFalta]);
  return estado;
}

function textoDelFallo(fallo: unknown): string {
  if (fallo instanceof Error) return fallo.message;
  if (typeof fallo === 'string') return fallo;
  return 'no se ha podido abrir el modelo';
}

// ---------------------------------------------------------------------------
// La pantalla
// ---------------------------------------------------------------------------

/** Pinta la mesa de Riberas que pida la ruta, con el delta en tres dimensiones. */
export default function ElTableroEnTresPorDentro(): JSX.Element {
  const { arcade } = useLocalSearchParams<{ arcade?: string }>();
  const id = typeof arcade === 'string' ? arcade : '';
  const manifiesto = manifiestoDeArcadeSiExiste(id);
  const mesa = usarMesaDeArcade(id);
  const [nombre, ponerNombre] = useState('');
  const [codigo, ponerCodigo] = useState('');
  const [plazo, ponerPlazo] = useState(0);
  /* El área segura, leída UNA vez y aquí arriba: es un hook y los hooks no se saltan. */
  const bordes = useSafeAreaInsets();
  const relleno = { paddingTop: bordes.top + 28, paddingBottom: bordes.bottom + 28 };

  /*
   * EL LATIDO DE LA CUENTA ATRÁS, el mismo que en `tablero-en-linea.tsx` y por lo
   * mismo: el vencimiento viaja como instante absoluto y quien resta es la pantalla.
   * Cada segundo en el último minuto; cada minuto el resto del tiempo, también sin
   * plazo, que es cuando se enseña «lleva N min».
   */
  const [latido, latir] = useState(0);
  const venceEn = mesa.mesa?.venceEn ?? null;
  useEffect(() => {
    const quedan = venceEn === null ? Infinity : venceEn - Date.now();
    const cada = quedan > 0 && quedan < 60_000 ? 1000 : 60_000;
    const reloj = setTimeout(() => latir((n) => n + 1), cada);
    return () => clearTimeout(reloj);
  }, [venceEn, latido]);

  const nombres = useMemo(() => {
    const tabla = new Map<string, string>();
    for (const a of mesa.mesa?.asientos ?? []) tabla.set(a.id, a.nombre);
    return tabla;
  }, [mesa.mesa?.asientos]);

  if (mesa.fase === 'yendo') {
    return (
      <Pantalla hueco={28} estilo={relleno}>
        <View style={ESTILOS_DE_LA_MESA.centro}>
          {/* El acento aquí sí: la rueda es el piloto de «está pasando algo». */}
          <ActivityIndicator color={SALA.acento} />
          <Text style={ESTILOS_DE_LA_MESA.texto}>Hablando con la mesa…</Text>
        </View>
      </Pantalla>
    );
  }

  const sinNombre = nombre.trim().length === 0;
  const noPuedeAbrir = mesa.quieto || sinNombre;
  const noPuedeEntrar = noPuedeAbrir || codigo.trim().length === 0;

  if (mesa.fase === 'fuera' || mesa.mesa === null) {
    /*
     * EL VESTÍBULO, con las piezas y los estilos del mueble genérico. Por el Muelle
     * casi nadie llega aquí sin mesa —la tarjeta de la Sala lleva al embarcadero y
     * el embarcadero zarpa con la mesa ya sentada—, pero un enlace directo, un
     * asiento caducado o «Salir» acaban en esta rama, y una rama que no se puede
     * usar es una pantalla en blanco con otro nombre.
     */
    return (
      <Pantalla hueco={28} estilo={relleno}>
        <View style={ESTILOS_DE_LA_MESA.centro}>
          <Text style={ESTILOS_DE_LA_MESA.titulo}>{manifiesto?.nombre ?? id}</Text>
          <Text style={ESTILOS_DE_LA_MESA.texto}>{manifiesto?.gancho ?? ''}</Text>
          <TextInput
            style={ESTILOS_DE_LA_MESA.campo}
            placeholder="Tu nombre en la mesa"
            placeholderTextColor={SALA.tenue}
            value={nombre}
            onChangeText={ponerNombre}
            maxLength={24}
            accessibilityLabel="Tu nombre en la mesa"
          />
          <Text style={ESTILOS_DE_LA_MESA.rotuloDeGrupo}>cuánto se espera por turno</Text>
          <View
            style={ESTILOS_DE_LA_MESA.plazos}
            accessibilityRole="radiogroup"
            accessibilityLabel="Cuánto se espera por turno"
          >
            {PLAZOS.map((p, i) => (
              <Pressable
                key={p.rotulo}
                style={[ESTILOS_DE_LA_MESA.plazo, i === plazo ? ESTILOS_DE_LA_MESA.plazoElegido : null]}
                onPress={() => ponerPlazo(i)}
                accessibilityRole="radio"
                accessibilityState={{ selected: i === plazo }}
                accessibilityLabel={`Plazo por turno: ${p.rotulo}`}
                accessibilityHint={p.ayuda}
              >
                <Text
                  style={
                    i === plazo ? ESTILOS_DE_LA_MESA.plazoRotuloElegido : ESTILOS_DE_LA_MESA.plazoRotulo
                  }
                >
                  {p.rotulo}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={ESTILOS_DE_LA_MESA.ayuda}>{PLAZOS[plazo]?.ayuda ?? ''}</Text>
          <Pressable
            style={[
              ESTILOS_DE_LA_MESA.boton,
              noPuedeAbrir ? ESTILOS_DE_LA_MESA.botonQuieto : ESTILOS_DE_LA_MESA.botonVivo,
            ]}
            disabled={noPuedeAbrir}
            onPress={() => mesa.abrir(nombre.trim(), PLAZOS[plazo]?.segundos)}
            accessibilityRole="button"
            accessibilityLabel="Abrir una mesa"
            accessibilityState={{ disabled: noPuedeAbrir }}
          >
            <Text
              style={[
                ESTILOS_DE_LA_MESA.botonRotulo,
                noPuedeAbrir ? ESTILOS_DE_LA_MESA.botonRotuloQuieto : ESTILOS_DE_LA_MESA.botonRotuloVivo,
              ]}
            >
              Abrir una mesa
            </Text>
          </Pressable>
          <Text style={ESTILOS_DE_LA_MESA.alternativa}>o entra con el código que te hayan dicho</Text>
          <TextInput
            style={ESTILOS_DE_LA_MESA.campo}
            placeholder="CÓDIGO"
            placeholderTextColor={SALA.tenue}
            value={codigo}
            onChangeText={ponerCodigo}
            autoCapitalize="characters"
            maxLength={8}
            accessibilityLabel="Código de la mesa"
          />
          <Pressable
            style={[ESTILOS_DE_LA_MESA.boton, noPuedeEntrar ? ESTILOS_DE_LA_MESA.botonQuieto : null]}
            disabled={noPuedeEntrar}
            onPress={() => mesa.entrar(codigo, nombre.trim())}
            accessibilityRole="button"
            accessibilityLabel="Sentarse en la mesa de ese código"
            accessibilityState={{ disabled: noPuedeEntrar }}
          >
            <Text
              style={[
                ESTILOS_DE_LA_MESA.botonRotulo,
                noPuedeEntrar ? ESTILOS_DE_LA_MESA.botonRotuloQuieto : null,
              ]}
            >
              Sentarse
            </Text>
          </Pressable>
          <ElAviso texto={mesa.aviso} />
        </View>
      </Pantalla>
    );
  }

  return (
    <LaMesaEnTres
      mesa={mesa}
      vista={mesa.mesa}
      juego={manifiesto?.nombre ?? id}
      nombres={nombres}
      arriba={bordes.top}
      abajo={bordes.bottom}
    />
  );
}

// ---------------------------------------------------------------------------
// La mesa, sentados
// ---------------------------------------------------------------------------

type LaMesa = ReturnType<typeof usarMesaDeArcade>;

/**
 * Lo que la pantalla pinta con una mesa delante. Componente aparte para que sus
 * hooks —el catálogo, el gesto, lo cogido— no queden detrás de los `return` de
 * arriba, que es la regla que `verify:app` lee con el árbol de TypeScript.
 */
function LaMesaEnTres({
  mesa,
  vista,
  juego,
  nombres,
  arriba,
  abajo,
}: {
  mesa: LaMesa;
  vista: MesaVista;
  juego: string;
  nombres: Map<string, string>;
  arriba: number;
  abajo: number;
}): JSX.Element {
  const catalogo = usarCatalogoDelTablero(EL_DELTA_SE_VE_AQUI);
  const { height: altoDeLaPantalla } = useWindowDimensions();
  const altoDelLienzo = Math.max(ALTO_MINIMO_DEL_LIENZO, Math.round(altoDeLaPantalla * PARTE_DEL_ALTO));

  /*
   * ═══ LO COGIDO VIVE AQUÍ, Y SE SUELTA CUANDO CAMBIA LA MESA ═══
   *
   * `tomada` y `colocando` son la pieza de la barra que se lleva en la mano y los
   * sitios donde las reglas dejan soltarla; `cogida` es la carta de la mano. Nada
   * de esto es estado del juego —es dónde tiene el dedo la persona— y por eso vive
   * en la pantalla y no viaja. Y en cuanto la revisión de la mesa cambia se suelta
   * todo: los sitios que valían con la revisión anterior pueden no valer con ésta,
   * y una pieza en la mano con anillos rancios es una mentira con forma de anillo.
   */
  const [tomada, ponerTomada] = useState<IdDeLaBarra | null>(null);
  const [colocando, ponerColocando] = useState<ColocandoEnTres | null>(null);
  const [cogida, ponerCogida] = useState<string | null>(null);
  const [aQuien, ponerAQuien] = useState<readonly TruequePosible<OpcionDeMesa>[] | null>(null);
  const soltarTodo = useCallback(() => {
    ponerTomada(null);
    ponerColocando(null);
    ponerCogida(null);
    ponerAQuien(null);
  }, []);
  useEffect(() => {
    soltarTodo();
  }, [vista.rev, soltarTodo]);

  const [medida, ponerMedida] = useState({ ancho: 0, alto: 0 });
  const medir = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    ponerMedida({ ancho: width, alto: height });
  }, []);
  const { gesto, mirador, acercamiento, laInterfazSeLoQueda } = usarMiradorTactil(medida);

  /* ─── De la vista a la escena, todo por `riberas-en-tres.ts` ─── */

  const laVista = vista.vista;
  const yo = vista.yo;
  const opciones = vista.opciones ?? [];

  /*
   * ═══ LAS ISLAS CONSERVAN SU IDENTIDAD ENTRE SONDEOS, Y ESO ES LO QUE NO TIEMBLA ═══
   *
   * Cada respuesta del servidor trae una vista NUEVA, y `tableroEnTres` fabrica de
   * ella una lista de islas nueva aunque el delta no haya cambiado —y no cambia en
   * toda la partida—. La escena reconstruye el relieve, la red de caminos, el plan
   * del mundo y los sitios cuando cambia la IDENTIDAD de `datos.islas`
   * (`escenas/delta.tsx`): miles de copias recalculadas y vueltas a subir a la GPU
   * en cada jugada de cualquiera y en cada vuelta del sondeo, en el cliente móvil.
   * Se vería como un tirón por revisión. Así que se firma el CONTENIDO de las islas
   * (columna, fila, terreno y cifra) y, si es el mismo, se entrega LA MISMA lista de
   * antes. Piezas y caminos sí van frescos: son lo que cambia. Es lo mismo que hace
   * el escritorio en `escritorio/src/riberas-en-tres.tsx`, y por lo mismo.
   */
  const islasVistas = useRef<{ firma: string; islas: TableroEnTres['islas'] } | null>(null);
  const datos = useMemo(() => {
    const crudo = tableroEnTres(laVista);
    if (crudo === null) return null;
    const firma = crudo.islas
      .map((i) => `${String(i.hex.q)},${String(i.hex.r)}:${i.terreno}:${String(i.cifra)}`)
      .join('|');
    const antes = islasVistas.current;
    const islas = antes !== null && antes.firma === firma ? antes.islas : crudo.islas;
    islasVistas.current = { firma, islas };
    return { ...crudo, islas };
  }, [laVista]);
  const semilla = useMemo(() => semillaDelCodigo(vista.codigo), [vista.codigo]);
  const barra = useMemo(() => {
    const suya = barraEnTres(laVista, yo);
    /* Con algo en vuelo no se coge nada: la barra sale apagada, que es lo que la escena sabe enseñar. */
    return mesa.quieto ? suya.map((p) => ({ ...p, disponible: false })) : suya;
  }, [laVista, yo, mesa.quieto]);
  const mano = useMemo(() => manoEnTres(laVista), [laVista]);
  const cartaCogida = cogida === null ? undefined : mano.find((c) => c.id === cogida);
  const seCambianPor = useMemo(
    () =>
      cartaCogida === undefined
        ? []
        : bienesQueSeCambianPor(laVista, opciones, bienDeRiberas(cartaCogida.bien)).map(
            (b) => BIEN_EN_LA_ESCENA[b] ?? b,
          ),
    [laVista, opciones, cartaCogida],
  );
  const fueraDelTablero = useMemo(() => opcionesFueraDelTablero(opciones), [opciones]);

  /*
   * EL ENCUADRE mide el MUNDO —lo grande que es el delta— y sólo se recalcula cuando
   * cambian las islas, que gracias a la firma de arriba es una vez por partida. Lo
   * que depende de la PANTALLA (retrato, apaisado) no entra aquí: lo resuelve
   * `ojoDelMirador` con la proporción, en `Ojo`.
   */
  const encuadre = useMemo(
    () => (datos === null ? null : encuadreDelDelta(datos.islas.map((i) => i.hex))),
    [datos],
  );

  /* ─── Lo que se toca, traducido al movimiento que se manda ─── */

  const alTomarDeLaBarra = useCallback(
    (id: string) => {
      laInterfazSeLoQueda();
      if (mesa.quieto) return;
      const pieza = barra.find((p) => p.id === id);
      if (pieza === undefined) return;
      /* Volver a tocar la que ya se lleva la deja en la barra. */
      if (tomada === pieza.id) {
        ponerTomada(null);
        ponerColocando(null);
        return;
      }
      const que = colocandoEnTres(laVista, yo, pieza.id);
      if (que === null) return;
      ponerCogida(null);
      ponerTomada(pieza.id);
      ponerColocando(que);
    },
    [laInterfazSeLoQueda, mesa.quieto, barra, tomada, laVista, yo],
  );

  const alElegirSitio = useCallback(
    (sitio: Sitio) => {
      if (mesa.quieto || colocando === null) return;
      const movimiento = colocando.movimientos.get(sitio.llave);
      /* Un anillo sin movimiento no puede existir —la escena sólo pinta los de `donde`—, pero no se manda nada a ciegas. */
      if (movimiento === undefined) return;
      ponerTomada(null);
      ponerColocando(null);
      mesa.mover(movimiento);
    },
    [mesa, colocando],
  );

  const alCogerCarta = useCallback(
    (carta: { id: string }) => {
      laInterfazSeLoQueda();
      if (mesa.quieto) return;
      ponerTomada(null);
      ponerColocando(null);
      ponerCogida((antes) => (antes === carta.id ? null : carta.id));
    },
    [laInterfazSeLoQueda, mesa.quieto],
  );

  const alProponerTrueque = useCallback(
    (bienDeLaEscena: string) => {
      if (mesa.quieto || cartaCogida === undefined) return;
      const posibles = truequesPosibles(
        laVista,
        opciones,
        bienDeRiberas(cartaCogida.bien),
        bienDeRiberas(bienDeLaEscena),
      );
      if (posibles.length === 0) return;
      const unico = posibles[0];
      if (posibles.length === 1 && unico !== undefined) {
        ponerCogida(null);
        mesa.mover({ tipo: unico.opcion.tipo, carga: unico.opcion.carga });
        return;
      }
      /* Riberas exige destinatario: con varios, se pregunta a quién. */
      ponerAQuien(posibles);
    },
    [mesa, cartaCogida, laVista, opciones],
  );

  const alElegirAQuien = useCallback(
    (t: TruequePosible<OpcionDeMesa>) => {
      ponerAQuien(null);
      ponerCogida(null);
      if (mesa.quieto) return;
      mesa.mover({ tipo: t.opcion.tipo, carga: t.opcion.carga });
    },
    [mesa],
  );

  /* ─── El respaldo: el retablo SVG de siempre, y por qué ─── */

  /*
   * UNA SOLA RAMA DE RESPALDO para dos motivos distintos —el `.glb` que no llega y
   * la mesa de más de cuatro—, escrita una vez y con la nota como único parámetro.
   * Copiar el JSX sería tener dos retablos que se separan solos la primera vez que
   * alguien retoque uno. Es una función local y no un componente a propósito: no
   * lleva hooks, y así se puede llamar detrás de los `return` de abajo.
   */
  const respaldoSobreElRetablo = (nota: string): JSX.Element => {
    const tablero = tableroDeLaVista(laVista);
    const sueltas = tablero === null ? opciones : opcionesSueltas(tablero, opciones);
    return (
      <View style={estilos.todo}>
        <BarraDeLaMesa
          juego={juego}
          codigo={vista.codigo}
          asientos={vista.asientos}
          salir={mesa.salir}
          tirar={mesa.tirar}
          arriba={arriba}
        />
        <LineaDelTurno mesa={vista} nombres={nombres} />
        <ElAviso texto={mesa.aviso} />
        {/*
          LA NOTA DEL RESPALDO, en tenue y no en alarma: no es un peligro, es un
          cambio de pincel. Dice el motivo porque «no se ha podido» sin motivo
          manda a adivinar, y el motivo de verdad casi siempre es la cobertura.
        */}
        <Text style={estilos.nota} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {nota}
        </Text>
        {tablero === null ? null : (
          <View style={estilos.cajaDelRetablo}>
            <Retablo tablero={tablero} alTocar={mesa.mover} quieto={mesa.quieto} />
          </View>
        )}
        <ScrollView style={estilos.pieDeLaMesa} contentContainerStyle={{ paddingBottom: abajo }}>
          {sueltas.length > 0 ? (
            <LasOpciones opciones={sueltas} alTocar={mesa.mover} quieto={mesa.quieto} />
          ) : null}
          <LaCronica cronica={mesa.cronica} />
        </ScrollView>
      </View>
    );
  };

  /* ─── Sin delta que pintar: o la mesa se reúne, o sois más de cuatro ─── */

  if (!EL_DELTA_SE_VE_AQUI || datos === null || encuadre === null) {
    /*
     * AQUÍ NO SE PINTA EL DELTA POR TRES MOTIVOS QUE NO SE PARECEN EN NADA, y los
     * tres acaban en el mismo sitio con distinta frase:
     *
     *   · estamos en el móvil, donde el modelo saldría gris (`EL_DELTA_SE_VE_AQUI`);
     *   · las islas no están repartidas todavía y la mesa se está reuniendo;
     *   · hay cinco o seis colonos y el atlas sólo trae cuatro colores de jugador,
     *     así que `tableroEnTres` devuelve `null` AUNQUE HAYA ISLAS.
     *
     * Decidir sólo con `datos === null` enseñaba a una mesa de cinco ya empezada
     * decenas de botones «Fundar aquí» y ningún tablero. Con islas se juega SIEMPRE
     * sobre algo: aquí, sobre el retablo.
     */
    const hayIslas = esVistaQueSePinta(laVista) && laVista.islas.length > 0;
    if (hayIslas) {
      return respaldoSobreElRetablo(
        !EL_DELTA_SE_VE_AQUI
          ? NOTA_DEL_MOVIL
          : seVeEnTres(laVista)
            ? 'El delta en tres dimensiones no ha podido leer esta mesa. Se juega sobre el tablero de siempre.'
            : NOTA_DE_MAS_DE_CUATRO,
      );
    }
    return (
      <View style={estilos.todo}>
        <BarraDeLaMesa
          juego={juego}
          codigo={vista.codigo}
          asientos={vista.asientos}
          salir={mesa.salir}
          tirar={mesa.tirar}
          arriba={arriba}
        />
        <ScrollView
          style={estilos.rio}
          contentContainerStyle={{ paddingBottom: abajo }}
          keyboardShouldPersistTaps="handled"
        >
          <LineaDelTurno mesa={vista} nombres={nombres} />
          <ElAviso texto={mesa.aviso} />
          <LasOpciones opciones={opciones} alTocar={mesa.mover} quieto={mesa.quieto} />
          <LaCronica cronica={mesa.cronica} />
        </ScrollView>
      </View>
    );
  }

  if (catalogo.que === 'fallo') {
    return respaldoSobreElRetablo(
      `El delta en tres dimensiones no ha llegado (${catalogo.porque}). Se juega sobre el tablero de siempre.`,
    );
  }

  /* ─── La mesa con el delta ─── */

  const alcance = encuadre.alcance;

  return (
    <View style={estilos.todo}>
      <BarraDeLaMesa
        juego={juego}
        codigo={vista.codigo}
        asientos={vista.asientos}
        salir={mesa.salir}
        tirar={mesa.tirar}
        arriba={arriba}
      />
      <LineaDelTurno mesa={vista} nombres={nombres} />
      <ElAviso texto={mesa.aviso} />

      <View style={[estilos.cajaDelLienzo, { height: altoDelLienzo }]}>
        {catalogo.que === 'listo' ? (
          <GestureDetector gesture={gesto}>
            {/*
              LA ETIQUETA VA EN LA VISTA QUE SÓLO ENVUELVE EL `Canvas`, y no en la
              caja de fuera: `accessible` agrupa a sus hijos, y la caja tiene también
              la hoja de «¿a quién?», cuyos botones quedarían fuera del alcance de
              un lector de pantalla justo cuando hay que contestar.
            */}
            <View
              style={estilos.lienzo}
              onLayout={medir}
              accessible
              accessibilityLabel="El delta de Riberas en tres dimensiones. Arrastra para girarlo y pellizca para acercarlo."
            >
              <Canvas
                style={estilos.lienzo}
                gl={{ antialias: true }}
                dpr={[1, 2]}
                /*
                 * LAS SOMBRAS SÓLO EN LA WEB. El delta pide un mapa de sombras de
                 * 2048 por lado y lo redibuja cada fotograma; en un móvil de gama
                 * media eso es la diferencia entre sesenta fotogramas y veinte, y
                 * aquí no hay todavía una medida como la del Muelle para bajar la
                 * calidad sola. Es una decisión medible y está dicha: el día que se
                 * mida, el interruptor es esta línea.
                 */
                shadows={Platform.OS === 'web'}
                camera={{ fov: 45, near: 0.5, far: alcance * 16, position: encuadre.posicion }}
                onCreated={({ gl }) => {
                  /* El mismo mapeo tonal que el banco: ACES a 1,05. Ver `banco3d.tsx`. */
                  gl.toneMapping = THREE.ACESFilmicToneMapping;
                  gl.toneMappingExposure = 1.05;
                }}
              >
                <color attach="background" args={[COLOR_DEL_CIELO]} />
                <fog attach="fog" args={[COLOR_DEL_CIELO, alcance * 2.6, alcance * 7.5]} />
                <Ojo mirador={mirador} acercamiento={acercamiento} alcance={alcance} />
                <Delta
                  datos={datos}
                  modelos={catalogo.modelos}
                  semilla={semilla}
                  colocando={colocando}
                  onElegirSitio={alElegirSitio}
                  barra={barra}
                  tomada={tomada}
                  onTomarDeLaBarra={alTomarDeLaBarra}
                  mano={mano}
                  cogida={cogida}
                  onCogerCarta={alCogerCarta}
                  seCambianPor={seCambianPor}
                  onProponerTrueque={alProponerTrueque}
                />
              </Canvas>
            </View>
          </GestureDetector>
        ) : null}

        {/*
          EL TELÓN, mientras el modelo llega: suelo con el nombre del juego y una
          línea. Nunca coge toques, y no depende del `Canvas`: si el modelo falla,
          esta rama entera se sustituye por el respaldo de arriba.
        */}
        {catalogo.que === 'llegando' ? (
          <View style={estilos.telon} pointerEvents="none">
            <Text style={estilos.lugar}>RIBERAS</Text>
            <Text style={estilos.espera}>Trayendo el delta…</Text>
          </View>
        ) : null}

        {aQuien !== null ? <HojaDeAQuien posibles={aQuien} alElegir={alElegirAQuien} alDejarlo={soltarTodo} /> : null}
      </View>

      {/*
        DEBAJO DEL LIENZO, LO QUE EL TABLERO NO ENSEÑA: tirar, pasar, aceptar,
        rechazar, empezar. Fundar y alzar los ofrecen los anillos, y ofrecer un
        trueque lo ofrece la mano; `opcionesFueraDelTablero` es la misma regla que
        `opcionesSueltas` aplica al retablo, y por lo mismo: cada movimiento se
        enseña exactamente una vez. El pie cede y se desplaza por dentro.
      */}
      <ScrollView style={estilos.pieDeLaMesa} contentContainerStyle={{ paddingBottom: abajo }}>
        {fueraDelTablero.length > 0 ? (
          <LasOpciones opciones={fueraDelTablero} alTocar={mesa.mover} quieto={mesa.quieto} />
        ) : null}
        <LaCronica cronica={mesa.cronica} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// El ojo
// ---------------------------------------------------------------------------

/**
 * El ojo, cada fotograma: el `Mirador` del gesto, la pinza y la proporción del lienzo.
 *
 * ═══ LA ÚNICA CORRECCIÓN DE RETRATO ES LA DE `escenas/camara.ts` ═══
 *
 * Hubo aquí un «factor que encaja» que proyectaba las esquinas del delta con `three`
 * y alejaba el ojo hasta que TODO cupiera dentro de unos límites asimétricos. Medido
 * en Node daba factor 2,18 en 16:9 —el banco usa 1,00: el delta salía a menos de
 * la mitad de tamaño en apaisado— y BOMBEABA con el gesto (de 2,10 a 1,10 al
 * inclinar), que es justo lo que la cabecera de `LEJANIA` dice que no puede pasar:
 * inclinar tiene que ser inclinar, no acercarse. Y encima nunca pasaba la
 * proporción a `ojoDelMirador`, así que la corrección de `camara.ts` quedaba muerta.
 *
 * Ahora la corrección es UNA, `alejarseParaQueQuepa(proporcion)` dentro de
 * `ojoDelMirador`: trigonometría sin `three`, medible en Node, e idéntica en los
 * dos clientes. Depende sólo de la proporción del lienzo, así que no bombea con el
 * mirador ni con nada que no sea girar el aparato. Si la barra y la mano piden
 * margen en retrato, eso es una petición para `camara.ts` (congelado), no para aquí.
 *
 * La niebla se mueve con el ojo. En el banco empieza a 2,6 alcances de una cámara
 * que está a 1,77; si aquí el ojo se aleja para que quepa el retrato y la niebla se
 * quedara donde estaba, el lado lejano del delta saldría blanqueado hasta el color
 * del cielo, que es exactamente el fallo que el banco corrigió una vez. La distancia
 * real del ojo al centro es el módulo de su posición, y es la que se usa.
 */
function Ojo({
  mirador,
  acercamiento,
  alcance,
}: {
  mirador: { readonly current: Mirador };
  acercamiento: { readonly current: number };
  alcance: number;
}): null {
  const camara = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const tamano = useThree((s) => s.size);
  const escena = useThree((s) => s.scene);

  useFrame(() => {
    const m = mirador.current;
    /* Antes de la primera medida el lienzo puede venir a cero: un cero aquí es un `NaN` en la cámara. */
    const proporcion = tamano.width / Math.max(1, tamano.height);
    const [x, y, z] = ojoDelMirador(m, alcance * acercamiento.current, proporcion);
    camara.position.set(x, y, z);
    camara.lookAt(0, 0, 0);

    const niebla = escena.fog;
    if (niebla instanceof THREE.Fog) {
      const distancia = Math.hypot(x, y, z);
      niebla.near = distancia + alcance * 0.85;
      niebla.far = distancia + alcance * 5.7;
    }
  });

  return null;
}

// ---------------------------------------------------------------------------
// La hoja de «¿a quién?»
// ---------------------------------------------------------------------------

/**
 * A QUIÉN SE LE PROPONE EL TRUEQUE, cuando el juego deja proponérselo a varios.
 *
 * Riberas exige destinatario, y la escena no sabe quién hay sentado: la carta se
 * suelta sobre un bien y aquí se pregunta el resto. Es una hoja pequeña encima del
 * lienzo y no una pantalla, porque la pregunta es de un toque y el tablero tiene
 * que seguir a la vista para acordarse de qué se estaba cambiando.
 *
 * Los botones van con el contorno de mando de la Sala y sin acento: son la lista
 * de la gente, no la acción principal. «Dejarlo» es la salida, que hace falta
 * siempre que se pregunta algo.
 */
function HojaDeAQuien({
  posibles,
  alElegir,
  alDejarlo,
}: {
  posibles: readonly TruequePosible<OpcionDeMesa>[];
  alElegir: (t: TruequePosible<OpcionDeMesa>) => void;
  alDejarlo: () => void;
}): JSX.Element {
  const primero = posibles[0];
  return (
    <View style={estilos.hoja} accessibilityViewIsModal>
      <Text style={estilos.hojaRotulo}>¿A quién se lo propones?</Text>
      {primero !== undefined ? (
        <Text style={estilos.hojaTexto}>{`Das ${primero.doy} y pides ${primero.quiero}.`}</Text>
      ) : null}
      {posibles.map((t) => (
        <Pressable
          key={t.para}
          style={estilos.hojaBoton}
          onPress={() => alElegir(t)}
          accessibilityRole="button"
          accessibilityLabel={`Proponérselo a ${t.nombre}`}
        >
          <Text style={estilos.hojaBotonRotulo}>{t.nombre}</Text>
        </Pressable>
      ))}
      <Pressable
        style={estilos.hojaDejarlo}
        onPress={alDejarlo}
        accessibilityRole="button"
        accessibilityLabel="Dejarlo, sin proponer nada"
      >
        <Text style={estilos.hojaDejarloRotulo}>Dejarlo</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------

/*
 * Sólo lo que esta pantalla pinta con sus manos: el lienzo, el telón, la nota del
 * respaldo y la hoja. Todo lo demás son los estilos del mueble genérico, importados.
 * Ni un color inventado: los de `SALA` y los alfas que `conAlfa` saca de ellos.
 */
const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.suelo },
  /* El cauce que se desplaza debajo de la barra mientras se reúne la mesa. */
  rio: { flex: 1 },
  /* El pie: pide lo que mide y cede antes que el lienzo. El `flexGrow: 0` hay que escribirlo. */
  pieDeLaMesa: { flexGrow: 0, flexShrink: 1 },
  /* El mismo suelo que el mueble genérico le pone al retablo: por debajo deja de servir. */
  cajaDelRetablo: { flex: 1, minHeight: 200 },
  /*
   * LA CAJA DEL LIENZO: alto fijo puesto desde la pantalla, y `overflow: hidden`
   * para que el telón y la hoja se recorten con ella. Sin fondo propio: el `Canvas`
   * pinta el cielo, y mientras no está, el telón pinta el suelo.
   */
  cajaDelLienzo: { width: '100%', overflow: 'hidden' },
  lienzo: { flex: 1 },
  telon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
    backgroundColor: SALA.suelo,
  },
  lugar: { ...LETRA.rotulo, color: SALA.palabra, fontSize: 18 },
  espera: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  /* La nota del respaldo: texto que se lee y no grita, como el aviso de la mesa. */
  nota: {
    ...LETRA.cuerpo,
    color: SALA.tenue,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    textAlign: 'center',
  },
  /*
   * LA HOJA: una ficha sobre el lienzo, pegada abajo. Teja con el contorno que se
   * ve —blanco al 40 %, 3,63 sobre la teja—, porque aquí sí se dibuja una caja.
   */
  hoja: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    gap: 8,
    padding: 14,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.teja,
  },
  hojaRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  hojaTexto: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 15, lineHeight: 22 },
  /* 44 de alto: el mínimo de dedo de la casa. Sin acento: es la lista, no la acción. */
  hojaBoton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderColor: conAlfa(SALA.blanco, 0.4),
    borderWidth: 1,
    borderRadius: RADIO.mando,
    backgroundColor: SALA.tejaAlta,
  },
  hojaBotonRotulo: { ...LETRA.rotulo, textTransform: 'none', color: SALA.blanco, fontSize: 16 },
  hojaDejarlo: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  hojaDejarloRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
});
