/**
 * «LA LARGA»: EL MISMO RIBERAS, JUGADO EN TURNOS DE DÍAS.
 *
 *   npm run verify:larga
 *
 * ═══ QUÉ AFIRMA ESTE FICHERO, QUE NO ES LO QUE PARECE ═══
 *
 * No comprueba un juego. El §9 del diseño es explícito: La Larga «no es un juego
 * nuevo: es el MISMO manifiesto y el MISMO reductor con la mesa persistida, los
 * plazos en horas de reloj de pared en vez de en tics, y avisos al que le toca».
 * Lo que se mide aquí es si la DURACIÓN es una propiedad del motor o un dato de
 * la mesa — y la respuesta tiene consecuencias: «si La Larga necesita tocar
 * `shared/arcade/`, es que la fase 2 se escribió pensando en partidas de diez
 * minutos y hay que volver».
 *
 * Así que la primera comprobación de todas, y la que da sentido a las demás, es
 * que abrir una partida de VEINTICUATRO HORAS POR TURNO es exactamente la misma
 * petición que abrir una de treinta segundos con otro número dentro.
 *
 * ═══ EL RELOJ SE INYECTA, Y ESA ES LA DECISIÓN TÉCNICA DEL FICHERO ═══
 *
 * Una partida de tres días no se puede comprobar esperando tres días, y tampoco
 * vale comprobarla con plazos de dos segundos y decir que es lo mismo: lo que
 * falla a escala de días —cien vencimientos acumulados, un `rev` de la semana
 * pasada, una mesa que sobrevive a dos despliegues— no falla a escala de
 * segundos, que es justamente por qué La Larga es un juego-prueba y no una
 * variante.
 *
 * El servidor se levanta con un ENVOLTORIO que sustituye `Date.now` por «el de
 * verdad más un desplazamiento», y el desplazamiento lo escribe este proceso en
 * un fichero que el envoltorio relee cada poco. Saltar tres días cuesta escribir
 * un número.
 *
 * POR QUÉ ASÍ Y NO CON UNA COSTURA EN `mesas.ts`: porque una costura de reloj en
 * el código de producción es una costura que alguien puede dejar encendida, y
 * este repositorio ya tiene apuntado adónde lleva eso —las costuras de prueba de
 * OIDC necesitaron su propio comprobador de arranque para que no pudieran estar
 * activas en producción—. `verify:mesa` ya usa esta misma técnica del envoltorio
 * para instalar un arcade roto sin tocar el arranque, y por el mismo motivo: lo
 * que se comprueba es el servidor de verdad, no una imitación suya.
 *
 * Y LA VACUNA DEL RELOJ VA LA PRIMERA, antes que ninguna otra cosa. Si el
 * desplazamiento no llegara a la capa de mesa —un módulo cargado dos veces, un
 * `Date.now` capturado antes de tiempo— todo lo de abajo saldría verde sin haber
 * movido el tiempo ni un milisegundo: la mesa no vencería nada porque no ha
 * pasado nada, y este fichero felicitaría a todo el mundo. Es el mismo verde
 * falso que ya tiene apuntado esta casa dos veces, y aquí sería particularmente
 * fácil de creerse.
 *
 * ═══ LAS CINCO QUE EL ENCARGO PIDE, Y DÓNDE ESTÁ CADA UNA ═══
 *
 *  1. UNA MESA SOBREVIVE A QUE EL PROCESO MUERA, con turnos jugados antes Y
 *     después. Se mata a lo bruto, sin `SIGTERM`: lo que se comprueba es la
 *     escritura síncrona del §6 —«cuando el servidor contestó hecho, ya estaba
 *     guardado»— y no el volcado de la despedida, que es una red por debajo.
 *  2. UN `rev` DE HACE TRES DÍAS RESINCRONIZA y no se trata como error. Es el
 *     punto 4 de los que la fase 2 pagó por adelantado: alguien que volvió del
 *     trabajo, no un móvil manipulado.
 *  3. EL PLAZO VENCE POR LA LECTURA DE OTRO JUGADOR cuando el que tiene el turno
 *     no aparece, y el turno pasa. Es el §5.4 entero, medido a escala de horas.
 *  4. QUIEN CIERRA LA APP SIGUE EN LA PARTIDA. Presencia y participación no son
 *     lo mismo, y aquí se ve con tres días de por medio: el ausente deja de estar
 *     «presente», sigue en los asientos, le sigue tocando, y al volver juega.
 *  5. Y EL QUE DE VERDAD ASUSTA: NADIE MIRA DURANTE DÍAS. Con un plazo de una
 *     hora y tres días de ausencia hay setenta y dos vencimientos posibles. La
 *     fase 2 decidió reprogramar desde AHORA en vez de desde donde vencía, así
 *     que al volver tiene que haberse perdido UN turno y no setenta y dos. Aquí
 *     se comprueba que esa decisión es cierta y no un comentario.
 *
 * ═══ Y UNA SEXTA, QUE ES LA QUE ESTA FASE AÑADE ═══
 *
 *  6. A QUIÉN LE TOCA Y DESDE CUÁNDO, LEGIBLE POR HTTP. El §12 deja las
 *     notificaciones push FUERA DE ALCANCE y siguen estándolo: aquí no se manda
 *     ningún aviso a ningún sitio. Lo que se comprueba es que el servidor sabría
 *     contestar las dos únicas preguntas de las que colgaría uno, porque sin eso
 *     el aviso no se puede escribir nunca — ni por esta casa ni por nadie que
 *     monte este motor.
 *
 * ═══ LO QUE ESTE COMPROBADOR NO HACE, DICHO ANTES DE QUE ALGUIEN SE FÍE ═══
 *
 * No comprueba que Riberas esté bien: eso es `verify:riberas`, y si Riberas
 * estuviera roto esto se caería por otro sitio. No comprueba la información
 * oculta: eso es `verify:mesa`, que contrasta lo que viajó por el cable contra
 * las manos de los cuatro. Y no comprueba el volcado de `SIGTERM`, por lo mismo
 * que `verify:mesa` lo comprueba aparte: Windows no entrega la señal, así que
 * aquí sería verde por el motivo equivocado.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonico } from '../../shared/mecanicas/canonico';
import { turnoDeLaVista } from '../../shared/mecanicas/turno-declarado';
import { arcadesInstalados, ESPECTADOR, vistaDeAsiento } from '../../shared/arcade';
import type { ManifiestoDeArcade } from '../../shared/arcade';
/*
 * EL ALTA DE LOS ARCADES, ESTÁTICA Y LA PRIMERA, por lo mismo que en
 * `verify:mesa`: parte de este fichero pregunta al registro —qué juegos hay
 * instalados y qué proyectan— y con un `await import(...)` a mitad de fichero esas
 * preguntas se contestarían sobre un registro vacío. Saldrían verdes por no tener
 * nada que mirar.
 */
import '../../shared/arcade/juegos';
import {
  EMPEZAR_RIBERAS,
  OFRECER,
  opcionesDeRiberas,
  RECHAZAR,
  RIBERAS,
} from '../../shared/arcade/juegos';
import type { Opcion, VistaDeRiberas } from '../../shared/arcade/juegos';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');

/** Un día en milisegundos, escrito una vez. Toda esta fase se mide en éstos. */
const DIA = 24 * 60 * 60_000;
const HORA = 60 * 60_000;

/** El plazo de la partida larga: veinticuatro horas por turno. */
const PLAZO_DE_UN_DIA_S = 24 * 60 * 60;

// ---------------------------------------------------------------------------
// El armazón
// ---------------------------------------------------------------------------

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola =
    detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 600)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * UN PUERTO QUE EL SISTEMA DICE QUE ESTÁ LIBRE, y no uno elegido al azar.
 *
 * La misma razón que en `verify:mesa`, y aquí pesa más: este fichero levanta el
 * servidor DOS veces —antes y después de matarlo— y la batería entera corre en
 * paralelo con otros comprobadores que también levantan servidores. Un rango al
 * azar produce rojos intermitentes sin relación con lo que se ha tocado, que es la
 * peor clase de rojo: enseña a volver a correr la batería en vez de a leerla.
 */
async function puertoLibre(): Promise<number> {
  const { createServer } = await import('node:net');
  return new Promise<number>((resolver, rechazar) => {
    const sonda = createServer();
    sonda.once('error', rechazar);
    sonda.listen(0, '127.0.0.1', () => {
      const donde = sonda.address();
      const puerto = typeof donde === 'object' && donde !== null ? donde.port : 0;
      sonda.close(() => resolver(puerto));
    });
  });
}

const PUERTO = await puertoLibre();
const BASE = `http://127.0.0.1:${PUERTO}/api`;

interface Respuesta {
  estado: number;
  datos: any;
}

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; llave?: string | null } = {},
): Promise<Respuesta> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.llave ? { 'x-asiento': opciones.llave } : {}),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = texto;
  }
  return { estado: r.status, datos };
}

// ---------------------------------------------------------------------------
// EL RELOJ INYECTADO
// ---------------------------------------------------------------------------

const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), 'larga-'));
const MESAS = path.join(CARPETA, 'mesas');
const FICHERO_DEL_RELOJ = path.join(CARPETA, 'desplazamiento.txt');
const ENVOLTORIO = path.join(CARPETA, 'arranque-con-reloj.mts');

/** Cuánto se ha adelantado el reloj del servidor, acumulado, en ms. */
let desplazamiento = 0;

fs.writeFileSync(FICHERO_DEL_RELOJ, '0', 'utf8');

/**
 * EL ENVOLTORIO QUE ADELANTA EL RELOJ DEL SERVIDOR.
 *
 * ═══ POR QUÉ SUSTITUYE `Date.now` Y NO UNA FUNCIÓN NUESTRA ═══
 *
 * Porque la capa de mesa mide el tiempo con `Date.now()` y punto: los plazos, la
 * antigüedad del turno, el barrido de mesas viejas y los despertadores del canal.
 * Sustituyendo ahí se adelanta el reloj de TODO lo que decide algo con la hora, sin
 * que ninguno de esos ficheros tenga que saber que existe una prueba.
 *
 * ═══ POR QUÉ EL DESPLAZAMIENTO SE RELEE DE UN FICHERO ═══
 *
 * Porque el que manda es este proceso y el que obedece es otro. Podría pasarse por
 * una variable de entorno, y entonces sería fijo: para saltar tres días habría que
 * levantar un servidor nuevo, o sea que no se podría comprobar lo único que
 * importa —una mesa VIVA a la que le pasan tres días por encima—. Un fichero y una
 * relectura cada veinticinco milisegundos es todo lo que hace falta.
 *
 * El `real` se captura ANTES de sustituir nada. Sin eso, la segunda lectura del
 * fichero llamaría a la función ya sustituida y el desplazamiento se aplicaría dos
 * veces: el reloj del servidor se iría acelerando solo, que es un fallo que sale
 * verde en las comprobaciones de «ha pasado tiempo» y rojo en todas las demás sin
 * que se entienda por qué.
 */
fs.writeFileSync(
  ENVOLTORIO,
  `import fs from 'node:fs';

const real = Date.now.bind(Date);
let desplazamiento = 0;

function releer() {
  try {
    const n = Number(fs.readFileSync(${JSON.stringify(FICHERO_DEL_RELOJ)}, 'utf8').trim());
    if (Number.isFinite(n)) desplazamiento = n;
  } catch {
    /* todavía no está escrito: se queda con el que había */
  }
}

releer();
const latido = setInterval(releer, 25);
latido.unref?.();

Date.now = () => real() + desplazamiento;

await import(${JSON.stringify(pathToFileURL(SERVIDOR).href)});
`,
  'utf8',
);

/**
 * ADELANTA EL RELOJ DEL SERVIDOR y espera a que se entere.
 *
 * La espera es de reloj de PARED de verdad —este proceso no está adelantado— y son
 * ciento cincuenta milisegundos para un latido de veinticinco: de sobra, y sin
 * depender de que el sistema operativo despierte el temporizador a tiempo. Un
 * comprobador que se juegue el veredicto a la precisión de un `setInterval` es un
 * comprobador que falla una vez de cada treinta y enseña a reintentarlo.
 */
async function saltar(ms: number): Promise<void> {
  desplazamiento += ms;
  fs.writeFileSync(FICHERO_DEL_RELOJ, String(desplazamiento), 'utf8');
  await dormir(150);
}

// ---------------------------------------------------------------------------
// Levantar y matar
// ---------------------------------------------------------------------------

let loQueDijoElServidor = '';
let servidor: ChildProcess | undefined;

function levantar(): ChildProcess {
  const proceso = spawn(process.execPath, [TSX, ENVOLTORIO], {
    cwd: CARPETA,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
      /*
       * `MESAS_DIR` se pone A PROPÓSITO y no se deja caer al valor por defecto.
       * Los dos despliegues documentados borran la carpeta de por defecto, así que
       * una partida de tres días que dependiera de ella no sobreviviría al primer
       * despliegue — y este fichero existe justamente para afirmar lo contrario. Se
       * comprueba usando la variable, que es como va a estar en producción.
       */
      MESAS_DIR: MESAS,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  loQueDijoElServidor = '';
  const anotar = (d: Buffer): void => {
    loQueDijoElServidor += d.toString();
  };
  proceso.stdout?.on('data', anotar);
  proceso.stderr?.on('data', anotar);
  return proceso;
}

async function esperarAlServidor(): Promise<void> {
  for (let i = 0; i < 200; i++) {
    try {
      const r = await fetch(`${BASE}/salud`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await dormir(250);
  }
  throw new Error(
    `el servidor no arrancó en el puerto ${PUERTO}. Dijo:\n${loQueDijoElServidor.slice(-1500)}`,
  );
}

/** Espera a que un proceso muera de verdad. En Windows no es instantáneo. */
function esperarAQueMuera(proceso: ChildProcess): Promise<void> {
  return new Promise((resolver) => {
    if (proceso.exitCode !== null || proceso.signalCode !== null) {
      resolver();
      return;
    }
    proceso.once('exit', () => resolver());
  });
}

// ---------------------------------------------------------------------------
// Jugar a Riberas sin saber jugar a Riberas
// ---------------------------------------------------------------------------

interface Sentado {
  nombre: string;
  asiento: string;
  llave: string;
}

/**
 * LEE LA MESA SIN APARCARSE.
 *
 * `?desde=-1` no es nunca la revisión de la mesa, así que la lectura contesta en
 * el acto en vez de quedarse veinticinco segundos en el sondeo largo. Es el mismo
 * truco que usa la app al recuperar un asiento del bolsillo, y aquí no es una
 * comodidad: sin él, cada una de las lecturas de este fichero costaría
 * veinticinco segundos y el comprobador tardaría media hora.
 *
 * Y sigue siendo una lectura de verdad para lo que aquí importa: pasa por `mirar`,
 * bajo el candado, evaluando el plazo. Que es exactamente lo que se está midiendo.
 */
async function leerLaMesa(codigo: string, llave: string | null): Promise<Respuesta> {
  return pedir(`/arcade/mesas/${codigo}?desde=-1`, { llave });
}

/** Abre una mesa de Riberas con el plazo que se le diga y sienta a los dos. */
async function mesaLarga(plazoSegundos: number): Promise<{ codigo: string; gente: Sentado[] }> {
  const abierta = await pedir('/arcade/mesas', {
    metodo: 'POST',
    cuerpo: { arcade: RIBERAS, nombre: 'Ana', plazoSegundos },
  });
  comprobar(
    `abrir una mesa de Riberas con plazo de ${String(plazoSegundos)} s devuelve 201`,
    abierta.estado === 201,
    abierta.datos,
  );
  const codigo = String(abierta.datos?.codigo ?? '');
  const gente: Sentado[] = [
    { nombre: 'Ana', asiento: abierta.datos?.asiento, llave: abierta.datos?.llave },
  ];
  const segunda = await pedir(`/arcade/mesas/${codigo}/asientos`, {
    metodo: 'POST',
    cuerpo: { nombre: 'Bruno' },
  });
  comprobar('y el segundo se sienta con el código', segunda.estado === 200, segunda.datos);
  gente.push({ nombre: 'Bruno', asiento: segunda.datos?.asiento, llave: segunda.datos?.llave });
  return { codigo, gente };
}

/** La vista de Riberas tal y como le llega a un asiento. */
async function vistaDe(codigo: string, quien: Sentado): Promise<VistaDeRiberas> {
  const r = await leerLaMesa(codigo, quien.llave);
  return r.datos?.mesa?.vista as VistaDeRiberas;
}

/**
 * JUEGA UN MOVIMIENTO, EL PRIMERO QUE EL JUEGO OFRECE A QUIEN LE TOCA.
 *
 * ═══ POR QUÉ SE PREGUNTA A `opciones()` Y NO SE ESCRIBEN LOS MOVIMIENTOS ═══
 *
 * Porque este fichero no es de Riberas y no tiene por qué saber que existe una
 * choza. Escribir aquí `riberas:fundar` con un vértice dentro sería meter las
 * reglas del juego en el comprobador de la duración, y entonces cualquier cambio
 * en la colocación pondría rojo un fichero que no habla de eso.
 *
 * `opciones()` recibe LA VISTA y jamás el estado (§5 bis), y la vista es
 * exactamente lo que este proceso recibe por el cable. O sea que esto juega como
 * jugaría la app: leyendo lo que hay y eligiendo entre lo que se le ofrece.
 *
 * Devuelve a quién le tocaba, o `null` si no había nada que hacer.
 */
async function jugarUnPaso(codigo: string, gente: Sentado[]): Promise<string | null> {
  const primera = await leerLaMesa(codigo, gente[0]!.llave);
  const mesa = primera.datos?.mesa;
  if (mesa === undefined) return null;

  const turno = turnoDeLaVista(mesa.vista);
  /*
   * Mientras la mesa se REÚNE no le toca a nadie —`turnoDe` es `null`— y lo único
   * que se puede hacer es repartir. Lo hace el primero, que es quien abrió.
   */
  const quien =
    turno.declarado && turno.de !== null
      ? gente.find((g) => g.asiento === turno.de)
      : gente[0];
  if (quien === undefined) return null;

  const suya = quien === gente[0] ? mesa.vista : await vistaDe(codigo, quien);
  const opciones = opcionesDeRiberas(suya, quien.asiento) as readonly Opcion[];
  const elegida = opciones[0];
  if (elegida === undefined) return null;

  const r = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
    metodo: 'POST',
    llave: quien.llave,
    cuerpo: { rev: mesa.rev, tipo: elegida.tipo, carga: elegida.carga },
  });
  if (r.estado !== 200) return null;
  return quien.asiento;
}

/** Juega hasta `cuantos` pasos. Devuelve cuántos entraron de verdad. */
async function jugarPasos(codigo: string, gente: Sentado[], cuantos: number): Promise<number> {
  let dados = 0;
  for (let i = 0; i < cuantos; i++) {
    const quien = await jugarUnPaso(codigo, gente);
    if (quien === null) break;
    dados++;
  }
  return dados;
}

/**
 * JUEGA HASTA QUE LA PARTIDA LLEGUE A UN MOMENTO, y dice si llegó.
 *
 * ═══ POR QUÉ HACE FALTA, Y ES UNA COSA QUE ESTE FICHERO APRENDIÓ ROJO ═══
 *
 * Porque «que venza el plazo» significa cosas distintas según el momento, y eso lo
 * decide el JUEGO y no la mesa — que es exactamente el reparto del §5.4: la mesa
 * sabe cuándo se acaba y el juego sabe qué significa que se acabe. En Riberas,
 * durante la colocación vencer significa «se coloca por ti» y el turno NO pasa,
 * porque saltarse un paso de la serpentina dejaría menos chozas de las que la
 * partida cuenta y la colocación no acabaría nunca. Sólo en `jugando` vencer
 * significa que el turno pasa.
 *
 * La primera versión de este comprobador hacía vencer el plazo en la colocación y
 * exigía que el turno pasara. Se puso roja con razón: estaba afirmando una regla de
 * la mesa sobre un momento en el que el juego decidió otra cosa. Así que para medir
 * «el turno pasa» hay que llevar la partida hasta donde eso significa algo.
 */
async function jugarHasta(
  codigo: string,
  gente: Sentado[],
  momento: string,
  tope: number,
): Promise<boolean> {
  for (let i = 0; i < tope; i++) {
    const v = await vistaDe(codigo, gente[0]!);
    if (v.momento === momento) return true;
    if ((await jugarUnPaso(codigo, gente)) === null) return false;
  }
  return (await vistaDe(codigo, gente[0]!)).momento === momento;
}

// ===========================================================================
// PRIMERA PARTE · EN PROCESO: LA CONVENCIÓN DEL TURNO
//
// Va antes de levantar nada porque es lo que hace posible todo lo demás, y
// porque una vacuna que necesite un servidor es una vacuna que nadie corre.
// ===========================================================================

paso('«A quién le toca» se lee de la VISTA, que es lo que el juego publica');

{
  /*
   * ═══ LOS TRES CASOS, Y LA TRAMPA ESTÁ EN DISTINGUIR LOS DOS PRIMEROS ═══
   *
   * «No lo declara» y «no le toca a nadie» son cosas distintas: la primera dice
   * que este juego no tiene turnos —o que su vista cambió de forma—, la segunda
   * que la mesa se está reuniendo o la partida acabó. Confundirlas convierte un
   * juego cuya vista cambió en una mesa que parece parada para siempre, sin un
   * solo error en ningún sitio.
   */
  const declarado = turnoDeLaVista({ turnoDe: 'aXYZ' });
  comprobar(
    'una vista que declara turno se lee y trae el asiento',
    declarado.declarado && declarado.de === 'aXYZ',
    declarado,
  );

  const deNadie = turnoDeLaVista({ turnoDe: null });
  comprobar(
    'una vista que dice «no le toca a nadie» se distingue de una que no lo declara',
    deNadie.declarado && deNadie.de === null,
    deNadie,
  );

  comprobar(
    'una vista sin el campo NO se cuenta como «no le toca a nadie»',
    !turnoDeLaVista({ momento: 'jugando' }).declarado,
  );

  /*
   * LA VACUNA DE LOS VALORES RAROS. Un número o una cadena vacía en `turnoDe` no
   * es un asiento: creérselo produciría un aviso dirigido a nadie, o una pantalla
   * que dice «le toca a » con el hueco vacío. Se descartan a propósito.
   */
  comprobar('un `turnoDe` que no es cadena se descarta', !turnoDeLaVista({ turnoDe: 7 }).declarado);
  comprobar('una cadena vacía se descarta', !turnoDeLaVista({ turnoDe: '' }).declarado);
  comprobar('y lo que no es un objeto se descarta', !turnoDeLaVista(null).declarado);
}

paso('Y los arcades por turnos que HAY instalados la cumplen, derivados del registro');

{
  /*
   * ═══ SE PREGUNTA AL REGISTRO Y NO A UNA LISTA ESCRITA A MANO ═══
   *
   * Con una lista, esto protegería a los juegos que ya existen y a ninguno de los
   * que vengan — que son justamente los que nadie ha revisado todavía. Con el
   * registro, el quinto juego por turnos que alguien instale entra solo aquí.
   *
   * Y la afirmación es sobre los que TIENEN turnos: `sede: 'servidor'` y `tickHz:
   * 0`, que es la definición de «mesa por turnos» del §6. Un arcade de dispositivo
   * o uno con reloj propio no tiene por qué declarar nada, y exigírselo convertiría
   * esta comprobación en una regla de plataforma que el §5.3 prohíbe: «en cuanto el
   * motor sabe qué es un turno, el primer juego rico decide qué forma tiene».
   *
   * ═══ Y POR ESO NO SE EXIGE UNO A UNO, QUE ES LO QUE HACÍA ESTE BLOQUE ═══
   *
   * Aquí había un `comprobar(«fulano declara de quién es el turno»)` DENTRO del
   * bucle, o sea la misma regla de plataforma que el párrafo de arriba dice estar
   * evitando, escrita dos líneas más abajo. La consecuencia era concreta: alguien
   * instala un quinto arcade por turnos cuya vista no publica `turnoDe` —lo que la
   * cabecera de `turno-declarado.ts` declara legítimo con todas las letras: «un
   * tercero que se escribiera sin `turnoDe` no rompería nada»— y `npm run
   * verificar` se pone rojo sin que ese juego haya hecho nada mal. La obligación
   * se habría colado en la batería en vez de en `shared/arcade/`, que es peor:
   * deja el diff del núcleo vacío y la regla puesta igual.
   *
   * Lo que sí se afirma, y sigue siendo una red de verdad:
   *
   *   · QUE HAY AL MENOS DOS QUE LO DECLARAN. Si La Ronda o Riberas dejaran de
   *     publicar `turnoDe`, el aviso de La Larga se quedaría sin la mitad de su
   *     pregunta y esto se pondría rojo. Es la regresión que importa.
   *   · QUE LO QUE DECLARAN VALE. Un `turnoDe` presente pero con basura dentro es
   *     peor que ausente, porque produce un aviso dirigido a nadie.
   *
   * Y de los que NO lo declaran se deja constancia sin poner nada rojo: no hay a
   * quién avisar en ellos, que es uno de los tres casos que el tipo separa a
   * propósito.
   */
  const porTurnos = arcadesInstalados().filter(
    (m: ManifiestoDeArcade) => m.sede === 'servidor' && m.tickHz === 0,
  );
  comprobar('hay arcades por turnos instalados que mirar', porTurnos.length >= 2, porTurnos.map((m) => m.id));

  const declaran: string[] = [];
  const callan: string[] = [];
  for (const m of porTurnos) {
    /*
     * Se proyecta para el ESPECTADOR y sobre una partida SIN EMPEZAR —`undefined`,
     * que es como nace una mesa—, porque son las dos condiciones en las que esto
     * tiene que funcionar igual: quien va a escribir un aviso no tiene asiento, y
     * una mesa recién abierta es exactamente la que lleva días esperando a alguien.
     */
    const vista = vistaDeAsiento(m.id, undefined, ESPECTADOR);
    const turno = turnoDeLaVista(vista);
    if (!turno.declarado) {
      callan.push(m.id);
      continue;
    }
    declaran.push(m.id);
    comprobar(
      `y lo que «${m.nombre}» declara es un asiento o nadie, no basura`,
      turno.de === null || (typeof turno.de === 'string' && turno.de.length > 0),
      { arcade: m.id, turno },
    );
  }

  comprobar(
    'al menos dos arcades por turnos declaran de quién es el turno en su vista',
    declaran.length >= 2,
    { declaran, callan },
  );
  if (callan.length > 0) {
    console.log(
      `  · no lo declaran, y es legítimo —no hay a quién avisar en ellos—: ${callan.join(', ')}`,
    );
  }
}

// ===========================================================================
// SEGUNDA PARTE · CON EL SERVIDOR LEVANTADO Y EL RELOJ EN LA MANO
// ===========================================================================

try {
  servidor = levantar();
  await esperarAlServidor();

  // ── La vacuna del reloj, LA PRIMERA ──────────────────────────────────────
  paso('El reloj inyectado llega de verdad a la capa de mesa');

  let mesaDeLaVacuna: { codigo: string; gente: Sentado[] };
  {
    mesaDeLaVacuna = await mesaLarga(PLAZO_DE_UN_DIA_S);
    const antes = await pedir(`/arcade/mesas/${mesaDeLaVacuna.codigo}/turno`);
    comprobar('la ruta del turno contesta', antes.estado === 200, antes.datos);

    await saltar(3 * HORA);
    const despues = await pedir(`/arcade/mesas/${mesaDeLaVacuna.codigo}/turno`);

    /*
     * ═══ SIN ESTO, TODO LO DE ABAJO SERÍA VERDE POR NO HABER PASADO NADA ═══
     *
     * Si el desplazamiento no llegara a la capa de mesa, ninguna de las
     * comprobaciones de vencimiento fallaría: no vencería nada porque no habría
     * pasado tiempo, y las que miran «se ha perdido un turno y no setenta y dos»
     * verían cero turnos perdidos, que también es «no son setenta y dos». Es el
     * verde falso perfecto y por eso esta comprobación va antes que ninguna otra.
     *
     * Se mide con MARGEN y no con igualdad: entre escribir el fichero y contestar
     * la petición pasan milisegundos de verdad, y un comprobador que exija que el
     * reloj cuadre al milisegundo falla por sí solo cada pocas ejecuciones.
     */
    const creció = (despues.datos.esperandoMs as number) - (antes.datos.esperandoMs as number);
    comprobar(
      'adelantar el reloj tres horas se ve en «cuánto lleva esperándose»',
      Math.abs(creció - 3 * HORA) < 30_000,
      { antes: antes.datos.esperandoMs, despues: despues.datos.esperandoMs, creció },
    );
    comprobar(
      'y se ve en lo que queda de plazo, que baja lo mismo',
      Math.abs((antes.datos.quedanMs as number) - (despues.datos.quedanMs as number) - 3 * HORA) <
        30_000,
      { antes: antes.datos.quedanMs, despues: despues.datos.quedanMs },
    );
  }

  // ── 1 · UNA PARTIDA DE DÍAS ES CONFIGURACIÓN ─────────────────────────────
  paso('Una partida de veinticuatro horas por turno es la misma petición con otro número');

  {
    const mesa = await leerLaMesa(mesaDeLaVacuna.codigo, mesaDeLaVacuna.gente[0]!.llave);
    comprobar('la mesa larga se lee como cualquier otra', mesa.estado === 200, mesa.datos);
    /*
     * El plazo son veinticuatro horas MENOS las tres que se acaban de saltar. Que
     * el número salga bien después de un salto es la mitad de la afirmación: un
     * plazo de un día no es un caso especial, es el mismo `venceEn` absoluto que el
     * de treinta segundos con otro número dentro.
     */
    const quedan = (mesa.datos.mesa.venceEn as number) - Date.now() - desplazamiento;
    comprobar(
      'y su plazo es de un día de reloj de pared, menos lo que ya ha corrido',
      Math.abs(quedan - (DIA - 3 * HORA)) < 60_000,
      { venceEn: mesa.datos.mesa.venceEn, quedan },
    );
    comprobar(
      'el vencimiento viaja como INSTANTE ABSOLUTO y no como cuenta atrás',
      typeof mesa.datos.mesa.venceEn === 'number' && mesa.datos.mesa.venceEn > Date.now(),
      mesa.datos.mesa.venceEn,
    );
    comprobar(
      'y la mesa trae desde cuándo se está esperando al que tiene el turno',
      typeof mesa.datos.mesa.turnoDesde === 'number' && Number.isFinite(mesa.datos.mesa.turnoDesde),
      mesa.datos.mesa.turnoDesde,
    );

    /*
     * Y UN PLAZO MÁS LARGO QUE EL TOPE SE RECHAZA EN LA PETICIÓN QUE ABRE. Sin
     * tope, `plazoSegundos: 1e18` da una mesa que no vence nunca y que se queda
     * quieta para siempre sin que nada falle — la clase de fallo mudo que esta casa
     * tiene apuntada media docena de veces.
     */
    const demasiado = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: RIBERAS, nombre: 'Ana', plazoSegundos: 30 * 24 * 60 * 60 },
    });
    comprobar('un plazo de treinta días se rechaza al abrir', demasiado.estado === 400, demasiado.datos);
  }

  // ── 6 · A QUIÉN LE TOCA Y DESDE CUÁNDO ───────────────────────────────────
  paso('A quién le toca y desde cuándo, legible por HTTP y sin credencial');

  {
    const { codigo, gente } = mesaDeLaVacuna;

    /*
     * MIENTRAS LA MESA SE REÚNE, EL TURNO SE DECLARA Y NO ES DE NADIE. Los dos
     * datos son ciertos y distintos, y aquí se ve la diferencia que la convención
     * existe para conservar: hay turnos en este juego, pero ahora mismo no le toca
     * a nadie porque no se ha repartido.
     */
    const reuniendo = await pedir(`/arcade/mesas/${codigo}/turno`);
    comprobar('se sirve SIN llave de asiento', reuniendo.estado === 200, reuniendo.datos);
    comprobar('y dice que este juego SÍ declara turnos', reuniendo.datos.declaraTurno === true);
    comprobar(
      'mientras se reúne no le toca a nadie, y eso no es «no lo declara»',
      reuniendo.datos.turnoDe === null,
      reuniendo.datos,
    );

    /*
     * SENTARSE NO EMPIEZA UN TURNO NUEVO, y ésta es la comprobación que justifica
     * que `turnoDesde` sea un campo propio en vez de `ultimoToqueEn`. En una mesa de
     * La Larga la gente va llegando a lo largo del día; si cada uno que llega
     * reiniciara la cuenta, «cuánto lleva esperándose» —el número entero del que
     * cuelga el aviso— no significaría nada.
     */
    const antesDeSentarse = reuniendo.datos.turnoDesde as number;
    await pedir(`/arcade/mesas/${codigo}/asientos`, {
      metodo: 'POST',
      cuerpo: { nombre: 'Carla' },
    });
    const trasSentarse = await pedir(`/arcade/mesas/${codigo}/turno`);
    comprobar(
      'que llegue alguien a la mesa NO reinicia «desde cuándo se espera»',
      trasSentarse.datos.turnoDesde === antesDeSentarse,
      { antes: antesDeSentarse, despues: trasSentarse.datos.turnoDesde },
    );

    // Se reparte y ya hay alguien a quien le toca.
    const arranque = await leerLaMesa(codigo, gente[0]!.llave);
    await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: gente[0]!.llave,
      cuerpo: { rev: arranque.datos.mesa.rev, tipo: EMPEZAR_RIBERAS, carga: {} },
    });

    const jugando = await pedir(`/arcade/mesas/${codigo}/turno`);
    const vista = await vistaDe(codigo, gente[0]!);
    comprobar(
      'repartido el delta, la ruta dice a quién le toca',
      typeof jugando.datos.turnoDe === 'string' && jugando.datos.turnoDe.length > 0,
      jugando.datos,
    );
    /*
     * LO QUE DICE LA RUTA ES LO MISMO QUE VE EL JUGADOR. Si fueran dos caminos
     * distintos, el aviso podría decir «te toca a ti» a quien la pantalla no le
     * ofrece nada — y nadie relacionaría jamás las dos cosas.
     */
    comprobar(
      'y es exactamente el mismo asiento que ve quien juega en su vista',
      jugando.datos.turnoDe === vista.turnoDe,
      { ruta: jugando.datos.turnoDe, vista: vista.turnoDe },
    );
    comprobar(
      'con el nombre tecleado al lado, para que el aviso no necesite otro viaje',
      jugando.datos.nombre ===
        (await leerLaMesa(codigo, null)).datos.mesa.asientos.find(
          (a: { id: string }) => a.id === jugando.datos.turnoDe,
        )?.nombre,
      jugando.datos,
    );
    comprobar(
      'repartir empieza un turno nuevo: la cuenta de la espera se reinicia',
      (jugando.datos.esperandoMs as number) < 60_000,
      jugando.datos,
    );
    comprobar(
      'y se dice si esa persona está delante de la pantalla, que es la otra mitad de la decisión',
      typeof jugando.datos.presente === 'boolean',
      jugando.datos,
    );
  }

  // ── 3 · EL PLAZO VENCE POR LA LECTURA DE OTRO ────────────────────────────
  paso('El plazo vence por la LECTURA de otro jugador, y el turno pasa');

  {
    const { codigo, gente } = await mesaLarga(PLAZO_DE_UN_DIA_S);
    const arranque = await leerLaMesa(codigo, gente[0]!.llave);
    await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: gente[0]!.llave,
      cuerpo: { rev: arranque.datos.mesa.rev, tipo: EMPEZAR_RIBERAS, carga: {} },
    });

    /*
     * SE LLEVA LA PARTIDA HASTA `jugando`, porque es donde «vencer» significa que
     * el turno pasa. En la colocación significa «se coloca por ti» y el turno se
     * queda donde estaba: lo decide el juego en su rama del tic, y esta capa no
     * tiene por qué saberlo. Ver `jugarHasta`.
     */
    const llego = await jugarHasta(codigo, gente, 'jugando', 30);
    comprobar('la partida llega a jugarse de verdad, más allá de la colocación', llego);

    const antes = await pedir(`/arcade/mesas/${codigo}/turno`);
    const ausente = antes.datos.turnoDe as string;
    const elOtro = gente.find((g) => g.asiento !== ausente);
    comprobar('hay alguien a quien le toca y alguien que no es él', elOtro !== undefined, {
      ausente,
      gente: gente.map((g) => g.asiento),
    });
    const ticAntes = (await leerLaMesa(codigo, gente[0]!.llave)).datos.mesa.tic as number;

    /*
     * PASA UN DÍA Y EL QUE TIENE EL TURNO NO APARECE. Nadie llama al servidor: el
     * reloj corre solo. Es el caso del §5.4 —«si nadie se mueve no entra nada»— y
     * la salida acordada no es un temporizador de servidor, que rompería la
     * reejecutabilidad, sino que la LECTURA evalúe el plazo.
     */
    await saltar(DIA + HORA);

    /*
     * Y LEE EL OTRO. No el ausente: el otro. Si leyera el ausente, el vencimiento
     * también entraría y la comprobación pasaría sin haber demostrado lo que el
     * §5.4 promete —«si un jugador cierra la app, LOS DEMÁS siguen sondeando, y su
     * lectura hace vencer el plazo del ausente»—.
     */
    const trasLeer = await leerLaMesa(codigo, elOtro!.llave);
    comprobar('la lectura del otro contesta 200 y no un error', trasLeer.estado === 200, trasLeer.datos);
    comprobar(
      'y ha entrado un tic por el reductor: el plazo venció leyendo',
      (trasLeer.datos.mesa.tic as number) === ticAntes + 1,
      { antes: ticAntes, despues: trasLeer.datos.mesa.tic },
    );

    const despues = await pedir(`/arcade/mesas/${codigo}/turno`);
    comprobar(
      'el turno ha pasado a otro: al ausente se le fue la hora',
      despues.datos.turnoDe !== ausente && despues.datos.turnoDe !== null,
      { antes: ausente, despues: despues.datos.turnoDe },
    );
    comprobar(
      'y la espera del turno nuevo empieza de cero, no hereda la del ausente',
      (despues.datos.esperandoMs as number) < 60_000,
      despues.datos,
    );
    comprobar(
      'el plazo se reprograma a un día desde ahora',
      Math.abs((despues.datos.quedanMs as number) - DIA) < 60_000,
      despues.datos,
    );
  }

  // ── 4 · LA TENSIÓN DE RIBERAS: MOVER SIN TENER EL TURNO ──────────────────
  paso('Quien NO tiene el turno contesta un trueque y NO le regala plazo al que sí');

  {
    /*
     * ═══ POR QUÉ ESTE CASO Y NO OTRO, Y POR QUÉ FALTABA ═══
     *
     * El §9 llama a esto la tensión de Riberas: `opcionesDeTurno` ofrece aceptar y
     * rechazar un trueque A QUIEN NO LE TOCA —está escrito antes del `if (v.turnoDe
     * !== quien) return opciones`— y contestar devuelve un estado nuevo. O sea que
     * en este juego «alguien movió y el estado cambió» NO implica «cambió el
     * turno», y las setenta y cuatro comprobaciones de este fichero no mandaban ni
     * un movimiento de quien no tiene el turno: un `grep` de OFRECER, ACEPTAR o
     * RECHAZAR aquí dentro no devolvía nada.
     *
     * Lo que se escapaba por ahí, medido: Ana tiene el turno, ofrece un trueque y
     * cierra la app; veinte horas después Bruno lo RECHAZA, y con eso Ana se
     * llevaba veinticuatro horas más de plazo y `esperandoMs` volvía a cero, así
     * que el aviso «lleva más de N horas» no se disparaba jamás. Sin colusión y sin
     * cliente manipulado: rechazar un trueque es un movimiento normal y legítimo.
     *
     * La afirmación es de IGUALDAD EXACTA y no de tolerancia: `venceEn` y
     * `turnoDesde` son instantes absolutos que sólo se mueven al cambiar el turno,
     * así que un movimiento de un tercero tiene que dejarlos byte a byte iguales.
     */
    const { codigo, gente } = await mesaLarga(PLAZO_DE_UN_DIA_S);
    const arranque = await leerLaMesa(codigo, gente[0]!.llave);
    await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: gente[0]!.llave,
      cuerpo: { rev: arranque.datos.mesa.rev, tipo: EMPEZAR_RIBERAS, carga: {} },
    });
    comprobar(
      'la partida llega a jugarse, que es donde el trueque existe',
      await jugarHasta(codigo, gente, 'jugando', 30),
    );

    /*
     * Se juega hasta que el que tiene el turno PUEDA ofrecerle un trueque al otro.
     * No se escribe el movimiento a mano: se le pregunta a `opciones()` con la
     * vista, igual que hace `jugarUnPaso`, porque este fichero no es de Riberas y
     * no tiene por qué saber qué bienes hay.
     */
    let conTurno: Sentado | undefined;
    let sinTurno: Sentado | undefined;
    let oferta: Opcion | undefined;
    for (let intento = 0; intento < 40 && oferta === undefined; intento++) {
      const quien = await pedir(`/arcade/mesas/${codigo}/turno`);
      conTurno = gente.find((g) => g.asiento === quien.datos.turnoDe);
      sinTurno = gente.find((g) => g.asiento !== quien.datos.turnoDe);
      if (conTurno === undefined || sinTurno === undefined) break;
      const suya = await vistaDe(codigo, conTurno);
      oferta = (opcionesDeRiberas(suya, conTurno.asiento) as readonly Opcion[]).find(
        (o) => o.tipo === OFRECER && (o.carga as { para?: string }).para === sinTurno!.asiento,
      );
      if (oferta === undefined && (await jugarUnPaso(codigo, gente)) === null) break;
    }
    comprobar('el que tiene el turno puede ofrecerle un trueque al otro', oferta !== undefined);

    if (oferta !== undefined && conTurno !== undefined && sinTurno !== undefined) {
      const antesDeOfrecer = await leerLaMesa(codigo, conTurno.llave);
      const ofrecido = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
        metodo: 'POST',
        llave: conTurno.llave,
        cuerpo: { rev: antesDeOfrecer.datos.mesa.rev, tipo: oferta.tipo, carga: oferta.carga },
      });
      comprobar('el trueque se propone', ofrecido.estado === 200, ofrecido.datos);

      const antes = await pedir(`/arcade/mesas/${codigo}/turno`);
      const revAntes = (await leerLaMesa(codigo, conTurno.llave)).datos.mesa.rev as number;

      /* VEINTE HORAS de las veinticuatro, y el que tiene el turno no aparece. */
      await saltar(20 * HORA);

      const suyaDelOtro = await vistaDe(codigo, sinTurno);
      const respuesta = (opcionesDeRiberas(suyaDelOtro, sinTurno.asiento) as readonly Opcion[]).find(
        (o) => o.tipo === RECHAZAR,
      );
      comprobar(
        'a quien NO le toca se le ofrece contestar el trueque: ésta es la tensión del §9',
        respuesta !== undefined,
      );

      if (respuesta !== undefined) {
        const rev = (await leerLaMesa(codigo, sinTurno.llave)).datos.mesa.rev as number;
        const rechazado = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
          metodo: 'POST',
          llave: sinTurno.llave,
          cuerpo: { rev, tipo: respuesta.tipo, carga: respuesta.carga },
        });
        comprobar('y el servidor lo acepta, porque es legítimo', rechazado.estado === 200, rechazado.datos);

        const revDespues = (await leerLaMesa(codigo, sinTurno.llave)).datos.mesa.rev as number;
        /*
         * SIN ESTO LA COMPROBACIÓN SERÍA HUECA: si el movimiento no cambiara el
         * estado, nada se reprogramaría de todos modos y las tres afirmaciones de
         * abajo pasarían sin haber probado nada.
         */
        comprobar(
          'el rechazo CAMBIÓ el estado —si no, no habría nada que demostrar—',
          revDespues > revAntes,
          { revAntes, revDespues },
        );

        const despues = await pedir(`/arcade/mesas/${codigo}/turno`);
        comprobar(
          'el turno sigue siendo del mismo: contestar un trueque no lo pasa',
          despues.datos.turnoDe === antes.datos.turnoDe,
          { antes: antes.datos.turnoDe, despues: despues.datos.turnoDe },
        );
        comprobar(
          'la antigüedad del turno NO se ha reiniciado: sigue siendo el mismo instante',
          despues.datos.turnoDesde === antes.datos.turnoDesde,
          { antes: antes.datos.turnoDesde, despues: despues.datos.turnoDesde },
        );
        comprobar(
          'y el ausente lleva veinte horas esperándose, no cero',
          (despues.datos.esperandoMs as number) > 19 * HORA,
          despues.datos,
        );
        comprobar(
          'el plazo NO se ha prorrogado: sigue venciendo cuando iba a vencer',
          despues.datos.venceEn === antes.datos.venceEn,
          { antes: antes.datos.venceEn, despues: despues.datos.venceEn },
        );
        comprobar(
          'o sea que le quedan las cuatro horas que le quedaban, no veinticuatro',
          (despues.datos.quedanMs as number) < 5 * HORA,
          despues.datos,
        );
      }
    }
  }

  // ── 5 · NADIE MIRA DURANTE DÍAS ──────────────────────────────────────────
  paso('Nadie mira durante días: se reprograma desde AHORA, no se acumulan cien vencimientos');

  {
    /*
     * ═══ EL CASO QUE DE VERDAD ASUSTA, Y POR QUÉ EL PLAZO ES DE UNA HORA ═══
     *
     * Con un plazo de una hora y tres días de silencio hay SETENTA Y DOS
     * vencimientos posibles. Ésa es la aritmética que hace la pregunta real: al
     * volver el lunes, ¿se encuentra uno setenta y dos turnos saltados de golpe, o
     * uno?
     *
     * La fase 2 decidió lo segundo —«reprogramando desde ahora, se pierde UN turno
     * por plazo transcurrido sin que nadie mire, que es lo que significa de verdad
     * se te pasó la hora»— y esto comprueba que la decisión es cierta y no un
     * comentario. La alternativa, `venceEn += plazoMs`, es la que hace un
     * metrónomo, y aquí produciría una partida decidida por el fin de semana de uno.
     *
     * Y hay una segunda consecuencia que se mide aparte: setenta y dos tics serían
     * setenta y dos entradas en el diario y setenta y dos revisiones, todas dentro
     * de UNA petición HTTP y con el bucle de eventos bloqueado mientras tanto.
     */
    const { codigo, gente } = await mesaLarga(60 * 60);
    const arranque = await leerLaMesa(codigo, gente[0]!.llave);
    await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: gente[0]!.llave,
      cuerpo: { rev: arranque.datos.mesa.rev, tipo: EMPEZAR_RIBERAS, carga: {} },
    });

    const antes = await leerLaMesa(codigo, gente[0]!.llave);
    const ticAntes = antes.datos.mesa.tic as number;
    const revAntes = antes.datos.mesa.rev as number;

    await saltar(3 * DIA);

    const alVolver = await leerLaMesa(codigo, gente[0]!.llave);
    comprobar(
      'tres días sin que nadie mire, con plazo de una hora: se ha perdido UN turno, no setenta y dos',
      (alVolver.datos.mesa.tic as number) === ticAntes + 1,
      { antes: ticAntes, despues: alVolver.datos.mesa.tic, plazosPosibles: 72 },
    );
    comprobar(
      'y el diario ha crecido una entrada, no setenta y dos',
      (alVolver.datos.mesa.rev as number) === revAntes + 1,
      { antes: revAntes, despues: alVolver.datos.mesa.rev },
    );
    comprobar(
      'el plazo vuelve a ser de una hora contada desde ahora',
      Math.abs((alVolver.datos.mesa.venceEn as number) - Date.now() - desplazamiento - HORA) <
        60_000,
      { venceEn: alVolver.datos.mesa.venceEn },
    );

    /*
     * Y LA SEGUNDA LECTURA SEGUIDA NO METE NADA. Sin esto, «se pierde un turno por
     * lectura» sería indistinguible de «se pierden todos, de uno en uno, tan
     * deprisa como se lea» — que a cuatro móviles sondeando es lo mismo que
     * setenta y dos de golpe, sólo que repartido en cuatro segundos.
     */
    const otraVez = await leerLaMesa(codigo, gente[0]!.llave);
    comprobar(
      'y la lectura siguiente, en el acto, no mete ningún tic más',
      (otraVez.datos.mesa.tic as number) === (alVolver.datos.mesa.tic as number),
      { primera: alVolver.datos.mesa.tic, segunda: otraVez.datos.mesa.tic },
    );
  }

  // ── 2 y 4 · EL `rev` DE HACE TRES DÍAS, Y QUIEN CERRÓ LA APP ─────────────
  paso('Quien cierra la app tres días sigue en la partida, y su `rev` rancio resincroniza');

  let laQueSobrevive: { codigo: string; gente: Sentado[] };
  let revDeHaceTresDias = 0;
  let vistaDeHaceTresDias = '';

  {
    const { codigo, gente } = await mesaLarga(PLAZO_DE_UN_DIA_S);
    laQueSobrevive = { codigo, gente };
    const arranque = await leerLaMesa(codigo, gente[0]!.llave);
    await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: gente[0]!.llave,
      cuerpo: { rev: arranque.datos.mesa.rev, tipo: EMPEZAR_RIBERAS, carga: {} },
    });

    /*
     * BRUNO MIRA UNA VEZ Y CIERRA LA APP. Se guarda la revisión que se llevó: es la
     * que traerá dentro de tres días, y el punto 4 de esta fase dice que eso es el
     * caso normal y no un móvil manipulado.
     */
    const loQueSeLlevoBruno = await leerLaMesa(codigo, gente[1]!.llave);
    revDeHaceTresDias = loQueSeLlevoBruno.datos.mesa.rev as number;
    vistaDeHaceTresDias = canonico(loQueSeLlevoBruno.datos.mesa.vista);

    const dados = await jugarPasos(codigo, gente, 6);
    comprobar('se juegan varios turnos mientras tanto', dados >= 3, dados);

    await saltar(3 * DIA);

    /*
     * ═══ PRESENCIA ≠ PARTICIPACIÓN, CON TRES DÍAS DE POR MEDIO ═══
     *
     * En una velada, quien no está conectado no está jugando y el panel lo pinta
     * gris. Aquí Bruno lleva tres días sin abrir la app: deja de estar «presente»,
     * que es un dato COSMÉTICO, y sigue en `asientos`, sigue contando para el aforo
     * y le sigue tocando cuando le toque. Es la línea donde una velada y una mesa
     * asíncrona dejan de parecerse.
     */
    const desdeFuera = await leerLaMesa(codigo, null);
    const bruno = desdeFuera.datos.mesa.asientos.find(
      (a: { id: string }) => a.id === gente[1]!.asiento,
    );
    comprobar('quien cerró la app hace tres días SIGUE en los asientos', bruno !== undefined, {
      asientos: desdeFuera.datos.mesa.asientos,
    });
    comprobar('y ya no se le pinta como presente, que es lo único que cambia', bruno?.presente === false, bruno);
    comprobar(
      'la mesa sigue teniendo a los tres sentados: nadie se cae por no mirar',
      desdeFuera.datos.mesa.asientos.length === gente.length,
      desdeFuera.datos.mesa.asientos.length,
    );

    /*
     * ═══ Y VUELVE CON LA REVISIÓN DE HACE TRES DÍAS ═══
     *
     * Leer con un `rev` rancio NO es un error: la revisión se comprueba al ESCRIBIR
     * y jamás al leer. Lo que recibe es el estado COMPLETO, que es lo que permite
     * que el día que exista un canal continuo se pueda degradar a sondeo en
     * caliente sin que el juego se entere.
     */
    const alVolver = await pedir(`/arcade/mesas/${codigo}?desde=${String(revDeHaceTresDias)}`, {
      llave: gente[1]!.llave,
    });
    comprobar(
      'volver con un `rev` de hace tres días contesta 200, no un error',
      alVolver.estado === 200,
      { estado: alVolver.estado, datos: alVolver.datos },
    );
    comprobar(
      'y no contesta 204 «no ha pasado nada», que dejaría la pantalla muerta',
      alVolver.estado !== 204,
    );
    comprobar(
      'trae el estado COMPLETO y no un diff desde la revisión vieja',
      alVolver.datos?.mesa?.vista !== undefined && alVolver.datos.mesa.rev > revDeHaceTresDias,
      { rev: alVolver.datos?.mesa?.rev, desde: revDeHaceTresDias },
    );
    comprobar(
      'y el estado que trae es DISTINTO del que se llevó: se ha jugado mientras tanto',
      canonico(alVolver.datos.mesa.vista) !== vistaDeHaceTresDias,
    );
    comprobar(
      'la llave de hace tres días sigue valiendo: se le reconoce el asiento',
      alVolver.datos.mesa.yo === gente[1]!.asiento,
      { yo: alVolver.datos.mesa.yo, esperado: gente[1]!.asiento },
    );

    /*
     * PERO ESCRIBIR CON ESA REVISIÓN SÍ SE RECHAZA, y con el estado completo
     * dentro. La asimetría es la regla entera: leer con una revisión vieja no
     * cambia nada de nadie; actuar sobre un estado que ya no existe sí.
     */
    const moviendoRancio = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: gente[1]!.llave,
      cuerpo: { rev: revDeHaceTresDias, tipo: EMPEZAR_RIBERAS, carga: {} },
    });
    comprobar(
      'mover con la revisión de hace tres días se rechaza con 409',
      moviendoRancio.estado === 409,
      moviendoRancio.datos,
    );
    comprobar(
      'por revisión rancia, y con la mesa buena dentro para no hacer un segundo viaje',
      moviendoRancio.datos?.motivo === 'revision-rancia' && moviendoRancio.datos?.mesa !== undefined,
      moviendoRancio.datos,
    );

    /*
     * Y AL VOLVER, JUEGA. Es la comprobación que cierra el punto: no basta con que
     * el asiento siga en la lista; tiene que poder mover. Se juega con la revisión
     * fresca que acaba de recibir.
     */
    const jugoAlVolver = await jugarPasos(codigo, gente, 2);
    comprobar('y la partida sigue jugándose después de la ausencia', jugoAlVolver >= 1, jugoAlVolver);
  }

  // ── 1 · LA MESA SOBREVIVE A QUE EL PROCESO MUERA ─────────────────────────
  paso('La mesa sobrevive a que el proceso MUERA, con turnos antes y después');

  {
    const { codigo, gente } = laQueSobrevive;

    const antes = await leerLaMesa(codigo, gente[0]!.llave);
    const revAntes = antes.datos.mesa.rev as number;
    const ticAntes = antes.datos.mesa.tic as number;
    const turnoDesdeAntes = antes.datos.mesa.turnoDesde as number;
    const vistaAntes = canonico(antes.datos.mesa.vista);
    const fichasDeBrunoAntes = canonico(
      ((await vistaDe(codigo, gente[1]!)) as VistaDeRiberas).misFichas,
    );

    comprobar(
      'con `tickHz: 0` la escritura es SÍNCRONA: el fichero ya está en `MESAS_DIR`',
      fs.existsSync(path.join(MESAS, `${codigo}.json`)),
      { carpeta: MESAS },
    );

    /*
     * ═══ SE MATA A LO BRUTO, SIN DARLE OCASIÓN DE VOLCAR NADA ═══
     *
     * Lo que se comprueba es la escritura síncrona del §6 —«cuando el servidor
     * contestó hecho, ya estaba guardado»— y no el volcado de la despedida, que es
     * una red por debajo y que `verify:mesa` comprueba aparte. Y hay una razón de
     * peso para probarlo así EN ESTA MÁQUINA: Windows no entrega `SIGTERM` a un
     * proceso hijo, lo mata. Una comprobación que dependiera de la señal sería aquí
     * siempre verde por el motivo equivocado.
     *
     * Para La Larga esto no es una prueba de robustez: es el supuesto. Una partida
     * de tres días atraviesa varios despliegues, y el §6 lo dice con todas las
     * letras — «cada `git push` mata todas las partidas en curso» era el estado del
     * día uno de la fase 2.
     */
    servidor?.kill();
    await esperarAQueMuera(servidor!);
    servidor = levantar();
    await esperarAlServidor();

    const despues = await leerLaMesa(codigo, gente[0]!.llave);
    comprobar('la mesa sigue ahí después de que el proceso muriera', despues.estado === 200, despues.datos);
    comprobar('con la misma revisión', despues.datos.mesa.rev === revAntes, {
      antes: revAntes,
      despues: despues.datos.mesa.rev,
    });
    comprobar('y el mismo tic', despues.datos.mesa.tic === ticAntes, {
      antes: ticAntes,
      despues: despues.datos.mesa.tic,
    });
    comprobar(
      'el tablero entero es el mismo, comparado con `canonico` y no con `JSON.stringify`',
      canonico(despues.datos.mesa.vista) === vistaAntes,
    );
    comprobar(
      'y «desde cuándo se espera» sobrevive al reinicio: el aviso no se reinicia solo',
      despues.datos.mesa.turnoDesde === turnoDesdeAntes,
      { antes: turnoDesdeAntes, despues: despues.datos.mesa.turnoDesde },
    );
    comprobar(
      'las fichas de cada cual siguen siendo las suyas: la llave sigue valiendo',
      canonico(((await vistaDe(codigo, gente[1]!)) as VistaDeRiberas).misFichas) ===
        fichasDeBrunoAntes,
    );

    /*
     * Y SE SIGUE JUGANDO EN EL PROCESO NUEVO. Sin esto, la comprobación diría que
     * la mesa se LEE igual, que es la mitad: una mesa recuperada a la que no se le
     * pueda mover es una partida perdida con una pantalla bonita.
     */
    const trasResucitar = await jugarPasos(codigo, gente, 3);
    comprobar('y se siguen jugando turnos en el proceso nuevo', trasResucitar >= 2, trasResucitar);

    /*
     * ═══ Y EL RELOJ SIGUE ADELANTADO EN EL PROCESO NUEVO ═══
     *
     * El envoltorio relee el desplazamiento al arrancar, así que los tres días que
     * habían pasado siguen habiendo pasado. Sin esta comprobación, un proceso nuevo
     * con el reloj a cero haría que todo lo que viene después midiera otra cosa —y
     * como lo que mediría sería «no ha vencido nada», saldría verde.
     */
    const conElReloj = await pedir(`/arcade/mesas/${codigo}/turno`);
    comprobar(
      'el proceso nuevo arranca con el reloj adelantado que tenía el viejo',
      conElReloj.estado === 200 && (conElReloj.datos.turnoDesde as number) > 0,
      conElReloj.datos,
    );
  }

  // ── El almacén viejo, que también tiene que abrir ─────────────────────────
  paso('Un fichero de mesa de la versión anterior se lee y se pone al día');

  {
    /*
     * ═══ POR QUÉ ESTO ESTÁ AQUÍ Y NO EN `verify:almacen` ═══
     *
     * Porque el campo que se añade —`turnoDesde`— lo añade esta fase, y porque la
     * consecuencia de descartarlo sería incumplir la fase con el código de la fase:
     * La Larga existe para que una partida de tres días sobreviva a los despliegues,
     * así que estrenarla borrando las mesas de quien actualice sería la ironía más
     * cara posible.
     *
     * Se fabrica un fichero de la versión 2 a mano —sin `turnoDesde`, que es
     * exactamente lo que había guardado en disco antes de esta fase— y se comprueba
     * que la mesa vuelve con un valor sano en vez de con un `NaN` que se propagaría
     * hasta la pantalla diciendo «hace NaN horas» sin que nada se pusiera rojo.
     */
    const codigo = 'VIEJA';
    const ahoraDelServidor = Date.now() + desplazamiento;
    const cuandoSeToco = ahoraDelServidor - 2 * DIA;
    const guardada = {
      version: 2,
      mesa: {
        codigo,
        mesa: {
          id: codigo,
          arcade: RIBERAS,
          estado: undefined,
          rev: 0,
          tic: 0,
          semilla: 12345,
          azar: 0,
          asientos: ['aVIEJA111'],
          diario: [],
          terminada: false,
        },
        sillas: [{ id: 'aVIEJA111', nombre: 'Quien estaba', llave: 'LLAVEDELAVIEJA0000000000' }],
        plazoMs: DIA,
        /*
         * EL VENCIMIENTO SE PONE EN EL FUTURO A PROPÓSITO, y la primera versión de
         * esto lo puso en el pasado y se puso roja enseñando algo que merece
         * quedarse escrito: con el plazo ya vencido, la primera lectura mete un tic,
         * y en una mesa que todavía no tiene estado ese tic MATERIALIZA la partida
         * —el reductor devuelve una partida nueva donde antes no había nada— así que
         * cuenta como cambio y reinicia la espera. O sea que lo que se habría medido
         * no es que el fichero viejo se lea bien, sino que un tic funciona.
         *
         * Aquí lo que se quiere medir es la lectura del fichero y nada más, así que
         * se le deja plazo por delante y no entra ningún tic de por medio.
         */
        venceEn: ahoraDelServidor + HORA,
        abiertaEn: cuandoSeToco,
        ultimoToqueEn: cuandoSeToco,
      },
    };
    fs.mkdirSync(MESAS, { recursive: true });
    fs.writeFileSync(path.join(MESAS, `${codigo}.json`), JSON.stringify(guardada), 'utf8');

    /*
     * ═══ Y OTRA A LA QUE LE FALTA EL CAMPO DEL QUE SE DERIVA EL NUEVO ═══
     *
     * `turnoDesde` se rellena desde `ultimoToqueEn` cuando no está. La primera
     * versión de esta fase validaba el derivado y NO el campo del que se deriva, y
     * de ahí salían tres consecuencias encadenadas, ninguna con error a la vista:
     * la vista salía SIN `turnoDesde` —rompiendo el juego cerrado de campos que
     * `verify:mesa` afirma—, `esperandoMs` salía `null`, y sobre todo
     * `barrerLasViejas` hacía `ahora - undefined`, que es `NaN`, y `NaN <=
     * OLVIDO_MS` es FALSO: la mesa se borraba de memoria y de disco en el siguiente
     * `abrir` de cualquiera. Treinta días de retención convertidos en borrado
     * inmediato por un campo que falta.
     */
    const manca = 'MANCA';
    const sinToque = {
      version: 2,
      mesa: {
        ...guardada.mesa,
        codigo: manca,
        mesa: { ...guardada.mesa.mesa, id: manca, asientos: ['aMANCA111'] },
        sillas: [{ id: 'aMANCA111', nombre: 'Sin toque', llave: 'LLAVEDELAMANCA0000000000' }],
        ultimoToqueEn: undefined,
      },
    };
    fs.writeFileSync(path.join(MESAS, `${manca}.json`), JSON.stringify(sinToque), 'utf8');

    servidor?.kill();
    await esperarAQueMuera(servidor!);
    servidor = levantar();
    await esperarAlServidor();

    const leida = await pedir(`/arcade/mesas/${codigo}/turno`);
    comprobar('una mesa guardada por la versión anterior vuelve a abrirse', leida.estado === 200, leida.datos);
    comprobar(
      'y «desde cuándo se espera» sale con un número sano, no con un `NaN`',
      Number.isFinite(leida.datos?.turnoDesde) && Number.isFinite(leida.datos?.esperandoMs),
      leida.datos,
    );
    comprobar(
      'derivado del último toque que sí traía el fichero viejo: dos días de espera',
      Math.abs((leida.datos.esperandoMs as number) - 2 * DIA) < 5 * 60_000,
      { esperandoMs: leida.datos.esperandoMs },
    );

    /* Y la que venía sin `ultimoToqueEn`: ni `NaN`, ni campo ausente, ni borrada. */
    const coja = await pedir(`/arcade/mesas/${manca}?desde=-1`);
    comprobar('una mesa sin `ultimoToqueEn` también vuelve a abrirse', coja.estado === 200, coja.datos);
    comprobar(
      'y su vista trae `turnoDesde`, que es lo que el juego cerrado de campos exige',
      Number.isFinite(coja.datos?.mesa?.turnoDesde),
      coja.datos?.mesa,
    );

    /*
     * EL REMATE, que es lo que de verdad costaba: `abrir` de un DESCONOCIDO dispara
     * el barrido, y con el `NaN` dentro se llevaba esta mesa por delante en el acto.
     */
    const ajena = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: RIBERAS, nombre: 'Un desconocido' },
    });
    comprobar('un desconocido abre su mesa, que es lo que dispara el barrido', ajena.estado === 201);
    const despuesDelBarrido = await pedir(`/arcade/mesas/${manca}?desde=-1`);
    comprobar(
      'y la mesa recién recuperada sigue ahí: la retención son treinta días, no cero',
      despuesDelBarrido.estado === 200,
      despuesDelBarrido.datos,
    );
    comprobar(
      'y su fichero sigue en el disco',
      fs.existsSync(path.join(MESAS, `${manca}.json`)),
    );
  }

  // ── EL FORMATO QUE SE ESCRIBE, MIRANDO HACIA ATRÁS ───────────────────────
  paso('Lo que se escribe en disco lo sigue entendiendo la versión anterior');

  {
    /*
     * ═══ LA COMPATIBILIDAD QUE NADIE MIRA ES LA DE ATRÁS ═══
     *
     * La de adelante —leer lo viejo— está comprobada justo arriba. Ésta es la otra,
     * y es la que cuesta partidas: el lector publicado hace `if (leido.version !== 2
     * || !leido.mesa) continue;` y descarta EN SILENCIO cualquier otro número. Con
     * un formato subido, revertir un despliegue —una operación normal en Render, y
     * el §6 dice que pasa en cada push— hace desaparecer todas las partidas en
     * curso: ni un error, ni una línea en el registro, ni una diferencia visible
     * salvo que el código de mesa ya no existe.
     *
     * El campo que esta fase añade es ADITIVO y el lector viejo empuja la mesa
     * entera sin mirar los campos que no conoce, así que la 2 vale para los dos
     * sentidos. Y el número sube el día que un lector viejo interpretaría MAL el
     * fichero, no el día que hay un campo nuevo.
     */
    const ficheros = fs.readdirSync(MESAS).filter((n) => n.endsWith('.json'));
    comprobar('hay ficheros de mesa que mirar en el disco', ficheros.length > 0, ficheros);

    const malas: string[] = [];
    let conElCampoNuevo = 0;
    for (const n of ficheros) {
      const leido = JSON.parse(fs.readFileSync(path.join(MESAS, n), 'utf8')) as {
        version?: unknown;
        mesa?: { turnoDesde?: unknown };
      };
      if (leido.version !== 2) malas.push(`${n}: ${JSON.stringify(leido.version)}`);
      if (Number.isFinite(leido.mesa?.turnoDesde)) conElCampoNuevo++;
    }
    comprobar(
      'todos los ficheros que este servidor ha escrito dicen `version: 2`',
      malas.length === 0,
      malas,
    );
    comprobar(
      'y aun así llevan dentro el campo nuevo: es aditivo, no un formato distinto',
      conElCampoNuevo > 0,
      { ficheros: ficheros.length, conElCampoNuevo },
    );
  }

  // ── El diagnóstico, que es donde se ven las fugas ─────────────────────────
  paso('Lo que queda vivo en memoria después de tres días y dos reinicios');

  {
    const d = await pedir('/arcade/diagnostico');
    comprobar('el diagnóstico se sirve', d.estado === 200, d.datos);
    comprobar('hay mesas vivas: nada se ha barrido por error', (d.datos.mesas as number) > 0, d.datos);
    /*
     * NI UN CANDADO SUELTO. Es la fuga que ya tuvo `live/sesion.ts` —guardar una
     * promesa y comparar otra— y aquí importa el doble: cada lectura de una mesa de
     * La Larga coge el candado para evaluar el plazo, así que una fuga de una
     * entrada por lectura crece con el número de sondeos, no con el de partidas.
     */
    comprobar('y ningún candado suelto', d.datos.candados === 0, d.datos);
    comprobar(
      'el almacén no ha tenido un solo fallo de escritura',
      (d.datos.almacen?.fallos as number) === 0,
      d.datos.almacen,
    );
    comprobar(
      'y la carpeta está declarada por `MESAS_DIR`, que es como va en producción',
      d.datos.almacen?.carpetaDeclarada === true,
      d.datos.almacen,
    );
    console.log(
      `  ${String(d.datos.mesas)} mesa(s) · ${String(d.datos.candados)} candado(s) · ` +
        `${String(d.datos.despertadores)} despertador(es) · reloj adelantado ` +
        `${(desplazamiento / DIA).toFixed(1)} días`,
    );
  }
} catch (error) {
  fallos.push(`la prueba se cayó: ${error instanceof Error ? error.stack : String(error)}`);
} finally {
  if (servidor) {
    servidor.kill();
    await esperarAQueMuera(servidor);
  }
  try {
    fs.rmSync(CARPETA, { recursive: true, force: true });
  } catch {
    /* En Windows un fichero recién cerrado a veces sigue bloqueado un instante. */
  }
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${String(hechas)} comprobaciones. Una mesa de Riberas con VEINTICUATRO HORAS por turno se abre\n` +
      '  con la misma petición que una de treinta segundos, sobrevive a que el proceso muera con\n' +
      '  turnos jugados antes y después, resincroniza a quien vuelve con la revisión de hace tres\n' +
      '  días, deja que el plazo del ausente venza por la lectura de otro, mantiene en la partida a\n' +
      '  quien cerró la app, y después de tres días sin que nadie mire se ha perdido UN turno y no\n' +
      '  setenta y dos. Y el servidor sabe decir a quién le toca y desde cuándo.',
  );
  process.exit(0);
}
console.log(`✘ ${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
console.log(
  '\nLo que esto mide no es un juego: es si la DURACIÓN es una propiedad del motor o un dato de la\n' +
    'mesa. El §9 lo dice — si La Larga necesita tocar `shared/arcade/`, es que la fase 2 se escribió\n' +
    'pensando en partidas de diez minutos y hay que volver allí, no arreglar esto.',
);
process.exit(1);
