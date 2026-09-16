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
import { ALZA_DEL_ASFALTO, A_LA_MAZMORRA, BORDE_INTERIOR, FERIA, MAZMORRA, SUPERFICIE, giroHaciaDentro, marcoDeCasilla, puntoEnEsquina, puntoEnLaCasillaPorV } from './anillo-en-3d';
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
  /* La cárcel: muro y torretas de hormigón, pabellón más oscuro, barrotes casi negros. */
  muro: '#8e8980',
  tejado: '#5c584f',
  pabellon: '#6f6c66',
  barrote: '#2f2f33',
  hormigon: '#a6a19a',
  /* La comisaría: cuerpo azulado, visera clara y el farol azul de la entrada. */
  comisaria: '#5f6a7a',
  visera: '#b9b5ab',
  farolAzul: '#2f6fd0',
  /* El cofre del Fondo, la oficina del Impuesto y el escaparate de la Tasa. */
  piedra: '#b3ac9e',
  sillar: '#c8c1b1',
  madera: '#7a5230',
  maderaClara: '#8d6136',
  hierro: '#4a4640',
  laton: '#c9a227',
  alfombra: '#7b2230',
  marmol: '#e6e2d8',
  joya: '#57c8d8',
  joyaOscura: '#2e8fa0',
} as const;

/**
 * UNA CARA DE TRES PUNTOS se escribe repitiendo el cuarto, y quien funde la malla se salta el
 * triángulo que sobra. Hace falta para lo que no es una caja: el fronton de una oficina, las ocho
 * caras de una joya. El presupuesto también lo cuenta: dos triángulos por cuadro y UNO por éstas.
 */
export function esTriangulo(cara: CaraDeObra): boolean {
  const c = cara.puntos[2];
  const d = cara.puntos[3];
  return c[0] === d[0] && c[1] === d[1] && c[2] === d[2];
}

export function triangulo(casilla: number, a: PuntoDeObra, b: PuntoDeObra, c: PuntoDeObra, color: string): CaraDeObra {
  return { casilla, puntos: [a, b, c, c], color };
}

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

/* ─────────────────── La cárcel (casilla 10) ────────────────── */

/**
 * LA CÁRCEL, QUE HASTA HOY ERA UNA MANZANA DE PISOS CON UNA VERJA DELANTE.
 *
 * Lo pidió Miguel: «la cárcel quiero que se vea como una cárcel de verdad». Y lo que había eran
 * CUATRO BLOQUES DEL PACK —los mismos `bloque-a`..`bloque-d` con los que se construye la ciudad—
 * cerrando un patio. Desde el aire eso no es una cárcel: es una manzana con el patio vallado, que
 * es exactamente lo que se ve en cualquier otra esquina del recinto.
 *
 * Lo que hace que una cárcel se lea como cárcel desde arriba no es el edificio, son tres cosas:
 * el MURO que rodea el recinto, las TORRETAS en sus esquinas y los BARROTES del pabellón. Las
 * tres se construyen aquí y las tres caben en la malla única de las obras: cero llamadas nuevas.
 *
 * Lo que NO se toca: el patio sigue siendo la celda (6, 6) de la retícula —`CELDA`, 12 × 12 con
 * su centro en (402, 402)— porque ahí dentro caen los seis huecos de preso; la verja y su hoja
 * que sube siguen siendo piezas del pack, porque la hoja se ANIMA y lo que se mueve no se funde;
 * y la calle, el aparcamiento y las dos patrullas se quedan donde estaban.
 */
const CARCEL = {
  /* El patio: la celda de la retícula, de 396 a 408 en los dos ejes. */
  patio: { desde: 396, hasta: 408 },
  /* El pabellón de celdas, a lo largo del borde de fuera, y el de entrada, al este del patio. */
  pabellon: { u0: 408, u1: 431, v0: 409, v1: 424, alto: 15 },
  entrada: { u0: 409, u1: 421, v0: 396, v1: 407, alto: 10 },
  /* Y el ala que cierra el patio por el cuarto lado, donde estaba el `bloque-b`. */
  ala: { u0: 396, u1: 408, v0: 409, v1: 421, alto: 12 },
  /*
   * El muro: 1,6 de grueso y 7 de alto, por fuera de las dos verjas y sin tocarlas. Acaba en 427
   * y no en 431 porque en su punta va una torreta, y una torreta son 2,5 de cuerpo más 1,4 de
   * tejadillo: puesta en 431 asomaba hasta 434,9 y el cuadro de una esquina acaba en 432, o sea
   * que la cárcel sacaba una esquina al campo. Lo dijo el comprobador antes que el ojo.
   */
  muro: { grueso: 1.6, alto: 7, desde: 408, hasta: 427 },
  /* Las torretas, en las dos puntas del muro: 5 de lado, 17 de alto y un tejadillo que vuela. */
  torreta: { lado: 5, alto: 17, tejado: { vuelo: 1.4, grueso: 1.2 } },
  /* Los barrotes del pabellón, en su cara al patio: seis ranuras de 0,9 que vuelan 0,2. */
  barrotes: { cuantos: 6, ancho: 0.9, vuelo: 0.2, desde: 4, hasta: 12 },
} as const;

function torreDeVigilancia(casilla: number, u: number, v: number): CaraDeObra[] {
  const t = CARCEL.torreta;
  const medio = t.lado / 2;
  const vuelo = medio + t.tejado.vuelo;
  return [
    ...caja(casilla, u - medio, u + medio, v - medio, v + medio, 0, t.alto, COLOR_DE_OBRA.muro),
    ...caja(casilla, u - vuelo, u + vuelo, v - vuelo, v + vuelo, t.alto, t.alto + t.tejado.grueso, COLOR_DE_OBRA.tejado),
  ];
}

function carasDeLaCarcel(): CaraDeObra[] {
  const c = MAZMORRA;
  const salida: CaraDeObra[] = [];
  /* El patio, de hormigón: es lo que se ve debajo de los presos. */
  salida.push(losa(c, CARCEL.patio.desde, CARCEL.patio.hasta, CARCEL.patio.desde, CARCEL.patio.hasta, ALZA_DEL_ASFALTO, COLOR_DE_OBRA.hormigon));
  /* Los dos pabellones. */
  const p = CARCEL.pabellon;
  salida.push(...caja(c, p.u0, p.u1, p.v0, p.v1, 0, p.alto, COLOR_DE_OBRA.pabellon));
  const e = CARCEL.entrada;
  salida.push(...caja(c, e.u0, e.u1, e.v0, e.v1, 0, e.alto, COLOR_DE_OBRA.pabellon));
  const a = CARCEL.ala;
  salida.push(...caja(c, a.u0, a.u1, a.v0, a.v1, 0, a.alto, COLOR_DE_OBRA.pabellon));
  /* Los barrotes, en la cara del pabellón que da al patio. */
  const b = CARCEL.barrotes;
  const paso = (p.u1 - p.u0) / (b.cuantos + 1);
  for (let k = 1; k <= b.cuantos; k++) {
    const u = p.u0 + paso * k;
    salida.push(...caja(c, u - b.ancho / 2, u + b.ancho / 2, p.v0 - b.vuelo, p.v0, b.desde, b.hasta, COLOR_DE_OBRA.barrote));
  }
  /* El muro, por los dos lados que no cierran los pabellones, empezando donde acaba la verja. */
  const m = CARCEL.muro;
  salida.push(...caja(c, m.desde, m.hasta, CARCEL.patio.desde - m.grueso, CARCEL.patio.desde, 0, m.alto, COLOR_DE_OBRA.muro));
  salida.push(...caja(c, CARCEL.patio.desde - m.grueso, CARCEL.patio.desde, m.desde, m.hasta, 0, m.alto, COLOR_DE_OBRA.muro));
  /* Y las dos torretas, en las puntas de ese muro. */
  salida.push(...torreDeVigilancia(c, m.hasta, CARCEL.patio.desde - m.grueso / 2));
  salida.push(...torreDeVigilancia(c, CARCEL.patio.desde - m.grueso / 2, m.hasta));
  return salida;
}


/* ───────────────── La comisaría (casilla 30) ──────────────── */

/**
 * LA COMISARÍA, Y LA CELDA QUE SE VE DESDE ARRIBA.
 *
 * «Lo mismo con la Comisaría, quiero ver cómo entra en la celda». Y «ver cómo entra» en un tablero
 * que se mira desde el aire manda una decisión de forma: **la celda no tiene techo**. Un calabozo
 * cerrado es una caja opaca en la que no se ve entrar a nadie; éste es un cubículo de tres paredes
 * y una reja, abierto por arriba, con su suelo de hormigón —que es como se dibujan las celdas en
 * los tableros de mesa y en los cómics, por la misma razón—.
 *
 * Lo que había en esta esquina era una avenida de dos carriles con su coche patrulla apuntando a
 * la cárcel, y se queda: es la casilla que te MANDA a la cárcel, y el coche patrulla con el morro
 * hacia allá lo cuenta mejor que ningún edificio. Lo que entra es el edificio del que sale.
 */
const COMISARIA = {
  /* El cuerpo, al otro lado de la avenida (que ocupa de 372 a 396). */
  cuerpo: { u0: 400, u1: 428, v0: 372, v1: 400, alto: 13 },
  /* El porche de la entrada, mirando a la avenida, con sus dos columnas. */
  porche: { u0: 394, u1: 400, v0: 379, v1: 393, alto: 8, grueso: 1.1, columna: 1.2 },
  /* El farol azul encima del porche: lo único que dice «policía» desde lejos. */
  farol: { lado: 2.2, desde: 9.1, hasta: 11.3 },
  /* La celda: tres paredes, cinco barrotes y NADA encima. */
  celda: { u0: 404, u1: 416, v0: 400, v1: 412, pared: 1.2, alto: 7, barrotes: 5, barrote: 0.7 },
} as const;

/** El centro de la celda de la comisaría: ahí se planta el peón al que mandan a la cárcel. */
export const HUECO_DE_LA_CELDA = { u: (COMISARIA.celda.u0 + COMISARIA.celda.u1) / 2, v: (COMISARIA.celda.v0 + COMISARIA.celda.v1) / 2 } as const;

function carasDeLaComisaria(): CaraDeObra[] {
  const c = A_LA_MAZMORRA;
  const salida: CaraDeObra[] = [];
  const q = COMISARIA.cuerpo;
  salida.push(...caja(c, q.u0, q.u1, q.v0, q.v1, 0, q.alto, COLOR_DE_OBRA.comisaria));
  /* El porche: la visera y sus dos columnas. */
  const po = COMISARIA.porche;
  salida.push(...caja(c, po.u0, po.u1, po.v0, po.v1, po.alto, po.alto + po.grueso, COLOR_DE_OBRA.visera));
  for (const v of [po.v0 + po.columna / 2, po.v1 - po.columna / 2]) {
    salida.push(...caja(c, po.u0, po.u0 + po.columna, v - po.columna / 2, v + po.columna / 2, 0, po.alto, COLOR_DE_OBRA.visera));
  }
  /* El farol azul, centrado sobre la visera. */
  const f = COMISARIA.farol;
  const mu = (po.u0 + po.u1) / 2;
  const mv = (po.v0 + po.v1) / 2;
  salida.push(...caja(c, mu - f.lado / 2, mu + f.lado / 2, mv - f.lado / 2, mv + f.lado / 2, f.desde, f.hasta, COLOR_DE_OBRA.farolAzul));
  /* La celda: suelo, tres paredes y la reja del cuarto lado. Sin techo, que es el porqué de todo. */
  const ce = COMISARIA.celda;
  salida.push(losa(c, ce.u0, ce.u1, ce.v0, ce.v1, ALZA_DEL_ASFALTO, COLOR_DE_OBRA.hormigon));
  salida.push(...caja(c, ce.u0, ce.u1, ce.v1 - ce.pared, ce.v1, 0, ce.alto, COLOR_DE_OBRA.muro));
  salida.push(...caja(c, ce.u0, ce.u0 + ce.pared, ce.v0, ce.v1, 0, ce.alto, COLOR_DE_OBRA.muro));
  salida.push(...caja(c, ce.u1 - ce.pared, ce.u1, ce.v0, ce.v1, 0, ce.alto, COLOR_DE_OBRA.muro));
  const paso = (ce.u1 - ce.u0) / (ce.barrotes + 1);
  for (let k = 1; k <= ce.barrotes; k++) {
    const u = ce.u0 + paso * k;
    salida.push(...caja(c, u - ce.barrote / 2, u + ce.barrote / 2, ce.v0, ce.v0 + ce.barrote, 0, ce.alto, COLOR_DE_OBRA.barrote));
  }
  /* Y el dintel que las remata arriba, que es lo que hace que se lean como una reja y no como palos. */
  salida.push(...caja(c, ce.u0, ce.u1, ce.v0, ce.v0 + ce.barrote, ce.alto - 0.9, ce.alto, COLOR_DE_OBRA.barrote));
  return salida;
}


/* ─────────── Las casillas laterales que no se compran ─────────── */

/**
 * LA BANDA EN LA QUE CABE UN EDIFICIO DE CASILLA, Y POR QUÉ ES ÉSA.
 *
 * Una casilla lateral mide 72 × 108 y sus bandas están repartidas: la FRANJA (0..21) lleva el
 * nombre, la SUPERFICIE lleva el precio arriba (31,5..58,5) y el ATREZO abajo (60..90), y el
 * carril del avatar (23..29) no lo pisa nada. O sea que lo único libre para volumen es el atrezo:
 * **30 de fondo por 72 de ancho**, y de esos 72 hay que descontar el margen del tablero.
 *
 * Los edificios de aquí se escriben en ese marco: `u` de −36 a +36 con el cero en el eje de la
 * casilla, `v` de 60 a 90. Lo mismo que en una esquina, con otra vara.
 */

/**
 * EL COFRE DEL FONDO VECINAL (casillas 2, 17 y 33).
 *
 * Miguel: «para la casilla de CAJA DE LA COMUNIDAD me gustaría que hubiera un cofre». Un cofre de
 * verdad se reconoce desde arriba por tres cosas y no por su forma: la TAPA que sobresale del
 * cuerpo, los HERRAJES que lo cruzan y la CERRADURA. Sin ellas es una caja de madera.
 *
 * La tapa va escrita aparte del cuerpo aunque hoy esté fundida con él: cuando se anime —abrirse
 * al caer en la casilla— tendrá que salir de la malla, y así ya está escrita sola.
 */
const COFRE = {
  base: { u: 12, v0: 63, v1: 87, alto: 1.2 },
  cuerpo: { u: 8, v0: 67, v1: 83, desde: 1.2, hasta: 8 },
  tapa: { u: 8.6, v0: 66.4, v1: 83.6, desde: 8, hasta: 10.4 },
  herraje: { ancho: 1, en: [-4, 4] as readonly number[] },
  cerradura: { u: 1.3, fondo: 1.2, desde: 4.8, hasta: 7.4 },
} as const;

function carasDelCofre(casilla: number): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  const b = COFRE.base;
  salida.push(...caja(casilla, -b.u, b.u, b.v0, b.v1, 0, b.alto, COLOR_DE_OBRA.piedra));
  const c = COFRE.cuerpo;
  salida.push(...caja(casilla, -c.u, c.u, c.v0, c.v1, c.desde, c.hasta, COLOR_DE_OBRA.madera));
  const t = COFRE.tapa;
  salida.push(...caja(casilla, -t.u, t.u, t.v0, t.v1, t.desde, t.hasta, COLOR_DE_OBRA.maderaClara));
  for (const u of COFRE.herraje.en) {
    salida.push(...caja(casilla, u - COFRE.herraje.ancho / 2, u + COFRE.herraje.ancho / 2, t.v0 - 0.2, t.v1 + 0.2, c.desde, t.hasta, COLOR_DE_OBRA.hierro));
  }
  const ce = COFRE.cerradura;
  salida.push(...caja(casilla, -ce.u, ce.u, c.v0 - ce.fondo, c.v0, ce.desde, ce.hasta, COLOR_DE_OBRA.laton));
  return salida;
}

/**
 * LA OFICINA DEL ESTADO (casilla 4, el Impuesto).
 *
 * Miguel: «para la casilla de impuestos me gustaría que hubiera un edificio que parezca una
 * oficina del estado». Lo que hace que un edificio parezca oficial no es su tamaño: es la
 * ESCALINATA, las COLUMNAS y el ático escalonado encima de la cornisa. Con eso, un prisma de once
 * de alto ya se lee como un ministerio.
 *
 * El remate va escalonado —dos cajas— y no en frontón triangular a propósito: desde los 55° a los
 * que mira la cámara, un frontón se ve de canto y desaparece; un ático se ve siempre.
 */
const OFICINA = {
  escalones: [
    { u: 13, v0: 62, v1: 66, desde: 0, hasta: 0.8 },
    { u: 12, v0: 64, v1: 66, desde: 0.8, hasta: 1.6 },
  ] as readonly { u: number; v0: number; v1: number; desde: number; hasta: number }[],
  cuerpo: { u: 11, v0: 70, v1: 88, desde: 1.6, hasta: 11 },
  columna: { lado: 1.8, v: 67.4, desde: 1.6, hasta: 10, en: [-8, -2.7, 2.7, 8] as readonly number[] },
  cornisa: { u: 12, v0: 65.5, v1: 88.5, desde: 10, hasta: 11.4 },
  atico: { u: 7, v0: 68, v1: 86, desde: 11.4, hasta: 13.2 },
} as const;

function carasDeLaOficina(casilla: number): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  for (const e of OFICINA.escalones) salida.push(...caja(casilla, -e.u, e.u, e.v0, e.v1, e.desde, e.hasta, COLOR_DE_OBRA.piedra));
  const c = OFICINA.cuerpo;
  salida.push(...caja(casilla, -c.u, c.u, c.v0, c.v1, c.desde, c.hasta, COLOR_DE_OBRA.sillar));
  const co = OFICINA.columna;
  for (const u of co.en) salida.push(...caja(casilla, u - co.lado / 2, u + co.lado / 2, co.v - co.lado / 2, co.v + co.lado / 2, co.desde, co.hasta, COLOR_DE_OBRA.piedra));
  const cor = OFICINA.cornisa;
  salida.push(...caja(casilla, -cor.u, cor.u, cor.v0, cor.v1, cor.desde, cor.hasta, COLOR_DE_OBRA.piedra));
  const a = OFICINA.atico;
  salida.push(...caja(casilla, -a.u, a.u, a.v0, a.v1, a.desde, a.hasta, COLOR_DE_OBRA.sillar));
  return salida;
}

/**
 * LA TASA DE LUJO (casilla 38). «Te dejo que seas creativo», dijo Miguel.
 *
 * Una tasa de lujo no es un edificio: es lo que te cobran por tener algo caro. Así que aquí no hay
 * edificio, hay un ESCAPARATE: alfombra granate, pedestal de mármol y encima una joya tallada de
 * ocho caras, que es la única pieza del tablero que no es un prisma.
 *
 * La joya se hace con dos pirámides pegadas por su cintura, y sus ocho caras son triángulos —el
 * cuarto punto repetido—. Las vueltas salen de la misma cuenta que todo lo demás: un recorrido que
 * va al derecho en `(u, v)` mira hacia ARRIBA en el mundo, así que la cintura se recorre al derecho
 * para las caras de arriba y al revés para las de abajo.
 */
const JOYA = { radio: 3.4, cintura: 10.6, punta: 13.4, culata: 8.2, centroV: 74 } as const;
const TASA_DE_LUJO = {
  alfombra: { u: 10, v0: 60.5, v1: 90 },
  pedestal: { u: 4, v0: 70, v1: 78, alto: 7 },
} as const;

function carasDeLaJoya(casilla: number, centroU: number, centroV: number): CaraDeObra[] {
  const r = JOYA.radio;
  /* La cintura, al derecho en `(u, v)`: cuatro puntos sobre los dos ejes. */
  const cintura: readonly PuntoDeObra[] = [
    [centroU + r, JOYA.cintura, centroV],
    [centroU, JOYA.cintura, centroV + r],
    [centroU - r, JOYA.cintura, centroV],
    [centroU, JOYA.cintura, centroV - r],
  ];
  const punta: PuntoDeObra = [centroU, JOYA.punta, centroV];
  const culata: PuntoDeObra = [centroU, JOYA.culata, centroV];
  const salida: CaraDeObra[] = [];
  for (let k = 0; k < 4; k++) {
    const a = cintura[k] as PuntoDeObra;
    const b = cintura[(k + 1) % 4] as PuntoDeObra;
    salida.push(triangulo(casilla, a, b, punta, COLOR_DE_OBRA.joya));
    salida.push(triangulo(casilla, b, a, culata, COLOR_DE_OBRA.joyaOscura));
  }
  return salida;
}

function carasDeLaTasa(casilla: number): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  const a = TASA_DE_LUJO.alfombra;
  salida.push(losa(casilla, -a.u, a.u, a.v0, a.v1, ALZA_DEL_ASFALTO, COLOR_DE_OBRA.alfombra));
  const p = TASA_DE_LUJO.pedestal;
  salida.push(...caja(casilla, -p.u, p.u, p.v0, p.v1, ALZA_DEL_ASFALTO, p.alto, COLOR_DE_OBRA.marmol));
  salida.push(...carasDeLaJoya(casilla, 0, JOYA.centroV));
  return salida;
}

/** Qué levanta cada casilla lateral. Las que no están aquí todavía no tienen obra. */
const OBRA_DE_LA_CASILLA: Readonly<Record<number, (casilla: number) => CaraDeObra[]>> = {
  2: carasDelCofre,
  4: carasDeLaOficina,
  17: carasDelCofre,
  33: carasDelCofre,
  38: carasDeLaTasa,
};

function carasDeLasCasillas(): CaraDeObra[] {
  return Object.entries(OBRA_DE_LA_CASILLA).flatMap(([clave, hace]) => hace(Number(clave)));
}


/* ──────────────────────────────── Todas las obras ──────────────────────────────── */

let hechas: CaraDeObra[] | null = null;

/** Todas las caras de todas las obras del anillo, en coordenadas de casilla. */
export function carasDeLasObras(): CaraDeObra[] {
  if (hechas === null) hechas = [...carasDelAparcamiento(), ...carasDeLaCarcel(), ...carasDeLaComisaria(), ...carasDeLasCasillas()];
  return hechas;
}

/** Dos triángulos por cuadro y uno por cara de tres puntos: lo que el presupuesto guarda. */
export function triangulosDeLasObras(): number {
  return carasDeLasObras().reduce((n, cara) => n + (esTriangulo(cara) ? 1 : 2), 0);
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
  /*
   * Una esquina y una casilla lateral no usan el mismo marco: en la esquina, `(u, v)` son las dos
   * distancias al centro del tablero (324..432); en una lateral, `u` va a lo largo de la marcha
   * —de −36 a +36— y `v` es la profundidad de las bandas (0..108). Las dos, eso sí, llevan al
   * mundo con determinante −1, así que las vueltas de `losa` y `caja` valen para las dos.
   */
  const alMundo = ([u, y, v]: PuntoDeObra): PuntoDeObra => {
    if (m.esEsquina) return [m.fuera.x * u + m.adelante.x * -v, y, m.fuera.z * u + m.adelante.z * -v];
    const p = puntoEnLaCasillaPorV(m, u, v);
    return [p.x, y, p.z];
  };
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
