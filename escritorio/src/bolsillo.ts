/**
 * EL ASIENTO, GUARDADO ENTRE RECARGAS.
 *
 * ═══ QUÉ SE GUARDA Y POR QUÉ HAY QUE GUARDARLO ═══
 *
 * Un asiento de arcade no tiene cuenta, ni correo, ni contraseña: es una LLAVE
 * que el servidor reparte una vez, al sentarse, y que solo conoce quien se
 * sentó. Es lo único que demuestra que la mesa es tuya, y no se puede volver a
 * pedir. Perderla es quedarse fuera de una partida en la que sigues sentado
 * —tu silla ocupada, tu mano repartida— sin ninguna forma de volver.
 *
 * En un móvil eso pasa cuando el sistema mata la app. En un PC pasa mucho más:
 * F5, un `Ctrl+W` sin querer, un navegador que se actualiza. O sea que aquí el
 * bolsillo no es una comodidad, es lo que hace jugable una partida larga.
 *
 * ═══ LA DIFERENCIA CON EL BOLSILLO DE LA APP, Y ES DE VERDAD ═══
 *
 * `app/src/arcade/bolsillo.ts` guarda en el almacén seguro del sistema y es
 * asíncrono. Aquí es `localStorage` y es síncrono, así que la pantalla puede
 * saber si hay asiento guardado en el primer render y no hay ninguna ventana en
 * la que enseñe «no estás en ninguna mesa» a quien sí lo está.
 *
 * Y hay una diferencia que no es de comodidad sino de sitio: un teléfono es de
 * UNA persona, y un PC no. Dos ventanas del mismo navegador comparten
 * `localStorage`, así que dos personas alrededor del mismo monitor —o una sola
 * probando la mesa consigo misma, que es lo primero que hace cualquiera— se
 * pisarían el asiento: la segunda ventana sobrescribiría la llave de la
 * primera, y la primera al recargar volvería sentada en la silla de la otra.
 * Por eso la llave del bolsillo lleva SILLA, que sale de `?silla=` en la
 * dirección. Sin parámetro es la silla de siempre y todo funciona como en el
 * móvil; con `?silla=b` es otro cajón.
 *
 * ═══ TODO ENVUELTO EN `try`, Y NO POR SUPERSTICIÓN ═══
 *
 * `localStorage` LANZA —no devuelve `null`— en una ventana privada de Safari,
 * con las cookies de terceros cortadas, y en cualquier navegador con el
 * almacenamiento del sitio bloqueado. Un `SecurityError` al leer el bolsillo
 * tumbaría la Sala entera antes de pintar la primera tarjeta, y el síntoma sería
 * una página en blanco. No poder recordar el asiento es una molestia; no poder
 * abrir la Sala, no.
 */

export interface SitioGuardado {
  codigo: string;
  llave: string;
}

/**
 * `arcade.<juego>` y, si hay silla, `arcade.<juego>#<silla>`.
 *
 * El prefijo es propio y no se comparte con el taller ni con la app: `/jugar` y
 * `/sala` son dos orígenes distintos solo en la ruta, o sea que comparten
 * `localStorage` de verdad. Una colisión de nombres aquí se leería como un
 * asiento fantasma en la otra pantalla.
 */
function llaveDelBolsillo(arcade: string, silla: string): string {
  return silla.length > 0 ? `escritorio.arcade.${arcade}#${silla}` : `escritorio.arcade.${arcade}`;
}

export function guardarElSitio(arcade: string, silla: string, sitio: SitioGuardado): void {
  try {
    globalThis.localStorage?.setItem(
      llaveDelBolsillo(arcade, silla),
      `${sitio.codigo}:${sitio.llave}`,
    );
  } catch {
    /*
     * Sin bolsillo se juega igual: lo que se pierde es volver tras recargar.
     * Avisar aquí sería avisar en el momento de guardar, que es cuando a nadie
     * le importa; el aviso útil es el que sale al recargar y no haber vuelto, y
     * ese lo da la mesa.
     */
  }
}

export function elSitioGuardado(arcade: string, silla: string): SitioGuardado | null {
  let crudo: string | null = null;
  try {
    crudo = globalThis.localStorage?.getItem(llaveDelBolsillo(arcade, silla)) ?? null;
  } catch {
    return null;
  }
  if (crudo === null) return null;

  /*
   * Se corta por el PRIMER dos puntos, no por todos. El código de mesa no lleva
   * ninguno, pero la llave la fabrica el servidor y no es asunto de este lado
   * cómo la escribe: partir por todos los separadores rompería el día que la
   * llave llevara uno, y el fallo sería «tu asiento ya no vale» sin más.
   */
  const corte = crudo.indexOf(':');
  if (corte <= 0 || corte === crudo.length - 1) return null;
  return { codigo: crudo.slice(0, corte), llave: crudo.slice(corte + 1) };
}

export function olvidarElSitio(arcade: string, silla: string): void {
  try {
    globalThis.localStorage?.removeItem(llaveDelBolsillo(arcade, silla));
  } catch {
    /* No poder olvidar no puede impedir levantarse de la mesa. */
  }
}
