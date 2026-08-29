/**
 * El encargo que se le hace al modelo para El Paso de las Sombras.
 *
 * DOS PIEZAS Y UNA FRONTERA. El system prompt dice QUIÉN escribe y con qué
 * pulso; el prompt de usuario dice QUÉ hay que escribir y sobre qué datos. La
 * frontera importa porque el system va con caché: cambia poco y se paga una vez.
 *
 * LO QUE MÁS OCUPA DE TODO ESTE FICHERO son las REGLAS DE REDACCIÓN de los
 * hitos, y es donde hay que mirar si algún día la validación empieza a rechazar
 * de más. No son manías de estilo: son la forma exacta que
 * `sombras-validacion.ts` sabe verificar. Cada regla de aquí tiene su
 * comprobación allí, y si una de las dos cambia sin la otra, el resultado no es
 * un error: son frases bonitas sustituidas por frases sosas, en silencio, hasta
 * que alguien mire el informe.
 */
import { buildStyleBlock } from './style';
import { HORAS_DE_LA_NOCHE, PAPELES_REPARTIBLES, PORTES } from '../juegos/sombras-trama';
import type { EntidadesDeSombras } from './sombras-cimientos';
import type { Condicion, TramaSombras } from '../../../shared/juegos/sombras-tipos';
import type { GameSession } from '../../../shared/types';

export const SISTEMA_SOMBRAS =
  'Eres un novelista histórico especializado en el Japón del periodo Sengoku y en juegos de ' +
  'deducción en vivo. Conoces bien 1582: el incidente del Honnō-ji, la huida de Tokugawa Ieyasu ' +
  'por Iga (el Iga-goe), Hattori Hanzō, el mercader Chaya Shirōjirō, los ochimusha-gari que ' +
  'cazaban samuráis en fuga y la matanza de Iga del año anterior. Escribes SIEMPRE en español, ' +
  'con frases cortas y concretas, sin exotismo de postal: la noche es fría, la gente tiene miedo ' +
  'y nadie hace discursos. Usas los términos japoneses que hacen falta y los explicas la primera ' +
  'vez. Devuelves exclusivamente el JSON pedido, respetando los ids proporcionados.';

/** Cómo se le describe al modelo una condición, para que la redacte. */
function decirCondicion(c: Condicion, nombre: (id: string) => string): string {
  const a = nombre(c.a);
  switch (c.tipo) {
    case 'antes':
      return `${a} se cruza EN ALGÚN MOMENTO ANTES que ${nombre(c.b)} (puede haber tramos en medio)`;
    case 'seguido':
      return `de ${a} se pasa DIRECTAMENTE a ${nombre(c.b)}, sin ningún tramo en medio`;
    case 'posicion':
      return `${a} es EXACTAMENTE el tramo número ${c.posicion} de la senda`;
    case 'no-posicion':
      return `${a} NO es el tramo número ${c.posicion} de la senda`;
    case 'extremo':
      return `${a} es el PRIMER tramo o el ÚLTIMO, nunca uno de en medio`;
    case 'pasa-por':
      return `la senda SÍ pasa por ${a}`;
    case 'no-pasa-por':
      return `la senda NO pasa por ${a}`;
  }
}

/** La regla de forma que tiene que cumplir la frase de cada tipo. */
function formaExigida(c: Condicion): string {
  switch (c.tipo) {
    case 'antes':
      return 'nombra PRIMERO el que va antes; usa «antes», «precede» o «delante»; NO uses «después», «tras», «luego», «sigue», «justo», «directamente» ni «pegado»';
    case 'seguido':
      return 'nombra PRIMERO el que va antes; usa «directamente», «justo», «pegados» o «nada se interpone»; NO uses «después», «tras» ni «luego»';
    case 'posicion':
      return 'di el número de tramo con su ordinal («el segundo»); NO uses ninguna negación ni menciones otro ordinal';
    case 'no-posicion':
      return 'di el número de tramo con su ordinal Y niégalo («no es el segundo», «jamás es el tercero»)';
    case 'extremo':
      return 'nombra los DOS extremos («abre o cierra», «el primero o el último») o niega expresamente el medio';
    case 'pasa-por':
      return 'usa «pasa por», «cruza» o «forma parte de la senda»; NO uses NINGUNA negación, ni siquiera un «sin»';
    case 'no-pasa-por':
      return 'usa «pasa por» o «cruza» Y niégalo («la senda no pasa por…»)';
  }
}

export function construirPromptSombras(
  game: GameSession,
  trama: TramaSombras,
  entidades: EntidadesDeSombras,
): string {
  const { escoltas, pasos, enseres, estandartes } = entidades;
  const nombreDePaso = (id: string) => pasos.find((p) => p.id === id)?.name ?? id;
  const nombreDeEnser = (id: string) => enseres.find((e) => e.id === id)?.name ?? id;
  const nombreDeEstandarte = (id: string) => estandartes.find((e) => e.id === id)?.name ?? id;
  const nombreDePersona = (id: string) => escoltas.find((e) => e.id === id)?.name ?? id;

  const listaEscoltas =
    escoltas
      .map((e) => {
        /*
         * EL CORREO NO VA AL MODELO. Son invitados de verdad, y su dirección no
         * aporta absolutamente nada a escribir un personaje: sería un dato
         * personal saliendo hacia un tercero a cambio de nada. Es la misma regla
         * que ya aplica el prompt de CLUEDO.
         */
        const ficha = PAPELES_REPARTIBLES.find((p) => p.papel === trama.papeles[e.id]);
        const lineas = [`- id: "${e.id}" · nombre: "${e.name}"`];
        if (e.description?.trim()) lineas.push(`  cómo es en la vida real: ${e.description.trim()}`);
        lineas.push(
          `  DISFRAZ ASIGNADO (no lo cambies): ${ficha?.rol ?? '—'} — ${ficha?.que ?? ''}`,
        );
        const bandera = trama.estandartes[e.id];
        if (bandera) lineas.push(`  estandarte: ${nombreDeEstandarte(bandera)}`);
        return lineas.join('\n');
      })
      .join('\n') || '- (no hay nadie en la columna)';

  const listaPasos =
    pasos
      .map(
        (p) =>
          `- id: "${p.id}" · nombre: "${p.name}"${p.description?.trim() ? ` · lo que hay allí de verdad: ${p.description.trim()}` : ''}`,
      )
      .join('\n') || '- (no hay pasos)';

  const listaEnseres =
    enseres
      .map((e) => {
        const porte = trama.portes[e.id];
        const ficha = PORTES.find((p) => p.porte === porte);
        return `- id: "${e.id}" · nombre: "${e.name}"${
          ficha ? ` · PESA EN LAS REGLAS como ${ficha.nombre}: ${ficha.que}` : ' · sin efecto en las reglas'
        }`;
      })
      .join('\n') || '- (la columna no lleva nada)';

  const listaHitos = [...trama.condiciones, ...trama.falsasCandidatas]
    .map(
      (h) =>
        `- id: "${h.id}" · dice: ${decirCondicion(h.condicion, nombreDePaso)}\n  forma obligatoria: ${formaExigida(h.condicion)}`,
    )
    .join('\n');

  const horas = trama.batidos.length;
  const nombresDeHoras = HORAS_DE_LA_NOCHE.slice(0, horas)
    .map((h, i) => `  ${i + 1}. ${h.nombre} (${h.kanji}, ${h.reloj})`)
    .join('\n');

  return `Escribe la trama completa de una noche de EL PASO DE LAS SOMBRAS llamada "${game.name}".

═══════════════════════════════════════════════════════════════
QUÉ JUEGO ES ESTE
═══════════════════════════════════════════════════════════════

21 de junio de 1582. Akechi Mitsuhide ha matado a Oda Nobunaga en el templo Honnō-ji de Kioto.
El señor —aliado de Nobunaga— estaba de visita en Sakai con un puñado de acompañantes y sin
tropas. Los caminos grandes son de Akechi. La única salida es cruzar de noche la provincia de
IGA, que Nobunaga arrasó el año pasado, y llegar antes del alba a la playa de Shirako, donde
espera una barca.

Las personas de la lista son quienes cruzan. Se mueven por una casa real convertida en camino:
cada habitación es un PASO. La noche se divide en HORAS, con los nombres del reloj japonés:
${nombresDeHoras}

De todos los pasos, solo CUATRO forman la senda que llega a la playa, y hay que andarlos en un
orden exacto. Nadie los conoce todos: cada paso guarda un MOJÓN que dice una cosa sobre la senda,
y hay que ponerlos en común. Una de las personas de la columna es un KANCHŌ (間諜, infiltrado)
pagado por Akechi, y puede dejar por el camino un mojón escrito de su puño que suene a verdad.

═══════════════════════════════════════════════════════════════
LA COLUMNA (personas reales que jugarán; usa sus ids EXACTOS)
═══════════════════════════════════════════════════════════════

${listaEscoltas}

═══════════════════════════════════════════════════════════════
LOS PASOS (habitaciones reales de la casa; usa sus ids EXACTOS)
═══════════════════════════════════════════════════════════════

${listaPasos}

═══════════════════════════════════════════════════════════════
LA CARGA (objetos reales; usa sus ids EXACTOS)
═══════════════════════════════════════════════════════════════

${listaEnseres}

═══════════════════════════════════════════════════════════════
LOS MOJONES QUE HAY QUE REDACTAR
═══════════════════════════════════════════════════════════════

Cada uno tiene un id y dice UNA cosa sobre la senda. Escribe la frase que llevaría tallada, de 8
a 25 palabras, en el tono de una inscripción vieja de camino de montaña.

REGLAS DE REDACCIÓN, y son de obligado cumplimiento porque un programa las
comprueba una a una. La frase que no las cumpla se tira y se sustituye por una sosa:

  1. NOMBRA los pasos implicados con su nombre tal y como aparece arriba, y NINGÚN otro paso.
     Ni de pasada, ni como metáfora. Nombrar un paso que no toca invalida la frase.
  2. Sigue la FORMA OBLIGATORIA que se indica en cada uno.
  3. No añadas información que no esté en lo que dice el mojón. Nada de «y allí murió alguien».
  4. No digas NUNCA cuántos tramos tiene la senda entera ni enumeres varios pasos seguidos.

${listaHitos}

═══════════════════════════════════════════════════════════════
QUÉ MÁS TIENES QUE ESCRIBIR
═══════════════════════════════════════════════════════════════

1. UN DOSIER POR PERSONA, hecho A MEDIDA de la persona real: usa su nombre y lo que se cuenta de
   ella; \`personalHook\` debe citar ese rasgo y explicar cómo lo aprovecha el papel. El disfraz
   viene dado: no lo cambies, solo explica en \`elDisfraz\` por qué esa persona lo lleva.
2. QUIÉN COBRA DE AKECHI (\`kanchoId\`): elige a UNA de la lista, con su id exacto. Su dosier NO
   puede sonar distinto de los demás: su \`role\` y su \`publicPersona\` tienen que parecer los de
   cualquiera. Lo único que cambia es \`secret\`, que solo lee esa persona, y donde SÍ se le dice
   claramente que cobra de Akechi y qué puede hacer.
3. EL MOTIVO (\`motivoDelKancho\`) tiene que DOLER. Iga fue arrasada hace un año por el aliado de
   este mismo señor: hay motivos que la mesa casi perdonaría. Nada de «lo hizo por dinero».
4. LA INSCRIPCIÓN de cada paso, para el cartel que se cuelga en la puerta de esa habitación real.
   Evocadora y corta. NO dice nada de la senda ni de dónde esperan los cazadores.
5. UNA NARRACIÓN POR HORA, para leerse en voz alta. Nombra la hora del zodiaco que le toca.
   PROHIBIDO decir dónde esperan los cazadores: es lo único que no se anuncia, y de eso vive el
   juego.
6. LA CRONOLOGÍA del día anterior, de Honnō-ji a la salida de Sakai. Un momento con UNA sola
   persona nunca es público: los públicos se imprimen en el dosier de todo el mundo.
7. TRES AYUDAS graduadas y EL DESENLACE, con la confesión del kanchō en primera persona.
8. EL GUION de quien dirige: al menos ocho pasos concretos.

═══════════════════════════════════════════════════════════════
LO QUE NO PUEDES ESCRIBIR EN NINGÚN TEXTO PÚBLICO
═══════════════════════════════════════════════════════════════

Son textos públicos: la sinopsis, el lema, la ambientación, las narraciones de cada hora, las
inscripciones, la cronología pública, las ayudas y el guion.

  · NUNCA enumeres cuatro pasos seguidos como si fueran un itinerario.
  · NUNCA digas ni insinúes quién cobra de Akechi. Nombrar a alguien está bien; acusarle, no.
  · NUNCA digas dónde estarán los cazadores. Nombrar un paso está bien; decir que allí hay una
    emboscada, no.

═══════════════════════════════════════════════════════════════
TONO
═══════════════════════════════════════════════════════════════

Español, siempre. Frases cortas. La noche es real y la gente tiene frío y miedo: nada de
solemnidad de película. Los detalles históricos que uses tienen que ser ciertos —Honnō-ji, Sakai,
Iga, Kōga, Shirako, los ochimusha-gari, la plata de Chaya— y lo que inventes tiene que poder
haber pasado. Y recuerda que quien lee esto es ${nombreDePersona(escoltas[0]?.id ?? '')} o alguien
como ella, de pie, en el pasillo de su casa, a las once de la noche.

Un apunte de atrezo que agradecerá quien organiza: si mencionas algún objeto, que sea uno de la
carga —${enseres.map((e) => nombreDeEnser(e.id)).join(', ')}— porque esos existen de verdad y
estarán sobre la mesa.${buildStyleBlock(game)}`;
}
