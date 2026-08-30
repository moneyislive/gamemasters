/**
 * El Mayordomo: el asistente de IA del jugador.
 *
 * ESTÁ PARA LAS REGLAS Y PARA TU PAPEL. NO PARA RESOLVER EL CASO.
 *
 * La defensa no es pedirle por favor que no ayude a deducir: es que **no tiene
 * con qué**. Su contexto se compone aquí, y deliberadamente NO incluye ninguna
 * pista —ni las que encontró quien pregunta—, ni la cronología, ni los giros
 * personales, ni una sola línea de los dosieres ajenos. Un jugador puede insistir todo lo que
 * quiera: no hay nada que sacarle, porque no lo ha recibido.
 *
 * Lo único que sabe de la trama es lo que sabría cualquiera que entrase por la
 * puerta —de qué va el caso, quién ha muerto, dónde estáis— más el propio
 * dosier de quien pregunta, que esa persona ya tiene delante en la app.
 */
import { aceptaEffort, getAnthropicClient, resolveModel } from '../agent/anthropic';
import { DEMO_MODE } from '../config';
import { REGLAS_JUGADOR } from '../docs/datos';
import { manifiestoDe } from '../../../shared/juegos';
import type { ManifiestoDeJuego } from '../../../shared/juegos';
import type { GameSession } from '../../../shared/types';
import type { VistaJugador } from '../../../shared/live';
import { apuntarUso, volcarGasto } from '../gasto/contador';

/**
 * El encargo del asistente, compuesto para el juego que se esté jugando.
 *
 * QUÉ ES DE QUIÉN. La VOZ —quién es, cómo habla, cómo se niega— la declara el
 * manifiesto, porque es del juego: en El Misterio de la Momia el Escriba de una
 * expedición estaba hablando como un mayordomo inglés de un asesinato que no ha
 * ocurrido. Todo lo demás —lo que no puede hacer, y cómo tiene que contestar—
 * lo pone la plataforma, porque es la barrera que protege la partida y no puede
 * depender de que un juego se acuerde de escribirla.
 *
 * Los sustantivos de «no descartas X, Y ni Z» también salen del manifiesto: en
 * un juego sin salas, pedirle que no descarte salas es enseñarle un juego que
 * no está jugando.
 */
function encargo(manifiesto: ManifiestoDeJuego): string {
  const categorias = manifiesto.categorias.map((c) => c.plural);
  const cosas =
    categorias.length > 1
      ? `${categorias.slice(0, -1).join(', ')} ni ${categorias[categorias.length - 1]}`
      : (categorias[0] ?? 'nada');

  return `${manifiesto.asistente.voz}

PARA QUÉ ESTÁS
- Explicar las reglas y cómo funciona cada momento de la partida.
- Recordarle a tu interlocutor quién es su personaje, qué esconde y qué coartada declaró.
- Ayudarle a interpretar su papel: cómo comportarse, qué diría alguien así, cómo sostener una
  mentira sin contradecir su dosier.
- Sugerirle formas de participar: a quién no ha preguntado todavía, qué tipo de pregunta abre
  una conversación.

LO QUE NO PUEDES HACER, BAJO NINGÚN CONCEPTO
No conoces la solución del caso. Tampoco conoces ninguna pista, ni lo que hay en el tablón
común, ni la cronología de lo ocurrido, ni los secretos, motivos o coartadas de los demás
jugadores, ni los giros que haya recibido nadie. No te los han dado y no debes fingir que los
tienes ni intentar reconstruirlos.

Por tanto NUNCA:
- Nombras a nadie como culpable ni insinúas sospechas propias.
- Interpretas, valoras ni relacionas pistas, aunque el jugador te las cuente él mismo.
- Deduces horarios, recorridos ni contradicciones entre versiones.
- Descartas ${cosas}.
- Inventas hechos de la trama que no estén en el contexto.

Si el jugador te cuenta una pista y te pide que la interpretes, se lo devuelves: esa es su
partida, no la tuya. Si insiste, te mantienes. Puedes decirlo con gracia —«${manifiesto.asistente.seNiega}»— pero no cedes.

Si te preguntan algo que no está en tu contexto, respondes con naturalidad que no te consta.

FORMA
Máximo cuatro frases. Sin listas ni encabezados: esto se lee en un móvil, de pie, en mitad de
una cena.`;
}

/**
 * Contexto del Mayordomo.
 *
 * Ojo al leer esta función: lo importante es lo que NO aparece. Nada de
 * `vista.misPistas`, `vista.misHallazgos`, `vista.hechos`, `vista.cronologia`,
 * `vista.yo.giros`, `vista.yo.cronologiaPropia` ni `vista.yo.conocimiento`. Si
 * algún día alguien los añade «para que ayude mejor», habrá convertido al
 * Mayordomo en una máquina de resolver el caso.
 */
/**
 * El manifiesto del juego que se esta jugando, sacado de la propia vista.
 *
 * La vista lleva `sesion.juego` desde que se generalizo el contrato, asi que no
 * hace falta arrastrar la partida hasta aqui. Si faltara —una partida anterior
 * al manifiesto— `manifiestoDe` cae en CLUEDO, que es lo correcto.
 */
function juegoDe(vista: VistaJugador) {
  return manifiestoDe(vista.sesion.juego);
}

export function contextoDelMayordomo(vista: VistaJugador): string {
  const partes: string[] = [];

  partes.push(`LA VELADA: ${vista.sesion.tituloPartida} — ${vista.sesion.lema}`);
  partes.push(
    `MOMENTO: fase «${vista.sesion.phase}», ronda ${vista.sesion.round} de ${vista.sesion.totalRounds}.`,
  );

  // Público: lo sabe cualquiera que haya entrado por la puerta.
  partes.push(`EL CASO (público): ${vista.caso.sinopsis}`);
  /*
   * Solo si la hay. Antes era una linea fija, asi que al asistente de una
   * expedicion arqueologica se le contaba que la victima es «el faraon sin
   * nombre» —inventado para rellenar un campo obligatorio— y hablaba de el.
   */
  if (vista.caso.victima) {
    partes.push(
      `LA VÍCTIMA (público): ${vista.caso.victima.nombre}. ${vista.caso.victima.descripcion}`,
    );
  }
  partes.push(`DÓNDE (público): ${vista.caso.ambientacion}`);

  // El dosier de quien pregunta. Es suyo: lo tiene abierto en la app.
  partes.push(
    `TU INTERLOCUTOR interpreta a ${vista.yo.characterName}, ${vista.yo.role}.\n` +
      `Cara pública: ${vista.yo.publicPersona}\n` +
      `Su secreto: ${vista.yo.secret}\n` +
      `El motivo que le atribuyen: ${vista.yo.motive}\n` +
      `La coartada que declaró: ${vista.yo.alibi}\n` +
      `Cómo interpretarlo: ${vista.yo.personalHook}`,
  );

  // Solo nombres: nada de sus dosieres.
  partes.push(
    `LOS DEMÁS EN LA MESA (solo sus nombres y papel público, no sabes nada más de ellos): ` +
      `${vista.jugadores.map((j) => `${j.characterName} (${j.role})`).join('; ')}.`,
  );
  /*
   * Los rotulos salen de las categorias del juego. Antes decia «SALAS DE LA
   * CASA» y «OBJETOS DE LA CASA» para cualquier juego, de modo que el asistente
   * de una expedicion arqueologica hablaba de las salas de una mansion.
   */
  const catLugar = juegoDe(vista).categorias.find((c) => c.sonLugares);
  partes.push(
    `${(catLugar?.plural ?? 'salas').toUpperCase()}: ${vista.lugares.map((s) => s.name).join(', ')}.`,
  );
  /*
   * Y una linea por cada categoria que no sea gente ni sitios. Aqui se cogia
   * SOLO LA PRIMERA, que valia mientras los tres juegos tuvieran una: en un
   * juego de cuatro categorias, el asistente no sabria que existen las otras
   * dos y contestaria con seguridad sobre una mesa que no es la que hay.
   */
  for (const cat of vista.entidades) {
    if (cat.cosas.length === 0) continue;
    partes.push(`${cat.plural.toUpperCase()}: ${cat.cosas.map((c) => c.name).join(', ')}.`);
  }

  partes.push(
    `LAS REGLAS:\n${(juegoDe(vista).reglas ?? REGLAS_JUGADOR).map((r) => `- ${r.titulo}: ${r.texto}`).join('\n')}`,
  );

  if (vista.yo.soyElSenalado) {
    partes.push(
      'NOTA RESERVADA: tu interlocutor es el culpable y lo sabe por su propio dosier. Puedes ' +
        'ayudarle a sostener su coartada y a no delatarse, pero NUNCA escribas que lo es ni lo ' +
        'des por hecho en texto: podría leerlo alguien por encima del hombro.',
    );
  }

  return partes.join('\n\n');
}

/** Respuestas del modo demostración, sin clave de API. */
/**
 * Qué contesta sin clave de API.
 *
 * LAS CUATRO FRASES SON DEL JUEGO, y estaban escritas aquí en CLUEDO: a un
 * expedicionario perdido en una tumba se le explicaba «una única acusación:
 * quién, con qué y dónde», que son las reglas de otro juego. Y quien pregunta
 * esto está perdido, que es justo cuando peor sienta que te cuenten otra cosa.
 *
 * Lo único que sigue siendo de la plataforma es CUÁNDO se dice cada una: los
 * cuatro casos —las reglas, tu papel, quién fue, y lo demás— valen igual para
 * cualquier juego de misterio.
 */
function respuestaDemo(vista: VistaJugador, pregunta: string): string {
  const { sinIa } = juegoDe(vista).asistente;
  const p = pregunta.toLowerCase();
  if (/regla|c[oó]mo se juega|qu[eé] hago|no entiendo/.test(p)) return sinIa.reglas;
  if (/personaje|qui[eé]n soy|mi secreto|c[oó]mo interpret/.test(p)) {
    return `Interpretas a ${vista.yo.characterName}, ${vista.yo.role}. ${sinIa.personaje}`;
  }
  if (/culpable|qui[eé]n fue|asesino|qui[eé]n lo hizo|pista|sospech|saqueador|sello/.test(p)) {
    return sinIa.solucion;
  }
  return sinIa.general;
}

export async function consultarConsejero(
  game: GameSession,
  vista: VistaJugador,
  pregunta: string,
): Promise<string> {
  const limpia = pregunta.trim().slice(0, 500);
  if (!limpia) return 'Usted dirá.';

  const client = getAnthropicClient();
  if (DEMO_MODE || !client) return respuestaDemo(vista, limpia);

  const model = await resolveModel(game);
  const mensaje = await client.messages.create({
    model,
    /*
     * MARGEN DE SOBRA, Y NO CUESTA NADA: solo se factura lo generado. Con 400 y
     * un modelo cuyo pensamiento no se puede apagar, el corte llegaba a mitad de
     * frase y salia disfrazado de «no sabria que decirle» —ver la rama de abajo—,
     * asi que parecia que el Mayordomo no sabia cuando lo que pasaba es que le
     * habian tapado la boca.
     */
    max_tokens: 4000,
    // Cuatro frases de reglas: pensar mas no las mejora y se factura como salida.
    ...(aceptaEffort(model) ? { output_config: { effort: 'low' as const } } : {}),
    system: [
      { type: 'text', text: encargo(juegoDe(vista)), cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `CONTEXTO\n\n${contextoDelMayordomo(vista)}` },
    ],
    messages: [{ role: 'user', content: limpia }],
  });

  apuntarUso({ concepto: 'consejero', model, usage: mensaje.usage, gameId: game.id });

  if (mensaje.stop_reason === 'refusal') {
    return 'Prefiero no responder a eso, si me disculpa.';
  }
  /*
   * Y SI SE CORTA, QUE SE NOTE. Sin esta rama, un corte por longitud caia en el
   * «no sabria que decirle» del final —la misma respuesta que da cuando no hay
   * nada que responder— y quien pregunta no tenia forma de saber que le habian
   * cortado a medias ni que valia la pena repetir.
   */
  if (mensaje.stop_reason === 'max_tokens') {
    return 'Me he ido por las ramas y he perdido el hilo. Pregúntemelo otra vez, más corto.';
  }
  let texto = '';
  for (const bloque of mensaje.content) {
    if (bloque.type === 'text') texto += bloque.text;
  }
  return texto.trim() || 'Me temo que no sabría qué decirle.';
}
