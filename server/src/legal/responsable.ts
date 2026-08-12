/**
 * Quién responde de todo esto: el responsable del tratamiento y titular del sitio.
 *
 * ES EL MISMO EN LOS TRES DOCUMENTOS y por eso vive aquí solo. La política de
 * privacidad lo nombra como responsable del tratamiento (artículo 13 del RGPD),
 * el aviso legal lo identifica como prestador del servicio (artículo 10 de la
 * LSSI, que exige nombre o razón social, domicilio, correo y NIF) y los términos
 * dicen con quién contrata quien usa la plataforma. Tenerlo escrito en tres
 * sitios significa que el día que se constituya una sociedad —o simplemente que
 * cambie el correo de contacto— dos de los tres se quedan mintiendo, y el que
 * miente es siempre el que nadie recuerda que existía.
 *
 * POR QUÉ SALE DEL ENTORNO Y NO DEL CÓDIGO. El NIF y el domicilio no se saben
 * todavía, y no hay ninguna prisa por inventarlos: un aviso legal con datos
 * falsos es peor que uno incompleto. Uno incompleto se completa; uno falso es
 * una declaración pública equivocada que además invalida justo aquello para lo
 * que se publicó. Y el domicilio fiscal es de las pocas cosas de este
 * repositorio que no deben estar en el repositorio: acaba en la copia local de
 * cualquiera que clone.
 *
 * LO QUE FALTA SE DICE, Y SE VE. Cuando una variable no está, el documento
 * imprime «pendiente de completar» marcado en rojo, y arriba del todo aparece un
 * aviso que explica que el documento está incompleto. La alternativa —dejar el
 * hueco en blanco, o esconder la fila entera— produce un documento que PARECE
 * completo: quien lo publica no se entera de que le falta el NIF hasta que se lo
 * dice la tienda, semanas después, con la revisión rechazada.
 *
 * EL NOMBRE Y EL CORREO TIENEN VALOR POR DEFECTO Y LOS DEMÁS NO. No es una
 * excepción caprichosa: son los dos datos que la política de privacidad ya
 * publica hoy, en producción, desde su primera versión. Sustituirlos por
 * «pendiente de completar» no sería honestidad, sería borrar información cierta
 * de un documento que ya está en la calle. Los otros dos nunca estuvieron, así
 * que ahí no hay nada que conservar.
 */
import { escaparHtml } from './plantilla';

/** Lo que se imprime donde debería haber un dato y no lo hay. */
export const PENDIENTE = 'pendiente de completar';

/**
 * El nombre y el correo que la política de privacidad publica desde su primera
 * versión. Se quedan como valor por defecto; cualquiera de las dos variables de
 * entorno manda sobre ellos.
 */
const NOMBRE_POR_DEFECTO = 'Miguel Peidro Paredes';
const CORREO_POR_DEFECTO = 'miguelpeidroparedes@gmail.com';

/** Un dato del responsable, ya resuelto: o está, o consta que falta. */
export interface DatoDelResponsable {
  etiqueta: string;
  /** El valor real, sin escapar. `undefined` cuando no se ha configurado. */
  valor?: string;
  /** Si es un correo, se imprime como enlace `mailto:`. */
  esCorreo?: boolean;
}

/**
 * Lee una variable de entorno EN CADA LLAMADA, no al cargar el módulo.
 *
 * Parece un detalle y no lo es: leerlas al importar congela los valores en el
 * primer `import`, y entonces las comprobaciones automáticas que levantan dos
 * servidores —uno con los datos puestos y otro sin ellos— para ver que el
 * documento cambia no pueden funcionar. Y de paso, quien corrige una errata en
 * el fichero de entorno la ve al reiniciar y no al recompilar.
 */
function delEntorno(nombre: string): string | undefined {
  return process.env[nombre]?.trim() || undefined;
}

/** El nombre o razón social de quien responde. Nunca vacío. */
export function nombreDelResponsable(): string {
  return delEntorno('LEGAL_RESPONSABLE') ?? NOMBRE_POR_DEFECTO;
}

/** La dirección de contacto para cualquier cosa relacionada con datos. */
export function correoDelResponsable(): string {
  return delEntorno('LEGAL_CORREO') ?? CORREO_POR_DEFECTO;
}

/**
 * La ficha completa, en el orden en que la pide la LSSI.
 *
 * El dato registral se omite entero cuando no está, y es el único que se
 * comporta así: una persona física no está inscrita en ningún registro
 * mercantil, de modo que marcarlo como «pendiente de completar» estaría
 * anunciando para siempre la falta de algo que no tiene por qué existir.
 */
export function datosDelResponsable(): DatoDelResponsable[] {
  const registro = delEntorno('LEGAL_REGISTRO');
  return [
    { etiqueta: 'Titular', valor: nombreDelResponsable() },
    { etiqueta: 'NIF / CIF', valor: delEntorno('LEGAL_NIF') },
    { etiqueta: 'Domicilio', valor: delEntorno('LEGAL_DIRECCION') },
    { etiqueta: 'Correo de contacto', valor: correoDelResponsable(), esCorreo: true },
    ...(registro ? [{ etiqueta: 'Datos registrales', valor: registro }] : []),
  ];
}

/**
 * ¿Hay algún dato sin configurar? De esto cuelga el aviso de arriba.
 *
 * NO ES LA MISMA PREGUNTA EN LOS TRES DOCUMENTOS, y darlo por hecho causó una
 * regresión visible en una página que llevaba tiempo publicada y correcta:
 *
 *   · El AVISO LEGAL existe para publicar el NIF y el domicilio (artículo 10 de
 *     la LSSI). Sin ellos está incompleto de verdad, y decirlo es lo honesto.
 *   · La POLÍTICA DE PRIVACIDAD no los necesita. El RGPD (artículo 13) le pide
 *     la identidad del responsable y una vía de contacto, y las dos están —con
 *     nombre y correo publicados desde su primera versión—. Encabezarla con «este
 *     documento está incompleto» por un NIF que no le corresponde publicar es
 *     alarmar a quien la lee y anunciar un defecto que no tiene.
 *
 * Y lo vería precisamente quien revisa la app para la tienda, porque la ficha
 * de la tienda apunta justo a esa dirección.
 */
export function hayDatosPendientes(alcance: 'ficha-completa' | 'contacto' = 'ficha-completa'): boolean {
  if (alcance === 'contacto') return false;
  return datosDelResponsable().some((dato) => dato.valor === undefined);
}

/** Un valor ya listo para imprimir: el dato escapado, o la marca de que falta. */
function valorEnHtml(dato: DatoDelResponsable): string {
  if (dato.valor === undefined) {
    return `<span class="pendiente">${PENDIENTE}</span>`;
  }
  const texto = escaparHtml(dato.valor);
  return dato.esCorreo ? `<a href="mailto:${texto}">${texto}</a>` : texto;
}

/**
 * La ficha del responsable como lista de definiciones.
 *
 * Con `alcance: 'contacto'` salen solo el titular y el correo, que es lo que la
 * política de privacidad tiene que publicar. Enseñarle ahí un NIF marcado como
 * «pendiente» le colgaría un defecto que no es suyo: ese dato lo publica el
 * aviso legal, y para eso los tres documentos se enlazan entre sí.
 */
export function fichaDelResponsable(
  alcance: 'ficha-completa' | 'contacto' = 'ficha-completa',
): string {
  const datos =
    alcance === 'contacto'
      ? datosDelResponsable().filter((d) => d.etiqueta === 'Titular' || d.esCorreo)
      : datosDelResponsable();
  const filas = datos
    .map((dato) => `<dt>${dato.etiqueta}</dt><dd>${valorEnHtml(dato)}</dd>`)
    .join('\n      ');
  return `<dl>\n      ${filas}\n    </dl>`;
}

/**
 * El aviso de que el documento está incompleto, o cadena vacía si no lo está.
 *
 * Va ARRIBA, antes de nada, y no al lado del hueco. Quien tiene que actuar sobre
 * esto no es quien lee el documento —a esa persona el aviso solo le sirve para
 * saber que no le están escondiendo nada— sino quien administra el servidor, y
 * esa entra a mirar la página una vez, por encima, el día del despliegue.
 */
export function avisoDeDatosPendientes(
  alcance: 'ficha-completa' | 'contacto' = 'ficha-completa',
): string {
  if (!hayDatosPendientes(alcance)) return '';
  return `<p class="aviso-incompleto">
    Este documento está <strong>incompleto</strong>: los datos marcados como
    «${PENDIENTE}» aún no se han configurado en este servidor. Se completan definiendo
    las variables de entorno <code>LEGAL_RESPONSABLE</code>, <code>LEGAL_NIF</code>,
    <code>LEGAL_DIRECCION</code> y <code>LEGAL_CORREO</code>. Mientras tanto, para
    cualquier asunto legal o de protección de datos escribe a
    <a href="mailto:${escaparHtml(correoDelResponsable())}">${escaparHtml(correoDelResponsable())}</a>.
  </p>`;
}

/** El pie que llevan los tres documentos. */
export function pieDelResponsable(): string {
  const correo = escaparHtml(correoDelResponsable());
  return `<p>Responsable: ${escaparHtml(nombreDelResponsable())} · <a href="mailto:${correo}">${correo}</a></p>`;
}
