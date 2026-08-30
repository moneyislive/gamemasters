/**
 * La velada de referencia de El Paso de las Sombras.
 *
 * Conduce la partida por `ejecutarAccion`, igual que el guion de la Momia y por
 * la misma razón: congelar también lo que ocurre antes del reductor. Aquí eso
 * importa todavía más, porque este juego tiene una acción cuyo rechazo ES una
 * regla del juego —dar la contraseña equivocada en un paso no te gasta la hora—
 * y ese mensaje no lo congelaba nadie.
 */
import { personasDe } from '../../../shared/juegos';
import { abrirAcusaciones, abrirRonda, cerrarRonda, revelarDesenlace } from '../../src/live/sesion';
import { ejecutarCierre } from '../../src/juegos/cierres';
import { generarTramaSombras, tramaDe } from '../../src/juegos/sombras-trama';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';
import type { GuionDeOro, Mesa } from './tipos';

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani'];
const PASOS = [
  'El Vado del Kizu',
  'El Collado de Kabuto',
  'El Bosque de Tsuge',
  'El Puerto de Otogi',
  'La Cuesta de Kashiwabara',
  'La Playa de Shirako',
];
const ENSERES = ['El farol de papel', 'La plata de Chaya', 'La lanza de Hanzo'];
const ESTANDARTES = [
  'Las tres malvarrosas',
  'El carro de los Hattori',
  'La tela de Chaya',
  'El pino de los Tarao',
];
const HORAS = 4;
/** Fijo, como en `verify:sombras`: si rotara, media instantánea cambiaría sola. */
const KANCHO = 'e3';

const AHORA = '2026-06-21T21:00:00.000Z';

function partidaDeReferencia(): GameSession {
  const game: GameSession = {
    id: 'oro-sombras',
    name: 'Cruce de referencia',
    status: 'ready',
    createdAt: AHORA,
    updatedAt: AHORA,
    /*
     * Las tres categorías con almacén heredado van donde el manifiesto dice, y
     * los estandartes —sin campo heredado— en `entidades`. Si algo de esto
     * estuviera mal no se encontrarían los estandartes, y nadie daría un error.
     */
    suspects: GENTE.map((name, i) => ({
      id: `e${i}`,
      name,
      description: `Escolta número ${i + 1}.`,
      email: `${name.toLowerCase()}@ejemplo.es`,
    })),
    rooms: PASOS.map((name, i) => ({ id: `p${i}`, name, description: `Descripción de ${name}.` })),
    weapons: ENSERES.map((name, i) => ({ id: `n${i}`, name, description: `${name}.` })),
    entidades: { estandartes: ESTANDARTES.map((name, i) => ({ id: `b${i}`, name })) },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'sombras' },
  };

  // Semilla fija y kanchō fijo: sin las dos, la trama cambia en cada captura.
  game.plot = generarTramaSombras(game, {
    semilla: 'oro-de-las-sombras',
    horas: HORAS,
    kancho: KANCHO,
  });
  return game;
}

function sesionInicial(game: GameSession): LiveSession {
  return {
    id: game.id,
    juego: 'sombras',
    code: 'OROSOM',
    phase: 'lobby',
    round: 0,
    totalRounds: HORAS,
    players: personasDe(game).map((s, i) => ({
      participanteId: s.id,
      displayName: s.name,
      joinCode: `SOMBR${i}`,
      joined: true,
      lastSeenAt: AHORA,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    respuestasEntregadas: [],
    tablon: [],
    rev: 1,
    updatedAt: AHORA,
  };
}

function velada({ game, sesion, retratar, accion, intentar }: Mesa): void {
  const gente = personasDe(game).map((s) => s.id);
  const trama = tramaDe(game.plot);
  const senda = trama?.sendaVerdadera ?? [];
  const contrasenas = trama?.contrasenas ?? {};

  retratar('sala-de-espera');

  for (let hora = 1; hora <= HORAS; hora++) {
    intentar('abrir la hora', () => abrirRonda(sesion, 15));
    retratar(`hora-${hora}-abierta`);

    /*
     * El paso que toca de la senda verdadera, con su contraseña buena. Si la
     * senda es más corta que las horas, se repite el último: lo que importa es
     * que el recorrido sea el mismo en cada captura.
     */
    const paso = senda[Math.min(hora - 1, senda.length - 1)];

    if (paso) {
      // Primero, la palabra equivocada: no gasta la hora, y ese es el punto.
      accion(gente[0]!, 'avanzar', { paso, contrasena: 'no-es-esta' });
      // Y ahora la buena, para todo el mundo.
      for (const id of gente) accion(id, 'avanzar', { paso, contrasena: contrasenas[paso] ?? '' });
      // Quien ya avanzó no puede volver a hacerlo esta hora.
      accion(gente[0]!, 'avanzar', { paso, contrasena: contrasenas[paso] ?? '' });
    }

    // El papel propio de cada cual. Sin decir cuál: el reductor coge el suyo.
    for (const id of gente) accion(id, 'invocar', {});
    // Un aval y un enser, que se pueden dar con la hora abierta o cerrada.
    accion(gente[1]!, 'avalar', { aQuien: gente[0]! });
    accion(gente[2]!, 'entregar', { enser: 'n0', aQuien: gente[0]! });

    retratar(`hora-${hora}-andada`);

    intentar('cerrar la hora', () => cerrarRonda(sesion));

    // Con la hora cerrada ya no se anda, pero sí se avala.
    accion(gente[3]!, 'avanzar', { paso: paso ?? 'p0', contrasena: contrasenas[paso ?? 'p0'] ?? '' });
    accion(gente[3]!, 'avalar', { aQuien: gente[1]! });

    retratar(`hora-${hora}-cerrada`);
  }

  intentar('abrir el consejo del alba', () => abrirAcusaciones(sesion));
  retratar('consejo-abierto');

  /*
   * La senda verdadera, propuesta por dos, y una equivocada por un tercero.
   * Así el recuento tiene algo que contar y la columna embarca — que es el
   * camino que enseña más cosas en la vista: la senda buena, los ganadores,
   * los hitos con su marca de falso y los trofeos.
   */
  const mala = [...senda].reverse();
  accion(gente[0]!, 'proponer-senda', { senda });
  accion(gente[1]!, 'proponer-senda', { senda });
  accion(gente[2]!, 'proponer-senda', { senda: mala });
  // Y una con menos pasos de los que pide el consejo.
  accion(gente[3]!, 'proponer-senda', { senda: senda.slice(0, 2) });
  retratar('sendas-propuestas');

  // Mayoría estricta contra el kanchō de verdad: se le anula el voto.
  accion(gente[0]!, 'senalar', { kancho: KANCHO });
  accion(gente[1]!, 'senalar', { kancho: KANCHO });
  accion(gente[2]!, 'senalar', { kancho: gente[0]! });
  // Y quien ya señaló no puede volver a hacerlo.
  accion(gente[0]!, 'senalar', { kancho: gente[1]! });
  retratar('kancho-senalado');

  intentar('celebrar el consejo', () => {
    ejecutarCierre(game, sesion);
  });
  retratar('consejo-celebrado');

  intentar('revelar el desenlace', () => revelarDesenlace(game, sesion));
  retratar('desenlace');
}

export const GUION: GuionDeOro = {
  juego: 'sombras',
  titulo: 'Cuatro horas de camino, y el consejo habla al alba',
  partidaDeReferencia,
  sesionInicial,
  velada,
};
