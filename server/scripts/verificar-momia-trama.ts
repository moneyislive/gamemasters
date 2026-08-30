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
import { ensamblarTramaMomia, entidadesDeLaMomia, loQueFalta } from '../src/plot/momia-generacion';
import { respuestaDeDemostracion } from '../src/plot/momia-demo';
import { comprobarRedaccion, lexicoDeRitos, ritosMencionados } from '../src/plot/momia-validacion';
import { redactar, verificarPuzle, maximoQueJuntaUnaPersona } from '../src/juegos/momia-puzle';
import { solucionesDe } from '../../shared/juegos/momia-tipos';
// Del índice: al cargarlo se registran los manifiestos y se anota dónde vive
// cada categoría. Importando el manifiesto suelto, 'camaras' no resolvería.
import { MOMIA } from '../../shared/juegos';
import { computeStaleness } from '../../shared/staleness';
import { ampliarExpedicion, donesAlDia } from '../src/juegos/momia-trama';
import { estadoDe } from '../src/juegos/momia-acciones';
import { entidadesDe, listaDeCategoria } from '../../shared/juegos';
import type { RespuestaMomia } from '../src/plot/momia-esquema';
import type { RitoId } from '../../shared/juegos/momia-tipos';
import { renderPrintableDocument } from '../src/docs/imprimibles';
import { DONES } from '../src/docs/imprimibles/momia/datos';
import type { PrintableDocId } from '../../shared/documents';
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
  /*
   * TODO FRAGMENTO CIERTO TIENE QUE PODER ENCONTRARSE. El conjunto es mínimo:
   * si uno no aparece en ninguna cámara ninguna noche, el papiro que la mesa
   * puede reunir admite más de un orden y la tumba no se sella por mucho que
   * hablen. Ocurría de verdad —seis fragmentos y cinco cámaras dejaban uno
   * fuera— y por eso esto se comprueba en cada una de las cien siembras.
   */
  const encontrables = new Set(trama.hallazgos.map((h) => h.fragmentoId));
  const inencontrables = trama.restricciones.filter((r) => !encontrables.has(r.id));
  if (inencontrables.length > 0) {
    fallos.push(
      `cimientos ${n}: ${inencontrables.map((r) => r.id).join(', ')} no aparecen en ninguna cámara`,
    );
    break;
  }
  if (trama.hallazgos.some((h) => !trama.restricciones.some((r) => r.id === h.fragmentoId))) {
    fallos.push(`cimientos ${n}: hay hallazgos que apuntan a un fragmento inexistente`);
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

/*
 * LA TRAMPA ARITMÉTICA DEL REPARTO, buscada a propósito.
 *
 * `repartirHallazgos` recorre los fragmentos con un desplazamiento de
 * `cámaras + 1` por vigilia. Cuando ese paso es múltiplo del número de
 * fragmentos —seis fragmentos y cinco cámaras— el desplazamiento efectivo es
 * CERO: todas las vigilias reparten los mismos cinco y el sexto no está en
 * ninguna cámara ninguna noche. Como el conjunto es mínimo, sin él el papiro
 * admite más de un orden y la tumba no se puede sellar.
 *
 * No se puede dejar que este caso aparezca por suerte entre las cien siembras de
 * arriba: se busca hasta encontrarlo y se exige que esté cubierto. Y si no
 * apareciera ninguno, también es un fallo — significaría que esta comprobación
 * dejó de probar lo que dice probar.
 */
const conLaTrampa: number[] = [];
for (let n = 0; n < 200 && conLaTrampa.length < 3; n++) {
  const { trama } = cimientosDeMomia(entidades, { semilla: `trampa-${n}` });
  if (trama.restricciones.length !== CAMARAS.length + 1) continue;
  conLaTrampa.push(n);
  const encontrables = new Set(trama.hallazgos.map((h) => h.fragmentoId));
  const fuera = trama.restricciones.filter((r) => !encontrables.has(r.id));
  comprobar(
    `con ${trama.restricciones.length} fragmentos y ${CAMARAS.length} cámaras, todos se pueden encontrar`,
    fuera.length === 0,
    `no aparecen: ${fuera.map((r) => r.id).join(', ')}`,
  );
}
comprobar(
  'y el caso de la trampa se ha llegado a probar',
  conLaTrampa.length > 0,
  'ninguna de 200 siembras dio un puzle con cámaras+1 fragmentos',
);
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
 * ──────────────────────────────────────────────────────────────────────────────
 * QUIEN LLEGA TARDE: UNA SOLA RESPUESTA, NO DOS
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * A quien se apunta con el misterio ya escrito hay que darle un don. Lo hacía
 * `ampliarExpedicion` al actualizar la partida... y también, por su cuenta y en
 * silencio, `estadoInicial`, que le ponía `descifrar` de respaldo. Dos sitios
 * decidiendo lo mismo son dos respuestas distintas en cuanto una de las dos no
 * se ejecuta: sentar a alguien el móvil ANTES de actualizar —el orden natural
 * cuando llega tarde y hay prisa— le enseñaba un don que su dosier impreso
 * contradecía. Se plantaba en la mesa creyendo que no tiene don, con uno en el
 * bolsillo.
 *
 * Lo que se exige aquí es que la respuesta sea LA MISMA en los dos órdenes.
 */
{
  const conMasGente = JSON.parse(JSON.stringify(game)) as typeof game;
  const listaExp = listaDeCategoria(conMasGente, 'expedicionarios' as never);
  listaExp.push({ id: 'tarde-1', name: 'Quien llegó tarde' });
  listaExp.push({ id: 'tarde-2', name: 'Y quien llegó más tarde' });

  const expedicionarios = entidadesDe(conMasGente, 'expedicionarios');
  const tramaOriginal = JSON.parse(JSON.stringify(sana.plot.delJuego)) as typeof cimientos.trama;

  comprobar('los que llegan tarde no tenían don en la trama',
    tramaOriginal.dones['tarde-1'] === undefined && tramaOriginal.dones['tarde-2'] === undefined);

  // (a) Lo que le enseña el móvil al sentarle, sin haber actualizado nada.
  const enElMovil = donesAlDia(tramaOriginal, expedicionarios);
  comprobar('el móvil ya le da un don de verdad', Boolean(enElMovil['tarde-1']));

  // (b) Lo que escribe el dosier cuando el Game Master actualiza.
  const paraElDosier = { ...conMasGente, plot: JSON.parse(JSON.stringify(sana.plot)) } as typeof game;
  ampliarExpedicion(paraElDosier, paraElDosier.plot!);
  const enElPapel = (paraElDosier.plot!.delJuego as { dones: Record<string, string> }).dones;

  comprobar('y es EL MISMO que acabará imprimiendo el dosier',
    enElMovil['tarde-1'] === enElPapel['tarde-1'] && enElMovil['tarde-2'] === enElPapel['tarde-2'],
    `móvil ${enElMovil['tarde-1']}/${enElMovil['tarde-2']} · papel ${enElPapel['tarde-1']}/${enElPapel['tarde-2']}`);

  comprobar('a nadie que ya lo tenía se le cambia el don',
    Object.entries(tramaOriginal.dones).every(([id, don]) => enElMovil[id] === don && enElPapel[id] === don));

  // La rueda sigue: dos que llegan tarde no reciben el mismo don por defecto.
  comprobar('la rueda sigue repartiendo par, no da el mismo a todos',
    enElMovil['tarde-1'] !== enElMovil['tarde-2'],
    `${enElMovil['tarde-1']} y ${enElMovil['tarde-2']}`);

  // Y da igual el orden: actualizar primero y sentar después da lo mismo.
  const alReves = donesAlDia(
    paraElDosier.plot!.delJuego as typeof cimientos.trama,
    entidadesDe(paraElDosier, 'expedicionarios'),
  );
  comprobar('actualizar antes o después da exactamente lo mismo',
    JSON.stringify(alReves) === JSON.stringify(enElMovil),
    `${JSON.stringify(alReves)} vs ${JSON.stringify(enElMovil)}`);

  /*
   * Y POR EL CAMINO DE PRODUCCIÓN, que es lo único que demuestra algo.
   *
   * Todo lo de arriba mide `donesAlDia`, que es código nuevo: contra el fallo
   * anterior no habría fallado, porque no existía. Lo que de verdad le pasa a
   * alguien que llega tarde es que empareja el móvil y `estadoDe` le monta su
   * sitio en la mesa — ese es el sitio donde estaba el `descifrar` silencioso, y
   * ese es el que hay que preguntar.
   */
  const partidaEnJuego = { ...conMasGente, plot: JSON.parse(JSON.stringify(sana.plot)) } as typeof game;
  const sesionFalsa = {
    id: 'tarde',
    players: entidadesDe(partidaEnJuego, 'expedicionarios').map((e) => ({
      suspectId: e.id,
      displayName: e.name,
      joinCode: 'AAAAAA',
      joined: true,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
  } as unknown as Parameters<typeof estadoDe>[1];

  const enLaMesa = estadoDe(partidaEnJuego, sesionFalsa);
  comprobar('quien llega tarde se sienta con un don, no con el de respaldo',
    enLaMesa.gente['tarde-1']?.don === enElPapel['tarde-1'],
    `mesa ${enLaMesa.gente['tarde-1']?.don} · papel ${enElPapel['tarde-1']}`);
  comprobar('y el segundo también',
    enLaMesa.gente['tarde-2']?.don === enElPapel['tarde-2'],
    `mesa ${enLaMesa.gente['tarde-2']?.don} · papel ${enElPapel['tarde-2']}`);
  comprobar('a los de siempre no se les mueve el suyo',
    Object.entries(tramaOriginal.dones).every(([id, don]) => enLaMesa.gente[id]?.don === don));
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * QUE LA REVISIÓN DE DESCUADRE VEA LA TRAMA PROPIA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `computeStaleness` solo miraba la parte genérica de la trama, y todo lo de la
 * Momia vive en `plot.delJuego`. Se podía borrar una cámara después de generar
 * y la plataforma decía que todo estaba en orden mientras las vigilias
 * apuntaban al vacío. Y los cinco ritos, que son el juego entero, no los miraba
 * nadie porque no tienen equivalente genérico.
 *
 * Lo primero que hay que exigir NO es que avise: es que NO avise cuando no toca.
 * Una comprobación nueva que ladre sobre partidas sanas es peor que no tenerla
 * —enseña a ignorar el aviso—, y aquí el riesgo es real, porque basta con
 * equivocarse de categoría al declarar qué cita la trama.
 */
{
  const partidaGenerada = { ...game, plot: sana.plot, documents: [] } as typeof game;
  const informeSano = computeStaleness(partidaGenerada);
  comprobar('una partida recién generada no tiene ni una referencia rota',
    informeSano.brokenGameRefs.length === 0,
    informeSano.brokenGameRefs.map((r) => `${r.categoria}:${r.id} (${r.donde})`).join(' | '));

  /*
   * Y ahora se rompe a mano, una cosa cada vez.
   *
   * Se borra POR DONDE BORRA LA APLICACIÓN —`listaDeCategoria`— y no tocando
   * `entidades` a mano. No es remilgo: las cámaras viven en `rooms` y las
   * reliquias en `weapons` por herencia de CLUEDO, así que escribir
   * `entidades.camaras = []` no borra una cámara, las esconde todas, y la
   * prueba pasaba a medir otra cosa. La primera versión de esto se equivocó
   * justo ahí.
   */
  const sinLaEntidad = (categoria: string, id: string): typeof game => {
    const copia = JSON.parse(JSON.stringify(partidaGenerada)) as typeof game;
    const lista = listaDeCategoria(copia, categoria as never);
    const donde = lista.findIndex((e) => e.id === id);
    if (donde >= 0) lista.splice(donde, 1);
    return copia;
  };

  const trama = sana.plot.delJuego as {
    profanadas: string[];
    reliquiaCodiciada: string;
    ordenVerdadero: string[];
  };

  const informeRito = computeStaleness(sinLaEntidad('ritos', trama.ordenVerdadero[0]!));
  comprobar('borrar un rito después de generar SÍ se ve',
    informeRito.brokenGameRefs.some((r) => r.categoria === 'ritos'),
    informeRito.brokenGameRefs.map((r) => r.categoria).join(','));
  comprobar('y pide al agente, porque en local no se arregla', informeRito.needsAgent);
  comprobar('y lo dice con palabras que se entienden',
    informeRito.summary.some((f) => f.toLowerCase().includes('rito')), informeRito.summary.join(' | '));

  const informeCamara = computeStaleness(sinLaEntidad('camaras', trama.profanadas[0]!));
  comprobar('borrar la cámara de una vigilia SÍ se ve',
    informeCamara.brokenGameRefs.some((r) => r.categoria === 'camaras'),
    informeCamara.brokenGameRefs.map((r) => `${r.categoria}:${r.id}`).join(','));
  // Una cámara sale en varias vigilias y en varios hallazgos: un aviso, no nueve.
  comprobar('y se avisa una sola vez de la misma cámara',
    informeCamara.brokenGameRefs.filter((r) => r.categoria === 'camaras').length === 1,
    String(informeCamara.brokenGameRefs.length));

  comprobar('borrar la reliquia codiciada SÍ se ve',
    computeStaleness(sinLaEntidad('reliquias', trama.reliquiaCodiciada)).brokenGameRefs
      .some((r) => r.categoria === 'reliquias'));

  // Y borrar algo que la trama NO cita no puede inventarse un aviso.
  const otraReliquia = (partidaGenerada.weapons ?? []).find((w) => w.id !== trama.reliquiaCodiciada);
  if (otraReliquia) {
    comprobar('borrar una reliquia que la trama no cita no dice nada',
      computeStaleness(sinLaEntidad('reliquias', otraReliquia.id)).brokenGameRefs.length === 0);
  }
}

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
      [`${c.characterName} · secreto`, c.secret ?? ''],
      [`${c.characterName} · coartada`, c.alibi ?? ''],
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

/*
 * Y EN UNA MESA MUDA, LOS SEIS DONES TIENEN QUE PODER SALIR.
 *
 * Cuando ninguna descripción dispara una preferencia —cuatro personas y ni una
 * palabra clave— el reparto se queda con lo que sobra, y eso se servía en el
 * orden en que están declarados los dones: salían siempre los cuatro primeros
 * y los dos últimos no se repartían nunca. Dos de los seis papeles del juego no
 * existían para esa mesa, y ninguna semilla lo cambiaba.
 */
{
  const mudos = [
    { id: 'm1', name: 'Uno', description: '' },
    { id: 'm2', name: 'Dos', description: '' },
    { id: 'm3', name: 'Tres', description: '' },
    { id: 'm4', name: 'Cuatro', description: '' },
  ];
  const vistos = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const muda = partidaDeMomia(`momia-muda-${i}`);
    muda.suspects = mudos.map((m) => ({ ...m }));
    const cim = cimientosDeMomia(entidadesDeLaMomia(muda), { semilla: muda.id });
    for (const don of Object.values(cim.trama.dones)) vistos.add(don);
  }
  comprobar(
    'con cuatro personas y sin descripciones, los seis dones acaban saliendo',
    vistos.size === 6,
    `salieron ${[...vistos].sort().join(', ')}`,
  );
}

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
// 7. Los imprimibles: la partida en papel
// ---------------------------------------------------------------------------

seccion('Los ocho imprimibles, compuestos de verdad');

const partidaConTrama: GameSession = { ...partidaDeMomia(), plot: sana.plot };

const IMPRIMIBLES: PrintableDocId[] = [
  'guia-expedicion',
  'dosier-expedicionario',
  'fragmentos-papiro',
  'carteles-camara',
  'hoja-sellado',
  'tabla-marcas',
  'papiro-sellado',
  'informe-papiro',
];

const compuestos = new Map<PrintableDocId, string>();
for (const id of IMPRIMIBLES) {
  const doc = renderPrintableDocument(partidaConTrama, id);
  comprobar(`se compone «${id}»`, Boolean(doc?.html && doc.html.length > 1500),
    doc ? `${doc.html?.length ?? 0} caracteres` : 'devolvió null');
  if (doc?.html) compuestos.set(id, doc.html);
  comprobar(`«${id}» no sale con el andamio de «pendiente»`,
    !(doc?.html ?? '').includes('todavía no está escrito'));
}

/** ¿Aparecen los cinco ritos en el orden verdadero dentro de este HTML? */
function delataElOrden(html: string): boolean {
  const m = ritosMencionados(html, lexico);
  return m.length >= orden.length && m.join('>') === orden.join('>');
}

/*
 * LA GUÍA SE MANEJA TODA LA NOCHE DELANTE DE LA MESA. Por eso no lleva ni el
 * orden verdadero ni el nombre de quien rompió el sello: eso vive en el papiro
 * del sellado, que es una hoja aparte y boca abajo. Si alguien mete el orden en
 * la guía «para tenerlo a mano», esta comprobación se pone roja.
 */
const nombreSaqueador = EXPEDICION.find(
  (e) => e.id === sana.plot.solution.respuestas.saqueador,
)!.name;

for (const id of ['guia-expedicion', 'hoja-sellado', 'carteles-camara', 'informe-papiro'] as PrintableDocId[]) {
  const html = compuestos.get(id) ?? '';
  comprobar(`«${id}» no delata el orden verdadero`, !delataElOrden(html));
}
/*
 * «No nombra al saqueador» no se puede comprobar por el nombre: la guía lista a
 * la expedición entera en la tabla de dones, y ahí está esa persona junto a las
 * demás, que es justo lo que tiene que pasar. Lo que no puede llevar es lo que
 * SOLO sabe quien rompió el sello: su motivo, el relato de cómo lo hizo y la
 * frase con la que su dosier se lo dice.
 */
const guia = compuestos.get('guia-expedicion') ?? '';
comprobar('la guía no lleva el motivo del saqueador',
  !guia.includes(sana.plot.solution.motive.slice(0, 40)));
comprobar('ni el relato de cómo rompió el sello',
  !guia.includes(sana.plot.solution.howItHappened.slice(0, 40)));
comprobar('ni la frase que se lo dice a esa persona', !guia.includes('Fuiste tú'));
comprobar('la hoja del sellado tampoco',
  !(compuestos.get('hoja-sellado') ?? '').includes('Fuiste tú'));

// Y el papiro del sellado SÍ, que para eso existe. Sin esto, un documento vacío
// pasaría las cuatro comprobaciones de arriba con matrícula.
comprobar('el papiro del sellado SÍ lleva el orden verdadero',
  delataElOrden(compuestos.get('papiro-sellado') ?? ''));
comprobar('y SÍ nombra a quien rompió el sello',
  (compuestos.get('papiro-sellado') ?? '').includes(nombreSaqueador));

/*
 * Los dosieres van todos en un mismo documento y se separan al ensobrar. Solo
 * UNO puede decir «fuiste tú»: si lo dijeran dos, habría dos saqueadores; si
 * ninguno, la persona que lo es no lo sabría y jugaría de inocente.
 */
const dosieres = compuestos.get('dosier-expedicionario') ?? '';
comprobar('exactamente un dosier revela que su dueño rompió el sello',
  (dosieres.match(/Fuiste tú/g) ?? []).length === 1,
  `${(dosieres.match(/Fuiste tú/g) ?? []).length} veces`);
comprobar('y hay un dosier por persona',
  EXPEDICION.every((e) => dosieres.includes(e.name)));

/*
 * Las tiras de fragmento son las que se recortan y reparten. Tienen que estar
 * todas —las ciertas y las falsas, que se guarda quien dirige— y tiene que
 * quedar dicho que se imprime a una sola cara: a doble cara se leen al trasluz.
 */
const tiras = compuestos.get('fragmentos-papiro') ?? '';
const tramaSana = sana.plot.delJuego as typeof cimientos.trama;
comprobar('las tiras traen los textos de TODOS los fragmentos ciertos',
  tramaSana.restricciones.every((f) => tiras.includes(f.texto.replace(/&/g, '&amp;'))),
  tramaSana.restricciones.filter((f) => !tiras.includes(f.texto.replace(/&/g, '&amp;'))).map((f) => f.id).join(', '));
comprobar('y también las falsificaciones, en su página aparte',
  tramaSana.falsasCandidatas.every((f) => tiras.includes(f.texto.replace(/&/g, '&amp;'))));
comprobar('y avisan de imprimir a una sola cara',
  tiras.includes('UNA SOLA CARA') || tiras.includes('una sola cara'));
comprobar('y traen la línea de doblez que impide leerlas por detrás',
  tiras.includes('dobla por aquí'));

/*
 * El informe del papiro es el que le da confianza a quien monta la velada. Con
 * una trama sana tiene que decir que todo cuadra; si dijera eso siempre, no
 * valdría nada, así que también se comprueba al revés más abajo.
 */
const informe = compuestos.get('informe-papiro') ?? '';
comprobar('el informe da el puzle por bueno cuando lo es',
  informe.includes('El papiro está bien roto'));

/*
 * Y ahora con una trama ESTROPEADA: se le quita un fragmento cierto, con lo que
 * el puzle deja de tener una sola solución. El informe tiene que enterarse. Es
 * la comprobación que impide que este documento sea un sello de goma.
 */
const tramaCoja = {
  ...tramaSana,
  restricciones: tramaSana.restricciones.slice(1),
  hallazgos: tramaSana.hallazgos.filter((h) => h.fragmentoId !== tramaSana.restricciones[0]!.id),
};
const partidaCoja: GameSession = {
  ...partidaConTrama,
  plot: { ...sana.plot, delJuego: tramaCoja },
};
const informeCojo = renderPrintableDocument(partidaCoja, 'informe-papiro')?.html ?? '';
comprobar('y lo desmiente cuando el puzle se queda sin solución única',
  !informeCojo.includes('El papiro está bien roto') && informeCojo.includes('antes de imprimir nada'),
  informeCojo.includes('El papiro está bien roto') ? 'lo dio por bueno igual' : 'no avisó');

/*
 * Y sin trama de la Momia —una partida vieja, o una a la que le cambiaron el
 * juego— cada documento tiene que decir qué pasa, no salir en blanco.
 */
const sinDelJuego: GameSession = {
  ...partidaConTrama,
  plot: { ...sana.plot, delJuego: undefined },
};
for (const id of IMPRIMIBLES) {
  const html = renderPrintableDocument(sinDelJuego, id)?.html ?? '';
  comprobar(`«${id}» explica qué falta si no hay trama del juego`,
    html.includes('no tiene trama de El Misterio de la Momia'),
    `${html.length} caracteres`);
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * Y LA MISMA PARTIDA CON QUIEN DIRIGE A CIEGAS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Con `gmPlays`, quien conduce la velada juega como un expedicionario más y no
 * conoce la solución: el papiro del sellado lo guarda quien preparó el material,
 * y es esa persona la que sale al final. Una guía que le dijera «saca ahora el
 * papiro del sellado» le mandaría a por una hoja que no tiene, en el peor
 * momento de la noche — y en la Momia el peor momento es cuando ya se ha votado.
 */
const aCiegas: GameSession = {
  ...partidaConTrama,
  settings: { ...partidaConTrama.settings, gmPlays: true },
};

const guiaCiega = renderPrintableDocument(aCiegas, 'guia-expedicion')?.html ?? '';
const papiroCiego = renderPrintableDocument(aCiegas, 'papiro-sellado')?.html ?? '';

comprobar('a ciegas, el papiro del sellado SÍ se imprime', papiroCiego.length > 1500,
  papiroCiego ? `${papiroCiego.length} caracteres` : 'no se generó: la partida a ciegas no se podría arbitrar');
comprobar('y avisa de que no se le dé a quien dirige',
  papiroCiego.includes('Quien dirige juega esta noche'));
comprobar('a ciegas, la guía no manda a quien dirige a por el papiro',
  !guiaCiega.includes('Saca ahora el papiro del sellado'),
  'le mandaría a por una hoja que no tiene');
comprobar('y le dice quién sale con él', guiaCiega.includes('quien preparó el material'));
comprobar('la guía a ciegas sigue sin delatar el orden', !delataElOrden(guiaCiega));
comprobar('y sigue sin llevar el motivo del saqueador',
  !guiaCiega.includes(sana.plot.solution.motive.slice(0, 40)));

/*
 * LAS DOS COSAS QUE LA GUIA A CIEGAS SEGUIA CONTANDO.
 *
 * Esta hoja se maneja toda la noche delante de la mesa y, con quien dirige
 * jugando, cae en `01_GAME_MASTER`, cuyo leeme promete que nada de ahi revela el
 * caso. Llevaba dos cosas que si lo revelan: la tabla NOMINAL de dones —saber
 * que Marta descifra y Bruno sana es saber media mesa antes de empezar, cuando
 * el juego consiste en averiguarlo hablando— y las tres ayudas graduadas, que
 * son empujones hacia el orden verdadero y la de nivel 3 puede fijar un extremo.
 * CLUEDO ya habia tomado la decision contraria en `cartaImprevistos.ts`.
 */
for (const persona of EXPEDICION) {
  const suDon = cimientos.trama.dones[persona.id];
  const escrito = suDon ? DONES[suDon] : undefined;
  if (!escrito) continue;
  comprobar(
    `la guia a ciegas no dice que ${persona.name} tiene «${escrito.nombre}»`,
    !new RegExp(`${persona.name}[^]{0,400}${escrito.nombre}`).test(guiaCiega),
  );
}
comprobar(
  'ni imprime las ayudas graduadas',
  (sana.plot.material?.hints ?? []).every((h) => !guiaCiega.includes(h.text.slice(0, 40))),
  'cada ayuda es un empujon hacia el orden, y quien lee esta hoja juega',
);
/*
 * PERO NO SE FILTRA DE MAS, que es el fallo contrario y tambien rompe la
 * velada: quien dirige sigue teniendo que arbitrar una invocacion en el momento,
 * juegue o no, y las ayudas tienen que existir en alguna parte.
 */
comprobar('pero sigue explicando como se arbitra cada don',
  guiaCiega.includes('Qué haces cuando alguien lo invoca'));
comprobar('y las ayudas salen en el papiro, que es de quien prepara',
  (sana.plot.material?.hints ?? []).every((h) => papiroCiego.includes(h.text.slice(0, 40))),
  'a ciegas la mesa se quedaria sin red al atascarse');

/*
 * Y EN MODO ANFITRION NO CAMBIA NADA: quien dirige sin jugar conoce la solucion,
 * la lleva en su dosier, y recortarle la tabla seria quitarle el arbitraje por
 * nada.
 */
const guiaNormal = renderPrintableDocument(partidaConTrama, 'guia-expedicion')?.html ?? '';
comprobar('dirigiendo de la forma normal, la tabla nominal sigue entera',
  EXPEDICION.every((p) => guiaNormal.includes(p.name)));
comprobar('y las ayudas siguen en la guia',
  (sana.plot.material?.hints ?? []).every((h) => guiaNormal.includes(h.text.slice(0, 40))));

/*
 * Y para mirarlos con los ojos, que es lo que ninguna comprobación sustituye:
 *
 *   npm run verify:momia-trama -w server -- --volcar C:\\ruta\\donde\\sea
 *
 * Los PDF son de lo que más fácil se da por bueno leyendo el código y peor sale
 * en papel: márgenes, cortes de página, tiras que no se recortan bien. Esto
 * escribe los ocho a disco para abrirlos e imprimir uno de verdad.
 */
const donde = process.argv[process.argv.indexOf('--volcar') + 1];
if (process.argv.includes('--volcar') && donde) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  fs.mkdirSync(donde, { recursive: true });
  for (const [id, html] of compuestos) {
    fs.writeFileSync(path.join(donde, `${id}.html`), html, 'utf8');
  }
  console.log(`\nVolcados ${compuestos.size} documentos en ${donde}`);
}

// ---------------------------------------------------------------------------
// 8. Cuándo merece la pena volver a preguntar
// ---------------------------------------------------------------------------

seccion('La segunda tirada: cuándo se pide y cuándo no');

/*
 * `loQueFalta` decide si se paga una segunda llamada al modelo. No es la
 * validación —esa la hace `ensamblarTramaMomia`, que tiene recambio para cada
 * hueco—: es la pregunta de si lo que ha llegado da para una velada.
 *
 * El listón está en la mitad a propósito, y las dos direcciones importan igual.
 * Si salta de más, cada generación cuesta el doble y tarda otros cinco minutos
 * por unas frases que el ensamblado ya sabía arreglar. Si salta de menos, se
 * imprime una expedición con los dosieres en blanco y eso solo se ve en la
 * mesa. Los dos casos rotos de aquí abajo son los que se midieron contra la API
 * de verdad, no inventados.
 */
{
  comprobar('una respuesta entera no pide nada', loQueFalta(buena, entidades, cimientos).length === 0,
    loQueFalta(buena, entidades, cimientos).join(', '));

  const sinNadie = copiar(buena);
  sinNadie.expedicionarios = [];
  comprobar('sin la expedición, se pide otra',
    loQueFalta(sinNadie, entidades, cimientos).some((f) => f.includes('dosieres')));

  // EL CASO REAL: el modelo escribe los seis dosieres pero se inventa los ids,
  // así que no casa ninguno y salen seis dosieres mínimos sin un solo error.
  const idsInventados = copiar(buena);
  for (const [i, p] of idsInventados.expedicionarios.entries()) p.suspectId = `persona-${i + 1}`;
  comprobar('con los ids inventados, se pide otra',
    loQueFalta(idsInventados, entidades, cimientos).some((f) => f.includes('dosieres')));

  // Y el contrario: que se deje a UNA persona lo arregla el dosier mínimo.
  const faltaUno = copiar(buena);
  faltaUno.expedicionarios = faltaUno.expedicionarios.slice(1);
  comprobar('si solo falta una persona, NO se pide otra',
    loQueFalta(faltaUno, entidades, cimientos).length === 0,
    loQueFalta(faltaUno, entidades, cimientos).join(', '));

  const sinFragmentos = copiar(buena);
  sinFragmentos.fragmentos = [];
  comprobar('sin fragmentos redactados, se pide otra',
    loQueFalta(sinFragmentos, entidades, cimientos).some((f) => f.includes('fragmentos')));

  // El otro caso real: el JSON cierra con los arrays grandes vacíos.
  const cascaraVacia = copiar(buena);
  cascaraVacia.vigilias = [];
  cascaraVacia.cronologia = [];
  cascaraVacia.ayudas = [];
  cascaraVacia.guion = [];
  const huecos = loQueFalta(cascaraVacia, entidades, cimientos);
  comprobar('con los arrays grandes vacíos, se pide otra', huecos.length === 4, huecos.join(', '));

  // Y lo que NO puede pasar: que una respuesta buena con una frase menos
  // dispare la segunda llamada.
  const casiEntera = copiar(buena);
  casiEntera.expedicionarios[0].secret = '';
  casiEntera.ayudas = casiEntera.ayudas.slice(0, 1);
  comprobar('una respuesta con algún hueco suelto NO pide otra',
    loQueFalta(casiEntera, entidades, cimientos).length === 0,
    loQueFalta(casiEntera, entidades, cimientos).join(', '));
}

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
