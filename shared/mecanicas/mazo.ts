/**
 * EL MAZO: una lista de series que se roba por arriba y se devuelve por abajo.
 *
 * ═══ POR QUÉ ESTO SUBE A `mecanicas/`, Y POR QUÉ SIN AZAR DENTRO ═══
 *
 * `frente.ts` lo dejó escrito hace tiempo: «`shared/mecanicas/mazo.ts` —barajas
 * versionadas— llega con la SEGUNDA baraja». La segunda baraja es el Burgo, que
 * lleva dos: el Pregón y el Arca del Concejo.
 *
 * Lo que aquí hay NO baraja. Barajar ya está en `azar.ts` (`barajar(azar, items)`)
 * y `azar.ts` está sellado; y la doctrina de esta casa, medida en Riberas, es que
 * un mazo SE BARAJA UNA VEZ al empezar con la semilla de la mesa y después sólo se
 * rota: robar es coger la primera serie y ponerla al fondo. Así el mazo se puede
 * contar («quedan tres cartas antes de que vuelva a salir el Indulto»), y sobre
 * todo así una repetición del diario da el mismo mazo con cualquier número de
 * plazos vencidos, porque robar no gasta azar. El reglamento del Burgo (§4) dice
 * exactamente eso: «se pone al fondo del mazo».
 *
 * ═══ LAS SERIES SON SECRETO, Y ESTO NO LAS MIRA ═══
 *
 * Una serie es una cadena opaca (`'p07'`, `'a12'`): este fichero no sabe qué carta
 * es ni qué hace, y así tiene que ser. Lo que el mazo devuelve va a `loSecreto`
 * entero; el juego publica el NÚMERO de la carta que salió, nunca la serie, y eso
 * es cosa del juego y de su tabla. Aquí sólo se garantiza que ninguna serie se
 * pierde ni se duplica al robar, sacar o devolver.
 *
 * ═══ Y EL «NO-OP» ES EL MISMO OBJETO ═══
 *
 * Robar de un mazo vacío, sacar lo que no está o devolver lo que ya está devuelven
 * LA MISMA lista por identidad. Es la regla de toda esta casa: la mesa compara por
 * `!==` y una copia sin cambios cuenta como movimiento.
 */

/** Un mazo: las series que quedan, la de arriba la primera. */
export type Mazo = readonly string[];

/** Lo que devuelve `robar`: la serie que salió (`''` si el mazo estaba vacío) y el mazo después. */
export interface Robo {
  readonly serie: string;
  readonly mazo: Mazo;
}

/** ¿Está esta serie en el mazo? */
export function contiene(mazo: Mazo, serie: string): boolean {
  return mazo.indexOf(serie) >= 0;
}

/** La serie de arriba sin robarla; `''` si no hay. */
export function cima(mazo: Mazo): string {
  return mazo.length > 0 ? (mazo[0] as string) : '';
}

/**
 * Roba la primera serie y la pone al FONDO: el mazo rota, no mengua. Es lo que se
 * hace con toda carta que no se guarda. Un mazo vacío devuelve `''` y el mismo mazo.
 */
export function robar(mazo: Mazo): Robo {
  if (mazo.length === 0) return { serie: '', mazo };
  const serie = mazo[0] as string;
  const resto: string[] = [];
  for (let i = 1; i < mazo.length; i++) resto.push(mazo[i] as string);
  resto.push(serie);
  return { serie, mazo: resto };
}

/**
 * Saca una serie del mazo, esté donde esté: es lo que pasa con el Indulto, que se
 * guarda en mano hasta usarlo. Si no está, el mismo mazo.
 */
export function sacar(mazo: Mazo, serie: string): Mazo {
  const donde = mazo.indexOf(serie);
  if (donde < 0) return mazo;
  const salida: string[] = [];
  for (let i = 0; i < mazo.length; i++) if (i !== donde) salida.push(mazo[i] as string);
  return salida;
}

/**
 * Devuelve una serie al FONDO del mazo: el Indulto usado o el del quebrado. Si ya
 * está en el mazo, el mismo mazo: una serie existe una vez.
 */
export function devolverAlFondo(mazo: Mazo, serie: string): Mazo {
  if (serie === '' || contiene(mazo, serie)) return mazo;
  const salida: string[] = [];
  for (const s of mazo) salida.push(s);
  salida.push(serie);
  return salida;
}
