/**
 * LA CIUDAD DE EL BURGO: la aritmética que la levanta entera, sin `three`.
 *
 * ═══ QUÉ ES ESTO Y QUÉ NO ═══
 *
 * El centro del tablero del Burgo era una muralla con nada dentro. Miguel lo vio y pidió
 * lo contrario: un área central mucho más grande con «una ciudad de verdad» —edificios de
 * varias plantas con salas dentro, carreteras, un parque estilo el de Nueva York, un
 * cementerio, un centro comercial, un polígono y hasta un circuito de carreras—, moderna,
 * generada procedimentalmente «pero con sentido», y con «una cantidad de detalles bien
 * organizados increíble». El plano con los números medidos es `docs/burgo/LA-CIUDAD.md`;
 * este fichero es ese plano ejecutado.
 *
 * Aquí NO se pinta nada. `generarLaCiudad` devuelve LISTAS DE PUESTAS —«esta pieza, en
 * este punto, con este giro»— y listas de BULTOS PROPIOS —«un prisma de estas medidas y
 * este color»—, y `Burgo.tsx` sólo instancia. El motivo es el mismo que en
 * `anillo-en-3d.ts`: si una farola está en mitad de la calzada, el fallo está aquí, y aquí
 * lo puede medir `verify:la-ciudad` en Node, sin abrir un contexto de dibujo. Una ciudad
 * mal trazada no da error en ninguna consola: se ve.
 *
 * ═══ LA MISMA MESA, LA MISMA CIUDAD ═══
 *
 * Todo lo que se sortea sale de `semillaDelCodigo(codigo)` (`shared/mecanicas/semilla.ts`),
 * que es el código de la mesa y llega por props. NUNCA de `ctx.azar`, que es secreto y
 * filtraría la semilla de las reglas. Los seis aparatos de una mesa ven la misma ciudad, y
 * otra mesa ve otra, y las dos tienen sentido. El sorteo es el mulberry32 de
 * `embarcadero/cala.ts`.
 *
 * Y por lo mismo: aquí no se llama a `Math.sin` ni a `Math.cos` para calcular un SITIO. Los
 * giros son múltiplos exactos de un cuarto de vuelta (constantes), y las curvas —el
 * óvalo del circuito, el sendero del parque— se trazan con una tabla de cosenos escrita a
 * mano (`COSENO_DEL_CUARTO`) y con sumas y productos. Dos motores de JavaScript pueden
 * diferir en el último bit de un seno; una ciudad que no coincide entre el móvil y el PC
 * no es la misma ciudad.
 *
 * ═══ LAS TRES MEDIDAS QUE MANDAN, Y DE DÓNDE SALEN ═══
 *
 * Ninguna se eligió: las tres salieron de medir los ocho packs (§0 de `LA-CIUDAD.md`).
 *
 *     una persona ............ 2,543   `escenas/escala.ts`
 *     el módulo de sala ......     4   `restaurant-bits/wall` 4 × 4 × 0,5, y cuatro más
 *     la retícula de la ciudad   12    las siete losas del City Builder miden 2 × 2, × 6
 *
 * Y de ahí la altura de planta: la del pack mide 0,750 (`building_C…G_withoutBase` miden
 * 2,250 = 3 × 0,750 clavado), y 0,75 × 6 = 4,50 = módulo de sala (4) + losa (0,5). O sea:
 * las ventanas de la fachada del pack caen EXACTAMENTE en los pisos que se construyen
 * dentro. Eso es lo que hace que abrir un edificio no enseñe un suelo cruzando una ventana.
 *
 * ═══ LA ESCALA, QUE ES LO QUE MANDA SOBRE TODO LO DEMÁS ═══
 *
 * Este fichero se escribió para un recinto de 288 —cuatro veces el centro de 72 del primer
 * tablero— y Miguel pidió, literalmente, «por lo menos 9-10 veces». Nueve veces son 648, y
 * 648 es el recinto: 54 celdas de 12 sin resto, nueve casillas de 72 por lado. La ciudad
 * pasa de 576 celdas a 2.916, o sea de «cuatro bloques» a 458 × 458 metros de ciudad.
 *
 * De ahí salen las TRES cosas que cambian de raíz, y ninguna es «lo mismo pero más grande»:
 *
 *  1. EL ESQUELETO CRECE CON EL RECINTO. Un bulevar de una celda y unas avenidas de dos eran
 *     la mitad y la cuarta parte de una casilla; con 54 celdas serían hilos. El bulevar pasa
 *     a DOS celdas (24) y las avenidas a CUATRO (48). Y con eso aparece un problema que con
 *     una celda no existía: una calzada ancha son varias losas del pack pegadas, y las losas
 *     traen bordillo. Lo resuelve la regla de la MEDIANA (`cruzaLaMediana`), abajo.
 *  2. LOS DISTRITOS PASAN DE OCHO A DIECISÉIS. Con 288 cabían cuatro grandes y cuatro
 *     tejidos; con 648 caben, además, el estadio, el hospital, el colegio, la estación, el
 *     canal con sus muelles, la feria, la gasolinera, la obra y el barrio de chalets, que es
 *     lo que Miguel pidió con «todo tipo de áreas que pueda tener una ciudad».
 *  3. EL NIVEL DE DETALLE DEJA DE SER UN AHORRO Y PASA A SER LA ÚNICA FORMA DE QUE LA CIUDAD
 *     EXISTA. Ver abajo.
 *
 * ═══ LAS CAPAS: POR QUÉ ESTE FICHERO YA NO DEVUELVE «LA CIUDAD», SINO CÓMO SE MONTA ═══
 *
 * La cuenta es de servilleta y no admite discusión: 2.916 celdas, un bloque del pack cuesta
 * unos 1.100 triángulos, y si el 45 % de las celdas llevan bloque son 1.443.000 triángulos
 * sólo de cáscaras. El tope en un PC es 900.000 para el tablero ENTERO. O sea: la ciudad no
 * cabe, no cabrá, y no hay forma de recortarla pieza a pieza hasta que quepa.
 *
 * Así que la ciudad se parte en GRUPOS —una manzana, una tesela de calle de 6 × 6 celdas, un
 * distrito— y cada grupo trae TRES montajes suyos (`GrupoDeLaCiudad.niveles`):
 *
 *     L1  todo: bloques del pack, coches aparcados, farolas, semáforos, bancos, terrazas
 *     L2  las calles del pack (que son lo que dibuja la trama urbana) y, en vez del bloque,
 *         un prisma con banda de ventanas de 30 triángulos
 *     L3  una manta de asfalto de 2 triángulos por celda y un prisma por edificio
 *
 * `montarLaCiudad(ciudad, x, z)` dice, para una cámara, qué grupo va a qué nivel y cuánto
 * pesa el conjunto. El TOPE ya no es la suma de la ciudad entera —esa suma no significa
 * nada—: es el techo de LO QUE ESTÁ MONTADO A LA VEZ, y eso es lo que mide
 * `verify:la-ciudad` desde ocho poses de cámara distintas y con veinte semillas.
 *
 * Que L2 cambie el bloque por un prisma y NO al revés está medido: a 156 de distancia una
 * ventana del pack (1,2 unidades) mide 10 px; a 300, 5,2; a 420, 3,7. Por debajo de 5 px el
 * bloque de 1.100 triángulos y el prisma de 30 son la misma mancha. Lo que NO se sustituye
 * a esa distancia son las calles: la trama de calles es lo que hace que se lea «ciudad».
 *
 * ═══ LA REGLA QUE RESUELVE TODOS LOS CRUCES ═══
 *
 * No hay una tabla de casos escrita a mano diciendo «aquí una te girada un cuarto». Cada
 * celda de calle mira a sus cuatro vecinas, y de ahí salen la pieza y el giro
 * (`piezaDeCalzada`). Por eso no puede haber un cruce mal resuelto: no hay ningún sitio
 * donde equivocarse. Y las CARAS ABIERTAS de cada losa del pack (`CARAS_ABIERTAS`) están
 * MEDIDAS del `.glb` rasterizando su superficie —dónde hay bordillo a 0,60 y dónde asfalto
 * a 0,42—, no supuestas: `verify:la-ciudad` vuelve a medirlas y se cae si la tabla miente.
 *
 * ═══ LO QUE ESTE FICHERO NO IMPORTA, A PROPÓSITO ═══
 *
 * Ni `three`, ni React, ni `anillo-en-3d.ts`. Lo primero porque es dato y lo leen el
 * comprobador y los dos clientes. Lo tercero porque el anillo se está reescribiendo a la
 * vez que esto: el recinto entra por parámetro (`RECINTO_DEL_BURGO`, con los números de
 * `LA-CIUDAD.md` §1) y `PuestaEnLaCiudad` tiene la MISMA forma que la `Puesta` del anillo
 * —`{ pieza, x, y, z, giro, talla }`— para que las dos listas se instancien igual sin que
 * ninguno de los dos ficheros dependa del otro.
 */
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { sorteo } from '../embarcadero/cala';
import { PIEZA } from './piezas';
import type { NombreDePieza } from './piezas';
import { ALTURA_DE_PLANTA, GRUESO_DE_LA_LOSA, MODULO_DE_LA_CIUDAD, RETICULA_DE_LA_CIUDAD } from './piezas';
import type { Calidad } from '../embarcadero/tipos';

/* ══════════════════════════════════════════════════════════════════════════
 *  1. EL RECINTO Y LA RETÍCULA
 * ══════════════════════════════════════════════════════════════════════════ */

export interface Punto {
  readonly x: number;
  readonly z: number;
}

/**
 * UNA PUESTA: una pieza del `.glb`, en un punto, con un giro y una talla.
 *
 * La misma forma que la `Puesta` de `anillo-en-3d.ts`, y a propósito no importada de allí:
 * ver la cabecera. `talla` es SIEMPRE 1 en la ciudad —`burgo.glb` sale ya a escala del
 * mundo, la escala va horneada (ver `piezas.ts`)— y está en el tipo para que las dos
 * listas se instancien con el mismo código.
 */
export interface PuestaEnLaCiudad {
  readonly pieza: NombreDePieza;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly giro: number;
  readonly talla: number;
}

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
export const CELDAS_POR_LADO = LADO_DEL_RECINTO / RETICULA_DE_LA_CIUDAD;

export const RECINTO_DEL_BURGO: RecintoDeLaCiudad = {
  lado: LADO_DEL_RECINTO,
  celdas: CELDAS_POR_LADO,
  centro: { x: 0, z: 0 },
};

/* ── La losa de calle por dentro, medida vértice a vértice y ya en unidades del mundo ── */

/** El bordillo: 0,60 de ancho y 0,60 de alto a cada lado, de |x| = 5,40 a 6,00. */
export const ANCHO_DEL_BORDILLO = 0.6;
/** La cota de la acera y de la parcela: lo que sube el bordillo. */
export const ALTURA_DEL_BORDILLO = 0.6;
/** La cota del asfalto. */
export const ALTURA_DEL_ASFALTO = 0.42;
/** 10,80 entre bordillos: 7,64 m, dos carriles de 3,82. */
export const ANCHO_DE_LA_CALZADA = RETICULA_DE_LA_CIUDAD - 2 * ANCHO_DEL_BORDILLO;
/** 5,40: un carril. Su eje está a la mitad, 2,70 del eje de la calzada. */
export const ANCHO_DEL_CARRIL = ANCHO_DE_LA_CALZADA / 2;
/** 2,70: a dónde va el eje de un carril desde el eje de su losa. */
export const EJE_DEL_CARRIL = ANCHO_DEL_CARRIL / 2;
/** 5,70: donde se plantan farolas y semáforos, en el bordillo. */
export const EJE_DEL_BORDILLO = RETICULA_DE_LA_CIUDAD / 2 - ANCHO_DEL_BORDILLO / 2;

/** El centro de la celda (i, j) en el mundo. */
export function centroDeCelda(recinto: RecintoDeLaCiudad, i: number, j: number): Punto {
  const mitad = recinto.lado / 2;
  return {
    x: recinto.centro.x - mitad + RETICULA_DE_LA_CIUDAD * i + RETICULA_DE_LA_CIUDAD / 2,
    z: recinto.centro.z - mitad + RETICULA_DE_LA_CIUDAD * j + RETICULA_DE_LA_CIUDAD / 2,
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
 */
export type Rumbo = 0 | 1 | 2 | 3;
export const RUMBOS: readonly Rumbo[] = [0, 1, 2, 3];
const PASO_DEL_RUMBO: readonly { readonly di: number; readonly dj: number }[] = [
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

/**
 * EL GIRO DE UNA FAROLA O DE UN SEMÁFORO, que no miran: TIENDEN EL BRAZO.
 *
 * Medido: `farola-de-calle` va de x = −1,435 a 0,181 y `semaforo-c` de −4,584 a 0,202. O
 * sea, el mástil está en el origen y el brazo sale hacia el −X local. Girando `cuartos`, el
 * −X local va a: 0 → −x, 1 → +z, 2 → +x, 3 → −z.
 */
export function cuartosDelBrazoHacia(r: Rumbo): number {
  return (2 - r + 4) % 4;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  2. LAS CARAS ABIERTAS DE CADA LOSA DE CALLE, MEDIDAS
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * QUÉ CARAS DE UNA LOSA DEJAN PASAR LA CALZADA, SIN GIRAR, COMO MÁSCARA DE CUATRO BITS.
 *
 * El bit `r` está a uno si por esa cara sale asfalto, y a cero si por ahí hay bordillo.
 * NO está supuesto: sale de rasterizar la superficie superior de cada losa del `burgo.glb`
 * en una malla de 24 × 24 y mirar la altura —0,42 asfalto, 0,60 bordillo—. Lo que se ve:
 *
 *     calzada / calzada-paso    bordillo en las dos columnas |x| = 6  → abre ±z
 *     calzada-cruce             bordillo sólo en las cuatro esquinas  → abre las cuatro
 *     calzada-te                bordillo en toda la columna −x        → cierra −x
 *     calzada-curva             bordillo en −z y en −x                → abre +x y +z
 *     calzada-curva-suave       lo mismo, con un acuerdo de radio 6,5 → abre +x y +z
 *
 * `verify:la-ciudad` vuelve a rasterizar el fichero y compara con esta tabla: si el día de
 * mañana el pack cambia una losa, la ciudad no se traza con una tabla vieja en silencio.
 */
export const CARA = { este: 1, sur: 2, oeste: 4, norte: 8 } as const;
export const CARAS_ABIERTAS: Readonly<Record<string, number>> = {
  [PIEZA.calzada]: CARA.sur | CARA.norte,
  [PIEZA.calzadaPaso]: CARA.sur | CARA.norte,
  [PIEZA.calzadaCruce]: CARA.este | CARA.sur | CARA.oeste | CARA.norte,
  [PIEZA.calzadaTe]: CARA.este | CARA.sur | CARA.norte,
  [PIEZA.calzadaCurva]: CARA.este | CARA.sur,
  [PIEZA.calzadaCurvaSuave]: CARA.este | CARA.sur,
};

/**
 * GIRAR UNA MÁSCARA DE CARAS.
 *
 * Un cuarto de vuelta lleva el +X local al −Z del mundo (ver `cuartosMirandoA`), o sea: la
 * cara `r` de la pieza acaba mirando al rumbo `(r − cuartos + 4) % 4` del mundo.
 */
export function mascaraGirada(mascara: number, cuartos: number): number {
  let salida = 0;
  for (const r of RUMBOS) {
    if ((mascara & (1 << r)) !== 0) salida |= 1 << ((r - cuartos + 8) % 4);
  }
  return salida;
}

/** Cuántos bits tiene puestos una máscara de cuatro. */
export function carasDe(mascara: number): number {
  return (mascara & 1) + ((mascara >> 1) & 1) + ((mascara >> 2) & 1) + ((mascara >> 3) & 1);
}

/**
 * LA PIEZA Y EL GIRO DE UNA CELDA DE CALLE, DE SUS VECINAS Y DE NADA MÁS.
 *
 * Ésta es la regla de `LA-CIUDAD.md` §3 entera. No hay excepciones ni casos especiales: se
 * cuentan las vecinas de calle, se pide una losa que abra por ahí y se busca el cuarto de
 * vuelta que lo cumple. Si no hubiera ninguno, es que la máscara no la sabe hacer ninguna
 * losa del pack, y eso es un error de la traza que hay que ver: se devuelve `null` y el
 * comprobador lo dice.
 */
export function piezaDeCalzada(abre: number): { readonly pieza: NombreDePieza; readonly cuartos: number } | null {
  const candidatas: readonly NombreDePieza[] =
    carasDe(abre) === 4
      ? [PIEZA.calzadaCruce]
      : carasDe(abre) === 3
        ? [PIEZA.calzadaTe]
        : carasDe(abre) === 2
          ? [PIEZA.calzada, PIEZA.calzadaCurva]
          : [PIEZA.calzada];
  for (const pieza of candidatas) {
    const base = CARAS_ABIERTAS[pieza] as number;
    for (let cuartos = 0; cuartos < 4; cuartos++) {
      /* Con una sola vecina se pone una recta en su eje: la cara de enfrente da al fondo de saco. */
      const buscada = carasDe(abre) === 1 ? abre | (1 << rumboContrario(ejeDeLaMascara(abre))) : abre;
      if (mascaraGirada(base, cuartos) === buscada) return { pieza, cuartos };
    }
  }
  return null;
}

/** El único rumbo de una máscara de una sola cara. */
function ejeDeLaMascara(mascara: number): Rumbo {
  for (const r of RUMBOS) if ((mascara & (1 << r)) !== 0) return r;
  return 0;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  3. LOS TIPOS DE LA CIUDAD
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

export interface CeldaDeLaCiudad {
  readonly i: number;
  readonly j: number;
  readonly x: number;
  readonly z: number;
  readonly clase: ClaseDeCelda;
  readonly distrito: NombreDeDistrito | null;
  readonly cuadrante: Cuadrante | null;
  /** Sólo en las celdas de calle: cuántas y cuáles vecinas de calle tiene. */
  readonly abre: number;
  /** El índice de la manzana a la que pertenece, o −1. */
  readonly manzana: number;
}

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
 * UN BULTO PROPIO: geometría que no está en ningún pack y que la escena construye.
 *
 * Losas, tabiques, torres, praderas, gradas, naves, isletas. Todas son prismas o planos con
 * color por vértice, y por eso caben en una sola descripción: caja, sitio, giro, color y
 * cuántos triángulos cuesta. El presupuesto los suma con ese número, así que si alguien
 * cambia la geometría en `Burgo.tsx` y no cambia el número, el comprobador miente: por eso
 * el número va aquí, con la caja al lado, y no en la escena.
 */
export type ClaseDeBulto =
  | 'losa-de-sala'
  | 'tabique'
  | 'techo'
  | 'escalera'
  | 'torre'
  | 'jardin'
  | 'pradera'
  | 'estanque'
  | 'templete'
  | 'tierra'
  | 'asfalto'
  | 'plaza-de-aparcamiento'
  | 'nave'
  | 'gradas'
  | 'isleta'
  | 'pedestal'
  /* Los que traen los distritos nuevos: todos son prismas o planos, y todos van medidos. */
  | 'cesped'
  | 'via'
  | 'anden'
  | 'marquesina'
  | 'agua'
  | 'cantil'
  | 'puente'
  | 'pista-de-colegio'
  | 'surtidor'
  | 'forjado'
  | 'pilar'
  | 'brazo-de-grua'
  | 'toldo'
  | 'porche'
  /**
   * EL PRISMA CON QUE SE PINTA UN EDIFICIO DE LEJOS (L2), y la manzana entera fundida (L3).
   * No son un adorno: son la única forma de que la ciudad de 2.916 celdas exista (cabecera).
   */
  | 'prisma'
  | 'manzana-fundida';

export interface BultoPropio {
  readonly clase: ClaseDeBulto;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly giro: number;
  /** La caja, en ejes locales del bulto: ancho en x, alto en y, fondo en z. */
  readonly ancho: number;
  readonly alto: number;
  readonly fondo: number;
  /** `#rrggbb` del color por vértice. */
  readonly color: string;
  readonly triangulos: number;
}

/** Una cinta: un camino con anchura constante. El sendero del parque, la pista del circuito, un quitamiedos. */
export interface CintaPropia {
  readonly clase: 'sendero' | 'pista' | 'quitamiedos' | 'linea-de-meta' | 'acera-de-parque';
  readonly puntos: readonly Punto[];
  readonly cerrada: boolean;
  readonly ancho: number;
  /** La cota del centro de la cinta. */
  readonly y: number;
  /** Lo que levanta, si levanta (el quitamiedos, 1,2). */
  readonly alto: number;
  readonly color: string;
  readonly triangulos: number;
}

export type UsoDeSala = 'salon' | 'cocina' | 'comedor' | 'tienda' | 'oficina' | 'dormitorio' | 'almacen';

export interface EdificioDeLaCiudad {
  readonly indice: number;
  /** Las celdas que ocupa: una, o cuatro si es torre de esquina de glorieta. */
  readonly celdas: readonly { readonly i: number; readonly j: number }[];
  /** La manzana a la que pertenece: es el GRUPO con el que sube y baja de nivel de detalle. */
  readonly manzana: number;
  readonly distrito: NombreDeDistrito;
  readonly centro: Punto;
  /** El rumbo al que da la fachada: hacia la calle. */
  readonly frente: Rumbo;
  readonly giro: number;
  readonly plantas: number;
  /** La cáscara del pack, o `null` en las torres (que son geometría propia). */
  readonly cascara: NombreDePieza | null;
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
  /** El prisma con el que se pinta de lejos (L3): 12 triángulos de cuerpo y 8 de banda. */
  readonly prisma: { readonly ancho: number; readonly alto: number; readonly fondo: number; readonly triangulos: number };
  readonly triangulos: number;
}

export interface PuestaDeSala {
  readonly edificio: number;
  readonly planta: number;
  readonly sala: number;
  readonly uso: UsoDeSala;
  /** El centro de la sala en el mundo, y su caja en ejes del edificio. */
  readonly centro: Punto;
  readonly ancho: number;
  readonly fondo: number;
  readonly giro: number;
  /** La cota del suelo de la sala. */
  readonly y: number;
  /** El hueco de la puerta, en ejes de la sala (origen en su centro). */
  readonly puerta: { readonly u: number; readonly v: number; readonly ancho: number; readonly pared: Rumbo };
  /** La pared de la que cuelga todo lo de esta clase de sala, en ejes de la sala. */
  readonly anclaje: Rumbo;
  readonly bultos: readonly BultoPropio[];
  readonly muebles: readonly PuestaEnLaCiudad[];
  readonly triangulos: number;
}

/** Un semáforo de la ciudad: dónde está, qué cruce manda y qué eje empieza en verde. */
export interface SemaforoDeLaCiudad {
  readonly cruce: number;
  readonly i: number;
  readonly j: number;
  readonly x: number;
  readonly z: number;
  /** 0 el eje este-oeste, 1 el norte-sur. El que empieza en verde: `(i + j) % 2`. */
  readonly ejeQueEmpieza: 0 | 1;
}

/**
 * UNA RUTA DE COCHE: una polilínea cerrada por el eje de su carril, y un HORARIO.
 *
 * El horario es la parte que no estaba en el plano y que hubo que resolver. `LA-CIUDAD.md`
 * §7 pide que la posición sea función pura del reloj (`s = (v·t + fase) mod largo`) y a la
 * vez que el coche PARE en los semáforos. Las dos cosas juntas no salen con un factor
 * aplicado al parámetro: el factor `(d/12)²` deja el coche clavado en la línea justo en el
 * instante en que habría llegado, y ni un segundo más, así que en cuanto el rojo dura, el
 * coche se lo salta o pega un salto al soltarse. Lo medido: un rojo dura 6 s y a 12 u/s eso
 * son 72 unidades de salto.
 *
 * Lo que se hace en su lugar sigue siendo función pura y además para de verdad: la traza
 * SIMULA UNA VUELTA al generar la ciudad y guarda el resultado como una tabla de instantes
 * y avances (`horario`). En ejecución sólo se interpola, y el periodo se ajusta —esperando
 * un poco de más en el último semáforo— para que sea múltiplo exacto del ciclo de 12 s: así
 * la vuelta siguiente encuentra los semáforos en la misma fase y la tabla vale para siempre.
 * Sin estado, sin integración, sin acumular error, y una pausa no lo descoloca.
 */
export interface RutaDeCoche {
  readonly pieza: NombreDePieza;
  /** Por dónde va: las de `calle` tienen que caer en losa de calle; las de `circuito`, en su pista. */
  readonly clase: 'calle' | 'circuito';
  /** El eje del carril, punto a punto. Cerrada: el último enlaza con el primero. */
  readonly puntos: readonly Punto[];
  /** El avance acumulado de cada punto; el último es el largo. */
  readonly avances: readonly number[];
  readonly largo: number;
  readonly velocidad: number;
  readonly y: number;
  /** Dónde para y por qué: el avance de la línea de parada, el cruce y el eje del coche. */
  readonly paradas: readonly { readonly s: number; readonly cruce: number; readonly eje: 0 | 1 }[];
  /** La tabla {instante, avance}, monótona, que cubre un periodo entero. */
  readonly horario: readonly { readonly t: number; readonly s: number }[];
  /** El periodo del horario, múltiplo exacto del ciclo del semáforo. */
  readonly periodo: number;
  /**
   * Lo que este coche va por delante en su ruta. Sólo lo usan los del circuito, que no
   * tienen semáforos: seis coches con un sexto de vuelta entre ellos son seis horarios que
   * es el mismo. Donde hay semáforos vale cero, porque un horario con paradas NO es
   * invariante por desplazamiento: el segundo coche pararía en verde.
   */
  readonly fase: number;
  /** El radio de rueda medido, para girarlas con `s / radio`. */
  readonly radioDeRueda: number;
}

/**
 * UN NIVEL DE DETALLE DE UN GRUPO: lo que hay que montar si ese grupo va a ese nivel.
 *
 * Las cuatro listas son las mismas cuatro que la escena sabe instanciar, así que subir o
 * bajar un grupo de nivel es cambiar cuatro listas y nada más: no hay una rama por distrito
 * ni un caso especial por manzana. Y `triangulos` es la suma YA HECHA, porque el que decide
 * si algo cabe es el presupuesto y el presupuesto no puede recorrer la ciudad por fotograma.
 */
export interface NivelDeDetalle {
  readonly puestas: readonly PuestaEnLaCiudad[];
  readonly bultos: readonly BultoPropio[];
  readonly cintas: readonly CintaPropia[];
  readonly coches: readonly PuestaEnLaCiudad[];
  readonly triangulos: number;
}

export type ClaseDeGrupo = 'manzana' | 'calle' | 'distrito';

/**
 * UN GRUPO: el trozo de ciudad que sube y baja de nivel ENTERO, y por qué son de tres clases.
 *
 * · `manzana` — una isla de parcelas rodeada de calles, que es la unidad que el ojo lee como
 *   «ese bloque de ahí». Cambiar media manzana de nivel se ve; cambiarla entera, no.
 * · `calle` — una tesela de 6 × 6 celdas (72 × 72, JUSTO el frente de una casilla del
 *   tablero) con sus losas, sus farolas, sus semáforos y sus coches aparcados. Las calles no
 *   se agrupan por manzana porque no son de ninguna: son de las dos que separan.
 * · `distrito` — el suelo y el atrezo propios de un parque, un cementerio, un circuito…
 *
 * `radio` es la media diagonal del grupo, y sirve para la histéresis: un grupo grande no
 * puede juzgarse por su centro solo.
 */
export interface GrupoDeLaCiudad {
  readonly indice: number;
  readonly clase: ClaseDeGrupo;
  readonly nombre: string;
  readonly centro: Punto;
  readonly radio: number;
  readonly celdas: number;
  /** Los tres montajes: [L1, L2, L3]. */
  readonly niveles: readonly NivelDeDetalle[];
}

/** Lo que una cámara tiene montado: a qué nivel va cada grupo, y cuánto pesa el conjunto. */
export interface MontajeDeLaCiudad {
  /** Por grupo, su nivel: 0 = L1, 1 = L2, 2 = L3. */
  readonly nivelDelGrupo: readonly number[];
  readonly triangulos: number;
  /** Cuántos triángulos pone cada nivel, para saber quién se come el presupuesto. */
  readonly porNivel: readonly number[];
  /** Cuántos grupos hay en cada nivel. */
  readonly gruposPorNivel: readonly number[];
}

export interface TriangulosDeLaCiudad {
  readonly calzada: number;
  readonly volumenes: number;
  readonly fachadas: number;
  readonly mobiliario: number;
  readonly coches: number;
  readonly distritos: number;
  readonly interiores: number;
  readonly total: number;
}

export interface LaCiudad {
  readonly semilla: number;
  readonly calidad: Calidad;
  readonly recinto: RecintoDeLaCiudad;
  readonly celdas: readonly CeldaDeLaCiudad[];
  readonly distritos: readonly DistritoPuesto[];
  /** Las losas de calle y las soleras de parcela. */
  readonly calzada: readonly PuestaEnLaCiudad[];
  /** Las cáscaras del pack: `bloque-*` y `cuerpo-*`. */
  readonly volumenes: readonly PuestaEnLaCiudad[];
  /** Las torres del centro y los prismas de los distritos: geometría propia de volumen. */
  readonly fachadas: readonly BultoPropio[];
  /** Farolas, semáforos, árboles, bancos, papeleras, terrazas, tumbas, palets. */
  readonly mobiliario: readonly PuestaEnLaCiudad[];
  /** Las cintas: sendero, pista, quitamiedos, línea de meta. */
  readonly cintas: readonly CintaPropia[];
  readonly edificios: readonly EdificioDeLaCiudad[];
  /** Los interiores YA MONTADOS de una muestra; los demás se piden con `salasDelEdificio`. */
  readonly interiores: readonly PuestaDeSala[];
  readonly coches: {
    readonly aparcados: readonly PuestaEnLaCiudad[];
    readonly rutas: readonly RutaDeCoche[];
  };
  readonly semaforos: readonly SemaforoDeLaCiudad[];
  /**
   * LA CIUDAD PARTIDA EN GRUPOS, que es lo que la escena monta de verdad (ver cabecera).
   * Las listas de arriba son la ciudad ENTERA en L1 y valen para medir y para el banco; lo
   * que se instancia en una partida sale de `montarLaCiudad`, que elige un nivel por grupo.
   */
  readonly grupos: readonly GrupoDeLaCiudad[];
  readonly triangulos: TriangulosDeLaCiudad;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  4. LOS TRIÁNGULOS Y LAS CAJAS DE LO QUE SE PONE, MEDIDOS DEL `.glb`
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * CUÁNTO CUESTA CADA PIEZA QUE LA CIUDAD PONE, medido sobre `escenas/modelos/burgo.glb` con
 * `@gltf-transform`. Está aquí y no en el comprobador porque el presupuesto por capa se
 * devuelve con la ciudad, y la escena no puede abrir el `.glb` para sumarlo. Que no se
 * quede viejo lo vigila `verify:la-ciudad`, que vuelve a medir el fichero y compara.
 */
export const TRIANGULOS_DE_LA_PIEZA: Readonly<Record<string, number>> = {
  [PIEZA.calzada]: 58,
  [PIEZA.calzadaPaso]: 64,
  [PIEZA.calzadaCurva]: 152,
  [PIEZA.calzadaCurvaSuave]: 172,
  [PIEZA.calzadaCruce]: 170,
  [PIEZA.calzadaTe]: 138,
  [PIEZA.solera]: 60,
  [PIEZA.bloqueA]: 828,
  [PIEZA.bloqueB]: 1082,
  [PIEZA.bloqueC]: 1020,
  [PIEZA.bloqueD]: 1118,
  [PIEZA.bloqueE]: 1356,
  [PIEZA.bloqueF]: 1389,
  [PIEZA.bloqueG]: 1711,
  [PIEZA.bloqueH]: 1885,
  [PIEZA.cuerpoA]: 435,
  [PIEZA.cuerpoB]: 586,
  [PIEZA.cuerpoC]: 666,
  [PIEZA.cuerpoD]: 848,
  [PIEZA.cuerpoE]: 950,
  [PIEZA.cuerpoF]: 1097,
  [PIEZA.cuerpoG]: 1053,
  [PIEZA.cuerpoH]: 1333,
  [PIEZA.cocheBerlina]: 1222,
  [PIEZA.cocheUtilitario]: 1194,
  [PIEZA.cocheFamiliar]: 1234,
  [PIEZA.cocheTaxi]: 1256,
  [PIEZA.cochePatrulla]: 1316,
  [PIEZA.farolaDeCalle]: 176,
  [PIEZA.farolaDeParque]: 568,
  [PIEZA.farolDePie]: 264,
  [PIEZA.semaforoA]: 508,
  [PIEZA.semaforoB]: 636,
  [PIEZA.semaforoC]: 444,
  [PIEZA.bancoDeCalle]: 44,
  [PIEZA.bancoDeParque]: 172,
  [PIEZA.arbusto]: 72,
  [PIEZA.bocaDeRiego]: 180,
  [PIEZA.contenedor]: 126,
  [PIEZA.papelera]: 18,
  [PIEZA.cajaDeObra]: 20,
  [PIEZA.cajaDeObraGrande]: 32,
  [PIEZA.torreDeAgua]: 146,
  [PIEZA.pino]: 318,
  [PIEZA.pinoGrande]: 318,
  [PIEZA.pinoPequeno]: 260,
  [PIEZA.pinoRojo]: 318,
  [PIEZA.arbolSeco]: 256,
  [PIEZA.arbolSecoMediano]: 216,
  [PIEZA.verja]: 380,
  [PIEZA.verjaPoste]: 94,
  [PIEZA.verjaPuerta]: 620,
  [PIEZA.arcoDeVerja]: 868,
  [PIEZA.tumba]: 323,
  [PIEZA.tumbaLlana]: 190,
  [PIEZA.lapida]: 271,
  [PIEZA.hito]: 56,
  [PIEZA.hitoB]: 136,
  /* La `figura` de la isleta de la glorieta: la única pieza de persona que la ciudad pone. */
  [PIEZA.figura]: 172,
  [PIEZA.cripta]: 952,
  [PIEZA.sarcofago]: 316,
  [PIEZA.losaConmemorativa]: 88,
  /* El muelle, la feria y la obra: lo que traen los packs de recursos y de restaurante. */
  [PIEZA.fardo]: 424,
  [PIEZA.lingotes]: 648,
  [PIEZA.cuenco]: 256,
  [PIEZA.garrafa]: 640,
  [PIEZA.cajaDeJamones]: 676,
  [PIEZA.palet]: 192,
  [PIEZA.paletCubierto]: 366,
  [PIEZA.bidon]: 868,
  [PIEZA.chatarra]: 1148,
  [PIEZA.perfiles]: 648,
  [PIEZA.tablones]: 704,
  [PIEZA.sillares]: 768,
  [PIEZA.mesaRedonda]: 312,
  [PIEZA.mesaPequena]: 312,
  [PIEZA.mesaMediana]: 168,
  [PIEZA.mesaLarga]: 168,
  [PIEZA.mesaBaja]: 276,
  [PIEZA.mesaDeCocina]: 236,
  [PIEZA.mesaDeTrabajo]: 280,
  [PIEZA.silla]: 428,
  [PIEZA.sillaDeOficina]: 288,
  [PIEZA.taburete]: 216,
  [PIEZA.banqueta]: 172,
  [PIEZA.sofa]: 636,
  [PIEZA.sofaConCojines]: 808,
  [PIEZA.butaca]: 528,
  [PIEZA.cama]: 540,
  [PIEZA.catre]: 474,
  [PIEZA.mesilla]: 168,
  [PIEZA.armario]: 428,
  [PIEZA.armarioPequeno]: 322,
  [PIEZA.anaquel]: 212,
  [PIEZA.anaquelPequeno]: 212,
  [PIEZA.estanteDePared]: 152,
  [PIEZA.repisa]: 76,
  [PIEZA.lampara]: 320,
  [PIEZA.lamparaDeMesa]: 392,
  [PIEZA.alfombra]: 44,
  [PIEZA.alfombraDeRayas]: 68,
  [PIEZA.alfombraOvalada]: 176,
  [PIEZA.cuadro]: 60,
  [PIEZA.cuadroPequeno]: 60,
  [PIEZA.retrato]: 74,
  [PIEZA.libros]: 196,
  [PIEZA.almohada]: 86,
  [PIEZA.encimera]: 168,
  [PIEZA.encimeraEsquina]: 38,
  [PIEZA.fregadero]: 674,
  [PIEZA.alacena]: 156,
  [PIEZA.fogon]: 1084,
  [PIEZA.campana]: 204,
  [PIEZA.horno]: 542,
  [PIEZA.nevera]: 426,
  [PIEZA.escurreplatos]: 880,
  [PIEZA.mostrador]: 206,
  [PIEZA.plato]: 160,
  [PIEZA.salsaRoja]: 168,
  [PIEZA.salsaAmarilla]: 168,
  [PIEZA.servilletero]: 228,
  [PIEZA.carta]: 108,
  [PIEZA.cajon]: 132,
  [PIEZA.caja]: 188,
  [PIEZA.cajaPequena]: 188,
  [PIEZA.barril]: 561,
  [PIEZA.barrilPequeno]: 207,
  [PIEZA.tarro]: 188,
  [PIEZA.olla]: 612,
  [PIEZA.sarten]: 310,
  [PIEZA.tabla]: 38,
  [PIEZA.hojaDePuerta]: 188,
};

export function triangulosDe(pieza: NombreDePieza): number {
  return TRIANGULOS_DE_LA_PIEZA[pieza] ?? 0;
}

/**
 * LA HUELLA DEL CUERPO DE CADA MODELO, medida: ancho (x), fondo (z), alto y el saliente de
 * la fachada. Un `bloque-*` es la parcela de 12 × 12 MÁS este cuerpo, así que el interior
 * que se construye dentro es el mismo en los dos: por eso hay una sola tabla.
 *
 * `frente` es lo que sobresale la fachada por delante del origen: en `cuerpo-a`, `e` y `g`
 * llega a 4,80 porque el modelo saca un alero; en los demás son 3,90.
 */
export interface CuerpoDelPack {
  readonly ancho: number;
  readonly fondo: number;
  readonly alto: number;
  readonly frente: number;
  readonly plantas: number;
}
export const CUERPO_DEL_MODELO: Readonly<Record<string, CuerpoDelPack>> = {
  [PIEZA.cuerpoA]: { ancho: 7.24, fondo: 8.7, alto: 9.3, frente: 4.8, plantas: 2 },
  [PIEZA.cuerpoB]: { ancho: 9.64, fondo: 7.8, alto: 9.3, frente: 3.9, plantas: 2 },
  [PIEZA.cuerpoC]: { ancho: 7.24, fondo: 7.8, alto: 13.5, frente: 3.9, plantas: 3 },
  [PIEZA.cuerpoD]: { ancho: 9.64, fondo: 7.8, alto: 13.5, frente: 3.9, plantas: 3 },
  [PIEZA.cuerpoE]: { ancho: 12.04, fondo: 8.7, alto: 13.5, frente: 4.8, plantas: 3 },
  [PIEZA.cuerpoF]: { ancho: 12.04, fondo: 7.8, alto: 13.5, frente: 3.9, plantas: 3 },
  [PIEZA.cuerpoG]: { ancho: 12.04, fondo: 8.7, alto: 13.5, frente: 4.8, plantas: 3 },
  [PIEZA.cuerpoH]: { ancho: 12.04, fondo: 7.8, alto: 17.7, frente: 3.9, plantas: 4 },
  [PIEZA.bloqueA]: { ancho: 7.24, fondo: 8.7, alto: 9.3, frente: 4.8, plantas: 2 },
  [PIEZA.bloqueB]: { ancho: 9.64, fondo: 7.8, alto: 9.3, frente: 3.9, plantas: 2 },
  [PIEZA.bloqueC]: { ancho: 7.24, fondo: 7.8, alto: 17.26, frente: 3.9, plantas: 3 },
  [PIEZA.bloqueD]: { ancho: 9.64, fondo: 7.8, alto: 17.22, frente: 3.9, plantas: 3 },
  [PIEZA.bloqueE]: { ancho: 12.04, fondo: 8.7, alto: 13.5, frente: 4.8, plantas: 3 },
  [PIEZA.bloqueF]: { ancho: 12.04, fondo: 7.8, alto: 13.5, frente: 3.9, plantas: 3 },
  [PIEZA.bloqueG]: { ancho: 12.04, fondo: 8.7, alto: 17.26, frente: 4.8, plantas: 3 },
  [PIEZA.bloqueH]: { ancho: 12.04, fondo: 7.8, alto: 17.7, frente: 3.9, plantas: 4 },
};

/** Los `bloque-*` traen su propia parcela de 12 × 12; los `cuerpo-*` necesitan una `solera`. */
export const BLOQUE_DE_PLANTAS: Readonly<Record<number, readonly NombreDePieza[]>> = {
  2: [PIEZA.bloqueA, PIEZA.bloqueB],
  3: [PIEZA.bloqueC, PIEZA.bloqueD, PIEZA.bloqueE, PIEZA.bloqueF, PIEZA.bloqueG],
  4: [PIEZA.bloqueH],
};
export const CUERPO_DE_PLANTAS: Readonly<Record<number, readonly NombreDePieza[]>> = {
  2: [PIEZA.cuerpoA, PIEZA.cuerpoB],
  3: [PIEZA.cuerpoC, PIEZA.cuerpoD],
  4: [PIEZA.cuerpoH],
};

/* ══════════════════════════════════════════════════════════════════════════
 *  5. EL ESQUELETO, LOS CUADRANTES Y LOS DISTRITOS
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
export const ANCHO_DEL_BULEVAR = 2 * RETICULA_DE_LA_CIUDAD;
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
export const ANCHO_DE_LA_AVENIDA = 4 * RETICULA_DE_LA_CIUDAD;
/** Veintitrés por veintitrés: lo que le queda a cada cuadrante entre el bulevar y la avenida. */
export const LADO_DEL_CUADRANTE = (CELDAS_POR_LADO - 2 * CELDAS_DEL_BULEVAR.length - CELDAS_DE_AVENIDA.length) / 2;

/**
 * LAS CUATRO PUERTAS: por dónde entran las avenidas, y con qué casilla se encaran.
 *
 * El centro de la casilla *k* (1 a 9) de un lado está a `72k − 360` del centro del lado, y
 * para *k* = 5 sale CERO. O sea que las casillas 5, 15, 25 y 35 —las Puertas del
 * reglamento, que no se toca— están encaradas con el eje de la ciudad, y por ahí entran las
 * avenidas. No es casualidad: es lo que hace que la traza sea simétrica y que se entienda
 * de un vistazo por dónde se entra.
 */
export const PUERTAS: readonly { readonly casilla: number; readonly rumbo: Rumbo }[] = [
  { casilla: 5, rumbo: 1 },
  { casilla: 15, rumbo: 2 },
  { casilla: 25, rumbo: 3 },
  { casilla: 35, rumbo: 0 },
];

/** Dónde toca el borde del recinto la avenida de cada Puerta. */
export function bocaDeLaPuerta(recinto: RecintoDeLaCiudad, rumbo: Rumbo): Punto {
  const mitad = recinto.lado / 2;
  const v = vectorDelRumbo(rumbo);
  return { x: recinto.centro.x + v.x * mitad, z: recinto.centro.z + v.z * mitad };
}

interface MarcoDeCuadrante {
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
function aLaReticula(m: MarcoDeCuadrante, p: number, q: number): { readonly i: number; readonly j: number } {
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
 *  6. TRAZAR LA RETÍCULA
 * ══════════════════════════════════════════════════════════════════════════ */

interface Trazado {
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

function trazarLaReticula(recinto: RecintoDeLaCiudad, azar: () => number): Trazado {
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
  const cuadrantes: Trazado['cuadrantes'] = [];
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
    const info = cuadrantes[c] as Trazado['cuadrantes'][number];
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

  /* ── (i) Las manzanas: cada isla de suelo edificable rodeada de calles ── */
  let siguiente = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = idx(i, j);
      const c = clase[k] as ClaseDeCelda;
      if ((manzana[k] as number) >= 0 || (c !== 'parcela' && c !== 'patio' && c !== 'torre')) continue;
      const pila = [[i, j]];
      manzana[k] = siguiente;
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
          manzana[vk] = siguiente;
          pila.push([vi, vj]);
        }
      }
      siguiente++;
    }
  }

  return { clase, distrito, cuadrante, manzana, abre, distritos, cuadrantes, callesDeCadaCuadrante, n };
}

/** Las cuatro clases que son calzada: por ellas anda un coche y con ellas se traza la red. */
export function esClaseDeCalle(c: ClaseDeCelda): boolean {
  return c === 'bulevar' || c === 'avenida' || c === 'glorieta' || c === 'calle';
}

/**
 * LA MEDIANA, en una línea, porque es la regla que más se ve y la que más cuesta creer:
 *
 * una calzada ancha del pack son varias losas pegadas, y CADA LOSA TRAE SU BORDILLO. Dos
 * losas vecinas de la misma calzada no comparten asfalto: se dan los bordillos, y lo que
 * queda entre ellas es una mediana de 1,2 alzada 0,6. No se puede evitar sin recompilar el
 * pack, así que se aprovecha: el bulevar son dos anillos con su mediana, la avenida son
 * cuatro calzadas con la suya en medio, y las medianas se abren donde hay un cruce de
 * verdad. La regla entera está en `abreHacia`, dentro de `trazarLaReticula`.
 */

/* ══════════════════════════════════════════════════════════════════════════
 *  7. LA CALZADA: QUÉ LOSA VA EN CADA CELDA
 * ══════════════════════════════════════════════════════════════════════════ */

/** Lo que sabe la escena de cada celda de calle: la losa, su giro, y si lleva cebra. */
export interface LosaDeCalle {
  readonly i: number;
  readonly j: number;
  readonly pieza: NombreDePieza;
  readonly cuartos: number;
  readonly abre: number;
}

/**
 * LA GLORIETA NO NECESITA UNA REGLA SUYA, Y AQUÍ HAY QUE CORREGIR EL PLANO.
 *
 * `LA-CIUDAD.md` §3 pide `calzada-curva-suave` en las cuatro esquinas de la glorieta y
 * `calzada` en los tramos. Con la glorieta de 4 × 4 y la isleta de 2 × 2 en medio, eso ya no
 * es lo que toca y además no hace falta escribirlo: la regla general lo resuelve sola y lo
 * resuelve MEJOR. Las cuatro esquinas del anillo son donde se encuentran los brazos de dos
 * avenidas —cuatro caras abiertas: un cruce de verdad—, y las ocho celdas de en medio abren
 * las dos del anillo más la del brazo que llega y cierran la de la isleta: una te con el
 * tronco mirando a la isleta. Doce celdas, cero casos especiales, cero sitios donde
 * equivocarse. La curva suave se queda para las esquinas del bulevar, que sí son curvas.
 */
function losasDeCalle(t: Trazado): LosaDeCalle[] {
  const idx = (i: number, j: number): number => j * t.n + i;
  const losas: LosaDeCalle[] = [];
  const bruto: (LosaDeCalle | null)[] = new Array(t.n * t.n).fill(null);
  for (let j = 0; j < t.n; j++) {
    for (let i = 0; i < t.n; i++) {
      const clase = t.clase[idx(i, j)] as ClaseDeCelda;
      if (!esClaseDeCalle(clase)) continue;
      const elegida = piezaDeCalzada(t.abre[idx(i, j)] as number);
      if (elegida === null) continue;
      bruto[idx(i, j)] = { i, j, pieza: elegida.pieza, cuartos: elegida.cuartos, abre: t.abre[idx(i, j)] as number };
    }
  }
  /*
   * LA CEBRA VA DONDE ESTARÍA, y no donde alguien la ponga: en la celda inmediatamente
   * anterior a todo cruce y a toda te, por los cuatro brazos. Sólo sustituye a una recta;
   * una curva o un cruce con cebra pintada encima no existe en el pack ni en la calle.
   */
  for (const losa of bruto) {
    if (losa === null || losa.pieza !== PIEZA.calzada) continue;
    const pegadaAUnCruce = RUMBOS.some((r) => {
      const p = PASO_DEL_RUMBO[r] as { di: number; dj: number };
      const v = bruto[idx(losa.i + p.di, losa.j + p.dj)];
      return v !== null && v !== undefined && carasDe(v.abre) >= 3;
    });
    if (!pegadaAUnCruce) continue;
    bruto[idx(losa.i, losa.j)] = { ...losa, pieza: PIEZA.calzadaPaso };
  }
  for (const losa of bruto) if (losa !== null) losas.push(losa);
  return losas;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  8. LOS EDIFICIOS
 * ══════════════════════════════════════════════════════════════════════════ */

/** Un punto local `(x, z)` girado `giro` radianes: el mismo `rotation.y` de three que usa el anillo. */
export function giraElPunto(x: number, z: number, giro: number): Punto {
  const c = Math.cos(giro);
  const s = Math.sin(giro);
  return { x: x * c + z * s, z: -x * s + z * c };
}

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
export const LETRAS_DEL_DISTRITO: Readonly<Record<string, readonly string[]>> = {
  ensanche: ['a', 'b'],
  'vivienda-alta': ['c', 'd', 'g', 'h'],
  ocio: ['c', 'e', 'b', 'f'],
  poligono: ['f', 'h'],
  centro: ['g', 'h'],
  /* Los tejidos nuevos: las naves del cuadrante del motor y los chalets del tranquilo. */
  naves: ['b', 'f'],
  chalets: ['a', 'b'],
};

const BLOQUE_DE_LETRA: Readonly<Record<string, NombreDePieza>> = {
  a: PIEZA.bloqueA,
  b: PIEZA.bloqueB,
  c: PIEZA.bloqueC,
  d: PIEZA.bloqueD,
  e: PIEZA.bloqueE,
  f: PIEZA.bloqueF,
  g: PIEZA.bloqueG,
  h: PIEZA.bloqueH,
};
const CUERPO_DE_LETRA: Readonly<Record<string, NombreDePieza>> = {
  a: PIEZA.cuerpoA,
  b: PIEZA.cuerpoB,
  c: PIEZA.cuerpoC,
  d: PIEZA.cuerpoD,
  h: PIEZA.cuerpoH,
};

/** Cuántas plantas tiene la cáscara de cada letra: MEDIDO, no elegido (`cuerpo-C…G` miden 3 × 4,50 clavado). */
export function plantasDeLaLetra(letra: string): number {
  return (CUERPO_DEL_MODELO[BLOQUE_DE_LETRA[letra] as string] as CuerpoDelPack).plantas;
}

/**
 * LA ALTURA LA DECIDE LA DISTANCIA AL CENTRO, no un sorteo.
 *
 * Distancia de Chebyshev en celdas al centro de la ciudad. Sale sola la silueta que tiene
 * una ciudad —alta en el centro, bajando hacia el borde, con las avenidas marcadas por una
 * cornisa más alta— y sale IGUAL en las seis pantallas de la mesa, porque no depende de
 * nada más que de dónde está.
 */
export function plantasQueTocan(recinto: RecintoDeLaCiudad, i: number, j: number, daAAvenida: boolean, daAVerde: boolean): number {
  const d = distanciaAlCentro(recinto.celdas, i, j);
  /*
   * Los tres tramos son los de la escala anterior multiplicados por 2,25 y redondeados, por
   * la misma razón que las bandas de la casilla: lo que se ve es la SILUETA, y una silueta es
   * una proporción. Dentro de las siete primeras celdas no hay bloques del pack —eso es el
   * centro de torres (§6)—, así que el 4 de ahí sólo lo cobra lo que se cuele.
   */
  let plantas = d <= RADIO_DEL_CENTRO ? 4 : d <= 16 ? 3 : 2;
  if (daAAvenida) plantas += 1;
  if (daAVerde) plantas -= 1;
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

interface Edificado {
  readonly edificios: EdificioDeLaCiudad[];
  readonly volumenes: PuestaEnLaCiudad[];
  readonly soleras: PuestaEnLaCiudad[];
  readonly jardines: BultoPropio[];
  readonly torres: BultoPropio[];
}

/** Las plantas de una torre del centro: de seis a catorce, y las más altas junto a la glorieta. */
export const PLANTAS_DE_TORRE = { minimo: 6, maximo: 14 } as const;
/** La huella de la torre de esquina de glorieta: cuatro celdas. */
export const HUELLA_DE_TORRE = 2 * RETICULA_DE_LA_CIUDAD;
/**
 * La huella de una torre de una celda: 10,80, o sea la celda menos su bordillo a cada lado.
 * Con los 12 justos, dos torres de celdas vecinas se tocarían y lo que se vería sería un
 * mazacote, no dos torres.
 */
export const HUELLA_DE_TORRE_SUELTA = RETICULA_DE_LA_CIUDAD - 2 * ANCHO_DEL_BORDILLO;
/** Cuánto se retranquea la banda de ventanas de una torre. */
export const RETRANQUEO_DE_LA_BANDA = 0.2;
/**
 * EL PRISMA CON QUE SE PINTA UN EDIFICIO EN L2: 30 triángulos.
 *
 * Doce del prisma, dieciséis de dos bandas de ventanas retranqueadas 0,2 y dos de la
 * cornisa. Es el 3 % de lo que cuesta un `bloque-h`, y a más de 156 unidades es la misma
 * mancha: una ventana del pack mide ahí 10 píxeles, a 300 son 5,2 y a 420 son 3,7.
 */
export const TRIANGULOS_DEL_PRISMA = 30;
/** Y en L3, la manzana entera fundida: un prisma por edificio, sin bandas ni cornisa. */
export const TRIANGULOS_DEL_PRISMA_FUNDIDO = 10;
/** La manta de asfalto de L3: dos triángulos por celda de calle, y ninguna losa del pack. */
export const TRIANGULOS_DE_LA_MANTA = 2;
/** Un prisma son 12 triángulos, su banda de ventanas 8 por planta, y el remate 20. */
export function triangulosDeUnaTorre(plantas: number): number {
  return 12 + 8 * plantas + 20;
}

function levantarLosEdificios(recinto: RecintoDeLaCiudad, t: Trazado, azar: () => number): Edificado {
  const idx = (i: number, j: number): number => j * t.n + i;
  const edificios: EdificioDeLaCiudad[] = [];
  const volumenes: PuestaEnLaCiudad[] = [];
  const soleras: PuestaEnLaCiudad[] = [];
  const jardines: BultoPropio[] = [];
  const torres: BultoPropio[] = [];
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
  const ponUnaTorre = (celdas: readonly { readonly i: number; readonly j: number }[], centro: Punto, huella: number, plantas: number): void => {
    const frente = frenteDeLaTorre(celdas);
    if (frente === null) return;
    const alto = ALTURA_DEL_BORDILLO + plantas * ALTURA_DE_PLANTA;
    const v = vectorDelRumbo(frente);
    torres.push({ clase: 'torre', x: centro.x, y: 0, z: centro.z, giro: giroMirandoA(frente), ancho: huella, alto, fondo: huella, color: TONO_DE_LA_TORRE, triangulos: triangulosDeUnaTorre(plantas) });
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
      portal: { x: centro.x + v.x * (RETICULA_DE_LA_CIUDAD / 2) * celdas.length ** 0.5, z: centro.z + v.z * (RETICULA_DE_LA_CIUDAD / 2) * celdas.length ** 0.5 },
      retranqueo: (huella > RETICULA_DE_LA_CIUDAD ? 0 : RETICULA_DE_LA_CIUDAD - huella) / 2,
      prisma: { ancho: huella, alto, fondo: huella, triangulos: TRIANGULOS_DEL_PRISMA },
      triangulos: triangulosDeUnaTorre(plantas),
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
      const centro = centroDeCelda(recinto, i, j);
      if (clase === 'patio') {
        /* El interior de manzana: jardín, y sus setos y su árbol los pone el mobiliario. */
        jardines.push({ clase: 'jardin', x: centro.x, y: ALTURA_DEL_BORDILLO, z: centro.z, giro: 0, ancho: RETICULA_DE_LA_CIUDAD, alto: 0, fondo: RETICULA_DE_LA_CIUDAD, color: '#5d7a45', triangulos: 2 });
        continue;
      }
      if (clase !== 'parcela' || yaEnTorre.has(k)) continue;

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
      const aMedida = letras.filter((l) => plantasDeLaLetra(l) === quiere);
      const candidatas = aMedida.length > 0 ? aMedida : letras;
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
       */
      /*
       * Y EL CHALET SE RETRANQUEA MÁS QUE NADIE, que es lo que hace que un barrio de chalets
       * parezca un barrio de chalets: el cuerpo se va al fondo de la parcela y deja delante
       * un jardín entero (5,4 en vez de 2,4) para su verja, su seto y su coche.
       */
      const esChalet = distritoDeLaCelda === 'chalets';
      const acera = esChalet ? ACERA_DEL_CHALET : ACERA_LIBRE;
      const puedeCuerpo = CUERPO_DE_LETRA[letra] !== undefined && (!daAAvenida || esChalet);
      const cascara = (puedeCuerpo ? CUERPO_DE_LETRA[letra] : BLOQUE_DE_LETRA[letra]) as NombreDePieza;
      const cuerpo = CUERPO_DEL_MODELO[cascara] as CuerpoDelPack;
      const giro = giroMirandoA(frente);
      const v = vectorDelRumbo(frente);
      const desplazamiento = puedeCuerpo ? RETICULA_DE_LA_CIUDAD / 2 - acera - cuerpo.frente : 0;
      const sitio = { x: centro.x + v.x * desplazamiento, z: centro.z + v.z * desplazamiento };
      if (puedeCuerpo) soleras.push({ pieza: PIEZA.solera, x: centro.x, y: 0, z: centro.z, giro: 0, talla: 1 });
      volumenes.push({ pieza: cascara, x: sitio.x, y: 0, z: sitio.z, giro, talla: 1 });
      const alto = ALTURA_DEL_BORDILLO + cuerpo.plantas * ALTURA_DE_PLANTA;
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
        portal: { x: centro.x + v.x * (RETICULA_DE_LA_CIUDAD / 2), z: centro.z + v.z * (RETICULA_DE_LA_CIUDAD / 2) },
        retranqueo: puedeCuerpo ? acera : 0,
        prisma: { ancho: cuerpo.ancho, alto, fondo: cuerpo.fondo, triangulos: TRIANGULOS_DEL_PRISMA },
        triangulos: triangulosDe(cascara) + (puedeCuerpo ? triangulosDe(PIEZA.solera) : 0),
      });
    }
  }
  return { edificios, volumenes, soleras, jardines, torres };
}

/* ══════════════════════════════════════════════════════════════════════════
 *  9. LOS INTERIORES: SALAS DE VERDAD DENTRO DE CUERPOS CERRADOS
 * ══════════════════════════════════════════════════════════════════════════ */

/** El grueso de un tabique. Una caja de 0,3 × 4,0 son 10 triángulos (los 12 menos los 2 del suelo). */
export const GRUESO_DEL_TABIQUE = 0.3;
/** Lo que se mete el suelo de la sala respecto de la caja del cuerpo: el grueso de la fachada del pack. */
export const RETRANQUEO_DE_FACHADA = 0.4;
/** El hueco de puerta, medido contra `hoja-de-puerta` (1,6 × 2,8) más su marco. */
export const ANCHO_DE_LA_PUERTA = 2.4;
/** El barrido de la puerta: lo que la hoja necesita para abrirse, y que está SIEMPRE vacío. */
export const BARRIDO_DE_LA_PUERTA = 1.2;
/** Lo que queda libre por delante de todo mueble de pared: se pasa por delante. */
export const PASO_LIBRE = 2.0;
/** Nada a menos de esto de un tabique. */
export const HOLGURA_AL_TABIQUE = 0.3;
/** Una sala se parte en dos cuando su lado interior llega a esto: dos salas de módulo y su tabique. */
export const LADO_QUE_SE_PARTE = 9;

/**
 * LA CAJA DE CADA MUEBLE, Y SU RETROCESO, medidos del `.glb`.
 *
 * `retroceso` es EXACTAMENTE `−zmin` de la caja de la pieza, y por eso puede ser negativo.
 * No es la mitad del fondo: la `alacena` tiene el origen EN la pared (z de 0 a 1,042:
 * cuelga), la `nevera` lo tiene en su centro (z de −1,0 a 1,24) y el `estante-de-pared`
 * FLOTA (z de 0,25 a 0,75), o sea retroceso −0,25. Sin esta columna, media cocina queda
 * medio metro dentro del tabique y la otra media, medio metro despegada.
 */
export interface CajaDeMueble {
  readonly ancho: number;
  readonly fondo: number;
  readonly retroceso: number;
  readonly alto: number;
}
export const MUEBLE: Readonly<Record<string, CajaDeMueble>> = {
  [PIEZA.encimera]: { ancho: 2.0, fondo: 2.042, retroceso: 1.0, alto: 1.0 },
  [PIEZA.encimeraEsquina]: { ancho: 2.0, fondo: 2.0, retroceso: 1.0, alto: 1.0 },
  [PIEZA.fregadero]: { ancho: 2.0, fondo: 2.042, retroceso: 1.0, alto: 1.802 },
  [PIEZA.fogon]: { ancho: 2.0, fondo: 2.288, retroceso: 1.03, alto: 1.2 },
  [PIEZA.horno]: { ancho: 2.0, fondo: 2.348, retroceso: 1.03, alto: 2.02 },
  [PIEZA.nevera]: { ancho: 2.0, fondo: 2.24, retroceso: 1.0, alto: 2.5 },
  [PIEZA.alacena]: { ancho: 2.0, fondo: 1.042, retroceso: 0, alto: 2.0 },
  [PIEZA.campana]: { ancho: 2.0, fondo: 1.609, retroceso: 0, alto: 2.0 },
  [PIEZA.escurreplatos]: { ancho: 1.2, fondo: 1.2, retroceso: 0.6, alto: 1.095 },
  [PIEZA.mesaDeCocina]: { ancho: 3.0, fondo: 2.0, retroceso: 1.0, alto: 1.0 },
  [PIEZA.mesaRedonda]: { ancho: 3.0, fondo: 3.0, retroceso: 1.5, alto: 1.0 },
  [PIEZA.mesaPequena]: { ancho: 1.5, fondo: 1.5, retroceso: 0.75, alto: 1.0 },
  [PIEZA.mesaMediana]: { ancho: 2.0, fondo: 2.0, retroceso: 1.0, alto: 1.0 },
  [PIEZA.mesaLarga]: { ancho: 3.0, fondo: 2.0, retroceso: 1.0, alto: 1.0 },
  [PIEZA.mesaBaja]: { ancho: 2.4, fondo: 1.5, retroceso: 0.75, alto: 0.5 },
  [PIEZA.mesaDeTrabajo]: { ancho: 2.0, fondo: 4.0, retroceso: 2.0, alto: 1.0 },
  [PIEZA.silla]: { ancho: 0.75, fondo: 0.796, retroceso: 0.421, alto: 1.208 },
  [PIEZA.sillaDeOficina]: { ancho: 0.75, fondo: 0.936, retroceso: 0.561, alto: 1.203 },
  [PIEZA.taburete]: { ancho: 0.75, fondo: 0.75, retroceso: 0.375, alto: 0.5 },
  [PIEZA.banqueta]: { ancho: 0.75, fondo: 0.75, retroceso: 0.375, alto: 0.5 },
  [PIEZA.sofa]: { ancho: 3.0, fondo: 1.6, retroceso: 0.75, alto: 1.224 },
  [PIEZA.sofaConCojines]: { ancho: 3.0, fondo: 1.6, retroceso: 0.75, alto: 1.224 },
  [PIEZA.butaca]: { ancho: 1.8, fondo: 1.6, retroceso: 0.75, alto: 1.224 },
  [PIEZA.cama]: { ancho: 3.1, fondo: 3.0, retroceso: 1.5, alto: 1.0 },
  [PIEZA.mesilla]: { ancho: 1.0, fondo: 1.0, retroceso: 0.5, alto: 1.0 },
  [PIEZA.armario]: { ancho: 2.0, fondo: 1.002, retroceso: 0.5, alto: 1.0 },
  [PIEZA.anaquel]: { ancho: 2.0, fondo: 0.5, retroceso: 0, alto: 0.4 },
  [PIEZA.anaquelPequeno]: { ancho: 1.0, fondo: 0.5, retroceso: 0, alto: 0.4 },
  [PIEZA.estanteDePared]: { ancho: 2.0, fondo: 0.5, retroceso: -0.25, alto: 1.95 },
  [PIEZA.repisa]: { ancho: 2.0, fondo: 0.5, retroceso: 0, alto: 0.45 },
  [PIEZA.mostrador]: { ancho: 4.0, fondo: 0.9, retroceso: 0.45, alto: 4.0 },
  [PIEZA.lampara]: { ancho: 1.0, fondo: 1.0, retroceso: 0.5, alto: 2.52 },
  [PIEZA.lamparaDeMesa]: { ancho: 1.0, fondo: 1.0, retroceso: 0.5, alto: 1.02 },
  [PIEZA.alfombra]: { ancho: 3.0, fondo: 2.0, retroceso: 1.0, alto: 0.1 },
  [PIEZA.alfombraDeRayas]: { ancho: 3.0, fondo: 2.0, retroceso: 1.0, alto: 0.1 },
  [PIEZA.alfombraOvalada]: { ancho: 3.0, fondo: 2.0, retroceso: 1.0, alto: 0.1 },
  [PIEZA.cuadro]: { ancho: 2.0, fondo: 0.2, retroceso: 0, alto: 1.2 },
  [PIEZA.cuadroPequeno]: { ancho: 0.5, fondo: 0.2, retroceso: 0, alto: 0.6 },
  [PIEZA.retrato]: { ancho: 0.5, fondo: 0.379, retroceso: 0.208, alto: 0.618 },
  [PIEZA.libros]: { ancho: 0.78, fondo: 0.365, retroceso: 0.177, alto: 0.5 },
  [PIEZA.almohada]: { ancho: 0.65, fondo: 0.5, retroceso: 0.25, alto: 0.2 },
  [PIEZA.plato]: { ancho: 0.95, fondo: 0.95, retroceso: 0.475, alto: 0.1 },
  [PIEZA.salsaRoja]: { ancho: 0.3, fondo: 0.3, retroceso: 0.15, alto: 0.779 },
  [PIEZA.salsaAmarilla]: { ancho: 0.3, fondo: 0.3, retroceso: 0.15, alto: 0.779 },
  [PIEZA.servilletero]: { ancho: 0.5, fondo: 0.5, retroceso: 0.25, alto: 0.914 },
  [PIEZA.carta]: { ancho: 0.5, fondo: 0.3, retroceso: 0.15, alto: 0.8 },
  [PIEZA.tarro]: { ancho: 0.5, fondo: 0.5, retroceso: 0.25, alto: 0.65 },
  [PIEZA.olla]: { ancho: 1.4, fondo: 1.0, retroceso: 0.5, alto: 0.516 },
  [PIEZA.sarten]: { ancho: 1.0, fondo: 1.5, retroceso: 0.5, alto: 0.25 },
  [PIEZA.tabla]: { ancho: 1.5, fondo: 1.0, retroceso: 0.5, alto: 0.15 },
  [PIEZA.cajon]: { ancho: 2.0, fondo: 2.0, retroceso: 1.0, alto: 0.8 },
  [PIEZA.caja]: { ancho: 1.5, fondo: 1.5, retroceso: 0.75, alto: 1.5 },
  [PIEZA.cajaPequena]: { ancho: 1.0, fondo: 1.0, retroceso: 0.5, alto: 1.0 },
  [PIEZA.barril]: { ancho: 1.8, fondo: 1.8, retroceso: 0.9, alto: 2.0 },
  [PIEZA.barrilPequeno]: { ancho: 1.0, fondo: 1.0, retroceso: 0.5, alto: 1.018 },
  [PIEZA.palet]: { ancho: 1.552, fondo: 1.501, retroceso: 0.75, alto: 0.3 },
  [PIEZA.arbusto]: { ancho: 1.136, fondo: 1.195, retroceso: 0.597, alto: 2.283 },
  [PIEZA.papelera]: { ancho: 0.761, fondo: 0.8, retroceso: 0.4, alto: 0.314 },
  [PIEZA.farolDePie]: { ancho: 0.64, fondo: 0.64, retroceso: 0.32, alto: 0.925 },
  [PIEZA.hojaDePuerta]: { ancho: 1.6, fondo: 0.771, retroceso: 0.386, alto: 2.8 },
};

export function cajaDelMueble(pieza: NombreDePieza): CajaDeMueble {
  return (MUEBLE[pieza] ?? { ancho: 1, fondo: 1, retroceso: 0.5, alto: 1 }) as CajaDeMueble;
}

/**
 * EL USO DE CADA PLANTA, por distrito. La tabla de `LA-CIUDAD.md` §5, y nada más.
 *
 * Un restaurante tiene la cocina detrás del comedor y la vivienda encima; una casa de
 * ensanche tiene la tienda abajo y el piso arriba; una torre tiene tiendas en el zócalo y
 * oficinas hasta el remate; una nave tiene almacén y no tiene más. Eso es lo que hace que
 * asomarse a una ventana cuente algo en vez de enseñar muebles al azar.
 */
export function usosDeLaPlanta(distrito: NombreDeDistrito, planta: number): readonly UsoDeSala[] {
  if (distrito === 'ocio') {
    if (planta === 0) return ['comedor', 'cocina'];
    if (planta === 1) return ['comedor', 'comedor'];
    return ['salon', 'dormitorio'];
  }
  if (distrito === 'centro') return planta === 0 ? ['tienda', 'tienda'] : ['oficina', 'oficina'];
  if (distrito === 'poligono' || distrito === 'naves') return ['almacen', 'almacen'];
  /* Un chalet no tiene tienda abajo: tiene salón y cocina, y los dormitorios arriba. */
  if (distrito === 'chalets') return planta === 0 ? ['salon', 'cocina'] : ['dormitorio', 'dormitorio'];
  if (planta === 0) return ['tienda', 'tienda'];
  return planta % 2 === 1 ? ['salon', 'dormitorio'] : ['dormitorio', 'salon'];
}

/**
 * LA PARED DE ANCLAJE de cada clase de sala, siempre en función de dónde está la puerta.
 *
 * Es la regla que hace que un interior parezca ordenado y no esparcido: cada clase de sala
 * tiene UNA pared de la que cuelga todo, y sólo va al centro lo que en la vida real está en
 * el centro. La cocina cuelga de la medianera —la del conducto—, que es la de enfrente de
 * la puerta; el salón, de la del hueco de escalera, que es la de la derecha; el dormitorio,
 * de la de enfrente, que es donde se pone el cabecero.
 */
export function paredDeAnclaje(uso: UsoDeSala, puerta: Rumbo): Rumbo {
  if (uso === 'salon' || uso === 'oficina') return rumboALaDerecha(puerta);
  return rumboContrario(puerta);
}

interface MuebleLocal {
  readonly pieza: NombreDePieza;
  readonly u: number;
  readonly v: number;
  readonly y: number;
  readonly cuartos: number;
}

/**
 * LA CAJA QUE OCUPA UN MUEBLE EN EL SUELO DE LA SALA, en ejes de la sala y ya girada.
 *
 * La caja NO está centrada en el origen de la pieza, y ahí estaba el fallo que cazó
 * `verify:la-ciudad`: `estante-de-pared` va de z = 0,25 a 0,75 —flota un palmo de la
 * pared—, y tratándolo como una caja centrada se salía 0,25 POR DETRÁS del tabique. Con la
 * caja asimétrica —de −retroceso a fondo − retroceso— cada pieza ocupa lo que ocupa.
 */
export function huellaDelMueble(m: MuebleLocal): { readonly u0: number; readonly v0: number; readonly u1: number; readonly v1: number } {
  const c = cajaDelMueble(m.pieza);
  const giro = radianesDeCuartos(m.cuartos);
  const esquinas = [
    giraElPunto(-c.ancho / 2, -c.retroceso, giro),
    giraElPunto(c.ancho / 2, -c.retroceso, giro),
    giraElPunto(-c.ancho / 2, c.fondo - c.retroceso, giro),
    giraElPunto(c.ancho / 2, c.fondo - c.retroceso, giro),
  ];
  return {
    u0: m.u + Math.min(...esquinas.map((p) => p.x)),
    v0: m.v + Math.min(...esquinas.map((p) => p.z)),
    u1: m.u + Math.max(...esquinas.map((p) => p.x)),
    v1: m.v + Math.max(...esquinas.map((p) => p.z)),
  };
}

class Sala {
  readonly muebles: MuebleLocal[] = [];
  constructor(
    readonly ancho: number,
    readonly fondo: number,
    readonly puerta: Rumbo,
    readonly suelo: number,
  ) {}

  largoDe(pared: Rumbo): number {
    return pared % 2 === 0 ? this.fondo : this.ancho;
  }

  /** El punto de la sala que está contra esa pared, a `a` de su centro y `retroceso` hacia dentro. */
  contra(pared: Rumbo, a: number, retroceso: number): { readonly u: number; readonly v: number } {
    const n = vectorDelRumbo(rumboContrario(pared));
    const mitadU = this.ancho / 2;
    const mitadV = this.fondo / 2;
    const base = pared === 0 ? { u: mitadU, v: a } : pared === 2 ? { u: -mitadU, v: a } : pared === 1 ? { u: a, v: mitadV } : { u: a, v: -mitadV };
    return { u: base.u + n.x * retroceso, v: base.v + n.z * retroceso };
  }

  /**
   * EL BARRIDO DE LA PUERTA: 2,4 de ancho por 1,2 de fondo desde su pared, y SIEMPRE vacío.
   *
   * Se mira como rectángulo y no como «no pongas nada en esa pared» a propósito: lo que
   * tapa una puerta casi nunca está en su pared, está en la de al lado asomando la esquina.
   */
  get barrido(): { readonly u0: number; readonly v0: number; readonly u1: number; readonly v1: number } {
    const mu = this.ancho / 2;
    const mv = this.fondo / 2;
    const h = ANCHO_DE_LA_PUERTA / 2;
    if (this.puerta === 0) return { u0: mu - BARRIDO_DE_LA_PUERTA, v0: -h, u1: mu, v1: h };
    if (this.puerta === 2) return { u0: -mu, v0: -h, u1: -mu + BARRIDO_DE_LA_PUERTA, v1: h };
    if (this.puerta === 1) return { u0: -h, v0: mv - BARRIDO_DE_LA_PUERTA, u1: h, v1: mv };
    return { u0: -h, v0: -mv, u1: h, v1: -mv + BARRIDO_DE_LA_PUERTA };
  }

  libreDeLaPuerta(u0: number, v0: number, u1: number, v1: number): boolean {
    const b = this.barrido;
    return u1 <= b.u0 || u0 >= b.u1 || v1 <= b.v0 || v0 >= b.v1;
  }

  private cabe(pieza: NombreDePieza, u: number, v: number, cuartos: number): boolean {
    const h = huellaDelMueble({ pieza, u, v, y: 0, cuartos });
    if (!this.libreDeLaPuerta(h.u0, h.v0, h.u1, h.v1)) return false;
    if (h.u0 < -this.ancho / 2 - 0.01 || h.u1 > this.ancho / 2 + 0.01) return false;
    if (h.v0 < -this.fondo / 2 - 0.01 || h.v1 > this.fondo / 2 + 0.01) return false;
    for (const m of this.muebles) {
      if (m.y > this.suelo + 0.5) continue;
      const o = huellaDelMueble(m);
      if (h.u1 > o.u0 + 0.01 && o.u1 > h.u0 + 0.01 && h.v1 > o.v0 + 0.01 && o.v1 > h.v0 + 0.01) return false;
    }
    return true;
  }

  pisaLaPuerta(pared: Rumbo, a: number, ancho: number): boolean {
    if (pared !== this.puerta) return false;
    return Math.abs(a) < (ANCHO_DE_LA_PUERTA + ancho) / 2 + 0.2;
  }

  /** Pone una hilera contra una pared, saltándose el hueco de la puerta y parando cuando se acaba. */
  hilera(pared: Rumbo, piezas: readonly NombreDePieza[], y = 0): NombreDePieza[] {
    const largo = this.largoDe(pared);
    let cursor = -largo / 2 + HOLGURA_AL_TABIQUE;
    const sobran: NombreDePieza[] = [];
    for (const pieza of piezas) {
      const c = cajaDelMueble(pieza);
      let a = cursor + c.ancho / 2;
      if (this.pisaLaPuerta(pared, a, c.ancho)) {
        a = ANCHO_DE_LA_PUERTA / 2 + 0.2 + c.ancho / 2;
        cursor = a - c.ancho / 2;
      }
      if (a + c.ancho / 2 > largo / 2 - HOLGURA_AL_TABIQUE) {
        sobran.push(pieza);
        continue;
      }
      const p = this.contra(pared, a, c.retroceso);
      const cuartos = cuartosMirandoA(rumboContrario(pared));
      if (y === 0 && !this.cabe(pieza, p.u, p.v, cuartos)) {
        sobran.push(pieza);
        cursor = a + c.ancho / 2 + 0.2;
        continue;
      }
      this.muebles.push({ pieza, u: p.u, v: p.v, y: this.suelo + y, cuartos });
      cursor = a + c.ancho / 2 + 0.2;
    }
    return sobran;
  }

  /** Una pieza suelta contra una pared, en un sitio de la pared que se dice. */
  pegada(pared: Rumbo, a: number, pieza: NombreDePieza, y = 0): boolean {
    const c = cajaDelMueble(pieza);
    if (this.pisaLaPuerta(pared, a, c.ancho)) return false;
    if (Math.abs(a) + c.ancho / 2 > this.largoDe(pared) / 2 - HOLGURA_AL_TABIQUE) return false;
    const p = this.contra(pared, a, c.retroceso);
    const cuartos = cuartosMirandoA(rumboContrario(pared));
    if (y === 0 && !this.cabe(pieza, p.u, p.v, cuartos)) return false;
    this.muebles.push({ pieza, u: p.u, v: p.v, y: this.suelo + y, cuartos });
    return true;
  }

  /** Una pieza en un punto cualquiera de la sala, mirando a donde se diga. */
  suelta(u: number, v: number, pieza: NombreDePieza, mira: Rumbo, y = 0): boolean {
    const cuartos = cuartosMirandoA(mira);
    if (y === 0 && !this.cabe(pieza, u, v, cuartos)) return false;
    this.muebles.push({ pieza, u, v, y: this.suelo + y, cuartos });
    return true;
  }

  /** Una pieza ENCIMA de otra: no toca el suelo, así que no compite por el sitio. */
  encima(u: number, v: number, pieza: NombreDePieza, alto: number, mira: Rumbo): void {
    this.muebles.push({ pieza, u, v, y: this.suelo + alto, cuartos: cuartosMirandoA(mira) });
  }

  /** Lo que cuelga de la pared —alacena, campana, cuadro, anaquel— y por tanto no pisa el suelo. */
  colgada(pared: Rumbo, a: number, pieza: NombreDePieza, alto: number): boolean {
    const c = cajaDelMueble(pieza);
    if (Math.abs(a) + c.ancho / 2 > this.largoDe(pared) / 2 - HOLGURA_AL_TABIQUE) return false;
    const p = this.contra(pared, a, c.retroceso);
    this.muebles.push({ pieza, u: p.u, v: p.v, y: this.suelo + alto, cuartos: cuartosMirandoA(rumboContrario(pared)) });
    return true;
  }

  /** El punto de un mueble ya puesto, para colgarle algo encima o ponerle una silla al lado. */
  ultimoDe(pieza: NombreDePieza): MuebleLocal | undefined {
    for (let k = this.muebles.length - 1; k >= 0; k--) if ((this.muebles[k] as MuebleLocal).pieza === pieza) return this.muebles[k];
    return undefined;
  }
}

/** La altura a la que se cuelga un cuadro: a la vista, no al techo. */
const ALTURA_DEL_CUADRO = 2.0;
/** La altura de la campana sobre el fogón y de la alacena: las dos vienen ya a 2,0 en el modelo. */
const ALTURA_COLGADA = 0;

/**
 * AMUEBLAR UNA SALA. Cuatro reglas para todas, y una receta por clase.
 *
 * 1. Nada a menos de 0,3 de un tabique.  2. Delante de todo mueble de pared quedan 2,0
 * libres.  3. El barrido de la puerta está siempre vacío.  4. Los muebles giran SÓLO en
 * cuartos de vuelta: un sofá a 37 grados no parece más natural, parece un fallo.
 */
function amueblar(sala: Sala, uso: UsoDeSala, anclaje: Rumbo, azar: () => number): void {
  const izquierda = rumboALaDerecha(rumboContrario(anclaje));
  const derecha = rumboALaDerecha(anclaje);
  const enfrente = rumboContrario(anclaje);
  const largoAnclaje = sala.largoDe(anclaje);
  const haciaDentro = vectorDelRumbo(rumboContrario(anclaje));

  if (uso === 'cocina') {
    const sobran = sala.hilera(anclaje, [PIEZA.encimera, PIEZA.fregadero, PIEZA.fogon, PIEZA.horno, PIEZA.nevera]);
    sala.hilera(derecha, sobran);
    const fogon = sala.ultimoDe(PIEZA.fogon);
    if (fogon !== undefined) sala.colgada(anclaje, anclaje % 2 === 0 ? fogon.v : fogon.u, PIEZA.campana, ALTURA_COLGADA);
    sala.colgada(anclaje, -largoAnclaje / 2 + 1.2, PIEZA.alacena, ALTURA_COLGADA);
    sala.colgada(anclaje, largoAnclaje / 2 - 1.2, PIEZA.alacena, ALTURA_COLGADA);
    sala.colgada(izquierda, 0, PIEZA.estanteDePared, 0);
    const estante = sala.ultimoDe(PIEZA.estanteDePared);
    if (estante !== undefined) for (let k = -1; k <= 1; k++) sala.encima(estante.u + (izquierda % 2 === 0 ? 0 : 0.6 * k), estante.v + (izquierda % 2 === 0 ? 0.6 * k : 0), PIEZA.tarro, 2.7, enfrente);
    const mesa = sala.suelta(0, 0, PIEZA.mesaDeCocina, enfrente);
    if (mesa) {
      sala.suelta(-1.9, 0, PIEZA.taburete, 0);
      sala.suelta(1.9, 0, PIEZA.taburete, 2);
      sala.encima(0.6, 0, PIEZA.olla, 1.0, enfrente);
    }
    sala.pegada(derecha, -sala.largoDe(derecha) / 2 + 1.0, PIEZA.escurreplatos);
    return;
  }

  if (uso === 'comedor') {
    sala.pegada(anclaje, 0, PIEZA.mostrador);
    sala.colgada(enfrente, 0, PIEZA.anaquel, ALTURA_DEL_CUADRO);
    const anaquel = sala.ultimoDe(PIEZA.anaquel);
    if (anaquel !== undefined) for (let k = -2; k <= 3; k++) sala.encima(anaquel.u + (enfrente % 2 === 0 ? 0 : 0.32 * k), anaquel.v + (enfrente % 2 === 0 ? 0.32 * k : 0), PIEZA.plato, ALTURA_DEL_CUADRO + 0.3, enfrente);
    /*
     * LAS MESAS VAN EN MALLA, Y LA MALLA MIDE SEIS Y NO CUATRO. La mesa redonda mide 3 de
     * diámetro y la silla 0,80 de fondo: con la silla arrimada a 2,20 del centro, una mesa
     * servida ocupa 5,20, y a cuatro de malla las sillas de dos mesas vecinas se atraviesan.
     * Seis deja 0,80 de paso entre respaldos, que es por donde se pasa a servir.
     */
    const MALLA_DEL_COMEDOR = 6;
    const SILLA_A = 2.2;
    const filas = Math.max(1, Math.floor((sala.ancho - PASO_LIBRE) / MALLA_DEL_COMEDOR));
    const columnas = Math.max(1, Math.floor((sala.fondo - PASO_LIBRE) / MALLA_DEL_COMEDOR));
    for (let a = 0; a < filas; a++) {
      for (let b = 0; b < columnas; b++) {
        const u = (a - (filas - 1) / 2) * MALLA_DEL_COMEDOR;
        const v = (b - (columnas - 1) / 2) * MALLA_DEL_COMEDOR;
        if (!sala.suelta(u, v, PIEZA.mesaRedonda, enfrente)) continue;
        for (const r of RUMBOS) {
          const d = vectorDelRumbo(r);
          sala.suelta(u + d.x * SILLA_A, v + d.z * SILLA_A, PIEZA.silla, rumboContrario(r));
        }
        sala.encima(u - 0.5, v, PIEZA.salsaRoja, 1.0, enfrente);
        sala.encima(u + 0.5, v, PIEZA.salsaAmarilla, 1.0, enfrente);
        sala.encima(u, v + 0.6, PIEZA.servilletero, 1.0, enfrente);
        sala.encima(u, v - 0.6, PIEZA.carta, 1.0, enfrente);
      }
    }
    sala.colgada(derecha, 0, PIEZA.cuadro, ALTURA_DEL_CUADRO);
    sala.pegada(izquierda, sala.largoDe(izquierda) / 2 - 0.8, PIEZA.lampara);
    return;
  }

  if (uso === 'salon') {
    sala.pegada(anclaje, 0, PIEZA.sofa);
    sala.colgada(anclaje, 0, PIEZA.cuadro, 2.2);
    const centroU = haciaDentro.x * 2.2;
    const centroV = haciaDentro.z * 2.2;
    sala.suelta(centroU, centroV, PIEZA.alfombra, enfrente);
    sala.encima(centroU, centroV, PIEZA.mesaBaja, 0.1, enfrente);
    sala.encima(centroU, centroV, PIEZA.retrato, 0.6, enfrente);
    const lado = vectorDelRumbo(derecha);
    sala.suelta(centroU + lado.x * 2.6, centroV + lado.z * 2.6, PIEZA.butaca, rumboContrario(derecha));
    sala.suelta(centroU - lado.x * 2.6, centroV - lado.z * 2.6, PIEZA.butaca, derecha);
    sala.colgada(izquierda, -1.0, PIEZA.anaquel, 1.6);
    const anaquel = sala.ultimoDe(PIEZA.anaquel);
    if (anaquel !== undefined) sala.encima(anaquel.u, anaquel.v, PIEZA.libros, 1.9, enfrente);
    sala.pegada(enfrente, sala.largoDe(enfrente) / 2 - 0.8, PIEZA.lampara);
    return;
  }

  if (uso === 'dormitorio') {
    sala.pegada(anclaje, 0, PIEZA.cama);
    const cama = sala.ultimoDe(PIEZA.cama);
    if (cama !== undefined) {
      sala.encima(cama.u - (anclaje % 2 === 0 ? 0 : 0.7), cama.v - (anclaje % 2 === 0 ? 0.7 : 0), PIEZA.almohada, 1.0, enfrente);
      sala.encima(cama.u + (anclaje % 2 === 0 ? 0 : 0.7), cama.v + (anclaje % 2 === 0 ? 0.7 : 0), PIEZA.almohada, 1.0, enfrente);
    }
    sala.pegada(anclaje, largoAnclaje / 2 - 1.0, PIEZA.mesilla);
    const mesilla = sala.ultimoDe(PIEZA.mesilla);
    if (mesilla !== undefined) sala.encima(mesilla.u, mesilla.v, PIEZA.lamparaDeMesa, 1.0, enfrente);
    sala.suelta(haciaDentro.x * 3.2, haciaDentro.z * 3.2, PIEZA.alfombraOvalada, enfrente);
    sala.pegada(derecha, 0, PIEZA.armario);
    sala.colgada(izquierda, 0, PIEZA.cuadroPequeno, ALTURA_DEL_CUADRO);
    return;
  }

  if (uso === 'oficina') {
    for (let a = -1; a <= 1; a++) {
      sala.colgada(anclaje, a * MODULO_DE_LA_CIUDAD, PIEZA.anaquel, 1.8);
      sala.colgada(enfrente, a * MODULO_DE_LA_CIUDAD, PIEZA.anaquel, 1.8);
    }
    const filas = Math.max(1, Math.floor((sala.fondo - PASO_LIBRE) / (2 + 2.4)));
    for (let f = 0; f < filas; f++) {
      const v = (f - (filas - 1) / 2) * (2 + 2.4);
      for (const lado of [-1, 1]) {
        const u = lado * 1.6;
        if (!sala.suelta(u, v, PIEZA.mesaMediana, enfrente)) continue;
        sala.suelta(u, v + 1.6, PIEZA.sillaDeOficina, 3);
        sala.suelta(u + lado * 1.5, v, PIEZA.papelera, enfrente);
      }
    }
    sala.suelta(sala.ancho / 2 - 1.0, sala.fondo / 2 - 1.0, PIEZA.arbusto, enfrente);
    return;
  }

  if (uso === 'tienda') {
    sala.hilera(anclaje, [PIEZA.anaquelPequeno, PIEZA.anaquel, PIEZA.anaquel, PIEZA.anaquelPequeno], 1.4);
    sala.hilera(anclaje, [PIEZA.cajon, PIEZA.caja, PIEZA.cajaPequena]);
    sala.suelta(0, haciaDentro.z * 1.6 + haciaDentro.x * 0, PIEZA.mostrador, sala.puerta);
    sala.pegada(derecha, 0, PIEZA.anaquelPequeno, 1.4);
    sala.colgada(izquierda, 0, PIEZA.cuadro, ALTURA_DEL_CUADRO);
    sala.pegada(enfrente, sala.largoDe(enfrente) / 2 - 0.8, PIEZA.farolDePie);
    return;
  }

  /* almacen */
  sala.colgada(anclaje, 0, PIEZA.estanteDePared, 0);
  sala.colgada(derecha, 0, PIEZA.repisa, 1.6);
  sala.suelta(0, 0, PIEZA.mesaDeTrabajo, enfrente);
  sala.encima(-0.4, 0, PIEZA.tabla, 1.0, enfrente);
  sala.encima(0.5, 0, PIEZA.sarten, 1.0, enfrente);
  sala.hilera(enfrente, [PIEZA.caja, PIEZA.barril, PIEZA.barrilPequeno, PIEZA.palet]);
  if (azar() < 0.5) sala.pegada(izquierda, 0, PIEZA.barril);
}

/** Un tabique liso son 10 triángulos (los 12 de una caja menos los 2 que dan al suelo); con hueco de puerta, 30. */
export const TRIANGULOS_DEL_TABIQUE = 10;
export const TRIANGULOS_DEL_TABIQUE_CON_PUERTA = 30;
/** La losa de una sala: dos triángulos. El techo NO se monta mientras el edificio está abierto. */
export const TRIANGULOS_DE_LA_LOSA = 2;
/** La escalera es propia: doce peldaños de 0,375 de alzada y 0,5 de huella, 4 triángulos cada uno. */
export const TRIANGULOS_DE_LA_ESCALERA = 48;

/** El color por vértice de cada uso, que es lo que distingue una cocina de un salón desde arriba. */
export const SUELO_DEL_USO: Readonly<Record<UsoDeSala, string>> = {
  salon: '#8a6642',
  cocina: '#cfc9bd',
  comedor: '#7a5a3c',
  tienda: '#b9b2a6',
  oficina: '#5f6a72',
  dormitorio: '#8a6642',
  almacen: '#6b6660',
};

/**
 * LAS SALAS DE UN EDIFICIO, con su geometría propia y sus muebles.
 *
 * Se piden por edificio y no vienen todas en `LaCiudad` a propósito: los interiores sólo se
 * montan cuando la cámara se acerca a menos de 60 unidades y baja de 40 de altura, y nunca
 * hay más de tres edificios abiertos a la vez. Calcular ciento y pico interiores para tener
 * tres montados sería pagar cien veces lo que se usa. La ciudad trae una MUESTRA (§ el
 * campo `interiores`) para que el presupuesto tenga un número; los demás se piden aquí.
 */
export function salasDelEdificio(edificio: EdificioDeLaCiudad, semilla: number): PuestaDeSala[] {
  const azar = sorteo((semilla ^ (edificio.indice * 0x9e37_79b9)) >>> 0);
  const salas: PuestaDeSala[] = [];
  const anchoInterior = edificio.ancho - 2 * RETRANQUEO_DE_FACHADA;
  const fondoInterior = edificio.fondo - 2 * RETRANQUEO_DE_FACHADA;
  const nx = anchoInterior >= LADO_QUE_SE_PARTE ? 2 : 1;
  const nz = fondoInterior >= LADO_QUE_SE_PARTE ? 2 : 1;
  const anchoSala = anchoInterior / nx - (nx > 1 ? GRUESO_DEL_TABIQUE / 2 : 0);
  const fondoSala = fondoInterior / nz - (nz > 1 ? GRUESO_DEL_TABIQUE / 2 : 0);

  for (let planta = 0; planta < edificio.plantas; planta++) {
    const suelo = ALTURA_DEL_BORDILLO + planta * ALTURA_DE_PLANTA;
    const usos = usosDeLaPlanta(edificio.distrito, planta);
    let n = 0;
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const uLocal = (ix - (nx - 1) / 2) * (anchoInterior / nx);
        const vLocal = (iz - (nz - 1) / 2) * (fondoInterior / nz);
        const puerta: Rumbo = planta === 0 ? 1 : nx > 1 ? ((ix === 0 ? 0 : 2) as Rumbo) : nz > 1 ? ((iz === 0 ? 1 : 3) as Rumbo) : 1;
        const uso = usos[n % usos.length] as UsoDeSala;
        const anclaje = paredDeAnclaje(uso, puerta);
        const sala = new Sala(anchoSala, fondoSala, puerta, 0);
        amueblar(sala, uso, anclaje, azar);

        const g = giraElPunto(uLocal, vLocal, edificio.giro);
        const centro = { x: edificio.centro.x + g.x, z: edificio.centro.z + g.z };
        const bultos: BultoPropio[] = [
          { clase: 'losa-de-sala', x: centro.x, y: suelo, z: centro.z, giro: edificio.giro, ancho: anchoSala, alto: GRUESO_DE_LA_LOSA, fondo: fondoSala, color: SUELO_DEL_USO[uso], triangulos: TRIANGULOS_DE_LA_LOSA },
        ];
        for (const r of RUMBOS) {
          const largo = sala.largoDe(r) + GRUESO_DEL_TABIQUE;
          const d = vectorDelRumbo(r);
          const distancia = (r % 2 === 0 ? anchoSala : fondoSala) / 2 + GRUESO_DEL_TABIQUE / 2;
          const pl = giraElPunto(d.x * distancia, d.z * distancia, edificio.giro);
          bultos.push({
            clase: 'tabique',
            x: centro.x + pl.x,
            y: suelo + GRUESO_DE_LA_LOSA,
            z: centro.z + pl.z,
            giro: edificio.giro + radianesDeCuartos(cuartosMirandoA(r)),
            ancho: largo,
            alto: MODULO_DE_LA_CIUDAD,
            fondo: GRUESO_DEL_TABIQUE,
            color: '#d8d2c6',
            triangulos: r === puerta ? TRIANGULOS_DEL_TABIQUE_CON_PUERTA : TRIANGULOS_DEL_TABIQUE,
          });
        }
        if (planta > 0 && n === 0) {
          const e = giraElPunto(uLocal - anchoSala / 2 + 1.0, vLocal, edificio.giro);
          bultos.push({ clase: 'escalera', x: edificio.centro.x + e.x, y: suelo - ALTURA_DE_PLANTA, z: edificio.centro.z + e.z, giro: edificio.giro, ancho: 2.0, alto: ALTURA_DE_PLANTA, fondo: 6.0, color: '#8a8578', triangulos: TRIANGULOS_DE_LA_ESCALERA });
        }

        const muebles: PuestaEnLaCiudad[] = sala.muebles.map((m) => {
          const p = giraElPunto(uLocal + m.u, vLocal + m.v, edificio.giro);
          return { pieza: m.pieza, x: edificio.centro.x + p.x, y: suelo + GRUESO_DE_LA_LOSA + m.y, z: edificio.centro.z + p.z, giro: edificio.giro + radianesDeCuartos(m.cuartos), talla: 1 };
        });
        const puertaLocal = sala.contra(puerta, 0, 0);
        salas.push({
          edificio: edificio.indice,
          planta,
          sala: n,
          uso,
          centro,
          ancho: anchoSala,
          fondo: fondoSala,
          giro: edificio.giro,
          y: suelo,
          puerta: { u: puertaLocal.u, v: puertaLocal.v, ancho: ANCHO_DE_LA_PUERTA, pared: puerta },
          anclaje,
          bultos,
          muebles,
          triangulos: bultos.reduce((a, b) => a + b.triangulos, 0) + muebles.reduce((a, m) => a + triangulosDe(m.pieza), 0),
        });
        n++;
      }
    }
  }
  return salas;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 10. EL MOBILIARIO URBANO: CADA COSA DONDE TENDRÍA SENTIDO QUE ESTUVIERA
 * ══════════════════════════════════════════════════════════════════════════ */

/** El ciclo de un semáforo: cinco de verde, uno de ámbar, y otro tanto para el otro eje. */
export const CICLO_DEL_SEMAFORO = 12;
export const VERDE_DEL_SEMAFORO = 5;
export const AMBAR_DEL_SEMAFORO = 1;

/** Si el eje `eje` tiene verde en el instante `t` en el cruce que empieza por `ejeQueEmpieza`. */
export function hayVerde(s: SemaforoDeLaCiudad, eje: 0 | 1, t: number): boolean {
  const fase = ((t % CICLO_DEL_SEMAFORO) + CICLO_DEL_SEMAFORO) % CICLO_DEL_SEMAFORO;
  const primero = eje === s.ejeQueEmpieza;
  return primero ? fase < VERDE_DEL_SEMAFORO : fase >= VERDE_DEL_SEMAFORO + AMBAR_DEL_SEMAFORO && fase < 2 * VERDE_DEL_SEMAFORO + AMBAR_DEL_SEMAFORO;
}

/** Cuándo vuelve a abrirse ese eje, a partir de `t`. Exacto, sin buscar. */
export function proximoVerde(s: SemaforoDeLaCiudad, eje: 0 | 1, t: number): number {
  const base = Math.floor(t / CICLO_DEL_SEMAFORO) * CICLO_DEL_SEMAFORO;
  const arranque = eje === s.ejeQueEmpieza ? 0 : VERDE_DEL_SEMAFORO + AMBAR_DEL_SEMAFORO;
  for (let k = 0; k < 3; k++) {
    const cuando = base + k * CICLO_DEL_SEMAFORO + arranque;
    if (cuando >= t) return cuando;
  }
  return t;
}

/**
 * LOS SEMÁFOROS VAN EN LOS CRUCES GRANDES, Y AQUÍ HAY QUE CORREGIR EL PLANO.
 *
 * `LA-CIUDAD.md` §3 los pone «sólo en los cruces de CUATRO vecinas donde al menos una de
 * las calles es avenida o bulevar». Ese conjunto está VACÍO en esta traza, y se puede ver
 * por qué contando: la avenida tiene mediana, así que sus dos losas no se abren la una a la
 * otra y ninguna celda de avenida llega nunca a cuatro brazos; y el bulevar es el borde de
 * la ciudad, así que tampoco tiene nada al otro lado. Todos los encuentros de una calle con
 * una avenida o con el bulevar son TES. Con la regla del plano, la ciudad se quedaba sin un
 * solo semáforo.
 *
 * Así que la regla es la misma con el número corregido: semáforo donde una calle se junta
 * con una avenida o con el bulevar, tenga tres brazos o cuatro. Sigue sin haber un semáforo
 * en cada esquina —los cruces de calle con calle no llevan ninguno—, que es lo que el plano
 * quería decir. Uno por brazo, con el mástil en la esquina de más allá y el brazo cruzando
 * la calzada del brazo al que manda, que es donde lo ve quien llega.
 */
function semaforosDeLaCiudad(recinto: RecintoDeLaCiudad, t: Trazado, losas: readonly LosaDeCalle[], calidad: Calidad): { readonly semaforos: SemaforoDeLaCiudad[]; readonly puestas: PuestaEnLaCiudad[] } {
  const semaforos: SemaforoDeLaCiudad[] = [];
  const puestas: PuestaEnLaCiudad[] = [];
  for (const losa of losas) {
    if (carasDe(losa.abre) < 3) continue;
    const clase = t.clase[losa.j * t.n + losa.i] as ClaseDeCelda;
    if (clase !== 'avenida' && clase !== 'bulevar') continue;
    const centro = centroDeCelda(recinto, losa.i, losa.j);
    const s: SemaforoDeLaCiudad = { cruce: semaforos.length, i: losa.i, j: losa.j, x: centro.x, z: centro.z, ejeQueEmpieza: ((losa.i + losa.j) % 2) as 0 | 1 };
    semaforos.push(s);
    /*
     * El CICLO se sigue calculando en todos los cruces —los coches paran igual—, pero el
     * poste sólo se pinta donde se ve: en sobria, uno de cada cuatro cruces y un solo brazo.
     * Un `semaforo-c` cuesta 444 triángulos, y ciento diez de ellos son 48.800: más que
     * todos los prismas de la ciudad juntos.
     */
    if (calidad === 'sobria' && semaforos.length % 4 !== 1) continue;
    /*
     * DOS BRAZOS POR CRUCE, Y NO CUATRO, Y EL NÚMERO SALE DEL PRESUPUESTO.
     *
     * La primera versión ponía uno por brazo. Con 54 celdas por lado hay 172 cruces con
     * semáforo, y cuatro `semaforo-c` de 444 triángulos en cada uno son 305.000: la quinta
     * parte de la ciudad entera, y 138.000 dentro del disco de L1 —más que todos los
     * edificios de ese disco juntos—. Medido, y por eso se corrigió. Con dos, uno por sentido
     * del eje principal, se ve un semáforo desde donde se llega y cuesta la mitad.
     */
    /*
     * El eje principal es el que ATRAVIESA el cruce: el que tiene las dos caras abiertas. En
     * una te es el único que puede serlo, y en un cruce de cuatro se coge el este-oeste. Los
     * dos brazos van sobre él, que es por donde llega quien tiene que ver el semáforo; el
     * brazo de la calle que muere en el cruce no lo ve nadie hasta que ya ha parado.
     */
    const ejePrincipal: Rumbo = (losa.abre & 0b0101) === 0b0101 ? 0 : (losa.abre & 0b1010) === 0b1010 ? 1 : ejeDeLaMascara(losa.abre);
    for (const r of RUMBOS) {
      if ((losa.abre & (1 << r)) === 0) continue;
      if (r !== ejePrincipal && r !== rumboContrario(ejePrincipal)) continue;
      if (calidad === 'sobria' && r !== ejePrincipal) continue;
      const v = vectorDelRumbo(r);
      const d = vectorDelRumbo(rumboALaDerecha(r));
      puestas.push({
        pieza: PIEZA.semaforoC,
        x: centro.x + (v.x + d.x) * EJE_DEL_BORDILLO,
        y: ALTURA_DEL_BORDILLO,
        z: centro.z + (v.z + d.z) * EJE_DEL_BORDILLO,
        giro: radianesDeCuartos(cuartosDelBrazoHacia(rumboContrario(rumboALaDerecha(r)))),
        talla: 1,
      });
    }
  }
  return { semaforos, puestas };
}

/** El eje de una losa recta: 1 si la calle corre norte-sur, 0 si corre este-oeste. */
function ejeDeLaLosa(losa: LosaDeCalle): 0 | 1 {
  return (losa.abre & (1 << 1)) !== 0 || (losa.abre & (1 << 3)) !== 0 ? 1 : 0;
}

/**
 * LAS FAROLAS van en el bordillo, a 5,70 del eje de la calzada, cada DOS celdas y
 * alternando lado: nunca dos enfrentadas. Y sólo donde hay algo que alumbrar, o sea del
 * lado que da a una manzana y no del que da a otra calle.
 */
function mobiliarioDeLaCalle(recinto: RecintoDeLaCiudad, t: Trazado, losas: readonly LosaDeCalle[], calidad: Calidad): PuestaEnLaCiudad[] {
  const idx = (i: number, j: number): number => j * t.n + i;
  const puestas: PuestaEnLaCiudad[] = [];
  /** Los barrios donde una calle lleva árboles de alineación: donde se vive y donde se pasea. */
  const CON_ARBOLADO: readonly (NombreDeDistrito | null)[] = ['ensanche', 'vivienda-alta', 'chalets', 'ocio'];
  for (const losa of losas) {
    if (losa.pieza !== PIEZA.calzada && losa.pieza !== PIEZA.calzadaPaso) continue;
    const resto = (losa.i + losa.j) % (calidad === 'plena' ? 4 : 8);
    const eje = ejeDeLaLosa(losa);
    const lados: Rumbo[] = eje === 1 ? [0, 2] : [1, 3];
    /*
     * LOS ÁRBOLES DE ALINEACIÓN VAN EN LA ACERA DE ENFRENTE DE LAS FAROLAS, y cada tres
     * celdas en vez de cada dos. Así la calle queda con farola, árbol, farola, árbol,
     * alternando lado —que es como está una calle de verdad— y nunca hay un árbol tapando
     * una farola. Sólo en los barrios donde se vive y se pasea: en el polígono no hay
     * arbolado, y ponerlo sería justo lo contrario de «detalles bien organizados».
     */
    const conArbol = (losa.i + losa.j) % 6 === 3 && calidad === 'plena';
    if (resto !== 0 && resto !== 2 && !conArbol) continue;
    const centro = centroDeCelda(recinto, losa.i, losa.j);
    const ponEnLaAcera = (lado: Rumbo, pieza: NombreDePieza, giro: number): boolean => {
      const p = PASO_DEL_RUMBO[lado] as { di: number; dj: number };
      const vecina = t.clase[idx(losa.i + p.di, losa.j + p.dj)] as ClaseDeCelda | undefined;
      if (vecina === undefined || esClaseDeCalle(vecina)) return false;
      if (pieza !== PIEZA.farolaDeCalle && CON_ARBOLADO.indexOf(t.distrito[idx(losa.i + p.di, losa.j + p.dj)] ?? null) < 0) return false;
      const v = vectorDelRumbo(lado);
      puestas.push({ pieza, x: centro.x + v.x * EJE_DEL_BORDILLO, y: ALTURA_DEL_BORDILLO, z: centro.z + v.z * EJE_DEL_BORDILLO, giro, talla: 1 });
      return true;
    };
    if (resto === 0 || resto === 2) {
      const lado = lados[resto === 0 ? 0 : 1] as Rumbo;
      ponEnLaAcera(lado, PIEZA.farolaDeCalle, radianesDeCuartos(cuartosDelBrazoHacia(rumboContrario(lado))));
    }
    if (conArbol) ponEnLaAcera(lados[1] as Rumbo, PIEZA.pinoPequeno, 0);
  }
  /*
   * LA MEDIANA DE LAS AVENIDAS: la de en medio, y sólo la de en medio.
   *
   * Una avenida son cuatro losas y por tanto TRES bordillos dobles. El de en medio —entre la
   * celda 26 y la 27, que cae justo en el eje del recinto— es la mediana, y ahí van los
   * árboles de alineación cada tres celdas y las farolas cada dos, alternando lado. Los otros
   * dos son separadores de carril y no llevan NADA: un árbol plantado entre dos carriles del
   * mismo sentido no es un detalle bien organizado, es un accidente.
   *
   * Y donde la mediana se abre —los cruces (`abreHacia`)— tampoco va nada: ahí no hay
   * mediana, hay calzada, y lo que se plante se planta en mitad del cruce.
   */
  const izquierdaDelEje = CELDAS_DE_AVENIDA[1] as number;
  for (let k = 1; k < t.n - 1; k++) {
    for (const eje of [0, 1]) {
      const i = eje === 0 ? izquierdaDelEje : k;
      const j = eje === 0 ? k : izquierdaDelEje;
      if ((t.clase[idx(i, j)] as ClaseDeCelda) !== 'avenida') continue;
      /* Si esta celda abre hacia la de al lado, la mediana está cortada aquí: es un cruce. */
      const haciaLaOtra: Rumbo = eje === 0 ? 0 : 1;
      if (((t.abre[idx(i, j)] as number) & (1 << haciaLaOtra)) !== 0) continue;
      const centro = centroDeCelda(recinto, i, j);
      const x = eje === 0 ? centro.x + RETICULA_DE_LA_CIUDAD / 2 : centro.x;
      const z = eje === 0 ? centro.z : centro.z + RETICULA_DE_LA_CIUDAD / 2;
      if (k % 3 === 0) puestas.push({ pieza: PIEZA.pinoPequeno, x, y: ALTURA_DEL_BORDILLO, z, giro: 0, talla: 1 });
      else if (k % 2 === 0 && calidad === 'plena') {
        puestas.push({ pieza: PIEZA.farolaDeCalle, x, y: ALTURA_DEL_BORDILLO, z, giro: radianesDeCuartos(cuartosDelBrazoHacia(((k % 4 === 0 ? 0 : 2) + (eje === 0 ? 0 : 1)) as Rumbo)), talla: 1 });
      }
    }
  }
  return puestas;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 11. LOS DISTRITOS CON CARÁCTER
 * ══════════════════════════════════════════════════════════════════════════ */

export interface CajaEnPlanta {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  readonly cx: number;
  readonly cz: number;
  readonly ancho: number;
  readonly fondo: number;
}

export function cajaDelDistrito(recinto: RecintoDeLaCiudad, d: DistritoPuesto): CajaEnPlanta {
  const a = centroDeCelda(recinto, d.i0, d.j0);
  const x0 = a.x - RETICULA_DE_LA_CIUDAD / 2;
  const z0 = a.z - RETICULA_DE_LA_CIUDAD / 2;
  const ancho = d.ancho * RETICULA_DE_LA_CIUDAD;
  const fondo = d.fondo * RETICULA_DE_LA_CIUDAD;
  return { x0, z0, x1: x0 + ancho, z1: z0 + fondo, cx: x0 + ancho / 2, cz: z0 + fondo / 2, ancho, fondo };
}

/**
 * LOS COSENOS DE UN CUARTO DE VUELTA, cada quince grados y escritos a mano.
 *
 * Para trazar el óvalo del circuito y el borde del estanque hacen falta senos y cosenos, y
 * `Math.cos` puede diferir en el último bit entre el motor del móvil y el del PC. Una tabla
 * literal es idéntica en los dos, y con seis tramos por cuarto una curva de radio 24 tiene
 * el error de cuerda en 0,20: por debajo de lo que se ve. La misma mesa, la misma ciudad.
 */
export const COSENO_DEL_CUARTO: readonly number[] = [1, 0.965926, 0.866025, 0.707107, 0.5, 0.258819, 0];
export const SENO_DEL_CUARTO: readonly number[] = [0, 0.258819, 0.5, 0.707107, 0.866025, 0.965926, 1];

/* ───────────────────────────── El parque ───────────────────────────── */

/**
 * El sendero del parque: 3,6 de ancho y CUARENTA tramos, que es lo que pide el plano y lo
 * que el parque de 120 × 156 aguanta sin que las curvas se vean poligonales. Cuarenta tramos
 * son 80 triángulos; las 400 losetas de `sendero` del pack que harían el mismo camino
 * costarían 144.400. Es el ejemplo que explica el nivel de detalle entero.
 */
export const ANCHO_DEL_SENDERO = 3.6;
export const TRAMOS_DEL_SENDERO = 40;
/** El diámetro del estanque, y sus sectores. Con el parque a 2,6 veces, el estanque sube a 48. */
export const DIAMETRO_DEL_ESTANQUE = 48;
export const SECTORES_DEL_ESTANQUE = 24;
/** El templete: ocho columnas (48), un techo octogonal (16) y tres escalones (48). */
export const TRIANGULOS_DEL_TEMPLETE = 112;

interface ObraDeDistrito {
  readonly bultos: BultoPropio[];
  readonly cintas: CintaPropia[];
  readonly puestas: PuestaEnLaCiudad[];
  /**
   * LAS CÁSCARAS DEL PACK QUE PONE UN DISTRITO —el `bloque-g` del hospital, el `bloque-e` de
   * la estación, el `bloque-a` de la tienda de la gasolinera— van aparte de `puestas`, y no
   * es manía: son lo único de un distrito que en L2 hay que cambiar por un prisma. Si
   * viajaran con las farolas y los arbustos, o se caerían de lejos —y el hospital
   * desaparecería dejando su aparcamiento solo— o se pagarían enteras desde el otro lado de
   * la ciudad.
   */
  readonly volumenes: PuestaEnLaCiudad[];
  readonly coches: PuestaEnLaCiudad[];
  /** Sólo lo pone el circuito: el eje del carril por el que dan vueltas sus seis coches. */
  circuito: Punto[] | null;
}

function vacia(): ObraDeDistrito {
  return { bultos: [], cintas: [], puestas: [], volumenes: [], coches: [], circuito: null };
}

function montarElParque(caja: CajaEnPlanta, azar: () => number, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  const celdasX = Math.round(caja.ancho / RETICULA_DE_LA_CIUDAD);
  const celdasZ = Math.round(caja.fondo / RETICULA_DE_LA_CIUDAD);
  obra.bultos.push({
    clase: 'pradera',
    x: caja.cx,
    y: ALTURA_DEL_BORDILLO,
    z: caja.cz,
    giro: 0,
    ancho: caja.ancho,
    alto: 0,
    fondo: caja.fondo,
    color: '#5f8a3f',
    triangulos: celdasX * celdasZ * 2,
  });

  /*
   * EL SENDERO SERPENTEA, y serpentea con aritmética entera: entra por una esquina, sale
   * por la contraria y se va apartando del eje con dos ondas triangulares de periodo
   * distinto, cuyas amplitudes sortea la semilla. Sin senos: dos motores de JavaScript
   * tienen que dibujar el MISMO camino.
   */
  const amplitud = 8 + azar() * 10;
  const segunda = 4 + azar() * 6;
  const puntos: Punto[] = [];
  const onda = (fase: number): number => {
    const f = fase - Math.floor(fase);
    return f < 0.5 ? 4 * f - 1 : 3 - 4 * f;
  };
  for (let k = 0; k <= TRAMOS_DEL_SENDERO; k++) {
    const s = k / TRAMOS_DEL_SENDERO;
    const base = { x: caja.x0 + 6 + s * (caja.ancho - 12), z: caja.z0 + 6 + s * (caja.fondo - 12) };
    const desvio = onda(s * 1.5 + 0.25) * amplitud + onda(s * 3.5) * segunda;
    /* La normal a la diagonal, normalizada a mano con las medidas del rectángulo. */
    const largo = Math.sqrt(caja.ancho * caja.ancho + caja.fondo * caja.fondo);
    puntos.push({ x: base.x - (caja.fondo / largo) * desvio, z: base.z + (caja.ancho / largo) * desvio });
  }
  obra.cintas.push({ clase: 'sendero', puntos, cerrada: false, ancho: ANCHO_DEL_SENDERO, y: ALTURA_DEL_BORDILLO + 0.02, alto: 0, color: '#b9a887', triangulos: TRAMOS_DEL_SENDERO * 2 });

  /* El estanque, junto al sendero por su mitad; y el templete, en el punto más lejano de las cuatro esquinas. */
  const medio = puntos[Math.floor(TRAMOS_DEL_SENDERO / 2)] as Punto;
  /* El estanque, junto al sendero, PERO ENTERO DENTRO DEL PARQUE: con 48 de diámetro ya no
   * cabe en cualquier sitio, y un estanque medio metido en la calle no es un estanque. */
  const dentroDelParque = (v: number, desde: number, hasta: number): number => Math.max(desde, Math.min(hasta, v));
  obra.bultos.push({
    clase: 'estanque',
    x: dentroDelParque(medio.x + (caja.cx - medio.x) * 0.6 + 14, caja.x0 + DIAMETRO_DEL_ESTANQUE / 2 + 2, caja.x1 - DIAMETRO_DEL_ESTANQUE / 2 - 2),
    y: ALTURA_DEL_BORDILLO - 0.3,
    z: dentroDelParque(medio.z + (caja.cz - medio.z) * 0.6, caja.z0 + DIAMETRO_DEL_ESTANQUE / 2 + 2, caja.z1 - DIAMETRO_DEL_ESTANQUE / 2 - 2),
    giro: 0,
    ancho: DIAMETRO_DEL_ESTANQUE,
    alto: 0.3,
    fondo: DIAMETRO_DEL_ESTANQUE,
    color: '#2f6f8f',
    triangulos: SECTORES_DEL_ESTANQUE,
  });
  const templete = puntos[Math.floor(TRAMOS_DEL_SENDERO * 0.25)] as Punto;
  obra.bultos.push({ clase: 'templete', x: templete.x - 10, y: ALTURA_DEL_BORDILLO, z: templete.z + 8, giro: 0, ancho: 12, alto: 6, fondo: 12, color: '#e0d8c4', triangulos: TRIANGULOS_DEL_TEMPLETE });

  /* Bancos y farolas mirando al sendero, cada tantos tramos y alternando lado. */
  for (let k = 2; k < TRAMOS_DEL_SENDERO - 1; k += 3) {
    const a = puntos[k] as Punto;
    const b = puntos[k + 1] as Punto;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const largo = Math.sqrt(dx * dx + dz * dz) || 1;
    const lado = k % 6 === 2 ? 1 : -1;
    const nx = (-dz / largo) * lado;
    const nz = (dx / largo) * lado;
    const cuartos = Math.abs(dx) > Math.abs(dz) ? (nx > 0 ? 3 : 1) : nz > 0 ? 2 : 0;
    obra.puestas.push({ pieza: PIEZA.bancoDeParque, x: a.x + nx * 3.4, y: ALTURA_DEL_BORDILLO, z: a.z + nz * 3.4, giro: radianesDeCuartos(cuartos), talla: 1 });
    if (k % 6 === 2) obra.puestas.push({ pieza: PIEZA.farolaDeParque, x: a.x - nx * 3.4, y: ALTURA_DEL_BORDILLO, z: a.z - nz * 3.4, giro: 0, talla: 1 });
  }

  /*
   * LA ARBOLEDA: grupos de tres a siete, NUNCA en línea, a más de 4 entre troncos y a más
   * de 6 del sendero. Un parque con los árboles en cuadrícula es un vivero.
   */
  const arboles: Punto[] = [];
  const especies = [PIEZA.pinoGrande, PIEZA.pino, PIEZA.pinoPequeno, PIEZA.pinoRojo];
  /* El parque es 2,6 veces el de antes: de 110 árboles a 175, que es lo que pide el plano. */
  const tope = calidad === 'plena' ? 175 : 30;
  for (let intento = 0; intento < 1600 && arboles.length < tope; intento++) {
    const cx = caja.x0 + 4 + azar() * (caja.ancho - 8);
    const cz = caja.z0 + 4 + azar() * (caja.fondo - 8);
    const cuantos = 3 + (Math.floor(azar() * 5) % 5);
    for (let k = 0; k < cuantos && arboles.length < tope; k++) {
      const x = cx + (azar() - 0.5) * 16;
      const z = cz + (azar() - 0.5) * 16;
      if (x < caja.x0 + 3 || x > caja.x1 - 3 || z < caja.z0 + 3 || z > caja.z1 - 3) continue;
      if (arboles.some((a) => (a.x - x) * (a.x - x) + (a.z - z) * (a.z - z) < 16)) continue;
      if (puntos.some((p) => (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) < 36)) continue;
      arboles.push({ x, z });
      obra.puestas.push({ pieza: especies[Math.floor(azar() * 4) % 4] as NombreDePieza, x, y: ALTURA_DEL_BORDILLO, z, giro: radianesDeCuartos(Math.floor(azar() * 4) % 4), talla: 1 });
    }
  }
  return obra;
}

/** Coseno y seno de un múltiplo de quince grados, con la tabla literal y sin `Math.cos`. */
export function cosDeGrados(g: number): number {
  const n = ((Math.round(g / 15) % 24) + 24) % 24;
  if (n <= 6) return COSENO_DEL_CUARTO[n] as number;
  if (n <= 12) return -(COSENO_DEL_CUARTO[12 - n] as number);
  if (n <= 18) return -(COSENO_DEL_CUARTO[n - 12] as number);
  return COSENO_DEL_CUARTO[24 - n] as number;
}
export function senDeGrados(g: number): number {
  return cosDeGrados(g - 90);
}

/* ─────────────────────────── El cementerio ─────────────────────────── */

/** La verja mide 4 justos: encaja sola en cualquier lado múltiplo de 4. */
export const TRAMO_DE_VERJA = 4;
/** Tres de paso entre filas de tumbas y 2,5 entre tumbas: un cementerio es lo más ordenado de una ciudad. */
export const PASO_ENTRE_FILAS = 4.5;
export const PASO_ENTRE_TUMBAS = 2.8;

function montarElCementerio(caja: CajaEnPlanta, haciaElCentro: Rumbo, azar: () => number, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  obra.bultos.push({ clase: 'tierra', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.cz, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo, color: '#6b5f4a', triangulos: 2 });

  /* La verja, con su arco de entrada en el lado que da a la calle más ancha. */
  const entrada = haciaElCentro;
  for (const lado of RUMBOS) {
    const v = vectorDelRumbo(lado);
    const largo = lado % 2 === 0 ? caja.fondo : caja.ancho;
    const tramos = Math.round(largo / TRAMO_DE_VERJA);
    for (let k = 0; k < tramos; k++) {
      const a = -largo / 2 + (k + 0.5) * TRAMO_DE_VERJA;
      const enElMedio = Math.abs(a) < TRAMO_DE_VERJA;
      const x = caja.cx + v.x * (caja.ancho / 2) + (lado % 2 === 0 ? 0 : a);
      const z = caja.cz + v.z * (caja.fondo / 2) + (lado % 2 === 0 ? a : 0);
      const giro = radianesDeCuartos(cuartosMirandoA(lado) + 1);
      if (lado === entrada && enElMedio) {
        obra.puestas.push({ pieza: k === Math.floor(tramos / 2) ? PIEZA.arcoDeVerja : PIEZA.verjaPuerta, x, y: ALTURA_DEL_BORDILLO, z, giro, talla: 1 });
        continue;
      }
      /*
       * En sobria la verja va de cuatro en cuatro tramos, y el número está medido: son 96
       * tramos a 380 triángulos, o sea 36.480, y en un móvil el tablero entero tiene 84.477
       * para toda la ciudad. Con uno de cada cuatro el cementerio sigue leyéndose cerrado —lo
       * que se ve de una verja a esa distancia son los postes— y cuesta 9.120.
       */
      if (calidad === 'sobria' && k % 4 !== 0) continue;
      obra.puestas.push({ pieza: PIEZA.verja, x, y: ALTURA_DEL_BORDILLO, z, giro, talla: 1 });
      if (k % 3 === 0) obra.puestas.push({ pieza: PIEZA.verjaPoste, x, y: ALTURA_DEL_BORDILLO, z, giro, talla: 1 });
    }
  }

  /* La cripta, al fondo del eje que entra por la puerta. */
  const v = vectorDelRumbo(rumboContrario(entrada));
  obra.puestas.push({
    pieza: PIEZA.cripta,
    x: caja.cx + v.x * (caja.ancho / 2 - 8),
    y: ALTURA_DEL_BORDILLO,
    z: caja.cz + v.z * (caja.fondo / 2 - 8),
    giro: giroMirandoA(entrada),
    talla: 1,
  });
  /* Y con la cripta, sus dos sarcófagos y la losa conmemorativa, a los lados de su eje. */
  const aLoAncho = vectorDelRumbo(rumboALaDerecha(entrada));
  for (const s of [-1, 1]) {
    obra.puestas.push({
      pieza: PIEZA.sarcofago,
      x: caja.cx + v.x * (caja.ancho / 2 - 14) + aLoAncho.x * s * 5,
      y: ALTURA_DEL_BORDILLO,
      z: caja.cz + v.z * (caja.fondo / 2 - 14) + aLoAncho.z * s * 5,
      giro: giroMirandoA(entrada),
      talla: 1,
    });
  }
  obra.puestas.push({
    pieza: PIEZA.losaConmemorativa,
    x: caja.cx + v.x * (caja.ancho / 2 - 14),
    y: ALTURA_DEL_BORDILLO,
    z: caja.cz + v.z * (caja.fondo / 2 - 14),
    giro: giroMirandoA(entrada),
    talla: 1,
  });

  /*
   * Y LAS TUMBAS EN FILAS ALINEADAS, todas mirando al mismo lado, con las dos calles en
   * cruz sin nada encima. Nada de dispersión: un cementerio disperso no parece un
   * cementerio, parece un descampado con lápidas.
   */
  const modelos = [PIEZA.tumba, PIEZA.tumbaLlana, PIEZA.lapida, PIEZA.hito, PIEZA.hitoB];
  /*
   * El tope de tumbas es DURO y por presupuesto: el cementerio de 84 × 108 tiene sitio para
   * 418 en filas de a 22, y a 250 triángulos de media serían 104.000 —la mitad de lo que pesa
   * el tablero entero— por un rincón al que casi nadie se acerca. Ciento veinte llenan lo que
   * se ve desde la puerta, que es por donde se mira un cementerio.
   */
  const tope = calidad === 'plena' ? 120 : 20;
  let puestas = 0;
  const filas = Math.floor((caja.fondo - 20) / PASO_ENTRE_FILAS);
  const porFila = Math.floor((caja.ancho - 20) / PASO_ENTRE_TUMBAS);
  for (let f = 0; f < filas && puestas < tope; f++) {
    const z = caja.cz - ((filas - 1) / 2) * PASO_ENTRE_FILAS + f * PASO_ENTRE_FILAS;
    if (Math.abs(z - caja.cz) < 4) continue;
    for (let k = 0; k < porFila && puestas < tope; k++) {
      const x = caja.cx - ((porFila - 1) / 2) * PASO_ENTRE_TUMBAS + k * PASO_ENTRE_TUMBAS;
      if (Math.abs(x - caja.cx) < 4) continue;
      obra.puestas.push({ pieza: modelos[Math.floor(azar() * modelos.length) % modelos.length] as NombreDePieza, x, y: ALTURA_DEL_BORDILLO, z, giro: giroMirandoA(entrada), talla: 1 });
      puestas++;
    }
    if (f % 3 === 1) obra.puestas.push({ pieza: f % 6 === 1 ? PIEZA.arbolSeco : PIEZA.arbolSecoMediano, x: caja.cx + caja.ancho / 2 - 5, y: ALTURA_DEL_BORDILLO, z, giro: 0, talla: 1 });
  }
  for (const s of [-1, 1]) obra.puestas.push({ pieza: PIEZA.farolDePie, x: caja.cx + s * 4, y: ALTURA_DEL_BORDILLO, z: caja.cz + s * 4, giro: 0, talla: 1 });
  return obra;
}

/* ───────────────────── El centro comercial y el polígono ───────────────────── */

function montarElCentroComercial(caja: CajaEnPlanta, azar: () => number, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  const naveFondo = caja.fondo * 0.45;
  obra.bultos.push({ clase: 'nave', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.z0 + naveFondo / 2, giro: 0, ancho: caja.ancho - 6, alto: 12, fondo: naveFondo, color: '#c4c0b6', triangulos: 40 });
  obra.bultos.push({ clase: 'asfalto', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.z1 - (caja.fondo - naveFondo) / 2, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo - naveFondo, color: '#4a4a4c', triangulos: 2 });
  const plazas = 20;
  const coches = calidad === 'plena' ? 14 : 3;
  const modelos = [PIEZA.cocheBerlina, PIEZA.cocheUtilitario, PIEZA.cocheFamiliar];
  for (let k = 0; k < plazas; k++) {
    const fila = k < plazas / 2 ? 0 : 1;
    const n = k % (plazas / 2);
    const x = caja.x0 + 4 + n * ((caja.ancho - 8) / (plazas / 2 - 1));
    const z = caja.z1 - 6 - fila * 8;
    obra.bultos.push({ clase: 'plaza-de-aparcamiento', x, y: ALTURA_DEL_BORDILLO, z, giro: 0, ancho: 3, alto: 0, fondo: 6, color: '#d9d4c8', triangulos: 2 });
    if (k < coches) obra.coches.push({ pieza: modelos[Math.floor(azar() * 3) % 3] as NombreDePieza, x, y: ALTURA_DEL_BORDILLO + 0.366, z, giro: 0, talla: 1 });
  }
  for (let k = 0; k < 6; k++) obra.puestas.push({ pieza: PIEZA.farolaDeCalle, x: caja.x0 + 6 + k * ((caja.ancho - 12) / 5), y: ALTURA_DEL_BORDILLO, z: caja.z1 - 2, giro: radianesDeCuartos(cuartosDelBrazoHacia(3)), talla: 1 });
  for (let k = 0; k < 4; k++) obra.puestas.push({ pieza: PIEZA.papelera, x: caja.x0 + 8 + k * 10, y: ALTURA_DEL_BORDILLO, z: caja.z1 - 3, giro: 0, talla: 1 });
  for (let k = 0; k < 3; k++) obra.puestas.push({ pieza: PIEZA.pino, x: caja.x0 + 10 + k * 14, y: ALTURA_DEL_BORDILLO, z: caja.z1 - 11, giro: 0, talla: 1 });
  return obra;
}

function montarElPoligono(caja: CajaEnPlanta, azar: () => number, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  obra.bultos.push({ clase: 'asfalto', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.cz, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo, color: '#55565a', triangulos: 2 });
  const naveAncho = caja.ancho - 4;
  const naveFondo = 24;
  for (const k of [0, 1]) {
    const z = caja.z0 + 14 + k * (naveFondo + 2);
    if (z + naveFondo / 2 > caja.z1) continue;
    obra.bultos.push({ clase: 'nave', x: caja.cx, y: ALTURA_DEL_BORDILLO, z, giro: 0, ancho: naveAncho, alto: 9 + k * 2, fondo: naveFondo, color: '#9aa0a6', triangulos: 40 });
    if (k === 1) obra.puestas.push({ pieza: PIEZA.torreDeAgua, x: caja.cx + naveAncho / 2 - 4, y: ALTURA_DEL_BORDILLO + 11, z, giro: 0, talla: 1 });
    obra.puestas.push({ pieza: PIEZA.contenedor, x: caja.cx - naveAncho / 2 + 4, y: ALTURA_DEL_BORDILLO, z: z - naveFondo / 2 - 2.5, giro: 0, talla: 1 });
  }
  /*
   * El menudo del patio va CARGADO A LO BARATO a propósito: `palet` cuesta 192 triángulos y
   * `chatarra` 1.148. Con la lista repartida a partes iguales, sesenta bultos de patio
   * costaban 42.000 —más que el cementerio entero—, y a la vista son lo mismo. Van los
   * caros de uno en uno, para que se les vea, y los baratos a montones, que es lo que llena.
   */
  const tope = calidad === 'plena' ? 40 : 14;
  const patio = { x: caja.cx, z: caja.z0 + 6 };
  const menudo = [PIEZA.palet, PIEZA.palet, PIEZA.paletCubierto, PIEZA.palet, PIEZA.bidon, PIEZA.palet, PIEZA.perfiles, PIEZA.paletCubierto];
  for (let k = 0; k < tope; k++) {
    const fila = Math.floor(k / 10);
    const n = k % 10;
    const x = patio.x - (caja.ancho / 2 - 4) + n * ((caja.ancho - 8) / 9);
    const z = patio.z + fila * 2.4;
    if (z > caja.z1 - 2) break;
    obra.puestas.push({ pieza: menudo[Math.floor(azar() * menudo.length) % menudo.length] as NombreDePieza, x, y: ALTURA_DEL_BORDILLO, z, giro: radianesDeCuartos(Math.floor(azar() * 4) % 4), talla: 1 });
  }
  obra.coches.push({ pieza: PIEZA.cocheFamiliar, x: caja.x1 - 4, y: ALTURA_DEL_BORDILLO + 0.366, z: caja.z0 + 4, giro: radianesDeCuartos(1), talla: 1 });
  return obra;
}

/* ───────────────────────────── El circuito ───────────────────────────── */

/** El radio de las curvas y el ancho de la pista, con la cuenta que los ata al recinto. */
export const RADIO_DEL_CIRCUITO = 36;
export const ANCHO_DE_LA_PISTA = 12;
/** La velocidad de un coche de carreras, y la de la calle. */
export const VELOCIDAD_DE_CARRERA = 22;
export const VELOCIDAD_DE_CALLE = 12;

/**
 * EL ÓVALO, y la corrección que hubo que hacerle al plano.
 *
 * `LA-CIUDAD.md` §4 pide «dos rectas de 108 y dos curvas de radio 36» dentro de 12 × 12
 * celdas (144 × 144). No cabe, y es la misma cuenta que ya no cuadraba a la escala anterior:
 * con radio 36 las dos curvas se comen 72, y 108 + 72 = 180, treinta y seis más de los que
 * hay. Se conserva el radio —que es lo que hace que la curva se lea como curva— y la recta
 * pasa a 72, que es lo que deja el recinto: el óvalo mide 144 × 72 y los 72 que sobran son la
 * recta de gradas y el paddock. Longitud de la vuelta: 2 × 72 + 2π × 36 = 370, o sea 16,8 s
 * a 22 unidades por segundo.
 */
export function ovaloDelCircuito(cx: number, cz: number, ancho: number): Punto[] {
  const recta = ancho - 2 * RADIO_DEL_CIRCUITO;
  const puntos: Punto[] = [];
  puntos.push({ x: cx - recta / 2, z: cz - RADIO_DEL_CIRCUITO });
  puntos.push({ x: cx + recta / 2, z: cz - RADIO_DEL_CIRCUITO });
  for (let g = -90 + 15; g <= 90; g += 15) puntos.push({ x: cx + recta / 2 + RADIO_DEL_CIRCUITO * cosDeGrados(g), z: cz + RADIO_DEL_CIRCUITO * senDeGrados(g) });
  puntos.push({ x: cx - recta / 2, z: cz + RADIO_DEL_CIRCUITO });
  for (let g = 90 + 15; g <= 270; g += 15) puntos.push({ x: cx - recta / 2 + RADIO_DEL_CIRCUITO * cosDeGrados(g), z: cz + RADIO_DEL_CIRCUITO * senDeGrados(g) });
  return puntos;
}

/** Una polilínea desplazada `d` a su izquierda (d < 0) o derecha (d > 0), para el quitamiedos y los carriles. */
export function desplazaLaPolilinea(puntos: readonly Punto[], d: number, cerrada: boolean): Punto[] {
  const salida: Punto[] = [];
  for (let k = 0; k < puntos.length; k++) {
    const a = puntos[k] as Punto;
    const b = (cerrada ? puntos[(k + 1) % puntos.length] : puntos[Math.min(k + 1, puntos.length - 1)]) as Punto;
    const c = (cerrada ? puntos[(k - 1 + puntos.length) % puntos.length] : puntos[Math.max(k - 1, 0)]) as Punto;
    const dx = b.x - c.x;
    const dz = b.z - c.z;
    const largo = Math.sqrt(dx * dx + dz * dz) || 1;
    salida.push({ x: a.x + (dz / largo) * d, z: a.z - (dx / largo) * d });
  }
  return salida;
}

function montarElCircuito(caja: CajaEnPlanta, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  const cz = caja.cz - (caja.fondo - 2 * RADIO_DEL_CIRCUITO) / 2 + 6;
  const eje = ovaloDelCircuito(caja.cx, cz, caja.ancho);
  obra.bultos.push({ clase: 'asfalto', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.cz, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo, color: '#4d4f52', triangulos: 2 });
  obra.cintas.push({ clase: 'pista', puntos: eje, cerrada: true, ancho: ANCHO_DE_LA_PISTA, y: ALTURA_DEL_BORDILLO + 0.05, alto: 0, color: '#38393c', triangulos: eje.length * 2 });
  for (const lado of [-1, 1]) {
    obra.cintas.push({
      clase: 'quitamiedos',
      puntos: desplazaLaPolilinea(eje, (lado * (ANCHO_DE_LA_PISTA + 1.2)) / 2, true),
      cerrada: true,
      ancho: 0.4,
      y: ALTURA_DEL_BORDILLO + 0.05,
      alto: 1.2,
      color: '#d0d3d6',
      triangulos: eje.length * 8,
    });
  }
  obra.cintas.push({ clase: 'linea-de-meta', puntos: [eje[0] as Punto, eje[1] as Punto], cerrada: false, ancho: ANCHO_DE_LA_PISTA, y: ALTURA_DEL_BORDILLO + 0.06, alto: 0, color: '#f2f2f2', triangulos: 2 });
  obra.bultos.push({ clase: 'gradas', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.z1 - 8, giro: 0, ancho: caja.ancho - 12, alto: 3.6, fondo: 9, color: '#b4b8bd', triangulos: 180 });
  for (let k = 0; k < 4; k++) obra.puestas.push({ pieza: PIEZA.pinoPequeno, x: caja.x0 + 4 + k * ((caja.ancho - 8) / 3), y: ALTURA_DEL_BORDILLO, z: caja.z1 - 2, giro: 0, talla: 1 });
  obra.circuito = calidad === 'plena' ? desplazaLaPolilinea(eje, -3, true) : null;
  return obra;
}

/* ─────────────── Los distritos nuevos que trae la ciudad de 648 ─────────────── */

/**
 * NUEVE DISTRITOS MÁS, Y NINGUNO CON LA REGLA DE OTRO.
 *
 * Miguel pidió «todo tipo de áreas que pueda tener una ciudad», y con 648 hay sitio. Lo que
 * los hace distintos no es el atrezo: es que cada uno se LLENA con una regla suya, y esa
 * regla es la que se ve. El estadio es un anillo cerrado alrededor de un rectángulo; la
 * estación son cintas paralelas; el canal es una línea recta con todo alineado a ella; la
 * feria es una malla de puestos iguales; el hospital es una U alrededor de su patio; el
 * colegio es una L alrededor de su pista; la gasolinera es una marquesina con sus surtidores
 * en fila; la obra es una retícula de pilares sin cerrar.
 *
 * Y todos comparten dos cosas: la geometría propia son PRISMAS Y PLANOS con su cuenta de
 * triángulos al lado (para que el presupuesto no dependa de lo que haga la escena), y lo que
 * es del pack va alineado con algo —una fachada, un andén, un cantil, un eje—, nunca suelto.
 */

/** El estadio: 8 × 9 celdas. Césped, grada en anillo, cuatro torres de luz y su verja. */
function montarElEstadio(caja: CajaEnPlanta, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  const GRADA = { fondo: 9, alto: 3.6, triangulos: 72 };
  obra.bultos.push({ clase: 'asfalto', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.cz, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo, color: '#6a6a63', triangulos: 2 });
  obra.bultos.push({ clase: 'cesped', x: caja.cx, y: ALTURA_DEL_BORDILLO + 0.02, z: caja.cz, giro: 0, ancho: caja.ancho - 2 * GRADA.fondo - 8, alto: 0, fondo: caja.fondo - 2 * GRADA.fondo - 8, color: '#3f7a34', triangulos: 2 });
  for (const r of RUMBOS) {
    const v = vectorDelRumbo(r);
    const largo = (r % 2 === 0 ? caja.fondo : caja.ancho) - 8;
    obra.bultos.push({
      clase: 'gradas',
      x: caja.cx + v.x * (caja.ancho / 2 - GRADA.fondo / 2 - 3),
      y: ALTURA_DEL_BORDILLO,
      z: caja.cz + v.z * (caja.fondo / 2 - GRADA.fondo / 2 - 3),
      giro: giroMirandoA(rumboContrario(r)),
      ancho: largo,
      alto: GRADA.alto,
      fondo: GRADA.fondo,
      color: '#b4b8bd',
      triangulos: GRADA.triangulos,
    });
  }
  /* Las cuatro torres de luz: una `torre-de-agua` sobre un pilar, en las cuatro esquinas. */
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = caja.cx + sx * (caja.ancho / 2 - 4);
      const z = caja.cz + sz * (caja.fondo / 2 - 4);
      obra.bultos.push({ clase: 'pilar', x, y: ALTURA_DEL_BORDILLO, z, giro: 0, ancho: 1.6, alto: 9, fondo: 1.6, color: '#8d9298', triangulos: 12 });
      obra.puestas.push({ pieza: PIEZA.torreDeAgua, x, y: ALTURA_DEL_BORDILLO + 9, z, giro: 0, talla: 1 });
    }
  }
  /*
   * EL PERÍMETRO DEL ESTADIO ES UN MURO PROPIO, Y NO LA VERJA DEL PACK, Y ESTÁ MEDIDO.
   *
   * `verja` cuesta 380 triángulos por cada 4 unidades. El perímetro de un estadio de 96 × 108
   * son 102 tramos: 38.760 triángulos, más que todos los edificios de una manzana grande, por
   * una valla que se ve de canto. Cuatro prismas de 12 hacen el mismo cierre por 48. La verja
   * del pack se queda donde es la SEÑA de identidad del distrito —el cementerio y el
   * colegio—, que es donde se mira de cerca y donde se reconoce.
   */
  for (const r of RUMBOS) {
    const v = vectorDelRumbo(r);
    const largo = (r % 2 === 0 ? caja.fondo : caja.ancho) - 1;
    obra.bultos.push({
      clase: 'cantil',
      x: caja.cx + v.x * (caja.ancho / 2 - 0.5),
      y: ALTURA_DEL_BORDILLO,
      z: caja.cz + v.z * (caja.fondo / 2 - 0.5),
      giro: giroMirandoA(r),
      ancho: r % 2 === 0 ? 1 : largo,
      alto: 2.2,
      fondo: r % 2 === 0 ? largo : 1,
      color: '#a8a49a',
      triangulos: 12,
    });
    if (calidad !== 'plena') continue;
    for (let k = 2; k < Math.round(largo / TRAMO_DE_VERJA); k += 4) {
      const a = -largo / 2 + (k + 0.5) * TRAMO_DE_VERJA;
      obra.puestas.push({
        pieza: PIEZA.arbusto,
        x: caja.cx + v.x * (caja.ancho / 2 - 2.5) + (r % 2 === 0 ? 0 : a),
        y: ALTURA_DEL_BORDILLO,
        z: caja.cz + v.z * (caja.fondo / 2 - 2.5) + (r % 2 === 0 ? a : 0),
        giro: 0,
        talla: 1,
      });
    }
  }
  return obra;
}

/** Cuál es el eje largo de una caja: 0 si va en x, 1 si va en z. Lo usan la estación y el canal. */
function ejeLargo(caja: CajaEnPlanta): 0 | 1 {
  return caja.ancho >= caja.fondo ? 0 : 1;
}

/**
 * LA ESTACIÓN: 4 × 14 celdas pegadas al bulevar. Cuatro vías, dos andenes y su marquesina.
 *
 * No hay trenes, y está decidido: un tren cuesta lo que dos coches (2.400 triángulos) y no
 * cuenta nada que la vía y el andén no cuenten ya. La vía sí: son dos triángulos por tramo de
 * 12, o sea 112 por las cuatro vías enteras.
 */
function montarLaEstacion(caja: CajaEnPlanta, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  const largo = ejeLargo(caja);
  const aLoLargo = largo === 0 ? caja.ancho : caja.fondo;
  const aLoAncho = largo === 0 ? caja.fondo : caja.ancho;
  const en = (a: number, b: number): Punto => (largo === 0 ? { x: caja.cx + a, z: caja.cz + b } : { x: caja.cx + b, z: caja.cz + a });
  obra.bultos.push({ clase: 'asfalto', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.cz, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo, color: '#5b5a57', triangulos: 2 });
  /* Cuatro vías y dos andenes, alternados: vía, vía, andén, vía, vía, andén. */
  const carriles = [-aLoAncho / 2 + 6, -aLoAncho / 2 + 12, aLoAncho / 2 - 12, aLoAncho / 2 - 6];
  for (const c of carriles) {
    const a = en(-aLoLargo / 2 + 2, c);
    const b = en(aLoLargo / 2 - 2, c);
    obra.cintas.push({ clase: 'sendero', puntos: [a, b], cerrada: false, ancho: 3, y: ALTURA_DEL_BORDILLO + 0.02, alto: 0, color: '#6f6a5e', triangulos: Math.round(aLoLargo / RETICULA_DE_LA_CIUDAD) * 2 });
  }
  for (const lado of [-1, 1]) {
    const c = en(0, lado * (aLoAncho / 2 - 18));
    obra.bultos.push({ clase: 'anden', x: c.x, y: ALTURA_DEL_BORDILLO, z: c.z, giro: 0, ancho: largo === 0 ? aLoLargo - 8 : 6, alto: 0.6, fondo: largo === 0 ? 6 : aLoLargo - 8, color: '#c8c3b6', triangulos: 10 });
  }
  /* La marquesina: una losa sobre seis pilares, encima del andén de la ciudad. */
  const marquesina = en(0, aLoAncho / 2 - 18);
  obra.bultos.push({ clase: 'marquesina', x: marquesina.x, y: ALTURA_DEL_BORDILLO + 6, z: marquesina.z, giro: 0, ancho: largo === 0 ? aLoLargo / 2 : 8, alto: 0.6, fondo: largo === 0 ? 8 : aLoLargo / 2, color: '#9aa3ab', triangulos: 12 });
  for (let k = 0; k < 6; k++) {
    const p = en((k - 2.5) * (aLoLargo / 8), aLoAncho / 2 - 18);
    obra.bultos.push({ clase: 'pilar', x: p.x, y: ALTURA_DEL_BORDILLO + 0.6, z: p.z, giro: 0, ancho: 0.8, alto: 5.4, fondo: 0.8, color: '#9aa3ab', triangulos: 12 });
  }
  /* Y el edificio de viajeros, que sí es del pack: un `bloque-e` mirando a la ciudad. */
  const viajeros = en(-aLoLargo / 2 + 12, aLoAncho / 2 - 6);
  obra.volumenes.push({ pieza: PIEZA.bloqueE, x: viajeros.x, y: 0, z: viajeros.z, giro: giroMirandoA(largo === 0 ? 1 : 0), talla: 1 });
  if (calidad === 'plena') {
    for (let k = 0; k < Math.floor(aLoLargo / 24); k++) {
      const p = en(-aLoLargo / 2 + 12 + k * 24, aLoAncho / 2 - 20);
      obra.puestas.push({ pieza: PIEZA.bancoDeCalle, x: p.x, y: ALTURA_DEL_BORDILLO + 0.6, z: p.z, giro: radianesDeCuartos(largo === 0 ? 0 : 1), talla: 1 });
      const f = en(-aLoLargo / 2 + 18 + k * 24, aLoAncho / 2 - 16);
      obra.puestas.push({ pieza: PIEZA.farolDePie, x: f.x, y: ALTURA_DEL_BORDILLO + 0.6, z: f.z, giro: 0, talla: 1 });
    }
  }
  return obra;
}

/**
 * EL CANAL Y SUS MUELLES: 20 × 3 celdas a lo largo. Agua, dos cantiles y el paseo.
 *
 * Todo lo del muelle va ALINEADO CON EL CANTIL y a la misma distancia: barriles, cajas,
 * fardos y lingotes en pilas, y un `verja-poste` cada ocho haciendo de noray. Un muelle es
 * un sitio ordenado porque lo ordena la grúa, no el azar.
 */
function montarElCanal(caja: CajaEnPlanta, azar: () => number, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  const largo = ejeLargo(caja);
  const aLoLargo = largo === 0 ? caja.ancho : caja.fondo;
  const aLoAncho = largo === 0 ? caja.fondo : caja.ancho;
  const en = (a: number, b: number): Punto => (largo === 0 ? { x: caja.cx + a, z: caja.cz + b } : { x: caja.cx + b, z: caja.cz + a });
  obra.bultos.push({ clase: 'agua', x: caja.cx, y: ALTURA_DEL_BORDILLO - 0.9, z: caja.cz, giro: 0, ancho: largo === 0 ? aLoLargo : 18, alto: 0, fondo: largo === 0 ? 18 : aLoLargo, color: '#2f6f8f', triangulos: 2 });
  for (const lado of [-1, 1]) {
    const c = en(0, lado * 10.5);
    obra.bultos.push({ clase: 'cantil', x: c.x, y: ALTURA_DEL_BORDILLO - 0.9, z: c.z, giro: 0, ancho: largo === 0 ? aLoLargo : 3, alto: 1.5, fondo: largo === 0 ? 3 : aLoLargo, color: '#7d766a', triangulos: 10 });
    const paseo = en(0, lado * (aLoAncho / 2 - 3));
    obra.bultos.push({ clase: 'asfalto', x: paseo.x, y: ALTURA_DEL_BORDILLO, z: paseo.z, giro: 0, ancho: largo === 0 ? aLoLargo : 6, alto: 0, fondo: largo === 0 ? 6 : aLoLargo, color: '#8b8379', triangulos: 2 });
  }
  const carga = [PIEZA.barril, PIEZA.caja, PIEZA.fardo, PIEZA.barrilPequeno, PIEZA.cajaPequena, PIEZA.lingotes, PIEZA.sillares];
  /*
   * Las pilas caben ENTERAS en el muelle, y el −20 no es margen de cortesía: una pila son
   * tres bultos a 2,4 de paso, o sea 4,8 más allá de donde empieza, y con el reparto a pelo
   * la última se salía 0,80 del cantil y aterrizaba en el bulevar. Lo cazó el comprobador de
   * «nada plantado en mitad de la calzada», que para eso está.
   */
  const pilas = Math.max(0, Math.floor((aLoLargo - 20) / 12));
  for (let k = 0; k < pilas; k++) {
    const a = -aLoLargo / 2 + 8 + k * 12;
    if (k % 4 === 0) {
      const noray = en(a, 12.5);
      obra.puestas.push({ pieza: PIEZA.verjaPoste, x: noray.x, y: ALTURA_DEL_BORDILLO, z: noray.z, giro: 0, talla: 1 });
    }
    if (calidad === 'sobria' && k % 3 !== 0) continue;
    for (let m = 0; m < 3; m++) {
      const p = en(a + m * 2.4, 14.5 + (m % 2) * 2.4);
      obra.puestas.push({ pieza: carga[Math.floor(azar() * carga.length) % carga.length] as NombreDePieza, x: p.x, y: ALTURA_DEL_BORDILLO, z: p.z, giro: radianesDeCuartos(Math.floor(azar() * 4) % 4), talla: 1 });
    }
    if (calidad === 'plena' && k % 3 === 1) {
      const arbol = en(a, -14.5);
      obra.puestas.push({ pieza: PIEZA.arbusto, x: arbol.x, y: ALTURA_DEL_BORDILLO, z: arbol.z, giro: 0, talla: 1 });
    }
  }
  /* Tres puentes: una losa de 24 × 4 con dos pretiles, donde el canal cruza la ciudad. */
  for (let k = 0; k < 3; k++) {
    const p = en(-aLoLargo / 2 + (aLoLargo * (k + 1)) / 4, 0);
    obra.bultos.push({ clase: 'puente', x: p.x, y: ALTURA_DEL_BORDILLO, z: p.z, giro: largo === 0 ? radianesDeCuartos(1) : 0, ancho: 24, alto: 1.2, fondo: 8, color: '#a49a8a', triangulos: 12 });
  }
  return obra;
}

/** La feria: 6 × 6 celdas de tierra con ocho puestos iguales, y por eso se lee como una feria. */
function montarLaFeria(caja: CajaEnPlanta, azar: () => number, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  obra.bultos.push({ clase: 'tierra', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.cz, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo, color: '#8a7550', triangulos: 2 });
  const encimera = [PIEZA.cajaDeJamones, PIEZA.cuenco, PIEZA.garrafa, PIEZA.tarro];
  const filas = 2;
  const columnas = 4;
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      const x = caja.x0 + 12 + c * ((caja.ancho - 24) / (columnas - 1));
      const z = caja.z0 + 18 + f * (caja.fondo - 36);
      const mira: Rumbo = f === 0 ? 1 : 3;
      obra.puestas.push({ pieza: PIEZA.mesaLarga, x, y: ALTURA_DEL_BORDILLO, z, giro: giroMirandoA(mira), talla: 1 });
      for (const s of [-1, 1]) obra.puestas.push({ pieza: PIEZA.banqueta, x: x + s * 2.2, y: ALTURA_DEL_BORDILLO, z: z + (f === 0 ? -1.6 : 1.6), giro: giroMirandoA(mira), talla: 1 });
      obra.bultos.push({ clase: 'toldo', x, y: ALTURA_DEL_BORDILLO + 3.4, z, giro: 0, ancho: 5, alto: 0.3, fondo: 4, color: '#c05a4a', triangulos: 8 });
      if (calidad === 'plena') obra.puestas.push({ pieza: encimera[Math.floor(azar() * encimera.length) % encimera.length] as NombreDePieza, x, y: ALTURA_DEL_BORDILLO + 1, z, giro: 0, talla: 1 });
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      obra.puestas.push({ pieza: PIEZA.farolDePie, x: caja.cx + sx * (caja.ancho / 2 - 4), y: ALTURA_DEL_BORDILLO, z: caja.cz + sz * (caja.fondo / 2 - 4), giro: 0, talla: 1 });
      if (calidad === 'plena') obra.puestas.push({ pieza: PIEZA.pinoPequeno, x: caja.cx + sx * (caja.ancho / 2 - 9), y: ALTURA_DEL_BORDILLO, z: caja.cz + sz * (caja.fondo / 2 - 4), giro: 0, talla: 1 });
    }
  }
  return obra;
}

/** El hospital: 5 × 6 celdas. Un `bloque-g` en U alrededor del patio de acceso, y su aparcamiento. */
function montarElHospital(caja: CajaEnPlanta, haciaElCentro: Rumbo, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  obra.bultos.push({ clase: 'asfalto', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.cz, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo, color: '#6f6f6d', triangulos: 2 });
  const v = vectorDelRumbo(haciaElCentro);
  const lado = vectorDelRumbo(rumboALaDerecha(haciaElCentro));
  /* La U: el cuerpo al fondo y dos alas hacia la entrada, que es como está hecho un hospital. */
  const fondo = { x: caja.cx - v.x * (caja.ancho / 2 - 8), z: caja.cz - v.z * (caja.fondo / 2 - 8) };
  obra.volumenes.push({ pieza: PIEZA.bloqueG, x: fondo.x, y: 0, z: fondo.z, giro: giroMirandoA(haciaElCentro), talla: 1 });
  for (const s of [-1, 1]) {
    obra.volumenes.push({
      pieza: PIEZA.bloqueG,
      x: fondo.x + lado.x * s * 12 + v.x * 12,
      y: 0,
      z: fondo.z + lado.z * s * 12 + v.z * 12,
      giro: giroMirandoA(rumboALaDerecha(haciaElCentro)),
      talla: 1,
    });
  }
  /* El porche de la entrada: una losa sobre dos pilares, delante del cuerpo del fondo. */
  obra.bultos.push({ clase: 'porche', x: fondo.x + v.x * 7, y: ALTURA_DEL_BORDILLO + 4.5, z: fondo.z + v.z * 7, giro: giroMirandoA(haciaElCentro), ancho: 12, alto: 0.6, fondo: 6, color: '#d5d9dd', triangulos: 20 });
  /* Doce plazas pintadas en dos filas, la ambulancia en la primera y los bancos del jardín. */
  for (let k = 0; k < 12; k++) {
    const fila = k < 6 ? 0 : 1;
    const a = (k % 6) - 2.5;
    const p = { x: caja.cx + v.x * (caja.ancho / 2 - 6 - fila * 8) + lado.x * a * 3.2, z: caja.cz + v.z * (caja.fondo / 2 - 6 - fila * 8) + lado.z * a * 3.2 };
    obra.bultos.push({ clase: 'plaza-de-aparcamiento', x: p.x, y: ALTURA_DEL_BORDILLO + 0.02, z: p.z, giro: giroMirandoA(haciaElCentro), ancho: 3, alto: 0, fondo: 6, color: '#d9d4c8', triangulos: 2 });
    if (k === 0) obra.coches.push({ pieza: PIEZA.cocheFamiliar, x: p.x, y: ALTURA_DEL_BORDILLO + ALZADO_DEL_COCHE, z: p.z, giro: giroMirandoA(haciaElCentro), talla: 1 });
  }
  if (calidad === 'plena') {
    for (let k = 0; k < 4; k++) {
      const a = (k - 1.5) * 6;
      obra.puestas.push({ pieza: PIEZA.bancoDeParque, x: fondo.x + v.x * 14 + lado.x * a, y: ALTURA_DEL_BORDILLO, z: fondo.z + v.z * 14 + lado.z * a, giro: giroMirandoA(haciaElCentro), talla: 1 });
      obra.puestas.push({ pieza: k % 2 === 0 ? PIEZA.arbusto : PIEZA.pinoPequeno, x: fondo.x + v.x * 18 + lado.x * (a + 3), y: ALTURA_DEL_BORDILLO, z: fondo.z + v.z * 18 + lado.z * (a + 3), giro: 0, talla: 1 });
    }
  }
  return obra;
}

/** El colegio: 5 × 5 celdas. Un `bloque-a` en L, la pista pintada y la verja con su arco. */
function montarElColegio(caja: CajaEnPlanta, haciaElCentro: Rumbo, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  obra.bultos.push({ clase: 'tierra', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.cz, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo, color: '#9a9184', triangulos: 2 });
  const v = vectorDelRumbo(haciaElCentro);
  const lado = vectorDelRumbo(rumboALaDerecha(haciaElCentro));
  /* La L: dos brazos de aulas en las dos caras que dan la espalda a la calle. */
  for (let k = 0; k < 3; k++) {
    obra.volumenes.push({
      pieza: PIEZA.bloqueA,
      x: caja.cx - v.x * (caja.ancho / 2 - 6) + lado.x * (k - 1) * 12,
      y: 0,
      z: caja.cz - v.z * (caja.fondo / 2 - 6) + lado.z * (k - 1) * 12,
      giro: giroMirandoA(haciaElCentro),
      talla: 1,
    });
  }
  for (let k = 0; k < 2; k++) {
    obra.volumenes.push({
      pieza: PIEZA.bloqueA,
      x: caja.cx - v.x * (caja.ancho / 2 - 6 - (k + 1) * 12) - lado.x * (caja.ancho / 2 - 6),
      y: 0,
      z: caja.cz - v.z * (caja.fondo / 2 - 6 - (k + 1) * 12) - lado.z * (caja.fondo / 2 - 6),
      giro: giroMirandoA(rumboALaDerecha(haciaElCentro)),
      talla: 1,
    });
  }
  obra.bultos.push({ clase: 'pista-de-colegio', x: caja.cx + v.x * 8, y: ALTURA_DEL_BORDILLO + 0.02, z: caja.cz + v.z * 8, giro: 0, ancho: 24, alto: 0, fondo: 16, color: '#5f7a8a', triangulos: 2 });
  /* La verja del patio, con el arco en el lado que da a la calle. */
  const largo = haciaElCentro % 2 === 0 ? caja.fondo : caja.ancho;
  const tramos = Math.round(largo / TRAMO_DE_VERJA);
  for (let k = 0; k < tramos; k++) {
    const a = -largo / 2 + (k + 0.5) * TRAMO_DE_VERJA;
    const enElMedio = Math.abs(a) < TRAMO_DE_VERJA / 2;
    const x = caja.cx + v.x * (caja.ancho / 2 - 0.5) + (haciaElCentro % 2 === 0 ? 0 : a);
    const z = caja.cz + v.z * (caja.fondo / 2 - 0.5) + (haciaElCentro % 2 === 0 ? a : 0);
    const giro = radianesDeCuartos(cuartosMirandoA(haciaElCentro) + 1);
    if (enElMedio) {
      obra.puestas.push({ pieza: PIEZA.arcoDeVerja, x, y: ALTURA_DEL_BORDILLO, z, giro, talla: 1 });
      continue;
    }
    if (calidad === 'sobria' && k % 2 === 1) continue;
    obra.puestas.push({ pieza: PIEZA.verja, x, y: ALTURA_DEL_BORDILLO, z, giro, talla: 1 });
  }
  if (calidad === 'plena') {
    for (let k = 0; k < 4; k++) {
      obra.puestas.push({ pieza: PIEZA.pino, x: caja.cx + lado.x * (k - 1.5) * 8 + v.x * 20, y: ALTURA_DEL_BORDILLO, z: caja.cz + lado.z * (k - 1.5) * 8 + v.z * 20, giro: 0, talla: 1 });
      obra.puestas.push({ pieza: PIEZA.bancoDeParque, x: caja.cx + lado.x * (k - 1.5) * 8 + v.x * 16, y: ALTURA_DEL_BORDILLO, z: caja.cz + lado.z * (k - 1.5) * 8 + v.z * 16, giro: giroMirandoA(rumboContrario(haciaElCentro)), talla: 1 });
    }
  }
  return obra;
}

/** La gasolinera: 2 × 3 celdas. Marquesina, cuatro surtidores en fila, tienda y dos coches. */
function montarLaGasolinera(caja: CajaEnPlanta, haciaElCentro: Rumbo): ObraDeDistrito {
  const obra = vacia();
  obra.bultos.push({ clase: 'asfalto', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.cz, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo, color: '#57585c', triangulos: 2 });
  const v = vectorDelRumbo(haciaElCentro);
  const lado = vectorDelRumbo(rumboALaDerecha(haciaElCentro));
  const isla = { x: caja.cx + v.x * 4, z: caja.cz + v.z * 4 };
  obra.bultos.push({ clase: 'marquesina', x: isla.x, y: ALTURA_DEL_BORDILLO + 5.4, z: isla.z, giro: 0, ancho: 18, alto: 0.6, fondo: 12, color: '#e0e3e6', triangulos: 12 });
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      const p = { x: isla.x + lado.x * s * 8 + v.x * t * 5, z: isla.z + lado.z * s * 8 + v.z * t * 5 };
      obra.bultos.push({ clase: 'pilar', x: p.x, y: ALTURA_DEL_BORDILLO, z: p.z, giro: 0, ancho: 0.8, alto: 5.4, fondo: 0.8, color: '#e0e3e6', triangulos: 12 });
    }
  }
  for (let k = 0; k < 4; k++) {
    const a = (k - 1.5) * 4;
    obra.bultos.push({ clase: 'surtidor', x: isla.x + lado.x * a, y: ALTURA_DEL_BORDILLO, z: isla.z + lado.z * a, giro: giroMirandoA(haciaElCentro), ancho: 1.2, alto: 2.4, fondo: 0.8, color: '#c8412f', triangulos: 8 });
  }
  obra.volumenes.push({ pieza: PIEZA.bloqueA, x: caja.cx - v.x * (caja.ancho / 2 - 6), y: 0, z: caja.cz - v.z * (caja.fondo / 2 - 6), giro: giroMirandoA(haciaElCentro), talla: 1 });
  for (const s of [-1, 1]) {
    obra.coches.push({
      pieza: s > 0 ? PIEZA.cocheBerlina : PIEZA.cocheUtilitario,
      x: isla.x + lado.x * s * 3 + v.x * 4,
      y: ALTURA_DEL_BORDILLO + ALZADO_DEL_COCHE,
      z: isla.z + lado.z * s * 3 + v.z * 4,
      giro: giroMirandoA(haciaElCentro),
      talla: 1,
    });
  }
  obra.puestas.push({ pieza: PIEZA.papelera, x: caja.cx - v.x * (caja.ancho / 2 - 10), y: ALTURA_DEL_BORDILLO, z: caja.cz - v.z * (caja.fondo / 2 - 10), giro: 0, talla: 1 });
  return obra;
}

/**
 * LA OBRA: 3 × 4 celdas. Cuatro forjados sobre pilares, sin cerrar, y su grúa.
 *
 * Es el distrito más barato de la ciudad y a propósito: un forjado son 2 triángulos, un pilar
 * 12, y la valla se hace con `caja-de-obra` (20) y `caja-de-obra-grande` (32), que son las
 * dos piezas más baratas del catálogo entero. Una obra tiene que verse desordenada y estar
 * ordenada: las cajas van en el perímetro, los pilares en retícula y la grúa a un lado.
 */
function montarLaObra(caja: CajaEnPlanta, azar: () => number, calidad: Calidad): ObraDeDistrito {
  const obra = vacia();
  obra.bultos.push({ clase: 'tierra', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.cz, giro: 0, ancho: caja.ancho, alto: 0, fondo: caja.fondo, color: '#8a7f6b', triangulos: 2 });
  const PLANTAS_DE_LA_OBRA = 4;
  for (let p = 0; p < PLANTAS_DE_LA_OBRA; p++) {
    obra.bultos.push({ clase: 'forjado', x: caja.cx, y: ALTURA_DEL_BORDILLO + p * ALTURA_DE_PLANTA, z: caja.cz, giro: 0, ancho: caja.ancho - 12, alto: 0.5, fondo: caja.fondo - 12, color: '#b7b1a4', triangulos: 2 });
    for (const sx of [-1, 0, 1]) {
      for (const sz of [-1, 1]) {
        obra.bultos.push({
          clase: 'pilar',
          x: caja.cx + sx * ((caja.ancho - 14) / 2),
          y: ALTURA_DEL_BORDILLO + p * ALTURA_DE_PLANTA,
          z: caja.cz + sz * ((caja.fondo - 14) / 2),
          giro: 0,
          ancho: 0.9,
          alto: ALTURA_DE_PLANTA,
          fondo: 0.9,
          color: '#a9a396',
          triangulos: 12,
        });
      }
    }
  }
  /* La grúa: la `torre-de-agua` hace de torre y el brazo es propio, dos triángulos. */
  const grua = { x: caja.x0 + 4, z: caja.cz };
  obra.puestas.push({ pieza: PIEZA.torreDeAgua, x: grua.x, y: ALTURA_DEL_BORDILLO + 12, z: grua.z, giro: 0, talla: 1 });
  obra.bultos.push({ clase: 'brazo-de-grua', x: grua.x + 12, y: ALTURA_DEL_BORDILLO + 18, z: grua.z, giro: 0, ancho: 24, alto: 0.6, fondo: 0.6, color: '#d8b23a', triangulos: 12 });
  const menudo = [PIEZA.cajaDeObra, PIEZA.cajaDeObra, PIEZA.cajaDeObraGrande, PIEZA.tablones, PIEZA.sillares, PIEZA.cajaDeObra];
  const cuantas = calidad === 'plena' ? 22 : 8;
  for (let k = 0; k < cuantas; k++) {
    const s = k / cuantas;
    const vuelta = s * 2 * (caja.ancho + caja.fondo - 8);
    let x = caja.x0 + 2;
    let z = caja.z0 + 2;
    if (vuelta < caja.ancho - 4) x = caja.x0 + 2 + vuelta;
    else if (vuelta < caja.ancho - 4 + caja.fondo - 4) {
      x = caja.x1 - 2;
      z = caja.z0 + 2 + (vuelta - (caja.ancho - 4));
    } else if (vuelta < 2 * (caja.ancho - 4) + caja.fondo - 4) {
      x = caja.x1 - 2 - (vuelta - (caja.ancho - 4) - (caja.fondo - 4));
      z = caja.z1 - 2;
    } else {
      z = caja.z1 - 2 - (vuelta - 2 * (caja.ancho - 4) - (caja.fondo - 4));
    }
    obra.puestas.push({
      pieza: menudo[Math.floor(azar() * menudo.length) % menudo.length] as NombreDePieza,
      x: Math.max(caja.x0 + 1, Math.min(caja.x1 - 1, x)),
      y: ALTURA_DEL_BORDILLO,
      z: Math.max(caja.z0 + 1, Math.min(caja.z1 - 1, z)),
      giro: radianesDeCuartos(Math.floor(azar() * 4) % 4),
      talla: 1,
    });
  }
  obra.puestas.push({ pieza: PIEZA.contenedor, x: caja.x1 - 4, y: ALTURA_DEL_BORDILLO, z: caja.z0 + 4, giro: 0, talla: 1 });
  return obra;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 12. LOS COCHES
 * ══════════════════════════════════════════════════════════════════════════ */

/** Lo que hay que subir un coche para que las ruedas toquen el asfalto: medido, −0,366 el mínimo de su caja. */
export const ALZADO_DEL_COCHE = 0.366;
/** El radio de rueda medido sobre `coche-berlina`: media altura de la rueda, para girarla con `s / radio`. */
export const RADIO_DE_RUEDA = 0.42;
/**
 * CUÁNTOS COCHES APARCADOS, Y POR QUÉ ES EL ÚNICO SITIO DONDE UNA REGLA SE RECORTA.
 *
 * La regla de `LA-CIUDAD.md` §7 es «uno cada dos celdas en el bordillo derecho de toda calle
 * que tenga parcela enfrente». Sobre 54 × 54 eso da varios cientos, y a 1.222 triángulos cada
 * uno son más que toda la ciudad junta. El tope es duro y va por nivel de detalle: sólo se
 * montan los de las manzanas en L1, y como mucho 56 en plena y 8 en sobria. Se dice aquí,
 * con su motivo, para que nadie lo busque como un fallo.
 */
export const COCHES_APARCADOS = { plena: 56, sobria: 8 } as const;
export const COCHES_DE_CARRERA = 6;
/** Lo que tarda un coche en frenar y en arrancar, y los metros que le cuesta. */
export const FRENADA = { largo: 12, tiempo: 2 } as const;

/** El avance acumulado de una polilínea, y su largo. */
function avancesDe(puntos: readonly Punto[], cerrada: boolean): { readonly avances: number[]; readonly largo: number } {
  const avances: number[] = [0];
  for (let k = 1; k < puntos.length; k++) {
    const a = puntos[k - 1] as Punto;
    const b = puntos[k] as Punto;
    avances.push((avances[k - 1] as number) + Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.z - a.z) * (b.z - a.z)));
  }
  let largo = avances[avances.length - 1] as number;
  if (cerrada) {
    const a = puntos[puntos.length - 1] as Punto;
    const b = puntos[0] as Punto;
    largo += Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.z - a.z) * (b.z - a.z));
  }
  return { avances, largo };
}

/** El punto y el rumbo de una ruta en el avance `s`. Es lo único que la escena llama por fotograma. */
export function puntoDeLaRuta(ruta: RutaDeCoche, s: number): { readonly x: number; readonly z: number; readonly giro: number } {
  const n = ruta.puntos.length;
  const t = ((s % ruta.largo) + ruta.largo) % ruta.largo;
  let k = 0;
  while (k + 1 < n && (ruta.avances[k + 1] as number) <= t) k++;
  const a = ruta.puntos[k] as Punto;
  const b = ruta.puntos[(k + 1) % n] as Punto;
  const desde = ruta.avances[k] as number;
  const hasta = k + 1 < n ? (ruta.avances[k + 1] as number) : ruta.largo;
  const f = hasta > desde ? (t - desde) / (hasta - desde) : 0;
  const x = a.x + (b.x - a.x) * f;
  const z = a.z + (b.z - a.z) * f;
  return { x, z, giro: Math.atan2(b.x - a.x, b.z - a.z) };
}

/** El avance de un coche en el instante `t`: se interpola su horario, que es dato y no se integra. */
export function avanceDeLaRuta(ruta: RutaDeCoche, t: number): number {
  const h = ruta.horario;
  if (h.length < 2) return ((ruta.velocidad * t) % ruta.largo + ruta.largo) % ruta.largo;
  const vueltas = Math.floor(t / ruta.periodo);
  const dentro = t - vueltas * ruta.periodo;
  let k = 0;
  while (k + 1 < h.length && (h[k + 1] as { t: number }).t <= dentro) k++;
  const a = h[k] as { t: number; s: number };
  const b = (h[Math.min(k + 1, h.length - 1)] as { t: number; s: number }) ?? a;
  const f = b.t > a.t ? (dentro - a.t) / (b.t - a.t) : 0;
  const s = a.s + (b.s - a.s) * f + ruta.fase;
  return ((s % ruta.largo) + ruta.largo) % ruta.largo;
}

/** Dónde está y cómo va girado un coche en el instante `t`, y cuánto han rodado sus ruedas. */
export function cocheEnElInstante(ruta: RutaDeCoche, t: number): { readonly x: number; readonly y: number; readonly z: number; readonly giro: number; readonly rueda: number } {
  const s = avanceDeLaRuta(ruta, t);
  const p = puntoDeLaRuta(ruta, s);
  return { x: p.x, y: ruta.y, z: p.z, giro: p.giro, rueda: s / ruta.radioDeRueda };
}

/** El anillo de celdas del borde de un rectángulo, en el sentido de las agujas mirando desde arriba. */
export function anilloDeCeldas(i0: number, j0: number, i1: number, j1: number, horario: boolean): { readonly i: number; readonly j: number }[] {
  const celdas: { i: number; j: number }[] = [];
  for (let i = i0; i <= i1; i++) celdas.push({ i, j: j0 });
  for (let j = j0 + 1; j <= j1; j++) celdas.push({ i: i1, j });
  for (let i = i1 - 1; i >= i0; i--) celdas.push({ i, j: j1 });
  for (let j = j1 - 1; j > j0; j--) celdas.push({ i: i0, j });
  return horario ? celdas : celdas.slice().reverse();
}

/**
 * UNA RUTA POR EL EJE DE SU CARRIL, con su horario ya simulado.
 *
 * El punto de cada celda es su centro desplazado 2,70 a la DERECHA de la marcha; y en una
 * celda donde se gira, el punto es donde se cortan los dos ejes de carril —la suma de los
 * dos desplazamientos—, que es exactamente por donde pasa un coche que gira. De ahí sale
 * sola la circulación por la derecha y, con ella, que la ruta horaria y la antihoraria de
 * un mismo rectángulo NUNCA compartan un punto: van por carriles distintos, a 5,40 la una
 * de la otra, y no pueden chocar por construcción.
 */
function rutaPorCeldas(
  recinto: RecintoDeLaCiudad,
  celdas: readonly { readonly i: number; readonly j: number }[],
  pieza: NombreDePieza,
  velocidad: number,
  semaforos: readonly SemaforoDeLaCiudad[],
): RutaDeCoche {
  const n = celdas.length;
  const puntos: Punto[] = [];
  const enCelda: { readonly eje: 0 | 1; readonly cruce: number }[] = [];
  for (let k = 0; k < n; k++) {
    const c = celdas[k] as { i: number; j: number };
    const anterior = celdas[(k - 1 + n) % n] as { i: number; j: number };
    const siguiente = celdas[(k + 1) % n] as { i: number; j: number };
    const entra = rumboDe(anterior, c);
    const sale = rumboDe(c, siguiente);
    const dEntra = vectorDelRumbo(rumboALaDerecha(entra));
    const dSale = vectorDelRumbo(rumboALaDerecha(sale));
    const centro = centroDeCelda(recinto, c.i, c.j);
    const dx = entra === sale ? dEntra.x * EJE_DEL_CARRIL : dEntra.x * EJE_DEL_CARRIL + dSale.x * EJE_DEL_CARRIL;
    const dz = entra === sale ? dEntra.z * EJE_DEL_CARRIL : dEntra.z * EJE_DEL_CARRIL + dSale.z * EJE_DEL_CARRIL;
    puntos.push({ x: centro.x + dx, z: centro.z + dz });
    const sem = semaforos.findIndex((s) => s.i === c.i && s.j === c.j);
    enCelda.push({ eje: (entra % 2 === 0 ? 0 : 1) as 0 | 1, cruce: sem });
  }
  const { avances, largo } = avancesDe(puntos, true);
  const paradas: { s: number; cruce: number; eje: 0 | 1 }[] = [];
  for (let k = 0; k < n; k++) {
    const e = enCelda[k] as { eje: 0 | 1; cruce: number };
    if (e.cruce < 0) continue;
    const s = (avances[k] as number) - RETICULA_DE_LA_CIUDAD / 2 - ANCHO_DEL_BORDILLO;
    if (s <= 0) continue;
    paradas.push({ s, cruce: e.cruce, eje: e.eje });
  }
  paradas.sort((a, b) => a.s - b.s);
  const { horario, periodo } = simularUnaVuelta(paradas, largo, velocidad, semaforos);
  return { pieza, clase: 'calle', puntos, avances, largo, velocidad, y: ALTURA_DEL_ASFALTO + ALZADO_DEL_COCHE, paradas, horario, periodo, fase: 0, radioDeRueda: RADIO_DE_RUEDA };
}

function rumboDe(a: { readonly i: number; readonly j: number }, b: { readonly i: number; readonly j: number }): Rumbo {
  if (b.i > a.i) return 0;
  if (b.i < a.i) return 2;
  return b.j > a.j ? 1 : 3;
}

/**
 * SIMULAR UNA VUELTA, que es lo que convierte «parar en el semáforo» en un dato.
 *
 * Se recorre la vuelta parada a parada: si al llegar la línea está en verde, se pasa de
 * largo; si no, se frena en los últimos 12 —dos segundos—, se espera al verde siguiente y
 * se arranca en otros 12. Al final se redondea el periodo al ciclo de 12 s del semáforo
 * alargando la ÚLTIMA espera —un coche que se queda un poco más en un rojo no llama la
 * atención; uno que se para en mitad de una recta, sí— y así la vuelta siguiente encuentra
 * los semáforos en la misma fase y el horario vale para siempre.
 */
function simularUnaVuelta(
  paradas: readonly { readonly s: number; readonly cruce: number; readonly eje: 0 | 1 }[],
  largo: number,
  velocidad: number,
  semaforos: readonly SemaforoDeLaCiudad[],
): { readonly horario: { readonly t: number; readonly s: number }[]; readonly periodo: number } {
  const h: { t: number; s: number }[] = [{ t: 0, s: 0 }];
  let t = 0;
  let s = 0;
  let ultimoParon = -1;
  for (const p of paradas) {
    const sFrenada = p.s - FRENADA.largo;
    if (sFrenada <= s + 0.001) continue;
    t += (sFrenada - s) / velocidad;
    s = sFrenada;
    h.push({ t, s });
    const sem = semaforos[p.cruce];
    const llegadaLibre = t + FRENADA.largo / velocidad;
    if (sem === undefined || (hayVerde(sem, p.eje, llegadaLibre) && hayVerde(sem, p.eje, llegadaLibre + 0.6))) continue;
    t += FRENADA.tiempo;
    s = p.s;
    h.push({ t, s });
    /*
     * Frenar cuesta el doble que pasar de largo, así que puede haberse puesto verde MIENTRAS
     * frenaba. Si al llegar a la línea ya está en verde, no se espera: parar en verde es lo
     * que la primera versión hacía, y lo caza `verify:la-ciudad`.
     */
    if (!hayVerde(sem, p.eje, t)) {
      const verde = proximoVerde(sem, p.eje, t);
      if (verde > t) {
        t = verde;
        h.push({ t, s });
        ultimoParon = h.length - 1;
      }
    }
    t += FRENADA.tiempo;
    s = Math.min(largo, p.s + FRENADA.largo);
    h.push({ t, s });
  }
  t += (largo - s) / velocidad;
  h.push({ t, s: largo });
  let periodo = t;
  if (ultimoParon >= 0) {
    periodo = Math.ceil(t / CICLO_DEL_SEMAFORO) * CICLO_DEL_SEMAFORO;
    if (periodo <= t + 0.001) periodo = t + CICLO_DEL_SEMAFORO;
    const espera = periodo - t;
    for (let k = ultimoParon + 1; k < h.length; k++) (h[k] as { t: number }).t += espera;
  }
  return { horario: h, periodo };
}

/**
 * LOS COCHES APARCADOS: uno cada dos celdas en el bordillo derecho de toda calle que tenga
 * parcela enfrente, en línea, a 4,20 del eje de la calzada. Y nunca sobre un paso de cebra
 * ni en un cruce: por eso sólo se mira `calzada`, que es la recta sin marcas.
 */
export const EJE_DEL_APARCAMIENTO = 4.2;

function cochesAparcados(recinto: RecintoDeLaCiudad, t: Trazado, losas: readonly LosaDeCalle[], azar: () => number, calidad: Calidad): PuestaEnLaCiudad[] {
  const idx = (i: number, j: number): number => j * t.n + i;
  const candidatos: PuestaEnLaCiudad[] = [];
  const modelos = [PIEZA.cocheBerlina, PIEZA.cocheUtilitario, PIEZA.cocheFamiliar];
  for (const losa of losas) {
    if (losa.pieza !== PIEZA.calzada) continue;
    if ((losa.i + losa.j) % 2 !== 0) continue;
    const eje = ejeDeLaLosa(losa);
    const lados: Rumbo[] = eje === 1 ? [0, 2] : [1, 3];
    for (const lado of lados) {
      const p = PASO_DEL_RUMBO[lado] as { di: number; dj: number };
      const vecina = t.clase[idx(losa.i + p.di, losa.j + p.dj)] as ClaseDeCelda | undefined;
      if (vecina === undefined || esClaseDeCalle(vecina) || vecina === 'reserva' || vecina === 'isleta') continue;
      const centro = centroDeCelda(recinto, losa.i, losa.j);
      const v = vectorDelRumbo(lado);
      const enElCentro = t.clase[idx(losa.i, losa.j)] === 'avenida' || t.clase[idx(losa.i, losa.j)] === 'bulevar';
      const pieza = enElCentro && azar() < 0.25 ? PIEZA.cocheTaxi : (modelos[Math.floor(azar() * 3) % 3] as NombreDePieza);
      candidatos.push({
        pieza,
        x: centro.x + v.x * EJE_DEL_APARCAMIENTO,
        y: ALTURA_DEL_ASFALTO + ALZADO_DEL_COCHE,
        z: centro.z + v.z * EJE_DEL_APARCAMIENTO,
        giro: giroMirandoA(eje === 1 ? 1 : 0),
        talla: 1,
      });
      break;
    }
  }
  /* El tope es duro: a 1.222 triángulos cada uno, cien coches serían más que todos los bloques juntos. */
  const tope = calidad === 'plena' ? COCHES_APARCADOS.plena : COCHES_APARCADOS.sobria;
  if (candidatos.length <= tope) return candidatos;
  const paso = candidatos.length / tope;
  const elegidos: PuestaEnLaCiudad[] = [];
  for (let k = 0; k < tope; k++) elegidos.push(candidatos[Math.floor(k * paso)] as PuestaEnLaCiudad);
  return elegidos;
}

/** Una ruta sin semáforos —la del circuito—: velocidad constante y la fase que se le dé. */
function rutaLibre(puntos: readonly Punto[], pieza: NombreDePieza, velocidad: number, fase: number, y: number): RutaDeCoche {
  const { avances, largo } = avancesDe(puntos, true);
  return {
    pieza,
    clase: 'circuito',
    puntos,
    avances,
    largo,
    velocidad,
    y,
    paradas: [],
    horario: [
      { t: 0, s: 0 },
      { t: largo / velocidad, s: largo },
    ],
    periodo: largo / velocidad,
    fase,
    radioDeRueda: RADIO_DE_RUEDA,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 13. EL PRESUPUESTO DE LA CIUDAD
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * LO QUE LA CIUDAD PUEDE TENER MONTADO A LA VEZ, que ya no es lo mismo que lo que la ciudad
 * pesa.
 *
 * `LA-CIUDAD.md` §8 declara `TOPE_PLENA = 900.000` y `TOPE_SOBRIA = 230.000` para el tablero
 * ENTERO, y mide el tablero solo en 207.877 y 145.523. Lo que le queda a la ciudad es
 * 692.123 en un PC y 84.477 en un móvil, y ÉSE es el tope de aquí.
 *
 * Pero es el tope de LO QUE ESTÁ MONTADO, no de lo que existe. La ciudad entera en L1 pesa
 * varios millones y no cabrá nunca: lo que se monta es un disco de L1 alrededor de la cámara,
 * un anillo de L2 y el resto en L3, y eso es lo que mide `montarLaCiudad` y lo que
 * `verify:la-ciudad` comprueba desde ocho poses distintas. Sumar la ciudad entera y compararla
 * con un tope sería medir una cosa que nunca ocurre.
 */
export const TOPE_DE_LA_CIUDAD = { plena: 692_000, sobria: 84_000 } as const;

/**
 * LOS UMBRALES DE NIVEL, QUE NO CRECEN CON EL TABLERO.
 *
 * No salen del tamaño de la ciudad: salen de píxeles por unidad a una distancia. Un objeto de
 * `s` unidades a `d` de la cámara mide `1.304 · s/d` píxeles en un PC de 1.080 con 45° de
 * campo, y eso no cambia porque la ciudad sea más grande.
 *
 * · L1 a 156 y no a 180 sale del presupuesto HACIA ATRÁS: un disco de radio 156 son
 *   π · 156² / 144 = 531 celdas, y a unos 700 triángulos de media son 372.000. Con 180 serían
 *   707 celdas y 495.000, y no quedaría sitio para el L2 ni para los interiores.
 * · L2 A 1.500, Y AQUÍ EL PLANO ESTABA MAL. Decía 420 «porque desde cualquier punto de DENTRO
 *   de la ciudad, 420 alcanza el borde más lejano». Cierto, y por eso no valía: la pose que el
 *   jugador ve SIEMPRE —la de salida, el arcade recién abierto— no está dentro de la ciudad,
 *   está a 1.010 del centro, y con 420 la ciudad entera caía a L3. Lo que se veía era una
 *   mancha de prismas de diez triángulos sobre asfalto: cuarenta y cinco mil triángulos de un
 *   presupuesto de 692.000. Se vio mirando, y al medirlo salió que la ciudad ENTERA en L2 pesa
 *   157.095 triángulos en un PC y 36.762 en un móvil (las cinco semillas del banco): cabe con
 *   holgura desde cualquier pose. El umbral se pone en 1.500, que cubre la pose de salida más
 *   el rincón más lejano del recinto (1.010 + 458 en diagonal = 1.373) con margen. El L3
 *   sigue vivo —con `masLejos` (1,25) el ojo se va a 1.261 del centro y el rincón queda a
 *   1.719— pero deja de comerse la vista de siempre.
 * · La HISTÉRESIS de 40: se sube de nivel a `d` y se baja a `d + 40`. Sin ella, una cámara
 *   parada justo en el umbral parpadea entre dos montajes.
 *
 * En el móvil el disco de L1 es 60, el del plano, y con él cabe: lo que hacía que no cupiera
 * no era el umbral, era medir la distancia al borde del grupo en vez de a su centro
 * (`nivelDelGrupo`). El L2 sube a 1.500 por la misma razón que en el PC y con la misma cuenta
 * delante: 36.762 de los 84.000 que hay.
 */
export const UMBRALES_DE_NIVEL = { plena: { alto: 156, medio: 1_500 }, sobria: { alto: 60, medio: 1_500 } } as const;
export const HISTERESIS_DEL_NIVEL = 40;

/**
 * EL NIVEL QUE LE TOCA A UN GRUPO: 0 = L1, 1 = L2, 2 = L3.
 *
 * `anterior` es el nivel que el grupo tenía; con él se aplica la histéresis, y sin él se
 * juzga en frío (que es lo que hace el comprobador para que su medida no dependa de por dónde
 * haya venido la cámara).
 *
 * LA DISTANCIA ES AL CENTRO DEL GRUPO, y esto costó una tarde. La primera versión medía al
 * centro MENOS EL RADIO —«una manzana de siete celdas mide 84 y juzgarla por su centro la
 * mandaría lejos estando encima»—, y el efecto medido fue el contrario del que se buscaba:
 * una manzana de radio 49 entraba en L1 desde 109 unidades, cuatro manzanas gordas entraban a
 * la vez y el montaje del móvil se iba a 97.000 triángulos con 84.477 de tope. Al centro, que
 * es lo que dice el plano: quien está DENTRO de una manzana la tiene a menos de su radio, y
 * un radio de manzana nunca llega al umbral.
 */
export function nivelDelGrupo(g: GrupoDeLaCiudad, x: number, z: number, calidad: Calidad, anterior?: number): number {
  const u = calidad === 'plena' ? UMBRALES_DE_NIVEL.plena : UMBRALES_DE_NIVEL.sobria;
  const dx = g.centro.x - x;
  const dz = g.centro.z - z;
  const d = Math.sqrt(dx * dx + dz * dz);
  const margen = (nivel: number): number => (anterior !== undefined && anterior <= nivel ? HISTERESIS_DEL_NIVEL : 0);
  if (d <= u.alto + margen(0)) return 0;
  if (d <= u.medio + margen(1)) return 1;
  return 2;
}

/**
 * QUÉ TIENE MONTADO UNA CÁMARA, Y CUÁNTO PESA.
 *
 * Esto es lo que la escena llama cuando la cámara se mueve —no por fotograma: cuando cambia
 * de celda—, y lo que el comprobador llama para juzgar el presupuesto. Devuelve el nivel de
 * cada grupo y la suma, repartida por nivel para saber quién se come el presupuesto.
 */
export function montarLaCiudad(ciudad: LaCiudad, x: number, z: number, anteriores?: readonly number[]): MontajeDeLaCiudad {
  const nivelDelGrupoDeLaCiudad: number[] = [];
  const porNivel = [0, 0, 0];
  const gruposPorNivel = [0, 0, 0];
  let triangulos = 0;
  for (const g of ciudad.grupos) {
    const nivel = nivelDelGrupo(g, x, z, ciudad.calidad, anteriores?.[g.indice]);
    nivelDelGrupoDeLaCiudad.push(nivel);
    const cuanto = (g.niveles[nivel] as NivelDeDetalle).triangulos;
    triangulos += cuanto;
    porNivel[nivel] = (porNivel[nivel] as number) + cuanto;
    gruposPorNivel[nivel] = (gruposPorNivel[nivel] as number) + 1;
  }
  return { nivelDelGrupo: nivelDelGrupoDeLaCiudad, triangulos, porNivel, gruposPorNivel };
}

function sumaDePuestas(puestas: readonly PuestaEnLaCiudad[]): number {
  let total = 0;
  for (const p of puestas) total += triangulosDe(p.pieza);
  return total;
}
function sumaDeBultos(bultos: readonly BultoPropio[]): number {
  let total = 0;
  for (const b of bultos) total += b.triangulos;
  return total;
}
function sumaDeCintas(cintas: readonly CintaPropia[]): number {
  let total = 0;
  for (const c of cintas) total += c.triangulos;
  return total;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 14. GENERAR LA CIUDAD
 * ══════════════════════════════════════════════════════════════════════════ */

/** Cuántos interiores trae montados la ciudad: los mismos tres que cuenta el presupuesto. */
export const INTERIORES_DE_MUESTRA = 3;

/**
 * LA CIUDAD ENTERA, de una semilla y un recinto.
 *
 * La semilla es `semillaDelCodigo(codigo)`: la misma mesa da la misma ciudad en los seis
 * aparatos. Todo lo que se sortea sale de ese único `azar`, y en el mismo orden, que es lo
 * que hace que un cambio en cualquier paso no revuelva los siguientes por accidente: si
 * alguien mete un sorteo en medio, la ciudad cambia entera y se ve.
 */
export function generarLaCiudad(semilla: number, recinto: RecintoDeLaCiudad = RECINTO_DEL_BURGO, calidad: Calidad = 'plena'): LaCiudad {
  const azar = sorteo(semilla >>> 0);
  const t = trazarLaReticula(recinto, azar);
  const losas = losasDeCalle(t);
  /*
   * LAS LOSAS DEL PACK SE PONEN SIEMPRE, EN LAS DOS CALIDADES, y quien decide si se montan es
   * el NIVEL DE DETALLE y no la calidad. Antes, en sobria se cambiaban por una manta de
   * asfalto aquí mismo; ahora la manta es el L3 de cada tesela de calle y la sirve el mismo
   * mecanismo que sirve todo lo demás. La calidad sigue mandando en la DENSIDAD —cuántas
   * farolas, cuántos semáforos, cuántos árboles, cuántos coches— y en los umbrales de nivel,
   * que en un móvil son 60 y 170 en vez de 156 y 420.
   */
  const calzada: PuestaEnLaCiudad[] = [];
  for (const l of losas) {
    const c = centroDeCelda(recinto, l.i, l.j);
    calzada.push({ pieza: l.pieza, x: c.x, y: 0, z: c.z, giro: radianesDeCuartos(l.cuartos), talla: 1 });
  }

  const edificado = levantarLosEdificios(recinto, t, azar);
  for (const s of edificado.soleras) calzada.push(s);

  const { semaforos, puestas: puestasDeSemaforo } = semaforosDeLaCiudad(recinto, t, losas, calidad);
  const mobiliario: PuestaEnLaCiudad[] = [...puestasDeSemaforo, ...mobiliarioDeLaCalle(recinto, t, losas, calidad)];

  /*
   * ── Los detalles que cuelgan de cada portal: nada al azar, todo junto a su puerta ──
   *
   * En sobria no va ninguno. No es que estorben: es que el móvil pinta la ciudad entera en
   * prismas (§8) y una papelera de 18 triángulos junto a un prisma de 20 no es un detalle,
   * es una mancha. Lo que se quita aquí son 90.000 triángulos y doce llamadas de dibujo.
   */
  const conDetalles = calidad === 'plena';
  const manzanasConContenedor = new Set<number>();
  const idx = (i: number, j: number): number => j * t.n + i;
  for (const e of conDetalles ? edificado.edificios : []) {
    if (e.retranqueo <= 0) continue;
    const primera = e.celdas[0] as { i: number; j: number };
    const v = vectorDelRumbo(e.frente);
    const lado = vectorDelRumbo(rumboALaDerecha(e.frente));
    /* En la mitad del retranqueo: ni pegado a la fachada ni asomando a la calzada. */
    const acera = { x: e.portal.x - v.x * (e.retranqueo / 2), z: e.portal.z - v.z * (e.retranqueo / 2) };
    const aLoLargo = (m: number): number => RETICULA_DE_LA_CIUDAD / 2 - m / 2 - 0.2;
    mobiliario.push({ pieza: PIEZA.papelera, x: acera.x + lado.x * aLoLargo(0.8), y: ALTURA_DEL_BORDILLO, z: acera.z + lado.z * aLoLargo(0.8), giro: 0, talla: 1 });
    const manzana = t.manzana[idx(primera.i, primera.j)] as number;
    if (!manzanasConContenedor.has(manzana)) {
      manzanasConContenedor.add(manzana);
      mobiliario.push({ pieza: PIEZA.contenedor, x: acera.x - lado.x * aLoLargo(3.4), y: ALTURA_DEL_BORDILLO, z: acera.z - lado.z * aLoLargo(3.4), giro: giroMirandoA(e.frente), talla: 1 });
      mobiliario.push({ pieza: PIEZA.bocaDeRiego, x: acera.x - lado.x * (aLoLargo(3.4) - 2.4), y: ALTURA_DEL_BORDILLO, z: acera.z - lado.z * (aLoLargo(3.4) - 2.4), giro: 0, talla: 1 });
    }
    /*
     * La terraza va delante del restaurante, en el retranqueo que deja el cuerpo: 2,4 de
     * acera. Una de cada tres y no una de cada dos: la `silla` del pack cuesta 428 triángulos
     * —más que un `cuerpo-a` entero— y con una terraza en la mitad de los bajos del barrio de
     * ocio eran 28.000 dentro del disco de L1, medidos. Con una de cada tres, la calle sigue
     * teniendo terrazas y cuestan 18.000.
     */
    /*
     * EL JARDÍN DEL CHALET, que es lo que hace que un chalet no sea un piso pequeño: el
     * cuerpo se retranquea 3,20 y en ese hueco caben un seto a cada lado del camino de
     * entrada, un pino en una esquina y un banco en el porche. Con `verja` de parcela serían
     * 380 triángulos por cada cuatro unidades y cuatro tramos por chalet: 1.520 por casa, más
     * que el chalet entero. Los setos hacen el mismo cierre por 72.
     */
    if (e.distrito === 'chalets') {
      for (const s of [-1, 1]) {
        mobiliario.push({ pieza: PIEZA.arbusto, x: acera.x + lado.x * s * 3.6, y: ALTURA_DEL_BORDILLO, z: acera.z + lado.z * s * 3.6, giro: 0, talla: 1 });
        mobiliario.push({ pieza: PIEZA.arbusto, x: acera.x - v.x * 1.6 + lado.x * s * 4.4, y: ALTURA_DEL_BORDILLO, z: acera.z - v.z * 1.6 + lado.z * s * 4.4, giro: 0, talla: 1 });
      }
      mobiliario.push({ pieza: PIEZA.pinoPequeno, x: acera.x - v.x * 0.8 + lado.x * 4.4, y: ALTURA_DEL_BORDILLO, z: acera.z - v.z * 0.8 + lado.z * 4.4, giro: 0, talla: 1 });
      mobiliario.push({ pieza: PIEZA.bancoDeParque, x: acera.x - v.x * 2.4 - lado.x * 2.4, y: ALTURA_DEL_BORDILLO, z: acera.z - v.z * 2.4 - lado.z * 2.4, giro: giroMirandoA(e.frente), talla: 1 });
    }
    if (e.distrito === 'ocio' && e.indice % 3 === 0) {
      mobiliario.push({ pieza: PIEZA.mesaPequena, x: acera.x, y: ALTURA_DEL_BORDILLO, z: acera.z, giro: 0, talla: 1 });
      for (const s of [-1, 1]) mobiliario.push({ pieza: PIEZA.silla, x: acera.x + lado.x * s * 1.5, y: ALTURA_DEL_BORDILLO, z: acera.z + lado.z * s * 1.5, giro: giroMirandoA(s > 0 ? rumboContrario(rumboALaDerecha(e.frente)) : rumboALaDerecha(e.frente)), talla: 1 });
    }
  }
  /* Y los setos y el árbol del interior de manzana, que es lo que hace que un patio sea un patio. */
  for (const jardin of conDetalles ? edificado.jardines : []) {
    mobiliario.push({ pieza: PIEZA.arbusto, x: jardin.x - 3.5, y: ALTURA_DEL_BORDILLO, z: jardin.z - 3.5, giro: 0, talla: 1 });
    mobiliario.push({ pieza: PIEZA.arbusto, x: jardin.x + 3.5, y: ALTURA_DEL_BORDILLO, z: jardin.z + 3.5, giro: 0, talla: 1 });
    if (calidad === 'plena') mobiliario.push({ pieza: PIEZA.pinoPequeno, x: jardin.x, y: ALTURA_DEL_BORDILLO, z: jardin.z, giro: 0, talla: 1 });
    mobiliario.push({ pieza: PIEZA.bancoDeCalle, x: jardin.x + 3.5, y: ALTURA_DEL_BORDILLO, z: jardin.z - 3.5, giro: 0, talla: 1 });
  }

  /*
   * ── Los distritos con obra propia: los CATORCE de reserva, cada uno con su regla ──
   *
   * La isleta de la glorieta va aparte porque no es de nadie: es el centro de la ciudad.
   */
  const bultos: BultoPropio[] = [...edificado.torres, ...(conDetalles ? edificado.jardines : [])];
  const cintas: CintaPropia[] = [];
  const volumenesDeDistrito: PuestaEnLaCiudad[] = [];
  const aparcadosDeDistrito: PuestaEnLaCiudad[] = [];
  let circuito: Punto[] | null = null;
  for (const d of t.distritos) {
    if (!d.esReserva) continue;
    const caja = cajaDelDistrito(recinto, d);
    const haciaElCentro: Rumbo = Math.abs(caja.cx - recinto.centro.x) > Math.abs(caja.cz - recinto.centro.z) ? (caja.cx > recinto.centro.x ? 2 : 0) : caja.cz > recinto.centro.z ? 3 : 1;
    const obra =
      d.nombre === 'parque'
        ? montarElParque(caja, azar, calidad)
        : d.nombre === 'cementerio'
          ? montarElCementerio(caja, haciaElCentro, azar, calidad)
          : d.nombre === 'centro-comercial'
            ? montarElCentroComercial(caja, azar, calidad)
            : d.nombre === 'poligono'
              ? montarElPoligono(caja, azar, calidad)
              : d.nombre === 'circuito'
                ? montarElCircuito(caja, calidad)
                : d.nombre === 'estadio'
                  ? montarElEstadio(caja, calidad)
                  : d.nombre === 'estacion'
                    ? montarLaEstacion(caja, calidad)
                    : d.nombre === 'canal'
                      ? montarElCanal(caja, azar, calidad)
                      : d.nombre === 'feria'
                        ? montarLaFeria(caja, azar, calidad)
                        : d.nombre === 'hospital'
                          ? montarElHospital(caja, haciaElCentro, calidad)
                          : d.nombre === 'colegio'
                            ? montarElColegio(caja, haciaElCentro, calidad)
                            : d.nombre === 'gasolinera'
                              ? montarLaGasolinera(caja, haciaElCentro)
                              : d.nombre === 'obra'
                                ? montarLaObra(caja, azar, calidad)
                                : vacia();
    bultos.push(...obra.bultos);
    cintas.push(...obra.cintas);
    mobiliario.push(...obra.puestas);
    volumenesDeDistrito.push(...obra.volumenes);
    aparcadosDeDistrito.push(...obra.coches);
    if (obra.circuito !== null) circuito = obra.circuito;
  }

  /*
   * LA ISLETA DE LA GLORIETA: el centro de la ciudad, y lo único que se ve desde las cuatro
   * avenidas a la vez. Un pedestal octogonal con la `figura` de un aventurero encima y un
   * cantero de arbustos alrededor, todo dentro de las cuatro celdas centrales.
   */
  {
    const centro = recinto.centro;
    const ladoDeLaIsleta = 2 * RETICULA_DE_LA_CIUDAD;
    bultos.push({ clase: 'isleta', x: centro.x, y: ALTURA_DEL_ASFALTO, z: centro.z, giro: 0, ancho: ladoDeLaIsleta, alto: ALTURA_DEL_BORDILLO - ALTURA_DEL_ASFALTO, fondo: ladoDeLaIsleta, color: '#6f8a4e', triangulos: 10 });
    bultos.push({ clase: 'pedestal', x: centro.x, y: ALTURA_DEL_BORDILLO, z: centro.z, giro: 0, ancho: 6, alto: 3, fondo: 6, color: '#cfc7b4', triangulos: 16 });
    mobiliario.push({ pieza: PIEZA.figura, x: centro.x, y: ALTURA_DEL_BORDILLO + 3, z: centro.z, giro: 0, talla: 1 });
    if (conDetalles) {
      for (let k = 0; k < 8; k++) {
        mobiliario.push({ pieza: PIEZA.arbusto, x: centro.x + cosDeGrados(k * 45) * 8, y: ALTURA_DEL_BORDILLO, z: centro.z + senDeGrados(k * 45) * 8, giro: 0, talla: 1 });
      }
    }
  }

  /*
   * ── LOS COCHES QUE CIRCULAN, y por qué sus rutas NO COMPARTEN NI UNA CELDA ──
   *
   * `LA-CIUDAD.md` §7 pide doce coches por la ciudad y dice, con razón, que «los coches no se
   * ven entre ellos y no chocan: elegir las fases para que no se alcancen es trabajo de la
   * traza, no del bucle». La forma de cumplirlo sin depender de las fases es más fuerte: que
   * dos rutas NO PASEN NUNCA POR LA MISMA CELDA. Los cinco rectángulos de abajo son disjuntos
   * —el bulevar de fuera, y un anillo por cuadrante con el bulevar de dentro y las dos
   * avenidas—, y las dos vueltas de cada uno van por carriles contrarios, a 5,40 la una de la
   * otra. Dos coches no pueden alcanzarse por construcción, y el comprobador lo mide igual.
   *
   * Las dos últimas rutas son de calle interior: una manzana entera rodeada de calle, en dos
   * cuadrantes distintos. Se comprueban antes de usarlas, porque un distrito puede haberse
   * comido uno de sus cuatro lados.
   */
  const aparcados = [...cochesAparcados(recinto, t, losas, azar, calidad), ...aparcadosDeDistrito];
  const bulevarDeDentro = CELDAS_DEL_BULEVAR.length - 1;
  const primeraAv = CELDAS_DE_AVENIDA[0] as number;
  const ultimaAv = CELDAS_DE_AVENIDA[CELDAS_DE_AVENIDA.length - 1] as number;
  const lejos = t.n - 1 - bulevarDeDentro;
  const rectangulos: readonly (readonly [number, number, number, number])[] = [
    [0, 0, t.n - 1, t.n - 1],
    [bulevarDeDentro, bulevarDeDentro, primeraAv, primeraAv],
    [ultimaAv, bulevarDeDentro, lejos, primeraAv],
    [ultimaAv, ultimaAv, lejos, lejos],
    [bulevarDeDentro, ultimaAv, primeraAv, lejos],
  ];
  const rutas: RutaDeCoche[] = [];
  const modelosDeCalle = [PIEZA.cocheBerlina, PIEZA.cocheUtilitario, PIEZA.cocheFamiliar, PIEZA.cocheTaxi];
  const cuantasRutas = calidad === 'plena' ? rectangulos.length : 1;
  for (let k = 0; k < cuantasRutas; k++) {
    const r = rectangulos[k] as readonly [number, number, number, number];
    for (const horario of [true, false]) {
      const celdas = anilloDeCeldas(r[0], r[1], r[2], r[3], horario);
      rutas.push(rutaPorCeldas(recinto, celdas, modelosDeCalle[(k * 2 + (horario ? 0 : 1)) % 4] as NombreDePieza, VELOCIDAD_DE_CALLE, semaforos));
    }
  }
  if (calidad === 'plena') {
    let interiores = 0;
    for (let k = 0; k < t.cuadrantes.length && interiores < 2; k++) {
      const info = t.cuadrantes[k] as Trazado['cuadrantes'][number];
      const calles = t.callesDeCadaCuadrante[k] as { columnas: number[]; filas: number[] };
      /*
       * Se prueban TODAS las parejas de calles del cuadrante hasta dar con un rectángulo
       * entero de calle: con catorce distritos comiéndose el suelo, la primera pareja casi
       * nunca vale —un estadio corta una de las cuatro calles— y quedarse con ella dejaba la
       * ciudad en diez coches en vez de doce.
       */
      let puesta = false;
      for (let ca = 0; ca < calles.columnas.length - 1 && !puesta; ca++) {
        for (let cb = ca + 1; cb < calles.columnas.length && !puesta; cb++) {
          for (let fa = 0; fa < calles.filas.length - 1 && !puesta; fa++) {
            for (let fb = fa + 1; fb < calles.filas.length && !puesta; fb++) {
              const a = aLaReticula(info.marco, calles.columnas[ca] as number, calles.filas[fa] as number);
              const b = aLaReticula(info.marco, calles.columnas[cb] as number, calles.filas[fb] as number);
              const celdas = anilloDeCeldas(Math.min(a.i, b.i), Math.min(a.j, b.j), Math.max(a.i, b.i), Math.max(a.j, b.j), k % 2 === 0);
              if (!celdas.every((c) => esClaseDeCalle(t.clase[c.j * t.n + c.i] as ClaseDeCelda))) continue;
              rutas.push(rutaPorCeldas(recinto, celdas, modelosDeCalle[interiores % 4] as NombreDePieza, VELOCIDAD_DE_CALLE, semaforos));
              interiores++;
              puesta = true;
            }
          }
        }
      }
    }
  }
  if (circuito !== null) {
    const { largo } = avancesDe(circuito, true);
    for (let k = 0; k < (calidad === 'plena' ? COCHES_DE_CARRERA : 2); k++) {
      rutas.push(rutaLibre(circuito, modelosDeCalle[k % 4] as NombreDePieza, VELOCIDAD_DE_CARRERA, (largo * k) / COCHES_DE_CARRERA, ALTURA_DEL_BORDILLO + 0.05 + ALZADO_DEL_COCHE));
    }
  }

  /* ── La muestra de interiores que el presupuesto cuenta ── */
  const interiores: PuestaDeSala[] = [];
  if (calidad === 'plena') {
    const conCascara = edificado.edificios.filter((e) => e.cascara !== null);
    for (let k = 0; k < INTERIORES_DE_MUESTRA && k < conCascara.length; k++) {
      const e = conCascara[Math.floor((k * conCascara.length) / INTERIORES_DE_MUESTRA)] as EdificioDeLaCiudad;
      interiores.push(...salasDelEdificio(e, semilla));
    }
  }

  const celdas: CeldaDeLaCiudad[] = [];
  for (let j = 0; j < t.n; j++) {
    for (let i = 0; i < t.n; i++) {
      const c = centroDeCelda(recinto, i, j);
      celdas.push({
        i,
        j,
        x: c.x,
        z: c.z,
        clase: t.clase[idx(i, j)] as ClaseDeCelda,
        distrito: t.distrito[idx(i, j)] ?? null,
        cuadrante: t.cuadrante[idx(i, j)] ?? null,
        abre: t.abre[idx(i, j)] as number,
        manzana: t.manzana[idx(i, j)] as number,
      });
    }
  }

  const volumenes = [...edificado.volumenes, ...volumenesDeDistrito];

  /* ══════════════ LOS GRUPOS: la ciudad partida en trozos que suben y bajan de nivel ══════════════ */

  const grupos = agruparLaCiudad(recinto, t, calidad, {
    calzada,
    volumenes,
    volumenesDeDistrito,
    bultos,
    cintas,
    mobiliario,
    aparcados,
    edificios: edificado.edificios,
  });

  const trianguloDeCoches = sumaDePuestas(aparcados) + rutas.reduce((a, r) => a + triangulosDe(r.pieza), 0);
  const triangulos: TriangulosDeLaCiudad = {
    calzada: sumaDePuestas(calzada),
    volumenes: sumaDePuestas(volumenes),
    fachadas: sumaDeBultos(edificado.torres),
    mobiliario: sumaDePuestas(mobiliario),
    coches: trianguloDeCoches,
    distritos: sumaDeBultos(bultos) - sumaDeBultos(edificado.torres) + sumaDeCintas(cintas),
    interiores: interiores.reduce((a, s) => a + s.triangulos, 0),
    total: 0,
  };
  const total = triangulos.calzada + triangulos.volumenes + triangulos.fachadas + triangulos.mobiliario + triangulos.coches + triangulos.distritos + triangulos.interiores;

  return {
    semilla,
    calidad,
    recinto,
    celdas,
    distritos: t.distritos,
    calzada,
    volumenes,
    fachadas: bultos,
    mobiliario,
    cintas,
    edificios: edificado.edificios,
    interiores,
    coches: { aparcados, rutas },
    semaforos,
    grupos,
    triangulos: { ...triangulos, total },
  };
}

/** Lo que la ciudad le pasa al que la agrupa: las listas enteras, ya montadas en L1. */
interface LaCiudadEnBruto {
  readonly calzada: readonly PuestaEnLaCiudad[];
  readonly volumenes: readonly PuestaEnLaCiudad[];
  readonly volumenesDeDistrito: readonly PuestaEnLaCiudad[];
  readonly bultos: readonly BultoPropio[];
  readonly cintas: readonly CintaPropia[];
  readonly mobiliario: readonly PuestaEnLaCiudad[];
  readonly aparcados: readonly PuestaEnLaCiudad[];
  readonly edificios: readonly EdificioDeLaCiudad[];
}

/** El lado de una tesela de calle, en celdas: 6 × 12 = 72, justo el frente de una casilla. */
export const CELDAS_POR_TESELA = 6;

/** Las clases de bulto que son SUELO: lo único que sobrevive a L3 en un distrito. */
const BULTOS_DE_SUELO: readonly ClaseDeBulto[] = ['pradera', 'tierra', 'asfalto', 'agua', 'cesped', 'estanque', 'jardin'];
/**
 * LO QUE AGUANTA EN L2 DE UN DISTRITO, Y POR QUÉ SE AFLOJÓ.
 *
 * Era «sólo las piezas de 250 triángulos o más, y una de cada cuatro». Se vio mirando desde
 * media altura: los distritos quedaban como EXPLANADAS de suelo liso —un cementerio sin
 * tumbas, un parque sin árboles, una estación sin nada— justo a la distancia en la que
 * todavía se distinguen. Un árbol de 144 triángulos a 300 unidades mide 26 píxeles: se ve
 * perfectamente, y quitarlo no ahorraba nada que hiciera falta ahorrar.
 *
 * PERO SÓLO EN UN PC, y esto lo dijo la medida y no el criterio. Con 100 y una de cada dos en
 * las dos calidades, la peor pose de un PC sube de 450.091 a 546.061 de los 692.000 —cabe—
 * pero la de un MÓVIL se va a 93.369 de los 84.000 y no cabe: seis de las veinte semillas se
 * pasaban. Así que el móvil se queda con la regla estricta de siempre (250 y una de cada
 * cuatro) y el PC se afloja. Es el único sitio de la ciudad donde las dos calidades tienen
 * reglas distintas de DENSIDAD además de nivel, y por eso está escrito con las dos cifras
 * delante.
 */
const AGUANTA_EN_L2 = { plena: 100, sobria: 250 } as const;
/** Una de cada cuántas piezas del distrito sobrevive a L2, por calidad. */
const SALTO_DEL_MOBILIARIO_EN_L2 = { plena: 2, sobria: 4 } as const;

/**
 * LOS COLORES CON LOS QUE SE PINTA UN EDIFICIO DE LEJOS, Y DE DÓNDE SALEN.
 *
 * Los `bloque-*` y los `cuerpo-*` del pack traen el color HORNEADO y cada uno es de un tono:
 * el A es azulón, el C es rojo teja, el D oliva, el E y el F terracota, el G y el H grises.
 * Cuando el nivel de detalle los cambia por un prisma, ese prisma tiene que parecerse al que
 * sustituye o el cambio se ve como un parpadeo de color; y si todos los prismas son del MISMO
 * gris —que es lo que había— la ciudad a media altura se lee como un cementerio de cajas
 * iguales al lado de una calle de colores. Se vio mirando desde la pose de calle del banco.
 *
 * ═══ NO ESTÁN ELEGIDOS: ESTÁN MEDIDOS, Y DE UNA MANERA CONCRETA ═══
 *
 * Cada tono es la media de `COLOR_0` de su pieza en `burgo.glb` PONDERADA POR ÁREA y contando
 * SÓLO las caras verticales (normal con |y| ≤ 0,7). Las dos condiciones hacen falta:
 *
 *  · Sin ponderar por área sale el color de los DETALLES y no el de la fachada —una ventana
 *    tiene tantos vértices como un paño de muro— y los dieciséis salían del mismo marrón
 *    sucio (`#563f3a`…`#8f7376`), que es justo el gris único que se quería quitar.
 *  · Sin descartar las caras horizontales manda el TEJADO, que en este pack es oscuro en
 *    todos, y volvería a igualarlos.
 *
 * Y van en sRGB porque así es como los lee `THREE.Color.set('#rrggbb')`; `COLOR_0` de glTF es
 * lineal, así que la medida se convierte al escribirla. Que la tabla no se quede vieja lo
 * vigila `verify:la-ciudad`, que vuelve a abrir el `.glb` y mide otra vez con esta misma
 * regla, con `TOLERANCIA_DEL_TONO` de margen.
 */
/**
 * EL GRIS AZULADO DE UNA TORRE DEL CENTRO, el mismo en los tres niveles de detalle.
 *
 * Aclarado desde `#7c8493` después de mirarlo desde la glorieta: con las bandas de ventana a
 * un tercio del color, el centro entero se veía como una masa negra detrás de una calle de
 * colores. A `#98a3b2` la banda sigue leyéndose como ventana y la torre como hormigón claro.
 */
export const TONO_DE_LA_TORRE = '#98a3b2';

export const TONO_DEL_EDIFICIO: Readonly<Record<string, string>> = {
  [PIEZA.bloqueA]: '#5e6e71',
  [PIEZA.bloqueB]: '#8b7573',
  [PIEZA.bloqueC]: '#c26e6e',
  [PIEZA.bloqueD]: '#8d9576',
  [PIEZA.bloqueE]: '#af826c',
  [PIEZA.bloqueF]: '#c1876d',
  [PIEZA.bloqueG]: '#848083',
  [PIEZA.bloqueH]: '#8a8481',
  [PIEZA.cuerpoA]: '#5b6d73',
  [PIEZA.cuerpoB]: '#8f7574',
  [PIEZA.cuerpoC]: '#c96d6f',
  [PIEZA.cuerpoD]: '#8e9877',
  [PIEZA.cuerpoE]: '#b3836c',
  [PIEZA.cuerpoF]: '#c5886d',
  [PIEZA.cuerpoG]: '#848187',
  [PIEZA.cuerpoH]: '#8a8483',
};
/** Lo que se le tolera a un tono medido antes de decir que la tabla se ha quedado vieja: 12 de 255 por canal. */
export const TOLERANCIA_DEL_TONO = 12;
/**
 * EL TONO DE UN EDIFICIO QUE NO TIENE CÁSCARA DEL PACK, QUE SON LAS TORRES DEL CENTRO.
 *
 * Y por eso es el MISMO gris azulado con el que se levanta una torre en L1 (`clase: 'torre'`).
 * Con el beige de antes, una torre que cruzaba los 156 pasaba de gris azulada con una banda
 * por planta a beige con dos bandas, y el centro de la ciudad se veía desde media altura como
 * un montón de cajas de cartón detrás de una calle de colores. Se vio mirando desde la pose de
 * la glorieta del banco.
 */
export const TONO_POR_DEFECTO = TONO_DE_LA_TORRE;

/** El tono con el que se pinta de lejos la cáscara `pieza`. */
export function tonoDelEdificio(pieza: NombreDePieza | null): string {
  return (pieza === null ? undefined : TONO_DEL_EDIFICIO[pieza]) ?? TONO_POR_DEFECTO;
}

/** El prisma con el que se pinta de lejos una cáscara del pack, sacado de su caja medida. */
function prismaDeLaPieza(p: PuestaEnLaCiudad, triangulos: number): BultoPropio {
  const cuerpo = CUERPO_DEL_MODELO[p.pieza] as CuerpoDelPack | undefined;
  const ancho = cuerpo?.ancho ?? RETICULA_DE_LA_CIUDAD;
  const fondo = cuerpo?.fondo ?? RETICULA_DE_LA_CIUDAD;
  const alto = ALTURA_DEL_BORDILLO + (cuerpo?.plantas ?? 2) * ALTURA_DE_PLANTA;
  return { clase: triangulos === TRIANGULOS_DEL_PRISMA ? 'prisma' : 'manzana-fundida', x: p.x, y: 0, z: p.z, giro: p.giro, ancho, alto, fondo, color: tonoDelEdificio(p.pieza), triangulos };
}

/**
 * AGRUPAR LA CIUDAD, que es lo que hace que exista.
 *
 * Cada cosa cae en el grupo de la CELDA en la que está, y de ahí salen las tres clases de
 * grupo sin decidir nada a mano: lo que está en una celda de calle es de su tesela, lo que
 * está en una parcela o en un patio es de su manzana, y lo que está en una reserva es de su
 * distrito. Una farola de la acera es de la calle, un contenedor de un portal es de la calle
 * —está en la acera— y el árbol de un interior de manzana es de la manzana. Eso es lo que
 * hace que subir o bajar una manzana no deje una farola suelta en el aire.
 *
 * Y de cada grupo salen sus tres montajes, con estas reglas y ninguna excepción:
 *
 *   CALLE     L1 todo · L2 sólo las losas del pack · L3 una manta de 2 triángulos por celda
 *   MANZANA   L1 todo · L2 un prisma de 30 por edificio · L3 uno de 10 por edificio
 *   DISTRITO  L1 todo · L2 el suelo, las cintas, los prismas y una de cada cuatro piezas
 *             gordas · L3 sólo el suelo
 */
function agruparLaCiudad(recinto: RecintoDeLaCiudad, t: Trazado, calidad: Calidad, bruto: LaCiudadEnBruto): GrupoDeLaCiudad[] {
  const n = t.n;
  const idx = (i: number, j: number): number => j * n + i;
  const mitad = recinto.lado / 2;
  const enCelda = (x: number, z: number): number => {
    const i = Math.max(0, Math.min(n - 1, Math.floor((x - (recinto.centro.x - mitad)) / RETICULA_DE_LA_CIUDAD)));
    const j = Math.max(0, Math.min(n - 1, Math.floor((z - (recinto.centro.z - mitad)) / RETICULA_DE_LA_CIUDAD)));
    return idx(i, j);
  };

  interface Monton {
    puestas: PuestaEnLaCiudad[];
    bultos: BultoPropio[];
    cintas: CintaPropia[];
    coches: PuestaEnLaCiudad[];
  }
  interface EnObra {
    clase: ClaseDeGrupo;
    nombre: string;
    iMin: number;
    jMin: number;
    iMax: number;
    jMax: number;
    celdas: number;
    montones: Monton[];
  }
  const nuevo = (clase: ClaseDeGrupo, nombre: string): EnObra => ({
    clase,
    nombre,
    iMin: n,
    jMin: n,
    iMax: -1,
    jMax: -1,
    celdas: 0,
    montones: [
      { puestas: [], bultos: [], cintas: [], coches: [] },
      { puestas: [], bultos: [], cintas: [], coches: [] },
      { puestas: [], bultos: [], cintas: [], coches: [] },
    ],
  });

  const enObra: EnObra[] = [];
  const grupoDeCelda: number[] = new Array(n * n).fill(-1);
  const porManzana = new Map<number, number>();
  const porTesela = new Map<number, number>();
  const porDistrito = new Map<string, number>();
  let laIsleta = -1;

  /* Qué distrito de reserva cubre cada celda: se reconstruye de los rectángulos ya puestos. */
  const distritoDeCelda: number[] = new Array(n * n).fill(-1);
  for (let d = 0; d < t.distritos.length; d++) {
    const r = t.distritos[d] as DistritoPuesto;
    if (!r.esReserva) continue;
    for (let j = r.j0; j < r.j0 + r.fondo; j++) for (let i = r.i0; i < r.i0 + r.ancho; i++) distritoDeCelda[idx(i, j)] = d;
  }

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = idx(i, j);
      const clase = t.clase[k] as ClaseDeCelda;
      let g = -1;
      if (esClaseDeCalle(clase)) {
        const tesela = Math.floor(j / CELDAS_POR_TESELA) * n + Math.floor(i / CELDAS_POR_TESELA);
        g = porTesela.get(tesela) ?? -1;
        if (g < 0) {
          g = enObra.length;
          porTesela.set(tesela, g);
          enObra.push(nuevo('calle', `calle ${tesela}`));
        }
      } else if (clase === 'isleta') {
        if (laIsleta < 0) {
          laIsleta = enObra.length;
          enObra.push(nuevo('distrito', 'glorieta'));
        }
        g = laIsleta;
      } else if (clase === 'reserva') {
        const d = distritoDeCelda[k] as number;
        const nombre = `${(t.distritos[d] as DistritoPuesto)?.nombre ?? 'reserva'} ${d}`;
        g = porDistrito.get(nombre) ?? -1;
        if (g < 0) {
          g = enObra.length;
          porDistrito.set(nombre, g);
          enObra.push(nuevo('distrito', nombre));
        }
      } else {
        const m = t.manzana[k] as number;
        g = porManzana.get(m) ?? -1;
        if (g < 0) {
          g = enObra.length;
          porManzana.set(m, g);
          enObra.push(nuevo('manzana', `manzana ${m}`));
        }
      }
      grupoDeCelda[k] = g;
      const o = enObra[g] as EnObra;
      o.celdas++;
      o.iMin = Math.min(o.iMin, i);
      o.jMin = Math.min(o.jMin, j);
      o.iMax = Math.max(o.iMax, i);
      o.jMax = Math.max(o.jMax, j);
    }
  }

  const grupoEn = (x: number, z: number): EnObra => enObra[grupoDeCelda[enCelda(x, z)] as number] as EnObra;
  const claseEn = (x: number, z: number): ClaseDeCelda => t.clase[enCelda(x, z)] as ClaseDeCelda;

  /* ── L1: todo, cada cosa en el grupo de su celda ── */
  for (const p of bruto.calzada) {
    const g = grupoEn(p.x, p.z);
    (g.montones[0] as Monton).puestas.push(p);
    /*
     * LAS LOSAS DEL PACK AGUANTAN EN L2 EN UN PC, Y EN EL MÓVIL NO.
     *
     * En un PC se quedan porque la trama de calles es lo que hace que se lea «ciudad», y una
     * losa cuesta 90 triángulos de nada. En un móvil, las losas del anillo de L2 son 38.000
     * triángulos —casi la mitad de los 84.477 que el tablero le deja a la ciudad entera— y a
     * esa distancia una línea de carril mide 0,12 píxeles: en sobria, el L2 de una tesela de
     * calle es la misma manta que su L3, y no se pierde nada que se vea.
     */
    if (calidad === 'plena' && esClaseDeCalle(claseEn(p.x, p.z))) (g.montones[1] as Monton).puestas.push(p);
  }
  for (const p of bruto.volumenes) (grupoEn(p.x, p.z).montones[0] as Monton).puestas.push(p);
  for (const p of bruto.mobiliario) (grupoEn(p.x, p.z).montones[0] as Monton).puestas.push(p);
  for (const p of bruto.aparcados) (grupoEn(p.x, p.z).montones[0] as Monton).coches.push(p);
  for (const b of bruto.bultos) (grupoEn(b.x, b.z).montones[0] as Monton).bultos.push(b);
  for (const c of bruto.cintas) {
    let x = 0;
    let z = 0;
    for (const punto of c.puntos) {
      x += punto.x;
      z += punto.z;
    }
    const g = grupoEn(x / Math.max(1, c.puntos.length), z / Math.max(1, c.puntos.length));
    (g.montones[0] as Monton).cintas.push(c);
    /* Una cinta es geometría propia y ya es barata: la pista del circuito son 240 triángulos. */
    (g.montones[1] as Monton).cintas.push(c);
  }

  /* ── L2 y L3 de las manzanas: un prisma por edificio, y de lejos uno más barato ── */
  for (const e of bruto.edificios) {
    const primera = e.celdas[0] as { i: number; j: number };
    const g = enObra[grupoDeCelda[idx(primera.i, primera.j)] as number] as EnObra;
    const alto = e.alto;
    const prisma = (triangulos: number): BultoPropio => ({ clase: triangulos === TRIANGULOS_DEL_PRISMA ? 'prisma' : 'manzana-fundida', x: e.centro.x, y: 0, z: e.centro.z, giro: e.giro, ancho: e.ancho, alto, fondo: e.fondo, color: tonoDelEdificio(e.cascara), triangulos });
    /*
     * UNA TORRE SE QUEDA ENTERA EN L2, y es la única excepción a «en L2 todo es un prisma».
     *
     * Una torre no tiene cáscara del pack: ya ES geometría propia, y cuesta 12 + 8 por planta
     * + 20, o sea entre 80 y 144 triángulos. Cambiarla por un prisma de 30 ahorra cien
     * triángulos y a cambio convierte el centro de la ciudad —que es lo que se ve desde
     * cualquier calle, porque sobresale por encima de todo lo demás— en un amasijo de losas
     * grises con dos rayas. Se vio mirando desde la pose de calle del banco. Las cincuenta y
     * seis celdas de torre son unas veintiséis torres: dejarlas enteras en L2 cuesta unos dos
     * mil triángulos de los 692.000. En L3 sí baja a prisma, porque a más de 1.500 una banda
     * de ventanas no llega a un píxel.
     */
    if (e.cascara === null) {
      (g.montones[1] as Monton).bultos.push({ clase: 'torre', x: e.centro.x, y: 0, z: e.centro.z, giro: e.giro, ancho: e.ancho, alto, fondo: e.fondo, color: TONO_DE_LA_TORRE, triangulos: triangulosDeUnaTorre(e.plantas) });
    } else {
      (g.montones[1] as Monton).bultos.push(prisma(TRIANGULOS_DEL_PRISMA));
    }
    (g.montones[2] as Monton).bultos.push(prisma(TRIANGULOS_DEL_PRISMA_FUNDIDO));
  }

  /* ── L2 y L3 de los distritos: el suelo siempre, y de las piezas del pack sólo las gordas ── */
  for (const b of bruto.bultos) {
    const g = grupoEn(b.x, b.z);
    if (g.clase !== 'distrito') continue;
    (g.montones[1] as Monton).bultos.push(b);
    if (BULTOS_DE_SUELO.indexOf(b.clase) >= 0) (g.montones[2] as Monton).bultos.push(b);
  }
  {
    let k = 0;
    for (const p of bruto.mobiliario) {
      const g = grupoEn(p.x, p.z);
      if (g.clase !== 'distrito') continue;
      if (triangulosDe(p.pieza) >= AGUANTA_EN_L2[calidad] && k % SALTO_DEL_MOBILIARIO_EN_L2[calidad] === 0) (g.montones[1] as Monton).puestas.push(p);
      k++;
    }
  }
  for (const p of bruto.volumenesDeDistrito) {
    const g = grupoEn(p.x, p.z);
    (g.montones[1] as Monton).bultos.push(prismaDeLaPieza(p, TRIANGULOS_DEL_PRISMA));
    (g.montones[2] as Monton).bultos.push(prismaDeLaPieza(p, TRIANGULOS_DEL_PRISMA_FUNDIDO));
  }

  /* ── L3 de las calles (y en sobria también el L2): la manta de asfalto, dos triángulos por celda ── */
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (!esClaseDeCalle(t.clase[idx(i, j)] as ClaseDeCelda)) continue;
      const g = enObra[grupoDeCelda[idx(i, j)] as number] as EnObra;
      const c = centroDeCelda(recinto, i, j);
      const manta: BultoPropio = { clase: 'asfalto', x: c.x, y: ALTURA_DEL_ASFALTO, z: c.z, giro: 0, ancho: RETICULA_DE_LA_CIUDAD, alto: 0, fondo: RETICULA_DE_LA_CIUDAD, color: '#4a4a4c', triangulos: TRIANGULOS_DE_LA_MANTA };
      (g.montones[2] as Monton).bultos.push(manta);
      if (calidad !== 'plena') (g.montones[1] as Monton).bultos.push(manta);
    }
  }

  return enObra.map((o, indice) => {
    const a = centroDeCelda(recinto, o.iMin, o.jMin);
    const b = centroDeCelda(recinto, o.iMax, o.jMax);
    const ancho = b.x - a.x + RETICULA_DE_LA_CIUDAD;
    const fondo = b.z - a.z + RETICULA_DE_LA_CIUDAD;
    return {
      indice,
      clase: o.clase,
      nombre: o.nombre,
      centro: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
      radio: Math.sqrt(ancho * ancho + fondo * fondo) / 2,
      celdas: o.celdas,
      niveles: o.montones.map((m) => ({
        puestas: m.puestas,
        bultos: m.bultos,
        cintas: m.cintas,
        coches: m.coches,
        triangulos: sumaDePuestas(m.puestas) + sumaDeBultos(m.bultos) + sumaDeCintas(m.cintas) + sumaDePuestas(m.coches),
      })),
    };
  });
}

/** La ciudad de una mesa, por su código. La misma mesa, la misma ciudad. */
export function ciudadDelCodigo(codigo: string | null | undefined, recinto: RecintoDeLaCiudad = RECINTO_DEL_BURGO, calidad: Calidad = 'plena'): LaCiudad {
  return generarLaCiudad(semillaDelCodigo(codigo, 1), recinto, calidad);
}
