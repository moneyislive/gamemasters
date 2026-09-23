/**
 * LA TRAZA DEL BURGO: calles, manzanas, distritos y edificios, sin un solo adorno.
 *
 * ═══ POR QUÉ ESTO VIVE EN `shared/` Y NO EN LA ESCENA ═══
 *
 * Boots on Board necesita que el mundo con el que se choca sea el MISMO para todos los que
 * andan por una mesa, y que el servidor pueda derivarlo para arbitrar dónde dice estar cada uno.
 * La ciudad entera se levantaba en `escenas/burgo/ciudad.ts` con `ciudadDelCodigo(código,
 * recinto, calidad)`, y `calidad` la decide en ejecución el aparato con sus primeros 120
 * fotogramas. Medido: en calidad sobria hay 2.808 obstáculos menos. Dos personas en la misma mesa
 * andarían dos Burgos distintos, y cada uno sería coherente consigo mismo.
 *
 * La decisión de arquitectura (23-sep-2026) parte el mundo en dos capas:
 *
 *   · LA ESTRUCTURA —la retícula, las calles, las manzanas, los distritos y los edificios— no
 *     depende del aparato. Es VERDAD: se declara aquí, es pura y la derivan igual el servidor y
 *     el aparato. `burgo-mundo.ts` la convierte en cajas con las que se choca.
 *   · EL ADORNO —lo que depende de la calidad o se mueve: farolas, semáforos, árboles, coches
 *     aparcados, los que circulan, el menudo de los distritos— es PRESENTACIÓN, lo sigue
 *     levantando la escena y no entra en el mundo declarado.
 *
 * ═══ LO QUE SE MIDIÓ ANTES DE MUDAR NADA ═══
 *
 * Sesenta y dos códigos de mesa, la ciudad en las dos calidades:
 *
 *   · Los EDIFICIOS son idénticos en las 62 —centro, giro, ancho, fondo, plantas, cáscara y todo
 *     lo demás—, y también las celdas, los distritos y las cáscaras del pack de los distritos.
 *     No era suerte: el azar de la ciudad es UN chorro, y la traza y los edificios lo gastan
 *     ANTES que nada que dependa de la calidad. El orden era bueno sin que nadie lo hubiera
 *     escrito como regla; ahora lo es, porque lo que va antes está en este fichero.
 *   · Lo que SÍ cambia con la calidad y parece estructura son el templete y el estanque del
 *     parque, en 48 de las 62: salen del sendero, y el sendero sortea su onda con el mismo chorro
 *     DESPUÉS de distritos cuya densidad depende de la calidad (las tumbas del cementerio, el
 *     menudo del polígono, la carga del canal, los coches del centro comercial). Sólo cuando el
 *     parque es el primer distrito del reparto salen iguales. Por eso no entran en el mundo:
 *     arreglarlo movería el templete de sitio en los móviles de hoy.
 *
 * El cierre que produce los edificios es `trazarLaReticula` + `levantarLosEdificios` y lo que
 * usan: unas ochocientas líneas con sus explicaciones, y NINGUNA trigonometría. Los giros ya
 * eran múltiplos exactos de un cuarto de vuelta (`giroMirandoA`, que multiplica por `Math.PI` y
 * divide: aritmética fijada por IEEE 754), y la única función aproximada del camino era un
 * `celdas.length ** 0.5` en el portal de las torres —el operador `**` es `Math.pow`, y
 * `verify:pureza` no lo caza porque busca el nombre—; aquí es `Math.sqrt`, que sí está fijada al
 * bit, y como sólo se le pide la raíz de 1 y de 4 da lo mismo que daba. `giraElPunto`, que sí
 * llama a `Math.cos`, no estaba en el cierre: lo usan los interiores, y se queda en la escena.
 *
 * ═══ LO QUE NO SE MUEVE CON ESTO ═══
 *
 * La ciudad que se pinta es la misma: `escenas/burgo/ciudad.ts` importa de aquí la traza y los
 * edificios, los VISTE —cáscaras del pack, soleras, jardines, colores, triángulos— y sigue
 * sorteando su adorno con el mismo chorro, que este fichero le devuelve ya gastado en lo suyo.
 * `verify:burgo-mundo` guarda la huella de la ciudad de antes de la mudanza, en las dos
 * calidades, y se pone rojo si cambia un bit.
 *
 * ═══ POR QUÉ HAY AQUÍ NÚMEROS QUE YA ESTABAN EN LA ESCENA ═══
 *
 * `shared/` no importa de `escenas/`: lo compilan el servidor y los dos clientes, y la escena
 * arrastra `three`. Así que la retícula (12), la altura de planta (4,5) y las medidas del tablero
 * se escriben aquí otra vez, con su origen dicho, y `verify:burgo-mundo` comprueba que siguen
 * siendo los números de `escenas/burgo/piezas.ts` y de `anillo-en-3d.ts`. Las cajas medidas de
 * los dieciséis modelos de edificio (`CUERPO_DEL_MODELO`) se mudan enteras, porque la traza las
 * necesita para decidir las plantas; `verify:la-ciudad` las sigue midiendo contra el `.glb`.
 *
 * El azar es el `mulberry32` de `shared/mecanicas/azar.ts` —el del reductor— y no una copia más:
 * da la misma sucesión que el `sorteo` de `embarcadero/cala.ts` con el que se levantó siempre la
 * ciudad, y la huella lo demuestra.
 */
import { sembrar, siguiente } from '../../mecanicas/azar';

/* ══════════════════════════════════════════════════════════════════════════
 *  1. EL RECINTO Y LA RETÍCULA
 * ══════════════════════════════════════════════════════════════════════════ */

export interface Punto {
  readonly x: number;
  readonly z: number;
}

/**
 * LA RETÍCULA DE LA CIUDAD: doce unidades, tres módulos de sala de cuatro.
 *
 * Es `RETICULA_DE_LA_CIUDAD` de `escenas/burgo/piezas.ts`, donde está razonada con las medidas
 * del pack. Se escribe aquí porque `shared/` no importa de `escenas/`.
 */
export const RETICULA_DEL_BURGO = 12;

/** La altura de una planta, de suelo a suelo: el módulo de sala (4) más la losa (0,5). Es `ALTURA_DE_PLANTA` de `piezas.ts`. */
export const ALTURA_DE_PLANTA_DEL_BURGO = 4.5;

/**
 * EL RECINTO: el cuadrado de dentro del anillo, en unidades del mundo.
 *
 * Lo pone quien llama, porque el anillo lo decide otro fichero. `RECINTO_DEL_BURGO` trae
 * los números de `LA-CIUDAD.md` §1, que es lo que el anillo nuevo va a medir.
 */
export interface RecintoDeLaCiudad {
  /** 648: nueve casillas de 72, y nueve veces el centro de 72 del primer tablero. */
  readonly lado: number;
  /** 54: `lado / RETICULA_DE_LA_CIUDAD`. */
  readonly celdas: number;
  /** El centro del recinto en el mundo. El tablero está centrado en el origen. */
  readonly centro: Punto;
}

/**
 * 648, Y NO ES UN NÚMERO REDONDEADO A OJO.
 *
 * Es el mínimo que cumple la orden («por lo menos 9-10 veces el tamaño que tiene ahora mismo
 * la zona central», y la zona central medía 72), y además cae clavado en las dos retículas
 * que ya existían: 648 = 54 × 12 (la retícula de la ciudad, sin resto) y 648 = 9 × 72 (nueve
 * casillas de frente por lado, la proporción de un tablero de mesa). Lo mismo publica
 * `anillo-en-3d.ts` en `RECINTO_DE_LA_CIUDAD.lado`, y si uno se mueve se mueven los dos.
 */
export const LADO_DEL_RECINTO = 648;
/** 54 × 54 = 2.916 celdas de 12, o sea 458 × 458 metros. */
export const CELDAS_POR_LADO = LADO_DEL_RECINTO / RETICULA_DEL_BURGO;

export const RECINTO_DEL_BURGO: RecintoDeLaCiudad = {
  lado: LADO_DEL_RECINTO,
  celdas: CELDAS_POR_LADO,
  centro: { x: 0, z: 0 },
};

/** El bordillo: 0,60 de ancho y 0,60 de alto a cada lado, de |x| = 5,40 a 6,00. */
export const ANCHO_DEL_BORDILLO = 0.6;
/** La cota de la acera y de la parcela: lo que sube el bordillo. */
export const ALTURA_DEL_BORDILLO = 0.6;

/** El centro de la celda (i, j) en el mundo. */
export function centroDeCelda(recinto: RecintoDeLaCiudad, i: number, j: number): Punto {
  const mitad = recinto.lado / 2;
  return {
    x: recinto.centro.x - mitad + RETICULA_DEL_BURGO * i + RETICULA_DEL_BURGO / 2,
    z: recinto.centro.z - mitad + RETICULA_DEL_BURGO * j + RETICULA_DEL_BURGO / 2,
  };
}

/**
 * LOS RUMBOS, y por qué son cuatro números y no cuatro cadenas.
 *
 * 0 = +x (este), 1 = +z (sur), 2 = −x (oeste), 3 = −z (norte). Con la cámara de salida
 * mirando desde +Z, el sur es el lado más cercano: es el mismo convenio que la cabecera de
 * `anillo-en-3d.ts`. Que sean números permite girarlos sumando: un cuarto de vuelta a la
 * derecha es `(r + 1) % 4`, y una máscara de cuatro bits dice qué caras de una losa están
 * abiertas.
 *
 * OJO: no es el convenio del paseante de `shared/mecanicas/andar.ts`, que cuenta en radianes
 * desde el norte (la z negativa) hacia el este. `burgo-mundo.ts` hace la cuenta al declarar
 * dónde se nace.
 */
export type Rumbo = 0 | 1 | 2 | 3;
export const RUMBOS: readonly Rumbo[] = [0, 1, 2, 3];
export const PASO_DEL_RUMBO: readonly { readonly di: number; readonly dj: number }[] = [
  { di: 1, dj: 0 },
  { di: 0, dj: 1 },
  { di: -1, dj: 0 },
  { di: 0, dj: -1 },
];

/** El vector unitario del rumbo, en el mundo. */
export function vectorDelRumbo(r: Rumbo): Punto {
  const p = PASO_DEL_RUMBO[r] as { di: number; dj: number };
  return { x: p.di, z: p.dj };
}

/** El rumbo contrario. */
export function rumboContrario(r: Rumbo): Rumbo {
  return ((r + 2) % 4) as Rumbo;
}

/**
 * LA DERECHA DE QUIEN VA CON ESTE RUMBO, que es lo que decide en qué carril va cada coche.
 *
 * Con +x al este y +z al sur —el convenio del anillo, con la cámara de salida mirando desde
 * +Z—, quien va al sur tiene el oeste a su derecha: `derecha = adelante × arriba`, y eso da
 * `(r + 1) % 4`. De aquí sale que la circulación sea por la derecha SIN escribirlo en
 * ningún sitio: el carril de un coche es su celda desplazada 2,70 hacia aquí.
 */
export function rumboALaDerecha(r: Rumbo): Rumbo {
  return ((r + 1) % 4) as Rumbo;
}

/** Radianes de tantos cuartos de vuelta: el `rotation.y` de three, igual que en el anillo. */
export function radianesDeCuartos(cuartos: number): number {
  return (cuartos * Math.PI) / 2;
}

/**
 * EL GIRO DE UNA PIEZA QUE MIRA A UN RUMBO.
 *
 * El convenio del pack: la fachada de un `cuerpo-*` y el morro de un coche miran a su +Z
 * local (medido: `cuerpo-a`, `cuerpo-e` y `cuerpo-g` sacan el alero hasta z = +4,80, y los
 * demás son simétricos). Girando `cuartos`, el +Z local va a parar a: 0 → +z, 1 → +x,
 * 2 → −z, 3 → −x. De ahí la tabla.
 */
export function cuartosMirandoA(r: Rumbo): number {
  return (1 - r + 4) % 4;
}

/** El giro en radianes de una pieza que mira a ese rumbo. */
export function giroMirandoA(r: Rumbo): number {
  return radianesDeCuartos(cuartosMirandoA(r));
}

/* ══════════════════════════════════════════════════════════════════════════
 *  2. LOS TIPOS DE LA TRAZA
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * QUÉ ES UNA CELDA. `LA-CIUDAD.md` §3 dice tres cosas; aquí son cinco, y las dos de más
 * están MEDIDAS, no inventadas:
 *
 * · `patio` — una manzana de 4 × 4 celdas tiene CUATRO celdas interiores que no tocan
 *   ninguna calle. Un edificio ahí no tendría portal. En una ciudad de verdad eso es el
 *   interior de manzana: se deja de jardín, con sus setos y su árbol. Sin esta clase, o las
 *   manzanas no pueden pasar de 3 celdas (y el plano las quiere de 2 a 4), o hay edificios
 *   sin puerta.
 * · `torre` — las cuatro celdas de cada esquina de la glorieta se agrupan en UNA torre de
 *   24 × 24, y las cuatro tienen que saberlo para que nadie ponga otra cosa encima.
 */
export type ClaseDeCelda = 'bulevar' | 'avenida' | 'glorieta' | 'calle' | 'parcela' | 'patio' | 'torre' | 'reserva' | 'isleta';

/**
 * LOS DIECISÉIS DISTRITOS Y LOS CINCO TEJIDOS.
 *
 * Cuatro GRANDES (uno por cuadrante, en su esquina exterior), diez MEDIANOS repartidos por
 * lo que queda, cuatro TEJIDOS que llenan el resto de cada cuadrante y el CENTRO de torres,
 * que no se coloca: es todo lo que cae a menos de siete celdas de la glorieta.
 *
 * Los medianos son de dos clases, y la diferencia importa porque decide quién los llena:
 * los de RESERVA (estadio, estación, canal, feria, hospital, colegio, gasolinera, obra,
 * polígono) son suelo propio con su geometría, y los de TEJIDO (chalets) son parcelas
 * normales con otra regla de llenado —un `cuerpo-*` retranqueado con su jardín y su verja—.
 * Un barrio de chalets con geometría propia sería un decorado; con parcelas es un barrio.
 */
export type NombreDeDistrito =
  | 'centro'
  | 'parque'
  | 'vivienda-alta'
  | 'centro-comercial'
  | 'ocio'
  | 'circuito'
  | 'poligono'
  | 'cementerio'
  | 'ensanche'
  | 'naves'
  | 'obra'
  | 'gasolinera'
  | 'estadio'
  | 'estacion'
  | 'feria'
  | 'hospital'
  | 'colegio'
  | 'canal'
  | 'chalets';

/** Los cuatro cuadrantes, nombrados como se ven desde la pose de salida (+x este, +z sur). */
export type Cuadrante = 'noroeste' | 'noreste' | 'sureste' | 'suroeste';
export const CUADRANTES: readonly Cuadrante[] = ['noroeste', 'noreste', 'sureste', 'suroeste'];

export interface DistritoPuesto {
  readonly nombre: NombreDeDistrito;
  readonly cuadrante: Cuadrante | null;
  /** El rectángulo en celdas: de `i0` a `i0 + ancho − 1`. */
  readonly i0: number;
  readonly j0: number;
  readonly ancho: number;
  readonly fondo: number;
  /** El grande de su familia: el que se lleva la esquina exterior del cuadrante. */
  readonly esGrande: boolean;
  /**
   * Si su suelo es SUYO (`reserva`, con geometría propia) o son parcelas con otra regla de
   * llenado. El barrio de chalets es lo segundo; el estadio, lo primero.
   */
  readonly esReserva: boolean;
  /** El centro del rectángulo en el mundo. */
  readonly centro: Punto;
}

/**
 * LAS DIECISÉIS CÁSCARAS DEL PACK: ocho `bloque-*` (con su parcela de 12 × 12) y ocho
 * `cuerpo-*` (sin ella, sobre una solera). Son los nombres de pieza de `escenas/burgo/piezas.ts`,
 * escritos aquí como texto: la traza dice QUÉ modelo va en cada parcela y la escena lo instancia.
 */
export type CascaraDelBurgo =
  | 'bloque-a'
  | 'bloque-b'
  | 'bloque-c'
  | 'bloque-d'
  | 'bloque-e'
  | 'bloque-f'
  | 'bloque-g'
  | 'bloque-h'
  | 'cuerpo-a'
  | 'cuerpo-b'
  | 'cuerpo-c'
  | 'cuerpo-d'
  | 'cuerpo-e'
  | 'cuerpo-f'
  | 'cuerpo-g'
  | 'cuerpo-h';

/**
 * UN EDIFICIO DE LA TRAZA: dónde está, a qué calle mira, cuánto ocupa y cuántas plantas tiene.
 *
 * Es lo que la escena llamaba `EdificioDeLaCiudad` sin lo que es de pintar —el prisma de lejos y
 * los triángulos—, que la escena le añade. Los campos van en el MISMO orden que tenían allí, y no
 * por manía: la escena los extiende con `{ ...edificio, prisma, triangulos }`, y así el objeto
 * resultante es, clave a clave, el de antes de la mudanza.
 */
export interface EdificioDelBurgo {
  readonly indice: number;
  /** Las celdas que ocupa: una, o cuatro si es torre de esquina de glorieta. */
  readonly celdas: readonly { readonly i: number; readonly j: number }[];
  /** La manzana a la que pertenece: es el GRUPO con el que sube y baja de nivel de detalle. */
  readonly manzana: number;
  readonly distrito: NombreDeDistrito;
  /** El origen del modelo en el mundo: el centro de la torre, o el sitio de la cáscara del pack. */
  readonly centro: Punto;
  /** El rumbo al que da la fachada: hacia la calle. */
  readonly frente: Rumbo;
  readonly giro: number;
  readonly plantas: number;
  /** La cáscara del pack, o `null` en las torres (que son geometría propia). */
  readonly cascara: CascaraDelBurgo | null;
  /** La huella del CUERPO (no de la parcela), en ejes del edificio: ancho × fondo. */
  readonly ancho: number;
  readonly fondo: number;
  readonly alto: number;
  /** El portal, en el mundo: donde la fachada toca la acera. */
  readonly portal: Punto;
  /**
   * LO QUE QUEDA LIBRE DELANTE DE LA FACHADA, y por qué está en el contrato.
   *
   * Un `cuerpo-*` se arrima al frente de manzana dejando 2,4 de acera; un `bloque-*` trae su
   * parcela entera y llega al borde. Ahí está la diferencia entre poder poner un contenedor,
   * una boca de riego o una terraza delante de un portal, y ponerlos DENTRO del edificio. La
   * primera vez que se colocaron sin mirar esto, los contenedores del barrio de bloques
   * salían clavados en la fachada.
   */
  readonly retranqueo: number;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  3. LAS CAJAS DE LOS DIECISÉIS MODELOS, MEDIDAS DEL `.glb`
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * LA HUELLA DEL CUERPO DE CADA MODELO, medida: ancho (x), fondo (z), alto y el saliente de
 * la fachada. Un `bloque-*` es la parcela de 12 × 12 MÁS este cuerpo, así que el interior
 * que se construye dentro es el mismo en los dos: por eso hay una sola tabla.
 *
 * `frente` es lo que sobresale la fachada por delante del origen: en `cuerpo-a`, `e` y `g`
 * llega a 4,80 porque el modelo saca un alero; en los demás son 3,90. O sea que la caja de un
 * modelo NO está centrada en su origen: en ejes del edificio va de `frente − fondo` a `frente`.
 *
 * Se midieron sobre `escenas/modelos/burgo.glb` y `verify:la-ciudad` los vuelve a medir.
 */
export interface CuerpoDelPack {
  readonly ancho: number;
  readonly fondo: number;
  readonly alto: number;
  readonly frente: number;
  readonly plantas: number;
}
export const CUERPO_DEL_MODELO: Readonly<Record<string, CuerpoDelPack>> = {
  'cuerpo-a': { ancho: 7.24, fondo: 8.7, alto: 9.3, frente: 4.8, plantas: 2 },
  'cuerpo-b': { ancho: 9.64, fondo: 7.8, alto: 9.3, frente: 3.9, plantas: 2 },
  'cuerpo-c': { ancho: 7.24, fondo: 7.8, alto: 13.5, frente: 3.9, plantas: 3 },
  'cuerpo-d': { ancho: 9.64, fondo: 7.8, alto: 13.5, frente: 3.9, plantas: 3 },
  'cuerpo-e': { ancho: 12.04, fondo: 8.7, alto: 13.5, frente: 4.8, plantas: 3 },
  'cuerpo-f': { ancho: 12.04, fondo: 7.8, alto: 13.5, frente: 3.9, plantas: 3 },
  'cuerpo-g': { ancho: 12.04, fondo: 8.7, alto: 13.5, frente: 4.8, plantas: 3 },
  'cuerpo-h': { ancho: 12.04, fondo: 7.8, alto: 17.7, frente: 3.9, plantas: 4 },
  'bloque-a': { ancho: 7.24, fondo: 8.7, alto: 9.3, frente: 4.8, plantas: 2 },
  'bloque-b': { ancho: 9.64, fondo: 7.8, alto: 9.3, frente: 3.9, plantas: 2 },
  'bloque-c': { ancho: 7.24, fondo: 7.8, alto: 17.26, frente: 3.9, plantas: 3 },
  'bloque-d': { ancho: 9.64, fondo: 7.8, alto: 17.22, frente: 3.9, plantas: 3 },
  'bloque-e': { ancho: 12.04, fondo: 8.7, alto: 13.5, frente: 4.8, plantas: 3 },
  'bloque-f': { ancho: 12.04, fondo: 7.8, alto: 13.5, frente: 3.9, plantas: 3 },
  'bloque-g': { ancho: 12.04, fondo: 8.7, alto: 17.26, frente: 4.8, plantas: 3 },
  'bloque-h': { ancho: 12.04, fondo: 7.8, alto: 17.7, frente: 3.9, plantas: 4 },
};

/* ══════════════════════════════════════════════════════════════════════════
 *  4. EL ESQUELETO, LOS CUADRANTES Y LOS DISTRITOS
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * EL BULEVAR DE CIRCUNVALACIÓN: DOS CELDAS, Y POR TANTO DOS ANILLOS.
 *
 * Con 54 celdas por lado, doce unidades de ronda para 458 metros de ciudad no es un bulevar,
 * es un callejón: el bulevar pasa a dos celdas, o sea 24 de ancho, cuatro carriles.
 *
 * Y aquí aparece lo que con una celda no existía. Una losa del pack TRAE BORDILLO en sus dos
 * lados largos; dos losas pegadas no comparten calzada, se dan los bordillos. Así que un
 * bulevar de dos celdas no es una pista de 24: son DOS ANILLOS de dos carriles con una
 * mediana continua entre ellos —que es exactamente lo que es una ronda de circunvalación—. El
 * anillo 0 es el de fuera y el 1 el de dentro, y `anilloDelBulevar` dice a cuál pertenece
 * cada celda: `min(i, n−1−i, j, n−1−j)`.
 *
 * Lo barato que sale no es un detalle menor: si las dos filas se abrieran la una a la otra,
 * las 416 celdas del bulevar serían `calzada-cruce` (170 triángulos) y costarían 70.700; con
 * los dos anillos son rectas de 58 y cuestan 25.000. La ronda se lee mejor Y cuesta un tercio.
 */
export const CELDAS_DEL_BULEVAR: readonly number[] = [0, 1];
/** El ancho del bulevar: dos losas, 24. Lo mismo publica `anillo-en-3d.ts`. */
export const ANCHO_DEL_BULEVAR = 2 * RETICULA_DEL_BURGO;
/** A qué anillo del bulevar pertenece una celda: 0 el de fuera, 1 el de dentro, −1 si no es bulevar. */
export function anilloDelBulevar(celdas: number, i: number, j: number): number {
  const a = Math.min(i, celdas - 1 - i, j, celdas - 1 - j);
  return a < CELDAS_DEL_BULEVAR.length ? a : -1;
}

/**
 * LAS CUATRO CELDAS DE UNA AVENIDA: [25, 26, 27, 28] — cuatro losas, 48 de ancho.
 *
 * Caen SIMÉTRICAS respecto del eje (25 + 28 = 26 + 27 = 53), y eso no es coquetería: el eje
 * de la avenida tiene que ser exactamente el centro de las casillas 5, 15, 25 y 35, que son
 * las Puertas del reglamento. Una avenida asimétrica entra torcida por su Puerta y no lo ve
 * nadie hasta que se mira una captura.
 *
 * Por la misma razón que el bulevar, la avenida son CUATRO calzadas de dos carriles con tres
 * bordillos dobles entre ellas. El del medio —entre la 26 y la 27— es LA MEDIANA, y ahí van
 * los árboles de alineación y las farolas; los otros dos son separadores de carril y no
 * llevan nada, porque plantar un árbol en mitad de la calzada es justo lo contrario de
 * «detalles bien organizados».
 */
export function celdasDeLaAvenida(celdas: number): readonly number[] {
  const m = celdas / 2;
  return [m - 2, m - 1, m, m + 1];
}
export const CELDAS_DE_AVENIDA: readonly number[] = celdasDeLaAvenida(CELDAS_POR_LADO);
/** 48: cuatro losas. */
export const ANCHO_DE_LA_AVENIDA = 4 * RETICULA_DEL_BURGO;
/** Veintitrés por veintitrés: lo que le queda a cada cuadrante entre el bulevar y la avenida. */
export const LADO_DEL_CUADRANTE = (CELDAS_POR_LADO - 2 * CELDAS_DEL_BULEVAR.length - CELDAS_DE_AVENIDA.length) / 2;

export interface MarcoDeCuadrante {
  readonly cuadrante: Cuadrante;
  /** La celda de la esquina EXTERIOR: la que toca las dos calles del bulevar. */
  readonly i0: number;
  readonly j0: number;
  /** Hacia dónde crecen las coordenadas locales, que van de la esquina exterior a la glorieta. */
  readonly di: 1 | -1;
  readonly dj: 1 | -1;
}

/**
 * Los cuatro marcos, con la esquina exterior en la primera celda que NO es bulevar (la 2) y
 * la última local (la 22) pegada a la avenida (la 25). Se calculan del recinto y no se
 * escriben a pelo: si el bulevar creciera otra celda, los cuatro se mueven solos.
 */
const PRIMERA_DEL_CUADRANTE = CELDAS_DEL_BULEVAR.length;
const ULTIMA_DEL_CUADRANTE = CELDAS_POR_LADO - 1 - CELDAS_DEL_BULEVAR.length;
const MARCOS: readonly MarcoDeCuadrante[] = [
  { cuadrante: 'noroeste', i0: PRIMERA_DEL_CUADRANTE, j0: PRIMERA_DEL_CUADRANTE, di: 1, dj: 1 },
  { cuadrante: 'noreste', i0: ULTIMA_DEL_CUADRANTE, j0: PRIMERA_DEL_CUADRANTE, di: -1, dj: 1 },
  { cuadrante: 'sureste', i0: ULTIMA_DEL_CUADRANTE, j0: ULTIMA_DEL_CUADRANTE, di: -1, dj: -1 },
  { cuadrante: 'suroeste', i0: PRIMERA_DEL_CUADRANTE, j0: ULTIMA_DEL_CUADRANTE, di: 1, dj: -1 },
];

/** De coordenadas locales del cuadrante (la esquina exterior es el (0, 0)) a la retícula. */
export function aLaReticula(m: MarcoDeCuadrante, p: number, q: number): { readonly i: number; readonly j: number } {
  return { i: m.i0 + m.di * p, j: m.j0 + m.dj * q };
}

/**
 * LAS CUATRO FAMILIAS DE DISTRITOS, Y POR QUÉ VAN EN FAMILIAS.
 *
 * Lo que hace verosímil una ciudad no es qué hay, sino qué hay AL LADO DE QUÉ. Un parque con
 * el hospital y el colegio asomados y vivienda alta alrededor; un centro comercial con la
 * estación, el estadio, la feria y el barrio de bares; el circuito pegado al polígono, a la
 * obra y a la gasolinera; el cementerio con el canal, los chalets y el ensanche tranquilo.
 *
 * Cada familia se lleva un cuadrante entero de 23 × 23 (529 celdas). El GRANDE se queda con
 * la esquina EXTERIOR —lo que necesita silencio o superficie se va del centro, y lo que paga
 * el suelo caro se queda en él—; los MEDIANOS se reparten por lo que queda con dos reglas
 * que son las de una ciudad de verdad: el que hace ruido o huele (polígono, obra, estación,
 * chalets no) va pegado al bulevar, y el que la gente usa a pie (hospital, colegio, feria)
 * va hacia la avenida. Y el resto del cuadrante es el TEJIDO, que son parcelas normales.
 *
 * Los rectángulos van en coordenadas LOCALES del cuadrante (p, q de 0 a 22, con el (0, 0) en
 * la esquina exterior), y por eso las mismas cuatro familias valen para los cuatro
 * cuadrantes sin espejarlas a mano: `aLaReticula` las lleva a la retícula con su signo.
 */
export interface DistritoDeLaFamilia {
  readonly nombre: NombreDeDistrito;
  readonly p0: number;
  readonly q0: number;
  readonly ancho: number;
  readonly fondo: number;
  /** `false` en los que son parcelas con otra regla de llenado (los chalets). */
  readonly esReserva: boolean;
}

export interface FamiliaDeDistritos {
  readonly grande: NombreDeDistrito;
  readonly ancho: number;
  readonly fondo: number;
  readonly tejido: NombreDeDistrito;
  /** Dos variantes de reparto de los medianos; la semilla elige. Ocho disposiciones × dos = dieciséis. */
  readonly medianos: readonly (readonly DistritoDeLaFamilia[])[];
}

export const FAMILIAS: readonly FamiliaDeDistritos[] = [
  {
    /* VERDE: el parque grande, y asomados a él lo que la gente usa a pie. */
    grande: 'parque',
    ancho: 10,
    fondo: 13,
    tejido: 'vivienda-alta',
    medianos: [
      [
        { nombre: 'hospital', p0: 11, q0: 6, ancho: 5, fondo: 6, esReserva: true },
        { nombre: 'colegio', p0: 11, q0: 14, ancho: 5, fondo: 5, esReserva: true },
      ],
      [
        { nombre: 'colegio', p0: 11, q0: 6, ancho: 5, fondo: 5, esReserva: true },
        { nombre: 'hospital', p0: 11, q0: 14, ancho: 5, fondo: 6, esReserva: true },
      ],
    ],
  },
  {
    /* COMERCIO: el centro comercial, la estación pegada al bulevar y el ocio de tejido. */
    grande: 'centro-comercial',
    ancho: 8,
    fondo: 8,
    tejido: 'ocio',
    medianos: [
      [
        { nombre: 'estacion', p0: 9, q0: 0, ancho: 4, fondo: 14, esReserva: true },
        { nombre: 'estadio', p0: 0, q0: 10, ancho: 8, fondo: 9, esReserva: true },
        { nombre: 'feria', p0: 14, q0: 15, ancho: 6, fondo: 6, esReserva: true },
      ],
      [
        { nombre: 'estacion', p0: 9, q0: 0, ancho: 4, fondo: 14, esReserva: true },
        { nombre: 'estadio', p0: 14, q0: 9, ancho: 8, fondo: 9, esReserva: true },
        { nombre: 'feria', p0: 0, q0: 11, ancho: 6, fondo: 6, esReserva: true },
      ],
    ],
  },
  {
    /* MOTOR: el circuito, y con él todo lo que hace ruido. El tejido son naves y bloques bajos. */
    grande: 'circuito',
    ancho: 12,
    fondo: 12,
    tejido: 'naves',
    medianos: [
      [
        { nombre: 'poligono', p0: 13, q0: 0, ancho: 8, fondo: 10, esReserva: true },
        { nombre: 'obra', p0: 0, q0: 13, ancho: 3, fondo: 4, esReserva: true },
        { nombre: 'gasolinera', p0: 13, q0: 12, ancho: 2, fondo: 3, esReserva: true },
      ],
      [
        { nombre: 'poligono', p0: 13, q0: 12, ancho: 8, fondo: 10, esReserva: true },
        { nombre: 'obra', p0: 0, q0: 13, ancho: 3, fondo: 4, esReserva: true },
        { nombre: 'gasolinera', p0: 13, q0: 0, ancho: 2, fondo: 3, esReserva: true },
      ],
    ],
  },
  {
    /* REPOSO: el cementerio, el canal con sus muelles y el barrio de chalets. */
    grande: 'cementerio',
    ancho: 7,
    fondo: 9,
    tejido: 'ensanche',
    medianos: [
      [
        { nombre: 'chalets', p0: 12, q0: 0, ancho: 8, fondo: 9, esReserva: false },
        { nombre: 'canal', p0: 0, q0: 10, ancho: 20, fondo: 3, esReserva: true },
      ],
      [
        { nombre: 'chalets', p0: 12, q0: 13, ancho: 8, fondo: 9, esReserva: false },
        { nombre: 'canal', p0: 0, q0: 10, ancho: 20, fondo: 3, esReserva: true },
      ],
    ],
  },
];
const VERDE = 0;
const COMERCIO = 1;
const MOTOR = 2;
const REPOSO = 3;

/**
 * EL REPARTO: ocho disposiciones, todas con sentido.
 *
 * La semilla elige el cuadrante del MOTOR (cuatro) y el COMERCIO cae en el diagonalmente
 * opuesto —el ruido lejos del ocio—; un bit decide si el VERDE va a un lado o al otro del
 * MOTOR, y el REPOSO ocupa el que queda. Ninguna de las ocho pone el cementerio pegado a la
 * terraza del restaurante ni el circuito debajo de las ventanas del centro comercial.
 */
export function repartoDeLosDistritos(azar: () => number): readonly number[] {
  const motor = Math.floor(azar() * 4) % 4;
  const comercio = (motor + 2) % 4;
  const verde = azar() < 0.5 ? (motor + 1) % 4 : (motor + 3) % 4;
  const reposo = 6 - motor - comercio - verde;
  const reparto = [0, 0, 0, 0];
  reparto[verde] = VERDE;
  reparto[comercio] = COMERCIO;
  reparto[motor] = MOTOR;
  reparto[reposo] = REPOSO;
  return reparto;
}

/**
 * LOS REPARTOS DE UN EJE DEL CUADRANTE: cuatro calles y cinco manzanas de 3 a 7 celdas.
 *
 * `23 = a + 1 + b + 1 + c + 1 + d + 1 + e`, con las cinco manzanas de 3 celdas por lo menos
 * (36 unidades: menos de eso no es una manzana, es un rellano) y de 7 como mucho, que es lo
 * que da la cuenta sola. Se ENUMERAN, no se escriben: son setenta repartos por eje y 4.900
 * tramas por cuadrante, y ninguna manzana igual a la de al lado.
 *
 * `LA-CIUDAD.md` §3 dice «35 repartos por eje». Son 70 —las combinaciones de repartir cuatro
 * celdas sobrantes entre cinco manzanas son C(8,4)—, y aquí manda el código, que es lo que
 * el propio documento pide en su primera línea. Se cuenta, no se copia.
 */
export const MANZANA_MINIMA = 3;
export const CALLES_POR_EJE = 4;
export function repartosDeUnEje(celdas: number, trozos: number, minimo: number): readonly (readonly number[])[] {
  const sobra = celdas - (trozos - 1) - trozos * minimo;
  const salida: number[][] = [];
  if (sobra < 0) return salida;
  const anda = (k: number, queda: number, llevo: readonly number[]): void => {
    if (k === trozos - 1) {
      salida.push([...llevo, minimo + queda]);
      return;
    }
    for (let x = 0; x <= queda; x++) anda(k + 1, queda - x, [...llevo, minimo + x]);
  };
  anda(0, sobra, []);
  return salida;
}
export const REPARTOS_DE_MANZANA: readonly (readonly number[])[] = repartosDeUnEje(LADO_DEL_CUADRANTE, CALLES_POR_EJE + 1, MANZANA_MINIMA);

/* ══════════════════════════════════════════════════════════════════════════
 *  5. TRAZAR LA RETÍCULA
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * LA RETÍCULA TRAZADA: la clase, el distrito, el cuadrante y la manzana de cada celda, qué caras
 * abre cada celda de calle, y los distritos puestos. Las listas van por celda, `j * n + i`.
 */
export interface TrazadoDelBurgo {
  readonly clase: ClaseDeCelda[];
  readonly distrito: (NombreDeDistrito | null)[];
  readonly cuadrante: (Cuadrante | null)[];
  readonly manzana: number[];
  readonly abre: number[];
  readonly distritos: DistritoPuesto[];
  /** Por cuadrante: su marco, su familia y el rectángulo del grande, ya en la retícula. */
  readonly cuadrantes: {
    readonly marco: MarcoDeCuadrante;
    readonly familia: FamiliaDeDistritos;
    readonly grande: DistritoPuesto;
  }[];
  /** Por cuadrante y en coordenadas locales, dónde cayeron sus cuatro calles de cada eje. */
  readonly callesDeCadaCuadrante: { readonly columnas: number[]; readonly filas: number[] }[];
  readonly n: number;
}

/** El centro de torres: todo lo que cae a siete celdas o menos de la glorieta, en Chebyshev. */
export const RADIO_DEL_CENTRO = 7;

/** La distancia de Chebyshev de una celda al centro de la ciudad, en celdas. */
export function distanciaAlCentro(celdas: number, i: number, j: number): number {
  const medio = (celdas - 1) / 2;
  return Math.max(Math.abs(i - medio), Math.abs(j - medio));
}

/**
 * EL PULSO DE UNA PARCELA: un número de 0 a 1 que sólo depende de DÓNDE ESTÁ.
 *
 * ═══ POR QUÉ ESTO NO ES `azar()` ═══
 *
 * `azar()` es un chorro: lo que sale depende de cuántas veces se ha pedido antes, o sea del
 * ORDEN en que se recorre la retícula. Vale para elegir el modelo de un portal, donde lo único
 * que importa es que no se repita. No vale para la SILUETA, porque la silueta es una propiedad
 * del sitio: la casa de la esquina noroeste tiene que salir igual de alta en las seis
 * pantallas de la mesa y en las dos aplicaciones, y tiene que seguir saliendo igual el día que
 * alguien meta un distrito nuevo que gaste el chorro de otra manera. Con un revoltillo de las
 * coordenadas eso es cierto por construcción y no por disciplina.
 *
 * `veta` separa preguntas distintas sobre la misma parcela —la altura, el color— para que no
 * vayan de la mano; sin ella la casa alta sería siempre la casa clara, y eso se lee como un
 * patrón aunque cada cosa por separado parezca bien repartida.
 *
 * Es aritmética entera de 32 bits (`Math.imul` multiplica como lo haría C, sin perder los bits
 * de arriba en un `double`), así que da lo mismo bit a bit en cualquier motor.
 */
export function pulsoDeLaParcela(i: number, j: number, veta: number): number {
  let h = Math.imul(i + 0x9e37, 0x85eb) ^ Math.imul(j + 0x79b9, 0xc2b2) ^ Math.imul(veta + 0x1656, 0x27d4);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 13), 0x297a2d39);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Las vetas del pulso: una por pregunta, para que la altura y el color no vayan de la mano. */
export const VETA_DE_LA_ALTURA = 1;
export const VETA_DE_LA_FACHADA = 2;

/** Las cuatro clases que son calzada: por ellas anda un coche y con ellas se traza la red. */
export function esClaseDeCalle(c: ClaseDeCelda): boolean {
  return c === 'bulevar' || c === 'avenida' || c === 'glorieta' || c === 'calle';
}

export function trazarLaReticula(recinto: RecintoDeLaCiudad, azar: () => number): TrazadoDelBurgo {
  const n = recinto.celdas;
  const clase: ClaseDeCelda[] = new Array(n * n).fill('parcela');
  const distrito: (NombreDeDistrito | null)[] = new Array(n * n).fill(null);
  const cuadrante: (Cuadrante | null)[] = new Array(n * n).fill(null);
  const manzana: number[] = new Array(n * n).fill(-1);
  const abre: number[] = new Array(n * n).fill(0);
  const idx = (i: number, j: number): number => j * n + i;
  const dentro = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < n && j < n;

  /* ── (a) El esqueleto, que es fijo: dos anillos de bulevar, cuatro avenidas y la glorieta ── */
  const esAvenida = (k: number): boolean => CELDAS_DE_AVENIDA.indexOf(k) >= 0;
  /**
   * LA ISLETA: las CUATRO celdas del medio de la glorieta (26 y 27 en los dos ejes) no son
   * calzada. Son la isleta de 24 × 24 con su pedestal, su figura y su cantero, y la glorieta
   * es el anillo de doce celdas que las rodea. Sin isleta, las dieciséis celdas centrales
   * serían una explanada de asfalto de 48 × 48 en mitad de la ciudad.
   */
  const centrales = [CELDAS_DE_AVENIDA[1] as number, CELDAS_DE_AVENIDA[2] as number];
  const esIsleta = (i: number, j: number): boolean => centrales.indexOf(i) >= 0 && centrales.indexOf(j) >= 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (anilloDelBulevar(n, i, j) >= 0) clase[idx(i, j)] = 'bulevar';
      else if (esAvenida(i) && esAvenida(j)) clase[idx(i, j)] = esIsleta(i, j) ? 'isleta' : 'glorieta';
      else if (esAvenida(i) || esAvenida(j)) clase[idx(i, j)] = 'avenida';
    }
  }

  /* ── (b) A qué cuadrante cae cada celda ── */
  for (const m of MARCOS) {
    for (let q = 0; q < LADO_DEL_CUADRANTE; q++) {
      for (let p = 0; p < LADO_DEL_CUADRANTE; p++) {
        const c = aLaReticula(m, p, q);
        cuadrante[idx(c.i, c.j)] = m.cuadrante;
      }
    }
  }

  /* ── (c) Los distritos grandes, en la esquina exterior de su cuadrante ── */
  const reparto = repartoDeLosDistritos(azar);
  const distritos: DistritoPuesto[] = [];
  const cuadrantes: TrazadoDelBurgo['cuadrantes'] = [];
  const marcaRectangulo = (m: MarcoDeCuadrante, p0: number, q0: number, ancho: number, fondo: number, nombre: NombreDeDistrito, esReserva: boolean, esGrande: boolean): DistritoPuesto => {
    let iMin = n;
    let jMin = n;
    let iMax = -1;
    let jMax = -1;
    for (let q = q0; q < q0 + fondo; q++) {
      for (let p = p0; p < p0 + ancho; p++) {
        const c = aLaReticula(m, p, q);
        /*
         * Un distrito de RESERVA se queda con su suelo; uno de TEJIDO —los chalets— deja las
         * celdas como parcelas y sólo les pone su nombre, para que las calles del cuadrante
         * sigan atravesándolo y cada chalet tenga su calle. Un barrio sin calles no es un
         * barrio.
         */
        if (esReserva) clase[idx(c.i, c.j)] = 'reserva';
        distrito[idx(c.i, c.j)] = nombre;
        iMin = Math.min(iMin, c.i);
        jMin = Math.min(jMin, c.j);
        iMax = Math.max(iMax, c.i);
        jMax = Math.max(jMax, c.j);
      }
    }
    const a = centroDeCelda(recinto, iMin, jMin);
    const b = centroDeCelda(recinto, iMax, jMax);
    return {
      nombre,
      cuadrante: m.cuadrante,
      i0: iMin,
      j0: jMin,
      ancho: iMax - iMin + 1,
      fondo: jMax - jMin + 1,
      esGrande,
      esReserva,
      centro: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
    };
  };

  for (let c = 0; c < 4; c++) {
    const m = MARCOS[c] as MarcoDeCuadrante;
    const familia = FAMILIAS[reparto[c] as number] as FamiliaDeDistritos;
    const grande = marcaRectangulo(m, 0, 0, familia.ancho, familia.fondo, familia.grande, true, true);
    distritos.push(grande);
    cuadrantes.push({ marco: m, familia, grande });
    /* De las dos variantes de reparto de los medianos, una: ocho disposiciones × dos = dieciséis. */
    const variante = familia.medianos[Math.floor(azar() * familia.medianos.length) % familia.medianos.length] as readonly DistritoDeLaFamilia[];
    for (const d of variante) distritos.push(marcaRectangulo(m, d.p0, d.q0, d.ancho, d.fondo, d.nombre, d.esReserva, false));
  }

  /*
   * ── (d) Las calles secundarias: CUATRO por eje y por cuadrante, recortadas por los distritos ──
   *
   * Cuatro calles por eje parten los 23 en cinco manzanas de 3 a 7 celdas (36 a 84 unidades,
   * 25 a 59 metros de fondo): manzanas urbanas de verdad, y ninguna igual a la de al lado.
   * Con dos, las manzanas salían de 10 celdas —120 unidades, casi dos casillas— y lo que se
   * veía no era una ciudad, era un polígono.
   */
  const callesDeCadaCuadrante: { readonly columnas: number[]; readonly filas: number[] }[] = [];
  for (const c of cuadrantes) {
    const m = c.marco;
    const enP = REPARTOS_DE_MANZANA[Math.floor(azar() * REPARTOS_DE_MANZANA.length) % REPARTOS_DE_MANZANA.length] as readonly number[];
    const enQ = REPARTOS_DE_MANZANA[Math.floor(azar() * REPARTOS_DE_MANZANA.length) % REPARTOS_DE_MANZANA.length] as readonly number[];
    const cortes = (reparto: readonly number[]): number[] => {
      const salida: number[] = [];
      let cursor = 0;
      for (let k = 0; k < reparto.length - 1; k++) {
        cursor += reparto[k] as number;
        salida.push(cursor);
        cursor += 1;
      }
      return salida;
    };
    const columnas = cortes(enP);
    const filas = cortes(enQ);
    callesDeCadaCuadrante.push({ columnas, filas });
    for (const p of columnas) {
      for (let q = 0; q < LADO_DEL_CUADRANTE; q++) {
        const cc = aLaReticula(m, p, q);
        if (clase[idx(cc.i, cc.j)] === 'parcela') clase[idx(cc.i, cc.j)] = 'calle';
      }
    }
    for (const q of filas) {
      for (let p = 0; p < LADO_DEL_CUADRANTE; p++) {
        const cc = aLaReticula(m, p, q);
        if (clase[idx(cc.i, cc.j)] === 'parcela') clase[idx(cc.i, cc.j)] = 'calle';
      }
    }
  }

  /*
   * ── (e) EL CENTRO DE TORRES: todo lo que cae a siete celdas o menos de la glorieta ──
   *
   * El pack no tiene rascacielos: lo más alto son cuatro plantas. Si el centro de una ciudad
   * de 458 metros se hiciera con el pack, la silueta sería plana de borde a borde. Las torres
   * son geometría propia —un prisma, una banda de ventanas por planta y un remate: 112
   * triángulos una de diez plantas, menos que la décima parte de un `bloque-h`—, y por eso
   * pueden tener las plantas que hagan falta.
   *
   * Las cuatro celdas pegadas a la glorieta de cada cuadrante se agrupan en UNA torre de
   * 24 × 24, que es la que remata la esquina de la glorieta; las demás son de una celda. Las
   * cuatro de la esquina no pueden ser calle nunca: el corte de calle más alto que un reparto
   * puede dar es el 19, y éstas son la 21 y la 22.
   */
  for (const c of cuadrantes) {
    const esquina = LADO_DEL_CUADRANTE - 1;
    const bloque = [aLaReticula(c.marco, esquina - 1, esquina - 1), aLaReticula(c.marco, esquina, esquina - 1), aLaReticula(c.marco, esquina - 1, esquina), aLaReticula(c.marco, esquina, esquina)];
    if (bloque.every((b) => clase[idx(b.i, b.j)] === 'parcela')) {
      for (const b of bloque) {
        clase[idx(b.i, b.j)] = 'torre';
        distrito[idx(b.i, b.j)] = 'centro';
      }
    }
  }
  /* Las torres de una celda se marcan MÁS ABAJO, cuando la red de calles ya está cerrada: una
   * torre sin calle delante es un edificio sin portal, y eso sólo se sabe después del (g). */

  /* ── (f) Qué caras abre cada celda de calle: sus vecinas, la mediana y las cuatro Puertas ── */
  const claseEn = (i: number, j: number): ClaseDeCelda | null => (dentro(i, j) ? (clase[idx(i, j)] as ClaseDeCelda) : null);
  const esCalleEn = (i: number, j: number): boolean => {
    const c = claseEn(i, j);
    return c !== null && esClaseDeCalle(c);
  };
  const primeraAvenida = CELDAS_DE_AVENIDA[0] as number;
  const ultimaAvenida = CELDAS_DE_AVENIDA[CELDAS_DE_AVENIDA.length - 1] as number;

  /**
   * DÓNDE SE CORTA LA MEDIANA DE UNA AVENIDA: sólo donde de verdad llega una calle.
   *
   * Una avenida son cuatro losas pegadas y sus bordillos se dan la espalda: eso es la
   * mediana. Pero una mediana continua de 648 unidades convierte la avenida en un muro que
   * parte la ciudad en dos, y ningún coche puede cruzar de un lado al otro. Así que la
   * mediana SE ABRE en las filas (o columnas) donde una calle del cuadrante llega a la
   * avenida, y en las del bulevar: exactamente donde una ciudad pone un cruce.
   */
  const hayCruceEnLaAvenida = (eje: 'i' | 'j', k: number): boolean => {
    if (anilloDelBulevar(n, eje === 'i' ? primeraAvenida : k, eje === 'i' ? k : primeraAvenida) >= 0) return true;
    const antes = eje === 'i' ? claseEn(primeraAvenida - 1, k) : claseEn(k, primeraAvenida - 1);
    const despues = eje === 'i' ? claseEn(ultimaAvenida + 1, k) : claseEn(k, ultimaAvenida + 1);
    return (antes !== null && esClaseDeCalle(antes)) || (despues !== null && esClaseDeCalle(despues));
  };

  /**
   * LAS CUATRO PUERTAS: por ahí la calzada SE SALE del recinto, y tiene que abrir.
   *
   * Una celda del borde sin vecina cerraría esa cara y pondría un bordillo cruzando la
   * avenida justo donde el peón entra al tablero. La avenida no muere en el borde: sigue por
   * la casilla 5, 15, 25 o 35, donde el anillo ya tiene puestas sus cuatro cebras.
   */
  const esBocaDePuerta = (i: number, j: number, r: Rumbo): boolean => {
    const p = PASO_DEL_RUMBO[r] as { di: number; dj: number };
    if (p.di !== 0) return esAvenida(j) && (i === 0 || i === n - 1);
    return esAvenida(i) && (j === 0 || j === n - 1);
  };

  /*
   * LA MEDIANA, en una línea, porque es la regla que más se ve y la que más cuesta creer:
   *
   * una calzada ancha del pack son varias losas pegadas, y CADA LOSA TRAE SU BORDILLO. Dos
   * losas vecinas de la misma calzada no comparten asfalto: se dan los bordillos, y lo que
   * queda entre ellas es una mediana de 1,2 alzada 0,6. No se puede evitar sin recompilar el
   * pack, así que se aprovecha: el bulevar son dos anillos con su mediana, la avenida son
   * cuatro calzadas con la suya en medio, y las medianas se abren donde hay un cruce de
   * verdad. La regla entera está aquí.
   */
  const abreHacia = (i: number, j: number, r: Rumbo): boolean => {
    const p = PASO_DEL_RUMBO[r] as { di: number; dj: number };
    const vi = i + p.di;
    const vj = j + p.dj;
    if (!dentro(vi, vj)) return esBocaDePuerta(i, j, r);
    if (!esCalleEn(vi, vj)) return false;
    const a = clase[idx(i, j)] as ClaseDeCelda;
    const b = clase[idx(vi, vj)] as ClaseDeCelda;
    /* El anillo de la glorieta se abre siempre por dentro de sí mismo; la isleta lo cierra. */
    if (a === 'glorieta' && b === 'glorieta') return true;
    const anilloA = anilloDelBulevar(n, i, j);
    const anilloB = anilloDelBulevar(n, vi, vj);
    if (anilloA >= 0 && anilloB >= 0 && anilloA !== anilloB) {
      /* Cruzar la mediana del bulevar: sólo donde algo llega a él desde dentro de la ciudad. */
      const masAdentro = anilloA < anilloB ? { i: vi + p.di, j: vj + p.dj } : { i: i - p.di, j: j - p.dj };
      const c = claseEn(masAdentro.i, masAdentro.j);
      return c !== null && esClaseDeCalle(c) && c !== 'bulevar';
    }
    const cruzaEnI = i !== vi && esAvenida(i) && esAvenida(vi);
    const cruzaEnJ = j !== vj && esAvenida(j) && esAvenida(vj);
    const dosDeAvenida = (a === 'avenida' || a === 'glorieta') && (b === 'avenida' || b === 'glorieta');
    if (dosDeAvenida && (cruzaEnI || cruzaEnJ)) return hayCruceEnLaAvenida(cruzaEnI ? 'i' : 'j', cruzaEnI ? j : i);
    return true;
  };

  const calcularAbre = (): void => {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        if (!esClaseDeCalle(clase[idx(i, j)] as ClaseDeCelda)) {
          abre[idx(i, j)] = 0;
          continue;
        }
        let mascara = 0;
        for (const r of RUMBOS) if (abreHacia(i, j, r)) mascara |= 1 << r;
        abre[idx(i, j)] = mascara;
      }
    }
  };

  /**
   * ── (g) LA RED TIENE QUE SER CONEXA, Y SE CIERRA AQUÍ, NO EN EL COMPROBADOR ──
   *
   * Con catorce distritos comiéndose el suelo, una calle secundaria puede quedar cortada por
   * un estadio y dejar un trozo de asfalto al que no se llega desde ninguna parte. No es un
   * fallo que se vea: es una calle que no lleva a ningún sitio, y un coche puesto ahí anda
   * solo en una isla. Se buscan las componentes de la red por las caras que cada losa abre
   * —la misma cuenta que hace el comprobador— y lo que no está en la mayor DEJA DE SER CALLE:
   * vuelve a ser parcela, y si no le queda calle delante, patio de manzana. Se repite hasta
   * que no cambia nada, porque degradar una calle cambia la máscara de sus vecinas.
   */
  const componentes = (): number[][] => {
    const visto: number[] = new Array(n * n).fill(-1);
    const salida: number[][] = [];
    for (let k = 0; k < n * n; k++) {
      if ((visto[k] as number) >= 0 || !esClaseDeCalle(clase[k] as ClaseDeCelda)) continue;
      const grupo: number[] = [];
      const pila = [k];
      visto[k] = salida.length;
      while (pila.length > 0) {
        const actual = pila.pop() as number;
        grupo.push(actual);
        const ci = actual % n;
        const cj = (actual - ci) / n;
        for (const r of RUMBOS) {
          if (((abre[actual] as number) & (1 << r)) === 0) continue;
          const p = PASO_DEL_RUMBO[r] as { di: number; dj: number };
          const vi = ci + p.di;
          const vj = cj + p.dj;
          if (!dentro(vi, vj)) continue;
          const vk = idx(vi, vj);
          if ((visto[vk] as number) >= 0 || !esClaseDeCalle(clase[vk] as ClaseDeCelda)) continue;
          visto[vk] = salida.length;
          pila.push(vk);
        }
      }
      salida.push(grupo);
    }
    return salida;
  };

  for (let vuelta = 0; vuelta < 8; vuelta++) {
    calcularAbre();
    const grupos = componentes();
    if (grupos.length <= 1) break;
    let mayor = 0;
    for (let k = 1; k < grupos.length; k++) if ((grupos[k] as number[]).length > (grupos[mayor] as number[]).length) mayor = k;
    let cambiado = false;
    for (let k = 0; k < grupos.length; k++) {
      if (k === mayor) continue;
      for (const celda of grupos[k] as number[]) {
        if (clase[celda] !== 'calle') continue;
        clase[celda] = 'parcela';
        cambiado = true;
      }
    }
    if (!cambiado) break;
  }
  calcularAbre();

  /* ── (h) Las torres de una celda, ya con la red cerrada y sólo donde hay portal ── */
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (clase[idx(i, j)] !== 'parcela') continue;
      if (distanciaAlCentro(n, i, j) > RADIO_DEL_CENTRO) continue;
      const daACalle = RUMBOS.some((r) => {
        const p = PASO_DEL_RUMBO[r] as { di: number; dj: number };
        return esCalleEn(i + p.di, j + p.dj);
      });
      if (!daACalle) continue;
      clase[idx(i, j)] = 'torre';
      distrito[idx(i, j)] = 'centro';
    }
  }

  /* ── (i) Lo que queda: parcela si da a una calle, patio si es interior de manzana ── */
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (clase[idx(i, j)] !== 'parcela') continue;
      const daACalle = RUMBOS.some((r) => {
        const p = PASO_DEL_RUMBO[r] as { di: number; dj: number };
        return esCalleEn(i + p.di, j + p.dj);
      });
      if (!daACalle) clase[idx(i, j)] = 'patio';
    }
  }

  /* ── (j) El distrito de lo que no tiene: el TEJIDO de la familia de su cuadrante ── */
  for (let c = 0; c < 4; c++) {
    const info = cuadrantes[c] as TrazadoDelBurgo['cuadrantes'][number];
    for (let q = 0; q < LADO_DEL_CUADRANTE; q++) {
      for (let p = 0; p < LADO_DEL_CUADRANTE; p++) {
        const cc = aLaReticula(info.marco, p, q);
        const k = idx(cc.i, cc.j);
        if (distrito[k] === null) distrito[k] = info.familia.tejido;
      }
    }
  }
  for (const info of cuadrantes) {
    const otra = aLaReticula(info.marco, LADO_DEL_CUADRANTE - 1, LADO_DEL_CUADRANTE - 1);
    distritos.push({
      nombre: info.familia.tejido,
      cuadrante: info.marco.cuadrante,
      i0: Math.min(info.marco.i0, otra.i),
      j0: Math.min(info.marco.j0, otra.j),
      ancho: LADO_DEL_CUADRANTE,
      fondo: LADO_DEL_CUADRANTE,
      esGrande: false,
      esReserva: false,
      centro: centroDeCelda(recinto, (info.marco.i0 + otra.i) / 2, (info.marco.j0 + otra.j) / 2),
    });
  }

  /* ── (k) Las manzanas: cada isla de suelo edificable rodeada de calles ── */
  let siguienteManzana = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = idx(i, j);
      const c = clase[k] as ClaseDeCelda;
      if ((manzana[k] as number) >= 0 || (c !== 'parcela' && c !== 'patio' && c !== 'torre')) continue;
      const pila = [[i, j]];
      manzana[k] = siguienteManzana;
      while (pila.length > 0) {
        const [ci, cj] = pila.pop() as [number, number];
        for (const r of RUMBOS) {
          const paso = PASO_DEL_RUMBO[r] as { di: number; dj: number };
          const vi = ci + paso.di;
          const vj = cj + paso.dj;
          if (!dentro(vi, vj)) continue;
          const vk = idx(vi, vj);
          const vc = clase[vk] as ClaseDeCelda;
          if ((manzana[vk] as number) >= 0 || (vc !== 'parcela' && vc !== 'patio' && vc !== 'torre')) continue;
          manzana[vk] = siguienteManzana;
          pila.push([vi, vj]);
        }
      }
      siguienteManzana++;
    }
  }

  return { clase, distrito, cuadrante, manzana, abre, distritos, cuadrantes, callesDeCadaCuadrante, n };
}

/* ══════════════════════════════════════════════════════════════════════════
 *  6. LOS EDIFICIOS
 * ══════════════════════════════════════════════════════════════════════════ */

/** Lo que se le deja de acera por delante a un cuerpo que no llega al frente de la manzana. */
export const ACERA_LIBRE = 2.4;
/**
 * Y LO QUE SE RETRANQUEA UN CHALET: 3,20, que es el jardín delantero entero y ni un palmo más.
 *
 * El tope no lo pone el gusto, lo pone la parcela, y está medido: `cuerpo-a` saca el alero
 * hasta 4,80 por delante y mide 8,70 de fondo, así que sobre una parcela de 12 sólo puede
 * correrse 2,10 hacia atrás antes de asomar por el otro lado. 6 − 4,80 − 2,10 = 3,30 es el
 * retranqueo máximo que cabe; con 3,20 queda un dedo de holgura. A 5,40 —que fue el primer
 * número que se escribió— el chalet salía 2,10 por el fondo de su parcela y se metía en el
 * jardín del vecino.
 */
export const ACERA_DEL_CHALET = 3.2;

/**
 * LOS MODELOS DE CADA DISTRITO, POR LETRA.
 *
 * Los ocho bloques del pack traen su color HORNEADO del atlas y no llevan máscara de tinte:
 * repintarlos por distrito exigiría compilar ocho variantes más, y ocho variantes pesan
 * ocho veces. Así que lo que distingue un barrio de otro no es el color: es QUÉ modelos,
 * qué mobiliario y qué arbolado. Ésta es la primera de las tres tablas.
 */
/*
 * ═══ Y CADA LISTA TIENE MODELOS DE DOS ALTURAS, QUE ES LO QUE SALVA LA SILUETA ═══
 *
 * `ensanche` decía `['a', 'b']` y `chalets` decía lo mismo: las dos letras de DOS plantas. Y
 * como el modelo se elige filtrando la lista por las plantas que pide el sitio, cuando el
 * sitio pedía tres no había ninguna, el filtro se quedaba vacío y volvía a caer en `a` o `b`.
 * O sea que el ensanche —que es el tejido más grande de la ciudad— salía entero de dos
 * plantas y de 9,30 clavado, casa por casa, manzana por manzana. Desde el aire eso no es un
 * barrio: es un pavimento. Es la mitad de lo que Miguel vio como «todos muy repetidos».
 *
 * Con dos alturas en cada lista, el escalón de `plantasQueTocan` tiene por fin dónde caer, y
 * la manzana sale con dientes. La otra mitad —que las de la misma altura fueran además del
 * mismo color— la arregla `tonoDeLaFachada`, en la escena.
 */
export const LETRAS_DEL_DISTRITO: Readonly<Record<string, readonly string[]>> = {
  ensanche: ['a', 'b', 'c', 'd'],
  'vivienda-alta': ['c', 'd', 'g', 'h'],
  ocio: ['c', 'e', 'b', 'f'],
  poligono: ['f', 'h'],
  centro: ['g', 'h'],
  /* Los tejidos nuevos: las naves del cuadrante del motor y los chalets del tranquilo. */
  naves: ['b', 'f'],
  chalets: ['a', 'b', 'c'],
};

const BLOQUE_DE_LETRA: Readonly<Record<string, CascaraDelBurgo>> = {
  a: 'bloque-a',
  b: 'bloque-b',
  c: 'bloque-c',
  d: 'bloque-d',
  e: 'bloque-e',
  f: 'bloque-f',
  g: 'bloque-g',
  h: 'bloque-h',
};
const CUERPO_DE_LETRA: Readonly<Record<string, CascaraDelBurgo>> = {
  a: 'cuerpo-a',
  b: 'cuerpo-b',
  c: 'cuerpo-c',
  d: 'cuerpo-d',
  h: 'cuerpo-h',
};

/** Cuántas plantas tiene la cáscara de cada letra: MEDIDO, no elegido (`cuerpo-C…G` miden 3 × 4,50 clavado). */
export function plantasDeLaLetra(letra: string): number {
  return (CUERPO_DEL_MODELO[BLOQUE_DE_LETRA[letra] as string] as CuerpoDelPack).plantas;
}

/** Si una cáscara es un `cuerpo-*` —sin parcela, sobre una solera— y no un `bloque-*`. */
export function esCuerpoSuelto(cascara: CascaraDelBurgo): boolean {
  return cascara.startsWith('cuerpo-');
}

/** Cada cuántas parcelas, más o menos, le toca a una descolgarse una planta de sus vecinas. */
export const PARCELAS_QUE_SE_DESCUELGAN = 0.42;

/**
 * LA ALTURA LA DECIDE LA DISTANCIA AL CENTRO, no un sorteo — Y LUEGO LA DESMIENTE LA PARCELA.
 *
 * Distancia de Chebyshev en celdas al centro de la ciudad. Sale sola la silueta que tiene
 * una ciudad —alta en el centro, bajando hacia el borde, con las avenidas marcadas por una
 * cornisa más alta— y sale IGUAL en las seis pantallas de la mesa, porque no depende de
 * nada más que de dónde está.
 *
 * ═══ Y POR QUÉ ESO SOLO NO BASTA ═══
 *
 * Porque una función de la distancia da el MISMO número a todas las parcelas que están a la
 * misma distancia, y ésas son un anillo entero de la ciudad. La regla decía la verdad sobre la
 * silueta grande y mentía sobre la pequeña: en la manzana, todos los tejados a la misma cota,
 * y una manzana de tejados a la misma cota vista desde el aire es una losa con juntas
 * pintadas. Eso es lo que Miguel vio.
 *
 * Así que la distancia sigue mandando —el centro es alto y el borde es bajo, y eso no se
 * negocia—, pero cerca de dos de cada cinco parcelas se descuelgan una planta de lo que les
 * tocaba. Cuál se descuelga lo dice `pulsoDeLaParcela`, que es del SITIO: la misma parcela da
 * el mismo tejado en las seis pantallas, hoy y cuando alguien meta un distrito nuevo. Y va
 * hacia abajo y nunca hacia arriba porque hacia arriba se comería el escalón de la avenida,
 * que es lo que hace que las avenidas se lean desde el aire.
 */
export function plantasQueTocan(recinto: RecintoDeLaCiudad, i: number, j: number, daAAvenida: boolean, daAVerde: boolean): number {
  const d = distanciaAlCentro(recinto.celdas, i, j);
  /*
   * Los tres tramos son los de la escala anterior multiplicados por 2,25 y redondeados, por
   * la misma razón que las bandas de la casilla: lo que se ve es la SILUETA, y una silueta es
   * una proporción. Dentro de las siete primeras celdas no hay bloques del pack —eso es el
   * centro de torres (§5)—, así que el 4 de ahí sólo lo cobra lo que se cuele.
   */
  let plantas = d <= RADIO_DEL_CENTRO ? 4 : d <= 16 ? 3 : 2;
  if (daAAvenida) plantas += 1;
  if (daAVerde) plantas -= 1;
  if (pulsoDeLaParcela(i, j, VETA_DE_LA_ALTURA) < PARCELAS_QUE_SE_DESCUELGAN) plantas -= 1;
  return Math.max(2, Math.min(4, plantas));
}

interface Manzanario {
  /** Las dos últimas letras puestas en esta manzana, para que no salgan tres iguales seguidas. */
  ultimas: string[];
  /** Los modelos distintos ya usados: como mucho tres por manzana. */
  usadas: string[];
}

/**
 * LA REGLA CONTRA EL DAMERO, y por qué es un rechazo y no una memoria.
 *
 * Dentro de una manzana no puede haber tres bloques iguales seguidos en el mismo frente, y
 * una manzana usa como mucho TRES modelos distintos. Si el sorteo repite el anterior dos
 * veces, se coge el siguiente de la lista del distrito; si la manzana ya gastó sus tres
 * modelos, se coge uno de ésos que no sea el anterior. Determinista, y sin guardar más que
 * dos letras por manzana.
 */
function letraQueToca(candidatas: readonly string[], estado: Manzanario, azar: () => number): string {
  if (candidatas.length === 0) return 'a';
  const orden = candidatas;
  let k = Math.floor(azar() * orden.length) % orden.length;
  for (let intento = 0; intento < orden.length * 2; intento++) {
    const letra = orden[k % orden.length] as string;
    const tresIguales = estado.ultimas.length >= 2 && estado.ultimas[0] === letra && estado.ultimas[1] === letra;
    const cuartoModelo = estado.usadas.length >= 3 && estado.usadas.indexOf(letra) < 0;
    if (!tresIguales && !cuartoModelo) {
      estado.ultimas = [letra, estado.ultimas[0] ?? letra];
      if (estado.usadas.indexOf(letra) < 0) estado.usadas.push(letra);
      return letra;
    }
    k++;
  }
  const letra = (estado.usadas.find((u) => u !== estado.ultimas[0]) ?? orden[0]) as string;
  estado.ultimas = [letra, estado.ultimas[0] ?? letra];
  return letra;
}

/** Cuánto vale una calle como frente de manzana: la avenida manda sobre el bulevar y éste sobre la calle. */
function categoriaDeCalle(c: ClaseDeCelda): number {
  return c === 'avenida' || c === 'glorieta' ? 3 : c === 'bulevar' ? 2 : c === 'calle' ? 1 : 0;
}

/** Las plantas de una torre del centro: de seis a catorce, y las más altas junto a la glorieta. */
export const PLANTAS_DE_TORRE = { minimo: 6, maximo: 14 } as const;
/** La huella de la torre de esquina de glorieta: cuatro celdas. */
export const HUELLA_DE_TORRE = 2 * RETICULA_DEL_BURGO;
/**
 * La huella de una torre de una celda: 10,80, o sea la celda menos su bordillo a cada lado.
 * Con los 12 justos, dos torres de celdas vecinas se tocarían y lo que se vería sería un
 * mazacote, no dos torres.
 */
export const HUELLA_DE_TORRE_SUELTA = RETICULA_DEL_BURGO - 2 * ANCHO_DEL_BORDILLO;

/**
 * LOS EDIFICIOS DE UNA TRAZA, en el orden de siempre: primero las cuatro torres de esquina de
 * glorieta, luego las torres de una celda y luego las parcelas, las dos en el orden de la
 * retícula. Gasta el azar en ese mismo orden —un meneo por torre, una letra por parcela—, y
 * es el último que lo gasta antes de lo que depende de la calidad.
 */
export function levantarLosEdificios(recinto: RecintoDeLaCiudad, t: TrazadoDelBurgo, azar: () => number): EdificioDelBurgo[] {
  const idx = (i: number, j: number): number => j * t.n + i;
  const edificios: EdificioDelBurgo[] = [];
  const manzanarios = new Map<number, Manzanario>();
  const yaEnTorre = new Set<number>();

  /**
   * ── LAS TORRES DEL CENTRO ──
   *
   * Dos clases, y la diferencia se ve desde la pose de salida: las CUATRO de las esquinas de
   * la glorieta ocupan cuatro celdas (24 × 24) y son las que rematan el centro, y las demás
   * —todas las parcelas que caen a siete celdas o menos de la glorieta— ocupan una. Las
   * plantas suben hacia la glorieta y no se sortean del todo: `plantas = mínimo + (radio − d)
   * / radio × (máximo − mínimo)`, con una planta de más o de menos que sí sortea la semilla.
   * Eso es lo que hace que la silueta suba hacia el centro en vez de dar dientes de sierra.
   */
  const plantasDeUnaTorre = (i: number, j: number, cuatroCeldas: boolean): number => {
    const d = distanciaAlCentro(t.n, i, j);
    const tramo = PLANTAS_DE_TORRE.maximo - PLANTAS_DE_TORRE.minimo;
    const cerca = Math.max(0, (RADIO_DEL_CENTRO - d) / RADIO_DEL_CENTRO);
    const base = PLANTAS_DE_TORRE.minimo + Math.round(cerca * tramo) + (cuatroCeldas ? 1 : 0);
    const meneo = (Math.floor(azar() * 3) % 3) - 1;
    return Math.max(PLANTAS_DE_TORRE.minimo, Math.min(PLANTAS_DE_TORRE.maximo, base + meneo));
  };
  /**
   * LA FACHADA DE UNA TORRE MIRA A SU MEJOR CALLE, y no a la glorieta.
   *
   * Mirar siempre al centro sonaba bien y estaba mal: una torre de una celda rodeada de otras
   * tres torres se quedaba con la fachada contra un vecino y sin portal. El portal es la cara
   * que da a la calle de más categoría (avenida antes que bulevar, y bulevar antes que
   * calle), que es la misma regla que usan las parcelas.
   */
  const frenteDeLaTorre = (celdas: readonly { readonly i: number; readonly j: number }[]): Rumbo | null => {
    let mejor = 0;
    let frente: Rumbo = 0;
    for (const c of celdas) {
      for (const r of RUMBOS) {
        const p = PASO_DEL_RUMBO[r] as { di: number; dj: number };
        const vi = c.i + p.di;
        const vj = c.j + p.dj;
        if (vi < 0 || vj < 0 || vi >= t.n || vj >= t.n) continue;
        if (celdas.some((x) => x.i === vi && x.j === vj)) continue;
        const cat = categoriaDeCalle(t.clase[idx(vi, vj)] as ClaseDeCelda);
        if (cat > mejor) {
          mejor = cat;
          frente = r;
        }
      }
    }
    return mejor === 0 ? null : frente;
  };
  /*
   * El portal de una torre está a media celda por cada celda de lado desde su centro: 6 en una
   * de una celda y 12 en una de cuatro. La cuenta era `celdas.length ** 0.5`, y `**` es
   * `Math.pow`, que la especificación deja aproximada; `Math.sqrt` está fijada al bit, y de 1
   * y de 4 da 1 y 2 exactos, lo mismo que daba.
   */
  const ponUnaTorre = (celdas: readonly { readonly i: number; readonly j: number }[], centro: Punto, huella: number, plantas: number): void => {
    const frente = frenteDeLaTorre(celdas);
    if (frente === null) return;
    const alto = ALTURA_DEL_BORDILLO + plantas * ALTURA_DE_PLANTA_DEL_BURGO;
    const v = vectorDelRumbo(frente);
    edificios.push({
      indice: edificios.length,
      celdas: celdas.map((b) => ({ i: b.i, j: b.j })),
      manzana: t.manzana[idx((celdas[0] as { i: number; j: number }).i, (celdas[0] as { i: number; j: number }).j)] as number,
      distrito: 'centro',
      centro,
      frente,
      giro: giroMirandoA(frente),
      plantas,
      cascara: null,
      ancho: huella,
      fondo: huella,
      alto,
      portal: { x: centro.x + v.x * (RETICULA_DEL_BURGO / 2) * Math.sqrt(celdas.length), z: centro.z + v.z * (RETICULA_DEL_BURGO / 2) * Math.sqrt(celdas.length) },
      retranqueo: (huella > RETICULA_DEL_BURGO ? 0 : RETICULA_DEL_BURGO - huella) / 2,
    });
  };

  for (const info of t.cuadrantes) {
    const esquina = LADO_DEL_CUADRANTE - 1;
    const bloque = [aLaReticula(info.marco, esquina - 1, esquina - 1), aLaReticula(info.marco, esquina, esquina - 1), aLaReticula(info.marco, esquina - 1, esquina), aLaReticula(info.marco, esquina, esquina)];
    if (!bloque.every((b) => t.clase[idx(b.i, b.j)] === 'torre')) continue;
    for (const b of bloque) yaEnTorre.add(idx(b.i, b.j));
    const a = centroDeCelda(recinto, bloque[0]?.i ?? 0, bloque[0]?.j ?? 0);
    const d = centroDeCelda(recinto, bloque[3]?.i ?? 0, bloque[3]?.j ?? 0);
    const centro = { x: (a.x + d.x) / 2, z: (a.z + d.z) / 2 };
    ponUnaTorre(bloque, centro, HUELLA_DE_TORRE, plantasDeUnaTorre(bloque[0]?.i ?? 0, bloque[0]?.j ?? 0, true));
  }
  for (let j = 0; j < t.n; j++) {
    for (let i = 0; i < t.n; i++) {
      if (t.clase[idx(i, j)] !== 'torre' || yaEnTorre.has(idx(i, j))) continue;
      yaEnTorre.add(idx(i, j));
      ponUnaTorre([{ i, j }], centroDeCelda(recinto, i, j), HUELLA_DE_TORRE_SUELTA, plantasDeUnaTorre(i, j, false));
    }
  }

  /* ── Y las parcelas: una celda, un edificio, mirando a SU calle ── */
  for (let j = 0; j < t.n; j++) {
    for (let i = 0; i < t.n; i++) {
      const k = idx(i, j);
      const clase = t.clase[k] as ClaseDeCelda;
      if (clase !== 'parcela' || yaEnTorre.has(k)) continue;
      const centro = centroDeCelda(recinto, i, j);

      let frente: Rumbo = 0;
      let mejor = 0;
      for (const r of RUMBOS) {
        const p = PASO_DEL_RUMBO[r] as { di: number; dj: number };
        const vi = i + p.di;
        const vj = j + p.dj;
        if (vi < 0 || vj < 0 || vi >= t.n || vj >= t.n) continue;
        const cat = categoriaDeCalle(t.clase[idx(vi, vj)] as ClaseDeCelda);
        if (cat > mejor) {
          mejor = cat;
          frente = r;
        }
      }
      if (mejor === 0) continue;
      const daAAvenida = mejor >= 2;
      const daAVerde = RUMBOS.some((r) => {
        const p = PASO_DEL_RUMBO[r] as { di: number; dj: number };
        const vi = i + p.di;
        const vj = j + p.dj;
        if (vi < 0 || vj < 0 || vi >= t.n || vj >= t.n) return false;
        const dd = t.distrito[idx(vi, vj)];
        return (dd === 'parque' || dd === 'cementerio') && t.clase[idx(vi, vj)] === 'reserva';
      });

      const distritoDeLaCelda = (t.distrito[k] ?? 'ensanche') as NombreDeDistrito;
      const letras = (LETRAS_DEL_DISTRITO[distritoDeLaCelda] ?? LETRAS_DEL_DISTRITO['ensanche']) as readonly string[];
      const quiere = plantasQueTocan(recinto, i, j, daAAvenida, daAVerde);
      /*
       * Y SI EL DISTRITO NO TIENE ESA ALTURA, SE COGE LA MÁS CERCANA — no la lista entera.
       *
       * El respaldo era `letras`, o sea todas, o sea que en cuanto el sitio pedía una altura
       * que el distrito no tenía, la petición se tiraba a la basura y volvía a valer cualquier
       * cosa. Con las listas de una sola altura que había antes eso pasaba SIEMPRE menos en un
       * caso, y por eso la altura no se veía por ningún lado. Ahora las listas tienen dos
       * alturas y el respaldo se queda con la que menos se aleja, así que el escalón de la
       * avenida y el descuelgue de la parcela siguen leyéndose aunque el distrito no llegue.
       */
      const cerca = letras.reduce((mejorHasta, l) => Math.min(mejorHasta, Math.abs(plantasDeLaLetra(l) - quiere)), Number.POSITIVE_INFINITY);
      const candidatas = letras.filter((l) => Math.abs(plantasDeLaLetra(l) - quiere) === cerca);
      const manzana = t.manzana[k] as number;
      let estado = manzanarios.get(manzana);
      if (estado === undefined) {
        estado = { ultimas: [], usadas: [] };
        manzanarios.set(manzana, estado);
      }
      const letra = letraQueToca(candidatas, estado, azar);

      /*
       * BLOQUE O CUERPO, y no por gusto: en avenida y bulevar la ciudad va entre medianeras
       * —el `bloque-*` trae su propia parcela de 12 × 12 y llega de borde a borde—, y en
       * calle secundaria va con retranqueo, o sea `cuerpo-*` sobre una `solera` con 2,4 de
       * acera libre por delante. Y los cuerpos que miden 12,04 de frente (e, f, g) NO
       * existen sueltos: ésos van siempre con bloque.
       *
       * Y EL CHALET SE RETRANQUEA MÁS QUE NADIE, que es lo que hace que un barrio de chalets
       * parezca un barrio de chalets: el cuerpo se va al fondo de la parcela y deja delante
       * un jardín entero para su verja, su seto y su coche.
       */
      const esChalet = distritoDeLaCelda === 'chalets';
      const acera = esChalet ? ACERA_DEL_CHALET : ACERA_LIBRE;
      const puedeCuerpo = CUERPO_DE_LETRA[letra] !== undefined && (!daAAvenida || esChalet);
      const cascara = (puedeCuerpo ? CUERPO_DE_LETRA[letra] : BLOQUE_DE_LETRA[letra]) as CascaraDelBurgo;
      const cuerpo = CUERPO_DEL_MODELO[cascara] as CuerpoDelPack;
      const giro = giroMirandoA(frente);
      const v = vectorDelRumbo(frente);
      const desplazamiento = puedeCuerpo ? RETICULA_DEL_BURGO / 2 - acera - cuerpo.frente : 0;
      const sitio = { x: centro.x + v.x * desplazamiento, z: centro.z + v.z * desplazamiento };
      const alto = ALTURA_DEL_BORDILLO + cuerpo.plantas * ALTURA_DE_PLANTA_DEL_BURGO;
      edificios.push({
        indice: edificios.length,
        celdas: [{ i, j }],
        manzana,
        distrito: distritoDeLaCelda,
        centro: sitio,
        frente,
        giro,
        plantas: cuerpo.plantas,
        cascara,
        ancho: cuerpo.ancho,
        fondo: cuerpo.fondo,
        alto,
        portal: { x: centro.x + v.x * (RETICULA_DEL_BURGO / 2), z: centro.z + v.z * (RETICULA_DEL_BURGO / 2) },
        retranqueo: puedeCuerpo ? acera : 0,
      });
    }
  }
  return edificios;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  7. EL AZAR, Y LA TRAZA ENTERA DE UNA SEMILLA
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * EL CHORRO DE AZAR DE LA CIUDAD: el `mulberry32` de `shared/mecanicas/azar.ts`, servido como
 * función. Es el mismo generador que usa el reductor, y da la misma sucesión que el `sorteo` de
 * `embarcadero/cala.ts` con el que la ciudad se levantó siempre.
 *
 * Que sea una función con estado no rompe la pureza de nadie: se crea dentro de quien la usa y
 * muere con él, así que la misma semilla da la misma ciudad todas las veces.
 */
export function azarDelBurgo(semilla: number): () => number {
  let estado = sembrar(semilla);
  return () => {
    const tirada = siguiente(estado);
    estado = tirada.azar;
    return tirada.valor;
  };
}

/**
 * LA TRAZA DE UNA SEMILLA: la retícula y los edificios, y el azar que sigue.
 *
 * `azar` es el MISMO chorro, ya gastado en lo que gasta la estructura. Lo que se sortee con él a
 * partir de aquí —el sendero del parque, las tumbas, la carga del canal, los coches— es adorno:
 * la escena lo sigue gastando en el orden de siempre, y el mundo declarado no lo mira.
 */
export interface TrazaDelBurgo {
  readonly trazado: TrazadoDelBurgo;
  readonly edificios: readonly EdificioDelBurgo[];
  readonly azar: () => number;
}

export function trazaDelBurgo(semilla: number, recinto: RecintoDeLaCiudad = RECINTO_DEL_BURGO): TrazaDelBurgo {
  const azar = azarDelBurgo(semilla);
  const trazado = trazarLaReticula(recinto, azar);
  const edificios = levantarLosEdificios(recinto, trazado, azar);
  return { trazado, edificios, azar };
}
