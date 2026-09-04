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
 * aceptar nada; qué hay construido lo dice la vista. Este fichero sólo cambia de
 * forma lo que ya está decidido en otro sitio.
 *
 * ═══ POR QUÉ NO IMPORTA NADA DE `escenas/` ═══
 *
 * Por la misma razón que `riberas-en-3d.ts`: `shared/` lo compilan cuatro
 * paquetes y dos de ellos no tienen `three`. Los tipos de salida se declaran aquí
 * con la MISMA forma que los de la escena (`DeltaEn3D`, `CartaEnLaMano`,
 * `PiezaDeBarra`, `Colocando`) y encajan por estructura. Si la escena cambiara la
 * suya, el cliente que junta las dos dejaría de compilar, que es exactamente donde
 * se quiere que se note.
 *
 * ═══ LO QUE ES PROVISIONAL, DICHO CON TODAS LAS LETRAS ═══
 *
 * 1. El COLOR de las piezas. `tablero.glb` trae hoy las piezas de jugador en los
 *    cuatro colores del pack (`blue`, `red`, `green`, `yellow`), y la escena las
 *    fabrica moviendo las UV de la textura. Riberas tiene SEIS colonos con su
 *    propia paleta (`ColonoVisto.color`, la misma de `escenas/embarcadero/tema.ts`).
 *    Mientras el tablero se compile con textura, aquí se reparten los cuatro del
 *    pack por orden de asiento; los caminos, que la escena tiñe con un `#rrggbb`,
 *    ya llevan el color de Riberas. El día que el tablero se hornee a color por
 *    vértice y se tiña al cargar como el embarcadero, `colorDePiezaDelColono` pasa
 *    a devolver el `#rrggbb` del colono y esta nota desaparece.
 * 2. Los BIENES. La escena conoce cinco bienes por el nombre de sus modelos del
 *    pack de recursos —madera, ladrillo, mineral, lana, grano— y Riberas llama a
 *    los suyos limo, junco, sal, piedra y grano. La correspondencia es por PAPEL en
 *    el juego, no por parecido: el junco es lo que se tala, el limo lo que se cuece,
 *    la piedra lo que se pica, la sal lo que se recoge del prado. Cuando la escena
 *    acepte los bienes de Riberas por su nombre, esta tabla sobra.
 *
 * ═══ LOS IDENTIFICADORES DE LA BARRA SON NUESTROS ═══
 *
 * `poblado`, `ciudad` y `puente` son los nombres de la ESCENA (los modelos), y
 * `choza`, `torre` y `vereda` los de las REGLAS. La barra habla el primero porque
 * enseña modelos; el movimiento habla el segundo porque va al reductor. La
 * traducción entre los dos está en `PIEZAS_DE_LA_BARRA` y en ningún otro sitio.
 */
import type { Hex, LlaveDeArista, LlaveDeVertice } from '../../mecanicas/malla-hexagonal';
import type { AsientoId } from '../tipos';
import { ALZAR, FUNDAR, OFRECER } from './riberas';
import { obraPosible } from './riberas-en-3d';
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

// ---------------------------------------------------------------------------
// LO QUE SE ENTREGA A LA ESCENA, con la forma que ella espera
// ---------------------------------------------------------------------------

/** Los cuatro colores que el pack trae compilados. Ver «lo que es provisional», 1. */
export type ColorDelPack = 'blue' | 'red' | 'green' | 'yellow';
export const COLORES_DEL_PACK: readonly ColorDelPack[] = ['blue', 'red', 'green', 'yellow'];

/** La misma forma que `DeltaEn3D` de `escenas/tipos.ts`. */
export interface TableroEnTres {
  readonly islas: readonly { readonly hex: Hex; readonly terreno: string; readonly cifra: number | null }[];
  readonly piezas: readonly { readonly vertice: LlaveDeVertice; readonly clase: 'poblado' | 'ciudad'; readonly color: ColorDelPack }[];
  readonly caminos: readonly { readonly arista: LlaveDeArista; readonly color: string }[];
  readonly ladron: Hex | null;
}

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

/** El color de pack con el que se pintan las piezas del colono `i`. Provisional: ver la cabecera. */
export function colorDePiezaDelColono(i: number): ColorDelPack {
  const n = COLORES_DEL_PACK.length;
  return COLORES_DEL_PACK[((i % n) + n) % n] as ColorDelPack;
}

/**
 * EL TABLERO EN TRES DIMENSIONES que sale de la vista, o `null` si todavía no hay
 * delta (mientras se reúne la mesa) o si la vista no es de Riberas.
 *
 * La cifra `0` de la duna pasa a `null`: en Riberas cero significa «no rinde», y en
 * la escena `null` significa «sin número», que es lo mismo dicho en su idioma.
 */
export function tableroEnTres(vista: unknown): TableroEnTres | null {
  if (!esVistaQueSePinta(vista) || vista.islas.length === 0) return null;
  const piezas: TableroEnTres['piezas'][number][] = [];
  const caminos: TableroEnTres['caminos'][number][] = [];
  vista.colonos.forEach((c, i) => {
    const color = colorDePiezaDelColono(i);
    for (const v of c.chozas) piezas.push({ vertice: v, clase: 'poblado', color });
    for (const v of c.torres) piezas.push({ vertice: v, clase: 'ciudad', color });
    for (const a of c.veredas) caminos.push({ arista: a, color: c.color });
  });
  return {
    islas: vista.islas.map((i) => ({ hex: i.hex, terreno: i.terreno, cifra: i.numero > 0 ? i.numero : null })),
    piezas,
    caminos,
    /* Riberas no tiene ladrón: la duna simplemente no rinde. */
    ladron: null,
  };
}

// ---------------------------------------------------------------------------
// La mano
// ---------------------------------------------------------------------------

/** El bien de una ficha `b17:junco`, o `null` si la ficha no tiene esa forma. */
export function bienDeLaFicha(ficha: string): string | null {
  const dosPuntos = ficha.indexOf(':');
  if (dosPuntos < 0 || dosPuntos === ficha.length - 1) return null;
  return ficha.slice(dosPuntos + 1);
}

/**
 * MI MANO, tal como la pinta la escena: una carta por ficha, con el identificador de
 * la ficha (único, que es lo que la baraja pide) y el bien traducido al nombre que la
 * escena conoce. Vacía para quien mira sin jugar.
 */
export function manoEnTres(vista: unknown): CartaEnTres[] {
  if (!esVistaQueSePinta(vista) || vista.misFichas === undefined) return [];
  const cartas: CartaEnTres[] = [];
  for (const ficha of vista.misFichas) {
    const bien = bienDeLaFicha(ficha);
    if (bien === null) continue;
    cartas.push({ id: ficha, bien: BIEN_EN_LA_ESCENA[bien] ?? bien });
  }
  return cartas;
}

// ---------------------------------------------------------------------------
// La barra y la colocación
// ---------------------------------------------------------------------------

/**
 * LA BARRA DE CONSTRUIR de este asiento: las tres obras, encendida cada una si las
 * reglas ofrecen ahora mismo algún sitio para ella. El modelo del poblado y de la
 * ciudad lleva el color del colono; el puente es de nadie.
 */
export function barraEnTres(vista: unknown, quien: AsientoId | null): PiezaDeLaBarraEnTres[] {
  if (!esVistaQueSePinta(vista) || quien === null) return [];
  const color = colorDePiezaDelColono(Math.max(0, indiceDelColono(vista, quien)));
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
