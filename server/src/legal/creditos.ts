/**
 * LOS CRÉDITOS DEL MATERIAL DE ARTE. El cuarto documento público.
 *
 * ═══ POR QUÉ ES UNA PÁGINA Y NO UNA LÍNEA EN UN FICHERO DEL REPOSITORIO ═══
 *
 * Porque una de las licencias lo EXIGE y las demás no. Los cinco packs de Kay Lousberg con los
 * que está hecho el tablero son **CC0** —dominio público: se pueden usar sin citar a nadie, y se
 * cita igual porque es de justicia—. El reloj de arena de la barra es **CC-BY-4.0**, y eso es
 * otra cosa: permite el uso comercial y a cambio obliga a acreditar al autor **allá donde se
 * comparta la obra**. Un `license.txt` dentro de una carpeta que ni siquiera va a git no es
 * «donde se comparte la obra»: donde se comparte es aquí, en el servidor que sirve el modelo.
 *
 * ═══ POR QUÉ VA CON LOS OTROS TRES Y NO EN UN RINCÓN DE LA APLICACIÓN ═══
 *
 * La cabecera de `documentos.ts` lo dejó escrito antes de que existiera este fichero: los
 * documentos van agrupados «el día que haga falta una página de cookies aparte, o unas
 * condiciones de compra». Éste es ese cuarto. Y montado por DELANTE del guardián de la
 * contraseña, como los otros: una atribución que hay que autenticarse para leer no acredita a
 * nadie.
 *
 * ═══ Y LO QUE LO SUJETA ═══
 *
 * `verify:legal` comprueba que si `escenas/modelos/reloj.glb` está en el árbol, esta página
 * nombra a su autor y su licencia. Sin eso, la atribución se pierde el día que alguien mueva un
 * fichero, y un incumplimiento de licencia no avisa: no hay pantalla roja, no hay excepción, no
 * hay nada. Sólo un día una carta.
 */
import { crearRouter } from '../rutas';
import { documentoLegal, escaparHtml } from './plantilla';
import { pieDelResponsable } from './responsable';

/**
 * UNA OBRA DE TERCEROS, con lo que su licencia obliga a decir.
 *
 * `credito` es la frase EXACTA que pide la licencia cuando pide una. No se compone a partir de
 * los otros campos: CC-BY dice «copy paste this credit», y recomponerla es exactamente cómo se
 * pierde una palabra sin que nadie lo note.
 */
interface ObraDeTerceros {
  readonly que: string;
  readonly autor: string;
  readonly licencia: string;
  readonly licenciaUrl: string;
  readonly fuente: string;
  readonly obliga: boolean;
  readonly credito: string;
}

export const MATERIAL_DE_ARTE: readonly ObraDeTerceros[] = [
  {
    que: 'El reloj de arena de la mesa de Riberas',
    autor: 'arloopa',
    licencia: 'CC-BY-4.0',
    licenciaUrl: 'http://creativecommons.org/licenses/by/4.0/',
    fuente:
      'https://sketchfab.com/3d-models/hourglass-sand-clock-86fb4b7dc8444a33b7bde4ad1adc535e',
    obliga: true,
    credito:
      'This work is based on "Hourglass / Sand Clock" ' +
      '(https://sketchfab.com/3d-models/hourglass-sand-clock-86fb4b7dc8444a33b7bde4ad1adc535e) ' +
      'by arloopa (https://sketchfab.com/arloopa) licensed under CC-BY-4.0 ' +
      '(http://creativecommons.org/licenses/by/4.0/)',
  },
  {
    que: 'El tablero, las piezas, los dados y los aventureros',
    autor: 'Kay Lousberg',
    licencia: 'CC0',
    licenciaUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    fuente: 'https://kaylousberg.com',
    obliga: false,
    credito: '',
  },
];

function filaDeObra(obra: ObraDeTerceros): string {
  const enlace = (url: string, texto: string): string =>
    `<a href="${escaparHtml(url)}" rel="noopener noreferrer" target="_blank">${escaparHtml(texto)}</a>`;
  const exige = obra.obliga
    ? '<p><strong>Su licencia obliga a acreditar al autor.</strong> El crédito, tal como la licencia pide que se copie:</p>' +
      `<blockquote><p>${escaparHtml(obra.credito)}</p></blockquote>`
    : '<p>Dominio público: citar no es obligatorio, y se cita igual.</p>';
  return (
    `<section><h2>${escaparHtml(obra.que)}</h2>` +
    `<p>De ${escaparHtml(obra.autor)}, con licencia ${enlace(obra.licenciaUrl, obra.licencia)}. ` +
    `Origen: ${enlace(obra.fuente, obra.fuente)}.</p>` +
    exige +
    '</section>'
  );
}

export function paginaDeCreditos(): string {
  return documentoLegal({
    titulo: 'Créditos del material de arte',
    ruta: '/creditos',
    revisadaEl: '8 de septiembre de 2026',
    entradilla:
      '<p>Lo que se ve en las mesas de esta plataforma está hecho con material de terceros. ' +
      'Esta página dice de quién es cada cosa y bajo qué licencia se usa. Una de ellas obliga ' +
      'a acreditar a su autor, y por eso esta página es pública y no hace falta entrar para ' +
      'leerla.</p>',
    secciones: MATERIAL_DE_ARTE.map((obra) => ({
      titulo: '',
      cuerpo: filaDeObra(obra),
    })),
    pie: pieDelResponsable(),
  });
}

const router = crearRouter();

/*
 * Las tres formas razonables de escribirlo, como los otros documentos y por la misma razón: la
 * alternativa a un alias no es un 404 honesto, es el comodín del taller devolviendo su portada
 * con un 200 y una atribución que parece publicada y no lo está.
 */
router.get(['/creditos', '/creditos.html', '/creditos-del-arte'], (_req, res) => {
  res.type('html').send(paginaDeCreditos());
});

export default router;
