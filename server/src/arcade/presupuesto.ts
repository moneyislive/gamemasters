/**
 * CUÁNTO CUESTA UN MOVIMIENTO. Se mide, y desde la fase 5 SE EXIGE.
 *
 * ═══ POR QUÉ SE MIDIÓ ANTES DE EXIGIR, Y POR QUÉ NO AL REVÉS ═══
 *
 * Esta cabecera decía «se MIDE, y todavía no se exige», y el motivo era bueno: el
 * tope no se podía elegir el día que hiciera falta. Un número inventado sería o
 * tan alto que no protege o tan bajo que rechaza lo que ya funciona, y en los dos
 * casos alguien lo subiría hasta que se pusiera verde — que es la forma exacta en
 * que un límite deja de significar nada. Así que las fases 2 a 4 dejaron la
 * báscula puesta y anotaron lo que pasaba por ella.
 *
 * Los topes de abajo salen de esa medida, y de ningún otro sitio. Cómo se
 * eligieron está escrito junto a cada uno.
 *
 * ═══ Y POR QUÉ AHORA SÍ SE EXIGE: PORQUE HAY CÓDIGO AJENO ═══
 *
 * Mientras todo el código era de casa, rechazar un movimiento propio por lento
 * era tirar una partida de cuatro personas para castigar a quien escribió el
 * juego. Con `ARCADES_EXTERNOS` eso cambia de naturaleza: un arcade de fuera corre
 * EN EL MISMO PROCESO Y CON LOS MISMOS PERMISOS, y un reductor suyo mal escrito no
 * estropea su partida — se lleva por delante todas las veladas en curso, que no
 * tienen nada que ver con él. Ésta es la comprobación de seguridad del enchufe, y
 * la única que se puede hacer sin sacar el código a otro proceso.
 *
 * ═══ LO QUE ESTO GARANTIZA Y LO QUE NO, DICHO ANTES DE QUE ALGUIEN SE FÍE ═══
 *
 * El diseño pide que un reductor que pase del tope «se rechace ANTES de poder
 * bloquear el bucle de eventos». Hay que ser exacto sobre lo que se ha conseguido,
 * porque la frase admite una lectura que es imposible de cumplir:
 *
 *   · **NO se puede interrumpir el PRIMER movimiento que se pase.** Node atiende
 *     con un solo hilo y no hay forma de abortar código síncrono desde dentro del
 *     mismo hilo: no existe el «tiempo compartido» dentro de un `hacerlo()`. Un
 *     reductor con un bucle infinito cuelga el proceso y ninguna comprobación
 *     escrita en JavaScript lo evita. Para eso haría falta un `worker_thread` o un
 *     proceso aparte, que es otro proyecto y está dicho en el §12 del diseño como
 *     lo que es: aislamiento de verdad, y esto no lo es.
 *   · **Sí se garantiza que ocurra UNA sola vez.** El movimiento que se pasa se
 *     cronometra, el arcade entra en CUARENTENA, y a partir de ahí todo lo suyo se
 *     rechaza ANTES de llamar al reductor — que es literalmente «antes de poder
 *     bloquear el bucle de eventos» para todos los movimientos siguientes.
 *   · **Y se garantiza que no deje rastro.** El movimiento que se pasa lanza, así
 *     que la mesa se queda con el estado de antes: `mover` sólo asigna el estado
 *     nuevo después. El reductor es puro, así que revertir es no asignar.
 *
 * Un arcade en cuarentena NO tumba el servidor y NO afecta a los demás: sus mesas
 * dejan de aceptar movimientos y todo lo que no sea suyo sigue igual. Quien
 * administra lo ve en `/api/arcade/salud` y decide.
 *
 * ═══ Y UN SEGUNDO MOTIVO PARA EL FICHERO, QUE SIGUE VIGENTE ═══
 *
 * Un reductor que empieza a tardar no da ningún error. Se nota como una mesa que
 * va lenta, en un despliegue cualquiera, meses después de que entrara la línea que
 * lo hizo. Con esto, la cifra está a la vista desde el primer día.
 *
 * ═══ LAS DOS COSAS QUE SE MIDEN, Y POR QUÉ SON ÉSAS ═══
 *
 *  1. EL TIEMPO SÍNCRONO del reductor. Node atiende con un solo hilo: un
 *     movimiento que tarde cien milisegundos son cien milisegundos en los que
 *     ninguna otra mesa —ni ninguna velada— recibe nada. No es la latencia de
 *     quien mueve: es la de todos los demás.
 *  2. EL TAMAÑO DEL ESTADO, serializado con `canonico.ts`. Es lo que se escribe
 *     en cada movimiento cuando `tickHz === 0`, lo que se guarda y lo que
 *     acabará viajando. Un estado que crece sin techo —un diario dentro del
 *     estado, un histórico de jugadas— convierte cada movimiento en una
 *     escritura más grande que la anterior, y eso se ve como «la partida se pone
 *     lenta hacia el final», que nadie sabe reproducir en la primera baza.
 *
 * ═══ EL TAMAÑO SE MIDE SIEMPRE, Y AQUÍ ANTES DECÍA LO CONTRARIO ═══
 *
 * Había dos básculas de tamaño: `pesarElEstado`, que mide y EXIGE, y una
 * `medirTamano` que sólo anotaba y que además muestreaba uno de cada sesenta
 * cuando el arcade tenía reloj. El argumento del muestreo era bueno para lo que
 * describía —serializar en cada fotograma de un bucle a 60 Hz duplicaría su
 * coste— y no describía a nadie: en el servidor no hay ningún bucle de
 * fotogramas, porque los dos arcades con reloj son `sede: 'dispositivo'` y corren
 * en el móvil. Lo que sí había, y era real, es que el camino del TIC de una mesa
 * usaba la báscula que no exige, así que el segundo tope tenía una puerta trasera
 * entera justo por donde la lista de abajo dice que más falta hacía cubrir.
 *
 * Ahora hay una sola báscula de tamaño y es la que exige. El coste está acotado
 * por el propio tope —serializar medio megabyte es del orden de un milisegundo, y
 * por encima de eso la función ya lanza— y sólo se paga cuando el estado CAMBIA:
 * un movimiento o un tic que devuelve el mismo objeto no se vuelve a serializar.
 *
 * ═══ ESTE FICHERO NO SABE QUÉ ES UNA MESA ═══
 *
 * No importa `mesas.ts` ni el árbitro. Recibe un identificador de arcade, un
 * nombre de movimiento y una función, y devuelve lo que devuelva la función. Que
 * sea así es lo que permitirá que en la fase 3 lo llame también el bucle de
 * fotogramas del arcade de un jugador, que no tiene mesa ninguna.
 */
import { canonico, NoCanonizable } from '../../../shared/mecanicas/canonico';
import type { ArcadeId } from '../../../shared/arcade';

/**
 * Lo medido de un arcade, acumulado desde que arrancó el proceso.
 *
 * Se guardan el máximo y la media y no la lista entera de medidas, por lo mismo
 * que la presencia no va a la base de datos: esto tiene que costar cero. Una
 * lista crecería una entrada por movimiento y por mesa, o sea sin techo, y la
 * primera vez que alguien lo notara sería porque Render mató la instancia.
 */
export interface MedidaDeArcade {
  arcade: ArcadeId;
  /** Cuántos movimientos han pasado por aquí. */
  movimientos: number;
  /** El peor tiempo síncrono visto, en milisegundos. */
  msPeor: number;
  /** La suma, para poder dar la media sin guardar la lista. */
  msTotal: number;
  /** Cuál fue el movimiento que peor se portó. Sin esto, el máximo no lleva a ningún sitio. */
  peorMovimiento: string;
  /** Cuántas veces se ha llegado a medir el tamaño. */
  tamanosMedidos: number;
  /** El estado más grande visto, en caracteres de la forma canónica. */
  bytesPeor: number;
}

/**
 * La tabla, por arcade. `Map` y no objeto, para no tener que pensar nunca en
 * `for…in` ni en claves heredadas.
 */
const medidas = new Map<ArcadeId, MedidaDeArcade>();

function deArcade(arcade: ArcadeId): MedidaDeArcade {
  const ya = medidas.get(arcade);
  if (ya) return ya;
  const nueva: MedidaDeArcade = {
    arcade,
    movimientos: 0,
    msPeor: 0,
    msTotal: 0,
    peorMovimiento: '',
    tamanosMedidos: 0,
    bytesPeor: 0,
  };
  medidas.set(arcade, nueva);
  return nueva;
}

/**
 * Cronometra un movimiento y devuelve lo que devuelva.
 *
 * ═══ POR QUÉ ENVUELVE EN VEZ DE DEVOLVER UN CRONÓMETRO ═══
 *
 * Con un `empezar()` y un `terminar()` sueltos, la medida se pierde en cuanto el
 * código de en medio lanza —y el movimiento que lanza es justamente el
 * interesante—. Envolviendo, el `finally` cierra el cronómetro pase lo que pase,
 * y quien llama no tiene que acordarse de nada.
 *
 * `hrtime.bigint` y no `Date.now()`: lo que se mide son unidades de un
 * milisegundo o menos, y `Date.now()` tiene la resolución justa para dar cero
 * siempre y hacer creer que esto no cuesta nada.
 */
export function medirMovimiento<T>(arcade: ArcadeId, tipo: string, hacerlo: () => T): T {
  const desde = process.hrtime.bigint();
  try {
    return hacerlo();
  } finally {
    anotarTiempo(arcade, tipo, Number(process.hrtime.bigint() - desde) / 1_000_000);
  }
}

/**
 * Apunta un tiempo en la báscula. Sacado aparte en la fase 5, y no por gusto:
 * `conPresupuesto` mide exactamente lo mismo y con dos copias la media y el peor
 * caso saldrían distintos según por qué puerta hubiera entrado el movimiento.
 */
function anotarTiempo(arcade: ArcadeId, tipo: string, ms: number): void {
  const m = deArcade(arcade);
  m.movimientos++;
  m.msTotal += ms;
  if (ms > m.msPeor) {
    m.msPeor = ms;
    /*
     * SE RECORTA, aunque la puerta ya lo acote. `peorMovimiento` sale por
     * `/api/arcade/presupuesto`, que no pide credencial, así que esto es texto
     * que alguien de fuera elige y este servidor devuelve. Hoy la ruta de
     * movimientos corta en `TOPE_TIPO_CARACTERES` y con eso bastaría; el recorte
     * está aquí ADEMÁS porque `conPresupuesto` no es de la ruta: el día que lo
     * llame otro camino sin acotar, el eco vuelve solo y nadie lo vería.
     */
    m.peorMovimiento = tipo.slice(0, TOPE_TIPO_CARACTERES);
  }
}

/*
 * ═══ AQUÍ VIVÍA `medirTamano`, LA BÁSCULA QUE NO EXIGÍA, Y SE HA BORRADO ═══
 *
 * Anotaba el tamaño sin comprobar el tope y muestreaba uno de cada sesenta cuando
 * el arcade tenía reloj. La llamaban dos sitios de `mesas.ts`: el camino del TIC
 * —donde era el único pesaje, o sea el agujero— y el del movimiento, DESPUÉS de
 * que `pesarElEstado` ya hubiera serializado el mismo estado, o sea pagando
 * `canonico()` dos veces en el camino más caliente del servidor.
 *
 * Se queda una sola báscula de tamaño, `pesarElEstado`, y las dos llamadas pasan
 * por ella. Queda escrito aquí y no sólo en el diff porque el argumento del
 * muestreo era razonable de leer y podría volver: el día que exista un bucle de
 * fotogramas EN EL SERVIDOR habrá que volver a plantearlo, y entonces la respuesta
 * no puede ser una báscula que no exige, sino un tope que sepa mirar sin
 * serializar.
 */

/** Lo medido hasta ahora, para quien quiera mirarlo. */
export function loMedido(): MedidaDeArcade[] {
  return [...medidas.values()].map((m) => ({ ...m }));
}

/** Lo medido de un arcade, o nada si por ahí no ha pasado ningún movimiento. */
export function loMedidoDe(arcade: ArcadeId): MedidaDeArcade | undefined {
  const m = medidas.get(arcade);
  return m ? { ...m } : undefined;
}

/** Borra las medidas. Para las pruebas, que necesitan empezar de cero. */
export function olvidarLoMedido(): void {
  medidas.clear();
  cuarentena.clear();
}

// ---------------------------------------------------------------------------
// LA EXIGENCIA. De aquí abajo es la fase 5.
// ---------------------------------------------------------------------------

/**
 * CUÁNTO PUEDE TARDAR UN MOVIMIENTO, en milisegundos de reloj síncrono.
 *
 * ═══ DE DÓNDE SALE ESTE NÚMERO ═══
 *
 * De la báscula, que lleva puesta desde la fase 2 justamente para esto. Lo que se
 * mide en los cuatro juegos de la casa está tres órdenes de magnitud por debajo:
 * el movimiento más caro de todos —repartir el delta de Riberas, que baraja
 * diecinueve islas, dieciocho números y calcula noventa aristas— vive en décimas
 * de milisegundo, y el tic de El Arcade a 60 Hz en centésimas.
 *
 * 50 ms es, entonces, un número que ningún juego escrito con cabeza roza NUNCA y
 * que al mismo tiempo es un daño tolerable si alguien lo alcanza: cincuenta
 * milisegundos es lo que tarda una petición normal contra la base de datos, así
 * que una vez —y sólo va a ser una— nadie lo nota.
 *
 * Lo que NO se ha hecho es ajustarlo al peor caso medido con un margen: eso ata el
 * tope al juego más caro que exista hoy, y el día que entre uno más caro alguien
 * subiría el número en vez de mirar por qué. Un tope que se mueve con el
 * contenido no es un tope.
 */
export const TOPE_MS = 50;

/**
 * CUÁNTO PUEDE OCUPAR UN ESTADO, en caracteres de su forma canónica.
 *
 * ═══ POR QUÉ ESTO ES UN LÍMITE DISTINTO Y HACEN FALTA LOS DOS ═══
 *
 * El tiempo protege el bucle de eventos; el tamaño protege el disco y la red. Son
 * dos daños distintos y con dos formas distintas: un reductor lento se nota en el
 * acto, y un estado que crece sin techo —un diario dentro del estado, un histórico
 * de jugadas— no se nota nunca hasta que el disco se llena o Render mata la
 * instancia. Ya está medido en este mismo repositorio con las veladas: dos mil
 * movimientos de un tipo inexistente dejaron el diario de una mesa en 1,2 MB.
 *
 * 512 kB es cómodo por arriba para todo lo que hay —el estado más grande de los
 * cuatro juegos no llega a 30 kB con la partida entera desplegada— y sigue siendo
 * pequeño comparado con lo que le cuesta a una instancia guardar y mandar eso en
 * cada movimiento a cuatro móviles.
 */
export const TOPE_BYTES = 512 * 1024;

/**
 * LO QUE PUEDE MANDAR QUIEN LLAMA, y por qué esto vive al lado de los otros dos.
 *
 * ═══ EL AGUJERO QUE ESTOS DOS TOPES CIERRAN ═══
 *
 * Los dos topes de arriba miden EL TRABAJO DEL ARCADE y castigan al arcade. Eso
 * es correcto mientras el trabajo dependa sólo del reductor. Pero el §5 bis puso
 * en el camino medido algo que NO elige el arcade: el portillo llama a
 * `canonico({ tipo, carga })` sobre el movimiento que llega POR LA RED, para
 * comprobar que `opciones()` lo había ofrecido.
 *
 * Con eso, quien manda el movimiento elige cuánto tarda la medición. Medido: una
 * carga de 240 kB con mil niveles de anidamiento tarda 152 ms en canonizarse,
 * tres veces el tope. La cuarentena se apuntaba contra el ARCADE —no contra
 * quien la provocó— y es por juego, permanente y sin puerta para levantarla, así
 * que una sola petición sin cuenta ni código dejaba a Riberas sin poder aceptar
 * un movimiento en TODAS sus mesas hasta reiniciar el proceso. Y el diagnóstico
 * público lo remataba acusando al juego de la casa con el texto del atacante.
 *
 * La cuarentena NO se toca: su permanencia está razonada donde se declara y es
 * buena. Lo que se corta es el otro extremo de la cadena — que el sobre no pueda
 * ser grande.
 *
 * ═══ POR QUÉ NO BASTABA EL TOPE DE CUERPO DE EXPRESS ═══
 *
 * Porque son 256 kB, y son 256 kB por una buena razón: la misma puerta acepta
 * fotos de invitados. Un tope de cuerpo mide el sobre entero de cualquier ruta;
 * esto mide lo que entra en el reductor de un juego, que es otra cosa y mucho
 * más pequeña.
 *
 * ═══ LOS NÚMEROS, Y POR QUÉ SON HOLGADOS ═══
 *
 * Un movimiento real de esta casa es `{ vertice: 'v:-1,-1|0,-2|0,-1' }` o
 * `{ carta: 'oros-7' }`: decenas de bytes. Ocho kilobytes son tres órdenes de
 * magnitud de sitio para un arcade de fuera que quiera mandar algo compuesto.
 *
 * Y el número está elegido MIDIENDO EL PEOR CASO QUE DEJA PASAR, que es lo que de
 * verdad decide si el tope sirve. Lo caro de `canonico` no es el tamaño sino la
 * PROFUNDIDAD, así que el peor sobre de ocho kilobytes no es uno lleno de texto
 * sino uno anidado hasta el fondo. Medido en esta máquina:
 *
 *   · el ataque, 240 kB anidados ......... 167,7 ms — tres veces el tope. Parado.
 *   · un movimiento de verdad, 31 B ........ 0,1 ms
 *   · ocho kilobytes PLANOS ................ 0,0 ms
 *   · ocho kilobytes ANIDADOS A TOPE ....... 7,8 ms  ← el peor que entra hoy
 *
 * O sea que el sobre puede gastar como mucho 7,8 de los 50 ms, y le deja al
 * reductor los otros 42 — que son dos órdenes de magnitud más de lo que cuesta el
 * movimiento más caro de la casa. Ése es el margen que hace que la cuarentena
 * vuelva a significar lo que decía significar: que el REDUCTOR va lento.
 *
 * Si algún día hiciera falta más sitio para la carga, lo que hay que subir NO es
 * este número a ciegas: hay que volver a medir el sobre anidado, porque es esa
 * curva y no la del tamaño la que se acerca al tope.
 *
 * Y `tipo` se acota aparte porque no es sólo coste: viaja al diagnóstico público
 * como `peorMovimiento`, así que sin tope es un sitio donde alguien de fuera
 * escribe un cuarto de megabyte que luego sirve este servidor.
 *
 * Los dos SE PUBLICAN en `/api/arcade/presupuesto` por lo mismo que los otros: un
 * límite que sólo conoce quien lo aplica no es un contrato.
 */
export const TOPE_TIPO_CARACTERES = 64;
export const TOPE_CARGA_BYTES = 8 * 1024;

/**
 * POR QUÉ NO CABE UN SOBRE. Unión cerrada, como los demás motivos de la casa: quien lo traduce a
 * HTTP no compara cadenas, y un cambio de redacción no se lleva por delante la traducción.
 */
export type PorQueNoCabe = 'tipo-sin-texto' | 'tipo-largo' | 'carga-no-serializable' | 'carga-grande';

/**
 * UN MOVIMIENTO QUE NO CABE EN LOS TOPES DEL SOBRE. 400: está mal hecho y reintentarlo igual no lo
 * arregla. No es una cuarentena ni un rechazo del juego: el juego ni se ha enterado.
 */
export class MovimientoDesmedido extends Error {
  constructor(
    public readonly motivo: PorQueNoCabe,
    detalle: string,
  ) {
    super(detalle);
    this.name = 'MovimientoDesmedido';
  }
}

/**
 * LOS DOS TOPES DEL SOBRE, EXIGIDOS DONDE ENTRA EL MOVIMIENTO Y NO SÓLO EN LA RUTA.
 *
 * ═══ EL AGUJERO: DOS TOPES ESCRITOS AQUÍ Y EXIGIDOS EN OTRO SITIO ═══
 *
 * `TOPE_TIPO_CARACTERES` y `TOPE_CARGA_BYTES` se exigían en `routes/arcade.ts` —la ruta de
 * movimientos— y en `repeticiones.ts` —la de récords—, y NO en `mesas.ts` ni en `arbitro.ts`, que
 * tenían cero referencias. O sea que eran topes de dos puertas y no de la mesa: cualquier puerta
 * nueva que llame a `mover()` —el canal de Boots on Board que viene, un guion, un arcade de fuera
 * que abra otra ruta— los salta enteros, y lo que salta es exactamente lo que este fichero dice
 * que la cuarentena NO puede pagar: un sobre que elige quien llama, cronometrado a cuenta del
 * juego. `docs/BOOTS-ON-BOARD.md` §5.1.
 *
 * Así que se exigen AQUÍ, llamados desde `mover()` ANTES de coger el candado y antes de ejecutar
 * nada del juego, y la ruta se queda con los suyos: defensa en dos capas, y el 400 temprano.
 *
 * ═══ CON `canonico` Y NO CON `JSON.stringify`, MEDIDO ═══
 *
 * `JSON.stringify` revienta con un `RangeError` a partir de unos mil quinientos niveles de
 * anidamiento, que son unos tres mil bytes: por DEBAJO del tope. Pesar con lo que se rompe es no
 * pesar —el error no es un 400, es lo que haya encima—, y además lo caro no es el tamaño sino la
 * hondura. `canonico` trae su cota de sesenta y cuatro niveles desde el sello de `6924643` y
 * contesta `NoCanonizable`, que aquí se convierte en un motivo. Es la misma forma que ya usa
 * `repeticiones.ts` para la otra puerta, y pesa lo que de verdad se guarda: la forma canónica, en
 * bytes UTF-8 y no en caracteres —cinco mil «ñ» son 5.002 caracteres de JSON y 10.002 bytes, y la
 * ruta, que cuenta caracteres, los deja pasar—.
 *
 * ═══ Y FUERA DEL CRONÓMETRO, QUE ES LA MITAD DE LA GARANTÍA ═══
 *
 * Esto no pasa por `conPresupuesto`. Si pasara, el trabajo de medir el sobre de quien llama se le
 * cobraría al juego —que es el fallo entero que estos dos topes existen para cerrar— y un sobre
 * gordo podría apartar a un arcade inocente. Un rechazo de aquí no toca la báscula, ni la
 * cuarentena, ni la mesa: lo comprueba `verify:presupuesto`.
 */
export function exigirLosTopesDelSobre(movimiento: { readonly tipo: unknown; readonly carga?: unknown }): void {
  const { tipo, carga } = movimiento;
  if (typeof tipo !== 'string' || tipo.length === 0) {
    throw new MovimientoDesmedido(
      'tipo-sin-texto',
      'Un movimiento tiene que traer `tipo`: una cadena con texto que diga qué clase de movimiento es.',
    );
  }
  if (tipo.length > TOPE_TIPO_CARACTERES) {
    throw new MovimientoDesmedido(
      'tipo-largo',
      `El \`tipo\` de un movimiento no puede pasar de ${String(TOPE_TIPO_CARACTERES)} caracteres, y éste ` +
        `trae ${String(tipo.length)}. El tipo es vocabulario del juego, no un sitio donde meter datos.`,
    );
  }
  if (carga === undefined) return;
  /*
   * Dos atajos que no cuestan nada y ahorran serializar lo que ya se sabe que no cabe: la forma
   * canónica de una cadena mide al menos sus caracteres más las dos comillas, y la de una lista al
   * menos un carácter por elemento. Sólo sirven a quien llame a `mover()` sin pasar por un
   * analizador con límite de cuerpo; por la ruta, express ya cortó en 256 kB.
   */
  const alMenos =
    typeof carga === 'string' ? carga.length + 2 : Array.isArray(carga) ? carga.length * 2 + 1 : 0;
  if (alMenos > TOPE_CARGA_BYTES) {
    throw new MovimientoDesmedido(
      'carga-grande',
      `La \`carga\` de un movimiento no puede pasar de ${String(TOPE_CARGA_BYTES)} bytes en su forma ` +
        `canónica, y ésta ocupa al menos ${String(alMenos)}.`,
    );
  }
  let escrita: string;
  try {
    escrita = canonico(carga);
  } catch (error) {
    if (!(error instanceof NoCanonizable)) throw error;
    throw new MovimientoDesmedido(
      'carga-no-serializable',
      `La \`carga\` de ese movimiento no sobrevive a la serialización canónica: ${error.message}`,
    );
  }
  const pesa = Buffer.byteLength(escrita, 'utf8');
  if (pesa > TOPE_CARGA_BYTES) {
    throw new MovimientoDesmedido(
      'carga-grande',
      `La \`carga\` de un movimiento no puede pasar de ${String(TOPE_CARGA_BYTES)} bytes en su forma ` +
        `canónica, y ésta ocupa ${String(pesa)}.`,
    );
  }
}

/**
 * LOS ARCADES CASTIGADOS, con el porqué escrito.
 *
 * ═══ POR QUÉ LA CUARENTENA ES POR ARCADE Y NO POR MESA ═══
 *
 * Porque lo que se ha portado mal es el REDUCTOR, y el reductor es del arcade. Una
 * cuarentena por mesa dejaría que el mismo juego volviera a colgar el proceso
 * abriendo otra mesa, que es exactamente el ataque que esto existe para parar —y
 * abrir una mesa no cuesta nada.
 *
 * Y no se persiste: se pierde al reiniciar el proceso, a propósito. Un
 * despliegue nuevo trae código nuevo, y castigar a un arcade por lo que hizo su
 * versión anterior obligaría a tener una puerta para levantarle el castigo, que es
 * una puerta más de la que nadie se acuerda. Si el arcade sigue mal, se vuelve a
 * caer en el primer movimiento y vuelve a entrar. Si lo arreglaron, no.
 */
const cuarentena = new Map<ArcadeId, string>();

/**
 * Este arcade se ha pasado del presupuesto y está apartado.
 *
 * Lleva el motivo entero dentro del mensaje porque quien lo lea puede ser tres
 * cosas —el registro del servidor, la respuesta a quien movía, o el comprobador—
 * y ninguna de las tres tiene otro sitio donde mirar.
 */
export class ArcadeFueraDePresupuesto extends Error {
  constructor(
    public readonly arcade: ArcadeId,
    public readonly porque: string,
  ) {
    super(
      `El arcade «${arcade}» se ha pasado del presupuesto y está apartado: ${porque}\n` +
        'Corre en el mismo proceso que todo lo demás, así que un reductor que bloquee el bucle de ' +
        'eventos deja sin servicio a las veladas en curso. Sus mesas no aceptan movimientos hasta ' +
        'que el proceso se reinicie con una versión arreglada.',
    );
    this.name = 'ArcadeFueraDePresupuesto';
  }
}

/** ¿Está apartado este arcade? Devuelve el motivo, o `null`. */
export function enCuarentena(arcade: ArcadeId): string | null {
  return cuarentena.get(arcade) ?? null;
}

/** Todos los apartados, para la ruta de salud y para el comprobador. */
export function losApartados(): Array<{ arcade: ArcadeId; porque: string }> {
  return [...cuarentena.entries()].map(([arcade, porque]) => ({ arcade, porque }));
}

/*
 * ═══ AQUÍ VIVÍA `levantarLaCuarentena`, Y SE HA BORRADO ═══
 *
 * Su comentario decía «SÓLO para las pruebas» y razonaba, con acierto, que no hubiera
 * ninguna ruta que la llamara: «una puerta para desactivar el castigo desde fuera es una
 * puerta para desactivar la comprobación». Lo que no decía es que TAMPOCO la llamaban las
 * pruebas: buscada en el árbol entero, la única aparición era su propia definición. Las
 * pruebas usan `olvidarLoMedido()`, que ya hace `cuarentena.clear()` de paso.
 *
 * O sea que era una función exportada, muerta, cuyo comentario le atribuía un uso que no
 * tenía — y encima era exactamente la puerta que ese mismo comentario prohíbe: lo único que
 * le faltaba para ser la ruta que alguien pidiera era que alguien la importara.
 *
 * Y alguien la pidió: `docs/BOOTS-ON-BOARD.md` §5 llevaba escrito «dar salida a la
 * cuarentena: `levantarLaCuarentena` existe y ninguna ruta la llama». Esto contesta a eso —
 * no se le pone la ruta: se le quita la función. La salida sigue siendo reiniciar el
 * proceso, que es lo que hay que hacer de todas formas cuando el código cambia.
 */

/**
 * SE RECHAZA ANTES DE LLAMAR AL REDUCTOR. Ésta es la línea que de verdad protege.
 *
 * Lanza si el arcade está apartado. Quien la llama tiene que hacerlo ANTES de
 * ejecutar nada del juego: la garantía entera del fichero es que un arcade que ya
 * se pasó una vez no vuelve a entrar en el hilo.
 */
export function exigirPresupuesto(arcade: ArcadeId): void {
  const porque = cuarentena.get(arcade);
  if (porque !== undefined) throw new ArcadeFueraDePresupuesto(arcade, porque);
}

/**
 * MIDE Y EXIGE: la puerta por la que pasa un movimiento de una mesa.
 *
 * ═══ POR QUÉ ES OTRA FUNCIÓN Y NO UN ARGUMENTO DE `medirMovimiento` ═══
 *
 * Porque hay un llamador que tiene que seguir midiendo SIN que se le exija, y
 * confundirlos rompería una función que hoy va bien: `repeticiones.ts` cronometra
 * la reejecución de una PARTIDA ENTERA en una sola llamada, para verificar un
 * récord. Eso son cientos de movimientos y pasarse de 50 ms es lo normal; con un
 * tope por movimiento aplicado ahí, el primer récord honrado que llegara pondría
 * su arcade en cuarentena.
 *
 * Con dos nombres, cuál se usa en cada sitio es una decisión visible en el diff.
 * Con una bandera, es un argumento que alguien copia y pega.
 *
 * Y la reejecución no se queda sin protección: su límite es el TAMAÑO de la
 * repetición que se sube, que `repeticiones.ts` comprueba antes de tocarla.
 *
 * ═══ EL ORDEN DE LAS TRES COSAS, QUE ES TODO ═══
 *
 *  1. Se comprueba la cuarentena ANTES de llamar. Si ya se pasó una vez, no
 *     vuelve a entrar en el hilo.
 *  2. Se ejecuta y se cronometra.
 *  3. Si tardó más del tope, se apunta la cuarentena Y SE LANZA, para que quien
 *     llama descarte el resultado. El estado que se calculó se tira: el reductor
 *     es puro, así que tirarlo es no asignarlo, y la mesa se queda exactamente
 *     como estaba.
 */
export function conPresupuesto<T>(arcade: ArcadeId, tipo: string, hacerlo: () => T): T {
  exigirPresupuesto(arcade);
  const desde = process.hrtime.bigint();
  let salida: T;
  try {
    salida = hacerlo();
  } finally {
    const ms = Number(process.hrtime.bigint() - desde) / 1_000_000;
    /* Antes de anotar: `anotarTiempo` mete esta muestra en la cuenta y en el peor. */
    const hasta = deArcade(arcade);
    const antesDeEsta = { movimientos: hasta.movimientos, msTotal: hasta.msTotal };
    anotarTiempo(arcade, tipo, ms);
    if (ms > TOPE_MS) {
      /*
       * ═══ EL MOTIVO LLEVA LA ESTADÍSTICA, PORQUE UNA MUESTRA NO DISTINGUE DOS COSAS ═══
       *
       * Esto se decide con UN cronómetro de reloj de pared, y el castigo es permanente. Se ha
       * medido si eso es frágil y sale que no: reejecutando el registro congelado del Burgo
       * —el juego más caro— el peor movimiento cuesta 1,21 ms contra un tope de 50, doce
       * hilos quemando CPU no lo empeoran (0,62 ms), y ni siquiera una recolección COMPLETA
       * forzada dentro del cronómetro, con 138 MB de montón, pasa de 13,78 ms. Cuarenta veces
       * de margen, y por eso el disparo de una muestra se queda como está.
       *
       * Lo que NO se puede medir desde aquí es el contenedor de Render estrangulado por
       * cuota, que sí puede parar el proceso cientos de milisegundos y es indistinguible de
       * un reductor malo… mirando una sola cifra. Mirando la estadística, no: un reductor
       * malo llega con una media alta, y un estrangulamiento con dos mil movimientos a
       * centésimas y un solo pico.
       *
       * Esa estadística YA se guardaba —`anotarTiempo` la lleva desde el principio— y no
       * salía en el motivo. Ahora sí, porque el motivo es lo único que lee quien se encuentra
       * el juego apartado: va en el registro, en la respuesta a quien movía y en
       * `/api/arcade/presupuesto`.
       */
      const media =
        antesDeEsta.movimientos > 0 ? antesDeEsta.msTotal / antesDeEsta.movimientos : 0;
      cuarentena.set(
        arcade,
        `el movimiento «${tipo}» tardó ${ms.toFixed(1)} ms de reloj síncrono y el tope son ` +
          `${String(TOPE_MS)} ms. De los ${String(antesDeEsta.movimientos)} movimientos medidos ` +
          `antes de éste, la media era ${media.toFixed(2)} ms: si esa media es diminuta, esto ` +
          'es un pico de la máquina —una recolección, el contenedor estrangulado— y no un ' +
          'reductor lento; si es alta, el lento es el juego.',
      );
    }
  }
  exigirPresupuesto(arcade);
  return salida;
}

/**
 * PESA EL ESTADO NUEVO Y EXIGE. Se llama con el estado ya calculado y sin guardar.
 *
 * ═══ POR QUÉ ÉSTE SE MIDE SIEMPRE Y `medirTamano` NO ═══
 *
 * `medirTamano` muestrea uno de cada sesenta cuando el arcade tiene reloj, porque
 * serializar en cada fotograma para llenar una estadística duplicaría el coste del
 * bucle. Aquí no se puede muestrear: un tope que sólo mira uno de cada sesenta es
 * un tope que se salta cincuenta y nueve de cada sesenta veces, y quien quiera
 * llenar el disco sólo tiene que crecer despacio.
 *
 * El coste está acotado por el propio tope: serializar medio megabyte es del orden
 * de un milisegundo, y por encima de eso la función ya va a lanzar.
 *
 * Un estado que NO se puede serializar no cuenta como infinito: se deja pasar, y
 * esa decisión merece la línea. `canonico` lanza ante lo no serializable —una
 * función, un `Infinity`, un ciclo— y eso es un problema del juego que
 * `oro:arcade` y `verify:determinismo` cazan de frente, con un mensaje que dice
 * qué pasa. Convertirlo aquí en una cuarentena diría «se pasó de tamaño», que es
 * mentira, y mandaría a quien lo lea a buscar en el sitio equivocado.
 */
export function pesarElEstado(arcade: ArcadeId, estado: unknown): void {
  exigirPresupuesto(arcade);
  let bytes: number;
  try {
    bytes = canonico(estado).length;
  } catch {
    return;
  }
  const m = deArcade(arcade);
  m.tamanosMedidos++;
  if (bytes > m.bytesPeor) m.bytesPeor = bytes;
  if (bytes > TOPE_BYTES) {
    cuarentena.set(
      arcade,
      `su estado ocupa ${String(bytes)} caracteres en forma canónica y el tope son ${String(TOPE_BYTES)}`,
    );
    throw new ArcadeFueraDePresupuesto(arcade, cuarentena.get(arcade) as string);
  }
}
