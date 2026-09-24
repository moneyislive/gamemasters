/**
 * LA BAJADA EN EL APARATO: cuánto le queda, quién falta y cuándo cae la cámara.
 *
 * ═══ LA BAJADA YA NO SON SEIS SEGUNDOS FIJOS ═══
 *
 * Es la PREPARACIÓN (`quiebro.ts`, «La Bajada es la preparación»): dura hasta 15 s mientras falte alguien
 * por decir que está listo —eligiendo estilo o con BAJAR, el movimiento `listo`—, y con el último listo
 * la mesa cambia su reloj por el de la caída, de 6 s contados DESDE QUE EMPEZÓ la Bajada (o ninguno, si
 * ya pasaron). La primera versión del cliente suponía seis segundos: la cámara caía sola a los 5,6 s y
 * quien aún elegía estilo lo hacía ya en la calle, con el rótulo tapando la pelea que empezaba.
 *
 * Así que aquí:
 *
 *   · EL PRINCIPIO de la Bajada se sabe de dos maneras. Lo que el aparato vio (cuándo le llegó la vista
 *     con la fase `bajada`), y lo que dice la sala: su suceso `fase` trae lo que le queda al reloj que
 *     tenía la declaración cuando lo mandó, y ese reloj es el de la vista de ese momento. Si llega, manda
 *     la sala: una pestaña que se recarga a media Bajada no cree que empieza ahora.
 *   · EL FINAL es el principio más la duración del reloj que tenga la vista AHORA: el de 15 s, o el de la
 *     caída en cuanto están todos.
 *   · LA CAÍDA de la cámara empieza cuando están todos listos o cuando ya no queda más que lo que tarda
 *     en caer, lo que antes llegue, y dura lo que falte hasta el final. Nunca menos de `CAIDA_MINIMA_MS`:
 *     si el último dice «listo» con la Bajada ya vencida, la oleada empieza en el acto y la cámara sigue
 *     cayendo un par de segundos dentro de ella (los primeros Prestados tardan más que eso en llegar).
 *
 * Puro: ni DOM ni three. `verify:quiebro-juego` lo lleva de la mano con relojes escritos.
 */

/** La vuelta que da la cámara en lo alto mientras se espera, en radianes por segundo. */
export const VUELTA_EN_LO_ALTO = 0.035;

/**
 * EL GIRO DE LA CÁMARA EN LO ALTO, sumado fotograma a fotograma: a su ritmo mientras se espera, y
 * frenando con la caída hasta pararse al llegar al hombro.
 *
 * ═══ SUMADO, NO SACADO DEL RELOJ ═══
 *
 * La primera versión lo sacaba del reloj de la página, `(ahora / 1000) × vuelta × (1 − caída)`. Con la
 * caída de 0 a 1, ese ángulo baja de `ahora × 0,035` a cero en los segundos que dura, y `ahora` es lo que
 * lleva ABIERTA la página: en una recién abierta, 0,2 rad y no se nota; en la cuarta noche de una mesa
 * (1168 s), 6,2 vueltas en 5,5 s, y la cámara saltando de un lado de la plaza al otro en 160 ms (lo midió
 * el revisor en el juego). En la app el WebView vive toda la sesión, así que desde la segunda o tercera
 * noche lo veía todo el mundo. Sumado, el giro de la caída entera es de unas centésimas de radián pase
 * lo que pase con el reloj.
 */
export class GiroEnLoAlto {
  private angulo = 0;
  private antesMs: number | null = null;

  /**
   * Avanza hasta `ahora` (ms de `performance.now()`) con la caída en `caida` (0 arriba, 1 al hombro) y
   * devuelve el ángulo. Un salto de reloj (una pestaña que vuelve) cuenta como una décima de segundo.
   */
  avanzar(ahora: number, caida: number): number {
    const dt = this.antesMs === null ? 0 : Math.max(0, Math.min(0.1, (ahora - this.antesMs) / 1000));
    this.antesMs = ahora;
    const f = Math.max(0, Math.min(1, caida));
    this.angulo += dt * VUELTA_EN_LO_ALTO * (1 - f * f * (3 - 2 * f));
    return this.angulo;
  }
}

/** Lo que tarda la caída cuando hay tiempo: la de siempre (diseño §2.1, 3-8 s). */
export const CAIDA_MS = 5600;
/** Lo menos que dura la caída: menos que esto es un corte de plano, no una caída. */
export const CAIDA_MINIMA_MS = 2200;

/** Lo que se sabe de la Bajada en cada vistazo. */
export interface LoQueSeVeDeLaBajada {
  /** El tipo de la fase de la mesa (`bajada`, `oleada`…), o `null` sin vista. */
  readonly fase: string | null;
  /** El número de noche (cada noche tiene su Bajada), o `null`. */
  readonly noche: number | null;
  /** El reloj de la fase que declara la vista, o `null`. */
  readonly reloj: { readonly id: string; readonly duraMs: number } | null;
  /** ¿Están listos todos aquellos a los que se espera? */
  readonly todosListos: boolean;
  /** La clave de la fase de la mesa, como la compone el productor (`claveDeLaFase`). */
  readonly clave: string;
  /**
   * El último suceso `fase` de la sala (su clave y su reloj, en ms de `performance.now()`), o `null`. Sólo
   * cuenta si es de ESTA fase: con el canal abierto de una noche a otra, lo último que dijo la sala puede
   * ser todavía el recuento de la noche anterior.
   */
  readonly deLaSala: { readonly clave: string; readonly relojHastaMs: number | null; readonly llegoMs: number } | null;
}

/** Lo que el HUD y la cámara leen. */
export interface LecturaDeLaBajada {
  /** Lo que le queda al reloj de la Bajada, o `null` fuera de ella. */
  readonly quedaMs: number | null;
  /**
   * Por dónde va la caída, de 0 (arriba, esperando) a 1 (al hombro); `null` si no hay caída que pintar
   * (no es la Bajada, o ya cayó).
   */
  readonly caida: number | null;
}

export class RelojDeLaBajada {
  private noche: number | null = null;
  private inicioMs: number | null = null;
  private deLaSalaLlegoMs = Number.NaN;
  private caidaDesdeMs: number | null = null;
  private caidaMs = CAIDA_MS;
  private finMs: number | null = null;

  /** Un vistazo, en `ahora` (ms de `performance.now()`). Se llama en cada fotograma. */
  observar(v: LoQueSeVeDeLaBajada, ahora: number): void {
    if (v.fase === 'bajada') {
      if (this.inicioMs === null || v.noche !== this.noche) {
        this.noche = v.noche;
        this.inicioMs = ahora;
        this.caidaDesdeMs = null;
        this.deLaSalaLlegoMs = Number.NaN;
      }
      /* La sala manda sobre lo visto: su reloj es el de la vista de cuando lo mandó (ver la cabecera). */
      const s = v.deLaSala;
      if (s !== null && s.clave === v.clave && s.relojHastaMs !== null && s.llegoMs !== this.deLaSalaLlegoMs && v.reloj !== null) {
        this.deLaSalaLlegoMs = s.llegoMs;
        this.inicioMs = Math.min(ahora, s.relojHastaMs - v.reloj.duraMs);
      }
      this.finMs = v.reloj === null ? null : this.inicioMs + v.reloj.duraMs;
      if (this.caidaDesdeMs === null) {
        const falta = this.finMs === null ? Number.POSITIVE_INFINITY : this.finMs - ahora;
        if (v.todosListos || falta <= CAIDA_MS) this.empezarLaCaida(ahora, falta);
      }
      return;
    }
    /* La Bajada se acabó sin que empezara la caída (el último dijo «listo» con el reloj ya vencido). */
    if (this.inicioMs !== null && this.caidaDesdeMs === null) this.empezarLaCaida(ahora, 0);
    this.inicioMs = null;
    this.finMs = null;
    if (v.fase === null || v.fase === 'reunion' || v.fase === 'final' || v.fase === 'cerrada') this.caidaDesdeMs = null;
  }

  private empezarLaCaida(ahora: number, falta: number): void {
    this.caidaDesdeMs = ahora;
    this.caidaMs = Math.max(CAIDA_MINIMA_MS, Math.min(CAIDA_MS, falta));
  }

  /** Lo que queda y por dónde va la caída, en `ahora` (para el HUD; la cámara usa `caida`, que no asigna). */
  leer(ahora: number): LecturaDeLaBajada {
    return { quedaMs: this.quedaMs(ahora), caida: this.caida(ahora) };
  }

  /** Lo que le queda al reloj de la Bajada, o `null` fuera de ella. */
  quedaMs(ahora: number): number | null {
    return this.finMs === null ? null : Math.max(0, this.finMs - ahora);
  }

  /** Por dónde va la caída (ver `LecturaDeLaBajada.caida`). */
  caida(ahora: number): number | null {
    if (this.caidaDesdeMs !== null) {
      const f = (ahora - this.caidaDesdeMs) / this.caidaMs;
      return f >= 1 && this.inicioMs === null ? null : Math.max(0, Math.min(1, f));
    }
    return this.inicioMs !== null ? 0 : null;
  }
}
