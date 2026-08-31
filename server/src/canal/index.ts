/**
 * EL CANAL: cómo se entera un dispositivo de que la mesa ha cambiado.
 *
 * ═══ POR QUÉ ESTA CARPETA EXISTE, SI `hub.ts` YA HACE ESTO ═══
 *
 * Porque `hub.ts` es de veladas y no se puede tocar, y porque el arcade
 * necesita exactamente lo mismo que hace de hecho, pero sin heredar su
 * vocabulario ni su calendario.
 *
 * La extracción no cambia una línea de `hub.ts`: se le pone una interfaz
 * delante. `sondeo.ts` es el adaptador, y el día que exista un canal continuo
 * será otro fichero al lado que implemente estos mismos cinco verbos. Esa es la
 * prueba de que no hay dos arquitecturas: si un canal rápido obligara a cambiar
 * el contrato, no sería un timbre más rápido — sería otro protocolo.
 *
 * ═══ POR QUÉ SE LLAMA `canal/` Y NO `reparto/` ═══
 *
 * En este repositorio «reparto» ya significa QUÉ JUEGOS ESTÁN INSTALADOS, y está
 * anclado en tres sitios: el comprobador `verify:reparto`, el
 * `Symbol.for('gamemasters.juegos.reparto')` y el filtro de instalados. Una
 * misma palabra significando dos cosas incompatibles en el mismo árbol es deuda
 * de vocabulario en un proyecto cuya disciplina entera es que las palabras
 * signifiquen una cosa.
 *
 * ═══ Y POR QUÉ SON CINCO Y NO CUATRO ═══
 *
 * El quinto es `olvidar`, y es el que se cae de las listas. En veladas se llama
 * al borrar una partida —un suceso raro, de una partida que ha durado una
 * noche—. En arcade las mesas son CORTAS Y NUMEROSAS: una partida de un minuto,
 * cientos a la vez. `esperas` y `avisos` son `Map` de ámbito de módulo, o sea
 * memoria del proceso, y sin `olvidar` crecen sin techo hasta que Render mata la
 * instancia por memoria. No es una hipótesis: es aritmética.
 *
 * ═══ Y POR QUÉ AHORA SON SEIS: EL PLAZO QUE NO VENCÍA NUNCA ═══
 *
 * El sexto lo trae la fase 2 y estaba NOMBRADO Y NO DISEÑADO en el §12 del
 * documento. El problema, entero, en cuatro frases:
 *
 *   · Un juego por turnos declara `tickHz: 0`, así que nadie le mete tics.
 *   · Un turno con plazo necesita que ALGO entre por el reductor para vencer, y
 *     la salida acordada no es un temporizador de servidor —rompería la
 *     reejecutabilidad— sino que la LECTURA evalúe el plazo y meta el tic.
 *   · Pero una lectura puede estar APARCADA veinticinco segundos dentro de
 *     `esperarCambio`, y un plazo que vence dentro de esa ventana no despierta a
 *     nadie: `avisarCambio` solo lo llama quien escribe, y aquí no escribe nadie
 *     porque justamente el problema es que nadie se mueve.
 *   · Resultado sin el sexto verbo: el plazo vence hasta veinticinco segundos
 *     tarde, y con varias vueltas seguidas de sondeo la mesa se queda quieta
 *     mucho más de lo que el juego prometió.
 *
 * `despertarAlVencer` es la respuesta, y lo que la hace aceptable es lo que NO
 * hace: no toca ningún estado, no mete ningún movimiento y no sabe qué es una
 * partida. Lo único que hace es soltar una espera aparcada para que la LECTURA
 * —que sigue siendo la única puerta, bajo el mismo candado— evalúe el plazo como
 * si el móvil acabara de preguntar. La reejecutabilidad no se toca: el tic lo
 * mete la lectura y queda en el diario, exactamente igual que si hubiera llegado
 * un movimiento.
 */

/**
 * Un aviso efímero: lo que la app celebra con animación y vibración.
 *
 * ═══ `clave` ES UNA CADENA, Y ESO ES UNA DECISIÓN ═══
 *
 * En veladas la clave es `AvisoClave`, una unión cerrada con los nombres de los
 * sucesos de una velada. Reutilizarla aquí significaría importar `shared/live`,
 * que es la frontera que `verify:fronteras` vigila — y además obligaría a que un
 * arcade avisara de sus cosas con el vocabulario de un misterio de salón, o a
 * ampliar el contrato común cada vez que un minijuego tuviera un suceso propio.
 * Eso último es exactamente el peaje que `LivePhase` cobró durante meses.
 *
 * El precio de la cadena libre es que el compilador no caza una clave mal
 * escrita. Se acepta: una clave que no reconoce el mueble se pinta como un aviso
 * neutro, mientras que una unión cerrada obliga a venir aquí a añadir un renglón
 * por cada juego nuevo.
 */
export interface AvisoDeMesa {
  clave: string;
  texto: string;
}

/**
 * LOS SEIS VERBOS. Es todo lo que un canal tiene que saber hacer.
 *
 * No hay `suscribirse`, ni `emitir`, ni `sala`, ni nada que suene a WebSocket, y
 * eso es deliberado: si el contrato tuviera forma de conexión permanente, el
 * sondeo largo de hoy sería una implementación forzada del contrato de mañana en
 * vez de al revés. Estos cinco son lo que el sondeo hace de verdad, y un canal
 * continuo los puede cumplir todos sin esfuerzo.
 *
 * La corrección NO depende de que los avisos lleguen. Es la tercera razón de la
 * cabecera de `hub.ts` y es la que hay que conservar con las dos manos: si se
 * pierde un aviso, la siguiente petición trae el estado completo. Un canal que
 * exigiera entrega fiable sería un canal que no se puede degradar.
 *
 * Y esa regla alcanza también al sexto: si un despertar por vencimiento se
 * pierde, el plazo vence en la siguiente lectura y no pasa nada más que unos
 * segundos de retraso. Un verbo cuyo fallo fuera irrecuperable no cabría en este
 * contrato.
 */
export interface Canal {
  /**
   * Espera a que la mesa cambie.
   *
   * `true` si hubo cambio, `false` si se agotó el plazo — y entonces el
   * dispositivo vuelve a preguntar, que es lo normal y no un error.
   */
  esperarCambio(mesa: string): Promise<boolean>;

  /** Despierta a todos los que esperaban cambios en esta mesa. */
  avisarCambio(mesa: string): void;

  /** Registra un aviso efímero y despierta a quien estuviera esperando. */
  anunciar(mesa: string, rev: number, aviso: AvisoDeMesa, aQuien?: string): void;

  /**
   * Los avisos posteriores a una revisión, para un asiento concreto.
   *
   * `null` en `quien` es quien mira la mesa sin ocupar sitio, y recibe solo los
   * que no van dirigidos a nadie.
   */
  avisosDesde(mesa: string, desdeRev: number, quien: string | null): AvisoDeMesa[];

  /**
   * EL SEXTO VERBO. Despierta a quien espere en esta mesa dentro de tantos ms.
   *
   * Lo llama quien va a aparcar una lectura sabiendo que hay un plazo que vence
   * antes de que se agote la espera. Al saltar, hace exactamente lo mismo que
   * `avisarCambio`: soltar a los que esperan en ESA mesa, para que su lectura
   * vuelva a pasar por el candado y evalúe el plazo.
   *
   * ═══ LAS TRES REGLAS QUE LO HACEN BARATO ═══
   *
   *  1. ES POR MESA, NO GLOBAL. Un solo despertador para todo el proceso
   *     soltaría a las cuatrocientas mesas cada vez que venciera un plazo de una,
   *     que es exactamente lo que el §12 del diseño dejaba sin resolver —«no se
   *     sabe cómo evita despertar a todo el mundo cada vez»—. Con la mesa por
   *     delante, quien se despierta es quien tenía el plazo.
   *  2. HAY UNO SOLO POR MESA, Y GANA EL MÁS CERCANO. Cuatro móviles sondeando
   *     la misma mesa lo piden cuatro veces con el mismo vencimiento; se queda el
   *     primero. Sin esta regla, cada vuelta de sondeo dejaría un temporizador
   *     nuevo y una mesa quieta acumularía uno por móvil y por vuelta.
   *  3. ES UNA PISTA, NO UNA PROMESA. Que salte tarde, o que no salte, solo
   *     cuesta que el plazo venza en la siguiente lectura. Ningún estado depende
   *     de él, y por eso no rompe la reejecutabilidad ni sobrevivir a un
   *     despliegue le importa a nadie.
   *
   * Un `dentroDeMs` negativo o cero significa «ya ha vencido»: se despierta en
   * cuanto se pueda, sin esperar. No se hace en el acto y a propósito, porque
   * quien llama está a punto de aparcar su propia espera y despertarla ANTES de
   * que exista sería no despertarla.
   */
  despertarAlVencer(mesa: string, dentroDeMs: number): void;

  /** Se acabó esta mesa: se suelta todo lo suyo. */
  olvidar(mesa: string): void;
}

/**
 * EL CANAL QUE LANZA. Es el que hay puesto mientras nadie instale otro.
 *
 * ═══ POR QUÉ EL RESPALDO NO ES «NO HACER NADA» ═══
 *
 * Un canal mudo que se tragara las llamadas dejaría un servidor donde las mesas
 * funcionan y nadie se entera de nada, sin un solo error. Ese es el modo de
 * fallo favorito de este repositorio y el que más caro ha salido siempre: el que
 * no falla.
 *
 * Y hay un segundo uso, que es el que lo hace valioso de verdad: un arcade con
 * `sede: 'dispositivo'` tiene que poder jugarse ENTERO con esto puesto. Si una
 * sola llamada asoma, salta. Eso es más fuerte que declarar un transporte
 * «ninguno» en un manifiesto, porque no comprueba una intención sino un hecho —y
 * es el mismo mecanismo que usará `verify:sin-red` en su fase.
 */
export const CANAL_QUE_LANZA: Canal = {
  esperarCambio(mesa) {
    return Promise.reject(sinCanal('esperarCambio', mesa));
  },
  avisarCambio(mesa) {
    throw sinCanal('avisarCambio', mesa);
  },
  anunciar(mesa) {
    throw sinCanal('anunciar', mesa);
  },
  avisosDesde(mesa) {
    throw sinCanal('avisosDesde', mesa);
  },
  despertarAlVencer(mesa) {
    throw sinCanal('despertarAlVencer', mesa);
  },
  olvidar(mesa) {
    throw sinCanal('olvidar', mesa);
  },
};

function sinCanal(verbo: string, mesa: string): Error {
  const error = new Error(
    `Se ha llamado a \`${verbo}\` sobre la mesa «${mesa}» y no hay ningún canal instalado. ` +
      'O falta un `ponerCanal(canalDeSondeo)` en el arranque, o este arcade es de dispositivo ' +
      'y no debería estar tocando la red.',
  );
  error.name = 'SinCanal';
  return error;
}

/**
 * El canal instalado, ANCLADO AL ÁMBITO GLOBAL.
 *
 * Por lo mismo que los registros de `shared/`: este módulo se puede cargar dos
 * veces según por qué ruta se importe, y con una variable de módulo el arranque
 * instalaría el canal en una copia mientras las mesas leerían la otra — o sea,
 * un servidor con el canal puesto que se comporta como si no lo tuviera. Ya
 * ocurrió una vez con las altas de juegos y costó una tarde encontrarlo.
 */
const LLAVE = Symbol.for('gamemasters.arcade.canal');
const global_ = globalThis as unknown as Record<symbol, Canal | undefined>;

/** Instala el canal. Lo llama el arranque, una vez. */
export function ponerCanal(canal: Canal): void {
  global_[LLAVE] = canal;
}

/** Quita el canal. Vuelve al que lanza. Para las pruebas. */
export function quitarCanal(): void {
  global_[LLAVE] = undefined;
}

/** El canal de este proceso. El que lanza si nadie ha instalado otro. */
export function elCanal(): Canal {
  return global_[LLAVE] ?? CANAL_QUE_LANZA;
}
