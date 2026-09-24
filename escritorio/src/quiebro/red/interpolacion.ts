/**
 * LOS DEMÁS, 150 ms ATRÁS: el paseo de cada cuerpo ajeno interpolado entre dos fotos de la sala.
 *
 * ═══ POR QUÉ ATRÁS Y NO EN EL PRESENTE ═══
 *
 * La sala manda una foto cada dos tics (10 por segundo, `FOTOS_POR_SEGUNDO`), y lo que hay entre dos
 * fotos no lo sabe nadie: adivinarlo es extrapolar, y extrapolar a un Celador que frena lo pinta
 * atravesando la fuente y volviendo. Pintando `RETRASO_DE_LOS_DEMAS_MS` atrás siempre hay dos fotos a los
 * lados del instante que se pinta (con una perdida, todavía una y la siguiente), y el paseo sale
 * suave y verdadero. Lo que no puede ir atrás —un golpe, un quiebro, un empujón— no pasa por aquí: se
 * pinta por GUION en el presente desde su suceso (`guion.ts`), que es lo que el diseño pide en §12.
 *
 * ═══ EN TICS DE LA SALA, NO EN MS DEL APARATO ═══
 *
 * Las fotos llevan su `k` (tic de la sala) y se interpola en ese reloj: el instante que se pinta es el
 * tic de la sala estimado ahora (`reloj.ts`) menos tres tics. Un tirón de red que junta dos fotos en el
 * mismo fotograma no mueve nada: cada una va a su `k`.
 *
 * ═══ SIN FOTO A UN LADO ═══
 *
 * Si el instante pintado cae después de la última foto (la red se ha parado), el cuerpo sigue la última
 * velocidad conocida como mucho `EXTRAPOLAR_COMO_MUCHO_TICS` y luego se queda quieto; si cae antes de
 * la primera, se pinta en la primera. Un cuerpo que sale en una foto y no en la otra (acaba de nacer o
 * se fue) se pinta donde está en la que lo tiene.
 *
 * Puro: centésimas del cable a metros, y nada más. Sin asignar por consulta: `muestra` escribe en un
 * objeto que pasa quien pregunta.
 */
import type { Foto, TuplaDeFoto } from '../../../../shared/mecanicas/liza/protocolo';
import { RUMBOS, TICS_POR_SEGUNDO } from '../../../../shared/mecanicas/andar';

/** Cuántas fotos se guardan: dos segundos. */
export const FOTOS_GUARDADAS = 20;
/** Cuánto se sigue a un cuerpo más allá de la última foto antes de pararlo. */
export const EXTRAPOLAR_COMO_MUCHO_TICS = 2;

/** Una foto guardada: su tic y sus tuplas por número. */
interface FotoGuardada {
  readonly k: number;
  readonly porNumero: Map<number, TuplaDeFoto>;
}

/** Lo que se sabe de un cuerpo en un instante: en metros y radianes. */
export interface Muestra {
  x: number;
  z: number;
  /** Hacia dónde mira, en radianes (0 el norte, creciendo al este). */
  mira: number;
  marcha: number;
  estado: number;
  /** Metros por segundo entre las dos fotos (para acompasar el paso). */
  velocidad: number;
}

/** Una muestra vacía, para reutilizar. */
export function muestraNueva(): Muestra {
  return { x: 0, z: 0, mira: 0, marcha: 0, estado: 0, velocidad: 0 };
}

const A_RADIANES = (Math.PI * 2) / RUMBOS;

/** La vuelta más corta entre dos rumbos, en rumbos (−128 … 127). */
function giroCorto(desde: number, hasta: number): number {
  return ((((hasta - desde) % RUMBOS) + RUMBOS + RUMBOS / 2) % RUMBOS) - RUMBOS / 2;
}

export class FotosDeLaSala {
  private readonly fotos: FotoGuardada[] = [];

  /** Olvida todo (un `dentro`: la sala de antes no tiene nada que ver con la de ahora). */
  vaciar(): void {
    this.fotos.length = 0;
  }

  /** Guarda una foto. Una foto repetida o más vieja que la última no cambia nada. */
  guardar(foto: Foto): void {
    const ultima = this.fotos[this.fotos.length - 1];
    if (ultima !== undefined && foto.k <= ultima.k) return;
    const porNumero = new Map<number, TuplaDeFoto>();
    for (const t of foto.p) porNumero.set(t[0], t);
    this.fotos.push({ k: foto.k, porNumero });
    while (this.fotos.length > FOTOS_GUARDADAS) this.fotos.shift();
  }

  /** El `k` de la última foto, o −1. */
  ultimoK(): number {
    return this.fotos[this.fotos.length - 1]?.k ?? -1;
  }

  /** Los números que salen en la última foto. */
  numeros(): IterableIterator<number> {
    const ultima = this.fotos[this.fotos.length - 1];
    return (ultima?.porNumero ?? new Map<number, TuplaDeFoto>()).keys();
  }

  /** La tupla del cuerpo `numero` en la última foto que lo tiene (para su estado, por ejemplo). */
  ultimaTupla(numero: number): TuplaDeFoto | null {
    for (let i = this.fotos.length - 1; i >= 0; i--) {
      const t = (this.fotos[i] as FotoGuardada).porNumero.get(numero);
      if (t !== undefined) return t;
    }
    return null;
  }

  /**
   * EL CUERPO `numero` EN EL TIC `tic` DE LA SALA (con decimales). Escribe en `salida` y devuelve
   * `false` si ninguna foto guardada lo tiene.
   */
  muestra(numero: number, tic: number, salida: Muestra): boolean {
    const n = this.fotos.length;
    if (n === 0) return false;
    /* La primera foto con k ≥ tic: la de después. */
    let despues = -1;
    for (let i = 0; i < n; i++) {
      if ((this.fotos[i] as FotoGuardada).k >= tic) {
        despues = i;
        break;
      }
    }
    let a: TuplaDeFoto | undefined;
    let b: TuplaDeFoto | undefined;
    let ka = 0;
    let kb = 0;
    if (despues === -1) {
      /* Después de la última: se sigue la velocidad de las dos últimas fotos que lo tienen, un poco. */
      b = (this.fotos[n - 1] as FotoGuardada).porNumero.get(numero);
      kb = (this.fotos[n - 1] as FotoGuardada).k;
      for (let i = n - 2; i >= 0; i--) {
        const t = (this.fotos[i] as FotoGuardada).porNumero.get(numero);
        if (t !== undefined) {
          a = t;
          ka = (this.fotos[i] as FotoGuardada).k;
          break;
        }
      }
      if (b === undefined) {
        const t = this.ultimaTupla(numero);
        if (t === null) return false;
        escribir(salida, t, t, 0, 0);
        return true;
      }
      if (a === undefined || kb === ka) {
        escribir(salida, b, b, 0, 0);
        return true;
      }
      const f = Math.min(tic - kb, EXTRAPOLAR_COMO_MUCHO_TICS) / (kb - ka);
      escribir(salida, a, b, 1 + f, kb - ka);
      return true;
    }
    b = (this.fotos[despues] as FotoGuardada).porNumero.get(numero);
    kb = (this.fotos[despues] as FotoGuardada).k;
    if (despues === 0) {
      if (b === undefined) return false;
      escribir(salida, b, b, 0, 0);
      return true;
    }
    a = (this.fotos[despues - 1] as FotoGuardada).porNumero.get(numero);
    ka = (this.fotos[despues - 1] as FotoGuardada).k;
    if (a === undefined && b === undefined) return false;
    if (a === undefined) {
      escribir(salida, b as TuplaDeFoto, b as TuplaDeFoto, 0, 0);
      return true;
    }
    if (b === undefined) {
      escribir(salida, a, a, 0, 0);
      return true;
    }
    const f = kb === ka ? 1 : (tic - ka) / (kb - ka);
    escribir(salida, a, b, Math.max(0, Math.min(1, f)), kb - ka);
    return true;
  }
}

/** Mezcla dos tuplas: `f` 0 es `a`, 1 es `b` (más de 1 extrapola). `tics` entre ellas, para la velocidad. */
function escribir(salida: Muestra, a: TuplaDeFoto, b: TuplaDeFoto, f: number, tics: number): void {
  const ax = a[1] / 100;
  const az = a[2] / 100;
  const bx = b[1] / 100;
  const bz = b[2] / 100;
  salida.x = ax + (bx - ax) * f;
  salida.z = az + (bz - az) * f;
  const rumbo = a[3] + giroCorto(a[3], b[3]) * Math.min(1, f);
  salida.mira = (((rumbo % RUMBOS) + RUMBOS) % RUMBOS) * A_RADIANES;
  const deB = f >= 0.5;
  salida.marcha = deB ? b[4] : a[4];
  salida.estado = deB ? b[5] : a[5];
  salida.velocidad = tics > 0 ? (Math.hypot(bx - ax, bz - az) * TICS_POR_SEGUNDO) / tics : 0;
}
