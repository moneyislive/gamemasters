/**
 * La revisión adversaria de las Sombras, sin gastar un céntimo.
 *
 *   npm run verify:revision-sombras -w server
 *
 * NO SALE A LA RED. Ensambla una noche buena por el mismo camino que la de la
 * API (`ensamblarTramaSombras`) y le va metiendo los fallos que estropean esta
 * noche en concreto:
 *
 *   · LA SENDA: enumerada en una narración, sus cuatro pasos sueltos en un
 *     texto, los cazadores de una hora dichos en voz alta, un cartel que anuncia
 *     una emboscada, una ayuda que manda por el camino malo, un desenlace que
 *     cuenta otra senda; y la lógica que decide el código (una senda rota, una
 *     mentira que es verdad, un mojón que ya no dice su condición).
 *   · QUIEN COBRA DE AKECHI, por los dos lados, que es lo que Miguel pidió:
 *     señalado (nombrado donde no sale nadie, acusado) y escondido (el único del
 *     que nadie habla, una presentación que no se parece, un sobre más gordo).
 *
 * Y el otro lado, que es el que hace que una revisión no sea ruido: la noche
 * bien escrita sale LIMPIA.
 *
 * Los parches: que solo toquen prosa, que pasen los mismos filtros que la
 * generación, que no dejen entrar un mojón que no se puede verificar ni un
 * dosier que no quepa. El juez de la columna ciega, con lecturas fabricadas:
 * que avise si señala al kanchō por lo leído, y también si la prosa lo exculpa.
 *
 * Y EL DOSIER IMPRESO, sin Edge: las mismas caras para todos, la cara privada
 * con el mismo aspecto, la tabla de «Quiénes cruzan» idéntica. Que eso de
 * verdad se imprime igual lo mide `scripts/medir-paginas.ts`, que necesita Edge
 * y no va en la batería.
 */
/*
 * Sin clave, pase lo que pase en el `.env`. Un espacio y no una cadena vacía:
 * en Windows, vaciar una variable de entorno la BORRA, y entonces dotenv la
 * cargaría del fichero. El espacio la deja definida y `config.ts` la recorta.
 */
process.env.ANTHROPIC_API_KEY = ' ';

import fs from 'node:fs';
import path from 'node:path';
import type { GameSession, HallazgoDeRevision, Plot } from '../../shared/types';
import type { CondicionEscrita, TramaSombras } from '../../shared/juegos/sombras-tipos';
import type { RespuestaSombras } from '../src/plot/sombras-esquema';
import type { LecturaDeMomento } from '../src/plot/revision-comun';

await import('../src/juegos/instalados');
const { cimientosDeSombras } = await import('../src/plot/sombras-cimientos');
const { ensamblarTramaSombras, entidadesDeLasSombras, RECAMBIO_PUBLICO, saborDe } = await import('../src/plot/sombras-generacion');
const { respuestaDeDemostracion } = await import('../src/plot/sombras-demo');
const { redactarHito } = await import('../src/juegos/sombras-senda');
const { tramaDe, pasoBatido } = await import('../src/juegos/sombras-trama');
const { auditarTramaSombras, PRESUPUESTO_DE_CARA } = await import('../src/plot/sombras-auditoria');
const { aplicarParchesSombras } = await import('../src/plot/sombras-parches');
const { juzgarLaColumna } = await import('../src/plot/sombras-lector');
const { ADAPTADOR_SOMBRAS, revisarTramaSombras } = await import('../src/plot/sombras-revision');
const { construirPromptDelRevisorSombras, SOMBRAS_REVISION_SCHEMA, SOMBRAS_REVISION_DOSIERES_SCHEMA } = await import('../src/plot/sombras-revisor');
const { construirPromptSombras, MARCA_DE_LA_SENDA, sendaEnPalabras } = await import('../src/plot/sombras-prompt');
const { mereceOtraPasada } = await import('../src/plot/revision-comun');
const { revisorDe } = await import('../src/juegos/revisores');
const { renderPrintableDocument } = await import('../src/docs/imprimibles/index');
const { cumpleCondicion } = await import('../../shared/juegos/sombras-tipos');

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 500)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const tiene = (hs: HallazgoDeRevision[], codigo: string, gravedad?: string) =>
  hs.some((h) => h.codigo === codigo && (!gravedad || h.gravedad === gravedad));
const serios = (hs: HallazgoDeRevision[]) => hs.filter((h) => h.gravedad !== 'menor');
const nada = () => {};

// ---------------------------------------------------------------------------
// La mesa: cinco personas, seis pasos, cuatro enseres, cuatro estandartes
// ---------------------------------------------------------------------------

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani', 'Eva'];
const PASOS = ['El Vado del Kizu', 'El Collado de Kabuto', 'El Bosque de Tsuge', 'El Puerto de Otogi', 'La Cuesta de Kashiwabara', 'La Playa de Shirako'];
const ENSERES = ['El farol de papel', 'La plata de Chaya', 'La lanza de Hanzo', 'El cofre lacado'];
const ESTANDARTES = ['Las tres malvarrosas', 'El carro de los Hattori', 'La tela de Chaya', 'El pino de los Tarao'];

function nuevaPartida(): GameSession {
  const ahora = '2026-06-21T21:00:00.000Z';
  return {
    id: 'revision-sombras',
    name: 'La casa de la calle Sakai',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    entidades: {
      escoltas: GENTE.map((name, i) => ({ id: `e${i}`, name })),
      pasos: PASOS.map((name, i) => ({ id: `p${i}`, name })),
      enseres: ENSERES.map((name, i) => ({ id: `n${i}`, name })),
      estandartes: ESTANDARTES.map((name, i) => ({ id: `b${i}`, name })),
    },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'sombras', model: 'claude-opus-5-5' },
  } as unknown as GameSession;
}

const game = nuevaPartida();
const entidades = entidadesDeLasSombras(game);
const cimientos = cimientosDeSombras(entidades, { semilla: 'revision-de-prueba' });
const trama = cimientos.trama;
const nombrePaso = (id: string) => entidades.pasos.find((p) => p.id === id)?.name ?? id;
const senda = trama.sendaVerdadera;
const fuera = entidades.pasos.map((p) => p.id).filter((id) => !senda.includes(id));

/*
 * La noche buena: la de demostración —que tiene la forma de la de la API— con lo
 * que un buen modelo escribiría distinto: narraciones que no se repiten, mojones
 * con voz propia (la frase del código con su tallado delante, que sigue pasando
 * la comprobación) y un desenlace que dice la senda con la marca que rellena el
 * código.
 */
const demo = respuestaDeDemostracion(game.name, entidades, trama);
const kanchoId = demo.kanchoId;
const NARRACIONES = [
  'Entra la hora del Jabalí. La columna deja atrás las últimas casas de Sakai y el camino se estrecha entre arrozales. Nadie habla. Se oye el agua de las acequias y, muy lejos, un perro que no se calla.',
  'La hora de la Rata trae niebla del río. Las linternas van tapadas con la mano y el monte se cierra por los dos lados. Alguien tropieza y nadie se ríe. Más arriba suena una campana una sola vez.',
  'Llega la hora del Buey y con ella el frío de verdad. El sendero sube entre cedros tan altos que no se ve el cielo. Se oyen pasos que no son de la columna y luego nada. Hay quien jura que era un ciervo.',
  'La hora del Tigre es la más negra de todas. Queda poco para el alba y todos lo saben. Los pies ya no se quejan: obedecen. Delante el camino se abre en tres, y ninguno lleva cartel.',
];
const conTallado = (h: CondicionEscrita) => ({ id: h.id, texto: `Tallado en la piedra: ${redactarHito(h.condicion, nombrePaso)}` });
const respuestaBuena: RespuestaSombras = {
  ...demo,
  hitos: [...trama.condiciones, ...trama.falsasCandidatas].map(conTallado),
  horas: demo.horas.map((h, i) => ({ ...h, texto: NARRACIONES[i % NARRACIONES.length]! })),
  desenlace: {
    ...demo.desenlace,
    reconstruccion:
      `Aquella noche la senda buena era ${MARCA_DE_LA_SENDA}, en ese orden, y estaba escrita entera en los mojones que la ` +
      'columna tuvo delante. Quien cobraba de Akechi era Eva: perdió a los suyos cuando arrasaron Iga y le ofrecieron ' +
      'saldar la deuda. Dejó un mojón de su puño donde nadie la vio, y esperó a que amaneciera.',
  },
};
const ensamblada = ensamblarTramaSombras(game, entidades, cimientos, respuestaBuena);
const buena = ensamblada.plot;
const tramaBuena = tramaDe(buena) as TramaSombras;

function conCambio(cambiar: (p: Plot, t: TramaSombras) => void, base: Plot = buena): Plot {
  const p = structuredClone(base);
  cambiar(p, tramaDe(p) as TramaSombras);
  return p;
}
const auditar = (p: Plot, g: GameSession = game) => auditarTramaSombras(g, p).hallazgos;
const personaje = (p: Plot, id: string) => p.characters.find((c) => c.participanteId === id)!;
const kancho = () => personaje(buena, kanchoId);
const inocente = buena.characters.find((c) => c.participanteId !== kanchoId)!.participanteId;

// ---------------------------------------------------------------------------
// 1. Lo que escribe el código en la noche buena
// ---------------------------------------------------------------------------

paso('La noche buena, ensamblada por el mismo camino que la de la API');
{
  comprobar('todas las frases de mojón con tallado se aceptan', ensamblada.redaccion.aceptadas === ensamblada.redaccion.total, ensamblada.redaccion);
  comprobar('quien cobra de Akechi es quien dijo el modelo', buena.solution?.respuestas?.kancho === kanchoId);
  const reconstruccion = buena.material?.finale.reconstruction ?? '';
  comprobar('la marca de la senda desaparece del desenlace', !reconstruccion.includes(MARCA_DE_LA_SENDA));
  comprobar(
    'y en su lugar va la senda, en su orden',
    reconstruccion.includes(sendaEnPalabras(senda, nombrePaso)),
    reconstruccion.slice(0, 200),
  );
}

// ---------------------------------------------------------------------------
// 2. La noche buena sale limpia
// ---------------------------------------------------------------------------

paso('Una noche bien escrita sale limpia: un auditor que avisa de todo no lo lee nadie');
{
  const a = auditarTramaSombras(game, buena);
  comprobar('ni un aviso grave ni bloqueante', serios(a.hallazgos).length === 0, serios(a.hallazgos));
  comprobar('ni siquiera menores', a.hallazgos.length === 0, a.hallazgos);
  comprobar('ningún mojón con la frase del código', a.delCodigo === 0, a.delCodigo);
  const { informe } = await revisarTramaSombras(game, buena, nada, 'completa');
  comprobar('sin clave, la noche bien escrita es «apta»', informe.veredicto === 'apta', informe);
  comprobar('sin clave no hay pasadas del revisor', informe.pasadas === 0);
}

paso('La de demostración, con sus frases de código y sus horas calcadas, no pasa por buena');
{
  const demostracion = ensamblarTramaSombras(game, entidades, cimientos, demo).plot;
  const hs = auditar(demostracion);
  comprobar('los mojones con la frase del código se ven', tiene(hs, 'hitos-del-codigo', 'grave'), hs);
  comprobar('y las narraciones que dicen lo mismo', tiene(hs, 'horas-repetidas'), hs);
  comprobar('y el desenlace que no dice la senda', tiene(hs, 'desenlace-sin-senda'), hs);
}

// ---------------------------------------------------------------------------
// 3. La senda en lo que se lee
// ---------------------------------------------------------------------------

paso('La senda no se dice en ningún texto que se lea en la mesa');
{
  const enNarracion = (texto: string, h = 1) =>
    conCambio((p) => {
      p.material!.narrations.find((n) => n.round === h)!.text = texto;
    });
  const enOrden = senda.map(nombrePaso).join(', luego ');
  comprobar(
    'una narración que enumera la senda en su orden es bloqueante',
    tiene(auditar(enNarracion(`Se cuenta que hay que pasar por ${enOrden}.`)), 'senda-en-texto', 'bloqueante'),
  );
  const desordenada = [...senda].reverse().map(nombrePaso).join(' y ');
  comprobar(
    'los cuatro pasos de la senda sueltos, sin ningún otro, también dicen cuáles son',
    tiene(auditar(enNarracion(`Hablan de ${desordenada}, y de nada más.`)), 'senda-en-texto', 'grave'),
  );
  const batido = pasoBatido(tramaBuena.batidos, 2)!;
  comprobar(
    'una narración que dice dónde esperan los cazadores esa hora',
    tiene(auditar(enNarracion(`En ${nombrePaso(batido)} esperan los cazadores con sus lanzas.`, 2)), 'cazadores-en-texto', 'bloqueante'),
  );
  comprobar(
    'un cartel que anuncia una emboscada',
    tiene(
      auditar(
        conCambio((p) => {
          saborDe(p)!.inscripciones[fuera[0]!] = 'Aquí acechan los campesinos con lanzas de bambú.';
        }),
      ),
      'cazadores-en-texto',
      'bloqueante',
    ),
  );
  comprobar(
    'una ayuda que dice que la senda no pasa por uno que sí',
    tiene(
      auditar(
        conCambio((p) => {
          p.material!.hints.find((h) => h.level === 3)!.text = `La senda no pasa por ${nombrePaso(senda[1]!)}.`;
        }),
      ),
      'ayuda-falsa',
    ),
  );
  comprobar(
    'y la que dice que no pasa por uno que de verdad queda fuera, no',
    !tiene(
      auditar(
        conCambio((p) => {
          p.material!.hints.find((h) => h.level === 3)!.text = `La senda no pasa por ${nombrePaso(fuera[0]!)}.`;
        }),
      ),
      'ayuda-falsa',
    ),
  );
  comprobar(
    'un texto de recambio en una narración es un hueco, y una marca',
    tiene(auditar(enNarracion(RECAMBIO_PUBLICO, 3)), 'texto-de-recambio', 'grave'),
  );
  comprobar(
    'una hora sin narración',
    tiene(
      auditar(
        conCambio((p) => {
          p.material!.narrations = p.material!.narrations.filter((n) => n.round !== 4);
        }),
      ),
      'hora-sin-narrar',
    ),
  );
}

// ---------------------------------------------------------------------------
// 4. El desenlace
// ---------------------------------------------------------------------------

paso('El desenlace dice la senda de verdad y a quien de verdad cobraba');
{
  const conFinal = (texto: string) =>
    conCambio((p) => {
      p.material!.finale.reconstruction = texto;
    });
  comprobar('sin la senda', tiene(auditar(conFinal('La senda era la que era. Quien cobraba de Akechi era Eva, y lo hizo por su valle.')), 'desenlace-sin-senda'));
  comprobar(
    'con la senda en otro orden',
    tiene(auditar(conFinal(`La senda era ${[...senda].reverse().map(nombrePaso).join(', ')}. Quien cobraba de Akechi era Eva.`)), 'desenlace-senda-equivocada'),
  );
  comprobar(
    'sin decir quién cobraba',
    tiene(auditar(conFinal(`La senda era ${sendaEnPalabras(senda, nombrePaso)}. Nadie supo nunca quién la vendió.`)), 'desenlace-sin-kancho'),
  );
  comprobar(
    'acusando a quien no era',
    tiene(auditar(conFinal(`La senda era ${sendaEnPalabras(senda, nombrePaso)}. Ana cobraba de Akechi, y Eva la cubrió.`)), 'desenlace-otro-kancho'),
  );
}

// ---------------------------------------------------------------------------
// 5. Quien cobra de Akechi: ni señalado ni escondido
// ---------------------------------------------------------------------------

paso('Quien cobra de Akechi, señalado');
{
  comprobar(
    'nombrado en la sinopsis, donde no sale nadie',
    tiene(auditar(conCambio((p) => (p.synopsis = `${p.synopsis} Eva no ha dormido en toda la noche.`))), 'nombra-al-kancho', 'grave'),
  );
  comprobar(
    'acusado en lo que otro cuenta en la mesa',
    tiene(
      auditar(conCambio((p) => personaje(p, inocente).knowledge!.push('Todo el mundo sabe que Eva cobra de Akechi desde Sakai.'))),
      'senala-al-kancho',
      'bloqueante',
    ),
  );
  comprobar(
    'un nombre de personaje con «joven» no hace que «un joven guía» nombre a nadie',
    !tiene(
      auditar(
        conCambio((p) => {
          personaje(p, kanchoId).characterName = 'La joven Sumire';
          p.synopsis = `${p.synopsis} Un joven guía de Iga abre la marcha.`;
        }),
      ),
      'nombra-al-kancho',
    ),
  );
  comprobar(
    'otro secreto que también dice que cobra de Akechi: habría dos',
    tiene(auditar(conCambio((p) => (personaje(p, inocente).secret = 'Cobras de Akechi desde hace un año, y nadie lo sabe.'))), 'otro-kancho'),
  );
}

paso('Quien cobra de Akechi, escondido: el mismo trato que los demás, no menos');
{
  const sinQueLoNombren = conCambio((p) => {
    for (const c of p.characters.filter((x) => x.participanteId !== kanchoId)) {
      c.knowledge = (c.knowledge ?? []).map((k) => k.replace(/Eva/g, 'Alguien de la columna'));
      c.alibi = (c.alibi ?? '').replace(/Eva/g, 'alguien');
    }
  });
  comprobar('el único del que nadie habla', tiene(auditar(sinQueLoNombren), 'kancho-intocable', 'grave'));
  comprobar(
    'una presentación que no se parece a las demás',
    tiene(auditar(conCambio((p) => (personaje(p, kanchoId).publicPersona = 'Camina.'))), 'kancho-distinto'),
  );
  comprobar(
    'el único que no sabe nada de los demás',
    tiene(auditar(conCambio((p) => (personaje(p, kanchoId).knowledge = []))), 'kancho-distinto'),
  );
  comprobar(
    'la única coartada que no nombra a nadie',
    tiene(auditar(conCambio((p) => (personaje(p, kanchoId).alibi = 'Estaba en el patio cuando llegó la noticia, y allí me quedé.'))), 'kancho-distinto'),
  );
}

// ---------------------------------------------------------------------------
// 6. El sobre del kanchō no puede ser el más gordo
// ---------------------------------------------------------------------------

paso('Lo que cabe en el papel: un sobre con una hoja de más se ve');
{
  const largo = (n: number) => 'La noche es fría y el camino es largo. '.repeat(Math.ceil(n / 39)).slice(0, n);
  const inocenteLargo = auditar(conCambio((p) => (personaje(p, inocente).secret = largo(PRESUPUESTO_DE_CARA.secretos + 50))));
  comprobar('un dosier que se desborda es grave', tiene(inocenteLargo, 'dosier-que-desborda', 'grave'), inocenteLargo);
  const kanchoLargo = auditar(conCambio((p) => (personaje(p, kanchoId).secret = largo(PRESUPUESTO_DE_CARA.secretos + 50))));
  comprobar('y si es el del kanchō, bloqueante: su sobre sería el más gordo', tiene(kanchoLargo, 'dosier-que-desborda', 'bloqueante'));
  comprobar(
    'y su motivo, en la única cara que solo tiene él, también',
    tiene(auditar(conCambio((p) => (p.solution!.motive = largo(PRESUPUESTO_DE_CARA.motivoDelKancho + 50)))), 'dosier-que-desborda', 'bloqueante'),
  );
}

paso('El dosier impreso: las mismas caras para todos, y la privada con el mismo aspecto');
{
  const dosieres = GENTE.map((_, i) => {
    const id = `e${i}`;
    return { id, html: renderPrintableDocument({ ...game, plot: buena }, 'dosier-escolta', { soloPara: id })?.html ?? '' };
  });
  const caras = (html: string) => (html.match(/class="pagina"/g) ?? []).length;
  const bermellon = (html: string) => (html.match(/caja--bermellon/g) ?? []).length - (html.match(/\.caja--bermellon/g) ?? []).length;
  const suyo = dosieres.find((d) => d.id === kanchoId)!;
  comprobar('todos los dosieres se componen', dosieres.every((d) => d.html.length > 1000));
  comprobar('todos con los mismos saltos de cara', new Set(dosieres.map((d) => caras(d.html))).size === 1, dosieres.map((d) => caras(d.html)));
  comprobar(
    'la cara privada del kanchō tiene el mismo aspecto: ni una caja bermellón de más',
    new Set(dosieres.map((d) => bermellon(d.html))).size === 1,
    dosieres.map((d) => bermellon(d.html)),
  );
  comprobar('le dice que cobra de Akechi, y solo a él', suyo.html.includes('Cobras de Akechi') && dosieres.filter((d) => d.html.includes('Cobras de Akechi')).length === 1);
  comprobar(
    'sin «cómo se vendió», que es de quien dirige y era lo más largo',
    !!buena.solution?.howItHappened && !suyo.html.includes(buena.solution.howItHappened.slice(0, 60)),
  );
  const tabla = (html: string) => /<h2>Quiénes cruzan<\/h2>[\s\S]*?<\/table>/.exec(html)?.[0] ?? '';
  comprobar(
    '«Quiénes cruzan» es la misma tabla en todos, con todo el mundo dentro',
    tabla(suyo.html).length > 0 && dosieres.every((d) => tabla(d.html) === tabla(suyo.html)) && GENTE.every((n) => tabla(suyo.html).includes(n)),
  );
}

// ---------------------------------------------------------------------------
// 7. La lógica: la decide el código y el revisor no la toca
// ---------------------------------------------------------------------------

paso('La senda y sus mojones, que decide el código');
const deLaSenda = new Set<string>();
{
  const anotar = (hs: HallazgoDeRevision[]) => hs.forEach((h) => deLaSenda.add(h.codigo));
  const rota = auditar(conCambio((_, t) => t.condiciones.shift()));
  comprobar('sin un hito cierto la senda deja de ser una', tiene(rota, 'senda-rota', 'bloqueante'), rota);
  anotar(rota.filter((h) => h.codigo === 'senda-rota'));

  const cierta = auditar(
    conCambio((_, t) => {
      t.falsasCandidatas[0] = { ...t.falsasCandidatas[0]!, condicion: { tipo: 'pasa-por', a: senda[0]! } };
    }),
  );
  comprobar('una mentira que resulta ser verdad', tiene(cierta, 'mentira-cierta'), cierta);
  anotar(cierta.filter((h) => h.codigo === 'mentira-cierta'));

  const sinMentiras = auditar(conCambio((_, t) => (t.falsasCandidatas = [])));
  comprobar('sin mentiras preparadas', tiene(sinMentiras, 'sin-mentiras'));
  anotar(sinMentiras.filter((h) => h.codigo === 'sin-mentiras'));

  const perdido = auditar(conCambio((_, t) => (t.hallazgos = t.hallazgos.filter((h) => h.hitoId !== t.condiciones[0]!.id))));
  comprobar('un hito que no aparece en ningún paso', tiene(perdido, 'hito-sin-sitio', 'bloqueante'));
  anotar(perdido.filter((h) => h.codigo === 'hito-sin-sitio'));

  const renombrada = structuredClone(game);
  const pasosRenombrados = (renombrada.entidades as Record<string, Array<{ id: string; name: string }>>).pasos!;
  const citado = tramaBuena.condiciones[0]!.condicion.a;
  pasosRenombrados.find((p) => p.id === citado)!.name = 'El Paso de la Grulla';
  const desalineado = auditar(buena, renombrada);
  comprobar('un paso renombrado deja un mojón cierto que ya no dice su condición', tiene(desalineado, 'hito-desalineado', 'bloqueante'), desalineado);

  const iguales = structuredClone(game);
  const dos = (iguales.entidades as Record<string, Array<{ id: string; name: string }>>).pasos!;
  dos[0]!.name = 'El Vado';
  dos[1]!.name = 'El Vado';
  const ambiguos = auditar(buena, iguales);
  comprobar('dos pasos que no se distinguen por su nombre', tiene(ambiguos, 'pasos-indistinguibles'));
  anotar(ambiguos.filter((h) => h.codigo === 'pasos-indistinguibles'));
}

paso('Lo que el revisor no puede arreglar no pide otra pasada');
{
  const h = (codigo: string): HallazgoDeRevision => ({ codigo, gravedad: 'bloqueante', origen: 'auditoria', texto: codigo, estado: 'pendiente' });
  const corregible = ADAPTADOR_SOMBRAS.corregible?.bind(ADAPTADOR_SOMBRAS);
  comprobar('una senda rota no pide otra pasada', !mereceOtraPasada([h('senda-rota')], corregible));
  comprobar('una filtración, sí', mereceOtraPasada([h('filtracion-inicial')], corregible));
  comprobar('un sobre que abulta más, sí: el revisor lo acorta', mereceOtraPasada([h('dosier-que-desborda')], corregible));
  const sinMarcar = [...deLaSenda].filter((c) => corregible?.(h(c)));
  comprobar('todo aviso de la lógica está entre los que el revisor no arregla', sinMarcar.length === 0, sinMarcar);
}

// ---------------------------------------------------------------------------
// 8. La columna ciega: el juez, con lecturas fabricadas
// ---------------------------------------------------------------------------

paso('La columna ciega: ni señalarlo por lo leído, ni exculparlo');
{
  const ids = buena.characters.map((c) => c.participanteId);
  const lectura = (momento: number, alKancho: number, frase = ''): LecturaDeMomento => {
    const resto = (1 - alKancho) / (ids.length - 1);
    return {
      momento,
      reparto: Object.fromEntries(ids.map((id) => [id, id === kanchoId ? alKancho : resto])),
      razon: 'prueba',
      pistaDecisiva: frase,
      cadena: [],
    };
  };
  const horas = tramaBuena.batidos.length;
  const juzgar = (ls: LecturaDeMomento[]) => juzgarLaColumna(game, buena, ls, horas);
  comprobar('repartida por igual, nada', juzgar([lectura(0, 0.2), lectura(horas, 0.2)]).length === 0);
  comprobar('en cabeza antes de salir, con un 65 %: bloqueante', tiene(juzgar([lectura(0, 0.65)]), 'filtracion-inicial', 'bloqueante'));
  comprobar('con un 45 %: grave', tiene(juzgar([lectura(0, 0.45)]), 'filtracion-inicial', 'grave'));
  comprobar('también al final: aquí no se le caza leyendo', tiene(juzgar([lectura(horas, 0.65)]), 'filtracion-final', 'bloqueante'));
  comprobar(
    'una sola frase que lo dice todo',
    tiene(juzgar([lectura(1, 0.45, '«Eva conoce el camino de Akechi»')]), 'pista-que-lo-dice-todo', 'bloqueante'),
  );
  comprobar(
    'y exculpado en todos los momentos, también se avisa',
    tiene(juzgar([lectura(0, 0.02), lectura(2, 0.03), lectura(horas, 0.02)]), 'kancho-invisible', 'grave'),
  );
  comprobar('pero un momento bajo no es exculparlo', !tiene(juzgar([lectura(0, 0.02), lectura(horas, 0.2)]), 'kancho-invisible'));
}

// ---------------------------------------------------------------------------
// 9. Los parches
// ---------------------------------------------------------------------------

paso('Los parches: solo prosa, con los mismos filtros que la generación');
{
  const con = (cambios: Parameters<typeof aplicarParchesSombras>[2], base: Plot = buena) => aplicarParchesSombras(game, base, cambios, false);

  // Lo que se intenta colar por el mismo sitio.
  const colado = con({
    sendaVerdadera: [...senda].reverse(),
    batidos: [],
    kanchoId: inocente,
    fichas: [{ ...respuestaBuena.escoltas[0]!, participanteId: inocente, papel: 'falsear' }],
  } as never);
  const t = tramaDe(colado.plot) as TramaSombras;
  comprobar(
    'la senda, los cazadores, los mojones y quien cobra no se mueven aunque vengan en el sobre',
    t.sendaVerdadera.join() === senda.join() &&
      t.batidos.join() === tramaBuena.batidos.join() &&
      JSON.stringify(t.condiciones.map((c) => c.condicion)) === JSON.stringify(tramaBuena.condiciones.map((c) => c.condicion)) &&
      JSON.stringify(t.papeles) === JSON.stringify(tramaBuena.papeles) &&
      colado.plot.solution?.respuestas?.kancho === kanchoId,
  );

  const narra = (texto: string, ronda = 1) => con({ horas: [{ ronda, titulo: 'Una hora', texto, indicacion: '' }] });
  const nombrandole = narra('Eva camina la última, y nadie le pregunta por qué. La niebla sube desde el río y tapa los pies de todos.');
  comprobar('una narración que nombra a quien cobra no entra', nombrandole.rechazados.some((r) => /nombra a quien cobra/.test(r)), nombrandole.rechazados);
  const batido = pasoBatido(tramaBuena.batidos, 2)!;
  const cazadores = narra(`En ${nombrePaso(batido)} esperan los cazadores esta hora, con sus lanzas de bambú. Nadie más lo sabe.`, 2);
  comprobar('ni una que dice dónde esperan los cazadores', cazadores.rechazados.some((r) => /cazadores/.test(r)), cazadores.rechazados);
  const buenaHora = narra('La hora del Jabalí empieza con el viento de cara. Hay que ir despacio, en fila, y mirar dónde se pisa: el barro no avisa.');
  comprobar('una buena, sí', buenaHora.aplicados.includes('la narración de la hora 1'), buenaHora);

  const cartel = con({ carteles: [{ pasoId: fuera[0]!, inscripcion: 'Aquí esperan los campesinos, quietos como piedras.' }] });
  comprobar('un cartel que anuncia una emboscada no entra', cartel.rechazados.some((r) => /emboscada/.test(r)), cartel.rechazados);

  const hito = trama.condiciones[0]!;
  const alReves = con({ hitos: [{ id: hito.id, texto: 'Nada de lo que se dice aquí es cierto, y ningún paso importa.' }] });
  comprobar('un mojón que no se puede verificar no entra', alReves.rechazados.some((r) => r.startsWith(`el mojón «${hito.id}»`)), alReves.rechazados);
  const bien = con({ hitos: [{ id: hito.id, texto: `Lo dicen los viejos de Iga: ${redactarHito(hito.condicion, nombrePaso)}` }] });
  comprobar('uno que sí dice su condición entra', bien.aplicados.includes(`el mojón «${hito.id}»`), bien);

  const ayudaMala = con({ ayudas: [{ nivel: 3, texto: `La senda no pasa por ${nombrePaso(senda[0]!)}.` }] });
  comprobar('una ayuda que manda por el camino malo no entra', ayudaMala.rechazados.some((r) => /contrario/.test(r)), ayudaMala.rechazados);
  const ayudaBuena = con({
    ayudas: [
      {
        nivel: 3,
        texto: `Si estáis atascados, quitad uno de encima: la senda no pasa por ${nombrePaso(fuera[0]!)}, y con eso lo que queda se ordena mejor.`,
      },
    ],
  });
  comprobar('una que dice la verdad, sí', ayudaBuena.aplicados.includes('la ayuda de nivel 3'), ayudaBuena);

  const finalMalo = con({ reconstruccion: 'Aquella noche se anduvo lo que se anduvo, y amaneció. Quien cobraba de Akechi era Eva, y lo hizo por su valle arrasado.' });
  comprobar('un desenlace sin la senda no entra', finalMalo.rechazados.some((r) => /senda/.test(r)), finalMalo.rechazados);
  const finalBueno = con({
    reconstruccion: `La senda era ${sendaEnPalabras(senda, nombrePaso)}, en ese orden. Quien cobraba de Akechi era Eva, y lo hizo por su valle arrasado el año anterior.`,
  });
  comprobar('uno con la senda en su orden y el nombre, sí', finalBueno.aplicados.includes('la reconstrucción'), finalBueno);

  const largo = 'La noche es fría y el camino es largo. '.repeat(80);
  const fichaDe = (id: string) => respuestaBuena.escoltas.find((e) => e.participanteId === id)!;
  const gordo = con({ fichas: [{ ...fichaDe(kanchoId), secret: largo }] });
  comprobar('un dosier que no cabría no entra', gordo.rechazados.some((r) => /no cabría/.test(r)), gordo.rechazados);
  comprobar('y no deja nada a medias', personaje(gordo.plot, kanchoId).secret === kancho().secret);
  const motivoLargo = con({ motivoDelKancho: largo });
  comprobar('ni un motivo que no cabe en su cara', motivoLargo.rechazados.some((r) => /no cabría/.test(r)), motivoLargo.rechazados);

  const acusa = con({
    fichas: [
      {
        ...fichaDe(inocente),
        knowledge: ['Eva cobra de Akechi, lo sé desde Sakai y lo diré.', 'Bruno sabe más de estos montes de lo que dice.'],
      },
    ],
  });
  comprobar(
    'lo que alguien cuenta que acusa a quien cobra se queda fuera',
    !personaje(acusa.plot, inocente).knowledge!.some((k) => /cobra de Akechi/.test(k)),
    personaje(acusa.plot, inocente).knowledge,
  );
  comprobar('la trama de entrada no se toca', buena.material!.narrations.find((n) => n.round === 1)!.text === NARRACIONES[0]);
}

// ---------------------------------------------------------------------------
// 10. Los encargos
// ---------------------------------------------------------------------------

paso('Lo que viaja a cada modelo: quien escribe no ve la senda; quien revisa, todo');
{
  const escritor = construirPromptSombras(game, trama, entidades);
  comprobar('al que escribe se le pide la marca de la senda para el desenlace', escritor.includes(MARCA_DE_LA_SENDA));
  comprobar('y que las narraciones no nombren a nadie', /NO nombra a nadie de la columna/.test(escritor));
  comprobar('y el mismo trato para todos', /EL MISMO TRATO PARA TODOS/.test(escritor));
  comprobar('sin decirle cuáles son falsos', !escritor.toLowerCase().includes('falso') && !escritor.toLowerCase().includes('mentira'));

  const revisor = construirPromptDelRevisorSombras(game, buena, { auditoria: 'AUDITORÍA DE PRUEBA', lecturas: 'LECTURAS DE PRUEBA', hallazgos: [] }, { soloMaterial: false, pasada: 0 });
  comprobar('al que revisa le llega la senda en su orden', senda.every((id, i) => revisor.includes(`${i + 1}. ${nombrePaso(id)}`)));
  comprobar('quién cobra', revisor.includes(`Quién cobra de Akechi: ${kancho().characterName}`));
  comprobar('dónde esperan los cazadores cada hora', tramaBuena.batidos.every((id, i) => revisor.includes(`hora ${i + 1}`) && revisor.includes(`esperan en ${nombrePaso(id)}`)));
  comprobar('la auditoría y lo que leyó la columna ciega', revisor.includes('AUDITORÍA DE PRUEBA') && revisor.includes('LECTURAS DE PRUEBA'));

  const claves = (esquema: unknown) => Object.keys((esquema as { properties: { cambios: { properties: object } } }).properties.cambios.properties).sort().join();
  comprobar(
    'el esquema del primer turno solo tiene sitio para prosa',
    claves(SOMBRAS_REVISION_SCHEMA) === ['ambientacion', 'apertura', 'ayudas', 'carteles', 'confesion', 'epilogo', 'guion', 'hitos', 'horas', 'lema', 'reconstruccion', 'senor', 'sinopsis', 'titulo'].join(),
    claves(SOMBRAS_REVISION_SCHEMA),
  );
  comprobar('y el del segundo, para los dosieres', claves(SOMBRAS_REVISION_DOSIERES_SCHEMA) === ['comoOcurrio', 'fichas', 'motivoDelKancho'].join());
}

// ---------------------------------------------------------------------------
// 11. El alta
// ---------------------------------------------------------------------------

paso('El alta: sin ella la noche se entrega sin revisar y nada falla');
{
  comprobar('las Sombras tienen revisor', revisorDe('sombras') === revisarTramaSombras);
  const instalados = fs.readFileSync(path.join(import.meta.dirname, '..', 'src', 'juegos', 'instalados.ts'), 'utf8');
  comprobar('y lo da de alta `instalados.ts`', /^import '\.\.\/plot\/sombras-revision';$/m.test(instalados));
  comprobar('ninguna mentira preparada es cierta en la noche de prueba', trama.falsasCandidatas.every((f) => !cumpleCondicion(senda, f.condicion)));
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length) {
  console.log(`✘ ${fallos.length} de ${hechas} comprobaciones fallan:\n`);
  for (const f of fallos) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(`✔ ${hechas} comprobaciones: la revisión de las Sombras ve lo que delata la senda y al kanchō, por los dos lados.`);
