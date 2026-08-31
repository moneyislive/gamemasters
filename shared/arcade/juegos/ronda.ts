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
import type { ContextoMovimiento, Movimiento } from '../movimiento';
import { ESPECTADOR } from '../tipos';
import type { ArcadeId, AsientoId, ManifiestoDeArcade, QuienMira } from '../tipos';

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
): EstadoDeLaRonda {
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
 * a mitad de partida devuelve el estado tal cual, que es lo correcto: es un
 * móvil que mandó dos veces el mismo movimiento, no una petición de volver a
 * barajar.
 *
 * ═══ QUIÉN SE SIENTA LO DICE `ctx.asientos`, Y NO ESTE FICHERO ═══
 *
 * Repartir sitios es AUTORIDAD y vive en el servidor. El reductor los LEE, que
 * es lo que hace falta para repartir cartas y decidir quién empieza. Se copian
 * en el orden en que llegan, que es el orden en que se sentaron, y ese orden es
 * el turno.
 */
function repartir(estado: EstadoDeLaRonda, ctx: ContextoMovimiento): EstadoDeLaRonda {
  if (estado.momento !== 'reuniendo') return estado;
  if (ctx.asientos.length !== JUGADORES) return estado;

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
 */
function echar(
  estado: EstadoDeLaRonda,
  ctx: ContextoMovimiento,
  carta: Carta | null,
): EstadoDeLaRonda {
  if (estado.momento !== 'jugando') return estado;
  if (carta === null) return estado;

  const quienJuega = estado.jugadores[estado.turno];
  if (quienJuega === undefined) return estado;
  if (ctx.quien === null || ctx.quien !== quienJuega.asiento) return estado;
  if (!quienJuega.mano.includes(carta)) return estado;

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

  const quedanCartas = jugadores.some((j) => j.mano.length > 0);
  if (quedanCartas) {
    return { ...estado, jugadores, baza: [], turno, mano: estado.mano + 1 };
  }

  return {
    ...estado,
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
}

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
): VistaDeLaRonda {
  const e = estado ?? partidaNueva();

  const mia =
    quien === ESPECTADOR ? undefined : e.jugadores.find((j) => j.asiento === quien);

  return {
    desde: 'la-ronda',
    momento: e.momento,
    mano: e.mano,
    turnoDe: e.momento === 'jugando' ? (e.jugadores[e.turno]?.asiento ?? null) : null,
    jugadores: e.jugadores.map((j) => ({
      asiento: j.asiento,
      cartas: j.mano.length,
      bazas: j.bazas,
      pasadas: j.pasadas,
    })),
    baza: e.baza.map((c) => ({ asiento: c.asiento, carta: c.carta })),
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
  mueble: 'formulario',

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
