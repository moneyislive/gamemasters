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
export const REVISADOS_EL = '2026-09-25';

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
        Para preparar veladas en el taller hace falta entrar con una cuenta, y el titular puede
        limitar quién entra, o cerrar el taller, cuando lo considere. Para jugar basta con la
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
          <strong>Se revisa, pero no se garantiza.</strong> Antes de entregarte una trama, otra
          pasada automática busca contradicciones y pistas que revelen la solución antes de tiempo,
          y corrige lo que encuentra. Eso reduce los errores; no los elimina. Lee el material antes de
          la velada: quien organiza es quien decide si está listo para la mesa.
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
      titulo: 'Lo que se paga',
      cuerpo: `
      <p>
        Jugar no cuesta nada, y dentro de la app no se vende nada. Lo que se paga es preparar
        veladas en el taller y, si quieres, aspectos para tus aventureros en la Sala de Arcade. Hay
        tres formas:
      </p>
      <ul>
        <li>
          <strong>Créditos</strong>, sueltos o por velada. Cada velada tiene un precio en créditos
          que depende de cuánta gente juega, del modelo y de las opciones que elijas, y que
          <strong>se te enseña antes de confirmar</strong>. Lo que confirmas es lo que se cobra.
        </li>
        <li>
          <strong>La suscripción de anfitrión</strong>: una cuota mensual que trae una bolsa de
          créditos cada mes y, mientras esté activa, el pase de la Sala.
        </li>
        <li>
          <strong>El pase de la Sala</strong>, por temporada: aspectos exclusivos para tus
          aventureros.
        </li>
      </ul>
      <p>
        Los precios se muestran con el IVA incluido antes de pagar. Los pagos los procesa Stripe:
        la tarjeta la escribes en su página y aquí no llega nunca. Los precios pueden cambiar; el que
        se aplica es siempre el que se te enseña al confirmar.
      </p>
      <p>
        Si en la página de pago aparece <strong>Link</strong> como vendedor, la compra la tramita
        Link, de Stripe, como comerciante registrado: sus condiciones rigen el cobro, el recibo, el
        IVA y las devoluciones que tramite. Estos términos siguen rigiendo el uso de GameMasters y de
        lo que compres.
      </p>`,
    },
    {
      titulo: 'Los créditos',
      cuerpo: `
      <p>
        Los créditos solo sirven para usar GameMasters. <strong>No son dinero</strong>: no se
        cambian por dinero, no se transfieren a otra cuenta y no tienen valor fuera de la
        plataforma. Cien créditos equivalen a un euro al comprarlos sueltos.
      </p>
      <ul>
        <li>
          Una velada se cobra al empezar a generarla. Con ella vienen incluidas las operaciones que
          indique la confirmación —volver a generarla una vez, poner al día el reparto, reescribir el
          material, revisarla otra vez, charlar con el asistente—, hasta los límites que se indiquen
          allí. Más allá de esos límites, esas operaciones pueden tener un coste o no estar
          disponibles.
        </li>
        <li>
          <strong>Si la generación no llega a completarse</strong>, o la revisión automática no
          puede darla por buena, los créditos de esa velada vuelven a tu monedero automáticamente.
          Se devuelven en créditos, no en dinero.
        </li>
        <li>
          Los créditos de la suscripción caducan al renovarse el mes siguiente; los que compres
          sueltos no caducan mientras tengas tu cuenta. Se gastan primero los de la suscripción.
        </li>
        <li>
          El historial de lo que entra y sale de tu monedero está en el taller, y el recibo de cada
          pago te llega por correo desde la pasarela.
        </li>
      </ul>`,
    },
    {
      titulo: 'La suscripción',
      cuerpo: `
      <p>
        Se renueva sola cada mes hasta que la canceles, y se cancela cuando quieras desde el portal
        de pagos del taller, sin escribir a nadie. Al cancelarla sigue activa hasta el final del
        periodo ya pagado y después no se renueva; no se devuelve la parte del mes que no uses.
      </p>
      <p>
        Si el precio o lo que incluye cambian, se avisará con al menos treinta días de antelación y
        podrás cancelarla antes de que te afecte. Si un cobro no se puede hacer, la suscripción se
        suspende hasta que se resuelva.
      </p>`,
    },
    {
      titulo: 'El pase de la Sala',
      cuerpo: `
      <p>
        Da acceso, durante la temporada que se indique al comprarlo, a aspectos exclusivos para tus
        aventureros. Son <strong>solo estética</strong>: no dan ninguna ventaja en ningún juego, no
        se ganan ni se pierden jugando y no se pueden transferir. Al terminar la temporada dejan de
        estar disponibles, y tu aventurero vuelve a uno de los de serie.
      </p>`,
    },
    {
      titulo: 'Desistimiento',
      cuerpo: `
      <p>
        Lo que se compra aquí es contenido digital que se entrega al momento: los créditos llegan a
        tu monedero en cuanto se confirma el pago, y la velada empieza a generarse en cuanto la
        confirmas. Por eso, al pagar, <strong>pides expresamente que el servicio empiece de
        inmediato y aceptas que, desde ese momento, pierdes el derecho de desistimiento</strong>,
        como prevé el artículo 103.m del texto refundido de la Ley General para la Defensa de los
        Consumidores y Usuarios. Se te recuerda en la página de pago, antes de confirmar.
      </p>
      <p>
        Nada de esto recorta los derechos que la ley te reconoce si lo que recibes no funciona o no
        es lo que se te ofreció: en ese caso, escribe a <a href="mailto:${correo}">${correo}</a>.
      </p>`,
    },
    {
      titulo: 'Darse de baja',
      cuerpo: `
      <p>
        Darte de baja es inmediato y lo haces tú: en la app, «Tu perfil» → «Borrar mi cuenta y mis
        datos». No hay que escribir a nadie ni esperar a que alguien lo apruebe. Si tienes una
        suscripción, cancélala antes desde el portal de pagos. Al borrar la cuenta se pierden los
        créditos que quedaran en el monedero.
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
        ni de lo que hagan quienes organizan o juegan una partida, ni de cómo salga una velada.
      </p>
      <p>
        En lo que se paga, y en la medida en que la ley lo permita, la responsabilidad total del
        titular frente a ti se limita a lo que hayas pagado en los doce meses anteriores al hecho
        que la cause.
      </p>`,
    },
    {
      titulo: 'Si has instalado la app desde una tienda',
      cuerpo: `
      <p>
        Estos términos son un acuerdo entre tú y el titular, <strong>no con Apple ni con
        Google</strong>. Las tiendas no participan en el servicio y no dan soporte de él: cualquier
        problema, duda o reclamación sobre la app va a
        <a href="mailto:${correo}">${correo}</a>. Dentro de la app no se vende nada: lo que se paga,
        se paga en la web del taller.
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
        se dan por supuestos por haberlos publicado aquí. Lo que ya hayas pagado se rige por los
        términos que había cuando lo pagaste.
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
