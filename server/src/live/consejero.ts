/**
 * El Mayordomo: el asistente de IA del jugador.
 *
 * ESTÁ PARA LAS REGLAS Y PARA TU PAPEL. NO PARA RESOLVER EL CASO.
 *
 * La defensa no es pedirle por favor que no ayude a deducir: es que **no tiene
 * con qué**. Su contexto se compone aquí, y deliberadamente NO incluye ninguna
 * pista, ni el tablón común, ni la cronología, ni los giros personales, ni una
 * sola línea de los dosieres ajenos. Un jugador puede insistir todo lo que
 * quiera: no hay nada que sacarle, porque no lo ha recibido.
 *
 * Lo único que sabe de la trama es lo que sabría cualquiera que entrase por la
 * puerta —de qué va el caso, quién ha muerto, dónde estáis— más el propio
 * dosier de quien pregunta, que esa persona ya tiene delante en la app.
 */
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { DEMO_MODE } from '../config';
import { REGLAS_JUGADOR } from '../docs/datos';
import { manifiestoDe } from '../../../shared/juegos';
import type { GameSession } from '../../../shared/types';
import type { VistaJugador } from '../../../shared/live';

const SISTEMA = `Eres el Mayordomo de una velada de misterio en vivo, al estilo CLUEDO.
Hablas SIEMPRE en español, con el tono de un mayordomo veterano: cortés, breve, con un punto de
ironía seca. Tratas de usted.

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
- Descartas sospechosos, objetos o salas.
- Inventas hechos de la trama que no estén en el contexto.

Si el jugador te cuenta una pista y te pide que la interpretes, se lo devuelves: esa es su
partida, no la tuya. Si insiste, te mantienes. Puedes decirlo con gracia —«si yo resolviera los
crímenes, señor, no estaría sirviendo copas»— pero no cedes.

Si te preguntan algo que no está en tu contexto, respondes con naturalidad que no te consta.

FORMA
Máximo cuatro frases. Sin listas ni encabezados: esto se lee en un móvil, de pie, en mitad de
una cena.`;

/**
 * Contexto del Mayordomo.
 *
 * Ojo al leer esta función: lo importante es lo que NO aparece. Nada de
 * `vista.misPistas`, `vista.tablon`, `vista.cronologia`, `vista.yo.giros` ni
 * `vista.yo.conocimiento`. Si algún día alguien los añade «para que ayude
 * mejor», habrá convertido al Mayordomo en una máquina de resolver el caso.
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
  partes.push(
    `LA VÍCTIMA (público): ${vista.caso.victima.nombre}. ${vista.caso.victima.descripcion}`,
  );
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
  const cats = juegoDe(vista).categorias;
  const catLugar = cats.find((c) => c.sonLugares);
  const catCosas = cats.find((c) => !c.sonLugares && !c.sonJugadores);
  partes.push(
    `${(catLugar?.plural ?? 'salas').toUpperCase()}: ${vista.salas.map((s) => s.name).join(', ')}.`,
  );
  partes.push(
    `${(catCosas?.plural ?? 'objetos').toUpperCase()}: ${vista.objetos.map((o) => o.name).join(', ')}.`,
  );

  partes.push(
    `LAS REGLAS:\n${(juegoDe(vista).reglas ?? REGLAS_JUGADOR).map((r) => `- ${r.titulo}: ${r.texto}`).join('\n')}`,
  );

  if (vista.yo.soyCulpable) {
    partes.push(
      'NOTA RESERVADA: tu interlocutor es el culpable y lo sabe por su propio dosier. Puedes ' +
        'ayudarle a sostener su coartada y a no delatarse, pero NUNCA escribas que lo es ni lo ' +
        'des por hecho en texto: podría leerlo alguien por encima del hombro.',
    );
  }

  return partes.join('\n\n');
}

/** Respuestas del modo demostración, sin clave de API. */
function respuestaDemo(vista: VistaJugador, pregunta: string): string {
  const p = pregunta.toLowerCase();
  if (/regla|c[oó]mo se juega|qu[eé] hago|no entiendo/.test(p)) {
    return (
      'En cada ronda entra usted en una sala y ve lo que allí se encuentre. Puede cambiarse una ' +
      'sola vez. Al cerrar la ronda, lo hallado pasa al tablón común y se habla. Al final, una ' +
      'única acusación: quién, con qué y dónde.'
    );
  }
  if (/personaje|qui[eé]n soy|mi secreto|c[oó]mo interpret/.test(p)) {
    return `Interpreta usted a ${vista.yo.characterName}, ${vista.yo.role}. Lo que esconde, lo sabe mejor que yo; y su coartada es la que declaró. Sosténgala sin adornarla de más.`;
  }
  if (/culpable|qui[eé]n fue|asesino|qui[eé]n lo hizo|pista|sospech/.test(p)) {
    return 'Si yo resolviera los crímenes, señor, no estaría sirviendo copas. Eso tendrá que sacarlo usted de la mesa.';
  }
  return (
    'Sin línea con el despacho, mi consejo es el de siempre: hable con quien todavía no haya ' +
    'hablado. La gente se delata contestando, no callando.'
  );
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
    max_tokens: 400,
    system: [
      { type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `CONTEXTO\n\n${contextoDelMayordomo(vista)}` },
    ],
    messages: [{ role: 'user', content: limpia }],
  });

  if (mensaje.stop_reason === 'refusal') {
    return 'Prefiero no responder a eso, si me disculpa.';
  }
  let texto = '';
  for (const bloque of mensaje.content) {
    if (bloque.type === 'text') texto += bloque.text;
  }
  return texto.trim() || 'Me temo que no sabría qué decirle.';
}
