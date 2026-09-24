/**
 * ¿ES EL BARRIO DE LA NOCHE UNO SOLO EN TODOS LOS APARATOS, SE ANDA, SE NAVEGA, Y SUS DURMIENTES NO
 * SE METEN EN NADA?
 *
 *   npm run verify:quiebro-barrio -w server
 *
 * ═══ POR QUÉ EXISTE ═══
 *
 * El barrio de «El Quiebro» no viaja: el servidor, el escritorio, el WebView de la app y el iPhone
 * lo sacan cada uno de (código, noche) con `barrioDeLaNoche`, y la sala valida con la arena que
 * sale de `mundoDelBarrio`. Si dos de ellos derivaran barrios distintos —un bit en una caja, otro
 * orden en los rótulos— cada uno andaría por el suyo, coherente consigo mismo, y cualquier prueba
 * que mirara un solo lado pasaría en los dos. Y sus 48 durmientes son de quien sale cada Prestado:
 * si uno se mete medio cuerpo en un quiosco, lo ve todo el mundo; si divergen, cada aparato ve
 * temblar a otro civil. Esto es lo que tiene que ser verdad para que nada de eso pase.
 *
 * ═══ LO QUE AFIRMA, EN SEIS PASOS ═══
 *
 *  1. Nada entra en el barrio que no sea (código, noche): el mismo barrio dos veces, con otros
 *     entre medias y después de estropear el anterior; el código sin mayúsculas y la noche con
 *     decimales dan el mismo; los ficheros no importan nada fuera de su lista ni tocan el reloj, el
 *     proceso ni el navegador; y lo compartido entre barrios está congelado.
 *  2. Lo que el barrio es, en 200 noches: cajas bien formadas, dentro del cerco y sin pisarse; toda
 *     medida en cuartos de metro; cada solar repartido entero entre sus edificios; nacer, cabinas y
 *     zonas sin una caja encima (con el radio de una persona); las cabinas, una por cuadrante y con
 *     la carrera en 60-110 m con soportales o sin ellos; el grafo, con los 16 cruces delante, nudos
 *     dentro de la plaza y conexo; la red de aceras con sus 64 pasos de cebra; el adorno en su
 *     sitio, con cada rótulo de tienda entero en la pared de su planta baja; lo despejable y la plaza
 *     despejada. Y que las 200 den variedad de verdad.
 *  3. Se anda y se navega, sobre `arenaDe(mundoDelBarrio(…))`: el mundo es el contrato de `mundo.ts`
 *     con `nace` vacío, y el de la Liza (`mundoDeLaLizaDelBarrio`) no tiene problemas para
 *     `problemasDeLaDeclaracion`; una búsqueda en anchura con paso de medio metro llega a las
 *     cabinas, al refugio, a todas las zonas y a los 16 cruces, y a TODO el suelo libre; andando
 *     desde el centro, cada cabina queda entre lo que declara con atajos y sin ellos, y en 60-110 m;
 *     cada arista del grafo se anda en recta y cada nudo se pisa, también con la plaza despejada;
 *     todo el suelo de la glorieta de 60 ve algún nudo, y por el grafo no se rodea mucho más que
 *     andando.
 *  4. Los durmientes: 48, en cuadrillas de una a tres, con vueltas que duran minutos exactos;
 *     durante 20.000 tics siempre sobre suelo, fuera de toda caja y dentro del barrio, sin saltos, y
 *     en la calzada SÓLO cruzando por un paso con su semáforo en verde; lanzan con un tic que no es
 *     número y con un punto en metros; el guion se reusa con otro objeto igual y no con uno
 *     distinto; el más cercano es el más cercano.
 *  5. Tiempos: en un Node recién arrancado y SIN barrer la memoria a mano, derivar el barrio y su
 *     mundo cuesta 3 ms o menos, con el mundo de la Liza 5 ms o menos, el guion de los durmientes
 *     otros 3, y cargar el módulo 10 como mucho.
 *  6. Node contra Hermes: el barrio, su mundo, el de la Liza, el despejado, el guion y 48 × 9 sitios
 *     de durmiente dan la misma huella en los dos motores y en este proceso.
 *
 * ═══ LOS SUELOS ═══
 *
 * Un barrio sin cajas se anda entero y no mete a ningún durmiente en ninguna: el verde por conjunto
 * vacío. Por eso se exige que haya cajas de cada tipo, que la búsqueda en anchura choque de verdad
 * (muchos nudos ocupados), que los durmientes anden de verdad (más del 40 % del tiempo, más de 50 m
 * cada uno), que crucen pasos de cebra (cientos de cruces vistos con su semáforo, y miles de sitios
 * en la calzada mirados tic a tic), que la cobertura del grafo mire miles de puntos y que la prueba
 * de la Liza vea los problemas de un mundo roto a propósito antes de creer que el bueno no tiene.
 *
 * ═══ CÓMO SE HA VISTO ROJA CADA COMPROBACIÓN ═══
 *
 * Primera pasada: las 70 de entonces, en 24 tandas, rompiendo una copia del árbol en el scratchpad
 * del frente «barrio», corriendo esto allí y volviendo a poner los ficheros buenos, comprobado byte
 * a byte. Cada rotura y lo que se puso rojo:
 *
 *  1. Un contador de módulo que suma a la noche en cada llamada → «dos veces» y «cincuenta entre
 *     medias». `typeof performance` en el barrio y `typeof navigator` en los durmientes, y los dos
 *     importando `canonico` → las cuatro de lo estático. El grafo compartido sin congelar → «tocarlo
 *     lanza», «congelado de verdad» y «estropear un barrio no cambia el siguiente» (el 999 del nudo
 *     pasaba al barrio de después). El código sin mayúsculas, la noche sin truncar y un tercer
 *     parámetro → las suyas. La clave de la noche sin código ni noche → «200 distintos» y «otra
 *     noche», pero SÓLO después de mirarlos por dentro: comparados enteros seguían en verde por el
 *     código y la noche que el barrio lleva apuntados.
 *  2. El soportal a 2,9 m, una farola a 21 (sobre el quiosco), el cerco sin esquinas, cortes de
 *     solar a 11, un retranqueo que no entra, una zona de impresión menos, dos desvelados mirando
 *     igual, la glorieta de 58, una arista de 49 m, los pasos de una fila en otro cruce, un pilar del
 *     tren a 19 m, «, » por «. » en el rótulo y los rótulos del soportal sin meter → las catorce
 *     suyas. La fuente sin alto, manzanas de un solo edificio, solares con rendija, coches en la
 *     acera, cabinas desde 20 m, la zona de cabina hasta la fachada y el refugio a 14 m → sus siete.
 *     Un `parpadea` sin valor → «canoniza». Sin quioscos, siempre llovizna y cabinas desde 75 m →
 *     los cuatro suelos de variedad.
 *  3. La distancia a vuelo de cuervo cuadriculado, que fue la primera versión → «se llega andando
 *     lo que declaran». El mundo sin cuerpos → el suelo de la búsqueda. Un jardín vallado en la
 *     plaza con una zona dentro → «se llega» y «no hay bolsas».
 *  4. Cuadrillas siempre de uno, `<=` en el más cercano, sin vueltas junto a la plaza (y el suelo de
 *     gente cerca estaba en diez: seguía verde hasta subirlo a veinte, que es lo que el guion
 *     garantiza). Vueltas sin redondear al minuto, los excluidos contados, la cuadrilla apartada un
 *     metro (a la fachada), el reloj de la vuelta con el `%` de C (los tics negativos), el doble de
 *     paso, pasos de hormiga y `sitioDelDurmiente` apartado al otro lado → cada una la suya.
 *  5. 20 millones de vueltas en el barrio y en el guion, y 60 al cargar → los tres cronómetros. Y
 *     del comprobador: el cronómetro a un fichero que no existe y su Node con una bandera que no
 *     existe → «se empaquetan» y «dicen algo».
 *  6. Hermes buscado donde no está y Babel sin devolver código (del comprobador); `Array.prototype
 *     .at`, que Hermes 0.12 no tiene → «corren sin caerse» y el suelo de las cuatro mesas; una
 *     clausura sobre el `let` de un bucle en el guion (Hermes 0.12 no liga por iteración) → «la MISMA
 *     huella»; y el barrio contando las banderas del proceso → «lo mismo sin empaquetar».
 *
 * Segunda pasada, tras la revisión adversaria: las comprobaciones nuevas y las que cambiaron, en 26
 * tandas más, igual, en `scratchpad/barrio/p2/espejo` (el guion que las corre es `p2/rojos2.py`).
 * Cada rotura y lo que se puso rojo:
 *
 *  1. Los nudos de la rejilla sin congelar → «congelado de verdad». `despejarLaPlaza` con un
 *     parámetro de más, y el barrio importando un valor de la declaración de la Liza → «no esperan
 *     nada más» y «de la Liza y el mundo sólo tipos».
 *  2. Los cruces de la fila de arriba como aparición cercana → «las zonas». La cota de abajo por
 *     encima de la ruta → «las cuatro cabinas», «andando desde el centro» y «alguna que se puede
 *     atajar». Una arista repetida → «el grafo» y «el mundo de la Liza». Los rótulos otra vez por la
 *     fachada entera → «los rótulos». Los coches de las calles, despejables → «lo despejable».
 *     Despejar sin renumerar las cabinas → «la plaza despejada». Siempre dos bancos en el borde →
 *     «variedad de verdad».
 *  3. El grafo de la primera versión (los 16 cruces y nada más) → «el grafo», «todo el suelo de la
 *     glorieta ve algún nudo», «no se rodea» y «fuera de la glorieta». Sin ninguna línea de la plaza
 *     → «el grafo» y «ve algún nudo». Sin las líneas de los huecos entre coches → «no se rodea». Los
 *     coches de la plaza fuera de lo que puede estorbar → «cada arista se anda» (quitar el quiosco
 *     no rompe nada, y se probó: ninguna línea pasa por donde puede estar). `nace` otra vez en el
 *     suelo → «el contrato de mundo.ts» y «el mundo de la Liza». Todas las zonas con el id 1 → «el
 *     mundo de la Liza». La declaración de prueba sin mundo (del comprobador) → su suelo. Lo andado
 *     sin la holgura de la esquina (del comprobador) → «andando desde el centro».
 *  4. El margen del verde otra vez en cinco segundos → «tic a tic» y «10 s por delante». La memoria
 *     por noche sin mirar los semáforos, y sin memoria por noche → «el guion se reusa». El tic sin
 *     mirar al escribir los 48, y el punto sin mirar → las dos de lo que lanza.
 *  5. El cronómetro con el `gc()` de antes → «no barre la memoria a mano». El barrio con veinte
 *     millones de vueltas de más → «3 ms» y «5 ms», también con las quince tomas; el mundo de la
 *     Liza con treinta → «5 ms». El cronómetro diciendo algo que no se lee → «las tomas dicen algo».
 *  6. Una clausura sobre el `let` de un bucle en el mundo de la Liza (Hermes 0.12 no liga por
 *     vuelta) → «la MISMA huella».
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { arnes } from './arnes';
import { sinComentarios } from './sin-comentarios';
import { canonico, porQueNoEsCanonico } from '../../shared/mecanicas/canonico';
import { deNumero, UNO } from '../../shared/mecanicas/fijo';
import { CLASE_DE_CAJA, problemasDeLaDeclaracion, VERSION_DE_LA_DECLARACION } from '../../shared/mecanicas/liza/declaracion';
import type { LizaDeclarada, MundoDeLaLiza } from '../../shared/mecanicas/liza/declaracion';
import { primeraLosa } from '../../shared/mecanicas/liza/geometria';
import { arenaDe, hayPiso, seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena } from '../../shared/mecanicas/mundo';
import {
  CARRILES,
  CLASE_DE_ZONA_EN_LA_LIZA,
  ID_DE_LIMITE_EN_LA_LIZA,
  NOMBRES_DE_GLORIETA,
  ROTULOS_DE_NEON,
  ROTULOS_DE_TIENDA,
  barrioDeLaNoche,
  despejarLaPlaza,
  faseDelSemaforo,
  idDeZonaEnLaLiza,
  mundoDeLaLizaDelBarrio,
  mundoDelBarrio,
  pasoAbierto,
  trenEn,
} from '../../shared/arcade/juegos/quiebro-barrio';
import type { Barrio, CajaDelBarrio, Rectangulo, TipoDeCaja } from '../../shared/arcade/juegos/quiebro-barrio';
import {
  ANDA,
  PASOS_POR_TIC,
  durmienteMasCercano,
  durmientesEn,
  escribirLosDurmientes,
  guionDeLosDurmientes,
  sitioDelDurmiente,
} from '../../shared/arcade/juegos/quiebro-durmientes';

const { comprobar, paso, nota, terminar } = arnes();

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');
const FICHERO_DEL_BARRIO = path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-barrio.ts');
const FICHERO_DE_LOS_DURMIENTES = path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-durmientes.ts');

/** El radio de una persona, en metros y en Q16.16. */
const RADIO = 0.35;
const RADIO_EN_FIJO = deNumero(RADIO);

/*
 * LAS CIFRAS DEL DISEÑO, escritas aquí y no importadas del barrio: una comprobación que leyera del
 * propio barrio a qué distancia tienen que estar las cabinas seguiría en verde el día que el barrio
 * cambiara la cifra. Salen de `docs/EL-QUIEBRO.md` (§4.11, §6.1, §8) y del §3.2 de
 * `docs/quiebro/ARQUITECTURA.md`.
 */
/** 3 × 36 + 4 × 12 = 156 m de barrio, de −78 a 78. */
const DEL_CENTRO_AL_BORDE = 78;
/** El solar de una manzana. */
const LADO_DEL_SOLAR = 36;
/** Las calzadas de las cuatro calles de cada eje: calles de 12 m entre solares de 36. */
const EJES = [-72, -24, 24, 72];
/** Media calzada: 6 m de calzada por calle. */
const MEDIA_CALZADA = 3;
/** La manzana del centro, la plaza. */
const LA_PLAZA = 4;
/** «A 60-110 m del centro de la glorieta por calles reales». */
const CABINA_DESDE = 60;
const CABINA_HASTA = 110;
/** Los durmientes de guion de cada barrio. */
const CUANTOS_DURMIENTES = 48;
/** Semáforos de 30 s por sentido, a 20 tics por segundo. */
const CICLO_DEL_SEMAFORO = 1200;
const VERDE = 600;
/** La glorieta de 60 de lado: donde se pelea con cinco o seis, y donde el grafo tiene que verse entero. */
const GLORIETA_60 = 30;

/**
 * `canonico`, sin reventar: un barrio que no canoniza da una cadena que lo dice. Así el paso 1 se
 * pone rojo con su nombre y el paso 2 llega a decir qué campo es, en vez de caerse el guion entero
 * en la primera comparación.
 */
function huella(valor: unknown): string {
  try {
    return canonico(valor);
  } catch (e) {
    return `NO CANONIZA: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** ¿Lanza esto un `RangeError`? */
function lanzaRango(hacer: () => unknown): boolean {
  try {
    hacer();
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
}

/* ─── Utilidades ──────────────────────────────────────────────────────────── */

function solapan(a: Rectangulo, b: Rectangulo): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
}

function ensanchado(r: Rectangulo, m: number): Rectangulo {
  return { x0: r.x0 - m, z0: r.z0 - m, x1: r.x1 + m, z1: r.z1 + m };
}

function dentroDe(r: Rectangulo, x: number, z: number): boolean {
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
}

function areaDe(r: Rectangulo): number {
  return (r.x1 - r.x0) * (r.z1 - r.z0);
}

function igualQue(a: Rectangulo, b: Rectangulo | undefined): boolean {
  return b !== undefined && a.x0 === b.x0 && a.z0 === b.z0 && a.x1 === b.x1 && a.z1 === b.z1;
}

/** Todos los números que cuelgan de un valor, con su ruta. */
function losNumeros(valor: unknown, ruta: string, salida: { ruta: string; valor: number }[]): void {
  if (typeof valor === 'number') {
    salida.push({ ruta, valor });
    return;
  }
  if (Array.isArray(valor)) {
    valor.forEach((v, k) => losNumeros(v, `${ruta}.${String(k)}`, salida));
    return;
  }
  if (typeof valor === 'object' && valor !== null) {
    for (const k of Object.keys(valor).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) losNumeros((valor as Record<string, unknown>)[k], `${ruta}.${k}`, salida);
  }
}

/**
 * LAS MESAS DE LA PRUEBA: la de siempre y 199 más, con códigos de cinco letras del alfabeto del
 * servidor y noches del 1 al 10. Escritas por una sucesión fija, no sorteadas: un comprobador con
 * entradas al azar es uno que se pone rojo un día de cada cien y que nadie reproduce.
 */
function lasMesas(cuantas: number): { codigo: string; noche: number }[] {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const salida = [{ codigo: 'QWXYZ', noche: 1 }];
  let h = 20260924;
  while (salida.length < cuantas) {
    let codigo = '';
    for (let k = 0; k < 5; k++) {
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      codigo += letras[(h >>> 11) % letras.length] ?? 'A';
    }
    salida.push({ codigo, noche: 1 + (salida.length % 10) });
  }
  return salida;
}

const MESAS = lasMesas(200);
/** Los barrios de las 200 mesas, derivados una vez. */
const BARRIOS: Barrio[] = MESAS.map((m) => barrioDeLaNoche(m.codigo, m.noche));

// ---------------------------------------------------------------------------
paso('1 · Nada entra en el barrio que no sea (código, noche)');
// ---------------------------------------------------------------------------

{
  const cinco = MESAS.slice(0, 5);
  const primeras = cinco.map((m) => huella(barrioDeLaNoche(m.codigo, m.noche)));
  const segundas = cinco.map((m) => huella(barrioDeLaNoche(m.codigo, m.noche)));
  comprobar('el mismo barrio dos veces seguidas, en cinco mesas', primeras.every((c, k) => c === segundas[k]));

  const antes = huella(barrioDeLaNoche('QWXYZ', 1));
  for (let k = 0; k < 50; k++) barrioDeLaNoche(`OTRA${String(k)}`, k);
  comprobar('y el mismo después de derivar cincuenta barrios más entre medias', huella(barrioDeLaNoche('QWXYZ', 1)) === antes);

  /*
   * Estropear un barrio ya derivado no puede cambiar el siguiente: ni lo propio (su lista de cajas,
   * su adorno), ni lo compartido, que además tiene que negarse a cambiar.
   */
  const estropeado = barrioDeLaNoche('QWXYZ', 1) as unknown as { cajas: unknown[]; adorno: { nombre: string }; grafo: { nudos: { x: number }[] } };
  estropeado.cajas.length = 0;
  estropeado.adorno.nombre = 'Otra cosa';
  let negado = false;
  try {
    (estropeado.grafo.nudos[0] as { x: number }).x = 999;
  } catch {
    negado = true;
  }
  comprobar('lo compartido entre barrios está congelado: tocarlo lanza', negado);
  comprobar('y estropear un barrio no cambia el siguiente', huella(barrioDeLaNoche('QWXYZ', 1)) === antes);

  const b = barrioDeLaNoche('QWXYZ', 1);
  const compartidos: [string, unknown][] = [
    ['el grafo', b.grafo],
    ['sus nudos', b.grafo.nudos],
    ['un nudo de la plaza', b.grafo.nudos.find((n) => n.x === 4 && n.z === 4)],
    ['una arista de la rejilla', b.grafo.aristas[b.grafo.aristas.length - 1]],
    ['los límites', b.limites],
    ['los tramos de acera', b.aceras.tramos],
    ['los sitios de nacer de los desvelados', b.nace.desvelado],
    ['la primera caja del cerco', b.cajas[0]],
    ['el grafo de la Liza', mundoDeLaLizaDelBarrio(b).grafo],
  ];
  const sinCongelar = compartidos.filter(([, v]) => v === undefined || !Object.isFrozen(v)).map(([n]) => n);
  comprobar('y está congelado de verdad, no por casualidad', sinCongelar.length === 0, sinCongelar);

  comprobar('el código sin mayúsculas da el mismo barrio', huella(barrioDeLaNoche('qwxyz', 1)) === antes);
  comprobar('la noche con decimales se trunca, y lo que no es número es la noche 0', huella(barrioDeLaNoche('QWXYZ', 1.75)) === antes && huella(barrioDeLaNoche('QWXYZ', Number.NaN)) === huella(barrioDeLaNoche('QWXYZ', 0)));
  /*
   * Distintos por DENTRO: sin el código, la noche y la semilla que el barrio lleva apuntados. Con
   * ellos, 200 barrios idénticos salían «distintos» por su etiqueta —se vio al romper la clave de
   * la noche para que no mirara nada: esto seguía en verde—.
   */
  const contenido = (x: Barrio): string => huella({ ...x, codigo: '', noche: 0, semilla: 0 });
  const distintos = new Set(BARRIOS.map(contenido)).size;
  comprobar('las 200 mesas dan 200 barrios distintos, por dentro', distintos === MESAS.length, distintos);
  comprobar('y la misma mesa en otra noche es otro barrio, por dentro', contenido(barrioDeLaNoche('QWXYZ', 2)) !== contenido(barrioDeLaNoche('QWXYZ', 1)));
  comprobar(
    'las funciones no esperan nada más que lo suyo',
    barrioDeLaNoche.length === 2 &&
      mundoDelBarrio.length === 1 &&
      mundoDeLaLizaDelBarrio.length === 1 &&
      despejarLaPlaza.length === 1 &&
      sitioDelDurmiente.length === 3 &&
      durmientesEn.length === 2 &&
      guionDeLosDurmientes.length === 1,
  );

  /*
   * Lo estático: lo que importan los dos ficheros y lo que leen del mundo. `verify:pureza` ya caza
   * el reloj y el azar sin semilla en todo `shared/`; aquí se mira además lo que haría que el barrio
   * dependiera del aparato: el proceso, el navegador, el almacenamiento, un `require` o un `import()`.
   * La declaración de la Liza entra sólo por sus tipos (`import type`): el barrio no la carga.
   */
  const PERMITIDOS = new Set(['../../mecanicas/azar', '../../mecanicas/fijo', '../../mecanicas/mundo', '../../mecanicas/semilla', '../../mecanicas/liza/declaracion', './quiebro-barrio']);
  const SOLO_TIPOS = new Set(['../../mecanicas/mundo', '../../mecanicas/liza/declaracion']);
  const AJENOS = /\b(process|navigator|document|localStorage|sessionStorage|performance|Date|require|globalThis|window)\b|\bMath\s*\.\s*random\b|\bimport\s*\(/;
  for (const fichero of [FICHERO_DEL_BARRIO, FICHERO_DE_LOS_DURMIENTES]) {
    const nombre = path.basename(fichero);
    const codigo = sinComentarios(fs.readFileSync(fichero, 'utf8'));
    const importa = [...codigo.matchAll(/\bimport\s+(type\s+)?[^;]*?\bfrom\s+'([^']+)'/g)].map((m) => ({ deTipos: m[1] !== undefined, de: m[2] ?? '' }));
    const deMas = importa.filter((i) => !PERMITIDOS.has(i.de)).map((i) => i.de);
    const cargaDeMas = importa.filter((i) => SOLO_TIPOS.has(i.de) && !i.deTipos).map((i) => i.de);
    comprobar(`${nombre} importa sólo mecánicas puras de shared/ (y el barrio), y de la Liza y el mundo sólo tipos`, importa.length > 0 && deMas.length === 0 && cargaDeMas.length === 0, { importa, deMas, cargaDeMas });
    const ajeno = AJENOS.exec(codigo);
    comprobar(`${nombre} no lee nada del aparato: ni proceso, ni navegador, ni reloj`, ajeno === null, ajeno?.[0]);
  }
}

// ---------------------------------------------------------------------------
paso('2 · Lo que el barrio es, en 200 noches');
// ---------------------------------------------------------------------------

{
  const fallos = new Map<string, unknown[]>();
  const apuntar = (que: string, detalle: unknown): void => {
    const lista = fallos.get(que) ?? [];
    if (lista.length < 3) lista.push(detalle);
    fallos.set(que, lista);
  };
  const REGLAS = [
    'canoniza',
    'toda medida es un múltiplo de 0,25 m (y así de 0,05) y todo índice un entero',
    'las cajas están bien formadas, son altas y caen dentro del cerco',
    'ninguna caja pisa otra',
    'el cerco cierra el barrio: sus cajas cubren el anillo de 78 a 80 sin huecos',
    'nueve manzanas, la glorieta en medio sin edificios y las demás con 2 a 4',
    'cada solar se reparte ENTERO entre sus edificios, sin que se pisen',
    'ningún edificio baja de 12 × 12, y todos dan a la calle',
    'cada edificio tiene su caja: la huella, menos el soportal si lo tiene, y sus pilares',
    'las alturas van por tramos seguidos, con los retranqueos después del cuerpo',
    'ninguna zona, sitio de nacer ni cabina tiene una caja a menos de 0,35 m',
    'las zonas: 12 de aparición junto a la plaza, 12 lejanas en los cruces de fuera, 8 de impresión dentro de la plaza, 4 de cabina y el refugio',
    'las cuatro cabinas: una por cuadrante (NE, SE, SO, NO), con la carrera en 60-110 m con atajos y sin ellos',
    'se descuelga a 1,5 m o menos del poste desde cualquier punto de la zona de cabina',
    'el refugio está en el borde de la glorieta, dentro de los 48, con sus tres sitios en su zona',
    'los desvelados nacen en la plaza, seis, mirando cada uno a un sitio',
    'los límites: glorieta48, glorieta60 y barrio, con sus medidas',
    'el grafo: los 16 cruces delante con sus 24 calles de 48 m, detrás aristas en línea y sin repetir, nudos dentro de la plaza, y conexo',
    'la red de aceras: 64 nudos, 112 tramos, 4 pasos de cebra por cruce, y conexa',
    'el tren cruza la plaza con cuatro pilares en su línea',
    'el adorno: tiempo, hora de madrugada, nombre de la lista y rótulo «nombre, h:mm»',
    'los rótulos: textos de las listas sin repetirse; los de tienda ENTEROS en la pared de su planta baja, los neones en su fachada',
    'lo despejable son los coches de junto a la plaza (2 o 3) y los bancos de su borde (2 a 4), y nada más',
    'la plaza despejada: las mismas cajas sin las despejables y en su orden, cada índice renumerado a la misma caja, y lo demás igual',
  ];

  const variedad = {
    tiempos: new Set<string>(),
    nombres: new Set<string>(),
    porManzana: new Set<number>(),
    conSoportal: 0,
    conRetranqueo: 0,
    cochesDePlaza: new Set<number>(),
    bancosDelBorde: new Set<number>(),
    ejesDelTren: new Set<string>(),
    distancias: [] as number[],
    atajos: 0,
    quioscos: 0,
    tipos: new Set<TipoDeCaja>(),
  };

  for (let k = 0; k < BARRIOS.length; k++) {
    const b = BARRIOS[k] as Barrio;
    const id = `${b.codigo}#${String(b.noche)}`;
    const mal = (regla: number, detalle: unknown): void => apuntar(REGLAS[regla] as string, { mesa: id, detalle });

    const porque = porQueNoEsCanonico(b);
    if (porque !== null) mal(0, porque);

    const numeros: { ruta: string; valor: number }[] = [];
    losNumeros(b, 'barrio', numeros);
    for (const n of numeros) if (!Number.isFinite(n.valor) || n.valor * 4 !== Math.round(n.valor * 4)) mal(1, n);

    const cajas = b.cajas;
    for (const [i, c] of cajas.entries()) {
      variedad.tipos.add(c.tipo);
      if (!(c.x0 < c.x1 && c.z0 < c.z1) || c.clase !== 'alta' || c.alto <= 0 || c.x0 < -80 || c.x1 > 80 || c.z0 < -80 || c.z1 > 80) mal(2, { i, c });
      if (!Number.isInteger(c.mira) || c.mira < 0 || c.mira > 255) mal(1, { i, mira: c.mira });
      for (let j = i + 1; j < cajas.length; j++) {
        const d = cajas[j] as CajaDelBarrio;
        if (solapan(c, d)) mal(3, { i, j, a: c, b: d });
      }
    }
    /* El cerco, sin huecos: la suma de las áreas de sus cajas es la del anillo. */
    const cerco = cajas.filter((c) => c.tipo === 'fachada-exterior' || c.tipo === 'valla');
    const anillo = 160 * 160 - 156 * 156;
    const areaDelCerco = cerco.reduce((s, c) => s + areaDe(c), 0);
    if (areaDelCerco !== anillo || cerco.some((c) => Math.max(Math.abs(c.x0), Math.abs(c.x1), Math.abs(c.z0), Math.abs(c.z1)) !== 80)) mal(4, { areaDelCerco, anillo });

    if (b.manzanas.length !== 9) mal(5, b.manzanas.length);
    for (const m of b.manzanas) {
      const esGlorieta = m.indice === LA_PLAZA;
      if (esGlorieta !== (m.tipo === 'glorieta') || (esGlorieta ? m.edificios.length !== 0 : m.edificios.length < 2 || m.edificios.length > 4)) mal(5, m);
      if (!esGlorieta) variedad.porManzana.add(m.edificios.length);
      const suyos = m.edificios.map((e) => b.edificios[e]).filter((e) => e !== undefined);
      const area = suyos.reduce((s, e) => s + areaDe(e.huella), 0);
      const fuera = suyos.filter((e) => !(e.huella.x0 >= m.solar.x0 && e.huella.x1 <= m.solar.x1 && e.huella.z0 >= m.solar.z0 && e.huella.z1 <= m.solar.z1));
      let sePisan = false;
      for (let a = 0; a < suyos.length; a++) for (let c = a + 1; c < suyos.length; c++) if (solapan((suyos[a] as (typeof suyos)[number]).huella, (suyos[c] as (typeof suyos)[number]).huella)) sePisan = true;
      if (!esGlorieta && (area !== LADO_DEL_SOLAR * LADO_DEL_SOLAR || fuera.length > 0 || sePisan)) mal(6, { manzana: m.indice, area, fuera: fuera.length, sePisan });
    }
    for (const e of b.edificios) {
      const h = e.huella;
      if (h.x1 - h.x0 < 12 || h.z1 - h.z0 < 12 || e.fachadas.length === 0) mal(7, { e: e.indice, h, fachadas: e.fachadas.length });
      const suCaja = cajas[e.caja];
      const fondo = 3;
      const esperada =
        e.soportal === 'norte' ? { ...h, z0: h.z0 + fondo } : e.soportal === 'sur' ? { ...h, z1: h.z1 - fondo } : e.soportal === 'este' ? { ...h, x1: h.x1 - fondo } : e.soportal === 'oeste' ? { ...h, x0: h.x0 + fondo } : h;
      const pilaresBien = e.pilares.every((p) => {
        const c = cajas[p];
        return c !== undefined && c.tipo === 'pilar-de-soportal' && c.edificio === e.indice && c.x0 >= h.x0 && c.x1 <= h.x1 && c.z0 >= h.z0 && c.z1 <= h.z1;
      });
      const soportalBien = e.soportal === null ? e.pilares.length === 0 : e.pilares.length >= 2 && e.fachadas.some((f) => f.cara === e.soportal && f.bajo === 'soportal');
      if (suCaja === undefined || suCaja.tipo !== 'edificio' || suCaja.edificio !== e.indice || !igualQue(esperada, suCaja) || !pilaresBien || !soportalBien) {
        mal(8, { e: e.indice, soportal: e.soportal, caja: suCaja, esperada });
      }
      if (e.soportal !== null) variedad.conSoportal++;
      if (e.tramos.length > 2) variedad.conRetranqueo++;
      const t = e.tramos;
      const seguidos = t.every((x, i) => i === 0 || x.desde === (t[i - 1] as (typeof t)[number]).hasta);
      const entrantes = t.every((x, i) => (i < 2 ? x.entrante === 0 : x.entrante > (t[i - 1] as (typeof t)[number]).entrante));
      if (t.length < 2 || (t[0] as (typeof t)[number]).desde !== 0 || !seguidos || !entrantes || e.alto !== (t[t.length - 1] as (typeof t)[number]).hasta) mal(9, { e: e.indice, tramos: t });
    }

    /* Lo que tiene que estar libre, con el radio de una persona. */
    const libre = (r: Rectangulo): boolean => !cajas.some((c) => solapan(ensanchado(r, RADIO), c));
    const punto = (x: number, z: number): Rectangulo => ({ x0: x, z0: z, x1: x, z1: z });
    for (const zona of b.zonas) {
      if (!libre(zona.caja) || !(zona.caja.x0 < zona.caja.x1 && zona.caja.z0 < zona.caja.z1)) mal(10, { zona: zona.id });
    }
    for (const s of [...b.nace.desvelado, ...b.nace.refugio]) if (!libre(punto(s.x, s.z))) mal(10, { nace: s });
    for (const c of [...b.cabinas, b.refugio]) if (!libre(punto(c.sitio.x, c.sitio.z))) mal(10, { cabina: c.id });

    const deClase = (clase: string): typeof b.zonas => b.zonas.filter((z) => z.clase === clase);
    const ids = new Set(b.zonas.map((z) => z.id));
    const lejosDelCentro = (r: Rectangulo): number => Math.max(Math.abs(r.x0), Math.abs(r.x1), Math.abs(r.z0), Math.abs(r.z1));
    const impresionEnLaPlaza = deClase('impresion').every((z) => z.caja.x0 >= -18 && z.caja.x1 <= 18 && z.caja.z0 >= -18 && z.caja.z1 <= 18);
    /* Las de aparición, a un paso de la glorieta de 60 (las bocas llegan a 33,5); las lejanas, en los cruces de fuera. */
    const aparicionCerca = deClase('aparicion').every((z) => lejosDelCentro(z.caja) <= 34);
    const lejanasLejos = deClase('aparicion-lejana').every((z) => lejosDelCentro(z.caja) >= 69.5);
    const enElBarrio = b.zonas.every((z) => z.caja.x0 >= -DEL_CENTRO_AL_BORDE && z.caja.x1 <= DEL_CENTRO_AL_BORDE && z.caja.z0 >= -DEL_CENTRO_AL_BORDE && z.caja.z1 <= DEL_CENTRO_AL_BORDE);
    if (
      deClase('aparicion').length !== 12 ||
      deClase('aparicion-lejana').length !== 12 ||
      deClase('impresion').length !== 8 ||
      deClase('cabina').length !== 4 ||
      deClase('refugio').length !== 1 ||
      ids.size !== b.zonas.length ||
      b.zonas.length !== 37 ||
      !impresionEnLaPlaza ||
      !aparicionCerca ||
      !lejanasLejos ||
      !enElBarrio
    ) {
      mal(11, { ids: ids.size, aparicionCerca, lejanasLejos });
    }

    const cuadrantes = b.cabinas.map((c) => (c.sitio.z < 0 ? (c.sitio.x > 0 ? 'NE' : 'NO') : c.sitio.x > 0 ? 'SE' : 'SO'));
    const cabinasBien =
      b.cabinas.length === 4 &&
      cuadrantes.join(',') === 'NE,SE,SO,NO' &&
      b.cabinas.every((c, q) => {
        const poste = cajas[c.caja];
        return (
          c.id === `cabina-${String(q + 1)}` &&
          c.zona === c.id &&
          c.distancia >= Math.abs(c.sitio.x) + Math.abs(c.sitio.z) &&
          c.atajando <= c.distancia &&
          c.atajando >= CABINA_DESDE &&
          c.distancia <= CABINA_HASTA &&
          poste !== undefined &&
          poste.tipo === 'cabina' &&
          dentroDe(poste, c.poste.x, c.poste.z)
        );
      });
    if (!cabinasBien) mal(12, b.cabinas.map((c) => ({ id: c.id, sitio: c.sitio, distancia: c.distancia, atajando: c.atajando })));
    for (const c of b.cabinas) {
      variedad.distancias.push(c.distancia);
      if (c.atajando < c.distancia) variedad.atajos++;
    }
    for (const c of b.cabinas) {
      const z = b.zonas.find((x) => x.id === c.zona);
      const esquinas = z === undefined ? [] : [[z.caja.x0, z.caja.z0], [z.caja.x1, z.caja.z0], [z.caja.x0, z.caja.z1], [z.caja.x1, z.caja.z1]];
      const lejos = esquinas.filter(([x, zz]) => ((x as number) - c.poste.x) ** 2 + ((zz as number) - c.poste.z) ** 2 > 1.5 * 1.5);
      if (z === undefined || lejos.length > 0 || !dentroDe(z.caja, c.sitio.x, c.sitio.z)) mal(13, { cabina: c.id, zona: z?.caja, poste: c.poste });
    }
    const r = b.refugio;
    const zonaRefugio = b.zonas.find((z) => z.id === 'refugio');
    const alBorde = Math.max(Math.abs(r.poste.x), Math.abs(r.poste.z)) >= 16 && Math.max(Math.abs(r.poste.x), Math.abs(r.poste.z)) <= 18;
    if (
      !alBorde ||
      zonaRefugio === undefined ||
      !b.nace.refugio.every((s) => dentroDe(zonaRefugio.caja, s.x, s.z) && Math.abs(s.x) <= 24 && Math.abs(s.z) <= 24) ||
      b.nace.refugio.length !== 3 ||
      cajas[r.caja]?.tipo !== 'cabina'
    ) {
      mal(14, { refugio: r, zona: zonaRefugio?.caja });
    }
    const rumbos = new Set(b.nace.desvelado.map((s) => s.rumbo));
    if (b.nace.desvelado.length !== 6 || rumbos.size !== 6 || !b.nace.desvelado.every((s) => Math.abs(s.x) < 18 && Math.abs(s.z) < 18)) mal(15, b.nace.desvelado);

    const limite = (idl: string): Rectangulo | undefined => b.limites.find((l) => l.id === idl)?.caja;
    const cuadra = (rr: Rectangulo | undefined, m: number): boolean => rr !== undefined && rr.x0 === -m && rr.z0 === -m && rr.x1 === m && rr.z1 === m;
    if (b.limites.length !== 3 || !cuadra(limite('glorieta48'), 24) || !cuadra(limite('glorieta60'), GLORIETA_60) || !cuadra(limite('barrio'), DEL_CENTRO_AL_BORDE)) mal(16, b.limites);

    /*
     * El grafo: los 16 cruces delante (fila × 4 + columna) y las 24 calles de cruce a cruce, con su
     * tramo; detrás, aristas en línea con un eje, de largo exacto, sin bucles ni repetidas; nudos
     * DENTRO de la plaza (la primera versión no tenía ninguno: ése fue el hallazgo) y todos unidos.
     */
    const g = b.grafo;
    const cruces = g.nudos.slice(0, 16).every((n, i) => n.x === EJES[i % 4] && n.z === EJES[Math.floor(i / 4)]);
    const calles = g.aristas.slice(0, 24).every((a) => {
      const t = a.tramo === null ? undefined : b.calles[a.tramo];
      const p = g.nudos[a.a];
      const q = g.nudos[a.b];
      return t !== undefined && p !== undefined && q !== undefined && t.cruces[0] === a.a && t.cruces[1] === a.b && a.largo === 48 && Math.abs(p.x - q.x) + Math.abs(p.z - q.z) === 48 && (p.x === q.x || p.z === q.z);
    });
    const vistas = new Set<string>();
    let rejillaBien = true;
    for (const a of g.aristas.slice(24)) {
      const p = g.nudos[a.a];
      const q = g.nudos[a.b];
      const llave = a.a < a.b ? `${String(a.a)}-${String(a.b)}` : `${String(a.b)}-${String(a.a)}`;
      if (p === undefined || q === undefined || a.a === a.b || a.tramo !== null || vistas.has(llave) || !(p.x === q.x || p.z === q.z) || a.largo !== Math.abs(p.x - q.x) + Math.abs(p.z - q.z) || a.largo <= 0) rejillaBien = false;
      vistas.add(llave);
    }
    const enLaPlaza = g.nudos.filter((n) => Math.abs(n.x) < 18 && Math.abs(n.z) < 18).length;
    const dentro = g.nudos.every((n) => Math.abs(n.x) < DEL_CENTRO_AL_BORDE && Math.abs(n.z) < DEL_CENTRO_AL_BORDE);
    const vecinos: number[][] = g.nudos.map(() => []);
    for (const a of g.aristas) {
      vecinos[a.a]?.push(a.b);
      vecinos[a.b]?.push(a.a);
    }
    const unidos = new Set([0]);
    const cola = [0];
    while (cola.length > 0) {
      const u = cola.pop() as number;
      for (const v of vecinos[u] ?? []) {
        if (unidos.has(v)) continue;
        unidos.add(v);
        cola.push(v);
      }
    }
    if (g.nudos.length <= 16 || g.aristas.length <= 24 || !cruces || !calles || !rejillaBien || enLaPlaza < 40 || !dentro || unidos.size !== g.nudos.length) {
      mal(17, { nudos: g.nudos.length, aristas: g.aristas.length, cruces, calles, rejillaBien, enLaPlaza, dentro, unidos: unidos.size });
    }

    const ac = b.aceras;
    const pasos = ac.tramos.filter((t) => t.tipo === 'paso');
    const porCruce = new Array<number>(16).fill(0);
    let pasosBien = true;
    for (const t of pasos) {
      if (t.cruce === null) {
        pasosBien = false;
        continue;
      }
      porCruce[t.cruce] = (porCruce[t.cruce] ?? 0) + 1;
      const p = ac.nudos[t.a];
      const q = ac.nudos[t.b];
      const cruce = g.nudos[t.cruce];
      if (p === undefined || q === undefined || cruce === undefined) {
        pasosBien = false;
        continue;
      }
      const mx = (p.x + q.x) / 2;
      const mz = (p.z + q.z) / 2;
      /* Un paso cruza la calzada de su cruce: su punto medio está en el eje de la calle que cruza, a 5 m del cruce. */
      const cruza = t.eje === 'x' ? mx === cruce.x && Math.abs(mz - cruce.z) === 5 : mz === cruce.z && Math.abs(mx - cruce.x) === 5;
      if (!cruza || t.largo !== 10) pasosBien = false;
    }
    const tocados = new Set([0]);
    for (let vuelta = 0; vuelta < 64; vuelta++) {
      for (const t of ac.tramos) {
        if (!tocados.has(t.a) && !tocados.has(t.b)) continue;
        tocados.add(t.a);
        tocados.add(t.b);
      }
    }
    const nudosDeAcera = ac.nudos.length === 64 && ac.nudos.every((n, i) => n.x === CARRILES[i % 8] && n.z === CARRILES[Math.floor(i / 8)]);
    if (!nudosDeAcera || ac.tramos.length !== 112 || pasos.length !== 64 || !porCruce.every((n) => n === 4) || !pasosBien || tocados.size !== 64 || ac.semaforos.length !== 16 || !ac.semaforos.every((s) => s >= 0 && s < CICLO_DEL_SEMAFORO)) {
      mal(18, { pasos: pasos.length, porCruce, pasosBien, tocados: tocados.size });
    }

    const tr = b.tren;
    variedad.ejesDelTren.add(tr.eje);
    const pilares = tr.pilares.map((p) => cajas[p]);
    const enLinea = pilares.every((c) => c !== undefined && c.tipo === 'pilar-del-tren' && (tr.eje === 'x' ? (c.z0 + c.z1) / 2 === tr.linea : (c.x0 + c.x1) / 2 === tr.linea) && c.x0 >= -18 && c.x1 <= 18 && c.z0 >= -18 && c.z1 <= 18);
    let trenBien = pilares.length === 4 && enLinea && tr.cadaTics >= 700 && tr.cadaTics <= 900 && tr.desfaseTics >= 0 && tr.desfaseTics < tr.cadaTics;
    let pasa = 0;
    for (let t = 0; t < 2000; t += 7) {
      const en = trenEn(b, t);
      if (en === null) continue;
      pasa++;
      if (en.cabeza < tr.desde || en.cabeza > tr.hasta || en.cola < tr.desde || en.cola > tr.hasta) trenBien = false;
    }
    if (!trenBien || pasa === 0) mal(19, { tren: tr, pasa });

    const a = b.adorno;
    variedad.tiempos.add(a.tiempo);
    variedad.nombres.add(a.nombre);
    const hora = `${String(a.hora.h)}:${a.hora.m < 10 ? '0' : ''}${String(a.hora.m)}`;
    const adornoBien =
      ['llovizna', 'aguacero', 'niebla'].includes(a.tiempo) &&
      a.hora.h >= 1 &&
      a.hora.h <= 4 &&
      a.hora.m >= 0 &&
      a.hora.m <= 59 &&
      NOMBRES_DE_GLORIETA.map((n) => `Glorieta ${n}`).includes(a.nombre) &&
      a.rotulo === `${a.nombre}, ${hora}`;
    if (!adornoBien) mal(20, { tiempo: a.tiempo, hora: a.hora, nombre: a.nombre, rotulo: a.rotulo });

    /*
     * Un rótulo de tienda va ENTERO sobre la pared de la planta baja de su edificio —la caja con la
     * que se choca, que es la que pinta la ciudad—: en el plano de esa cara de la caja y con su
     * ancho dentro de lo que la caja mide a lo largo. La primera versión miraba la fachada entera, y
     * al lado de un soportal la planta baja es 3 m más corta: 306 rótulos colgaban sobre el hueco.
     */
    const textos = a.rotulos.map((x) => x.texto);
    let rotulosBien = new Set(textos).size === textos.length && a.rotulos.length >= 8;
    const colgando: unknown[] = [];
    for (const x of a.rotulos) {
      const e = b.edificios[x.edificio];
      const f = e?.fachadas.find((ff) => ff.cara === x.cara);
      const bajo = e === undefined ? undefined : cajas[e.caja];
      const lista = x.clase === 'tienda' ? ROTULOS_DE_TIENDA : ROTULOS_DE_NEON;
      if (e === undefined || f === undefined || bajo === undefined || !lista.includes(x.texto) || x.y <= 0 || x.ancho <= 0 || x.alto <= 0) {
        rotulosBien = false;
        continue;
      }
      const porX = f.cara === 'norte' || f.cara === 'sur';
      const [enPlano, aLoLargo] = porX ? [x.z, x.x] : [x.x, x.z];
      if (x.clase === 'tienda') {
        const plano = f.cara === 'norte' ? bajo.z0 : f.cara === 'sur' ? bajo.z1 : f.cara === 'este' ? bajo.x1 : bajo.x0;
        const [p0, p1] = porX ? [bajo.x0, bajo.x1] : [bajo.z0, bajo.z1];
        if (f.bajo === 'portales' || enPlano !== plano || aLoLargo - x.ancho / 2 < p0 || aLoLargo + x.ancho / 2 > p1) {
          rotulosBien = false;
          colgando.push({ texto: x.texto, cara: x.cara, de: aLoLargo - x.ancho / 2, a: aLoLargo + x.ancho / 2, pared: [p0, p1] });
        }
      } else if (enPlano !== f.linea || aLoLargo < f.desde || aLoLargo > f.hasta) {
        rotulosBien = false;
      }
    }
    if (!rotulosBien) mal(21, { rotulos: a.rotulos.length, textos: textos.length, colgando: colgando.slice(0, 2) });

    /*
     * Lo despejable: los coches de la acera de la plaza (los que caen dentro de ±24) y los bancos del
     * borde (a 16 o más del centro); ni un coche de otra calle, ni un banco del anillo, ni el quiosco.
     */
    const despejables = cajas.filter((c) => c.despejable);
    const cochesDePlaza = cajas.filter((c) => c.tipo === 'coche' && lejosDelCentro(c) <= 24);
    const bancosDelBorde = cajas.filter((c) => c.tipo === 'banco' && lejosDelCentro(c) >= 16);
    const esperadas = new Set([...cochesDePlaza, ...bancosDelBorde]);
    if (despejables.length !== esperadas.size || !despejables.every((c) => esperadas.has(c)) || cochesDePlaza.length < 2 || cochesDePlaza.length > 3 || bancosDelBorde.length < 2 || bancosDelBorde.length > 4) {
      mal(22, { despejables: despejables.map((c) => c.tipo), coches: cochesDePlaza.length, bancos: bancosDelBorde.length });
    }
    variedad.cochesDePlaza.add(cochesDePlaza.length);
    variedad.bancosDelBorde.add(bancosDelBorde.length);

    /*
     * La plaza despejada: las cajas que quedan son las mismas y en el mismo orden; todo índice
     * (edificio, pilares, cabinas, refugio, tren) apunta a la MISMA caja que antes; lo demás no
     * cambia; y despejar lo despejado no hace nada.
     */
    const d = despejarLaPlaza(b);
    const quedan = cajas.filter((c) => !c.despejable);
    const mismaCaja = (i: number, j: number): boolean => cajas[i] !== undefined && d.cajas[j] === cajas[i];
    const renumerado =
      d.edificios.every((e, i) => {
        const o = b.edificios[i];
        return o !== undefined && mismaCaja(o.caja, e.caja) && e.pilares.length === o.pilares.length && e.pilares.every((p, k) => mismaCaja(o.pilares[k] as number, p));
      }) &&
      d.cabinas.every((c, i) => mismaCaja((b.cabinas[i] as (typeof b.cabinas)[number]).caja, c.caja)) &&
      mismaCaja(b.refugio.caja, d.refugio.caja) &&
      d.tren.pilares.every((p, i) => mismaCaja(b.tren.pilares[i] as number, p));
    const sinIndices = (x: Barrio): string =>
      huella({ ...x, plazaDespejada: null, cajas: null, edificios: x.edificios.map((e) => ({ ...e, caja: 0, pilares: [] })), cabinas: x.cabinas.map((c) => ({ ...c, caja: 0 })), refugio: { ...x.refugio, caja: 0 }, tren: { ...x.tren, pilares: [] } });
    if (
      !d.plazaDespejada ||
      b.plazaDespejada ||
      d.cajas.length !== quedan.length ||
      !d.cajas.every((c, i) => c === quedan[i]) ||
      !renumerado ||
      sinIndices(d) !== sinIndices(b) ||
      despejarLaPlaza(d) !== d
    ) {
      mal(23, { cajas: d.cajas.length, quedan: quedan.length, renumerado });
    }

    variedad.quioscos += cajas.filter((c) => c.tipo === 'quiosco-de-prensa').length;
  }

  for (const regla of REGLAS) comprobar(regla, !fallos.has(regla), fallos.get(regla));

  const dist = variedad.distancias;
  const TIPOS: TipoDeCaja[] = ['edificio', 'pilar-de-soportal', 'fachada-exterior', 'valla', 'fuente', 'quiosco', 'banco', 'pilar-del-tren', 'farola', 'coche', 'quiosco-de-prensa', 'cabina'];
  nota(
    `200 barrios: ${String(variedad.nombres.size)} nombres, tiempos ${[...variedad.tiempos].join('/')}, ` +
      `edificios por manzana ${[...variedad.porManzana].sort().join('/')}, ${String(variedad.conSoportal)} soportales, ` +
      `${String(variedad.conRetranqueo)} edificios con retranqueo, ${String(variedad.quioscos)} quioscos, cabinas de ${String(Math.min(...dist))} a ${String(Math.max(...dist))} m ` +
      `(${String(variedad.atajos)} que se pueden atajar)`,
  );
  comprobar('SUELO: salen cajas de todos los tipos', TIPOS.every((t) => variedad.tipos.has(t)), TIPOS.filter((t) => !variedad.tipos.has(t)));
  comprobar(
    'y las 200 noches dan variedad de verdad: los tres tiempos, 20 nombres o más, manzanas de 2, 3 y 4 edificios, los dos ejes del tren, dos o tres coches en la plaza y de dos a cuatro bancos en su borde',
    variedad.tiempos.size === 3 &&
      variedad.nombres.size >= 20 &&
      variedad.porManzana.size === 3 &&
      variedad.ejesDelTren.size === 2 &&
      variedad.cochesDePlaza.size === 2 &&
      variedad.bancosDelBorde.size === 3,
    { tiempos: [...variedad.tiempos], nombres: variedad.nombres.size, porManzana: [...variedad.porManzana], coches: [...variedad.cochesDePlaza], bancos: [...variedad.bancosDelBorde] },
  );
  comprobar('soportales, retranqueos y quioscos en cantidad, no de milagro', variedad.conSoportal >= 200 && variedad.conRetranqueo >= 500 && variedad.quioscos >= 400, variedad);
  comprobar('y cabinas cerca y lejos: de menos de 70 m a más de 100, y alguna que se puede atajar', Math.min(...dist) < 70 && Math.max(...dist) > 100 && variedad.atajos > 0, { min: Math.min(...dist), max: Math.max(...dist), atajos: variedad.atajos });
}

// ---------------------------------------------------------------------------
paso('3 · Se anda y se navega: arenaDe(mundoDelBarrio), la Liza, la búsqueda en anchura y el grafo');
// ---------------------------------------------------------------------------

/** La rejilla de la búsqueda: cada medio metro de −79 a 79. */
const PASO_DE_REJILLA = 0.5;
const DESDE = -79;
const NUDOS_POR_LADO = Math.round((2 * 79) / PASO_DE_REJILLA) + 1;
const coord = (i: number): number => DESDE + i * PASO_DE_REJILLA;
const indiceDe = (v: number): number => Math.round((v - DESDE) / PASO_DE_REJILLA);

/** Dónde cabe una persona, nudo a nudo de la rejilla. */
function loLibre(arena: Arena): Uint8Array {
  const n = NUDOS_POR_LADO;
  const libre = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) libre[j * n + i] = sePuedeEstar(arena, deNumero(coord(i)), deNumero(coord(j)), RADIO_EN_FIJO) ? 1 : 0;
  return libre;
}

/**
 * LO ANDADO desde unas semillas, en pasos de la rejilla, por nudos libres y en cuatro direcciones:
 * la distancia por calles (metros de x más metros de z) que se anda de verdad. Cada semilla sale con
 * su distancia de partida, así que es un Dijkstra con cubos, que con pasos enteros es exacto.
 */
function andarDesde(libre: Uint8Array, semillas: readonly { k: number; d: number }[]): Int32Array {
  const n = NUDOS_POR_LADO;
  const distancia = new Int32Array(n * n).fill(-1);
  const cubos: number[][] = [];
  for (const s of semillas) if (libre[s.k] === 1) (cubos[s.d] ??= []).push(s.k);
  const meter = (v: number, d: number): void => {
    if (libre[v] === 1 && distancia[v] === -1) (cubos[d] ??= []).push(v);
  };
  for (let d = 0; d < cubos.length; d++) {
    const cubo = cubos[d];
    if (cubo === undefined) continue;
    for (let c = 0; c < cubo.length; c++) {
      const k = cubo[c] as number;
      if (distancia[k] !== -1) continue;
      distancia[k] = d;
      const i = k % n;
      if (i > 0) meter(k - 1, d + 1);
      if (i < n - 1) meter(k + 1, d + 1);
      if (k >= n) meter(k - n, d + 1);
      if (k < n * (n - 1)) meter(k + n, d + 1);
    }
  }
  return distancia;
}

/**
 * ¿Se llega andando a este punto? Se busca un nudo alcanzado a medio metro o menos desde el que se
 * vaya en línea recta hasta él (los puntos del barrio van en cuartos; la rejilla, en medios). Da
 * la distancia andada en metros, o −1.
 */
function seLlegaA(arena: Arena, distancia: Int32Array, x: number, z: number): number {
  let mejor = -1;
  for (const dx of [-0.5, -0.25, 0, 0.25, 0.5]) {
    for (const dz of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const nx = x + dx;
      const nz = z + dz;
      if ((nx - DESDE) % PASO_DE_REJILLA !== 0 || (nz - DESDE) % PASO_DE_REJILLA !== 0) continue;
      const k = indiceDe(nz) * NUDOS_POR_LADO + indiceDe(nx);
      const d = distancia[k];
      if (d === undefined || d < 0) continue;
      if (!seAndaEnRecta(arena, { x: deNumero(nx), z: deNumero(nz) }, { x: deNumero(x), z: deNumero(z) }, RADIO_EN_FIJO)) continue;
      const metros = d * PASO_DE_REJILLA + Math.abs(dx) + Math.abs(dz);
      if (mejor < 0 || metros < mejor) mejor = metros;
    }
  }
  return mejor;
}

/** ¿Se anda en recta de A a B con el cuerpo de una persona? La prueba de losa de la Liza, exacta. */
function seVe(arena: Arena, ax: number, az: number, bx: number, bz: number): boolean {
  return primeraLosa(arena.cuerpos, deNumero(ax), deNumero(az), deNumero(bx), deNumero(bz), RADIO_EN_FIJO) === null;
}

/**
 * ¿Ve (x, z) algún nudo de `nudos` a `hasta` metros por calles o menos? Se prueban del más cercano
 * al más lejano, y casi siempre el primero se ve: por eso se van sacando de uno en uno en vez de
 * ordenarlos todos para cada uno de los cien mil puntos que se miran.
 */
function veAlgunNudo(arena: Arena, x: number, z: number, nudos: readonly { readonly x: number; readonly z: number }[], hasta: number): boolean {
  const d = new Float64Array(nudos.length);
  for (let k = 0; k < nudos.length; k++) {
    const n = nudos[k] as { readonly x: number; readonly z: number };
    d[k] = Math.abs(n.x - x) + Math.abs(n.z - z);
  }
  for (;;) {
    let mejor = -1;
    for (let k = 0; k < d.length; k++) if ((d[k] as number) <= hasta && (mejor < 0 || (d[k] as number) < (d[mejor] as number))) mejor = k;
    if (mejor < 0) return false;
    const n = nudos[mejor] as { readonly x: number; readonly z: number };
    if (seVe(arena, x, z, n.x, n.z)) return true;
    d[mejor] = Number.POSITIVE_INFINITY;
  }
}

/**
 * La Liza revisando un mundo. `problemasDeLaDeclaracion` revisa una declaración entera y el mundo
 * va después de los catálogos de estados, portables y proyectiles: con esos tres vacíos llega al
 * mundo, y de lo que diga se toma lo que es del mundo. Que llegue de verdad se comprueba antes con
 * un mundo roto a propósito (ver abajo): si un día la revisión cambiara de orden, eso se pone rojo
 * en vez de dar por bueno un mundo que nadie ha mirado.
 */
function problemasDelMundo(mundo: MundoDeLaLiza): string[] {
  const declaracion = { version: VERSION_DE_LA_DECLARACION, estados: [], portables: [], proyectiles: [], mundo } as unknown as LizaDeclarada;
  return problemasDeLaDeclaracion(declaracion).filter((p) => p.startsWith('mundo.'));
}

{
  const BUSCADAS = BARRIOS.slice(0, 24);
  let mundoBien = true;
  const mundoMal: unknown[] = [];
  const lizaMal: unknown[] = [];
  const noSeLlega: unknown[] = [];
  const bolsas: unknown[] = [];
  const lejos: unknown[] = [];
  const andadas: number[] = [];
  let ocupados = 0;
  let libres = 0;
  const aristasTapadas: unknown[] = [];
  const nudosTapados: unknown[] = [];
  let aristasMiradas = 0;
  const ciegos: unknown[] = [];
  let miradosEnLaGlorieta = 0;

  /* Primero, que la revisión de la Liza mira el mundo de verdad: uno roto tiene que dar sus problemas. */
  {
    const bueno = mundoDeLaLizaDelBarrio(BARRIOS[0] as Barrio);
    const roto: MundoDeLaLiza = { ...bueno, suelo: { ...bueno.suelo, nace: [{ x: 0, z: -4, rumbo: 0 }] }, zonas: [...bueno.zonas, bueno.zonas[0] as MundoDeLaLiza['zonas'][number]] };
    const suyos = problemasDelMundo(roto);
    comprobar(
      'SUELO: la revisión de la Liza ve un mundo roto (nace en el suelo y una zona repetida) antes de creerla con el bueno',
      suyos.some((p) => p.startsWith('mundo.suelo.nace')) && suyos.some((p) => p.startsWith('mundo.zonas')),
      suyos,
    );
  }

  for (const [k, b] of BUSCADAS.entries()) {
    const id = `${b.codigo}#${String(b.noche)}`;
    const mundo = mundoDelBarrio(b);
    const cuerposIguales = mundo.cuerpos.length === b.cajas.length && mundo.cuerpos.every((c, i) => igualQue(c, b.cajas[i]) && Object.keys(c).length === 4);
    const arena = arenaDe(mundo);
    const dentro = deNumero(DEL_CENTRO_AL_BORDE - 0.01);
    const cubre = [[0, 0], [dentro, dentro], [-dentro, dentro], [dentro, -dentro], [-dentro, -dentro]].every(([x, z]) => hayPiso(arena, x as number, z as number));
    const nadaFuera = !hayPiso(arena, deNumero(79.5), 0) && !hayPiso(arena, 0, deNumero(-79.5));
    if (mundo.lado !== 2 || mundo.vados.length !== 0 || mundo.nace.length !== 0 || !cuerposIguales || !cubre || !nadaFuera || porQueNoEsCanonico(mundo) !== null) {
      mundoBien = false;
      mundoMal.push({ id, nace: mundo.nace.length, cuerposIguales, cubre, nadaFuera });
    }

    /*
     * El mundo de la Liza: sin problemas para la Liza, y cada número es el del barrio pasado a
     * Q16.16 sin redondear (el barrio va en cuartos de metro, exactos en coma fija).
     */
    const l = mundoDeLaLizaDelBarrio(b);
    const exacto = (q: number, m: number): boolean => Number.isInteger(q) && q === m * UNO;
    const cajaExacta = (q: Rectangulo, m: Rectangulo): boolean => exacto(q.x0, m.x0) && exacto(q.z0, m.z0) && exacto(q.x1, m.x1) && exacto(q.z1, m.z1);
    const problemas = problemasDelMundo(l);
    const lizaBien =
      problemas.length === 0 &&
      l.metrosPorUnidad === UNO &&
      huella(l.suelo) === huella(mundo) &&
      l.clasesDeCaja.length === b.cajas.length &&
      l.clasesDeCaja.every((c) => c === CLASE_DE_CAJA.alta) &&
      l.zonas.length === b.zonas.length &&
      l.zonas.every((z, i) => {
        const o = b.zonas[i];
        return o !== undefined && z.id === i + 1 && z.id === idDeZonaEnLaLiza(o.id) && z.clase === CLASE_DE_ZONA_EN_LA_LIZA[o.clase] && cajaExacta(z.caja, o.caja);
      }) &&
      new Set(l.zonas.map((z) => z.clase)).size === 5 &&
      l.limites.every((x, i) => {
        const o = b.limites[i];
        return o !== undefined && x.id === ID_DE_LIMITE_EN_LA_LIZA[o.id] && cajaExacta(x.caja, o.caja);
      }) &&
      new Set(l.limites.map((x) => x.id)).size === 3 &&
      l.grafo.nudos.length === b.grafo.nudos.length &&
      l.grafo.nudos.every((n, i) => exacto(n.x, (b.grafo.nudos[i] as (typeof b.grafo.nudos)[number]).x) && exacto(n.z, (b.grafo.nudos[i] as (typeof b.grafo.nudos)[number]).z)) &&
      l.grafo.aristas.length === b.grafo.aristas.length &&
      l.grafo.aristas.every(([u, v], i) => u === b.grafo.aristas[i]?.a && v === b.grafo.aristas[i]?.b) &&
      l.nace.length === 9 &&
      l.nace.filter((s) => s.papel === 'asiento').length === 6 &&
      l.nace.filter((s) => s.papel === 'reaparicion').length === 3 &&
      [...b.nace.desvelado, ...b.nace.refugio].every((s, i) => {
        const q = l.nace[i];
        return q !== undefined && exacto(q.x, s.x) && exacto(q.z, s.z) && q.rumbo === s.rumbo;
      }) &&
      porQueNoEsCanonico(l) === null;
    if (!lizaBien) lizaMal.push({ id, problemas: problemas.slice(0, 3) });

    const libre = loLibre(arena);
    const desdeNacer = andarDesde(
      libre,
      b.nace.desvelado.map((s) => ({ k: indiceDe(s.z) * NUDOS_POR_LADO + indiceDe(s.x), d: 0 })),
    );
    const objetivos: { que: string; x: number; z: number }[] = [
      ...b.cabinas.map((c) => ({ que: c.id, x: c.sitio.x, z: c.sitio.z })),
      { que: 'refugio', x: b.refugio.sitio.x, z: b.refugio.sitio.z },
      ...b.nace.refugio.map((s, i) => ({ que: `renace-${String(i)}`, x: s.x, z: s.z })),
      ...b.zonas.map((z) => ({ que: z.id, x: (z.caja.x0 + z.caja.x1) / 2, z: (z.caja.z0 + z.caja.z1) / 2 })),
      ...b.grafo.nudos.slice(0, 16).map((n, i) => ({ que: `cruce-${String(i)}`, x: n.x, z: n.z })),
    ];
    for (const o of objetivos) if (seLlegaA(arena, desdeNacer, o.x, o.z) < 0) noSeLlega.push({ id, que: o.que, x: o.x, z: o.z });

    /*
     * Lo andado DESDE EL CENTRO, como lo cuenta el diseño: la fuente está en medio, así que se sale
     * de todo el suelo libre a 4 m o menos del centro, cada punto con lo que tiene de x más de z.
     * Cada cabina tiene que quedar entre lo que declara atajando y lo que declara sin atajar, y en
     * 60-110 m. Con UNA holgura, y medida: lo declarado cuenta a quien anda como un punto, y una
     * persona de 0,35 m de radio que dobla por fuera la esquina de una manzana tiene que pasar 0,35
     * más allá y volver, 0,7 m; en la rejilla de medio metro, uno. Se vio en las cabinas de 97,5,
     * que se andan en 98,5 cuando no hay soportal por el que atajar.
     */
    const semillas: { k: number; d: number }[] = [];
    for (let z = -4; z <= 4; z += PASO_DE_REJILLA) for (let x = -4; x <= 4; x += PASO_DE_REJILLA) semillas.push({ k: indiceDe(z) * NUDOS_POR_LADO + indiceDe(x), d: Math.round((Math.abs(x) + Math.abs(z)) / PASO_DE_REJILLA) });
    const desdeElCentro = andarDesde(libre, semillas);
    for (const c of b.cabinas) {
      const pasos = desdeElCentro[indiceDe(c.sitio.z) * NUDOS_POR_LADO + indiceDe(c.sitio.x)] ?? -1;
      const andado = pasos * PASO_DE_REJILLA;
      andadas.push(andado);
      if (pasos < 0 || andado < c.atajando || andado > c.distancia + 1 || andado < CABINA_DESDE || andado > CABINA_HASTA) lejos.push({ id, cabina: c.id, atajando: c.atajando, distancia: c.distancia, andado });
    }

    let sueltos = 0;
    for (let q = 0; q < libre.length; q++) {
      if (libre[q] === 1) libres++;
      else ocupados++;
      if (libre[q] === 1 && desdeNacer[q] === -1) sueltos++;
    }
    if (sueltos > 0) bolsas.push({ id, sueltos });

    /*
     * EL GRAFO, contra el mundo de verdad de esta noche y el de su plaza despejada: cada nudo se
     * pisa y cada arista se anda en recta con el radio de una persona (`seAndaEnRecta`, la pregunta
     * del que valida en `mundo.ts`, que no sabe nada de cómo se hizo el grafo). Y cada punto libre de
     * la glorieta de 60 ve algún nudo con la prueba de losa: por ahí es por donde se pelea.
     */
    for (const bb of [b, despejarLaPlaza(b)]) {
      const ar = bb === b ? arena : arenaDe(mundoDelBarrio(bb));
      const g = bb.grafo;
      for (const n of g.nudos) if (!sePuedeEstar(ar, deNumero(n.x), deNumero(n.z), RADIO_EN_FIJO)) nudosTapados.push({ id, despejada: bb.plazaDespejada, n });
      for (const a of g.aristas) {
        aristasMiradas++;
        const p = g.nudos[a.a] as (typeof g.nudos)[number];
        const q = g.nudos[a.b] as (typeof g.nudos)[number];
        if (!seAndaEnRecta(ar, { x: deNumero(p.x), z: deNumero(p.z) }, { x: deNumero(q.x), z: deNumero(q.z) }, RADIO_EN_FIJO)) aristasTapadas.push({ id, despejada: bb.plazaDespejada, de: p, a: q });
      }
    }
    if (k < 6) {
      for (const bb of [b, despejarLaPlaza(b)]) {
        const ar = bb === b ? arena : arenaDe(mundoDelBarrio(bb));
        const nudos = bb.grafo.nudos.filter((n) => Math.abs(n.x) <= GLORIETA_60 + 6 && Math.abs(n.z) <= GLORIETA_60 + 6);
        for (let z = -GLORIETA_60; z <= GLORIETA_60; z += PASO_DE_REJILLA) {
          for (let x = -GLORIETA_60; x <= GLORIETA_60; x += PASO_DE_REJILLA) {
            if (!sePuedeEstar(ar, deNumero(x), deNumero(z), RADIO_EN_FIJO)) continue;
            miradosEnLaGlorieta++;
            if (!veAlgunNudo(ar, x, z, nudos, 2 * GLORIETA_60)) ciegos.push({ id, despejada: bb.plazaDespejada, x, z });
          }
        }
      }
    }
  }
  nota(
    `${String(BUSCADAS.length)} barrios buscados: ${String(libres)} nudos libres y ${String(ocupados)} ocupados; las cabinas se andan desde el centro en ` +
      `${String(Math.min(...andadas))}-${String(Math.max(...andadas))} m; ${String(aristasMiradas)} aristas del grafo andadas; ${String(miradosEnLaGlorieta)} puntos de la glorieta de 60 mirando un nudo`,
  );
  comprobar('el mundo del barrio es el contrato de mundo.ts: casillas de 2 m que cubren el barrio y nada más, las cajas como cuerpos, y `nace` vacío', mundoBien, mundoMal.slice(0, 3));
  comprobar('el mundo de la Liza no tiene problemas para la Liza, y es el del barrio en Q16.16 exacto, con sus ids, sus clases y el nacer por papel', lizaMal.length === 0, lizaMal.slice(0, 3));
  comprobar('SUELO: la búsqueda choca de verdad (más de un 25 % de los nudos, ocupados)', ocupados > (libres + ocupados) / 4, { libres, ocupados });
  comprobar('desde donde nacen los desvelados se llega andando a las cuatro cabinas, al refugio, a todas las zonas y a los 16 cruces', noSeLlega.length === 0, noSeLlega.slice(0, 5));
  comprobar('andando desde el centro, cada cabina queda entre lo que declara atajando y sin atajar, y en 60-110 m', lejos.length === 0, lejos.slice(0, 5));
  comprobar('no hay bolsas: todo el suelo libre del barrio se alcanza', bolsas.length === 0, bolsas.slice(0, 5));
  comprobar('cada nudo del grafo se pisa y cada arista se anda en recta, también con la plaza despejada', nudosTapados.length === 0 && aristasTapadas.length === 0, { nudos: nudosTapados.slice(0, 3), aristas: aristasTapadas.slice(0, 3) });
  comprobar('todo el suelo libre de la glorieta de 60 ve algún nudo del grafo, también con la plaza despejada', ciegos.length === 0 && miradosEnLaGlorieta > 100000, { ciegos: ciegos.length, primeros: ciegos.slice(0, 5), mirados: miradosEnLaGlorieta });
}

/*
 * POR EL GRAFO NO SE RODEA MUCHO MÁS QUE ANDANDO. Con la primera versión, de (0, −10) a (0, 10), al
 * otro lado de la fuente, eran 124 m por el grafo contra unos 26 andando. Aquí, en seis noches y la
 * plaza despejada de una, entre puntos libres de la glorieta de 60 que no se ven: el camino por el
 * grafo —en recta al nudo que se ve, por aristas, en recta al final— frente a lo que se anda, los
 * dos en metros de x más metros de z. Y los tres casos de la revisión, con nombre.
 */
{
  const peores: { id: string; de: number[]; a: number[]; grafo: number; andado: number }[] = [];
  let pares = 0;
  let peorRazon = 0;
  const casos: string[] = [];
  const noches = [...BARRIOS.slice(0, 6), despejarLaPlaza(BARRIOS[1] as Barrio)];
  for (const b of noches) {
    const id = `${b.codigo}#${String(b.noche)}${b.plazaDespejada ? ' despejada' : ''}`;
    const arena = arenaDe(mundoDelBarrio(b));
    const libre = loLibre(arena);
    const g = b.grafo;
    /* Floyd-Warshall sobre los nudos del grafo, con el largo (exacto) de cada arista. */
    const n = g.nudos.length;
    const D = new Float64Array(n * n).fill(Number.POSITIVE_INFINITY);
    for (let i = 0; i < n; i++) D[i * n + i] = 0;
    for (const a of g.aristas) {
      D[a.a * n + a.b] = Math.min(D[a.a * n + a.b] as number, a.largo);
      D[a.b * n + a.a] = Math.min(D[a.b * n + a.a] as number, a.largo);
    }
    for (let m = 0; m < n; m++) {
      for (let i = 0; i < n; i++) {
        const im = D[i * n + m] as number;
        if (im === Number.POSITIVE_INFINITY) continue;
        for (let j = 0; j < n; j++) {
          const v = im + (D[m * n + j] as number);
          if (v < (D[i * n + j] as number)) D[i * n + j] = v;
        }
      }
    }
    const cercanos = (x: number, z: number): { i: number; d: number }[] =>
      g.nudos
        .map((p, i) => ({ i, d: Math.abs(p.x - x) + Math.abs(p.z - z) }))
        .filter((v) => v.d <= 24 && seVe(arena, x, z, (g.nudos[v.i] as (typeof g.nudos)[number]).x, (g.nudos[v.i] as (typeof g.nudos)[number]).z));
    const porElGrafo = (ax: number, az: number, bx: number, bz: number): number => {
      let mejor = Number.POSITIVE_INFINITY;
      const va = cercanos(ax, az);
      const vb = cercanos(bx, bz);
      for (const u of va) for (const v of vb) mejor = Math.min(mejor, u.d + (D[u.i * n + v.i] as number) + v.d);
      return mejor;
    };
    /* Puntos de salida: los libres de la glorieta de 60 de una rejilla de 3,5 m, y de llegada, de 5 m. */
    const salidas: [number, number][] = [];
    for (let z = -28; z <= 28; z += 3.5) for (let x = -28; x <= 28; x += 3.5) if (libre[indiceDe(z) * NUDOS_POR_LADO + indiceDe(x)] === 1) salidas.push([x, z]);
    const llegadas: [number, number][] = [];
    for (let z = -27.5; z <= 27.5; z += 5) for (let x = -27.5; x <= 27.5; x += 5) if (libre[indiceDe(z) * NUDOS_POR_LADO + indiceDe(x)] === 1) llegadas.push([x, z]);
    const mirar = (ax: number, az: number, destinos: readonly [number, number][], dist: Int32Array): void => {
      for (const [bx, bz] of destinos) {
        if (seVe(arena, ax, az, bx, bz)) continue;
        const pasos = dist[indiceDe(bz) * NUDOS_POR_LADO + indiceDe(bx)] ?? -1;
        if (pasos < 0) continue;
        pares++;
        const andado = pasos * PASO_DE_REJILLA;
        const grafo = porElGrafo(ax, az, bx, bz);
        peorRazon = Math.max(peorRazon, grafo / andado);
        if (!(grafo <= 1.5 * andado + 4)) peores.push({ id, de: [ax, az], a: [bx, bz], grafo, andado });
      }
    };
    for (let s = 0; s < salidas.length; s += 3) {
      const [ax, az] = salidas[s] as [number, number];
      mirar(ax, az, llegadas, andarDesde(libre, [{ k: indiceDe(az) * NUDOS_POR_LADO + indiceDe(ax), d: 0 }]));
    }
    if (b === BARRIOS[0]) {
      for (const [ax, az, bx, bz] of [[-10, 0, 10, 0], [0, -10, 0, 10], [-8, -8, 8, 8]] as const) {
        const dist = andarDesde(libre, [{ k: indiceDe(az) * NUDOS_POR_LADO + indiceDe(ax), d: 0 }]);
        const andado = (dist[indiceDe(bz) * NUDOS_POR_LADO + indiceDe(bx)] ?? -1) * PASO_DE_REJILLA;
        const grafo = porElGrafo(ax, az, bx, bz);
        casos.push(`(${String(ax)},${String(az)})→(${String(bx)},${String(bz)}): ${String(grafo)} por el grafo, ${String(andado)} andando`);
        if (!(grafo <= 1.5 * andado + 4)) peores.push({ id, de: [ax, az], a: [bx, bz], grafo, andado });
      }
    }
  }
  nota(`los casos de la revisión en ${(BARRIOS[0] as Barrio).codigo}: ${casos.join('; ')}; ${String(pares)} pares tapados, el peor a ${peorRazon.toFixed(2)} veces lo andado`);
  comprobar('por el grafo no se rodea más de vez y media lo andado (más 4 m), en la glorieta de 60 y en los casos de la revisión', peores.length === 0 && pares > 2000 && casos.length === 3, { peores: peores.slice(0, 5), pares });
}

/*
 * Y FUERA DE LA GLORIETA, en la Llamada: el grafo no promete verse desde todas partes —pegado a un
 * coche o a una farola de una calle de fuera puede no verse ningún nudo, y la Liza va entonces en
 * recta y resbala hasta verlo—, pero casi. Se mide cada metro en cuatro noches.
 */
{
  let mirados = 0;
  let ciegos = 0;
  for (const b of BARRIOS.slice(0, 4)) {
    const arena = arenaDe(mundoDelBarrio(b));
    const nudos = b.grafo.nudos;
    for (let z = -77; z <= 77; z += 1) {
      for (let x = -77; x <= 77; x += 1) {
        if (Math.abs(x) <= GLORIETA_60 && Math.abs(z) <= GLORIETA_60) continue;
        if (!sePuedeEstar(arena, deNumero(x), deNumero(z), RADIO_EN_FIJO)) continue;
        mirados++;
        if (!veAlgunNudo(arena, x, z, nudos, 40)) ciegos++;
      }
    }
  }
  nota(`fuera de la glorieta de 60: ${String(ciegos)} de ${String(mirados)} puntos sin ningún nudo a la vista (${((100 * ciegos) / mirados).toFixed(2)} %)`);
  comprobar('fuera de la glorieta de 60, el 97 % del suelo libre ve algún nudo', mirados > 20000 && ciegos <= mirados * 0.03, { ciegos, mirados });
}

// ---------------------------------------------------------------------------
paso('4 · Los 48 durmientes');
// ---------------------------------------------------------------------------

{
  /* El guion, en todas las mesas: bien formado. */
  const guionMal: unknown[] = [];
  const tamanos = new Set<number>();
  for (const b of BARRIOS.slice(0, 60)) {
    const g = guionDeLosDurmientes(b);
    const suma = g.cuadrillas.reduce((s, c) => s + c.miembros, 0);
    const puestosBien = g.durmientes.every((d) => {
      const c = g.cuadrillas[d.cuadrilla];
      return c !== undefined && d.puesto >= 0 && d.puesto < c.miembros && d.cuerpo >= 0 && d.cuerpo <= 1 && d.ropa >= 0 && d.ropa <= 3 && (b.adorno.tiempo !== 'niebla' || !d.paraguas);
    });
    for (const c of g.cuadrillas) tamanos.add(c.miembros);
    const vueltasBien = g.cuadrillas.every((c) => {
      const t = c.trozos;
      let arco = 0;
      const seguidos = t.every((x, i) => (i === 0 ? x.desde === 0 : x.desde === (t[i - 1] as (typeof t)[number]).hasta) && x.hasta > x.desde);
      const andados = c.andados.every((k) => {
        const x = t[k];
        if (x === undefined || x.hace !== ANDA || x.arco !== arco || x.hasta - x.desde !== Math.ceil(x.largo / c.paso)) return false;
        arco += x.largo;
        return true;
      });
      return (
        c.miembros >= 1 &&
        c.miembros <= 3 &&
        PASOS_POR_TIC.includes(c.paso) &&
        c.periodo % CICLO_DEL_SEMAFORO === 0 &&
        c.desfase >= 0 &&
        c.desfase < c.periodo &&
        seguidos &&
        (t[t.length - 1] as (typeof t)[number]).hasta === c.periodo &&
        andados &&
        arco === c.perimetro
      );
    });
    if (g.durmientes.length !== CUANTOS_DURMIENTES || suma !== CUANTOS_DURMIENTES || !puestosBien || !vueltasBien) guionMal.push({ id: `${b.codigo}#${String(b.noche)}`, n: g.durmientes.length, suma, puestosBien, vueltasBien });
  }
  comprobar('48 durmientes en cuadrillas de 1 a 3, con vueltas de minutos exactos que se leen seguidas', guionMal.length === 0, guionMal.slice(0, 3));
  comprobar('y hay cuadrillas de uno, de dos y de tres', tamanos.has(1) && tamanos.has(2) && tamanos.has(3), [...tamanos]);

  /*
   * Durante 20.000 tics en tres barrios, y 2.000 en veinte más: siempre sobre suelo, fuera de toda
   * caja y dentro del barrio, sin moverse más que su paso en un tic, y mirando a un eje. Y en la
   * CALZADA sólo cruzando por un paso de cebra con su semáforo en verde: se mira tic a tic, no sólo
   * al empezar a cruzar, que es lo que dejó pasar gente en la calzada con el semáforo ya cambiado.
   */
  const LIMITE = deNumero(DEL_CENTRO_AL_BORDE - RADIO);
  const RUMBOS_DE_EJE = new Set([0, 64, 128, 192]);
  const malos: unknown[] = [];
  const saltos: unknown[] = [];
  const enRojoTicATic: unknown[] = [];
  let enLaCalzada = 0;
  let andando = 0;
  let mirados = 0;
  let quietos = 0;
  const plano = new Int32Array(CUANTOS_DURMIENTES * 4);
  const antes = new Int32Array(CUANTOS_DURMIENTES * 4);
  /** La calle (0-3) en cuya calzada cae una coordenada, o −1. */
  const calzadaDe = (v: number): number => EJES.findIndex((e) => Math.abs(v - e) < MEDIA_CALZADA);
  const ejeMasCercano = (v: number): number => {
    let mejor = 0;
    for (let k = 1; k < 4; k++) if (Math.abs(v - (EJES[k] as number)) < Math.abs(v - (EJES[mejor] as number))) mejor = k;
    return mejor;
  };
  const tandas: { b: Barrio; tics: number }[] = [...BARRIOS.slice(0, 3).map((b) => ({ b, tics: 20000 })), ...BARRIOS.slice(3, 23).map((b) => ({ b, tics: 2000 }))];
  for (const { b, tics } of tandas) {
    const arena = arenaDe(mundoDelBarrio(b));
    const g = guionDeLosDurmientes(b);
    const pasoDe = g.durmientes.map((d) => (g.cuadrillas[d.cuadrilla] as (typeof g.cuadrillas)[number]).paso);
    const recorrido = new Array<number>(CUANTOS_DURMIENTES).fill(0);
    for (let t = 0; t <= tics; t++) {
      escribirLosDurmientes(b, t, plano);
      for (let i = 0; i < CUANTOS_DURMIENTES; i++) {
        const x = plano[i * 4] as number;
        const z = plano[i * 4 + 1] as number;
        const rumbo = plano[i * 4 + 2] as number;
        mirados++;
        if (plano[i * 4 + 3] === 1) andando++;
        if (!sePuedeEstar(arena, x, z, RADIO_EN_FIJO) || Math.abs(x) > LIMITE || Math.abs(z) > LIMITE || !RUMBOS_DE_EJE.has(rumbo)) {
          if (malos.length < 5) malos.push({ mesa: b.codigo, t, i, x: x / UNO, z: z / UNO, rumbo });
          else malos.push(null);
        }
        const xm = x / UNO;
        const zm = z / UNO;
        const cx = calzadaDe(xm);
        const cz = calzadaDe(zm);
        if (cx >= 0 || cz >= 0) {
          enLaCalzada++;
          /* En la calzada de la calle que corre por z (cx) se cruza por x, a 5 m del cruce, y al revés. */
          const cruzaPorX = cx >= 0;
          const fila = cruzaPorX ? ejeMasCercano(zm) : cz;
          const columna = cruzaPorX ? cx : ejeMasCercano(xm);
          const desvio = cruzaPorX ? Math.abs(zm - (EJES[fila] as number)) : Math.abs(xm - (EJES[columna] as number));
          const enElPaso = !(cx >= 0 && cz >= 0) && desvio >= 4.625 && desvio <= 5.375;
          if (!enElPaso || !pasoAbierto(b, fila * 4 + columna, cruzaPorX ? 'x' : 'z', t)) {
            if (enRojoTicATic.length < 5) enRojoTicATic.push({ mesa: b.codigo, t, i, x: xm, z: zm, enElPaso });
            else enRojoTicATic.push(null);
          }
        }
        if (t > 0) {
          const d = Math.abs(x - (antes[i * 4] as number)) + Math.abs(z - (antes[i * 4 + 1] as number));
          recorrido[i] = (recorrido[i] as number) + d;
          if (d > (pasoDe[i] as number)) saltos.push({ mesa: b.codigo, t, i, d: d / UNO });
        }
      }
      antes.set(plano);
    }
    if (tics === 20000) quietos += recorrido.filter((r) => r < 50 * UNO).length;
  }
  nota(`${String(mirados)} sitios mirados, ${((100 * andando) / mirados).toFixed(1)} % andando, ${String(enLaCalzada)} en la calzada`);
  comprobar('los durmientes pisan siempre suelo, fuera de toda caja y dentro del barrio, mirando a un eje', malos.length === 0, malos.slice(0, 5));
  comprobar('y no dan saltos: ninguno se mueve en un tic más que su paso', saltos.length === 0, saltos.slice(0, 5));
  comprobar('SUELO: andan de verdad, más del 40 % del tiempo, y cada uno más de 50 m en 20.000 tics', andando > mirados * 0.4 && quietos === 0, { andando, mirados, quietos });
  comprobar(
    `en la calzada sólo se está cruzando por un paso con el semáforo en verde, tic a tic (${String(enLaCalzada)} sitios en la calzada)`,
    enRojoTicATic.length === 0 && enLaCalzada > 20000,
    { vistos: enRojoTicATic.length, primeros: enRojoTicATic.slice(0, 5) },
  );

  /* Y al empezar a cruzar, con 10 s de verde por delante: se mira en el guion, contra el semáforo del barrio. */
  let cruces = 0;
  const sinMargen: unknown[] = [];
  for (const b of BARRIOS.slice(0, 30)) {
    const g = guionDeLosDurmientes(b);
    for (const c of g.cuadrillas) {
      for (const x of c.trozos) {
        if (x.hace !== ANDA || x.cruce === null) continue;
        for (let tic = x.desde - c.desfase; tic < 20000; tic += c.periodo) {
          cruces++;
          const eje = x.dx !== 0 ? 'x' : 'z';
          const fase = faseDelSemaforo(b, x.cruce, tic);
          const queda = eje === 'x' ? VERDE - fase : CICLO_DEL_SEMAFORO - fase;
          if (!pasoAbierto(b, x.cruce, eje, tic) || queda < 200) sinMargen.push({ mesa: b.codigo, tic, cruce: x.cruce, eje, fase });
        }
      }
    }
  }
  comprobar(`se echan a cruzar sólo con su semáforo en verde y 10 s por delante (${String(cruces)} cruces vistos)`, sinMargen.length === 0 && cruces >= 500, sinMargen.slice(0, 5));

  /* Leer el guion es una función del barrio y del tic: da igual por dónde se pregunte. */
  const b = BARRIOS[0] as Barrio;
  const g = guionDeLosDurmientes(b);
  let coinciden = true;
  let periodicos = true;
  for (const t of [0, 1, 777, 5999, 12345, 20000, -1, -4321]) {
    const todos = durmientesEn(b, t);
    for (let i = 0; i < CUANTOS_DURMIENTES; i++) {
      const uno = sitioDelDurmiente(b, i, t);
      const deLista = todos[i];
      if (deLista === undefined || canonico(uno) !== canonico(deLista)) coinciden = false;
      const c = g.cuadrillas[(g.durmientes[i] as (typeof g.durmientes)[number]).cuadrilla] as (typeof g.cuadrillas)[number];
      if (canonico(sitioDelDurmiente(b, i, t + c.periodo)) !== canonico(uno) || canonico(sitioDelDurmiente(b, i, t - 3 * c.periodo)) !== canonico(uno)) periodicos = false;
    }
  }
  comprobar('`sitioDelDurmiente`, `durmientesEn` y `escribirLosDurmientes` dicen lo mismo', coinciden);
  comprobar('y cada uno repite su vuelta exacta, también en tics negativos', periodicos);
  const otroIgual = barrioDeLaNoche(b.codigo, b.noche);
  comprobar(
    'el guion no depende de qué objeto sea el barrio: otro igual da los mismos sitios',
    otroIgual !== b && [0, 999, 17000].every((t) => canonico(durmientesEn(otroIgual, t)) === canonico(durmientesEn(b, t))),
  );

  /*
   * La memoria del guion: una copia del barrio, el mismo derivado otra vez y el despejado REUSAN el
   * guion escrito (el mismo objeto, no uno igual: reescribirlo en cada fotograma era el hallazgo);
   * uno con otros semáforos, aunque se llame igual, NO. La memoria por noche guarda las últimas
   * ocho, y desde el principio del paso se han escrito cincuenta y nueve noches más: se le pide una
   * vez para que ésta sea la reciente, como lo es en un aparato que juega su noche.
   */
  const reciente = guionDeLosDurmientes(barrioDeLaNoche(b.codigo, b.noche));
  const conOtrosSemaforos = { ...b, aceras: { ...b.aceras, semaforos: b.aceras.semaforos.map((s) => (s + 600) % CICLO_DEL_SEMAFORO) } };
  comprobar(
    'el guion se reusa con una copia, con el barrio derivado otra vez y con el despejado, y no con otro de semáforos distintos',
    canonico(reciente) === canonico(g) &&
      guionDeLosDurmientes({ ...b }) === reciente &&
      guionDeLosDurmientes(barrioDeLaNoche(b.codigo, b.noche)) === reciente &&
      guionDeLosDurmientes(despejarLaPlaza(barrioDeLaNoche(b.codigo, b.noche))) === reciente &&
      guionDeLosDurmientes(conOtrosSemaforos) !== reciente &&
      canonico(guionDeLosDurmientes(conOtrosSemaforos)) !== canonico(reciente),
  );

  /* Lo que lanza: un tic que no es número, y un punto que no es Q16.16. */
  const plano48 = new Int32Array(CUANTOS_DURMIENTES * 4);
  comprobar(
    'un tic que no es un número finito lanza, en los durmientes, en el semáforo y en el tren',
    [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].every(
      (t) =>
        lanzaRango(() => durmientesEn(b, t)) &&
        lanzaRango(() => sitioDelDurmiente(b, 0, t)) &&
        lanzaRango(() => escribirLosDurmientes(b, t, plano48)) &&
        lanzaRango(() => durmienteMasCercano(b, t, 0, 0)) &&
        lanzaRango(() => pasoAbierto(b, 0, 'x', t)) &&
        lanzaRango(() => trenEn(b, t)),
    ) && !lanzaRango(() => durmientesEn(b, 12.5)),
  );
  comprobar(
    'el punto del más cercano va en Q16.16: uno con decimales (en metros) o fuera de ±512 m lanza, y uno entero no',
    lanzaRango(() => durmienteMasCercano(b, 0, 12.5, -3.25)) && lanzaRango(() => durmienteMasCercano(b, 0, 600 * UNO, 0)) && !lanzaRango(() => durmienteMasCercano(b, 0, 12 * UNO, -3 * UNO)),
  );

  let cercanoBien = true;
  let desempate = true;
  let h = 7;
  for (let k = 0; k < 400; k++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const t = h % 30000;
    const x = ((h >>> 3) % 150) * UNO - 75 * UNO;
    const z = ((h >>> 9) % 150) * UNO - 75 * UNO;
    const excluidos = k % 3 === 0 ? [0, 5, 17] : [];
    const todos = durmientesEn(b, t);
    let mejor = -1;
    let mejorD = 0;
    todos.forEach((s, i) => {
      if (excluidos.includes(i)) return;
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (mejor < 0 || d < mejorD) {
        mejor = i;
        mejorD = d;
      }
    });
    if (durmienteMasCercano(b, t, x, z, excluidos) !== mejor) cercanoBien = false;
  }
  /*
   * El desempate: dos durmientes y el punto medio exacto entre ellos (enteros, así que la distancia
   * es la misma de verdad), con todos los demás excluidos. Tiene que ganar el de índice menor. Se
   * prueban los primeros cien pares cuyo punto medio cae en un entero.
   */
  let empates = 0;
  const todosEnCien = durmientesEn(b, 100);
  for (let i = 0; i < CUANTOS_DURMIENTES && empates < 100; i++) {
    for (let j = i + 1; j < CUANTOS_DURMIENTES && empates < 100; j++) {
      const p = todosEnCien[i] as (typeof todosEnCien)[number];
      const q = todosEnCien[j] as (typeof todosEnCien)[number];
      if ((p.x + q.x) % 2 !== 0 || (p.z + q.z) % 2 !== 0 || (p.x === q.x && p.z === q.z)) continue;
      empates++;
      const fuera: number[] = [];
      for (let k = 0; k < CUANTOS_DURMIENTES; k++) if (k !== i && k !== j) fuera.push(k);
      if (durmienteMasCercano(b, 100, (p.x + q.x) / 2, (p.z + q.z) / 2, fuera) !== i) desempate = false;
    }
  }
  comprobar('el durmiente más cercano es el más cercano, sin contar los excluidos (400 puntos)', cercanoBien);
  comprobar('a igual distancia gana el de índice menor (100 empates), y sin nadie que elegir no hay nadie', desempate && empates === 100 && durmienteMasCercano(b, 0, 0, 0, Array.from({ length: CUANTOS_DURMIENTES }, (_, i) => i)) === null, { empates });

  /*
   * Los Prestados del principio salen de gente que está cerca: en cualquier noche y en cualquier
   * momento. El guion pone a los veinte primeros en vueltas que no salen de las calles que rodean la
   * plaza (a 58 m como mucho), y se exige eso y no menos: con el suelo en diez, quitar esas vueltas
   * seguía en verde porque el azar ya deja una decena cerca casi siempre.
   */
  let menos = CUANTOS_DURMIENTES;
  for (const otro of BARRIOS.slice(0, 60)) {
    for (const t of [0, 3000, 9000]) {
      let cerca = 0;
      for (const s of durmientesEn(otro, t)) if (Math.abs(s.x) + Math.abs(s.z) <= 60 * UNO) cerca++;
      menos = Math.min(menos, cerca);
    }
  }
  comprobar('hay gente cerca de la glorieta para que salgan Prestados: siempre veinte o más a 60 m por calles', menos >= 20, menos);
}

// ---------------------------------------------------------------------------
paso('5 · Tiempos, en un Node recién arrancado');
// ---------------------------------------------------------------------------

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'quiebro-barrio-'));
const ESBUILD = path.join(REPO, 'node_modules', 'esbuild', 'bin', 'esbuild');
const barra = (p: string): string => p.replace(/\\/g, '/');
const RUTA_DEL_BARRIO = barra(FICHERO_DEL_BARRIO.replace(/\.ts$/, ''));
const RUTA_DE_LOS_DURMIENTES = barra(FICHERO_DE_LOS_DURMIENTES.replace(/\.ts$/, ''));
const RUTA_CANONICO = barra(path.join(REPO, 'shared', 'mecanicas', 'canonico'));

function empaquetar(entrada: string, salida: string, objetivo: string): { bien: boolean; error: string } {
  const hecho = spawnSync(process.execPath, [ESBUILD, entrada, '--bundle', '--format=iife', `--target=${objetivo}`, '--platform=neutral', `--outfile=${salida}`, '--log-level=error'], { encoding: 'utf8' });
  return { bien: hecho.status === 0, error: `${hecho.stderr}`.slice(0, 500) };
}

{
  /*
   * El cronómetro corre en un Node NUEVO, con el paquete que haría el servidor (`--target=node20`,
   * como su `build`): el primer `barrioDeLaNoche` de un proceso es lo que cuesta de verdad, con el
   * código aún sin compilar.
   *
   * SIN barrer la memoria a mano. La primera versión llamaba a `gc()` antes de pulsar, y la
   * revisión midió lo que eso tapaba: sin él, en nueve arranques de cada diez el barrio con su mundo
   * pasaba de 3 ms, porque un barrido de la memoria joven caía dentro. Lo que se mide ahora es lo
   * que pasa de verdad —cargar y derivar—, y lo que se pagó para que quepa es no dejar basura
   * (el grafo y lo que no depende de la noche se hacen al cargar, y la noche sólo pone lo suyo).
   * Se toma el mejor de cinco arranques porque lo que se mide es el barrio y no si la máquina estaba
   * ocupada con otra cosa (esta casa ya se ha comido rojos de cronómetro que eran la máquina); un
   * barrido que cayera SIEMPRE dentro caería en los cinco, así que el mejor no lo esconde. La
   * mediana va en la nota. Y si con cinco alguno de los topes no se cumple, se toman diez más antes
   * de dar el rojo: en esta máquina corren a la vez otros frentes —Blender incluido— y se midió el
   * mismo barrio en 2,4 ms con la máquina tranquila y entre 3 y 6 con ella ocupada. Diez tomas más
   * no esconden nada que el barrio pague siempre: lo que es suyo sale en las quince.
   *
   * Aparte, lo que cuesta CARGAR el módulo (lo que no depende de la noche, y el grafo): una vez por
   * proceso, pero en el WebView de un móvil modesto es varias veces más.
   */
  const entrada = path.join(DIR, 'cronometro.ts');
  fs.writeFileSync(
    entrada,
    `import { barrioDeLaNoche, mundoDelBarrio, mundoDeLaLizaDelBarrio } from '${RUTA_DEL_BARRIO}';\n` +
      `import { guionDeLosDurmientes, durmientesEn } from '${RUTA_DE_LOS_DURMIENTES}';\n` +
      'const t0 = performance.now();\n' +
      "const b = barrioDeLaNoche('QWXYZ', 1);\n" +
      'const t1 = performance.now();\n' +
      'const m = mundoDelBarrio(b);\n' +
      'const t2 = performance.now();\n' +
      'const l = mundoDeLaLizaDelBarrio(b);\n' +
      'const t3 = performance.now();\n' +
      'const g = guionDeLosDurmientes(b);\n' +
      'const t4 = performance.now();\n' +
      'durmientesEn(b, 1234);\n' +
      'const t5 = performance.now();\n' +
      'const muestras: number[] = [];\n' +
      "for (let k = 0; k < 200; k++) { const a = performance.now(); barrioDeLaNoche('M' + String(k), k % 10); muestras.push(performance.now() - a); }\n" +
      'muestras.sort((x, y) => x - y);\n' +
      'console.log(JSON.stringify({ barrio: t1 - t0, mundo: t2 - t1, liza: t3 - t2, guion: t4 - t3, durmientes: t5 - t4, templado: muestras[100], cuerpos: m.cuerpos.length + l.zonas.length, cuadrillas: g.cuadrillas.length }));\n',
    'utf8',
  );
  const paquete = path.join(DIR, 'cronometro.js');
  const hecho = empaquetar(entrada, paquete, 'node20');
  const entradaDeCarga = path.join(DIR, 'carga.ts');
  fs.writeFileSync(
    entradaDeCarga,
    'const t0 = performance.now();\n' +
      `import('${RUTA_DEL_BARRIO}').then((m) => { const t1 = performance.now(); m.barrioDeLaNoche('QWXYZ', 1); console.log(JSON.stringify({ carga: t1 - t0 })); });\n`,
    'utf8',
  );
  const paqueteDeCarga = path.join(DIR, 'carga.js');
  const hechoDeCarga = empaquetar(entradaDeCarga, paqueteDeCarga, 'node20');
  comprobar('los cronómetros se empaquetan', hecho.bien && hechoDeCarga.bien, `${hecho.error}${hechoDeCarga.error}`);
  comprobar('y el cronómetro no barre la memoria a mano', !/\bgc\b/.test(fs.readFileSync(entrada, 'utf8')));
  const tomas: { barrio: number; mundo: number; liza: number; guion: number; durmientes: number; templado: number }[] = [];
  const cargas: number[] = [];
  const TOMAS = 5;
  const TOMAS_CON_LA_MAQUINA_OCUPADA = 15;
  let intentadas = 0;
  const tomar = (cuantas: number): void => {
    for (let k = 0; k < cuantas; k++) {
      intentadas++;
      const r = spawnSync(process.execPath, [paquete], { encoding: 'utf8' });
      const c = spawnSync(process.execPath, [paqueteDeCarga], { encoding: 'utf8' });
      try {
        tomas.push(JSON.parse(r.stdout.trim()) as (typeof tomas)[number]);
        cargas.push((JSON.parse(c.stdout.trim()) as { carga: number }).carga);
      } catch {
        /* Una toma que no dice nada no cuenta; el suelo de abajo lo dice. */
      }
    }
  };
  const mejor = (valores: number[]): number => Math.min(...valores);
  const mediana = (valores: number[]): number => valores.slice().sort((a, c) => a - c)[Math.floor(valores.length / 2)] as number;
  const topes = (): boolean =>
    tomas.length > 0 &&
    mejor(tomas.map((t) => t.barrio + t.mundo)) <= 3 &&
    mejor(tomas.map((t) => t.barrio + t.liza)) <= 5 &&
    mejor(tomas.map((t) => t.guion)) <= 3 &&
    mejor(cargas) <= 10;
  if (hecho.bien && hechoDeCarga.bien) {
    tomar(TOMAS);
    if (!topes()) tomar(TOMAS_CON_LA_MAQUINA_OCUPADA - TOMAS);
  }
  comprobar(`las ${String(intentadas)} tomas dicen algo`, intentadas >= TOMAS && tomas.length === intentadas && cargas.length === intentadas, { intentadas, tomas: tomas.length, cargas: cargas.length });
  if (tomas.length > 0) {
    const conMundo = tomas.map((t) => t.barrio + t.mundo);
    const conLiza = tomas.map((t) => t.barrio + t.liza);
    nota(
      `en frío (mejor de ${String(tomas.length)} y mediana): barrio y su mundo ${mejor(conMundo).toFixed(2)} / ${mediana(conMundo).toFixed(2)} ms, ` +
        `barrio y el mundo de la Liza ${mejor(conLiza).toFixed(2)} / ${mediana(conLiza).toFixed(2)} ms, guion de los durmientes ${mejor(tomas.map((t) => t.guion)).toFixed(2)} ms, ` +
        `primeros 48 sitios ${mejor(tomas.map((t) => t.durmientes)).toFixed(2)} ms; templado, mediana ${mejor(tomas.map((t) => t.templado)).toFixed(3)} ms`,
    );
    nota(`cargar el módulo del barrio: ${mejor(cargas).toFixed(2)} / ${mediana(cargas).toFixed(2)} ms`);
    comprobar('derivar el barrio y su mundo cuesta 3 ms o menos en frío, sin barrer la memoria a mano', mejor(conMundo) <= 3, conMundo);
    comprobar('y con el mundo de la Liza en vez del de mundo.ts, 5 ms o menos (lo que el diseño da a la declaración B)', mejor(conLiza) <= 5, conLiza);
    comprobar('y el guion de los 48 durmientes, otros 3 ms o menos', mejor(tomas.map((t) => t.guion)) <= 3, tomas.map((t) => t.guion));
    comprobar('y cargar el módulo del barrio, 10 ms o menos', mejor(cargas) <= 10, cargas);
  }
}

// ---------------------------------------------------------------------------
paso('6 · El mismo barrio y los mismos durmientes en Node y en Hermes');
// ---------------------------------------------------------------------------

interface Resumen {
  readonly codigo: string;
  readonly noche: number;
  readonly barrio: string;
  readonly mundo: string;
  readonly liza: string;
  readonly despejado: string;
  readonly guion: string;
  readonly durmientes: string;
  readonly cajas: number;
  readonly rotulo: string;
}

function dondeEstaHermes(): string | null {
  const carpeta = path.join(REPO, 'node_modules', 'hermes-engine-cli');
  const candidato =
    process.platform === 'win32'
      ? path.join(carpeta, 'win64-bin', 'hermes.exe')
      : process.platform === 'darwin'
        ? path.join(carpeta, 'osx-bin', 'hermes')
        : path.join(carpeta, 'linux64-bin', 'hermes');
  return fs.existsSync(candidato) ? candidato : null;
}

{
  /*
   * LA TANDA: cuatro mesas, y de cada una la huella del barrio, de su mundo, del de la Liza, del
   * despejado, del guion y de los 48 sitios en nueve tics (con el más cercano, el tren y un
   * semáforo). Se escribe UNA vez; este proceso la importa y los dos motores la corren empaquetada,
   * así que lo que se compara es el mismo código en tres sitios y no tres copias de él.
   */
  const tanda = path.join(DIR, 'tanda.ts');
  fs.writeFileSync(
    tanda,
    `import { canonico } from '${RUTA_CANONICO}';\n` +
      `import { barrioDeLaNoche, despejarLaPlaza, mundoDeLaLizaDelBarrio, mundoDelBarrio, pasoAbierto, trenEn } from '${RUTA_DEL_BARRIO}';\n` +
      `import { durmienteMasCercano, durmientesEn, guionDeLosDurmientes } from '${RUTA_DE_LOS_DURMIENTES}';\n` +
      'function fnv(texto: string): string { let h = 0x811c9dc5; for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }\n' +
      "const MESAS: [string, number][] = [['QWXYZ', 1], ['K7M2P', 3], ['ZZZZZ', 10], ['ABCDE', 7]];\n" +
      'const TICS = [0, 1, 599, 600, 1199, 12345, 20000, 123457, -777];\n' +
      'export function tanda() {\n' +
      '  const salida = [];\n' +
      '  for (const [codigo, noche] of MESAS) {\n' +
      '    const b = barrioDeLaNoche(codigo, noche);\n' +
      "    let d = '';\n" +
      '    for (const t of TICS) {\n' +
      "      for (const s of durmientesEn(b, t)) d += String(s.x) + ',' + String(s.z) + ',' + String(s.rumbo) + (s.anda ? 'a' : 'q') + ';';\n" +
      "      d += '|' + String(durmienteMasCercano(b, t, 0, 0)) + '|' + String(durmienteMasCercano(b, t, 40 * 65536, -20 * 65536, [0, 1, 2]));\n" +
      '      const tren = trenEn(b, t);\n' +
      "      d += '|' + (tren === null ? '-' : String(tren.cabeza) + ':' + String(tren.cola)) + '|' + (pasoAbierto(b, 5, 'x', t) ? '1' : '0');\n" +
      '    }\n' +
      '    const despejado = despejarLaPlaza(b);\n' +
      '    salida.push({ codigo, noche, barrio: fnv(canonico(b)), mundo: fnv(canonico(mundoDelBarrio(b))), liza: fnv(canonico(mundoDeLaLizaDelBarrio(b))), despejado: fnv(canonico(despejado) + canonico(mundoDeLaLizaDelBarrio(despejado))), guion: fnv(canonico(guionDeLosDurmientes(b))), durmientes: fnv(d), cajas: b.cajas.length, rotulo: b.adorno.rotulo });\n' +
      '  }\n' +
      '  return salida;\n' +
      '}\n',
    'utf8',
  );
  const entrada = path.join(DIR, 'entrada.ts');
  fs.writeFileSync(entrada, "import { tanda } from './tanda';\nconst linea = JSON.stringify(tanda());\n// @ts-ignore\nif (typeof print === 'function') print(linea); else console.log(linea);\n", 'utf8');

  let enProceso: Resumen[] = [];
  try {
    const modulo = (await import(pathToFileURL(tanda).href)) as { tanda: () => Resumen[] };
    enProceso = modulo.tanda();
  } catch (e) {
    comprobar('la tanda corre en este proceso', false, e instanceof Error ? e.message : String(e));
  }
  for (const r of enProceso) nota(`${r.codigo}#${String(r.noche)} «${r.rotulo}»: ${String(r.cajas)} cajas · barrio ${r.barrio} · mundo ${r.mundo} · liza ${r.liza} · despejado ${r.despejado} · guion ${r.guion} · durmientes ${r.durmientes}`);

  const hermes = dondeEstaHermes();
  comprobar('el intérprete de Hermes está instalado', hermes !== null, 'falta `hermes-engine-cli`: sin él esto NO compara dos motores, y se pone rojo en vez de saltárselo.');
  const crudo = path.join(DIR, 'tanda.js');
  const hecho = empaquetar(entrada, crudo, 'es2015');
  comprobar('el barrio y los durmientes se empaquetan para los dos motores', hecho.bien, hecho.error);
  let listo = hecho.bien;
  if (listo) {
    /*
     * `class` se baja a funciones una vez, sobre el paquete que corren los dos: Hermes 0.12 no la
     * entiende y `fijo.ts` y `canonico.ts` declaran una cada uno. Es la pasada de `verify:mundo`.
     */
    const NOMBRE_DEL_COMPLEMENTO = '@babel/plugin-transform-classes';
    const bajarClases = (await import(NOMBRE_DEL_COMPLEMENTO)) as { default: unknown };
    const babel = await import('@babel/core');
    const transformado = babel.transformFileSync(crudo, { babelrc: false, configFile: false, compact: false, plugins: [bajarClases.default as babel.PluginItem] });
    const codigo = transformado?.code ?? '';
    listo = codigo.length > 0;
    comprobar('y sus clases se bajan a funciones', listo);
    if (listo) fs.writeFileSync(crudo, codigo, 'utf8');
  }
  if (listo && hermes !== null) {
    const leer = (s: string): Resumen[] | null => {
      try {
        return JSON.parse(s.trim().split('\n').pop() ?? '') as Resumen[];
      } catch {
        return null;
      }
    };
    const enNode = spawnSync(process.execPath, [crudo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const enHermes = spawnSync(hermes, [crudo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    comprobar('Node y Hermes corren el paquete sin caerse', enNode.status === 0 && enHermes.status === 0, { node: enNode.stderr.slice(0, 300), hermes: enHermes.stderr.slice(0, 300) });
    const a = leer(enNode.stdout);
    const h = leer(enHermes.stdout);
    comprobar('SUELO: los dos motores y este proceso devuelven las cuatro mesas', a !== null && h !== null && a.length === 4 && h.length === 4 && enProceso.length === 4, { node: a?.length, hermes: h?.length, proceso: enProceso.length });
    if (a !== null && h !== null) {
      for (let k = 0; k < h.length; k++) nota(`Hermes ${h[k]?.codigo ?? '?'}: barrio ${h[k]?.barrio ?? '?'} · mundo ${h[k]?.mundo ?? '?'} · liza ${h[k]?.liza ?? '?'} · despejado ${h[k]?.despejado ?? '?'} · guion ${h[k]?.guion ?? '?'} · durmientes ${h[k]?.durmientes ?? '?'}`);
      comprobar('el barrio, su mundo, el de la Liza, el despejado, el guion y los sitios de los durmientes dan la MISMA huella en Node y en Hermes', JSON.stringify(a) === JSON.stringify(h), { node: a, hermes: h });
      comprobar('y el paquete da lo mismo que el código sin empaquetar en este proceso', JSON.stringify(a) === JSON.stringify(enProceso), { empaquetado: a, proceso: enProceso });
    }
  }
}

fs.rmSync(DIR, { recursive: true, force: true });

terminar({
  escritas: 84,
  enVerde:
    'El barrio es uno solo, sale de (código, noche) y de nada más, se anda entero y se navega por la plaza,\n' +
    'su mundo vale para la Liza, y sus 48 durmientes no se meten en nada, cruzan en verde y están donde dicen\n' +
    'en Node, en Hermes y en un Node recién arrancado.',
});
