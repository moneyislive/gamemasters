/**
 * EL RELOJ DE PRESENTACIÓN: el tiempo con que se pintan los cuerpos ajenos y el adorno, que el
 * Remanso dilata, y el tiempo VERDADERO, que no se toca nunca.
 *
 * ═══ QUÉ ES EL REMANSO AQUÍ, Y QUÉ NO ES ═══
 *
 * El Remanso lo arbitra el servidor (diseño §4.4): quien quiebra en limpio queda intocable 20 tics
 * y el rival clavado 20 tics, pase lo que pase en pantalla. Lo de este fichero es sólo cómo SE VE:
 * durante 0,45 s el adorno (lluvia, civiles, chispas, glifos) y los cuerpos ajenos avanzan a ×0,3,
 * y después a ×1,6 hasta que se han recuperado los 315 ms que se quedaron atrás. En total 975 ms,
 * «unos 1,0 s» del diseño.
 *
 * ═══ LA REGLA QUE NO SE NEGOCIA: LAS SEÑALES DE JUEGO VAN EN EL RELOJ VERDADERO ═══
 *
 * Anillos, balas, líneas de apuntado y silbidos se pintan SIEMPRE con `verdadero(t)`, que es `t`
 * tal cual. Un anillo que se cerrara en el reloj dilatado se cerraría 315 ms tarde, y el jugador que
 * quiebra al verlo cerrarse fallaría el siguiente quiebro limpio por culpa de su propio premio (el
 * fallo #14 que el diseño corrige). Por eso hay dos funciones con nombre propio y no un «tiempo» a
 * secas: quien pinta tiene que elegir cuál, y la elección se lee en el código.
 *
 * ═══ POR QUÉ SE CALCULA EL RETRASO Y NO EL TIEMPO PRESENTADO ═══
 *
 * `performance.now()` pasa de 10⁷ ms en una sesión de tres horas. Si se calculara
 * `inicio + 0,3·e + …` se sumarían números grandes con pequeños en cada tramo y la recuperación
 * dejaría restos de coma flotante. Así se calcula el RETRASO —un número entre 0 y 315— y el
 * presentado es `t − retraso`. Cuando el Remanso acaba, el retraso es el literal `0` y el
 * presentado es EXACTAMENTE `t`: no «casi», que es lo que el comprobador exige con `===`.
 *
 * Las cuentas de los tramos se hacen con enteros y décimas (×3/10, ×6/10), y las duraciones son
 * enteras: 450 × 7/10 = 315 perdidos, 315 × 10/6 = 525 de recuperación. El comprobador mira que lo
 * sean, que en la costura de los tramos no hay salto y que al final no sobra nada.
 *
 * ═══ UNO CADA 2,0 s, Y SIN SOLAPES ═══
 *
 * «Como mucho hay un efecto de Remanso cada 2,0 s por jugador» (§4.4). `remansar(t)` devuelve
 * `false` si no toca, y lo arbitrado se aplica igual: sólo se pierde el adorno. Como 2 000 > 975,
 * dos Remansos nunca se pisan, y basta con guardar los dos últimos inicios para contestar bien a
 * cualquier `t` (también a uno un poco anterior al último, que es lo que pasa cuando un fotograma
 * pregunta por su principio después de que el suceso llegara).
 *
 * Puro: ni `performance`, ni `Date`, ni three. Quien llama pasa el `t`. Sin asignaciones después de
 * crearlo, porque se consulta varias veces por fotograma.
 */

/** Ritmo del tramo lento: ×0,3 (tres décimas). */
export const RITMO_LENTO = 3 / 10;
/** Ritmo del tramo de recuperación: ×1,6 (dieciséis décimas). */
export const RITMO_DE_RECUPERACION = 16 / 10;
/** Cuánto dura el tramo lento, en ms. */
export const FRENADA_MS = 450;
/** Cuánto tiempo de presentación se queda atrás al acabar la frenada: 450 × (1 − 0,3) = 315 ms. */
export const RETRASO_MAXIMO_MS = (FRENADA_MS * 7) / 10;
/** Cuánto dura la recuperación: 315 / (1,6 − 1) = 525 ms. */
export const RECUPERACION_MS = (RETRASO_MAXIMO_MS * 10) / 6;
/** Duración total del Remanso visible: 975 ms. */
export const DURACION_DEL_REMANSO_MS = FRENADA_MS + RECUPERACION_MS;
/** Como mucho un Remanso visible cada 2,0 s (diseño §4.4). */
export const ESPACIO_ENTRE_REMANSOS_MS = 2000;
/** Lo que tarda la intensidad visual en subir al entrar: un golpe seco, pero no un escalón de un fotograma. */
export const ENTRADA_DE_LA_INTENSIDAD_MS = 60;

/** En qué tramo está el reloj. */
export type TramoDelRemanso = 'normal' | 'frenando' | 'recuperando';

/** Retraso (ms) que deja un Remanso que empezó en `inicio`, en el instante `t`. 0 fuera de él. */
export function retrasoDeUnRemanso(inicio: number, t: number): number {
  if (!(t > inicio)) return 0;
  const e = t - inicio;
  if (e < FRENADA_MS) return (e * 7) / 10;
  if (e < DURACION_DEL_REMANSO_MS) return RETRASO_MAXIMO_MS - ((e - FRENADA_MS) * 6) / 10;
  return 0;
}

/** Cuándo empieza el pico del Remanso en que la ciudad enseña su rejilla, y cuánto dura (diseño §8). */
export const PICO_DE_LA_REJILLA_DESDE_MS = 90;
export const PICO_DE_LA_REJILLA_MS = 300;

/**
 * LA REJILLA DE GLIFOS EN EL PICO DEL REMANSO (diseño §8, momento 2: «en el pico, durante 0,3 s, las
 * fachadas se transparentan en su rejilla de glifos»). De 0 a 1 y vuelta a 0, en media onda, dentro de
 * la frenada: la ciudad deja ver su código un instante y se vuelve a vestir antes de que el tiempo
 * recupere su paso. Es adorno: se calcula con el reloj VERDADERO desde el inicio del Remanso.
 */
export function rejillaDelRemanso(inicio: number | null, t: number): number {
  if (inicio === null) return 0;
  const e = t - inicio - PICO_DE_LA_REJILLA_DESDE_MS;
  if (!(e > 0) || e >= PICO_DE_LA_REJILLA_MS) return 0;
  const x = e / PICO_DE_LA_REJILLA_MS;
  /* Media onda sin trigonometría: 4·x·(1−x) sube a 1 en el centro y vuelve a 0. */
  return 4 * x * (1 - x);
}

export interface RelojDePresentacion {
  /** El tiempo verdadero: el mismo `t`. Para anillos, balas, líneas y silbidos. */
  verdadero(t: number): number;
  /** El tiempo con que se pintan los cuerpos ajenos y el adorno. Nunca por delante de `t`. */
  presentado(t: number): number;
  /** Lo que va por detrás: `t − presentado(t)`, entre 0 y 315 ms. */
  retraso(t: number): number;
  /** El ritmo instantáneo del reloj presentado: 1, 0,3 o 1,6. Para los mezcladores de animación. */
  ritmo(t: number): number;
  /** En qué tramo está. */
  tramo(t: number): TramoDelRemanso;
  /**
   * Cuánto Remanso «se ve», de 0 a 1: sube en 60 ms, se queda arriba en la frenada y baja durante la
   * recuperación. Para el posproceso (desaturación, campo de visión) y para el sonido.
   */
  intensidad(t: number): number;
  /** Pide un Remanso que empieza en `t`. `false` si el anterior empezó hace menos de 2,0 s. */
  remansar(t: number): boolean;
  /** El inicio del último Remanso aceptado, o `null` si no ha habido ninguno. */
  ultimoInicio(): number | null;
  /** Olvida los Remansos (al salir de la sala o al empezar otra noche). */
  olvidar(): void;
}

/** UN RELOJ NUEVO. Uno por aparato: el Remanso es de quien quiebra, no de la sala. */
export function crearRelojDePresentacion(): RelojDePresentacion {
  /* Los dos últimos inicios aceptados; NaN = ninguno. Dos bastan porque nunca se solapan. */
  let ultimo = Number.NaN;
  let penultimo = Number.NaN;

  const retraso = (t: number): number => {
    /* Como mucho uno de los dos da distinto de cero; la suma lo elige sin ramas. */
    let r = 0;
    if (ultimo === ultimo) r += retrasoDeUnRemanso(ultimo, t);
    if (penultimo === penultimo) r += retrasoDeUnRemanso(penultimo, t);
    return r;
  };

  /*
   * Los ms que lleva dentro del Remanso que está en curso en `t`, o −1 si no hay ninguno. Mira los
   * dos inicios sin montar un array: esto se llama varias veces por fotograma.
   */
  const transcurrido = (t: number): number => {
    if (ultimo === ultimo && t > ultimo && t - ultimo < DURACION_DEL_REMANSO_MS) return t - ultimo;
    if (penultimo === penultimo && t > penultimo && t - penultimo < DURACION_DEL_REMANSO_MS) return t - penultimo;
    return -1;
  };

  const tramo = (t: number): TramoDelRemanso => {
    const e = transcurrido(t);
    if (e < 0) return 'normal';
    return e < FRENADA_MS ? 'frenando' : 'recuperando';
  };

  return {
    verdadero: (t) => t,
    presentado: (t) => {
      const r = retraso(t);
      /* Con el retraso a cero se devuelve `t` tal cual, sin restar: ver la cabecera. */
      return r === 0 ? t : t - r;
    },
    retraso,
    ritmo: (t) => {
      const q = tramo(t);
      return q === 'frenando' ? RITMO_LENTO : q === 'recuperando' ? RITMO_DE_RECUPERACION : 1;
    },
    tramo,
    intensidad: (t) => {
      const e = transcurrido(t);
      if (e < 0) return 0;
      if (e < ENTRADA_DE_LA_INTENSIDAD_MS) return e / ENTRADA_DE_LA_INTENSIDAD_MS;
      if (e < FRENADA_MS) return 1;
      return 1 - (e - FRENADA_MS) / RECUPERACION_MS;
    },
    remansar: (t) => {
      if (ultimo === ultimo && t - ultimo < ESPACIO_ENTRE_REMANSOS_MS) return false;
      penultimo = ultimo;
      ultimo = t;
      return true;
    },
    ultimoInicio: () => (ultimo === ultimo ? ultimo : null),
    olvidar: () => {
      ultimo = Number.NaN;
      penultimo = Number.NaN;
    },
  };
}
