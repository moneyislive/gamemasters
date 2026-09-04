/**
 * LO QUE EL TABLERO EN TRES DIMENSIONES TIENE QUE MARCAR, SEGÚN LAS REGLAS DE RIBERAS.
 *
 * ═══ QUÉ PROBLEMA RESUELVE, QUE SE VEÍA EN PANTALLA ═══
 *
 * Al arrastrar cualquier modelo —casa, castillo o puente— el tablero marcaba lo mismo:
 * todos los vértices libres. Para la casa colaba; para lo demás era mentira. El castillo
 * ofrecía plantarse en mitad del campo cuando sólo puede subir sobre un poblado PROPIO, y
 * la casa se ofrecía pegada a otra casa cuando tiene que haber dos aristas de por medio y
 * un camino propio que llegue.
 *
 * Y la escena no tenía la culpa. `escenas/sitios.ts` dice por escrito que la legalidad
 * llega de fuera y que la escena no opina; hacía exactamente eso, pintar la lista que le
 * daban. Quien inventaba reglas era el banco de pruebas.
 *
 * ═══ NO HAY NI UNA REGLA NUEVA AQUÍ, Y ES EL PUNTO ═══
 *
 * Las tres reglas que faltaban ya estaban escritas y probadas en `riberas.ts`:
 *
 *   · la distancia — `libreYSeparado` mira el vértice y sus tres vecinos, y mira las
 *     piezas de CUALQUIERA, no sólo las propias;
 *   · el camino propio — `cuelgaDeUnaVereda`, y sólo fuera de la colocación inicial,
 *     que es cuando el catán tampoco lo exige;
 *   · la ciudad sobre poblado propio — las opciones de torre no recorren el tablero:
 *     recorren `mio.chozas`, así que no pueden salir de ahí.
 *
 * Este fichero no las reescribe: llama a `opcionesDeRiberas` —la MISMA lista que el
 * reductor exige por su portillo antes de aceptar nada— y la reparte por piezas. Si
 * alguna regla cambia, cambia en un sitio y esto la sigue sin enterarse.
 *
 * Reescribirlas aquí habría sido rapidísimo y habría creado la peor clase de fallo: dos
 * jueces que casi siempre coinciden. El día que discrepen, el tablero ofrece algo que el
 * servidor rechaza, y el jugador ve un anillo verde que no hace nada.
 *
 * ═══ POR QUÉ VIVE EN `shared/` Y NO EN `escenas/` ═══
 *
 * Porque `escenas/` no puede saber que existe el catán. Hoy sólo importa geometría
 * —`shared/mecanicas/malla-hexagonal`— y ni una regla; el día que importara `riberas.ts`,
 * la escena tendría opinión sobre lo legal y podría discrepar del servidor. Aquí la
 * frontera se mantiene: esto habla de Riberas por un lado y devuelve llaves y cadenas por
 * el otro, y quien las junta es el cliente.
 */
import type { LlaveDeArista, LlaveDeVertice } from '../../mecanicas/malla-hexagonal';
import { claseDeLlave } from '../../mecanicas/malla-hexagonal';
import type { Opcion } from '../opciones';
import { ALZAR, FUNDAR, opcionesDeRiberas } from './riberas';

/**
 * QUÉ SE PUEDE LEVANTAR. Son las tres piezas de Riberas, dichas con sus nombres.
 *
 * No se traducen a «casa / castillo / puente»: esos son los nombres del MODELO, y viven
 * en la barra del cliente. Mezclar el vocabulario de las reglas con el del arte es cómo
 * se acaba con una regla que depende de qué `.glb` esté cargado.
 */
export type PiezaDeObra = 'choza' | 'torre' | 'vereda';

export const PIEZAS_DE_OBRA: readonly PiezaDeObra[] = ['choza', 'torre', 'vereda'];

/**
 * UN SITIO DONDE SE PUEDE CONSTRUIR, con el movimiento que hay que mandar ya montado.
 *
 * ═══ POR QUÉ VIAJA EL MOVIMIENTO Y NO SÓLO LA LLAVE ═══
 *
 * Porque si sólo viajara la llave, quien recibe el clic tendría que volver a montar el
 * movimiento —`{ tipo: ALZAR, carga: { que: 'torre', donde } }`— y entonces la forma del
 * movimiento estaría escrita en DOS sitios: aquí, al ofrecerlo, y allí, al mandarlo. Es
 * la misma duplicación que ya causó que el banco construyera un poblado agarrases lo que
 * agarrases: el sitio que montaba el movimiento no miraba la pieza.
 *
 * Viajando entero, el cliente no monta nada: recoge y manda. No puede equivocarse de
 * pieza porque no elige la pieza.
 */
export interface SitioDeObra {
  /** La llave del vértice o de la arista. Su prefijo dice cuál de las dos es. */
  llave: string;
  /** Lo que hay que mandar al reductor si se suelta aquí. Ya montado, tal cual. */
  movimiento: { tipo: string; carga: Record<string, unknown> };
}

/** Lo que se puede construir con esta pieza ahora mismo, y dónde. */
export interface ObraPosible {
  pieza: PiezaDeObra;
  /** Deducida de las llaves, nunca escrita a mano. `null` si no hay ni un sitio. */
  clase: 'vertice' | 'arista' | null;
  sitios: readonly SitioDeObra[];
}

/**
 * DE QUÉ PIEZA HABLA ESTA OPCIÓN, si es que habla de construir.
 *
 * Se mira el TIPO y la CARGA, nunca el `id`. El `id` es texto para las listas —
 * `fundar:v:...`, `torre:v:...`— y cambiarlo es una decisión de presentación que nadie
 * espera que rompa nada. Colgar de él la interpretación de un movimiento sería atar las
 * reglas a un rótulo.
 */
function piezaDeLaOpcion(opcion: Opcion): { pieza: PiezaDeObra; llave: string } | null {
  const carga = opcion.carga as Record<string, unknown>;
  if (opcion.tipo === FUNDAR) {
    const vertice = carga['vertice'];
    return typeof vertice === 'string' ? { pieza: 'choza', llave: vertice } : null;
  }
  if (opcion.tipo === ALZAR) {
    const que = carga['que'];
    const donde = carga['donde'];
    if (typeof donde !== 'string') return null;
    if (que === 'torre') return { pieza: 'torre', llave: donde };
    if (que === 'vereda') return { pieza: 'vereda', llave: donde };
  }
  return null;
}

/**
 * DÓNDE PUEDE ESTE ASIENTO LEVANTAR ESTA PIEZA, ahora mismo.
 *
 * Sale vacío muy a menudo y eso es correcto, no un fallo: no es tu turno, no has tirado,
 * no te llegan los bienes, se te acabaron las piezas, o —el caso que más se ve— estás en
 * la colocación inicial, donde la torre no existe todavía. Una lista vacía es la respuesta
 * honrada a «aquí no puedes poner esto», y es lo que apaga la pieza en la barra.
 */
export function obraPosible(vista: unknown, quien: string, pieza: PiezaDeObra): ObraPosible {
  const sitios: SitioDeObra[] = [];
  for (const opcion of opcionesDeRiberas(vista, quien)) {
    const cual = piezaDeLaOpcion(opcion);
    if (cual === null || cual.pieza !== pieza) continue;
    sitios.push({
      llave: cual.llave,
      movimiento: { tipo: opcion.tipo, carga: opcion.carga as Record<string, unknown> },
    });
  }
  /*
   * LA CLASE SALE DE LAS LLAVES, y se exige que TODAS digan lo mismo.
   *
   * Una lista con un vértice y una arista dentro no es una lista con dos clases: es un
   * fallo, y devolver la clase de la primera llave lo escondería. Aquí no puede pasar
   * —cada pieza sale de un solo tipo de opción— y por eso mismo esto es barato: es la
   * afirmación de que sigue sin poder pasar.
   */
  const clases = new Set(sitios.map((s) => claseDeLlave(s.llave)));
  const clase = clases.size === 1 ? ([...clases][0] ?? null) : null;
  return { pieza, clase, sitios };
}

/** Todo lo que se puede levantar ahora, pieza por pieza. Para pintar la barra entera. */
export function obrasPosibles(vista: unknown, quien: string): readonly ObraPosible[] {
  return PIEZAS_DE_OBRA.map((p) => obraPosible(vista, quien, p));
}

/**
 * UNA VISTA DE MENTIRA PARA PROBAR EL TABLERO, con las reglas de verdad.
 *
 * ═══ POR QUÉ ESTO NO ES HACER TRAMPA ═══
 *
 * Porque lo que se finge es el ESTADO —qué hay construido, de quién, cuántos bienes
 * tengo—, no las REGLAS. La vista que sale de aquí tiene la misma forma que la que manda
 * el servidor, y quien la interroga es `opcionesDeRiberas`, la de verdad. Un banco de
 * pruebas que fingiera las reglas no probaría nada: es justo lo que hacía antes.
 *
 * El almacén se llena a propósito. En el banco interesa ver DÓNDE se puede construir, no
 * si llegan los bienes; con el almacén vacío todas las listas saldrían vacías y no se
 * podría mirar nada. Y es una mentira que no cambia lo que se mira: el coste no mueve un
 * anillo de sitio, sólo apaga la pieza entera.
 */
export interface ColonoDePrueba {
  asiento: string;
  color: string;
  chozas: readonly LlaveDeVertice[];
  torres: readonly LlaveDeVertice[];
  veredas: readonly LlaveDeArista[];
}

export function vistaDePrueba(
  hexes: readonly { q: number; r: number }[],
  colonos: readonly ColonoDePrueba[],
  quien: string,
): unknown {
  return {
    desde: 'riberas',
    momento: 'jugando',
    colonos: colonos.map((c) => ({
      asiento: c.asiento,
      nombre: c.asiento,
      color: c.color,
      bienes: 20,
      chozas: [...c.chozas],
      torres: [...c.torres],
      veredas: [...c.veredas],
      puntos: 0,
      vado: 0,
    })),
    /*
     * El terreno y el número no entran en ninguna regla de construcción: las opciones
     * sólo leen `islas.map(i => i.hex)` para saber qué vértices y qué aristas existen.
     * Se rellenan con algo válido para que la vista tenga la forma que declara su tipo.
     */
    islas: hexes.map((h) => ({ hex: { q: h.q, r: h.r }, terreno: 'vega', numero: 6 })),
    turnoDe: quien,
    paso: 0,
    faltaVereda: false,
    ultimaChoza: null,
    tirado: true,
    ultimaTirada: 6,
    tratos: [],
    misFichas: fichasDeSobra(),
    ganadores: [],
  };
}

/** Un almacén con de todo y de sobra, para que el coste no tape lo que se quiere mirar. */
function fichasDeSobra(): string[] {
  const fichas: string[] = [];
  /*
   * El bien va DESPUÉS de los dos puntos, que es como `bienDeLaFicha` lo lee. Escrito al
   * revés la ficha no es de ningún bien y el almacén sale vacío sin decirlo: todas las
   * listas saldrían vacías y parecería que las reglas no dejan construir nada.
   */
  for (const bien of ['limo', 'junco', 'sal', 'piedra', 'grano']) {
    for (let i = 0; i < 8; i++) fichas.push(`p${String(i)}:${bien}`);
  }
  return fichas;
}
