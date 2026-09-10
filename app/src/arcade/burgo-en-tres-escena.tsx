/**
 * EL BURGO EN TRES DIMENSIONES, POR DENTRO: la misma mesa que pinta el mueble
 * `tablero`, con el anillo de `escenas/burgo/Burgo.tsx` donde antes iba el `Retablo`.
 *
 * ═══ ESTO ES UN PINTOR, NO UN MOTOR, Y NO SABE NI UNA REGLA ═══
 *
 * Aquí no se decide qué cuesta un solar, ni cuándo se puede alzar una casa, ni a
 * quién se le puede proponer un trato, ni qué renta se cobra hoy. Todo lo que la
 * escena necesita saber del Burgo lo traduce UNA vez
 * `shared/arcade/juegos/burgo-en-tres.ts` —de la vista a lo que se pinta, y de lo
 * que se toca al movimiento que se manda— y esta pantalla sólo junta las dos
 * puntas: `usarMesaDeArcade` por un lado y `<Burgo>` por el otro. Si el servidor
 * rechaza un movimiento, lo dice el aviso de la mesa, que ya sabía hacerlo; si
 * mañana la traducción cambia, este fichero no se entera.
 *
 * Es el mismo precedente que La Frente sobre `formulario` y Riberas sobre
 * `tablero`: un juego del binario con pantalla propia sobre un mueble genérico. El
 * Burgo sigue con `mueble: 'tablero'`, su vista y sus opciones no cambian, y
 * `ElTableroEnLinea` sigue pintando cualquier arcade de fuera con tablero.
 *
 * ═══ LOS MODELOS NO SE PIDEN AQUÍ, Y ESO ES DISTINTO DE RIBERAS ═══
 *
 * `riberas-en-tres-escena.tsx` baja `tablero.glb` y `dados.glb` con su propia caché
 * de módulo y le pasa el catálogo ya abierto a `<Delta>`. `<Burgo>` NO funciona
 * así: se trae él mismo `burgo.glb` y `dados.glb` con la `traer` que se le pasa, y
 * cachea por IDENTIDAD DE ESA FUNCIÓN en un `WeakMap` (ver la cabecera de
 * `Burgo.tsx`). Por eso aquí se le pasa la `traer` de módulo de `traer.ts` —la
 * misma que usa el Muelle— y no una función nueva por montaje: con una función
 * nueva cada vez, salir de la mesa y volver volvería a bajar 2,8 MB, y el
 * aventurero de KayKit estrenaría caché.
 *
 * Y por eso el telón y el respaldo NO se deciden mirando un estado de carga de
 * aquí, sino los dos avisos del contrato: `alEstarListo` —que llega SIEMPRE, con
 * modelos o sin ellos, con un tope de quince segundos— levanta el telón, y
 * `alFallar` con la ruta de `burgo.glb` dentro manda al retablo. Los dados que no
 * llegan NO mandan al retablo: la escena sabe pintar el cubo del respaldo.
 *
 * ═══ EL TABLERO SE MIRA DE CERCA, Y ESO SON TRES COSAS Y NO UNA ═══
 *
 * Se entra viendo el anillo entero desde el aire y se puede llegar hasta una
 * casilla y sus vecinas llenando la pantalla. Eso pide tres piezas que sólo sirven
 * juntas: ACERCARSE (el pellizco, y la rueda donde hay ratón), MOVER LA MIRADA
 * (dos dedos paseando) y VOLVER (un botón que se ve). Sin la tercera, las otras dos
 * son una trampa. Las cuentas no están aquí: la `Cercania` la lleva
 * `mirador-tactil.ts` en una referencia y la aritmética es de `escenas/acercar.ts`
 * compuesta por `camara-del-burgo.ts`, medida en Node por `verify:burgo-escena`.
 *
 * LA CÁMARA DEL CLIENTE SE MONTA ANTES QUE `<Burgo>` Y CON PRIORIDAD 0, y no es un
 * detalle de orden: r3f corre los suscriptores de igual prioridad EN ORDEN DE
 * MONTAJE, y el `useFrame` de la escena que sigue al que mueve mezcla desde la pose
 * que el cliente acaba de dejar. Montada después, la escena mezclaría desde la pose
 * del fotograma anterior y el seguimiento iría siempre un fotograma por detrás.
 *
 * Y LA CÁMARA NO SE RECOLOCA CUANDO CAMBIA LA REVISIÓN DE LA MESA: quien está
 * mirando una esquina de cerca se queda donde estaba aunque otro juegue. Lo único
 * que la mueve sin pedirlo es SEGUIR AL QUE MUEVE, y eso se apaga en cuanto la
 * persona toca el tablero y se vuelve a encender en el turno siguiente.
 *
 * ═══ EL RESPALDO NO ES OPCIONAL ═══
 *
 * Si el modelo no llega —sin cobertura, un servidor viejo que no sirve `.glb`, un
 * aparato que no abre el fichero— o si el lienzo revienta AL PINTAR, se juega sobre
 * EL RETABLO SVG DE SIEMPRE, con la hoja entera debajo y una nota en tenue de por
 * qué. Una pantalla de partida que depende de que baje un fichero de casi tres
 * megabytes no es una pantalla de partida: es una demostración.
 *
 * ═══ EL TABLERO ES LA PANTALLA, Y LA HOJA UN CAJÓN QUE SUBE DESDE EL PIE ═══
 *
 * Antes el lienzo se llevaba el 58 % del alto y la hoja iba DEBAJO, en flujo. Eso
 * hacía dos cosas malas a la vez: dejaba el anillo en media pantalla —en un teléfono
 * en pie, 490 puntos de 845— y metía todo lo que se pulsa dentro de una columna que
 * hay que rodar. Ahora el lienzo se lleva todo lo que queda bajo la barra de la mesa
 * y la hoja sube cuando se pide, igual que el cajón del PC; lo único que se queda
 * fuera, flotando sobre el pie del lienzo, es lo que hay que poder mirar y pulsar SIN
 * abrir nada: la cinta con el asa del cajón, EL CARRIL, la caja de los tratos, el
 * cartel de la casilla señalada y los botones que no recoja ningún mueble.
 *
 * ═══ Y ESO NO DEJA EL ANILLO DEBAJO DEL PIE: ESTÁ MEDIDO ═══
 *
 * `poseDeSalida` sólo mira la PROPORCIÓN del lienzo, no su altura, así que un lienzo
 * más alto no acerca nada: reencuadra. Proyectando las cuatro esquinas del anillo
 * (±432, ±432) con `poseDelBurgo` y `proyecta` —las mismas funciones que
 * `verify:burgo-escena`— en un teléfono de 390 × 845 con la barra de la mesa puesta
 * (lienzo de 390 × 725):
 *
 *     al 58 % (390 × 490):  x ∈ [−0,796, 0,698]   y ∈ [−0,564, 0,425]
 *     entero  (390 × 725):  x ∈ [−0,778, 0,712]   y ∈ [−0,362, 0,299]
 *
 * O sea que la esquina más baja del anillo pasa del 78 % al 68 % del alto, y por
 * debajo quedan 231 puntos libres donde antes quedaban 107. La cinta y el carril
 * juntos miden unos 144: el pie flota sobre lienzo vacío y no sobre casillas. Las
 * cuatro esquinas siguen dentro con margen en las tres ventanas de la casa.
 *
 * ═══ Y NINGUNA DECISIÓN DE ESTA PANTALLA MIRA LA PLATAFORMA ═══
 *
 * `Platform.OS` no aparece ni una vez, ni siquiera en las sombras: van a `false` en
 * todas partes (un mapa de 2048 baja un móvil de 60 a 20 fps, y el Burgo se lee con
 * discos de contacto). `burgo.glb` va horneado a color por vértice y sin una sola
 * imagen dentro, así que no hay nada que Hermes tenga que decodificar y no hay
 * complemento de texturas que registrar. Los respaldos que quedan son por fallo de
 * carga, por lienzo caído y por vista que no se ve en tres, y son los mismos en las
 * dos plataformas. `verify:sala` lo vigila.
 */
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
/*
 * Sólo la constante del mapeo tonal: el `Canvas` sigue saliendo de `tres/Lienzo`,
 * que es lo que la regla del §7 protege. Ver `muelle-escena.tsx`, que hace lo mismo.
 */
import { ACESFilmicToneMapping } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { manifiestoDeArcadeSiExiste } from '../../../shared/arcade';
/* Instala los arcades del binario, por si se llega aquí por enlace directo. Ver `pintar.tsx`. */
import '../../../shared/arcade/juegos';
import { BURGO } from '../../../shared/arcade/juegos';
import { opcionesSueltas, tableroDeLaVista } from '../../../shared/mecanicas/tablero-declarado';
import {
  carrilDelBurgo,
  cartelDeCasilla,
  dadosEnTres,
  esVistaQueSePinta,
  fichaDeCasilla,
  firmaDelTablero,
  hojaEnTres,
  laCronicaConLaVista,
  obraPosibleEnCasilla,
  obrasSoloEnElAnillo,
  opcionesFueraDelTablero,
  pregonDelBurgo,
  seVeEnTres,
  sucesosEnTres,
  tableroEnTres,
  tirarEnTres,
} from '../../../shared/arcade/juegos/burgo-en-tres';
import type {
  DestinoDelTrato,
  HojaDelBurgo,
  RenglonDeLaCronica,
} from '../../../shared/arcade/juegos/burgo-en-tres';
import { Burgo } from '../../../escenas/burgo/Burgo';
import type { ModoDeCamara, TableroDelBurgoEn3D } from '../../../escenas/burgo/tipos';
/*
 * LAS CONSTANTES DE LA CÁMARA DEL BURGO, Y NINGUNA ESCRITA AQUÍ. `camara.ts` dice
 * desde qué rumbo y qué altura se mira; `acercar.ts`, cuánto se acerca y adónde;
 * `camara-del-burgo.ts` las compone con los números de ESTE tablero y los mide en
 * Node. Esta pantalla sólo las junta en su `useFrame`.
 */
import {
  ALCANCE_DEL_BURGO,
  ALTURA_MINIMA_DEL_OJO_DEL_BURGO,
  CAMPO_DE_LA_CAMARA,
  MIRADOR_DEL_BURGO,
  poseDeSalida,
} from '../../../escenas/burgo/camara-del-burgo';
import { ojoYMira } from '../../../escenas/acercar';
import type { Cercania } from '../../../escenas/acercar';
import { ojoDelMirador } from '../../../escenas/camara';
import type { Mirador } from '../../../escenas/camara';
import { juzgarCalidad } from '../../../escenas/embarcadero/calidad';
import type { MuestraDelHilo } from '../../../escenas/embarcadero/calidad';
import type { Calidad, Ventana } from '../../../escenas/embarcadero/tipos';
/* La ruta, y nada más: es la que `alFallar` nombra cuando el mundo no llega. */
import { rutaDelBurgo } from '../../../escenas/ruta-de-modelos';
import { Canvas } from '../tres/Lienzo';
import { apuntarFallo } from '../parte-de-fallos';
import { conAlfa } from '../tema';
import {
  ElCajonDeLaHoja,
  ElCarrilDeLaMesa,
  ElCartelDeLaCasilla,
  LaCajaDeLosTratos,
  LaCintaDelBurgo,
  LaFichaDeUnaCasilla,
  LaFichaDelJugador,
  LaHojaDelBurgo,
  LaHojaSobreElLienzo,
  usarLaSeccionAbierta,
} from './hojas-del-burgo';
import { usarMesaDeArcade } from './mesa';
import type { AvisoDeMesa, MesaVista, OpcionDeMesa, ResultadoDelMovimiento } from './mesa';
import { usarMiradorTactil } from './mirador-tactil';
import { LETRA, RADIO, SALA } from './muebles';
import { Pantalla } from './piezas';
import { PLAZOS } from './plazos';
import { Retablo } from './retablo';
import {
  BarraDeLaMesa,
  ElAviso,
  ESTILOS_DE_LA_MESA,
  hayAlgoQuePintar,
  LaCronica,
  LasOpciones,
  LineaDelTurno,
} from './tablero-en-linea';
import { traer } from './traer';

/**
 * CUÁNTO ALTO SE LLEVA EL LIENZO: TODO EL QUE QUEDA. Ya no hay fracción.
 *
 * Aquí vivían un `PARTE_DEL_ALTO = 0.58` y un suelo de 360. El 58 % era lo que la
 * hoja, en flujo y debajo, le dejaba al anillo; desde que la hoja es un cajón que
 * sube desde el pie, no hay nada debajo que repartir y el lienzo se lleva lo que
 * queda bajo la barra de la mesa. Sigue sin ser un `flex: 1` desnudo sobre nada: es
 * el único hijo que crece de una columna que ya tiene alto, así que no puede
 * encogerse a cero —que es lo que aquel suelo de 360 evitaba— y el suelo sobra.
 *
 * LO QUE HAY QUE VOLVER A MEDIR ESTÁ EN OTRO FICHERO, y no es mío:
 * `verify:burgo-escena` proyecta las cuatro esquinas del anillo en una ventana que
 * llama «9:19,5 al 58 %» y calcula como `390 × Math.round(845 × 0,58)`. Esa ventana
 * describe una pantalla que ya no existe. Medido con sus mismas funciones, la que
 * hay que poner es `390 × 725` —la pantalla menos la barra— y ahí las cuatro
 * esquinas caen en x ∈ [−0,778, 0,712] e y ∈ [−0,362, 0,299], o sea DENTRO y con más
 * margen que antes. Se dice aquí, y allí no se toca nada.
 */

/**
 * LO QUE LA HOJA TAPA DEL LIENZO: CERO, y ahora por otro motivo.
 *
 * Antes era cero porque la hoja era hermana del lienzo y no se le ponía encima. Ahora
 * hay muebles flotando sobre el pie —la cinta, el carril, la caja de los tratos, el
 * cartel— y aun así sigue siendo cero, por dos razones medidas: el cajón, que es lo
 * único que tapa de verdad, tapa TODO cuando está abierto y entonces nadie mira el
 * anillo; y el pie que flota mide unos 144 puntos, mientras que la esquina más baja
 * del anillo se proyecta al 68 % del alto de un lienzo de 725, o sea con 231 puntos
 * de lienzo vacío por debajo. En el Muelle sí es 0,36, porque allí la hoja flota
 * sobre la escena y la tapa de verdad.
 */
const FRANJA_QUE_TAPA_LA_HOJA = 0;

/** Hoy la escena sólo sabe la aérea; el otro modo está reservado en `tipos.ts`. Objeto de módulo: no se refabrica por fotograma. */
const CAMARA_AEREA: ModoDeCamara = { modo: 'aerea' };

/** La clave con la que los pregones entran en la crónica del mueble. Ver `AvisoDeMesa`. */
const CLAVE_DEL_PREGON = 'burgo:pregon';

/**
 * LA NOTA DE CUANDO LA VISTA NO SE VE EN TRES. `tableroEnTres` devuelve `null` si
 * la vista no es del Burgo o si hay más asientos que peones; la partida sigue,
 * sobre el retablo SVG, y se dice por qué.
 */
const NOTA_SIN_ANILLO =
  'El burgo en tres dimensiones no ha podido leer esta mesa. Se juega sobre el tablero de siempre.';

// ---------------------------------------------------------------------------
// La pantalla
// ---------------------------------------------------------------------------

/** Pinta la mesa del Burgo, con el anillo en tres dimensiones. */
export default function ElBurgoEnTresPorDentro(): JSX.Element {
  /*
   * La ruta es `/tablero?arcade=burgo` y `quienPinta` ya casó el id contra
   * `LOS_QUE_PINTA` antes de montar esto, así que la mesa es la del Burgo y punto:
   * `usarMesaDeArcade(BURGO)` con la constante y no con el parámetro. Lo que el
   * parámetro sigue sirviendo es para el rótulo cuando el manifiesto no está —un
   * enlace directo con el registro a medio instalar—, que es lo único que esta
   * pantalla no puede saber por su cuenta.
   */
  const { arcade } = useLocalSearchParams<{ arcade?: string }>();
  const manifiesto = manifiestoDeArcadeSiExiste(BURGO);
  const mesa = usarMesaDeArcade(BURGO);
  const [nombre, ponerNombre] = useState('');
  const [codigo, ponerCodigo] = useState('');
  const [plazo, ponerPlazo] = useState(0);
  /* El área segura, leída UNA vez y aquí arriba: es un hook y los hooks no se saltan. */
  const bordes = useSafeAreaInsets();
  const relleno = { paddingTop: bordes.top + 28, paddingBottom: bordes.bottom + 28 };

  /*
   * EL LATIDO DE LA CUENTA ATRÁS, el mismo que en `tablero-en-linea.tsx` y por lo
   * mismo: el vencimiento viaja como instante absoluto y quien resta es la pantalla.
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

  const juego = manifiesto?.nombre ?? (typeof arcade === 'string' && arcade.length > 0 ? arcade : BURGO);

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
     * el embarcadero abre el burgo con la mesa ya sentada—, pero un enlace directo,
     * un asiento caducado o «Salir» acaban en esta rama, y una rama que no se puede
     * usar es una pantalla en blanco con otro nombre.
     */
    return (
      <Pantalla hueco={28} estilo={relleno}>
        <View style={ESTILOS_DE_LA_MESA.centro}>
          <Text style={ESTILOS_DE_LA_MESA.titulo}>{juego}</Text>
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
                  style={i === plazo ? ESTILOS_DE_LA_MESA.plazoRotuloElegido : ESTILOS_DE_LA_MESA.plazoRotulo}
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
      juego={juego}
      nombres={nombres}
      arriba={bordes.top}
      abajo={bordes.bottom}
    />
  );
}

// ---------------------------------------------------------------------------
// La red bajo el lienzo
// ---------------------------------------------------------------------------

/**
 * LA RED BAJO EL LIENZO: si el burgo revienta al PINTAR, se juega sobre el retablo.
 *
 * Los respaldos de la pantalla —la vista que no se ve en tres, el `.glb` que no
 * llega— se deciden ANTES de montar el `Canvas`. Lo que ninguno recoge es un fallo
 * dentro del propio lienzo: una textura que expo-gl no quiere, un sombreador que no
 * compila en esa GPU, un fundido de noventa mil vértices que se queda sin memoria.
 * La primera vez que este tablero se monta en un teléfono real es la víspera de una
 * partida, y ahí un `throw` en el render no puede costar la partida: se apunta —el
 * parte de fallos lo enseñará al volver a abrir, con su motivo— y la mesa sigue
 * sobre el tablero de siempre.
 *
 * Es una clase porque React no da otra forma de recoger un `throw` de render, y
 * avisa hacia arriba en vez de pintar ella el respaldo porque el respaldo necesita
 * la vista, las opciones y la hoja, que viven en la pantalla.
 */
class RedDelLienzo extends Component<
  { readonly alCaer: (motivo: string) => void; readonly children: ReactNode },
  { readonly cayo: boolean }
> {
  override state: { readonly cayo: boolean } = { cayo: false };

  static getDerivedStateFromError(): { cayo: boolean } {
    return { cayo: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    const e = error instanceof Error ? error : new Error(String(error));
    e.stack = `${e.stack ?? ''}\n— en el lienzo del burgo —${info.componentStack ?? ''}`;
    apuntarFallo(e, 'render', false);
    this.props.alCaer(e.message);
  }

  override render(): ReactNode {
    return this.state.cayo ? null : this.props.children;
  }
}

// ---------------------------------------------------------------------------
// La mesa, sentados
// ---------------------------------------------------------------------------

type LaMesa = ReturnType<typeof usarMesaDeArcade>;

/** Lo que el toque de una casilla abre cuando hay más de una obra posible. */
interface QueHacesAqui {
  readonly casilla: number;
  readonly obras: readonly OpcionDeMesa[];
}

/**
 * Lo que la pantalla pinta con una mesa delante. Componente aparte para que sus
 * hooks —el gesto, la cámara, la hoja, lo cogido— no queden detrás de los `return`
 * de arriba, que es la regla que `verify:app` lee con el árbol de TypeScript.
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
  /* Si el lienzo cayó una vez en este aparato, esta pantalla no vuelve a montarlo. */
  const [elLienzoCayo, ponerElLienzoCayo] = useState<string | null>(null);
  /* Y si el mundo no ha llegado, tampoco: la partida se juega sobre el retablo. */
  const [elMundoNoLlego, ponerElMundoNoLlego] = useState<string | null>(null);
  const [llegando, ponerLlegando] = useState(true);

  /*
   * ═══ LO COGIDO VIVE AQUÍ, Y SE SUELTA CUANDO CAMBIA LA MESA ═══
   *
   * Las tres hojas que se abren encima del lienzo —«¿qué haces en esta casilla?»,
   * la ficha de una casilla y la ficha de un jugador— no son estado del juego: son
   * dónde tiene el dedo la persona, y por eso viven aquí y no viajan. Y en cuanto
   * la revisión de la mesa cambia se sueltan las tres: una pregunta compuesta con
   * las opciones de la revisión anterior se manda con una opción que el servidor ya
   * no ofrece, y una ficha abierta sobre una casilla que acaba de cambiar de dueño
   * es una tarjeta que miente.
   *
   * La sección abierta de la hoja NO entra aquí, y es a propósito: el sondeo trae
   * una revisión nueva cada vez que cualquiera juega, y una hoja que se plegara con
   * cada jugada ajena sería imposible de leer justo en el turno de otro, que es
   * cuando más se lee. Quién la abre y cuándo está en `usarLaSeccionAbierta`.
   */
  const [queHacesAqui, ponerQueHacesAqui] = useState<QueHacesAqui | null>(null);
  const [laCasilla, ponerLaCasilla] = useState<number | null>(null);
  const [elJugador, ponerElJugador] = useState<string | null>(null);
  const soltarTodo = useCallback(() => {
    ponerQueHacesAqui(null);
    ponerLaCasilla(null);
    ponerElJugador(null);
  }, []);
  useEffect(() => {
    soltarTodo();
  }, [vista.rev, soltarTodo]);

  /*
   * ═══ LA CASILLA SEÑALADA NO ENTRA EN «LO COGIDO», Y ESO ES LA DECISIÓN ═══
   *
   * Las tres hojas de arriba se sueltan en cada revisión porque llevan OPCIONES
   * dentro: una compuesta con la revisión anterior se manda con algo que el servidor
   * ya no ofrece. El cartel de la casilla señalada no lleva ninguna —`cartelDeCasilla`
   * ni siquiera recibe la lista de opciones, y eso está escrito en su cabecera para
   * que no se le metan— y se redacta entero desde la vista de AHORA en cada
   * repintado, así que no puede mentir. Soltarlo con cada revisión lo dejaría en
   * pantalla dos segundos de cada treinta en una mesa de seis, que es como no
   * tenerlo.
   */
  const [laSenalada, ponerLaSenalada] = useState<number | null>(null);

  const [medida, ponerMedida] = useState({ ancho: 0, alto: 0 });
  const medir = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    ponerMedida({ ancho: width, alto: height });
  }, []);

  /* ─── De la vista a la escena, todo por `burgo-en-tres.ts` ─── */

  const laVista = vista.vista;
  const yo = vista.yo;
  const opciones = useMemo(() => vista.opciones ?? [], [vista.opciones]);
  const asientos = vista.asientos;

  /*
   * ═══ EL TABLERO CONSERVA SU IDENTIDAD ENTRE SONDEOS, Y ESO ES LO QUE NO TIEMBLA ═══
   *
   * Cada respuesta del servidor trae una vista NUEVA, y `tableroEnTres` fabrica de
   * ella cuarenta casillas nuevas aunque no haya cambiado ni una. La escena
   * reconstruye instancias, matrices y esferas de recorte cuando cambia la
   * IDENTIDAD de lo que recibe: eso sería rehacer el mundo en cada vuelta del
   * sondeo, en el cliente móvil, y se vería como un tirón por revisión. Así que se
   * firma el CONTENIDO con `firmaDelTablero` —que la traducción escribe para esto
   * exactamente— y si es el mismo se entrega EL MISMO objeto de antes.
   *
   * Los asientos entran en la cuenta porque traen la FIGURA que cada uno eligió en
   * el Muelle: sin ellos el tablero pintaría siempre el aventurero de serie, y la
   * escena montaría uno distinto del que se vio zarpar.
   */
  const tableroVisto = useRef<{ firma: string; tablero: TableroDelBurgoEn3D } | null>(null);
  const datos = useMemo((): TableroDelBurgoEn3D | null => {
    const crudo = tableroEnTres(laVista, yo, opciones, asientos);
    if (crudo === null) return null;
    const firma = firmaDelTablero(crudo);
    const antes = tableroVisto.current;
    if (antes !== null && antes.firma === firma) return antes.tablero;
    tableroVisto.current = { firma, tablero: crudo };
    return crudo;
  }, [laVista, yo, opciones, asientos]);

  /*
   * LOS DADOS reciben las opciones ENTERAS, antes de ningún filtro: al revés
   * `porTirar` sería siempre falso, el asa no se montaría nunca y nadie podría
   * tirar en toda la tarde sin un error en ninguna parte. Está escrito en la
   * cabecera de `dadosEnTres` y es el orden que `opcionesFueraDelTablero` exige.
   */
  const dados = useMemo(() => dadosEnTres(laVista, yo, opciones), [laVista, yo, opciones]);

  /*
   * ═══ LO QUE HAY QUE ANIMAR: LA JUGADA QUE LA ESCENA VIO Y LA QUE LLEGA ═══
   *
   * `sucesosEnTres` necesita saber por dónde iba la escena y —si se perdió más de
   * una revisión, que es lo normal en un sondeo con la pantalla apagada— la vista
   * ANTERIOR, para derivar la lista gruesa comparando. Las dos cosas viven en una
   * referencia y no en un estado: nadie las pinta, y un estado de más aquí es un
   * render de más por cada vuelta del sondeo.
   *
   * La referencia se escribe DENTRO del `useMemo` y por eso se guarda también el
   * resultado: React puede llamar dos veces a la función de un `useMemo` con la
   * misma vista, y la segunda vez la referencia ya estaría al día — la lista
   * saldría vacía y el burgo se quedaría con el mundo viejo hasta la jugada
   * siguiente. Se compara por IDENTIDAD de la vista, que es lo único que distingue
   * «me han vuelto a llamar por lo mismo» de «ha llegado una revisión nueva».
   */
  const loVisto = useRef<{
    vista: unknown;
    jugada: number;
    lista: ReturnType<typeof sucesosEnTres>;
  } | null>(null);
  const sucesos = useMemo(() => {
    const antes = loVisto.current;
    if (antes !== null && antes.vista === laVista) return { jugada: antes.jugada, lista: antes.lista };
    const desde = antes === null ? 0 : antes.jugada;
    const lista = sucesosEnTres(desde, laVista, antes?.vista);
    const jugada = esVistaQueSePinta(laVista) ? laVista.jugada : desde;
    loVisto.current = { vista: laVista, jugada, lista };
    return { jugada, lista };
  }, [laVista]);

  /*
   * ═══ EL ORDEN DE ESTAS SEIS LLAMADAS NO ES LIBRE, Y ES LA MITAD DEL ENCARGO ═══
   *
   * Los tres primeros muebles no dependen de nadie salvo del anterior; la hoja recibe
   * LOS DOS que ya pintan movimientos suyos, y la criba va SIEMPRE la última porque es
   * la única que mira a todas las demás. Compuesta antes que la hoja o que el carril,
   * quitaría por un mueble que todavía no existe.
   *
   *     tablero → dados → la caja de los tratos → el carril → la hoja → la criba
   *
   * Y a la hoja se le pasan LOS OBJETOS y no dos banderas. Un `boolean` que se quedara
   * en `true` con el mueble sin pintar deja el movimiento sin sitio en toda la
   * pantalla y sin un solo error: con la caja, «El trato» suelta sus botones; con el
   * carril, «Ahora» suelta los suyos y añade un renglón que dice dónde se pulsan.
   */
  const pregon = useMemo(() => pregonDelBurgo(laVista, yo, opciones), [laVista, yo, opciones]);
  const carril = useMemo(() => carrilDelBurgo(laVista, yo, opciones), [laVista, yo, opciones]);
  const hoja: HojaDelBurgo<OpcionDeMesa> = useMemo(
    () => hojaEnTres(laVista, yo, opciones, pregon, carril),
    [laVista, yo, opciones, pregon, carril],
  );

  /*
   * La sección abierta y el cajón, recordados por mesa y abiertos solos cuando toca
   * actuar. Sube aquí —antes estaba más abajo— porque `cajonAbierto` es lo que decide
   * si la hoja SE PINTA, y eso es lo que la criba necesita saber.
   */
  const { abierta, alAbrir, cajonAbierto, alternarElCajon, cerrarElCajon, alAbrirEnElCajon } =
    usarLaSeccionAbierta(vista.codigo, hoja.abre, hoja.cinta.espera, hoja.cinta.meToca, carril, pregon);

  /*
   * LOS BOTONES SUELTOS: lo que ni los dados, ni las casillas tocables, ni la hoja,
   * ni la caja de los tratos, ni el carril recogen. Recibe LOS OBJETOS que se pintan
   * —no interruptores— y se aplica DESPUÉS de componerlos, que es lo que hace que el
   * botón desaparezca exactamente cuando el asa, la marca, la sección, la tira o el
   * cuadrado existen.
   *
   * ═══ Y LA HOJA SÓLO CUENTA CON EL CAJÓN ABIERTO ═══
   *
   * Es la regla de la casa aplicada al mueble nuevo: la criba recibe lo que SE PINTA,
   * y una hoja dentro de un cajón cerrado no se pinta. Con el cajón cerrado, lo que
   * sólo enseñaba la hoja —las pujas de una subasta, sobre todo— vuelve como botón
   * suelto al pie del lienzo, que es donde se puede pulsar sin abrir nada; al abrirlo
   * se va a sus secciones, donde se lee con su rótulo largo. Nunca está en los dos
   * sitios a la vez.
   */
  const fuera = useMemo(
    () => opcionesFueraDelTablero(opciones, datos, dados, cajonAbierto ? hoja : null, pregon, carril),
    [opciones, datos, dados, hoja, cajonAbierto, pregon, carril],
  );

  /*
   * ═══ LAS OBRAS QUE SÓLO TIENE EL ANILLO, PARA QUIEN NO PUEDE TOCAR EL ANILLO ═══
   *
   * COMPRAR y SACAR A SUBASTA no son de un título mío todavía, así que no tienen
   * ficha en «Lo mío»: la criba les quita el botón suelto —porque su casilla está
   * encendida— y no se lo da nadie. O sea que el movimiento principal del juego sólo
   * se podía hacer con el dedo sobre una escena de tres dimensiones. Con lector de
   * pantalla, el lienzo entero es UN elemento, y ahí dentro no hay cuarenta casillas:
   * hay una etiqueta.
   *
   * `obrasSoloEnElAnillo` devuelve exactamente esas —y ni una más: se le pasa también
   * EL CARRIL, porque en mi apuro vender e hipotecar se van de las fichas a «Ahora» y
   * de «Ahora» al carril, y sin decírselo pediría un gemelo para cada una—. Aquí se
   * ofrecen por la MISMA puerta que tirar los dados: acciones de accesibilidad del
   * lienzo, que es el precedente que esta pantalla ya tenía escrito. No es un segundo
   * botón, es el mismo dicho para quien no puede hacer el gesto.
   */
  const soloEnElAnillo = useMemo(
    () => obrasSoloEnElAnillo(opciones, datos, cajonAbierto ? hoja : null, carril),
    [opciones, datos, hoja, cajonAbierto, carril],
  );

  /**
   * LAS ACCIONES DEL LIENZO: tirar, y una por obra que sólo tiene el anillo.
   *
   * `undefined` y no una lista vacía cuando no hay ninguna, que es lo que había:
   * una lista vacía le dice al lector de pantalla que el elemento tiene un menú de
   * acciones, y abrirlo para encontrarlo vacío es peor que no anunciarlo. Los
   * nombres son posicionales (`obra:0`) porque el nombre de una acción es una llave
   * interna y el ROTULO —lo que se oye— es el del juego, entero.
   */
  const accionesDelLienzo = useMemo(() => {
    const lista: { readonly name: string; readonly label: string }[] = [];
    if (dados !== null && dados.porTirar) lista.push({ name: 'tirar', label: 'Tirar los dados' });
    for (const [i, o] of soloEnElAnillo.entries()) lista.push({ name: `obra:${String(i)}`, label: o.rotulo });
    return lista.length === 0 ? undefined : lista;
  }, [dados, soloEnElAnillo]);

  /* Cómo se llama una casilla, preguntado a la traducción y no a una tabla de aquí. */
  const nombreDeCasilla = useCallback(
    (casilla: number) => fichaDeCasilla(laVista, casilla, yo, []).nombre,
    [laVista, yo],
  );

  /*
   * ═══ LA CRÓNICA: EL PREGÓN DE CADA VISTA, ACUMULADO POR `shared/` ═══
   *
   * El pregón es la frase que el juego escribe para la mesa entera, y viaja en cada
   * vista: sólo la última. Quien quiera un relato tiene que guardarlo, y eso es cosa
   * del cliente porque el estado del juego no puede llevar histórico (el tope de
   * 512 KiB por estado, y el presupuesto por movimiento).
   *
   * ═══ LO QUE HACÍA ESTA PANTALLA ESTABA MAL, Y NO SE VEÍA ═══
   *
   * Apuntaba cuando CAMBIABA el texto. Con eso, dos sucesos iguales seguidos —dos
   * «Ana tira», dos cobros idénticos— eran UNO SOLO en el relato: el segundo
   * desaparecía sin que nadie lo notara. Ahora lo lleva `laCronicaConLaVista`, que
   * apunta POR JUGADA: la jugada sube con cada cambio de estado y es única por vista,
   * así que un sondeo que trae la misma vista no añade nada y dos jugadas con la misma
   * frase son dos renglones, que es lo que pasó de verdad. Y si la jugada va hacia
   * atrás —otra mesa, una recién abierta— empieza de cero en vez de mezclar dos
   * relatos. Devuelve LA MISMA LISTA por identidad cuando no hay nada nuevo, así que
   * el `useState` no repinta: eso es lo que impide una crónica nueva por sondeo.
   */
  const [cronicaDelBurgo, ponerCronicaDelBurgo] = useState<readonly RenglonDeLaCronica[]>([]);
  useEffect(() => {
    ponerCronicaDelBurgo((antes) => laCronicaConLaVista(antes, laVista));
  }, [laVista]);
  const cronica = useMemo(
    (): readonly AvisoDeMesa[] => [
      ...cronicaDelBurgo.map((r) => ({ clave: `${CLAVE_DEL_PREGON}:${String(r.jugada)}`, texto: r.texto })),
      ...mesa.cronica,
    ],
    [cronicaDelBurgo, mesa.cronica],
  );

  /*
   * EL GESTO Y LA CÁMARA. El alcance es el del Burgo y no el del delta: 66 unidades
   * de mundo, `MEDIO_LADO × 1,32`, que es lo que hace que un pellizco mueva lo
   * mismo aquí que allí en pantallas de mundo.
   */
  const { gesto, apuntarElLienzo, mirador, cercania, seHaMovido, verElTableroEntero, laInterfazSeLoQueda } =
    usarMiradorTactil(medida, ALCANCE_DEL_BURGO);

  /*
   * ═══ LA POSE DE SALIDA ES LA DEL BURGO, Y HAY QUE PONERLA ═══
   *
   * `usarMiradorTactil` nace con el mirador y la cercanía DEL DELTA —40° de altura
   * y el tablero entero mirando al centro—, que es lo que aquel tablero quiere.
   * Aquí hay que leer las aceras de color, así que la altura son 55°; y en apaisado
   * el anillo no cabe mirando al centro: `poseDeSalida` retira el ojo un 20 % y
   * corre la mirada 16 unidades hacia la cámara, medido en Node con `proyecta`.
   *
   * Se escribe en las referencias y no en un estado porque eso es exactamente lo
   * que son: la escena las lee cada fotograma y React no las ve cambiar. Y sólo
   * MIENTRAS NO SE HAYA MOVIDO NADIE: quien está mirando una esquina de cerca no
   * quiere que girar el teléfono le devuelva la cámara al centro.
   */
  const ventana = useMemo(
    (): Ventana => ({ ancho: medida.ancho, alto: medida.alto, franjaInferior: FRANJA_QUE_TAPA_LA_HOJA }),
    [medida.ancho, medida.alto],
  );
  useEffect(() => {
    if (seHaMovido) return;
    mirador.current = MIRADOR_DEL_BURGO;
    cercania.current = poseDeSalida(ventana);
  }, [seHaMovido, ventana, mirador, cercania]);

  /*
   * ═══ SEGUIR AL QUE MUEVE: SE APAGA AL TOCAR Y SE ENCIENDE AL TURNO SIGUIENTE ═══
   *
   * La cámara persigue al aventurero que anda, y eso es lo que hace que en una mesa
   * de seis se entienda qué acaba de pasar sin buscar el peón. Pero una cámara que
   * se mueve sola mientras alguien está mirando su barrio es imposible de usar: en
   * cuanto la persona gira, acerca o pasea, el seguimiento se apaga PARA ESE
   * RECORRIDO. Y se vuelve a encender cuando cambia el dueño del turno, que es
   * cuando la partida vuelve a pedir la atención de todos.
   *
   * El aviso de que alguien ha tocado es `seHaMovido`, que es lo único que
   * `mirador-tactil.ts` publica a React (cambia dos veces por viaje, no sesenta por
   * segundo). El botón «Ver el burgo entero» lo vuelve a poner en falso, así que un
   * gesto posterior enciende esta rama otra vez.
   */
  const [seguirAlQueMueve, ponerSeguir] = useState(true);
  useEffect(() => {
    if (seHaMovido) ponerSeguir(false);
  }, [seHaMovido]);
  const duenoDelTurno = hoja.marcador.duenoDelTurno;
  const turnoVisto = useRef<string | null>(null);
  useEffect(() => {
    if (turnoVisto.current === duenoDelTurno) return;
    turnoVisto.current = duenoDelTurno;
    ponerSeguir(true);
  }, [duenoDelTurno]);

  /*
   * ═══ LA CALIDAD SE MIDE, NO SE ADIVINA ═══
   *
   * `alMedir` llega una vez por segundo con la media real de milisegundos por
   * fotograma, y el juez es `juzgarCalidad` de `escenas/embarcadero/calidad.ts`: 22
   * ms de media en los primeros 120 fotogramas bajan la escena a `sobria` —sin
   * campo, sin ronda, sin aventurero, sin monedas—. Se juzga UNA vez y no se vuelve
   * a preguntar: una calidad que subiera y bajara haría aparecer y desaparecer
   * árboles cada pocos segundos.
   *
   * Y se mide en TODAS las plataformas. En el Muelle esto sólo corre en Android
   * porque allí la medida se tomó para Android; aquí no hay ninguna decisión por
   * plataforma —`verify:sala` lo vigila— y un portátil viejo con la web abierta
   * merece la misma piedad que un teléfono justo.
   */
  const [calidad, ponerCalidad] = useState<Calidad>('plena');
  const muestras = useRef<MuestraDelHilo[]>([]);
  const yaSeJuzgo = useRef(false);
  const alMedir = useCallback((m: { triangulos: number; llamadas: number; ms: number; fotogramas: number }) => {
    if (yaSeJuzgo.current) return;
    muestras.current.push({ ms: m.ms, fotogramas: m.fotogramas });
    const veredicto = juzgarCalidad(muestras.current);
    if (veredicto === null) return;
    yaSeJuzgo.current = true;
    ponerCalidad(veredicto);
  }, []);

  /*
   * LOS DOS AVISOS DEL CONTRATO. `alEstarListo` llega SIEMPRE y una sola vez —con
   * modelos o sin ellos, con un tope de quince segundos— y es lo único que levanta
   * el telón: sin él, un `traer` que no contesta dejaría la pantalla en negro para
   * siempre. `alFallar` llega una vez por fichero; sólo el del MUNDO manda al
   * retablo, porque sin `dados.glb` la escena pinta el cubo del respaldo y la
   * partida sigue entera. La ruta con la que se distingue sale de
   * `escenas/ruta-de-modelos.ts` y no de una cadena escrita aquí.
   */
  const alEstarListo = useCallback(() => {
    ponerLlegando(false);
  }, []);
  const alFallar = useCallback((motivo: string) => {
    if (motivo.includes(rutaDelBurgo())) ponerElMundoNoLlego(motivo);
    else console.warn(`El Burgo: ${motivo}`);
  }, []);

  /*
   * LA COLA DE SUCESOS. La hoja enseña la vista NUEVA desde el primer fotograma
   * —eso está decidido en el §5.3— mientras el anillo todavía está andando la
   * jugada anterior. Decirlo cuesta una línea y evita la pregunta de por qué el
   * marcador dice una cosa y el tablero otra.
   */
  const [laEscenaVaDetras, ponerLaEscenaVaDetras] = useState(false);
  useEffect(() => {
    if (sucesos.lista.length > 0) ponerLaEscenaVaDetras(true);
  }, [sucesos]);
  const alTerminarLaCola = useCallback(() => {
    ponerLaEscenaVaDetras(false);
  }, []);

  /* ─── Lo que se toca, traducido al movimiento que se manda ─── */

  /**
   * UNA OPCIÓN DE LA HOJA. Se manda LA OPCIÓN ENTERA que dio el juego: montar aquí
   * un `{ tipo, carga }` con la forma de la carga escribiría el movimiento en un
   * segundo sitio, y el segundo no lo comprueba nadie.
   *
   * `laInterfazSeLoQueda()` va LA PRIMERA aunque muchos de estos botones estén
   * debajo del lienzo: los de las hojas modales están ENCIMA, y en el móvil el
   * `WeakSet` de `escenas/camara.ts` no puede casar los dos sucesos —la escena ve
   * el toque de React Native y el gesto el de `gesture-handler`—, así que esto es
   * lo único que impide que el giro le robe el dedo.
   */
  const alElegirOpcion = useCallback(
    (o: OpcionDeMesa) => {
      laInterfazSeLoQueda();
      if (mesa.quieto) return;
      soltarTodo();
      void mesa.mover({ tipo: o.tipo, carga: o.carga });
    },
    [laInterfazSeLoQueda, mesa, soltarTodo],
  );

  /** Un movimiento compuesto por una de las dos puertas (`pujaEnTres.montar`, `tratoEnTres.montar`). */
  const alMandar = useCallback(
    (movimiento: { tipo: string; carga: unknown }) => {
      laInterfazSeLoQueda();
      if (mesa.quieto) return;
      soltarTodo();
      void mesa.mover(movimiento);
    },
    [laInterfazSeLoQueda, mesa, soltarTodo],
  );

  /**
   * SE HA TOCADO UNA CASILLA DEL ANILLO.
   *
   * Con UNA obra posible se manda sin preguntar; con VARIAS se abre la hoja
   * «¿Qué haces en …?»; con NINGUNA se SEÑALA, que es lo que ha cambiado. Es el trato
   * que la traducción pide en su cabecera, y la lista de obras la da
   * `obraPosibleEnCasilla`: aquí no se decide qué se puede hacer en un solar.
   *
   * ═══ SIN OBRAS YA NO SE ABRE UNA CAJA MODAL, SE PONE UN CARTEL ═══
   *
   * Tocar una casilla en la que no hay nada que hacer es la interacción MÁS FRECUENTE
   * de este juego: «¿de quién es?», «¿cuánto cobra hoy?», «¿cuánto le falta a Ana para
   * el barrio?». Abría la tarjeta entera con su velo y su cierre, o sea veinte cajas
   * modales por turno para leer dos renglones. Ahora deja el cartel al pie —dos
   * renglones, sin velo, sin robar el foco, y sin irse hasta que se señale otra— y la
   * tarjeta entera sigue a un toque: el cartel entero es el botón que la abre.
   */
  const alTocarCasilla = useCallback(
    (indice: number) => {
      laInterfazSeLoQueda();
      if (mesa.quieto) return;
      const obras = obraPosibleEnCasilla(laVista, yo, opciones, indice);
      const sola = obras[0];
      if (obras.length === 1 && sola !== undefined) {
        soltarTodo();
        void mesa.mover({ tipo: sola.tipo, carga: sola.carga });
        return;
      }
      if (obras.length > 1) {
        ponerLaCasilla(null);
        ponerElJugador(null);
        ponerLaSenalada(null);
        ponerQueHacesAqui({ casilla: indice, obras });
        return;
      }
      ponerQueHacesAqui(null);
      ponerElJugador(null);
      ponerLaCasilla(null);
      ponerLaSenalada(indice);
    },
    [laInterfazSeLoQueda, mesa, laVista, yo, opciones, soltarTodo],
  );

  /**
   * SE HA PULSADO EL ASA DE LOS DADOS. Se manda TIRAR por la misma puerta que el
   * botón y se le devuelve a la escena cómo acabó, que es lo que corta el rodar en
   * el acto si la mesa no cambió. No se pregunta nada: tirar no gasta nada y no se
   * puede tirar mal. Se vuelve a mirar `quieto` aquí por la carrera entre el toque
   * y la respuesta que acaba de llegar.
   */
  const alTocarLosDados = useCallback((): Promise<ResultadoDelMovimiento> => {
    laInterfazSeLoQueda();
    if (mesa.quieto) return Promise.resolve('rechazado');
    const tirar = tirarEnTres(opciones);
    if (tirar === null) return Promise.resolve('rechazado');
    soltarTodo();
    return mesa.mover({ tipo: tirar.tipo, carga: tirar.carga });
  }, [laInterfazSeLoQueda, mesa, opciones, soltarTodo]);

  /**
   * SE HA TOCADO UN PEÓN. Abre la ficha de ese jugador: lo que tiene, dónde está y
   * la puerta para proponerle un trato. No manda ningún movimiento, así que no mira
   * `quieto`: leer quién va ganando mientras una jugada está en vuelo no rompe nada
   * y es justo cuando más se mira.
   */
  const alTocarFigura = useCallback(
    (asiento: string) => {
      laInterfazSeLoQueda();
      ponerQueHacesAqui(null);
      ponerLaCasilla(null);
      ponerLaSenalada(null);
      ponerElJugador(asiento);
    },
    [laInterfazSeLoQueda],
  );

  /**
   * VOLVER AL BURGO ENTERO. Devuelve la cercanía a la pose de salida —que en
   * apaisado no es el centro— y apaga el seguimiento hasta el turno siguiente:
   * quien pide ver el burgo entero no quiere que la cámara se le vaya detrás del
   * primer peón que ande.
   */
  const verElBurgoEntero = useCallback(() => {
    verElTableroEntero();
    cercania.current = poseDeSalida(ventana);
    mirador.current = MIRADOR_DEL_BURGO;
    ponerSeguir(false);
  }, [verElTableroEntero, cercania, mirador, ventana]);

  /* ─── El pie y el cajón, que son los mismos en las dos ramas ─── */

  /*
   * EL CARTEL DE LA CASILLA SEÑALADA, y no se pinta si hay una hoja abierta encima:
   * las tres hojas son modales y llevan velo, así que un cartel debajo del velo es
   * cromo apagado que sigue ocupando el pie. Las frases las escribe `cartelDeCasilla`
   * y aquí no se redacta ninguna.
   */
  const elCartel =
    laSenalada === null || queHacesAqui !== null || laCasilla !== null || elJugador !== null
      ? null
      : cartelDeCasilla(laVista, laSenalada);

  /*
   * ═══ EL PIE: LO QUE SE VE Y SE PULSA SIN ABRIR NADA ═══
   *
   * Es una función local y no un componente a propósito: no lleva ganchos, así que se
   * puede llamar detrás de los `return` de abajo, y así el pie de la rama del anillo y
   * el del respaldo no pueden separarse el día que alguien retoque uno.
   *
   * El orden es de abajo hacia arriba por urgencia: la CINTA la última, pegada al
   * borde, porque lleva el asa del cajón y es lo que se busca a ciegas con el pulgar;
   * encima el CARRIL, que es lo que hay que pulsar ahora mismo; encima los botones que
   * ningún mueble recogió; encima la CAJA DE LOS TRATOS, que caduca y por eso pide
   * mirada; y arriba del todo el CARTEL de la casilla señalada, que es lo único que no
   * pide nada.
   *
   * Y va con `pointerEvents="box-none"`: el hueco entre los muebles del pie es
   * TABLERO, y tiene que seguir girándose con el dedo. Sin eso, la franja de abajo del
   * anillo dejaría de responder al gesto sin que se viera por qué.
   */
  const elPie = (sueltas: readonly OpcionDeMesa[]): JSX.Element => (
    <View style={[estilos.pieDeLaMesa, { paddingBottom: abajo + 8 }]} pointerEvents="box-none">
      {elCartel === null ? null : (
        <ElCartelDeLaCasilla
          cartel={elCartel}
          alVerLaFicha={() => {
            ponerLaSenalada(null);
            ponerQueHacesAqui(null);
            ponerElJugador(null);
            ponerLaCasilla(elCartel.casilla);
          }}
          alQuitar={() => {
            ponerLaSenalada(null);
          }}
        />
      )}
      {pregon === null ? null : (
        <LaCajaDeLosTratos pregon={pregon} quieto={mesa.quieto} alElegir={alElegirOpcion} />
      )}
      {/* Lo que decide es lo PINTABLE y no lo que llega: ver `hayAlgoQuePintar`. */}
      {hayAlgoQuePintar(sueltas) ? (
        <ScrollView style={estilos.sueltasDelPie} contentContainerStyle={estilos.pilaDelPie}>
          <LasOpciones opciones={sueltas} alTocar={mesa.mover} quieto={mesa.quieto} />
        </ScrollView>
      ) : null}
      <ElCarrilDeLaMesa carril={carril} quieto={mesa.quieto} alElegir={alElegirOpcion} />
      <LaCintaDelBurgo cinta={hoja.cinta} cajonAbierto={cajonAbierto} alAlternarElCajon={alternarElCajon} />
    </View>
  );

  /*
   * EL CAJÓN, con la hoja entera dentro: las ocho secciones y la crónica. Los botones
   * sueltos NO van aquí: con el cajón abierto la criba ya se los da a las secciones,
   * que es donde se leen con su rótulo largo, y con el cajón cerrado están en el pie.
   */
  const elCajon = (): JSX.Element | null =>
    !cajonAbierto ? null : (
      <ElCajonDeLaHoja alCerrar={cerrarElCajon} abajo={abajo}>
        <LaHojaDelBurgo
          hoja={hoja}
          quieto={mesa.quieto}
          abierta={abierta}
          alAbrir={alAbrir}
          alElegir={alElegirOpcion}
          alMandar={alMandar}
          alTocarJugador={alTocarFigura}
          nombreDeCasilla={nombreDeCasilla}
        />
        <LaCronica cronica={cronica} />
      </ElCajonDeLaHoja>
    );

  /* ─── El respaldo: el retablo SVG de siempre, y por qué ─── */

  /*
   * UNA SOLA RAMA DE RESPALDO para tres motivos distintos —la vista que no se ve en
   * tres, el `.glb` que no llega y el lienzo que revienta al pintar—, escrita una
   * vez y con la nota como único parámetro. Copiar el JSX sería tener tres retablos
   * que se separan solos la primera vez que alguien retoque uno.
   *
   * ═══ Y AQUÍ LOS DOS FILTROS SE COMPONEN, QUE ES LO QUE NO PUEDE FALTAR ═══
   *
   * `opcionesSueltas` quita lo que el RETABLO ya pinta —sus acciones y los toques
   * de sus tiras— y `opcionesFueraDelTablero` con el tablero y los dados en `null`
   * quita lo que la HOJA ya pinta. Los dos son filtros y el orden da igual; lo que
   * no da igual es aplicar sólo uno: con el primero solo, la hoja y el pie
   * enseñarían el mismo botón dos veces; con el segundo solo, el retablo y el pie.
   * La regla de la casa es que cada movimiento se enseña exactamente una vez.
   */
  const respaldoSobreElRetablo = (nota: string): JSX.Element => {
    const tablero = tableroDeLaVista(laVista);
    const sinElRetablo = tablero === null ? opciones : opcionesSueltas(tablero, opciones);
    const sueltas = opcionesFueraDelTablero(
      sinElRetablo,
      null,
      null,
      cajonAbierto ? hoja : null,
      pregon,
      carril,
    );
    return (
      <View style={estilos.todo}>
        {/* La misma trampa de foco que la otra rama: las DOS mitades, o una plataforma se escapa. */}
        <View
          style={estilos.debajoDelCajon}
          accessibilityElementsHidden={cajonAbierto}
          importantForAccessibility={cajonAbierto ? 'no-hide-descendants' : 'auto'}
        >
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
            cambio de pincel. Dice el motivo porque «no se ha podido» sin motivo manda
            a adivinar, y el motivo de verdad casi siempre es la cobertura.
          */}
          <Text style={estilos.nota}>{nota}</Text>
          {tablero === null ? null : (
            <View style={estilos.cajaDelRetablo}>
              <Retablo tablero={tablero} alTocar={mesa.mover} quieto={mesa.quieto} />
            </View>
          )}
          {elPie(sueltas)}
        </View>
        {elCajon()}
      </View>
    );
  };

  if (datos === null) {
    /*
     * AQUÍ NO SE PINTA EL ANILLO POR DOS MOTIVOS QUE NO SE PARECEN EN NADA: la
     * vista no es del Burgo —un servidor con otra versión, una mesa de otro juego
     * abierta por enlace— o hay más asientos que peones. `seVeEnTres` distingue los
     * dos, y los dos acaban jugando sobre el retablo: con la vista declarada, el
     * retablo del Burgo son sus cuatro tiras y la partida entera cabe ahí.
     */
    return respaldoSobreElRetablo(
      seVeEnTres(laVista)
        ? NOTA_SIN_ANILLO
        : 'Esta mesa no se puede enseñar en tres dimensiones. Se juega sobre el tablero de siempre.',
    );
  }
  if (elLienzoCayo !== null) {
    return respaldoSobreElRetablo(
      `El burgo en tres dimensiones ha fallado en este aparato (${elLienzoCayo}). Se juega sobre el tablero de siempre.`,
    );
  }
  if (elMundoNoLlego !== null) {
    return respaldoSobreElRetablo(
      `El burgo en tres dimensiones no ha llegado (${elMundoNoLlego}). Se juega sobre el tablero de siempre.`,
    );
  }

  /* ─── La mesa con el anillo ─── */

  const laFicha = laCasilla === null ? null : fichaDeCasilla(laVista, laCasilla, yo, opciones);
  const elDelJugador = elJugador === null ? null : buscarJugador(hoja, elJugador);
  const suDestino = elJugador === null ? null : destinoDelTrato(hoja, elJugador);

  return (
    <View style={estilos.todo}>
      {/*
        ═══ TODO LO QUE QUEDA DEBAJO DEL CAJÓN SE APAGA DE UN GOLPE ═══

        Es la trampa de foco de esta plataforma, y hacen falta LAS DOS mitades:
        `accessibilityElementsHidden` es de iOS y `importantForAccessibility` es de
        Android. Con una sola, en la otra plataforma el lector se sale del cajón y se
        pone a leer el tablero y la barra de la mesa — que es exactamente lo que un
        modal existe para impedir.
      */}
      <View
        style={estilos.debajoDelCajon}
        accessibilityElementsHidden={cajonAbierto}
        importantForAccessibility={cajonAbierto ? 'no-hide-descendants' : 'auto'}
      >
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

        <View style={estilos.cajaDelLienzo}>
          <RedDelLienzo alCaer={ponerElLienzoCayo}>
            <GestureDetector gesture={gesto}>
              {/*
                LA ETIQUETA VA EN LA VISTA QUE SÓLO ENVUELVE EL `Canvas`, y no en la
                caja de fuera: `accessible` agrupa a sus hijos, y la caja tiene también
                las hojas, cuyos botones quedarían fuera del alcance de un lector de
                pantalla justo cuando hay que contestar.
              */}
              <View
                style={estilos.lienzo}
                /*
                  EL NODO DEL LIENZO, para la rueda del ratón. En la web es el elemento
                  del documento donde se apuntan `wheel` y el arrastre con el botón
                  secundario; en nativo se guarda y no se usa.
                */
                ref={apuntarElLienzo}
                onLayout={medir}
                accessible
                accessibilityLabel="El burgo en tres dimensiones. Arrastra con un dedo para girarlo, pellizca para acercarlo y mueve dos dedos para recorrerlo."
                /*
                  TIRAR —Y COMPRAR— PARA QUIEN NO VE EL LIENZO. El botón de tirar se ha
                  ido del pie mientras el asa existe, y un dado que sólo se pueda tocar
                  con el dedo sería el primer movimiento del juego inaccesible: la acción
                  existe mientras exista el asa y se ofrece por la misma puerta.

                  Y por esa misma puerta salen ahora las obras que SÓLO tiene el anillo
                  —comprar y sacar a subasta, que no son de un título mío todavía y por
                  eso no tienen ficha en «Lo mío»—. Sin esto, el movimiento que decide la
                  partida entera sólo se podía hacer con el dedo sobre una escena de tres
                  dimensiones: para un lector de pantalla el lienzo es UN elemento con una
                  etiqueta, no cuarenta casillas. Quién entra en esa lista lo decide
                  `obrasSoloEnElAnillo` mirando lo que ya tiene botón en algún sitio, y no
                  una tabla de tipos que un día se quede corta.
                */
                accessibilityActions={accionesDelLienzo}
                onAccessibilityAction={(e) => {
                  const cual = e.nativeEvent.actionName;
                  if (cual === 'tirar') {
                    void alTocarLosDados();
                    return;
                  }
                  const donde = cual.startsWith('obra:') ? Number.parseInt(cual.slice('obra:'.length), 10) : -1;
                  const obra = soloEnElAnillo[donde];
                  if (obra !== undefined) alElegirOpcion(obra);
                }}
              >
                <Canvas
                  style={estilos.lienzo}
                  gl={{ antialias: true }}
                  dpr={[1, 2]}
                  /*
                   * SIN SOMBRAS EN NINGÚN CLIENTE, y no es una decisión por plataforma:
                   * un mapa de 2048 por lado redibujado cada fotograma baja un móvil de
                   * gama media de sesenta a veinte, y el anillo se lee perfectamente con
                   * los discos de contacto bajo los peones y el aventurero. Es lo mismo
                   * que hace el Muelle.
                   */
                  shadows={false}
                  camera={{ fov: CAMPO_DE_LA_CAMARA, near: 0.5, far: ALCANCE_DEL_BURGO * 16 }}
                  onCreated={({ gl }) => {
                    /* El mismo mapeo tonal que el banco y que el delta: ACES a 1,05. */
                    gl.toneMapping = ACESFilmicToneMapping;
                    gl.toneMappingExposure = 1.05;
                  }}
                >
                  {/*
                    EL OJO VA ANTES QUE `<Burgo>` Y CON PRIORIDAD 0. Ver la cabecera:
                    r3f corre los suscriptores de igual prioridad en orden de montaje,
                    y el seguimiento de la escena mezcla desde la pose que este
                    fotograma acaba de dejar.
                  */}
                  <ElOjoDelBurgo mirador={mirador} cercania={cercania} />
                  <Burgo
                    tablero={datos}
                    dados={dados}
                    sucesos={sucesos}
                    codigo={vista.codigo}
                    ventana={ventana}
                    traer={traer}
                    calidad={calidad}
                    camara={CAMARA_AEREA}
                    seguirAlQueMueve={seguirAlQueMueve}
                    quieto={mesa.quieto}
                    alTocarCasilla={alTocarCasilla}
                    alTocarLosDados={alTocarLosDados}
                    alTocarFigura={alTocarFigura}
                    alEstarListo={alEstarListo}
                    alFallar={alFallar}
                    alMedir={alMedir}
                    alTerminarLaCola={alTerminarLaCola}
                  />
                </Canvas>
              </View>
            </GestureDetector>
          </RedDelLienzo>

          {/*
            EL TELÓN, mientras el mundo no está: suelo con el nombre del juego y una
            línea. Nunca coge toques. Se levanta con `alEstarListo`, que el contrato
            promete SIEMPRE —con modelos, sin ellos o a los quince segundos—, así que
            no hay forma de quedarse debajo para siempre.
          */}
          {llegando ? (
            <View style={estilos.telon} pointerEvents="none">
              <Text style={estilos.lugar}>EL BURGO</Text>
              <Text style={estilos.espera}>Abriendo las puertas…</Text>
            </View>
          ) : null}

          {/*
            LA SALIDA DEL ACERCAMIENTO, Y POR QUÉ ES UN BOTÓN Y NO UN GESTO. Quien se
            acerca a una esquina del anillo y pasea la mirada acaba, tarde o temprano,
            sin saber dónde está: eso es lo que separa un zoom de una trampa. Volver
            tiene que ser algo que SE VE.

            Sólo cuando hace falta: `seHaMovido` es falso mientras se esté como al
            llegar, y entonces un botón para volver a donde ya estás sería ruido encima
            del tablero. Va aquí FUERA del `GestureDetector`, hermano del lienzo y no
            hijo: así se lleva su propio toque sin quitárselo a la escena y queda fuera
            del `accessible` que agrupa el lienzo.

            Arriba a la IZQUIERDA, que es la única esquina que esta pantalla no usa
            para nada: el pie —cinta, carril, caja y cartel— es de abajo, las hojas son
            de abajo y el telón es de todo. Con el lienzo a pantalla entera esa esquina
            sigue libre porque la barra de la mesa NO flota: va en flujo, encima del
            lienzo, y el lienzo empieza donde ella acaba.
          */}
          {!llegando && seHaMovido ? (
            <Pressable
              style={estilos.volver}
              onPress={verElBurgoEntero}
              accessibilityRole="button"
              accessibilityLabel="Ver el burgo entero"
              accessibilityHint="Vuelve a mirar el anillo completo desde el aire, sin cambiar el ángulo"
            >
              <Text style={estilos.volverRotulo}>Ver el burgo entero</Text>
            </Pressable>
          ) : null}

          {/*
            EL PIE, FLOTANDO SOBRE EL LIENZO Y NO DEBAJO DE ÉL. Va dentro de la caja del
            lienzo y con `box-none`, así que el hueco entre sus muebles sigue siendo
            tablero que se gira con el dedo. En la rama del respaldo el mismo `elPie` va
            en FLUJO bajo el retablo, que ahí no hay nada sobre lo que flotar.

            ═══ Y VA ANTES QUE LAS TRES HOJAS, QUE ES UNA DECISIÓN Y NO UN ORDEN ═══

            Aquí no hay `z-index`: en esta plataforma pinta encima el hermano que va
            DESPUÉS. Escrito detrás de las hojas, el pie —la cinta, el carril, la caja de
            los tratos— quedaba por encima del velo de una hoja modal: los botones de
            debajo se verían encendidos y se podrían pulsar con una tarjeta abierta
            delante, que es exactamente lo que un velo existe para impedir. Delante, la
            hoja lo tapa con su velo y lo de debajo se adivina y no se toca.
          */}
          <View style={estilos.pieFlotante} pointerEvents="box-none">
            {/*
              MIENTRAS EL ANILLO SE PONE AL DÍA. La hoja enseña la vista NUEVA desde el
              primer fotograma —está decidido así— y el tablero todavía está andando lo
              anterior. Sin esta línea, el marcador dice una cosa y el tablero otra
              durante ocho segundos y no hay manera de saber cuál va bien.
            */}
            {laEscenaVaDetras ? <Text style={estilos.alDia}>El burgo se está poniendo al día…</Text> : null}
            {elPie(fuera)}
          </View>

          {/*
            LAS TRES HOJAS, HERMANAS DEL `GestureDetector` Y NUNCA DENTRO: un
            `Pressable` dentro del detector le pelea el toque al giro del tablero. Se
            escriben una detrás de otra y no en un `if/else` para que el día que dos
            puedan salir a la vez se vea el solape en pantalla en vez de que una
            desaparezca en silencio; hoy no pueden, porque cada manejador suelta las
            otras dos antes de abrir la suya.
          */}
          {queHacesAqui === null ? null : (
            <LaHojaSobreElLienzo
              titulo={`¿Qué haces en ${nombreDeCasilla(queHacesAqui.casilla)}?`}
              alDejarlo={soltarTodo}
            >
              <LaFichaDeUnaCasilla
                ficha={fichaDeCasilla(laVista, queHacesAqui.casilla, yo, opciones)}
                quieto={mesa.quieto}
                alElegir={alElegirOpcion}
              />
            </LaHojaSobreElLienzo>
          )}

          {laFicha === null ? null : (
            <LaHojaSobreElLienzo titulo={laFicha.rotulo} alDejarlo={soltarTodo}>
              <LaFichaDeUnaCasilla ficha={laFicha} quieto={mesa.quieto} alElegir={alElegirOpcion} />
            </LaHojaSobreElLienzo>
          )}

          {elDelJugador === null ? null : (
            <LaHojaSobreElLienzo titulo={elDelJugador.nombre} alDejarlo={soltarTodo}>
              <LaFichaDelJugador
                jugador={elDelJugador}
                destino={suDestino}
                nombreDeCasilla={nombreDeCasilla}
                alProponerle={
                  suDestino === null
                    ? null
                    : () => {
                        soltarTodo();
                        /*
                          SUBE EL CAJÓN Y ABRE «El trato» DE UNA VEZ. Antes bastaba con
                          abrir la sección porque la hoja estaba siempre en pantalla;
                          desde que vive en un cajón, abrir la sección sola manda al
                          componedor a un sitio que no se ve.
                        */
                        alAbrirEnElCajon('trato');
                      }
                }
              />
            </LaHojaSobreElLienzo>
          )}
        </View>
      </View>
      {elCajon()}
    </View>
  );
}

/** El renglón del marcador de un jugador, o `null` si ya no está en la mesa. */
function buscarJugador(
  hoja: HojaDelBurgo<OpcionDeMesa>,
  asiento: string,
): HojaDelBurgo<OpcionDeMesa>['marcador']['jugadores'][number] | null {
  for (const j of hoja.marcador.jugadores) if (j.asiento === asiento) return j;
  return null;
}

/**
 * Lo que la PUERTA del trato dice de ese jugador, o `null` si el juego no me la
 * abrió para él. No es lo mismo que lo que tenga: un solar con casas no cabe en un
 * trato y por eso no sale en su lista.
 */
function destinoDelTrato(hoja: HojaDelBurgo<OpcionDeMesa>, asiento: string): DestinoDelTrato | null {
  const puerta = hoja.trato?.puerta ?? null;
  if (puerta === null) return null;
  for (const d of puerta.a) if (d.asiento === asiento) return d;
  return null;
}

// ---------------------------------------------------------------------------
// El ojo
// ---------------------------------------------------------------------------

/**
 * EL OJO, CADA FOTOGRAMA: el `Mirador` del gesto, la `Cercania` y la proporción del
 * lienzo, compuestos por `ojoYMira`.
 *
 * ═══ NO SE MIRA AL ORIGEN, Y ÉSA ES LA MITAD DEL ENCARGO ═══
 *
 * Con un `lookAt(0, 0, 0)`, acercarse es acercarse SIEMPRE al centro de la plaza y
 * una esquina del anillo no se puede ver de cerca de ninguna manera. `ojoYMira`
 * mueve el ojo y el punto al que apunta a la vez y devuelve los dos.
 *
 * La composición es la que documentan `escenas/acercar.ts` y `camara-del-burgo.ts`:
 * `ojoDelMirador` se pasa como función y la distancia que recibe ya lleva el
 * acercamiento aplicado; la altura mínima del ojo es la del Burgo. Aquí no se
 * multiplica, no se acota y no se suma nada: si hiciera falta una cuenta más, es
 * una petición para aquellos ficheros —que las miden en Node— y no una línea de
 * aquí. Es la MISMA composición que `poseDelBurgo` escribe para el comprobador, así
 * que lo que `verify:burgo-escena` proyecta es lo que este fotograma pinta.
 *
 * La proporción sale del tamaño del lienzo y no de la pantalla: la corrección de
 * retrato de `camara.ts` (`alejarseParaQueQuepa`) depende de lo ancho que sea el
 * hueco donde se dibuja. Ese hueco ya NO es una fracción —esta línea decía «el 58 %
 * del alto», que era el reparto de cuando la hoja iba debajo y en flujo—: es todo lo
 * que queda bajo la barra de la mesa, y por eso se lee del lienzo y no se calcula aquí.
 *
 * Prioridad 0 —la de r3f por defecto— y montado ANTES de `<Burgo>`: ver la cabecera
 * del fichero. No se le pone niebla desde aquí: la del Burgo es lineal y la escena
 * la monta con su alcance, que es constante.
 */
function ElOjoDelBurgo({
  mirador,
  cercania,
}: {
  mirador: { readonly current: Mirador };
  cercania: { readonly current: Cercania };
}): null {
  const camara = useThree((s) => s.camera);
  const tamano = useThree((s) => s.size);

  useFrame(() => {
    /* Antes de la primera medida el lienzo puede venir a cero: un cero aquí es un `NaN` en la cámara. */
    const proporcion = tamano.width / Math.max(1, tamano.height);
    const { ojo, mira } = ojoYMira(
      cercania.current,
      ALCANCE_DEL_BURGO,
      (d) => ojoDelMirador(mirador.current, d, proporcion),
      ALTURA_MINIMA_DEL_OJO_DEL_BURGO,
    );
    camara.position.set(...ojo);
    camara.lookAt(...mira);
  }, 0);

  return null;
}

// ---------------------------------------------------------------------------

/*
 * Sólo lo que esta pantalla pinta con sus manos: el lienzo, el telón, la nota del
 * respaldo y el botón de volver. Todo lo demás son los estilos del mueble genérico
 * —importados, no copiados— y los de `hojas-del-burgo.tsx`. Ni un color inventado:
 * los de `SALA` y los alfas que `conAlfa` saca de ellos.
 */
const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.suelo },
  /* Todo lo que el cajón tapa: la pantalla entera menos el propio cajón. */
  debajoDelCajon: { flex: 1 },
  /*
   * EL PIE: la pila de muebles que se ve sin abrir nada. No se posiciona él —lo
   * coloca quien lo llama, flotando en la rama del anillo y en flujo en la del
   * respaldo—, y así el MISMO pie sirve para las dos sin dos copias que se separen.
   */
  /*
   * `flexShrink: 1` sólo cuenta en la rama del respaldo, donde el pie va en FLUJO
   * debajo del retablo: ahí, con una subasta abierta y tres tratos vivos a la vez, la
   * pila del pie más el suelo de 200 del retablo pueden pasarse del alto de un
   * teléfono pequeño. Cediendo, quien se encoge son las dos listas de dentro —que ya
   * tienen tope y se desplazan— en vez de irse el retablo fuera de la pantalla.
   * Flotando, encima del lienzo, esto no hace nada.
   */
  pieDeLaMesa: { flexShrink: 1, gap: 8, paddingHorizontal: 12 },
  /*
   * DÓNDE FLOTA EL PIE: pegado al borde de abajo del lienzo, y sólo lo que ocupa. Sin
   * `top`, así que no se estira ni tapa el anillo más de lo que miden sus muebles.
   */
  pieFlotante: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  /*
   * LOS BOTONES QUE NO RECOGIÓ NINGÚN MUEBLE, con tope y desplazables. Con el cajón
   * cerrado aquí caen sobre todo las pujas de una subasta: cuatro botones con su
   * ayuda debajo pasan de 300 puntos y se comerían el anillo entero. Con tope de 180
   * se desplazan por dentro y el tablero se sigue viendo.
   */
  sueltasDelPie: { flexGrow: 0, flexShrink: 1, maxHeight: 180 },
  pilaDelPie: { gap: 8 },
  /* El mismo suelo que el mueble genérico le pone al retablo: por debajo deja de servir. */
  cajaDelRetablo: { flex: 1, minHeight: 200 },
  /*
   * LA CAJA DEL LIENZO: TODO el alto que queda bajo la barra de la mesa, y
   * `overflow: hidden` para que el telón, el pie y las hojas se recorten con ella.
   * Sin fondo propio: el `Canvas` pinta el cielo, y mientras no está, el telón pinta
   * el suelo.
   *
   * Aquí había un alto FIJO —el 58 % de la pantalla, con suelo de 360— porque debajo
   * iba la hoja en flujo y había que repartir. Ya no hay nada debajo: la hoja es un
   * cajón. `flex: 1` no puede encogerse a cero porque es el único hijo que crece de
   * una columna que ya tiene alto, que era lo que aquel suelo evitaba.
   */
  cajaDelLienzo: { flex: 1, width: '100%', overflow: 'hidden' },
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
   * Lo mismo, mientras la cola de sucesos se reproduce, y ya NO va debajo del lienzo:
   * desde que el tablero es la pantalla entera esta línea FLOTA sobre la escena, encima
   * del pie. Por eso lleva caja y antes no: en flujo caía sobre `SALA.suelo` (6,50:1) y
   * ahora cae sobre el campo del burgo, donde el mismo tenue vale 1,12:1. Y se enseña
   * durante toda la cola —hasta ocho segundos—, que es justo cuando explica por qué el
   * marcador dice una cosa y el tablero otra: es la línea que no se puede perder.
   * `alignSelf` para que la caja mida lo que la frase y no el ancho de la pantalla.
   */
  alDia: {
    ...LETRA.cuerpo,
    color: SALA.tenue,
    fontSize: 13,
    lineHeight: 18,
    alignSelf: 'flex-start',
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.teja,
  },
  /*
   * EL BOTÓN DE VOLVER AL BURGO ENTERO: cromo sobre el lienzo, arriba y a la
   * IZQUIERDA, que es la esquina que ni las hojas —de abajo— ni la marca del turno
   * usan. Lleva fondo opaco a propósito: debajo hay cielo, tejados y campo, o sea un
   * fondo que cambia de color con el ángulo, y un rótulo suelto sobre eso no tiene
   * contraste que se pueda medir. Sobre la teja, el blanco de énfasis da de sobra.
   *
   * Y NO LLEVA EL ACENTO. En esta Sala el acento significa «esto es lo que hay que
   * tocar», y un botón de acento permanente encima del tablero competiría cada
   * segundo con las casillas y los dados, que sí lo son. Los 44 de alto son el
   * mínimo de dedo de la casa.
   *
   * EL CUADRADO QUE TAPA NO DESAPARECE, SE MUEVE: acercado del todo el anillo llega
   * de borde a borde, así que este rectángulo es tablero que deja de poder tocarse.
   * Le pasa a cualquier cromo encima de una escena; lo que se elige es qué esquina
   * cuesta menos, y la casilla que quede debajo se saca girando o paseando la
   * mirada, que son dos gestos que ya existen.
   */
  volver: {
    position: 'absolute',
    top: 12,
    left: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.teja,
  },
  volverRotulo: { ...LETRA.rotuloChico, color: SALA.blanco, fontSize: 13 },
});
