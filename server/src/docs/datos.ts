/**
 * Datos derivados de la trama, compartidos por TODOS los documentos.
 *
 * El riesgo real de generar quince documentos desde plantillas independientes
 * es que se contradigan entre sí: que el manual anuncie unas salas activas y
 * las etiquetas rotulen otras. Por eso todo lo que se deduce —rondas, salas
 * activas, códigos de sobre, el hueco de la cronología— se calcula aquí una vez
 * y lo consume quien lo necesite.
 */
import { REGLAS_CLUEDO } from '../../../shared/juegos/cluedo';
import type { ReglaDeJuego } from '../../../shared/juegos';
import type { GameSession, Plot, PlotClue, Room, Suspect, TimelineEvent } from '../../../shared/types';
import { culpableDe } from '../juegos/cluedo';
import { lugaresDe, manifiestoSiExiste, personasDe } from '../../../shared/juegos';

// ---------------------------------------------------------------------------
// Rondas y reparto de pistas
// ---------------------------------------------------------------------------

/**
 * Cuántas rondas tiene la partida.
 *
 * Se deduce del reparto real de pistas en vez de fijarlo: si la trama solo
 * reparte tres, el material sale con tres. El tope evita que una pista con un
 * número disparatado genere cuarenta bloques.
 */
export function numeroDeRondas(plot: Plot): number {
  const rondas = plot.clues
    .map((pista) => pista.round)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
  if (rondas.length === 0) return 4;
  return Math.max(...rondas);
}

/** Pistas agrupadas por ronda, en orden. Las rondas sin pistas salen vacías. */
export function pistasPorRonda(plot: Plot): Map<number, PlotClue[]> {
  const total = numeroDeRondas(plot);
  const mapa = new Map<number, PlotClue[]>();
  for (let ronda = 1; ronda <= total; ronda++) mapa.set(ronda, []);
  for (const pista of plot.clues) {
    const ronda = Number.isInteger(pista.round) ? pista.round : 1;
    // Una pista con una ronda fuera de rango se recoge en la primera antes que
    // desaparecer del material sin que nadie se entere.
    mapa.get(mapa.has(ronda) ? ronda : 1)?.push(pista);
  }
  return mapa;
}

/**
 * Salas con evidencia nueva en una ronda, en el orden en que están definidas.
 *
 * No se fuerza ningún reparto: se agrupa lo que la trama traiga. Cuadrar
 * «cuatro salas por ronda» era una propiedad de una partida concreta —ocho
 * salas divididas entre dos pasadas—, no una regla del sistema.
 */
export function salasActivas(game: GameSession, plot: Plot, ronda: number): Room[] {
  const pistas = pistasPorRonda(plot).get(ronda) ?? [];
  const ids = new Set(pistas.map((p) => p.roomId).filter((id): id is string => Boolean(id)));
  return lugaresDe(game).filter((sala) => ids.has(sala.id));
}

// ---------------------------------------------------------------------------
// Códigos de sobre
// ---------------------------------------------------------------------------

/** Palabras que no distinguen una sala de otra y estorban en un código. */
const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'a', 'al']);

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((palabra) => palabra && !VACIAS.has(palabra.toLowerCase()))
    .join(' ');
}

/**
 * Código corto y estable para una sala.
 *
 * Depende SOLO del nombre, nunca del orden del array: si dependiera del orden,
 * borrar una sala renombraría el código de otra y las etiquetas ya impresas
 * dejarían de casar con el manual. Ante un empate se alarga el código con más
 * letras del nombre, y solo si aun así coinciden se recurre al orden alfabético.
 */
export function codigosDeSala(rooms: Room[]): Map<string, string> {
  const codigos = new Map<string, string>();
  // Se recorre en orden alfabético para que el desempate no dependa de en qué
  // orden se crearon las salas.
  const ordenadas = [...rooms].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const usados = new Set<string>();

  for (const sala of ordenadas) {
    if (sala.shortCode) {
      codigos.set(sala.id, sala.shortCode.toUpperCase());
      usados.add(sala.shortCode.toUpperCase());
      continue;
    }
    const palabras = normalizar(sala.name).split(' ').filter(Boolean);
    const base = palabras[0] ?? 'SALA';

    // Primero la primera palabra entera; luego se le van pegando iniciales de
    // las siguientes; como último recurso, un número.
    const candidatos: string[] = [base];
    for (let i = 1; i < palabras.length; i++) {
      candidatos.push(base + '-' + palabras.slice(1, i + 1).map((p) => p[0]).join(''));
    }
    let elegido = candidatos.find((c) => !usados.has(c));
    if (!elegido) {
      let n = 2;
      while (usados.has(`${base}${n}`)) n++;
      elegido = `${base}${n}`;
    }
    usados.add(elegido);
    codigos.set(sala.id, elegido);
  }
  return codigos;
}

export interface SobreDeLaPartida {
  codigo: string;
  /** Qué lleva dentro, sin destripar nada. */
  contenido: string;
  grupo: 'Dosieres' | 'Pistas' | 'Dirección';
  /** Solo lo maneja quien prepara, nunca el Game Master a ciegas. */
  soloPreparador: boolean;
}

/**
 * Inventario completo de sobres de la partida.
 *
 * Los códigos no revelan nada de la trama: son la sala y la ronda, que el Game
 * Master anuncia igualmente en voz alta. Lo que sí revelaría algo —a quién
 * pertenece cada cosa más allá de su dosier— no se rotula.
 */
export function inventarioSobres(game: GameSession, plot: Plot): SobreDeLaPartida[] {
  const aCiegas = game.settings?.gmPlays === true;
  const codigos = codigosDeSala(lugaresDe(game));
  const sobres: SobreDeLaPartida[] = [];

  for (const sospechoso of personasDe(game)) {
    sobres.push({
      codigo: sospechoso.name.toUpperCase(),
      contenido: 'Su dosier de personaje',
      grupo: 'Dosieres',
      soloPreparador: aCiegas,
    });
  }

  sobres.push({
    codigo: aCiegas ? 'GM · GUÍA' : 'GM',
    contenido: aCiegas ? 'La guía de la velada, sin la solución' : 'El dosier del Game Master',
    grupo: 'Dosieres',
    soloPreparador: false,
  });

  /*
   * LOS SOBRES DE LO QUE SE REPARTE DURANTE LA VELADA.
   *
   * En CLUEDO son las pistas de cada sala y ronda, que viven en `plot.clues`.
   * Un juego que no genere pistas —El Misterio de la Momia hace `clues: []` a
   * propósito, porque lo suyo son tiras de papiro— se quedaba con la hoja de
   * etiquetas VACÍA: un documento en el paquete sin una sola etiqueta dentro,
   * cuando sus sobres son por vigilia y sí hay que rotularlos.
   *
   * Así que si no hay pistas se rotula por RONDA, que es lo único que la
   * plataforma sabe con certeza de cualquier juego: cuántas hay y en qué orden
   * se abren.
   */
  /*
   * SE PREGUNTA POR LOS SOBRES QUE HAN SALIDO, no por el tamaño del mapa.
   *
   * La condición era `porRonda.size > 0`, y `pistasPorRonda` presiembra una
   * entrada por ronda aunque no haya ni una pista, así que era verdadera
   * SIEMPRE y la rama de abajo no se ejecutaba nunca. En la Momia el bucle
   * daba cero vueltas útiles —`salasActivas` no encuentra nada sin `clues`— y
   * la hoja de etiquetas salía impresa sin una sola etiqueta de vigilia, que
   * es justo lo que este bloque dice que no puede pasar.
   *
   * Contar lo empujado cubre además el caso de que haya pistas pero ninguna
   * sala activa, que dejaba la hoja igual de vacía por otro camino.
   */
  const sobresAntes = sobres.length;
  const porRonda = pistasPorRonda(plot);
  for (const [ronda] of porRonda) {
    for (const sala of salasActivas(game, plot, ronda)) {
      sobres.push({
        codigo: `R${ronda}-${codigos.get(sala.id) ?? 'SALA'}`,
        contenido: `Pistas de ${sala.name} en la ronda ${ronda}`,
        grupo: 'Pistas',
        soloPreparador: aCiegas,
      });
    }
  }
  if (sobres.length === sobresAntes) {
    const manifiesto = manifiestoSiExiste(game.settings?.juego);
    const turno = manifiesto?.barra.find((p) => p.pantalla === 'ronda')?.rotulo ?? 'Ronda';
    for (let ronda = 1; ronda <= numeroDeRondas(plot); ronda += 1) {
      sobres.push({
        codigo: `${turno.toUpperCase()} ${ronda}`,
        contenido: `Lo que se reparte en ${turno.toLowerCase()} ${ronda}. No se abre antes.`,
        grupo: 'Pistas',
        soloPreparador: aCiegas,
      });
    }
  }

  if (aCiegas) {
    sobres.push({
      codigo: 'DESENLACE',
      contenido: 'La solución. No se abre hasta recoger todas las acusaciones',
      grupo: 'Dirección',
      soloPreparador: true,
    });
  }

  return sobres;
}

// ---------------------------------------------------------------------------
// Reglas del jugador
// ---------------------------------------------------------------------------

/**
 * Las reglas que recibe quien juega, en una sola lista.
 *
 * Viven aquí y sin marcas de HTML para que las consuman por igual el dosier
 * impreso y la app del móvil. Cuando cada sitio tenía su copia, bastaba con
 * corregir una para que el papel y la pantalla dijeran cosas distintas.
 *
 * No confundir con la lista corta del manual del Game Master: aquella es lo que
 * él lee en voz alta al empezar; ésta es la referencia completa del jugador.
 */
export type ReglaJugador = ReglaDeJuego;

export const REGLAS_JUGADOR: ReglaJugador[] = REGLAS_CLUEDO;

// ---------------------------------------------------------------------------
// Reparto
// ---------------------------------------------------------------------------

/**
 * Personajes que puede interpretar un Game Master que juega a ciegas.
 *
 * Tiene que ser alguien inocente y sin giro asignado: si le tocara el culpable
 * sabría la solución, y si le tocara un giro tendría que actuar una revelación
 * que no ha podido preparar mientras dirige. Quien prepara elige de esta lista.
 */
export function candidatosParaGm(game: GameSession, plot: Plot): Suspect[] {
  const conGiro = new Set((plot.material?.twists ?? []).map((giro) => giro.suspectId));
  return personasDe(game).filter(
    (sospechoso) =>
      sospechoso.id !== culpableDe(plot.solution) && !conGiro.has(sospechoso.id),
  );
}

// ---------------------------------------------------------------------------
// Cronología
// ---------------------------------------------------------------------------

/**
 * Los hechos que presenciaron todos. Es lo único que puede colgarse a la vista.
 *
 * Vive aquí y no en el renderizador de dosieres porque el cartel público y los
 * dosieres TIENEN que contar lo mismo: si divergen, los jugadores encuentran
 * una contradicción que no forma parte del misterio.
 */
export function cronologiaPublica(plot: Plot): TimelineEvent[] {
  return plot.timeline.filter((evento) => {
    // Regla principal: solo lo que presenciaron todos.
    if (evento.isPublic !== true) return false;
    // Cinturón y tirantes: aunque el modelo marcara como público un momento que
    // implica a una sola persona, eso no lo vio nadie más. Fuera.
    if (evento.suspectIds.length === 1) return false;
    return true;
  });
}

/**
 * El tramo sin testigos: lo que hay que reconstruir.
 *
 * Se calcula como el intervalo entre el último hecho público anterior a lo que
 * pasó a puerta cerrada y el primer hecho público posterior. Es el corazón del
 * cartel de cronología: el hueco es la pregunta que hace la partida.
 */
export function huecoPorReconstruir(plot: Plot): { desde: string; hasta: string } | null {
  const publicos = new Set(cronologiaPublica(plot));
  const privados = plot.timeline
    .map((evento, indice) => ({ evento, indice }))
    .filter(({ evento }) => !publicos.has(evento));
  if (privados.length === 0) return null;

  const primerPrivado = privados[0]!.indice;
  const ultimoPrivado = privados[privados.length - 1]!.indice;

  let desde: string | undefined;
  for (let i = primerPrivado - 1; i >= 0; i--) {
    const evento = plot.timeline[i];
    if (evento && publicos.has(evento)) {
      desde = evento.time;
      break;
    }
  }
  let hasta: string | undefined;
  for (let i = ultimoPrivado + 1; i < plot.timeline.length; i++) {
    const evento = plot.timeline[i];
    if (evento && publicos.has(evento)) {
      hasta = evento.time;
      break;
    }
  }

  if (!desde || !hasta) return null;
  return { desde, hasta };
}
