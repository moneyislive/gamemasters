/**
 * Identidad: quién eres en la plataforma, más allá de una velada.
 *
 * POR QUÉ VA APARTE DE `live.ts`. Aquél es el contrato de UNA PARTIDA en curso
 * —fases, rondas, acusaciones— y se vacía cuando la velada termina. La
 * identidad es justamente lo contrario: lo que sobrevive a las partidas y las
 * enhebra. Mezclarlas haría que cada cambio en el juego tocara el modelo de
 * usuarios, y al revés.
 *
 * LA IDEA QUE SOSTIENE TODO ESTO. Hay dos maneras muy distintas de que el
 * servidor sepa tu correo, y confundirlas es el error que hay que evitar:
 *
 *   - Alguien lo TECLEÓ al montar una partida. Es una invitación. No prueba
 *     nada: puede ser una errata, o el correo de un conocido.
 *   - Un proveedor de identidad DEMOSTRÓ que ese buzón es tuyo.
 *
 * Solo lo segundo puede abrir una puerta. Lo primero solo sirve para avisarte
 * de que te esperan. `NivelDeCorreo` es ese matiz hecho tipo, para que no se
 * pueda olvidar por descuido en la línea de código número doscientos.
 */

/** Quién avala una identidad. */
export type ProveedorId = 'google' | 'apple';

export interface IdentidadDeProveedor {
  proveedor: ProveedorId;
  /**
   * El identificador estable que da el proveedor (`sub`). NUNCA el correo.
   *
   * Google lo dice expresamente en su documentación —hay que usar `sub`, no el
   * correo— y Apple lo hace directamente inviable: con «Ocultar mi correo» la
   * dirección es un alias por aplicación que cambia si se revoca el acceso.
   * Atar la cuenta al correo significaría perderla el día que alguien cambie de
   * dirección, o —peor— entregársela a quien herede esa dirección después.
   */
  sub: string;
  /** El correo tal como lo dio el proveedor, ya normalizado. */
  correo?: string;
  /**
   * ¿El proveedor afirma haber verificado el buzón?
   *
   * Se guarda ya resuelto a booleano porque los proveedores no se ponen de
   * acuerdo: unos lo mandan como booleano y otros como la cadena «true».
   */
  correoVerificado: boolean;
  /**
   * Es una dirección de reenvío privada (el `@privaterelay.appleid.com` de
   * «Ocultar mi correo»).
   *
   * Importa porque NO sirve para casar invitaciones: quien organiza escribió el
   * correo de verdad de esa persona, y el alias no se le parece en nada.
   */
  esRelay: boolean;
  /**
   * El nombre, si el proveedor lo dio.
   *
   * Apple solo lo manda LA PRIMERA VEZ que alguien entra. Si no se guarda en esa
   * misma escritura, no vuelve nunca: no hay forma de volver a pedirlo.
   */
  nombre?: string;
  vinculadaEl: string;
  vistaEl: string;
}

/**
 * Hasta dónde llega la prueba de que un correo es de quien dice.
 *
 * `invitacion`: lo tecleó un tercero al montar una partida. Sirve para avisar.
 * `buzon`: un proveedor demostró el buzón. Es el único que abre puertas.
 */
export type NivelDeCorreo = 'invitacion' | 'buzon';

export interface CorreoDeCuenta {
  correo: string;
  nivel: NivelDeCorreo;
  origen: ProveedorId | 'confirmacion';
  esRelay?: boolean;
  anadidoEl: string;
}

/**
 * El pasaporte de una sesión de cuenta.
 *
 * NO autoriza a jugar, y esto es deliberado: lo único que autoriza a jugar es
 * la credencial de jugador, que va atada a la apertura concreta de una partida
 * (su `sid`) y por eso se puede revocar cerrando y reabriendo la mesa. Un
 * pasaporte de cuenta solo sirve para pedir una credencial por la vía normal.
 */
export interface SesionDeCuenta {
  cuentaId: string;
  /** Con qué proveedor se entró, para poder revocar uno sin tocar el otro. */
  via: ProveedorId;
  iat: number;
  exp: number;
}
