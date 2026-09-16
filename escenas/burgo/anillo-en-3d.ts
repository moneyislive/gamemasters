/**
 * EL ANILLO DEL BURGO EN UNIDADES DEL MUNDO: dónde cae cada casilla, cada banda, cada
 * hueco, cada pieza del decorado, y por dónde entra la ciudad. Sin `three`.
 *
 * ═══ QUÉ HACE ESTE FICHERO Y QUÉ NO ═══
 *
 * Aquí está toda la geometría del TABLERO escrita con sumas y productos, y devuelta como
 * LISTAS DE PUESTAS —`{ pieza, x, y, z, giro, talla }`— y de CUADROS DE SUELO, para que
 * `Burgo.tsx` sólo tenga que instanciar y pintar. `Burgo.tsx` no calcula un solo sitio: si
 * una pieza está mal puesta, el fallo está aquí y `verify:burgo-escena` lo mide en Node
 * contra el `burgo.glb` real, sin abrir un contexto de dibujo. La topología (qué casilla
 * sigue a cuál, el sentido de la marcha, el centro de cada casilla) viene de
 * `shared/mecanicas/anillo.ts`, que también la lee el reductor: el aventurero anda por
 * donde el reglamento cuenta.
 *
 * Lo que NO hay aquí es la CIUDAD. El recinto interior (648 × 648, cincuenta y cuatro
 * celdas de doce por lado) lo levanta `escenas/burgo/ciudad.ts` con las medidas que este
 * fichero publica en `RECINTO_DE_LA_CIUDAD` y `PUERTAS_DE_LA_CIUDAD`. Aquí sólo se deja el
 * hueco, el suelo de arranque y las cuatro bocas por donde entran las avenidas.
 *
 * ═══ LO QUE ESTE FICHERO REVOCA, Y POR QUÉ (10-sep-2026, DOS VECES) ═══
 *
 * La primera versión era un tablero MEDIEVAL de casilla 8 × 14 con una muralla cerrando un
 * centro de 72 × 72. Miguel, al ver el banco: «esto parece un tablero aleatorio con las
 * casillas poco definidas y con un centro que en vez de ser una ciudad es una muralla
 * vacía por dentro […] me gustaría que no hubiera muralla, que el área central del tablero
 * fuera más grande y que contenga una ciudad de verdad […] las casillas más estilo tablero
 * de mesa clásico y mejor definidas […] no hace falta que pongas muchos elementos 3d».
 *
 * La segunda llevó el recinto a 288 (cuatro veces el original) y se quedó corta. La orden
 * que manda sobre esta tercera es literal: «El tablero debe ser una ciudad enorme, por lo
 * menos 9-10 veces el tamaño que tiene ahora mismo la zona central». Nueve veces 72 son
 * 648, y 648 es el recinto: no un número redondo elegido a ojo, sino EL MÍNIMO que cumple
 * lo pedido, y además `54 × 12` clavado en la retícula de la ciudad y `9 × 72` clavado en
 * la proporción de un tablero de mesa (nueve casillas por lado entre esquina y esquina).
 *
 * Todo lo de abajo sale de ahí y está razonado con números en `docs/burgo/LA-CIUDAD.md`:
 * la casilla pasa a 72 × 108, la esquina a 108 —nueve celdas de retícula, una manzana
 * urbana entera por esquina—, la muralla y la ronda desaparecen enteras, y el atrezo
 * medieval se cambia por atrezo urbano del pack City Builder. Las piezas que se cayeron
 * están anotadas con su coste en `PIEZAS_EN_ESPERA` de `burgo/piezas.ts`.
 *
 * ═══ LAS MEDIDAS (LA-CIUDAD.md §1) ═══
 *
 *     ANCHO_DE_CASILLA = 72   FONDO_DE_CASILLA = 108   LADO_DE_ESQUINA = 108   CASILLAS_POR_LADO = 11
 *     LADO_EXTERIOR = 9·72 + 2·108 = 864       MEDIO_LADO = 432
 *     LADO_INTERIOR = 864 − 2·108 = 648        BORDE_INTERIOR = 324
 *
 * Y una consecuencia que NO se buscó y que ordena la traza entera: el centro de la casilla
 * `k` (1..9) de un lado está a `72k − 360` del eje del lado, y para `k = 5` sale CERO. Las
 * cuatro casillas 5, 15, 25 y 35 —las Puertas del reglamento, que no se toca— quedan
 * encaradas exactamente con el eje de la ciudad, y por ahí entran las cuatro avenidas.
 *
 * ═══ LA CASILLA, COMO CASILLA DE TABLERO DE MESA (LA-CIUDAD.md §2) ═══
 *
 * Cuatro bandas, medidas como distancia al centro del tablero, de DENTRO (la ciudad) hacia
 * FUERA (el campo), que es como se mira el tablero desde la pose de salida:
 *
 *     324 ── 345   FRANJA DEL BARRIO  21   el color del grupo, con reborde alzado 0,6; ahí y sólo ahí se posan las casas
 *     345 ── 354   FILETE CLARO        9   la raya que separa el color del barrio del campo de la casilla
 *     354 ── 414   SUPERFICIE         60   lo que se lee: el precio y el atrezo
 *     414 ── 432   BORDE CLARO        18   el marco exterior, continuo de casilla a casilla y por las cuatro esquinas
 *
 * Las cuatro son la banda de antes multiplicada por 2,25 y redondeada a entero (9→21, 4→9,
 * 27→60, 8→18): la casilla crece pero se lee IGUAL, porque lo que la define es la
 * proporción entre sus bandas y no su tamaño. Lo que NO se multiplica por 2,25 es lo que
 * mide una pieza del pack —un peón viene midiendo 1,272 y un aventurero 2,543—, y de ahí
 * salen las consecuencias que hay que decidir a mano: el CARRIL del avatar (que se mide en
 * peones, no en casillas), el RITMO de la marcha (ver `peon.ts`) y la TALLA a la que se
 * instancian el peón, la casa y el hotel, que tiene su propia sección más abajo.
 *
 * El reborde de la franja mide 0,6, que es lo que mide un bordillo de acera del City
 * Builder (medido en `road_straight`): la casilla se lee como casilla y no como una loseta
 * de suelo porque tiene un canto de verdad en su arista interior.
 *
 * Dentro de la casilla se trabaja en coordenadas `(u, v)`: `u` a lo largo del anillo, de
 * −36 a +36, con `+u` en el sentido de la marcha; `v` radial, de 0 (el borde de la ciudad)
 * a 108 (el borde del campo). `v = radial − BORDE_INTERIOR`.
 *
 *     v = 10,5    las cuatro casas (10,34 de frente, 12 de paso) y el hotel en el medio
 *     v = 15      la bandera del dueño
 *     v = 25,5    la fila de seis peones (3,375 de huella), centrada en el filete, con 7 de paso
 *     v = 45      el precio, en dígitos de 27 de alto
 *     v = 60..90  el atrezo: la mitad exterior de la superficie, entera y sin pisar el marco
 *
 * ═══ EL CARRIL DEL AVATAR NO CRECE CON LA CASILLA ═══
 *
 * `LINEA_DE_LA_MARCHA` (349,5) es el centro del filete claro, o sea `v = 25,5`: la polilínea
 * por la que anda el aventurero es la misma fila en la que se posan los peones. A su
 * alrededor hay un CARRIL libre (`CARRIL_DEL_AVATAR`, de `v = 23` a `v = 29`) que ninguna
 * pieza puede pisar.
 *
 * Y aquí está la diferencia con todo lo demás: el carril NO se multiplica por 2,25 al
 * crecer el tablero, porque lo que tiene que caber dentro son un peón y un aventurero
 * (2,543 de alto, puesto `AVENTURERO_HACIA_EL_SOLAR` = 1,2 hacia fuera), y el aventurero
 * mide lo que mide una persona en este mundo, que no depende del tamaño de la casilla.
 * Seis unidades de carril daban para cuatro peones y medio de los de talla 1; con el peón a
 * `DIAMETRO_DEL_PEON` (3,375) dan para uno y tres cuartos, y el peón centrado en 25,5 llega
 * de 23,81 a 27,19 con el carril de 23 a 29: sigue cabiendo, y es el carril quien pone el
 * techo de 5,0 al diámetro del peón. Lo que el tablero grande regala no es carril, es SITIO
 * ALREDEDOR del carril, y por eso la bandera del dueño puede subir de 6,5 a 15 (donde de
 * verdad se ve, en medio de la franja del barrio) sin acercarse a la marcha: llega a 16,7 y
 * el carril empieza en 23, o sea 6,3 de holgura. La vacuna del comprobador es ponerla en
 * `v = 22`, pegada al filete, donde SÍ invade.
 *
 * ═══ EL ATREZO CABE EN LA SUPERFICIE, Y NO PISA EL MARCO ═══
 *
 * La banda de atrezo es la MITAD EXTERIOR de la superficie —`v = 60..90`, con su centro en
 * 75— y acaba exactamente donde empieza el BORDE CLARO. Un edificio de pie encima del marco
 * deshace justo lo que Miguel pidió («casillas mejor definidas»), así que el tope no es
 * decorativo: `verify:burgo-escena` mide la caja real de cada pieza contra él.
 *
 * Con 60 de superficie y 72 de frente cabe algo que antes no cabía: un FRENTE DE MANZANA de
 * dos cuerpos en vez de un edificio suelto en mitad de un solar vacío. Dos `cuerpo-*` a
 * `u = ±13` miden entre 14,5 y 32 de frente de los 70 que la casilla permite, y siguen
 * siendo «pocos elementos 3d»: lo que hace que una casilla se lea como casilla es la franja
 * de color, el filete, el marco y el precio grande, no el atrezo. En calidad sobria el
 * segundo cuerpo se cae (va marcado `menudo`) y queda el de siempre.
 *
 * ═══ LA ORIENTACIÓN, Y POR QUÉ ÉSTA ═══
 *
 * Con la cámara de salida mirando desde +Z (el lado sur es el más cercano): la Puerta
 * Mayor (0) es la esquina SURESTE (+349,5, +349,5); la marcha va hacia el OESTE por el lado
 * sur (1–9: `x = 360 − 72k`, `z = +349,5`), la Mazmorra (10) en la suroeste, sube por el
 * oeste (11–19: `x = −349,5`, `z = 360 − 72k`), la Feria (20) en la noroeste, cruza el norte
 * (21–29: `x = −360 + 72k`, `z = −349,5`), ¡A la Mazmorra! (30) en la noreste y baja por el
 * este (31–39: `x = +349,5`, `z = −360 + 72k`). Es EXACTAMENTE lo que `sitioDeCasilla` de
 * `anillo.ts` devuelve, con el desplazamiento radial que lleva del centro de la casilla
 * (378) a la línea de la marcha (349,5).
 *
 * El porqué del reparto de alturas: el reglamento pone en las casillas 1–9 —el lado más
 * cercano a la cámara de salida— los barrios baratos, y el atrezo de un barrio barato son
 * cuerpos de dos plantas; los de cuatro plantas están en el este y el norte. Así ninguno
 * tapa el tablero desde el punto de vista de salida.
 *
 * ═══ EL MARCO DE UNA CASILLA: `fuera` Y `adelante` ═══
 *
 * Cada casilla tiene dos vectores unitarios: `fuera` (del centro del tablero hacia el
 * campo) y `adelante` (el sentido de la marcha). Con ellos cualquier punto de la casilla es
 * `centroDeLaMarcha + fuera · (radial − 349,5) + adelante · u`, y una pieza «que mira hacia
 * dentro» es la que tiene su +Z local apuntando a `−fuera`. Las cuatro rotaciones de cuarto
 * son la tabla `(x, z) → (−z, x)` aplicada `lado` veces; el giro en radianes es
 * `cuartos · π/2` (el `rotation.y` de three), tal como lo cuenta `anillo.ts`.
 *
 * En una ESQUINA el marco es el mismo pero el origen es el centro del tablero, y los puntos
 * se dan como `(u, v)`: `u` a lo largo de `fuera` y `v` a lo largo de `−adelante`, los dos
 * como distancias absolutas al centro del tablero (324..432). La marcha entra por
 * `v = 349,5` (u de 324 a 349,5) y sale por `u = 349,5` (v de 349,5 a 324): esa ELE,
 * engordada `HOLGURA_DE_LA_MARCHA`, es lo que ninguna pieza de esquina que no sea suelo
 * puede pisar, y `verify:burgo-escena` lo mide.
 *
 * ═══ LA ESQUINA ES UNA MANZANA ENTERA: NUEVE CELDAS POR LADO ═══
 *
 * 108 = 9 × 12. Una esquina son OCHENTA Y UNA celdas de la retícula de la ciudad —antes
 * eran dieciséis—, y por eso las losas de calle del City Builder (12 × 12 medidas) encajan
 * en ella sin un hueco: una escena de esquina se escribe con las mismas piezas y en la misma
 * malla que la ciudad de dentro. Los centros de celda están en `BORDE_INTERIOR + 12a + 6`
 * para `a` de 0 a 8, o sea 330, 342, 354, 366, 378, 390, 402, 414 y 426.
 *
 * La ele de la marcha se come las celdas `a ≤ 2` de los dos brazos, así que las nueve celdas
 * del rincón interior (`a ≤ 2` en los DOS ejes) sólo admiten SUELO —una cebra, una acera—; y
 * a cambio quedan setenta y dos celdas libres para levantar en cada esquina lo que antes no
 * cabía: un cruce con semáforos y coches parados en la Salida, una comisaría con su patio
 * cerrado y su aparcamiento en la Mazmorra, una plaza arbolada con terrazas en la Feria y
 * una avenida de dos carriles en ¡A la Mazmorra! Las cuatro se escriben con generadores
 * (`calleEnU`, `calleEnV`, `soleras`) y no a mano, celda a celda, para que se lean.
 *
 * ═══ EL CAMPO ES UN MANTO, NO UN PUÑADO DE HEXÁGONOS ═══
 *
 * La versión anterior sembraba TREINTA teselas sueltas en dos coronas, y desde arriba se
 * leían como islas flotando sobre un plano. Ahora se ponen TODAS las del panal que caen en
 * la corona: contiguas, sin un hueco, tucadas 0,05 bajo el tablero para que no peleen con
 * él. Lo que la semilla decide no es qué teselas hay, sino dónde caen las MANCHAS de
 * arbolado, colinas y rocas, que van en grupos de dos y tres piezas y nunca sueltas: un
 * paisaje se lee por sus masas, no por sus unidades. Y las nubes van fuera del anillo y a
 * 216 de alto, no encima del tablero.
 *
 * La corona es de CUATRO teselas (50,52 de fondo) y no de tres, porque el paño de dados
 * tiene que caber ENTERO sobre el manto: con tres, el manto acaba en 469,9 y el paño llega
 * a 481. Cuatro teselas son 1.796 losas de 36 triángulos (64.656), que es la partida más
 * gorda del tablero; el precio de que el tablero no flote sobre un plano.
 *
 * ═══ LOS DADOS SE HAN IDO DEL CENTRO, Y NO ES UN CAPRICHO ═══
 *
 * El centro del tablero es ahora la glorieta de la ciudad. El paño de dados y el Concejo
 * bajan al CAMPO, delante del lado sur, que es el más cercano a la cámara desde la pose de
 * salida: se leen como lo que son, la banca y los dados sobre la mesa, al lado del tablero.
 *
 * ═══ EL CAMPO SE SIEMBRA CON LA SEMILLA DEL CÓDIGO ═══
 *
 * Dónde van las manchas y las nubes lo decide `semillaDelCodigo(codigo)`: decorado, NUNCA
 * `ctx.azar` (que es secreto y filtraría la semilla de las reglas). La misma mesa se ve
 * igual en los seis aparatos. El sorteo es el mulberry32 de `embarcadero/cala.ts`, que
 * tampoco importa `three`.
 */
import { medioLado, sitioDeCasilla as sitioEnElAnillo, casillasDelAnillo } from '../../shared/mecanicas/anillo';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { sorteo } from '../embarcadero/cala';
import { AVANCE_DEL_GUARISMO, CAJA_DEL_GUARISMO } from '../iconos';
import { PIEZA, RETICULA_DE_LA_CIUDAD } from './piezas';
import type { NombreDePieza } from './piezas';

/* ────────────────────────────── Las medidas ────────────────────────────── */

export const ANCHO_DE_CASILLA = 72;
export const FONDO_DE_CASILLA = 108;
export const LADO_DE_ESQUINA = 108;
export const CASILLAS_POR_LADO = 11;
/** 40. */
export const CASILLAS = casillasDelAnillo(CASILLAS_POR_LADO);
/** 864. */
export const LADO_EXTERIOR = (CASILLAS_POR_LADO - 2) * ANCHO_DE_CASILLA + 2 * FONDO_DE_CASILLA;
/** 432. */
export const MEDIO_LADO = medioLado(ANCHO_DE_CASILLA, FONDO_DE_CASILLA, CASILLAS_POR_LADO);
/** 648: el recinto de la ciudad. Nueve veces el centro de 72 del primer tablero, que es lo que se pidió. */
export const LADO_INTERIOR = LADO_EXTERIOR - 2 * FONDO_DE_CASILLA;
/** 324: donde empieza la franja del barrio y acaba la ciudad. */
export const BORDE_INTERIOR = MEDIO_LADO - FONDO_DE_CASILLA;

/** Las cuatro bandas de una casilla, de dentro afuera. Suman el fondo (LA-CIUDAD.md §2). */
export const BANDA = { franja: 21, filete: 9, superficie: 60, borde: 18 } as const;

/** Dónde empieza y acaba cada banda, como distancia al centro del tablero. */
export const FRANJA = { desde: BORDE_INTERIOR, hasta: BORDE_INTERIOR + BANDA.franja, centro: BORDE_INTERIOR + BANDA.franja / 2 } as const; // 324 · 345 · 334,5
export const FILETE = { desde: FRANJA.hasta, hasta: FRANJA.hasta + BANDA.filete, centro: FRANJA.hasta + BANDA.filete / 2 } as const; // 345 · 354 · 349,5
export const SUPERFICIE = { desde: FILETE.hasta, hasta: FILETE.hasta + BANDA.superficie, centro: FILETE.hasta + BANDA.superficie / 2 } as const; // 354 · 414 · 384
export const BORDE_CLARO = { desde: SUPERFICIE.hasta, hasta: SUPERFICIE.hasta + BANDA.borde, centro: SUPERFICIE.hasta + BANDA.borde / 2 } as const; // 414 · 432 · 423

/** El reborde alzado de la arista interior de la franja: lo que mide un bordillo del pack, medido. */
export const ALTURA_DEL_REBORDE = 0.6;
/** El filete y el marco se alzan lo justo para que no peleen con la superficie. */
export const ALTURA_DEL_FILETE = 0.2;
export const ALTURA_DEL_BORDE = 0.3;
/** Y a la que va la línea que separa dos casillas: sobre el reborde de la franja, que es lo más alto que cruza. */
export const ALTURA_DE_LA_LINEA = 0.65;

/** La línea de la marcha, a 349,5 del centro: el centro del filete claro, `v = 25,5`. */
export const LINEA_DE_LA_MARCHA = FILETE.centro;

/** `v` de un radial, y al revés: `v` es la distancia a la ciudad, de 0 a 108. */
export function vDeRadial(radial: number): number {
  return radial - BORDE_INTERIOR;
}
export function radialDeV(v: number): number {
  return BORDE_INTERIOR + v;
}

/** Los huecos de la superficie, en `v` (LA-CIUDAD.md §2). */
export const V_DE_LAS_CASAS = 10.5;
export const V_DE_LA_BANDERA = 15;
export const V_DE_LOS_PEONES = vDeRadial(LINEA_DE_LA_MARCHA); // 25,5
export const V_DEL_PRECIO = 45;

/** La banda del atrezo: la mitad exterior de la superficie, sin pisar el marco (ver la cabecera). */
export const ATREZO = { desde: 60, hasta: 90, centro: 75 } as const;

/**
 * EL CARRIL DEL AVATAR: lo que ninguna pieza puede pisar. NO crece con la casilla.
 *
 * Se mide en PEONES, no en casillas: el aventurero se pone `AVENTURERO_HACIA_EL_SOLAR` hacia
 * fuera y mide 1,8 de ancho, así que el carril tiene que cubrir de 25,5 − radio del peón −
 * holgura a 25,5 + 1,2 + 0,9 + holgura. Con el peón del pack a talla 1 (0,636 de radio) seis
 * unidades bastaban y sobraban.
 *
 * Al crecer el peón el carril NO se toca, y ahora es al revés: el carril es quien manda. Con
 * el peón centrado en 25,5 y el borde de dentro en 23, el diámetro no puede pasar de 5,0 sin
 * que el peón invada su propio carril por la parte de la ciudad. `DIAMETRO_DEL_PEON` es 3,375
 * —el patio de la cárcel aprieta antes—, así que el peón llega a 23,81 y quedan 0,81 de
 * holgura. Ensanchar el carril sí sería posible por fuera (llega a 27,19 de 29), pero por
 * dentro se comería la holgura de la bandera del dueño, que acaba en 16,7.
 */
export const CARRIL_DEL_AVATAR = { desde: 23, hasta: 29 } as const;

/** Cuánto engorda la ele de la marcha en una esquina para que ninguna pieza la pise. */
export const HOLGURA_DE_LA_MARCHA = 2;

/** Lo más ancho que puede ser el atrezo de una casilla: deja una unidad a cada lado. */
export const FRENTE_MAXIMO_DEL_ATREZO = ANCHO_DE_CASILLA - 2;

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
  /** El punto de la LÍNEA DE LA MARCHA de esta casilla (en una esquina, el punto de paso). */
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
    ? suma(por(fuera, LINEA_DE_LA_MARCHA), por(adelante, -LINEA_DE_LA_MARCHA))
    : suma({ x: sitio.x, z: sitio.z }, por(fuera, LINEA_DE_LA_MARCHA - (MEDIO_LADO - FONDO_DE_CASILLA / 2)));
  const marco: MarcoDeCasilla = { indice, lado: sitio.lado, esEsquina: sitio.esEsquina, cuartos: sitio.cuartos, fuera, adelante, centro };
  marcos[indice] = marco;
  return marco;
}

/** El punto de la marcha de la casilla `i` y sus cuartos de giro hacia fuera: lo que pide el diseño. */
export function sitioDeCasilla(i: number): { readonly x: number; readonly z: number; readonly cuartos: 0 | 1 | 2 | 3; readonly esEsquina: boolean } {
  const m = marcoDeCasilla(i);
  return { x: m.centro.x, z: m.centro.z, cuartos: m.cuartos, esEsquina: m.esEsquina };
}

/** Un punto de una casilla LATERAL: `radial` es la distancia al centro del tablero, `u` va en el sentido de la marcha. */
export function puntoEnCasilla(marco: MarcoDeCasilla, radial: number, u: number): Punto {
  return suma(suma(marco.centro, por(marco.fuera, radial - LINEA_DE_LA_MARCHA)), por(marco.adelante, u));
}

/** Lo mismo, pero dando `v` (0..48) en vez del radial: es como está escrita la tabla de atrezo. */
export function puntoEnLaCasillaPorV(marco: MarcoDeCasilla, u: number, v: number): Punto {
  return puntoEnCasilla(marco, radialDeV(v), u);
}

/** Un punto de una ESQUINA: `u` a lo largo de `fuera`, `v` a lo largo de `−adelante`, los dos absolutos (144..192). */
export function puntoEnEsquina(marco: MarcoDeCasilla, u: number, v: number): Punto {
  return suma(por(marco.fuera, u), por(marco.adelante, -v));
}

/** Las coordenadas de un punto del mundo en el marco de una casilla lateral: `radial` y `u`. */
export function enElMarco(marco: MarcoDeCasilla, p: Punto): { readonly radial: number; readonly aLoLargo: number; readonly v: number } {
  const radial = punto(p, marco.fuera);
  return { radial, aLoLargo: punto(suma(p, por(marco.centro, -1)), marco.adelante), v: vDeRadial(radial) };
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

/** Los 40 puntos de marcha, en orden. Las esquinas son los puntos de paso (±155, ±155). */
export function polilineaDeLaMarcha(): readonly Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i < CASILLAS; i++) puntos.push(marcoDeCasilla(i).centro);
  return puntos;
}

export const POLILINEA: readonly Punto[] = polilineaDeLaMarcha();

/** Lo que mide el tramo de la casilla `i` a la siguiente: 32 entre laterales, 27 al llegar a una esquina o salir de ella. */
export function largoDelTramo(i: number): number {
  const a = marcoDeCasilla(i).centro;
  const b = marcoDeCasilla(i + 1).centro;
  return Math.hypot(b.x - a.x, b.z - a.z);
}

/* ────────────────────────── Los huecos de una casilla ────────────────────────── */

/**
 * SEIS HUECOS DE PEÓN EN FILA SOBRE EL FILETE, CON 7 DE PASO.
 *
 * El paso NO cambia al crecer el peón, y conviene decirlo con los dos números delante. Con
 * el peón a talla 1 —1,272 de huella, que es lo que trae el pack— los seis ocupaban 36,3 de
 * los 72 del frente y entre dos había 5,73 de hueco: cuatro peones y medio de aire entre
 * mota y mota, que es justo lo que hacía que una casilla con seis jugadores no se leyera
 * como seis jugadores. Con el peón a `DIAMETRO_DEL_PEON` (3,375) los seis ocupan 38,4 y el
 * hueco baja a 3,625, o sea un peón justo. Ésa es la fila que se lee como fila: seis fichas
 * separadas por una ficha.
 *
 * Que el paso siga valiendo es una comprobación, no una suposición: `verify:burgo-escena`
 * mide la huella en el `.glb`, la multiplica por la talla y exige que dos peones de la misma
 * casilla no se toquen.
 */
export const REJILLA_DE_PEONES = { columnas: 6, filas: 1, paso: 7 } as const;
/**
 * CUATRO HUECOS DE CASA EN FILA SOBRE LA FRANJA DEL BARRIO, CON 12 DE PASO.
 *
 * El paso tampoco cambia, y por la misma razón: lo que cambia es la CASA. A talla 1 medía
 * 2,504 de frente, y cuatro con 12 de paso eran cuatro puntitos con 9,50 de hueco entre
 * ellos —casi cuatro casas de aire— sobre una franja de 21 de fondo. A `TALLA_DE_LA_CASA`
 * mide 10,34 y el hueco queda en 1,66, un sexto de casa: cuatro casas SEGUIDAS, que es como
 * están en un tablero de verdad y lo que el encargo pedía.
 */
export const REJILLA_DE_CASAS = { columnas: 4, filas: 1, paso: 12 } as const;
/** El aventurero se pone en el hueco de peón de su asiento, 1,2 hacia el campo. */
export const AVENTURERO_HACIA_EL_SOLAR = 1.2;
/** La bandera de dueño, en la esquina de «adelante» de la franja, lejos del carril (ver la cabecera). */
export const HUECO_DE_LA_BANDERA = { u: 30, v: V_DE_LA_BANDERA } as const;

/** El hueco `asiento` de una rejilla de `columnas × filas`, centrado: devuelve el desplazamiento (columna, fila). */
function huecoDeRejilla(asiento: number, columnas: number, filas: number, pasoColumna: number, pasoFila: number): { readonly c: number; readonly f: number } {
  const n = ((Math.trunc(asiento) % (columnas * filas)) + columnas * filas) % (columnas * filas);
  const columna = n % columnas;
  const fila = Math.trunc(n / columnas);
  return { c: (columna - (columnas - 1) / 2) * pasoColumna, f: (fila - (filas - 1) / 2) * pasoFila };
}

/**
 * LA REJILLA DE PEONES DE UNA ESQUINA, SOBRE EL TRAMO DE SALIDA DE LA MARCHA.
 *
 * En una casilla lateral los seis van en fila sobre el filete, que es la línea de la marcha.
 * En una esquina no hay filete, y la tentación es apartarlos a la parte de dentro; pero
 * entonces el aventurero que se queda quieto en su hueco aparece lejos de la polilínea, y
 * eso es exactamente lo que `verify:burgo-escena` llama «salirse». Así que van pegados al
 * tramo por el que se SALE de la esquina (`u = 349,5`), y en FILA INDIA por ese brazo.
 *
 * ═══ ERA 3 × 2, Y EL PEÓN GRANDE LA MATÓ (decisión de esta tanda) ═══
 *
 * La rejilla vieja era de tres columnas por dos filas, con las dos filas separadas 1,4 a lo
 * largo de `u` —«lo justo para que dos peones de 1,272 de huella no se toquen»—. Ese 1,4 es
 * el número que ató la rejilla a un peón de 1,272 y a ningún otro: con el peón a 3,375 las
 * dos filas se solapan, y ensancharlas no es una opción, porque el aventurero se pone 1,2
 * hacia fuera del hueco y con dos filas separadas `p` se despega de la línea `p/2 + 1,2`.
 * Para no pasar de las dos unidades que el comprobador exige haría falta `p ≤ 1,6`, que es
 * menos de medio peón. O sea: con dos filas no cabe ningún peón que se vea.
 *
 * Con UNA fila el problema desaparece entero: los seis van todos en `u = 349,5`, el
 * aventurero se despega exactamente 1,2 —la mitad del tope— y no hay nada que ensanchar.
 * Y de paso la esquina se lee igual que un lateral: seis fichas en fila por donde se anda.
 *
 * El brazo de salida va de 324 (el borde de la ciudad) a 349,5 (el punto de la esquina): 25,5
 * de largo. Seis peones de 3,375 con 4 de paso ocupan 20 de centro a centro, y centrados en
 * 337,5 caen de 327,5 a 347,5; el de más adentro llega a 325,81 con 1,81 de sobra hasta la
 * ciudad, y el de más afuera a 349,19, dentro del brazo. El paso 4 deja 0,625 de hueco entre
 * peón y peón —y 0,29 entre disco y disco, que es lo que de verdad aprieta—. Están en la ele
 * a propósito: la ele es SU sitio, y lo que no puede pisarla es el decorado.
 *
 * `pasoU` queda en 0 porque con una sola fila no hay nada que separar a lo largo de `u`; se
 * deja el campo para que la rejilla siga teniendo la misma forma que la de visitas.
 */
export const REJILLA_DE_PEONES_DE_ESQUINA = { columnas: 6, filas: 1, centroU: LINEA_DE_LA_MARCHA, centroV: 337.5, pasoU: 0, pasoV: 4 } as const;

/**
 * EL HUECO DE PEÓN de un asiento en una casilla. En la Mazmorra (10) es el hueco de VISITA:
 * los presos tienen el suyo (`huecoDePreso`).
 */
export function huecoDePeon(casilla: number, asiento: number): Punto {
  const m = marcoDeCasilla(casilla);
  if (m.indice === MAZMORRA) return huecoDeVisita(asiento);
  if (m.esEsquina) {
    const r = REJILLA_DE_PEONES_DE_ESQUINA;
    const { c, f } = huecoDeRejilla(asiento, r.columnas, r.filas, r.pasoV, r.pasoU);
    return puntoEnEsquina(m, r.centroU + f, r.centroV + c);
  }
  const { c } = huecoDeRejilla(asiento, REJILLA_DE_PEONES.columnas, REJILLA_DE_PEONES.filas, REJILLA_DE_PEONES.paso, 0);
  return puntoEnLaCasillaPorV(m, c, V_DE_LOS_PEONES);
}

/** Donde se pone el aventurero de un asiento: su hueco de peón, 1,2 hacia el campo. */
export function huecoDeAventurero(casilla: number, asiento: number): Punto {
  const m = marcoDeCasilla(casilla);
  return suma(huecoDePeon(casilla, asiento), por(m.fuera, AVENTURERO_HACIA_EL_SOLAR));
}

/** El hueco de casa `k` (0..3) de una casilla lateral, en la franja del barrio. */
export function huecoDeCasa(casilla: number, k: number): Punto {
  const m = marcoDeCasilla(casilla);
  const { c } = huecoDeRejilla(k, REJILLA_DE_CASAS.columnas, REJILLA_DE_CASAS.filas, REJILLA_DE_CASAS.paso, 0);
  return puntoEnLaCasillaPorV(m, c, V_DE_LAS_CASAS);
}

/** El hueco de la posada: la casa centrada en la franja. */
export function huecoDePosada(casilla: number): Punto {
  return puntoEnLaCasillaPorV(marcoDeCasilla(casilla), 0, V_DE_LAS_CASAS);
}

/** La bandera del dueño de una casilla lateral. */
export function huecoDeBandera(casilla: number): Punto {
  return puntoEnLaCasillaPorV(marcoDeCasilla(casilla), HUECO_DE_LA_BANDERA.u, HUECO_DE_LA_BANDERA.v);
}

/* ─────────────────────────── El precio, en dígitos ─────────────────────────── */

/**
 * EL PRECIO SE LEE, Y ESO SE MIDIÓ.
 *
 * En el lienzo no hay texto: el precio son CONTORNOS compilados (`escenas/iconos.ts`,
 * `CONTORNOS_DEL_GUARISMO`), que se normalizan TODOS por `CAJA_DEL_GUARISMO` —no por la
 * caja de cada uno, o el `1` saldría tan ancho como el `8`— y se separan
 * `AVANCE_DEL_GUARISMO`.
 *
 * EL ALTO SE MULTIPLICA POR 2,25 CON LA CASILLA, Y ÉSA ES TODA LA RAZÓN. Un tablero 2,25
 * veces más grande se ve 2,25 veces más pequeño en la misma pantalla: un dígito que no
 * creciera perdería exactamente los píxeles que el tablero gana en unidades. 12 × 2,25 = 27.
 *
 * A 27 de alto: 20,25 de ancho, 22,95 de avance, y tres dígitos ocupan 66,15 de los 72 de la
 * casilla, con 2,93 de margen a cada lado (a 28 ya se quedan en 1,7 y a 30 no caben). Los
 * píxeles medidos con `proyecta` desde la pose de salida salen IGUALES que antes —16,3 px en
 * un PC 16:9, 9,9 en una tableta 3:4 y 5,0 en el móvil de 9:19,5 con el lienzo al 58 %—
 * porque el cociente `alto / alcance` no ha cambiado: 27/570,24 = 12/253,44. Y al seguir al
 * que mueve (cercanía 0,42), que es cuando de verdad se lee, el dígito pasa de 16 px en el
 * móvil. `verify:burgo-escena` vuelve a proyectar las dos medidas en las tres ventanas.
 */
export const ALTO_DEL_GUARISMO = 27;
export const ANCHO_DEL_GUARISMO = (ALTO_DEL_GUARISMO * CAJA_DEL_GUARISMO.ancho) / CAJA_DEL_GUARISMO.alto;
export const AVANCE_DEL_PRECIO = (ALTO_DEL_GUARISMO * AVANCE_DEL_GUARISMO) / CAJA_DEL_GUARISMO.alto;

/**
 * LO QUE CUESTA CADA CASILLA, COPIADO DEL REGLAMENTO Y VIGILADO.
 *
 * El precio es del reglamento (`shared/arcade/juegos/burgo-tablero.ts`, columna `precio`),
 * pero `escenas/` no importa `shared/arcade` en EJECUCIÓN —el contrato de `tipos.ts` es
 * `import type`, que se borra al compilar, justamente para que la escena no arrastre el
 * reductor al móvil— y `CasillaEn3D` no publica hoy el precio. Así que aquí va la columna,
 * y `verify:burgo-escena` la compara casilla a casilla contra `CASILLAS` del reglamento
 * (el comprobador SÍ puede importar `shared/`, como hace `verificar-escena.ts`): una
 * divergencia se ve caer en la batería, no en la mesa.
 *
 * Un 0 quiere decir «esta casilla no lleva cifra»: las tres Arcas, los tres Pregones y las
 * cuatro esquinas. El Diezmo y la Alcabala no son títulos pero sí llevan cifra —lo que
 * cobran— y usan el mismo hueco.
 */
export const PRECIO_DE_LA_CASILLA: readonly number[] = [
  0, 60, 0, 60, 200, 200, 100, 0, 100, 120, // 0..9
  0, 140, 150, 140, 160, 200, 180, 0, 180, 200, // 10..19
  0, 220, 0, 220, 240, 200, 260, 260, 150, 280, // 20..29
  0, 300, 300, 0, 320, 200, 0, 350, 100, 400, // 30..39
];

/** Un guarismo puesto en el tablero: el contorno que toca, dónde y de qué talla. */
export interface GuarismoEnElTablero {
  readonly guarismo: string;
  readonly x: number;
  readonly z: number;
  /** El `rotation.y` con el que el contorno se lee desde fuera del anillo. */
  readonly giro: number;
  readonly alto: number;
}

/** Los dígitos del precio de una casilla, ya en el mundo. Vacío si la casilla no lleva cifra. */
export function guarismosDelPrecio(casilla: number): GuarismoEnElTablero[] {
  const m = marcoDeCasilla(casilla);
  const precio = PRECIO_DE_LA_CASILLA[m.indice] ?? 0;
  if (m.esEsquina || precio <= 0) return [];
  const cifras = String(precio).split('');
  const ancho = (cifras.length - 1) * AVANCE_DEL_PRECIO;
  const giro = giroHaciaDentro(m);
  /*
   * LOS DÍGITOS SE ESCRIBEN HACIA −`adelante`, Y NO ES UN CAPRICHO: ES DÓNDE ESTÁ QUIEN LEE.
   *
   * Un rótulo TUMBADO se lee desde FUERA del anillo, que es donde está la cámara. Para un ojo
   * puesto en `+fuera` mirando al centro, el «arriba» de la pantalla proyectado en el suelo es
   * `−fuera` y la «derecha» es `−adelante` (el producto vectorial, con `adelante = unCuarto(fuera)`).
   * Escribirlos hacia `+adelante` —que es lo que hacía la primera versión— sale ESPEJADO: en el
   * banco el 60 se leía «06» y el 400 «004», y eso no parece un fallo de orientación sino una
   * fuente rara. Se vio mirando, y por eso `verify:burgo-escena` lo mide ahora con el producto
   * vectorial y no con los ojos.
   */
  return cifras.map((guarismo, k) => {
    const p = puntoEnLaCasillaPorV(m, ancho / 2 - k * AVANCE_DEL_PRECIO, V_DEL_PRECIO);
    return { guarismo, x: p.x, z: p.z, giro, alto: ALTO_DEL_GUARISMO };
  });
}

/** Lo que ocupa el precio de una casilla a lo largo de `u`: `(cifras − 1) · avance + ancho`. */
export function anchoDelPrecio(casilla: number): number {
  const precio = PRECIO_DE_LA_CASILLA[marcoDeCasilla(casilla).indice] ?? 0;
  if (precio <= 0) return 0;
  return (String(precio).length - 1) * AVANCE_DEL_PRECIO + ANCHO_DEL_GUARISMO;
}

/* ──────────────── La talla de las piezas que son de un jugador ──────────────── */

/**
 * LAS PIEZAS DEL PACK NO SON PIEZAS DE ESTE TABLERO, Y SE VE EN LA PRIMERA CAPTURA.
 *
 * `burgo.glb` trae las fichas de Board Game Bits horneadas a la escala del MUNDO —una
 * casa-ficha mide una persona, 2,543— y hasta esta tanda se instanciaban a talla 1. Sobre un
 * tablero cuya casilla mide 72 × 108 eso da esto, medido con `@gltf-transform` sobre el
 * fichero de verdad:
 *
 *     peón      1,272 de huella  ·  2,326 de alto   →  el 1,8 % del frente de su casilla
 *     casa      2,504 × 2,543    ·  2,543 de alto   →  el 12 % del fondo de la franja
 *     hotel     LA MISMA CASA, a talla 1
 *
 * Y al lado, en la misma casilla, el dígito del precio mide 20,25 de ancho: DIECISÉIS VECES
 * la huella del peón. Desde la vista de tablero un jugador no era una ficha, era una mota; las
 * cuatro casas eran cuatro puntos separados por nueve unidades de hueco; y cuatro casas y un
 * hotel —la decisión económica más cara del juego— eran indistinguibles, porque el hotel ERA
 * una casa con una bandera encima.
 *
 * Aquí están las tres tallas que lo arreglan, cada una con el número de dónde sale. Escalar no
 * cuesta un triángulo ni una llamada de dibujo: son las mismas mallas instanciadas, con otra
 * matriz. `verify:burgo-escena` mide las huellas en el `.glb`, las multiplica por estas tallas
 * y comprueba que nada se sale de su casilla, que nada pisa el carril del avatar y que un
 * hotel se distingue de una casa.
 *
 * ═══ POR QUÉ ESTAS MEDIDAS SE ESCRIBEN AQUÍ Y NO SE LEEN ═══
 *
 * Este fichero no abre un `.glb`: es aritmética pura que corre en Node y en los dos clientes.
 * Así que la huella del pack se escribe como constante MEDIDA, igual que `ALTURA_DEL_REBORDE`
 * escribe el bordillo del City Builder. Que lo escrito sea lo que el fichero trae no es una
 * promesa: es una comprobación de `verify:burgo-escena`, con su vacuna.
 */
export const HUELLA_DEL_PEON = 1.272;
export const ALTO_DEL_PEON_EN_EL_PACK = 2.326;
export const HUELLA_DE_LA_CASA = { ancho: 2.504, fondo: 2.543, alto: 2.543 } as const;

/**
 * EL PEÓN: LA SEXTA PARTE DE UN DÍGITO, QUE ES LO QUE EL PATIO DE LA CÁRCEL DEJA.
 *
 * El dígito del precio es la única referencia honrada de «lo que se lee a esta distancia»: se
 * midió en píxeles con `proyecta` desde la pose de salida —16,3 px en un PC 16:9, 9,9 en una
 * tableta y 5,0 en el móvil— y de ahí salió su alto de 27, con 20,25 de ancho. Un peón no
 * tiene por qué ser tan ancho como un precio; pero a un dieciseisavo era invisible, y un
 * octavo (2,53) tampoco se ve.
 *
 * La sexta parte —3,375— es a la vez la fracción que se ve y el TECHO que el tablero permite,
 * y las dos cosas coinciden por casualidad. Los tres sitios que ponen techo, de más apretado a
 * menos:
 *
 *     el patio de la cárcel   12 × 12 con tres presos de frente   →  3,4 con aire, 4,0 a tope
 *     el brazo de una esquina 25,5 de largo con seis en fila      →  4,3
 *     el carril del avatar    de v = 23 a v = 29, centrado en 25,5 →  5,0
 *
 * Así que el peón crece 2,65 veces: de 1,272 a 3,375 de huella y de 2,326 a 6,17 de alto. A
 * 55° de altura de cámara —los `MIRADOR_DEL_BURGO`— lo que se ve de una pieza es su huella por
 * 0,82 más su alto por 0,57, de modo que el peón pasa de tapar 3,0 unidades cuadradas de
 * lienzo a tapar 21,3: siete veces. Sigue siendo la vigésima parte de un dígito en superficie,
 * y ésa es la verdad: el peón no puede competir con el precio mientras la cárcel mida 12.
 *
 * Se escala UNIFORME a propósito. Un peón estirado a lo alto se leería algo mejor —el alto es
 * lo único que no tiene techo, porque encima del peón no hay nada—, pero deja de ser la pieza
 * del pack y empieza a ser otra; y con la cámara a 55° la huella pesa más que el alto de todos
 * modos.
 */
export const DIAMETRO_DEL_PEON = ANCHO_DEL_GUARISMO / 6; // 3,375
export const TALLA_DEL_PEON = DIAMETRO_DEL_PEON / HUELLA_DEL_PEON; // 2,6533
export const ALTO_DEL_PEON = ALTO_DEL_PEON_EN_EL_PACK * TALLA_DEL_PEON; // 6,1716

/**
 * EL DISCO DE CONTACTO crece con el peón o deja de estar debajo de la pieza.
 *
 * Era 0,7 de radio para un peón de 0,636 de RADIO —la huella es el doble, 1,272—: o sea 1,1
 * veces el radio de la pieza, que es lo que hace que la sombra asome un poco por fuera en vez
 * de quedar escondida debajo. Se conserva esa proporción, no el número. Con el paso 4 de las
 * rejillas de esquina y el 3,9 del patio, dos discos vecinos quedan a 0,29 y a 0,19 de
 * distancia: no se tocan, y eso lo mide el comprobador.
 *
 * OJO AL SEGUNDO CLIENTE: esta misma malla es el disco del AVENTURERO en calidad plena
 * (`Burgo.tsx`, «el disco del aventurero en pie»), que la instancia con un 1,1 más encima. La
 * figura de KayKit NO ha crecido con el peón —mide lo que mide una persona en este mundo—,
 * así que su disco pasó de 1,54 de diámetro a 4,08 bajo una figura de 1,8 de ancho. Está
 * anotado con el resto de lo que el peón grande deja abierto en §13.5 de `docs/burgo/DISENO-3.md`.
 */
export const RADIO_DEL_DISCO_DEL_PEON = (DIAMETRO_DEL_PEON / 2) * 1.1; // 1,85625

/**
 * LA CASA: LA MITAD DEL FONDO DE LA FRANJA DEL BARRIO.
 *
 * La franja es la banda de color del grupo, 21 de fondo (`BANDA.franja`), y es el sitio de la
 * casa: ahí y sólo ahí se posan. Una casa que ocupe la MITAD de ese fondo —10,5— deja 5,25
 * libres hacia la ciudad y 5,25 hacia el filete, o sea la casa centrada en su banda con un
 * cuarto de banda a cada lado. Es la proporción de un tablero de mesa, donde la casita ocupa
 * el grueso de la tira de color y no un punto en medio de ella.
 *
 * A esa talla la casa mide 10,34 de frente, y con el paso 12 que la rejilla ya tenía quedan
 * 1,66 entre casa y casa: cuatro casas seguidas que ocupan 46,3 de los 72 del frente. Antes
 * ocupaban 38,5 de los cuales 28,4 eran hueco.
 *
 * No crece más por dos razones que se pueden señalar: a dos tercios de la franja (14 de fondo)
 * la casa mediría 13,8 de frente y ya no cabrían cuatro con paso 12 —habría que abrir la
 * rejilla a 14, y entonces la de más afuera llegaría a 28, a tres décimas del mástil de la
 * bandera del dueño—; y la mitad es lo que deja al hotel un tercio más de fondo por delante
 * sin salirse tampoco.
 */
export const FONDO_DE_LA_CASA = BANDA.franja / 2; // 10,5
export const TALLA_DE_LA_CASA = FONDO_DE_LA_CASA / HUELLA_DE_LA_CASA.fondo; // 4,129
export const ANCHO_DE_LA_CASA = HUELLA_DE_LA_CASA.ancho * TALLA_DE_LA_CASA; // 10,339
export const ALTO_DE_LA_CASA = HUELLA_DE_LA_CASA.alto * TALLA_DE_LA_CASA; // 10,5

/**
 * EL HOTEL: LA MISMA PIEZA ESTIRADA, PORQUE NO HAY HOTEL EN NINGÚN PACK.
 *
 * La decisión 12 del presupuesto ya decía que la posada se pinta con la geometría de la casa:
 * los ocho packs del disco no traen un hotel, y meter un modelo nuevo cuesta triángulos y una
 * llamada de dibujo más. Lo que la decisión 12 NO decía es a qué talla, y por eso hasta ahora
 * un hotel era literalmente una casa a talla 1 con una bandera clavada encima: la diferencia
 * entre tener cuatro casas y tener un hotel —la más cara del reglamento— no se veía.
 *
 * Se arregla sin modelo nuevo y sin un triángulo más, dándole al hotel un VOLUMEN propio: la
 * misma malla con una escala distinta en cada eje, que es lo que la convierte de cubo en
 * bloque alargado. Los tres números salen de lo que el hotel SUSTITUYE y de la banda en la que
 * vive:
 *
 *     frente  22,34  = lo que ocupan dos casas seguidas de borde a borde (10,34 + el paso 12)
 *     fondo   14     = dos tercios de la franja, frente a la mitad que ocupa una casa
 *     alto    14     = tanto como hondo: un tercio más alto que una casa
 *
 * O sea: 2,16 veces más ancho, 1,33 más hondo y 1,33 más alto que una casa; casi el triple de
 * huella y cerca de cuatro veces el volumen. Cuatro casas son cuatro cubos repartidos por 46,3
 * de frente; un hotel es un bloque largo y más alto plantado en el medio con la bandera del
 * dueño en el tejado. A un vistazo son dos cosas distintas, que es lo que se pedía.
 *
 * La pieza se estira a lo largo de `u` —el sentido de la marcha— porque su `+X` local cae ahí
 * cuando mira hacia dentro del anillo, y es la dirección en la que la casilla tiene 72 y la
 * franja sólo 21. Estirarla en fondo la sacaría de la franja al tercer intento.
 */
export const ANCHO_DEL_HOTEL = ANCHO_DE_LA_CASA + REJILLA_DE_CASAS.paso; // 22,339
export const FONDO_DEL_HOTEL = (BANDA.franja * 2) / 3; // 14
export const ALTO_DEL_HOTEL = FONDO_DEL_HOTEL; // 14
/** Lo que `Burgo.tsx` le pone a la matriz del hotel, eje por eje, sobre la malla de la casa. */
export const TALLA_DEL_HOTEL = {
  ancho: ANCHO_DEL_HOTEL / HUELLA_DE_LA_CASA.ancho, // 8,921
  alto: ALTO_DEL_HOTEL / HUELLA_DE_LA_CASA.alto, // 5,505
  fondo: FONDO_DEL_HOTEL / HUELLA_DE_LA_CASA.fondo, // 5,505
} as const;

/**
 * LA BANDERA DEL HOTEL va clavada en su tejado, y el tejado ha subido de 2,543 a 14. El `alza`
 * se deriva del alto del hotel para que no puedan discrepar: una bandera flotando a 2,45 sobre
 * un bloque de 14 sería un fallo que nadie ve en el código y que se ve en la primera captura.
 * El desplazamiento de 0,6 a lo largo de `u` se queda: sobre un tejado de 22,34 de frente es
 * prácticamente el centro, y es lo que aparta el mástil del caballete de la cubierta.
 */
export const BANDERA_SOBRE_LA_POSADA = { alza: ALTO_DEL_HOTEL, u: 0.6 } as const;

/* ─────────────────────────────── Las esquinas ─────────────────────────────── */

export const PUERTA_MAYOR = 0;
export const MAZMORRA = 10;
export const FERIA = 20;
export const A_LA_MAZMORRA = 30;
export const ESQUINAS: readonly number[] = [PUERTA_MAYOR, MAZMORRA, FERIA, A_LA_MAZMORRA];
/** Las cuatro puertas del juego. Son los ejes de las dos avenidas de la ciudad. */
export const PUERTAS: readonly number[] = [5, 15, 25, 35];

/** El centro de la celda `a` (0..8) de la retícula de una esquina: 330, 342, 354, 366, 378, 390, 402, 414, 426. */
export function celdaDeEsquina(a: number): number {
  return BORDE_INTERIOR + RETICULA_DE_LA_CIUDAD * a + RETICULA_DE_LA_CIUDAD / 2;
}
export const CELDAS_POR_ESQUINA = LADO_DE_ESQUINA / RETICULA_DE_LA_CIUDAD; // 9

/** Lo que sube la reja de la cárcel al abrirse, en unidades: la verja mide 3. */
export const SUBIDA_DE_LA_REJA = 4;

/**
 * LA CÁRCEL. El patio es UNA celda de la retícula (12 × 12) en el centro de la manzana de la
 * comisaría —la celda (6, 6) de las nueve por lado—, cerrado por dos lados con verja y por
 * los otros dos con los bloques del pack, con dos hojas de puerta, una de las cuales sube al
 * encerrar a un peón. Los seis huecos de preso son una rejilla 3 × 2 dentro del patio; los
 * seis de visita, otra sobre el tramo de entrada de la marcha, a siete celdas de allí.
 */
export const CELDA = { u: celdaDeEsquina(6), v: celdaDeEsquina(6), lado: RETICULA_DE_LA_CIUDAD } as const; // 402 · 402 · 12
/**
 * LOS SEIS PRESOS EN EL PATIO, Y POR QUÉ ESTE PATIO ES EL TECHO DEL PEÓN ENTERO.
 *
 * El patio mide una celda de la retícula: 12 × 12. Seis presos en 3 × 2 quieren tres peones
 * de frente, y tres de frente en 12 es la cuenta más apretada que hay en todo el tablero:
 * `3 · D + 2 · hueco + 2 · holgura ≤ 12`. Con `D = 3,375`, paso 3,9 y 0,41 hasta la verja,
 * sale 11,18 de los 12. Con `D = 4` no queda ni un pelo, y con `D = 4,5` —lo que el carril
 * del avatar admitiría de sobra— los presos atraviesan la verja.
 *
 * Por eso `DIAMETRO_DEL_PEON` vale lo que vale: no lo decide la casilla, que da para mucho
 * más; lo decide la habitación más pequeña del tablero. Queda escrito aquí para que el día
 * que alguien quiera un peón mayor sepa dónde tiene que mirar primero.
 *
 * El paso de las filas es 4,2 y no 3,9 porque a lo largo de `v` sobra sitio (dos filas usan
 * 4,2 de los 12) y un poco más de aire entre las dos hileras se lee mejor desde arriba.
 */
export const REJILLA_DE_PRESOS = { columnas: 3, filas: 2, pasoU: 3.9, pasoV: 4.2 } as const;
/**
 * LOS SEIS DE VISITA van sobre el tramo por el que se ENTRA en la esquina (`v = 349,5`), o
 * sea en la acera de delante de la cárcel y no en mitad del patio. Por el mismo motivo que
 * los peones de esquina: quien está de visita no está preso, y su aventurero se mide contra
 * la polilínea. El tramo de entrada es el otro brazo de la ele, así que no se pisan con
 * nadie, y con el patio a siete celdas de allí no hay manera de confundirlos.
 *
 * Es la rejilla de esquina reflejada, y ha cambiado por lo mismo: era 3 × 2 con las dos
 * filas a 1,4 en radial, un número calibrado para el peón de 1,272 y para ninguno más. Ahora
 * son seis en FILA INDIA por el brazo de entrada, con el mismo paso 4 y el mismo centro
 * 337,5, de 327,5 a 347,5. Así ningún visitante se despega de la línea de la marcha.
 */
export const REJILLA_DE_VISITAS = { centroU: 337.5, centroV: LINEA_DE_LA_MARCHA, columnas: 6, filas: 1, pasoU: 4, pasoV: 0 } as const;

export function huecoDePreso(asiento: number): Punto {
  const m = marcoDeCasilla(MAZMORRA);
  const { c, f } = huecoDeRejilla(asiento, REJILLA_DE_PRESOS.columnas, REJILLA_DE_PRESOS.filas, REJILLA_DE_PRESOS.pasoU, REJILLA_DE_PRESOS.pasoV);
  return puntoEnEsquina(m, CELDA.u + c, CELDA.v + f);
}

export function huecoDeVisita(asiento: number): Punto {
  const m = marcoDeCasilla(MAZMORRA);
  const r = REJILLA_DE_VISITAS;
  const { c, f } = huecoDeRejilla(asiento, r.columnas, r.filas, r.pasoU, r.pasoV);
  return puntoEnEsquina(m, r.centroU + c, r.centroV + f);
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
  /** Lo menudo se cae en calidad sobria: sillas, arbustos, farolas, papeleras. */
  readonly menudo?: boolean;
}

/**
 * LAS PIEZAS QUE SON SUELO, y por eso pueden estar debajo de la marcha.
 *
 * Las siete losas de 12 × 12 del City Builder (seis de calle y la parcela) y las dos losas
 * de sala miden 0,6 o menos de alto: se pisan, no se rodean. Todo lo demás que esté en una
 * esquina tiene que quedar fuera de la ele, y `verify:burgo-escena` lo mide con la caja del
 * `.glb` real.
 */
export const PIEZAS_DE_SUELO: readonly NombreDePieza[] = [
  PIEZA.calzada,
  PIEZA.calzadaPaso,
  PIEZA.calzadaCurva,
  PIEZA.calzadaCurvaSuave,
  PIEZA.calzadaCruce,
  PIEZA.calzadaTe,
  PIEZA.solera,
  PIEZA.losa,
  PIEZA.tierra,
];

export function esSuelo(pieza: NombreDePieza): boolean {
  return PIEZAS_DE_SUELO.includes(pieza);
}

/** Lo que sube un coche del pack sobre el asfalto: 0,42 de calzada más los 0,366 que las ruedas bajan del origen. */
export const COCHE_SOBRE_EL_ASFALTO = 0.786;
/** Y lo que sube sobre una `solera`, cuya cara de arriba está a 0,6 y no a 0,42. */
export const COCHE_SOBRE_LA_SOLERA = 0.966;

/**
 * LOS GENERADORES DE UNA ESQUINA, y por qué la esquina no se escribe celda a celda.
 *
 * Una esquina son nueve celdas por lado: ochenta y una. Escritas a mano son ochenta y una
 * líneas por esquina en las que nadie ve un error, y cuatro esquinas son trescientas
 * veinticuatro. Con tres generadores —una calle a lo largo de `u`, una calle a lo largo de
 * `v`, y un puñado de aceras— cada escena cabe en veinte líneas que SE LEEN, y el giro de
 * cada losa lo pone el generador y no el dedo.
 *
 * El convenio del giro es el que ya usaba la tabla anterior y lo comprueba el juez de la
 * ele: una losa de una calle que corre a lo largo de `u` (o sea, `v` fijo) va con
 * `giroEnCuartos = 0`; la que corre a lo largo de `v` (`u` fijo), con 1.
 */
const cel = (a: number): number => celdaDeEsquina(a);

/** Una calle a lo largo de `u`, en la fila `av`: una losa por cada `au`, con la pieza que se le diga. */
function calleEnU(av: number, tramos: readonly (readonly [number, NombreDePieza])[]): PiezaDeEsquina[] {
  return tramos.map(([au, pieza]) => ({ pieza, u: cel(au), v: cel(av), giroEnCuartos: 0 }));
}

/** Una calle a lo largo de `v`, en la columna `au`. */
function calleEnV(au: number, tramos: readonly (readonly [number, NombreDePieza])[]): PiezaDeEsquina[] {
  return tramos.map(([av, pieza]) => ({ pieza, u: cel(au), v: cel(av), giroEnCuartos: 1 }));
}

/** Aceras: una `solera` en cada celda de la lista. */
function soleras(celdas: readonly (readonly [number, number])[]): PiezaDeEsquina[] {
  return celdas.map(([au, av]) => ({ pieza: PIEZA.solera, u: cel(au), v: cel(av), giroEnCuartos: 0 }));
}

/** Cuatro sillas alrededor de una mesa de terraza, a 2,5 de su centro. */
function sillasAlrededor(u: number, v: number): PiezaDeEsquina[] {
  return [
    { pieza: PIEZA.silla, u: u - 2.5, v, giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.silla, u: u + 2.5, v, giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.silla, u, v: v - 2.5, giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.silla, u, v: v + 2.5, giroEnCuartos: 2, menudo: true },
  ];
}

/**
 * LAS CUATRO ESCENAS DE ESQUINA (LA-CIUDAD.md §2). Nada medieval, y nada dentro de la ele.
 *
 * Con 108 de lado cada esquina deja de ser un rincón con cuatro losas y pasa a ser una
 * MANZANA. Eso es lo que cambia respecto de la versión de 48, y lo que se aprovecha:
 *
 * · SALIDA (0, sureste): un cruce de verdad, con los dos brazos entrando hasta la celda 2
 *   —donde la marcha los cruza, y ahí van las cebras—, cuatro farolas en las esquinas del
 *   cruce, dos semáforos de brazo, un taxi parado en la cebra y una berlina esperando en el
 *   otro brazo.
 * · LA CÁRCEL (10, suroeste): la comisaría entera. Cuatro bloques del pack cerrando una
 *   manzana, el patio en la celda (6, 6) cerrado con verja y dos hojas —una sube—, dos
 *   coches patrulla aparcados en su acera, la calle de delante con su cebra y dos semáforos.
 * · EL DESCANSO (20, noroeste): una plaza arbolada de tres por tres celdas con tres
 *   terrazas de cuatro sillas, bancos, farolas de parque, arbustos y siete árboles.
 * · ¡A LA MAZMORRA! (30, noreste): una avenida de DOS carriles (dos columnas de losas, 24 de
 *   ancho) con dos pasos de cebra, dos semáforos de brazo, el coche patrulla con el morro
 *   hacia la cárcel y otros dos coches.
 */
export const PIEZAS_DE_LA_ESQUINA: Readonly<Record<number, readonly PiezaDeEsquina[]>> = {
  [PUERTA_MAYOR]: [
    /*
     * El cruce está en la celda (5, 5) y sus dos brazos bajan hasta la celda 2, que es la que
     * la ELE de la marcha atraviesa: ahí, y sólo ahí, va la cebra por la que el peón cruza la
     * calzada. Las otras dos cebras son las de antes del cruce, una por brazo.
     */
    ...calleEnU(5, [
      [2, PIEZA.calzadaPaso],
      [3, PIEZA.calzada],
      [4, PIEZA.calzadaPaso],
      [5, PIEZA.calzadaCruce],
      [6, PIEZA.calzadaPaso],
      [7, PIEZA.calzada],
      [8, PIEZA.calzada],
    ]),
    ...calleEnV(5, [
      [2, PIEZA.calzadaPaso],
      [3, PIEZA.calzada],
      [4, PIEZA.calzadaPaso],
      [6, PIEZA.calzadaPaso],
      [7, PIEZA.calzada],
      [8, PIEZA.calzada],
    ]),
    ...soleras([
      [4, 4],
      [6, 4],
      [4, 6],
      [6, 6],
      [3, 3],
      [7, 3],
      [3, 7],
      [7, 7],
      [8, 3],
      [3, 8],
      [8, 7],
      [7, 8],
    ]),
    /* Las cuatro farolas, en las cuatro esquinas del cruce, a 6,6 de su eje: el bordillo. */
    { pieza: PIEZA.farolaDeCalle, u: 383.4, v: 383.4, giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.farolaDeCalle, u: 383.4, v: 396.6, giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.farolaDeCalle, u: 396.6, v: 383.4, giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.farolaDeCalle, u: 396.6, v: 396.6, giroEnCuartos: 3, menudo: true },
    /* Dos semáforos de brazo, uno por eje, en el bordillo de antes del cruce. */
    { pieza: PIEZA.semaforoC, u: 396.6, v: cel(4), giroEnCuartos: 3 },
    { pieza: PIEZA.semaforoC, u: cel(4), v: 396.6, giroEnCuartos: 1 },
    /* El taxi, parado en la cebra de antes del cruce: en el carril derecho, a 2,7 del eje. */
    { pieza: PIEZA.cocheTaxi, u: cel(5) + 2.7, v: cel(4), giroEnCuartos: 1, alza: COCHE_SOBRE_EL_ASFALTO },
    /* Y una berlina esperando en el otro brazo, en su carril. */
    { pieza: PIEZA.cocheBerlina, u: cel(3), v: cel(5) - 2.7, giroEnCuartos: 0, alza: COCHE_SOBRE_EL_ASFALTO },
    { pieza: PIEZA.bancoDeCalle, u: cel(3), v: cel(3), giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.bancoDeCalle, u: cel(7), v: cel(7), giroEnCuartos: 2, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(3), v: cel(7), giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(7), v: cel(3), giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.papelera, u: cel(8), v: cel(7), giroEnCuartos: 0, menudo: true },
  ],
  [MAZMORRA]: [
    /* La calle de delante de la comisaría, con su cebra en la celda que la marcha cruza. */
    ...calleEnU(4, [
      [2, PIEZA.calzadaPaso],
      [3, PIEZA.calzada],
      [4, PIEZA.calzada],
      [5, PIEZA.calzada],
      [6, PIEZA.calzada],
      [7, PIEZA.calzada],
      [8, PIEZA.calzada],
    ]),
    /* El aparcamiento y el patio, pavimentados. */
    ...soleras([
      [4, 5],
      [4, 6],
      [4, 7],
      [5, 5],
      [5, 6],
      [5, 7],
      [6, 5],
      [6, 6],
      [7, 5],
      [8, 5],
      [4, 8],
      [5, 8],
    ]),
    /*
     * LA MANZANA DE LA COMISARÍA: cuatro bloques del pack cerrando el patio por dos lados.
     * Ninguno de los anchos es 12 clavado —el `bloque-d` mide 12,123 y los `e`..`h` 12,04—,
     * así que ninguno de ésos puede ir centrado en la celda 8: se saldría del cuadrado de la
     * esquina por seis centésimas y el comprobador lo dice. Ahí sólo van los de 12 justos.
     */
    { pieza: PIEZA.bloqueD, u: cel(7), v: cel(6), giroEnCuartos: 2 },
    { pieza: PIEZA.bloqueB, u: cel(6), v: cel(7), giroEnCuartos: 0 },
    { pieza: PIEZA.bloqueC, u: cel(7), v: cel(7), giroEnCuartos: 0 },
    { pieza: PIEZA.bloqueA, u: cel(8), v: cel(7), giroEnCuartos: 0 },
    /* La verja del patio: el lado que da a la calle, con la hoja que sube en medio. */
    { pieza: PIEZA.verja, u: 396, v: 398, giroEnCuartos: 0 },
    { pieza: PIEZA.verjaPuerta, u: 396, v: 402, giroEnCuartos: 0, papel: 'reja' },
    { pieza: PIEZA.verja, u: 396, v: 406, giroEnCuartos: 0 },
    /* Y el lado que da al aparcamiento, con la hoja fija. */
    { pieza: PIEZA.verja, u: 398, v: 396, giroEnCuartos: 1 },
    { pieza: PIEZA.verjaPuerta, u: 402, v: 396, giroEnCuartos: 1, papel: 'reja-fija' },
    { pieza: PIEZA.verja, u: 406, v: 396, giroEnCuartos: 1 },
    /* Dos patrullas aparcadas en línea sobre la acera del aparcamiento. */
    { pieza: PIEZA.cochePatrulla, u: cel(4), v: cel(6), giroEnCuartos: 1, alza: COCHE_SOBRE_LA_SOLERA },
    { pieza: PIEZA.cochePatrulla, u: cel(4), v: cel(7), giroEnCuartos: 1, alza: COCHE_SOBRE_LA_SOLERA },
    { pieza: PIEZA.semaforoA, u: cel(3), v: 371.4, giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.semaforoA, u: cel(6), v: 371.4, giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.farolaDeCalle, u: cel(4), v: 371.4, giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.farolaDeCalle, u: cel(7), v: 371.4, giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.farolaDeCalle, u: cel(5), v: 384.6, giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.farolaDeCalle, u: cel(8), v: 384.6, giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.contenedor, u: cel(5), v: 420, giroEnCuartos: 0 },
    { pieza: PIEZA.papelera, u: cel(3), v: cel(6), giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(3), v: cel(8), giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(8), v: cel(8), giroEnCuartos: 1, menudo: true },
  ],
  [FERIA]: [
    /* La plaza: tres por tres celdas de acera en el medio, y cuatro rincones pavimentados. */
    ...soleras([
      [4, 4],
      [4, 5],
      [4, 6],
      [5, 4],
      [5, 5],
      [5, 6],
      [6, 4],
      [6, 5],
      [6, 6],
      [3, 3],
      [7, 3],
      [3, 7],
      [7, 7],
    ]),
    /* Tres terrazas con sus cuatro sillas cada una. Las sillas miran a su mesa. */
    { pieza: PIEZA.mesaRedonda, u: 382, v: 382, giroEnCuartos: 0 },
    ...sillasAlrededor(382, 382),
    { pieza: PIEZA.mesaRedonda, u: 398, v: 382, giroEnCuartos: 0 },
    ...sillasAlrededor(398, 382),
    { pieza: PIEZA.mesaRedonda, u: 382, v: 398, giroEnCuartos: 0 },
    ...sillasAlrededor(382, 398),
    /* El arbolado de la plaza: siete árboles en grupos, nunca en línea. */
    { pieza: PIEZA.pinoGrande, u: cel(7), v: cel(5), giroEnCuartos: 0 },
    { pieza: PIEZA.pinoGrande, u: cel(8), v: cel(6), giroEnCuartos: 1 },
    { pieza: PIEZA.pino, u: cel(5), v: cel(8), giroEnCuartos: 0 },
    { pieza: PIEZA.pino, u: cel(6), v: cel(8), giroEnCuartos: 2 },
    { pieza: PIEZA.pino, u: cel(8), v: cel(3), giroEnCuartos: 1 },
    { pieza: PIEZA.pinoPequeno, u: cel(3), v: cel(5), giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.pinoPequeno, u: cel(3), v: cel(8), giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(4), v: cel(8), giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(8), v: cel(4), giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(7), v: cel(8), giroEnCuartos: 2, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(8), v: cel(7), giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(4), v: cel(3), giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(3), v: cel(4), giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.bancoDeParque, u: 366, v: cel(5), giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.bancoDeParque, u: cel(5), v: 366, giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.bancoDeParque, u: 402, v: cel(7), giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.bancoDeParque, u: cel(7), v: 402, giroEnCuartos: 2, menudo: true },
    { pieza: PIEZA.farolaDeParque, u: 372, v: 372, giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.farolaDeParque, u: 396, v: 372, giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.farolaDeParque, u: 372, v: 396, giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.farolaDeParque, u: 408, v: 408, giroEnCuartos: 0, menudo: true },
  ],
  [A_LA_MAZMORRA]: [
    /*
     * LA AVENIDA: dos columnas de losas, o sea 24 de ancho —la misma sección que las cuatro
     * avenidas de la ciudad—, cruzando la esquina entera. La cebra de la celda 2 es la que
     * la marcha atraviesa; la de la 5, la del cruce de peatones de en medio.
     */
    ...calleEnV(4, [
      [2, PIEZA.calzadaPaso],
      [3, PIEZA.calzada],
      [4, PIEZA.calzada],
      [5, PIEZA.calzadaPaso],
      [6, PIEZA.calzada],
      [7, PIEZA.calzada],
      [8, PIEZA.calzada],
    ]),
    ...calleEnV(5, [
      [2, PIEZA.calzadaPaso],
      [3, PIEZA.calzada],
      [4, PIEZA.calzada],
      [5, PIEZA.calzadaPaso],
      [6, PIEZA.calzada],
      [7, PIEZA.calzada],
      [8, PIEZA.calzada],
    ]),
    ...soleras([
      [3, 3],
      [3, 5],
      [3, 7],
      [6, 3],
      [6, 5],
      [6, 7],
      [7, 4],
      [7, 6],
      [8, 3],
      [8, 5],
      [8, 7],
    ]),
    /* Dos semáforos de brazo, uno por sentido, con el brazo sobre su calzada. */
    { pieza: PIEZA.semaforoC, u: 370.6, v: cel(5), giroEnCuartos: 1 },
    { pieza: PIEZA.semaforoC, u: 397.4, v: cel(3), giroEnCuartos: 3 },
    /* El coche patrulla, en el carril que va hacia la cárcel. */
    { pieza: PIEZA.cochePatrulla, u: cel(4) + 2.7, v: cel(6), giroEnCuartos: 1, alza: COCHE_SOBRE_EL_ASFALTO },
    { pieza: PIEZA.cocheBerlina, u: cel(5) - 2.7, v: cel(3), giroEnCuartos: 3, alza: COCHE_SOBRE_EL_ASFALTO },
    { pieza: PIEZA.cocheTaxi, u: cel(5) - 2.7, v: cel(7), giroEnCuartos: 3, alza: COCHE_SOBRE_EL_ASFALTO },
    { pieza: PIEZA.farolaDeCalle, u: 370.6, v: cel(3), giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.farolaDeCalle, u: 370.6, v: cel(7), giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.farolaDeCalle, u: 397.4, v: cel(4), giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.farolaDeCalle, u: 397.4, v: cel(8), giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.bancoDeCalle, u: cel(7), v: cel(4), giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.bancoDeCalle, u: cel(7), v: cel(6), giroEnCuartos: 3, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(3), v: cel(3), giroEnCuartos: 0, menudo: true },
    { pieza: PIEZA.arbusto, u: cel(8), v: cel(7), giroEnCuartos: 1, menudo: true },
    { pieza: PIEZA.papelera, u: cel(6), v: cel(5), giroEnCuartos: 0, menudo: true },
  ],
};

/** Las puestas de las cuatro esquinas, en coordenadas del mundo. En sobria se cae lo menudo. */
export function puestasDeLasEsquinas(calidad: 'plena' | 'sobria' = 'plena'): Puesta[] {
  const salida: Puesta[] = [];
  for (const esquina of ESQUINAS) {
    const m = marcoDeCasilla(esquina);
    for (const p of PIEZAS_DE_LA_ESQUINA[esquina] ?? []) {
      if (calidad === 'sobria' && p.menudo === true) continue;
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
  return { pieza: p.pieza, x: sitio.x, y: p.alza ?? 0, z: sitio.z, giro: giroHaciaFuera(m) + radianesDeCuartos(p.giroEnCuartos), talla: 1 };
}

/* ─────────────────────────────── El atrezo de las casillas ─────────────────────────────── */

/**
 * Una pieza de atrezo de una casilla lateral: giro en cuartos sobre «mirando hacia dentro»,
 * sitio en `(u, v)` de la casilla, alza en `y`.
 */
export interface PiezaDeCasilla {
  readonly pieza: NombreDePieza;
  readonly giroEnCuartos: number;
  /** `[u, v]`: `u` a lo largo de la marcha (−36..36), `v` radial desde la ciudad (0..108). */
  readonly sitio: readonly [number, number];
  readonly alza?: number;
  readonly menudo?: boolean;
}

/**
 * LOS CUERPOS DEL PACK VAN SIN BASE, Y POR ESO BAJAN 0,6.
 *
 * `building_X_withoutBase` está dibujado para posarse SOBRE la losa de acera del pack, así
 * que su cara inferior está en `y = 0,6` (medido en los ocho). En una casilla del tablero no
 * hay losa: si se pusiera sin alza, el edificio flotaría seis décimas. `verify:burgo-escena`
 * mide que ninguna pieza flote ni se hunda.
 */
export const CUERPO_SOBRE_LA_CASILLA = -0.6;

/**
 * UN SOLAR: SIN EDIFICIO, y a propósito. Lo que hay que ver en una casilla de propiedad es
 * CUÁNTAS CASAS tiene puestas, y eso vive en la franja de color.
 *
 * Hasta hoy cada solar llevaba un frente de manzana de dos cuerpos del City Builder a
 * `u = ±13`. Se van enteros, y no por presupuesto sino por LECTURA: a la talla del tablero un
 * edificio del pack y una casa del jugador son dos bultos del mismo tamaño compitiendo en la
 * misma casilla, y contar las casas de un vistazo —que es lo que se hace cien veces por
 * partida— se volvía un ejercicio de vista. Con el frente quitado, lo único que sobresale de
 * una casilla es lo que el jugador ha construido.
 *
 * Queda la farola: no es un edificio, va al fondo (`v = 84`, contra el marco) y lejos del
 * carril de las casas (`v = 10,5`), así que da escala y sombra sin disputarle el sitio a lo que
 * de verdad cuenta. Lo que define la casilla sigue siendo la franja, el filete, el marco y el
 * precio.
 */
const solar: readonly PiezaDeCasilla[] = [
  { pieza: PIEZA.farolaDeCalle, giroEnCuartos: 0, sitio: [-31, 84], menudo: true },
];

/**
 * UNA PUERTA: el paso de cebra de la avenida que entra por ahí, con sus dos semáforos.
 *
 * La avenida mide 48 (cuatro celdas de la retícula: dos carriles por sentido) y entra
 * exactamente por el eje de esta casilla, que mide 72. Cuatro losas de cebra de 12 puestas a
 * ±6 y ±18 cubren la avenida entera y dejan 12 de acera a cada lado, que es donde se plantan
 * los dos semáforos de brazo, uno por sentido.
 */
const puerta: readonly PiezaDeCasilla[] = [
  { pieza: PIEZA.calzadaPaso, giroEnCuartos: 0, sitio: [-18, ATREZO.centro] },
  { pieza: PIEZA.calzadaPaso, giroEnCuartos: 0, sitio: [-6, ATREZO.centro] },
  { pieza: PIEZA.calzadaPaso, giroEnCuartos: 0, sitio: [6, ATREZO.centro] },
  { pieza: PIEZA.calzadaPaso, giroEnCuartos: 0, sitio: [18, ATREZO.centro] },
  { pieza: PIEZA.semaforoC, giroEnCuartos: 0, sitio: [28, ATREZO.centro] },
  { pieza: PIEZA.semaforoC, giroEnCuartos: 2, sitio: [-28, ATREZO.centro] },
];

/** El Arca del Concejo: su emblema y un contenedor. */
const arca: readonly PiezaDeCasilla[] = [{ pieza: PIEZA.contenedor, giroEnCuartos: 0, sitio: [18, ATREZO.centro] }];
/** El Pregón: su emblema y una papelera. */
const pregon: readonly PiezaDeCasilla[] = [{ pieza: PIEZA.papelera, giroEnCuartos: 0, sitio: [18, ATREZO.centro], menudo: true }];
/** El Molino y el Pozo: su emblema y una boca de riego. */
const oficio: readonly PiezaDeCasilla[] = [{ pieza: PIEZA.bocaDeRiego, giroEnCuartos: 0, sitio: [18, ATREZO.centro], menudo: true }];
/** El Diezmo y la Alcabala: sólo el emblema y la cifra. Sin volumen. */
const tributo: readonly PiezaDeCasilla[] = [];

/**
 * EL ATREZO, CASILLA A CASILLA. Ningún solar lleva más de UNA pieza de volumen y UNA de
 * mobiliario: es lo que Miguel pidió («no hace falta que pongas muchos elementos 3d para que
 * parezcan de verdad casillas») y lo que el presupuesto de `presupuesto.ts` cuenta.
 *
 * El cuerpo de cada solar sale de su barrio, y la regla es la del documento: dos plantas en
 * los tres primeros barrios (pardo, celeste, rosa), tres en los tres siguientes (naranja,
 * rojo, amarillo) y cuatro en los dos últimos (verde, azul). Dentro de un barrio se alterna
 * el modelo para que tres casillas seguidas no sean el mismo edificio, y dentro de una
 * casilla los DOS cuerpos del frente son siempre distintos: dos edificios gemelos pegados no
 * parecen una manzana, parecen un error de copia.
 *
 * En los dos barrios caros el primer cuerpo es siempre el `cuerpo-h` —el único de cuatro
 * plantas del pack—, porque lo que se quiere ver ahí es justo eso: que la Corte es la más
 * alta del anillo. El medianero es un `cuerpo-f` o un `cuerpo-g` de tres, que además hace
 * que la silueta de la casilla escalone y no sea un muro.
 */
export const ATREZO_DE_LA_CASILLA: Readonly<Record<number, readonly PiezaDeCasilla[]>> = {
  1: solar, // Lodo — pardo, 2 plantas
  2: arca,
  3: solar, // Corral — pardo
  4: tributo, // El Diezmo
  5: puerta,
  6: solar, // Tejedores — celeste, 2 plantas
  7: pregon,
  8: solar, // Tintoreros — celeste
  9: solar, // Ribera — celeste
  11: solar, // Cera — rosa, 2 plantas
  12: oficio, // El Molino
  13: solar, // Bordadores — rosa
  14: solar, // Ciegos — rosa
  15: puerta,
  16: solar, // Herreros — naranja, 3 plantas
  17: arca,
  18: solar, // Caldereros — naranja
  19: solar, // Espaderos — naranja
  21: solar, // Mercaderes — rojo, 3 plantas
  22: pregon,
  23: solar, // Mercado — rojo
  24: solar, // Lonja — rojo
  25: puerta,
  26: solar, // Plateros — amarillo, 3 plantas
  27: solar, // Libreros — amarillo
  28: oficio, // El Pozo
  29: solar, // Cambistas — amarillo
  31: solar, // Hospital — verde, 4 plantas
  32: solar, // Colegiata — verde
  33: arca,
  34: solar, // Escribanos — verde
  35: puerta,
  36: pregon,
  37: solar, // Alcázar — azul, 4 plantas
  38: tributo, // La Alcabala
  39: solar, // Calle Mayor — azul
};

/** La puesta de UNA pieza de atrezo de una casilla, en el mundo. */
export function puestaDeLaPiezaDeLaCasilla(casilla: number, p: PiezaDeCasilla): Puesta {
  const m = marcoDeCasilla(casilla);
  const sitio = puntoEnLaCasillaPorV(m, p.sitio[0], p.sitio[1]);
  return { pieza: p.pieza, x: sitio.x, y: p.alza ?? 0, z: sitio.z, giro: giroHaciaDentro(m) + radianesDeCuartos(p.giroEnCuartos), talla: 1 };
}

/** Las puestas del atrezo de las 36 casillas laterales. En sobria se cae lo menudo. */
export function puestasDelAtrezo(calidad: 'plena' | 'sobria' = 'plena'): Puesta[] {
  const salida: Puesta[] = [];
  for (let i = 0; i < CASILLAS; i++) {
    for (const p of ATREZO_DE_LA_CASILLA[i] ?? []) {
      if (calidad === 'sobria' && p.menudo === true) continue;
      salida.push(puestaDeLaPiezaDeLaCasilla(i, p));
    }
  }
  return salida;
}

/* ─────────────────────────────── Los emblemas ─────────────────────────────── */

export type EmblemaDelBurgo = 'arca' | 'pregon' | 'oficio' | 'tasa' | 'flecha';

/** Un emblema puesto en el tablero: qué contorno, dónde, con qué giro y de qué lado. */
export interface EmblemaEnElTablero {
  readonly casilla: number;
  readonly emblema: EmblemaDelBurgo;
  readonly x: number;
  readonly z: number;
  readonly giro: number;
  readonly lado: number;
}

/** Lo que mide de lado el emblema de una casilla: cabe en la banda de atrezo (30 de fondo) sin tocar el precio. */
export const LADO_DEL_EMBLEMA = 27;

/**
 * QUÉ CASILLA LLEVA QUÉ EMBLEMA.
 *
 * Las cuatro Puertas NO llevan emblema: llevan el paso de cebra de su avenida, que es lo
 * que el documento pone en su fila de atrezo y lo que de verdad dice «por aquí se entra».
 * El contorno `puerta` de `iconos.ts` sigue compilado para la hoja, que sí tiene texto.
 */
const EMBLEMA_DE_LA_CASILLA: Readonly<Record<number, EmblemaDelBurgo>> = {
  2: 'arca',
  4: 'tasa',
  7: 'pregon',
  12: 'oficio',
  17: 'arca',
  22: 'pregon',
  28: 'oficio',
  33: 'arca',
  36: 'pregon',
  38: 'tasa',
};

/** Dónde va el emblema dentro de la casilla: a la izquierda si hay pieza al lado, centrado si no. */
export function huecosDeLosEmblemas(): EmblemaEnElTablero[] {
  const salida: EmblemaEnElTablero[] = [];
  for (const [clave, emblema] of Object.entries(EMBLEMA_DE_LA_CASILLA)) {
    const casilla = Number(clave);
    const m = marcoDeCasilla(casilla);
    const conPieza = (ATREZO_DE_LA_CASILLA[casilla] ?? []).length > 0;
    const p = puntoEnLaCasillaPorV(m, conPieza ? -14 : 0, ATREZO.centro);
    salida.push({ casilla, emblema, x: p.x, z: p.z, giro: giroHaciaDentro(m), lado: LADO_DEL_EMBLEMA });
  }
  /*
   * La flecha del sentido de la marcha, en la salida y en la casilla que manda a la cárcel:
   * en la acera de la celda (1, 5), pegada al brazo por el que se sale de la esquina, que es
   * justo donde la mira quien acaba de mover.
   */
  for (const esquina of [PUERTA_MAYOR, A_LA_MAZMORRA]) {
    const m = marcoDeCasilla(esquina);
    const p = puntoEnEsquina(m, cel(1), cel(5));
    salida.push({ casilla: esquina, emblema: 'flecha', x: p.x, z: p.z, giro: giroHaciaFuera(m), lado: LADO_DEL_EMBLEMA });
  }
  return salida;
}

/* ─────────────────────────────── El suelo del tablero ─────────────────────────────── */

export type PapelDelSuelo = 'franja' | 'reborde' | 'filete' | 'superficie' | 'borde' | 'esquina' | 'linea' | 'recinto';

/**
 * LO QUE MIDE LA LÍNEA QUE SEPARA UNA CASILLA DE LA SIGUIENTE, Y POR QUÉ HAY QUE PONERLA.
 *
 * Se vio mirando la captura del tablero entero: sin ella, los nueve frentes de un lado son
 * una BANDA CONTINUA de superficie clara con precios encima, y no nueve casillas. Un tablero
 * de mesa clásico separa las casillas con un filo negro, y eso es lo único que las convierte
 * de «un borde beige» en «casillas» a cualquier distancia — mucho antes que el atrezo, que a
 * la escala de salida son motas. Cuesta dos triángulos por casilla: 72 en todo el anillo, de
 * 207.877.
 *
 * 0,9 de ancho es lo que hace que la línea mida un píxel desde la pose de salida
 * (0,9/570,24 · 1.304 ≈ 2 px) y no desaparezca, sin engordar hasta parecer una calle.
 */
export const ANCHO_DE_LA_LINEA = 0.9;

/** Un cuadro del suelo propio del tablero: cuatro puntos en el mundo, su altura y su papel. */
export interface CuadroDeSuelo {
  readonly casilla: number;
  readonly papel: PapelDelSuelo;
  /** Los cuatro vértices, en orden, ya en el mundo (x, y, z). */
  readonly puntos: readonly (readonly [number, number, number])[];
  readonly normal: readonly [number, number, number];
}

/**
 * LOS CUADROS DE SUELO DE UNA CASILLA, de dentro afuera.
 *
 * La FRANJA es la única que se repinta con el color del barrio (y se apaga al empeñar), así
 * que va PRIMERA y con su papel puesto: `Burgo.tsx` sólo tiene que quedarse con el tramo de
 * vértices de los cuadros cuyo papel sea `franja` o `reborde`. Después el filete, la
 * superficie y el marco. Una esquina no tiene bandas: es un cuadro entero más su tramo de
 * marco por los dos lados que dan al campo.
 */
export function suelosDeLaCasilla(i: number): CuadroDeSuelo[] {
  const m = marcoDeCasilla(i);
  const salida: CuadroDeSuelo[] = [];
  if (m.esEsquina) {
    const e = (u: number, v: number, y: number): readonly [number, number, number] => {
      const p = puntoEnEsquina(m, u, v);
      return [p.x, y, p.z];
    };
    salida.push({ casilla: i, papel: 'esquina', puntos: [e(BORDE_INTERIOR, BORDE_INTERIOR, 0), e(SUPERFICIE.hasta, BORDE_INTERIOR, 0), e(SUPERFICIE.hasta, SUPERFICIE.hasta, 0), e(BORDE_INTERIOR, SUPERFICIE.hasta, 0)], normal: [0, 1, 0] });
    salida.push({ casilla: i, papel: 'borde', puntos: [e(SUPERFICIE.hasta, BORDE_INTERIOR, ALTURA_DEL_BORDE), e(MEDIO_LADO, BORDE_INTERIOR, ALTURA_DEL_BORDE), e(MEDIO_LADO, MEDIO_LADO, ALTURA_DEL_BORDE), e(SUPERFICIE.hasta, MEDIO_LADO, ALTURA_DEL_BORDE)], normal: [0, 1, 0] });
    salida.push({ casilla: i, papel: 'borde', puntos: [e(BORDE_INTERIOR, SUPERFICIE.hasta, ALTURA_DEL_BORDE), e(SUPERFICIE.hasta, SUPERFICIE.hasta, ALTURA_DEL_BORDE), e(SUPERFICIE.hasta, MEDIO_LADO, ALTURA_DEL_BORDE), e(BORDE_INTERIOR, MEDIO_LADO, ALTURA_DEL_BORDE)], normal: [0, 1, 0] });
    return salida;
  }
  const medio = ANCHO_DE_CASILLA / 2;
  const p = (radial: number, u: number, y: number): readonly [number, number, number] => {
    const q = puntoEnCasilla(m, radial, u);
    return [q.x, y, q.z];
  };
  const banda = (papel: PapelDelSuelo, desde: number, hasta: number, y: number): void => {
    salida.push({ casilla: i, papel, puntos: [p(desde, -medio, y), p(hasta, -medio, y), p(hasta, medio, y), p(desde, medio, y)], normal: [0, 1, 0] });
  };
  /* La franja del barrio, alzada como un bordillo, y su canto interior: es lo que define la casilla. */
  banda('franja', FRANJA.desde, FRANJA.hasta, ALTURA_DEL_REBORDE);
  salida.push({
    casilla: i,
    papel: 'reborde',
    puntos: [p(FRANJA.desde, -medio, 0), p(FRANJA.desde, -medio, ALTURA_DEL_REBORDE), p(FRANJA.desde, medio, ALTURA_DEL_REBORDE), p(FRANJA.desde, medio, 0)],
    normal: [-m.fuera.x, 0, -m.fuera.z],
  });
  banda('filete', FILETE.desde, FILETE.hasta, ALTURA_DEL_FILETE);
  banda('superficie', SUPERFICIE.desde, SUPERFICIE.hasta, 0);
  banda('borde', BORDE_CLARO.desde, BORDE_CLARO.hasta, ALTURA_DEL_BORDE);
  /*
   * Y la línea que la separa de la siguiente: en el borde de ATRÁS (−u), que es el que da a la
   * casilla anterior. Poniéndola en uno solo de los dos bordes cada junta lleva UNA línea y no
   * dos superpuestas peleándose en profundidad — y las juntas con una esquina las cierra el
   * marco de la esquina, que ya está ahí.
   */
  const linea = ANCHO_DE_LA_LINEA / 2;
  salida.push({
    casilla: i,
    papel: 'linea',
    puntos: [p(FRANJA.desde, -medio - linea, ALTURA_DE_LA_LINEA), p(BORDE_CLARO.hasta, -medio - linea, ALTURA_DE_LA_LINEA), p(BORDE_CLARO.hasta, -medio + linea, ALTURA_DE_LA_LINEA), p(FRANJA.desde, -medio + linea, ALTURA_DE_LA_LINEA)],
    normal: [0, 1, 0],
  });
  return salida;
}

/** Todos los cuadros de suelo del anillo, en orden de casilla. */
export function suelosDelAnillo(): CuadroDeSuelo[] {
  const salida: CuadroDeSuelo[] = [];
  for (let i = 0; i < CASILLAS; i++) salida.push(...suelosDeLaCasilla(i));
  return salida;
}

/* ─────────────────────────────── El recinto de la ciudad ─────────────────────────────── */

/**
 * EL HUECO QUE SE LE DEJA A LA CIUDAD, y el contrato con `ciudad.ts`.
 *
 * `escenas/burgo/ciudad.ts` levanta lo de dentro; aquí sólo se publica la caja y las cuatro
 * bocas, para que la ciudad no tenga que volver a deducir dónde está el borde del tablero.
 * Los nombres son los que fija `docs/burgo/LA-CIUDAD.md` §1 y §3, y si alguno cambia, cambia
 * en los dos sitios a la vez.
 *
 *     lado 648 = 54 celdas de 12; el centro de la celda (i, j) está en
 *     x = −324 + 12i + 6,  z = −324 + 12j + 6
 *
 * Los índices `i` van con `x` y los `j` con `z`, los dos de 0 a 53.
 *
 * ═══ EL ESQUELETO CRECE CON EL RECINTO, Y NO SE QUEDA EN UNA CELDA ═══
 *
 * Con 24 celdas, un bulevar de UNA celda (12) y unas avenidas de DOS (24) eran la mitad y la
 * cuarta parte de una casilla. Con 54 celdas serían hilos: 12 de ronda para una ciudad de
 * 458 metros de lado no es un bulevar, es un callejón. Así que:
 *
 *   · BULEVAR de circunvalación: DOS celdas (24) en cada uno de los cuatro bordes, o sea las
 *     celdas 0, 1, 52 y 53 de cada eje.
 *   · AVENIDAS: CUATRO celdas (48), dos carriles por sentido con mediana en medio, en las
 *     celdas 25, 26, 27 y 28, que caen simétricas respecto del eje —de −24 a +24— y por
 *     tanto encaradas exactamente con el centro de las casillas 5, 15, 25 y 35.
 *   · GLORIETA: las dieciséis celdas centrales (25..28 en los dos ejes), 48 × 48.
 *
 * La avenida (48) sigue siendo más estrecha que la casilla (72): quedan 12 de acera a cada
 * lado, que es donde se plantan los dos semáforos de brazo de la Puerta.
 */
export const CELDAS_DE_LA_CIUDAD = LADO_INTERIOR / RETICULA_DE_LA_CIUDAD; // 54
/** Las celdas del bulevar de circunvalación, dos en cada borde. */
export const CELDAS_DEL_BULEVAR: readonly number[] = [0, 1, CELDAS_DE_LA_CIUDAD - 2, CELDAS_DE_LA_CIUDAD - 1];
export const ANCHO_DEL_BULEVAR = 2 * RETICULA_DE_LA_CIUDAD; // 24
/** Las cuatro celdas de una avenida, simétricas respecto del eje del recinto: [25, 26, 27, 28]. */
export const CELDAS_DE_LA_AVENIDA: readonly number[] = [CELDAS_DE_LA_CIUDAD / 2 - 2, CELDAS_DE_LA_CIUDAD / 2 - 1, CELDAS_DE_LA_CIUDAD / 2, CELDAS_DE_LA_CIUDAD / 2 + 1];
export const ANCHO_DE_LA_AVENIDA = 4 * RETICULA_DE_LA_CIUDAD; // 48
/** Las dieciséis celdas de la glorieta: la avenida contra la avenida, en el centro. */
export const CELDAS_DE_LA_GLORIETA: readonly number[] = CELDAS_DE_LA_AVENIDA;

export const RECINTO_DE_LA_CIUDAD = {
  centro: { x: 0, z: 0 } as Punto,
  /** 648: nueve veces el centro de 72 del primer tablero. */
  lado: LADO_INTERIOR,
  /** 324: la distancia del centro a cualquiera de sus cuatro bordes. */
  borde: BORDE_INTERIOR,
  /** 54. */
  celdas: CELDAS_DE_LA_CIUDAD,
  /** 12. */
  reticula: RETICULA_DE_LA_CIUDAD,
} as const;

/** El centro de la celda `(i, j)` de la ciudad, en el mundo. */
export function centroDeCelda(i: number, j: number): Punto {
  return {
    x: -BORDE_INTERIOR + RETICULA_DE_LA_CIUDAD * i + RETICULA_DE_LA_CIUDAD / 2,
    z: -BORDE_INTERIOR + RETICULA_DE_LA_CIUDAD * j + RETICULA_DE_LA_CIUDAD / 2,
  };
}

/** Una de las cuatro bocas por donde la avenida sale del recinto y se encara con su Puerta. */
export interface PuertaDeLaCiudad {
  /** 5, 15, 25 o 35. */
  readonly casilla: number;
  readonly lado: 0 | 1 | 2 | 3;
  /** El eje de celdas por el que corre la avenida que entra aquí: `'i'` si avanza en x, `'j'` si en z. */
  readonly eje: 'i' | 'j';
  /** Las cuatro celdas de la avenida, en el eje perpendicular al de avance: [25, 26, 27, 28]. */
  readonly celdas: readonly number[];
  /** El punto del BORDE del recinto por donde entra, en el mundo. */
  readonly entrada: Punto;
  /** Unitario, del recinto hacia su casilla. */
  readonly fuera: Punto;
  /** 48. */
  readonly ancho: number;
}

/** Las cuatro bocas, en orden de casilla. */
export const PUERTAS_DE_LA_CIUDAD: readonly PuertaDeLaCiudad[] = PUERTAS.map((casilla) => {
  const m = marcoDeCasilla(casilla);
  const entrada = puntoEnCasilla(m, BORDE_INTERIOR, 0);
  return {
    casilla,
    lado: m.lado,
    /* En los lados 0 y 2 (sur y norte) la avenida avanza en z; en los 1 y 3, en x. */
    eje: m.lado % 2 === 0 ? ('j' as const) : ('i' as const),
    celdas: CELDAS_DE_LA_AVENIDA,
    entrada,
    fuera: m.fuera,
    ancho: ANCHO_DE_LA_AVENIDA,
  };
});

/* ─────────────────────────────── Los dados y el Concejo ─────────────────────────────── */

/**
 * EL PAÑO DE DADOS Y EL CONCEJO, EN EL CAMPO.
 *
 * El centro del tablero es la glorieta de la ciudad: los dados ya no caben ahí. Bajan al
 * campo, delante del lado SUR —el más cercano a la cámara desde la pose de salida— y sobre
 * el manto de teselas. `verify:burgo-escena` proyecta el borde lejano del paño en las tres
 * ventanas y exige que caiga dentro del lienzo.
 *
 * ═══ LO QUE ATA EL TAMAÑO DEL PAÑO NO ES EL GUSTO: ES EL MANTO ═══
 *
 * El paño tiene que caber ENTERO entre el borde del tablero (432) y el final de la corona de
 * teselas, o queda un paño de fieltro flotando sobre el vacío. Con la corona de CUATRO
 * teselas el manto acaba en 482,52, así que el paño va de 433 a 481: lado 48, centrado en
 * 457. Y con un paño de 48 caben dos dados de arista 20 a ±12 del eje, con 4 entre ellos
 * para que rueden sin encajarse. Arista 20 sobre un tablero de 864 es la misma mancha en
 * pantalla que 8,9 sobre el de 384: se ha subido de 12 a 20 justo para no perder esa mancha.
 */
export const SUELO_DE_DADOS = { x: 0, z: MEDIO_LADO + 25, lado: 48, y: 0.02, color: '#e6dcc3' } as const;
/** Arista 20: lo más grande que cabe en el paño, y el paño es lo más grande que cabe en el manto. */
export const ARISTA_DE_LOS_DADOS = 20;
export const HUECOS_DE_LOS_DADOS: readonly Punto[] = [
  { x: -12, z: SUELO_DE_DADOS.z },
  { x: 12, z: SUELO_DE_DADOS.z },
];
/** El asa invisible sobre los dados: un cilindro de este radio. */
export const RADIO_DEL_ASA_DE_LOS_DADOS = 26;
/** El Concejo: a él vuelan las monedas que se pagan al Concejo y de él salen las que se cobran. */
export const EL_CONCEJO: Punto = { x: 0, z: SUELO_DE_DADOS.z + 18 };

/* ─────────────────────────────── El campo ─────────────────────────────── */

/** La tesela hexagonal, ya escalada y medida en el `.glb`: 10,938 de ancho (punta arriba) y 12,63 de largo. */
export const ANCHO_DE_TESELA = 10.938;
export const LARGO_DE_TESELA = 12.63;
/** El manto se tuca esto bajo el tablero para no pelear con sus bandas. */
export const ALTURA_DEL_MANTO = -0.05;

/**
 * LA CORONA DEL MANTO. Empieza DENTRO del tablero (a 4 del borde) para que no quede una
 * junta a la vista, y acaba tres teselas más allá. Todas las del panal que caen aquí se
 * ponen: es un manto, no un puñado de islas.
 */
export const TESELAS_DE_LA_CORONA = 4;
export const CORONA = { desde: MEDIO_LADO - 4, hasta: MEDIO_LADO + LARGO_DE_TESELA * TESELAS_DE_LA_CORONA } as const;
/** Las manchas de arbolado, colinas y rocas: nunca piezas sueltas. Suben de 16 a 24 porque la corona es 2,4 veces más larga. */
export const MANCHAS_DEL_CAMPO = 24;
/** Ninguna mancha más cerca del tablero que esto: el borde del tablero se ve limpio, y el paño de dados también. */
export const MANCHAS_LEJOS_DEL_TABLERO = MEDIO_LADO + 16;
export const ALTURA_DE_LAS_NUBES = 216;
export const DERIVA_DE_LAS_NUBES = 2;
/** Las nubes vuelven por el otro lado al pasar de aquí. */
export const CONFIN_DE_LAS_NUBES = 720;
/** Ninguna nube por encima del tablero: nacen de aquí para fuera. */
export const NUBES_LEJOS_DEL_TABLERO = MEDIO_LADO + 90;
/** Un canal propio para que el campo no se parezca a la cala de la misma mesa. */
export const SEMILLA_DEL_CAMPO = 0x5b7a;

/** Todos los centros de tesela de un panal de punta arriba que caen en la corona, en orden fijo. */
export function candidatasDelCampo(): Punto[] {
  const salida: Punto[] = [];
  const pasoDeFila = LARGO_DE_TESELA * 0.75;
  const filas = Math.ceil(CORONA.hasta / pasoDeFila) + 1;
  const columnas = Math.ceil(CORONA.hasta / ANCHO_DE_TESELA) + 1;
  for (let fila = -filas; fila <= filas; fila++) {
    for (let columna = -columnas; columna <= columnas; columna++) {
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

/**
 * LA COMPOSICIÓN DE UNA MANCHA, por su número de orden. Es FIJA —lo que la semilla mueve es
 * dónde cae la mancha, no de qué está hecha— porque el presupuesto se cuenta de estas listas
 * y una cuenta que dependiera de la semilla no se podría comprobar.
 */
const MANCHAS: readonly (readonly { readonly pieza: NombreDePieza; readonly alza: number }[])[] = [
  [
    { pieza: PIEZA.arboledaGrande, alza: 0.11 },
    { pieza: PIEZA.arbolA, alza: 0.56 },
    { pieza: PIEZA.arbolA, alza: 0.56 },
  ],
  [
    { pieza: PIEZA.arboledaMediana, alza: 0.11 },
    { pieza: PIEZA.rocaA, alza: 0 },
  ],
  [
    { pieza: PIEZA.colinasA, alza: 0 },
    { pieza: PIEZA.arbolB, alza: 0.55 },
  ],
  [
    { pieza: PIEZA.arboledaPequena, alza: 0.11 },
    { pieza: PIEZA.rocaB, alza: 0 },
    { pieza: PIEZA.arbolA, alza: 0.56 },
  ],
];

/**
 * EL CAMPO SEMBRADO: el manto entero de teselas contiguas, dieciséis manchas de vegetación
 * repartidas por la semilla lejos del tablero, y cinco nubes altas y fuera del anillo.
 */
export function campo(semilla: number): Campo {
  const azar = sorteo(semilla >>> 0);
  const candidatas = candidatasDelCampo();
  const teselas = candidatas.map((p): Puesta => ({ pieza: PIEZA.tesela, x: p.x, y: ALTURA_DEL_MANTO, z: p.z, giro: 0, talla: 1 }));
  /*
   * Las manchas van lejos del tablero Y fuera del paño de dados: con la corona tan estrecha
   * comparada con el tablero, una arboleda sembrada al azar caía encima del paño y tapaba
   * los dados. El paño se engorda media tesela para que ni las ramas asomen.
   */
  const margenDelPano = ANCHO_DE_TESELA / 2;
  const enElPano = (p: Punto): boolean =>
    Math.abs(p.x - SUELO_DE_DADOS.x) < SUELO_DE_DADOS.lado / 2 + margenDelPano && Math.abs(p.z - SUELO_DE_DADOS.z) < SUELO_DE_DADOS.lado / 2 + margenDelPano;
  const lejanas = candidatas.filter((p) => Math.max(Math.abs(p.x), Math.abs(p.z)) >= MANCHAS_LEJOS_DEL_TABLERO && !enElPano(p));
  const decorado: Puesta[] = [];
  for (let k = 0; k < MANCHAS_DEL_CAMPO; k++) {
    const sobre = lejanas[Math.floor(azar() * lejanas.length)] ?? { x: MANCHAS_LEJOS_DEL_TABLERO, z: 0 };
    const receta = MANCHAS[k % MANCHAS.length] as readonly { readonly pieza: NombreDePieza; readonly alza: number }[];
    receta.forEach((cual, j) => {
      /* Las piezas de una mancha se apiñan: nunca en línea y nunca a más de media tesela. */
      const radio = j === 0 ? 0 : ANCHO_DE_TESELA * 0.45;
      const rumbo = azar() * Math.PI * 2;
      decorado.push({
        pieza: cual.pieza,
        x: sobre.x + Math.cos(rumbo) * radio,
        y: ALTURA_DEL_MANTO + cual.alza,
        z: sobre.z + Math.sin(rumbo) * radio,
        giro: Math.floor(azar() * 6) * (Math.PI / 3),
        talla: 1,
      });
    });
  }
  const nube = (pieza: NombreDePieza): Puesta => {
    const rumbo = azar() * Math.PI * 2;
    const radio = NUBES_LEJOS_DEL_TABLERO + azar() * (CONFIN_DE_LAS_NUBES - NUBES_LEJOS_DEL_TABLERO - 20);
    return { pieza, x: Math.cos(rumbo) * radio, y: ALTURA_DE_LAS_NUBES, z: Math.sin(rumbo) * radio, giro: azar() * Math.PI * 2, talla: 1 };
  };
  const nubes = [nube(PIEZA.nubeGrande), nube(PIEZA.nubeGrande), nube(PIEZA.nubePequena), nube(PIEZA.nubePequena), nube(PIEZA.nubePequena)];
  return { teselas, decorado, nubes };
}

/* ───────────────────────── Todo junto, para quien instancia ───────────────────────── */

/**
 * EL MUNDO ESTÁTICO DE UNA MESA: lo que se aplana y se funde en UNA geometría. Sin la reja,
 * que se anima, y sin las nubes, que derivan. La ciudad NO está aquí: la suma `ciudad.ts`.
 */
export function mundoEstatico(semilla: number, calidad: 'plena' | 'sobria' = 'plena'): Puesta[] {
  const plena = calidad === 'plena';
  const c = campo(semilla);
  return [
    ...puestasDelAtrezo(calidad),
    ...puestasDeLasEsquinas(calidad).filter((p) => p.pieza !== PIEZA.verjaPuerta),
    ...c.teselas,
    ...(plena ? c.decorado : []),
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
