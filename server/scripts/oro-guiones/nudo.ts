/**
 * La velada de referencia de El Nudo de Valdehierro.
 *
 * Conduce la partida por `ejecutarAccion`, como los guiones de la Momia y de
 * las Sombras y por la misma razón: congelar también lo que ocurre ANTES del
 * reductor. Aquí eso importa especialmente, porque este juego tiene dos
 * rechazos que SON reglas y cuyo mensaje lee gente con el móvil en la mano:
 *
 *   · «El enclavamiento no da paso a X. Ese no es el que toca.» Es lo que se
 *     lee cuando la mesa se equivoca de convoy, y es la mitad de la tensión de
 *     la noche.
 *   · «Eso no sale. Vuelve a mirarlo.» Es lo que se lee al fallar un
 *     instrumento, y va acompañado de una propiedad que no se ve en la vista:
 *     que fallar NO gasta nada.
 *
 * ═══ LA VELADA QUE SE CONGELA NO ES LA PERFECTA ═══
 *
 * Se juega a propósito con una orden rechazada, un instrumento fallado, una
 * franja perdida y dos cuadros entregados —uno bueno y uno al revés—. Un guion
 * que solo recorriera el camino feliz congelaría la mitad del producto: los
 * mensajes de rechazo, el retraso subiendo, la franja que se corre y el
 * desenlace de quien no acertó no aparecerían por ningún lado.
 *
 * TODO SEMBRADO. Ni `Math.random` ni `Date.now`: la trama sale de una semilla
 * fija y los instrumentos son deterministas por construcción —dependen del id
 * de la partida, del puesto y de la franja— así que la instantánea es la misma
 * en cada captura.
 */
import { personasDe } from '../../../shared/juegos';
import { abrirRespuestas, abrirRonda, cerrarRonda, revelarDesenlace } from '../../src/live/sesion';
import { ejecutarCierre } from '../../src/juegos/cierres';
import { generarTramaNudo, tramaDe } from '../../src/juegos/nudo-trama';
import { plantearInstrumento, resolverManiobra } from '../../src/juegos/nudo-instrumentos';
import type {
  CarguePlanteado,
  ManiobraPlanteada,
  OficioId,
} from '../../../shared/juegos/nudo-tipos';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';
import type { GuionDeOro, Mesa } from './tipos';

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani'];
const CONVOYES = [
  'El Correo de Medianoche',
  'El mixto de Penarroya',
  'El carbonero de la Cuenca',
  'El expreso de la frontera',
  'El tren de obras del 84',
  'El ganadero de Villaseca',
];
const PUESTOS = [
  'La garita del kilometro 83',
  'El cuarto del telegrafo',
  'El muelle cubierto',
  'La sala de aparatos',
];
const MERCANCIAS = ['El suero antidifterico', 'Hulla de la Cuenca', 'Reses para el matadero'];

const FRANJAS = 6;
const AHORA = '2027-01-14T22:00:00.000Z';

function partidaDeReferencia(): GameSession {
  const game: GameSession = {
    id: 'oro-nudo',
    name: 'Nudo de referencia',
    status: 'ready',
    createdAt: AHORA,
    updatedAt: AHORA,
    entidades: {
      ferroviarios: GENTE.map((name, i) => ({
        id: `f${i}`,
        name,
        description: `Del turno de noche, ${i + 1}.º de la lista.`,
        email: `${name.toLowerCase()}@ejemplo.es`,
      })),
      convoyes: CONVOYES.map((name, i) => ({
        id: `c${i}`,
        name,
        description: `Descripcion de ${name}.`,
      })),
      puestos: PUESTOS.map((name, i) => ({
        id: `p${i}`,
        name,
        description: `Descripcion de ${name}.`,
      })),
      mercancias: MERCANCIAS.map((name, i) => ({ id: `m${i}`, name })),
    },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'nudo' },
  };

  /* Semilla fija: sin ella, el cuadro cambia en cada captura. */
  game.plot = generarTramaNudo(game, { semilla: 'oro-del-nudo' });
  return game;
}

function sesionInicial(game: GameSession): LiveSession {
  return {
    id: game.id,
    juego: 'nudo',
    code: 'ORONUD',
    phase: 'lobby',
    round: 0,
    totalRounds: FRANJAS,
    players: personasDe(game).map((s, i) => ({
      participanteId: s.id,
      displayName: s.name,
      joinCode: `NUDO${i}`,
      joined: true,
      lastSeenAt: AHORA,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    respuestasEntregadas: [],
    porDondePasaron: [],
    rev: 1,
    updatedAt: AHORA,
  };
}

/**
 * La respuesta buena del instrumento de un puesto en una franja.
 *
 * Se plantea aquí con los mismos tres datos que usa el servidor, así que sale el
 * mismo problema. Es la misma propiedad que hace jugable `verify:nudo` sin abrir
 * la app, y por eso conviene que la ejerzan las dos: si el planteamiento dejara
 * de ser determinista, las dos se pondrían rojas a la vez y no habría duda de
 * dónde mirar.
 */
function respuestaDelInstrumento(
  game: GameSession,
  puestoId: string,
  franja: number,
): string {
  const trama = tramaDe(game.plot);
  const cual: OficioId = trama?.oficioDePuesto[puestoId] ?? 'agujas';
  const inst = plantearInstrumento(cual, franja, `${game.id}:${puestoId}`, {
    convoyes: CONVOYES,
    puestos: PUESTOS,
    mercancias: MERCANCIAS,
  });

  if (cual === 'agujas') {
    const p = inst.planteamiento as ManiobraPlanteada;
    const camino = resolverManiobra(p.entrada, p.objetivo) ?? [];
    return camino
      .map((m) => (m.hacer === 'pasar' ? 'p' : `${m.hacer === 'apartar' ? 'a' : 's'}${m.via}`))
      .join(',');
  }
  if (cual === 'telegrafo') return (inst.solucion as { palabra: string }).palabra;
  if (cual === 'enclavamiento') return (inst.solucion as { minima: number[] }).minima.join(',');

  const p = inst.planteamiento as CarguePlanteado;
  const asignado: Record<string, string> = {};
  const back = (i: number): boolean => {
    if (i === p.bultos.length) return true;
    const bulto = p.bultos[i]!;
    for (const vagon of p.vagones) {
      const carga = p.bultos
        .filter((b) => asignado[b.id] === vagon.id)
        .reduce((a, b) => a + b.peso, 0);
      if (carga + bulto.peso > vagon.tope) continue;
      const choca = p.incompatibles.some(
        ([x, y]) =>
          (x === bulto.id && asignado[y] === vagon.id) ||
          (y === bulto.id && asignado[x] === vagon.id),
      );
      if (choca) continue;
      asignado[bulto.id] = vagon.id;
      if (back(i + 1)) return true;
      delete asignado[bulto.id];
    }
    return false;
  };
  back(0);
  return Object.entries(asignado)
    .map(([b, v]) => `${b}:${v}`)
    .join(',');
}

function velada({ game, sesion, retratar, accion, intentar }: Mesa): void {
  const gente = personasDe(game).map((s) => s.id);
  const trama = tramaDe(game.plot);
  const cuadro = trama?.cuadro ?? [];

  retratar('sala-de-espera');

  /*
   * QUIÉN VA A CADA PUESTO ESTÁ FIJADO, y no repartido al azar ni por módulo de
   * la franja: si rotara, media instantánea cambiaría sola cada vez que alguien
   * añadiera una franja o una persona.
   */
  const DESTINO: Record<string, string> = { f0: 'p0', f1: 'p1', f2: 'p2', f3: 'p3' };

  /** Cuántos convoyes se han despachado ya, para saber cuál toca. */
  let despachados = 0;

  for (let franja = 1; franja <= FRANJAS; franja++) {
    intentar('abrir la franja', () => abrirRonda(sesion, 15));
    retratar(`franja-${franja}-abierta`);

    /* Antes de ocupar nada no se toca el instrumento: es una regla. */
    if (franja === 1) accion(gente[0]!, 'rendir-instrumento', { respuesta: 'p,p,p' });

    for (const id of gente) {
      const puesto = DESTINO[id] ?? 'p0';
      accion(id, 'ocupar-puesto', { puesto });
    }

    /* Una respuesta mala, que no gasta nada, y luego la buena. */
    if (franja === 1) {
      accion(gente[0]!, 'rendir-instrumento', { respuesta: 'esto-no-vale' });
    }
    for (const id of gente) {
      const puesto = DESTINO[id] ?? 'p0';
      accion(id, 'rendir-instrumento', {
        respuesta: respuestaDelInstrumento(game, puesto, franja),
      });
    }
    /* Y repetir el mismo instrumento no cuela. */
    if (franja === 1) {
      accion(gente[0]!, 'rendir-instrumento', {
        respuesta: respuestaDelInstrumento(game, DESTINO[gente[0]!] ?? 'p0', franja),
      });
    }

    retratar(`franja-${franja}-trabajada`);

    /*
     * LA FRANJA 3 SE PIERDE A PROPÓSITO. Es lo que congela la propiedad más
     * importante de este juego: una franja sin despacho no bloquea la noche,
     * el cuadro se corre y se sigue. Sin esto, la instantánea solo probaría el
     * camino feliz.
     */
    if (franja !== 3) {
      /* En la primera, una orden equivocada antes de la buena. */
      if (franja === 1) {
        const otro = cuadro.find((c) => c !== cuadro[0]);
        if (otro) accion(gente[0]!, 'cursar-orden', { convoy: otro });
      }
      const toca = cuadro[despachados];
      if (toca) {
        accion(gente[1]!, 'cursar-orden', { convoy: toca });
        despachados++;
      }
    }

    /* El archivo y la maña, una vez cada uno, para que queden congelados. */
    if (franja === 2) {
      accion(gente[2]!, 'consultar-archivo', { convoy: cuadro[0] ?? 'c0', franja: '1' });
      accion(gente[3]!, 'usar-mana', {});
    }
    if (franja === 4) accion(gente[0]!, 'recuperar-tiempo', {});

    intentar('cerrar la franja', () => cerrarRonda(sesion));
    retratar(`franja-${franja}-cerrada`);
  }

  intentar('abrir el cuadro final', () => abrirRespuestas(sesion));
  retratar('cuadro-final-abierto');

  /*
   * Dos entregas: una buena y una al revés. Así el desenlace tiene las dos
   * cosas que se pintan —acertar y no acertar— y el trofeo del cuadro de
   * memoria se concede a uno y no al otro.
   */
  const bueno: Record<string, string> = {};
  cuadro.forEach((c, i) => {
    bueno[`franja-${i + 1}`] = c;
  });
  const alReves: Record<string, string> = {};
  [...cuadro].reverse().forEach((c, i) => {
    alReves[`franja-${i + 1}`] = c;
  });

  accion(gente[0]!, 'entregar-cuadro', bueno);
  accion(gente[1]!, 'entregar-cuadro', alReves);
  /* Y quien ya entregó no puede volver a hacerlo. */
  accion(gente[0]!, 'entregar-cuadro', bueno);
  /* Ni se admite un cuadro con un convoy repetido. */
  accion(gente[2]!, 'entregar-cuadro', { ...bueno, 'franja-2': bueno['franja-1'] ?? '' });
  retratar('cuadros-entregados');

  intentar('dar el parte del amanecer', () => {
    ejecutarCierre(game, sesion);
  });
  retratar('amanecer-dado');

  intentar('revelar el desenlace', () => revelarDesenlace(game, sesion));
  retratar('desenlace');
}

export const GUION: GuionDeOro = {
  juego: 'nudo',
  titulo: 'Seis franjas, una franja perdida y el parte del amanecer',
  partidaDeReferencia,
  sesionInicial,
  velada,
};
