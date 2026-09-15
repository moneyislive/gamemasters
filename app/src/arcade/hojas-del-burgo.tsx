/**
 * LA HOJA DEL BURGO EN LA APP: las ocho secciones de `hojaEnTres`, pintadas.
 *
 * ═══ AQUÍ NO HAY NI UNA REGLA, NI UNA CUENTA, NI UNA PALABRA REDACTADA ═══
 *
 * Todo lo que se lee en esta hoja —los títulos de las secciones, las líneas de
 * cada una, los rótulos de cada botón, la tabla de rentas, quién puja, qué dice un
 * trato, cuánto es un euro— lo escribe `shared/arcade/juegos/burgo-en-tres.ts`,
 * que es donde lo lee también el escritorio. Este fichero coge esa estructura y le
 * pone `View`, `Pressable` y `Text` encima. Si mañana el Burgo cambia una renta o
 * una frase, aquí no se toca nada; y si alguien redacta aquí una sola palabra del
 * juego, el PC dirá otra cosa el mismo día.
 *
 * Las DOS excepciones son las dos puertas del juego —la puja libre y el trato—,
 * que no son movimientos montados sino declaraciones: lo que se pulsa hay que
 * componerlo. Y tampoco se compone aquí: se guarda lo que la persona va eligiendo
 * y se le pasa a `montar()` de la traducción, que devuelve `null` cuando lo pedido
 * no cabe en lo que la puerta declara. Un botón apagado por `montar() === null` es
 * la única forma de que la app y el servidor no puedan discrepar sobre qué cabe.
 *
 * ═══ POR QUÉ UNA SOLA SECCIÓN ABIERTA, Y POR QUÉ SE RECUERDA POR MESA ═══
 *
 * Ocho secciones abiertas a la vez son una pantalla de dos metros: el §6.3 del
 * diseño las quiere plegadas y con una sola abierta. Cuál estaba abierta se guarda
 * POR MESA en el bolsillo (`bolsillo.ts`), porque una partida de días se abre y se
 * cierra muchas veces y volver siempre al principio obliga a buscar «Lo mío» cada
 * vez. Lo único que se salta esa memoria es el momento de actuar: cuando cambia el
 * PASO de la partida y me toca a mí, la hoja abre sola lo que haya que contestar
 * —la subasta si pujo, el trato si me proponen, «Lo mío» en mi apuro, «Ahora» si
 * no hay nada de eso—, y eso lo decide `hojaEnTres` con su campo `abre` y no esta
 * pantalla.
 *
 * ═══ Y AHORA LA HOJA ENTERA VIVE EN UN CAJÓN, PORQUE EL TABLERO ES LA PANTALLA ═══
 *
 * El tablero se lleva la pantalla entera desde el primer fotograma; la hoja sube
 * desde el pie cuando se pide, igual que el cajón del PC. Eso deja DOS fallos de
 * los de verdad que había que arreglar antes que nada, y los dos estaban medidos:
 *
 *   · CON UNA MESA RECIÉN ABIERTA NO SE PODÍA EMPEZAR. «Empezar la partida» es una
 *     opción del momento, o sea de la sección «Ahora», y «Ahora» nacía PLEGADA
 *     dentro de una hoja que además ahora nace cerrada: la única jugada posible de
 *     una mesa nueva quedaba detrás de dos toques que nadie tiene motivo para dar.
 *     Una partida parada, sin un solo error en consola. Lo arregla EL CARRIL
 *     (`ElCarrilDeLaMesa`), que es la sección «Ahora» puesta a la vista y sin abrir
 *     nada; y para que el movimiento no se enseñe dos veces, la sección suelta sus
 *     botones cuando el carril se pinta — pasándole a `hojaEnTres` EL CARRIL, que
 *     es el objeto que se pinta, y nunca un booleano.
 *   · EL ÚNICO CAMPO DE TEXTO DE LA PARTIDA NO SE PODÍA USAR. La puja libre vive
 *     dentro de una lista que se desplaza, y una lista sin
 *     `keyboardShouldPersistTaps` se come el PRIMER toque para cerrar el teclado:
 *     hay que pulsar «Pujar» dos veces. Con el plazo de una subasta corriendo, eso
 *     es la subasta perdida. Va en las dos listas que pueden llevar un campo
 *     dentro, y está dicho en cada una.
 *
 * Y el cajón lleva las cuatro mitades de una caja modal, que en esta plataforma se
 * escriben así: el VELO es un `Pressable` que llena la pantalla y se come el toque
 * —sin él, cerrar el cajón hace algo donde estaba el dedo, y debajo hay un anillo
 * que gira—; el NOMBRE y el papel van en `accessibilityViewIsModal` con su rótulo;
 * la TRAMPA DE FOCO es apagar de un golpe todo lo que queda debajo
 * (`accessibilityElementsHidden` en iOS y `importantForAccessibility` en Android,
 * que son las dos mitades de lo mismo y ninguna sola vale); y el foco VUELVE
 * porque el asa del cajón sigue donde estaba al cerrarlo.
 *
 * ═══ Y LA GRAMÁTICA DE LA CASA, QUE AQUÍ SE PAGA EN CADA BOTÓN ═══
 *
 * Apagado se VE y no desaparece: saber que existe una jugada que ahora no se puede
 * es información. Se apaga con los colores de `BOTON.quieto` y NUNCA con
 * `opacity`, que apaga también la letra y deja la ayuda en 2,32:1. Nada de blanco
 * sobre el acento vivo (1,98:1 en ámbar). Ningún cuerpo por debajo de 13. Nada por
 * debajo de 44 puntos de alto donde haya que poner el dedo. El acento sólo en lo
 * que está vivo o se toca — un marco alrededor de quien tiene el turno, y nada
 * más.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
/*
 * `Platform` sólo para el `behavior` del `KeyboardAvoidingView`, que es la receta ya
 * medida en `piezas.tsx`: en iOS el teclado se superpone y hay que empujar; en Android
 * la ventana ya se redimensiona sola y empujar otra vez deja un hueco muerto. No decide
 * qué se pinta ni cómo se juega — eso es lo que la pantalla del Burgo tiene prohibido,
 * y `verify:sala` lo vigila allí.
 */
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BURGO } from '../../../shared/arcade/juegos';
import {
  EL_CARRIL_DE_LA_MESA,
  LOS_MIOS,
  LOS_TRATOS_DE_LA_MESA,
  maravedies,
  ORDEN_DE_LA_HOJA,
  PARA_CONTESTAR,
} from '../../../shared/arcade/juegos/burgo-en-tres';
import type {
  BarrioDeLoMio,
  CartelDeCasilla,
  DestinoDelTrato,
  FichaDeCasilla,
  FinalDelBurgo,
  GlifoDelCarrilDelBurgo,
  HojaDelBurgo,
  IdDeSeccion,
  JugadorDelMarcador,
  LadoQueSePinta,
  PregonDelBurgo,
  PujaComponible,
  SeccionDeLaHoja,
  SolarDelBarrio,
  TiraDelTrato,
  TratoComponible,
} from '../../../shared/arcade/juegos/burgo-en-tres';
import type { MovimientoDeclarado } from '../../../shared/mecanicas/tablero-declarado';
import { guardarLaSeccion, laSeccionGuardada } from './bolsillo';
import type { OpcionDeMesa } from './mesa';
import { BOTON, LETRA, RADIO, SALA } from './muebles';
import { conAlfa } from '../tema';

/** El alto mínimo de cualquier cosa que se toque. El de la casa. */
const DEDO = 44;

/** Cuántos euros suma o resta un toque en el componedor de tratos. El del reglamento. */
const PASO_DEL_DINERO = 10;

/**
 * CUÁNTO DINERO SE PUEDE PEDIR, como tope del cuadro y no como regla.
 *
 * Lo que YO puedo dar lo dice la puerta (`mrsMaximo`), porque el juego sabe cuánto
 * tengo. Lo que el otro puede pagar no viaja en la puerta —y no debería: es su
 * bolsa y la sabe él—, así que aquí sólo hay un tope de cuadro para que el mando
 * de «+10» no suba sin fin; si se pide más de lo que tiene, el reductor lo rechaza
 * al aceptar, que es donde se revalidan las dos partes.
 */
const MRS_QUE_SE_PUEDEN_PEDIR = 10000;

/** Cómo se llama el cajón en pantalla, y lo que se oye al abrirlo y al cerrarlo. */
const LA_HOJA_DE_LA_PARTIDA = 'La hoja de la partida';
const ABRIR_LA_HOJA = 'Abrir la hoja de la partida';
const CERRAR_LA_HOJA = 'Cerrar la hoja de la partida';

// ---------------------------------------------------------------------------
// Qué sección está abierta, cuándo se abre sola y cuándo sube el cajón
// ---------------------------------------------------------------------------

/**
 * LA SECCIÓN ABIERTA: la que se recordaba de esta mesa, hasta que hay que actuar.
 *
 * `paso` es una cadena que cambia exactamente cuando cambia el momento de la
 * partida —quien llama le pasa `hoja.cinta.espera`, que `esperaA` deriva de
 * `l.paso`, del turno y del momento—. Cuando esa cadena cambia Y me toca a mí, la
 * hoja abre lo que `hojaEnTres` diga en `abre`, que ya lleva la prioridad escrita:
 * la subasta si pujo, el trato si me proponen, «Lo mío» en mi apuro y «Ahora» si
 * no hay nada más urgente.
 *
 * NO se abre sola cuando le toca a otro: en una mesa de seis eso sería la hoja
 * saltando de sección cada pocos segundos mientras se intenta leer el marcador.
 *
 * ═══ Y EL CAJÓN SÓLO SUBE SOLO SI LO QUE HAY QUE CONTESTAR ESTÁ DENTRO ═══
 *
 * Desde que el tablero es la pantalla entera, abrir la hoja tapa la partida. Así
 * que el cajón sube solo únicamente cuando la sección que `abre` nombra NO se ve ya
 * fuera de él. Y qué se ve fuera no se pregunta con dos interruptores —un `true`
 * con el mueble sin pintar deja lo que hay que contestar sin sitio en toda la
 * pantalla, que es el fallo que la casa cuenta en `hojaEnTres`—: se reciben LOS
 * OBJETOS QUE SE PINTAN. El carril cubre «Ahora» cuando tiene cuadrados —vacío no
 * se pinta, y entonces no cubre nada—, y la caja de los tratos cubre «El trato»
 * cuando existe. Sin esto, el caso corriente —`abre` vale «ahora» en cuanto me toca
 * el turno— levantaría el cajón encima del anillo en cada vuelta para enseñar unos
 * botones que ya están a la vista en el carril, dos centímetros más abajo.
 */
export function usarLaSeccionAbierta(
  codigo: string,
  abre: IdDeSeccion | null,
  paso: string,
  meToca: boolean,
  carril: readonly GlifoDelCarrilDelBurgo<OpcionDeMesa>[],
  pregon: PregonDelBurgo<OpcionDeMesa> | null,
): {
  readonly abierta: IdDeSeccion | null;
  readonly alAbrir: (id: IdDeSeccion) => void;
  readonly cajonAbierto: boolean;
  readonly alternarElCajon: () => void;
  readonly cerrarElCajon: () => void;
  /**
   * ABRIR EL CAJÓN POR UNA SECCIÓN, en un solo gesto. Lo usa «Proponer trato» de la
   * ficha de un jugador: antes bastaba con `alAbrir('trato')` porque la hoja estaba
   * siempre en pantalla; desde que vive en un cajón, abrir la sección sin subir el
   * cajón manda a un sitio que no se ve, que es el fallo de esta tanda otra vez.
   */
  readonly alAbrirEnElCajon: (id: IdDeSeccion) => void;
} {
  const [abierta, ponerAbierta] = useState<IdDeSeccion | null>(null);
  const [cajonAbierto, ponerCajonAbierto] = useState(false);
  const pasoVisto = useRef<string | null>(null);
  /*
   * Lo que se ve FUERA del cajón, leído de los muebles y no de dos banderas. Va en
   * una referencia y no en las dependencias del efecto: el carril es una lista
   * nueva en cada sondeo, y meterla en las dependencias volvería a levantar el
   * cajón en cada vuelta aunque el paso no hubiera cambiado.
   */
  const seVeFuera = useRef<readonly IdDeSeccion[]>([]);
  const cubiertas: IdDeSeccion[] = [];
  if (carril.length > 0) cubiertas.push('ahora');
  if (pregon !== null) cubiertas.push('trato');
  seVeFuera.current = cubiertas;

  useEffect(() => {
    let vivo = true;
    void laSeccionGuardada(BURGO, codigo).then((guardada) => {
      if (!vivo || guardada === null) return;
      /*
       * Lo guardado se contrasta con la lista de verdad y no se cree: en el
       * almacén puede haber el nombre de una sección de una versión anterior, y
       * una hoja que abriera una sección que ya no existe se quedaría con todo
       * plegado y sin manera de saber por qué.
       */
      for (const id of ORDEN_DE_LA_HOJA) if (id === guardada) ponerAbierta(id);
    });
    return () => {
      vivo = false;
    };
  }, [codigo]);

  useEffect(() => {
    if (pasoVisto.current === paso) return;
    const esLaPrimera = pasoVisto.current === null;
    pasoVisto.current = paso;
    /*
     * La primera vuelta no cuenta: es cuando se monta la pantalla, y ahí manda lo
     * que estuviera guardado —que todavía puede estar llegando del bolsillo—.
     */
    if (esLaPrimera || !meToca) return;
    ponerAbierta(abre ?? 'ahora');
    if (abre !== null && seVeFuera.current.indexOf(abre) < 0) ponerCajonAbierto(true);
  }, [paso, meToca, abre]);

  const alAbrir = useCallback(
    (id: IdDeSeccion) => {
      ponerAbierta((antes) => (antes === id ? null : id));
      void guardarLaSeccion(BURGO, codigo, id);
    },
    [codigo],
  );

  const alternarElCajon = useCallback(() => {
    ponerCajonAbierto((antes) => !antes);
  }, []);
  const cerrarElCajon = useCallback(() => {
    ponerCajonAbierto(false);
  }, []);
  const alAbrirEnElCajon = useCallback(
    (id: IdDeSeccion) => {
      ponerAbierta(id);
      ponerCajonAbierto(true);
      void guardarLaSeccion(BURGO, codigo, id);
    },
    [codigo],
  );

  return { abierta, alAbrir, cajonAbierto, alternarElCajon, cerrarElCajon, alAbrirEnElCajon };
}

// ---------------------------------------------------------------------------
// La hoja entera
// ---------------------------------------------------------------------------

/** Lo que la hoja necesita de la pantalla, y ni una cosa más. */
export interface LoQueSabeLaHoja {
  readonly hoja: HojaDelBurgo<OpcionDeMesa>;
  readonly quieto: boolean;
  readonly abierta: IdDeSeccion | null;
  readonly alAbrir: (id: IdDeSeccion) => void;
  /** Mandar una opción ENTERA, tal como la compuso el juego. */
  readonly alElegir: (o: OpcionDeMesa) => void;
  /** Mandar un movimiento compuesto por una de las dos puertas (`montar`). */
  readonly alMandar: (m: MovimientoDeclarado) => void;
  /** Abrir la ficha de un jugador (sus títulos, proponerle un trato). */
  readonly alTocarJugador: (asiento: string) => void;
  /** Cómo se llama una casilla. Sale de `fichaDeCasilla`, no de una tabla de aquí. */
  readonly nombreDeCasilla: (casilla: number) => string;
}

/**
 * LA HOJA: las secciones, y NADA MÁS.
 *
 * La cinta ya no va aquí dentro. Desde que la hoja vive en un cajón, la cinta —de
 * quién es el turno, qué acaba de pasar y cuánto tengo— es lo único que hay que
 * poder mirar SIN abrir nada, así que se pinta fuera (`LaCintaDelBurgo`) y de paso
 * lleva el asa del cajón. La sección `cinta` de la traducción se sigue saltando
 * aquí por lo mismo de siempre: sus dos renglones son los que la cinta ya dice.
 */
export function LaHojaDelBurgo(props: LoQueSabeLaHoja): JSX.Element {
  const { hoja, abierta, alAbrir } = props;
  return (
    <View style={estilos.hoja}>
      {hoja.secciones.map((s) =>
        s.id === 'cinta' ? null : (
          <LaSeccion key={s.id} seccion={s} abierta={abierta === s.id} alAbrir={alAbrir}>
            <ElCuerpoDeLaSeccion seccion={s} {...props} />
          </LaSeccion>
        ),
      )}
    </View>
  );
}

/**
 * LA CINTA: de quién es el turno, qué acaba de pasar, cuánto tengo, y el asa del
 * cajón.
 *
 * Va siempre visible y sin plegar (§6.3): es lo único de la hoja que se mira sin
 * buscarlo, y por eso es lo único que se quedó FUERA del cajón. Mi dinero lleva MI
 * color, que es el mismo del peón en el anillo: sin eso, en una mesa de seis hay
 * que leer el nombre para saber cuál de las seis cifras del marcador es la propia.
 *
 * El aviso va como texto y NO como región viva: dos regiones vivas en la misma
 * pantalla se pisan y acaban leyéndose a destiempo, y la casa pide UNA.
 *
 * ═══ Y AHORA EL AVISO DE LA MESA TAMBIÉN CAE AQUÍ, PORQUE ERA UNA REGIÓN DE MÁS ═══
 *
 * Esta línea decía que la pantalla ya tenía la suya —`ElAviso` del mueble genérico— y
 * eso era verdad y era el problema: en la rama del respaldo del Burgo coincidían TRES
 * regiones vivas a la vez (la línea del turno, `ElAviso` y el aviso que el `Retablo`
 * pinta dentro), y `ElAviso` además devuelve `null` con el texto vacío, o sea que la
 * región nace a la vez que su texto y por eso no se anuncia nunca. La pantalla del
 * Burgo ya no lo monta y le pasa aquí el texto: esta cinta es el único mueble suyo que
 * está SIEMPRE en el árbol y en las DOS ramas, y ya tenía el renglón donde ponerlo.
 *
 * El orden es aviso de la mesa, aviso del juego y espera, y no es alfabético: «No ha
 * salido el movimiento» y «Se ha perdido la mesa» dicen que lo que se acaba de pulsar
 * no ha llegado a ninguna parte, y eso manda sobre «Espera a que Ana tire». Los tres
 * son cadenas ajenas —dos del servidor y una del juego— y aquí no se redacta ninguna.
 *
 * ═══ EL ASA ES LA CIFRA, Y CUANDO NO HAY CIFRA SIGUE HABIENDO ASA ═══
 *
 * Es el mismo mando que en el PC: la cápsula del dinero abre y cierra el cajón, con
 * `expanded` para que un lector de pantalla diga en qué estado está. Un MIRÓN no
 * tiene dinero —y tampoco quien todavía no se ha sentado—, así que ahí la cápsula
 * enseña «≡» en vez de la cifra: sin esa rama, la hoja entera —el marcador, la mesa
 * entera, la crónica— se quedaría sin ninguna manera de abrirse justo para quien
 * sólo puede mirar. Sigue siendo UN mando y no dos: un botón de más se ve como una
 * lista larga, y aquí serían dos asas para el mismo cajón.
 */
export function LaCintaDelBurgo({
  cinta,
  cajonAbierto,
  alAlternarElCajon,
  avisoDeLaMesa,
}: {
  cinta: HojaDelBurgo<OpcionDeMesa>['cinta'];
  cajonAbierto: boolean;
  alAlternarElCajon: () => void;
  /** El aviso de la MESA —el de la red, no el del juego—, que ya no tiene región propia. */
  avisoDeLaMesa: string;
}): JSX.Element {
  const hayCifra = cinta.miDinero.length > 0;
  const loQueHaceElAsa = cajonAbierto ? CERRAR_LA_HOJA : ABRIR_LA_HOJA;
  /* Lo que se acaba de pulsar y no ha llegado manda sobre lo que hay que esperar. Ver la cabecera. */
  const dicho =
    avisoDeLaMesa.length > 0 ? avisoDeLaMesa : cinta.aviso.length > 0 ? cinta.aviso : cinta.espera;
  return (
    <View style={estilos.cinta}>
      <View style={estilos.cintaDicho}>
        <Text style={estilos.cintaTurno} numberOfLines={1}>
          {cinta.turno}
        </Text>
        <Text style={estilos.cintaEspera} numberOfLines={2}>
          {dicho}
        </Text>
      </View>
      <Pressable
        style={[estilos.miDinero, hayCifra ? { borderColor: cinta.miColor } : null]}
        onPress={alAlternarElCajon}
        accessibilityRole="button"
        accessibilityState={{ expanded: cajonAbierto }}
        accessibilityLabel={hayCifra ? `Tienes ${cinta.miDinero}. ${loQueHaceElAsa}` : loQueHaceElAsa}
      >
        <Text style={estilos.miDineroCifra}>{hayCifra ? cinta.miDinero : '≡'}</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// El carril: lo que puedo hacer AHORA MISMO, sin abrir nada
// ---------------------------------------------------------------------------

/**
 * ═══ EL CARRIL DE LA MESA: LA SECCIÓN «AHORA», PUESTA A LA VISTA ═══
 *
 * ═══ EL FALLO QUE ARREGLA, CON SU CASO ═══
 *
 * Los botones del momento —empezar, la fianza, el Salvoconducto, las dos formas del
 * Impuesto, pasar el turno, la quiebra, y en MI apuro vender e hipotecar título a
 * título— vivían en la sección «Ahora» de la hoja. La hoja nace cerrada y la sección
 * nace plegada, así que con una mesa recién abierta la ÚNICA jugada posible del
 * juego —«Empezar la partida»— quedaba detrás de dos toques que nadie tiene motivo
 * para dar: una partida parada, sin un error en ninguna consola. Esto es esa misma
 * lista, colgada de la cinta y sin nada que abrir.
 *
 * ═══ AQUÍ NO SE DECIDE QUÉ ENTRA, NI SE MONTA NADA, NI SE REDACTA NADA ═══
 *
 * Qué entra lo decide `opcionesDelCarrilDelBurgo` y la forma la pone
 * `glifosDelCarrilDelBurgo`, las dos en `shared/`: el glifo de dos letras, el rótulo
 * corto que separa dos cuadrados del mismo verbo (el nombre de seis letras del
 * solar, la cifra de una puja, «Fijo» o «10 %»), el rótulo entero para lo que se oye
 * y el color de la acera para el filo. Aquí se pinta lo que llega, en el orden que
 * llega, y se manda LA OPCIÓN ENTERA tal como vino.
 *
 * ═══ UN CARRIL VACÍO NO SE PINTA: NI EL HUECO, NI EL FILO ═══
 *
 * `carrilDelBurgo` devuelve `[]` cuando no hay nada que hacer ahora mismo, y una
 * tira vacía encima del tablero es una franja de cromo que no dice nada y tapa
 * casillas. Y es la misma condición con la que se decide si «Ahora» conserva sus
 * botones: quien pinta esto es quien le pasa el carril a `hojaEnTres`.
 *
 * ═══ Y SE DESPLAZA A LO ANCHO, NO SE ENVUELVE ═══
 *
 * En un apuro con seis títulos, envolver serían tres filas de cuadrados comiéndose
 * el tablero justo cuando corre la cuenta atrás. A lo ancho ocupa siempre lo mismo.
 * El rótulo del mueble se pinta de verdad —no es sólo un nombre accesible— porque la
 * sección «Ahora» manda aquí con ese nombre escrito en un renglón, y un renglón que
 * nombra un sitio que no se ve en la pantalla no es una indicación.
 */
export function ElCarrilDeLaMesa({
  carril,
  quieto,
  alElegir,
}: {
  carril: readonly GlifoDelCarrilDelBurgo<OpcionDeMesa>[];
  quieto: boolean;
  alElegir: (o: OpcionDeMesa) => void;
}): JSX.Element | null {
  if (carril.length === 0) return null;
  return (
    <View style={estilos.carril}>
      <Text style={estilos.rotuloDeGrupo}>{EL_CARRIL_DE_LA_MESA}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.carrilFila}>
        {carril.map((g) => (
          <Pressable
            key={g.opcion.id}
            disabled={quieto}
            style={[
              estilos.cuadrado,
              g.color === null ? null : { borderColor: g.color },
              quieto ? estilos.cuadradoQuieto : null,
            ]}
            onPress={() => {
              alElegir(g.opcion);
            }}
            accessibilityRole="button"
            /* Lo que se oye es el rótulo ENTERO del juego, no las dos letras del cuadrado. */
            accessibilityLabel={g.ayuda}
            accessibilityState={{ disabled: quieto }}
          >
            {/*
              EL GLIFO NO SE LEE EN VOZ ALTA: «Em» no es una palabra, y oírla delante
              del rótulo entero sería ruido en cada cuadrado. Es el equivalente exacto
              del `aria-hidden` que el contrato le pone en el PC.
            */}
            <Text
              style={[estilos.glifo, quieto ? estilos.glifoQuieto : null]}
              importantForAccessibility="no"
              accessibilityElementsHidden
            >
              {g.glifo}
            </Text>
            <Text style={[estilos.glifoRotulo, quieto ? estilos.glifoRotuloQuieto : null]} numberOfLines={1}>
              {g.rotulo}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// La caja de los tratos, y la confirmación de lo que no se puede deshacer
// ---------------------------------------------------------------------------

/**
 * ═══ LOS TRATOS DE LA MESA: LO QUE HAY QUE CONTESTAR, SIN ABRIR NADA ═══
 *
 * Un trato del Burgo CADUCA al cambiar el turno, así que una oferta que sólo se ve
 * abriendo un cajón es una oferta que casi nadie contesta: llega mientras juega
 * otro, no interrumpe nada, y muere sin respuesta. Esto es la caja NO MODAL colgada
 * del pie: se ve sin abrir nada, no roba el foco, y no tapa el tablero más que una
 * tira por propuesta. Los dos bloques —lo que me proponen y lo que yo propuse— son
 * de verdad simultáneos en este juego, y por eso van separados; sus dos títulos y el
 * de la caja los escribe `shared/` y no esta pantalla.
 *
 * Cuando esta caja se pinta, la sección «El trato» de la hoja suelta sus botones:
 * quien la pinta le pasa el objeto a `hojaEnTres`, y los mismos tres movimientos en
 * dos muebles a la vez son un movimiento enseñado dos veces.
 *
 * ═══ ACEPTAR SE PREGUNTA DOS VECES, Y NO ES CORTESÍA ═══
 *
 * Aceptar mueve dinero y títulos y NO SE PUEDE DESHACER: no hay «alzar el trato»
 * después. Y esta caja vive pegada al pie de un tablero que se gira y se pellizca
 * con el dedo, o sea justo donde un toque de más aterriza cuando la escena tarda un
 * fotograma en soltar. Un toque no puede regalar Calle Mayor. Así que «Aceptar»
 * cambia por «Sí, aceptar» y un «No» al lado, y hasta el segundo toque no se manda
 * nada.
 *
 * Y lo que se manda en ese segundo toque es EL MISMO objeto que ofrecía el primero
 * —`t.aceptar`, entero—, no uno compuesto aquí. Sigue siendo UN botón para ese
 * movimiento: el «No» no manda nada, sólo deshace la pregunta, y «Rechazar» y
 * «Retirar» se quedan donde estaban para que la pregunta no esconda las otras dos
 * salidas mientras se contesta.
 *
 * Se pregunta SÓLO en aceptar. Rechazar y retirar también matan la propuesta, pero
 * lo peor que hacen es devolver la mesa a como estaba hace un turno; aceptar cambia
 * el patrimonio. Confirmarlo todo enseñaría a contestar «sí» sin leer, que es
 * exactamente lo que esta pregunta viene a impedir.
 */
export function LaCajaDeLosTratos({
  pregon,
  quieto,
  alElegir,
}: {
  pregon: PregonDelBurgo<OpcionDeMesa>;
  quieto: boolean;
  alElegir: (o: OpcionDeMesa) => void;
}): JSX.Element {
  /* Qué tira está preguntando. Por id del trato: el objeto es nuevo en cada sondeo. */
  const [preguntando, ponerPreguntando] = useState<number | null>(null);
  return (
    <View style={estilos.caja}>
      <Text style={estilos.rotuloDeGrupo}>{LOS_TRATOS_DE_LA_MESA}</Text>
      <ScrollView style={estilos.cajaLista} contentContainerStyle={estilos.pilaEstrecha}>
        {pregon.paraContestar.length === 0 ? null : (
          <Text style={estilos.rotuloDeGrupo}>{PARA_CONTESTAR}</Text>
        )}
        {pregon.paraContestar.map((t) => (
          <LaTiraDelTrato
            key={t.id}
            tira={t}
            quieto={quieto}
            preguntando={preguntando === t.id}
            alPreguntar={ponerPreguntando}
            alElegir={alElegir}
          />
        ))}
        {pregon.mios.length === 0 ? null : <Text style={estilos.rotuloDeGrupo}>{LOS_MIOS}</Text>}
        {pregon.mios.map((t) => (
          <LaTiraDelTrato
            key={t.id}
            tira={t}
            quieto={quieto}
            preguntando={preguntando === t.id}
            alPreguntar={ponerPreguntando}
            alElegir={alElegir}
          />
        ))}
      </ScrollView>
      {/* La regla del reloj, escrita por el juego: sin ella nadie sabe que corre. */}
      <Text style={estilos.linea}>{pregon.caduca}</Text>
    </View>
  );
}

/** Una propuesta: el raíl del color de quien la hace, la frase entera y sus salidas. */
function LaTiraDelTrato({
  tira,
  quieto,
  preguntando,
  alPreguntar,
  alElegir,
}: {
  tira: TiraDelTrato<OpcionDeMesa>;
  quieto: boolean;
  preguntando: boolean;
  alPreguntar: (id: number | null) => void;
  alElegir: (o: OpcionDeMesa) => void;
}): JSX.Element {
  const aceptar = tira.aceptar;
  return (
    <View style={estilos.tira}>
      <View style={[estilos.discoDelColor, { backgroundColor: tira.color }]} />
      <View style={estilos.tiraCuerpo}>
        <Text style={estilos.linea}>{tira.frase}</Text>
        <Text style={estilos.cintaEspera}>{tira.comoAnda}</Text>
        <View style={estilos.filaQueEnvuelve}>
          {aceptar === null ? null : preguntando ? (
            <>
              <Pressable
                disabled={quieto}
                style={[estilos.boton, estilos.botonDeLaFila, quieto ? estilos.botonQuieto : null]}
                onPress={() => {
                  alPreguntar(null);
                  alElegir(aceptar);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Sí, ${aceptar.rotulo}`}
                accessibilityHint="No se puede deshacer"
                accessibilityState={{ disabled: quieto }}
              >
                <Text style={[estilos.botonRotulo, quieto ? estilos.botonRotuloQuieto : null]}>Sí, aceptar</Text>
              </Pressable>
              <Pressable
                style={[estilos.boton, estilos.botonDeLaFila]}
                onPress={() => {
                  alPreguntar(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="No aceptar todavía"
              >
                <Text style={estilos.botonRotulo}>No</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              disabled={quieto}
              style={[estilos.boton, estilos.botonDeLaFila, quieto ? estilos.botonQuieto : null]}
              onPress={() => {
                alPreguntar(tira.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={aceptar.rotulo}
              accessibilityHint="Pregunta antes: aceptar no se puede deshacer"
              accessibilityState={{ disabled: quieto }}
            >
              <Text style={[estilos.botonRotulo, quieto ? estilos.botonRotuloQuieto : null]}>{aceptar.rotulo}</Text>
            </Pressable>
          )}
          <LosBotones
            opciones={[tira.rechazar, tira.retirar].filter((o): o is OpcionDeMesa => o !== null)}
            quieto={quieto}
            alElegir={alElegir}
            enFila
          />
        </View>
      </View>
    </View>
  );
}

/**
 * UNA SECCIÓN PLEGABLE. El encabezado ENTERO es el botón —44 de alto— y dice si
 * está abierta con `accessibilityState.expanded`, que es lo que un lector de
 * pantalla necesita para no anunciar una lista que no está.
 *
 * Una sección sin nada que enseñar (`hayAlgo` falso) se pinta apagada y no se
 * quita: saber que existe «El trato» y que ahora no hay ninguno es información, y
 * una hoja cuyas secciones aparecen y desaparecen mueve de sitio todo lo demás en
 * cada jugada de cualquiera.
 */
function LaSeccion({
  seccion,
  abierta,
  alAbrir,
  children,
}: {
  seccion: SeccionDeLaHoja<OpcionDeMesa>;
  abierta: boolean;
  alAbrir: (id: IdDeSeccion) => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <View style={estilos.seccion}>
      <Pressable
        style={[estilos.seccionMando, seccion.hayAlgo ? null : estilos.seccionMandoQuieto]}
        onPress={() => {
          alAbrir(seccion.id);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        accessibilityLabel={seccion.titulo}
      >
        <Text style={estilos.seccionTitulo}>{seccion.titulo}</Text>
        <Text style={estilos.seccionFlecha}>{abierta ? '▲' : '▼'}</Text>
      </Pressable>
      {abierta ? <View style={estilos.seccionDentro}>{children}</View> : null}
    </View>
  );
}

/** Qué se pinta dentro de cada sección. La partición es la de `hojaEnTres` y no otra. */
function ElCuerpoDeLaSeccion({
  seccion,
  hoja,
  quieto,
  alElegir,
  alMandar,
  alTocarJugador,
  nombreDeCasilla,
}: LoQueSabeLaHoja & { seccion: SeccionDeLaHoja<OpcionDeMesa> }): JSX.Element {
  switch (seccion.id) {
    case 'marcador':
      return <ElMarcador jugadores={hoja.marcador.jugadores} alTocar={alTocarJugador} />;
    case 'almoneda':
      return (
        <View style={estilos.pila}>
          <LasLineas lineas={seccion.lineas} />
          <LosBotones opciones={seccion.opciones} quieto={quieto} alElegir={alElegir} />
          {hoja.puja === null ? null : <LaPujaLibre puja={hoja.puja} quieto={quieto} alMandar={alMandar} />}
        </View>
      );
    case 'trato':
      return (
        <View style={estilos.pila}>
          <LasLineas lineas={seccion.lineas} />
          <LosBotones opciones={seccion.opciones} quieto={quieto} alElegir={alElegir} />
          {hoja.trato === null || hoja.trato.puerta === null ? null : (
            <ElComponedorDelTrato
              trato={hoja.trato}
              quieto={quieto}
              alMandar={alMandar}
              nombreDeCasilla={nombreDeCasilla}
            />
          )}
        </View>
      );
    case 'mios':
      return <LoMio barrios={hoja.mios} quieto={quieto} alElegir={alElegir} />;
    default:
      return (
        <View style={estilos.pila}>
          <LasLineas lineas={seccion.lineas} />
          <LosBotones opciones={seccion.opciones} quieto={quieto} alElegir={alElegir} />
        </View>
      );
  }
}

// ---------------------------------------------------------------------------
// Las piezas
// ---------------------------------------------------------------------------

/** Las líneas de una sección, tal como las escribe la traducción. */
function LasLineas({ lineas }: { lineas: readonly string[] }): JSX.Element | null {
  if (lineas.length === 0) return null;
  return (
    <View style={estilos.pilaEstrecha}>
      {lineas.map((l, i) => (
        <Text key={`${String(i)}:${l}`} style={estilos.linea}>
          {l}
        </Text>
      ))}
    </View>
  );
}

/**
 * LOS BOTONES DE UNA SECCIÓN, con el rótulo y la ayuda DEL JUEGO.
 *
 * Se manda la opción ENTERA y no un `{ tipo, carga }` compuesto aquí: montarlo
 * escribiría la forma del movimiento en un segundo sitio, y el segundo no lo
 * comprueba nadie. Es la misma regla que `LasOpciones` del mueble genérico.
 */
function LosBotones({
  opciones,
  quieto,
  alElegir,
  enFila = false,
}: {
  opciones: readonly OpcionDeMesa[];
  quieto: boolean;
  alElegir: (o: OpcionDeMesa) => void;
  /**
   * EN FILA Y SIN LA AYUDA: sólo para la caja de los tratos, donde cada tira lleva
   * dos salidas cortas —«Rechazar», «Retirar»— al lado de la de aceptar. Apiladas y
   * con su ayuda debajo, dos tratos abiertos serían media pantalla de cromo encima
   * del tablero. El rótulo sigue siendo el DEL JUEGO, y la ayuda entera sigue
   * llegando al lector de pantalla por `accessibilityHint`, que es donde no ocupa.
   */
  enFila?: boolean;
}): JSX.Element | null {
  if (opciones.length === 0) return null;
  return (
    <View style={enFila ? estilos.filaQueEnvuelve : estilos.pilaEstrecha}>
      {opciones.map((o) => (
        <Pressable
          key={o.id}
          disabled={quieto}
          style={[estilos.boton, enFila ? estilos.botonDeLaFila : null, quieto ? estilos.botonQuieto : null]}
          onPress={() => {
            alElegir(o);
          }}
          accessibilityRole="button"
          accessibilityLabel={o.rotulo}
          accessibilityHint={o.ayuda.length > 0 ? o.ayuda : undefined}
          accessibilityState={{ disabled: quieto }}
        >
          <Text style={[estilos.botonRotulo, quieto ? estilos.botonRotuloQuieto : null]}>{o.rotulo}</Text>
          {enFila || o.ayuda.length === 0 ? null : <Text style={estilos.botonAyuda}>{o.ayuda}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

/**
 * EL MARCADOR: una fila por jugador, desplazable a lo ancho.
 *
 * Se desplaza a lo ancho y no se apila por lo mismo que la cinta de Riberas: seis
 * filas encima del anillo son media pantalla, y lo que se lleva de alto se lo
 * quita al lienzo. Las fichas NO se reordenan nunca —van en orden de asiento— para
 * que la propia se busque por el sitio y no leyendo los nombres.
 *
 * El marco del acento es de quien tiene el turno de verdad (`esSuTurno`); el punto
 * es de a quien se espera ahora mismo (`seLeEspera`), que en una subasta o en un
 * apuro puede ser otro. Los dos datos los da `marcadorEnTres` y aquí no se
 * recalcula ninguno.
 */
function ElMarcador({
  jugadores,
  alTocar,
}: {
  jugadores: readonly JugadorDelMarcador[];
  alTocar: (asiento: string) => void;
}): JSX.Element | null {
  if (jugadores.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.marcadorFila}>
      {jugadores.map((j) => (
        <Pressable
          key={j.asiento}
          style={[estilos.fichaDelJugador, j.esSuTurno ? estilos.fichaDelJugadorEnTurno : null]}
          onPress={() => {
            alTocar(j.asiento);
          }}
          accessibilityRole="button"
          accessibilityLabel={j.linea}
          accessibilityHint="Abre su ficha"
        >
          <View style={[estilos.discoDelColor, { backgroundColor: j.color }]} />
          <View style={estilos.fichaCuerpo}>
            <Text style={estilos.fichaNombre} numberOfLines={1}>
              {j.soyYo ? `${j.nombre} (tú)` : j.nombre}
            </Text>
            <Text style={estilos.fichaCifra}>{maravedies(j.mrs)}</Text>
            <Text style={estilos.fichaPie} numberOfLines={1}>
              {`${String(j.titulos)} ${j.titulos === 1 ? 'título' : 'títulos'}${j.indultos > 0 ? ` · ${String(j.indultos)} Salvoconducto${j.indultos === 1 ? '' : 's'}` : ''}`}
            </Text>
            {j.quebrado ? <Text style={estilos.fichaPie}>quebró</Text> : null}
            {!j.quebrado && j.presa ? <Text style={estilos.fichaPie}>en la Comisaría</Text> : null}
            {j.seLeEspera && !j.esSuTurno ? <Text style={estilos.fichaPie}>se le espera</Text> : null}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/**
 * LA PUJA LIBRE: el campo por el que entra una cifra que no está en los tres
 * botones de escalón.
 *
 * Los tres botones —el mínimo, +50 y +100— son OPCIONES del juego y salen por
 * `LosBotones` de la sección; esto es la PUERTA, que no es un movimiento y no se
 * pinta como botón: pulsada tal cual, lo mejor que puede pasar es que el reductor
 * conteste con un motivo. Lo que hace este cuadro es componer con `montar`, que
 * escribe la carga con EXACTAMENTE los campos que la puerta declara y devuelve
 * `null` fuera de sus límites. Por eso «Pujar» se apaga solo: apagado significa
 * «esta cifra no cabe», y la cuenta de qué cabe no está aquí.
 *
 * El teclado es numérico y lo que se teclea se limpia de todo lo que no sea una
 * cifra: en Android el teclado de números trae coma y signo, y un «1.0,0» no es un
 * entero y `montar` lo rechazaría sin decir por qué.
 */
function LaPujaLibre({
  puja,
  quieto,
  alMandar,
}: {
  puja: PujaComponible<OpcionDeMesa>;
  quieto: boolean;
  alMandar: (m: MovimientoDeclarado) => void;
}): JSX.Element | null {
  const [tecleado, ponerTecleado] = useState('');
  const puerta = puja.puerta;
  /* Cuando la puerta se va —pasó el turno, se cerró la subasta— el campo se vacía. */
  useEffect(() => {
    if (puerta === null) ponerTecleado('');
  }, [puerta]);
  if (puerta === null) return null;
  const cuanto = Number.parseInt(tecleado, 10);
  const movimiento = Number.isNaN(cuanto) ? null : puja.montar(cuanto);
  const noSePuede = quieto || movimiento === null;
  return (
    <View style={estilos.pilaEstrecha}>
      <Text style={estilos.rotuloDeGrupo}>{`cuánto pujas (de ${String(puerta.escalon)} en ${String(puerta.escalon)})`}</Text>
      <View style={estilos.fila}>
        <TextInput
          style={estilos.campo}
          value={tecleado}
          onChangeText={(t) => {
            ponerTecleado(t.replace(/[^0-9]/g, ''));
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={7}
          placeholder={String(puerta.minimo)}
          placeholderTextColor={SALA.tenue}
          accessibilityLabel={`Cuánto pujas, entre ${maravedies(puerta.minimo)} y ${maravedies(puerta.maximo)}`}
        />
        <Pressable
          disabled={noSePuede}
          style={[estilos.boton, estilos.botonDeLaFila, noSePuede ? estilos.botonQuieto : null]}
          onPress={() => {
            if (movimiento !== null) alMandar(movimiento);
          }}
          accessibilityRole="button"
          accessibilityLabel="Pujar esa cifra"
          accessibilityState={{ disabled: noSePuede }}
        >
          <Text style={[estilos.botonRotulo, noSePuede ? estilos.botonRotuloQuieto : null]}>Pujar</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * EL COMPONEDOR DE TRATOS: con quién, lo que doy y lo que pido.
 *
 * La otra puerta del juego. `tratoEnTres.puerta` dice a quién se le puede proponer,
 * cuánto dinero cabe, qué títulos míos pueden ir y cuántos Salvoconductos; y de cada
 * destino, qué títulos suyos se pueden pedir SEGÚN LA VISTA. `montar` compone con
 * los campos exactos y devuelve `null` si algo no cabe —un título en los dos lados,
 * los dos lados vacíos, más dinero del que tengo—, así que «Proponer» apagado
 * quiere decir «esto no es un trato», y por qué no lo cuenta la ayuda de la puerta.
 *
 * El dinero se mueve de diez en diez con dos mandos y no con un campo: en un
 * teléfono, teclear una cifra encima de un tablero abre el teclado y se lleva media
 * pantalla, y un trato se compone mirando lo que el otro tiene.
 */
function ElComponedorDelTrato({
  trato,
  quieto,
  alMandar,
  nombreDeCasilla,
}: {
  trato: TratoComponible<OpcionDeMesa>;
  quieto: boolean;
  alMandar: (m: MovimientoDeclarado) => void;
  nombreDeCasilla: (casilla: number) => string;
}): JSX.Element | null {
  const [conQuien, ponerConQuien] = useState<string | null>(null);
  const [doy, ponerDoy] = useState<LadoQueSePinta>({ mrs: 0, titulos: [], indultos: 0 });
  const [pido, ponerPido] = useState<LadoQueSePinta>({ mrs: 0, titulos: [], indultos: 0 });
  const puerta = trato.puerta;
  /* Si la puerta se cierra —pasó el turno— lo compuesto deja de valer y se suelta. */
  useEffect(() => {
    if (puerta !== null) return;
    ponerConQuien(null);
    ponerDoy({ mrs: 0, titulos: [], indultos: 0 });
    ponerPido({ mrs: 0, titulos: [], indultos: 0 });
  }, [puerta]);
  if (puerta === null) return null;

  let destino: DestinoDelTrato | null = null;
  for (const d of puerta.a) if (d.asiento === conQuien) destino = d;
  const movimiento = destino === null ? null : trato.montar(destino.asiento, doy, pido);
  const noSePuede = quieto || movimiento === null;

  return (
    <View style={estilos.pila}>
      <Text style={estilos.rotuloDeGrupo}>con quién</Text>
      <View style={estilos.filaQueEnvuelve}>
        {puerta.a.map((d) => (
          <Pressable
            key={d.asiento}
            style={[estilos.mando, d.asiento === conQuien ? estilos.mandoElegido : null]}
            onPress={() => {
              ponerConQuien(d.asiento === conQuien ? null : d.asiento);
              ponerPido({ mrs: 0, titulos: [], indultos: 0 });
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: d.asiento === conQuien }}
            accessibilityLabel={d.nombre}
          >
            <View style={[estilos.discoChico, { backgroundColor: d.color }]} />
            <Text style={estilos.mandoRotulo}>{d.nombre}</Text>
          </Pressable>
        ))}
      </View>

      <ElLadoDelTrato
        rotulo="lo que das"
        lado={doy}
        ponerLado={ponerDoy}
        titulos={puerta.titulos}
        mrsMaximo={puerta.mrsMaximo}
        indultosMaximo={puerta.indultos}
        quieto={quieto}
        nombreDeCasilla={nombreDeCasilla}
      />
      <ElLadoDelTrato
        rotulo="lo que pides"
        lado={pido}
        ponerLado={ponerPido}
        titulos={destino === null ? [] : destino.titulos}
        mrsMaximo={MRS_QUE_SE_PUEDEN_PEDIR}
        indultosMaximo={destino === null ? 0 : destino.indultos}
        quieto={quieto}
        nombreDeCasilla={nombreDeCasilla}
      />

      <Pressable
        disabled={noSePuede}
        style={[estilos.boton, noSePuede ? estilos.botonQuieto : null]}
        onPress={() => {
          if (movimiento === null) return;
          alMandar(movimiento);
          ponerDoy({ mrs: 0, titulos: [], indultos: 0 });
          ponerPido({ mrs: 0, titulos: [], indultos: 0 });
        }}
        accessibilityRole="button"
        accessibilityLabel={puerta.rotulo}
        accessibilityHint={puerta.ayuda}
        accessibilityState={{ disabled: noSePuede }}
      >
        <Text style={[estilos.botonRotulo, noSePuede ? estilos.botonRotuloQuieto : null]}>{puerta.rotulo}</Text>
      </Pressable>
      <Text style={estilos.linea}>{puerta.ayuda}</Text>
    </View>
  );
}

/** Un lado del trato: dinero de diez en diez, títulos que se encienden, Salvoconductos. */
function ElLadoDelTrato({
  rotulo,
  lado,
  ponerLado,
  titulos,
  mrsMaximo,
  indultosMaximo,
  quieto,
  nombreDeCasilla,
}: {
  rotulo: string;
  lado: LadoQueSePinta;
  ponerLado: (l: LadoQueSePinta) => void;
  titulos: readonly number[];
  mrsMaximo: number;
  indultosMaximo: number;
  quieto: boolean;
  nombreDeCasilla: (casilla: number) => string;
}): JSX.Element {
  const menosDinero = lado.mrs - PASO_DEL_DINERO >= 0 ? lado.mrs - PASO_DEL_DINERO : null;
  const masDinero = lado.mrs + PASO_DEL_DINERO <= mrsMaximo ? lado.mrs + PASO_DEL_DINERO : null;
  const menosIndultos = lado.indultos > 0 ? lado.indultos - 1 : null;
  const masIndultos = lado.indultos + 1 <= indultosMaximo ? lado.indultos + 1 : null;
  return (
    <View style={estilos.pilaEstrecha}>
      <Text style={estilos.rotuloDeGrupo}>{rotulo}</Text>
      <View style={estilos.fila}>
        <Text style={estilos.lineaQueCede} numberOfLines={1}>
          {maravedies(lado.mrs)}
        </Text>
        <ElMando
          rotulo="−"
          seOye={`Quitar ${String(PASO_DEL_DINERO)} euros de ${rotulo}`}
          apagado={quieto || menosDinero === null}
          alPulsar={() => {
            if (menosDinero !== null) ponerLado({ ...lado, mrs: menosDinero });
          }}
        />
        <ElMando
          rotulo="+"
          seOye={`Poner ${String(PASO_DEL_DINERO)} euros más en ${rotulo}`}
          apagado={quieto || masDinero === null}
          alPulsar={() => {
            if (masDinero !== null) ponerLado({ ...lado, mrs: masDinero });
          }}
        />
      </View>
      <View style={estilos.fila}>
        <Text style={estilos.lineaQueCede} numberOfLines={1}>
          {`${String(lado.indultos)} ${lado.indultos === 1 ? 'Salvoconducto' : 'Salvoconductos'}`}
        </Text>
        <ElMando
          rotulo="−"
          seOye={`Quitar un Salvoconducto de ${rotulo}`}
          apagado={quieto || menosIndultos === null}
          alPulsar={() => {
            if (menosIndultos !== null) ponerLado({ ...lado, indultos: menosIndultos });
          }}
        />
        <ElMando
          rotulo="+"
          seOye={`Poner un Salvoconducto más en ${rotulo}`}
          apagado={quieto || masIndultos === null}
          alPulsar={() => {
            if (masIndultos !== null) ponerLado({ ...lado, indultos: masIndultos });
          }}
        />
      </View>
      <View style={estilos.filaQueEnvuelve}>
        {titulos.map((c) => {
          const puesto = lado.titulos.indexOf(c) >= 0;
          return (
            <Pressable
              key={c}
              disabled={quieto}
              style={[estilos.mando, puesto ? estilos.mandoElegido : null, quieto ? estilos.mandoQuieto : null]}
              onPress={() => {
                ponerLado({
                  ...lado,
                  titulos: puesto ? lado.titulos.filter((x) => x !== c) : [...lado.titulos, c],
                });
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: puesto, disabled: quieto }}
              accessibilityLabel={nombreDeCasilla(c)}
            >
              <Text style={[estilos.mandoRotulo, quieto ? estilos.mandoRotuloQuieto : null]} numberOfLines={1}>
                {nombreDeCasilla(c)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Un mando cuadrado de 44 con un glifo dentro. Apagado con color, nunca con opacidad. */
function ElMando({
  rotulo,
  seOye,
  apagado,
  alPulsar,
}: {
  rotulo: string;
  seOye: string;
  apagado: boolean;
  alPulsar: () => void;
}): JSX.Element {
  return (
    <Pressable
      disabled={apagado}
      style={[estilos.mandoCuadrado, apagado ? estilos.mandoQuieto : null]}
      onPress={alPulsar}
      accessibilityRole="button"
      accessibilityLabel={seOye}
      accessibilityState={{ disabled: apagado }}
    >
      <Text style={[estilos.mandoRotulo, apagado ? estilos.mandoRotuloQuieto : null]}>{rotulo}</Text>
    </Pressable>
  );
}

/** «Lo mío»: mis títulos por barrio, cada uno con su ficha y sus obras. */
function LoMio({
  barrios,
  quieto,
  alElegir,
}: {
  barrios: readonly BarrioDeLoMio<OpcionDeMesa>[];
  quieto: boolean;
  alElegir: (o: OpcionDeMesa) => void;
}): JSX.Element {
  if (barrios.length === 0) {
    return <Text style={estilos.linea}>Todavía no tienes ningún título.</Text>;
  }
  return (
    <View style={estilos.pila}>
      {barrios.map((b) => (
        <View key={b.id} style={estilos.pilaEstrecha}>
          <View style={estilos.fila}>
            <View style={[estilos.discoChico, { backgroundColor: b.color }]} />
            <Text style={estilos.rotuloDeGrupo}>{b.nombre}</Text>
          </View>
          {b.fichas.map((f) => (
            <LaFichaDeUnaCasilla key={f.casilla} ficha={f} quieto={quieto} alElegir={alElegir} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// La ficha de una casilla, que es la misma tarjeta en los dos sitios
// ---------------------------------------------------------------------------

/**
 * LA FICHA DE UNA CASILLA: nombre, barrio, precio, la tabla de rentas con la fila
 * de hoy, dueño, estado y sus obras.
 *
 * Es LA MISMA tarjeta en «Lo mío» y en la hoja que abre tocar una casilla del
 * anillo, y sus botones son LOS MISMOS objetos que la casilla tocable manda: la
 * traducción los devuelve por identidad, así que la obra tiene un botón —el de la
 * ficha— y un atajo —la casilla— y no dos botones. Eso está razonado en la
 * cabecera de `burgo-en-tres.ts` y aquí no se decide nada.
 *
 * ═══ Y AHORA ENSEÑA EL BARRIO ENTERO, QUE ES LO QUE SE MIRA ANTES DE COMPRAR ═══
 *
 * La tarjeta servía para «Lo mío» y se leía como si fuera de allí. Lo que le faltaba
 * para ser la tarjeta de una casilla AJENA —que es la mayoría de las cuarenta— era
 * decir cuánto le falta a alguien para el barrio entero: eso es lo que decide si
 * comprar el tercer solar de Los Paseos vale trescientos euros o la partida. Lo da
 * `solaresDelBarrio` de la traducción, con quién tiene cada uno y cuántas casas
 * lleva; aquí no se recuenta nada, que es la segunda cuenta que ese fichero existe
 * para evitar.
 */
export function LaFichaDeUnaCasilla({
  ficha,
  quieto,
  alElegir,
}: {
  ficha: FichaDeCasilla<OpcionDeMesa>;
  quieto: boolean;
  alElegir: (o: OpcionDeMesa) => void;
}): JSX.Element {
  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.fila}>
        {ficha.barrio === null ? null : <View style={[estilos.discoChico, { backgroundColor: ficha.barrio.color }]} />}
        <Text style={estilos.tarjetaNombre} numberOfLines={2}>
          {ficha.nombre}
        </Text>
      </View>
      {ficha.dueno === null ? null : (
        <View style={estilos.fila}>
          <View style={[estilos.discoChico, { backgroundColor: ficha.dueno.color }]} />
          <Text style={estilos.linea} numberOfLines={1}>
            {ficha.dueno.nombre}
          </Text>
        </View>
      )}
      <LasLineas lineas={ficha.lineas} />
      {ficha.rentas.length === 0 ? null : (
        <View style={estilos.tabla}>
          {ficha.rentas.map((r) => (
            <View key={r.rotulo} style={[estilos.renglon, r.actual ? estilos.renglonDeHoy : null]}>
              <Text style={[estilos.renglonRotulo, r.actual ? estilos.renglonRotuloDeHoy : null]} numberOfLines={1}>
                {r.rotulo}
              </Text>
              <Text style={[estilos.renglonCifra, r.actual ? estilos.renglonCifraDeHoy : null]}>
                {maravedies(r.cuanto)}
              </Text>
            </View>
          ))}
        </View>
      )}
      <LosSolaresDelBarrio solares={ficha.solaresDelBarrio} />
      <LosBotones opciones={ficha.opciones} quieto={quieto} alElegir={alElegir} />
    </View>
  );
}

/**
 * LOS SOLARES DEL BARRIO: uno por renglón, con quién lo tiene y cuántas casas
 * lleva, y el de ESTA casilla marcado.
 *
 * No es una lista tocable y a propósito: tocar aquí para saltar de una casilla a
 * otra sería una segunda manera de navegar el anillo dentro de una tarjeta que ya se
 * abrió tocando el anillo, y cada renglón tendría que pasar de 44. Es información,
 * se lee y se cierra. Vacío fuera de los solares —las estaciones y los servicios no
 * tienen barrio—, y entonces no se pinta ni el hueco.
 *
 * ═══ DE CADA SOLAR SE DICE DE QUIÉN ES Y SI ESTÁ HIPOTECADO, Y NADA MÁS ═══
 *
 * `SolarDelBarrio` trae también `casas`, que es un ENTERO: escribirlo aquí obligaría
 * a saber a partir de qué número deja de haber casas y hay hotel, o sea a copiar un
 * umbral del reglamento a un cliente. Un «· 5» sin esa cuenta se lee como cinco
 * casas y sería mentira justo en el solar más caro del barrio. De quién es cada uno
 * —que es lo que se mira antes de comprar— se dice entero, y lo que lleva encima ese
 * otro solar lo dice su propia tarjeta, a un toque en el anillo.
 */
function LosSolaresDelBarrio({ solares }: { solares: readonly SolarDelBarrio[] }): JSX.Element | null {
  if (solares.length === 0) return null;
  return (
    <View style={estilos.tabla}>
      {solares.map((s) => (
        <View key={s.casilla} style={[estilos.renglon, s.esEsta ? estilos.renglonDeHoy : null]}>
          <View
            style={[estilos.discoChico, { backgroundColor: s.dueno === null ? SALA.cifra : s.dueno.color }]}
          />
          <Text style={[estilos.renglonRotulo, s.esEsta ? estilos.renglonRotuloDeHoy : null]} numberOfLines={1}>
            {s.nombre}
          </Text>
          <Text style={[estilos.renglonCifra, s.esEsta ? estilos.renglonCifraDeHoy : null]} numberOfLines={1}>
            {`${s.dueno === null ? 'del Ayuntamiento' : s.dueno.nombre}${s.empenado ? ' · hipotecado' : ''}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * LA FICHA DE UN JUGADOR: lo que se sabe de él y por dónde se le propone un trato.
 *
 * Lo que tiene lo dice el marcador —dinero, títulos, patrimonio, si está preso o
 * quebró—; qué títulos suyos pueden entrar en un trato lo dice la PUERTA del trato
 * y sólo si el juego me la abrió, que no es lo mismo que lo que él tenga: un solar
 * con casas no se puede tratar y no sale. De aquí no se manda ningún movimiento:
 * el botón abre la sección del trato, donde está el componedor.
 */
export function LaFichaDelJugador({
  jugador,
  destino,
  nombreDeCasilla,
  alProponerle,
}: {
  jugador: JugadorDelMarcador;
  destino: DestinoDelTrato | null;
  nombreDeCasilla: (casilla: number) => string;
  alProponerle: (() => void) | null;
}): JSX.Element {
  return (
    <View style={estilos.pila}>
      <View style={estilos.fila}>
        <View style={[estilos.discoDelColor, { backgroundColor: jugador.color }]} />
        <Text style={estilos.tarjetaNombre} numberOfLines={1}>
          {jugador.soyYo ? `${jugador.nombre} (tú)` : jugador.nombre}
        </Text>
      </View>
      <Text style={estilos.linea}>{jugador.linea}</Text>
      <Text style={estilos.linea}>{`Patrimonio: ${maravedies(jugador.patrimonio)}.`}</Text>
      <Text style={estilos.linea}>{`Está en ${jugador.nombreDeLaCasilla}.`}</Text>
      {destino === null || destino.titulos.length === 0 ? null : (
        <View style={estilos.pilaEstrecha}>
          <Text style={estilos.rotuloDeGrupo}>títulos suyos que caben en un trato</Text>
          {destino.titulos.map((c) => (
            <Text key={c} style={estilos.linea}>
              {nombreDeCasilla(c)}
            </Text>
          ))}
        </View>
      )}
      {alProponerle === null ? null : (
        <Pressable
          style={estilos.boton}
          onPress={alProponerle}
          accessibilityRole="button"
          accessibilityLabel={`Proponerle un trato a ${jugador.nombre}`}
        >
          <Text style={estilos.botonRotulo}>Proponer trato</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// La tarjeta del final de la partida
// ---------------------------------------------------------------------------

/**
 * ═══ LA PARTIDA ACABABA Y LA PANTALLA NO LO DECÍA ═══
 *
 * Al quedar uno en pie, lo único que cambiaba era la frase de la cinta; quién se queda con el
 * Burgo, con cuánto patrimonio y quién quebró vivían en el marcador, dentro del cajón. Esta
 * tarjeta lo dice de una vez, con los mismos muebles que la ficha de un jugador: el disco del
 * color, la frase y un renglón por puesto. Lo redacta `finalEnTres` en la traducción —aquí no
 * se ordena ni se cuenta nada— y la pantalla la monta como una hoja más sobre el lienzo, con
 * su velo y su «Dejarlo», que es lo que la deja ir para mirar la ciudad.
 */
export function ElFinalDelBurgo({ final }: { final: FinalDelBurgo }): JSX.Element {
  return (
    <View style={estilos.pila}>
      <Text style={estilos.tarjetaNombre}>{final.frase}</Text>
      {final.paraMi.length === 0 ? null : <Text style={estilos.linea}>{final.paraMi}</Text>}
      <View style={estilos.pilaEstrecha}>
        {final.puestos.map((p) => (
          <View key={p.asiento} style={estilos.fila} accessible accessibilityLabel={p.linea}>
            <View style={[estilos.discoDelColor, { backgroundColor: p.color }]} />
            <Text style={estilos.linea}>{p.linea}</Text>
          </View>
        ))}
      </View>
      <Text style={estilos.linea}>{final.porque}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// El cartel de una casilla: dos renglones, sin abrir nada
// ---------------------------------------------------------------------------

/**
 * ═══ EL CARTEL DE LA CASILLA SEÑALADA ═══
 *
 * ═══ EL FALLO, Y POR QUÉ AQUÍ NO ES EL MISMO QUE EN EL PC ═══
 *
 * Para saber de quién es una casilla y cuánto cobra hoy había que TOCARLA, y tocarla
 * abría la tarjeta entera en una caja modal: una decisión de compra, una mirada al
 * barrio de enfrente y un «¿cuánto me va a costar caer ahí?» son veinte aperturas
 * por turno, cada una con su velo y su cierre. Lo que se quiere leer son dos
 * renglones.
 *
 * En el PC eso se arregla con un cartel al posar el cursor. Aquí NO HAY CURSOR, y la
 * traducción lo dice con todas las letras en la cabecera de `CartelDeCasilla`: un
 * cartel que aparece al posarse y se va solo «con el dedo no existe siquiera». Así
 * que el cartel del móvil no se posa: SE SEÑALA. Tocar una casilla en la que no hay
 * nada que hacer deja este cartel pegado al pie —dos renglones, sin velo, sin cierre
 * obligatorio, sin robar el foco—, y ahí se queda hasta que se señala otra. La
 * tarjeta entera sigue a UN toque: el cartel entero es el botón que la abre.
 *
 * ═══ Y NO SE SUELTA CUANDO CAMBIA LA REVISIÓN, AL REVÉS QUE LAS TRES HOJAS ═══
 *
 * Las hojas modales se sueltan en cada revisión porque llevan OPCIONES dentro, y una
 * opción compuesta con la revisión anterior se manda con algo que el servidor ya no
 * ofrece. Este cartel no lleva ninguna: se vuelve a redactar entero desde la vista
 * de ahora en cada repintado, así que no puede mentir, y hacerlo desaparecer cada
 * vez que juega cualquiera de los seis lo dejaría en pantalla dos segundos de cada
 * treinta.
 *
 * Las frases las escribe `cartelDeCasilla` y son LAS MISMAS que `fichaDeCasilla`
 * pone en su campo `cartel`: dos muebles que dicen lo mismo de la misma casilla no
 * pueden redactarlo dos veces.
 */
export function ElCartelDeLaCasilla({
  cartel,
  alVerLaFicha,
  alQuitar,
}: {
  cartel: CartelDeCasilla;
  alVerLaFicha: () => void;
  alQuitar: () => void;
}): JSX.Element {
  return (
    <View style={estilos.cartel}>
      <Pressable
        style={estilos.cartelDicho}
        onPress={alVerLaFicha}
        accessibilityRole="button"
        accessibilityLabel={cartel.frase}
        accessibilityHint="Abre su ficha entera"
      >
        {/*
          EL PUNTO LLEVA EL COLOR DE LA ACERA DEL BARRIO, y nada más. De quién es la
          casilla lo dice la SEGUNDA FRASE, que `cartelDeCasilla` ya redacta con el
          nombre del dueño: pintarlo además en el filo sería el mismo dato dos veces, y
          con el borde de uno que este cartel lleva —no los dos del carril— dos colores
          oscuros al lado se leen igual y no distinguirían nada. `cartel.colorDelDueno`
          viaja en el contrato y aquí no se usa a propósito.
        */}
        {cartel.color === null ? null : <View style={[estilos.discoChico, { backgroundColor: cartel.color }]} />}
        <View style={estilos.cartelFrases}>
          {cartel.frases.map((f, i) => (
            <Text
              key={`${String(i)}:${f}`}
              style={i === 0 ? estilos.cartelPrimera : estilos.cintaEspera}
              numberOfLines={2}
            >
              {f}
            </Text>
          ))}
        </View>
      </Pressable>
      <Pressable
        style={estilos.mandoCuadrado}
        onPress={alQuitar}
        accessibilityRole="button"
        accessibilityLabel="Quitar el cartel"
      >
        <Text style={estilos.mandoRotulo}>×</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// El cajón de la hoja, y la hoja pequeña que se abre encima del lienzo
// ---------------------------------------------------------------------------

/**
 * ═══ EL CAJÓN: LA HOJA ENTERA, SUBIENDO DESDE EL PIE ═══
 *
 * Desde que el tablero se lleva la pantalla entera, la hoja no puede ser una columna
 * debajo: sube cuando se pide y se va cuando se cierra, igual que el cajón del PC.
 * Lleva las CUATRO MITADES de una caja modal, escritas como se escriben en esta
 * plataforma:
 *
 *   · EL VELO es un `Pressable` que llena la pantalla y se come el toque. Sin él,
 *     cerrar el cajón deja el dedo sobre lo que hubiera debajo — y debajo hay un
 *     anillo que gira y cuarenta casillas que se tocan. No se anuncia (`accessible`
 *     en falso): es un cierre, no un botón que leer.
 *   · EL PAPEL Y EL NOMBRE van en `accessibilityViewIsModal` con su rótulo pintado,
 *     que además es el que se dice al abrir y al cerrar desde el asa.
 *   · LA TRAMPA DE FOCO no existe como tal en React Native: lo que hay es apagar de
 *     un golpe todo lo que queda debajo, y hacen falta LAS DOS mitades —
 *     `accessibilityElementsHidden` es de iOS y `importantForAccessibility` es de
 *     Android—; con una sola, en la otra plataforma el lector se sale del cajón y se
 *     pone a leer el tablero. Eso lo pone quien monta el cajón, sobre la vista que
 *     queda debajo, porque es esa vista la que hay que apagar.
 *   · Y EL FOCO VUELVE porque el asa —la cápsula del dinero, en la cinta— sigue
 *     exactamente donde estaba: cerrar no mueve nada de sitio.
 *
 * La lista de dentro se desplaza y ESCUCHA LOS TOQUES CON EL TECLADO ABIERTO
 * (`keyboardShouldPersistTaps`), que es el segundo fallo de esta tanda: sin eso, el
 * primer toque en «Pujar» sólo cierra el teclado y hay que pulsar dos veces. Con el
 * plazo de una subasta corriendo, eso es la subasta perdida.
 *
 * ═══ Y EL CAJÓN SUBE CON EL TECLADO, QUE ES EL MISMO CAMPO POR EL OTRO LADO ═══
 *
 * Aquel arreglo dejaba «Pujar» pulsable al primer toque, y quedaba el otro medio fallo
 * del ÚNICO campo de texto de la partida: que se pueda VER lo que se teclea. Este cajón
 * está pegado al borde de abajo de la pantalla (`tapaTodo` con `flex-end`) y no llega
 * al techo —86 % de alto—, así que lo de dentro se lee en la mitad de abajo. En Android
 * eso no importa: la ventana se redimensiona sola (`adjustResize`, el modo por defecto,
 * que esta app no cambia) y el cajón se encoge por encima del teclado. En iOS el teclado
 * NO redimensiona nada: se pone encima y se come unos 336 de los 845 puntos de un
 * teléfono en pie, o sea los 336 de abajo del cajón. Con la subasta abierta, el campo de
 * la puja y su «Pujar» caen ahí dentro: se escribe a ciegas una cifra que decide un
 * solar, con el plazo corriendo, y no hay error ni aviso ninguno.
 *
 * La receta es la de la casa y ya está medida en `piezas.tsx`: `KeyboardAvoidingView`
 * con `padding` SÓLO en iOS —en Android empuja dos veces y deja un hueco muerto encima
 * del teclado—. Con ella el cajón entero sube, en vez de que el campo se busque rodando
 * dentro de un marco que sigue medio tapado. Y el `maxHeight: '86%'` se mide contra lo
 * que quede, que es lo que hace que el cajón encoja en vez de salirse por arriba.
 */
export function ElCajonDeLaHoja({
  alCerrar,
  abajo,
  children,
}: {
  alCerrar: () => void;
  /** Lo que el sistema se queda abajo. Llega como número: los ganchos se leen una vez arriba. */
  abajo: number;
  children: ReactNode;
}): JSX.Element {
  return (
    <View style={estilos.tapaTodo}>
      <Pressable style={estilos.velo} onPress={alCerrar} accessible={false} />
      {/*
        EL MARCO QUE SUBE CON EL TECLADO. Ver la cabecera: en iOS el teclado se pone
        encima y se comería el campo de la puja; en Android la ventana ya se
        redimensiona sola y un `behavior` aquí empujaría dos veces. Va por DENTRO del
        velo para que el velo siga tapando la pantalla entera aunque el cajón suba.
      */}
      <KeyboardAvoidingView
        style={estilos.subeConElTeclado}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={estilos.cajon} accessibilityViewIsModal accessibilityLabel={LA_HOJA_DE_LA_PARTIDA}>
          <View style={estilos.cajonCabecera}>
            <Text style={estilos.sobreElLienzoRotulo}>{LA_HOJA_DE_LA_PARTIDA}</Text>
            <Pressable
              style={estilos.dejarlo}
              onPress={alCerrar}
              accessibilityRole="button"
              accessibilityLabel={CERRAR_LA_HOJA}
            >
              <Text style={estilos.dejarloRotulo}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView
            style={estilos.cajonLista}
            contentContainerStyle={{ paddingBottom: abajo + 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * UNA HOJA SOBRE EL LIENZO: una ficha pegada abajo con una pregunta y una salida.
 *
 * El mismo mueble que las tres hojas de Riberas —teja, contorno blanco al 40 %,
 * `accessibilityViewIsModal`, «Dejarlo» de salida— porque es la misma clase de
 * cosa: una pregunta que no puede llevarse el tablero de delante. Su lista se
 * DESPLAZA porque una ficha de casilla con seis rentas, los tres solares del barrio
 * y tres obras no cabe en el alto de un lienzo.
 *
 * Se monta HERMANA del `GestureDetector` y nunca dentro: un `Pressable` dentro del
 * detector le pelea el toque al giro del tablero.
 *
 * ═══ Y AHORA LLEVA VELO, QUE ES LA MITAD QUE LE FALTABA ═══
 *
 * Es una caja modal —lo dice ella misma con `accessibilityViewIsModal`— y no tenía
 * con qué comerse el toque: pulsar «Dejarlo» soltaba el dedo encima del anillo, que
 * está justo detrás, y el toque llegaba a una casilla. Con una obra posible eso no
 * abre nada: MANDA EL MOVIMIENTO. Cerrar una tarjeta no puede comprar un solar.
 *
 * ═══ LAS OTRAS DOS MITADES NO SON SUYAS, Y POR ESO NO ESTABAN ═══
 *
 * Con el velo eran DOS de las cuatro, y las dos que faltaban —la trampa de foco y la
 * devolución del foco— no se pueden escribir aquí dentro, igual que no se escriben
 * dentro del cajón: lo que hay que apagar es lo que queda DEBAJO, y eso lo monta quien
 * monta la hoja. `accessibilityViewIsModal` no vale por trampa y hay que decirlo con
 * todas las letras: es de iOS y sólo hace ignorar a los HERMANOS de esta vista, o sea
 * al velo y a nada más; en Android no atrapa nada en absoluto. Medido con «¿Qué haces
 * en Calle Mayor?» abierta, un lector salía a la cinta, al carril, a la caja de los
 * tratos y a «Salir» y «Tirar la mesa» de la barra de la mesa.
 *
 * Las pone `burgo-en-tres-escena.tsx` con `hayCajaModal`, sobre la columna entera y no
 * sobre la caja del lienzo; y por lo mismo estas hojas se montan FUERA de esa caja, que
 * es lo que hace que su velo llegue hasta la barra. El foco vuelve solo: nada de lo que
 * queda debajo se mueve de sitio mientras la hoja está puesta.
 */
export function LaHojaSobreElLienzo({
  titulo,
  alDejarlo,
  children,
}: {
  titulo: string;
  alDejarlo: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <View style={estilos.tapaTodo}>
      <Pressable style={estilos.velo} onPress={alDejarlo} accessible={false} />
      <View style={estilos.sobreElLienzo} accessibilityViewIsModal accessibilityLabel={titulo}>
        <Text style={estilos.sobreElLienzoRotulo}>{titulo}</Text>
        <ScrollView
          style={estilos.sobreElLienzoLista}
          contentContainerStyle={estilos.pila}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        <Pressable
          style={estilos.dejarlo}
          onPress={alDejarlo}
          accessibilityRole="button"
          accessibilityLabel="Dejarlo, sin hacer nada"
        >
          <Text style={estilos.dejarloRotulo}>Dejarlo</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

/*
 * Sólo el cromo de la Sala: `SALA`, `LETRA`, `BOTON`, `RADIO` y los alfas que
 * `conAlfa` saca de ellos. Ni un color inventado; los únicos colores que no salen
 * de la tabla son los de los JUGADORES y los de los BARRIOS, que vienen en la
 * vista y son datos del juego, no decoración.
 */
const estilos = StyleSheet.create({
  hoja: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  pila: { gap: 8 },
  pilaEstrecha: { gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filaQueEnvuelve: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  /*
   * LA CINTA: el turno y lo que pasa a la izquierda, mi dinero a la derecha. El
   * dicho cede (`flex: 1`) y la cifra no: un nombre largo no puede empujar fuera de
   * la pantalla lo único que se mira sin buscarlo.
   *
   * ═══ Y AHORA LLEVA CAJA, PORQUE YA NO SE PINTA SOBRE EL SUELO DE LA SALA ═══
   *
   * Mientras el pie iba en FLUJO debajo del lienzo, estos dos renglones caían sobre
   * `SALA.suelo` y no hacía falta nada: 16,74:1 el turno y 6,50:1 lo que pasa. Desde que
   * el pie FLOTA sobre la escena, debajo hay cielo, tejados y campo —un fondo que cambia
   * de color con el ángulo de la cámara—, y ahí los mismos dos colores caen a 1,47:1 el
   * turno sobre un cielo claro y a 1,12:1 lo que pasa sobre el campo verde: ilegibles, y
   * justo en lo único que se mira sin buscarlo. Es exactamente el motivo que «Ver el
   * burgo entero» ya tenía escrito para llevar fondo opaco. Sobre la teja vuelven a los
   * números de siempre (5,95:1 el tenue), que son los que la gramática mide.
   */
  cinta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.teja,
  },
  cintaDicho: { flex: 1, gap: 2 },
  cintaTurno: { ...LETRA.rotuloChico, color: SALA.palabra, fontSize: 13 },
  cintaEspera: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, lineHeight: 18 },
  /*
   * MI DINERO, con MI color en el contorno: el mismo del peón en el anillo. Y es
   * además el asa del cajón, así que pasa de 36 a los 44 de la casa: lo que se toca
   * no baja de ahí, y esto se toca cada vez que alguien quiere leer el marcador.
   * Contorno gris cuando no hay cifra —un mirón—: el color de un peón que no existe
   * no se puede pintar, pero el asa tiene que verse igual.
   */
  miDinero: {
    minWidth: DEDO,
    minHeight: DEDO,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: RADIO.mando,
    borderWidth: 2,
    borderColor: SALA.filoVivo,
    backgroundColor: SALA.teja,
  },
  miDineroCifra: {
    ...LETRA.dato,
    fontVariant: [...LETRA.dato.fontVariant],
    color: SALA.blanco,
    fontSize: 16,
  },
  /*
   * ═══ EL CARRIL: UNA TIRA DE CUADRADOS, Y LO QUE NO SE LLEVA DE ALTO ═══
   *
   * Rótulo de 13 y cuadrados de 44 con su renglón corto debajo: unos 84 puntos de
   * los 845 de un teléfono en pie, o sea el 10 %. Envolviendo en dos filas serían
   * 150 en un apuro de seis títulos, y esos 66 puntos se los quita al tablero justo
   * cuando hay que mirar el tablero para decidir qué se vende.
   *
   * Y con caja, por lo mismo que la cinta: el rótulo del mueble se pinta DE VERDAD —la
   * sección «Ahora» manda aquí con ese nombre escrito— y flotando sobre la escena un
   * `SALA.tenue` suelto cae a 1,12:1 sobre el campo. Los cuadrados ya traían el suyo;
   * el que nombra el mueble no tenía ninguno.
   */
  carril: {
    gap: 4,
    padding: 10,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.teja,
  },
  carrilFila: { gap: 8, paddingVertical: 2, alignItems: 'flex-start' },
  cuadrado: {
    minWidth: DEDO,
    minHeight: DEDO,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIO.mando,
    /*
     * EL FILO ES EL COLOR DE LA ACERA O EL DEL OTRO, y por eso el borde es de DOS y
     * no de uno: con un píxel, un verde y un azul oscuros al lado se leen igual, y
     * el filo es lo único que separa «vender Mayor» de «vender Acacias» cuando el
     * glifo de los dos es «Ve». Sin color, el blanco al 40 % de los demás mandos.
     */
    borderWidth: 2,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.tejaAlta,
  },
  cuadradoQuieto: { backgroundColor: BOTON.quieto.fondo, borderColor: BOTON.quieto.borde },
  glifo: { ...LETRA.rotulo, color: SALA.blanco, fontSize: 16 },
  glifoQuieto: { color: BOTON.quieto.tinta },
  glifoRotulo: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, maxWidth: 84 },
  glifoRotuloQuieto: { color: BOTON.quieto.tinta },
  /*
   * LA CAJA DE LOS TRATOS: no modal, pegada al pie y con tope de alto. Con tres
   * propuestas vivas a la vez —que en este juego pasa, porque se propone sin turno—
   * sin tope se comería el tablero entero; con tope, se desplaza por dentro.
   */
  /*
   * ═══ Y CEDE, PORQUE EN REACT NATIVE EL `flexShrink` POR DEFECTO ES CERO ═══
   *
   * Sin esta línea, esta caja se plantaba en sus 290 puntos de peor caso —tres tratos
   * vivos con el reloj debajo— y quien se recortaba era el mueble entero, por arriba,
   * contra el `overflow: hidden` de la caja del lienzo. Y no es cromo: la criba ya le ha
   * quitado a la sección «El trato» sus tres botones porque esta caja se pinta, así que
   * lo que se va con ella es contestar un trato — aceptar, rechazar y retirar sin un
   * solo botón en toda la pantalla, y sin un error en ninguna consola. Cediendo, quien
   * encoge es `cajaLista`, que ya tiene tope y rueda por dentro.
   */
  caja: {
    flexShrink: 1,
    gap: 6,
    padding: 10,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.teja,
  },
  cajaLista: { flexGrow: 0, flexShrink: 1, maxHeight: 220 },
  tira: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: SALA.filo,
    backgroundColor: SALA.tejaAlta,
    overflow: 'hidden',
  },
  tiraCuerpo: { flex: 1, gap: 4, paddingHorizontal: 10, paddingVertical: 8 },
  /*
   * EL CARTEL DE UNA CASILLA: dos renglones al pie, sin velo y sin foco. Es lo
   * contrario de una caja modal a propósito — se mira y se sigue jugando.
   */
  cartel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.teja,
  },
  cartelDicho: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: DEDO },
  cartelFrases: { flex: 1, gap: 2 },
  cartelPrimera: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 14, lineHeight: 20 },
  seccion: { gap: 6 },
  seccionMando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: DEDO,
    paddingHorizontal: 12,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
  },
  /*
   * Una sección sin nada que enseñar se apaga con los colores de `BOTON.quieto` y
   * NO con opacidad: apagar con opacidad apaga también el rótulo, y un rótulo en
   * tenue cae de 5,95 a 2,32:1. Sigue abriéndose: dice «aquí no hay nada», que es
   * distinto de no estar.
   */
  seccionMandoQuieto: { backgroundColor: BOTON.quieto.fondo, borderColor: BOTON.quieto.borde },
  seccionTitulo: { ...LETRA.rotuloChico, color: SALA.palabra, fontSize: 13 },
  seccionFlecha: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  seccionDentro: { gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  linea: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 14, lineHeight: 20 },
  lineaQueCede: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 14, lineHeight: 20, flex: 1 },
  rotuloDeGrupo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  /* 44 de alto: el mínimo de dedo de la casa. Sin acento: son la lista, no la acción. */
  boton: {
    minHeight: DEDO,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.tejaAlta,
  },
  botonDeLaFila: { minWidth: 96, alignItems: 'center' },
  botonQuieto: { backgroundColor: BOTON.quieto.fondo, borderColor: BOTON.quieto.borde },
  botonRotulo: { ...LETRA.rotulo, textTransform: 'none', color: SALA.blanco, fontSize: 16 },
  botonRotuloQuieto: { color: BOTON.quieto.tinta },
  botonAyuda: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, lineHeight: 18 },
  campo: {
    flex: 1,
    minHeight: DEDO,
    paddingHorizontal: 12,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
    ...LETRA.dato,
    fontVariant: [...LETRA.dato.fontVariant],
    color: SALA.palabra,
    fontSize: 16,
  },
  mando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: DEDO,
    maxWidth: 200,
    paddingHorizontal: 12,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.tejaAlta,
  },
  mandoCuadrado: {
    minWidth: DEDO,
    minHeight: DEDO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.tejaAlta,
  },
  /*
   * LO ELEGIDO SE VE POR EL CONTORNO Y NO POR UN RELLENO DE ACENTO: con cinco
   * títulos puestos habría cinco campos de acento en la misma caja y ninguno diría
   * «esto es lo que hay que tocar», que es lo único que el acento significa aquí.
   */
  mandoElegido: { borderColor: SALA.acento, backgroundColor: SALA.teja },
  mandoQuieto: { backgroundColor: BOTON.quieto.fondo, borderColor: BOTON.quieto.borde },
  mandoRotulo: { ...LETRA.rotulo, textTransform: 'none', color: SALA.blanco, fontSize: 16 },
  mandoRotuloQuieto: { color: BOTON.quieto.tinta },
  marcadorFila: { gap: 8, paddingVertical: 2, alignItems: 'flex-start' },
  fichaDelJugador: {
    flexDirection: 'row',
    minWidth: 140,
    maxWidth: 220,
    minHeight: DEDO,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
    overflow: 'hidden',
  },
  /* El marco del acento es de quien tiene el turno: lo vivo de esta cinta. */
  fichaDelJugadorEnTurno: { borderColor: SALA.acento, backgroundColor: SALA.tejaAlta },
  discoDelColor: { width: 4, alignSelf: 'stretch' },
  discoChico: { width: 12, height: 12, borderRadius: 6 },
  fichaCuerpo: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  fichaNombre: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  fichaCifra: {
    ...LETRA.dato,
    fontVariant: [...LETRA.dato.fontVariant],
    color: SALA.blanco,
    fontSize: 18,
  },
  fichaPie: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13 },
  tarjeta: {
    gap: 6,
    padding: 12,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
  },
  tarjetaNombre: { ...LETRA.rotulo, textTransform: 'none', color: SALA.palabra, fontSize: 16, flex: 1 },
  tabla: { gap: 2 },
  renglon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIO.mando,
  },
  /*
   * LA FILA DE HOY se marca con la teja alta y el contorno del acento, no con un
   * relleno de acento: sobre el acento vivo la tinta tendría que ser `SALA.suelo` y
   * una cifra en el color del suelo dentro de una tabla de cifras claras se lee
   * como un hueco.
   */
  renglonDeHoy: { backgroundColor: SALA.tejaAlta, borderWidth: 1, borderColor: SALA.acento },
  renglonRotulo: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, flex: 1 },
  renglonRotuloDeHoy: { color: SALA.palabra },
  renglonCifra: {
    ...LETRA.dato,
    fontVariant: [...LETRA.dato.fontVariant],
    color: SALA.palabra,
    fontSize: 14,
  },
  renglonCifraDeHoy: { color: SALA.blanco },
  /*
   * ═══ LO QUE TAPA LA PANTALLA ENTERA: EL VELO Y LO QUE VA ENCIMA ═══
   *
   * `tapaTodo` no pinta nada: es el marco absoluto donde el velo y la caja son
   * hermanos, y hace falta porque una caja modal son DOS cosas y en React Native no
   * hay forma de posicionar dos hermanos absolutos sin un padre que los enmarque.
   *
   * EL VELO SE VE, Y NO ES TRANSPARENTE. Un velo invisible se come el toque igual,
   * pero entonces la pantalla no dice que hay algo abierto: se ve el tablero entero y
   * no responde, que es la manera más rápida de que alguien crea que la app se ha
   * colgado. Es EL SUELO DE LA SALA al 72 % —no un negro inventado—: lo de debajo se
   * adivina y lo de encima se lee con el contraste de siempre.
   */
  tapaTodo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  velo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: conAlfa(SALA.suelo, 0.72) },
  /*
   * EL CAJÓN: sube desde el pie y se queda en el 86 % del alto. No llega al techo a
   * propósito: la franja de tablero que queda arriba es lo que dice que la partida
   * sigue ahí detrás y que el cajón se va tocando fuera, sin buscar el botón.
   */
  cajon: {
    maxHeight: '86%',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 10,
    borderTopLeftRadius: RADIO.ficha,
    borderTopRightRadius: RADIO.ficha,
    borderTopWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.pared,
  },
  /*
   * EL MARCO QUE SUBE CON EL TECLADO: llena `tapaTodo` y pega el cajón al pie, que es
   * lo que hacía antes el `justifyContent` del propio `tapaTodo`. Sin `flex: 1` no
   * tendría alto contra el que medir el 86 % del cajón ni contra el que descontar el
   * teclado, y con `box-none` el hueco de arriba —el que deja ver que la partida sigue
   * ahí detrás— lo sigue cogiendo el velo, que es quien cierra el cajón al tocarlo.
   */
  subeConElTeclado: { flex: 1, justifyContent: 'flex-end' },
  cajonCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  cajonLista: { flexGrow: 0, flexShrink: 1 },
  /*
   * La hoja pequeña encima del lienzo: pegada abajo y con márgenes, como las de
   * Riberas. Ya no se posiciona ella: es la hija de abajo del marco que trae el velo
   * (`tapaTodo`, con `justifyContent: 'flex-end'`), que es quien la pega al pie. Dos
   * cajas absolutas hermanas sin marco no hay forma de apilarlas.
   */
  sobreElLienzo: {
    marginHorizontal: 12,
    marginBottom: 12,
    gap: 8,
    padding: 14,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.teja,
  },
  sobreElLienzoRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  /*
   * La lista se desplaza y topa en 320: una ficha de solar lleva siete renglones de
   * renta, tres solares de barrio y hasta tres obras. Con 320 la hoja entera
   * —rótulo, lista y «Dejarlo»— se queda en unos 400, que en el lienzo entero de un
   * teléfono en pie (725 medidos) deja tablero visible por encima del velo.
   */
  sobreElLienzoLista: { flexGrow: 0, flexShrink: 1, maxHeight: 320 },
  dejarlo: { minHeight: DEDO, justifyContent: 'center', alignItems: 'center' },
  dejarloRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
});
