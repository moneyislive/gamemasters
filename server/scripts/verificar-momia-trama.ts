/**
 * La generación de El Misterio de la Momia no puede entregar una velada rota.
 *
 *   npm run verify:momia-trama
 *
 * Lo que se comprueba aquí es la costura entre el CÓDIGO y el MODELO, que es
 * donde está el riesgo del §7 del diseño: el código decide la lógica del puzle y
 * el modelo escribe cómo se lee. Si una frase no dice lo que dice su restricción,
 * la partida queda irresoluble y nadie se entera hasta la noche, con doce
 * personas alrededor de una mesa y sin arreglo posible.
 *
 * CÓMO SE COMPRUEBA, Y POR QUÉ ASÍ. No basta con generar una trama buena y ver
 * que sale bien: eso solo demuestra que el camino feliz funciona. Lo que se hace
 * es coger la respuesta de demostración —que es correcta— y ESTROPEARLA a
 * propósito, una avería por vez, con las averías que un modelo comete de verdad:
 * invertir un «antes», colar el rito de otro fragmento, señalar a alguien que no
 * está en la mesa, enumerar los cinco ritos en el orden verdadero dentro de una
 * narración que se lee en voz alta. Cada avería tiene que aparecer en la lista de
 * incidencias Y quedar arreglada en la trama final.
 *
 * La comprobación que nunca se ha visto fallar no demuestra nada, así que cada
 * caso de abajo afirma las dos cosas: que la avería se DETECTA y que el
 * resultado queda SANO. Una comprobación que solo mirara lo primero pasaría en
 * verde aunque el arreglo no se aplicase.
 */
import { cimientosDeMomia, VIGILIAS_POR_DEFECTO } from '../src/plot/momia-cimientos';
import type { EntidadesDeMomia } from '../src/plot/momia-cimientos';
import { ensamblarTramaMomia, entidadesDeLaMomia } from '../src/plot/momia-generacion';
import { respuestaDeDemostracion } from '../src/plot/momia-demo';
import { comprobarRedaccion, lexicoDeRitos, ritosMencionados } from '../src/plot/momia-validacion';
import { redactar, verificarPuzle, maximoQueJuntaUnaPersona } from '../src/juegos/momia-puzle';
import { solucionesDe } from '../../shared/juegos/momia-tipos';
// Del índice: al cargarlo se registran los manifiestos y se anota dónde vive
// cada categoría. Importando el manifiesto suelto, 'camaras' no resolvería.
import { MOMIA } from '../../shared/juegos';
import type { RespuestaMomia } from '../src/plot/momia-esquema';
import type { RitoId } from '../../shared/juegos/momia-tipos';
import type { GameSession } from '../../shared/types';

// ---------------------------------------------------------------------------
// Marcador
// ---------------------------------------------------------------------------

let pasadas = 0;
const fallos: string[] = [];

function comprobar(titulo: string, condicion: boolean, detalle = ''): void {
  pasadas++;
  if (!condicion) fallos.push(`${titulo}${detalle ? ` — ${detalle}` : ''}`);
}

function seccion(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// Una partida de la Momia, con gente que se parece a gente
// ---------------------------------------------------------------------------

/*
 * Las descripciones NO son de relleno: la del primero lleva «discute» y la del
 * cuarto «dinero», que son las palabras con las que el reparto de dones empuja
 * hacia `descifrar` y hacia `sobornar`. Sin ellas, la comprobación de que la
 * personalización llega al don no comprobaría nada.
 */
const EXPEDICION = [
  { id: 'e1', name: 'Marta', description: 'Discute por deporte y nunca se calla lo que piensa.' },
  { id: 'e2', name: 'Bruno', description: 'Cuida de todo el mundo. Siempre lleva tiritas encima.' },
  { id: 'e3', name: 'Carla', description: 'Callada, leal, se entera de todo.' },
  { id: 'e4', name: 'Dani', description: 'Habla de dinero y de negocios en cuanto puede.' },
  { id: 'e5', name: 'Elena', description: 'Hace fotos a todo, hasta a la comida.' },
  { id: 'e6', name: 'Fabio', description: 'Deporte, obras y bricolaje: no para quieto.' },
];

const CAMARAS = [
  { id: 'c1', name: 'Antesala de los Sellos', description: 'El recibidor, con el espejo torcido.' },
  { id: 'c2', name: 'Pozo de las Ofrendas', description: 'La cocina.' },
  { id: 'c3', name: 'Corredor de las Estrellas', description: 'El pasillo largo, con la lámpara que parpadea.' },
  { id: 'c4', name: 'Cámara del Barquero', description: 'El salón.' },
  { id: 'c5', name: 'Sala de la Balanza', description: 'El despacho.' },
];

const RELIQUIAS = [
  { id: 'q1', name: 'Escarabeo de lapislázuli' },
  { id: 'q2', name: 'Máscara funeraria' },
  { id: 'q3', name: 'Vaso canopo' },
];

const RITOS = [
  { id: 't1', name: 'Rito del Agua' },
  { id: 't2', name: 'Rito del Aliento' },
  { id: 't3', name: 'Rito del Nombre' },
  { id: 't4', name: 'Rito de la Balanza' },
  { id: 't5', name: 'Rito del Silencio' },
];

function partidaDeMomia(id = 'momia-verificacion'): GameSession {
  const ahora = new Date().toISOString();
  return {
    id,
    name: 'La tumba de la casa de Sabrón',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    // Los `almacen` del manifiesto: expedicionarios→suspects, camaras→rooms,
    // reliquias→weapons. `ritos` no tiene campo heredado y vive en `entidades`.
    suspects: EXPEDICION.map((e) => ({ ...e })),
    rooms: CAMARAS.map((c) => ({ ...c })),
    weapons: RELIQUIAS.map((r) => ({ ...r })),
    entidades: { ritos: RITOS.map((r) => ({ ...r })) },
    boardMode: 'generated',
    settings: { language: 'es', juego: MOMIA.id },
  };
}

/** Copia profunda de la respuesta, para estropear una sin tocar las demás. */
function copiar(r: RespuestaMomia): RespuestaMomia {
  return JSON.parse(JSON.stringify(r)) as RespuestaMomia;
}

// ---------------------------------------------------------------------------
// 1. Los cimientos: el puzle que garantiza el código
// ---------------------------------------------------------------------------

seccion('Los cimientos: cien partidas y sus cuatro garantías');

const game = partidaDeMomia();
const entidades: EntidadesDeMomia = entidadesDeLaMomia(game);

comprobar('las cuatro categorías se resuelven por el puente de entidades',
  entidades.expedicionarios.length === 6 &&
  entidades.camaras.length === 5 &&
  entidades.reliquias.length === 3 &&
  entidades.ritos.length === 5,
  `expedicionarios ${entidades.expedicionarios.length}, cámaras ${entidades.camaras.length}, reliquias ${entidades.reliquias.length}, ritos ${entidades.ritos.length}`,
);

const idsDeRito = RITOS.map((r) => r.id as RitoId);
let sinFalsaUtil = 0;
for (let n = 0; n < 100; n++) {
  const { trama, puzle, informe, idsFalsos } = cimientosDeMomia(entidades, { semilla: `siembra-${n}` });

  if (!informe.ok) {
    fallos.push(`cimientos ${n}: el puzle no pasa sus garantías (${JSON.stringify(informe)})`);
    break;
  }

  // Sobre la trama YA ensamblada, no sobre el puzle: es lo que se guarda.
  const soluciones = solucionesDe(idsDeRito, trama.restricciones.map((r) => r.restriccion));
  if (soluciones.length !== 1 || soluciones[0]!.join('|') !== trama.ordenVerdadero.join('|')) {
    fallos.push(`cimientos ${n}: las restricciones guardadas no determinan el orden verdadero`);
    break;
  }
  if (trama.falsasCandidatas.some((f) => solucionesDe(idsDeRito, [f.restriccion]).some((o) => o.join('|') === trama.ordenVerdadero.join('|')))) {
    fallos.push(`cimientos ${n}: hay una «falsa» que el orden verdadero cumple`);
    break;
  }
  if (trama.profanadas.length !== VIGILIAS_POR_DEFECTO) {
    fallos.push(`cimientos ${n}: ${trama.profanadas.length} vigilias en vez de ${VIGILIAS_POR_DEFECTO}`);
    break;
  }
  if (trama.hallazgos.length !== trama.restricciones.length) {
    fallos.push(`cimientos ${n}: ${trama.hallazgos.length} hallazgos para ${trama.restricciones.length} fragmentos`);
    break;
  }
  if (maximoQueJuntaUnaPersona(trama.hallazgos) >= trama.restricciones.length) {
    fallos.push(`cimientos ${n}: una sola persona podría juntar todos los fragmentos`);
    break;
  }
  if (Object.keys(trama.dones).length !== EXPEDICION.length) {
    fallos.push(`cimientos ${n}: faltan dones por repartir`);
    break;
  }
  if (Object.values(trama.dones).includes('falsificar')) {
    fallos.push(`cimientos ${n}: se ha repartido «falsificar», que solo se deriva de ser el saqueador`);
    break;
  }
  /*
   * Los ids no pueden delatar cuáles son mentira: viajan al modelo dentro del
   * prompt. Si todos los falsos fueran los últimos, bastaría con mirar la lista.
   * Se comprueba que a lo largo de las cien siembras los falsos caen en
   * posiciones variadas y no siempre al final.
   */
  const posicionesFalsas = [...idsFalsos].map((id) => Number(id.slice(2)));
  const total = trama.restricciones.length + trama.falsasCandidatas.length;
  if (posicionesFalsas.every((p) => p > total - trama.falsasCandidatas.length)) sinFalsaUtil++;
}
comprobar('cien puzles seguidos cumplen las cuatro garantías', fallos.length === 0, fallos[0] ?? '');
comprobar(
  'los ids de fragmento no delatan cuáles son falsos',
  sinFalsaUtil < 100,
  `en ${sinFalsaUtil} de 100 siembras todas las falsas quedaron al final de la numeración`,
);

// ---------------------------------------------------------------------------
// 2. El camino feliz: la respuesta de demostración
// ---------------------------------------------------------------------------

seccion('El camino feliz: una respuesta correcta se acepta entera');

/*
 * La siembra de la que cuelgan las averías no puede ser una cualquiera: para
 * demostrar que se detecta «invierte un antes» hace falta que el puzle TENGA un
 * «antes», y qué formas de restricción salen depende del sorteo. Se busca una
 * siembra que traiga las dos que hacen falta en vez de fiarse de que la primera
 * las tenga. Sin esto, el día que cambien los pesos del generador esta prueba
 * empezaría a saltarse casos sin que nadie se enterara.
 */
function siembraConLasFormasQueHacenFalta(): ReturnType<typeof cimientosDeMomia> {
  for (let n = 0; n < 200; n++) {
    const c = cimientosDeMomia(entidades, { semilla: `${game.id}-${n}` });
    const tipos = new Set(c.trama.restricciones.map((r) => r.restriccion.tipo));
    if (tipos.has('antes') && tipos.has('posicion')) return c;
  }
  throw new Error('Ninguna de 200 siembras trae a la vez un «antes» y una «posición»: las averías no se pueden montar.');
}

const cimientos = siembraConLasFormasQueHacenFalta();
const buena = respuestaDeDemostracion(game.name, entidades, cimientos.trama);
const lexico = lexicoDeRitos(entidades.ritos.map((r) => ({ id: r.id, name: r.name })));

const sana = ensamblarTramaMomia(game, entidades, cimientos, buena);

comprobar('no hay ninguna incidencia', sana.incidencias.length === 0,
  sana.incidencias.map((i) => `${i.donde}: ${i.motivo}`).join(' | '));
comprobar('se aceptan todas las frases del modelo',
  sana.redaccion.aceptadas === sana.redaccion.total,
  `${sana.redaccion.aceptadas} de ${sana.redaccion.total}`);
comprobar('hay un dosier por expedicionario', sana.plot.characters.length === EXPEDICION.length);
comprobar('la solución señala a un expedicionario de verdad',
  EXPEDICION.some((e) => e.id === sana.plot.solution.respuestas.saqueador));
comprobar('la trama del juego viaja en delJuego', Boolean(sana.plot.delJuego));
comprobar('no se emiten pistas de CLUEDO', sana.plot.clues.length === 0);
comprobar('hay una narración por vigilia, más la apertura',
  sana.plot.material?.narrations.length === VIGILIAS_POR_DEFECTO + 1);

/*
 * La invariante que de verdad importa: pase lo que pase, TODA frase que quede en
 * la trama final o bien se puede verificar contra su restricción, o bien es la
 * que escribe el código. No hay tercera opción, y por eso la partida no puede
 * salir irresoluble.
 */
function todasLasFrasesSonSanas(
  resultado: ReturnType<typeof ensamblarTramaMomia>,
  conEsteLexico = lexico,
): string | null {
  const trama = resultado.plot.delJuego as {
    restricciones: typeof cimientos.trama.restricciones;
    falsasCandidatas: typeof cimientos.trama.falsasCandidatas;
  };
  const nombre = (id: RitoId) => conEsteLexico.nombres.get(id) ?? id;
  for (const f of [...trama.restricciones, ...trama.falsasCandidatas]) {
    const verificable = comprobarRedaccion(f.restriccion, f.texto, conEsteLexico).bien;
    const esDelCodigo = f.texto === redactar(f.restriccion, nombre);
    if (!verificable && !esDelCodigo) return `${f.id}: «${f.texto}»`;
  }
  return null;
}
comprobar('toda frase final es verificable o es la del código',
  todasLasFrasesSonSanas(sana) === null, todasLasFrasesSonSanas(sana) ?? '');

// ---------------------------------------------------------------------------
// 3. Las averías: una por una, con la respuesta buena estropeada a propósito
// ---------------------------------------------------------------------------

seccion('Las averías que comete un modelo de verdad');

interface Averia {
  nombre: string;
  /** Estropea la respuesta. Devuelve el id o el sitio afectado. */
  romper: (r: RespuestaMomia) => string;
  /** Qué tiene que aparecer en el motivo de la incidencia. */
  espera: RegExp;
}

const primeroDeTipo = (tipo: string) =>
  cimientos.trama.restricciones.find((r) => r.restriccion.tipo === tipo);

const AVERIAS: Averia[] = [
  {
    nombre: 'invierte un «antes»: dice que B precede a A',
    romper: (r) => {
      const f = primeroDeTipo('antes');
      if (!f || f.restriccion.tipo !== 'antes') return '';
      const destino = r.fragmentos.find((x) => x.id === f.id)!;
      destino.texto = `${lexico.nombres.get(f.restriccion.b)} precede a ${lexico.nombres.get(f.restriccion.a)} en el sellado.`;
      return f.id;
    },
    espera: /nombra primero/,
  },
  {
    nombre: 'cuela el rito de otro fragmento',
    romper: (r) => {
      const f = cimientos.trama.restricciones[0]!;
      const ajeno = RITOS.find((x) => !JSON.stringify(f.restriccion).includes(x.id))!;
      const destino = r.fragmentos.find((x) => x.id === f.id)!;
      destino.texto = `${redactar(f.restriccion, (id) => lexico.nombres.get(id) ?? id)} Y ${ajeno.name} aguarda su turno.`;
      return f.id;
    },
    espera: /ritos que no le tocan/,
  },
  {
    nombre: 'convierte un «antes» suelto en un «justo antes»',
    romper: (r) => {
      const f = primeroDeTipo('antes');
      if (!f || f.restriccion.tipo !== 'antes') return '';
      const destino = r.fragmentos.find((x) => x.id === f.id)!;
      destino.texto = `${lexico.nombres.get(f.restriccion.a)} precede inmediatamente a ${lexico.nombres.get(f.restriccion.b)}.`;
      return f.id;
    },
    espera: /justo antes/,
  },
  {
    nombre: 'niega una restricción de lugar que era afirmativa',
    romper: (r) => {
      const f = primeroDeTipo('posicion');
      if (!f || f.restriccion.tipo !== 'posicion') return '';
      const destino = r.fragmentos.find((x) => x.id === f.id)!;
      destino.texto = `${lexico.nombres.get(f.restriccion.a)} nunca se pronuncia el ${['primero', 'segundo', 'tercero', 'cuarto', 'quinto'][f.restriccion.posicion - 1]}.`;
      return f.id;
    },
    espera: /negación/,
  },
  {
    nombre: 'se deja un fragmento sin redactar',
    romper: (r) => {
      const f = cimientos.trama.restricciones[0]!;
      r.fragmentos = r.fragmentos.filter((x) => x.id !== f.id);
      return f.id;
    },
    espera: /no lo redactó/,
  },
  {
    nombre: 'señala como saqueador a alguien que no está en la mesa',
    romper: (r) => {
      r.saqueadorId = 'nadie-de-esta-expedicion';
      return 'saqueadorId';
    },
    espera: /no está en la expedición/,
  },
  {
    nombre: 'se deja a una persona sin dosier',
    romper: (r) => {
      r.expedicionarios = r.expedicionarios.filter((e) => e.suspectId !== 'e3');
      return 'dosier de Carla';
    },
    espera: /no escribió su papel/,
  },
  {
    nombre: 'enumera los cinco ritos en el orden verdadero dentro de una vigilia',
    romper: (r) => {
      r.vigilias[0]!.texto = `Se abre la vigilia. El sellado pide ${cimientos.trama.ordenVerdadero
        .map((id) => lexico.nombres.get(id))
        .join(', luego ')}. Nada más.`;
      return 'narración de la vigilia 1';
    },
    espera: /orden verdadero/,
  },
  {
    nombre: 'nombra al saqueador en la sinopsis pública',
    romper: (r) => {
      const persona = EXPEDICION.find((e) => e.id === r.saqueadorId)!;
      r.synopsis = `Todo el mundo sabe que ${persona.name} bajó con la lámpara aquella noche.`;
      return 'sinopsis';
    },
    espera: /rompió el sello/,
  },
  {
    nombre: 'marca como público un momento con una sola persona',
    romper: (r) => {
      r.cronologia = [
        { hora: '01:05', descripcion: 'Baja solo con la lámpara.', expedicionarioIds: ['e4'], publico: true },
      ];
      return 'cronología 01:05';
    },
    espera: /pasa a secreto/,
  },
];

for (const averia of AVERIAS) {
  const rota = copiar(buena);
  const donde = averia.romper(rota);
  if (!donde) {
    fallos.push(`la avería «${averia.nombre}» no se pudo montar: la siembra no tiene una restricción de ese tipo`);
    continue;
  }
  const resultado = ensamblarTramaMomia(game, entidades, cimientos, rota);
  const pega = resultado.incidencias.filter((i) => i.donde.includes(donde) && averia.espera.test(i.motivo));

  comprobar(`se detecta: ${averia.nombre}`, pega.length > 0,
    `incidencias: ${resultado.incidencias.map((i) => `${i.donde}=${i.motivo}`).join(' | ') || 'ninguna'}`);
  comprobar(`queda sano tras: ${averia.nombre}`,
    todasLasFrasesSonSanas(resultado) === null, todasLasFrasesSonSanas(resultado) ?? '');
}

// ---------------------------------------------------------------------------
// 4. La regla de oro sobre lo que se lee en voz alta
// ---------------------------------------------------------------------------

seccion('La regla de oro: el orden verdadero no sale a la mesa');

/*
 * Se recorre TODO lo que acaba leyéndose en público o imprimiéndose en el dosier
 * de cualquiera, y se comprueba que en ninguno de esos textos aparezcan los
 * cinco ritos en el orden verdadero. El desenlace queda fuera a propósito: es el
 * único sitio donde el orden SÍ se cuenta, y por eso se comprueba aparte que
 * esté ahí y no en otro lado.
 */
const orden = cimientos.trama.ordenVerdadero;

function superficiePublica(resultado: ReturnType<typeof ensamblarTramaMomia>): Array<[string, string]> {
  return [
    ['sinopsis', resultado.plot.synopsis],
    ['ambientación', resultado.plot.setting],
    ...(resultado.plot.material?.narrations ?? []).map((n): [string, string] => [`narración ${n.round}`, n.text]),
    ...(resultado.plot.material?.hints ?? []).map((h): [string, string] => [`ayuda ${h.level}`, h.text]),
    ...resultado.plot.characters.flatMap((c): Array<[string, string]> => [
      [`${c.characterName} · cara pública`, c.publicPersona],
      [`${c.characterName} · secreto`, c.secret],
      [`${c.characterName} · coartada`, c.alibi],
    ]),
    ...resultado.plot.timeline
      .filter((e) => e.isPublic)
      .map((e): [string, string] => [`cronología ${e.time}`, e.description]),
  ];
}

function fugasDelOrden(resultado: ReturnType<typeof ensamblarTramaMomia>): string[] {
  return superficiePublica(resultado)
    .filter(([, texto]) => {
      const m = ritosMencionados(texto, lexico);
      return m.length >= orden.length && m.join('>') === orden.join('>');
    })
    .map(([donde]) => donde);
}

comprobar('ningún texto público enumera el orden verdadero', fugasDelOrden(sana).length === 0,
  fugasDelOrden(sana).join(', '));

/*
 * Y ahora la misma barrida sobre una respuesta que lo enumera POR TODAS PARTES.
 * Sin esto, la comprobación de arriba solo demostraría que la respuesta de
 * demostración se porta bien —que ya lo sabíamos— y no que el filtro funcione.
 * Un modelo entusiasta que liste los cinco ritos «en el orden en que deben
 * pronunciarse» acaba la velada en la primera media hora.
 */
const enumerada = copiar(buena);
const listaDelOrden = orden.map((id) => lexico.nombres.get(id)).join(', después ');
enumerada.synopsis = `El sellado se ejecuta así: ${listaDelOrden}. Eso dicen los que saben.`;
enumerada.ambientacion = `La casa se recorre en el orden del sellado: ${listaDelOrden}.`;
enumerada.tumba.laNocheDelSello = `Aquella noche debió pronunciarse ${listaDelOrden}, y no se hizo.`;
for (const v of enumerada.vigilias) v.texto = `Vigilia. El papiro pedía ${listaDelOrden}. Nada más.`;
for (const a of enumerada.ayudas) a.texto = `Probad con ${listaDelOrden}.`;

const filtrada = ensamblarTramaMomia(game, entidades, cimientos, enumerada);
comprobar('el filtro limpia el orden de TODOS los textos públicos',
  fugasDelOrden(filtrada).length === 0, fugasDelOrden(filtrada).join(', '));
comprobar('y deja constancia de cada texto que tuvo que sustituir',
  filtrada.incidencias.filter((i) => /orden verdadero/.test(i.motivo)).length >=
    2 + enumerada.vigilias.length,
  `${filtrada.incidencias.filter((i) => /orden verdadero/.test(i.motivo)).length} sustituciones`);

const reconstruccion = sana.plot.material?.finale.reconstruction ?? '';
comprobar('el desenlace SÍ cuenta el orden verdadero',
  ritosMencionados(reconstruccion, lexico).join('>') === orden.join('>'),
  `reconstrucción: «${reconstruccion.slice(0, 80)}…»`);

// ---------------------------------------------------------------------------
// 5. La personalización llega al don
// ---------------------------------------------------------------------------

seccion('La personalización: lo que contó el Game Master llega al don');

const dones = cimientos.trama.dones;
comprobar('quien discute y no se calla acaba de epigrafista', dones.e1 === 'descifrar', `le tocó ${dones.e1}`);
comprobar('quien cuida de todo el mundo acaba curando', dones.e2 === 'sanar', `le tocó ${dones.e2}`);
comprobar('quien habla de dinero acaba sobornando', dones.e4 === 'sobornar', `le tocó ${dones.e4}`);
comprobar('quien hace fotos acaba documentando', dones.e5 === 'documentar', `le tocó ${dones.e5}`);
comprobar('nadie se queda sin don', Object.keys(dones).length === EXPEDICION.length);

// ---------------------------------------------------------------------------
// 6. Ritos que no se pueden distinguir
// ---------------------------------------------------------------------------

seccion('Ritos con nombres calcados: se admite en vez de disimular');

const gemelos = partidaDeMomia('momia-gemelos');
gemelos.entidades = {
  ritos: [
    { id: 't1', name: 'Rito del Agua' },
    { id: 't2', name: 'Rito del Agua' },
    { id: 't3', name: 'Rito del Nombre' },
    { id: 't4', name: 'Rito de la Balanza' },
    { id: 't5', name: 'Rito del Silencio' },
  ],
};
const entGemelos = entidadesDeLaMomia(gemelos);
const cimGemelos = cimientosDeMomia(entGemelos, { semilla: gemelos.id });
const respGemelos = respuestaDeDemostracion(gemelos.name, entGemelos, cimGemelos.trama);
const resGemelos = ensamblarTramaMomia(gemelos, entGemelos, cimGemelos, respGemelos);

comprobar('con ritos indistinguibles se rechazan TODAS las frases del modelo',
  resGemelos.redaccion.aceptadas === 0, `se aceptaron ${resGemelos.redaccion.aceptadas}`);
comprobar('y se dice por qué', resGemelos.incidencias.some((i) => /no se distinguen/.test(i.motivo)));
const lexGemelos = lexicoDeRitos(entGemelos.ritos.map((r) => ({ id: r.id, name: r.name })));
comprobar('la partida sigue siendo jugable',
  todasLasFrasesSonSanas(resGemelos, lexGemelos) === null,
  todasLasFrasesSonSanas(resGemelos, lexGemelos) ?? '');

// ---------------------------------------------------------------------------
// Cierre
// ---------------------------------------------------------------------------

const informeFinal = verificarPuzle(idsDeRito, cimientos.puzle);
console.log(
  `\nEl papiro · ${cimientos.trama.restricciones.length} restricciones ciertas, ` +
    `${cimientos.trama.falsasCandidatas.length} falsas, ${informeFinal.soluciones} solución, ` +
    `refutabilidad mínima ${informeFinal.refutabilidadMinima}`,
);
console.log(`${pasadas} comprobaciones`);

if (fallos.length > 0) {
  console.log('\nFALLOS:');
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log(`\n${fallos.length} fallos. La generación de la Momia puede entregar una velada rota.`);
  process.exit(1);
}

console.log('La lógica del puzle la garantiza el código y la redacción del modelo se valida entera.');
