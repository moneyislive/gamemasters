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
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BURGO } from '../../../shared/arcade/juegos';
import { maravedies, ORDEN_DE_LA_HOJA } from '../../../shared/arcade/juegos/burgo-en-tres';
import type {
  BarrioDeLoMio,
  DestinoDelTrato,
  FichaDeCasilla,
  HojaDelBurgo,
  IdDeSeccion,
  JugadorDelMarcador,
  LadoQueSePinta,
  PujaComponible,
  SeccionDeLaHoja,
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

// ---------------------------------------------------------------------------
// Qué sección está abierta, y cuándo se abre sola
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
 */
export function usarLaSeccionAbierta(
  codigo: string,
  abre: IdDeSeccion | null,
  paso: string,
  meToca: boolean,
): { readonly abierta: IdDeSeccion | null; readonly alAbrir: (id: IdDeSeccion) => void } {
  const [abierta, ponerAbierta] = useState<IdDeSeccion | null>(null);
  const pasoVisto = useRef<string | null>(null);

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
  }, [paso, meToca, abre]);

  const alAbrir = useCallback(
    (id: IdDeSeccion) => {
      ponerAbierta((antes) => (antes === id ? null : id));
      void guardarLaSeccion(BURGO, codigo, id);
    },
    [codigo],
  );

  return { abierta, alAbrir };
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

export function LaHojaDelBurgo(props: LoQueSabeLaHoja): JSX.Element {
  const { hoja, abierta, alAbrir } = props;
  return (
    <View style={estilos.hoja}>
      <LaCinta cinta={hoja.cinta} />
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
 * LA CINTA: de quién es el turno, qué acaba de pasar y cuánto tengo.
 *
 * Va siempre visible y sin plegar (§6.3): es lo único de la hoja que se mira sin
 * buscarlo. Mi dinero lleva MI color, que es el mismo del peón en el anillo: sin
 * eso, en una mesa de seis hay que leer el nombre para saber cuál de las seis
 * cifras del marcador es la propia.
 *
 * El aviso va como texto y NO como región viva: la pantalla ya tiene la suya
 * —`ElAviso` del mueble genérico, con el aviso de la mesa— y dos regiones vivas en
 * la misma pantalla se pisan y acaban leyéndose a destiempo.
 */
function LaCinta({ cinta }: { cinta: HojaDelBurgo<OpcionDeMesa>['cinta'] }): JSX.Element {
  return (
    <View style={estilos.cinta}>
      <View style={estilos.cintaDicho}>
        <Text style={estilos.cintaTurno} numberOfLines={1}>
          {cinta.turno}
        </Text>
        <Text style={estilos.cintaEspera} numberOfLines={2}>
          {cinta.aviso.length > 0 ? cinta.aviso : cinta.espera}
        </Text>
      </View>
      {cinta.miDinero.length === 0 ? null : (
        <View
          style={[estilos.miDinero, { borderColor: cinta.miColor }]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Tienes ${cinta.miDinero}`}
        >
          <Text style={estilos.miDineroCifra}>{cinta.miDinero}</Text>
        </View>
      )}
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
}: {
  opciones: readonly OpcionDeMesa[];
  quieto: boolean;
  alElegir: (o: OpcionDeMesa) => void;
}): JSX.Element | null {
  if (opciones.length === 0) return null;
  return (
    <View style={estilos.pilaEstrecha}>
      {opciones.map((o) => (
        <Pressable
          key={o.id}
          disabled={quieto}
          style={[estilos.boton, quieto ? estilos.botonQuieto : null]}
          onPress={() => {
            alElegir(o);
          }}
          accessibilityRole="button"
          accessibilityLabel={o.rotulo}
          accessibilityHint={o.ayuda.length > 0 ? o.ayuda : undefined}
          accessibilityState={{ disabled: quieto }}
        >
          <Text style={[estilos.botonRotulo, quieto ? estilos.botonRotuloQuieto : null]}>{o.rotulo}</Text>
          {o.ayuda.length > 0 ? <Text style={estilos.botonAyuda}>{o.ayuda}</Text> : null}
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
      <LosBotones opciones={ficha.opciones} quieto={quieto} alElegir={alElegir} />
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
// La hoja pequeña que se abre encima del lienzo
// ---------------------------------------------------------------------------

/**
 * UNA HOJA SOBRE EL LIENZO: una ficha pegada abajo con una pregunta y una salida.
 *
 * El mismo mueble que las tres hojas de Riberas —teja, contorno blanco al 40 %,
 * `accessibilityViewIsModal`, «Dejarlo» de salida— porque es la misma clase de
 * cosa: una pregunta que no puede llevarse el tablero de delante. Su lista se
 * DESPLAZA porque una ficha de casilla con seis rentas y tres obras no cabe en el
 * alto de un lienzo de 360.
 *
 * Se monta HERMANA del `GestureDetector` y nunca dentro: un `Pressable` dentro del
 * detector le pelea el toque al giro del tablero.
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
    <View style={estilos.sobreElLienzo} accessibilityViewIsModal>
      <Text style={estilos.sobreElLienzoRotulo}>{titulo}</Text>
      <ScrollView style={estilos.sobreElLienzoLista} contentContainerStyle={estilos.pila}>
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
   */
  cinta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  cintaDicho: { flex: 1, gap: 2 },
  cintaTurno: { ...LETRA.rotuloChico, color: SALA.palabra, fontSize: 13 },
  cintaEspera: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, lineHeight: 18 },
  /* Mi dinero, con MI color en el contorno: el mismo del peón en el anillo. */
  miDinero: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: RADIO.mando,
    borderWidth: 2,
    backgroundColor: SALA.teja,
  },
  miDineroCifra: {
    ...LETRA.dato,
    fontVariant: [...LETRA.dato.fontVariant],
    color: SALA.blanco,
    fontSize: 16,
  },
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
  /* La hoja pequeña encima del lienzo: pegada abajo y con márgenes, como las de Riberas. */
  sobreElLienzo: {
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
  sobreElLienzoRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  /*
   * La lista se desplaza y topa en 260: una ficha de solar lleva siete renglones de
   * renta y hasta tres obras, y el lienzo mide 360 en el peor caso. Con 260 la hoja
   * entera —rótulo, lista y «Dejarlo»— se queda en unos 340.
   */
  sobreElLienzoLista: { flexGrow: 0, flexShrink: 1, maxHeight: 260 },
  dejarlo: { minHeight: DEDO, justifyContent: 'center', alignItems: 'center' },
  dejarloRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
});
