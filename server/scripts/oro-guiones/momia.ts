/**
 * La velada de referencia de El Misterio de la Momia.
 *
 * ═══ POR QUÉ CONDUCE LA PARTIDA POR EL MOTOR ═══
 *
 * `verify:momia` llama a `entrarEnCamara`, `invocarDon` y `proponerOrden`
 * directamente, y hace bien: lo que comprueba es la MECÁNICA, y llamar al
 * reductor a pelo es la forma más limpia de aislarla.
 *
 * Este guion hace lo contrario y va por `ejecutarAccion`, que es la puerta por
 * la que entra un móvil de verdad. Así se congela también todo lo que ocurre
 * ANTES del reductor: que la acción exista en el manifiesto, que la fase la
 * admita, que no se haya gastado el turno, que el id elegido sea de una entidad
 * real. Esas comprobaciones producen mensajes —«Eso solo se puede hacer 1 veces
 * por ronda»— que lee gente con el móvil en la mano, y hasta hoy no los
 * congelaba nadie.
 *
 * De ahí que el guion pida cosas IMPOSIBLES a propósito: explorar dos veces en
 * la misma vigilia, o entrar en una cámara que no existe. El rechazo no rompe
 * el guion; se anota y se sigue. Un maestro de oro que solo recorra el camino
 * feliz deja sin red justo la mitad del código que más se toca al refactorizar.
 */
import { lugaresDe, personasDe } from '../../../shared/juegos';
import { abrirRonda, abrirSellado, cerrarRonda, revelarDesenlace } from '../../src/live/sesion';
import { ejecutarCierre } from '../../src/juegos/cierres';
import { generarTramaMomia, tramaDe } from '../../src/juegos/momia-trama';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';
import type { GuionDeOro, Mesa } from './tipos';

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani'];
const CAMARAS = [
  'Cámara del Barquero',
  'Pozo de las Ofrendas',
  'Antesala de los Sellos',
  'Corredor de las Estrellas',
  'Sala de la Balanza',
];
const RELIQUIAS = ['Escarabeo de lapislázuli', 'Máscara funeraria', 'Vaso canopo'];
const RITOS = [
  'Rito del Agua',
  'Rito del Aliento',
  'Rito del Nombre',
  'Rito de la Balanza',
  'Rito del Silencio',
];
const VIGILIAS = 4;
/** Fijo, como en `verify:momia`: si rotara, media instantánea cambiaría sola. */
const SAQUEADOR = 'e3';

const AHORA = '2026-03-01T21:00:00.000Z';

function partidaDeReferencia(): GameSession {
  const game: GameSession = {
    id: 'oro-momia',
    name: 'Expedición de referencia',
    status: 'ready',
    createdAt: AHORA,
    updatedAt: AHORA,
    /*
     * Las tres categorías con almacén heredado van donde el manifiesto dice, y
     * los ritos —sin campo heredado— en `entidades`. Si algo de esto estuviera
     * mal no se encontrarían los ritos, y no daría ningún error.
     */
    suspects: GENTE.map((name, i) => ({
      id: `e${i}`,
      name,
      description: `Miembro de la expedición número ${i + 1}.`,
      email: `${name.toLowerCase()}@ejemplo.es`,
    })),
    rooms: CAMARAS.map((name, i) => ({ id: `c${i}`, name, description: `Descripción de ${name}.` })),
    weapons: RELIQUIAS.map((name, i) => ({ id: `q${i}`, name, description: `Una ${name}.` })),
    entidades: { ritos: RITOS.map((name, i) => ({ id: `t${i}`, name })) },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'momia' },
  };

  // Semilla fija y saqueador fijo: sin las dos, la trama cambia en cada captura.
  game.plot = generarTramaMomia(game, {
    semilla: 'oro-de-la-momia',
    vigilias: VIGILIAS,
    saqueador: SAQUEADOR,
  });
  return game;
}

function sesionInicial(game: GameSession): LiveSession {
  return {
    id: game.id,
    juego: 'momia',
    code: 'OROMOM',
    phase: 'lobby',
    round: 0,
    totalRounds: VIGILIAS,
    players: personasDe(game).map((s, i) => ({
      participanteId: s.id,
      displayName: s.name,
      joinCode: `MOMIA${i}`,
      joined: true,
      lastSeenAt: AHORA,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    acusaciones: [],
    tablon: [],
    rev: 1,
    updatedAt: AHORA,
  };
}

function velada({ game, sesion, retratar, accion, intentar }: Mesa): void {
  const gente = personasDe(game).map((s) => s.id);
  const camaras = lugaresDe(game).map((r) => r.id);
  const trama = tramaDe(game.plot);

  retratar('sala-de-espera');

  // Una acción antes de tiempo: en la sala de espera no se explora nada.
  accion(gente[0]!, 'explorar', { camara: camaras[0]! });
  retratar('sala-de-espera-con-intento');

  for (let vigilia = 1; vigilia <= VIGILIAS; vigilia++) {
    intentar('abrir la vigilia', () => abrirRonda(sesion, 15));
    retratar(`vigilia-${vigilia}-abierta`);

    // Cada cual entra en una cámara distinta; el reparto es determinista.
    gente.forEach((id, i) => {
      accion(id, 'explorar', { camara: camaras[(i + vigilia) % camaras.length]! });
    });
    // Y quien lo intenta dos veces se lleva el «solo una vez por vigilia».
    accion(gente[0]!, 'explorar', { camara: camaras[0]! });
    // Y una cámara que no existe, para congelar también ese mensaje.
    accion(gente[1]!, 'explorar', { camara: 'camara-que-no-existe' });

    // El don propio de cada cual. Sin decir cuál: el reductor coge el suyo, y
    // eso es determinista a propósito.
    for (const id of gente) accion(id, 'invocar', {});
    // Y una ofrenda, que se puede hacer con la vigilia abierta o cerrada.
    accion(gente[2]!, 'ofrendar', { aQuien: gente[0]! });

    retratar(`vigilia-${vigilia}-jugada`);

    intentar('cerrar la vigilia', () => cerrarRonda(sesion));

    // Con la vigilia cerrada ya no se explora, pero sí se ofrenda.
    accion(gente[3]!, 'explorar', { camara: camaras[0]! });
    accion(gente[3]!, 'ofrendar', { aQuien: gente[1]! });

    retratar(`vigilia-${vigilia}-cerrada`);
  }

  /*
   * El orden verdadero, propuesto por dos personas, y uno equivocado por una
   * tercera. Así el recuento de votos tiene algo que contar y el sellado sale
   * CORRECTO, que es el camino que enseña más cosas en la vista: el desenlace
   * con el orden bueno, los ganadores y los trofeos.
   */
  const bueno = trama?.ordenVerdadero ?? [];
  const malo = [...bueno].reverse();
  accion(gente[0]!, 'proponer-orden', { orden: bueno });
  accion(gente[1]!, 'proponer-orden', { orden: bueno });
  accion(gente[2]!, 'proponer-orden', { orden: malo });
  // Y una propuesta con menos ritos de los que pide el sellado.
  accion(gente[3]!, 'proponer-orden', { orden: bueno.slice(0, 2) });
  retratar('ordenes-propuestos');

  // Alguien señala al saqueador de verdad, y otro se equivoca.
  accion(gente[0]!, 'senalar', { saqueador: SAQUEADOR });
  accion(gente[1]!, 'senalar', { saqueador: gente[2]! });
  // Y quien ya señaló no puede volver a hacerlo.
  accion(gente[0]!, 'senalar', { saqueador: gente[1]! });
  retratar('saqueador-senalado');

  intentar('abrir el sellado', () => abrirSellado(sesion));
  retratar('sellado-abierto');

  intentar('ejecutar el ritual', () => {
    ejecutarCierre(game, sesion);
  });
  retratar('ritual-ejecutado');

  intentar('revelar el desenlace', () => revelarDesenlace(game, sesion));
  retratar('desenlace');
}

export const GUION: GuionDeOro = {
  juego: 'momia',
  titulo: 'Cuatro vigilias en la tumba, y el sello vuelve a cerrarse',
  partidaDeReferencia,
  sesionInicial,
  velada,
};
