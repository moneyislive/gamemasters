/**
 * LOS DADOS DEL BURGO: la máquina hermana de `faseDeLosDados` que recibe el PAR.
 *
 * ═══ POR QUÉ NO SE REUTILIZA `faseDeLosDados` TAL CUAL ═══
 *
 * La de Riberas (`escenas/dados.ts`) lee la SUMA de la vista y se inventa el par con
 * `repartoDeLaTirada`: teatro determinista, porque en Riberas sólo importa la suma. En el
 * Burgo los DOBLES son regla —repiten turno, sacan de la Mazmorra, y al tercero mandan a
 * ella—, así que el par vive en el estado y viaja en la vista, y la escena no puede
 * inventarlo. Ésta es la misma máquina con las mismas tres fases (`quieta`, `rodando`,
 * `asentando`) y los mismos cuatro sucesos (`tocado`, `tic`, `rechazado`, `vista`), con la
 * única diferencia de que la vista trae `par` y no `ultimaTirada`. Las curvas de la
 * animación (`sacudida`, `saltoDelDado`, `anguloRodado`, `reboteDelDado`,
 * `giroDelDadoAsentado`) y los plazos (`RODAR_MINIMO`, `ASENTAR`, `TOPE_SIN_RESPUESTA`) se
 * importan de allí: son las mismas, y dos copias divergirían.
 *
 * ═══ LAS DOS REGLAS QUE SE CONSERVAN A PROPÓSITO ═══
 *
 *   · «La primera vista nunca es nueva»: al montar o al recargar, lo que hay en la mesa es
 *     noticia vieja y se enseña en reposo, sin rodar.
 *   · `[1, 1]` en reposo cuando `par === null`: antes de la primera tirada los dados están
 *     quietos y no hay nada que enseñar.
 *
 * ═══ Y UNA REGLA NUEVA: EL DOBLE SE SUBRAYA ═══
 *
 * Un doble da un salto extra de un cuarto de segundo al asentarse (`saltoDelDoble`), y el
 * aviso de la hoja lo dice. Es la única animación que mira el valor de los dados, y sólo
 * para eso: la máquina no decide nada, sólo enseña.
 *
 * ═══ SIN `three`, SIN REACT ═══
 *
 * Como `dados.ts`: se recorre en Node con una serie de sucesos (`verify:burgo-escena`).
 */
import { ASENTAR, RODAR_MINIMO, TOPE_SIN_RESPUESTA, parQueSeEnsena } from '../dados';
import type { FaseDeLosDados, ParDeDados, SucesoDeLosDados } from '../dados';

export { ASENTAR, RODAR_MINIMO, TOPE_SIN_RESPUESTA, parQueSeEnsena };
export type { FaseDeLosDados, ParDeDados };

/** El par en reposo, antes de la primera tirada: dos unos, sin tapete. */
export const PAR_EN_REPOSO: ParDeDados = [1, 1];

/** Cuánto salta de más un doble al asentarse, en segundos, y cuánto sube (en aristas). */
export const SALTO_EXTRA_DEL_DOBLE = 0.25;
export const ALTURA_DEL_SALTO_DEL_DOBLE = 0.3;

/**
 * LO QUE LA MÁQUINA LEE DE UNA VISTA: el PAR (o `null` si aún no se tiró en esta partida),
 * si ya se tiró en este turno, y el sello del turno (para que el par no cambie a mitad de
 * turno y para el giro libre del asentado).
 */
export interface VistaDeLosDadosDelBurgo {
  readonly par: ParDeDados | null;
  readonly tirado: boolean;
  readonly sello: number;
}

/**
 * LOS SUCESOS: los de `dados.ts` con la vista del Burgo en vez de la de Riberas. Los otros
 * tres son los mismos objetos.
 */
export type SucesoDeLosDadosDelBurgo = Exclude<SucesoDeLosDados, { que: 'vista' }> | { readonly que: 'vista'; readonly vista: VistaDeLosDadosDelBurgo };

export interface EstadoDeLosDadosDelBurgo {
  readonly fase: FaseDeLosDados;
  /** La última vista que se vio, para saber si la siguiente trae tirada nueva. */
  readonly vista: VistaDeLosDadosDelBurgo | null;
}

/** Los dados antes de la primera vista: quietos en 1 y 1. */
export function dadosDelBurgoEnReposo(): EstadoDeLosDadosDelBurgo {
  return { fase: { fase: 'quieta', par: PAR_EN_REPOSO }, vista: null };
}

/**
 * ¿ES ESTO UN PAR DE DADOS? Lo que llega por la red se mira antes de creerlo: dos enteros
 * de 1 a 6, ni uno ni tres. Con cualquier otra cosa, `null`: es lo que `dadosEnTres` tiene
 * que devolver ante una vista con un solo número (vacuna de `verify:burgo-escena`).
 */
export function parDeLaVista(x: unknown): ParDeDados | null {
  if (!Array.isArray(x) || x.length !== 2) return null;
  const a: unknown = x[0];
  const b: unknown = x[1];
  const cara = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 6;
  return cara(a) && cara(b) ? [a, b] : null;
}

/** ¿Son iguales las dos caras? Es la única pregunta que la escena hace al valor. */
export function esDoble(par: ParDeDados | null): boolean {
  return par !== null && par[0] === par[1];
}

/** El par que se enseña con una vista: el suyo, o dos unos si todavía no hay tirada. */
export function parDeReposo(vista: VistaDeLosDadosDelBurgo | null): ParDeDados {
  return vista?.par ?? PAR_EN_REPOSO;
}

const mismoPar = (a: ParDeDados | null, b: ParDeDados | null): boolean =>
  a === b || (a !== null && b !== null && a[0] === b[0] && a[1] === b[1]);

/**
 * ¿TRAE ESTA VISTA UNA TIRADA NUEVA respecto de la anterior?
 *
 * Lo es si `tirado` pasa de falso a verdadero, o si con `tirado` verdadero cambian el
 * sello o el par (dos movimientos entre dos vueltas del sondeo, o un turno repetido por
 * doble con el mismo sello). La PRIMERA vista nunca es nueva. Y una vista sin par nunca
 * es nueva: no hay nada hacia lo que asentarse.
 */
export function traeTiradaNueva(anterior: VistaDeLosDadosDelBurgo | null, vista: VistaDeLosDadosDelBurgo): boolean {
  if (anterior === null || !vista.tirado || vista.par === null) return false;
  return !anterior.tirado || anterior.sello !== vista.sello || !mismoPar(anterior.par, vista.par);
}

/**
 * LA TRANSICIÓN, con las mismas reglas que `faseDeLosDados` (ver su cabecera), pero el
 * par sale de la vista y no de un reparto:
 *
 *   · `tocado` en `quieta` → `rodando(ahora, null)`; en otra fase, nada.
 *   · `rechazado` en `rodando` SIN objetivo → `quieta(anterior)`; con objetivo, nada.
 *   · `vista` con tirada nueva: en `rodando`, se fija el objetivo y se asienta en
 *     `max(desde + RODAR_MINIMO, ahora)`; si no, `rodando(ahora, objetivo)`. Sin tirada
 *     nueva, en `quieta` se actualiza el par sin animar; en las demás fases, nada.
 *   · `tic`: `rodando` con objetivo y pasado el mínimo → `asentando`; `asentando` pasados
 *     `ASENTAR` → `quieta(par)`; `rodando` sin objetivo pasado el tope → `quieta(anterior)`.
 */
export function faseDeLosDadosConPar(estado: EstadoDeLosDadosDelBurgo, suceso: SucesoDeLosDadosDelBurgo, ahora: number): EstadoDeLosDadosDelBurgo {
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
    const par = parDeReposo(vista);
    const conVista: EstadoDeLosDadosDelBurgo = { ...estado, vista };
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

/**
 * EL SALTO EXTRA DEL DOBLE, en aristas: un seno de `SALTO_EXTRA_DEL_DOBLE` segundos que
 * arranca cuando los dados acaban de asentarse (`transcurrido` desde el fin del asentado).
 * Cero si no es doble o fuera de plazo: la mesa es sólida.
 */
export function saltoDelDoble(par: ParDeDados, transcurrido: number): number {
  if (!esDoble(par) || transcurrido <= 0 || transcurrido >= SALTO_EXTRA_DEL_DOBLE) return 0;
  return ALTURA_DEL_SALTO_DEL_DOBLE * Math.sin((transcurrido / SALTO_EXTRA_DEL_DOBLE) * Math.PI);
}

/** Cuánto dura la tirada entera en pantalla: rodar, asentar y, si es doble, su salto. */
export function duracionDeLaTirada(par: ParDeDados | null): number {
  return RODAR_MINIMO + ASENTAR + (esDoble(par) ? SALTO_EXTRA_DEL_DOBLE : 0);
}
