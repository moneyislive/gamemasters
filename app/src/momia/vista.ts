/**
 * Lo que la app de la Momia lee de `VistaJugador.estadoDelJuego`.
 *
 * ═══ POR QUÉ ESTE FICHERO EXISTE ═══
 *
 * `estadoDelJuego` está declarado `unknown` en el contrato, y tiene que estarlo:
 * el motor transporta el estado de un juego que no conoce, y si el tipo fuese
 * concreto el contrato general volvería a saber de qué se juega. Pero `unknown`
 * no se puede pintar. Alguien tiene que decir qué forma tiene, y ese alguien es
 * el juego, por sus dos extremos: el servidor al proyectarlo
 * (`server/src/juegos/momia-proyeccion.ts`) y la app al leerlo.
 *
 * ═══ POR QUÉ SE LEE A LA DEFENSIVA, Y NO CON UN `as` ═══
 *
 * Las dos mitades se escribieron EN PARALELO, en sesiones distintas, y no
 * encajaron a la primera: esta empezó esperando `gente`, `profanada` y
 * `propuestasEntregadas`, y la de allí acabó mandando `mesa`, `vigilia.profanada`
 * y un `haPropuesto` por persona. Con un `as` eso habría sido una pantalla en
 * blanco a mitad de partida y un `undefined is not an object` en el móvil de doce
 * personas durante una cena. Leyendo campo a campo, lo que no encaja se queda
 * vacío y la pantalla sigue en pie.
 *
 * El mismo motivo vale para siempre, no solo para esta noche: un móvil puede
 * tener una versión más vieja que el servidor, y un campo que aún no existe tiene
 * que dar una pantalla incompleta y no una pantalla rota.
 *
 * ═══ LO QUE NUNCA PUEDE LLEGAR ═══
 *
 * `ordenVerdadero` no aparece, y `falso` solo existe con la partida terminada
 * —el servidor ni siquiera pone la clave mientras se juega, que es más fuerte
 * que ponerla a `false`—. Aquí se lee `falso` únicamente para el desenlace;
 * ninguna pantalla de las que se usan jugando lo mira.
 */
import type { DonId, Restriccion, RitoId } from '../../../shared/juegos';

/**
 * Un fragmento de papiro tal y como puede verlo quien juega.
 *
 * `restriccion` VIENE OPCIONAL, y es la diferencia más importante entre lo que
 * esta app querría y lo que hoy recibe. El servidor manda solo `texto`, la frase
 * de papiro; sin la restricción en datos, el tablero de deducción del papiro no
 * puede tachar una sola casilla, porque tacharlas a partir de la prosa exigiría
 * volver a parsear la frase —justo lo que el diseño prohíbe (§7: la lógica no
 * depende de la redacción)—.
 *
 * No es una fuga pedirla: `texto` ya dice lo mismo en castellano, y lo que no
 * puede viajar es si la frase es CIERTA, no lo que la frase dice. Está anotado
 * en el informe como lo primero que hace falta de la zona del servidor.
 */
export interface FragmentoVisible {
  id: string;
  restriccion?: Restriccion;
  /** La frase de papiro, ya redactada. Es lo que se lee en la mesa. */
  texto: string;
  publico: boolean;
  /** Quién lo puso sobre la mesa. Vacío si salió al cerrarse una vigilia. */
  publicadoPor?: string;
  /** El nombre de quien lo publicó, si el servidor lo resuelve. */
  publicadoPorNombre?: string;
}

/** Un rito, con su nombre ya resuelto. */
export interface RitoVisible {
  id: RitoId;
  nombre: string;
  descripcion?: string;
}

/** Lo que se sabe de otra persona: solo lo que en la mesa se ve. */
export interface GenteVisible {
  suspectId: string;
  marcas: number;
  amuletos: number;
  tocado: boolean;
  /** Que ha propuesto es público; QUÉ ha propuesto, no. */
  haPropuesto: boolean;
}

/** Lo tuyo, que nadie más ve. */
export interface MiEstadoMomia {
  marcas: number;
  amuletos: number;
  tocado: boolean;
  don: DonId;
  /** El oficio y la frase del don, redactados por el servidor. */
  donRol?: string;
  donQueHace?: string;
  /** ¿Lo has usado ya en esta vigilia? */
  donUsado: boolean;
  /** Los que tienes en la mano. Siempre ciertos: los falsos no se reparten. */
  fragmentos: FragmentoVisible[];
  /**
   * Las mentiras que la casa tiene preparadas.
   *
   * El servidor las manda bajo la clave `saqueo`, y SOLO si eres el saqueador:
   * para el resto la clave no existe, que es distinto de existir vacía —«no
   * tienes mentiras» ya sería un dato—.
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
  /** La cámara profanada esta vigilia: su id y su nombre, ya resuelto. */
  profanada?: string;
  profanadaNombre?: string;
  /** Lo que ve el mecenas y nadie más. Llega ya como nombre. */
  profanadaSiguienteNombre?: string;
  /** Marcas y amuletos de los demás. La cuenta de la maldición es pública. */
  gente: GenteVisible[];
  /** Lo que has propuesto, si ya lo has hecho. No se puede cambiar. */
  miPropuesta?: { orden: RitoId[] };
  /** Cuántas propuestas hay. Ni de quién ni cuáles. */
  propuestasEntregadas: number;
  /**
   * ¿Se puede dibujar el tablero de deducción?
   *
   * Solo si algún fragmento trae su restricción en datos. Sin eso el tablero
   * saldría en blanco, y un tablero vacío se lee como «no hay nada descartado»
   * —que es una mentira— en vez de como «esto todavía no funciona».
   */
  hayRestricciones: boolean;
  /** El resultado, cuando la tumba ya se ha sellado (o no). */
  sellado?: { ordenEjecutado: RitoId[]; correcto: boolean };
  /**
   * Cómo acabó la noche, entero. Solo llega al amanecer.
   *
   * SE LEÍA A MEDIAS Y ESE ERA EL FALLO. El servidor manda desde el principio
   * quién gana, quiénes son los ganadores, el orden verdadero, los votos y los
   * trofeos, y aquí solo se recogían el orden ejecutado y si era correcto. La
   * pantalla del final se quedaba entonces con el desenlace genérico, que es el
   * de CLUEDO: «el sobre del crimen», clasificación por aciertos y —como nadie
   * podía señalar— el cierre «el crimen queda impune». En un juego que se gana
   * por bandos, eso no es un adorno mal puesto: es contar otra partida.
   *
   * `ordenVerdadero` no viaja NUNCA antes de esto. Es la única puerta.
   */
  desenlace?: {
    ordenVerdadero: RitoVisible[];
    ordenEjecutado: RitoVisible[];
    correcto: boolean;
    gana: 'expedicion' | 'saqueador';
    saqueadorId: string;
    ganadores: string[];
    votos: Array<{ orden: RitoId[]; apoyos: string[] }>;
    silenciadas: string[];
    trofeos: Record<string, string[]>;
  };
}

// ---------------------------------------------------------------------------
// La lectura
// ---------------------------------------------------------------------------

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const cadena = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const entero = (v: unknown, sino = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : sino;
const listaDeIds = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * ¿Es esto una restricción de las cinco que existen?
 *
 * Se comprueba el `tipo` contra la lista cerrada, y no solo que sea una cadena:
 * una restricción de un tipo que la app no conoce haría que `cumple` la diera por
 * incumplida siempre —devuelve `false` en su `default`— y el tablero se tacharía
 * entero. Un dato que no se entiende se descarta; no se interpreta a medias.
 */
function leerRestriccion(v: unknown): Restriccion | undefined {
  if (!esObjeto(v)) return undefined;
  const a = cadena(v.a);
  if (!a) return undefined;
  switch (v.tipo) {
    case 'antes':
    case 'inmediatamente-antes': {
      const b = cadena(v.b);
      return b ? ({ tipo: v.tipo, a, b } as Restriccion) : undefined;
    }
    case 'posicion':
    case 'no-posicion': {
      const pos = v.posicion;
      if (typeof pos !== 'number' || pos < 1 || pos > 5) return undefined;
      return { tipo: v.tipo, a, posicion: pos } as Restriccion;
    }
    case 'extremos':
      return { tipo: 'extremos', a };
    default:
      return undefined;
  }
}

function leerFragmento(v: unknown): FragmentoVisible | null {
  if (!esObjeto(v)) return null;
  const id = cadena(v.id);
  if (!id) return null;
  return {
    id,
    restriccion: leerRestriccion(v.restriccion),
    texto: cadena(v.texto) ?? '',
    publico: v.publico === true,
    publicadoPor: cadena(v.publicadoPor),
    publicadoPorNombre: cadena(v.publicadoPorNombre),
  };
}

const DONES_VALIDOS: readonly DonId[] = [
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
 * `null` significa «esto no es una partida de la Momia, o su estado todavía no ha
 * llegado». Las pantallas lo tratan como «aún no hay nada», que es exactamente lo
 * que pasa entre que alguien entra y el servidor compone la primera vista.
 */
export function leerEstadoMomia(v: unknown): EstadoMomiaVisible | null {
  if (!esObjeto(v)) return null;
  const yo = esObjeto(v.yo) ? v.yo : null;
  if (!yo) return null;

  const vigilia = esObjeto(v.vigilia) ? v.vigilia : {};
  const saqueo = esObjeto(v.saqueo) ? v.saqueo : undefined;
  const desenlace = esObjeto(v.desenlace) ? v.desenlace : undefined;

  const mios = leerLista(yo.fragmentos, leerFragmento);
  const publicos = leerLista(v.papiro, leerFragmento);
  const gente = leerLista(v.mesa, (x) => {
    if (!esObjeto(x)) return null;
    const suspectId = cadena(x.suspectId);
    if (!suspectId) return null;
    return {
      suspectId,
      marcas: entero(x.marcas),
      amuletos: entero(x.amuletos),
      tocado: x.tocado === true,
      haPropuesto: x.haPropuesto === true,
    };
  });

  const miPropuesta = listaDeIds(yo.miPropuesta);

  /*
   * El desenlace manda los ritos como `{id, nombre}` y no como ids sueltos,
   * porque allí ya no hay que cruzarlos con nada: se leen. Se acepta cualquiera
   * de las dos formas para no depender de ese detalle.
   */
  /** Los ritos del desenlace, con su nombre, tal y como llegan. */
  const ritosDe = (v2: unknown): RitoVisible[] =>
    leerLista(v2, (x) => {
      if (typeof x === 'string') return { id: x, nombre: x };
      if (!esObjeto(x)) return null;
      const id = cadena(x.id);
      return id ? { id, nombre: cadena(x.nombre) ?? id } : null;
    });

  const idsDe = (v2: unknown): string[] =>
    Array.isArray(v2)
      ? v2
          .map((x) => (typeof x === 'string' ? x : esObjeto(x) ? cadena(x.id) : undefined))
          .filter((x): x is string => Boolean(x))
      : [];

  return {
    yo: {
      marcas: entero(yo.marcas),
      amuletos: entero(yo.amuletos),
      tocado: yo.tocado === true,
      don: DONES_VALIDOS.includes(yo.don as DonId) ? (yo.don as DonId) : 'descifrar',
      donRol: cadena(yo.donRol),
      donQueHace: cadena(yo.donQueHace),
      donUsado: yo.donUsadoEstaVigilia === true,
      fragmentos: mios,
      falsasOfrecidas: saqueo
        ? leerLista(saqueo.mentiras, (x) => {
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
    publicos,
    profanada: cadena(vigilia.profanada),
    profanadaNombre: cadena(vigilia.profanadaNombre),
    profanadaSiguienteNombre: cadena(yo.sabeQueSeProfanara),
    gente,
    miPropuesta: miPropuesta.length > 0 ? { orden: miPropuesta } : undefined,
    // El servidor no manda un total: se cuenta de la mesa, y se suma la tuya.
    propuestasEntregadas:
      gente.filter((g) => g.haPropuesto).length + (miPropuesta.length > 0 ? 1 : 0),
    hayRestricciones: [...mios, ...publicos].some((f) => Boolean(f.restriccion)),
    sellado: desenlace
      ? {
          ordenEjecutado: idsDe(desenlace.ordenEjecutado),
          correcto: desenlace.correcto === true,
        }
      : undefined,
    desenlace: desenlace
      ? {
          ordenVerdadero: ritosDe(desenlace.ordenVerdadero),
          ordenEjecutado: ritosDe(desenlace.ordenEjecutado),
          correcto: desenlace.correcto === true,
          gana: desenlace.gana === 'saqueador' ? 'saqueador' : 'expedicion',
          saqueadorId: cadena(desenlace.saqueadorId) ?? '',
          ganadores: listaDeIds(desenlace.ganadores),
          votos: leerLista(desenlace.votos, (x) =>
            esObjeto(x) ? { orden: idsDe(x.orden), apoyos: listaDeIds(x.apoyos) } : null,
          ),
          silenciadas: listaDeIds(desenlace.silenciadas),
          trofeos: esObjeto(desenlace.trofeos)
            ? Object.fromEntries(
                Object.entries(desenlace.trofeos).map(([id, lista]) => [id, listaDeIds(lista)]),
              )
            : {},
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Cómo se manda lo que se elige
// ---------------------------------------------------------------------------

/**
 * El orden propuesto viaja como LISTA, no como cadena.
 *
 * La primera versión lo mandaba como `"r-agua,r-aliento,…"` porque
 * `hacerAccion` aceptaba solo `Record<string, string>`. Y habría fallado la
 * noche de la partida: el motor declara este campo con `eligeVarias`, exige un
 * array de cinco y contesta «Falta elegir: El orden del sellado» a cualquier
 * otra cosa. La ruta HTTP conserva los arrays a propósito para esto.
 */
export function codificarOrden(orden: RitoId[]): Record<string, string[]> {
  return { orden };
}

/**
 * Qué campos manda cada don al invocarlo.
 *
 * Son campos SEPARADOS por categoría —`objetivo` es un expedicionario y `camara`
 * una cámara— porque así los declara el manifiesto en `eligeOpcional`, y el motor
 * comprueba cada uno contra la suya. Un campo neutro para los tres habría
 * necesitado que el motor supiera qué don tienes, que es justo lo secreto.
 *
 * `fragmento` NO ESTÁ DECLARADO en el manifiesto, así que hoy el motor lo
 * descarta antes de llegar al reductor —solo copia los campos declarados— y el
 * servidor publica el primer fragmento tuyo sin publicar en vez del que elijas.
 * El reductor ya lo admite (`opciones.fragmento`): falta una línea en
 * `eligeOpcional`, y está pedida en el informe. Se manda igualmente para que el
 * día que se declare funcione sin tocar la app.
 */
export function codificarObjetivo(
  elige: 'nada' | 'persona' | 'camara' | 'fragmento-propio' | 'fragmento-falso',
  id: string | null,
): Record<string, string> {
  if (!id || elige === 'nada') return {};
  if (elige === 'persona') return { objetivo: id };
  if (elige === 'camara') return { camara: id };
  return { fragmento: id };
}
