/**
 * Los tres documentos públicos, en un solo router.
 *
 * POR QUÉ AGRUPARLOS. Cada documento trae el suyo, así que montarlos habría
 * sido escribir tres líneas en `index.ts` en vez de una. La diferencia está en
 * lo que pasa con el CUARTO: el día que haga falta una página de cookies aparte,
 * o unas condiciones de compra, quien la escriba la añade aquí y aparece
 * publicada sin tocar el arranque del servidor. Un documento legal escrito y no
 * montado es exactamente el fallo que no se ve, porque el fichero está en el
 * repositorio y todo el mundo da por hecho que se sirve.
 *
 * DÓNDE VA MONTADO, Y ESTO NO ES NEGOCIABLE: por DELANTE del guardián de la
 * contraseña, junto a los ficheros de `.well-known` y a las páginas de
 * aterrizaje. Las tiendas exigen leer la política de privacidad y los términos
 * SIN instalar nada y sin credenciales, y la LSSI exige que el aviso legal sea
 * de acceso permanente, fácil, directo y gratuito. Detrás de la contraseña, los
 * tres son papel mojado.
 *
 * LO QUE NO ARRASTRA CONSIGO. Montar algo delante del guardián es abrir un hueco
 * en la única puerta que hay, así que este router no monta nada que no sean
 * estas rutas: no toca `/api`, no lee la partida, no consulta el almacén, no
 * mira quién llama y no reparte ninguna cookie. Sirve tres cadenas de texto.
 * `verify:legal` comprueba, en el mismo servidor que acaba de servirlas, que
 * `/api/games` sigue respondiendo 401 y que las fotos de los invitados siguen
 * cerradas.
 */
import { crearRouter } from '../rutas';
import avisoLegalRouter from './aviso-legal';
import privacidadRouter from './privacidad';
import terminosRouter from './terminos';

const router = crearRouter();

router.use(privacidadRouter);
router.use(avisoLegalRouter);
router.use(terminosRouter);

export default router;
