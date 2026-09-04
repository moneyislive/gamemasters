/**
 * ¿YA SE JUEGA EN ESTA MESA, O TODAVÍA SE ESTÁ REUNIENDO? Contestado sin abrir
 * la vista del juego.
 *
 * ═══ POR QUÉ HACE FALTA UNA FUNCIÓN PARA LEER UN BOOLEANO ═══
 *
 * Porque el booleano puede no venir. `VistaDeMesa.empezada` lo pone el servidor
 * desde que existe el Muelle (`server/src/arcade/mesas.ts`), y una app publicada
 * puede estar hablando con un servidor anterior a ese campo. Un campo que falta
 * no puede ser un fallo —es la regla de `motivo` y de `opciones` en `mesa.ts`—,
 * así que aquí se decide qué se hace cuando no está, y se decide UNA vez.
 *
 * Lo que cuelga de esta respuesta no es cosmético: el Muelle no se monta si la
 * mesa ya ha empezado —se va directo al juego— y se arranca la coreografía de
 * zarpar cuando pasa a `true`. Dos sitios contestándola por su cuenta sería la
 * manera de que uno zarpe y el otro se quede en el embarcadero.
 *
 * ═══ LA INFERENCIA, Y SUS LÍMITES DICHOS CON TODAS LAS LETRAS ═══
 *
 * Cuando el campo no viene se mira `opciones`: si el juego OFRECE la opción de
 * empezar, es que todavía no ha empezado. Riberas la declara con `id: 'empezar'`
 * y `tipo: 'riberas:empezar'` (`EMPEZAR` en `shared/arcade/juegos/riberas.ts`), y
 * el `tipo` de cualquier arcade va con su prefijo delante, así que se compara el
 * `id` entero y el último tramo del `tipo` tras los dos puntos.
 *
 * Los límites, para que nadie le pida a esto lo que no da:
 *
 *   · Es una convención de nombre, no un contrato. Un juego que llame «arrancar» a
 *     su opción de empezar se leerá como empezado mientras se reúne, y el Muelle
 *     lo mandaría al mueble del juego antes de tiempo. Con un servidor de hoy eso
 *     no pasa, porque el campo viene y la inferencia no se ejecuta.
 *   · Un juego que no ofrece nada mientras se reúne —uno simultáneo que arranca
 *     con el primer movimiento— se lee como empezado. Es la lectura más segura de
 *     las dos: mandar a alguien al mueble del juego es recuperable; dejarlo en un
 *     lobby de una partida que ya va, no.
 *   · Una mesa terminada no se reúne. Se contesta `true` antes de mirar nada más.
 *
 * ═══ SIN NINGÚN `import`, A PROPÓSITO ═══
 *
 * Como `relojes.ts` y `conexion-reglas.ts`: `verificar-sala.mjs` lo carga con
 * `node` pelado y lo llama con mesas fabricadas —el campo puesto a `true`, puesto
 * a `false`, y ausente con la opción de empezar delante—. Un `import` de
 * `react-native` aquí dejaría la función sin comprobar.
 */

/** Lo poco de una opción que hace falta para reconocer la de empezar. */
export interface OpcionQueSeMira {
  readonly id: string;
  readonly tipo: string;
}

/** Lo poco de una mesa que hace falta para contestar. Es un subconjunto de `MesaVista`. */
export interface MesaQueSeMira {
  readonly empezada?: boolean;
  readonly terminada?: boolean;
  readonly opciones?: readonly OpcionQueSeMira[];
}

/** El nombre por el que se reconoce la opción de empezar, en `id` o al final del `tipo`. */
const EMPEZAR = 'empezar';

/**
 * La opción de empezar entre las que ofrece el juego, o `undefined` si no la hay.
 *
 * Exportada porque la hoja del Muelle pinta ESE botón —con el `rotulo` y la
 * `ayuda` que escribió el juego— y tiene que encontrarlo con la misma regla con
 * la que `haEmpezado` decide. Dos reglas darían un botón visible en una mesa que
 * este fichero da por empezada.
 */
export function opcionDeEmpezar<O extends OpcionQueSeMira>(
  opciones: readonly O[] | undefined,
): O | undefined {
  if (!Array.isArray(opciones)) return undefined;
  return opciones.find((o) => {
    if (typeof o !== 'object' || o === null) return false;
    if (o.id === EMPEZAR) return true;
    if (typeof o.tipo !== 'string') return false;
    const tramos = o.tipo.split(':');
    return tramos[tramos.length - 1] === EMPEZAR;
  });
}

/** ¿Ha empezado la partida? El campo si viene; la inferencia de arriba si no. */
export function haEmpezado(mesa: MesaQueSeMira | null | undefined): boolean {
  if (mesa === null || mesa === undefined) return false;
  if (typeof mesa.empezada === 'boolean') return mesa.empezada;
  if (mesa.terminada === true) return true;
  return opcionDeEmpezar(mesa.opciones) === undefined;
}
