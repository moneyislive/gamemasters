/**
 * LOS RELOJES DEL APARATO EN LA LIZA: el de su canal, el de la sala estimado, y la red medida.
 *
 * ═══ POR QUÉ EL RELOJ EMPIEZA EN CERO CON CADA CANAL ═══
 *
 * El protocolo (`shared/mecanicas/liza/protocolo.ts`, «el reloj del aparato es el de su canal») cuenta
 * todo instante del aparato —el `n` de cada `aqui`, el `ms` de cada pulsación, el `c` del `hola` y del
 * `eco`, el `t` de cada anuncio que llega— en milisegundos DESDE QUE SE ABRIÓ ESTE CANAL. No es un
 * capricho: `performance.now()` vuelve a cero al recargar la pestaña, y un reloj que se reinicia a
 * escondidas mandaría a la basura todos los `aqui` hasta alcanzar al de antes. Así que `origen` es el
 * `performance.now()` en el instante de abrir, y cada canal nuevo es un reloj nuevo que la sala conoce
 * por su `EntradaConexion`.
 *
 * Lo que sí es de `performance.now()` —el `timeStamp` de un evento de puntero, el `ahora` de un
 * fotograma— se pasa a este reloj restando `origen`. Una pulsación ANTERIOR a abrir el canal da un
 * instante negativo, y ésa no se manda: el lector de la sala la tiraría (y con ella el `aqui` entero).
 *
 * ═══ EL RELOJ DE LA SALA, ESTIMADO, Y PARA QUÉ SÍ Y PARA QUÉ NO ═══
 *
 * El aparato NO juzga nada con el reloj de la sala: los anuncios llegan ya traducidos a su reloj
 * (diseño §4.3), y ése es el que cierra los anillos. El de la sala hace falta sólo para PINTAR: a qué
 * tic de la sala corresponde «150 ms atrás» para interpolar a los demás, qué tic tienen los durmientes y
 * el tren (el mismo en todos los aparatos), cuánto le queda a un reloj de fase. Por eso basta una
 * estimación: `desfase = reloj del aparato − reloj de la sala`, sacada de cada `eco` con
 * `c + rtt/2 − ms` (la misma cuenta que hace la E/S del servidor con el `hola`), y la mediana de las
 * últimas `ECOS_DE_LA_MEDIANA` para que un eco que se quedó atascado en una cola no tuerza la mano.
 *
 * Antes del primer eco vale lo que dijo el `dentro`: su `k` es el tic de la sala cuando se escribió, y
 * llegó media ida y vuelta después. Y una FOTO nunca puede venir del futuro: si llega una foto con un
 * `k` mayor que el tic que se estimaba, la estimación iba atrasada y se corrige en el acto (una foto
 * que se pinta 150 ms atrás de algo que aún «no ha pasado» se congela, y eso sí se ve).
 *
 * Puro: ni `performance` ni `Date`. Quien llama pasa el `ahora` (ms de `performance.now()`).
 */
import { ECOS_DE_LA_MEDIANA } from '../../../../shared/mecanicas/liza/protocolo';
import { MS_POR_TIC } from '../../../../shared/mecanicas/liza/declaracion';

/** El reloj de UN canal: su origen en `performance.now()` y las conversiones. */
export class RelojDelCanal {
  /** El `performance.now()` en el instante de abrir el canal. */
  readonly origen: number;

  constructor(origen: number) {
    this.origen = origen;
  }

  /** Los ms enteros del canal en el instante `ahora` (ms de `performance.now()`), hacia abajo. */
  ms(ahora: number): number {
    return Math.floor(ahora - this.origen);
  }

  /** El tic del aparato (`n` de `aqui`): tramos de 50 ms desde que se abrió. */
  tic(ahora: number): number {
    return Math.floor((ahora - this.origen) / MS_POR_TIC);
  }

  /** Un instante del canal (el `t` de un anuncio) en ms de `performance.now()`. */
  aPerformance(msDelCanal: number): number {
    return msDelCanal + this.origen;
  }

  /**
   * El `ms` que viaja con una pulsación, del `timeStamp` de su evento. `null` si es de antes de abrir
   * (no se manda) o si el evento no trae un instante que sirva.
   */
  msDeLaPulsacion(timeStamp: number): number | null {
    if (!Number.isFinite(timeStamp)) return null;
    const ms = Math.floor(timeStamp - this.origen);
    return ms < 0 ? null : ms;
  }
}

/** Una medida de la red: la ida y vuelta y el desfase que sale de ella. */
export interface MedidaDeLaRed {
  readonly rttMs: number;
  readonly desfaseMs: number;
}

/** La mediana de una lista corta de números (sin tocarla). `NaN` si está vacía. */
export function mediana(valores: readonly number[]): number {
  if (valores.length === 0) return Number.NaN;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 === 1 ? (orden[medio] as number) : ((orden[medio - 1] as number) + (orden[medio] as number)) / 2;
}

/**
 * LA RED VISTA DESDE EL APARATO: las últimas ida y vuelta y el desfase estimado con el reloj de la sala.
 * Una por canal (un canal nuevo es un reloj nuevo: lo medido con el viejo no vale).
 */
export class RedDelAparato {
  private readonly medidas: MedidaDeLaRed[] = [];
  /** El desfase provisional del `dentro` (antes del primer eco), o `NaN`. */
  private provisional = Number.NaN;
  /** Lo que se ha subido la estimación porque una foto llegó «del futuro». */
  private ajuste = 0;

  /** Llega el `dentro`: su `k` se escribió media ida y vuelta antes de `msDelCanal`. */
  alEntrar(k: number, msDelCanal: number): void {
    const rtt = this.rtt();
    this.provisional = msDelCanal - (Number.isNaN(rtt) ? 0 : rtt / 2) - k * MS_POR_TIC;
    this.ajuste = 0;
  }

  /**
   * Vuelve un `eco`: `c` es el reloj del canal con que se mandó, `msDeLaSala` el de la sala al
   * contestar, y `msDelCanal` el del canal al recibirlo. Un eco imposible (vuelve antes de irse) se
   * ignora: es un eco de otro canal o un reloj roto.
   */
  alEco(c: number, msDeLaSala: number, msDelCanal: number): MedidaDeLaRed | null {
    const rtt = msDelCanal - c;
    if (!(rtt >= 0) || !Number.isFinite(msDeLaSala)) return null;
    const medida: MedidaDeLaRed = { rttMs: rtt, desfaseMs: c + rtt / 2 - msDeLaSala };
    this.medidas.push(medida);
    while (this.medidas.length > ECOS_DE_LA_MEDIANA) this.medidas.shift();
    this.ajuste = 0;
    return medida;
  }

  /** La mediana de la ida y vuelta, o `NaN` sin ecos. */
  rtt(): number {
    return mediana(this.medidas.map((m) => m.rttMs));
  }

  /** El desfase (aparato − sala) estimado, o `NaN` si aún no hay nada con que estimarlo. */
  desfase(): number {
    const d = this.medidas.length > 0 ? mediana(this.medidas.map((m) => m.desfaseMs)) : this.provisional;
    return d - this.ajuste;
  }

  /** ¿Hay estimación? */
  sabe(): boolean {
    return !Number.isNaN(this.desfase());
  }

  /** El tic de la sala (con decimales) en el instante `msDelCanal` del aparato. */
  ticDeLaSala(msDelCanal: number): number {
    const d = this.desfase();
    return Number.isNaN(d) ? Number.NaN : (msDelCanal - d) / MS_POR_TIC;
  }

  /**
   * Llega una foto del tic `k` en `msDelCanal`: la sala está, como poco, en `k`. Si la estimación
   * decía menos, iba atrasada y se adelanta lo justo. Nunca se atrasa por una foto: una foto que
   * llega tarde es lo normal y no dice nada del reloj.
   */
  alFotografiar(k: number, msDelCanal: number): void {
    const estimado = this.ticDeLaSala(msDelCanal);
    if (Number.isNaN(estimado)) return;
    if (estimado < k) this.ajuste += (k - estimado) * MS_POR_TIC;
  }
}
