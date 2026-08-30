/**
 * Proyección: lo ÚNICO que sale del servidor hacia un móvil.
 *
 * Este fichero es la defensa antitrampas de todo el producto. El móvil de un
 * jugador es un entorno hostil: basta con abrir las herramientas del navegador
 * para leer cualquier cosa que le hayamos enviado. Así que aquí no se «oculta»
 * nada en el cliente: sencillamente no se envía.
 *
 * Reglas que no se negocian:
 *  1. `plot.solution` no sale JAMÁS hasta la fase de desenlace.
 *  2. De los demás jugadores solo salen su cara pública: nombre, papel y foto.
 *     Ni secretos, ni motivos, ni coartadas.
 *  3. Las pistas de una sala solo las recibe quien ha entrado en esa sala, y
 *     `pointsTo` —lo que la pista significa— no sale hasta que esa ronda cierra.
 *     No hay ninguna puerta por la que la pista de una sala llegue a quien no
 *     estuvo dentro: lo que se encuentra es de quien lo encuentra.
 *  4. El conocimiento del personaje se desbloquea ronda a ronda.
 *  5. Los giros personales solo llegan a su destinatario.
 *  6. La cronología propia solo lleva momentos que ese personaje vivió, y nunca
 *     un momento a puerta cerrada donde estuviera el culpable.
 */
import { cronologiaPublica, REGLAS_JUGADOR } from '../docs/datos';
import { estaConectado, salaDe } from './sesion';
import type {
  LiveSession,
  MomentoVista,
  PistaVista,
  SalaVista,
  TableroVista,
  VistaGameMaster,
  VistaJugador,
} from '../../../shared/live';
import type { GameSession, Plot } from '../../../shared/types';
import { aciertos, ejeDeJugadores, ejes as ejesDe, esElSenalado, manifiestoDe } from '../../../shared/juegos';
import { estadoParaGm, proyectarEstado } from '../juegos/proyecciones';
import { entidadesDe, nombreDeEntidad } from '../juegos/entidades';
import { accionesDisponibles } from '../juegos/motor';
import { fotoParaJugador } from './fotos';

/**
 * Cuánto conocimiento del personaje está desbloqueado.
 *
 * Se reparte a lo largo de la partida en vez de darlo todo al principio: si un
 * jugador recibe de golpe las seis cosas que sabe, las suelta en la primera
 * ronda y la velada se queda sin gasolina a mitad.
 */
function conocimientoDesbloqueado(total: number, round: number, totalRounds: number): number {
  if (total === 0) return 0;
  if (round <= 0) return Math.min(1, total);
  // Reparto proporcional: al llegar a la última ronda está todo disponible.
  const porRonda = Math.ceil(total / Math.max(1, totalRounds));
  return Math.min(total, Math.max(1, porRonda * round));
}

function pistaVista(
  game: GameSession,
  clue: { id: string; roomId?: string; description: string; pointsTo: string; round: number },
  conSignificado: boolean,
): PistaVista {
  const sala = game.rooms.find((r) => r.id === clue.roomId);
  return {
    id: clue.id,
    roomId: clue.roomId ?? '',
    roomName: sala?.name ?? 'Sin sala',
    round: clue.round,
    description: clue.description,
    ...(conSignificado ? { pointsTo: clue.pointsTo } : {}),
  };
}

function cronologia(plot: Plot): MomentoVista[] {
  return cronologiaPublica(plot).map((e) => ({ time: e.time, description: e.description }));
}

/**
 * Compone la vista de un jugador concreto.
 *
 * Devuelve null si esa persona no participa: así una petición con un id ajeno
 * no revela siquiera si ese jugador existe.
 */
export function vistaDeJugador(
  game: GameSession,
  sesion: LiveSession,
  suspectId: string,
): VistaJugador | null {
  const plot = game.plot;
  if (!plot) return null;
  const manifiesto = manifiestoDe(sesion.juego);
  const jugador = sesion.players.find((p) => p.suspectId === suspectId);
  if (!jugador) return null;

  const personaje = plot.characters.find((c) => c.suspectId === suspectId);
  const sospechoso = game.suspects.find((s) => s.id === suspectId);
  const enJuego = sesion.phase !== 'lobby';
  const abierta = sesion.phase === 'ronda-abierta';
  const terminada = sesion.phase === 'desenlace';
  /*
   * Si el papel que me ha tocado es el que el juego señala —el asesino en
   * CLUEDO— hace falta saberlo AQUÍ y no solo al final, porque de ello depende
   * qué momentos de la cronología es seguro mandarme. Ya se calculaba para
   * `yo.soyCulpable`; lo único que cambia es que ahora se calcula antes.
   */
  const soyCulpable = esElSenalado(manifiesto, plot.solution.respuestas, suspectId);

  // ---- Conocimiento, desbloqueado por rondas ----
  const todoElConocimiento = personaje?.knowledge ?? [];
  const desbloqueado = enJuego
    ? conocimientoDesbloqueado(todoElConocimiento.length, sesion.round, sesion.totalRounds)
    : 0;

  // ---- Mis giros: solo los que ya se han entregado ----
  const giros = (plot.material?.twists ?? [])
    .filter((t) => t.suspectId === suspectId && jugador.girosRecibidos.includes(t.id))
    .map((t) => ({ id: t.id, round: t.round, instruction: t.instruction }));

  /*
   * ---- MI CRONOLOGÍA: qué hacía yo mientras pasaba todo ----
   *
   * La cronología de la trama, recortada a los momentos en los que figuro. Lo
   * que sale de aquí no le cuenta a nadie nada que su personaje no viviera: si
   * mi id está en `suspectIds`, yo estaba allí.
   *
   * Y AUN ASÍ SE FILTRA UNA COSA MÁS. Un momento a puerta cerrada donde
   * estuvimos el culpable y yo puede estar redactado desde fuera —«X se desliza
   * hacia la biblioteca»— y entregarme el nombre del asesino en la primera
   * pantalla que abro. Esa frase la escribe un modelo, no una persona que esté
   * pensando en la defensa antitrampas, así que no se le concede el beneficio de
   * la duda: si el momento es secreto y el culpable estaba, no sale. Salvo que
   * el culpable sea yo, claro, porque entonces no hay nada que protegerme.
   *
   * El precio es perder algún momento jugoso de un inocente que sí presenció
   * algo. Se paga a gusto: lo otro es reventar la velada entera.
   */
  const ejeSenalado = ejeDeJugadores(manifiesto);
  const senalado = ejeSenalado ? plot.solution.respuestas[ejeSenalado.id] : undefined;
  const cronologiaPropia: MomentoVista[] = plot.timeline
    .filter((e) => e.suspectIds.includes(suspectId))
    .filter((e) => e.isPublic || soyCulpable || !senalado || !e.suspectIds.includes(senalado))
    .map((e) => ({ time: e.time, description: e.description }));

  // ---- Salas, con cuánta gente hay en cada una esta ronda ----
  const ocupacion = new Map<string, number>();
  if (sesion.phase === 'ronda-abierta') {
    for (const otro of sesion.players) {
      const sala = salaDe(otro, sesion.round);
      if (sala) ocupacion.set(sala, (ocupacion.get(sala) ?? 0) + 1);
    }
  }
  const salas: SalaVista[] = game.rooms.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    photoUrl: fotoParaJugador(r.photoUrl, game.id),
    ocupantes: ocupacion.get(r.id) ?? 0,
    pin: r.pin,
  }));

  // ---- El plano de la casa ----
  // Sale entero, y es la única parte de la vista de la que puede decirse eso.
  // El tablero se calcula desde la lista de salas y nada más: no sabe quién es
  // el culpable ni dónde está ninguna pista. Lo que sí es información de juego
  // —dónde estás, dónde hay gente, qué salas ya dieron algo— lo pinta el móvil
  // encima, con lo que ya tenía.
  // Va TODO lo que exista, no solo lo del modo elegido. Una partida puede
  // tener las dos cosas —el plano trazado y una foto cenital del sitio de
  // verdad— y en la mesa las dos sirven: el plano para entender la casa, la
  // foto para reconocerla. Cuál se enseña primero lo decide `modo`; poder ver
  // la otra lo decide quien juega.
  const tablero: TableroVista | undefined =
    game.board || game.boardImageUrl
      ? {
          modo: game.boardMode,
          ...(game.boardImageUrl
            ? { imagenUrl: fotoParaJugador(game.boardImageUrl, game.id) }
            : {}),
          ...(game.board ? { plano: game.board } : {}),
        }
      : undefined;

  // ---- Mis pistas: solo las de MI sala en ESTA ronda, y sin su significado ----
  const miSala = enJuego ? salaDe(jugador, sesion.round) : undefined;
  const misPistas =
    sesion.phase === 'ronda-abierta' && miSala
      ? plot.clues
          .filter((c) => c.roomId === miSala && c.round === sesion.round)
          .map((c) => pistaVista(game, c, false))
      : [];

  /*
   * ---- LO QUE HE ENCONTRADO YO, ronda a ronda ----
   *
   * Aquí se componía el TABLÓN COMÚN: se recorría `sesion.tablon` —las salas
   * que había pisado cualquiera— y se enviaban sus pistas a TODOS. Con eso,
   * elegir bien la sala no servía de nada: al cerrar la ronda todo el mundo
   * tenía lo mismo, y contar lo que habías visto no le aportaba nada a nadie.
   *
   * Ahora se recorren MIS elecciones y nada más. La lista que sale de aquí no
   * puede contener una pista de una sala en la que no estuve, porque el bucle no
   * tiene por dónde llegar a ella.
   *
   * El significado (`pointsTo`) sigue apareciendo solo con la ronda cerrada: la
   * regla de que durante la ronda interpretar es cosa tuya no ha cambiado, solo
   * ha cambiado quién llega a leerla.
   */
  const misHallazgos: PistaVista[] = [];
  if (enJuego) {
    for (let ronda = 1; ronda <= sesion.round; ronda++) {
      const sala = salaDe(jugador, ronda);
      if (!sala) continue;
      const cerrada = ronda < sesion.round || !abierta;
      for (const clue of plot.clues) {
        if (clue.roomId === sala && clue.round === ronda) {
          misHallazgos.push(pistaVista(game, clue, cerrada));
        }
      }
    }
  }

  /*
   * ---- LOS HECHOS QUE LA MESA DA POR ESTABLECIDOS ----
   *
   * Son las revelaciones de la línea temporal, que ya se generaban para el
   * cartel imprimible y que quien dirige va pegando al cerrar cada ronda. Es
   * material declaradamente PÚBLICO, así que va entero a todo el mundo; lo único
   * que se filtra es el calendario, para que no se lea la revelación de una
   * ronda antes de que esa ronda haya cerrado.
   */
  const hechos = (plot.material?.timelineReveals ?? [])
    .filter((r) => r.round < sesion.round || (r.round === sesion.round && !abierta))
    .sort((a, b) => a.round - b.round)
    .map((r) => ({ round: r.round, time: r.time, fact: r.fact }));

  // ---- Narración de la ronda en curso ----
  const narracionActual = plot.material?.narrations.find(
    (n) => n.round === (sesion.phase === 'lobby' ? 0 : sesion.round),
  );

  // ---- Qué hay que responder para acusar ----
  // Lo dice el juego, no la pantalla. Para el eje que señala a alguien de la
  // mesa se usan los nombres de PERSONAJE, que es como se les conoce durante
  // la velada, y el propio se marca para no acusarse por despiste.
  const ejes = ejesDe(manifiesto).map((e) => {
    const cat = manifiesto.categorias.find((c) => c.id === e.categoria);
    return {
      ejeId: e.id,
      pregunta: e.pregunta,
      rotulo: e.rotulo,
      opciones: entidadesDe(game, e.categoria).map((ent) => {
        if (!cat?.sonJugadores) return { id: ent.id, nombre: ent.name };
        const suyo = plot.characters.find((c) => c.suspectId === ent.id);
        const nombre = suyo?.characterName ?? ent.name;
        return { id: ent.id, nombre: ent.id === suspectId ? `${nombre} (tú)` : nombre };
      }),
    };
  });

  // ---- Qué se puede hacer ahora mismo ----
  const acciones = accionesDisponibles(sesion, suspectId).map((a) => ({
    id: a.id,
    rotulo: a.rotulo,
    campos: (a.eligeDe ?? []).map((c) => ({
      campo: c.campo,
      rotulo: c.rotulo,
      opciones: entidadesDe(game, c.categoria).map((e) => ({ id: e.id, nombre: e.name })),
    })),
    /*
     * Y las cantidades que pida, con sus límites tal como los declara el juego.
     *
     * La clave se OMITE cuando no pide ninguna, en vez de mandar un array vacío:
     * una clave con `undefined` desaparece al serializar a JSON, así que la vista
     * de los juegos que no usan números sale byte a byte como salía. Lo comprueba
     * el maestro de oro.
     */
    ...((a.pideNumero ?? []).length > 0
      ? {
          numeros: (a.pideNumero ?? []).map((n) => ({
            campo: n.campo,
            rotulo: n.rotulo,
            ...(n.minimo !== undefined ? { minimo: n.minimo } : {}),
            ...(n.maximo !== undefined ? { maximo: n.maximo } : {}),
            ...(n.porDefecto !== undefined ? { porDefecto: n.porDefecto } : {}),
            ...(n.entero !== undefined ? { entero: n.entero } : {}),
          })),
        }
      : {}),
  }));

  const miAcusacion = sesion.acusaciones.find((a) => a.suspectId === suspectId);

  const vista: VistaJugador = {
    rev: sesion.rev ?? 0,
    sesion: {
      code: sesion.code,
      phase: sesion.phase,
      round: sesion.round,
      totalRounds: sesion.totalRounds,
      roundEndsAt: sesion.roundEndsAt,
      ahora: new Date().toISOString(),
      tituloPartida: plot.title,
      lema: plot.tagline,
      listos: sesion.players.filter((p) => p.pideEmpezar).length,
      total: sesion.players.length,
      encuentro: sesion.encuentro ?? 1,
      juego: manifiesto.id,
    },
    // El caso es público: la sinopsis se escribe expresamente sin revelar
    // asesino, arma ni sala, y la víctima y la ambientación las conoce todo el
    // mundo desde que cruza la puerta.
    caso: {
      sinopsis: plot.synopsis,
      // Solo si la hay: un juego sin crimen no manda una victima inventada.
      ...(plot.victim
        ? { victima: { nombre: plot.victim.name, descripcion: plot.victim.description } }
        : {}),
      ambientacion: plot.setting,
      /*
       * LAS REGLAS DEL JUEGO QUE SE JUEGA, no las de CLUEDO. Aqui viajaba
       * `REGLAS_JUGADOR`, que empieza por «Alguien de esta casa es un asesino»:
       * una expedicion arqueologica las habria leido tal cual en su movil.
       */
      reglas: (manifiesto.reglas ?? REGLAS_JUGADOR).map((r) => `${r.titulo}. ${r.texto}`),
    },
    yo: {
      suspectId,
      displayName: jugador.displayName,
      characterName: personaje?.characterName ?? jugador.displayName,
      role: personaje?.role ?? '',
      publicPersona: personaje?.publicPersona ?? '',
      secret: personaje?.secret ?? '',
      motive: personaje?.motive ?? '',
      alibi: personaje?.alibi ?? '',
      personalHook: personaje?.personalHook ?? '',
      photoUrl: fotoParaJugador(sospechoso?.photoUrl, game.id),
      conocimiento: todoElConocimiento.slice(0, desbloqueado),
      conocimientoPendiente: Math.max(0, todoElConocimiento.length - desbloqueado),
      giros,
      cronologiaPropia,
      notas: jugador.notas,
      soyCulpable,
      pediEmpezar: jugador.pideEmpezar === true,
    },
    jugadores: sesion.players
      .filter((p) => p.suspectId !== suspectId)
      .map((p) => {
        const suPersonaje = plot.characters.find((c) => c.suspectId === p.suspectId);
        const suSospechoso = game.suspects.find((s) => s.id === p.suspectId);
        const suSala = sesion.phase === 'ronda-abierta' ? salaDe(p, sesion.round) : undefined;
        return {
          suspectId: p.suspectId,
          displayName: p.displayName,
          characterName: suPersonaje?.characterName ?? p.displayName,
          role: suPersonaje?.role ?? '',
          photoUrl: fotoParaJugador(suSospechoso?.photoUrl, game.id),
          conectado: estaConectado(p, sesion.id),
          salaActual: suSala ? game.rooms.find((r) => r.id === suSala)?.name : undefined,
          yaAcuso: sesion.acusaciones.some((a) => a.suspectId === p.suspectId),
        };
      }),
    salas,
    tablero,
    ejes,
    acciones,
    /*
     * Lo que este juego concreto quiera ensenar, si lo declara.
     *
     * Vale `undefined` para CLUEDO, que no registra ninguna proyeccion, y una
     * clave con valor `undefined` desaparece al serializar a JSON: la vista de
     * CLUEDO sale byte a byte como salia. Lo comprueba el maestro de oro.
     */
    estadoDelJuego: proyectarEstado(game, sesion, suspectId),
    objetos: game.weapons.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      photoUrl: fotoParaJugador(w.photoUrl, game.id),
    })),
    miSala,
    misPistas,
    misHallazgos,
    hechos,
    // La crónica de los encuentros ya cerrados: es lo que permite retomar una
    // campaña una semana después sin que nadie recuerde dónde lo dejaron.
    cronica: (sesion.cronica ?? []).map((e) => ({
      encuentro: e.encuentro,
      titulo: e.titulo,
      resumen: e.resumen,
      cerradoEl: e.cerradoEl,
    })),
    cronologia: cronologia(plot),
    narracion: narracionActual
      ? { title: narracionActual.title, text: narracionActual.text }
      : undefined,
    miAcusacion: miAcusacion
      ? { respuestas: { ...miAcusacion.respuestas }, at: miAcusacion.at }
      : undefined,
  };

  // ---- El desenlace: la ÚNICA puerta por la que sale la solución ----
  if (terminada) {
    const ganador = sesion.winnerId
      ? sesion.players.find((p) => p.suspectId === sesion.winnerId)
      : undefined;
    const acusacionGanadora = sesion.acusaciones.find((a) => a.suspectId === sesion.winnerId);

    // Un renglón por eje, ya resuelto a nombres. Antes eran tres campos
    // —asesino, arma y sala— y el móvil los pintaba uno a uno; ahora recorre
    // lo que venga, que es lo que permite que otro juego tenga otros ejes.
    const respuestas = ejesDe(manifiesto).map((e) => {
      const entidadId = plot.solution.respuestas[e.id] ?? '';
      return {
        ejeId: e.id,
        rotulo: e.rotulo,
        entidadId,
        nombre: nombreDeEntidad(game, e.categoria, entidadId),
      };
    });

    const aciertosDe = (a: (typeof sesion.acusaciones)[number]): number =>
      aciertos(manifiesto, a.respuestas, plot.solution.respuestas);

    vista.desenlace = {
      respuestas,
      culpableId: ejeDeJugadores(manifiesto)
        ? plot.solution.respuestas[ejeDeJugadores(manifiesto)!.id]
        : undefined,
      motive: plot.solution.motive,
      reconstruccion: plot.material?.finale?.reconstruction || plot.solution.howItHappened,
      confesion: plot.material?.finale?.confession,
      epilogo: plot.material?.finale?.epilogue,
      // El ganador se anuncia haya acusado o no. Antes esto exigía que
      // existiera una acusación suya, porque en CLUEDO gana quien acierta
      // primero y siempre la hay. En una oca se gana llegando a la meta, y con
      // aquella condición el desenlace se quedaba sin ganador que anunciar.
      ganador: ganador
        ? {
            suspectId: ganador.suspectId,
            displayName: ganador.displayName,
            at: acusacionGanadora?.at ?? sesion.updatedAt,
          }
        : undefined,
      clasificacion: sesion.players
        .map((p) => {
          const suya = sesion.acusaciones.find((a) => a.suspectId === p.suspectId);
          return {
            suspectId: p.suspectId,
            displayName: p.displayName,
            acerto: suya?.correcta ?? false,
            at: suya?.at,
            aciertos: suya ? aciertosDe(suya) : 0,
          };
        })
        .sort((a, b) => {
          if (a.acerto !== b.acerto) return a.acerto ? -1 : 1;
          if (a.aciertos !== b.aciertos) return b.aciertos - a.aciertos;
          return (a.at ?? '9').localeCompare(b.at ?? '9');
        }),
    };
  }

  return vista;
}

/**
 * Vista del puesto de mando. Nunca incluye la solución: con el Game Master a
 * ciegas, su propio panel no puede decirle lo que dirige.
 */
export function vistaDeGameMaster(game: GameSession, sesion: LiveSession): VistaGameMaster {
  const revelaSolucion = game.settings?.gmPlays !== true;
  const plot = game.plot;

  const ocupacion = game.rooms.map((r) => ({
    roomId: r.id,
    roomName: r.name,
    suspectIds: sesion.players
      .filter((p) => salaDe(p, sesion.round) === r.id)
      .map((p) => p.suspectId),
  }));

  const girosPendientes = (plot?.material?.twists ?? [])
    .filter((t) => t.round === sesion.round)
    .filter((t) => {
      const jugador = sesion.players.find((p) => p.suspectId === t.suspectId);
      return jugador ? !jugador.girosRecibidos.includes(t.id) : false;
    })
    .map((t) => ({
      id: t.id,
      suspectId: t.suspectId,
      displayName: sesion.players.find((p) => p.suspectId === t.suspectId)?.displayName ?? '',
      round: t.round,
    }));

  /*
   * A CIEGAS, EL ESTADO DEL JUEGO SE FILTRA ANTES DE SALIR.
   *
   * `sesion` va entera al navegador, y dentro va `estado`, que es donde cada
   * juego guarda lo suyo: en El Misterio de la Momia, el orden verdadero de los
   * cinco ritos y qué fragmentos son falsos. El panel no lo pintaba —cumplía su
   * promesa— pero el dato estaba ahí, y con el Game Master JUGANDO eso es la
   * partida entera a un clic en las herramientas del navegador.
   *
   * Dirigiendo de la forma normal no se toca nada: quien dirige conoce la
   * solución, la lleva en su dosier, y esconderle su propio estado sería
   * quitarle medio puesto de mando por nada.
   */
  const aCiegas = game.settings?.gmPlays === true;
  /*
   * Y LAS ACUSACIONES, QUE SON LA OTRA MITAD. Salían enteras: `respuestas` con
   * a quién señaló cada cual, y `correcta` con si acertó. Una sola acusación
   * con `correcta: true` ES la solución, entregada al navegador de quien está
   * jugando. Lo que quien dirige necesita para dirigir es CUÁNTAS hay y de
   * quién —para saber cuándo abrir el sobre—, y eso se conserva.
   */
  const sesionQueSale: LiveSession = aCiegas
    ? {
        ...sesion,
        estado: estadoParaGm(game, sesion) as LiveSession['estado'],
        /*
         * `correcta: false` para todas, y no es una mentira que engañe a nadie:
         * a ciegas el panel no lo pinta —`revelaSolucion` es false— y quien
         * dirige no puede saberlo, que es justo lo que se busca. Decir la
         * verdad ahí sería decirle quién rompió el sello.
         */
        acusaciones: sesion.acusaciones.map((a) => ({
          suspectId: a.suspectId,
          respuestas: {},
          correcta: false,
          at: a.at,
        })),
        /*
         * Y LAS DOS RENDIJAS QUE QUEDABAN ABIERTAS AL LADO DE LA PUERTA.
         *
         * `winnerId` solo se escribe cuando alguien señala CORRECTAMENTE, así
         * que su mera presencia dice que esa acusación era la buena — y si el
         * id es el de quien dirige, acaba de enterarse de que acertó. Es
         * exactamente el dato que las líneas de arriba se molestan en borrar de
         * `acusaciones`, saliendo por la puerta de al lado.
         *
         * `acciones` es el registro de quién ha hecho qué en cada vigilia. No
         * nombra al saqueador por sí solo —todos los dones se ejercen con
         * `invocar`—, pero es material de juego en la pantalla de alguien que
         * está jugando, y no lo lee nadie: ni el puesto de mando ni la app lo
         * consultan.
         */
        winnerId: undefined,
        acciones: [],
        /*
         * Y EL CUADERNO DE CADA CUAL. `players` iba entero, y ahi dentro va
         * `notas`: lo que cada invitado escribe en su movil durante la velada,
         * que es privado por definicion y no lo pinta ningun panel. Con quien
         * dirige jugando, eso es leerle las notas a la mesa entera.
         *
         * `elecciones` se queda: el panel de El Paso de las Sombras las lee
         * para pintar el recorrido, y quitarlas romperia su puesto de mando.
         * Filtrar de mas es el fallo contrario.
         */
        players: sesion.players.map((p) => ({ ...p, notas: '' })),
      }
    : sesion;

  return {
    sesion: sesionQueSale,
    conectados: sesion.players.filter((p) => estaConectado(p, sesion.id)).length,
    ocupacion,
    girosPendientes,
    acusacionesRecibidas: sesion.acusaciones.length,
    listos: sesion.players
      .filter((p) => p.pideEmpezar)
      .map((p) => ({ suspectId: p.suspectId, displayName: p.displayName })),
    revelaSolucion,
  };
}

// ---------------------------------------------------------------------------
// La partida tal y como puede bajar al navegador del taller
// ---------------------------------------------------------------------------

/**
 * Lo que sale por las rutas del TALLER cuando quien dirige también juega.
 *
 * `vistaDeGameMaster` tapa la vista en vivo, y se hizo con cuidado. Pero la
 * partida entera sale además por otras nueve puertas —leerla, renombrarla,
 * tocar sus entidades, regenerar el plano y los tres avisos de «ya está lista»,
 * que terminan mandando `game` dentro— y ninguna la miraba. Con el Game Master
 * jugando, `GET /api/games/:id` bajaba al navegador `plot.solution` con el
 * nombre del culpable, `plot.delJuego` con el orden verdadero de los ritos y el
 * `secret` de cada persona. La guía que este mismo producto imprime promete por
 * escrito que no lleva la solución; el navegador la llevaba.
 *
 * EN MODO ANFITRIÓN NO SE TOCA NADA, y esa es la primera línea: quien dirige
 * sin jugar conoce la solución, la lleva en su dosier, y recortársela sería
 * quitarle medio puesto de mando por nada. CLUEDO de siempre sale byte a byte
 * igual.
 *
 * Y SE FILTRA JUSTO LO QUE SOBRA. El taller necesita saber que hay trama, qué
 * material existe y cómo se llama cada personaje; nada de eso se va. Filtrar de
 * más deja a quien dirige sin nada que leer, que es el fallo contrario y también
 * rompe la velada.
 */
export function partidaParaElTaller(game: GameSession): GameSession {
  if (game.settings?.gmPlays !== true) return game;
  const plot = game.plot;
  if (!plot) return game;

  return {
    ...game,
    plot: {
      ...plot,
      // El eje del caso: a quién señala, por qué y cómo ocurrió.
      solution: { respuestas: {}, motive: '', howItHappened: '' },
      // Los nombres se quedan —el taller los pinta—; lo privado, no.
      characters: plot.characters.map((c) => ({
        ...c,
        secret: '',
        motive: '',
        alibi: '',
      })),
      /*
       * Solo los momentos que presenció la mesa entera, con la misma regla que
       * `cronologiaPublica`: un momento con una sola persona no lo vio nadie
       * más, por mucho que venga marcado como público.
       */
      timeline: plot.timeline.filter((e) => e.isPublic === true && e.suspectIds.length > 1),
      // La pista se lee; a quién apunta, no.
      clues: plot.clues.map((c) => ({ ...c, pointsTo: '' })),
      material: plot.material
        ? {
            ...plot.material,
            twists: [],
            timelineReveals: [],
            // Las ayudas las pide el panel y las pinta; a ciegas cada una es un
            // empujón hacia la solución que quien juega no debería tener.
            hints: [],
            finale: { reconstruction: '', confession: '', epilogue: '' },
          }
        : undefined,
      // Y lo que cada juego guarda de su trama: en la Momia, el orden verdadero.
      delJuego: undefined,
    },
  };
}

/**
 * Los deltas de progreso de una generación, sin el contenido cuando no toca.
 *
 * El flujo de generación retransmitía al navegador el TEXTO CRUDO que va
 * escribiendo el modelo, y ese texto es el JSON de la trama: lleva dentro el
 * nombre del culpable, el orden verdadero de los ritos y el secreto de cada
 * persona. El taller lo pinta a pantalla completa mientras se genera, así que
 * con el Game Master jugando la solución le pasaba por delante de los ojos
 * durante los siete minutos que tarda, sin que hiciera falta abrir nada.
 *
 * Dirigiendo de la forma normal se sigue viendo tal cual: es su partida y su
 * trama, y ver cómo se escribe es parte de la ceremonia. A ciegas se manda un
 * punto por delta, que conserva lo único que el overlay necesitaba —la sensación
 * de que aquello avanza— y no dice nada.
 */
export function emisorDeProgreso(
  game: GameSession,
  emit: (evento: { type: 'text'; delta: string }) => void,
): (delta: string) => void {
  const aCiegas = game.settings?.gmPlays === true;
  return (delta: string) => emit({ type: 'text', delta: aCiegas ? '·' : delta });
}
