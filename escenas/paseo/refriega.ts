/**
 * LA REFRIEGA, DEL LADO DEL APARATO: cómo va cada uno —su vida, de pie, en el suelo o intocable— y
 * qué gesto toca pintarle, con lo que ha llegado por el canal.
 *
 * ═══ EL SERVIDOR DECIDE; AQUÍ SE APUNTA Y SE PINTA ═══
 *
 * El contrato (`shared/mecanicas/canal-de-botas.ts`, «LA REFRIEGA») le deja al aparato una sola
 * palabra: `golpe`. Si da, a quién, quién cae y cuándo se renace lo cuenta el servidor con `lanza`,
 * `da`, `cae`, `renace` y, al entrar, `vidas`. Esto apunta esos sucesos por asiento, con la hora a
 * la que llegaron por el reloj del canal, y contesta las tres preguntas que hace quien pinta:
 * cuántos corazones, qué clip manda sobre el paso, y si en este fotograma se ve la figura —el
 * parpadeo de quien es intocable—. Sin `three` y sin React: lo mide `verify:canal-del-paseo` en Node.
 *
 * El impacto no se predice. El gesto propio (`lanzar`) sale en cuanto se manda el golpe, porque es
 * lo que el dedo espera ver; que al otro le haya dado se sabe cuando lo dice el servidor, y no
 * antes: un golpe pintado como acertado que luego no acertó es peor que uno que se ve llegar tarde.
 *
 * ═══ LO QUE SE PINTA ENCIMA DEL PASO ═══
 *
 * Los clips de la refriega son de cuerpo entero —el paquete gratuito no trae medios cuerpos—, así
 * que mientras duran MANDAN sobre el de andar (`gestoA`): quien lanza corriendo resbala lo que dura
 * el lanzamiento, que es el precio de no inventar un clip. En el suelo, `caer` se queda clavado en
 * su último fotograma hasta renacer, y renaciendo suena `aparecer`, el mismo brote del Muelle.
 *
 * ═══ LO INTOCABLE SE APAGA SOLO ═══
 *
 * Nadie avisa de que se acabó: se es intocable `INTOCABLE_MS` desde que se renace, y a partir de
 * ahí se está de pie. Por eso el estado se pregunta A UNA HORA (`estadoA`) y no se guarda ya
 * caducado. Lo que llega en `vidas` no dice desde cuándo: se cuenta desde que llegó, que como mucho
 * alarga lo intocable lo que tardó el mensaje.
 *
 * ═══ A LOS DEMÁS, TAMBIÉN LO QUE LES PASA SE LES PINTA ATRÁS ═══
 *
 * A los demás se les pinta en el pasado, `RETRASO_DE_LOS_DEMAS_MS`, para tener siempre dos fotos
 * entre las que interpolar (`canal-de-botas.ts`). Si su caída se pintara al llegar, se pintaría
 * donde ESTABAN hace ciento cincuenta milisegundos; y al renacer, `aparecer` empezaría en el sitio
 * de la caída y la figura saltaría a su sitio de nacer a medio brotar. Así que lo suyo se pregunta a
 * la misma hora a la que se pinta su sitio, y lo que todavía no ha pasado a esa hora no ha pasado:
 * antes de su `cae` estaba de pie, y antes de su `renace`, en el suelo (`estadoA`). El canal pone
 * además su sitio de nacer en sus fotos a la hora del `renace`, para que el salto y el brote caigan
 * en el mismo fotograma. A uno mismo se le pinta en el presente, y lo suyo se pregunta a la de ahora.
 */
import { CAIDO, DE_PIE, INTOCABLE, INTOCABLE_MS, VIDA_ENTERA } from '../../shared/mecanicas/canal-de-botas';
import type { EstadoEnLaRefriega } from '../../shared/mecanicas/canal-de-botas';
import { CLIP } from '../embarcadero/figuras';
import type { NombreDeClip } from '../embarcadero/figuras';
import { DURACION } from '../embarcadero/gestos';

/** Cómo va alguien, según lo que ha llegado. Las horas, en milisegundos del reloj del canal. */
export interface EnLaRefriega {
  /** La vida que dijo el servidor la última vez, de 0 a `VIDA_ENTERA`. */
  readonly vida: number;
  /** La de antes, y desde cuándo vale la nueva: a la hora de los demás puede no haber cambiado aún. */
  readonly vidaAntes: number;
  readonly vidaDesde: number;
  /** Lo último que se dijo. Lo intocable caduca solo: se pregunta con `estadoA`. */
  readonly estado: EstadoEnLaRefriega;
  /** Desde cuándo vale: la hora del `cae`, la del `renace`, o la de `vidas`. */
  readonly estadoDesde: number;
  /** Los gestos: cuándo lanzó, cuándo le dieron, cuándo cayó y cuándo renació. `null` si nunca. */
  readonly lanzo: number | null;
  readonly recibio: number | null;
  readonly cayo: number | null;
  readonly renacio: number | null;
}

/** Quien no ha salido en ningún mensaje: con la vida entera, de pie y sin gestos. */
export const REFRIEGA_DE_SERIE: EnLaRefriega = {
  vida: VIDA_ENTERA,
  vidaAntes: VIDA_ENTERA,
  vidaDesde: Number.NEGATIVE_INFINITY,
  estado: DE_PIE,
  estadoDesde: Number.NEGATIVE_INFINITY,
  lanzo: null,
  recibio: null,
  cayo: null,
  renacio: null,
};

/** Lo que dura `caer`, en milisegundos: el clip entero, que después se queda clavado. */
const LO_QUE_DURA_CAER = DURACION.caer * 1000;

function acotada(vida: number): number {
  return Number.isFinite(vida) ? Math.max(0, Math.min(VIDA_ENTERA, Math.round(vida))) : 0;
}

/* ─── Lo que llega ───────────────────────────────────────────────────────── */

/** La vida pasa a ser `vida` a la hora `t`. Dos cambios a la misma hora guardan la de antes del primero. */
function conVida(r: EnLaRefriega, vida: number, t: number): EnLaRefriega {
  return { ...r, vidaAntes: t <= r.vidaDesde ? r.vidaAntes : r.vida, vida: acotada(vida), vidaDesde: t };
}

/** `lanza`: el gesto de lanzar, le haya dado a alguien o no. */
export function alLanzar(r: EnLaRefriega, t: number): EnLaRefriega {
  return { ...r, lanzo: t };
}

/** `da`: le han dado, y se queda con `vida`. Con cero, detrás llega su `cae`. */
export function alRecibir(r: EnLaRefriega, vida: number, t: number): EnLaRefriega {
  return { ...conVida(r, vida, t), recibio: t };
}

/** `cae`: al suelo, sin vida, hasta que el servidor diga `renace`. */
export function alCaer(r: EnLaRefriega, t: number): EnLaRefriega {
  return { ...conVida(r, 0, t), estado: CAIDO, estadoDesde: t, cayo: t };
}

/** `renace`: la vida entera, e intocable `INTOCABLE_MS`. */
export function alRenacer(r: EnLaRefriega, t: number): EnLaRefriega {
  return { ...conVida(r, VIDA_ENTERA, t), estado: INTOCABLE, estadoDesde: t, renacio: t };
}

/**
 * Una entrada de `vidas`: cómo SE ESTÁ, no algo que pase. Sin gestos que reproducir —quien entra no
 * tiene por qué ver caer a nadie—, salvo que quien está en el suelo sale ya tumbado: su `caer`,
 * terminado. `t` es desde cuándo cuenta, que para los demás el canal la pone ya en su pasado.
 */
export function porLasVidas(vida: number, estado: EstadoEnLaRefriega, t: number): EnLaRefriega {
  const v = acotada(vida);
  return {
    ...REFRIEGA_DE_SERIE,
    vida: v,
    vidaAntes: v,
    vidaDesde: t,
    estado,
    estadoDesde: t,
    cayo: estado === CAIDO ? t - LO_QUE_DURA_CAER : null,
  };
}

/* ─── Lo que se pregunta, a una hora ─────────────────────────────────────── */

/**
 * CÓMO ESTÁ A LA HORA `t`. Lo intocable, caducado si toca; y lo que a esa hora todavía no ha pasado
 * —a los demás se les pregunta en su pasado—, sin pasar: antes de caer se estaba de pie, y antes de
 * renacer, en el suelo. Ver la cabecera.
 */
export function estadoA(r: EnLaRefriega, t: number): EstadoEnLaRefriega {
  if (r.estado === DE_PIE) return DE_PIE;
  if (t < r.estadoDesde) return r.estado === CAIDO ? DE_PIE : CAIDO;
  if (r.estado === CAIDO) return CAIDO;
  return t - r.estadoDesde < INTOCABLE_MS ? INTOCABLE : DE_PIE;
}

/** La vida a la hora `t`. */
export function vidaA(r: EnLaRefriega, t: number): number {
  return t < r.vidaDesde ? r.vidaAntes : r.vida;
}

/** Un gesto de la refriega: el clip, una sola vez, y desde cuándo suena (ms del reloj del canal). */
export interface GestoDeLaRefriega {
  readonly clip: NombreDeClip;
  readonly bucle: false;
  readonly desde: number;
}

/**
 * EL CLIP QUE MANDA SOBRE EL PASO A LA HORA `t`, o `null` si ninguno: entonces suena el de andar.
 *
 * En el suelo, `caer` —clavado al final hasta renacer—. Si no, el más reciente de los gestos que ya
 * han empezado y todavía no han terminado: `aparecer` al renacer, `lanzar` al golpear y `golpe` al
 * recibir. Un golpe recibido a media lanzada se la corta, que es lo que se ve; y si los dos llegan a
 * la misma hora, gana el recibido, que es el que cuenta algo.
 */
export function gestoA(r: EnLaRefriega, t: number): GestoDeLaRefriega | null {
  if (estadoA(r, t) === CAIDO) {
    const desde = r.cayo !== null && r.cayo <= t ? r.cayo : r.estadoDesde - LO_QUE_DURA_CAER;
    return { clip: CLIP.caer, bucle: false, desde };
  }
  /* En este orden: a la misma hora gana el último. */
  const candidatos: readonly (readonly [NombreDeClip, number | null])[] = [
    [CLIP.aparecer, r.renacio],
    [CLIP.lanzar, r.lanzo],
    [CLIP.golpe, r.recibio],
  ];
  let mejor: GestoDeLaRefriega | null = null;
  for (const [clip, desde] of candidatos) {
    if (desde === null || desde > t || t - desde >= DURACION[clip] * 1000) continue;
    if (mejor === null || desde >= mejor.desde) mejor = { clip, bucle: false, desde };
  }
  return mejor;
}

/** Lo que dura cada mitad del parpadeo de quien es intocable: se ve y no se ve, cuatro veces por segundo. */
export const PARPADEO_MS = 125;

/** ¿Se ve la figura a la hora `t`? Siempre, salvo en las mitades apagadas del parpadeo de lo intocable. */
export function seVeA(r: EnLaRefriega, t: number): boolean {
  if (estadoA(r, t) !== INTOCABLE) return true;
  return Math.floor((t - r.estadoDesde) / PARPADEO_MS) % 2 === 0;
}

/** Los corazones del rótulo: cuántos llenos, y si están apagados, que es estar en el suelo. */
export interface Corazones {
  readonly llenos: number;
  readonly apagados: boolean;
}

export function corazonesA(r: EnLaRefriega, t: number): Corazones {
  return estadoA(r, t) === CAIDO ? { llenos: 0, apagados: true } : { llenos: vidaA(r, t), apagados: false };
}

/** Los corazones escritos, para el cartel de cómo va el canal: donde no se ve la figura propia. */
export const CORAZON_LLENO = '♥';
export const CORAZON_VACIO = '♡';

/**
 * CÓMO VOY, EN UNA LÍNEA: los corazones y, si toca, «caído» o «intocable». Es lo que dice el cartel
 * del canal de cada cliente, que es donde se mira en primera persona: desde los ojos no se ve el
 * rótulo propio.
 */
export function textoDeLaRefriega(r: EnLaRefriega, t: number): string {
  const c = corazonesA(r, t);
  const dibujo = CORAZON_LLENO.repeat(c.llenos) + CORAZON_VACIO.repeat(Math.max(0, VIDA_ENTERA - c.llenos));
  const estado = estadoA(r, t);
  if (estado === CAIDO) return `${dibujo} caído`;
  if (estado === INTOCABLE) return `${dibujo} intocable`;
  return dibujo;
}

/** Todo lo que quien pinta pregunta en un fotograma, contestado a la misma hora. */
export interface ComoVaEnLaRefriega {
  /** La hora a la que se ha mirado: la de ahora para uno mismo, `RETRASO_DE_LOS_DEMAS_MS` atrás para los demás. */
  readonly a: number;
  readonly vida: number;
  readonly estado: EstadoEnLaRefriega;
  readonly corazones: Corazones;
  readonly gesto: GestoDeLaRefriega | null;
  readonly seVe: boolean;
}

export function comoVaA(r: EnLaRefriega, t: number): ComoVaEnLaRefriega {
  return {
    a: t,
    vida: vidaA(r, t),
    estado: estadoA(r, t),
    corazones: corazonesA(r, t),
    gesto: gestoA(r, t),
    seVe: seVeA(r, t),
  };
}
