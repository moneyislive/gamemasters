/**
 * EL ANILLO DEL BURGO EN UNIDADES DEL MUNDO: dónde cae cada casilla, cada banda, cada
 * hueco, cada pieza del decorado. Sin `three`.
 *
 * ═══ QUÉ HACE ESTE FICHERO Y QUÉ NO ═══
 *
 * Aquí está toda la geometría del tablero escrita con sumas y productos, y devuelta como
 * LISTAS DE PUESTAS —`{ pieza, x, y, z, giro, talla }`— para que `Burgo.tsx` sólo tenga
 * que instanciar. `Burgo.tsx` no calcula un solo sitio: si una pieza está mal puesta, el
 * fallo está aquí y `verify:burgo-escena` lo mide en Node contra el `.glb` real, sin abrir
 * un contexto de dibujo. La topología (qué casilla sigue a cuál, el sentido de la marcha,
 * el centro de cada casilla) viene de `shared/mecanicas/anillo.ts`, que también la lee el
 * reductor: el aventurero anda por donde el reglamento cuenta.
 *
 * ═══ LAS MEDIDAS (decisión 10) ═══
 *
 *     ANCHO_DE_CASILLA = 8    FONDO_DE_CASILLA = 14    LADO_DE_ESQUINA = 14    CASILLAS_POR_LADO = 11
 *     LADO_EXTERIOR = 9·8 + 2·14 = 100        MEDIO_LADO = 50
 *     LADO_INTERIOR = 100 − 2·14 = 72         (la ciudad interior mide 72 × 72)
 *
 * Tres bandas por casilla lateral, desde el centro del tablero hacia fuera: la ACERA de
 * color del barrio (5,5; `y = 0,15`; ahí se alzan las casas, 2 × 2 de 5,1 a escala 1), la
 * CALLE (3,5; los peones en 3 × 2 y el aventurero; su línea media está a 43,25 del centro)
 * y el SOLAR (5; el edificio, mirando hacia dentro, que puede desbordar hacia FUERA hasta
 * 4 porque fuera no hay vecino). La esquina es un cuadrado de 14 × 14 sin bandas; el
 * punto de paso de la marcha es (±43,25, ±43,25).
 *
 * ═══ LA ORIENTACIÓN, Y POR QUÉ ÉSTA ═══
 *
 * Con la cámara de salida mirando desde +Z (el lado sur es el más cercano): la Puerta
 * Mayor (0) es la esquina SURESTE (+43,25, +43,25); la marcha va hacia el OESTE por el lado
 * sur (1–9: `x = 36 − 8k + 4`, `z = +43,25`), la Mazmorra (10) en la suroeste, sube por el
 * oeste (11–19: `x = −43,25`, `z = 36 − 8k + 4`), la Feria (20) en la noroeste, cruza el
 * norte (21–29: `x = −36 + 8k − 4`, `z = −43,25`), ¡A la Mazmorra! (30) en la noreste y
 * baja por el este (31–39: `x = +43,25`, `z = −36 + 8k − 4`). Es el sentido de las agujas
 * del reloj visto desde arriba, el del género, y coincide con «la puerta más cercana» de
 * las cartas. Es EXACTAMENTE lo que `sitioDeCasilla` de `anillo.ts` devuelve (su
 * cabecera lo llama «contrario a las agujas» mirando con +z hacia quien mira; es la misma
 * vuelta vista desde el otro lado del papel), y aquí sólo se le suma el cuarto de unidad
 * que separa el centro de la casilla (43) de la línea media de la calle (43,25).
 *
 * El porqué: el reglamento pone en las casillas 1–9 —el lado más cercano a la cámara de
 * salida— los edificios más bajos (caserón, tonel, verja) y en el este y el norte los altos
 * (torre-b 13,6; iglesia 9; el ayuntamiento), así que ninguno tapa la calle desde el
 * punto de vista de salida.
 *
 * ═══ EL MARCO DE UNA CASILLA: `fuera` Y `adelante` ═══
 *
 * Cada casilla tiene dos vectores unitarios: `fuera` (del centro del tablero hacia el
 * campo) y `adelante` (el sentido de la marcha). Con ellos cualquier punto de la casilla
 * es `centroDeLaCalle + fuera · (radial − 43,25) + adelante · aLoLargo`, y un edificio
 * «que mira hacia dentro» es el que tiene su +Z local apuntando a `−fuera`. Las cuatro
 * rotaciones de cuarto son la tabla `(x, z) → (−z, x)` aplicada `lado` veces; el giro en
 * radianes es `cuartos · π/2` (el `rotation.y` de three), tal como lo cuenta `anillo.ts`.
 *
 * En una ESQUINA el marco es el mismo pero el origen es el punto de paso, y los puntos se
 * dan como (u, v): `u` a lo largo de `fuera` y `v` a lo largo de `−adelante`, los dos como
 * distancias absolutas al centro del tablero (36..50). La marcha entra por `v = 43,25`
 * (u de 36 a 43,25) y sale por `u = 43,25` (v de 43,25 a 36): esa ELE, engordada un peón,
 * es lo que las piezas de esquina no pueden pisar, y `verify:burgo-escena` lo mide.
 *
 * ═══ LOS SOLARES SON UNA TABLA, Y CADA UNO PUEDE SER VARIAS PIEZAS ═══
 *
 * `EDIFICIO_DE_LA_CASILLA` da, por casilla lateral, la LISTA de piezas con su giro en
 * cuartos (sobre «mirando hacia dentro»), su desplazamiento `[aLoLargo, radial]` respecto
 * del centro de su banda y su alza en `y`. La parte 2 del diseño la escribe como un
 * registro de una pieza; aquí es una lista porque el corral de los cabreros son dos
 * verjas y dos almiares, y una tabla que no pudiera decirlo obligaría a inventar piezas
 * compuestas en el `.glb`. Los desplazamientos están elegidos con las cajas MEDIDAS del
 * fichero (`verify:burgo-modelos` las imprime) para que cada solar quepa en 7,6 de frente
 * y en la banda del solar más los 4 de desbordamiento; el comprobador vuelve a medirlo con
 * el fichero real, así que un cambio de pieza que no quepa se ve caer. La única
 * excepción declarada es la Ribera de los Curtidores (9): el `muelle` mide 10,94 y ENTRA
 * EN EL AGUA por diseño, con su plano propio detrás, en el campo.
 *
 * ═══ EL CAMPO SE SIEMBRA CON LA SEMILLA DEL CÓDIGO ═══
 *
 * Qué teselas de las dos coronas se ponen y dónde van colinas, arboledas y nubes lo decide
 * `semillaDelCodigo(codigo)`: decorado, NUNCA `ctx.azar` (que es secreto y filtraría la
 * semilla de las reglas). La misma mesa se ve igual en los seis aparatos. El sorteo es el
 * mulberry32 de `embarcadero/cala.ts`, que tampoco importa `three`.
 */
import { medioLado, sitioDeCasilla as sitioEnElAnillo, casillasDelAnillo } from '../../shared/mecanicas/anillo';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { sorteo } from '../embarcadero/cala';
import { PIEZA } from './piezas';
import type { NombreDePieza } from './piezas';

/* ────────────────────────────── Las medidas ────────────────────────────── */

export const ANCHO_DE_CASILLA = 8;
export const FONDO_DE_CASILLA = 14;
export const LADO_DE_ESQUINA = 14;
export const CASILLAS_POR_LADO = 11;
/** 40. */
export const CASILLAS = casillasDelAnillo(CASILLAS_POR_LADO);
/** 100. */
export const LADO_EXTERIOR = (CASILLAS_POR_LADO - 2) * ANCHO_DE_CASILLA + 2 * FONDO_DE_CASILLA;
/** 50. */
export const MEDIO_LADO = medioLado(ANCHO_DE_CASILLA, FONDO_DE_CASILLA, CASILLAS_POR_LADO);
/** 72: la ciudad interior. */
export const LADO_INTERIOR = LADO_EXTERIOR - 2 * FONDO_DE_CASILLA;
/** 36: donde empieza la acera. */
export const BORDE_INTERIOR = MEDIO_LADO - FONDO_DE_CASILLA;

/** Las tres bandas, de dentro afuera. Suman el fondo. */
export const BANDA = { acera: 5.5, calle: 3.5, solar: 5 } as const;

/** Dónde empieza y acaba cada banda, como distancia al centro del tablero. */
export const ACERA = { desde: BORDE_INTERIOR, hasta: BORDE_INTERIOR + BANDA.acera, centro: BORDE_INTERIOR + BANDA.acera / 2 } as const; // 36 · 41,5 · 38,75
export const CALLE = { desde: ACERA.hasta, hasta: ACERA.hasta + BANDA.calle, centro: ACERA.hasta + BANDA.calle / 2 } as const; // 41,5 · 45 · 43,25
export const SOLAR = { desde: CALLE.hasta, hasta: CALLE.hasta + BANDA.solar, centro: CALLE.hasta + BANDA.solar / 2 } as const; // 45 · 50 · 47,5

/** La línea media de la calle, a 43,25 del centro: por ahí pasa la marcha. */
export const LINEA_MEDIA_DE_LA_CALLE = CALLE.centro;
/** Hasta dónde puede desbordar un edificio hacia fuera: fuera no hay vecino. */
export const DESBORDE_HACIA_FUERA = 4;
/** Cuánto puede asomar un alero sobre la calle sin estorbar a nadie. */
export const ALERO_SOBRE_LA_CALLE = 0.5;
/** Lo que se deja entre dos solares vecinos: un edificio cabe en 7,6 de frente. */
export const FRENTE_MAXIMO_DEL_SOLAR = ANCHO_DE_CASILLA - 0.4;
/** Solar más desborde: 9 de fondo. */
export const FONDO_MAXIMO_DEL_SOLAR = BANDA.solar + DESBORDE_HACIA_FUERA;
/** La ribera (9) mete el muelle en el agua: el único solar que pasa de 9. */
export const FONDO_MAXIMO_EN_EL_AGUA = 11;

/** La acera se alza este poco sobre el suelo del anillo. */
export const ALTURA_DE_LA_ACERA = 0.15;

/* ────────────────────────── Puntos, marcos y puestas ────────────────────────── */

export interface Punto {
  readonly x: number;
  readonly z: number;
}

/** Lo que `Burgo.tsx` instancia: pieza, sitio, giro en RADIANES (el `rotation.y` de three) y talla. */
export interface Puesta {
  readonly pieza: NombreDePieza;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly giro: number;
  readonly talla: number;
}

/** Un cuarto de vuelta: `(x, z) → (−z, x)`, la tabla de `anillo.ts`. */
export function unCuarto(v: Punto): Punto {
  return { x: -v.z, z: v.x };
}

/** Radianes de tantos cuartos: el `rotation.y` de three. */
export function radianesDeCuartos(cuartos: number): number {
  return (cuartos * Math.PI) / 2;
}

/** Un punto local `(x, z)` girado `giro` radianes alrededor de la vertical, como lo hace `rotation.y`. */
export function giraElPunto(x: number, z: number, giro: number): Punto {
  const c = Math.cos(giro);
  const s = Math.sin(giro);
  return { x: x * c + z * s, z: -x * s + z * c };
}

export interface MarcoDeCasilla {
  readonly indice: number;
  readonly lado: 0 | 1 | 2 | 3;
  readonly esEsquina: boolean;
  /** Cuartos de vuelta para que una pieza que mira a +Z mire hacia fuera. */
  readonly cuartos: 0 | 1 | 2 | 3;
  /** Del centro del tablero hacia el campo. Unitario, alineado con un eje. */
  readonly fuera: Punto;
  /** El sentido de la marcha. Unitario. */
  readonly adelante: Punto;
  /** El centro de la CALLE (o el punto de paso, en una esquina). */
  readonly centro: Punto;
}

const FUERA_DEL_LADO: readonly Punto[] = (() => {
  const salida: Punto[] = [];
  let v: Punto = { x: 0, z: 1 };
  for (let l = 0; l < 4; l++) {
    salida.push(v);
    v = unCuarto(v);
  }
  return salida;
})();

/** `adelante` es `fuera` girado un cuarto: en el lado sur, `fuera` es +Z y la marcha va a −X. */
const adelanteDe = (fuera: Punto): Punto => unCuarto(fuera);

const suma = (a: Punto, b: Punto): Punto => ({ x: a.x + b.x, z: a.z + b.z });
const por = (a: Punto, k: number): Punto => ({ x: a.x * k, z: a.z * k });
const punto = (a: Punto, b: Punto): number => a.x * b.x + a.z * b.z;

const marcos: MarcoDeCasilla[] = [];

/** El marco de la casilla `i` (0..39). Se calcula una vez. */
export function marcoDeCasilla(i: number): MarcoDeCasilla {
  const indice = ((Math.trunc(i) % CASILLAS) + CASILLAS) % CASILLAS;
  const hecho = marcos[indice];
  if (hecho !== undefined) return hecho;
  const sitio = sitioEnElAnillo(indice, ANCHO_DE_CASILLA, FONDO_DE_CASILLA, CASILLAS_POR_LADO);
  const fuera = FUERA_DEL_LADO[sitio.lado] as Punto;
  const adelante = adelanteDe(fuera);
  const centro: Punto = sitio.esEsquina
    ? suma(por(fuera, LINEA_MEDIA_DE_LA_CALLE), por(adelante, -LINEA_MEDIA_DE_LA_CALLE))
    : suma({ x: sitio.x, z: sitio.z }, por(fuera, LINEA_MEDIA_DE_LA_CALLE - (MEDIO_LADO - FONDO_DE_CASILLA / 2)));
  const marco: MarcoDeCasilla = { indice, lado: sitio.lado, esEsquina: sitio.esEsquina, cuartos: sitio.cuartos, fuera, adelante, centro };
  marcos[indice] = marco;
  return marco;
}

/** El centro de la calle de la casilla `i` y sus cuartos de giro hacia fuera: lo que pide el diseño. */
export function sitioDeCasilla(i: number): { readonly x: number; readonly z: number; readonly cuartos: 0 | 1 | 2 | 3; readonly esEsquina: boolean } {
  const m = marcoDeCasilla(i);
  return { x: m.centro.x, z: m.centro.z, cuartos: m.cuartos, esEsquina: m.esEsquina };
}

/** Un punto de una casilla LATERAL: `radial` es la distancia al centro del tablero, `aLoLargo` va en el sentido de la marcha. */
export function puntoEnCasilla(marco: MarcoDeCasilla, radial: number, aLoLargo: number): Punto {
  return suma(suma(marco.centro, por(marco.fuera, radial - LINEA_MEDIA_DE_LA_CALLE)), por(marco.adelante, aLoLargo));
}

/** Un punto de una ESQUINA: `u` a lo largo de `fuera`, `v` a lo largo de `−adelante`, los dos absolutos (36..50). */
export function puntoEnEsquina(marco: MarcoDeCasilla, u: number, v: number): Punto {
  return suma(por(marco.fuera, u), por(marco.adelante, -v));
}

/** Las coordenadas de un punto del mundo en el marco de una casilla lateral: `radial` y `aLoLargo`. */
export function enElMarco(marco: MarcoDeCasilla, p: Punto): { readonly radial: number; readonly aLoLargo: number } {
  return { radial: punto(p, marco.fuera), aLoLargo: punto(suma(p, por(marco.centro, -1)), marco.adelante) };
}

/** Las coordenadas de un punto del mundo en el marco de una esquina: `u` y `v`. */
export function enLaEsquina(marco: MarcoDeCasilla, p: Punto): { readonly u: number; readonly v: number } {
  return { u: punto(p, marco.fuera), v: -punto(p, marco.adelante) };
}

/** El giro para que una pieza que mira a +Z mire hacia fuera / hacia dentro del anillo. */
export function giroHaciaFuera(marco: MarcoDeCasilla): number {
  return radianesDeCuartos(marco.cuartos);
}
export function giroHaciaDentro(marco: MarcoDeCasilla): number {
  return radianesDeCuartos(marco.cuartos) + Math.PI;
}

/** El rumbo (radianes, `rotation.y`) con el que un aventurero mira en el sentido de la marcha de `marco`. */
export function rumboDeLaMarcha(marco: MarcoDeCasilla): number {
  return Math.atan2(marco.adelante.x, marco.adelante.z);
}

/* ─────────────────────────── La polilínea de la marcha ─────────────────────────── */

/** Los 40 centros de calle, en orden de marcha. Las esquinas son los puntos de paso (±43,25, ±43,25). */
export function polilineaDeLaMarcha(): readonly Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i < CASILLAS; i++) puntos.push(marcoDeCasilla(i).centro);
  return puntos;
}

export const POLILINEA: readonly Punto[] = polilineaDeLaMarcha();

/** Lo que mide el tramo de la casilla `i` a la siguiente: 8 entre laterales, 11,25 al llegar a una esquina o salir de ella. */
export function largoDelTramo(i: number): number {
  const a = marcoDeCasilla(i).centro;
  const b = marcoDeCasilla(i + 1).centro;
  return Math.hypot(b.x - a.x, b.z - a.z);
}

/* ────────────────────────── Los huecos de una casilla ────────────────────────── */

/** Seis huecos de peón en la calle: rejilla 3 × 2, paso 2,2 a lo largo y 1,6 en radial, por índice de asiento. */
export const REJILLA_DE_PEONES = { columnas: 3, filas: 2, pasoALoLargo: 2.2, pasoRadial: 1.6 } as const;
/** Cuatro huecos de casa en la acera: 2 × 2 con paso 2,55 (la casa mide 2,5). */
export const REJILLA_DE_CASAS = { columnas: 2, filas: 2, paso: 2.55 } as const;
/** El aventurero se pone en el hueco de peón de su asiento, 1,2 hacia el solar. */
export const AVENTURERO_HACIA_EL_SOLAR = 1.2;
/** La bandera de dueño, en la esquina exterior-izquierda de la acera. */
export const HUECO_DE_LA_BANDERA = { aLoLargo: -3.2, radial: ACERA.hasta - 0.6 } as const;
/** La bandera de la posada va clavada en el tejado de la casa central. */
export const BANDERA_SOBRE_LA_POSADA = { alza: 2.45, aLoLargo: 0.6 } as const;
/** El pendón del Concejo en almoneda se planta donde iría la bandera del dueño, un poco más alto. */

/** El hueco `asiento` (0..5) de una rejilla de `columnas × filas`, centrado: devuelve el desplazamiento (columna, fila) desde el centro. */
function huecoDeRejilla(asiento: number, columnas: number, filas: number, pasoColumna: number, pasoFila: number): { readonly c: number; readonly f: number } {
  const n = ((Math.trunc(asiento) % (columnas * filas)) + columnas * filas) % (columnas * filas);
  const columna = n % columnas;
  const fila = Math.trunc(n / columnas);
  return { c: (columna - (columnas - 1) / 2) * pasoColumna, f: (fila - (filas - 1) / 2) * pasoFila };
}

/**
 * EL HUECO DE PEÓN de un asiento en una casilla. En una lateral, la rejilla 3 × 2 en la
 * calle. En una esquina, la misma rejilla sobre el tramo de calle por el que se SALE
 * (`u = 43,25`, `v` de 36 a 43,25), para que los peones no se pongan en la ele. En la
 * Mazmorra (10) es el hueco de VISITA: los presos tienen el suyo (`huecoDePreso`).
 */
export function huecoDePeon(casilla: number, asiento: number): Punto {
  const m = marcoDeCasilla(casilla);
  if (m.indice === MAZMORRA) return huecoDeVisita(asiento);
  const { c, f } = huecoDeRejilla(asiento, REJILLA_DE_PEONES.columnas, REJILLA_DE_PEONES.filas, REJILLA_DE_PEONES.pasoALoLargo, REJILLA_DE_PEONES.pasoRadial);
  if (m.esEsquina) return puntoEnEsquina(m, LINEA_MEDIA_DE_LA_CALLE + f, CENTRO_DE_LA_SALIDA_DE_LA_ESQUINA + c);
  return puntoEnCasilla(m, LINEA_MEDIA_DE_LA_CALLE + f, c);
}

/** Donde se pone el aventurero de un asiento: su hueco de peón, 1,2 hacia el solar. */
export function huecoDeAventurero(casilla: number, asiento: number): Punto {
  const m = marcoDeCasilla(casilla);
  return suma(huecoDePeon(casilla, asiento), por(m.fuera, AVENTURERO_HACIA_EL_SOLAR));
}

/** El hueco de casa `k` (0..3) de una casilla lateral, en la acera. */
export function huecoDeCasa(casilla: number, k: number): Punto {
  const m = marcoDeCasilla(casilla);
  const { c, f } = huecoDeRejilla(k, REJILLA_DE_CASAS.columnas, REJILLA_DE_CASAS.filas, REJILLA_DE_CASAS.paso, REJILLA_DE_CASAS.paso);
  return puntoEnCasilla(m, ACERA.centro + f, c);
}

/** El hueco de la posada: la casa centrada en la acera. */
export function huecoDePosada(casilla: number): Punto {
  return puntoEnCasilla(marcoDeCasilla(casilla), ACERA.centro, 0);
}

/** La bandera del dueño de una casilla lateral. */
export function huecoDeBandera(casilla: number): Punto {
  return puntoEnCasilla(marcoDeCasilla(casilla), HUECO_DE_LA_BANDERA.radial, HUECO_DE_LA_BANDERA.aLoLargo);
}

/* ─────────────────────────────── Las esquinas ─────────────────────────────── */

export const PUERTA_MAYOR = 0;
export const MAZMORRA = 10;
export const FERIA = 20;
export const A_LA_MAZMORRA = 30;
export const ESQUINAS: readonly number[] = [PUERTA_MAYOR, MAZMORRA, FERIA, A_LA_MAZMORRA];
/** Las cuatro puertas del juego: las de la muralla quedan enfrente. */
export const PUERTAS: readonly number[] = [5, 15, 25, 35];

/** El centro, en `v`, de la rejilla de peones de una esquina: sobre el tramo de salida. */
const CENTRO_DE_LA_SALIDA_DE_LA_ESQUINA = 39.5;
/** Cuánto engorda la ele de la marcha para que ninguna pieza de esquina la pise: un peón y algo de aire. */
export const HOLGURA_DE_LA_MARCHA = 1.0;

/**
 * LA MAZMORRA. La celda es un cuadrado de un muro de lado (6) en la esquina exterior, con
 * los dos muros macizos al fondo, los dos con reja hacia las calles, un pilar en cada
 * arranque y el muro de esquina fuera. Su centro está a 47,75 en `u` y en `v`: los muros
 * con reja (1,5 de grueso) quedan entre 44,0 y 45,5, o sea a 0,1 del cuerpo del peón que
 * pasa por 43,25; los macizos, entre 50 y 51,5, desbordan hacia fuera, donde no hay
 * vecino. Las cuatro losas (2 × 2 = 12 × 12) cubren el cuadrado de 37 a 49. Los seis
 * huecos de preso son una rejilla 3 × 2 dentro de la celda (interior de 4,5) y los seis
 * de visita otra en la franja de dentro, en la esquina de las dos aceras.
 */
export const CELDA = { centro: 47.75, lado: 6, grosorDelMuro: 1.5 } as const;
export const REJILLA_DE_PRESOS = { columnas: 3, filas: 2, paso: 1.5 } as const;
export const REJILLA_DE_VISITAS = { centro: 39.0, columnas: 3, filas: 2, pasoU: 2.0, pasoV: 1.6 } as const;
/** Cuánto sube la reja al abrirse, en unidades. */
export const SUBIDA_DE_LA_REJA = 4;

export function huecoDePreso(asiento: number): Punto {
  const m = marcoDeCasilla(MAZMORRA);
  const { c, f } = huecoDeRejilla(asiento, REJILLA_DE_PRESOS.columnas, REJILLA_DE_PRESOS.filas, REJILLA_DE_PRESOS.paso, REJILLA_DE_PRESOS.paso);
  return puntoEnEsquina(m, CELDA.centro + c, CELDA.centro + f);
}

export function huecoDeVisita(asiento: number): Punto {
  const m = marcoDeCasilla(MAZMORRA);
  const { c, f } = huecoDeRejilla(asiento, REJILLA_DE_VISITAS.columnas, REJILLA_DE_VISITAS.filas, REJILLA_DE_VISITAS.pasoU, REJILLA_DE_VISITAS.pasoV);
  return puntoEnEsquina(m, REJILLA_DE_VISITAS.centro + c, REJILLA_DE_VISITAS.centro + f);
}

/** Una pieza de esquina: sitio en (u, v), giro en cuartos sobre «mirando hacia fuera», alza. */
export interface PiezaDeEsquina {
  readonly pieza: NombreDePieza;
  readonly u: number;
  readonly v: number;
  readonly giroEnCuartos: number;
  readonly alza?: number;
  /** Etiqueta para que la escena encuentre la que se anima (la reja que sube). */
  readonly papel?: 'reja' | 'reja-fija';
}

const c = CELDA.centro;
const medioMuro = CELDA.lado / 2;

/** Las piezas de cada esquina, en su marco (u, v). */
export const PIEZAS_DE_LA_ESQUINA: Readonly<Record<number, readonly PiezaDeEsquina[]>> = {
  [PUERTA_MAYOR]: [
    { pieza: PIEZA.estandarte, u: 46.5, v: 38.5, giroEnCuartos: 2 },
    { pieza: PIEZA.estandarte, u: 38.5, v: 46.5, giroEnCuartos: 3 },
    { pieza: PIEZA.lingotes, u: 47.5, v: 47.5, giroEnCuartos: 0 },
    { pieza: PIEZA.farol, u: 49.0, v: 49.0, giroEnCuartos: 0 },
  ],
  [MAZMORRA]: [
    { pieza: PIEZA.losa, u: 40, v: 40, giroEnCuartos: 0 },
    { pieza: PIEZA.losa, u: 46, v: 40, giroEnCuartos: 0 },
    { pieza: PIEZA.losa, u: 40, v: 46, giroEnCuartos: 0 },
    { pieza: PIEZA.losa, u: 46, v: 46, giroEnCuartos: 0 },
    /* Los dos muros macizos, al fondo: uno a lo largo de `v` en u = 50,75, otro a lo largo de `u` en v = 50,75. */
    { pieza: PIEZA.muro, u: c + medioMuro, v: c, giroEnCuartos: 1 },
    { pieza: PIEZA.muro, u: c, v: c + medioMuro, giroEnCuartos: 0 },
    /* Los dos con reja, hacia las calles. La que sube es la que mira al tramo de salida. */
    { pieza: PIEZA.muroReja, u: c - medioMuro, v: c, giroEnCuartos: 1, papel: 'reja' },
    { pieza: PIEZA.muroReja, u: c, v: c - medioMuro, giroEnCuartos: 0, papel: 'reja-fija' },
    { pieza: PIEZA.muroEsquina, u: c + medioMuro, v: c + medioMuro, giroEnCuartos: 0 },
    { pieza: PIEZA.pilar, u: c - medioMuro, v: c + medioMuro, giroEnCuartos: 0 },
    { pieza: PIEZA.pilar, u: c + medioMuro, v: c - medioMuro, giroEnCuartos: 0 },
    { pieza: PIEZA.antorchaPared, u: c + medioMuro - 0.8, v: c + 1.5, giroEnCuartos: 3, alza: 3.4 },
    { pieza: PIEZA.antorchaPared, u: c + 1.5, v: c + medioMuro - 0.8, giroEnCuartos: 2, alza: 3.4 },
    { pieza: PIEZA.cofre, u: 38.5, v: 47.5, giroEnCuartos: 1 },
    { pieza: PIEZA.tonel, u: 47.5, v: 38.5, giroEnCuartos: 0 },
    { pieza: PIEZA.llavero, u: c - medioMuro, v: c + medioMuro - 1.3, giroEnCuartos: 0, alza: 4.6 },
    { pieza: PIEZA.pendon, u: c + medioMuro - 0.6, v: c - 1.2, giroEnCuartos: 3 },
  ],
  [FERIA]: [
    { pieza: PIEZA.tablado, u: 47.6, v: 47.6, giroEnCuartos: 2 },
    { pieza: PIEZA.mesaRedonda, u: 39.0, v: 47.5, giroEnCuartos: 0 },
    { pieza: PIEZA.silla, u: 39.0, v: 45.6, giroEnCuartos: 0 },
    { pieza: PIEZA.silla, u: 39.0, v: 49.4, giroEnCuartos: 2 },
    { pieza: PIEZA.farola, u: 47.5, v: 39.0, giroEnCuartos: 1 },
    { pieza: PIEZA.almiar, u: 46.5, v: 40.5, giroEnCuartos: 0 },
    { pieza: PIEZA.almiar, u: 48.6, v: 38.0, giroEnCuartos: 1 },
    { pieza: PIEZA.diana, u: 49.0, v: 41.0, giroEnCuartos: 1 },
  ],
  [A_LA_MAZMORRA]: [
    { pieza: PIEZA.verja, u: 47.5, v: 49.5, giroEnCuartos: 0 },
    { pieza: PIEZA.verjaPuerta, u: 49.5, v: 47.5, giroEnCuartos: 1 },
    { pieza: PIEZA.verja, u: 49.5, v: 41.0, giroEnCuartos: 1 },
    { pieza: PIEZA.antorcha, u: 46.0, v: 46.0, giroEnCuartos: 0, alza: 0.6 },
    { pieza: PIEZA.antorcha, u: 38.5, v: 47.5, giroEnCuartos: 0, alza: 0.6 },
    { pieza: PIEZA.farol, u: 47.5, v: 38.5, giroEnCuartos: 0 },
    { pieza: PIEZA.rocaA, u: 39.5, v: 39.5, giroEnCuartos: 0 },
    { pieza: PIEZA.rocaA, u: 38.0, v: 41.0, giroEnCuartos: 2 },
  ],
};

/** Las puestas de las cuatro esquinas, en coordenadas del mundo. */
export function puestasDeLasEsquinas(): Puesta[] {
  const salida: Puesta[] = [];
  for (const esquina of ESQUINAS) {
    const m = marcoDeCasilla(esquina);
    for (const p of PIEZAS_DE_LA_ESQUINA[esquina] ?? []) {
      const sitio = puntoEnEsquina(m, p.u, p.v);
      salida.push({ pieza: p.pieza, x: sitio.x, y: p.alza ?? 0, z: sitio.z, giro: giroHaciaFuera(m) + radianesDeCuartos(p.giroEnCuartos), talla: 1 });
    }
  }
  return salida;
}

/** La puesta de la reja que sube y baja, para que la escena la deje fuera del fundido. */
export function puestaDeLaReja(): Puesta {
  const m = marcoDeCasilla(MAZMORRA);
  const p = (PIEZAS_DE_LA_ESQUINA[MAZMORRA] ?? []).find((x) => x.papel === 'reja') as PiezaDeEsquina;
  const sitio = puntoEnEsquina(m, p.u, p.v);
  return { pieza: p.pieza, x: sitio.x, y: 0, z: sitio.z, giro: giroHaciaFuera(m) + radianesDeCuartos(p.giroEnCuartos), talla: 1 };
}

/* ─────────────────────────────── Los solares ─────────────────────────────── */

/** Una pieza de un solar: giro en cuartos sobre «mirando hacia dentro», desplazamiento respecto del centro de su banda, alza en `y`. */
export interface PiezaDelSolar {
  readonly pieza: NombreDePieza;
  readonly giroEnCuartos: number;
  /** `[aLoLargo, radial]` respecto del centro de la banda (`SOLAR.centro` o `ACERA.centro`). */
  readonly desplazamiento: readonly [number, number];
  readonly alza?: number;
  /** En qué banda va: los edificios en el solar; el arca, el tablado del pregón y los cofres, en la acera. */
  readonly banda?: 'solar' | 'acera';
}

const caseron: readonly PiezaDelSolar[] = [{ pieza: PIEZA.caseron, giroEnCuartos: 0, desplazamiento: [0, 0.7] }];
const torreon: readonly PiezaDelSolar[] = [{ pieza: PIEZA.torreon, giroEnCuartos: 0, desplazamiento: [0, 1.0] }];
const puerta: readonly PiezaDelSolar[] = [
  { pieza: PIEZA.pendon, giroEnCuartos: 0, desplazamiento: [-2.6, -1.0] },
  { pieza: PIEZA.pendon, giroEnCuartos: 0, desplazamiento: [2.6, -1.0] },
  { pieza: PIEZA.farol, giroEnCuartos: 0, desplazamiento: [0, -1.0] },
];
const arca: readonly PiezaDelSolar[] = [{ pieza: PIEZA.arca, giroEnCuartos: 0, desplazamiento: [0, 0], banda: 'acera' }];
/*
 * EL PREGÓN Y EL TRIBUTO, MÁS BARATOS QUE EN EL DISEÑO. La parte 2 ponía un tablado (784)
 * en los tres pregones y cofre + lingotes (1.376) en el diezmo y la alcabala, pero su
 * tabla de presupuesto no los sumaba: con ellos y las tres arcas el tablero lleno se iba
 * a 113.600, por encima de los 110.000. El pregonero se sube a un taburete (216) y el
 * tributo es un cofre a secas (728): −3.000 triángulos, y `verify:burgo-escena` lo suma.
 */
const pregon: readonly PiezaDelSolar[] = [{ pieza: PIEZA.taburete, giroEnCuartos: 0, desplazamiento: [0, 0], banda: 'acera' }];
const tributo: readonly PiezaDelSolar[] = [{ pieza: PIEZA.cofre, giroEnCuartos: 0, desplazamiento: [0, 0], banda: 'acera' }];
const tablado: PiezaDelSolar = { pieza: PIEZA.tablado, giroEnCuartos: 0, desplazamiento: [-0.24, 0.7] };

/**
 * LA TABLA DE LOS SOLARES (§5.1 del diseño), casilla a casilla. Los desplazamientos
 * radiales están elegidos con las cajas medidas para que cada solar quede entre el borde
 * de la calle (menos el alero) y los 4 de desborde. `verify:burgo-escena` lo vuelve a medir.
 */
export const EDIFICIO_DE_LA_CASILLA: Readonly<Record<number, readonly PiezaDelSolar[]>> = {
  1: caseron, // Lodo
  2: arca,
  3: [
    /* El corral de los cabreros: una verja de frente, otra de canto, dos almiares dentro. */
    { pieza: PIEZA.verja, giroEnCuartos: 0, desplazamiento: [-1.0, -1.9] },
    { pieza: PIEZA.verja, giroEnCuartos: 1, desplazamiento: [3.4, 0.5] },
    { pieza: PIEZA.almiar, giroEnCuartos: 0, desplazamiento: [-1.2, 0.5] },
    { pieza: PIEZA.almiar, giroEnCuartos: 1, desplazamiento: [1.0, 1.7] },
  ],
  4: tributo, // Diezmo
  5: puerta,
  6: [tablado, { pieza: PIEZA.tonel, giroEnCuartos: 0, desplazamiento: [-1.6, 4.1] }, { pieza: PIEZA.tonel, giroEnCuartos: 0, desplazamiento: [1.6, 4.1] }], // Tejedores
  7: pregon,
  8: [
    /* Tintoreros: la mesa delante y cuatro toneles detrás. */
    { pieza: PIEZA.mesaDeMadera, giroEnCuartos: 0, desplazamiento: [0, -1.7] },
    { pieza: PIEZA.tonel, giroEnCuartos: 0, desplazamiento: [-1.5, 0.7] },
    { pieza: PIEZA.tonel, giroEnCuartos: 0, desplazamiento: [1.5, 0.7] },
    { pieza: PIEZA.tonel, giroEnCuartos: 0, desplazamiento: [-1.5, 3.5] },
    { pieza: PIEZA.tonel, giroEnCuartos: 0, desplazamiento: [1.5, 3.5] },
  ],
  9: [{ pieza: PIEZA.muelle, giroEnCuartos: 1, desplazamiento: [0, 3.0] }], // Ribera de los Curtidores: entra en el agua
  11: caseron, // Cera
  12: [{ pieza: PIEZA.molino, giroEnCuartos: 0, desplazamiento: [-0.03, 0.4] }], // El Molino: el compilador ya lo deja con la base a 0 (medido); sin alza
  13: caseron, // Bordadores
  14: [
    /* La plazuela de los ciegos: dos bancos, una farola y un árbol. */
    { pieza: PIEZA.banco, giroEnCuartos: 0, desplazamiento: [-2.0, -1.0] },
    { pieza: PIEZA.banco, giroEnCuartos: 0, desplazamiento: [2.0, -1.0] },
    { pieza: PIEZA.farola, giroEnCuartos: 0, desplazamiento: [0, 0] },
    { pieza: PIEZA.arbolA, giroEnCuartos: 0, desplazamiento: [0, 2.5], alza: 0.56 },
  ],
  15: puerta,
  16: [{ pieza: PIEZA.herreria, giroEnCuartos: 0, desplazamiento: [-0.07, 1.5] }], // Herreros
  17: arca,
  18: torreon, // Caldereros
  19: torreon, // Espaderos
  21: [{ pieza: PIEZA.tienda, giroEnCuartos: 1, desplazamiento: [0.46, 1.9], alza: 0.25 }], // Mercaderes: la tienda girada; sus estacas bajan 0,25
  22: pregon,
  23: [tablado, { pieza: PIEZA.mesaPequena, giroEnCuartos: 0, desplazamiento: [-0.9, 4.0] }, { pieza: PIEZA.taburete, giroEnCuartos: 0, desplazamiento: [1.2, 4.0] }], // Plaza del Mercado: una mesita y un taburete (la caja de zanahorias son 1.752)
  24: [tablado, { pieza: PIEZA.mesaRedonda, giroEnCuartos: 0, desplazamiento: [-1.9, 4.1] }, { pieza: PIEZA.mesaRedonda, giroEnCuartos: 0, desplazamiento: [1.9, 4.1] }], // Lonja
  25: puerta,
  26: torreon, // Plateros
  27: caseron, // Libreros
  28: [{ pieza: PIEZA.pozo, giroEnCuartos: 0, desplazamiento: [-0.06, 0] }], // El Pozo
  29: [{ pieza: PIEZA.vigia, giroEnCuartos: 0, desplazamiento: [0, 1.0] }], // Cambistas
  31: [{ pieza: PIEZA.ermita, giroEnCuartos: 0, desplazamiento: [-0.03, -0.5] }], // Hospital
  32: [{ pieza: PIEZA.iglesia, giroEnCuartos: 0, desplazamiento: [0, 1.3] }], // Colegiata
  33: arca,
  34: caseron, // Escribanos
  35: puerta,
  36: pregon,
  37: [{ pieza: PIEZA.torreA, giroEnCuartos: 0, desplazamiento: [0, 1.0] }], // Plaza del Alcázar
  38: tributo, // Alcabala
  39: [{ pieza: PIEZA.torreB, giroEnCuartos: 0, desplazamiento: [0, 1.5] }], // Calle Mayor: lo más alto, en la casilla más cara
};

/** El solar que entra en el agua, con su plano detrás. */
export const RIBERA = 9;
/** El plano de agua de la ribera: detrás del muelle, en el campo. Color y medidas para que `Burgo.tsx` lo pinte. */
export const AGUA_DE_LA_RIBERA = { radial: 56, aLoLargo: 0, ancho: 9, fondo: 9, y: -0.3, color: '#3d6f9a' } as const;

/** La puesta de UNA pieza de solar en el mundo. */
export function puestaDeLaPiezaDelSolar(casilla: number, p: PiezaDelSolar): Puesta {
  const m = marcoDeCasilla(casilla);
  const centroDeLaBanda = p.banda === 'acera' ? ACERA.centro : SOLAR.centro;
  const sitio = puntoEnCasilla(m, centroDeLaBanda + p.desplazamiento[1], p.desplazamiento[0]);
  return { pieza: p.pieza, x: sitio.x, y: p.alza ?? 0, z: sitio.z, giro: giroHaciaDentro(m) + radianesDeCuartos(p.giroEnCuartos), talla: 1 };
}

/** Las puestas de los 36 solares. */
export function puestasDeLosSolares(): Puesta[] {
  const salida: Puesta[] = [];
  for (let i = 0; i < CASILLAS; i++) {
    for (const p of EDIFICIO_DE_LA_CASILLA[i] ?? []) salida.push(puestaDeLaPiezaDelSolar(i, p));
  }
  return salida;
}

/** Dónde está el agua de la ribera, en el mundo. */
export function puestaDelAgua(): { readonly x: number; readonly z: number; readonly giro: number } {
  const m = marcoDeCasilla(RIBERA);
  const p = puntoEnCasilla(m, AGUA_DE_LA_RIBERA.radial, AGUA_DE_LA_RIBERA.aLoLargo);
  return { x: p.x, z: p.z, giro: giroHaciaFuera(m) };
}

/* ─────────────────────────────── La muralla ─────────────────────────────── */

/** Un cuadrado de 58 de lado: la ronda de 7 lo separa del anillo. */
export const RONDA = 7;
export const MEDIO_LADO_DE_LA_MURALLA = BORDE_INTERIOR - RONDA;
/** Lo que mide un tramo de muralla del pack, ya escalado (medido: 10,94). */
export const LARGO_DE_LA_MURALLA = 10.94;
/** Por lado: muralla, muralla, puerta, muralla, muralla. */
export const TRAMOS_POR_LADO: readonly NombreDePieza[] = [PIEZA.muralla, PIEZA.muralla, PIEZA.puertaMuralla, PIEZA.muralla, PIEZA.muralla];
/** La esquina con puerta grande es la que mira a la Puerta Mayor: el sureste. */
export const ESQUINA_CON_PUERTA = PUERTA_MAYOR;

/**
 * Las puestas de la muralla. Cada lado va paralelo al lado del anillo del mismo índice,
 * a `MEDIO_LADO_DE_LA_MURALLA` del centro, con la puerta en el medio (enfrente de la
 * casilla 5, 15, 25 o 35); los tramos son largos, así que su giro es el de «hacia fuera»
 * del lado. Las esquinas llevan la pieza de esquina girada con su lado, y la del sureste
 * es la que tiene puerta.
 */
export function puestasDeLaMuralla(): Puesta[] {
  const salida: Puesta[] = [];
  const n = TRAMOS_POR_LADO.length;
  for (let lado = 0; lado < 4; lado++) {
    const m = marcoDeCasilla(lado * 10 + 5); // la casilla del medio del lado: su centro está en el eje de la puerta
    for (let k = 0; k < n; k++) {
      const aLoLargo = (k - (n - 1) / 2) * LARGO_DE_LA_MURALLA;
      const sitio = puntoEnCasilla(m, MEDIO_LADO_DE_LA_MURALLA, aLoLargo);
      salida.push({ pieza: TRAMOS_POR_LADO[k] as NombreDePieza, x: sitio.x, y: 0, z: sitio.z, giro: giroHaciaFuera(m), talla: 1 });
    }
    const esquina = marcoDeCasilla(lado * 10);
    const sitio = puntoEnEsquina(esquina, MEDIO_LADO_DE_LA_MURALLA, MEDIO_LADO_DE_LA_MURALLA);
    salida.push({
      pieza: esquina.indice === ESQUINA_CON_PUERTA ? PIEZA.esquinaPuerta : PIEZA.esquinaMuralla,
      x: sitio.x,
      y: 0,
      z: sitio.z,
      giro: giroHaciaFuera(esquina),
      talla: 1,
    });
  }
  return salida;
}

/** Las cuatro puertas de la muralla, en el orden de las casillas 5, 15, 25, 35. */
export function puertasDeLaMuralla(): Puesta[] {
  return puestasDeLaMuralla().filter((p) => p.pieza === PIEZA.puertaMuralla);
}

/* ─────────────────────────────── La plaza ─────────────────────────────── */

/** El suelo de dados: un cuadrado de losa clara en el centro, geometría propia de dos triángulos. */
export const SUELO_DE_DADOS = { x: 0, z: 0, lado: 14, y: 0.02, color: '#e6dcc3' } as const;
/** Los dados, arista 3, uno a cada lado del centro. */
export const ARISTA_DE_LOS_DADOS = 3;
export const HUECOS_DE_LOS_DADOS: readonly Punto[] = [
  { x: -2, z: 0 },
  { x: 2, z: 0 },
];
/** El asa invisible sobre los dados: un cilindro de radio 5. */
export const RADIO_DEL_ASA_DE_LOS_DADOS = 5;
/** El Concejo: a él vuelan las monedas que se pagan al Concejo y de él salen las que se cobran. */
export const EL_CONCEJO: Punto = { x: 0, z: -18 };

/** Las mesas y sillas, aparte: la calidad sobria las quita. */
export function puestasDeLasMesasDeLaPlaza(): Puesta[] {
  const q = Math.PI / 2;
  return [
    { pieza: PIEZA.mesaRedonda, x: 14, y: 0, z: -3, giro: 0, talla: 1 },
    { pieza: PIEZA.mesaRedonda, x: 14, y: 0, z: 5, giro: 0, talla: 1 },
    { pieza: PIEZA.silla, x: 12, y: 0, z: -3, giro: q, talla: 1 },
    { pieza: PIEZA.silla, x: 16, y: 0, z: -3, giro: -q, talla: 1 },
    { pieza: PIEZA.silla, x: 12, y: 0, z: 5, giro: q, talla: 1 },
    { pieza: PIEZA.silla, x: 16, y: 0, z: 5, giro: -q, talla: 1 },
  ];
}

/** El ayuntamiento al norte mirando al centro, el pozo al oeste, y las mesas al este. */
export function puestasDeLaPlaza(conMesas = true): Puesta[] {
  const fijas: Puesta[] = [
    { pieza: PIEZA.ayuntamiento, x: EL_CONCEJO.x, y: 0, z: EL_CONCEJO.z, giro: 0, talla: 1 },
    { pieza: PIEZA.pozo, x: -14, y: 0, z: 2, giro: 0, talla: 1 },
  ];
  return conMesas ? [...fijas, ...puestasDeLasMesasDeLaPlaza()] : fijas;
}

/* ─────────────────────────────── La ronda ─────────────────────────────── */

/** La ronda va entre la muralla (29 + su grueso) y la acera (36): las piezas a 33,5. */
export const RADIAL_DE_LA_RONDA = 33.5;
/** Nada a menos de esto del eje de una puerta: el camino de la casilla 5 a la puerta queda libre. */
export const PASO_LIBRE_ANTE_LA_PUERTA = 3;

/** arbol-a × 12, arbol-b × 4, banco × 4, farola × 2. */
export function puestasDeLaRonda(): Puesta[] {
  const salida: Puesta[] = [];
  for (let lado = 0; lado < 4; lado++) {
    const m = marcoDeCasilla(lado * 10 + 5);
    const pon = (pieza: NombreDePieza, aLoLargo: number, alza: number, haciaDentro: boolean): void => {
      const s = puntoEnCasilla(m, RADIAL_DE_LA_RONDA, aLoLargo);
      salida.push({ pieza, x: s.x, y: alza, z: s.z, giro: haciaDentro ? giroHaciaDentro(m) : giroHaciaFuera(m), talla: 1 });
    };
    pon(PIEZA.arbolA, -18, 0.56, false);
    pon(PIEZA.arbolA, 18, 0.56, false);
    pon(PIEZA.arbolB, -9, 0.55, false);
    pon(PIEZA.banco, 9, 0, true);
    if (lado === 0 || lado === 2) pon(PIEZA.farola, 4, 0, true);
    const esquina = marcoDeCasilla(lado * 10);
    const s = puntoEnEsquina(esquina, RADIAL_DE_LA_RONDA, RADIAL_DE_LA_RONDA);
    salida.push({ pieza: PIEZA.arbolA, x: s.x, y: 0.56, z: s.z, giro: giroHaciaFuera(esquina), talla: 1 });
  }
  return salida;
}

/* ─────────────────────────────── El campo ─────────────────────────────── */

/** La tesela hexagonal, ya escalada: 10,94 de ancho (punta arriba) y 12,63 de largo. */
export const ANCHO_DE_TESELA = 10.94;
export const LARGO_DE_TESELA = 12.63;
export const TESELAS_DEL_CAMPO = 30;
/** Las dos coronas: teselas cuyo centro queda entre estas distancias (de Chebyshev) del centro. */
export const CORONA = { desde: MEDIO_LADO + LARGO_DE_TESELA / 2, hasta: MEDIO_LADO + LARGO_DE_TESELA * 2 } as const;
export const ALTURA_DE_LAS_NUBES = 28;
export const DERIVA_DE_LAS_NUBES = 0.3;
/** Las nubes vuelven por el otro lado al pasar de aquí. */
export const CONFIN_DE_LAS_NUBES = 80;
/** Un canal propio para que el campo no se parezca a la cala de la misma mesa. */
export const SEMILLA_DEL_CAMPO = 0x5b7a;

/** Todos los centros de tesela de un panal de punta arriba que caen en las dos coronas, en orden fijo. */
export function candidatasDelCampo(): Punto[] {
  const salida: Punto[] = [];
  const pasoDeFila = LARGO_DE_TESELA * 0.75;
  for (let fila = -9; fila <= 9; fila++) {
    for (let columna = -9; columna <= 9; columna++) {
      const x = columna * ANCHO_DE_TESELA + (fila % 2 === 0 ? 0 : ANCHO_DE_TESELA / 2);
      const z = fila * pasoDeFila;
      const lejos = Math.max(Math.abs(x), Math.abs(z));
      if (lejos >= CORONA.desde && lejos <= CORONA.hasta) salida.push({ x, z });
    }
  }
  return salida;
}

export interface Campo {
  readonly teselas: readonly Puesta[];
  readonly decorado: readonly Puesta[];
  readonly nubes: readonly Puesta[];
}

/** La semilla del campo de una mesa. */
export function semillaDelCampo(codigo: string | null | undefined): number {
  return (semillaDelCodigo(codigo, 0) ^ SEMILLA_DEL_CAMPO) >>> 0;
}

/** Baraja una lista con un sorteo (Fisher-Yates), sin mutar la entrada. */
function barajada<T>(lista: readonly T[], azar: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    const a = copia[i] as T;
    copia[i] = copia[j] as T;
    copia[j] = a;
  }
  return copia;
}

/**
 * EL CAMPO SEMBRADO: 30 teselas de las candidatas, colinas y arboledas sobre cuatro de
 * ellas, y tres nubes a 28 de alto. Determinista por semilla.
 */
export function campo(semilla: number): Campo {
  const azar = sorteo(semilla >>> 0);
  const elegidas = barajada(candidatasDelCampo(), azar).slice(0, TESELAS_DEL_CAMPO);
  const teselas = elegidas.map((p): Puesta => ({ pieza: PIEZA.tesela, x: p.x, y: 0, z: p.z, giro: 0, talla: 1 }));
  const decorado: Puesta[] = [];
  const conDecorado: readonly NombreDePieza[] = [PIEZA.colinasA, PIEZA.colinasA, PIEZA.arboledaPequena, PIEZA.arboledaPequena];
  conDecorado.forEach((pieza, k) => {
    const sobre = elegidas[k] ?? { x: CORONA.desde, z: 0 };
    decorado.push({ pieza, x: sobre.x, y: 0, z: sobre.z, giro: Math.floor(azar() * 6) * (Math.PI / 3), talla: 1 });
  });
  const nube = (pieza: NombreDePieza): Puesta => ({
    pieza,
    x: (azar() * 2 - 1) * (CONFIN_DE_LAS_NUBES - 10),
    y: ALTURA_DE_LAS_NUBES,
    z: (azar() * 2 - 1) * (CONFIN_DE_LAS_NUBES - 10),
    giro: azar() * Math.PI * 2,
    talla: 1,
  });
  const nubes = [nube(PIEZA.nubeGrande), nube(PIEZA.nubePequena), nube(PIEZA.nubePequena)];
  return { teselas, decorado, nubes };
}

/* ───────────────────────── Todo junto, para quien instancia ───────────────────────── */

/** El mundo estático de una mesa: lo que se aplana y se funde en UNA geometría. Sin la reja ni las aspas, que se animan. */
export function mundoEstatico(semilla: number, calidad: 'plena' | 'sobria' = 'plena'): Puesta[] {
  const plena = calidad === 'plena';
  const c = campo(semilla);
  return [
    ...puestasDeLosSolares(),
    ...puestasDeLasEsquinas().filter((p) => p.pieza !== PIEZA.muroReja),
    ...puestasDeLaMuralla(),
    ...puestasDeLaPlaza(plena),
    ...(plena ? puestasDeLaRonda() : []),
    ...(plena ? [...c.teselas, ...c.decorado] : []),
  ];
}

/** Lo que la escena usa para colocar peones y aventureros: la polilínea y los huecos. Es lo que `peon.ts` recibe. */
export interface AnilloEn3D {
  readonly polilinea: readonly Punto[];
  readonly huecoDePeon: (casilla: number, asiento: number) => Punto;
  readonly huecoDeAventurero: (casilla: number, asiento: number) => Punto;
  readonly huecoDePreso: (asiento: number) => Punto;
  readonly huecoDeVisita: (asiento: number) => Punto;
  readonly rumboDeLaMarcha: (casilla: number) => number;
  readonly fuera: (casilla: number) => Punto;
}

export const ANILLO_DEL_BURGO: AnilloEn3D = {
  polilinea: POLILINEA,
  huecoDePeon,
  huecoDeAventurero,
  huecoDePreso,
  huecoDeVisita,
  rumboDeLaMarcha: (casilla) => rumboDeLaMarcha(marcoDeCasilla(casilla)),
  fuera: (casilla) => marcoDeCasilla(casilla).fuera,
};
