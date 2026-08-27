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
 *     `pointsTo` —lo que la pista significa— no sale hasta que la ronda cierra
 *     y la pista pasa al tablón común.
 *  4. El conocimiento del personaje se desbloquea ronda a ronda.
 *  5. Los giros personales solo llegan a su destinatario.
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
import { proyectarEstado } from '../juegos/proyecciones';
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
  const terminada = sesion.phase === 'desenlace';

  // ---- Conocimiento, desbloqueado por rondas ----
  const todoElConocimiento = personaje?.knowledge ?? [];
  const desbloqueado = enJuego
    ? conocimientoDesbloqueado(todoElConocimiento.length, sesion.round, sesion.totalRounds)
    : 0;

  // ---- Mis giros: solo los que ya se han entregado ----
  const giros = (plot.material?.twists ?? [])
    .filter((t) => t.suspectId === suspectId && jugador.girosRecibidos.includes(t.id))
    .map((t) => ({ id: t.id, round: t.round, instruction: t.instruction }));

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

  // ---- Tablón común: lo que se destapó en rondas ya cerradas ----
  const tablon: PistaVista[] = [];
  for (const entrada of sesion.tablon) {
    for (const clue of plot.clues) {
      if (clue.roomId === entrada.roomId && clue.round === entrada.round) {
        tablon.push(pistaVista(game, clue, true));
      }
    }
  }

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
      victima: { nombre: plot.victim.name, descripcion: plot.victim.description },
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
      notas: jugador.notas,
      soyCulpable: esElSenalado(manifiesto, plot.solution.respuestas, suspectId),
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
          conectado: estaConectado(p),
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
    tablon,
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

  return {
    sesion,
    conectados: sesion.players.filter(estaConectado).length,
    ocupacion,
    girosPendientes,
    acusacionesRecibidas: sesion.acusaciones.length,
    listos: sesion.players
      .filter((p) => p.pideEmpezar)
      .map((p) => ({ suspectId: p.suspectId, displayName: p.displayName })),
    revelaSolucion,
  };
}
