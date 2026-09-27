/**
 * El revisor adversario de las Sombras: sabe la senda, sabe quién cobra de
 * Akechi y sabe dónde esperan los cazadores cada hora, y con todo eso delante
 * reescribe lo que haga falta.
 *
 * ═══ DOS TURNOS, COMO EN CLUEDO ═══
 *
 * Primero lo que se lee en la mesa —la noche, los carteles, los mojones, las
 * ayudas, el desenlace—; después, en la misma conversación, los dosieres. En uno
 * solo el esquema no cabría con holgura en la gramática de la API, y además es
 * el orden bueno: los dosieres se corrigen sabiendo ya cómo ha quedado la noche.
 *
 * ═══ EL MISMO TRATO PARA QUIEN COBRA DE AKECHI ═══
 *
 * Lo que Miguel pidió para CLUEDO vale aquí igual: no se arregla una filtración
 * escondiendo al culpable. Un kanchō del que nadie habla, con la presentación
 * más corta y sin nada que contar de los demás, se ve igual que uno al que
 * acusan. El revisor tiene la orden de darle el mismo trato que a cualquiera:
 * que se hable de él tanto como de los demás, que su hoja pública se parezca a
 * las otras, y que los inocentes también tengan algo que callar.
 */
import type { GameSession, GenerateStreamEvent, ModelId, Plot } from '../../../shared/types';
import type { TramaSombras } from '../../../shared/juegos/sombras-tipos';
import { fichaDePapel, nombreDeLaHora, tramaDe } from '../juegos/sombras-trama';
import { redactarHito } from '../juegos/sombras-senda';
import { cronologiaPublica } from '../docs/datos';
import { SOMBRAS_TRAMA_SCHEMA } from './sombras-esquema';
import { entidadesDeLasSombras, saborDe } from './sombras-generacion';
import { decirCondicion, formaExigida } from './sombras-prompt';
import { buildStyleBlock } from './style';
import type { CambiosDeLasSombras } from './sombras-parches';
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

const SISTEMA_REVISOR_SOMBRAS =
  'Eres el revisor adversario de una plataforma que vende veladas en vivo. Recibes una noche de EL PASO DE LAS ' +
  'SOMBRAS ya escrita, y sabes lo que nadie en la mesa sabe: la senda, quién cobra de Akechi y dónde esperan los ' +
  'cazadores cada hora. Tu trabajo es que la columna que ha pagado viva una noche redonda: que nada de lo que se ' +
  'lee delate la senda, a los cazadores ni al infiltrado; que al infiltrado se le pueda sospechar exactamente como ' +
  'a cualquiera, ni más ni menos; y que cada persona tenga un papel a su medida. Nunca empobreces: cada cambio ' +
  'deja el texto igual de rico o más, con frases cortas y concretas y sin exotismo de postal. Escribes en español ' +
  'y devuelves exclusivamente el JSON pedido, con los ids exactos que se te dan.';

const P = SOMBRAS_TRAMA_SCHEMA.properties as Record<string, { items: unknown }>;

export const SOMBRAS_REVISION_SCHEMA = objeto({
  diagnostico: cadena('Tres o cuatro frases: cómo está la noche y qué era lo más urgente.'),
  hallazgos: esquemaDeHallazgos(
    'filtracion, kancho-intocable, kancho-distinto, senda-en-texto, cazadores-en-texto, texto-de-recambio, ' +
      'hora-repetida, mojon-soso, ayuda-falsa, desenlace-equivocado, otro',
  ),
  cambios: objeto({
    titulo: cadena('Título nuevo, o cadena vacía para no cambiarlo.'),
    lema: cadena('Lema nuevo, o cadena vacía.'),
    sinopsis: cadena('Sinopsis nueva ENTERA, o cadena vacía.'),
    ambientacion: cadena('Ambientación nueva ENTERA, o cadena vacía.'),
    apertura: cadena('La narración de antes de empezar (lo que pasó desde que ardió el Honnō-ji), ENTERA, o cadena vacía.'),
    senor: cadena('Quién es el señor, ENTERO, o cadena vacía.'),
    horas: lista(P.horas!.items, 'Las narraciones que cambian, COMPLETAS y con su ronda. Las que no cambian no se ponen.'),
    carteles: lista(P.pasos!.items, 'Los carteles que cambian, con el pasoId exacto. Los que no cambian no se ponen.'),
    hitos: lista(P.hitos!.items, 'Las frases de mojón que cambian, con su id exacto. Las que no cambian no se ponen.'),
    ayudas: lista(P.ayudas!.items, 'Las ayudas que cambian, con su nivel. Las que no cambian no se ponen.'),
    reconstruccion: cadena('La reconstrucción del desenlace ENTERA, o cadena vacía.'),
    confesion: cadena('La confesión ENTERA, o cadena vacía.'),
    epilogo: cadena('El epílogo ENTERO, o cadena vacía.'),
    guion: lista({ type: 'string' }, 'El guion entero si lo cambias; lista vacía si no.'),
  }),
  resumenDeCambios: RESUMEN_DE_CAMBIOS,
});

export const SOMBRAS_REVISION_DOSIERES_SCHEMA = objeto({
  cambios: objeto({
    fichas: lista(P.escoltas!.items, 'Los dosieres que cambian, COMPLETOS (todos sus campos). Los que no cambian no se ponen.'),
    motivoDelKancho: cadena('El motivo de quien cobra de Akechi, ENTERO, o cadena vacía.'),
    comoOcurrio: cadena('Cómo se vendió, para quien dirige, ENTERO, o cadena vacía.'),
  }),
  resumenDeCambios: RESUMEN_DE_CAMBIOS,
});

const PEDIDO_DE_LOS_DOSIERES = `Ahora, LOS DOSIERES, sabiendo ya cómo has dejado la noche.

1. NADIE DE RELLENO. Cada dosier a la medida de la persona real (usa lo que se dice de ella). Todos de una extensión parecida.
2. EL MISMO TRATO PARA QUIEN COBRA DE AKECHI. Que se sospeche de él exactamente como de cualquiera: ni más ni menos. Que salga en lo que los demás cuentan tanto como los otros; que su puesto y su presentación —que se imprimen en el dosier de TODOS— tengan la misma extensión y el mismo tono que los del resto; que su coartada nombre a otra persona como todas; y que sepa cosas de los demás como todos. Lo único que cambia es su secreto, que solo lee él: ahí se le dice sin rodeos que cobra de Akechi, por qué, y que puede dejar un mojón falso.
3. LOS INOCENTES TAMBIÉN ESCONDEN ALGO. Cada secreto con peso, de los que harían sospechar si salieran a la luz: así nadie es señalado por ser el único con algo que callar. Ningún secreto que no sea el suyo dice que cobra de Akechi.
4. LO QUE CADA CUAL SABE DE OTROS: de dos a cuatro cosas, cada una nombrando a alguien de la columna. Entre todas, que nadie se quede sin que otro hable de él. Ninguna acusa a nadie de cobrar de Akechi.
5. LA COARTADA: dónde estaba al llegar la noticia de Honnō-ji, cruzada con otra persona concreta a la que nombra.
6. EL PUESTO es un oficio corto («guía de Iga», «criado de Chaya»), no un párrafo.
7. El motivo de quien cobra de Akechi tiene que doler (3-5 frases), y cómo se vendió es para quien dirige.
8. LO QUE CABE EN EL PAPEL. Cada dosier se imprime en las mismas caras fijas, y la auditoría te ha dado lo que ocupa cada uno y lo que cabe. Un dosier que se pasa desborda una cara y su sobre lleva una hoja más que los demás; el de quien cobra de Akechi, el más gordo de la mesa. Si alguno se pasa, acórtalo sin dejarlo pobre; y ninguno que reescribas puede pasarse. Un programa lo comprueba y no deja entrar el que no quepa.

No empobrezcas. Los dosieres que cambian van COMPLETOS, con su participanteId exacto; los que no cambian, no se ponen. En resumenDeCambios, una línea por cambio para quien dirige.`;

export function construirPromptDelRevisorSombras(
  game: GameSession,
  plot: Plot,
  informes: InformesParaElRevisor,
  opciones: OpcionesDeLaPasada,
): string {
  const trama = tramaDe(plot) as TramaSombras | undefined;
  const sabor = saborDe(plot);
  const { escoltas, pasos } = entidadesDeLasSombras(game);
  const nombrePaso = (id: string) => pasos.find((p) => p.id === id)?.name ?? id;
  const kanchoId = String(plot.solution?.respuestas?.kancho ?? '');
  const material = plot.material;
  const horas = trama?.batidos.length ?? 0;

  const senda = (trama?.sendaVerdadera ?? []).map((id, i) => `  ${i + 1}. ${nombrePaso(id)}`).join('\n');
  const fuera = pasos.filter((p) => !trama?.sendaVerdadera.includes(p.id)).map((p) => p.name).join(', ');
  const batidos = (trama?.batidos ?? []).map((id, i) => `- hora ${i + 1} (${nombreDeLaHora(i + 1)}): esperan en ${nombrePaso(id)}`).join('\n');
  const mojones = [
    ...(trama?.condiciones ?? []).map((h) => ({ ...h, cierto: true })),
    ...(trama?.falsasCandidatas ?? []).map((h) => ({ ...h, cierto: false })),
  ]
    .map(
      (h) =>
        `- id "${h.id}" · ${h.cierto ? 'CIERTO' : 'FALSO (el kanchō puede publicarlo)'} · dice: ${decirCondicion(h.condicion, nombrePaso)}\n` +
        `  forma obligatoria: ${formaExigida(h.condicion)}\n` +
        `  frase de ahora${h.texto === redactarHito(h.condicion, nombrePaso) ? ' (LA DEL CÓDIGO: correcta y sosa)' : ''}: ${h.texto}`,
    )
    .join('\n');

  const columna = plot.characters
    .map((c) => {
      const persona = escoltas.find((e) => e.id === c.participanteId);
      const disfraz = trama ? fichaDePapel(trama.papeles[c.participanteId] ?? 'rastrear') : undefined;
      return (
        `### ${c.characterName} — participanteId "${c.participanteId}" (lo juega ${persona?.name ?? '?'})${c.participanteId === kanchoId ? '  ← COBRA DE AKECHI' : ''}\n` +
        (persona?.description?.trim() ? `- quien organiza dice de esta persona: «${persona.description.trim()}»\n` : '') +
        (disfraz ? `- disfraz (no se cambia): ${disfraz.rol} — ${disfraz.que}\n` : '') +
        `- puesto: ${c.role}\n- presentación: ${c.publicPersona}\n- secreto: ${c.secret}\n- motivo: ${c.motive}\n` +
        `- coartada: ${c.alibi}\n- lo que sabe de otros: ${(c.knowledge ?? []).join(' | ') || '(nada)'}\n- gancho: ${c.personalHook}\n` +
        `- por qué lleva su disfraz: ${sabor?.elDisfraz[c.participanteId] ?? ''}`
      );
    })
    .join('\n\n');

  const narraciones = (material?.narrations ?? [])
    .map((n) => `- ${n.round === 0 ? 'APERTURA' : `hora ${n.round} (${nombreDeLaHora(n.round)})`} · «${n.title}»: ${n.text}${n.stageDirection ? ` [${n.stageDirection}]` : ''}`)
    .join('\n');
  const carteles = pasos.map((p) => `- ${p.name} (pasoId "${p.id}"): ${sabor?.inscripciones[p.id] ?? ''}`).join('\n');
  const ayudas = (material?.hints ?? []).map((a) => `- nivel ${a.level}: ${a.text}`).join('\n');
  const avisos = informes.hallazgos.length
    ? informes.hallazgos.map((h) => `- [${h.gravedad}] ${h.codigo}${h.sobre ? ` (${h.sobre})` : ''}: ${h.texto}`).join('\n')
    : '(ninguno)';

  return `Revisa esta noche de EL PASO DE LAS SOMBRAS antes de entregarla a una columna que ha pagado por ella.
${opciones.pasada > 0 ? `\nESTA ES LA PASADA ${opciones.pasada + 1}: la noche ya se corrigió una vez y los avisos de abajo son los de DESPUÉS. Céntrate en lo que sigue pendiente.\n` : ''}
LO QUE DECIDE EL CÓDIGO Y NO SE CAMBIA (solo lo sabes tú)
La senda, en su orden:
${senda}
Los pasos que quedan FUERA de la senda: ${fuera || '(ninguno)'}
Dónde esperan los cazadores cada hora (SECRETO hasta que se cierra la hora):
${batidos}
Quién cobra de Akechi: ${plot.characters.find((c) => c.participanteId === kanchoId)?.characterName ?? '?'}

LOS MOJONES (lo que dice cada uno lo decide el código; su FRASE se puede mejorar)
${mojones}

LA NOCHE
- título: ${plot.title}
- lema: ${plot.tagline}
- sinopsis: ${plot.synopsis}
- ambientación: ${plot.setting}
- el señor: ${sabor?.senor.nombre ?? ''} — ${sabor?.senor.descripcion ?? ''}
- narraciones (${horas} horas):
${narraciones}
- carteles de las puertas:
${carteles}
- cronología pública:
${cronologiaPublica(plot).map((e) => `  - ${e.time} ${e.description}`).join('\n') || '  (ninguna)'}
- ayudas:
${ayudas || '  (ninguna)'}
- guion de quien dirige:
${(plot.gmScript ?? []).map((l, i) => `  ${i + 1}. ${l}`).join('\n')}
- desenlace · reconstrucción: ${material?.finale.reconstruction ?? ''}
- desenlace · confesión: ${material?.finale.confession ?? ''}
- desenlace · epílogo: ${material?.finale.epilogue ?? ''}
- motivo de quien cobra: ${plot.solution?.motive ?? ''}
- cómo se vendió: ${plot.solution?.howItHappened ?? ''}

LA COLUMNA
${columna}

LO QUE HA MEDIDO LA AUDITORÍA (con código: los números son fiables):
${informes.auditoria}

LO QUE HA LEÍDO UNA COLUMNA QUE NO SABE QUIÉN COBRA (cada momento, a quién señala y por qué):
${informes.lecturas || '(no hubo lectura)'}

AVISOS:
${avisos}

TU TAREA EN ESTE TURNO: lo que se lee y se oye en la mesa. Los dosieres, en el siguiente.
1. QUE NADIE LO SEÑALE LEYENDO. Si la columna ciega apunta a quien cobra de Akechi, busca qué se lo ha dicho y reescríbelo. Sin esconderle: se le tiene que poder sospechar como a cualquiera, ni más ni menos.
2. LAS NARRACIONES: una por hora, cada una distinta, nombrando su hora. No nombran a nadie de la columna —una narración que nombra a unos y no a otros señala—, no dicen dónde esperan los cazadores esa hora ni enumeran la senda. Un texto de recambio («De aquella noche se cuentan versiones distintas…») es un hueco: escríbelo de verdad.
3. LOS CARTELES: evocadores y cortos. Nada de la senda, ni de la barca, ni de emboscadas: ni «cazadores», ni «esperan», ni «acechan», ni «lanzas», ni «campesinos», ni «partida», ni «batido», ni «apostados», ni «emboscada».
4. LOS MOJONES: reescribe SOLO los que llevan la frase del código, con la voz de una inscripción vieja de camino de montaña, siguiendo su forma obligatoria AL PIE DE LA LETRA y nombrando SOLO los pasos que le tocan. Los falsos tienen que sonar exactamente como los ciertos. Un programa comprueba cada frase; la que no pase se queda como estaba.
5. LAS AYUDAS: la 1 empuja, la 2 orienta, la 3 casi lo dice. La 3 puede decir que UN paso queda fuera (solo de los de fuera: ${fuera || 'ninguno'}). Ninguna da la senda ni nombra a nadie.
6. EL DESENLACE: la reconstrucción dice la senda entera EN SU ORDEN, nombrando los cuatro pasos, y quién cobraba de Akechi y por qué. La confesión, en primera persona y de 70 a 130 palabras. El epílogo, lo que fue de cada cual.
7. La sinopsis, el lema, la ambientación y el guion no nombran a quien cobra de Akechi ni la senda.
8. No empobrezcas: si reescribes, que quede igual de rico o más.
9. Si un aviso no es un problema de verdad, dilo en tus hallazgos con el arreglo vacío y no toques nada por él.

FORMATO DE LOS CAMBIOS: cadena vacía o lista vacía significa «sin cambios». En resumenDeCambios, una línea por cambio para quien dirige.${buildStyleBlock(game)}`;
}

export function pedirRevisionSombras(
  game: GameSession,
  plot: Plot,
  model: ModelId,
  informes: InformesParaElRevisor,
  opciones: OpcionesDeLaPasada,
  emit: (evento: GenerateStreamEvent) => void,
): Promise<RespuestaDelRevisor<CambiosDeLasSombras>> {
  return conversarConElRevisor<CambiosDeLasSombras>({
    game,
    model,
    emit,
    sistema: SISTEMA_REVISOR_SOMBRAS,
    prompt: construirPromptDelRevisorSombras(game, plot, informes, opciones),
    esquema: SOMBRAS_REVISION_SCHEMA,
    segundoTurno: { pedido: PEDIDO_DE_LOS_DOSIERES, esquema: SOMBRAS_REVISION_DOSIERES_SCHEMA },
  });
}
