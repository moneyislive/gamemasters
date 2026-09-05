/**
 * LOS DADOS DE LA MESA: en qué par se parte una suma, y en qué fase está su animación.
 *
 * ═══ SIN `three`, SIN REACT, Y SIN SABER QUE ESTO ES RIBERAS ═══
 *
 * Aquí no se pinta nada. Lo que hay son dos cosas que se pueden comprobar en Node con
 * una serie de sucesos, y por eso viven aparte de quien las dibuja: el REPARTO de una
 * suma en dos caras, y la MÁQUINA que dice si los dados están quietos, rodando o
 * asentándose. Quien pinta les pregunta en cada fotograma y escribe posición y giro; no
 * decide nada. Es la misma partición que `gestos.ts` en el Muelle: el reloj se inyecta
 * (`ahora`, en segundos) y ninguna transición mira la hora del sistema.
 *
 * Y no se importa nada de `shared/arcade`: la escena no sabe que existe Riberas. Lo que
 * le llega es una SUMA, un SELLO y una SEMILLA —tres enteros— y quién los calcula (el
 * sello es el turno en que se tiró: `selloDeLaTirada` en `riberas-en-tres.ts`) es cosa
 * de quien sí conoce el juego.
 *
 * ═══ EL REPARTO ES TEATRO, Y POR ESO NO SE PIDE AL SERVIDOR ═══
 *
 * El servidor publica la SUMA (`ultimaTirada`) y nada más: el juego sólo usa la suma. Un
 * solo cubo no puede enseñar un 7, así que son dos dados, y las dos caras las elige el
 * cliente. Lo que no puede pasar es que dos aparatos vean pares distintos, ni que el par
 * cambie a mitad de turno: el par sale de `revoltijo(suma, sello, semilla)`, tres enteros
 * que viajan en la vista o se derivan del código de la mesa, así que es el mismo en los
 * cuatro teléfonos y tras recargar. El sello es el TURNO y no `rev` —`rev` sube con cada
 * movimiento y el par cambiaría al pasar una carta— ni el asiento —con el asiento cada
 * colono enseña SIEMPRE el mismo par para la misma suma: medido, 3 de los 6 pares del 7
 * en toda la partida; dados trucados a la vista—.
 *
 * ═══ CÓMO SE LLEVA CADA COSA A ENTERO ═══
 *
 * `revoltijo` hace `| 0` con cada argumento, o sea entero de 32 bits con signo. La suma
 * (2..12) y el sello (un contador de turnos) ya son enteros y pasan tal cual. La semilla es
 * FNV-1a de 32 bits SIN signo —puede pasar de 2³¹— y se mezcla con un canal propio,
 * `semilla ^ CANAL_DEL_REPARTO`, para no correlar con el paisaje que siembra la misma
 * semilla; el `^` ya la deja en 32 bits con signo y el `| 0` de después lo dice en voz
 * alta. Los mismos bits en todos los motores: es lo que hace que el par sea el mismo.
 */
import { revoltijo } from './revoltijo';

/** El canal con el que se mezcla la semilla de la mesa para el reparto. Fijo. */
export const CANAL_DEL_REPARTO = 41_011;

/** Un par de caras, cada una de 1 a 6. */
export type ParDeDados = readonly [number, number];

/** Los pares de caras que suman `suma`, en orden: el 7 tiene seis, el 2 y el 12 uno. */
export function paresDeLaSuma(suma: number): ParDeDados[] {
  const pares: ParDeDados[] = [];
  for (let a = 1; a <= 6; a++) {
    const b = suma - a;
    if (b >= 1 && b <= 6) pares.push([a, b]);
  }
  return pares;
}

/**
 * EN QUÉ PAR SE ENSEÑA UNA SUMA, determinista por (suma, sello, semilla).
 *
 * Con una suma que no se saca con dos dados —el 0 de antes de la primera tirada— devuelve
 * `[1, 1]`: los dados en reposo, sin tapete. No es un error: es «todavía no se ha tirado».
 */
export function repartoDeLaTirada(suma: number, sello: number, semilla: number): ParDeDados {
  const pares = paresDeLaSuma(suma);
  const primero = pares[0];
  if (primero === undefined) return [1, 1];
  return pares[revoltijo(suma, sello, (semilla ^ CANAL_DEL_REPARTO) | 0) % pares.length] ?? primero;
}

// ---------------------------------------------------------------------------
// La máquina
// ---------------------------------------------------------------------------

/** Cuánto ruedan como mínimo aunque la respuesta llegue antes, en segundos. */
export const RODAR_MINIMO = 0.6;
/** Cuánto tardan en asentarse en la cara objetivo una vez la tienen. */
export const ASENTAR = 0.35;
/**
 * CUÁNTO RUEDAN SIN OBJETIVO ANTES DE RENDIRSE. Sólo pasa cuando la red no ha contestado
 * ni bien ni mal: un rechazo llega como suceso `rechazado` en el acto y no espera esto.
 */
export const TOPE_SIN_RESPUESTA = 6;

/**
 * LO QUE LA MÁQUINA LEE DE UNA VISTA: la suma, si ya se tiró, y el sello del turno.
 *
 * Con esto y la semilla sabe qué par enseñar y si la tirada es NUEVA respecto de la
 * última vista que le llegó. No lee `turnosAbiertos` a secas: recibe el sello ya
 * calculado por quien conoce el juego.
 */
export interface VistaDeLosDados {
  readonly tirado: boolean;
  readonly ultimaTirada: number;
  readonly sello: number;
}

/**
 * LAS TRES FASES.
 *
 *   · `quieta(par)`: los dos enseñan `par`.
 *   · `rodando(desde, objetivo | null, anterior)`: giran desde el instante `desde`. Con
 *     `objetivo` a `null` todavía no se sabe el número —es mi propio toque esperando al
 *     servidor—; con objetivo, ya llegó (y `llegoEn` dice cuándo) y se asentarán en
 *     `max(desde + RODAR_MINIMO, llegoEn)`. `anterior` es el par al que se vuelve si el
 *     movimiento se rechaza o la red no contesta.
 *   · `asentando(desde, par)`: interpolan hacia `par` durante `ASENTAR` segundos.
 */
export type FaseDeLosDados =
  | { readonly fase: 'quieta'; readonly par: ParDeDados }
  | {
      readonly fase: 'rodando';
      readonly desde: number;
      readonly objetivo: { readonly par: ParDeDados; readonly llegoEn: number } | null;
      readonly anterior: ParDeDados;
    }
  | { readonly fase: 'asentando'; readonly desde: number; readonly par: ParDeDados };

/**
 * EL ESTADO ENTERO: la fase, la última vista que se vio y la semilla de la mesa.
 *
 * La última vista hace falta para saber si la siguiente trae una TIRADA NUEVA; la
 * semilla, para partir la suma. Ninguna de las dos cambia con los toques.
 */
export interface EstadoDeLosDados {
  readonly fase: FaseDeLosDados;
  readonly vista: VistaDeLosDados | null;
  readonly semilla: number;
}

/**
 * LOS SUCESOS.
 *
 *   · `tocado`: el asa se ha pulsado y la pantalla ha mandado TIRAR.
 *   · `vista`: ha llegado una vista (por el sondeo o con la respuesta del movimiento).
 *   · `tic`: un fotograma. Sólo mira el reloj.
 *   · `rechazado`: `mover` ha vuelto con `'rechazado'` o `'sin-red'`: la tirada que se
 *     esperaba no va a llegar.
 */
export type SucesoDeLosDados =
  | { readonly que: 'tocado' }
  | { readonly que: 'tic' }
  | { readonly que: 'rechazado' }
  | { readonly que: 'vista'; readonly vista: VistaDeLosDados };

/** Los dados antes de la primera vista: quietos en 1 y 1. */
export function dadosEnReposo(semilla: number): EstadoDeLosDados {
  return { fase: { fase: 'quieta', par: [1, 1] }, vista: null, semilla };
}

/** El par que hay que enseñar, o hacia el que se va, en cualquier fase. */
export function parQueSeEnsena(fase: FaseDeLosDados): ParDeDados {
  if (fase.fase === 'rodando') return fase.objetivo === null ? fase.anterior : fase.objetivo.par;
  return fase.par;
}

/**
 * ¿TRAE ESTA VISTA UNA TIRADA NUEVA respecto de la anterior?
 *
 * Lo es si `tirado` pasa de falso a verdadero, o si con `tirado` verdadero cambian el
 * sello o la suma (dos movimientos entre dos vueltas del sondeo). La PRIMERA vista nunca
 * es nueva: al montar o al recargar, lo que hay en la mesa es noticia vieja y se enseña
 * en reposo. Y si el sello cambia con `tirado` falso, la tirada del turno anterior se
 * perdió entre sondeos: también se enseña sin animar.
 */
function traeTiradaNueva(anterior: VistaDeLosDados | null, vista: VistaDeLosDados): boolean {
  if (anterior === null || !vista.tirado) return false;
  return !anterior.tirado || anterior.sello !== vista.sello || anterior.ultimaTirada !== vista.ultimaTirada;
}

/**
 * LA TRANSICIÓN. Pura: devuelve el estado siguiente y no toca el que recibe.
 *
 * Las reglas, una por suceso; lo que no está escrito no hace nada, a propósito:
 *
 *   · `tocado` en `quieta` → `rodando(ahora, null)`. En cualquier otra fase, nada: el
 *     segundo toque de un doble toque no arranca nada.
 *   · `rechazado` en `rodando` SIN objetivo → `quieta(anterior)` en el acto. Con objetivo,
 *     nada: la vista ya trajo una tirada (de otro, o de mi otra pestaña) y se asienta en
 *     ella. Lo que falló lo dice el aviso de la mesa; los dados no inventan un error.
 *   · `vista` con tirada nueva: en `rodando`, se fija el objetivo y se asienta en
 *     `max(desde + RODAR_MINIMO, ahora)`; en `quieta` o `asentando` (la tirada es de otro,
 *     o la mía llegó sin que yo tocara), `rodando(ahora, objetivo)`. Sin tirada nueva, en
 *     `quieta` se actualiza el par sin animar; en las demás fases no cambia nada.
 *   · `tic`: `rodando` con objetivo y pasado el mínimo → `asentando`; `asentando` pasados
 *     `ASENTAR` → `quieta(par)`; `rodando` sin objetivo pasado el tope → `quieta(anterior)`.
 */
export function faseDeLosDados(estado: EstadoDeLosDados, suceso: SucesoDeLosDados, ahora: number): EstadoDeLosDados {
  const { fase } = estado;

  if (suceso.que === 'tocado') {
    if (fase.fase !== 'quieta') return estado;
    return { ...estado, fase: { fase: 'rodando', desde: ahora, objetivo: null, anterior: fase.par } };
  }

  if (suceso.que === 'rechazado') {
    if (fase.fase !== 'rodando' || fase.objetivo !== null) return estado;
    return { ...estado, fase: { fase: 'quieta', par: fase.anterior } };
  }

  if (suceso.que === 'vista') {
    const { vista } = suceso;
    const par = repartoDeLaTirada(vista.ultimaTirada, vista.sello, estado.semilla);
    const conVista = { ...estado, vista };
    if (!traeTiradaNueva(estado.vista, vista)) {
      return fase.fase === 'quieta' ? { ...conVista, fase: { fase: 'quieta', par } } : conVista;
    }
    if (fase.fase === 'rodando') {
      const asentarDesde = Math.max(fase.desde + RODAR_MINIMO, ahora);
      return asentarDesde <= ahora
        ? { ...conVista, fase: { fase: 'asentando', desde: asentarDesde, par } }
        : { ...conVista, fase: { ...fase, objetivo: { par, llegoEn: ahora } } };
    }
    return {
      ...conVista,
      fase: { fase: 'rodando', desde: ahora, objetivo: { par, llegoEn: ahora }, anterior: parQueSeEnsena(fase) },
    };
  }

  /* tic */
  if (fase.fase === 'rodando') {
    if (fase.objetivo !== null) {
      const asentarDesde = Math.max(fase.desde + RODAR_MINIMO, fase.objetivo.llegoEn);
      return ahora >= asentarDesde ? { ...estado, fase: { fase: 'asentando', desde: asentarDesde, par: fase.objetivo.par } } : estado;
    }
    return ahora >= fase.desde + TOPE_SIN_RESPUESTA ? { ...estado, fase: { fase: 'quieta', par: fase.anterior } } : estado;
  }
  if (fase.fase === 'asentando') {
    return ahora >= fase.desde + ASENTAR ? { ...estado, fase: { fase: 'quieta', par: fase.par } } : estado;
  }
  return estado;
}
