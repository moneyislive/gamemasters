/**
 * EL ROBOT DE LAS LINDES: juega una partida entera y apunta lo que hizo.
 *
 * ═══ PARA QUÉ HACE FALTA UN ROBOT Y NO UNA LISTA DE MOVIMIENTOS ═══
 *
 * Una partida de este juego son doscientos y pico movimientos con carga —una
 * casilla, un giro, una cosa donde plantar— y escribirlos a mano sería escribir una
 * partida que nadie ha jugado: cualquier cambio en el reparto de la bolsa la
 * invalidaría entera, y lo que quedaría congelado no sería el juego sino la lista.
 *
 * El robot la juega EN PROCESO, con el mismo reductor que corre en Render, y lo que
 * se congela después es la lista de apuntes que salió. Es exactamente lo que hace
 * `robot-del-burgo.ts` y por el mismo motivo.
 *
 * ═══ CÓMO JUEGA, Y POR QUÉ ASÍ ═══
 *
 * No juega bien: juega VARIADO, que es lo que hace falta para que la referencia
 * ejercite el juego entero. Dos decisiones lo consiguen y las dos están medidas en
 * `verificar-lindes.ts`, que las tiene escritas con su porqué:
 *
 *   · COLOCA PEGADO a lo que ya hay. Con la colocación al azar el tablero crece como
 *     una rama y no se cierra NI UNA ermita en diez partidas, porque una ermita
 *     necesita ocho vecinas y una rama no rodea nada.
 *   · REPARTE LOS LABRIEGOS por las cuatro clases en vez de plantar en lo primero
 *     que se ofrece. Con la lista en su orden planta casi siempre en villas, y el
 *     recuento de sendas, ermitas y prados no se ejercita nunca.
 *
 * Y todo cuelga de la semilla: la misma da la misma partida, movimiento a
 * movimiento. Sin eso, un maestro de oro no se puede capturar.
 */
import {
  EMPEZAR,
  PASAR,
  PLANTAR,
  PONER,
  avanzarLasLindes,
  deQuienEsElTurno,
  loQueSeVe,
  opcionesDeLasLindes,
  partidaNueva,
  seAcabo,
} from '../../shared/arcade/juegos/lindes';
import type { EstadoDeLasLindes } from '../../shared/arcade/juegos/lindes';
import { CLASES_DE_COSA, llaveDeCasilla } from '../../shared/arcade/juegos/lindes-losas';
import { esRechazo } from '../../shared/arcade/motor';
import { NADIE_SENTADO } from '../../shared/arcade/tipos';
import type { AsientoId } from '../../shared/arcade/tipos';

/** Un movimiento apuntado, con todo lo que hizo falta para que entrara. */
export interface ApunteDeLasLindes {
  tipo: string;
  tic: number;
  carga?: unknown;
  quien?: string | null;
  asientos?: string[];
}

/** Lo que devuelve una partida del robot. */
export interface PartidaDelRobot {
  readonly apuntes: readonly ApunteDeLasLindes[];
  readonly estado: EstadoDeLasLindes;
  readonly asientos: readonly AsientoId[];
  /** Cuántas losas quedaron puestas, para que quien llame pueda exigir que jugó. */
  readonly puestas: number;
  readonly plantados: number;
}

/** Los asientos del robot, con el mismo nombre siempre. */
export function asientosDeLasLindes(cuantos: number): AsientoId[] {
  const salida: AsientoId[] = [];
  for (let i = 0; i < cuantos; i++) salida.push(`a-${i}`);
  return salida;
}

/** El sorteo del robot: mismo número, misma partida. */
function sorteo(semilla: number): () => number {
  let x = (semilla * 2654435761) >>> 0;
  return () => {
    x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return x / 4294967296;
  };
}

/**
 * JUEGA UNA PARTIDA ENTERA Y DEVUELVE LOS APUNTES.
 *
 * El `tic` de cada apunte sube de uno en uno: este juego declara `tickHz: 0` y no
 * tiene plazos, así que el tic no es tiempo — es el número de orden que la mesa le
 * pone a cada movimiento, y lo que hace falta es que sea estable.
 */
export function jugarLasLindes(semilla: number, cuantos: number, topeDePasos = 600): PartidaDelRobot {
  const asientos = asientosDeLasLindes(cuantos);
  const tirada = sorteo(semilla);
  const apuntes: ApunteDeLasLindes[] = [];
  let tic = 0;

  const mandar = (tipo: string, carga: unknown, quien: AsientoId | null, estado: EstadoDeLasLindes): EstadoDeLasLindes => {
    tic++;
    const apunte: ApunteDeLasLindes = { tipo, tic, quien, asientos: [...asientos] };
    if (carga !== undefined && carga !== null) apunte.carga = carga;
    apuntes.push(apunte);
    /*
     * ═══ EL AZAR DEL CONTEXTO ES LA SEMILLA, SIEMPRE LA MISMA ═══
     *
     * Y no `semilla + tic`, que es lo que se escribió primero. El apunte que se
     * congela lleva el tipo, el tic, la carga, quién y los asientos — NO lleva el
     * azar—, así que quien reejecuta la referencia (`oro-arcade.ts`) construye el
     * contexto con `g.semilla` para todos los movimientos. Con un azar que cambiaba
     * en cada apunte, la bolsa que se barajaba al reejecutar era OTRA, y a partir de
     * ahí todos los movimientos eran ilegales: la referencia salía con 111
     * movimientos de los que sólo 3 cambiaban el estado, y en verde, porque congelar
     * una partida que no se juega es perfectamente posible.
     */
    const salida = avanzarLasLindes(estado, { tipo, carga }, { quien, azar: semilla, tic, asientos });
    return esRechazo(salida) ? salida.estado : salida;
  };

  let estado = mandar(EMPEZAR, null, asientos[0] as AsientoId, partidaNueva());

  let pasos = 0;
  while (!seAcabo(estado) && pasos < topeDePasos) {
    pasos++;
    const quien = deQuienEsElTurno(estado);
    if (quien === null) break;
    const vista = loQueSeVe(estado, quien, NADIE_SENTADO);
    const opciones = opcionesDeLasLindes(vista, quien);
    if (opciones.length === 0) break;

    /* Plantar repartiendo por clases, que es lo que ejercita los cuatro recuentos. */
    const quiere = CLASES_DE_COSA[pasos % CLASES_DE_COSA.length] as string;
    const plantar =
      opciones.find((o) => o.tipo === PLANTAR && o.id.indexOf(`plantar:${quiere}:`) === 0) ??
      opciones.find((o) => o.tipo === PLANTAR);
    if (plantar !== undefined) {
      estado = mandar(plantar.tipo, plantar.carga, quien, estado);
      continue;
    }

    /* Y colocar pegado a lo que ya hay, que es lo que cierra ermitas. */
    const poner = opciones.filter((o) => o.tipo === PONER);
    if (poner.length === 0) {
      const pasa = opciones.find((o) => o.tipo === PASAR) ?? opciones[0];
      if (pasa === undefined) break;
      estado = mandar(pasa.tipo, pasa.carga, quien, estado);
      continue;
    }
    let mejor = -1;
    let mejores = poner;
    for (const o of poner) {
      const c = o.carga as { x: number; y: number };
      let vecinas = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          if (estado.tablero[llaveDeCasilla(c.x + dx, c.y + dy)] !== undefined) vecinas++;
        }
      }
      if (vecinas > mejor) {
        mejor = vecinas;
        mejores = [o];
      } else if (vecinas === mejor) {
        mejores.push(o);
      }
    }
    const elegida = mejores[Math.floor(tirada() * mejores.length)] as (typeof mejores)[number];
    estado = mandar(elegida.tipo, elegida.carga, quien, estado);
  }

  return {
    apuntes,
    estado,
    asientos,
    puestas: Object.keys(estado.tablero).length,
    plantados: estado.plantados.length,
  };
}
