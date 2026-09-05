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
 * soltar, las OPCIONES que no se tocan en el tablero (tirar, pasar, contestar), los
 * TRUEQUES por carta (qué se puede pedir a cambio, a quién), la MANO DEL MAZO con
 * sus jugadas, los NAIPES DE PREMIO que van en esa misma mano, y el MARCADOR. Nada de
 * esto se duplica en los clientes.
 *
 * ═══ Y LOS PREMIOS VAN EN LA MANO SIN PASAR POR `misCartas` ═══
 *
 * El Vado Largo y La Mayor Guardia se ven como naipe en la mano de la izquierda, junto a
 * las cartas del mazo, pero salen por una puerta HERMANA —`premiosEnTres`— y no por
 * `cartasEnTres`. La razón está entera en la cabecera de esa función y se resume en una
 * línea: las cartas son SECRETAS y los premios son PÚBLICOS, y las dos cosas no pueden
 * viajar por el mismo campo del cable sin que una de las dos deje de ser lo que es.
 *
 * ═══ Y LO DEL MAZO SE TRADUCE IGUAL QUE LO DEMÁS: PREGUNTANDO ═══
 *
 * Una carta de la mano lleva dos banderas —`sePuedeJugar` y `sePuedeRevelar`— que
 * son la respuesta a «¿lo permiten las reglas AHORA?», y esa respuesta la da el
 * juego con la lista de opciones que ya ofrece. Aquí no se vuelve a mirar si la
 * carta se compró hoy, ni si ya se jugó otra, ni si queda mazo: todo eso está
 * escrito y probado en `opcionesDelMazo` de `riberas.ts`, y una segunda lectura de
 * las mismas reglas sería un segundo juez que casi siempre coincide — la peor clase
 * de fallo, la que sólo se ve el día que discrepan.
 *
 * Por eso `misCartas` se lee SÓLO para saber qué cartas tengo y de qué clase son.
 * Su campo `comprada` no se mira ni una vez, y NO SE DECLARA en `VistaQueSePinta`,
 * aunque esté ahí y aunque compararlo con `turnosAbiertos` sea una línea: esa línea
 * es la regla §1.4, y la regla vive en `riberas.ts`. `turnosAbiertos` SÍ se declara
 * desde que hay dados, y entra SÓLO como sello de la tirada (`selloDeLaTirada`,
 * `dadosEnTres`): es el número que hace que los cuatro aparatos partan la misma suma
 * en el mismo par y que el par no cambie a mitad de turno. Lo que sigue protegiendo la
 * regla es que `comprada` no está escrito: sin él no hay con qué compararlo, y
 * `verify:riberas-en-tres` lo afirma leyendo este fichero.
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
 * 1. Los COLORES (y la única que queda). `tablero.glb` trae hoy las piezas de jugador en los cuatro
 *    colores del atlas (`COLORES_EN_3D`, repartidos por orden de asiento en
 *    `deltaDeLaVista`) y Riberas admite SEIS colonos. No se reparte con un módulo
 *    —dos colonos del mismo color es una partida injugable sin ningún error a la
 *    vista—: `seVeEnTres` pregunta antes, y si no bastan los colores el tablero en
 *    tres devuelve `null` y el cliente enseña el tablero plano de siempre. Cuando el
 *    tablero se hornee a color y se tiña al cargar como el embarcadero, esta nota y
 *    ese límite desaparecen.
 * (Aquí hubo una segunda cosa provisional y ya no está: una tabla que traducía los
 * bienes de Riberas —limo, junco, sal, piedra, grano— a los del catán para poder
 * reaprovechar sus iconos. Duró un día. En un juego de trueques se mira la mano para
 * decidir qué ofrecer, y ver una OVEJA cuando lo que se tiene es sal no es un dibujo
 * provisional: es enseñar un bien que no se tiene. Un dibujo ausente se lee como
 * «falta el dibujo»; uno equivocado se lee como otra cosa. Ahora `escenas/iconos.ts`
 * dibuja los cinco de Riberas —la sal todavía sin icono, a sabiendas— y aquí no se
 * traduce nada: el bien viaja con su nombre de la vista al dibujo y del dibujo a la
 * carga del movimiento.)
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
import {
  ACAPARAMIENTO,
  ALZAR,
  ANO_BUENO,
  claseDeLaCarta,
  COMPRAR,
  DOS_VEREDAS,
  FUNDAR,
  GUARDIA,
  OFRECER,
  REVELAR,
  seudonimoDeLaCarta,
  TIRAR,
  VADO_MINIMO,
} from './riberas';
import type { ClaseDeCarta } from './riberas';
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
  /*
   * LO DEL MAZO VA OPCIONAL, Y ESO NO ES DEJADEZ.
   *
   * `esVistaQueSePinta` mira cuatro campos y ninguno de éstos, a propósito: por aquí
   * pasan vistas que no los traen y que son legítimas. La del banco de pruebas
   * (`vistaDePrueba` de `riberas-en-3d.ts`) no tiene mazo porque prueba anillos, y
   * una partida guardada antes de que el mazo existiera se rellena con «no hay mazo»
   * (`comoSiSiempreHubieraHabidoMazo`). Exigirlos aquí dejaría de pintar el tablero
   * entero por no saber cuántas cartas tiene nadie, que es lo de menos.
   */
  /** Sus puntos PÚBLICOS: los títulos sin revelar no están aquí. */
  readonly puntos?: number;
  /** CUÁNTAS cartas tiene en la mano. El número, no cuáles. */
  readonly cartas?: number;
  /** Cuántas guardias ha jugado. Público: es lo que hace ver venir el premio. */
  readonly guardias?: number;
  /** Los títulos que ha revelado. Públicos, y un punto cada uno. */
  readonly titulos?: readonly string[];
  /**
   * CUÁNTO MIDE SU CADENA DE VEREDAS MÁS LARGA. Público, y lo publica `proyectarRiberas`.
   *
   * Es el número con el que se compara `VADO_MINIMO`, y hasta hoy no lo pintaba NADIE.
   * Ése era el segundo fallo de Miguel: encadenó veredas, no se llevó el premio, y en toda
   * la pantalla no había una sola cifra que le dijera cuánto medía su cadena ni cuánto le
   * faltaba. Con el vecino cortándole el paso —ver `bloqueadosPara` en `riberas.ts`— la
   * cuenta del juego y la cuenta de quien mira el tablero no coinciden, y sin este número
   * la diferencia no se puede ni preguntar.
   */
  readonly vado?: number;
}

interface VistaQueSePinta {
  readonly desde: 'riberas';
  readonly momento: string;
  readonly colonos: readonly ColonoEnLaVista[];
  readonly islas: readonly { readonly hex: Hex; readonly terreno: string; readonly numero: number }[];
  readonly turnoDe: AsientoId | null;
  readonly yo: AsientoId | null;
  readonly misFichas?: readonly string[];
  /**
   * MI MANO DEL MAZO, y de cada carta se lee UNA cosa: su identificador.
   *
   * De ahí salen el seudónimo —lo único suyo que se puede publicar— y la clase. El
   * sello `comprada` que también viaja NO se declara aquí, y es deliberado: aunque
   * `turnosAbiertos` ya esté declarado más abajo para los dados, mientras `comprada` no
   * esté escrito nadie puede compararlos y reescribir sin querer la regla de que una
   * carta comprada no se juega hoy. Ver la cabecera.
   */
  readonly misCartas?: readonly { readonly carta?: unknown }[];
  /**
   * LO DE LOS DADOS, y para qué se lee cada campo. Opcionales, como `mazo`: una vista
   * de antes de que existieran se pinta igual, sin dados.
   *
   *   · `tirado` y `ultimaTirada` dicen qué enseñar: la suma, y si es de este turno.
   *   · `turnosAbiertos` entra SÓLO como sello del reparto (`selloDeLaTirada`), para
   *     que la suma se parta en el mismo par en todos los aparatos y no cambie a mitad
   *     de turno. Aquí no se compara con nada más, y `comprada` sigue sin declararse
   *     por eso mismo.
   */
  readonly tirado?: boolean;
  readonly ultimaTirada?: number;
  readonly turnosAbiertos?: number;
  /** MIS puntos con los títulos sin revelar dentro. Sólo míos. */
  readonly misPuntos?: number;
  /** Cuántas cartas quedan por comprar. Público: un mazo se cuenta. */
  readonly mazo?: number;
  /** El Vado Largo: de quién es y cuánto mide. Público entero. */
  readonly vado?: { readonly de?: AsientoId | null; readonly largo?: number };
  /** La Mayor Guardia: de quién es y con cuántas. Público entero. */
  readonly guardia?: { readonly de?: AsientoId | null; readonly cuantas?: number };
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

/**
 * LA MISMA FORMA QUE `MazoDeLaBarra` de `escenas/barra.ts`: el cuarto hueco de la barra.
 *
 * Una sola bandera, y a propósito. La escena no tiene que saber qué cuesta una carta ni
 * cuántas quedan: `COSTE_DE_LA_CARTA` vive en las reglas y republicarlo en el cliente es
 * exactamente la fuga contra la que existe este fichero entero. Lo que cuesta y cuántas
 * quedan lo dice el juego en el rótulo y la ayuda de la opción, y eso se lee en la
 * confirmación, escrito por quien conoce las reglas.
 */
export interface MazoEnLaBarraEnTres {
  readonly disponible: boolean;
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
 * MI MANO, tal como la pinta la escena: una carta por ficha, con el identificador de
 * la ficha como llave y el bien con SU nombre. Vacía para quien mira sin jugar.
 *
 * No hay nada que hacer aquí —es `manoDeLaVista` tal cual— y se deja escrito de todas
 * formas: este es el sitio donde estuvo la tabla que traducía los bienes al catán, y
 * tener la función nombrada evita que el día que alguien necesite tocar la mano vuelva
 * a abrirla en el cliente.
 */
export function manoEnTres(vista: unknown): CartaEnTres[] {
  return manoDeLaVista(vista);
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
 * EL CUARTO HUECO DE LA BARRA: el mazo, o `null` si esta pantalla no lo pinta.
 *
 * ═══ QUIÉN DECIDE QUE SE PUEDE COMPRAR, Y POR QUÉ NO SE VUELVE A CALCULAR AQUÍ ═══
 *
 * `comprarEnTres(opciones) !== null`, y nada más. Esa opción la ofrece el juego cuando le
 * llega el coste, queda mazo y le toca: las tres cosas a la vez y ya juzgadas por quien
 * conoce las reglas. Recalcularlo aquí —mirar los bienes de la mano contra un
 * `COSTE_DE_LA_CARTA` copiado— sería escribir una SEGUNDA cuenta de lo mismo, y la segunda
 * se separa siempre de la primera. Es la misma frontera que `barraEnTres`, que tampoco
 * mira bienes: pregunta si hay sitios ofrecidos.
 *
 * ═══ Y `null` NO ES LO MISMO QUE «apagado» ═══
 *
 * `null` es «aquí no hay hueco de mazo»: un mirón, o un colono al que no le llega color y
 * que por eso tampoco tiene barra (ver `seVeEnTres`). En esas pantallas la carta no se
 * pinta y —esto es lo que ata el nudo— el botón de comprar del pie TIENE que seguir ahí:
 * ver `opcionesFueraDeLaBarra`, que es quien lo quita y sólo lo quita cuando este hueco
 * existe de verdad.
 *
 * `{ disponible: false }` es otra cosa: el hueco está, se ve, y hoy no se puede pulsar. Es
 * lo que hay que enseñar cuando faltan bienes — un hueco que aparece y desaparece según la
 * mano obliga a acordarse de que existía, y una barra que cambia de tres a cuatro piezas se
 * recoloca entera, porque reparte CENTRADO.
 *
 * ═══ Y FUERA DE `jugando` TAMPOCO HAY HUECO ═══
 *
 * Esto no miraba `momento`, y durante TODA la colocación pintaba el cuarto hueco apagado:
 * se llevaba un cuarto del ancho y encogía las tres piezas de fundar y trazar en la única
 * fase en que la barra es lo único que se usa. Y lo vendía como lo segundo —«lo tiene y
 * hoy no se pulsa»— siendo lo primero: comprar en la colocación no es que no llegue el
 * coste, es que NO EXISTE la jugada, igual que mientras se reúne la mesa o cuando ya ha
 * terminado. Un hueco apagado promete que un día se encenderá; éste no iba a encenderse
 * hasta otra fase entera. Con `null` el botón de comprar vuelve al pie por
 * `opcionesFueraDeLaBarra`, y en esas fases no hay COMPRAR que devolver de todas formas.
 */
export function mazoEnLaBarra<O extends OpcionQueLlega>(
  vista: unknown,
  quien: AsientoId | null,
  opciones: readonly O[],
): MazoEnLaBarraEnTres | null {
  if (!esVistaQueSePinta(vista) || quien === null) return null;
  if (vista.momento !== 'jugando') return null;
  if (colorDePiezaDelColono(indiceDelColono(vista, quien)) === null) return null;
  return { disponible: comprarEnTres(opciones) !== null };
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
 *
 * LAS DEL MAZO NO SE QUITAN AQUÍ, y hay una función aparte para eso
 * (`opcionesFueraDeLaMano`). Quitarlas de ésta habría sido más limpio y habría
 * dejado un cliente que todavía no pinta la mano de cartas SIN NINGUNA manera de
 * jugarlas: las cartas desaparecerían de la pantalla sin un error en ninguna parte,
 * que es exactamente el fallo silencioso contra el que existe este fichero. Se
 * componen —`opcionesFueraDeLaMano(opcionesFueraDelTablero(o))`— el día que la
 * pantalla enseña la mano, y ese día lo decide la pantalla.
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
 * ahora. Los nombres son los de RIBERAS (`sal`, `junco`…), que son los mismos que la
 * escena pinta y los mismos que van en la carga del movimiento: no se traducen.
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

/** ¿Me toca a mí? `false` para quien mira sin jugar o mientras se reúne la mesa. */
export function meToca(vista: unknown): boolean {
  return esVistaQueSePinta(vista) && vista.yo !== null && vista.turnoDe === vista.yo;
}

// ---------------------------------------------------------------------------
// EL MAZO: la mano de cartas y lo que se puede hacer con cada una
// ---------------------------------------------------------------------------

/**
 * LA MISMA FORMA QUE `CartaDelMazo` de `escenas/cartas.ts`.
 *
 * Se declara aquí y no se importa, como `CartaEnTres` y `PiezaDeLaBarraEnTres`, por
 * lo que dice la cabecera del fichero: encajan por estructura. Que sigan encajando no
 * se deja a la buena voluntad — `verify:riberas-en-tres` mete lo que sale de aquí en
 * `huecosDeLasCartas` y en `puertasDeLaCarta`, que son las funciones de la escena de
 * verdad, así que el día que uno de los dos lados cambie un campo, el comprobador ni
 * siquiera compila.
 */
export interface CartaDelMazoEnTres {
  /** El SEUDÓNIMO de la carta (`c7`), que es lo único suyo que se puede publicar. */
  readonly id: string;
  /** `guardia` | `anobueno` | `acaparamiento` | `dosveredas` | `titulo`. */
  readonly familia: string;
  /** Una de las llaves de `CONTORNOS_DE_LA_CARTA`. */
  readonly dibujo: string;
  /** Lo que se lee: «La Guardia», «El Faro»… */
  readonly nombre: string;
  readonly sePuedeJugar: boolean;
  readonly sePuedeRevelar: boolean;
  /**
   * NO SE JUEGA: SE TIENE. Falso —ausente— en las nueve del mazo; sólo lo ponen los
   * premios, que salen por `premiosEnTres`. Es lo que evita que la escena los pinte
   * apagados por no poder jugarse nunca; ver `esPremio` en `escenas/cartas.ts`.
   */
  readonly esPremio?: boolean;
}

/** Cómo se enseña una clase de carta: a qué grupo va, qué dibujo lleva y cómo se lee. */
export interface RetratoDeLaCarta {
  readonly familia: string;
  readonly dibujo: string;
  readonly nombre: string;
}

/**
 * LAS NUEVE CLASES, CON SU CARA. Una fila por clase y ni una regla dentro.
 *
 * ═══ POR QUÉ ESTA TABLA ESTÁ AQUÍ Y NO EN `riberas.ts` ═══
 *
 * Porque las tres columnas son de PRESENTACIÓN y ninguna es del juego. `familia` es
 * cómo agrupa la mano de la escena —cinco montones, con los cinco títulos en uno—,
 * `dibujo` es la llave de un contorno de `escenas/iconos.ts`, y `nombre` es lo que se
 * lee en un naipe. Las reglas no distinguen a El Faro de El Huerto ni por asomo: para
 * ellas son la misma carta con dos seriales.
 *
 * Y son tres columnas y no una cuenta: `ano-bueno` se dibuja con `anobueno` y
 * `dos-veredas` con `dosveredas`, así que un `clase.replace('-', '')` habría dado la
 * respuesta correcta hoy y una llave inventada el día que alguien añada una carta con
 * guion en el nombre. Una tabla se pone roja; una cuenta se equivoca en silencio.
 *
 * ═══ Y POR QUÉ ES `Record<ClaseDeCarta, …>` Y NO UN DICCIONARIO SUELTO ═══
 *
 * Para que el compilador exija las nueve. Una carta nueva en `CLASES_DE_CARTA` sin
 * fila aquí no compila, en vez de salir a la mano sin dibujo y sin nombre. El
 * comprobador afirma además lo contrario —que no sobra ninguna— porque eso el
 * compilador no lo mira.
 */
const RETRATO_DE_LA_CARTA: Readonly<Record<ClaseDeCarta, RetratoDeLaCarta>> = {
  guardia: { familia: 'guardia', dibujo: 'guardia', nombre: 'La Guardia' },
  'ano-bueno': { familia: 'anobueno', dibujo: 'anobueno', nombre: 'El Año Bueno' },
  acaparamiento: { familia: 'acaparamiento', dibujo: 'acaparamiento', nombre: 'El Acaparamiento' },
  'dos-veredas': { familia: 'dosveredas', dibujo: 'dosveredas', nombre: 'Las Dos Veredas' },
  molino: { familia: 'titulo', dibujo: 'molino', nombre: 'El Molino' },
  cantera: { familia: 'titulo', dibujo: 'cantera', nombre: 'La Cantera' },
  torreon: { familia: 'titulo', dibujo: 'torreon', nombre: 'El Torreón' },
  faro: { familia: 'titulo', dibujo: 'faro', nombre: 'El Faro' },
  huerto: { familia: 'titulo', dibujo: 'huerto', nombre: 'El Huerto' },
};

/**
 * LA CARA DE UNA CLASE DE CARTA, o `null` si no es ninguna de las nueve.
 *
 * Recibe `string` y no `ClaseDeCarta` a propósito: quien pregunta suele venir de una
 * cadena que llegó por el cable —el título revelado de otro colono, por ejemplo—, y
 * obligarle a afirmar el tipo antes de preguntar sería pedirle que se fíe.
 */
export function retratoDeLaCarta(clase: string): RetratoDeLaCarta | null {
  return (RETRATO_DE_LA_CARTA as Readonly<Record<string, RetratoDeLaCarta>>)[clase] ?? null;
}

/** Las cuatro maneras de JUGAR una carta. Los títulos no están: se revelan. */
export type ClaseDeJugada = 'guardia' | 'anobueno' | 'acaparamiento' | 'dosveredas';

/**
 * DE QUÉ JUGADA HABLA CADA TIPO DE MOVIMIENTO.
 *
 * Se mira el TIPO y nunca el `id`, por lo mismo que `piezaDeLaOpcion` en
 * `riberas-en-3d.ts`: el `id` es texto para las listas y cambiarlo es una decisión de
 * presentación que nadie espera que rompa nada.
 *
 * Las cuatro etiquetas coinciden con las cuatro familias no-título del retrato, y la
 * coincidencia no es casual ni se deja al azar: el comprobador exige que la jugada de
 * una carta lleve la misma etiqueta que la familia con que esa carta se pinta, que es
 * lo que permite a la pantalla decidir qué preguntar mirando el naipe.
 */
const CLASE_DE_LA_JUGADA: Readonly<Record<string, ClaseDeJugada>> = {
  [GUARDIA]: 'guardia',
  [ANO_BUENO]: 'anobueno',
  [ACAPARAMIENTO]: 'acaparamiento',
  [DOS_VEREDAS]: 'dosveredas',
};

/** Los cuatro movimientos que GASTAN la jugada del turno. Revelar no está: no la gasta. */
export const TIPOS_QUE_JUEGAN_CARTA: readonly string[] = Object.keys(CLASE_DE_LA_JUGADA);

/**
 * LO QUE PINTA LA MANO DEL MAZO, y por tanto lo que no puede salir además como botón.
 *
 * Comprar NO está, y es la única del mazo que falta: comprar no es una carta de la
 * mano —no hay nada que arrastrar— y en la escena no hay mazo que pulsar, así que su
 * botón es el único sitio donde existe. Meterla aquí la haría desaparecer.
 */
export const TIPOS_QUE_PINTA_LA_MANO: readonly string[] = [...TIPOS_QUE_JUEGAN_CARTA, REVELAR];

/** El seudónimo que lleva dentro la carga de un movimiento del mazo, si lo lleva. */
function cartaDeLaCarga(carga: unknown): string | null {
  if (typeof carga !== 'object' || carga === null) return null;
  const suyo = (carga as Record<string, unknown>)['carta'];
  return typeof suyo === 'string' ? suyo : null;
}

/**
 * MI MANO DEL MAZO, tal como la pinta la escena.
 *
 * ═══ LAS DOS BANDERAS SALEN DE LAS OPCIONES, Y DE NADA MÁS ═══
 *
 * `sePuedeJugar` es «hay ahora mismo una opción de jugar ESTA carta», y
 * `sePuedeRevelar` lo mismo con revelar. No se mira el turno, ni el sello de compra,
 * ni si ya se jugó otra: si el juego no la ofrece, es `false`, y punto. Es la misma
 * decisión que toma `barraEnTres` con `disponible`, y por el mismo motivo — dos
 * jueces que casi siempre coinciden acaban ofreciendo un naipe encendido que el
 * servidor rechaza.
 *
 * Salen TODAS las cartas, también las apagadas: que se vean las tres guardias que
 * no puedo jugar hoy es una regla del juego y no una cortesía (ver `apagada` en
 * `escenas/cartas.ts`). Y salen en el orden en que están en la mano; agruparlas por
 * familias es cosa de la escena, que ya lo hace y lo hace igual para todos.
 *
 * Vacía para quien mira sin jugar: `misCartas` no viaja a nadie más.
 */
export function cartasEnTres<O extends OpcionQueLlega>(
  vista: unknown,
  opciones: readonly O[],
): CartaDelMazoEnTres[] {
  if (!esVistaQueSePinta(vista)) return [];

  const seJuegan = new Set<string>();
  const seRevelan = new Set<string>();
  for (const o of opciones) {
    const suyo = cartaDeLaCarga(o.carga);
    if (suyo === null) continue;
    if (o.tipo === REVELAR) seRevelan.add(suyo);
    else if (CLASE_DE_LA_JUGADA[o.tipo] !== undefined) seJuegan.add(suyo);
  }

  const cartas: CartaDelMazoEnTres[] = [];
  for (const enMano of vista.misCartas ?? []) {
    const cruda = enMano?.carta;
    if (typeof cruda !== 'string') continue;
    const clase = claseDeLaCarta(cruda);
    if (clase === null) continue;
    const retrato = retratoDeLaCarta(clase);
    if (retrato === null) continue;
    /* El seudónimo y NUNCA la carta entera: la carta es secreta y el `id` se publica. */
    const id = seudonimoDeLaCarta(cruda);
    cartas.push({
      id,
      familia: retrato.familia,
      dibujo: retrato.dibujo,
      nombre: retrato.nombre,
      sePuedeJugar: seJuegan.has(id),
      sePuedeRevelar: seRevelan.has(id),
    });
  }
  return cartas;
}

// ---------------------------------------------------------------------------
// LOS PREMIOS: la otra mitad de la mano, y no salen de `misCartas`
// ---------------------------------------------------------------------------

/**
 * LOS DOS PREMIOS, CON SU CARA DE NAIPE.
 *
 * Se llaman `vado` y `mayorguardia` y son familias SUYAS, distintas de la familia
 * `guardia` de la carta que se juega. Que no compartan nombre no es una precaución
 * ociosa: si el premio fuera de la familia `guardia`, la escena lo agruparía con las
 * guardias de la mano y lo pintaría del mismo color, o sea que el premio se leería como
 * una guardia más — y las guardias son justo lo que hay que contar para saber si el
 * premio se va a mover.
 */
const RETRATO_DEL_PREMIO = {
  vado: { familia: 'vado', dibujo: 'vado', nombre: 'El Vado Largo' },
  guardia: { familia: 'mayorguardia', dibujo: 'mayorguardia', nombre: 'La Mayor Guardia' },
} as const;

/**
 * EL PREFIJO DE LOS DOS NAIPES DE PREMIO, y por qué lleva dos puntos dentro.
 *
 * El `id` de un naipe tiene que ser único dentro de la mano, y en esa mano ya viven los
 * seudónimos de las cartas del mazo. Un seudónimo NUNCA lleva dos puntos —`seudonimoDeLaCarta`
 * devuelve justo lo que hay antes de ellos—, así que con este prefijo la colisión no es
 * improbable: es imposible. Con `vado` a secas bastaría con que alguien llamara `vado` a una
 * carta para que la mano tuviera dos naipes con la misma llave y React pintara uno.
 */
const PREFIJO_DEL_PREMIO = 'premio:';

/**
 * LOS NAIPES DE PREMIO DE UN COLONO: El Vado Largo y La Mayor Guardia, los que tenga.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ DENTRO DE `cartasEnTres` ═══
 *
 * Porque un premio NO es una carta y meterlo donde están las cartas obligaría a mentir en
 * el único sitio donde no se puede. `cartasEnTres` recorre `vista.misCartas`, que es el
 * campo SECRETO: no viaja a nadie más que a su dueño, y todo el fichero está escrito
 * alrededor de eso. Un premio es PÚBLICO —quién tiene el Vado lo sabe la mesa entera, y de
 * hecho es la mitad de lo que se está jugando— y sale de `vista.vado` y `vista.guardia`,
 * que sí van a todos. Metido en `misCartas` habría que empezar por mandarlo por el cable
 * dentro del campo secreto, y ahí `verify:mesa` tendría razón en ponerse rojo.
 *
 * De ahí que ésta reciba `quien` y `cartasEnTres` no: la mano de cartas es la de quien mira
 * y no se puede pedir la de otro; los premios de cualquiera se pueden pedir desde la vista
 * de cualquiera, porque no hay nada que tapar. Un mirón sin asiento no pide ninguno — no es
 * secreto, es que no es de nadie.
 *
 * ═══ Y NINGUNO LLEVA `sePuedeJugar` ═══
 *
 * Los dos salen con las dos banderas en `false` y con `esPremio` puesto, y las tres cosas
 * dicen lo mismo por tres caminos: no hay ningún movimiento que mandar con un premio. No se
 * juega, no se revela y no se pierde por voluntad de nadie — se gana solo cuando la cadena
 * llega a cinco o las guardias a tres, y se va solo cuando otro te adelanta. `esPremio` es
 * lo que además impide que la escena lo pinte APAGADO por no poder jugarse: ver la
 * cabecera de ese campo en `escenas/cartas.ts`.
 */
export function premiosEnTres(vista: unknown, quien: AsientoId | null): CartaDelMazoEnTres[] {
  if (!esVistaQueSePinta(vista) || quien === null) return [];
  const naipes: CartaDelMazoEnTres[] = [];
  const conCara = (llave: keyof typeof RETRATO_DEL_PREMIO): CartaDelMazoEnTres => {
    const cara = RETRATO_DEL_PREMIO[llave];
    return {
      id: `${PREFIJO_DEL_PREMIO}${llave}`,
      familia: cara.familia,
      dibujo: cara.dibujo,
      nombre: cara.nombre,
      sePuedeJugar: false,
      sePuedeRevelar: false,
      esPremio: true,
    };
  };
  if ((vista.vado?.de ?? null) === quien) naipes.push(conCara('vado'));
  if ((vista.guardia?.de ?? null) === quien) naipes.push(conCara('guardia'));
  return naipes;
}

/**
 * LA MANO ENTERA DE LA IZQUIERDA: los premios primero y las cartas del mazo detrás.
 *
 * Sale nombrada, aunque sean dos llamadas y un `...`, por lo que pasó la última vez que
 * una composición de dos listas se dejó a cada cliente: la app y el escritorio pintan la
 * MISMA mano, y si uno de los dos se olvida de los premios el fallo es exactamente el que
 * se está arreglando —el premio que no aparece— sólo que en una pantalla de las dos, que es
 * la clase de fallo que tarda meses en contarse.
 *
 * El orden de aquí da igual para el reparto —`huecosDeLasCartas` reordena por familias— y
 * se escribe con los premios delante de todas formas, para que quien lea esta línea vea el
 * mismo orden que va a ver en pantalla.
 *
 * ═══ `quien` MANDA EN LAS DOS MITADES ═══
 *
 * La firma prometía la mano de `quien` y la cumplía a medias: los premios eran los suyos y
 * las cartas eran siempre `misCartas`, o sea las de quien MIRA. Pedir la mano de otro
 * devolvía sus premios pegados a mis cartas. No es una fuga —las cartas ya eran mías— pero
 * es una firma que miente, en la función que los dos clientes llaman. Las cartas sólo salen
 * cuando `quien` es el dueño de la vista; la mano de otro son sus premios y nada más, que
 * es exactamente lo que la vista sabe de él.
 */
export function laManoDeLaIzquierda<O extends OpcionQueLlega>(
  vista: unknown,
  opciones: readonly O[],
  quien: AsientoId | null,
): CartaDelMazoEnTres[] {
  const esElDueno = esVistaQueSePinta(vista) && quien !== null && vista.yo === quien;
  return [...premiosEnTres(vista, quien), ...(esElDueno ? cartasEnTres(vista, opciones) : [])];
}

/**
 * UNA MANERA DE JUGAR UNA CARTA, con lo que hay que preguntar ya resuelto y la opción
 * entera dentro para mandarla tal cual.
 *
 * Es el mismo trato que `SitioDeObra` le da a una obra y `TruequePosible` a una
 * oferta: viaja el MOVIMIENTO, no sus piezas. Si sólo viajara «a quién» o «qué
 * bienes», la pantalla tendría que volver a montar `{ tipo, carga }` y la forma del
 * movimiento estaría escrita en dos sitios — y el segundo no se comprueba nunca.
 */
export interface JugadaDeCarta<O extends OpcionQueLlega = OpcionQueLlega> {
  readonly clase: ClaseDeJugada;
  /** El seudónimo de la carta que se juega. El mismo `id` que lleva el naipe. */
  readonly carta: string;
  /** A quién se le roba. Sólo La Guardia; `null` en las demás. */
  readonly a: AsientoId | null;
  /** Cómo se llama ése, para poder preguntar por su nombre y no por su asiento. */
  readonly nombre: string;
  /** Dos para El Año Bueno, uno para El Acaparamiento, ninguno para las demás. */
  readonly bienes: readonly string[];
  /** Lo que el juego escribe en el botón. Se usa tal cual: aquí no se redacta nada. */
  readonly rotulo: string;
  readonly opcion: O;
}

/** Los bienes que pide una carga, vengan en `bienes` (dos) o en `bien` (uno). */
function bienesDeLaCarga(carga: Record<string, unknown>): string[] {
  const varios = carga['bienes'];
  if (Array.isArray(varios)) return varios.filter((b): b is string => typeof b === 'string');
  const uno = carga['bien'];
  return typeof uno === 'string' ? [uno] : [];
}

/**
 * TODAS LAS MANERAS DE JUGAR ESTA CARTA que el juego ofrece ahora mismo.
 *
 * Una sola para Las Dos Veredas, una por colono al que se pueda robar para La
 * Guardia, quince pares para El Año Bueno y cinco bienes para El Acaparamiento. La
 * lista sale vacía si la carta no se puede jugar, que es la misma respuesta que da
 * `sePuedeJugar` y sale de la misma sitio: no hay dos cuentas.
 *
 * `carta` es el seudónimo, o sea el `id` del naipe que la escena acaba de soltar en
 * la casilla. La pantalla no tiene que traducir nada para preguntar.
 */
export function jugadasDeLaCarta<O extends OpcionQueLlega>(
  vista: unknown,
  opciones: readonly O[],
  carta: string,
): JugadaDeCarta<O>[] {
  if (!esVistaQueSePinta(vista)) return [];
  const lista: JugadaDeCarta<O>[] = [];
  for (const o of opciones) {
    if (cartaDeLaCarga(o.carga) !== carta) continue;
    const clase = CLASE_DE_LA_JUGADA[o.tipo];
    if (clase === undefined) continue;
    const carga = o.carga as Record<string, unknown>;
    const cual = carga['a'];
    const a = typeof cual === 'string' ? cual : null;
    lista.push({
      clase,
      carta,
      a,
      nombre: a === null ? '' : (vista.colonos.find((c) => c.asiento === a)?.nombre ?? a),
      bienes: bienesDeLaCarga(carga),
      rotulo: o.rotulo,
      opcion: o,
    });
  }
  return lista;
}

/**
 * A QUIÉN SE LE PUEDE ROBAR con esta guardia: exactamente los colonos que el juego
 * ofrece, ni uno más.
 *
 * Y son menos que «todos los demás», que es lo que una pantalla escribiría sola: a
 * quien no tiene ni un bien no se le roba, y eso lo decide `opcionesDelMazo` mirando
 * un número que sí es público. Escrita aquí, esa resta se olvidaría el día que
 * cambiara — y la mesa vería un botón para robarle a quien no tiene nada.
 */
export function aQuienSeLeRoba<O extends OpcionQueLlega>(
  vista: unknown,
  opciones: readonly O[],
  carta: string,
): JugadaDeCarta<O>[] {
  return jugadasDeLaCarta(vista, opciones, carta).filter((j) => j.clase === 'guardia');
}

/**
 * QUÉ PARES SE PUEDEN PEDIR con este año bueno.
 *
 * Sin repetir: `sal y grano` y `grano y sal` son la misma jugada y el juego la ofrece
 * una vez. Los pares de dos iguales SÍ están, que es media gracia de la carta. El
 * orden de dentro de cada par es el de `BIENES` y va tal cual en la carga; que la
 * pantalla no lo toque es justo el motivo de que viaje la opción entera.
 */
export function paresDelAnoBueno<O extends OpcionQueLlega>(
  vista: unknown,
  opciones: readonly O[],
  carta: string,
): JugadaDeCarta<O>[] {
  return jugadasDeLaCarta(vista, opciones, carta).filter((j) => j.clase === 'anobueno');
}

/**
 * QUÉ BIENES SE PUEDEN ACAPARAR con esta carta.
 *
 * Salen los cinco aunque no los tenga nadie, y eso NO es un descuido que arreglar
 * aquí: filtrarlos por lo que los demás tienen publicaría sus almacenes en una lista
 * de botones. Está escrito y razonado en `opcionesDelMazo`, y aquí sólo se respeta.
 */
export function bienesQueSeAcaparan<O extends OpcionQueLlega>(
  vista: unknown,
  opciones: readonly O[],
  carta: string,
): JugadaDeCarta<O>[] {
  return jugadasDeLaCarta(vista, opciones, carta).filter((j) => j.clase === 'acaparamiento');
}

/**
 * LA JUGADA QUE NO HAY QUE PREGUNTAR: la única que hay, o `null` si hay que elegir.
 *
 * Las Dos Veredas siempre cae aquí —no pide nada—, y La Guardia también cuando queda
 * un solo colono al que robar, que en una mesa de dos es siempre. Es el mismo trato
 * que `truequesPosibles` pide para las ofertas y está escrito allí: si sale una sola,
 * se manda sin preguntar; si salen varias, se pregunta.
 *
 * Con cero devuelve `null` igual que con dos, y así tiene que ser: «no se puede» y
 * «hay que elegir» comparten respuesta porque en los dos casos la pantalla NO manda
 * nada por su cuenta.
 */
export function jugadaSinPreguntar<O extends OpcionQueLlega>(
  vista: unknown,
  opciones: readonly O[],
  carta: string,
): JugadaDeCarta<O> | null {
  const todas = jugadasDeLaCarta(vista, opciones, carta);
  return todas.length === 1 ? (todas[0] ?? null) : null;
}

/**
 * LA OPCIÓN DE REVELAR ESTE TÍTULO, o `null`.
 *
 * No hace falta la vista: revelar no pide destinatario ni bienes, así que la opción
 * entera ES la respuesta. Y no se comprueba aquí que la carta sea un título — lo
 * comprueba el juego al no ofrecer `REVELAR` de nada más, y la escena lo comprueba
 * otra vez en `puertasDeLaCarta`, que no abre la casilla de revelar a una carta que
 * no sea de la familia de los títulos por mucho que llegue la bandera en `true`.
 */
export function revelarDe<O extends OpcionQueLlega>(opciones: readonly O[], carta: string): O | null {
  return opciones.find((o) => o.tipo === REVELAR && cartaDeLaCarga(o.carga) === carta) ?? null;
}

/**
 * LA OPCIÓN DE COMPRAR UNA CARTA, o `null` si ahora no se puede.
 *
 * Sale nombrada aunque sea un `find` de una línea, por lo mismo que `manoEnTres`: es
 * el único movimiento del mazo que no cuelga de un naipe, y sin un nombre acabaría
 * buscándose por el `id` `'comprar'` dentro de cada cliente — que es colgar un
 * movimiento de un rótulo.
 */
export function comprarEnTres<O extends OpcionQueLlega>(opciones: readonly O[]): O | null {
  return opciones.find((o) => o.tipo === COMPRAR) ?? null;
}

/**
 * LAS OPCIONES QUE NO PINTA LA MANO DEL MAZO.
 *
 * Se compone con `opcionesFueraDelTablero` —y en ese orden da igual, las dos son
 * filtros— para sacar los botones de una pantalla que ya enseña la mano: lo que queda
 * es tirar, pasar, contestar tratos, empezar y comprar. Ver por qué son dos funciones
 * y no una en la cabecera de `opcionesFueraDelTablero`.
 */
export function opcionesFueraDeLaMano<O extends OpcionQueLlega>(opciones: readonly O[]): O[] {
  return opciones.filter((o) => !TIPOS_QUE_PINTA_LA_MANO.includes(o.tipo));
}

/**
 * LAS OPCIONES QUE TAMPOCO PINTA LA BARRA: se cae COMPRAR, y sólo si hay hueco de mazo.
 *
 * ═══ EL FALLO QUE EVITA, Y EL FALLO CONTRARIO QUE TAMBIÉN EVITA ═══
 *
 * Desde que la barra tiene un cuarto hueco, comprar se ofrece PULSANDO EL NAIPE. Si además
 * siguiera saliendo como botón de texto en el pie, la misma pantalla ofrecería lo mismo dos
 * veces y se rompería la regla de la casa —cada movimiento se enseña exactamente una vez—
 * que `verificar-escritorio` y `verificar-riberas-en-tres` cuentan con los dedos.
 *
 * Y el fallo contrario es peor, porque es mudo: donde NO hay barra —el respaldo SVG del
 * móvil, un mirón, una mesa de más de cuatro colonos— quitar el botón deja una partida en la
 * que no hay manera de comprar una carta en toda la tarde, sin un error en ninguna parte. Es
 * el mismo fallo silencioso que partió `opcionesFueraDelTablero` en dos.
 *
 * Por eso esta función NO recibe un interruptor que el cliente pueda poner mal: recibe EL
 * MAZO, el mismo objeto que se le pasa a `<Delta>`. El botón desaparece exactamente cuando
 * el naipe existe, porque son el mismo dato. Un `boolean` suelto, o un filtro sin condición,
 * dejarían las dos mitades libres de separarse — que es lo que siempre acaba pasando.
 *
 * Se compone con las otras dos —`opcionesFueraDeLaBarra(opcionesFueraDeLaMano(
 * opcionesFueraDelTablero(o)), mazo)`— y el orden da igual: las tres son filtros.
 */
export function opcionesFueraDeLaBarra<O extends OpcionQueLlega>(
  opciones: readonly O[],
  mazo: MazoEnLaBarraEnTres | null,
): O[] {
  return mazo === null ? [...opciones] : opciones.filter((o) => o.tipo !== COMPRAR);
}

// ---------------------------------------------------------------------------
// LOS DADOS: qué enseñan, y el sello con el que se parte la suma
// ---------------------------------------------------------------------------

/**
 * EL SELLO DE LA TIRADA QUE SE ENSEÑA: el turno en que se tiró.
 *
 * El servidor publica la SUMA y no las dos caras, y el par lo parte el cliente de forma
 * determinista con `(suma, sello, semilla)` (`escenas/dados.ts`). El sello tiene que ser
 * estable dentro del turno, distinto cada turno e igual en los cuatro aparatos y tras
 * recargar; `turnosAbiertos` lo es —sólo sube, y sube al pasar el turno— y con `tirado`
 * falso la tirada que se enseña es la del turno ANTERIOR, así que lleva su sello. Ni
 * `rev` (sube con cada movimiento: el par cambiaría al pasar una carta) ni el asiento
 * (cada colono enseñaría siempre el mismo par para la misma suma).
 *
 * Es la ÚNICA lectura de `turnosAbiertos` de este fichero, y no se compara con nada.
 */
export function selloDeLaTirada(turnosAbiertos: number, tirado: boolean): number {
  return turnosAbiertos - (tirado ? 0 : 1);
}

/**
 * LOS DADOS DE LA MESA tal como los pinta la escena, o `null` si esta pantalla no los
 * pinta. Sin `three` y sin importar valores de `escenas/`.
 *
 *   · `porTirar`: me toca y el juego ofrece TIRAR. Sale de la lista de opciones, no de
 *     rehacer la regla —es lo mismo que hace `mazoEnLaBarra` con COMPRAR—.
 *   · `disponible`: si el asa se puede pulsar. Aquí es `porTirar`; el `quieto` de la
 *     petición en vuelo lo apaga la pantalla, como a la barra.
 *   · `sello`, `ultimaTirada`, `tirado`: lo que la máquina de `escenas/dados.ts` necesita
 *     para saber qué par enseñar y si la tirada es nueva.
 */
export interface DadosEnTres {
  readonly porTirar: boolean;
  readonly disponible: boolean;
  readonly sello: number;
  readonly ultimaTirada: number;
  readonly tirado: boolean;
}

/**
 * ═══ `null` EN LOS MISMOS SITIOS QUE `mazoEnLaBarra`, Y POR LO MISMO ═══
 *
 * Un mirón, un asiento que no está en la mesa, una mesa de más de cuatro colonos (que se
 * juega sobre el retablo) y cualquier momento que no sea `jugando` no tienen dados; y
 * donde no hay dados el botón TIRAR se QUEDA (`opcionesFueraDeLaMesa`), porque es lo único
 * que salva al respaldo y al mirón de una partida en la que nadie puede tirar. Un hueco
 * apagado prometería que un día se enciende; en la colocación no hay tirada que esperar.
 *
 * ═══ RECIBE LAS OPCIONES ENTERAS, ANTES DE NINGÚN FILTRO ═══
 *
 * El orden es el de `mazoEnLaBarra`: primero esto, con la lista completa, y después
 * `opcionesFueraDeLaMesa` quita TIRAR de lo que va a los botones. Al revés, `porTirar`
 * sería siempre falso y los dados no avisarían nunca de que toca tirar.
 *
 * La pantalla pregunta ANTES si hay sitio —`huecosDeLaMesa(...).dados !== null`— y sólo
 * entonces llama aquí: en los lienzos donde los dados no caben tampoco hay dados, y el
 * botón se queda.
 */
export function dadosEnTres<O extends OpcionQueLlega>(
  vista: unknown,
  quien: AsientoId | null,
  opciones: readonly O[],
): DadosEnTres | null {
  if (!esVistaQueSePinta(vista) || quien === null) return null;
  if (vista.momento !== 'jugando' || !bastanColores(vista)) return null;
  if (colorDePiezaDelColono(indiceDelColono(vista, quien)) === null) return null;
  const porTirar = meToca(vista) && vista.yo === quien && opciones.some((o) => o.tipo === TIRAR);
  const tirado = vista.tirado ?? false;
  return {
    porTirar,
    disponible: porTirar,
    sello: selloDeLaTirada(vista.turnosAbiertos ?? 0, tirado),
    ultimaTirada: vista.ultimaTirada ?? 0,
    tirado,
  };
}

/**
 * LAS OPCIONES QUE TAMPOCO PINTA LA MESA: se cae TIRAR, y sólo si hay dados.
 *
 * El mismo patrón que `opcionesFueraDeLaBarra` con el mazo, y por el mismo par de fallos:
 * con dados y botón la pantalla ofrecería tirar dos veces; sin dados y sin botón —el
 * respaldo, un mirón, un lienzo donde no caben— nadie podría tirar en toda la tarde, sin
 * un error en ninguna parte. Por eso recibe LOS DADOS, el mismo objeto que se le da a la
 * escena, y no un interruptor: el botón desaparece exactamente cuando el asa existe.
 */
export function opcionesFueraDeLaMesa<O extends OpcionQueLlega>(
  opciones: readonly O[],
  dados: DadosEnTres | null,
): O[] {
  return dados === null ? [...opciones] : opciones.filter((o) => o.tipo !== TIRAR);
}

// ---------------------------------------------------------------------------
// EL MARCADOR: lo que se ve de cada colono, y lo que sólo cuento yo
// ---------------------------------------------------------------------------

/** Un colono en el marcador: lo suyo público, y lo mío oculto sólo si soy yo. */
export interface ColonoEnElMarcador {
  readonly asiento: AsientoId;
  readonly nombre: string;
  readonly color: string;
  /** Sus puntos PÚBLICOS. Es lo que ve la mesa entera, yo incluido. */
  readonly puntos: number;
  /**
   * MIS PUNTOS CON LOS TÍTULOS SIN REVELAR DENTRO, y `null` para todos los demás.
   *
   * `null` y no «los públicos otra vez», que es lo que se escribe sin pensar: con el
   * mismo número en los dos campos, una pantalla que quiera distinguir «lo que se ve»
   * de «lo que sólo cuento yo» no puede, y acaba enseñando a los demás un segundo
   * número inventado. `null` dice «de éste no lo sé», que es la verdad.
   *
   * Y sale de `misPuntos`, que la proyección no le manda a nadie más. Aquí no se suman
   * títulos ocultos: no están en la vista, y ése es el punto.
   */
  readonly puntosConLoOculto: number | null;
  readonly soyYo: boolean;
  /** Cuántas cartas guarda. El número, no cuáles. */
  readonly cartas: number;
  /** Cuántas guardias ha jugado. Es lo que hace ver venir La Mayor Guardia. */
  readonly guardias: number;
  /** Los títulos que ha revelado, con su nombre de Riberas: «El Faro»… */
  readonly titulos: readonly string[];
  readonly tieneElVado: boolean;
  readonly tieneLaMayorGuardia: boolean;
  /**
   * CUÁNTO MIDE SU CADENA DE VEREDAS, la tenga el premio o no.
   *
   * Es lo que faltaba por decir. El marcador sabía nombrar al dueño del Vado Largo y no
   * sabía decir cuánto medía la cadena de nadie, así que a quien encadenaba veredas sin
   * llegar —o llegando por su cuenta y no por la del juego, que es lo que pasa cuando el
   * vecino le corta el paso— la pantalla no le decía absolutamente nada. Con este número y
   * `vadoMinimo` al lado, «vado 3 de 5» es una frase que se puede leer en voz alta y
   * discutir mirando el tablero.
   *
   * Cero para quien no tenga ninguna vereda, que es la verdad y no un hueco.
   */
  readonly vado: number;
}

/** El marcador entero, con los dos premios y lo que queda de mazo. */
export interface MarcadorEnTres {
  readonly colonos: readonly ColonoEnElMarcador[];
  /** Cuántas cartas quedan por comprar. Contar el mazo es parte del juego (§1.3). */
  readonly mazo: number;
  /** De quién es el Vado Largo, o `null` si está vacante. */
  readonly vado: AsientoId | null;
  /** De quién es La Mayor Guardia, o `null` si está vacante. */
  readonly mayorGuardia: AsientoId | null;
  /**
   * CUÁNTAS VEREDAS SEGUIDAS HACEN FALTA PARA EL VADO LARGO.
   *
   * Sale por aquí y no se escribe en cada cliente porque es UNA regla del juego: es
   * `VADO_MINIMO`, la misma constante que usa `recalcularElVado`. Un cinco escrito a mano
   * en el raíl del escritorio y otro en la cinta de la app es la manera segura de que el
   * día que la regla cambie las dos pantallas sigan prometiendo la vieja.
   */
  readonly vadoMinimo: number;
}

/**
 * EL MARCADOR QUE SE ENSEÑA SIEMPRE, según el §5 del diseño.
 *
 * `null` si la vista no es de Riberas. Vacante quiere decir vacante: los dos premios
 * salen `null` mientras nadie llegue al mínimo, y no del primero de la lista.
 *
 * Los títulos ajenos salen con su nombre porque ya son públicos —revelados—, y ahí no
 * hay nada que tapar. Lo que no sale por ninguna parte es cuántos títulos SIN revelar
 * tiene otro: eso no está en la vista, y por eso no se puede escribir aquí ni por
 * descuido.
 */
export function marcadorEnTres(vista: unknown): MarcadorEnTres | null {
  if (!esVistaQueSePinta(vista)) return null;
  const yo = vista.yo;
  const delVado = vista.vado?.de ?? null;
  const deLaGuardia = vista.guardia?.de ?? null;
  return {
    mazo: vista.mazo ?? 0,
    vado: delVado,
    mayorGuardia: deLaGuardia,
    vadoMinimo: VADO_MINIMO,
    colonos: vista.colonos.map((c) => {
      const soyYo = yo !== null && c.asiento === yo;
      const puntos = c.puntos ?? 0;
      return {
        asiento: c.asiento,
        nombre: c.nombre,
        color: c.color,
        puntos,
        soyYo,
        puntosConLoOculto: soyYo ? (vista.misPuntos ?? puntos) : null,
        cartas: c.cartas ?? 0,
        guardias: c.guardias ?? 0,
        titulos: (c.titulos ?? []).map((t) => retratoDeLaCarta(t)?.nombre ?? t),
        tieneElVado: delVado !== null && c.asiento === delVado,
        tieneLaMayorGuardia: deLaGuardia !== null && c.asiento === deLaGuardia,
        /* Su cadena más larga, tal como la cuenta el juego. Aquí no se cuenta nada. */
        vado: c.vado ?? 0,
      };
    }),
  };
}

/**
 * EN QUÉ ESTADO ESTÁ LA CADENA DE UN COLONO RESPECTO AL VADO LARGO: tres, y no dos.
 *
 * ═══ EL FALLO QUE HABÍA, EN LA LÍNEA QUE SE AÑADIÓ PARA ARREGLAR OTRO ═══
 *
 * «vado N de M» se escribió para que a quien encadena veredas sin ver el premio la
 * pantalla le dijera cuánto cuenta el juego. Y mentía en el peor sitio: `recalcularElVado`
 * sólo mueve el premio a quien SUPERA estrictamente al dueño, así que el segundo que
 * llega a cinco tiene cadena de cinco, cero puntos de premio y un renglón que decía
 * «vado 5 de 5» — que se lee como «ya está». Es la otra mitad del fallo de Miguel —la
 * pantalla que no explica por qué no hay premio— escrita en la frase que se añadió para
 * explicarlo.
 *
 * Los tres estados:
 *   · `corta`: por debajo del mínimo. Lo que se dice es cuánto falta.
 *   · `llega`: al mínimo o más, y SIN el premio. Aquí `dueño` es quien lo tiene —hay que
 *     superarlo, no igualarlo— o `null` si nadie lo tiene, que es el único caso en que
 *     una cadena llega y el premio queda vacante: dos que igualan el máximo desde
 *     vacante, y `recalcularElVado` no se lo da a ninguno.
 *   · `premio`: lo tiene.
 *
 * Sale de aquí, y las frases también (`renglonDelVado`, `loQueSeOyeDelVado`), porque son
 * DOS clientes y una frase que se oye: el raíl del escritorio, la ficha de la app y su
 * `accessibilityLabel`. Tres copias de una bifurcación de tres ramas es la manera segura
 * de que una de las tres vuelva a decir «de 5» a secas.
 */
export type EstadoDelVado =
  | { readonly clase: 'corta' }
  | { readonly clase: 'llega'; readonly dueño: ColonoEnElMarcador | null }
  | { readonly clase: 'premio' };

export function estadoDelVado(colono: ColonoEnElMarcador, marcador: MarcadorEnTres): EstadoDelVado {
  if (colono.tieneElVado) return { clase: 'premio' };
  if (colono.vado < marcador.vadoMinimo) return { clase: 'corta' };
  return { clase: 'llega', dueño: marcador.colonos.find((c) => c.tieneElVado) ?? null };
}

/**
 * LA FRASE CORTA DE LA CADENA, la que se pinta en el renglón del colono.
 *
 * Con el premio, «El Vado Largo, 6 veredas». Sin llegar, «vado 3 de 5». Y llegando sin
 * premio se dice POR QUÉ no hay premio, que es lo que faltaba: de quién es y con cuánto
 * —«vado 5, lo tiene Ada con 6»—, que llegó antes si mide lo mismo —hay que superarlo—,
 * o que está empatado y sin dueño. El mínimo es `vadoMinimo`, la regla, no un cinco.
 */
export function renglonDelVado(colono: ColonoEnElMarcador, marcador: MarcadorEnTres): string {
  const estado = estadoDelVado(colono, marcador);
  const largo = String(colono.vado);
  if (estado.clase === 'premio') return `El Vado Largo, ${largo} ${colono.vado === 1 ? 'vereda' : 'veredas'}`;
  if (estado.clase === 'corta') return `vado ${largo} de ${String(marcador.vadoMinimo)}`;
  if (estado.dueño === null) return `vado ${largo}, empatado y sin dueño`;
  if (estado.dueño.vado > colono.vado) return `vado ${largo}, lo tiene ${estado.dueño.nombre} con ${String(estado.dueño.vado)}`;
  return `vado ${largo}, lo tiene ${estado.dueño.nombre}, que llegó antes`;
}

/**
 * LA MISMA FRASE, ENTERA, para leerla en voz alta: es la del `accessibilityLabel` de la
 * ficha de la app. Un lector de pantalla no ve un renglón corto al lado de un nombre; lee
 * una fila detrás de otra, y «vado 5» suelto son dos datos sin verbo. Tiene los mismos
 * tres estados que `renglonDelVado`, y por la misma razón: la frase que se oía decía «de
 * las 5» a quien ya tenía cinco, igual que la que se veía.
 */
export function loQueSeOyeDelVado(colono: ColonoEnElMarcador, marcador: MarcadorEnTres): string {
  const estado = estadoDelVado(colono, marcador);
  const largo = String(colono.vado);
  const veredas = colono.vado === 1 ? 'vereda' : 'veredas';
  if (estado.clase === 'premio') return `su cadena mide ${largo} ${veredas} y el Vado Largo es suyo`;
  if (estado.clase === 'corta') {
    return `su cadena mide ${largo} de las ${String(marcador.vadoMinimo)} veredas del Vado Largo`;
  }
  const llega = `su cadena mide ${largo} ${veredas} y llega al Vado Largo, pero`;
  if (estado.dueño === null) return `${llega} está empatada y el premio queda sin dueño hasta que alguien la supere`;
  if (estado.dueño.vado > colono.vado) {
    return `${llega} lo tiene ${estado.dueño.nombre} con ${String(estado.dueño.vado)}: hay que superarle`;
  }
  return `${llega} lo tiene ${estado.dueño.nombre}, que llegó antes: hay que superarle`;
}
