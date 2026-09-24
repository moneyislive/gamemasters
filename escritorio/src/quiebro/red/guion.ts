/**
 * EL GUION DE LOS DEMÁS: las acciones ajenas pintadas en el PRESENTE, y cómo vuelven a la foto.
 *
 * ═══ DOS LÍNEAS DE TIEMPO PARA EL MISMO CUERPO, Y UNA SOLA MANO QUE LAS JUNTA ═══
 *
 * El paseo de un Celador se pinta 150 ms atrás, entre fotos (`interpolacion.ts`). Su golpe no puede ir
 * atrás: su anillo se cierra en el instante verdadero, y un puño que llega 150 ms después de que el
 * anillo se cerrara es un puño que miente. Así que cuando llega su `anuncio`, el cuerpo sale de la foto y
 * pasa a su GUION: va desde donde se pintaba hasta el sitio desde el que lanzó (el `x, z` del anuncio) y
 * la acometida que la declaración le da, y el gesto llega al impacto en el instante del anuncio.
 *
 * Al acabar el guion vienen las dos reglas del §12 del diseño, que son las que evitan el tirón:
 *   1. EL CUERPO SE QUEDA EN SU POSE FINAL hasta que la foto (que va atrás) lo alcanza a menos de
 *      `ALCANZA_M`. Soltarlo antes sería devolverlo 150 ms al pasado: se le vería retroceder.
 *   2. Entonces FUNDE hacia la foto en `FUNDIDO_MS`. Nunca retrocede y nunca salta.
 * Si la foto no llega nunca a alcanzarlo (la sala lo puso en otro sitio: un empujón que el guion no
 * sabía), a los `ESPERA_COMO_MUCHO_MS` funde igual: mejor un deslizamiento corto que una estatua.
 *
 * Los empujones ajenos (`empuja`) usan la misma mano: su guion va del sitio pintado al sitio empujado en
 * `EMPUJON_MS`, y luego espera a la foto como un golpe.
 *
 * Puro: metros y ms de `performance.now()`. Sin asignar al pintar: escribe en el objeto que le pasan.
 */
import type { Gesto } from '../cuerpos';

/** A menos de esto de la pose final, la foto «ha alcanzado» al guion (diseño §12: 0,3 m). */
export const ALCANZA_M = 0.3;
/** Lo que dura el fundido del guion a la foto (diseño §12: 150 ms). */
export const FUNDIDO_MS = 150;
/** Lo más que se espera a que la foto alcance la pose final antes de fundir igual. */
export const ESPERA_COMO_MUCHO_MS = 900;
/** Lo que dura el viaje de un empujón ajeno (el paso lo lleva la sala; esto es cómo se ve). */
export const EMPUJON_MS = 260;

/** Un guion: qué gesto, cuándo, y de dónde a dónde va el cuerpo mientras dura. */
export interface Guion {
  readonly gesto: Gesto;
  /** Cuándo empieza y cuándo acaba el viaje, en ms de `performance.now()`. */
  readonly desdeMs: number;
  readonly finMs: number;
  /** El instante del impacto (anticipación elástica), o `null` si no es un golpe. */
  readonly impactoMs: number | null;
  /** Adónde llega (metros). De dónde sale lo pone `empezar`: del sitio en que se pintaba. */
  readonly destinoX: number;
  readonly destinoZ: number;
  /** Hacia dónde mira mientras dura (radianes), o `null` para dejar el de la foto. */
  readonly rumbo: number | null;
  /** Hacia dónde va el gesto que desplaza (radianes), o `null`. */
  readonly direccion: number | null;
}

/** Lo que sale de pintar un cuerpo con su línea de tiempo. */
export interface Pintado {
  x: number;
  z: number;
  /** El gesto del guion, o `null` si manda la foto. */
  gesto: Gesto | null;
  gestoDesdeMs: number;
  impactoMs: number | null;
  rumbo: number | null;
  direccion: number | null;
}

export function pintadoNuevo(): Pintado {
  return { x: 0, z: 0, gesto: null, gestoDesdeMs: 0, impactoMs: null, rumbo: null, direccion: null };
}

type Fase = 'libre' | 'guion' | 'espera' | 'fundido';

/** Una suavidad para el viaje: arranca y llega sin golpe (la acometida se ve como un impulso). */
function suave(p: number): number {
  const t = Math.max(0, Math.min(1, p));
  return t * t * (3 - 2 * t);
}

/** LA LÍNEA DE TIEMPO DE UN CUERPO AJENO. Una por número; se tira cuando el cuerpo se va. */
export class LineaDelCuerpo {
  private fase: Fase = 'libre';
  private guion: Guion | null = null;
  private origenX = 0;
  private origenZ = 0;
  private anclaX = 0;
  private anclaZ = 0;
  private desdeMs = 0;
  /** Lo último que se pintó: de ahí sale el próximo guion, para que nunca salte. */
  private ultimoX = 0;
  private ultimoZ = 0;
  private pintadoAlgunaVez = false;

  /** ¿Manda un guion (o su espera, o su fundido) sobre la foto? */
  activa(): boolean {
    return this.fase !== 'libre';
  }

  /**
   * EMPIEZA UN GUION ahora. Sale de donde se pintó por última vez (o, si nunca se pintó, del destino:
   * no hay nada que ver moverse).
   */
  empezar(guion: Guion): void {
    this.guion = guion;
    this.origenX = this.pintadoAlgunaVez ? this.ultimoX : guion.destinoX;
    this.origenZ = this.pintadoAlgunaVez ? this.ultimoZ : guion.destinoZ;
    this.fase = 'guion';
  }

  /** Se corta el guion (el golpe se cortó, llegó un `dentro`): se espera a la foto desde donde está. */
  cortar(ahora: number): void {
    if (this.fase === 'libre') return;
    this.anclaX = this.ultimoX;
    this.anclaZ = this.ultimoZ;
    this.fase = 'espera';
    this.desdeMs = ahora;
    this.guion = null;
  }

  /**
   * PINTA EL CUERPO en `ahora`, con la foto en `(fotoX, fotoZ)`. Escribe en `salida` el sitio y, si
   * manda un guion, su gesto.
   */
  pintar(ahora: number, fotoX: number, fotoZ: number, salida: Pintado): void {
    salida.gesto = null;
    salida.impactoMs = null;
    salida.rumbo = null;
    salida.direccion = null;
    if (this.fase === 'guion' && this.guion !== null) {
      const g = this.guion;
      if (ahora < g.finMs) {
        const p = g.finMs > g.desdeMs ? (ahora - g.desdeMs) / (g.finMs - g.desdeMs) : 1;
        const f = suave(p);
        salida.x = this.origenX + (g.destinoX - this.origenX) * f;
        salida.z = this.origenZ + (g.destinoZ - this.origenZ) * f;
        salida.gesto = g.gesto;
        salida.gestoDesdeMs = g.desdeMs;
        salida.impactoMs = g.impactoMs;
        salida.rumbo = g.rumbo;
        salida.direccion = g.direccion;
        this.recordar(salida.x, salida.z);
        return;
      }
      this.anclaX = g.destinoX;
      this.anclaZ = g.destinoZ;
      this.fase = 'espera';
      this.desdeMs = ahora;
      /* El gesto sigue mientras se espera: el cuerpo está en su pose final, no en reposo. */
    }
    if (this.fase === 'espera') {
      const alcanza = Math.hypot(fotoX - this.anclaX, fotoZ - this.anclaZ) < ALCANZA_M;
      if (alcanza || ahora - this.desdeMs >= ESPERA_COMO_MUCHO_MS) {
        this.fase = 'fundido';
        this.desdeMs = ahora;
      } else {
        salida.x = this.anclaX;
        salida.z = this.anclaZ;
        if (this.guion !== null) {
          salida.gesto = this.guion.gesto;
          salida.gestoDesdeMs = this.guion.desdeMs;
          salida.impactoMs = this.guion.impactoMs;
          salida.rumbo = this.guion.rumbo;
        }
        this.recordar(salida.x, salida.z);
        return;
      }
    }
    if (this.fase === 'fundido') {
      const f = suave((ahora - this.desdeMs) / FUNDIDO_MS);
      salida.x = this.anclaX + (fotoX - this.anclaX) * f;
      salida.z = this.anclaZ + (fotoZ - this.anclaZ) * f;
      if (f >= 1) {
        this.fase = 'libre';
        this.guion = null;
      }
      this.recordar(salida.x, salida.z);
      return;
    }
    salida.x = fotoX;
    salida.z = fotoZ;
    this.recordar(fotoX, fotoZ);
  }

  private recordar(x: number, z: number): void {
    this.ultimoX = x;
    this.ultimoZ = z;
    this.pintadoAlgunaVez = true;
  }
}
