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
 * ═══ EL TABLERO SE MIRA DE CERCA, Y ESO SON TRES COSAS Y NO UNA ═══
 *
 * Se entra viendo el delta entero desde el aire y se puede llegar hasta media
 * comarca llenando la pantalla. Eso pide tres piezas que sólo sirven juntas:
 * ACERCARSE (el pellizco, y la rueda donde hay ratón), MOVER LA MIRADA (dos dedos
 * paseando —o el botón secundario—, porque acercarse siempre al centro deja el borde
 * del delta sin poder verse nunca) y VOLVER (un botón que se ve, arriba a la
 * IZQUIERDA, sólo mientras haga falta). Sin la tercera, las otras dos son una trampa:
 * quien se pierde en una esquina no tiene salida.
 *
 * Y el ratón no es un extra: en la web es la ÚNICA mano que llega a este tablero, y
 * mientras el delta se montó sólo en la web fue la única en todas partes. Quién escucha
 * la rueda y por qué está en `mirador-tactil.ts`; aquí lo único que se hace es darle el
 * nodo del lienzo.
 *
 * Las cuentas no están aquí. La `Cercania` la lleva `mirador-tactil.ts` en una
 * referencia y la aritmética entera es de `escenas/acercar.ts`, medida en Node por
 * `verify:escena`. Esta pantalla sólo compone —`ojoYMira`— y pinta el botón.
 *
 * Y LA CÁMARA NO SE RECOLOCA CUANDO CAMBIA LA REVISIÓN DE LA MESA. El acercamiento
 * vive en una referencia que nadie de aquí toca, así que quien está mirando una
 * esquina de cerca se queda donde estaba aunque otro juegue. Una cámara que salta
 * con cada jugada ajena marea y hace imposible construir; es el mismo criterio que
 * el de soltar lo cogido, sólo que al contrario, y por eso se dice.
 *
 * ═══ EL RESPALDO NO ES OPCIONAL ═══
 *
 * Si el modelo no llega —sin cobertura, un servidor viejo que no sirve `.glb`, un
 * aparato que no abre el fichero— se pinta EL RETABLO SVG DE SIEMPRE, con una nota
 * en tenue de por qué. Es lo que hace que la partida se pueda jugar pase lo que
 * pase: una pantalla de partida que depende de que baje un fichero de varios
 * megabytes no es una pantalla de partida, es una demostración.
 *
 * ═══ Y EL MAZO SE PUEDE JUGAR EN LAS DOS RAMAS, QUE ES LA MITAD DEL ENCARGO ═══
 *
 * Con el delta montado, la mano de cartas es la franja de la izquierda de
 * `escenas/cartas.ts`: se coge un naipe, se arrastra a una casilla y se juega o se
 * revela. Sobre el RESPALDO no hay franja ninguna —el retablo es un SVG plano— y las
 * mismas jugadas salen como botones del tablero declarado, con su rótulo y su ayuda.
 * Por eso `opcionesFueraDeLaMano` se compone SÓLO en la rama del delta: aplicarlo
 * también al respaldo dejaría al móvil con las cartas en la mano y sin ninguna
 * manera de jugarlas, sin un error en ninguna parte. Es exactamente el fallo
 * silencioso contra el que la traducción partió aquel filtro en dos, y está escrito
 * en la cabecera de `opcionesFueraDelTablero`.
 *
 * COMPRAR NO ES DE LA MANO —no hay naipe que arrastrar, la carta todavía no es tuya—
 * pero desde este encargo TAMPOCO ES UN BOTÓN cuando hay delta: es el CUARTO HUECO DE
 * LA BARRA, un naipe tapado que se pulsa y abre una confirmación. Se cae del pie por
 * `opcionesFueraDeLaBarra`, que recibe el mazo y no un interruptor, así que el botón
 * desaparece exactamente donde el naipe aparece.
 *
 * Y por eso mismo SOBRE EL RESPALDO SIGUE SIENDO UN BOTÓN, sin una línea que lo diga
 * dos veces: allí no hay barra, `mazoEnLaBarra` no llega a preguntarse nada porque el
 * respaldo no compone ninguno de los tres filtros, y comprar sale como el resto. Lo que
 * cuesta y cuántas quedan lo dice el juego en el rótulo y la ayuda, las dos veces, así
 * que aquí no se redacta.
 *
 * Y EL MARCADOR SE VE SIEMPRE, con el cromo de la mesa y no encima del lienzo: los
 * puntos públicos de cada colono, lo que sólo cuento yo, y cuánto mazo queda. Contar
 * el mazo es parte del juego (§1.3 de `docs/LAS-CARTAS-DE-RIBERAS.md`) y quien va
 * ganando en secreto es lo que hace que las últimas rondas se jueguen distinto (§6).
 *
 * ═══ Y EL MÓVIL NATIVO VE EL MISMO DELTA QUE LA WEB, DESDE QUE EL ATLAS SE COMPILÓ ═══
 *
 * `tablero.glb` lleva la textura EMPOTRADA, y Hermes no decodifica ese PNG. Durante
 * meses en iOS y Android el complemento `texturasLisas` ponía una textura blanca de un
 * píxel para que la carga no reventara entera —que es lo que pasaba con los avatares,
 * y costó días—, la geometría llegaba sin un solo color y esta pantalla mandaba al
 * móvil al retablo con una constante (`EL_DELTA_SE_VE_AQUI`, hoy borrada). No se
 * arregló horneando el color a vértice como `embarcadero.glb`: el tablero pinta biomas
 * y colores de jugador MOVIENDO las UV, y un color fijado en el vértice habría dejado
 * ese tintado sin efecto. Se compiló el atlas a una tabla de bytes
 * (`escenas/atlas-del-tablero.ts`, generado) y el complemento `texturasDelTablero` de
 * `tres/texturas-nativas.ts` lo monta como `DataTexture` con los mismos téxeles que
 * decodifica el navegador. Aquí no queda ninguna decisión por plataforma que mande al
 * retablo: los respaldos que quedan son por fallo de carga, por más de cuatro colonos
 * y por vista sin islas, y son los mismos en los dos clientes. La única diferencia que
 * sigue es la de las sombras, y está en su línea.
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
  bienesQueSeCambianPor,
  colocandoEnTres,
  comprarEnTres,
  esVistaQueSePinta,
  jugadaSinPreguntar,
  jugadasDeLaCarta,
  laManoDeLaIzquierda,
  loQueSeOyeDelVado,
  manoEnTres,
  marcadorEnTres,
  mazoEnLaBarra,
  opcionesFueraDeLaBarra,
  opcionesFueraDeLaMano,
  opcionesFueraDelTablero,
  renglonDelVado,
  revelarDe,
  seVeEnTres,
  tableroEnTres,
  truequesPosibles,
  turnoEnTres,
} from '../../../shared/arcade/juegos/riberas-en-tres';
import type {
  CartaDelMazoEnTres,
  ClaseDeJugada,
  ColocandoEnTres,
  ColonoEnElMarcador,
  IdDeLaBarra,
  JugadaDeCarta,
  MarcadorEnTres,
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
/*
 * LAS DOS MITADES DE LA CÁMARA, Y NINGUNA SE ESCRIBE AQUÍ. `camara.ts` dice desde
 * qué rumbo y qué altura se mira; `acercar.ts`, cuánto se acerca y adónde. Esta
 * pantalla sólo las junta con `ojoYMira`, que es la forma que aquel fichero
 * documenta y que su comprobador ejercita con los topes puestos.
 */
import { ojoYMira } from '../../../escenas/acercar';
import type { Cercania } from '../../../escenas/acercar';
import { ojoDelMirador } from '../../../escenas/camara';
import type { Mirador } from '../../../escenas/camara';
import { catalogoDeModelos } from '../../../escenas/modelos';
import type { CatalogoDeModelos } from '../../../escenas/modelos';
/* La ruta y nada más: importarla de las figuras del embarcadero arrastraba la tabla de aventureros. */
import { rutaDelTablero } from '../../../escenas/ruta-de-modelos';
import type { Sitio } from '../../../escenas/sitios';
import { Canvas } from '../tres/Lienzo';
import { decodificaImagenes, texturasDelTablero } from '../tres/texturas-nativas';
import { apuntarFallo } from '../parte-de-fallos';
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
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
       * el atlas de verdad por su copia compilada, que es lo mismo pero por nada.
       *
       * Y ES EL DEL TABLERO, no el de los avatares: `texturasLisas` contesta con una
       * textura blanca, que en este modelo es un delta sin un solo color. El del
       * tablero contesta con el atlas compilado a bytes. Ver `tres/texturas-nativas.ts`.
       */
      if (!decodificaImagenes()) cargador.register(texturasDelTablero);
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
 * El catálogo como estado de la pantalla. Se pide en cuanto se monta, en las dos
 * plataformas: mientras el móvil jugaba sobre el retablo llevaba un parámetro para no
 * pedir cuatro megas por una escena que no se montaba, y con el atlas compilado esa
 * distinción se fue con la constante que la sostenía.
 */
function usarCatalogoDelTablero(): EstadoDelCatalogo {
  const [estado, ponerEstado] = useState<EstadoDelCatalogo>({ que: 'llegando' });
  useEffect(() => {
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
  }, []);
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
/**
 * LA RED BAJO EL LIENZO: si el delta revienta al PINTAR, se juega sobre el retablo.
 *
 * Los tres respaldos de la pantalla —modelo que no llega, más de cuatro colonos, vista
 * sin islas— se deciden ANTES de montar el `Canvas`. Lo que ninguno recoge es un fallo
 * dentro del propio lienzo: una textura que expo-gl no quiere, un sombreador que no
 * compila en esa GPU, un modelo que se queda sin memoria. La primera vez que el tablero
 * 3D se monta en un teléfono real es la víspera de una partida, y ahí un `throw` en el
 * render no puede costar la partida: se apunta —el parte de fallos lo enseñará al
 * volver a abrir, con su motivo— y la mesa sigue sobre el tablero de siempre.
 *
 * Es una clase porque React no da otra forma de recoger un `throw` de render, y avisa
 * hacia arriba en vez de pintar ella el respaldo porque el respaldo necesita la vista, las
 * opciones y la crónica, que viven en la pantalla.
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
    e.stack = `${e.stack ?? ''}\n— en el lienzo —${info.componentStack ?? ''}`;
    apuntarFallo(e, 'render', false);
    this.props.alCaer(e.message);
  }

  override render(): ReactNode {
    return this.state.cayo ? null : this.props.children;
  }
}

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
  const catalogo = usarCatalogoDelTablero();
  /* Si el lienzo cayó una vez en este aparato, esta pantalla no vuelve a montarlo. */
  const [elLienzoCayo, ponerElLienzoCayo] = useState<string | null>(null);
  const { height: altoDeLaPantalla } = useWindowDimensions();
  const altoDelLienzo = Math.max(ALTO_MINIMO_DEL_LIENZO, Math.round(altoDeLaPantalla * PARTE_DEL_ALTO));

  /*
   * ═══ LO COGIDO VIVE AQUÍ, Y SE SUELTA CUANDO CAMBIA LA MESA ═══
   *
   * `tomada` y `colocando` son la pieza de la barra que se lleva en la mano y los
   * sitios donde las reglas dejan soltarla; `cogida` es la carta de bienes y
   * `cogidaDelMazo` el naipe del mazo. Nada de esto es estado del juego —es dónde
   * tiene el dedo la persona— y por eso vive en la pantalla y no viaja. Y en cuanto
   * la revisión de la mesa cambia se suelta todo: los sitios que valían con la
   * revisión anterior pueden no valer con ésta, y una pieza en la mano con anillos
   * rancios es una mentira con forma de anillo. Con las cartas es lo mismo y peor:
   * una jugada que se preguntó con las opciones de antes se manda con una opción que
   * el servidor ya no ofrece.
   *
   * LAS DOS MANOS NO PUEDEN ESTAR COGIDAS A LA VEZ, y eso lo sostiene esta pantalla
   * y no la geometría: `escenas/cartas.ts` mide su franja contra las áreas de trueque
   * dando por hecho que coger un naipe suelta el bien y al revés, y lo deja dicho.
   * Cada uno de los tres manejadores de coger suelta lo de los otros dos.
   */
  const [tomada, ponerTomada] = useState<IdDeLaBarra | null>(null);
  const [colocando, ponerColocando] = useState<ColocandoEnTres | null>(null);
  const [cogida, ponerCogida] = useState<string | null>(null);
  const [cogidaDelMazo, ponerCogidaDelMazo] = useState<string | null>(null);
  const [aQuien, ponerAQuien] = useState<readonly TruequePosible<OpcionDeMesa>[] | null>(null);
  const [comoJugarla, ponerComoJugarla] = useState<LaCartaYSusJugadas | null>(null);
  /* La opción de comprar que se está confirmando. La ENTERA, no un `true`: ver `alPulsarElMazo`. */
  const [comprando, ponerComprando] = useState<OpcionDeMesa | null>(null);
  const soltarTodo = useCallback(() => {
    ponerTomada(null);
    ponerColocando(null);
    ponerCogida(null);
    ponerCogidaDelMazo(null);
    ponerAQuien(null);
    ponerComoJugarla(null);
    ponerComprando(null);
  }, []);
  useEffect(() => {
    soltarTodo();
  }, [vista.rev, soltarTodo]);

  const [medida, ponerMedida] = useState({ ancho: 0, alto: 0 });
  const medir = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    ponerMedida({ ancho: width, alto: height });
  }, []);

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
        : bienesQueSeCambianPor(laVista, opciones, cartaCogida.bien),
    [laVista, opciones, cartaCogida],
  );
  /*
   * LA MANO DE LA IZQUIERDA: mis premios delante y mis cartas del mazo detrás, compuesta
   * en `shared/` y no aquí. Si cada cliente la compusiera, el día que uno de los dos se
   * olvidara de los premios el fallo sería justo el que se estaba arreglando —el premio
   * que no aparece— pero sólo en una de las dos pantallas.
   */
  const cartasDelMazo = useMemo(
    () => laManoDeLaIzquierda(laVista, opciones, yo),
    [laVista, opciones, yo],
  );
  const marcador = useMemo(() => marcadorEnTres(laVista), [laVista]);
  /*
   * EL TAPETE DEL TURNO: el color de quien juega, leído de la vista por `shared/`. Sin
   * esto la mesa salía sin tapete en la partida —la entrada de `<Delta>` es opcional y no
   * se caía nada— y con él sólo en el banco.
   */
  const turnoDe = useMemo(() => turnoEnTres(laVista), [laVista]);
  /*
   * EL CUARTO HUECO DE LA BARRA: el mazo. Apagado con algo en vuelo, igual que las tres
   * piezas; apagado y no quitado, porque la barra reparte CENTRADO y un hueco que va y
   * viene corre las otras tres de sitio en cada jugada.
   */
  const mazo = useMemo(() => {
    const suyo = mazoEnLaBarra(laVista, yo, opciones);
    return suyo === null || !mesa.quieto ? suyo : { disponible: false };
  }, [laVista, yo, opciones, mesa.quieto]);
  /*
   * LOS BOTONES DEL PIE CUANDO LA MANO SE PINTA: los TRES filtros compuestos, y en ese
   * orden da igual porque los tres son filtros. Lo que queda es tirar, pasar, contestar
   * tratos y empezar.
   *
   * COMPRAR YA NO ESTÁ, y es lo único que cambia respecto de ayer: se ofrece pulsando el
   * naipe del mazo en la barra, y dejarlo además como botón sería ofrecer el mismo
   * movimiento dos veces en la misma pantalla. Se cae por `opcionesFueraDeLaBarra`, que
   * recibe EL MAZO y no un interruptor: donde no hay hueco de mazo el botón se queda, y
   * eso es exactamente lo que salva al RESPALDO —que no tiene barra ninguna— de quedarse
   * sin manera de comprar en toda la partida. Esta composición vale sólo para la rama del
   * delta; el respaldo usa las opciones sin tocar, y por qué está en la cabecera.
   */
  const fueraDelTablero = useMemo(
    () => opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), mazo),
    [opciones, mazo],
  );

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

  /*
   * EL GESTO VA DETRÁS DEL ENCUADRE PORQUE NECESITA EL ALCANCE, y no al revés.
   * Pasear la mirada se mide en pantallas de MUNDO —cruzar el lienzo con dos dedos
   * mueve una pantalla de delta, de cerca y de lejos—, así que `arrastrandoLaMirada`
   * pide el radio del delta. Mientras no hay islas repartidas todavía no hay radio:
   * va un cero, que `acercar.ts` acota solo. Sigue siendo un gancho sin condiciones
   * y por delante de todos los `return`, que es la regla que lee `verify:app`.
   */
  const {
    gesto,
    apuntarElLienzo,
    mirador,
    cercania,
    seHaMovido,
    verElTableroEntero,
    laInterfazSeLoQueda,
  } = usarMiradorTactil(medida, encuadre?.alcance ?? 0);

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
      ponerCogidaDelMazo(null);
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
      ponerCogidaDelMazo(null);
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
        cartaCogida.bien,
        bienDeLaEscena,
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

  /* ─── Y lo mismo con el mazo: coger, jugar, revelar ─── */

  const alCogerCartaDelMazo = useCallback(
    (carta: { id: string }) => {
      laInterfazSeLoQueda();
      if (mesa.quieto) return;
      /* Coger un naipe suelta la pieza de la barra y el bien: las dos manos son una. */
      ponerTomada(null);
      ponerColocando(null);
      ponerCogida(null);
      ponerCogidaDelMazo((antes) => (antes === carta.id ? null : carta.id));
    },
    [laInterfazSeLoQueda, mesa.quieto],
  );

  /**
   * SE HA SOLTADO UN NAIPE EN LA CASILLA DE JUGAR.
   *
   * Si sólo hay una manera de jugarlo se manda sin preguntar —Las Dos Veredas
   * siempre, y La Guardia en una mesa de dos, donde no hay a quién elegir—; si hay
   * varias se abre la hoja. Es el mismo trato que la traducción pide para las ofertas
   * y está escrito en `jugadaSinPreguntar`: con una sola, mandar; con varias,
   * preguntar; con ninguna, no mandar nada por nuestra cuenta.
   *
   * Y lo que viaja es la OPCIÓN ENTERA que dio el juego. Aquí no se monta un
   * `{ tipo, carga }` con el seudónimo y el bien: montarlo escribiría la forma del
   * movimiento en un segundo sitio, y el segundo no lo comprueba nadie.
   */
  const alJugarCarta = useCallback(
    (carta: CartaDelMazoEnTres) => {
      if (mesa.quieto) return;
      const sola = jugadaSinPreguntar(laVista, opciones, carta.id);
      if (sola !== null) {
        ponerCogidaDelMazo(null);
        mesa.mover({ tipo: sola.opcion.tipo, carga: sola.opcion.carga });
        return;
      }
      const todas = jugadasDeLaCarta(laVista, opciones, carta.id);
      if (todas.length === 0) return;
      ponerComoJugarla({ carta, jugadas: todas });
    },
    [mesa, laVista, opciones],
  );

  /**
   * SE HA PULSADO EL NAIPE DEL MAZO: se pregunta, SIEMPRE.
   *
   * ═══ OJO, ESTO SE APARTA A PROPÓSITO DE LA REGLA DE LA CASA ═══
   *
   * `jugadaSinPreguntar` y `truequesPosibles` llevan escrito lo contrario, y está dicho
   * dos funciones más arriba: si sale una sola manera, se manda sin preguntar. Comprar
   * ofrece siempre exactamente una, así que por esa regla iría derecha al servidor sin un
   * solo diálogo. Y NO ES LO QUE SE QUIERE.
   *
   * Aquellas dos se disparan al SOLTAR algo encima de una casilla —un gesto largo, con
   * puntería, del que nadie sale por descuido—; ésta se dispara al TOCAR un naipe que vive
   * pegado a las tres piezas de construir, abajo, donde el pulgar ya está apoyado para
   * girar el tablero. Un roce gastaría sal, piedra y grano, y comprar no se deshace.
   *
   * Así que aquí se confirma aunque la opción sea única. Quien lea esto y lo vea como una
   * incoherencia que «arreglar»: no lo es, y el día que se «arregle» el fallo será una
   * compra que nadie pidió.
   *
   * `laInterfazSeLoQueda()` va LA PRIMERA, igual que al coger una pieza o un naipe: en el
   * móvil el `WeakSet` de `escenas/camara.ts` no puede casar los dos sucesos —la escena ve
   * el toque de React Native y el gesto el de `gesture-handler`— y esto es lo único que
   * impide que el giro le robe el dedo. Ver `mirador-tactil.ts`.
   */
  const alPulsarElMazo = useCallback(() => {
    laInterfazSeLoQueda();
    if (mesa.quieto) return;
    const comprar = comprarEnTres(opciones);
    if (comprar === null) return;
    /* Pulsar el mazo suelta las dos manos: no puede haber dos preguntas abiertas. */
    ponerTomada(null);
    ponerColocando(null);
    ponerCogida(null);
    ponerCogidaDelMazo(null);
    ponerComprando(comprar);
  }, [laInterfazSeLoQueda, mesa.quieto, opciones]);

  /**
   * SE HA CONFIRMADO LA COMPRA. Se manda la opción ENTERA que dio el juego, como en las
   * otras dos hojas: montar aquí un `{ tipo, carga }` escribiría la forma del movimiento
   * en un segundo sitio, y el segundo no lo comprueba nadie.
   */
  const alConfirmarLaCompra = useCallback(() => {
    const comprar = comprando;
    ponerComprando(null);
    if (mesa.quieto || comprar === null) return;
    mesa.mover({ tipo: comprar.tipo, carga: comprar.carga });
  }, [mesa, comprando]);

  const alElegirJugada = useCallback(
    (j: JugadaDeCarta<OpcionDeMesa>) => {
      ponerComoJugarla(null);
      ponerCogidaDelMazo(null);
      if (mesa.quieto) return;
      mesa.mover({ tipo: j.opcion.tipo, carga: j.opcion.carga });
    },
    [mesa],
  );

  /**
   * SE HA SOLTADO UN TÍTULO EN LA CASILLA DE REVELAR.
   *
   * Revelar no pregunta nada —no tiene destinatario ni bienes—, así que no hay hoja:
   * la opción entera ES la respuesta. Que la carta sea de verdad un título lo
   * comprueban las reglas al no ofrecer `REVELAR` de nada más y la escena otra vez en
   * `puertasDeLaCarta`, que no abre esta casilla a lo que no sea un título. Aquí,
   * tercer cinturón: sin opción no se manda nada.
   */
  const alRevelarCarta = useCallback(
    (carta: CartaDelMazoEnTres) => {
      if (mesa.quieto) return;
      const revelar = revelarDe(opciones, carta.id);
      if (revelar === null) return;
      ponerCogidaDelMazo(null);
      mesa.mover({ tipo: revelar.tipo, carga: revelar.carga });
    },
    [mesa, opciones],
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
          EL MARCADOR TAMBIÉN AQUÍ, y no es una copia por comodidad: ésta es la rama
          que ve una mesa de cinco o seis durante la partida entera, y la que ve
          cualquiera al que el modelo no le llegue; un marcador que sólo saliera con el
          delta los dejaría a todos sin saber quién va ganando. (Y durante meses fue
          la rama que veía TODO el móvil, hasta que el atlas se compiló para él.)
        */}
        <ElMarcador marcador={marcador} />
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

  if (datos === null || encuadre === null) {
    /*
     * AQUÍ NO SE PINTA EL DELTA POR DOS MOTIVOS QUE NO SE PARECEN EN NADA, y los
     * dos acaban en el mismo sitio con distinta frase:
     *
     *   · las islas no están repartidas todavía y la mesa se está reuniendo;
     *   · hay cinco o seis colonos y el atlas sólo trae cuatro colores de jugador,
     *     así que `tableroEnTres` devuelve `null` AUNQUE HAYA ISLAS.
     *
     * Hubo un tercero —estar en el móvil, donde el modelo salía gris— y se fue el día
     * que el atlas se compiló para él (ver la cabecera). NINGUNA DECISIÓN DE ESTA RAMA
     * MIRA LA PLATAFORMA, y `verify:sala` lo vigila: las dos plataformas juegan sobre
     * lo mismo por los mismos motivos.
     *
     * Decidir sólo con `datos === null` enseñaba a una mesa de cinco ya empezada
     * decenas de botones «Fundar aquí» y ningún tablero. Con islas se juega SIEMPRE
     * sobre algo: aquí, sobre el retablo.
     */
    const hayIslas = esVistaQueSePinta(laVista) && laVista.islas.length > 0;
    if (hayIslas) {
      return respaldoSobreElRetablo(
        seVeEnTres(laVista)
          ? 'El delta en tres dimensiones no ha podido leer esta mesa. Se juega sobre el tablero de siempre.'
          : NOTA_DE_MAS_DE_CUATRO,
      );
    }
    /*
     * Y AQUÍ NO VA EL MARCADOR, a sabiendas: sin islas repartidas no hay partida que
     * marcar. Todos a cero puntos, el mazo entero y ni una carta en ninguna mano es
     * una cinta que ocupa un alto para no decir nada, justo en la pantalla donde lo
     * único que importa es quién falta por sentarse. Sale en cuanto hay tablero, que
     * es en las otras dos ramas.
     */
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

  if (elLienzoCayo !== null) {
    return respaldoSobreElRetablo(
      `El delta en tres dimensiones ha fallado en este aparato (${elLienzoCayo}). Se juega sobre el tablero de siempre.`,
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
      {/*
        EL MARCADOR VA CON EL CROMO DE LA MESA Y NO ENCIMA DEL LIENZO. Es lo que se
        mira ANTES de decidir —quién va ganando, cuánto mazo queda—, no mientras se
        arrastra una pieza, y un panel flotante sobre el delta taparía tablero que se
        toca justo cuando hace falta tocarlo. El lienzo mide lo mismo que antes: esta
        franja se lleva su alto del pie, que es el que cede.
      */}
      <ElMarcador marcador={marcador} />

      <View style={[estilos.cajaDelLienzo, { height: altoDelLienzo }]}>
        {catalogo.que === 'listo' ? (
          <RedDelLienzo alCaer={ponerElLienzoCayo}>
          <GestureDetector gesture={gesto}>
            {/*
              LA ETIQUETA VA EN LA VISTA QUE SÓLO ENVUELVE EL `Canvas`, y no en la
              caja de fuera: `accessible` agrupa a sus hijos, y la caja tiene también
              la hoja de «¿a quién?», cuyos botones quedarían fuera del alcance de
              un lector de pantalla justo cuando hay que contestar.
            */}
            <View
              style={estilos.lienzo}
              /*
                EL NODO DEL LIENZO, para la rueda del ratón. En la web es el elemento
                del documento donde se apuntan `wheel` y el arrastre con el botón
                secundario; en nativo se guarda y no se usa. Va aquí y no en la caja de
                fuera porque la rueda tiene que pararse encima DEL TABLERO y no encima
                de la hoja de «¿a quién?», que sí se desplaza si algún día crece.
              */
              ref={apuntarElLienzo}
              onLayout={medir}
              accessible
              accessibilityLabel="El delta de Riberas en tres dimensiones. Arrastra con un dedo para girarlo, pellizca para acercarlo y mueve dos dedos para recorrerlo."
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
                <Ojo mirador={mirador} cercania={cercania} alcance={alcance} />
                <Delta
                  datos={datos}
                  modelos={catalogo.modelos}
                  semilla={semilla}
                  colocando={colocando}
                  onElegirSitio={alElegirSitio}
                  barra={barra}
                  tomada={tomada}
                  onTomarDeLaBarra={alTomarDeLaBarra}
                  mazo={mazo}
                  onPulsarElMazo={alPulsarElMazo}
                  turnoDe={turnoDe}
                  mano={mano}
                  cogida={cogida}
                  onCogerCarta={alCogerCarta}
                  seCambianPor={seCambianPor}
                  onProponerTrueque={alProponerTrueque}
                  cartasDelMazo={cartasDelMazo}
                  cartaDelMazoCogida={cogidaDelMazo}
                  onCogerCartaDelMazo={alCogerCartaDelMazo}
                  onJugarCarta={alJugarCarta}
                  onRevelarCarta={alRevelarCarta}
                />
              </Canvas>
            </View>
          </GestureDetector>
          </RedDelLienzo>
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

        {/*
          LA SALIDA DEL ACERCAMIENTO, Y POR QUÉ ES UN BOTÓN Y NO UN GESTO.
          Quien se acerca a una esquina del delta y pasea la mirada acaba, tarde o
          temprano, sin saber dónde está: eso es lo que separa un zoom de una
          trampa. Volver tiene que ser algo que SE VE, no un pellizco al revés que
          hay que adivinar ni una tecla que en un móvil no existe.

          Sólo cuando hace falta: `seHaMovido` es falso mientras se esté como al
          llegar, y entonces un botón para volver a donde ya estás sería ruido
          encima del tablero. Y va aquí fuera del `GestureDetector`, hermano del
          lienzo y no hijo: así se lleva su propio toque sin quitárselo a la escena
          —un `Pressable` sólo atiende lo que cae encima de él— y queda fuera del
          `accessible` que agrupa el lienzo, para que el lector de pantalla lo
          anuncie como lo que es.

          EL RÓTULO SE VE CORTO Y SE OYE ENTERO. En pantalla pone «Tablero entero»,
          que es lo que hace falta leer con el tablero delante; el nombre accesible
          sigue siendo la frase completa, y contiene al rótulo palabra por palabra,
          que es lo que pide poder decirlo en voz alta para pulsarlo. Lo que se gana
          son unos sesenta puntos de ancho, y ese ancho es cuadrado de tablero que
          deja de poder tocarse: ver la cabecera del estilo.
        */}
        {catalogo.que === 'listo' && seHaMovido ? (
          <Pressable
            style={estilos.volver}
            onPress={verElTableroEntero}
            accessibilityRole="button"
            accessibilityLabel="Ver el tablero entero"
            accessibilityHint="Vuelve a mirar el delta completo desde el aire, sin cambiar el ángulo"
          >
            <Text style={estilos.volverRotulo}>Tablero entero</Text>
          </Pressable>
        ) : null}

        {aQuien !== null ? <HojaDeAQuien posibles={aQuien} alElegir={alElegirAQuien} alDejarlo={soltarTodo} /> : null}

        {/*
          LAS DOS HOJAS NO SALEN JUNTAS JAMÁS, porque para abrir una hay que haber
          cogido algo de una mano y coger de una suelta la otra. Se escriben una
          detrás de otra y no en un `if/else` para que el día que eso deje de ser
          verdad —una hoja nueva, otra mano— se vea el solape en pantalla en vez de
          que una de las dos desaparezca en silencio.
        */}
        {comoJugarla !== null ? (
          <HojaDeLaCarta
            carta={comoJugarla.carta}
            jugadas={comoJugarla.jugadas}
            alElegir={alElegirJugada}
            alDejarlo={soltarTodo}
          />
        ) : null}

        {/*
          Y LA TERCERA, la de confirmar la compra. Va aquí, hermana de las otras dos y
          FUERA del `GestureDetector`, por la misma razón que ellas: un `Pressable` dentro
          del detector le pelea el toque al giro del tablero.
        */}
        {comprando !== null ? (
          <HojaDeComprar
            comprar={comprando}
            alConfirmar={alConfirmarLaCompra}
            alDejarlo={soltarTodo}
          />
        ) : null}
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
 * El ojo, cada fotograma: el `Mirador` del gesto, la `Cercania` y la proporción del
 * lienzo.
 *
 * ═══ NO SE MIRA AL ORIGEN, Y ÉSA ES LA MITAD DEL ENCARGO ═══
 *
 * Aquí había un `lookAt(0, 0, 0)`: se mirara desde donde se mirara, se miraba al
 * centro del delta. Con eso, acercarse es acercarse SIEMPRE a lo mismo y el borde de
 * la comarca del canto no se puede ver de cerca de ninguna manera. `ojoYMira` mueve
 * las dos cosas a la vez —el ojo y el punto al que apunta— y devuelve las dos, así
 * que la cámara mira a `mira` y no al origen.
 *
 * La composición es la que documenta `escenas/acercar.ts`: `ojoDelMirador` se pasa
 * como función, y la distancia que recibe ya lleva el acercamiento aplicado. Aquí no
 * se multiplica, no se acota y no se suma nada: si hiciera falta una cuenta más, es
 * una petición para aquel fichero —que la mide en Node— y no una línea de aquí.
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
 * del cielo, que es exactamente el fallo que el banco corrigió una vez.
 *
 * ═══ Y LA NIEBLA SE MIDE DEL OJO AL PUNTO DE MIRA, NO DEL OJO AL ORIGEN ═══
 *
 * Aquí se medía con el módulo de la posición del ojo, y eso SÓLO vale mirando al
 * centro. En cuanto la mirada se aparta —que es la mitad del encargo— el ojo se va
 * con ella: a media comarca del canto, su módulo desde el origen es casi el radio
 * del delta aunque esté a tres palmos de lo que mira, y la niebla empezaría por
 * detrás de todo. Lo que gobierna la niebla es lo lejos que está lo que se está
 * MIRANDO, así que la distancia se toma del ojo a `mira`, y la mide `three` con su
 * propia geometría: no es una cuenta de cámara escrita a mano.
 */
function Ojo({
  mirador,
  cercania,
  alcance,
}: {
  mirador: { readonly current: Mirador };
  cercania: { readonly current: Cercania };
  alcance: number;
}): null {
  const camara = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const tamano = useThree((s) => s.size);
  const escena = useThree((s) => s.scene);
  /* Un solo vector, reaprovechado: sesenta veces por segundo, no se fabrica basura. */
  const alQueMira = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const m = mirador.current;
    /* Antes de la primera medida el lienzo puede venir a cero: un cero aquí es un `NaN` en la cámara. */
    const proporcion = tamano.width / Math.max(1, tamano.height);
    const { ojo, mira } = ojoYMira(cercania.current, alcance, (d) =>
      ojoDelMirador(m, d, proporcion),
    );
    camara.position.set(...ojo);
    camara.lookAt(...mira);

    const niebla = escena.fog;
    if (niebla instanceof THREE.Fog) {
      const distancia = camara.position.distanceTo(alQueMira.set(...mira));
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
// La hoja de «¿cómo la juegas?»
// ---------------------------------------------------------------------------

/** El naipe que se acaba de soltar en la casilla de jugar, y las maneras que hay. */
interface LaCartaYSusJugadas {
  readonly carta: CartaDelMazoEnTres;
  readonly jugadas: readonly JugadaDeCarta<OpcionDeMesa>[];
}

/**
 * LO QUE FALTA POR DECIR DE UNA CARTA, y son tres preguntas distintas.
 *
 * La guardia pide a quién se le roba, el año bueno qué dos bienes se cogen y el
 * acaparamiento cuál se pide. Las Dos Veredas no pide nada y por eso nunca llega
 * aquí: `jugadaSinPreguntar` la manda sola.
 *
 * La tabla está aquí y no en la traducción porque estas cuatro frases son de esta
 * pantalla: son el encabezado de una hoja, no una regla. Lo que sí es del juego —el
 * rótulo de cada botón— llega en `JugadaDeCarta.rotulo` y se pinta tal cual.
 *
 * La cuarta entrada existe para que el compilador exija las cuatro clases: si mañana
 * `ClaseDeJugada` crece, esto no compila en vez de enseñar una hoja sin pregunta.
 */
const PREGUNTA_DE_LA_JUGADA: Readonly<Record<ClaseDeJugada, string>> = {
  guardia: '¿A quién le robas?',
  anobueno: '¿Qué dos bienes coges?',
  acaparamiento: '¿Qué bien pides?',
  dosveredas: '¿Cómo la juegas?',
};

/**
 * CÓMO SE JUEGA ESTA CARTA, cuando hay más de una manera.
 *
 * La misma hoja pequeña que la de «¿a quién?» y con sus mismos estilos, porque es la
 * misma clase de cosa: una pregunta de un toque que no puede llevarse el tablero de
 * delante. Lo que cambia es que la lista SE DESPLAZA, y hace falta: El Año Bueno
 * ofrece quince pares —los quince del §2 del diseño— y quince botones de 44 no caben
 * en ninguna pantalla de móvil. Sin el tope, los últimos pares quedarían recortados
 * por el `overflow: hidden` de la caja del lienzo y no habría manera de llegar a
 * ellos: una carta a la que le faltan jugadas y ni un error en ninguna parte.
 */
function HojaDeLaCarta({
  carta,
  jugadas,
  alElegir,
  alDejarlo,
}: {
  carta: CartaDelMazoEnTres;
  jugadas: readonly JugadaDeCarta<OpcionDeMesa>[];
  alElegir: (j: JugadaDeCarta<OpcionDeMesa>) => void;
  alDejarlo: () => void;
}): JSX.Element {
  const clase = jugadas[0]?.clase;
  return (
    <View style={estilos.hoja} accessibilityViewIsModal>
      <Text style={estilos.hojaRotulo}>
        {clase === undefined ? '¿Cómo la juegas?' : PREGUNTA_DE_LA_JUGADA[clase]}
      </Text>
      <Text style={estilos.hojaTexto}>{carta.nombre}</Text>
      <ScrollView style={estilos.hojaLista} contentContainerStyle={estilos.hojaListaDentro}>
        {jugadas.map((j) => (
          /*
            EL RÓTULO ES EL DEL JUEGO, TAL CUAL, como en `LasOpciones`: esta pantalla
            no sabe cómo se llama un bien ni cómo se lee un par, y redactarlo aquí
            sería escribir vocabulario de Riberas en el cliente.
          */
          <Pressable
            key={j.opcion.id}
            style={estilos.hojaBoton}
            onPress={() => alElegir(j)}
            accessibilityRole="button"
            accessibilityLabel={j.rotulo}
            accessibilityHint={j.opcion.ayuda.length > 0 ? j.opcion.ayuda : undefined}
          >
            <Text style={estilos.hojaBotonRotulo}>{j.rotulo}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        style={estilos.hojaDejarlo}
        onPress={alDejarlo}
        accessibilityRole="button"
        accessibilityLabel="Dejarlo, sin jugar la carta"
      >
        <Text style={estilos.hojaDejarloRotulo}>Dejarlo</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// La hoja de «¿compras una carta?»
// ---------------------------------------------------------------------------

/**
 * CONFIRMAR LA COMPRA, con la misma hoja pequeña que las otras dos.
 *
 * ═══ POR QUÉ HAY HOJA SI SÓLO HAY UNA OPCIÓN ═══
 *
 * Porque no se pregunta CUÁL, se pregunta SI. Las otras dos hojas sólo salen cuando hay
 * más de una manera —con una sola, `jugadaSinPreguntar` la manda derecha— y aquí es al
 * revés a propósito: comprar se ofrece pulsando un naipe que vive en la barra de abajo,
 * pegado a las tres piezas de construir y justo donde el pulgar se apoya para girar el
 * tablero. Un roce gasta sal, piedra y grano, y comprar no se deshace. Está contado entero
 * en `alPulsarElMazo`, y NO es un despiste que alguien deba alinear con la otra regla.
 *
 * ═══ Y NO SE REDACTA NI UNA PALABRA DE LA JUGADA ═══
 *
 * El rótulo del botón es `opcion.rotulo` y debajo va `opcion.ayuda`, tal cual, como en
 * `LasOpciones`: lo que cuesta una carta y cuántas quedan son reglas de Riberas y las
 * escribe el juego. Esta pantalla no sabe qué es la sal. Lo único de la casa es el
 * encabezado y el «Dejarlo», que son cromo de la Sala igual que en las otras dos hojas.
 */
function HojaDeComprar({
  comprar,
  alConfirmar,
  alDejarlo,
}: {
  comprar: OpcionDeMesa;
  alConfirmar: () => void;
  alDejarlo: () => void;
}): JSX.Element {
  return (
    <View style={estilos.hoja} accessibilityViewIsModal>
      <Text style={estilos.hojaRotulo}>¿Compras una carta?</Text>
      {comprar.ayuda.length > 0 ? (
        <Text style={estilos.hojaTexto}>{comprar.ayuda}</Text>
      ) : null}
      <Pressable
        style={estilos.hojaBoton}
        onPress={alConfirmar}
        accessibilityRole="button"
        accessibilityLabel={comprar.rotulo}
        accessibilityHint={comprar.ayuda.length > 0 ? comprar.ayuda : undefined}
      >
        <Text style={estilos.hojaBotonRotulo}>{comprar.rotulo}</Text>
      </Pressable>
      <Pressable
        style={estilos.hojaDejarlo}
        onPress={alDejarlo}
        accessibilityRole="button"
        accessibilityLabel="Dejarlo, sin comprar nada"
      >
        <Text style={estilos.hojaDejarloRotulo}>Dejarlo</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// El marcador
// ---------------------------------------------------------------------------

/**
 * LOS PUNTOS DE CADA COLONO Y LO QUE QUEDA DE MAZO, que el §4 y el §5 del diseño
 * mandan que se vean SIEMPRE.
 *
 * ═══ EL NÚMERO GRANDE SIGNIFICA LO MISMO EN LAS CUATRO FICHAS ═══
 *
 * Es el PÚBLICO, el de todos, el mío incluido. Poner en mi ficha el total con los
 * títulos ocultos dentro habría sido más halagador y habría hecho que dos números en
 * la misma fila, del mismo tamaño y en la misma columna, significaran cosas
 * distintas: los demás lo compararían con el suyo y estarían comparando peras con
 * manzanas. Lo que sólo cuento yo va DEBAJO y en otra letra, sumando desde el
 * público, que es como se lee «voy por catorce, y dos no los sabe nadie».
 *
 * Y sólo aparece cuando hay algo que decir: sin títulos guardados,
 * `puntosConLoOculto` vale lo mismo que `puntos` y ahí no hay ningún secreto que
 * anunciar. La traducción manda `null` en las fichas ajenas —«de éste no lo sé»— y
 * por eso aquí no hay manera de escribir un segundo número de otro ni por descuido.
 *
 * ═══ Y SE DESPLAZA A LO ANCHO, QUE ES LO QUE NO SE COME EL LIENZO ═══
 *
 * Cuatro colonos y el mazo no caben en el ancho de un móvil de pie sin encoger cada
 * ficha hasta que la cifra deje de leerse. En columna cabrían, pero cinco filas por
 * encima del tablero son un tercio de la pantalla; una cinta que se recorre con el
 * dedo cuesta un alto y ninguno más. Las fichas no se reordenan nunca —van por
 * asiento— para que la propia se busque por el sitio y no leyendo los nombres.
 */
function ElMarcador({ marcador }: { marcador: MarcadorEnTres | null }): JSX.Element | null {
  if (marcador === null || marcador.colonos.length === 0) return null;
  return (
    <ScrollView
      horizontal
      style={estilos.marcador}
      contentContainerStyle={estilos.marcadorFila}
      showsHorizontalScrollIndicator={false}
    >
      {/*
        EL MAZO VA EL PRIMERO Y SIEMPRE EN EL MISMO SITIO. Es lo único de esta cinta
        que no es de nadie, y contarlo es parte del juego: quedan tres cartas, ya no
        puede salir un título. Puesto al final se iría fuera de la pantalla en cuanto
        se sentara el cuarto colono, que es justo cuando más se cuenta.
      */}
      <View
        style={estilos.mazo}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Quedan ${String(marcador.mazo)} cartas en el mazo`}
      >
        <Text style={estilos.marcadorRotulo}>Mazo</Text>
        <Text style={estilos.mazoCifra}>{marcador.mazo}</Text>
      </View>
      {marcador.colonos.map((c) => (
        <FichaDelColono key={c.asiento} colono={c} marcador={marcador} />
      ))}
    </ScrollView>
  );
}

/**
 * Un colono en la cinta: su color, sus puntos y lo que se le ve del mazo.
 *
 * ═══ Y CUÁNTO MIDE SU CADENA DE VEREDAS, QUE ES LO QUE FALTABA ═══
 *
 * La cinta nombraba «Vado largo» a quien ya lo tenía y callaba con todos los demás. A
 * quien encadena veredas y no ve el premio, esa cinta no le dice nada — y menos aún
 * cuando el juego cuenta menos veredas que las que se ven puestas, que es lo que pasa
 * cuando el vecino le corta el paso. Con la cifra del juego a la vista se puede comparar
 * con el tablero.
 *
 * LA FRASE LA ESCRIBE `shared/` —`renglonDelVado` la que se ve, `loQueSeOyeDelVado` la
 * que se oye— y tiene TRES ramas. La primera versión de esta ficha decía «vado 5 de 5» al
 * segundo que llegaba a cinco: cadena de cinco, cero puntos, porque el premio sólo se
 * mueve a quien SUPERA al dueño; y «de 5» se lee como «ya está». Con la frase en un solo
 * sitio, el raíl del escritorio, esta ficha y su `accessibilityLabel` no pueden separarse,
 * y el mínimo sigue siendo `vadoMinimo` del marcador: `VADO_MINIMO`, no un cinco escrito.
 */
function FichaDelColono({
  colono,
  marcador,
}: {
  colono: ColonoEnElMarcador;
  marcador: MarcadorEnTres;
}): JSX.Element {
  const oculto = colono.puntosConLoOculto;
  const soloMios = oculto === null ? 0 : oculto - colono.puntos;
  /* El Vado no va aqui: lo dice ya el renglon de `renglonDelVado`, con su largo, y ponerlo
     tambien en el rotulo de premios lo repetia dos veces en la cinta y dos en lo que se oye. */
  const premios = [
    colono.tieneLaMayorGuardia ? 'Mayor guardia' : null,
  ].filter((p): p is string => p !== null);
  const suVado = renglonDelVado(colono, marcador);

  /*
   * LA FRASE QUE SE OYE ES LA ENTERA, y la que se ve son cuatro renglones cortos. Es
   * la misma decisión que la línea del turno deja escrita: un lector de pantalla no
   * ve una ficha, lee una fila detrás de otra, y «Ada · 4 · 3 cartas» suena a tres
   * datos sueltos. Lo que se pinta no cambia; lo que se oye se compone aquí.
   */
  const dicho = [
    `${colono.nombre}${colono.soyYo ? ', tú' : ''}`,
    `${String(colono.puntos)} puntos a la vista`,
    soloMios > 0 ? `y ${String(soloMios)} más que sólo cuentas tú` : null,
    `${String(colono.cartas)} cartas en la mano`,
    `${String(colono.guardias)} guardias jugadas`,
    loQueSeOyeDelVado(colono, marcador),
    colono.titulos.length > 0 ? `ha revelado ${colono.titulos.join(', ')}` : null,
    premios.length > 0 ? `tiene ${premios.join(' y ')}` : null,
  ]
    .filter((t): t is string => t !== null)
    .join('. ');

  return (
    <View
      style={[estilos.ficha, colono.soyYo ? estilos.fichaMia : null]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={dicho}
    >
      {/*
        EL RAÍL LLEVA EL COLOR DEL COLONO, que es el mismo con el que sus piezas están
        puestas en el tablero. No es un color inventado ni uno de la Sala: viene en la
        vista, y es lo que hace que esta ficha y aquella choza sean de la misma
        persona sin leer un nombre.
      */}
      <View style={[estilos.fichaRail, { backgroundColor: colono.color }]} />
      <View style={estilos.fichaCuerpo}>
        <Text style={estilos.fichaNombre} numberOfLines={1}>
          {colono.soyYo ? `${colono.nombre} (tú)` : colono.nombre}
        </Text>
        <Text style={estilos.fichaPuntos}>{colono.puntos}</Text>
        {soloMios > 0 ? (
          <Text style={estilos.fichaOculto}>{`+${String(soloMios)} sólo tuyos`}</Text>
        ) : null}
        <Text style={estilos.fichaPie}>
          {`${String(colono.cartas)} cartas · ${String(colono.guardias)} guardias`}
        </Text>
        <Text style={estilos.fichaPie}>{suVado}</Text>
        {colono.titulos.length > 0 ? (
          <Text style={estilos.fichaPie} numberOfLines={2}>
            {colono.titulos.join(' · ')}
          </Text>
        ) : null}
        {premios.length > 0 ? (
          <Text style={estilos.fichaPremio}>{premios.join(' · ')}</Text>
        ) : null}
      </View>
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
   * EL BOTÓN DE VOLVER AL TABLERO ENTERO: cromo sobre el lienzo, arriba y a la
   * IZQUIERDA. Que es la única esquina de las cuatro que la propia interfaz no usa.
   *
   * ═══ ESTUVO ARRIBA A LA DERECHA, Y AHÍ SE COMÍA LA MANO ═══
   *
   * LA MANO —la baraja de `escenas/baraja.ts`— vive pegada al borde DERECHO, repartida
   * en vertical y centrada, y crece hacia arriba y hacia abajo con cada carta. Sus dos
   * pasos son 0,20 y 0,62 altos de carta, y cuando ya no cabe se aprieta hasta ocupar
   * el 92 % del alto del lienzo: en ese tope la carta de arriba llega a 0,04 del alto,
   * o sea a 14 px en un lienzo de 360 y a 20 px en uno de 490. El botón ocupa de 12 a
   * 56 (12 de margen y 44 de alto, el mínimo de dedo). O sea que una mano llena queda
   * SIEMPRE por debajo del botón, y no hace falta que esté llena: medido con los pasos
   * de la baraja, trece cartas repartidas entre los cinco bienes suben la de arriba a
   * 42,8 px en un lienzo de 360, que ya está dentro. Y esa carta es justo la que hay
   * que arrastrar para proponer un trueque.
   *
   * ═══ Y ABAJO A LA DERECHA TAMPOCO ESTÁ LIBRE, AUNQUE LO PAREZCA ═══
   *
   * La barra de construir está abajo y centrada, pero mide lo suyo: con las tres piezas
   * de Riberas y un lienzo de 390×490 ocupa 222 px de ancho —84 libres a cada lado— y
   * va de 44 a 108 px del canto de abajo. Un botón en esa esquina se le mete por debajo
   * en una franja de unos doce puntos de alto, y ahí lo que se pierde es tocar una
   * pieza. Abajo a la izquierda, lo mismo por simetría. Arriba a la izquierda no hay
   * nada: la mano y las áreas de trueque son del lado derecho —las áreas empiezan a
   * 169 px del canto derecho en un lienzo de 490, y este botón acaba a 167 px del canto
   * IZQUIERDO— y la hoja de «¿a quién?» es de abajo.
   *
   * ═══ EL CUADRADO QUE TAPA NO DESAPARECE, SE MUEVE ═══
   *
   * Acercado del todo el delta llega de borde a borde, así que este rectángulo es
   * tablero que deja de poder tocarse: un anillo que caiga debajo no se pulsa. Eso le
   * pasa a cualquier cromo encima de una escena y no se arregla cambiándolo de sitio;
   * lo que se elige es qué esquina cuesta menos. Se acorta el rótulo para que el
   * rectángulo sea el menor posible, y el anillo que quede debajo se saca girando o
   * paseando la mirada, que son dos gestos que ya existen. Un botón que se moviera solo
   * para no tapar nada sería peor: no se sabría nunca dónde está.
   *
   * ═══ POR QUÉ NO LLEVA EL ACENTO ═══
   *
   * Porque no es la acción de la partida. En esta Sala el acento significa «esto es
   * lo que hay que tocar», y un botón de acento permanente encima del tablero
   * competiría cada segundo con las piezas y los anillos, que sí lo son. Lleva la
   * misma teja y el mismo contorno que la hoja —blanco al 40 %— porque son la misma
   * clase de cosa: cromo de la pantalla encima de una escena.
   *
   * Y LLEVA FONDO OPACO A PROPÓSITO. Debajo hay cielo, agua y relieve, o sea un
   * fondo que cambia de color con el ángulo: un rótulo suelto sobre eso no tiene
   * contraste que se pueda medir. Sobre la teja, el blanco de énfasis da de sobra.
   * Los 44 de alto son el mínimo de dedo de la casa.
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
  /*
   * LA LISTA DE LA HOJA SE DESPLAZA, y el tope está medido contra la hoja entera. El
   * Año Bueno ofrece quince pares: quince botones de 44 más su hueco son casi
   * ochocientos puntos, y la caja del lienzo mide 360 en el peor caso. Con 220 caben
   * cuatro botones a la vista y el resto se baja con el dedo, y la hoja completa
   * —pregunta, nombre de la carta, lista y «Dejarlo»— se queda en unos 330.
   */
  hojaLista: { flexGrow: 0, flexShrink: 1, maxHeight: 220 },
  hojaListaDentro: { gap: 8 },
  hojaDejarlo: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  hojaDejarloRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  /*
   * ═══ LA CINTA DEL MARCADOR ═══
   *
   * `flexGrow: 0` escrito a mano, como el pie: dentro de una columna un `ScrollView`
   * pide todo lo que queda, y esta cinta tiene que medir lo que miden sus fichas y ni
   * un punto más — lo que se lleve de alto se lo quita al lienzo, que es lo que se ha
   * venido a mirar. Y `flexShrink: 0` para que no sea ella la que ceda cuando la
   * pantalla se quede corta: una ficha aplastada deja de decir el número.
   */
  marcador: { flexGrow: 0, flexShrink: 0 },
  marcadorFila: { gap: 8, paddingHorizontal: 16, paddingTop: 10, alignItems: 'flex-start' },
  marcadorRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  /* El mazo: la misma teja que una ficha, sin raíl, porque no es de nadie. */
  mazo: {
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
  },
  /*
   * LAS CIFRAS EN `LETRA.dato`, con la copia del `fontVariant` que ese tipo exige:
   * la tabla es `as const` y su lista sale de sólo lectura, que no encaja en el
   * `TextStyle` de React Native. Es la misma línea que ya llevan `escena-peonza.tsx`
   * y `retablo.tsx`, y sin ella `StyleSheet.create` deja de inferir la hoja ENTERA.
   */
  mazoCifra: {
    ...LETRA.dato,
    fontVariant: [...LETRA.dato.fontVariant],
    color: SALA.palabra,
    fontSize: 22,
  },
  /*
   * ANCHO TOPADO POR LOS DOS LADOS, como la franja de las cartas y por lo mismo: el
   * mínimo para que la cifra y el pie quepan sin partirse, y el máximo para que un
   * nombre largo no se lleve la cinta entera y deje al resto de colonos fuera de la
   * pantalla. Lo que sobra del nombre se corta con `numberOfLines`, que es lo que se
   * puede perder sin perder ningún dato: el color del raíl ya dice de quién es.
   */
  ficha: {
    flexDirection: 'row',
    minWidth: 132,
    maxWidth: 200,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
    overflow: 'hidden',
  },
  /*
   * LA MÍA SE DISTINGUE POR EL CONTORNO Y POR EL «(TÚ)», y no por el acento: en esta
   * Sala el acento quiere decir «esto es lo que hay que tocar», y una ficha del
   * marcador no se toca nunca. El contorno es el mismo blanco al 40 % de la hoja
   * —3,63 sobre la teja—, que es el que sí se ve; `filoVivo` se queda en 1,42:1 y eso
   * no es un contorno apagado, es ninguno.
   */
  fichaMia: { borderColor: conAlfa(SALA.blanco, 0.4), backgroundColor: SALA.tejaAlta },
  fichaRail: { width: 4 },
  fichaCuerpo: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  fichaNombre: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  fichaPuntos: {
    ...LETRA.dato,
    fontVariant: [...LETRA.dato.fontVariant],
    color: SALA.blanco,
    fontSize: 22,
  },
  fichaOculto: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 13 },
  fichaPie: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13 },
  fichaPremio: { ...LETRA.rotuloChico, color: SALA.palabra, fontSize: 13 },
});
