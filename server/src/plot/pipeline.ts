/**
 * La tuberia de generacion de trama. GENERICA.
 *
 * ═══ ESTE FICHERO SE LLAMABA `pipeline.ts` Y TENIA DENTRO DOS COSAS ═══
 *
 * El procedimiento comun —reservar la partida, pedirle la trama a quien sepa
 * escribirla, guardar, dibujar el plano, componer los dosieres— y, debajo, LA
 * IMPLEMENTACION DE CLUEDO: su prompt, su esquema, su generador de
 * demostracion. Doscientas lineas de un juego concreto en el camino por el que
 * pasan todos.
 *
 * Se ve en que quedaba: `momia-generacion.ts` y `sombras-generacion.ts` son
 * ficheros aparte, con su nombre y su carpeta. CLUEDO no tenia el suyo porque
 * estaba aqui, y por eso parecia que la tuberia «era» de CLUEDO con dos
 * excepciones colgando.
 *
 * Lo suyo se ha ido a `cluedo-generacion.ts`, que ahora es el hermano de los
 * otros dos. Aqui solo queda el procedimiento, y no nombra ningun juego.
 */
import type { GameSession, GenerateStreamEvent, Plot } from '../../../shared/types';
import { manifiestoDe } from '../../../shared/juegos';
import { generadorDeTrama } from '../juegos/generadores';
import { repararRespuestas } from '../juegos/solucion';
import { volcarGasto } from '../gasto/contador';
import { partidaParaElTaller } from '../live/proyeccion';
import { getStore } from '../db/store';
import { generateBoardLayout } from '../board/generator';
import { renderDocumentIndex } from '../docs/renderer';
import { tramaAlDia } from '../juegos/migracion';

/**
 * Como avisa un generador de por donde va.
 *
 * Se exporta porque lo necesitan los tres generadores —el de CLUEDO, el de la
 * Momia y el de las Sombras— y antes solo lo tenia el de CLUEDO por vivir en
 * este mismo fichero. Los otros dos lo redeclaraban por su cuenta.
 */
export type Emitir = (evento: GenerateStreamEvent) => void;

/** Ejecuta la generación completa sobre la partida dada. */
/**
 * Cuanto se espera antes de dar por muerta una generacion que dejo la partida en
 * `generating`. La mas larga medida —CLUEDO, dos llamadas— tarda siete minutos,
 * y la Momia puede pedir una segunda tirada; veinte deja margen de sobra sin que
 * una partida colgada por un proceso muerto quede bloqueada para siempre.
 */
const PLAZO_DE_GENERACION = 20 * 60 * 1000;

/**
 * ¿Esta partida se esta generando AHORA MISMO?
 *
 * Las tres rutas que gastan dinero de verdad —generar, actualizar y el material—
 * no miraban nada, y la unica defensa era un booleano en memoria del navegador:
 * se pierde al recargar y no existe en una segunda pestaña. Dos clics arrancaban
 * dos tuberias completas, pagaban dos veces al modelo y guardaban las dos.
 *
 * El sello es `updatedAt`, que `saveGame` escribe en cada guardado: al pasar a
 * `generating` queda con la hora de arranque. Sin plazo, un proceso que muera a
 * mitad dejaria la partida bloqueada para siempre, porque quien la libera es el
 * `catch` del propio proceso.
 */
export function generacionEnCurso(game: GameSession): boolean {
  if (game.status !== 'generating') return false;
  const desde = Date.parse(game.updatedAt);
  if (Number.isNaN(desde)) return false;
  return Date.now() - desde < PLAZO_DE_GENERACION;
}

export async function runGeneration(game: GameSession, emit: Emitir): Promise<void> {
  const store = getStore();
  try {
    // ---------- Etapa 1: tablero ----------
    emit({ type: 'stage', stage: 'board', label: 'Trazando el plano de la mansión…' });
    if (game.boardMode === 'generated') {
      // Determinista: regenerar siempre refleja los últimos cambios de salas.
      game.board = generateBoardLayout(game.rooms, manifiestoDe(game.settings?.juego).rotuloCentralDelPlano);
    }
    // En modo 'aerial' no se genera rejilla: manda la foto aérea con chinchetas.

    // ---------- Etapa 2: trama ----------
    /*
     * LA RAMA POR JUEGO. Se bifurca aquí y en ninguna otra parte: cada juego
     * trae su propio esquema, su propio prompt y su propia validación, y lo que
     * comparten es el resto de la tubería —tablero, reparación de la solución,
     * documentos, guardado y eventos—. La rama de CLUEDO queda EXACTAMENTE como
     * estaba; añadir un juego no puede cambiar lo que sale del otro.
     *
     * El segundo juego que anunciaba el comentario de abajo ya está aquí, y ha
     * traído consigo la frontera que se predijo: la Momia no reutiliza
     * `PLOT_SCHEMA` porque no tiene asesino, arma ni sala, y sobre todo porque
     * su puzle lo genera código y al modelo solo se le pide el sabor.
     */
    /*
     * SE LE PREGUNTA AL REGISTRO, no a un ternario encadenado por id de juego.
     *
     * Aquí había dos ternarios en fila —uno para el rótulo que se lee mientras
     * escribe y otro para el generador— con CLUEDO como rama por defecto EN
     * SILENCIO. Un juego nuevo que se olvidara de entrar en ellos no daba ningún
     * error: le generaban un asesinato, con culpable, arma y sala sobre sus
     * entidades, y con el modelo respondiendo a un esquema que empieza por «Eres
     * un novelista de misterio experto en CLUEDO». Y el sitio donde había que
     * acordarse de entrar no tiene nada que ver con el juego que se escribe:
     * está en la tubería común, entre el tablero y el guardado.
     *
     * De paso, este fichero deja de importar los tres juegos por su nombre.
     */
    const alta = generadorDeTrama(game.settings?.juego);
    emit({
      type: 'stage',
      stage: 'plot',
      label: alta?.rotulo ?? 'Tejiendo la trama del crimen…',
    });
    /*
     * FALLA CERRADO. Un juego sin generador dado de alta recibe un error que dice
     * exactamente lo que le falta, en vez de recibir el de CLUEDO. La diferencia
     * es entre enterarse ahora y enterarse la noche de la partida, con una velada
     * entera preparada sobre la trama equivocada.
     */
    if (!alta) {
      throw new Error(
        `El juego «${manifiestoDe(game.settings?.juego).id}» no tiene generador de trama dado de alta. ` +
          'Se declara con `registrarGenerador` y se carga desde `juegos/instalados.ts`.',
      );
    }
    const plot = await alta.generar(game, emit);
    // El esquema con el que se le pide la trama al modelo sigue hablando de
    // asesino, arma y sala, y se deja así a propósito: está afinado y
    // probado, y cambiarlo cambiaría las tramas que salen. La conversión a
    // ejes se hace aquí, en la frontera. (En la Momia no hace nada: su solución
    // ya nace con `respuestas`, y `tramaAlDia` no toca lo que ya está al día.)
    tramaAlDia(plot);
    /*
     * Y se reparan las respuestas que apunten a algo que ya no existe. Esto era
     * `corregirSolucion`, una funcion de una linea que vivia en la mitad de
     * CLUEDO de este fichero y envolvia a `repararRespuestas` sin añadir nada.
     * `repararRespuestas` recorre los ejes que declare el juego, sean los que
     * sean, asi que es generica de verdad y se llama directamente.
     */
    repararRespuestas(plot, game);
    game.plot = plot;

    // ---------- Etapa 3: documentos ----------
    emit({ type: 'stage', stage: 'documents', label: 'Imprimiendo los dosieres confidenciales…' });
    // Solo el índice: el HTML se genera al pedir cada dosier (ver renderer.ts).
    game.documents = renderDocumentIndex(game);

    game.status = 'ready';
    const guardada = await store.saveGame(game);
    // Con el Game Master jugando, este `done` bajaba la trama entera.
    emit({ type: 'done', game: partidaParaElTaller(guardada) });
    // Y se vuelca lo apuntado, ya con todo guardado: si se hiciera antes, el
    // guardado de aqui arriba se lo llevaria por delante.
    await volcarGasto(game.id);
  } catch (error) {
    console.error('[pipeline] fallo en la generación:', error);
    /*
     * SE RELEE ANTES DE TOCAR NADA, y no es un detalle.
     *
     * Esto hacia `game.status = 'draft'; saveGame(game)` con el objeto leido al
     * principio, o sea que guardaba su instantanea VIEJA encima de lo que
     * hubiera. Si entretanto otra peticion habia terminado de generar bien, un
     * fallo tardio de esta borraba la trama buena y devolvia la partida a
     * borrador. Ahora solo se corrige el estado, y solo si sigue en
     * `generating`: si ya la libero alguien, no hay nada que hacer.
     */
    try {
      const almacenada = await store.getGame(game.id);
      if (almacenada && almacenada.status === 'generating') {
        almacenada.status = almacenada.plot ? 'ready' : 'draft';
        await store.saveGame(almacenada);
      }
    } catch {
      // Si tampoco se puede guardar, el error original ya es suficiente.
    }
    emit({
      type: 'error',
      message:
        error instanceof Error && error.message
          ? error.message
          : 'Error desconocido durante la generación de la trama',
    });
  }
}
