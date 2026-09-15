/**
 * EL ASIENTO, GUARDADO ENTRE RECARGAS. Y, ABAJO DEL TODO, POR DÓNDE ESTABAS MIRANDO.
 *
 * Son DOS cosas de peso muy distinto y por eso están separadas en este fichero: el asiento es
 * la única prueba de que la mesa es tuya y perderlo cuesta la partida; la sección abierta es
 * una preferencia de interfaz y perderla cuesta un clic. Lo que comparten —y lo único por lo
 * que viven juntas— son las mismas diez líneas de `localStorage` envuelto en `try`.
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

/**
 * ═══ Y LO SEGUNDO QUE ESTE BOLSILLO GUARDA: POR DÓNDE ESTABA MIRANDO ═══
 *
 * ═══ EL FALLO, QUE ES UNA MITAD QUE FALTABA Y NO UNA ROTA ═══
 *
 * La hoja del Burgo tiene ocho secciones y sólo una abierta a la vez, y cuál estaba abierta
 * se guarda en `hojas-del-burgo.tsx` en un MAPA DE MÓDULO. Eso conserva la sección mientras
 * la pestaña siga abierta —que es cuando más importa: el pintor se desmonta y se vuelve a
 * montar en cada ida y vuelta a la Sala— y la pierde entera al RECARGAR. Y recargar en un PC
 * no es el caso raro que es en un teléfono: es F5, es un `Ctrl+W` sin querer, es el navegador
 * que se actualiza. Cada una de esas veces la hoja vuelve a abrir por donde diga quien la
 * monta y hay que ir a buscar «Lo mío» otra vez, en una partida que dura días.
 *
 * La app ya lo guarda de verdad (`app/src/arcade/bolsillo.ts`, `guardarLaSeccion` y
 * `laSeccionGuardada`), así que el hueco era de este cliente y estaba anotado como pendiente
 * en la cabecera de `LO_QUE_SE_DEJO_ABIERTO`. Esto es ese hueco.
 *
 * ═══ QUÉ ES ESTO Y QUÉ NO ES: NO ES UNA CREDENCIAL ═══
 *
 * El asiento de aquí arriba es la única prueba de que la mesa es tuya y perderlo es quedarse
 * fuera de una partida en la que sigues sentado. Esto NO: es una preferencia de interfaz —por
 * dónde tenías puesto el ojo— y un valor perdido, ilegible o de una sección que ya no exista
 * deja la hoja EXACTAMENTE como estaba, abriendo por donde diga quien llama. Por eso no se
 * valida aquí contra ninguna lista de secciones: quien conoce las ocho es la hoja, y una
 * segunda lista en este fichero sería el sitio donde una sección nueva se olvida.
 *
 * Va en este fichero y no en uno nuevo porque lo que se comparte son las MISMAS diez líneas
 * de fontanería —`localStorage` envuelto en `try`, que LANZA en una ventana privada de Safari
 * y con el almacenamiento del sitio bloqueado— y no una decisión que pueda desincronizarse.
 *
 * ═══ POR MESA, Y TAMBIÉN POR SILLA, QUE ES LO QUE LA APP NO NECESITA ═══
 *
 * Por MESA porque dos mesas del mismo juego están en momentos distintos y una sola memoria le
 * movería la sección de debajo del dedo a quien juega dos a la vez. Y por SILLA por lo mismo
 * que la llave del asiento y con el mismo fallo detrás: un teléfono es de UNA persona, pero un
 * PC no, y dos ventanas del mismo navegador comparten `localStorage`. Dos personas alrededor
 * del mismo monitor —o una sola probando la mesa consigo misma, que es lo primero que hace
 * cualquiera— están en LA MISMA mesa y por tanto con el mismo código: sin la silla en la
 * llave, abrir «Lo mío» en una ventana le mueve la sección a la otra en cuanto recargue. La
 * app no lo paga porque allí no hay dos ventanas.
 *
 * EL PREFIJO ES `escritorio.seccion.` Y NO `escritorio.arcade.seccion.`: metido dentro del
 * prefijo del asiento, un arcade que se llamara `seccion` chocaría con este cajón, y el
 * síntoma sería un asiento que de pronto vale «lo-mio». Colgado del prefijo propio no puede
 * chocar con nada, porque el segundo tramo es fijo en los dos.
 */
function llaveDeLaSeccion(arcade: string, silla: string, codigo: string): string {
  const llave = `escritorio.seccion.${arcade}.${codigo}`;
  return silla.length > 0 ? `${llave}#${silla}` : llave;
}

/** Recuerda qué sección de la hoja estaba abierta en esta mesa y en esta ventana. */
export function guardarLaSeccion(arcade: string, silla: string, codigo: string, seccion: string): void {
  try {
    globalThis.localStorage?.setItem(llaveDeLaSeccion(arcade, silla, codigo), seccion);
  } catch {
    /*
     * Igual que el asiento: sin bolsillo se juega. Lo que se pierde es volver a la misma
     * sección tras recargar, y avisar de eso en el momento de guardar es avisar cuando a nadie
     * le importa.
     */
  }
}

/**
 * Qué sección estaba abierta en esta mesa, o `null` si no hay nada guardado.
 *
 * DEVUELVE LA CADENA TAL CUAL, sin mirar si es una sección conocida: quien llama tiene la
 * lista de las ocho y sabe qué abre por defecto. Comprobarlo aquí obligaría a repetir esa
 * lista, y una lista repetida es el sitio donde la sección número nueve se queda fuera.
 */
export function laSeccionGuardada(arcade: string, silla: string, codigo: string): string | null {
  try {
    return globalThis.localStorage?.getItem(llaveDeLaSeccion(arcade, silla, codigo)) ?? null;
  } catch {
    return null;
  }
}
