/**
 * Los tres números de una mesa que dura días dicen la verdad.
 *
 *   node app/src/comprobadores/verificar-relojes.mjs
 *
 * ═══ POR QUÉ EXISTE, Y QUÉ SE ESCAPÓ POR NO TENERLO ═══
 *
 * La fase 4 bis añadió unas cuarenta líneas de app —la pausa del sondeo y los dos
 * rótulos de tiempo— y las dejó exportadas y sin ningún consumidor: `verify:larga`
 * es entero de servidor y sus comprobaciones son peticiones HTTP. O sea que la
 * parte que decide si la PANTALLA miente no tenía nada debajo.
 *
 * Los tres defectos que se colaron son exactamente los tres que esto caza:
 *
 *   · La pausa llegaba a dos minutos, y el ciclo entero del sondeo (25 s aparcado
 *     más la pausa) se salía de la ventana de sesenta segundos con la que el
 *     servidor decide quién está «presente». Resultado medido: todos los jugadores
 *     de una mesa de días se pintaban «(fuera)» un 42 % del tiempo con la app
 *     abierta y en primer plano — y ese mismo `presente` es el que sirve
 *     `/arcade/mesas/:codigo/turno` como «la mitad de la decisión de avisar».
 *   · La cuenta atrás truncaba: una mesa de «Veinticuatro horas por turno» recién
 *     abierta decía «quedan 23 h».
 *   · Y en el tramo de días el truncamiento se leía como que el tiempo SUBE: de
 *     «quedan 2 días» a «quedan 47 h» al bajar un minuto.
 *
 * ═══ POR QUÉ ESTO Y NO UN `grep` ═══
 *
 * `relojes.ts` no importa NADA a propósito —ni React, ni React Native, ni la app—
 * para poder ejecutarse aquí, igual que `conexion-reglas.ts`. Así las funciones se
 * llaman de verdad, con números de verdad. Mirar el texto del fichero pasaría en
 * verde con la aritmética invertida, que es justo como estaba.
 *
 * Y la comprobación que de verdad importa es la ÚLTIMA: ata el tope de la pausa a
 * la constante del SERVIDOR leyéndola de su fichero. Ése es el invariante que se
 * rompió, y es de los que no viven en ningún fichero: vive entre dos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(AQUI, '..');
const RAIZ = path.resolve(AQUI, '..', '..', '..');

let hechas = 0;
const fallos = [];

function comprobar(que, condicion, detalle) {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle ? `\n      ${detalle}` : ''}`);
}

const leer = (f) => fs.readFileSync(f, 'utf8');

async function cargarModuloTs(fichero) {
  const js = ts.transpileModule(leer(fichero), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js, 'utf8').toString('base64')}`);
}

const relojes = await cargarModuloTs(path.join(SRC, 'arcade', 'relojes.ts'));

const S = 1000;
const MIN = 60 * S;
const H = 60 * MIN;
const D = 24 * H;
const AHORA = 1_700_000_000_000;

/** Una mesa viva en la que le toca a alguien, con `ms` por delante. */
const pausaCon = (ms) => relojes.pausaAntesDeVolverAPreguntar(AHORA + ms, false, true, AHORA);

// ---------------------------------------------------------------------------
// La pausa: cuándo NO se pausa
// ---------------------------------------------------------------------------

comprobar(
  'sin plazo no se pausa: no hay ningún reloj del que ahorrarse vueltas',
  relojes.pausaAntesDeVolverAPreguntar(null, false, true, AHORA) === 0,
);

comprobar(
  'una mesa terminada no se pausa',
  relojes.pausaAntesDeVolverAPreguntar(AHORA + 3 * D, true, true, AHORA) === 0,
);

/*
 * ÉSTE ES EL DE LA REUNIÓN, y es el que más se nota: Ana abre la mesa de «Un día»,
 * Bruno entra con el código y reparte, y la pantalla de Ana tardaba dos minutos en
 * enterarse — las dos pestañas abiertas y la suya delante. Mientras se reúne, el
 * plazo además es ficticio: si vence, el tic no cambia el estado.
 */
comprobar(
  'mientras no le toque a nadie —la mesa reuniéndose— no se pausa',
  relojes.pausaAntesDeVolverAPreguntar(AHORA + D, false, false, AHORA) === 0,
  'con esto en distinto de 0, montar la mesa tarda hasta dos minutos por jugador que llega',
);

comprobar(
  'con el plazo cerca no se pausa: el último tramo es el que se mira',
  pausaCon(90 * S) === 0 && pausaCon(2 * MIN) === 0,
);

comprobar(
  'una mesa de treinta segundos no cambia de comportamiento ni un milisegundo',
  pausaCon(30 * S) === 0,
);

comprobar('un plazo ya vencido no pausa', pausaCon(-5 * MIN) === 0);

// ---------------------------------------------------------------------------
// La pausa: el ciclo entero cabe en la ventana de presencia
// ---------------------------------------------------------------------------

/*
 * LO QUE EL SERVIDOR APARCA UNA PETICIÓN, y lo que aguanta antes de dar a alguien
 * por ausente. Los dos son del servidor y aquí se comprueban contra su fichero, no
 * contra una copia — ver la última comprobación de todas.
 */
const APARCADA_MS = 25 * S;
const VENTANA_DE_PRESENCIA_MS = 60 * S;

for (const quedan of [3 * MIN, 10 * MIN, H, 6 * H, D, 3 * D, 7 * D]) {
  const ciclo = APARCADA_MS + pausaCon(quedan);
  comprobar(
    `con ${String(Math.round(quedan / MIN))} min de plazo, el ciclo del sondeo (${String(
      Math.round(ciclo / S),
    )} s) cabe en la ventana de presencia`,
    ciclo < VENTANA_DE_PRESENCIA_MS,
    'si no cabe, quien está mirando la pantalla se pinta «(fuera)» a los demás una parte de cada ciclo',
  );
}

comprobar(
  'y aun así se ahorra: con un día de plazo se pausa de verdad',
  pausaCon(D) > 10 * S,
  'una pausa de cero devolvería el sondeo cada 25 s durante tres días, que es lo que la fase venía a quitar',
);

comprobar(
  'la pausa nunca es negativa',
  [0, S, MIN, H, D, 30 * D].every((q) => pausaCon(q) >= 0),
);

// ---------------------------------------------------------------------------
// La cuenta atrás
// ---------------------------------------------------------------------------

comprobar('a cero se dice que se acabó', relojes.cuantoQueda(0) === 'se acabó el tiempo');
comprobar('y en negativo también', relojes.cuantoQueda(-1) === 'se acabó el tiempo');

/*
 * LO PRIMERO QUE VE QUIEN ELIGE «VEINTICUATRO HORAS POR TURNO». Decía 23.
 */
comprobar(
  'una mesa de un día recién abierta dice 24 h y no 23',
  relojes.cuantoQueda(D) === 'quedan 24 h',
  relojes.cuantoQueda(D),
);
comprobar(
  'y un segundo después sigue diciendo 24 h',
  relojes.cuantoQueda(D - S) === 'quedan 24 h',
  relojes.cuantoQueda(D - S),
);
comprobar(
  'una mesa de tres días recién abierta dice 3 días',
  relojes.cuantoQueda(3 * D) === 'quedan 3 días',
  relojes.cuantoQueda(3 * D),
);

/*
 * EL SALTO QUE SE LEÍA COMO QUE EL TIEMPO SUBE: «2 días» → «47 h» al bajar un
 * minuto. Ahora los dos lados del corte dicen lo mismo escrito de dos maneras.
 */
comprobar('a 48 h se dice 2 días', relojes.cuantoQueda(48 * H) === 'quedan 2 días');
comprobar(
  'y justo por debajo se dice 48 h, no 47',
  relojes.cuantoQueda(48 * H - MIN) === 'quedan 48 h',
  relojes.cuantoQueda(48 * H - MIN),
);

comprobar('en el último minuto se cuenta por segundos', relojes.cuantoQueda(30 * S) === 'quedan 30 s');
comprobar('y no se dice nunca «quedan 0 s»', relojes.cuantoQueda(1) === 'quedan 1 s');
comprobar('entre un minuto y una hora, minutos', relojes.cuantoQueda(90 * S) === 'quedan 2 min');

/*
 * ═══ Y LA REGLA GENERAL, QUE ES LA QUE HABRÍA CAZADO EL SALTO SIN SABER DÓNDE ═══
 *
 * El rótulo se traduce otra vez a milisegundos y se barre el plazo entero hacia
 * abajo: lo que dice la pantalla NO PUEDE CRECER mientras el tiempo baja. Es una
 * propiedad del rótulo, no de una frontera concreta, y por eso caza también las
 * fronteras que a nadie se le ocurra escribir a mano.
 */
function rotuloEnMs(texto) {
  const m = /^quedan (\d+) (s|min|h|días)$/.exec(texto);
  if (m === null) return 0;
  const n = Number(m[1]);
  return { s: n * S, min: n * MIN, h: n * H, días: n * D }[m[2]];
}

let anterior = Infinity;
let sube = null;
for (let ms = 7 * D; ms > 0; ms -= 37 * S) {
  const ahora = rotuloEnMs(relojes.cuantoQueda(ms));
  if (ahora > anterior) {
    sube = `a ${String(ms)} ms dice «${relojes.cuantoQueda(ms)}» y un momento antes decía menos`;
    break;
  }
  anterior = ahora;
}
comprobar('el rótulo nunca crece mientras el tiempo baja', sube === null, sube ?? undefined);

/*
 * Y NUNCA POR DEBAJO DE LA VERDAD, que es el lado correcto del error en una cuenta
 * atrás: nadie deja de mover por creer que ya no llegaba.
 */
let corto = null;
for (let ms = S; ms < 7 * D; ms += 41 * S) {
  if (rotuloEnMs(relojes.cuantoQueda(ms)) < ms - D) {
    corto = `a ${String(ms)} ms dice «${relojes.cuantoQueda(ms)}»`;
    break;
  }
}
comprobar('y no promete menos tiempo del que hay', corto === null, corto ?? undefined);

// ---------------------------------------------------------------------------
// Cuánto lleva esperándose
// ---------------------------------------------------------------------------

comprobar('recién movido, acaba de empezar', relojes.cuantoLleva(0) === 'acaba de empezar');
comprobar('a los 59 s, todavía acaba de empezar', relojes.cuantoLleva(59 * S) === 'acaba de empezar');
comprobar('al minuto, lleva 1 min', relojes.cuantoLleva(61 * S) === 'lleva 1 min');
comprobar('a las dos horas y media, lleva 2 h', relojes.cuantoLleva(2.5 * H) === 'lleva 2 h');
comprobar('a los tres días, lleva 3 días', relojes.cuantoLleva(3 * D) === 'lleva 3 días');
comprobar(
  'lo transcurrido se trunca, al revés que la cuenta atrás',
  relojes.cuantoLleva(119 * MIN) === 'lleva 1 h',
  'redondear esto hacia arriba diría «lleva 1 h» de quien acaba de mover',
);

// ---------------------------------------------------------------------------
// EL INVARIANTE QUE VIVE ENTRE DOS FICHEROS
// ---------------------------------------------------------------------------

/*
 * El tope de la pausa lo dicta una constante del SERVIDOR. Aquí se lee de su
 * fichero en vez de copiarla, porque una copia es exactamente lo que no se entera
 * el día que allí cambie — y el síntoma sería otra vez una mesa entera pintada
 * «(fuera)» sin un solo error en ningún sitio.
 */
const mesasTs = leer(path.join(RAIZ, 'server', 'src', 'arcade', 'mesas.ts'));
const conectado = /const\s+CONECTADO_MS\s*=\s*([\d_]+)/.exec(mesasTs);
comprobar(
  'la ventana de presencia del servidor se sigue llamando `CONECTADO_MS` y se puede leer',
  conectado !== null,
  'si el nombre cambió, esta comprobación deja de proteger nada y hay que arreglarla',
);
if (conectado !== null) {
  const ventana = Number(conectado[1].replaceAll('_', ''));
  comprobar(
    `el tope de la pausa (${String(relojes.TOPE_DE_PAUSA_MS / S)} s) más lo aparcado (25 s) cabe en la ventana real del servidor (${String(ventana / S)} s)`,
    APARCADA_MS + relojes.TOPE_DE_PAUSA_MS < ventana,
    'el día que suba `CONECTADO_MS`, el tope de `relojes.ts` puede subir con él — y hasta entonces, no',
  );
  comprobar(
    'y la copia que usa este comprobador coincide con la del servidor',
    ventana === VENTANA_DE_PRESENCIA_MS,
  );
}

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. La pantalla dice la hora que es.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
