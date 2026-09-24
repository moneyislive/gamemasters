/**
 * LO QUE EL HUD NECESITA PARA ORIENTARSE EN LA CIUDAD: el minimapa, el plano entero, la brújula con los
 * metros por calles y el hilo de rumbo (`docs/quiebro/CIUDAD-ABIERTA.md` §5.9). Es la frontera entre el
 * juego —la red, que sabe dónde está cada cuerpo, qué Fallo espera y qué cabina suena—, el HUD —que lo
 * dibuja— y la ciudad (`shared/arcade/juegos/quiebro-ciudad.ts`). Vive en un fichero de nadie, sin React ni
 * three, como `cuerpos.ts`, y se lee en Node.
 *
 * ═══ POR QUÉ UNA FUENTE QUE SE LEE Y NO UN ESTADO DE REACT ═══
 *
 * Por lo mismo que los cuerpos: el minimapa se gira a 10 Hz y la brújula en cada fotograma, y un
 * `setState` por fotograma es un render de React por fotograma. El juego ESCRIBE (una lista de marcas
 * reutilizada, sin asignar) y el HUD LEE fuera de React, en su `requestAnimationFrame`. Lo que cambia poco
 * —la noche, el rumbo tendido— se pregunta igual: es barato, y así no hay dos caminos.
 *
 * ═══ LAS DOS VISTAS DEL MAPA ═══
 *
 *   · EL MINIMAPA: `LADO_DEL_MINIMAPA_PT` arriba a la izquierda, bajo el menú, con la mirada de la cámara
 *     HACIA ARRIBA (`alMinimapa`). Es un lienzo 2D de la ciudad entera a `PIXELES_POR_METRO` (540²),
 *     dibujado UNA vez por noche, que se recorta y se gira `REFRESCOS_DEL_MINIMAPA` veces por segundo, con
 *     `MARCAS_DEL_MINIMAPA` marcas como mucho.
 *   · EL PLANO: la ciudad entera con el NORTE ARRIBA (`alPlano`, `delPlano`), translúcido y sin parar el
 *     juego. Se abre con el botón PLANO (`LADO_DEL_BOTON_DEL_PLANO_PT`, bajo AVISO) o con `TECLA_DEL_PLANO`.
 *     Tocar un sitio manda «Aquí» sobre el nudo más cercano (`nudoMasCercano`, declaración L8); tocar un
 *     Fallo o una cabina tiende el hilo de rumbo. TODO en `pointerdown`: `onClick` no llega en la app.
 *
 * ═══ LOS METROS POR CALLES, LOS DE LA SALA ═══
 *
 * Los metros de cada marca salen de un CAMPO por objetivo (`campoHasta`, un Dijkstra de ≈ 0,3 ms que se
 * calcula una vez por tramo) y de `distanciaPorCalles`, que es una suma: son las mismas funciones que usan
 * la sala, los robots y el comprobador, así que el número que enseña el HUD es el que mide todo el mundo.
 * Aquí van ya redondeados al metro, o −1 si no se sabe o no se llega.
 *
 * ═══ QUIÉN DECIDE QUÉ ═══
 *
 *   · El JUEGO decide qué marcas hay y dónde: los compañeros con su color, los caídos a `METROS_DEL_RESCATE`
 *     o menos («Rescate»), los Fallos pendientes (verde-cian), las cabinas que suenan (ámbar), y, al Vigía,
 *     los enemigos a `METROS_DE_LA_VIGIA` o menos de un compañero. Y qué rumbo hay tendido: el propio o el
 *     de un «Voy» de otro.
 *   · El HUD decide cómo se ven: el color de cada clase, el hilo de glifos (`METROS_DEL_HILO` por delante,
 *     en una llamada de `TRIANGULOS_DEL_HILO` triángulos como mucho), y qué se tapa si no cabe.
 */
import type { CampoDeDistancias, NocheDeLaCiudad } from '../../../shared/arcade/juegos/quiebro-ciudad';
import { BORDE_DE_LA_CIUDAD } from '../../../shared/arcade/juegos/quiebro-ciudad';

/* ─── LAS MEDIDAS DEL §5.9 ───────────────────────────────────────────────── */

/** El lado del minimapa, en puntos CSS. */
export const LADO_DEL_MINIMAPA_PT = 112;
/** El lienzo de la ciudad: un píxel por metro, de canto a canto. */
export const PIXELES_POR_METRO = 1;
export const LADO_DEL_LIENZO = 2 * BORDE_DE_LA_CIUDAD * PIXELES_POR_METRO;
/** Cuántas veces por segundo se recorta y se gira el minimapa. */
export const REFRESCOS_DEL_MINIMAPA = 10;
/** Cuántas marcas caben en el minimapa. */
export const MARCAS_DEL_MINIMAPA = 20;
/** El botón PLANO, en puntos CSS, y la tecla que lo abre (`KeyboardEvent.code`). */
export const LADO_DEL_BOTON_DEL_PLANO_PT = 44;
export const TECLA_DEL_PLANO = 'KeyM';
/** Lo que el hilo de rumbo se adelanta por el suelo, y su tope de triángulos (una llamada instanciada). */
export const METROS_DEL_HILO = 60;
export const TRIANGULOS_DEL_HILO = 400;
/** A cuánto se ve en la brújula a un compañero caído, con «Rescate» (§4). */
export const METROS_DEL_RESCATE = 40;
/** A cuánto de un compañero ve el Vigía a los enemigos (§4). */
export const METROS_DE_LA_VIGIA = 60;

/* ─── LO QUE SE PINTA ────────────────────────────────────────────────────── */

/** Qué es cada marca del mapa y de la brújula. */
export type ClaseDeMarca = 'companero' | 'caido' | 'fallo' | 'cabina' | 'refugio' | 'arca' | 'enemigo' | 'aviso';

/**
 * UNA MARCA, tal como hay que pintarla ahora. Mutable a propósito: el juego reutiliza los objetos entre
 * fotogramas.
 *
 *   · `x`, `z`: en metros, `x` al este y `z` al sur.
 *   · `color`: el del asiento en CSS `#rrggbb` (compañeros, caídos, avisos), o `null` (el HUD pone el de su clase).
 *   · `metros`: por calles desde el propio, al metro; −1 si no se sabe o no se llega.
 *   · `quien`: el número del cuerpo en la Liza (compañero, caído, enemigo, aviso), el número de plaza (un
 *     Fallo) o el id de zona (cabina, refugio, arca). 0 si no es de nadie.
 *   · `rumbo`: si es el objetivo del hilo de rumbo tendido.
 */
export interface MarcaDelMapa {
  clase: ClaseDeMarca;
  x: number;
  z: number;
  color: string | null;
  metros: number;
  quien: number;
  rumbo: boolean;
}

/** Dónde está el propio y hacia dónde mira, en metros y en radianes (0 al norte, creciendo hacia el este, como `cuerpos.ts`). */
export interface PosicionEnElMapa {
  x: number;
  z: number;
  mira: number;
}

/**
 * A qué se tiende el hilo de rumbo: un Fallo por su plaza, una zona por su id (una cabina, un refugio, un
 * arca), o un nudo del grafo (el de un «Aquí»).
 */
export type ObjetivoDelRumbo =
  | { readonly tipo: 'fallo'; readonly plaza: number }
  | { readonly tipo: 'zona'; readonly zona: number }
  | { readonly tipo: 'nudo'; readonly nudo: number };

/**
 * EL RUMBO TENDIDO: a qué, desde qué nudo meta se midió su campo, el campo, y qué asiento lo tendió (el
 * propio, o el compañero que dijo «Voy»: todos ven su hilo). El hilo es `caminoPorElCampo` desde el nudo
 * más cercano al propio, `METROS_DEL_HILO` por delante.
 */
export interface RumboTendido {
  readonly objetivo: ObjetivoDelRumbo;
  readonly nudo: number;
  readonly campo: CampoDeDistancias;
  readonly deQuien: number;
}

/** LO QUE EL JUEGO ENTREGA AL HUD PARA ORIENTARSE. Se lee cuando se pinta; no se copia. */
export interface FuenteDelMapa {
  /** La ciudad de esta noche (la despejada, si lo está), o `null` si no hay ciudad que pintar (la reunión). */
  noche(): NocheDeLaCiudad | null;
  /** El propio, o `null` si no tiene cuerpo ni sitio (el Vigía mira el plano entero desde su último sitio). */
  yo(): PosicionEnElMapa | null;
  /** El giro de la cámara, en radianes: hacia dónde mira el minimapa. */
  giroDeLaCamara(): number;
  /** Las marcas de ahora, como mucho `MARCAS_DEL_MINIMAPA` que importen (el plano puede enseñar las mismas). */
  marcas(): readonly MarcaDelMapa[];
  /** El rumbo tendido, o `null`. */
  rumbo(): RumboTendido | null;
  /** Si el propio es Vigía: ve el plano entero y los enemigos cerca de los compañeros. */
  vigia(): boolean;
}

/** LO QUE EL HUD PIDE AL JUEGO desde el plano. Cada una, de un `pointerdown` o de una tecla. */
export interface OrdenesDelMapa {
  /** «Aquí» sobre un nudo del grafo de la noche (su índice; en el cable, el índice más uno: L8). */
  aqui(nudo: number): void;
  /** Tender el hilo de rumbo propio hacia un objetivo. */
  tenderElRumbo(objetivo: ObjetivoDelRumbo): void;
  /** Quitarlo. */
  soltarElRumbo(): void;
}

/* ─── DEL MUNDO AL MAPA, Y VUELTA ────────────────────────────────────────── */

/** Un punto del mapa: `u` hacia la derecha y `v` hacia abajo, en píxeles del lienzo. */
export interface PuntoDelMapa {
  readonly u: number;
  readonly v: number;
}

/**
 * DEL MUNDO AL MINIMAPA: lo que hay a `(dx, dz)` metros del propio, con la mirada `giro` (radianes, 0 al
 * norte, hacia el este) HACIA ARRIBA, en píxeles del lienzo desde el centro del minimapa. Lo que se ve de
 * frente sale arriba (`v` negativa) y lo de la derecha, a la derecha.
 */
export function alMinimapa(dx: number, dz: number, giro: number): PuntoDelMapa {
  const c = Math.cos(giro);
  const s = Math.sin(giro);
  const derecha = dx * c + dz * s;
  const delante = dx * s - dz * c;
  return { u: derecha * PIXELES_POR_METRO, v: -delante * PIXELES_POR_METRO };
}

/** DEL MUNDO AL PLANO: el norte arriba y la esquina noroeste de la ciudad (−270, −270) en el píxel (0, 0). */
export function alPlano(x: number, z: number): PuntoDelMapa {
  return { u: (x + BORDE_DE_LA_CIUDAD) * PIXELES_POR_METRO, v: (z + BORDE_DE_LA_CIUDAD) * PIXELES_POR_METRO };
}

/** DEL PLANO AL MUNDO: la inversa de `alPlano`, para saber qué sitio se tocó. */
export function delPlano(u: number, v: number): { readonly x: number; readonly z: number } {
  return { x: u / PIXELES_POR_METRO - BORDE_DE_LA_CIUDAD, z: v / PIXELES_POR_METRO - BORDE_DE_LA_CIUDAD };
}

/** Los metros que se enseñan: al metro, y −1 si no se llega (una distancia negativa o que no es un número). */
export function metrosQueSeEnsenan(metros: number): number {
  return Number.isFinite(metros) && metros >= 0 ? Math.round(metros) : -1;
}
