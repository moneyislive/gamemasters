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
 *
 * ═══ Y LO QUE LA IDENTIDAD DE LA SALA CAMBIA AQUÍ ═══
 *
 * Esta pantalla llevaba siete colores propios —`fondo`, `panel`, `neon`,
 * `neonTenue`, `fallo`— que ya no existen. Lo que se ha hecho no es renombrarlos:
 * cada sitio se ha traducido por lo que SIGNIFICA, y el que más se movió fue el
 * neón, que hacía de ocho cosas a la vez —título, borde de campo, código de mesa,
 * rótulo de botón, línea de turno, «se acabó»— y por eso no brillaba en ninguna.
 *
 * Hoy el acento aparece exactamente donde quiere decir «esto está vivo o se puede
 * tocar»: el código de la mesa —que es lo que se dicta por teléfono para que venga
 * alguien—, el raíl del turno cuando el turno es tuyo, el plazo elegido y el botón
 * de abrir. Todo lo demás son los grises fríos y el filo de un píxel, que es lo
 * que sostiene la Sala entera. Los títulos, que antes eran neón, son `palabra`:
 * un título no se puede tocar.
 *
 * Y donde la maqueta pinta un resplandor —el raíl del turno lleva dos sombras de
 * acento— aquí va `SALA.halo` como CAMPO. React Native no tiene un `box-shadow`
 * de color que se vea igual en los dos sistemas, y fingirlo con `elevation` habría
 * dado una sombra gris en Android y ninguna en la mitad de los aparatos. El aura
 * traducida a plano tiñe la tarjeta de «TE TOCA» y dice lo mismo con lo que hay.
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
import type { OpcionDeMesa, AvisoDeMesa} from './mesa';
import { cuantoLleva, cuantoQueda } from './relojes';
import { LETRA, RADIO, SALA } from './muebles';
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
/*
 * LA TABLA VIVE EN `plazos.ts` DESDE QUE LA PIDE TAMBIÉN EL MUELLE. Estaba aquí, y
 * la hoja del Muelle nació con una copia; dos copias de «qué clase de partida se
 * puede abrir» son dos respuestas que se separan solas. El razonamiento de los
 * cinco botones sigue escrito en la cabecera de aquel fichero.
 */
import { PLAZOS } from './plazos';

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
        {/*
          EL ACENTO AQUÍ SÍ, y es el único sitio de esta pantalla donde aparece:
          la rueda es el piloto de «está pasando algo ahora mismo», que es una de
          las cuatro cosas que el acento puede decir. Pintarla de gris dejaría una
          pantalla entera sin una señal de que la app no se ha colgado.
        */}
        <ActivityIndicator color={SALA.acento} />
        <Text style={estilos.texto}>Hablando con la mesa…</Text>
      </View>
    );
  }

  /*
   * LOS TRES CANDADOS, DICHOS UNA VEZ. Estaban escritos dos veces cada uno —en
   * `disabled` y otra vez en `accessibilityState`— y ahora hace falta una tercera
   * lectura para el ESTILO: un botón que se pinta de acento diciendo «se puede
   * tocar» y no se deja tocar es la única mentira que esta identidad no admite.
   */
  const sinNombre = nombre.trim().length === 0;
  const noPuedeAbrir = mesa.quieto || sinNombre;
  const noPuedeEntrar = noPuedeAbrir || codigo.trim().length === 0;

  if (mesa.fase === 'fuera' || mesa.mesa === null) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>{manifiesto?.nombre ?? id}</Text>
        <Text style={estilos.texto}>{manifiesto?.gancho ?? ''}</Text>
        <TextInput
          style={estilos.campo}
          placeholder="Tu nombre en la mesa"
          placeholderTextColor={SALA.tenue}
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
        {/*
          ═══ EL ÚNICO CAMPO DE ACENTO DE ESTA PANTALLA ═══

          Abrir es el camino principal —entrar con código es la alternativa, y lo
          dice la propia frase de abajo: «o entra con el código que te hayan
          dicho»—, así que se lleva la placa de color y el otro se queda con el
          filo. Pintar los dos de acento sería repartirlo en dos y apagarlo, que es
          la razón medible de que la Sala anterior se leyera barata.
        */}
        <Pressable
          style={[estilos.boton, noPuedeAbrir ? estilos.botonQuieto : estilos.botonVivo]}
          disabled={noPuedeAbrir}
          onPress={() => mesa.abrir(nombre.trim(), PLAZOS[plazo]?.segundos)}
          accessibilityRole="button"
          accessibilityLabel="Abrir una mesa"
          accessibilityState={{ disabled: noPuedeAbrir }}
        >
          <Text style={[estilos.botonRotulo, noPuedeAbrir ? null : estilos.botonRotuloVivo]}>
            Abrir una mesa
          </Text>
        </Pressable>
        <Text style={estilos.o}>o entra con el código que te hayan dicho</Text>
        <TextInput
          style={estilos.campo}
          placeholder="CÓDIGO"
          placeholderTextColor={SALA.tenue}
          value={codigo}
          onChangeText={ponerCodigo}
          autoCapitalize="characters"
          maxLength={8}
        />
        <Pressable
          style={[estilos.boton, noPuedeEntrar ? estilos.botonQuieto : null]}
          disabled={noPuedeEntrar}
          onPress={() => mesa.entrar(codigo, nombre.trim())}
          accessibilityRole="button"
          accessibilityLabel="Sentarse en la mesa de ese código"
          accessibilityState={{ disabled: noPuedeEntrar }}
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
          <BarraDeLaMesa
            juego={manifiesto?.nombre ?? id}
            codigo={mesa.mesa.codigo}
            asientos={mesa.mesa.asientos}
            salir={mesa.salir}
            tirar={mesa.tirar}
          />
          <LineaDelTurno mesa={mesa.mesa} nombres={nombres} />
          {mesa.aviso.length > 0 ? <Text style={estilos.fallo}>{mesa.aviso}</Text> : null}
          <LasOpciones opciones={opciones} alTocar={mesa.mover} quieto={mesa.quieto} />
          <LaCronica cronica={mesa.cronica} />
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
        <Pressable
          style={estilos.boton}
          onPress={mesa.salir}
          accessibilityRole="button"
          accessibilityLabel="Salir de la mesa"
        >
          <Text style={estilos.botonRotulo}>Salir de la mesa</Text>
        </Pressable>
      </View>
    );
  }

  const sueltas = opcionesSueltas(tablero, opciones);

  return (
    <View style={estilos.todo}>
      <BarraDeLaMesa
        juego={manifiesto?.nombre ?? id}
        codigo={mesa.mesa.codigo}
        asientos={mesa.mesa.asientos}
        salir={mesa.salir}
        tirar={mesa.tirar}
      />
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

        SALE DE LA BARRA Y SE PONE DEBAJO DE SU FILO, que es donde la maqueta la
        pone: la barra es la identidad de la mesa —qué juego, qué código, cómo se
        sale— y el turno es lo que ha cambiado desde la última vez que se miró. Dos
        cosas distintas separadas por el filo de un píxel, que es lo único con lo
        que esta identidad separa nada.
      */}
      <LineaDelTurno mesa={mesa.mesa} nombres={nombres} />
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
      <LaCronica cronica={mesa.cronica} />
    </View>
  );
}

/**
 * LA BARRA DE LA MESA: qué juego, qué código y cómo se sale.
 *
 * ═══ POR QUÉ ES UN COMPONENTE Y ANTES ERAN DOS COPIAS ═══
 *
 * Estaba escrita dos veces —una en la rama con tablero y otra en la de sólo
 * opciones— y las dos copias ya habían empezado a separarse: la sangría de una de
 * ellas estaba rota, que es la señal barata de que alguien pegó y no volvió a
 * mirar. Con la identidad nueva son diez estilos en vez de tres, así que mantener
 * dos copias sincronizadas dejaba de ser una molestia y pasaba a ser una promesa
 * que se rompe sola.
 *
 * ═══ Y AHORA DICE A QUÉ SE ESTÁ JUGANDO ═══
 *
 * El nombre del juego sale del MANIFIESTO, que es un dato, y no de un `if` por
 * juego: este mueble sigue sin saber a qué se juega. Faltaba, y se notaba en la
 * maqueta: una barra que sólo dice «MESA ABCDE» obliga a mirar el tablero para
 * saber dónde estás, y en una partida de tres días eso se pregunta de verdad.
 *
 * El código va en acento porque es lo ÚNICO de esta barra que se toca sin tocarse:
 * es lo que se dicta por teléfono para que venga alguien. Los dos mandos —salir y
 * tirar— van con filo, en gris, y a propósito iguales: quién de los dos es el
 * peligroso lo dice la pregunta que sale al pulsar, no el color. El único rojo de
 * la tabla —`SALA.alarma`— es de «se acaba el tiempo» y gastarlo en un botón que
 * ya está protegido lo dejaría sin significar eso.
 */
function BarraDeLaMesa({
  juego,
  codigo,
  asientos,
  salir,
  tirar,
}: {
  juego: string;
  codigo: string;
  asientos: ReadonlyArray<{ nombre: string; presente: boolean }>;
  salir: () => void;
  tirar: () => void;
}): JSX.Element {
  return (
    <View style={estilos.barra}>
      <View style={estilos.barraFila}>
        <View style={estilos.mesaId}>
          <Text style={estilos.mesaJuego}>{juego}</Text>
          <Text style={estilos.codigo}>Mesa {codigo}</Text>
        </View>
        <View style={estilos.mandos}>
          {/*
            SALIR TIENE QUE ESTAR AQUÍ Y NO SÓLO EN LA PANTALLA DE ERROR.

            Antes el único «Salir de la mesa» vivía en la rama de «esta vista no
            trae tablero», o sea que desde una partida en marcha no había ninguna
            forma de irse: ni para cambiar de juego, ni para dejarle el sitio a
            otro, ni para entrar con otro código. Salir no abandona la partida —el
            asiento sigue siendo tuyo y se recupera volviendo a entrar con el
            código—, sólo cierra esta pantalla.
          */}
          <Pressable
            onPress={salir}
            style={estilos.salir}
            accessibilityRole="button"
            accessibilityLabel="Salir de esta pantalla sin dejar la mesa"
          >
            <Text style={estilos.salirRotulo}>Salir</Text>
          </Pressable>
          <BotonTirar tirar={tirar} />
        </View>
      </View>
      <Text style={estilos.gente}>
        {asientos.map((a) => `${a.nombre}${a.presente ? '' : ' (fuera)'}`).join(' · ')}
      </Text>
    </View>
  );
}

/**
 * LO QUE HA IDO PASANDO, y hasta hoy no se veía en el móvil.
 *
 * El servidor manda los avisos del canal PEGADOS a la mesa, en el mismo viaje.
 * Este cliente los descartaba con un `as { mesa }`, así que «Se acabó la
 * partida» llegaba al PC y no llegaba nunca aquí —y el comentario del servidor
 * que lo manda decía, literalmente, que es «un suceso que la app celebra»—.
 *
 * Se enseñan los tres últimos y no los cuarenta: en una pantalla de móvil la
 * crónica entera se comería el tablero, que es lo que se ha venido a mirar.
 *
 * ═══ Y LOS TRES NO PESAN LO MISMO ═══
 *
 * El primero es lo que acaba de pasar y los otros dos son el contexto que lo hace
 * entendible, así que el de arriba va en `palabra` y los de abajo en `tenue`. Es
 * la única jerarquía que esta capa puede afirmar sin saber a qué se juega —no dice
 * qué es importante, dice qué es RECIENTE— y sale gratis: sin ella los tres
 * renglones eran un párrafo gris del que había que leer los tres para saber cuál
 * era nuevo.
 *
 * Sin acento: la crónica es lo que YA ha pasado, y el acento de esta identidad
 * significa que hay algo vivo que se puede tocar.
 */
function LaCronica({ cronica }: { cronica: readonly AvisoDeMesa[] }): JSX.Element | null {
  if (cronica.length === 0) return null;
  return (
    <View style={estilos.cronica}>
      <Text style={estilos.cronicaEtiqueta}>Crónica</Text>
      {cronica.slice(0, 3).map((a, i) => (
        <Text
          key={`${String(i)}:${a.clave}`}
          style={[estilos.cronicaRenglon, i === 0 ? estilos.cronicaRenglonVivo : null]}
        >
          {a.texto}
        </Text>
      ))}
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
          /*
           * EL RÓTULO ES EL DEL JUEGO, tal cual. Este mueble no sabe a qué se
           * juega, así que no puede inventarse una etiqueta mejor —y en el
           * escritorio estos mismos botones son `<button>` de verdad, o sea que
           * con lector de pantalla se podía jugar desde el PC y no desde el móvil.
           */
          accessibilityRole="button"
          accessibilityLabel={o.rotulo}
          accessibilityHint={o.ayuda.length > 0 ? o.ayuda : undefined}
          accessibilityState={{ disabled: quieto }}
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
  /*
   * SE DICE QUE HA TERMINADO, en vez de apagar la línea y no poner nada.
   *
   * Esto devolvía `null` y `terminada` no se pintaba en ningún otro sitio de la
   * app, o sea que al acabar una partida el móvil se quedaba con el tablero
   * quieto y sin una palabra. Se notaba poco porque hasta hace nada NINGUNA mesa
   * se cerraba jamás; en cuanto empezaron a cerrarse, el silencio pasó a ser lo
   * normal. Quién ganó lo dice el juego en el `aviso` de su tablero: aquí sólo
   * se dice que se acabó, que es lo único que esta capa sabe.
   */
  if (mesa.terminada) {
    return (
      <View style={estilos.turnoCaja} accessible accessibilityRole="text">
        {/*
          RAÍL FRÍO, sin acento. Una partida terminada no pide nada a nadie, y el
          acento de esta identidad quiere decir exactamente lo contrario. Se queda
          con la misma tarjeta que el turno para que el sitio donde se mira «¿tengo
          que hacer algo?» no se mueva al acabarse la partida.
        */}
        <View style={estilos.turnoRail} />
        <View style={estilos.turnoCuerpo}>
          <Text style={estilos.terminada}>La partida ha terminado.</Text>
        </View>
      </View>
    );
  }

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

  /*
   * EL MISMO DATO DICHO DE DOS MANERAS, Y NO SOBRA NINGUNA.
   *
   * En pantalla la tarjeta ya lleva escrito «TIENE EL TURNO» encima, así que
   * debajo va sólo el nombre —o «Te toca»— en grande, que es la maqueta y es lo
   * que se lee de un vistazo. Pero un lector de pantalla no ve una tarjeta: lee
   * una fila detrás de otra, y «Tiene el turno. Ada. Quedan 3 min» suena a tres
   * datos sueltos. `dequien` sigue siendo la frase entera y va al
   * `accessibilityLabel` del conjunto, que es lo que se oye.
   */
  const quien =
    turno.de === null ? 'Nadie todavía' : mio ? 'Te toca' : (nombres.get(turno.de) ?? 'Alguien');

  const cola =
    mesa.venceEn === null
      ? /*
         * Sin plazo no hay cuenta atrás que enseñar, y lo que sí se puede decir es
         * cuánto lleva parado. En una mesa sin prisa es el único número que hay, y
         * es el que decide si merece la pena dar un toque por otro lado.
         */
        cuantoLleva(Math.max(0, ahora - mesa.turnoDesde))
      : cuantoQueda(mesa.venceEn - ahora);

  /*
   * ═══ EL RAÍL, Y POR QUÉ EL CAMPO SE TIÑE SÓLO CUANDO TE TOCA ═══
   *
   * La maqueta pinta el raíl del turno en acento con dos resplandores encima. Aquí
   * el resplandor es imposible —no hay `box-shadow` de color que se vea igual en
   * los dos sistemas— y la traducción honrada de un aura es un CAMPO: `SALA.halo`
   * tiñe la tarjeta entera cuando el turno es tuyo, que es la única vez que esta
   * línea pide algo. Cuando le toca a otro el raíl se queda en filo y la tarjeta
   * en teja: la misma tarjeta, apagada, que es exactamente lo que dice el piloto
   * frío de la maqueta.
   *
   * Tres píxeles de acento y un campo de halo, y ni un color más: el nombre no se
   * tiñe, la cuenta atrás no se tiñe y el rótulo no se tiñe. Cuando todo eso se
   * teñía —y se teñía, con `turnoMio` en neón— la línea gritaba con cuatro voces y
   * no se oía ninguna.
   */
  return (
    <View
      style={[estilos.turnoCaja, mio ? estilos.turnoCajaMia : null]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${dequien} · ${cola}`}
    >
      <View style={[estilos.turnoRail, mio ? estilos.turnoRailMio : null]} />
      <View style={estilos.turnoCuerpo}>
        <View style={estilos.turnoFila}>
          <Text style={estilos.turnoEtiqueta}>Tiene el turno</Text>
          <Text style={estilos.turnoCola}>{cola}</Text>
        </View>
        <Text style={estilos.turnoNombre}>{quien}</Text>
      </View>
    </View>
  );
}

/*
 * ═══ LOS ESTILOS, Y LAS TRES COSAS QUE HAY QUE SABER PARA TOCARLOS ═══
 *
 * 1. NO HAY MATERIA. Aquí no se declara ni una sombra, ni un relieve, ni un
 *    degradado. Lo que separa una superficie de otra es `SALA.filo` —un píxel de
 *    blanco al 7,5 %— y el escalón de `suelo` a `teja`. Si algo hace falta que se
 *    vea más, sube a `filoVivo`; no se le pone sombra.
 *
 * 2. NINGUNA `fontFamily`. La app sólo trae Cinzel y Cormorant, que son del taller
 *    de veladas y aquí no pintan nada, y nombrar una que no existe no da error:
 *    cae en la del sistema en silencio y entonces la tabla miente. El trabajo de
 *    la condensada lo hacen el peso, la caja alta y el tracking de `LETRA`.
 *
 * 3. NINGÚN COLOR SUELTO. Ni un `#rrggbb`, ni un `rgba()`. Los trece de `SALA` y
 *    se acabó — que es lo que permite repintar la Sala entera de ámbar o de verde
 *    cambiando tres valores en `muebles.ts` y ni uno aquí.
 *
 * Y dos mínimos que no se negocian: 44 de alto en todo lo que se toca, y 13 de
 * texto en todo lo que se lee. Los tamaños de la maqueta son de una pantalla de
 * ordenador y bajan hasta 8,5; aquí los rótulos pequeños suben a 13 y el tracking
 * es el que hace que sigan pareciendo rótulos. Cuando un estilo lleva borde, el
 * píxel del borde va restado del hueco para que el hueco siga siendo el mismo.
 */
const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.suelo },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
    backgroundColor: SALA.suelo,
  },
  /* Un título no se puede tocar, así que no lleva acento: era neón y es `palabra`. */
  titulo: { ...LETRA.rotulo, color: SALA.palabra, fontSize: 20 },
  texto: {
    ...LETRA.cuerpo,
    color: SALA.palabra,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 360,
  },
  /* Los dos rótulos que parten la pantalla de entrada en dos caminos. */
  o: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13, marginTop: 8, textAlign: 'center' },
  campo: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: SALA.teja,
    color: SALA.palabra,
    /* `filoVivo` y no `filo`: un campo donde hay que escribir tiene que verse dónde. */
    borderColor: SALA.filoVivo,
    borderWidth: 1,
    borderRadius: RADIO.mando,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  /* 44 de alto: el mismo mínimo de dedo que el retablo aplica a sus figuras. */
  boton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SALA.teja,
    borderColor: SALA.filoVivo,
    borderWidth: 1,
    borderRadius: RADIO.mando,
    paddingVertical: 10,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  /*
   * LA PLACA DE ACENTO, Y POR QUÉ ES `acentoHondo` Y NO `acento`.
   *
   * Blanco sobre `acento` da 3,6:1, que es la misma flaqueza que esta identidad
   * viene a arreglar —el gris tenue de antes iba a 3,11:1—. `acentoHondo` es el
   * otro extremo del degradado que pinta la maqueta, o sea que no es un color
   * inventado sino la mitad honda del suyo, y con `blanco` encima da 6,4:1. El
   * `acento` brillante se queda en el filo, que es donde la maqueta lo pone en su
   * botón de acción.
   */
  botonVivo: { backgroundColor: SALA.acentoHondo, borderColor: SALA.acento },
  /*
   * Y APAGADO PIERDE EL ACENTO, no se limita a atenuarlo. En esta Sala el acento
   * significa «se puede tocar»; un botón de acento que no se deja pulsar dice una
   * cosa y hace otra. Antes no cambiaba nada al deshabilitarse: el único aviso de
   * que faltaba el nombre era que no pasaba nada al pulsar.
   */
  botonQuieto: { borderColor: SALA.filo, opacity: 0.5 },
  botonRotulo: { ...LETRA.rotuloChico, color: SALA.palabra, fontSize: 15 },
  botonRotuloVivo: { color: SALA.blanco, fontWeight: '800' },
  /* La barra se cierra con un filo, que es lo único que separa nada aquí. */
  barra: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 11,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: SALA.filo,
  },
  barraFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  /* Envuelve a los dos por si el nombre del juego es largo: rompe en dos renglones. */
  mesaId: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', flexShrink: 1, gap: 10 },
  mesaJuego: { ...LETRA.rotulo, color: SALA.palabra, fontSize: 15 },
  /* El acento: es lo que se dicta por teléfono para que venga alguien. */
  codigo: { ...LETRA.rotuloChico, color: SALA.acento, fontSize: 13 },
  mandos: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  /* 44 de alto: el mismo mínimo de dedo que el retablo aplica a sus figuras. */
  salir: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderColor: SALA.filoVivo,
    borderWidth: 1,
    borderRadius: RADIO.mando,
  },
  salirRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  gente: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, lineHeight: 18 },

  /* ---------- La tarjeta del turno ---------- */

  turnoCaja: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    /* Es una tarjeta y no un mando, así que se redondea como una ficha. */
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    borderColor: SALA.filo,
    backgroundColor: SALA.teja,
    /* Para que el raíl se corte con el redondeo en vez de asomar por la esquina. */
    overflow: 'hidden',
  },
  /* El aura de la maqueta, traducida a campo: React Native no tiene resplandor. */
  turnoCajaMia: { backgroundColor: SALA.halo },
  turnoRail: { width: 3, alignSelf: 'stretch', backgroundColor: SALA.filoVivo },
  turnoRailMio: { backgroundColor: SALA.acento },
  /* 12 de hueco menos el píxel del borde, para que el hueco siga siendo 12. */
  turnoCuerpo: { flex: 1, paddingVertical: 11, paddingHorizontal: 13, gap: 4 },
  turnoFila: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  /*
   * El rótulo cede antes que la cuenta: `flexShrink` aquí y no en `turnoCola`
   * porque «TIENE EL TURNO» es siempre la misma frase y se sabe de memoria a la
   * segunda partida, mientras que «QUEDAN 3 MIN» es el dato por el que se ha
   * abierto la pantalla. Si algo tiene que romper en dos renglones, que sea lo
   * que ya se sabe.
   */
  turnoEtiqueta: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13, flexShrink: 1 },
  /*
   * `tenue` y no `cifra` para la cuenta atrás, aunque `cifra` sea el token de las
   * cifras de apoyo: blanco al 34 % sobre `teja` compone un 3,15:1, que es la
   * misma flaqueza de contraste que esta identidad viene a corregir. Un número que
   * dice si quedan tres minutos o tres días no es decoración.
   */
  turnoCola: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  turnoNombre: { ...LETRA.rotulo, color: SALA.blanco, fontSize: 22, lineHeight: 26 },
  terminada: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 15, fontWeight: '700' },

  ayuda: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, textAlign: 'center', maxWidth: 320 },
  plazos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  /* 44 de alto: el mismo mínimo de dedo que el retablo aplica a sus figuras. */
  plazo: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderColor: SALA.filo,
    borderWidth: 1,
    borderRadius: RADIO.mando,
    backgroundColor: SALA.teja,
  },
  /* «Lo elegido» es una de las cuatro cosas que el acento puede decir. */
  plazoElegido: { borderColor: SALA.acento, backgroundColor: SALA.acentoHondo },
  plazoRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  plazoRotuloElegido: { ...LETRA.rotuloChico, color: SALA.blanco, fontSize: 13, fontWeight: '800' },
  /*
   * EL AVISO NO ES UNA ALARMA. `SALA.alarma` es de «se acaba el tiempo» y de «esto
   * te mata», y gastarlo en cada tropiezo de la red —que es lo que casi siempre
   * trae `mesa.aviso`— lo dejaría sin querer decir eso el día que haga falta. Va
   * en `tenue`, que es texto que se lee y no grita.
   */
  fallo: {
    ...LETRA.cuerpo,
    color: SALA.tenue,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    textAlign: 'center',
  },
  cronica: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  cronicaEtiqueta: {
    ...LETRA.rotuloChico,
    color: SALA.tenue,
    fontSize: 13,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: SALA.filo,
  },
  cronicaRenglon: {
    ...LETRA.cuerpo,
    color: SALA.tenue,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: SALA.filo,
  },
  /* El de arriba es lo que acaba de pasar; los otros dos son el contexto. */
  cronicaRenglonVivo: { color: SALA.palabra },
  opciones: { padding: 16, gap: 10 },
  /*
   * ═══ LOS BOTONES DEL JUEGO NO LLEVAN ACENTO, Y ES LA MISMA REGLA DE SIEMPRE ═══
   *
   * La maqueta pinta uno de los tres botones de la mesa como placa de color y los
   * otros dos con filo. Aquí no se puede: cuál es el movimiento principal lo sabría
   * un mueble que supiera a qué se juega, y éste no lo sabe —es la condición
   * entera de llamarlo genérico—. Elegir uno sería inventarse una jerarquía que el
   * juego no declaró, que es la misma trampa que un `if` por juego con otra ropa.
   *
   * Así que los tres van iguales, con `filoVivo` para que se lea que se tocan, y el
   * acento de esta pantalla se queda donde sí significa algo que esta capa sabe: el
   * código de la mesa y el raíl del turno cuando el turno es tuyo.
   *
   * 44 de alto: el mismo mínimo de dedo que el retablo aplica a sus figuras.
   */
  opcion: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderColor: SALA.filoVivo,
    borderWidth: 1,
    borderRadius: RADIO.mando,
    backgroundColor: SALA.teja,
    gap: 2,
  },
  opcionQuieta: { borderColor: SALA.filo, opacity: 0.5 },
  opcionRotulo: { ...LETRA.rotuloChico, color: SALA.palabra, fontSize: 15 },
  opcionAyuda: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, lineHeight: 18 },
});
