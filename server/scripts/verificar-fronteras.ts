/**
 * ¿SIGUEN SIN CONOCERSE LOS DOS MOTORES?
 *
 *   npm run verify:fronteras
 *
 * ═══ QUÉ AFIRMA ═══
 *
 * Una sola cosa, y es la regla de la que dependen todas las demás del motor de
 * arcade:
 *
 *     EL MOTOR DE ARCADE Y EL DE GAME MASTER NO SE CONOCEN.
 *
 * Son dos motores hermanos que conviven en el mismo repositorio y en el mismo
 * proceso de Node. No hay herencia, no hay configuración, no hay contrato
 * común. Y eso no se sostiene con buena voluntad: se sostiene con esto, que es
 * una comprobación estática que se pone roja.
 *
 * ═══ POR QUÉ UNA COMPROBACIÓN Y NO UNA REGLA ESCRITA ═══
 *
 * Porque la forma en que se pierden estas separaciones no es un acto de
 * rebeldía: es un `import` razonable. Alguien necesita el testigo firmado, ve
 * que ya está escrito en `live/token.ts`, y lo importa. Nadie hace nada mal, y
 * al cabo de veinte importaciones así los dos motores son uno con dos nombres.
 *
 * Este repositorio tiene la historia entera escrita en `INFORME-ARQUITECTURA.md`:
 * la plataforma acabó con la forma de CLUEDO «una línea cada vez, ninguna
 * culpable, todas razonables». La única defensa que ha funcionado es medir.
 *
 * ═══ Y DESDE EL CLIENTE DE ESCRITORIO, UNA SEGUNDA FRONTERA ═══
 *
 * La misma idea aplicada a otra pared. `escritorio/` es un cliente de navegador
 * que se escribió para demostrar que el contrato del arcade NO estaba atado a
 * React Native, y esa demostración vale exactamente lo que valga la promesa de
 * que no importa nada de `app/`. Hoy es cierta —se han leído sus importaciones
 * una a una— pero era cierta POR DISCIPLINA DE UNA PERSONA y no por
 * construcción: un `import { SALA } from '../../app/src/arcade/muebles'` para
 * reaprovechar unos colores compila, empaqueta y pasa la batería entera en
 * verde, y a partir de ahí el escritorio arrastra la carpeta del móvil sin que
 * nadie se entere. Es justo la propiedad que ese cliente existía para demostrar,
 * y era la única que se había quedado sin red.
 *
 * ═══ QUÉ MIRA ═══
 *
 * Los ficheros de `shared/`, de `server/src/` y de `escritorio/`. Los dos
 * primeros son lo que se compila para todos; `server/scripts/` queda fuera a
 * propósito, por lo mismo que en `verify:nucleo`: un guion de desarrollo no
 * viaja a ningún servidor, y este mismo comprobador tendría que excluirse a sí
 * mismo.
 *
 * `escritorio/scripts/` SÍ entra, y la diferencia no es una incoherencia: lo que
 * allí se protege no es «qué llega a un servidor» sino «este cliente no está
 * atado al móvil», y un comprobador que importara de `app/` ataría el paquete
 * igual. De hecho ni siquiera arrancaría —corre con `tsx` en Node, y allí no hay
 * React Native—, así que la regla solo adelanta el fallo al sitio donde se
 * entiende.
 *
 * Se leen los `import`, los `export … from`, los `import()` dinámicos y los
 * `require()`. Los comentarios NO cuentan: media cabecera de este repositorio
 * cita rutas que no se importan, y penalizarlas empujaría a escribir peores
 * comentarios.
 */
import fs from 'node:fs';
import path from 'node:path';
import { sinComentarios } from './sin-comentarios';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

/**
 * Dónde vive el código que se compila para todos, más el cliente de escritorio.
 *
 * `escritorio/` va entero —`src` y `scripts`— por lo que dice la cabecera: la
 * frontera que se le vigila no es la de los dos motores, es la del móvil.
 */
const RAICES = ['shared', 'server/src', 'escritorio/src', 'escritorio/scripts'];

// ---------------------------------------------------------------------------
// LO QUE ESTÁ MAL COLOCADO — con su destino, no con su permiso
// ---------------------------------------------------------------------------

/**
 * Ficheros que están donde no van, y que el arcade puede importar MIENTRAS
 * estén ahí.
 *
 * ═══ POR QUÉ ESTA LISTA NO SE LLAMA «EXCEPCIONES» ═══
 *
 * Se llamaba así y el nombre estaba mal, y la diferencia no es cosmética.
 *
 * Una lista de EXCEPCIONES es una CATEGORÍA: una zona compartida entre los dos
 * motores, con precedente de ampliarla. Quien llegue en tres meses lee la
 * categoría —«ah, hay excepciones»— y no el razonamiento que justificaba cada
 * una. Y la siguiente se añade citando a la anterior, que es como una excepción
 * se convierte en una política.
 *
 * Una lista de DESTINOS PENDIENTES no invita a crecer. Cada línea es una deuda
 * CON DIRECCIÓN: dice dónde tendría que acabar el fichero y por qué todavía no
 * está allí. Añadir una es admitir por escrito que has puesto algo donde no va,
 * en el diff, con la fecha al lado.
 *
 * ═══ Y ERAN DOS ═══
 *
 * `presencia.ts` ya no está aquí: se ha MOVIDO a `server/src/mecanicas/
 * presencia.ts`, que es donde le tocaba. No era una excepción archivada mal, era
 * una dependencia estructural de la mesa en línea —sin presencia no se detecta a
 * quien se fue— y la capa `mecanicas/` existe exactamente para eso. Con la
 * mudanza desapareció además un peaje: `olvidar` de una mesa de arcade ya no
 * llama de rebote a algo de veladas, llama a una mecánica compartida.
 *
 * Queda uno. Que la lista ENCOJA es la prueba de que este mecanismo funciona al
 * revés que una lista de excepciones, que solo sabe crecer.
 */
const MAL_COLOCADOS: Array<{
  ruta: string;
  destino: string;
  desde: string;
  porQueSigueAhi: string;
}> = [
  {
    ruta: 'server/src/live/token.ts',
    destino: 'server/src/identidad/',
    desde: '2026-08-31',
    porQueSigueAhi:
      'Es una credencial HMAC sin estado, con `exp` y `sid`: es IDENTIDAD, no juego, y ' +
      '`server/src/identidad/` ya existe. No se mueve hoy porque es la RUTA DE ' +
      'AUTENTICACIÓN —el sitio donde un fallo deja que un invitado lea la solución— y hay ' +
      'otra sesión auditando ese árbol. Se mueve cuando cierre. Mientras tanto el arcade lo ' +
      'importa tal cual, porque volver a escribir un firmador HMAC al lado sería peor: dos ' +
      'implementaciones de una credencial es la forma de que una de las dos se quede sin ' +
      'arreglar el día que haya un fallo.',
  },
];

const RUTAS_MAL_COLOCADAS = new Set(MAL_COLOCADOS.map((e) => e.ruta.replace(/\.ts$/, '')));

// ---------------------------------------------------------------------------
// Leer las importaciones
// ---------------------------------------------------------------------------

interface Importacion {
  /** El especificador tal cual se escribió. */
  crudo: string;
  /** Resuelto a ruta del repositorio, si era relativo. Si no, el crudo. */
  destino: string;
  linea: number;
}

/*
 * Las cuatro formas de traerse código en este repositorio. Se leen sobre el
 * fichero YA SIN COMENTARIOS, así que una ruta citada en una cabecera no cuenta.
 */
const PATRONES = [
  /\bimport\s+[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bexport\s+[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function importacionesDe(rel: string, codigo: string): Importacion[] {
  const salida: Importacion[] = [];
  const vistas = new Set<string>();
  for (const patron of PATRONES) {
    patron.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = patron.exec(codigo)) !== null) {
      const crudo = m[1]!;
      const clave = `${m.index}:${crudo}`;
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      salida.push({
        crudo,
        destino: resolver(rel, crudo),
        linea: codigo.slice(0, m.index).split('\n').length,
      });
    }
  }
  return salida;
}

/**
 * Convierte un especificador relativo en una ruta del repositorio.
 *
 * Se normaliza a barras hacia delante y SIN extensión, porque las dos formas
 * conviven en el repositorio —`'./index'`, `'../live/hub'`— y comparar cadenas
 * con extensión dejaría fuera la mitad. Un especificador que no empieza por
 * punto es un paquete o un módulo de Node y se devuelve tal cual.
 */
function resolver(desde: string, especificador: string): string {
  if (!especificador.startsWith('.')) return especificador;
  const carpeta = path.posix.dirname(desde.split('\\').join('/'));
  const junto = path.posix.normalize(path.posix.join(carpeta, especificador));
  return junto.replace(/\.(ts|tsx|js|jsx|mjs)$/, '');
}

/** ¿Está esta ruta dentro de esta carpeta? También si ES la carpeta (su `index`). */
function dentroDe(ruta: string, carpeta: string): boolean {
  return ruta === carpeta || ruta.startsWith(`${carpeta}/`);
}

// ---------------------------------------------------------------------------
// Las reglas
// ---------------------------------------------------------------------------

interface Hallazgo {
  regla: string;
  fichero: string;
  linea: number;
  especificador: string;
  porque: string;
}

const hallazgos: Hallazgo[] = [];

function romper(regla: string, f: string, i: Importacion, porque: string): void {
  hallazgos.push({ regla, fichero: f, linea: i.linea, especificador: i.crudo, porque });
}

/** Las carpetas de veladas que el arcade no puede tocar, y al revés. */
const CARPETAS_DE_VELADA = ['server/src/live', 'server/src/docs', 'server/src/agent'];

function juzgar(fichero: string, i: Importacion): void {
  const destino = i.destino;

  // ── REGLA 1 · el arcade del servidor no importa de las veladas ────────────
  if (dentroDe(fichero, 'server/src/arcade')) {
    for (const carpeta of CARPETAS_DE_VELADA) {
      if (!dentroDe(destino, carpeta)) continue;
      if (RUTAS_MAL_COLOCADAS.has(destino)) continue;
      romper(
        'server/src/arcade no importa de live, docs ni agent',
        fichero,
        i,
        'Son dos motores hermanos que no se conocen. Si de verdad hace falta esa pieza, la ' +
          'salida es MOVERLA a `mecanicas/` —que es la capa que este repositorio ya inventó, y ' +
          'es lo que se hizo con `presencia.ts`—. Meterla en la lista de MAL_COLOCADOS es la ' +
          'salida de emergencia y exige escribir su destino y por qué no se ha movido hoy.',
      );
    }
  }

  // ── REGLA 2 · y las veladas no importan del arcade ────────────────────────
  if (CARPETAS_DE_VELADA.some((c) => dentroDe(fichero, c))) {
    if (dentroDe(destino, 'server/src/arcade')) {
      romper(
        'live, docs y agent no importan de server/src/arcade',
        fichero,
        i,
        'La dirección contraria es igual de grave: un motor de veladas que sabe qué es un ' +
          'arcade es un motor con dos modos, y el segundo es el que no se probó.',
      );
    }
  }

  // ── REGLA 3 · los dos contratos de `shared/` no se conocen ────────────────
  if (dentroDe(fichero, 'shared/arcade') && dentroDe(destino, 'shared/juegos')) {
    romper(
      'shared/arcade no importa de shared/juegos',
      fichero,
      i,
      'El manifiesto de arcade se escribe desde cero: no hereda, no extiende y no hace ' +
        '`Omit<ManifiestoDeJuego, …>`. Importar de allí es empezar a heredar por la puerta ' +
        'de atrás.',
    );
  }
  if (dentroDe(fichero, 'shared/juegos') && dentroDe(destino, 'shared/arcade')) {
    romper(
      'shared/juegos no importa de shared/arcade',
      fichero,
      i,
      'Un arcade registrado en el reparto de veladas se pintaría en el carrusel de la ' +
        'portada, y para evitarlo alguien metería un `if (esArcade)` en `veladas()`. Esa es ' +
        'la primera de las cien banderas que acaban deshaciendo la separación.',
    );
  }

  // ── REGLA 4 · el núcleo del arcade no importa NADA de `node:` ─────────────
  if (fichero === 'shared/arcade/motor.ts' && i.crudo.startsWith('node:')) {
    romper(
      'shared/arcade/motor.ts no importa nada de node:',
      fichero,
      i,
      'Este fichero tiene que correr dentro de Hermes, en un móvil, sin red. El día que ' +
        'importe `node:crypto` —para una semilla, para un hash, para lo que sea— un juego ' +
        'de un solo dispositivo deja de poder existir.',
    );
  }

  /*
   * ── REGLA 5 · el contrato del arcade tampoco conoce el de las veladas ─────
   *
   * No estaba en el encargo y se añade porque es la misma frontera dicha entera:
   * el §0 del diseño prohíbe reutilizar `LiveSession`, `VistaJugador`, `Plot`,
   * `LivePhase` y `AvisoClave`, y todos viven en `shared/live.ts` y
   * `shared/types.ts`. Sin esta regla, la prohibición de `shared/juegos` se
   * saltaría por el camino más corto que hay, que es el que ya usan los cuatro
   * juegos de la casa.
   */
  if (dentroDe(fichero, 'shared/arcade')) {
    for (const prohibido of ['shared/live', 'shared/types', 'shared/documents', 'shared/staleness']) {
      if (destino !== prohibido) continue;
      romper(
        'shared/arcade no importa el contrato de las veladas',
        fichero,
        i,
        'El arcade tiene su propio vocabulario. `LiveSession`, `VistaJugador`, `Plot` y ' +
          '`AvisoClave` son forma de velada, y un juego con otra forma tendría que fingirla.',
      );
    }
  }

  /*
   * ── REGLA 6 · solo `canal/sondeo.ts` toca el bus de las veladas ───────────
   *
   * Tampoco estaba en el encargo. `server/src/canal/` es la costura entre los dos
   * mundos y por eso SÍ puede importar `live/hub.ts` — pero si pudiera hacerlo
   * cualquier fichero de la carpeta, la costura dejaría de ser una costura y
   * pasaría a ser una zona. Un solo fichero de diez líneas es auditable de un
   * vistazo; cuatro ya no.
   */
  if (dentroDe(fichero, 'server/src/canal') && fichero !== 'server/src/canal/sondeo.ts') {
    if (dentroDe(destino, 'server/src/live')) {
      romper(
        'solo canal/sondeo.ts adapta el bus de veladas',
        fichero,
        i,
        'El adaptador es UN fichero a propósito: es la única superficie por la que el ' +
          'arcade toca `hub.ts`, y tiene que caber en una pantalla para que se pueda leer ' +
          'entera antes de creérsela.',
      );
    }
  }

  /*
   * ── REGLA 7 · el cliente de escritorio no importa de ningún otro cliente ──
   *
   * ═══ LA PROPIEDAD QUE ESTA REGLA GUARDA, Y LO QUE VALDRÍA SIN ELLA ═══
   *
   * `escritorio/` existe para contestar una pregunta cara: ¿estaba el contrato
   * del arcade atado a React Native? La respuesta —«no, y aquí está un cliente
   * de navegador que lo consume tal cual sin mover una línea de
   * `shared/arcade/`»— solo vale mientras el cliente no se traiga nada de
   * `app/src/`. Un solo `import` para reaprovechar unos colores y la
   * demostración pasa a demostrar lo contrario, sin un error en ninguna consola.
   *
   * Se prohíben los tres a la vez y no solo `app/`:
   *
   *   · `app/src` — es React Native. Es el que destruiría la demostración.
   *   · `client/src` — es el taller del Game Master, va detrás de `requireAuth`
   *     y NO SABE QUE EL ARCADE EXISTE, cero menciones. Eso es el §0 y es un
   *     activo; la primera importación en cualquiera de las dos direcciones lo
   *     gasta entero.
   *   · `server/src` — es código de Node. Aquí no rompería una separación de
   *     diseño: rompería el empaquetado, y de la peor manera, porque `vite` a
   *     veces sabe resolver lo que el navegador después no puede ejecutar.
   *
   * Lo que sí puede importar, y es la lista entera: `shared/`, su propio paquete
   * y los paquetes de `node_modules`. No hace falta escribirlo: lo que no está
   * prohibido aquí lo permite el `tsconfig`, y ampliar esta lista es un diff.
   */
  if (dentroDe(fichero, 'escritorio')) {
    for (const ajeno of ['app/src', 'client/src', 'server/src']) {
      if (!dentroDe(destino, ajeno)) continue;
      romper(
        'escritorio no importa de app, client ni server',
        fichero,
        i,
        'Este cliente existe para demostrar que el contrato del arcade se consume desde un ' +
          'navegador sin tocarlo. Lo que necesite de fuera lo coge de `shared/` —que es el ' +
          'sitio del código que sirve a todos— o lo escribe aquí. Traérselo de otro cliente ' +
          'ata el escritorio a ese cliente y deja la demostración sin objeto.',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// El recorrido
// ---------------------------------------------------------------------------

function ficheros(): string[] {
  const salida: string[] = [];
  const bajar = (dir: string): void => {
    let entradas: fs.Dirent[];
    try {
      entradas = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entradas) {
      const completa = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (['node_modules', 'dist', '.expo', 'build', 'coverage'].includes(e.name)) continue;
        bajar(completa);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      if (e.name.endsWith('.d.ts')) continue;
      salida.push(path.relative(RAIZ, completa).replace(/\\/g, '/'));
    }
  };
  for (const raiz of RAICES) bajar(path.join(RAIZ, raiz));
  return salida.sort();
}

console.log('\nLas fronteras entre los dos motores\n');

const lista = ficheros();
let importacionesLeidas = 0;

for (const rel of lista) {
  const codigo = sinComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
  for (const i of importacionesDe(rel, codigo)) {
    importacionesLeidas++;
    juzgar(rel, i);
  }
}

/*
 * ═══ LA VACUNA CONTRA EL VERDE FALSO ═══
 *
 * Este repositorio tiene tres casos anotados de comprobadores que pasaban en
 * verde sin comprobar nada: uno llamaba mal a una función y no encontraba
 * secretos, otro buscaba literales en castellano que ya no existían. En los tres
 * el síntoma fue el mismo: cero hallazgos, y cero hallazgos se parece mucho a
 * «todo bien».
 *
 * Así que antes de decir que está todo bien se comprueba que se ha mirado algo.
 * Si el recorrido devolviera cero ficheros —una carpeta renombrada, una raíz mal
 * escrita— esto se pone rojo en vez de felicitar a nadie.
 */
if (lista.length < 50 || importacionesLeidas < 100) {
  console.error(
    `Solo se han leído ${lista.length} ficheros y ${importacionesLeidas} importaciones.\n` +
      'Eso no es un árbol sano: es un comprobador que no está mirando donde cree.\n' +
      `Raíces: ${RAICES.join(', ')} (desde ${RAIZ})`,
  );
  process.exit(2);
}

/*
 * Y lo mismo con la lista de mal colocados: una entrada que apunta a un fichero
 * que ya no existe es una deuda muerta, y las deudas muertas se quedan años
 * porque nadie se atreve a borrar lo que no entiende.
 *
 * Es además la forma en que esta lista SE ENTERA de que alguien la ha resuelto:
 * el día que `token.ts` se mueva a `identidad/`, esto se pone rojo pidiendo que
 * se borre la línea. Una deuda que hay que dar de baja a mano es una deuda que
 * se queda; una que grita cuando ya está pagada, no.
 */
const muertas = MAL_COLOCADOS.filter((e) => !fs.existsSync(path.join(RAIZ, e.ruta)));
if (muertas.length > 0) {
  console.error('Hay entradas de MAL_COLOCADOS que apuntan a ficheros que ya no existen:\n');
  for (const m of muertas) console.error(`  ✗ ${m.ruta}  (su destino era ${m.destino})`);
  console.error('\nO ya se han mudado —y entonces se borra la línea— o sobran.');
  process.exit(2);
}

console.log(`  ${lista.length} ficheros · ${importacionesLeidas} importaciones leídas`);
console.log(`  ${MAL_COLOCADOS.length} fichero(s) mal colocado(s), con su destino:`);
for (const e of MAL_COLOCADOS) console.log(`    · ${e.ruta}  →  ${e.destino}   (desde ${e.desde})`);

if (hallazgos.length === 0) {
  console.log('\nLos dos motores siguen sin conocerse, y el escritorio sigue sin conocer a la app.');
  process.exit(0);
}

console.log(`\n${hallazgos.length} importaciones cruzan una frontera:\n`);
const porRegla = new Map<string, Hallazgo[]>();
for (const h of hallazgos) {
  const lista_ = porRegla.get(h.regla) ?? [];
  lista_.push(h);
  porRegla.set(h.regla, lista_);
}
for (const [regla, suyos] of porRegla) {
  console.log(`  ✗ ${regla}`);
  for (const h of suyos) {
    console.log(`      ${h.fichero}:${h.linea}  →  ${h.especificador}`);
  }
  console.log(`      ${suyos[0]!.porque}\n`);
}
process.exit(1);
