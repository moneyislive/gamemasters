/**
 * LA MECANICA DE LAS PISTAS: se entra en un sitio y se encuentra algo.
 *
 * ═══ POR QUE HAY UNA CARPETA `mecanicas/` Y QUE ES ═══
 *
 * Habia dos capas —la plataforma y los juegos— y esto no cabia en ninguna.
 *
 * En la PLATAFORMA no cabe: durante meses `live/proyeccion.ts` componia las
 * pistas de todo el mundo, y el resultado es que la vista de El Misterio de la
 * Momia llevaba tres listas vacias en cada uno de los setenta y seis envios de
 * una velada. La plataforma tenia una opinion sobre como se investiga, y los
 * juegos que investigan de otra forma la pagaban.
 *
 * En CLUEDO tampoco: `plot.clues` lo genera el generador de tramas, que es
 * compartido, y un juego nuevo de misterio querria pistas sin tener que copiar
 * este fichero ni depender de CLUEDO. Si esto viviera dentro de CLUEDO, el
 * segundo juego de misterio tendria que IMPORTAR CLUEDO, que es exactamente lo
 * que no puede pasar: los juegos no se conocen entre si.
 *
 * Una mecanica es la tercera capa: codigo que sirve a varios juegos, que
 * NINGUNO tiene que usar, y que no sabe quien lo usa. Se coge llamandola desde
 * la proyeccion propia. No hay registro ni herencia ni configuracion: es una
 * funcion, y apuntarse es llamarla.
 *
 * Quien la usa hoy: CLUEDO, y «El Legado» en el verificador del segundo juego
 * —que es la prueba de que se puede usar sin ser CLUEDO.
 */
import { salaDe } from '../live/sesion';
import { lugaresDe, manifiestoDe, faseEs } from '../../../shared/juegos';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';
import type { BloqueDePistas, PistaVista } from '../../../shared/mecanicas/pistas';

export type { BloqueDePistas, PistaVista };

/*
 * Los TIPOS estan en `shared/mecanicas/pistas.ts`, con la funcion que los lee
 * al otro lado del cable. Aqui solo esta el calculo, que necesita la trama y
 * por tanto no puede vivir en `shared/`.
 */
function pistaVista(
  game: GameSession,
  clue: { id: string; lugarId?: string; description: string; pointsTo: string; round: number },
  conSignificado: boolean,
): PistaVista {
  const lugar = lugaresDe(game).find((r) => r.id === clue.lugarId);
  return {
    id: clue.id,
    lugarId: clue.lugarId ?? '',
    lugarNombre: lugar?.name ?? 'Sin lugar',
    round: clue.round,
    description: clue.description,
    ...(conSignificado ? { pointsTo: clue.pointsTo } : {}),
  };
}

/**
 * Compone el bloque para UNA persona.
 *
 * Devuelve `undefined` si la partida no tiene trama o si quien pregunta no
 * juega: sin eso no hay pistas, y un objeto con tres listas vacias solo seria
 * ruido en el cable —que es justo lo que hacia cuando esto vivia en el nucleo.
 */
export function bloqueDePistas(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
): BloqueDePistas | undefined {
  const plot = game.plot;
  if (!plot) return undefined;
  const jugador = sesion.players.find((p) => p.participanteId === participanteId);
  if (!jugador) return undefined;

  /*
   * Por el PAPEL de la fase, no por su nombre. Aqui decia `sesion.phase !==
   * 'lobby'` y `=== 'ronda-abierta'`, que son nombres de fase de CLUEDO: un
   * juego que llamara «velatorio» a su sala de espera veia pistas dentro de
   * ella. Se le pregunta al manifiesto, que es quien sabe que hace cada fase.
   */
  const manifiesto = manifiestoDe(sesion.juego);
  const enEspera = faseEs(manifiesto, sesion.phase, 'espera');
  const abierta = faseEs(manifiesto, sesion.phase, 'turno');

  const miLugar = enEspera ? undefined : salaDe(jugador, sesion.round);
  const misPistas =
    abierta && miLugar
      ? plot.clues
          .filter((c) => c.lugarId === miLugar && c.round === sesion.round)
          .map((c) => pistaVista(game, c, false))
      : [];

  const misHallazgos: PistaVista[] = [];
  if (!enEspera) {
    for (let ronda = 1; ronda <= sesion.round; ronda++) {
      const lugar = salaDe(jugador, ronda);
      if (!lugar) continue;
      const cerrada = ronda < sesion.round || !abierta;
      for (const clue of plot.clues) {
        if (clue.lugarId === lugar && clue.round === ronda) {
          misHallazgos.push(pistaVista(game, clue, cerrada));
        }
      }
    }
  }

  const hechos = (plot.material?.timelineReveals ?? [])
    .filter((r) => r.round < sesion.round || (r.round === sesion.round && !abierta))
    .sort((a, b) => a.round - b.round)
    .map((r) => ({ round: r.round, time: r.time, fact: r.fact }));

  return { misPistas, misHallazgos, hechos };
}
