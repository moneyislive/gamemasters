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
 *
 * ═══ EL SEGUNDO TEMA: EL BURGO, CON EL MISMO EMBARCADERO ═══
 *
 * El Burgo (`shared/arcade/juegos/burgo.ts`) es el segundo arcade con muelle, y
 * en su primera fase ES el mismo embarcadero —la cala, los barcos, el mar de hora
 * azul— con otra voz y otros colores: este fichero parametriza SÓLO tres frases y
 * la paleta, no el paisaje (`Embarcadero.tsx` monta la cala y `embarcadero.glb` en
 * seco). La plaza del Burgo, si llega, será una escena hermana que cumpla el mismo
 * contrato, y entonces este tema dirá cuál de las dos se monta. Su paleta
 * (`COLORES_DEL_BURGO`) es propia y distinta de la de Riberas a propósito: los
 * barrios del Burgo se llaman por su color, y tres de los seis colonos de Riberas
 * se confundirían con su acera. `verify:embarcadero` contrasta también ésta.
 */

export interface TemaDelMuelle {
  /** El identificador del arcade al que sirve. */
  readonly arcade: string;
  /**
   * CUÁL DE LAS DOS ESCENAS HERMANAS SE MONTA. Las dos cumplen el mismo contrato
   * (`PropsDelEmbarcadero`), así que quien pinta el muelle elige por este campo y no por el
   * nombre del arcade: un `if (arcade === 'burgo')` en los dos clientes sería la misma
   * decisión escrita dos veces y en el sitio donde no se ve.
   */
  readonly escena: 'embarcadero' | 'plaza' | 'linde';
  /** Cómo se llama el lugar. Sale en el HUD encima del código. */
  readonly lugar: string;
  /**
   * EL MISMO LUGAR, PERO EN LA FRASE: «Quién eres ___», «lo que ven los demás ___».
   *
   * Es un campo aparte y no `lugar` en minúscula porque las tres frases no encajan en el
   * hueco: `lugar` dice «A la entrada del Burgo», que no se puede meter detrás de un «en».
   * Y hace falta porque el vestíbulo es UNO para los tres juegos: tenía escrito «en el
   * muelle» a pelo, así que El Burgo y Las Lindes mandaban al jugador a un sitio que no
   * existe en su partida. Empieza siempre por «en », y eso lo vigila `verify:escritorio`.
   */
  readonly donde: string;
  /** La frase que se lee mientras se espera. Voz de la casa. */
  readonly espera: string;
  /** La frase de la llamada a zarpar, cuando el juego ofrece empezar. */
  readonly zarpar: string;
  /** Un color por asiento, en orden de llegada. `#rrggbb`. */
  readonly colonos: readonly string[];
}

const RIBERAS: TemaDelMuelle = {
  arcade: 'riberas',
  escena: 'embarcadero',
  lugar: 'El embarcadero',
  /* Riberas es de donde salía la frase, así que aquí no cambia nada de lo que se ve hoy. */
  donde: 'en el muelle',
  espera: 'Los barcos zarpan cuando estéis todos.',
  zarpar: 'Se reparte el delta',
  /* El mismo orden que `COLORES_DE_COLONO` en riberas.ts: rojo, azul, oro, verde, malva, naranja. */
  colonos: ['#e0533d', '#3d8be0', '#e0b83d', '#4fbf7a', '#b06fd6', '#e08a3d'],
};

const BURGO: TemaDelMuelle = {
  arcade: 'burgo',
  escena: 'plaza',
  lugar: 'A la entrada del Burgo',
  donde: 'en la plaza del Burgo',
  espera: 'La ciudad abre cuando estéis todos.',
  zarpar: 'Se abre el Burgo',
  /* El mismo orden que `COLORES_DEL_BURGO` en burgo.ts: marfil, azabache, violeta, turquesa, coral, lima. */
  colonos: ['#f2e8cf', '#26262e', '#7d3fd6', '#2fe0d0', '#ff8f6b', '#c5e84a'],
};

/**
 * LA LINDE ALTA: el altozano sobre el valle vacío desde el que se abre Las Lindes.
 *
 * El tercer lobby, y el primero que no es un sitio de llegada sino un MIRADOR: lo
 * que se ve desde aquí es el valle donde va a crecer el tablero. Por eso la frase de
 * espera habla del valle y no de la gente.
 */
const LINDES: TemaDelMuelle = {
  arcade: 'lindes',
  escena: 'linde',
  lugar: 'La Linde Alta',
  donde: 'en la Linde Alta',
  espera: 'El valle está vacío. Se vuelca la bolsa cuando estéis todos.',
  zarpar: 'Se vuelca la bolsa',
  /* El mismo orden que `COLORES_DE_LAS_LINDES` en lindes.ts: carmín, índigo, ocre, musgo, hueso. */
  colonos: ['#c8303a', '#2f5fd0', '#e0a32e', '#3f9a56', '#ece3cf'],
};

const TEMAS: Readonly<Record<string, TemaDelMuelle>> = {
  [RIBERAS.arcade]: RIBERAS,
  [BURGO.arcade]: BURGO,
  [LINDES.arcade]: LINDES,
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
