/**
 * ¿SIGUE QUIETO EL NÚCLEO DEL ARCADE? — EL COMPROBADOR QUE MIDE LA FASE 4
 *
 *   npm run verify:nucleo-quieto             ← comprueba que no se ha movido
 *   npm run verify:nucleo-quieto -- --sellar ← vuelve a sellar, a sabiendas
 *
 * ═══ POR QUÉ EXISTE ESTE FICHERO, QUE NO ES UN COMPROBADOR MÁS ═══
 *
 * La fase 4 no se mide por el juego que entrega. El §9 del diseño lo dice con
 * todas las letras: Riberas «se mide con un diff» — el comercio, los recursos,
 * los premios derivados, el orden en serpentina y la negociación entre dos
 * personas de las cuales una no tiene el turno se escriben enteros dentro del
 * juego, con CERO cambios en el núcleo. Ese diff vacío *es* la demostración de
 * que el motor nació agnóstico.
 *
 * Y un diff es una cosa que alguien mira una vez. Este fichero lo convierte en
 * algo que se ejecuta: si mañana alguien «arregla» el motor para que le quepa un
 * juego, esto se pone rojo. Sin él, la afirmación más cara de la fase viviría en
 * un párrafo de un informe y en la memoria de quien lo escribió.
 *
 * ═══ QUÉ ES EL NÚCLEO, Y POR QUÉ LA LISTA SE DERIVA ═══
 *
 * Son las carpetas del contrato: `shared/arcade/` menos `juegos/` —que es donde
 * viven los juegos y donde SÍ se escribe—, las dos mecánicas de las que cuelga la
 * reproducibilidad (`azar.ts` y `canonico.ts`), la autoridad (`arbitro.ts` y
 * `mesas.ts`) y el transporte (`server/src/canal/`).
 *
 * La lista de ficheros NO está escrita a mano: se recorren las carpetas. Con una
 * lista escrita, añadir un fichero nuevo al núcleo no rompería nada —y añadir un
 * fichero es exactamente cómo crece un núcleo—. Con el recorrido, un fichero
 * nuevo aparece como «no estaba sellado» y se pone rojo.
 *
 * ═══ LO QUE ESTE COMPROBADOR NO PUEDE HACER, DICHO ANTES DE QUE ALGUIEN SE FÍE ═══
 *
 * Un guion de oro se puede volver a sellar. Quien cambie el núcleo y corra
 * `--sellar` lo pone verde otra vez, y eso es la misma debilidad que el propio
 * `verify:arcade-pobre` se anotó sobre sus peajes declarados: borrar una línea
 * sin arreglar la causa no pone nada en rojo.
 *
 * Lo que compra igualmente es la única cosa que hacía falta: QUE SEA UNA DECISIÓN
 * Y NO UN DESCUIDO. Sellar deja en el diff un fichero cuyo contenido entero son
 * huellas, con una fecha y un motivo escrito al lado; un revisor lo ve y puede
 * preguntar. Sin esto, un cambio de tres líneas en `motor.ts` para que un juego
 * encaje pasa desapercibido entre las trescientas del juego.
 *
 * Por eso hay además DOS comprobaciones que no se pueden sellar, y que son las que
 * de verdad muerden:
 *
 *   · EL NÚCLEO NO NOMBRA A NINGÚN JUEGO. Ni importa de `juegos/`, ni contiene el
 *     identificador de ningún arcade instalado fuera de los comentarios. Está
 *     DERIVADO del registro: el día que se instale un quinto juego, su id entra
 *     solo en la búsqueda sin que nadie venga a añadirlo aquí.
 *   · Y EL JUEGO DE LA FASE TIENE QUE ESTAR. Un núcleo intacto es trivialmente
 *     cierto si no hay nada rico que lo empuje: sin esto, borrar Riberas dejaría
 *     este comprobador en verde diciendo que el motor aguanta un juego que ya no
 *     existe.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sinComentarios } from './sin-comentarios';
import { arcadesInstalados, manifiestoDeArcade } from '../../shared/arcade';
import '../../shared/arcade/juegos';
import { RIBERAS } from '../../shared/arcade/juegos';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const SELLO = path.join(AQUI, 'oro-arcade', 'nucleo.json');

/**
 * QUÉ SE VIGILA, Y QUÉ SE DEJA FUERA A PROPÓSITO.
 *
 * `shared/arcade/juegos/` queda fuera porque es donde viven los juegos: sellarla
 * haría rojo cada juego nuevo, que es lo contrario de lo que esto mide.
 * `server/src/arcade/` entra entero salvo lo que no es contrato —marcadores,
 * repeticiones, presupuesto e instalados son piezas de fase, no vocabulario— y
 * por eso se nombran las dos que sí lo son.
 */
const CARPETAS: Array<{ ruta: string; hondo: boolean; porque: string }> = [
  {
    ruta: 'shared/arcade',
    hondo: false,
    porque: 'el contrato: manifiesto, reductor, movimiento, proyección, reloj y registro',
  },
  { ruta: 'server/src/canal', hondo: true, porque: 'el transporte, con sus seis verbos' },
];

/** Ficheros sueltos del núcleo que no forman carpeta propia. */
const SUELTOS: Array<{ ruta: string; porque: string }> = [
  { ruta: 'shared/mecanicas/azar.ts', porque: 'de aquí cuelga que una partida se pueda repetir' },
  { ruta: 'shared/mecanicas/canonico.ts', porque: 'de aquí cuelga que dos estados se puedan comparar' },
  { ruta: 'server/src/arcade/arbitro.ts', porque: 'la autoridad: quién y cuándo, sin una regla de juego' },
  { ruta: 'server/src/arcade/mesas.ts', porque: 'la mesa, los plazos y la persistencia' },
];

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 400)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/** Los ficheros del núcleo, recorriendo las carpetas. Nunca una lista a mano. */
function ficherosDelNucleo(): string[] {
  const salida: string[] = [];

  for (const carpeta of CARPETAS) {
    const raiz = path.join(RAIZ, carpeta.ruta);
    if (!fs.existsSync(raiz)) continue;
    for (const entrada of fs.readdirSync(raiz, { withFileTypes: true })) {
      if (entrada.isDirectory()) {
        if (!carpeta.hondo) continue;
        for (const dentro of fs.readdirSync(path.join(raiz, entrada.name))) {
          if (dentro.endsWith('.ts')) salida.push(`${carpeta.ruta}/${entrada.name}/${dentro}`);
        }
        continue;
      }
      if (entrada.name.endsWith('.ts')) salida.push(`${carpeta.ruta}/${entrada.name}`);
    }
  }

  for (const suelto of SUELTOS) {
    if (fs.existsSync(path.join(RAIZ, suelto.ruta))) salida.push(suelto.ruta);
  }

  return salida.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * LA HUELLA DE UN FICHERO, con los finales de línea normalizados.
 *
 * Sin normalizar, este comprobador se pondría rojo en cuanto alguien clonara el
 * repositorio en Windows con `core.autocrlf` puesto: cada fichero tendría un byte
 * más por línea y las huellas no cuadrarían sin que nadie hubiera tocado nada. Un
 * comprobador que grita cuando no pasa nada acaba desactivado — y quien lo
 * desactive lo hará debilitándolo.
 */
function huellaDe(rel: string): { huella: string; lineas: number } {
  const texto = fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
  return {
    huella: createHash('sha256').update(texto).digest('hex').slice(0, 16),
    lineas: texto.split('\n').length,
  };
}

/** El sello guardado, o nada si todavía no hay. */
type Sello = Record<string, { huella: string; lineas: number }>;

function leerElSello(): Sello | null {
  if (!fs.existsSync(SELLO)) return null;
  return JSON.parse(fs.readFileSync(SELLO, 'utf8')) as Sello;
}

const ahora: Sello = {};
for (const rel of ficherosDelNucleo()) ahora[rel] = huellaDe(rel);

// ---------------------------------------------------------------------------
// SELLAR, que es una decisión y por eso lleva su propio aviso
// ---------------------------------------------------------------------------

if (process.argv.includes('--sellar')) {
  fs.mkdirSync(path.dirname(SELLO), { recursive: true });
  fs.writeFileSync(SELLO, `${JSON.stringify(ahora, null, 2)}\n`, 'utf8');
  console.log(`Sellados ${String(Object.keys(ahora).length)} ficheros del núcleo en ${path.relative(RAIZ, SELLO)}.`);
  console.log(
    '\nEsto NO es una operación de mantenimiento: es una declaración de que el núcleo del arcade\n' +
      'ha cambiado a propósito. Va en un commit propio, con el motivo escrito, y separado del juego\n' +
      'que lo motivó — porque la fase 4 existe precisamente para demostrar que un juego rico NO\n' +
      'necesita que esto se toque.',
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
paso('El guion de oro: el núcleo del arcade, fichero a fichero');
// ---------------------------------------------------------------------------

const sello = leerElSello();

if (sello === null) {
  console.log('');
  console.log(`✘ No hay sello en ${path.relative(RAIZ, SELLO)}.`);
  console.log('   Córrelo una vez con `-- --sellar` para congelar el núcleo tal y como está hoy.');
  process.exit(1);
}

{
  const sellados = Object.keys(sello).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const actuales = Object.keys(ahora).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  comprobar('hay ficheros que vigilar', actuales.length > 0, actuales.length);

  const nuevos = actuales.filter((f) => sello[f] === undefined);
  comprobar(
    'no ha aparecido ningún fichero nuevo en el núcleo',
    nuevos.length === 0,
    nuevos,
  );

  const idos = sellados.filter((f) => ahora[f] === undefined);
  comprobar('no ha desaparecido ninguno', idos.length === 0, idos);

  const movidos: Array<{ fichero: string; antes: number; ahora: number }> = [];
  for (const f of actuales) {
    const antes = sello[f];
    const hoy = ahora[f];
    if (antes === undefined || hoy === undefined) continue;
    if (antes.huella !== hoy.huella) {
      movidos.push({ fichero: f, antes: antes.lineas, ahora: hoy.lineas });
    }
  }
  comprobar('y ninguno de los sellados ha cambiado ni un byte', movidos.length === 0, movidos);
}

// ---------------------------------------------------------------------------
paso('Lo que no se puede sellar: el núcleo sigue sin saber a qué se juega');
// ---------------------------------------------------------------------------

{
  /*
   * ═══ LOS IDS SALEN DEL REGISTRO, NO DE UNA LISTA ═══
   *
   * Se preguntan a `arcadesInstalados()`, así que el quinto juego que alguien
   * instale entra solo en esta búsqueda. Con una lista escrita a mano, la
   * comprobación protegería de los cuatro juegos que ya existen y de ninguno de
   * los que vengan — que son justamente los que todavía nadie ha revisado.
   */
  const ids = arcadesInstalados().map((m) => m.id);
  comprobar('hay arcades instalados cuyos nombres buscar', ids.length >= 2, ids);

  const nombrados: Array<{ fichero: string; id: string }> = [];
  const importan: string[] = [];
  for (const rel of Object.keys(ahora)) {
    const desnudo = sinComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
    for (const id of ids) {
      if (desnudo.includes(`'${id}'`) || desnudo.includes(`"${id}"`)) nombrados.push({ fichero: rel, id });
    }
    if (/from\s+['"][^'"]*arcade\/juegos/.test(desnudo)) importan.push(rel);
  }
  comprobar(
    'ningún fichero del núcleo escribe el identificador de un juego',
    nombrados.length === 0,
    nombrados,
  );
  comprobar('ni importa nada de `shared/arcade/juegos/`', importan.length === 0, importan);

  /*
   * LA VACUNA. Si la búsqueda no encontrara los ids ni cuando SÍ están, las dos
   * comprobaciones de arriba serían decorativas. Se comprueba contra un texto
   * fabricado, que es la única forma de verla acertar.
   */
  const envenenado = sinComentarios(`const especial = '${ids[0] as string}'; // ${ids[0] as string}`);
  comprobar(
    'y la búsqueda sí encontraría un id metido a mano en el código',
    envenenado.includes(`'${ids[0] as string}'`),
    envenenado,
  );
}

// ---------------------------------------------------------------------------
paso('Y el juego que empuja el núcleo sigue estando');
// ---------------------------------------------------------------------------

{
  /*
   * Sin esto, borrar Riberas dejaría este comprobador en verde: el núcleo seguiría
   * intacto, sí, pero porque ya no habría nada rico apretándolo. Un núcleo quieto
   * sólo significa algo si hay un juego encima que podría haberlo movido.
   */
  const ids = arcadesInstalados().map((m) => m.id);
  comprobar('Riberas sigue instalado', ids.includes(RIBERAS), ids);
  const m = manifiestoDeArcade(RIBERAS);
  comprobar('con el mueble genérico de tablero', m.mueble === 'tablero', m.mueble);
  comprobar('con autoridad de servidor y mano oculta', m.sede === 'servidor' && m.secretos, m);
  comprobar('sin reloj propio, que es lo que obliga a que el plazo viva en la mesa', m.tickHz === 0);
  comprobar('y con su procedencia declarada', m.procedencia.tipo === 'creacion-propia', m.procedencia);
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. Los ${String(Object.keys(ahora).length)} ficheros del núcleo del arcade están\n` +
      '  byte a byte como estaban, ninguno nombra a ningún juego, ninguno importa de `juegos/`, y el\n' +
      '  juego más rico de los cuatro —tablero hexagonal, comercio, premio derivado y serpentina—\n' +
      '  sigue instalado encima sin haberlos movido.',
  );
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
console.log(
  '\nEsto es LA afirmación de la fase 4, y no una comprobación de estilo. El tablero hexagonal va el\n' +
    'cuarto y no el primero precisamente porque escribirlo antes garantizaría que el motor sólo\n' +
    'jugara a él. Si el núcleo ha tenido que moverse para que un juego quepa, la pregunta no es cómo\n' +
    'volver a poner esto en verde: es qué le falta al contrato, y ese hallazgo vale más que el juego.\n' +
    '\nSi el cambio es deliberado y está razonado, `-- --sellar` vuelve a congelar — en un commit\n' +
    'propio y separado del juego que lo motivó.',
);
process.exit(1);
