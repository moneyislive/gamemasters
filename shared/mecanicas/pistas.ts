/**
 * EL CONTRATO de la mecanica de las pistas: se entra en un sitio y se
 * encuentra algo.
 *
 * ═══ QUE ES UNA «MECANICA» Y POR QUE HAY UNA CAPA MAS ═══
 *
 * Habia dos capas —la plataforma y los juegos— y esto no cabia en ninguna.
 *
 * En la PLATAFORMA no cabia: durante meses la vista del jugador llevaba tres
 * campos de pistas para todo el mundo, y la de El Misterio de la Momia los
 * mandaba VACIOS setenta y seis veces en una velada. La plataforma tenia una
 * opinion sobre como se investiga y los juegos que investigan de otra forma la
 * pagaban.
 *
 * En CLUEDO tampoco: un segundo juego de misterio querria pistas, y si esto
 * viviera dentro de CLUEDO tendria que IMPORTAR CLUEDO. Los juegos no se
 * conocen entre si; esa es la regla que sostiene todo lo demas.
 *
 * Una mecanica es codigo que sirve a varios juegos, que ninguno tiene la
 * obligacion de usar, y que no sabe quien lo usa. Apuntarse es llamar a una
 * funcion. No hay registro, ni herencia, ni configuracion.
 *
 * Aqui esta la mitad que ven los dos lados —los tipos y como se lee lo que
 * llega—; el calculo esta en `server/src/mecanicas/pistas.ts`, que es el unico
 * que tiene la trama delante.
 */

/** Una pista, tal como la ve quien juega. */
export interface PistaVista {
  id: string;
  lugarId: string;
  lugarNombre: string;
  round: number;
  description: string;
  /**
   * A que senala. Solo llega a QUIEN LA ENCONTRO y solo cuando la ronda en la
   * que la encontro ya ha cerrado: mientras la ronda esta abierta,
   * interpretarla es trabajo del jugador.
   */
  pointsTo?: string;
}

/** Lo que la mecanica manda por `VistaJugador.estadoDelJuego`. */
export interface BloqueDePistas {
  /** Las de TU lugar en ESTA ronda, sin decir lo que significan. */
  misPistas: PistaVista[];
  /** TODO lo que has encontrado tu, ronda a ronda. Tuyo y de nadie mas. */
  misHallazgos: PistaVista[];
  /** Los hechos publicos que la mesa da por establecidos. */
  hechos: Array<{ round: number; time: string; fact: string }>;
}

/**
 * Lee el bloque de una vista, sin fiarse de lo que llega.
 *
 * `estadoDelJuego` es `unknown` a proposito: el nucleo no sabe que forma tiene
 * lo que cada juego mete ahi, y por tanto no puede comprobarlo. Quien lo lee si
 * sabe, y lo comprueba aqui —una vez, en un sitio— en vez de repartir
 * aserciones por las pantallas.
 *
 * Devuelve `null` cuando no esta o no tiene la forma esperada, que es lo que
 * pasa en cualquier juego que no use esta mecanica. Quien lo pinta ya sabe
 * tratar el `null`: no ensena el bloque.
 */
export function leerBloqueDePistas(v: unknown): BloqueDePistas | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.misPistas)) return null;
  if (!Array.isArray(o.misHallazgos)) return null;
  if (!Array.isArray(o.hechos)) return null;
  return {
    misPistas: o.misPistas as PistaVista[],
    misHallazgos: o.misHallazgos as PistaVista[],
    hechos: o.hechos as BloqueDePistas['hechos'],
  };
}

/**
 * Los lugares donde has encontrado algo, para marcarlos en el plano.
 *
 * Vive aqui y no en el plano porque el plano es de la plataforma: marca por
 * donde has pasado —`miRecorrido`, que significa lo mismo en cualquier juego—
 * y quien ademas distinga «aqui saque algo» lo pinta encima desde lo suyo.
 */
export function lugaresConHallazgo(bloque: BloqueDePistas | null): Set<string> {
  return new Set((bloque?.misHallazgos ?? []).map((p) => p.lugarId));
}
