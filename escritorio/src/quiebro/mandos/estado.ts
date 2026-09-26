/**
 * LO QUE PIDEN LAS MANOS: la palanca, la mirada y las pulsaciones, venga de un pulgar o de un teclado.
 *
 * ═══ UN SOLO SITIO DONDE ESCRIBEN LOS DOS MANDOS ═══
 *
 * El táctil (`Tactil.tsx`) y el de PC (`teclado.ts`) escriben aquí lo mismo con palabras distintas: una
 * palanca de −1 a 1 en la PANTALLA (x a la derecha, y hacia delante), cuánto se ha girado la mirada y
 * una cola de pulsaciones con su `timeStamp`. La partida lo lee en cada tic y no sabe de dónde vino. Es
 * el patrón de `mandos.current` del paseo de Boots on Board: un objeto que se escribe en los eventos y se
 * lee en el bucle, sin pasar por el estado de React (sesenta renders por segundo por mover un pulgar).
 *
 * ═══ LA HORA DE UNA PULSACIÓN ES LA DE SU EVENTO ═══
 *
 * Toda pulsación lleva el `timeStamp` del evento que la dio (`pointerdown`, `keydown`, `mousedown`), que
 * está en la escala de `performance.now()` pero es el instante en que el dedo tocó, no el del fotograma
 * que lo atiende: un tirón de pantalla no puede retrasar un quiebro (diseño §4.3, paso 3). La partida lo
 * pasa al reloj del canal y lo manda tal cual.
 *
 * ═══ LA ZONA MUERTA Y «A FONDO» ═══
 *
 * La palanca cruda se recorta con la zona muerta del diseño (12 %) y se reescala para que el 12 % sea el
 * cero: así el 60 % del umbral del trote es el 60 % del recorrido útil. «A fondo» es la palanca cruda al
 * 95 % o más; lo que cuenta para correr es cuánto lleva a fondo (lo decide la partida, que sabe si hay
 * enemigos cerca).
 *
 * Puro: ni DOM ni React.
 */

/**
 * Los botones de la pelea (diseño §7), y el RAYO (`docs/quiebro/EL-RAYO.md` §3), que se MANTIENE para cargar y
 * dispara al soltar: no pasa por la cola de pulsaciones sino por `cargarRayo`, `soltarRayo` y `cancelarRayo`.
 */
export type Boton = 'golpe' | 'quiebro' | 'empellon' | 'usar' | 'aviso' | 'rayo';

/**
 * UN RAYO SOLTADO que la partida aún no ha mandado: desde cuándo se cargaba y cuándo se soltó (los dos
 * `timeStamp` de sus eventos: la carga que cuenta la sala es la resta de los dos, en el reloj del aparato) y el
 * blanco que se veía bajo la mira al soltar (0 = ninguno: sale por la mira).
 */
export interface RayoSoltado {
  readonly desde: number;
  readonly hasta: number;
  readonly blanco: number;
}

export interface Pulsacion {
  readonly boton: Boton;
  /** El `timeStamp` de su evento (escala de `performance.now()`). */
  readonly timeStamp: number;
  /**
   * La palanca en el instante de la pulsación: el quiebro va «hacia donde apunta la palanca» (diseño
   * §4.3) cuando se pulsó, no cuando el fotograma lo atiende —el pulgar ya puede estar soltándola—.
   */
  readonly palancaX: number;
  readonly palancaY: number;
}

/** La zona muerta de la palanca (diseño §7: 12 %). */
export const ZONA_MUERTA = 0.12;
/** Desde aquí la palanca está «a fondo». */
export const A_FONDO = 0.95;
/** Lo que manda el dedo sobre la cámara automática tras tocarla (diseño §7: 2 s). */
export const EL_DEDO_MANDA_MS = 2000;
/** Cuántas pulsaciones se guardan como mucho sin atender (un aporreo no llena la memoria). */
const COLA_COMO_MUCHO = 8;

/** Recorta la zona muerta de una palanca cruda (x, y) y la reescala. Devuelve la palanca útil. */
export function sinZonaMuerta(x: number, y: number): { x: number; y: number; fuerza: number; cruda: number } {
  const cruda = Math.min(1, Math.hypot(x, y));
  if (cruda < ZONA_MUERTA || cruda === 0) return { x: 0, y: 0, fuerza: 0, cruda };
  const fuerza = (cruda - ZONA_MUERTA) / (1 - ZONA_MUERTA);
  return { x: (x / cruda) * fuerza, y: (y / cruda) * fuerza, fuerza, cruda };
}

export class EstadoDeLosMandos {
  /** La palanca útil, en la pantalla: x a la derecha, y hacia delante. Módulo 0..1. */
  palancaX = 0;
  palancaY = 0;
  fuerza = 0;
  /** Desde cuándo está a fondo (ms de `performance.now()`), o `null`. */
  aFondoDesde: number | null = null;
  /** Mayúsculas (o el botón de correr, si algún día lo hay). */
  correrPedido = false;
  /** Lo que se ha girado la mirada desde la última vez que se leyó, en radianes. */
  private giro = 0;
  private cabeceo = 0;
  /** La última vez que el dedo o el ratón movieron la cámara (ms de `performance.now()`). */
  ultimaMiradaMs = Number.NEGATIVE_INFINITY;
  private readonly cola: Pulsacion[] = [];
  /** USAR mantenido: desde cuándo (su `timeStamp`), o `null`. */
  usarDesde: number | null = null;
  /**
   * EL RAYO mantenido: desde cuándo se carga (el `timeStamp` del evento que empezó), o `null`. Lo ponen el botón
   * RAYO y la R (`cargarRayo`); lo quitan soltar (que además deja el disparo en `soltado`) y cancelar.
   */
  rayoDesde: number | null = null;
  /** El rayo soltado que la partida aún no ha tomado (`tomarRayoSoltado`), o `null`. */
  private soltado: RayoSoltado | null = null;
  /** Qué mando se usó por última vez: el HUD enseña los botones del que toca. */
  tipo: 'tactil' | 'teclado' = 'teclado';
  /** El marcador abierto (Tab, o el botón del menú). */
  marcador = false;

  /** La palanca cruda (−1..1 en cada eje) en `ahora`. */
  ponerPalanca(x: number, y: number, ahora: number): void {
    const p = sinZonaMuerta(x, y);
    this.palancaX = p.x;
    this.palancaY = p.y;
    this.fuerza = p.fuerza;
    if (p.cruda >= A_FONDO) {
      if (this.aFondoDesde === null) this.aFondoDesde = ahora;
    } else {
      this.aFondoDesde = null;
    }
  }

  /** La mirada se gira `dGiro` (radianes, positivo hacia la derecha) y cabecea `dCabeceo`. */
  mirar(dGiro: number, dCabeceo: number, ahora: number): void {
    if (!Number.isFinite(dGiro) || !Number.isFinite(dCabeceo)) return;
    this.giro += dGiro;
    this.cabeceo += dCabeceo;
    this.ultimaMiradaMs = ahora;
  }

  /** Lo girado desde la última lectura, y se pone a cero. */
  tomarMirada(): { giro: number; cabeceo: number } {
    const m = { giro: this.giro, cabeceo: this.cabeceo };
    this.giro = 0;
    this.cabeceo = 0;
    return m;
  }

  /** ¿Manda el dedo sobre la cámara automática en `ahora`? */
  mandaElDedo(ahora: number): boolean {
    return ahora - this.ultimaMiradaMs < EL_DEDO_MANDA_MS;
  }

  /**
   * Se pulsa un botón, en el instante de su evento.
   *
   * MIENTRAS SE CARGA EL RAYO (EL-RAYO.md §1.3) los botones de la derecha están apagados: el pulgar derecho apunta.
   * QUIEBRO no: sigue valiendo, y CANCELA la carga antes de esquivar (lo que la sala hará igual al ver otra acción
   * en el `aqui`). GOLPE, EMPELLÓN y USAR se tiran —en PC, un clic con la R pisada no rompe la carga por
   * accidente—.
   *
   * AVISO, una sola regla: NUNCA rompe la carga (es un mensaje aparte, no va por el `aqui`), así que aquí pasa, y en
   * PC la Q vale mientras se mantiene la R. En el TÁCTIL su botón cae en la mitad que apunta (arriba a la derecha) y,
   * mientras se carga, se aparta del dedo como los demás (`hud.css`, `.q-tactil.cargando`): un arrastre que empieza
   * encima apunta, no avisa. No es otra conducta, es dónde cae el dedo.
   */
  pulsar(boton: Boton, timeStamp: number): void {
    if (this.rayoDesde !== null && (boton === 'golpe' || boton === 'empellon' || boton === 'usar')) return;
    if (boton === 'quiebro' && this.rayoDesde !== null) this.cancelarRayo();
    if (boton === 'usar') {
      if (this.usarDesde === null) this.usarDesde = timeStamp;
      return;
    }
    if (boton === 'rayo') {
      this.cargarRayo(timeStamp);
      return;
    }
    this.cola.push({ boton, timeStamp, palancaX: this.palancaX, palancaY: this.palancaY });
    while (this.cola.length > COLA_COMO_MUCHO) this.cola.shift();
  }

  /** Se suelta USAR (los demás botones actúan al pulsar y no tienen soltar, salvo el rayo). */
  soltarUsar(): void {
    this.usarDesde = null;
  }

  /*
   * EL RAYO (`docs/quiebro/EL-RAYO.md` §1.1 y §3). Aquí sólo se apunta lo que hicieron las manos, con la hora de
   * cada evento; si se puede cargar, qué nivel sale y qué se manda lo decide la partida (`red/partida.ts`), que lo
   * lee en cada latido. Tres reglas:
   *   · SOLTAR DISPARA, y es lo ÚNICO que dispara: deja el disparo en `soltado` con las dos horas y el blanco que
   *     se veía, y la partida lo manda una vez.
   *   · CANCELAR ANULA: el dedo que el sistema se lleva (`pointercancel`, la captura perdida), el QUIEBRO, el menú,
   *     el plano, irse al fondo. No manda nada y no gasta recarga.
   *   · Un soltar sin carga (se canceló antes, o la partida no la dejó empezar) no es nada.
   */

  /** Empieza a cargar el rayo, en el instante de su evento. Si ya se carga, nada (el primer instante manda). */
  cargarRayo(timeStamp: number): void {
    if (this.rayoDesde !== null || !Number.isFinite(timeStamp)) return;
    this.rayoDesde = timeStamp;
  }

  /** Se suelta el rayo en `timeStamp` con el blanco que se veía (0 = ninguno): DISPARA. Sin carga, nada. */
  soltarRayo(timeStamp: number, blanco: number): void {
    const desde = this.rayoDesde;
    if (desde === null) return;
    this.rayoDesde = null;
    const hasta = Number.isFinite(timeStamp) ? Math.max(desde, timeStamp) : desde;
    this.soltado = { desde, hasta, blanco: Number.isInteger(blanco) && blanco > 0 ? blanco : 0 };
  }

  /**
   * El rayo soltado que falta por mandar, y se olvida; `null` si no hay. Lo toma la partida en cada latido.
   */
  tomarRayoSoltado(): RayoSoltado | null {
    const s = this.soltado;
    this.soltado = null;
    return s;
  }

  /**
   * Se deja el rayo sin disparar (dedo perdido, daño, quiebro, menú…). Un disparo YA soltado no se toca: soltar
   * y luego quebrar en el mismo fotograma es un rayo y un quiebro, en ese orden.
   */
  cancelarRayo(): void {
    this.rayoDesde = null;
  }

  /** Las pulsaciones sin atender, en orden, y se vacía la cola. */
  tomarPulsaciones(): Pulsacion[] {
    return this.cola.splice(0, this.cola.length);
  }

  /**
   * Todo suelto: la pestaña se ocultó, la app se fue al fondo o se perdió el foco (un dedo que no levantó
   * no sigue empujando). Las pulsaciones sin atender se tiran también: un GOLPE pulsado justo antes de
   * irse no sale al volver, contra lo que haya entonces delante.
   */
  soltarTodo(): void {
    this.cola.length = 0;
    this.palancaX = 0;
    this.palancaY = 0;
    this.fuerza = 0;
    this.aFondoDesde = null;
    this.correrPedido = false;
    this.usarDesde = null;
    /* Como las pulsaciones sin atender: un rayo soltado justo antes de irse no sale al volver. */
    this.soltado = null;
    /* El rayo se CANCELA, no se suelta: irse no dispara (EL-RAYO.md §3). */
    this.cancelarRayo();
  }
}

/**
 * LA PALANCA EN EL MUNDO: con la cámara mirando a `giroDeLaCamara` (radianes, 0 al norte y creciendo al
 * este, el convenio de `andar.ts`), hacia dónde empuja la palanca. `null` si está suelta.
 */
export function direccionDeLaPalanca(palancaX: number, palancaY: number, giroDeLaCamara: number): number | null {
  if (palancaX === 0 && palancaY === 0) return null;
  return giroDeLaCamara + Math.atan2(palancaX, palancaY);
}
