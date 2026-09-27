/**
 * El revisor adversario de la Momia: sabe el orden de los ritos, sabe quién
 * rompió el sello y qué cámara se profana cada vigilia, y con todo eso delante
 * reescribe lo que haga falta.
 *
 * Dos turnos, como en las Sombras y en CLUEDO: primero lo que se lee en la mesa
 * —la noche, los carteles, los fragmentos, las ayudas, el desenlace—; después,
 * en la misma conversación, los dosieres.
 *
 * Y la misma orden que en las Sombras, que es la que Miguel pidió: no se
 * arregla una filtración escondiendo a quien rompió el sello. Se le tiene que
 * poder sospechar como a cualquiera, ni más ni menos.
 */
import type { GameSession, GenerateStreamEvent, ModelId, Plot } from '../../../shared/types';
import type { TramaMomia } from '../../../shared/juegos/momia-tipos';
import { DONES_REPARTIBLES } from '../juegos/momia-trama';
import { redactar } from '../juegos/momia-puzle';
import { cronologiaPublica } from '../docs/datos';
import { MOMIA_TRAMA_SCHEMA } from './momia-esquema';
import { entidadesDeLaMomia, saborDe, tramaDe } from './momia-generacion';
import { REGLAS_DE_REDACCION, dictarRestriccion } from './momia-prompt';
import { buildStyleBlock } from './style';
import type { CambiosDeLaMomia } from './momia-parches';
import {
  RESUMEN_DE_CAMBIOS,
  cadena,
  conversarConElRevisor,
  esquemaDeHallazgos,
  lista,
  objeto,
  type InformesParaElRevisor,
  type OpcionesDeLaPasada,
  type RespuestaDelRevisor,
} from './revision-comun';

const SISTEMA_REVISOR_MOMIA =
  'Eres el revisor adversario de una plataforma que vende veladas en vivo. Recibes una noche de EL MISTERIO DE LA ' +
  'MOMIA ya escrita, y sabes lo que nadie en la mesa sabe: el orden de los cinco ritos, quién rompió el sello y qué ' +
  'cámara se profana cada vigilia. Tu trabajo es que la expedición que ha pagado viva una noche redonda: que nada de ' +
  'lo que se lee diga el orden, ni entero ni a trozos, ni adelante la cámara de mañana, ni delate a quien rompió el ' +
  'sello; que a esa persona se la pueda sospechar exactamente como a cualquiera, ni más ni menos; y que cada persona ' +
  'tenga un papel a su medida. Nunca empobreces: cada cambio deja el texto igual de rico o más, con frases cortas, ' +
  'para leerse en voz alta. Escribes en español y devuelves exclusivamente el JSON pedido, con los ids exactos.';

const P = MOMIA_TRAMA_SCHEMA.properties as Record<string, { items: unknown }>;

export const MOMIA_REVISION_SCHEMA = objeto({
  diagnostico: cadena('Tres o cuatro frases: cómo está la noche y qué era lo más urgente.'),
  hallazgos: esquemaDeHallazgos(
    'filtracion, orden-a-trozos, saqueador-intocable, saqueador-distinto, profanada-adelantada, texto-de-recambio, ' +
      'vigilia-repetida, fragmento-soso, ayuda-falsa, desenlace-equivocado, otro',
  ),
  cambios: objeto({
    titulo: cadena('Título nuevo, o cadena vacía para no cambiarlo.'),
    lema: cadena('Lema nuevo, o cadena vacía.'),
    sinopsis: cadena('Sinopsis nueva ENTERA, o cadena vacía.'),
    ambientacion: cadena('Ambientación nueva ENTERA, o cadena vacía.'),
    apertura: cadena('La narración de antes de empezar (la noche en que se rompió el sello), ENTERA, o cadena vacía.'),
    faraon: cadena('Quién fue el difunto, ENTERO, o cadena vacía.'),
    vigilias: lista(P.vigilias!.items, 'Las narraciones que cambian, COMPLETAS y con su ronda. Las que no cambian no se ponen.'),
    camaras: lista(P.camaras!.items, 'Los carteles que cambian, con el camaraId exacto. Los que no cambian no se ponen.'),
    ritos: lista(P.ritos!.items, 'Las invocaciones y gestos que cambian, con el ritoId exacto. Los que no cambian no se ponen.'),
    fragmentos: lista(P.fragmentos!.items, 'Las frases de papiro que cambian, con su id exacto. Las que no cambian no se ponen.'),
    ayudas: lista(P.ayudas!.items, 'Las ayudas que cambian, con su nivel. Las que no cambian no se ponen.'),
    reconstruccion: cadena('La reconstrucción del desenlace ENTERA, o cadena vacía.'),
    confesion: cadena('La confesión ENTERA, o cadena vacía.'),
    epilogo: cadena('El epílogo ENTERO, o cadena vacía.'),
    guion: lista({ type: 'string' }, 'El guion entero si lo cambias; lista vacía si no.'),
  }),
  resumenDeCambios: RESUMEN_DE_CAMBIOS,
});

export const MOMIA_REVISION_DOSIERES_SCHEMA = objeto({
  cambios: objeto({
    fichas: lista(P.expedicionarios!.items, 'Los dosieres que cambian, COMPLETOS (todos sus campos). Los que no cambian no se ponen.'),
    motivoDelSaqueo: cadena('El motivo de quien rompió el sello, ENTERO, o cadena vacía.'),
    comoOcurrio: cadena('Cómo lo hizo, para quien dirige, ENTERO, o cadena vacía.'),
  }),
  resumenDeCambios: RESUMEN_DE_CAMBIOS,
});

const PEDIDO_DE_LOS_DOSIERES = `Ahora, LOS DOSIERES, sabiendo ya cómo has dejado la noche.

1. NADIE DE RELLENO. Cada dosier a la medida de la persona real (usa lo que se dice de ella). Todos de una extensión parecida.
2. EL MISMO TRATO PARA QUIEN ROMPIÓ EL SELLO. Que se sospeche de esa persona exactamente como de cualquiera: ni más ni menos. Que salga en lo que los demás cuentan tanto como los otros; que su oficio y su presentación —que se imprimen en el dosier de TODOS— tengan la misma extensión y el mismo tono que los del resto; que su coartada nombre a otra persona como todas; y que sepa cosas de los demás como todos. Lo único que cambia es su secreto, que solo lee ella: ahí se le dice sin rodeos que rompió el sello, por qué, y que puede falsificar un fragmento.
3. LOS INOCENTES TAMBIÉN ESCONDEN ALGO. Cada secreto con peso, de los que harían sospechar si salieran a la luz: así nadie es señalado por ser el único con algo que callar. Ningún secreto que no sea el suyo dice que rompió el sello.
4. LO QUE CADA CUAL SABE DE OTROS: de dos a cuatro cosas, cada una nombrando a alguien de la expedición. Entre todas, que nadie se quede sin que otro hable de él. Ninguna acusa a nadie de haber roto el sello.
5. LA COARTADA: dónde estaba aquella noche, cruzada con otra persona concreta a la que nombra, y las dos versiones dicen lo mismo.
6. EL OFICIO es corto («capataz de la excavación», «fotógrafo de la misión»), no un párrafo.
7. El motivo de quien rompió el sello tiene que doler (3-5 frases), y cómo lo hizo es para quien dirige.
8. LO QUE CABE EN EL PAPEL. Cada dosier se imprime en las mismas caras fijas, y la auditoría te ha dado lo que ocupa cada uno y lo que cabe. Un dosier que se pasa desborda una cara y su sobre lleva una hoja más que los demás; el de quien rompió el sello, el más gordo de la mesa. Si alguno se pasa, acórtalo sin dejarlo pobre; y ninguno que reescribas puede pasarse. Un programa lo comprueba y no deja entrar el que no quepa.

No empobrezcas. Los dosieres que cambian van COMPLETOS, con su participanteId exacto; los que no cambian, no se ponen. En resumenDeCambios, una línea por cambio para quien dirige.`;

export function construirPromptDelRevisorMomia(
  game: GameSession,
  plot: Plot,
  informes: InformesParaElRevisor,
  opciones: OpcionesDeLaPasada,
): string {
  const trama = tramaDe(plot) as TramaMomia | undefined;
  const sabor = saborDe(plot);
  const { expedicionarios, camaras, ritos } = entidadesDeLaMomia(game);
  const nombreRito = (id: string) => ritos.find((r) => r.id === id)?.name ?? id;
  const nombreCamara = (id: string) => camaras.find((c) => c.id === id)?.name ?? id;
  const saqueadorId = String(plot.solution?.respuestas?.saqueador ?? '');
  const material = plot.material;

  const orden = (trama?.ordenVerdadero ?? []).map((id, i) => `  ${i + 1}. ${nombreRito(id)}`).join('\n');
  const profanadas = (trama?.profanadas ?? []).map((id, i) => `- vigilia ${i + 1}: ${nombreCamara(id)}`).join('\n');
  const fragmentos = [
    ...(trama?.restricciones ?? []).map((r) => ({ ...r, cierto: true })),
    ...(trama?.falsasCandidatas ?? []).map((r) => ({ ...r, cierto: false })),
  ]
    .map(
      (r) =>
        `- id "${r.id}" · ${r.cierto ? 'CIERTO' : 'FALSO (el saqueador puede publicarlo)'} · dice: ${dictarRestriccion(r.restriccion, nombreRito)}\n` +
        `  frase de ahora${r.texto === redactar(r.restriccion, nombreRito) ? ' (LA DEL CÓDIGO: correcta y sosa)' : ''}: ${r.texto}`,
    )
    .join('\n');

  const expedicion = plot.characters
    .map((c) => {
      const persona = expedicionarios.find((e) => e.id === c.participanteId);
      const don = trama ? DONES_REPARTIBLES.find((d) => d.don === trama.dones[c.participanteId]) : undefined;
      return (
        `### ${c.characterName} — participanteId "${c.participanteId}" (lo juega ${persona?.name ?? '?'})${c.participanteId === saqueadorId ? '  ← ROMPIÓ EL SELLO' : ''}\n` +
        (persona?.description?.trim() ? `- quien organiza dice de esta persona: «${persona.description.trim()}»\n` : '') +
        (don ? `- don (no se cambia): ${don.rol} — ${don.que}\n` : '') +
        `- oficio: ${c.role}\n- presentación: ${c.publicPersona}\n- secreto: ${c.secret}\n- motivo: ${c.motive}\n` +
        `- coartada: ${c.alibi}\n- lo que sabe de otros: ${(c.knowledge ?? []).join(' | ') || '(nada)'}\n- gancho: ${c.personalHook}\n` +
        `- por qué le tocó su don: ${sabor?.elDon[c.participanteId] ?? ''}`
      );
    })
    .join('\n\n');

  const narraciones = (material?.narrations ?? [])
    .map((n) => `- ${n.round === 0 ? 'APERTURA' : `vigilia ${n.round}`} · «${n.title}»: ${n.text}${n.stageDirection ? ` [${n.stageDirection}]` : ''}`)
    .join('\n');
  const carteles = camaras.map((c) => `- ${c.name} (camaraId "${c.id}"): ${sabor?.inscripciones[c.id] ?? ''}`).join('\n');
  const invocaciones = ritos
    .map((r) => `- ${r.name} (ritoId "${r.id}"): «${sabor?.ritos[r.id]?.invocacion ?? ''}» · gesto: ${sabor?.ritos[r.id]?.gesto ?? ''}`)
    .join('\n');
  const ayudas = (material?.hints ?? []).map((a) => `- nivel ${a.level}: ${a.text}`).join('\n');
  const avisos = informes.hallazgos.length
    ? informes.hallazgos.map((h) => `- [${h.gravedad}] ${h.codigo}${h.sobre ? ` (${h.sobre})` : ''}: ${h.texto}`).join('\n')
    : '(ninguno)';

  return `Revisa esta noche de EL MISTERIO DE LA MOMIA antes de entregarla a una expedición que ha pagado por ella.
${opciones.pasada > 0 ? `\nESTA ES LA PASADA ${opciones.pasada + 1}: la noche ya se corrigió una vez y los avisos de abajo son los de DESPUÉS. Céntrate en lo que sigue pendiente.\n` : ''}
LO QUE DECIDE EL CÓDIGO Y NO SE CAMBIA (solo lo sabes tú)
El orden de los ritos:
${orden}
Qué cámara se profana cada vigilia (se anuncia al ABRIR cada una; antes, nadie la sabe):
${profanadas}
Quién rompió el sello: ${plot.characters.find((c) => c.participanteId === saqueadorId)?.characterName ?? '?'}

LOS FRAGMENTOS (lo que dice cada uno lo decide el código; su FRASE se puede mejorar)
${fragmentos}

${REGLAS_DE_REDACCION}

LA NOCHE
- título: ${plot.title}
- lema: ${plot.tagline}
- sinopsis: ${plot.synopsis}
- ambientación: ${plot.setting}
- el difunto: ${sabor?.faraon.nombre ?? ''} — ${sabor?.faraon.descripcion ?? ''}
- narraciones:
${narraciones}
- carteles de las cámaras:
${carteles}
- invocaciones y gestos del sellado (se leen en la ceremonia del final):
${invocaciones}
- cronología pública:
${cronologiaPublica(plot).map((e) => `  - ${e.time} ${e.description}`).join('\n') || '  (ninguna)'}
- ayudas:
${ayudas || '  (ninguna)'}
- guion de quien dirige:
${(plot.gmScript ?? []).map((l, i) => `  ${i + 1}. ${l}`).join('\n')}
- desenlace · reconstrucción: ${material?.finale.reconstruction ?? ''}
- desenlace · confesión: ${material?.finale.confession ?? ''}
- desenlace · epílogo: ${material?.finale.epilogue ?? ''}
- motivo de quien rompió el sello: ${plot.solution?.motive ?? ''}
- cómo lo hizo: ${plot.solution?.howItHappened ?? ''}

LA EXPEDICIÓN
${expedicion}

LO QUE HA MEDIDO LA AUDITORÍA (con código: los números son fiables):
${informes.auditoria}

LO QUE HA LEÍDO UNA EXPEDICIÓN QUE NO SABE QUIÉN FUE (cada momento, a quién señala y por qué):
${informes.lecturas || '(no hubo lectura)'}

AVISOS:
${avisos}

TU TAREA EN ESTE TURNO: lo que se lee y se oye en la mesa. Los dosieres, en el siguiente.
1. QUE NADIE LO SEÑALE LEYENDO. Si la expedición ciega apunta a quien rompió el sello, busca qué se lo ha dicho y reescríbelo. Sin esconderle: se le tiene que poder sospechar como a cualquiera, ni más ni menos.
2. EL ORDEN, NI A TROZOS. Ninguna frase de lo que se lee en la mesa puede decir qué rito va antes que otro, ni qué lugar ocupa uno: se leería como un fragmento de papiro regalado. Tampoco las narraciones.
3. LAS NARRACIONES: una por vigilia, cada una distinta. Cada una nombra la cámara que se profana ESA noche, y ninguna la de otra vigilia: la de mañana es lo que el Mecenas paga por saber. No nombran a quien rompió el sello. Un texto de recambio («La expedición no se pone de acuerdo…») es un hueco: escríbelo de verdad.
4. LOS FRAGMENTOS: reescribe SOLO los que llevan la frase del código, con voz de papiro roto, siguiendo las reglas de redacción AL PIE DE LA LETRA. Los falsos tienen que sonar exactamente como los ciertos. Un programa comprueba cada frase; la que no pase se queda como estaba.
5. LAS AYUDAS: la 1 empuja, la 2 orienta, la 3 casi lo dice (puede decir qué rito ocupa un extremo). Nada de lo que digan puede ser falso, ni dar el orden entero, ni nombrar a nadie.
6. EL DESENLACE: la reconstrucción dice los cinco ritos EN SU ORDEN y quién rompió el sello y por qué. La confesión, en primera persona y de 70 a 130 palabras.
7. No empobrezcas: si reescribes, que quede igual de rico o más.
8. Si un aviso no es un problema de verdad, dilo en tus hallazgos con el arreglo vacío y no toques nada por él.

FORMATO DE LOS CAMBIOS: cadena vacía o lista vacía significa «sin cambios». En resumenDeCambios, una línea por cambio para quien dirige.${buildStyleBlock(game)}`;
}

export function pedirRevisionMomia(
  game: GameSession,
  plot: Plot,
  model: ModelId,
  informes: InformesParaElRevisor,
  opciones: OpcionesDeLaPasada,
  emit: (evento: GenerateStreamEvent) => void,
): Promise<RespuestaDelRevisor<CambiosDeLaMomia>> {
  return conversarConElRevisor<CambiosDeLaMomia>({
    game,
    model,
    emit,
    sistema: SISTEMA_REVISOR_MOMIA,
    prompt: construirPromptDelRevisorMomia(game, plot, informes, opciones),
    esquema: MOMIA_REVISION_SCHEMA,
    segundoTurno: { pedido: PEDIDO_DE_LOS_DOSIERES, esquema: MOMIA_REVISION_DOSIERES_SCHEMA },
  });
}
