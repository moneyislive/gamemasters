/**
 * LA CAJA DEL BURGO: los dados, el dinero, el reloj, los mazos y las casas del Concejo, pegados a la
 * pantalla.
 *
 * Miguel, mirando una partida: «quiero que los dados no se muestren encima del tablero en frente
 * de la estación de tren, quiero que se muestren en la pantalla del usuario como lo hacen en
 * riberas». La primera respuesta fue una bandeja de nogal con los dos dados dentro, y la vio así:
 * «la composición de los dados la veo demasiado sencilla, solo los dados en una base además en una
 * perspectiva demasiado desde arriba no termina de cuadrarme […] no se si mostrar representaciones
 * del dinero, un reloj de arena igual que el de Riberas también para mostrar lo que queda de turno,
 * etc. […] creo que podemos intentar ser originales y integrarlos en un elemento más temático».
 *
 * ═══ LA CAJA DEL JUEGO, Y NO UNA MESA ═══
 *
 * Lo más reconocible de un juego de tablero, después del tablero, es su CAJA abierta: el fondo con
 * sus compartimentos, donde viven el dinero, las casas y los hoteles, los dos mazos y los dados. Eso
 * es lo que se pinta, en nogal y con el fondo crema del tablero, y cada compartimento dice algo de la
 * partida:
 *
 *   · LOS DADOS, sobre un fieltro del color de quien tira.
 *   · TU DINERO, en montones por billete —500, 100, 50, 20, 10, 5 y 1, cada uno de su color— y una
 *     placa de latón con la cantidad exacta. Los montones tienen tope: dicen «mucho» o «poco» a
 *     simple vista, y la cifra la dice la placa.
 *   · LOS DOS MAZOS, Suerte y Caja de Comunidad, con su emblema y tan gruesos como cartas les quedan.
 *   · LAS CASAS Y LOS HOTELES DEL CONCEJO: los que quedan por construir. Cuando se acaban no se puede
 *     alzar, y eso se ve vaciarse.
 *
 * Y de pie junto a los dados, el RELOJ DE ARENA de Riberas (`escenas/reloj.tsx`): lo que queda de
 * turno, y el botón de pasarlo.
 *
 * ═══ MÁS DE FRENTE, Y LO MISMO EN CUALQUIER ESQUINA ═══
 *
 * La bandeja se inclinaba 55° hacia la cámara, y eso la aplastaba: unos dados vistos casi desde arriba
 * son dos cuadrados. Y no eran 55: iba abajo a la derecha, y el rayo del ojo hasta esa esquina ya baja
 * otros 17°. La caja se mira a `CAJA.inclinacion` DEL RAYO (`cabeceoHaciaElOjo`), como se mira una caja
 * puesta en la mesa desde la silla: se ven los costados de los dados, los tejados de las casas y la
 * silueta del reloj; y se ve igual abajo en el escritorio que arriba en la app, donde con la
 * inclinación de la cámara a secas quedaba rasante y las paredes tapaban lo de dentro.
 *
 * ═══ CÓMO SE PEGA A LA PANTALLA ═══
 *
 * Como la mesa de Riberas: un grupo copia la posición y el giro de la cámara en cada fotograma, y
 * dentro va la caja en coordenadas de CÁMARA, a `distancia` del ojo. Se copia DESPUÉS de que la escena
 * mueva la cámara para seguir al que mueve, o la caja temblaría justo al tirar.
 *
 * ═══ LAS UNIDADES SON LAS DEL PAÑO QUE HUBO ═══
 *
 * Los dados miden 20, como en el paño de delante de la Estación de Goya; el salto, el rebote y la
 * sacudida se cuentan en aristas. La máquina de los dados no cambia: la caja entera se ESCALA a lo que
 * tiene que medir en la pantalla.
 *
 * ═══ DOS FORMAS, Y DÓNDE SE POSA ═══
 *
 * La caja COMPLETA tiene dos filas de compartimentos; la COMPACTA, sólo la de delante —el dinero y los
 * dados—, para los lienzos estrechos, donde la de atrás le robaría al tablero un quinto del alto. La
 * esquina la decide el cliente: el escritorio, abajo a la derecha; la app, arriba a la derecha.
 *
 * Lo que se pega a la esquina es la caja con los dados en lo más alto de un salto y el reloj entero,
 * proyectada con la perspectiva de verdad; y lo que mide de ancho se mide ASÍ, proyectado, y no en el
 * centro del lienzo: medida en el centro, en un móvil de 375 la caja se salía 5 puntos por la izquierda.
 *
 * Sin `three` y sin React: `Burgo.tsx` la monta, `presupuesto.ts` la cuenta y `verify:burgo-escena` la
 * mide.
 */
import { REBOTE_DEL_DADO, SACUDIDA, SALTO_DEL_DADO } from '../dados';
import { ALTURA_DEL_SALTO_DEL_DOBLE } from './dados-del-burgo';
import type { Punto } from './anillo-en-3d';

/* ─────────────────────────────── Los dados, en unidades de bandeja ─────────────────────────────── */

/** La arista de un dado. La de siempre: la caja entera se escala, los dados no cambian. */
export const ARISTA_DE_LOS_DADOS = 20;

/**
 * CUÁNTAS ARISTAS SE MUEVE UN DADO EN CADA GESTO. Son los números por los que la escena multiplica
 * las curvas de `dados.ts` —el salto al rodar, el rebote al asentarse, el salto del doble y la
 * sacudida del «te toca»—, y están aquí porque la caja con la que se posa la bandeja tiene que saber
 * hasta dónde suben.
 */
export const MOVIMIENTO_DE_LOS_DADOS = { salto: 2, rebote: 6, doble: 1, sacudida: 2 } as const;

/** Lo más que se alza el CENTRO de un dado sobre su sitio quieto, en unidades de bandeja. */
export function alzaMaximaDeLosDados(): number {
  return ARISTA_DE_LOS_DADOS * Math.max(SALTO_DEL_DADO * MOVIMIENTO_DE_LOS_DADOS.salto, REBOTE_DEL_DADO * MOVIMIENTO_DE_LOS_DADOS.rebote, ALTURA_DEL_SALTO_DEL_DOBLE * MOVIMIENTO_DE_LOS_DADOS.doble);
}

/** Lo más que se aparta de lado un dado que tiembla, en unidades de bandeja. */
export function sacudidaMaximaDeLosDados(): number {
  return ARISTA_DE_LOS_DADOS * SACUDIDA.traslacion * MOVIMIENTO_DE_LOS_DADOS.sacudida;
}

/** La mitad de la diagonal del cubo: lo más que asoma un dado girado en cualquier dirección. */
export const MEDIA_DIAGONAL_DEL_DADO = (ARISTA_DE_LOS_DADOS * Math.sqrt(3)) / 2;
/** Y la de su cara: lo más que asoma de lado un dado quieto, girado sobre la vertical. */
export const MEDIA_DIAGONAL_DE_LA_CARA = (ARISTA_DE_LOS_DADOS * Math.SQRT2) / 2;
/**
 * LA DISTANCIA DE CADA DADO AL CENTRO DE SU FIELTRO: 16. Un dado se asienta GIRADO sobre la vertical
 * lo que diga su sello, y a 45° ocupa media diagonal de su cara, 14,14; a ±12, como estaban en el
 * paño, dos dados así se metían uno dentro del otro.
 */
export const SEPARACION_DE_LOS_DADOS = 16;

/* ─────────────────────────────── La caja ─────────────────────────────── */

/**
 * LAS PROPORCIONES DEL RELOJ DE ARENA, en fracciones de su lado: las de `escenas/reloj.tsx`, copiadas
 * porque aquel fichero trae `three` y éste no puede. `verify:burgo-escena` las compara con las de
 * allí: si alguien rehace el reloj de Riberas, la caja no se queda midiendo otro.
 */
export const PROPORCIONES_DEL_RELOJ = { altoDelBulbo: 0.38, radioDelBulbo: 0.26, gruesoDelMarco: 0.06 } as const;
const ALTO_DEL_BULBO = PROPORCIONES_DEL_RELOJ.altoDelBulbo;
const RADIO_DEL_BULBO = PROPORCIONES_DEL_RELOJ.radioDelBulbo;
const GRUESO_DEL_MARCO = PROPORCIONES_DEL_RELOJ.gruesoDelMarco;
/**
 * EL CILINDRO EN EL QUE CABE CUALQUIER RELOJ, en fracciones de su lado: un lado de alto y 0,3 de radio.
 * El de conos mide 0,88 de alto y 0,299 de radio (sus tapas); el de Riberas se normaliza en la escena
 * a este cilindro —un lado de alto, y más bajo si por ancho no cupiera—, y medido con `@gltf-transform`
 * es un lado de alto y 0,295 de radio. Así la composición se posa igual con un reloj que con el otro, y no
 * salta cuando el `.glb` termina de llegar.
 */
export const ENVOLVENTE_DEL_RELOJ = { alto: 1, radio: 0.3 } as const;

export type FormaDeLaBandeja = 'completa' | 'compacta';

/**
 * LA CAJA: nogal por fuera y crema por dentro, con paredes de 4 que suben 10 sobre el fondo y bajan 4
 * por debajo —el canto de delante tiene que verse con cuerpo—, y tabiques de 3 que suben 7.
 *
 * Las dos columnas miden 76 por dentro: lo que piden dos dados girados a 45° a ±16 de su centro
 * (62,7) con aire, y cuatro montones de billetes de 15 de ancho por fila. Las filas miden 40 la de atrás —los
 * mazos y las casas— y 56 la de delante, que es la de los dados y el dinero.
 *
 * El borde es nogal y no crema por los seis colores de los jugadores: van del casi negro al casi
 * blanco, y el fieltro del turno no puede confundirse con la madera (`verify:burgo-escena` lo mide). Por
 * eso el verde de sin turno es un punto más oscuro que el de la bandeja, `#2f5d47`: contra el nogal de
 * las paredes quedaba a 91, y a 103 con éste.
 */
export const CAJA = {
  pared: 4,
  tabique: 3,
  alto: 10,
  altoDelTabique: 7,
  bajo: 4,
  columna: 76,
  filas: { atras: 40, delante: 56 },
  /** Con la que se mira la caja: la de una caja puesta en la mesa vista desde la silla. */
  inclinacion: (40 * Math.PI) / 180,
  /** Del ojo al centro de la caja, en unidades del mundo. */
  distancia: 2,
  color: { madera: '#8a6446', canto: '#9a7654', fondo: '#efe6cc', fieltroSinTurno: '#245843' },
} as const;

/** Un rectángulo del fondo de la caja: `x` a lo ancho, `z` hacia quien mira. */
export interface Rectangulo {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

/** El reloj de arena de pie, sobre la mesa en la que apoya la caja. */
export interface SitioDelReloj {
  readonly x: number;
  readonly z: number;
  /** El alto del hueco del reloj, el `lado` de `RelojDeArena`. */
  readonly lado: number;
  /** La cota de esa mesa: la del canto de abajo de la caja. */
  readonly suelo: number;
  /** A qué cota va la cintura del reloj de conos, cuyas tapas bajan 0,44 lados desde ella. */
  readonly cinturaDeLosConos: number;
  /** Y el centro del de Riberas, que llega normalizado a un lado de alto. */
  readonly centroDelModelo: number;
}

export interface PlanoDeLaBandeja {
  readonly forma: FormaDeLaBandeja;
  /** El contorno de fuera de la caja. */
  readonly caja: Rectangulo;
  /** Los compartimentos, por dentro. Los de atrás sólo existen en la completa. */
  readonly dados: Rectangulo;
  readonly billetes: Rectangulo;
  readonly mazos: Rectangulo | null;
  readonly obras: Rectangulo | null;
  readonly reloj: SitioDelReloj;
}

/**
 * EL PLANO DE LA CAJA, con el origen en su centro. En la completa, la fila de atrás (mazos y obras)
 * va hacia `−z`, lejos de quien mira; la de delante (dinero y dados), hacia `+z`. El reloj va de pie
 * fuera de la caja, a la derecha de los dados.
 */
export function planoDeLaBandeja(forma: FormaDeLaBandeja): PlanoDeLaBandeja {
  const { pared, tabique, columna, filas } = CAJA;
  const ancho = 2 * pared + 2 * columna + tabique;
  const fondo = forma === 'completa' ? 2 * pared + filas.atras + tabique + filas.delante : 2 * pared + filas.delante;
  const caja: Rectangulo = { x0: -ancho / 2, x1: ancho / 2, z0: -fondo / 2, z1: fondo / 2 };
  const izquierda = { x0: caja.x0 + pared, x1: caja.x0 + pared + columna };
  const derecha = { x0: caja.x1 - pared - columna, x1: caja.x1 - pared };
  const delante = { z0: caja.z1 - pared - filas.delante, z1: caja.z1 - pared };
  const atras = { z0: caja.z0 + pared, z1: caja.z0 + pared + filas.atras };
  const dados = { ...derecha, ...delante };
  const lado = 48;
  return {
    forma,
    caja,
    dados,
    billetes: { ...izquierda, ...delante },
    mazos: forma === 'completa' ? { ...izquierda, ...atras } : null,
    obras: forma === 'completa' ? { ...derecha, ...atras } : null,
    reloj: {
      x: caja.x1 + 22,
      z: (dados.z0 + dados.z1) / 2,
      lado,
      suelo: -CAJA.bajo,
      cinturaDeLosConos: -CAJA.bajo + (ALTO_DEL_BULBO + GRUESO_DEL_MARCO) * lado,
      centroDelModelo: -CAJA.bajo + (ENVOLVENTE_DEL_RELOJ.alto * lado) / 2,
    },
  };
}

/** El centro de un rectángulo. */
export function centroDe(r: Rectangulo): Punto {
  return { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 };
}

/** Los dos huecos de los dados: a ±16 del centro de su fieltro. */
export function huecosDeLosDados(forma: FormaDeLaBandeja): readonly Punto[] {
  const c = centroDe(planoDeLaBandeja(forma).dados);
  return [
    { x: c.x - SEPARACION_DE_LOS_DADOS, z: c.z },
    { x: c.x + SEPARACION_DE_LOS_DADOS, z: c.z },
  ];
}

/* ─────────────────────────────── Las caras, sin `three` ─────────────────────────────── */

export type PuntoDeLaBandeja = readonly [number, number, number];

/** Una cara de color: cuatro puntos, o tres con el cuarto repetido, en el orden de `geometriaDeCarasConColor`. */
export interface CaraDeLaBandeja {
  readonly puntos: readonly [PuntoDeLaBandeja, PuntoDeLaBandeja, PuntoDeLaBandeja, PuntoDeLaBandeja];
  readonly color: string;
}

/**
 * UN PRISMA DE CARAS: arriba, los dos frentes y los dos costados, sin la de abajo, que nunca se ve.
 * El orden de cada cuadro deja su normal hacia fuera con el producto vectorial `(b − a) × (c − a)`.
 */
export function prisma(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, arriba: string, costados: string = arriba): CaraDeLaBandeja[] {
  return [
    { color: arriba, puntos: [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]] },
    { color: costados, puntos: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { color: costados, puntos: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] },
    { color: costados, puntos: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
    { color: costados, puntos: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
  ];
}

/** Un cuadro tumbado, mirando arriba. */
export function tumbado(x0: number, x1: number, y: number, z0: number, z1: number, color: string): CaraDeLaBandeja {
  return { color, puntos: [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]] };
}

/**
 * LAS CARAS DE LA CAJA: el FIELTRO de los dados el primero —sus seis vértices se repintan con el color
 * de quien tira—, el fondo crema de los demás compartimentos, las cuatro paredes y los tabiques.
 */
export function carasDeLaCaja(forma: FormaDeLaBandeja): CaraDeLaBandeja[] {
  const p = planoDeLaBandeja(forma);
  const { pared, tabique, alto, altoDelTabique, bajo, color } = CAJA;
  const { caja } = p;
  const caras: CaraDeLaBandeja[] = [tumbado(p.dados.x0, p.dados.x1, 0, p.dados.z0, p.dados.z1, color.fieltroSinTurno)];
  for (const r of [p.billetes, p.mazos, p.obras]) if (r !== null) caras.push(tumbado(r.x0, r.x1, 0, r.z0, r.z1, color.fondo));
  /* Las cuatro paredes: detrás y delante de lado a lado, los costados entre ellas. */
  caras.push(...prisma(caja.x0, caja.x1, -bajo, alto, caja.z0, caja.z0 + pared, color.canto, color.madera));
  caras.push(...prisma(caja.x0, caja.x1, -bajo, alto, caja.z1 - pared, caja.z1, color.canto, color.madera));
  caras.push(...prisma(caja.x0, caja.x0 + pared, -bajo, alto, caja.z0 + pared, caja.z1 - pared, color.canto, color.madera));
  caras.push(...prisma(caja.x1 - pared, caja.x1, -bajo, alto, caja.z0 + pared, caja.z1 - pared, color.canto, color.madera));
  /* El tabique que separa las dos columnas, y en la completa el que separa las dos filas. */
  const medio = (caja.x0 + caja.x1) / 2;
  caras.push(...prisma(medio - tabique / 2, medio + tabique / 2, 0, altoDelTabique, caja.z0 + pared, caja.z1 - pared, color.canto, color.madera));
  if (p.mazos !== null) caras.push(...prisma(caja.x0 + pared, caja.x1 - pared, 0, altoDelTabique, p.mazos.z1, p.mazos.z1 + tabique, color.canto, color.madera));
  return caras;
}

/**
 * EL COLOR DEL FIELTRO: el del peón de quien tira, tal cual, o el verde de mesa si no tira nadie o
 * lo que llega no es un `#rrggbb`.
 */
export function colorDelFieltro(delTurno: string | null): string {
  if (delTurno === null || !/^#[0-9a-f]{6}$/i.test(delTurno)) return CAJA.color.fieltroSinTurno;
  return delTurno.toLowerCase();
}

/** Lo lejos que están dos `#rrggbb`, en la distancia llana de sus tres canales (de 0 a 441). */
export function distanciaEntreColores(a: string, b: string): number {
  const canal = (hex: string, k: number): number => Number.parseInt(hex.slice(1 + 2 * k, 3 + 2 * k), 16);
  return Math.hypot(canal(a, 0) - canal(b, 0), canal(a, 1) - canal(b, 1), canal(a, 2) - canal(b, 2));
}

/* ─────────────────────────────── El dinero ─────────────────────────────── */

/**
 * LOS BILLETES DEL BURGO: siete valores, de mayor a menor, cada uno de su color y con su tope de
 * billetes en el montón. Los colores son los de siempre en los juegos de tablero —el blanco del 1, el
 * rosa del 5, el amarillo del 10…— y el tope es lo que cabe a la vista: un montón de seis billetes de
 * 500 ya dice «rico», y la placa dice cuánto.
 */
export const BILLETES = [
  { valor: 500, color: '#f0a24a', tope: 6 },
  { valor: 100, color: '#e3c98f', tope: 6 },
  { valor: 50, color: '#86b8e3', tope: 4 },
  { valor: 20, color: '#9fd07a', tope: 5 },
  { valor: 10, color: '#f2dd6b', tope: 4 },
  { valor: 5, color: '#f3b8c9', tope: 4 },
  { valor: 1, color: '#f4f1ea', tope: 5 },
] as const;
/** Lo más que puede haber de billetes a la vista a la vez: la suma de los topes. */
export const BILLETES_A_LA_VISTA = BILLETES.reduce((n, b) => n + b.tope, 0);

/**
 * CUÁNTOS BILLETES DE CADA VALOR SE PINTAN PARA UNA CANTIDAD: de mayor a menor, los que quepan en su
 * tope, y lo que no quepa sigue hacia los menores. Con 1.494 salen 2 de 500, 4 de 100, 1 de 50, 2 de 20
 * y 4 de 1. No es el cambio exacto cuando se llega a los topes —con 9.000 hay seis de 500 y todos los
 * demás llenos—, y no hace falta: la cantidad la dice la placa.
 */
export function billetesDeLaCantidad(cantidad: number): number[] {
  let resto = Math.max(0, Math.floor(cantidad));
  return BILLETES.map((b) => {
    const cuantos = Math.min(b.tope, Math.floor(resto / b.valor));
    resto -= cuantos * b.valor;
    return cuantos;
  });
}

/**
 * UN BILLETE, APAISADO: 15 de ancho, 10 de fondo y medio de grueso, blanco, con su color en un
 * recuadro que deja un marco de 1,2 —el marco blanco es lo que hace que un rectángulo de color se lea
 * como un billete—. Cuatro montones caben en los 76 del compartimento con 1 de aire contra la pared y
 * sin pisarse aun girados y corridos; de 17 × 11, como fueron, se salían y se pisaban
 * (`verify:burgo-escena` lo mide).
 */
export const BILLETE = { ancho: 15, largo: 10, grueso: 0.45, marco: 1.2 } as const;

/**
 * DÓNDE VA CADA BILLETE: dos filas de montones en la mitad de atrás del compartimento —500, 100, 50 y
 * 20 atrás; 10, 5 y 1 delante—, porque la de delante del todo la tapa la pared vista a 30°. En cada
 * montón los billetes apilados con un pequeño giro y un pequeño corrimiento que salen del orden, no del
 * azar: el montón parece dejado a mano y es el mismo en todos los aparatos.
 */
export function sitioDelBillete(forma: FormaDeLaBandeja, valor: number, k: number): { readonly x: number; readonly y: number; readonly z: number; readonly giro: number } {
  const r = planoDeLaBandeja(forma).billetes;
  const i = Math.max(0, BILLETES.findIndex((b) => b.valor === valor));
  const fila = i < 4 ? 0 : 1;
  const enLaFila = fila === 0 ? i : i - 4;
  const deLaFila = fila === 0 ? 4 : 3;
  const paso = (r.x1 - r.x0) / 4;
  const x = (r.x0 + r.x1) / 2 + (enLaFila - (deLaFila - 1) / 2) * paso + ((((i + 1) * (k + 2)) % 5) - 2) * 0.25;
  const z = r.z0 + 4 + BILLETE.largo / 2 + fila * (BILLETE.largo + 3) + ((((i + 3) * (k + 1)) % 5) - 2) * 0.25;
  const giro = (((i * 7 + k * 3) % 9) - 4) * 0.02;
  return { x, y: BILLETE.grueso * (k + 0.5), z, giro };
}

/**
 * LA PLACA DE LATÓN DEL DINERO, atornillada en la cara de delante de la caja, debajo del compartimento del
 * dinero: es la única cara de la caja que ninguna pared tapa desde la silla. La cantidad va de pie sobre
 * ella, en negro.
 */
export const PLACA = { ancho: 52, alto: 9.5, grueso: 0.7, altoDelTexto: 6, color: { laton: '#c09a42', canto: '#8f7430', tinta: '#2a2118' } } as const;
/** Lo que se separa de la cara de latón el renglón de la cantidad, para que no se pelee con ella por el fondo. */
export const ALZA_DEL_RENGLON_DE_LA_PLACA = 0.05;
export function sitioDeLaPlaca(forma: FormaDeLaBandeja): { readonly x: number; readonly y: number; readonly z: number } {
  const p = planoDeLaBandeja(forma);
  return { x: (p.billetes.x0 + p.billetes.x1) / 2, y: (CAJA.alto - CAJA.bajo) / 2, z: p.caja.z1 };
}

/** «1.494 €»: los miles con punto y el euro detrás, como `maravedies` del reglamento. */
export function textoDelDinero(cantidad: number): string {
  const entero = Math.max(0, Math.floor(cantidad));
  return `${String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
}

/* ─────────────────────────────── Los mazos ─────────────────────────────── */

/** Un mazo: cartas de 30 × 21 y 0,55 de grueso; dieciséis hacen 8,8, por debajo de la pared. El emblema va un pelo por encima de la carta de arriba. */
export const MAZO = { ancho: 30, fondo: 21, gruesoDeUnaCarta: 0.55, cartas: 16, ladoDelEmblema: 15, alzaDelEmblema: 0.06 } as const;
export type MazoDeLaBandeja = 'pregon' | 'arca';
export const COLOR_DEL_MAZO: Readonly<Record<MazoDeLaBandeja, { readonly carta: string; readonly canto: string; readonly emblema: string }>> = {
  pregon: { carta: '#c9a227', canto: '#a8861f', emblema: '#f4ecd6' },
  arca: { carta: '#3f9a5a', canto: '#327a47', emblema: '#f4ecd6' },
};

/** Los dos mazos, Suerte a la izquierda y Caja de Comunidad a la derecha, en la completa. */
export function sitiosDeLosMazos(forma: FormaDeLaBandeja): readonly { readonly mazo: MazoDeLaBandeja; readonly x: number; readonly z: number }[] {
  const r = planoDeLaBandeja(forma).mazos;
  if (r === null) return [];
  const c = centroDe(r);
  const aparte = (r.x1 - r.x0) / 4;
  return [
    { mazo: 'pregon', x: c.x - aparte, z: c.z },
    { mazo: 'arca', x: c.x + aparte, z: c.z },
  ];
}

/** Lo alto de un mazo con `cartas` cartas; un mazo vacío deja la marca de una carta. */
export function altoDelMazo(cartas: number): number {
  return MAZO.gruesoDeUnaCarta * Math.max(1, Math.min(MAZO.cartas, Math.floor(cartas)));
}

/* ─────────────────────────────── Las casas y los hoteles del Concejo ─────────────────────────────── */

/** Las del reglamento: treinta y dos casas y doce hoteles. */
export const CASAS_DEL_CONCEJO = 32;
export const HOTELES_DEL_CONCEJO = 12;
/** Una casa: 5,4 de frente, 4 de alto y un tejado de 2,6; un hotel, igual de fondo y el doble de largo. */
export const CASITA = { ancho: 5.4, fondo: 5.4, alto: 4, tejado: 2.6, color: { pared: '#2e8b3f', tejado: '#23702f' } } as const;
export const HOTELITO = { ancho: 9, fondo: 5.4, alto: 5.2, tejado: 2.6, color: { pared: '#b3261e', tejado: '#8e1f18' } } as const;

/**
 * LAS CARAS DE UNA CASITA O UN HOTELITO, en su propio marco: los cuatro muros, las dos aguas del tejado
 * y los dos piñones. Catorce triángulos: no lleva la cara de arriba del muro, que tapa el tejado.
 */
export function carasDeUnEdificio(pieza: typeof CASITA | typeof HOTELITO): CaraDeLaBandeja[] {
  const x = pieza.ancho / 2;
  const z = pieza.fondo / 2;
  const y = pieza.alto;
  const cumbre = y + pieza.tejado;
  const { pared, tejado } = pieza.color;
  const muros = prisma(-x, x, 0, y, -z, z, pared, pared).slice(1);
  return [
    ...muros,
    { color: tejado, puntos: [[x, y, -z], [-x, y, -z], [-x, cumbre, 0], [x, cumbre, 0]] },
    { color: tejado, puntos: [[-x, y, z], [x, y, z], [x, cumbre, 0], [-x, cumbre, 0]] },
    { color: pared, puntos: [[x, y, z], [x, y, -z], [x, cumbre, 0], [x, cumbre, 0]] },
    { color: pared, puntos: [[-x, y, -z], [-x, y, z], [-x, cumbre, 0], [-x, cumbre, 0]] },
  ];
}

/**
 * LOS SITIOS DE LAS CASAS Y DE LOS HOTELES en el compartimento de las obras: tres filas de casas —11,
 * 11 y 10— y una de doce hoteles delante. Se pintan los primeros tantos como le quedan al Concejo, así
 * que se vacían por el final: los hoteles de la derecha y la última fila de casas.
 */
export function sitiosDeLasCasas(forma: FormaDeLaBandeja): readonly Punto[] {
  const r = planoDeLaBandeja(forma).obras;
  if (r === null) return [];
  const salida: Punto[] = [];
  const paso = (r.x1 - r.x0) / 11;
  for (let k = 0; k < CASAS_DEL_CONCEJO; k++) {
    const fila = Math.floor(k / 11);
    const columna = k % 11;
    salida.push({ x: r.x0 + paso * (columna + 0.5), z: r.z0 + 4 + fila * 7.5 });
  }
  return salida;
}
export function sitiosDeLosHoteles(forma: FormaDeLaBandeja): readonly Punto[] {
  const r = planoDeLaBandeja(forma).obras;
  if (r === null) return [];
  const paso = (r.x1 - r.x0) / 7;
  const salida: Punto[] = [];
  for (let k = 0; k < HOTELES_DEL_CONCEJO; k++) {
    const fila = Math.floor(k / 6);
    const columna = k % 6;
    salida.push({ x: r.x0 + paso * (columna + 1), z: r.z1 - 11.5 + fila * 7 });
  }
  return salida;
}

/* ─────────────────────────────── Lo que cuesta ─────────────────────────────── */

/** Los triángulos de una lista de caras: dos por cuadro y uno por triángulo (el cuarto punto repetido). */
export function triangulosDeLasCaras(caras: readonly CaraDeLaBandeja[]): number {
  return caras.reduce((n, c) => {
    const [, , p, q] = c.puntos;
    return n + (p[0] === q[0] && p[1] === q[1] && p[2] === q[2] ? 1 : 2);
  }, 0);
}

/**
 * EL RELOJ DE ARENA DE CONOS de `escenas/reloj.tsx`, contado pieza a pieza con las cuentas de
 * `CylinderGeometry`: dos tapas de doce lados con sus dos caras (48 cada una), tres postes de seis (24),
 * dos vidrios abiertos (12: un cono no tiene la mitad de arriba de sus cuadros), dos montones de arena
 * con su base (24), el hilo de cinco lados (20) y el asa (2). `verify:burgo-escena` lo cuenta llamando
 * a `RelojDeArena` y montando sus geometrías: la primera cuenta, hecha de cabeza, decía 310.
 */
export const TRIANGULOS_DEL_RELOJ_DE_CONOS = 2 * 48 + 3 * 24 + 2 * 12 + 2 * 24 + 20 + 2;
/**
 * Y el de Riberas, `reloj.glb`, contado con `@gltf-transform` NODO A NODO —los cincuenta granos comparten
 * una malla de dos triángulos, y se dibujan cincuenta—, más su asa.
 */
export const TRIANGULOS_DEL_RELOJ_DE_RIBERAS = 20_084 + 2;
/** Lo más largo que escribe la placa: «99.999 €» son siete caracteres con glifo. */
export const LETRAS_DE_LA_PLACA = 7;

/**
 * LO QUE CUESTA LA CAJA DEL BURGO LLENA, sin letras ni reloj: la caja completa, las 32 casas y los 12
 * hoteles, los dos mazos, todos los billetes a la vista —el papel y su recuadro de color—, la placa con
 * su cara de latón y las dos asas, la de los dados y la del reloj. Las letras de la placa, los emblemas
 * y el reloj los suma `presupuesto.ts`, que es quien sabe cuánto pesa una letra.
 */
export function triangulosDeLaCaja(): number {
  const mazo = triangulosDeLasCaras(prisma(0, 1, 0, 1, 0, 1, '#000000'));
  return (
    triangulosDeLasCaras(carasDeLaCaja('completa')) +
    CASAS_DEL_CONCEJO * triangulosDeLasCaras(carasDeUnEdificio(CASITA)) +
    HOTELES_DEL_CONCEJO * triangulosDeLasCaras(carasDeUnEdificio(HOTELITO)) +
    2 * mazo +
    BILLETES_A_LA_VISTA * (mazo + 2) +
    mazo +
    2 +
    TRIANGULOS_DEL_ASA_DE_LOS_DADOS +
    TRIANGULOS_DEL_ASA_DEL_RELOJ
  );
}

/* ─────────────────────────────── Dónde se posa ─────────────────────────────── */

export type EsquinaDeLaBandeja = 'abajo-derecha' | 'arriba-derecha';

export interface SitioDeLaBandeja {
  readonly esquina: EsquinaDeLaBandeja;
  /** Lo que se aparta de los dos bordes de su esquina, en puntos del lienzo. */
  readonly margen: number;
}

/** Donde va si el cliente no dice nada: abajo a la derecha, a 12 puntos. */
export const SITIO_DE_LA_BANDEJA_POR_DEFECTO: SitioDeLaBandeja = { esquina: 'abajo-derecha', margen: 12 };

/**
 * QUÉ FORMA LLEVA LA CAJA EN UN LIENZO: la completa si el lienzo mide al menos 600 × 400 puntos, y la
 * compacta si no. Un móvil en vertical (390 de ancho) lleva la compacta; una tableta o un monitor, la
 * completa.
 */
export function formaDeLaBandeja(ancho: number, alto: number): FormaDeLaBandeja {
  return ancho >= 600 && alto >= 400 ? 'completa' : 'compacta';
}

/**
 * LO QUE MIDE DE ANCHO EN LA PANTALLA, en puntos y proyectada, reloj incluido: la completa, el 30 % del
 * ancho del lienzo entre 330 y 500; la compacta, el 90 % entre 220 y 400. Y nunca más que el lienzo
 * menos sus dos márgenes (`poseDeLaBandeja`).
 */
export const ANCHO_DE_LA_BANDEJA_EN_PUNTOS = {
  completa: { parte: 0.3, minimo: 330, maximo: 500 },
  compacta: { parte: 0.9, minimo: 220, maximo: 400 },
} as const;
export function anchoDeLaBandejaEnPuntos(ancho: number, alto: number): number {
  const medida = ANCHO_DE_LA_BANDEJA_EN_PUNTOS[formaDeLaBandeja(ancho, alto)];
  return Math.min(medida.maximo, Math.max(medida.minimo, Math.round(medida.parte * ancho)));
}

/** Una caja alineada con los ejes de la bandeja, en sus unidades. */
export interface VolumenDeLaBandeja {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly z0: number;
  readonly z1: number;
}

/**
 * LO QUE OCUPA LA COMPOSICIÓN, en tres volúmenes y en unidades de bandeja, que son los que se proyectan
 * para posarla: la caja de nogal con la placa atornillada delante; el aire de los dados, del fieltro a
 * lo más alto de un salto y de lado hasta lo que asoma un dado girado y sacudido; y el cilindro del
 * reloj. Las casas, los mazos y los billetes no asoman de la caja. Van por separado y no en un volumen
 * único porque la esquina de uno que juntara la cima del reloj con la placa no es de nada: proyectada,
 * dejaba sesenta puntos de aire a la derecha del reloj.
 */
export function volumenesDeLaBandeja(forma: FormaDeLaBandeja): readonly VolumenDeLaBandeja[] {
  const p = planoDeLaBandeja(forma);
  const radio = ENVOLVENTE_DEL_RELOJ.radio * p.reloj.lado;
  const dados = centroDe(p.dados);
  const deLado = SEPARACION_DE_LOS_DADOS + MEDIA_DIAGONAL_DEL_DADO + sacudidaMaximaDeLosDados();
  const deFondo = MEDIA_DIAGONAL_DEL_DADO + sacudidaMaximaDeLosDados();
  return [
    { x0: p.caja.x0, x1: p.caja.x1, y0: -CAJA.bajo, y1: CAJA.alto, z0: p.caja.z0, z1: p.caja.z1 + PLACA.grueso + ALZA_DEL_RENGLON_DE_LA_PLACA },
    { x0: dados.x - deLado, x1: dados.x + deLado, y0: 0, y1: ARISTA_DE_LOS_DADOS / 2 + alzaMaximaDeLosDados() + MEDIA_DIAGONAL_DEL_DADO, z0: dados.z - deFondo, z1: dados.z + deFondo },
    { x0: p.reloj.x - radio, x1: p.reloj.x + radio, y0: p.reloj.suelo, y1: p.reloj.suelo + ENVOLVENTE_DEL_RELOJ.alto * p.reloj.lado, z0: p.reloj.z - radio, z1: p.reloj.z + radio },
  ];
}

/** El volumen que abarca los tres. */
export function cajaDeLaBandeja(forma: FormaDeLaBandeja): VolumenDeLaBandeja {
  const v = volumenesDeLaBandeja(forma);
  return {
    x0: Math.min(...v.map((c) => c.x0)),
    x1: Math.max(...v.map((c) => c.x1)),
    y0: Math.min(...v.map((c) => c.y0)),
    y1: Math.max(...v.map((c) => c.y1)),
    z0: Math.min(...v.map((c) => c.z0)),
    z1: Math.max(...v.map((c) => c.z1)),
  };
}

/**
 * EL ASA DE LOS DADOS: una caja invisible sobre el compartimento de los dados, del fondo hasta lo más
 * alto de un dado en el aire. Sólo ese compartimento tira: el reloj tiene su propia asa, y tocar el
 * dinero o las casas no es tirar.
 */
export function cajaDelAsaDeLosDados(forma: FormaDeLaBandeja): { readonly x: number; readonly z: number; readonly ancho: number; readonly alto: number; readonly fondo: number; readonly y: number } {
  const r = planoDeLaBandeja(forma).dados;
  const alto = ARISTA_DE_LOS_DADOS / 2 + alzaMaximaDeLosDados() + MEDIA_DIAGONAL_DEL_DADO;
  return { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, ancho: r.x1 - r.x0, alto, fondo: r.z1 - r.z0, y: alto / 2 };
}
/** Una caja: doce triángulos. */
export const TRIANGULOS_DEL_ASA_DE_LOS_DADOS = 12;

/** El ancho del asa que se le da a `RelojDeArena`, en lados: la de su plano y la de la caja de aquí abajo. */
export const ASA_DEL_RELOJ_DE_ARENA = { ancho: 0.7 } as const;
export const TRIANGULOS_DEL_ASA_DEL_RELOJ = 12;

/**
 * EL ASA DEL RELOJ: una caja invisible alrededor del reloj de arena, tan ancha como el asa del propio
 * `RelojDeArena` —siete décimas de su lado— y alta como para cubrirla con cualquiera de los dos relojes
 * puestos. Pasar el turno es TOCARLA, apretar y soltar sin arrastrar, como los dados: la de Riberas pasa
 * al apretar, pero la caja del Burgo está encima del tablero, y quien empieza a girar la cámara desde el
 * reloj no puede perder el turno por eso. Como el asa de `RelojDeArena` queda dentro de ésta, cualquier
 * rayo que llegue a aquélla pasa antes por ésta.
 */
export function cajaDelAsaDelReloj(forma: FormaDeLaBandeja): { readonly x: number; readonly z: number; readonly ancho: number; readonly alto: number; readonly fondo: number; readonly y: number } {
  const r = planoDeLaBandeja(forma).reloj;
  const lado = ASA_DEL_RELOJ_DE_ARENA.ancho * r.lado;
  const y0 = Math.min(r.cinturaDeLosConos, r.centroDelModelo) - r.lado / 2;
  const y1 = Math.max(r.cinturaDeLosConos, r.centroDelModelo) + r.lado / 2;
  return { x: r.x, z: r.z, ancho: lado, alto: y1 - y0, fondo: lado, y: (y0 + y1) / 2 };
}

export interface RectanguloEnPuntos {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface PoseDeLaBandeja {
  readonly forma: FormaDeLaBandeja;
  /** El centro de la caja, en coordenadas de la CÁMARA: `z` negativo es delante del ojo. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** El giro alrededor del eje `x` de la cámara, en radianes: el que deja el suelo de la caja a `CAJA.inclinacion` del rayo del ojo. */
  readonly cabeceo: number;
  /** Unidades del mundo por unidad de bandeja. */
  readonly escala: number;
  /** Lo que ocupa en el lienzo la composición con los dados en lo más alto, en puntos desde arriba a la izquierda. */
  readonly rectangulo: RectanguloEnPuntos;
  /** La arista de un dado quieto, proyectada, en puntos. */
  readonly aristaEnPuntos: number;
}

/**
 * EL CABECEO QUE DEJA EL SUELO DE LA CAJA A `CAJA.inclinacion` DEL RAYO DEL OJO, con la caja en
 * `centro` (coordenadas de cámara). El suelo, girado `α` sobre el eje `x`, tiene la normal
 * `(0, cos α, sin α)`; el rayo de la caja al ojo es `−centro / |centro|`; y el ángulo entre el rayo y
 * el suelo es el arcoseno de su producto, `(d·sin α − y·cos α) / |centro|` con `d = −z`. Igualado a la
 * inclinación: `α = atan2(y, d) + asin(|centro|·sin θ / √(y² + d²))`. En el centro del lienzo es la
 * inclinación tal cual; abajo, menos, porque el rayo ya baja; arriba, más.
 *
 * Sólo cabecea, y no se vuelve de lado hacia el ojo: probado en el banco, girada también sobre la
 * vertical, en la esquina de abajo a la derecha los cantos de la caja dejaban de ir horizontales —su
 * lado derecho se acercaba al ojo y, por debajo del centro del lienzo, se veía más bajo— y la caja
 * parecía torcida. Sin ese giro, sus cantos de delante y de detrás siguen paralelos a la pantalla.
 */
export function cabeceoHaciaElOjo(centro: { readonly x: number; readonly y: number; readonly z: number }): number {
  const d = -centro.z;
  const enElPlano = Math.hypot(centro.y, d);
  if (!(enElPlano > 0)) return CAJA.inclinacion;
  const seno = Math.min(1, (Math.hypot(centro.x, centro.y, d) * Math.sin(CAJA.inclinacion)) / enElPlano);
  return Math.atan2(centro.y, d) + Math.asin(seno);
}

/** Un punto de la bandeja llevado a la cámara: escalado, cabeceado y trasladado. */
export function puntoDeLaBandejaEnLaCamara(p: readonly [number, number, number], centro: { readonly x: number; readonly y: number; readonly z: number }, escala: number, cabeceo: number): [number, number, number] {
  const [x, y, z] = p;
  const c = Math.cos(cabeceo);
  const s = Math.sin(cabeceo);
  return [centro.x + escala * x, centro.y + escala * (y * c - z * s), centro.z + escala * (y * s + z * c)];
}

/** Y de la cámara al lienzo, en puntos desde arriba a la izquierda. `null` si queda detrás del ojo. */
export function puntoDeLaCamaraEnElLienzo(q: readonly [number, number, number], ancho: number, alto: number, campoEnGrados: number): { readonly x: number; readonly y: number } | null {
  const [x, y, z] = q;
  if (z >= 0) return null;
  const focal = alto / 2 / Math.tan((campoEnGrados * Math.PI) / 360);
  return { x: ancho / 2 + (focal * x) / -z, y: alto / 2 - (focal * y) / -z };
}

/** Lo que ocupan en el lienzo los volúmenes de la composición con esa pose; cuatro `NaN` si algo queda detrás del ojo. */
export function rectanguloDeLaBandeja(
  forma: FormaDeLaBandeja,
  centro: { readonly x: number; readonly y: number; readonly z: number },
  escala: number,
  cabeceo: number,
  ancho: number,
  alto: number,
  campoEnGrados: number,
): RectanguloEnPuntos {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of volumenesDeLaBandeja(forma)) {
    for (const x of [c.x0, c.x1]) {
      for (const y of [c.y0, c.y1]) {
        for (const z of [c.z0, c.z1]) {
          const q = puntoDeLaCamaraEnElLienzo(puntoDeLaBandejaEnLaCamara([x, y, z], centro, escala, cabeceo), ancho, alto, campoEnGrados);
          if (q === null) return { x0: NaN, y0: NaN, x1: NaN, y1: NaN };
          x0 = Math.min(x0, q.x);
          y0 = Math.min(y0, q.y);
          x1 = Math.max(x1, q.x);
          y1 = Math.max(y1, q.y);
        }
      }
    }
  }
  return { x0, y0, x1, y1 };
}

/** Cuántas veces se ajustan la escala, el cabeceo y el sitio. Con doce, lo que falta queda muy por debajo de una centésima de punto. */
const PASADAS_DE_LA_POSE = 12;

/**
 * LA POSE DE LA CAJA para un lienzo de `ancho × alto` puntos y una cámara de `campoEnGrados` de campo
 * vertical —EN GRADOS, que es como lo lleva `CAMPO_DE_LA_CAMARA` y el `fov` de `three`—.
 *
 * El ancho pedido (`anchoDeLaBandejaEnPuntos`, y nunca más que el lienzo menos sus dos márgenes) es el
 * de la composición PROYECTADA. En cada pasada se cabecea la caja hacia el ojo desde donde está, se
 * proyecta, se corrige la escala por lo que sobra o falta de ancho, y se corre el centro lo que le falta
 * al canto de su esquina para quedar a `margen`, convertido a unidades de cámara a esa distancia.
 */
export function poseDeLaBandeja(ancho: number, alto: number, campoEnGrados: number, sitio: SitioDeLaBandeja = SITIO_DE_LA_BANDEJA_POR_DEFECTO): PoseDeLaBandeja {
  const forma = formaDeLaBandeja(ancho, alto);
  const d = CAJA.distancia;
  const focal = alto / 2 / Math.tan((campoEnGrados * Math.PI) / 360);
  const porPunto = d / focal;
  const caja = cajaDeLaBandeja(forma);
  const pedido = Math.max(1, Math.min(ancho - 2 * sitio.margen, anchoDeLaBandejaEnPuntos(ancho, alto)));
  let escala = (pedido * porPunto) / (caja.x1 - caja.x0);
  const centro = { x: 0, y: 0, z: -d };
  for (let pasada = 0; pasada < PASADAS_DE_LA_POSE; pasada++) {
    const cabeceo = cabeceoHaciaElOjo(centro);
    const medido = rectanguloDeLaBandeja(forma, centro, escala, cabeceo, ancho, alto, campoEnGrados);
    if (!(medido.x1 - medido.x0 > 0)) break;
    escala *= pedido / (medido.x1 - medido.x0);
    const r = rectanguloDeLaBandeja(forma, centro, escala, cabeceo, ancho, alto, campoEnGrados);
    const faltaX = ancho - sitio.margen - r.x1;
    const faltaY = sitio.esquina === 'abajo-derecha' ? alto - sitio.margen - r.y1 : sitio.margen - r.y0;
    centro.x += faltaX * porPunto;
    centro.y -= faltaY * porPunto;
  }
  const cabeceo = cabeceoHaciaElOjo(centro);
  const rectangulo = rectanguloDeLaBandeja(forma, centro, escala, cabeceo, ancho, alto, campoEnGrados);
  const aristaEnPuntos = (escala * ARISTA_DE_LOS_DADOS) / porPunto;
  return { forma, x: centro.x, y: centro.y, z: centro.z, cabeceo, escala, rectangulo, aristaEnPuntos };
}
