/**
 * LAS REGLAS DE LA MUDANZA, aparte del guion que las aplica.
 *
 * ═══ POR QUE ESTAN EN SU PROPIO FICHERO ═══
 *
 * Porque son la parte que puede salir mal en silencio. El guion de al lado es
 * un paseo por dos colecciones —eso o funciona o revienta— y esto es la
 * traduccion de un modelo de datos a otro: si una regla se equivoca, la partida
 * se guarda y se abre sin un solo error, con la solucion cambiada o con la mesa
 * vacia. Ese fallo no se ve hasta que hay doce personas delante.
 *
 * Separado, lo prueba `verify:juegos`: le da documentos con los nombres viejos
 * y comprueba, campo a campo, que salen con los nuevos y con lo mismo dentro.
 *
 * ES CODIGO DE UN SOLO USO y aun asi se prueba, por la misma razon por la que
 * se hace copia antes de escribir: correrlo mal cuesta las partidas de la gente.
 */

export type Obj = Record<string, unknown>;

const esObjeto = (v: unknown): v is Obj => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const lista = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(esObjeto) : []);

/** Renombra una clave si la vieja está y la nueva no. Devuelve si hizo algo. */
function renombrar(o: Obj, vieja: string, nueva: string): boolean {
  if (!(vieja in o)) return false;
  if (o[nueva] === undefined) o[nueva] = o[vieja];
  delete o[vieja];
  return true;
}

/**
 * Dónde vivía cada categoría.
 *
 * Esta tabla es la razón de ser del guion: es lo último que sabe a la vez un id
 * de categoría y un nombre de campo del almacén viejo. Sale del manifiesto de
 * cada juego, que es quien lo declaraba en `almacenHeredado`, copiada aquí para
 * que el día que ese campo desaparezca del contrato este fichero siga
 * funcionando —tiene que poder correrse contra una copia antigua.
 */
const DONDE_VIVIA: Record<string, Record<string, string>> = {
  cluedo: { suspects: 'sospechosos', rooms: 'salas', weapons: 'objetos' },
  momia: { suspects: 'expedicionarios', rooms: 'camaras', weapons: 'reliquias' },
  sombras: { suspects: 'escoltas', rooms: 'pasos', weapons: 'enseres' },
};

/** Sin `settings.juego` es CLUEDO: las partidas de antes del segundo juego. */
function juegoDe(game: Obj): string {
  const s = esObjeto(game.settings) ? game.settings : {};
  return typeof s.juego === 'string' && s.juego ? s.juego : 'cluedo';
}

export function mudarPartida(game: Obj): string[] {
  const hecho: string[] = [];

  // ---- Las entidades salen de los tres campos y entran en `entidades` ----
  const mapa = DONDE_VIVIA[juegoDe(game)] ?? DONDE_VIVIA.cluedo!;
  const entidades = esObjeto(game.entidades) ? game.entidades : {};
  for (const [campo, categoria] of Object.entries(mapa)) {
    if (!(campo in game)) continue;
    const viejas = lista(game[campo]);
    /*
     * Si la categoría YA tiene lista, gana la nueva: es donde se ha escrito
     * desde que el taller pasó por la ruta genérica, así que el campo viejo
     * puede estar rancio. Solo se copia cuando no hay nada nuevo.
     */
    if (!Array.isArray(entidades[categoria])) {
      if (viejas.length > 0) {
        entidades[categoria] = viejas;
        hecho.push(`${campo}→entidades.${categoria} (${viejas.length})`);
      }
    } else if (viejas.length > 0) {
      hecho.push(`${campo} descartado: ${categoria} ya tenía lista propia`);
    }
    delete game[campo];
  }
  if (Object.keys(entidades).length > 0) game.entidades = entidades;

  // ---- El plano ----
  const board = esObjeto(game.board) ? game.board : null;
  if (board) {
    if (renombrar(board, 'rooms', 'lugares')) hecho.push('board.rooms→lugares');
    if (renombrar(board, 'passages', 'pasadizos')) hecho.push('board.passages→pasadizos');
    for (const col of lista(board.lugares)) renombrar(col, 'roomId', 'lugarId');
    for (const p of lista(board.pasadizos)) {
      renombrar(p, 'fromRoomId', 'desdeLugarId');
      renombrar(p, 'toRoomId', 'hastaLugarId');
    }
  }

  // ---- La trama ----
  const plot = esObjeto(game.plot) ? game.plot : null;
  if (plot) {
    for (const p of lista(plot.characters)) {
      if (renombrar(p, 'suspectId', 'participanteId')) hecho.push('plot.characters');
    }
    for (const m of lista(plot.timeline)) renombrar(m, 'suspectIds', 'participanteIds');
    /*
     * LAS PISTAS SE MUDAN DE SITIO, no solo de nombre.
     *
     * `plot.clues` era un campo OBLIGATORIO del contrato de la trama, asi que
     * la Momia y las Sombras escribian `clues: []` para cumplir: fingian un
     * campo que no significa nada en su juego. Ahora las pistas son de la
     * mecanica que las usa y viven en `plot.mecanicas.pistas`.
     *
     * Una trama sin pistas no escribe nada, que es la diferencia.
     */
    if (Array.isArray(plot.clues)) {
      const pistas = lista(plot.clues);
      for (const c of pistas) renombrar(c, 'roomId', 'lugarId');
      if (pistas.length > 0) {
        const mecanicas = esObjeto(plot.mecanicas) ? plot.mecanicas : {};
        if (mecanicas.pistas === undefined) mecanicas.pistas = pistas;
        plot.mecanicas = mecanicas;
        hecho.push(`clues→mecanicas.pistas (${pistas.length})`);
      }
      delete plot.clues;
    }
    const material = esObjeto(plot.material) ? plot.material : null;
    if (material) for (const t of lista(material.twists)) renombrar(t, 'suspectId', 'participanteId');
    /*
     * LA SOLUCION VIEJA ERA UNA TERNA con los nombres de CLUEDO —`murdererId`,
     * `weaponId`, `roomId`— y la nueva es un valor por eje. No es un renombrado:
     * es un cambio de forma, porque un juego con dos ejes o con cinco no cabia
     * en una terna. Los ids de eje de CLUEDO son `culpable`, `objeto` y `lugar`.
     *
     * Solo se toca si NO hay ya `respuestas`: una partida guardada por el
     * codigo nuevo las trae, y sobreescribirlas con una terna que ya no esta
     * seria cambiar la solucion de un misterio a medio jugar.
     */
    const solution = esObjeto(plot.solution) ? plot.solution : null;
    if (solution && !solution.respuestas) {
      const terna = ['murdererId', 'weaponId', 'roomId'].filter((k) => typeof solution[k] === 'string');
      if (terna.length > 0) {
        solution.respuestas = {
          culpable: solution.murdererId ?? '',
          objeto: solution.weaponId ?? '',
          lugar: solution.roomId ?? '',
        };
        delete solution.murdererId;
        delete solution.weaponId;
        delete solution.roomId;
        hecho.push('solution→respuestas');
      }
    }
  }

  // ---- Los dosieres ----
  for (const d of lista(game.documents)) {
    if (renombrar(d, 'suspectId', 'id')) hecho.push('documents');
  }

  return hecho;
}

export function mudarSesion(sesion: Obj): string[] {
  const hecho: string[] = [];

  if (renombrar(sesion, 'acusaciones', 'respuestasEntregadas')) hecho.push('acusaciones→respuestasEntregadas');
  if (renombrar(sesion, 'winnerId', 'primeroEnAcertar')) hecho.push('winnerId→primeroEnAcertar');
  if (renombrar(sesion, 'tablon', 'porDondePasaron')) hecho.push('tablon→porDondePasaron');

  for (const j of lista(sesion.players)) {
    if (renombrar(j, 'suspectId', 'participanteId')) hecho.push('players');
    for (const e of lista(j.elecciones)) renombrar(e, 'roomId', 'lugarId');
  }
  for (const a of lista(sesion.respuestasEntregadas)) renombrar(a, 'suspectId', 'participanteId');
  for (const a of lista(sesion.acciones)) renombrar(a, 'suspectId', 'participanteId');
  for (const d of lista(sesion.denuncias)) renombrar(d, 'suspectId', 'participanteId');
  for (const p of lista(sesion.porDondePasaron)) renombrar(p, 'roomId', 'lugarId');

  return hecho;
}

