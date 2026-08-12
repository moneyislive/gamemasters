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
 * Y UN TERCER CAMINO, que no es una página sino una respuesta para la app:
 * `POST /api/invitacion/abrir`. Es donde el sobre deja de ser decoración y pasa
 * a servir para algo — con mucho cuidado, porque un sobre no es una llave. Está
 * al final del fichero y lleva escrito su propio razonamiento.
 *
 * LO QUE NUNCA SALE DE AQUÍ: nada del misterio. Ni sospechosos, ni pistas, ni
 * quién más está invitado. El título de la velada y poco más.
 */
import { env } from '../config';
import { getStore } from '../db/store';
import { crearRouter } from '../rutas';
import { abrirSobre, cerrarSobre } from '../identidad/sobre';
import { pasaporteVigente, sesionDeCuentaDePeticion } from '../identidad/sesion';
import { invitacionesPara } from '../live/invitaciones';

const router = crearRouter();

/** El esquema propio de la app, para el botón de «ya la tengo». */
const ESQUEMA = 'harkania';

/**
 * El enlace que se le manda a una persona invitada.
 *
 * DURA TREINTA DÍAS, no para siempre: un enlace de invitación acaba en un correo
 * que se reenvía, se archiva y sobrevive a la velada. Que caduque limita el daño
 * de que aparezca años después en la bandeja de alguien.
 *
 * Y NO ES UNA LLAVE, es una señal. El sobre dice a qué velada y a qué silla
 * apunta el enlace, y nada más: quien lo tenga no se sienta por tenerlo. Ver
 * `/api/invitacion/abrir`, al final de este fichero, donde está el razonamiento
 * entero. La carga del sobre va firmada pero NO cifrada —es base64 de un JSON—
 * así que dar por secreto lo que hay dentro sería un error: cualquiera con el
 * enlace puede leer los dos identificadores.
 */
export function enlaceDeInvitacion(gameId: string, suspectId: string): string {
  const sobre = cerrarSobre('enlace:v1', { gameId, suspectId }, 60 * 60 * 24 * 30);
  return `${env.publicOrigin ?? ''}/i/${encodeURIComponent(sobre)}`;
}

/**
 * Escapa para meter texto dentro del HTML sin abrir un agujero.
 *
 * Se exporta para que el correo de invitación —que pinta el mismo título de
 * velada dentro de otro HTML— use ESTA y no una copia suya. Una función de
 * escapado copiada en dos sitios es de las que divergen sin que nadie lo note:
 * la copia se queda sin una de las cuatro sustituciones y no falla nada hasta
 * que alguien llama a su partida `Cena <b>de gala</b>`.
 */
export function escaparHtml(texto: string): string {
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
<title>${escaparHtml(titulo)}</title>
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
       <p class="velada">${escaparHtml(partida.name)}</p>
       <p>Se juega desde el móvil. Instala la aplicación y tu invitación te
          estará esperando dentro.</p>
       ${tiendas()}
       <a class="btn btn--fuerte" href="${escaparHtml(profundo)}">Ya tengo la aplicación</a>`,
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
       <p class="velada">${escaparHtml(codigo)}</p>
       <p>Se juega desde el móvil. Instala la aplicación y este código te
          llevará a tu sitio en la mesa.</p>
       ${tiendas()}
       <a class="btn btn--fuerte" href="${escaparHtml(profundo)}">Ya tengo la aplicación</a>`,
    ),
  );
});

// ---------------------------------------------------------------------------
// El sobre, ya dentro de la app
// ---------------------------------------------------------------------------

/**
 * Abre el sobre de una invitación y dice qué se puede hacer con él.
 *
 * LA PREGUNTA QUE HAY QUE HACERSE ANTES DE LEER NADA MÁS: ¿quién más tiene este
 * enlace? Un correo se reenvía —«mira qué han montado»—, se queda en el
 * portátil de casa, se sincroniza en el móvil viejo que se le regaló a alguien y
 * sobrevive a la velada por años. Así que el sobre lo tiene, potencialmente,
 * cualquiera. De ahí la regla de este fichero:
 *
 *   **EL SOBRE NO AUTORIZA NADA. NI SIQUIERA UN POCO.**
 *
 * Lo único que hace es señalar una silla: dice a qué partida y a qué sospechoso
 * apunta el enlace, que además va escrito en claro dentro del propio sobre.
 * Quien lo presenta no obtiene por ello ninguna credencial de jugador, ni un
 * paso más cerca de tenerla. Para sentarse hacen falta exactamente las mismas
 * dos cosas de siempre, y ninguna de las dos sale de aquí:
 *
 *   · O el código personal, que se teclea en `/api/jugar/entrar`.
 *   · O una cuenta cuyo buzón haya demostrado un proveedor y que figure en esa
 *     silla, que es `/api/cuenta/entrar-en-partida`.
 *
 * ENTONCES, ¿PARA QUÉ SIRVE? Para que el enlace lleve a la pantalla correcta.
 * Sin esto, quien pulsa la invitación aterriza en la portada de la app y tiene
 * que buscarse la vida; con esto, la app sabe a qué velada la han llamado, si
 * esa invitación es de alguno de sus correos y si puede sentarse de un toque o
 * le toca teclear el código. Es navegación, no autorización, y esa distinción es
 * el fichero entero.
 *
 * POR QUÉ NO EMITE AQUÍ LA CREDENCIAL, pudiendo. Se podrían copiar aquí las
 * comprobaciones de `/cuenta/entrar-en-partida` y ahorrarle a la app una
 * llamada. Serían veinte líneas y dos puertas donde hoy hay una: el día que se
 * endurezca una de las tres condiciones —buzón demostrado, fase de sala de
 * espera, silla libre— se endurecería en una sola, y la otra seguiría abierta
 * sin que ninguna comprobación se pusiera en rojo. La revocación de verdad de
 * este juego es el `sid` de la credencial de jugador, y esa sale de un único
 * sitio.
 *
 * EL SOBRE VIAJA EN EL CUERPO, no en la ruta: `POST` y no `GET`. Una invitación
 * completa dentro de una URL acaba en el registro de nginx, en el historial y
 * en la cabecera `Referer` de la primera imagen que cargue la página siguiente.
 */
router.post('/api/invitacion/abrir', async (req, res) => {
  const bruto = typeof req.body?.sobre === 'string' ? req.body.sobre : '';
  const sobre = abrirSobre<{ gameId: string; suspectId: string }>('enlace:v1', bruto);
  if (!sobre) {
    /*
     * 410 y el mismo texto que la página: quien llega aquí es alguien que ha
     * pulsado un enlace de hace más de un mes, y merece saber que llega tarde en
     * vez de pensar que la aplicación está rota. El dominio del sobre es
     * `enlace:v1`, así que un pasaporte de cuenta o una credencial de jugador
     * presentados aquí caen por este mismo camino: no se pueden abrir.
     */
    res.status(410).json({
      error:
        'Esta invitación ya no vale. Los enlaces caducan al cabo de un mes: pídele uno nuevo a ' +
        'quien organiza la velada, o entra con tu código de partida.',
    });
    return;
  }

  const store = getStore();
  const partida = await store.getGame(sobre.gameId);
  if (!partida) {
    res.status(410).json({ error: 'Esta velada ya no está. Quien la organizaba la ha retirado.' });
    return;
  }

  /*
   * El título se cuenta SIEMPRE, incluso sin sesión, y no es un descuido: la
   * página de aterrizaje ya se lo enseña a cualquiera que abra el enlace en el
   * navegador. Callarlo aquí no escondería nada y dejaría a la app sin poder
   * pintar la pantalla. Lo que no se cuenta sin sesión es a QUIÉN esperan: el
   * nombre de la persona invitada sale más abajo, y solo si la cuenta que
   * pregunta es la suya.
   */
  const titulo = partida.name;

  const pasaporte = sesionDeCuentaDePeticion(req);
  if (!pasaporte) {
    res.json({
      titulo,
      requiereCuenta: true,
      /*
       * No es un 401 a propósito. Que no haya sesión no es un error: es el caso
       * normal la primera vez que alguien instala la aplicación, que es
       * exactamente cuando se abre este enlace. Un 401 obligaría a la app a
       * tratar como fallo lo que es el camino esperado.
       */
    });
    return;
  }

  const cuenta = await store.getAccount(pasaporte.cuentaId);
  if (!cuenta || !pasaporteVigente(pasaporte, cuenta)) {
    res.status(401).json({ error: 'Esta sesión ya no vale. Vuelve a entrar.' });
    return;
  }

  /*
   * SE PREGUNTA POR LAS INVITACIONES DE LA CUENTA, y luego se busca entre ellas
   * la que señala el sobre. El orden importa y es el corazón del asunto: si se
   * hiciera al revés —tomar la silla del sobre y comprobar «a ver si es tuya»—
   * el sobre estaría eligiendo, y bastaría con un reenvío para preguntar por la
   * silla de otra persona. Así, el sobre solo puede señalar dentro de lo que
   * esa cuenta ya tenía; para todo lo demás, no existe.
   */
  const invitacion = (await invitacionesPara(cuenta)).find(
    (i) => i.gameId === sobre.gameId && i.suspectId === sobre.suspectId,
  );

  if (!invitacion) {
    res.json({
      titulo,
      requiereCuenta: false,
      /*
       * Es el caso del reenvío, y también el de la errata de quien organiza. No
       * se dice «esta invitación es de fulano»: se dice que no es de ninguno de
       * TUS correos, que es lo único que quien pregunta tiene derecho a saber, y
       * se le ofrece el camino de siempre.
       */
      motivo:
        'Esta invitación no va a ninguno de los correos de tu cuenta. Si la velada es tuya, entra ' +
        'con el código personal que te haya dado quien la organiza.',
    });
    return;
  }

  res.json({
    titulo,
    requiereCuenta: false,
    invitacion: {
      gameId: invitacion.gameId,
      suspectId: invitacion.suspectId,
      personaje: invitacion.personaje,
      paraEl: invitacion.paraEl,
      fase: invitacion.fase,
      yaDentro: invitacion.yaDentro,
      /*
       * `directa` es una PREVISIÓN para pintar el botón, no un permiso. Quien
       * manda es `/api/cuenta/entrar-en-partida`, que lo vuelve a comprobar todo
       * en el momento de repartir la credencial — y con razón: entre esta
       * respuesta y aquella llamada, la partida puede haber empezado o alguien
       * puede haberse sentado ya en esa silla.
       */
      directa: invitacion.directa,
    },
  });
});

export default router;
