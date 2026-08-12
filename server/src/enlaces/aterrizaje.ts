/**
 * Dónde cae quien pulsa un enlace de invitación.
 *
 * EL CASO QUE JUSTIFICA ESTE FICHERO NO ES EL BUENO. Cuando la aplicación está
 * instalada, estas páginas **no se ven nunca**: el sistema operativo intercepta
 * la dirección y abre la app directamente — para eso están los ficheros de
 * `well-known.ts`. Esto es lo que pasa cuando NO está instalada, que es la
 * primera vez de toda persona invitada y, por tanto, la primera impresión de la
 * plataforma entera.
 *
 * Sin esto, ese enlace cae en el comodín del taller y quien lo pulsa se
 * encuentra la portada de una herramienta que no es para él, sin ninguna
 * relación visible con la cena a la que le han invitado.
 *
 * DOS CAMINOS, Y NO SON EL MISMO:
 *
 *   · `/i/<sobre>` — la invitación nominal. El sobre va firmado por el
 *     servidor, así que la página puede decir a qué velada es sin preguntar
 *     nada. Es el camino de quien recibe un correo.
 *   · `/e/<código>` — el código de partida de toda la vida, para quien no tiene
 *     cuenta ni correo apuntado. **Aquí no se consulta nada**: un código lo
 *     puede teclear cualquiera en la barra de direcciones, y si esta página
 *     dijera «existe» o «no existe» sería un oráculo para adivinarlos a base de
 *     probar. Se limita a ofrecer la app con el código ya puesto.
 *
 * LO QUE NUNCA SALE DE AQUÍ: nada del misterio. Ni sospechosos, ni pistas, ni
 * quién más está invitado. El título de la velada y poco más.
 */
import { env } from '../config';
import { getStore } from '../db/store';
import { crearRouter } from '../rutas';
import { abrirSobre, cerrarSobre } from '../identidad/sobre';

const router = crearRouter();

/** El esquema propio de la app, para el botón de «ya la tengo». */
const ESQUEMA = 'gamemasters';

/**
 * El enlace que se le manda a una persona invitada.
 *
 * DURA TREINTA DÍAS, no para siempre: un enlace de invitación acaba en un correo
 * que se reenvía, se archiva y sobrevive a la velada. Que caduque limita el daño
 * de que aparezca años después en la bandeja de alguien.
 */
export function enlaceDeInvitacion(gameId: string, suspectId: string): string {
  const sobre = cerrarSobre('enlace:v1', { gameId, suspectId }, 60 * 60 * 24 * 30);
  return `${env.publicOrigin ?? ''}/i/${encodeURIComponent(sobre)}`;
}

/** Escapa para meter texto dentro del HTML sin abrir un agujero. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * El armazón de las dos páginas.
 *
 * SIN NADA DE FUERA: ni tipografías, ni hojas de estilo, ni imágenes remotas.
 * Esta página la abre alguien en el móvil, de camino a una cena, probablemente
 * con mala cobertura y con prisa. Una tipografía que tarda en llegar deja el
 * texto invisible justo en ese momento.
 */
function pagina(titulo: string, cuerpo: string): string {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(titulo)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    display: grid; place-items: center; padding: 1.5rem;
    background: radial-gradient(circle at 50% 0%, #14301f 0%, #0b1710 60%);
    color: #f0e6cd;
    font-family: Georgia, 'Times New Roman', serif;
    line-height: 1.6;
  }
  main { max-width: 26rem; width: 100%; text-align: center; }
  .sello { font-size: 2.4rem; line-height: 1; margin-bottom: 1rem; opacity: .85; }
  h1 { font-size: 1.6rem; margin: 0 0 .4rem; color: #e8cf7f; text-wrap: balance; }
  .velada {
    font-size: 1.15rem; font-style: italic; color: #f0e6cd;
    margin: 0 0 1.6rem; text-wrap: balance;
  }
  p { margin: 0 0 1.2rem; opacity: .82; font-size: .96rem; }
  .btn {
    display: block; width: 100%; padding: .85rem 1rem; margin-bottom: .7rem;
    border: 1px solid rgba(232,207,127,.45); border-radius: 4px;
    background: rgba(232,207,127,.08); color: #e8cf7f;
    font: inherit; font-size: 1rem; text-decoration: none;
    letter-spacing: .04em;
  }
  .btn--fuerte { background: #e8cf7f; color: #0b1710; border-color: #e8cf7f; font-weight: 700; }
  .filete { border: 0; height: 1px; margin: 1.6rem 0 1.2rem;
    background: linear-gradient(90deg, transparent, rgba(232,207,127,.3), transparent); }
  .menudo { font-size: .8rem; opacity: .6; }
  a.menudo { color: inherit; }
</style>
</head><body><main>
${cuerpo}
<hr class="filete">
<p class="menudo"><a class="menudo" href="/privacidad">Cómo tratamos tus datos</a></p>
</main></body></html>`;
}

/** Los dos botones de tienda, iguales en las dos páginas. */
function tiendas(): string {
  return `
<a class="btn" href="https://apps.apple.com/app/id0000000000">Descargar para iPhone</a>
<a class="btn" href="https://play.google.com/store/apps/details?id=com.harkania.jugar">Descargar para Android</a>`;
}

/**
 * La invitación nominal.
 *
 * Si la app está instalada, esto no llega a verse: el sistema abre la app. Lo
 * que se sirve aquí es para el móvil que todavía no la tiene.
 */
router.get('/i/:sobre', async (req, res) => {
  const sobre = abrirSobre<{ gameId: string; suspectId: string }>('enlace:v1', req.params.sobre);
  if (!sobre) {
    /*
     * 410 y no 404: «esto existió y ya no vale» es una información distinta de
     * «esto nunca existió», y para quien está delante es la diferencia entre
     * pensar que se ha equivocado de enlace y saber que llega tarde.
     */
    res.status(410).type('html').send(
      pagina(
        'Esta invitación ha caducado',
        `<div class="sello">🕯</div>
         <h1>Esta invitación ya no vale</h1>
         <p>Los enlaces de invitación caducan al cabo de un mes. Pídele a quien
            organiza la velada que te mande uno nuevo, o entra con el código de
            partida si ya lo tienes.</p>`,
      ),
    );
    return;
  }

  const partida = await getStore().getGame(sobre.gameId);
  if (!partida) {
    res.status(410).type('html').send(
      pagina(
        'Esta velada ya no está',
        `<div class="sello">🕯</div>
         <h1>Esta velada ya no está</h1>
         <p>Quien la organizaba la ha retirado. Si crees que es un error,
            pregúntale directamente.</p>`,
      ),
    );
    return;
  }

  /*
   * El nombre del personaje NO se dice aquí, y es deliberado: esta página la ve
   * cualquiera a quien le reenvíen el correo, y saber qué papel le ha tocado a
   * cada cual es parte del juego. Dentro de la app, ya identificada, sí.
   */
  const profundo = `${ESQUEMA}://i/${encodeURIComponent(req.params.sobre)}`;
  res.type('html').send(
    pagina(
      `Te esperan en ${partida.name}`,
      `<div class="sello">✉</div>
       <h1>Te han invitado a una velada</h1>
       <p class="velada">${escapar(partida.name)}</p>
       <p>Se juega desde el móvil. Instala la aplicación y tu invitación te
          estará esperando dentro.</p>
       ${tiendas()}
       <a class="btn btn--fuerte" href="${escapar(profundo)}">Ya tengo la aplicación</a>`,
    ),
  );
});

/**
 * El código de partida, para quien juega sin cuenta.
 *
 * NO SE CONSULTA NADA, y no es pereza. Un código de partida se puede teclear en
 * la barra de direcciones, y si esta página distinguiera entre uno válido y uno
 * inventado se convertiría en un oráculo: probando códigos se averigua cuáles
 * existen sin dejar rastro en ningún sitio que vigile intentos. Se ofrece la
 * app con el código puesto y que sea el servidor de juego, que sí cuenta los
 * intentos, quien diga si vale.
 */
router.get('/e/:codigo', (req, res) => {
  const codigo = String(req.params.codigo).slice(0, 24).replace(/[^A-Za-z0-9-]/g, '');
  const profundo = `${ESQUEMA}://e/${encodeURIComponent(codigo)}`;
  res.type('html').send(
    pagina(
      'Entrar en una velada',
      `<div class="sello">🔑</div>
       <h1>Entrar en la velada</h1>
       <p class="velada">${escapar(codigo)}</p>
       <p>Se juega desde el móvil. Instala la aplicación y este código te
          llevará a tu sitio en la mesa.</p>
       ${tiendas()}
       <a class="btn btn--fuerte" href="${escapar(profundo)}">Ya tengo la aplicación</a>`,
    ),
  );
});

export default router;
