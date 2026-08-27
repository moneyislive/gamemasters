/**
 * El puzle del sellado, a fondo.
 *
 *   npm run verify:puzle-momia
 *
 * POR QUÉ ESTE COMPROBADOR EXISTE APARTE DE LA VELADA. La velada juega UNA
 * partida, con UN puzle. Un generador que falla una vez de cada trescientas
 * pasaría esa prueba en verde trescientas veces seguidas y reventaría en casa de
 * alguien, de noche, con la mesa puesta. Así que aquí se generan doscientos y
 * pico con semillas distintas y se comprueban las cuatro garantías en TODOS,
 * contra las 120 permutaciones, una a una.
 *
 * Y HAY UNA SEGUNDA MITAD, que es la que de verdad da confianza: se fabrican
 * puzles ROTOS a propósito —uno con dos soluciones, uno con una restricción que
 * sobra, uno donde una sola persona lo resuelve sola, uno con una mentira que se
 * pilla con una sola carta— y se comprueba que el verificador los caza. Sin
 * esto, `verificarPuzle` podría estar devolviendo `ok: true` a todo y estas
 * doscientas comprobaciones saldrían igual de verdes.
 *
 * Es la disciplina que en este repo costó cara: hubo una comprobación que pasaba
 * en verde con la regla rota porque otro límite devolvía el mismo error. Una
 * comprobación que nunca se ha visto fallar no demuestra nada.
 */
import {
  claveDe,
  generarPuzle,
  maximoQueJuntaUnaPersona,
  mencionaLosRitos,
  redactar,
  refutabilidad,
  repartirHallazgos,
  universoCierto,
  verificarPuzle,
} from '../src/juegos/momia-puzle';
import { cumple, solucionesDe } from '../../shared/juegos/momia-tipos';
import type { PuzleMomia } from '../src/juegos/momia-puzle';
import type { Restriccion, RitoId } from '../../shared/juegos/momia-tipos';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 240)}`}`,
  );
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const RITOS: RitoId[] = ['agua', 'aliento', 'nombre', 'balanza', 'silencio'];
const NOMBRES: Record<string, string> = {
  agua: 'Rito del Agua',
  aliento: 'Rito del Aliento',
  nombre: 'Rito del Nombre',
  balanza: 'Rito de la Balanza',
  silencio: 'Rito del Silencio',
};
const nombreDe = (id: RitoId): string => NOMBRES[id] ?? id;

// ---------------------------------------------------------------------------
// Doscientos y pico puzles
// ---------------------------------------------------------------------------

paso('Doscientos cuarenta puzles, con semillas distintas');

const CUANTOS = 240;
const tamanos: number[] = [];
let peorRefutabilidad = Infinity;
let sinConsistencia = 0;
let sinUnicidad = 0;
let sinReparto = 0;
let conRedundantes = 0;
let falsasFlojas = 0;
let sinFalsas = 0;

for (let i = 0; i < CUANTOS; i++) {
  // Se varía también el número de jugadores: el reparto es lo que cambia con
  // él, y con cuatro fijos no se probaría nunca el caso de dos ni el de seis.
  const jugadores = 2 + (i % 5);
  const puzle = generarPuzle({ ritos: RITOS, jugadores, semilla: `puzle-${i}` });
  const informe = verificarPuzle(RITOS, puzle);

  if (!informe.consistente) sinConsistencia++;
  if (!informe.unico) sinUnicidad++;
  if (!informe.repartida) sinReparto++;
  if (!informe.minimo) conRedundantes++;
  if (!informe.falsasSanas) falsasFlojas++;
  if (puzle.falsas.length === 0) sinFalsas++;

  tamanos.push(puzle.restricciones.length);
  if (puzle.falsas.length) {
    peorRefutabilidad = Math.min(peorRefutabilidad, informe.refutabilidadMinima);
  }
}

comprobar(`garantía 1 · los ${CUANTOS} son consistentes`, sinConsistencia === 0, sinConsistencia);
comprobar(`garantía 2 · los ${CUANTOS} tienen UNA sola solución`, sinUnicidad === 0, sinUnicidad);
comprobar(
  `garantía 3 · en ninguno hay quien lo resuelva en solitario`,
  sinReparto === 0,
  sinReparto,
);
comprobar(`garantía 4 · en ninguno sobra una restricción`, conRedundantes === 0, conRedundantes);
comprobar('todos preparan mentiras para el saqueador', sinFalsas === 0, sinFalsas);
comprobar('y ninguna mentira se pilla con una sola carta', falsasFlojas === 0, falsasFlojas);
comprobar(
  'la mentira más floja de las 240 partidas sigue necesitando dos cartas',
  peorRefutabilidad >= 2,
  peorRefutabilidad,
);

const minimo = Math.min(...tamanos);
const maximo = Math.max(...tamanos);
console.log(
  `  restricciones por puzle: entre ${minimo} y ${maximo} ` +
    `(media ${(tamanos.reduce((a, b) => a + b, 0) / tamanos.length).toFixed(1)})`,
);
comprobar(
  'ningún puzle sale con menos de tres fragmentos',
  minimo >= 3,
  minimo,
);
comprobar(
  'ni con tantos que la mesa no los lea en una noche',
  maximo <= 12,
  maximo,
);

// ---------------------------------------------------------------------------
// La misma semilla, el mismo puzle
// ---------------------------------------------------------------------------

paso('Determinismo');

const unaVez = generarPuzle({ ritos: RITOS, jugadores: 4, semilla: 'la-misma' });
const otraVez = generarPuzle({ ritos: RITOS, jugadores: 4, semilla: 'la-misma' });
comprobar(
  'la misma semilla da el mismo puzle, hasta el reparto y las mentiras',
  JSON.stringify(unaVez) === JSON.stringify(otraVez),
);
const distinta = generarPuzle({ ritos: RITOS, jugadores: 4, semilla: 'otra' });
comprobar(
  'y una semilla distinta da otro',
  JSON.stringify(unaVez) !== JSON.stringify(distinta),
);

// ---------------------------------------------------------------------------
// Las mentiras
// ---------------------------------------------------------------------------

paso('Las falsas candidatas');

const conMentiras = generarPuzle({ ritos: RITOS, jugadores: 4, semilla: 'mentiras', falsas: 6 });
comprobar('se preparan las que se piden', conMentiras.falsas.length === 6, conMentiras.falsas.length);
comprobar(
  'todas contradicen el orden verdadero',
  conMentiras.falsas.every((f) => !cumple(conMentiras.ordenVerdadero, f.restriccion)),
);
comprobar(
  'ninguna repite una restricción que ya está sobre la mesa',
  conMentiras.falsas.every(
    (f) => !conMentiras.restricciones.some((r) => claveDe(r) === claveDe(f.restriccion)),
  ),
);
comprobar(
  'ninguna es absurda por sí sola: todas admiten algún orden',
  conMentiras.falsas.every((f) => solucionesDe(RITOS, [f.restriccion]).length > 0),
);
comprobar(
  'y al juntarlas con TODOS los fragmentos ciertos, la mesa las desmiente',
  conMentiras.falsas.every(
    (f) => solucionesDe(RITOS, [...conMentiras.restricciones, f.restriccion]).length === 0,
  ),
);

/*
 * SE PIDEN TODAS LAS QUE HAYA, Y ESO NO ES CAPRICHO.
 *
 * `falsasCandidatas` hace dos cosas: descarta las que una sola carta desmiente y
 * ordena por dificultad para servir primero las mejores. Pidiendo cuatro, el
 * orden esconde al filtro: las flojas quedarían las últimas y no llegarían al
 * corte aunque el filtro no existiera. Se comprobó rompiéndolo —relajando el
 * filtro a «≥1»— y la prueba seguía en verde, que es justo el fallo del que
 * avisa la cabecera de este fichero.
 *
 * Pidiendo doscientas se agota el repertorio, el orden deja de tapar nada y el
 * filtro es lo único que puede dejar fuera a las flojas.
 */
const todasLasMentiras = generarPuzle({
  ritos: RITOS,
  jugadores: 4,
  semilla: 'mentiras',
  falsas: 200,
});
comprobar(
  'pidiendo todas las mentiras posibles, ni una se desmiente con una sola carta',
  todasLasMentiras.falsas.length > conMentiras.falsas.length &&
    todasLasMentiras.falsas.every(
      (f) => refutabilidad(RITOS, todasLasMentiras.restricciones, f.restriccion) >= 2,
    ),
  {
    cuantas: todasLasMentiras.falsas.length,
    flojas: todasLasMentiras.falsas.filter(
      (f) => refutabilidad(RITOS, todasLasMentiras.restricciones, f.restriccion) < 2,
    ).length,
  },
);

// ---------------------------------------------------------------------------
// Dónde aparecen los fragmentos
// ---------------------------------------------------------------------------

paso('El reparto por cámaras y vigilias');

const CAMARAS = ['c1', 'c2', 'c3', 'c4', 'c5'];
let alguienLosJuntaTodos = 0;
let repetidos = 0;
let perdidos = 0;
for (let i = 0; i < 120; i++) {
  const puzle = generarPuzle({ ritos: RITOS, jugadores: 4, semilla: `hallazgo-${i}` });
  const ids = puzle.restricciones.map((_, n) => `f${n}`);
  // Se prueban veladas de dos, tres y cuatro vigilias: con una sola vigilia por
  // fragmento es cuando el reparto ingenuo dejaría que alguien los juntase todos.
  const rondas = 2 + (i % 3);
  const hallazgos = repartirHallazgos({
    fragmentos: ids,
    camaras: CAMARAS,
    rondas,
    semilla: `h-${i}`,
  });
  if (hallazgos.length !== ids.length) perdidos++;
  if (new Set(hallazgos.map((h) => h.fragmentoId)).size !== ids.length) repetidos++;
  if (maximoQueJuntaUnaPersona(hallazgos) >= ids.length) alguienLosJuntaTodos++;
}
comprobar('no se pierde ningún fragmento por el camino', perdidos === 0, perdidos);
comprobar('ni se coloca ninguno dos veces', repetidos === 0, repetidos);
comprobar(
  'y en ninguna de las 120 veladas puede una sola persona juntarlos todos',
  alguienLosJuntaTodos === 0,
  alguienLosJuntaTodos,
);

// ---------------------------------------------------------------------------
// La redacción
// ---------------------------------------------------------------------------

paso('La frase de papiro');

const paraLeer = generarPuzle({ ritos: RITOS, jugadores: 4, semilla: 'redaccion' });
comprobar(
  'cada restricción se redacta con una frase que se puede leer en voz alta',
  paraLeer.restricciones.every((r) => redactar(r, nombreDe).length > 20),
);
comprobar(
  'y la frase menciona los ritos de los que habla',
  paraLeer.restricciones.every((r) => mencionaLosRitos(redactar(r, nombreDe), r, nombreDe)),
);
comprobar(
  'sin la contracción sin hacer que delataría una plantilla mal escrita',
  paraLeer.restricciones.every((r) => !redactar(r, nombreDe).includes(' a el ')),
  paraLeer.restricciones.map((r) => redactar(r, nombreDe)),
);

/*
 * LA VALIDACIÓN DE §7, y es la que evita el desastre silencioso: si el modelo
 * redacta la frase de OTRO fragmento, la partida queda irresoluble y nadie se
 * entera hasta la noche. Se prueba con una frase deliberadamente cambiada.
 */
const unaCualquiera = paraLeer.restricciones.find((r) => r.tipo === 'antes')!;
comprobar(
  'una frase que habla de otros ritos se detecta',
  !mencionaLosRitos('El Rito del Escarabajo precede a todos.', unaCualquiera, nombreDe),
);
comprobar(
  'y una que solo menciona la mitad, también',
  !mencionaLosRitos(`${nombreDe(unaCualquiera.a)} manda.`, unaCualquiera, nombreDe),
);

// ---------------------------------------------------------------------------
// ROMPERLO A PROPÓSITO
// ---------------------------------------------------------------------------

/*
 * Aquí es donde este comprobador se gana el sueldo.
 *
 * Todo lo de arriba comprueba que `verificarPuzle` dice «bien» a puzles buenos.
 * Eso lo haría igual de bien una función que devolviera `ok: true` sin mirar.
 * Estas líneas fabrican puzles rotos —uno por garantía— y comprueban que los
 * caza. Si alguien vacía `verificarPuzle`, la mitad de arriba sigue verde y esta
 * se pone roja.
 */
paso('Los puzles rotos a propósito: el verificador tiene que cazarlos');

const bueno = generarPuzle({ ritos: RITOS, jugadores: 4, semilla: 'para-romper' });
comprobar('el puzle de partida está sano', verificarPuzle(RITOS, bueno).ok, verificarPuzle(RITOS, bueno));

/** Copia con lo que se le cambie. Para no mutar el bueno entre roturas. */
function como(puzle: PuzleMomia, cambios: Partial<PuzleMomia>): PuzleMomia {
  return { ...puzle, ...cambios };
}

// --- Rotura 1: sin unicidad. Se quita una restricción y aparecen más órdenes.
const sinUna = como(bueno, {
  restricciones: bueno.restricciones.slice(1),
  reparto: [[0], [1]],
});
const informeSinUna = verificarPuzle(RITOS, sinUna);
comprobar(
  'un puzle al que le falta una restricción deja de ser único, y se ve',
  !informeSinUna.unico && informeSinUna.soluciones > 1 && !informeSinUna.ok,
  informeSinUna,
);

// --- Rotura 2: sin minimalidad. Se le añade una restricción cierta que sobra.
const yaEstan = new Set(bueno.restricciones.map(claveDe));
const deMas = universoCierto(bueno.ordenVerdadero).find((r) => {
  if (yaEstan.has(claveDe(r))) return false;
  // Que sobre de verdad: con ella, quitarla tiene que dejar el puzle igual.
  return solucionesDe(RITOS, [...bueno.restricciones, r]).length === 1;
})!;
const conSobra = como(bueno, {
  restricciones: [...bueno.restricciones, deMas],
  reparto: [...bueno.reparto.slice(0, -1), [...bueno.reparto.at(-1)!, bueno.restricciones.length]],
});
const informeSobra = verificarPuzle(RITOS, conSobra);
comprobar(
  'un puzle con una restricción redundante sigue siendo único pero deja de ser mínimo',
  informeSobra.unico && !informeSobra.minimo && !informeSobra.ok,
  { unico: informeSobra.unico, minimo: informeSobra.minimo, redundantes: informeSobra.redundantes.length },
);

// --- Rotura 3: sin suficiencia repartida. Se le da todo a una sola persona.
const todoAUno = como(bueno, {
  reparto: [bueno.restricciones.map((_, i) => i), []],
});
const informeTodoAUno = verificarPuzle(RITOS, todoAUno);
comprobar(
  'si una sola persona se queda con todos los fragmentos, el reparto se marca mal',
  !informeTodoAUno.repartida &&
    informeTodoAUno.solucionesPorJugador[0] === 1 &&
    !informeTodoAUno.ok,
  informeTodoAUno.solucionesPorJugador,
);

// --- Rotura 4: una mentira que se pilla con una sola carta.
/*
 * Se fabrica la mentira que choca DE FRENTE con un fragmento cierto concreto:
 * la que cualquiera desmiente poniendo su carta al lado. Es justo el tipo de
 * mentira que §4.3 manda descartar, porque no engaña a nadie y delata al
 * saqueador. Construirla a mano —en vez de coger una al azar y esperar— es lo
 * que hace que esta rotura sea reproducible: la primera versión de esta prueba
 * cogía la primera restricción del puzle y le daba la vuelta, y con una semilla
 * en la que esa primera era una `posicion` salía una mentira que necesitaba
 * tres cartas. La prueba fallaba sin que nada estuviera roto.
 */
function contrariaDe(t: Restriccion, ritos: RitoId[]): Restriccion {
  switch (t.tipo) {
    case 'antes':
    case 'inmediatamente-antes':
      return { tipo: 'antes', a: t.b, b: t.a };
    case 'posicion':
      return { tipo: 'posicion', a: t.a, posicion: t.posicion === 1 ? 2 : 1 };
    case 'no-posicion':
      return { tipo: 'posicion', a: t.a, posicion: t.posicion };
    case 'extremos':
      return { tipo: 'posicion', a: t.a, posicion: Math.ceil(ritos.length / 2) };
  }
}
const mentiraTonta = bueno.restricciones
  .map((t) => contrariaDe(t, RITOS))
  .find((m) => refutabilidad(RITOS, bueno.restricciones, m) === 1)!;
comprobar(
  'existe una mentira que se desmiente con una sola carta, y se sabe cuál',
  Boolean(mentiraTonta) && refutabilidad(RITOS, bueno.restricciones, mentiraTonta) === 1,
  mentiraTonta,
);
const conMentiraTonta = como(bueno, {
  falsas: [{ restriccion: mentiraTonta, refutabilidad: 1 }],
});
const informeMentira = verificarPuzle(RITOS, conMentiraTonta);
comprobar(
  'y el verificador la rechaza aunque el puzle sea perfecto por lo demás',
  informeMentira.unico && informeMentira.minimo && !informeMentira.falsasSanas && !informeMentira.ok,
  informeMentira,
);

// --- Rotura 5: una «falsa» que resulta ser cierta.
const falsaQueEsCierta = bueno.restricciones[0]!;
const informeFalsaCierta = verificarPuzle(
  RITOS,
  como(bueno, { falsas: [{ restriccion: falsaQueEsCierta, refutabilidad: 3 }] }),
);
comprobar(
  'una mentira que resulta ser verdad también se caza: publicarla AYUDARÍA a la mesa',
  !informeFalsaCierta.falsasSanas && !informeFalsaCierta.ok,
  informeFalsaCierta.falsasSanas,
);

// --- Rotura 6: un orden verdadero que no es la solución de sus restricciones.
const informeOrdenTorcido = verificarPuzle(
  RITOS,
  como(bueno, { ordenVerdadero: [...bueno.ordenVerdadero].reverse() }),
);
comprobar(
  'y si el orden verdadero no es el que resuelven las restricciones, se detecta',
  !informeOrdenTorcido.unico && !informeOrdenTorcido.ok,
  informeOrdenTorcido.unico,
);

// ---------------------------------------------------------------------------
// Lo que el generador NO tiene que aceptar
// ---------------------------------------------------------------------------

paso('Las entradas imposibles');

const rechaza = (que: string, fn: () => unknown): void => {
  let salto = false;
  try {
    fn();
  } catch {
    salto = true;
  }
  comprobar(que, salto);
};

rechaza('menos de tres ritos no da puzle', () =>
  generarPuzle({ ritos: ['a', 'b'], jugadores: 4, semilla: 'x' }),
);
rechaza('ritos repetidos tampoco', () =>
  generarPuzle({ ritos: ['a', 'b', 'c', 'a', 'e'], jugadores: 4, semilla: 'x' }),
);
rechaza('ni una sola persona: el puzle se reparte o no es este juego', () =>
  generarPuzle({ ritos: RITOS, jugadores: 1, semilla: 'x' }),
);
rechaza('ni fragmentos sin cámaras donde esconderlos', () =>
  repartirHallazgos({ fragmentos: ['f0'], camaras: [], rondas: 3 }),
);

// ---------------------------------------------------------------------------

console.log(`\nEl puzle del sellado · ${CUANTOS} generados, cuatro garantías, seis roturas`);
console.log(`${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('\nEl generador cumple las cuatro garantías, y el verificador caza a quien no.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
