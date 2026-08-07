/**
 * La forma de la barra inferior: recta a los lados y con una muesca en el
 * centro donde encaja el botón del Mayordomo.
 *
 * Va en su propio fichero, sin JSX ni React, porque es lo único de la barra que
 * puede estar mal de forma silenciosa: un arco con la bandera equivocada no
 * revienta ni avisa, simplemente dibuja una joroba en vez de una muesca.
 *
 * Cómo se construye, de dentro a fuera:
 *
 *   · La MUESCA es un arco CONCÉNTRICO con el botón, de radio R + HOLGURA. Ser
 *     concéntrica es lo que hace que la separación entre el filo y el botón sea
 *     la misma en todo el recorrido; con cualquier otra curva, el hueco se
 *     abre por unos sitios y se cierra por otros.
 *
 *   · Entre la recta y la muesca va un FILETE: un arco tangente a las dos, que
 *     evita el ángulo duro donde una se convierte en la otra. Sin él la muesca
 *     parece un mordisco; con él, parece moldeada.
 *
 * El parámetro `offset` desplaza toda la composición hacia dentro y sirve para
 * el segundo filete del doble filo art-decó. No es una aproximación: la curva
 * desplazada sigue siendo exactamente tangente, porque el centro del filete no
 * se mueve al desplazarla.
 */

const n = (v: number): number => Math.round(v * 1000) / 1000;

export interface ParametrosBarra {
  /** Ancho de la pantalla, en dp. */
  ANCHO: number;
  /** Radio del botón central. */
  R: number;
  /** Cuánto asoma el botón por encima del filo de la barra. */
  SALIENTE: number;
  /** Aire entre el botón y el borde de la muesca. */
  HOLGURA: number;
  /** Radio del filete que suaviza la entrada a la muesca. */
  FILETE: number;
  /** Desplazamiento hacia dentro, para el filo interior. */
  offset?: number;
}

export interface Muesca {
  cx: number;
  cy: number;
  yBorde: number;
  Rn: number;
  Rf: number;
  L: number;
  ax: number;
  bx: number;
  tlx: number;
  trx: number;
  ty: number;
  largeArc: 0 | 1;
  fondo: number;
}

/**
 * Los puntos notables de la muesca.
 *
 * @throws nunca: si los parámetros son imposibles devuelve una muesca degenerada
 * en vez de NaN, porque un `d` con NaN hace desaparecer la barra entera.
 */
export function geometriaMuesca(p: ParametrosBarra): Muesca {
  const { ANCHO, R, HOLGURA, offset = 0 } = p;
  const cx = ANCHO / 2;
  const cy = R;
  const yBorde = p.SALIENTE + offset;
  const Rn = R + HOLGURA + offset;
  const Rf = Math.max(0.001, p.FILETE - offset);
  const d = cy - yBorde;

  // Si el saliente fuese tan grande que el círculo de la muesca ya no cortara
  // la recta del borde, esto sería la raíz de un número negativo y todo el
  // atributo `d` se llenaría de NaN.
  const bajoRaiz = (Rn + Rf) ** 2 - (Rf - d) ** 2;
  const L = bajoRaiz > 0 ? Math.sqrt(bajoRaiz) : 0;
  const k = Rn / (Rn + Rf);

  return {
    cx,
    cy,
    yBorde,
    Rn,
    Rf,
    L,
    ax: cx - L,
    bx: cx + L,
    tlx: cx - L * k,
    trx: cx + L * k,
    ty: cy + (Rf - d) * k,
    // Cuando el botón se hunde lo suficiente, el arco de la muesca pasa de
    // media vuelta. Escrito a mano estaría mal la mitad de las veces.
    largeArc: Rf - d < 0 ? 1 : 0,
    fondo: cy + Rn,
  };
}

/** El filo superior, abierto: recta, filete, muesca, filete, recta. */
export function bordeSuperior(p: ParametrosBarra): string {
  const g = geometriaMuesca(p);
  return (
    `M 0 ${n(g.yBorde)} L ${n(g.ax)} ${n(g.yBorde)} ` +
    `A ${n(g.Rf)} ${n(g.Rf)} 0 0 1 ${n(g.tlx)} ${n(g.ty)} ` +
    `A ${n(g.Rn)} ${n(g.Rn)} 0 ${g.largeArc} 0 ${n(g.trx)} ${n(g.ty)} ` +
    `A ${n(g.Rf)} ${n(g.Rf)} 0 0 1 ${n(g.bx)} ${n(g.yBorde)} ` +
    `L ${n(p.ANCHO)} ${n(g.yBorde)}`
  );
}

/** El mismo filo, cerrado por abajo: es la silueta que se rellena. */
export function siluetaBarra(p: ParametrosBarra & { ALTO: number }): string {
  const H = p.SALIENTE + p.ALTO;
  return `${bordeSuperior(p)} L ${n(p.ANCHO)} ${n(H)} L 0 ${n(H)} Z`;
}
