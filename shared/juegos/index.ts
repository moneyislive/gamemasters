/**
 * Los juegos instalados.
 *
 * CATA. Un registro por nombre, que es lo mínimo que hace falta para que
 * «¿de qué juego es esta partida?» tenga respuesta.
 */
import { CLUEDO } from './cluedo';
import { MOMIA } from './momia';
import type { JuegoId, ManifiestoDeJuego } from './tipos';

/**
 * Reexportado uno a uno, no con `export *`.
 *
 * Con la estrella, tsx dejaba fuera las ocho funciones de `tipos.ts` en tiempo
 * de EJECUCIÓN mientras el compilador las daba por buenas: los tres paquetes
 * compilaban y el servidor reventaba al arrancar con «does not provide an
 * export named 'aciertos'». Un contrato que se importa desde tres sitios no
 * puede depender de esa sutileza.
 */
export {
  aciertos,
  categoria,
  categoriaDeJugadores,
  categoriasDeLugar,
  eje,
  ejes,
  ejeDeJugadores,
  esElSenalado,
  respuestaCompleta,
} from './tipos';
export type {
  CategoriaId,
  DefinicionAccion,
  DefinicionCategoria,
  DefinicionDeRonda,
  DefinicionEje,
  AsistenteDeJuego,
  EjeId,
  IconoId,
  PantallaDeApp,
  PestanaDeBarra,
  JuegoId,
  ManifiestoDeJuego,
  ModoDeTurno,
} from './tipos';
export { CLUEDO };
export { MOMIA };
export {
  cumple,
  permutaciones,
  solucionesDe,
  RITOS_DEL_SELLADO,
  MARCAS_PARA_TOCADO,
  AMULETOS_INICIALES,
} from './momia-tipos';
export type {
  DonId,
  EstadoDePersona,
  EstadoMomia,
  Fragmento,
  Restriccion,
  RitoId,
} from './momia-tipos';
export { entidadesDe, entidadDe, nombreDeEntidad, entidadesDelEje } from './entidades';
export type { Entidad } from './entidades';

/** Con qué se juega si una partida no dice de qué juego es. */
export const JUEGO_POR_DEFECTO: JuegoId = 'cluedo';

/**
 * El registro, anclado al ámbito global.
 *
 * Podría ser una simple constante de módulo, y lo era. Lo cambió la prueba del
 * segundo juego: registraba «El Legado» y `computeStaleness` seguía viendo solo
 * CLUEDO. La causa es que este fichero se puede cargar DOS VECES —una prueba lo
 * importa como `../../shared/juegos` y `staleness.ts` como `./juegos`, y el
 * cargador las trata como módulos distintos—, con lo que cada copia tenía su
 * propio registro y las altas se perdían por el camino.
 *
 * Con el ámbito global hay uno solo, cargue quien lo cargue y por donde lo
 * cargue. Es la misma cautela que toman las librerías que no admiten dos
 * instancias, y aquí no es teórica: el fallo estaba ocurriendo.
 */
const LLAVE = Symbol.for('gamemasters.juegos.instalados');
const global_ = globalThis as unknown as Record<symbol, Record<JuegoId, ManifiestoDeJuego>>;

const INSTALADOS: Record<JuegoId, ManifiestoDeJuego> =
  global_[LLAVE] ?? (global_[LLAVE] = { [CLUEDO.id]: CLUEDO });
INSTALADOS[CLUEDO.id] = CLUEDO;
INSTALADOS[MOMIA.id] = MOMIA;

/**
 * Da de alta un juego.
 *
 * Esta función ES la respuesta a «¿podemos meter otro juego?». Un juego nuevo
 * escribe su manifiesto, lo registra aquí, y el motor —fases, proyección,
 * acusación, ganador, desenlace— funciona sin tocar una línea. Lo comprueba
 * `npm run verify:segundo-juego`, que registra uno de dos ejes y juega con él
 * una velada entera.
 */
export function registrarJuego(manifiesto: ManifiestoDeJuego): void {
  INSTALADOS[manifiesto.id] = manifiesto;
}

/** Todos los juegos instalados, para el catálogo del taller. */
export function juegosInstalados(): ManifiestoDeJuego[] {
  return Object.values(INSTALADOS);
}

/**
 * El manifiesto de un juego.
 *
 * Nunca devuelve undefined: una partida sin juego declarado —todas las que ya
 * existen— es CLUEDO. Sin esto, añadir el campo obligaría a migrar la base de
 * datos, y el objetivo era justamente no tener que hacerlo.
 */
export function manifiestoDe(id: JuegoId | undefined): ManifiestoDeJuego {
  return INSTALADOS[id ?? JUEGO_POR_DEFECTO] ?? CLUEDO;
}
