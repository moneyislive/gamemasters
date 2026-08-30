/**
 * Qué ve CADA PERSONA del estado de El Paso de las Sombras.
 *
 * ESTE FICHERO ES LA DEFENSA ANTITRAMPAS DEL JUEGO ENTERO. El móvil de quien
 * juega es un entorno hostil: basta con abrir las herramientas del navegador
 * para leer cualquier cosa que se le haya enviado. Así que aquí no se «oculta»
 * nada del lado del cliente: sencillamente no se envía.
 *
 * LA REGLA DE ORO, sin excepciones, hasta el desenlace:
 *
 *   1. `sendaVerdadera` NO SALE. Si viajara, bastaría con mirar el JSON para
 *      ganar la partida y no habría nada más que jugar.
 *   2. `contrasenas` NO SALE, NUNCA, NI EN EL DESENLACE. Es la mecánica que
 *      distingue a este juego: la palabra está escrita en una puerta y hay que
 *      ir a leerla. Mandarla al móvil sería quitarle el cuerpo al juego y
 *      dejarlo en una app de sofá.
 *   3. Los pasos batidos QUE AÚN NO HAN PASADO no salen. El de la hora en curso
 *      solo lo ve quien lleva el farol; el resto se entera al cerrarse la hora,
 *      que es el momento en el que se comprueba quién decía la verdad.
 *   4. El campo `falso` de un hito NO SALE, NI SIQUIERA AL KANCHŌ. Si viajara,
 *      bastaría con mirarlo para saber de qué fiarse. El TEXTO de un hito falso
 *      sí sale, claro: está sobre la mesa.
 *   5. `falsear` solo existe para quien puede usarlo. A cualquier otra persona
 *      no le llega ni la palabra: ni el papel, ni las mentiras disponibles, ni
 *      una pista de que ese repertorio exista.
 *
 * SOBRE EL PUNTO 5, QUE ES UNA INTERPRETACIÓN Y CONVIENE QUE SE VEA. Leído al
 * pie de la letra, «el papel del kanchō no sale hacia el móvil» lo dejaría
 * injugable: quien lo tiene necesita saber que lo tiene y qué mentiras puede
 * poner. Se lee, pues, como lo que evidentemente quiere decir —que no sale hacia
 * QUIEN NO ES— y así queda escrito para que la próxima persona que lo lea no
 * crea que se coló.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE SÍ SALE Y PARECE QUE NO DEBERÍA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **Los encuentros**: quién estuvo en cada paso y en cada hora, con nombre. No
 * es una fuga, es EL MECANISMO: dos personas en el mismo paso a la misma hora
 * leyeron el mismo mojón, así que si cuentan cosas distintas una miente. Además
 * ya viajaba —la plataforma proyecta `jugadores[].salaActual` desde CLUEDO—: lo
 * único que se añade es la memoria de las horas anteriores.
 *
 * **La procedencia de un hito público**: dónde y cuándo dice quien lo puso que
 * lo consiguió. Es la mitad de la conversación, y va en TODOS los públicos —no
 * solo en los falsos— justamente para que su presencia no delate a ninguno.
 */
import {
  esElKancho,
  estadoDe,
  horaSiLaHay,
  llevaElPorte,
  papelesDe,
} from './sombras-acciones';
import { consejoDe, trofeosDe } from './sombras-consejo';
import { fichaDePapel, fichaDePorte, HORAS_DE_LA_NOCHE, nombreDeLaHora, pasoBatido, tramaDe } from './sombras-trama';
import { registrarProyeccion, registrarProyeccionParaGm } from './proyecciones';
// Por la puerta principal, igual que en `sombras-trama.ts` y por lo mismo.
import { entidadesDe, nombreDeEntidad } from '../../../shared/juegos';
import { TRAMOS_DE_LA_SENDA } from '../../../shared/juegos/sombras-tipos';
import type { Condicion, EstadoSombras, PorteId } from '../../../shared/juegos/sombras-tipos';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';

/** Un hito tal y como se lee. Sin decir si es verdad. */
export interface HitoVisto {
  id: string;
  texto: string;
  /**
   * La condición, en datos.
   *
   * POR QUÉ NO ES UNA FUGA, que es la pregunta que hay que hacerse antes de
   * añadir cualquier cosa a esta vista: `texto` YA dice exactamente esto, solo
   * que en prosa de mojón —«quien busque el Collado tiene que haber dejado atrás
   * el Vado»— y la generación valida que la frase y la condición digan lo mismo.
   * Mandar la forma estructurada no añade ni un dato que no estuviera ya
   * viajando.
   *
   * Lo secreto de un hito es `falso`, no lo que afirma.
   *
   * POR QUÉ HACE FALTA: sin ella, la app tendría que volver a parsear la prosa
   * para saber qué casilla tachar, que es justo lo que el diseño prohíbe —la
   * lógica la garantiza el código, no la interpretación de un texto—.
   */
  condicion: Condicion;
  publico: boolean;
  publicadoPor?: string;
  publicadoPorNombre?: string;
  /** Dónde y cuándo dice quien lo tiene que lo consiguió. */
  halladoEn?: { pasoId: string; pasoNombre: string; ronda: number };
  /** Solo en el desenlace: si era mentira. Antes, nunca. */
  falso?: boolean;
}

/** Lo que se sabe de otra persona con solo mirarla. */
export interface CompaneroVisto {
  participanteId: string;
  prendas: number;
  prendasRecibidas: number;
  /** ¿Ha entregado ya su propuesta de senda? Cuál, no se dice. */
  haPropuesto: boolean;
  estandarteNombre?: string;
  enseres: Array<{ id: string; nombre: string; porte?: PorteId }>;
  /**
   * Cuántas veces se sabe QUE PISÓ donde estaban los cazadores.
   *
   * SE CUENTA SOLO SOBRE LAS HORAS YA REVELADAS, y esa es la diferencia entre
   * un dato y una fuga. El contador de verdad sube en el acto, así que
   * proyectarlo tal cual diría a toda la mesa cuál es el paso batido de esta
   * hora en cuanto alguien lo pisara — y ese es justamente el dato que se
   * reserva hasta el cierre. Recalculado sobre lo público no añade nada que no
   * se pudiera deducir con papel y lápiz.
   */
  pisadasVistas: number;
}

export interface VistaSombras {
  hora: {
    ronda: number;
    nombre: string;
    kanji: string;
    rastro: number;
    rastroMaximo: number;
    tramos: number;
    /** Los pasos batidos de las horas ya cerradas. Es información pública. */
    batidosRevelados: Array<{ ronda: number; pasoId: string; nombre: string }>;
    /** Solo quien lleva el farol: el paso batido de ESTA hora. */
    batidoQueVes?: { pasoId: string; nombre: string };
  };
  yo: {
    prendas: number;
    prendasRecibidas: number;
    pisadas: number;
    papel: string;
    /** Todos los que puedes usar. Dos solo para el kanchō. */
    papelesDisponibles: string[];
    papelRol: string;
    papelKanji: string;
    papelQueHace: string;
    papelUsadoEstaHora: boolean;
    /** Los que tienes en la mano, públicos o no. */
    hitos: HitoVisto[];
    enseres: Array<{ id: string; nombre: string; porte?: PorteId; porteNombre?: string; porteQue?: string }>;
    estandarteNombre?: string;
    /** El paso que has reconocido esta hora, si ya lo has hecho. */
    miPaso?: string;
    miPropuesta?: string[];
    /** Lo que averiguó el juglar: el paso que batirán la hora siguiente. */
    sabeQueBatiran?: { pasoId: string; nombre: string };
  };
  /** Los hitos que están sobre la mesa, los tenga quien los tenga. */
  camino: HitoVisto[];
  pasos: Array<{ id: string; nombre: string; descripcion?: string }>;
  mesa: CompaneroVisto[];
  /**
   * Quién estuvo en cada paso y en cada hora. EL MECANISMO DEL JUEGO.
   *
   * Dos personas en el mismo sitio a la misma hora leyeron el MISMO mojón. Si
   * cuentan cosas distintas, una miente; y como el kanchō tiene que atribuir su
   * mentira a un sitio y a una hora, esta tabla es donde se le caza.
   */
  encuentros: Array<{
    ronda: number;
    pasos: Array<{ pasoId: string; nombre: string; quienes: string[] }>;
  }>;
  /** Solo para quien cobra de Akechi. Al resto no le llega ni la clave. */
  mentiras?: {
    lista: Array<{ id: string; texto: string }>;
    disponibles: number;
  };
  /** Solo con la partida terminada. Antes, `undefined`. */
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

/**
 * Hasta qué hora se ha revelado ya dónde estaban los cazadores.
 *
 * Con la hora ABIERTA, hasta la anterior: lo de esta noche todavía se está
 * jugando. Con la hora cerrada —o en el consejo, o en el desenlace— entra
 * también la que se acaba de cerrar, que es el momento en que la mesa comprueba
 * quién decía la verdad.
 *
 * Está en una función y no escrito dos veces porque lo usan la vista del
 * jugador y la de quien dirige a ciegas, y si las dos no coincidieran, quien
 * dirige jugaría con una hora de ventaja o de retraso sobre la mesa.
 */
function revelarHasta(sesion: LiveSession): number {
  if (sesion.round <= 0) return 0;
  return sesion.phase === 'ronda-abierta' ? sesion.round - 1 : sesion.round;
}

/**
 * Compone lo que ve una persona.
 *
 * Se registra con `registrarProyeccion`, que es el mecanismo hermano de
 * `registrarAcciones`: el motor no puede saber qué es secreto en un juego que no
 * conoce, así que decide el juego. CLUEDO no registra ninguna y su vista no
 * cambia ni un byte.
 */
export function vistaSombrasDe(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
): VistaSombras | undefined {
  const trama = tramaDe(game.plot);
  if (!trama) return undefined;

  const estado = estadoDe(game, sesion);
  const yo = estado.gente[participanteId];
  if (!yo) return undefined;

  const terminada = sesion.phase === 'desenlace';
  const ficha = fichaDePapel(yo.papel);
  const nombreDePaso = (id: string) => nombreDeEntidad(game, 'pasos', id);
  const nombreDeEnser = (id: string) => nombreDeEntidad(game, 'enseres', id);

  /*
   * Un hito, contado. `falso` solo se rellena con la partida terminada, y es la
   * línea más importante del fichero: mientras se juega, el campo NI SIQUIERA
   * EXISTE en el objeto, así que no puede colarse por serialización, ni como
   * `false`, ni como `undefined` que alguien luego lea como «no es falso».
   */
  const contar = (id: string): HitoVisto | undefined => {
    const h = estado.hitos[id];
    if (!h) return undefined;
    return {
      id: h.id,
      texto: h.texto,
      condicion: h.condicion,
      publico: h.publico,
      ...(h.publicadoPor
        ? {
            publicadoPor: h.publicadoPor,
            publicadoPorNombre:
              sesion.players.find((p) => p.participanteId === h.publicadoPor)?.displayName ?? '',
          }
        : {}),
      ...(h.halladoEn
        ? {
            halladoEn: {
              pasoId: h.halladoEn.pasoId,
              pasoNombre: nombreDePaso(h.halladoEn.pasoId),
              ronda: h.halladoEn.ronda,
            },
          }
        : {}),
      ...(terminada ? { falso: h.falso } : {}),
    };
  };

  const mios = yo.hitos.map(contar).filter((h): h is HitoVisto => Boolean(h));
  const publicos = Object.values(estado.hitos)
    .filter((h) => h.publico)
    .map((h) => contar(h.id))
    .filter((h): h is HitoVisto => Boolean(h));

  // ---- Las horas y los cazadores ----
  const hasta = revelarHasta(sesion);
  const batidosRevelados: VistaSombras['hora']['batidosRevelados'] = [];
  for (let ronda = 1; ronda <= hasta; ronda++) {
    const pasoId = pasoBatido(estado.batidos, ronda);
    if (pasoId) batidosRevelados.push({ ronda, pasoId, nombre: nombreDePaso(pasoId) });
  }

  const conFarol = llevaElPorte(estado, participanteId, 'farol');
  const batidoDeAhora = pasoBatido(estado.batidos, sesion.round);
  const hora = horaSiLaHay(sesion);
  const adelanto = hora?.adelantos?.[participanteId];

  // ---- Los encuentros: quién estuvo dónde, hora a hora ----
  const encuentros: VistaSombras['encuentros'] = [];
  for (let ronda = 1; ronda <= Math.max(0, sesion.round); ronda++) {
    const porPaso = new Map<string, string[]>();
    for (const jugador of sesion.players) {
      for (const eleccion of jugador.elecciones) {
        if (eleccion.round !== ronda) continue;
        const lista = porPaso.get(eleccion.roomId) ?? [];
        if (!lista.includes(jugador.participanteId)) lista.push(jugador.participanteId);
        porPaso.set(eleccion.roomId, lista);
      }
    }
    if (porPaso.size === 0) continue;
    encuentros.push({
      ronda,
      pasos: [...porPaso.entries()].map(([pasoId, quienes]) => ({
        pasoId,
        nombre: nombreDePaso(pasoId),
        quienes,
      })),
    });
  }

  /** Cuántas veces PISÓ el batido, contando solo horas ya reveladas. */
  const pisadasVistas = (id: string): number => {
    const jugador = sesion.players.find((p) => p.participanteId === id);
    if (!jugador) return 0;
    let cuenta = 0;
    for (let ronda = 1; ronda <= hasta; ronda++) {
      const batido = pasoBatido(estado.batidos, ronda);
      if (!batido) continue;
      if (jugador.elecciones.some((e) => e.round === ronda && e.roomId === batido)) cuenta += 1;
    }
    return cuenta;
  };

  const miPaso = sesion.players
    .find((p) => p.participanteId === participanteId)
    ?.elecciones.filter((e) => e.round === sesion.round)
    .map((e) => e.roomId)
    .pop();

  const kanjiDeLaHora =
    sesion.round >= 1
      ? HORAS_DE_LA_NOCHE[(sesion.round - 1) % HORAS_DE_LA_NOCHE.length]!.kanji
      : '';

  const vista: VistaSombras = {
    hora: {
      ronda: sesion.round,
      nombre: nombreDeLaHora(sesion.round),
      kanji: kanjiDeLaHora,
      rastro: estado.rastro,
      rastroMaximo: estado.rastroMaximo,
      tramos: TRAMOS_DE_LA_SENDA,
      batidosRevelados,
      /*
       * EL FAROL, y es el único sitio de toda la vista por donde sale un paso
       * batido sin revelar. Es lo que hace del farol el objeto más peligroso del
       * juego: quien lo lleva tiene información que nadie puede comprobar hasta
       * que se cierre la hora. Se manda solo a quien lo carga, y llevarlo es
       * público, así que la mesa sabe a quién preguntarle.
       */
      ...(conFarol && batidoDeAhora && sesion.round >= 1
        ? { batidoQueVes: { pasoId: batidoDeAhora, nombre: nombreDePaso(batidoDeAhora) } }
        : {}),
    },
    yo: {
      prendas: yo.prendas,
      prendasRecibidas: yo.prendasRecibidas,
      pisadas: yo.pisadas,
      papel: yo.papel,
      /*
       * TODOS LOS PAPELES QUE PUEDES USAR, no solo el que aparentas.
       *
       * Casi siempre es uno y esta lista sobra. Para el kanchō son dos —el suyo
       * y `falsear`— y ahí está el juego: sin poder elegir, la app le mandaría
       * siempre el primero y el traidor se quedaría sin su única mecánica. No
       * delata a nadie: quien no es kanchō recibe una lista de un elemento, que
       * es exactamente lo que ya sabía.
       */
      papelesDisponibles: papelesDe(game, estado, participanteId),
      papelRol: ficha.rol,
      papelKanji: ficha.kanji,
      papelQueHace: ficha.que,
      papelUsadoEstaHora: yo.papelUsadoEnRonda === sesion.round,
      hitos: mios,
      enseres: (yo.enseres ?? []).map((id) => {
        const porte = estado.portes[id];
        const fp = fichaDePorte(porte);
        return {
          id,
          nombre: nombreDeEnser(id),
          ...(porte ? { porte } : {}),
          ...(fp ? { porteNombre: fp.nombre, porteQue: fp.que } : {}),
        };
      }),
      ...(estado.estandartes[participanteId]
        ? { estandarteNombre: nombreDeEntidad(game, 'estandartes', estado.estandartes[participanteId]!) }
        : {}),
      ...(miPaso ? { miPaso } : {}),
      ...(estado.propuestas[participanteId] ? { miPropuesta: estado.propuestas[participanteId]!.senda } : {}),
      ...(adelanto
        ? { sabeQueBatiran: { pasoId: adelanto, nombre: nombreDePaso(adelanto) } }
        : {}),
    },
    camino: publicos,
    /*
     * CON SU DESCRIPCIÓN, y SIN su contraseña. Lo primero porque es texto que
     * quien organiza escribió al montar la partida y ayuda a decidir a dónde ir;
     * lo segundo porque la contraseña es la mecánica y mandarla al móvil
     * convertiría este juego en el de sofá que no quiere ser.
     */
    pasos: entidadesDe(game, 'pasos').map((p) => ({
      id: p.id,
      nombre: p.name,
      ...(p.description?.trim() ? { descripcion: p.description.trim() } : {}),
    })),
    mesa: sesion.players
      .filter((p) => p.participanteId !== participanteId)
      .map((p) => {
        const suyo = estado.gente[p.participanteId];
        return {
          participanteId: p.participanteId,
          // Las prendas son públicas: en la mesa se ven, y la tabla del rastro
          // de la partida en papel las lleva a la vista de todo el mundo.
          prendas: suyo?.prendas ?? 0,
          prendasRecibidas: suyo?.prendasRecibidas ?? 0,
          // Que alguien ha propuesto es público; QUÉ ha propuesto, no. Saberlo
          // antes de tiempo convertiría el consejo en seguir al que va primero.
          haPropuesto: Boolean(estado.propuestas[p.participanteId]),
          ...(estado.estandartes[p.participanteId]
            ? {
                estandarteNombre: nombreDeEntidad(
                  game,
                  'estandartes',
                  estado.estandartes[p.participanteId]!,
                ),
              }
            : {}),
          enseres: (suyo?.enseres ?? []).map((id) => ({
            id,
            nombre: nombreDeEnser(id),
            ...(estado.portes[id] ? { porte: estado.portes[id]! } : {}),
          })),
          pisadasVistas: pisadasVistas(p.participanteId),
        };
      }),
    encuentros,
  };

  /*
   * LA CLAVE `mentiras` SOLO SE AÑADE SI ERES EL KANCHŌ. No se pone a
   * `undefined` para el resto: se omite. Es la diferencia entre «no tienes
   * mentiras» y «aquí no hay mentiras que tener», y la primera ya sería un dato.
   */
  if (esElKancho(game, participanteId) && papelesDe(game, estado, participanteId).includes('falsear')) {
    const yaPublicadas = new Set(
      Object.values(estado.hitos).filter((h) => h.falso).map((h) => h.id),
    );
    const disponibles = trama.falsasCandidatas.filter((f) => !yaPublicadas.has(f.id));
    vista.mentiras = {
      lista: disponibles.map((f) => ({ id: f.id, texto: f.texto })),
      disponibles: disponibles.length,
    };
  }

  // ---- El desenlace: la ÚNICA puerta por la que sale la senda verdadera ----
  if (terminada) {
    const resultado = consejoDe(game, sesion);
    const conNombre = (ids: string[]) => ids.map((id) => ({ id, nombre: nombreDePaso(id) }));
    vista.desenlace = {
      sendaVerdadera: conNombre(estado.sendaVerdadera),
      sendaAndada: conNombre(resultado.sendaAndada),
      correcta: resultado.correcta,
      interceptada: resultado.interceptada,
      gana: resultado.gana,
      kanchoId: resultado.kanchoId,
      ganadores: resultado.ganadores,
      desenmascarado: resultado.desenmascarado,
      senalamientos: resultado.senalamientos,
      votos: resultado.votos.map((v) => ({ senda: v.senda, apoyos: v.apoyos, peso: v.peso })),
      rastro: resultado.rastro,
      rastroMaximo: resultado.rastroMaximo,
      trofeos: trofeosDe(game, sesion, resultado),
    };
  }

  return vista;
}

registrarProyeccion('sombras', (game, sesion, participanteId) => vistaSombrasDe(game, sesion, participanteId));

// ---------------------------------------------------------------------------
// Lo que puede ver quien dirige A CIEGAS
// ---------------------------------------------------------------------------

/**
 * Lo que puede ver quien dirige a ciegas del estado de la columna.
 *
 * LO QUE NO SALE: `sendaVerdadera`, `contrasenas`, los pasos batidos que aún no
 * se han revelado, el texto de los hitos que no están sobre la mesa, cuáles son
 * falsos y qué ha propuesto cada cual. Los tres primeros son la solución; el
 * cuarto y el quinto son el juego; el sexto convertiría el consejo en seguir al
 * que va primero.
 *
 * LO QUE SÍ SALE, porque lo necesita para dirigir y porque en la mesa se ve: el
 * rastro, las prendas de cada cual, quién carga qué y qué hitos están ya sobre
 * la mesa —que son públicos por definición—.
 *
 * LOS PASOS BATIDOS SE RECORTAN CON LA MISMA REGLA QUE PARA LA MESA, y eso es
 * más estricto que lo que hace la Momia con sus cámaras profanadas. Allí la
 * profanada se anuncia en voz alta al abrir, así que quien dirige la ve porque
 * la va a decir. Aquí es secreta hasta que se cierra la hora: un Game Master que
 * juega y que la viera antes tendría regalado el trofeo «Sin rastro» y sabría
 * dónde no meterse. Se entera cuando se entera la mesa.
 *
 * Sin esto registrado, a ciegas el panel se quedaría sin nada que enseñar: el
 * filtro falla cerrado a propósito, y esta función es lo que lo abre justo lo
 * necesario.
 */
type HitoParaGm = { id: string; texto?: string; publico: boolean };

/**
 * El universo de hitos que ve quien dirige, sembrado con las candidatas falsas.
 *
 * Se ordena por id, y eso no es cosmética: si las candidatas se quedaran al
 * final de la lista, el orden de las claves diría cuáles son igual de bien que
 * el recuento. Es la misma lección que la Momia aprendió con sus fragmentos —el
 * denominador saltaba de cinco a seis al publicarse una mentira y señalaba a
 * quien la había puesto— y se aplica aquí desde el principio.
 */
function universoDeHitos(game: GameSession, estado: EstadoSombras): Array<[string, HitoParaGm]> {
  const universo = new Map<string, HitoParaGm>();
  for (const f of tramaDe(game.plot)?.falsasCandidatas ?? []) {
    universo.set(f.id, { id: f.id, publico: false });
  }
  // El estado manda: una candidata que ya está en juego pisa su semilla.
  for (const h of Object.values(estado.hitos)) {
    universo.set(
      h.id,
      h.publico ? { id: h.id, texto: h.texto, publico: true } : { id: h.id, publico: false },
    );
  }
  return [...universo.entries()].sort(([a], [b]) => a.localeCompare(b));
}

registrarProyeccionParaGm('sombras', (game, sesion) => {
  const estado = (sesion.estado as { sombras?: EstadoSombras } | undefined)?.sombras;
  if (!estado) return undefined;

  const hasta = revelarHasta(sesion);
  const batidos: string[] = [];
  for (let ronda = 1; ronda <= hasta; ronda++) {
    const pasoId = pasoBatido(estado.batidos, ronda);
    if (pasoId) batidos.push(pasoId);
  }

  return {
    sombras: {
      rastro: estado.rastro,
      rastroMaximo: estado.rastroMaximo,
      /* Solo hasta lo revelado. Ver la cabecera: aquí es más estricto que en la Momia. */
      batidos,
      gente: Object.fromEntries(
        Object.entries(estado.gente).map(([id, p]) => [
          id,
          {
            prendas: p.prendas,
            prendasRecibidas: p.prendasRecibidas,
            hitos: p.hitos,
            enseres: p.enseres,
            papelUsadoEnRonda: p.papelUsadoEnRonda,
          },
        ]),
      ),
      estandartes: estado.estandartes,
      portes: estado.portes,
      /*
       * TODOS los hitos, pero con TEXTO solo los que ya están sobre la mesa, y
       * sin decir de ninguno si es falso. Mandar solo los públicos parecería más
       * seguro y sería peor: el panel cuenta «X de Y sobre la mesa» y con esa
       * lista diría siempre «Y de Y», o sea que mentiría sobre lo único que
       * enseña.
       */
      hitos: Object.fromEntries(universoDeHitos(game, estado)),
      /*
       * QUIÉN ha entregado su senda, pero no CUÁL. Y las claves TIENEN que
       * estar: mandar `{}` dejaba el puesto de mando inutilizable, porque el
       * botón de echar a andar se desactiva cuando no hay ninguna y esa es la
       * única forma de terminar la noche. Un filtro que impide acabar la partida
       * es peor que el dato que escondía.
       */
      propuestas: Object.fromEntries(
        Object.keys(estado.propuestas).map((id) => [id, { senda: [] as string[], reservada: true }]),
      ),
      propuestasEntregadas: Object.keys(estado.propuestas).length,
      consejo: estado.consejo,
    },
  };
});
