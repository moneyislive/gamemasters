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
 * Esta pantalla llevaba cinco colores propios —`fondo`, `panel`, `neon`,
 * `neonTenue`, `fallo`— que ya no existen. (Aquí ponía «siete» y enumeraba cinco:
 * la cuenta no salía de contar, salía de recordar.) Lo que se ha hecho no es renombrarlos:
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
 * traducida a plano tiñe la tarjeta de «te toca» y dice lo mismo con lo que hay.
 *
 * ═══ Y LO QUE FALTABA POR DEBAJO DE TODO ESO: QUE CUPIERA Y QUE SE OYERA ═══
 *
 * La identidad estaba puesta y las cuatro pantallas de este fichero seguían sin
 * poder usarse en dos casos que no son raros. Las cuatro cosas que se han
 * arreglado, con su medida, están cada una donde se pintan; en una línea:
 *
 *   · NINGUNA DE LAS CUATRO RAMAS SE DESPLAZABA. El vestíbulo mide entre 553 y 610
 *     píxeles contra los ~568 útiles de un 360x640, y con el teclado abierto contra
 *     ~340 — y como centraba, se perdían a la vez el nombre del juego y el botón de
 *     entrar. En la mesa con tablero el único hijo elástico era el `Retablo`, así
 *     que se encogía a cero: desaparecía el tablero antes de que nada se desplazara.
 *   · NO SE CONTABA EL ÁREA SEGURA, con la cabecera oculta. Los mandos de la barra
 *     empezaban en y=14 contra un inset de 47-59 en un iPhone con muesca.
 *   · LO APAGADO SE APAGABA CON `opacity`, en los dos sitios donde hay algo
 *     apagado, y eso apaga también la letra: la ayuda de un botón de juego caía a
 *     2,32:1 en cada jugada.
 *   · Y NADA DE LO QUE CAMBIA SOLO SE ANUNCIABA: ni el aviso de la mesa, ni la
 *     crónica, ni el turno. Con lector de pantalla se pulsaba «Abrir una mesa» y no
 *     pasaba nada audible.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { conAlfa } from '../tema';
import { BOTON, LETRA, RADIO, SALA } from './muebles';
import { Pantalla } from './piezas';
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
   * ═══ EL ÁREA SEGURA, QUE ESTA PANTALLA NO CONTABA Y SE COMÍA LA BARRA ═══
   *
   * El grupo `(arcade)` monta con `headerShown: false`, así que aquí no hay
   * cabecera que aparte nada: el contenido empieza en y=0. La barra de la mesa
   * ponía sus mandos a `paddingTop: 14`, o sea que en un iPhone con muesca —donde
   * el inset de arriba mide entre 47 y 59— el nombre del juego, el código y los
   * botones «Salir» y «Tirar» caían DEBAJO de la barra de estado y del notch. Por
   * abajo, el último renglón de la crónica quedaba bajo el indicador de inicio, que
   * son otros 34.
   *
   * No es un caso de aparato raro: es todo iPhone desde el X y buena parte de
   * Android. Y no había un solo `useSafeAreaInsets` en la cadena entera —ruta,
   * `pintar.tsx`, este fichero—, mientras que el resto de la app sí lo usa
   * (`app/src/marco.tsx`, `app/src/barra.tsx`). El proveedor ya está montado en
   * `app/app/_layout.tsx`, así que esto no añade dependencia ninguna: sólo lee lo
   * que ya había.
   *
   * Se lee UNA VEZ y aquí arriba, antes de los tres `return` tempranos, porque es
   * un hook y los hooks no se saltan.
   */
  const bordes = useSafeAreaInsets();
  /* Los 28 de relleno de la casa, más lo que el sistema se queda arriba y abajo. */
  const relleno = { paddingTop: bordes.top + 28, paddingBottom: bordes.bottom + 28 };

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
      <Pantalla hueco={28} estilo={relleno}>
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
      </Pantalla>
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
      /*
       * ═══ EL VESTÍBULO SE DESPLAZA, Y ES LO MÁS GRAVE QUE TENÍA ESTA PANTALLA ═══
       *
       * Era un `View` de `flex: 1` con `justifyContent: 'center'` y DOS campos de
       * texto, sin `ScrollView` y sin `KeyboardAvoidingView`. Sumado a escala 1:
       * 56 de relleno + 24 del título + 22..44 del gancho + 41 del campo de nombre
       * + 24 del rótulo + 96..148 de los cinco chips de plazo (envuelven en dos
       * filas a 390 de ancho y en tres a 360) + 17 de la ayuda + 44 de «Abrir» +
       * 24 del segundo rótulo + 41 del campo de CÓDIGO + 44 de «Sentarse» + 120 de
       * los diez huecos de 12 = entre 553 y 610 píxeles, y otros 30 si hay aviso.
       * En un 360x640 de Android quedan ~568 útiles: se sale. Y CON EL TECLADO
       * ABIERTO quedan unos 340, o sea que se sale siempre y en cualquier teléfono.
       *
       * Y como el contenedor centraba, lo que sobraba se repartía por arriba y por
       * abajo: se perdían a la vez el nombre del juego y el botón «Sentarse», sin
       * ninguna forma de llegar a ninguno de los dos.
       *
       * `Pantalla` de `piezas.tsx` es exactamente ese arreglo y ya está medido allí:
       * `KeyboardAvoidingView` con el `behavior` por plataforma envolviendo un
       * `ScrollView` cuyo contenedor de contenido lleva `flexGrow: 1` y
       * `justifyContent: 'center'`. Mientras quepa, esto se ve centrado igual que
       * antes; cuando no quepa —teclado, letra al 200 %, un teléfono corto—, se
       * desplaza. No hay que elegir entre las dos cosas, que era lo que parecía.
       */
      <Pantalla hueco={28} estilo={relleno}>
        <View style={estilos.centro}>
          <Text style={estilos.titulo}>{manifiesto?.nombre ?? id}</Text>
          <Text style={estilos.texto}>{manifiesto?.gancho ?? ''}</Text>
          {/*
            LA ETIQUETA NO PUEDE SER EL `placeholder`, y aquí lo era en los dos
            campos. Un lector de pantalla lee el `placeholder` sólo mientras el
            campo está VACÍO: en cuanto se teclea, lee el valor y no queda nada que
            diga si eso era el nombre o el código. Con dos campos en la misma
            pantalla, eso es quedarse sin saber en cuál se está.
          */}
          <TextInput
            style={estilos.campo}
            placeholder="Tu nombre en la mesa"
            placeholderTextColor={SALA.tenue}
            value={nombre}
            onChangeText={ponerNombre}
            maxLength={24}
            accessibilityLabel="Tu nombre en la mesa"
          />
          {/*
            ═══ CUÁNTO SE ESPERA POR TURNO, QUE ES LO QUE ELIGE LA CLASE DE PARTIDA ═══

            Va ANTES del botón de abrir y no escondido detrás de un ajuste, porque no
            es un ajuste: es la diferencia entre una partida de bar y una de tres
            días, y quien abre la mesa es el único que puede decidirla. Después de
            abrir ya no se puede cambiar — el plazo es de la mesa y la mesa nace con
            él.

            LOS CINCO CHIPS SON UN GRUPO Y AHORA LO DICEN. Eran cinco
            `accessibilityRole="radio"` sueltos: un lector de pantalla los leía uno
            detrás de otro sin nada que los atara al rótulo de aquí encima, así que
            «Como venga» y «Sin prisa» sonaban a dos botones cualesquiera. Con el
            `radiogroup` y su etiqueta, la pregunta se oye antes que las respuestas,
            que es lo que la pantalla ya hacía para quien la ve.
          */}
          <Text style={estilos.rotuloDeGrupo}>cuánto se espera por turno</Text>
          <View
            style={estilos.plazos}
            accessibilityRole="radiogroup"
            accessibilityLabel="Cuánto se espera por turno"
          >
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
            <Text
              style={[
                estilos.botonRotulo,
                noPuedeAbrir ? estilos.botonRotuloQuieto : estilos.botonRotuloVivo,
              ]}
            >
              Abrir una mesa
            </Text>
          </Pressable>
          <Text style={estilos.alternativa}>o entra con el código que te hayan dicho</Text>
          <TextInput
            style={estilos.campo}
            placeholder="CÓDIGO"
            placeholderTextColor={SALA.tenue}
            value={codigo}
            onChangeText={ponerCodigo}
            autoCapitalize="characters"
            maxLength={8}
            accessibilityLabel="Código de la mesa"
          />
          <Pressable
            style={[estilos.boton, noPuedeEntrar ? estilos.botonQuieto : null]}
            disabled={noPuedeEntrar}
            onPress={() => mesa.entrar(codigo, nombre.trim())}
            accessibilityRole="button"
            accessibilityLabel="Sentarse en la mesa de ese código"
            accessibilityState={{ disabled: noPuedeEntrar }}
          >
            <Text style={[estilos.botonRotulo, noPuedeEntrar ? estilos.botonRotuloQuieto : null]}>
              Sentarse
            </Text>
          </Pressable>
          <ElAviso texto={mesa.aviso} />
        </View>
      </Pantalla>
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
            arriba={bordes.top}
          />
          {/*
            ═══ AQUÍ TAMPOCO SE DESPLAZABA NADA, Y ES LA RAMA QUE MÁS CRECE ═══

            Un arcade que declara `opciones()` y no dibuja tablero pinta barra +
            turno + aviso + UN BOTÓN POR OPCIÓN + crónica, todos de alto automático
            y ninguno elástico. Con ocho o diez opciones —que las hay: un juego de
            cartas ofrece una por carta— la lista se salía por abajo y la crónica no
            se veía NUNCA, que además es por donde llega «Se acabó la partida».

            La barra se queda fija arriba porque es de dónde se sale y qué código se
            dicta; todo lo demás baja a un `ScrollView`. Y no hay anidamiento
            posible: en esta rama no hay `Retablo`, que es el único hijo de esta
            pantalla que trae su propio desplazamiento.
          */}
          <ScrollView
            style={estilos.rio}
            contentContainerStyle={{ paddingBottom: bordes.bottom }}
            keyboardShouldPersistTaps="handled"
          >
            <LineaDelTurno mesa={mesa.mesa} nombres={nombres} />
            <ElAviso texto={mesa.aviso} />
            <LasOpciones opciones={opciones} alTocar={mesa.mover} quieto={mesa.quieto} />
            <LaCronica cronica={mesa.cronica} />
          </ScrollView>
        </View>
      );
    }
    return (
      <Pantalla hueco={28} estilo={relleno}>
        <View style={estilos.centro}>
          <Text style={estilos.titulo}>{manifiesto?.nombre ?? id}</Text>
          <Text style={estilos.texto}>
            Esta mesa está abierta y lo que manda no trae tablero ni dice qué se puede hacer, así
            que no hay nada que pintar aquí. Suele significar que esta versión de la app es más
            vieja que el servidor.
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
      </Pantalla>
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
        arriba={bordes.top}
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
      <ElAviso texto={mesa.aviso} />
      {/*
        EL TABLERO SE PINTA TAL Y COMO LLEGA. Ya no se le sustituye nada.

        Hasta la fase 5 aquí se llamaba a `tableroConLosNombres`, que recorría el
        aviso, los rótulos, los botones y los paneles rellenando huecos. Ahora los
        nombres vienen puestos desde la proyección, así que este mueble no toca ni
        una cadena de lo que el juego escribió — que es exactamente lo que un
        mueble genérico debería hacer con un texto que no entiende.

        ═══ Y VA DENTRO DE UNA CAJA CON SUELO, QUE ES LO QUE LE FALTABA ═══

        `Retablo` es lo ÚNICO elástico de esta columna: barra (~90) + tarjeta del
        turno (~85) + crónica de tres renglones (~153) ya son 328, y cuatro
        opciones sueltas añaden 238. En los 568 útiles de un 360x640 eso deja al
        tablero en CERO —o sea que el tablero desaparece— y la crónica cortada
        igualmente. Un `flex: 1` no tiene suelo: encoge hasta nada antes de que
        nada se desplace.

        La caja le pone ese suelo (`minHeight`) y el pie de aquí abajo se encoge
        primero. Y el desplazamiento del tablero no hay que inventarlo: `Retablo`
        ya es un `ScrollView` (`retablo.tsx`), así que lo que sobre de tablero se
        desplaza DENTRO de su caja. Meter todo esto en un segundo `ScrollView`
        habría anidado dos verticales, que es la forma conocida de que ninguno de
        los dos responda bien al dedo.
      */}
      <View style={estilos.cajaDelRetablo}>
        <Retablo tablero={tablero} alTocar={mesa.mover} quieto={mesa.quieto} />
      </View>
      {/*
        Y DEBAJO, LO QUE EL TABLERO NO ENSEÑA. Ni una más: `opcionesSueltas` quita
        las que ya salen dentro de una pieza o de una acción, comparando por forma
        canónica del movimiento y no por identificador. Casi siempre esta lista
        queda vacía —y entonces no se pinta nada—; cuando no, es un movimiento
        legal que hasta hoy sólo existía en el escritorio.

        EL PIE SE ENCOGE Y SE DESPLAZA: `flexShrink: 1` sin `flexGrow`, o sea que
        pide lo que mide y cede lo que haga falta hasta que el tablero llega a su
        suelo. Vacío mide cero y no se nota; con una crónica de tres renglones y
        cuatro opciones sueltas, se lee entero desplazándolo en vez de perderse por
        debajo del borde.
      */}
      <ScrollView
        style={estilos.pieDeLaMesa}
        contentContainerStyle={{ paddingBottom: bordes.bottom }}
      >
        {sueltas.length > 0 ? (
          <LasOpciones opciones={sueltas} alTocar={mesa.mover} quieto={mesa.quieto} />
        ) : null}
        <LaCronica cronica={mesa.cronica} />
      </ScrollView>
    </View>
  );
}

/**
 * ═══ EL AVISO DE LA MESA, QUE SE ESCRIBÍA Y NO SE OÍA ═══
 *
 * «No se ha podido abrir la mesa: …», «Esa mesa ya no existe», «No ha salido el
 * movimiento» son las tres frases con las que esta pantalla contesta a lo único
 * que se le pide. Se pintaban con un `Text` suelto, sin `accessibilityRole` ni
 * región viva, y estaban escritas TRES VECES —una por rama— con el mismo `length
 * > 0` delante.
 *
 * Con lector de pantalla eso era: se pulsa «Abrir una mesa», el foco sigue en el
 * botón, el aviso aparece cuatro renglones más abajo y no pasa NADA audible. O sea
 * que el fallo existía en pantalla y no existía para quien no la ve.
 *
 * `accessibilityLiveRegion` es de Android y `role="alert"` es lo que atiende
 * VoiceOver, así que van los dos: ninguno de los dos solo cubre las dos
 * plataformas, y este es un texto que aparece sin que nadie lo haya ido a buscar.
 * `assertive` y no `polite` porque interrumpe a propósito: si no se oye ahora, se
 * oye cuando ya se ha vuelto a pulsar.
 */
function ElAviso({ texto }: { texto: string }): JSX.Element | null {
  if (texto.length === 0) return null;
  return (
    <Text style={estilos.fallo} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      {texto}
    </Text>
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
  arriba,
}: {
  juego: string;
  codigo: string;
  asientos: ReadonlyArray<{ nombre: string; presente: boolean }>;
  salir: () => void;
  tirar: () => void;
  /**
   * LO QUE EL SISTEMA SE QUEDA ARRIBA, y por qué lo recibe y no lo pregunta.
   *
   * `useSafeAreaInsets` es un hook, así que llamarlo aquí lo llamaría también en
   * la rama que no monta barra y ataría este componente al proveedor. Llega como
   * número desde la pantalla, que es quien ya lo lee una vez para las cuatro
   * ramas. Se SUMA a los 14 de la casa en vez de sustituirlos: sin muesca el
   * inset vale 0 y la barra queda exactamente como estaba.
   */
  arriba: number;
}): JSX.Element {
  const sentados = asientos.map((a) => `${a.nombre}${a.presente ? '' : ' (fuera)'}`);
  return (
    <View style={[estilos.barra, { paddingTop: arriba + 14 }]}>
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
      {/*
        LA LISTA DE ASIENTOS DICE QUÉ ES, y hasta ahora sólo lo decía la
        composición. Con lector de pantalla esta línea sonaba «Ana · Beto (fuera)»
        detrás del código de la mesa, sin nada que dijera que eso es la gente
        sentada: dos nombres sueltos después de un código se leen como parte del
        código. El texto de pantalla no cambia —quien la ve ya sabe qué es— y la
        etiqueta lo pone delante para quien no.
      */}
      <Text style={estilos.gente} accessibilityLabel={`Sentados: ${sentados.join(', ')}`}>
        {sentados.join(' · ')}
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
    /*
      ES UNA REGIÓN VIVA, porque es por donde llega lo que pasa cuando no estás
      tocando nada: «Se acabó la partida», «Ada levanta choza». Sin esto, en una
      partida de tres días quien juega con lector de pantalla tiene que ir a
      buscar el renglón para enterarse de que ha cambiado, o sea que el aviso deja
      de ser un aviso. `polite` y no `assertive` a diferencia del fallo: esto es
      relato, no respuesta a un botón, y no debe cortar lo que se esté leyendo.
    */
    <View style={estilos.cronica} accessibilityLiveRegion="polite">
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
          <Text style={[estilos.opcionRotulo, quieto ? estilos.opcionRotuloQuieto : null]}>
            {o.rotulo}
          </Text>
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
  /*
   * «Te toca» EN CAJA NORMAL DENTRO DE LA CADENA, y no «TE TOCA». Esta frase no se
   * pinta: es sólo lo que se OYE, y hay lectores que deletrean una palabra en
   * mayúsculas —«te-e, te-o-ce-a»— porque no distinguen un énfasis de una sigla.
   * Las mayúsculas de esta Sala las pone `LETRA.rotulo` con `textTransform`, que es
   * pintura y no llega al texto; ésta llegaba.
   */
  const dequien =
    turno.de === null
      ? 'Todavía no le toca a nadie'
      : mio
        ? 'Te toca'
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
   * línea pide algo. Cuando le toca a otro la tarjeta se queda en teja y el raíl en
   * blanco: la misma tarjeta, apagada, que es lo que dice el piloto frío de la
   * maqueta. El raíl frío estuvo en `filoVivo` y ahí no se veía —1,51:1—, que no es
   * un piloto apagado sino ningún piloto; la medida está donde se pinta.
   *
   * Cinco píxeles de acento y un campo de halo, y ni un color más: el nombre no se
   * tiñe, la cuenta atrás no se tiñe y el rótulo no se tiñe. Cuando todo eso se
   * teñía —y se teñía, con `turnoMio` en neón— la línea gritaba con cuatro voces y
   * no se oía ninguna.
   */
  return (
    /*
      REGIÓN VIVA, que es lo que le faltaba a la línea mejor etiquetada de la
      pantalla. La etiqueta ya componía la frase entera —«Le toca a Ada · quedan 3
      min»— pero nadie la volvía a leer: en una partida de tres días el turno
      cambia mientras la pantalla está abierta y sin tocar nada, y sin región viva
      ese cambio no se oye NUNCA. Es exactamente el escenario para el que se
      escribió esta línea.
    */
    <View
      style={[estilos.turnoCaja, mio ? estilos.turnoCajaMia : null]}
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
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
 *    degradado. Lo que separa una superficie de otra es un FILO de un píxel y el
 *    escalón de `suelo` a `teja`. Lo que ha cambiado es CUÁNTO filo: `SALA.filo`
 *    (blanco al 7,5 %) se recorta del suelo con 1,17:1 y `SALA.filoVivo` (14 %)
 *    con 1,42:1, o sea que ninguno de los dos llega al 3:1 que necesita un
 *    elemento no textual para verse. Sirven de filete entre dos zonas que ya se
 *    distinguen por otra cosa; NO sirven para dibujar el contorno de un mando ni
 *    de un campo, que era donde estaban puestos. Ahí va blanco al 40 % —3,57
 *    sobre el suelo y 3,63 sobre la teja— y sigue sin ser una sombra.
 *
 * 2. NINGUNA `fontFamily`. La app sólo trae Cinzel y Cormorant, que son del taller
 *    de veladas y aquí no pintan nada, y nombrar una que no existe no da error:
 *    cae en la del sistema en silencio y entonces la tabla miente. El trabajo de
 *    la condensada lo hacen el peso, la caja alta y el tracking de `LETRA`.
 *
 * 3. NINGÚN COLOR INVENTADO. Ni un `#rrggbb`. Los catorce de `SALA` —diez neutros,
 *    tres teñidos y `alarma`— y los alfas que `conAlfa` saca de ellos, que es lo
 *    mismo que hacen la tarjeta de la portada y `piezas.tsx`. (Aquí ponía «los
 *    trece» y se dieron por buenos: la tabla tiene catorce entradas.) Eso es lo
 *    que permite repintar la Sala entera de ámbar o de verde cambiando tres
 *    valores en `muebles.ts` y ni uno aquí.
 *
 * Y dos mínimos que no se negocian: 44 de alto en todo lo que se toca —el `campo`
 * se quedaba en ~41 y ya no—, y 13 de texto en todo lo que se lee. Los tamaños de
 * la maqueta son de una pantalla de ordenador y bajan hasta 8,5; aquí los rótulos
 * pequeños suben a 13 y el tracking es el que hace que sigan pareciendo rótulos.
 *
 * ═══ Y NINGÚN `maxFontSizeMultiplier`, QUE AHORA SÍ ES LA RESPUESTA BUENA ═══
 *
 * No hay ni un tope de ampliación en las 21 declaraciones de `fontSize` de este
 * fichero, y eso ES lo correcto: un tope se pone cuando el texto vive en una caja
 * de alto fijo que lo cortaría —la portada de la tarjeta de la Sala lo hace, y deja
 * el cálculo escrito— y aquí no hay ninguna. Lo que faltaba no era el tope: era el
 * desplazamiento. Con las cuatro ramas desplazándose, al 200 % del sistema el
 * vestíbulo pasa de ~580 a ~1.100 píxeles y se lee entero bajando; con un tope se
 * leería más pequeño de lo que se ha pedido. Si alguien vuelve a meter aquí una
 * caja de alto fijo, entonces sí hará falta, y con su cuenta al lado.
 */
const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.suelo },
  /*
   * EL BLOQUE CENTRADO DE LAS TRES PANTALLAS SIN MESA. Ya no lleva `flex: 1`, ni
   * `justifyContent`, ni relleno, ni fondo: los cuatro los pone `Pantalla`, y eran
   * exactamente las cuatro cosas que hacían que esto centrara y recortara a la vez.
   * Lo que queda aquí es lo que sigue siendo de la composición y no del marco: que
   * los hijos se centren a lo ancho y que haya 12 entre ellos.
   */
  centro: { width: '100%', alignItems: 'center', gap: 12 },
  /* El cauce que se desplaza debajo de la barra en la mesa sin tablero. */
  rio: { flex: 1 },
  /*
   * EL PIE DE LA MESA CON TABLERO: `flexShrink` sin `flexGrow`. Pide lo que mide
   * —cero si no hay ni opciones sueltas ni crónica— y cede todo lo que haga falta
   * antes de que el tablero baje de su suelo, desplazándose por dentro.
   *
   * EL `flexGrow: 0` HAY QUE ESCRIBIRLO. Un `ScrollView` de React Native no nace
   * neutro: compone `{ flexGrow: 1, flexShrink: 1 }` DEBAJO del estilo que se le
   * pase (`ScrollView.js`, `baseVertical`), así que sin esta línea el pie crecería
   * con la misma fuerza que la caja del tablero y se repartirían el hueco libre a
   * medias — la mitad de la pantalla en blanco debajo de una crónica de tres
   * renglones, y el tablero a la mitad de lo que le toca.
   */
  pieDeLaMesa: { flexGrow: 0, flexShrink: 1 },
  /*
   * EL SUELO DEL TABLERO. 200 no es un número redondo elegido a ojo: por debajo de
   * ahí el `Retablo` deja de enseñar el tablero y pasa a enseñar el panel del turno
   * y medio hexágono, o sea que deja de servir para jugar. Prefiere quedarse corto
   * y desplazarse por dentro —que es lo que sabe hacer— a desaparecer.
   */
  cajaDelRetablo: { flex: 1, minHeight: 200 },
  /*
   * EL NOMBRE DEL JUEGO, QUE ENCOGÍA AL CRUZAR LA PUERTA. En la tarjeta de la Sala
   * es el objeto grande de la portada —26/31 en blanco— y aquí era un título de 20
   * en `palabra`: la misma máquina, dos tamaños, a un toque de distancia. Sube a
   * los 26/31 de la casa. Sigue sin llevar acento, que es lo que decía este
   * comentario y sigue valiendo: un título no se puede tocar.
   */
  titulo: { ...LETRA.rotulo, color: SALA.blanco, fontSize: 26, lineHeight: 31, textAlign: 'center' },
  texto: {
    ...LETRA.cuerpo,
    color: SALA.palabra,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 360,
  },
  /* El rótulo que encabeza el grupo de plazos. Dos palabras: rótulo de verdad. */
  rotuloDeGrupo: {
    ...LETRA.rotuloChico,
    color: SALA.tenue,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  /*
   * «o entra con el código que te hayan dicho» ES UNA FRASE, NO UNA ETIQUETA.
   *
   * Estaba en `rotuloChico`, o sea 39 caracteres en versalitas con 1,6 de tracking:
   * una frase entera gritada. La casa ya se mudó a caja baja para esto —el pie de
   * la tarjeta de la Sala lo razona: «un pie con cuatro tipografías se lee como una
   * ficha técnica»— y `retablo.tsx` toma la misma decisión con el aviso del juego.
   * La jerarquía la sigue dando el cuerpo y el color, que no se tocan.
   */
  alternativa: {
    ...LETRA.cuerpo,
    color: SALA.tenue,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  campo: {
    width: '100%',
    maxWidth: 320,
    /*
     * 44 DE ALTO, QUE ES EL MÍNIMO QUE ESTE MISMO BLOQUE DECLARA. Sin él, el alto
     * real era 10 + 10 de relleno + ~19 de línea + 2 de filo = ~41: tres píxeles
     * por debajo del mínimo de dedo, en el único sitio de la pantalla donde hay
     * que acertar dos veces. `textAlignVertical` es de Android, donde el texto de
     * un campo con alto mínimo se pega arriba si no se dice.
     */
    minHeight: 44,
    textAlignVertical: 'center',
    backgroundColor: SALA.teja,
    color: SALA.palabra,
    /*
     * EL CONTORNO, QUE ERA UNA PROMESA SIN CUMPLIR. Aquí ponía «`filoVivo` y no
     * `filo`: un campo donde hay que escribir tiene que verse dónde», y `filoVivo`
     * es blanco al 14 %: 1,42:1 sobre el suelo. El relleno tampoco ayuda —teja
     * sobre suelo son 1,09:1—, o sea que lo ÚNICO que localizaba el campo era su
     * propio texto de sugerencia, y ése desaparece en cuanto se escribe. Blanco al
     * 40 % da 3,57 sobre el suelo: es el escalón más bajo que pasa el 3:1 de un
     * elemento no textual, que es lo que un contorno es.
     */
    borderColor: conAlfa(SALA.blanco, 0.4),
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
    /* El contorno de un mando: 3,57 sobre el suelo. `filoVivo` daba 1,42. */
    borderColor: conAlfa(SALA.blanco, 0.4),
    borderWidth: 1,
    borderRadius: RADIO.mando,
    paddingVertical: 10,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  /*
   * ═══ LA PLACA DE ACENTO, Y POR QUÉ YA NO ES `acentoHondo` CON BLANCO ═══
   *
   * Aquí ponía que `acentoHondo` «con `blanco` encima da 6,4:1», sin decir de qué
   * tema hablaba y en un fichero cuya cabecera presume de que la Sala se repinta
   * entera cambiando tres valores. Medido en los cuatro: 6,57 en violeta, 4,64 en
   * ámbar, 4,64 en verde y 7,41 en carmesí. Ninguno es 6,4 — el número no salía de
   * ningún cálculo.
   *
   * Y los dos 4,64 son el problema de verdad: pasan el mínimo de 4,5 por catorce
   * centésimas, que es exactamente la cifra que la tarjeta de la Sala se negó a
   * aceptar —«cualquier cosa que lo roce, un `opacity` en un contenedor, una
   * animación de entrada, un modo de ahorro que atenúe la pantalla, lo rompe sin
   * que ninguna comprobación se entere»—. Allí se resolvió con un velo; aquí no hay
   * velo que poner. Además el relleno de `acentoHondo` se recorta de la teja con
   * 2,55 en violeta y 2,26 en carmesí, o sea que ni el relleno llegaba al 3:1.
   *
   * `BOTON.primario` —relleno de `acento` con tinta `suelo`— es la única pareja
   * sólida que pasa las dos cosas en los cuatro temas: texto 5,01 / 9,22 / 8,69 /
   * 5,40 y relleno contra la teja 4,58 / 8,44 / 7,96 / 4,94. Está medida en
   * `muebles.ts` y se usa tal cual, sin repetir aquí ningún color.
   */
  botonVivo: { backgroundColor: BOTON.primario.fondo, borderColor: BOTON.primario.borde },
  /*
   * ═══ APAGADO PIERDE EL ACENTO, QUE ES LO QUE ESTE COMENTARIO YA DECÍA ═══
   *
   * Lo decía —«no se limita a atenuarlo»— encima de un `opacity: 0.5`, que es
   * literalmente atenuarlo. Y atenuar el contenedor atenúa también la letra: el
   * rótulo se quedaba en 4,49:1, que falla el 4,5 por una centésima, y el botón
   * entero dejaba de recortarse del suelo (relleno 1,04:1, borde 1,12:1). O sea que
   * lo único que quedaba en pantalla era un texto flotando sin botón — y éste es el
   * estado en el que NACE el vestíbulo, porque el campo del nombre empieza vacío.
   *
   * `BOTON.quieto` apaga con COLOR: teja lisa, filo apagado y el rótulo a `tenue`,
   * que sobre la teja da 5,95:1 en vez de los 2,42 que dejaba el 50 % de opacidad.
   * Es la corrección que `retablo.tsx` ya tenía escrita al lado —«DISPONIBLE Y NO
   * DISPONIBLE SE DISTINGUEN POR COLOR, NO POR OPACIDAD»— y que este fichero seguía
   * ignorando en dos sitios.
   */
  botonQuieto: { backgroundColor: BOTON.quieto.fondo, borderColor: BOTON.quieto.borde },
  /*
   * EL RÓTULO DE UN BOTÓN ES `rotulo`, NO `rotuloChico`. La casa reserva
   * `rotuloChico` —peso 600, tracking 1,6— para los 13 px de una cápsula, y pone
   * `rotulo` —peso 800, tracking 1,4— a 14 en el botón de la tarjeta. Aquí iba
   * `rotuloChico` a 15, que es la mezcla de los dos: el tracking del pequeño con el
   * cuerpo del grande.
   */
  botonRotulo: { ...LETRA.rotulo, color: SALA.palabra, fontSize: 14 },
  /* Tinta oscura sobre el acento CLARO. Blanco encima de ese extremo da 1,98 en ámbar. */
  botonRotuloVivo: { color: BOTON.primario.tinta },
  botonRotuloQuieto: { color: BOTON.quieto.tinta },
  /*
   * La barra se cierra con un filo, que aquí sí es lo que un filo hace: separar dos
   * zonas que ya se distinguen por lo que hay dentro. El `paddingTop` no está aquí:
   * lo pone quien monta la barra, sumándole el área segura del aparato.
   */
  barra: {
    paddingHorizontal: 16,
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
    /* Mismo contorno que los otros mandos: 3,57 sobre el suelo. */
    borderColor: conAlfa(SALA.blanco, 0.4),
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
    /*
     * ═══ LA TARJETA DEL TURNO NO ERA UNA TARJETA: ERA UN BLOQUE DE TEXTO ═══
     *
     * Su relleno se recortaba del fondo con 1,09:1 (teja sobre suelo) y su borde
     * con 1,17:1 (`SALA.filo`), o sea que en la pantalla del tablero no había
     * ninguna caja: había cuatro líneas de texto flotando. Y con el turno tuyo el
     * fondo pasa a `SALA.halo`, que sube ese recorte a 1,21-1,39 y tampoco es una
     * caja. Blanco al 40 % da 3,57 sobre el suelo y 3,63 sobre la teja: pasa el
     * 3:1 de un elemento no textual en los cuatro temas, que es lo que hace falta
     * para que un contorno cuente como contorno.
     *
     * Es la única caja de la pantalla que sube de filo a contorno, y a propósito:
     * es donde se mira «¿tengo que hacer algo hoy?» al volver a una partida de
     * tres días. Los filetes que sólo separan zonas —la barra, la crónica— se
     * quedan en `SALA.filo`, porque ahí no se está dibujando ninguna caja.
     */
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.teja,
    /* Para que el raíl se corte con el redondeo en vez de asomar por la esquina. */
    overflow: 'hidden',
  },
  /* El aura de la maqueta, traducida a campo: React Native no tiene resplandor. */
  turnoCajaMia: { backgroundColor: SALA.halo },
  /*
   * ═══ EL RAÍL FRÍO SE VE, Y LA DIFERENCIA NO LA LLEVA EL ALFA ═══
   *
   * Era `SALA.filoVivo`, blanco al 14 %: 1,51:1 sobre su propia teja. El comentario
   * de arriba lo llamaba «exactamente lo que dice el piloto frío de la maqueta»,
   * pero un piloto que no se ve no es un piloto apagado: es un piloto que no está,
   * y entonces el raíl no dice nada en NINGUNO de los dos estados —que es el mismo
   * error que el raíl de aforo tuvo tres veces, con su medida en `piezas.tsx`:
   * «desaparecer no es se ve menos»—.
   *
   * Blanco al 55 % da 5,75 sobre la teja y 5,07 sobre el halo. Y la distinción
   * encendido/apagado la lleva el ANCHO —3 contra 5— además del color, que es la
   * misma regla que allí resuelve con la altura de la muesca: si la única
   * diferencia es la tinta, un aparato con la pantalla atenuada las iguala.
   */
  turnoRail: { width: 3, alignSelf: 'stretch', backgroundColor: conAlfa(SALA.blanco, 0.55) },
  turnoRailMio: { width: 5, backgroundColor: SALA.acento },
  /*
   * 12 de hueco, y los píxeles de filo restados donde los hay: arriba, abajo y a la
   * derecha hay borde, así que 11; a la izquierda lo que hay es el raíl, que no es
   * el borde de esta caja, así que van los 12 enteros. Aquí ponía «12 menos el
   * píxel del borde» sobre un `paddingHorizontal: 13`, que daba 14 a la derecha y
   * 13 a la izquierda: ninguno de los dos era 12.
   */
  turnoCuerpo: {
    flex: 1,
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 11,
    gap: 4,
  },
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
   * cifras de apoyo: blanco al 34 % sobre `teja` compone un 3,11:1 —aquí ponía
   * 3,15, y 3,11 es además la cifra que este mismo fichero da para esa pareja unas
   * líneas más arriba—, que es la misma flaqueza de contraste que esta identidad
   * viene a corregir. Un número que dice si quedan tres minutos o tres días no es
   * decoración.
   *
   * Y `tenue` está medido contra DOS fondos, no contra uno: sobre la teja da 5,95,
   * pero cuando el turno es tuyo esta misma caja se pinta de `SALA.halo` sobre el
   * suelo, y ahí da 5,32 en violeta, 4,69 en ámbar, 4,76 en verde y 5,36 en
   * carmesí. Pasan los cuatro, y los dos ajustados son ámbar y verde, que son
   * justo los temas donde el resto de esta pantalla también iba justo. Quien baje
   * un escalón este color tiene que mirar esa columna y no la de la teja.
   */
  turnoCola: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  /*
   * EL NOMBRE, EN LA MISMA GRAFÍA QUE DOS DEDOS MÁS ARRIBA. Llevaba `LETRA.rotulo`
   * entero, o sea `textTransform: 'uppercase'`, así que esta tarjeta decía «ANA» y
   * la lista de asientos de la barra decía «Ana» — el mismo jugador con dos grafías
   * en la misma pantalla, que se lee como dos personas antes que como un estilo. Se
   * queda el peso y el tracking del rótulo, que es de donde sale la voz de cartel
   * según `LETRA`, y se suelta la caja alta: un nombre propio no es una etiqueta.
   */
  turnoNombre: {
    ...LETRA.rotulo,
    textTransform: 'none',
    color: SALA.blanco,
    fontSize: 22,
    lineHeight: 26,
  },
  terminada: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 15, fontWeight: '700' },

  ayuda: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, textAlign: 'center', maxWidth: 320 },
  plazos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  /*
   * 44 de alto: el mismo mínimo de dedo que el retablo aplica a sus figuras. Y el
   * contorno es el mismo que el de los otros mandos de esta pantalla: estos chips
   * llevaban `SALA.filo` mientras el campo, el botón, «Salir» y las opciones
   * llevaban `filoVivo`, o sea dos niveles distintos para el mismo tipo de mando en
   * la misma pantalla. Ahora los cinco se dibujan con el contorno que se ve.
   */
  plazo: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderColor: conAlfa(SALA.blanco, 0.4),
    borderWidth: 1,
    borderRadius: RADIO.mando,
    backgroundColor: SALA.teja,
  },
  /*
   * «Lo elegido» es una de las cuatro cosas que el acento puede decir, y para
   * decirlo tiene que separarse del chip de al lado: `acentoHondo` plano sobre la
   * teja del vecino se recortaba con 2,55 en violeta y 2,26 en carmesí, por debajo
   * del 3:1. Es un MANDO y no una placa de portada, así que la casa lo resuelve con
   * `BOTON.primario` —relleno de `acento`, que se recorta de la teja con 4,58 a
   * 8,44, y tinta `suelo` encima, 5,01 a 9,22— en vez de con un degradado. El peso
   * 800 se queda: es lo que distingue al elegido si alguien mira sólo la letra.
   */
  plazoElegido: { borderColor: BOTON.primario.borde, backgroundColor: BOTON.primario.fondo },
  plazoRotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  plazoRotuloElegido: {
    ...LETRA.rotuloChico,
    color: BOTON.primario.tinta,
    fontSize: 13,
    fontWeight: '800',
  },
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
   * Así que los tres van iguales, con el contorno de mando de esta pantalla —blanco
   * al 40 %, que es el escalón más bajo que se recorta de la teja— y el
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
    /* Mismo contorno que los otros mandos: 3,63 sobre la teja. */
    borderColor: conAlfa(SALA.blanco, 0.4),
    borderWidth: 1,
    borderRadius: RADIO.mando,
    backgroundColor: SALA.teja,
    gap: 2,
  },
  /*
   * ═══ ESTE ES EL `opacity` QUE MÁS DOLÍA, PORQUE ES EL DE CADA JUGADA ═══
   *
   * `quieto` es cierto cada vez que hay un movimiento en vuelo, o sea en CADA
   * jugada y no en un caso raro. Con `opacity: 0.5` sobre el contenedor, la ayuda
   * de 13 px que escribió el juego —la que dice qué hace ese botón— caía de 5,95 a
   * 2,32:1, el rótulo de 15 px a 4,49 (falla el 4,5 por una centésima) y el borde a
   * 1,12, o sea que el botón se quedaba sin contorno. Medio segundo de cada jugada,
   * la lista de movimientos era ilegible.
   *
   * `BOTON.quieto` lo apaga con color y la ayuda no se entera: se queda en `tenue`
   * sobre la teja, 5,95:1, exactamente igual que cuando el botón responde. Lo que
   * baja es el rótulo, de `palabra` a `tenue`, que es la señal — y sigue en 5,95.
   */
  opcionQuieta: { backgroundColor: BOTON.quieto.fondo, borderColor: BOTON.quieto.borde },
  opcionRotulo: { ...LETRA.rotuloChico, color: SALA.palabra, fontSize: 15 },
  opcionRotuloQuieto: { color: BOTON.quieto.tinta },
  opcionAyuda: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 13, lineHeight: 18 },
});

/*
 * ═══ LO QUE EL PINTOR PROPIO DE RIBERAS REUTILIZA DE AQUÍ, Y POR QUÉ SE EXPORTA ═══
 *
 * `riberas-en-tres-escena.tsx` pinta la misma mesa que esta pantalla —barra, línea
 * del turno, aviso, opciones sueltas y crónica— y en vez del `Retablo` pone un
 * lienzo de tres dimensiones. Todo lo que no es el lienzo es ESTA pantalla, y
 * copiarlo allí sería estrenar la segunda copia de la barra de la mesa: la primera
 * ya se separó sola una vez, y está contado en la cabecera de `BarraDeLaMesa`.
 *
 * Los estilos van con las piezas por lo mismo: el vestíbulo de abrir o entrar que
 * aquel fichero pinta cuando no hay mesa usa estos campos, estos chips y este
 * botón, y un vestíbulo con OTRO contorno de campo a un toque de distancia se lee
 * como un descuido antes que como otra pantalla. Se exporta la tabla entera y no
 * seis entradas sueltas para que la siguiente que haga falta no obligue a volver
 * aquí.
 *
 * Nada de lo de arriba cambia: esta pantalla sigue siendo el mueble genérico, y
 * sigue sin saber a qué se juega.
 */
export { BarraDeLaMesa, LineaDelTurno, LasOpciones, LaCronica, ElAviso, estilos as ESTILOS_DE_LA_MESA };
