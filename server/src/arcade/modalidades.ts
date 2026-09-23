/**
 * QUÉ JUEGOS SE PUEDEN JUGAR BAJANDO AL TABLERO. La costura, que nace vacía a propósito.
 *
 * ═══ POR QUÉ ESTE FICHERO EXISTE, Y POR QUÉ NACE SIN ADMITIR A NADIE ═══
 *
 * La modalidad `botas` —Boots on Board, `docs/BOOTS-ON-BOARD.md`— se elige al abrir la mesa y
 * no cambia (decisión de Miguel del 20-sep-2026). Pero no todos los juegos se pueden recorrer:
 * para bajar al tablero hace falta que el juego DECLARE su mundo —el `MundoDeclarado` del §3:
 * suelo, cuerpos, dónde se nace—, y eso lo dice el registro de mundos,
 * `shared/arcade/juegos/mundos.ts`: un juego se recorre si y sólo si alguien escribió su productor.
 *
 * Mientras nadie lo dé de alta, la respuesta honrada a «¿admite botas este juego?» es NO, y eso es
 * exactamente lo que da el registro vacío: una mesa `botas` pedida para un juego sin mundo se
 * contesta con un 400 que dice por qué, en vez de abrirse y dejar a cuatro personas delante de un
 * tablero que no se puede pisar. Un «sí» por defecto sería el fallo mudo de siempre: la mesa se
 * abre, se guarda treinta días, y nadie se entera de que su modalidad no significa nada.
 *
 * ═══ POR QUÉ VIVE FUERA DEL NÚCLEO SELLADO ═══
 *
 * `mesas.ts` está sellado por `verify:nucleo-quieto`, que además le prohíbe nombrar un juego o
 * importar de `shared/arcade/juegos/`. Saber QUÉ juegos admiten la modalidad es saber de juegos,
 * así que no puede vivir allí: la mesa sólo pregunta por el identificador que ya tiene, y la
 * respuesta se decide aquí.
 *
 * ═══ Y DE DÓNDE LLEGAN LAS ALTAS DE VERDAD ═══
 *
 * No de este fichero, que no puede saber qué juegos tienen mundo sin importar juegos —y lo importa
 * `mesas.ts`, que está sellado y no puede nombrar ninguno—. Las da el ARRANQUE: `index.ts` llama a
 * `darDeAltaLosQueSeRecorren` (`botas/index.ts`) antes de escuchar, que llama a `admitirBotas` con
 * cada arcade instalado para el que `sePuedeRecorrer` es verdad. Lo comprueba `verify:modalidad`
 * contra el servidor de verdad: cada juego de servidor abre `botas` si y sólo si tiene mundo.
 *
 * Y las pruebas siguen usando `admitirBotas` para dar de alta un juego a mano: un envoltorio que
 * la llama ANTES de importar el servidor, igual que `verify:mesa` instala un arcade roto sin tocar
 * el arranque. No hay variable de entorno para esto, a propósito: una costura de prueba que se
 * puede encender desde el panel de un despliegue es una puerta.
 *
 * ═══ ANCLADA AL ÁMBITO GLOBAL, COMO LAS OTRAS TABLAS DE ALTAS ═══
 *
 * Por lo mismo que `INSTALADOS` en `shared/arcade/index.ts`: un módulo se puede cargar dos veces
 * —una ruta lo importa por un camino y un envoltorio de prueba por otro—, y con dos copias hay
 * dos tablas y las altas se pierden en silencio: la mesa contestaría «no» a un juego dado de
 * alta, y el comprobador que lo diera de alta vería un 400 sin entender por qué.
 */
import type { ArcadeId } from '../../../shared/arcade';

const LLAVE = Symbol.for('gamemasters.arcade.botas');
const global_ = globalThis as unknown as Record<symbol, Set<ArcadeId> | undefined>;
const ADMITEN_BOTAS: Set<ArcadeId> = global_[LLAVE] ?? (global_[LLAVE] = new Set<ArcadeId>());

/**
 * ¿SE PUEDE ABRIR UNA MESA DE ESTE JUEGO EN MODALIDAD `botas`?
 *
 * La pregunta que hacen la ruta —para contestar un 400 temprano y con su motivo— y `abrir` en
 * `mesas.ts` —para que ninguna otra puerta la salte—. Las dos preguntan AQUÍ, y por eso las dos
 * contestan lo mismo.
 */
export function admiteBotas(arcade: ArcadeId): boolean {
  return ADMITEN_BOTAS.has(arcade);
}

/**
 * DA DE ALTA UN JUEGO COMO RECORRIBLE. Lo llaman el arranque —con los que tienen mundo— y las
 * pruebas; ver la cabecera.
 *
 * No comprueba que el juego esté instalado ni que tenga mesa de servidor, y no hace falta: una
 * mesa de un arcade que no está instalado no se abre (`ArcadeNoInstalado`) y una de un arcade
 * de aparato tampoco (`ArcadeSinMesa`), las dos ANTES de preguntar por la modalidad. Lo que sí
 * se rechaza es un identificador que no es un identificador, porque una cadena vacía en esta
 * tabla es un alta que no significa nada y que nadie sabría leer.
 */
export function admitirBotas(arcade: ArcadeId): void {
  if (typeof arcade !== 'string' || arcade.trim().length === 0) {
    throw new Error(
      `«${String(arcade)}» no es el identificador de un arcade: para admitir la modalidad «botas» ` +
        'hace falta el mismo identificador con el que el juego se da de alta.',
    );
  }
  ADMITEN_BOTAS.add(arcade);
}

/** Lo quita. Para las pruebas, que no pueden dejar altas puestas al terminar. */
export function dejarDeAdmitirBotas(arcade: ArcadeId): void {
  ADMITEN_BOTAS.delete(arcade);
}

/** Cuáles la admiten, ordenados. Para quien quiera mirar la tabla sin tocarla. */
export function arcadesQueAdmitenBotas(): ArcadeId[] {
  return [...ADMITEN_BOTAS].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
