/**
 * LAS MESAS: quién está sentado, quién manda y dónde se guarda todo.
 *
 * Este fichero es la otra mitad de `arbitro.ts`. Allí está la decisión —quién
 * puede mover, sobre qué revisión, y llamar a las reglas—; aquí está lo que hace
 * falta para que esa decisión ocurra: una mesa que existe, un código para
 * entrar, un candado que serializa, un almacén que sobrevive al despliegue y un
 * reloj de pared que hace vencer los plazos.
 *
 * ═══ UNA MESA NACE DE UN CÓDIGO QUE GENERA EL PRIMER JUGADOR ═══
 *
 * Y no de `personasDe(game)` copiado por un Game Master. Es LA diferencia con el
 * motor de veladas, donde la sesión nace copiando a sillas las entidades que un
 * humano dio de alta en el taller: allí nadie puede jugar si antes no hubo un
 * taller, una cuenta y una contraseña.
 *
 * Aquí quien quiere jugar abre la mesa. El servidor le devuelve un código de
 * cinco letras, y quien tenga el código se sienta. No hay taller, no hay cuenta,
 * no hay correo y no hay obligaciones de datos personales: un asiento es un
 * nombre tecleado. Por eso `routes/arcade.ts` va DELANTE de `requireAuth` y no
 * detrás — un arcade no tiene Game Master y no puede vivir detrás del guardián
 * del taller.
 *
 * ═══ LAS CUATRO COSAS QUE OBLIGA «LA LARGA», PAGADAS AQUÍ ═══
 *
 * La Larga —Riberas jugado en turnos de DÍAS— se estrena dos fases más tarde, y
 * sus cuatro requisitos se pagan en este fichero porque escribirlos después
 * significaría reescribirlo entero. Escribir `mesas.ts` pensando solo en La
 * Ronda —cuatro personas, diez minutos, todas mirando— es cómo la mesa saldría
 * con forma de partida corta.
 *
 *  1. LA MESA PERSISTE. Una partida de tres días no puede vivir en un proceso
 *     que Render reemplaza en cada despliegue. Ver «El almacén», abajo.
 *  2. PRESENCIA ≠ PARTICIPACIÓN. En una velada, quien no está conectado no está
 *     jugando, y el panel lo pinta gris. En una mesa asíncrona sigue en la
 *     partida y LE TOCA. Aquí `sillas` es participación y no cambia nunca por
 *     desconectarse; la presencia se lee aparte, de `mecanicas/presencia.ts`, y
 *     solo sirve para pintar un punto.
 *  3. LOS PLAZOS SE MIDEN EN RELOJ DE PARED cuando el juego no tiene tic. Ver
 *     «El plazo que no vencía nunca», abajo, que es lo más delicado del fichero.
 *  4. UN `rev` RANCIO DE DÍAS NO ES UN ERROR. Es alguien que volvió del trabajo.
 *     Por eso la revisión se comprueba al ESCRIBIR y jamás al leer: leer con una
 *     revisión de la semana pasada devuelve el estado completo y ya está. Ver
 *     `mirar`.
 *
 * ═══ Y LO QUE LA FASE 4 BIS TUVO QUE AÑADIR, QUE ES UNA COSA Y SE DICE ═══
 *
 * Cuando La Larga se estrenó de verdad, las cuatro de arriba estaban pagadas y
 * `PLAZO_MAXIMO_S` ya admitía siete días, así que una partida en turnos de
 * veinticuatro horas no necesitó ni una línea nueva: es `plazoSegundos: 86400` en
 * la petición que abre la mesa. El eje estaba bien elegido y eso es lo que el §9
 * quería medir.
 *
 * Lo único que faltaba era `turnoDesde`, y faltaba porque es una pregunta que
 * sólo existe a escala de días: DESDE CUÁNDO se está esperando a quien tiene el
 * turno. En una partida de diez minutos nadie la hace —los cuatro están mirando
 * la pantalla—; en una de tres días es de lo que cuelga que se pueda escribir un
 * «te toca a ti». La otra mitad de esa pregunta, a QUIÉN le toca, no puede vivir
 * aquí porque el estado es opaco: la declara el juego en su vista y la lee
 * `shared/mecanicas/turno-declarado.ts`.
 *
 * Lo comprueba `verify:larga`, con el servidor levantado y el reloj inyectado.
 *
 * ═══ EL PLAZO QUE NO VENCÍA NUNCA ═══
 *
 * El §5.4 del diseño lo plantea así: con `tickHz: 0` y autoridad de servidor,
 * los plazos vencen entrando por el reductor PERO SI NADIE SE MUEVE NO ENTRA
 * NADA. Una oferta con caducidad no caduca; un turno con reloj no pasa.
 *
 * La salida NO es un temporizador de servidor —un plazo que vence fuera del
 * reductor es un cambio de estado que no está en el diario, así que reejecutar
 * la partida daría otra cosa y la repetición dejaría de verificar nada— sino
 * EVALUACIÓN PEREZOSA EN LA LECTURA: antes de devolver nada, se compara el reloj
 * de pared con el vencimiento de la mesa y, si toca, se mete un tic por la
 * puerta de siempre. El reductor sigue siendo la única puerta y sigue siendo
 * puro.
 *
 * Eso convierte una lectura en una escritura, y tiene DOS consecuencias que el
 * diseño exigía resolver y no esquivar:
 *
 *   · EL CANDADO CUBRE LA RUTA DE LECTURA. Aquí no hay una función de leer y
 *     otra de escribir: hay `conLaMesa`, y las dos pasan por ella. Ver abajo.
 *   · UNA ESPERA APARCADA VEINTICINCO SEGUNDOS TIENE QUE DESPERTARSE POR
 *     VENCIMIENTO. Eso es el sexto verbo del canal, `despertarAlVencer`, y lo
 *     usa `routes/arcade.ts` porque avisar es transporte.
 *
 * ═══ DÓNDE VIVE EL PLAZO, QUE ES LA DECISIÓN QUE EL DOCUMENTO NO CIERRA ═══
 *
 * El §5.4 dice «el sondeo compara el reloj de pared con los plazos absolutos que
 * hay EN EL ESTADO». Y el estado del juego es OPACO: esta capa no puede leer un
 * plazo de dentro sin romper lo único de lo que cuelga todo el diseño. Con
 * `tickHz > 0` no haría falta —tic y reloj de pared se convierten el uno en el
 * otro sabiendo la frecuencia— pero con `tickHz: 0` no hay conversión posible:
 * `ticsPara(45, 0)` es infinito por contrato.
 *
 * Así que el plazo absoluto vive AQUÍ, en la mesa, que es autoridad y sí sabe
 * qué hora es. El reparto queda:
 *
 *   · LA MESA sabe cuánto se espera (`plazoMs`) y cuándo se acaba (`venceEn`).
 *     Es un dato de la mesa y no del juego, y eso además es lo correcto de
 *     producto: «veinticuatro horas por turno» es una decisión de quien abre la
 *     partida, no una regla de Riberas.
 *   · EL JUEGO sabe QUÉ SIGNIFICA que venza, y lo escribe como su rama de
 *     `arcade:tic`. En La Ronda significa «se le pasa el turno y se le echa la
 *     carta más baja».
 *
 * Queda escrito como decisión y no como descuido: si algún día un juego necesita
 * varios plazos distintos a la vez —dos ofertas de trueque caducando a horas
 * distintas— esto se queda corto y habrá que darle a la mesa una lista de
 * vencimientos en vez de uno. Hoy no hay ningún juego que lo pida, y el diseño
 * es explícito en que nada se escribe antes de su fase.
 *
 * ═══ EL ALMACÉN ES PROPIO, Y ESO TAMBIÉN ES UNA DECISIÓN ═══
 *
 * No se reutiliza `db/store.ts`: su interfaz es forma de velada —`getLive`,
 * `saveLive`, `listGames`— y meter mesas ahí obligaría a ampliarla con métodos
 * que las veladas no usan, que es la primera de las cien líneas que acaban
 * deshaciendo la separación.
 *
 * Se guarda UN FICHERO POR MESA, con escritura atómica —fichero temporal y
 * renombrado— por lo mismo que el almacén de veladas: un proceso que muere a
 * mitad de una escritura deja el fichero a medias, y un JSON a medias no se
 * puede leer.
 *
 * ═══ UN FICHERO POR MESA, Y NO UNO CON TODAS: SE MIDIÓ ═══
 *
 * La primera versión de esta fase guardaba las mesas en un solo `mesas.json` y
 * lo reescribía ENTERO en cada movimiento de cualquier partida. Parece
 * inofensivo con cuatro mesas y no lo es:
 *
 *   · El coste de un movimiento pasa a ser O(todas las mesas del proceso × su
 *     diario) en vez de O(esta mesa). Medido en este árbol: con el fichero en
 *     10 MB, abrir una mesa más costaba 26 ms, y CADA carta de CUALQUIER
 *     partida reescribía los 10 MB antes de contestar.
 *   · Y como abrir una mesa no pide credencial, el coste lo elige quien llama:
 *     unos miles de aperturas dejan el fichero en megas y a partir de ahí la
 *     mesa de cuatro personas que sí está jugando paga la cuenta de todas las
 *     demás. Es cuadrático y es de fuera.
 *
 * Con un fichero por código, escribir una mesa cuesta esa mesa y nada más,
 * borrarla es borrar su fichero, y el §6 vuelve a ser verdad: «las mesas viven
 * en memoria y el almacén es el respaldo». El precio es una carpeta con muchos
 * ficheros pequeños, que es exactamente lo que un sistema de ficheros hace bien.
 *
 * NO SE MIGRA DEL FORMATO VIEJO, y queda dicho: esta fase no está desplegada en
 * ningún sitio, así que lo único que existiría es el `data/mesas.json` de un
 * portátil. Una migración que nadie ejecuta es código que se descubre roto el
 * día que hace falta.
 *
 * ═══ Y DÓNDE ESTÁ LA CARPETA, QUE ERA UN FALLO DE DESPLIEGUE ENTERO ═══
 *
 * En `MESAS_DIR`, y el valor por defecto —`data/` junto al proceso— vale solo
 * para el portátil. Los dos despliegues documentados BORRAN esa carpeta:
 *
 *   · En Render el único disco persistente se monta en `/var/data`, y el proceso
 *     corre con el directorio en `server/`. Sin la variable, `server/data` es el
 *     sistema de ficheros efímero del contenedor y desaparece en CADA
 *     despliegue — o sea que el requisito 2 de esta fase («sin eso, cada
 *     despliegue mata todas las partidas en curso») no se cumpliría desde el
 *     día uno, y el volcado de `SIGTERM` tampoco salvaría nada porque vuelca a
 *     la misma carpeta condenada.
 *   · En la VPS es peor: la unidad de systemd corre con `ProtectSystem=strict` y
 *     `ReadWritePaths=/var/lib/gamemasters`, así que `/opt/gamemasters/data` es
 *     de SOLO LECTURA y el fichero no se puede ni crear.
 *
 * Es el mismo patrón —y la misma variable— que `UPLOADS_DIR`, cuya ausencia ya
 * costó una vez que las fotos se borraran en cada despliegue. Por eso está en
 * `.env.example`, en `render.yaml` y en la unidad de systemd, y por eso
 * `verify:entorno` la exige.
 *
 * LO QUE FALTA, DICHO EN VOZ ALTA: con `MONGODB_URI` puesta, las veladas van a
 * Mongo y las mesas siguen yendo al disco de la instancia. En Render eso
 * significa que sobreviven a un reinicio del proceso pero no necesariamente a un
 * cambio de máquina. La costura está puesta —`AlmacenDeMesas` es una interfaz y
 * `almacenEnFichero` una implementación— y escribir la de Mongo es media tarde;
 * no se ha hecho en esta fase porque no hay ninguna base a mano para probarla, y
 * una implementación de persistencia que nadie ha ejecutado es exactamente la
 * clase de pieza que se descubre rota el día del despliegue.
 *
 * ═══ Y SI EL ALMACÉN FALLA, SE DICE ═══
 *
 * Con `tickHz: 0` la escritura es síncrona y su promesa es literal: «cuando el
 * servidor contesta hecho, está guardado». Si no se ha podido guardar, esa frase
 * es falsa y hay que decirlo en la respuesta —503 CON la mesa dentro, para que
 * quien juega vea que su movimiento entró y que este servidor no lo ha
 * guardado— en vez de contestar 200 y dejarlo en el registro.
 *
 * La versión anterior lo registraba y callaba. En la VPS, con la carpeta de solo
 * lectura, ese era el estado NORMAL: todas las mesas en memoria, nadie
 * enterándose, y el primer `systemctl restart` llevándose todas las partidas.
 * Un fallo de escritura que no llega a nadie es un fallo que dura hasta el
 * reinicio.
 *
 * ═══ EL CANDADO, QUE ES EL DE `mutar` CON DOS DIFERENCIAS ═══
 *
 * La técnica es la misma de `live/sesion.ts`: una cadena de promesas por
 * partida, cada una esperando a la anterior, y el candado se retira cuando nadie
 * más espera —comparando contra la promesa que SE GUARDÓ, que es donde aquel
 * fichero tuvo una fuga silenciosa que costó encontrar—.
 *
 * Las dos diferencias:
 *
 *  1. CUBRE LA LECTURA. En veladas leer no escribe, así que el candado solo
 *     rodea las mutaciones. Aquí leer puede meter un tic.
 *  2. NO LEE Y ESCRIBE LA MESA ENTERA CONTRA EL ALMACÉN EN CADA VUELTA. El §6
 *     del diseño lo apunta como límite conocido: «las mesas de arcade no heredan
 *     el patrón de `mutar` —candado + lectura y escritura completa por acción—:
 *     correcto a ritmo de velada, seis lecturas y seis escrituras por segundo en
 *     una mesa de seis». Las mesas viven en memoria y el almacén es el respaldo,
 *     no la fuente.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  abrirMesa as abrirMesaDelArbitro,
  avanzarElReloj,
  cerrarMesa,
  jugarConMotivo,
  MovimientoRechazado,
} from './arbitro';
import type { Mesa } from './arbitro';
import {
  ArcadeFueraDePresupuesto,
  conPresupuesto,
  enCuarentena,
  pesarElEstado,
} from './presupuesto';
import { marcarPresencia, olvidarPresencia, senalEnMemoria } from '../mecanicas/presencia';
import {
  hayFinal,
  hayOpciones,
  manifiestoDeArcade,
  necesitaMesa,
  opcionesDeArcade,
  seAcaboLaPartida,
  tieneReloj,
  vistaDeAsiento,
} from '../../../shared/arcade';
import type {
  ArcadeId,
  AsientoId,
  ManifiestoDeArcade,
  Movimiento,
  Opcion,
} from '../../../shared/arcade';
import { turnoDeLaVista } from '../../../shared/mecanicas/turno-declarado';

// ---------------------------------------------------------------------------
// El vocabulario
// ---------------------------------------------------------------------------

/**
 * UN SITIO OCUPADO. Un nombre tecleado y una llave, y nada más.
 *
 * ═══ POR QUÉ HAY UNA LLAVE SI LOS ASIENTOS SON ANÓNIMOS ═══
 *
 * Porque anónimo no es lo mismo que suplantable. Sin llave, el identificador del
 * asiento viajaría en el cuerpo de la petición y cualquiera que lo viera —está
 * en la vista de los otros tres, que es donde tiene que estar para pintar la
 * mesa— podría jugar por él. Eso no es un arcade sin cuentas: es un arcade sin
 * puerta.
 *
 * La llave es un secreto que el servidor reparte una vez, al sentarse, y que
 * solo conoce quien se sentó. No es una cuenta —no tiene correo, ni contraseña,
 * ni nada que recuperar— y muere con la mesa. Es exactamente la misma idea que
 * el `joinCode` de las veladas sin nada de lo que lo rodea allí.
 *
 * Y NO se manda nunca en la vista de nadie, ni siquiera en la del dueño: quien
 * se sienta la recibe en la respuesta de sentarse y la guarda él.
 */
export interface Silla {
  /** El identificador público. Sale en la vista de los demás: es quien juega. */
  id: AsientoId;
  /** Lo que tecleó. Sale en la vista de los demás. */
  nombre: string;
  /** El secreto con el que demuestra que es él. NO sale en ninguna vista. */
  llave: string;
}

/** Una mesa viva, con todo lo que la autoridad guarda de ella. */
export interface MesaEnCurso {
  /** El código con el que se entra. Es también el identificador de la mesa. */
  codigo: string;
  /** Lo que el árbitro conoce: estado opaco, revisión, tic, semilla y diario. */
  mesa: Mesa;
  /** Quién está sentado, en el orden en que se sentaron. */
  sillas: Silla[];
  /**
   * CUÁNTO DURA UN TURNO antes de que se meta un tic, en milisegundos.
   *
   * Lo elige quien abre la mesa: diez minutos para una partida de after, un día
   * para una de las que duran una semana. Cero significa que esta mesa no tiene
   * plazo y no se le mete ningún tic nunca — legítimo para un juego sin nada que
   * caducar.
   *
   * Decía «cuánto se espera SIN QUE PASE NADA», o sea un tiempo de inactividad, y
   * ese matiz costaba caro: entonces cualquier cosa que pasara —incluida la de un
   * jugador al que no le toca contestando un trueque— empujaba el vencimiento
   * hacia adelante y al que tenía el turno no se le pasaba la hora nunca. Es un
   * plazo POR TURNO, se reprograma cuando cambia el turno, y así es como lo dice
   * el §5.4 del diseño y como lo rotula la app: «veinticuatro horas por turno».
   * Ver `empiezaTurnoNuevo`.
   */
  plazoMs: number;
  /** Instante absoluto de pared en que toca meter el tic. `null` si no hay plazo. */
  venceEn: number | null;
  /**
   * DESDE CUÁNDO SE ESPERA AL QUE TIENE EL TURNO, en epoch ms.
   *
   * ═══ POR QUÉ ES UN CAMPO Y NO SE DERIVA, QUE ERA LA TENTACIÓN ═══
   *
   * Parece que sobra: con `venceEn` y `plazoMs` sale una resta. Y la resta es
   * falsa en los dos casos que a La Larga le importan.
   *
   *   · CON `plazoMs: 0` no hay `venceEn` en absoluto, así que no hay nada de lo
   *     que restar. Una mesa sin prisa es legítima —«esta partida no tiene
   *     plazo»— y de ella se sigue queriendo saber cuánto lleva parada, que es
   *     justo la pregunta que decide si merece la pena avisar a nadie.
   *   · Y CON PLAZO, `venceEn` se reprograma en cada tic aunque el tic no cambie
   *     nada (ver `ponerAlDiaElPlazo`), de modo que la resta iría saltando hacia
   *     adelante sola y una mesa parada tres días parecería recién movida.
   *
   * ═══ Y POR QUÉ NO VALE `ultimoToqueEn`, QUE ES CASI LO MISMO ═══
   *
   * Casi. `ultimoToqueEn` lo mueve TAMBIÉN sentarse, y sentarse no cambia de
   * quién es el turno. En una mesa de La Larga que se reúne despacio —la gente
   * va llegando a lo largo del día— cada uno que llega reiniciaría la cuenta
   * de «cuánto lleva esperándose a fulano», que es el número entero del que
   * cuelga el aviso. Son dos preguntas distintas y por eso son dos campos: uno
   * dice cuándo se tocó la MESA y el otro cuándo cambió la PARTIDA.
   *
   * ═══ Y POR QUÉ NO BASTABA «CUÁNDO CAMBIÓ EL ESTADO», QUE ES LO QUE DECÍA AQUÍ ═══
   *
   * Aquí estaba escrito que esta capa no sabe a quién le toca y no le hace falta,
   * porque «cuándo cambió el estado» ya es el instante en que empezó a esperarse a
   * quien le toque ahora. Es falso en cuanto un juego deja mover a quien no tiene
   * el turno, y Riberas es exactamente ese juego: contestar un trueque cambia el
   * estado y NO cambia el turno, así que el contador volvía a cero sin que el que
   * tiene el turno hubiera hecho nada, y el aviso «lleva más de N horas» no se
   * disparaba jamás.
   *
   * Esta capa sigue sin mirar el estado. Lee de la VISTA a quién le toca —donde el
   * juego lo declara a propósito, ver `shared/mecanicas/turno-declarado.ts`— y
   * reinicia el contador cuando ese valor CAMBIA. Si el juego no declara turno se
   * cae a la regla vieja, que para un juego sin turnos es lo correcto y para uno
   * con turnos no declarados no es peor que antes. Ver `empiezaTurnoNuevo`.
   */
  turnoDesde: number;
  /** Cuándo se abrió, en epoch ms. Para el barrido de mesas viejas. */
  abiertaEn: number;
  /** Cuándo se tocó por última vez. Para lo mismo. */
  ultimoToqueEn: number;
}

/** Lo que se le enseña a quien mira una mesa. */
export interface VistaDeMesa {
  codigo: string;
  arcade: ArcadeId;
  /** La revisión de AHORA. Es la que hay que devolver al mover. */
  rev: number;
  /** En qué tic va. Con `tickHz: 0` es cuántos plazos se han pasado. */
  tic: number;
  terminada: boolean;
  /**
   * Cuándo vence el plazo, en epoch ms, o `null` si esta mesa no tiene.
   *
   * Sale en la vista porque el móvil lo necesita para pintar la cuenta atrás, y
   * sale como INSTANTE ABSOLUTO y no como «quedan 40 s» por lo mismo que un
   * `Plazo` se guarda como instante: una cuenta atrás obliga a que el servidor la
   * decremente, o sea a escribir el estado sin que pase nada.
   */
  venceEn: number | null;
  /**
   * DESDE CUÁNDO SE ESPERA, en epoch ms. Ver `MesaEnCurso.turnoDesde`.
   *
   * Sale en la vista porque es la mitad de la pregunta que La Larga tiene que
   * poder contestar —«a quién le toca y DESDE CUÁNDO»— y porque una pantalla que
   * dice «lleva dos días sin mover» necesita el mismo dato que necesitaría quien
   * escribiera el aviso. La otra mitad, a quién le toca, no puede salir de aquí:
   * el estado es opaco y esta capa no lo mira. La declara el juego en su vista y
   * la lee `turnoDeLaVista`.
   *
   * Instante absoluto y no «hace tanto», por lo mismo que `venceEn`: una cuenta
   * que sube obliga al servidor a escribirla, y el móvil sabe restar.
   */
  turnoDesde: number;
  /** Quiénes están en la partida. Estar aquí NO depende de estar conectado. */
  asientos: Array<{
    id: AsientoId;
    nombre: string;
    /**
     * ¿Se le ha visto hace poco?
     *
     * COSMÉTICO Y NADA MÁS. Quien no está sigue en `asientos`, sigue teniendo su
     * turno y sigue contando para el aforo. Ésta es la línea donde una velada y
     * una mesa asíncrona dejan de parecerse: allí la presencia es un buen proxy
     * de la participación porque la gente está sentada a la mesa; aquí alguien
     * puede estar tres días sin abrir la app y seguir jugando.
     */
    presente: boolean;
  }>;
  /** Quién soy yo aquí, o `null` si miro sin asiento. */
  yo: AsientoId | null;
  /** LO QUE EL JUEGO DEJA VER DESDE AQUÍ. Opaco: lo compone la proyección. */
  vista: unknown;
  /**
   * QUÉ PUEDE HACER ESTE ASIENTO AHORA MISMO, dicho por el juego.
   *
   * ═══ POR QUÉ VIAJA, EN VEZ DE PREGUNTARLO LA APP ═══
   *
   * Porque un arcade de FUERA no está en el binario del móvil. La app tiene el
   * registro de los cuatro juegos que trae dentro y de ninguno más, así que
   * preguntarle allí por un arcade instalado sólo en el servidor lanzaría
   * `ArcadeNoInstalado`. El código del juego vive aquí; la respuesta viaja con la
   * vista, igual que viaja la proyección y por el mismo motivo.
   *
   * Es la lista que hace posible un mueble genérico DE VERDAD: la pantalla pinta
   * un botón por opción, manda `tipo` y `carga` tal cual vienen y no traduce nada,
   * así que no hay una línea de código por juego dentro del mueble.
   *
   * ═══ LO QUE ESTA LISTA NO ES ═══
   *
   * No es autoridad. Es la regla del «sólo si» del §5 bis: el reductor rechaza lo
   * que `opciones()` no ofreció y SIGUE validando lo que sí. Que algo esté aquí no
   * significa que vaya a salir bien —el contraejemplo vive en Riberas: aceptar un
   * trueque exige que el oferente tenga la mercancía, y su almacén no está en la
   * vista de quien acepta—. Para eso está el `motivo` de aquí abajo.
   *
   * Vacía cuando el juego no registra `opciones()`, que es la mitad de ellos y no
   * es un fallo: un juego que pinta su propia pantalla no tiene nada que contestar.
   */
  opciones: readonly Opcion[];
  /**
   * POR QUÉ NO PASÓ NADA, dicho por el juego. `null` casi siempre.
   *
   * ═══ EL CANAL QUE FALTABA, Y POR QUÉ VIVE AQUÍ Y NO EN EL ESTADO ═══
   *
   * Con la regla del «sólo si» del §5 bis, el rechazo silencioso es el camino
   * NORMAL: el reductor devuelve el mismo estado y hasta la fase 5 la app sólo
   * podía decir «la mesa está igual que estaba», deduciéndolo de que la revisión
   * no subió. Nunca por qué.
   *
   * Ahora el juego puede decirlo —`rechazar()` en `shared/arcade/motor.ts`— y
   * llega hasta aquí. Tres propiedades hacen que esto no rompa nada:
   *
   *   · SÓLO SALE EN LA RESPUESTA DE MOVER, y por tanto sólo a quien movió. Una
   *     lectura (`mirar`) lo trae siempre a `null`: el motivo es de un intento
   *     concreto de una persona concreta y no es un campo de la mesa.
   *   · NO SE GUARDA. No está en `MesaEnCurso` ni en lo que se escribe en disco,
   *     así que no sobrevive ni al siguiente sondeo.
   *   · Y NO ENTRA EN EL DIARIO, o sea que reejecutar la partida da exactamente
   *     lo mismo con motivos o sin ellos.
   *
   * Lo que viaja es TEXTO DEL JUEGO, no un código de la autoridad. Los códigos de
   * la autoridad —`no-estas-sentado`, `revision-rancia`, `mesa-terminada`— siguen
   * siendo una unión cerrada que se traduce a un HTTP y siguen llegando por la vía
   * de la excepción. Son dos canales porque son dos capas.
   */
  motivo: string | null;
}

// ---------------------------------------------------------------------------
// Códigos y llaves
// ---------------------------------------------------------------------------

/**
 * El alfabeto de los códigos, SIN las letras que se confunden al dictarlas.
 *
 * Sin I ni 1, sin O ni 0, sin S ni 5. Un código de mesa se dice en voz alta
 * —«entrad con KJ7RM»— y una L y un 1 en una tipografía de móvil son el mismo
 * dibujo. Es el mismo criterio que el `ALFABETO_CODIGO` de las veladas, escrito
 * aquí en vez de importado: `shared/live.ts` es el contrato de la otra familia y
 * traérselo por seis caracteres sería empezar a compartir vocabulario por la
 * puerta de atrás.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRTUVWXYZ23456789';

/** Cinco letras: casi treinta millones de combinaciones. De sobra y se dictan. */
const LARGO_DEL_CODIGO = 5;

/**
 * Cuánto mide una llave de asiento.
 *
 * Veinticuatro caracteres del mismo alfabeto son unos 119 bits de entropía. No
 * se dicta ni se teclea —viaja en una cabecera— así que aquí lo que importa es
 * que no se pueda adivinar, y adivinar una llave es jugar por otro.
 */
const LARGO_DE_LA_LLAVE = 24;

/**
 * Letras al azar de verdad, de `crypto`, y no del azar sembrado del juego.
 *
 * Los dos azares del sistema no son el mismo y conviene que se note: el de
 * `shared/mecanicas/azar.ts` es REPRODUCIBLE a propósito, porque tiene que
 * repartir las mismas cartas al reejecutar una partida. Usarlo para una llave
 * sería repartir credenciales que cualquiera que conozca la semilla puede
 * recalcular.
 */
function letrasAlAzar(cuantas: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(cuantas));
  let salida = '';
  for (let i = 0; i < cuantas; i++) {
    salida += ALFABETO[(bytes[i] as number) % ALFABETO.length];
  }
  return salida;
}

/** Un código que no esté ya en uso. */
function codigoLibre(): string {
  for (let intento = 0; intento < 50; intento++) {
    const codigo = letrasAlAzar(LARGO_DEL_CODIGO);
    if (!mesas.has(codigo)) return codigo;
  }
  /*
   * Cincuenta colisiones seguidas con veintiocho millones de códigos no pasa: si
   * pasa, es que hay un fallo en `letrasAlAzar` —el caso real sería que
   * devolviera siempre lo mismo— y seguir dando códigos sería dar el mismo a
   * todo el mundo. Es mejor negarse ruidosamente que repartir una mesa
   * compartida sin que nadie lo pidiera.
   */
  throw new Error(
    'No se ha podido generar un código de mesa libre en cincuenta intentos. ' +
      'Con veintiocho millones de combinaciones eso no es mala suerte: es que el generador ' +
      'de códigos no está devolviendo códigos distintos.',
  );
}

// ---------------------------------------------------------------------------
// EL ALMACÉN
// ---------------------------------------------------------------------------

/**
 * Dónde se guardan las mesas. Interfaz porque el día que haya una base detrás
 * cambia esto y no el resto del fichero.
 *
 * ═══ SE GUARDA DE UNA EN UNA, Y ESA ES LA FIRMA QUE IMPORTA ═══
 *
 * `guardar` recibe UNA mesa y no el conjunto. Con el conjunto, cualquier
 * implementación —la de fichero, la de Mongo el día que exista— tiene la
 * tentación de escribirlo todo en cada movimiento, y eso es lo que convierte el
 * coste de una partida en el coste de todas las del proceso. La interfaz lo
 * impide antes de que nadie lo escriba.
 *
 * `guardarYa` sí recibe el conjunto, porque el volcado de la despedida es
 * justamente lo contrario: una sola vez, todo, y antes de morir.
 */
export interface AlmacenDeMesas {
  /** Lo que hubiera guardado. Se llama una vez, al arrancar. */
  leer(): MesaEnCurso[];
  /** Guarda UNA mesa. Devuelve cuando está en disco; LANZA si no ha podido. */
  guardar(mesa: MesaEnCurso): Promise<void>;
  /** Se acabó esta mesa: que no vuelva a aparecer al arrancar. */
  borrar(codigo: string): Promise<void>;
  /** Todas de golpe y SIN esperar a nadie. Para `SIGTERM`. Ver abajo. */
  guardarYa(mesas: readonly MesaEnCurso[]): void;
}

/**
 * La carpeta de las mesas. `MESAS_DIR` manda; si no está, `data/` junto al
 * proceso, que vale para el portátil y para nada más. Ver la cabecera.
 */
const CARPETA = path.resolve(process.env.MESAS_DIR?.trim() || path.join(process.cwd(), 'data', 'mesas'));

/** El fichero de una mesa. El código ya es de un alfabeto sin barras ni puntos. */
function ficheroDe(codigo: string): string {
  return path.join(CARPETA, `${codigo}.json`);
}

/** Lo que hay dentro del fichero de una mesa, con su versión por delante. */
interface Guardado {
  /**
   * Para poder cambiar la forma sin que una instancia vieja se coma un fichero
   * nuevo. Hoy solo sirve para descartar lo que no reconoce, que es infinitamente
   * mejor que interpretarlo mal: una mesa medio entendida es una partida que se
   * comporta raro.
   *
   * ═══ SE SIGUE ESCRIBIENDO LA 2 AUNQUE ESTA FASE AÑADA UN CAMPO ═══
   *
   * La primera versión de la fase 4 bis escribía `version: 3`. Se ha vuelto atrás,
   * y la razón es el sentido de la compatibilidad que no se miró: HACIA ATRÁS.
   *
   * El lector de la versión publicada hace, literalmente, `if (leido.version !== 2
   * || !leido.mesa) continue;` — o sea que un fichero de la 3 se le descarta EN
   * SILENCIO: sin error, sin línea en el registro, y con `almacen.fallos` a cero.
   * Y revertir un despliegue es una operación normal que el §6 dice que pasa en
   * cada push. Con la 3 escrita, revertir al día siguiente hace desaparecer TODAS
   * las partidas en curso sin un solo aviso; y como `codigoLibre()` sólo mira la
   * tabla en memoria, el código liberado se puede reasignar y sobreescribir el
   * fichero original. Es el mismo fallo que esta fase existe para impedir, visto
   * desde el otro lado.
   *
   * Escribir la 2 no cuesta nada porque el cambio es ADITIVO y el lector viejo hace
   * `recuperadas.push(leido.mesa)` sin mirar los campos que no conoce: `turnoDesde`
   * le viaja dentro, no lo lee y no le estorba. Y en el otro sentido tampoco hace
   * falta el número, porque `alDiaDesdeElDisco` mira el VALOR y no la versión, y
   * deriva `turnoDesde` cuando no está. El mismo fichero lo entienden las dos.
   *
   * La regla que queda escrita para la próxima vez: el número sube cuando un lector
   * viejo interpretaría MAL el fichero, no cuando hay un campo nuevo. El día que
   * cambie el SIGNIFICADO de un campo que ya existe, ese día sube — y ese día hay
   * que mirar también qué le pasa a quien revierta.
   */
  version: 2;
  mesa: MesaEnCurso;
}

/**
 * LA 3 TAMBIÉN SE LEE, AUNQUE YA NO SE ESCRIBA, Y ES LA PRIMERA VEZ QUE ESTE
 * CAMPO SIRVE PARA ALGO.
 *
 * La 3 está en la lista porque la primera versión de esta fase llegó a escribir
 * ficheros con ese número —en pruebas y en cualquier árbol donde se probara— y
 * borrarla de aquí convertiría esas mesas en partidas perdidas por exactamente el
 * mecanismo que la vuelta a la 2 quiere evitar. Leer de más es barato; leer de
 * menos cuesta partidas.
 *
 * ═══ POR QUÉ AQUÍ SÍ SE ACEPTA LA VIEJA, SI LA CABECERA DICE «NO SE MIGRA» ═══
 *
 * Lo que la cabecera dice que no se migra es el FORMATO de la fase 2 —un solo
 * `mesas.json` con todas las mesas dentro— y sigue siendo verdad: aquello era
 * otra disposición del almacén y una migración que nadie ejecuta es código que se
 * descubre roto el día que hace falta.
 *
 * Esto es otra cosa: la misma disposición con UN CAMPO MÁS, y un campo que se
 * deriva de lo que el fichero viejo ya trae. Y descartar tendría un precio que en
 * esta fase concreta es el peor posible: La Larga existe para que una partida
 * sobreviva a los despliegues, así que estrenarla borrando todas las mesas de
 * quien actualice sería incumplir la fase con el código de la fase.
 *
 * `ultimoToqueEn` es la mejor aproximación que hay a «cuándo cambió la partida
 * por última vez» en un fichero que no lo guardaba: se pasa de largo como mucho
 * por lo que tardó en llegar el último que se sentó, y a la escala de días de La
 * Larga eso no cambia ninguna decisión.
 */
const VERSIONES_QUE_SE_LEEN = [2, 3];

/** ¿Es un instante de reloj utilizable, o hay que reponerlo? */
function esInstante(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

/**
 * Rellena lo que una versión vieja no traía. Devuelve `null` si no se reconoce.
 *
 * `nombre` es sólo para el registro, y está porque un descarte mudo aquí es una
 * partida que desaparece sin que nadie pueda averiguar por qué. Ver `leer()`.
 */
function alDiaDesdeElDisco(leido: Partial<Guardado>, nombre: string): MesaEnCurso | null {
  if (typeof leido.version !== 'number' || !VERSIONES_QUE_SE_LEEN.includes(leido.version)) {
    /*
     * SE DICE, Y ÉSTE ES EL ÚNICO SITIO DONDE SE PUEDE DECIR.
     *
     * El fichero no se borra —puede que lo entienda la instancia de al lado, o la
     * de mañana— pero el silencio no vale: una mesa que no se recupera y no se
     * cuenta se ve desde fuera como «este servidor perdió tu partida», con el
     * diagnóstico diciendo `mesas: 0` y `almacen.fallos: 0` a la vez. Que es la
     * combinación que no le deja a nadie ni empezar a mirar.
     */
    console.error(
      `[arcade] La mesa guardada en «${nombre}» trae una versión que este servidor no lee ` +
        `(${JSON.stringify(leido.version)}; se leen ${VERSIONES_QUE_SE_LEEN.join(', ')}). ` +
        'No se recupera y NO se borra: el fichero sigue ahí.',
    );
    return null;
  }
  if (!leido.mesa) {
    console.error(`[arcade] La mesa guardada en «${nombre}» no trae mesa dentro y se ignora.`);
    return null;
  }
  const m = leido.mesa;
  /*
   * ═══ PRIMERO EL CAMPO DEL QUE SE DERIVA, Y NO AL REVÉS ═══
   *
   * `ultimoToqueEn` se valida ANTES que `turnoDesde` porque es de donde sale
   * `turnoDesde` cuando falta. Sin esto, un fichero sin `ultimoToqueEn` metía un
   * `undefined` en la tabla y las tres consecuencias no daban error en ningún
   * sitio: la vista salía SIN el campo —rompiendo el juego cerrado de campos que
   * `verificar-mesa.ts` afirma—, `esperandoMs` salía `null`, y sobre todo
   * `barrerLasViejas` hacía `ahora - undefined`, que es `NaN`, y `NaN <=
   * OLVIDO_MS` es FALSO: la retención de treinta días se convertía en borrado
   * inmediato en el siguiente `abrir` de un desconocido.
   *
   * Se REPONE en vez de descartar la mesa. Descartarla sería tirar una partida
   * entera por un campo de contabilidad que no cambia ninguna regla del juego, y
   * `abiertaEn` —o, en el peor caso, ahora mismo— es una aproximación que a la
   * escala de días de La Larga no cambia ninguna decisión.
   */
  const ahora = Date.now();
  if (!esInstante(m.abiertaEn)) m.abiertaEn = ahora;
  if (!esInstante(m.ultimoToqueEn)) m.ultimoToqueEn = m.abiertaEn;
  /*
   * Se mira el VALOR y no la versión, y no es lo mismo: un fichero escrito por una
   * instancia a medio desplegar podría traerlo mal igual, y lo que hace falta es
   * que ninguna mesa llegue a la tabla con un `NaN` dentro. Un `NaN` aquí no
   * falla: se propaga a la vista, sale por la red, y la pantalla dice «hace NaN
   * horas» sin que nada se ponga rojo en ningún sitio.
   */
  if (!esInstante(m.turnoDesde)) m.turnoDesde = m.ultimoToqueEn;
  /*
   * Y el plazo, por lo mismo: `plazoMs` entra en `Date.now() + m.plazoMs`, así que
   * un `undefined` ahí produce un `venceEn` que es `NaN`, y `ahora < NaN` es falso
   * — o sea una mesa que vence en CADA lectura y mete un tic por sondeo. Cero
   * significa «sin prisa», que es el respaldo honesto cuando no se sabe.
   */
  if (!esInstante(m.plazoMs) || m.plazoMs < 0) m.plazoMs = 0;
  if (m.venceEn !== null && !esInstante(m.venceEn)) m.venceEn = null;
  return m;
}

/**
 * Escribe un fichero de forma atómica, y LIMPIA EL TEMPORAL SI FALLA.
 *
 * Lo segundo no es cosmético: la versión anterior dejaba un `.tmp` huérfano por
 * cada intento fallido, así que una carpeta de solo lectura —el caso de la VPS—
 * producía un fichero suelto por movimiento y nadie los recogía nunca.
 */
async function escribirAtomico(destino: string, texto: string): Promise<void> {
  await fsp.mkdir(CARPETA, { recursive: true });
  const temporal = `${destino}.${letrasAlAzar(6)}.tmp`;
  try {
    await fsp.writeFile(temporal, texto, 'utf8');
    await fsp.rename(temporal, destino);
  } catch (error) {
    await fsp.rm(temporal, { force: true }).catch(() => {});
    throw error;
  }
}

const almacenEnFichero: AlmacenDeMesas = {
  leer() {
    let nombres: string[];
    try {
      nombres = fs.readdirSync(CARPETA).filter((n) => n.endsWith('.json'));
    } catch (error) {
      /*
       * ═══ «NO EXISTE» Y «NO PUEDO» NO SON LO MISMO, Y AQUÍ LO ERAN ═══
       *
       * Un `catch` mudo con el comentario «no existe todavía» encima. Y el caso que
       * de verdad muerde es el otro, el que la cabecera de este fichero ya
       * describe: una VPS con `ProtectSystem=strict` y `MESAS_DIR` fuera de
       * `ReadWritePaths` da `EACCES` aquí. Con esto se devolvía `[]` en silencio,
       * TODAS las partidas en curso desaparecían sin una línea en el registro, y
       * el diagnóstico publicaba `mesas: 0` junto a `almacen.fallos: 0` —que es,
       * con las palabras de este mismo fichero, la combinación que no le deja a
       * nadie ni empezar a mirar—.
       *
       * `ENOENT` sigue siendo el caso normal y sigue sin decir nada: la carpeta se
       * crea al guardar la primera mesa. Cualquier otra cosa SE DICE, y en voz
       * alta, nombrando la variable —porque el arreglo siempre está ahí—.
       *
       * Y NO SE LANZA, que era y sigue siendo lo correcto: un servidor que no
       * arranca por la carpeta de las mesas deja fuera también a las veladas, que
       * no tienen nada que ver.
       */
      const codigo = (error as { code?: string } | null)?.code;
      if (codigo !== 'ENOENT') {
        console.error(
          `[arcade] NO SE PUEDE LEER LA CARPETA DE LAS MESAS «${CARPETA}» (${codigo ?? 'sin código'}). ` +
            'El servidor arranca SIN NINGUNA partida recuperada, y las que hubiera guardadas siguen ' +
            'en disco. Revisa `MESAS_DIR` y los permisos de esa ruta:',
          error,
        );
      }
      return [];
    }

    const recuperadas: MesaEnCurso[] = [];
    for (const nombre of nombres) {
      try {
        const leido = JSON.parse(fs.readFileSync(path.join(CARPETA, nombre), 'utf8')) as Partial<Guardado>;
        const mesa = alDiaDesdeElDisco(leido, nombre);
        if (mesa === null) continue;
        recuperadas.push(mesa);
      } catch (error) {
        /*
         * Una mesa ilegible se salta y se DICE, en vez de tumbar el arranque o
         * desaparecer en silencio. Ésta es la ventaja concreta de un fichero por
         * mesa sobre uno con todas: antes, un JSON a medias se llevaba por
         * delante TODAS las partidas del servidor; ahora se lleva la suya.
         */
        console.error(`[arcade] La mesa guardada en «${nombre}» no se puede leer y se ignora:`, error);
      }
    }
    return recuperadas;
  },

  async guardar(mesa) {
    await escribirAtomico(ficheroDe(mesa.codigo), JSON.stringify({ version: 2, mesa } satisfies Guardado));
  },

  async borrar(codigo) {
    await fsp.rm(ficheroDe(codigo), { force: true });
  },

  guardarYa(mesas) {
    /*
     * ═══ POR QUÉ AQUÍ SÍ SE ESCRIBE SÍNCRONO, SI EN TODAS PARTES ES PECADO ═══
     *
     * Porque esto solo lo llama el manejador de `SIGTERM`, y ahí el bucle de
     * eventos ya no vale para nada: Render manda la señal y mata el proceso unos
     * segundos después, así que una escritura asíncrona puede no llegar a
     * ejecutarse nunca. Bloquear el hilo cuando ya no queda nada que atender no
     * cuesta nada; no bloquearlo cuesta las partidas en curso.
     */
    try {
      fs.mkdirSync(CARPETA, { recursive: true });
    } catch (error) {
      console.error('[arcade] No se han podido volcar las mesas al recibir la señal:', error);
      return;
    }
    for (const mesa of mesas) {
      const destino = ficheroDe(mesa.codigo);
      const temporal = `${destino}.${letrasAlAzar(6)}.tmp`;
      try {
        fs.writeFileSync(temporal, JSON.stringify({ version: 2, mesa } satisfies Guardado), 'utf8');
        fs.renameSync(temporal, destino);
      } catch (error) {
        /*
         * Se sigue con las demás: en un volcado de despedida, perder una mesa
         * porque su fichero da error no es razón para perder las otras
         * trescientas.
         */
        try {
          fs.rmSync(temporal, { force: true });
        } catch {
          /* si no se puede ni borrar el temporal, no hay nada más que hacer */
        }
        console.error(`[arcade] No se ha podido volcar la mesa ${mesa.codigo}:`, error);
      }
    }
  },
};

let almacen: AlmacenDeMesas = almacenEnFichero;

/** Cambia el almacén. Para las pruebas, y para el día que haya una base detrás. */
/**
 * ═══ A QUIÉN SE LE AVISA CUANDO UNA MESA SE CIERRA SOLA ═══
 *
 * Se inyecta, como el almacén, y por el mismo motivo: este fichero no importa el
 * canal a propósito —ver la cabecera— y aun así el hecho «esta partida acaba de
 * terminar» tiene que llegar a quien esté mirando.
 *
 * El agujero que tapa: «Se acabó la partida» sólo se anunciaba desde
 * `POST /cerrar`, que no pulsa ningún cliente. Cuando las mesas empezaron a
 * cerrarse solas al acabar, ese aviso dejó de salir por ningún sitio: la partida
 * terminaba y el único rastro era que el tablero se quedaba quieto.
 */
let alCerrarseUnaMesa: ((codigo: string, rev: number) => void) | null = null;

/** Lo llama quien levanta el proceso, junto a `ponerCanal`. */
export function cuandoSeCierreUnaMesa(avisar: (codigo: string, rev: number) => void): void {
  alCerrarseUnaMesa = avisar;
}

/**
 * ═══ Y A QUIÉN SE LE DICE QUE UNA MESA HA DESAPARECIDO ═══
 *
 * La fuga que tapa: el barrido de las viejas borra la mesa y su fichero y NO
 * avisaba al canal, que no puede —este fichero no lo importa—. `olvidar()` sólo
 * lo llamaban la apertura fallida y el `DELETE`, así que la entrada de esa mesa
 * en el mapa de avisos del concentrador se quedaba para siempre. Es exactamente
 * lo que la cabecera del canal dice que `olvidar` existe para no tener: «mapas de
 * ámbito de módulo que crecen sin techo hasta que Render mata la instancia. No es
 * una hipótesis: es aritmética».
 */
let alOlvidarseUnaMesa: ((codigo: string) => void) | null = null;

/** Lo llama quien levanta el proceso, junto a `ponerCanal`. */
export function cuandoSeOlvideUnaMesa(avisar: (codigo: string) => void): void {
  alOlvidarseUnaMesa = avisar;
}

export function ponerAlmacenDeMesas(otro: AlmacenDeMesas): void {
  almacen = otro;
  cargadas = false;
  /*
   * Y el reloj del barrido vuelve a cero: cambiar el almacén es empezar de nuevo,
   * y un guion que monte dos escenarios seguidos no debe heredar «ya se barrió
   * hace un rato» del anterior. Ver `barrerSiTocaPorReloj`.
   */
  ultimoBarridoEn = 0;
}

// ---------------------------------------------------------------------------
// La tabla en memoria
// ---------------------------------------------------------------------------

/**
 * Las mesas vivas, por código.
 *
 * Vive en memoria y el almacén es el RESPALDO, no la fuente. Es la diferencia
 * con `mutar`, que relee la sesión entera de la base en cada vuelta: correcto a
 * ritmo de velada y ruinoso a ritmo de mesa, donde en una partida de cuatro hay
 * un movimiento cada pocos segundos y una lectura por móvil cada veinticinco.
 *
 * La consecuencia, que es un límite conocido y preexistente y conviene no
 * echársela al motor nuevo: esto NO escala a dos instancias. Con dos procesos en
 * Render, dos jugadores de la misma mesa caen en procesos distintos y dejan de
 * verse. Le pasa exactamente igual al `hub.ts` de las veladas, cuyos `esperas` y
 * `avisos` son también mapas de ámbito de módulo. Está apuntado en el §6 del
 * diseño como uno de los tres límites que ya existían.
 */
const mesas = new Map<string, MesaEnCurso>();

let cargadas = false;

function cargar(): void {
  if (cargadas) return;
  cargadas = true;
  /*
   * Se cuenta lo que se ha LEÍDO y no lo que hay en la tabla. Parece lo mismo
   * —al arrancar la tabla está vacía— y no lo es en cuanto alguien cambia el
   * almacén en marcha: entonces el mensaje decía «3 mesas recuperadas» habiendo
   * recuperado cero, que es un registro que miente sobre lo único que este
   * mensaje existe para contar.
   */
  let recuperadas = 0;
  for (const m of almacen.leer()) {
    /*
     * ═══ Y LO QUE SE RECUPERA YA ACABADO SE CIERRA AQUÍ ═══
     *
     * Las otras dos puertas —`mover` y el tic— sólo se cruzan cuando el estado
     * CAMBIA, así que una partida que terminó y no quedó marcada no se cierra por
     * ninguna de las dos: el reductor rechaza todo movimiento sobre una partida
     * acabada —luego no hay cambio— y el tic devuelve el mismo estado. Se quedaba
     * abierta PARA SIEMPRE y rearmando la cuenta atrás en cada mirada, que es
     * exactamente el síntoma que todo esto vino a matar.
     *
     * Y no es hipotético: son todas las mesas guardadas por un servidor anterior
     * a este cambio, y las que se cerraron en memoria con el almacén caído.
     *
     * Va en `cargar` y no en el `leer` del almacén de ficheros a propósito: por
     * aquí pasan LOS DOS almacenes, así que también se puede ejercitar con uno
     * de mentira. Y es el sitio barato: una vez por mesa al recuperarla, no una
     * por lectura.
     */
    cerrarSiSeAcabo(m, false);
    mesas.set(m.codigo, m);
    recuperadas++;
  }
  if (recuperadas > 0) console.log(`[arcade] ${recuperadas} mesa(s) recuperadas del almacén.`);
}

/**
 * Cuánto se guarda una mesa a la que nadie toca.
 *
 * TREINTA DÍAS, y el número es grande a propósito: una partida de La Larga dura
 * días y su ritmo normal es un movimiento cada mañana. Con la caducidad de una
 * velada —horas— una partida de tres días se borraría sola la segunda noche, y
 * el síntoma sería «la app dice que esa mesa no existe» sin ningún error en
 * ningún sitio.
 *
 * Lo que esto evita es lo contrario: que el fichero crezca una mesa por partida
 * jugada, para siempre. Es la misma fuga que ya tuvieron el mapa de candados y
 * el de presencia, y que no se ve desde fuera hasta que la instancia se queda
 * sin memoria.
 */
const OLVIDO_MS = 30 * 24 * 60 * 60_000;

/** Cuánto hace falta que se haya visto a alguien para pintarlo conectado. */
const CONECTADO_MS = 60_000;

/**
 * Cada cuánto, como mucho, se repasa la tabla entera buscando mesas olvidadas.
 *
 * ═══ POR QUÉ HAY QUE ACORDARSE DE BARRER Y NO BASTA CON `abrir` ═══
 *
 * Barrer sólo desde `abrir` se porta mal por los DOS lados, y los dos importan a
 * la escala de La Larga:
 *
 *   · En una instancia donde el grupo está jugando su partida de días y nadie
 *     abre mesas nuevas, NO SE BARRE NUNCA. La carpeta crece un fichero por
 *     partida jugada, para siempre, que es exactamente la fuga que `OLVIDO_MS`
 *     dice estar cerrando.
 *   · Y al revés: el borrado de tu partida abandonada no lo dispara el paso del
 *     tiempo sino el `abrir` de un desconocido, en el instante en que ese
 *     desconocido pulsa el botón. Desde fuera, «tu mesa desapareció porque otro
 *     abrió la suya» no se distingue de «este servidor perdió tu partida».
 *
 * Así que también se barre en la LECTURA, que es lo único que ocurre siempre en
 * un servidor con partidas vivas. Con un tope: repasar la tabla en cada sondeo de
 * cada móvil sería O(mesas) por petición, que es justo la clase de coste que la
 * cabecera de `mesas` se niega a pagar. Una hora es infinitamente más fino que
 * treinta días y sigue siendo nada.
 *
 * NO se pone un temporizador, y no es pereza: un `setInterval` de ámbito de
 * módulo mantiene vivo el bucle de eventos, ensucia el apagado, y obliga a todos
 * los guiones de comprobación que importan este fichero a acordarse de pararlo.
 * Un barrido perezoso colgado de la actividad hace el mismo trabajo sin nada de
 * eso, y una instancia sin actividad no tiene ninguna prisa por barrer.
 */
const CADA_CUANTO_SE_BARRE_MS = 60 * 60_000;

let ultimoBarridoEn = 0;

/** Barre si toca por reloj. Lo llaman las lecturas; `abrir` barre siempre. */
function barrerSiTocaPorReloj(ahora: number): void {
  if (ahora - ultimoBarridoEn < CADA_CUANTO_SE_BARRE_MS) return;
  barrerLasViejas(ahora);
}

function barrerLasViejas(ahora: number): void {
  ultimoBarridoEn = ahora;
  for (const [codigo, m] of mesas) {
    if (ahora - m.ultimoToqueEn <= OLVIDO_MS) continue;
    mesas.delete(codigo);
    /*
     * SE DICE, Y ANTES NO SE DECÍA. Éste es el único sitio del servidor que
     * borra una partida entera, y hacerlo en silencio deja al que vuelve con un
     * 404 y a quien mira el registro sin nada que leer: `almacen.fallos` sigue a
     * cero porque no ha fallado nada, que es lo peor de todo. Con esta línea, la
     * desaparición de una mesa se puede FECHAR y contar contra `OLVIDO_MS`.
     */
    console.log(
      `[arcade] Se olvida la mesa ${codigo}: llevaba ${String(
        Math.round((ahora - m.ultimoToqueEn) / 86_400_000),
      )} día(s) sin que nadie la tocara (el límite son ${String(OLVIDO_MS / 86_400_000)}).`,
    );
    /*
     * Y su fichero se va con ella. Con el almacén de un solo fichero esto salía
     * gratis —la siguiente escritura completa ya no la incluía— y con un fichero
     * por mesa hay que decirlo: si no, la carpeta se queda con las mesas que la
     * memoria ya olvidó y el arranque siguiente las resucita.
     */
    void almacen.borrar(codigo).catch((error: unknown) => {
      console.error(`[arcade] No se ha podido borrar la mesa vieja ${codigo}:`, error);
    });
    /* Y que el canal se olvide también de ella. Ver `cuandoSeOlvideUnaMesa`. */
    if (alOlvidarseUnaMesa !== null) {
      try {
        alOlvidarseUnaMesa(codigo);
      } catch (error) {
        console.error(`[arcade] No se ha podido olvidar en el canal la mesa ${codigo}:`, error);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// La persistencia, PARTIDA POR FRECUENCIA
// ---------------------------------------------------------------------------

/**
 * ═══ SÍNCRONA SIN RELOJ, DIFERIDA CON RELOJ (§6 DEL DISEÑO) ═══
 *
 * El reparto no es por familia de juego sino POR FRECUENCIA, y la razón está en
 * la aritmética:
 *
 *   · `tickHz === 0` —Riberas, La Ronda, La Larga— es un movimiento cada varios
 *     segundos. Escribir en el acto cuesta una escritura por movimiento, o sea
 *     nada, y a cambio da la única garantía que de verdad importa en una partida
 *     de tres días: cuando el servidor contesta «hecho», está guardado. Un
 *     jugador que mueve y ve caer el despliegue no pierde su movimiento.
 *   · `tickHz > 0` —El Arcade— son sesenta movimientos por segundo. Escribir en
 *     el acto serían sesenta escrituras por segundo y por mesa, que es
 *     exactamente la clase de coste que hunde una instancia. Ahí se difiere, y
 *     lo peor que puede pasar es perder una fracción de segundo de una partida
 *     que dura un minuto.
 *
 * Y en los dos casos, VOLCADO AL RECIBIR `SIGTERM`, que es lo que manda Render
 * antes de reemplazar la instancia. Sin eso, cada `git push` mata todas las
 * partidas en curso desde el día uno.
 */
const pendientesDeGuardar = new Set<string>();
let temporizadorDiferido: NodeJS.Timeout | undefined;

/** Cada cuánto se vuelca cuando la escritura es diferida. */
const DIFERIDO_MS = 1_000;

function todas(): MesaEnCurso[] {
  return [...mesas.values()];
}

/**
 * EL ALMACÉN NO HA PODIDO GUARDAR, y quien movía tiene que enterarse.
 *
 * ═══ POR QUÉ ESTO SUBE Y NO SE QUEDA EN EL REGISTRO ═══
 *
 * La versión anterior lo registraba y contestaba 200. El razonamiento parecía
 * bueno —«su movimiento SÍ ha entrado, está en memoria y lo ven los otros
 * tres»— y tenía un agujero: la promesa de la escritura síncrona es literal,
 * «cuando el servidor contesta hecho, está guardado», y contestar «hecho» sin
 * haber guardado la convierte en mentira precisamente el día que importa.
 *
 * Y no es hipotético: en la VPS, con la carpeta de mesas fuera de
 * `ReadWritePaths`, ese era el estado NORMAL. Todas las partidas en memoria,
 * nadie enterándose, y el primer reinicio llevándoselas. Un fallo que solo
 * aparece en el registro del despliegue dura hasta que alguien mira el registro
 * del despliegue.
 *
 * Sube con la mesa dentro y la ruta lo traduce a 503: quien juega ve que su
 * movimiento entró Y que no está guardado, que son las dos cosas ciertas.
 */
export class AlmacenNoGuarda extends Error {
  constructor(
    public readonly codigo: string,
    public readonly causa: unknown,
  ) {
    super(
      `El movimiento ha entrado en la mesa «${codigo}» y los demás lo ven, pero este servidor ` +
        'no ha podido guardarlo: si se reinicia, se pierde. Revisa la carpeta de `MESAS_DIR`.',
    );
    this.name = 'AlmacenNoGuarda';
  }
}

/**
 * Lo último que falló al guardar, para el diagnóstico.
 *
 * Existe porque un fallo de escritura no se ve desde fuera de ninguna otra
 * forma: la mesa funciona, los cuatro juegan y el disco no tiene nada. Con la
 * escritura diferida —`tickHz > 0`— no hay ninguna petición esperando a la que
 * contestarle 503, así que esto es lo único que queda.
 */
let ultimoFalloAlGuardar: { cuando: number; codigo: string; que: string } | undefined;
let fallosAlGuardar = 0;

/**
 * Lo que sabe el diagnóstico sobre el almacén. Ver `routes/arcade.ts`.
 *
 * ═══ AQUÍ NO SALE LA RUTA DE LA CARPETA, Y ESO ES DELIBERADO ═══
 *
 * `/api/arcade/diagnostico` se sirve SIN CREDENCIAL, porque va delante del
 * guardián del taller como todo este motor. Poner ahí `/var/lib/gamemasters/…`
 * —o el mensaje crudo del sistema, que lleva la ruta dentro— sería publicarle a
 * cualquiera cómo está montado el disco del servidor a cambio de un dato que
 * quien despliega ya tiene delante.
 *
 * Lo que sí sale es lo único que hace falta desde fuera: si la carpeta está
 * DECLARADA —o sea, si `MESAS_DIR` existe o se está cayendo al valor por defecto,
 * que es el que se borra en cada despliegue—, cuántas escrituras han fallado y de
 * qué clase fue la última. La ruta entera y el error completo van al registro del
 * proceso, que es donde los lee quien puede arreglarlos.
 */
export function saludDelAlmacen(): {
  carpetaDeclarada: boolean;
  fallos: number;
  ultimoFallo?: { cuando: number; codigo: string; que: string };
} {
  return {
    carpetaDeclarada: (process.env.MESAS_DIR?.trim() ?? '') !== '',
    fallos: fallosAlGuardar,
    ultimoFallo: ultimoFalloAlGuardar,
  };
}

/** La clase del fallo —`EPERM`, `ENOSPC`— sin el mensaje, que lleva la ruta. */
function claseDelFallo(error: unknown): string {
  const codigo = (error as { code?: unknown } | null)?.code;
  if (typeof codigo === 'string' && codigo.length > 0) return codigo;
  return error instanceof Error ? error.name : 'desconocido';
}

function anotarElFallo(codigo: string, error: unknown): void {
  fallosAlGuardar++;
  ultimoFalloAlGuardar = { cuando: Date.now(), codigo, que: claseDelFallo(error) };
  /*
   * En el registro sí va todo, y con la carpeta delante: quien lo lea está en el
   * despliegue y lo primero que necesita saber es DÓNDE se estaba intentando
   * escribir. Es la mitad del diagnóstico que no puede salir por la red.
   */
  console.error(`[arcade] Error al guardar la mesa ${codigo} en «${CARPETA}»:`, error);
}

/**
 * Guarda ESTA mesa, por frecuencia. Lanza `AlmacenNoGuarda` si no ha podido.
 *
 * Antes recibía solo el manifiesto y guardaba TODAS las mesas del proceso. Ver
 * la cabecera: eso hacía que el coste de un movimiento fuera el de todas las
 * partidas abiertas, y que abrirlas —cosa que no pide credencial— fuera la
 * forma de encarecer las de los demás.
 */
async function guardar(manifiesto: ManifiestoDeArcade, m: MesaEnCurso): Promise<void> {
  if (tieneReloj(manifiesto)) {
    guardarDiferido(m.codigo);
    return;
  }
  try {
    await almacen.guardar(m);
  } catch (error) {
    anotarElFallo(m.codigo, error);
    throw new AlmacenNoGuarda(m.codigo, error);
  }
}

function guardarDiferido(codigo: string): void {
  pendientesDeGuardar.add(codigo);
  if (temporizadorDiferido !== undefined) return;
  temporizadorDiferido = setTimeout(() => {
    temporizadorDiferido = undefined;
    void volcarLoPendiente();
  }, DIFERIDO_MS);
  temporizadorDiferido.unref?.();
}

/**
 * Escribe las mesas que esperaban su turno.
 *
 * Aquí el fallo NO se propaga y solo se anota, y la diferencia con el camino
 * síncrono no es un descuido: en el diferido no hay ninguna petición esperando
 * —quien movió recibió su respuesta hace un segundo— así que no hay a quién
 * contestarle. Lo que queda es el registro y `/api/arcade/diagnostico`.
 */
async function volcarLoPendiente(): Promise<void> {
  const codigos = [...pendientesDeGuardar];
  pendientesDeGuardar.clear();
  for (const codigo of codigos) {
    const m = mesas.get(codigo);
    if (!m) continue;
    try {
      await almacen.guardar(m);
    } catch (error) {
      anotarElFallo(codigo, error);
    }
  }
}

/**
 * EL VOLCADO DE LA DESPEDIDA.
 *
 * ═══ POR QUÉ SE REGISTRA AL CARGAR EL MÓDULO Y NO EN `index.ts` ═══
 *
 * Porque la garantía tiene que estar puesta por el hecho de que exista una mesa,
 * no por el hecho de que alguien se acordara de encenderla en el arranque. Una
 * red que hay que activar a mano en otro fichero es la clase de red que se queda
 * sin activar el día que alguien reordena el arranque —y este repositorio ya
 * tiene apuntado el caso contrario, `exigirSecretosTapados()`, que existía,
 * funcionaba y no la llamaba nadie.
 *
 * `once` y no `on`: si llegan dos señales seguidas, la segunda encontraría el
 * proceso a medio volcar y escribiría encima.
 *
 * ═══ Y POR QUÉ, DESPUÉS DE VOLCAR, SE VUELVE A MANDAR LA SEÑAL ═══
 *
 * Aquí había escrito lo contrario —«no se llama a `process.exit`: se vuelca y se
 * deja que el proceso termine como iba a terminar»— y era falso, con la mejor
 * intención. Node lo documenta: instalar un oyente de `SIGTERM` o `SIGINT`
 * ELIMINA su comportamiento por defecto. Con un oyente puesto, el proceso ya no
 * iba a terminar; y como el servidor HTTP mantiene vivo el bucle de eventos, no
 * terminaba en absoluto.
 *
 * Las consecuencias eran las dos que se ven de verdad:
 *
 *   · En Render, tras el `SIGTERM` el proceso volcaba y SEGUÍA SIRVIENDO hasta
 *     que llegaba el `SIGKILL` del final de la ventana de gracia. O sea que cada
 *     despliegue se alargaba hasta el tope y el volcado quedaba desactualizado
 *     respecto a lo que se atendió después de hacerlo.
 *   · En local, el primer Ctrl+C dejaba de parar el servidor.
 *
 * La salida no es `process.exit`, que sí se llevaría por delante lo que otros
 * estuvieran cerrando: es volver a mandarse la señal a uno mismo. Como el
 * oyente era `once`, ya no está cuando llega la segunda, así que lo que corre es
 * el comportamiento por defecto — exactamente «terminar como iba a terminar»,
 * pero de verdad esta vez.
 *
 * NO REPRODUCIDO EN ESTA MÁQUINA: Windows no entrega estas señales. Se deriva de
 * lo que Node documenta y de leer el código, y por eso `verify:mesa` comprueba
 * que la despedida ocurre y con qué señal, en vez de fiarse.
 */
function volcarAlMorir(senal: string): void {
  if (mesas.size === 0) return;
  console.log(`[arcade] ${senal}: volcando ${mesas.size} mesa(s) antes de terminar.`);
  almacen.guardarYa(todas());
}

/**
 * Cómo se devuelve el proceso a su destino después de volcar.
 *
 * Es una costura de prueba y solo eso, con la misma justificación que
 * `ponerAlmacenDeMesas`: la de verdad MATA EL PROCESO, así que un comprobador
 * que quiera ejercitar el manejador —y `verify:mesa` lo hace, porque en Windows
 * no hay otra forma— se mataría a sí mismo en mitad de la comprobación.
 */
let despedirse: (senal: NodeJS.Signals) => void = (senal) => {
  process.kill(process.pid, senal);
};

/** Cambia lo que se hace tras volcar. SOLO para `verify:mesa`. Ver arriba. */
export function ponerLaDespedida(otra: (senal: NodeJS.Signals) => void): void {
  despedirse = otra;
}

function alRecibirLaSenal(senal: NodeJS.Signals): void {
  volcarAlMorir(senal);
  despedirse(senal);
}

process.once('SIGTERM', () => alRecibirLaSenal('SIGTERM'));
/*
 * `SIGINT` es Ctrl+C en el portátil de quien desarrolla. No lo manda Render y no
 * es un requisito, y está por la misma razón por la que se prueban las cosas en
 * local: si el volcado solo se ejercitara en producción, la primera vez que se
 * sabría si funciona sería el día que hiciera falta.
 */
process.once('SIGINT', () => alRecibirLaSenal('SIGINT'));

// ---------------------------------------------------------------------------
// EL CANDADO, QUE CUBRE TAMBIÉN LA LECTURA
// ---------------------------------------------------------------------------

const candados = new Map<string, Promise<unknown>>();

/** Cuántos candados quedan vivos. Solo para comprobar que no hay fuga. */
export function candadosDeMesaVivos(): number {
  return candados.size;
}

/**
 * Hace algo con una mesa, en exclusión mutua con todo lo demás de esa mesa.
 *
 * ═══ POR QUÉ LO USA TAMBIÉN LA LECTURA ═══
 *
 * Porque desde esta fase LEER PUEDE ESCRIBIR: antes de devolver nada se evalúan
 * los plazos, y si uno ha vencido entra un tic por el reductor. Sin el candado,
 * cuatro móviles sondeando la misma mesa harían vencer el mismo plazo cuatro
 * veces —cuatro tics, cuatro turnos saltados— y ninguno de los cuatro daría un
 * error. Es un fallo de los caros: aparece solo cuando hay gente de verdad
 * mirando a la vez, o sea nunca en una prueba de un solo cliente.
 *
 * El candado se retira comparando contra la promesa QUE SE GUARDÓ y no contra la
 * que se creó. Esa distinción parece una minucia y es la fuga silenciosa que ya
 * tuvo `live/sesion.ts`: guardando una y comparando la otra, la condición es
 * siempre falsa y el mapa crece una entrada por partida jugada.
 */
export async function conLaMesa<T>(
  codigo: string,
  hacer: (m: MesaEnCurso) => T | Promise<T>,
): Promise<T> {
  cargar();
  const anterior = candados.get(codigo) ?? Promise.resolve();
  let liberar!: () => void;
  const turno = new Promise<void>((r) => {
    liberar = r;
  });
  const miVez = anterior.then(() => turno);
  candados.set(codigo, miVez);
  await anterior;

  try {
    const m = mesas.get(codigo);
    if (!m) throw new MesaDesconocida(codigo);
    return await hacer(m);
  } finally {
    liberar();
    if (candados.get(codigo) === miVez) candados.delete(codigo);
  }
}

/** No hay ninguna mesa con ese código. */
export class MesaDesconocida extends Error {
  constructor(public readonly codigo: string) {
    super(
      `No hay ninguna mesa con el código «${codigo}». O se ha tecleado mal, o la partida ya se ` +
        'cerró, o este servidor no es el que la abrió.',
    );
    this.name = 'MesaDesconocida';
  }
}

/**
 * NO SE PUEDE ENTRAR EN ESTA MESA. Son tres puertas cerradas distintas y el
 * mensaje lo dice, porque a quien llega le importa la diferencia: si esta llena
 * puede pedir sitio en otra, si ya empezo puede pedir que le abran una nueva, y
 * si termino no hay nada que esperar. El `motivo` viaja aparte para quien quiera
 * ramificar; los clientes de hoy pintan el texto, y por eso el texto no miente.
 */
export class MesaLlena extends Error {
  constructor(
    public readonly codigo: string,
    public readonly maximo: number,
    public readonly motivo: 'mesa-llena' | 'mesa-empezada' | 'mesa-terminada' = 'mesa-llena',
  ) {
    super(
      motivo === 'mesa-terminada'
        ? 'Esa partida ya terminó.'
        : motivo === 'mesa-empezada'
          ? 'Esa partida ya empezó y no se puede entrar con ella en marcha.'
          : `En esta mesa caben ${maximo} y ya están todos sentados.`,
    );
    this.name = 'MesaLlena';
  }
}

/**
 * SE HA PEDIDO UNA MESA DE SERVIDOR PARA UN ARCADE QUE CORRE EN EL APARATO.
 *
 * ═══ POR QUÉ ESTO FALLA EN LA PETICIÓN QUE ABRE, Y NO MÁS TARDE ═══
 *
 * `necesitaMesa(manifiesto)` existe en `shared/arcade/tipos.ts` desde la fase 0
 * para responder exactamente esta pregunta, y hasta ahora no la llamaba ni una
 * línea de producción: solo un comprobador. Sin ella, `POST /api/arcade/mesas`
 * con un arcade de `sede: 'dispositivo'` —La Frente, hoy, y está en el catálogo
 * que el propio servidor publica— abría la mesa, la metía en la tabla, la
 * persistía… y REVENTABA al componer la vista, porque la proyección de ese juego
 * está escrita sobre su propio estado y la mesa nace con `estado: undefined`.
 *
 * Lo que quedaba era una mesa envenenada: 500 al leerla, 500 al sentarse y 500
 * al borrarla —el `DELETE` exige estar sentado y para saberlo hay que leerla—,
 * repetible sin credencial ninguna y viva treinta días.
 *
 * Pero el fallo de verdad no era el 500, que se arregla solo al no abrirla: es
 * que sin esta comprobación la plataforma hospeda, persiste y sirve durante un
 * mes partidas de un juego cuyo reductor está declarado para correr en el
 * aparato. La lección está escrita tres veces en este fichero —fallar en la
 * petición que abre y no cuando ya hay gente esperando— y aquí cuesta una línea.
 */
export class ArcadeSinMesa extends Error {
  constructor(
    public readonly arcade: ArcadeId,
    public readonly nombre: string,
  ) {
    super(
      `«${nombre}» se juega en el aparato (\`sede: 'dispositivo'\`) y no tiene mesa de servidor: ` +
        'su reductor corre en el móvil y su estado no sale de ahí. No hay nada que abrir aquí.',
    );
    this.name = 'ArcadeSinMesa';
  }
}

/**
 * UN MOVIMIENTO CON UN `tipo` QUE RESERVA LA PLATAFORMA.
 *
 * ═══ LA INVARIANTE QUE ESTABA ESCRITA Y NO EXISTÍA ═══
 *
 * `shared/arcade/movimiento.ts` declara que los tipos que empiezan por `arcade:`
 * los reserva la plataforma, y la cabecera de `arbitro.ts` dice por qué importa:
 * «el tic no lo manda un dispositivo … hacerlo pasar por la misma puerta abriría
 * la llave maestra». No lo comprobaba nadie.
 *
 * Lo que eso valía, MEDIDO contra el servidor levantado: un sentado a quien NO
 * le tocaba mandaba `{ tipo: 'arcade:tic' }`, recibía 200, y al que sí tenía el
 * turno se le echaba su carta más baja y se le sumaba una pasada. Repitiéndolo,
 * un solo cliente jugó la partida entera de cuatro personas —cinco bazas, la
 * mesa terminada, cinco pasadas en cada uno de los otros tres y ninguna en él—
 * sin que los demás tocaran el móvil. Y como forzar siempre la carta más baja
 * ajena decide las bazas, no era solo actuar cuando no te toca: era ganar.
 *
 * Se comprueba AQUÍ, en la única puerta por la que entra un movimiento de un
 * dispositivo, y no dentro de cada juego. Un reductor que tuviera que acordarse
 * de mirar `ctx.quien` en su rama del tic estaría reescribiendo una regla de
 * plataforma en cada juego, y el que se olvidara —Riberas, dentro de dos fases—
 * volvería a abrir esto sin que nada avisara.
 */
export class MovimientoReservado extends Error {
  constructor(public readonly tipo: string) {
    super(
      `«${tipo}» es un movimiento de la plataforma y no lo puede mandar un dispositivo. ` +
        'El prefijo `arcade:` está reservado: hoy es el tic del reloj, y el reloj lo mete quien ' +
        'hospeda la partida, no quien juega.',
    );
    this.name = 'MovimientoReservado';
  }
}

/** El prefijo que reserva la plataforma. Ver `shared/arcade/movimiento.ts`. */
const PREFIJO_RESERVADO = 'arcade:';

// ---------------------------------------------------------------------------
// LOS PLAZOS, EVALUADOS EN LA LECTURA
// ---------------------------------------------------------------------------

/**
 * A QUIÉN LE TOCA, SEGÚN LA VISTA DEL ESPECTADOR. `undefined` si no lo dice.
 *
 * ═══ POR QUÉ ESTA CAPA MIRA ESTO, SI EL ESTADO ES OPACO ═══
 *
 * No mira el estado: mira la PROYECCIÓN, que es lo que el juego publica a
 * propósito y ya viaja por el cable a cuatro móviles. Es exactamente la misma
 * técnica y el mismo motivo que `tableroDeLaVista` para pintar el mueble
 * genérico, y está contado entero en `shared/mecanicas/turno-declarado.ts`. La
 * ruta `/turno` lleva haciéndolo desde que existe; lo nuevo es que la mesa
 * también lo necesita, y por la razón de abajo.
 *
 * ═══ QUÉ SE ROMPÍA SIN ESTO, QUE ES EL AGUJERO QUE LA FASE 2 CREÍA CERRADO ═══
 *
 * `mover` reprogramaba `venceEn` y `turnoDesde` con la condición «el estado ha
 * cambiado», sin mirar QUIÉN movió. La cabecera de `mover` cuenta cómo se cerró
 * el caso «cualquier movimiento»; quedó abierto el caso «cualquier movimiento QUE
 * CAMBIE ALGO», y en un juego con comercio ése es un movimiento normal y
 * legítimo. En Riberas, `opcionesDeTurno` ofrece aceptar y rechazar un trueque A
 * QUIEN NO LE TOCA —está antes del `if (v.turnoDe !== quien) return opciones`— y
 * contestar cambia el estado. Con plazo de un día: Ana tiene el turno, ofrece un
 * trueque y cierra la app; veinte horas después Bruno lo rechaza, y con eso Ana
 * se lleva veinticuatro horas más de plazo y `esperandoMs` vuelve a cero. Con
 * ocho tratos recordados son ocho días de turno prorrogado y ocho días de aviso
 * que no se dispara nunca. Sin colusión y sin cliente manipulado.
 *
 * La regla correcta no es «ha cambiado el estado» sino EL TURNO HA CAMBIADO, que
 * es lo que significa de verdad «empieza a esperarse a otro». Y esta capa puede
 * preguntarlo sin saber qué es un turno, porque no lo deduce: lo lee de donde el
 * juego lo declaró.
 *
 * ═══ Y SI EL JUEGO NO LO DECLARA ═══
 *
 * Se devuelve `undefined` y quien llama se cae a la regla vieja —«ha cambiado el
 * estado»—, que es peor pero no es nada nuevo. Exigirle a todos los juegos que
 * declaren `turnoDe` sería convertir esto en una regla de plataforma, que es
 * justo lo que el §5.3 prohíbe: «en cuanto el motor sabe qué es un turno, el
 * primer juego rico decide qué forma tiene».
 *
 * Se lee de la vista del ESPECTADOR (`null`) y no de la de nadie: de quién es el
 * turno no es secreto de ninguno, y la del espectador es la única que por
 * contrato no lleva secretos dentro.
 */
function turnoQueDeclara(arcade: ArcadeId, estado: Mesa['estado']): string | null | undefined {
  let vista: unknown;
  try {
    vista = vistaDeAsiento(arcade, estado, null);
  } catch {
    /*
     * `vistaDeAsiento` lanza si un juego declara secretos y no tiene proyección
     * registrada. Eso no debería poder ocurrir —`exigirSecretosTapados()` impide
     * arrancar— pero si ocurriera, quien manda es la regla vieja y no una
     * excepción que tumbe un movimiento legítimo por una pregunta accesoria.
     */
    return undefined;
  }
  const turno = turnoDeLaVista(vista);
  return turno.declarado ? turno.de : undefined;
}

/**
 * ¿EMPIEZA UN TURNO NUEVO entre estos dos estados? Es lo que reinicia los relojes.
 *
 * Devuelve `true` también cuando el juego no declara turno, y no por comodidad:
 * ahí la única señal que hay es que el estado cambió, que es la regla con la que
 * se vivía antes de esta fase. Un juego sin turnos declarados no empeora.
 */
function empiezaTurnoNuevo(arcade: ArcadeId, antes: Mesa['estado'], despues: Mesa['estado']): boolean {
  const deAntes = turnoQueDeclara(arcade, antes);
  if (deAntes === undefined) return true;
  const deDespues = turnoQueDeclara(arcade, despues);
  if (deDespues === undefined) return true;
  return deAntes !== deDespues;
}

/**
 * Tope de tics que se meten de una vez. Ver `ponerAlDiaElPlazo`.
 *
 * No debería llegarse nunca, porque cada tic reprograma el vencimiento a partir
 * de AHORA y por tanto solo puede vencer uno por lectura. Está por lo que está
 * cualquier tope en un bucle que depende de un reloj: si alguien cambia la
 * política de reprogramación por «vence otra vez cuando le tocaba», una mesa
 * aparcada tres días con plazo de un minuto metería cuatro mil trescientos tics
 * en una sola petición HTTP, con el bucle de eventos bloqueado mientras tanto.
 */
const TICS_DE_GOLPE = 8;

/**
 * ¿Ha vencido el plazo? Si sí, mete el tic. Devuelve si la mesa ha cambiado.
 *
 * ═══ EL TIC QUE NO CAMBIA NADA SE DESCARTA, Y ESO NO ES UNA OPTIMIZACIÓN ═══
 *
 * `avanzarElReloj` del árbitro SIEMPRE sube la revisión y SIEMPRE anota el
 * movimiento en el diario, porque desde su punto de vista un tic es un
 * movimiento como cualquier otro. Aquí eso no vale: una mesa que lleva dos días
 * esperando al cuarto jugador recibe un tic por lectura, y el juego devuelve el
 * mismo estado porque no hay nada que hacer vencer. Sin este descarte, esa mesa
 * acumularía miles de entradas en el diario, la revisión subiría sola, y los
 * móviles que sondean se despertarían continuamente para pintar exactamente lo
 * mismo.
 *
 * La comprobación es por IDENTIDAD y se apoya en una regla que el contrato del
 * reductor ya exige y que `oro:arcade` mide: un movimiento que no cambia nada
 * devuelve EL MISMO objeto. Un juego que copiara el estado en cada tic haría
 * crecer su diario, y eso se vería en `oro:arcade` como un salto en la cuenta de
 * movimientos que no tocan nada — no aquí, en silencio.
 *
 * ═══ Y POR QUÉ EL VENCIMIENTO SE REPROGRAMA DESDE AHORA ═══
 *
 * Podría reprogramarse «desde donde vencía» —`venceEn += plazoMs`—, que es lo
 * que hace un metrónomo. Sería el comportamiento equivocado: una mesa de La
 * Larga aparcada un fin de semana con plazo de una hora tendría cuarenta y ocho
 * plazos vencidos, y al volver el lunes se encontraría cuarenta y ocho turnos
 * saltados de golpe. Reprogramando desde ahora, se pierde UN turno por plazo
 * transcurrido sin que nadie mire, que es lo que significa de verdad «se te pasó
 * la hora».
 */
/**
 * ═══ SE CIERRA LA MESA CUANDO EL JUEGO DICE QUE SE ACABÓ ═══
 *
 * Y hasta hoy no lo decía NADIE. El árbitro documenta desde el primer día que
 * «quien hospeda llama a `cerrarMesa` cuando el estado del juego dice que se
 * acabó», los DOS juegos de servidor —La Ronda y Riberas; el tercero que exporta
 * `seAcabo` es El Arcade, que es de aparato— lo tenían escrito… y el único que lo
 * llamaba era el motor del aparato. En el servidor, `cerrarMesa` sólo se
 * ejecutaba desde `POST /cerrar`, que no llama ningún cliente. O sea que NINGUNA
 * mesa se cerraba jamás: la partida acabada seguía pintando su cuenta atrás, el
 * plazo seguía venciendo, y cada mirada metía un tic en un juego terminado.
 *
 * Va en las DOS puertas por las que cambia el estado —el movimiento y el tic— y
 * no sólo en la primera: en La Ronda el tic juega por quien no aparece, así que
 * la última carta de una partida la puede echar el reloj y no una persona.
 *
 * Y SE APAGA EL PLAZO, que es la mitad visible: `venceEn` es lo que el móvil
 * pinta como cuenta atrás, y en el tic se reprograma ANTES de saber qué hizo el
 * reductor. Sin apagarlo aquí, una partida acabada seguía enseñando «quedan
 * veinticuatro horas» para siempre. Una mesa cerrada no espera a nadie.
 *
 * POR ESO VA LA ÚLTIMA de las dos puertas y no en medio: la primera versión de
 * esto apagaba el plazo y tres líneas después `if (otroTurno)` lo volvía a armar,
 * y así se guardaba. No se veía porque los dos clientes miran `terminada` antes
 * de pintar el reloj —o sea que el síntoma estaba tapado y el dato guardado
 * mentía—, y la comprobación que se escribió sólo cubría el camino del tic, que
 * era justo el que funcionaba.
 *
 * ═══ Y PASA POR LA BÁSCULA, COMO TODO LO QUE ESCRIBE EL JUEGO ═══
 *
 * `seAcabo` es código de un arcade, y el motivo escrito para meterlo en el alta
 * es que lo pueda declarar uno de FUERA. Sin envolverlo era la única puerta del
 * motor que ejecuta código ajeno sin presupuesto y sin red: medido, un `seAcabo`
 * que revienta tumbaba la LECTURA entera —500 en una mesa que no se podía ni
 * ver— y, por la puerta de `mover`, dejaba el movimiento aplicado en memoria y
 * sin guardar, porque `guardar()` viene después.
 *
 * Y el fallo se DICE. Un `catch` mudo aquí sería peor que el de al lado: una mesa
 * que no se cierra nunca es exactamente el fallo que esta función existe para
 * matar, y en silencio no se distingue de un juego que aún no ha terminado.
 *
 * Devuelve si ha cerrado, para que quien llama sepa que hay algo que guardar.
 */
function cerrarSiSeAcabo(m: MesaEnCurso, seAvisa = true): boolean {
  if (m.mesa.terminada) return false;
  /*
   * El atajo va PRIMERO y hace dos cosas: se ahorra la báscula en los arcades que
   * no declaran final —que es el caso normal— y, sobre todo, no grita cuando la
   * mesa es de un arcade que esta instancia no tiene instalado. Al recuperar del
   * disco eso pasa de verdad: un reparto distinto deja mesas de juegos ausentes.
   */
  if (!hayFinal(m.mesa.arcade)) return false;
  let seAcabo: boolean;
  try {
    seAcabo = conPresupuesto(m.mesa.arcade, 'arcade:se-acabo', () =>
      seAcaboLaPartida(m.mesa.arcade, m.mesa.estado),
    );
  } catch (error) {
    if (!(error instanceof ArcadeFueraDePresupuesto)) {
      console.error(
        `[arcade] El «seAcabo» de «${m.mesa.arcade}» ha fallado en la mesa ${m.codigo}. ` +
          'La mesa se queda ABIERTA, que es lo único seguro que se puede hacer sin su respuesta:',
        error,
      );
    }
    return false;
  }
  if (!seAcabo) return false;
  m.mesa = cerrarMesa(m.mesa);
  m.venceEn = null;
  /*
   * Y SE DICE. `seAvisa` es falso sólo al recuperar del almacén: anunciar ahí
   * sería contarle «se acabó la partida» a quien abra la app después de un
   * despliegue, de una partida que terminó hace tres días.
   *
   * Envuelto, porque un oyente no puede tumbar un movimiento que ya entró: para
   * cuando se llega aquí el estado está cambiado y aún falta guardarlo.
   */
  if (seAvisa && alCerrarseUnaMesa !== null) {
    try {
      alCerrarseUnaMesa(m.codigo, m.mesa.rev);
    } catch (error) {
      console.error(`[arcade] No se ha podido anunciar el cierre de la mesa ${m.codigo}:`, error);
    }
  }
  return true;
}

function ponerAlDiaElPlazo(m: MesaEnCurso): boolean {
  if (m.plazoMs <= 0 || m.mesa.terminada) {
    m.venceEn = null;
    return false;
  }

  /*
   * ═══ UN ARCADE APARTADO DEJA DE TICAR, PERO SUS MESAS SE SIGUEN LEYENDO ═══
   *
   * Esta salida no estaba, y su ausencia convertía la cuarentena en algo mucho
   * peor de lo que promete `presupuesto.ts` («sus mesas dejan de aceptar
   * MOVIMIENTOS»): `mirar()` llama aquí, aquí se entraba en `conPresupuesto`, y
   * `exigirPresupuesto` lanzaba ANTES de tocar el reductor. Como `m.venceEn` se
   * reprogramaba DESPUÉS de la llamada que lanzaba, el plazo no se reprogramaba
   * nunca y TODA lectura posterior volvía a lanzar. Medido: arcade apartado, plazo
   * de un segundo, lectura inmediata bien; pasado el plazo, `ArcadeFueraDePresu-
   * puesto`; y la siguiente igual, para siempre. Cuatro personas jugando a un
   * arcade que se pasó una vez se quedaban sin poder ni VER el tablero, ni leer
   * por qué, hasta reiniciar el proceso.
   *
   * ═══ Y ESTA LÍNEA ES UN ATAJO, NO LA GARANTÍA. HAY QUE DECIRLO ═══
   *
   * Quien de verdad arregla lo de arriba es el `catch` de `ArcadeFueraDePresupuesto`
   * de unas líneas más abajo, que reprograma el plazo y descarta el tic. Se
   * comprobó quitando esta línea: `verify:presupuesto` sigue en verde, porque el
   * comportamiento observable no cambia.
   *
   * Se queda porque ahorra fabricar una excepción en CADA sondeo de CADA mesa de un
   * arcade apartado —cuatro móviles preguntando cada pocos segundos— y porque dice
   * en una línea lo que si no hay que deducir del `catch`: un arcade apartado no
   * tica. Pero queda escrito que es una comodidad y no la defensa, para que nadie
   * lea aquí una garantía que en realidad vive doce líneas más abajo.
   *
   * Lo que un apartado SIGUE haciendo en una lectura es proyectar. Eso no ha
   * cambiado y nunca estuvo dentro del presupuesto —que envuelve al reductor y no a
   * la proyección— y es lo que permite seguir enseñando el tablero.
   */
  if (enCuarentena(m.mesa.arcade) !== null) return false;

  let cambio = false;
  for (let vueltas = 0; vueltas < TICS_DE_GOLPE; vueltas++) {
    const ahora = Date.now();
    if (m.venceEn === null) {
      m.venceEn = ahora + m.plazoMs;
      return cambio;
    }
    if (ahora < m.venceEn) return cambio;

    const antes = m.mesa;
    let despues: typeof antes;
    try {
      /*
       * EL TIC TAMBIÉN PASA POR EL PRESUPUESTO, y era el camino que más falta hacía
       * cubrir: se mete solo, sin que nadie lo pida, y hasta TICS_DE_GOLPE veces
       * seguidas. Un reductor que tarde en su tic multiplica ese coste por el número
       * de plazos vencidos, y lo hace dentro de la petición de quien pasaba por ahí a
       * mirar. Si se pasa del tope, `conPresupuesto` lanza: el tic se descarta, la
       * mesa se queda como estaba y el arcade queda apartado.
       */
      despues = conPresupuesto(m.mesa.arcade, 'arcade:tic', () => avanzarElReloj(antes));
      /*
       * ═══ Y EL TIC PESA SU ESTADO IGUAL QUE LO PESA UN MOVIMIENTO ═══
       *
       * Aquí había un `medirTamano(...)` —abajo, después de asignar `m.mesa`— que
       * sólo ANOTABA, y que además muestreaba uno de cada sesenta cuando el arcade
       * tenía reloj. O sea que el segundo tope, el que protege el disco y la red,
       * tenía una puerta trasera entera por el camino que la cabecera de
       * `presupuesto.ts` señala como el que más falta hacía cubrir: un arcade
       * movido por plazo que engorde su estado en cada tic no entraba NUNCA en
       * cuarentena por tamaño, y sus tics se guardaban y viajaban.
       *
       * Se pesa ANTES de asignar `m.mesa`, por lo mismo que en `mover`: si se pasa
       * del tope, lo que hay que hacer es no quedárselo, y como el reductor es puro
       * revertir es no asignar.
       *
       * Y sólo cuando el estado cambió: un tic que no cambia nada devuelve el mismo
       * objeto, y volver a serializarlo sería pagar la báscula por nada.
       */
      if (despues.estado !== antes.estado) pesarElEstado(antes.arcade, despues.estado);
    } catch (error) {
      /*
       * ═══ EL TIC QUE SE PASA APARTA AL ARCADE Y NO TUMBA LA LECTURA ═══
       *
       * Antes esta excepción salía hasta `mirar()` y de ahí hasta un 503 sin mesa
       * dentro. El castigo ya está puesto —`conPresupuesto` apunta la cuarentena en
       * su `finally`, y `pesarElEstado` antes de lanzar—, así que dejarla subir no
       * añade ninguna protección: sólo le quita la pantalla a quien pasaba por ahí
       * a mirar. Se descarta el tic, se reprograma el plazo para no reintentarlo en
       * bucle, y se sale con lo que se hubiera acumulado.
       *
       * Cualquier otro error SÍ sube: un reductor que revienta no es lo mismo que
       * uno que se pasa del presupuesto, y taparlo aquí escondería un fallo del
       * juego detrás de una mesa que parece parada.
       */
      m.venceEn = Date.now() + m.plazoMs;
      if (error instanceof ArcadeFueraDePresupuesto) return cambio;
      throw error;
    }
    m.venceEn = Date.now() + m.plazoMs;
    if (despues.estado === antes.estado) continue;

    /*
     * EL TIC QUE PASA EL TURNO EMPIEZA UN TURNO NUEVO, y ése es el caso de La
     * Larga que más importa: a quien le tocaba se le pasó la hora, el juego
     * decidió qué significa eso —en Riberas, pasar el turno— y desde ESTE
     * instante se está esperando a otra persona. Sin esto, el aviso del turno
     * siguiente heredaría la antigüedad del anterior y diría «lleva tres días sin
     * mover» de alguien a quien le acaba de tocar.
     *
     * Y SE PREGUNTA POR EL TURNO Y NO POR EL ESTADO, que es la corrección de esta
     * ronda. En la colocación de Riberas el tic COLOCA POR EL AUSENTE y deja el
     * turno donde estaba —lo decide el juego en su rama del tic, y esta capa no
     * tiene por qué saberlo—. Con la condición vieja, ese tic ponía `turnoDesde` a
     * ahora y el aviso decía «acaba de empezar» de alguien que llevaba un día sin
     * aparecer. Se sigue esperando a la misma persona: la cuenta no se toca.
     *
     * Se calcula ANTES de mover `m.mesa` porque hacen falta los dos estados.
     */
    const otroTurno = empiezaTurnoNuevo(antes.arcade, antes.estado, despues.estado);
    m.mesa = despues;
    m.ultimoToqueEn = Date.now();
    if (otroTurno) m.turnoDesde = m.ultimoToqueEn;
    /* Y si con ese tic se acabó, se cierra y se para: no hay más plazos que vencer. */
    if (cerrarSiSeAcabo(m)) return true;
    cambio = true;
  }
  return cambio;
}

// ---------------------------------------------------------------------------
// ABRIR, SENTARSE, MIRAR, MOVER, CERRAR
// ---------------------------------------------------------------------------

/** El plazo por defecto si quien abre no dice otra cosa: dos minutos por turno. */
export const PLAZO_POR_DEFECTO_S = 120;

/** Lo más largo que se admite: siete días. Ver `abrir`. */
export const PLAZO_MAXIMO_S = 7 * 24 * 60 * 60;

/**
 * ABRE UNA MESA. La abre EL PRIMER JUGADOR, que se sienta de paso.
 *
 * Abrir y sentarse van juntos y no en dos pasos, y la razón es que el paso
 * intermedio —una mesa abierta sin nadie— no significa nada y sí abre un hueco:
 * quien la abriera podría no sentarse, y entonces habría mesas fantasma que
 * caducan solas y códigos repartidos que no llevan a ninguna partida.
 *
 * `plazoSegundos` es de quien abre y no del juego, por lo que cuenta la cabecera:
 * «veinticuatro horas por turno» es una decisión de producto de quien monta la
 * partida. Se admite `0` explícito, que significa «esta mesa no tiene prisa» y
 * deja los plazos apagados.
 */
export async function abrir(datos: {
  arcade: ArcadeId;
  nombre: string;
  plazoSegundos?: number;
}): Promise<{ mesa: MesaEnCurso; silla: Silla }> {
  cargar();
  const ahora = Date.now();
  barrerLasViejas(ahora);

  /*
   * El manifiesto se pide ANTES de nada. Abrir una mesa de un arcade que no está
   * instalado tiene que fallar aquí —en la petición que la abre, con el nombre
   * del juego en el mensaje— y no al primer movimiento, con gente esperando. Es
   * la lección de `manifiestoDe`, que devolvía CLUEDO por defecto y dejaba jugar
   * una velada entera con las reglas de otro juego sin un solo error.
   */
  const manifiesto = manifiestoDeArcade(datos.arcade);

  /*
   * Y SE MIRA QUE ESTE JUEGO TENGA MESA. Es la pregunta que `necesitaMesa`
   * responde desde la fase 0 y que no le hacía nadie: ver `ArcadeSinMesa`.
   */
  if (!necesitaMesa(manifiesto)) throw new ArcadeSinMesa(datos.arcade, manifiesto.nombre);

  const codigo = codigoLibre();
  const silla = sillaNueva(datos.nombre);

  const enCurso: MesaEnCurso = {
    codigo,
    mesa: abrirMesaDelArbitro({
      id: codigo,
      arcade: datos.arcade,
      /*
       * LA SEMILLA LA ELIGE EL SERVIDOR, y del azar de verdad. Si la eligiera el
       * dispositivo, un cliente manipulado probaría semillas hasta dar con la
       * que le reparte la mano que quiere — y en un juego de mano oculta eso no
       * es una ventaja, es el juego entero.
       */
      semilla: semillaNueva(),
      asientos: [silla.id],
    }),
    sillas: [silla],
    plazoMs: plazoValido(datos.plazoSegundos) * 1000,
    venceEn: null,
    /*
     * Se espera a alguien desde que la mesa existe, y no desde que se reparte. Es
     * lo correcto y además es lo útil: una mesa de La Larga abierta el martes a la
     * que nunca llegó el segundo jugador tiene que poder decir «lleva cuatro días
     * esperando», que es exactamente lo que se necesita para decidir cerrarla.
     */
    turnoDesde: ahora,
    abiertaEn: ahora,
    ultimoToqueEn: ahora,
  };
  if (enCurso.plazoMs > 0) enCurso.venceEn = ahora + enCurso.plazoMs;

  mesas.set(codigo, enCurso);
  try {
    await guardar(manifiesto, enCurso);
  } catch (error) {
    /*
     * Si no se ha podido guardar, la mesa NO se abre: se saca de la tabla y el
     * fallo sube. Una mesa que existe en memoria y no en el disco es una partida
     * que se pierde en el siguiente reinicio sin que nadie lo sepa, y aquí —a
     * diferencia de un movimiento a mitad de partida— no hay nada que salvar:
     * todavía no ha jugado nadie.
     */
    mesas.delete(codigo);
    throw error;
  }
  return { mesa: enCurso, silla };
}

/**
 * El plazo pedido, acotado.
 *
 * El máximo existe por lo que existe cualquier tope en un número que llega de
 * fuera: sin él, `plazoSegundos: 1e18` da un `venceEn` que no vence nunca y una
 * mesa que se queda quieta para siempre sin que nada falle. Siete días es más
 * que de sobra para el juego más lento que el diseño contempla —La Larga, «se
 * entra, se juega uno, se cierra la app»— y sigue siendo un número.
 *
 * Un valor que no sea un número finito se trata como «no dijo nada» y cae al
 * defecto, en vez de lanzar: quien abre una mesa está tecleando un nombre en un
 * móvil, y una petición rechazada por un campo opcional mal formado es peor
 * producto que un plazo razonable.
 */
function plazoValido(pedido: number | undefined): number {
  if (pedido === undefined || !Number.isFinite(pedido)) return PLAZO_POR_DEFECTO_S;
  if (pedido <= 0) return 0;
  return Math.min(Math.floor(pedido), PLAZO_MAXIMO_S);
}

function sillaNueva(nombre: string): Silla {
  const limpio = nombre.trim().slice(0, 24);
  return {
    id: `a${letrasAlAzar(8)}`,
    nombre: limpio.length > 0 ? limpio : 'Alguien',
    llave: letrasAlAzar(LARGO_DE_LA_LLAVE),
  };
}

/**
 * Una semilla de 32 bits del azar de verdad.
 *
 * `crypto` y no `Math.random()`: no porque haga falta criptografía para barajar,
 * sino porque `Math.random()` en Node se siembra de una forma que no está
 * documentada y no hay ninguna razón para usar el generador flojo cuando el
 * bueno está a la misma distancia.
 */
function semillaNueva(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] as number;
}

/**
 * SE SIENTA ALGUIEN MÁS, con el código.
 *
 * El aforo lo dice el MANIFIESTO y no este fichero. Con cuatro sentados en una
 * mesa de La Ronda, el quinto se queda fuera sin que nadie haya escrito «cuatro»
 * aquí.
 *
 * ═══ SE MIRA EL MÁXIMO Y NO `cabenEnLaMesa`, Y HAY QUE DECIR POR QUÉ ═══
 *
 * `cabenEnLaMesa(m, n)` responde a «¿es `n` una cantidad JUGABLE?», o sea que
 * comprueba el mínimo además del máximo. Es la pregunta correcta para empezar
 * una partida y la equivocada para sentarse: con ella, el segundo en llegar a
 * una mesa de cuatro recibiría «la mesa está llena», porque dos no es una
 * cantidad jugable de La Ronda. Se probó y eso es exactamente lo que hizo.
 *
 * Sentarse solo puede chocar con el techo. Que haya bastante gente para jugar es
 * una pregunta del REDUCTOR —La Ronda no reparte hasta que hay cuatro— y no de
 * la puerta, y ahí está bien puesta: si la puerta exigiera el mínimo, nadie
 * podría llegar a alcanzarlo.
 *
 * Sentarse SUBE LA REVISIÓN aunque no toque el estado del juego, y eso es
 * deliberado: los otros tres están sondeando y tienen que enterarse de que ha
 * llegado alguien. El precio es que un movimiento en vuelo se queda rancio y hay
 * que reintentarlo, lo cual solo puede pasar mientras la mesa se reúne.
 */
export async function sentarse(codigo: string, nombre: string): Promise<Silla> {
  return conLaMesa(codigo, async (m) => {
    const manifiesto = manifiestoDeArcade(m.mesa.arcade);
    if (m.mesa.terminada) throw new MesaLlena(codigo, manifiesto.jugadores.maximo, 'mesa-terminada');
    /*
     * ═══ Y CON LA PARTIDA EMPEZADA NO SE SIENTA NADIE ═══
     *
     * Faltaba, y el agujero era de los que no dan error: en Riberas —de 2 a 6—
     * dos personas repartian, una tercera llegaba con el codigo del chat y el
     * servidor le daba silla. El reductor copio los asientos AL REPARTIR, asi que
     * esa tercera no es colono: ve el tablero, ve de quien es el turno y no tiene
     * un solo boton, nunca. Y sale en la lista de la mesa como si jugara, asi que
     * los otros dos creen que son tres. Ademas su silla gasta aforo, y no hay
     * verbo de levantarse: seis curiosos dejaban la mesa llena para siempre.
     *
     * Se reusa la clase `MesaLlena` —misma puerta, mismo 409— pero NO su mensaje:
     * decirle «caben 6 y ya estan todos» a quien llega a una mesa de tres seria
     * mentira, y ademas la que le haria teclear el codigo otra vez creyendo que se
     * equivoco. El texto y el `motivo` distinguen los tres casos; ver la clase.
     */
    if (m.mesa.empezada === true)
      throw new MesaLlena(codigo, manifiesto.jugadores.maximo, 'mesa-empezada');
    if (m.sillas.length + 1 > manifiesto.jugadores.maximo) {
      throw new MesaLlena(codigo, manifiesto.jugadores.maximo);
    }

    const silla = sillaNueva(nombre);
    m.sillas = [...m.sillas, silla];
    m.mesa = {
      ...m.mesa,
      asientos: m.sillas.map((s) => s.id),
      rev: m.mesa.rev + 1,
    };
    m.ultimoToqueEn = Date.now();
    await guardar(manifiesto, m);
    return silla;
  });
}

/**
 * MIRAR LA MESA. Y sí, mirar puede escribir.
 *
 * ═══ AQUÍ NO SE COMPRUEBA NINGUNA REVISIÓN, Y ESO ES EL PUNTO 4 DE «LA LARGA» ═══
 *
 * Un `rev` rancio de días no es un error: es alguien que volvió del trabajo. La
 * resincronización lo trata como el caso normal y devuelve el estado COMPLETO,
 * que es el mismo razonamiento que ya está escrito en la cabecera de `hub.ts`
 * —«si se pierde un aviso, la siguiente petición trae el estado completo»— y lo
 * que permite que el día que exista un canal continuo se pueda degradar a sondeo
 * en caliente.
 *
 * La revisión se comprueba al ESCRIBIR, en `mover`, y solo allí: ahí sí importa,
 * porque actuar sobre un estado que ya no existe cambia el resultado. Mirar con
 * una revisión vieja no cambia nada de nadie.
 */
export async function mirar(codigo: string, llave: string | null): Promise<VistaDeMesa> {
  /*
   * Y de paso se barre, como mucho una vez por hora. Va aquí y no sólo en `abrir`
   * porque la lectura es lo único que ocurre siempre: en una instancia donde el
   * grupo lleva una semana con su partida y nadie abre mesas nuevas, `abrir` no se
   * llama jamás y la carpeta no se limpiaba nunca. Ver `CADA_CUANTO_SE_BARRE_MS`.
   *
   * Fuera del candado y antes de pedirlo, exactamente donde lo hace `abrir`: es un
   * repaso de la tabla, no una operación sobre esta mesa. Si la barrida se lleva
   * por delante la mesa que se está mirando —treinta días sin que nadie la
   * tocara—, `conLaMesa` contesta `MesaDesconocida`, que es la verdad.
   */
  cargar();
  barrerSiTocaPorReloj(Date.now());
  return conLaMesa(codigo, async (m) => {
    const manifiesto = manifiestoDeArcade(m.mesa.arcade);
    const yo = asientoDe(m, llave);

    if (ponerAlDiaElPlazo(m)) await guardar(manifiesto, m);

    /*
     * La presencia se marca AQUÍ, en la lectura, porque es lo que significa: «se
     * le ha visto». No se escribe en ningún sitio ni pide el candado de nada —es
     * un número en un mapa— y por eso puede ocurrir en cada vuelta de sondeo sin
     * costar nada. La lección viene de las veladas, donde marcar «sigo aquí»
     * pasaba por el candado de la partida y estrechaba la velada entera por el
     * cuello del dato más insignificante que hay en ella.
     */
    if (yo !== null) marcarPresencia(clavePresencia(codigo), yo);

    return vistaDe(m, yo);
  });
}

/**
 * MOVER. La única puerta por la que un dispositivo cambia una partida.
 *
 * ═══ EL PLAZO SE EVALÚA ANTES DE ADMITIR EL MOVIMIENTO ═══
 *
 * Y el orden es la regla, no una casualidad de implementación: si a alguien se le
 * ha pasado el turno mientras escribía, lo que tiene que entrar primero es el
 * tic. Al revés, el movimiento de quien llegó tarde se colaría por delante de su
 * propio vencimiento, y entonces «se acabó el tiempo» significaría cosas
 * distintas según lo llena que estuviera la cola de peticiones del servidor. Es
 * el mismo criterio que La Frente ya tenía escrito para el pulgar y el reloj.
 *
 * La consecuencia visible es buena: quien llega tarde recibe `revision-rancia`
 * —porque el tic subió la revisión— vuelve a pedir el estado y se encuentra con
 * que su turno pasó. Eso es exactamente lo que ocurrió.
 *
 * ═══ Y EL MOVIMIENTO QUE NO CAMBIA NADA SE DESCARTA ENTERO ═══
 *
 * Es la misma regla que `ponerAlDiaElPlazo` ya aplicaba al tic, que faltaba en
 * el camino del cliente, y que aquí vale por tres cosas a la vez. Un reductor
 * devuelve EL MISMO objeto cuando el movimiento no significa nada en su juego
 * —una carta que no tienes, un turno que no es el tuyo, un `tipo` que no
 * conoce—, y hasta ahora eso subía la revisión igual, se anotaba en el diario
 * igual y se escribía en el disco igual. Medido: dos mil movimientos de un tipo
 * inexistente desde un solo cliente dejaban el diario de esa mesa en 1,2 MB, y
 * uno solo con 240 kB de carga dentro quedaba archivado tal cual durante treinta
 * días. Con el descarte, un movimiento que el juego ignora no deja rastro:
 *
 *   · NO CRECE EL DIARIO ni el estado guardado, así que no hay forma de llenar
 *     el disco de un servidor sin credencial ninguna.
 *   · NO SUBE LA REVISIÓN, así que los otros tres no se despiertan de su sondeo
 *     para repintar exactamente lo mismo.
 *   · Y NO REPROGRAMA EL PLAZO, que es lo grave y lo que sigue.
 */
export async function mover(
  codigo: string,
  llave: string | null,
  rev: number,
  movimiento: Movimiento,
): Promise<VistaDeMesa> {
  /*
   * EL PREFIJO RESERVADO SE COMPRUEBA ANTES QUE NADA, y antes incluso de coger
   * el candado: un dispositivo no manda movimientos de la plataforma. Ver
   * `MovimientoReservado`, que cuenta lo que costaba no comprobarlo.
   */
  if (movimiento.tipo.startsWith(PREFIJO_RESERVADO)) {
    throw new MovimientoReservado(movimiento.tipo);
  }

  return conLaMesa(codigo, async (m) => {
    const manifiesto = manifiestoDeArcade(m.mesa.arcade);
    const yo = asientoDe(m, llave);

    const vencio = ponerAlDiaElPlazo(m);

    /*
     * `jugarConMotivo` lanza `MovimientoRechazado` cuando quien rechaza es LA
     * AUTORIDAD —no estás sentado, la revisión es rancia, la mesa terminó— y ese
     * motivo es una unión cerrada que sube tal cual hasta la ruta, que es quien
     * sabe convertirlo en un código HTTP. Traducirlo aquí obligaría a este fichero
     * a saber de HTTP, y entonces no se podría usar la misma autoridad desde un
     * guion de comprobación sin montar un servidor.
     *
     * Y devuelve, además, el motivo que dé EL JUEGO cuando es el reductor quien
     * rechaza. Ése no es una excepción y no puede serlo: el movimiento entró por
     * la puerta, la autoridad lo dio por bueno, y el juego decidió que no procedía
     * — que con la regla del «sólo si» es el camino normal y no un error. Ver
     * `VistaDeMesa.motivo`.
     */
    const antes = m.mesa;
    let despues: typeof antes;
    let motivoDelJuego: string | null = null;
    try {
      const jugado = conPresupuesto(antes.arcade, movimiento.tipo, () =>
        jugarConMotivo(antes, { quien: yo, movimiento, rev }),
      );
      motivoDelJuego = jugado.motivo;
      /*
       * ═══ UN RECHAZO NO ES UN CAMBIO, AUNQUE EL OBJETO DE ESTADO SEA OTRO ═══
       *
       * Aquí ponía `despues = jugado.mesa` a secas, y el `cambio` de más abajo se
       * calculaba comparando estados POR IDENTIDAD. Eso daba por «pasó algo» un
       * caso que el propio contrato declara legítimo y que produce un objeto
       * distinto: un reductor que construye su estado inicial en el primer
       * movimiento —`estado ?? partidaNueva()`— y rechaza ese mismo movimiento
       * devuelve algo que NO es idénticamente lo que recibió, porque lo que recibió
       * era `undefined`. La cabecera de `Rechazo`, en `shared/arcade/motor.ts`,
       * cita EXACTAMENTE ese caso como «legítimo y frecuente» y es el motivo por el
       * que `aplicar()` no exige la identidad.
       *
       * Lo que salía de ahí, reproducido contra el árbitro y contra la API: mesa de
       * Riberas recién abierta, movimiento no ofrecido → `cambio` daba cierto, el
       * motivo se tiraba por la rama de «sí pasó algo», la revisión subía de 0 a 1,
       * el diario se quedaba con un movimiento RECHAZADO dentro, y se despertaba a
       * los demás asientos por un cambio que no existía. En la app quedaba peor que
       * antes de esta fase: `seIgnoro` compara revisiones, daba falso, y quien
       * movía no veía NI el motivo nuevo NI la frase de respaldo vieja. O sea que
       * el agujero que esta fase existe para cerrar seguía entero en el PRIMER
       * movimiento de todas las mesas de servidor.
       *
       * La regla, en una línea: EL RECHAZO SE DESCARTA ENTERO —revisión, diario y
       * estado— y se sale por la rama de «no pasó nada», que es la única que lleva
       * el motivo. Y es además donde se IMPONE, en la capa que puede permitírselo,
       * el contrato que el núcleo decidió no imponer: «el estado de un rechazo es
       * el que se recibió». Un reductor que devuelva otro no lo cuela por la puerta
       * de atrás; lo volverá a construir igual en el primer movimiento que sí
       * acepte, porque es puro y determinista.
       */
      const rechazado = jugado.motivo !== null;
      despues = rechazado ? antes : jugado.mesa;
      /*
       * ═══ Y SE PESA EL ESTADO ANTES DE QUEDÁRSELO ═══
       *
       * Aquí y no después de `m.mesa = despues`: si se pasa del tope, lo que hay
       * que hacer es NO quedárselo. Como el reductor es puro, «revertir» es
       * exactamente no asignar — el estado de antes sigue intacto en `antes`.
       *
       * Va dentro del `try` a propósito, para que su excepción salga por el mismo
       * sitio que la del tiempo y por el mismo camino: se guarda el plazo si venció
       * y se relanza. Un arcade que se pasa no puede dejar la mesa a medias.
       *
       * Se pesa `despues` y no `jugado.mesa`: lo que hay que pesar es lo que la
       * mesa se va a quedar. Pesar el estado de un rechazo —que se tira— sería
       * apartar un arcade por algo que nunca llegó a existir.
       */
      if (despues.estado !== antes.estado) pesarElEstado(antes.arcade, despues.estado);
    } catch (error) {
      if (vencio) await guardar(manifiesto, m);
      throw error;
    }

    /*
     * ═══ EL PLAZO SOLO SE REPROGRAMA SI DE VERDAD HA PASADO ALGO ═══
     *
     * Aquí estaba escrito «el vencimiento se reprograma con CADA movimiento
     * aceptado: mover es justo lo que demuestra que sigues ahí». La frase es
     * cierta para quien juega y falsa para la mesa, porque el árbitro acepta el
     * movimiento de CUALQUIERA de los cuatro con la revisión fresca —le toque o
     * no— y también los que el reductor ignora.
     *
     * Lo que salía de ahí, medido contra el servidor levantado: con un plazo de
     * tres segundos, un jugador al que NO le tocaba mandando un movimiento
     * cualquiera una vez por segundo mantuvo el plazo sin vencer DIEZ segundos
     * —cero tics— y en cuanto paró, el primer silencio lo hizo vencer. O sea que
     * una petición por plazo, desde cualquier asiento, apagaba el vencimiento
     * para siempre: al que le tocaba no perdía el turno nunca, y los otros tres
     * se lo prolongaban sin querer con cada movimiento suyo. Con La Larga —
     * veinticuatro horas por turno— eso es un jugador congelando el reloj de los
     * otros cinco indefinidamente, que es justo la garantía que esta fase existe
     * para traer.
     *
     * ═══ Y POR QUÉ «EL ESTADO CAMBIA» TAMPOCO BASTABA ═══
     *
     * Eso cerró el caso «cualquier movimiento» y dejó abierto el caso «cualquier
     * movimiento QUE CAMBIE ALGO», que en un juego con comercio es un movimiento
     * normal y legítimo. En Riberas, `opcionesDeTurno` ofrece aceptar y rechazar
     * un trueque A QUIEN NO LE TOCA, y contestar devuelve un estado nuevo. Medido
     * con cuatro sentados, plazo de cuatro horas y el juego en `jugando`: J1 tiene
     * el turno, propone trueques y se calla; J2 rechaza uno cada tres horas; a las
     * doce horas no había vencido ni uno de los tres plazos que tocaban y
     * `/turno` publicaba `esperandoMs: 12` —doce MILISEGUNDOS— de alguien que
     * llevaba doce horas sin mover. Con el plazo de La Larga y los ocho tratos que
     * se recuerdan, son ocho días de turno prorrogado por un tercero.
     *
     * ═══ LA REGLA DE AHORA: EMPIEZA UN TURNO NUEVO ═══
     *
     * Los dos relojes de la mesa —hasta cuándo hay tiempo y desde cuándo se
     * espera— hablan del TURNO, así que se reinician cuando cambia el turno y no
     * cuando cambia cualquier cosa. Esta capa no deduce el turno: lo lee de la
     * vista, donde el juego lo declara. Ver `empiezaTurnoNuevo`.
     *
     * La consecuencia, dicha en voz alta porque es un cambio de significado: el
     * plazo pasa a ser POR TURNO y no por movimiento. «Veinticuatro horas por
     * turno» —que es como lo dice el §5.4 y como lo rotula la app— significa que
     * el que tiene el turno tiene un día para todo lo suyo: tirar, construir y
     * pasar. Antes, cada cosa que hiciera le regalaba otro día entero, y cada cosa
     * que hicieran los demás también.
     *
     * `cambio` sigue existiendo y sigue siendo «el estado ha cambiado», porque
     * decide otra cosa distinta: si hay algo que guardar y que avisar. Un
     * movimiento que el reductor ignora no es nada para la mesa; uno que cambia el
     * estado sin cambiar el turno sí es algo —hay que guardarlo y hay que
     * repintarlo— pero no empieza ningún turno.
     */
    const cambio = despues.estado !== antes.estado;
    const otroTurno = cambio && empiezaTurnoNuevo(antes.arcade, antes.estado, despues.estado);

    if (!cambio) {
      /*
       * Ni se guarda ni se sube la revisión: para la mesa no ha ocurrido nada.
       * Se devuelve la vista de ahora, que es la verdad —el juego ignoró el
       * movimiento— y con la revisión intacta, que es lo que le dice a la ruta
       * que no hay a quién avisar.
       */
      if (vencio) await guardar(manifiesto, m);
      /*
       * Y AQUÍ VA EL MOTIVO, que es justo el caso para el que existe: el reductor
       * no cambió nada. Antes esta rama devolvía una vista idéntica a la anterior
       * y quien movía sólo podía deducir, por que la revisión no había subido, que
       * algo no se había hecho. Ahora, si el juego dijo por qué, lo dice.
       */
      return vistaDe(m, yo, motivoDelJuego);
    }

    /*
     * LA MESA RECUERDA QUE YA EMPEZO. Va aqui, en `mover` y dentro de `cambio`,
     * porque el hecho que interesa es exacto: UN ASIENTO mando algo y el estado
     * cambio. No vale ponerlo en el tic: el tic de La Ronda CONSTRUYE el estado
     * inicial —medido: cuatro plazos vencidos seguidos dejan `momento: reuniendo`
     * y el estado ya creado—, así que con esa regla una mesa a la que aún no ha
     * llegado nadie se cerraría LA PUERTA a sí misma: nadie podría sentarse.
     * (Cerrar la mesa es otra cosa en este fichero: es `terminada`.)
     * Ver `Mesa.empezada`, donde está el porqué de que tampoco valga mirar el
     * estado ni el diario.
     */
    m.mesa = { ...despues, empezada: true };
    m.ultimoToqueEn = Date.now();
    /*
     * LAS DOS, JUNTAS Y CON LA MISMA CONDICIÓN, que es lo que ya decía esta nota y
     * ahora es verdad: `venceEn` dice hasta cuándo hay tiempo y `turnoDesde` desde
     * cuándo se está esperando, las dos hablan del MISMO turno, y si una se moviera
     * sin la otra la cuenta atrás y la antigüedad hablarían de turnos distintos.
     *
     * Y es la misma razón por la que NO está en `sentarse`: llegar a la mesa sube
     * la revisión y toca la mesa, pero no cambia de quién es el turno.
     */
    if (otroTurno) {
      if (m.plazoMs > 0) m.venceEn = Date.now() + m.plazoMs;
      m.turnoDesde = m.ultimoToqueEn;
    }
    /*
     * Y AHORA, con el plazo ya reprogramado, se mira si se acabó: si se acabó, lo
     * apaga. Al revés —que es como estaba— lo apagaba y `otroTurno` lo volvía a
     * encender. Ver `cerrarSiSeAcabo`.
     */
    cerrarSiSeAcabo(m);
    /*
     * Y AQUÍ NO SE VUELVE A PESAR. Había un `medirTamano(...)` en esta línea que
     * serializaba el estado ENTERO por segunda vez en el mismo movimiento —
     * `pesarElEstado`, unas líneas arriba, ya lo había serializado, anotado el
     * máximo y comprobado el tope—. O sea que el camino más caliente del servidor
     * pagaba dos veces `canonico()` para llenar la misma estadística. Se quita: la
     * báscula del tamaño es ahora una sola, y es la que exige.
     */
    await guardar(manifiesto, m);
    return vistaDe(m, yo);
  });
}

/**
 * CIERRA LA MESA A MANO. Lo pide quien está sentado.
 *
 * ═══ YA NO ES LA ÚNICA FORMA DE QUE UNA MESA SE CIERRE ═══
 *
 * Aquí ponía que cerrar tenía que ser «un acto de quien está en la mesa» porque
 * «fin como función del estado» estaba aplazado y «el estado es opaco y este
 * fichero no puede mirarlo». Lo segundo sigue siendo verdad y lo primero ya no:
 * el motor no MIRA el estado, se lo PREGUNTA al juego —`cerrarSiSeAcabo`, unas
 * líneas arriba—, que es otra cosa y no le da al motor ninguna opinión sobre qué
 * es terminar. Quién ganó lo sigue diciendo el juego y nadie más.
 *
 * Y hacía falta: el peaje se pagó durante tres fases con una mesa que no se
 * cerraba jamás, porque ningún cliente pulsa esto.
 *
 * Esta puerta se queda igualmente, y no por compatibilidad: es la única forma de
 * acabar una partida que el juego NO da por acabada —alguien se fue y los demás
 * no quieren seguir—.
 *
 * Una mesa cerrada NO se borra: se marca `terminada` y se queda hasta que el
 * barrido se la lleve. Borrarla en el acto dejaría a los otros tres con una
 * pantalla que dice «esa mesa no existe» en lugar del resultado, que es
 * literalmente quitarle el final al juego.
 */
export async function cerrar(codigo: string, llave: string | null): Promise<VistaDeMesa> {
  return conLaMesa(codigo, async (m) => {
    const manifiesto = manifiestoDeArcade(m.mesa.arcade);
    const yo = asientoDe(m, llave);
    if (yo === null) {
      throw new MovimientoRechazado(
        'no-estas-sentado',
        'Solo puede cerrar la mesa quien está sentado a ella.',
      );
    }
    if (!m.mesa.terminada) {
      m.mesa = cerrarMesa(m.mesa);
      m.venceEn = null;
      m.ultimoToqueEn = Date.now();
      await guardar(manifiesto, m);
    }
    return vistaDe(m, yo);
  });
}

/**
 * Olvida una mesa del todo: de la memoria, del almacén y de la presencia.
 *
 * La llaman el `DELETE` de `routes/arcade.ts` —quien está sentado tira la mesa— y
 * la apertura cuando la primera mirada falla, para no dejar una mesa huérfana de
 * la que nadie tiene llave. Aquí ponía «no la llama ninguna ruta», que era cierto
 * mientras se escribía y dejó de serlo el mismo día: un comentario que cuenta una
 * historia vieja es peor que ninguno, porque quien lo lea creerá que puede
 * cambiar esta función sin mirar a quién rompe.
 */
export async function olvidarMesa(codigo: string): Promise<void> {
  cargar();
  const m = mesas.get(codigo);
  if (!m) return;
  mesas.delete(codigo);
  pendientesDeGuardar.delete(codigo);
  olvidarPresencia(clavePresencia(codigo));
  /*
   * El fallo al borrar se anota y no sube: la mesa ya está fuera de la memoria y
   * de la partida, y quien pidió olvidarla no puede hacer nada con «el fichero
   * sigue ahí». Lo que sí importa es que salga en el diagnóstico, porque una
   * mesa que vuelve al arrancar es exactamente lo que se creía haber borrado.
   */
  try {
    await almacen.borrar(codigo);
  } catch (error) {
    anotarElFallo(codigo, error);
  }
}

// ---------------------------------------------------------------------------
// Lo pequeño
// ---------------------------------------------------------------------------

/**
 * La llave de presencia de una mesa, PREFIJADA.
 *
 * `mecanicas/presencia.ts` es una tabla plana compartida con las veladas,
 * indexada por identificador de partida. Sin el prefijo, un código de mesa que
 * coincidiera con un identificador de velada haría que `olvidarMesa` de una
 * partida de diez minutos borrara la presencia de una velada de tres horas. Es
 * exactamente la misma cautela que toma `canal/sondeo.ts` con el hub, y por el
 * mismo motivo.
 */
function clavePresencia(codigo: string): string {
  return `arcade:${codigo}`;
}

/** Quién es quien trae esta llave, o `null` si no trae ninguna válida. */
function asientoDe(m: MesaEnCurso, llave: string | null): AsientoId | null {
  if (llave === null) return null;
  const silla = m.sillas.find((s) => s.llave === llave);
  return silla ? silla.id : null;
}

/**
 * Compone lo que se le enseña a alguien. La proyección la hace el juego.
 *
 * `motivo` sólo lo pasa `mover`, y sólo cuando el juego dijo algo. Las demás
 * puertas lo dejan en `null` porque un motivo es de UN intento de UNA persona:
 * ver `VistaDeMesa.motivo`.
 */
function vistaDe(m: MesaEnCurso, yo: AsientoId | null, motivo: string | null = null): VistaDeMesa {
  const ahora = Date.now();
  const vista = vistaDeAsiento(
    m.mesa.arcade,
    m.mesa.estado,
    yo,
    m.sillas.map((s) => ({ asiento: s.id, nombre: s.nombre })),
  );
  return {
    motivo,
    opciones: loQueSePuedeHacer(m.mesa.arcade, vista, yo),
    codigo: m.codigo,
    arcade: m.mesa.arcade,
    rev: m.mesa.rev,
    tic: m.mesa.tic,
    terminada: m.mesa.terminada,
    venceEn: m.venceEn,
    turnoDesde: m.turnoDesde,
    asientos: m.sillas.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      presente: ahora - senalEnMemoria(clavePresencia(m.codigo), s.id) < CONECTADO_MS,
    })),
    yo,
    /*
     * ═══ AQUÍ NO SE MANDA EL ESTADO, SE MANDA LA PROYECCIÓN ═══
     *
     * `vistaDeAsiento` mira el manifiesto: si el juego declara secretos y tiene
     * proyección registrada, recorta; y si declara secretos y NO la tiene, lanza
     * en vez de mandar el estado entero. Esa negativa no debería poder ocurrir
     * nunca en un servidor sano, porque `exigirSecretosTapados()` impide arrancar
     * — pero está, porque un respaldo silencioso que mandara el estado entero
     * convertiría un juego mal instalado en un juego que filtra, y nadie lo
     * vería jamás.
     *
     * ═══ Y DESDE LA FASE 5 SE LE PASA QUIÉN ESTÁ SENTADO ═══
     *
     * Con nombre. Es lo que permite que un juego con mesa escriba «a Ana le toca»
     * en vez de «a aJLFR7ZJ3 le toca»: hasta ahora la proyección sólo recibía un
     * identificador de observador, y Riberas lo rodeaba escribiendo huecos que
     * rellenaba el mueble al pintar. El razonamiento de por qué entra por aquí y
     * no por el contexto del movimiento está en `AsientoNombrado`, y se resume en
     * que un nombre no puede tocar el camino del reductor: si lo tocara, la misma
     * partida reejecutada después de un renombrado daría otro estado.
     *
     * Va la LLAVE PÚBLICA y el nombre, y nunca `s.llave`, que es el secreto con el
     * que un asiento demuestra que es él y que no sale en ninguna vista.
     *
     * Se calcula arriba y no aquí porque `opciones()` la necesita: ver
     * `loQueSePuedeHacer`, que recibe LA VISTA y jamás el estado.
     */
    vista,
  };
}

/**
 * QUÉ PUEDE HACER ESTE ASIENTO AHORA MISMO, preguntado AL JUEGO.
 *
 * ═══ ESTA FUNCIÓN ES EL ÚNICO CONSUMIDOR DE PRODUCCIÓN DE `opciones()` ═══
 *
 * Y sin ella, el hueco que la fase 5 abrió en el alta era una garantía que no
 * existía. El motivo escrito para abrirlo es que «un arcade de FUERA no puede
 * tener opciones genéricas: no hay forma de decirle a la plataforma pregúntame», y
 * eso seguía siendo cierto: `opcionesDeArcade()` y `hayOpciones()` no las llamaba
 * NADIE fuera de un comprobador, `ElTableroEnLinea` pintaba el dibujo ya resuelto
 * que el juego mete en su vista, y un arcade de fuera que registrara `opciones()`
 * y NO se resolviera el tablero se quedaba con la pantalla vacía. El hueco existía
 * en la tabla y no cambiaba nada de lo que un juego nuevo tiene que escribir.
 *
 * ═══ POR QUÉ SE PREGUNTA AQUÍ, EN EL SERVIDOR, Y NO EN LA APP ═══
 *
 * Porque un arcade de fuera NO ESTÁ EN EL BINARIO DEL MÓVIL. La app puede llamar
 * al registro para los cuatro juegos que trae dentro y para ningún otro:
 * `opcionesDeArcade('la-orilla', …)` desde el móvil lanzaría `ArcadeNoInstalado`.
 * El único sitio donde el código del arcade de fuera existe es este proceso, así
 * que la respuesta tiene que viajar con la vista — igual que viaja la proyección,
 * y por exactamente el mismo motivo.
 *
 * ═══ Y POR QUÉ ESTO NO PUEDE TUMBAR UNA LECTURA ═══
 *
 * `opciones()` es código del juego corriendo en el hilo del servidor, así que pasa
 * por el presupuesto como todo lo suyo: si tarda, el arcade queda apartado. Lo que
 * NO puede es llevarse por delante la petición. Una lectura tiene que seguir
 * enseñando el tablero de un arcade apartado —es la promesa escrita en
 * `presupuesto.ts`: «sus mesas dejan de aceptar MOVIMIENTOS»— y una lista de
 * botones vacía es una degradación honrada: la pantalla enseña lo que sepa enseñar
 * sin botones, que es lo que `opcionesDeArcade` ya documenta para el juego que no
 * registra nada.
 *
 * El castigo no se pierde por atrapar: `conPresupuesto` apunta la cuarentena en su
 * `finally`, antes de que esta captura vea nada.
 */
function loQueSePuedeHacer(arcade: ArcadeId, vista: unknown, yo: AsientoId | null): readonly Opcion[] {
  if (!hayOpciones(arcade)) return [];
  try {
    return conPresupuesto(arcade, 'arcade:opciones', () => opcionesDeArcade(arcade, vista, yo));
  } catch (error) {
    /*
     * ═══ SE TRAGA EL FALLO, PERO NO EN SILENCIO ═══
     *
     * Devolver lista vacía es lo correcto —una lectura tiene que seguir enseñando
     * el tablero de un arcade apartado—, y el `catch` mudo NO lo era: cubría
     * también un `TypeError` dentro del `opciones()` de un arcade, sobre todo de
     * fuera. El síntoma es de los peores que hay: los cuatro sentados ven el
     * tablero, la revisión sube, el plazo corre, y ninguno tiene un solo botón.
     * Ni error, ni 500, ni una línea en el registro, ni entrada en el
     * diagnóstico. La mesa parece jugable y no lo es.
     *
     * El presupuesto SÍ se calla, porque ya deja rastro donde toca: `conPresupuesto`
     * apunta la cuarentena y el arcade sale en `GET /arcade/presupuesto`.
     */
    if (!(error instanceof ArcadeFueraDePresupuesto)) {
      console.error(
        `[arcade] El «opciones()» de «${arcade}» ha fallado. Quien mire esta mesa no verá ` +
          'ningún botón, así que la partida parecerá jugable y no lo será:',
        error,
      );
    }
    return [];
  }
}

/** Cuántas mesas hay vivas. Para el diagnóstico y para comprobar que no hay fuga. */
export function mesasVivas(): number {
  cargar();
  return mesas.size;
}
