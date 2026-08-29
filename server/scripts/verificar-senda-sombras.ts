/**
 * El rompecabezas de la senda, a fondo.
 *
 *   npm run verify:senda-sombras
 *
 * Genera cientos de caminos con semillas distintas y comprueba que TODOS cumplen
 * las cuatro garantías del §4.2. Y luego hace lo que de verdad importa: rompe
 * cada garantía a propósito y comprueba que el verificador la caza. Una
 * comprobación que nunca se ha visto fallar no demuestra nada, y en este
 * repositorio han aparecido ocho que pasaban en verde con su regla rota.
 *
 * NO SALE A LA RED Y NO TOCA EL DISCO. Es aritmética pura sobre listas, así que
 * corre en un par de segundos y se puede lanzar antes de cada commit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA COMPROBACIÓN QUE NO ES OBVIA Y ES IMPRESCINDIBLE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Las frases que escribe `redactarHito` son el RECAMBIO: cuando el modelo redacta
 * algo que no se puede verificar, se pone esa en su lugar. Si el recambio no
 * pasara la misma validación que rechazó a la del modelo, el sistema entero sería
 * una farsa. Se comprueban las siete formas, una a una, y con nombres de paso
 * traicioneros —uno que se llama «La Playa», que es la palabra que la redacción
 * usaba antes y por la que se rechazaba a sí misma—.
 */
import {
  claveDe,
  generarSenda,
  maximoQueJuntaUnaPersona,
  redactarHito,
  refutabilidadDe,
  repartirHitos,
  universoCierto,
  universoEntero,
  verificarSenda,
} from '../src/juegos/sombras-senda';
import type { PuzleSombras } from '../src/juegos/sombras-senda';
import { comprobarRedaccion, lexicoDePasos } from '../src/plot/sombras-validacion';
import {
  cumpleCondicion,
  sendasDe,
  TRAMOS_DE_LA_SENDA,
  variaciones,
} from '../../shared/juegos/sombras-tipos';
import type { Condicion } from '../../shared/juegos/sombras-tipos';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 300)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

// ---------------------------------------------------------------------------

paso('El espacio del problema');
comprobar('con seis pasos hay 360 sendas posibles', variaciones(ids(6), 4).length === 360);
comprobar('con ocho, 1680', variaciones(ids(8), 4).length === 1680);
comprobar(
  'y la senda son cuatro tramos, como dice el contrato',
  TRAMOS_DE_LA_SENDA === 4,
);

paso('La semántica de las siete formas, a mano');
{
  const s = ['a', 'b', 'c', 'd'];
  const casos: Array<[string, Condicion, boolean]> = [
    ['antes, en orden', { tipo: 'antes', a: 'a', b: 'c' }, true],
    ['antes, del revés', { tipo: 'antes', a: 'c', b: 'a' }, false],
    ['antes, con uno fuera de la senda', { tipo: 'antes', a: 'a', b: 'z' }, false],
    ['seguido, pegados', { tipo: 'seguido', a: 'b', b: 'c' }, true],
    ['seguido, con uno en medio', { tipo: 'seguido', a: 'a', b: 'c' }, false],
    ['posicion, acertada', { tipo: 'posicion', a: 'c', posicion: 3 }, true],
    ['posicion, de un paso que no entra', { tipo: 'posicion', a: 'z', posicion: 1 }, false],
    ['no-posicion, de uno que entra', { tipo: 'no-posicion', a: 'c', posicion: 1 }, true],
    ['no-posicion, de uno que NO entra', { tipo: 'no-posicion', a: 'z', posicion: 1 }, true],
    ['extremo, el primero', { tipo: 'extremo', a: 'a' }, true],
    ['extremo, el último', { tipo: 'extremo', a: 'd' }, true],
    ['extremo, uno de en medio', { tipo: 'extremo', a: 'b' }, false],
    ['extremo, uno que no entra', { tipo: 'extremo', a: 'z' }, false],
    ['pasa-por, de uno que entra', { tipo: 'pasa-por', a: 'b' }, true],
    ['pasa-por, de uno que no', { tipo: 'pasa-por', a: 'z' }, false],
    ['no-pasa-por, de uno que no entra', { tipo: 'no-pasa-por', a: 'z' }, true],
    ['no-pasa-por, de uno que sí', { tipo: 'no-pasa-por', a: 'b' }, false],
  ];
  for (const [nombre, c, esperado] of casos) {
    comprobar(`«${nombre}»`, cumpleCondicion(s, c) === esperado);
  }
}

paso('El universo cierto lo es de verdad');
{
  const pasos = ids(7);
  const senda = ['p2', 'p5', 'p1', 'p7'];
  const uni = universoCierto(pasos, senda);
  comprobar('todas las condiciones del universo se cumplen en su senda', uni.every((c) => cumpleCondicion(senda, c)), uni.length);
  comprobar('y el universo entero determina esa senda y ninguna otra', sendasDe(pasos, uni).length === 1);
  comprobar(
    'no hay dos condiciones iguales dentro',
    new Set(uni.map(claveDe)).size === uni.length,
  );
  const todas = universoEntero(pasos);
  comprobar(
    'el universo ENTERO contiene al cierto',
    uni.every((c) => todas.some((x) => claveDe(x) === claveDe(c))),
  );
}

paso('Cientos de caminos, y las cuatro garantías en todos');
{
  const configuraciones: Array<{ pasos: number; jugadores: number; horas: number }> = [
    { pasos: 6, jugadores: 4, horas: 4 },
    { pasos: 6, jugadores: 8, horas: 4 },
    { pasos: 7, jugadores: 5, horas: 4 },
    { pasos: 8, jugadores: 6, horas: 4 },
    { pasos: 8, jugadores: 10, horas: 5 },
    { pasos: 10, jugadores: 6, horas: 4 },
  ];
  const POR_CONFIG = 25;
  let generados = 0;
  let peor = { unico: true, repartida: true, minimo: true, falsas: true, cobertura: true, solitario: true };
  let tamMin = 99;
  let tamMax = 0;
  let refutMin = Infinity;

  for (const cfg of configuraciones) {
    const pasos = ids(cfg.pasos);
    for (let s = 0; s < POR_CONFIG; s++) {
      const puzle = generarSenda({
        pasos,
        jugadores: cfg.jugadores,
        semilla: `${cfg.pasos}-${cfg.jugadores}-${s}`,
        minimoCondiciones: cfg.horas + 1,
      });
      const inf = verificarSenda(pasos, puzle);
      generados++;
      tamMin = Math.min(tamMin, puzle.condiciones.length);
      tamMax = Math.max(tamMax, puzle.condiciones.length);
      refutMin = Math.min(refutMin, inf.refutabilidadMinima);
      peor = {
        unico: peor.unico && inf.unico,
        repartida: peor.repartida && inf.repartida,
        minimo: peor.minimo && inf.minimo,
        falsas: peor.falsas && inf.falsasSanas,
        cobertura: peor.cobertura,
        solitario: peor.solitario,
      };
    }
  }

  comprobar(`se generaron ${generados} caminos`, generados === configuraciones.length * POR_CONFIG);
  comprobar('todos tienen UNA sola senda, y es la buena', peor.unico);
  comprobar('en todos, los hitos de una sola persona admiten ≥2 sendas', peor.repartida);
  comprobar('en todos, ningún hito sobra', peor.minimo);
  comprobar('y ninguna mentira es cierta por accidente ni se desmiente con una sola carta', peor.falsas);
  comprobar('el tamaño se mantiene manejable', tamMin >= 5 && tamMax <= 12, { tamMin, tamMax });
  console.log(`  (${tamMin}–${tamMax} hitos por camino · refutabilidad mínima ${refutMin})`);
}

paso('El reparto por pasos y horas');
{
  const configuraciones = [
    { pasos: 6, horas: 4 },
    { pasos: 7, horas: 4 },
    { pasos: 8, horas: 4 },
    { pasos: 6, horas: 5 },
    { pasos: 10, horas: 4 },
  ];
  let todosSalen = true;
  let nadieLosJunta = true;
  let todaCasillaDa = true;
  for (const cfg of configuraciones) {
    const pasos = ids(cfg.pasos);
    for (let s = 0; s < 20; s++) {
      const puzle = generarSenda({
        pasos,
        jugadores: 6,
        semilla: `r-${cfg.pasos}-${cfg.horas}-${s}`,
        minimoCondiciones: cfg.horas + 1,
      });
      const hitos = puzle.condiciones.map((_, i) => `h${i}`);
      const hallazgos = repartirHitos({ hitos, pasos, rondas: cfg.horas, semilla: `hh-${s}` });

      todaCasillaDa = todaCasillaDa && hallazgos.length === cfg.pasos * cfg.horas;
      todosSalen = todosSalen && hitos.every((id) => hallazgos.some((h) => h.hitoId === id));
      nadieLosJunta = nadieLosJunta && maximoQueJuntaUnaPersona(hallazgos) < hitos.length;
    }
  }
  comprobar('toda casilla —cada paso, cada hora— da un hito', todaCasillaDa);
  comprobar('ningún hito se queda sin aparecer en ninguna parte', todosSalen);
  comprobar('y NADIE puede juntarlos todos por su cuenta', nadieLosJunta);
}

paso('Determinismo: la misma semilla, el mismo camino');
{
  const pasos = ids(7);
  const uno = generarSenda({ pasos, jugadores: 5, semilla: 'igual', minimoCondiciones: 5 });
  const dos = generarSenda({ pasos, jugadores: 5, semilla: 'igual', minimoCondiciones: 5 });
  comprobar('la senda es la misma', uno.sendaVerdadera.join('|') === dos.sendaVerdadera.join('|'));
  comprobar(
    'y los hitos también, uno a uno',
    JSON.stringify(uno.condiciones) === JSON.stringify(dos.condiciones),
  );
  const otro = generarSenda({ pasos, jugadores: 5, semilla: 'distinta', minimoCondiciones: 5 });
  comprobar(
    'y con otra semilla sale otro camino',
    JSON.stringify(uno.condiciones) !== JSON.stringify(otro.condiciones),
  );
}

paso('Las entradas imposibles revientan al preparar, no de noche');
{
  const revienta = (que: string, fn: () => unknown): void => {
    let lanzo = false;
    try {
      fn();
    } catch {
      lanzo = true;
    }
    comprobar(que, lanzo);
  };
  revienta('con cinco pasos no se puede trazar una senda de cuatro', () =>
    generarSenda({ pasos: ids(5), jugadores: 4, semilla: 'x' }),
  );
  revienta('con pasos repetidos, tampoco', () =>
    generarSenda({ pasos: ['a', 'a', 'b', 'c', 'd', 'e'], jugadores: 4, semilla: 'x' }),
  );
  revienta('ni con una sola persona', () =>
    generarSenda({ pasos: ids(6), jugadores: 1, semilla: 'x' }),
  );
  revienta('ni con veinte pasos: por encima del tope no termina en un tiempo razonable', () =>
    generarSenda({ pasos: ids(20), jugadores: 4, semilla: 'x' }),
  );
  revienta('el reparto sin pasos', () => repartirHitos({ hitos: ['a'], pasos: [], rondas: 2 }));
  revienta('y sin hitos', () => repartirHitos({ hitos: [], pasos: ids(3), rondas: 2 }));
}

paso('LO QUE DE VERDAD IMPORTA · romper cada garantía y ver fallar la comprobación');
{
  const pasos = ids(7);
  const puzle = generarSenda({ pasos, jugadores: 5, semilla: 'roturas', minimoCondiciones: 5 });
  comprobar('el camino de partida está sano', verificarSenda(pasos, puzle).ok);

  const conUnaMas: PuzleSombras = {
    ...puzle,
    condiciones: [
      ...puzle.condiciones,
      { tipo: 'no-posicion', a: puzle.sendaVerdadera[0]!, posicion: 4 } as Condicion,
    ],
  };
  comprobar(
    'un hito redundante ROMPE la minimalidad',
    verificarSenda(pasos, conUnaMas).minimo === false,
  );

  const sinUna: PuzleSombras = {
    ...puzle,
    condiciones: puzle.condiciones.slice(1),
    reparto: puzle.reparto.map((r) => r.filter((i) => i > 0).map((i) => i - 1)),
  };
  comprobar('quitar un hito ROMPE la unicidad', verificarSenda(pasos, sinUna).unico === false);

  const todoAUno: PuzleSombras = {
    ...puzle,
    reparto: [puzle.condiciones.map((_, i) => i), []],
  };
  comprobar(
    'dárselo todo a una persona ROMPE la suficiencia repartida',
    verificarSenda(pasos, todoAUno).repartida === false,
  );

  const falsaCierta: PuzleSombras = {
    ...puzle,
    falsas: [{ condicion: puzle.condiciones[0]!, refutabilidad: 3 }],
  };
  comprobar(
    'una «falsa» que resulta ser cierta ROMPE la sanidad de las mentiras',
    verificarSenda(pasos, falsaCierta).falsasSanas === false,
  );

  /*
   * Y una falsa que se desmiente con UNA sola carta. Se busca una de verdad en
   * el universo en vez de inventarla: la comprobación tiene que cazar lo que el
   * generador podría producir si alguien bajara el filtro, no un caso de
   * laboratorio.
   */
  const ciertas = puzle.condiciones;
  const facil = universoEntero(pasos)
    .filter((c) => !cumpleCondicion(puzle.sendaVerdadera, c))
    .map((condicion) => ({ condicion, refutabilidad: refutabilidadDe(pasos, ciertas, condicion) }))
    .find((c) => c.refutabilidad === 1);
  if (facil) {
    comprobar(
      'una mentira que una sola carta desmiente ROMPE la sanidad',
      verificarSenda(pasos, { ...puzle, falsas: [facil] }).falsasSanas === false,
    );
  } else {
    comprobar('se encontró una mentira demasiado fácil con la que probar', false);
  }
}

paso('EL RECAMBIO PASA SU PROPIA VALIDACIÓN · las siete formas');
{
  /*
   * Con nombres traicioneros a propósito: «La Playa de Shirako» es el nombre que
   * el propio manifiesto sugiere, y la primera versión de la redacción de
   * `pasa-por` decía «quien vaya a la playa tiene que cruzarlo» — o sea, se
   * rechazaba a sí misma por nombrar otro paso. Se descubrió aquí.
   */
  const pasos = [
    { id: 'a', name: 'El Vado del Kizu' },
    { id: 'b', name: 'El Collado de Kabuto' },
    { id: 'c', name: 'El Bosque de Tsuge' },
    { id: 'd', name: 'La Playa de Shirako' },
    { id: 'e', name: 'El Puerto de Otogi' },
    { id: 'f', name: 'La Cuesta de Kashiwabara' },
  ];
  const lexico = lexicoDePasos(pasos);
  comprobar('los seis nombres se distinguen entre sí', lexico.fiable, lexico.ambiguos);

  const nombre = (id: string) => pasos.find((p) => p.id === id)?.name ?? id;
  const muestras: Condicion[] = [
    { tipo: 'antes', a: 'a', b: 'b' },
    { tipo: 'seguido', a: 'a', b: 'b' },
    { tipo: 'posicion', a: 'c', posicion: 2 },
    { tipo: 'no-posicion', a: 'c', posicion: 3 },
    { tipo: 'extremo', a: 'd' },
    { tipo: 'pasa-por', a: 'e' },
    { tipo: 'no-pasa-por', a: 'f' },
  ];
  for (const c of muestras) {
    const texto = redactarHito(c, nombre);
    const veredicto = comprobarRedaccion(c, texto, lexico);
    comprobar(
      `la redacción de «${c.tipo}» pasa su propia validación`,
      veredicto.bien,
      { texto, motivo: veredicto.motivo },
    );
  }

  /*
   * Y AL REVÉS: que la validación no diga que sí a cualquier cosa. Si aceptara la
   * frase de otra condición, todo lo de arriba sería decorativo.
   */
  const invertida = comprobarRedaccion(
    { tipo: 'antes', a: 'a', b: 'b' },
    redactarHito({ tipo: 'antes', a: 'b', b: 'a' }, nombre),
    lexico,
  );
  comprobar('y RECHAZA la frase que dice lo contrario', !invertida.bien, invertida.motivo);
  const ajena = comprobarRedaccion(
    { tipo: 'pasa-por', a: 'e' },
    redactarHito({ tipo: 'no-pasa-por', a: 'e' }, nombre),
    lexico,
  );
  comprobar('y la que niega lo que había que afirmar', !ajena.bien, ajena.motivo);

  /*
   * DOS QUE DE VERDAD NO SE DISTINGUEN, y hay que elegirlos con cuidado: «el
   * pasillo largo» y «el pasillo corto» comparten «pasillo» pero se separan por
   * la otra palabra, así que el léxico los distingue perfectamente y esta
   * comprobación pasaría en falso con ellos. Los que no tienen salida son
   * aquellos cuyo nombre está CONTENIDO en el del otro: «El pasillo» no tiene ni
   * una palabra propia frente a «El pasillo de arriba».
   */
  const gemelos = lexicoDePasos([
    { id: 'x', name: 'El pasillo' },
    { id: 'y', name: 'El pasillo de arriba' },
    { id: 'z', name: 'La cocina' },
  ]);
  comprobar(
    'y con dos pasos que no se pueden distinguir, la validación lo DICE en vez de fingir',
    !gemelos.fiable && gemelos.ambiguos.includes('x'),
    gemelos.ambiguos,
  );
  comprobar(
    'y entonces ninguna frase se da por buena: se usa siempre el recambio',
    !comprobarRedaccion({ tipo: 'pasa-por', a: 'x' }, 'La senda pasa por El pasillo.', gemelos).bien,
  );
}

// ---------------------------------------------------------------------------

console.log(`\nLa senda de El Paso de las Sombras · 150 caminos, cuatro garantías, seis roturas`);
console.log(`${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('\nEl generador cumple las cuatro garantías, y el verificador caza a quien no.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
