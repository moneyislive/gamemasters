/**
 * LA HOJA DEL MUELLE: el HUD que va ENCIMA del embarcadero, y que no depende de él.
 *
 * ═══ LO QUE ES Y LO QUE NO ES ═══
 *
 * Es la barra de arriba —«‹ Sala», el nombre del arcade, el raíl de aforo— y la
 * hoja de abajo, que ocupa el 36 % del alto y tiene tres estados: EN LA ORILLA
 * (nombre, figura, plazo, abrir, entrar con código), EN EL MUELLE (el código que
 * se comparte, quién está sentado, la llamada a zarpar, salir, tirar) y FIGURAS
 * (los seis aventureros, con la vista previa en la propia escena).
 *
 * NO sabe qué es un `Canvas`. Recibe la mesa, la figura y unas cuantas llamadas, y
 * pinta con `View` y `Text`. Es la regla del §5 de `docs/EL-MUELLE.md`: si el
 * mundo no arranca —un aparato sin `expo-gl`, un `.glb` que no llega— se abre, se
 * entra y se reparte igual sobre `SALA.suelo`, y se dice qué faltó. Por eso
 * `fallo` entra como un texto y no como un estado de la escena.
 *
 * ═══ EL ACENTO, CONTADO ═══
 *
 * Sólo donde el §5 lo pone: el botón que trae `opciones` («Repartir el delta»,
 * con su `ayuda` tal cual la escribe el juego), el piloto de presencia, la
 * figura elegida y «copiado». Más el código de la mesa y el botón de abrir, que
 * son los dos sitios donde `tablero-en-linea.tsx` ya lo tenía y por el mismo
 * motivo: el código es lo que se dicta para que venga alguien, y abrir es el
 * camino principal. Todo lo demás son los grises fríos y el filo de un píxel.
 *
 * ═══ VIDRIO Y NO TEJA MACIZA ═══
 *
 * La hoja lleva `teja` con alfa —`conAlfa`— porque va sobre la escena y la escena
 * es el motivo de la pantalla: una hoja opaca del 36 % se comería el agua y el
 * farol. El filo de un píxel sigue siendo lo único que la separa del mundo.
 *
 * ═══ LA HOJA PUBLICA SU ALTO ═══
 *
 * Por `onLayout`. La cámara de la escena sube el objetivo para que el aventurero
 * local quede ENTERO por encima de la hoja (`Ventana.franjaInferior`), y para eso
 * tiene que saber cuánto tapa. Un 36 % escrito a mano en los dos sitios se
 * separaría el día que alguien cambiara uno.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { servidorActual } from '../api';
import { conAlfa } from '../tema';
import { FIGURAS, figura as figuraPorId, figuraQueSePinta } from '../../../escenas/embarcadero/figuras';
import type { FiguraId } from '../../../escenas/embarcadero/figuras';
import type { TemaDelMuelle } from '../../../escenas/embarcadero/tema';
import { opcionDeEmpezar } from './empezada';
import type { LaMesa } from './mesa';
import { CUENTA_DE_AFORO, LETRA, RADIO, SALA } from './muebles';
/* La misma tabla que ofrece el tablero en línea: un solo sitio para los dos. */
import { PLAZOS } from './plazos';

/** Cuántas letras tiene un código de mesa. Las casillas son tantas como esto. */
const LETRAS_DEL_CODIGO = 5;

export interface PropsDeLaHoja {
  /** El identificador del arcade: va en el enlace que se comparte. */
  readonly arcade: string;
  /** Cómo se llama el arcade, para la barra y para el texto que se comparte. */
  readonly nombreDelArcade: string;
  readonly aforo: { readonly minimo: number; readonly maximo: number };
  readonly tema: TemaDelMuelle;
  readonly mesa: LaMesa;
  /** La figura elegida en este aparato, o `null` mientras se lee del disco. */
  readonly figura: FiguraId | null;
  readonly alElegirFigura: (id: FiguraId) => void;
  /** El alto medido de la hoja de abajo, para que la cámara encuadre. */
  readonly alMedirLaHoja: (alto: number) => void;
  /** Qué faltó del mundo, si algo faltó. `null` si el mundo está bien. */
  readonly fallo: string | null;
  /** La coreografía de zarpar está en marcha: la hoja lo dice y se aparta. */
  readonly zarpando: boolean;
}

/** Los dos planos del HUD: la barra de arriba y la hoja de abajo. */
export function HojaDelMuelle(props: PropsDeLaHoja): JSX.Element {
  const insets = useSafeAreaInsets();
  const [eligiendo, ponerEligiendo] = useState(false);
  const { mesa } = props;
  const sentados = mesa.fase === 'dentro' && mesa.mesa !== null ? mesa.mesa.asientos.length : null;

  const medir = useCallback(
    (e: LayoutChangeEvent) => props.alMedirLaHoja(e.nativeEvent.layout.height),
    [props.alMedirLaHoja],
  );

  let cuerpo: JSX.Element;
  if (props.zarpando) {
    cuerpo = <Zarpando tema={props.tema} />;
  } else if (mesa.fase === 'yendo') {
    cuerpo = (
      <View style={estilos.centro}>
        {/* La rueda es el piloto de «está pasando algo»: una de las cosas que el acento puede decir. */}
        <ActivityIndicator color={SALA.acento} />
        <Text style={estilos.texto}>Hablando con la mesa…</Text>
      </View>
    );
  } else if (eligiendo) {
    cuerpo = (
      <Figuras
        elegida={props.figura}
        alElegir={props.alElegirFigura}
        alCerrar={() => ponerEligiendo(false)}
      />
    );
  } else if (mesa.fase === 'dentro' && mesa.mesa !== null) {
    cuerpo = (
      <EnElMuelle
        arcade={props.arcade}
        nombreDelArcade={props.nombreDelArcade}
        tema={props.tema}
        mesa={mesa}
        codigo={mesa.mesa.codigo}
        asientos={mesa.mesa.asientos}
        yo={mesa.mesa.yo}
        alCambiarFigura={() => ponerEligiendo(true)}
      />
    );
  } else {
    cuerpo = (
      <EnLaOrilla mesa={mesa} figura={props.figura} alCambiarFigura={() => ponerEligiendo(true)} />
    );
  }

  return (
    <>
      <View style={[estilos.barra, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          style={estilos.volver}
          accessibilityRole="button"
          accessibilityLabel="Volver a la Sala de Arcade"
        >
          <Text style={estilos.volverRotulo}>‹ Sala</Text>
        </Pressable>
        <Text style={estilos.nombreDelArcade} numberOfLines={1}>
          {props.nombreDelArcade}
        </Text>
        <RailDeAforo aforo={props.aforo} sentados={sentados} />
      </View>

      <View style={[estilos.hoja, { paddingBottom: Math.max(insets.bottom, 12) }]} onLayout={medir}>
        {props.fallo !== null ? (
          /*
           * Lo que faltó, dicho aquí y no en un `console.warn`: la hoja sigue
           * funcionando entera sin el mundo, y quien la usa tiene derecho a saber
           * por qué ve un fondo liso en vez de un embarcadero.
           */
          <Text style={estilos.fallo} accessibilityRole="alert">
            El embarcadero no ha podido cargarse: {props.fallo}. Se puede abrir, entrar y repartir
            igual.
          </Text>
        ) : null}
        <ScrollView
          style={estilos.hojaCuerpo}
          contentContainerStyle={estilos.hojaContenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {cuerpo}
        </ScrollView>
      </View>
    </>
  );
}

/**
 * EL RAÍL DE AFORO, que aquí cuenta a los que han llegado.
 *
 * En la Sala las muescas encendidas son el mínimo para empezar; en el Muelle hay
 * una mesa delante y lo que se está mirando es cuánta gente hay YA: encendidas las
 * sentadas, tantas muescas como caben. En la orilla, sin mesa, vuelve a decir lo
 * que dice en la Sala. Las medidas son de `CUENTA_DE_AFORO`, como en todas partes.
 */
function RailDeAforo({
  aforo,
  sentados,
}: {
  aforo: { readonly minimo: number; readonly maximo: number };
  sentados: number | null;
}): JSX.Element {
  const encendidas = Math.min(sentados ?? aforo.minimo, aforo.maximo);
  const etiqueta =
    sentados === null
      ? `Aforo: de ${String(aforo.minimo)} a ${String(aforo.maximo)} jugadores`
      : `${String(sentados)} de ${String(aforo.maximo)} sentados`;
  return (
    <View style={estilos.rail} accessibilityRole="image" accessibilityLabel={etiqueta}>
      {Array.from({ length: aforo.maximo }, (_, i) => (
        <View
          key={i}
          style={[estilos.muesca, i < encendidas ? estilos.muescaEncendida : estilos.muescaApagada]}
        />
      ))}
    </View>
  );
}

/** Mientras se zarpa la hoja se aparta: una línea, y tocar salta. */
function Zarpando({ tema }: { tema: TemaDelMuelle }): JSX.Element {
  return (
    <View style={estilos.centro} accessible accessibilityRole="text">
      <Text style={estilos.titulo}>{tema.zarpar}</Text>
      <Text style={estilos.ayuda}>Toca la pantalla para ir directo a la mesa.</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// EN LA ORILLA
// ---------------------------------------------------------------------------

function EnLaOrilla({
  mesa,
  figura,
  alCambiarFigura,
}: {
  mesa: LaMesa;
  figura: FiguraId | null;
  alCambiarFigura: () => void;
}): JSX.Element {
  const [nombre, ponerNombre] = useState('');
  const [codigo, ponerCodigo] = useState('');
  const [plazo, ponerPlazo] = useState(0);
  /*
   * Qué código se envió ya, para que el efecto de abajo no lo mande dos veces:
   * cada respuesta de la mesa repinta, y el código sigue teniendo cinco letras.
   */
  const enviado = useRef<string | null>(null);

  const sinNombre = nombre.trim().length === 0;
  const noPuedeAbrir = mesa.quieto || sinNombre;
  const ficha = figura === null ? null : figuraPorId(figura);

  /*
   * ═══ LAS CINCO LETRAS SE ENVÍAN SOLAS ═══
   *
   * Un código se pega desde un chat o se teclea mirando otro móvil, y en los dos
   * casos el gesto de «ahora pulsa Sentarse» sobra: cinco letras y un nombre son
   * todo lo que hace falta, así que en cuanto están, se va. Si falta el nombre se
   * dice debajo, y se envía en cuanto se escriba. Si la entrada falla, la mesa
   * vuelve a `fuera` con su aviso y las casillas se quedan como estaban para
   * corregirlas; borrar una letra desarma el envío.
   */
  useEffect(() => {
    if (codigo.length < LETRAS_DEL_CODIGO) {
      enviado.current = null;
      return;
    }
    if (sinNombre || mesa.quieto || enviado.current === codigo) return;
    enviado.current = codigo;
    mesa.entrar(codigo, nombre.trim(), figura ?? undefined);
  }, [codigo, sinNombre, mesa, nombre, figura]);

  const escribirCodigo = (texto: string): void => {
    const limpio = texto
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, LETRAS_DEL_CODIGO);
    ponerCodigo(limpio);
  };

  return (
    <View style={estilos.orilla}>
      <TextInput
        style={estilos.campo}
        placeholder="Tu nombre en la mesa"
        placeholderTextColor={SALA.tenue}
        value={nombre}
        onChangeText={ponerNombre}
        maxLength={24}
        accessibilityLabel="Tu nombre en la mesa"
      />

      {/* La figura elegida: nombre y nota, y el botón que abre el estado de figuras. */}
      <View style={estilos.filaFigura}>
        <View style={estilos.figuraTexto}>
          <Text style={estilos.rotuloChico}>Tu aventurero</Text>
          <Text style={estilos.figuraNombre}>{ficha?.nombre ?? 'Eligiendo…'}</Text>
          {ficha !== null ? <Text style={estilos.ayudaIzquierda}>{ficha.nota}</Text> : null}
        </View>
        <Pressable
          style={estilos.mandoChico}
          onPress={alCambiarFigura}
          accessibilityRole="button"
          accessibilityLabel="Cambiar de aventurero"
        >
          <Text style={estilos.mandoChicoRotulo}>Cambiar</Text>
        </Pressable>
      </View>

      <Text style={estilos.o}>cuánto se espera por turno</Text>
      <View style={estilos.plazos}>
        {PLAZOS.map((p, i) => (
          <Pressable
            key={p.rotulo}
            style={[estilos.plazo, i === plazo ? estilos.plazoElegido : null]}
            onPress={() => ponerPlazo(i)}
            accessibilityRole="radio"
            accessibilityState={{ selected: i === plazo }}
            accessibilityLabel={`Plazo por turno: ${p.rotulo}`}
            accessibilityHint={p.ayuda}
          >
            <Text style={i === plazo ? estilos.plazoRotuloElegido : estilos.plazoRotulo}>
              {p.rotulo}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={estilos.ayuda}>{PLAZOS[plazo]?.ayuda ?? ''}</Text>

      <Pressable
        style={[estilos.boton, noPuedeAbrir ? estilos.botonQuieto : estilos.botonVivo]}
        disabled={noPuedeAbrir}
        onPress={() => mesa.abrir(nombre.trim(), PLAZOS[plazo]?.segundos, figura ?? undefined)}
        accessibilityRole="button"
        accessibilityLabel="Abrir una mesa"
        accessibilityState={{ disabled: noPuedeAbrir }}
      >
        <Text style={[estilos.botonRotulo, noPuedeAbrir ? null : estilos.botonRotuloVivo]}>
          Abrir una mesa
        </Text>
      </Pressable>

      <Text style={estilos.o}>o entra con el código</Text>
      <CasillasDelCodigo codigo={codigo} alEscribir={escribirCodigo} />
      {codigo.length === LETRAS_DEL_CODIGO && sinNombre ? (
        <Text style={estilos.ayuda}>Escribe tu nombre y el código se envía solo.</Text>
      ) : null}
      {mesa.aviso.length > 0 ? <Text style={estilos.fallo}>{mesa.aviso}</Text> : null}
    </View>
  );
}

/**
 * CINCO CASILLAS Y UN SOLO CAMPO. Lo que se ve son cinco cajas; lo que recibe el
 * teclado y el portapapeles es UN `TextInput` transparente encima de ellas. Con
 * cinco campos de una letra, pegar «ABCDE» dejaría la «A» en la primera y las
 * otras cuatro en ningún sitio; con uno, el pegado entra entero y las cajas
 * pintan lo que hay. Para un lector de pantalla es un campo con una etiqueta,
 * que es lo que es.
 */
function CasillasDelCodigo({
  codigo,
  alEscribir,
}: {
  codigo: string;
  alEscribir: (texto: string) => void;
}): JSX.Element {
  const [conFoco, ponerConFoco] = useState(false);
  return (
    <View style={estilos.casillas}>
      {Array.from({ length: LETRAS_DEL_CODIGO }, (_, i) => {
        const letra = codigo[i] ?? '';
        const activa = conFoco && i === Math.min(codigo.length, LETRAS_DEL_CODIGO - 1);
        return (
          <View
            key={i}
            style={[estilos.casilla, activa ? estilos.casillaActiva : null]}
            importantForAccessibility="no"
          >
            <Text style={estilos.casillaLetra}>{letra}</Text>
          </View>
        );
      })}
      <TextInput
        style={estilos.campoInvisible}
        value={codigo}
        onChangeText={alEscribir}
        onFocus={() => ponerConFoco(true)}
        onBlur={() => ponerConFoco(false)}
        autoCapitalize="characters"
        autoCorrect={false}
        /* Más largo que el código para que un pegado con espacios entre y se limpie. */
        maxLength={LETRAS_DEL_CODIGO * 2}
        accessibilityLabel="Código de la mesa, cinco letras"
        accessibilityHint="Se envía solo en cuanto están las cinco y tienes nombre"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// EN EL MUELLE
// ---------------------------------------------------------------------------

function EnElMuelle({
  arcade,
  nombreDelArcade,
  tema,
  mesa,
  codigo,
  asientos,
  yo,
  alCambiarFigura,
}: {
  arcade: string;
  nombreDelArcade: string;
  tema: TemaDelMuelle;
  mesa: LaMesa;
  codigo: string;
  asientos: ReadonlyArray<{ id: string; nombre: string; presente: boolean; figura?: string }>;
  yo: string | null;
  alCambiarFigura: () => void;
}): JSX.Element {
  const [copiado, ponerCopiado] = useState(false);
  const empezar = opcionDeEmpezar(mesa.mesa?.opciones);

  /*
   * ═══ COMPARTIR, Y COPIAR CUANDO NO SE PUEDE COMPARTIR ═══
   *
   * `expo-clipboard` no está en `app/package.json` y esta entrega no añade
   * dependencias, así que el gesto principal es `Share` de React Native: en el
   * móvil abre la hoja del sistema con el texto y el enlace. En la web, `Share`
   * sólo existe donde el navegador tiene `navigator.share`; donde no —un
   * escritorio con Chrome, por ejemplo— se cae al portapapeles del navegador y se
   * dice «copiado», que es una de las cuatro cosas que el acento puede decir.
   */
  const compartir = async (): Promise<void> => {
    const enlace = `${servidorActual()}/sala/${encodeURIComponent(arcade)}?codigo=${codigo}`;
    const texto = `Siéntate conmigo en ${nombreDelArcade}: código ${codigo}\n${enlace}`;
    try {
      await Share.share({ message: texto });
      return;
    } catch {
      /* Sin hoja del sistema: se intenta el portapapeles, abajo. */
    }
    try {
      const portapapeles = (
        globalThis as { navigator?: { clipboard?: { writeText?: (t: string) => Promise<void> } } }
      ).navigator?.clipboard;
      if (portapapeles?.writeText === undefined) return;
      await portapapeles.writeText(texto);
      ponerCopiado(true);
      setTimeout(() => ponerCopiado(false), 2000);
    } catch {
      /* Ni portapapeles: el código sigue en pantalla, en grande, para dictarlo. */
    }
  };

  return (
    <View style={estilos.muelle}>
      <Text style={estilos.rotuloChico}>{tema.lugar} · mesa</Text>
      <Pressable
        onPress={() => void compartir()}
        style={estilos.codigoCaja}
        accessibilityRole="button"
        accessibilityLabel={`Código de la mesa: ${codigo.split('').join(' ')}. Toca para compartirlo`}
      >
        <Text style={estilos.codigo}>{codigo}</Text>
        <Text style={copiado ? estilos.copiado : estilos.ayuda}>
          {copiado ? 'copiado' : 'toca para compartir el código'}
        </Text>
      </Pressable>

      <View style={estilos.sentados} accessibilityRole="list">
        {asientos.map((a) => {
          const mio = a.id === yo;
          const suFigura = figuraPorId(figuraQueSePinta(a.id, a.figura));
          return (
            <View
              key={a.id}
              style={estilos.sentado}
              accessible
              accessibilityLabel={`${a.nombre}${mio ? ', tú' : ''}, ${suFigura.nombre}${a.presente ? '' : ', fuera'}`}
            >
              {/* El piloto de presencia: acento macizo si está, en hueco si no. */}
              <View style={[estilos.piloto, a.presente ? estilos.pilotoVivo : estilos.pilotoFrio]} />
              <Text style={[estilos.sentadoNombre, mio ? estilos.sentadoMio : null]} numberOfLines={1}>
                {a.nombre}
                {mio ? ' · tú' : ''}
              </Text>
              <Text style={estilos.sentadoFigura} numberOfLines={1}>
                {suFigura.nombre}
              </Text>
            </View>
          );
        })}
      </View>

      {/*
        ═══ LA LLAMADA A ZARPAR ES EL BOTÓN DEL JUEGO, TAL CUAL ═══

        Se pinta la opción de empezar que manda `opciones`, con su `rotulo` y su
        `ayuda`, y se envía `tipo` y `carga` como vienen. Este fichero no traduce
        ni una cadena: es lo que lo mantiene servible para el siguiente arcade con
        muelle. Y es el ÚNICO botón de acento de este estado.

        Si el juego rechaza —dos sentados hacen falta y hay uno— el motivo llega
        en `mesa.aviso` por el canal de `motivo`, y se pinta debajo.
      */}
      {empezar !== undefined ? (
        <Pressable
          style={[estilos.boton, mesa.quieto ? estilos.botonQuieto : estilos.botonVivo]}
          disabled={mesa.quieto}
          onPress={() => mesa.mover({ tipo: empezar.tipo, carga: empezar.carga })}
          accessibilityRole="button"
          accessibilityLabel={empezar.rotulo}
          accessibilityHint={empezar.ayuda.length > 0 ? empezar.ayuda : undefined}
          accessibilityState={{ disabled: mesa.quieto }}
        >
          <Text style={[estilos.botonRotulo, mesa.quieto ? null : estilos.botonRotuloVivo]}>
            {empezar.rotulo}
          </Text>
          {empezar.ayuda.length > 0 ? <Text style={estilos.botonAyuda}>{empezar.ayuda}</Text> : null}
        </Pressable>
      ) : (
        <Text style={estilos.ayuda}>{tema.espera}</Text>
      )}
      {mesa.aviso.length > 0 ? <Text style={estilos.fallo}>{mesa.aviso}</Text> : null}

      <View style={estilos.mandos}>
        <Pressable
          style={estilos.mandoChico}
          onPress={alCambiarFigura}
          accessibilityRole="button"
          accessibilityLabel="Cambiar de aventurero"
        >
          <Text style={estilos.mandoChicoRotulo}>Figura</Text>
        </Pressable>
        <View style={estilos.aire} />
        {/*
          SALIR Y TIRAR, COMO EN `BarraDeLaMesa`: iguales y con filo, porque quién
          de los dos es el peligroso lo dice la pregunta que sale al pulsar y no el
          color. Salir cierra esta hoja y te deja el asiento; tirar acaba la mesa
          para todos, y por eso pregunta antes.
        */}
        <Pressable
          style={estilos.mandoChico}
          onPress={mesa.salir}
          accessibilityRole="button"
          accessibilityLabel="Salir del muelle sin dejar la mesa"
        >
          <Text style={estilos.mandoChicoRotulo}>Salir</Text>
        </Pressable>
        <Pressable
          style={estilos.mandoChico}
          onPress={() => {
            Alert.alert('¿Tirar la mesa?', 'Se acaba la partida para todos los que estén sentados.', [
              { text: 'No', style: 'cancel' },
              { text: 'Tirarla', style: 'destructive', onPress: mesa.tirar },
            ]);
          }}
          accessibilityRole="button"
          accessibilityLabel="Tirar la mesa para todos"
        >
          <Text style={estilos.mandoChicoRotulo}>Tirar la mesa</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// FIGURAS
// ---------------------------------------------------------------------------

/**
 * Los seis, en dos columnas. Tocar uno lo pone en la escena AL INSTANTE —quien
 * nos llama lo pasa como `figuraQuePruebo`— lo guarda en el aparato y, si
 * estamos sentados, lo viste en la mesa. La vista previa es la propia escena y
 * no un retrato: por eso aquí no hay dibujo, sólo nombre y nota.
 */
function Figuras({
  elegida,
  alElegir,
  alCerrar,
}: {
  elegida: FiguraId | null;
  alElegir: (id: FiguraId) => void;
  alCerrar: () => void;
}): JSX.Element {
  return (
    <View style={estilos.figuras}>
      <View style={estilos.figurasCabecera}>
        <Text style={estilos.titulo}>Elige tu aventurero</Text>
        <Pressable
          style={estilos.mandoChico}
          onPress={alCerrar}
          accessibilityRole="button"
          accessibilityLabel="Cerrar la elección de aventurero"
        >
          <Text style={estilos.mandoChicoRotulo}>Listo</Text>
        </Pressable>
      </View>
      <View style={estilos.rejilla} accessibilityRole="radiogroup">
        {FIGURAS.map((f) => {
          const es = f.id === elegida;
          return (
            <Pressable
              key={f.id}
              style={[estilos.figuraFicha, es ? estilos.figuraFichaElegida : null]}
              onPress={() => alElegir(f.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: es }}
              accessibilityLabel={f.nombre}
              accessibilityHint={f.nota}
            >
              <Text style={[estilos.figuraNombre, es ? estilos.figuraNombreElegida : null]}>
                {f.nombre}
              </Text>
              <Text style={estilos.ayudaIzquierda}>{f.nota}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/*
 * ═══ LOS ESTILOS: LAS TRES REGLAS DE `tablero-en-linea.tsx`, Y UNA MÁS ═══
 *
 * Sin materia, sin `fontFamily`, sin un color suelto. Y la cuarta, propia de
 * aquí: lo que va sobre la escena lleva alfa por `conAlfa`, nunca un `rgba`
 * escrito a mano, para que repintar la Sala siga siendo tocar tres valores.
 *
 * 44 de alto en todo lo que se toca y 13 de texto en todo lo que se lee.
 */
const estilos = StyleSheet.create({
  /* ---------- La barra de arriba ---------- */
  barra: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: conAlfa(SALA.suelo, 0.55),
    borderBottomWidth: 1,
    borderBottomColor: SALA.filo,
  },
  volver: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  volverRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  nombreDelArcade: { ...LETRA.rotulo, color: SALA.palabra, fontSize: 15, flex: 1, textAlign: 'center' },
  rail: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 19,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: SALA.filo,
  },
  muesca: { width: CUENTA_DE_AFORO.grosor, borderRadius: 2 },
  muescaEncendida: { height: CUENTA_DE_AFORO.altoEncendida, backgroundColor: SALA.acento },
  muescaApagada: { height: CUENTA_DE_AFORO.altoApagada, backgroundColor: SALA.filoVivo },

  /* ---------- La hoja de abajo: vidrio teja del 36 % ---------- */
  hoja: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '36%',
    backgroundColor: conAlfa(SALA.teja, 0.88),
    borderTopWidth: 1,
    borderTopColor: SALA.filoVivo,
    borderTopLeftRadius: RADIO.ficha,
    borderTopRightRadius: RADIO.ficha,
    overflow: 'hidden',
  },
  hojaCuerpo: { flex: 1 },
  hojaContenido: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 10 },
  centro: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },

  /* ---------- Texto ---------- */
  titulo: { ...LETRA.rotulo, color: SALA.palabra, fontSize: 15 },
  texto: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  rotuloChico: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  o: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13, marginTop: 4, textAlign: 'center' },
  ayuda: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  ayudaIzquierda: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, lineHeight: 18 },
  /* «Copiado» es una de las cuatro cosas que el acento puede decir. */
  copiado: { ...LETRA.rotuloChico, color: SALA.acento, fontSize: 13, textAlign: 'center' },
  /* El aviso no es una alarma: `tenue`, como en el tablero. */
  fallo: {
    ...LETRA.cuerpo,
    color: SALA.tenue,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    textAlign: 'center',
  },

  /* ---------- Campos y mandos ---------- */
  campo: {
    width: '100%',
    backgroundColor: conAlfa(SALA.suelo, 0.5),
    color: SALA.palabra,
    borderColor: SALA.filoVivo,
    borderWidth: 1,
    borderRadius: RADIO.mando,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    minHeight: 44,
  },
  boton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: SALA.filoVivo,
    borderWidth: 1,
    borderRadius: RADIO.mando,
    paddingVertical: 10,
    paddingHorizontal: 22,
    gap: 2,
    overflow: 'hidden',
  },
  /* `acentoHondo` de campo y `acento` de filo: la placa de la maqueta, con 6,4:1 de contraste. */
  botonVivo: { backgroundColor: SALA.acentoHondo, borderColor: SALA.acento },
  botonQuieto: { borderColor: SALA.filo, opacity: 0.5 },
  botonRotulo: { ...LETRA.rotuloChico, color: SALA.palabra, fontSize: 15 },
  botonRotuloVivo: { color: SALA.blanco, fontWeight: '800' },
  botonAyuda: { ...LETRA.cuerpo, color: SALA.blanco, fontSize: 13, lineHeight: 18, textAlign: 'center', opacity: 0.85 },
  mandoChico: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderColor: SALA.filoVivo,
    borderWidth: 1,
    borderRadius: RADIO.mando,
  },
  mandoChicoRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  mandos: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  aire: { flex: 1 },

  /* ---------- En la orilla ---------- */
  orilla: { gap: 10 },
  filaFigura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    /* La figura elegida lleva el acento en el filo: es lo que está elegido. */
    borderColor: SALA.acento,
    backgroundColor: conAlfa(SALA.suelo, 0.35),
  },
  figuraTexto: { flex: 1, gap: 2 },
  figuraNombre: { ...LETRA.rotulo, color: SALA.palabra, fontSize: 15 },
  plazos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  plazo: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderColor: SALA.filo,
    borderWidth: 1,
    borderRadius: RADIO.mando,
    backgroundColor: conAlfa(SALA.suelo, 0.35),
  },
  /*
   * El plazo elegido se marca con el filo vivo y la teja alta, NO con el acento:
   * el §5 reserva el acento a lo que está vivo o zarpa, y un chip de ajuste no es
   * ninguna de las dos cosas. La primera versión lo pintaba de violeta.
   */
  plazoElegido: { borderColor: SALA.filoVivo, backgroundColor: SALA.tejaAlta },
  plazoRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  plazoRotuloElegido: { ...LETRA.rotuloChico, color: SALA.palabra, fontSize: 13, fontWeight: '800' },
  casillas: { flexDirection: 'row', justifyContent: 'center', gap: 8, position: 'relative' },
  casilla: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: SALA.filoVivo,
    backgroundColor: conAlfa(SALA.suelo, 0.5),
  },
  /* La casilla que va a recibir la letra: filo vivo, no acento. Un campo no está «elegido». */
  casillaActiva: { borderColor: SALA.palabra },
  casillaLetra: { ...LETRA.rotulo, color: SALA.blanco, fontSize: 22, letterSpacing: 0 },
  /*
   * El campo de verdad, invisible y encima de las casillas. `opacity: 0` y no
   * `display: none`: un campo que no se pinta tampoco recibe el foco.
   */
  campoInvisible: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 16,
    color: SALA.palabra,
  },

  /* ---------- En el muelle ---------- */
  muelle: { gap: 10 },
  codigoCaja: { alignItems: 'center', gap: 2, paddingVertical: 4 },
  /* El código, grande y con tracking: es lo que se dicta para que venga alguien. */
  codigo: { ...LETRA.rotulo, color: SALA.acento, fontSize: 36, lineHeight: 42, letterSpacing: 8 },
  sentados: { gap: 6 },
  sentado: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  piloto: { width: 8, height: 8, borderRadius: 4 },
  pilotoVivo: { backgroundColor: SALA.acento },
  pilotoFrio: { borderWidth: 1, borderColor: SALA.cifra },
  sentadoNombre: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 15, flexShrink: 1 },
  sentadoMio: { fontWeight: '700' },
  sentadoFigura: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13, marginLeft: 'auto' },

  /* ---------- Figuras ---------- */
  figuras: { gap: 12 },
  figurasCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  figuraFicha: {
    /* Dos columnas: la mitad menos medio hueco. */
    width: '48.5%',
    minHeight: 64,
    padding: 10,
    gap: 2,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: SALA.filo,
    backgroundColor: conAlfa(SALA.suelo, 0.35),
  },
  figuraFichaElegida: { borderColor: SALA.acento },
  figuraNombreElegida: { color: SALA.blanco },
});
