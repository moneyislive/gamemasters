/**
 * Qué dice la invitación que sale por correo, y por dónde puede salir.
 *
 * Aquí viven las FORMAS —el mensaje ya compuesto y el contrato de un
 * transporte— y la redacción del único correo que este servidor manda. Las
 * implementaciones que lo entregan de verdad están en `memoria.ts` y `ses.ts`.
 *
 * LO QUE NO PUEDE IR DENTRO DE ESTE CORREO, que es lo que de verdad hay que
 * dejar escrito:
 *
 *   · EL CÓDIGO PERSONAL (`joinCode`) NO VIAJA AQUÍ. Es la tentación evidente
 *     —«pon el código en el correo y que entre de un toque»— y es justo lo que
 *     convierte un reenvío en la llave de la silla de otra persona. Un correo se
 *     reenvía, se archiva, se lee en un portátil compartido y sobrevive años a
 *     la velada. El código lo dicta quien organiza, mirando a la cara a quien se
 *     sienta, y ese es el único momento en que hay alguien comprobando que la
 *     persona es la que se esperaba.
 *
 *   · TAMPOCO EL PERSONAJE NI NADA DEL MISTERIO. Por el mismo motivo por el que
 *     la página de aterrizaje se lo calla: quien recibe el reenvío no tiene por
 *     qué saber quién se sienta en esa mesa ni con qué papel. Dentro de la app,
 *     ya identificada, sí.
 *
 * Lo que queda es lo justo: a qué velada te esperan y por dónde se entra. El
 * enlace no es una llave —ver `enlaceDeInvitacion`— así que un reenvío no
 * regala nada.
 */
import { enlaceDeInvitacion, escaparHtml } from '../enlaces/aterrizaje';

/** A quién se invita y a qué velada. Lo mínimo para redactar el mensaje. */
export interface Invitada {
  /** El correo que escribió quien organiza. No está verificado por nadie. */
  para: string;
  /** Cómo la llamó quien organiza, para encabezar el mensaje. */
  nombre?: string;
  gameId: string;
  participanteId: string;
  /** El nombre de la partida, tal como se enseña. */
  tituloPartida: string;
}

/** El correo ya redactado, antes de entregarlo. */
export interface MensajeCompuesto {
  para: string;
  asunto: string;
  texto: string;
  html: string;
  /** El enlace que lleva a la invitación. Se devuelve aparte a propósito: ver abajo. */
  enlace: string;
}

/**
 * Por dónde sale un correo.
 *
 * Deliberadamente diminuto: entregar y ya. Todo lo que sea redactar, decidir a
 * quién o comprobar qué se puede contar ocurre antes de llegar aquí, en un solo
 * sitio, y así una implementación nueva no puede saltárselo por descuido.
 */
export interface Transporte {
  /** Cómo se llama, para poder decirlo en la respuesta y en el registro. */
  nombre: string;
  entregar(mensaje: MensajeCompuesto): Promise<void>;
}

/**
 * Redacta la invitación.
 *
 * El enlace lo fabrica `enlaceDeInvitacion` y no se compone a mano aquí, aunque
 * sean tres líneas: si se escribiera en los dos sitios, el día que cambie la
 * ruta o la caducidad del sobre uno de los dos se quedaría atrás, y el que se
 * quedaría atrás es el que nadie abre nunca en desarrollo — el del correo.
 */
export function componerInvitacion(invitada: Invitada, origen: string): MensajeCompuesto {
  const enlace = enlaceDeInvitacion(invitada.gameId, invitada.participanteId);
  const privacidad = `${origen}/privacidad`;
  const saludo = invitada.nombre?.trim() ? `${invitada.nombre.trim()},` : 'Hola,';
  const titulo = invitada.tituloPartida.trim() || 'una velada de misterio';

  const asunto = `Te esperan en «${titulo}»`;

  const texto = [
    saludo,
    '',
    `Te han invitado a una velada de misterio: «${titulo}».`,
    '',
    'Se juega desde el móvil. Abre este enlace y tu invitación te estará esperando dentro:',
    '',
    enlace,
    '',
    'Si no reconoces esta invitación, no tienes que hacer nada: el enlace por sí solo no',
    'sienta a nadie a la mesa.',
    '',
    '— Harkania',
    `Cómo tratamos tus datos: ${privacidad}`,
    '',
  ].join('\n');

  /*
   * SIN NADA DE FUERA: ni imágenes, ni tipografías, ni hojas de estilo remotas.
   * No es la misma razón que en la página de aterrizaje —allí era la cobertura
   * del móvil— sino otra peor: los clientes de correo bloquean por defecto todo
   * lo remoto, así que una plantilla que dependa de una imagen llega descuadrada
   * y con un hueco gris justo donde iba el sello. Estilos en línea por el mismo
   * motivo: Gmail descarta el `<style>` de la cabecera en buena parte de sus
   * vistas.
   */
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${escaparHtml(asunto)}</title></head>
<body style="margin:0;padding:24px;background:#0b1710;font-family:Georgia,'Times New Roman',serif;color:#f0e6cd;">
  <div style="max-width:32rem;margin:0 auto;text-align:center;line-height:1.6;">
    <div style="font-size:2.2rem;line-height:1;margin-bottom:12px;">&#9993;</div>
    <h1 style="font-size:1.4rem;margin:0 0 6px;color:#e8cf7f;">Te han invitado a una velada</h1>
    <p style="font-size:1.1rem;font-style:italic;margin:0 0 22px;">${escaparHtml(titulo)}</p>
    <p style="margin:0 0 22px;opacity:.85;">${escaparHtml(saludo)} se juega desde el móvil.
       Abre tu invitación y te estará esperando dentro.</p>
    <p style="margin:0 0 22px;">
      <a href="${escaparHtml(enlace)}"
         style="display:inline-block;padding:12px 22px;background:#e8cf7f;color:#0b1710;
                text-decoration:none;border-radius:4px;font-weight:700;letter-spacing:.04em;">
        Ver mi invitación</a>
    </p>
    <p style="margin:0 0 22px;font-size:.85rem;opacity:.7;word-break:break-all;">${escaparHtml(enlace)}</p>
    <hr style="border:0;height:1px;background:rgba(232,207,127,.3);margin:26px 0 14px;">
    <p style="margin:0;font-size:.8rem;opacity:.6;">Si no reconoces esta invitación, no tienes que
       hacer nada: el enlace por sí solo no sienta a nadie a la mesa.<br>
       <a href="${escaparHtml(privacidad)}" style="color:inherit;">Cómo tratamos tus datos</a></p>
  </div>
</body></html>`;

  return { para: invitada.para, asunto, texto, html, enlace };
}
