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
import type { DadosDeLaMesa } from '../../../escenas/dados';
import { llaveDeHex } from '../../mecanicas/malla-hexagonal';
import type { Hex, LlaveDeArista, LlaveDeVertice } from '../../mecanicas/malla-hexagonal';
import type { PanelDeTablero, TableroDeclarado } from '../../mecanicas/tablero-declarado';
import type { AsientoId } from '../tipos';
import {
  ACAPARAMIENTO,
  ACEPTAR,
  ALZAR,
  ANO_BUENO,
  BIENES,
  BIENES_DEL_ANO_BUENO,
  claseDeLaCarta,
  COMPRAR,
  DOS_VEREDAS,
  FUNDAR,
  GUARDIA,
  GUARDIA_MINIMA,
  MOVER_EL_ESTIAJE,
  OFRECER,
  PUNTOS_DE_LA_GUARDIA,
  PUNTOS_DEL_TITULO,
  PROPUESTAS_VIVAS_A_LA_VEZ,
  PUNTOS_DEL_VADO,
  RECHAZAR,
  REVELAR,
  seudonimoDeLaCarta,
  TIRAR,
  VADO_MINIMO,
  VEREDAS_DE_LA_CARTA,
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
  /*
   * LAS PIEZAS PUESTAS VAN OPCIONALES, Y LO ERAN DESDE SIEMPRE SIN DECIRLO.
   *
   * Estaban declaradas obligatorias y no las leía NADIE de este fichero, así que la mentira
   * no costaba nada: `esVistaQueSePinta` mira cuatro campos y ninguno es éste. El día que
   * `marcadorEnTres` empezó a contarlas —para el §11— la vista mínima que este mismo
   * repositorio ya usa como legítima (un colono con asiento, nombre y color, y nada más:
   * ver la vacuna «una vista sin mazo» de `verify:riberas-en-tres`) reventó con «no se
   * puede leer 'length' de undefined». O sea que el tipo prometía lo que la puerta no
   * comprueba, que es exactamente lo que la cabecera de arriba dice que no se hace.
   *
   * Sin ellas se cuenta CERO, como se cuentan cero los puntos y cero las guardias de una
   * vista que no los trae: es la misma convención de este fichero y por el mismo motivo —
   * un marcador que se cae deja la mesa entera sin pintar por una cifra de adorno.
   */
  readonly chozas?: readonly LlaveDeVertice[];
  readonly torres?: readonly LlaveDeVertice[];
  readonly veredas?: readonly LlaveDeArista[];
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
  /**
   * LOS TRUEQUES, Y VAN OPCIONALES POR LO MISMO QUE EL MAZO.
   *
   * `esVistaQueSePinta` mira cuatro campos y ninguno es éste: por esta puerta pasan
   * vistas legítimas que no lo traen —la del banco de anillos, una partida guardada de
   * antes de que el trueque existiera—, y exigirlo aquí dejaría de pintar el delta entero
   * por no saber si alguien ofreció un junco. Sin la lista, el pregón sale `null`, que es
   * «no hay nada que pregonar» y no un error.
   *
   * Son PÚBLICOS enteros —`da`, `pide`, `de`, `para` y `estado` viajan en la vista de
   * todos, ver la cabecera de `Trato` en `riberas.ts`—, así que aquí no hay nada que tapar
   * y por eso el pregón puede escribir la oferta ajena con todas sus letras.
   */
  readonly tratos?: readonly {
    readonly id?: unknown;
    readonly de?: unknown;
    /** `null` es una propuesta ABIERTA, dicha a la mesa. Ver `elPregonEnTres`. */
    readonly para?: unknown;
    readonly da?: unknown;
    readonly pide?: unknown;
    readonly estado?: unknown;
    /**
     * QUIÉNES YA LA APARTARON, y sólo lo llevan las abiertas. Es público como el resto
     * y hace falta aquí por dos cosas que sin él se pintan mal: una abierta que YO ya
     * aparté no va en «Para contestar» —el juego ya no me ofrece nada de ella, y una
     * tira sin botones se lee como una tira rota—, y en «Tuyas» es de donde sale
     * «apartada ×2», que es lo único que le dice a quien propuso que alguien dijo que no
     * sin que la oferta se haya caído.
     */
    readonly rechazada?: unknown;
    /**
     * QUIÉN LA CERRÓ ACEPTÁNDOLA, y sólo hace falta en las abiertas. Es público como el
     * resto, y sin él esta pantalla le decía a quien acababa de aceptar una oferta a la
     * mesa «se la llevó alguien» —en tercera persona, en su propia pantalla, sobre algo
     * que había hecho él—. Ver `Trato.acepto` en `riberas.ts`.
     */
    readonly acepto?: unknown;
  }[];
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
 * EL COLOR DEL COLONO AL QUE LE TOCA, para el tapete de la mesa; `null` si no hay turno
 * (la mesa se reúne, la vista no es de Riberas) o si a ese colono no le llega color.
 *
 * Es el MISMO reparto que pinta sus chozas y sus piezas en la barra
 * —`colorDePiezaDelColono` sobre el índice del asiento de `turnoDe`— y sale de aquí y no
 * de cada pantalla porque hasta hoy NINGUNA pasaba `turnoDe` a `<Delta>`: la mesa se veía
 * sin tapete en la partida y con él sólo en el banco, y nadie lo notó porque la entrada es
 * opcional. Compuesto en `shared/`, las dos pantallas no pueden discrepar.
 */
export function turnoEnTres(vista: unknown): ColorDeJugador | null {
  if (!esVistaQueSePinta(vista)) return null;
  return colorDePiezaDelColono(indiceDelColono(vista, vista.turnoDe));
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
  /**
   * LA MARCA DEL NÚCLEO: esto NO es un movimiento montado, es una DECLARACIÓN de lo que
   * el juego admitiría. Ver `Opcion.declaracion` en `shared/arcade/opciones.ts`.
   *
   * Se declara aquí porque este fichero es el que decide qué se pinta y qué se manda, y
   * porque los dos filtros de abajo la leen. Hoy la trae UNA opción de todo el árbol: la
   * puerta del trueque, que `puertaDelTrueque` busca POR ESTE CAMPO y nunca por su `id`.
   */
  readonly declaracion?: true;
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
  return opciones.filter(
    (o) => o.tipo !== FUNDAR && o.tipo !== ALZAR && o.tipo !== OFRECER && o.declaracion !== true,
  );
}

/** Cómo se llama en pantalla el destino de una propuesta abierta. */
export const A_LA_MESA = 'la mesa';

/** Un trueque que se puede proponer ahora mismo, tal como lo ofrece el juego. */
export interface TruequePosible<O extends OpcionQueLlega = OpcionQueLlega> {
  /** `null` es a la mesa: la propuesta abierta que estrenó el trueque paramétrico. */
  readonly para: AsientoId | null;
  /** El nombre de quien la recibe, o `A_LA_MESA` cuando no hay destinatario. */
  readonly nombre: string;
  /**
   * LOS DOS LADOS ENTEROS, Y NO SU PRIMERA FICHA.
   *
   * Esto leía `da[0]` y `pide[0]` porque un lado era EXACTAMENTE un bien
   * (`BIENES_POR_LADO_DEL_TRUEQUE` valía 1, y esa constante ya no existe). Con el tope de
   * tres por lado, leer sólo la primera ficha convierte «tres sales por dos juncos» en
   * «sal por junco» sin que nada falle: la pantalla mandaría la carga entera —va en
   * `opcion`— y enseñaría otra cosa. Vienen en el orden de `BIENES`, que es el que
   * `ofrecer` deja escrito en el estado.
   */
  readonly doy: readonly string[];
  readonly quiero: readonly string[];
  readonly opcion: O;
}

/**
 * UNA LISTA DE BIENES DE UNA CARGA QUE SE VA A MANDAR, o `null` si no lo es. ESTRICTA.
 *
 * Y es lo contrario de `soloBienes`, que criba: la diferencia es a qué se dedica cada
 * una. `soloBienes` lee un trato GUARDADO, que sólo se pinta, y por ahí pasan partidas de
 * cualquier época; ésta lee la carga de una opción que la pantalla va a MANDAR tal cual,
 * y ahí cribar sería componer un movimiento distinto del que el juego ofreció y que el
 * portillo rechazaría por forma canónica. Con una ficha mala, la opción entera no vale.
 */
function listaDeBienes(lo: unknown): string[] | null {
  if (!Array.isArray(lo) || lo.length === 0) return null;
  const todos = lo as unknown[];
  return todos.every((b): b is string => typeof b === 'string') ? [...(todos as string[])] : null;
}

/**
 * La carga de una opción de ofrecer, si tiene la forma que Riberas escribe. La PUERTA no
 * lo es y sale `null`: su carga no es un movimiento montado, y para eso está
 * `puertaDelTrueque`.
 */
function truequeDeLaOpcion<O extends OpcionQueLlega>(vista: VistaQueSePinta, o: O): TruequePosible<O> | null {
  if (o.tipo !== OFRECER || o.declaracion === true) return null;
  if (typeof o.carga !== 'object' || o.carga === null) return null;
  const carga = o.carga as Record<string, unknown>;
  const para = carga['para'];
  if (para !== null && typeof para !== 'string') return null;
  const doy = listaDeBienes(carga['da']);
  const quiero = listaDeBienes(carga['pide']);
  if (doy === null || quiero === null) return null;
  const nombre = para === null ? A_LA_MESA : (vista.colonos.find((c) => c.asiento === para)?.nombre ?? para);
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
    const t = deUnoPorUno(truequeDeLaOpcion(vista, o));
    if (t !== null && t.doy === doy) quieros.add(t.quiero);
  }
  return [...quieros];
}

/**
 * EL TRUEQUE DE UNO POR UNO, o `null` si lleva más de una ficha en algún lado.
 *
 * Las dos funciones de arriba y de abajo sirven al gesto de la mano del 3D —se coge una
 * carta de bien y se suelta sobre otro—, que por su forma sólo sabe decir UNA ficha por
 * lado. Con el tope de tres, la lista del juego sigue siendo de uno por uno (la
 * combinatoria se declara en la puerta y no se enumera: son 5.000 opciones y 1,14 MB por
 * lectura), pero eso es una decisión de `opcionesDeTrueque` y no una ley: el día que
 * emita alguna de dos fichas, este corte hace que el gesto la ignore en vez de mandar
 * media oferta con la otra mitad escondida.
 */
function deUnoPorUno<O extends OpcionQueLlega>(
  t: TruequePosible<O> | null,
): { readonly doy: string; readonly quiero: string; readonly trueque: TruequePosible<O> } | null {
  if (t === null || t.doy.length !== 1 || t.quiero.length !== 1) return null;
  return { doy: t.doy[0] as string, quiero: t.quiero[0] as string, trueque: t };
}

/**
 * A QUIÉN SE LE PUEDE PROPONER un trueque concreto: una entrada por colono al que el
 * juego permite ofrecérselo, con la opción entera para mandarla tal cual. Si sale
 * una sola, el cliente puede mandarla sin preguntar; si salen varias, tiene que
 * preguntar a quién.
 *
 * ═══ Y NO ES QUE «RIBERAS EXIJA DESTINATARIO», QUE ES LO QUE PONÍA AQUÍ ═══
 *
 * Dejó de ser verdad: `Trato.para` admite `null` y una propuesta se puede decir A LA
 * MESA, que la contesta el primero que quiera. Lo que sigue siendo verdad es más
 * pequeño y es lo que esta función sirve: LA LISTA DE UNO POR UNO va siempre con
 * asiento dentro —cada opción es un movimiento montado y dirigido—, así que cuando el
 * gesto de la mano cae sobre varias hay que preguntar cuál de ellas se manda.
 *
 * Quien SÍ puede decirlo a la mesa es el componedor, que tiene su propio renglón de
 * destino y arranca justo ahí: `NADA_COMPUESTO` lleva `para: null`. O sea que la frase
 * vieja negaba, en los dos clientes que lo mandan, algo que esos mismos clientes hacen.
 */
export function truequesPosibles<O extends OpcionQueLlega>(vista: unknown, opciones: readonly O[], doy: string, quiero: string): TruequePosible<O>[] {
  if (!esVistaQueSePinta(vista)) return [];
  const lista: TruequePosible<O>[] = [];
  for (const o of opciones) {
    const t = deUnoPorUno(truequeDeLaOpcion(vista, o));
    if (t !== null && t.doy === doy && t.quiero === quiero) lista.push(t.trueque);
  }
  return lista;
}

/** Lo que el juego declara que admite como trueque. Ver `puertaDelTrueque`. */
export interface PuertaDelTrueque {
  /** Cuántas FICHAS caben como mucho en cada lado, repetidas o no. Hoy tres. */
  readonly tope: number;
  /** Los asientos a los que se les puede ofrecer algo: los que tienen bienes. */
  readonly a: readonly AsientoId[];
  /** Y si además se puede decir a la mesa, sin destinatario. */
  readonly mesa: boolean;
  /** El rótulo y el porqué que escribe el juego, para el botón que abre el componedor. */
  readonly rotulo: string;
  readonly ayuda: string;
}

/**
 * ═══ LO QUE LA PUERTA DECLARA, LEÍDO POR LA MARCA Y NUNCA POR EL `id` ═══
 *
 * La combinatoria de un trueque con multiplicidad no cabe en una lista de botones —con
 * topes de tres por lado y cinco rivales son 5.000 opciones y 1.141,9 kB en CADA lectura
 * de la mesa—, así que `opcionesDeTrueque` emite UNA opción cuya carga no es un
 * movimiento montado sino la declaración de lo que el portillo dejaría pasar. Esto la
 * encuentra y la traduce; quien la lea compone el movimiento, que es lo que sí se manda.
 *
 * SE BUSCA POR `declaracion`, QUE ES DEL CONTRATO, Y NO POR `id === 'ofrecer:puerta'`.
 * Un convenio en el `id` lo entendería este fichero y nadie más: la cabecera de
 * `Opcion.id` dice que un id sale del vocabulario público y sirve para reconciliar por
 * identidad, no para llevar significado que el lector tenga que saberse. La vacuna es
 * exactamente ésa: se le cambia el `id` a la opción y esto tiene que seguir
 * encontrándola.
 *
 * Y NO DEVUELVE LA OPCIÓN ENTERA, a propósito. Devolverla sería poner otra vez al alcance
 * de una pantalla la `carga` que no se manda —que mandada tal cual no funda ningún
 * trueque y sale con motivo—, que es justo el botón muerto que la marca existe para
 * matar. Lo que sale de aquí son los tres datos públicos de la declaración más las dos
 * frases que el juego escribe para el botón.
 */
export function puertaDelTrueque<O extends OpcionQueLlega>(opciones: readonly O[]): PuertaDelTrueque | null {
  for (const o of opciones) {
    if (o.declaracion !== true || o.tipo !== OFRECER) continue;
    if (typeof o.carga !== 'object' || o.carga === null) continue;
    const carga = o.carga as Record<string, unknown>;
    const tope = carga['tope'];
    const a = carga['a'];
    const mesa = carga['mesa'];
    if (typeof tope !== 'number' || !Number.isInteger(tope) || tope < 1) continue;
    if (!Array.isArray(a) || !(a as unknown[]).every((x): x is string => typeof x === 'string')) continue;
    if (typeof mesa !== 'boolean') continue;
    return { tope, a: [...(a as string[])], mesa, rotulo: o.rotulo, ayuda: o.ayuda };
  }
  return null;
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
  /**
   * LAS TRES FRASES QUE EXPLICAN EL NAIPE, y viajan DENTRO de él.
   *
   * No es un mapa que la pantalla consulte por la clase, y no puede serlo: la clase de
   * una carta es SECRETA y lo que sale de aquí es su seudónimo. Quien pinta el naipe
   * tiene el texto en la mano sin preguntar nada, igual que tiene `nombre` y `dibujo`.
   */
  readonly explicacion: ExplicacionDeLaCarta;
}

/**
 * LO QUE MIGUEL PIDIÓ, EN TRES COLUMNAS: qué hace, qué consigues, cómo se usa.
 *
 * Son tres campos y no un párrafo porque el sitio de la pantalla se acaba y hay que
 * poder soltar el final: al pie del lienzo más estrecho, con la cinta del tercio central
 * en sus dos líneas, sólo cabe UNA de las tres (medido: §5.1 de
 * `docs/LAS-CARTAS-SE-EXPLICAN.md`). Con un párrafo la única manera de recortar sería
 * cortarlo por la mitad, y media frase de ayuda es peor que ninguna.
 *
 * El orden de los campos ES el orden en que se enseñan, y es el que Miguel dijo.
 */
export interface ExplicacionDeLaCarta {
  /** Qué pasa cuando la juegas. */
  readonly hace: string;
  /** Para qué te sirve: lo que te llevas. */
  readonly consigues: string;
  /** Cuándo y con qué gesto. */
  readonly usas: string;
}

/** Cómo se enseña una clase de carta: a qué grupo va, qué dibujo lleva y cómo se lee. */
export interface RetratoDeLaCarta {
  readonly familia: string;
  readonly dibujo: string;
  readonly nombre: string;
  readonly explicacion: ExplicacionDeLaCarta;
}

/**
 * ═══ LA CIFRA NO BASTA: LA PALABRA Y EL PLURAL TAMBIÉN SALEN DE LA CONSTANTE ═══
 *
 * `${BIENES_DEL_ANO_BUENO}` ya ponía el DOS del «qué hace». Lo que se quedaba fuera era
 * la mitad de la frase que habla del mismo número sin escribirlo con cifra: «Dos bienes»,
 * «Dos pasos», «Vale 1 punto» y «2 puntos». La palabra escrita a mano y la concordancia
 * escrita a mano son exactamente el mismo fallo que la cifra escrita a mano. El día que
 * alguien suba `VEREDAS_DE_LA_CARTA` a tres, «Abres 3 veredas» y «Dos pasos» se
 * contradicen dentro del mismo naipe, y no hay comprobador que pille una mentira en
 * castellano: se lee igual de bien y dice otra cosa.
 *
 * Así que la palabra sale de `cardinal`, el plural de `plural` y la mayúscula de cabeza
 * de `enCabeza`. Son tres líneas y compran una vacuna: `verify:riberas-en-tres` compone
 * las mismas palabras desde las constantes y exige que las frases las lleven, así que
 * tocar una constante sin tocar nada más pone ROJO el texto que la nombra con letras.
 */
const CARDINALES: readonly string[] = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

/** El número escrito con letras, y con cifra en cuanto se sale de la tabla. */
export function cardinal(n: number): string {
  return CARDINALES[n] ?? String(n);
}

/** La forma que le toca al nombre según el número que lo acompaña. */
export function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios;
}

/** Con la primera letra en alta, para cuando la palabra abre la frase. */
export function enCabeza(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * ═══ LOS NÚMEROS DE LAS FRASES NO SE ESCRIBEN A MANO, Y ÉSE ES EL PUNTO ═══
 *
 * Las siete constantes salen de `riberas.ts`, que es donde vive la regla, y entran en la
 * frase por plantilla — exactamente como `opcionesDelMazo` compone hoy su ayuda con
 * `${VEREDAS_DE_LA_CARTA}`. Un texto que diga «dos veredas» con letras es un texto que
 * miente el día que alguien toque la constante, y no hay comprobador que pille una
 * mentira escrita en castellano: se leería igual de bien y diría otra cosa.
 *
 * `BIENES_DEL_ANO_BUENO` y `VEREDAS_DE_LA_CARTA` valen dos los dos y son dos constantes
 * a propósito (lo dice la cabecera de la primera). Aquí se citan por separado por lo
 * mismo: el día que una de las dos cambie, sólo cambia su frase.
 *
 * ═══ Y EL «QUÉ CONSIGUES» DE UN TÍTULO CUENTA LA REGLA QUE DECIDE LA PARTIDA ═══
 *
 * Decía «Ese punto: secreto tuyo hasta que la enseñes», y eso deja a un recién llegado
 * peor de lo que estaba: se entiende que guardar el título es gratis y que el punto ya
 * cuenta. El código dice lo contrario con todas las letras: la cabecera de `puntosDe` en
 * `riberas.ts` reza «CON UN TÍTULO SIN REVELAR NO SE GANA», y `puedeHaberGanado` cuenta
 * `puntosDe` y no `puntosOcultosDe`. Así que la frase que se pinta cuando sólo cabe una
 * mitad tiene que ser ésa. El secreto se conserva, que es el §1.6 y cambia cómo se juegan
 * las últimas rondas, pero deja de ser lo único que se dice.
 *
 * ═══ Y EL «CÓMO SE USA» NO NOMBRA UN MANDO QUE NO EXISTE ═══
 *
 * Decía «Suéltala en REVELAR». En la escena no hay ningún rótulo que ponga REVELAR: lo
 * que sale al coger la carta es UN hueco con el dibujo del propio naipe dentro
 * (`casillasDeLaMano`, y `puertasDeLaCarta` garantiza que nunca son dos a la vez, porque
 * un título se revela y no se juega). Quien leyera aquel texto buscaría un botón que no
 * está en ninguna parte, así que se dice el GESTO y el sitio, no un nombre.
 *
 * ═══ Y EL GESTO SUBE A LA SEGUNDA FRASE, PORQUE LA TERCERA NO SIEMPRE SE PINTA ═══
 *
 * El gesto vivía en el «cómo se usa», o sea en la frase que en los dos lienzos estrechos
 * NO se lee: allí caben dos (ver la cabecera de `elCartelQueCabe`), así que quedaba «sin
 * enseñarla no ganas» sin decir en ningún sitio CÓMO se enseña. Es el mismo delito del
 * párrafo de arriba girado —nombrar una condición y callar la que hace falta para
 * cumplirla—, y la cura es la misma: la frase que sí se pinta dice la regla Y el gesto.
 *
 * Y el «cómo se usa» que queda libre nombra su PUERTA, que es lo que no decía. La de un
 * título no es la de las otras cuatro: `revelarUnTitulo` empieza por `elTurnoEsDe` y ahí
 * se acaban sus condiciones —ni mira `tirado`, ni `cartaJugada`, ni el sello de compra—,
 * y su cabecera lo dice con todas las letras («se ofrece SIEMPRE en el turno propio, antes
 * de tirar y después»), porque quien tenga el octavo punto en un título tiene que poder
 * enseñarlo para ganar. De ahí «En tu turno, y no gasta la jugada», y de ahí que
 * `verify:riberas-en-tres` le pregunte esas dos cosas a una mesa de verdad en vez de
 * creerse esta línea.
 */
const EXPLICACION_DEL_TITULO: ExplicacionDeLaCarta = {
  hace: `No se juega: se tiene. Vale ${PUNTOS_DEL_TITULO} ${plural(PUNTOS_DEL_TITULO, 'punto', 'puntos')}.`,
  consigues: 'Sin enseñarla no ganas: suéltala en su hueco.',
  usas: 'En tu turno, y no gasta la jugada.',
};

/**
 * ═══ LAS TRES PUERTAS DE UNA CARTA QUE SE JUEGA, Y LAS TRES ESTÁN DICHAS ═══
 *
 * Nota de la fase 3: esta frase la comparten TRES de las cuatro, y no las cuatro. La
 * guardia se salió con `USAS_DE_LA_GUARDIA`, que dice las mismas tres puertas con la
 * primera del revés, porque a ella el juego ya no se la impone. Ver allí.
 *
 * Las cuatro frases decían «Tras tirar, suéltala en JUGAR y di a quién», y eso nombra UNA
 * de las tres condiciones como si fuera la condición entera. `sePuedeJugarLaCarta` tiene
 * las otras dos escritas seguidas (`if (estado.cartaJugada) return false;` y
 * `return enMano.comprada < estado.turnosAbiertos;`), y `opcionesDelMazo` repite el mismo
 * corte sobre la vista. La ironía es la que hace grave el asunto: la carta que un recién
 * llegado mira primero es justo la que acaba de comprar, o sea la única que el texto le
 * explicaba cómo jugar y el juego no le dejaba.
 *
 * Así que aquí van las tres: DESPUÉS DE TIRAR, UNA AL TURNO y LA NUEVA NO. Medido contra
 * el presupuesto del lienzo peor (25 letras por renglón, dos renglones por frase): 45
 * caracteres y dos renglones. Cabe, y por eso no hace falta el desvío que se estudió:
 * colgarlas del «cómo se usa» de la carta de comprar, que no existe porque comprar no es
 * un naipe de la mano y su única voz es la `ayuda` que le redacta `opcionesDelMazo`. Esa
 * ayuda sigue diciendo lo suyo («no se juega hasta tu turno siguiente») y ahora el naipe
 * lo dice también, que es donde se lee cuando se coge la carta.
 *
 * ═══ UNA SOLA FRASE PARA LAS CUATRO, POR LO MISMO QUE LOS CINCO TÍTULOS ═══
 *
 * Las cuatro colas de antes («di a quién», «di cuáles», «di cuál pides», «trázalas»)
 * repetían lo que su propio «qué hace» ya dice («a quien elijas», «iguales o no», «pides
 * un bien»), y a cambio ocupaban el sitio de las dos puertas que faltaban. Cuatro copias
 * de la misma regla son cuatro sitios donde corregir una errata y tres donde olvidarla.
 * El GESTO se dice sin nombrar mando ninguno: se suelta en el hueco que sale al coger la
 * carta, que es lo que hay (ver la cabecera de `EXPLICACION_DEL_TITULO`).
 *
 * El «Tras tirar» de cabeza es lo que la vacuna de `verify:riberas-en-tres` contrasta
 * contra lo que el juego responde en una mesa de verdad.
 */
const USAS_DE_LA_JUGADA = 'Tras tirar, suelta una al turno; la nueva no.';

/**
 * ═══ Y LA GUARDIA DICE LAS MISMAS TRES PUERTAS, CON LA PRIMERA DEL REVÉS ═══
 *
 * Miguel lo pidió por escrito y la fase 3 lo cumplió: la guardia «puede usarse durante
 * su fase de juego, INCLUSO ANTES DE LANZAR LOS DADOS». O sea que de las tres
 * condiciones de `sePuedeJugarLaCarta`, a esta carta el juego le impone dos y no tres:
 * `jugarLaGuardia` ya no empieza por `!estado.tirado` y `opcionesDeTurno` la ofrece
 * también por el camino de antes de tirar.
 *
 * Por eso NO puede seguir compartiendo `USAS_DE_LA_JUGADA`: aquella frase abre por
 * «Tras tirar», que ahora sería mentira, y la vacuna de `verify:riberas-en-tres` está
 * escrita justamente para que esa mentira no se pueda quedar — le pregunta al juego si
 * ofrece la guardia antes de tirar y exige que la frase diga «Tras tirar» si y sólo si
 * no la ofrece. Se puso roja al empujar la fase 3, que era su trabajo.
 *
 * Las otras dos puertas se dicen IGUAL Y CON LAS MISMAS PALABRAS —«una al turno» y «la
 * nueva no»—, porque son las mismas y porque son las cadenas que esa vacuna busca. Y
 * «suéltala» es el gesto, dicho sin nombrar mando ninguno, como en las otras cuatro.
 *
 * Medido contra el presupuesto de este cliente (§4 de `verify:riberas-en-tres`): 46
 * caracteres, que es el tope exacto, y dos renglones del lienzo peor. No cabe una
 * palabra más, y ésa es la razón de que no diga además lo que la carta hace: eso lo
 * dicen las otras dos frases del mismo naipe.
 */
/*
 * «Suéltala sin tirar» decía la regla del revés: se lee como la CONDICIÓN de alguien que
 * sólo puede jugarla así, y lo que la guardia tiene es un PERMISO. Se sigue ofreciendo
 * después de tirar —`opcionesDelMazo` la emite igual— y así es como se juega la mayoría de
 * las veces; lo que la fase 3 le añadió es que TAMBIÉN vale antes. Las otras dos puertas
 * siguen dichas: una carta al turno, y la comprada hoy no.
 */
const USAS_DE_LA_GUARDIA = 'Antes o tras tirar; una al turno, la nueva no.';

/**
 * LAS NUEVE CLASES, CON SU CARA Y CON LO QUE SE EXPLICA DE ELLAS.
 *
 * ═══ AQUÍ HAY UNA PARÁFRASIS DE LAS REGLAS, Y HAY QUE DECIRLO ═══
 *
 * Esta tabla decía «una fila por clase y ni una regla dentro», y con las tres frases de
 * `explicacion` eso ya no es toda la verdad: lo que hace una guardia está CONTADO aquí,
 * en castellano. La regla sigue viviendo en `riberas.ts` —`jugarLaGuardia` es la que
 * decide, y esta tabla no la mira ni una vez—; lo que hay aquí son palabras sobre ella.
 *
 * Que la paráfrasis no se despegue de la regla no se deja a la buena voluntad, porque la
 * clase de fallo que trae es la peor de todas: un texto que sigue explicando la regla del
 * año pasado se lee perfectamente y no rompe nada. Dos defensas, y son las dos:
 *
 *   · los NÚMEROS salen de las constantes de `riberas.ts` por plantilla, no de los dedos
 *     de nadie (ver la cabecera de `EXPLICACION_DEL_TITULO`);
 *   · y la VACUNA DE LA GUARDIA de `verify:riberas-en-tres` le PREGUNTA al juego, sobre
 *     una mesa de verdad, si ofrece jugar una guardia antes de tirar, y exige que la
 *     frase «cómo se usa» diga «Tras tirar» si y sólo si no la ofrece. La fase 3 de
 *     `docs/EL-LADRON-DE-RIBERAS.md` quitó el `!estado.tirado` de `jugarLaGuardia` y esa
 *     comprobación SE PUSO ROJA, que es exactamente lo que se le pedía; volverla verde
 *     fue cambiar esta fila, y no al revés. La afirmación no se tocó: sigue siendo un «si
 *     y sólo si», y hoy compra que la frase NO diga «Tras tirar».
 *
 * ═══ POR QUÉ ESTA TABLA ESTÁ AQUÍ Y NO EN `riberas.ts` ═══
 *
 * Porque las columnas son de PRESENTACIÓN y ninguna es del juego. `familia` es
 * cómo agrupa la mano de la escena —cinco montones, con los cinco títulos en uno—,
 * `dibujo` es la llave de un contorno de `escenas/iconos.ts`, y `nombre` es lo que se
 * lee en un naipe. Las reglas no distinguen a El Faro de El Huerto ni por asomo: para
 * ellas son la misma carta con dos seriales.
 *
 * Y son columnas y no una cuenta: `ano-bueno` se dibuja con `anobueno` y
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
  guardia: {
    familia: 'guardia',
    dibujo: 'guardia',
    nombre: 'La Guardia',
    /*
     * LA GUARDIA CON EL ESTIAJE, que es la regla desde la fase 3: mueve la pieza y roba
     * desde la isla donde la posa, y se puede jugar sin haber tirado.
     *
     * Las tres frases SE SUSTITUYERON, no se sumaron, tal como el §7.6 de
     * `docs/LAS-CARTAS-SE-EXPLICAN.md` dejó escrito que había que hacerlo. Las dos
     * primeras son las de aquel documento; la tercera la decidió la vacuna, que es lo que
     * allí se dijo también.
     *
     * ═══ QUÉ SE PERDIÓ AL CAMBIARLAS, Y POR QUÉ SE PIERDE A SABIENDAS ═══
     *
     * El «al azar» ya no se dice. La ficha se sigue robando al azar —`elRobo` sortea con
     * `estado.azar` y su cabecera lo razona—, pero en 46 caracteres no caben las dos
     * cosas y la que hay que decir es la que CAMBIA LA DECISIÓN: adónde mandas la pieza
     * decide a quién le robas, y de eso no se enteraba nadie. El «a quien tenga allí» es
     * además la condición dura que `opcionesDelEstiaje` aplica —choza o torre en esa
     * isla— y la que hace que mover sea una jugada y no un trámite.
     *
     * Y lo que esta tabla NO dice, a propósito, porque no es de la carta: que un siete
     * hace tirar la mitad de la mano y esta carta no. Es la regla del descarte y vive
     * donde se aplica, en `tirarLosDados`.
     */
    explicacion: {
      hace: 'Mueves el estiaje y robas a quien tenga allí.',
      consigues: 'Un bien suyo, y muesca para La Mayor Guardia.',
      usas: USAS_DE_LA_GUARDIA,
    },
  },
  'ano-bueno': {
    familia: 'anobueno',
    dibujo: 'anobueno',
    nombre: 'El Año Bueno',
    explicacion: {
      hace: `Coges ${BIENES_DEL_ANO_BUENO} ${plural(BIENES_DEL_ANO_BUENO, 'bien', 'bienes')} del arcón, iguales o no.`,
      consigues: `${enCabeza(cardinal(BIENES_DEL_ANO_BUENO))} ${plural(BIENES_DEL_ANO_BUENO, 'bien', 'bienes')} que no le quitas a nadie.`,
      usas: USAS_DE_LA_JUGADA,
    },
  },
  acaparamiento: {
    familia: 'acaparamiento',
    dibujo: 'acaparamiento',
    nombre: 'El Acaparamiento',
    /*
     * «DE LOS DEMÁS», Y NO «DE LAS OTRAS MANOS», QUE ES OTRA COSA EN ESTA CASA.
     *
     * `mano` aquí es la de CARTAS —`CartaEnMano[]` en `riberas.ts`, y la mano del mazo es
     * justo el sitio donde este naipe se está leyendo—, así que «todo ese bien de las otras
     * manos» invitaba a entender que El Acaparamiento le quita CARTAS a los demás. Lo que
     * se lleva es del `almacen`, y el reductor no toca una sola mano ajena. Se dice sin el
     * sustantivo, que es lo barato y lo que no se puede leer al revés.
     */
    explicacion: {
      hace: 'Pides un bien y todos te dan los que tengan.',
      consigues: 'Todo ese bien de los demás, o nada.',
      usas: USAS_DE_LA_JUGADA,
    },
  },
  'dos-veredas': {
    familia: 'dosveredas',
    dibujo: 'dosveredas',
    nombre: 'Las Dos Veredas',
    /*
     * ═══ EL PLAZO VA DENTRO, PORQUE ES EL ÚNICO SITIO DONDE SE PUEDE DECIR ═══
     *
     * Este naipe promete DOS y el juego puede dar UNA sin avisar. `jugarLasDosVeredas` no
     * pone ninguna vereda: deja `veredasGratis` en dos y las veredas se alzan después, una
     * a una. Y el crédito se apaga por dos caminos que el código tiene escritos: `trazar`
     * lo pone a cero si la primera se comió el último hueco, y `siguienteTurno` lo pone a
     * cero al acabar el turno, con su propio comentario diciendo que «quien juega Las Dos
     * Veredas y luego pasa sin poner la segunda la pierde, y nadie que mire el tablero
     * sabría que existe».
     *
     * Ese segundo camino no se recorre a voluntad, y conviene saberlo: con crédito vivo
     * `opcionesDeRiberas` se va por su `if (v.veredasGratis > 0)` con las veredas y revelar
     * y nada más, así que PASAR ni se ofrece. Lo que sí acaba el turno es EL PLAZO, y ahí
     * la segunda se va sin que nadie haya tocado nada. O sea que el «nadie sabría que
     * existe» es todavía más cierto de lo que su comentario dice.
     *
     * La decisión es buena; lo que no puede quedarse es que tampoco se diga. En la pantalla
     * no hay contador —lo que hay es la `ayuda` de la opción de alzar, que sólo aparece
     * cuando YA hay crédito—, así que el plazo se dice en los DOS sitios que se leen antes
     * de que sea tarde: aquí, al coger el naipe, y en la `ayuda` de la opción que gasta la
     * carta (`DOS_VEREDAS` en `riberas.ts`), que es el último texto que se lee antes de
     * quedarse con el crédito en la mano. De ahí «este turno o nada», y de ahí que la vacuna lo juegue
     * en una mesa de verdad: se juega la carta, se pone UNA, vence el plazo y se exige que
     * el crédito haya muerto.
     */
    explicacion: {
      hace: `Abres ${VEREDAS_DE_LA_CARTA} ${plural(VEREDAS_DE_LA_CARTA, 'vereda', 'veredas')} gratis; este turno o nada.`,
      consigues: `${enCabeza(cardinal(VEREDAS_DE_LA_CARTA))} ${plural(VEREDAS_DE_LA_CARTA, 'paso', 'pasos')} del Vado Largo, o sitio de choza.`,
      usas: USAS_DE_LA_JUGADA,
    },
  },
  /*
   * LOS CINCO TÍTULOS COMPARTEN EL OBJETO, y no cinco copias iguales.
   *
   * Lo dice la cabecera de `ClaseDeCarta`: «cuestan lo mismo, valen lo mismo y hacen lo
   * mismo». Cinco copias iguales son cinco sitios donde corregir una errata, y el fallo
   * sería el de siempre — cuatro corregidas y una no, en la carta que menos sale. Que sean
   * el MISMO objeto lo afirma el comprobador; si un día un título deja de compartirlo será
   * porque alguien lo decidió y le tocó tirar esta línea.
   */
  molino: { familia: 'titulo', dibujo: 'molino', nombre: 'El Molino', explicacion: EXPLICACION_DEL_TITULO },
  cantera: { familia: 'titulo', dibujo: 'cantera', nombre: 'La Cantera', explicacion: EXPLICACION_DEL_TITULO },
  torreon: { familia: 'titulo', dibujo: 'torreon', nombre: 'El Torreón', explicacion: EXPLICACION_DEL_TITULO },
  faro: { familia: 'titulo', dibujo: 'faro', nombre: 'El Faro', explicacion: EXPLICACION_DEL_TITULO },
  huerto: { familia: 'titulo', dibujo: 'huerto', nombre: 'El Huerto', explicacion: EXPLICACION_DEL_TITULO },
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
      explicacion: retrato.explicacion,
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
const RETRATO_DEL_PREMIO: Readonly<Record<'vado' | 'guardia', RetratoDeLaCarta>> = {
  /*
   * LOS DOS PREMIOS TAMBIÉN SE EXPLICAN, y son los que más falta hacía: aparecen SOLOS en
   * la mano, sin que nadie los pida, no se pueden coger para nada y no tienen opción
   * ninguna — o sea que hasta hoy no había ni una `ayuda` que dijera qué son. Quien ve por
   * primera vez un naipe con un vado dibujado no tiene forma de averiguarlo jugando.
   *
   * Su «cómo se usa» empieza por «Nada» a propósito: es la respuesta, y no un hueco. Estos
   * dos naipes no se sueltan en ninguna casilla.
   *
   * ═══ Y LOS DOS NO SE PIERDEN IGUAL, ASÍ QUE NO LO DICEN IGUAL ═══
   *
   * El «qué consigues» de los dos decía «mientras nadie te supere», y en uno de los dos eso
   * es MEDIA regla. `recalcularElVado` tiene la otra escrita en mayúsculas en su cabecera:
   * «Si el dueño baja del mínimo, porque alguien le partió la cadena con una choza, el
   * premio queda VACANTE», y el código la cumple —el `sigueSiendoSuyo` exige `largoActual
   * >= VADO_MINIMO`—. O sea que el Vado se pierde sin que nadie te supere, y quien leía el
   * naipe no tenía manera de saberlo: se le va el premio, y con él dos puntos, por una
   * choza ajena que ni siquiera es una vereda.
   *
   * `recalcularLaGuardia` es la misma función con otra cuenta dentro y tiene el mismo
   * `sigueSiendoSuya`, PERO ahí la rama no se puede dar: lo que cuenta es `c.guardias`, que
   * sólo sube (`jugarLaGuardia` la incrementa y nada la baja), así que una vez alcanzado el
   * mínimo no se baja de él. Por eso su frase se queda como estaba, y no por descuido: es
   * la verdad de su premio. Las dos cosas se juegan en la misma mesa en
   * `verify:riberas-en-tres` — se le parte la cadena al dueño y se exige que el Vado quede
   * vacante Y que La Mayor Guardia siga siendo suya—, para que el día que una de las dos
   * reglas cambie sea la frase la que se ponga roja.
   */
  vado: {
    familia: 'vado',
    dibujo: 'vado',
    nombre: 'El Vado Largo',
    explicacion: {
      hace: `Lo tiene quien encadena más veredas, desde ${VADO_MINIMO}.`,
      consigues: `${PUNTOS_DEL_VADO} ${plural(PUNTOS_DEL_VADO, 'punto', 'puntos')}, hasta que te superen o te corten.`,
      usas: 'Nada: se gana trazando veredas y se va solo.',
    },
  },
  guardia: {
    familia: 'mayorguardia',
    dibujo: 'mayorguardia',
    nombre: 'La Mayor Guardia',
    explicacion: {
      hace: `La tiene quien más guardias juega, desde ${GUARDIA_MINIMA}.`,
      consigues: `${PUNTOS_DE_LA_GUARDIA} ${plural(PUNTOS_DE_LA_GUARDIA, 'punto', 'puntos')} mientras nadie te supere.`,
      usas: 'Nada: se gana jugando guardias y se va sola.',
    },
  },
};

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
      explicacion: cara.explicacion,
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
 * Una sola para Las Dos Veredas Y PARA LA GUARDIA, quince pares para El Año Bueno y
 * cinco bienes para El Acaparamiento. La lista sale vacía si la carta no se puede
 * jugar, que es la misma respuesta que da `sePuedeJugar` y sale del mismo sitio: no
 * hay dos cuentas.
 *
 * `carta` es el seudónimo, o sea el `id` del naipe que la escena acaba de soltar en
 * la casilla. La pantalla no tiene que traducir nada para preguntar.
 *
 * ═══ LA GUARDIA YA NO PREGUNTA A QUIÉN, Y ESTO NO TUVO QUE APRENDERLO ═══
 *
 * Hasta la fase 3 emitía una jugada por colono al que se pudiera robar, y esta función
 * sacaba de la carga un campo `a` con el asiento y le buscaba el nombre para poder
 * preguntar. Ahora la carta MUEVE EL ESTIAJE y a quién se le roba se decide después,
 * eligiendo isla en el tablero, así que la guardia trae una sola jugada y
 * `jugadaSinPreguntar` la manda derecha sin abrir menú. Los dos campos que servían para
 * preguntar —`a` y `nombre`— se cayeron del tipo en vez de quedarse valiendo `null` y
 * `''` para siempre: un campo que ya nadie llena es una respuesta falsa esperando a que
 * alguien la lea. Con ellos se fue `aQuienSeLeRoba`, cuyo nombre habría pasado a mentir.
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
    lista.push({
      clase,
      carta,
      bienes: bienesDeLaCarga(o.carga as Record<string, unknown>),
      rotulo: o.rotulo,
      opcion: o,
    });
  }
  return lista;
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
 * Las Dos Veredas siempre cae aquí —no pide nada— y La Guardia también desde la fase 3,
 * por lo mismo: mueve el estiaje, y la isla se elige después sobre el tablero. Antes
 * caía sólo cuando quedaba un colono al que robar. Es el mismo trato que
 * `truequesPosibles` pide para las ofertas y está escrito allí: si sale una sola, se
 * manda sin preguntar; si salen varias, se pregunta.
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
 *
 * Extiende `DadosDeLaMesa`, el contrato que `<Delta>` recibe (sólo el tipo: la escena no
 * importa nada de aquí), para que un campo que la escena pida mañana no se pueda olvidar
 * en esta traducción sin que deje de compilar. `porTirar` es lo único de más, y lo lee
 * `opcionesFueraDeLaMesa`, no la escena.
 */
export interface DadosEnTres extends DadosDeLaMesa {
  readonly porTirar: boolean;
}

/**
 * LA OPCIÓN DE TIRAR, entera, o `null` si el juego no la ofrece ahora. Como `comprarEnTres`:
 * la pantalla manda la opción que dio el juego (su `tipo` y su `carga`) y no monta un
 * movimiento a mano, que sería escribir su forma en un segundo sitio que nadie comprueba.
 */
export function tirarEnTres<O extends OpcionQueLlega>(opciones: readonly O[]): O | null {
  return opciones.find((o) => o.tipo === TIRAR) ?? null;
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
 *
 * Y SE LLEVA ADEMÁS LA OPCIÓN MARCADA, con dados y sin ellos. La puerta del trueque no es
 * un movimiento montado: pintada como botón es un botón que no juega. Se filtra aquí, y
 * no sólo en el mueble que pinta, por lo mismo que `opcionesFueraDelTablero`: para no
 * depender de que cada pantalla se acuerde. Mientras la carga no se pueda componer, esta
 * línea no le quita a nadie ningún movimiento, porque la declaración no lo es.
 */
export function opcionesFueraDeLaMesa<O extends OpcionQueLlega>(
  opciones: readonly O[],
  dados: DadosEnTres | null,
): O[] {
  return dados === null
    ? opciones.filter((o) => o.declaracion !== true)
    : opciones.filter((o) => o.tipo !== TIRAR && o.declaracion !== true);
}

// ---------------------------------------------------------------------------
// EL CARRIL: qué dice cada cuadrado de 44 puntos
// ---------------------------------------------------------------------------

/** Lo que se pinta dentro de un cuadrado del carril, y con qué filo. */
export interface GlifoDelCarril {
  /**
   * LO QUE VA DENTRO DEL CUADRADO. Una o dos letras: en 44 puntos no cabe más, y lo que
   * hay que poner ahí es lo que ya está escrito EN EL TABLERO, para que el ojo lo case
   * con lo que está mirando.
   */
  readonly glifo: string;
  /**
   * EL TERRENO DE ESA ISLA, con el nombre que le da el juego («marisma», «cantil»…).
   *
   * VIAJA EL NOMBRE Y NO UN COLOR, y es la misma frontera que separa este fichero de la
   * escena en todo lo demás: de qué color se pinta una marisma lo decide `PALETA`
   * (`escenas/paleta.ts`), que es donde `verify:riberas` ya mide que los seis terrenos se
   * separan entre sí y no se comen las piezas de nadie. Mandar un `#rrggbb` desde aquí
   * sería una SEGUNDA tabla de colores de terreno, y la que se quedaría atrás el día que
   * alguien retoque un verde es justamente ésta.
   *
   * Hace falta porque el número no basta él solo: el reparto lleva DOS de cada cifra —
   * `NUMEROS_DE_LAS_ISLAS` es `2,3,3,4,4,…,11,11,12`— así que en el carril puede haber dos
   * cuadrados con un «11» dentro. En el tablero también hay dos onces, y lo que los
   * distingue allí es de qué son: aquí, lo mismo.
   */
  readonly terreno: string;
  /**
   * EL FILO DEL CUADRADO, del color de a quién se le roba. `null` cuando no hay a quién.
   * Es un `#rrggbb` porque sale de `colonos[i].color`, que es el mismo color con el que
   * se pinta esa persona en el marcador y en el tablero plano.
   */
  readonly rail: string | null;
}

/**
 * ═══ QUÉ HACE CADA CUADRADO DEL CARRIL, DICHO EN UNA O DOS LETRAS ═══
 *
 * ═══ EL FALLO, MEDIDO JUGANDO ═══
 *
 * Con un siete de verdad en una mesa de tres, el juego emitió VEINTE opciones de mover el
 * estiaje —dieciocho islas más dos que sólo se distinguen por la víctima— y el carril las
 * pintó como veinte cuadrados con «1», «2», … «20» dentro. Rodar funcionaba; lo que no
 * existía era QUÉ hace cada uno. Y dos de ellos —el 5 y el 6— decían los dos «Mover el
 * estiaje a la marisma …» y sólo se distinguían por a quién le robas, o sea que ni
 * abriendo el cajón se elegía sin leer dos renglones enteros.
 *
 * ═══ LA SALIDA: EL GLIFO ES EL NÚMERO DE LA ISLA, PORQUE ESTÁ EN EL TABLERO ═══
 *
 * El «11» de «la marisma 11» es lo único de esa frase que ya está PINTADO en el delta, en
 * el disco del centro de cada comarca. Con el número dentro del cuadrado, elegir destino
 * deja de ser leer veinte rótulos y pasa a ser mirar el tablero y buscar ese número. Cabe:
 * son dos cifras como mucho, y el cuadrado mide 46,75 puntos con la raíz de esta casa.
 *
 * Se descartaron las dos alternativas que se probaron antes:
 *
 *   · LA INICIAL DEL TERRENO («M» de marisma) — con diecinueve islas repartidas sobre seis
 *     terrenos, las repeticiones son la norma y no la excepción: tres marismas distintas
 *     dirían las tres «M», y encima el cantil y el carrizal comparten inicial. Es el fallo
 *     de hoy escrito con otro alfabeto.
 *   · UN NÚMERO DE ORDEN MÁS CORTO — es exactamente lo que hay, y lo que no dice nada.
 *
 * ═══ Y HASTA DÓNDE LLEGA, DICHO ANTES DE QUE LO DESCUBRA NADIE JUGANDO ═══
 *
 * El número NO es único: `NUMEROS_DE_LAS_ISLAS` reparte `2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,
 * 11,11,12`, o sea DOS de cada cifra salvo el dos y el doce. Así que en el carril puede
 * haber dos cuadrados con un «11». Por eso viaja también el TERRENO, que es lo que los
 * separa en el tablero: dos onces, uno sobre salina y otro sobre cantil, se ven distintos
 * allí y se ven distintos aquí.
 *
 * Y quedaba una ambigüedad que este fichero NO PODÍA CERRAR porque era del propio rótulo del
 * juego: si las dos islas del mismo número son ADEMÁS del mismo terreno, ni «Mover el estiaje
 * a la salina 11» las distinguía —y no era un caso raro: medido sobre tres mil repartos de
 * verdad, 2.177 de ellos tienen al menos un par así—. Ya está cerrada, y donde tenía que
 * estarlo: `nombresDeLasIslas` (`riberas.ts`) le pone el rumbo a las que comparten nombre —«a
 * la salina 11 del norte» y «del sur»— porque el rumbo lo sabe quien tiene la llave del
 * hexágono, no el cuadrado que lo pinta. Aquí no cambia nada: el glifo sigue siendo la cifra,
 * y lo que separa esos dos cuadrados a la vista sigue siendo el sitio del tablero al que
 * miran; lo que se gana es que el rótulo que se oye y el que sale al posar el ratón ya no
 * dicen lo mismo para dos botones distintos.
 *
 * ═══ Y LA VÍCTIMA VA EN EL FILO, NO EN EL GLIFO ═══
 *
 * Porque no cabe dentro y porque no es la misma pregunta: primero se elige ADÓNDE, y sólo
 * en las islas con dos víctimas hay una segunda. El filo del color de a quién le robas es lo
 * que separa esos dos cuadrados gemelos sin escribir una letra más — y es el mismo color
 * con el que esa persona se pinta en el marcador, no un código nuevo que haya que aprender.
 * El filo NO es la única señal: el `aria-label` sigue llevando la frase entera con el nombre
 * de la víctima dentro, que es lo que se oye y lo que se ve al posar el ratón.
 *
 * ═══ LO QUE NO SE TOCA: LO DEMÁS SIGUE CON SU NÚMERO DE ORDEN ═══
 *
 * Esta tabla sólo habla del estiaje. Tirar, pasar, empezar, aceptar y rechazar salen en
 * listas de dos a cinco botones, donde el número de orden SÍ significa algo —es el atajo de
 * teclado que el carril anuncia con `aria-keyshortcuts`— y donde no hay ninguna isla que
 * nombrar. Quien pinta usa el glifo cuando lo hay y el ordinal cuando no.
 *
 * ═══ SE DEVUELVE UNA TABLA POR `id` Y NO UNA LISTA PARALELA ═══
 *
 * Por lo mismo que `Opcion.id` existe: una lista paralela obliga a quien pinta a mantener
 * dos órdenes iguales, y el día que se filtre una opción antes de pintarla los glifos se
 * corren un puesto — cada cuadrado diría el número de la isla del siguiente, sin que nada
 * se caiga. Con la tabla por `id` eso es imposible por construcción.
 */
export function glifosDelCarril<O extends OpcionQueLlega>(
  vista: unknown,
  opciones: readonly O[],
): ReadonlyMap<string, GlifoDelCarril> {
  const tabla = new Map<string, GlifoDelCarril>();
  if (!esVistaQueSePinta(vista)) return tabla;
  /*
   * Las islas se indexan UNA vez: con veinte opciones y diecinueve islas, buscarlas dentro
   * del bucle son trescientas ochenta comparaciones por repintado, y esto se llama en cada
   * render del delta.
   */
  const porLlave = new Map<string, { terreno: string; numero: number }>();
  for (const isla of vista.islas) {
    /*
     * SE LEE LO QUE LLEGA POR EL CABLE, no lo que el tipo promete. `esVistaQueSePinta` mira
     * CUATRO campos y ninguno es la forma de una isla —está dicho en su cabecera—, así que una
     * isla sin `hex` reventaría aquí con «no se puede leer 'q' de undefined» y dejaría el delta
     * ENTERO sin pintar por un cuadrado que no se iba a pintar. Es el mismo agujero que ya se
     * pagó en `marcadorEnTres` el día que empezó a contar chozas. La isla mala se salta: su
     * opción se queda sin glifo y cae al número de orden, que es la degradación de siempre.
     */
    const hex = isla.hex as { q?: unknown; r?: unknown } | undefined;
    if (hex === undefined || typeof hex.q !== 'number' || typeof hex.r !== 'number') continue;
    porLlave.set(llaveDeHex({ q: hex.q, r: hex.r }), {
      terreno: typeof isla.terreno === 'string' ? isla.terreno : 'desconocido',
      numero: typeof isla.numero === 'number' ? isla.numero : 0,
    });
  }
  for (const o of opciones) {
    if (o.tipo !== MOVER_EL_ESTIAJE) continue;
    if (typeof o.carga !== 'object' || o.carga === null) continue;
    const carga = o.carga as Record<string, unknown>;
    const donde = carga['donde'];
    if (typeof donde !== 'string') continue;
    const isla = porLlave.get(donde);
    if (isla === undefined) continue;
    const a = carga['a'];
    const rail = typeof a === 'string' ? (vista.colonos.find((c) => c.asiento === a)?.color ?? null) : null;
    tabla.set(o.id, { glifo: glifoDeLaIsla(isla.terreno, isla.numero), terreno: isla.terreno, rail });
  }
  return tabla;
}

/**
 * EL NÚMERO DE LA ISLA, Y LA ÚNICA QUE NO TIENE.
 *
 * La duna no rinde: su `numero` es cero y en el tablero NO lleva disco de cifra, así que
 * poner un «0» en su cuadrado sería escribir en el carril un número que no está pintado en
 * ninguna parte del delta. Se pone su inicial, y la colisión de iniciales que descarta esa
 * solución para las demás aquí no puede darse: de las diecinueve islas de un reparto, la
 * duna es EXACTAMENTE UNA (`RINDE` le da `null` a un solo terreno), así que en el carril hay
 * como mucho un cuadrado con letra y dieciocho con cifra.
 *
 * Y sale del terreno que trae la vista y no de una tabla de nombres escrita aquí: un terreno
 * que este cliente no conozca da su propia inicial en vez de un hueco.
 */
function glifoDeLaIsla(terreno: string, numero: number): string {
  if (numero > 0) return String(numero);
  return terreno.slice(0, 1).toUpperCase();
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
  /**
   * CUÁNTAS CHOZAS Y CUÁNTAS TORRES TIENE PUESTAS: las dos cifras que el §11 del diseño
   * le pedía al marcador y que hasta hoy no salían de ninguna función.
   *
   * ═══ CONTAR AQUÍ NO ES ESCRIBIR UNA REGLA, Y LA DIFERENCIA ESTÁ EN QUÉ SE CUENTA ═══
   *
   * Las piezas están SOBRE EL TABLERO: quien mira la mesa las ve y las cuenta con el dedo,
   * y `ColonoVisto` las trae enteras —`chozas` y `torres` son las mismas listas de vértices
   * con las que se pinta el delta—. Un `length` de una lista pública es PROYECCIÓN: no hay
   * aquí ningún tope de piezas, ningún coste y ninguna condición de victoria. El día que la
   * pantalla quiera decir «te quedan dos chozas por poner», eso SÍ sería regla y tendría
   * que llegar publicado por `proyectarRiberas`, igual que llegan `puntos` o `vado`.
   *
   * ═══ Y POR QUÉ `bienes` NO ESTÁ AL LADO ═══
   *
   * Porque Miguel lo quitó del encargo (DECISIÓN 17): los bienes de los DEMÁS no se
   * enseñan. Subirlos «ya que estamos» metería en el marcador —que es lo que ve la mesa
   * entera— la mano de cada uno, que es exactamente lo que esa decisión dice que no se
   * pinta. Lo mío por clase lo enseña el panel «Lo mío», que sale de la vista de mi propio
   * asiento y no de aquí.
   */
  readonly chozas: number;
  readonly torres: number;
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
        /*
         * SE CUENTAN LAS LISTAS DE LA VISTA, no las de ningún estado: lo que llega por el
         * cable es lo que hay sobre el tablero, y de ahí sale la cifra. Y no llega `bienes`
         * ni por descuido: DECISIÓN 17.
         */
        chozas: c.chozas?.length ?? 0,
        torres: c.torres?.length ?? 0,
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

// ---------------------------------------------------------------------------
// Los paneles declarados, ordenados para el cajón
// ---------------------------------------------------------------------------

/**
 * LOS SEIS PANELES QUE EL JUEGO DECLARA, PUESTOS EN EL ORDEN DEL CAJÓN Y SIN LOS BIENES
 * AJENOS (decisión 17).
 *
 * ═══ POR QUÉ ESTOS PANELES SON EL DATO Y NO EL ADORNO ═══
 *
 * `panelesDe` (`riberas.ts`) declara «Lo mío», «Mis cartas», «La mesa», «El Vado Largo»,
 * «La Mayor Guardia» y —cuando hay— «Trueques», y los pintan los dos clientes por igual.
 * Un inventario de lo que vive FUERA del lienzo encontró que dos datos de la partida no
 * existen en ningún otro sitio de esta pantalla: MIS BIENES POR CLASE —en la escena la
 * mano son cartas sin número, así que «limo: 3» sólo se lee aquí— y LAS PROPUESTAS DE
 * TRUEQUE, que el panel «Trueques» es lo único que enseña. O sea que llevar el delta a
 * pantalla completa sin llevarse los paneles habría perdido las dos cosas.
 *
 * ═══ QUÉ HACE ESTA FUNCIÓN, QUE SON DOS COSAS Y NINGUNA ES UNA REGLA ═══
 *
 *   1. GARANTIZA QUE «Lo mío» VA EL PRIMERO. En el raíl el orden daba igual porque se
 *      veían todos a la vez; en un cajón que se abre para mirar y se cierra para jugar, el
 *      primer renglón es el que se lee sin desplazar, y lo que hay que mirar antes de
 *      decidir una jugada es lo que uno tiene. Los demás se quedan en el orden que les dio
 *      el juego: reordenarlos todos sería escribir aquí un criterio que allí no hay.
 *
 *      Y HOY ESTO NO CAMBIA NADA, que hay que decirlo: `panelesDe` ya lo declara el
 *      primero. O sea que con los paneles de una partida de verdad este adelanto es un
 *      no-op, y una comprobación que sólo mirase eso estaría en verde aunque la función no
 *      reordenara. Por eso `verify:riberas-en-tres` la llama ADEMÁS con «Lo mío» enterrado
 *      en medio: lo que se compra no es el orden de hoy, es que el día que el juego añada
 *      un panel por encima el cajón siga abriéndose por lo que uno tiene.
 *   2. QUITA LA CIFRA DE BIENES DEL PANEL «La mesa». Es la decisión 17 de Miguel, tomada
 *      el 7 de septiembre de 2026: los bienes de los DEMÁS no se llevan a la pantalla
 *      completa. El renglón de ese panel dice «Ana — 3 ptos, 5 bienes, 2 cartas, vereda
 *      más larga 4»; se le quita el trozo de los bienes y se queda el resto, que es lo
 *      único que ese panel añade a la ficha del marcador de arriba.
 *
 * Ninguna de las dos es una regla del juego: son dos decisiones sobre QUÉ SE ENSEÑA y
 * dónde, tomadas sobre texto que el juego ya escribió. Aquí no se cuenta nada, no se
 * consulta la vista y no se inventa una palabra: entra una lista de paneles y sale la
 * misma lista con otro orden y un trozo menos.
 *
 * ═══ Y VIVE EN `shared/` Y NO EN LA PANTALLA, QUE ES LO QUE LA HACE MEDIBLE ═══
 *
 * Por lo mismo que `marcadorEnTres`: la va a llamar el escritorio hoy y la app en la fase
 * 6, y una copia en cada cliente son dos criterios que divergen. Y sobre todo porque así
 * `verify:riberas-en-tres` puede llamarla desde Node con los paneles de una partida de
 * VERDAD y exigir las dos mitades: que la cifra desaparezca, y que estuviera antes. Lo
 * segundo es lo que importa, porque esto se apoya en cómo `panelesDe` redacta el
 * renglón: el día que lo reescriba, la comprobación se pone roja en vez de dejar el
 * recorte sin recortar y a nadie enterado.
 *
 * NUNCA SE PIERDE UN PANEL. Si el juego renombra sus títulos, esto devuelve los mismos
 * paneles en el mismo orden y sin tocar: se degrada a no hacer nada, que es lo correcto
 * cuando la suposición de la que parte ha dejado de valer.
 */
export const PANEL_DE_LO_MIO = 'Lo mío';
export const PANEL_DE_LA_MESA = 'La mesa';

/**
 * «, 5 bienes» dentro del renglón de un colono, con su coma de delante y sin la de
 * detrás: así el renglón se cierra solo y no quedan dos comas seguidas ni un espacio
 * suelto. `bien` en singular está en la alternativa porque el juego lo escribe así con
 * uno solo, y ése es justo el caso que una expresión escrita de memoria se deja.
 */
const LOS_BIENES_DE_UN_COLONO = /, \d+ bien(?:es)?(?=,|$)/g;

export function panelesEnTres(paneles: unknown): PanelDeTablero[] {
  if (!Array.isArray(paneles)) return [];
  const sanos = (paneles as unknown[]).filter(
    (p): p is PanelDeTablero => typeof p === 'object' && p !== null,
  );
  const puestos = sanos.map((panel): PanelDeTablero => {
    const lineas = Array.isArray(panel.lineas) ? panel.lineas : [];
    if (panel.titulo !== PANEL_DE_LA_MESA) return { titulo: panel.titulo, lineas: [...lineas] };
    return {
      titulo: panel.titulo,
      lineas: lineas.map((l) => (typeof l === 'string' ? l.replace(LOS_BIENES_DE_UN_COLONO, '') : l)),
    };
  });
  const mio = puestos.filter((p) => p.titulo === PANEL_DE_LO_MIO);
  return [...mio, ...puestos.filter((p) => p.titulo !== PANEL_DE_LO_MIO)];
}

// ---------------------------------------------------------------------------
// EL PREGÓN: las propuestas de trueque, y lo que ya se trocó
// ---------------------------------------------------------------------------

/**
 * ═══ QUÉ ES EL PREGÓN Y POR QUÉ NO PODÍA SEGUIR SIENDO UN PANEL ═══
 *
 * Miguel, palabra por palabra: «se tiene que mostrar en la pantalla las propuestas de
 * trueque por cada jugador con capacidad de aceptar o rechazar, la aceptación debe tener
 * que confirmarse para que no se acepte por equivocación». Y su decisión 17 parte los
 * trueques en DOS MITADES: las propuestas VIVAS y los que YA se cerraron.
 *
 * Lo único que enseñaba hoy una propuesta era el panel «Trueques» que declara `panelesDe`:
 * un renglón de texto por trato con su seudónimo delante («t3: Ana da junco por limo a
 * Bruno — propuesta»). Eso vale para leer un historial y no vale para CONTESTAR —no hay
 * dónde pulsar— y con el delta a pantalla completa ese panel vive dentro del cajón, o sea
 * detrás de un botón que hay que abrir. Una propuesta caduca al acabar el turno de quien la
 * hizo (`caducarLosAbiertos`), así que una oferta que sólo se ve abriendo un cajón es una
 * oferta que casi nadie contesta.
 *
 * El pregón cuelga de la cinta, NO es modal —lo lee quien no tiene el turno, mientras otro
 * juega— y sus tiras se pulsan.
 *
 * ═══ POR QUÉ ESTO VIVE EN `shared/` Y NO EN LA PANTALLA ═══
 *
 * Por lo mismo que `marcadorEnTres` y `panelesEnTres`: lo va a pintar el escritorio hoy y
 * la app después, y dos lecturas de `v.tratos` son dos maneras de decir «la aceptó Ana» que
 * divergen el día que alguien toque una. Y sobre todo porque así un comprobador de Node
 * puede ejercitarlo con partidas de VERDAD, que es lo único que compra que las frases digan
 * lo que de verdad pasó.
 *
 * ═══ AQUÍ NO SE DECIDE NINGUNA REGLA ═══
 *
 * Quién puede aceptar y quién rechazar lo dice el juego con su lista de opciones, y aquí se
 * BUSCAN por el seudónimo del trato en vez de volver a mirar almacenes: es lo mismo que hace
 * `mazoEnLaBarra` con COMPRAR y `dadosEnTres` con TIRAR. Que a una tira le falte el botón de
 * aceptar significa exactamente «el juego no me lo ofrece» —no tengo lo que se me pide—, y
 * eso se escribe en su renglón de estado en vez de inventarse aquí una segunda comprobación
 * de las reglas.
 */

/** El estado vivo de `EstadoDelTrato`, tal como lo escribe `riberas.ts`. */
const TRATO_VIVO = 'propuesta';

/**
 * LO QUE DE VERDAD SEAN PALABRAS DENTRO DE UNA LISTA, y nada más que eso. Los campos del
 * trato llegan declarados como `unknown` a propósito —esta vista se declara por estructura
 * y por aquí pasan partidas guardadas de cualquier época—, así que se criban antes de
 * contarlos: una lista con un `null` dentro se pintaría «1 null por 1 limo» sin que nada
 * fallara.
 *
 * La usan los dos lados de la oferta (`da` y `pide`) y también `rechazada`, que es una
 * lista de asientos. Criba, y por eso NO sirve para leer la carga de una opción que se va a
 * mandar: para eso está `listaDeBienes`, que es estricta, y allí está dicho por qué.
 */
function soloTextos(lo: unknown): string[] {
  return Array.isArray(lo) ? (lo as unknown[]).filter((b): b is string => typeof b === 'string') : [];
}

/**
 * ═══ EL PLURAL DE CADA BIEN, ESCRITO UNO A UNO Y NO INVENTADO CON UNA «s» ═══
 *
 * Esta tabla nace de un fallo MEDIDO en pantalla, no de una precaución. Mientras un lado de
 * un trueque fue exactamente un bien, la rama del plural de `enPalabras` no se ejecutaba
 * NUNCA; con el tope de tres por lado se ejecuta, y de las cinco clases de `BIENES` hay una
 * que la regla de pegar una «s» rompe: `sal`. La primera frase que la multiplicidad dijo en
 * voz alta fue «3 sals», y la dijo en TRES sitios de la misma pantalla —la tira del pregón,
 * el título de su hoja y el nombre accesible de la tira—, mientras la `ayuda` que escribe
 * el juego con `listar` decía el mismo trato bien.
 *
 * VA POR TABLA Y NO POR REGLA porque las reglas del plural castellano (vocal, «s»;
 * consonante, «es»; y la «z» aparte) son tres reglas para cinco palabras que no cambian
 * nunca, y una tabla se lee entera de un vistazo. Se exporta para que `verify:riberas-en-tres`
 * pueda exigir que `BIENES` esté cubierta: el día que entre un bien nuevo, el comprobador se
 * pone rojo en vez de estrenarlo con su plural inventado.
 */
export const PLURAL_DEL_BIEN: Readonly<Record<string, string>> = {
  junco: 'juncos',
  limo: 'limos',
  sal: 'sales',
  piedra: 'piedras',
  grano: 'granos',
};

/**
 * «1 junco», «2 juncos y 1 limo», «3 sales». Cuenta las fichas por CLASE, que es como se
 * lee una oferta de varios bienes: «3 sales por 2 juncos» y no la lista de las cinco fichas.
 *
 * El plural sale de `PLURAL_DEL_BIEN`. La caída —pegar una «s»— sólo se usa con algo que no
 * esté en la tabla, o sea con lo que no es un bien de este juego, y ahí ya no hay verdad que
 * proteger: es basura de una partida guardada que se cribó mal.
 */
function enPalabras(bienes: readonly string[]): string {
  if (bienes.length === 0) return 'nada';
  const cuentas = new Map<string, number>();
  for (const b of bienes) cuentas.set(b, (cuentas.get(b) ?? 0) + 1);
  const trozos = [...cuentas].map(
    ([bien, cuantos]) => `${String(cuantos)} ${cuantos === 1 ? bien : (PLURAL_DEL_BIEN[bien] ?? `${bien}s`)}`,
  );
  if (trozos.length === 1) return trozos[0] as string;
  return `${trozos.slice(0, -1).join(', ')} y ${trozos[trozos.length - 1] as string}`;
}

/** Lo mismo, pero para quien tiene una lista de bienes fuera del pregón. */
export function bienesEnPalabras(bienes: readonly string[]): string {
  return enPalabras(bienes);
}

/**
 * ═══ LOS RÓTULOS DEL PREGÓN Y DEL COMPONEDOR, ESCRITOS UNA VEZ PARA LAS DOS PANTALLAS ═══
 *
 * No son vocabulario de Riberas —eso lo redacta el juego y llega dentro de cada tira y de la
 * declaración de la puerta—: son los nombres de los MUEBLES, y hasta hoy vivían sueltos en el
 * cliente que los estrenó. Bajan aquí porque el retablo los necesita en los DOS, y dos copias
 * de «Trueques cerrados» son dos sitios donde el día que una cambie sólo cambiará una: el PC
 * diría una cosa y el teléfono otra sobre la misma mesa.
 *
 * Lo que NO baja es lo que sólo tiene una pantalla —el nombre del grupo del conmutador del
 * escritorio, que es un `aria-label` y en React Native no existe—: bajar aquí algo que sólo
 * usa uno sería mudar el problema, no quitarlo.
 */
export const EL_PREGON_DE_LA_MESA = 'Los trueques de la mesa';
export const PARA_CONTESTAR = 'Para contestar';
export const LAS_MIAS = 'Tuyas';
export const LOS_CERRADOS = 'Trueques cerrados';
export const ABRIR_LA_HOJA = 'Toca para contestar';
export const ABRIR_LA_HOJA_SIN_CONTESTAR = 'Toca para verlo entero';
export const EL_COMPONEDOR = 'Montar un trueque';
export const LO_QUE_DOY = 'Doy';
export const LO_QUE_PIDO = 'Pido';
export const PROPONER = 'Proponer';

/** Una propuesta de trueque tal como se pinta en el pregón: una tira. */
export interface TiraDelPregon<O extends OpcionQueLlega = OpcionQueLlega> {
  /** El seudónimo del trato (`t3`). Es su identidad y su llave de lista. */
  readonly id: string;
  readonly de: AsientoId;
  /**
   * A QUIÉN VA, Y `null` ES A LA MESA.
   *
   * El tipo decía `AsientoId` a secas y MENTÍA desde que el trueque paramétrico estrenó las
   * propuestas abiertas: `Trato.para` es `AsientoId | null` en `riberas.ts`. Con el tipo
   * mintiendo, el corte de más abajo se llevaba las abiertas por delante sin decir nada.
   */
  readonly para: AsientoId | null;
  /** El color de quien la propone: el raíl de la tira, el mismo de sus piezas. */
  readonly color: string;
  /** Lo que entrega quien propone y lo que quiere a cambio, en palabras. */
  readonly da: string;
  readonly pide: string;
  /** `propuesta` | `aceptada` | `rechazada` | `caducada`, tal cual del juego. */
  readonly estado: string;
  /**
   * LA FRASE ENTERA, escrita desde donde mira quien la lee: «Ana te da 1 junco por 1 limo».
   * Es el nombre accesible de la tira y el título de su hoja, así que dice quién, qué y en
   * qué dirección — que es justo lo que un «t3: …» del panel no decía.
   */
  readonly frase: string;
  /**
   * EL RENGLÓN DE ESTADO, EN DOS VERSIONES, Y LAS DOS HACEN FALTA.
   *
   * `comoAnda` lleva el nombre («la aceptó Ana»); `comoAndaSinNombre` no («aceptada»). Cuál
   * se pinta lo decide el ancho, y lo decide el CLIENTE porque sólo él sabe con qué letra
   * pinta: en un lienzo de 288 puntos la tira deja 91,2, que son diez letras, y ahí «la
   * aceptó Ana» no entra. LA REGLA, decidida y escrita: si algo no cabe se recorta EL
   * NOMBRE, nunca el estado. Saber que te la aceptaron importa más que saber quién, y el
   * quién sigue entero en la frase y en la hoja.
   */
  readonly comoAnda: string;
  readonly comoAndaSinNombre: string;
  /**
   * LAS DOS OPCIONES DEL JUEGO, o `null` cuando no las ofrece. `aceptar` en `null` con
   * `rechazar` puesto es un caso de verdad y no un hueco: el juego ofrece RECHAZAR siempre
   * al destinatario y ACEPTAR sólo si tengo lo que se me pide.
   */
  readonly aceptar: O | null;
  readonly rechazar: O | null;
}

/** Los tres bloques del pregón. Ver `elPregonEnTres`. */
export interface PregonEnTres<O extends OpcionQueLlega = OpcionQueLlega> {
  /** Las vivas que YO puedo contestar. */
  readonly paraContestar: readonly TiraDelPregon<O>[];
  /** Las vivas que YO he propuesto, con su estado. */
  readonly mias: readonly TiraDelPregon<O>[];
  /** Y lo que ya se cerró: aceptado, apartado o caducado. La otra mitad de la decisión 17. */
  readonly cerrados: readonly TiraDelPregon<O>[];
}

/**
 * EL PREGÓN DE ESTA VISTA, o `null` cuando no hay NADA VIVO que pregonar.
 *
 * ═══ EL `null` ES LA DECISIÓN, Y ES LA QUE PAGA EL CARTEL DE LOS NAIPES ═══
 *
 * Devuelve `null` —o sea: no hay pregón— cuando no queda ninguna propuesta viva, aunque
 * `v.tratos` esté lleno de cerrados. Y eso NO es media decisión 17: es lo que la hace
 * sostenible, y sale de una medida. Con la cinta a 88 y el cartel de los naipes puesto
 * quedan 32 puntos en el SE apaisado, o sea CERO tiras, así que la regla que
 * `docs/EL-TRUEQUE-DE-RIBERAS.md` §4.1 comparte con el otro documento es de EXCLUSIÓN: con
 * el pregón pintado el cartel NO se pinta. Si el pregón existiera también con sólo tratos
 * cerrados, el cartel se apagaría PARA SIEMPRE en cuanto se trocara una vez —`ultimos`
 * guarda los ocho últimos y esa lista ya no se vacía en toda la partida— y encima ocho
 * renglones de historia taparían el tablero sin que nadie los hubiera pedido.
 *
 * Lo cerrado NO se pierde por eso, y ahí está la otra mitad: cuando el pregón existe se lo
 * lleva entero (`cerrados`) y `panelesFueraDelPregon` retira el panel «Trueques» del cajón
 * para que no se diga dos veces; cuando no existe, el panel se queda donde estaba y quien
 * vuelva al tablero dos turnos después sigue pudiendo saber quién le dio qué a quién. Es el
 * mismo trato que `opcionesFueraDeLaBarra` le da al botón de comprar, y por lo mismo: la
 * cosa desaparece de un sitio exactamente cuando aparece en el otro, porque las dos mitades
 * miran EL MISMO dato y no dos banderas que se pueden separar.
 *
 * ═══ Y «PARA CONTESTAR» Y «TUYAS» SIGUEN SIN DARSE A LA VEZ, PERO POR OTRO MOTIVO ═══
 *
 * Un trueque sólo se propone con el turno en la mano (`ofrecer` corta si no se ha tirado y
 * `opcionesDeTurno` sólo lo emite dentro del turno) y caduca al pasarlo
 * (`caducarLosAbiertos`, dentro de `siguienteTurno`). O sea que en cualquier instante el
 * único que puede tener propuestas vivas es quien tiene el turno: o soy yo, y entonces todas
 * las vivas son MÍAS, o es otro, y entonces ninguna lo es. Eso NO ha cambiado con las ofertas
 * a la mesa: lo que una abierta cambia es a CUÁNTA gente le sale la tira en «Para contestar»
 * —a todos los sentados menos al que propuso, en vez de a uno—, no de quién son las vivas.
 * Los dos bloques siguen escritos igual porque el día que una propuesta sobreviva al turno
 * van a hacer falta a la vez, y `verify:riberas-en-tres` lo dice con esas palabras para que
 * un bloque vacío no se lea como un bloque roto.
 */
export function elPregonEnTres<O extends OpcionQueLlega>(
  vista: unknown,
  quien: AsientoId | null,
  opciones: readonly O[],
): PregonEnTres<O> | null {
  if (!esVistaQueSePinta(vista) || quien === null) return null;
  const tratos = vista.tratos;
  if (!Array.isArray(tratos)) return null;

  const nombreDe = (asiento: AsientoId): string =>
    vista.colonos.find((c) => c.asiento === asiento)?.nombre ?? asiento;
  const colorDe = (asiento: AsientoId): string =>
    vista.colonos.find((c) => c.asiento === asiento)?.color ?? '';
  const laOpcion = (tipo: string, id: string): O | null =>
    opciones.find((o) => {
      if (o.tipo !== tipo || typeof o.carga !== 'object' || o.carga === null) return false;
      return (o.carga as Record<string, unknown>)['trato'] === id;
    }) ?? null;

  const paraContestar: TiraDelPregon<O>[] = [];
  const mias: TiraDelPregon<O>[] = [];
  const cerrados: TiraDelPregon<O>[] = [];

  for (const crudo of tratos) {
    if (typeof crudo !== 'object' || crudo === null) continue;
    const id = crudo.id;
    const de = crudo.de;
    const para = crudo.para;
    const estado = crudo.estado;
    if (typeof id !== 'string' || typeof de !== 'string') continue;
    /*
     * `null` ES UN DESTINO Y NO UNA ENTRADA ROTA, y ésta era la línea del fallo. Decía
     * `typeof para !== 'string'` y con eso una propuesta dicha A LA MESA no llegaba a
     * pintarse; y como el pregón SÍ existía si además había una dirigida viva,
     * `opcionesFueraDelPregon` le quitaba a la pantalla los ACEPTAR y RECHAZAR de todo, y
     * `panelesFueraDelPregon` retiraba el panel de texto: dos movimientos legales sin un
     * solo sitio donde pulsarlos. Lo que sigue fuera es `undefined`, que no es un destino:
     * es un trato guardado a medias.
     */
    if (para !== null && typeof para !== 'string') continue;
    if (typeof estado !== 'string') continue;
    const da = soloTextos(crudo.da);
    const pide = soloTextos(crudo.pide);
    const rechazada = soloTextos(crudo.rechazada);
    const daDicho = enPalabras(da);
    const pideDicho = enPalabras(pide);
    const suNombre = nombreDe(de);
    const abierta = para === null;
    const elOtro = abierta ? A_LA_MESA : nombreDe(para);
    const vivo = estado === TRATO_VIVO;
    const comun = { id, de, para, color: colorDe(de), da: daDicho, pide: pideDicho, estado };

    /*
     * TRES REDACCIONES Y NO UNA CON UN «SI» DENTRO: la misma oferta se lee distinta según de
     * qué lado de la mesa esté quien la mira, y ésa es justo la información que el panel de
     * texto no daba. «Ana te da» dice que hay que contestar; «le ofreces a Bruno» dice que
     * estás esperando; y el pasado dice que ya no hay nada que hacer.
     */
    /*
     * QUIÉN PUEDE CONTESTAR, Y ES LA MISMA CUENTA QUE HACE `opcionesDeTurno`: el
     * destinatario de una dirigida, o cualquiera menos el proponente y quien ya la apartó
     * si es abierta. La condición de `rechazada` no es adorno: sin ella, una abierta que YO
     * ya aparté se pintaría en «Para contestar» con sus dos botones en `null` —el juego no
     * me ofrece ya ninguno— y una tira sin botones se lee como una tira rota.
     */
    if (vivo && (para === quien || (abierta && de !== quien && !rechazada.includes(quien)))) {
      const aceptar = laOpcion(ACEPTAR, id);
      paraContestar.push({
        ...comun,
        frase: abierta
          ? `${suNombre} ofrece ${daDicho} por ${pideDicho}, a la mesa`
          : `${suNombre} te da ${daDicho} por ${pideDicho}`,
        /*
         * SIN ACEPTAR, EL RENGLÓN DICE POR QUÉ. El juego le ofrece RECHAZAR siempre al
         * destinatario y ACEPTAR sólo si tiene lo que se le pide (`opcionesDeTurno`). Una
         * hoja con un solo botón y sin una palabra que lo explique se lee como una hoja rota.
         */
        comoAnda: aceptar === null ? `no tienes ${pideDicho}` : 'te toca contestar',
        comoAndaSinNombre: aceptar === null ? 'no puedes pagarlo' : 'contesta',
        aceptar,
        rechazar: laOpcion(RECHAZAR, id),
      });
      continue;
    }
    if (vivo && de === quien) {
      /*
       * «apartada ×2» ES LO QUE UNA ABIERTA TIENE Y UNA DIRIGIDA NO. Una dirigida se cierra
       * con el primero que dice que no, así que su cuenta de apartadas nunca pasa de cero
       * viva; una abierta sigue en pie mientras quede alguien que no la haya apartado, y sin
       * esta cifra quien la propuso no tiene ningún sitio donde enterarse de que ya van dos
       * que han dicho que no. Son once letras, que es lo que cabe en el lienzo más pequeño.
       */
      const apartadas = rechazada.length;
      mias.push({
        ...comun,
        frase: abierta
          ? `Ofreces a la mesa ${daDicho} por ${pideDicho}`
          : `Le ofreces a ${elOtro} ${daDicho} por ${pideDicho}`,
        comoAnda: apartadas === 0 ? `esperando a ${elOtro}` : `apartada ×${String(apartadas)}`,
        comoAndaSinNombre: apartadas === 0 ? 'esperando' : `apartada ×${String(apartadas)}`,
        aceptar: null,
        rechazar: null,
      });
      continue;
    }
    /*
     * ═══ LO VIVO QUE AQUÍ ABAJO LLEGA ES UNA ABIERTA QUE YO YA APARTÉ, Y SE DEJA FUERA ═══
     *
     * Esta cabecera decía que lo vivo que no fuera mío ni para mí «hoy no puede existir —sólo
     * propone quien tiene el turno, y propone a UNO—, y el día que exista (una oferta a la
     * mesa) su sitio es Para contestar». Ese día llegó con el trueque paramétrico y ese sitio
     * es el bloque de arriba, que es adonde va ahora. Lo que queda cayendo aquí es una sola
     * cosa: una abierta VIVA que yo mismo aparté.
     *
     * Y se deja fuera a sabiendas. El juego ya no me ofrece ni aceptarla ni apartarla otra
     * vez, así que no hay ningún movimiento que se quede sin sitio donde pulsarse —que era el
     * fallo de verdad—; y meterla entre los cerrados diría que ya pasó algo que no ha pasado:
     * la propuesta sigue en pie para los demás, y su estado sigue siendo `propuesta`. Quien
     * la propuso la ve entera en «Tuyas», con su «apartada ×1» contándome a mí.
     */
    if (vivo) continue;
    /*
     * QUIÉN CONTESTÓ, Y SI FUI YO SE DICE EN SEGUNDA PERSONA. Escrito con el nombre a secas
     * salía «la apartó Ana» en la pantalla de Ana, o sea la frase hablando de quien la lee en
     * tercera persona: se lee como si hubiera otra Ana en la mesa. Esto se vio MIRANDO y no
     * midiendo, y por eso queda escrito aquí.
     */
    const contesto = para === quien ? null : elOtro;
    /*
     * Y DE UNA ABIERTA CERRADA YA SE PUEDE DECIR QUIÉN, PORQUE EL ESTADO LO GUARDA.
     *
     * Aquí ponía que no se podía —«`Trato` no tiene ningún campo donde apuntar quién fue»,
     * y que poder decirlo «es un campo más en el estado, y es una decisión de las reglas y
     * no de esta pantalla»—. La decisión se tomó: `Trato.acepto`. Y hacía falta, porque lo
     * que salía sin ella no era una imprecisión sino una frase al revés: a quien acababa de
     * aceptar una oferta a la mesa se le decía EN SU PROPIA PANTALLA «se la llevó alguien»,
     * que se lee como si se le hubiera escapado. Las dirigidas ya resolvían el mismo
     * problema en segunda persona y a las abiertas les faltaba el dato para poder hacerlo.
     *
     * `se la llevó alguien` se queda como el caso de lo que no se sabe, y no es texto
     * muerto: es lo que sale de una partida guardada antes de que el campo existiera, que
     * `comoSiSiempreHubieraHabidoMazo` rellena con `null` porque `null` es lo cierto —no
     * sabemos quién fue— y no un valor de conveniencia.
     *
     * Una abierta llega a `rechazada` sólo cuando la apartan TODOS los que podían
     * contestarla (`contestar` en `riberas.ts`), y por eso ahí sí se puede decir «todos».
     *
     * Y LA CADUCADA DEJA DE DECIR «sin respuesta». Desde que la guarda del oferente cierra
     * el trato que su proponente ya no puede pagar (`contestar` en `riberas.ts`), a este
     * final se llega TAMBIÉN pulsando «Aceptar»: quien lo pulsó sí respondió, y leer que
     * caducó sin respuesta sería lo único falso de la tira. «caducó» a secas es verdad por
     * los dos caminos, y no cuenta nada del almacén ajeno, que es la otra mitad de por qué
     * ese cierre se llama así.
     */
    const laCerro = typeof crudo.acepto === 'string' ? crudo.acepto : null;
    const cerrada =
      estado === 'aceptada'
        ? abierta
          ? laCerro === null
            ? { con: 'se la llevó alguien', sin: 'aceptada' }
            : { con: laCerro === quien ? 'la aceptaste' : `la aceptó ${nombreDe(laCerro)}`, sin: 'aceptada' }
          : { con: contesto === null ? 'la aceptaste' : `la aceptó ${contesto}`, sin: 'aceptada' }
        : estado === 'rechazada'
          ? abierta
            ? { con: 'la apartaron todos', sin: 'apartada' }
            : { con: contesto === null ? 'la apartaste' : `la apartó ${contesto}`, sin: 'apartada' }
          : { con: 'caducó', sin: 'caducada' };
    cerrados.push({
      ...comun,
      frase:
        de === quien
          ? abierta
            ? `Ofreciste a la mesa ${daDicho} por ${pideDicho}`
            : `Le ofreciste a ${elOtro} ${daDicho} por ${pideDicho}`
          : abierta
            ? `${suNombre} ofreció ${daDicho} por ${pideDicho}, a la mesa`
            : para === quien
              ? `${suNombre} te ofreció ${daDicho} por ${pideDicho}`
              : `${suNombre} le ofreció a ${elOtro} ${daDicho} por ${pideDicho}`,
      comoAnda: cerrada.con,
      comoAndaSinNombre: cerrada.sin,
      aceptar: null,
      rechazar: null,
    });
  }

  if (paraContestar.length === 0 && mias.length === 0) return null;
  /*
   * LOS CERRADOS, DEL MÁS NUEVO AL MÁS VIEJO. `v.tratos` llega del más viejo al más nuevo
   * —`ultimos` recorta por delante—, que es el orden de un registro; en una lista que se
   * lee de un vistazo y que se desplaza hacia abajo, lo último que pasó es lo que se busca.
   * Las VIVAS no se dan la vuelta: allí el orden es en el que llegaron, y contestar antes la
   * primera que la segunda es lo justo.
   */
  return { paraContestar, mias, cerrados: [...cerrados].reverse() };
}

/**
 * ═══ CUÁNDO EL PREGÓN SE PLIEGA, Y POR QUÉ NO ES «EN MI TURNO» AUNQUE HOY SEA LO MISMO ═══
 *
 * JUGANDO una partida entera salió esto: el pregón es una caja OPACA colgada de la cinta, y
 * en MI turno crece con MIS propuestas vivas. Con ocho abiertas llegaba de y=159 a y≈540 de
 * un recuadro de 857 —el 44 % de arriba del tablero—, que es exactamente donde viven los
 * anillos de fundar. No crece sin fin, porque `elAltoDelPregon` lo para en el techo del asa;
 * lo que pasa es que ESE tope, en mi turno, ya es media pantalla de tablero tapada justo
 * mientras se decide dónde construir.
 *
 * Y lo que tapa es lo que NO hay que contestar. La regla, dicha por lo que significa y no por
 * de quién es el turno: EL PREGÓN SE PLIEGA CUANDO NO HAY NADA QUE CONTESTAR. Si hay una
 * propuesta esperando mi respuesta se ve entera y tapa lo que haga falta, porque para eso
 * existe (§1.10 del trueque). Si no la hay —mis propias ofertas en pie y lo ya trocado—, se
 * pliega a UNA tira y el tablero vuelve a estar entero; un toque en la tira lo despliega.
 *
 * HOY LAS DOS FRASES SIGUEN SIENDO LA MISMA, y está escrito así a propósito: sólo propone
 * quien tiene el turno, así que «nada que contestar» y «es mi turno» coinciden en cada
 * instante (el mismo razonamiento que hay unas líneas más arriba, en `elPregonEnTres`).
 *
 * ═══ Y LA MITAD DE ESE «EL DÍA QUE» YA HA LLEGADO, ASÍ QUE SE DICE ═══
 *
 * Esta cabecera decía «el día que una oferta sobreviva al turno —o que se pueda ofrecer a la
 * mesa—». Ofrecer a la mesa YA se puede, y escrita por lo que significa esto sigue haciendo
 * lo correcto sin que nadie viniera a cambiarlo, que era exactamente la apuesta: una abierta
 * de otro cae en «Para contestar», así que en SU turno el pregón no se pliega y en el mío
 * todas las vivas son mías y sí se pliega. Escrita como «en mi turno» habría dado igual hoy y
 * habría empezado a esconder propuestas que hay que contestar el día que una sobreviva al
 * turno, que es la mitad que todavía no ha llegado.
 */
export function elPregonSePliega(pregon: PregonEnTres<OpcionQueLlega> | null): boolean {
  return pregon !== null && pregon.paraContestar.length === 0;
}

/** Lo que dice la tira única del pregón plegado. Ver `elResumenDelPregon`. */
export interface ResumenDelPregon {
  /** Las vivas que se están escondiendo. Nunca cero: sin ellas no habría pregón que plegar. */
  readonly cuantas: number;
  /** Y las cerradas que van debajo, que también se esconden. */
  readonly cerradas: number;
  /**
   * EL RENGLÓN DE ARRIBA, EN DOS VERSIONES, y el de abajo igual: son los mismos dos campos
   * que lleva una tira (`comoAnda`/`comoAndaSinNombre`) para que el cliente los mida con
   * `elEstadoQueCabe`, que es la función que ya decide qué cabe con la letra de VERDAD del
   * navegador. Un tercer camino de recorte sería un tercer sitio donde se recorta distinto.
   */
  readonly dicho: string;
  readonly dichoCorto: string;
  readonly comoAnda: string;
  readonly comoAndaSinNombre: string;
  /** La frase entera: el nombre accesible de la tira, y lo que hace el toque. */
  readonly seOye: string;
}

/**
 * LO QUE DICE EL PREGÓN PLEGADO. Una tira, con las cifras de lo que esconde.
 *
 * NO DICE «tócalo para verlas» en lo que se PINTA y sí en lo que se OYE: en el lienzo de 288
 * la tira deja 81,2 puntos, que son nueve letras y media, y ahí una instrucción se come el
 * dato. Lo que se pinta son las dos cifras —cuántas mías siguen en pie y cuántas ya se
 * cerraron—, que es lo que se mira para decidir si merece la pena abrirlo; que se abre lo
 * dicen el triángulo del canto y el `aria-expanded`, que es donde un lector lo busca.
 *
 * `null` cuando no hay pregón: no hay nada que resumir y no hay tira que pintar.
 */
export function elResumenDelPregon(pregon: PregonEnTres<OpcionQueLlega> | null): ResumenDelPregon | null {
  if (pregon === null) return null;
  const cuantas = pregon.mias.length;
  const cerradas = pregon.cerrados.length;
  const tuyas = cuantas === 1 ? '1 propuesta tuya' : `${String(cuantas)} propuestas tuyas`;
  const tuyasCorto = cuantas === 1 ? '1 tuya' : `${String(cuantas)} tuyas`;
  /*
   * ═══ «CERRADAS» Y NO «TROCADAS», QUE ES LO QUE DECÍA Y ERA FALSO ═══
   *
   * Aquí ponía «y 6 ya trocadas» y el bloque que resume dice «TRUEQUES CERRADOS», que es lo
   * correcto: entre esos seis hay aceptados, apartados y caducados, y de los tres sólo el
   * primero se trocó. Con 6 cerrados de los que TRES los rechazaron, la cinta decía
   * literalmente «1 propuesta tuya | y 6 ya trocadas».
   *
   * Y la que mentía era JUSTO la que se lee: la versión corta ya decía «y N cerradas», y la
   * corta es la que sale cuando el sitio no llega. O sea que la frase falsa era la que sale
   * cuando SÍ hay hueco, que es la de casi todas las pantallas.
   *
   * Las dos dicen ahora lo mismo y siguen siendo dos porque miden distinto —`elEstadoQueCabe`
   * elige con la letra de verdad del navegador—, no porque digan cosas distintas.
   */
  const cerradasDicho = cerradas === 1 ? 'y 1 ya cerrada' : `y ${String(cerradas)} ya cerradas`;
  const cerradasCorto = cerradas === 1 ? 'y 1 cerrada' : `y ${String(cerradas)} cerradas`;
  return {
    cuantas,
    cerradas,
    dicho: tuyas,
    dichoCorto: tuyasCorto,
    comoAnda: cerradas === 0 ? 'esperando respuesta' : cerradasDicho,
    comoAndaSinNombre: cerradas === 0 ? 'esperando' : cerradasCorto,
    seOye: `El pregón, plegado: ${tuyas} en pie${cerradas === 0 ? '' : ` ${cerradasDicho}`}. Tócalo para verlas.`,
  };
}

/**
 * LAS OPCIONES QUE TAMPOCO PINTAN LOS BOTONES: se caen ACEPTAR y RECHAZAR, y sólo si el
 * pregón está pintado.
 *
 * El mismo patrón que `opcionesFueraDeLaBarra` con el mazo y `opcionesFueraDeLaMesa` con los
 * dados, y por el mismo par de fallos. Con pregón y botones a la vez, la misma pantalla
 * ofrece contestar DOS VECES y se rompe la regla de la casa —cada movimiento se enseña
 * exactamente una vez— que los comprobadores cuentan con los dedos. Y el fallo contrario es
 * el mudo: donde NO hay pregón —un mirón, el respaldo del retablo, una pantalla que todavía
 * no lo pinte— quitar los botones deja una propuesta que no se puede contestar en toda la
 * tarde, sin un error en ninguna parte.
 *
 * Por eso recibe EL PREGÓN y no un interruptor: los botones desaparecen exactamente cuando
 * las tiras existen, porque son el mismo dato. Y el pregón se compone ANTES, con las opciones
 * ENTERAS: al revés se quedaría sin los dos botones que cuelga de cada tira.
 */
export function opcionesFueraDelPregon<O extends OpcionQueLlega>(
  opciones: readonly O[],
  pregon: PregonEnTres<O> | null,
): O[] {
  return pregon === null
    ? [...opciones]
    : opciones.filter((o) => o.tipo !== ACEPTAR && o.tipo !== RECHAZAR);
}

/**
 * ═══ Y LAS ACCIONES DEL TABLERO TAMPOCO CONTESTAN, CUANDO EL PREGÓN ESTÁ PINTADO ═══
 *
 * Ésta es la TERCERA puerta por la que ACEPTAR y RECHAZAR llegan a una pantalla, y la que
 * el retablo usa: `tableroDeRiberas` copia a `acciones` toda opción que no tenga sitio en
 * el mapa, contestar incluido, y `AccionesDelTablero` las pinta como botones de un toque.
 * En una mesa de CINCO o de SEIS ésa era la única manera de aceptar un trueque, o sea que
 * ahí no existía la confirmación que Miguel pidió: un dedo, y trocado.
 *
 * Devuelve el tablero ENTERO y no la lista de acciones porque es lo que el mueble recibe, y
 * porque así el filtro se lee de un vistazo en el sitio donde se pinta. Sin pregón devuelve
 * el MISMO objeto, no una copia: sin tiras que pulsar, quitar los botones dejaría una
 * propuesta que no se puede contestar en toda la tarde — el mismo fallo mudo contra el que
 * está escrita `opcionesFueraDelPregon`, y por eso las dos reciben el pregón y no un
 * interruptor.
 *
 * NO TOCA `retablo.tsx` NI `tablero-declarado.ts`: el mueble genérico no aprende qué es un
 * trueque, y `AccionDeTablero` no gana ningún campo. Lo que llega ahí es un tablero al que
 * ya se le quitaron dos acciones, que es exactamente lo que `opcionesFueraDeLaMesa` le hace
 * a los dados.
 */
export function accionesFueraDelPregon(
  tablero: TableroDeclarado,
  pregon: PregonEnTres<OpcionQueLlega> | null,
): TableroDeclarado {
  if (pregon === null) return tablero;
  return {
    ...tablero,
    acciones: tablero.acciones.filter((a) => a.toque.tipo !== ACEPTAR && a.toque.tipo !== RECHAZAR),
  };
}

/** El panel de trueques que declara `panelesDe`, por su título. */
export const PANEL_DE_TRUEQUES = 'Trueques';

/**
 * Y EL PANEL «Trueques» DEL CAJÓN SE RETIRA CUANDO EL PREGÓN LO HEREDA.
 *
 * Ese panel es un renglón de texto por trato —«t3: Ana da junco por limo a Bruno —
 * propuesta»— y dice exactamente lo que el pregón pinta en tiras. Con los dos puestos, la
 * misma pantalla cuenta lo mismo dos veces con dos redacciones distintas, y la que se
 * quedaría atrás el día que una cambie es la que vive dentro de un cajón que hay que abrir.
 *
 * Se compone con `panelesEnTres` y el orden da igual: las dos son criba. Y recibe el pregón y
 * no un `boolean` por lo mismo que la función de arriba: cuando no hay pregón el panel se
 * QUEDA, porque entonces es el único sitio donde vive lo que ya se trocó.
 */
export function panelesFueraDelPregon(
  paneles: readonly PanelDeTablero[],
  pregon: PregonEnTres<OpcionQueLlega> | null,
): PanelDeTablero[] {
  return pregon === null ? [...paneles] : paneles.filter((p) => p.titulo !== PANEL_DE_TRUEQUES);
}

// ---------------------------------------------------------------------------
// EL COMPONEDOR: cómo se monta una oferta de varios bienes con el dedo
// ---------------------------------------------------------------------------

/** Los dos lados de un trueque, y cuál se está tocando en el componedor. */
export type LadoDelTrueque = 'doy' | 'pido';

/**
 * LO QUE SE LLEVA PUESTO EN EL COMPONEDOR, y es lo ÚNICO que la pantalla guarda.
 *
 * Ni el tope, ni cuántas fichas tengo, ni si el «+» se puede pulsar, ni la carga que se
 * manda: todo eso se deriva de aquí más la vista en `elComponedor`, y por eso los dos
 * clientes pueden guardar esto tal cual en un `useState` y no saber ninguna regla.
 *
 * `para` en `null` es A LA MESA, igual que en `Trato.para` y en `TruequePosible.para`: es
 * el destino por omisión porque es el que siempre cabe —la puerta declara `mesa: true`— y
 * porque una oferta abierta la puede contestar cualquiera, que es lo que Miguel pidió.
 */
export interface LoQueSeCompone {
  readonly lado: LadoDelTrueque;
  /** Cuántas fichas de cada bien van en cada lado. Sin entrada es cero. */
  readonly doy: Readonly<Record<string, number>>;
  readonly pido: Readonly<Record<string, number>>;
  readonly para: AsientoId | null;
}

/** El componedor recién abierto: nada puesto, mirando lo que doy, y a la mesa. */
export const NADA_COMPUESTO: LoQueSeCompone = { lado: 'doy', doy: {}, pido: {}, para: null };

/**
 * UN RENGLÓN DEL COMPONEDOR: un bien, lo que llevo puesto de él y lo que puedo hacerle.
 *
 * ═══ `mas` Y `menos` SON EL ESTADO SIGUIENTE, Y NO UN `boolean` ═══
 *
 * Devolver «se puede subir: sí/no» dejaría al cliente sumar el uno, y sumar el uno es la
 * regla: cuántas caben, cuál se cae del otro lado, qué pasa al llegar al tope. Con dos
 * clientes eso son dos aritméticas que un día dicen cosas distintas, y la que se rompe es
 * la del aparato que nadie abre para mirar. Aquí sale el estado ENTERO que hay que
 * guardar, o `null` cuando no se puede: el botón se apaga exactamente cuando esto es
 * `null`, y lo que hace al pulsarlo es guardar lo que hay dentro.
 */
export interface RenglonDelComponedor {
  readonly bien: string;
  /** Cuántas fichas de este bien llevo puestas en el lado que se está pintando. */
  readonly cuantas: number;
  /** Y cuántas tengo en la mano. En el lado de PEDIR es lo que ya tengo, que se puede pedir. */
  readonly tengo: number;
  /** El estado que deja pulsar «+» o «−», o `null` cuando el botón va apagado. */
  readonly mas: LoQueSeCompone | null;
  readonly menos: LoQueSeCompone | null;
  /** Por qué el «+» va apagado. Vacío cuando se puede. Lo pinta la ayuda del botón. */
  readonly porQueNoMas: string;
  /** Lo que se oye de cada botón, escrito una vez para los dos clientes. */
  readonly seOyeMas: string;
  readonly seOyeMenos: string;
  /** Y el renglón entero, para el lector: «3 sales, y tienes 3». */
  readonly seOye: string;
}

/** A quién se le puede proponer, tal como se pinta el renglón del destino. */
export interface DestinoDelComponedor {
  readonly para: AsientoId | null;
  readonly nombre: string;
  readonly elegido: boolean;
  /** El estado que deja elegirlo. Nunca `null`: un destino que no cabe no se pinta. */
  readonly elegir: LoQueSeCompone;
}

/** El componedor entero, listo para pintar. Ver `elComponedor`. */
export interface ElComponedor {
  /** Qué lado se está tocando, y los dos estados del conmutador. */
  readonly lado: LadoDelTrueque;
  readonly verLoQueDoy: LoQueSeCompone;
  readonly verLoQuePido: LoQueSeCompone;
  /** Los renglones del lado que se pinta, y las dos listas enteras para quien las quiera. */
  readonly renglones: readonly RenglonDelComponedor[];
  readonly destinos: readonly DestinoDelComponedor[];
  /** El rótulo y la ayuda que escribió el JUEGO en la puerta. Aquí no se redactan. */
  readonly rotulo: string;
  readonly ayuda: string;
  /** El tope por lado que declara la puerta, para el renglón de la cuenta. */
  readonly tope: number;
  /** «Das 3 sales y pides 2 juncos, a la mesa». Lo que se lee antes de pulsar. */
  readonly resumen: string;
  /** El movimiento que se manda, o `null` cuando todavía no hay uno que mandar. */
  readonly movimiento: { readonly tipo: string; readonly carga: unknown } | null;
  /** Por qué no se puede proponer todavía. Vacío cuando `movimiento` no es `null`. */
  readonly porQueNo: string;
  /**
   * ═══ Y SI LAS CUATRO VIVAS ESTÁN PUESTAS, QUE NO ES LO MISMO QUE «NO HAY MOVIMIENTO» ═══
   *
   * `movimiento === null` lo produce cualquiera de las cinco cosas que faltan —un lado
   * vacío, el destino sin elegir, o el tope de vivas—, y las cuatro primeras se arreglan
   * pulsando dentro del componedor. Ésta no: con cuatro propuestas en la mesa no hay nada
   * que montar hasta que se contesten o pase el turno, y por eso es lo único que apaga el
   * botón que ABRE, y no sólo el que manda.
   *
   * Se saca aquí y no se cuenta en cada pantalla porque son dos clientes: el escritorio
   * apaga el cuadrado de la cinta y la app apagará el suyo, y con la comparación escrita
   * dos veces la que se queda atrás es la del aparato que nadie abre para mirar. La frase
   * que lo explica es `porQueNo`, que en este caso es la ayuda que escribió el juego.
   */
  readonly noCabenMas: boolean;
}

/** Cuántas fichas de cada bien tengo, por su nombre. Se cuenta la mano que se pinta. */
function loQueTengo(vista: unknown): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const carta of manoEnTres(vista)) cuenta.set(carta.bien, (cuenta.get(carta.bien) ?? 0) + 1);
  return cuenta;
}

/** Las fichas de un lado, expandidas y EN EL ORDEN DE `BIENES`, que es el del reductor. */
function fichasDelLado(lado: Readonly<Record<string, number>>): string[] {
  const fichas: string[] = [];
  for (const bien of BIENES) {
    const cuantas = lado[bien] ?? 0;
    for (let i = 0; i < cuantas; i += 1) fichas.push(bien);
  }
  return fichas;
}

/** Lo mismo con un bien cambiado de cuenta; a cero se BORRA, para que la carga no lleve ceros. */
function conElBien(
  lado: Readonly<Record<string, number>>,
  bien: string,
  cuantas: number,
): Readonly<Record<string, number>> {
  const nuevo: Record<string, number> = { ...lado };
  if (cuantas <= 0) delete nuevo[bien];
  else nuevo[bien] = cuantas;
  return nuevo;
}

/**
 * CUÁNTAS PROPUESTAS MÍAS SIGUEN EN PIE. Es dato público: `v.tratos` va entero en la
 * vista de todos, con `de` y `estado` dentro.
 *
 * Se cuenta aquí y no se lee de la puerta porque la puerta declara la FORMA que el
 * portillo admite —tope por lado, a quién, y si vale a la mesa— y esa forma no cambia
 * porque yo tenga cuatro en la mesa; lo dice su propia cabecera en `opcionesDeTrueque`.
 * Lo que sí cambia es su AYUDA, y ésa es la frase que el componedor pinta cuando el tope
 * está puesto: la redacta el juego y aquí no se reescribe.
 */
export function misPropuestasVivas(vista: unknown, quien: AsientoId | null): number {
  if (!esVistaQueSePinta(vista) || quien === null) return 0;
  const tratos = vista.tratos;
  if (!Array.isArray(tratos)) return 0;
  return tratos.filter((t) => t.estado === 'propuesta' && t.de === quien).length;
}

/**
 * ═══ EL COMPONEDOR: LA ÚNICA MANERA DE MONTAR UN TRUEQUE DE VARIOS BIENES ═══
 *
 * La combinatoria del trueque paramétrico no cabe en una lista de botones —con el tope de
 * tres y cinco rivales son 5.000 opciones y 1.141,9 kB por cada lectura de la mesa—, así
 * que el juego no la enumera: declara la PUERTA, y quien quiera un trueque gordo lo monta.
 * Esto es lo que lo monta, y vive aquí y no en cada pantalla por lo mismo que el pregón: el
 * escritorio y la app tendrían dos aritméticas del tope, y la que se rompe es la del
 * aparato que nadie abre.
 *
 * `null` cuando no hay puerta —no es mi turno, no he tirado, me falta la vereda de la
 * carta, nadie tiene bienes o yo no tengo ninguno—, y entonces no se pinta ni el botón: es
 * la misma decisión que `puertaDelTrueque`, tomada una sola vez.
 *
 * ═══ LAS CUATRO REGLAS QUE SE PINTAN, Y DE DÓNDE SALE CADA UNA ═══
 *
 *   · EL TOPE POR LADO lo declara la puerta (`tope`), no está escrito aquí. Con las tres
 *     fichas puestas, el «+» de los cinco renglones se apaga con su porqué.
 *   · LO QUE TENGO acota el lado de DAR, y sólo ése: pedir tres sales teniendo una es
 *     legal y es justo lo que Miguel pidió. Es la regla que `ofrecer` comprueba con
 *     `llegaPara`, y apagarla aquí es lo que evita mandar un movimiento que la mesa
 *     rechazaría.
 *   · NINGÚN BIEN EN LOS DOS LADOS es la regla 2 de `cabeEnLaPuerta`. Se pinta de dos
 *     maneras: el lado de PEDIR no ofrece renglón de lo que estoy dando, y en el lado de
 *     DAR el «+» de lo que estoy pidiendo va apagado DICIENDO por qué. Lo segundo es a
 *     propósito: quitar el renglón le borraría a alguien de la pantalla una ficha que
 *     acababa de poner en el otro lado, sin decirle que la regla existe.
 *   · Y LAS CUATRO VIVAS apagan «Proponer» con la ayuda que escribe el juego. Es el mismo
 *     tope que `ofrecer` comprueba; aquí sólo se cuenta lo que ya está en la vista.
 *
 * Lo que NO se comprueba aquí es lo que decide el estado y no la vista —que el otro tenga
 * con qué pagar, que no me haya adelantado nadie—: eso lo dice el reductor y lo contesta
 * con motivo. Un componedor que lo adivinara estaría decidiendo con datos que no tiene.
 */
export function elComponedor<O extends OpcionQueLlega>(
  vista: unknown,
  quien: AsientoId | null,
  opciones: readonly O[],
  puesto: LoQueSeCompone,
): ElComponedor | null {
  const puerta = puertaDelTrueque(opciones);
  if (puerta === null || !esVistaQueSePinta(vista)) return null;

  const tengo = loQueTengo(vista);
  const enDoy = fichasDelLado(puesto.doy);
  const enPido = fichasDelLado(puesto.pido);

  const renglonesDe = (lado: LadoDelTrueque): RenglonDelComponedor[] => {
    const esDar = lado === 'doy';
    const mio = esDar ? puesto.doy : puesto.pido;
    const puestas = esDar ? enDoy.length : enPido.length;
    const renglones: RenglonDelComponedor[] = [];
    for (const bien of BIENES) {
      const cuantasTengo = tengo.get(bien) ?? 0;
      /* En el lado de DAR sólo salen los bienes que tengo: no se puede ofrecer lo que no está. */
      if (esDar && cuantasTengo === 0) continue;
      /* Y en el de PEDIR no sale lo que estoy dando, que es la regla 2 de `cabeEnLaPuerta`. */
      if (!esDar && (puesto.doy[bien] ?? 0) > 0) continue;
      const cuantas = mio[bien] ?? 0;
      const enElOtroLado = esDar ? (puesto.pido[bien] ?? 0) > 0 : false;
      const porQueNoMas = enElOtroLado
        ? 'Ya lo estás pidiendo: un bien no puede estar en los dos lados.'
        : puestas >= puerta.tope
          ? `Ya llevas ${String(puerta.tope)} fichas de este lado, que es el máximo.`
          : esDar && cuantas >= cuantasTengo
            ? `Sólo tienes ${enPalabras(new Array<string>(cuantasTengo).fill(bien))}.`
            : '';
      const sube: LoQueSeCompone | null =
        porQueNoMas === ''
          ? esDar
            ? { ...puesto, doy: conElBien(puesto.doy, bien, cuantas + 1) }
            : { ...puesto, pido: conElBien(puesto.pido, bien, cuantas + 1) }
          : null;
      const baja: LoQueSeCompone | null =
        cuantas === 0
          ? null
          : esDar
            ? { ...puesto, doy: conElBien(puesto.doy, bien, cuantas - 1) }
            : { ...puesto, pido: conElBien(puesto.pido, bien, cuantas - 1) };
      const unaMas = `${esDar ? 'Dar' : 'Pedir'} un ${bien} más`;
      const unaMenos = `${esDar ? 'Dar' : 'Pedir'} un ${bien} menos`;
      renglones.push({
        bien,
        cuantas,
        tengo: cuantasTengo,
        mas: sube,
        menos: baja,
        porQueNoMas,
        seOyeMas: porQueNoMas === '' ? unaMas : `${unaMas}. ${porQueNoMas}`,
        seOyeMenos: unaMenos,
        seOye: `${cuantas === 0 ? `Ningún ${bien}` : enPalabras(new Array<string>(cuantas).fill(bien))}, y tienes ${String(cuantasTengo)}`,
      });
    }
    return renglones;
  };

  /*
   * LOS DESTINOS SALEN DE LA PUERTA Y NO DE LA LISTA DE COLONOS: la puerta ya se dejó
   * fuera a quien no tiene un solo bien, con el mismo `continue` con el que el juego no
   * ofrece trocar con quien no tiene nada. Componer la lista aquí sería escribir esa regla
   * por segunda vez, y la copia se quedaría atrás.
   */
  const destinos: DestinoDelComponedor[] = [];
  if (puerta.mesa) {
    destinos.push({
      para: null,
      nombre: A_LA_MESA,
      elegido: puesto.para === null,
      elegir: { ...puesto, para: null },
    });
  }
  for (const asiento of puerta.a) {
    destinos.push({
      para: asiento,
      nombre: vista.colonos.find((c) => c.asiento === asiento)?.nombre ?? asiento,
      elegido: puesto.para === asiento,
      elegir: { ...puesto, para: asiento },
    });
  }

  const destinoPuesto = destinos.find((d) => d.elegido) ?? null;
  const vivas = misPropuestasVivas(vista, quien);
  const conElTopePuesto = vivas >= PROPUESTAS_VIVAS_A_LA_VEZ;
  const porQueNo = conElTopePuesto
    ? /* La frase la escribe el juego en la puerta, y aquí no se reescribe: ver la cabecera. */
      puerta.ayuda
    : enDoy.length === 0 && enPido.length === 0
      ? 'Pon lo que das y lo que pides.'
      : enDoy.length === 0
        ? 'Pon al menos una ficha en lo que das.'
        : enPido.length === 0
          ? 'Pon al menos una ficha en lo que pides.'
          : destinoPuesto === null
            ? 'Elige a quién se lo propones.'
            : '';
  const aQuien = destinoPuesto === null ? A_LA_MESA : destinoPuesto.nombre;
  return {
    lado: puesto.lado,
    verLoQueDoy: { ...puesto, lado: 'doy' },
    verLoQuePido: { ...puesto, lado: 'pido' },
    renglones: renglonesDe(puesto.lado),
    destinos,
    rotulo: puerta.rotulo,
    ayuda: puerta.ayuda,
    tope: puerta.tope,
    resumen: `Das ${enPalabras(enDoy)} y pides ${enPalabras(enPido)}, a ${aQuien}.`,
    movimiento:
      porQueNo === ''
        ? { tipo: OFRECER, carga: { para: puesto.para, da: enDoy, pide: enPido } }
        : null,
    porQueNo,
    noCabenMas: conElTopePuesto,
  };
}
