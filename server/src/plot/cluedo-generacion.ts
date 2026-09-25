/**
 * Como escribe CLUEDO su trama: con el modelo o sin el.
 *
 * Es el hermano de `momia-generacion.ts` y `sombras-generacion.ts`, y hasta hoy
 * no existia: todo esto vivia dentro de `pipeline.ts`, o sea en el camino por el
 * que pasa la generacion de CUALQUIER juego. Doscientas lineas de prompt, de
 * esquema y de trama de demostracion de un juego concreto, en un fichero comun.
 *
 * No cambia una linea de lo que hace. Solo estaba en el sitio equivocado, y ese
 * sitio le contaba a quien viniera detras una cosa que no es verdad: que la
 * tuberia es de CLUEDO y los demas juegos son excepciones.
 */
import { objetosDe, salasDe, sospechososDe } from '../juegos/cluedo';
import type { GameSession, Plot } from '../../../shared/types';
import { DEMO_MODE } from '../config';
import { esfuerzoPara, getAnthropicClient, resolveModel, streamDeGeneracion, textoDe } from '../agent/anthropic';
import { generateDemoPlot } from './cluedo-demo';
import { PLOT_SCHEMA } from './cluedo-esquema';
import { buildStyleBlock } from './style';
import { registrarGenerador } from '../juegos/generadores';
import { respuestasCluedo } from '../juegos/cluedo';
import { emisorDeProgreso } from '../live/proyeccion';
import { apuntarUso } from '../gasto/contador';
import type { Emitir } from './pipeline';

const SYSTEM_TRAMA =
  'Eres un novelista de misterio experto en CLUEDO y en juegos de deducción en vivo. ' +
  'Diseñas tramas de asesinato ambientadas en los años 20: elegantes, coherentes y jugables, ' +
  'adaptadas a las personas reales y al espacio físico real que se te describe. ' +
  'Escribes siempre en español, con tono evocador pero preciso. ' +
  'Devuelves exclusivamente el JSON pedido, respetando los ids proporcionados.';


// ---------------------------------------------------------------------------
// Trama vía API (streaming + salida estructurada)
// ---------------------------------------------------------------------------

async function generarTramaConApi(game: GameSession, emit: Emitir): Promise<Plot> {
  const client = getAnthropicClient();
  if (!client) {
    // Salvaguarda: sin cliente (sin clave) caemos al generador local.
    return generarTramaDemo(game, emit);
  }

  const model = await resolveModel(game);

  const stream = streamDeGeneracion(client, {
    model,
    esfuerzo: esfuerzoPara(game, 'trama'),
    maxTokens: 128000,
    system: SYSTEM_TRAMA,
    schema: PLOT_SCHEMA,
    messages: [{ role: 'user', content: construirPrompt(game) }],
  });

  // Los deltas de texto sirven como indicador de progreso en el overlay. A
  // ciegas van como puntos: el crudo del modelo lleva la solucion dentro.
  stream.on('text', emisorDeProgreso(game, emit));

  const mensaje = await stream.finalMessage();
  // Lo que ha costado esta llamada. No puede tumbar la generacion.
  apuntarUso({ concepto: 'trama', model: mensaje.model ?? model, usage: mensaje.usage, gameId: game.id });

  if (mensaje.stop_reason === 'refusal') {
    throw new Error(
      'El modelo declinó generar esta trama. Revisa las descripciones introducidas e inténtalo de nuevo.',
    );
  }
  if (mensaje.stop_reason === 'max_tokens') {
    throw new Error(
      'La trama salió más larga de lo que cabe en una respuesta y se cortó. Vuelve a intentarlo; si se repite, baja el esfuerzo en las opciones avanzadas.',
    );
  }

  const texto = textoDe(mensaje);

  try {
    return JSON.parse(texto) as Plot;
  } catch {
    throw new Error('La respuesta del modelo no es un JSON válido. Vuelve a intentar la generación.');
  }
}

function construirPrompt(game: GameSession): string {
  const sospechosos =
    sospechososDe(game)
      .map((s) => {
        // El correo NO va al modelo. Estos son invitados de verdad, y su
        // dirección no aporta absolutamente nada a escribir un personaje: era
        // un dato personal saliendo hacia un tercero a cambio de nada. El
        // esquema de la trama tampoco emite correos, así que no se echa en
        // falta en ninguna parte.
        const lineas = [`- id: "${s.id}" · nombre: "${s.name}"`];
        if (s.description?.trim()) {
          lineas.push(`  descripción psicológica: ${s.description.trim()}`);
        }
        return lineas.join('\n');
      })
      .join('\n') || '- (sin sospechosos registrados)';

  const salas =
    salasDe(game)
      .map((r) => `- id: "${r.id}" · nombre: "${r.name}"${r.description?.trim() ? ` · descripción: ${r.description.trim()}` : ''}`)
      .join('\n') || '- (sin salas registradas)';

  const armas =
    objetosDe(game)
      .map((w) => `- id: "${w.id}" · nombre: "${w.name}"${w.description?.trim() ? ` · descripción: ${w.description.trim()}` : ''}`)
      .join('\n') || '- (sin armas registradas)';

  // El tablero ya está trazado cuando se pide la trama: si el modelo no conoce
  // los pasadizos REALES, se los inventa y contradice al plano de los dosieres.
  const pasadizos =
    game.boardMode === 'generated' && game.board?.pasadizos.length
      ? game.board.pasadizos
          .map((pasadizo) => {
            const desde = salasDe(game).find((s) => s.id === pasadizo.desdeLugarId)?.name ?? '';
            const hasta = salasDe(game).find((s) => s.id === pasadizo.hastaLugarId)?.name ?? '';
            return `- "${desde}" ⇄ "${hasta}"`;
          })
          .join('\n')
      : '- (esta partida no tiene pasadizos secretos: no menciones ninguno)';

  return `Diseña la trama completa de una partida de CLUEDO EN VIVO llamada "${game.name}".

SOSPECHOSOS (personas reales que jugarán; usa sus ids EXACTOS):
${sospechosos}

SALAS (espacios físicos reales donde se jugará; usa sus ids EXACTOS):
${salas}

ARMAS (objetos reales aportados; usa sus ids EXACTOS):
${armas}

PASADIZOS SECRETOS YA TRAZADOS EN EL PLANO (son estos y solo estos):
${pasadizos}

REQUISITOS:
1. Trama elaborada ambientada en los años 20, adaptada al espacio REAL descrito por las salas: el escenario debe sentirse como esa casa concreta convertida en mansión.
2. Un personaje por sospechoso, hecho A MEDIDA de la persona real: usa su nombre y su descripción psicológica; el campo personalHook debe explicar cómo el personaje aprovecha su forma de ser.
3. LA VÍCTIMA SE GANA SU FINAL: agravia en público, durante la velada, a varios invitados a la vez (un anuncio en la cena, una humillación, una amenaza). Esos agravios públicos se reparten: tocan a personas distintas, y ninguna —tampoco la culpable— acumula más que las demás. Un resumen cuyas tres desgracias recaen en la misma persona la está señalando tres veces.
4. LAS FALTAS QUE NO SON EL CRIMEN: al menos la mitad de los inocentes hace esa noche algo que tiene que esconder aunque no sea el asesinato —un robo, una falsificación, un chantaje, un sabotaje, algo echado en una copa, tocar la escena— y lo hace en el tramo confuso, donde puede parecer el crimen. Cada falta deja al menos una pista física y tiene su explicación: vista de lejos parece el asesinato y deja de parecerlo al conocerse. Esa falta es el secreto de ese personaje. Así el caso se resuelve separando lo que cada cual esconde de lo que de verdad mató a la víctima.
5. EL CAMINO HASTA EL CULPABLE: el crimen se prueba reconstruyendo un trayecto —de dónde salió el objeto, cómo y cuándo se movió, qué pasó a la hora del crimen y cómo volvió quien lo hizo— y con un RASGO del culpable (físico, de oficio o de costumbre, sacado de su descripción real) que las pistas de las rondas 3 y 4 dibujan sin nombrarlo. Ese rasgo lo comparten en parte al menos otras dos personas de la mesa: acotarlo exige combinar pruebas.
6. CADENA DE DEDUCCIÓN (se revisa): el culpable, el arma y la sala solo se prueban COMBINANDO al menos tres pistas de al menos dos rondas distintas. Ninguna pista identifica al culpable por sí sola, tampoco las de la ronda 4: la última ronda cierra el caso al sumarse a lo anterior, no al decirlo. Y cada inocente tiene que poder descartarse con alguna prueba, o al menos quedar por debajo al final.
7. EL MISMO TRATO (se revisa): la persona culpable recibe la misma atención que las demás en todo lo que lee la mesa —título, lema, sinopsis, ambientación, cronología pública, caras públicas y pistas de las rondas 1 a 3—. Ni más, porque se delataría; ni menos, porque nadie la sospecharía y el caso se resolvería por descarte. La sinopsis y la ambientación nombran a todas las personas por igual, o a ninguna.
8. NADIE DE RELLENO: cada personaje tiene un secreto que merezca esconderse, un motivo creíble contra la víctima, al menos un movimiento sospechoso en la cronología y al menos dos pistas que hablen de él a lo largo de la noche. Cada uno tiene su nightStory, y todas de la misma extensión: la del culpable no puede ser la más larga, ni la de un inocente un trámite.
9. OBJETOS CON HISTORIA: cada objeto de la lista aparece por su NOMBRE en al menos una pista y en el dosier de al menos un personaje, al que está ligado (le pertenece, lo heredó, es de su oficio, lo usó esa noche o tiene una historia con él). Cada uno tiene una razón para poder ser el arma, y los que no lo son quedan descartados por alguna prueba. Si el arma es de un inocente, la sospecha sobre su dueño es un señuelo que las pistas desmontan.
10. La solución (solution.murdererId, solution.weaponId, solution.lugarId) DEBE usar ids EXISTENTES de las listas anteriores. Igual para characters[].participanteId (exactamente uno por sospechoso), clues[].lugarId y timeline[].participanteIds.
11. LO QUE SE SABE AL EMPEZAR NO RESUELVE NADA: la sinopsis, la ambientación, la cronología pública y todo lo que los dosieres dejan contar desde el principio —las coartadas y lo que cada cual sabe de los demás (knowledge)— no revelan asesino, arma ni sala. Traen motivos, relaciones, faltas ajenas y observaciones ambiguas; NUNCA la hora de la muerte, el trayecto del objeto ni el rasgo del culpable. Esas piezas llegan poco a poco: con las pistas, con los hechos que se establecen al cerrar cada ronda y con los giros de las rondas 3 y 4. Al empezar, al menos tres personas tienen un hueco sin testigos en el tramo en que pudo ocurrir el crimen, y ese tramo es ancho: la mesa todavía no sabe a qué hora murió la víctima. Guardar las piezas del camino NO es esconder a la persona: en lo que se sabe al empezar, el culpable sale tanto como los demás, con su motivo, sus relaciones y sus movimientos ambiguos.
12. PASADIZOS: si mencionas alguno en secretos, coartadas, noches o pistas, debe ser EXACTAMENTE uno de los listados arriba. No inventes conexiones entre salas que el plano no tiene.
13. timeline: de 8 a 12 eventos con hora ("19:30"), mezclando públicos y secretos.
   - isPublic true SOLO para los momentos que presenciaron TODOS a la vez (llegada, cena, anuncio, apagón, hallazgo del cuerpo). Serán los únicos que vean los jugadores.
   - isPublic false para todo lo demás: quién se movió durante el apagón, quién manipuló qué, quién provocó el apagón, conversaciones privadas, alteraciones de la escena y el crimen.
   - Un evento que implique a UNA sola persona nunca puede ser público.
14. COHERENCIA HORARIA (crítico, se revisa): las horas de la cronología, las coartadas, las nightStory y las pistas deben encajar sin contradecirse.
   - Si dos personajes se dan coartada mutua, ambos dosieres deben indicar el MISMO intervalo.
   - Nadie puede estar en dos sitios a la vez ni presenciar algo fuera de su intervalo.
   - Una coartada declarada puede esconder una ausencia —la del culpable la esconde—; entonces su nightStory cuenta lo que de verdad hizo en ese hueco.
   - Si una pista fija una hora, ningún personaje puede contradecirla sin que eso sea una mentira deliberada y marcada como tal en su secreto.
15. clues: aproximadamente 2 pistas por sala, mezcla de verdaderas y señuelos; pointsTo indica qué o a quién señala cada una.
   - Cada ronda (campo "round") tiene su papel: 1 MOTIVOS Y PRIMERAS CONTRADICCIONES —casi todos tenían motivo, y algún indicio compromete a alguien por una falta que no es el crimen—; 2 EL TRAMO CONFUSO —qué se movió, quién faltaba, qué cambió de sitio; separa el desorden de la hora de la muerte—; 3 LAS FALTAS QUE NO SON EL CRIMEN —robos, falsificaciones, documentos; se rompen coartadas aparentes—; 4 LA RECONSTRUCCIÓN —piezas del trayecto del objeto, marcas horarias y el rasgo del culpable; cada una es una pieza y ninguna cierra el caso sola—.
   - Reparto parejo: el mismo número de pistas en cada ronda; dentro de una ronda, salas distintas; cada sala tiene pistas en al menos una ronda (con 8 salas y 4 rondas, cada sala sale en dos) y ninguna acumula el doble que otra.
   - pointsTo lo lee quien encuentra la pista al cerrar la ronda: escribe lo que la pista SUGIERE (una hora que no cuadra, un objeto fuera de su sitio, una mentira), nunca un veredicto como «señala al asesino».
16. gmScript: al menos 6 pasos concretos para conducir la velada: abrir las pistas de cada ronda en sus salas, marcar su mitad y cerrarla. La investigación es individual: cada cual elige sala y habla con quien coincide; nada de equipos, portavoces ni informes de grupo.
17. TODO en español, con elegancia de novela negra de los años 20.${buildStyleBlock(game)}`;
}

// ---------------------------------------------------------------------------
// Trama en modo demo
// ---------------------------------------------------------------------------

async function generarTramaDemo(game: GameSession, emit: Emitir): Promise<Plot> {
  const pasos = [
    'Consultando el archivo de crímenes de la casa…',
    'Eligiendo víctima, arma y escenario del crimen…',
    'Repartiendo secretos y coartadas entre los invitados…',
    'Escondiendo pistas en cada sala…',
  ];
  for (const paso of pasos) {
    emit({ type: 'text', delta: `${paso}\n` });
    await pausa(180);
  }
  return generateDemoPlot(game);
}

function pausa(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/**
 * Lo que el generador de CLUEDO devuelve, traducido a lo que la plataforma
 * espera: la terna a ejes y las pistas a su mecanica.
 *
 * ═══ ESTO ESTABA EN `pipeline.ts`, Y ERA LO ULTIMO DE `migracion.ts` ═══
 *
 * El esquema con el que se le pide la trama al modelo sigue hablando de
 * asesino, arma y sala —`murdererId`, `weaponId`, `roomId`— y se deja asi a
 * proposito: esta afinado y probado, y cambiarlo cambiaria las tramas que
 * salen. Pero la solucion que viaja por la plataforma es un valor por eje,
 * porque un juego con dos ejes o con cinco no cabe en una terna.
 *
 * La conversion se hacia en la tuberia comun, llamando a `tramaAlDia` —una
 * funcion de la migracion de datos guardados— sobre una trama recien nacida.
 * Mezclaba dos cosas distintas: poner al dia lo viejo y traducir la frontera de
 * un generador. Ahora es lo segundo y vive donde vive ese generador, asi que la
 * tuberia no sabe lo que es un asesino.
 */
function comoLoEsperaLaPlataforma(plot: Plot): Plot {
  /*
   * ═══ Y LAS PISTAS, QUE EL MODELO DEVUELVE EN LA RAIZ ═══
   *
   * El esquema le pide `clues` al nivel de la trama, igual que le pide asesino
   * y arma: esta afinado y cambiarlo cambiaria las tramas que salen. Pero las
   * pistas son de la MECANICA de las pistas, no del contrato de la trama —la
   * Momia y las Sombras no tienen ninguna y escribian `clues: []` para
   * cumplir—, asi que viven en `plot.mecanicas.pistas`.
   *
   * Se traduce aqui, en la frontera, que es donde se traducen las cosas de un
   * generador concreto.
   */
  const conRaiz = plot as unknown as { clues?: unknown[] };
  if (Array.isArray(conRaiz.clues)) {
    if (!plot.mecanicas) plot.mecanicas = {};
    if (plot.mecanicas.pistas === undefined) plot.mecanicas.pistas = conRaiz.clues;
    delete conRaiz.clues;
  }

  const s = plot.solution as unknown as {
    murdererId?: string;
    weaponId?: string;
    lugarId?: string;
    roomId?: string;
    respuestas?: Record<string, string>;
  };
  if (s.respuestas) return plot;
  plot.solution.respuestas = respuestasCluedo({
    murdererId: s.murdererId ?? '',
    weaponId: s.weaponId ?? '',
    /*
     * `lugarId` es el que pide el esquema. `roomId` se lee también porque es
     * el que pedía antes, y una trama escrita con aquel esquema puede llegar
     * todavía por una generación que empezó antes de desplegar esto.
     */
    lugarId: s.lugarId || s.roomId || '',
  });
  delete s.murdererId;
  delete s.weaponId;
  delete s.lugarId;
  delete s.roomId;
  return plot;
}

registrarGenerador('cluedo', {
  rotulo: 'Tejiendo la trama del crimen…',
  generar: async (game: GameSession, emit: Emitir) =>
    comoLoEsperaLaPlataforma(
      await (DEMO_MODE ? generarTramaDemo(game, emit) : generarTramaConApi(game, emit)),
    ),
});
