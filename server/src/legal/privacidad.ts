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
 */

/** Última revisión del texto. Se enseña al final del documento. */
export const REVISADA_EL = '2026-08-10';

const RESPONSABLE = 'Miguel Peidro Paredes';
const CORREO = 'miguelpeidroparedes@gmail.com';

const SECCIONES: Array<{ titulo: string; cuerpo: string }> = [
  {
    titulo: 'Quién trata tus datos',
    cuerpo: `
      <p>
        El responsable del tratamiento es <strong>${RESPONSABLE}</strong>, y puedes escribirle a
        <a href="mailto:${CORREO}">${CORREO}</a> para cualquier cosa relacionada con tus datos,
        incluidas las peticiones de acceso y de borrado.
      </p>
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
      códigos que reparte quien organiza; la app no tiene acceso a tu cámara, ni a tu micrófono, ni
      a tus contactos, ni a tu ubicación.</p>

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
          <strong>Revisar una respuesta denunciada</strong>: cumplimiento de la obligación que
          imponen las tiendas de aplicaciones a los productos que generan contenido con
          inteligencia artificial.
        </li>
      </ul>`,
  },
  {
    titulo: 'Quién más los ve',
    cuerpo: `
      <p>Solo dos proveedores, y cada uno para una cosa concreta:</p>
      <ul>
        <li>
          <strong>Anthropic</strong> (el modelo de lenguaje que escribe la trama y que da vida al
          Mayordomo). Recibe el material del juego —incluido el nombre con el que quien organiza
          te haya apuntado— y, cuando le preguntas algo al Mayordomo, tu pregunta junto con la
          ficha de tu propio personaje. <strong>No recibe correos electrónicos</strong>, ni las
          notas de tu cuaderno, ni las de nadie más. Tus conversaciones con el Mayordomo no se
          guardan en ningún sitio: se usan para contestarte y se descartan.
        </li>
        <li>
          <strong>El proveedor de alojamiento y de base de datos</strong> donde corre el servidor,
          que almacena lo descrito arriba.
        </li>
      </ul>
      <p>
        Ambos pueden tratar datos fuera del Espacio Económico Europeo. Cuando ocurre, se ampara en
        las cláusulas contractuales tipo aprobadas por la Comisión Europea, que es el mecanismo que
        esos proveedores ofrecen para estas transferencias.
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
        Para el resto, escribe a <a href="mailto:${CORREO}">${CORREO}</a>. Si crees que tus datos
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
      </p>`,
  },
];

/**
 * El documento, en HTML autocontenido.
 *
 * Sin hojas de estilo externas, sin tipografías de fuera y sin una sola línea de
 * JavaScript: tiene que abrirse igual desde el navegador de un móvil sin
 * cobertura decente y desde el revisor de una tienda. Y se lee en claro y oscuro
 * porque hay quien la abrirá de noche desde la cama.
 */
export function paginaDePrivacidad(): string {
  const cuerpo = SECCIONES.map(
    (s) => `<section><h2>${s.titulo}</h2>${s.cuerpo}</section>`,
  ).join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacidad · GameMasters</title>
<style>
  :root {
    color-scheme: light dark;
    --tinta: #1f120c;
    --papel: #f4efe2;
    --oro: #8a6a17;
    --tenue: #5d5145;
  }
  @media (prefers-color-scheme: dark) {
    :root { --tinta: #ece3cf; --papel: #0b1710; --oro: #c9a227; --tenue: #a09781; }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2.5rem 1.25rem 4rem;
    background: var(--papel);
    color: var(--tinta);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.05rem;
    line-height: 1.65;
  }
  main { max-width: 40rem; margin: 0 auto; }
  h1 {
    font-size: 1.9rem;
    line-height: 1.2;
    margin: 0 0 .25rem;
    letter-spacing: .01em;
  }
  .sello {
    text-transform: uppercase;
    letter-spacing: .18em;
    font-size: .72rem;
    color: var(--oro);
    margin: 0 0 2.5rem;
  }
  h2 {
    font-size: 1.15rem;
    margin: 2.5rem 0 .5rem;
    padding-top: 1.5rem;
    border-top: 1px solid color-mix(in srgb, var(--oro) 35%, transparent);
  }
  section:first-of-type h2 { border-top: 0; padding-top: 0; margin-top: 1.5rem; }
  p, li { margin: .7rem 0; }
  ul { padding-left: 1.15rem; }
  a { color: var(--oro); }
  footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid color-mix(in srgb, var(--oro) 35%, transparent);
    color: var(--tenue);
    font-size: .9rem;
  }
</style>
</head>
<body>
<main>
  <h1>Política de privacidad</h1>
  <p class="sello">GameMasters</p>
  ${cuerpo}
  <footer>
    <p>Última revisión: ${REVISADA_EL}. Responsable: ${RESPONSABLE} · <a href="mailto:${CORREO}">${CORREO}</a></p>
  </footer>
</main>
</body>
</html>`;
}
