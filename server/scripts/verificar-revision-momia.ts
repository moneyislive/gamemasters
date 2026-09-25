/**
 * La revisión adversaria de la Momia, sin gastar un céntimo.
 *
 *   npm run verify:revision-momia -w server
 *
 * NO SALE A LA RED. Ensambla una noche buena por el mismo camino que la de la
 * API (`ensamblarTramaMomia`) y le va metiendo los fallos que estropean esta
 * noche en concreto:
 *
 *   · EL ORDEN DE LOS RITOS, entero o A TROZOS: una frase de una narración que
 *     dice qué rito va antes que otro se lee como un fragmento regalado; la
 *     cámara de mañana adelantada; una ayuda que manda por mal camino; un
 *     desenlace que cuenta otro sellado; y la lógica que decide el código.
 *   · QUIEN ROMPIÓ EL SELLO, por los dos lados: señalado y escondido; y su sobre,
 *     que era el más gordo de la mesa en todas las partidas.
 *
 * Y el otro lado: la noche bien escrita sale LIMPIA.
 *
 * Además, los tres arreglos deterministas que salieron de mirar el juego:
 * `invocar` que no pasaba el fragmento, la tabla de marcas que imprimía las
 * cámaras de mañana y el «sin» que no contaba como negación.
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
import type { Restriccion, RestriccionEscrita, TramaMomia } from '../../shared/juegos/momia-tipos';
import type { RespuestaMomia } from '../src/plot/momia-esquema';
import type { LecturaDeMomento } from '../src/plot/revision-comun';

await import('../src/juegos/instalados');
const { cimientosDeMomia } = await import('../src/plot/momia-cimientos');
const { ensamblarTramaMomia, entidadesDeLaMomia, RECAMBIO_PUBLICO, saborDe, tramaDe } = await import('../src/plot/momia-generacion');
const { respuestaDeDemostracion } = await import('../src/plot/momia-demo');
const { redactar } = await import('../src/juegos/momia-puzle');
const { auditarTramaMomia, PRESUPUESTO_DE_CARA } = await import('../src/plot/momia-auditoria');
const { aplicarParchesMomia } = await import('../src/plot/momia-parches');
const { juzgarLaExpedicion } = await import('../src/plot/momia-lector');
const { ADAPTADOR_MOMIA, revisarTramaMomia } = await import('../src/plot/momia-revision');
const { construirPromptDelRevisorMomia, MOMIA_REVISION_SCHEMA, MOMIA_REVISION_DOSIERES_SCHEMA } = await import('../src/plot/momia-revisor');
const { construirPromptMomia } = await import('../src/plot/momia-prompt');
const { comprobarRedaccion, lexicoDeRitos, senalaAlSaqueador } = await import('../src/plot/momia-validacion');
const { mereceOtraPasada } = await import('../src/plot/revision-comun');
const { revisorDe } = await import('../src/juegos/revisores');
const { renderPrintableDocument } = await import('../src/docs/imprimibles/index');
const { cumple } = await import('../../shared/juegos/momia-tipos');

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
// La mesa: seis personas, cinco cámaras, tres reliquias, cinco ritos
// ---------------------------------------------------------------------------

const EXPEDICION = [
  { id: 'e1', name: 'Marta' },
  { id: 'e2', name: 'Bruno' },
  { id: 'e3', name: 'Carla' },
  { id: 'e4', name: 'Dani' },
  { id: 'e5', name: 'Elena' },
  { id: 'e6', name: 'Fabio' },
];
const CAMARAS = ['Antesala de los Sellos', 'Pozo de las Ofrendas', 'Corredor de las Estrellas', 'Cámara del Barquero', 'Sala de la Balanza'];
const RELIQUIAS = ['Escarabeo de lapislázuli', 'Máscara funeraria', 'Vaso canopo'];
const RITOS = ['Rito del Agua', 'Rito del Aliento', 'Rito del Nombre', 'Rito de la Balanza', 'Rito del Silencio'];

function nuevaPartida(): GameSession {
  const ahora = '2026-09-25T21:00:00.000Z';
  return {
    id: 'revision-momia',
    name: 'La tumba de prueba',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    entidades: {
      expedicionarios: EXPEDICION.map((e) => ({ ...e })),
      camaras: CAMARAS.map((name, i) => ({ id: `c${i + 1}`, name })),
      reliquias: RELIQUIAS.map((name, i) => ({ id: `q${i + 1}`, name })),
      ritos: RITOS.map((name, i) => ({ id: `t${i + 1}`, name })),
    },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'momia', model: 'claude-opus-5-5' },
  } as unknown as GameSession;
}

const game = nuevaPartida();
const entidades = entidadesDeLaMomia(game);
const cimientos = cimientosDeMomia(entidades, { semilla: 'revision-de-prueba' });
const trama = cimientos.trama;
const nombreRito = (id: string) => entidades.ritos.find((r) => r.id === id)?.name ?? id;
const nombreCamara = (id: string) => entidades.camaras.find((c) => c.id === id)?.name ?? id;
const orden = trama.ordenVerdadero;

const demo = respuestaDeDemostracion(game.name, entidades, trama);
const saqueadorId = demo.saqueadorId;
const saqueador = EXPEDICION.find((e) => e.id === saqueadorId)!;
const inocente = EXPEDICION.find((e) => e.id !== saqueadorId)!.id;

/*
 * La noche buena: la de demostración con lo que un buen modelo escribiría
 * distinto. Narraciones que no se repiten y que nombran SOLO la cámara de su
 * vigilia; carteles distintos; fragmentos con voz propia (la frase del código
 * con su «dice el papiro» delante, que sigue pasando la comprobación); todos con
 * una presentación de la misma extensión; y un desenlace que dice el orden y el
 * nombre.
 */
const NARRACIONES = [
  'El aire baja frío por la escalera y las lámparas tiemblan. Hoy la maldición duerme en {CAMARA}: quien entre ahí saldrá con algo escrito y algo encima.',
  'La segunda noche huele a polvo mojado. Nadie ha dormido. En {CAMARA} el aire pesa como agua, y eso es lo que se profana esta vez.',
  'Alguien ha dejado de hablar a media frase. La maldición se ha mudado a {CAMARA}, y desde el pozo sube un rumor que nadie reconoce.',
  'Queda poco para el alba. La última cámara profanada es {CAMARA}, y la mesa sabe ya lo que sabe: a partir de aquí, cada palabra pesa.',
];
const CARTELES = [
  'Quien entre sin nombre saldrá sin sombra.',
  'Aquí se ofreció el grano y se guardó el agua.',
  'Las estrellas del techo cuentan lo que el suelo calla.',
  'El barquero no cobra a quien vuelve.',
  'Lo que se pesa aquí no vuelve a la balanza.',
];
const PRESENTACION = (nombre: string) =>
  `${nombre} lleva con la misión desde la primera campaña, conoce a todo el mundo por su nombre y tiene una costumbre que se le nota desde lejos.`;
const conPapiro = (r: RestriccionEscrita) => ({ id: r.id, texto: `Dice el papiro: ${redactar(r.restriccion, nombreRito)}` });
const respuestaBuena: RespuestaMomia = {
  ...demo,
  expedicionarios: demo.expedicionarios.map((e) => ({ ...e, publicPersona: PRESENTACION(e.characterName) })),
  fragmentos: [...trama.restricciones, ...trama.falsasCandidatas].map(conPapiro),
  camaras: entidades.camaras.map((c, i) => ({ camaraId: c.id, inscripcion: CARTELES[i % CARTELES.length]! })),
  vigilias: trama.profanadas.map((camara, i) => ({
    ronda: i + 1,
    titulo: `Vigilia ${i + 1}`,
    texto: NARRACIONES[i % NARRACIONES.length]!.replace('{CAMARA}', nombreCamara(camara)),
    indicacion: '',
  })),
  desenlace: {
    ...demo.desenlace,
    reconstruccion:
      `Se selló por fin, en este orden: ${orden.map(nombreRito).join(', ')}. Y el sello no se había roto solo: ` +
      `lo rompió ${saqueador.name}, que bajó con la lámpara de repuesto la noche de la cena y golpeó la juntura por encargo de un comprador.`,
  },
};
const ensamblada = ensamblarTramaMomia(game, entidades, cimientos, respuestaBuena);
const buena = ensamblada.plot;
const tramaBuena = tramaDe(buena) as TramaMomia;
const lexico = lexicoDeRitos(entidades.ritos.map((r) => ({ id: r.id, name: r.name })));

function conCambio(cambiar: (p: Plot, t: TramaMomia) => void, base: Plot = buena): Plot {
  const p = structuredClone(base);
  cambiar(p, tramaDe(p) as TramaMomia);
  return p;
}
const auditar = (p: Plot, g: GameSession = game) => auditarTramaMomia(g, p).hallazgos;
const personaje = (p: Plot, id: string) => p.characters.find((c) => c.participanteId === id)!;
const enNarracion = (texto: string, v = 1) =>
  conCambio((p) => {
    p.material!.narrations.find((n) => n.round === v)!.text = texto;
  });

// Una restricción cierta y otra falsa entre dos ritos, para las frases de prueba.
const [a, b] = [orden[0]!, orden[3]!];
const cierta = `El ${nombreRito(a)} va antes que el ${nombreRito(b)}, eso lo sabe cualquiera que haya bajado.`;
const falsa = `El ${nombreRito(b)} va antes que el ${nombreRito(a)}, eso lo sabe cualquiera que haya bajado.`;

// ---------------------------------------------------------------------------
// 1. La noche buena
// ---------------------------------------------------------------------------

paso('La noche buena, ensamblada por el mismo camino que la de la API');
{
  comprobar('todas las frases de papiro con su «dice el papiro» se aceptan', ensamblada.redaccion.aceptadas === ensamblada.redaccion.total, ensamblada.redaccion);
  comprobar('quien rompió el sello es quien dijo el modelo', buena.solution?.respuestas?.saqueador === saqueadorId);
  comprobar('las frases de prueba se leen como fragmentos', comprobarRedaccion({ tipo: 'antes', a, b }, cierta, lexico).bien && cumple(orden, { tipo: 'antes', a, b }));
}

paso('Una noche bien escrita sale limpia: un auditor que avisa de todo no lo lee nadie');
{
  const hs = auditar(buena);
  comprobar('ni un aviso grave ni bloqueante', serios(hs).length === 0, serios(hs));
  comprobar('ni siquiera menores', hs.length === 0, hs);
  const { informe } = await revisarTramaMomia(game, buena, nada, 'completa');
  comprobar('sin clave, la noche bien escrita es «apta»', informe.veredicto === 'apta', informe);
}

paso('La de demostración no pasa por buena');
{
  const hs = auditar(ensamblarTramaMomia(game, entidades, cimientos, demo).plot);
  comprobar('los fragmentos con la frase del código se ven', tiene(hs, 'fragmentos-del-codigo', 'grave'), hs);
  comprobar('las narraciones que dicen lo mismo', tiene(hs, 'vigilias-repetidas'), hs);
  comprobar('los carteles calcados', tiene(hs, 'carteles-repetidos'), hs);
  comprobar('y el desenlace que no dice quién fue', tiene(hs, 'desenlace-sin-saqueador'), hs);
}

// ---------------------------------------------------------------------------
// 2. El orden, entero o a trozos
// ---------------------------------------------------------------------------

paso('El orden de los ritos no se dice, ni entero ni a trozos');
{
  comprobar(
    'una narración que enumera los cinco en su orden es bloqueante',
    tiene(auditar(enNarracion(`Se sabe ya: ${orden.map(nombreRito).join(', luego ')}.`)), 'orden-en-texto', 'bloqueante'),
  );
  const fuga = auditar(enNarracion(cierta, 2)).filter((h) => h.codigo === 'insinua-orden');
  comprobar('un trozo cierto en una narración: un fragmento regalado', fuga.length === 1 && /CIERTO/.test(fuga[0]!.texto), fuga);
  const pista = auditar(enNarracion(falsa, 2)).filter((h) => h.codigo === 'insinua-orden');
  comprobar('un trozo falso: manda a la mesa por mal camino', pista.length === 1 && /falso/.test(pista[0]!.texto), pista);
  const lugar = orden.indexOf(a) + 1;
  const ordinal = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto'][lugar - 1]!;
  comprobar(
    'y el lugar de un rito en un cartel',
    tiene(
      auditar(
        conCambio((p) => {
          saborDe(p)!.inscripciones.c1 = `En esta antesala se decide que el ${nombreRito(a)} sea el ${ordinal} de la ceremonia.`;
        }),
      ),
      'insinua-orden',
    ),
  );
  const extremo = orden[0]!;
  comprobar(
    'una ayuda de nivel 3 que dice un extremo que es verdad, sí vale',
    !tiene(
      auditar(
        conCambio((p) => {
          p.material!.hints.find((h) => h.level === 3)!.text = `Mirad bien: el ${nombreRito(extremo)} abre o cierra la ceremonia, nunca va en medio.`;
        }),
      ),
      'ayuda-falsa',
    ),
  );
  comprobar(
    'una que dice un trozo falso, no',
    tiene(
      auditar(
        conCambio((p) => {
          p.material!.hints.find((h) => h.level === 3)!.text = falsa;
        }),
      ),
      'ayuda-falsa',
      'grave',
    ),
  );
}

paso('La cámara de mañana no se dice hoy');
{
  const futura = nombreCamara(tramaBuena.profanadas[2]!);
  const hoy = nombreCamara(tramaBuena.profanadas[0]!);
  if (futura !== hoy) {
    comprobar(
      'una narración de la primera vigilia que maldice la cámara de la tercera',
      tiene(auditar(enNarracion(`La maldición ya espera en ${futura}, y lo sabe todo el mundo.`, 1)), 'profanada-adelantada', 'grave'),
    );
  }
  comprobar(
    'la de su propia vigilia se puede decir: se anuncia al abrirla',
    !tiene(auditar(enNarracion(`La maldición espera esta noche en ${hoy}, y lo sabe todo el mundo.`, 1)), 'profanada-adelantada'),
  );
}

// ---------------------------------------------------------------------------
// 3. Quien rompió el sello: ni señalado ni escondido
// ---------------------------------------------------------------------------

paso('Quien rompió el sello, señalado');
{
  comprobar(
    'nombrado en la sinopsis, donde no sale nadie',
    tiene(auditar(conCambio((p) => (p.synopsis = `${p.synopsis} ${saqueador.name} no ha dormido desde la cena.`))), 'nombra-al-saqueador', 'grave'),
  );
  comprobar(
    'acusado en lo que otro cuenta en la mesa',
    tiene(auditar(conCambio((p) => personaje(p, inocente).knowledge!.push(`Todo el mundo sabe que ${saqueador.name} rompió el sello aquella noche.`))), 'senala-al-saqueador', 'bloqueante'),
  );
  comprobar(
    '«fue el último en entrar» ya no es una acusación',
    !senalaAlSaqueador(`${saqueador.name} fue el último en entrar en el corredor.`, [saqueador.name]),
  );
  comprobar(
    '«el doctor» no nombra al doctor Harlow en cualquier frase',
    !tiene(
      auditar(
        conCambio((p) => {
          personaje(p, saqueadorId).characterName = 'El doctor Harlow';
          p.synopsis = `${p.synopsis} El doctor de la misión llegó tarde a la cena.`;
        }),
      ),
      'nombra-al-saqueador',
    ),
  );
  comprobar(
    'otro secreto que también dice que rompió el sello: habría dos',
    tiene(auditar(conCambio((p) => (personaje(p, inocente).secret = 'Rompiste el sello aquella noche y nadie lo sabe todavía.'))), 'otro-saqueador'),
  );
}

paso('Quien rompió el sello, escondido: el mismo trato que los demás, no menos');
{
  const sinQueLoNombren = conCambio((p) => {
    for (const c of p.characters.filter((x) => x.participanteId !== saqueadorId)) {
      c.knowledge = (c.knowledge ?? []).map((k) => k.replaceAll(saqueador.name, 'Alguien de la misión'));
      c.alibi = (c.alibi ?? '').replaceAll(saqueador.name, 'alguien');
    }
  });
  comprobar('el único del que nadie habla', tiene(auditar(sinQueLoNombren), 'saqueador-intocable', 'grave'));
  comprobar('una presentación que no se parece', tiene(auditar(conCambio((p) => (personaje(p, saqueadorId).publicPersona = 'Excava.'))), 'saqueador-distinto'));
  comprobar('el único que no sabe nada de los demás', tiene(auditar(conCambio((p) => (personaje(p, saqueadorId).knowledge = []))), 'saqueador-distinto'));
}

paso('El sobre de quien rompió el sello no puede ser el más gordo');
{
  const largo = (n: number) => 'La lámpara parpadea en el corredor. '.repeat(Math.ceil(n / 36)).slice(0, n);
  comprobar(
    'un dosier que se desborda es grave',
    tiene(auditar(conCambio((p) => (personaje(p, inocente).secret = largo(PRESUPUESTO_DE_CARA.secretos + 50)))), 'dosier-que-desborda', 'grave'),
  );
  comprobar(
    'y si es el de quien rompió el sello, bloqueante',
    tiene(auditar(conCambio((p) => (personaje(p, saqueadorId).secret = largo(PRESUPUESTO_DE_CARA.secretos + 50)))), 'dosier-que-desborda', 'bloqueante'),
  );
  comprobar(
    'y su motivo, en la única cara que solo tiene él, también',
    tiene(auditar(conCambio((p) => (p.solution!.motive = largo(PRESUPUESTO_DE_CARA.motivoDelSaqueador + 50)))), 'dosier-que-desborda', 'bloqueante'),
  );

  const dosieres = EXPEDICION.map((e) => ({ id: e.id, html: renderPrintableDocument({ ...game, plot: buena }, 'dosier-expedicionario', { soloPara: e.id })?.html ?? '' }));
  const caras = (html: string) => (html.match(/class="pagina"/g) ?? []).length;
  const almagre = (html: string) => (html.match(/caja--almagre/g) ?? []).length - (html.match(/\.caja--almagre/g) ?? []).length;
  const suyo = dosieres.find((d) => d.id === saqueadorId)!;
  comprobar('todos los dosieres se componen', dosieres.every((d) => d.html.length > 1000));
  comprobar('todos con los mismos saltos de cara', new Set(dosieres.map((d) => caras(d.html))).size === 1, dosieres.map((d) => caras(d.html)));
  comprobar('la cara privada con el mismo aspecto: ni una caja almagre de más', new Set(dosieres.map((d) => almagre(d.html))).size === 1, dosieres.map((d) => almagre(d.html)));
  comprobar('le dice que fue él, y solo a él', suyo.html.includes('Fuiste tú') && dosieres.filter((d) => d.html.includes('Fuiste tú')).length === 1);
  comprobar(
    'sin «cómo lo hizo», que es de quien dirige y era lo más largo',
    !!buena.solution?.howItHappened && !suyo.html.includes(buena.solution.howItHappened.slice(0, 60)),
  );
  const tabla = (html: string) => /<h2>Quiénes van<\/h2>[\s\S]*?<\/table>/.exec(html)?.[0] ?? '';
  comprobar(
    '«Quiénes van» es la misma tabla en todos, con todo el mundo dentro',
    tabla(suyo.html).length > 0 && dosieres.every((d) => tabla(d.html) === tabla(suyo.html)) && EXPEDICION.every((e) => tabla(suyo.html).includes(e.name)),
  );
}

// ---------------------------------------------------------------------------
// 4. La lógica: la decide el código y el revisor no la toca
// ---------------------------------------------------------------------------

paso('El orden y sus fragmentos, que decide el código');
const delOrden = new Set<string>();
{
  const anotar = (hs: HallazgoDeRevision[], codigo: string) => hs.filter((h) => h.codigo === codigo).forEach((h) => delOrden.add(h.codigo));
  const roto = auditar(conCambio((_, t) => t.restricciones.shift()));
  comprobar('sin una restricción cierta el orden deja de ser uno', tiene(roto, 'orden-roto', 'bloqueante'), roto);
  anotar(roto, 'orden-roto');
  const cambiada: Restriccion = { tipo: 'posicion', a: orden[0]!, posicion: 1 };
  const cierta2 = auditar(conCambio((_, t) => (t.falsasCandidatas[0] = { ...t.falsasCandidatas[0]!, restriccion: cambiada })));
  comprobar('una mentira que resulta ser verdad', tiene(cierta2, 'mentira-cierta'), cierta2);
  anotar(cierta2, 'mentira-cierta');
  const sinMentiras = auditar(conCambio((_, t) => (t.falsasCandidatas = [])));
  comprobar('sin mentiras preparadas', tiene(sinMentiras, 'sin-mentiras'));
  anotar(sinMentiras, 'sin-mentiras');
  const perdido = auditar(conCambio((_, t) => (t.hallazgos = t.hallazgos.filter((h) => h.fragmentoId !== t.restricciones[0]!.id))));
  comprobar('un fragmento que no aparece en ninguna cámara', tiene(perdido, 'fragmento-sin-sitio', 'bloqueante'));
  anotar(perdido, 'fragmento-sin-sitio');

  const renombrada = structuredClone(game);
  const ritos = (renombrada.entidades as Record<string, Array<{ id: string; name: string }>>).ritos!;
  const citado = tramaBuena.restricciones[0]!.restriccion.a;
  ritos.find((r) => r.id === citado)!.name = 'Rito de la Grulla';
  comprobar('un rito renombrado deja un fragmento cierto que ya no dice su restricción', tiene(auditar(buena, renombrada), 'fragmento-desalineado', 'bloqueante'));

  const iguales = structuredClone(game);
  const dos = (iguales.entidades as Record<string, Array<{ id: string; name: string }>>).ritos!;
  dos[0]!.name = 'Rito';
  dos[1]!.name = 'Rito';
  const ambiguos = auditar(buena, iguales);
  comprobar('dos ritos que no se distinguen por su nombre', tiene(ambiguos, 'ritos-indistinguibles'));
  anotar(ambiguos, 'ritos-indistinguibles');
}

paso('Lo que el revisor no puede arreglar no pide otra pasada');
{
  const h = (codigo: string): HallazgoDeRevision => ({ codigo, gravedad: 'bloqueante', origen: 'auditoria', texto: codigo, estado: 'pendiente' });
  const corregible = ADAPTADOR_MOMIA.corregible?.bind(ADAPTADOR_MOMIA);
  comprobar('un orden roto no pide otra pasada', !mereceOtraPasada([h('orden-roto')], corregible));
  comprobar('una filtración, sí', mereceOtraPasada([h('filtracion-inicial')], corregible));
  const sinMarcar = [...delOrden].filter((c) => corregible?.(h(c)));
  comprobar('todo aviso de la lógica está entre los que el revisor no arregla', sinMarcar.length === 0, sinMarcar);
}

// ---------------------------------------------------------------------------
// 5. La expedición ciega
// ---------------------------------------------------------------------------

paso('La expedición ciega: ni señalarlo por lo leído, ni exculparlo');
{
  const ids = buena.characters.map((c) => c.participanteId);
  const lectura = (momento: number, alSaqueador: number): LecturaDeMomento => ({
    momento,
    reparto: Object.fromEntries(ids.map((id) => [id, id === saqueadorId ? alSaqueador : (1 - alSaqueador) / (ids.length - 1)])),
    razon: 'prueba',
    pistaDecisiva: '',
    cadena: [],
  });
  const vigilias = tramaBuena.profanadas.length;
  const juzgar = (ls: LecturaDeMomento[]) => juzgarLaExpedicion(game, buena, ls, vigilias);
  comprobar('repartida por igual, nada', juzgar([lectura(0, 1 / 6), lectura(vigilias, 1 / 6)]).length === 0);
  comprobar('en cabeza antes de empezar, con un 65 %: bloqueante', tiene(juzgar([lectura(0, 0.65)]), 'filtracion-inicial', 'bloqueante'));
  comprobar('exculpado en todos los momentos, también se avisa', tiene(juzgar([lectura(0, 0.02), lectura(vigilias, 0.02)]), 'saqueador-invisible', 'grave'));
}

// ---------------------------------------------------------------------------
// 6. Los parches
// ---------------------------------------------------------------------------

paso('Los parches: solo prosa, con los mismos filtros que la generación');
{
  const con = (cambios: Parameters<typeof aplicarParchesMomia>[2]) => aplicarParchesMomia(game, buena, cambios, false);
  const fichaDe = (id: string) => respuestaBuena.expedicionarios.find((e) => e.participanteId === id)!;

  const colado = con({ ordenVerdadero: [...orden].reverse(), profanadas: [], saqueadorId: inocente } as never);
  const t = tramaDe(colado.plot) as TramaMomia;
  comprobar(
    'el orden, las cámaras profanadas y quien rompió el sello no se mueven aunque vengan en el sobre',
    t.ordenVerdadero.join() === orden.join() && t.profanadas.join() === tramaBuena.profanadas.join() && colado.plot.solution?.respuestas?.saqueador === saqueadorId,
  );

  const narra = (texto: string, ronda = 1) => con({ vigilias: [{ ronda, titulo: 'Una vigilia', texto, indicacion: '' }] });
  const conTrozo = narra(`${cierta} El aire baja frío por la escalera y nadie habla desde la cena.`);
  comprobar('una narración con un trozo del orden no entra', conTrozo.rechazados.some((r) => /trozo del orden/.test(r)), conTrozo.rechazados);
  const nombrandole = narra(`${saqueador.name} camina el último, y nadie le pregunta por qué. El aire baja frío por la escalera.`);
  comprobar('ni una que nombra a quien rompió el sello', nombrandole.rechazados.some((r) => /nombra a quien/.test(r)), nombrandole.rechazados);
  const futura = nombreCamara(tramaBuena.profanadas[2]!);
  if (futura !== nombreCamara(tramaBuena.profanadas[0]!)) {
    const adelanta = narra(`La maldición ya espera en ${futura}, y lo sabe todo el mundo. El aire baja frío por la escalera.`);
    comprobar('ni una que adelanta la cámara de otra vigilia', adelanta.rechazados.some((r) => /adelanta/.test(r)), adelanta.rechazados);
  }
  const buenaVigilia = narra(`Se abre la vigilia con el viento dentro de la casa. Esta noche la maldición está en ${nombreCamara(tramaBuena.profanadas[0]!)}, y quien entre sabrá por qué.`);
  comprobar('una buena, sí', buenaVigilia.aplicados.includes('la narración de la vigilia 1'), buenaVigilia);

  const r = trama.restricciones[0]!;
  const noVale = con({ fragmentos: [{ id: r.id, texto: 'Nada de lo que se dice en este papiro es cierto, y ningún rito importa.' }] });
  comprobar('un fragmento que no se puede verificar no entra', noVale.rechazados.some((x) => x.startsWith(`el fragmento «${r.id}»`)), noVale.rechazados);
  const vale = con({ fragmentos: [{ id: r.id, texto: `Así lo dejó escrito el escriba: ${redactar(r.restriccion, nombreRito)}` }] });
  comprobar('uno que sí dice su restricción entra', vale.aplicados.includes(`el fragmento «${r.id}»`), vale);

  const ayudaMala = con({ ayudas: [{ nivel: 3, texto: `${falsa} Buscad lo que no encaja con eso.` }] });
  comprobar('una ayuda que manda por mal camino no entra', ayudaMala.rechazados.some((x) => /no es verdad/.test(x)), ayudaMala.rechazados);
  const ayudaBuena = con({
    ayudas: [{ nivel: 3, texto: `Si os atascáis, fijaos en esto: el ${nombreRito(orden[0]!)} abre o cierra la ceremonia, nunca va en medio.` }],
  });
  comprobar('una que dice un extremo cierto, sí', ayudaBuena.aplicados.includes('la ayuda de nivel 3'), ayudaBuena);

  const finalMalo = con({ reconstruccion: `Se selló como se pudo, y amaneció. ${saqueador.name} rompió el sello por una hermana enferma en un sanatorio suizo.` });
  comprobar('un desenlace sin el orden no entra', finalMalo.rechazados.some((x) => /orden/.test(x)), finalMalo.rechazados);
  const finalBueno = con({
    reconstruccion: `Se selló en este orden: ${orden.map(nombreRito).join(', ')}. Lo rompió ${saqueador.name}, por una hermana enferma en un sanatorio suizo, y nadie lo vio.`,
  });
  comprobar('uno con el orden y el nombre, sí', finalBueno.aplicados.includes('la reconstrucción'), finalBueno);

  const largo = 'La lámpara parpadea en el corredor. '.repeat(80);
  const gordo = con({ fichas: [{ ...fichaDe(saqueadorId), secret: largo }] });
  comprobar('un dosier que no cabría no entra', gordo.rechazados.some((x) => /no cabría/.test(x)), gordo.rechazados);
  comprobar('y no deja nada a medias', personaje(gordo.plot, saqueadorId).secret === personaje(buena, saqueadorId).secret);
  const motivoLargo = con({ motivoDelSaqueo: largo });
  comprobar('ni un motivo que no cabe en su cara', motivoLargo.rechazados.some((x) => /no cabría/.test(x)), motivoLargo.rechazados);
  const acusa = con({
    fichas: [{ ...fichaDe(inocente), knowledge: [`${saqueador.name} rompió el sello, lo vi con estos ojos.`, 'Bruno sabe más de esta tumba de lo que dice.'] }],
  });
  comprobar(
    'lo que alguien cuenta que acusa a quien rompió el sello se queda fuera',
    !personaje(acusa.plot, inocente).knowledge!.some((k) => /rompió el sello/.test(k)),
    personaje(acusa.plot, inocente).knowledge,
  );
}

// ---------------------------------------------------------------------------
// 7. Los encargos y el alta
// ---------------------------------------------------------------------------

paso('Lo que viaja a cada modelo, y el alta');
{
  const escritor = construirPromptMomia(game, trama, entidades);
  comprobar('al que escribe se le prohíbe el orden también a trozos', /TAMPOCO A TROZOS/.test(escritor));
  comprobar('y se le pide el mismo trato para todos', /EL MISMO TRATO PARA TODOS/.test(escritor));
  const revisor = construirPromptDelRevisorMomia(game, buena, { auditoria: 'AUDITORÍA DE PRUEBA', lecturas: 'LECTURAS DE PRUEBA', hallazgos: [] }, { soloMaterial: false, pasada: 0 });
  comprobar('al que revisa le llega el orden', orden.every((id, i) => revisor.includes(`${i + 1}. ${nombreRito(id)}`)));
  comprobar('y qué cámara se profana cada vigilia', tramaBuena.profanadas.every((id, i) => revisor.includes(`vigilia ${i + 1}: ${nombreCamara(id)}`)));
  comprobar('y quién rompió el sello', revisor.includes(`Quién rompió el sello: ${personaje(buena, saqueadorId).characterName}`));
  const claves = (esquema: unknown) => Object.keys((esquema as { properties: { cambios: { properties: object } } }).properties.cambios.properties).sort().join();
  comprobar(
    'el esquema del primer turno solo tiene sitio para prosa',
    claves(MOMIA_REVISION_SCHEMA) ===
      ['ambientacion', 'apertura', 'ayudas', 'camaras', 'confesion', 'epilogo', 'faraon', 'fragmentos', 'guion', 'lema', 'reconstruccion', 'ritos', 'sinopsis', 'titulo', 'vigilias'].join(),
    claves(MOMIA_REVISION_SCHEMA),
  );
  comprobar('y el del segundo, para los dosieres', claves(MOMIA_REVISION_DOSIERES_SCHEMA) === ['comoOcurrio', 'fichas', 'motivoDelSaqueo'].join());
  comprobar('la Momia tiene revisor', revisorDe('momia') === revisarTramaMomia);
  const instalados = fs.readFileSync(path.join(import.meta.dirname, '..', 'src', 'juegos', 'instalados.ts'), 'utf8');
  comprobar('y lo da de alta `instalados.ts`', /^import '\.\.\/plot\/momia-revision';$/m.test(instalados));
}

// ---------------------------------------------------------------------------
// 8. Los tres arreglos deterministas
// ---------------------------------------------------------------------------

paso('Lo que salió de mirar el juego: «invocar», la tabla de marcas y el «sin»');
{
  const acciones = fs.readFileSync(path.join(import.meta.dirname, '..', 'src', 'juegos', 'momia-acciones.ts'), 'utf8');
  const reductor = /invocar: \(\{[^}]*\}\) =>\s*invocarDon\([^)]*\{([\s\S]*?)\}\)/.exec(acciones)?.[1] ?? '';
  comprobar('el reductor de «invocar» pasa el fragmento que eligió quien juega', /fragmento:\s*datos\.fragmento/.test(reductor), reductor);

  const tabla = renderPrintableDocument({ ...game, plot: buena }, 'tabla-marcas', {})?.html ?? '';
  const seccion = /Qué se profana cada noche[\s\S]*?<\/table>/.exec(tabla)?.[0] ?? '';
  comprobar('la tabla de marcas se compone', seccion.length > 0);
  comprobar('y no imprime qué cámara se profana cada noche: está a la vista', entidades.camaras.every((c) => !seccion.includes(c.name)));

  const rito = orden[0]!;
  const conSin = `El ${nombreRito(rito)}, sin ser el tercero, abre la ceremonia de los muertos.`;
  comprobar('«sin ser el tercero» ya no pasa por «es el tercero»', !comprobarRedaccion({ tipo: 'posicion', a: rito, posicion: 3 }, conSin, lexico).bien);
  comprobar('y sí se lee como «no es el tercero»', comprobarRedaccion({ tipo: 'no-posicion', a: rito, posicion: 3 }, conSin, lexico).bien);
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length) {
  console.log(`✘ ${fallos.length} de ${hechas} comprobaciones fallan:\n`);
  for (const f of fallos) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(`✔ ${hechas} comprobaciones: la revisión de la Momia ve el orden a trozos y a quien rompió el sello, por los dos lados.`);
