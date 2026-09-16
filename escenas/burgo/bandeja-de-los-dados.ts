/**
 * LA BANDEJA DE LOS DADOS: los dados se van del tablero a la pantalla.
 *
 * Miguel, mirando una partida: «quiero que los dados no se muestren encima del tablero en frente
 * de la estación de tren, quiero que se muestren en la pantalla del usuario como lo hacen en
 * riberas para que el usuario pueda ver siempre el resultado sin tener que estar mirando en el
 * mapa la ubicación donde están». Y dejó la forma abierta: una mesa como la de Riberas, «o algo
 * menos grande y temático» que enseñara los dados y de quién es el turno.
 *
 * ═══ UNA BANDEJA, Y NO UNA MESA ═══
 *
 * La mesa de Riberas es ancha porque es también la BARRA de construir: lleva encima las piezas,
 * el mazo y el reloj de arena. En el Burgo no hay nada de eso que poner —las casas se compran con
 * botones—, y una mesa de lado a lado taparía el pie de la pantalla, que en el móvil ya es del
 * carril, de la cinta y de la caja de los tratos. Lo que hace falta cabe en una esquina: una
 * bandeja de juego de mesa con los dos dados dentro y el FIELTRO DEL COLOR DE QUIEN TIENE EL
 * TURNO, que es el tapete del turno de Riberas hecho bandeja. Quién es y cuánto tiene lo siguen
 * diciendo la cinta y el marcador; la bandeja dice de quién es la tirada sin leer nada.
 *
 * ═══ CÓMO SE PEGA A LA PANTALLA ═══
 *
 * Como la mesa de Riberas: un grupo copia la posición y el giro de la cámara en cada fotograma, y
 * dentro va la bandeja en coordenadas de CÁMARA, a `distancia` del ojo. El plano cercano de los
 * tres lienzos está a 0,5 y el ojo no baja de 12 sobre el suelo, así que el mundo no llega a
 * meterse entre el ojo y la bandeja. Se copia DESPUÉS de que la escena mueva la cámara para seguir
 * al que mueve —justo cuando los dados acaban de rodar—: copiada antes, la bandeja iría un
 * fotograma por detrás de la cámara y temblaría mientras la cámara corre.
 *
 * Y se mira como una mesa desde una silla: inclinada `inclinacion` hacia el ojo, que es la misma
 * altura con la que la cámara del juego mira el tablero. Con la cámara en su sitio, el fieltro
 * queda horizontal EN EL MUNDO y la luz del sol le da como al tablero.
 *
 * ═══ LAS UNIDADES DE LA BANDEJA SON LAS DEL PAÑO QUE HUBO ═══
 *
 * Los dados siguen midiendo 20, como en el paño de 48 que tenían delante de la Estación de Goya; y
 * el salto, el rebote y la sacudida siguen contándose en aristas. Así la máquina de los dados
 * (`dados-del-burgo.ts`) y sus alturas no cambian: lo que cambia es que la bandeja entera se ESCALA
 * a lo que tiene que medir en la pantalla.
 *
 * ═══ DÓNDE SE POSA LO DECIDE EL CLIENTE ═══
 *
 * La escena no sabe qué hay encima de su lienzo; lo sabe quien la monta. El escritorio la posa
 * ABAJO A LA DERECHA —arriba tiene la cinta, el carril y «Ver el burgo entero»— y acorta el cartel
 * del pie para dejarle el hueco; la app, ARRIBA A LA DERECHA, porque abajo flota el pie.
 *
 * ═══ EL SITIO SE MIDE CON LOS DADOS EN EL AIRE ═══
 *
 * Lo que se pega a la esquina es la caja de la bandeja con los dados en lo más alto de un salto y
 * girados por la diagonal, no la bandeja quieta: arriba a la derecha, medida quieta, un dado que
 * salta se saldría del lienzo por arriba. Y se mide proyectando las ocho esquinas de esa caja con
 * la perspectiva de verdad, porque la bandeja inclinada tiene el canto de delante más cerca del ojo
 * que el de detrás y no se ve como un rectángulo plano.
 *
 * Sin `three` y sin React: `Burgo.tsx` la monta, `presupuesto.ts` la cuenta y `verify:burgo-escena`
 * la mide en las tres ventanas.
 */
import { REBOTE_DEL_DADO, SACUDIDA, SALTO_DEL_DADO } from '../dados';
import { ALTURA_DEL_SALTO_DEL_DOBLE } from './dados-del-burgo';
import type { Punto } from './anillo-en-3d';

/* ─────────────────────────────── Los dados, en unidades de bandeja ─────────────────────────────── */

/** La arista de un dado. La de siempre: la bandeja entera se escala, los dados no cambian. */
export const ARISTA_DE_LOS_DADOS = 20;
/**
 * LOS DOS HUECOS, A ±16 DEL CENTRO DEL FIELTRO, y no a ±12 como en el paño.
 *
 * Un dado se asienta con la cara pedida arriba y GIRADO sobre la vertical lo que diga su sello
 * (`giroDelDadoAsentado`, el ángulo áureo), así que puede quedar a 45°: entonces ocupa media diagonal
 * de su cara, 14,14, y no media arista. A ±12 dos dados así se metían uno dentro del otro, y en el
 * paño del campo no se veía porque estaban lejos; en la bandeja, de cerca, sí. A ±16 quedan 32 entre
 * centros, más que los 28,28 de dos dados a 45° y lo que tiemblan.
 */
export const HUECOS_DE_LOS_DADOS: readonly Punto[] = [
  { x: -16, z: 0 },
  { x: 16, z: 0 },
];

/**
 * CUÁNTAS ARISTAS SE MUEVE UN DADO EN CADA GESTO. Son los números por los que la escena multiplica
 * las curvas de `dados.ts` —el salto al rodar, el rebote al asentarse, el salto del doble y la
 * sacudida del «te toca»—, y están aquí y no escritos en `Burgo.tsx` porque la caja con la que se
 * posa la bandeja tiene que saber hasta dónde suben: dos copias de estos números acabarían con un
 * dado que salta más de lo que la bandeja reservó.
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

/* ─────────────────────────────── La bandeja ─────────────────────────────── */

/**
 * LA BANDEJA: un fieltro de 68 × 34 con un borde de 3 de grueso que sube 5 por encima y baja 2 por
 * debajo, para que el canto de delante se vea con cuerpo.
 *
 * El fieltro deja casi 3 de aire a cada lado de los dados quietos aun girados a 45° y temblando
 * (llegan a ±31,3) y casi 3 por delante y por detrás (±14,1). Es del color EXACTO del peón de quien
 * tiene el turno, que es lo que se reconoce sin leer, y verde de mesa de juego cuando no le toca a
 * nadie.
 *
 * ═══ EL BORDE ES DE NOGAL, Y NO CREMA, POR DOS DE LOS SEIS COLORES ═══
 *
 * La primera bandeja llevaba el borde crema del blanco del tablero y el fieltro oscurecido un 35 %.
 * En el banco el fieltro del primer asiento salió del mismo tostado que el borde: su color es
 * `#f2e8cf`, casi el crema del borde, y del segundo —`#26262e`— el oscurecido no se distingue de una
 * sombra. Con seis colores que van del casi negro al casi blanco, el borde tiene que ir en MEDIO: un
 * nogal de luminancia 0,20, que contrasta 3,4 y 3,7 a 1 con los dos extremos, y con el morado —que
 * tiene casi su misma luz— se separa por el tono. `verify:burgo-escena` mide que ningún fieltro
 * posible quede cerca del borde.
 */
export const BANDEJA = {
  fieltro: { ancho: 68, fondo: 34 },
  borde: { grueso: 3, alto: 5, bajo: 2 },
  /** Con la que se mira: la altura de `MIRADOR_DEL_BURGO`, 55°. */
  inclinacion: (55 * Math.PI) / 180,
  /** Del ojo al centro de la bandeja, en unidades del mundo. */
  distancia: 2,
  color: { borde: '#9a7654', fieltroSinTurno: '#2f5d47' },
} as const;

/** El ancho de fuera a fuera, borde incluido. */
export const ANCHO_DE_LA_BANDEJA = BANDEJA.fieltro.ancho + 2 * BANDEJA.borde.grueso;
/** Y el fondo. */
export const FONDO_DE_LA_BANDEJA = BANDEJA.fieltro.fondo + 2 * BANDEJA.borde.grueso;

/**
 * LA CAJA QUE OCUPA, EN UNIDADES DE BANDEJA, con el origen en el centro del fieltro: de lado, el
 * borde (un dado dando vueltas y temblando no pasa de 34,5); de alto, desde el canto de abajo hasta la
 * cara más alta de un dado en lo alto de su salto y girado por la diagonal; de fondo, el borde.
 */
export function cajaDeLaBandeja(): { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number; readonly z0: number; readonly z1: number } {
  const arriba = Math.max(BANDEJA.borde.alto, ARISTA_DE_LOS_DADOS / 2 + alzaMaximaDeLosDados() + MEDIA_DIAGONAL_DEL_DADO);
  return { x0: -ANCHO_DE_LA_BANDEJA / 2, x1: ANCHO_DE_LA_BANDEJA / 2, y0: -BANDEJA.borde.bajo, y1: arriba, z0: -FONDO_DE_LA_BANDEJA / 2, z1: FONDO_DE_LA_BANDEJA / 2 };
}

export type PapelDeLaBandeja = 'fieltro' | 'borde';

export interface CuadroDeLaBandeja {
  readonly papel: PapelDeLaBandeja;
  readonly puntos: readonly (readonly [number, number, number])[];
  readonly normal: readonly [number, number, number];
}

/**
 * LOS CUADROS DE LA BANDEJA, en unidades de bandeja: el fieltro, la corona de arriba del borde, las
 * cuatro paredes de dentro y las cuatro de fuera. Trece cuadros, veintiséis triángulos. No hay cara
 * de abajo: la bandeja se mira siempre desde arriba.
 *
 * Como `suelosDelAnillo`: aquí se dice dónde va cada cuadro y hacia dónde mira, y `Burgo.tsx` le da
 * color y lo enhebra derivando el sentido de giro de la normal. El fieltro va el PRIMERO, para que
 * sus seis vértices sean los seis primeros y el color del turno se reescriba sin buscarlos.
 */
export function cuadrosDeLaBandeja(): CuadroDeLaBandeja[] {
  const f = { x: BANDEJA.fieltro.ancho / 2, z: BANDEJA.fieltro.fondo / 2 };
  const b = { x: ANCHO_DE_LA_BANDEJA / 2, z: FONDO_DE_LA_BANDEJA / 2 };
  const alto = BANDEJA.borde.alto;
  const bajo = -BANDEJA.borde.bajo;
  const tumbado = (papel: PapelDeLaBandeja, y: number, x0: number, x1: number, z0: number, z1: number): CuadroDeLaBandeja => ({
    papel,
    puntos: [
      [x0, y, z0],
      [x0, y, z1],
      [x1, y, z1],
      [x1, y, z0],
    ],
    normal: [0, 1, 0],
  });
  const aLoAncho = (z: number, x0: number, x1: number, y0: number, y1: number, haciaZ: 1 | -1): CuadroDeLaBandeja => ({
    papel: 'borde',
    puntos: [
      [x0, y0, z],
      [x1, y0, z],
      [x1, y1, z],
      [x0, y1, z],
    ],
    normal: [0, 0, haciaZ],
  });
  const aLoHondo = (x: number, z0: number, z1: number, y0: number, y1: number, haciaX: 1 | -1): CuadroDeLaBandeja => ({
    papel: 'borde',
    puntos: [
      [x, y0, z0],
      [x, y0, z1],
      [x, y1, z1],
      [x, y1, z0],
    ],
    normal: [haciaX, 0, 0],
  });
  return [
    tumbado('fieltro', 0, -f.x, f.x, -f.z, f.z),
    /* La corona del borde: detrás, delante, izquierda y derecha. */
    tumbado('borde', alto, -b.x, b.x, -b.z, -f.z),
    tumbado('borde', alto, -b.x, b.x, f.z, b.z),
    tumbado('borde', alto, -b.x, -f.x, -f.z, f.z),
    tumbado('borde', alto, f.x, b.x, -f.z, f.z),
    /* Las paredes de dentro, mirando al fieltro. */
    aLoAncho(-f.z, -f.x, f.x, 0, alto, 1),
    aLoAncho(f.z, -f.x, f.x, 0, alto, -1),
    aLoHondo(-f.x, -f.z, f.z, 0, alto, 1),
    aLoHondo(f.x, -f.z, f.z, 0, alto, -1),
    /* Y las de fuera, mirando afuera. */
    aLoAncho(b.z, -b.x, b.x, bajo, alto, 1),
    aLoAncho(-b.z, -b.x, b.x, bajo, alto, -1),
    aLoHondo(-b.x, -b.z, b.z, bajo, alto, -1),
    aLoHondo(b.x, -b.z, b.z, bajo, alto, 1),
  ];
}

/** Los triángulos que pinta la bandeja: dos por cuadro. */
export function triangulosDeLaBandeja(): number {
  return cuadrosDeLaBandeja().length * 2;
}

/**
 * EL ASA: una caja invisible que cubre la bandeja y el aire donde saltan los dados, para que el
 * toque caiga en cualquier punto de lo que se ve y no sólo sobre un dado de treinta puntos.
 */
export function cajaDelAsaDeLosDados(): { readonly ancho: number; readonly alto: number; readonly fondo: number; readonly y: number } {
  const c = cajaDeLaBandeja();
  return { ancho: c.x1 - c.x0, alto: c.y1 - c.y0, fondo: c.z1 - c.z0, y: (c.y0 + c.y1) / 2 };
}
/** Una caja: doce triángulos. */
export const TRIANGULOS_DEL_ASA_DE_LOS_DADOS = 12;

/**
 * EL COLOR DEL FIELTRO: el del peón de quien tira, tal cual, o el verde de mesa si no tira nadie o
 * lo que llega no es un `#rrggbb`.
 */
export function colorDelFieltro(delTurno: string | null): string {
  if (delTurno === null || !/^#[0-9a-f]{6}$/i.test(delTurno)) return BANDEJA.color.fieltroSinTurno;
  return delTurno.toLowerCase();
}

/** Lo lejos que están dos `#rrggbb`, en la distancia llana de sus tres canales (de 0 a 441). */
export function distanciaEntreColores(a: string, b: string): number {
  const canal = (hex: string, k: number): number => Number.parseInt(hex.slice(1 + 2 * k, 3 + 2 * k), 16);
  return Math.hypot(canal(a, 0) - canal(b, 0), canal(a, 1) - canal(b, 1), canal(a, 2) - canal(b, 2));
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
 * LO QUE MIDE DE ANCHO EN LA PANTALLA, en puntos: el 18 % del lado corto del lienzo, entre 108 y
 * 160. Con 108 —un móvil de 390— cada dado quieto mide 32,7 puntos y sus puntos se cuentan de un
 * vistazo; con 160 —un monitor— la bandeja no pasa de ser un objeto de la esquina. Lo exporta
 * para el escritorio, que con este número acorta el cartel del pie.
 */
export const ANCHO_DE_LA_BANDEJA_EN_PUNTOS = { parte: 0.18, minimo: 108, maximo: 160 } as const;
export function anchoDeLaBandejaEnPuntos(ancho: number, alto: number): number {
  const pedido = Math.round(ANCHO_DE_LA_BANDEJA_EN_PUNTOS.parte * Math.min(ancho, alto));
  return Math.min(ANCHO_DE_LA_BANDEJA_EN_PUNTOS.maximo, Math.max(ANCHO_DE_LA_BANDEJA_EN_PUNTOS.minimo, pedido));
}

export interface RectanguloEnPuntos {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface PoseDeLaBandeja {
  /** El centro del fieltro, en coordenadas de la CÁMARA: `z` negativo es delante del ojo. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** El giro alrededor del eje `x` de la cámara, en radianes. */
  readonly inclinacion: number;
  /** Unidades del mundo por unidad de bandeja. */
  readonly escala: number;
  /** Lo que ocupa en el lienzo la caja de la bandeja con los dados en lo más alto, en puntos desde arriba a la izquierda. */
  readonly rectangulo: RectanguloEnPuntos;
  /** La arista de un dado quieto, proyectada, en puntos. */
  readonly aristaEnPuntos: number;
}

/** Un punto de la bandeja llevado a la cámara: girado por la inclinación, escalado y trasladado. */
export function puntoDeLaBandejaEnLaCamara(p: readonly [number, number, number], centro: { readonly x: number; readonly y: number; readonly z: number }, escala: number, inclinacion: number): [number, number, number] {
  const c = Math.cos(inclinacion);
  const s = Math.sin(inclinacion);
  const [x, y, z] = p;
  return [centro.x + escala * x, centro.y + escala * (y * c - z * s), centro.z + escala * (y * s + z * c)];
}

/** Y de la cámara al lienzo, en puntos desde arriba a la izquierda. `null` si queda detrás del ojo. */
export function puntoDeLaCamaraEnElLienzo(q: readonly [number, number, number], ancho: number, alto: number, campoEnGrados: number): { readonly x: number; readonly y: number } | null {
  const [x, y, z] = q;
  if (z >= 0) return null;
  const focal = alto / 2 / Math.tan((campoEnGrados * Math.PI) / 360);
  return { x: ancho / 2 + (focal * x) / -z, y: alto / 2 - (focal * y) / -z };
}

function rectanguloDe(centro: { readonly x: number; readonly y: number; readonly z: number }, escala: number, ancho: number, alto: number, campoEnGrados: number): RectanguloEnPuntos {
  const c = cajaDeLaBandeja();
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const x of [c.x0, c.x1]) {
    for (const y of [c.y0, c.y1]) {
      for (const z of [c.z0, c.z1]) {
        const q = puntoDeLaCamaraEnElLienzo(puntoDeLaBandejaEnLaCamara([x, y, z], centro, escala, BANDEJA.inclinacion), ancho, alto, campoEnGrados);
        if (q === null) return { x0: NaN, y0: NaN, x1: NaN, y1: NaN };
        x0 = Math.min(x0, q.x);
        y0 = Math.min(y0, q.y);
        x1 = Math.max(x1, q.x);
        y1 = Math.max(y1, q.y);
      }
    }
  }
  return { x0, y0, x1, y1 };
}

/**
 * LA POSE DE LA BANDEJA para un lienzo de `ancho × alto` puntos y una cámara de `campoEnGrados` de
 * campo vertical —EN GRADOS, que es como lo lleva `CAMPO_DE_LA_CAMARA` y el `fov` de `three`—.
 *
 * La escala sale del ancho pedido en puntos a la distancia del centro. El sitio se ajusta en seis
 * pasadas: se proyecta la caja entera, se mide cuánto le falta al canto de su esquina para quedar
 * a `margen` y se corre eso, convertido a unidades de cámara a esa distancia. Con la perspectiva de
 * una bandeja de 0,3 unidades a 2 del ojo, a la tercera pasada el error ya es de centésimas de
 * punto.
 */
export function poseDeLaBandeja(ancho: number, alto: number, campoEnGrados: number, sitio: SitioDeLaBandeja = SITIO_DE_LA_BANDEJA_POR_DEFECTO): PoseDeLaBandeja {
  const d = BANDEJA.distancia;
  const focal = alto / 2 / Math.tan((campoEnGrados * Math.PI) / 360);
  const porPunto = d / focal;
  const escala = (anchoDeLaBandejaEnPuntos(ancho, alto) * porPunto) / ANCHO_DE_LA_BANDEJA;
  const centro = { x: 0, y: 0, z: -d };
  for (let pasada = 0; pasada < 6; pasada++) {
    const r = rectanguloDe(centro, escala, ancho, alto, campoEnGrados);
    const faltaX = ancho - sitio.margen - r.x1;
    const faltaY = sitio.esquina === 'abajo-derecha' ? alto - sitio.margen - r.y1 : sitio.margen - r.y0;
    centro.x += faltaX * porPunto;
    centro.y -= faltaY * porPunto;
  }
  const rectangulo = rectanguloDe(centro, escala, ancho, alto, campoEnGrados);
  const aristaEnPuntos = (escala * ARISTA_DE_LOS_DADOS) / porPunto;
  return { x: centro.x, y: centro.y, z: centro.z, inclinacion: BANDEJA.inclinacion, escala, rectangulo, aristaEnPuntos };
}
