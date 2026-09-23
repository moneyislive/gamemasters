/**
 * DE DÓNDE SE TRAEN LOS MODELOS: una constante y la lista de los ficheros de nombre fijo.
 *
 * Rutas RELATIVAS a la raíz del servidor de juego, sin dominio: la app las pega a
 * su `servidorActual()` y el escritorio las pide tal cual, que en desarrollo pasa
 * por el proxy de Vite y en producción es el mismo Node. Las sirve
 * `server/src/routes/modelos.ts`, delante del guardián.
 *
 * ═══ POR QUÉ NO VIVE EN `embarcadero/figuras.ts` ═══
 *
 * Vivía allí, y la pantalla del tablero de la app la importaba de allí: con eso el
 * trozo del tablero arrastraba la tabla entera de aventureros sin usarla, y el
 * escritorio, para no arrastrarla, escribía la ruta a mano. Dos copias de una
 * cadena son la forma más tonta de que un día el servidor la cambie y una de las
 * dos se quede pidiendo a una puerta que ya no existe. Aquí no hay nada más que la
 * ruta y una lista de nombres —ni un `import`—, así que importarla no cuesta nada a
 * nadie: ni a una pantalla, ni al servidor.
 *
 * ═══ Y LA LISTA DE NOMBRE FIJO ES LA MISMA QUE SIRVE EL SERVIDOR ═══
 *
 * Un `.glb` nuevo eran DOS altas en dos paquetes: su función aquí y su manejador en
 * `server/src/routes/modelos.ts` —cinco manejadores idénticos de siete líneas, uno por
 * fichero—. Si se hacía una sola, el cliente pedía a una puerta que no existía y el
 * servidor contestaba 404 sin que nada lo relacionara con el alta a medias. Ahora el
 * servidor recorre `MODELOS_DE_NOMBRE_FIJO` y registra una ruta LITERAL por fila con
 * un solo manejador, y las funciones de aquí abajo sólo aceptan un nombre de la
 * lista: una fila es el alta entera, y la puerta que pide el cliente es, por
 * construcción, una de las que abre el servidor. `verify:mesa` pide cada fila por el
 * cable, con estas mismas funciones.
 *
 * Cada nombre tiene la forma de un nombre de modelo —minúsculas, dígitos y guiones,
 * acabado en `.glb`—, la misma que se le exige a un aventurero. No es estética: el
 * servidor escribe cada fila como ruta de Express, donde un `:` o un `*` dejarían de
 * ser letras. La fila que no la cumpla no se sirve, se dice por consola al arrancar,
 * y `verify:mesa` se pone rojo porque esa fila no contesta.
 *
 * Los AVENTUREROS no están en la lista, a propósito: se sirven por forma y no por
 * nombre (`/aventureros/:fichero`), porque el núcleo no nombra ningún aspecto y el
 * servidor tampoco. Sus rutas están en `embarcadero/figuras.ts`, junto a la tabla que
 * sabe qué es un caballero.
 */
export const RUTA_DE_MODELOS = '/api/arcade/modelos';

/**
 * LOS FICHEROS DE NOMBRE FIJO, uno por fila, cada uno en `escenas/modelos/`.
 *
 * Son ficheros aparte, y no un paquete único, por la misma razón los cinco: que abrir un
 * arcade no obligue a bajar el arte de otro, y que si uno no llega caiga él solo a su
 * respaldo sin arrastrar a nadie. Y rutas fijas, no un comodín sobre la carpeta: lo que se
 * puede pedir por HTTP es exactamente lo que se ha decidido servir, fichero a fichero.
 */
export const MODELOS_DE_NOMBRE_FIJO = [
  /* El tablero de Riberas, con la textura empotrada mientras no se hornee; lo usan también las Lindes. `compilar-modelos.ts`. */
  'tablero.glb',
  /* Las piezas del muelle con el color horneado: qué hay dentro y por qué no es el tablero, en `embarcadero/piezas.ts`. `compilar-embarcadero.ts`. */
  'embarcadero.glb',
  /* El D6 de KayKit horneado, unos kB: un dado no obliga a recargar cuatro megas de tablero. `compilar-dados.ts`. */
  'dados.glb',
  /* Las piezas del Burgo: siete packs de KayKit, horneadas y a escala del mundo (`burgo/piezas.ts`). `compilar-burgo.ts`. */
  'burgo.glb',
  /*
   * El reloj de arena de la barra, con su clip. El ÚNICO que no es de dominio público: lleva
   * CC-BY-4.0 y obliga a acreditar a su autor, cosa que hace `/creditos` (y vigila
   * `verify:legal`). `compilar-reloj.ts`.
   */
  'reloj.glb',
] as const;

/** Un nombre de la lista. Las funciones de aquí no aceptan otro. */
export type ModeloDeNombreFijo = (typeof MODELOS_DE_NOMBRE_FIJO)[number];

/** La ruta de un fichero de la lista. Es la que registra el servidor, letra por letra. */
export function rutaDelModelo(fichero: ModeloDeNombreFijo): string {
  return `${RUTA_DE_MODELOS}/${fichero}`;
}

/** El tablero de Riberas, con la textura empotrada mientras no se hornee. */
export function rutaDelTablero(): string {
  return rutaDelModelo('tablero.glb');
}

/**
 * LOS DADOS DE LA MESA: el D6 de KayKit horneado, en su fichero de unos kB.
 *
 * Fichero aparte del tablero a propósito (ver `MODELO.dado` en `nombres.ts`), y las dos
 * pantallas lo piden A LA VEZ que el tablero pero con su propia red: si éste no llega, el
 * tablero se pinta igual y los dados salen del respaldo procedimental.
 */
export function rutaDeLosDados(): string {
  return rutaDelModelo('dados.glb');
}

/**
 * EL RELOJ DE ARENA DE LA BARRA: 717 kB con su clip de animación dentro.
 *
 * Fichero aparte por lo mismo que los dados —que no obligue a recargar el tablero y que su fallo
 * no lo tumbe— y con una razón más suya: es el único modelo de esta casa que NO es de dominio
 * público. Lleva CC-BY-4.0 y obliga a acreditar a su autor, cosa que hace la página `/creditos`.
 */
export function rutaDelReloj(): string {
  return rutaDelModelo('reloj.glb');
}

/**
 * LAS PIEZAS DEL BURGO: siete packs de KayKit en un solo fichero, con el color horneado y
 * ya a escala del mundo (ver `escenas/burgo/piezas.ts`).
 *
 * Fichero aparte del embarcadero y del tablero por lo de siempre: que abrir un arcade no
 * obligue a bajar el arte de otro, y que si este fichero no llega el Burgo caiga a su
 * retablo SVG sin arrastrar a nadie. Las dos pantallas lo piden con su propia red.
 */
export function rutaDelBurgo(): string {
  return rutaDelModelo('burgo.glb');
}
