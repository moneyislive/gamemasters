/**
 * Lo que la app de El Paso de las Sombras lee de `VistaJugador.estadoDelJuego`.
 *
 * ═══ POR QUÉ ESTE FICHERO EXISTE ═══
 *
 * `estadoDelJuego` está declarado `unknown` en el contrato, y tiene que estarlo:
 * el motor transporta el estado de un juego que no conoce, y si el tipo fuese
 * concreto el contrato general volvería a saber de qué se juega. Pero `unknown`
 * no se puede pintar. Alguien tiene que decir qué forma tiene, y ese alguien es
 * el juego, por sus dos extremos: el servidor al proyectarlo
 * (`server/src/juegos/sombras-proyeccion.ts`) y la app al leerlo.
 *
 * ═══ POR QUÉ SE LEE A LA DEFENSIVA, Y NO CON UN `as` ═══
 *
 * Porque un móvil puede tener una versión más vieja que el servidor, y un campo
 * que aún no existe tiene que dar una pantalla incompleta y no una pantalla
 * rota. En la Momia esto no fue una precaución teórica: las dos mitades se
 * escribieron en paralelo y no encajaron a la primera; con un `as` habría sido
 * un `undefined is not an object` en el móvil de doce personas durante una cena.
 *
 * ═══ LO QUE NUNCA PUEDE LLEGAR ═══
 *
 * `sendaVerdadera` no aparece. Las contraseñas de las puertas, tampoco: ese dato
 * no viaja NUNCA, ni siquiera en el desenlace, porque es la mecánica que obliga
 * a levantarse. Y `falso` solo existe con la partida terminada —el servidor ni
 * siquiera pone la clave mientras se juega, que es más fuerte que ponerla a
 * `false`—. Aquí se lee `falso` únicamente para el desenlace.
 */
import type { Condicion, PapelId, PasoId, PorteId } from '../../../shared/juegos';

/** Un hito tal y como puede verlo quien juega. */
export interface HitoVisible {
  id: string;
  /**
   * La condición, en datos.
   *
   * Es lo que permite tachar casillas en el tablero de deducción sin volver a
   * parsear la prosa —que es justo lo que el diseño prohíbe: la lógica la
   * garantiza el código, no la interpretación de un texto—. No es una fuga:
   * `texto` dice exactamente lo mismo en castellano.
   */
  condicion?: Condicion;
  /** La frase del mojón, ya redactada. Es lo que se lee en la mesa. */
  texto: string;
  publico: boolean;
  publicadoPor?: string;
  publicadoPorNombre?: string;
  /** Dónde y cuándo dice quien lo puso que lo consiguió. */
  halladoEn?: { pasoId: string; pasoNombre: string; ronda: number };
  /** Solo en el desenlace. Antes, nunca. */
  falso?: boolean;
}

export interface PasoVisible {
  id: PasoId;
  nombre: string;
  descripcion?: string;
}

/** Lo que se sabe de otra persona: solo lo que en la mesa se ve. */
export interface GenteVisible {
  suspectId: string;
  prendas: number;
  prendasRecibidas: number;
  /** Que ha propuesto es público; QUÉ ha propuesto, no. */
  haPropuesto: boolean;
  estandarteNombre?: string;
  enseres: Array<{ id: string; nombre: string; porte?: PorteId }>;
  /** Cuántas veces se sabe que pisó donde estaban los cazadores. */
  pisadasVistas: number;
}

/** Lo tuyo, que nadie más ve. */
export interface MiEstadoSombras {
  prendas: number;
  prendasRecibidas: number;
  pisadas: number;
  papel: PapelId;
  /**
   * Todos los que puedes usar esta hora.
   *
   * Uno para casi todo el mundo, y ese uno es `papel`. DOS PARA EL KANCHŌ: el
   * suyo aparente y `falsear`. Ausente si el servidor no lo manda.
   */
  papelesDisponibles?: PapelId[];
  papelRol?: string;
  papelKanji?: string;
  papelQueHace?: string;
  papelUsado: boolean;
  hitos: HitoVisible[];
  enseres: Array<{ id: string; nombre: string; porte?: PorteId; porteNombre?: string; porteQue?: string }>;
  estandarteNombre?: string;
  miPaso?: string;
  miPropuesta?: PasoId[];
  /** Lo que averiguó el juglar. Llega ya con el nombre resuelto. */
  sabeQueBatiran?: { pasoId: string; nombre: string };
  /**
   * Las mentiras que la casa tiene preparadas.
   *
   * El servidor las manda bajo la clave `mentiras`, y SOLO si eres el kanchō:
   * para el resto la clave no existe, que es distinto de existir vacía —«no
   * tienes mentiras» ya sería un dato—.
   */
  mentiras?: Array<{ id: string; texto: string }>;
}

/** El estado, filtrado para una persona concreta. */
export interface EstadoSombrasVisible {
  hora: {
    ronda: number;
    nombre: string;
    kanji: string;
    rastro: number;
    rastroMaximo: number;
    tramos: number;
    /** Los pasos batidos de las horas ya cerradas. Público. */
    batidosRevelados: Array<{ ronda: number; pasoId: string; nombre: string }>;
    /** Solo si llevas el farol: el de ESTA hora. */
    batidoQueVes?: { pasoId: string; nombre: string };
  };
  yo: MiEstadoSombras;
  /** Los hitos que están sobre la mesa. Alguno puede ser falso. */
  camino: HitoVisible[];
  pasos: PasoVisible[];
  mesa: GenteVisible[];
  /** Quién estuvo en cada paso y en cada hora. El mecanismo del juego. */
  encuentros: Array<{
    ronda: number;
    pasos: Array<{ pasoId: string; nombre: string; quienes: string[] }>;
  }>;
  /**
   * ¿Se puede dibujar el tablero de deducción?
   *
   * Solo si algún hito trae su condición en datos. Sin eso el tablero saldría en
   * blanco, y un tablero vacío se lee como «no hay nada descartado» —que es una
   * mentira— en vez de como «esto todavía no funciona».
   */
  hayCondiciones: boolean;
  /** Cómo acabó la noche. Solo llega al amanecer. */
  desenlace?: {
    sendaVerdadera: Array<{ id: string; nombre: string }>;
    sendaAndada: Array<{ id: string; nombre: string }>;
    correcta: boolean;
    interceptada: boolean;
    gana: 'columna' | 'kancho';
    kanchoId: string;
    ganadores: string[];
    desenmascarado: boolean;
    senalamientos: { aciertos: number; total: number };
    votos: Array<{ senda: string[]; apoyos: string[]; peso: number }>;
    rastro: number;
    rastroMaximo: number;
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
 * ¿Es esto una condición de las siete que existen?
 *
 * Se comprueba el `tipo` contra la lista cerrada, y no solo que sea una cadena:
 * una condición de un tipo que la app no conoce haría que `cumpleCondicion` la
 * diera por incumplida siempre —devuelve `false` en su `default`— y el tablero
 * se tacharía entero. Un dato que no se entiende se descarta; no se interpreta a
 * medias.
 */
function leerCondicion(v: unknown): Condicion | undefined {
  if (!esObjeto(v)) return undefined;
  const a = cadena(v.a);
  if (!a) return undefined;
  switch (v.tipo) {
    case 'antes':
    case 'seguido': {
      const b = cadena(v.b);
      return b ? ({ tipo: v.tipo, a, b } as Condicion) : undefined;
    }
    case 'posicion':
    case 'no-posicion': {
      const pos = v.posicion;
      if (typeof pos !== 'number' || pos < 1 || pos > 8) return undefined;
      return { tipo: v.tipo, a, posicion: pos } as Condicion;
    }
    case 'extremo':
      return { tipo: 'extremo', a };
    case 'pasa-por':
      return { tipo: 'pasa-por', a };
    case 'no-pasa-por':
      return { tipo: 'no-pasa-por', a };
    default:
      return undefined;
  }
}

function leerHito(v: unknown): HitoVisible | null {
  if (!esObjeto(v)) return null;
  const id = cadena(v.id);
  if (!id) return null;
  const donde = esObjeto(v.halladoEn) ? v.halladoEn : undefined;
  return {
    id,
    condicion: leerCondicion(v.condicion),
    texto: cadena(v.texto) ?? '',
    publico: v.publico === true,
    publicadoPor: cadena(v.publicadoPor),
    publicadoPorNombre: cadena(v.publicadoPorNombre),
    halladoEn:
      donde && cadena(donde.pasoId)
        ? {
            pasoId: cadena(donde.pasoId)!,
            pasoNombre: cadena(donde.pasoNombre) ?? '',
            ronda: entero(donde.ronda, 0),
          }
        : undefined,
    ...(typeof v.falso === 'boolean' ? { falso: v.falso } : {}),
  };
}

const PAPELES_VALIDOS: readonly PapelId[] = [
  'rastrear',
  'amparar',
  'comprar',
  'adelantarse',
  'referir',
  'trocar',
  'falsear',
];

function leerEnser(x: unknown): { id: string; nombre: string; porte?: PorteId; porteNombre?: string; porteQue?: string } | null {
  if (!esObjeto(x)) return null;
  const id = cadena(x.id);
  if (!id) return null;
  const porte = cadena(x.porte);
  return {
    id,
    nombre: cadena(x.nombre) ?? id,
    ...(porte === 'farol' || porte === 'plata' || porte === 'lanza' ? { porte } : {}),
    porteNombre: cadena(x.porteNombre),
    porteQue: cadena(x.porteQue),
  };
}

/**
 * Lee lo que venga en `estadoDelJuego` y devuelve algo que se pueda pintar.
 *
 * `null` significa «esto no es una partida de este juego, o su estado todavía no
 * ha llegado». Las pantallas lo tratan como «aún no hay nada», que es
 * exactamente lo que pasa entre que alguien entra y el servidor compone la
 * primera vista.
 */
export function leerEstadoSombras(v: unknown): EstadoSombrasVisible | null {
  if (!esObjeto(v)) return null;
  const yo = esObjeto(v.yo) ? v.yo : null;
  const hora = esObjeto(v.hora) ? v.hora : null;
  if (!yo || !hora) return null;

  const mentiras = esObjeto(v.mentiras) ? v.mentiras : undefined;
  const desenlace = esObjeto(v.desenlace) ? v.desenlace : undefined;

  const mios = leerLista(yo.hitos, leerHito);
  const publicos = leerLista(v.camino, leerHito);

  const conNombre = (v2: unknown): Array<{ id: string; nombre: string }> =>
    leerLista(v2, (x) => {
      if (typeof x === 'string') return { id: x, nombre: x };
      if (!esObjeto(x)) return null;
      const id = cadena(x.id);
      return id ? { id, nombre: cadena(x.nombre) ?? id } : null;
    });

  return {
    hora: {
      ronda: entero(hora.ronda),
      nombre: cadena(hora.nombre) ?? '',
      kanji: cadena(hora.kanji) ?? '',
      rastro: entero(hora.rastro),
      rastroMaximo: entero(hora.rastroMaximo, 1),
      tramos: entero(hora.tramos, 4),
      batidosRevelados: leerLista(hora.batidosRevelados, (x) => {
        if (!esObjeto(x)) return null;
        const pasoId = cadena(x.pasoId);
        return pasoId
          ? { ronda: entero(x.ronda), pasoId, nombre: cadena(x.nombre) ?? pasoId }
          : null;
      }),
      batidoQueVes: esObjeto(hora.batidoQueVes) && cadena(hora.batidoQueVes.pasoId)
        ? {
            pasoId: cadena(hora.batidoQueVes.pasoId)!,
            nombre: cadena(hora.batidoQueVes.nombre) ?? '',
          }
        : undefined,
    },
    yo: {
      prendas: entero(yo.prendas),
      prendasRecibidas: entero(yo.prendasRecibidas),
      pisadas: entero(yo.pisadas),
      papel: PAPELES_VALIDOS.includes(yo.papel as PapelId) ? (yo.papel as PapelId) : 'rastrear',
      /*
       * Todos los que puedes usar. Casi siempre uno; dos si eres el kanchō. Se
       * cae al papel aparente si el servidor no lo manda —una versión vieja—
       * para que la pantalla siga funcionando exactamente como antes.
       */
      papelesDisponibles: (() => {
        const lista = listaDeIds(yo.papelesDisponibles).filter((d): d is PapelId =>
          PAPELES_VALIDOS.includes(d as PapelId),
        );
        return lista.length > 0 ? lista : undefined;
      })(),
      papelRol: cadena(yo.papelRol),
      papelKanji: cadena(yo.papelKanji),
      papelQueHace: cadena(yo.papelQueHace),
      papelUsado: yo.papelUsadoEstaHora === true,
      hitos: mios,
      enseres: leerLista(yo.enseres, leerEnser),
      estandarteNombre: cadena(yo.estandarteNombre),
      miPaso: cadena(yo.miPaso),
      miPropuesta: (() => {
        const lista = listaDeIds(yo.miPropuesta);
        return lista.length > 0 ? lista : undefined;
      })(),
      sabeQueBatiran:
        esObjeto(yo.sabeQueBatiran) && cadena(yo.sabeQueBatiran.pasoId)
          ? {
              pasoId: cadena(yo.sabeQueBatiran.pasoId)!,
              nombre: cadena(yo.sabeQueBatiran.nombre) ?? '',
            }
          : undefined,
      mentiras: mentiras
        ? leerLista(mentiras.lista, (x) => {
            if (!esObjeto(x)) return null;
            const id = cadena(x.id);
            return id ? { id, texto: cadena(x.texto) ?? '' } : null;
          })
        : undefined,
    },
    camino: publicos,
    pasos: leerLista(v.pasos, (x) => {
      if (!esObjeto(x)) return null;
      const id = cadena(x.id);
      if (!id) return null;
      return { id, nombre: cadena(x.nombre) ?? id, descripcion: cadena(x.descripcion) };
    }),
    mesa: leerLista(v.mesa, (x) => {
      if (!esObjeto(x)) return null;
      const suspectId = cadena(x.suspectId);
      if (!suspectId) return null;
      return {
        suspectId,
        prendas: entero(x.prendas),
        prendasRecibidas: entero(x.prendasRecibidas),
        haPropuesto: x.haPropuesto === true,
        estandarteNombre: cadena(x.estandarteNombre),
        enseres: leerLista(x.enseres, leerEnser),
        pisadasVistas: entero(x.pisadasVistas),
      };
    }),
    encuentros: leerLista(v.encuentros, (x) => {
      if (!esObjeto(x)) return null;
      return {
        ronda: entero(x.ronda),
        pasos: leerLista(x.pasos, (y) => {
          if (!esObjeto(y)) return null;
          const pasoId = cadena(y.pasoId);
          return pasoId
            ? { pasoId, nombre: cadena(y.nombre) ?? pasoId, quienes: listaDeIds(y.quienes) }
            : null;
        }),
      };
    }),
    hayCondiciones: [...mios, ...publicos].some((h) => Boolean(h.condicion)),
    desenlace: desenlace
      ? {
          sendaVerdadera: conNombre(desenlace.sendaVerdadera),
          sendaAndada: conNombre(desenlace.sendaAndada),
          correcta: desenlace.correcta === true,
          interceptada: desenlace.interceptada === true,
          gana: desenlace.gana === 'kancho' ? 'kancho' : 'columna',
          kanchoId: cadena(desenlace.kanchoId) ?? '',
          ganadores: listaDeIds(desenlace.ganadores),
          desenmascarado: desenlace.desenmascarado === true,
          senalamientos: esObjeto(desenlace.senalamientos)
            ? {
                aciertos: entero(desenlace.senalamientos.aciertos),
                total: entero(desenlace.senalamientos.total),
              }
            : { aciertos: 0, total: 0 },
          votos: leerLista(desenlace.votos, (x) =>
            esObjeto(x)
              ? { senda: listaDeIds(x.senda), apoyos: listaDeIds(x.apoyos), peso: entero(x.peso) }
              : null,
          ),
          rastro: entero(desenlace.rastro),
          rastroMaximo: entero(desenlace.rastroMaximo, 1),
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
 * La senda propuesta viaja como LISTA, no como cadena.
 *
 * El motor declara este campo con `eligeVarias`, exige un array de cuatro y
 * contesta «Falta elegir: La senda hasta la playa» a cualquier otra cosa. La
 * ruta HTTP conserva los arrays a propósito para esto.
 */
export function codificarSenda(senda: PasoId[]): Record<string, string[]> {
  return { senda };
}

/**
 * Qué campos manda cada disfraz al usarlo.
 *
 * Son campos SEPARADOS por categoría —`aQuien` es una persona y `paso` un paso—
 * porque así los declara el manifiesto en `eligeOpcional`, y el motor comprueba
 * cada uno contra la suya. Un campo neutro para los dos habría necesitado que el
 * motor supiera qué disfraz tienes, que es justo lo secreto.
 *
 * `papel` y `hito` van por `eligeLibre`: no son entidades de ninguna categoría,
 * así que el motor los pasa sin mirarlos y los valida el reductor.
 */
export function codificarInvocacion(opciones: {
  papel: PapelId;
  aQuien?: string | null;
  paso?: string | null;
  hito?: string | null;
}): Record<string, string> {
  const datos: Record<string, string> = { papel: opciones.papel };
  if (opciones.aQuien) datos.aQuien = opciones.aQuien;
  if (opciones.paso) datos.paso = opciones.paso;
  if (opciones.hito) datos.hito = opciones.hito;
  return datos;
}

/** Qué elige cada disfraz antes de poder usarse. */
export function queEligeElPapel(
  papel: PapelId,
): 'nada' | 'persona' | 'hito-propio' | 'mentira' {
  switch (papel) {
    case 'amparar':
    case 'trocar':
      return 'persona';
    case 'referir':
      return 'hito-propio';
    case 'falsear':
      return 'mentira';
    default:
      return 'nada';
  }
}
