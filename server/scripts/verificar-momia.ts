/**
 * Una velada entera de El Misterio de la Momia.
 *
 *   npm run verify:momia
 *
 * POR QUÉ HACE FALTA ADEMÁS DEL PUZLE Y DEL MAESTRO DE ORO. `verify:puzle-momia`
 * demuestra que el puzle es bueno; el maestro de oro, que CLUEDO no ha cambiado.
 * Ninguno de los dos toca la frontera por la que de verdad se cuelan los fallos:
 * el cable. La app no llama a funciones, manda JSON, y el cuerpo de una petición
 * es `unknown` para TypeScript. Ahí vivía el error más silencioso del refactor
 * anterior, y ahí es donde se comprueba la regla de oro de este juego: que el
 * orden verdadero NO VIAJA al móvil.
 *
 * AISLAMIENTO. El servidor arranca con el directorio de trabajo en una carpeta
 * temporal sin `.env` al lado, y con el entorno enumerado a mano. La lección
 * está en ARCHITECTURE.md y costó cara: en Windows, vaciar una variable de
 * entorno la BORRA, y entonces dotenv carga el fichero de verdad —con la clave
 * de Anthropic y el Atlas de producción dentro—.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTA PRUEBA TIENE DOS ACTOS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * El primero juega por HTTP, contra el servidor de verdad. El segundo juega en
 * el mismo proceso. No es pereza: hay dos cosas que la plataforma todavía no
 * sabe hacer y que dejan fuera del cable a parte del juego.
 *
 *   · El motor solo le pasa al reductor los campos declarados en `eligeDe`
 *     (`motor.ts`, el bucle de `limpios`). `proponer-orden` necesita una lista
 *     ordenada de cinco entidades y `eligeDe` no sabe expresar eso, así que su
 *     propuesta se descarta antes de llegar. Es §8.5 del diseño.
 *   · No hay ruta para abrir la fase `sellado`: `routes/live.ts` tiene ronda,
 *     acusaciones y desenlace, y ninguna transición genérica.
 *
 * Las dos están anotadas en el informe. Mientras tanto, el ACTO I comprueba por
 * el cable todo lo que el cable admite —y comprueba EXPRESAMENTE que
 * `proponer-orden` se rechaza hoy, para que el día que se arregle esta prueba se
 * ponga roja y haya que venir a actualizarla— y el ACTO II ejerce el sellado
 * entero llamando a las funciones, que es donde vive la lógica.
 *
 * SE ARRANCA EL SERVIDOR DE VERDAD, sin ayudarle. Durante un rato esta prueba
 * escribió un arrancador propio en la carpeta temporal que importaba a mano los
 * módulos de la Momia, porque el alta colgaba de `routes/jugar.ts` y no de
 * ningún sitio que corriera siempre. Eso era una trampa: el verificador pasaba
 * en verde importando lo que el servidor de producción no importaba. Ahora hay
 * un sitio único —`juegos/instalados.ts`, cargado desde el arranque— y esta
 * prueba levanta `src/index.ts` a pelo, como haría cualquiera. La comprobación
 * de que ese sitio único sigue dando de alta la Momia está más abajo.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generarTramaMomia, estadoInicial, tramaDe } from '../src/juegos/momia-trama';
import { entrarEnCamara, invocarDon, ofrendarAmuleto, proponerOrden } from '../src/juegos/momia-acciones';
import { ejecutarSellado, resolverSellado, selladoDe, trofeosDe } from '../src/juegos/momia-sellado';
import { vistaMomiaDe } from '../src/juegos/momia-proyeccion';
import { MARCAS_PARA_TOCADO } from '../../shared/juegos/momia-tipos';
import type { TramaMomia } from '../../shared/juegos/momia-tipos';
import type { GameSession } from '../../shared/types';
import { manifiestoDe } from '../../shared/juegos';
import type { LiveSession, VistaJugador } from '../../shared/live';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const INSTALADOS = path.join(REPO, 'server', 'src', 'juegos', 'instalados.ts');
/** Puerto al azar: Windows tarda en soltar el del servidor recién matado. */
const PUERTO = 5700 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PUERTO}/api`;

// ---------------------------------------------------------------------------
// Comprobaciones
// ---------------------------------------------------------------------------

let hechas = 0;
const fallos: string[] = [];
const pendientes: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 300)}`}`,
  );
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// La partida sembrada
// ---------------------------------------------------------------------------

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani'];
const CAMARAS = [
  'Cámara del Barquero',
  'Pozo de las Ofrendas',
  'Antesala de los Sellos',
  'Corredor de las Estrellas',
  'Sala de la Balanza',
];
const RELIQUIAS = ['Escarabeo de lapislázuli', 'Máscara funeraria', 'Vaso canopo'];
const RITOS = [
  'Rito del Agua',
  'Rito del Aliento',
  'Rito del Nombre',
  'Rito de la Balanza',
  'Rito del Silencio',
];
const VIGILIAS = 4;

function nuevaPartida(): { game: GameSession; sesion: LiveSession } {
  const ahora = '2026-03-01T21:00:00.000Z';
  const game: GameSession = {
    id: 'momia',
    name: 'La casa de los Sabrón',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    // Las tres categorías con almacén heredado van donde el manifiesto dice, y
    // los ritos —la primera categoría de la plataforma sin campo heredado— en
    // `entidades`. Si algo de esto estuviera mal, no se encontrarían los ritos.
    suspects: GENTE.map((name, i) => ({ id: `e${i}`, name })),
    rooms: CAMARAS.map((name, i) => ({ id: `c${i}`, name })),
    weapons: RELIQUIAS.map((name, i) => ({ id: `q${i}`, name })),
    entidades: { ritos: RITOS.map((name, i) => ({ id: `t${i}`, name })) },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'momia' },
  };

  /*
   * SEMILLA FIJA Y SAQUEADOR FIJO. La trama reparte el papel de saqueador al
   * azar, y esta prueba juega siempre con las mismas personas: si el saqueador
   * cambiara de una ejecución a otra, media prueba fallaría una vez de cada
   * cuatro sin que nada estuviera roto. Un comprobador intermitente se acaba
   * ignorando, que es peor que no tenerlo.
   */
  game.plot = generarTramaMomia(game, { semilla: 'velada-de-prueba', vigilias: VIGILIAS, saqueador: 'e3' });

  const sesion: LiveSession = {
    id: game.id,
    juego: 'momia',
    code: 'MOMIA',
    phase: 'lobby',
    round: 0,
    totalRounds: VIGILIAS,
    players: GENTE.map((name, i) => ({
      suspectId: `e${i}`,
      displayName: name,
      joinCode: `MOMIA${i}`,
      joined: false,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    acusaciones: [],
    tablon: [],
    rev: 1,
    updatedAt: ahora,
  };
  return { game, sesion };
}

function sembrar(dir: string, game: GameSession, sesion: LiveSession): void {
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'data', 'db.json'),
    JSON.stringify(
      { games: [game], messages: {}, config: { model: 'claude-fable-5' }, live: [sesion], accounts: [] },
      null,
      2,
    ),
    'utf8',
  );
}

// ---------------------------------------------------------------------------
// Cliente HTTP mínimo
// ---------------------------------------------------------------------------

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; testigo?: string } = {},
): Promise<{ estado: number; datos: any }> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.testigo ? { Authorization: `Bearer ${opciones.testigo}` } : {}),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown = texto;
  try {
    datos = JSON.parse(texto);
  } catch {
    /* respuesta no JSON: se deja el texto */
  }
  return { estado: r.status, datos };
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${BASE}/games`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('el servidor no llegó a arrancar');
}

// ---------------------------------------------------------------------------
// La regla de oro
// ---------------------------------------------------------------------------

/** Las claves que no pueden aparecer NUNCA en el JSON que recibe el móvil. */
const PROHIBIDAS = ['ordenVerdadero', 'falso', 'falsasCandidatas', 'restriccion', 'restricciones'];

/**
 * Busca fugas en lo que se le manda a una persona.
 *
 * Mira dos cosas distintas a propósito, porque una sola no basta:
 *
 *   · Que no exista ninguna CLAVE de las prohibidas, a cualquier profundidad.
 *     Cazaría un `falso: false`, que ya diría de qué fiarse.
 *   · Que la SECUENCIA del orden verdadero no aparezca serializada. Cazaría a
 *     quien la mandase con otro nombre, o dentro de un texto.
 */
function fugasEn(vista: unknown, ordenVerdadero: string[], prohibidas = PROHIBIDAS): string[] {
  const encontradas: string[] = [];

  const recorrer = (nodo: unknown, camino: string): void => {
    if (Array.isArray(nodo)) {
      nodo.forEach((x, i) => recorrer(x, `${camino}[${i}]`));
      return;
    }
    if (!nodo || typeof nodo !== 'object') return;
    for (const [clave, valor] of Object.entries(nodo as Record<string, unknown>)) {
      if (prohibidas.includes(clave)) encontradas.push(`${camino}.${clave}`);
      recorrer(valor, `${camino}.${clave}`);
    }
  };
  recorrer(vista, 'vista');

  // La secuencia, serializada tal cual. Caza a quien la mande como lista de
  // cadenas con otro nombre, o incrustada dentro de una lista más larga.
  const serie = JSON.stringify(ordenVerdadero).slice(1, -1);
  if (JSON.stringify(vista).includes(serie)) encontradas.push('la secuencia del orden verdadero');

  /*
   * Y LA SECUENCIA EN FORMA DE OBJETOS, que es la fuga que la comprobación de
   * arriba NO ve y que a punto estuvo de colarse.
   *
   * Se probó rompiéndolo: se hizo que la proyección mandara la lista de ritos
   * ordenada por el orden verdadero en vez de por el de la partida —o sea, la
   * respuesta entera, servida como `[{id, nombre}, …]`— y esta función dijo que
   * no había fuga. La secuencia estaba ahí, pero troceada por los `nombre` de en
   * medio, así que como texto no aparecía.
   *
   * De poco sirve un detector que solo caza la fuga escrita de una manera. Este
   * mira TODAS las listas del árbol y saca de cada una su secuencia de ids —el
   * elemento si es cadena, su `id` si es objeto— antes de compararla.
   */
  const comoIds = (nodo: unknown): string[] | undefined => {
    if (!Array.isArray(nodo)) return undefined;
    const ids = nodo.map((x) =>
      typeof x === 'string' ? x : (x as { id?: unknown } | null)?.id,
    );
    return ids.every((x) => typeof x === 'string') ? (ids as string[]) : undefined;
  };
  const buscarSecuencia = (nodo: unknown, camino: string): void => {
    const ids = comoIds(nodo);
    if (ids && ids.join('|') === ordenVerdadero.join('|')) {
      encontradas.push(`${camino} es el orden verdadero, en objetos`);
    }
    if (Array.isArray(nodo)) {
      nodo.forEach((x, i) => buscarSecuencia(x, `${camino}[${i}]`));
      return;
    }
    if (!nodo || typeof nodo !== 'object') return;
    for (const [clave, valor] of Object.entries(nodo as Record<string, unknown>)) {
      buscarSecuencia(valor, `${camino}.${clave}`);
    }
  };
  buscarSecuencia(vista, 'vista');

  return encontradas;
}

// ---------------------------------------------------------------------------
// ACTO I · la velada por el cable
// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-momia-'));
const { game, sesion } = nuevaPartida();
const trama = tramaDe(game.plot)!;
const SAQUEADOR = game.plot!.solution.respuestas.saqueador!;
sembrar(dir, game, sesion);

let servidor: ChildProcess | undefined;

async function jugarPorElCable(): Promise<void> {
  paso('Entran los cuatro expedicionarios');
  const testigos: Record<string, string> = {};
  for (let i = 0; i < GENTE.length; i++) {
    const r = await pedir('/jugar/entrar', {
      metodo: 'POST',
      cuerpo: { code: 'MOMIA', joinCode: `MOMIA${i}` },
    });
    comprobar(`${GENTE[i]} entra`, r.estado === 200, r.datos);
    testigos[`e${i}`] = r.datos?.token ?? '';
  }
  comprobar('los cuatro traen testigo', Object.values(testigos).every((t) => t.length > 20));

  const vista = async (id: string): Promise<VistaJugador> => {
    const r = await pedir('/jugar/vista', { testigo: testigos[id] });
    comprobar(`la vista de ${id} responde 200`, r.estado === 200, r.datos);
    return r.datos.vista as VistaJugador;
  };
  const accion = (id: string, nombre: string, datos: Record<string, unknown> = {}) =>
    pedir('/jugar/accion', {
      metodo: 'POST',
      testigo: testigos[id],
      cuerpo: { accion: nombre, datos },
    });

  paso('La sala de espera: el juego se reconoce, y no se filtra nada');
  let v = await vista('e0');
  comprobar('la partida es de la Momia', v.sesion.juego === 'momia', v.sesion.juego);
  comprobar('el título es el suyo', v.sesion.tituloPartida === 'El Misterio de la Momia');
  comprobar(
    'la acusación pregunta UNA sola cosa: quién rompió el sello',
    v.ejes.length === 1 && v.ejes[0]?.ejeId === 'saqueador',
    v.ejes.map((e) => e.ejeId),
  );
  comprobar('y llega el estado propio del juego', Boolean(v.estadoDelJuego), v.estadoDelJuego);

  paso('LA REGLA DE ORO · el orden verdadero no viaja al móvil');
  for (const id of Object.keys(testigos)) {
    const suya = await vista(id);
    const fugas = fugasEn(suya, trama.ordenVerdadero);
    comprobar(
      `nada se le filtra a ${id}${id === SAQUEADOR ? ' (el saqueador)' : ''}`,
      fugas.length === 0,
      fugas,
    );
  }
  const deOtro = await vista('e0');
  comprobar(
    'y a quien no es el saqueador no le llega ni la palabra «falsificar»',
    !JSON.stringify(deOtro).includes('falsificar') && !JSON.stringify(deOtro).includes('saqueo'),
  );
  const delSaqueador = await vista(SAQUEADOR);
  const saqueo = (delSaqueador.estadoDelJuego as { saqueo?: { disponibles: number } }).saqueo;
  comprobar(
    'al saqueador SÍ le llegan sus mentiras, o el don sería injugable',
    Boolean(saqueo) && saqueo!.disponibles > 0,
    saqueo,
  );

  paso('Quien dirige abre la primera vigilia');
  const abrir = await pedir(`/games/${game.id}/live/ronda/abrir`, {
    metodo: 'POST',
    cuerpo: { minutos: 10 },
  });
  comprobar('abrir la vigilia responde 200', abrir.estado === 200, abrir.datos);
  v = await vista('e0');
  comprobar('la vigilia 1 está abierta', v.sesion.phase === 'ronda-abierta' && v.sesion.round === 1);

  const estadoDe = (x: VistaJugador) => x.estadoDelJuego as any;
  comprobar(
    'se anuncia públicamente qué cámara está profanada',
    estadoDe(v).vigilia.profanada === trama.profanadas[0],
    { dice: estadoDe(v).vigilia.profanada, esperado: trama.profanadas[0] },
  );

  paso('Exploran: papiro para todos, marca para quien entra en la profanada');
  const profanada = trama.profanadas[0]!;
  /*
   * LA CÁMARA LIMPIA SE ELIGE ENTRE LAS QUE TIENEN PAPIRO ESTA VIGILIA. Los
   * fragmentos están repartidos por cámaras y vigilias, así que una limpia
   * cualquiera puede no dar nada: es el juego funcionando bien, pero deja a la
   * mitad de la mesa sin papiro y entonces el barrido de la regla de oro no
   * tendría nada que filtrar y saldría limpio por vacío.
   */
  const conPapiroHoy = trama.hallazgos.filter((h) => h.ronda === 1).map((h) => h.camaraId);
  const limpia =
    conPapiroHoy.find((c) => c !== profanada) ??
    CAMARAS.map((_, i) => `c${i}`).find((c) => c !== profanada)!;

  /*
   * ANA Y BRUNO ENTRAN EN LA PROFANADA, y hacen falta los DOS marcados. Con una
   * sola marca en toda la mesa, el médico la cura al invocar su don y el amuleto
   * de más abajo se queda sin nadie a quien dársela: la prueba fallaría por su
   * propio guion y no porque nada esté roto. Ya pasó.
   */
  for (const id of ['e0', 'e1']) {
    const r = await accion(id, 'explorar', { camara: profanada });
    comprobar(`${id} entra en la cámara profanada`, r.estado === 200, r.datos);
    comprobar('y se le avisa de que lo estaba', r.datos?.resultado?.profanada === true);
    comprobar('con una marca encima', r.datos?.resultado?.marcas === 1, r.datos?.resultado);
  }
  for (const id of ['e2', 'e3']) {
    const r = await accion(id, 'explorar', { camara: limpia });
    comprobar(`${id} explora una cámara limpia`, r.estado === 200, r.datos);
    comprobar('y sale sin marca', r.datos?.resultado?.marcas === 0, r.datos?.resultado);
  }

  paso('LA REGLA DE ORO, otra vez · ahora que hay papiro en las manos');
  /*
   * SE BARRE DOS VECES, Y LA SEGUNDA ES LA QUE VALE. En la sala de espera nadie
   * tiene fragmentos todavía, así que un `falso` que viajara no tendría dónde
   * aparecer y el barrido saldría limpio con la regla rota. Se descubrió
   * rompiéndola: mandando `falso` siempre, el primer barrido seguía en verde.
   */
  let papiroEnLaMesa = 0;
  for (const id of Object.keys(testigos)) {
    const suya = await vista(id);
    if (((suya.estadoDelJuego as any)?.yo?.fragmentos ?? []).length > 0) papiroEnLaMesa++;
    const fugas = fugasEn(suya, trama.ordenVerdadero);
    comprobar(`no se le filtra nada a ${id}`, fugas.length === 0, fugas);
  }
  comprobar(
    'y hay papiro repartido de verdad, o este barrido no probaría nada',
    papiroEnLaMesa >= 2,
    papiroEnLaMesa,
  );

  v = await vista('e0');
  comprobar('Ana ve su marca', estadoDe(v).yo.marcas === 1, estadoDe(v).yo);
  comprobar('y sus dos amuletos intactos', estadoDe(v).yo.amuletos === 2);
  comprobar('está en esa cámara', v.miSala === profanada, v.miSala);
  comprobar(
    'la mesa ve las marcas de los demás: es información pública',
    (await vista('e1')).estadoDelJuego !== undefined &&
      estadoDe(await vista('e1')).mesa.find((m: any) => m.suspectId === 'e0')?.marcas === 1,
  );

  paso('No se puede cambiar de cámara: la decisión no se rectifica');
  const otraVez = await accion('e0', 'explorar', { camara: limpia });
  comprobar('un segundo «explorar» en la misma vigilia se rechaza', otraVez.estado === 409, otraVez.datos);
  /*
   * Y SE DEJA ESCRITO QUIÉN LO RECHAZA, porque no es este juego: es el
   * `vecesPorTurno: 1` del motor. El manifiesto declara además
   * `cambiosPermitidos: 0` para decir lo mismo, pero ese campo hoy no lo lee
   * nadie —está en el informe—. Si algún día se cambia el `vecesPorTurno`, esta
   * línea se pondrá roja y quien la lea sabrá que la regla se había quedado
   * colgando de un solo clavo.
   */
  comprobar(
    'y lo rechaza el límite del motor, que es el único clavo del que cuelga hoy',
    String(otraVez.datos?.error ?? '').includes('una vez'),
    otraVez.datos,
  );
  v = await vista('e0');
  comprobar('y sigue donde entró', v.miSala === profanada, v.miSala);

  paso('Los fragmentos: solo los tuyos, y sin decir de cuáles fiarse');
  const conPapiro = Object.keys(testigos).filter(
    (id) => estadoDe({ estadoDelJuego: null } as any) === null,
  );
  void conPapiro;
  const vAna = await vista('e0');
  const misFragmentos = estadoDe(vAna).yo.fragmentos as Array<{ id: string; texto: string }>;
  comprobar(
    'los fragmentos llegan con su frase, ya redactada',
    misFragmentos.every((f) => typeof f.texto === 'string' && f.texto.length > 15),
    misFragmentos,
  );
  comprobar(
    'y sin la restricción en crudo, que se resolvería con un resolutor',
    !JSON.stringify(misFragmentos).includes('tipo'),
    misFragmentos,
  );

  paso('Invocar el don');
  /*
   * EL DON VA ANTES QUE EL AMULETO, y no es indiferente: es el orden de la
   * vigilia en §2 del diseño —explorar, invocar, ofrendar, cerrar—. Escrito al
   * revés, el amuleto ya había curado la única marca de la mesa y el médico se
   * quedaba sin nadie a quien sanar: la prueba fallaba por su propio guion, no
   * por el código.
   */
  /*
   * SE INVOCA CON QUIEN TENGA UN DON QUE NO DEPENDA DE NADIE MÁS. Los siete se
   * prueban uno a uno en el ACTO II, forzando el don que toca; aquí lo que se
   * comprueba es que la acción llega por el cable y que es de una vez por
   * vigilia. Escoger a dedo a un jugador ataría esta comprobación a qué don le
   * repartió la semilla, y cambiar el generador del puzle la habría puesto roja
   * sin que nada se hubiera roto.
   */
  const SOLITARIOS = ['descifrar', 'documentar', 'sobornar', 'excavar'];
  const invocador =
    Object.keys(trama.dones).find((id) => SOLITARIOS.includes(trama.dones[id]!)) ?? 'e2';
  const invoca = await accion(invocador, 'invocar');
  comprobar('invocar responde 200', invoca.estado === 200, invoca.datos);
  comprobar('y dice qué don se ha usado', typeof invoca.datos?.resultado?.don === 'string', invoca.datos);
  const repite = await accion(invocador, 'invocar');
  comprobar('el don es de una vez por vigilia', repite.estado === 409, repite.datos);
  v = await vista(invocador);
  comprobar('y la vista lo refleja', estadoDe(v).yo.donUsadoEstaVigilia === true);

  paso('Ofrendar un amuleto: nunca a uno mismo');
  /*
   * SE LO INTENTA DAR QUIEN TIENE MARCA, y no da igual quién. Con alguien sin
   * marcas, el 409 lo devolvería la regla de «no tiene ninguna marca que
   * quitarle» y esta comprobación pasaría con la del «ni a uno mismo» quitada.
   * Así estaba escrita, y se descubrió rompiendo el reductor a propósito.
   */
  const aMiMismo = await accion('e1', 'ofrendar', { aQuien: 'e1' });
  comprobar('darse un amuleto a uno mismo se rechaza', aMiMismo.estado === 409, aMiMismo.datos);
  comprobar(
    'y lo rechaza esa regla, no la de las marcas',
    String(aMiMismo.datos?.error ?? '').includes('en uno mismo'),
    aMiMismo.datos,
  );
  const sinMarcas = await accion('e3', 'ofrendar', { aQuien: 'e2' });
  comprobar('y gastarlo en quien no tiene marcas, también', sinMarcas.estado === 409, sinMarcas.datos);

  const aBruno = await accion('e3', 'ofrendar', { aQuien: 'e1' });
  comprobar('a quien sí tiene marca, se le da', aBruno.estado === 200, aBruno.datos);
  comprobar('le queda un amuleto', aBruno.datos?.resultado?.amuletos === 1, aBruno.datos?.resultado);
  comprobar('y a él no le queda marca', aBruno.datos?.resultado?.marcasDe === 0, aBruno.datos?.resultado);

  paso('Señalar al saqueador');
  const senala = await accion('e0', 'senalar', { saqueador: SAQUEADOR });
  comprobar('señalar responde 200', senala.estado === 200, senala.datos);
  comprobar('con hora del servidor', typeof senala.datos?.resultado?.at === 'string');
  comprobar(
    'y NO dice si has acertado: se sabrá al amanecer',
    !('correcta' in (senala.datos?.resultado ?? {})),
    senala.datos?.resultado,
  );

  paso('Proponer el orden del sellado');
  /*
   * SE COMPRUEBA LO QUE EL CONTRATO DECLARE, NO LO QUE HOY PASE.
   *
   * `proponer-orden` necesita una lista ordenada de cinco entidades, y `eligeDe`
   * solo sabía pedir una. Durante unas horas la propuesta no llegaba y aquí
   * había escrito «se rechaza», congelando la costura como si fuera la regla.
   * Eso es exactamente lo que una prueba no debe hacer: el día que el hueco se
   * tapara, se habría puesto roja sin que nada estuviera mal.
   *
   * Así que se mira el manifiesto y se exige la conducta que corresponda. Si
   * declara `eligeVarias`, la propuesta TIENE que llegar; si no, tiene que
   * rechazarse con su motivo y queda anotado como pendiente. Las dos ramas son
   * comprobaciones de verdad, y ninguna se cae sola cuando la otra llega.
   */
  const definicionPropuesta = manifiestoDe('momia').acciones.find((a) => a.id === 'proponer-orden');
  const porElCable = Boolean(definicionPropuesta?.eligeVarias?.length);

  if (porElCable) {
    const mal = await accion('e0', 'proponer-orden', { orden: trama.ordenVerdadero.slice(0, 4) });
    comprobar('una propuesta de cuatro ritos la para el motor', mal.estado === 409, mal.datos);
    const repes = await accion('e0', 'proponer-orden', {
      orden: [trama.ordenVerdadero[0], trama.ordenVerdadero[0], ...trama.ordenVerdadero.slice(1, 4)],
    });
    comprobar('y una con un rito repetido, también', repes.estado === 409, repes.datos);

    for (const id of ['e0', 'e1', 'e2']) {
      const r = await accion(id, 'proponer-orden', { orden: trama.ordenVerdadero });
      comprobar(`${id} entrega su propuesta`, r.estado === 200, r.datos);
    }
    const delSaqueadorProp = await accion(SAQUEADOR, 'proponer-orden', {
      orden: [...trama.ordenVerdadero].reverse(),
    });
    comprobar('y el saqueador la suya, torcida', delSaqueadorProp.estado === 200, delSaqueadorProp.datos);

    v = await vista('e0');
    comprobar(
      'cada cual ve la suya',
      estadoDe(v).yo.miPropuesta?.join('|') === trama.ordenVerdadero.join('|'),
      estadoDe(v).yo.miPropuesta,
    );
    comprobar(
      'y de los demás solo sabe QUE han propuesto, no QUÉ',
      estadoDe(v).mesa.every((m: any) => m.haPropuesto === true) &&
        !JSON.stringify(estadoDe(v).mesa).includes(trama.ordenVerdadero[0]!),
      estadoDe(v).mesa,
    );
    // Y con propuestas sobre la mesa, el orden verdadero sigue sin viajar.
    for (const id of Object.keys(testigos)) {
      const fugas = fugasEn(await vista(id), trama.ordenVerdadero, PROHIBIDAS).filter(
        // La propuesta PROPIA sí puede coincidir con el orden verdadero: quien
        // acierta tiene derecho a ver lo que escribió. Lo que no puede es
        // llegarle por ningún otro camino.
        (f) => !f.startsWith('vista.estadoDelJuego.yo.miPropuesta'),
      );
      comprobar(`ni con las propuestas entregadas se le filtra nada a ${id}`, fugas.length === 0, fugas);
    }
  } else {
    const propone = await accion('e0', 'proponer-orden', { orden: trama.ordenVerdadero });
    comprobar(
      'sin `eligeVarias` en el manifiesto, la propuesta no puede llegar',
      propone.estado === 409 && String(propone.datos?.error ?? '').includes('no ha llegado'),
      propone.datos,
    );
    pendientes.push(
      'el manifiesto de la Momia no declara `eligeVarias` para `proponer-orden`: ' +
        'el motor ya lo admite, pero mientras no se declare, el sellado no se puede ' +
        'entregar por el cable.',
    );
  }

  paso('Se cierra la vigilia y se abre la segunda');
  const cerrar = await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
  comprobar('cerrar la vigilia responde 200', cerrar.estado === 200, cerrar.datos);
  const abrir2 = await pedir(`/games/${game.id}/live/ronda/abrir`, {
    metodo: 'POST',
    cuerpo: { minutos: 10 },
  });
  comprobar('abrir la vigilia 2 responde 200', abrir2.estado === 200, abrir2.datos);
  v = await vista('e0');
  comprobar('estamos en la vigilia 2', v.sesion.round === 2, v.sesion.round);
  comprobar(
    'y la cámara profanada es otra',
    estadoDe(v).vigilia.profanada === trama.profanadas[1] &&
      trama.profanadas[1] !== trama.profanadas[0],
    { ahora: estadoDe(v).vigilia.profanada, antes: trama.profanadas[0] },
  );

  /*
   * EL SEGUNDO SEÑALAMIENTO SE PRUEBA EN LA VIGILIA 2, Y NO EN LA 1.
   *
   * `vecesPorTurno` del motor cuenta POR RONDA: reintentando en la misma vigilia
   * el 409 lo devolvería ese contador y no la regla que se quiere probar —una
   * por PARTIDA—. Así estaba escrita la prueba equivalente de CLUEDO al
   * principio, y pasaba igual de verde con la regla rota. En la vigilia 2 el
   * contador vuelve a cero, así que lo único que puede rechazar el segundo
   * señalamiento es que sea uno por partida.
   */
  const senalaOtraVez = await accion('e0', 'senalar', { saqueador: 'e1' });
  comprobar(
    'un señalamiento por PARTIDA, no por vigilia: en la vigilia 2 sigue sin poder',
    senalaOtraVez.estado === 409,
    senalaOtraVez.datos,
  );

  const exploraOtraVigilia = await accion('e0', 'explorar', { camara: limpia });
  comprobar(
    'pero explorar sí se renueva cada vigilia',
    exploraOtraVigilia.estado === 200,
    exploraOtraVigilia.datos,
  );

  paso('El desenlace: ahora sí se abre el papiro');
  await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
  const desenlace = await pedir(`/games/${game.id}/live/desenlace`, { metodo: 'POST' });
  comprobar(
    'se llega al desenlace directamente desde la vigilia cerrada',
    desenlace.estado === 200,
    desenlace.datos,
  );
  v = await vista('e0');
  comprobar('la partida está en desenlace', v.sesion.phase === 'desenlace');
  const final = estadoDe(v).desenlace;
  comprobar('y AHORA sí llega el orden verdadero', Array.isArray(final?.ordenVerdadero), final);
  comprobar(
    'con los ritos ya resueltos a nombre',
    final?.ordenVerdadero?.every((r: any) => typeof r.nombre === 'string' && r.nombre.length > 0),
    final?.ordenVerdadero,
  );
  comprobar(
    'y es el de verdad',
    final?.ordenVerdadero?.map((r: any) => r.id).join('|') === trama.ordenVerdadero.join('|'),
  );
  comprobar('se dice quién rompió el sello', final?.saqueadorId === SAQUEADOR, final?.saqueadorId);
  if (porElCable) {
    comprobar(
      'tres votaron el orden bueno contra uno: la tumba se sella',
      final?.correcto === true && final?.gana === 'expedicion',
      { correcto: final?.correcto, gana: final?.gana },
    );
    comprobar(
      'y gana la expedición entera menos el saqueador',
      final?.ganadores.slice().sort().join() === ['e0', 'e1', 'e2'].join(),
      final?.ganadores,
    );
    comprobar(
      'quienes propusieron el orden ejecutado se llevan El Sellador',
      (final?.trofeos?.e0 ?? []).includes('sellador'),
      final?.trofeos,
    );
  } else {
    comprobar(
      'nadie propuso nada, así que la tumba amanece abierta y gana el saqueador',
      final?.gana === 'saqueador' && final?.ganadores.join() === SAQUEADOR,
      { gana: final?.gana, ganadores: final?.ganadores },
    );
  }
  comprobar(
    'y quien señaló bien se lleva el Ojo de Horus',
    (final?.trofeos?.e0 ?? []).includes('ojo-de-horus'),
    final?.trofeos,
  );
  comprobar(
    porElCable
      ? 'y el saqueador NO se lleva La Sombra, porque la tumba se selló'
      : 'el saqueador se lleva La Sombra',
    (final?.trofeos?.[SAQUEADOR] ?? []).includes('sombra') !== porElCable,
    final?.trofeos,
  );
}

// ---------------------------------------------------------------------------
// ACTO II · el sellado, en proceso
// ---------------------------------------------------------------------------

function jugarElSellado(): void {
  paso('ACTO II · el sellado, llamando a las funciones (ver la cabecera)');

  const armar = (): { game: GameSession; sesion: LiveSession } => {
    const nueva = nuevaPartida();
    nueva.sesion.phase = 'ronda-abierta';
    nueva.sesion.round = 1;
    nueva.sesion.estado = {
      momia: estadoInicial(tramaDe(nueva.game.plot)!, nueva.sesion.players.map((p) => p.suspectId)),
    };
    return nueva;
  };

  // --- La propuesta ---
  const a = armar();
  const suTrama = tramaDe(a.game.plot)!;
  const ritos = a.game.entidades!.ritos!.map((r) => r.id);

  const rechaza = (que: string, fn: () => unknown): void => {
    let salto = false;
    try {
      fn();
    } catch {
      salto = true;
    }
    comprobar(que, salto);
  };

  /*
   * COMO `rechaza`, PERO EXIGIENDO EL PORQUÉ. Es la diferencia entre comprobar
   * una regla y comprobar que algo, lo que sea, ha fallado.
   *
   * No es teórico: dos comprobaciones de este fichero pasaban en verde con su
   * regla quitada. La de «un amuleto no se gasta en uno mismo» la rechazaba en
   * realidad la regla de «esa persona no tiene marcas», porque quien lo intentaba
   * no tenía ninguna. Y la de «solo el saqueador falsifica» la rechazaba «tu don
   * ya se ha usado esta vigilia». Las dos se descubrieron rompiendo el código a
   * propósito y viendo que no pasaba nada.
   */
  const rechazaPorque = (que: string, fn: () => unknown, motivo: string): void => {
    let mensaje = '';
    try {
      fn();
    } catch (e) {
      mensaje = e instanceof Error ? e.message : String(e);
    }
    comprobar(`${que} (y por eso, no por otra cosa)`, mensaje.includes(motivo), mensaje || '(no falló)');
  };

  rechaza('una propuesta de cuatro ritos se rechaza', () =>
    proponerOrden(a.game, a.sesion, 'e0', ritos.slice(0, 4)),
  );
  rechaza('una con un rito repetido, también', () =>
    proponerOrden(a.game, a.sesion, 'e0', [ritos[0]!, ritos[0]!, ritos[1]!, ritos[2]!, ritos[3]!]),
  );
  rechaza('y una que menciona un rito de otra partida', () =>
    proponerOrden(a.game, a.sesion, 'e0', [...ritos.slice(0, 4), 'inventado']),
  );

  const mia = proponerOrden(a.game, a.sesion, 'e0', suTrama.ordenVerdadero);
  comprobar('una propuesta completa se guarda', mia.orden.join('|') === suTrama.ordenVerdadero.join('|'));
  comprobar('con hora del servidor', typeof mia.at === 'string' && mia.at.length > 10);

  // --- La expedición sella la tumba ---
  const b = armar();
  const tramaB = tramaDe(b.game.plot)!;
  const correcto = tramaB.ordenVerdadero;
  const torcido = [...correcto].reverse();
  proponerOrden(b.game, b.sesion, 'e0', correcto);
  proponerOrden(b.game, b.sesion, 'e1', correcto);
  proponerOrden(b.game, b.sesion, 'e2', correcto);
  proponerOrden(b.game, b.sesion, 'e3', torcido);

  let sellado = selladoDe(b.game, b.sesion);
  comprobar('gana el orden más votado', sellado.ordenEjecutado.join('|') === correcto.join('|'), sellado.votos);
  comprobar('la tumba se sella', sellado.correcto === true);
  comprobar('y gana la expedición', sellado.gana === 'expedicion', sellado.gana);
  comprobar(
    'todos menos el saqueador',
    sellado.ganadores.slice().sort().join() === 'e0,e1,e2',
    sellado.ganadores,
  );

  // --- El empate: gana quien se mojó antes ---
  /*
   * LAS HORAS SE PONEN A MANO, Y HAY DOS RAZONES.
   *
   * La primera es que `proponerOrden` sella con `new Date()`, y cuatro llamadas
   * seguidas caen en el mismo milisegundo: el desempate quedaría a merced de
   * cómo ordene el motor de JavaScript, y la prueba sería intermitente.
   *
   * La segunda es la que de verdad importa. Las propuestas se recorren en el
   * orden en que se entregaron, así que si la entregada antes fuera además la
   * primera de la lista, la comprobación pasaría en verde CON EL DESEMPATE
   * QUITADO —el orden estable de la lista haría el trabajo—. Así estaba escrita
   * al principio. Para que el desempate sea lo único que decide, la que gana
   * tiene que ser la que va SEGUNDA en la lista y PRIMERA en el reloj.
   */
  const c = armar();
  const tramaC = tramaDe(c.game.plot)!;
  const bueno = tramaC.ordenVerdadero;
  const malo = [...bueno].reverse();
  const estadoC = c.sesion.estado!.momia as any;
  proponerOrden(c.game, c.sesion, 'e0', bueno);
  proponerOrden(c.game, c.sesion, 'e1', bueno);
  proponerOrden(c.game, c.sesion, 'e2', malo);
  proponerOrden(c.game, c.sesion, 'e3', malo);
  estadoC.propuestas.e0.at = '2026-03-01T23:00:00.000Z';
  estadoC.propuestas.e1.at = '2026-03-01T23:00:01.000Z';
  estadoC.propuestas.e2.at = '2026-03-01T22:00:00.000Z';
  estadoC.propuestas.e3.at = '2026-03-01T22:00:01.000Z';

  sellado = selladoDe(c.game, c.sesion);
  comprobar(
    'con empate a votos gana la propuesta entregada antes, no la primera de la lista',
    sellado.ordenEjecutado.join('|') === malo.join('|'),
    sellado.votos.map((v) => ({ apoyos: v.apoyos, at: v.at })),
  );
  comprobar('y aquí la que llegó antes era la equivocada', sellado.correcto === false);
  comprobar('así que gana el saqueador', sellado.gana === 'saqueador' && sellado.ganadores.join() === 'e3');

  // --- Estar tocado te quita la voz, no la silla ---
  /*
   * Se toca a los DOS que sostienen la propuesta ganadora del caso `b`. Si el
   * silencio no se aplicara, seguiría ganando la suya; al aplicarse, el sellado
   * pasa a ejecutar la del único que queda en pie, que es la equivocada. Y sigue
   * contando como propuesta entregada: no se le echa de la mesa, se le quita la
   * voz.
   */
  const estadoB = b.sesion.estado!.momia as any;
  for (const id of ['e0', 'e1', 'e2']) {
    estadoB.gente[id].marcas = MARCAS_PARA_TOCADO;
    estadoB.gente[id].tocado = true;
  }
  sellado = selladoDe(b.game, b.sesion);
  comprobar(
    'las propuestas de quien está tocado no cuentan',
    sellado.silenciadas.slice().sort().join() === 'e0,e1,e2',
    sellado.silenciadas,
  );
  comprobar(
    'y entonces se ejecuta la única que queda en pie, que era la equivocada',
    sellado.ordenEjecutado.join('|') === torcido.join('|') && sellado.correcto === false,
    sellado.ordenEjecutado,
  );
  comprobar('gana el saqueador', sellado.gana === 'saqueador' && sellado.ganadores.join() === 'e3');

  // --- Sin propuestas válidas, la tumba amanece abierta ---
  const sinNadie = selladoDe(armar().game, armar().sesion);
  comprobar(
    'sin una sola propuesta, la tumba no se sella',
    sinNadie.ordenEjecutado.length === 0 && sinNadie.correcto === false,
  );
  comprobar('y gana el saqueador', sinNadie.gana === 'saqueador');

  // --- Ejecutar deja el resultado escrito ---
  const d = armar();
  const tramaD = tramaDe(d.game.plot)!;
  proponerOrden(d.game, d.sesion, 'e0', tramaD.ordenVerdadero);
  const ejecutado = ejecutarSellado(d.game, d.sesion);
  comprobar('ejecutar el sellado lo deja escrito', ejecutado.correcto === true);
  const estadoD = d.sesion.estado!.momia as any;
  comprobar('en el estado de la partida', estadoD.sellado?.correcto === true, estadoD.sellado);
  proponerOrden(d.game, d.sesion, 'e1', [...tramaD.ordenVerdadero].reverse());
  proponerOrden(d.game, d.sesion, 'e2', [...tramaD.ordenVerdadero].reverse());
  comprobar(
    'y una propuesta posterior ya no lo cambia: la tumba se selló',
    selladoDe(d.game, d.sesion).correcto === true,
  );

  // --- Los amuletos ---
  paso('Los amuletos: la regla que obliga a hablar');
  const f = armar();
  const estadoF = f.sesion.estado!.momia as any;
  estadoF.gente.e1.marcas = 2;
  // Con marca propia: si la regla del «ni a uno mismo» desapareciera, esto
  // pasaría, que es exactamente lo que no puede ocurrir.
  estadoF.gente.e0.marcas = 1;
  rechazaPorque(
    'un amuleto no se gasta en uno mismo, ni teniendo marcas',
    () => ofrendarAmuleto(f.game, f.sesion, 'e0', 'e0'),
    'en uno mismo',
  );
  rechazaPorque(
    'ni en quien no tiene marcas',
    () => ofrendarAmuleto(f.game, f.sesion, 'e0', 'e2'),
    'ninguna marca',
  );
  estadoF.gente.e0.marcas = 0;
  const dado = ofrendarAmuleto(f.game, f.sesion, 'e0', 'e1');
  comprobar('a quien sí las tiene, se le da', dado.amuletos === 1 && dado.marcasDe === 1, dado);
  estadoF.gente.e1.marcas = 1;
  ofrendarAmuleto(f.game, f.sesion, 'e0', 'e1');
  comprobar('se pueden dar los dos', estadoF.gente.e0.amuletos === 0);
  estadoF.gente.e1.marcas = 1;
  rechaza('y no hay un tercero', () => ofrendarAmuleto(f.game, f.sesion, 'e0', 'e1'));

  // Tres marcas te dejan tocado; un amuleto te devuelve la voz.
  estadoF.gente.e2.marcas = MARCAS_PARA_TOCADO - 1;
  entrarEnCamara(f.game, f.sesion, 'e2', tramaDe(f.game.plot)!.profanadas[0]!);
  comprobar('a las tres marcas se queda tocado', estadoF.gente.e2.tocado === true, estadoF.gente.e2);
  ofrendarAmuleto(f.game, f.sesion, 'e1', 'e2');
  comprobar('y un amuleto le devuelve la voz', estadoF.gente.e2.tocado === false, estadoF.gente.e2);

  // --- Los trofeos ---
  const trofeos = trofeosDe(d.game, d.sesion, selladoDe(d.game, d.sesion));
  comprobar('quien propuso el orden ejecutado se lleva El Sellador', trofeos.e0!.includes('sellador'));
  comprobar('quien no lo propuso, no', !trofeos.e1!.includes('sellador'), trofeos.e1);
  comprobar('quien no se marcó se lleva Incorrupto', trofeos.e1!.includes('incorrupto'));

  // --- La regla de oro, también aquí ---
  const fugasFinales = fugasEn(vistaMomiaDe(d.game, d.sesion, 'e1'), tramaD.ordenVerdadero);
  comprobar(
    'con la partida en juego, la proyección sigue sin filtrar el orden',
    fugasFinales.length === 0,
    fugasFinales,
  );

  // --- Los dones, uno a uno ---
  paso('Los siete dones');
  const e = armar();
  const tramaE = tramaDe(e.game.plot)!;
  const estadoE = e.sesion.estado!.momia as any;

  estadoE.gente.e0.don = 'descifrar';
  const descifrado = invocarDon(e.game, e.sesion, 'e0');
  comprobar('descifrar entrega un fragmento nuevo', estadoE.gente.e0.fragmentos.length === 1);
  comprobar('y lo enseña solo a quien lo invocó', Boolean(descifrado.revelado));

  /*
   * NUNCA EL ÚLTIMO QUE FALTA. Es la puerta de atrás por la que se colaría un
   * epigrafista capaz de resolverlo en solitario: cuatro vigilias explorando más
   * cuatro descifrados bastarían para juntar el papiro entero, y la garantía 3
   * del puzle se caería sin que el generador tuviera culpa de nada.
   */
  estadoE.gente.e0.fragmentos = tramaE.restricciones.slice(0, -1).map((r) => r.id);
  estadoE.gente.e0.donUsadoEnRonda = undefined;
  rechaza('descifrar NUNCA entrega el fragmento que completaría el papiro', () =>
    invocarDon(e.game, e.sesion, 'e0'),
  );

  estadoE.gente.e1.don = 'sanar';
  estadoE.gente.e2.marcas = 2;
  const sanado = invocarDon(e.game, e.sesion, 'e1', { persona: 'e2' });
  comprobar('sanar quita una marca sin gastar amuleto', estadoE.gente.e2.marcas === 1);
  comprobar('y no toca los amuletos', estadoE.gente.e1.amuletos === 2, sanado);

  estadoE.gente.e2.don = 'proteger';
  invocarDon(e.game, e.sesion, 'e2', { persona: 'e2' });
  const conProteccion = entrarEnCamara(e.game, e.sesion, 'e2', tramaE.profanadas[0]!);
  comprobar(
    'a quien está protegido no le marca la cámara profanada',
    conProteccion.profanada === true && conProteccion.protegido === true && estadoE.gente.e2.marcas === 1,
    conProteccion,
  );

  /*
   * NO SE ENTRA DOS VECES EN LA MISMA CÁMARA, y hay que probarlo AQUÍ y no por
   * el cable. Por el cable, el segundo `explorar` lo para el `vecesPorTurno` del
   * motor antes de llegar al reductor, así que la guardia propia no llega a
   * ejercerse: se rompió a propósito y la velada seguía en verde. Donde sí
   * muerde es en el capataz, que entra una segunda vez la misma vigilia.
   */
  rechazaPorque(
    'no se puede volver a entrar en la cámara donde ya se estuvo esta vigilia',
    () => entrarEnCamara(e.game, e.sesion, 'e2', tramaE.profanadas[0]!),
    'Ya has estado',
  );


  estadoE.gente.e3.don = 'sobornar';
  const soborno = invocarDon(e.game, e.sesion, 'e3');
  comprobar(
    'sobornar dice qué cámara se profanará mañana',
    soborno.revelado === tramaE.profanadas[1],
    { dice: soborno.revelado, esperado: tramaE.profanadas[1] },
  );

  // Documentar y excavar, en una vigilia nueva para que el don se renueve.
  e.sesion.round = 2;
  estadoE.gente.e0.don = 'documentar';
  estadoE.gente.e0.fragmentos = [tramaE.restricciones[0]!.id];
  invocarDon(e.game, e.sesion, 'e0');
  comprobar(
    'documentar pone un fragmento tuyo sobre la mesa',
    estadoE.fragmentos[tramaE.restricciones[0]!.id].publico === true &&
      estadoE.fragmentos[tramaE.restricciones[0]!.id].publicadoPor === 'e0',
  );

  estadoE.gente.e1.don = 'excavar';
  const marcasAntes = estadoE.gente.e1.marcas;
  invocarDon(e.game, e.sesion, 'e1');
  comprobar(
    'excavar entra en otra cámara y cuesta una marca de más',
    estadoE.gente.e1.marcas === marcasAntes + 1,
    { antes: marcasAntes, ahora: estadoE.gente.e1.marcas },
  );

  // --- Falsificar: solo el saqueador ---
  paso('Falsificar: el don que rompe el supuesto de CLUEDO');
  /*
   * VIGILIA NUEVA ANTES DE PROBARLO. En la anterior, e0 ya había gastado su don,
   * así que el rechazo lo daba «tu don ya se ha usado esta vigilia» y la
   * comprobación pasaba con la regla del saqueador quitada. Aquí el don está
   * intacto y el mensaje exigido es el otro.
   */
  e.sesion.round = 3;
  rechazaPorque(
    'quien no rompió el sello no puede falsificar',
    () => invocarDon(e.game, e.sesion, 'e0', { don: 'falsificar' }),
    'no es tuyo',
  );
  const mentira = invocarDon(e.game, e.sesion, 'e3', { don: 'falsificar' });
  comprobar('el saqueador sí puede', mentira.don === 'falsificar', mentira);
  const publicada = estadoE.fragmentos[mentira.objetivo!];
  comprobar('la mentira nace pública, como un hallazgo cualquiera', publicada?.publico === true);
  comprobar('y marcada como falsa EN EL SERVIDOR', publicada?.falso === true);
  comprobar(
    'contradice el orden verdadero, que es lo que la hace mentira',
    Boolean(publicada) &&
      tramaE.falsasCandidatas.some((f) => f.id === publicada.id),
  );

  const laVeOtro = vistaMomiaDe(e.game, e.sesion, 'e0')!;
  const enLaMesa = laVeOtro.papiro.find((f) => f.id === publicada.id);
  comprobar('los demás la ven sobre la mesa', Boolean(enLaMesa), laVeOtro.papiro);
  comprobar(
    'con su frase, y SIN saber que es mentira',
    enLaMesa?.texto === publicada.texto && !('falso' in (enLaMesa ?? {})),
    enLaMesa,
  );
  comprobar(
    'saben quién la puso, que es lo único público de verdad',
    enLaMesa?.publicadoPor === 'e3',
  );
  comprobar(
    'y a quien no es el saqueador sigue sin llegarle nada del saqueo',
    laVeOtro.saqueo === undefined && !JSON.stringify(laVeOtro).includes('falsificar'),
  );

  // --- Y la mentira hace su trabajo ---
  const sinLaMentira = tramaE.restricciones.map((r) => r.restriccion);
  comprobar(
    'la mentira publicada hace irresoluble el papiro si se la cree entera',
    resolverSellado(estadoE, 'e3', ['e0', 'e1', 'e2', 'e3'], '2026-01-01T00:00:00.000Z')
      .ordenEjecutado.length === 0 && sinLaMentira.length > 0,
  );
}

// ---------------------------------------------------------------------------

try {
  /*
   * QUE EL ALTA SIGA EN SU SITIO, y se comprueba leyendo el fichero antes de
   * arrancar nada. Parece redundante —si faltara, la velada de abajo se caería
   * entera— y no lo es: el día que se caiga, el mensaje será «esta partida
   * todavía no sabe hacer eso» repetido treinta veces, y nadie sabrá que lo que
   * falta es una línea de import. Esto lo dice en un renglón, y lo dirá igual
   * para el tercer juego que entre.
   */
  const instalados = fs.readFileSync(INSTALADOS, 'utf8');
  for (const modulo of ['momia-acciones', 'momia-proyeccion', 'momia-sellado']) {
    comprobar(
      `juegos/instalados.ts da de alta \`${modulo}\``,
      instalados.includes(modulo),
    );
  }

  servidor = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
    },
    stdio: 'ignore',
  });

  await esperarServidor();
  await jugarPorElCable();
  jugarElSellado();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
} finally {
  servidor?.kill();
  await new Promise((r) => setTimeout(r, 600));
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    console.log(`  (queda por limpiar ${dir})`);
  }
}

console.log(`\nEl Misterio de la Momia · una velada entera`);
console.log(`${hechas} comprobaciones`);
if (pendientes.length > 0) {
  console.log(`\n${pendientes.length} cosas PENDIENTES fuera de este juego:\n`);
  for (const p of pendientes) console.log(`  ⚠ ${p}`);
}
if (fallos.length === 0) {
  console.log('\nLa velada funciona de punta a punta, y el orden verdadero no viaja.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
