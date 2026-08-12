/**
 * Qué dirección de servidor manda al arrancar: la guardada o la compilada.
 *
 * EL FALLO QUE SE EVITA. La pantalla «Cambiar de servidor» guarda la dirección
 * en el aparato, y al arrancar la guardada ganaba siempre y sin condiciones.
 * Esa pantalla es justo la que se usó en las veladas ya jugadas para apuntar
 * los móviles de los invitados al portátil de la casa, así que todos esos
 * aparatos se quedaron clavados en un `http://192.168.x.x:5174` PARA SIEMPRE:
 * instalar encima la versión nueva, la que apunta a harkania.com, no cambia
 * nada, porque la elección vieja sigue guardada y sigue ganando. Y no se
 * manifiesta como «la app apunta al sitio equivocado» —eso se arreglaría en un
 * minuto— sino como «a esta persona la app no le conecta desde ninguna parte»,
 * que nadie relaciona con una pantalla que se tocó una noche hace meses.
 *
 * CÓMO SE DISTINGUE UNA ELECCIÓN VIVA DE UN FÓSIL. No se le puede preguntar a
 * quien juega, y un número de versión de la app tampoco valdría: lo que hace
 * caduca la elección no es que la app haya cambiado, es que haya cambiado LA
 * DIRECCIÓN COMPILADA. Así que junto a la elección se guarda un testigo: qué
 * dirección traía la app en el momento exacto de elegir.
 *
 *   · Testigo igual a la compilada de ahora → quien eligió lo hizo sabiendo
 *     desde dónde se desviaba, y su elección se respeta entera. Es el caso de
 *     quien esta misma noche apunta su móvil al portátil de casa.
 *   · Testigo distinto → el suelo se ha movido bajo esa elección: la app de hoy
 *     ya no sale del sitio del que salía cuando se decidió desviarla. Se
 *     descarta y se vuelve a la compilada.
 *   · Sin testigo → es una elección anterior a que esto existiera, o sea,
 *     exactamente el fósil que motivó el fichero. Se descarta igual.
 *
 * Vive aparte, y sin importar absolutamente nada, porque es la única parte de
 * todo esto que se puede equivocar de verdad y porque así se puede EJECUTAR
 * fuera de la app (ver `comprobadores/verificar-app.mjs`), que es la diferencia
 * entre una comprobación que mira el código y una que lo prueba.
 */

/** Lo que hay guardado en el aparato sobre la elección de servidor. */
export interface EleccionGuardada {
  /** La dirección que se escribió en «Cambiar de servidor». */
  elegido: string | null;
  /** Qué dirección traía la app compilada cuando se guardó esa elección. */
  compiladoDeEntonces: string | null;
}

export type MotivoDelServidor =
  /** No hay nada guardado: se usa la compilada, como en una instalación nueva. */
  | 'sin-eleccion'
  /** Elección hecha con esta misma dirección compilada: se respeta. */
  | 'eleccion-de-esta-version'
  /** La dirección compilada ha cambiado desde que se eligió: fósil. */
  | 'eleccion-de-otra-version'
  /** Elección anterior al testigo: indistinguible de un fósil, se trata como tal. */
  | 'eleccion-sin-testigo';

export interface VeredictoDeServidor {
  /** La dirección con la que se va a hablar. */
  servidor: string;
  /** ¿Hay que borrar del aparato la elección guardada? */
  olvidar: boolean;
  motivo: MotivoDelServidor;
}

export function decidirServidor(
  guardado: EleccionGuardada,
  compiladoAhora: string,
): VeredictoDeServidor {
  const { elegido, compiladoDeEntonces } = guardado;

  if (!elegido) {
    return { servidor: compiladoAhora, olvidar: false, motivo: 'sin-eleccion' };
  }
  if (compiladoDeEntonces === null) {
    return { servidor: compiladoAhora, olvidar: true, motivo: 'eleccion-sin-testigo' };
  }
  if (compiladoDeEntonces !== compiladoAhora) {
    return { servidor: compiladoAhora, olvidar: true, motivo: 'eleccion-de-otra-version' };
  }
  return { servidor: elegido, olvidar: false, motivo: 'eleccion-de-esta-version' };
}
