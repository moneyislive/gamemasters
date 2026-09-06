/**
 * DE DÓNDE SE TRAEN LOS MODELOS: una constante, sin tablas detrás.
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
 * ruta, así que importarla no cuesta nada a nadie.
 */
export const RUTA_DE_MODELOS = '/api/arcade/modelos';

/** El tablero de Riberas, con la textura empotrada mientras no se hornee. */
export function rutaDelTablero(): string {
  return `${RUTA_DE_MODELOS}/tablero.glb`;
}

/**
 * LOS DADOS DE LA MESA: el D6 de KayKit horneado, en su fichero de unos kB.
 *
 * Fichero aparte del tablero a propósito (ver `MODELO.dado` en `nombres.ts`), y las dos
 * pantallas lo piden A LA VEZ que el tablero pero con su propia red: si éste no llega, el
 * tablero se pinta igual y los dados salen del respaldo procedimental.
 */
export function rutaDeLosDados(): string {
  return `${RUTA_DE_MODELOS}/dados.glb`;
}
