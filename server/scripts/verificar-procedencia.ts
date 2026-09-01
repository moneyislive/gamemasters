/**
 * DE DÓNDE SALE CADA ARCADE, Y QUÉ NOMBRES NO PUEDEN APARECER EN ÉL.
 *
 *   npm run verify:procedencia
 *
 * ═══ QUÉ AFIRMA, Y SON DOS COSAS ═══
 *
 *  1. Que TODO arcade instalado declara su procedencia, y que si dice
 *     `'licenciado'` trae titular, referencia y vigencia de verdad y no en
 *     blanco. Una etiqueta legal que nadie puede auditar es peor que no tener el
 *     campo, porque parece que alguien lo comprobó.
 *  2. Que ninguna marca registrada de la lista negra aparece en lo que se ve: el
 *     nombre del juego, su gancho, sus rótulos y EL CONTENIDO DE SUS BARAJAS.
 *
 * ═══ POR QUÉ LA SEGUNDA MITAD, SI LAS REGLAS SON LIBRES ═══
 *
 * Las reglas y mecánicas de un juego de mesa no son objeto de copyright ni de
 * patente. Lo protegido es la EXPRESIÓN —nombre, marca, arte, textos— y ahí las
 * tiendas son más estrictas que la ley: no hay juicio, hay retirada.
 *
 * En un juego de adivinar palabras la expresión ES la baraja. O sea que el riesgo
 * entero de «La Frente» no está en su motor sino en sus ciento veintiséis cartas,
 * y el peligro concreto está nombrado desde el diseño: que la baraja la escriba un
 * modelo y meta un personaje de un estudio sin que nadie haya tomado una decisión.
 *
 * (Esa cifra decía «ciento veinticuatro» y las cartas eran ciento veintiséis, aquí
 * y en otros dos sitios. Nadie las había contado. Quien las cuenta ahora es
 * `verify:sin-red`, que es el comprobador que sí conoce este juego; éste sigue sin
 * saber qué es una baraja, que es la mitad de su valor.)
 *
 * ═══ LO QUE ESTE VERDE NO DEMUESTRA, Y HAY QUE LEERLO ANTES QUE NADA ═══
 *
 * Su verde dice exactamente una cosa: «nadie ha tecleado, como palabra entera y
 * dentro de una cadena literal, ninguno de los nombres de la lista». Se lee como
 * una garantía y no lo es. Tres huecos concretos, escritos aquí porque el sitio
 * donde se descubren solos es tarde:
 *
 *  · NO VE LA EVOCACIÓN ESTRUCTURAL, que es la mitad del riesgo de verdad. Un
 *    juego puede no nombrar a nadie y ser, pieza por pieza, otro juego con otras
 *    palabras. Eso NO es ilegal —las reglas y las mecánicas no son objeto de
 *    copyright, §8— pero sí es sancionable que su ficha de tienda lo evoque, y ahí
 *    esto no llega. Lo que sí cubre ese riesgo es la defensa entera del §8: nombre
 *    no evocador, arte propio, y la cabecera del juego diciendo sin adornar qué es
 *    suyo y qué es del género. Se lee; no se ejecuta.
 *  · NO VE LO QUE NO ES UNA CADENA LITERAL. `literalesDe` extrae lo que va entre
 *    comillas, así que un nombre de campo o una clave de objeto quedan fuera. Es
 *    lo correcto —lo publicado son textos— pero conviene saberlo antes de dar por
 *    barrido un fichero entero.
 *  · COMPARA PALABRAS ENTERAS, y esa decisión está razonada en `apareceEn` y no se
 *    va a cambiar: sin ella «Lego» casaría dentro de «alegoría» y un comprobador
 *    que da falsos rojos acaba desactivado, que es peor que no tenerlo. Pero
 *    significa que una forma derivada —un verbo sacado de un nombre— no casa con su
 *    entrada aunque la entrada esté puesta.
 *
 * Y la lista es tan buena como lo que lleva escrito: ver el apartado de las FORMAS
 * CASTELLANAS en `marcas-registradas.ts`, que es la mitad que se cuela en un
 * producto en español.
 *
 * ═══ POR QUÉ NO SE AMPLÍA `verify:legal` ═══
 *
 * Porque verifica otra materia por completo: que el aviso legal, la privacidad y
 * los términos —los documentos que exige la LSSI— se sirvan por HTTP sin
 * credenciales, y que su texto no se quede atrás del código. Meterle dentro una
 * lista negra de marcas conflaría dos cosas que no tienen nada que ver, y el día
 * que una se pusiera roja habría que leer la otra para entender por qué.
 *
 * ═══ CÓMO SE CONSIGUE EL CONTENIDO DE UNA BARAJA, SI EL ESTADO ES OPACO ═══
 *
 * Ésta es la parte que hay que explicar despacio, porque la solución evidente
 * está prohibida por el diseño.
 *
 * No se le puede pedir al manifiesto que declare su baraja: el estado de un
 * arcade es OPACO y toda la arquitectura cuelga de que el motor no interprete su
 * forma. Un campo `baraja` en el manifiesto sería el motor sabiendo qué es una
 * carta, y el segundo juego que no tuviera cartas lo dejaría a `[]`.
 *
 * Así que se leen las CADENAS LITERALES de los ficheros de `shared/arcade/juegos/`,
 * que es donde una baraja compilada dentro solo puede estar. No hace falta que el
 * motor sepa qué es una baraja: si en ese árbol hay escrito «Pikachu» en alguna
 * parte, esto salta, sea una carta, un rótulo o el nombre de una variable.
 *
 * Los comentarios NO cuentan, y hace falta decirlo: la cabecera de `frente.ts`
 * nombra a Disney y a Nintendo para explicar por qué NO están en la baraja, y un
 * comprobador que se pusiera rojo por eso empujaría a borrar justamente la
 * explicación que hace falta.
 *
 * LO QUE ESTO NO ALCANZA, dicho antes de que alguien lo dé por hecho: una baraja
 * que llegara de FUERA del binario por el enchufe de la fase 5 no está en ningún
 * fichero de este árbol, así que este barrido no la vería. Ese día habrá que
 * pedirle al enchufe los textos del arcade que carga. Queda escrito aquí para que
 * sea una tarea y no una sorpresa.
 */
import fs from 'node:fs';
import path from 'node:path';
import { arcadesInstalados, problemasDelManifiesto } from '../../shared/arcade';
import type { ManifiestoDeArcade } from '../../shared/arcade';
import '../../shared/arcade/juegos';
import { MARCAS_VETADAS } from './marcas-registradas';
import type { MarcaVetada } from './marcas-registradas';
import { sinComentarios } from './sin-comentarios';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

/** Donde viven los juegos que trae el binario, y por tanto sus barajas. */
const DONDE_VIVEN_LAS_BARAJAS = 'shared/arcade/juegos';

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
// La comparación de nombres
// ---------------------------------------------------------------------------

/**
 * Un texto en su forma comparable: sin acentos, sin mayúsculas y sin puntuación.
 *
 * ═══ POR QUÉ HACE FALTA NORMALIZAR ═══
 *
 * Porque quien cuele una marca no la va a escribir como está en la lista.
 * «POKÉMON», «pokemon» y «Pokémon» son la misma marca y tres cadenas distintas, y
 * `Spider-Man` se escribe con guion, sin él y en dos palabras. Comparar en crudo
 * dejaría un comprobador que solo caza a quien copia y pega de este fichero.
 *
 * La puntuación se convierte en espacio en vez de borrarse: si se borrara,
 * «Spider-Man» pasaría a ser `spiderman` y la entrada `Spider-Man` de la lista
 * también, con lo que las dos grafías se cazarían entre sí — pero «spider man»
 * escrito con espacio no coincidiría con ninguna. Con espacio de por medio, la
 * lista lleva las dos formas y las dos casan.
 */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * ¿Aparece esta marca en este texto, como palabra y no como trozo?
 *
 * Se exige que empiece y acabe en frontera de palabra. Sin eso, «Lego» cazaría
 * dentro de «alegoría» y el comprobador se convertiría en un cepo — que es la
 * forma más rápida que hay de que alguien lo desactive.
 */
function apareceEn(marca: string, textoNormalizado: string): boolean {
  const buscada = normalizar(marca);
  if (buscada.length === 0) return false;
  const escapada = buscada.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^| )${escapada}( |$)`).test(textoNormalizado);
}

// ---------------------------------------------------------------------------
// LA REVISIÓN, como función pura para poder vacunarla
// ---------------------------------------------------------------------------

interface Reproche {
  arcade: string;
  que: string;
  donde: string;
}

/** Los cuatro valores que admite el campo, escritos aquí para poder comprobarlos. */
const PROCEDENCIAS = ['dominio-publico', 'mecanica-generica', 'creacion-propia', 'licenciado'];

/**
 * Lo que está mal en un arcade: su procedencia y sus textos visibles.
 *
 * ═══ POR QUÉ ES UNA FUNCIÓN Y NO CÓDIGO SUELTO ═══
 *
 * Para poder llamarla con un arcade ENVENENADO y comprobar que se pone roja. Un
 * comprobador que solo se ejecuta sobre código bueno nunca se ha visto fallar, y
 * este repositorio tiene tres casos anotados de comprobadores que pasaban en
 * verde sin comprobar nada. La vacuna del final llama a esto mismo con un juego
 * que declara «Pikachu» en la baraja y exige que salte.
 *
 * `textos` son los rótulos y las cartas: lo que el manifiesto no lleva dentro y
 * hay que traer de fuera, porque el estado de un arcade es opaco y no hay ninguna
 * forma legítima de que el motor sepa qué es una baraja.
 */
function revisar(m: ManifiestoDeArcade, textos: readonly string[]): Reproche[] {
  const reproches: Reproche[] = [];
  const arcade = m.id || '(sin id)';
  const decir = (que: string, donde: string): void => {
    reproches.push({ arcade, que, donde });
  };

  // ── 1 · declara su procedencia, y no de boquilla ─────────────────────────
  /*
   * Se comprueba EN EJECUCIÓN aunque el tipo ya obligue, y por la misma razón que
   * lo hace `problemasDeLaProcedencia` en el núcleo: un arcade puede venir de
   * fuera del binario y allí no hay compilador de por medio. Lo que llega es un
   * objeto que alguien escribió en otro repositorio.
   */
  const p = m.procedencia as { tipo?: unknown } | undefined | null;
  const hayProcedencia = p !== undefined && p !== null && typeof p === 'object';
  if (!hayProcedencia) {
    decir('no declara `procedencia`, que es obligatoria para poder instalarse', 'manifiesto');
  } else if (typeof p.tipo !== 'string' || !PROCEDENCIAS.includes(p.tipo)) {
    decir(
      `declara una procedencia que no existe: ${JSON.stringify(p.tipo)}. Los cuatro valores son ${PROCEDENCIAS.join(', ')}`,
      'manifiesto',
    );
  }

  // ── 2 · y el resto del manifiesto está bien escrito ──────────────────────
  /*
   * ═══ POR QUÉ ESTE ORDEN, Y POR QUÉ EL `if` ═══
   *
   * `problemasDelManifiesto` del núcleo LANZA un `TypeError` si el manifiesto
   * llega sin `procedencia`: hace `p.tipo` sin mirar antes si `p` existe. Con un
   * manifiesto escrito en TypeScript no puede pasar —el tipo lo impide— y con uno
   * que llegue de fuera del binario por el enchufe, sí.
   *
   * No se arregla aquí porque el núcleo de la fase 0 no se toca: queda anotado
   * como hallazgo. Lo que se hace es no llamarlo cuando ya se sabe que va a
   * reventar, para que un manifiesto sin procedencia salga como UN REPROCHE
   * legible y no como una traza de pila que corta el comprobador entero.
   */
  if (hayProcedencia) {
    for (const problema of problemasDelManifiesto(m)) decir(problema, 'manifiesto');
  }

  // ── 3 · ninguna marca vetada en lo que se ve ─────────────────────────────
  /*
   * LO QUE SE MIRA: el nombre visible, el gancho —que es el «lema» de esta
   * familia: la frase que se lee en la tarjeta antes de tocarla—, el rótulo del
   * marcador, los datos de la licencia si la hay, y las cartas.
   *
   * El `id` NO se mira, y es a propósito: `cluedo.ts` de esta misma casa lleva
   * apuntado que el identificador interno puede quedarse si no lo ve nadie y que
   * lo que tiene que desaparecer es el nombre VISIBLE. Meter el id aquí sería
   * prohibir algo que no hace daño y empujar a renombrarlo en la base de datos.
   */
  const visibles: Array<{ texto: string; donde: string }> = [
    { texto: m.nombre, donde: 'nombre' },
    { texto: m.gancho, donde: 'gancho' },
  ];
  if (m.marcador?.tipo === 'cifra') visibles.push({ texto: m.marcador.rotulo, donde: 'marcador.rotulo' });
  if (hayProcedencia && m.procedencia.tipo === 'licenciado') {
    visibles.push({ texto: m.procedencia.titular, donde: 'procedencia.titular' });
    visibles.push({ texto: m.procedencia.referencia, donde: 'procedencia.referencia' });
  }
  for (const t of textos) visibles.push({ texto: t, donde: 'baraja o rótulo' });

  for (const { texto, donde } of visibles) {
    const normalizado = normalizar(String(texto));
    for (const marca of MARCAS_VETADAS) {
      if (!apareceEn(marca.nombre, normalizado)) continue;
      decir(`«${marca.nombre}» aparece en «${String(texto).slice(0, 60)}» — ${marca.porque}`, donde);
    }
  }

  return reproches;
}

// ---------------------------------------------------------------------------
// Las cadenas literales de los juegos, que es donde vive una baraja
// ---------------------------------------------------------------------------

function ficherosDeJuegos(): string[] {
  const salida: string[] = [];
  const dir = path.join(RAIZ, DONDE_VIVEN_LAS_BARAJAS);
  const bajar = (donde: string): void => {
    let entradas: fs.Dirent[];
    try {
      entradas = fs.readdirSync(donde, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entradas) {
      const completa = path.join(donde, e.name);
      if (e.isDirectory()) {
        bajar(completa);
        continue;
      }
      if (!/\.ts$/.test(e.name) || e.name.endsWith('.d.ts')) continue;
      salida.push(completa);
    }
  };
  bajar(dir);
  return salida.sort();
}

/**
 * Todas las cadenas escritas en los ficheros de juegos, sin los comentarios.
 *
 * Se cogen las tres formas de escribir una cadena en TypeScript porque una baraja
 * escrita con comillas dobles seguiría siendo una baraja, y lo que este barrido
 * no vea no lo ve nadie.
 */
function literalesDe(fuente: string): string[] {
  const codigo = sinComentarios(fuente);
  const salida: string[] = [];
  for (const patron of [/'([^'\\\n]*)'/g, /"([^"\\\n]*)"/g, /`([^`\\$]*)`/g]) {
    patron.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = patron.exec(codigo)) !== null) {
      const texto = m[1] ?? '';
      if (texto.trim().length > 0) salida.push(texto);
    }
  }
  return salida;
}

// ---------------------------------------------------------------------------

console.log('\nLa procedencia de los arcades, y lo que no puede salir en sus barajas\n');

// ── La lista negra está en condiciones ─────────────────────────────────────

paso('La lista negra: en fichero, revisable, y con el porqué de cada nombre');

comprobar('la lista tiene nombres', MARCAS_VETADAS.length >= 20, MARCAS_VETADAS.length);

const sinPorque = MARCAS_VETADAS.filter((m: MarcaVetada) => m.porque.trim().length < 20);
comprobar(
  'todas las entradas explican por qué están',
  sinPorque.length === 0,
  sinPorque.map((m) => m.nombre),
);

const repetidas = MARCAS_VETADAS.map((m) => normalizar(m.nombre)).filter(
  (n, i, todas) => todas.indexOf(n) !== i,
);
comprobar('no hay entradas repetidas', repetidas.length === 0, repetidas);

const vacias = MARCAS_VETADAS.filter((m) => normalizar(m.nombre).length < 3);
comprobar(
  'ninguna entrada es tan corta que cazaría cualquier cosa',
  vacias.length === 0,
  vacias.map((m) => m.nombre),
);

console.log(`  ${MARCAS_VETADAS.length} marcas vetadas, cada una con su razón escrita`);

// ── El barrido de los ficheros de juegos ───────────────────────────────────

paso('Las barajas: las cadenas literales de los juegos que trae el binario');

const ficheros = ficherosDeJuegos();
const literales: string[] = [];
for (const f of ficheros) literales.push(...literalesDe(fs.readFileSync(f, 'utf8')));

/*
 * ═══ LA VACUNA CONTRA EL VERDE FALSO, PRIMERA MITAD ═══
 *
 * Cero marcas encontradas sobre cero cadenas se parece muchísimo a «todo bien». Si
 * la carpeta se renombra, si el patrón de literales se rompe en un retoque o si
 * alguien mueve los juegos de sitio, esto tiene que ponerse rojo en vez de
 * felicitar a nadie para siempre.
 */
if (ficheros.length === 0 || literales.length < 100) {
  console.error(
    `\nSolo se han leído ${ficheros.length} ficheros y ${literales.length} cadenas en ` +
      `${DONDE_VIVEN_LAS_BARAJAS} (desde ${RAIZ}).\n` +
      'Eso no es una baraja: es un comprobador que no está mirando donde cree.',
  );
  process.exit(2);
}

console.log(`  ${ficheros.length} ficheros · ${literales.length} cadenas literales leídas`);

// ── Los arcades instalados ─────────────────────────────────────────────────

paso('Los arcades instalados, uno a uno');

const instalados = arcadesInstalados();
comprobar('hay al menos un arcade instalado', instalados.length > 0);

const reproches: Reproche[] = [];
for (const m of instalados) {
  const suyos = revisar(m, literales);
  reproches.push(...suyos);
  const procedencia =
    m.procedencia.tipo === 'licenciado'
      ? `licenciado · ${m.procedencia.titular} · ${m.procedencia.referencia} · ${m.procedencia.vigencia.desde} → ${m.procedencia.vigencia.hasta}`
      : m.procedencia.tipo;
  console.log(`  ${suyos.length === 0 ? '·' : '✗'} ${m.id.padEnd(12)} ${procedencia}`);
  comprobar(`«${m.id}» declara su procedencia y no usa ninguna marca vetada`, suyos.length === 0);
}

// ---------------------------------------------------------------------------
// LA VACUNA: la misma revisión, sobre un arcade envenenado
// ---------------------------------------------------------------------------

paso('La vacuna: la misma revisión tiene que ponerse roja con un arcade envenenado');

/**
 * Un arcade inventado para esta prueba y que no se instala en ninguna parte.
 *
 * Se le van cambiando los campos y la baraja, y se exige que la MISMA función que
 * acaba de dar por buenos a los instalados encuentre cada trampa. Sin esto, una
 * expresión regular mal escrita —un `\b` perdido en un renombrado— dejaría de
 * encontrar nada y este fichero felicitaría a todo el mundo para siempre.
 */
function arcadeDePrueba(cambios: Partial<ManifiestoDeArcade>): ManifiestoDeArcade {
  return {
    id: 'el-envenenado',
    nombre: 'Un juego cualquiera',
    gancho: 'Una frase que vende un juego',
    icono: 'mando',
    jugadores: { minimo: 1, maximo: 4 },
    sede: 'dispositivo',
    tickHz: 0,
    mueble: 'formulario',
    secretos: false,
    marcador: { tipo: 'ninguno' },
    procedencia: { tipo: 'creacion-propia' },
    ...cambios,
  };
}

function cazaA(que: string, m: ManifiestoDeArcade, textos: string[], loQueDeberiaDecir: string): void {
  const encontrados = revisar(m, textos);
  const acertó = encontrados.some((r) => r.que.includes(loQueDeberiaDecir));
  comprobar(`la revisión caza ${que}`, acertó, encontrados.map((r) => r.que).slice(0, 3));
}

cazaA('una marca en la baraja', arcadeDePrueba({}), ['Erizo', 'Pikachu', 'Paraguas'], 'Pikachu');
cazaA('una marca en el nombre visible', arcadeDePrueba({ nombre: 'Cluedo de bolsillo' }), [], 'Cluedo');
cazaA('una marca en el gancho', arcadeDePrueba({ gancho: 'Como Catan pero en el móvil' }), [], 'Catan');
cazaA(
  'una marca escrita de otra forma',
  arcadeDePrueba({}),
  ['POKÉMON', 'Escalera'],
  'Pokemon',
);
cazaA(
  'una marca en el rótulo del marcador',
  arcadeDePrueba({ marcador: { tipo: 'cifra', rotulo: 'Puntos Monopoly', sentido: 'mas-alto' } }),
  [],
  'Monopoly',
);
cazaA(
  'una marca disfrazada de palabra común',
  arcadeDePrueba({}),
  ['Tirita', 'Colador'],
  'Tirita',
);
/*
 * ═══ Y LA FAMILIA QUE FALTABA: UNA PERSONA HISTÓRICA QUE ES MARCA VIVA ═══
 *
 * Esta vacuna existe porque la lista negra pasó por delante de una baraja con una
 * de estas dentro y no la vio: no tenía la categoría. Es la trampa de todo el
 * fichero, y merece su comprobación propia — «muerto hace un siglo» es un
 * argumento sobre el copyright y no dice nada sobre la marca.
 */
cazaA(
  'una persona histórica cuyo nombre es una marca viva',
  arcadeDePrueba({}),
  ['Cleopatra', 'Frida Kahlo', 'Galileo'],
  'Frida Kahlo',
);
cazaA(
  'una procedencia que no existe',
  arcadeDePrueba({ procedencia: { tipo: 'me-lo-invente' } as unknown as ManifiestoDeArcade['procedencia'] }),
  [],
  'procedencia que no existe',
);
cazaA(
  'un manifiesto sin procedencia',
  arcadeDePrueba({ procedencia: undefined as unknown as ManifiestoDeArcade['procedencia'] }),
  [],
  'no declara `procedencia`',
);
cazaA(
  'una licencia con el titular en blanco',
  arcadeDePrueba({
    procedencia: {
      tipo: 'licenciado',
      titular: '   ',
      referencia: 'contrato 4/2026',
      vigencia: { desde: '2026-01-01', hasta: 'perpetua' },
    },
  }),
  [],
  '`procedencia.titular` está vacío',
);
cazaA(
  'una licencia sin fecha de fin en condiciones',
  arcadeDePrueba({
    procedencia: {
      tipo: 'licenciado',
      titular: 'Alguien S.L.',
      referencia: 'contrato 4/2026',
      vigencia: { desde: '2026-01-01', hasta: 'el año que viene' },
    },
  }),
  [],
  '`procedencia.vigencia.hasta`',
);

/*
 * ═══ Y LA OTRA MITAD DE LA VACUNA: QUE NO SEA UN CEPO ═══
 *
 * Una regla que caza demasiado se desactiva igual de rápido que una que no caza
 * nada. Estas cartas se PARECEN a marcas vetadas y son perfectamente legítimas:
 * si alguna saltara, la comparación estaría hecha por trozos de palabra y no por
 * palabras enteras.
 */
const CARTAS_LEGITIMAS = [
  'Una alegoría',
  'Mario Moreno era su nombre',
  'La superstición',
  'Un batallón',
  'El legado',
  'Estrella de mar',
  'La guerra de la Independencia',
];
const falsosPositivos = revisar(arcadeDePrueba({}), CARTAS_LEGITIMAS);
comprobar(
  'y no salta con cartas que solo se PARECEN a una marca',
  falsosPositivos.length === 0,
  falsosPositivos.map((r) => r.que),
);

// ---------------------------------------------------------------------------

console.log(`\n${hechas} comprobaciones`);

if (fallos.length > 0 || reproches.length > 0) {
  if (reproches.length > 0) {
    console.error(`\n${reproches.length} cosas que no pueden salir publicadas:\n`);
    for (const r of reproches) console.error(`  ✗ ${r.arcade} · ${r.donde}\n      ${r.que}`);
  }
  if (fallos.length > 0) {
    console.error(`\n${fallos.length} fallos del propio comprobador:\n`);
    for (const f of fallos) console.error(`  ✗ ${f}`);
  }
  console.error('');
  process.exit(1);
}

const cuantos =
  instalados.length === 1 ? 'El único arcade instalado declara' : `Los ${instalados.length} arcades instalados declaran`;
/*
 * EL CIERRE DICE LO QUE SE HA COMPROBADO Y LO QUE NO, en la misma pantalla.
 *
 * Decía sólo la primera mitad, y esa frase se lee como «legalmente en orden»
 * cuando lo único que afirma es que nadie tecleó una palabra de una lista. Con el
 * límite escrito al lado, quien lo lee sabe qué le queda por mirar a mano; sin él,
 * un verde de veintiuna comprobaciones sustituye a la revisión que de verdad hace
 * falta. Ver la cabecera para los tres huecos, uno a uno.
 */
console.log(
  `\n${cuantos} de dónde salen sus reglas, y ninguna de las ${MARCAS_VETADAS.length}\n` +
    'marcas vetadas aparece en su nombre, su gancho, sus rótulos ni en las cartas\n' +
    'de sus barajas.\n' +
    '\nY lo que esto NO dice: no ve la evocación estructural —un juego que no nombra\n' +
    'a nadie y lo evoca pieza por pieza—, no mira fuera de las cadenas literales, y\n' +
    'compara palabras enteras, así que una forma derivada de un nombre vetado no\n' +
    'casa. Eso se revisa leyendo, y la cabecera de cada juego tiene que decirlo.',
);
process.exit(0);
