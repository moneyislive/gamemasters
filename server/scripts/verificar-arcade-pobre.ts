/**
 * UN ARCADE DELIBERADAMENTE MISERABLE.
 *
 *   npm run verify:arcade-pobre
 *
 * ═══ QUÉ ES ESTO Y POR QUÉ ES LA PIEZA MÁS IMPORTANTE DE LA FASE ═══
 *
 * Es «La Almoneda» de esta familia. La lección de este repositorio no es que la
 * reingeniería se evitara con buenas intenciones: es que `verificar-juego-
 * ajeno.ts` monta un juego imposible, lo juega entero, y al terminar IMPRIME LA
 * LISTA DE LO QUE TODAVÍA LE OBLIGA A DISFRAZARSE. Esa lista es el entregable.
 * Mientras quede un peaje, el patrón limita.
 *
 * La diferencia con aquél es de qué se demuestra. Allí se demostraba que la
 * plataforma admite un juego que no comparte nada con un misterio. Aquí se
 * demuestra algo más difícil y más temprano: que el núcleo del arcade admite un
 * juego que no tiene NADA — y se demuestra ANTES de que exista ningún juego, que
 * es la única forma de que el resultado signifique algo. Un núcleo probado
 * contra su primer juego sale con la forma de su primer juego.
 *
 * ═══ «EL BOTÓN», Y TODO LO QUE NO TIENE ═══
 *
 *   · SIN TABLERO. No hay casillas, ni lugares, ni topología. Su mueble es
 *     `formulario`, que es lo que pinta la plataforma sin que el juego esté en
 *     el binario.
 *   · SIN TURNOS. Nadie tiene el turno, nunca. No hay orden, ni ronda, ni fase.
 *     Se pulsa cuando se quiere.
 *   · SIN RED. `sede: 'dispositivo'`. Se juega entero con el canal SUSTITUIDO
 *     POR UNO QUE LANZA: si una sola llamada asomara, esto se pondría rojo. Es
 *     más fuerte que declarar un transporte «ninguno», porque no comprueba una
 *     intención sino un hecho.
 *   · SIN ASIENTOS CON IDENTIDAD. No hay cuentas, ni correos, ni nombres. La
 *     mesa de la segunda pasada tiene CERO asientos, que es una forma legítima
 *     de mesa y no una mesa a medio montar.
 *   · SIN PUNTUACIÓN. No declara `marcador`, así que no publica ninguna cifra y
 *     nadie tiene que verificar nada. Lleva la cuenta de sus aciertos dentro de
 *     su propio estado, que es cosa suya y de nadie más.
 *   · SIN AZAR. El color cambia por aritmética del tic. La misma partida da
 *     exactamente lo mismo, siempre.
 *   · SIN SECRETOS. `secretos: false`, así que no hay proyección y el estado va
 *     entero. Que ESO no sea un agujero se comprueba aparte, con un juego que sí
 *     los declara y al que no se le deja arrancar sin proyección.
 *
 * Y se juega DOS VECES: una en el dispositivo, llamando al reductor a pelo, y
 * otra detrás del árbitro con autoridad de servidor. El mismo reductor, sin
 * tocar una línea. Eso es lo que el eje `sede` promete, y es lo que aquí se
 * comprueba en vez de creerse.
 *
 * ═══ CÓMO SE LEE ESTE FICHERO ═══
 *
 * Cada vez que ha habido que FINGIR algo para que el motor lo aceptara, hay un
 * comentario que empieza por «PEAJE:». Al final se imprimen todos juntos. Si no
 * queda ninguno, lo dice. Si quedan, esa lista ES el resultado de la
 * comprobación y no un fallo: dice cuánto le falta al motor para ser de verdad
 * agnóstico.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  avanzar,
  arcadeInstalado,
  ArcadeMalEscrito,
  arcadesConSecretosSinTapar,
  ESPECTADOR,
  exigirSecretosTapados,
  instalarArcade,
  loSecretoDe,
  manifiestoDeArcade,
  movimientoDeTic,
  NUNCA,
  olvidarArcade,
  olvidarElTapado,
  plazoDentroDe,
  reejecutarEn,
  registrarLoSecreto,
  registrarProyeccion,
  ReductorMudo,
  ticsPara,
  vistaDeAsiento,
  exigeReejecutabilidad,
  necesitaMesa,
  tieneReloj,
} from '../../shared/arcade';
import type { ContextoMovimiento, ManifiestoDeArcade, Movimiento } from '../../shared/arcade';
import {
  abrirMesa,
  avanzarElReloj,
  cerrarMesa,
  jugar,
  MovimientoRechazado,
} from '../src/arcade/arbitro';
import { elCanal, ponerCanal, quitarCanal } from '../src/canal';
import { canalDeSondeo } from '../src/canal/sondeo';
import { sinComentarios } from './sin-comentarios';

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

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * LOS PEAJES SON DE DOS CLASES, Y CONVIENE NO CONFUNDIRLAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * MEDIDOS. Se leen del árbol: se mira el fichero y se comprueba si la causa
 * sigue ahí. Si alguien arregla la causa, el peaje DESAPARECE SOLO de la lista y
 * lo dice. Y si alguien borra la línea de aquí con la causa viva, la comprobación
 * del anclaje se pone roja. No se pueden maquillar.
 *
 * DECLARADOS. Son JUICIOS: «este campo obligatorio no le dice nada a este
 * juego». No hay nada que leer en el árbol que los confirme, porque lo que
 * afirman no es un hecho del código sino una opinión sobre el contrato. Se
 * escriben a mano y sí se pueden borrar sin que nada se ponga rojo.
 *
 * La primera versión de este fichero los tenía todos declarados, y eso era una
 * debilidad real: el entregable más valioso de la fase era el único maquillable.
 * Los que se pueden medir, se miden. Los que no, se dicen — y se dice que no se
 * miden, que es la otra mitad de la honradez.
 */

interface PeajeMedido {
  que: string;
  /** Qué se ha leído del árbol para saberlo. Va impreso, para poder rehacerlo. */
  comoSeMide: string;
  /** ¿Sigue la causa en el árbol? */
  sigue: boolean;
}

const peajesMedidos: PeajeMedido[] = [];
const peajesDeclarados: string[] = [];

/** Anota un juicio sobre el contrato. No se mide: se opina, y se firma. */
function peajeDeclarado(que: string): void {
  peajesDeclarados.push(que);
}

/**
 * Lee un fichero del árbol para medir un peaje, con los comentarios quitados.
 *
 * Sin quitarlos, medir la aserción a `AvisoClave` daría positivo por el
 * comentario que la explica — y entonces borrar la aserción de verdad y dejar el
 * comentario dejaría el peaje puesto para siempre.
 */
function fuenteDe(rel: string): string {
  const texto = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  comprobar(`se puede leer ${rel} para medir sus peajes`, texto.length > 0);
  return sinComentarios(texto);
}
/** Comprueba que algo salta, y con qué. */
function salta(que: string, hacerlo: () => unknown, nombreEsperado?: string): void {
  let saltó: unknown;
  try {
    hacerlo();
  } catch (error) {
    saltó = error;
  }
  const nombre = saltó instanceof Error ? saltó.name : undefined;
  comprobar(que, saltó !== undefined && (nombreEsperado === undefined || nombre === nombreEsperado), {
    saltó: nombre ?? String(saltó),
    esperado: nombreEsperado,
  });
}

// ---------------------------------------------------------------------------
// El juego
// ---------------------------------------------------------------------------

/**
 * El estado de El Botón. Cuatro números y un color.
 *
 * PEAJE: el motor lo trata como `unknown` —esa es la opacidad de la que cuelga
 * todo el diseño— así que el juego se convierte a su propio tipo en cada
 * frontera con la autoridad. Es el precio declarado de §5.1 y no una sorpresa,
 * pero se paga: `as EstadoDelBoton` aparece cinco veces en este fichero, y
 * aparecerá en cualquier arcade que hable con el árbitro.
 */
interface EstadoDelBoton {
  color: 'apagado' | 'encendido';
  pulsaciones: number;
  aciertos: number;
  /** Lo pone el JUEGO cuando su regla dice que se acabó. El motor no lo mira. */
  terminado: boolean;
}

/** Cada cuántos tics cambia el color. Es una regla del juego y vive en el juego. */
const TICS_POR_COLOR = 3;
/** Cuánto dura una partida. Otra regla del juego. */
const TICS_DE_PARTIDA = 12;

function reciennacido(): EstadoDelBoton {
  return { color: 'apagado', pulsaciones: 0, aciertos: 0, terminado: false };
}

/**
 * EL REDUCTOR ENTERO. Doce líneas, y ninguna sabe que existe un servidor.
 *
 * Cumple las tres reglas de `motor.ts`: no muta lo que recibe, no mira el reloj
 * ni el azar del sistema, y siempre devuelve un estado — incluido el caso de un
 * movimiento que no reconoce, donde devuelve el que le llegó en vez de lanzar.
 */
function avanzarElBoton(
  estado: EstadoDelBoton,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): EstadoDelBoton {
  if (estado.terminado) return estado;

  if (movimiento.tipo === 'arcade:tic') {
    const color: EstadoDelBoton['color'] =
      Math.floor(ctx.tic / TICS_POR_COLOR) % 2 === 1 ? 'encendido' : 'apagado';
    return { ...estado, color, terminado: ctx.tic >= TICS_DE_PARTIDA };
  }

  if (movimiento.tipo === 'pulsar') {
    return {
      ...estado,
      pulsaciones: estado.pulsaciones + 1,
      aciertos: estado.aciertos + (estado.color === 'encendido' ? 1 : 0),
    };
  }

  /*
   * Un movimiento que no se reconoce devuelve el estado tal cual. Lanzar sería
   * peor: quien hospeda la partida no tiene forma de distinguir «lo rechacé» de
   * «reventé», y un juego que revienta con un movimiento raro es un juego que se
   * cae cuando alguien manda algo con curl.
   */
  return estado;
}

/*
 * ═══ EL MANIFIESTO, Y AQUÍ SE COBRAN CUATRO PEAJES SEGUIDOS ═══
 *
 * Son once campos y este juego necesita de verdad cuatro: cómo se llama, cómo se
 * pinta, dónde corre y a qué ritmo. Los otros los rellena porque se los piden.
 */
const EL_BOTON: ManifiestoDeArcade = {
  id: 'el-boton',
  nombre: 'El Botón',
  /*
   * PEAJE: un juego tiene que traer una frase de venta aunque no vaya a la
   * tienda. En un arcade de prueba, de repetición o interno, `gancho` es texto
   * que alguien escribe para que compile.
   */
  gancho: 'Púlsalo cuando se encienda. Nada más.',
  /*
   * PEAJE: `icono` es obligatorio y es una unión CERRADA. Hoy tiene un solo
   * valor, así que la elección es aparente: este juego no elige un dibujo, acepta
   * el único que hay. Se acepta a sabiendas —la unión cerrada es lo que hace que
   * la app no compile si falta el dibujo, que es la disciplina de `IconoId`— pero
   * es un campo que este juego no tenía nada que decir sobre él.
   */
  icono: 'mando',
  /*
   * PEAJE: hay que declarar un aforo. Aquí es honesto porque se juega solo, pero
   * el juego que viene detrás —un aparato que pasa de mano en mano— NO SABE
   * cuánta gente hay: no están registrados, no tienen móvil propio y a veces ni
   * se cuentan. Tendrá que inventarse un número.
   */
  jugadores: { minimo: 1, maximo: 1 },
  sede: 'dispositivo',
  tickHz: 4,
  mueble: 'formulario',
  /*
   * PEAJE: `secretos` es obligatorio, así que un juego sin nada que esconder
   * tiene que decirlo. Es un booleano y no hay forma de omitirlo.
   *
   * Y conviene ser justo: hacerlo opcional sería peor. Un juego que SÍ tiene
   * secretos y se olvida del campo pasaría a filtrarlos en silencio, que es
   * exactamente el fallo mudo que esto viene a cerrar. El peaje es real y la
   * alternativa es peor; queda anotado como lo que es.
   */
  secretos: false,
  /*
   * NINGUNA CIFRA, DICHO CON UNA PALABRA Y NO CON UN CAMPO AUSENTE.
   *
   * Y esto ya NO es un peaje, es lo contrario: antes el campo era opcional y
   * este juego lo omitía, que es la bandera silenciosa que §4 prohíbe. Ahora
   * renunciar a la verificación del marcador cuesta teclear `'ninguno'`, y eso
   * es lo mismo de escribir y muchísimo más visible en un diff.
   */
  marcador: { tipo: 'ninguno' },
  /*
   * PEAJE: `procedencia` es obligatoria. Es un campo LEGAL, y el diseño lo
   * defiende con un argumento bueno —cuesta un campo ahora y una migración con
   * la tienda de por medio después—, pero para un juego de pulsar un botón es
   * papeleo. Queda anotado porque un peaje aceptado a sabiendas sigue siendo un
   * peaje: la lista honesta es la que lo dice.
   */
  procedencia: { tipo: 'mecanica-generica' },
};

/*
 * ═══ Y EL MISMO JUEGO, MUDADO DE SEDE ═══
 *
 * PEAJE: para jugar el mismo juego en las dos sedes hay que declarar DOS
 * manifiestos. `sede` es dato, sí, pero es dato del juego y no de la mesa, así
 * que un arcade no puede correr en el aparato cuando no hay red y en el servidor
 * cuando la hay.
 *
 * Puede ser la decisión correcta —dos sedes significan dos modelos de confianza,
 * y un juego que cambia de modelo de confianza en caliente es un juego con dos
 * modos, el que se probó y el que no—. Pero cuesta un manifiesto duplicado, y el
 * duplicado es lo que se queda viejo.
 *
 * Lo que NO cuesta, y es lo que esta comprobación existe para demostrar, es una
 * sola línea del reductor.
 */
const EL_BOTON_CON_AUTORIDAD: ManifiestoDeArcade = {
  ...EL_BOTON,
  id: 'el-boton-servidor',
  nombre: 'El Botón (con autoridad)',
  sede: 'servidor',
};

instalarArcade({ manifiesto: EL_BOTON, avanzar: avanzarElBoton });
instalarArcade({ manifiesto: EL_BOTON_CON_AUTORIDAD, avanzar: avanzarElBoton });

// ---------------------------------------------------------------------------

console.log('\nEl Botón · un arcade sin tablero, sin turnos, sin red, sin asientos,');
console.log('           sin puntuación, sin azar y sin secretos');

paso('El manifiesto se acepta tal cual');
const m = manifiestoDeArcade('el-boton');
comprobar('el arcade queda instalado con su id', m.id === 'el-boton', m.id);
comprobar('declara `marcador: ninguno` con todas sus letras', m.marcador.tipo === 'ninguno', m.marcador);
comprobar('y de ahí se DERIVA que no se le exige reejecutabilidad', exigeReejecutabilidad(m) === false);
/*
 * Y AL REVÉS, QUE ES LO QUE HACE QUE LA DERIVACIÓN SIGNIFIQUE ALGO: el mismo
 * manifiesto con una cifra sí queda obligado. Sin esta línea, la comprobación de
 * arriba pasaría igual con una función que devolviera `false` siempre.
 */
comprobar(
  'y un manifiesto que sí publica una cifra queda obligado, sin declararlo',
  exigeReejecutabilidad({
    ...EL_BOTON,
    marcador: { tipo: 'cifra', rotulo: 'Aciertos', sentido: 'mas-alto' },
  }) === true,
);
comprobar('tiene reloj, porque el color cambia solo', tieneReloj(m) === true);
comprobar('y NO necesita mesa, porque corre en el aparato', necesitaMesa(m) === false);
comprobar(
  'el mismo juego con la otra sede sí la necesita, y es el único campo que cambia',
  necesitaMesa(manifiestoDeArcade('el-boton-servidor')) === true,
);
comprobar('un arcade que no está instalado no se resuelve a ningún otro', !arcadeInstalado('el-que-no-existe'));
/*
 * Y ESTA COMPROBACIÓN ES LA QUE MÁS DICE DEL FICHERO.
 *
 * En el otro motor, `manifiestoDe` devolvía CLUEDO cuando no encontraba el
 * juego, y eso dejaba jugar una velada entera con las reglas de otro juego sin
 * un solo error por ninguna parte. Aquí pedir un arcade que no está es un fallo
 * ruidoso desde el primer commit, que es cuando sale gratis.
 */
salta(
  'pedir un arcade que no está instalado FALLA, no cae en otro',
  () => manifiestoDeArcade('el-que-no-existe'),
  'ArcadeNoInstalado',
);

// ---------------------------------------------------------------------------

paso('Lo legal: `licenciado` sin papeles no entra');

/*
 * ═══ POR QUÉ ESTO SE COMPRUEBA EN EJECUCIÓN SI EL TIPO YA OBLIGA ═══
 *
 * Porque el tipo obliga a que los tres campos ESTÉN, no a que digan algo:
 * `titular: ''` compila. Y porque un arcade puede venir de FUERA del binario,
 * cargado por el enchufe en su fase, y allí no hay compilador — lo que llega es
 * un objeto que escribió alguien en otro repositorio.
 *
 * Una etiqueta «licenciado» que nadie puede auditar es peor que no tener el
 * campo, porque parece que alguien lo comprobó.
 */
const malLicenciado: ManifiestoDeArcade = {
  ...EL_BOTON,
  id: 'el-pirata',
  procedencia: {
    tipo: 'licenciado',
    titular: '   ',
    referencia: '',
    vigencia: { desde: 'el año pasado', hasta: 'cuando sea' },
  },
};
let problemasDelPirata: string[] = [];
try {
  instalarArcade({ manifiesto: malLicenciado, avanzar: avanzarElBoton });
} catch (error) {
  problemasDelPirata = error instanceof ArcadeMalEscrito ? error.problemas : [];
}
comprobar(
  'una licencia sin titular, sin referencia y con fechas inventadas no se instala',
  problemasDelPirata.length === 4,
  problemasDelPirata,
);
comprobar('y NO queda instalada a medias', !arcadeInstalado('el-pirata'), arcadeInstalado('el-pirata'));
comprobar(
  'el error nombra los cuatro problemas, no solo el primero',
  problemasDelPirata.some((p) => p.includes('titular')) &&
    problemasDelPirata.some((p) => p.includes('referencia')) &&
    problemasDelPirata.some((p) => p.includes('desde')) &&
    problemasDelPirata.some((p) => p.includes('hasta')),
  problemasDelPirata,
);

/* Y una licencia con sus papeles entra sin quejas. */
instalarArcade({
  manifiesto: {
    ...EL_BOTON,
    id: 'el-legal',
    procedencia: {
      tipo: 'licenciado',
      titular: 'Editorial de Ejemplo, S.L.',
      referencia: 'contrato 2026-0042, archivado en legal/',
      vigencia: { desde: '2026-01-01', hasta: 'perpetua' },
    },
  },
  avanzar: avanzarElBoton,
});
comprobar('una licencia con titular, referencia y vigencia sí entra', arcadeInstalado('el-legal'));
olvidarArcade('el-legal');

/* Y la cifra: si se publica una, hay que decir cómo se llama. */
salta(
  'un marcador que publica una cifra sin rótulo tampoco entra',
  () =>
    instalarArcade({
      manifiesto: {
        ...EL_BOTON,
        id: 'el-mudo-de-cifra',
        marcador: { tipo: 'cifra', rotulo: '', sentido: 'mas-alto' },
      },
      avanzar: avanzarElBoton,
    }),
  'ArcadeMalEscrito',
);

// ---------------------------------------------------------------------------

paso('Primera pasada: se juega ENTERO en el dispositivo, con la red arrancada');

/*
 * Se quita cualquier canal que hubiera puesto: a partir de aquí, el que está
 * instalado es el que LANZA. Cualquier llamada a la red durante la partida
 * pondría esto en rojo.
 */
quitarCanal();
salta(
  'sin canal instalado, tocar la red salta en vez de no hacer nada',
  () => elCanal().avisarCambio('la-que-sea'),
  'SinCanal',
);

let enElAparato: EstadoDelBoton = reciennacido();
const contextoDeAparato = (tic: number): ContextoMovimiento => ({
  /*
   * PEAJE: hay que montar un contexto a mano. En el dispositivo no hay árbitro
   * que lo componga, así que cada juego de `sede: 'dispositivo'` escribirá estas
   * cuatro líneas — y la semilla la elegirá él, que es lo correcto ahí (no hay
   * nadie a quien engañar) y sería un agujero en una mesa con autoridad.
   */
  quien: null,
  azar: 0,
  tic,
  asientos: [],
});

/*
 * PEAJE: NADIE REPARTE TICS. `tickHz: 4` declara a qué ritmo hay que meterlos y
 * la plataforma no los mete: los mete quien hospeda la partida. En la fase 0 eso
 * significa este bucle escrito a mano; en la fase del móvil será `bucle.ts` con
 * `useFrameCallback`.
 *
 * Es coherente con el diseño —el tic es un movimiento y no un servicio— y aun
 * así es trabajo que todo arcade con reloj va a repetir.
 */
for (let tic = 1; tic <= TICS_DE_PARTIDA; tic++) {
  enElAparato = avanzar('el-boton', enElAparato, movimientoDeTic(), contextoDeAparato(tic)) as EstadoDelBoton;
  /* Se pulsa en todos los tics: la mitad acertará y la mitad no. */
  enElAparato = avanzar(
    'el-boton',
    enElAparato,
    { tipo: 'pulsar' },
    contextoDeAparato(tic),
  ) as EstadoDelBoton;
}

comprobar('la partida se ha jugado entera sin tocar la red', true);
comprobar('el juego se declara terminado por su propia regla', enElAparato.terminado === true, enElAparato);
/*
 * ONCE PULSACIONES Y NO DOCE, Y ES LA COMPROBACIÓN QUE MÁS DICE DEL REPARTO.
 *
 * En el tic doce el juego se declara terminado, así que la pulsación de ese
 * mismo tic llega tarde y el REDUCTOR la ignora — devolviendo el estado tal
 * cual, como manda la tercera regla. El árbitro no ha intervenido: aquí ni
 * siquiera hay árbitro. La regla del fin la hace valer quien la conoce.
 */
comprobar('la pulsación posterior al fin no cuenta', enElAparato.pulsaciones === 11, enElAparato);
comprobar(
  'y los aciertos salen de su aritmética, sin azar de por medio: seis de once',
  enElAparato.aciertos === 6,
  enElAparato,
);

/*
 * QUE EL REDUCTOR NO MUTE NO SE DA POR SUPUESTO: se comprueba. Es la primera de
 * las tres reglas y la que más silenciosamente se rompe, porque un reductor que
 * muta funciona perfectamente hasta el día que alguien reejecuta una partida.
 */
const original = reciennacido();
const copiaAntes = JSON.stringify(original);
const despues = avanzar('el-boton', original, { tipo: 'pulsar' }, contextoDeAparato(1));
comprobar('el reductor NO muta el estado que recibe', JSON.stringify(original) === copiaAntes, original);
comprobar('y devuelve uno distinto', despues !== original);

/* Un movimiento que el juego no conoce devuelve el estado, no lanza. */
const conRaro = avanzar('el-boton', original, { tipo: 'no-existe', carga: { lo: 'que sea' } }, contextoDeAparato(1));
comprobar(
  'un movimiento desconocido devuelve el estado tal cual',
  JSON.stringify(conRaro) === copiaAntes,
  conRaro,
);

// ---------------------------------------------------------------------------

paso('Un reductor que se calla se caza a la primera');

instalarArcade({
  manifiesto: { ...EL_BOTON, id: 'el-mudo', nombre: 'El mudo' },
  /*
   * El error de quien viene del otro motor: mutar lo que llega y no devolver
   * nada. Allí es lo correcto; aquí dejaría el estado en `undefined` y la mesa en
   * blanco a mitad de partida, sin un solo error.
   */
  avanzar: () => undefined as unknown as EstadoDelBoton,
});
salta(
  'un reductor que no devuelve estado salta con nombre propio',
  () => avanzar('el-mudo', reciennacido(), { tipo: 'pulsar' }, contextoDeAparato(1)),
  'ReductorMudo',
);
comprobar('y el error dice qué movimiento lo provocó', new ReductorMudo('pulsar').message.includes('pulsar'));
olvidarArcade('el-mudo');

// ---------------------------------------------------------------------------

paso('Segunda pasada: el MISMO reductor, ahora detrás del árbitro');

let mesa = abrirMesa({
  id: 'mesa-de-prueba',
  arcade: 'el-boton-servidor',
  semilla: 12345,
  /*
   * CERO ASIENTOS, y esto es lo que hace que este juego quepa. `ejecutarAccion`
   * del motor de veladas exige SIEMPRE que quien actúa esté en `sesion.players`;
   * aquí una mesa sin asientos es una mesa sin puerta. Un arcade de un jugador
   * donde el servidor solo verifica no tiene a nadie a quien comprobar, y
   * obligarle a inventarse un asiento sería el peaje clásico.
   */
  estado: reciennacido(),
});

comprobar('la mesa nace en la revisión cero', mesa.rev === 0, mesa.rev);
comprobar('y con el diario vacío', mesa.diario.length === 0);
salta(
  'abrir mesa de un arcade que no está instalado falla al abrirla, no al primer movimiento',
  () => abrirMesa({ id: 'x', arcade: 'el-que-no-existe', semilla: 1 }),
  'ArcadeNoInstalado',
);

const revAntes = mesa.rev;
mesa = jugar(mesa, { quien: null, movimiento: { tipo: 'pulsar' }, rev: mesa.rev });
comprobar('sin asientos, cualquiera puede mover', (mesa.estado as EstadoDelBoton).pulsaciones === 1);
comprobar('y la revisión sube exactamente uno', mesa.rev === revAntes + 1, mesa.rev);
comprobar('el movimiento queda en el diario con su contexto', mesa.diario.length === 1);
comprobar(
  'y el contexto guardado lleva la semilla que eligió el SERVIDOR',
  mesa.diario[0]?.ctx.azar === 12345,
  mesa.diario[0]?.ctx,
);

/* Una revisión rancia se rechaza, y con su motivo. */
let motivo: string | undefined;
try {
  jugar(mesa, { quien: null, movimiento: { tipo: 'pulsar' }, rev: 0 });
} catch (error) {
  motivo = error instanceof MovimientoRechazado ? error.motivo : undefined;
}
comprobar('un movimiento con revisión rancia se rechaza', motivo === 'revision-rancia', motivo);

/* Y ahora con asientos, para comprobar la puerta. */
let conPuerta = abrirMesa({
  id: 'mesa-con-asientos',
  arcade: 'el-boton-servidor',
  semilla: 7,
  asientos: ['sitio-1', 'sitio-2'],
  estado: reciennacido(),
});
let motivoIntruso: string | undefined;
try {
  jugar(conPuerta, { quien: 'sitio-3', movimiento: { tipo: 'pulsar' }, rev: 0 });
} catch (error) {
  motivoIntruso = error instanceof MovimientoRechazado ? error.motivo : undefined;
}
comprobar('quien no está sentado no mueve', motivoIntruso === 'no-estas-sentado', motivoIntruso);
let motivoAnonimo: string | undefined;
try {
  jugar(conPuerta, { quien: null, movimiento: { tipo: 'pulsar' }, rev: 0 });
} catch (error) {
  motivoAnonimo = error instanceof MovimientoRechazado ? error.motivo : undefined;
}
comprobar(
  'y en una mesa CON asientos, no decir quién eres no es una llave maestra',
  motivoAnonimo === 'no-estas-sentado',
  motivoAnonimo,
);
conPuerta = jugar(conPuerta, { quien: 'sitio-2', movimiento: { tipo: 'pulsar' }, rev: 0 });
comprobar('quien sí está sentado mueve', (conPuerta.estado as EstadoDelBoton).pulsaciones === 1);
comprobar(
  'y los asientos viajan al reductor, en orden',
  conPuerta.diario[0]?.ctx.asientos.join() === 'sitio-1,sitio-2',
  conPuerta.diario[0]?.ctx.asientos,
);

/* El reloj entra por la puerta del árbitro y no por un temporizador. */
for (let i = 0; i < TICS_DE_PARTIDA; i++) mesa = avanzarElReloj(mesa);
comprobar('el reloj ha avanzado los doce tics', mesa.tic === TICS_DE_PARTIDA, mesa.tic);
comprobar(
  'y el juego se declara terminado él solo, por su regla',
  (mesa.estado as EstadoDelBoton).terminado === true,
  mesa.estado,
);

/*
 * PEAJE: el motor no sabe que la partida ha terminado. `terminado` es un campo
 * del estado opaco, así que el árbitro no lo ve y quien hospeda tiene que
 * leerlo y llamar a `cerrarMesa`.
 *
 * Es coherente —«fin como función del estado» es uno de los conceptos que el
 * diseño aplaza hasta que llegue un juego que lo pida— y aun así hay un hueco:
 * hasta que alguien cierre la mesa, el árbitro admite movimientos sobre una
 * partida que el juego ya da por acabada. Lo tapa el reductor, que devuelve el
 * estado tal cual cuando `terminado` es cierto; o sea que HOY la garantía la
 * pone el juego y no la plataforma.
 */
mesa = cerrarMesa(mesa);
let motivoTarde: string | undefined;
try {
  jugar(mesa, { quien: null, movimiento: { tipo: 'pulsar' }, rev: mesa.rev });
} catch (error) {
  motivoTarde = error instanceof MovimientoRechazado ? error.motivo : undefined;
}
comprobar('con la mesa cerrada ya no se mueve', motivoTarde === 'mesa-terminada', motivoTarde);

// ---------------------------------------------------------------------------

paso('La partida se puede reejecutar, y da lo mismo');

const rehecho = reejecutarEn('el-boton-servidor', reciennacido(), mesa.diario) as EstadoDelBoton;
comprobar(
  'reejecutar el diario devuelve exactamente el estado final',
  JSON.stringify(rehecho) === JSON.stringify(mesa.estado),
  { rehecho, final: mesa.estado },
);
const rehechoOtraVez = reejecutarEn('el-boton-servidor', reciennacido(), mesa.diario) as EstadoDelBoton;
comprobar(
  'y dos reejecuciones seguidas dan lo mismo entre sí',
  JSON.stringify(rehecho) === JSON.stringify(rehechoOtraVez),
);
comprobar(
  'las dos pasadas —aparato y servidor— llegan al mismo estado con las mismas entradas',
  (mesa.estado as EstadoDelBoton).color === enElAparato.color &&
    (mesa.estado as EstadoDelBoton).terminado === enElAparato.terminado,
  { servidor: mesa.estado, aparato: enElAparato },
);

// ---------------------------------------------------------------------------

paso('Sin secretos, la vista es el estado — y con secretos, no se arranca');

const vista = vistaDeAsiento('el-boton', enElAparato, ESPECTADOR);
comprobar('un juego sin secretos manda su estado entero', JSON.stringify(vista) === JSON.stringify(enElAparato));
comprobar('y no hay nada sin tapar', arcadesConSecretosSinTapar().length === 0, arcadesConSecretosSinTapar());

/*
 * Y AHORA LA PRUEBA DE §5.8, QUE ES LA QUE CONVIERTE UN FALLO MUDO EN UNO
 * RUIDOSO. Un juego que declara tener secretos y no los tapa NO DEJA ARRANCAR.
 * Sin esto, su mano viajaría a los móviles de los demás sin que nadie viera un
 * error nunca.
 *
 * Y son DOS cosas, no una: la proyección, que recorta, y `loSecreto`, que dice
 * QUÉ habría que recortar. Exigir solo la primera comprueba que el sitio existe,
 * no que haga nada — un juego puede registrar la identidad como proyección y
 * pasar en verde filtrándolo todo.
 */
instalarArcade({
  manifiesto: { ...EL_BOTON, id: 'el-tramposo', nombre: 'El tramposo', secretos: true },
  avanzar: avanzarElBoton,
});
comprobar(
  'un arcade con secretos y sin nada sale en la lista, y le faltan LAS DOS',
  arcadesConSecretosSinTapar()[0]?.falta.join() === 'proyeccion,lo-secreto',
  arcadesConSecretosSinTapar(),
);
salta('y NO deja arrancar', () => exigirSecretosTapados(), 'ArcadeSinProyeccion');
salta(
  'ni deja proyectar su vista por descuido',
  () => vistaDeAsiento('el-tramposo', reciennacido(), ESPECTADOR),
  'ArcadeSinProyeccion',
);

/*
 * SE REGISTRA SOLO LA PROYECCIÓN, Y SIGUE SIN ARRANCAR. Esta es la comprobación
 * que no existía antes de que existiera `loSecreto`, y es la que cierra el
 * agujero: con la proyección puesta, todo lo demás pasaba en verde.
 */
registrarProyeccion<EstadoDelBoton>('el-tramposo', (estado) => ({
  color: estado.color,
  /* Lo demás no se oculta: sencillamente no se envía. */
}));
comprobar(
  'con la proyección puesta, lo que falta es `loSecreto` y solo eso',
  arcadesConSecretosSinTapar()[0]?.falta.join() === 'lo-secreto',
  arcadesConSecretosSinTapar(),
);
salta('y sigue SIN dejar arrancar', () => exigirSecretosTapados(), 'ArcadeSinLoSecreto');
salta(
  'y preguntar qué esconde salta, en vez de contestar «nada»',
  () => loSecretoDe('el-tramposo', reciennacido()),
  'ArcadeSinLoSecreto',
);

/*
 * `loSecreto` devuelve los VALORES que jamás pueden salir en la proyección de
 * otro asiento. Aquí, cuántos aciertos lleva: es lo único que este juego
 * esconde. El motor no la llama nunca; la llamará `verify:mesa` en su fase.
 */
registrarLoSecreto<EstadoDelBoton>('el-tramposo', (estado) => [estado.aciertos, estado.pulsaciones]);
comprobar('con las dos puestas, ya no falta nada', arcadesConSecretosSinTapar().length === 0);
exigirSecretosTapados();
comprobar('y el arranque pasa sin lanzar', true);
const recortada = vistaDeAsiento('el-tramposo', enElAparato, ESPECTADOR) as Record<string, unknown>;
comprobar('lo que sale lleva lo público', recortada.color === enElAparato.color, recortada);
comprobar('y NO lleva lo que no se declaró', recortada.aciertos === undefined, recortada);
/*
 * Y LA COMPROBACIÓN QUE `loSecreto` HACE POSIBLE, en pequeño: ninguno de los
 * valores que el juego declara secretos aparece en lo que se manda. Esto es un
 * anticipo de lo que hará `verify:mesa` con una mesa de verdad y varios
 * asientos; aquí solo se demuestra que el contrato da para escribirla.
 */
const escondidos = loSecretoDe('el-tramposo', enElAparato);
const loQueSale = Object.values(recortada);
comprobar(
  'ningún valor declarado secreto aparece en la proyección',
  escondidos.every((v) => !loQueSale.includes(v)),
  { escondidos, loQueSale },
);
/*
 * Y AL REVÉS, para que la línea de arriba no sea un adorno: con la identidad
 * como proyección —el juego que «pasa en verde filtrando el mazo entero»— la
 * misma comprobación TIENE que fallar. Si no fallara, `loSecreto` no serviría
 * para nada.
 */
registrarProyeccion<EstadoDelBoton>('el-tramposo', (estado) => estado);
const sinRecortar = Object.values(vistaDeAsiento('el-tramposo', enElAparato, ESPECTADOR) as object);
comprobar(
  'y una proyección que no recorta NADA se caza con lo declarado',
  !escondidos.every((v) => !sinRecortar.includes(v)),
  { escondidos, sinRecortar },
);
olvidarElTapado('el-tramposo');
olvidarArcade('el-tramposo');

// ---------------------------------------------------------------------------

paso('El canal: los cinco verbos, sobre el hub de siempre y sin tocarlo');

ponerCanal(canalDeSondeo);
const canal = elCanal();

const laEspera = canal.esperarCambio('mesa-de-prueba');
canal.avisarCambio('mesa-de-prueba');
comprobar('esperarCambio se resuelve cuando algo cambia', (await laEspera) === true);

canal.anunciar('mesa-de-prueba', 3, { clave: 'boton-encendido', texto: 'Se enciende' });
const avisos = canal.avisosDesde('mesa-de-prueba', 2, null);
comprobar('anunciar y avisosDesde se entienden', avisos.length === 1, avisos);
comprobar('y el aviso llega con su clave propia, que no es de veladas', avisos[0]?.clave === 'boton-encendido');
comprobar('un aviso anterior a la revisión pedida no se repite', canal.avisosDesde('mesa-de-prueba', 3, null).length === 0);

canal.olvidar('mesa-de-prueba');
comprobar('olvidar suelta los avisos de la mesa', canal.avisosDesde('mesa-de-prueba', 0, null).length === 0);

/*
 * Y LO QUE ESTO PROTEGE DE VERDAD: que una mesa de arcade y una partida de
 * velada con el mismo identificador no se pisen. Las tablas de `hub.ts` son de
 * ámbito de módulo y se comparten; la llave del arcade va prefijada.
 */
const { anunciar: anunciarComoVelada, avisosDesde: avisosDeLaVelada, olvidar: olvidarLaVelada } = await import(
  '../src/live/hub'
);
anunciarComoVelada('mesa-de-prueba', 1, 'ronda-abierta', 'Esto es de una velada');
canal.olvidar('mesa-de-prueba');
comprobar(
  'olvidar una mesa de arcade NO borra los avisos de la velada del mismo nombre',
  avisosDeLaVelada('mesa-de-prueba', 0, null).length === 1,
  avisosDeLaVelada('mesa-de-prueba', 0, null),
);
olvidarLaVelada('mesa-de-prueba');
quitarCanal();

// ---------------------------------------------------------------------------

paso('La serialización canónica, sin la cual `verify:determinismo` daría falsos rojos');

/*
 * ═══ POR QUÉ SE PRUEBA AQUÍ, COMO EL AZAR ═══
 *
 * `shared/mecanicas/canonico.ts` es entregable de la fase 0 y su cliente
 * —`verify:determinismo`— es de la fase 3. O sea que si no se ejercita aquí, se
 * entrega una pieza que nadie ha ejecutado y que se descubrirá rota justo cuando
 * haga falta para depurar otra cosa.
 */
const { canonico, mismoEstado, porQueNoEsCanonico, NoCanonizable } = await import(
  '../../shared/mecanicas/canonico'
);

const unOrden = { color: 'rojo', aciertos: 3, mano: ['as', 'dos'] };
const otroOrden = { mano: ['as', 'dos'], aciertos: 3, color: 'rojo' };
comprobar(
  'dos estados con las claves en distinto orden dan LA MISMA cadena',
  canonico(unOrden) === canonico(otroOrden),
  { uno: canonico(unOrden), otro: canonico(otroOrden) },
);
comprobar(
  'y `JSON.stringify` no lo hacía, que es la razón de que este fichero exista',
  JSON.stringify(unOrden) !== JSON.stringify(otroOrden),
);
comprobar('`mismoEstado` dice que sí', mismoEstado(unOrden, otroOrden));
comprobar('y dice que no cuando de verdad difieren', !mismoEstado(unOrden, { ...unOrden, aciertos: 4 }));
comprobar(
  'el orden de una LISTA sí significa, y no se toca',
  canonico(['b', 'a']) !== canonico(['a', 'b']),
);
comprobar('el estado real de una partida se serializa sin quejarse', canonico(enElAparato).length > 0);
comprobar(
  'y el diario entero también, que es lo que se va a comparar entre motores',
  canonico(mesa.diario).length > 0,
);

/*
 * Y LO QUE RECHAZA, que es la otra mitad. `JSON.stringify` se traga estas cinco
 * cosas convirtiéndolas en `null` o borrándolas, y cada conversión es una
 * PÉRDIDA: dos estados distintos acabarían produciendo la misma cadena, y
 * entonces `verify:determinismo` daría verde por no ver la diferencia. Un falso
 * verde en el comprobador que existe para cazar divergencias.
 */
const rechaza = (que: string, valor: unknown): void => {
  salta(que, () => canonico(valor), 'NoCanonizable');
};
rechaza('rechaza un número infinito', { plazo: Number.POSITIVE_INFINITY });
rechaza('rechaza un `NaN`', { puntos: Number.NaN });
rechaza('rechaza un `undefined` dentro de un objeto', { mano: undefined });
rechaza('rechaza una función', { alJugar: () => 1 });
rechaza('rechaza un objeto que no es llano', { cuando: new (class Cosa {})() });
const ciclo: Record<string, unknown> = {};
ciclo.yo = ciclo;
rechaza('y rechaza un estado que se contiene a sí mismo', ciclo);
comprobar(
  'el error dice DÓNDE está el problema, no solo que lo hay',
  (porQueNoEsCanonico({ mesa: { mano: [Number.NaN] } }) ?? '').includes('mesa.mano.0'),
  porQueNoEsCanonico({ mesa: { mano: [Number.NaN] } }),
);
comprobar('y `porQueNoEsCanonico` calla cuando está bien', porQueNoEsCanonico(unOrden) === null);
comprobar('el error tiene nombre propio', new NoCanonizable('$', 'x').name === 'NoCanonizable');

/*
 * ═══ Y LA INTERACCIÓN QUE ESTO DESTAPÓ EN EL RELOJ ═══
 *
 * `ticsPara(segundos, 0)` devuelve infinito, que es la respuesta correcta para
 * un CÁLCULO: un arcade sin reloj no recibe tics, así que un plazo contado en
 * tics no vence nunca.
 *
 * Pero un `Plazo` es ESTADO: se guarda, se manda y se reejecuta. Con infinito
 * dentro, el estado dejaría de ser serializable — o peor, `JSON.stringify` lo
 * convertiría en `null` y un plazo infinito sería indistinguible de un plazo
 * ausente. Por eso `plazoDentroDe` convierte a `NUNCA`, que es un entero de
 * verdad. La conversión vive en la frontera donde el cálculo se hace estado.
 */
comprobar('sin reloj, el cálculo del plazo sigue siendo infinito', ticsPara(30, 0) === Infinity);
comprobar(
  'pero el PLAZO que se guarda es un entero',
  Number.isFinite(plazoDentroDe(0, ticsPara(30, 0)).vence),
);
comprobar('y ese entero es `NUNCA`', plazoDentroDe(0, ticsPara(30, 0)).vence === NUNCA);
comprobar('así que un estado con un plazo «nunca» sí se serializa', canonico(plazoDentroDe(0, ticsPara(30, 0))).length > 0);
comprobar('y con reloj, el plazo es el que dice la aritmética', plazoDentroDe(10, ticsPara(5, 4)).vence === 30);

// ---------------------------------------------------------------------------

paso('Los peajes de la costura, MEDIDOS sobre el árbol y no declarados');

/*
 * ═══ POR QUÉ ESTOS DOS SE MIDEN Y LOS DE ABAJO NO ═══
 *
 * Éstos son HECHOS del código: o `hub.ts` tiene una constante de módulo con el
 * plazo, o no la tiene. Se puede leer, así que se lee — y entonces borrar la
 * línea de aquí sin arreglar la causa deja de ser posible, porque la causa se
 * comprueba aparte y la comprobación se pone roja.
 *
 * Es la debilidad que tenía la primera versión de este fichero: `peaje()` era
 * `push()` a una lista, o sea que el entregable más valioso de la fase era el
 * único que se podía maquillar borrando una línea.
 */

const fuenteDelHub = fuenteDe('server/src/live/hub.ts');
const fuenteDelCanal = fuenteDe('server/src/canal/index.ts');
const fuenteDelSondeo = fuenteDe('server/src/canal/sondeo.ts');

/*
 * ANCLAJES. Antes de medir, se comprueba que se está mirando lo que se cree: si
 * `hub.ts` dejara de tener `esperarCambio`, la medida de abajo diría «no hay
 * peaje» por la razón equivocada — que es exactamente el verde falso que este
 * repositorio tiene anotado tres veces.
 */
comprobar('el hub sigue teniendo `esperarCambio` donde se cree', fuenteDelHub.includes('esperarCambio'));
comprobar('el canal sigue declarando `esperarCambio`', fuenteDelCanal.includes('esperarCambio'));
comprobar('el adaptador sigue llamando a `anunciar` del hub', fuenteDelSondeo.includes('anunciarEnHub'));

/*
 * El plazo del sondeo es una constante de módulo de `hub.ts` Y el contrato del
 * canal no tiene por dónde pedir otro. Las dos mitades tienen que ser ciertas
 * para que el peaje lo sea: si `hub` lo parametrizara, o si `esperarCambio`
 * admitiera un segundo argumento, dejaría de cobrarse.
 */
const plazoClavadoEnElHub = /\bconst\s+PLAZO_MS\s*=/.test(fuenteDelHub);
const esperarCambioDelCanal = /esperarCambio\s*\(([^)]*)\)/.exec(fuenteDelCanal);
const canalSinPedirPlazo = (esperarCambioDelCanal?.[1] ?? '').split(',').length === 1;
peajesMedidos.push({
  que: 'el plazo del sondeo lo fija `hub.ts` con una constante de módulo: un arcade no puede pedir el suyo',
  comoSeMide:
    '`const PLAZO_MS =` en server/src/live/hub.ts, y `Canal.esperarCambio` con un solo argumento',
  sigue: plazoClavadoEnElHub && canalSinPedirPlazo,
});

/*
 * Y la mentira al compilador: `hub.anunciar` tipa la clave como `AvisoClave`
 * —la unión cerrada de los sucesos de una VELADA— y el canal de arcade la tipa
 * como cadena libre, así que el adaptador convierte. Hoy es inofensivo porque
 * `hub` no interpreta la clave; el día que la mire, no habrá nada que lo cante.
 */
const hayAsercionDeAviso = /\bas\s+AvisoClave\b/.test(fuenteDelSondeo);
peajesMedidos.push({
  que: 'la clave de aviso se convierte a `AvisoClave` con una aserción: el arcade avisa con el vocabulario de otra familia',
  comoSeMide: '`as AvisoClave` en server/src/canal/sondeo.ts, fuera de comentarios',
  sigue: hayAsercionDeAviso,
});

/*
 * ═══ Y UNO QUE YA NO SE COBRA, MEDIDO IGUAL ═══
 *
 * Aquí había un tercero: «`olvidar` de una mesa de arcade llama de rebote a
 * `olvidarPresencia`, que es de veladas». Dejó de ser cierto cuando
 * `presencia.ts` se mudó a `server/src/mecanicas/`: ya no es una pieza de
 * veladas que el arcade toca de refilón, es una mecánica compartida que las dos
 * familias llaman a la cara.
 *
 * Se mide en vez de borrarse porque el que se mide dice la verdad en las dos
 * direcciones: si alguien devolviera `presencia.ts` a `live/`, este peaje
 * volvería a aparecer solo, sin que nadie se acordara de escribirlo.
 */
const presenciaEsMecanica = fs.existsSync(path.join(RAIZ, 'server/src/mecanicas/presencia.ts'));
const presenciaSigueEnVeladas = fs.existsSync(path.join(RAIZ, 'server/src/live/presencia.ts'));
comprobar('la presencia vive en `mecanicas/`, que es donde le toca', presenciaEsMecanica);
peajesMedidos.push({
  que: '`olvidar` de una mesa de arcade llama de rebote a algo que vive en `live/`',
  comoSeMide: 'existe server/src/live/presencia.ts',
  sigue: presenciaSigueEnVeladas,
});

// ---------------------------------------------------------------------------

paso('La mecánica del azar, que El Botón NO usa');

/*
 * ═══ POR QUÉ SE PRUEBA AQUÍ UNA MECÁNICA QUE ESTE JUEGO NO LLAMA ═══
 *
 * `shared/mecanicas/azar.ts` es entregable de la fase 0 y NINGÚN otro
 * comprobador lo toca: los cuatro de esta fase son este, dos barridos estáticos
 * y el presupuesto del núcleo. Un generador de números sembrado que nadie ha
 * ejecutado nunca es exactamente la clase de pieza que se descubre rota seis
 * meses después, en forma de dos dispositivos que barajan distinto.
 *
 * `verify:pureza` comprueba que no llama a `Math.random`. Eso NO comprueba que
 * su aritmética sea la que dice ser. Un generador impuro y uno sembrado con la
 * multiplicación mal escrita pasan los dos ese barrido, y solo uno de los dos
 * sirve.
 *
 * Va en esta sección aparte, y no mezclado con El Botón, porque El Botón es
 * «sin azar» a propósito y esa pobreza es media demostración.
 */
const { avanzarTiradas, barajar, elegir, enteroEntre, rebobinar, sembrar, siguiente, sinElAzar } =
  await import('../../shared/mecanicas/azar');

/*
 * ═══ EL VALOR DE ORO, Y POR QUÉ HAY UNO ═══
 *
 * Estos tres números son los que mulberry32 saca de la semilla 12345. Están
 * escritos a mano para que un cambio en la aritmética —una constante mal
 * copiada, un `>>>` que se convierte en `>>`— se cace AQUÍ y no en forma de
 * partidas guardadas que dejan de reejecutarse.
 *
 * Sin esto, cualquier prueba de determinismo pasaría igual con un generador
 * distinto: comparar el algoritmo consigo mismo siempre da que sí.
 */
const primeros = [0.9797282677609473, 0.3067522644996643, 0.484205421525985];
let semilla = sembrar(12345);
const sacados: number[] = [];
for (let i = 0; i < 3; i++) {
  const t = siguiente(semilla);
  semilla = t.azar;
  sacados.push(t.valor);
}
comprobar('mulberry32 saca de la semilla 12345 exactamente lo que dice', sacados.join() === primeros.join(), sacados);
comprobar('y lleva la cuenta de las tiradas, que es lo que permite rebobinar', semilla.tiradas === 3, semilla);

const recienSembrado = sembrar(12345);
const unaTirada = siguiente(recienSembrado);
comprobar('`siguiente` no muta el azar que recibe', recienSembrado.tiradas === 0, recienSembrado);
comprobar('el valor cae en [0, 1)', unaTirada.valor >= 0 && unaTirada.valor < 1, unaTirada.valor);
comprobar(
  'rebobinar y volver a avanzar deja el azar EXACTAMENTE donde estaba',
  JSON.stringify(avanzarTiradas(rebobinar(semilla), 3)) === JSON.stringify(semilla),
  { rebobinado: avanzarTiradas(rebobinar(semilla), 3), original: semilla },
);

let dados = sembrar(99);
let minimo = 7;
let maximo = 0;
for (let i = 0; i < 200; i++) {
  const t = enteroEntre(dados, 1, 6);
  dados = t.azar;
  if (t.valor < minimo) minimo = t.valor;
  if (t.valor > maximo) maximo = t.valor;
}
comprobar('un dado de seis caras saca el uno y saca el seis', minimo === 1 && maximo === 6, { minimo, maximo });
comprobar(
  'un rango dado la vuelta devuelve el mínimo y NO gasta tirada',
  enteroEntre(dados, 5, 2).azar.tiradas === dados.tiradas,
);

const mazo = ['a', 'b', 'c', 'd', 'e', 'f'];
const barajado = barajar(sembrar(4), mazo);
comprobar('barajar no muta la lista que recibe', mazo.join() === 'a,b,c,d,e,f');
comprobar('y devuelve una permutación, sin perder ni repetir cartas', [...barajado.valor].sort().join() === 'a,b,c,d,e,f', barajado.valor);
comprobar(
  'gasta exactamente n−1 tiradas, siempre las mismas: dos motores consumen igual',
  barajado.azar.tiradas === mazo.length - 1,
  barajado.azar,
);
comprobar(
  'la misma semilla baraja igual',
  barajar(sembrar(4), mazo).valor.join() === barajado.valor.join(),
);
comprobar(
  'y otra semilla baraja distinto',
  barajar(sembrar(5), mazo).valor.join() !== barajado.valor.join(),
);
comprobar('elegir de una lista vacía devuelve nada y no gasta tirada', elegir(dados, []).valor === undefined);

const conAzar = { azar: sembrar(1), mano: ['as'] };
const proyectado = sinElAzar(conAzar, 'azar');
comprobar('`sinElAzar` quita la semilla de lo que se envía', (proyectado as Record<string, unknown>).azar === undefined);
comprobar('y no toca el estado de verdad', conAzar.azar !== undefined);

// ---------------------------------------------------------------------------

paso('Los peajes del contrato, DECLARADOS: son juicios y no hechos');

peajeDeclarado('`icono` es obligatorio y hoy la unión cerrada tiene un solo valor: no se elige, se acepta');
peajeDeclarado('`gancho` obliga a escribir una frase de venta aunque el juego no vaya a ninguna tienda');
peajeDeclarado('`jugadores` obliga a declarar un aforo aunque el juego no sepa cuánta gente hay delante');
peajeDeclarado('`secretos` es un booleano obligatorio incluso en un juego sin nada que esconder');
peajeDeclarado('`procedencia` es obligatoria: papeleo legal para un juego de pulsar un botón');
peajeDeclarado('para correr en las dos sedes hacen falta DOS manifiestos: `sede` es del juego, no de la mesa');
peajeDeclarado('el estado es opaco, así que el juego se convierte a su tipo en cada frontera con el árbitro');
peajeDeclarado('nadie reparte tics: `tickHz` declara el ritmo y el bucle lo escribe quien hospeda');
peajeDeclarado('el fin lo declara el JUEGO y lo pregunta quien hospeda: el árbitro sigue sin saberlo');

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`${hechas} comprobaciones`);
console.log('\nEl núcleo sostiene un arcade sin tablero, sin turnos, sin red, sin asientos,');
console.log('sin puntuación, sin azar y sin secretos — y el mismo reductor corre en las dos sedes.');

const cobrados = peajesMedidos.filter((p) => p.sigue);
const pagados = peajesMedidos.filter((p) => !p.sigue);
const total = cobrados.length + peajesDeclarados.length;

if (total === 0) {
  console.log('\nY NO COBRA NINGÚN PEAJE por dejarlo entrar.');
} else {
  console.log(`\nPero cobra ${total} peajes por dejarlo entrar.`);
}

if (cobrados.length > 0) {
  console.log(`\n  MEDIDOS sobre el árbol (${cobrados.length}) — desaparecen solos al arreglarse:\n`);
  for (const p of cobrados) {
    console.log(`  PEAJE: ${p.que}`);
    console.log(`         se mide leyendo: ${p.comoSeMide}`);
  }
}

if (pagados.length > 0) {
  console.log(`\n  YA NO SE COBRAN (${pagados.length}) — la causa se arregló y esto lo notó solo:\n`);
  for (const p of pagados) console.log(`  ·  ${p.que}`);
}

if (peajesDeclarados.length > 0) {
  console.log(
    `\n  DECLARADOS (${peajesDeclarados.length}) — son juicios sobre el contrato, no hechos del código,\n` +
      '  así que NADIE los mide y borrar una línea de aquí no pone nada en rojo:\n',
  );
  for (const p of peajesDeclarados) console.log(`  PEAJE: ${p}`);
}

if (total > 0) {
  console.log(
    '\nMientras quede uno, un arcade nuevo tiene que rellenar campos que no le dicen nada,\n' +
      'o escribir código que la plataforma debería estar poniendo.',
  );
}
