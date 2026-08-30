/**
 * La batería completa, en un solo comando.
 *
 *   npm run verificar          ← todo, incluidas las dos veladas que arrancan servidor
 *   npm run verificar -- --rapido   ← salta esas dos (unos tres minutos menos)
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * Hay treinta y cinco comprobadores y ninguna forma de correrlos todos. Mientras
 * cada uno vigilaba su rincón eso daba igual: quien tocaba la Momia corría
 * `verify:momia` y ya está.
 *
 * Deja de dar igual en cuanto se toca el CONTRATO. Un cambio en `VistaJugador`
 * o en `Plot` no tiene rincón: alcanza a los tres juegos, a los imprimibles, al
 * taller y al móvil a la vez. Y entonces la pregunta «¿lo he roto?» solo tiene
 * una respuesta honesta si se han corrido TODOS — porque el que falta es
 * siempre el que habría cazado el fallo.
 *
 * No es una hipótesis. Este repositorio ya tiene dos casos anotados de una
 * comprobación que pasaba en verde sin comprobar nada, y los dos se
 * descubrieron por casualidad.
 *
 * ═══ EL ORDEN NO ES ALFABÉTICO ═══
 *
 * Primero lo que compila, porque si no compila lo demás no significa nada.
 * Después los maestros de oro, que son los que cazan los cambios de
 * comportamiento. Y al final las veladas largas, que tardan minutos y solo
 * merecen la pena si lo anterior está en verde.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rapido = process.argv.includes('--rapido');

/** @type {Array<{ nombre: string, donde: string, guion: string, lento?: boolean, porque: string }>} */
const BATERIA = [
  // ── Que compile ────────────────────────────────────────────────────────────
  { nombre: 'tipos · servidor', donde: 'server', guion: 'typecheck', porque: 'el contrato se respeta' },
  { nombre: 'tipos · taller', donde: 'client', guion: 'typecheck', porque: 'el taller sigue el contrato' },
  { nombre: 'tipos · móvil', donde: 'app', guion: 'typecheck', porque: 'la app sigue el contrato' },

  // ── Que se comporte igual ─────────────────────────────────────────────────
  {
    nombre: 'maestros de oro',
    donde: 'server',
    guion: 'oro:verificar',
    porque: 'los tres juegos producen exactamente lo de antes',
  },
  {
    nombre: 'reparto por servidor',
    donde: 'server',
    guion: 'verify:reparto',
    lento: true,
    porque: 'el mismo binario con otro reparto de juegos, con servidor de verdad',
  },
  {
    nombre: 'núcleo agnóstico',
    donde: 'server',
    guion: 'verify:nucleo',
    porque: 'el acoplamiento con CLUEDO no ha subido',
  },

  // ── Que lo declarado exista ───────────────────────────────────────────────
  { nombre: 'juegos', donde: 'server', guion: 'verify:juegos', porque: 'lo declarado está implementado' },
  { nombre: 'juego ajeno', donde: 'server', guion: 'verify:ajeno', porque: 'un juego que no comparte nada entra' },
  { nombre: 'segundo juego', donde: 'server', guion: 'verify:segundo-juego', porque: 'un juego de dos ejes entra' },
  { nombre: 'juego sin ejes', donde: 'server', guion: 'verify:sin-ejes', porque: 'un juego sin acusación entra' },
  { nombre: 'entidades', donde: 'server', guion: 'verify:entidades', porque: 'los almacenes por categoría' },
  { nombre: 'partida', donde: 'server', guion: 'verify:partida', porque: 'el ciclo de una partida' },

  // ── El móvil ──────────────────────────────────────────────────────────────
  { nombre: 'móvil', donde: 'app', guion: 'verify', porque: 'pantallas, tema y tablas de módulo' },

  // ── Las veladas largas ────────────────────────────────────────────────────
  {
    nombre: 'velada · la Momia',
    donde: 'server',
    guion: 'verify:momia',
    lento: true,
    porque: 'una expedición entera, con servidor de verdad',
  },
  {
    nombre: 'velada · las Sombras',
    donde: 'server',
    guion: 'verify:sombras',
    lento: true,
    porque: 'una noche entera, con servidor de verdad',
  },
];

const aCorrer = BATERIA.filter((p) => !(rapido && p.lento));

console.log(`\nLa batería · ${aCorrer.length} comprobadores${rapido ? ' (sin las veladas largas)' : ''}\n`);

/** @type {Array<{ nombre: string, ok: boolean, ms: number, salida: string }>} */
const resultados = [];

for (const prueba of aCorrer) {
  process.stdout.write(`  ${prueba.nombre.padEnd(24)} `);
  const desde = process.hrtime.bigint();
  const r = spawnSync('npm', ['run', prueba.guion, '--silent'], {
    cwd: path.join(RAIZ, prueba.donde),
    encoding: 'utf8',
    shell: true,
  });
  const ms = Number((process.hrtime.bigint() - desde) / 1_000_000n);
  const ok = r.status === 0;
  resultados.push({ nombre: prueba.nombre, ok, ms, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` });
  console.log(`${ok ? '✓' : '✗'}  ${(ms / 1000).toFixed(1)}s`);
}

const rotos = resultados.filter((r) => !r.ok);
const total = resultados.reduce((a, r) => a + r.ms, 0);

console.log(`\n${resultados.length - rotos.length} de ${resultados.length} en verde · ${(total / 1000).toFixed(0)}s\n`);

if (rotos.length === 0) {
  console.log(
    rapido
      ? 'Todo en verde. Antes de dar algo por terminado, córrela entera sin --rapido.'
      : 'Todo en verde.',
  );
  process.exit(0);
}

for (const r of rotos) {
  console.log(`${'─'.repeat(72)}\n✗ ${r.nombre}\n${'─'.repeat(72)}`);
  /*
   * Las últimas 40 líneas y no todas: un comprobador que falla suele escupir
   * cientos, y lo que dice qué ha pasado está al final. Quien quiera el resto
   * lo corre suelto — el nombre del guion está aquí arriba.
   */
  const lineas = r.salida.trimEnd().split('\n');
  console.log(lineas.slice(-40).join('\n'));
  console.log('');
}

console.log(`${rotos.length} comprobadores en rojo: ${rotos.map((r) => r.nombre).join(', ')}`);
process.exit(1);
