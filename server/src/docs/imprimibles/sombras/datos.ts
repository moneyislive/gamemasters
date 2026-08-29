/**
 * Lo que los ocho imprimibles de este juego necesitan saber, calculado UNA vez.
 *
 * Mismo motivo que `docs/datos.ts` en CLUEDO y que `momia/datos.ts`: el riesgo
 * real de componer ocho documentos desde plantillas independientes es que se
 * contradigan entre sí —que la guía diga que los cazadores están en un sitio y
 * la tabla del rastro en otro—. Aquí se deduce todo una vez y lo consume quien
 * lo necesite.
 *
 * Y hay una razón de más, propia de este juego: el informe de la senda tiene que
 * DEMOSTRAR que el camino tiene una sola solución y que nadie lo traza solo. Esa
 * demostración se hace sobre la trama guardada, no sobre la que se generó: si
 * alguien tocase la partida después, el informe tiene que enterarse. Por eso se
 * recalcula aquí desde `Plot.delJuego` y no se guarda hecha.
 */
import { maximoQueJuntaUnaPersona, refutabilidadDe } from '../../../juegos/sombras-senda';
import {
  fichaDePapel,
  fichaDePorte,
  fichaDeContrasena,
  HORAS_DE_LA_NOCHE,
  nombreDeLaHora,
  pasoBatido,
  tramaDe,
} from '../../../juegos/sombras-trama';
import { saborDe, revisionDe } from '../../../plot/sombras-generacion';
import type { SaborSombras } from '../../../plot/sombras-generacion';
import { entidadesDe } from '../../../../../shared/juegos';
import type { Entidad } from '../../../../../shared/juegos';
import { sendasDe, cumpleCondicion } from '../../../../../shared/juegos/sombras-tipos';
import type {
  CondicionEscrita,
  PapelId,
  PasoId,
  PorteId,
  TramaSombras,
} from '../../../../../shared/juegos/sombras-tipos';
import type { GameSession, Plot } from '../../../../../shared/types';

// ---------------------------------------------------------------------------
// Los disfraces, dichos para quien los va a leer en papel
// ---------------------------------------------------------------------------

export interface DisfrazEscrito {
  /** Cómo se llama el papel en el dosier. */
  rol: string;
  /** El kanji, para el sello del cartel. */
  kanji: string;
  /** Qué hace, en segunda persona y sin jerga. */
  texto: string;
  /** Qué tiene que hacer quien dirige cuando alguien lo usa. */
  arbitraje: string;
}

/**
 * La tabla de arbitraje de cada disfraz.
 *
 * El ROL y el KANJI salen de `juegos/sombras-trama.ts`, que es donde viven: aquí
 * NO se duplican. Lo que sí es propio del papel es el ARBITRAJE —qué tiene que
 * hacer con la mano quien dirige cuando alguien invoca— y eso no existe en
 * ninguna otra parte, porque en la app lo hace el servidor solo.
 *
 * Es la diferencia con el gemelo de la Momia, que copió la tabla entera y ahora
 * tiene dos sitios donde cambiar el texto de un don.
 */
const ARBITRAJE: Record<PapelId, string> = {
  rastrear: 'Dale un hito extra del montón de esa hora, sin decir en voz alta cuál.',
  amparar:
    'Anota a quién ampara. Si esa persona pisó el paso batido esta hora, el rastro NO sube; y si ya había subido por ella, bájalo.',
  comprar: 'Baja el rastro de la columna en uno. Nunca por debajo de cero.',
  adelantarse:
    'Dile al oído qué paso batirán la hora SIGUIENTE. Es información cierta, y él decide qué hace con ella.',
  referir: 'El hito que elija pasa al centro de la mesa y se queda ahí el resto de la noche.',
  trocar:
    'Los dos se enseñan un hito que al otro le falte, en privado y a la vez. Nadie más lo ve.',
  falsear:
    'SOLO EL KANCHŌ. Dale uno de los hitos falsos preparados y déjale ponerlo en el centro sin comentarios. Apunta en qué paso dice haberlo leído.',
};

export function disfrazDe(papel: PapelId | undefined): DisfrazEscrito | undefined {
  if (!papel) return undefined;
  const ficha = fichaDePapel(papel);
  return {
    rol: ficha.rol,
    kanji: ficha.kanji,
    texto: ficha.que,
    arbitraje: ARBITRAJE[papel] ?? '',
  };
}

// ---------------------------------------------------------------------------
// La comprobación de la senda, rehecha sobre lo que hay guardado
// ---------------------------------------------------------------------------

export interface InformeDeLaSendaEscrito {
  /** Cuántas sendas cumplen TODOS los hitos ciertos. */
  soluciones: number;
  /** ¿Y esa única senda es la que la casa dio por verdadera? */
  unico: boolean;
  /** Hitos que se podrían quitar sin perder la unicidad. Vacío es lo bueno. */
  redundantes: CondicionEscrita[];
  /** Cuántos hitos puede juntar como mucho una sola persona. */
  maximoEnUnaMano: number;
  /** Cuántas sendas le quedarían a esa persona. Dos o más es lo bueno. */
  solucionesConEsaMano: number;
  /** Las falsas que la senda verdadera cumpliría. Vacío es lo bueno. */
  falsasQueNoEnganan: CondicionEscrita[];
  /** Cuántos hitos ciertos hacen falta, como mínimo, para desmentir la falsa más floja. */
  refutabilidadMinima: number;
  /** ¿Aparece cada hito cierto en algún paso y en alguna hora? */
  hitosSinSalir: CondicionEscrita[];
  ok: boolean;
}

/**
 * La mano de la persona más afortunada de la mesa.
 *
 * Entra en un paso por hora y se lleva lo que haya en él, así que la mano más
 * gorda posible es, hora a hora, el paso más cargado. Si con ESA mano el camino
 * ya tuviera una sola solución, alguien podría trazar la senda sin hablar con
 * nadie y el juego perdería su razón de ser.
 */
function laMejorManoPosible(trama: TramaSombras): CondicionEscrita[] {
  const porHora = new Map<number, Map<string, string[]>>();
  for (const h of trama.hallazgos) {
    const pasos = porHora.get(h.ronda) ?? new Map<string, string[]>();
    pasos.set(h.pasoId, [...(pasos.get(h.pasoId) ?? []), h.hitoId]);
    porHora.set(h.ronda, pasos);
  }
  const ids = new Set<string>();
  for (const pasos of porHora.values()) {
    const mejor = [...pasos.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    for (const id of mejor) ids.add(id);
  }
  return trama.condiciones.filter((c) => ids.has(c.id));
}

export function comprobarLaSenda(trama: TramaSombras, pasos: Entidad[]): InformeDeLaSendaEscrito {
  const ids = pasos.map((p) => p.id as PasoId);
  const ciertas = trama.condiciones.map((c) => c.condicion);
  const tramos = trama.sendaVerdadera.length;
  const soluciones = sendasDe(ids, ciertas, tramos);
  const unico =
    soluciones.length === 1 && soluciones[0]!.join('|') === trama.sendaVerdadera.join('|');

  const redundantes = trama.condiciones.filter((c) => {
    const sinElla = ciertas.filter((x) => x !== c.condicion);
    return sinElla.length > 0 && sendasDe(ids, sinElla, tramos).length === 1;
  });

  const mano = laMejorManoPosible(trama);
  const solucionesConEsaMano = sendasDe(ids, mano.map((c) => c.condicion), tramos).length;

  const falsasQueNoEnganan = trama.falsasCandidatas.filter((f) =>
    cumpleCondicion(trama.sendaVerdadera, f.condicion),
  );
  const refutabilidades = trama.falsasCandidatas.map((f) =>
    refutabilidadDe(ids, ciertas, f.condicion, tramos),
  );
  const refutabilidadMinima = refutabilidades.length ? Math.min(...refutabilidades) : Infinity;

  const encontrables = new Set(trama.hallazgos.map((h) => h.hitoId));
  const hitosSinSalir = trama.condiciones.filter((c) => !encontrables.has(c.id));

  return {
    soluciones: soluciones.length,
    unico,
    redundantes,
    maximoEnUnaMano: maximoQueJuntaUnaPersona(trama.hallazgos),
    solucionesConEsaMano,
    falsasQueNoEnganan,
    refutabilidadMinima,
    hitosSinSalir,
    ok:
      unico &&
      redundantes.length === 0 &&
      solucionesConEsaMano >= 2 &&
      falsasQueNoEnganan.length === 0 &&
      hitosSinSalir.length === 0,
  };
}

// ---------------------------------------------------------------------------
// La vista
// ---------------------------------------------------------------------------

export interface HallazgoEscrito {
  hito: CondicionEscrita;
  paso?: Entidad;
  ronda: number;
}

export interface HoraEscrita {
  ronda: number;
  kanji: string;
  nombre: string;
  reloj: string;
  /** El paso que baten los cazadores esa hora. SOLO para quien prepara. */
  batido?: Entidad;
}

export interface VistaSombrasPapel {
  /** ¿Esta partida trae de verdad una trama de este juego? */
  hay: boolean;
  trama?: TramaSombras;
  sabor?: SaborSombras;
  revision?: ReturnType<typeof revisionDe>;
  escoltas: Entidad[];
  pasos: Entidad[];
  enseres: Entidad[];
  estandartes: Entidad[];
  /** Cuántas horas tiene la noche. */
  horas: HoraEscrita[];
  /** Los hitos ciertos, agrupados por hora y con su paso resuelto. */
  hallazgos: HallazgoEscrito[];
  /** La senda, en orden. SOLO para los documentos de quien prepara. */
  sendaVerdadera: Array<Entidad | undefined>;
  /** Quién cobra de Akechi, si la trama lo dice. */
  kancho?: { entidad?: Entidad; personaje?: string };
  /** El disfraz de cada persona, con su texto de papel. */
  disfrazDe: (suspectId: string) => DisfrazEscrito | undefined;
  /** El estandarte de cada persona. */
  estandarteDe: (suspectId: string) => Entidad | undefined;
  /** El porte de un enser, si lo tiene. */
  porteDe: (enserId: string) => ReturnType<typeof fichaDePorte>;
  /** Quién carga cada enser al empezar. */
  cargaInicialDe: (enserId: string) => Entidad | undefined;
  /** La contraseña de un paso, con su kanji. SOLO para carteles y para quien prepara. */
  contrasenaDe: (pasoId: string) => ReturnType<typeof fichaDeContrasena>;
  nombreDePaso: (id: string) => string;
  informe?: InformeDeLaSendaEscrito;
}

export function vistaDeLasSombras(game: GameSession, plot: Plot): VistaSombrasPapel {
  const trama = tramaDe(plot);
  const sabor = saborDe(plot);
  const escoltas = entidadesDe(game, 'escoltas');
  const pasos = entidadesDe(game, 'pasos');
  const enseres = entidadesDe(game, 'enseres');
  const estandartes = entidadesDe(game, 'estandartes');

  const buscar = (lista: Entidad[], id: string): Entidad | undefined =>
    lista.find((e) => e.id === id);

  const kanchoId = plot.solution?.respuestas?.kancho;

  return {
    hay: Boolean(trama),
    trama,
    sabor,
    revision: revisionDe(plot),
    escoltas,
    pasos,
    enseres,
    estandartes,
    horas: (trama?.batidos ?? []).map((_, i) => {
      const ronda = i + 1;
      const h = HORAS_DE_LA_NOCHE[i % HORAS_DE_LA_NOCHE.length]!;
      const batidoId = pasoBatido(trama?.batidos ?? [], ronda);
      return {
        ronda,
        kanji: h.kanji,
        nombre: nombreDeLaHora(ronda),
        reloj: h.reloj,
        batido: batidoId ? buscar(pasos, batidoId) : undefined,
      };
    }),
    hallazgos: (trama?.hallazgos ?? [])
      .flatMap((h): HallazgoEscrito[] => {
        /*
         * Un hallazgo que apunte a un hito que ya no existe se descarta: pasa si
         * alguien tocó la trama a mano, y una tira sin texto en una habitación es
         * peor que una tira de menos.
         */
        const hito = trama!.condiciones.find((c) => c.id === h.hitoId);
        if (!hito) return [];
        return [{ hito, paso: buscar(pasos, h.pasoId), ronda: h.ronda }];
      })
      .sort(
        (a, b) => a.ronda - b.ronda || (a.paso?.name ?? '').localeCompare(b.paso?.name ?? ''),
      ),
    sendaVerdadera: (trama?.sendaVerdadera ?? []).map((id) => buscar(pasos, id)),
    kancho: kanchoId
      ? {
          entidad: buscar(escoltas, kanchoId),
          personaje: plot.characters.find((c) => c.suspectId === kanchoId)?.characterName,
        }
      : undefined,
    disfrazDe: (suspectId: string) => disfrazDe(trama?.papeles[suspectId]),
    estandarteDe: (suspectId: string) => {
      const id = trama?.estandartes[suspectId];
      return id ? buscar(estandartes, id) : undefined;
    },
    porteDe: (enserId: string) => fichaDePorte(trama?.portes[enserId] as PorteId | undefined),
    cargaInicialDe: (enserId: string) => {
      const quien = trama?.cargaInicial[enserId];
      return quien ? buscar(escoltas, quien) : undefined;
    },
    contrasenaDe: (pasoId: string) => fichaDeContrasena(trama?.contrasenas[pasoId] ?? ''),
    nombreDePaso: (id: string) => buscar(pasos, id)?.name ?? id,
    informe: trama ? comprobarLaSenda(trama, pasos) : undefined,
  };
}
