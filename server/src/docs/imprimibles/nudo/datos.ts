/**
 * Lo que los nueve imprimibles de este juego necesitan saber, calculado UNA vez.
 *
 * Mismo motivo que `docs/datos.ts` en CLUEDO y que sus gemelos de la Momia y
 * las Sombras: el riesgo real de componer nueve documentos desde plantillas
 * independientes es que se CONTRADIGAN —que la guía diga que el Correo sale el
 * cuarto y la hoja del cuadro verdadero diga que el quinto—. Aquí se deduce
 * todo una vez y lo consume quien lo necesite.
 *
 * Y hay una razón de más, propia de este juego: el informe del cuadro tiene que
 * DEMOSTRAR que hay una sola solución y que nadie puede sacarla solo. Esa
 * demostración se hace sobre la trama GUARDADA, no sobre la que se generó: si
 * alguien tocase la partida después, el informe tiene que enterarse. Por eso se
 * recalcula aquí desde `Plot.delJuego` y no se guarda hecha.
 */
import { entidadesDe } from '../../../../../shared/juegos';
import {
  cuadrosDe,
  horaDeFranja,
  HORAS_DE_FRANJA,
  MANA_DE_OFICIO,
  MARGEN_EXTRA_EN_TU_OFICIO,
  MARGEN_POR_CONSULTA,
  MARGEN_POR_INSTRUMENTO,
  MARGEN_POR_RECUPERAR,
  NOMBRE_DE_OFICIO,
  OFICIO_DE_PERSONA,
  RETRASO_POR_CONVOY_VARADO,
  RETRASO_POR_FRANJA_PERDIDA,
  RETRASO_POR_ORDEN_RECHAZADA,
  RETRASO_QUE_RECUPERA,
} from '../../../../../shared/juegos/nudo-tipos';
import { tramaDe } from '../../../juegos/nudo-trama';
import type { Entidad } from '../../../../../shared/juegos';
import type {
  OficioId,
  TelegramaEscrito,
  TramaNudo,
} from '../../../../../shared/juegos/nudo-tipos';
import type { GameSession, Plot } from '../../../../../shared/types';

/** Una franja, con todo lo que hay que saber de ella para imprimirla. */
export interface FranjaEscrita {
  /** 1..6 */
  numero: number;
  /** «02:00» */
  hora: string;
  /** El convoy que le toca. SOLO va en los documentos de quien prepara. */
  convoyId: string;
  convoyNombre: string;
  /** El parte de novedades que se lee en voz alta al abrirla. */
  parte: string;
}

/** Un convoy, con su carga y su papel en la noche. */
export interface ConvoyEscrito {
  id: string;
  nombre: string;
  descripcion?: string;
  carga?: string;
  esCorreo: boolean;
}

/** Una persona del turno, con su oficio, su maña y sus tiras. */
export interface FerroviarioEscrito {
  id: string;
  nombre: string;
  /** El nombre del personaje que le escribió la trama. */
  personaje: string;
  descripcion?: string;
  photoUrl?: string;
  oficio: OficioId;
  /** «guardagujas» */
  oficioNombre: string;
  /** «Garita de agujas» */
  instrumento: string;
  mana: { nombre: string; texto: string };
  /** Su cara pública, su secreto y su gancho, si la trama se los escribió. */
  caraPublica: string;
  secreto: string;
  gancho: string;
  /** SUS tiras de telegrama. No las de nadie más. */
  telegramas: TelegramaEscrito[];
}

/** Un puesto de la estación, con el oficio que se ejerce en él. */
export interface PuestoEscrito {
  id: string;
  nombre: string;
  descripcion?: string;
  oficio: OficioId;
  oficioNombre: string;
  /** Qué se hace ahí, en una frase, para el cartel de la puerta. */
  queSeHace: string;
}

/** La comprobación de las cuatro garantías, rehecha sobre lo guardado. */
export interface InformeEscrito {
  /** Cuántos cuadros cumplen TODOS los telegramas. Uno es lo correcto. */
  soluciones: number;
  /** ¿Y ese único cuadro es el que la casa dio por verdadero? */
  unico: boolean;
  /** Telegramas que se podrían quitar sin perder la unicidad. Vacío es lo bueno. */
  redundantes: TelegramaEscrito[];
  /** Cuántos cuadros admiten los telegramas de cada persona. Dos o más es lo bueno. */
  porPersona: Array<{ nombre: string; telegramas: number; cuadros: number }>;
  /** ¿Todo el mundo tiene al menos una tira? */
  todosConPapel: boolean;
  ok: boolean;
}

/** Todo lo que hace falta para imprimir esta partida. */
export interface VistaDelNudo {
  hay: boolean;
  trama?: TramaNudo;
  franjas: FranjaEscrita[];
  convoyes: ConvoyEscrito[];
  ferroviarios: FerroviarioEscrito[];
  puestos: PuestoEscrito[];
  correo?: ConvoyEscrito;
  retrasoMaximo: number;
  informe?: InformeEscrito;
  /** Los números de la economía, para no escribirlos a mano en cinco sitios. */
  tarifa: {
    ordenRechazada: number;
    franjaPerdida: number;
    convoyVarado: number;
    margenPorInstrumento: number;
    margenExtra: number;
    consulta: number;
    recuperar: number;
    recupera: number;
  };
}

/** Qué se hace en cada puesto, en una frase. Para el cartel de la puerta. */
const QUE_SE_HACE: Record<OficioId, string> = {
  agujas: 'Se ordena una rama de vagones con dos vías muertas.',
  telegrafo: 'Se toma al oído el parte que llega en Morse.',
  enclavamiento: 'Se da itinerario bajando las palancas justas.',
  muelle: 'Se reparte la carga sin pasarse de peso.',
};

const VACIA: VistaDelNudo = {
  hay: false,
  franjas: [],
  convoyes: [],
  ferroviarios: [],
  puestos: [],
  retrasoMaximo: 0,
  tarifa: {
    ordenRechazada: RETRASO_POR_ORDEN_RECHAZADA,
    franjaPerdida: RETRASO_POR_FRANJA_PERDIDA,
    convoyVarado: RETRASO_POR_CONVOY_VARADO,
    margenPorInstrumento: MARGEN_POR_INSTRUMENTO,
    margenExtra: MARGEN_EXTRA_EN_TU_OFICIO,
    consulta: MARGEN_POR_CONSULTA,
    recuperar: MARGEN_POR_RECUPERAR,
    recupera: RETRASO_QUE_RECUPERA,
  },
};

/**
 * La vista de una partida, para imprimirla.
 *
 * Devuelve `hay: false` si esta partida no es de este juego o todavía no tiene
 * trama. Las nueve plantillas lo comprueban y sacan la hoja de `sinTrama`: es lo
 * único que impide que una partida a medias tumbe la descarga del paquete.
 */
export function vistaDelNudo(game: GameSession, plot: Plot): VistaDelNudo {
  const trama = tramaDe(plot);
  if (!trama) return VACIA;

  const convoyesEnt = entidadesDe(game, 'convoyes');
  const ferroviariosEnt = entidadesDe(game, 'ferroviarios');
  const puestosEnt = entidadesDe(game, 'puestos');
  const mercanciasEnt = entidadesDe(game, 'mercancias');

  const nombreDe = (lista: Entidad[], id: string): string =>
    lista.find((e) => e.id === id)?.name ?? id;

  const convoyes: ConvoyEscrito[] = convoyesEnt.map((c) => ({
    id: c.id,
    nombre: c.name,
    descripcion: c.description,
    carga: trama.cargaDeConvoy[c.id]
      ? nombreDe(mercanciasEnt, trama.cargaDeConvoy[c.id]!)
      : undefined,
    esCorreo: c.id === trama.correo,
  }));

  const franjas: FranjaEscrita[] = trama.cuadro.map((convoyId, i) => ({
    numero: i + 1,
    hora: horaDeFranja(i + 1) || (HORAS_DE_FRANJA[i] ?? ''),
    convoyId,
    convoyNombre: nombreDe(convoyesEnt, convoyId),
    parte: trama.partes[i] ?? '',
  }));

  const ferroviarios: FerroviarioEscrito[] = ferroviariosEnt.map((p) => {
    const oficio = trama.oficioDePersona[p.id] ?? 'agujas';
    const personaje = plot.characters.find((c) => c.participanteId === p.id);
    const mias = (trama.reparto[p.id] ?? [])
      .map((id) => trama.telegramas.find((t) => t.id === id))
      .filter((t): t is TelegramaEscrito => t !== undefined);
    return {
      id: p.id,
      nombre: p.name,
      personaje: personaje?.characterName ?? p.name,
      descripcion: p.description,
      photoUrl: p.photoUrl,
      oficio,
      oficioNombre: OFICIO_DE_PERSONA[oficio],
      instrumento: NOMBRE_DE_OFICIO[oficio],
      mana: MANA_DE_OFICIO[oficio],
      caraPublica: personaje?.publicPersona ?? '',
      secreto: personaje?.secret ?? '',
      gancho: personaje?.personalHook ?? '',
      telegramas: mias,
    };
  });

  const puestos: PuestoEscrito[] = puestosEnt.map((p) => {
    const oficio = trama.oficioDePuesto[p.id] ?? 'agujas';
    return {
      id: p.id,
      nombre: p.name,
      descripcion: p.description,
      oficio,
      oficioNombre: NOMBRE_DE_OFICIO[oficio],
      queSeHace: QUE_SE_HACE[oficio],
    };
  });

  return {
    hay: true,
    trama,
    franjas,
    convoyes,
    ferroviarios,
    puestos,
    correo: convoyes.find((c) => c.esCorreo),
    retrasoMaximo: trama.retrasoMaximo,
    informe: comprobarLoGuardado(trama, ferroviarios, convoyesEnt.map((c) => c.id)),
    tarifa: VACIA.tarifa,
  };
}

/**
 * Vuelve a pasar las garantías, sobre lo que hay guardado AHORA.
 *
 * ═══ POR QUÉ NO SE GUARDA EL INFORME HECHO ═══
 *
 * Porque lo que interesa saber al imprimir no es «¿estaba bien cuando se
 * generó?» sino «¿está bien AHORA?». Entre generar y imprimir, quien organiza
 * puede haber borrado un convoy, añadido a alguien o cambiado un nombre. Un
 * informe congelado seguiría diciendo que todo está en orden.
 *
 * Cuesta unos milisegundos: son 720 cuadros y unas quince comprobaciones.
 */
function comprobarLoGuardado(
  trama: TramaNudo,
  ferroviarios: FerroviarioEscrito[],
  convoyes: string[],
): InformeEscrito {
  const todos = trama.telegramas.map((t) => t.telegrama);
  const soluciones = cuadrosDe(convoyes, todos);
  const unico =
    soluciones.length === 1 && soluciones[0]!.join('|') === trama.cuadro.join('|');

  const redundantes = trama.telegramas.filter((t) => {
    const sinEl = todos.filter((x) => x !== t.telegrama);
    return sinEl.length > 0 && cuadrosDe(convoyes, sinEl).length === 1;
  });

  const porPersona = ferroviarios.map((p) => ({
    nombre: p.nombre,
    telegramas: p.telegramas.length,
    cuadros: cuadrosDe(
      convoyes,
      p.telegramas.map((t) => t.telegrama),
    ).length,
  }));

  const todosConPapel = porPersona.every((p) => p.telegramas >= 1);
  const nadieSolo = porPersona.every((p) => p.cuadros >= 2);

  return {
    soluciones: soluciones.length,
    unico,
    redundantes,
    porPersona,
    todosConPapel,
    ok: unico && redundantes.length === 0 && todosConPapel && nadieSolo,
  };
}
