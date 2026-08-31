/**
 * Qué ve CADA PERSONA del estado de la Momia.
 *
 * ESTE FICHERO ES LA DEFENSA ANTITRAMPAS DEL JUEGO ENTERO. El móvil de quien
 * juega es un entorno hostil: basta con abrir las herramientas del navegador
 * para leer cualquier cosa que se le haya enviado. Así que aquí no se «oculta»
 * nada del lado del cliente: sencillamente no se envía.
 *
 * LA REGLA DE ORO, sin excepciones, hasta el desenlace:
 *
 *   1. `ordenVerdadero` NO SALE. Si viajara, bastaría con mirar el JSON para
 *      ganar la partida y no habría nada más que jugar.
 *   2. El campo `falso` de un fragmento NO SALE, NI SIQUIERA AL SAQUEADOR. Si
 *      viajara, bastaría con mirarlo para saber de qué fiarse, y el supuesto que
 *      este juego rompe —que no toda la información es cierta— se cae entero.
 *      El texto de un fragmento falso sí sale, claro: está sobre la mesa.
 *   3. `falsificar` solo existe para quien puede usarlo. A cualquier otra
 *      persona no le llega ni la palabra: ni el don, ni las mentiras
 *      disponibles, ni una pista de que ese repertorio exista.
 *
 * SOBRE EL PUNTO 3, QUE ES UNA INTERPRETACIÓN Y CONVIENE QUE SE VEA. El diseño
 * dice que `falsificar` «no sale nunca hacia el móvil hasta el desenlace». Leído
 * al pie de la letra el don sería injugable: quien lo tiene necesita saber que
 * lo tiene y qué mentiras puede publicar. Se lee, pues, como lo que evidentemente
 * quiere decir —que no sale hacia QUIEN NO ES— y así queda escrito aquí para que
 * la próxima persona que lo lea no crea que se le coló.
 *
 * Lo comprueba `verify:momia`, que busca el orden verdadero dentro del JSON que
 * recibe el móvil y falla si aparece.
 */
import { donesDe, esElSaqueador, estadoDe } from './momia-acciones';
import { camaraProfanada, DONES_REPARTIBLES, tramaDe } from './momia-trama';
import { registrarProyeccion, registrarProyeccionParaGm } from './proyecciones';
import { selladoDe, trofeosDe } from './momia-sellado';
// Por la puerta principal, igual que en `momia-trama.ts` y por lo mismo.
import { entidadesDe, nombreDeEntidad } from '../../../shared/juegos';
import { MARCAS_PARA_TOCADO } from '../../../shared/juegos/momia-tipos';
import type {
  EstadoMomia, Restriccion } from '../../../shared/juegos/momia-tipos';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';
import type { EstadoMomiaParaElPanel } from '../../../shared/juegos';

/** Un fragmento tal y como se lee. Sin decir si es verdad. */
export interface FragmentoVisto {
  id: string;
  texto: string;
  /** ¿Está sobre la mesa o solo en tu mano? */
  publico: boolean;
  /** Quién lo puso sobre la mesa, si alguien lo hizo. */
  publicadoPor?: string;
  publicadoPorNombre?: string;
  /**
   * La restricción, en datos.
   *
   * POR QUÉ NO ES UNA FUGA, que es la pregunta que hay que hacerse antes de
   * añadir cualquier cosa a esta vista: `texto` YA dice exactamente esto, solo
   * que en prosa de papiro —«el Rito del Agua precede al del Aliento»— y la
   * generación valida que la frase y la restricción digan lo mismo. Mandar la
   * forma estructurada no añade ni un dato que no estuviera ya viajando.
   *
   * Lo secreto de un fragmento es `falso`, no lo que afirma. Y `falso` sigue
   * saliendo solo en el desenlace.
   *
   * POR QUÉ HACE FALTA: sin ella, la app tendría que volver a parsear la prosa
   * para saber qué casilla tachar, que es justo lo que el diseño prohíbe —la
   * lógica la garantiza el código, no la interpretación de un texto—. Mientras
   * no llegaba, la pantalla del papiro ocultaba su tablero entero: un tablero en
   * blanco no se lee como «todavía no» sino como «no hay nada descartado», que
   * es mentira y de las que hacen perder una partida.
   */
  restriccion: Restriccion;
  /** Solo en el desenlace: si era mentira. Antes, nunca. */
  falso?: boolean;
}

/** Lo que se sabe de otra persona con solo mirarla. */
export interface CompaneroVisto {
  participanteId: string;
  marcas: number;
  amuletos: number;
  tocado: boolean;
  /** ¿Ha entregado ya su propuesta de sellado? Qué propone, no se dice. */
  haPropuesto: boolean;
}

export interface VistaMomia {
  vigilia: {
    ronda: number;
    /** La cámara profanada de ESTA vigilia. Es información pública. */
    profanada?: string;
    profanadaNombre?: string;
    marcasParaTocado: number;
  };
  yo: {
    marcas: number;
    amuletos: number;
    tocado: boolean;
    don: string;
    /** Todos los que puedes usar. Dos solo para el saqueador. */
    donesDisponibles: string[];
    donRol: string;
    donQueHace: string;
    donUsadoEstaVigilia: boolean;
    /** Los que tienes en la mano, públicos o no. */
    fragmentos: FragmentoVisto[];
    miPropuesta?: string[];
    /** Lo que te sopló el soborno: la cámara de la vigilia siguiente. */
    sabeQueSeProfanara?: string;
  };
  /** Los fragmentos que están sobre la mesa, los tenga quien los tenga. */
  papiro: FragmentoVisto[];
  mesa: CompaneroVisto[];
  ritos: Array<{ id: string; nombre: string; descripcion?: string }>;
  /** Solo para quien rompió el sello. Al resto no le llega ni la clave. */
  saqueo?: {
    mentiras: Array<{ id: string; texto: string }>;
    /** Cuántas te quedan por publicar. */
    disponibles: number;
  };
  /** Solo con la partida terminada. Antes, `undefined`. */
  desenlace?: {
    ordenVerdadero: Array<{ id: string; nombre: string }>;
    ordenEjecutado: Array<{ id: string; nombre: string }>;
    correcto: boolean;
    gana: 'expedicion' | 'saqueador';
    saqueadorId: string;
    ganadores: string[];
    votos: Array<{ orden: string[]; apoyos: string[] }>;
    silenciadas: string[];
    trofeos: Record<string, string[]>;
  };
}

/**
 * Compone lo que ve una persona.
 *
 * Se registra con `registrarProyeccion`, que es el mecanismo hermano de
 * `registrarAcciones`: el motor no puede saber qué es secreto en un juego que no
 * conoce, así que decide el juego. CLUEDO no registra ninguna y su vista no
 * cambia ni un byte.
 */
export function vistaMomiaDe(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
): VistaMomia | undefined {
  const trama = tramaDe(game.plot);
  if (!trama) return undefined;

  const estado = estadoDe(game, sesion);
  const yo = estado.gente[participanteId];
  if (!yo) return undefined;

  const terminada = sesion.phase === 'desenlace';
  const ficha = DONES_REPARTIBLES.find((d) => d.don === yo.don);

  /*
   * Un fragmento, contado. `falso` solo se rellena con la partida terminada, y
   * es la línea más importante del fichero: mientras se juega, el campo NI
   * SIQUIERA EXISTE en el objeto, así que no puede colarse por serialización, ni
   * como `false`, ni como `undefined` que alguien luego lea como «no es falso».
   */
  const contar = (id: string): FragmentoVisto | undefined => {
    const f = estado.fragmentos[id];
    if (!f) return undefined;
    return {
      id: f.id,
      texto: f.texto,
      restriccion: f.restriccion,
      publico: f.publico,
      /*
       * CON NOMBRE, no solo con el id. La tarjeta del papiro tiene una línea
       * «Lo puso Fulano» que no se pintaba nunca porque el nombre no llegaba, y
       * el id no le dice nada a nadie. Quién puso un fragmento sobre la mesa es
       * público —se ve al hacerlo— y es la mitad de la conversación.
       */
      ...(f.publicadoPor
        ? {
            publicadoPor: f.publicadoPor,
            publicadoPorNombre:
              sesion.players.find((p) => p.participanteId === f.publicadoPor)?.displayName ?? '',
          }
        : {}),
      ...(terminada ? { falso: f.falso } : {}),
    };
  };

  const mios = yo.fragmentos.map(contar).filter((f): f is FragmentoVisto => Boolean(f));
  const publicos = Object.values(estado.fragmentos)
    .filter((f) => f.publico)
    .map((f) => contar(f.id))
    .filter((f): f is FragmentoVisto => Boolean(f));

  const profanada = camaraProfanada(estado.profanadas, sesion.round);
  const soborno = (sesion.estado?.['momia-vigilia'] as { sobornos?: Record<string, string> } | undefined)
    ?.sobornos?.[participanteId];

  const vista: VistaMomia = {
    vigilia: {
      ronda: sesion.round,
      ...(profanada
        ? { profanada, profanadaNombre: nombreDeEntidad(game, 'camaras', profanada) }
        : {}),
      marcasParaTocado: MARCAS_PARA_TOCADO,
    },
    yo: {
      marcas: yo.marcas,
      amuletos: yo.amuletos,
      tocado: yo.tocado,
      don: yo.don,
      /*
       * TODOS LOS DONES QUE PUEDES USAR, no solo el que aparentas.
       *
       * Casi siempre es uno y esta lista sobra. Para el saqueador son dos —el
       * suyo y `falsificar`— y ahí está el juego: sin poder elegir, la app le
       * mandaba siempre el primero y el traidor se quedaba sin su única
       * mecánica. No delata a nadie: quien no es saqueador recibe una lista de
       * un elemento, que es exactamente lo que ya sabía.
       */
      donesDisponibles: donesDe(game, estado, participanteId),
      donRol: ficha?.rol ?? '',
      donQueHace: ficha?.que ?? '',
      donUsadoEstaVigilia: yo.donUsadoEnRonda === sesion.round,
      fragmentos: mios,
      ...(estado.propuestas[participanteId] ? { miPropuesta: estado.propuestas[participanteId]!.orden } : {}),
      ...(soborno ? { sabeQueSeProfanara: nombreDeEntidad(game, 'camaras', soborno) } : {}),
    },
    papiro: publicos,
    // Las marcas y los amuletos son públicos: en la mesa se ven, y la hoja de
    // marcas de la partida en papel los lleva a la vista de todo el mundo.
    mesa: sesion.players
      .filter((p) => p.participanteId !== participanteId)
      .map((p) => {
        const suyo = estado.gente[p.participanteId];
        return {
          participanteId: p.participanteId,
          marcas: suyo?.marcas ?? 0,
          amuletos: suyo?.amuletos ?? 0,
          tocado: suyo?.tocado ?? false,
          // Que alguien ha propuesto es público; QUÉ ha propuesto, no. Saberlo
          // antes de tiempo convertiría el sellado en seguir al que va primero.
          haPropuesto: Boolean(estado.propuestas[p.participanteId]),
        };
      }),
    /*
     * CON SU DESCRIPCIÓN. La pantalla del sellado tiene una rama para pintarla
     * —«Balanza: quien entre saldrá con un fragmento y con una marca»— y no se
     * evaluaba a cierto jamás, porque aquí solo se mandaban el id y el nombre.
     * Es texto que quien dirige escribió al montar la partida y que ayuda a
     * decidir el orden: no tiene ningún motivo para quedarse en el servidor.
     */
    ritos: entidadesDe(game, 'ritos').map((r) => ({
      id: r.id,
      nombre: r.name,
      ...(r.description?.trim() ? { descripcion: r.description.trim() } : {}),
    })),
  };

  /*
   * LA CLAVE `saqueo` SOLO SE AÑADE SI ERES EL SAQUEADOR. No se pone a
   * `undefined` para el resto: se omite. Es la diferencia entre «no tienes
   * mentiras» y «aquí no hay mentiras que tener», y la primera ya sería un dato.
   */
  if (esElSaqueador(game, participanteId) && donesDe(game, estado, participanteId).includes('falsificar')) {
    const yaPublicadas = new Set(
      Object.values(estado.fragmentos).filter((f) => f.falso).map((f) => f.id),
    );
    const disponibles = trama.falsasCandidatas.filter((f) => !yaPublicadas.has(f.id));
    vista.saqueo = {
      mentiras: disponibles.map((f) => ({ id: f.id, texto: f.texto })),
      disponibles: disponibles.length,
    };
  }

  // ---- El desenlace: la ÚNICA puerta por la que sale el orden verdadero ----
  if (terminada) {
    const resultado = selladoDe(game, sesion);
    const conNombre = (ids: string[]) =>
      ids.map((id) => ({ id, nombre: nombreDeEntidad(game, 'ritos', id) }));
    vista.desenlace = {
      ordenVerdadero: conNombre(estado.ordenVerdadero),
      ordenEjecutado: conNombre(resultado.ordenEjecutado),
      correcto: resultado.correcto,
      gana: resultado.gana,
      saqueadorId: resultado.saqueadorId,
      ganadores: resultado.ganadores,
      votos: resultado.votos.map((v) => ({ orden: v.orden, apoyos: v.apoyos })),
      silenciadas: resultado.silenciadas,
      trofeos: trofeosDe(game, sesion, resultado),
    };
  }

  return vista;
}

registrarProyeccion('momia', (game, sesion, participanteId) => vistaMomiaDe(game, sesion, participanteId));

/**
 * Lo que puede ver quien dirige A CIEGAS del estado de la expedición.
 *
 * LO QUE NO SALE: `ordenVerdadero`, `restricciones`, cuáles son falsas y las
 * propuestas que haya entregado cada cual. Los tres primeros son la solución;
 * el cuarto convierte el sellado en seguir al que va primero.
 *
 * LO QUE SÍ SALE, porque lo necesita para dirigir y porque en la mesa se ve:
 * qué cámara está profanada, las marcas y los amuletos de cada cual, y qué
 * fragmentos están ya sobre la mesa —que son públicos por definición—.
 *
 * Sin esto registrado, a ciegas el panel se quedaría sin nada que enseñar: el
 * filtro falla cerrado a propósito, y esta función es lo que lo abre justo lo
 * necesario.
 */
/** Un fragmento tal y como lo ve quien dirige: con texto solo si está sobre la mesa. */
type FragmentoParaGm = { id: string; texto?: string; publico: boolean };

/**
 * El universo de fragmentos que ve quien dirige, sembrado con las candidatas.
 *
 * Se ordena por id, y eso no es cosmética: si las candidatas se quedaran al
 * final de la lista, el orden de las claves diría cuáles son igual de bien que
 * el recuento.
 */
function universoDeFragmentos(game: GameSession, estado: EstadoMomia): Array<[string, FragmentoParaGm]> {
  const universo = new Map<string, FragmentoParaGm>();
  for (const f of tramaDe(game.plot)?.falsasCandidatas ?? []) {
    universo.set(f.id, { id: f.id, publico: false });
  }
  // El estado manda: una candidata que ya está en juego pisa su semilla.
  for (const f of Object.values(estado.fragmentos)) {
    universo.set(f.id, f.publico ? { id: f.id, texto: f.texto, publico: true } : { id: f.id, publico: false });
  }
  return [...universo.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/*
 * EL TIPO DE RETORNO NO ES ADORNO. `ProyeccionParaGm` devuelve `unknown`, asi
 * que sin esta firma nada comprueba que lo que se manda aqui sea lo que el
 * panel del taller espera. Con ella, renombrar un campo rompe la compilacion en
 * vez de dejar una tarjeta del puesto de mando sin pintar.
 */
registrarProyeccionParaGm('momia', (game, sesion): { momia: EstadoMomiaParaElPanel } | undefined => {
  const estado = (sesion.estado as { momia?: EstadoMomia } | undefined)?.momia;
  if (!estado) return undefined;

  const publicos = Object.values(estado.fragmentos).filter((f) => f.publico);
  return {
    momia: {
      /*
       * SOLO HASTA LA VIGILIA DE ESTA NOCHE, nunca el calendario entero.
       *
       * Iba completo, así que quien dirige jugando veía de antemano qué cámara
       * se profana cada una de las noches que quedan — o sea, qué habitaciones
       * evitar para amanecer sin una sola marca. Es el trofeo «Incorrupto» de
       * regalo, y por esa misma razón la lista completa se sacó de la Guía de
       * la expedición a las tiras de papiro, que son de quien prepara.
       *
       * Recortado y no sustituido: el panel indexa por `sesion.round - 1`, así
       * que las noches ya vividas tienen que seguir en su sitio. Esas ya las ha
       * visto; las que no han pasado no son suyas todavía.
       */
      profanadas: estado.profanadas.slice(0, Math.max(0, sesion.round)),
      gente: Object.fromEntries(
        Object.entries(estado.gente).map(([id, p]) => [
          id,
          {
            marcas: p.marcas,
            amuletos: p.amuletos,
            tocado: p.tocado,
            fragmentos: p.fragmentos,
            donUsadoEnRonda: p.donUsadoEnRonda,
          },
        ]),
      ),
      /*
       * TODOS los fragmentos, pero con TEXTO solo los que ya están sobre la
       * mesa, y sin decir de ninguno si es falso.
       *
       * Mandar solo los públicos parecía más seguro y era peor: el panel cuenta
       * «X de Y publicados» y con esa lista decía siempre «Y de Y», o sea que
       * mentía sobre lo único que enseña. Esconder el TEXTO es lo que hace
       * falta; esconder que existen no protege nada y rompe el recuento.
       *
       * Y EL UNIVERSO SE SIEMBRA CON LAS FALSAS CANDIDATAS, que es lo que
       * impide que el denominador delate la mentira.
       *
       * `estado.fragmentos` arranca con los fragmentos ciertos y solo crece
       * cuando el saqueador falsifica: publicar de verdad nunca añade una
       * clave, se limita a poner `publico` en una que ya estaba. Así que quien
       * dirige veía el recuento saltar de «0 de 5» a «1 de 6», con el texto del
       * recién llegado al lado, y ese salto señalaba la falsificación —y de
       * paso a quien tiene el don— sin necesidad de mirar el JSON. Con las
       * candidatas sembradas desde la primera vigilia el denominador ya no se
       * mueve en toda la noche, y una falsa publicada entra por la misma puerta
       * que una cierta.
       *
       * Ordenado por id para que el orden de las claves tampoco cuente nada:
       * las candidatas no pueden ir siempre al final de la lista.
       */
      fragmentos: Object.fromEntries(universoDeFragmentos(game, estado)),
      /*
       * QUIÉN ha entregado su orden, pero no CUÁL. Con el Game Master jugando,
       * ver el orden de cada cual sería jugar con las cartas vistas.
       *
       * Y las claves TIENEN que estar: mandar `{}` dejaba el puesto de mando
       * inutilizable, porque el botón de ejecutar el ritual se desactiva cuando
       * no hay ninguna y esa es la única forma de terminar la noche. Un filtro
       * que impide acabar la partida es peor que el dato que escondía.
       */
      propuestas: Object.fromEntries(
        Object.keys(estado.propuestas).map((id) => [id, { orden: [] as string[], reservada: true }]),
      ),
      propuestasEntregadas: Object.keys(estado.propuestas).length,
      sellado: estado.sellado,
    },
  };
});
