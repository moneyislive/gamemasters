/**
 * LA HORA DE LA PLAZA: los colores y las luces de la última hora de la tarde, y
 * los del mediodía del tablero, que es adonde se va al zarpar.
 *
 * ═══ POR QUÉ LA TARDE Y NO LA HORA AZUL ═══
 *
 * El Muelle de Riberas espera a la hora azul porque su tablero es un delta que
 * amanece: el zarpe es un amanecer. El Burgo se juega a MEDIODÍA (`Burgo.tsx`:
 * cénit `#6fa9dc`, horizonte `#e9e0c8`, niebla `#d6dfe4`), y su lobby es una
 * ciudad moderna, que a la hora azul sería una calle apagada con farolas. Así que
 * la plaza espera a la última hora de la tarde —cielo limpio, sol bajo y cálido
 * que dora las fachadas y las caras— y el zarpe no es un amanecer: es el reloj
 * que corre hacia atrás hasta el mediodía del tablero mientras la cámara sube. Lo
 * que se ve al final del zarpe tiene que ser EXACTAMENTE el cielo con el que abre
 * el tablero, o el cambio de pantalla se nota como un corte.
 *
 * ═══ LOS COLORES DEL MEDIODÍA ESTÁN COPIADOS, NO IMPORTADOS ═══
 *
 * `Burgo.tsx` no los exporta y esta carpeta no toca esa escena. Se copian aquí, y
 * `verify:plaza` los lee del FUENTE de `Burgo.tsx` con una expresión regular (la
 * misma idea con la que `verify:embarcadero` vigila la paleta de los colonos): el
 * día que el tablero cambie de cielo, esto se pone rojo en vez de dejar un corte
 * de color al zarpar.
 *
 * ═══ LA LUZ DE CARA ACABA EN CERO ═══
 *
 * La plaza lleva una luz que va con la cámara (ver `LuzDeCara` en `Plaza.tsx`),
 * como el Muelle. El tablero no la tiene. Al final del zarpe su intensidad llega a
 * cero, para que el primer fotograma del tablero y el último de la plaza tengan las
 * mismas luces.
 *
 * ═══ SIN `three`, A PROPÓSITO ═══
 *
 * Son datos. La escena los pasa a `THREE.Color` y los mezcla en lineal; el
 * comprobador los lee sin motor de dibujo.
 */
import { ALCANCE_DEL_BURGO } from '../burgo/camara-del-burgo';

export interface LuzDeUnaHora {
  /** El color del cielo en lo alto. */
  readonly cenit: string;
  /** El color del cielo en el horizonte. */
  readonly horizonte: string;
  /** El color de la niebla, que es donde se funden las fachadas del fondo. */
  readonly niebla: string;
  /** El halo del cielo alrededor del sol. */
  readonly resplandor: string;
  /** Hacia dónde está el sol (sin normalizar: lo normaliza quien lo usa). */
  readonly rumboDelSol: readonly [number, number, number];
  readonly sol: { readonly color: string; readonly intensidad: number };
  readonly hemisferio: { readonly cielo: string; readonly suelo: string; readonly intensidad: number };
  readonly cara: { readonly color: string; readonly intensidad: number };
  /** La niebla lineal: dónde empieza y dónde se cierra. */
  readonly nieblaCerca: number;
  readonly nieblaLejos: number;
}

/**
 * LA ÚLTIMA HORA DE LA TARDE.
 *
 * El sol está BAJO (unos quince grados) y DETRÁS de la cámara, un poco a su
 * izquierda: es lo que dora las fachadas del fondo y pone luz en la cara de quien
 * espera, que mira a la cámara. Con el sol delante, la plaza entera quedaría a
 * contraluz y los aventureros en silueta, que es justo lo que el Muelle tuvo que
 * arreglar con la luz de cara. El horizonte va cálido y el cénit limpio: es una
 * tarde despejada, no un incendio.
 */
export const TARDE: LuzDeUnaHora = {
  cenit: '#4a78bd',
  horizonte: '#f0cf9f',
  niebla: '#e3c9a5',
  resplandor: '#ffbe73',
  /*
   * VEINTIOCHO GRADOS DE ALTURA, Y NO QUINCE, Y ESO SE VIO EN EL BANCO.
   *
   * La primera versión puso el sol a quince grados, que es lo que uno escribe cuando
   * quiere decir «última hora de la tarde». Pero una luz direccional a quince grados
   * llega al SUELO con el coseno de setenta y cinco: el veintisiete por ciento de su
   * intensidad. La plaza salía marrón oscura con los aventureros iluminados de canto —
   * una noche, no una tarde—. A veintiocho grados el suelo recibe casi la mitad, las
   * fachadas siguen doradas de lado y las sombras propias se alargan igual.
   */
  rumboDelSol: [-0.62, 0.53, 0.74],
  sol: { color: '#ffb466', intensidad: 2.3 },
  hemisferio: { cielo: '#a8c0e6', suelo: '#6d5443', intensidad: 1.05 },
  cara: { color: '#ffe7cc', intensidad: 0.8 },
  nieblaCerca: 90,
  nieblaLejos: 420,
};

/**
 * EL MEDIODÍA DEL TABLERO, copiado de `Burgo.tsx` (`COLOR_DEL_CENIT`,
 * `COLOR_DEL_HORIZONTE`, `COLOR_DE_LA_NIEBLA`, `LUZ`, `NIEBLA`). El resplandor no
 * existe allí —su cielo es un degradado sin sol— y aquí se funde con el horizonte
 * para que desaparezca.
 */
export const MEDIODIA_DEL_TABLERO: LuzDeUnaHora = {
  cenit: '#6fa9dc',
  horizonte: '#e9e0c8',
  niebla: '#d6dfe4',
  resplandor: '#e9e0c8',
  rumboDelSol: [1, 2, 1.2],
  sol: { color: '#fff3dd', intensidad: 1.7 },
  hemisferio: { cielo: '#d8e8ff', suelo: '#8a7a5a', intensidad: 0.85 },
  cara: { color: '#ffffff', intensidad: 0 },
  nieblaCerca: ALCANCE_DEL_BURGO * 2,
  nieblaLejos: ALCANCE_DEL_BURGO * 4,
};

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/** Un número entre dos, para el grado `u` del zarpe (0 la tarde, 1 el mediodía). */
export function mezclaDeNumeros(a: number, b: number, u: number): number {
  return a + (b - a) * pinza(u, 0, 1);
}

/**
 * Un `#rrggbb` entre dos, en sRGB y redondeado. Sólo para el comprobador y el
 * documento: la escena mezcla en lineal con `THREE.Color`, y lo que se exige a
 * las dos es lo mismo, que en 0 salga la tarde y en 1 el mediodía exacto.
 */
export function mezclaDeColores(a: string, b: string, u: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const t = pinza(u, 0, 1);
  const canal = (desplazamiento: number): string => {
    const ca = (na >> desplazamiento) & 255;
    const cb = (nb >> desplazamiento) & 255;
    const c = Math.round(ca + (cb - ca) * t);
    return (c < 16 ? '0' : '') + c.toString(16);
  };
  return `#${canal(16)}${canal(8)}${canal(0)}`;
}
