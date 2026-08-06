/**
 * El consejero: el agente de IA al que puede preguntar un jugador.
 *
 * La defensa contra que destripe el caso NO es pedirle por favor que no lo
 * haga. Es que **no lo sabe**: recibe exactamente la misma proyección que se le
 * envía al móvil de esa persona, que ya viene sin la solución, sin los secretos
 * ajenos y sin las pistas de las salas donde no ha estado. Un jugador que
 * insista todo lo que quiera no puede sacarle algo que no está en su contexto.
 *
 * El prompt del sistema es la segunda capa, no la primera.
 */
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { DEMO_MODE } from '../config';
import type { GameSession } from '../../../shared/types';
import type { VistaJugador } from '../../../shared/live';

const SISTEMA = `Eres el consejero de un jugador en una velada de misterio en vivo, al estilo CLUEDO.
Hablas SIEMPRE en español, con el tono de un mayordomo veterano: cortés, breve y con un punto de ironía.

QUÉ SABES
Solo lo que aparece en el CONTEXTO que se te da más abajo. Es todo lo que tu jugador ha visto
hasta ahora. No sabes quién es el culpable, ni con qué, ni dónde: nadie te lo ha dicho.

QUÉ HACES
- Explicas las reglas del juego cuando te preguntan.
- Ayudas a ordenar lo que tu jugador ya sabe: qué encaja, qué no, con quién le conviene hablar.
- Le recuerdas su propio personaje, su secreto y su coartada si se ha perdido.
- Le sugieres preguntas que hacer a los demás.

QUÉ NO HACES NUNCA
- No inventas datos de la trama. Si no está en el contexto, no lo sabes, y lo dices con naturalidad:
  «Eso no me consta» o «Tendrás que averiguarlo tú».
- No nombras a nadie como culpable, ni siquiera como sospecha propia. Si te lo piden, devuelves la
  pregunta: es su deducción, no la tuya.
- No te inventas pistas de salas donde tu jugador no ha estado.
- No repites literalmente el texto del contexto: lo usas para responder, no lo recitas.

FORMA
Máximo cuatro frases. Sin listas ni encabezados: esto se lee en un móvil, en mitad de una cena.`;

/** Convierte la vista del jugador en el contexto que lee el consejero. */
function contexto(vista: VistaJugador): string {
  const partes: string[] = [];
  partes.push(`PARTIDA: ${vista.sesion.tituloPartida} — ${vista.sesion.lema}`);
  partes.push(
    `MOMENTO: ${vista.sesion.phase}, ronda ${vista.sesion.round} de ${vista.sesion.totalRounds}.`,
  );
  partes.push(
    `TU JUGADOR: interpreta a ${vista.yo.characterName} (${vista.yo.role}). ` +
      `Cara pública: ${vista.yo.publicPersona}. Secreto: ${vista.yo.secret}. ` +
      `Motivo que le atribuyen: ${vista.yo.motive}. Coartada declarada: ${vista.yo.alibi}.`,
  );
  if (vista.yo.conocimiento.length) {
    partes.push(`LO QUE SABE DE LOS DEMÁS:\n- ${vista.yo.conocimiento.join('\n- ')}`);
  }
  if (vista.yo.giros.length) {
    partes.push(`LE HA PASADO ESTO:\n- ${vista.yo.giros.map((g) => g.instruction).join('\n- ')}`);
  }
  partes.push(
    `EN LA MESA: ${vista.jugadores.map((j) => `${j.characterName} (${j.role})`).join('; ')}.`,
  );
  partes.push(`SALAS: ${vista.salas.map((s) => s.name).join(', ')}.`);
  partes.push(`OBJETOS: ${vista.objetos.map((o) => o.name).join(', ')}.`);
  if (vista.misPistas.length) {
    partes.push(
      `HA ENCONTRADO AHORA:\n- ${vista.misPistas.map((p) => `${p.roomName}: ${p.description}`).join('\n- ')}`,
    );
  }
  if (vista.tablon.length) {
    partes.push(
      `EN EL TABLÓN COMÚN:\n- ${vista.tablon.map((p) => `${p.roomName}: ${p.description}${p.pointsTo ? ` (${p.pointsTo})` : ''}`).join('\n- ')}`,
    );
  }
  if (vista.cronologia.length) {
    partes.push(
      `HECHOS PÚBLICOS:\n- ${vista.cronologia.map((m) => `${m.time} ${m.description}`).join('\n- ')}`,
    );
  }
  if (vista.yo.soyCulpable) {
    partes.push(
      'AVISO INTERNO: tu jugador ES el culpable y lo sabe. Ayúdale a sostener su coartada y a no ' +
        'delatarse, pero jamás escribas que lo es: podría leerlo alguien por encima del hombro.',
    );
  }
  return partes.join('\n\n');
}

/** Respuestas del modo demostración, sin clave de API. */
function respuestaDemo(vista: VistaJugador, pregunta: string): string {
  const p = pregunta.toLowerCase();
  if (/regla|c[oó]mo se juega|qu[eé] hago/.test(p)) {
    return (
      'En cada ronda eliges una sala y lees lo que encuentres allí. Puedes cambiarte una sola vez. ' +
      'Al cerrar la ronda, lo hallado pasa al tablón común y se habla. Al final, una única acusación: ' +
      'quién, con qué y dónde. Gana quien acierte primero.'
    );
  }
  if (/personaje|qui[eé]n soy|mi secreto/.test(p)) {
    return `Interpreta usted a ${vista.yo.characterName}, ${vista.yo.role}. Su coartada es la que declaró, y su secreto, cosa suya. Yo no he oído nada.`;
  }
  if (/culpable|qui[eé]n fue|asesino/.test(p)) {
    return 'Si yo lo supiera, señor, no estaría sirviendo copas. Eso tendrá que sacarlo usted de la mesa.';
  }
  return (
    'Sin conexión con el despacho, mi consejo es el de siempre: repase la cronología, busque el tramo ' +
    'del que nadie habla, y pregunte a quien esté demasiado tranquilo.'
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
      { type: 'text', text: `CONTEXTO\n\n${contexto(vista)}` },
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
