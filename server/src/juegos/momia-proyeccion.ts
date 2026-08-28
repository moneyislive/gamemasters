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

/** Un fragmento tal y como se lee. Sin decir si es verdad. */
export interface FragmentoVisto {
  id: string;
  texto: string;
  /** ¿Está sobre la mesa o solo en tu mano? */
  publico: boolean;
  /** Quién lo puso sobre la mesa, si alguien lo hizo. */
  publicadoPor?: string;
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
  suspectId: string;
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
  ritos: Array<{ id: string; nombre: string }>;
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
  suspectId: string,
): VistaMomia | undefined {
  const trama = tramaDe(game.plot);
  if (!trama) return undefined;

  const estado = estadoDe(game, sesion);
  const yo = estado.gente[suspectId];
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
      ...(f.publicadoPor ? { publicadoPor: f.publicadoPor } : {}),
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
    ?.sobornos?.[suspectId];

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
      donesDisponibles: donesDe(game, estado, suspectId),
      donRol: ficha?.rol ?? '',
      donQueHace: ficha?.que ?? '',
      donUsadoEstaVigilia: yo.donUsadoEnRonda === sesion.round,
      fragmentos: mios,
      ...(estado.propuestas[suspectId] ? { miPropuesta: estado.propuestas[suspectId]!.orden } : {}),
      ...(soborno ? { sabeQueSeProfanara: nombreDeEntidad(game, 'camaras', soborno) } : {}),
    },
    papiro: publicos,
    // Las marcas y los amuletos son públicos: en la mesa se ven, y la hoja de
    // marcas de la partida en papel los lleva a la vista de todo el mundo.
    mesa: sesion.players
      .filter((p) => p.suspectId !== suspectId)
      .map((p) => {
        const suyo = estado.gente[p.suspectId];
        return {
          suspectId: p.suspectId,
          marcas: suyo?.marcas ?? 0,
          amuletos: suyo?.amuletos ?? 0,
          tocado: suyo?.tocado ?? false,
          // Que alguien ha propuesto es público; QUÉ ha propuesto, no. Saberlo
          // antes de tiempo convertiría el sellado en seguir al que va primero.
          haPropuesto: Boolean(estado.propuestas[p.suspectId]),
        };
      }),
    ritos: entidadesDe(game, 'ritos').map((r) => ({ id: r.id, nombre: r.name })),
  };

  /*
   * LA CLAVE `saqueo` SOLO SE AÑADE SI ERES EL SAQUEADOR. No se pone a
   * `undefined` para el resto: se omite. Es la diferencia entre «no tienes
   * mentiras» y «aquí no hay mentiras que tener», y la primera ya sería un dato.
   */
  if (esElSaqueador(game, suspectId) && donesDe(game, estado, suspectId).includes('falsificar')) {
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

registrarProyeccion('momia', (game, sesion, suspectId) => vistaMomiaDe(game, sesion, suspectId));

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
registrarProyeccionParaGm('momia', (game, sesion) => {
  const estado = (sesion.estado as { momia?: EstadoMomia } | undefined)?.momia;
  if (!estado) return undefined;

  const publicos = Object.values(estado.fragmentos).filter((f) => f.publico);
  return {
    momia: {
      profanadas: estado.profanadas,
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
       * Los fragmentos, SOLO los que ya están sobre la mesa, y sin decir si son
       * falsos. Que uno sea falso es lo que la mesa tiene que descubrir hablando.
       */
      fragmentos: Object.fromEntries(
        publicos.map((f) => [f.id, { id: f.id, texto: f.texto, publico: true }]),
      ),
      /*
       * Cuántas propuestas hay, no cuáles. Con el Game Master jugando, ver el
       * orden que ha entregado cada cual sería jugar con las cartas vistas.
       */
      propuestas: {},
      propuestasEntregadas: Object.keys(estado.propuestas).length,
      sellado: estado.sellado,
    },
  };
});
