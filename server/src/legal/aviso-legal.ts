/**
 * El aviso legal: quién hay detrás de harkania.com.
 *
 * QUÉ LO EXIGE. El artículo 10 de la LSSI obliga a todo sitio que preste un
 * servicio de la sociedad de la información a publicar, de forma permanente,
 * fácil, directa y gratuita, quién lo presta: nombre o razón social, domicilio,
 * correo electrónico y NIF. No es un trámite decorativo — es lo que permite a
 * quien tiene un problema saber a quién reclamar, y su ausencia es una
 * infracción leve que se sanciona con hasta treinta mil euros.
 *
 * Y hay una razón práctica que llega antes que la sanción: las dos tiendas y las
 * pasarelas de pago piden una identificación del titular que coincida con la de
 * la cuenta de desarrollador. Sin esta página, la revisión se para.
 *
 * QUÉ NO ES. No es la política de privacidad —eso es `privacidad.ts`, y responde
 * a otra ley— ni los términos de uso —eso es `terminos.ts`, y es el contrato con
 * quien juega—. Se enlazan entre sí desde la cabecera y cada uno se ocupa de lo
 * suyo; meterlos en un solo documento es la manera segura de que nadie encuentre
 * nada.
 *
 * VA POR DELANTE DEL GUARDIÁN DE LA CONTRASEÑA, igual que la privacidad. Un
 * aviso legal que solo puede leer quien ya tiene las credenciales de la casa no
 * identifica al prestador ante nadie: precisamente identifica al prestador ante
 * quien todavía no ha entrado.
 */
import { crearRouter } from '../rutas';
import { documentoLegal } from './plantilla';
import type { SeccionLegal } from './plantilla';
import { avisoDeDatosPendientes, fichaDelResponsable, pieDelResponsable } from './responsable';

/** Última revisión del texto. Se enseña al final del documento. */
export const REVISADO_EL = '2026-08-12';

function secciones(): SeccionLegal[] {
  return [
    {
      titulo: 'Quién presta este servicio',
      cuerpo: `
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la
        información y de comercio electrónico, estos son los datos identificativos del titular
        de <strong>harkania.com</strong> y de la plataforma GameMasters:
      </p>
      ${fichaDelResponsable()}`,
    },
    {
      titulo: 'Qué es esto',
      cuerpo: `
      <p>
        GameMasters es una plataforma para organizar y jugar misterios en la vida real. Tiene dos
        piezas: el <em>taller</em>, donde quien organiza prepara la velada desde un ordenador, y la
        <em>app</em>, que usan quienes juegan desde su móvil. El acceso al taller está restringido
        a las personas autorizadas por el titular; la app la usa quien recibe una invitación o un
        código de partida.
      </p>
      <p>
        Las condiciones que rigen ese uso están en los
        <a href="/terminos">términos de uso</a>, y lo que se hace con los datos personales, en la
        <a href="/privacidad">política de privacidad</a>. Usar el sitio supone aceptar ambos.
      </p>`,
    },
    {
      titulo: 'Propiedad intelectual',
      cuerpo: `
      <p>
        El código, el diseño, los textos, la identidad visual y el resto de elementos de la
        plataforma pertenecen a su titular o se usan con licencia. No se autoriza su reproducción,
        distribución ni transformación fuera de lo que permite la ley.
      </p>
      <p>
        <strong>Lo que tú creas es tuyo.</strong> El material de tus partidas —los nombres que
        escribes, las descripciones de los personajes, las fotografías que subes, las tramas que se
        generan para tu velada— no pasa a ser del titular por estar alojado aquí. Se trata según la
        <a href="/privacidad">política de privacidad</a> y se borra cuando borras la partida.
      </p>
      <p>
        <strong>CLUEDO</strong> es una marca registrada de sus respectivos titulares, ajenos a esta
        plataforma. Aquí se usa únicamente para describir la clase de juego que se organiza; no hay
        vínculo, patrocinio ni autorización de ellos, ni se pretende darlo a entender.
      </p>`,
    },
    {
      titulo: 'Responsabilidad',
      cuerpo: `
      <p>
        El titular pone los medios razonables para que la plataforma funcione y esté disponible,
        pero no puede garantizar que no haya interrupciones, errores ni pérdidas de datos derivadas
        de fallos ajenos —la red, el proveedor de alojamiento, los servicios de terceros que se
        describen en la política de privacidad—.
      </p>
      <p>
        <strong>Parte del contenido lo escribe un modelo de inteligencia artificial</strong>: la
        trama del misterio, los dosieres y las respuestas del Mayordomo. Se genera automáticamente,
        puede contener errores o resultar inapropiado, y no debe tomarse por información veraz
        sobre personas reales ni por consejo de ninguna clase. Cualquier respuesta se puede
        denunciar desde la propia app, y quien organiza la partida la revisa.
      </p>
      <p>
        Quien organiza una partida es responsable del material que introduce y de las personas a
        las que invita, incluido contar con su permiso para usar sus nombres, sus correos y sus
        fotografías.
      </p>`,
    },
    {
      titulo: 'Enlaces a otros sitios',
      cuerpo: `
      <p>
        Algunas páginas enlazan a sitios ajenos —las tiendas de aplicaciones, la Agencia Española
        de Protección de Datos, los proveedores de identidad—. El titular no controla su contenido
        ni responde de él; el enlace no implica ninguna relación con ellos.
      </p>`,
    },
    {
      titulo: 'Ley aplicable',
      cuerpo: `
      <p>
        Estas condiciones se rigen por la ley española. Para cualquier controversia, y cuando la
        normativa de consumo no imponga otro fuero, las partes se someten a los juzgados y
        tribunales del domicilio del titular.
      </p>
      <p>
        Si quieres plantear una reclamación, escribe primero al correo de contacto de arriba: casi
        todo se arregla antes y mejor por ahí.
      </p>`,
    },
  ];
}

/** El aviso legal, en HTML autocontenido. */
export function paginaDeAvisoLegal(): string {
  return documentoLegal({
    titulo: 'Aviso legal',
    ruta: '/aviso-legal',
    entradilla: avisoDeDatosPendientes(),
    secciones: secciones(),
    revisadaEl: REVISADO_EL,
    pie: pieDelResponsable(),
  });
}

const router = crearRouter();

/*
 * Con y sin `.html`. La dirección que se pega en la consola de una tienda, en un
 * correo o en la ficha de la app la escribe una persona de memoria, y media
 * humanidad escribe la extensión. Que una de las dos formas dé 404 —o peor, que
 * el comodín del taller devuelva su portada con un 200— es un fallo caro para lo
 * poco que cuesta evitarlo.
 */
router.get(['/aviso-legal', '/aviso-legal.html'], (_req, res) => {
  res.type('html').send(paginaDeAvisoLegal());
});

export default router;
