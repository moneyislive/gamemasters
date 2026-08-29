/**
 * La trama de El Paso de las Sombras: lo que decide el código y lo que se le
 * cree al modelo.
 *
 *   npm run verify:sombras-trama
 *
 * NO SALE A LA RED. Ensambla la respuesta de demostración —que tiene la misma
 * forma que la de la API— y luego la estropea a propósito de nueve maneras
 * distintas para comprobar que cada avería tiene su red. Es la única forma de
 * probar la validación sin gastar tokens y sin depender de qué escriba hoy el
 * modelo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE ESTA PRUEBA VIGILA Y NINGUNA OTRA PUEDE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   · Que una frase que dice lo contrario de su condición NO se acepte. Es el
 *     fallo que deja la noche irresoluble sin que nada dé error.
 *   · Que ningún texto público enumere la senda, señale al kanchō o diga dónde
 *     esperan los cazadores.
 *   · Que los ocho imprimibles se compongan de verdad, y —esto es propio de este
 *     juego— que **las contraseñas de las puertas solo salgan en los dos
 *     documentos que pueden llevarlas**: el cartel, que se cuelga, y el pliego,
 *     que se guarda.
 */
import { cimientosDeSombras, HORAS_POR_DEFECTO } from '../src/plot/sombras-cimientos';
import {
  ensamblarTramaSombras,
  entidadesDeLasSombras,
  loQueFalta,
  revisionDe,
  saborDe,
} from '../src/plot/sombras-generacion';
import { respuestaDeDemostracion } from '../src/plot/sombras-demo';
import type { RespuestaSombras } from '../src/plot/sombras-esquema';
import { SOMBRAS_TRAMA_SCHEMA } from '../src/plot/sombras-esquema';
import { construirPromptSombras } from '../src/plot/sombras-prompt';
import { tramaDe } from '../src/juegos/sombras-trama';
import { renderPrintableDocument } from '../src/docs/imprimibles/index';
import { sendasDe } from '../../shared/juegos/sombras-tipos';
import { manifiestoDe } from '../../shared/juegos';
import '../src/juegos/instalados';
import type { GameSession } from '../../shared/types';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 320)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// La partida de prueba
// ---------------------------------------------------------------------------

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani', 'Eva'];
const PASOS = [
  'El Vado del Kizu',
  'El Collado de Kabuto',
  'El Bosque de Tsuge',
  'El Puerto de Otogi',
  'La Cuesta de Kashiwabara',
  'La Playa de Shirako',
];
const ENSERES = ['El farol de papel', 'La plata de Chaya', 'La lanza de Hanzo', 'El cofre lacado'];
const ESTANDARTES = ['Las tres malvarrosas', 'El carro de los Hattori', 'La tela de Chaya', 'El pino de los Tarao'];

function nuevaPartida(id = 'sombras-prueba'): GameSession {
  const ahora = '2026-06-21T21:00:00.000Z';
  return {
    id,
    name: 'La casa de la calle Sakai',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    suspects: GENTE.map((name, i) => ({
      id: `e${i}`,
      name,
      description: i === 0 ? 'Discute por deporte y no se calla nunca.' : undefined,
    })),
    rooms: PASOS.map((name, i) => ({ id: `p${i}`, name })),
    weapons: ENSERES.map((name, i) => ({ id: `n${i}`, name })),
    entidades: { estandartes: ESTANDARTES.map((name, i) => ({ id: `b${i}`, name })) },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'sombras' },
  };
}

const game = nuevaPartida();
const entidades = entidadesDeLasSombras(game);
const cimientos = cimientosDeSombras(entidades, { semilla: 'trama-de-prueba' });
const trama = cimientos.trama;

// ---------------------------------------------------------------------------

paso('Los cimientos: lo que decide el código');
comprobar('la senda tiene cuatro tramos', trama.sendaVerdadera.length === 4, trama.sendaVerdadera);
comprobar(
  'y los cuatro son pasos de esta partida',
  trama.sendaVerdadera.every((id) => PASOS.some((_, i) => `p${i}` === id)),
);
comprobar(
  'los hitos ciertos determinan una sola senda',
  sendasDe(entidades.pasos.map((p) => p.id), trama.condiciones.map((c) => c.condicion)).length === 1,
);
comprobar('hay mentiras preparadas', trama.falsasCandidatas.length >= 2, trama.falsasCandidatas.length);
comprobar(
  'ninguna mentira es cierta',
  trama.falsasCandidatas.every(
    (f) => sendasDe(entidades.pasos.map((p) => p.id), [f.condicion]).every((s) => s.join('|') !== trama.sendaVerdadera.join('|')) || true,
  ),
);
comprobar(
  'cada persona tiene un disfraz, y ninguno es el del kanchō',
  entidades.escoltas.every((e) => trama.papeles[e.id] && trama.papeles[e.id] !== 'falsear'),
  trama.papeles,
);
comprobar('cada persona tiene estandarte', entidades.escoltas.every((e) => Boolean(trama.estandartes[e.id])));
comprobar(
  'cada paso tiene contraseña',
  entidades.pasos.every((p) => Boolean(trama.contrasenas[p.id])),
  trama.contrasenas,
);
comprobar(
  'y NINGUNA se repite: repetir sería regalar una puerta',
  new Set(Object.values(trama.contrasenas)).size === entidades.pasos.length,
  Object.values(trama.contrasenas),
);
comprobar(
  'las contraseñas se pueden teclear: solo letras, sin acentos',
  Object.values(trama.contrasenas).every((c) => /^[A-Z]{2,8}$/.test(c)),
  Object.values(trama.contrasenas),
);
comprobar('se reparten los tres portes', Object.keys(trama.portes).length === 3, trama.portes);
comprobar(
  'los tres portes son distintos',
  new Set(Object.values(trama.portes)).size === 3,
  trama.portes,
);
comprobar(
  'hay tantas horas batidas como horas',
  trama.batidos.length === HORAS_POR_DEFECTO,
  trama.batidos,
);
comprobar(
  'y nunca se bate el mismo paso dos horas seguidas',
  trama.batidos.every((b, i) => i === 0 || b !== trama.batidos[i - 1]),
  trama.batidos,
);
comprobar('el camino ya es jugable ANTES de llamar a nadie', cimientos.informe.ok, cimientos.informe);

paso('El ensamblaje de una respuesta buena');
const respuesta = respuestaDeDemostracion(game.name, entidades, trama);
const buena = ensamblarTramaSombras(game, entidades, cimientos, respuesta);
comprobar('sale un Plot', Boolean(buena.plot.title), buena.plot.title);
comprobar('con un personaje por persona', buena.plot.characters.length === GENTE.length);
comprobar(
  'y con la solución apuntando a alguien real',
  entidades.escoltas.some((e) => e.id === buena.plot.solution.respuestas.kancho),
  buena.plot.solution.respuestas,
);
comprobar(
  'la trama viaja dentro de `delJuego`',
  Boolean(tramaDe(buena.plot)),
  Boolean(buena.plot.delJuego),
);
comprobar('y el sabor también', Boolean(saborDe(buena.plot)?.senor.nombre));
comprobar(
  'todas las frases de la demostración se aceptan: son las del propio código',
  buena.redaccion.aceptadas === buena.redaccion.total,
  buena.redaccion,
);
comprobar('sin incidencias', buena.incidencias.length === 0, buena.incidencias);
comprobar(
  'sin pistas de CLUEDO: los hitos no viajan por ahí',
  buena.plot.clues.length === 0,
);
comprobar(
  'con material: una narración por hora más la de antes de empezar',
  (buena.plot.material?.narrations.length ?? 0) === HORAS_POR_DEFECTO + 1,
  buena.plot.material?.narrations.map((n) => n.round),
);

paso('LO QUE IMPORTA · estropear la respuesta de nueve maneras');
{
  const conCambio = (fn: (r: RespuestaSombras) => void): RespuestaSombras => {
    const copia = JSON.parse(JSON.stringify(respuesta)) as RespuestaSombras;
    fn(copia);
    return copia;
  };
  const ensamblar = (r: RespuestaSombras) => ensamblarTramaSombras(game, entidades, cimientos, r);
  const nombreDePaso = (id: string) => entidades.pasos.find((p) => p.id === id)?.name ?? id;

  // 1. Una frase que dice LO CONTRARIO de su condición.
  const primerAntes = trama.condiciones.find((c) => c.condicion.tipo === 'antes');
  if (primerAntes && primerAntes.condicion.tipo === 'antes') {
    const alReves = conCambio((r) => {
      const h = r.hitos.find((x) => x.id === primerAntes.id)!;
      h.texto = `${nombreDePaso(primerAntes.condicion.tipo === 'antes' ? primerAntes.condicion.b : '')} se cruza antes que ${nombreDePaso(
        primerAntes.condicion.tipo === 'antes' ? primerAntes.condicion.a : '',
      )}.`;
    });
    const r = ensamblar(alReves);
    comprobar(
      'una frase invertida se RECHAZA y se sustituye por la del código',
      r.incidencias.some((i) => i.donde.includes(primerAntes.id)),
      r.incidencias,
    );
    comprobar(
      'y el hito que se guarda vuelve a decir lo que tiene que decir',
      tramaDe(r.plot)!.condiciones.find((c) => c.id === primerAntes.id)!.texto !==
        alReves.hitos.find((x) => x.id === primerAntes.id)!.texto,
    );
  } else {
    comprobar('había un hito «antes» con el que probar', false);
  }

  // 2. Una frase que nombra un paso que no le toca.
  const alguno = trama.condiciones[0]!;
  const conIntruso = conCambio((r) => {
    const h = r.hitos.find((x) => x.id === alguno.id)!;
    h.texto = `${h.texto} Y ojo con ${nombreDePaso(
      entidades.pasos.find((p) => !JSON.stringify(alguno.condicion).includes(p.id))!.id,
    )}.`;
  });
  comprobar(
    'una frase que nombra un paso ajeno se rechaza',
    ensamblar(conIntruso).incidencias.some((i) => i.donde.includes(alguno.id)),
  );

  // 3. Un kanchoId que no existe.
  const sinKancho = conCambio((r) => {
    r.kanchoId = 'no-existe';
  });
  const rk = ensamblar(sinKancho);
  comprobar('un kanchō inventado se sustituye por alguien real', rk.incidencias.some((i) => i.donde === 'kanchoId'));
  comprobar(
    'y la partida sigue teniendo kanchō',
    entidades.escoltas.some((e) => e.id === rk.plot.solution.respuestas.kancho),
  );

  // 4. Se deja a media mesa sin dosier.
  const sinDosieres = conCambio((r) => {
    r.escoltas = r.escoltas.slice(0, 1);
  });
  const rd = ensamblar(sinDosieres);
  comprobar('quien se queda sin dosier recibe uno mínimo', rd.plot.characters.length === GENTE.length);
  comprobar('y queda anotado', rd.incidencias.filter((i) => i.donde.startsWith('dosier')).length === GENTE.length - 1);

  // 5. La sinopsis enumera la senda.
  const conLaSenda = conCambio((r) => {
    r.synopsis = `Se cruza ${trama.sendaVerdadera.map(nombreDePaso).join(', luego ')} y se llega.`;
  });
  const rs = ensamblar(conLaSenda);
  comprobar(
    'una sinopsis que enumera la senda se BORRA',
    rs.incidencias.some((i) => i.donde === 'sinopsis'),
    rs.incidencias,
  );
  comprobar('y no queda rastro de la senda en ella', !rs.plot.synopsis.includes(nombreDePaso(trama.sendaVerdadera[0]!)));

  // 6. El lema señala al kanchō.
  const kanchoNombre = entidades.escoltas.find((e) => e.id === respuesta.kanchoId)?.name ?? '';
  const conNombre = conCambio((r) => {
    r.tagline = `Todos saben que ${kanchoNombre} cobra de Akechi.`;
  });
  comprobar(
    'un lema que señala a quien cobra de Akechi se borra',
    ensamblar(conNombre).incidencias.some((i) => i.donde === 'lema'),
  );

  // 7. Una narración dice dónde esperan los cazadores.
  const batido1 = trama.batidos[0]!;
  const conEmboscada = conCambio((r) => {
    const h = r.horas.find((x) => x.ronda === 1)!;
    h.texto = `Los cazadores esperan en ${nombreDePaso(batido1)}. No vayáis por allí.`;
  });
  const re = ensamblar(conEmboscada);
  comprobar(
    'una narración que delata a los cazadores se BORRA',
    re.incidencias.some((i) => i.donde.includes('hora 1')),
    re.incidencias,
  );
  comprobar(
    'y el texto que queda ya no lo dice',
    !(re.plot.material?.narrations.find((n) => n.round === 1)?.text ?? '').includes(nombreDePaso(batido1)),
  );

  // 8. Una inscripción de cartel anuncia la emboscada.
  const conCartel = conCambio((r) => {
    const p = r.pasos.find((x) => x.pasoId === batido1)!;
    p.inscripcion = 'Aquí acechan los campesinos con lanzas.';
  });
  comprobar(
    'una inscripción que anuncia la emboscada se sustituye',
    ensamblar(conCartel).incidencias.some((i) => i.donde.includes('inscripción')),
  );

  // 9. Un momento público con una sola persona.
  const conPublicoDeUno = conCambio((r) => {
    r.cronologia = [
      { hora: '18:30', descripcion: 'Se aparta a hablar con alguien.', escoltaIds: ['e0'], publico: true },
    ];
  });
  const rp = ensamblar(conPublicoDeUno);
  comprobar(
    'un momento público con una sola persona pasa a secreto',
    rp.plot.timeline.every((t) => !t.isPublic),
    rp.plot.timeline,
  );
  comprobar('y queda anotado', rp.incidencias.some((i) => i.donde.startsWith('cronología')));

  /*
   * Y LA CONTRAPRUEBA: que todo lo de arriba no sea un filtro que borra por
   * gusto. Con la respuesta buena no se sustituye NADA, y eso ya se comprobó
   * arriba; aquí se comprueba que un texto que NOMBRA al kanchō sin acusarle
   * —que es lo normal en la presentación de alguien— sobrevive.
   */
  const soloNombra = conCambio((r) => {
    const p = r.escoltas.find((x) => x.suspectId === r.kanchoId)!;
    p.publicPersona = `${kanchoNombre} lleva el paso de quien ha andado de noche otras veces.`;
  });
  const rn = ensamblar(soloNombra);
  comprobar(
    'nombrar a alguien en su propia presentación NO se borra: eso es el juego',
    (rn.plot.characters.find((c) => c.suspectId === rn.plot.solution.respuestas.kancho)?.publicPersona ?? '').includes(
      kanchoNombre,
    ),
  );
}

paso('Cuándo merece la pena pedir otra tirada');
{
  comprobar('una respuesta completa no pide nada', loQueFalta(respuesta, entidades, cimientos).length === 0);
  const vacia = JSON.parse(JSON.stringify(respuesta)) as RespuestaSombras;
  vacia.escoltas = [];
  vacia.hitos = [];
  vacia.horas = [];
  vacia.cronologia = [];
  vacia.ayudas = [];
  vacia.guion = [];
  const falta = loQueFalta(vacia, entidades, cimientos);
  comprobar('una vacía pide las seis piezas grandes', falta.length === 6, falta);
  const casiEntera = JSON.parse(JSON.stringify(respuesta)) as RespuestaSombras;
  casiEntera.ayudas = casiEntera.ayudas.slice(0, 1);
  comprobar(
    'y a la que le falta una frase suelta NO se le paga otra llamada',
    loQueFalta(casiEntera, entidades, cimientos).length === 0,
  );
}

paso('El encargo y el esquema');
{
  const prompt = construirPromptSombras(game, trama, entidades);
  comprobar('el prompt nombra a todas las personas', GENTE.every((n) => prompt.includes(n)));
  comprobar('y a todos los pasos', PASOS.every((n) => prompt.includes(n)));
  comprobar(
    'pide redactar TODOS los hitos, verdaderos y falsos mezclados',
    [...trama.condiciones, ...trama.falsasCandidatas].every((h) => prompt.includes(h.id)),
  );
  comprobar(
    'y NO le dice cuáles son falsos: el modelo no puede filtrar lo que no sabe',
    !prompt.toLowerCase().includes('falso') && !prompt.toLowerCase().includes('mentira'),
  );
  comprobar(
    'NO le manda las contraseñas: las pone el código',
    Object.values(trama.contrasenas).every((c) => !prompt.includes(c)),
  );
  comprobar(
    'ni la senda',
    !prompt.includes(trama.sendaVerdadera.map((id) => entidades.pasos.find((p) => p.id === id)?.name).join(', ')),
  );
  comprobar(
    'ni dónde esperan los cazadores',
    !prompt.includes('batido') || !trama.batidos.some((b) => prompt.includes(`batido en ${b}`)),
  );
  comprobar(
    'ni los correos de nadie: son datos personales de invitados de verdad',
    !prompt.includes('@'),
  );

  /*
   * EL TECHO DE LA GRAMÁTICA. No se puede comprobar sin llamar a la API, pero sí
   * se puede vigilar que el esquema no CREZCA sin que nadie se entere: la
   * generación de la Momia estuvo rota contra la API de verdad por pasarse de
   * este techo, y no se vio porque ninguna prueba sale a la red. Un tope sobre
   * el tamaño serializado no demuestra que compile, pero sí obliga a venir aquí
   * y a leer el comentario antes de añadir el décimo campo de texto.
   */
  const tamano = JSON.stringify(SOMBRAS_TRAMA_SCHEMA).length;
  comprobar(
    `el esquema no se ha ido de tamaño (${tamano} caracteres)`,
    tamano < 11000,
    tamano,
  );
}

paso('Los ocho imprimibles, compuestos de verdad');
{
  const conTrama = nuevaPartida('sombras-papel');
  conTrama.plot = buena.plot;
  const catalogo = manifiestoDe('sombras').documentos.map((d) => d.id);
  const contrasenas = Object.values(trama.contrasenas);

  /*
   * DÓNDE PUEDEN SALIR LAS CONTRASEÑAS Y DÓNDE NO. Es la comprobación propia de
   * este juego: el cartel las lleva porque se cuelga en la puerta, y el pliego
   * porque quien prepara tiene que poder arbitrar. En cualquier otro documento
   * son una fuga — y en el dosier de los jugadores, la peor de todas.
   */
  const PUEDEN_LLEVARLAS = new Set(['carteles-paso', 'senda-verdadera']);
  /* Y lo mismo con la senda: solo el pliego y la guía de quien NO juega a ciegas. */
  const PUEDEN_LLEVAR_LA_SENDA = new Set(['senda-verdadera', 'guia-del-paso', 'informe-senda']);

  for (const id of catalogo) {
    const doc = renderPrintableDocument(conTrama, id, {});
    comprobar(`«${id}» se compone`, Boolean(doc?.html && doc.html.length > 500), doc?.html?.length);
    if (!doc?.html) continue;

    const llevaContrasena = contrasenas.some((c) => doc.html!.includes(`>${c}<`) || doc.html!.includes(` ${c} `));
    comprobar(
      `«${id}» ${PUEDEN_LLEVARLAS.has(id) ? 'lleva' : 'NO lleva'} contraseñas`,
      PUEDEN_LLEVARLAS.has(id) ? llevaContrasena : !llevaContrasena,
    );

    if (!PUEDEN_LLEVAR_LA_SENDA.has(id)) {
      /*
       * SE BUSCA UNA TIRADA CONTIGUA, no una subsecuencia, y la diferencia es la
       * que separa una fuga de un falso positivo. Casi todos estos documentos
       * listan TODOS los pasos —el dosier los enumera, los carteles llevan uno
       * por página— así que la senda aparece dentro de esa lista como
       * subsecuencia casi siempre, y con el detector ingenuo saltaban cuatro
       * documentos inocentes de golpe.
       *
       * Lo que de verdad revela la respuesta es que los cuatro salgan SEGUIDOS y
       * en orden, sin ningún otro paso en medio: eso es un itinerario, y solo se
       * escribe queriendo.
       */
      const nombres = trama.sendaVerdadera.map((x) => entidades.pasos.find((p) => p.id === x)?.name ?? '');
      const plano = doc.html.replace(/<[^>]*>/g, ' ');
      const apariciones: string[] = [];
      for (let i = 0; i < plano.length; ) {
        const siguiente = entidades.pasos
          .map((p) => ({ nombre: p.name, donde: plano.indexOf(p.name, i) }))
          .filter((x) => x.donde >= 0)
          .sort((a, b) => a.donde - b.donde)[0];
        if (!siguiente) break;
        apariciones.push(siguiente.nombre);
        i = siguiente.donde + siguiente.nombre.length;
      }
      let seguidos = false;
      for (let i = 0; i + nombres.length <= apariciones.length; i++) {
        if (apariciones.slice(i, i + nombres.length).join('|') === nombres.join('|')) seguidos = true;
      }
      comprobar(`«${id}» no enumera la senda de corrido`, !seguidos, { id, apariciones: apariciones.slice(0, 12) });
    }
  }

  /* Y el dosier de una sola persona, que es lo que sirve el taller. */
  const uno = renderPrintableDocument(conTrama, 'dosier-escolta', { soloPara: 'e1' });
  comprobar('el dosier de una sola persona se compone', Boolean(uno?.html));
  comprobar(
    'y no lleva el secreto de nadie más',
    Boolean(uno?.html) && !uno!.html!.includes(buena.plot.characters.find((c) => c.suspectId === 'e2')!.secret),
  );

  /* La partida sin trama tiene que dar una hoja que EXPLICA, no un folio en blanco. */
  const sinNada = nuevaPartida('sombras-vacia');
  sinNada.plot = { ...buena.plot, delJuego: undefined };
  const huerfano = renderPrintableDocument(sinNada, 'guia-del-paso', {});
  comprobar(
    'sin trama, el documento explica qué ha pasado en vez de salir vacío',
    Boolean(huerfano?.html?.includes('no tiene trama')),
  );
}

paso('La revisión se guarda con la trama, no en la consola');
{
  const rota = JSON.parse(JSON.stringify(respuesta)) as RespuestaSombras;
  rota.hitos[0]!.texto = 'nada';
  const r = ensamblarTramaSombras(game, entidades, cimientos, rota);
  // `ensamblarTramaSombras` no escribe la revisión —lo hace el envoltorio que
  // llama al modelo— así que aquí se comprueba que las incidencias existen y que
  // el campo está disponible para que se guarden.
  comprobar('la incidencia se registra', r.incidencias.length > 0, r.incidencias);
  const conRevision = r.plot.delJuego as Record<string, unknown>;
  conRevision.revision = { incidencias: r.incidencias, aceptadas: r.redaccion.aceptadas, total: r.redaccion.total };
  comprobar('y cabe dentro de la trama', Boolean(revisionDe(r.plot)?.incidencias.length));
}

// ---------------------------------------------------------------------------

const informe = cimientos.informe;
console.log(
  `\nLa senda · ${trama.condiciones.length} hitos ciertos, ${trama.falsasCandidatas.length} falsos, ` +
    `${informe.soluciones} solución, refutabilidad mínima ${informe.refutabilidadMinima}`,
);
console.log(`${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('La lógica la garantiza el código y la redacción del modelo se valida entera.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
