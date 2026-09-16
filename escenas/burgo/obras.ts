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
import { ALZA_DEL_ASFALTO, A_LA_MAZMORRA, BORDE_INTERIOR, CELDA_DEL_CUARTEL, FERIA, MARGEN_DEL_TEXTO, MAZMORRA, PUERTAS, SUPERFICIE, anchoDeLaPalabra, giroHaciaDentro, giroHaciaFuera, marcoDeCasilla, puntoEnEsquina, puntoEnLaCasillaPorV } from './anillo-en-3d';
import { ALTO_DE_LA_LETRA, AVANCE_DE_LA_LETRA } from '../iconos';
import type { LetraEnElTablero } from './anillo-en-3d';

/** Un punto de una obra en las coordenadas de su casilla: `u` y `v` como en `puntoEnEsquina`, `y` a plomo. */
export type PuntoDeObra = readonly [number, number, number];

/**
 * LA CASILLA DE UNA OBRA QUE NO ES DE NINGUNA CASILLA. El ferrocarril da la vuelta al tablero por
 * el campo, así que sus caras ya vienen en coordenadas del MUNDO y no hay marco que aplicarles.
 */
export const DEL_MUNDO = -1;

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
  /* La moneda de la recaudación va en cuartos de dos oros, que es lo que deja verla rodar. */
  latonOscuro: '#9c7a17',
  puertaDeLaOficina: '#3b2b20',
  /* El humo de la central y la onda del canal. */
  /* Gris carbón: uno claro no se distingue del crema del tablero, y uno medio se confunde con la nave de turbinas. */
  humo: '#4d5055',
  onda: '#b9e3ee',
  alfombra: '#7b2230',
  marmol: '#e6e2d8',
  joya: '#57c8d8',
  joyaOscura: '#2e8fa0',
  /* La central, el canal de aguas y el casino. */
  boca: '#3a3a3c',
  bandaRoja: '#b3352a',
  nave: '#7f8a93',
  deposito: '#9fb3bf',
  depositoTapa: '#8aa0ad',
  agua: '#2f7fa8',
  casino: '#5a2e4d',
  marquesina: '#d8b34a',
  bombilla: '#ffe9a8',
  ruleta: '#23252a',
  /* El ferrocarril. */
  balasto: '#6b6257',
  traviesa: '#4f4034',
  carril: '#8e8f93',
  /* Las cuatro estaciones. */
  anden: '#b8b2a5',
  marquesinaTren: '#7d8a8f',
  ladrillo: '#9a5f4b',
  esfera: '#f0ece0',
  cristal: '#a9c7d4',
  carbon: '#26262a',
  /* El tren. */
  locomotora: '#2f4a5c',
  cabina: '#3d6076',
  vagon: '#6b4a3a',
  rueda: '#3a3a3e',
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
  poste: { u: 336, v: 396, grosor: 1.4, alto: 13 },
  /*
   * 22 de lado y no 12: el cartel dice PARKING entero —es lo que pidió Miguel, «que ponga
   * PARKING»— y siete letras por la diagonal de un panel de 12 salen a dos de alto, que desde el
   * tablero son una raya. A 22 la diagonal útil con margen es de 23,7 y la palabra sale a 3,7.
   * Cabe entre el canto de la ciudad (324) y el carril de la marcha (347,5) con medio punto libre.
   */
  panel: { lado: 22, grueso: 0.9 },
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

/**
 * EL CARTEL DEL APARCAMIENTO Y LO QUE PONE.
 *
 * Pone PARKING porque es un LETRERO, no el nombre de la casilla: la casilla sigue llamándose como
 * dice el reglamento —el Descanso—, y eso es lo que está escrito en su suelo. Lo que hay
 * construido encima es un aparcamiento, y un aparcamiento lleva su cartel, igual que el casino de
 * los Sucesos no cambia el nombre de su casilla.
 */
export const EL_CARTEL_DEL_APARCAMIENTO = {
  casilla: FERIA,
  texto: 'PARKING',
  u: PARKING.poste.u,
  v: PARKING.poste.v,
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
  const c = EL_CARTEL_DEL_APARCAMIENTO;
  const m = marcoDeCasilla(c.casilla);
  /* La misma cuenta del rombo que el nombre de una esquina, en el cuadro del panel: `ancho + alto ≤ diagonal útil`. */
  const diagonal = PARKING.panel.lado * Math.SQRT2 * (1 - 2 * MARGEN_DEL_TEXTO);
  const porUnidad = anchoDeLaPalabra(c.texto, ALTO_DE_LA_LETRA) / ALTO_DE_LA_LETRA;
  const alto = diagonal / (porUnidad + 1);
  const escala = alto / ALTO_DE_LA_LETRA;
  const giro = giroHaciaDentro(m) + Math.PI / 4;
  const salida: LetraEnElTablero[] = [];
  let t = -anchoDeLaPalabra(c.texto, alto) / 2;
  for (const letra of c.texto) {
    const avance = (AVANCE_DE_LA_LETRA[letra] ?? ALTO_DE_LA_LETRA / 2) * escala;
    const d = (t + avance / 2) / Math.SQRT2;
    const p = puntoEnEsquina(m, c.u - d, c.v + d);
    salida.push({ letra, x: p.x, z: p.z, giro, alto, alza: c.alza });
    t += avance;
  }
  return salida;
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
const RECINTO_DE_LA_MAZMORRA = {
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
  const t = RECINTO_DE_LA_MAZMORRA.torreta;
  const medio = t.lado / 2;
  const vuelo = medio + t.tejado.vuelo;
  return [
    ...caja(casilla, u - medio, u + medio, v - medio, v + medio, 0, t.alto, COLOR_DE_OBRA.muro),
    ...caja(casilla, u - vuelo, u + vuelo, v - vuelo, v + vuelo, t.alto, t.alto + t.tejado.grueso, COLOR_DE_OBRA.tejado),
  ];
}

function carasDeLaMazmorra(): CaraDeObra[] {
  const c = MAZMORRA;
  const salida: CaraDeObra[] = [];
  /* El patio, de hormigón: es lo que se ve debajo de los presos. */
  salida.push(losa(c, RECINTO_DE_LA_MAZMORRA.patio.desde, RECINTO_DE_LA_MAZMORRA.patio.hasta, RECINTO_DE_LA_MAZMORRA.patio.desde, RECINTO_DE_LA_MAZMORRA.patio.hasta, ALZA_DEL_ASFALTO, COLOR_DE_OBRA.hormigon));
  /* Los dos pabellones. */
  const p = RECINTO_DE_LA_MAZMORRA.pabellon;
  salida.push(...caja(c, p.u0, p.u1, p.v0, p.v1, 0, p.alto, COLOR_DE_OBRA.pabellon));
  const e = RECINTO_DE_LA_MAZMORRA.entrada;
  salida.push(...caja(c, e.u0, e.u1, e.v0, e.v1, 0, e.alto, COLOR_DE_OBRA.pabellon));
  const a = RECINTO_DE_LA_MAZMORRA.ala;
  salida.push(...caja(c, a.u0, a.u1, a.v0, a.v1, 0, a.alto, COLOR_DE_OBRA.pabellon));
  /* Los barrotes, en la cara del pabellón que da al patio. */
  const b = RECINTO_DE_LA_MAZMORRA.barrotes;
  const paso = (p.u1 - p.u0) / (b.cuantos + 1);
  for (let k = 1; k <= b.cuantos; k++) {
    const u = p.u0 + paso * k;
    salida.push(...caja(c, u - b.ancho / 2, u + b.ancho / 2, p.v0 - b.vuelo, p.v0, b.desde, b.hasta, COLOR_DE_OBRA.barrote));
  }
  /* El muro, por los dos lados que no cierran los pabellones, empezando donde acaba la verja. */
  const m = RECINTO_DE_LA_MAZMORRA.muro;
  salida.push(...caja(c, m.desde, m.hasta, RECINTO_DE_LA_MAZMORRA.patio.desde - m.grueso, RECINTO_DE_LA_MAZMORRA.patio.desde, 0, m.alto, COLOR_DE_OBRA.muro));
  salida.push(...caja(c, RECINTO_DE_LA_MAZMORRA.patio.desde - m.grueso, RECINTO_DE_LA_MAZMORRA.patio.desde, m.desde, m.hasta, 0, m.alto, COLOR_DE_OBRA.muro));
  /* Y las dos torretas, en las puntas de ese muro. */
  salida.push(...torreDeVigilancia(c, m.hasta, RECINTO_DE_LA_MAZMORRA.patio.desde - m.grueso / 2));
  salida.push(...torreDeVigilancia(c, RECINTO_DE_LA_MAZMORRA.patio.desde - m.grueso / 2, m.hasta));
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
  /* La celda: tres paredes, cinco barrotes y NADA encima. Su sitio es `CELDA_DEL_CUARTEL` del anillo; aquí, lo que la construye. */
  celda: { ...CELDA_DEL_CUARTEL, pared: 1.2, barrotes: 5, barrote: 0.7 },
} as const;

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
  /* Tres paredes —la de atrás, la del cuartel y la del fondo—; el cuarto lado, el `u0`, es la reja. */
  salida.push(...caja(c, ce.u0, ce.u1, ce.v1 - ce.pared, ce.v1, 0, ce.alto, COLOR_DE_OBRA.muro));
  salida.push(...caja(c, ce.u0, ce.u1, ce.v0, ce.v0 + ce.pared, 0, ce.alto, COLOR_DE_OBRA.muro));
  salida.push(...caja(c, ce.u1 - ce.pared, ce.u1, ce.v0, ce.v1, 0, ce.alto, COLOR_DE_OBRA.muro));
  /*
   * Los BARROTES no se funden con la celda: suben y bajan cuando encierran a alguien, igual que la
   * hoja de la verja de la cárcel. Viven en `carasDeLaRejaDeLaCelda`.
   */
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
/** Las tres casillas del Fondo, las tres de Sucesos y la de la Tasa: se nombran una vez. */
export const CASILLAS_CON_COFRE: readonly number[] = [2, 17, 33];
export const CASILLAS_CON_CASINO: readonly number[] = [7, 22, 36];
export const CASILLA_DE_LA_TASA = 38;

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
  /*
   * La TAPA no se funde con el cofre: se abre, así que vive aparte (ver «piezas vivas») y con ella
   * los dos herrajes que la cruzan. Lo que queda aquí son los herrajes del CUERPO, que no se
   * mueven, y así el cofre cerrado se sigue leyendo igual.
   */
  const t = COFRE.tapa;
  for (const u of COFRE.herraje.en) {
    salida.push(...caja(casilla, u - COFRE.herraje.ancho / 2, u + COFRE.herraje.ancho / 2, t.v0 - 0.2, t.v1 + 0.2, c.desde, c.hasta, COLOR_DE_OBRA.hierro));
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
 *
 * Los dos peldaños son también el BASAMENTO y llegan hasta el fondo del cuerpo. Acababan en 66, y
 * el cuerpo y las columnas empezaban a 1,6 sin nada debajo de 66 a 88: desde arriba no se notaba,
 * pero por ahí tiene que rodar la moneda de la recaudación, y no se rueda sobre el aire. Y en la
 * fachada hay PUERTA, que es por donde entra.
 */
const OFICINA = {
  escalones: [
    { u: 13, v0: 62, v1: 88, desde: 0, hasta: 0.8 },
    { u: 12, v0: 64, v1: 88, desde: 0.8, hasta: 1.6 },
  ] as readonly { u: number; v0: number; v1: number; desde: number; hasta: number }[],
  cuerpo: { u: 11, v0: 70, v1: 88, desde: 1.6, hasta: 11 },
  columna: { lado: 1.8, v: 67.4, desde: 1.6, hasta: 10, en: [-8, -2.7, 2.7, 8] as readonly number[] },
  cornisa: { u: 12, v0: 65.5, v1: 88.5, desde: 10, hasta: 11.4 },
  atico: { u: 7, v0: 68, v1: 86, desde: 11.4, hasta: 13.2 },
  /* La puerta: una hoja oscura una décima por delante de la fachada, entre las dos columnas de en medio. */
  puerta: { u: 2.2, v0: 69.9, v1: 70, desde: 1.6, hasta: 7.2 },
} as const;

function carasDeLaOficina(casilla: number): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  for (const e of OFICINA.escalones) salida.push(...caja(casilla, -e.u, e.u, e.v0, e.v1, e.desde, e.hasta, COLOR_DE_OBRA.piedra));
  const c = OFICINA.cuerpo;
  salida.push(...caja(casilla, -c.u, c.u, c.v0, c.v1, c.desde, c.hasta, COLOR_DE_OBRA.sillar));
  const p = OFICINA.puerta;
  salida.push(...caja(casilla, -p.u, p.u, p.v0, p.v1, p.desde, p.hasta, COLOR_DE_OBRA.puertaDeLaOficina));
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
  /* La JOYA tampoco: gira sobre su eje y vive aparte (ver «piezas vivas»). */
  return salida;
}

/**
 * LO QUE NO ES UNA CAJA: TRONCOS DE CONO Y DISCOS.
 *
 * Las torres de refrigeración de una central y el depósito de un canal de aguas son redondos, y
 * una ruleta es un disco. Los tres salen del mismo par de funciones, y las dos tienen la vuelta
 * DERIVADA y no probada a ojo, como todo lo demás de este fichero:
 *
 * · el costado de un tronco se recorre `a1 → a0` (de mayor ángulo a menor) de abajo arriba, que es
 *   lo que deja la normal mirando hacia FUERA del eje. Al revés —que es lo que uno escribe
 *   primero— la torre se ve por dentro y desde fuera no está;
 * · un disco tumbado es un abanico de triángulos desde su centro recorriendo los ángulos AL
 *   DERECHO, por la misma cuenta que hace que una `losa` mire al cielo.
 */
export function tronco(
  casilla: number,
  cu: number,
  cv: number,
  radioAbajo: number,
  radioArriba: number,
  y0: number,
  y1: number,
  segmentos: number,
  color: string,
): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  const en = (angulo: number, radio: number, y: number): PuntoDeObra => [cu + radio * Math.cos(angulo), y, cv + radio * Math.sin(angulo)];
  for (let k = 0; k < segmentos; k++) {
    const a0 = (k / segmentos) * Math.PI * 2;
    const a1 = ((k + 1) / segmentos) * Math.PI * 2;
    salida.push({ casilla, puntos: [en(a1, radioAbajo, y0), en(a1, radioArriba, y1), en(a0, radioArriba, y1), en(a0, radioAbajo, y0)], color });
  }
  return salida;
}

/**
 * Un disco tumbado a la cota `y`, mirando arriba: un abanico de triángulos desde el centro.
 *
 * MIRA ARRIBA EN LOS DOS MARCOS, y eso pide dos órdenes. En el de una casilla, `(u, v)` llega al
 * mundo con determinante −1 y el orden `a0 → a1` sale hacia arriba; en `DEL_MUNDO` —el de la vía y
 * el de las piezas vivas— no hay espejo, y ese mismo orden mira al SUELO. Así estuvo la ruleta del
 * casino: sus 24 triángulos, plato y buje, del revés, y como su material sólo pinta la cara de
 * delante, desde el aire se veía girar la rayita amarilla sobre nada.
 */
export function disco(casilla: number, cu: number, cv: number, radio: number, y: number, segmentos: number, color: string): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  const en = (angulo: number): PuntoDeObra => [cu + radio * Math.cos(angulo), y, cv + radio * Math.sin(angulo)];
  for (let k = 0; k < segmentos; k++) {
    const a0 = (k / segmentos) * Math.PI * 2;
    const a1 = ((k + 1) / segmentos) * Math.PI * 2;
    salida.push(casilla === DEL_MUNDO ? triangulo(casilla, [cu, y, cv], en(a1), en(a0), color) : triangulo(casilla, [cu, y, cv], en(a0), en(a1), color));
  }
  return salida;
}

/**
 * LA CENTRAL ELÉCTRICA (casilla 12, la Luz).
 *
 * Miguel: «para la casilla de la compañía eléctrica me gustaría que hubiera un edificio
 * característico de una central eléctrica». Lo característico de una central, lo que la hace
 * reconocible de un vistazo y desde cualquier ángulo, son las TORRES DE REFRIGERACIÓN: dos
 * troncos con cintura, no dos cilindros. La cintura se hace con dos troncos pegados —el de abajo
 * cerrando de 5 a 3,2 y el de arriba abriendo de 3,2 a 4,1—, que es la silueta que todo el mundo
 * dibuja cuando dibuja una central.
 *
 * Al lado, la chimenea con su banda roja y la nave de turbinas. Doce segmentos por torre: a la
 * talla a la que se ve desde el tablero, dieciséis no se distinguen de doce y cuestan un tercio
 * más.
 */
const CENTRAL = {
  torres: [-7.5, 7.5] as readonly number[],
  torre: { v: 76, radioPie: 5, radioCintura: 3.2, radioBoca: 4.1, cintura: 8.5, alto: 12, segmentos: 12 },
  chimenea: { u: 0, v: 66, radio: 1.5, alto: 16, segmentos: 8, banda: { desde: 12.5, hasta: 14.5 } },
  nave: { u0: -12, u1: 12, v0: 60.5, v1: 64, alto: 5 },
} as const;

function carasDeLaCentral(casilla: number): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  const t = CENTRAL.torre;
  for (const u of CENTRAL.torres) {
    salida.push(...tronco(casilla, u, t.v, t.radioPie, t.radioCintura, 0, t.cintura, t.segmentos, COLOR_DE_OBRA.hormigon));
    salida.push(...tronco(casilla, u, t.v, t.radioCintura, t.radioBoca, t.cintura, t.alto, t.segmentos, COLOR_DE_OBRA.hormigon));
    /* La boca, oscura: una torre sin boca es un cono y no una torre. */
    salida.push(...disco(casilla, u, t.v, t.radioBoca - 0.4, t.alto - 0.3, t.segmentos, COLOR_DE_OBRA.boca));
  }
  const c = CENTRAL.chimenea;
  salida.push(...tronco(casilla, c.u, c.v, c.radio, c.radio * 0.82, 0, c.alto, c.segmentos, COLOR_DE_OBRA.hormigon));
  salida.push(...tronco(casilla, c.u, c.v, c.radio * 0.9, c.radio * 0.87, c.banda.desde, c.banda.hasta, c.segmentos, COLOR_DE_OBRA.bandaRoja));
  const n = CENTRAL.nave;
  salida.push(...caja(casilla, n.u0, n.u1, n.v0, n.v1, 0, n.alto, COLOR_DE_OBRA.nave));
  return salida;
}

/**
 * EL CANAL DE AGUAS (casilla 28). «La compañía de Agua igual que la eléctrica.»
 *
 * O sea: reconocible por su silueta y no por un cartel. La de una compañía de aguas es el
 * DEPÓSITO ELEVADO —un cilindro sobre cuatro patas— y la alberca. Van los dos, con la caseta de
 * bombas al lado para que el conjunto tenga escala.
 *
 * LA ALBERCA ES HUECA. Era una caja maciza de 1,4 con el agua a 1,15, o sea DEBAJO de su propia
 * tapa de hormigón: desde el aire se veía un bloque gris, y ninguna regla lo notaba porque la tapa
 * miraba arriba como debe. Ahora son un fondo que llega hasta el agua y cuatro bordes que la
 * rodean, y `verify:burgo-escena` exige que el agua se vea desde arriba.
 */
const AGUAS = {
  deposito: { u: -7, v: 76, radio: 5.2, patas: 7.5, alto: 6.5, segmentos: 12, pata: 0.8, separacion: 3.4 },
  alberca: { u0: 1, u1: 13, v0: 68, v1: 84, borde: 0.9, alto: 1.4, agua: 1.15 },
  caseta: { u0: -13, u1: -3, v0: 61, v1: 66.5, alto: 4.5 },
} as const;

function carasDeLasAguas(casilla: number): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  const d = AGUAS.deposito;
  for (const du of [-d.separacion, d.separacion]) {
    for (const dv of [-d.separacion, d.separacion]) {
      salida.push(...caja(casilla, d.u + du - d.pata / 2, d.u + du + d.pata / 2, d.v + dv - d.pata / 2, d.v + dv + d.pata / 2, 0, d.patas, COLOR_DE_OBRA.hierro));
    }
  }
  salida.push(...tronco(casilla, d.u, d.v, d.radio, d.radio, d.patas, d.patas + d.alto, d.segmentos, COLOR_DE_OBRA.deposito));
  salida.push(...disco(casilla, d.u, d.v, d.radio, d.patas + d.alto, d.segmentos, COLOR_DE_OBRA.depositoTapa));
  const a = AGUAS.alberca;
  /* El fondo, hasta cinco centésimas por debajo del agua: pegado a ella pelearía en profundidad. */
  salida.push(...caja(casilla, a.u0, a.u1, a.v0, a.v1, 0, a.agua - 0.05, COLOR_DE_OBRA.hormigon));
  /* Los cuatro bordes, del fondo a lo alto: dos a lo largo de `v` y dos entre ellos. */
  salida.push(...caja(casilla, a.u0, a.u0 + a.borde, a.v0, a.v1, a.agua - 0.05, a.alto, COLOR_DE_OBRA.hormigon));
  salida.push(...caja(casilla, a.u1 - a.borde, a.u1, a.v0, a.v1, a.agua - 0.05, a.alto, COLOR_DE_OBRA.hormigon));
  salida.push(...caja(casilla, a.u0 + a.borde, a.u1 - a.borde, a.v0, a.v0 + a.borde, a.agua - 0.05, a.alto, COLOR_DE_OBRA.hormigon));
  salida.push(...caja(casilla, a.u0 + a.borde, a.u1 - a.borde, a.v1 - a.borde, a.v1, a.agua - 0.05, a.alto, COLOR_DE_OBRA.hormigon));
  salida.push(losa(casilla, a.u0 + a.borde, a.u1 - a.borde, a.v0 + a.borde, a.v1 - a.borde, a.agua, COLOR_DE_OBRA.agua));
  const c = AGUAS.caseta;
  salida.push(...caja(casilla, c.u0, c.u1, c.v0, c.v1, 0, c.alto, COLOR_DE_OBRA.nave));
  return salida;
}

/**
 * EL CASINO (casillas 7, 22 y 36, los Sucesos).
 *
 * Miguel: «para las casillas de suerte me gustaría que hubiera un CASINO». Un casino no se
 * reconoce por el edificio —es un cajón— sino por lo que le cuelga: la MARQUESINA que vuela sobre
 * la entrada, el RÓTULO vertical con bombillas y, ya en el suelo, la RULETA.
 *
 * La ruleta va tumbada en el suelo y no dentro del edificio por la misma razón que la celda de la
 * comisaría no tiene techo: lo que no se ve desde arriba, en un tablero, no existe.
 */
const CASINO = {
  cuerpo: { u0: -12, u1: 12, v0: 70, v1: 88, alto: 9 },
  marquesina: { u0: -9, u1: 9, v0: 66, v1: 70.5, desde: 6.2, hasta: 7.4 },
  rotulo: { u: 10.5, v: 68, ancho: 2.4, desde: 0, hasta: 15 },
  bombillas: { cuantas: 5, lado: 0.9, desde: 4 },
  ruleta: { u: -4, v: 65, radio: 4.2, segmentos: 12 },
} as const;

function carasDelCasino(casilla: number): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  const c = CASINO.cuerpo;
  salida.push(...caja(casilla, c.u0, c.u1, c.v0, c.v1, 0, c.alto, COLOR_DE_OBRA.casino));
  const m = CASINO.marquesina;
  salida.push(...caja(casilla, m.u0, m.u1, m.v0, m.v1, m.desde, m.hasta, COLOR_DE_OBRA.marquesina));
  const r = CASINO.rotulo;
  salida.push(...caja(casilla, r.u - r.ancho / 2, r.u + r.ancho / 2, r.v - r.ancho / 2, r.v + r.ancho / 2, r.desde, r.hasta, COLOR_DE_OBRA.casino));
  /* Las bombillas del rótulo: cinco cubitos que vuelan un pelo sobre su cara. */
  const b = CASINO.bombillas;
  const paso = (r.hasta - b.desde) / (b.cuantas + 1);
  for (let k = 1; k <= b.cuantas; k++) {
    const y = b.desde + paso * k;
    salida.push(...caja(casilla, r.u - b.lado / 2, r.u + b.lado / 2, r.v - r.ancho / 2 - 0.3, r.v - r.ancho / 2, y - b.lado / 2, y + b.lado / 2, COLOR_DE_OBRA.bombilla));
  }
  /*
   * La RULETA no se funde: gira, así que vive aparte (ver «piezas vivas»). Lo que queda aquí es su
   * foso, que es lo que hace que un disco en el suelo se lea como una ruleta y no como una tapa.
   */
  const ru = CASINO.ruleta;
  salida.push(...disco(casilla, ru.u, ru.v, ru.radio * 1.22, ALZA_DEL_ASFALTO - 0.01, ru.segmentos, COLOR_DE_OBRA.piedra));
  return salida;
}

/* ──────────────────── El ferrocarril, que no es de ninguna casilla ──────────────────── */

/**
 * LA VÍA DA LA VUELTA AL BURGO, Y POR AQUÍ ES POR DONDE CABE.
 *
 * Miguel: «una línea de vías de tren que recorra todo el perímetro del tablero». El sitio que
 * parecía natural era el marco de fuera del propio tablero —la banda `v` 90..108 de cada
 * casilla—, y ahí NO cabe: en dos esquinas ese marco es justo donde se levantan el pabellón de la
 * cárcel y el cuerpo de la comisaría, recién puestos.
 *
 * Donde sí cabe es en el campo, y no en un sitio cualquiera: entre el canto del tablero (432) y
 * los 448 a partir de los cuales se siembran las manchas de arbolado
 * (`MANCHAS_LEJOS_DEL_TABLERO`). Esa franja de dieciséis está LIMPIA a propósito —«el borde del
 * tablero se ve limpio, y el paño de dados también»— así que la vía se mete ahí por su eje, a 440,
 * sin desalojar nada y sin tocar el manto, que corre por debajo a −0,05.
 *
 * ═══ Y TIENE CURVAS, QUE NO ES UN CAPRICHO ═══
 *
 * Cuatro rectas que se cruzaran en las esquinas serían cuatro cruces de vía, y un tren que da la
 * vuelta a un tablero no cruza: GIRA. Las esquinas son cuartos de círculo de radio 40, y de ahí
 * sale el eje entero como una polilínea: se muestrea cada `PASO_DE_TRAVIESA` y sobre cada punto se
 * planta una traviesa perpendicular; los carriles son barras que unen los puntos de igual rumbo.
 *
 * Es además lo que hace que el tren pueda andar: la misma polilínea le sirve de carril al que se
 * mueve, y así el tren no puede ir por un sitio distinto del que se ve dibujado.
 */
export const VIA = {
  /*
   * ═══ TODOS ESTOS NÚMEROS SALEN DE UN PASILLO DE DIECISÉIS ═══
   *
   * La vía tiene que caber entre el canto del tablero (432) y la primera mancha de arbolado (448).
   * Dieciséis, y de ahí sale todo lo demás con una cuenta que hubo que hacer DOS veces:
   *
   * · una curva de radio `r` centrada en `(eje − r, eje − r)` pasa por su punto de 45° a
   *   `eje − 0,293 r` del centro, y ahí hay que descontar ADEMÁS el medio ancho del balasto, que
   *   en diagonal entra otro `0,707 × medio`. La primera versión —eje 440, radio 40, balasto 13—
   *   metía la vía a 429,5 del centro: por DEBAJO de la losa de la esquina de la cárcel;
   * · con el eje en 442, el balasto en 9,5 y el radio en 15, el punto más adentro de la curva cae
   *   en 433,9 medido —la fórmula da 434,2 y el muestreo se queda un pelo por dentro— y el más
   *   afuera de la recta en 446,8. Dentro del pasillo, y con un dedo a cada lado.
   *
   * Las dos veces lo dijo el comprobador —«ninguna obra se sale de su sitio»— y no una captura.
   */
  eje: 442,
  radioDeCurva: 15,
  anchoDeTraviesa: 8,
  gruesoDeTraviesa: 1.5,
  pasoDeTraviesa: 6,
  /* Los dos carriles, a 2,4 del eje: la misma proporción de vía y traviesa que una de verdad. */
  carril: { separacion: 2.4, ancho: 0.7, alto: 0.65 },
  balasto: 9.5,
  alza: 0.02,
} as const;

/** Un punto del eje de la vía, con el rumbo que lleva la vía ahí. */
export interface PuntoDeLaVia {
  readonly x: number;
  readonly z: number;
  /** Unitario, en el sentido de la marcha del tren. */
  readonly dx: number;
  readonly dz: number;
}

let ejeGuardado: PuntoDeLaVia[] | null = null;

/**
 * EL EJE DE LA VÍA, muestreado cada paso de traviesa: cuatro rectas y cuatro cuartos de círculo.
 * Se recorre en el sentido de la marcha del tablero para que el tren y los peones vayan al mismo.
 */
export function ejeDeLaVia(): PuntoDeLaVia[] {
  if (ejeGuardado !== null) return ejeGuardado;
  const e = VIA.eje;
  const r = VIA.radioDeCurva;
  const recta = e - r;
  const salida: PuntoDeLaVia[] = [];
  /* Cuatro tramos: cada uno es una recta y la curva que la remata, en sentido antihorario. */
  const tramos: readonly { desde: { x: number; z: number }; hasta: { x: number; z: number }; centro: { x: number; z: number } }[] = [
    { desde: { x: -recta, z: e }, hasta: { x: recta, z: e }, centro: { x: recta, z: recta } },
    { desde: { x: e, z: recta }, hasta: { x: e, z: -recta }, centro: { x: recta, z: -recta } },
    { desde: { x: recta, z: -e }, hasta: { x: -recta, z: -e }, centro: { x: -recta, z: -recta } },
    { desde: { x: -e, z: -recta }, hasta: { x: -e, z: recta }, centro: { x: -recta, z: recta } },
  ];
  for (let t = 0; t < tramos.length; t++) {
    const tramo = tramos[t] as (typeof tramos)[number];
    const largo = Math.hypot(tramo.hasta.x - tramo.desde.x, tramo.hasta.z - tramo.desde.z);
    const dx = (tramo.hasta.x - tramo.desde.x) / largo;
    const dz = (tramo.hasta.z - tramo.desde.z) / largo;
    const pasos = Math.round(largo / VIA.pasoDeTraviesa);
    for (let k = 0; k < pasos; k++) {
      const s = (k * largo) / pasos;
      salida.push({ x: tramo.desde.x + dx * s, z: tramo.desde.z + dz * s, dx, dz });
    }
    /* El cuarto de círculo que enlaza con el tramo siguiente. */
    const desdeAngulo = Math.atan2(tramo.hasta.z - tramo.centro.z, tramo.hasta.x - tramo.centro.x);
    const siguiente = tramos[(t + 1) % tramos.length] as (typeof tramos)[number];
    const hastaAngulo = Math.atan2(siguiente.desde.z - tramo.centro.z, siguiente.desde.x - tramo.centro.x);
    let giro = hastaAngulo - desdeAngulo;
    while (giro > Math.PI) giro -= Math.PI * 2;
    while (giro < -Math.PI) giro += Math.PI * 2;
    const pasosDeCurva = Math.max(2, Math.round((Math.abs(giro) * r) / VIA.pasoDeTraviesa));
    for (let k = 0; k < pasosDeCurva; k++) {
      const a = desdeAngulo + (giro * k) / pasosDeCurva;
      const signo = giro >= 0 ? 1 : -1;
      salida.push({ x: tramo.centro.x + r * Math.cos(a), z: tramo.centro.z + r * Math.sin(a), dx: -Math.sin(a) * signo, dz: Math.cos(a) * signo });
    }
  }
  ejeGuardado = salida;
  return salida;
}

/**
 * UNA BARRA ENTRE DOS PUNTOS DEL MUNDO, de `ancho` y de `y0` a `y1`.
 *
 * Aquí las vueltas NO son las de `caja`: eso está escrito en coordenadas de casilla, que llegan al
 * mundo con determinante −1. Esto ya está en el mundo, así que la regla se invierte y hay que
 * derivarla otra vez: con la normal `(b − a) × (c − a)`, una cara mira ARRIBA si se recorre
 * `(x0,z0) → (x0,z1) → (x1,z1) → (x1,z0)`, o sea al revés que en el plano de una casilla.
 */
function barra(p0: { x: number; z: number }, p1: { x: number; z: number }, ancho: number, y0: number, y1: number, color: string): CaraDeObra[] {
  const largo = Math.hypot(p1.x - p0.x, p1.z - p0.z) || 1;
  const dx = (p1.x - p0.x) / largo;
  const dz = (p1.z - p0.z) / largo;
  const nx = -dz * (ancho / 2);
  const nz = dx * (ancho / 2);
  const p = (extremo: { x: number; z: number }, signo: number, y: number): PuntoDeObra => [extremo.x + nx * signo, y, extremo.z + nz * signo];
  const cara = (puntos: readonly [PuntoDeObra, PuntoDeObra, PuntoDeObra, PuntoDeObra]): CaraDeObra => ({ casilla: DEL_MUNDO, puntos, color });
  return [
    cara([p(p0, 1, y1), p(p1, 1, y1), p(p1, -1, y1), p(p0, -1, y1)]),
    cara([p(p0, -1, y0), p(p1, -1, y0), p(p1, 1, y0), p(p0, 1, y0)]),
    cara([p(p1, 1, y0), p(p1, 1, y1), p(p0, 1, y1), p(p0, 1, y0)]),
    cara([p(p0, -1, y0), p(p0, -1, y1), p(p1, -1, y1), p(p1, -1, y0)]),
    cara([p(p0, 1, y0), p(p0, 1, y1), p(p0, -1, y1), p(p0, -1, y0)]),
    cara([p(p1, -1, y0), p(p1, -1, y1), p(p1, 1, y1), p(p1, 1, y0)]),
  ];
}

/** Una losa tumbada girada con el rumbo de la vía: una traviesa. Mismas vueltas que `barra`. */
function losaGirada(centro: { x: number; z: number }, dx: number, dz: number, largo: number, ancho: number, y: number, color: string): CaraDeObra {
  const ex = (dx * largo) / 2;
  const ez = (dz * largo) / 2;
  const nx = (-dz * ancho) / 2;
  const nz = (dx * ancho) / 2;
  const punto = (a: number, b: number): PuntoDeObra => [centro.x + ex * a + nx * b, y, centro.z + ez * a + nz * b];
  return { casilla: DEL_MUNDO, puntos: [punto(-1, 1), punto(1, 1), punto(1, -1), punto(-1, -1)], color };
}

/**
 * LA VÍA ENTERA, Y LA CUENTA QUE OBLIGA A AGRUPAR.
 *
 * Con una caja por traviesa y una barra por tramo entre punto y punto, la vuelta al tablero salía
 * por **24.000 triángulos**: más que toda la ciudad del recinto junta, y para una vía decorativa.
 * Así que dos decisiones, las dos medidas:
 *
 * · la TRAVIESA es una losa tumbada (2 triángulos) y no una caja (12): desde el aire, una traviesa
 *   de 0,3 de alto y una pintada en el balasto son la misma cosa;
 * · los CARRILES y el BALASTO se agrupan por rumbo: en una recta de 800 hay un solo carril de 800
 *   en vez de ciento catorce de a siete. Las curvas siguen segmento a segmento, que es donde el
 *   rumbo cambia de verdad.
 *
 * Quedan unos 2.200 triángulos para la vuelta entera.
 */
function carasDeLaVia(): CaraDeObra[] {
  const eje = ejeDeLaVia();
  const salida: CaraDeObra[] = [];
  for (const p of eje) {
    salida.push(losaGirada(p, p.dx, p.dz, VIA.gruesoDeTraviesa, VIA.anchoDeTraviesa, VIA.alza + 0.13, COLOR_DE_OBRA.traviesa));
  }
  /* Los tramos de rumbo constante: en una recta, uno solo; en una curva, uno por muestra. */
  let inicio = 0;
  for (let k = 1; k <= eje.length; k++) {
    const previo = eje[k - 1] as PuntoDeLaVia;
    const actual = eje[k % eje.length] as PuntoDeLaVia;
    const cambia = Math.abs(actual.dx - previo.dx) > 1e-9 || Math.abs(actual.dz - previo.dz) > 1e-9;
    if (!cambia && k < eje.length) continue;
    const a = eje[inicio] as PuntoDeLaVia;
    const b = actual;
    salida.push(losaGirada({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, a.dx, a.dz, Math.hypot(b.x - a.x, b.z - a.z), VIA.balasto, VIA.alza, COLOR_DE_OBRA.balasto));
    for (const lado of [-1, 1]) {
      const d = VIA.carril.separacion * lado;
      const p0 = { x: a.x - a.dz * d, z: a.z + a.dx * d };
      const p1 = { x: b.x - b.dz * d, z: b.z + b.dx * d };
      salida.push(...barra(p0, p1, VIA.carril.ancho, VIA.alza + 0.26, VIA.alza + 0.26 + VIA.carril.alto, COLOR_DE_OBRA.carril));
    }
    inicio = k % eje.length;
  }
  return salida;
}

/**
 * LAS CUATRO ESTACIONES (casillas 5, 15, 25 y 35), Y POR QUÉ SON CUATRO Y NO UNA REPETIDA.
 *
 * Miguel: «4 estaciones 3d distintas y conectadas por una línea de vías». Lo de «distintas» no es
 * un adorno: son las cuatro casillas más parecidas del tablero —mismo precio, misma renta, mismo
 * nombre de clase— y un jugador que mira el tablero necesita saber en cuál está sin leer.
 *
 * Todas comparten el esqueleto, que es lo que las hace reconocibles COMO estaciones: el andén
 * pegado al canto del tablero (la banda `v` 92..107, que es el marco y estaba libre), la
 * MARQUESINA que lo cubre sobre cuatro columnas —y por debajo de la cual pasa la avenida, que
 * entra por el eje de estas cuatro casillas y mide 48— y la casa de viajeros a un lado.
 *
 * Y cada una se distingue por su remate, que es lo único que cambia:
 *
 *   ·  5  TORRE DEL RELOJ: la de una estación de ciudad, con su esfera clara.
 *   · 15  AGUADA Y CARBONERA: la de una estación de vapor.
 *   · 25  MARQUESINA ABOVEDADA: tres cajas escalonadas en vez de una plana.
 *   · 35  APEADERO DE MADERA: tejado a dos aguas escalonado, más pequeño que las demás.
 */
const ESTACION = {
  anden: { u: 32, v0: 92, v1: 107, alto: 0.9 },
  marquesina: { u: 30, v0: 92, v1: 106, desde: 7, hasta: 8.2 },
  columna: { lado: 1.3, en: [-27, 27] as readonly number[], v: [94, 104] as readonly number[] },
  casa: { u0: -34, u1: -25, v0: 76, v1: 92, alto: 9 },
  /* El canto del andén, que es lo que lo separa de la vía y lo que hace que se lea como andén. */
  canto: { v0: 105.4, v1: 107, alto: 1.5 },
} as const;

function carasDeLaEstacion(casilla: number, remate: (casilla: number) => CaraDeObra[]): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  const a = ESTACION.anden;
  salida.push(...caja(casilla, -a.u, a.u, a.v0, a.v1, 0, a.alto, COLOR_DE_OBRA.anden));
  const c = ESTACION.canto;
  salida.push(...caja(casilla, -a.u, a.u, c.v0, c.v1, 0, c.alto, COLOR_DE_OBRA.piedra));
  const m = ESTACION.marquesina;
  salida.push(...caja(casilla, -m.u, m.u, m.v0, m.v1, m.desde, m.hasta, COLOR_DE_OBRA.marquesinaTren));
  for (const u of ESTACION.columna.en) {
    for (const v of ESTACION.columna.v) {
      salida.push(...caja(casilla, u - ESTACION.columna.lado / 2, u + ESTACION.columna.lado / 2, v - ESTACION.columna.lado / 2, v + ESTACION.columna.lado / 2, a.alto, m.desde, COLOR_DE_OBRA.hierro));
    }
  }
  const h = ESTACION.casa;
  salida.push(...caja(casilla, h.u0, h.u1, h.v0, h.v1, 0, h.alto, COLOR_DE_OBRA.ladrillo));
  salida.push(...remate(casilla));
  return salida;
}

/** 5 · La torre del reloj, encima de la casa de viajeros, con su esfera mirando a la avenida. */
function remateDelReloj(casilla: number): CaraDeObra[] {
  const t = { u: -29.5, v: 84, lado: 6.4, alto: 19 };
  const medio = t.lado / 2;
  return [
    ...caja(casilla, t.u - medio, t.u + medio, t.v - medio, t.v + medio, 0, t.alto, COLOR_DE_OBRA.ladrillo),
    ...caja(casilla, t.u - medio - 0.7, t.u + medio + 0.7, t.v - medio - 0.7, t.v + medio + 0.7, t.alto, t.alto + 1.1, COLOR_DE_OBRA.tejado),
    ...disco(casilla, t.u + medio + 0.05, t.v, 2.1, t.alto - 4.5, 10, COLOR_DE_OBRA.esfera),
  ];
}

/** 15 · La aguada y la carbonera: una estación de vapor se conoce por el depósito, no por el andén. */
function remateDeLaAguada(casilla: number): CaraDeObra[] {
  const d = { u: -29, v: 70, radio: 3.4, patas: 7, alto: 4.6, pata: 0.7, separacion: 2.2 };
  const salida: CaraDeObra[] = [];
  for (const du of [-d.separacion, d.separacion]) {
    for (const dv of [-d.separacion, d.separacion]) {
      salida.push(...caja(casilla, d.u + du - d.pata / 2, d.u + du + d.pata / 2, d.v + dv - d.pata / 2, d.v + dv + d.pata / 2, 0, d.patas, COLOR_DE_OBRA.hierro));
    }
  }
  salida.push(...tronco(casilla, d.u, d.v, d.radio, d.radio, d.patas, d.patas + d.alto, 10, COLOR_DE_OBRA.deposito));
  salida.push(...disco(casilla, d.u, d.v, d.radio, d.patas + d.alto, 10, COLOR_DE_OBRA.depositoTapa));
  /*
   * La carbonera: un cajón abierto con el carbón dentro, que se ve desde arriba. Va de 84 a 92 y
   * no de 76 a 88 porque las cuatro losas de cebra de la avenida son de 12 y llegan hasta `v = 81`:
   * a 76 la carbonera se metía dentro del paso de peatones.
   */
  salida.push(...caja(casilla, 16, 28, 84, 92, 0, 2.6, COLOR_DE_OBRA.piedra));
  salida.push(losa(casilla, 17.2, 26.8, 85.2, 90.8, 2.7, COLOR_DE_OBRA.carbon));
  return salida;
}

/** 25 · La marquesina abovedada: tres cajas escalonadas en vez de una plana. */
function remateDeLaBoveda(casilla: number): CaraDeObra[] {
  const m = ESTACION.marquesina;
  return [
    ...caja(casilla, -m.u + 3, m.u - 3, m.v0 + 1.5, m.v1 - 1.5, m.hasta, m.hasta + 1.3, COLOR_DE_OBRA.marquesinaTren),
    ...caja(casilla, -m.u + 7, m.u - 7, m.v0 + 3.2, m.v1 - 3.2, m.hasta + 1.3, m.hasta + 2.4, COLOR_DE_OBRA.marquesinaTren),
    ...caja(casilla, -m.u + 11, m.u - 11, m.v0 + 4.6, m.v1 - 4.6, m.hasta + 2.4, m.hasta + 3.1, COLOR_DE_OBRA.cristal),
  ];
}

/** 35 · El apeadero de madera: tejado a dos aguas escalonado sobre la casa, y un banco en el andén. */
function remateDelApeadero(casilla: number): CaraDeObra[] {
  const h = ESTACION.casa;
  return [
    ...caja(casilla, h.u0 - 1, h.u1 + 1, h.v0 - 1, h.v1 + 1, h.alto, h.alto + 1.1, COLOR_DE_OBRA.tejado),
    ...caja(casilla, h.u0 + 1.6, h.u1 - 1.6, h.v0 + 1.6, h.v1 - 1.6, h.alto + 1.1, h.alto + 2.2, COLOR_DE_OBRA.tejado),
    ...caja(casilla, h.u0 + 3.2, h.u1 - 3.2, h.v0 + 3.2, h.v1 - 3.2, h.alto + 2.2, h.alto + 3.1, COLOR_DE_OBRA.tejado),
    ...caja(casilla, 8, 18, 96, 98.4, ESTACION.anden.alto, ESTACION.anden.alto + 1.6, COLOR_DE_OBRA.madera),
  ];
}

/* ──────────────────────────── El tren, que es lo que se mueve ──────────────────────────── */

/**
 * EL TREN NO ES UNA OBRA: ES UNA PIEZA QUE ANDA, Y POR ESO SE ESCRIBE APARTE.
 *
 * Todo lo demás de este fichero se FUNDE en una malla y no se vuelve a tocar. Un tren no puede:
 * se mueve, así que va en su propia malla —una `InstancedMesh` de dos instancias, o sea UNA
 * llamada de dibujo para los dos trenes— y quien la mueve es el bucle de fotogramas con la
 * función pura de `coreografia.ts`.
 *
 * ═══ SU GEOMETRÍA VA EN EL MARCO DEL TREN, Y ESO DECIDE DOS COSAS ═══
 *
 * La primera, las VUELTAS: las cajas de las casillas (`caja`) las tienen derivadas para un marco
 * que llega al mundo con determinante −1, y el tren no —su geometría es local y la matriz de cada
 * instancia la lleva al mundo sin reflejarla—. Con `caja` saldría entero del revés, así que se
 * construye con `barra`, que es la que ya está derivada para el mundo.
 *
 * La segunda, HACIA DÓNDE MIRA: el morro va sobre **`+z`**, que es la convención de todas las
 * piezas de este tablero —`rumboDeLaMarcha` devuelve `atan2(dx, dz)`, que es el giro que lleva
 * `+z` al rumbo—. Construído sobre `+x`, que fue el primer intento, el tren daba la vuelta al
 * burgo **de lado**: se movió bien desde el primer fotograma y miraba a noventa grados de su
 * marcha. Lo cazó la cuenta del giro, porque en una captura desde arriba no se distingue.
 */
export const TREN = {
  ancho: 5,
  locomotora: { largo: 14, alto: 5.4, morro: { largo: 4.5, alto: 3.6 }, cabina: { largo: 5, alto: 3.2, ancho: 4.6 }, chimenea: { radio: 0.9, alto: 3, en: 3.2 } },
  vagon: { largo: 12, alto: 4.6, cuantos: 2 },
  enganche: 1.6,
  /* Las ruedas: dos hileras de discos bajos, que a esta talla es lo que se ve de un bogie. */
  rueda: { radio: 1.1, ancho: 0.8, en: [-4.5, 4.5] as readonly number[] },
  /* El tren se posa sobre el carril: balasto + traviesa + carril. */
  alza: 0.02 + 0.26 + 0.65,
} as const;

/** El tren entero, en su propio marco: el morro mira a `+z` y el `0` es el centro del convoy. */
export function carasDelTren(): CaraDeObra[] {
  const salida: CaraDeObra[] = [];
  const t = TREN;
  const largoTotal = t.locomotora.largo + t.vagon.cuantos * (t.enganche + t.vagon.largo);
  let x = largoTotal / 2;
  const en = (a: number, b: number): { desde: { x: number; z: number }; hasta: { x: number; z: number } } => ({ desde: { x: 0, z: a }, hasta: { x: 0, z: b } });
  /* La locomotora: cuerpo, morro más bajo delante, cabina detrás y chimenea. */
  const loco = en(x - t.locomotora.largo, x);
  salida.push(...barra(loco.desde, { x: 0, z: x - t.locomotora.morro.largo }, t.ancho, t.alza, t.alza + t.locomotora.alto, COLOR_DE_OBRA.locomotora));
  salida.push(...barra({ x: 0, z: x - t.locomotora.morro.largo }, loco.hasta, t.ancho - 0.6, t.alza, t.alza + t.locomotora.morro.alto, COLOR_DE_OBRA.locomotora));
  salida.push(
    ...barra(
      { x: 0, z: x - t.locomotora.largo + 0.6 },
      { x: 0, z: x - t.locomotora.largo + 0.6 + t.locomotora.cabina.largo },
      t.locomotora.cabina.ancho,
      t.alza + t.locomotora.alto,
      t.alza + t.locomotora.alto + t.locomotora.cabina.alto,
      COLOR_DE_OBRA.cabina,
    ),
  );
  /*
   * La chimenea y las ruedas van en CAJA y no en tronco de cono, y no por pereza: `tronco` tiene
   * las vueltas derivadas para el marco de una casilla —determinante −1— y aquí estamos en el
   * marco del tren, que llega al mundo sin reflejarse. Un tronco puesto aquí saldría del revés.
   * A la talla a la que se ve un tren en este tablero, una chimenea de ocho caras y una de cuatro
   * son la misma chimenea.
   */
  const chimenea = x - t.locomotora.morro.largo - t.locomotora.chimenea.en;
  salida.push(
    ...barra(
      { x: 0, z: chimenea },
      { x: 0, z: chimenea + 0.1 },
      t.locomotora.chimenea.radio * 2,
      t.alza + t.locomotora.alto,
      t.alza + t.locomotora.alto + t.locomotora.chimenea.alto,
      COLOR_DE_OBRA.hierro,
    ),
  );
  x -= t.locomotora.largo;
  for (let k = 0; k < t.vagon.cuantos; k++) {
    x -= t.enganche;
    salida.push(...barra({ x: 0, z: x - t.vagon.largo }, { x: 0, z: x }, t.ancho, t.alza, t.alza + t.vagon.alto, COLOR_DE_OBRA.vagon));
    x -= t.vagon.largo;
  }
  /* Las ruedas, a lo largo del convoy: dos por bogie y un bogie cada nueve. */
  for (let centro = -largoTotal / 2 + 3; centro < largoTotal / 2 - 2; centro += 9) {
    salida.push(
      ...barra({ x: 0, z: centro - t.rueda.radio }, { x: 0, z: centro + t.rueda.radio }, t.ancho + 0.4, t.alza - t.rueda.radio * 2, t.alza, COLOR_DE_OBRA.rueda),
    );
  }
  return salida;
}

/** Dos triángulos por cuadro, como en las obras: lo que el presupuesto guarda para UN tren. */
export function triangulosDelTren(): number {
  return carasDelTren().reduce((n, cara) => n + (esTriangulo(cara) ? 1 : 2), 0);
}

/** Lo que mide la vía dando la vuelta entera, y dónde cae cada punto de su eje. */
let largoGuardado: { readonly largo: number; readonly acumulado: readonly number[] } | null = null;

function medidaDeLaVia(): { readonly largo: number; readonly acumulado: readonly number[] } {
  if (largoGuardado !== null) return largoGuardado;
  const eje = ejeDeLaVia();
  const acumulado: number[] = [];
  let suma = 0;
  for (let k = 0; k < eje.length; k++) {
    acumulado.push(suma);
    const p = eje[k] as PuntoDeLaVia;
    const q = eje[(k + 1) % eje.length] as PuntoDeLaVia;
    suma += Math.hypot(q.x - p.x, q.z - p.z);
  }
  largoGuardado = { largo: suma, acumulado };
  return largoGuardado;
}

export function largoDeLaVia(): number {
  return medidaDeLaVia().largo;
}

/** El punto de la vía a `distancia` de su origen, y el rumbo que lleva ahí. Da la vuelta sola. */
export function puntoEnLaVia(distancia: number): { readonly x: number; readonly z: number; readonly rumbo: number } {
  const eje = ejeDeLaVia();
  const { largo, acumulado } = medidaDeLaVia();
  const d = ((distancia % largo) + largo) % largo;
  /* Búsqueda binaria sobre los acumulados: el eje tiene casi seiscientos puntos. */
  let bajo = 0;
  let alto = acumulado.length - 1;
  while (bajo < alto) {
    const medio = Math.ceil((bajo + alto) / 2);
    if ((acumulado[medio] as number) <= d) bajo = medio;
    else alto = medio - 1;
  }
  const p = eje[bajo] as PuntoDeLaVia;
  const q = eje[(bajo + 1) % eje.length] as PuntoDeLaVia;
  const tramo = Math.hypot(q.x - p.x, q.z - p.z) || 1;
  const s = (d - (acumulado[bajo] as number)) / tramo;
  return { x: p.x + (q.x - p.x) * s, z: p.z + (q.z - p.z) * s, rumbo: Math.atan2(p.dx, p.dz) };
}

/**
 * DÓNDE PARA EL TREN: en el punto de la vía más cercano al andén de cada estación.
 *
 * No se escribe a mano por la misma razón por la que el eje de la vía no se escribe a mano: si
 * mañana cambia el trazado, una lista de cuatro distancias copiadas se queda apuntando al campo.
 */
export function paradasDelTren(): number[] {
  const eje = ejeDeLaVia();
  const { acumulado } = medidaDeLaVia();
  const salida: number[] = [];
  for (const casilla of PUERTAS) {
    const m = marcoDeCasilla(casilla);
    const anden = puntoEnLaCasillaPorV(m, 0, 100);
    let mejor = 0;
    let mejorDistancia = Infinity;
    for (let k = 0; k < eje.length; k++) {
      const p = eje[k] as PuntoDeLaVia;
      const d = (p.x - anden.x) ** 2 + (p.z - anden.z) ** 2;
      if (d < mejorDistancia) {
        mejorDistancia = d;
        mejor = k;
      }
    }
    salida.push(acumulado[mejor] as number);
  }
  return salida.sort((a, b) => a - b);
}

/* ─────────────── Lo que se mueve: piezas vivas, fuera de la malla fundida ─────────────── */

/**
 * LAS PIEZAS VIVAS, Y POR QUÉ NO PUEDEN IR CON LAS DEMÁS.
 *
 * Todo lo que levanta este fichero se FUNDE en una sola malla: una llamada de dibujo para las
 * catorce casillas amuebladas y el ferrocarril entero. Una pieza que se mueve no puede entrar ahí
 * —fundida está clavada— así que sale, se lleva su propia malla y la escena le cambia la matriz.
 *
 * Son tres, y las tres se ven SIEMPRE (no sólo mientras dura su animación), así que cuestan tres
 * llamadas de dibujo permanentes. Se instancian por tipo y no por casilla: los tres cofres son la
 * misma tapa puesta tres veces, y las tres ruletas la misma ruleta. Tres llamadas para siete
 * piezas.
 *
 * Cada una se escribe en SU PROPIO MARCO, con el origen donde está su eje de giro:
 *
 *  · LA TAPA DEL COFRE gira sobre su BISAGRA, o sea sobre el canto de atrás. Su origen es esa
 *    bisagra y la tapa se extiende hacia `+z`, que es hacia quien mira la casilla desde fuera del
 *    anillo: al abrirse levanta el canto de delante y enseña el interior, que es lo que tiene que
 *    verse desde arriba. Con el origen en el centro giraría como una tapa de olla al aire.
 *  · LA RULETA gira sobre su eje, así que su origen es su centro.
 *  · LA JOYA también, y además se escribe entera aquí —sus ocho caras— porque gira sobre sí misma.
 */
export interface PiezaViva {
  readonly casilla: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** El `rotation.y` que lleva el `+z` del modelo al `+v` de su casilla. */
  readonly giro: number;
}

/** La tapa, en el marco de su bisagra: de 0 a `largo` hacia el que mira, y su grueso hacia arriba. */
export function carasDeLaTapa(): CaraDeObra[] {
  const t = COFRE.tapa;
  const largo = t.v1 - t.v0;
  const grueso = t.hasta - t.desde;
  const salida: CaraDeObra[] = [];
  salida.push(...barra({ x: 0, z: 0 }, { x: 0, z: largo }, t.u * 2, 0, grueso, COLOR_DE_OBRA.maderaClara));
  /* Los dos herrajes siguen con la tapa: son los que la cruzan. */
  for (const u of COFRE.herraje.en) {
    salida.push(...barra({ x: u, z: 0 }, { x: u, z: largo }, COFRE.herraje.ancho, grueso, grueso + 0.25, COLOR_DE_OBRA.hierro));
  }
  return salida;
}

/** Dónde está la bisagra de cada cofre, en el mundo: el canto de atrás de su tapa. */
export function bisagrasDeLosCofres(): PiezaViva[] {
  return CASILLAS_CON_COFRE.map((casilla) => {
    const m = marcoDeCasilla(casilla);
    const p = puntoEnLaCasillaPorV(m, 0, COFRE.tapa.v0);
    return { casilla, x: p.x, y: COFRE.tapa.desde, z: p.z, giro: giroHaciaFuera(m) };
  });
}

/** La ruleta, en el marco de su eje: el plato oscuro y el buje de latón. */
export function carasDeLaRuleta(): CaraDeObra[] {
  const r = CASINO.ruleta;
  return [
    ...disco(DEL_MUNDO, 0, 0, r.radio, 0, r.segmentos, COLOR_DE_OBRA.ruleta),
    ...disco(DEL_MUNDO, 0, 0, r.radio * 0.34, 0.05, r.segmentos, COLOR_DE_OBRA.laton),
    /* Una marca en el borde: sin ella, un disco que gira no se ve girar. */
    ...barra({ x: r.radio * 0.45, z: 0 }, { x: r.radio * 0.95, z: 0 }, 0.9, 0.06, 0.12, COLOR_DE_OBRA.bombilla),
  ];
}

export function ejesDeLasRuletas(): PiezaViva[] {
  return CASILLAS_CON_CASINO.map((casilla) => {
    const m = marcoDeCasilla(casilla);
    const p = puntoEnLaCasillaPorV(m, CASINO.ruleta.u, CASINO.ruleta.v);
    return { casilla, x: p.x, y: ALZA_DEL_ASFALTO, z: p.z, giro: giroHaciaFuera(m) };
  });
}

/** La joya, centrada en su propio eje para que pueda girar sobre él. */
export function carasDeLaJoyaViva(): CaraDeObra[] {
  const r = JOYA.radio;
  const medio = (JOYA.punta + JOYA.culata) / 2;
  const cintura: readonly PuntoDeObra[] = [
    [r, JOYA.cintura - medio, 0],
    [0, JOYA.cintura - medio, r],
    [-r, JOYA.cintura - medio, 0],
    [0, JOYA.cintura - medio, -r],
  ];
  const punta: PuntoDeObra = [0, JOYA.punta - medio, 0];
  const culata: PuntoDeObra = [0, JOYA.culata - medio, 0];
  const salida: CaraDeObra[] = [];
  for (let k = 0; k < 4; k++) {
    const a = cintura[k] as PuntoDeObra;
    const b = cintura[(k + 1) % 4] as PuntoDeObra;
    /*
     * Ojo con las vueltas: aquí NO estamos en el marco de una casilla (determinante −1) sino en el
     * del modelo, que llega al mundo sin reflejarse. Así que el recorrido va al revés que en
     * `carasDeLaJoya`, y por eso ésta no puede reusar aquélla.
     */
    salida.push(triangulo(DEL_MUNDO, b, a, punta, COLOR_DE_OBRA.joya));
    salida.push(triangulo(DEL_MUNDO, a, b, culata, COLOR_DE_OBRA.joyaOscura));
  }
  return salida;
}

export function ejeDeLaJoya(): PiezaViva {
  const m = marcoDeCasilla(CASILLA_DE_LA_TASA);
  const p = puntoEnLaCasillaPorV(m, 0, JOYA.centroV);
  return { casilla: CASILLA_DE_LA_TASA, x: p.x, y: (JOYA.punta + JOYA.culata) / 2, z: p.z, giro: giroHaciaFuera(m) };
}

/**
 * LA MONEDA DE LA RECAUDACIÓN (casilla 4): la animación de la oficina del estado.
 *
 * Miguel pidió la oficina «con animación de recaudación». Las monedas de cualquier pago vuelan al
 * Concejo, y a la cercanía a la que se juega son puntos de tres píxeles que no cuentan nada. Así que
 * la oficina tiene SU moneda, grande —4,6 de canto, dos tercios de su puerta—: cuando alguien paga
 * el Impuesto aparece al pie de la escalinata, sube rodando los dos peldaños y entra por la puerta.
 *
 * Va de canto, con su eje a lo largo de `x` del modelo y rodando hacia `+z`, que la escena lleva a
 * `+v` de la casilla, hacia la puerta. El origen está en su EJE, que es alrededor de lo que gira. Las
 * dos caras van en cuartos de dos oros: una moneda lisa que rueda no se ve rodar.
 */
export const CASILLA_DE_LA_OFICINA = 4;
export const MONEDA_DE_LA_RECAUDACION = { radio: 2.3, grueso: 0.8, segmentos: 16 } as const;

export function carasDeLaMonedaDeLaRecaudacion(): CaraDeObra[] {
  const { radio, grueso, segmentos } = MONEDA_DE_LA_RECAUDACION;
  const salida: CaraDeObra[] = [];
  const en = (x: number, angulo: number): PuntoDeObra => [x, radio * Math.cos(angulo), radio * Math.sin(angulo)];
  const g = grueso / 2;
  for (let k = 0; k < segmentos; k++) {
    const a0 = (k / segmentos) * Math.PI * 2;
    const a1 = ((k + 1) / segmentos) * Math.PI * 2;
    const oro = Math.floor((k * 4) / segmentos) % 2 === 0 ? COLOR_DE_OBRA.laton : COLOR_DE_OBRA.latonOscuro;
    /* En este marco no hay espejo: `a0 → a1` gira de `+y` a `+z`, y visto desde `+x` eso mira a `+x`. */
    salida.push(triangulo(DEL_MUNDO, [g, 0, 0], en(g, a0), en(g, a1), oro));
    salida.push(triangulo(DEL_MUNDO, [-g, 0, 0], en(-g, a1), en(-g, a0), oro));
    /* El canto, mirando hacia fuera del eje. */
    salida.push({ casilla: DEL_MUNDO, puntos: [en(-g, a0), en(-g, a1), en(g, a1), en(g, a0)], color: COLOR_DE_OBRA.laton });
  }
  return salida;
}

/**
 * POR DÓNDE RUEDA, en el marco de la casilla: a `u` (0..1) de su recorrido, dónde está su eje y
 * cuánto ha girado.
 *
 * Rueda sin deslizar y sube cada peldaño GIRANDO SOBRE SU ARISTA, que no es un salto: mientras la
 * arista está a menos de un radio por delante, el eje va por el arco de radio `radio` alrededor de
 * ella. La altura del eje es la mayor de las que le imponen el suelo que tiene debajo y las aristas
 * que tiene delante, y eso basta para que nunca se hunda en un peldaño. El giro es lo que lleva
 * andado el eje entre el radio, que en un arco alrededor de una arista también es verdad.
 *
 * Empieza donde toca la arista del primer peldaño —ni antes, que pisaría el precio, ni después,
 * que aparecería a medio subir— y acaba con la moneda entera DENTRO del cuerpo, ya escondida.
 */
function alturaDelEjeDeLaMoneda(v: number): number {
  const r: number = MONEDA_DE_LA_RECAUDACION.radio;
  let y = r;
  for (const e of OFICINA.escalones) {
    if (v >= e.v0) y = Math.max(y, e.hasta + r);
    else if (e.v0 - v < r) y = Math.max(y, e.hasta + Math.sqrt(r * r - (e.v0 - v) ** 2));
  }
  return y;
}

const primerPeldano = OFICINA.escalones[0] as { readonly v0: number; readonly hasta: number };
export const RECORRIDO_DE_LA_MONEDA = {
  desde: primerPeldano.v0 - Math.sqrt(2 * MONEDA_DE_LA_RECAUDACION.radio * primerPeldano.hasta - primerPeldano.hasta ** 2),
  hasta: OFICINA.cuerpo.v0 + MONEDA_DE_LA_RECAUDACION.radio + 0.2,
} as const;

export function monedaEnLaEscalinata(u: number): { readonly v: number; readonly y: number; readonly rodado: number } {
  const t = Math.min(1, Math.max(0, u));
  const v = RECORRIDO_DE_LA_MONEDA.desde + (RECORRIDO_DE_LA_MONEDA.hasta - RECORRIDO_DE_LA_MONEDA.desde) * t;
  /* Lo andado por el eje, en tramos de una décima: sobra para un arco de radio 2,3. */
  const tramos = Math.max(1, Math.ceil((v - RECORRIDO_DE_LA_MONEDA.desde) / 0.1));
  let andado = 0;
  let vAntes = RECORRIDO_DE_LA_MONEDA.desde;
  let yAntes = alturaDelEjeDeLaMoneda(vAntes);
  for (let k = 1; k <= tramos; k++) {
    const vk = RECORRIDO_DE_LA_MONEDA.desde + ((v - RECORRIDO_DE_LA_MONEDA.desde) * k) / tramos;
    const yk = alturaDelEjeDeLaMoneda(vk);
    andado += Math.hypot(vk - vAntes, yk - yAntes);
    vAntes = vk;
    yAntes = yk;
  }
  return { v, y: alturaDelEjeDeLaMoneda(v), rodado: andado / MONEDA_DE_LA_RECAUDACION.radio };
}

/** Lo mismo, en el mundo: dónde va su eje, hacia dónde mira su `+z` y cuánto ha rodado sobre su `x`. */
export function monedaDeLaRecaudacionEnElMundo(u: number): { readonly x: number; readonly y: number; readonly z: number; readonly giro: number; readonly rodado: number } {
  const m = marcoDeCasilla(CASILLA_DE_LA_OFICINA);
  const en = monedaEnLaEscalinata(u);
  const p = puntoEnLaCasillaPorV(m, 0, en.v);
  return { x: p.x, y: en.y, z: p.z, giro: giroHaciaFuera(m), rodado: en.rodado };
}

/** Las cajas de la oficina que la moneda tiene que respetar, en `(u, v, y)` de su casilla: para medirla. */
export function cajasDeLaOficina(): {
  readonly peldanos: readonly { readonly u: number; readonly v0: number; readonly v1: number; readonly desde: number; readonly hasta: number }[];
  readonly columnas: readonly { readonly u0: number; readonly u1: number; readonly v0: number; readonly v1: number }[];
  readonly cuerpo: { readonly u: number; readonly v0: number; readonly desde: number; readonly hasta: number };
  readonly puerta: { readonly u: number; readonly desde: number; readonly hasta: number };
} {
  const co = OFICINA.columna;
  return {
    peldanos: OFICINA.escalones,
    columnas: co.en.map((u) => ({ u0: u - co.lado / 2, u1: u + co.lado / 2, v0: co.v - co.lado / 2, v1: co.v + co.lado / 2 })),
    cuerpo: OFICINA.cuerpo,
    puerta: OFICINA.puerta,
  };
}

/**
 * EL HUMO DE LA CENTRAL (casilla 12) Y LA ONDA DEL CANAL (casilla 28): los servicios, cuando alguien
 * paga su renta.
 *
 * La central echa tres BOCANADAS por la chimenea y la alberca del canal abre una ONDA en el agua. Las
 * dos son piezas vivas —una malla cada una— que no se pintan fuera de su ventana. Aquí van su forma
 * y su sitio; cuándo y cuánto, en `coreografia.ts`.
 *
 * La bocanada es un cubo de lado 1 centrado en su origen: la escena lo escala, lo sube y lo gira, y
 * un humo de cubos es el humo de un mundo de cajas. La onda es un anillo tumbado mirando arriba, de
 * radio `radio` a su escala entera, que la escena abre desde el centro.
 */
export const CASILLA_DE_LA_CENTRAL = 12;
export const CASILLA_DEL_CANAL = 28;
export const BOCANADAS_DEL_HUMO = 3;
export const ONDA_DEL_CANAL = { radio: 4.4, grueso: 0.55, segmentos: 20 } as const;

export function carasDeUnaBocanada(): CaraDeObra[] {
  return barra({ x: 0, z: -0.5 }, { x: 0, z: 0.5 }, 1, -0.5, 0.5, COLOR_DE_OBRA.humo);
}

export function carasDeLaOnda(): CaraDeObra[] {
  const { radio, grueso, segmentos } = ONDA_DEL_CANAL;
  const salida: CaraDeObra[] = [];
  const en = (r: number, angulo: number): PuntoDeObra => [r * Math.cos(angulo), 0, r * Math.sin(angulo)];
  for (let k = 0; k < segmentos; k++) {
    const a0 = (k / segmentos) * Math.PI * 2;
    const a1 = ((k + 1) / segmentos) * Math.PI * 2;
    /* Sin espejo en este marco: de fuera a dentro y girando `a0 → a1`, el cuadro mira arriba. */
    salida.push({ casilla: DEL_MUNDO, puntos: [en(radio, a0), en(radio - grueso, a0), en(radio - grueso, a1), en(radio, a1)], color: COLOR_DE_OBRA.onda });
  }
  return salida;
}

/** La boca de la chimenea de la central, en el mundo: de ahí salen las bocanadas. */
export function bocaDeLaChimenea(): PiezaViva {
  const m = marcoDeCasilla(CASILLA_DE_LA_CENTRAL);
  const c = CENTRAL.chimenea;
  const p = puntoEnLaCasillaPorV(m, c.u, c.v);
  return { casilla: CASILLA_DE_LA_CENTRAL, x: p.x, y: c.alto, z: p.z, giro: giroHaciaFuera(m) };
}

/** El centro del agua de la alberca, tres centésimas por encima de ella: ahí se abre la onda. */
export function centroDeLaAlberca(): PiezaViva {
  const m = marcoDeCasilla(CASILLA_DEL_CANAL);
  const a = AGUAS.alberca;
  const p = puntoEnLaCasillaPorV(m, (a.u0 + a.u1) / 2, (a.v0 + a.v1) / 2);
  return { casilla: CASILLA_DEL_CANAL, x: p.x, y: a.agua + 0.03, z: p.z, giro: giroHaciaFuera(m) };
}

/**
 * LA REJA DE LA CELDA DE LA COMISARÍA, que sube y baja.
 *
 * Miguel: «quiero ver cómo entra en la celda». Quien cae en ¡A comisaría! corre hasta ella
 * (`peon.ts`, la etapa «a la celda») y pasa por DEBAJO de esta reja, que sube durante su golpe y
 * baja mientras se desvanece dentro, con su propia curva: `alzadoDeLaRejaDeLaCelda`.
 *
 * Va en el marco de la celda con el origen en el suelo, y sube en `y`.
 */
export function carasDeLaRejaDeLaCelda(): CaraDeObra[] {
  const ce = COMISARIA.celda;
  const salida: CaraDeObra[] = [];
  /* La reja corre a lo largo de `v`, por el lado `u0`: su ancho es el fondo de la celda. */
  const ancho = ce.v1 - ce.v0;
  const paso = ancho / (ce.barrotes + 1);
  for (let k = 1; k <= ce.barrotes; k++) {
    const u = -ancho / 2 + paso * k;
    salida.push(...barra({ x: u, z: 0 }, { x: u, z: ce.barrote }, ce.barrote, 0, ce.alto, COLOR_DE_OBRA.barrote));
  }
  /* El dintel que las remata: es lo que hace que se lean como una reja y no como cinco palos. */
  salida.push(...barra({ x: -ancho / 2, z: ce.barrote / 2 }, { x: ancho / 2, z: ce.barrote / 2 }, ce.barrote, ce.alto - 0.9, ce.alto, COLOR_DE_OBRA.barrote));
  return salida;
}

/** Dónde va esa reja, en el mundo: el cuarto lado de la celda, el que da al patio. */
export function sitioDeLaRejaDeLaCelda(): PiezaViva {
  const m = marcoDeCasilla(A_LA_MAZMORRA);
  const ce = COMISARIA.celda;
  const p = puntoEnEsquina(m, ce.u0, (ce.v0 + ce.v1) / 2);
  return { casilla: A_LA_MAZMORRA, x: p.x, y: 0, z: p.z, giro: giroHaciaFuera(m) };
}

/** Los triángulos de cada pieza viva: el presupuesto las cuenta una a una. */
export function triangulosDeLasPiezasVivas(): { readonly tapa: number; readonly ruleta: number; readonly joya: number; readonly reja: number; readonly moneda: number; readonly bocanada: number; readonly onda: number } {
  const cuenta = (caras: readonly CaraDeObra[]): number => caras.reduce((n, cara) => n + (esTriangulo(cara) ? 1 : 2), 0);
  return {
    tapa: cuenta(carasDeLaTapa()),
    ruleta: cuenta(carasDeLaRuleta()),
    joya: cuenta(carasDeLaJoyaViva()),
    reja: cuenta(carasDeLaRejaDeLaCelda()),
    moneda: cuenta(carasDeLaMonedaDeLaRecaudacion()),
    bocanada: cuenta(carasDeUnaBocanada()),
    onda: cuenta(carasDeLaOnda()),
  };
}

/** Qué levanta cada casilla lateral. Las que no están aquí todavía no tienen obra. */
const OBRA_DE_LA_CASILLA: Readonly<Record<number, (casilla: number) => CaraDeObra[]>> = {
  2: carasDelCofre,
  4: carasDeLaOficina,
  7: carasDelCasino,
  12: carasDeLaCentral,
  17: carasDelCofre,
  22: carasDelCasino,
  28: carasDeLasAguas,
  33: carasDelCofre,
  36: carasDelCasino,
  38: carasDeLaTasa,
  5: (c) => carasDeLaEstacion(c, remateDelReloj),
  15: (c) => carasDeLaEstacion(c, remateDeLaAguada),
  25: (c) => carasDeLaEstacion(c, remateDeLaBoveda),
  35: (c) => carasDeLaEstacion(c, remateDelApeadero),
};

function carasDeLasCasillas(): CaraDeObra[] {
  return Object.entries(OBRA_DE_LA_CASILLA).flatMap(([clave, hace]) => hace(Number(clave)));
}


/* ──────────────────────────────── Todas las obras ──────────────────────────────── */

let hechas: CaraDeObra[] | null = null;

/** Todas las caras de todas las obras del anillo, en coordenadas de casilla. */
export function carasDeLasObras(): CaraDeObra[] {
  if (hechas === null) hechas = [...carasDelAparcamiento(), ...carasDeLaMazmorra(), ...carasDeLaComisaria(), ...carasDeLasCasillas(), ...carasDeLaVia()];
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
  const m = marcoDeCasilla(casilla === DEL_MUNDO ? 0 : casilla);
  /*
   * Una esquina y una casilla lateral no usan el mismo marco: en la esquina, `(u, v)` son las dos
   * distancias al centro del tablero (324..432); en una lateral, `u` va a lo largo de la marcha
   * —de −36 a +36— y `v` es la profundidad de las bandas (0..108). Las dos, eso sí, llevan al
   * mundo con determinante −1, así que las vueltas de `losa` y `caja` valen para las dos.
   */
  const alMundo = ([u, y, v]: PuntoDeObra): PuntoDeObra => {
    if (casilla === DEL_MUNDO) return [u, y, v];
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
