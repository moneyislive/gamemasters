/**
 * La revisión adversaria de CLUEDO, sin gastar un céntimo.
 *
 *   npm run verify:revision -w server
 *
 * NO SALE A LA RED. Monta una trama sintética con los fallos que estropearon
 * veladas de verdad y comprueba que cada pieza de la revisión los ve:
 *
 *   · la AUDITORÍA, que cuenta con código: el resumen que nombra tres veces a
 *     la asesina (la casa Sabrón), las armas que no nombra nadie y el personaje
 *     de relleno (Villa CASAS), la pista de la última ronda que dicta el nombre;
 *   · el JUICIO de las lecturas del detective: que avise si la mesa ya sabe
 *     quién fue antes de empezar, si al final no puede saberlo, o si una sola
 *     pista lo dice todo;
 *   · los PARCHES del revisor: que no toquen la solución, que no empobrezcan,
 *     que no dejen salas sin pistas ni un reparto de giros que delate;
 *   · y el DOSIER IMPRESO: que el del culpable no se distinga por fuera. En la
 *     casa Sabrón su sobre era un 23 % más gordo, porque solo él llevaba el
 *     relato del crimen, en un recuadro rojo. La auditoría no lo veía: medía los
 *     campos del personaje y el bloque lo añadía el que imprime.
 *
 * Y comprueba también el extremo contrario, que es el que Miguel pidió vigilar
 * expresamente: una trama «corregida» donde a la persona culpable no la nombra
 * nadie también es una trama rota.
 *
 * Lo que esto NO prueba es si el modelo encuentra y arregla los fallos: eso solo
 * se ve llamando a la API, y lo hace `revisar-trama-real.ts` a mano, sabiendo lo
 * que cuesta.
 */
// Sin clave, pase lo que pase en el `.env`: esto no puede llamar a la API.
process.env.ANTHROPIC_API_KEY = '';

const { auditarTramaCluedo } = await import('../src/plot/cluedo-auditoria');
const { juzgarLecturas } = await import('../src/plot/cluedo-detective');
const { aplicarParches } = await import('../src/plot/cluedo-parches');
const { maximoDeGiros } = await import('../src/plot/cluedo-material');
const { revisarTramaCluedo } = await import('../src/plot/cluedo-revision');
const { REVISION_TRAMA_SCHEMA, REVISION_MATERIAL_SCHEMA, REVISION_SOLO_MATERIAL_SCHEMA } = await import('../src/plot/cluedo-revisor');
const { DETECTIVE_SCHEMA } = await import('../src/plot/cluedo-detective');
const { respuestasCluedo } = await import('../src/juegos/cluedo');
const { pistasDeLaTrama } = await import('../../shared/mecanicas/pistas');
import type { GameSession, HallazgoDeRevision, Plot } from '../../shared/types';
import type { LecturaCompleta } from '../src/plot/cluedo-detective';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 400)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const tiene = (hs: HallazgoDeRevision[], codigo: string, gravedad?: string) =>
  hs.some((h) => h.codigo === codigo && (!gravedad || h.gravedad === gravedad));

// ---------------------------------------------------------------------------
// La mesa: siete personas, cinco salas, cuatro objetos
// ---------------------------------------------------------------------------

const GENTE = ['Babi', 'Cuchi', 'Nacho', 'Geli', 'Margarita', 'Miguel', 'Chaco'];
const PERSONAJES = [
  'Bárbara Alcaraz',
  'Condesa Cuchi Montenegro',
  'Ignacio Velasco',
  'Angélica Rivas',
  'Margarita Sotomayor',
  'Miguel Ibarra',
  'Chaco Belmonte',
];
const SALAS = ['Biblioteca', 'Invernadero', 'Bodega', 'Terraza', 'Cocina'];
const OBJETOS = ['Samovar de cobre', 'Abrecartas de plata', 'Cordón de cortina', 'Candelabro'];

const game: GameSession = {
  id: 'revision-prueba',
  name: 'Villa de prueba',
  status: 'ready',
  createdAt: '2026-09-25T20:00:00.000Z',
  updatedAt: '2026-09-25T20:00:00.000Z',
  entidades: {
    sospechosos: GENTE.map((name, i) => ({ id: `s${i}`, name })),
    salas: SALAS.map((name, i) => ({ id: `r${i}`, name })),
    objetos: OBJETOS.map((name, i) => ({ id: `o${i}`, name })),
  },
  boardMode: 'generated',
  settings: { language: 'es' },
};

const CULPABLE = 's1'; // Cuchi
const ARMA = 'o1'; // el abrecartas
const SALA = 'r2'; // la bodega

/**
 * Una trama EQUILIBRADA: cada persona sale lo mismo en lo público, en los
 * dosieres de los demás y en las pistas; cada objeto tiene dueño y pistas;
 * cada sala, las suyas; y nadie tiene un dosier desproporcionado.
 */
function tramaEquilibrada(): Plot {
  const personajes = GENTE.map((_, i) => {
    const otro = (i + 1) % GENTE.length;
    const objeto = OBJETOS[i % OBJETOS.length]!;
    return {
      participanteId: `s${i}`,
      characterName: PERSONAJES[i]!,
      role: 'Invitada de la casa',
      publicPersona: `Viejo amigo de la familia, siempre cerca del anfitrión.`,
      secret: `Debe dinero al anfitrión y esa noche guardó el ${objeto.toLowerCase()} en un cajón.`,
      motive: 'Una deuda antigua que el anfitrión pensaba reclamar.',
      alibi: 'Dice que estuvo en la terraza tomando el aire entre las diez y las diez y media.',
      knowledge: [`Vio a ${PERSONAJES[otro]} salir con prisa del pasillo a las diez y cuarto.`],
      personalHook: 'Juega con su forma de ser.',
    };
  });
  const pistas = [];
  let n = 0;
  for (let r = 1; r <= 4; r++) {
    for (let k = 0; k < 4; k++) {
      const i = (r * 2 + k) % GENTE.length;
      const objeto = OBJETOS[(r + k) % OBJETOS.length]!;
      pistas.push({
        id: `pista-${++n}`,
        lugarId: `r${(r + k) % SALAS.length}`,
        description: `Una marca junto al ${objeto.toLowerCase()} que recuerda a ${PERSONAJES[i]}.`,
        pointsTo: `Sugiere que ${PERSONAJES[i]} pasó por aquí más tarde de lo que dice.`,
        round: r,
      });
    }
  }
  return {
    title: 'El abrecartas y la bodega',
    tagline: 'Siete invitados, un anfitrión muerto.',
    synopsis: 'El anfitrión ha aparecido muerto después de la cena. Todos tenían una razón para odiarle.',
    setting: 'Una casa de campo convertida en mansión de los años veinte.',
    victim: { name: 'Don Aurelio Casas', description: 'El anfitrión, prestamista de todos.' },
    solution: {
      respuestas: respuestasCluedo({ murdererId: CULPABLE, weaponId: ARMA, lugarId: SALA }),
      motive: 'La deuda.',
      howItHappened: 'Durante el apagón.',
    },
    characters: personajes,
    timeline: [
      { time: '21:00', description: 'Llegan todos a cenar.', participanteIds: GENTE.map((_, i) => `s${i}`), isPublic: true },
      { time: '22:00', description: 'Apagón.', participanteIds: GENTE.map((_, i) => `s${i}`), isPublic: true },
      ...GENTE.map((_, i) => ({ time: `22:1${i}`, description: 'Se mueve por la casa.', participanteIds: [`s${i}`], isPublic: false })),
      { time: '23:00', description: 'Aparece el cuerpo.', participanteIds: [], isPublic: true },
    ],
    gmScript: ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis'],
    mecanicas: { pistas },
    material: {
      narrations: [0, 1, 2, 3, 4].map((round) => ({ round, title: `Tramo ${round}`, text: 'Se abre un tramo nuevo de la noche.', stageDirection: '' })),
      twists: [
        { id: 'giro-1', participanteId: 's0', round: 2, instruction: 'Recuerdas algo.' },
        { id: 'giro-2', participanteId: 's2', round: 3, instruction: 'Recuerdas otra cosa.' },
      ],
      timelineReveals: [1, 2, 3, 4].map((round) => ({ round, time: '22:15', fact: 'Alguien no estaba donde dijo.' })),
      hints: [
        { level: 1, text: 'Mirad la cronología.' },
        { level: 2, text: 'Algo cambió de sitio.' },
        { level: 3, text: 'Fue en la bodega.' },
      ],
      finale: { reconstruction: 'Así pasó.', confession: 'Fui yo.', epilogue: 'Y luego.' },
      generatedAt: '2026-09-25T20:00:00.000Z',
    },
  };
}

// ---------------------------------------------------------------------------

paso('Una trama equilibrada no da avisos graves');
{
  const a = auditarTramaCluedo(game, tramaEquilibrada());
  const serios = a.hallazgos.filter((h) => h.gravedad !== 'menor');
  comprobar('sin avisos bloqueantes ni graves', serios.length === 0, serios);
  comprobar('cuenta a las siete personas', a.personas.length === 7);
  comprobar('marca a la culpable', a.personas.find((p) => p.esCulpable)?.participanteId === CULPABLE);
  comprobar('cuatro rondas', a.rondas === 4);
  comprobar('los cuatro objetos tienen pistas', a.objetos.every((o) => o.pistas > 0), a.objetos);
}

paso('La casa Sabrón: el resumen nombra tres veces a la asesina');
{
  const plot = tramaEquilibrada();
  plot.synopsis =
    'La condesa Cuchi Montenegro recibió a todos con frialdad. Nadie olvidará cómo miraba Cuchi al anfitrión, ' +
    'ni lo que Cuchi Montenegro dijo en el brindis.';
  const a = auditarTramaCluedo(game, plot);
  comprobar('avisa de que la apertura señala', tiene(a.hallazgos, 'apertura-senala', 'bloqueante'), a.hallazgos);
  const aviso = a.hallazgos.find((h) => h.codigo === 'apertura-senala');
  comprobar('y dice de quién habla', aviso?.sobre === CULPABLE, aviso);
  // Lo mismo con un inocente no es asunto de este aviso: es ambiente.
  const inocente = tramaEquilibrada();
  inocente.synopsis = 'Ignacio Velasco llegó tarde. Ignacio, siempre Ignacio Velasco.';
  comprobar(
    'nombrar tres veces a un inocente no dispara el aviso de apertura',
    !tiene(auditarTramaCluedo(game, inocente).hallazgos, 'apertura-senala'),
  );
}

paso('Villa CASAS: armas que no nombra nadie y alguien sin historia');
{
  const plot = tramaEquilibrada();
  // El candelabro desaparece de todo lo que ve la mesa y de los dosieres.
  for (const p of pistasDeLaTrama(plot)) p.description = p.description.replace(/candelabro/gi, 'objeto');
  for (const c of plot.characters) c.secret = (c.secret ?? '').replace(/candelabro/gi, 'objeto');
  // Y Geli se queda sin historia.
  const geli = plot.characters.find((c) => c.participanteId === 's3')!;
  geli.secret = 'Nada.';
  geli.motive = '';
  geli.alibi = 'En el salón.';
  geli.knowledge = [];
  geli.publicPersona = 'Invitada.';
  geli.role = '';
  geli.personalHook = '';
  for (const p of pistasDeLaTrama(plot)) {
    p.description = p.description.replace('Angélica Rivas', 'alguien');
    p.pointsTo = p.pointsTo.replace('Angélica Rivas', 'alguien');
  }
  for (const c of plot.characters) c.knowledge = c.knowledge.map((k) => k.replace('Angélica Rivas', 'alguien'));
  plot.timeline = plot.timeline.map((e) => ({ ...e, participanteIds: e.participanteIds.filter((id) => id !== 's3') }));
  const a = auditarTramaCluedo(game, plot);
  comprobar('el candelabro sale como objeto sin nombrar', a.hallazgos.some((h) => h.codigo === 'objeto-sin-nombrar' && h.sobre === 'o3'), a.hallazgos);
  comprobar(
    'y Geli como secundaria o con el dosier flaco',
    a.hallazgos.some((h) => (h.codigo === 'personaje-secundario' || h.codigo === 'dosier-flaco') && h.sobre === 's3'),
    a.hallazgos,
  );
}

paso('La última ronda de Villa CASAS: una pista que dicta el nombre');
{
  const plot = tramaEquilibrada();
  const ultima = pistasDeLaTrama(plot).find((p) => p.round === 4)!;
  ultima.description = 'Un guante con el monograma de Cuchi Montenegro, manchado de vino de la bodega.';
  ultima.pointsTo = 'Cuchi Montenegro es la asesina.';
  const a = auditarTramaCluedo(game, plot);
  comprobar('avisa de la pista que dicta', a.hallazgos.some((h) => h.codigo === 'pista-que-dicta' && h.sobre === ultima.id), a.hallazgos);
  comprobar('y en la ronda 4 es grave, no bloqueante', a.hallazgos.find((h) => h.codigo === 'pista-que-dicta')?.gravedad === 'grave');
  const temprana = tramaEquilibrada();
  const r1 = pistasDeLaTrama(temprana).find((p) => p.round === 1)!;
  r1.description = 'Una nota firmada por Cuchi Montenegro.';
  r1.pointsTo = 'Cuchi es la culpable.';
  comprobar(
    'la misma pista en la ronda 1 es bloqueante',
    tiene(auditarTramaCluedo(game, temprana).hallazgos, 'pista-que-dicta', 'bloqueante'),
  );
}

paso('El extremo contrario: a la culpable no la nombra nadie');
{
  const plot = tramaEquilibrada();
  const quitar = (t: string) => t.replace(/Condesa Cuchi Montenegro|Cuchi Montenegro|Cuchi/g, 'una invitada');
  for (const c of plot.characters) c.knowledge = c.knowledge.map(quitar);
  for (const p of pistasDeLaTrama(plot)) {
    if (p.round < 4) {
      p.description = quitar(p.description);
      p.pointsTo = quitar(p.pointsTo);
    }
  }
  const a = auditarTramaCluedo(game, plot);
  comprobar('avisa de que la culpable está a salvo', tiene(a.hallazgos, 'culpable-a-salvo', 'grave'), a.personas);
}

paso('El sobre más gordo y los giros que delatan');
{
  const plot = tramaEquilibrada();
  const cuchi = plot.characters.find((c) => c.participanteId === CULPABLE)!;
  cuchi.secret = `${cuchi.secret} `.repeat(6);
  const a = auditarTramaCluedo(game, plot);
  comprobar('avisa del dosier desproporcionado', tiene(a.hallazgos, 'dosier-del-culpable'), a.personas.map((p) => p.largoDelDosier));

  const conGiros = tramaEquilibrada();
  conGiros.material!.twists = GENTE.map((_, i) => `s${i}`)
    .filter((id) => id !== CULPABLE)
    .map((participanteId, i) => ({ id: `g${i}`, participanteId, round: 2, instruction: 'Algo.' }));
  comprobar(
    'avisa de que el único sin giro es la culpable',
    tiene(auditarTramaCluedo(game, conGiros).hallazgos, 'giros-delatores', 'bloqueante'),
  );
  comprobar('con siete a la mesa caben cinco giros', maximoDeGiros(7) === 5);
  comprobar('con tres, uno', maximoDeGiros(3) === 1);
  comprobar('con doce, seis', maximoDeGiros(12) === 6);
}

paso('Tu noche: el dosier del culpable, igual por fuera que los demás');
{
  const conNoche = (): Plot => {
    const plot = tramaEquilibrada();
    for (const c of plot.characters) {
      c.nightStory =
        'A las diez y cuarto saliste de la terraza y cruzaste el pasillo; volviste a las diez y media con las ' +
        'manos frías y nadie te preguntó nada. Lo que hiciste en ese cuarto de hora es lo que sostienes que no hiciste.';
    }
    return plot;
  };
  const deNoche = (hs: HallazgoDeRevision[]) => hs.filter((h) => ['noche-desigual', 'sin-noche', 'noche-flaca'].includes(h.codigo));
  comprobar('una noche pareja para cada cual no da avisos', deNoche(auditarTramaCluedo(game, conNoche()).hallazgos).length === 0);
  comprobar('una trama antigua, sin ninguna noche, no se marca', deNoche(auditarTramaCluedo(game, tramaEquilibrada()).hallazgos).length === 0);

  const larga = conNoche();
  const suya = larga.characters.find((c) => c.participanteId === CULPABLE)!;
  suya.nightStory = `${suya.nightStory} ${suya.nightStory}`;
  comprobar('la noche del culpable más larga que las demás se avisa', tiene(auditarTramaCluedo(game, larga).hallazgos, 'noche-desigual', 'grave'));

  const coja = conNoche();
  delete coja.characters.find((c) => c.participanteId === 's3')!.nightStory;
  comprobar(
    'si a alguien le falta la noche, se avisa de quién',
    auditarTramaCluedo(game, coja).hallazgos.some((h) => h.codigo === 'sin-noche' && h.sobre === 's3'),
  );

  const conEquipos = tramaEquilibrada();
  conEquipos.gmScript = [...conEquipos.gmScript, 'Al cerrar la ronda, cada equipo elige un portavoz que resume lo que ha encontrado.'];
  comprobar('un guion con equipos y portavoces se avisa', tiene(auditarTramaCluedo(game, conEquipos).hallazgos, 'guion-con-portavoces'));

  // ---- El dosier tal como sale de la imprenta ----
  await import('../src/juegos/instalados');
  const { renderPlayerDocument } = await import('../src/docs/renderer');
  const { CONSEJO_CULPABLE, CONSEJO_INOCENTE } = await import('../src/docs/cluedo-dosieres');
  const conTrama: GameSession = { ...game, plot: conNoche() };
  const textoDe = (html: string) =>
    html
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const dosieres = GENTE.map((_, i) => {
    const html = renderPlayerDocument(conTrama, `s${i}`, { variant: 'blanco' })?.html ?? '';
    return { id: `s${i}`, html, largo: textoDe(html).length };
  });
  const delCulpable = dosieres.find((d) => d.id === CULPABLE)!;
  const inocentes = dosieres.filter((d) => d.id !== CULPABLE).map((d) => d.largo);
  const medio = inocentes.reduce((a, b) => a + b, 0) / inocentes.length;
  comprobar('los siete dosieres se componen', dosieres.every((d) => d.largo > 1000), dosieres.map((d) => d.largo));
  comprobar(
    'con noches parejas, el dosier impreso del culpable mide lo que los demás (±3 %)',
    Math.abs(delCulpable.largo - medio) <= medio * 0.03,
    { culpable: delCulpable.largo, inocentes },
  );
  // En el marcado, no en la hoja de estilos: la clase está definida en todos los documentos.
  comprobar(
    'ningún dosier de jugador lleva el recuadro rojo del asesino',
    dosieres.every((d) => !/class="[^"]*caja--asesino/.test(d.html)),
  );
  comprobar(
    'todos llevan «Tu noche» con el mismo recuadro',
    dosieres.every((d) => d.html.includes('Tu noche') && d.html.includes('caja caja--secreto')),
  );
  comprobar('el culpable sabe que lo es por la primera frase', delCulpable.html.includes('Tú mataste a'));
  comprobar(
    'y los inocentes, que no',
    dosieres.filter((d) => d.id !== CULPABLE).every((d) => d.html.includes('No mataste a')),
  );
  comprobar(
    'los dos consejos miden lo mismo (±10 %)',
    Math.abs(CONSEJO_CULPABLE.length - CONSEJO_INOCENTE.length) <= CONSEJO_CULPABLE.length * 0.1,
    [CONSEJO_CULPABLE.length, CONSEJO_INOCENTE.length],
  );
}

// ---------------------------------------------------------------------------

paso('El juicio de las lecturas del detective');
{
  const plot = tramaEquilibrada();
  const ids = GENTE.map((_, i) => `s${i}`);
  const reparto = (favorito?: string, p = 0.5): Record<string, number> =>
    Object.fromEntries(ids.map((id) => [id, favorito ? (id === favorito ? p : (1 - p) / (ids.length - 1)) : 1 / ids.length]));
  const lectura = (momento: number, r: Record<string, number>, extra: Partial<LecturaCompleta> = {}): LecturaCompleta => ({
    momento,
    reparto: r,
    objetos: { o0: 0.1, o1: 0.7, o2: 0.1, o3: 0.1 },
    salas: { r0: 0.1, r1: 0.1, r2: 0.6, r3: 0.1, r4: 0.1 },
    razon: 'porque sí',
    pistaDecisiva: '',
    cadena: [],
    ...extra,
  });

  const bien = [
    lectura(0, reparto()),
    lectura(1, reparto('s3', 0.3)),
    lectura(2, reparto('s5', 0.3)),
    lectura(3, reparto(CULPABLE, 0.35)),
    lectura(4, reparto(CULPABLE, 0.7), { cadena: ['pista-3', 'pista-9', 'pista-14'] }),
  ];
  comprobar('una noche bien llevada no da avisos', juzgarLecturas(game, plot, bien, 4).length === 0, juzgarLecturas(game, plot, bien, 4));

  // Los números de la primera velada completa contra la API: 70 % antes de corregir, 40 % después.
  const antesDeEmpezar = [lectura(0, reparto(CULPABLE, 0.7)), ...bien.slice(1)];
  comprobar(
    'la mesa ya la señala al 70 % antes de empezar: bloqueante',
    tiene(juzgarLecturas(game, plot, antesDeEmpezar, 4), 'filtracion-inicial', 'bloqueante'),
  );
  const conFavorito = [lectura(0, reparto(CULPABLE, 0.4)), ...bien.slice(1)];
  comprobar(
    'al 40 % es un favorito, no una trama rota: grave',
    tiene(juzgarLecturas(game, plot, conFavorito, 4), 'filtracion-inicial', 'grave'),
  );

  const sinSolucion = [...bien.slice(0, 4), lectura(4, reparto('s4', 0.6))];
  comprobar('al final señala a otra persona: irresoluble', tiene(juzgarLecturas(game, plot, sinSolucion, 4), 'irresoluble', 'bloqueante'));

  const unaSola = [...bien.slice(0, 4), lectura(4, reparto(CULPABLE, 0.8), { pistaDecisiva: 'pista-16' })];
  comprobar(
    'una sola pista lo dice todo al final: grave',
    tiene(juzgarLecturas(game, plot, unaSola, 4), 'pista-que-lo-dice-todo', 'grave'),
  );

  const invisible = [lectura(0, reparto()), lectura(1, reparto('s3', 0.6)), lectura(2, reparto('s4', 0.6)), lectura(3, reparto('s5', 0.6)), bien[4]!];
  comprobar(
    'nadie la considera en toda la noche: el otro extremo también avisa',
    tiene(juzgarLecturas(game, plot, invisible, 4), 'culpable-invisible', 'grave'),
  );
}

// ---------------------------------------------------------------------------

paso('Los parches del revisor');
{
  const plot = tramaEquilibrada();
  const antes = JSON.stringify(plot.solution.respuestas);

  const { plot: tras, aplicados, rechazados } = aplicarParches(game, plot, {
    sinopsis: 'Corta.',
    personajes: [{ ...plot.characters[0]!, secret: 'x', knowledge: [], publicPersona: 'x', motive: 'x', alibi: 'x' }],
    pistasRetiradas: pistasDeLaTrama(plot).filter((p) => p.lugarId === 'r0').map((p) => p.id),
    pistas: [
      { id: 'nueva', lugarId: 'r-que-no-existe', description: 'x', pointsTo: 'x', round: 2 },
      { id: 'nueva-buena', lugarId: 'r4', description: 'Una copa rota con carmín en la terraza.', pointsTo: 'Alguien bebió allí a solas.', round: 9 },
    ],
    giros: [{ id: 'g-culpable', participanteId: CULPABLE, round: 2, instruction: 'Fuiste tú.' }],
    cronologia: plot.timeline.map((e) => ({ ...e, isPublic: true })),
  });
  comprobar('la solución no se mueve', JSON.stringify(tras.solution.respuestas) === antes);
  comprobar('la trama original no se toca: se trabaja sobre una copia', plot.synopsis !== 'Corta.' && tras !== plot);
  comprobar('una sinopsis que es un resumen se rechaza', tras.synopsis === plot.synopsis && rechazados.some((r) => r.startsWith('sinopsis')));
  comprobar('un personaje empobrecido se rechaza', tras.characters[0]!.secret === plot.characters[0]!.secret);
  comprobar('una pista en una sala que no existe no entra', !pistasDeLaTrama(tras).some((p) => p.id === 'nueva'));
  const nueva = pistasDeLaTrama(tras).find((p) => p.id === 'nueva-buena');
  comprobar('una pista buena entra, con la ronda dentro del rango', nueva?.round === 4, nueva);
  comprobar('no se deja una sala sin pistas', pistasDeLaTrama(tras).some((p) => p.lugarId === 'r0'));
  comprobar('un giro para la culpable no entra', !tras.material!.twists.some((g) => g.participanteId === CULPABLE));
  comprobar(
    'lo que hizo una sola persona nunca es público',
    tras.timeline.filter((e) => e.participanteIds.length === 1).every((e) => !e.isPublic),
  );
  comprobar('y se dice lo que entró', aplicados.includes('cronología') && aplicados.some((a) => a.includes('nueva-buena')), aplicados);

  const conMuchosGiros = aplicarParches(game, tramaEquilibrada(), {
    giros: ['s2', 's3', 's4', 's5', 's6'].map((participanteId, i) => ({ id: `extra-${i}`, participanteId, round: 3, instruction: 'Algo nuevo.' })),
  });
  const conGiro = new Set(conMuchosGiros.plot.material!.twists.map((g) => g.participanteId));
  comprobar(
    'y siempre queda algún inocente sin giro',
    GENTE.map((_, i) => `s${i}`).some((id) => id !== CULPABLE && !conGiro.has(id)),
    [...conGiro],
  );

  const soloMaterial = aplicarParches(game, tramaEquilibrada(), { sinopsis: 'Una sinopsis enteramente nueva y bastante más larga que la anterior, con todo.', ayudas: [{ level: 3, text: 'Buscad en la bodega.' }] }, true);
  comprobar('con alcance de material, la trama no se toca', soloMaterial.plot.synopsis === tramaEquilibrada().synopsis);
  comprobar('pero el material sí', soloMaterial.plot.material!.hints.find((h) => h.level === 3)?.text === 'Buscad en la bodega.');
}

// ---------------------------------------------------------------------------

paso('Sin clave, la revisión es la auditoría');
{
  const plot = tramaEquilibrada();
  plot.synopsis = 'Cuchi Montenegro, Cuchi y otra vez Cuchi.';
  const r = await revisarTramaCluedo(game, plot, () => undefined, 'completa');
  comprobar('no reescribe nada', r.plot === plot && r.informe.pasadas === 0);
  comprobar('y el veredicto sale de lo que contó', r.informe.veredicto === 'no-apta', r.informe);
  comprobar('con los hallazgos pendientes', r.informe.hallazgos.every((h) => h.estado === 'pendiente'));
}

paso('Un fallo transitorio de la API se reintenta; uno de verdad, no');
{
  const { StreamConReintento, esTransitorio } = await import('../src/agent/anthropic');
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  // El que se vio el 25-sep-2026: un `api_error` a mitad del stream, sin estado HTTP.
  const aMitad = new Anthropic.APIError(undefined, { type: 'error', error: { type: 'api_error', message: 'Unable to complete this request right now.' } }, 'x', undefined);
  const malPedido = new Anthropic.APIError(400, { type: 'error', error: { type: 'invalid_request_error', message: 'x' } }, 'x', undefined);
  comprobar('el api_error a mitad del stream es transitorio', esTransitorio(aMitad));
  comprobar('un 400 no lo es', !esTransitorio(malPedido));
  // El de la tercera prueba: un AnthropicError genérico con el ECONNRESET en la causa.
  const red = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
  const cortado = new Anthropic.AnthropicError('terminated', { cause: new TypeError('terminated', { cause: red }) } as ErrorOptions);
  comprobar('un corte de red a mitad del stream también', esTransitorio(cortado));
  comprobar('un error cualquiera no', !esTransitorio(new Error('La respuesta del modelo no es un JSON válido.')));

  let intentos = 0;
  const avisos: string[] = [];
  const falso = (fallo?: unknown) => ({
    on: (_e: 'text', cb: (d: string) => void) => {
      avisos.length === 0 && cb('');
      return undefined;
    },
    finalMessage: async () => {
      intentos += 1;
      if (fallo && intentos < 3) throw fallo;
      return { content: [{ type: 'text', text: '{}' }], stop_reason: 'end_turn', usage: {} };
    },
  });
  const conReintento = new StreamConReintento(() => falso(aMitad), 1);
  conReintento.on('text', (d) => d && avisos.push(d));
  const final = await conReintento.finalMessage();
  comprobar('se reintenta hasta que sale', final.stop_reason === 'end_turn' && intentos === 3, intentos);
  comprobar('y se avisa de cada reintento', avisos.filter((a) => a.includes('Se vuelve a intentar')).length === 2, avisos);

  intentos = 0;
  let lanzo = false;
  try {
    await new StreamConReintento(() => falso(malPedido), 1).finalMessage();
  } catch {
    lanzo = true;
  }
  comprobar('un fallo de verdad no se reintenta', lanzo && intentos === 1, intentos);
}

paso('Los esquemas del detective y del revisor');
{
  // Lo mismo que exige verify:esquemas a los de la trama: cada obligatorio existe y nada queda opcional.
  const revisar = (nodo: unknown, ruta: string, errores: string[]): void => {
    if (!nodo || typeof nodo !== 'object') return;
    if (Array.isArray(nodo)) return nodo.forEach((h, i) => revisar(h, `${ruta}[${i}]`, errores));
    const n = nodo as Record<string, unknown>;
    const props = n.properties as Record<string, unknown> | undefined;
    if (props) {
      const req = (n.required as string[]) ?? [];
      for (const r of req) if (!(r in props)) errores.push(`${ruta}: ${r} obligatorio sin definir`);
      for (const k of Object.keys(props)) if (!req.includes(k)) errores.push(`${ruta}: ${k} opcional`);
      if (n.additionalProperties !== false) errores.push(`${ruta}: sin additionalProperties false`);
    }
    for (const [k, v] of Object.entries(n)) if (k !== 'required' && k !== 'enum') revisar(v, `${ruta}.${k}`, errores);
  };
  for (const [nombre, esquema] of Object.entries({
    'revisor (trama)': REVISION_TRAMA_SCHEMA,
    'revisor (material)': REVISION_MATERIAL_SCHEMA,
    'revisor (solo material)': REVISION_SOLO_MATERIAL_SCHEMA,
    detective: DETECTIVE_SCHEMA,
  })) {
    const errores: string[] = [];
    revisar(esquema, '$', errores);
    comprobar(`el esquema del ${nombre} está entero`, errores.length === 0, errores);
  }
}

console.log(`\n${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('La revisión ve los fallos de las veladas de verdad, y no los arregla escondiendo a nadie.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
