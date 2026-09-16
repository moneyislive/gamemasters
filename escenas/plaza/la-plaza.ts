/**
 * LA PLAZA: qué hay en el suelo de la plaza del Burgo, dónde, y por qué ahí.
 *
 * ═══ QUÉ ES ESTO Y QUÉ NO ═══
 *
 * Es la COMPOSICIÓN, no la escena: una lista de piezas puestas (las de `burgo.glb`),
 * unos pocos bultos propios (el pedestal y el llano del fondo), los seis puestos de
 * espera con sus caminos de entrada y de salida, y el monumento. Sin `three`, sin
 * React y sin DOM: es aritmética, la corre `verify:plaza` en Node y la pinta
 * `Plaza.tsx`. La misma frontera que `cala.ts` con `Embarcadero.tsx`.
 *
 * ═══ LA MEDIDA: SIETE POR SIETE CELDAS DE DOCE ═══
 *
 * La ciudad del tablero se traza sobre una retícula de doce (`RETICULA_DE_LA_CIUDAD`,
 * que sale de las losas de 2 × 2 del City Builder a escala del mundo). La plaza usa
 * ESA retícula y no otra, porque es la misma ciudad: siete por siete celdas, 84 × 84.
 * El anillo exterior de celdas es la calle que rodea la plaza —con sus esquinas
 * curvas y un paso de cebra en el centro de cada lado— y las cinco por cinco de
 * dentro son la plaza propiamente dicha, 60 × 60 de solera. Las fachadas se levantan
 * una celda MÁS ALLÁ de la calle, que es donde están en una ciudad de verdad: al
 * otro lado del asfalto.
 *
 * ═══ LA COTA DE TODO: 0,6, Y NO ES UN DETALLE ═══
 *
 * La acera del pack está a 0,6 y el asfalto a 0,42 (`ALTURA_DEL_BORDILLO` y
 * `ALTURA_DEL_ASFALTO` de `burgo/ciudad.ts`, medidos vértice a vértice sobre el
 * fichero). Una `solera` puesta a y = 0 tiene su cara de arriba a 0,6: ahí se plantan
 * los aventureros, las mesas, las sillas y los árboles. Un `cuerpo-*` puesto a 0
 * FLOTA 0,6 —su geometría empieza en 0,6 porque supone que tiene una solera debajo—,
 * y un coche se posa a 0,786 sobre el asfalto porque sus ruedas bajan 0,366 del
 * origen. Cada una de esas cotas está escrita aquí una vez y `verify:plaza` las
 * vuelve a medir sobre el `.glb`.
 *
 * ═══ LOS SEIS PUESTOS: UN ARCO DELANTE DEL MONUMENTO, MEDIDO CONTRA LA CÁMARA ═══
 *
 * El encargo pedía «seis puestos en arco abierto hacia la cámara». Un arco CÓNCAVO
 * hacia la cámara —el que primero se imagina, con las puntas viniendo hacia quien
 * mira— no cabe en un teléfono, y eso no es una opinión: en 9:19,5 el cono
 * horizontal de la cámara es de ±15° con 68° de campo, así que a la distancia a la
 * que está el local sólo hay unas cuatro unidades de ancho útil. Las puntas de ese
 * arco, que son lo MÁS CERCANO, se salen de cuadro; el sitio ancho está al fondo.
 *
 * Así que el arco se abre AL REVÉS y abraza el monumento por delante: el local en la
 * punta, más cerca de la cámara que nadie, y los otros cinco alternando lados y
 * retrocediendo, cada uno más lejos y más abierto que el anterior. Lo que el encargo
 * compraba —que no haya nadie detrás del monumento ni escondido detrás de otro— se
 * cumple entero, y además se comprueba: `verify:plaza` proyecta los seis con
 * `proyecta` de `embarcadero/camara.ts` en tres ventanas y seis aforos y exige que
 * cada uno esté ENTERO en cuadro, por encima de la hoja, separado de los demás al
 * menos el 6 % del ancho, y que ninguno tape a otro.
 *
 * Los sitios salieron de una búsqueda numérica sobre esas mismas condiciones (recocido
 * simulado y después descenso por coordenadas sobre números redondos). Lo que se pagó
 * por ellos, dicho sin adornos: con los seis sentados el local mide el 21 % del alto
 * de la pantalla en retrato, no el 65 % que mide en el Muelle. Es el precio de tener
 * a seis personas separadas en un cono de ±15°, y la alternativa medida era gente
 * tapándose.
 *
 * ═══ EL ORDEN DE LOS PUESTOS ES EL ORDEN DE LLEGADA ═══
 *
 * El 0 es el local. El 1 es el primero que se sienta, el 2 el siguiente… y la cámara
 * retrocede según el puesto ocupado MÁS ALTO (ver `camara-de-la-plaza.ts`), no según
 * cuántos hay: si el 5 está ocupado, el encuadre tiene que caber aunque los demás se
 * hayan levantado. Por eso alternan lados (1 a la izquierda, 2 a la derecha, 3 a la
 * izquierda…): con dos sentados la plaza no se ve torcida.
 *
 * ═══ LO SEMBRADO Y LO FIJO ═══
 *
 * FIJO —y por tanto comprobable contra la cámara una sola vez—: los seis puestos, el
 * monumento, la calle, las aceras y los caminos. SEMBRADO con el código de la mesa:
 * las fachadas (cuál de los ocho cuerpos y de qué tono), las terrazas, los árboles,
 * los arbustos, los bancos de parque y los coches aparcados. Dos mesas se distinguen
 * a primera vista y los seis aparatos ven la misma plaza, que es lo que la semilla
 * compartida (`shared/mecanicas/semilla.ts`) existe para garantizar. Sin código —en la
 * orilla, eligiendo figura— se usa una semilla fija, para que la portada no cambie sola.
 */
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { sorteo } from '../embarcadero/cala';
import type { Calidad } from '../embarcadero/tipos';
import { PIEZA, RETICULA_DE_LA_CIUDAD } from '../burgo/piezas';
import type { NombreDePieza } from '../burgo/piezas';
import {
  ALTURA_DEL_ASFALTO,
  ALTURA_DEL_BORDILLO,
  ALZADO_DEL_COCHE,
  CARA,
  EJE_DEL_BORDILLO,
  EJE_DEL_CARRIL,
  piezaDeCalzada,
  radianesDeCuartos,
  tonoDeLaFachada,
  tonoDelEdificio,
} from '../burgo/ciudad';
import { largoDelCamino, ritmoDeLaEntrada } from './gestos-de-la-plaza';
import type { PuntoDelSuelo } from './gestos-de-la-plaza';

/* ══════════════════════════════════════════════════════════════════════════
 *  1. LA MEDIDA DE LA PLAZA
 * ══════════════════════════════════════════════════════════════════════════ */

/** La retícula de la ciudad, que es la de la plaza: doce. */
export const RETICULA = RETICULA_DE_LA_CIUDAD;
/** Siete celdas por lado: 84 × 84. El anillo de fuera es calle; las 5 × 5 de dentro, plaza. */
export const CELDAS_POR_LADO = 7;
export const LADO_DE_LA_PLAZA = CELDAS_POR_LADO * RETICULA;
/** La cara de arriba de una solera, que es el suelo por el que se anda. */
export const SUELO_DE_LA_PLAZA = ALTURA_DEL_BORDILLO;
/** Lo que sube un coche del pack sobre el asfalto y sobre una acera. */
export const COCHE_SOBRE_EL_ASFALTO = ALTURA_DEL_ASFALTO + ALZADO_DEL_COCHE;
export const COCHE_SOBRE_LA_SOLERA = ALTURA_DEL_BORDILLO + ALZADO_DEL_COCHE;
/** La celda del medio de cada lado del anillo: la del paso de cebra. */
export const CELDA_DEL_PASO = 3;
/** Hasta dónde llega la plaza de solera: el borde de las cinco celdas de dentro. */
export const BORDE_DE_LA_PLAZA = (LADO_DE_LA_PLAZA - 2 * RETICULA) / 2;

/** El centro de la celda (i, j) del cuadrado de siete, en el mundo. `i` y `j` pueden salirse: las fachadas están en −1 y 7. */
export function centroDeLaCelda(i: number, j: number): PuntoDelSuelo {
  const mitad = LADO_DE_LA_PLAZA / 2;
  return { x: -mitad + RETICULA * i + RETICULA / 2, z: -mitad + RETICULA * j + RETICULA / 2 };
}

/** ¿Es esta celda del anillo de calle? */
export function esCalle(i: number, j: number): boolean {
  return i === 0 || j === 0 || i === CELDAS_POR_LADO - 1 || j === CELDAS_POR_LADO - 1;
}

/** ¿Está esta celda dentro del cuadrado de siete? */
export function esDeLaPlaza(i: number, j: number): boolean {
  return i >= 0 && j >= 0 && i < CELDAS_POR_LADO && j < CELDAS_POR_LADO;
}

/**
 * EL GIRO DE UNA PIEZA QUE MIRA HACIA UN RUMBO CONTINUO.
 *
 * El convenio del pack es el de `burgo/ciudad.ts`: la fachada de un `cuerpo-*` y el
 * morro de un coche miran a su +Z local, así que el giro ES el rumbo (`atan2(dx, dz)`).
 * Se escribe como función para que se lea, y `verify:plaza` la contrasta con
 * `giroMirandoA` de la ciudad en los cuatro rumbos rectos.
 */
export function giroMirandoHacia(rumbo: number): number {
  return rumbo;
}

/**
 * EL GIRO DE UNA FAROLA O UN SEMÁFORO, QUE NO MIRAN: TIENDEN EL BRAZO.
 *
 * Medido en `burgo/ciudad.ts`: el mástil está en el origen y el brazo sale hacia el
 * −X local. Para que el brazo apunte al rumbo `r`, el giro es `π/2 − r`.
 * `verify:plaza` lo contrasta con `cuartosDelBrazoHacia` en los cuatro rumbos rectos.
 */
export function giroDelBrazoHacia(rumbo: number): number {
  return Math.PI / 2 - rumbo;
}

/** El rumbo que va de `a` a `b`, en el convenio del pack. */
export function rumboDe(a: PuntoDelSuelo, b: PuntoDelSuelo): number {
  return Math.atan2(b.x - a.x, b.z - a.z);
}

/* ══════════════════════════════════════════════════════════════════════════
 *  2. LOS TIPOS
 * ══════════════════════════════════════════════════════════════════════════ */

/** Una pieza de `burgo.glb` puesta en la plaza. `talla` es 1 salvo que se diga: el fichero ya va a escala del mundo. */
export interface PuestaDeLaPlaza {
  readonly pieza: NombreDePieza;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly giro: number;
  readonly talla: number;
  /** Lo menudo se cae en calidad sobria: sillas, arbustos, papeleras, farolas de parque. */
  readonly menudo?: boolean;
  /** Para las piezas con máscara `_TINTE` (el monumento): el color con el que se tiñen. */
  readonly tenir?: string;
  /**
   * UN MULTIPLICADOR del color horneado, para que dos fachadas del mismo modelo no
   * salgan idénticas. No es un tinte: el color del pack se conserva y sólo se aclara
   * o se oscurece, que es lo que hace `tonoDeLaFachada` en la ciudad con los prismas.
   */
  readonly matiz?: string;
}

/** Un bulto de geometría propia: el pedestal del monumento y el llano del fondo. */
export interface BultoDeLaPlaza {
  readonly clase: 'pedestal' | 'zocalo' | 'llano';
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly giro: number;
  readonly ancho: number;
  readonly alto: number;
  readonly fondo: number;
  readonly color: string;
  readonly triangulos: number;
}

/** Un puesto de espera: dónde se planta el aventurero, su mueble, y por dónde entra y sale. */
export interface PuestoDeLaPlaza {
  readonly indice: number;
  /** Donde se planta. La cota es `SUELO_DE_LA_PLAZA`. */
  readonly pie: PuntoDelSuelo;
  /** Hacia dónde da el puesto: el rumbo del ojo de referencia. */
  readonly giro: number;
  readonly banco: PuntoDelSuelo & { readonly giro: number };
  readonly farola: PuntoDelSuelo & { readonly giro: number };
  readonly bandera: PuntoDelSuelo & { readonly giro: number };
  /** Dónde está la bombilla de su farola, en el mundo: la escena pone ahí el halo y la luz. */
  readonly bombilla: { readonly x: number; readonly y: number; readonly z: number };
  /** El camino por el que entra andando, de la boca de calle a su sitio. */
  readonly entrada: readonly PuntoDelSuelo[];
  /** Por dónde sale corriendo al zarpar, hacia la calle del lado de la cámara. */
  readonly salida: readonly PuntoDelSuelo[];
  /** El `timeScale` del clip de andar para cubrir su entrada en lo que dura la llegada. */
  readonly ritmo: number;
}

export interface MonumentoDeLaPlaza {
  readonly x: number;
  readonly z: number;
  /** La cota a la que se planta la figura: encima del pedestal. */
  readonly y: number;
  readonly talla: number;
  readonly color: string;
  /** Lo que mide de alto el conjunto, para la línea de mirada del comprobador. */
  readonly alto: number;
  /** El radio de su huella en planta, para que nada se le acerque. */
  readonly radio: number;
}

export interface LaPlaza {
  readonly semilla: number;
  readonly calidad: Calidad;
  readonly puestos: readonly PuestoDeLaPlaza[];
  readonly piezas: readonly PuestaDeLaPlaza[];
  readonly bultos: readonly BultoDeLaPlaza[];
  readonly monumento: MonumentoDeLaPlaza;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  3. LOS SEIS PUESTOS Y EL MONUMENTO
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * LOS SEIS SITIOS, EN UNIDADES DEL MUNDO. El 0 es el local, delante y en el eje.
 *
 * Salieron de la búsqueda numérica contra la cámara (ver la cabecera). No se tocan sin
 * volver a pasar `verify:plaza`: mover uno medio metro puede juntar dos aventureros por
 * debajo del 6 % del ancho en 3:4, que es la ventana más apretada de las tres.
 */
export const SITIOS_DE_LOS_PUESTOS: readonly PuntoDelSuelo[] = [
  { x: 0, z: 22.5 },
  { x: -3.5, z: 12 },
  { x: 6.5, z: 6.5 },
  { x: -7.5, z: 6 },
  { x: 4.5, z: 0 },
  { x: 11, z: -1 },
];

/** El monumento: en el eje, delante de todos y detrás de nadie. */
export const SITIO_DEL_MONUMENTO: PuntoDelSuelo = { x: 0, z: -7.5 };

/**
 * EL OJO DE REFERENCIA: desde dónde se supone que se mira la plaza.
 *
 * Los bancos, las farolas y los estandartes se orientan CON ESTE PUNTO y no con la
 * cámara de verdad, que se mueve: un mueble que girara con la cámara sería un mueble
 * sobre un plato giratorio. Es la posición de la cámara de reposo en retrato con los
 * seis sentados, redondeada.
 */
export const OJO_DE_REFERENCIA: PuntoDelSuelo = { x: 0, z: 42 };

/** Lo que mide el pedestal: dos cajas, la de abajo más ancha. */
export const PEDESTAL = {
  base: { ancho: 7, alto: 1.2, triangulos: 16 },
  fuste: { ancho: 4.6, alto: 3.2, triangulos: 16 },
} as const;
/** La figura del monumento, a esta talla: mide 3,153 en el fichero, así que sale a 7,57. */
export const TALLA_DEL_MONUMENTO = 2.4;
/** El bronce del monumento. La `figura` se tiñe entera, así que conserva su volumen. */
export const BRONCE = '#a9784a';
/** La piedra del pedestal, y la del zócalo de abajo. */
export const PIEDRA = { base: '#cfc5ae', fuste: '#bcb29b' } as const;

/** El monumento, ya compuesto: la figura encima del pedestal. */
export const MONUMENTO: MonumentoDeLaPlaza = {
  x: SITIO_DEL_MONUMENTO.x,
  z: SITIO_DEL_MONUMENTO.z,
  y: SUELO_DE_LA_PLAZA + PEDESTAL.base.alto + PEDESTAL.fuste.alto,
  talla: TALLA_DEL_MONUMENTO,
  color: BRONCE,
  alto: PEDESTAL.base.alto + PEDESTAL.fuste.alto + 3.153 * TALLA_DEL_MONUMENTO,
  radio: PEDESTAL.base.ancho / 2,
};

/* ── Los muebles de un puesto: DETRÁS, y abriéndose ── */

/**
 * DÓNDE VA EL MUEBLE DE UN PUESTO, Y POR QUÉ NO A LOS LADOS.
 *
 * La primera versión ponía la farola a la izquierda y el estandarte a la derecha, que
 * es lo que uno dibuja. Medido, eso rompía dos cosas a la vez: quien llegaba por la
 * derecha ATRAVESABA su propio estandarte —el camino pasaba a 0,4 de él— y, en los
 * puestos que se entran de frente, la farola quedaba entre el aventurero y la cámara,
 * o sea un poste de 5,76 cruzándole la cara.
 *
 * Así que los tres muebles van DETRÁS, en el sentido contrario al ojo de referencia, y
 * abriéndose 28° a cada lado: el banco en el eje, y la farola y el estandarte en las
 * dos ramas. Con eso queda libre todo el semiplano que da a la cámara —por donde se
 * mira y por donde se sale corriendo— y queda libre el pasillo por el que se llega,
 * porque el que llega viene por un lado y no por detrás. Cuál de las dos ramas se
 * lleva el estandarte lo decide el camino de entrada: se le da la MÁS LEJANA de él,
 * porque el estandarte tiene peana (1,35 de radio al andar) y la farola es un poste de
 * un palmo por el que se pasa al lado sin tocarlo.
 */
export const MUEBLE_DEL_PUESTO = {
  banco: { atras: 2.4 },
  rama: { atras: 2.6, abre: (28 * Math.PI) / 180 },
} as const;
/** A qué altura queda la bombilla de la farola del pack, medido: el brazo acaba a 5,55 y sale 1,3 hacia el −X local. */
export const BOMBILLA = { alto: 5.5, brazo: 1.3 } as const;
/**
 * LA TALLA DEL ESTANDARTE: 0,9, y el número salió de mirarlo en el banco.
 *
 * El banderín del pack mide 3,628 de alto por 2,61 de ancho. Puesto a 1,4 —que es lo que
 * se escribió para que llegara «a la altura de una farola»— sale de CINCO unidades: el
 * doble que la persona que tiene al lado, y en el banco se veía un trapo enorme delante
 * del local. A 0,9 mide 3,27, una persona y cuarto: el color se lee desde el fondo de la
 * plaza y no le come la cara a nadie.
 */
export const TALLA_DE_LA_BANDERA = 0.9;

/* ── Las bocas de calle: los cuatro pasos de cebra, por dentro de la plaza ── */

/** Por dónde se entra en la plaza: el borde interior de cada paso de cebra. */
export const BOCAS: Readonly<Record<'frente' | 'izquierda' | 'derecha' | 'fondo', PuntoDelSuelo>> = {
  frente: { x: 0, z: BORDE_DE_LA_PLAZA },
  izquierda: { x: -BORDE_DE_LA_PLAZA, z: 0 },
  derecha: { x: BORDE_DE_LA_PLAZA, z: 0 },
  fondo: { x: 0, z: -BORDE_DE_LA_PLAZA },
};

/**
 * LOS CAMINOS DE ENTRADA, uno por puesto.
 *
 * Cada uno sale de la boca de calle que le pilla de camino y llega a su sitio, con un
 * punto de paso cuando hace falta apartarse de alguien: el del puesto 1 entra por el
 * frente y rodea al local por la izquierda, porque en línea recta le pasaría a metro y
 * medio de la cara.
 *
 * El largo manda: la fase de llegada dura 4,83 s y se anda a cuatro unidades por
 * segundo, así que un camino de más de 29 unidades obligaría a acelerar el clip por
 * encima de 1,5 y las piernas se verían patinar. `verify:plaza` mide los seis.
 */
const CAMINOS_DE_ENTRADA: readonly (readonly PuntoDelSuelo[])[] = [
  /* El local entra por delante y da un rodeo: en línea recta su camino mediría 7,5 y el paso saldría a medio gas. */
  [BOCAS.frente, { x: 8, z: 28 }, { x: 3, z: 24 }, SITIOS_DE_LOS_PUESTOS[0] as PuntoDelSuelo],
  [BOCAS.frente, { x: -7, z: 24 }, SITIOS_DE_LOS_PUESTOS[1] as PuntoDelSuelo],
  [BOCAS.derecha, SITIOS_DE_LOS_PUESTOS[2] as PuntoDelSuelo],
  [BOCAS.izquierda, SITIOS_DE_LOS_PUESTOS[3] as PuntoDelSuelo],
  /* El 4 rodea por delante del 5: en recta le pasaría a 2,8 del pie, o sea por encima. */
  [BOCAS.derecha, { x: 17, z: 4 }, SITIOS_DE_LOS_PUESTOS[4] as PuntoDelSuelo],
  [BOCAS.derecha, SITIOS_DE_LOS_PUESTOS[5] as PuntoDelSuelo],
];

/**
 * POR DÓNDE SE SALE CORRIENDO: hacia la calle del lado de la cámara, POR DONDE SE PUEDE.
 *
 * La primera versión abría las seis carreras en abanico —cada uno apartándose del eje
 * según de qué lado estuviera— y el comprobador la tiró con dos números: la del puesto 4
 * pasaba a 1,57 del PIE del puesto 2 (o sea, por encima de una persona) y la que se abría
 * más se llevaba por delante un semáforo del paso de cebra, con veintiún centímetros de
 * paso negativo. Un abanico escrito a ojo no puede saber dónde están los muebles.
 *
 * Así que la salida no se escribe: SE BUSCA. Para cada puesto se prueban treinta y siete
 * puntos de la calle del lado de la cámara y se mide, para cada uno, el claro más
 * estrecho que deja la recta contra todo lo fijo que hay en medio —la gente de los otros
 * puestos, sus bancos, sus farolas, sus estandartes, los semáforos y las farolas de la
 * calle—. Se queda el que más claro deja, y entre los que dejan bastante (`CLARO_DEL_PASILLO`),
 * el que menos desvía de la carrera natural hacia fuera. Es determinista, no depende de
 * la semilla, y el día que alguien mueva un mueble las salidas se recolocan solas.
 */
export const CLARO_DEL_PASILLO = 0.7;
/** Hasta dónde se aparta del eje una carrera, y a qué profundidad de la calle se apunta. */
const SALIDA = { desvio: 16, paso: 1, z: BORDE_DE_LA_PLAZA + 6 } as const;

interface Estorbo {
  readonly x: number;
  readonly z: number;
  readonly radio: number;
}

/** Lo fijo que un pasillo tiene que esquivar: la gente de los otros puestos, sus muebles y los de la calle. */
function estorbosDeLaSalida(puestos: readonly PuestoEnObra[], mio: number): Estorbo[] {
  const estorbos: Estorbo[] = [];
  for (const p of puestos) {
    /* El pie propio es el principio del camino: no se esquiva a uno mismo. */
    if (p.indice !== mio) estorbos.push({ x: p.pie.x, z: p.pie.z, radio: 1.4 });
    estorbos.push({ x: p.banco.x, z: p.banco.z, radio: huellaAlAndar(PIEZA.bancoDeCalle) });
    estorbos.push({ x: p.farola.x, z: p.farola.z, radio: huellaAlAndar(PIEZA.farolaDeCalle) });
    estorbos.push({ x: p.bandera.x, z: p.bandera.z, radio: huellaAlAndar(PIEZA.bandera) });
  }
  for (const m of mobiliarioDeLaCalle()) estorbos.push({ x: m.x, z: m.z, radio: huellaAlAndar(m.pieza) });
  return estorbos;
}

function caminoDeSalida(puestos: readonly PuestoEnObra[], mio: number): readonly PuntoDelSuelo[] {
  const puesto = puestos[mio] as PuestoEnObra;
  const pie = puesto.pie;
  const estorbos = estorbosDeLaSalida(puestos, mio);
  /* La carrera natural: hacia fuera y hacia la cámara, apartándose del eje. */
  const natural = Math.max(-SALIDA.desvio, Math.min(SALIDA.desvio, pie.x * 1.25 + (pie.x === 0 ? 3 : 0)));
  let mejor = { x: natural, claro: -Infinity, desvio: 0 };
  for (let x = -SALIDA.desvio; x <= SALIDA.desvio; x += SALIDA.paso) {
    const destino = { x, z: SALIDA.z };
    let claro = Infinity;
    for (const e of estorbos) claro = Math.min(claro, distanciaAlTramo({ x: e.x, z: e.z }, pie, destino) - e.radio);
    const desvio = Math.abs(x - natural);
    const mejorClaro = Math.min(mejor.claro, CLARO_DEL_PASILLO);
    if (Math.min(claro, CLARO_DEL_PASILLO) > mejorClaro || (Math.min(claro, CLARO_DEL_PASILLO) === mejorClaro && desvio < mejor.desvio)) {
      mejor = { x, claro, desvio };
    }
  }
  const destino = { x: mejor.x, z: SALIDA.z };
  return [pie, destino, { x: destino.x * 1.15, z: LADO_DE_LA_PLAZA / 2 + 10 }];
}

/** Un puesto a medio hacer: todo menos la salida, que se busca cuando ya están los seis. */
type PuestoEnObra = Omit<PuestoDeLaPlaza, 'salida'>;

/**
 * LOS SEIS PUESTOS, en dos pasadas y no en una.
 *
 * Primero los sitios, los muebles y los caminos de entrada, que sólo dependen de cada
 * puesto; después las salidas, que dependen de DÓNDE ESTÁ TODO LO DEMÁS. En una sola
 * pasada, la salida del primero no sabría dónde va a estar el banco del quinto.
 *
 * No dependen de la semilla: la cámara se comprueba contra ellos una vez y vale para
 * todas las mesas.
 */
export function puestosDeLaPlaza(): PuestoDeLaPlaza[] {
  const enObra: PuestoEnObra[] = SITIOS_DE_LOS_PUESTOS.map((pie, indice) => {
    const giro = rumboDe(pie, OJO_DE_REFERENCIA);
    const entrada = CAMINOS_DE_ENTRADA[indice] as readonly PuntoDelSuelo[];
    /* Un punto a `d` del pie, en el rumbo `r`. Los muebles se colocan así y no con un marco fijo. */
    const en = (rumbo: number, d: number): PuntoDelSuelo => ({ x: pie.x + Math.sin(rumbo) * d, z: pie.z + Math.cos(rumbo) * d });
    const atras = giro + Math.PI;
    /* Por dónde viene el que llega, visto desde el pie: el último tramo del camino, al revés. */
    const anterior = entrada[entrada.length - 2] ?? OJO_DE_REFERENCIA;
    const porDondeLlega = rumboDe(pie, anterior);
    const ramas = [atras - MUEBLE_DEL_PUESTO.rama.abre, atras + MUEBLE_DEL_PUESTO.rama.abre];
    /* La rama más lejos de por donde llega se lleva el estandarte, que es el que tiene peana. */
    const aparte = (r: number): number => Math.abs(Math.atan2(Math.sin(r - porDondeLlega), Math.cos(r - porDondeLlega)));
    const paraLaBandera = (aparte(ramas[0] as number) >= aparte(ramas[1] as number) ? ramas[0] : ramas[1]) as number;
    const paraLaFarola = (paraLaBandera === ramas[0] ? ramas[1] : ramas[0]) as number;
    const farola = en(paraLaFarola, MUEBLE_DEL_PUESTO.rama.atras);
    /* El brazo de la farola apunta al aventurero, así que la bombilla queda sobre él. */
    const haciaElPuesto = rumboDe(farola, pie);
    return {
      indice,
      pie,
      giro,
      banco: { ...en(atras, MUEBLE_DEL_PUESTO.banco.atras), giro },
      farola: { ...farola, giro: giroDelBrazoHacia(haciaElPuesto) },
      bandera: { ...en(paraLaBandera, MUEBLE_DEL_PUESTO.rama.atras), giro },
      bombilla: {
        x: farola.x + Math.sin(haciaElPuesto) * BOMBILLA.brazo,
        y: SUELO_DE_LA_PLAZA + BOMBILLA.alto,
        z: farola.z + Math.cos(haciaElPuesto) * BOMBILLA.brazo,
      },
      entrada,
      ritmo: ritmoDeLaEntrada(largoDelCamino(entrada)),
    };
  });
  return enObra.map((p, i) => ({ ...p, salida: caminoDeSalida(enObra, i) }));
}

/** El sitio del local, que es contra lo que se encuadra la cámara. */
export const PIE_DEL_LOCAL = { x: SITIOS_DE_LOS_PUESTOS[0]?.x ?? 0, y: SUELO_DE_LA_PLAZA, z: SITIOS_DE_LOS_PUESTOS[0]?.z ?? 0 };

/* ══════════════════════════════════════════════════════════════════════════
 *  4. LAS HUELLAS: CUÁNTO SITIO OCUPA CADA PIEZA EN PLANTA
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * EL RADIO EN PLANTA DE LAS PIEZAS QUE SE SIEMBRAN, medido sobre `burgo.glb` y
 * redondeado HACIA ARRIBA.
 *
 * Hace falta aquí —y no sólo en el comprobador— porque la siembra RECHAZA lo que no
 * cabe: un pino a dos unidades del camino de entrada se atraviesa al andar. Que esta
 * tabla no se quede corta lo vigila `verify:plaza`, que vuelve a medir las cajas del
 * fichero de verdad y exige que ninguna pase de lo declarado.
 */
export const HUELLA: Readonly<Record<string, number>> = {
  [PIEZA.pino]: 1.8,
  [PIEZA.pinoGrande]: 2.5,
  [PIEZA.pinoPequeno]: 1.3,
  [PIEZA.pinoRojo]: 1.8,
  [PIEZA.arbusto]: 0.7,
  [PIEZA.bancoDeParque]: 1.1,
  [PIEZA.bancoDeCalle]: 1.3,
  [PIEZA.mesaRedonda]: 1.6,
  [PIEZA.silla]: 0.5,
  [PIEZA.papelera]: 0.5,
  [PIEZA.bocaDeRiego]: 0.5,
  [PIEZA.contenedor]: 2.1,
  [PIEZA.farolaDeCalle]: 1.5,
  [PIEZA.farolaDeParque]: 1.4,
  [PIEZA.semaforoA]: 0.9,
  [PIEZA.semaforoC]: 4.7,
  [PIEZA.bandera]: 1.7,
  [PIEZA.figura]: 1.3,
  [PIEZA.cocheBerlina]: 3,
  [PIEZA.cocheUtilitario]: 2.6,
  [PIEZA.cocheFamiliar]: 3,
  [PIEZA.cocheTaxi]: 3,
  [PIEZA.cochePatrulla]: 3,
};

/**
 * LO QUE ESTORBA A QUIEN ANDA, que no es lo mismo que lo que ocupa la caja de la pieza.
 *
 * Por debajo de la altura de una persona, una farola es un poste de un palmo y un
 * semáforo otro: se pasa a su lado sin tocarlos, y su caja es grande sólo porque el
 * brazo vuela cinco metros por encima de la cabeza. Un estandarte, en cambio, tiene
 * PEANA, y un banco es un banco. Los caminos de entrada y de salida se miden contra
 * ESTA tabla; el atrezo sembrado, contra `HUELLA`, que es la caja entera.
 */
export const HUELLA_AL_ANDAR: Readonly<Record<string, number>> = {
  [PIEZA.farolaDeCalle]: 0.25,
  [PIEZA.semaforoA]: 0.3,
  [PIEZA.farolaDeParque]: 0.35,
  [PIEZA.bandera]: 1.35,
  [PIEZA.bancoDeCalle]: 1.3,
};

/** Lo que estorba al andar una pieza: su poste si lo es, y su caja entera si no. */
export function huellaAlAndar(pieza: string): number {
  return HUELLA_AL_ANDAR[pieza] ?? HUELLA[pieza] ?? 1;
}

/** Lo que se le deja libre a un puesto alrededor: el aventurero, su banco y su estandarte. */
export const CLARO_DEL_PUESTO = 3.4;
/** Y lo que se le deja libre a un camino, a cada lado. */
export const CLARO_DEL_CAMINO = 1.8;

/** La distancia de un punto al segmento `a`-`b`. */
export function distanciaAlTramo(p: PuntoDelSuelo, a: PuntoDelSuelo, b: PuntoDelSuelo): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const largo = dx * dx + dz * dz;
  const t = largo < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / largo));
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}

/** La distancia de un punto a una polilínea. */
export function distanciaAlCamino(p: PuntoDelSuelo, camino: readonly PuntoDelSuelo[]): number {
  let mejor = Infinity;
  for (let i = 1; i < camino.length; i++) {
    mejor = Math.min(mejor, distanciaAlTramo(p, camino[i - 1] as PuntoDelSuelo, camino[i] as PuntoDelSuelo));
  }
  return mejor;
}

/** ¿Cabe aquí una pieza de este radio sin pisar un puesto, un camino ni el monumento? */
export function cabeElAtrezo(p: PuntoDelSuelo, radio: number, puestos: readonly PuestoDeLaPlaza[]): boolean {
  if (Math.hypot(p.x - MONUMENTO.x, p.z - MONUMENTO.z) < MONUMENTO.radio + radio + 1.2) return false;
  for (const puesto of puestos) {
    if (Math.hypot(p.x - puesto.pie.x, p.z - puesto.pie.z) < CLARO_DEL_PUESTO + radio) return false;
    if (distanciaAlCamino(p, puesto.entrada) < CLARO_DEL_CAMINO + radio) return false;
    if (distanciaAlCamino(p, puesto.salida) < CLARO_DEL_CAMINO + radio) return false;
  }
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  5. LA CALLE, LAS ACERAS Y LAS FACHADAS
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * EL ANILLO DE CALLE: la pieza de cada celda sale de sus vecinas y de nada más.
 *
 * Es la regla de `piezaDeCalzada` de la ciudad, sin excepciones: se mira qué vecinas
 * son calle, se pide una losa que abra por ahí y se gira hasta que encaja. Las cuatro
 * esquinas salen curva —dos caras abiertas en ele— y se cambian por la CURVA SUAVE,
 * que es la misma losa con el acuerdo redondeado y veinte triángulos más: una plaza con
 * las esquinas en ángulo recto se lee como un aparcamiento. En el centro de cada lado
 * va el paso de cebra, que es la misma recta con la cebra pintada (las caras abiertas
 * son las mismas, así que el giro no cambia).
 */
function anilloDeCalle(): PuestaDeLaPlaza[] {
  const puestas: PuestaDeLaPlaza[] = [];
  for (let i = 0; i < CELDAS_POR_LADO; i++) {
    for (let j = 0; j < CELDAS_POR_LADO; j++) {
      if (!esCalle(i, j)) continue;
      let abre = 0;
      if (esDeLaPlaza(i + 1, j) && esCalle(i + 1, j)) abre |= CARA.este;
      if (esDeLaPlaza(i, j + 1) && esCalle(i, j + 1)) abre |= CARA.sur;
      if (esDeLaPlaza(i - 1, j) && esCalle(i - 1, j)) abre |= CARA.oeste;
      if (esDeLaPlaza(i, j - 1) && esCalle(i, j - 1)) abre |= CARA.norte;
      const losa = piezaDeCalzada(abre);
      if (losa === null) continue;
      const centro = centroDeLaCelda(i, j);
      const esPaso =
        (i === CELDA_DEL_PASO && (j === 0 || j === CELDAS_POR_LADO - 1)) ||
        (j === CELDA_DEL_PASO && (i === 0 || i === CELDAS_POR_LADO - 1));
      const pieza = esPaso ? PIEZA.calzadaPaso : losa.pieza === PIEZA.calzadaCurva ? PIEZA.calzadaCurvaSuave : losa.pieza;
      puestas.push({ pieza, x: centro.x, y: 0, z: centro.z, giro: radianesDeCuartos(losa.cuartos), talla: 1 });
    }
  }
  return puestas;
}

/** Las veinticinco soleras de dentro: el suelo de la plaza. */
function soleraDeLaPlaza(): PuestaDeLaPlaza[] {
  const puestas: PuestaDeLaPlaza[] = [];
  for (let i = 1; i < CELDAS_POR_LADO - 1; i++) {
    for (let j = 1; j < CELDAS_POR_LADO - 1; j++) {
      const centro = centroDeLaCelda(i, j);
      puestas.push({ pieza: PIEZA.solera, x: centro.x, y: 0, z: centro.z, giro: 0, talla: 1 });
    }
  }
  return puestas;
}

/**
 * LOS CUERPOS QUE PUEDEN SER FACHADA, del más barato al más caro, y cuántas veces sale
 * cada uno. Los baratos pesan más en el sorteo a propósito: diecinueve fachadas de
 * `cuerpo-h` son cuatro mil triángulos más que diecinueve de `cuerpo-a`, y desde la
 * plaza se ven las dos primeras plantas.
 */
const CUERPOS_DE_FACHADA: readonly { readonly pieza: NombreDePieza; readonly peso: number }[] = [
  { pieza: PIEZA.cuerpoA, peso: 5 },
  { pieza: PIEZA.cuerpoB, peso: 5 },
  { pieza: PIEZA.cuerpoC, peso: 4 },
  { pieza: PIEZA.cuerpoD, peso: 3 },
  { pieza: PIEZA.cuerpoE, peso: 2 },
  { pieza: PIEZA.cuerpoF, peso: 2 },
  { pieza: PIEZA.cuerpoG, peso: 2 },
  { pieza: PIEZA.cuerpoH, peso: 1 },
];

/** Lo que se retranquea un cuerpo respecto del centro de su celda, para dejar acera delante. */
export const RETRANQUEO_DE_LA_FACHADA = 1.5;

/**
 * LAS CELDAS DE FACHADA: la fila del fondo entera y cinco de cada lado.
 *
 * El fondo cierra la plaza en el encuadre de reposo —es lo que se ve por encima de las
 * cabezas— y los lados sólo entran en el zarpe, cuando la cámara sube. Las dos celdas
 * de cada lado más cercanas a la cámara se quedan sin edificio a propósito: taparían la
 * entrada de la plaza por los lados y el zarpe se vería desde dentro de un pozo.
 */
function celdasDeFachada(): { readonly i: number; readonly j: number; readonly mira: number }[] {
  const celdas: { i: number; j: number; mira: number }[] = [];
  for (let i = -1; i <= CELDAS_POR_LADO; i++) celdas.push({ i, j: -1, mira: 0 });
  for (let j = 0; j < CELDAS_POR_LADO - 2; j++) {
    celdas.push({ i: -1, j, mira: Math.PI / 2 });
    celdas.push({ i: CELDAS_POR_LADO, j, mira: -Math.PI / 2 });
  }
  return celdas;
}

/** Las fachadas: una solera por celda y un cuerpo encima, sembrados. */
function fachadas(azar: () => number): PuestaDeLaPlaza[] {
  const puestas: PuestaDeLaPlaza[] = [];
  const total = CUERPOS_DE_FACHADA.reduce((s, c) => s + c.peso, 0);
  for (const celda of celdasDeFachada()) {
    const centro = centroDeLaCelda(celda.i, celda.j);
    puestas.push({ pieza: PIEZA.solera, x: centro.x, y: 0, z: centro.z, giro: 0, talla: 1 });
    let tirada = azar() * total;
    let elegido = CUERPOS_DE_FACHADA[0] as { pieza: NombreDePieza; peso: number };
    for (const c of CUERPOS_DE_FACHADA) {
      tirada -= c.peso;
      if (tirada <= 0) {
        elegido = c;
        break;
      }
    }
    /* Retranqueado hacia atrás, en el sentido contrario al que mira. */
    const x = centro.x - Math.sin(celda.mira) * RETRANQUEO_DE_LA_FACHADA;
    const z = centro.z - Math.cos(celda.mira) * RETRANQUEO_DE_LA_FACHADA;
    puestas.push({
      pieza: elegido.pieza,
      x,
      y: 0,
      z,
      giro: giroMirandoHacia(celda.mira),
      talla: 1,
      matiz: matizDeLaFachada(elegido.pieza, celda.i, celda.j),
    });
  }
  return puestas;
}

/**
 * EL MATIZ DE UNA FACHADA: lo que hay que multiplicar su color horneado para que esta
 * casa no sea idéntica a la de al lado.
 *
 * `tonoDeLaFachada` de la ciudad aparta el tono de un modelo un ±16 % según la parcela,
 * y allí se usa como color de instancia de un prisma blanco. Aquí la pieza trae su
 * color dentro, así que lo que se guarda es la RELACIÓN entre el tono apartado y el
 * tono del modelo: multiplicarla por el color horneado da exactamente el mismo
 * resultado que la ciudad, sin repintar nada.
 */
export function matizDeLaFachada(pieza: NombreDePieza, i: number, j: number): string {
  const base = tonoDelEdificio(pieza);
  const apartado = tonoDeLaFachada(base, i, j);
  const canal = (desplazamiento: number): string => {
    const b = (parseInt(base.slice(1), 16) >> desplazamiento) & 255;
    const a = (parseInt(apartado.slice(1), 16) >> desplazamiento) & 255;
    const r = Math.max(0, Math.min(255, Math.round((b === 0 ? 1 : a / b) * 128)));
    return (r < 16 ? '0' : '') + r.toString(16);
  };
  return `#${canal(16)}${canal(8)}${canal(0)}`;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  6. EL MOBILIARIO DE LA CALLE Y EL ATREZO SEMBRADO
 * ══════════════════════════════════════════════════════════════════════════ */

/** Los cuatro pasos de cebra, con el rumbo que mira hacia dentro de la plaza. */
const PASOS: readonly { readonly i: number; readonly j: number; readonly haciaDentro: number }[] = [
  { i: CELDA_DEL_PASO, j: 0, haciaDentro: 0 },
  { i: CELDA_DEL_PASO, j: CELDAS_POR_LADO - 1, haciaDentro: Math.PI },
  { i: 0, j: CELDA_DEL_PASO, haciaDentro: Math.PI / 2 },
  { i: CELDAS_POR_LADO - 1, j: CELDA_DEL_PASO, haciaDentro: -Math.PI / 2 },
];

/** Semáforos a los dos lados de cada paso, en el bordillo de dentro, y farolas entre medias. */
function mobiliarioDeLaCalle(): PuestaDeLaPlaza[] {
  const puestas: PuestaDeLaPlaza[] = [];
  for (const paso of PASOS) {
    const centro = centroDeLaCelda(paso.i, paso.j);
    const dentro = { x: Math.sin(paso.haciaDentro), z: Math.cos(paso.haciaDentro) };
    const lado = { x: dentro.z, z: -dentro.x };
    for (const s of [-1, 1]) {
      const x = centro.x + dentro.x * EJE_DEL_BORDILLO + lado.x * (RETICULA / 2 + 0.6) * s;
      const z = centro.z + dentro.z * EJE_DEL_BORDILLO + lado.z * (RETICULA / 2 + 0.6) * s;
      puestas.push({ pieza: PIEZA.semaforoA, x, y: SUELO_DE_LA_PLAZA, z, giro: giroDelBrazoHacia(paso.haciaDentro + Math.PI), talla: 1 });
    }
  }
  /* Ocho farolas de calle, dos por lado, en el bordillo de dentro del anillo. */
  for (const paso of PASOS) {
    const dentro = { x: Math.sin(paso.haciaDentro), z: Math.cos(paso.haciaDentro) };
    const lado = { x: dentro.z, z: -dentro.x };
    for (const s of [-1, 1]) {
      const centro = centroDeLaCelda(paso.i + Math.round(lado.x) * 2 * s, paso.j + Math.round(lado.z) * 2 * s);
      const x = centro.x + dentro.x * EJE_DEL_BORDILLO;
      const z = centro.z + dentro.z * EJE_DEL_BORDILLO;
      puestas.push({ pieza: PIEZA.farolaDeCalle, x, y: SUELO_DE_LA_PLAZA, z, giro: giroDelBrazoHacia(paso.haciaDentro + Math.PI), talla: 1, menudo: true });
    }
  }
  return puestas;
}

/** Dónde puede haber un coche aparcado: en el carril de dentro de cada lado del anillo, junto al bordillo. */
const APARCAMIENTOS: readonly { readonly i: number; readonly j: number; readonly haciaDentro: number }[] = [
  { i: 1, j: 0, haciaDentro: 0 },
  { i: 5, j: 0, haciaDentro: 0 },
  { i: 1, j: CELDAS_POR_LADO - 1, haciaDentro: Math.PI },
  { i: 5, j: CELDAS_POR_LADO - 1, haciaDentro: Math.PI },
  { i: 0, j: 1, haciaDentro: Math.PI / 2 },
  { i: 0, j: 5, haciaDentro: Math.PI / 2 },
  { i: CELDAS_POR_LADO - 1, j: 1, haciaDentro: -Math.PI / 2 },
  { i: CELDAS_POR_LADO - 1, j: 5, haciaDentro: -Math.PI / 2 },
];

const COCHES: readonly NombreDePieza[] = [PIEZA.cocheBerlina, PIEZA.cocheUtilitario, PIEZA.cocheFamiliar, PIEZA.cocheTaxi];

/** Dos a cuatro coches aparcados, sembrados: cuáles, dónde y en qué sentido. */
function cochesAparcados(azar: () => number): PuestaDeLaPlaza[] {
  const sitios = [...APARCAMIENTOS];
  /* Barajado de Fisher-Yates con el sorteo de la mesa: el mismo código, los mismos coches. */
  for (let i = sitios.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    const a = sitios[i] as (typeof sitios)[number];
    sitios[i] = sitios[j] as (typeof sitios)[number];
    sitios[j] = a;
  }
  const cuantos = 2 + Math.floor(azar() * 3);
  return sitios.slice(0, cuantos).map((sitio) => {
    const centro = centroDeLaCelda(sitio.i, sitio.j);
    const dentro = { x: Math.sin(sitio.haciaDentro), z: Math.cos(sitio.haciaDentro) };
    const lado = { x: dentro.z, z: -dentro.x };
    /* En el carril de dentro, y con el morro hacia uno de los dos lados de la calle. */
    const sentido = azar() < 0.5 ? 1 : -1;
    return {
      pieza: COCHES[Math.floor(azar() * COCHES.length)] as NombreDePieza,
      x: centro.x + dentro.x * EJE_DEL_CARRIL,
      y: COCHE_SOBRE_EL_ASFALTO,
      z: centro.z + dentro.z * EJE_DEL_CARRIL,
      giro: giroMirandoHacia(Math.atan2(lado.x * sentido, lado.z * sentido)),
      talla: 1,
    };
  });
}

/**
 * LOS SITIOS DE ATREZO: una corona de anclas alrededor de la plaza, por dentro de la
 * acera y por fuera del arco de puestos.
 *
 * Se escriben a mano y no se sortean sobre el cuadrado entero porque el atrezo tiene
 * que estar DONDE NO MOLESTA: pegado al borde, dejando libre el centro —que es donde
 * se ve la gente— y los caminos por los que se entra y se sale. Lo que la semilla
 * decide es QUÉ va en cada ancla, cuánto se aparta de ella y hacia dónde mira; y lo que
 * no cabe, no se pone (`cabeElAtrezo`).
 */
const ANCLAS: readonly PuntoDelSuelo[] = [
  { x: -24, z: 22 },
  { x: -24, z: 12 },
  { x: -24, z: 2 },
  { x: -24, z: -10 },
  { x: -22, z: -20 },
  { x: -12, z: -24 },
  { x: 0, z: -22 },
  { x: 12, z: -24 },
  { x: 22, z: -20 },
  { x: 24, z: -10 },
  { x: 24, z: 2 },
  { x: 24, z: 12 },
  { x: 24, z: 22 },
  { x: -14, z: 24 },
  { x: 14, z: 24 },
  { x: -16, z: -12 },
  { x: 16, z: -12 },
];

/** Lo que puede caer en un ancla, con su peso y si es menudo. */
const ATREZO: readonly { readonly pieza: NombreDePieza; readonly peso: number; readonly menudo?: boolean }[] = [
  { pieza: PIEZA.pino, peso: 4 },
  { pieza: PIEZA.pinoGrande, peso: 3 },
  { pieza: PIEZA.pinoPequeno, peso: 2, menudo: true },
  { pieza: PIEZA.arbusto, peso: 3, menudo: true },
  { pieza: PIEZA.bancoDeParque, peso: 3 },
  { pieza: PIEZA.farolaDeParque, peso: 2, menudo: true },
  { pieza: PIEZA.papelera, peso: 1, menudo: true },
  { pieza: PIEZA.bocaDeRiego, peso: 1, menudo: true },
];

/** El arbolado, los bancos y lo menudo, sembrados sobre las anclas. */
function atrezoSembrado(azar: () => number, puestos: readonly PuestoDeLaPlaza[]): PuestaDeLaPlaza[] {
  const puestas: PuestaDeLaPlaza[] = [];
  const total = ATREZO.reduce((s, a) => s + a.peso, 0);
  for (const ancla of ANCLAS) {
    if (azar() < 0.18) continue;
    let tirada = azar() * total;
    let elegido = ATREZO[0] as (typeof ATREZO)[number];
    for (const a of ATREZO) {
      tirada -= a.peso;
      if (tirada <= 0) {
        elegido = a;
        break;
      }
    }
    const sitio = { x: ancla.x + (azar() * 2 - 1) * 2.4, z: ancla.z + (azar() * 2 - 1) * 2.4 };
    const radio = HUELLA[elegido.pieza] ?? 1;
    if (!cabeElAtrezo(sitio, radio, puestos)) continue;
    if (puestas.some((p) => Math.hypot(p.x - sitio.x, p.z - sitio.z) < radio + (HUELLA[p.pieza] ?? 1))) continue;
    puestas.push({
      pieza: elegido.pieza,
      x: sitio.x,
      y: SUELO_DE_LA_PLAZA,
      z: sitio.z,
      giro: azar() * Math.PI * 2,
      talla: 1,
      menudo: elegido.menudo,
    });
  }
  return puestas;
}

/** Los sitios donde puede haber una terraza de café: pegadas al borde, mirando al centro. */
const TERRAZAS: readonly PuntoDelSuelo[] = [
  { x: -18, z: 17 },
  { x: 18, z: 16 },
  { x: -19, z: -4 },
  { x: 19, z: -5 },
  { x: -8, z: -18 },
  { x: 8, z: -18 },
];

/** Dos o tres terrazas, con su mesa y tres o cuatro sillas alrededor. */
function terrazas(azar: () => number, puestos: readonly PuestoDeLaPlaza[]): PuestaDeLaPlaza[] {
  const sitios = [...TERRAZAS];
  for (let i = sitios.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    const a = sitios[i] as PuntoDelSuelo;
    sitios[i] = sitios[j] as PuntoDelSuelo;
    sitios[j] = a;
  }
  const cuantas = 2 + Math.floor(azar() * 2);
  const puestas: PuestaDeLaPlaza[] = [];
  let puestas_ok = 0;
  for (const sitio of sitios) {
    if (puestas_ok >= cuantas) break;
    if (!cabeElAtrezo(sitio, 3.2, puestos)) continue;
    puestas_ok++;
    puestas.push({ pieza: PIEZA.mesaRedonda, x: sitio.x, y: SUELO_DE_LA_PLAZA, z: sitio.z, giro: azar() * Math.PI * 2, talla: 1 });
    const cuantasSillas = 3 + Math.floor(azar() * 2);
    const vuelta = azar() * Math.PI * 2;
    for (let s = 0; s < cuantasSillas; s++) {
      const angulo = vuelta + (s * Math.PI * 2) / cuantasSillas;
      const x = sitio.x + Math.sin(angulo) * 2.5;
      const z = sitio.z + Math.cos(angulo) * 2.5;
      /* La silla mira a su mesa. */
      puestas.push({ pieza: PIEZA.silla, x, y: SUELO_DE_LA_PLAZA, z, giro: giroMirandoHacia(angulo + Math.PI), talla: 1, menudo: true });
    }
  }
  return puestas;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  7. LA PLAZA ENTERA
 * ══════════════════════════════════════════════════════════════════════════ */

/** La semilla de la plaza de una mesa. Sin código, la fija: la portada no cambia sola. */
export const SEMILLA_SIN_CODIGO = 0x504c_415a;
export function semillaDeLaPlaza(codigo: string | null | undefined): number {
  return semillaDelCodigo(codigo, SEMILLA_SIN_CODIGO);
}

/** El suelo de más allá de las fachadas: un cuadro tumbado para que el zarpe no enseñe el vacío. */
export const LLANO = { lado: 640, color: '#9a968b' } as const;

/** Los bultos propios: el pedestal en dos cuerpos y el llano del fondo. */
function bultosDeLaPlaza(): BultoDeLaPlaza[] {
  return [
    {
      clase: 'llano',
      x: 0,
      y: -0.06,
      z: 0,
      giro: 0,
      ancho: LLANO.lado,
      alto: 0.06,
      fondo: LLANO.lado,
      color: LLANO.color,
      triangulos: 2,
    },
    {
      clase: 'zocalo',
      x: MONUMENTO.x,
      y: SUELO_DE_LA_PLAZA,
      z: MONUMENTO.z,
      giro: 0,
      ancho: PEDESTAL.base.ancho,
      alto: PEDESTAL.base.alto,
      fondo: PEDESTAL.base.ancho,
      color: PIEDRA.base,
      triangulos: PEDESTAL.base.triangulos,
    },
    {
      clase: 'pedestal',
      x: MONUMENTO.x,
      y: SUELO_DE_LA_PLAZA + PEDESTAL.base.alto,
      z: MONUMENTO.z,
      giro: Math.PI / 4,
      ancho: PEDESTAL.fuste.ancho,
      alto: PEDESTAL.fuste.alto,
      fondo: PEDESTAL.fuste.ancho,
      color: PIEDRA.fuste,
      triangulos: PEDESTAL.fuste.triangulos,
    },
  ];
}

/**
 * LA PLAZA DE UNA MESA. Lo fijo primero, lo sembrado después, y en ESTE orden: el
 * sorteo se consume en una secuencia que no puede depender de la calidad, o dos
 * aparatos de la misma mesa con calidades distintas verían plazas distintas. Por eso
 * `calidad` no entra en el sorteo: se siembra todo y se marca lo menudo, y es la escena
 * la que no pinta lo menudo en sobria.
 */
export function componerLaPlaza(semilla: number, calidad: Calidad = 'plena'): LaPlaza {
  const azar = sorteo(semilla);
  const puestos = puestosDeLaPlaza();
  const piezas: PuestaDeLaPlaza[] = [
    ...anilloDeCalle(),
    ...soleraDeLaPlaza(),
    ...mobiliarioDeLaCalle(),
    /* El monumento: la figura del pack, teñida de bronce, encima del pedestal. */
    {
      pieza: PIEZA.figura,
      x: MONUMENTO.x,
      y: MONUMENTO.y,
      z: MONUMENTO.z,
      giro: Math.PI,
      talla: MONUMENTO.talla,
      tenir: MONUMENTO.color,
    },
    /* Los muebles de los seis puestos: el banco y la farola son iguales para todos. */
    ...puestos.flatMap((p): PuestaDeLaPlaza[] => [
      { pieza: PIEZA.bancoDeCalle, x: p.banco.x, y: SUELO_DE_LA_PLAZA, z: p.banco.z, giro: giroMirandoHacia(p.giro), talla: 1 },
      { pieza: PIEZA.farolaDeCalle, x: p.farola.x, y: SUELO_DE_LA_PLAZA, z: p.farola.z, giro: p.farola.giro, talla: 1 },
    ]),
    ...fachadas(azar),
    ...terrazas(azar, puestos),
    ...atrezoSembrado(azar, puestos),
    ...cochesAparcados(azar),
  ];
  return { semilla, calidad, puestos, piezas, bultos: bultosDeLaPlaza(), monumento: MONUMENTO };
}

/** Lo que de verdad se pinta en esta calidad: en sobria se cae lo menudo. */
export function piezasQueSePintan(plaza: LaPlaza): readonly PuestaDeLaPlaza[] {
  return plaza.calidad === 'plena' ? plaza.piezas : plaza.piezas.filter((p) => p.menudo !== true);
}
