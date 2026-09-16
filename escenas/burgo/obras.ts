/**
 * LAS OBRAS DEL TABLERO: lo que se levanta en las casillas que no se compran, EN CÓDIGO.
 *
 * ═══ POR QUÉ EN CÓDIGO Y NO CON PIEZAS DEL PACK ═══
 *
 * Miguel pidió catorce casillas amuebladas de verdad —cofre, casino, central eléctrica, cárcel,
 * parking, cuatro estaciones con su ferrocarril— y el tablero tiene sitio para eso, pero no en la
 * moneda que parece. Medido en el banco: el tablero lleno va por 181.333 triángulos de 900.000,
 * o sea que TRIÁNGULOS sobran; y va por 92 llamadas de dibujo de 150 en la pose de salida y 114
 * con la cámara cerca, o sea que LLAMADAS no.
 *
 * Y una pieza nueva del pack cuesta una llamada para siempre —una `InstancedMesh` por pieza
 * distinta en pantalla—, mientras que un volumen construido aquí y fundido con los demás cuesta
 * CERO: todas las obras del anillo son una sola malla y una sola llamada, como ya lo son los 88
 * dígitos, los 12 emblemas y las letras de los nombres.
 *
 * Por eso esto no dibuja: DESCRIBE. Cada obra es una lista de cuadros con su color, en las
 * coordenadas de su casilla, y `ciudad-en-3d.ts` los funde. Aquí no entra `three` —este fichero
 * lo lee también el presupuesto, que cuenta dos triángulos por cuadro— y no entra ningún color
 * que no esté escrito arriba con su nombre.
 *
 * ═══ LAS VUELTAS DE CADA CARA, QUE NO SE ADIVINAN ═══
 *
 * El material de los volúmenes es `MeshStandardMaterial` sin `side`, o sea `FrontSide`, o sea que
 * `three` TIRA toda cara que se vea por detrás, y «por detrás» lo decide el orden de los cuatro
 * puntos. Eso ya costó una vez los tejados de la ciudad entera sin que fallara ni una cuenta
 * (`verify:burgo-escena`, la lupa cenital), así que aquí el orden va DERIVADO y escrito:
 *
 * El marco de una casilla manda `(u, v) → (x, z)` con determinante **−1** —en la esquina de la
 * salida, `x = v` y `z = u`—, o sea que es un REFLEJO: una cara que se recorre al derecho en
 * `(u, v)` sale del revés en el mundo. Con la normal `(b − a) × (c − a)`, la cuenta da que para
 * mirar ARRIBA hay que recorrer `(u0,v0) → (u1,v0) → (u1,v1) → (u0,v1)`, que es justo lo
 * contrario de lo que uno escribiría mirando el plano. Las seis caras de una caja salen de la
 * misma cuenta, y `verify:burgo-escena` las vuelve a medir una a una en el mundo.
 */
import { ALZA_DEL_ASFALTO, BORDE_INTERIOR, FERIA, SUPERFICIE, giroHaciaDentro, marcoDeCasilla, puntoEnEsquina } from './anillo-en-3d';
import type { LetraEnElTablero } from './anillo-en-3d';

/** Un punto de una obra en las coordenadas de su casilla: `u` y `v` como en `puntoEnEsquina`, `y` a plomo. */
export type PuntoDeObra = readonly [number, number, number];

export interface CaraDeObra {
  readonly casilla: number;
  readonly puntos: readonly [PuntoDeObra, PuntoDeObra, PuntoDeObra, PuntoDeObra];
  readonly color: string;
}

/** Los colores de las obras, todos aquí y ninguno suelto por el código. */
export const COLOR_DE_OBRA = {
  asfalto: '#3c3f44',
  /* Las rayas de las plazas van AMARILLAS, y no blancas, porque el nombre de la casilla se
     escribe en blanco encima del mismo asfalto: dos blancos sobre negro se pelean. */
  linea: '#c9a227',
  poste: '#55585c',
  carteloAzul: '#1f4fa8',
  carteloTinta: '#f2f3f5',
} as const;

/** Un cuadro tumbado a la cota `y`, mirando ARRIBA. El orden sale de la cuenta de la cabecera. */
export function losa(casilla: number, u0: number, u1: number, v0: number, v1: number, y: number, color: string): CaraDeObra {
  return { casilla, puntos: [[u0, y, v0], [u1, y, v0], [u1, y, v1], [u0, y, v1]], color };
}

/** Las seis caras de una caja, cada una mirando hacia fuera. */
export function caja(casilla: number, u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, color: string): CaraDeObra[] {
  const c = (puntos: readonly [PuntoDeObra, PuntoDeObra, PuntoDeObra, PuntoDeObra]): CaraDeObra => ({ casilla, puntos, color });
  return [
    /* Arriba y abajo. */
    c([[u0, y1, v0], [u1, y1, v0], [u1, y1, v1], [u0, y1, v1]]),
    c([[u0, y0, v1], [u1, y0, v1], [u1, y0, v0], [u0, y0, v0]]),
    /* Los cuatro costados: `v0` mira a −v, `v1` a +v, `u0` a −u y `u1` a +u. */
    c([[u1, y0, v0], [u1, y1, v0], [u0, y1, v0], [u0, y0, v0]]),
    c([[u0, y0, v1], [u0, y1, v1], [u1, y1, v1], [u1, y0, v1]]),
    c([[u0, y0, v0], [u0, y1, v0], [u0, y1, v1], [u0, y0, v1]]),
    c([[u1, y0, v1], [u1, y1, v1], [u1, y1, v0], [u1, y0, v0]]),
  ];
}

/* ─────────────────────────── El aparcamiento (casilla 20) ─────────────────────────── */

/**
 * EL APARCAMIENTO, QUE ANTES ERA UNA PLAZA ARBOLADA.
 *
 * Lo pidió Miguel: «El Parking quiero que se vea real, no sé muy bien cómo lo tienes pensado pero
 * con un cartel visible desde arriba que ponga PARKING». Y «visible desde arriba» es la parte que
 * decide el diseño: un cartel de los de la calle —un panel a plomo sobre un poste— desde un
 * tablero NO SE VE, porque un tablero se mira desde arriba. Así que el panel va TUMBADO, mirando
 * al cielo, con la `P` impresa encima; es lo que se ve en los aparcamientos de verdad pintado en
 * el suelo, subido a la altura de un cartel para que tenga sombra y se lea como un objeto.
 *
 * ═══ Y EL ASFALTO ES LA ESQUINA ENTERA, NO UN PARCHE ═══
 *
 * El primer intento asfaltó sólo el cuadro de fuera, `[360, 414]`, que es lo que la ele de la
 * marcha deja libre. Visto en el banco no se leía como un aparcamiento: se leía como una mancha
 * gris pegada al lado del nombre, con el nombre en el suelo beige de al lado. Un aparcamiento de
 * verdad ES el solar entero, y por eso el asfalto cubre ahora el cuadro de suelo completo de la
 * esquina, de `BORDE_INTERIOR` (324) a `SUPERFICIE.hasta` (414). Que la marcha lo cruce no
 * estorba: por el carril de un aparcamiento se pasa, que es justo lo que hace el peón.
 *
 * Las PLAZAS, en cambio, se quedan en el cuadro de fuera: son el fondo del solar. La ele de
 * dentro queda de carril de entrada, con su isleta y su cartel.
 */
/**
 * LA TRAZA, QUE SALE DE LA MEDIDA DEL COCHE Y NO DE MI OJO.
 *
 * Medido en `burgo.glb`: un coche del pack es **2,51 de ancho por 5,63 de largo**. Con eso, una
 * plaza de verdad son 3,6 × 7 —la holgura de un aparcamiento de calle— y el suelo libre de la
 * esquina, 54, da **quince plazas por hilera**. La traza es la de cualquier aparcamiento: dos
 * pares de hileras espalda contra espalda con su calle de 14 en medio, que es lo que necesita un
 * coche de 5,63 para entrar de morro, y una franja de 12 delante para el cartel.
 *
 *     v 360..367  hilera A   ┐ espalda
 *     v 367..374  hilera B   ┘ contra espalda
 *     v 374..388  calle (14)
 *     v 388..395  hilera C   ┐
 *     v 395..402  hilera D   ┘
 *     v 402..414  la isleta del cartel (12)
 */
const PARKING = {
  /*
   * El asfalto: el suelo de la esquina entero MENOS el rincón de dentro, que se queda de zona
   * verde con sus dos pinos. Sin ese recorte los árboles salen plantados en alquitrán.
   */
  asfalto: { desde: BORDE_INTERIOR, hasta: SUPERFICIE.hasta, rincon: 347 },
  /* Las plazas: sólo el cuadro de fuera, que es lo que la ele de la marcha no cruza. */
  desde: 360,
  hasta: 414,
  fondoDeLaHilera: 7,
  plaza: 3.6,
  hileras: [360, 367, 388, 395] as readonly number[],
  /* La raya pintada: 0,5 de ancho, que a la escala del coche es un palmo. */
  raya: 0.5,
  alzaDeLaRaya: 0.12,
  /*
   * El cartel: un poste de 11 y un panel tumbado de 12 x 12 encima. Va en el CARRIL de entrada,
   * del lado de dentro, donde no pisa ninguna plaza ni la ele de la marcha (que cruza a 349,5).
   */
  poste: { u: 336, v: 396, grosor: 1.4, alto: 11 },
  panel: { lado: 12, grueso: 0.9 },
} as const;

/** Las dieciséis rayas de una hilera que empieza en `v0`: quince plazas de 3,6 en los 54 de asfalto. */
function rayasDeLaHilera(casilla: number, v0: number): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  const cuantas = Math.round((PARKING.hasta - PARKING.desde) / PARKING.plaza);
  for (let k = 0; k <= cuantas; k++) {
    const u = PARKING.desde + k * PARKING.plaza;
    salida.push(losa(casilla, u - PARKING.raya / 2, u + PARKING.raya / 2, v0, v0 + PARKING.fondoDeLaHilera, PARKING.alzaDeLaRaya, COLOR_DE_OBRA.linea));
  }
  return salida;
}

function carasDelAparcamiento(): CaraDeObra[] {
  const c = FERIA;
  const salida: CaraDeObra[] = [];
  /* El asfalto, de una pieza. */
  const a = PARKING.asfalto;
  salida.push(losa(c, a.rincon, a.hasta, a.desde, a.hasta, ALZA_DEL_ASFALTO, COLOR_DE_OBRA.asfalto));
  salida.push(losa(c, a.desde, a.rincon, a.rincon, a.hasta, ALZA_DEL_ASFALTO, COLOR_DE_OBRA.asfalto));
  for (const v0 of PARKING.hileras) salida.push(...rayasDeLaHilera(c, v0));
  /* El cartel: poste y panel tumbado. */
  const p = PARKING.poste;
  salida.push(...caja(c, p.u - p.grosor / 2, p.u + p.grosor / 2, p.v - p.grosor / 2, p.v + p.grosor / 2, ALZA_DEL_ASFALTO, p.alto, COLOR_DE_OBRA.poste));
  const medio = PARKING.panel.lado / 2;
  salida.push(...caja(c, p.u - medio, p.u + medio, p.v - medio, p.v + medio, p.alto, p.alto + PARKING.panel.grueso, COLOR_DE_OBRA.carteloAzul));
  return salida;
}

/** Dónde va la `P` del cartel y a qué altura: la imprime `ciudad-en-3d.ts` con las demás letras. */
export const LA_P_DEL_CARTEL = {
  casilla: FERIA,
  u: PARKING.poste.u,
  v: PARKING.poste.v,
  alto: 8,
  alza: PARKING.poste.alto + PARKING.panel.grueso + 0.08,
  color: COLOR_DE_OBRA.carteloTinta,
} as const;

/**
 * LAS LETRAS QUE VAN SOBRE UN CARTEL Y NO SOBRE EL SUELO.
 *
 * Se colocan aquí y las imprime `geometriaDeLosRotulos` con las demás, porque son lo mismo: tinta
 * plana. Lo único que cambia es la cota —van encima del panel, no en el suelo— y el color, que lo
 * pone quien las funde. Se leen desde la diagonal, como el nombre de la esquina.
 */
export function letrasDeLosCarteles(): LetraEnElTablero[] {
  const m = marcoDeCasilla(LA_P_DEL_CARTEL.casilla);
  const p = puntoEnEsquina(m, LA_P_DEL_CARTEL.u, LA_P_DEL_CARTEL.v);
  return [{ letra: 'P', x: p.x, z: p.z, giro: giroHaciaDentro(m) + Math.PI / 4, alto: LA_P_DEL_CARTEL.alto, alza: LA_P_DEL_CARTEL.alza }];
}

/* ──────────────────────────────── Todas las obras ──────────────────────────────── */

let hechas: CaraDeObra[] | null = null;

/** Todas las caras de todas las obras del anillo, en coordenadas de casilla. */
export function carasDeLasObras(): CaraDeObra[] {
  if (hechas === null) hechas = [...carasDelAparcamiento()];
  return hechas;
}

/** Dos triángulos por cuadro: lo que el presupuesto guarda para las obras. */
export function triangulosDeLasObras(): number {
  return carasDeLasObras().length * 2;
}

/** Una cara ya en el mundo: los mismos cuatro puntos, en `[x, y, z]`. */
export interface CaraEnElMundo {
  readonly puntos: readonly [PuntoDeObra, PuntoDeObra, PuntoDeObra, PuntoDeObra];
  readonly color: string;
}

/**
 * Las caras de una casilla, ya en el mundo. Los cuatro puntos se escriben UNO A UNO y no con un
 * `map`: un `map` devuelve una lista de largo desconocido, y quien la recibe acaba casteándola a
 * cuatro —que es un casteo que TypeScript rechaza con razón, porque nada garantiza el largo—.
 */
export function carasDeLaObraEnElMundo(casilla: number): CaraEnElMundo[] {
  const m = marcoDeCasilla(casilla);
  const alMundo = ([u, y, v]: PuntoDeObra): PuntoDeObra => [m.fuera.x * u + m.adelante.x * -v, y, m.fuera.z * u + m.adelante.z * -v];
  return carasDeLasObras()
    .filter((cara) => cara.casilla === casilla)
    .map((cara) => ({
      color: cara.color,
      puntos: [alMundo(cara.puntos[0]), alMundo(cara.puntos[1]), alMundo(cara.puntos[2]), alMundo(cara.puntos[3])] as const,
    }));
}

/** Las casillas que hoy levantan algo. */
export function casillasConObra(): number[] {
  return [...new Set(carasDeLasObras().map((c) => c.casilla))];
}
