/**
 * LA COMPUERTA DE BOOTS ON BOARD, MEDIDA EN NODE.
 *
 *   npm run verify:compuerta-de-botas -w escenas
 *
 * ═══ QUÉ SE COMPRA ═══
 *
 * `escenas/compuerta-de-botas.ts` decide tres cosas que, mal decididas, no dan ningún error en
 * ninguna consola: una pantalla enseña una elección que no toca, abre una mesa que no se eligió, o
 * sienta sin figura a quien luego nadie puede alcanzar. Aquí se recorren todas:
 *
 *  1. LA ELECCIÓN SALE SI Y SÓLO SI EL JUEGO SE RECORRE, con todos los veredictos y con los
 *     arcades INSTALADOS de verdad —no con una lista de este fichero, que se quedaría vieja el día
 *     que se dé de alta el cuarto— y con dos que no existen.
 *  2. ENCENDIDA SÓLO CON `plena`; apagada, SIEMPRE con su motivo: «midiendo» sólo donde algo mide.
 *  3. LO QUE VIAJA EN `abrir`: la elegida si está encendida, `normal` si está apagada aunque
 *     estuviera marcada, y nada si el juego no se recorre.
 *  4. EL VEREDICTO GUARDADO se lee con desconfianza: sólo `plena` y `sobria`, escritas así.
 *  5. AL SENTARSE: un aparato que baja ni pregunta; uno que no baja lee la mesa SIN llave y no se
 *     sienta en una `botas`, con la frase de su caso; los fallos de la lectura suben con lo que dijo
 *     el servidor.
 *  6. Y EL FICHERO SIGUE SIENDO PURO: ni React, ni `three`, ni red, ni Expo, ni DOM.
 *
 * Cada juez está escrito como una función que recibe la implementación, y se pasa dos veces: con la
 * de verdad, que tiene que pasar, y con una rota a propósito, que tiene que caer. Un juez que no
 * cae con la rota no está mirando lo que dice.
 */
import fs from 'node:fs';
import { arcadesInstalados } from '../../shared/arcade';
import '../../shared/arcade/juegos';
import { arcadesQueSeRecorren, sePuedeRecorrer } from '../../shared/arcade/juegos/mundos';
import type { Calidad } from '../embarcadero/tipos';
import {
  compuertaDeBotas,
  LAS_DOS_MODALIDADES,
  leerElVeredicto,
  MARCA_DE_BOTAS,
  modalidadQueViaja,
  MOTIVO_MIDIENDO,
  MOTIVO_NO_LLEGA,
  MOTIVO_SIN_MEDIR,
  motivoParaNoSentarse,
  NO_TE_SIENTAS_NO_LLEGA,
  NO_TE_SIENTAS_NO_SE_RECORRE,
  NO_TE_SIENTAS_SIN_MEDIR,
  porQueNoTeSientas,
} from '../compuerta-de-botas';
import type { LecturaSinLlave, LoQueDiceLaCompuerta, Modalidad } from '../compuerta-de-botas';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

type LaCompuerta = typeof compuertaDeBotas;
const VEREDICTOS: readonly (Calidad | null)[] = ['plena', 'sobria', null];
const MIDIENDO: readonly boolean[] = [true, false];

/*
 * Los arcades con los que se pregunta: los INSTALADOS, más dos que no existen. Los instalados se
 * piden al registro y no se escriben aquí, por lo de la cabecera; los inventados cubren lo que un
 * servidor más nuevo puede mandar.
 */
const INSTALADOS = arcadesInstalados().map((m) => m.id);
const TODOS = [...INSTALADOS, 'no-existe', ''];
const QUE_SE_RECORREN = INSTALADOS.filter((id) => sePuedeRecorrer(id));
const QUE_NO = INSTALADOS.filter((id) => !sePuedeRecorrer(id));

// ---------------------------------------------------------------------------
paso('La elección sale si y sólo si el juego se recorre');
// ---------------------------------------------------------------------------

comprobar('hay arcades instalados que se recorren, y son los del registro de mundos', QUE_SE_RECORREN.length > 0 && [...QUE_SE_RECORREN].sort().join() === [...arcadesQueSeRecorren()].sort().join(), {
  QUE_SE_RECORREN,
  registro: arcadesQueSeRecorren(),
});
comprobar('y hay instalados que no, para que la otra mitad se mire de verdad', QUE_NO.length > 0, QUE_NO);

/** La elección sale (no es `no-se-recorre`) exactamente cuando el juego se recorre, pase lo que pase con el veredicto. */
function saleSoloDondeSeRecorre(compuerta: LaCompuerta): string[] {
  const malos: string[] = [];
  for (const id of TODOS) {
    for (const v of VEREDICTOS) {
      for (const m of MIDIENDO) {
        const sale = compuerta(v, id, m).que !== 'no-se-recorre';
        if (sale !== sePuedeRecorrer(id)) malos.push(`${id || '«»'}/${String(v)}/${String(m)}`);
      }
    }
  }
  return malos;
}
comprobar(`en ${String(TODOS.length)} arcades, con los tres veredictos y midiendo o no, la elección sale sólo en los que se recorren`, saleSoloDondeSeRecorre(compuertaDeBotas).length === 0, saleSoloDondeSeRecorre(compuertaDeBotas));
comprobar(
  'se ve fallar: una compuerta que no pregunta por el registro de mundos cae',
  saleSoloDondeSeRecorre((v) => (v === 'plena' ? { que: 'se-ofrece' } : { que: 'midiendo', motivo: MOTIVO_MIDIENDO })).length > 0,
);

// ---------------------------------------------------------------------------
paso('Encendida sólo con `plena`; apagada, siempre con su motivo');
// ---------------------------------------------------------------------------

/** Lo que tiene que decir la compuerta para un juego que se recorre. */
function loQueToca(v: Calidad | null, midiendo: boolean): LoQueDiceLaCompuerta {
  if (v === 'plena') return { que: 'se-ofrece' };
  if (v === 'sobria') return { que: 'no-llega', motivo: MOTIVO_NO_LLEGA };
  return midiendo ? { que: 'midiendo', motivo: MOTIVO_MIDIENDO } : { que: 'sin-medir', motivo: MOTIVO_SIN_MEDIR };
}
function diceLoQueToca(compuerta: LaCompuerta): string[] {
  const malos: string[] = [];
  for (const id of QUE_SE_RECORREN) {
    for (const v of VEREDICTOS) {
      for (const m of MIDIENDO) {
        const dice = compuerta(v, id, m);
        if (JSON.stringify(dice) !== JSON.stringify(loQueToca(v, m))) malos.push(`${id}/${String(v)}/${String(m)}: ${JSON.stringify(dice)}`);
      }
    }
  }
  return malos;
}
comprobar('en los que se recorren: `plena` la enciende; `sobria` la apaga diciendo que no llega; sin veredicto, «midiendo» sólo si hay algo midiendo', diceLoQueToca(compuertaDeBotas).length === 0, diceLoQueToca(compuertaDeBotas));
comprobar(
  'se ve fallar: una compuerta que ofrece sin veredicto —el error tentador: «mientras mide, que salga»— cae',
  diceLoQueToca((v, a, m) => (v === null ? { que: 'se-ofrece' } : compuertaDeBotas(v, a, m))).length > 0,
);
comprobar(
  'y cae también una que dice «midiendo» donde no mide nada: una espera que no acaba nunca',
  diceLoQueToca((v, a) => compuertaDeBotas(v, a, true)).length > 0,
);

{
  const motivos = [MOTIVO_MIDIENDO, MOTIVO_SIN_MEDIR, MOTIVO_NO_LLEGA];
  comprobar(
    'los tres motivos son frases —con su punto—, distintos, y sólo el de estar midiendo dice que se mide ahora',
    motivos.every((t) => t.length > 20 && t.endsWith('.')) &&
      new Set(motivos).size === 3 &&
      MOTIVO_MIDIENDO.startsWith('Midiendo') &&
      !/midiendo/i.test(MOTIVO_SIN_MEDIR) &&
      !/midiendo/i.test(MOTIVO_NO_LLEGA),
    motivos,
  );
}

// ---------------------------------------------------------------------------
paso('Las palabras de la elección y de la marca son unas, para los dos clientes');
// ---------------------------------------------------------------------------

comprobar(
  'dos opciones, la normal primero —es la que viene puesta— y Boots on Board después, cada una con su ayuda',
  LAS_DOS_MODALIDADES.length === 2 &&
    LAS_DOS_MODALIDADES[0]?.modalidad === 'normal' &&
    LAS_DOS_MODALIDADES[0].rotulo === 'Normal' &&
    LAS_DOS_MODALIDADES[1]?.modalidad === 'botas' &&
    LAS_DOS_MODALIDADES.every((m) => m.ayuda.length > 10 && m.ayuda.endsWith('.')),
  LAS_DOS_MODALIDADES,
);
comprobar('y la opción de bajar se llama como la marca de la mesa: una mesa no cambia de nombre al abrirse', LAS_DOS_MODALIDADES[1]?.rotulo === MARCA_DE_BOTAS && MARCA_DE_BOTAS === 'Boots on Board');

// ---------------------------------------------------------------------------
paso('Lo que viaja en `abrir`');
// ---------------------------------------------------------------------------

function viajaLoQueToca(viaja: typeof modalidadQueViaja): string[] {
  const malos: string[] = [];
  const casos: readonly LoQueDiceLaCompuerta[] = [
    { que: 'no-se-recorre' },
    { que: 'se-ofrece' },
    { que: 'midiendo', motivo: MOTIVO_MIDIENDO },
    { que: 'sin-medir', motivo: MOTIVO_SIN_MEDIR },
    { que: 'no-llega', motivo: MOTIVO_NO_LLEGA },
  ];
  for (const c of casos) {
    for (const elegida of ['normal', 'botas'] as const) {
      const toca: Modalidad | undefined = c.que === 'no-se-recorre' ? undefined : c.que === 'se-ofrece' ? elegida : 'normal';
      const va = viaja(elegida, c);
      if (va !== toca) malos.push(`${c.que}/${elegida}: ${String(va)} en vez de ${String(toca)}`);
    }
  }
  return malos;
}
comprobar(
  'sin elección no viaja nada; encendida viaja la elegida; apagada viaja `normal` aunque se hubiera marcado Boots on Board',
  viajaLoQueToca(modalidadQueViaja).length === 0,
  viajaLoQueToca(modalidadQueViaja),
);
comprobar('se ve fallar: mandar la marcada sin mirar si está encendida cae', viajaLoQueToca((elegida) => elegida).length > 0);
comprobar(
  'y mandar `normal` en un juego que no se recorre también: sin elección, se abre como antes, sin el campo',
  viajaLoQueToca((elegida, c) => (c.que === 'se-ofrece' ? elegida : 'normal')).length > 0,
);

// ---------------------------------------------------------------------------
paso('El veredicto guardado se lee con desconfianza');
// ---------------------------------------------------------------------------

comprobar(
  'sólo `plena` y `sobria` escritas así; lo demás —vacío, otra caja, espacios, un número, un objeto, nada— es no saber',
  leerElVeredicto('plena') === 'plena' &&
    leerElVeredicto('sobria') === 'sobria' &&
    [null, undefined, '', 'PLENA', ' plena', 'plena ', 'media', 42, true, { plena: true }, ['plena']].every((x) => leerElVeredicto(x) === null),
);

// ---------------------------------------------------------------------------
paso('Al sentarse: un aparato que no llega no se sienta en una mesa `botas`');
// ---------------------------------------------------------------------------

{
  const [unoQueSeRecorre] = QUE_SE_RECORREN;
  const [unoQueNo] = QUE_NO;
  const arcade = unoQueSeRecorre ?? 'lindes';
  const otro = unoQueNo ?? 'frente';

  comprobar(
    'la frase de cada caso: con `plena` en un juego que se recorre, ninguna; `sobria`, que no llega; sin medir, que se espere; y en uno que esta versión no recorre, que no sabe bajar',
    motivoParaNoSentarse('plena', arcade) === null &&
      motivoParaNoSentarse('sobria', arcade) === NO_TE_SIENTAS_NO_LLEGA &&
      motivoParaNoSentarse(null, arcade) === NO_TE_SIENTAS_SIN_MEDIR &&
      motivoParaNoSentarse('plena', otro) === NO_TE_SIENTAS_NO_SE_RECORRE &&
      motivoParaNoSentarse(null, otro) === NO_TE_SIENTAS_NO_SE_RECORRE,
  );
  comprobar(
    'y las tres dicen que la mesa es de Boots on Board y terminan en punto: se leen sin saber qué es un veredicto',
    [NO_TE_SIENTAS_NO_LLEGA, NO_TE_SIENTAS_SIN_MEDIR, NO_TE_SIENTAS_NO_SE_RECORRE].every((t) => t.includes(MARCA_DE_BOTAS) && t.endsWith('.')) &&
      !/veredicto|plena|sobria|fotograma/i.test([NO_TE_SIENTAS_NO_LLEGA, NO_TE_SIENTAS_SIN_MEDIR, NO_TE_SIENTAS_NO_SE_RECORRE].join(' ')),
  );

  /** Un lector de mentira: apunta los códigos que se le piden y contesta lo que se le diga. */
  function lector(respuesta: LecturaSinLlave): { readonly leer: (codigo: string) => Promise<LecturaSinLlave>; readonly pedidos: string[] } {
    const pedidos: string[] = [];
    return {
      pedidos,
      leer: (codigo) => {
        pedidos.push(codigo);
        return Promise.resolve(respuesta);
      },
    };
  }
  const mesa = (campos: Record<string, unknown>): LecturaSinLlave => ({ ok: true, status: 200, cuerpo: { mesa: { codigo: 'AB12C', arcade, ...campos } } });
  /** Lo que devuelve, o el texto con el que lanza. */
  async function queDice(codigo: string, a: string, v: Calidad | null, leer: (c: string) => Promise<LecturaSinLlave>, f = porQueNoTeSientas): Promise<string | null> {
    try {
      return await f(codigo, a, v, leer);
    } catch (error) {
      return `lanza: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /* 1 · Quien baja no pregunta. */
  const sinPreguntar = lector(mesa({ modalidad: 'botas' }));
  comprobar(
    'un aparato con `plena` en un juego que se recorre se sienta sin leer la mesa: la entrada es la de siempre, sin una petición de más',
    (await queDice('AB12C', arcade, 'plena', sinPreguntar.leer)) === null && sinPreguntar.pedidos.length === 0,
    sinPreguntar.pedidos,
  );

  /* 2 · Quien no baja lee la mesa, y en una `botas` no se sienta. */
  const botas = lector(mesa({ modalidad: 'botas' }));
  comprobar(
    'uno con `sobria` lee ESA mesa —el código que se le da— y en una `botas` no se sienta, con la frase de no llegar',
    (await queDice('AB12C', arcade, 'sobria', botas.leer)) === NO_TE_SIENTAS_NO_LLEGA && botas.pedidos.join() === 'AB12C',
    botas.pedidos,
  );
  comprobar('uno sin medir, tampoco, y se le dice que espere a medirse', (await queDice('AB12C', arcade, null, lector(mesa({ modalidad: 'botas' })).leer)) === NO_TE_SIENTAS_SIN_MEDIR);
  comprobar(
    'y en una mesa `botas` de un juego que esta versión no recorre, tampoco: sentado sin figura en un tablero que se anda',
    (await queDice('AB12C', otro, 'plena', lector({ ok: true, status: 200, cuerpo: { mesa: { arcade: otro, modalidad: 'botas' } } }).leer)) === NO_TE_SIENTAS_NO_SE_RECORRE,
  );

  /* 3 · En las demás mesas se sienta como siempre. */
  const casosQueSiSientan: readonly [string, LecturaSinLlave][] = [
    ['una mesa normal', mesa({ modalidad: 'normal' })],
    ['una mesa sin el campo, de un servidor anterior', mesa({})],
    ['una modalidad que esta versión no conoce', mesa({ modalidad: 'BOTAS' })],
    ['una mesa de otro juego —ahí contesta el servidor al pedir silla, con su motivo—', { ok: true, status: 200, cuerpo: { mesa: { arcade: otro, modalidad: 'botas' } } }],
  ];
  for (const [que, respuesta] of casosQueSiSientan) {
    comprobar(`uno que no llega se sienta en ${que}`, (await queDice('AB12C', arcade, 'sobria', lector(respuesta).leer)) === null);
  }

  /* 4 · Si la lectura falla, sube con lo que dijo el servidor. */
  comprobar(
    'un código que no existe lanza con la frase del servidor: la misma que daba al pedir silla, y un solo 404',
    (await queDice('ZZZZZ', arcade, 'sobria', lector({ ok: false, status: 404, cuerpo: { error: 'No hay ninguna mesa ZZZZZ.', codigo: 'ZZZZZ' } }).leer)) ===
      'lanza: No hay ninguna mesa ZZZZZ.',
  );
  comprobar(
    'un fallo sin cuerpo lanza con el estado, y un 200 que no trae mesa —una página de otro servidor— lanza también, en vez de sentar',
    (await queDice('AB12C', arcade, 'sobria', lector({ ok: false, status: 502, cuerpo: undefined }).leer)) === 'lanza: el servidor contestó 502' &&
      (await queDice('AB12C', arcade, 'sobria', lector({ ok: true, status: 200, cuerpo: undefined }).leer)) === 'lanza: la respuesta no trae la mesa',
  );

  /* Vacunas: dos maneras tentadoras de escribirlo mal, y las dos tienen que caer aquí. */
  const sinMirarLaMesa: typeof porQueNoTeSientas = (_c, a, v) => Promise.resolve(motivoParaNoSentarse(v, a));
  comprobar(
    'se ve fallar: una puerta que no mira la mesa deja fuera de las mesas normales a quien no llega',
    (await queDice('AB12C', arcade, 'sobria', lector(mesa({ modalidad: 'normal' })).leer, sinMirarLaMesa)) !== null,
  );
  const aPelo: typeof porQueNoTeSientas = async (c, a, v, leer) => {
    const leida = await leer(c);
    const m = (leida.cuerpo as { mesa?: { modalidad?: unknown } } | undefined)?.mesa;
    return String(m?.modalidad).toLowerCase() === 'botas' ? motivoParaNoSentarse(v, a) : null;
  };
  comprobar(
    'y una que lee la modalidad a pelo, sin `esMesaDeBotas`, deja fuera por una modalidad que no conoce',
    (await queDice('AB12C', arcade, 'sobria', lector(mesa({ modalidad: 'BOTAS' })).leer, aPelo)) !== null,
  );
}

// ---------------------------------------------------------------------------
paso('El fichero sigue siendo puro: lo leen dos clientes y este guion');
// ---------------------------------------------------------------------------

{
  /** Sin comentarios: la cabecera cuenta el porqué con las mismas palabras que se prohíben. */
  const sinComentarios = (fuente: string): string => fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const PROHIBIDO: readonly { readonly que: string; readonly regex: RegExp }[] = [
    { que: 'react', regex: /from\s+['"]react['"]|from\s+['"]react-native['"]|from\s+['"]react-dom/ },
    { que: 'three', regex: /from\s+['"]three['"]|from\s+['"]three\/|@react-three/ },
    { que: 'expo', regex: /['"]expo[-/'"]|\bexpo-/ },
    { que: 'fetch', regex: /\bfetch\s*\(/ },
    { que: 'window', regex: /\bwindow\b/ },
    { que: 'document', regex: /\bdocument\b/ },
    { que: 'localStorage', regex: /\blocalStorage\b/ },
  ];
  const loProhibidoEn = (fuente: string): string[] => {
    const codigo = sinComentarios(fuente);
    return PROHIBIDO.filter((p) => p.regex.test(codigo)).map((p) => p.que);
  };
  const fuente = fs.readFileSync(new URL('../compuerta-de-botas.ts', import.meta.url), 'utf8');
  comprobar('`compuerta-de-botas.ts` no trae React, three, Expo, red, ventana, documento ni almacén', loProhibidoEn(fuente).length === 0, loProhibidoEn(fuente));
  const envenenado = "import { useState } from 'react';\nimport * as THREE from 'three';\nimport * as S from 'expo-secure-store';\nfetch('/x');\nwindow.x;\ndocument.body;\nlocalStorage.getItem('a');";
  comprobar('se ve fallar: un fuente con los siete enciende los siete', loProhibidoEn(envenenado).length === 7, loProhibidoEn(envenenado));
  comprobar('y el barrido no se traga los comentarios: un `// fetch(` no cuenta', loProhibidoEn('// fetch( y window\n/* react three */\nconst a = 1;').length === 0);
  comprobar('y se ha leído el fichero de verdad', /export function compuertaDeBotas\(/.test(fuente), fuente.length);
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS». Un guion que se cae a la mitad termina con código cero y una
 * lista corta de aciertos, y eso se lee como verde. El número va a mano y hay que subirlo al añadir
 * comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 32;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Sólo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones que tiene escritas este guion: ` +
      'se ha caído por el camino sin decirlo. Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length > 0) {
  console.error(`\n✘ ${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.error(`   · ${f}`);
  process.exit(1);
}

console.log(
  `\n✔ ${String(hechas)} comprobaciones. La elección de Boots on Board sale sólo en los juegos que se recorren\n` +
    '  —con los arcades instalados de verdad y dos inventados—, encendida sólo con un veredicto `plena` y\n' +
    '  apagada siempre con su porqué, «midiendo» sólo donde algo mide; lo que viaja en `abrir` es lo que se\n' +
    '  ve encendido, y nada donde no hay elección; el veredicto guardado sólo vale escrito como es; y un\n' +
    '  aparato que no llega no se sienta en una mesa `botas` —la lee sin llave, con `esMesaDeBotas`—, sin\n' +
    '  que a quien sí llega le cueste una petición. Lo que esto NO prueba es que las pantallas llamen a\n' +
    '  estas funciones: eso lo miran `verify:escritorio` y `verify:sala` sobre sus ficheros.\n',
);
