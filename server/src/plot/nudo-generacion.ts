/**
 * La generación de la trama de El Nudo de Valdehierro.
 *
 * ═══ EL ORDEN DE LAS COSAS, QUE ES LO QUE IMPIDE QUE LA NOCHE SALGA ROTA ═══
 *
 *   1. `cimientosDelNudo` compone con CÓDIGO una partida completa y jugable: el
 *      cuadro de marchas, los telegramas ya redactados, el reparto, los oficios
 *      y las cargas. Y comprueba las cuatro garantías antes de devolver nada.
 *   2. Se le pide al modelo el SABOR: cómo se llama la noche, qué le pasa a
 *      cada cual, qué se lee al abrir cada franja y qué hay escrito en la hoja
 *      de porte de cada convoy. Nunca la lógica.
 *   3. Lo que devuelve se acepta CAMPO A CAMPO y solo si es utilizable. Un
 *      campo que falte se queda con el de la plantilla.
 *
 * Léase al revés: si la llamada falla, si el JSON viene truncado o si el modelo
 * se inventa la mitad de los ids, **la partida sigue siendo jugable y el cuadro
 * sigue teniendo una sola solución**. La IA es una capa de mejora sobre algo que
 * ya funciona, no un eslabón del que dependa la noche.
 *
 * Es lo contrario de CLUEDO, donde el modelo decide quién mató a quién. Allí
 * puede: cualquier asignación de culpable, arma y sala es una partida válida.
 * Aquí no — la inmensa mayoría de los conjuntos de telegramas que se pueden
 * escribir sobre seis convoyes no determinan un cuadro único, y elegir bien no
 * es cuestión de talento narrativo.
 *
 * ═══ POR QUÉ NO SE LLAMA `generarTramaNudo` ═══
 *
 * Porque ese nombre ya es el de la trama SIN modelo, en `juegos/nudo-trama.ts`.
 * En El Misterio de la Momia las dos se llaman igual en módulos distintos y se
 * lee fatal. Esta se llama `escribirTramaNudo`, que además es lo que hace:
 * escribir encima de algo que ya está montado.
 */
import { DEMO_MODE } from '../config';
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { registrarGenerador } from '../juegos/generadores';
import { emisorDeProgreso } from '../live/proyeccion';
import { apuntarUso } from '../gasto/contador';
import { entidadesDe } from '../../../shared/juegos';
import { generarTramaNudo, tramaDe } from '../juegos/nudo-trama';
import { NUDO_TRAMA_SCHEMA, SISTEMA_NUDO, construirPromptNudo } from './nudo-prompt';
import type { RespuestaNudo } from './nudo-prompt';
import type { GameSession, GenerateStreamEvent, Plot } from '../../../shared/types';

type Emitir = (evento: GenerateStreamEvent) => void;

/**
 * Le pide el sabor al modelo. UNA sola llamada.
 *
 * Sin reintento, y a diferencia de El Paso de las Sombras eso es lo correcto
 * aquí: allí el modelo redacta los hitos, que son la mitad del rompecabezas, y
 * una redacción coja deja la noche sin pistas legibles. Aquí lo que escribe es
 * ambientación: si viene a medias, se rellena con la plantilla y la partida no
 * pierde ni una regla. Pagar una segunda llamada de cuatro minutos por más
 * color no lo vale.
 */
async function unaTirada(
  client: NonNullable<ReturnType<typeof getAnthropicClient>>,
  model: Awaited<ReturnType<typeof resolveModel>>,
  game: GameSession,
  base: Plot,
  emit: Emitir,
): Promise<RespuestaNudo> {
  const stream = client.messages.stream({
    model,
    max_tokens: 64000,
    system: [{ type: 'text', text: SISTEMA_NUDO, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: NUDO_TRAMA_SCHEMA } },
    messages: [{ role: 'user', content: construirPromptNudo(game, base) }],
  });

  /*
   * A ciegas van puntos y no el crudo del modelo. Aquí el crudo no lleva la
   * solución —el cuadro no se le manda— pero sí lleva los secretos de las doce
   * personas, y el taller lo pinta a pantalla completa durante siete minutos.
   */
  stream.on('text', emisorDeProgreso(game, emit));
  const mensaje = await stream.finalMessage();
  apuntarUso({ concepto: 'trama', model, usage: mensaje.usage, gameId: game.id });

  if (mensaje.stop_reason === 'refusal') {
    throw new Error(
      'El modelo declinó escribir esta noche. Revisa las descripciones introducidas e inténtalo de nuevo.',
    );
  }
  if (mensaje.stop_reason === 'max_tokens') {
    throw new Error(
      'La trama superó el límite de tokens y quedó incompleta. Reduce la cantidad de datos e inténtalo de nuevo.',
    );
  }

  let texto = '';
  for (const bloque of mensaje.content) {
    if (bloque.type === 'text') texto += bloque.text;
  }
  try {
    return JSON.parse(texto) as RespuestaNudo;
  } catch {
    throw new Error('La respuesta del modelo no es un JSON válido. Vuelve a intentar la generación.');
  }
}

/**
 * Cose el sabor sobre la trama de plantilla, CAMPO A CAMPO.
 *
 * ═══ POR QUÉ NO SE HACE UN `{...base, ...respuesta}` ═══
 *
 * Porque eso deja que el modelo sobreescriba `solution` y `delJuego`, que son
 * el cuadro verdadero y el rompecabezas. No los pide el esquema y no los va a
 * mandar; pero «no los va a mandar» no es una garantía, y aquí la garantía es
 * barata: se nombran los campos que sí se aceptan y se acabó.
 *
 * Y cada uno se acepta solo si viene utilizable. Un `synopsis` vacío no
 * sustituye al de la plantilla: deja la partida peor de lo que estaba.
 */
function coser(base: Plot, respuesta: RespuestaNudo): Plot {
  const util = (s: unknown, minimo = 12): string | undefined =>
    typeof s === 'string' && s.trim().length >= minimo ? s.trim() : undefined;

  const plot: Plot = {
    ...base,
    title: util(respuesta.titulo, 4) ?? base.title,
    tagline: util(respuesta.lema) ?? base.tagline,
    synopsis: util(respuesta.sinopsis, 80) ?? base.synopsis,
    setting: util(respuesta.ambientacion, 40) ?? base.setting,
  };

  /*
   * Los personajes: se emparejan POR ID y se aceptan campo a campo. Un id que
   * el modelo se invente no crea a nadie —eso dejaría una ficha sin persona en
   * la mesa— y una persona de la que no diga nada conserva la suya.
   */
  plot.characters = base.characters.map((personaje) => {
    const suyo = (respuesta.fichas ?? []).find((f) => f.participanteId === personaje.participanteId);
    if (!suyo) return personaje;
    return {
      ...personaje,
      characterName: util(suyo.nombre, 3) ?? personaje.characterName,
      publicPersona: util(suyo.caraPublica, 40) ?? personaje.publicPersona,
      secret: util(suyo.secreto, 20) ?? personaje.secret,
      personalHook: util(suyo.gancho, 20) ?? personaje.personalHook,
      /*
       * `knowledge` NO se toca: son los telegramas de esa persona, que ya están
       * redactados por el generador del cuadro y son la mitad del juego. Un
       * modelo «mejorándolos» cambiaría el significado de una condición.
       */
    };
  });

  /*
   * Los partes de cada franja, que viven dentro de la trama del juego.
   *
   * Se sustituyen UNO A UNO y solo si el texto es utilizable: un parte vacío en
   * la franja cuatro dejaría a quien dirige sin nada que leer justo cuando la
   * mesa está más cansada. Y se escribe sobre una COPIA de la trama, no sobre
   * la que viene en `base`, porque `base.delJuego` y `plot.delJuego` son el
   * mismo objeto y mutarlo aquí dejaría el respaldo tocado.
   */
  const trama = tramaDe(base);
  if (trama) {
    const partes = trama.partes.map((porDefecto, i) => {
      const suyo = (respuesta.partes ?? []).find((p) => p.franja === i + 1);
      return util(suyo?.texto, 25) ?? porDefecto;
    });
    plot.delJuego = { ...trama, partes };
  }

  const guion = (respuesta.guion ?? []).filter((linea) => util(linea, 25));
  if (guion.length >= 3) plot.gmScript = guion;

  return plot;
}

/** El respaldo cuando no hay clave: la plantilla, con su ceremonia. */
async function tramaDemo(game: GameSession, base: Plot, emit: Emitir): Promise<Plot> {
  for (const paso of [
    'Se pasa lista al turno de noche…',
    'Seis convoyes buscan su franja…',
    'Se reparten los cuatro oficios de la estación…',
    'Se redactan las tiras que sobrevivieron al fuego…',
    'Se comprueba que solo hay un cuadro posible…',
  ]) {
    emit({ type: 'text', delta: `${paso}\n` });
    await new Promise((r) => setTimeout(r, 160));
  }
  return base;
}

/**
 * Escribe la noche entera.
 *
 * Los cimientos primero y SIEMPRE: si `generarTramaNudo` lanza —faltan convoyes,
 * falta gente— la generación se para aquí con un mensaje que dice qué falta, y
 * eso es infinitamente mejor que una partida a medias.
 */
export async function escribirTramaNudo(game: GameSession, emit: Emitir): Promise<Plot> {
  const base = generarTramaNudo(game, { semilla: `${game.id}:${entidadesDe(game, 'ferroviarios').length}` });

  const client = DEMO_MODE ? null : getAnthropicClient();
  if (!client) return tramaDemo(game, base, emit);

  const model = await resolveModel(game);
  try {
    const respuesta = await unaTirada(client, model, game, base, emit);
    return coser(base, respuesta);
  } catch (error) {
    /*
     * ═══ UN FALLO DEL MODELO NO DEJA LA PARTIDA SIN NOCHE ═══
     *
     * Es la diferencia práctica de haber puesto los cimientos primero: aquí hay
     * una partida entera montada y comprobada, y lo único que falta es el
     * color. Tirarla porque una llamada de red se cayó sería tirar lo que sí
     * está bien. Se avisa —quien monta la partida tiene derecho a saber que va
     * a jugar con la prosa de plantilla— y se sigue.
     */
    console.error('[nudo] el modelo no pudo escribir el sabor:', error);
    emit({
      type: 'text',
      delta:
        '\n[No se ha podido escribir la ambientación con el modelo. La noche queda montada y ' +
        'jugable con los textos de plantilla; puedes volver a generar más tarde.]\n',
    });
    return base;
  }
}

/*
 * El alta. Sin esta línea —y sin el import de `instalados.ts` que la carga—
 * `generadorDeTrama('nudo')` devuelve `undefined`, `runGeneration` lanza y el
 * botón de generar no hace nada. Ver la cabecera de `juegos/generadores.ts`.
 */
registrarGenerador('nudo', {
  rotulo: 'Rehaciendo el cuadro de marchas…',
  generar: escribirTramaNudo,
});
