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

/** Los botones de la pelea (diseño §7). */
export type Boton = 'golpe' | 'quiebro' | 'empellon' | 'usar' | 'aviso';

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

  /** Se pulsa un botón, en el instante de su evento. */
  pulsar(boton: Boton, timeStamp: number): void {
    if (boton === 'usar') {
      if (this.usarDesde === null) this.usarDesde = timeStamp;
      return;
    }
    this.cola.push({ boton, timeStamp, palancaX: this.palancaX, palancaY: this.palancaY });
    while (this.cola.length > COLA_COMO_MUCHO) this.cola.shift();
  }

  /** Se suelta USAR (los demás botones actúan al pulsar y no tienen soltar). */
  soltarUsar(): void {
    this.usarDesde = null;
  }

  /** Las pulsaciones sin atender, en orden, y se vacía la cola. */
  tomarPulsaciones(): Pulsacion[] {
    return this.cola.splice(0, this.cola.length);
  }

  /** Todo suelto: la pestaña se ocultó, o se perdió el foco (un dedo que no levantó no sigue empujando). */
  soltarTodo(): void {
    this.palancaX = 0;
    this.palancaY = 0;
    this.fuerza = 0;
    this.aFondoDesde = null;
    this.correrPedido = false;
    this.usarDesde = null;
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
