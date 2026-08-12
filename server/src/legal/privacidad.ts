/**
 * La política de privacidad, servida por el propio servidor.
 *
 * POR QUÉ VIVE AQUÍ Y NO EN UN .md DEL REPOSITORIO. Tiene que ser una dirección
 * pública y estable: las dos tiendas la exigen en la ficha de la aplicación
 * —accesible SIN instalar nada— y Apple pide además un enlace dentro de la app
 * (directriz 5.1.1(i)). Un fichero en un repositorio privado no vale, y un
 * documento alojado en un servicio de terceros es una dependencia más que
 * caduca. Se sirve desde el mismo dominio que todo lo demás.
 *
 * Y va POR DELANTE del guardián de la contraseña: una política de privacidad
 * detrás de una contraseña no sirve para nada.
 *
 * SOBRE EL CONTENIDO. Describe lo que el código hace HOY, comprobado leyéndolo,
 * no lo que estaría bien que hiciera. Si cambia el tratamiento —por ejemplo al
 * añadir el inicio de sesión con Google y Apple, o al guardar las
 * conversaciones con el Mayordomo— hay que cambiar este texto EN EL MISMO
 * COMMIT. Una política que va por detrás del código es peor que no tenerla,
 * porque afirma cosas falsas con apariencia de compromiso.
 *
 * Y ESO YA PASÓ UNA VEZ, que es de dónde sale `verify:legal`. Este texto estuvo
 * meses diciendo «solo dos proveedores» debajo de una lista de tres, sin
 * nombrar a Google ni a Apple aunque el servidor ya les mandaba testigos de
 * identidad, y sin mencionar una sola de las tres cookies que reparte. Ninguna
 * de las cosas que fallaban era difícil de ver: lo difícil era acordarse de
 * mirar. Ahora hay una comprobación que enumera los terceros y las cookies
 * leyendo el código y exige que este documento los nombre uno por uno, de modo
 * que el próximo proveedor que se conecte rompe la comprobación antes de llegar
 * a producción.
 */
import { crearRouter } from '../rutas';
import { documentoLegal } from './plantilla';
import type { SeccionLegal } from './plantilla';
import {
  avisoDeDatosPendientes,
  correoDelResponsable,
  fichaDelResponsable,
  pieDelResponsable,
} from './responsable';

/** Última revisión del texto. Se enseña al final del documento. */
export const REVISADA_EL = '2026-08-12';

function secciones(): SeccionLegal[] {
  const correo = correoDelResponsable();

  return [
    {
      titulo: 'Quién trata tus datos',
      cuerpo: `
      <p>
        El responsable del tratamiento es quien figura aquí abajo, y puedes escribirle para
        cualquier cosa relacionada con tus datos, incluidas las peticiones de acceso y de borrado.
        Sus datos completos están también en el <a href="/aviso-legal">aviso legal</a>.
      </p>
      ${fichaDelResponsable('contacto')}
      <p>
        GameMasters es una herramienta para organizar juegos de misterio en la vida real. Hay dos
        piezas y conviene distinguirlas, porque tratan datos distintos: el <em>taller</em>, que usa
        quien organiza la partida desde un ordenador, y la <em>app</em>, que usan quienes juegan
        desde su móvil.
      </p>`,
    },
    {
      titulo: 'Qué datos hay y de dónde salen',
      cuerpo: `
      <p>La app <strong>no te pide que te registres</strong>. Para jugar solo hacen falta dos
      códigos que reparte quien organiza. La app no tiene acceso a tu cámara, ni a tu micrófono,
      ni a tus contactos, ni a tu ubicación; de tu galería solo ve la imagen concreta que tú
      eliges si decides generar tu avatar.</p>

      <p>Los datos que existen son estos:</p>
      <ul>
        <li>
          <strong>Tu nombre y, si quien organiza lo escribe, tu correo.</strong> Los teclea esa
          persona al montar la partida. El correo es una <em>dirección de invitación</em>: sirve
          para invitarte y para ofrecerte guardar tus partidas. No crea ningún perfil por sí solo.
        </li>
        <li>
          <strong>Tu fotografía</strong>, si quien organiza sube una para tu personaje. La sube esa
          persona; la app no puede tomar fotos.
        </li>
        <li>
          <strong>Lo que haces en la partida:</strong> las salas que eliges, tu acusación, las
          notas que escribes en el cuaderno y una marca de la última vez que tu móvil dio señales
          de vida (es lo que pinta el «conectado» en el panel de quien dirige).
        </li>
        <li>
          <strong>Tu historial y tus trofeos</strong>, únicamente si has aceptado guardarlos (ver
          más abajo).
        </li>
        <li>
          <strong>Las respuestas del Mayordomo que denuncies</strong>, junto con la pregunta que
          las provocó. Se guardan para que quien organiza pueda revisarlas.
        </li>
        <li>
          <strong>La imagen que subas para generar tu avatar 3D</strong>, si usas esa función. La
          eliges tú, se usa solo para esculpir el modelo, y el modelo resultante se guarda en el
          servidor de tu juego.
        </li>
        <li>
          <strong>Si entras con tu cuenta de Google o de Apple:</strong> el correo que ese
          proveedor nos confirma, tu nombre si lo comparte y un identificador estable que solo
          sirve para reconocerte la próxima vez. Nada más: no se piden permisos sobre tu cuenta, ni
          acceso a tu agenda, ni a tu correo, ni a tus fotos.
        </li>
      </ul>

      <p>
        En el taller, quien organiza escribe además el material del juego: nombres de estancias, de
        objetos y las descripciones que quiera dar a cada personaje.
      </p>`,
    },
    {
      titulo: 'Para qué se usan, y con qué amparo',
      cuerpo: `
      <p>
        Para que el juego funcione y para nada más. No hay publicidad, no hay perfilado, no hay
        analítica de terceros y no se venden ni se ceden datos a nadie.
      </p>
      <ul>
        <li>
          <strong>Jugar la partida</strong> (tu nombre, tus elecciones, tus notas, tu presencia):
          la base es la ejecución de la relación que se establece al aceptar jugar, y el interés
          legítimo de quien organiza en poder dirigirla.
        </li>
        <li>
          <strong>Guardar tu historial y tus trofeos</strong>: solo con tu
          <strong>consentimiento</strong>, que das tú desde tu móvil, en «Tu perfil». Nunca lo da
          quien organiza por ti. Puedes retirarlo cuando quieras, y retirarlo no te echa de la
          partida.
        </li>
        <li>
          <strong>Entrar con tu cuenta de Google o de Apple</strong>: ejecución de la relación, y
          solo si eliges esa puerta. Es opcional — se puede jugar una velada entera sin cuenta
          ninguna, con el código que reparte quien organiza.
        </li>
        <li>
          <strong>Revisar una respuesta denunciada</strong>: cumplimiento de la obligación que
          imponen las tiendas de aplicaciones a los productos que generan contenido con
          inteligencia artificial.
        </li>
      </ul>`,
    },
    {
      titulo: 'Quién más los ve',
      cuerpo: `
      <p>
        Esta es la lista completa de terceros que reciben algo, y cada uno recibe una cosa
        concreta. Varios son <strong>opcionales</strong>: solo entran en juego si quien administra
        el servidor ha conectado esa función y solo cuando la usas.
      </p>
      <ul>
        <li>
          <strong>Anthropic</strong> (el modelo de lenguaje que escribe la trama y que da vida al
          Mayordomo). Recibe el material del juego —incluido el nombre con el que quien organiza
          te haya apuntado— y, cuando le preguntas algo al Mayordomo, tu pregunta junto con la
          ficha de tu propio personaje. <strong>También recibe tu dirección de correo</strong>, si
          quien organiza la apuntó al montar la velada: forma parte de la ficha del personaje que
          el modelo consulta para trabajar. No recibe las notas de tu cuaderno, ni las de nadie
          más. Tus conversaciones con el Mayordomo no se guardan en ningún sitio: se usan para
          contestarte y se descartan.
        </li>
        <li>
          <strong>Tripo</strong> (tripo3d.ai), si generas tu avatar 3D. Recibe la imagen que tú
          eliges, y devuelve el modelo esculpido. Nada más viaja con ella: ni tu nombre, ni tu
          correo, ni de qué partida sales.
        </li>
        <li>
          <strong>Google</strong>, en tres papeles distintos que conviene no confundir:
          <em>(a)</em> como generador de imágenes —la familia Gemini pinta los fondos de las salas
          a partir de una descripción escrita, sin ningún dato personal dentro—; <em>(b)</em> como
          proveedor de identidad, si eliges «entrar con Google», en cuyo caso Google sabe que has
          entrado aquí y nos confirma tu correo; y <em>(c)</em> como servidor de las tipografías con
          las que se maquetan los dosieres: al abrir uno, tu navegador se las pide a Google y en ese
          momento Google ve tu dirección IP.
        </li>
        <li>
          <strong>Apple</strong>, si eliges «entrar con Apple». Lo mismo que Google en su papel de
          proveedor de identidad. Si usas «Ocultar mi correo», lo que llega aquí es una dirección
          de reenvío de Apple y no la tuya de verdad: funciona igual.
        </li>
        <li>
          <strong>MongoDB Atlas</strong>, la base de datos donde se guarda todo lo descrito arriba.
          El clúster se crea en una región europea.
        </li>
        <li>
          <strong>Amazon Web Services</strong>, donde corre el servidor y donde está el disco en el
          que se guardan las fotografías, los dosieres y los avatares.
        </li>
      </ul>
      <p>
        Ninguno de ellos usa estos datos para lo suyo: son encargados del tratamiento, tratan lo que
        se les manda para prestar su servicio y no para otra cosa. Algunos pueden tratar datos fuera
        del Espacio Económico Europeo; cuando ocurre, se ampara en las cláusulas contractuales tipo
        aprobadas por la Comisión Europea, que es el mecanismo que esos proveedores ofrecen para
        estas transferencias.
      </p>`,
    },
    {
      titulo: 'Cookies',
      cuerpo: `
      <p>
        Hay tres, y las tres son estrictamente necesarias para que la sesión funcione. No hay
        cookies de analítica, ni de publicidad, ni de terceros, ni nada que te siga por otras
        páginas — por eso tampoco verás un cartel pidiéndote permiso: el artículo 22.2 de la LSSI
        exime del consentimiento a las cookies imprescindibles para prestar el servicio, y todas
        estas lo son.
      </p>
      <table>
        <tr><th>Nombre</th><th>Para qué</th><th>Cuánto dura</th></tr>
        <tr>
          <td><code>gm_sesion</code></td>
          <td>Recuerda que has entrado en el taller con la contraseña de la casa.</td>
          <td>30 días</td>
        </tr>
        <tr>
          <td><code>gm_cuenta</code></td>
          <td>Tu sesión de cuenta, si has entrado con Google o con Apple.</td>
          <td>90 días</td>
        </tr>
        <tr>
          <td><code>gm_nonce</code></td>
          <td>
            Un número de un solo uso que viaja contigo a la pantalla de Google y se comprueba al
            volver. Es lo que impide que sirva para entrar aquí un testigo capturado en otro sitio.
          </td>
          <td>5 minutos</td>
        </tr>
      </table>
      <p>
        Las tres son <em>httpOnly</em> —ningún script de la página puede leerlas— y viajan cifradas
        cuando el sitio se sirve por HTTPS. <strong>La app del móvil no usa cookies</strong>: guarda
        su credencial en el almacén seguro del teléfono y desaparece al desinstalarla.
      </p>`,
    },
    {
      titulo: 'Cuánto tiempo se conservan',
      cuerpo: `
      <p>
        Mientras la partida exista. Quien organiza puede borrarla, y al hacerlo desaparece con ella
        todo lo de esa velada: nombres, correos, notas y fotografías.
      </p>
      <p>
        Si aceptaste guardar tu historial, ese perfil se conserva hasta que lo borres tú. Puedes
        hacerlo en cualquier momento desde la propia app, en «Tu perfil» → «Borrar mi cuenta y mis
        datos». Se borra el perfil entero y, además, tu correo se retira de todas las partidas en
        las que estuviera apuntado, para que no vuelva a aparecer.
      </p>`,
    },
    {
      titulo: 'Tus derechos',
      cuerpo: `
      <p>
        Puedes pedir acceso a tus datos, su rectificación, su supresión, la limitación del
        tratamiento, oponerte a él y solicitar su portabilidad. Dos de ellos los puedes ejercer
        directamente desde la app, sin escribir a nadie y sin esperar:
      </p>
      <ul>
        <li><strong>Supresión</strong>: «Tu perfil» → «Borrar mi cuenta y mis datos».</li>
        <li>
          <strong>Oposición a que se guarde nada</strong>: «Tu perfil» → «Dejar de guardar mis
          partidas». Sigues jugando exactamente igual.
        </li>
      </ul>
      <p>
        Para el resto, escribe a <a href="mailto:${correo}">${correo}</a>. Si crees que tus datos
        no se han tratado como debían, puedes reclamar ante la Agencia Española de Protección de
        Datos (<a href="https://www.aepd.es" rel="noopener">aepd.es</a>).
      </p>`,
    },
    {
      titulo: 'Menores',
      cuerpo: `
      <p>
        GameMasters está pensado para personas adultas. Quien organiza la partida es quien decide a
        quién invita y quien introduce sus datos, y por tanto quien debe asegurarse de contar con
        el consentimiento de quien corresponda si en la mesa hay menores de catorce años.
      </p>`,
    },
    {
      titulo: 'Cambios',
      cuerpo: `
      <p>
        Si cambia lo que se trata o cómo, cambia este texto, y con él la fecha de abajo. Los
        cambios que afecten a algo que hayas consentido se te pedirán de nuevo; no se dan por
        supuestos.
      </p>
      <p>
        Las condiciones con las que se usa la plataforma están en los
        <a href="/terminos">términos de uso</a>, y la identificación completa de quien la presta,
        en el <a href="/aviso-legal">aviso legal</a>.
      </p>`,
    },
  ];
}

/**
 * El documento, en HTML autocontenido.
 *
 * Sin hojas de estilo externas, sin tipografías de fuera y sin una sola línea de
 * JavaScript: tiene que abrirse igual desde el navegador de un móvil sin
 * cobertura decente y desde el revisor de una tienda. Y se lee en claro y oscuro
 * porque hay quien la abrirá de noche desde la cama. El armazón está en
 * `plantilla.ts`, compartido con los otros dos documentos.
 */
export function paginaDePrivacidad(): string {
  return documentoLegal({
    titulo: 'Política de privacidad',
    ruta: '/privacidad',
    entradilla: avisoDeDatosPendientes('contacto'),
    secciones: secciones(),
    revisadaEl: REVISADA_EL,
    pie: pieDelResponsable(),
  });
}

const router = crearRouter();

router.get(['/privacidad', '/privacidad.html'], (_req, res) => {
  res.type('html').send(paginaDePrivacidad());
});

export default router;
