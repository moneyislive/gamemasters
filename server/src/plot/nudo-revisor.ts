/**
 * El revisor adversario del Nudo: conoce el cuadro, lee toda la prosa y la
 * reescribe donde haga falta.
 *
 * ═══ POR QUÉ ESTE REVISOR SÍ PUEDE LEER CON LA SOLUCIÓN DELANTE ═══
 *
 * En CLUEDO, quien conoce la solución no puede juzgar si un texto la delata: lee
 * «la condesa, siempre tan callada» y le parece ambiente. Por eso allí hay un
 * detective ciego. Aquí el que escribe la prosa NO conoce el cuadro, así que lo
 * que puede salir es una frase que ata un convoy a una franja por casualidad,
 * acierte o no. Para ver eso, saber el cuadro no estorba: ayuda a distinguir la
 * fuga (acierta) de la pista falsa (manda a la mesa por mal camino). Y la
 * auditoría ya le deja subrayadas las frases sospechosas.
 *
 * Lo demás es oficio: que los partes no den por hecho cómo va la noche, que cada
 * ficha sea de su persona, que el suero vaya en el Correo y que no haya crímenes
 * en una noche que no los tiene.
 */
import type { GameSession, GenerateStreamEvent, ModelId, Plot } from '../../../shared/types';
import { entidadesDe, manifiestoDe } from '../../../shared/juegos';
import { HORAS_DE_FRANJA, NOMBRE_DE_OFICIO, OFICIO_DE_PERSONA, type OficioId } from '../../../shared/juegos/nudo-tipos';
import { tramaDe } from '../juegos/nudo-trama';
import { NUDO_TRAMA_SCHEMA } from './nudo-prompt';
import { buildStyleBlock } from './style';
import type { CambiosDelNudo } from './nudo-parches';
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

const SISTEMA_REVISOR_NUDO =
  'Eres el revisor adversario de una plataforma que vende veladas en vivo. Recibes una velada de EL NUDO ' +
  'DE VALDEHIERRO ya escrita: un cuadro de marchas que decide el código y la prosa que escribió otro ' +
  'modelo sin conocerlo. Tu trabajo es que la mesa que ha pagado viva una noche redonda: que nada ' +
  'insinúe el orden de los convoyes, que cada persona tenga un papel que jugar y que la prosa cuente ' +
  'ESTA noche y no una cualquiera. Nunca empobreces: cada cambio deja el texto igual de rico o más, con ' +
  'la misma voz seca y concreta de oficio. Escribes en español de España y devuelves exclusivamente el ' +
  'JSON pedido, con los ids exactos que se te dan.';

const propiedades = NUDO_TRAMA_SCHEMA.properties;

export const NUDO_REVISION_SCHEMA = objeto({
  diagnostico: cadena('Tres o cuatro frases: cómo está la velada y qué era lo más urgente.'),
  hallazgos: esquemaDeHallazgos(
    'insinua-orden, parte-nombra-convoy, parte-da-por-hecho, prosa-de-plantilla, hay-crimen, suero-en-otro-convoy, ' +
      'oficio-cruzado, ficha-de-relleno, guion-contra-las-reglas, repetido',
  ),
  cambios: objeto({
    titulo: cadena('Título nuevo, o cadena vacía para no cambiarlo.'),
    lema: cadena('Lema nuevo, o cadena vacía.'),
    sinopsis: cadena('Sinopsis nueva ENTERA, o cadena vacía.'),
    ambientacion: cadena('Ambientación nueva ENTERA, o cadena vacía.'),
    fichas: lista(propiedades.fichas.items, 'Las fichas que cambian, COMPLETAS (sus cuatro textos). Las que no cambian no se ponen.'),
    partes: lista(propiedades.partes.items, 'Los partes que cambian, con su franja. Los que no cambian no se ponen.'),
    guion: lista({ type: 'string' }, 'El guion entero si lo cambias; lista vacía si no.'),
  }),
  resumenDeCambios: RESUMEN_DE_CAMBIOS,
});

export function construirPromptDelRevisorNudo(
  game: GameSession,
  plot: Plot,
  informes: InformesParaElRevisor,
  opciones: OpcionesDeLaPasada,
): string {
  const trama = tramaDe(plot);
  const convoyes = entidadesDe(game, 'convoyes');
  const puestos = entidadesDe(game, 'puestos');
  const mercancias = entidadesDe(game, 'mercancias');
  const ferroviarios = entidadesDe(game, 'ferroviarios');
  const nombreConvoy = (id: string) => convoyes.find((c) => c.id === id)?.name ?? id;

  const cuadro = (trama?.cuadro ?? []).map((id, i) => `  franja ${i + 1} (${HORAS_DE_FRANJA[i] ?? '?'}): ${nombreConvoy(id)}`).join('\n');
  const trenes = convoyes
    .map((c) => {
      const carga = mercancias.find((m) => m.id === trama?.cargaDeConvoy[c.id])?.name;
      return `- ${c.name}${c.id === trama?.correo ? ' ← EL CORREO DE MEDIANOCHE, lleva el suero' : ''}${carga ? ` · carga: ${carga}` : ''}${c.description ? ` · ${c.description}` : ''}`;
    })
    .join('\n');
  const cuartos = puestos
    .map((p) => {
      const oficio = trama?.oficioDePuesto[p.id] as OficioId | undefined;
      return `- ${p.name}${oficio ? ` · es ${NOMBRE_DE_OFICIO[oficio]}` : ''}`;
    })
    .join('\n');
  const gente = ferroviarios
    .map((p) => {
      const oficio = trama?.oficioDePersona[p.id] as OficioId | undefined;
      const c = plot.characters.find((x) => x.participanteId === p.id);
      const tiras = (trama?.reparto[p.id] ?? []).map((id) => trama?.telegramas.find((t) => t.id === id)?.texto).filter(Boolean);
      return (
        `### ${c?.characterName ?? p.name} — participanteId "${p.id}" (lo juega ${p.name})\n` +
        (p.description ? `- quien monta la partida dice de esta persona: «${p.description}»\n` : '') +
        `- oficio esta noche: ${oficio ? OFICIO_DE_PERSONA[oficio] : '—'}\n` +
        `- sus tiras: ${tiras.join(' | ') || '(ninguna)'}\n` +
        `- nombre: ${c?.characterName ?? ''}\n- cara pública: ${c?.publicPersona ?? ''}\n- secreto: ${c?.secret ?? ''}\n- gancho: ${c?.personalHook ?? ''}`
      );
    })
    .join('\n\n');
  const reglas = (manifiestoDe('nudo').reglas ?? []).map((r) => `- ${r.titulo}. ${r.texto}`).join('\n');
  const partes = (trama?.partes ?? []).map((p, i) => `- franja ${i + 1} (${HORAS_DE_FRANJA[i] ?? '?'}): ${p}`).join('\n');
  const avisos = informes.hallazgos.length
    ? informes.hallazgos.map((h) => `- [${h.gravedad}] ${h.codigo}${h.sobre ? ` (${h.sobre})` : ''}: ${h.texto}`).join('\n')
    : '(ninguno)';

  return `Revisa esta velada de EL NUDO DE VALDEHIERRO antes de entregarla a una mesa que ha pagado por ella.
${opciones.pasada > 0 ? `\nESTA ES LA PASADA ${opciones.pasada + 1}: la velada ya se corrigió una vez y los avisos de abajo son los de DESPUÉS. Céntrate en lo que sigue pendiente.\n` : ''}
LA NOCHE, QUE DECIDE EL CÓDIGO Y NO SE CAMBIA
Madrugada del 14 de enero de 1927, estación de Valdehierro, donde se cruzan cinco líneas. Ardió la oficina del telégrafo y con ella el cuadro de marchas. El turno de noche lo rehace con las tiras que cada cual salvó del fuego y despacha un convoy por franja.

EL CUADRO VERDADERO (solo lo sabes tú; ningún texto puede insinuarlo, ni acertando ni fallando):
${cuadro}

LOS CONVOYES
${trenes}

LOS PUESTOS (habitaciones reales de la casa)
${cuartos}

LAS REGLAS QUE LEE LA MESA (el guion no puede contradecirlas):
${reglas}

EL TURNO, CON SU FICHA DE AHORA
${gente}

EL RESTO DE LA PROSA
- título: ${plot.title}
- lema: ${plot.tagline}
- sinopsis: ${plot.synopsis}
- ambientación: ${plot.setting}
- partes (se leen en voz alta al abrir cada franja):
${partes}
- guion de quien dirige:
${(plot.gmScript ?? []).map((l, i) => `  ${i + 1}. ${l}`).join('\n')}

LO QUE HA MEDIDO LA AUDITORÍA (con código: los números son fiables):
${informes.auditoria}

AVISOS:
${avisos}

TU TAREA:
1. NINGÚN ORDEN. Busca en TODO el texto —sinopsis, ambientación, partes, guion y fichas— cualquier frase que ate un convoy a una franja, a una hora, a un puesto en la cola o a otro convoy por orden de salida. Reescríbela, acierte o no: si acierta es una fuga; si falla, una pista falsa que manda a la mesa por mal camino.
2. LOS PARTES se leen al abrir cada franja, pase lo que pase en la mesa: a esa hora pueden haber salido cuatro convoyes o ninguno. Ambiente de ESA hora —la nieve, el frío, la estufa, el hilo del telégrafo, un pitido lejano— sin nombrar ningún convoy, tampoco el Correo (el parte de una franja que nombra uno suena a «este es el de ahora»), y sin dar por hecho qué salió, qué espera, cuánto retraso lleva la noche ni cuántos quedan. Cada uno distinto del anterior: la noche avanza hacia el amanecer.
3. LOS HECHOS: la noche del 14 de enero de 1927; el suero va SOLO en el Correo de Medianoche; cada persona con SU oficio de esta noche; no hay crimen, ni culpable, ni víctima, ni muerto.
4. NADIE DE RELLENO. Cada ficha a medida de su persona real (usa lo que dice de ella quien monta la partida): una cara pública con su oficio y algo que se le note; un secreto humano con peso —una deuda, un traslado, un miedo, algo que calló—, nunca sobre los convoyes ni el cuadro; un gancho útil, en segunda persona. Todas de una extensión parecida.
5. EL GUION: cinco líneas para quien dirige, que puede estar jugando a la vez. Fiel a las reglas de arriba —se gana si cruza el Correo y el retraso final no pasa del tope— y sin insinuar orden alguno.
6. LA PLANTILLA: si la auditoría dice que queda texto de plantilla, escríbelo de verdad, con los nombres, las cargas, los puestos y la gente de ESTA noche.
7. No empobrezcas: no acortes; si reescribes, que quede igual de rico o más. No cambies nombres de convoyes ni de puestos, ni tiras, ni oficios.
8. Si un aviso de la auditoría no es un problema de verdad —una frase que la auditoría leyó mal—, dilo en tus hallazgos con el arreglo vacío y no toques nada por él.

FORMATO DE LOS CAMBIOS: cadena vacía o lista vacía significa «sin cambios». Las fichas que cambian van completas, con su participanteId exacto; los partes, con su franja; el guion, entero. En resumenDeCambios, una línea por cambio para quien dirige.${buildStyleBlock(game)}`;
}

export function pedirRevisionNudo(
  game: GameSession,
  plot: Plot,
  model: ModelId,
  informes: InformesParaElRevisor,
  opciones: OpcionesDeLaPasada,
  emit: (evento: GenerateStreamEvent) => void,
): Promise<RespuestaDelRevisor<CambiosDelNudo>> {
  return conversarConElRevisor<CambiosDelNudo>({
    game,
    model,
    emit,
    sistema: SISTEMA_REVISOR_NUDO,
    prompt: construirPromptDelRevisorNudo(game, plot, informes, opciones),
    esquema: NUDO_REVISION_SCHEMA,
  });
}
