/**
 * QUÉ CAMINO DE PINTADO LLEVA CADA NIVEL EN ESTE APARATO. Puro: sin `three`.
 *
 * El nivel dice qué posproceso QUIERE (`TABLA_DE_NIVELES[n].posproceso`); el aparato dice cuál
 * PUEDE. El único límite duro es la media coma flotante: el compositor pleno vive en blancos
 * HalfFloat, y si el sondeo no consiguió CREAR uno, pedir N2 o N3 da el camino barato de N1, con su
 * aviso. No se veta nada: el nivel de adorno (lluvia, gente, sombras) sigue siendo el pedido; sólo la
 * imagen baja. El gobernador normalmente no llega a pedirlo, porque el techo del sondeo ya es N1 en
 * ese aparato, pero un nivel forzado (el banco, una lista de ajustes) sí puede.
 */
import type { NivelDeCalidad } from '../calidad/niveles';
import { TABLA_DE_NIVELES } from '../calidad/niveles';

export type CaminoDelPosproceso = 'directo' | 'barato' | 'pleno';

export interface CaminoElegido {
  readonly camino: CaminoDelPosproceso;
  /** Oclusión a media resolución y enfoque con profundidad: sólo en el camino pleno de N3. */
  readonly oclusion: boolean;
  readonly enfoqueConProfundidad: boolean;
  /** El brillo del camino pleno se calcula a media resolución de más (N2) o a la de siempre (N3). */
  readonly brilloReducido: boolean;
  /** Por qué no es lo que el nivel pedía, o null. */
  readonly aviso: string | null;
}

export function caminoPara(nivel: NivelDeCalidad, mediaFlotante: boolean): CaminoElegido {
  const palancas = TABLA_DE_NIVELES[nivel];
  if (palancas.posproceso === 'ninguno') {
    return { camino: 'directo', oclusion: false, enfoqueConProfundidad: false, brilloReducido: false, aviso: null };
  }
  if (palancas.posproceso === 'barato') {
    return { camino: 'barato', oclusion: false, enfoqueConProfundidad: false, brilloReducido: false, aviso: null };
  }
  if (!mediaFlotante) {
    return {
      camino: 'barato',
      oclusion: false,
      enfoqueConProfundidad: false,
      brilloReducido: false,
      aviso: `${palancas.nombre} pide el compositor pleno, pero este aparato no creó un blanco HalfFloat: se pinta con el camino barato de N1`,
    };
  }
  return {
    camino: 'pleno',
    oclusion: palancas.oclusion,
    enfoqueConProfundidad: palancas.enfoqueConProfundidad,
    brilloReducido: nivel < 3,
    aviso: null,
  };
}
