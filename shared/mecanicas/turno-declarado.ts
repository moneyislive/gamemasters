/**
 * A QUIÉN LE TOCA, DICHO EN LA VISTA, para que la plataforma pueda avisarle.
 *
 * ═══ QUÉ PROBLEMA RESUELVE, Y POR QUÉ APARECE EN LA FASE 4 BIS Y NO ANTES ═══
 *
 * En una partida de diez minutos nadie necesita que el servidor sepa de quién es
 * el turno: los cuatro están mirando la pantalla y lo ven. En una de TRES DÍAS es
 * la única pregunta que importa, porque de ella cuelga la frase «te toca a ti» que
 * alguien tiene que poder mandar al móvil de quien no está delante.
 *
 * Y el servidor no la sabe. El §5.1 del diseño dice que el estado del juego es
 * OPACO y de esa decisión cuelga el diseño entero: la autoridad valida quién,
 * cuándo y sobre qué revisión, y jamás mira dentro. Preguntarle al estado de quién
 * es el turno sería exactamente lo que el §5.3 prohíbe con todas las letras —«de
 * quién es el turno es un CAMPO DEL ESTADO DEL JUEGO. En cuanto el motor sabe qué
 * es un turno, el primer juego rico que se escriba decide qué forma tiene»—.
 *
 * ═══ LA SALIDA: SE LEE DE LA VISTA, QUE ES LO QUE EL JUEGO PUBLICA A PROPÓSITO ═══
 *
 * La proyección es la superficie que el juego elige enseñar, y en ella el turno ya
 * está: los dos arcades por turnos de esta casa —La Ronda y Riberas— publican
 * `turnoDe` en la vista de TODOS, incluida la del espectador, porque de quién es
 * el turno no es secreto de nadie. Esto no inventa un campo: le pone nombre y
 * contrato a uno que ya existía en los dos sitios donde tenía que existir.
 *
 * La diferencia con mirar el estado es la que hace que esto sea legítimo:
 *
 *   · EL ESTADO es privado del reductor y no tiene forma pactada. Mirarlo obliga
 *     a la plataforma a conocer un juego.
 *   · LA VISTA es lo que el juego decidió publicar y ya viaja por el cable a
 *     cuatro móviles. Leer un campo de ella es lo mismo que ya hace
 *     `tableroDeLaVista` para pintar el mueble genérico, y por el mismo motivo:
 *     un mueble que no puede mandar código al móvil necesita que la forma viaje
 *     declarada.
 *
 * ═══ ES OPCIONAL, Y ESA ES LA MITAD DEL CONTRATO ═══
 *
 * Un juego SIN turnos —una fiesta simultánea, un arcade de un jugador— no declara
 * nada y eso no es un fallo: es que la pregunta no aplica. Por eso el resultado
 * distingue TRES casos y no dos, que es donde estaba la trampa:
 *
 *   · NO DECLARA. Este juego no tiene turnos, o esta versión de la app es más
 *     vieja que el servidor. No hay a quién avisar y no hay nada roto.
 *   · DECLARA Y NO LE TOCA A NADIE. La mesa se está reuniendo, o la partida se
 *     acabó. No hay a quién avisar y tampoco hay nada roto.
 *   · DECLARA Y LE TOCA A ALGUIEN. Ésta es la única en la que se puede escribir
 *     un aviso.
 *
 * Con dos casos —`string | null`— las dos primeras se confunden, y entonces «no sé
 * de quién es el turno» y «no es de nadie» se cuentan igual. Eso convierte un juego
 * cuya vista cambió de forma en un juego cuya mesa parece parada para siempre, sin
 * un solo error en ningún sitio: el modo de fallo favorito de esta casa.
 *
 * ═══ POR QUÉ AQUÍ Y NO EN `shared/arcade/` ═══
 *
 * Por lo mismo que `tablero-declarado.ts`, y la razón está escrita en su cabecera:
 * el NÚCLEO no puede tener una opinión sobre la forma de la vista de un juego, o
 * saldría con la forma del primero que la usara. Esto es una mecánica —código que
 * sirve a varios juegos, que ninguno tiene la obligación de usar y que no sabe
 * quién lo usa— y `verify:nucleo-quieto` deja `mecanicas/` fuera de lo que sella
 * salvo las dos piezas de las que cuelga la reproducibilidad.
 *
 * La consecuencia práctica, dicha para que nadie la descubra sola: `verify:larga`
 * comprueba que los dos juegos por turnos instalados lo cumplen. Un tercero que se
 * escribiera sin `turnoDe` no rompería nada —el aviso sencillamente no se podría
 * escribir para él— y por eso la comprobación afirma los que HAY, derivados del
 * registro, en vez de exigirlo a todos.
 *
 * ═══ Y NI UN `import`, IGUAL QUE SUS VECINOS ═══
 *
 * `AsientoId` es `string` en `shared/arcade/tipos.ts` y aquí se escribe `string` a
 * mano en vez de traérselo. No es dejadez: ningún fichero de `mecanicas/` importa
 * nada, y eso es lo que permite que las use el motor de veladas, el de arcade y un
 * juego que no conozca a ninguno de los dos. Importar el vocabulario del arcade
 * aquí sería atar la carpeta común a una de las dos familias por una línea.
 */

/** Lo que se sabe del turno mirando la vista, con los tres casos separados. */
export type TurnoDeLaVista =
  /** Este juego no dice de quién es el turno. No aplica, o no lo declara. */
  | { readonly declarado: false }
  /** Lo dice: `de` es el asiento a quien le toca, o `null` si no le toca a nadie. */
  | { readonly declarado: true; readonly de: string | null };

/** El nombre del campo, escrito una vez. Los dos lados leen de aquí. */
export const CAMPO_DEL_TURNO = 'turnoDe';

/**
 * ¿DE QUIÉN ES EL TURNO, SEGÚN LA VISTA?
 *
 * Se admite `string` no vacía y `null`, y NADA MÁS. Un número, un objeto o una
 * cadena vacía se tratan como «no lo declara», que es más honesto que quedarse con
 * el valor: un identificador de asiento es una cadena con contenido, y creerse un
 * `0` o un `{}` como si fuera un asiento produciría un aviso dirigido a nadie —o
 * peor, una pantalla que dice «le toca a » con el hueco vacío.
 *
 * La cadena vacía entra en el descarte a propósito y no por pulcritud: `sillaNueva`
 * nunca produce un identificador vacío, así que una vista que trae `''` no está
 * diciendo «le toca a este», está diciendo que algo salió mal más arriba.
 */
export function turnoDeLaVista(vista: unknown): TurnoDeLaVista {
  if (typeof vista !== 'object' || vista === null) return { declarado: false };
  if (!(CAMPO_DEL_TURNO in vista)) return { declarado: false };

  const crudo = (vista as Record<string, unknown>)[CAMPO_DEL_TURNO];
  if (crudo === null) return { declarado: true, de: null };
  if (typeof crudo === 'string' && crudo.length > 0) return { declarado: true, de: crudo };
  return { declarado: false };
}
