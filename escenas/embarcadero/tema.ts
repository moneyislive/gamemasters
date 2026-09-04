/**
 * EL TEMA DEL MUELLE: qué arcades tienen lobby en tres dimensiones y con qué voz.
 *
 * ═══ POR QUÉ UNA TABLA POR ARCADE Y NO UN CAMPO DEL MANIFIESTO ═══
 *
 * El manifiesto de arcade (`shared/arcade/tipos.ts`) tiene once campos y está
 * sellado, y un lobby no es una regla del juego: es una pantalla de la
 * plataforma que existe ANTES de que el juego empiece. Así que quién tiene
 * muelle lo deciden los clientes que lo pintan —los dos compilan `escenas/`— y
 * no el manifiesto. Un arcade que no está aquí sigue teniendo su vestíbulo de
 * siempre, con sus campos y sus botones.
 *
 * ═══ LA PALETA DE COLONOS ES LA DEL JUEGO, COPIADA Y NO IMPORTADA ═══
 *
 * Riberas pinta a cada colono con un color por orden de asiento en su tablero
 * declarado (`COLORES_DE_COLONO` en `shared/arcade/juegos/riberas.ts`, que no
 * se exporta). El muelle tiñe el barco, la bandera y el amarre de cada asiento con
 * ESA misma paleta y en ESE mismo orden, para que quien llegue al tablero SVG se
 * reconozca por el color. Son seis y no los cuatro del pack porque en Riberas
 * caben seis; por eso las piezas se tiñen al cargar y no se compilan por color
 * (ver `piezas.ts`).
 *
 * Se copia y no se importa porque `escenas/` no puede depender de las tripas de
 * un juego —el juego cambia a su ritmo— y porque un lobby de otro arcade traerá
 * su paleta. `verify:embarcadero` contrasta esta copia contra el fichero de
 * Riberas para que no se separen sin que nadie lo vea.
 */

export interface TemaDelMuelle {
  /** El identificador del arcade al que sirve. */
  readonly arcade: string;
  /** Cómo se llama el lugar. Sale en el HUD encima del código. */
  readonly lugar: string;
  /** La frase que se lee mientras se espera. Voz de la casa. */
  readonly espera: string;
  /** La frase de la llamada a zarpar, cuando el juego ofrece empezar. */
  readonly zarpar: string;
  /** Un color por asiento, en orden de llegada. `#rrggbb`. */
  readonly colonos: readonly string[];
}

const RIBERAS: TemaDelMuelle = {
  arcade: 'riberas',
  lugar: 'El embarcadero',
  espera: 'Los barcos zarpan cuando estéis todos.',
  zarpar: 'Se reparte el delta',
  /* El mismo orden que `COLORES_DE_COLONO` en riberas.ts: rojo, azul, oro, verde, malva, naranja. */
  colonos: ['#e0533d', '#3d8be0', '#e0b83d', '#4fbf7a', '#b06fd6', '#e08a3d'],
};

const TEMAS: Readonly<Record<string, TemaDelMuelle>> = {
  [RIBERAS.arcade]: RIBERAS,
};

/** ¿Tiene este arcade un muelle en tres dimensiones antes de la partida? */
export function tieneMuelle(arcade: string): boolean {
  return TEMAS[arcade] !== undefined;
}

export function temaDelMuelle(arcade: string): TemaDelMuelle | undefined {
  return TEMAS[arcade];
}

/** El color del asiento que ocupa la posición `i` en la lista de sentados. */
export function colorDeAsiento(tema: TemaDelMuelle, i: number): string {
  const n = tema.colonos.length;
  return tema.colonos[((i % n) + n) % n] as string;
}
