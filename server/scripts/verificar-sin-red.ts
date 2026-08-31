/**
 * UNA PARTIDA ENTERA DE «LA FRENTE» CON LA RED CLAVETEADA.
 *
 *   npm run verify:sin-red
 *
 * ═══ QUÉ AFIRMA, Y POR QUÉ ES MÁS FUERTE QUE UN CAMPO DEL MANIFIESTO ═══
 *
 * Que La Frente se juega ENTERA —empezar, adivinar, pasar, que venza el reloj,
 * otra ronda— sin tocar la red ni una vez. No porque su manifiesto declare
 * `sede: 'dispositivo'`, que es una intención que alguien tecleó, sino porque se
 * juega con todas las puertas de salida sustituidas por funciones que LANZAN. Una
 * sola llamada y esto se pone rojo.
 *
 * La diferencia entre las dos cosas es la diferencia entre un comprobador y una
 * declaración de principios. Un campo `transporte: 'ninguno'` en el manifiesto
 * sería exactamente la bandera que el diseño prohíbe: el día que el juego
 * empezara a llamar a algo, el campo seguiría diciendo «ninguno» y nadie se
 * enteraría. Un hecho no se puede poner a `false`.
 *
 * Y es el acoplamiento más duro del otro motor el que se está rompiendo aquí: en
 * las veladas TODO el ciclo lo abre `routes/live.ts` detrás de `requireAuth`, o
 * sea que no existe la idea de una partida que no pasa por el servidor. Ésta no
 * pasa.
 *
 * ═══ QUÉ PUERTAS SE CLAVAN, Y QUÉ NO DEMUESTRA ESTO ═══
 *
 * Se clavan todas las que un juego podría usar de verdad, en el móvil o en el
 * servidor:
 *
 *   · `fetch`, que es la que usaría la app.
 *   · `net.Socket.prototype.connect`, `net.connect` y `net.createConnection`, que
 *     es por donde salen HTTP, HTTPS y Mongoose. Se parchea el PROTOTIPO y no
 *     solo la función suelta, porque quien abre un socket a mano no llama a
 *     `connect` del módulo.
 *   · `dns.lookup` y `dns.promises.lookup`: resolver un nombre ya es hablar con
 *     la red, y además es lo primero que ocurre.
 *   · `dgram.createSocket`, que es la salida por UDP.
 *   · Y `elCanal()`, o sea los cinco verbos del arcade, que vuelven al
 *     `CANAL_QUE_LANZA` que ya trae la fase 0 para esto exactamente.
 *
 * LO QUE NO DEMUESTRA, dicho antes de que alguien se lo crea de más: no prueba
 * que sea IMPOSIBLE alcanzar la red desde este proceso. Node tiene enlaces
 * internos por debajo de estos módulos y quien quiera saltárselos puede. Lo que
 * prueba es que el juego recorre una partida completa sin empujar NINGUNA de las
 * puertas por las que se sale de verdad — y de propina, que si alguien mete una
 * mañana, esto se entera.
 *
 * ═══ SE CUENTAN LOS INTENTOS, ADEMÁS DE LANZAR ═══
 *
 * Cada puerta clavada suma uno a un contador antes de lanzar. Lanzar sin contar
 * dejaría un hueco real: un `try` alrededor de una llamada —que es una cosa
 * perfectamente normal de escribir— se tragaría la excepción y la partida
 * seguiría, en verde, habiendo llamado a la red. Con el contador, un intento
 * tragado también se ve.
 *
 * ═══ LA VACUNA, QUE VA ANTES QUE NADA ═══
 *
 * Antes de jugar se comprueba que la trampa está armada: se llama a cada puerta a
 * propósito y se exige que salte. Este repositorio tiene tres casos anotados de
 * comprobadores que pasaban en verde sin comprobar nada, y el modo de fallo de
 * éste sería justo ése —parchear mal y jugar una partida perfectamente normal con
 * la red abierta de par en par—. Una comprobación que nunca se ha visto fallar no
 * demuestra nada; ésta se ve fallar en cada ejecución, contra sí misma.
 */
import dgram from 'node:dgram';
import dns from 'node:dns';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 250)}`}`,
  );
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// LAS PUERTAS CLAVADAS
// ---------------------------------------------------------------------------

/** Cada intento de salir, con el nombre de la puerta que se empujó. */
const intentos: string[] = [];

class TocoLaRed extends Error {
  constructor(puerta: string) {
    super(
      `«La Frente» ha llamado a \`${puerta}\`. Es un arcade de sede \`dispositivo\`: ` +
        'su reductor corre dentro del móvil y su estado no sale de ahí, así que no hay ' +
        'ninguna llamada a la red que pueda estar bien.',
    );
    this.name = 'TocoLaRed';
  }
}

/** Clava una puerta: apunta el intento y salta. */
function clavar(puerta: string): never {
  intentos.push(puerta);
  throw new TocoLaRed(puerta);
}

const global_ = globalThis as unknown as Record<string, unknown>;

global_.fetch = (): never => clavar('fetch');
/*
 * Las dos que trae un navegador y no Node. Se clavan igual porque este mismo
 * reductor corre en Hermes, donde SÍ existen: si algún día alguien mete una
 * llamada pensando en el móvil, no se le va a ocurrir usar `net`.
 */
global_.XMLHttpRequest = function XMLHttpRequestClavado(): never {
  return clavar('XMLHttpRequest');
};
global_.WebSocket = function WebSocketClavado(): never {
  return clavar('WebSocket');
};

net.Socket.prototype.connect = function connectClavado(): never {
  return clavar('net.Socket.prototype.connect');
};
(net as unknown as Record<string, unknown>).connect = (): never => clavar('net.connect');
(net as unknown as Record<string, unknown>).createConnection = (): never =>
  clavar('net.createConnection');
(dns as unknown as Record<string, unknown>).lookup = (): never => clavar('dns.lookup');
(dns.promises as unknown as Record<string, unknown>).lookup = (): never =>
  clavar('dns.promises.lookup');
(dgram as unknown as Record<string, unknown>).createSocket = (): never =>
  clavar('dgram.createSocket');

/*
 * EL CANAL, y por qué no basta con `quitarCanal()`.
 *
 * La fase 0 ya trae `CANAL_QUE_LANZA` —el respaldo que salta cuando nadie ha
 * instalado un canal— y su cabecera dice literalmente que un arcade de
 * dispositivo tiene que poder jugarse entero con eso puesto. O sea que dejarlo
 * así comprobaría lo que hay que comprobar.
 *
 * Se instala uno propio de todas formas por una sola razón: éste APUNTA el
 * intento antes de saltar, y el de la fase 0 no puede hacerlo. Un `try` alrededor
 * de una llamada al canal se tragaría la excepción del respaldo y la partida
 * seguiría en verde habiendo llamado a la red; con el contador, ese intento
 * tragado se ve igual. Es la misma razón por la que las otras seis puertas
 * cuentan además de lanzar.
 */
const { elCanal, ponerCanal } = await import('../src/canal');
ponerCanal({
  esperarCambio: () => clavar('canal.esperarCambio'),
  avisarCambio: () => clavar('canal.avisarCambio'),
  anunciar: () => clavar('canal.anunciar'),
  avisosDesde: () => clavar('canal.avisosDesde'),
  /*
   * El sexto verbo lo trae la fase 2 y entra aquí el mismo día, sin excepción:
   * un juego de dispositivo que pidiera un despertador por vencimiento estaría
   * hablando con el servidor tanto como si llamara a `avisarCambio`. Que `Canal`
   * sea una interfaz cerrada es lo que obliga a que este fichero se entere de que
   * hay un verbo nuevo —no compila hasta que se añade— en vez de quedarse
   * comprobando cinco puertas de seis sin decirlo.
   */
  despertarAlVencer: () => clavar('canal.despertarAlVencer'),
  olvidar: () => clavar('canal.olvidar'),
});

// ---------------------------------------------------------------------------
// El juego, importado con la red ya muerta
// ---------------------------------------------------------------------------

const {
  ACIERTO,
  avanzarLaFrente,
  BARAJA,
  EMPEZAR,
  FRENTE,
  loSecretoDeLaFrente,
  MANIFIESTO_FRENTE,
  OTRA_RONDA,
  partidaNueva,
  PASO,
  proyectarLaFrente,
  segundosQueQuedan,
  SEGUNDOS_PARA_COLOCARSE,
  TICS_DE_RONDA,
  TICS_PARA_COLOCARSE,
  TICK_HZ,
} = await import('../../shared/arcade/juegos');
type Estado = import('../../shared/arcade/juegos').EstadoDeLaFrente;

const { avanzar, ESPECTADOR, manifiestoDeArcade, movimientoDeTic, reejecutarEn, vistaDeAsiento } =
  await import('../../shared/arcade');
type ContextoMovimiento = import('../../shared/arcade').ContextoMovimiento;
type Movimiento = import('../../shared/arcade').Movimiento;
type MovimientoRegistrado = import('../../shared/arcade').MovimientoRegistrado;

const { canonico } = await import('../../shared/mecanicas/canonico');

console.log('\nUna partida entera de La Frente, con la red claveteada\n');

// ---------------------------------------------------------------------------
// LA VACUNA: ¿está armada la trampa?
// ---------------------------------------------------------------------------

paso('La vacuna: cada puerta clavada tiene que saltar cuando se la empuja');

function saltaAlEmpujar(puerta: string, empujar: () => unknown): void {
  const antes = intentos.length;
  let saltó: unknown;
  try {
    empujar();
  } catch (error) {
    saltó = error;
  }
  comprobar(`empujar «${puerta}» salta`, saltó instanceof TocoLaRed, {
    saltó: saltó instanceof Error ? saltó.name : String(saltó),
  });
  comprobar(`empujar «${puerta}» queda apuntado`, intentos.length === antes + 1);
}

saltaAlEmpujar('fetch', () => (global_.fetch as () => unknown)());
saltaAlEmpujar('net.connect', () => (net as unknown as { connect: () => unknown }).connect());
saltaAlEmpujar('net.Socket.prototype.connect', () =>
  (new net.Socket() as unknown as { connect: () => unknown }).connect(),
);
saltaAlEmpujar('dns.lookup', () => (dns as unknown as { lookup: () => unknown }).lookup());
saltaAlEmpujar('dgram.createSocket', () =>
  (dgram as unknown as { createSocket: () => unknown }).createSocket(),
);
saltaAlEmpujar('el canal', () => elCanal().avisarCambio('la-mesa-que-no-hay'));
saltaAlEmpujar('el canal, esperando', () => elCanal().esperarCambio('la-mesa-que-no-hay'));

/*
 * Y se borra la cuenta de la vacuna. Los intentos que importan son los de la
 * partida, y mezclarlos con los seis de aquí dejaría el contador final inservible
 * — que es justo lo que convierte un comprobador en un adorno.
 */
const intentosDeLaVacuna = intentos.length;
comprobar('la vacuna ha empujado las siete puertas', intentosDeLaVacuna === 7, intentos);
intentos.length = 0;

// ---------------------------------------------------------------------------
// Que el juego esté instalado y sea el que dice ser
// ---------------------------------------------------------------------------

paso('El arcade está instalado y declara lo que este comprobador da por hecho');

comprobar('La Frente está instalada', manifiestoDeArcade(FRENTE).id === FRENTE);
comprobar('su sede es el dispositivo', MANIFIESTO_FRENTE.sede === 'dispositivo');
comprobar('tiene reloj', MANIFIESTO_FRENTE.tickHz > 0);
comprobar('su mueble es genérico', MANIFIESTO_FRENTE.mueble === 'formulario');
comprobar('no publica ninguna cifra', MANIFIESTO_FRENTE.marcador.tipo === 'ninguno');
comprobar('la ronda dura 600 tics', TICS_DE_RONDA === 600, TICS_DE_RONDA);
comprobar('colocarse el móvil dura 30 tics', TICS_PARA_COLOCARSE === 30, TICS_PARA_COLOCARSE);
comprobar('o sea tres segundos', SEGUNDOS_PARA_COLOCARSE === 3);

/*
 * ═══ EL TAMAÑO DE LA BARAJA, AFIRMADO Y NO SUPUESTO ═══
 *
 * Aquí ponía `BARAJA.length > 100` y con eso la cifra escrita podía separarse de
 * la real sin que nada se pusiera rojo — y se separó: tres ficheros decían
 * «ciento veinticuatro» con ciento veintiséis cartas dentro, y uno de ellos usaba
 * el número para JUSTIFICAR una decisión de diseño («con ciento veinticuatro
 * cartas y quince por ronda, la primera repetición llega cuando ya nadie se
 * acuerda»). Un argumento apoyado en un dato que se desmiente contando enseña que
 * los comentarios de esta casa no se comprueban, que es peor que el error.
 *
 * Así que el número exacto se afirma aquí, con el sitio donde está escrito al
 * lado: quien añada una carta se encuentra un rojo que le dice adónde ir. Y de
 * paso se comprueba que no hay repetidas, que es lo otro que un `> 100` deja
 * pasar: una carta duplicada saldría dos veces en la misma tarde sin que la
 * baraja pareciera más corta.
 */
comprobar('la baraja tiene las 126 cartas que dicen los comentarios', BARAJA.length === 126, {
  cartas: BARAJA.length,
  loDicen: 'frente.ts, en la cabecera de LA BARAJA y en `otraRonda`',
});
comprobar('y ninguna repetida', new Set(BARAJA).size === BARAJA.length, {
  distintas: new Set(BARAJA).size,
});

/*
 * Y que el fichero de reglas no importe nada de fuera de `shared/`. Es estático y
 * lo cubre `verify:fronteras` por su lado, pero aquí significa otra cosa: si este
 * fichero importara un cliente HTTP, la partida podría no llamarlo HOY y llamarlo
 * mañana. Un juego de dispositivo que no tiene con qué salir es más fuerte que
 * uno que tiene con qué y no lo usa.
 */
const fuenteDelJuego = fs.readFileSync(
  path.join(RAIZ, 'shared', 'arcade', 'juegos', 'frente.ts'),
  'utf8',
);
const importaciones = [...fuenteDelJuego.matchAll(/^import\s[^;]*?from\s*'([^']+)';/gm)].map(
  (m) => m[1] ?? '',
);
comprobar('se han leído las importaciones del juego', importaciones.length >= 3, importaciones);
const forasteras = importaciones.filter((i) => !i.startsWith('.'));
comprobar(
  'el fichero de reglas no importa ni un paquete ni un módulo de node:',
  forasteras.length === 0,
  forasteras,
);

// ---------------------------------------------------------------------------
// LA PARTIDA
// ---------------------------------------------------------------------------

/**
 * La mesa de un juego de un solo aparato.
 *
 * `quien: null` y `asientos: []` no son un contexto a medio montar: son su forma
 * normal. En La Frente el móvil pasa de mano en mano y no hay nadie dado de alta
 * en ningún sitio, que es el segundo acoplamiento del otro motor que este juego
 * rompe —allí quien actúa tiene que estar en `sesion.players`, y esa lista nace
 * de entidades que un humano registró en el taller—.
 */
const SEMILLA = 20260831;

function contexto(tic: number): ContextoMovimiento {
  return { quien: null, azar: SEMILLA, tic, asientos: [] };
}

/** El registro de la partida, que es lo que la hace reejecutable. */
const registro: MovimientoRegistrado[] = [];

let estado: Estado = partidaNueva();

/** Mete un movimiento por la puerta del registro de arcades y lo apunta. */
function mover(tipo: string, tic: number): void {
  const movimiento: Movimiento = { tipo };
  const ctx = contexto(tic);
  registro.push({ movimiento, ctx });
  estado = avanzar(FRENTE, estado, movimiento, ctx) as Estado;
  const porQue = porQueNoEsCanonicoElEstado(estado);
  if (porQue !== null) fallos.push(`el estado deja de ser canónico tras «${tipo}»: ${porQue}`);
}

/** Mete un tic, que es un movimiento como cualquier otro. */
function tic(enElTic: number): void {
  const movimiento = movimientoDeTic();
  const ctx = contexto(enElTic);
  registro.push({ movimiento, ctx });
  estado = avanzar(FRENTE, estado, movimiento, ctx) as Estado;
}

function porQueNoEsCanonicoElEstado(e: unknown): string | null {
  try {
    canonico(e);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

paso('Antes de empezar no hay palabra, y los gestos no hacen nada');

comprobar('empieza en «antes»', estado.momento === 'antes');
comprobar('no hay nada en la frente', estado.enLaFrente === null);
comprobar('el plazo no vence nunca', estado.plazo.vence === Number.MAX_SAFE_INTEGER);

const antesDeEmpezar = estado;
mover(ACIERTO, 0);
comprobar('un acierto antes de empezar no cambia nada', estado === antesDeEmpezar);
mover(PASO, 0);
comprobar('un paso antes de empezar no cambia nada', estado === antesDeEmpezar);
tic(5);
comprobar('un tic antes de empezar no cambia nada', estado === antesDeEmpezar);

paso('Empieza la ronda: se baraja, se reparte TAPADA y hay tres segundos para colocarse');

/*
 * ═══ LO QUE ESTE BLOQUE COMPRUEBA Y NO COMPROBABA ═══
 *
 * Que EMPEZAR no enseña la palabra. La primera versión repartía y se ponía a
 * jugar en el mismo movimiento, o sea que la primera carta de cada ronda se la
 * enseñaba a la única persona que no puede verla: quien pulsa el botón está
 * mirando el cristal —el botón está debajo del texto que dice «pon el móvil en tu
 * frente»— y se lleva el aparato a la cabeza después. Se quemaba SIEMPRE, no a
 * veces, y no lo cazaba ningún tipo ni ningún comprobador porque el estado era
 * correcto en todo momento: lo que faltaba era un momento.
 */
mover(EMPEZAR, 0);
comprobar('se está colocando el móvil, no jugando', estado.momento === 'preparados', estado.momento);
comprobar('la carta ya está repartida', typeof estado.enLaFrente === 'string');
comprobar('es la ronda 1', estado.ronda === 1);
comprobar(
  'el plazo que corre es el de colocarse',
  estado.plazo.vence === TICS_PARA_COLOCARSE,
  estado.plazo,
);

{
  const laSalaTodavia = vistaDeAsiento(FRENTE, estado, ESPECTADOR) as Record<string, unknown>;
  const quienSeLoPone = vistaDeAsiento(FRENTE, estado, 'quien-sea') as Record<string, unknown>;
  comprobar('NADIE ve la palabra mientras uno se coloca el móvil', laSalaTodavia.palabra === null, {
    laSalaVe: laSalaTodavia.palabra,
    enElEstado: estado.enLaFrente,
  });
  comprobar('y quien lo lleva sigue sin tener el campo', !('palabra' in quienSeLoPone));
  comprobar(
    'la palabra tapada está entre lo que el juego declara secreto',
    loSecretoDeLaFrente(estado).includes(estado.enLaFrente),
  );
}

/* Y un gesto durante esos tres segundos no cuenta: la ronda no ha empezado. */
{
  const colocandose = estado;
  mover(ACIERTO, 5);
  comprobar('un acierto mientras uno se coloca no cuenta', estado === colocandose);
  mover(PASO, 6);
  comprobar('y un paso tampoco', estado === colocandose);
}

/* Los tics de colocarse, uno a uno, como los mete el móvil. */
for (let t = 1; t <= TICS_PARA_COLOCARSE; t++) tic(t);

comprobar('al vencer esos tres segundos empieza la ronda', estado.momento === 'jugando', estado.momento);
comprobar('sigue siendo la misma carta', typeof estado.enLaFrente === 'string');
comprobar(
  'y ahora sí la ve la sala',
  (vistaDeAsiento(FRENTE, estado, ESPECTADOR) as Record<string, unknown>).palabra ===
    estado.enLaFrente,
);
comprobar(
  'el plazo de la ronda se cuenta desde que empieza, no desde el botón',
  estado.plazo.vence === TICS_PARA_COLOCARSE + TICS_DE_RONDA,
  estado.plazo,
);
comprobar('quedan 60 segundos', segundosQueQuedan(estado.plazo, TICS_PARA_COLOCARSE) === 60);
comprobar(
  'el montón tiene todas menos la puesta',
  estado.monton.length === BARAJA.length - 1,
  estado.monton.length,
);
comprobar('el azar se ha sembrado con la semilla del contexto', estado.azar.semilla === SEMILLA);
comprobar('barajar ha gastado tiradas', estado.azar.tiradas === BARAJA.length - 1);

/*
 * ═══ QUE ESTÉ BARAJADA DE VERDAD ═══
 *
 * Un `barajar` mal enganchado —el que devuelve la lista tal cual, que es el fallo
 * clásico de olvidarse de guardar el resultado— dejaría el juego funcionando
 * perfectamente y repartiendo siempre en el mismo orden. Nadie lo notaría hasta
 * la tercera partida de la misma tarde.
 */
const primerasDelMonton = [estado.enLaFrente, ...estado.monton.slice(0, 9)];
const primerasDeLaBaraja = BARAJA.slice(0, 10);
comprobar(
  'la baraja se ha barajado y no sale en el orden en que está escrita',
  JSON.stringify(primerasDelMonton) !== JSON.stringify(primerasDeLaBaraja),
  primerasDelMonton,
);
comprobar(
  'todas las cartas repartidas son de la baraja',
  [estado.enLaFrente, ...estado.monton].every((c) => c !== null && BARAJA.includes(c)),
);
comprobar(
  'no se ha perdido ni duplicado ninguna carta',
  new Set([estado.enLaFrente, ...estado.monton]).size === BARAJA.length,
);

paso('Se juega: quince gestos a ciegas, abajo acierto y arriba paso');

/*
 * El guion de la ronda: en qué tic entra cada gesto y si fue acierto. Es una
 * lista escrita a mano y no un bucle regular a propósito — un gesto cada
 * doscientos milisegundos no se parece a una mesa, y lo que se quiere probar es
 * que los tics y los gestos entran mezclados por la misma puerta y en cualquier
 * orden.
 */
const GESTOS: Array<{ tic: number; acierto: boolean }> = [
  { tic: 31, acierto: true },
  { tic: 58, acierto: true },
  { tic: 92, acierto: false },
  { tic: 120, acierto: true },
  { tic: 173, acierto: true },
  { tic: 205, acierto: false },
  { tic: 244, acierto: true },
  { tic: 290, acierto: true },
  { tic: 333, acierto: false },
  { tic: 361, acierto: true },
  { tic: 402, acierto: true },
  { tic: 455, acierto: true },
  { tic: 498, acierto: false },
  { tic: 540, acierto: true },
  { tic: 577, acierto: true },
];

const palabrasVistas: string[] = [];
let siguienteGesto = 0;

/*
 * El bucle del anfitrión: mete un tic por cada décima de segundo y, cuando toca,
 * el gesto. Es lo que hará `app/src/arcade/local.ts` en el móvil, y por eso se
 * escribe aquí igual: NADIE REPARTE TICS por debajo. `tickHz` declara el ritmo, y
 * quien hospeda la partida los mete.
 */
const SE_ACABA = TICS_PARA_COLOCARSE + TICS_DE_RONDA;

for (let t = TICS_PARA_COLOCARSE + 1; t <= SE_ACABA + 5; t++) {
  const gesto = GESTOS[siguienteGesto];
  if (gesto !== undefined && gesto.tic === t) {
    const puesta = estado.enLaFrente;
    if (puesta !== null) palabrasVistas.push(puesta);
    mover(gesto.acierto ? ACIERTO : PASO, t);
    siguienteGesto++;
  }
  tic(t);
}

comprobar('se han metido los quince gestos', siguienteGesto === GESTOS.length, siguienteGesto);
comprobar('la ronda ha terminado', estado.momento === 'despues', estado.momento);
comprobar('ya no hay nada en la frente', estado.enLaFrente === null);
comprobar(
  'los aciertos son los once del guion',
  estado.aciertos.length === GESTOS.filter((g) => g.acierto).length,
  estado.aciertos,
);
/*
 * Las pasadas son las cuatro del guion MÁS la que se quedó puesta al vencer el
 * tiempo. Ese «más una» es producto: al terminar, la mesa quiere saber cuál era
 * la que se le había quedado, y perderla en silencio le quita el final al juego.
 */
comprobar(
  'las pasadas son las cuatro del guion más la que se quedó puesta',
  estado.pasadas.length === GESTOS.filter((g) => !g.acierto).length + 1,
  estado.pasadas,
);
comprobar('quedan 0 segundos', segundosQueQuedan(estado.plazo, SE_ACABA) === 0);
comprobar(
  'las palabras resueltas son las que estuvieron puestas, en orden',
  JSON.stringify([...estado.aciertos, ...estado.pasadas].sort(porOrden)) ===
    JSON.stringify([...palabrasVistas, estado.pasadas[estado.pasadas.length - 1]].sort(porOrden)),
);

function porOrden(a: unknown, b: unknown): number {
  const x = String(a);
  const y = String(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

paso('El reloj manda: un gesto que llega tarde no cuenta');

/*
 * Se rehace la ronda hasta el filo y se mete un ACIERTO en el tic exacto en que
 * vence, SIN haber metido antes el tic que la cierra. Tiene que cerrarse igual y
 * el acierto no puede sumar. Sin esta regla, que el último acierto valiera o no
 * dependería de qué llegara antes a la cola de eventos del móvil.
 */
{
  let alFilo: Estado = partidaNueva();
  alFilo = avanzarLaFrente(alFilo, { tipo: EMPEZAR }, contexto(0));
  /* El tic que abre la ronda de verdad. Sin él seguiríamos colocándonos el móvil. */
  alFilo = avanzarLaFrente(alFilo, movimientoDeTic(), contexto(TICS_PARA_COLOCARSE));
  comprobar('la ronda del filo ha empezado', alFilo.momento === 'jugando');
  alFilo = avanzarLaFrente(alFilo, { tipo: ACIERTO }, contexto(TICS_PARA_COLOCARSE + 10));
  const conUnAcierto = alFilo.aciertos.length;
  const enElFilo = avanzarLaFrente(alFilo, { tipo: ACIERTO }, contexto(SE_ACABA));
  comprobar('el gesto del último instante cierra la ronda', enElFilo.momento === 'despues');
  comprobar('y no suma acierto', enElFilo.aciertos.length === conUnAcierto, enElFilo.aciertos);
  const unTicAntes = avanzarLaFrente(alFilo, { tipo: ACIERTO }, contexto(SE_ACABA - 1));
  comprobar('un tic antes sí cuenta', unTicAntes.aciertos.length === conUnAcierto + 1);
  comprobar('y la ronda sigue', unTicAntes.momento === 'jugando');
}

paso('Otra ronda: se baraja de nuevo y el azar sigue donde estaba');

const azarAlTerminar = { ...estado.azar };
const OTRA = SE_ACABA + 6;
mover(OTRA_RONDA, OTRA);

/*
 * ═══ ESTE BOTÓN ES EL PELIGROSO DE LOS DOS ═══
 *
 * Está en la pantalla de resultados, o sea que lo pulsa quien ACABA DE JUGAR,
 * mirando el cristal, y el móvil cambia de manos justo después. Si repartiera y
 * enseñara a la vez, la palabra se quemaría por partida doble: la vería quien la
 * pulsó y, si la pulsa el siguiente, se la vería él mismo.
 */
comprobar('otra ronda TAMPOCO enseña la palabra de golpe', estado.momento === 'preparados');
comprobar(
  'y la sala tampoco la ve mientras el móvil cambia de manos',
  (vistaDeAsiento(FRENTE, estado, ESPECTADOR) as Record<string, unknown>).palabra === null,
);
for (let t = OTRA + 1; t <= OTRA + TICS_PARA_COLOCARSE; t++) tic(t);

comprobar('vuelve a jugarse', estado.momento === 'jugando');
comprobar('es la ronda 2', estado.ronda === 2);
comprobar('el marcador vuelve a cero', estado.aciertos.length === 0 && estado.pasadas.length === 0);
comprobar(
  'el plazo se cuenta desde que empieza la ronda',
  estado.plazo.vence === OTRA + TICS_PARA_COLOCARSE + TICS_DE_RONDA,
  estado.plazo,
);
comprobar(
  'el azar NO se ha vuelto a sembrar: sigue la cadena',
  estado.azar.tiradas > azarAlTerminar.tiradas && estado.azar.semilla === azarAlTerminar.semilla,
  { antes: azarAlTerminar, ahora: estado.azar },
);
comprobar('el montón vuelve a estar completo menos una', estado.monton.length === BARAJA.length - 1);

// ---------------------------------------------------------------------------
// LA PROYECCIÓN, QUE AQUÍ VA AL REVÉS
// ---------------------------------------------------------------------------

paso('La proyección al revés: la sala ve la palabra y quien lo lleva no');

const laSala = vistaDeAsiento(FRENTE, estado, ESPECTADOR) as Record<string, unknown>;
const quienLoLleva = vistaDeAsiento(FRENTE, estado, 'quien-sea') as Record<string, unknown>;

comprobar('la vista de la sala se identifica', laSala.desde === 'la-sala');
comprobar('la vista de quien lo lleva se identifica', quienLoLleva.desde === 'la-frente');
comprobar('la sala VE la palabra', laSala.palabra === estado.enLaFrente, laSala.palabra);
comprobar('quien lo lleva NO tiene el campo siquiera', !('palabra' in quienLoLleva));
comprobar('a nadie le llega el montón', !('monton' in laSala) && !('monton' in quienLoLleva));
comprobar('a nadie le llega el azar', !('azar' in laSala) && !('azar' in quienLoLleva));
comprobar(
  'los dos ven el mismo reloj',
  JSON.stringify(laSala.plazo) === JSON.stringify(quienLoLleva.plazo),
);
comprobar('los dos ven los contadores', laSala.aciertos === 0 && quienLoLleva.aciertos === 0);

/*
 * ═══ LA COMPROBACIÓN QUE DE VERDAD CIERRA EL AGUJERO ═══
 *
 * Es la que hará `verify:mesa` en la fase 2 y se adelanta aquí porque el juego ya
 * existe: se le pregunta AL JUEGO qué esconde —`loSecreto`— y se busca cada uno
 * de esos valores DENTRO de lo que se le manda a un asiento. Sin esto, una
 * proyección que fuera la identidad pasaría en verde.
 *
 * Se busca sobre la cadena canónica y no campo a campo: así también salta si el
 * secreto viaja anidado tres niveles dentro de un campo que nadie miró.
 */
/**
 * Los valores secretos que ASOMAN en una vista, buscados en canónico.
 *
 * Se compara `canonico(valor)` contra `canonico(vista)` y no `JSON.stringify`
 * contra `JSON.stringify`: las dos mitades tienen que hablar el mismo idioma. Con
 * `JSON.stringify` un secreto que sea un objeto —el azar de este juego lo es— se
 * escribiría con las claves en el orden de inserción y la vista con las claves
 * ordenadas, así que una filtración de verdad NO se encontraría. Es un falso
 * verde, que es peor que un falso rojo.
 */
function loQueAsomaDe(secretos: readonly unknown[], vista: unknown): unknown[] {
  const comoLlega = canonico(vista);
  return secretos.filter((v) => comoLlega.includes(canonico(v)));
}

const loQueEsconde = loSecretoDeLaFrente(estado);
const filtrados = loQueAsomaDe(loQueEsconde, quienLoLleva);
comprobar('el juego declara qué esconde', loQueEsconde.length > 100, loQueEsconde.length);
comprobar(
  'ninguno de esos valores llega a quien lleva el móvil',
  filtrados.length === 0,
  filtrados.slice(0, 5),
);
comprobar(
  'la palabra puesta está entre lo que esconde',
  loQueEsconde.includes(estado.enLaFrente),
);
comprobar(
  'el azar entero está entre lo que esconde',
  loQueEsconde.some((v) => canonico(v) === canonico(estado.azar)),
  estado.azar,
);

/*
 * ═══ Y LA MISMA COMPROBACIÓN EN TODOS LOS MOMENTOS Y CON MUCHAS SEMILLAS ═══
 *
 * Esto es lo que la fase 2 va a hacer con `verify:mesa` y lo que aquí se hacía en
 * UN solo instante de UNA sola partida — y por eso pasaba. Escrito como estaba,
 * el juego se ponía rojo en el estado con el que ARRANCA toda partida y en una de
 * cada doscientas semillas a mitad de ronda, y el rojo estaba MAL: no había
 * ninguna filtración.
 *
 * La causa está contada entera en `loSecretoDeLaFrente` y se resume en una línea:
 * la comprobación es de APARICIÓN de valores, y el juego declaraba secretos dos
 * NÚMEROS PEQUEÑOS —la semilla y el acumulador, que en una partida recién abierta
 * son los dos el cero— mientras la vista de asiento está llena de ceros
 * (`ronda`, `aciertos`, `pasadas`, `quedan`). Los 2 de 2 «aparecían».
 *
 * Un comprobador que grita cuando no pasa nada acaba desactivado —lo dice el §5.5
 * del diseño y este repositorio tiene tres casos anotados—, y se habría
 * desactivado debilitándolo («los números no cuentan»), que es la forma de que el
 * día que se escape un número de verdad ya no lo mire nadie. Se barre aquí, con
 * el juego recién escrito, para que en la fase 2 sea una cosa menos.
 */
{
  const momentosVistos = new Set<string>();
  const rojos: Array<{ semilla: number; momento: string; asoman: unknown[] }> = [];
  let barridas = 0;

  for (let s = 0; s < 300; s++) {
    const semillaDePrueba = s === 0 ? 0 : s * 7919;
    const ctxDe = (t: number): ContextoMovimiento => ({
      quien: null,
      azar: semillaDePrueba,
      tic: t,
      asientos: [],
    });
    /* Los cuatro momentos, en el orden en que los recorre una partida. */
    const recorrido: Estado[] = [];
    let e: Estado = partidaNueva();
    recorrido.push(e);
    e = avanzarLaFrente(e, { tipo: EMPEZAR }, ctxDe(0));
    recorrido.push(e);
    e = avanzarLaFrente(e, movimientoDeTic(), ctxDe(TICS_PARA_COLOCARSE));
    recorrido.push(e);
    e = avanzarLaFrente(e, { tipo: ACIERTO }, ctxDe(TICS_PARA_COLOCARSE + 3));
    recorrido.push(e);
    e = avanzarLaFrente(e, movimientoDeTic(), ctxDe(SE_ACABA));
    recorrido.push(e);

    for (const cada of recorrido) {
      barridas++;
      momentosVistos.add(cada.momento);
      const asoman = loQueAsomaDe(loSecretoDeLaFrente(cada), proyectarLaFrente(cada, 'un-asiento'));
      if (asoman.length > 0) rojos.push({ semilla: semillaDePrueba, momento: cada.momento, asoman });
    }
  }

  comprobar('se han barrido los cuatro momentos', momentosVistos.size === 4, [...momentosVistos]);
  comprobar('el barrido ha mirado 1.500 estados', barridas === 1500, barridas);
  comprobar(
    'en NINGÚN momento y con NINGUNA semilla asoma un secreto en la vista de asiento',
    rojos.length === 0,
    rojos.slice(0, 3),
  );
}

/*
 * ═══ LA PUERTA CERRADA, QUE ES LO QUE SUSTITUYE A BUSCAR NÚMEROS SUELTOS ═══
 *
 * Declarar el azar entero en vez de sus dos números quita el falso rojo y deja un
 * hueco honesto: una filtración PARCIAL —que la vista de asiento sacara solo el
 * acumulador, como número suelto— ya no la encontraría la búsqueda de arriba.
 *
 * Se tapa por el otro lado, y sale más fuerte: el juego de campos de la vista de
 * asiento está congelado aquí. Un campo NUEVO —se llame como se llame y lleve lo
 * que lleve— pone esto rojo. Un secreto de poca entropía no se defiende
 * buscándolo: se defiende cerrando la puerta por donde saldría.
 */
const CAMPOS_DE_QUIEN_LO_LLEVA = [
  'acertadas',
  'aciertos',
  'desde',
  'falladas',
  'momento',
  'pasadas',
  'plazo',
  'quedan',
  'ronda',
];
comprobar(
  'la vista de asiento tiene EXACTAMENTE los campos que tiene que tener',
  JSON.stringify(Object.keys(quienLoLleva).sort()) === JSON.stringify(CAMPOS_DE_QUIEN_LO_LLEVA),
  Object.keys(quienLoLleva).sort(),
);

paso('Al terminar ya no hay secreto: las dos listas salen enteras');

{
  let hastaElFinal: Estado = estado;
  for (let t = estado.plazo.vence; t <= estado.plazo.vence + 1; t++) {
    hastaElFinal = avanzarLaFrente(hastaElFinal, movimientoDeTic(), contexto(t));
  }
  comprobar('la segunda ronda también termina sola', hastaElFinal.momento === 'despues');
  const finalDeQuienLoLleva = proyectarLaFrente(hastaElFinal, 'quien-sea');
  comprobar(
    'al terminar, quien lo llevaba ve lo que se le escapó',
    finalDeQuienLoLleva.falladas.length === hastaElFinal.pasadas.length &&
      finalDeQuienLoLleva.falladas.length > 0,
  );
  const secretoAlFinal = loSecretoDeLaFrente(hastaElFinal);
  const enLaVistaFinal = canonico(finalDeQuienLoLleva);
  comprobar(
    'y lo que sigue siendo secreto —el montón y el azar— sigue sin salir',
    secretoAlFinal.filter((v) => enLaVistaFinal.includes(JSON.stringify(v))).length === 0,
  );
  comprobar(
    'las palabras ya resueltas dejan de ser secretas al terminar',
    hastaElFinal.pasadas.every((p) => !secretoAlFinal.includes(p)),
  );
}

// ---------------------------------------------------------------------------
// La reejecución
// ---------------------------------------------------------------------------

paso('La partida entera se reejecuta y da exactamente lo mismo');

const reejecutado = reejecutarEn(FRENTE, partidaNueva(), registro);
comprobar(
  'reejecutar los movimientos da el mismo estado, byte a byte',
  canonico(reejecutado) === canonico(estado),
);
const otraVez = reejecutarEn(FRENTE, partidaNueva(), registro);
comprobar('y otra vez lo mismo', canonico(otraVez) === canonico(reejecutado));
comprobar(
  'el registro tiene todos los movimientos de la partida',
  registro.length > TICS_DE_RONDA,
  registro.length,
);

// ---------------------------------------------------------------------------
// EL VEREDICTO
// ---------------------------------------------------------------------------

paso('Y la cuenta que da sentido a todo el fichero');

comprobar(
  'la partida entera no ha empujado NI UNA puerta de la red',
  intentos.length === 0,
  intentos,
);

console.log(`\n${hechas} comprobaciones`);
console.log(`${registro.length} movimientos jugados · ${intentos.length} llamadas a la red`);

if (fallos.length > 0) {
  console.error(`\n${fallos.length} fallos:\n`);
  for (const f of fallos) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}

console.log(
  '\nLa Frente se juega entera —dos rondas, el reloj venciendo, la proyección al revés—\n' +
    'con `fetch`, los sockets, el DNS, el UDP y los seis verbos del canal sustituidos\n' +
    'por funciones que lanzan. No es que declare que no usa la red: es que no la usa.',
);
process.exit(0);
