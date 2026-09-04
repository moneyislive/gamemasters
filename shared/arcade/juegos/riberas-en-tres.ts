/**
 * RIBERAS, TRADUCIDA PARA LA ESCENA EN TRES DIMENSIONES: de la vista que manda la
 * mesa a lo que el tablero 3D pinta, y de lo que el tablero 3D toca al movimiento
 * que hay que mandar.
 *
 * ═══ QUÉ ES ESTO Y QUÉ NO ═══
 *
 * La escena del delta (`escenas/delta.tsx`) no sabe que existe Riberas: pinta un
 * `DeltaEn3D` —islas, piezas, caminos— y ofrece una barra de piezas, una mano de
 * cartas y unos anillos donde se puede construir. Todo eso lo tiene que decir
 * alguien que SÍ sepa de Riberas, y ese alguien no puede ser la pantalla de cada
 * cliente: habría dos traducciones —la de la app y la del escritorio— que un día
 * dirían cosas distintas. Aquí vive la traducción, UNA vez, sin `three` y sin
 * React, para que un comprobador de Node la pueda ejercitar con partidas de verdad.
 *
 * NO HAY NINGUNA REGLA AQUÍ. Dónde se puede construir lo dice `riberas-en-3d.ts`
 * llamando a `opcionesDeRiberas`, la misma lista que el reductor exige antes de
 * aceptar nada; qué hay construido lo dice `deltaDeLaVista`, del mismo fichero.
 * Este fichero sólo cambia de forma lo que ya está decidido en otro sitio.
 *
 * ═══ QUÉ PONE ESTE FICHERO ENCIMA DE `riberas-en-3d.ts` ═══
 *
 * `riberas-en-3d.ts` lee la vista (`deltaDeLaVista`, `manoDeLaVista`,
 * `bastanColores`) y dice dónde cabe cada obra (`obraPosible`). Lo que falta para
 * que una pantalla juegue es lo que hay aquí: la BARRA (qué pieza se enciende y con
 * qué modelo), el ANILLO con el movimiento de cada sitio para mandarlo tal cual al
 * soltar, las OPCIONES que no se tocan en el tablero (tirar, pasar, contestar), y
 * los TRUEQUES por carta (qué se puede pedir a cambio, a quién). Nada de esto se
 * duplica en los clientes.
 *
 * ═══ POR QUÉ SÓLO SE IMPORTAN TIPOS DE `escenas/` ═══
 *
 * `shared/` lo compilan cuatro paquetes y dos de ellos no tienen `three`. Un
 * `import type` se borra al compilar, así que las formas de salida son las de la
 * escena de verdad (`DeltaEn3D`, `ColorDeJugador`) sin arrastrar su código; es lo
 * mismo que hace `riberas-en-3d.ts`. `CartaEnLaMano`, `PiezaDeBarra` y `Colocando`
 * se declaran aquí con la misma forma y encajan por estructura.
 *
 * ═══ LO QUE ES PROVISIONAL, DICHO CON TODAS LAS LETRAS ═══
 *
 * 1. Los COLORES. `tablero.glb` trae hoy las piezas de jugador en los cuatro
 *    colores del atlas (`COLORES_EN_3D`, repartidos por orden de asiento en
 *    `deltaDeLaVista`) y Riberas admite SEIS colonos. No se reparte con un módulo
 *    —dos colonos del mismo color es una partida injugable sin ningún error a la
 *    vista—: `seVeEnTres` pregunta antes, y si no bastan los colores el tablero en
 *    tres devuelve `null` y el cliente enseña el tablero plano de siempre. Cuando el
 *    tablero se hornee a color y se tiña al cargar como el embarcadero, esta nota y
 *    ese límite desaparecen.
 * 2. Los BIENES. Riberas llama a los suyos limo, junco, sal, piedra y grano, y así
 *    salen de `manoDeLaVista`. Pero los iconos de las cartas de la escena son hoy
 *    los del pack —madera, ladrillo, mineral, lana, grano— y sin traducir, cuatro de
 *    las cinco cartas saldrían sin dibujo reconocible. La tabla `BIEN_EN_LA_ESCENA`
 *    traduce SÓLO para pintar, por PAPEL en el juego y no por parecido: el junco es
 *    lo que se tala, el limo lo que se cuece, la piedra lo que se pica, la sal lo que
 *    se recoge del prado. La carga que va al reductor lleva siempre el nombre de
 *    Riberas (`bienDeRiberas` deshace la traducción). Cuando llegue el arte propio
 *    de Riberas, esta tabla sobra.
 *
 * ═══ LOS IDENTIFICADORES DE LA BARRA SON NUESTROS ═══
 *
 * `poblado`, `ciudad` y `puente` son los nombres de la ESCENA (los modelos), y
 * `choza`, `torre` y `vereda` los de las REGLAS. La barra habla el primero porque
 * enseña modelos; el movimiento habla el segundo porque va al reductor. La
 * traducción entre los dos está en `PIEZAS_DE_LA_BARRA` y en ningún otro sitio.
 */
import type { ColorDeJugador, DeltaEn3D } from '../../../escenas/tipos';
import type { Hex, LlaveDeArista, LlaveDeVertice } from '../../mecanicas/malla-hexagonal';
import type { AsientoId } from '../tipos';
import { ALZAR, FUNDAR, OFRECER } from './riberas';
import { bastanColores, COLORES_EN_3D, deltaDeLaVista, manoDeLaVista, obraPosible } from './riberas-en-3d';
import type { PiezaDeObra, SitioDeObra } from './riberas-en-3d';

// ---------------------------------------------------------------------------
// LO QUE SE LEE DE LA VISTA, declarado por estructura
// ---------------------------------------------------------------------------

/**
 * La parte de la vista de Riberas que esta traducción necesita. Se declara aquí y
 * no se importa `VistaDeRiberas` entera: lo que llega por el cable puede venir de
 * un servidor con otra versión, y lo único garantizado es lo que se comprueba.
 */
interface ColonoEnLaVista {
  readonly asiento: AsientoId;
  readonly nombre: string;
  readonly color: string;
  readonly chozas: readonly LlaveDeVertice[];
  readonly torres: readonly LlaveDeVertice[];
  readonly veredas: readonly LlaveDeArista[];
}

interface VistaQueSePinta {
  readonly desde: 'riberas';
  readonly momento: string;
  readonly colonos: readonly ColonoEnLaVista[];
  readonly islas: readonly { readonly hex: Hex; readonly terreno: string; readonly numero: number }[];
  readonly turnoDe: AsientoId | null;
  readonly yo: AsientoId | null;
  readonly misFichas?: readonly string[];
}

/** ¿Es esto una vista de Riberas con lo que hace falta para pintarla? */
export function esVistaQueSePinta(vista: unknown): vista is VistaQueSePinta {
  if (typeof vista !== 'object' || vista === null) return false;
  const v = vista as Record<string, unknown>;
  return (
    v['desde'] === 'riberas' &&
    typeof v['momento'] === 'string' &&
    Array.isArray(v['colonos']) &&
    Array.isArray(v['islas'])
  );
}

/**
 * ¿SE PUEDE ENSEÑAR ESTA MESA EN TRES DIMENSIONES? Es de Riberas y caben sus
 * colonos en los colores que el tablero sabe pintar. Si no, el cliente pinta el
 * tablero plano: pobre y honrado, mejor que un tablero que miente.
 */
export function seVeEnTres(vista: unknown): boolean {
  return esVistaQueSePinta(vista) && bastanColores(vista);
}

// ---------------------------------------------------------------------------
// LO QUE SE ENTREGA A LA ESCENA, con la forma que ella espera
// ---------------------------------------------------------------------------

/** El tablero tal como lo pinta la escena. Es `DeltaEn3D` con su nombre de aquí. */
export type TableroEnTres = DeltaEn3D;

/** La misma forma que `CartaEnLaMano` de `escenas/baraja.ts`. */
export interface CartaEnTres {
  readonly id: string;
  readonly bien: string;
}

/** La misma forma que `PiezaDeBarra` de `escenas/barra.ts`, más de qué obra habla. */
export interface PiezaDeLaBarraEnTres {
  readonly id: IdDeLaBarra;
  readonly modelo: string;
  readonly disponible: boolean;
  readonly pieza: PiezaDeObra;
}

/** La misma forma que `Colocando` de `escenas/sitios.ts`, más el movimiento de cada sitio. */
export interface ColocandoEnTres {
  readonly clase: 'vertice' | 'arista';
  readonly donde: readonly string[];
  /** Llave del sitio → movimiento ya montado por las reglas. El cliente no monta nada. */
  readonly movimientos: ReadonlyMap<string, SitioDeObra['movimiento']>;
}

export type IdDeLaBarra = 'poblado' | 'ciudad' | 'puente';

/** Qué modelo enseña cada hueco de la barra y qué obra de las reglas es. */
export const PIEZAS_DE_LA_BARRA: readonly { readonly id: IdDeLaBarra; readonly pieza: PiezaDeObra }[] = [
  { id: 'poblado', pieza: 'choza' },
  { id: 'ciudad', pieza: 'torre' },
  { id: 'puente', pieza: 'vereda' },
];

/** Los bienes de Riberas dichos con los nombres que la escena conoce. Ver «provisional», 2. */
export const BIEN_EN_LA_ESCENA: Readonly<Record<string, string>> = {
  junco: 'madera',
  limo: 'ladrillo',
  piedra: 'mineral',
  sal: 'lana',
  grano: 'grano',
};

// ---------------------------------------------------------------------------
// De la vista al tablero
// ---------------------------------------------------------------------------

/** En qué posición está sentado un asiento, según el orden de colonos de la vista. */
export function indiceDelColono(vista: VistaQueSePinta, asiento: AsientoId | null): number {
  if (asiento === null) return -1;
  return vista.colonos.findIndex((c) => c.asiento === asiento);
}

/**
 * El color con el que `deltaDeLaVista` pinta las piezas del colono `i`, o `null` si
 * para ese colono no hay color: es el MISMO reparto —por orden de asiento, sin
 * módulo— para que la barra enseñe la pieza del color que luego aparece en el tablero.
 */
export function colorDePiezaDelColono(i: number): ColorDeJugador | null {
  return i < 0 ? null : (COLORES_EN_3D[i] ?? null);
}

/**
 * EL TABLERO EN TRES DIMENSIONES que sale de la vista, o `null` si todavía no hay
 * delta (mientras se reúne la mesa), si la vista no es de Riberas, o si la mesa no
 * cabe en los colores del tablero (`seVeEnTres`). En los tres casos el cliente no
 * pinta la escena; en el último pinta el tablero plano.
 */
export function tableroEnTres(vista: unknown): TableroEnTres | null {
  if (!seVeEnTres(vista) || !esVistaQueSePinta(vista) || vista.islas.length === 0) return null;
  return deltaDeLaVista(vista);
}

// ---------------------------------------------------------------------------
// La mano
// ---------------------------------------------------------------------------

/**
 * MI MANO, tal como la pinta la escena: las cartas de `manoDeLaVista` (una por
 * ficha, con el identificador de la ficha como llave) con el bien traducido al
 * nombre del icono que la escena tiene hoy. Vacía para quien mira sin jugar.
 */
export function manoEnTres(vista: unknown): CartaEnTres[] {
  return manoDeLaVista(vista).map((c) => ({ id: c.id, bien: BIEN_EN_LA_ESCENA[c.bien] ?? c.bien }));
}

// ---------------------------------------------------------------------------
// La barra y la colocación
// ---------------------------------------------------------------------------

/**
 * LA BARRA DE CONSTRUIR de este asiento: las tres obras, encendida cada una si las
 * reglas ofrecen ahora mismo algún sitio para ella. El modelo del poblado y de la
 * ciudad lleva el color del colono; el puente es de nadie. Vacía para un mirón y
 * para un colono al que no le llega color (ver `seVeEnTres`).
 */
export function barraEnTres(vista: unknown, quien: AsientoId | null): PiezaDeLaBarraEnTres[] {
  if (!esVistaQueSePinta(vista) || quien === null) return [];
  const color = colorDePiezaDelColono(indiceDelColono(vista, quien));
  if (color === null) return [];
  return PIEZAS_DE_LA_BARRA.map(({ id, pieza }) => ({
    id,
    pieza,
    modelo: id === 'puente' ? 'puente' : `${id}-${color}`,
    disponible: obraPosible(vista, quien, pieza).sitios.length > 0,
  }));
}

/**
 * QUÉ SE ESTÁ COLOCANDO al coger una pieza de la barra: la clase de sitio, las llaves
 * donde las reglas lo permiten, y el movimiento de cada una para mandarlo tal cual
 * al soltar. `null` si esa pieza no se puede poner en ningún sitio ahora.
 */
export function colocandoEnTres(vista: unknown, quien: AsientoId | null, id: IdDeLaBarra): ColocandoEnTres | null {
  if (!esVistaQueSePinta(vista) || quien === null) return null;
  const pieza = PIEZAS_DE_LA_BARRA.find((p) => p.id === id)?.pieza;
  if (pieza === undefined) return null;
  const obra = obraPosible(vista, quien, pieza);
  if (obra.clase === null || obra.sitios.length === 0) return null;
  return {
    clase: obra.clase,
    donde: obra.sitios.map((s) => s.llave),
    movimientos: new Map(obra.sitios.map((s) => [s.llave, s.movimiento] as const)),
  };
}

// ---------------------------------------------------------------------------
// Lo que no se toca en el tablero: dados, pasar, tratos
// ---------------------------------------------------------------------------

/** La forma mínima de una opción tal como llega por el cable. */
export interface OpcionQueLlega {
  readonly id: string;
  readonly tipo: string;
  readonly carga: unknown;
  readonly rotulo: string;
  readonly ayuda: string;
}

/**
 * LAS OPCIONES QUE SE PINTAN COMO BOTONES, fuera de la escena: tirar, pasar, aceptar
 * y rechazar tratos, y empezar. Fuera quedan las que el tablero ya ofrece con sus
 * anillos (fundar y alzar) y las de ofrecer un trueque, que las pinta la mano.
 *
 * Es la misma regla que `opcionesSueltas` aplica al tablero SVG: cada movimiento se
 * enseña exactamente una vez.
 */
export function opcionesFueraDelTablero<O extends OpcionQueLlega>(opciones: readonly O[]): O[] {
  return opciones.filter((o) => o.tipo !== FUNDAR && o.tipo !== ALZAR && o.tipo !== OFRECER);
}

/** Un trueque que se puede proponer ahora mismo, tal como lo ofrece el juego. */
export interface TruequePosible<O extends OpcionQueLlega = OpcionQueLlega> {
  readonly para: AsientoId;
  readonly nombre: string;
  readonly doy: string;
  readonly quiero: string;
  readonly opcion: O;
}

/** La carga de una opción de ofrecer, si tiene la forma que Riberas escribe. */
function truequeDeLaOpcion<O extends OpcionQueLlega>(vista: VistaQueSePinta, o: O): TruequePosible<O> | null {
  if (o.tipo !== OFRECER || typeof o.carga !== 'object' || o.carga === null) return null;
  const carga = o.carga as Record<string, unknown>;
  const para = carga['para'];
  const da = carga['da'];
  const pide = carga['pide'];
  if (typeof para !== 'string' || !Array.isArray(da) || !Array.isArray(pide)) return null;
  const doy = da[0];
  const quiero = pide[0];
  if (typeof doy !== 'string' || typeof quiero !== 'string') return null;
  const nombre = vista.colonos.find((c) => c.asiento === para)?.nombre ?? para;
  return { para, nombre, doy, quiero, opcion: o };
}

/**
 * QUÉ BIENES SE PUEDEN PEDIR A CAMBIO de uno que doy, según lo que el juego ofrece
 * ahora. Los nombres son los de RIBERAS (`sal`, `junco`…), que es lo que va en la
 * carga; la escena los recibe traducidos por `BIEN_EN_LA_ESCENA` para pintarlos.
 */
export function bienesQueSeCambianPor<O extends OpcionQueLlega>(vista: unknown, opciones: readonly O[], doy: string): string[] {
  if (!esVistaQueSePinta(vista)) return [];
  const quieros = new Set<string>();
  for (const o of opciones) {
    const t = truequeDeLaOpcion(vista, o);
    if (t !== null && t.doy === doy) quieros.add(t.quiero);
  }
  return [...quieros];
}

/**
 * A QUIÉN SE LE PUEDE PROPONER un trueque concreto: una entrada por colono al que el
 * juego permite ofrecérselo, con la opción entera para mandarla tal cual. Si sale
 * una sola, el cliente puede mandarla sin preguntar; si salen varias, tiene que
 * preguntar a quién, porque Riberas exige destinatario.
 */
export function truequesPosibles<O extends OpcionQueLlega>(vista: unknown, opciones: readonly O[], doy: string, quiero: string): TruequePosible<O>[] {
  if (!esVistaQueSePinta(vista)) return [];
  const lista: TruequePosible<O>[] = [];
  for (const o of opciones) {
    const t = truequeDeLaOpcion(vista, o);
    if (t !== null && t.doy === doy && t.quiero === quiero) lista.push(t);
  }
  return lista;
}

/** El bien de Riberas que corresponde a una carta de la mano ya traducida. */
export function bienDeRiberas(bienEnLaEscena: string): string {
  for (const [deRiberas, deLaEscena] of Object.entries(BIEN_EN_LA_ESCENA)) {
    if (deLaEscena === bienEnLaEscena) return deRiberas;
  }
  return bienEnLaEscena;
}

/** ¿Me toca a mí? `false` para quien mira sin jugar o mientras se reúne la mesa. */
export function meToca(vista: unknown): boolean {
  return esVistaQueSePinta(vista) && vista.yo !== null && vista.turnoDe === vista.yo;
}
