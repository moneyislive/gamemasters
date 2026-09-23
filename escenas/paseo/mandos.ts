/**
 * LOS MANDOS DEL PASEO: de lo que se pulsa a lo que se pide en cada tic.
 *
 * ═══ POR QUÉ ESTO YA NO VIVE EN LAS LINDES ═══
 *
 * Las teclas del paseo se leían en `Lindes.tsx`, de `document`, y en iOS y en Android no hay
 * `document`: en la app NO SE PODÍA ANDAR. No fallaba nada —el efecto miraba si existía y se
 * callaba— y en el escritorio se andaba perfectamente, así que nadie lo veía. Es la regla de
 * la casa al revés: ningún juego sólo para PC, y el paseo lo era.
 *
 * Aquí están las dos manos a la vez: el TECLADO, que lee el gancho del paseo, y la PALANCA y
 * el botón de correr de la app (`app/src/arcade/mandos-del-paseo.tsx`), que llegan de fuera.
 * Las dos acaban en `Mandos`, y a partir de ahí el paseo no sabe con qué se ha pulsado.
 *
 * ═══ LO QUE SE PIDE ES UN RUMBO Y UNA MARCHA, Y NADA MÁS ═══
 *
 * El paso lo da `pasoDelTic` (`shared/mecanicas/andar.ts`), y lo que le entra son dos
 * enteros: un rumbo de 0 a 255 y una marcha. Es lo que un día irá por el cable —«el cliente
 * declara INTENCIÓN, nunca RESULTADO», BOOTS-ON-BOARD §2—, así que se calcula en un solo
 * sitio y sin `three`: el rumbo del tic es el rumbo VISUAL redondeado a 256 —1,4 grados, menos
 * de lo que se nota andando— y hacia atrás es media vuelta más, `+128`.
 *
 * ═══ EL GIRO NO ES DEL TIC: ES DEL FOTOGRAMA ═══
 *
 * Girar mueve la cámara, y una cámara que girase a saltos, veinte veces por segundo, marearía.
 * El rumbo visual es continuo, gira en cada fotograma y no decide nada; lo que decide es su
 * redondeo en el instante del tic.
 *
 * ═══ Y EL GOLPE SE DA, NO SE TIENE PULSADO ═══
 *
 * La refriega de Boots on Board (`shared/mecanicas/canal-de-botas.ts`, «LA REFRIEGA») pide una
 * cosa más: golpear. Andar es un ESTADO —se lleva la W pulsada, se lleva la palanca torcida— y un
 * golpe es un SUCESO: se pulsa una vez y sale uno. Por eso no es una tecla más de `Teclas`, que
 * dice qué se lleva pulsado, sino una CUENTA de pulsaciones: la G en el teclado, que lleva el
 * gancho del paseo, y el botón «Golpear» de la app, que escribe `MandosDeFuera.golpes`. El paseo
 * compara lo pedido con lo que ya salió (`golpesVistosTras`) y pone el golpe en el primer tic que
 * dé; un fotograma sin tics —a 144 por segundo son casi todos— no lo pierde, lo deja para el
 * siguiente.
 *
 * Una cuenta y no un «golpea sí o no» porque en la app escriben DOS manos en la misma referencia:
 * el pulgar de la palanca la reescribe sesenta veces por segundo, y un sí que el otro pulgar dejara
 * entre dos fotogramas lo pisaría el primero. Un número que sólo crece no se pisa: quien escribe la
 * palanca copia los golpes tal cual, y el tipo le obliga, porque el campo no es opcional.
 *
 * Lo que sale de aquí es la INTENCIÓN (`EntradaDelTic.golpe`). Si sale un `golpe` por el canal lo
 * decide el canal —la recarga, estar dentro, no estar caído— y si da a alguien, el servidor.
 */
import { ANDANDO, CORRIENDO, QUIETO, RUMBOS, rumboDeRadianes, rumboValido } from '../../shared/mecanicas/andar';
import type { Marcha } from '../../shared/mecanicas/andar';

/* ─── El teclado ─────────────────────────────────────────────────────────── */

/** Lo que se lleva pulsado en el teclado. */
export interface Teclas {
  readonly adelante: boolean;
  readonly atras: boolean;
  readonly izquierda: boolean;
  readonly derecha: boolean;
  readonly deprisa: boolean;
}

/** Nadie tocando nada. */
export const SIN_TECLAS: Teclas = {
  adelante: false,
  atras: false,
  izquierda: false,
  derecha: false,
  deprisa: false,
};

/**
 * LA TECLA DE GOLPEAR: la G, de «golpear».
 *
 * Elegida por descarte, mirando lo que ya es de alguien en los tres escritorios que se andan: W A
 * S D y las flechas andan, Mayúsculas corre, 1, 2 y 3 son las cámaras de Las Lindes y del Burgo,
 * la R gira la losa de Las Lindes, M, H y O son las cámaras de Riberas y las cifras son el carril
 * de sus opciones. La G no la usa nadie, y se encuentra a ciegas: está en la fila de reposo, a
 * dos teclas de la D, sin soltar la mano de andar. No es el espacio, que es lo primero que se
 * busca: el espacio PULSA el botón que tenga el foco —el de una cámara recién elegida, uno del
 * carril—, y un golpe haría a la vez lo que ese botón hace.
 */
export const TECLA_DE_GOLPEAR = 'g';

/** Cómo se dice, para los carteles de «cómo se anda» de los escritorios: sale de la tecla, así no se separan. */
export const COMO_SE_GOLPEA = `${TECLA_DE_GOLPEAR.toUpperCase()} para golpear`;

/** A qué va una tecla del paseo: a un mando que se lleva pulsado, o a un golpe, que se da al pulsar. */
export type MandoDeLaTecla = keyof Teclas | 'golpe';

/**
 * A QUÉ MANDO VA UNA TECLA, o `null` si no es del paseo.
 *
 * W A S D y las flechas, y Mayúsculas para correr: lo que busca a ciegas quien ya ha jugado a
 * algo. Se compara en minúsculas porque con Mayúsculas pulsada la W llega como `W`, y correr
 * hacia delante —la combinación más corriente del paseo— dejaba de andar. Y la G golpea (ver
 * `TECLA_DE_GOLPEAR`), también corriendo.
 */
export function teclaDelPaseo(tecla: string): MandoDeLaTecla | null {
  const k = tecla.toLowerCase();
  if (k === 'w' || k === 'arrowup') return 'adelante';
  if (k === 's' || k === 'arrowdown') return 'atras';
  if (k === 'a' || k === 'arrowleft') return 'izquierda';
  if (k === 'd' || k === 'arrowright') return 'derecha';
  if (k === 'shift') return 'deprisa';
  if (k === TECLA_DE_GOLPEAR) return 'golpe';
  return null;
}

/** Lo que el paseo necesita saber de a quién iba una tecla: sin DOM, para poder probarlo en Node. */
export interface DestinoDeLaTecla {
  readonly tagName?: string;
  readonly isContentEditable?: boolean;
}

/**
 * ¿ES ESTA TECLA DE OTRO? Sí si va a algo donde se ESCRIBE —un campo, un área de texto, un
 * desplegable, algo editable— o si lleva Ctrl, Alt o Meta.
 *
 * El paseo escucha en todo el documento y se quedaba con W, A, S, D y las flechas con
 * `preventDefault`: mientras alguien andaba, esas letras no se podían escribir en ningún campo
 * de la pantalla —un trato, un nombre—, y las flechas no movían el cursor. Y Ctrl+A, Ctrl+D o
 * Alt+flecha son atajos del navegador o del sistema, no pasos.
 */
export function esTeclaDeOtro(
  destino: DestinoDeLaTecla | null | undefined,
  conModificador: boolean,
): boolean {
  if (conModificador) return true;
  if (destino === null || destino === undefined) return false;
  if (destino.isContentEditable === true) return true;
  const etiqueta = (destino.tagName ?? '').toUpperCase();
  return etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || etiqueta === 'SELECT';
}

/**
 * ¿ES ESTE `keydown` UN GOLPE? La G, pulsada ahora —no la repetición que manda el teclado mientras
 * se mantiene, que golpearía en ráfaga con un dedo apoyado—, y que no sea de otro: una G que se
 * escribe en un campo es una letra, y Ctrl+G es un atajo del navegador.
 */
export function esUnGolpe(
  tecla: string,
  destino: DestinoDeLaTecla | null | undefined,
  conModificador: boolean,
  repetida: boolean,
): boolean {
  return teclaDelPaseo(tecla) === 'golpe' && !repetida && !esTeclaDeOtro(destino, conModificador);
}

/* ─── Lo que llega de fuera: la palanca de la app ────────────────────────── */

/**
 * LA PALANCA Y EL BOTÓN DE CORRER, como los deja la app en una referencia.
 *
 * Por referencia y no por estado de React: son sesenta cambios por segundo mientras el pulgar
 * se mueve, y la escena los lee en su propio bucle. Pasarlos por React repintaría la pantalla
 * entera para mover a un muñeco.
 */
export interface MandosDeFuera {
  /** De −1 a 1 en los dos ejes: `x` hacia la derecha y `y` hacia DELANTE. */
  readonly palanca: { readonly x: number; readonly y: number };
  readonly deprisa: boolean;
  /**
   * CUÁNTAS VECES SE HA PULSADO «GOLPEAR» desde que se montaron los mandos: sólo crece, y vuelve a
   * cero al dejar de andar. No es opcional a propósito: quien reescribe la referencia —la palanca,
   * el correr— tiene que copiarla, y sin copiarla el tipo no compila. Ver la cabecera.
   */
  readonly golpes: number;
}

/** La palanca suelta, sin correr y sin golpes. */
export const SIN_MANDOS_DE_FUERA: MandosDeFuera = { palanca: { x: 0, y: 0 }, deprisa: false, golpes: 0 };

/**
 * LO QUE LA PALANCA NO CUENTA, en fracción de su recorrido.
 *
 * Un pulgar que descansa sobre la palanca no está quieto: tiembla, y un cuarto de recorrido es
 * lo que hace falta para que ni el temblor ni un roce al levantarlo echen a andar a nadie.
 */
export const ZONA_MUERTA = 0.25;

/** Un eje de la palanca sin la zona muerta, reescalado para que el borde siga valiendo uno. */
function fueraDeLaZonaMuerta(v: number): number {
  if (!Number.isFinite(v)) return 0;
  const a = Math.min(1, Math.abs(v));
  if (a <= ZONA_MUERTA) return 0;
  return (Math.sign(v) * (a - ZONA_MUERTA)) / (1 - ZONA_MUERTA);
}

/* ─── Lo que se pide en un fotograma ─────────────────────────────────────── */

/** Lo que se pide en un fotograma, con las dos manos sumadas. */
export interface Mandos {
  /** Hacia delante (1), hacia atrás (−1) o nada (0). */
  readonly avance: -1 | 0 | 1;
  /** Cuánto se gira, de −1 (a la izquierda) a 1 (a la derecha). */
  readonly giro: number;
  readonly deprisa: boolean;
  /** Si hay un golpe pedido que todavía no ha salido en ningún tic: sale en el primero que se dé. */
  readonly golpe: boolean;
}

/** Nada pedido. */
export const SIN_MANDOS: Mandos = { avance: 0, giro: 0, deprisa: false, golpe: false };

/**
 * LAS DOS MANOS, SUMADAS.
 *
 * Como en un mando de coche y no como en un ratón: la palanca hacia delante anda y hacia un
 * lado gira, lo mismo que W y A. Es a propósito: la cámara va pegada a la espalda de quien
 * anda, así que «hacia donde apunta la palanca» y «hacia donde miro» son la misma cosa, y un
 * esquema que moviera hacia la palanca haría girar la cámara sin fin en cuanto el pulgar se
 * torciera un poco.
 *
 * Adelante y atrás a la vez se anulan, venga de donde venga cada uno.
 *
 * `golpe` no sale de las teclas ni de la palanca, que dicen lo que se lleva pulsado: lo pone
 * quien lleva la cuenta de las pulsaciones (`golpesVistosTras`, en el gancho del paseo).
 */
export function mandosDelFotograma(teclas: Teclas, fuera: MandosDeFuera, golpe = false): Mandos {
  const palancaY = fueraDeLaZonaMuerta(fuera.palanca.y);
  const hacia = (teclas.adelante ? 1 : 0) - (teclas.atras ? 1 : 0) + Math.sign(palancaY);
  const avance: -1 | 0 | 1 = hacia > 0 ? 1 : hacia < 0 ? -1 : 0;
  const giro = Math.max(
    -1,
    Math.min(1, (teclas.derecha ? 1 : 0) - (teclas.izquierda ? 1 : 0) + fueraDeLaZonaMuerta(fuera.palanca.x)),
  );
  return { avance, giro, deprisa: teclas.deprisa || fuera.deprisa, golpe };
}

/* ─── Los golpes: pedidos y vistos ───────────────────────────────────────── */

/**
 * LOS GOLPES QUE QUEDAN VISTOS TRAS UN FOTOGRAMA.
 *
 * `pedidos` es la suma de las dos cuentas —la G y el botón— y `vistos`, lo que ya se había dado
 * por visto. Hay un golpe pendiente mientras `pedidos > vistos`; sale en el primer tic de un
 * fotograma (`fotogramaDelPaseo`), y entonces se dan por vistos todos los pedidos —diez toques en
 * un fotograma son UN golpe: la recarga del canal no dejaría salir más—. Si el fotograma no dio
 * ningún tic, el golpe espera al siguiente. Y si la cuenta BAJA —la app suelta los mandos al dejar
 * de andar y vuelve a cero—, se da por visto lo que haya: un número que baja no es un golpe.
 */
export function golpesVistosTras(pedidos: number, vistos: number, dioTics: boolean): number {
  return pedidos <= vistos || dioTics ? pedidos : vistos;
}

/* ─── El giro, por fotograma ─────────────────────────────────────────────── */

/** Lo deprisa que gira quien anda, en radianes por segundo: lo que tenía el paseo de siempre. */
export const GIRO_POR_SEGUNDO = 2.6;

/**
 * EL MAYOR SALTO DE TIEMPO QUE CUENTA PARA GIRAR, en segundos.
 *
 * Un fotograma de medio segundo —el navegador estaba en otra pestaña— no puede dar media vuelta
 * de golpe a quien lleva la A pulsada. Es la misma décima que tenía el paseo de siempre.
 */
export const TOPE_DEL_GIRO = 0.1;

/**
 * EL RUMBO VISUAL DESPUÉS DE UN FOTOGRAMA.
 *
 * El rumbo de la casa: cero al norte —la `z` negativa— y creciendo hacia el este. Se guarda en
 * (−π, π] para que no crezca sin fin en una sesión larga.
 */
export function girar(rumbo: number, mandos: Mandos, dt: number): number {
  const paso = Number.isFinite(dt) && dt > 0 ? Math.min(dt, TOPE_DEL_GIRO) : 0;
  let r = rumbo + mandos.giro * GIRO_POR_SEGUNDO * paso;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r <= -Math.PI) r += Math.PI * 2;
  return r;
}

/* ─── Lo que se pide en un tic ───────────────────────────────────────────── */

/** Lo que se pide en un tic: los dos enteros que come `pasoDelTic`. */
export interface PedidoDelTic {
  /** De 0 a 255. */
  readonly rumbo: number;
  readonly marcha: Marcha;
}

/** Lo pedido en un tic con su número: lo que leería una capa de red. */
export interface EntradaDelTic extends PedidoDelTic {
  /** El número del tic, consecutivo desde que se nace. El primero es el 1. */
  readonly tic: number;
  /**
   * HACIA DÓNDE MIRA, de 0 a 255: el rumbo visual del fotograma, cuantizado. No es `rumbo`, que es
   * hacia dónde se da el PASO y andando hacia atrás lleva media vuelta de más. Es lo que viaja por
   * el canal como `r`: con el rumbo del paso, los demás verían a quien retrocede darse la vuelta y
   * andar de frente, y un golpe «hacia donde miro» no tendría de dónde salir.
   */
  readonly mira: number;
  /**
   * SI EN ESTE TIC SE GOLPEA. Lo pedido y nada más: si sale un `golpe` por el canal —con este tic y
   * esta `mira`— lo decide el canal, y si da a alguien, el servidor. Ver la cabecera.
   */
  readonly golpe: boolean;
}

/**
 * LO QUE SE PIDE EN UN TIC, con el rumbo visual del momento.
 *
 * Hacia atrás es el mismo rumbo con media vuelta —`+128`— y no un signo en la velocidad: el
 * paso por tics sólo sabe andar hacia su rumbo, y así lo que viaja sigue siendo un rumbo y una
 * marcha, sin un tercer campo que alguien pueda olvidarse de validar.
 */
export function pedidoDelTic(mandos: Mandos, rumboVisual: number): PedidoDelTic {
  const adelante = rumboDeRadianes(rumboVisual);
  if (mandos.avance === 0) return { rumbo: adelante, marcha: QUIETO };
  const marcha: Marcha = mandos.deprisa ? CORRIENDO : ANDANDO;
  return { rumbo: mandos.avance > 0 ? adelante : rumboValido(adelante + RUMBOS / 2), marcha };
}
