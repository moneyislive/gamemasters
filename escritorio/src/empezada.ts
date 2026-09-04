/**
 * ¿SE REÚNE LA MESA O YA SE JUEGA? Contestado sin abrir la vista del juego.
 *
 * ═══ POR QUÉ HACE FALTA UNA FUNCIÓN PARA UNA PREGUNTA DE UN CAMPO ═══
 *
 * El campo `empezada` de la vista de la mesa lo estrenó el servidor para el
 * Muelle (`docs/EL-MUELLE.md`, §1.3), y este empaquetado puede estar hablando
 * con un servidor anterior a ese día, que manda la vista SIN él. Leer
 * `mesa.empezada` a pelo daría `undefined`, que en un `if` es «no ha empezado»,
 * y el Muelle se quedaría montado encima de una partida en marcha sin que
 * nadie viera nunca el tablero. Ese es el fallo que esto evita: la pregunta
 * tiene dos fuentes, y la segunda es la que vale cuando la primera falta.
 *
 * ═══ LA INFERENCIA, Y POR QUÉ SE INCLINA HACIA «SÍ HA EMPEZADO» ═══
 *
 * Sin el campo, lo único que un mueble genérico puede mirar son las `opciones`
 * que el juego ofrece a este asiento: mientras la mesa se reúne, Riberas ofrece
 * exactamente una, con `id: 'empezar'` y `tipo: 'riberas:empezar'`
 * (`opcionesDeReunion` en `shared/arcade/juegos/riberas.ts`). Si esa opción
 * está, no ha empezado. Si no está —ni la lista siquiera, que también es
 * opcional— se contesta que SÍ: equivocarse hacia «empezada» pinta el tablero
 * de siempre, que es donde se estaba antes de que existiera el Muelle;
 * equivocarse hacia «reuniéndose» esconde la partida.
 *
 * ═══ SIN IMPORTS, A PROPÓSITO ═══
 *
 * Es aritmética sobre dos campos y la llama el comprobador de Node con objetos
 * fabricados. Recibe la FORMA que necesita y no `MesaVista`, para que nadie
 * tenga que arrastrar `mesa.ts` para preguntar esto.
 */

/** Lo poco de una mesa que hace falta para contestar. */
export interface MesaQuePuedeHaberEmpezado {
  readonly empezada?: boolean;
  readonly opciones?: ReadonlyArray<{ readonly id?: string; readonly tipo?: string }>;
}

/** ¿Es ésta la opción con la que el juego ofrece empezar? */
export function esLaOpcionDeEmpezar(opcion: { readonly id?: string; readonly tipo?: string }): boolean {
  if (opcion.id === 'empezar' || opcion.tipo === 'empezar') return true;
  return typeof opcion.tipo === 'string' && opcion.tipo.endsWith(':empezar');
}

/**
 * La opción de empezar que el juego ofrece ahora mismo, o `null`.
 *
 * Se busca por la forma y no por la posición: hoy es la única de la lista y
 * mañana puede venir acompañada. Devolver LA opción y no un booleano es lo que
 * permite al HUD pintar su rótulo y su ayuda tal cual los escribió el juego.
 */
export function opcionDeEmpezar<O extends { readonly id?: string; readonly tipo?: string }>(
  opciones: ReadonlyArray<O> | undefined,
): O | null {
  if (opciones === undefined) return null;
  for (const o of opciones) if (esLaOpcionDeEmpezar(o)) return o;
  return null;
}

/** Sin mesa no hay partida que haya podido empezar. */
export function haEmpezado(mesa: MesaQuePuedeHaberEmpezado | null | undefined): boolean {
  if (mesa === null || mesa === undefined) return false;
  if (typeof mesa.empezada === 'boolean') return mesa.empezada;
  return opcionDeEmpezar(mesa.opciones) === null;
}
