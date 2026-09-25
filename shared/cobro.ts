/**
 * El cobro: lo que ven los dos lados.
 *
 * ═══ LA UNIDAD ES EL CRÉDITO, Y CIEN CRÉDITOS SON UN EURO ═══
 *
 * Se paga en euros y se gasta en créditos. El crédito existe por una razón: una
 * velada no cuesta siempre lo mismo —siete personas con el modelo de la casa no
 * son doce con Fable—, y la suscripción tiene que poder «incluir varias
 * veladas» sin decir cuáles. Con créditos, la suscripción trae una bolsa al mes y
 * cada velada gasta lo que cuesta. Y para no esconder el precio detrás de una
 * moneda inventada, la equivalencia es la más tonta posible: 599 créditos son
 * 5,99 €.
 *
 * ═══ EL SALDO SALE DEL LIBRO, NO SE GUARDA ═══
 *
 * Cada entrada y cada salida es un movimiento con fecha, y el saldo es la suma.
 * No hay un campo `saldo` que se pueda desincronizar del historial: si alguien
 * pregunta por qué tiene lo que tiene, la respuesta es la lista.
 */

/** Cien créditos son un euro. Ver la cabecera. */
export const CREDITOS_POR_EURO = 100;

export type TipoDeMovimiento =
  /** Créditos comprados sueltos. No caducan. */
  | 'compra'
  /** La bolsa del mes de la suscripción. Caduca al renovar. */
  | 'suscripcion'
  /** Una velada, o algo que se cobra aparte. */
  | 'cargo'
  /** Lo que se devuelve: una velada que no salió, o un cargo de más. */
  | 'reembolso'
  /** Lo que queda de la bolsa del mes cuando empieza la siguiente. */
  | 'caducidad'
  /** Regalos y ajustes a mano de quien administra. */
  | 'regalo';

export interface MovimientoDeSaldo {
  id: string;
  cuentaId: string;
  tipo: TipoDeMovimiento;
  /** Positivo entra, negativo sale. En créditos. */
  creditos: number;
  /** Para leerlo en el historial: «Velada “Villa CASAS” · 7 jugadores». */
  concepto: string;
  gameId?: string;
  /**
   * Lo que lo hace único fuera de aquí: el id del pago en la pasarela, o
   * `velada:<gameId>:<n>`. Con él, un aviso de pago que llega dos veces —las
   * pasarelas reintentan— no suma dos veces.
   */
  referencia?: string;
  el: string;
}

/** La suscripción de una cuenta, tal como la dejó el último aviso de la pasarela. */
export interface SuscripcionDeLaCuenta {
  estado: 'activa' | 'impagada' | 'cancelada';
  /** Hasta cuándo está pagada. Pasada esta fecha sin renovar, ya no cuenta. */
  hasta: string;
  /** Si renueva sola al llegar a `hasta` o se acaba ahí (baja pedida). */
  renueva: boolean;
  /** Id de la suscripción en la pasarela, para el portal y los avisos. */
  referencia?: string;
}

/** El pase de temporada de la Sala de Arcade. */
export interface PaseDeTemporada {
  /** `2026-T4`: año y trimestre. */
  temporada: string;
  hasta: string;
  /** De dónde viene: comprado suelto o incluido en la suscripción. */
  via: 'compra' | 'suscripcion';
}

/** Lo que se guarda en la cuenta sobre el cobro. Todo opcional: las de antes no lo tienen. */
export interface CobroDeLaCuenta {
  /** Id de cliente en la pasarela, para no crear uno nuevo en cada compra. */
  clientePasarela?: string;
  suscripcion?: SuscripcionDeLaCuenta;
  pases?: PaseDeTemporada[];
}

/** Lo que el taller necesita saber para pintar el monedero. */
export interface EstadoDelMonedero {
  /** ¿Se cobra en esta instalación? Si no, todo lo demás sobra y no se pinta. */
  cobroActivo: boolean;
  saldo: number;
  /** Cuánto de ese saldo es de la bolsa del mes, que caduca al renovar. */
  delMes: number;
  suscripcion?: SuscripcionDeLaCuenta;
  pase?: PaseDeTemporada;
  /** Lo que se puede comprar, con su precio: para pintar los botones. */
  ofertas: OfertaDeCobro[];
  movimientos: MovimientoDeSaldo[];
}

export interface OfertaDeCobro {
  id: 'velada' | 'bolsa-chica' | 'bolsa-grande' | 'suscripcion' | 'pase';
  nombre: string;
  descripcion: string;
  /** Céntimos de euro, IVA incluido. */
  precioCentimos: number;
  /** Créditos que da, si da créditos. */
  creditos?: number;
  /** `mes` para la suscripción; ausente si es un pago suelto. */
  periodo?: 'mes' | 'temporada';
}

/** Un paso de la velada en el presupuesto, para el desglose de «opciones avanzadas». */
export interface PasoPresupuestado {
  paso: string;
  /** Lo que se espera: tokens de entrada y de salida (lo pensado va en la salida). */
  entrada: number;
  salida: number;
  llamadas: number;
  costeUsd: number;
}

/**
 * Lo que va a costar una velada ANTES de generarla. Es una estimación: lo que
 * se cobra es esto, y si luego sale más cara, la diferencia la pone la casa.
 */
export interface PresupuestoDeVelada {
  creditos: number;
  /** El mismo precio en céntimos de euro, para quien no piensa en créditos. */
  centimos: number;
  modelo: string;
  esfuerzo: string;
  desglose: PasoPresupuestado[];
  costeUsd: number;
  /** Lo que la velada trae incluido sin volver a pagar: ver `INCLUIDO_EN_LA_VELADA`. */
  incluye: string[];
}

/**
 * CÓMO SE VA A JUGAR LA VELADA. Se elige antes de generar, y el taller lo
 * recuerda en la confirmación.
 *
 * En CLUEDO la trama y su material los usan los dos modos casi por igual —los
 * dosieres en papel, el móvil en la app—, así que el modo NO cambia lo que se
 * escribe: cambia lo que se usa durante la partida. Con app hay Mayordomo, que
 * contesta preguntas con el modelo; en papel no. Por eso el precio con app es
 * algo mayor, y por eso pasar de app a papel no cuesta nada y de papel a app
 * cuesta solo el Mayordomo.
 */
export type ModoDeJuego = 'papel' | 'app';

/** Lo que una velada trae incluido y se ha gastado ya. */
export interface UsosDeLaVelada {
  regeneraciones: number;
  actualizaciones: number;
  reescriturasDeMaterial: number;
  revisiones: number;
  turnosDeAsistente: number;
}

/**
 * Lo cobrado por una velada, guardado en la propia partida.
 *
 * Existe para que pagar una velada sea pagarla UNA vez: la partida sabe que está
 * pagada, qué modo se pagó y cuánto se ha usado de lo incluido, y las
 * operaciones de después —actualizar, reescribir el material, revisar, charlar
 * con el asistente— lo consultan antes de cobrar nada.
 */
export interface CobroDeLaVelada {
  /** Quién pagó. Ausente si la velada es de la casa (no se cobra). */
  cuentaId?: string;
  exenta: boolean;
  modo: ModoDeJuego;
  /** Créditos netos cobrados por la velada: cargos menos reembolsos. */
  creditos: number;
  /** Los movimientos del monedero que la tocan, para poder explicarla. */
  movimientos: string[];
  usos: UsosDeLaVelada;
  el: string;
}

/** Lo que contesta `POST /games/:id/presupuesto`: lo que enseña la confirmación. */
export interface RespuestaDelPresupuesto {
  presupuesto: PresupuestoDeVelada;
  /** ¿Se le cobra a quien pregunta? Si no, el taller no enseña precios. */
  cobra: boolean;
  saldo?: number;
  /** Si la velada ya está pagada, en qué modo y si le queda la regeneración incluida. */
  pagada?: { modo: ModoDeJuego; regeneracionIncluida: boolean };
}

/** Lo que viaja con la orden de generar: lo que se confirmó. */
export interface ConfirmacionDeVelada {
  modo: ModoDeJuego;
  model?: string;
  esfuerzo?: string;
  /** El precio que se enseñó: si al cobrar sale más caro, no se cobra. */
  creditosVistos?: number;
}
