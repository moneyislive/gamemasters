/**
 * EL PRESUPUESTO DEL BURGO: cuántas veces pone cada pieza un tablero LLENO, en las dos
 * calidades, y la suma contra el `.glb` real. Sin `three`.
 *
 * ═══ POR QUÉ LAS MULTIPLICIDADES SE CUENTAN DE LAS PUESTAS ═══
 *
 * Si la tabla del diseño se copiara a mano aquí, el día que `anillo-en-3d.ts` pusiera una
 * farola más nadie lo vería. Así que lo estático se CUENTA de las listas de puestas que la
 * escena instancia (`mundoEstatico`), y sólo lo dinámico —lo que depende de la partida y no
 * del decorado— se escribe como número: 32 casas y 12 posadas (el tope de casas del
 * Concejo), 28 banderas de dueño (los 28 títulos), 6 peones, 6 monedas en vuelo, 2 dados,
 * un aventurero. `verify:burgo-escena` suma las dos tablas con los triángulos medidos del
 * fichero.
 *
 * ═══ LO QUE ESTA TABLA CUENTA Y LO QUE NO ═══
 *
 * Cuenta el TABLERO: el anillo, sus casillas, sus cuatro esquinas, el campo, los dados y lo
 * que cambia con la partida. NO cuenta la CIUDAD de dentro del recinto, que la levanta
 * `escenas/burgo/ciudad.ts` y la suma su propia tabla; los topes de aquí son los del
 * conjunto, y por eso el margen que se ve entre lo que suma esta tabla y `TOPE_PLENA` no es
 * holgura: es el sitio que la ciudad tiene reservado (`docs/burgo/LA-CIUDAD.md` §8).
 *
 * ═══ LOS TOPES SUBEN OTRA VEZ, Y CON LA CUENTA DELANTE ═══
 *
 * Eran 110.000 y 90.000 heredados del Muelle (`TOPE_DE_TRIANGULOS` de
 * `embarcadero/presupuesto.ts`); pasaron a 560.000 y 130.000 con el recinto de 288; y con el
 * recinto de 648 —nueve veces el centro original, que es lo que se pidió— hay que volver a
 * hacer la cuenta, porque la ciudad tiene 2.916 celdas y no 576.
 *
 * LO QUE SE CUENTA NO ES «LA CIUDAD ENTERA»: ES LO QUE ESTÁ MONTADO A LA VEZ. Ésta es la
 * diferencia de fondo con el presupuesto anterior. Con 288 de lado la ciudad entera cabía en
 * el nivel L1 y la suma tenía sentido renglón a renglón. Con 648 no cabe ni cabrá: el nivel
 * de detalle deja de ser un ahorro y pasa a ser la única forma de que la ciudad exista. Los
 * topes de aquí son, por tanto, el techo de lo que puede estar montado en un fotograma
 * cualquiera, y `LA-CIUDAD.md` §8 lo reparte entre el TABLERO (esta tabla) y la CIUDAD
 * (`ciudad.ts`, que lo escribe otro y suma su propia tabla).
 *
 * Medido contra el `.glb` real, y `verify:burgo-escena` lo vuelve a sumar en cada pasada:
 *
 *     TABLERO en plena ... 196.560   de los cuales el manto de teselas son 64.656
 *     TABLERO en sobria .. 161.316   (sin decorado de campo, sin atrezo menudo, sin aventurero)
 *
 * (Eran 207.949 y 145.595 antes de que los solares se quedaran SIN CUERPOS —los edificios de las
 * propiedades se confundían con las casas y las posadas del Concejo, y se quitaron a petición de
 * Miguel—, que descontó unos 35.000; después fueron 181.333 y 136.547, y desde entonces suben con
 * lo que pidió para las casillas: las obras fundidas, la vía con sus dos trenes, los nombres y el
 * texto pequeño y los nombres de las estaciones —31.930 de letras— y las piezas vivas, que hasta la
 * moneda de la recaudación no estaban contadas. Los de arriba son los que `verify:burgo-escena`
 * imprime hoy, y ahora también los COMPARA con esta cabecera: dos veces se quedaron viejos sin que
 * nada lo notara, y la segunda fue a la media hora de corregirlos.)
 *
 * `TOPE_PLENA = 900.000`: el tablero más 692.000 para lo que la ciudad tenga montado. Sigue
 * siendo el 45 % de los 2.000.000 que ya mueve el delta de Riberas en un PC.
 *
 * `TOPE_SOBRIA = 230.000`: el tablero más 84.000 para la ciudad, que en el móvil va entera en
 * prismas (un prisma con banda de ventanas por edificio y una manta de asfalto por celda).
 * Sube de 130.000 por una razón que se puede señalar con el dedo: el manto de campo, que en
 * el móvil NO se quita porque es el paisaje, pasa de 738 teselas a 1.796 al crecer el
 * perímetro del tablero — 38.000 triángulos de los 100.000 que sube el tope; el resto es el
 * atrezo de cuarenta casillas que ahora miden 72 × 108.
 *
 * Y el tope se declara AQUÍ y no se importa del Muelle: son dos escenas distintas con dos
 * presupuestos distintos, y `escenas/embarcadero/*` no se toca.
 *
 * ═══ LAS DOS CALIDADES ═══
 *
 * `plena`: todo. `sobria` (la decide `juzgarCalidad` de `embarcadero/calidad.ts`: media
 * > 22 ms sobre 120 fotogramas): sin el decorado del campo, sin el atrezo menudo de las
 * casillas ni de las esquinas (farolas, sillas, arbustos, papeleras), sin aventurero (el
 * peón se desliza solo por la polilínea), sin monedas. El MANTO de teselas se queda en las
 * dos: es el paisaje, y quitarlo deja el tablero flotando sobre un plano.
 *
 * ═══ LO QUE LA ESCENA PONE ADEMÁS DE LAS PIEZAS ═══
 *
 * Como en `embarcadero/presupuesto.ts`: las geometrías propias se declaran AQUÍ, sin
 * `three`, y la escena las construye con estos mismos números. El suelo del anillo (cuatro
 * bandas por casilla más el reborde, y el marco de las esquinas), los dígitos del precio,
 * los emblemas, los discos de contacto, el naipe, la marca de casilla y la cúpula del cielo.
 *
 * ═══ LA POSADA NO ES UNA PIEZA PROPIA (decisión 12), Y AHORA TAMPOCO ES UNA CASA ═══
 *
 * No hay hotel en ningún pack. La posada se pinta como una `casa` teñida con un
 * `estandarte` clavado en el tejado. La vacuna del comprobador pone el cuerpo más caro del
 * pack en las cuarenta casillas y tiene que caer.
 *
 * Lo que la decisión 12 no decía era A QUÉ TALLA, y por eso durante toda la fase un hotel fue
 * literalmente una casa: la misma geometría, la misma escala, distinta sólo por ir centrada.
 * La diferencia entre cuatro casas y un hotel —la decisión más cara del reglamento— no se
 * veía. Desde esta tanda el hotel tiene volumen propio (`TALLA_DEL_HOTEL` en `anillo-en-3d.ts`:
 * 22,34 × 14 × 14, frente a los 10,34 × 10,5 × 10,5 de una casa), y sigue siendo la MISMA
 * malla con otra matriz.
 *
 * Y eso es exactamente por qué esta tabla no se mueve ni un renglón: una escala distinta no
 * cuesta un triángulo ni una llamada de dibujo. Los 44 edificios de un tablero lleno —32 casas
 * y 12 hoteles— se siguen contando como `casa` en `multiplicidadesDinamicas`, y las 44
 * instancias van en la misma `InstancedMesh`. Un modelo NUEVO de hotel sí costaría: 12
 * instancias más de otra pieza, otra llamada, y habría que sumarlo aquí. `verify:burgo-escena`
 * afirma que la cuenta de `casa` sigue siendo 44 justamente para que ese día se note.
 */
import { PIEZA } from './piezas';
import { BOCANADAS_DEL_HUMO, CASILLAS_CON_CASINO, CASILLAS_CON_COFRE, letrasDeLosCarteles, triangulosDeLasObras, triangulosDelTren, triangulosDeLasPiezasVivas } from './obras';
import type { NombreDePieza } from './piezas';
import { CASILLAS, ESQUINAS, PRECIO_DE_LA_CASILLA, ROTULO_DE_LA_CASILLA, SUBTITULO_DE_LA_CASILLA, huecosDeLosEmblemas, mundoEstatico } from './anillo-en-3d';
import type { Puesta } from './anillo-en-3d';

/**
 * LOS TOPES. Ver la cabecera: la cuenta que los justifica está en `LA-CIUDAD.md` §8, y
 * cubren el tablero MÁS la ciudad de `ciudad.ts`.
 */
export const TOPE_PLENA = 900_000;
export const TOPE_SOBRIA = 230_000;
/** Todo va instanciado: una `InstancedMesh` por pieza distinta EN PANTALLA. */
export const TOPE_DE_LLAMADAS = 150;
export const TOPE_DE_LLAMADAS_SOBRIA = 90;

/* ────────────────────────── Lo que depende de la partida ────────────────────────── */

/** El Concejo tiene 32 casas y 12 posadas; hay 28 títulos con bandera. */
export const CASAS_DEL_CONCEJO = 32;
export const POSADAS_DEL_CONCEJO = 12;
export const TITULOS = 28;
export const ASIENTOS = 6;
export const MONEDAS_EN_VUELO = 6;
export const DADOS = 2;
/** Los dos trenes que dan vueltas por la vía del campo. */
export const TRENES = 2;
/** Discos de contacto: seis peones, el aventurero y uno de más para el que se despide. */
export const DISCOS_DE_CONTACTO = ASIENTOS + 2;

/* ───────────────────────── Geometrías propias, sin `three` ───────────────────────── */

/**
 * EL SUELO DEL ANILLO. Por casilla lateral, cuatro bandas de dos triángulos, el canto del
 * reborde de la franja (dos) y la LÍNEA que la separa de la siguiente (dos). Por esquina, la
 * losa entera y los dos tramos de marco. Y el paño de dados, que ahora vive en el campo.
 *
 * La línea se añadió después de mirar la captura del tablero entero: sin ella los nueve
 * frentes de un lado son una banda continua con precios encima. Cuesta 72 triángulos en todo
 * el anillo. Ver `ANCHO_DE_LA_LINEA` en `anillo-en-3d.ts`.
 */
export const TRIANGULOS_POR_CASILLA = 4 * 2 + 2 + 2;
export const TRIANGULOS_POR_ESQUINA = 2 + 2 * 2;
export function triangulosDelSuelo(): number {
  const laterales = CASILLAS - ESQUINAS.length;
  return laterales * TRIANGULOS_POR_CASILLA + ESQUINAS.length * TRIANGULOS_POR_ESQUINA + 2;
}

/**
 * LOS DÍGITOS DEL PRECIO. Cada guarismo es un contorno relleno; los diez de
 * `CONTORNOS_DEL_GUARISMO` se triangulan entre 40 y 90 triángulos, y 60 es la media medida.
 * Se cuentan los de verdad: los de las casillas que llevan cifra, dígito a dígito.
 */
export const TRIANGULOS_POR_GUARISMO = 60;
export function guarismosDelTablero(): number {
  let cuantos = 0;
  for (const precio of PRECIO_DE_LA_CASILLA) if (precio > 0) cuantos += String(precio).length;
  return cuantos;
}
/** El emblema de una casilla que no se compra: otro contorno relleno, más gordo que un dígito. */
export const TRIANGULOS_POR_EMBLEMA = 120;

/**
 * LAS LETRAS DE LOS RÓTULOS. Cada glifo sale del tipo con las curvas a seis tramos, y medido uno
 * a uno va de los 84 de la `Z` a los 201 de la `P`; 155 es la media MEDIDA sobre las 55 que hoy
 * pone el anillo. Se cuentan las de verdad: las de `ROTULO_DE_LA_CASILLA`, letra a letra y sin
 * los espacios, porque un espacio no trae glifo y por tanto no llega a montarse. Y las de los
 * CARTELES de las obras —la `P` del aparcamiento—, que son la misma tinta a otra cota.
 */
export const TRIANGULOS_POR_LETRA = 155;
export function letrasDelTablero(): number {
  let cuantas = letrasDeLosCarteles().length;
  for (const palabra of [...Object.values(ROTULO_DE_LA_CASILLA), ...Object.values(SUBTITULO_DE_LA_CASILLA)]) for (const caracter of palabra) if (caracter !== ' ') cuantas++;
  return cuantas;
}

export const SEGMENTOS_DEL_DISCO = 18;
export const SEGMENTOS_DEL_CIELO = { ancho: 24, alto: 12 } as const;
export function triangulosDelCielo(ancho = SEGMENTOS_DEL_CIELO.ancho, alto = SEGMENTOS_DEL_CIELO.alto): number {
  return ancho * 2 + (alto - 2) * ancho * 2;
}
export const TRIANGULOS_DEL_NAIPE = 2;
/** La marca de casilla tocable: un anillo plano de 18 sectores. */
export const TRIANGULOS_DE_LA_MARCA = 36;
/** Los discos del trato: doce, de 2 triángulos cada uno. */
export const DISCOS_DEL_TRATO = 12;
/** El dado de `dados.glb`, medido por `verify:dados`: 662. Se pasa por parámetro si se mide. */
export const TRIANGULOS_DEL_DADO = 662;
/** La exploradora es la figura más pesada: 8.900 medidos. El comprobador la mide de verdad. */
export const TRIANGULOS_DE_LA_EXPLORADORA = 8_900;

/* ─────────────────────────── Las multiplicidades ─────────────────────────── */

export type Multiplicidades = Readonly<Record<string, number>>;

/** Cuántas veces aparece cada pieza en una lista de puestas. */
export function cuentaDePuestas(puestas: readonly Puesta[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const p of puestas) cuenta[p.pieza] = (cuenta[p.pieza] ?? 0) + 1;
  return cuenta;
}

/** Lo dinámico de un tablero LLENO: casas, posadas (casa + estandarte), banderas de dueño, peones, monedas. */
export function multiplicidadesDinamicas(calidad: 'plena' | 'sobria'): Record<string, number> {
  return {
    [PIEZA.casa]: CASAS_DEL_CONCEJO + POSADAS_DEL_CONCEJO,
    [PIEZA.bandera]: TITULOS,
    [PIEZA.estandarte]: POSADAS_DEL_CONCEJO,
    [PIEZA.peon]: ASIENTOS,
    [PIEZA.moneda]: calidad === 'plena' ? MONEDAS_EN_VUELO : 0,
    /* Las dos hojas de la reja van sueltas (una se anima) y las nubes instanciadas aparte: no están en el fundido. */
    [PIEZA.verjaPuerta]: 2,
    [PIEZA.nubeGrande]: calidad === 'plena' ? 2 : 1,
    [PIEZA.nubePequena]: calidad === 'plena' ? 3 : 1,
  };
}

/** Las multiplicidades de un tablero lleno: lo estático contado de las puestas (semilla 1: la cuenta no depende de la semilla) más lo dinámico. */
export function multiplicidades(calidad: 'plena' | 'sobria', semilla = 1): Multiplicidades {
  const estatico = cuentaDePuestas(mundoEstatico(semilla, calidad));
  const dinamico = multiplicidadesDinamicas(calidad);
  const todo: Record<string, number> = { ...estatico };
  for (const [pieza, n] of Object.entries(dinamico)) todo[pieza] = (todo[pieza] ?? 0) + n;
  return todo;
}

export const MULTIPLICIDADES_PLENA: Multiplicidades = multiplicidades('plena');
export const MULTIPLICIDADES_SOBRIA: Multiplicidades = multiplicidades('sobria');

/* ─────────────────────────────── La suma ─────────────────────────────── */

export interface RenglonDelPresupuesto {
  readonly que: string;
  readonly cuantos: number;
  readonly triangulos: number;
}

export interface SumaDelPresupuesto {
  readonly total: number;
  readonly renglones: readonly RenglonDelPresupuesto[];
  /** Piezas de la tabla que el fichero no trae: la suma no vale si hay alguna. */
  readonly desconocidas: readonly string[];
}

/**
 * LA SUMA de una tabla de multiplicidades con los triángulos por pieza (los mide el
 * comprobador del `.glb`), más lo propio de la escena y un aventurero (cero en sobria).
 */
export function sumaDelPresupuesto(
  tabla: Multiplicidades,
  triangulosDe: (pieza: string) => number | undefined,
  calidad: 'plena' | 'sobria',
  triangulosDeUnAventurero = TRIANGULOS_DE_LA_EXPLORADORA,
  triangulosDelDado = TRIANGULOS_DEL_DADO,
): SumaDelPresupuesto {
  const renglones: RenglonDelPresupuesto[] = [];
  const desconocidas: string[] = [];
  for (const pieza of Object.keys(tabla).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const cuantos = tabla[pieza] ?? 0;
    const t = triangulosDe(pieza);
    if (t === undefined) desconocidas.push(pieza);
    renglones.push({ que: pieza, cuantos, triangulos: cuantos * (t ?? 0) });
  }
  const plena = calidad === 'plena';
  const guarismos = guarismosDelTablero();
  const emblemas = huecosDeLosEmblemas().length;
  const letras = letrasDelTablero();
  renglones.push({ que: 'suelo del anillo y marcos', cuantos: 1, triangulos: triangulosDelSuelo() });
  renglones.push({ que: 'dígitos del precio', cuantos: guarismos, triangulos: guarismos * TRIANGULOS_POR_GUARISMO });
  renglones.push({ que: 'emblemas', cuantos: emblemas, triangulos: emblemas * TRIANGULOS_POR_EMBLEMA });
  renglones.push({ que: 'letras de los rótulos', cuantos: letras, triangulos: letras * TRIANGULOS_POR_LETRA });
  /* Y las obras de las casillas: dos triángulos por cuadro, contados de `obras.ts`. */
  renglones.push({ que: 'obras de las casillas', cuantos: 1, triangulos: triangulosDeLasObras() });
  /* Y los dos trenes, que van aparte porque se mueven: una malla instanciada dos veces. */
  renglones.push({ que: 'trenes', cuantos: TRENES, triangulos: TRENES * triangulosDelTren() });
  /*
   * Y las piezas vivas de las casillas, que tampoco van en el fundido: una tapa por cofre, una ruleta
   * por casino, la joya, la reja de la celda, la moneda de la recaudación, las bocanadas del humo y
   * la onda del canal. No estaban contadas.
   */
  const vivas = triangulosDeLasPiezasVivas();
  renglones.push({
    que: 'piezas vivas de las casillas',
    cuantos: CASILLAS_CON_COFRE.length + CASILLAS_CON_CASINO.length + 4 + BOCANADAS_DEL_HUMO,
    triangulos:
      CASILLAS_CON_COFRE.length * vivas.tapa + CASILLAS_CON_CASINO.length * vivas.ruleta + vivas.joya + vivas.reja + vivas.moneda + BOCANADAS_DEL_HUMO * vivas.bocanada + vivas.onda,
  });
  renglones.push({ que: 'discos de contacto', cuantos: DISCOS_DE_CONTACTO, triangulos: DISCOS_DE_CONTACTO * SEGMENTOS_DEL_DISCO });
  renglones.push({ que: 'dados', cuantos: DADOS, triangulos: DADOS * triangulosDelDado });
  renglones.push({ que: 'naipe, marca y discos del trato', cuantos: 1, triangulos: TRIANGULOS_DEL_NAIPE + TRIANGULOS_DE_LA_MARCA + DISCOS_DEL_TRATO * 2 });
  renglones.push({ que: 'la cúpula del cielo', cuantos: 1, triangulos: triangulosDelCielo() });
  renglones.push({ que: 'aventurero (exploradora)', cuantos: plena ? 1 : 0, triangulos: plena ? triangulosDeUnAventurero : 0 });
  const total = renglones.reduce((a, r) => a + r.triangulos, 0);
  return { total, renglones, desconocidas };
}

/** Los nombres de pieza que hay que encontrar en el fichero para que la suma valga. */
export function piezasDelPresupuesto(): NombreDePieza[] {
  return [...new Set([...Object.keys(MULTIPLICIDADES_PLENA), ...Object.keys(MULTIPLICIDADES_SOBRIA)])] as NombreDePieza[];
}
