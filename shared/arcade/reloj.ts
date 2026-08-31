/**
 * EL TIEMPO, y por qué es un número entero y no una fecha.
 *
 * ═══ EL PROBLEMA QUE RESUELVE ═══
 *
 * En las veladas no avanza nada solo: las fases las cierra quien dirige, y esa
 * es una decisión buena porque hay un Game Master mirando la mesa. Aquí no lo
 * hay. «La Frente» dura sesenta segundos y esos sesenta segundos SON la regla:
 * si nadie los cuenta, no hay juego.
 *
 * La solución evidente —un `setTimeout` en el servidor que cierre la ronda
 * cuando toque— resolvería el síntoma y rompería lo que se acaba de comprar en
 * `motor.ts`. Un plazo que vence FUERA del reductor es un cambio de estado que
 * no está en el registro de movimientos, así que reejecutar la partida da otro
 * resultado, así que la repetición deja de valer y con ella el marcador.
 * Además, un temporizador de servidor no sobrevive a un despliegue de Render, y
 * cada despliegue reemplaza la instancia.
 *
 * ═══ LA DECISIÓN: EL TIC ES UN MOVIMIENTO MÁS ═══
 *
 * El tiempo entra por la misma puerta que un toque en la pantalla. Con eso, el
 * bucle de fotogramas de un arcade a 60 Hz, la cuenta atrás de una ronda de
 * fiesta y la caducidad de una oferta de trueque son EL MISMO MECANISMO a
 * distinta frecuencia, y ninguno de los tres necesita una rama propia.
 *
 * Y la consecuencia que más se nota: una partida reejecutada seis meses después,
 * en otro huso horario y en otro motor de JavaScript, da exactamente lo mismo.
 * No hay instantes, no hay fechas, no hay husos. Hay un contador.
 *
 * ═══ LO QUE ESTE FICHERO NO HACE, Y CONVIENE SABERLO ═══
 *
 * No reparte tics. No hay aquí ningún temporizador, ni lo habrá: `tickHz` del
 * manifiesto declara A QUÉ RITMO hay que meterlos, y quien los mete es quien
 * hospeda la partida —el bucle de fotogramas del móvil, o el servidor en su
 * fase—. Esto es el vocabulario, no el servicio.
 */
import type { Movimiento } from './movimiento';

/**
 * Un instante, contado en tics desde que empezó la partida.
 *
 * Es un alias de `number` y no una clase envuelta a propósito: tiene que
 * atravesar JSON, viajar dentro del estado del juego y compararse con `<` sin
 * que nadie tenga que aprender una API. Lo que se gana con el nombre es que
 * cuando alguien escriba `tic: Tic` en su estado se note que ahí no va una
 * fecha.
 */
export type Tic = number;

/**
 * El tipo del movimiento que hace avanzar el reloj.
 *
 * Lleva el prefijo `arcade:` porque lo reserva la plataforma, y es hoy el único
 * que lo lleva. El prefijo existe para que un juego pueda llamar `tic` a un
 * movimiento suyo —un tic de un contador de su mecánica— sin chocar con esto.
 */
export const TIC = 'arcade:tic';

/** El movimiento del reloj. Siempre el mismo objeto conceptual, sin carga. */
export function movimientoDeTic(): Movimiento {
  return { tipo: TIC };
}

/** ¿Es este movimiento el del reloj? */
export function esTic(movimiento: Movimiento): boolean {
  return movimiento.tipo === TIC;
}

/**
 * Cuántos tics son estos segundos, a la frecuencia de este arcade.
 *
 * ═══ EL CASO `tickHz: 0`, QUE ES EL INTERESANTE ═══
 *
 * Un arcade sin reloj declara `tickHz: 0`, y eso no es un valor inválido ni un
 * caso especial: es la mitad del catálogo —cualquier tablero por turnos—. Aquí
 * la respuesta honesta a «¿cuántos tics son treinta segundos?» es INFINITOS,
 * porque a ese juego no le llega ningún tic nunca y por tanto ningún plazo
 * contado en tics vence jamás.
 *
 * Las dos alternativas son peores y conviene decir por qué:
 *
 *   · Devolver 0 haría que TODO plazo estuviera vencido desde el primer
 *     movimiento. Un juego por turnos que reutilizara una mecánica con plazos
 *     vería caducar la oferta antes de proponerla, sin ningún error.
 *   · Lanzar obligaría a que cada mecánica con plazos preguntara antes si hay
 *     reloj, o sea a repartir `if (tickHz > 0)` por todas partes — que es la
 *     forma en que un caso especial se convierte en una rama del motor que solo
 *     recorre medio catálogo.
 *
 * Con infinito, el código que usa plazos se escribe una vez y hace lo correcto
 * en los dos mundos: donde hay reloj vence, y donde no lo hay no vence.
 */
export function ticsPara(segundos: number, tickHz: number): number {
  if (!(tickHz > 0)) return Number.POSITIVE_INFINITY;
  return Math.round(segundos * tickHz);
}

/** Cuántos segundos representan estos tics. Para pintar un cronómetro. */
export function segundosDe(tics: Tic, tickHz: number): number {
  if (!(tickHz > 0)) return 0;
  return tics / tickHz;
}

/**
 * UN PLAZO: el tic en el que algo deja de valer.
 *
 * Se guarda como instante absoluto —«vence en el tic 240»— y no como cuenta
 * atrás —«quedan 60»—, y la diferencia importa: una cuenta atrás hay que
 * decrementarla en cada tic, o sea que el estado cambia SESENTA VECES POR
 * SEGUNDO aunque no pase nada, y en una mesa con autoridad eso son sesenta
 * escrituras por segundo. Un instante absoluto se escribe una vez y se compara.
 *
 * Es la misma forma que ya usa el reloj de ronda de las veladas cuando lo hay:
 * el plazo va en el estado como instante, no como resta.
 */
export interface Plazo {
  vence: Tic;
}

/**
 * EL TIC QUE NO LLEGA NUNCA. Un entero de verdad, no un infinito.
 *
 * ═══ POR QUÉ NO SE USA `Infinity` AQUÍ, SI `ticsPara` SÍ LO DEVUELVE ═══
 *
 * Son dos sitios distintos y por eso llevan dos respuestas distintas.
 * `ticsPara` es un CÁLCULO: su resultado se compara, se pasa a otra función y se
 * tira, y ahí infinito es la respuesta exacta. Un `Plazo` es ESTADO: se guarda
 * dentro del estado del juego, se manda por la red y se reejecuta.
 *
 * Y el estado tiene que sobrevivir a `shared/mecanicas/canonico.ts`, que rechaza
 * los números no finitos —con razón: `JSON.stringify(Infinity)` es `null`, así
 * que un plazo infinito y un plazo ausente producirían la misma cadena y
 * `verify:determinismo` diría que dos estados distintos son iguales—.
 *
 * A 60 Hz, `MAX_SAFE_INTEGER` tics son casi cinco millones de años. «Nunca»
 * queda dicho con un entero que se guarda, se manda y se compara.
 */
export const NUNCA: Tic = Number.MAX_SAFE_INTEGER;

/**
 * Un plazo que vence dentro de tantos tics contados desde ahora.
 *
 * Admite un número de tics no finito —es lo que devuelve `ticsPara` cuando el
 * arcade no tiene reloj— y lo convierte en `NUNCA`. La conversión vive aquí, en
 * la frontera donde el cálculo se convierte en estado, y no en `ticsPara`,
 * porque quien solo compara quiere la respuesta exacta.
 */
export function plazoDentroDe(ahora: Tic, tics: number): Plazo {
  const vence = ahora + tics;
  if (!Number.isFinite(vence) || vence > NUNCA) return { vence: NUNCA };
  return { vence };
}

/**
 * ¿Ha vencido ya?
 *
 * Se compara con `>=` y no con `>`: el tic en el que vence ya está vencido. Es
 * la convención menos sorprendente —«vence en el 240» significa que en el 240 ya
 * no vale— y la que hace que `plazoDentroDe(t, 0)` signifique «ahora mismo» en
 * vez de «un tic más».
 */
export function vencido(plazo: Plazo, ahora: Tic): boolean {
  return ahora >= plazo.vence;
}

/** Cuántos tics faltan. Nunca negativo: un plazo vencido es cero, no −40. */
export function quedanTics(plazo: Plazo, ahora: Tic): number {
  const restan = plazo.vence - ahora;
  return restan > 0 ? restan : 0;
}
