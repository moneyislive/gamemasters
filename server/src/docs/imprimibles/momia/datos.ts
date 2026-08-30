/**
 * Lo que los ocho imprimibles de la Momia necesitan saber, calculado UNA vez.
 *
 * Mismo motivo que `docs/datos.ts` en CLUEDO: el riesgo real de componer ocho
 * documentos desde plantillas independientes es que se contradigan entre sí —que
 * la guía anuncie una cámara profanada y la tabla de marcas otra—. Aquí se
 * deduce todo una vez y lo consume quien lo necesite.
 *
 * Y hay una razón de más, propia de este juego: el informe del papiro tiene que
 * DEMOSTRAR que el puzle tiene una sola solución y que nadie lo resuelve solo.
 * Esa demostración se hace sobre la trama guardada, no sobre la que se generó:
 * si alguien tocase la partida después, el informe tiene que enterarse. Por eso
 * se recalcula aquí desde `Plot.delJuego` y no se guarda hecha.
 */
import { maximoQueJuntaUnaPersona, refutabilidad } from '../../../juegos/momia-puzle';
import { saborDe, tramaDe } from '../../../plot/momia-generacion';
import type { SaborMomia } from '../../../plot/momia-generacion';
import { entidadesDe } from '../../../../../shared/juegos';
import type { Entidad } from '../../../../../shared/juegos';
import { solucionesDe } from '../../../../../shared/juegos/momia-tipos';
import type {
  DonId,
  RestriccionEscrita,
  RitoId,
  TramaMomia,
} from '../../../../../shared/juegos/momia-tipos';
import type { GameSession, Plot } from '../../../../../shared/types';

// ---------------------------------------------------------------------------
// Los dones, dichos para quien los va a leer en papel
// ---------------------------------------------------------------------------

export interface DonEscrito {
  /** Cómo se llama el papel. */
  rol: string;
  /** Cómo se llama el don. */
  nombre: string;
  /** Qué hace, en segunda persona y sin jerga. */
  texto: string;
  /** Qué tiene que hacer quien dirige cuando alguien lo invoca. */
  arbitraje: string;
  glifo: string;
}

/**
 * La tabla de dones.
 *
 * Está aquí y no en el manifiesto porque son TEXTOS DE PAPEL: la app enseña el
 * don con su propia pantalla y otras palabras. El manifiesto declara qué dones
 * existen (`DonId`); cómo se explican en una hoja que se lee a las once de la
 * noche es cosa de la imprenta.
 */
export const DONES: Record<DonId, DonEscrito> = {
  descifrar: {
    rol: 'Epigrafista',
    nombre: 'Descifrar',
    texto:
      'Lees lo que nadie más sabe leer. Una vez por vigilia recibes un fragmento de papiro más, en privado. Nadie tiene por qué enterarse de que lo tienes.',
    arbitraje: 'Dale un fragmento extra del montón de la vigilia, sin decir en voz alta cuál.',
    glifo: '𓅓',
  },
  sanar: {
    rol: 'Médico de campaña',
    nombre: 'Sanar',
    texto:
      'Una vez por vigilia le quitas una marca de la maldición a otra persona, sin gastar amuleto. A ti no puedes curarte.',
    arbitraje: 'Borra una marca de la persona elegida en la tabla. No puede ser quien invoca.',
    glifo: '𓋴',
  },
  proteger: {
    rol: 'Guardián de la concesión',
    nombre: 'Proteger',
    texto:
      'Una vez por vigilia eliges a alguien: esa noche la maldición no le alcanza, aunque entre en la cámara profanada.',
    arbitraje: 'Anota a quién protege ANTES de resolver la exploración. Si entra en la profanada, no marca.',
    glifo: '𓊸',
  },
  sobornar: {
    rol: 'Mecenas de la expedición',
    nombre: 'Sobornar',
    texto:
      'Tienes tratos con los guardianes. Una vez por vigilia te dicen en privado qué cámara se profanará la vigilia SIGUIENTE.',
    arbitraje: 'Dile al oído la cámara profanada de la vigilia que viene. Es información cierta.',
    glifo: '𓋞',
  },
  documentar: {
    rol: 'Fotógrafo de la misión',
    nombre: 'Documentar',
    texto:
      'Una vez por vigilia haces público uno de tus fragmentos: lo pones sobre la mesa y ya lo puede leer cualquiera.',
    arbitraje: 'El fragmento pasa al centro de la mesa y se queda ahí el resto de la noche.',
    glifo: '𓁹',
  },
  excavar: {
    rol: 'Capataz de la excavación',
    nombre: 'Excavar',
    texto:
      'Mandas la cuadrilla. Una vez por vigilia entras en una SEGUNDA cámara y te llevas lo que haya, a cambio de una marca extra.',
    arbitraje: 'Resuelve la segunda cámara igual que la primera y súmale una marca, además de las que le toquen.',
    glifo: '𓂭',
  },
  falsificar: {
    rol: 'Escriba de la sombra',
    nombre: 'Falsificar',
    texto:
      'Sabes imitar la mano de un escriba muerto. Una vez por vigilia pones sobre la mesa un fragmento FALSO como si lo hubieras encontrado.',
    arbitraje:
      'SOLO EL SAQUEADOR. Dale una de las falsas preparadas y déjale ponerla en el centro sin comentarios.',
    glifo: '𓆙',
  },
};

// ---------------------------------------------------------------------------
// La comprobación del puzle, rehecha sobre lo que hay guardado
// ---------------------------------------------------------------------------

export interface InformeDelPapiro {
  /** Cuántos órdenes cumplen TODOS los fragmentos ciertos. */
  soluciones: number;
  /** ¿Y ese único orden es el que la casa dio por verdadero? */
  unico: boolean;
  /** Fragmentos que se podrían quitar sin perder la unicidad. Vacío es lo bueno. */
  redundantes: RestriccionEscrita[];
  /** Cuántos fragmentos puede juntar como mucho una sola persona. */
  maximoEnUnaMano: number;
  /** Cuántos órdenes le quedarían a esa persona. Dos o más es lo bueno. */
  solucionesConEsaMano: number;
  /** Las falsas que el orden verdadero cumpliría, si hubiera alguna. Vacío es lo bueno. */
  falsasQueNoEnganan: RestriccionEscrita[];
  /** Cuántos fragmentos ciertos hacen falta, como mínimo, para desmentir la falsa más floja. */
  refutabilidadMinima: number;
  ok: boolean;
}

/**
 * La mano de la persona más afortunada de la mesa.
 *
 * Entra en una cámara por vigilia y se lleva lo que haya en ella, así que la
 * mano más gorda posible es, vigilia a vigilia, la cámara más cargada. Si con
 * ESA mano el puzle ya tuviera una sola solución, alguien podría sellar la tumba
 * sin hablar con nadie y el juego perdería su razón de ser.
 */
function laMejorManoPosible(trama: TramaMomia): RestriccionEscrita[] {
  const porRonda = new Map<number, Map<string, string[]>>();
  for (const h of trama.hallazgos) {
    const camaras = porRonda.get(h.ronda) ?? new Map<string, string[]>();
    camaras.set(h.camaraId, [...(camaras.get(h.camaraId) ?? []), h.fragmentoId]);
    porRonda.set(h.ronda, camaras);
  }
  const ids = new Set<string>();
  for (const camaras of porRonda.values()) {
    const mejor = [...camaras.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    for (const id of mejor) ids.add(id);
  }
  return trama.restricciones.filter((r) => ids.has(r.id));
}

export function comprobarElPapiro(trama: TramaMomia, ritos: Entidad[]): InformeDelPapiro {
  const ids = ritos.map((r) => r.id as RitoId);
  const ciertas = trama.restricciones.map((r) => r.restriccion);
  const soluciones = solucionesDe(ids, ciertas);
  const unico =
    soluciones.length === 1 && soluciones[0]!.join('|') === trama.ordenVerdadero.join('|');

  const redundantes = trama.restricciones.filter((r) => {
    const sinElla = ciertas.filter((x) => x !== r.restriccion);
    return sinElla.length > 0 && solucionesDe(ids, sinElla).length === 1;
  });

  const mano = laMejorManoPosible(trama);
  const solucionesConEsaMano = solucionesDe(ids, mano.map((r) => r.restriccion)).length;

  const falsasQueNoEnganan = trama.falsasCandidatas.filter((f) =>
    solucionesDe(ids, [f.restriccion]).some((o) => o.join('|') === trama.ordenVerdadero.join('|')),
  );
  const refutabilidades = trama.falsasCandidatas.map((f) =>
    refutabilidad(ids, ciertas, f.restriccion),
  );
  const refutabilidadMinima = refutabilidades.length ? Math.min(...refutabilidades) : Infinity;

  return {
    soluciones: soluciones.length,
    unico,
    redundantes,
    maximoEnUnaMano: maximoQueJuntaUnaPersona(trama.hallazgos),
    solucionesConEsaMano,
    falsasQueNoEnganan,
    refutabilidadMinima,
    ok:
      unico &&
      redundantes.length === 0 &&
      solucionesConEsaMano >= 2 &&
      falsasQueNoEnganan.length === 0,
  };
}

// ---------------------------------------------------------------------------
// La vista
// ---------------------------------------------------------------------------

export interface HallazgoEscrito {
  fragmento: RestriccionEscrita;
  camara?: Entidad;
  ronda: number;
}

export interface VistaMomia {
  /** ¿Esta partida trae de verdad una trama de la Momia? */
  hay: boolean;
  trama?: TramaMomia;
  sabor?: SaborMomia;
  expedicionarios: Entidad[];
  camaras: Entidad[];
  reliquias: Entidad[];
  ritos: Entidad[];
  /** Cuántas vigilias tiene la noche. */
  vigilias: number;
  /** La cámara profanada en cada vigilia, por índice de ronda - 1. */
  profanadas: Array<Entidad | undefined>;
  /** Los fragmentos ciertos, agrupados por vigilia y con su cámara resuelta. */
  hallazgos: HallazgoEscrito[];
  /** Los ritos en el orden verdadero. SOLO para los documentos de quien dirige. */
  ordenVerdadero: Array<Entidad | undefined>;
  /** Quién rompió el sello, si la trama lo dice. */
  saqueador?: { entidad?: Entidad; personaje?: string };
  /** El don de cada expedicionario, con su texto de papel. */
  donDe: (participanteId: string) => DonEscrito | undefined;
  nombreDeRito: (id: string) => string;
  nombreDeCamara: (id: string) => string;
  informe?: InformeDelPapiro;
}

export function vistaDeLaMomia(game: GameSession, plot: Plot): VistaMomia {
  const trama = tramaDe(plot);
  const sabor = saborDe(plot);
  const expedicionarios = entidadesDe(game, 'expedicionarios');
  const camaras = entidadesDe(game, 'camaras');
  const reliquias = entidadesDe(game, 'reliquias');
  const ritos = entidadesDe(game, 'ritos');

  const buscar = (lista: Entidad[], id: string): Entidad | undefined =>
    lista.find((e) => e.id === id);

  const saqueadorId = plot.solution?.respuestas?.saqueador;

  return {
    hay: Boolean(trama),
    trama,
    sabor,
    expedicionarios,
    camaras,
    reliquias,
    ritos,
    vigilias: trama?.profanadas.length ?? 0,
    profanadas: (trama?.profanadas ?? []).map((id) => buscar(camaras, id)),
    hallazgos: (trama?.hallazgos ?? [])
      .flatMap((h): HallazgoEscrito[] => {
        // Un hallazgo que apunte a un fragmento que ya no existe se descarta:
        // pasa si alguien tocó la trama a mano, y una tira sin texto en la mesa
        // es peor que una tira de menos.
        const fragmento = trama!.restricciones.find((r) => r.id === h.fragmentoId);
        if (!fragmento) return [];
        return [{ fragmento, camara: buscar(camaras, h.camaraId), ronda: h.ronda }];
      })
      .sort((a, b) => a.ronda - b.ronda || (a.camara?.name ?? '').localeCompare(b.camara?.name ?? '')),
    ordenVerdadero: (trama?.ordenVerdadero ?? []).map((id) => buscar(ritos, id)),
    saqueador: saqueadorId
      ? {
          entidad: buscar(expedicionarios, saqueadorId),
          personaje: plot.characters.find((c) => c.participanteId === saqueadorId)?.characterName,
        }
      : undefined,
    donDe: (participanteId: string) => {
      const don = trama?.dones[participanteId];
      return don ? DONES[don] : undefined;
    },
    nombreDeRito: (id: string) => buscar(ritos, id)?.name ?? id,
    nombreDeCamara: (id: string) => buscar(camaras, id)?.name ?? id,
    informe: trama ? comprobarElPapiro(trama, ritos) : undefined,
  };
}
