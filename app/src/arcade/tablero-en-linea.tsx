/**
 * EL MUEBLE `tablero`, entero y sin saber a qué se juega.
 *
 * ═══ ESTA PANTALLA NO ES LA DE RIBERAS, Y ESO ES LA MITAD DE LA FASE 4 ═══
 *
 * Aquí no aparece la palabra «choza», ni «vereda», ni «hexágono», ni «trueque».
 * Lo que hace es: sentarse a una mesa del arcade que pida la ruta, sondear,
 * sacar el tablero declarado de la vista y dárselo al `Retablo`, que pinta
 * polígonos, líneas, nudos y botones. El movimiento que manda cada pieza viene
 * dentro de la pieza.
 *
 * Cualquier arcade con `mueble: 'tablero'` y `sede: 'servidor'` que proyecte un
 * `tablero` dentro de su vista se pinta con esto, incluido uno que viniera de
 * fuera del binario por el enchufe de la fase 5 — que es la condición que el §7
 * pone para llamar genérico a un mueble.
 *
 * ═══ Y CUANDO LA VISTA NO TRAE TABLERO, SE DICE ═══
 *
 * En vez de quedarse en blanco. Es la regla de la portada aplicada aquí: nada de
 * lo que se enseña es mentira, y una pantalla vacía es una forma educada de
 * mentir. El caso real que cubre es una app más vieja que el servidor, o un
 * arcade que declara el mueble y proyecta otra cosa.
 *
 * ═══ Y LO QUE LA FASE 4 BIS AÑADE: QUE UNA PARTIDA DE DÍAS SE PUEDA JUGAR ═══
 *
 * Dos cosas, y las dos son de plataforma y no de Riberas:
 *
 *   · SE ELIGE EL PLAZO AL ABRIR. «Veinticuatro horas por turno» es una decisión de
 *     quien monta la partida y no una regla del juego (§5.4), así que tiene que
 *     poder tomarse aquí. Sin este botón, una partida de días existiría en el
 *     servidor y no habría forma de empezarla desde el móvil.
 *   · SE DICE DE QUIÉN ES EL TURNO Y CUÁNTO QUEDA. Volver a una partida de tres
 *     días desde la Sala y no saber si te toca a ti es no poder jugarla. El turno
 *     se lee de la vista con `turnoDeLaVista` —la misma técnica que
 *     `tableroDeLaVista`, y por el mismo motivo: este mueble no sabe a qué se
 *     juega— y el plazo, de la mesa.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { manifiestoDeArcadeSiExiste } from '../../../shared/arcade';
import {
  opcionesSueltas,
  tableroDeLaVista,
} from '../../../shared/mecanicas/tablero-declarado';
import type { MovimientoDeclarado } from '../../../shared/mecanicas/tablero-declarado';
import { turnoDeLaVista } from '../../../shared/mecanicas/turno-declarado';
import { usarMesaDeArcade } from './mesa';
import type { OpcionDeMesa } from './mesa';
import { cuantoLleva, cuantoQueda } from './relojes';
import { SALA } from './muebles';
import { Retablo } from './retablo';

/**
 * LOS PLAZOS QUE SE OFRECEN AL ABRIR, con su nombre.
 *
 * ═══ POR QUÉ CUATRO BOTONES Y NO UN CAMPO DE NÚMERO ═══
 *
 * Porque lo que se está eligiendo no es un número: es QUÉ CLASE DE PARTIDA es
 * ésta. «Un rato» y «un día por turno» son dos productos distintos —una se juega
 * sentados en un bar y la otra se juega desde el trabajo a lo largo de la semana— y
 * un campo libre le pediría a quien abre que tradujera esa decisión a segundos.
 *
 * El primero no manda nada y deja que mande el defecto del servidor, que es lo
 * correcto: el número lo decide quien hospeda, y tenerlo escrito aquí sería una
 * segunda copia que se desincroniza el día que cambie allí.
 *
 * ═══ Y EL QUINTO, «SIN PRISA», QUE FALTABA ═══
 *
 * `plazoSegundos: 0` está documentado como legítimo desde la cabecera de `abrir`
 * —«esta mesa no tiene prisa»— y era el único plazo que la app NO podía pedir:
 * ninguno de los cuatro botones mandaba cero. La consecuencia era fea de contar:
 * `turnoDesde`, que es el campo nuevo de esta fase, sólo llega a la pantalla
 * cuando `venceEn` es `null`, o sea sólo en una mesa sin plazo — que no se podía
 * abrir. El campo que la fase presenta como «la mitad del aviso» era, desde la
 * app, código muerto.
 *
 * Va el último a propósito: es el caso raro, y quien lo elige sabe lo que elige.
 */
const PLAZOS: Array<{ rotulo: string; segundos: number | undefined; ayuda: string }> = [
  { rotulo: 'Como venga', segundos: undefined, ayuda: 'El plazo por defecto del servidor.' },
  { rotulo: 'Un rato', segundos: 10 * 60, ayuda: 'Diez minutos por turno. Para jugar del tirón.' },
  { rotulo: 'Un día', segundos: 24 * 60 * 60, ayuda: 'Veinticuatro horas por turno. La Larga.' },
  { rotulo: 'Tres días', segundos: 3 * 24 * 60 * 60, ayuda: 'Para una partida de la semana entera.' },
  { rotulo: 'Sin prisa', segundos: 0, ayuda: 'Sin plazo: el turno no se pasa solo nunca.' },
];

/*
 * LOS DOS RÓTULOS DE TIEMPO SE FUERON A `relojes.ts`, con su porqué entero.
 *
 * Estaban aquí, exportados y sin que los mirara ningún comprobador, y los dos
 * mentían: «quedan 23 h» en una mesa de veinticuatro horas recién abierta, y un
 * salto de «2 días» a «47 h» al bajar un minuto. Ahora viven en un fichero sin
 * `import` ninguno para que `verificar-relojes.mjs` los llame de verdad.
 */

/** Pinta el arcade de tablero que pida la ruta. */
export function ElTableroEnLinea(): JSX.Element {
  const { arcade } = useLocalSearchParams<{ arcade?: string }>();
  const id = typeof arcade === 'string' ? arcade : '';
  const manifiesto = manifiestoDeArcadeSiExiste(id);
  const mesa = usarMesaDeArcade(id);
  const [nombre, ponerNombre] = useState('');
  const [codigo, ponerCodigo] = useState('');
  const [plazo, ponerPlazo] = useState(0);

  /*
   * ═══ UN LATIDO PARA LA CUENTA ATRÁS, Y SU RITMO ES EL DEL PLAZO ═══
   *
   * El vencimiento viaja como INSTANTE ABSOLUTO y no como «quedan 40 s», porque una
   * cuenta atrás obliga al servidor a decrementarla, o sea a escribir el estado sin
   * que pase nada. La consecuencia es que quien resta es la pantalla, y para restar
   * hay que repintar.
   *
   * Cada cuánto: en el último minuto, una vez por segundo, que es cuando el número
   * cambia de verdad y hay alguien mirándolo. Antes, una vez por minuto — porque en
   * una partida de tres días repintar sesenta veces por minuto para enseñar «quedan
   * 71 h» es exactamente la misma clase de derroche que sondear cada veinticinco
   * segundos, y esta fase existe para no hacer ninguna de las dos.
   *
   * ═══ Y SIGUE LATIENDO SIN PLAZO, QUE ES LO QUE FALTABA ═══
   *
   * Aquí había un `if (venceEn === null) return;` y eso dejaba congelada la única
   * línea de esta pantalla que usa `turnoDesde`. Medido: mesa abierta con
   * `plazoSegundos: 0`, repartida, la pestaña en PRIMER PLANO; el servidor decía
   * `esperandoMs 262744` —cuatro minutos y veintidós segundos— y la línea seguía
   * diciendo «TE TOCA · acaba de empezar», que es lo que `cuantoLleva` sólo
   * contesta por debajo de sesenta segundos. Y no se descongelaba nunca: en una
   * mesa sin plazo un `204` del sondeo no repinta, y no cambia nada más.
   *
   * O sea que el escenario que justifica que `turnoDesde` exista —el que su propia
   * cabecera usa de ejemplo— era el que salía roto en pantalla, y sin un solo
   * error en ningún sitio. Sin plazo se late una vez por minuto, que es el ritmo al
   * que cambia «lleva N min».
   */
  const [latido, latir] = useState(0);
  const venceEn = mesa.mesa?.venceEn ?? null;
  useEffect(() => {
    const quedan = venceEn === null ? Infinity : venceEn - Date.now();
    const cada = quedan > 0 && quedan < 60_000 ? 1000 : 60_000;
    /*
     * `latido` está en las dependencias para que el ritmo se REELIJA en cada
     * vuelta: si no, una mesa que entra en su último minuto seguiría latiendo cada
     * minuto y la cuenta atrás daría saltos de sesenta en sesenta justo cuando se
     * mira. El precio es que el cambio de ritmo llega con un latido de retraso —o
     * sea, el último minuto empieza a contar por segundos unos segundos tarde—, y
     * es infinitamente más barato que encadenar temporizadores a mano para ganar
     * esos segundos.
     */
    const reloj = setTimeout(() => latir((n) => n + 1), cada);
    return () => clearTimeout(reloj);
  }, [venceEn, latido]);

  /*
   * ═══ QUIÉN ES QUIÉN, Y QUÉ CAMBIÓ EN LA FASE 5 ═══
   *
   * Esta tabla rellenaba los huecos que el juego escribía dentro de sus textos
   * —`{asiento:aY9TK2MBJ}`— porque hasta la fase 5 el juego no sabía cómo se
   * llamaba nadie. Ya no hace falta para eso: la proyección recibe quién está
   * sentado (`Proyeccion`, tercer argumento) y lo que llega por el cable trae los
   * nombres puestos. `tableroConLosNombres` se ha borrado con el rodeo entero.
   *
   * La tabla se queda porque sigue haciendo falta para lo que es de la PANTALLA y
   * no del juego: la línea que dice «le toca a Ana», que este mueble compone él
   * solo a partir del turno declarado en la vista. Eso no viaja escrito porque el
   * juego no tiene por qué saber que existe esa línea.
   */
  const nombres = useMemo(() => {
    const tabla = new Map<string, string>();
    for (const a of mesa.mesa?.asientos ?? []) tabla.set(a.id, a.nombre);
    return tabla;
  }, [mesa.mesa?.asientos]);

  if (mesa.fase === 'yendo') {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={SALA.neon} />
        <Text style={estilos.texto}>Hablando con la mesa…</Text>
      </View>
    );
  }

  if (mesa.fase === 'fuera' || mesa.mesa === null) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>{manifiesto?.nombre ?? id}</Text>
        <Text style={estilos.texto}>{manifiesto?.gancho ?? ''}</Text>
        <TextInput
          style={estilos.campo}
          placeholder="Tu nombre en la mesa"
          placeholderTextColor={SALA.neonTenue}
          value={nombre}
          onChangeText={ponerNombre}
          maxLength={24}
        />
        {/*
          ═══ CUÁNTO SE ESPERA POR TURNO, QUE ES LO QUE ELIGE LA CLASE DE PARTIDA ═══

          Va ANTES del botón de abrir y no escondido detrás de un ajuste, porque no
          es un ajuste: es la diferencia entre una partida de bar y una de tres
          días, y quien abre la mesa es el único que puede decidirla. Después de
          abrir ya no se puede cambiar — el plazo es de la mesa y la mesa nace con
          él.
        */}
        <Text style={estilos.o}>cuánto se espera por turno</Text>
        <View style={estilos.plazos}>
          {PLAZOS.map((p, i) => (
            <Pressable
              key={p.rotulo}
              style={[estilos.plazo, i === plazo ? estilos.plazoElegido : null]}
              onPress={() => ponerPlazo(i)}
            >
              <Text style={i === plazo ? estilos.plazoRotuloElegido : estilos.plazoRotulo}>
                {p.rotulo}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={estilos.ayuda}>{PLAZOS[plazo]?.ayuda ?? ''}</Text>
        <Pressable
          style={estilos.boton}
          disabled={mesa.quieto || nombre.trim().length === 0}
          onPress={() => mesa.abrir(nombre.trim(), PLAZOS[plazo]?.segundos)}
        >
          <Text style={estilos.botonRotulo}>Abrir una mesa</Text>
        </Pressable>
        <Text style={estilos.o}>o entra con el código que te hayan dicho</Text>
        <TextInput
          style={estilos.campo}
          placeholder="CÓDIGO"
          placeholderTextColor={SALA.neonTenue}
          value={codigo}
          onChangeText={ponerCodigo}
          autoCapitalize="characters"
          maxLength={8}
        />
        <Pressable
          style={estilos.boton}
          disabled={mesa.quieto || nombre.trim().length === 0 || codigo.trim().length === 0}
          onPress={() => mesa.entrar(codigo, nombre.trim())}
        >
          <Text style={estilos.botonRotulo}>Sentarse</Text>
        </Pressable>
        {mesa.aviso.length > 0 ? <Text style={estilos.fallo}>{mesa.aviso}</Text> : null}
      </View>
    );
  }

  const tablero = tableroDeLaVista(mesa.mesa.vista);
  /*
   * ═══ LAS OPCIONES QUE MANDA EL JUEGO, QUE ES EL HUECO DE LA FASE 5 ═══
   *
   * Un juego que se resuelve su propio dibujo —Riberas, y «La Orilla» del
   * comprobador— mete el movimiento DENTRO de cada pieza del tablero, y pintar la
   * lista entera debajo sería un segundo juego de botones diciendo lo mismo.
   *
   * Pero NO pintar ninguna era el otro extremo, y era el que estaba puesto:
   * `opciones()` puede ofrecer cosas que no son ninguna pieza —aceptar un trato,
   * pasar, rendirse— y con tablero delante este mueble las escondía TODAS. Hoy no
   * se notaba porque los dos juegos de mesa de esta casa meten lo suyo en
   * `acciones` —La Ronda lo hace por esto mismo—, pero un arcade de fuera con
   * tablero y un «pasar» suelto perdía ese botón en el móvil y lo tenía en el
   * escritorio. Por eso baja `opcionesSueltas`, la misma que usa el escritorio:
   * cada movimiento se enseña exactamente una vez.
   *
   * Lo que arregla es el otro caso, que es el que dejaba el hueco sin pagar: un
   * arcade que registra `opciones()` y NO se resuelve el tablero. Antes caía en la
   * rama de aquí abajo —«esta vista no trae tablero»— con la pantalla vacía y un
   * botón de salir, o sea que el hueco existía en la tabla del registro y no
   * servía para jugar a nada. Ahora se pinta un botón por opción, con el rótulo y
   * la ayuda que escribió el juego, y se manda `tipo` y `carga` tal cual vienen:
   * este fichero no traduce ni una cadena, que es lo que lo mantiene genérico.
   */
  const opciones = mesa.mesa.opciones ?? [];
  if (tablero === null) {
    if (opciones.length > 0) {
      return (
        <View style={estilos.todo}>
          <View style={estilos.barra}>
            <View style={estilos.barraFila}>
              <Text style={estilos.codigo}>Mesa {mesa.mesa.codigo}</Text>
              <Pressable onPress={mesa.salir} style={estilos.salir}>
                <Text style={estilos.salirRotulo}>Salir</Text>
              </Pressable>
              <BotonTirar tirar={mesa.tirar} />
            </View>
            <Text style={estilos.gente}>
              {mesa.mesa.asientos
                .map((a) => `${a.nombre}${a.presente ? '' : ' (fuera)'}`)
                .join(' · ')}
            </Text>
            <LineaDelTurno mesa={mesa.mesa} nombres={nombres} />
          </View>
          {mesa.aviso.length > 0 ? <Text style={estilos.fallo}>{mesa.aviso}</Text> : null}
          <LasOpciones opciones={opciones} alTocar={mesa.mover} quieto={mesa.quieto} />
        </View>
      );
    }
    return (
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>{manifiesto?.nombre ?? id}</Text>
        <Text style={estilos.texto}>
          Esta mesa está abierta y lo que manda no trae tablero ni dice qué se puede hacer, así
          que no hay nada que pintar aquí. Suele significar que esta versión de la app es más vieja
          que el servidor.
        </Text>
        <Pressable style={estilos.boton} onPress={mesa.salir}>
          <Text style={estilos.botonRotulo}>Salir de la mesa</Text>
        </Pressable>
      </View>
    );
  }

  const sueltas = opcionesSueltas(tablero, opciones);

  return (
    <View style={estilos.todo}>
      <View style={estilos.barra}>
        <View style={estilos.barraFila}>
          <Text style={estilos.codigo}>Mesa {mesa.mesa.codigo}</Text>
          {/*
            SALIR TIENE QUE ESTAR AQUÍ Y NO SÓLO EN LA PANTALLA DE ERROR.

            Antes el único «Salir de la mesa» vivía en la rama de «esta vista no
            trae tablero», o sea que desde una partida en marcha no había ninguna
            forma de irse: ni para cambiar de juego, ni para dejarle el sitio a
            otro, ni para entrar con otro código. Salir no abandona la partida —el
            asiento sigue siendo tuyo y se recupera volviendo a entrar con el
            código—, sólo cierra esta pantalla.
          */}
          <Pressable onPress={mesa.salir} style={estilos.salir}>
            <Text style={estilos.salirRotulo}>Salir</Text>
          </Pressable>
          <BotonTirar tirar={mesa.tirar} />
        </View>
        <Text style={estilos.gente}>
          {mesa.mesa.asientos.map((a) => `${a.nombre}${a.presente ? '' : ' (fuera)'}`).join(' · ')}
        </Text>
        {/*
          ═══ DE QUIÉN ES EL TURNO Y CUÁNTO QUEDA ═══

          Es lo que hace jugable una partida de tres días: volver desde la Sala y
          saber, sin leer el tablero, si hay que hacer algo hoy. En una mesa de diez
          minutos es un adorno; en una de La Larga es la pantalla entera.

          El turno se lee de la VISTA con `turnoDeLaVista`, no de un campo de la
          mesa: de quién es el turno es un campo del estado del juego (§5.3) y este
          mueble no sabe a qué se juega. Lo que sí es de la mesa es el PLAZO, porque
          un reductor puro no sabe qué hora es. Las dos mitades vienen de donde
          tienen que venir.

          Y cuando el juego no declara turno no se enseña nada, en vez de enseñar
          «le toca a nadie»: un mueble genérico sirve también a juegos simultáneos, y
          decirles que no le toca a nadie sería mentir sobre algo que no aplica.
        */}
        <LineaDelTurno mesa={mesa.mesa} nombres={nombres} />
      </View>
      {mesa.aviso.length > 0 ? <Text style={estilos.fallo}>{mesa.aviso}</Text> : null}
      {/*
        EL TABLERO SE PINTA TAL Y COMO LLEGA. Ya no se le sustituye nada.

        Hasta la fase 5 aquí se llamaba a `tableroConLosNombres`, que recorría el
        aviso, los rótulos, los botones y los paneles rellenando huecos. Ahora los
        nombres vienen puestos desde la proyección, así que este mueble no toca ni
        una cadena de lo que el juego escribió — que es exactamente lo que un
        mueble genérico debería hacer con un texto que no entiende.
      */}
      <Retablo tablero={tablero} alTocar={mesa.mover} quieto={mesa.quieto} />
      {/*
        Y DEBAJO, LO QUE EL TABLERO NO ENSEÑA. Ni una más: `opcionesSueltas` quita
        las que ya salen dentro de una pieza o de una acción, comparando por forma
        canónica del movimiento y no por identificador. Casi siempre esta lista
        queda vacía —y entonces no se pinta nada—; cuando no, es un movimiento
        legal que hasta hoy sólo existía en el escritorio.
      */}
      {sueltas.length > 0 ? (
        <LasOpciones opciones={sueltas} alTocar={mesa.mover} quieto={mesa.quieto} />
      ) : null}
    </View>
  );
}

/**
 * TIRAR LA MESA, QUE NO ES SALIR.
 *
 * Salir cierra esta pantalla y te deja el asiento; tirar acaba la partida PARA
 * TODOS. Lo tenía el escritorio y no lo tenía la app, o sea que desde el móvil
 * —que es el aparato con el que se juega— una mesa abierta por error se quedaba
 * abierta y gastando aforo hasta que la barriera el servidor.
 *
 * Se pregunta antes, por lo mismo que en el escritorio: afecta a gente que no
 * está mirando esta pantalla. Y el rótulo de la pregunta dice «para todos», que
 * es la diferencia entera con el botón de al lado.
 *
 * Está en las DOS barras —la del tablero y la del juego que sólo trae opciones—
 * porque las dos son una mesa viva. Tenerlo en una sola sería la misma asimetría
 * que se acaba de corregir, sólo que dentro del mismo cliente.
 */
function BotonTirar({ tirar }: { tirar: () => void }): JSX.Element {
  return (
    <Pressable
      onPress={() => {
        Alert.alert('¿Tirar la mesa?', 'Se acaba la partida para todos los que estén sentados.', [
          { text: 'No', style: 'cancel' },
          { text: 'Tirarla', style: 'destructive', onPress: tirar },
        ]);
      }}
      style={estilos.salir}
      accessibilityRole="button"
      accessibilityLabel="Tirar la mesa para todos"
    >
      <Text style={estilos.salirRotulo}>Tirar</Text>
    </Pressable>
  );
}

/**
 * LOS BOTONES DE UN JUEGO QUE ESTE BINARIO NO CONOCE.
 *
 * ═══ POR QUÉ ESTO PUEDE SER TAN TONTO, Y TIENE QUE SERLO ═══
 *
 * Cada opción trae dentro EL MOVIMIENTO ENTERO —`tipo` y `carga`, ya montados por
 * el juego— así que aquí no hay ni una comparación por tipo, ni un `switch`, ni una
 * traducción de nada. Es la misma decisión que toma `MovimientoDeclarado` en el
 * tablero declarado y por el mismo motivo: en cuanto un mueble genérico entiende lo
 * que pinta, deja de ser genérico y empieza a salir a medida del primer juego que
 * lo use.
 *
 * Lo único que este componente decide es la FORMA, que es lo suyo: un botón por
 * opción, con su rótulo, su ayuda debajo si la trae, y el mínimo de dedo de 44 que
 * el retablo aplica a sus figuras.
 *
 * `quieto` apaga los botones mientras hay algo en vuelo. Sin eso, dos toques
 * seguidos mandan el segundo con la revisión vieja y vuelve rancio — que es un
 * rechazo de la autoridad por culpa de la pantalla y no del juego.
 */
function LasOpciones({
  opciones,
  alTocar,
  quieto,
}: {
  opciones: readonly OpcionDeMesa[];
  alTocar: (movimiento: MovimientoDeclarado) => void;
  quieto: boolean;
}): JSX.Element {
  return (
    <View style={estilos.opciones}>
      {opciones.map((o) => (
        <Pressable
          key={o.id}
          style={[estilos.opcion, quieto ? estilos.opcionQuieta : null]}
          disabled={quieto}
          onPress={() => {
            alTocar({ tipo: o.tipo, carga: o.carga });
          }}
        >
          <Text style={estilos.opcionRotulo}>{o.rotulo}</Text>
          {o.ayuda.length > 0 ? <Text style={estilos.opcionAyuda}>{o.ayuda}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

/**
 * LA LÍNEA QUE DICE SI HAY QUE HACER ALGO HOY.
 *
 * Componente propio y no tres líneas dentro de la barra, por una razón que no es
 * de orden: es lo único de esta pantalla que se puede leer entero sin saber nada
 * del resto, y es lo que habrá que reutilizar el día que la Sala quiera enseñar
 * «te toca en dos partidas» sin abrir ninguna.
 */
function LineaDelTurno({
  mesa,
  nombres,
}: {
  mesa: { terminada: boolean; venceEn: number | null; turnoDesde: number; yo: string | null; vista: unknown };
  nombres: Map<string, string>;
}): JSX.Element | null {
  if (mesa.terminada) return null;

  const turno = turnoDeLaVista(mesa.vista);
  if (!turno.declarado) return null;

  const ahora = Date.now();
  /*
   * «TE TOCA» EN VEZ DEL PROPIO NOMBRE, y no es cosmética: quien vuelve a una
   * partida de tres días desde la Sala está contestando exactamente esa pregunta, y
   * hacerle buscar su nombre entre cuatro es hacerle trabajar para nada. Que el
   * asiento sea el suyo lo dice `mesa.yo`, que lo pone la autoridad al reconocer la
   * llave, y no una comparación de nombres tecleados —dos personas pueden teclear
   * el mismo.
   */
  const mio = turno.de !== null && turno.de === mesa.yo;
  const dequien =
    turno.de === null
      ? 'Todavía no le toca a nadie'
      : mio
        ? 'TE TOCA'
        : `Le toca a ${nombres.get(turno.de) ?? 'alguien'}`;

  const cola =
    mesa.venceEn === null
      ? /*
         * Sin plazo no hay cuenta atrás que enseñar, y lo que sí se puede decir es
         * cuánto lleva parado. En una mesa sin prisa es el único número que hay, y
         * es el que decide si merece la pena dar un toque por otro lado.
         */
        cuantoLleva(Math.max(0, ahora - mesa.turnoDesde))
      : cuantoQueda(mesa.venceEn - ahora);

  return (
    <Text style={mio ? estilos.turnoMio : estilos.turno}>
      {dequien} · {cola}
    </Text>
  );
}

const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.fondo },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
    backgroundColor: SALA.fondo,
  },
  titulo: { color: SALA.neon, fontSize: 20, fontWeight: '800', letterSpacing: 3 },
  texto: { color: SALA.palabra, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 360 },
  o: { color: SALA.neonTenue, fontSize: 13, marginTop: 8 },
  campo: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: SALA.panel,
    color: SALA.palabra,
    borderColor: SALA.neonTenue,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  boton: {
    backgroundColor: SALA.panel,
    borderColor: SALA.neon,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  botonRotulo: { color: SALA.palabra, fontSize: 15, fontWeight: '700' },
  barra: { paddingHorizontal: 16, paddingTop: 14, gap: 2 },
  barraFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codigo: { color: SALA.neon, fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  /* 44 de alto: el mismo mínimo de dedo que el retablo aplica a sus figuras. */
  salir: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderColor: SALA.neonTenue,
    borderWidth: 1,
    borderRadius: 8,
  },
  salirRotulo: { color: SALA.neonTenue, fontSize: 13, fontWeight: '700' },
  gente: { color: SALA.neonTenue, fontSize: 12 },
  turno: { color: SALA.palabra, fontSize: 13, fontWeight: '600', marginTop: 2 },
  /* Cuando es el mío se pinta con el neón: es la única línea que pide una acción. */
  turnoMio: { color: SALA.neon, fontSize: 13, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  ayuda: { color: SALA.neonTenue, fontSize: 12, textAlign: 'center', maxWidth: 320 },
  plazos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  /* 44 de alto: el mismo mínimo de dedo que el retablo aplica a sus figuras. */
  plazo: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderColor: SALA.neonTenue,
    borderWidth: 1,
    borderRadius: 8,
  },
  plazoElegido: { borderColor: SALA.neon, backgroundColor: SALA.panel },
  plazoRotulo: { color: SALA.neonTenue, fontSize: 13, fontWeight: '600' },
  plazoRotuloElegido: { color: SALA.palabra, fontSize: 13, fontWeight: '800' },
  fallo: { color: SALA.fallo, fontSize: 13, paddingHorizontal: 16, textAlign: 'center' },
  opciones: { padding: 16, gap: 10 },
  /* 44 de alto: el mismo mínimo de dedo que el retablo aplica a sus figuras. */
  opcion: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderColor: SALA.neon,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: SALA.panel,
    gap: 2,
  },
  opcionQuieta: { borderColor: SALA.neonTenue, opacity: 0.5 },
  opcionRotulo: { color: SALA.palabra, fontSize: 15, fontWeight: '700' },
  opcionAyuda: { color: SALA.neonTenue, fontSize: 12 },
});
