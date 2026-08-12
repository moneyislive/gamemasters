/**
 * Los términos de uso: el trato entre quien pone la plataforma y quien la usa.
 *
 * POR QUÉ HACEN FALTA HOY Y NO «CUANDO HAYA USUARIOS». Las dos tiendas los
 * exigen para publicar: Apple pide un acuerdo de licencia para el usuario final
 * —y si no se aporta uno propio, aplica el suyo estándar, con sus condiciones—,
 * y ambas piden un enlace público en la ficha de la aplicación. Sin esta página,
 * la revisión ni siquiera empieza.
 *
 * LA SECCIÓN QUE DE VERDAD SE MIRA es la del contenido generado con inteligencia
 * artificial. La trama, los dosieres y las respuestas del Mayordomo las escribe
 * un modelo, y eso convierte a la plataforma en un producto con contenido
 * generado a los ojos de las directrices de las tiendas (Apple 1.2, y las
 * políticas equivalentes de Google Play): hay que advertirlo, hay que ofrecer una
 * manera de denunciar una respuesta, y hay que decir quién la revisa. Las tres
 * cosas existen en el código —el botón de denuncia está en la app y lo denunciado
 * llega a quien organiza— y por eso se pueden escribir aquí sin faltar a la
 * verdad.
 *
 * TONO. Esto lo va a leer alguien que solo quiere cenar con sus amigos y jugar a
 * detectives. Se escribe en castellano llano, sin mayúsculas de abogado y sin
 * cláusulas que nadie lee. Lo que se promete, se cumple; lo que no se puede
 * prometer, se dice.
 *
 * VA POR DELANTE DEL GUARDIÁN DE LA CONTRASEÑA. Quien tiene que leer las
 * condiciones antes de aceptarlas es, por definición, quien todavía no ha
 * entrado.
 */
import { crearRouter } from '../rutas';
import { documentoLegal } from './plantilla';
import type { SeccionLegal } from './plantilla';
import {
  avisoDeDatosPendientes,
  correoDelResponsable,
  nombreDelResponsable,
  pieDelResponsable,
} from './responsable';
import { escaparHtml } from './plantilla';

/** Última revisión del texto. Se enseña al final del documento. */
export const REVISADOS_EL = '2026-08-12';

function secciones(): SeccionLegal[] {
  const titular = escaparHtml(nombreDelResponsable());
  const correo = escaparHtml(correoDelResponsable());

  return [
    {
      titulo: 'Qué estás aceptando',
      cuerpo: `
      <p>
        Estos términos regulan el uso de GameMasters: la web de <strong>harkania.com</strong>, el
        taller donde se preparan las partidas y la app con la que se juega. El servicio lo presta
        <strong>${titular}</strong>, cuyos datos completos están en el
        <a href="/aviso-legal">aviso legal</a>.
      </p>
      <p>
        Al usar cualquiera de las dos piezas aceptas lo que dice esta página y lo que dice la
        <a href="/privacidad">política de privacidad</a>. Si no estás de acuerdo con algo, la
        salida es sencilla: no uses la plataforma, y si ya la has usado, borra tus datos como se
        explica en la política de privacidad.
      </p>`,
    },
    {
      titulo: 'Qué es el servicio y qué no promete',
      cuerpo: `
      <p>
        GameMasters ayuda a montar un misterio para jugarlo en persona: reparte los papeles, escribe
        la trama, imprime los dosieres y lleva la partida en vivo desde el móvil de cada
        participante. Es un juego. No es un servicio de mensajería, ni una red social, ni un lugar
        donde guardar nada que no puedas permitirte perder.
      </p>
      <p>
        Se hace lo razonable para que esté disponible y para no perder datos, pero no se garantiza
        que funcione sin interrupciones ni que una partida esté ahí para siempre. Puede haber
        mantenimientos, fallos y cortes de los proveedores de los que depende.
      </p>`,
    },
    {
      titulo: 'Quién puede usarlo',
      cuerpo: `
      <p>
        La plataforma está pensada para personas adultas y <strong>no está dirigida a menores de
        catorce años</strong>. Quien organiza la partida es quien decide a quién invita, y es esa
        persona la que debe contar con el consentimiento de quien corresponda si en la mesa hay
        menores de esa edad.
      </p>
      <p>
        Para entrar en el taller hace falta autorización del titular. Para jugar basta con la
        invitación o el código que reparte quien organiza: esos códigos son la llave de tu partida,
        así que no los publiques ni los compartas con quien no esté invitado.
      </p>`,
    },
    {
      titulo: 'El contenido lo escribe una máquina',
      cuerpo: `
      <p>
        La trama del misterio, los dosieres de los personajes y las respuestas del Mayordomo se
        generan con un modelo de inteligencia artificial. Conviene tenerlo presente:
      </p>
      <ul>
        <li>
          <strong>Puede equivocarse y puede inventarse cosas.</strong> Es ficción para jugar, y no
          debe tomarse como información cierta sobre nada ni sobre nadie.
        </li>
        <li>
          <strong>Habla de personajes, no de personas.</strong> Los secretos, los motivos y las
          coartadas que se escriben para tu personaje son parte del juego. No dicen nada de ti, ni
          de nadie de la mesa, aunque lleven vuestros nombres.
        </li>
        <li>
          <strong>Si una respuesta se pasa de la raya, se denuncia.</strong> Hay un botón para ello
          junto a cada respuesta del Mayordomo; lo denunciado, con la pregunta que lo provocó, le
          llega a quien organiza la partida, que es quien puede pararlo en el acto.
        </li>
      </ul>`,
    },
    {
      titulo: 'Cómo hay que portarse',
      cuerpo: `
      <p>Se resume en no usar la plataforma para hacer daño. En concreto, no se puede:</p>
      <ul>
        <li>
          Subir fotografías de otras personas sin su permiso, ni apuntar el correo de alguien que
          no quiere ser invitado.
        </li>
        <li>
          Usar el material del juego —los nombres, las descripciones, las respuestas del
          Mayordomo— para acosar, humillar o señalar a nadie.
        </li>
        <li>
          Intentar que el Mayordomo produzca contenido ilegal, sexual con menores, de odio o
          dirigido contra una persona concreta.
        </li>
        <li>
          Entrar donde no te han invitado, probar códigos ajenos, hurgar en la API o revender el
          servicio.
        </li>
      </ul>
      <p>
        Si algo de esto ocurre, se puede suspender el acceso o cerrar la partida sin previo aviso.
        Es lo justo con el resto de la mesa.
      </p>`,
    },
    {
      titulo: 'Lo que subes sigue siendo tuyo',
      cuerpo: `
      <p>
        Las fotografías, los nombres y las descripciones que introduces son tuyos. Se usan
        únicamente para hacer funcionar tu partida —incluido enviárselos a los proveedores que se
        enumeran en la <a href="/privacidad">política de privacidad</a>, y a ninguno más— y
        desaparecen cuando borras la partida o tu cuenta. No se venden, no se ceden y no se usan
        para entrenar ningún modelo.
      </p>`,
    },
    {
      titulo: 'Precio, y cómo darse de baja',
      cuerpo: `
      <p>
        Hoy no se cobra nada por jugar ni hay compras dentro de la aplicación. Si algún día las
        hubiera, se avisaría antes y nunca se cobraría por algo que ya estabas usando gratis sin
        preguntártelo primero.
      </p>
      <p>
        Darte de baja es inmediato y lo haces tú: en la app, «Tu perfil» → «Borrar mi cuenta y mis
        datos». No hay que escribir a nadie ni esperar a que alguien lo apruebe.
      </p>`,
    },
    {
      titulo: 'Responsabilidad',
      cuerpo: `
      <p>
        El titular responde de los daños que cause por dolo o negligencia grave, y de todo aquello
        de lo que la ley no permite eximirse —muy en particular, los derechos que la normativa de
        consumo reconoce a las personas consumidoras, que no se ven afectados por nada de lo que
        diga esta página—. Fuera de eso, no responde de los daños indirectos ni del lucro cesante,
        ni de lo que hagan quienes organizan o juegan una partida.
      </p>`,
    },
    {
      titulo: 'Si has instalado la app desde una tienda',
      cuerpo: `
      <p>
        Estos términos son un acuerdo entre tú y el titular, <strong>no con Apple ni con
        Google</strong>. Las tiendas no participan en el servicio y no dan soporte de él: cualquier
        problema, duda o reclamación sobre la app va a
        <a href="mailto:${correo}">${correo}</a>.
      </p>
      <p>
        El titular es el único responsable de la aplicación y de su contenido, incluidas las
        reclamaciones por productos defectuosos, por incumplimiento de la normativa aplicable o por
        infracción de derechos de terceros. Apple y sus filiales son terceros beneficiarios de este
        acuerdo y podrán exigir su cumplimiento frente a ti. Además, se aplican las reglas de uso de
        la propia tienda desde la que hayas descargado la app.
      </p>`,
    },
    {
      titulo: 'Cambios',
      cuerpo: `
      <p>
        Si estos términos cambian, cambia también la fecha del pie. Los cambios que afecten de
        verdad a lo que aceptaste se anunciarán dentro de la aplicación antes de que se apliquen, no
        se dan por supuestos por haberlos publicado aquí.
      </p>`,
    },
    {
      titulo: 'Ley aplicable',
      cuerpo: `
      <p>
        Se aplica la ley española. Si eres persona consumidora, conservas el derecho a acudir a los
        tribunales de tu domicilio y a los mecanismos de resolución de conflictos que la ley te
        reconozca. Y antes de todo eso, escribe a <a href="mailto:${correo}">${correo}</a>: casi
        todo se arregla ahí.
      </p>`,
    },
  ];
}

/** Los términos de uso, en HTML autocontenido. */
export function paginaDeTerminos(): string {
  return documentoLegal({
    titulo: 'Términos de uso',
    ruta: '/terminos',
    entradilla: avisoDeDatosPendientes('contacto'),
    secciones: secciones(),
    revisadaEl: REVISADOS_EL,
    pie: pieDelResponsable(),
  });
}

const router = crearRouter();

/*
 * Tres direcciones para el mismo documento, y no es capricho: la que se pega en
 * la consola de una tienda a veces trae `.html`, y quien la escribe de memoria
 * tiende a escribirla entera. Todas las formas razonables tienen que llevar al
 * documento, porque la alternativa no es un 404 honesto: es el comodín del
 * taller devolviendo su portada con un 200, y una tienda dando por bueno un
 * enlace que no lleva a los términos de nada.
 *
 * Sin tilde, y a propósito. El navegador manda `/t%C3%A9rminos` y Express
 * compara contra la ruta tal cual llega, sin descodificar: una ruta escrita
 * «/términos» aquí no la encajaría nunca, y quedaría una dirección que parece
 * declarada y no responde.
 */
router.get(['/terminos', '/terminos.html', '/terminos-de-uso'], (_req, res) => {
  res.type('html').send(paginaDeTerminos());
});

export default router;
