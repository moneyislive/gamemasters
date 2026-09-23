/**
 * EL CONTRATO DE PINTOR EN LA APP: lo que la plataforma le da a una pantalla de mesa en tres
 * dimensiones, y lo único que se queda cada juego.
 *
 * ═══ EN EL ESCRITORIO ESTO YA EXISTÍA, Y EN LA APP ERA TRES COPIAS ═══
 *
 * La Sala del escritorio pinta el vestíbulo, los plazos y el raíl UNA vez y monta cada pintor
 * con `LoQueVeElPintor` (`escritorio/src/pintores.ts`): el pintor pinta su escena y nada más.
 * En la app, `LOS_QUE_PINTA` (`pintados.ts`) es una tabla de componentes SIN props, y cada
 * pantalla —Riberas, el Burgo, Las Lindes— volvía a escribir la mesa, el vestíbulo de abrir o
 * entrar con su plazo, el latido de la cuenta atrás y los nombres, la red bajo el lienzo, el
 * respaldo al retablo, el telón, la calidad y la barra. Entre el 19 % y el 55 % de cada
 * envoltorio era eso.
 *
 * Y las copias ya se habían separado, que es lo que hace siempre una copia. La de Las Lindes no
 * tenía selector de plazo —desde el móvil sólo se abrían mesas del plazo por defecto—, su red no
 * apuntaba el fallo en el parte, su botón de abrir decía «Volcar la bolsa» —que es EMPEZAR la
 * partida, no abrir la mesa— y su respaldo no decía de quién era el turno ni por qué se estaba
 * jugando sobre el retablo. Ninguna de las cuatro era una decisión: eran cosas que la tercera
 * copia no copió.
 *
 * ═══ LO QUE DA ESTE FICHERO ═══
 *
 *   · `LaMesaDeUnPintor`: la pantalla entera hasta que hay mesa —la rueda de «Hablando con la
 *     mesa…» y el vestíbulo con su plazo— y, sentados, el latido y los nombres. Monta al pintor
 *     con `LoQueVeElPintor`, que le lleva la barra de la mesa ya hecha.
 *   · `RedDelLienzo`: si el lienzo revienta AL PINTAR, apunta el fallo en el parte y avisa.
 *   · `ElTelon`: lo que tapa el lienzo mientras el mundo no ha llegado.
 *   · `usarLaCalidadDelAparato`: `plena` o `sobria`, medida con el juez de la casa.
 *   · `ElRespaldo`: la mesa de siempre sobre el retablo, con la nota de por qué.
 *
 * ═══ Y LO QUE SE QUEDA CADA JUEGO ═══
 *
 * Su escena y lo que sólo tiene sentido con ella: sus cámaras, sus hojas, su mano, su pie, cuándo
 * cae al respaldo y qué nota pone. Riberas y el Burgo siguen pintando su PROPIO respaldo —el
 * pregón, el componedor y el marcador el uno; el pie, el cajón y las hojas el otro—, porque sobre
 * el retablo se juega la partida entera y esos muebles son suyos. `ElRespaldo` es el de quien no
 * tiene nada propio que poner encima: hoy Las Lindes, mañana el juego siguiente. Y el telón y la
 * calidad son piezas que se piden y no se imponen: el valle de Las Lindes se puede jugar antes de
 * que lleguen los modelos, así que taparlo con un telón sería quitar una partida que ya se puede
 * jugar; y su calidad se juzga a cada muestra porque su tablero crece, con el controlador que
 * comparte con el escritorio (`escenas/lindes/el-valle-en-la-mesa.ts`).
 *
 * ═══ POR QUÉ LA BARRA LLEGA HECHA, Y NO SUS PIEZAS ═══
 *
 * Por lo mismo que `elRail` en el escritorio: la barra es la identidad de la mesa —qué juego,
 * qué código, cómo se sale y si es de Boots on Board— y se escribía hasta TRES veces por
 * pantalla, una por rama. Hecha aquí, una rama nueva no puede olvidarse de `deBotas` ni del área
 * segura: pone `{laBarra}` y ya está.
 *
 * ═══ EL ESTADO DEL VESTÍBULO VIVE ARRIBA, Y NO ES UN DESCUIDO ═══
 *
 * El nombre, el código y el plazo se guardan en la pantalla y no en un componente del
 * vestíbulo: al pulsar «Abrir una mesa» la fase pasa por `yendo` —otra rama— y, si el servidor
 * dice que no, vuelve a `fuera`. Con el estado dentro del vestíbulo, ese viaje lo desmontaría y
 * quien acaba de fallar tendría que volver a escribir su nombre.
 *
 * ═══ Y AQUÍ NO HAY NI `three` NI UN JUEGO ═══
 *
 * Este fichero no nombra ningún arcade ni importa ninguna escena: lo importan las pantallas de
 * cada juego, que son las que entran perezosas (`pantalla-perezosa.tsx`). Lo que trae detrás es
 * lo que la portada ya carga —la mesa, el mueble genérico, el retablo— y el juez de la calidad,
 * que son veinte líneas de números: nada de eso arrastra `three` a ninguna parte.
 */
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, ErrorInfo, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { manifiestoDeArcadeSiExiste } from '../../../shared/arcade';
import type { ArcadeId } from '../../../shared/arcade';
/* Instala los arcades del binario, por si se llega aquí por enlace directo. Ver `pintar.tsx`. */
import '../../../shared/arcade/juegos';
import { opcionesSueltas, tableroDeLaVista } from '../../../shared/mecanicas/tablero-declarado';
import { juzgarCalidad } from '../../../escenas/embarcadero/calidad';
import type { MuestraDelHilo } from '../../../escenas/embarcadero/calidad';
import type { Calidad } from '../../../escenas/embarcadero/tipos';
import { esMesaDeBotas } from '../../../escenas/paseo/mesa-de-botas';
import { apuntarFallo } from '../parte-de-fallos';
import { usarMesaDeArcade } from './mesa';
import type { LaMesa, MesaVista } from './mesa';
import { LETRA, SALA } from './muebles';
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

/**
 * LO QUE LA PLATAFORMA LE DA A UN PINTOR. El espejo de `LoQueVeElPintor` del escritorio, con
 * lo que en la app hace falta: el área segura —aquí no hay una página que la ponga— y la barra.
 */
export interface LoQueVeElPintor {
  /** La mesa: `mover`, `quieto`, `aviso`, `cronica`, `llave`, `salir` y `tirar`. */
  readonly mesa: LaMesa;
  /** La mesa ya sentada, con la vista del juego dentro. Aquí no es `null` nunca. */
  readonly vista: MesaVista;
  /** El nombre del juego, del manifiesto: lo que dice la barra. */
  readonly juego: string;
  /** Quién es quién, por asiento: lo que necesita `LineaDelTurno` para decir «le toca a Ana». */
  readonly nombres: Map<string, string>;
  /** Lo que el sistema se queda arriba —la muesca— y abajo —el indicador de inicio—. */
  readonly arriba: number;
  readonly abajo: number;
  /**
   * LA BARRA DE LA MESA, YA MONTADA: el juego, el código, «Salir», «Tirar» y la marca de Boots on
   * Board. Se pinta con `{laBarra}` en cada rama, y una rama nueva no tiene nada que recordar.
   */
  readonly laBarra: JSX.Element;
}

/**
 * LA PANTALLA DE UN PINTOR: la mesa del juego, y el vestíbulo mientras no hay mesa.
 *
 * Cada pantalla de juego la monta desde su `export default` con SU constante —`BURGO`,
 * `LINDES`, `RIBERAS`—, y la ruta sólo presta el nombre cuando el manifiesto no está. La ruta es
 * `/tablero?arcade=…` y `quienPinta` ya casó el identificador contra `LOS_QUE_PINTA` antes de
 * montar la pantalla, así que la mesa es la de ese juego y punto; lo que el parámetro sigue
 * sirviendo es para el rótulo de un enlace directo con el registro a medio instalar.
 *
 * `Pintor` tiene que ser un componente del ámbito del módulo, nunca uno creado al pintar: React
 * trataría cada función nueva como un componente nuevo y desmontaría la escena en cada latido.
 */
export function LaMesaDeUnPintor({
  arcade,
  Pintor,
}: {
  readonly arcade: ArcadeId;
  readonly Pintor: ComponentType<LoQueVeElPintor>;
}): JSX.Element {
  const { arcade: deLaRuta } = useLocalSearchParams<{ arcade?: string }>();
  const manifiesto = manifiestoDeArcadeSiExiste(arcade);
  const mesa = usarMesaDeArcade(arcade);
  const [nombre, ponerNombre] = useState('');
  const [codigo, ponerCodigo] = useState('');
  const [plazo, ponerPlazo] = useState(0);
  /* El área segura, leída UNA vez y aquí arriba: es un gancho y los ganchos no se saltan. */
  const bordes = useSafeAreaInsets();
  const relleno = { paddingTop: bordes.top + 28, paddingBottom: bordes.bottom + 28 };

  /*
   * EL LATIDO DE LA CUENTA ATRÁS, el mismo que en `tablero-en-linea.tsx` y por lo mismo: el
   * vencimiento viaja como instante absoluto y quien resta es la pantalla. Cada segundo en el
   * último minuto; cada minuto el resto del tiempo, también sin plazo, que es cuando se enseña
   * «lleva N min». Repinta la pantalla entera, y con ella al pintor y a su línea del turno.
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

  const juego =
    manifiesto?.nombre ?? (typeof deLaRuta === 'string' && deLaRuta.length > 0 ? deLaRuta : arcade);

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
     * EL VESTÍBULO, con las piezas y los estilos del mueble genérico. Por el Muelle casi nadie
     * llega aquí sin mesa —la tarjeta de la Sala lleva al embarcadero y el embarcadero abre el
     * juego con la mesa ya sentada—, pero un enlace directo, un asiento caducado o «Salir» acaban
     * en esta rama, y una rama que no se puede usar es una pantalla en blanco con otro nombre.
     *
     * Abre la mesa DE SIEMPRE: la modalidad —Boots on Board— sólo se elige en la orilla del lobby
     * común, que es la que mide si el aparato llega (`verify:sala` lo vigila en toda la app).
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
              style={[ESTILOS_DE_LA_MESA.botonRotulo, noPuedeEntrar ? ESTILOS_DE_LA_MESA.botonRotuloQuieto : null]}
            >
              Sentarse
            </Text>
          </Pressable>
          {/* La ÚNICA región viva de esta rama: el vestíbulo no tiene línea del turno ni retablo. */}
          <ElAviso texto={mesa.aviso} />
        </View>
      </Pantalla>
    );
  }

  const vista = mesa.mesa;
  return (
    <Pintor
      mesa={mesa}
      vista={vista}
      juego={juego}
      nombres={nombres}
      arriba={bordes.top}
      abajo={bordes.bottom}
      laBarra={
        <BarraDeLaMesa
          juego={juego}
          codigo={vista.codigo}
          asientos={vista.asientos}
          salir={mesa.salir}
          tirar={mesa.tirar}
          arriba={bordes.top}
          deBotas={esMesaDeBotas(vista)}
        />
      }
    />
  );
}

/**
 * LA RED BAJO EL LIENZO: si la escena revienta AL PINTAR, se apunta y se juega sobre el retablo.
 *
 * Los respaldos de cada pantalla —la vista que no se ve en tres, el modelo que no llega— se
 * deciden ANTES de montar el `Canvas`. Lo que ninguno recoge es un fallo dentro del propio
 * lienzo: una textura que expo-gl no quiere, un sombreador que no compila en esa GPU, un fundido
 * que se queda sin memoria. La primera vez que un tablero se monta en un teléfono real es la
 * víspera de una partida, y ahí un `throw` en el render no puede costar la partida: se apunta
 * —el parte de fallos lo enseñará al volver a abrir, con su motivo y con el juego en la pila— y
 * la mesa sigue sobre el tablero de siempre.
 *
 * Es una clase porque React no da otra forma de recoger un `throw` de render, y avisa hacia
 * arriba en vez de pintar ella el respaldo porque el respaldo es de la pantalla: necesita la
 * vista, las opciones y los muebles del juego. Era la misma en las tres pantallas salvo en una
 * cosa, y era la que importaba: la de Las Lindes no apuntaba nada, así que un valle que caía en un
 * teléfono no dejaba rastro en el parte.
 */
export class RedDelLienzo extends Component<
  {
    /** El nombre del juego, para que el parte diga qué lienzo se cayó. */
    readonly juego: string;
    readonly alCaer: (motivo: string) => void;
    readonly children: ReactNode;
  },
  { readonly cayo: boolean }
> {
  override state: { readonly cayo: boolean } = { cayo: false };

  static getDerivedStateFromError(): { cayo: boolean } {
    return { cayo: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    const e = error instanceof Error ? error : new Error(String(error));
    e.stack = `${e.stack ?? ''}\n— en el lienzo de ${this.props.juego} —${info.componentStack ?? ''}`;
    apuntarFallo(e, 'render', false);
    this.props.alCaer(e.message);
  }

  override render(): ReactNode {
    return this.state.cayo ? null : this.props.children;
  }
}

/**
 * EL TELÓN, mientras el mundo no está: suelo con el nombre del juego y una línea que dice qué
 * falta —no «cargando»—. Nunca coge toques: el lienzo de debajo sigue siendo el tablero. Quien lo
 * monta decide cuándo se levanta, y tiene que ser algo que llegue SIEMPRE —el `alEstarListo` de
 * una escena, que llega con modelos, sin ellos o a los quince segundos—, o se queda para siempre.
 */
export function ElTelon({ rotulo, texto }: { readonly rotulo: string; readonly texto: string }): JSX.Element {
  return (
    <View style={estilos.telon} pointerEvents="none">
      <Text style={estilos.lugar}>{rotulo}</Text>
      <Text style={estilos.espera}>{texto}</Text>
    </View>
  );
}

/** Lo que una escena manda por `alMedir` una vez por segundo. */
export interface MedidaDelLienzo {
  triangulos: number;
  llamadas: number;
  ms: number;
  fotogramas: number;
}

/**
 * LA CALIDAD SE MIDE, NO SE ADIVINA: `plena` o `sobria` con el juez de la casa.
 *
 * `alMedir` llega una vez por segundo con la media real de milisegundos por fotograma, y el juez
 * es `juzgarCalidad` (`escenas/embarcadero/calidad.ts`): 22 ms de media en los primeros 120
 * fotogramas bajan la escena a `sobria`. Se juzga UNA vez y no se vuelve a preguntar: una calidad
 * que subiera y bajara haría aparecer y desaparecer árboles cada pocos segundos.
 *
 * Y se mide en TODAS las plataformas: aquí no hay ninguna decisión por plataforma, y un portátil
 * viejo con la web abierta merece la misma piedad que un teléfono justo.
 *
 * Es el juez de una escena que está entera desde el primer fotograma. Una cuyo tablero CRECE
 * —Las Lindes empieza con una losa y acaba con setenta y dos— juzgaría casi siempre la de una
 * losa, y por eso la suya pregunta a cada muestra sobre una ventana (`escenas/lindes/detalle.ts`).
 */
export function usarLaCalidadDelAparato(): {
  readonly calidad: Calidad;
  readonly alMedir: (m: MedidaDelLienzo) => void;
} {
  const [calidad, ponerCalidad] = useState<Calidad>('plena');
  const muestras = useRef<MuestraDelHilo[]>([]);
  const yaSeJuzgo = useRef(false);
  const alMedir = useCallback((m: MedidaDelLienzo) => {
    if (yaSeJuzgo.current) return;
    muestras.current.push({ ms: m.ms, fotogramas: m.fotogramas });
    const veredicto = juzgarCalidad(muestras.current);
    if (veredicto === null) return;
    yaSeJuzgo.current = true;
    ponerCalidad(veredicto);
  }, []);
  return { calidad, alMedir };
}

/**
 * EL RESPALDO DE QUIEN NO TIENE MUEBLES PROPIOS: la mesa de siempre sobre el retablo, y la nota.
 *
 * Es el mueble genérico —la barra, de quién es el turno, el aviso de la mesa, el retablo, lo que
 * el retablo no pinta y la crónica— con una línea más: POR QUÉ se está jugando aquí. En tenue y no
 * en alarma, porque no es un peligro sino un cambio de pincel; y con el motivo, porque «no se ha
 * podido» sin motivo manda a adivinar, y el motivo de verdad casi siempre es la cobertura.
 *
 * Cada movimiento se enseña exactamente una vez: `opcionesSueltas` quita lo que el retablo ya
 * pinta, y sin tablero declarado las opciones salen todas como botones, que es lo que hace el
 * mueble genérico con un juego que no se dibuja. Nunca una pantalla sin nada que tocar.
 */
export function ElRespaldo({ pintor, nota }: { readonly pintor: LoQueVeElPintor; readonly nota: string }): JSX.Element {
  const { mesa, vista, nombres, abajo, laBarra } = pintor;
  const tablero = tableroDeLaVista(vista.vista);
  const opciones = vista.opciones ?? [];
  const sueltas = tablero === null ? opciones : opcionesSueltas(tablero, opciones);
  return (
    <View style={ESTILOS_DE_LA_MESA.todo}>
      {laBarra}
      <LineaDelTurno mesa={vista} nombres={nombres} />
      <ElAviso texto={mesa.aviso} />
      <Text style={estilos.nota}>{nota}</Text>
      {tablero === null ? null : (
        <View style={ESTILOS_DE_LA_MESA.cajaDelRetablo}>
          <Retablo tablero={tablero} alTocar={mesa.mover} quieto={mesa.quieto} />
        </View>
      )}
      <ScrollView style={ESTILOS_DE_LA_MESA.pieDeLaMesa} contentContainerStyle={{ paddingBottom: abajo }}>
        {/* Lo que decide es lo PINTABLE y no lo que llega: ver `hayAlgoQuePintar`. */}
        {hayAlgoQuePintar(sueltas) ? (
          <LasOpciones opciones={sueltas} alTocar={mesa.mover} quieto={mesa.quieto} />
        ) : null}
        <LaCronica cronica={mesa.cronica} />
      </ScrollView>
    </View>
  );
}

/*
 * Sólo lo que este fichero pinta con sus manos: el telón y la nota del respaldo. Todo lo demás
 * son los estilos del mueble genérico, importados y no copiados. Ni un color inventado.
 */
const estilos = StyleSheet.create({
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
});

/*
 * La nota se exporta para los respaldos PROPIOS —el de Riberas y el del Burgo—, que la pintan con
 * la misma letra que éste: tres notas que dicen lo mismo con tres estilos se leen como tres cosas.
 */
export { estilos as ESTILOS_DEL_PINTOR };
