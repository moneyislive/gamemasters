/**
 * «LA RONDA»: el segundo arcade, y el primero que necesita una mesa.
 *
 * Cuatro personas, cada una con cinco cartas QUE SOLO VE ELLA. Por turnos, cada
 * cual echa una carta boca arriba; cuando las cuatro están en la mesa, la más
 * alta se lleva la baza. Cinco bazas y se acabó: gana quien más se haya llevado.
 * Si a alguien se le pasa el plazo, la autoridad mete un tic y este reductor le
 * echa la carta más baja de la mano — no se puede bloquear una mesa por no jugar.
 *
 * ═══ POR QUÉ ESTE JUEGO Y POR QUÉ AHORA, QUE ES LA MITAD DEL PLAN ═══
 *
 * Va el segundo por la misma razón por la que La Frente fue el primero: con solo
 * tres juegos-prueba, el concepto de MESA lo habría estrenado el tablero
 * hexagonal, y entonces la mesa habría salido con forma de hexagonal — turnos en
 * serpentina, comercio, negociación entre dos de los cuales uno no tiene el
 * turno. Todo eso es riqueza de UN juego, y un motor que la conoce está a medida
 * de él.
 *
 * Así que este juego es deliberadamente pobre EN REGLAS y deliberadamente exacto
 * EN LO QUE LA FASE TIENE QUE PROBAR. Tres propiedades, y ninguna es adorno:
 *
 *   · MANO OCULTA DE VERDAD. `secretos: true`, proyección que recorta y
 *     `loSecreto` que dice qué recorta. Sin las tres, el arranque falla.
 *   · POR TURNOS. De quién es el turno es un CAMPO DE ESTE ESTADO y el motor no
 *     lo sabe. El árbitro valida quién manda el movimiento y si su revisión es
 *     fresca; que además le toque lo decide este fichero, aquí abajo.
 *   · TERMINA. Veinte cartas, veinte movimientos, `momento: 'terminada'`. Una
 *     mesa que no termina no prueba nada sobre cerrar mesas.
 *
 * ═══ DÓNDE ESTÁ EL PLAZO, Y POR QUÉ NO ESTÁ AQUÍ ═══
 *
 * Éste es el punto donde la fase 2 tuvo que decidir algo que el diseño nombra y
 * no cierra, así que queda escrito entero.
 *
 * `tickHz: 0`. El §6 del diseño lo pone por escrito —«Riberas, La Ronda y La
 * Larga»— y de ahí sale la persistencia síncrona. Pero con `tickHz: 0`,
 * `ticsPara(45, 0)` es INFINITO por contrato (ver `../reloj.ts`), o sea que un
 * plazo contado en segundos no vence NUNCA: a este juego no le llega ningún tic
 * por su cuenta.
 *
 * Y el plazo no se puede guardar aquí en milisegundos de reloj de pared, porque
 * un reductor puro no sabe qué hora es y no debe saberlo: es lo que hace que la
 * misma partida reejecutada dentro de un año dé exactamente lo mismo.
 *
 * De modo que EL PLAZO DE PARED VIVE EN LA MESA, que es la autoridad, y lo que
 * vive aquí es LA REGLA de qué pasa cuando vence: `arcade:tic` significa «se le
 * ha pasado el turno a quien lo tenía». El reparto queda así:
 *
 *   · La mesa sabe QUÉ HORA ES y cuánto se espera. Es lo único que sabe.
 *   · Este fichero sabe QUÉ SIGNIFICA que se acabe la espera. Es lo único que
 *     necesita saber, y es una regla de juego que se reejecuta con el diario.
 *
 * La alternativa —meter el instante de pared en el estado— habría hecho que dos
 * reejecuciones de la misma partida dieran estados distintos, que es exactamente
 * lo que la pureza del reductor se compró para evitar. Está contado también en
 * `server/src/arcade/mesas.ts`, que es la otra mitad.
 *
 * ═══ LAS CARTAS SON CADENAS DISTINGUIBLES, Y ESO NO ES ESTILO ═══
 *
 * La comprobación que cierra el agujero de los secretos es de APARICIÓN DE
 * VALORES: `verify:mesa` llama a `loSecreto(estado)` y busca esos valores dentro
 * de lo que se le manda a cada asiento. Una carta representada como el número 7
 * «aparecería» en la vista de cualquiera por pura casualidad —hay contadores de
 * bazas, de manos y de cartas restantes, todos números de una cifra— y el
 * comprobador daría rojo sin que pasara nada. Un comprobador que grita cuando no
 * pasa nada acaba desactivado, y quien lo desactive lo hará debilitándolo.
 *
 * La lección viene de La Frente, que la aprendió midiendo: su cabecera cuenta
 * que declarar la semilla y el acumulador DESNUDOS daba rojo en el cien por cien
 * de las partidas recién abiertas. Aquí una carta es `'espadas-10'`, que no
 * coincide con nada por casualidad, y el azar entra entero como objeto.
 *
 * Lo que se pierde, dicho para que no parezca gratis: una filtración PARCIAL
 * —que la vista sacara el palo por un lado y el número por otro— no la caza esta
 * lista. Se cubre por el otro lado y a propósito: las dos vistas son tipos
 * cerrados y `verify:mesa` comprueba que el juego de campos que sale por la red
 * es exactamente el que hay escrito. Un secreto de poca entropía no se defiende
 * buscándolo: se defiende cerrando la puerta por donde saldría.
 *
 * ═══ LO QUE ESTE FICHERO NO IMPORTA ═══
 *
 * Nada de `node:`, nada de React, nada de `server/`, nada de `shared/juegos` y
 * nada de `shared/live`. El mismo fichero lo lee el móvil y lo lee el servidor,
 * que es la línea de la que cuelga todo: `shared/` son las reglas, `server/` es
 * la autoridad.
 */
import { barajar, sembrar } from '../../mecanicas/azar';
import type { Azar } from '../../mecanicas/azar';
import { esTic } from '../reloj';
import { rechazar } from '../motor';
import type { Rechazo } from '../motor';
import type { ContextoMovimiento, Movimiento } from '../movimiento';
import type { Opcion } from '../opciones';
import { comoSeLlama, ESPECTADOR, NADIE_SENTADO } from '../tipos';
import type {
  ArcadeId,
  AsientoId,
  LosSentados,
  ManifiestoDeArcade,
  QuienMira,
} from '../tipos';
import type {
  AccionDeTablero,
  CaraDeTablero,
  PanelDeTablero,
  TableroDeclarado,
} from '../../mecanicas/tablero-declarado';

/** El identificador de este arcade. */
export const RONDA: ArcadeId = 'la-ronda';

// ---------------------------------------------------------------------------
// LA BARAJA
//
// ═══ LO LEGAL, QUE AQUÍ CUESTA POCO Y CONVIENE DECIRLO IGUAL ═══
//
// Los cuatro palos de la baraja española —oros, copas, espadas y bastos— son
// dominio público desde hace siglos y no los tiene registrados nadie: no hay
// ninguna expresión ajena dentro de este fichero, porque las cartas no llevan
// dibujo, ni nombre propio, ni texto de nadie. Es la diferencia con La Frente,
// cuyo riesgo entero estaba en el CONTENIDO de sus cartas.
//
// Y la mecánica —echar una carta, la más alta se lleva la baza— es la mecánica
// de baza más vieja que hay, sin palo obligado, sin triunfo y sin cantes. Por
// eso el manifiesto declara `mecanica-generica` y no `dominio-publico`: no se
// está reproduciendo NINGÚN juego concreto, ni el tute, ni la brisca, ni el
// mus; se está usando el patrón común del que todos salen.
// ---------------------------------------------------------------------------

/** Los cuatro palos, en el orden que desempata. */
const PALOS = ['oros', 'copas', 'espadas', 'bastos'] as const;

/** Una carta: `'espadas-10'`. Cadena, y distinguible: ver la cabecera. */
export type Carta = string;

/**
 * LA BARAJA ENTERA, ORDENADA DE MENOR A MAYOR.
 *
 * ═══ POR QUÉ EL ORDEN DE ESTA LISTA ES LA REGLA, Y NO HAY `valorDe()` ═══
 *
 * La fuerza de una carta es SU POSICIÓN AQUÍ. No se calcula partiendo la cadena
 * por el guion ni convirtiendo el trozo de la derecha a número, y eso evita dos
 * cosas concretas:
 *
 *   · Una carta que llegue del móvil con la forma cambiada —`'espadas-010'`,
 *     `'ESPADAS-10'`— no tiene posición en esta lista, así que `fuerzaDe`
 *     devuelve −1 y el reductor la rechaza. Con un `Number(...)` de por medio,
 *     `'espadas-010'` valdría diez y sería una carta que nadie repartió.
 *   · El desempate entre dos cartas del mismo número queda escrito UNA vez, en
 *     el orden de `PALOS`, en vez de repartido en un comparador.
 *
 * Se recorre por número y luego por palo —as de oros, as de copas, …, diez de
 * bastos— porque lo que decide una baza es el número, y el palo solo desempata.
 */
export const BARAJA: readonly Carta[] = construirBaraja();

function construirBaraja(): Carta[] {
  const cartas: Carta[] = [];
  for (let valor = 1; valor <= 10; valor++) {
    for (const palo of PALOS) cartas.push(`${palo}-${valor}`);
  }
  return cartas;
}

/**
 * Cuánto puede una carta. −1 si no es una carta de esta baraja.
 *
 * `indexOf` sobre cuarenta elementos, y no un mapa: en una partida entera se
 * llama unas cien veces. Un `Record` habría obligado a construirlo al cargar el
 * módulo —o sea, un objeto anclado fuera del estado— para ahorrar microsegundos
 * que nadie ha medido.
 */
function fuerzaDe(carta: Carta): number {
  return BARAJA.indexOf(carta);
}

// ---------------------------------------------------------------------------
// Los movimientos
// ---------------------------------------------------------------------------

/**
 * Reparte y arranca la partida. Lo manda cualquiera de los cuatro sentados.
 *
 * No hay «anfitrión» y es deliberado: una mesa de arcade no tiene Game Master, y
 * un campo `quienManda` dentro del estado sería el primer paso para reconstruir
 * uno. Quien se harte de esperar, empieza.
 */
export const EMPEZAR = 'ronda:empezar';

/** Echa una carta. `carga: { carta: 'espadas-10' }`. */
export const JUGAR = 'ronda:jugar';

/** Cuántas cartas se reparten a cada cual, o sea cuántas bazas dura la partida. */
export const CARTAS_POR_MANO = 5;

/** Cuánta gente hace falta. Cuatro, ni una más ni una menos. */
export const JUGADORES = 4;

// ---------------------------------------------------------------------------
// El estado
// ---------------------------------------------------------------------------

/** En qué punto va la mesa. */
export type MomentoDeLaRonda =
  /** Hay mesa y no hay partida: se está esperando a que se sienten cuatro. */
  | 'reuniendo'
  /** Cartas repartidas y turnos corriendo. */
  | 'jugando'
  /** Cinco bazas jugadas. Ya no entra ningún movimiento. */
  | 'terminada';

/**
 * Un sitio de la partida, que NO es un asiento de la mesa.
 *
 * El asiento lo reparte el servidor y puede existir sin partida —alguien que se
 * sentó y todavía no se ha empezado—. Esto es lo que ese asiento tiene DENTRO
 * del juego: su mano, sus bazas y las veces que se le pasó el turno. La lista se
 * construye AL REPARTIR, copiando `ctx.asientos` en el orden en que se sentaron,
 * y a partir de ahí no cambia: quien llegue después mira, no juega.
 */
export interface JugadorDeLaRonda {
  asiento: AsientoId;
  /** SU MANO. Esto es lo que jamás puede salir hacia otro asiento. */
  mano: Carta[];
  /** Bazas ganadas. */
  bazas: number;
  /** Veces que se le pasó el turno por vencimiento. Se enseña: es información pública. */
  pasadas: number;
}

/** Una carta ya echada, con quién la echó. Boca arriba: esto lo ve todo el mundo. */
export interface CartaEnLaBaza {
  asiento: AsientoId;
  carta: Carta;
}

/**
 * TODO lo que hay que saber de una partida de La Ronda.
 *
 * Es opaco para el motor y para el árbitro: ninguno de los dos mira dentro. El
 * turno está aquí y no en el contexto del movimiento, que es el descarte más
 * importante del diseño entero — en cuanto el motor supiera qué es un turno, el
 * primer juego rico decidiría qué forma tiene.
 */
export interface EstadoDeLaRonda {
  momento: MomentoDeLaRonda;
  /** Los cuatro, en el orden en que se sentaron. Vacío mientras se reúne la mesa. */
  jugadores: JugadorDeLaRonda[];
  /** Las cartas ya echadas en la baza en curso. */
  baza: CartaEnLaBaza[];
  /** A quién le toca: índice dentro de `jugadores`. */
  turno: number;
  /** Por qué baza va, de 1 a `CARTAS_POR_MANO`. */
  mano: number;
  /**
   * LA BAZA QUE ACABA DE RESOLVERSE, para que se pueda ver.
   *
   * ═══ POR QUÉ HACE FALTA GUARDARLA, Y NO ES UN ADORNO ═══
   *
   * `resolverLaBaza` vacía `baza` en el MISMO movimiento en que entra la cuarta
   * carta. Sin esto, esa cuarta carta no existe para nadie: quien la echa ve
   * desaparecer la baza entera en el mismo instante, y los otros tres nunca
   * llegan a ver ni la carta ni quién se llevó la mano. Un juego de bazas en el
   * que no se ve la baza no es que se vea mal: no se puede jugar, porque la
   * decisión siguiente depende de lo que acaba de pasar.
   *
   * Vive en el ESTADO y no se calcula en la vista porque no se puede calcular:
   * la información se destruye al resolver. Es el mismo motivo por el que Riberas
   * guarda `ultimaChoza` y `ultimaTirada`.
   *
   * No es secreto: son cartas que se echaron boca arriba y las vio la mesa
   * entera. Por eso NO entra en `loSecretoDeLaRonda`, y por eso se puede dibujar.
   */
  ultimaBaza: CartaEnLaBaza[];
  /** Quién se llevó `ultimaBaza`, o `null` si todavía no se ha resuelto ninguna. */
  ganoLaUltima: AsientoId | null;
  /**
   * EL AZAR. Secreto entero: con la semilla y el acumulador se calcula el
   * reparto completo. Sale de la partida en la proyección y no vuelve a entrar.
   */
  azar: Azar;
  /** Quién ganó. Vacío hasta que termina; puede tener más de uno si hay empate. */
  ganadores: AsientoId[];
}

/**
 * Una mesa recién puesta, sin cartas.
 *
 * ═══ POR QUÉ ESTO NO LO LLAMA EL SERVIDOR AL ABRIR LA MESA ═══
 *
 * Porque `mesas.ts` es genérico y no conoce este juego: no puede llamar a
 * `partidaNueva()` de un módulo cuyo nombre no sabe. Abre la mesa con
 * `estado: undefined` —que el árbitro documenta como una forma legítima de
 * empezar— y el reductor construye lo suyo en el primer movimiento.
 *
 * La ventaja no es la comodidad: es que la semilla y los asientos con los que se
 * reparte quedan DENTRO del diario, en el contexto del movimiento que repartió,
 * así que reejecutar la partida reparte exactamente las mismas cartas. Si el
 * estado inicial se construyera fuera, quien abre la mesa tendría que
 * encargarse de que fuera reproducible, y eso es una promesa que nadie
 * comprueba.
 *
 * El azar nace SIN SEMBRAR —todo a cero— y se siembra al repartir con
 * `ctx.azar`, que lo elige el servidor. Si lo eligiera el dispositivo, un
 * cliente manipulado probaría semillas hasta dar con la que le reparte la mano
 * que quiere.
 */
export function partidaNueva(): EstadoDeLaRonda {
  return {
    momento: 'reuniendo',
    jugadores: [],
    baza: [],
    ultimaBaza: [],
    ganoLaUltima: null,
    turno: 0,
    mano: 0,
    azar: sembrar(0),
    ganadores: [],
  };
}

// ---------------------------------------------------------------------------
// EL REDUCTOR
// ---------------------------------------------------------------------------

/**
 * LAS REGLAS. Puro, sin fechas, sin azar del sistema y sin excepciones.
 *
 * Las tres reglas de un reductor de arcade, aplicadas aquí:
 *
 *  1. NO MUTA. Cada rama devuelve un objeto nuevo, o EL MISMO cuando no pasa
 *     nada. Lo segundo importa tanto como lo primero: quien pinta compara por
 *     identidad, y un reductor que copia el estado en cada movimiento que no
 *     cambia nada hace repintar la pantalla para enseñar lo mismo.
 *  2. NO MIRA EL RELOJ NI EL AZAR DEL SISTEMA. El tiempo llega como `arcade:tic`
 *     y la semilla en `ctx.azar`.
 *  3. SIEMPRE DEVUELVE UN ESTADO. Un movimiento imposible —una carta que no
 *     tienes, un turno que no es el tuyo, una carga con cualquier cosa dentro—
 *     devuelve el estado tal cual. Nunca una excepción: quien hospeda no tiene
 *     forma de distinguir «lo rechacé» de «reventé».
 *
 * ═══ Y DESDE HOY ESAS DEVOLUCIONES PUEDEN LLEVAR ETIQUETA, QUE NO LAS CAMBIA ═══
 *
 * Las guardas que puede alcanzar una persona ya no devuelven el estado pelado
 * sino `rechazar(estado, motivo)`. Conviene decir por qué eso NO rompe las reglas
 * de arriba, porque leído deprisa lo parece.
 *
 * Un `Rechazo` es un envoltorio con clave de SÍMBOLO que lleva dentro EL MISMO
 * estado que se recibió. `aplicar()` lo abre, se queda el estado y TIRA el
 * motivo, así que a la mesa le llega exactamente lo de antes: el mismo objeto,
 * la revisión sin mover y nada que escribir en el diario. La regla 1 se cumple
 * —lo que sale hacia la mesa es EL MISMO objeto— y la 3 también: por esta función
 * sigue saliendo un estado y no una excepción. Lo único que se añade es que quien
 * mandó el movimiento se entera de por qué no pasó nada, y ese motivo viaja solo
 * en su respuesta: no se guarda, no entra en el diario, y una lectura posterior
 * lo trae `null`.
 *
 * `motor.ts` tiene el párrafo hermano de éste en su propia lista de reglas, que
 * es de donde sale la doctrina. Lo que NO lleva motivo, a propósito: el tic —no
 * hay nadie a quien contestar— y los movimientos que este juego no conoce.
 *
 * ═══ AQUÍ SE VALIDA LA CARGA, Y ESE ES EL TRATO ═══
 *
 * El árbitro NO mira lo que viene dentro del movimiento — no puede, el estado es
 * opaco y no sabe qué es una carta. Esa comprobación no desaparece: BAJA AQUÍ,
 * que es el único sitio que sabe qué cartas hay repartidas y de quién son. Un
 * reductor que se creyera la carga sin mirarla abriría el agujero entero: un
 * móvil manipulado echaría una carta que nadie le repartió, o la de otro.
 */
export function avanzarLaRonda(
  estado: EstadoDeLaRonda | undefined,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): EstadoDeLaRonda | Rechazo<EstadoDeLaRonda> {
  const actual = estado ?? partidaNueva();

  if (esTic(movimiento)) return sePasoElPlazo(actual);

  switch (movimiento.tipo) {
    case EMPEZAR:
      return repartir(actual, ctx);
    case JUGAR:
      return echar(actual, ctx, cartaDeLaCarga(movimiento.carga));
    default:
      /*
       * Un movimiento que este juego no conoce se ignora en silencio y devuelve
       * el estado. No es dejadez: la plataforma puede meter movimientos suyos
       * que este juego no reconozca —hoy solo el tic, mañana lo que traiga otra
       * fase— y un juego no se puede caer por no conocerlos.
       */
      return actual;
  }
}

/**
 * Saca la carta de la carga, o `null` si ahí no venía una carta.
 *
 * `carga` es `unknown` por contrato y eso cuesta esto: hay que mirarla entera
 * antes de creérsela. El precio se paga aquí, una vez, en vez de repartir
 * `as { carta: string }` por las tres ramas que la usan — que es como una
 * aserción cómoda se convierte en un `undefined` recorriendo el reductor.
 */
function cartaDeLaCarga(carga: unknown): Carta | null {
  if (typeof carga !== 'object' || carga === null) return null;
  const posible = (carga as { carta?: unknown }).carta;
  return typeof posible === 'string' ? posible : null;
}

/**
 * REPARTE Y ARRANCA.
 *
 * Solo desde `'reuniendo'` y solo con los cuatro sentados. Un segundo `empezar`
 * a mitad de partida no vuelve a barajar —es un móvil que mandó dos veces el
 * mismo movimiento— y desde hoy, además, lo DICE: devuelve el mismo estado
 * envuelto en un `Rechazo` con el motivo. Para la mesa no ha pasado nada; para
 * quien lo mandó, hay una explicación.
 *
 * ═══ QUIÉN SE SIENTA LO DICE `ctx.asientos`, Y NO ESTE FICHERO ═══
 *
 * Repartir sitios es AUTORIDAD y vive en el servidor. El reductor los LEE, que
 * es lo que hace falta para repartir cartas y decidir quién empieza. Se copian
 * en el orden en que llegan, que es el orden en que se sentaron, y ese orden es
 * el turno.
 */
function repartir(
  estado: EstadoDeLaRonda,
  ctx: ContextoMovimiento,
): EstadoDeLaRonda | Rechazo<EstadoDeLaRonda> {
  if (estado.momento !== 'reuniendo') {
    /*
     * Los dos motivos se separan porque son dos situaciones distintas y quien lo
     * lee actua distinto: en una espera su turno, en la otra ya no hay nada que
     * esperar. Meterlas en un texto unico —«ya ha empezado» a quien reparte sobre
     * una partida TERMINADA— es decirle que siga mirando una mesa acabada.
     */
    return rechazar(
      estado,
      estado.momento === 'terminada'
        ? 'Esta partida ya termino. Para jugar otra hace falta una mesa nueva.'
        : 'La partida ya ha empezado: no se vuelve a repartir.',
    );
  }
  /*
   * EL AFORO, QUE ES EL PRIMER BOTÓN QUE VE TODO EL MUNDO. Quien abre la mesa es
   * el primer sentado, así que el primer `ronda:empezar` de cualquier partida cae
   * aquí y seguirá cayendo hasta que lleguen los otros tres. Sin motivo, eso es
   * un botón que no hace nada durante todo el rato que se tarda en reunir gente.
   *
   * Y no filtra: cuántos hay sentados viaja en `VistaDeMesa.asientos` y lo ven los
   * cuatro. El motivo solo pone en palabras lo que ya está en la pantalla.
   */
  if (ctx.asientos.length !== JUGADORES) {
    return rechazar(
      estado,
      `Faltan jugadores: La Ronda se juega entre ${JUGADORES} exactos, y ahora mismo ` +
        `sois ${ctx.asientos.length}.`,
    );
  }

  const repartida = barajar(sembrar(ctx.azar), BARAJA);
  const monton = repartida.valor;

  const jugadores: JugadorDeLaRonda[] = [];
  for (let i = 0; i < ctx.asientos.length; i++) {
    /*
     * El corte es por bloques contiguos y no repartiendo de uno en uno como se
     * reparte en una mesa de verdad. Da exactamente lo mismo —la baraja ya viene
     * revuelta— y se lee de un vistazo, que es lo que importa en un fichero cuyo
     * fallo sería silencioso.
     */
    const desde = i * CARTAS_POR_MANO;
    jugadores.push({
      asiento: ctx.asientos[i] as AsientoId,
      mano: monton.slice(desde, desde + CARTAS_POR_MANO),
      bazas: 0,
      pasadas: 0,
    });
  }

  return {
    momento: 'jugando',
    jugadores,
    baza: [],
    ultimaBaza: [],
    ganoLaUltima: null,
    turno: 0,
    mano: 1,
    azar: repartida.azar,
    ganadores: [],
  };
}

/**
 * ALGUIEN ECHA UNA CARTA.
 *
 * Cuatro comprobaciones, y las cuatro son reglas de ESTE juego y de ningún otro:
 * que se esté jugando, que quien la echa sea quien tiene el turno, que haya
 * mandado una carta, y que esa carta esté en su mano.
 *
 * La segunda es la que hay que mirar despacio. El árbitro ya ha comprobado que
 * quien manda el movimiento está SENTADO a esta mesa; lo que no ha comprobado
 * —ni puede— es que le TOQUE, porque el turno es un campo de este estado. Las
 * dos comprobaciones son distintas y hacen falta las dos: sin la del árbitro,
 * cualquiera juega en cualquier mesa; sin ésta, los cuatro sentados juegan
 * cuando quieran.
 *
 * ═══ LAS CUATRO RECHAZAN CON MOTIVO, Y NINGUNO DE LOS CUATRO FILTRA ═══
 *
 * La de mirar despacio —«no es tu turno»— necesita una aclaración sobre CUÁNDO
 * se alcanza, porque la respuesta obvia es la equivocada. NO se alcanza porque
 * dos de los cuatro pulsen a la vez: `opcionesDeLaRonda` corta con `if
 * (v.turnoDe !== quien) return []`, así que a los otros tres no se les pinta
 * ningún botón; y aunque lo mandaran a mano, la mesa compara la revisión ANTES
 * de llamar al reductor y esa carrera sale por `revision-rancia` con un 409, que
 * ni siquiera llega aquí.
 *
 * Se alcanza con un movimiento FABRICADO —alguien que manda `ronda:jugar` sin
 * pasar por la pantalla— o con un cliente que no pinte desde `opciones()`. O sea
 * que es una red de seguridad, no la ruta común, y el motivo está para que quien
 * escribe ese cliente sepa qué hizo mal en vez de mirar un 200 mudo.
 *
 * Y no filtra: `turnoDe` es campo público de la vista y viaja a los cuatro.
 *
 * Los otros tres, uno a uno: `momento` es público; la carga es lo que mandó
 * quien mueve y hablar de ella no toca el estado de nadie; y «esa carta no está
 * en tu mano» habla de `miMano`, que es el campo que la proyección manda SOLO a
 * su dueño. Lo que ningún motivo puede hacer —y no lo hace— es decir cuál sería
 * la carta buena, ni nombrar una carta de otra mano.
 *
 * La quinta guarda, `quienJuega === undefined`, se queda MUDA a propósito, y el
 * motivo hay que decirlo con cuidado porque el fácil no vale: no es que
 * `jugadores` esté vacío —eso ya lo excluye la primera línea— sino que la guarda
 * salta con CUALQUIER `turno` fuera de rango. Que no pueda haberlo depende de que
 * los tres únicos sitios que escriben `turno` lo dejen dentro: `repartir` pone 0,
 * `soltar` hace `(turno + 1) % JUGADORES` y `resolverLaBaza` lo saca de un
 * índice del propio array. Es un cinturón para el compilador
 * —`noUncheckedIndexedAccess`— sostenido por esos tres sitios, no una regla del
 * juego. Un motivo ahí sería texto que nadie leerá nunca y que el próximo lector
 * confundiría con un caso real.
 */
function echar(
  estado: EstadoDeLaRonda,
  ctx: ContextoMovimiento,
  carta: Carta | null,
): EstadoDeLaRonda | Rechazo<EstadoDeLaRonda> {
  if (estado.momento !== 'jugando') {
    return rechazar(
      estado,
      estado.momento === 'reuniendo'
        ? 'Todavía no se ha repartido: aquí no hay cartas que echar.'
        : 'La partida ya terminó.',
    );
  }
  if (carta === null) return rechazar(estado, 'Ese movimiento no trae ninguna carta dentro.');

  const quienJuega = estado.jugadores[estado.turno];
  if (quienJuega === undefined) return estado;
  if (ctx.quien === null || ctx.quien !== quienJuega.asiento) {
    return rechazar(estado, 'No es tu turno: le toca a otro.');
  }
  if (!quienJuega.mano.includes(carta)) {
    return rechazar(estado, 'Esa carta no está en tu mano.');
  }

  return soltar(estado, carta, false);
}

/**
 * SE ACABÓ LA ESPERA: entra un tic y a quien tenía el turno se le echa la mano.
 *
 * ═══ POR QUÉ SE JUEGA LA CARTA MÁS BAJA Y NO SE SALTA EL TURNO ═══
 *
 * Saltar el turno sería más simple de escribir y rompería el juego: la partida
 * dura cinco bazas de cuatro cartas, así que un turno saltado deja una carta sin
 * jugar en una mano y la partida no llega nunca a `'terminada'`. Una mesa que no
 * termina es exactamente lo que esta fase existe para no dejar pasar.
 *
 * Y se echa LA MÁS BAJA, no una al azar: porque es la decisión que menos
 * beneficia a quien no está —perder la baza es el precio de no jugar— y porque
 * es determinista sin gastar una tirada del azar. Gastar una tirada aquí haría
 * que dos partidas con los mismos movimientos y distinto número de plazos
 * vencidos tuvieran el azar en sitios distintos, y eso se nota al reejecutar.
 *
 * Si el tic llega fuera de `'jugando'` no pasa nada y se devuelve EL MISMO
 * objeto: una mesa reuniéndose puede estar días esperando al cuarto, y cada
 * lectura mete su tic.
 */
function sePasoElPlazo(estado: EstadoDeLaRonda): EstadoDeLaRonda {
  if (estado.momento !== 'jugando') return estado;
  const quienJuega = estado.jugadores[estado.turno];
  if (quienJuega === undefined) return estado;

  let masBaja: Carta | null = null;
  let fuerzaMasBaja = Number.MAX_SAFE_INTEGER;
  for (const carta of quienJuega.mano) {
    const fuerza = fuerzaDe(carta);
    if (fuerza < 0 || fuerza >= fuerzaMasBaja) continue;
    fuerzaMasBaja = fuerza;
    masBaja = carta;
  }
  if (masBaja === null) return estado;

  return soltar(estado, masBaja, true);
}

/**
 * Lo común a los dos caminos: la carta sale de la mano y entra en la baza.
 *
 * Y si con ésta se completan las cuatro, se resuelve la baza en el mismo
 * movimiento. Resolverla en un movimiento aparte —un `arcade:resolver` que
 * alguien tendría que mandar— dejaría la mesa esperando a que a alguien se le
 * ocurriera pulsar algo, que es la clase de estado intermedio en el que una
 * partida se queda colgada sin que nada falle.
 */
function soltar(estado: EstadoDeLaRonda, carta: Carta, porVencimiento: boolean): EstadoDeLaRonda {
  const jugadores = estado.jugadores.map((j, i) =>
    i !== estado.turno
      ? j
      : {
          ...j,
          mano: j.mano.filter((c) => c !== carta),
          pasadas: porVencimiento ? j.pasadas + 1 : j.pasadas,
        },
  );
  const quienJuega = estado.jugadores[estado.turno] as JugadorDeLaRonda;
  const baza = [...estado.baza, { asiento: quienJuega.asiento, carta }];

  if (baza.length < JUGADORES) {
    return {
      ...estado,
      jugadores,
      baza,
      turno: (estado.turno + 1) % JUGADORES,
    };
  }

  return resolverLaBaza({ ...estado, jugadores, baza });
}

/**
 * LA BAZA ESTÁ COMPLETA: se la lleva la carta más alta.
 *
 * Sin palo obligado, sin triunfo y sin cantes. Es la mecánica de baza más
 * desnuda que hay, y es a propósito: lo que esta fase prueba es la MESA, y una
 * regla rica aquí solo serviría para que alguien la copiara al escribir el
 * tablero hexagonal.
 *
 * El desempate no existe porque no puede haber empate: cada carta de la baraja
 * es distinta y el orden de `BARAJA` es total. Escribir un desempate «por si
 * acaso» sería escribir código que no se ejecuta nunca, o sea código que nadie
 * prueba.
 */
function resolverLaBaza(estado: EstadoDeLaRonda): EstadoDeLaRonda {
  let ganadora = estado.baza[0] as CartaEnLaBaza;
  for (const echada of estado.baza) {
    if (fuerzaDe(echada.carta) > fuerzaDe(ganadora.carta)) ganadora = echada;
  }

  const jugadores = estado.jugadores.map((j) =>
    j.asiento === ganadora.asiento ? { ...j, bazas: j.bazas + 1 } : j,
  );

  /*
   * Quien gana la baza abre la siguiente. Es la regla de cualquier juego de
   * bazas y aquí además hace falta para que el turno no se quede clavado en el
   * orden de los asientos: sin ella, quien se sentó primero abriría las cinco.
   */
  let turno = 0;
  for (let i = 0; i < jugadores.length; i++) {
    if ((jugadores[i] as JugadorDeLaRonda).asiento === ganadora.asiento) turno = i;
  }

  /*
   * La baza que se acaba de resolver se GUARDA antes de vaciarla. Es la unica
   * oportunidad: dentro de una linea deja de existir, y con ella la cuarta carta
   * y el nombre de quien se llevo la mano. Ver `ultimaBaza` en `EstadoDeLaRonda`.
   */
  const resuelta = { ultimaBaza: estado.baza, ganoLaUltima: ganadora.asiento };

  const quedanCartas = jugadores.some((j) => j.mano.length > 0);
  if (quedanCartas) {
    return { ...estado, ...resuelta, jugadores, baza: [], turno, mano: estado.mano + 1 };
  }

  return {
    ...estado,
    ...resuelta,
    momento: 'terminada',
    jugadores,
    baza: [],
    turno,
    ganadores: quienesGanan(jugadores),
  };
}

/**
 * Quién gana, que pueden ser varios.
 *
 * Se devuelven TODOS los que empatan a bazas y en el orden en que se sentaron.
 * Un desempate inventado —quien ganó la última, quien se sentó antes— sería una
 * regla de producto disfrazada de detalle técnico, y en un juego de cinco bazas
 * entre cuatro el empate a dos es la mitad de las partidas.
 *
 * Nada de `sort`: el orden sale del recorrido, que es el de los asientos. Un
 * `sort` sin comparador ordena como decida el motor de JavaScript, y no es el
 * mismo en Hermes que en V8.
 */
function quienesGanan(jugadores: readonly JugadorDeLaRonda[]): AsientoId[] {
  let mejor = -1;
  for (const j of jugadores) {
    if (j.bazas > mejor) mejor = j.bazas;
  }
  const ganadores: AsientoId[] = [];
  for (const j of jugadores) {
    if (j.bazas === mejor) ganadores.push(j.asiento);
  }
  return ganadores;
}

/**
 * ¿Se acabó?
 *
 * La llama QUIEN HOSPEDA para saber cuándo cerrar la mesa, porque «fin como
 * función del estado» es uno de los conceptos que el diseño aplaza: en cuanto el
 * motor sepa preguntarle a un juego si ha terminado, tendrá una opinión sobre
 * qué es terminar. Mientras tanto, el juego sí lo sabe y lo dice cuando se lo
 * preguntan por su nombre.
 */
export function seAcabo(estado: EstadoDeLaRonda | undefined): boolean {
  return (estado ?? partidaNueva()).momento === 'terminada';
}

// ---------------------------------------------------------------------------
// LO QUE VE CADA CUAL
// ---------------------------------------------------------------------------

/** Lo que se sabe de cada jugador SIN mirarle las cartas. */
export interface JugadorVisto {
  asiento: AsientoId;
  /**
   * Lo que tecleó al sentarse, o su identificador si no consta.
   *
   * Entra por la PROYECCIÓN y no por el estado, que es la decisión de la fase 5:
   * un nombre es presentación y alguien puede cambiarlo, así que en el camino del
   * reductor la misma partida reejecutada tras un renombrado daría otro estado.
   * Aquí es dato de salida y no entra en ninguna regla.
   */
  nombre: string;
  /** Cuántas cartas le quedan. El número sí es público: se cuentan mirando. */
  cartas: number;
  bazas: number;
  pasadas: number;
}

/**
 * LA VISTA. Un solo tipo para el asiento y para el espectador, y CERRADO.
 *
 * ═══ POR QUÉ UN TIPO CERRADO Y NO UN `Record<string, unknown>` ═══
 *
 * Porque es la mitad de la defensa de los secretos, y la mitad que aguanta el
 * paso del tiempo. La otra —buscar los valores de `loSecreto` dentro de lo que
 * sale— solo caza lo que es distinguible. Un campo nuevo que alguien añada
 * dentro de seis meses con la mejor intención —«el reparto inicial, para pintar
 * una animación»— no lo cazaría ninguna búsqueda de valores si lo que mete es un
 * número; sí lo caza un tipo cerrado que `verify:mesa` contrasta campo a campo
 * contra lo que de verdad sale por la red.
 *
 * ═══ Y POR QUÉ UNO SOLO Y NO DOS COMO EN «LA FRENTE» ═══
 *
 * Allí las dos vistas son distintas de verdad: la sala VE la palabra y quien
 * lleva el móvil NO, así que un tipo con la palabra y otro sin ella dicen la
 * verdad sobre dos pantallas que enseñan cosas distintas. Aquí todo el mundo ve
 * lo mismo salvo UN campo, `miMano`, que se vacía para quien no es su dueño. Dos
 * tipos para eso serían dos tipos con los mismos nueve campos.
 */
export interface VistaDeLaRonda {
  desde: 'la-ronda';
  momento: MomentoDeLaRonda;
  /** Por qué baza va. Cero mientras se reúne la mesa. */
  mano: number;
  /** A quién le toca, o `null` si no se está jugando. */
  turnoDe: AsientoId | null;
  /** Los cuatro, sin sus cartas. */
  jugadores: JugadorVisto[];
  /** Lo ya echado en la baza en curso. Boca arriba para todos. */
  baza: CartaEnLaBaza[];
  /**
   * LA BAZA ANTERIOR, entera, y quién se la llevó.
   *
   * Es lo que permite que la cuarta carta se vea: al completarse la baza se
   * resuelve en el mismo movimiento y `baza` vuelve a quedar vacía. Público por
   * construcción —son cartas que se echaron boca arriba— y por eso no está en
   * `loSecretoDeLaRonda`.
   */
  ultimaBaza: CartaEnLaBaza[];
  ganoLaUltima: AsientoId | null;
  /**
   * MIS CARTAS, y solo las mías.
   *
   * Vacía para el espectador y para cualquiera que no esté jugando esta partida.
   * No va marcada como oculta ni tapada con asteriscos: sencillamente NO SE
   * ENVÍA, que es la doctrina que este repositorio ya tenía escrita en
   * `server/src/live/proyeccion.ts`. Una carta que viaja marcada como oculta es
   * una carta destapada con un adorno: el móvil de quien juega es un entorno
   * hostil y basta con abrir las herramientas del navegador.
   */
  miMano: Carta[];
  /** Quién ha ganado. Vacío hasta que termina. */
  ganadores: AsientoId[];
  /** El tablero YA RESUELTO, para el mueble genérico. Ver `tableroDeLaRonda`. */
  tablero: TableroDeclarado;
}

/** La vista sin el tablero: lo que de verdad tapa la proyección. */
type VistaSinTablero = Omit<VistaDeLaRonda, 'tablero'>;

/**
 * LA PROYECCIÓN: esto es lo que se ve desde aquí.
 *
 * `ESPECTADOR` —«nadie en concreto»— es quien mira la mesa sin ocupar sitio: una
 * pantalla apoyada en el centro, alguien que se asoma antes de sentarse. Ve todo
 * lo público y ninguna mano, que es exactamente lo que ve alguien de pie detrás
 * de la mesa.
 *
 * Y un asiento ve, además, LA SUYA. Ni la de al lado, ni la del que se acaba de
 * ir, ni el montón que no se repartió — que aquí no existe porque se reparten
 * veinte de cuarenta, y las veinte restantes NO están en el estado: nunca se
 * guardaron. Es la forma más barata de que no se filtren.
 *
 * Ni el azar sale por aquí, y eso no es cosmético: quien tenga la semilla y el
 * acumulador calcula el reparto entero con cuatro líneas.
 */
export function proyectarLaRonda(
  estado: EstadoDeLaRonda | undefined,
  quien: QuienMira,
  sentados: LosSentados = NADIE_SENTADO,
): VistaDeLaRonda {
  const base = loQueSeVe(estado ?? partidaNueva(), quien, sentados);
  return { ...base, tablero: tableroDeLaRonda(base, quien) };
}

/**
 * EL TAPADO: todo lo público, más lo mío y nada de lo ajeno.
 *
 * Va aparte del tablero porque el tablero se DIBUJA a partir de esto, y mezclar
 * las dos cosas en una función haría que el recorte de secretos —lo único que
 * aquí es delicado— se leyera entre coordenadas.
 */
function loQueSeVe(
  e: EstadoDeLaRonda,
  quien: QuienMira,
  sentados: LosSentados,
): VistaSinTablero {
  const mia =
    quien === ESPECTADOR ? undefined : e.jugadores.find((j) => j.asiento === quien);

  return {
    desde: 'la-ronda',
    momento: e.momento,
    mano: e.mano,
    turnoDe: e.momento === 'jugando' ? (e.jugadores[e.turno]?.asiento ?? null) : null,
    jugadores: e.jugadores.map((j) => ({
      asiento: j.asiento,
      nombre: comoSeLlama(sentados, j.asiento),
      cartas: j.mano.length,
      bazas: j.bazas,
      pasadas: j.pasadas,
    })),
    baza: e.baza.map((c) => ({ asiento: c.asiento, carta: c.carta })),
    ultimaBaza: e.ultimaBaza.map((c) => ({ asiento: c.asiento, carta: c.carta })),
    ganoLaUltima: e.ganoLaUltima,
    miMano: mia === undefined ? [] : [...mia.mano],
    ganadores: [...e.ganadores],
  };
}

/**
 * LO QUE JAMÁS PUEDE SALIR EN LA PROYECCIÓN DE OTRO ASIENTO. Solo para pruebas.
 *
 * El motor no la llama nunca: la llama `verify:mesa`. Sin ella, este juego
 * podría registrar la identidad como proyección —`(estado) => estado`—, pasar
 * todos los comprobadores en verde y mandarle a los cuatro móviles las cuatro
 * manos. Y un comprobador genérico no puede cazarlo, porque el estado es OPACO y
 * no sabe qué es la zona oculta: ése es el precio de la opacidad de la que
 * cuelga todo el diseño, y hay que pagarlo o abandonarla.
 *
 * ═══ CÓMO SE LEE ESTA LISTA, QUE NO ES OBVIO Y «LA FRENTE» YA LO AVISÓ ═══
 *
 * El contrato dice «los valores que jamás pueden aparecer en la proyección de
 * OTRO asiento», y las dos palabras importan. En La Frente ninguno aparece en la
 * de ningún asiento —pero SÍ en la del espectador, que es la sala, y tiene que
 * aparecer—. Aquí es distinto y es el caso normal de un juego de cartas: cada
 * carta aparece en la vista de UN asiento, el suyo, y en ninguna otra.
 *
 * O sea que la comprobación correcta —la única que sirve para los dos juegos— no
 * es «no aparece en ninguna vista» sino:
 *
 *     NINGÚN VALOR SECRETO PUEDE APARECER EN LA VISTA DE MÁS DE UN ASIENTO.
 *
 * Con eso, La Frente da cero apariciones, La Ronda da una por carta, y una
 * proyección que sea la identidad da cuatro y se pone roja. Está escrito así en
 * `verify:mesa` y queda escrito aquí para que sea una decisión y no un
 * descubrimiento de quien lo lea el año que viene.
 *
 * ═══ QUÉ ES SECRETO, Y CUÁNDO ═══
 *
 *   · SIEMPRE el azar, entero y como objeto. Ver la cabecera del fichero para
 *     por qué entero y no `semilla` y `acumulador` sueltos: son dos números
 *     pequeños y coincidirían por casualidad con los contadores de la vista.
 *   · MIENTRAS SE JUEGA, las cartas que quedan en las manos. Las ya echadas no:
 *     están boca arriba en la baza y las ha visto la mesa entera.
 *   · AL TERMINAR no queda ninguna carta en ninguna mano, así que la lista se
 *     queda en el azar. No es un caso especial: sale solo de mirar el estado, y
 *     que dependa del estado en vez de ser una lista fija es lo que hace la
 *     comprobación exacta en vez de aproximada.
 */
export function loSecretoDeLaRonda(estado: EstadoDeLaRonda | undefined): unknown[] {
  const e = estado ?? partidaNueva();
  const secretos: unknown[] = [e.azar];
  for (const j of e.jugadores) {
    for (const carta of j.mano) secretos.push(carta);
  }
  return secretos;
}

// ---------------------------------------------------------------------------
// LO QUE SE PUEDE HACER, para que un mueble genérico lo pinte
// ---------------------------------------------------------------------------

/**
 * LAS OPCIONES DE LA RONDA.
 *
 * ═══ POR QUÉ ESTO NO EXISTÍA, Y POR QUÉ ESO ERA UN AGUJERO Y NO UNA ELECCIÓN ═══
 *
 * `opciones()` es OPCIONAL en el alta a propósito: un juego que pinta su propia
 * pantalla —La Frente, El Arcade— no la necesita y no le falta. Pero La Ronda
 * declara `mueble: 'formulario'`, y un formulario SE PINTA A PARTIR DE ESTA
 * LISTA: sin ella no hay botones, y sin botones no hay juego. El resultado,
 * medido antes de escribir esto, era que una partida repartida y en marcha daba
 * CERO opciones a los cuatro sentados y al espectador. La Ronda no es que
 * estuviera a medias en un cliente: no se podía jugar en ninguno.
 *
 * Que la batería estuviera verde no lo contradice y conviene decirlo: los
 * comprobadores compran lo que este juego TIENE —reductor, proyección, secretos,
 * marcador— y ninguno preguntaba si alguien puede pulsar algo.
 *
 * ═══ LA REGLA DEL §5 bis: «SOLO SI», JAMÁS «SI Y SOLO SI» ═══
 *
 * La regla canónica está en `shared/arcade/opciones.ts`: el reductor rechaza lo
 * que no se ofreció y sigue validando lo que sí. O sea que ofrecer de MÁS está
 * permitido; lo que no vale es que el reductor acepte algo que nadie ofreció.
 *
 * Este juego ofrece de más exactamente una vez, y hay que decirlo sin adornos
 * porque es lo primero que ve cualquiera: mientras se reúne la mesa se ofrece
 * «Repartir las cartas» a quien tenga asiento, y `repartir` lo RECHAZA hasta que
 * se sienten los cuatro. O sea que el único botón de la pantalla falla durante
 * todo el rato que se tarda en reunir gente.
 *
 * Se podría dejar de ofrecer —la proyección recibe los sentados, así que aquí
 * habría con qué mirar el aforo— y no se hace: un botón que explica lo que falta
 * enseña más que un botón ausente. Quien abre la mesa ve que hay algo que hacer y
 * cuánta gente le falta para hacerlo, y eso solo se sostiene desde que el rechazo
 * DICE POR QUÉ y cuántos son. Sin el motivo esto sería un botón roto.
 *
 * ═══ Y LA TRAMPA, QUE ES LO ÚNICO DELICADO DE ESTE FICHERO ═══
 *
 * La carta va en la `carga`. NUNCA en el `id`.
 *
 * No porque `jugar:espadas-10` filtrara nada —la opción se le ofrece solo a su
 * dueño, que ya tiene esa carta en `miMano`— sino por algo peor y permanente:
 * movería el secreto de una superficie que el comprobador VE a una que no ve.
 * `verify:mesa` busca cada valor de `loSecretoDeLaRonda` en forma canónica, o sea
 * `"espadas-10"` CON COMILLAS, y cuenta en cuántas vistas de asiento aparece. En
 * `carga: { carta }` serializa `{"carta":"espadas-10"}` y se cuenta; dentro de
 * `'jugar:espadas-10'` lo que queda pegado a la `e` es un `:` y NO HAY
 * COINCIDENCIA. Un secreto embebido en un id es invisible para el comprobador que
 * existe para cazarlo, y el día que alguien añada una opción que nombre la carta
 * de OTRO —un cante, una apuesta contra una carta concreta— esa opción se pone
 * roja si la carta viaja en la `carga`, y pasa en verde si va escondida en un
 * identificador.
 *
 * ═══ Y AHORA LO QUE ESTA PROTECCIÓN NO CUBRE, QUE HAY QUE DECIRLO ═══
 *
 * El `rotulo` de cada opción es «As de bastos»: la carta, re-codificada para que
 * la lea una persona. `canonico('As de bastos')` no contiene `"bastos-1"`, así
 * que `verify:mesa` TAMPOCO llega ahí. O sea que la superficie de opciones tiene
 * una mitad medida —`id` y `carga`— y una mitad ciega —`rotulo` y `ayuda`—, y
 * sería falso decir que sacar la carta del id deja el asunto cerrado.
 *
 * No se puede arreglar poniendo el rótulo en clave: un botón de carta tiene que
 * decir qué carta es, o no es un botón. Lo que sí se puede es saber dónde está el
 * límite, y es éste: la defensa del rótulo NO es textual sino estructural — las
 * opciones se calculan por observador, con `opciones(vista, quien)`, a partir de
 * la vista de ESE observador, y `miMano` solo lleva la suya. Mientras eso se
 * respete, un rótulo no puede nombrar una carta que quien lo recibe no tuviera ya.
 *
 * La consecuencia práctica, para quien añada la opción de mañana: una opción que
 * mencione algo ajeno hay que cazarla LEYENDO, porque medir no la caza. Por eso
 * la carta va igualmente en la `carga` aunque el reductor pudiera deducirla —es
 * la mitad que el comprobador sí ve— y por eso `Opcion.rotulo` lleva desde hoy la
 * misma advertencia que ya llevaba `Opcion.id`.
 *
 * En La Ronda esto muerde más que en ningún otro juego de la casa, y es por una
 * razón que conviene dejar escrita: aquí el vocabulario SECRETO y el de los
 * MOVIMIENTOS son LAS MISMAS CADENAS. Riberas puede permitirse
 * `ofrecer:s2:junco:limo` porque recorre `BIENES`, la lista pública de CLASES, y
 * lo secreto allí es la ficha con su número de serie. La Ronda no tiene ninguna
 * clase pública de la que la carta sea instancia, ni un montón público del que
 * sacar el identificador. Copiar aquí la forma de Riberas es precisamente el
 * error.
 *
 * Tampoco vale `BARAJA.indexOf(carta)`: es una biyección con las cuarenta cartas,
 * o sea la carta codificada, y «derivarse de contenido oculto» incluye toda
 * codificación sin pérdida — y ésa además burla al humano que revise el diff.
 *
 * Lo que queda del vocabulario público que el §5 bis enumera —«el tipo del
 * movimiento, la llave de un sitio del tablero, un número de orden»— es el número
 * de orden, que es exactamente el hueco que la regla dejó para este caso. Va con
 * la baza delante (`jugar:3:2`) para que un id no se reutilice nunca para otra
 * carta ni siquiera entre bazas: `mano` es público y se lee en la propia vista.
 *
 * El índice no añade ni un bit: cuántas cartas le quedan a cada cual ya es
 * público —`JugadorVisto.cartas`, «se cuentan mirando»— y una POSICIÓN no dice
 * qué carta es. Y es estable mientras la lista vive, que es la otra mitad de la
 * regla: `miMano` sale de `[...mia.mano]` y la mano solo se encoge con un
 * `filter`; el orden no se baraja nunca.
 */
export function opcionesDeLaRonda(vista: unknown, quien: QuienMira): readonly Opcion[] {
  const v = comoVista(vista);
  if (v === null) return [];
  /*
   * El espectador MIRA. No es que no le toque: es que no tiene asiento, y una
   * lista de botones para alguien que no puede mandar un movimiento sería una
   * pantalla que promete lo que no cumple.
   */
  if (quien === ESPECTADOR) return [];

  if (v.momento === 'reuniendo') {
    return [
      {
        id: 'empezar',
        tipo: EMPEZAR,
        carga: {},
        rotulo: 'Repartir las cartas',
        ayuda: `Hacen falta ${JUGADORES} sentados exactos. Se reparten ${CARTAS_POR_MANO} a cada uno.`,
      },
    ];
  }

  if (v.momento !== 'jugando') return [];
  if (v.turnoDe !== quien) return [];

  return v.miMano.map((carta, i) => ({
    id: `jugar:${v.mano}:${i}`,
    tipo: JUGAR,
    carga: { carta },
    rotulo: comoSeLee(carta),
    ayuda: '',
  }));
}

/**
 * Mira si esto tiene forma de vista de La Ronda.
 *
 * Se comprueban las listas y no cada carta de dentro, por lo mismo que en
 * `esTableroDeclarado`: lo que caza es el caso real —una vista de otro juego, o
 * un cliente más viejo que el servidor— y para eso basta.
 */
function comoVista(vista: unknown): VistaSinTablero | null {
  if (typeof vista !== 'object' || vista === null) return null;
  const v = vista as Partial<VistaSinTablero>;
  if (v.desde !== 'la-ronda') return null;
  if (!Array.isArray(v.miMano) || !Array.isArray(v.baza)) return null;
  if (!Array.isArray(v.ultimaBaza) || !Array.isArray(v.jugadores)) return null;
  if (typeof v.mano !== 'number') return null;
  return v as VistaSinTablero;
}

/**
 * `'espadas-10'` se lee «10 de espadas». Y el uno es el as.
 *
 * Va aquí y no en el mueble porque es vocabulario DE ESTE JUEGO: un mueble
 * genérico no sabe qué es un palo, y si lo supiera dejaría de ser genérico. El
 * rótulo es lo único que una persona lee del botón, y `espadas-10` es un
 * identificador de programa, no una carta.
 *
 * ═══ LO QUE VALIDA Y LO QUE NO, DICHO EXACTO ═══
 *
 * Sólo mira que haya un guion con algo a cada lado. NO comprueba el palo contra
 * `PALOS` ni el número contra 1..10, así que `'espadas-010'` sale «010 de
 * espadas» y `'a-b-c'` sale «c de a-b». Eso es deliberado y no un descuido: quien
 * decide si una carta existe es `fuerzaDe`, con la posición en `BARAJA`, y esa
 * decisión no se duplica aquí —dos sitios que opinan sobre qué es una carta
 * válida acaban discrepando—. Esto solo da formato.
 *
 * La consecuencia práctica es que una carta con la forma cambiada se PINTA rara
 * en vez de reventar, y el reductor la rechaza igual cuando alguien la manda. Se
 * ve el fallo y no se cuela, que es el orden correcto de las dos cosas.
 *
 * Sin guion sí se devuelve tal cual: no hay nada que formatear.
 */
function comoSeLee(carta: Carta): string {
  const guion = carta.lastIndexOf('-');
  if (guion <= 0) return carta;
  const palo = carta.slice(0, guion);
  const valor = carta.slice(guion + 1);
  if (palo.length === 0 || valor.length === 0) return carta;
  return `${valor === '1' ? 'As' : valor} de ${palo}`;
}

// ---------------------------------------------------------------------------
// EL TABLERO DECLARADO: la baza, el marcador y de quién es el turno
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ UN JUEGO DE CARTAS DECLARA UN TABLERO ═══
 *
 * Porque tiene uno. Una baza son cuatro cartas boca arriba puestas en fila sobre
 * una mesa, y eso es una topología declarada tan literal como un delta de
 * hexágonos: sitios con algo encima. No se declara un tablero para colarse en el
 * mueble bueno; se declara porque describe lo que hay.
 *
 * La alternativa que se descartó, dicha para que no haya que volver a pensarla:
 * sacar `aviso` y `paneles` del tablero a una superficie nueva —un «tapete»— que
 * pudiera acompañar también al mueble `formulario`. Se descartó porque
 * generalizaría el contrato para un caso que no lo obliga, y porque el motivo
 * para hacerlo era que La Ronda no tenía nada que dibujar — y sí lo tiene. El día
 * que exista un juego con contexto y de verdad sin nada que dibujar, ese juego
 * forzará la superficie nueva y se diseñará con dos ejemplos delante en vez de
 * con uno inventado.
 *
 * Y lo que el mueble `formulario` pierde por esto: nada, porque nunca lo tuvo. Un
 * formulario pinta la lista de `opciones()` y NADA MÁS —está escrito en
 * `app/src/arcade/pintados.ts`, que lo deja fuera a sabiendas— así que La Ronda
 * como formulario enseñaba cinco botones a quien tenía el turno y una pantalla de
 * disculpa a los otros tres. Medido, no supuesto.
 */

/** Lo que ocupa una carta y lo que se deja entre ellas, en unidades del `viewBox`. */
const ANCHO_DE_CARTA = 90;
const ALTO_DE_CARTA = 130;
const HUECO_ENTRE_CARTAS = 16;

/**
 * EL TABLERO DE LA RONDA: la baza en el centro y el marcador al lado.
 *
 * ═══ QUÉ BAZA SE DIBUJA, QUE ES LA DECISIÓN DE ESTA FUNCIÓN ═══
 *
 * La de en curso si hay algo echado; si no hay nada, LA ANTERIOR. Y hace falta
 * que sea así: `resolverLaBaza` vacía `baza` en el mismo movimiento en que entra
 * la cuarta carta, así que entre una baza y la siguiente el centro de la mesa
 * queda vacío justo en el instante en que hay algo que mirar — quién ganó y con
 * qué. Dibujar solo `baza` dejaría la cuarta carta sin existir para nadie.
 *
 * Cuando se dibuja la anterior, la ganadora va `destacada` y el aviso lo dice
 * además con palabras. Las dos cosas: el color solo no vale para quien no lo
 * distinga.
 */
export function tableroDeLaRonda(vista: unknown, quien: QuienMira): TableroDeclarado {
  const v = comoVista(vista);
  if (v === null) return tableroVacio('Esta vista no es de La Ronda.');

  const acciones = opcionesDeLaRonda(v, quien).map(comoAccion);
  if (v.momento === 'reuniendo') {
    return tableroVacio(
      `Todavía no hay partida. Cuando os sentéis ${JUGADORES}, cualquiera puede repartir.`,
      acciones,
    );
  }

  /*
   * `enCurso` distingue los dos dibujos, y no es lo mismo que «hay cartas»: con la
   * partida terminada `baza` está vacía y `ultimaBaza` llena, y ahí lo que se
   * enseña es la última mano jugada, que es lo que se quiere ver al acabar.
   */
  const enCurso = v.baza.length > 0;
  const echadas = enCurso ? v.baza : v.ultimaBaza;
  const ganadora = enCurso ? null : v.ganoLaUltima;

  const caras: CaraDeTablero[] = echadas.map((echada, i) => ({
    /*
     * EL IDENTIFICADOR ES UN SITIO, NO UNA CARTA. Misma regla que en las opciones
     * y por el mismo motivo, aunque aquí la carta ya sea pública: si mañana esta
     * fila dibujara algo que no lo es, el identificador ya estaría escrito con la
     * forma que no delata. Ver la cabecera de `opcionesDeLaRonda`.
     */
    id: `sitio:${i}`,
    puntos: sitioDeLaBaza(i, echadas.length),
    relleno: echada.asiento === ganadora ? '#2f4f3a' : '#1d2b24',
    borde: echada.asiento === ganadora ? '#7fd1a0' : '#3d5147',
    rotulo: comoSeLee(echada.carta),
    cifra: nombreDe(v, echada.asiento),
    destacada: echada.asiento === ganadora,
    /*
     * Una carta ya echada NO SE TOCA: está sobre la mesa y no hay ningún
     * movimiento que la tenga por objeto. `null` y no un movimiento inerte,
     * porque `opcionesSueltas` compara por movimiento y un `toque` inventado
     * escondería un botón de la lista de abajo.
     */
    toque: null,
  }));

  return {
    vista: encuadreDeLaBaza(),
    caras,
    /* Ni aristas ni vértices: una baza no tiene caminos que recorrer. */
    lineas: [],
    nudos: [],
    acciones,
    paneles: panelesDe(v),
    aviso: avisoDe(v, quien),
  };
}

/** Un tablero sin baza: solo el aviso y los botones que haya. */
function tableroVacio(aviso: string, acciones: AccionDeTablero[] = []): TableroDeclarado {
  return {
    vista: { x: 0, y: 0, ancho: 100, alto: 100 },
    caras: [],
    lineas: [],
    nudos: [],
    acciones,
    paneles: [],
    aviso,
  };
}

/** Una opción, dicha como botón del tablero. */
function comoAccion(o: Opcion): AccionDeTablero {
  return {
    id: o.id,
    rotulo: o.rotulo,
    ayuda: o.ayuda,
    disponible: true,
    toque: { tipo: o.tipo, carga: o.carga },
  };
}

/**
 * El rectángulo de la carta que va en el sitio `i` de `cuantas`.
 *
 * Se centra sobre el origen para que el dibujo no dependa de cuántas cartas haya:
 * con una carta echada y con cuatro, la fila queda centrada en el mismo sitio en
 * vez de crecer hacia un lado en cada movimiento.
 */
function sitioDeLaBaza(i: number, cuantas: number): Array<{ x: number; y: number }> {
  const paso = ANCHO_DE_CARTA + HUECO_ENTRE_CARTAS;
  const izquierda = (i - (cuantas - 1) / 2) * paso - ANCHO_DE_CARTA / 2;
  const arriba = -ALTO_DE_CARTA / 2;
  return [
    { x: izquierda, y: arriba },
    { x: izquierda + ANCHO_DE_CARTA, y: arriba },
    { x: izquierda + ANCHO_DE_CARTA, y: arriba + ALTO_DE_CARTA },
    { x: izquierda, y: arriba + ALTO_DE_CARTA },
  ];
}

/**
 * El `viewBox`, calculado para EL MÁXIMO de cartas y no para las que hay.
 *
 * Si se encuadrara lo dibujado, cada carta echada cambiaría la escala de todo el
 * tablero y las tres anteriores darían un salto de tamaño en mitad de la baza.
 * Se reserva sitio para las cuatro desde el principio, que es lo que hace una
 * mesa de verdad.
 */
function encuadreDeLaBaza(): { x: number; y: number; ancho: number; alto: number } {
  const paso = ANCHO_DE_CARTA + HUECO_ENTRE_CARTAS;
  const ancho = JUGADORES * paso;
  const alto = ALTO_DE_CARTA * 1.6;
  return { x: -ancho / 2, y: -alto / 2, ancho, alto };
}

/** Cómo se llama quien ocupa ese asiento, según la propia vista. */
function nombreDe(v: VistaSinTablero, asiento: AsientoId): string {
  for (const j of v.jugadores) if (j.asiento === asiento) return j.nombre;
  return asiento;
}

/** Los bloques de texto de al lado: el marcador y por qué mano va. */
function panelesDe(v: VistaSinTablero): PanelDeTablero[] {
  const marcador = v.jugadores.map((j) => {
    const suyas = j.cartas === 1 ? '1 carta' : `${j.cartas} cartas`;
    const bazas = j.bazas === 1 ? '1 baza' : `${j.bazas} bazas`;
    const pasadas = j.pasadas > 0 ? ` · ${j.pasadas} por plazo` : '';
    return `${j.nombre} — ${bazas}, ${suyas}${pasadas}`;
  });
  const paneles: PanelDeTablero[] = [{ titulo: 'La mesa', lineas: marcador }];

  if (v.momento === 'jugando') {
    paneles.push({
      titulo: 'La partida',
      lineas: [`Baza ${v.mano} de ${CARTAS_POR_MANO}.`, 'Se lleva la baza la carta más alta.'],
    });
  }
  return paneles;
}

/**
 * LA LÍNEA DE ARRIBA: lo que hay que saber sin mirar nada más.
 *
 * Dice DOS cosas cuando hay dos que decir —quién se llevó la baza anterior y a
 * quién le toca ahora— porque separarlas obligaría a mirar en dos sitios para
 * entender un solo instante de la partida.
 */
function avisoDe(v: VistaSinTablero, quien: QuienMira): string {
  if (v.momento === 'terminada') {
    const nombres = v.ganadores.map((a) => nombreDe(v, a));
    if (nombres.length === 0) return 'Se acabó la partida.';
    if (nombres.length === 1) return `Gana ${nombres[0] as string}.`;
    return `Empatan ${nombres.join(' y ')}.`;
  }

  const partes: string[] = [];
  if (v.baza.length === 0 && v.ganoLaUltima !== null) {
    partes.push(`${nombreDe(v, v.ganoLaUltima)} se llevó la baza.`);
  }
  if (v.turnoDe === null) partes.push('No le toca a nadie.');
  else if (v.turnoDe === quien) partes.push('Te toca: echa una carta.');
  else partes.push(`Le toca a ${nombreDe(v, v.turnoDe)}.`);
  return partes.join(' ');
}

// ---------------------------------------------------------------------------
// EL MANIFIESTO
// ---------------------------------------------------------------------------

/**
 * LA RONDA, dicha como dato.
 *
 * Los cinco campos que hubo que pensar llevan su razón al lado. Los demás son lo
 * que son.
 */
export const MANIFIESTO_RONDA: ManifiestoDeArcade = {
  id: RONDA,
  nombre: 'La Ronda',
  /*
   * El gancho es la línea que hace que alguien toque la tarjeta. Dice las dos
   * cosas que definen el juego —que hay cartas que solo ves tú y que se juega
   * por turnos con gente— porque quien las entiende ya sabe si le apetece.
   */
  gancho: 'Cinco cartas que solo ves tú, y cuatro alrededor de la mesa.',
  icono: 'mando',

  /*
   * CUATRO EXACTAS. No es una limitación técnica —el reductor está escrito con
   * `JUGADORES` y no con cuatro repartidos por el fichero— sino la mecánica:
   * cuarenta cartas, cinco por cabeza, cinco bazas. Con tres sobrarían cartas y
   * con cinco no llegarían, y en los dos casos habría que inventar una regla que
   * este juego no existe para inventar.
   */
  jugadores: { minimo: JUGADORES, maximo: JUGADORES },

  /*
   * ═══ `sede: 'servidor'`, Y ES LO QUE ESTRENA LA FASE ═══
   *
   * La Frente demostró el otro extremo: un juego que no toca el servidor NI UNA
   * VEZ. Éste demuestra el de enfrente, y hace falta que sea así por una razón
   * que no es de gusto: con mano oculta y sede de dispositivo, el estado entero
   * —las cuatro manos— viviría en los cuatro móviles, y esconder algo en el
   * aparato de quien juega no es esconderlo.
   *
   * Que la sede sea DATO es lo que permite que los dos existan sin que el motor
   * tenga dos modos.
   */
  sede: 'servidor',

  /*
   * ═══ `tickHz: 0`, Y AQUÍ ESTÁ EL NUDO DE LA FASE 2 ═══
   *
   * Un juego por turnos no tiene reloj: nada avanza solo mientras la gente
   * piensa. El §6 del diseño lo pone por escrito al repartir la persistencia por
   * frecuencia —«`tickHz === 0` → escritura síncrona. Riberas, La Ronda y La
   * Larga»— y de ahí sale que cada movimiento de esta mesa se escriba antes de
   * contestar.
   *
   * Y trae el problema que el §5.4 llama «el plazo que no vencía nunca»: con
   * `tickHz: 0` no entra ningún tic por su cuenta, así que un turno con reloj no
   * pasa. La salida no es un temporizador de servidor —rompería la
   * reejecutabilidad— sino que la LECTURA evalúe el plazo y meta el tic. Quien
   * mide el plazo es la mesa, con el reloj de pared; quien dice qué significa
   * que venza es este fichero. Está contado entero arriba.
   */
  tickHz: 0,

  /*
   * Vistas normales: cuatro filas con un contador de cartas, la baza en el
   * centro y la mano abajo. Coste cero de pintado y ni una dependencia nueva.
   * Y es un mueble GENÉRICO, que es lo que permitirá que un arcade de fuera del
   * binario lo use sin estar dentro.
   */
  mueble: 'tablero',

  /*
   * SÍ, Y ES LA RAZÓN DE SER DE ESTE JUEGO DENTRO DEL PLAN. Declararlo `true` no
   * afloja nada: OBLIGA a registrar proyección y `loSecreto`, y sin las dos el
   * servidor no arranca. Ver `exigirSecretosTapados()`, que desde esta fase se
   * llama de verdad en `server/src/index.ts` — hasta ayer existía y no la
   * llamaba nadie, que es la forma más común de que una garantía no exista.
   */
  secretos: true,

  /*
   * ═══ `marcador: 'ninguno'`, CON CUATRO PERSONAS MIRANDO ═══
   *
   * La tentación es `{ tipo: 'cifra', rotulo: 'Bazas' }`: el juego cuenta bazas
   * y las enseña. No es lo mismo. `'ninguno'` no significa «no lleva la cuenta
   * de nada», significa que NO HAY UNA CIFRA QUE LA PLATAFORMA TENGA QUE
   * CREERSE: las bazas se cuentan dentro de esta partida, se ven en la misma
   * pantalla donde se ganaron y no suben a ninguna tabla.
   *
   * De `marcador` se DERIVA la exigencia de reejecutabilidad. Declarar `'cifra'`
   * aquí sería comprometer a la plataforma a verificar un récord, y esta fase no
   * entrega ni repeticiones ni tabla. Prometer una verificación que nadie hace
   * es peor que no prometer nada.
   *
   * NO EXIME DE SER DETERMINISTA: este reductor lo es, y por eso el diario de la
   * mesa se puede reejecutar. Renunciar a verificar una cifra que no existe no
   * es renunciar a la reejecutabilidad.
   */
  marcador: { tipo: 'ninguno' },

  /*
   * ═══ `mecanica-generica`, Y NO `dominio-publico` ═══
   *
   * La Frente eligió `dominio-publico` porque las charadas SON un juego concreto
   * y antiguo, de todos, con sus reglas escritas hace generaciones. Aquí no se
   * está reproduciendo ningún juego concreto: se está usando el patrón común del
   * que salen el tute, la brisca y media docena más —echar una carta por turnos
   * y que la más alta se lleve la baza— sin palo obligado, sin triunfo y sin
   * cantes.
   *
   * `mecanica-generica` es la afirmación exacta, y la exactitud es el criterio
   * que el propio campo pide: los tres valores que no son `'licenciado'` se
   * sostienen porque se pueden comprobar LEYENDO EL JUEGO. Decir
   * `dominio-publico` obligaría a señalar de qué juego de dominio público salen
   * estas reglas, y la respuesta honesta es «de ninguno en concreto».
   */
  procedencia: { tipo: 'mecanica-generica' },
};
