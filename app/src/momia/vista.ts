/**
 * Lo que la app de la Momia espera encontrar en `VistaJugador.estadoDelJuego`.
 *
 * ═══ POR QUÉ ESTE FICHERO EXISTE ═══
 *
 * `estadoDelJuego` está declarado `unknown` en el contrato, y tiene que estarlo:
 * el motor transporta el estado de un juego que no conoce, y si el tipo fuese
 * concreto el contrato general volvería a saber de qué se juega. Pero `unknown`
 * no se puede pintar. Alguien tiene que decir qué forma tiene, y ese alguien es
 * el juego, por sus dos extremos: el servidor al proyectarlo y la app al leerlo.
 *
 * Aquí está el extremo de la app. Es DERIVADO de `EstadoMomia`
 * (`shared/juegos/momia-tipos.ts`), que es el contrato de verdad: esto es
 * «`EstadoMomia` menos lo que esta persona no puede ver», y nada más.
 *
 * ═══ LO QUE NUNCA PUEDE LLEGAR AQUÍ ═══
 *
 * Es la regla de oro del diseño (§5) y se nota en la forma de los tipos, no en
 * un comentario que pida buena fe:
 *
 *   · `ordenVerdadero` no aparece. Ni entero ni a trozos.
 *   · `FragmentoVisible` NO TIENE el campo `falso`. No es que se ignore: es que
 *     no está en el tipo, así que una pantalla no puede leerlo ni por error, y
 *     el día que el servidor lo mandara de más seguiría sin poder pintarse.
 *     Ese campo es el juego entero: quien lo vea gana sin jugar.
 *   · Los fragmentos de OTRAS personas no llegan; solo los tuyos y los públicos.
 *
 * ═══ POR QUÉ SE LEE A LA DEFENSIVA ═══
 *
 * `leerEstadoMomia` comprueba todo y devuelve `null` a la primera duda, en vez
 * de confiar en un `as`. Dos motivos, y el segundo es el que manda:
 *
 *  1. Un móvil puede tener una versión de la app más vieja que el servidor. Un
 *     campo que aún no existe tiene que dar una pantalla incompleta, no una
 *     pantalla en blanco a mitad de partida.
 *  2. Esto se escribió ANTES que la proyección del servidor, en paralelo. Si las
 *     dos mitades no encajan del todo el primer día, quiero verlo como «faltan
 *     datos» en una pantalla que sigue en pie, y no como un fallo de JavaScript
 *     que se lleva por delante la app de doce personas durante una cena.
 */
import type { DonId, Restriccion, RitoId } from '../../../shared/juegos';

/**
 * Un fragmento de papiro tal y como puede verlo quien juega.
 *
 * Gemelo de `Fragmento` de `shared/`, menos `falso`. Ver arriba por qué esa
 * ausencia es la pieza más importante del fichero.
 */
export interface FragmentoVisible {
  id: string;
  /**
   * La restricción, en datos.
   *
   * SÍ VIAJA, y conviene decir por qué no es una fuga: `texto` ya dice
   * exactamente lo mismo en prosa —«el Rito del Agua precede al del Aliento»— y
   * es lo que se lee en voz alta en la mesa. Lo que no puede viajar es si la
   * frase es CIERTA, no lo que la frase dice. Y en datos la app puede tachar
   * casillas, que es la ayuda para razonar que pedía el diseño.
   */
  restriccion: Restriccion;
  /** La frase de papiro, ya redactada. */
  texto: string;
  /** ¿Está sobre la mesa o solo lo tienes tú? */
  publico: boolean;
  /** Quién lo puso sobre la mesa. Vacío si salió al cerrarse una vigilia. */
  publicadoPor?: string;
  /** El nombre de quien lo publicó, ya resuelto: la app no busca en listas. */
  publicadoPorNombre?: string;
}

/** Un rito, con su nombre ya resuelto. */
export interface RitoVisible {
  id: RitoId;
  nombre: string;
  descripcion?: string;
}

/** Lo que se sabe de otra persona de la expedición: solo lo público. */
export interface GenteVisible {
  suspectId: string;
  marcas: number;
  amuletos: number;
  tocado: boolean;
}

/** Lo tuyo, que nadie más ve. */
export interface MiEstadoMomia {
  marcas: number;
  amuletos: number;
  tocado: boolean;
  /**
   * Tu don.
   *
   * Puede valer `falsificar`, y es correcto: el saqueador tiene que poder usar
   * el suyo. Lo que el diseño prohíbe es que el don de OTRA persona viaje, y por
   * eso `GenteVisible` no lo lleva.
   */
  don: DonId;
  /** En qué vigilia lo usaste por última vez. */
  donUsadoEnRonda?: number;
  /** Los que tienes en la mano. Siempre ciertos: los falsos no se reparten. */
  fragmentos: FragmentoVisible[];
  /**
   * Las mentiras que la casa tiene preparadas, para elegir una.
   *
   * SOLO LLEGA A QUIEN TIENE EL DON `falsificar`, o sea al saqueador, y de ahí
   * que sea opcional: para todos los demás no existe, y por tanto tampoco existe
   * la forma de saber cuántas hay ni cómo suenan.
   *
   * Vienen escritas de antemano y no se fabrican al vuelo (`TramaMomia.
   * falsasCandidatas`), porque una frase improvisada tendría otro tono que las
   * demás y una pista que suena distinta se delata sola.
   */
  falsasOfrecidas?: Array<{ id: string; texto: string }>;
}

/** El estado de la Momia, filtrado para una persona concreta. */
export interface EstadoMomiaVisible {
  yo: MiEstadoMomia;
  /** Los cinco ritos, en el orden en que se declararon. NO en el correcto. */
  ritos: RitoVisible[];
  /** Los fragmentos que están sobre la mesa. Alguno puede ser falso. */
  publicos: FragmentoVisible[];
  /** Qué cámara se profana ESTA vigilia. Es público: se anuncia en el presagio. */
  profanada?: string;
  /**
   * Qué cámara se profanará la siguiente.
   *
   * Solo llega a quien tiene el don `sobornar` y lo ha usado. Para todos los
   * demás viene vacío, que es lo que hace que el don valga algo.
   */
  profanadaSiguiente?: string;
  /** Marcas y amuletos de cada cual: la cuenta de la maldición es pública. */
  gente: GenteVisible[];
  /** Lo que has propuesto, si ya lo has hecho. No se puede cambiar. */
  miPropuesta?: { orden: RitoId[]; at: string };
  /** Cuántas propuestas se han entregado ya. Ni de quién ni cuáles. */
  propuestasEntregadas: number;
  /** El resultado, cuando la tumba ya se ha sellado (o no). */
  sellado?: { ordenEjecutado: RitoId[]; correcto: boolean; at: string };
}

// ---------------------------------------------------------------------------
// La lectura
// ---------------------------------------------------------------------------

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const cadena = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const entero = (v: unknown, sino = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : sino);

/**
 * ¿Es esto una restricción de las cinco que existen?
 *
 * Se comprueba el `tipo` contra la lista cerrada y no solo que sea una cadena:
 * una restricción de un tipo que la app no conoce no se puede pintar ni tachar
 * casillas con ella, y colarla haría que el resolutor la diera por incumplida
 * siempre —`cumple` devuelve `false` en su `default`— y tachara el tablero
 * entero. Un dato que no se entiende se descarta; no se interpreta a medias.
 */
function leerRestriccion(v: unknown): Restriccion | null {
  if (!esObjeto(v)) return null;
  const a = cadena(v.a);
  if (!a) return null;
  switch (v.tipo) {
    case 'antes':
    case 'inmediatamente-antes': {
      const b = cadena(v.b);
      return b ? ({ tipo: v.tipo, a, b } as Restriccion) : null;
    }
    case 'posicion':
    case 'no-posicion': {
      const pos = v.posicion;
      if (typeof pos !== 'number' || pos < 1 || pos > 5) return null;
      return { tipo: v.tipo, a, posicion: pos } as Restriccion;
    }
    case 'extremos':
      return { tipo: 'extremos', a };
    default:
      return null;
  }
}

function leerFragmento(v: unknown): FragmentoVisible | null {
  if (!esObjeto(v)) return null;
  const id = cadena(v.id);
  const restriccion = leerRestriccion(v.restriccion);
  if (!id || !restriccion) return null;
  return {
    id,
    restriccion,
    // Sin texto se usa la restricción en crudo antes que dejar la tarjeta muda:
    // un fragmento sin frase sigue sirviendo para deducir.
    texto: cadena(v.texto) ?? '',
    publico: v.publico === true,
    publicadoPor: cadena(v.publicadoPor),
    publicadoPorNombre: cadena(v.publicadoPorNombre),
  };
}

const DONES: readonly DonId[] = [
  'descifrar',
  'sanar',
  'proteger',
  'sobornar',
  'documentar',
  'excavar',
  'falsificar',
];

function leerLista<T>(v: unknown, leer: (x: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const salida: T[] = [];
  for (const x of v) {
    const leido = leer(x);
    if (leido) salida.push(leido);
  }
  return salida;
}

/**
 * Lee lo que venga en `estadoDelJuego` y devuelve algo que se pueda pintar.
 *
 * `null` significa «esto no es una partida de la Momia, o su estado todavía no
 * ha llegado». Las pantallas lo tratan como «aún no hay nada», que es lo que de
 * verdad pasa entre que alguien entra y el servidor compone la primera vista.
 */
export function leerEstadoMomia(v: unknown): EstadoMomiaVisible | null {
  if (!esObjeto(v)) return null;
  const yo = esObjeto(v.yo) ? v.yo : null;
  if (!yo) return null;

  const don = DONES.includes(yo.don as DonId) ? (yo.don as DonId) : 'descifrar';

  return {
    yo: {
      marcas: entero(yo.marcas),
      amuletos: entero(yo.amuletos),
      tocado: yo.tocado === true,
      don,
      donUsadoEnRonda: typeof yo.donUsadoEnRonda === 'number' ? yo.donUsadoEnRonda : undefined,
      fragmentos: leerLista(yo.fragmentos, leerFragmento),
      falsasOfrecidas: Array.isArray(yo.falsasOfrecidas)
        ? leerLista(yo.falsasOfrecidas, (x) => {
            if (!esObjeto(x)) return null;
            const id = cadena(x.id);
            return id ? { id, texto: cadena(x.texto) ?? '' } : null;
          })
        : undefined,
    },
    ritos: leerLista(v.ritos, (x) => {
      if (!esObjeto(x)) return null;
      const id = cadena(x.id);
      if (!id) return null;
      return { id, nombre: cadena(x.nombre) ?? id, descripcion: cadena(x.descripcion) };
    }),
    publicos: leerLista(v.publicos, leerFragmento),
    profanada: cadena(v.profanada),
    profanadaSiguiente: cadena(v.profanadaSiguiente),
    gente: leerLista(v.gente, (x) => {
      if (!esObjeto(x)) return null;
      const suspectId = cadena(x.suspectId);
      if (!suspectId) return null;
      return {
        suspectId,
        marcas: entero(x.marcas),
        amuletos: entero(x.amuletos),
        tocado: x.tocado === true,
      };
    }),
    miPropuesta: esObjeto(v.miPropuesta)
      ? {
          orden: Array.isArray(v.miPropuesta.orden)
            ? v.miPropuesta.orden.filter((x): x is string => typeof x === 'string')
            : [],
          at: cadena(v.miPropuesta.at) ?? '',
        }
      : undefined,
    propuestasEntregadas: entero(v.propuestasEntregadas),
    sellado: esObjeto(v.sellado)
      ? {
          ordenEjecutado: Array.isArray(v.sellado.ordenEjecutado)
            ? v.sellado.ordenEjecutado.filter((x): x is string => typeof x === 'string')
            : [],
          correcto: v.sellado.correcto === true,
          at: cadena(v.sellado.at) ?? '',
        }
      : undefined,
  };
}

/**
 * Cómo se manda un orden en la acción `proponer-orden`.
 *
 * `hacerAccion` acepta `Record<string, string>` —un campo, un valor— porque
 * está pensada para `eligeDe`, que siempre elige UNA entidad. Un orden son
 * cinco, así que van en un solo campo separadas por comas.
 *
 * NO ES BONITO Y SE DEJA ESCRITO. Lo suyo sería que el contrato de acciones
 * admitiera valores compuestos (una lista, una cantidad), que es justo la
 * limitación que el diseño apunta en §8.5. Mientras eso no exista, una cadena
 * separada por comas es la opción que no obliga a tocar el contrato general por
 * un juego solo, y los identificadores de entidad no llevan comas.
 */
export const CAMPO_ORDEN = 'orden';

export function codificarOrden(orden: RitoId[]): Record<string, string> {
  return { [CAMPO_ORDEN]: orden.join(',') };
}

/**
 * El campo con el que viaja lo que elige un don al invocarlo.
 *
 * UNO SOLO PARA LOS SIETE DONES, y es deliberado: según el don, lo que va dentro
 * es un `suspectId`, un `camaraId` o un `fragmentoId`. Podrían ser tres campos
 * distintos —`aQuien`, `camara`, `fragmento`— y sería peor, porque cuál de ellos
 * viaja delataría qué don tienes a cualquiera que mirase la petición. Con un
 * campo neutro, todas las invocaciones se parecen por fuera.
 *
 * Los dones que no eligen nada (`descifrar`, `sobornar`) mandan el objeto vacío.
 */
export const CAMPO_OBJETIVO = 'objetivo';
