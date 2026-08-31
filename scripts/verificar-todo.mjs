/**
 * La batería completa, en un solo comando.
 *
 *   npm run verificar          ← todo, incluidas las dos veladas que arrancan servidor
 *   npm run verificar -- --rapido   ← salta esas dos (unos tres minutos menos)
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * Hay cuarenta comprobadores y no había forma de correrlos todos.
 * Mientras cada uno vigilaba su rincón eso daba igual: quien tocaba la Momia
 * corría `verify:momia` y ya está.
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
 * Y tiene un tercero, del día que esta lista pasó de catorce comprobadores a
 * treinta y tres: `verify:secretos-agente` llevaba cuatro comprobaciones en
 * rojo, y su cabecera dice que un fallo ahí es el producto. No lo corría nadie.
 *
 * QUÉ SE QUEDA FUERA, Y POR QUÉ. `verify:mongo` mira la base de producción;
 * `oro:capturar` es destructivo; `verify:aguante` tarda minutos y es una prueba
 * de carga; `verify:arranque`, `verify:conexion` y `verify:puerta-google`
 * necesitan credenciales o red. Los demás están todos aquí.
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
    nombre: 'juego de fuera',
    donde: 'server',
    guion: 'verify:de-fuera',
    lento: true,
    porque: 'un juego que no esta en el binario se instala desde disco y se juega',
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
  {
    nombre: 'el cuadro del Nudo',
    donde: 'server',
    guion: 'verify:cuadro-nudo',
    porque: 'el rompecabezas del cuarto juego tiene siempre una sola solución',
  },
  { nombre: 'partida', donde: 'server', guion: 'verify:partida', porque: 'el ciclo de una partida' },

  {
    nombre: 'el Mayordomo',
    donde: 'server',
    guion: 'verify:mayordomo',
    porque: 'el asistente no filtra la solucion en 25 tramas',
  },
  { nombre: 'puertas', donde: 'server', guion: 'verify:puertas', lento: true, porque: 'las rutas y el ZIP del paquete' },

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
  {
    nombre: 'velada · el Nudo',
    donde: 'server',
    guion: 'verify:nudo',
    lento: true,
    porque: 'seis franjas, cuatro minijuegos y el parte del amanecer, con servidor de verdad',
  },
  // ── Los que estaban fuera, y por eso estuvieron rojos sin que nadie lo viera ─
  /*
   * ═══ ESTOS DIECIOCHO NO ESTABAN ═══
   *
   * La batería corría catorce de los treinta y nueve comprobadores que hay. Los
   * otros veinticinco se corrían a mano, o sea casi nunca, y dos llevaban rojos
   * un tiempo indeterminado:
   *
   *   · `verify:secretos-agente` fallaba cuatro comprobaciones porque le
   *     faltaba un import y los tres juegos caían al prompt genérico. Su propia
   *     cabecera dice «un fallo aquí significa que el asistente PUEDE chivar la
   *     solución. No es un fallo de estilo: es el producto».
   *   · `verify:entorno` decía que dos variables que lee el código no estaban
   *     documentadas en `.env.example`. Las dos las había añadido yo.
   *
   * Un comprobador que nadie corre no es una red: es un fichero. Entran aquí
   * todos los que no necesitan ni la base de producción ni media hora.
   */
  { nombre: 'secretos del agente', donde: 'server', guion: 'verify:secretos-agente', porque: 'el asistente no puede chivar la solución' },
  /*
   * EL UNICO HUECO SIN TIPAR DEL CONTRATO. `VistaJugador.estadoDelJuego` es
   * `unknown` a proposito —el nucleo no puede tipar lo que no conoce— y por eso
   * es el unico sitio donde el servidor y la app pueden dejar de hablar el
   * mismo idioma sin que el compilador diga nada. Esto le da al lector de la app
   * lo que el servidor manda de verdad, y comprueba que lo entiende.
   */
  { nombre: 'estado del juego', donde: 'server', guion: 'verify:estado', porque: 'lo que el servidor mete en `estadoDelJuego`, la app lo entiende' },
  /*
   * DOS MINUTOS DE SONDEO DE VERDAD. Seis moviles haciendo lo mismo que hace la
   * app, con la mesa quieta —que es el caso dificil, porque el sondeo tiene que
   * aguantar sus veinticinco segundos callado— mientras se vigila cada segundo
   * cuantos figuran conectados. Va con los lentos por lo que tarda.
   */
  {
    nombre: 'estabilidad de la conexión',
    donde: 'server',
    guion: 'verify:estabilidad',
    lento: true,
    porque: 'seis móviles sondeando dos minutos sin que nadie deje de figurar conectado',
  },
  { nombre: 'entorno', donde: 'server', guion: 'verify:entorno', porque: 'el despliegue y el código hablan de lo mismo' },
  { nombre: 'almacén', donde: 'server', guion: 'verify:almacen', porque: 'lo que se guarda se vuelve a leer igual' },
  { nombre: 'presencia', donde: 'server', guion: 'verify:presencia', porque: 'quién está conectado y quién no' },
  { nombre: 'tope de gasto', donde: 'server', guion: 'verify:tope', porque: 'un bucle no puede vaciar la cuenta' },
  { nombre: 'campaña', donde: 'server', guion: 'verify:campana', porque: 'una velada de varios encuentros' },
  { nombre: 'credenciales', donde: 'server', guion: 'verify:credenciales', porque: 'con qué se entra y con qué no' },
  { nombre: 'borrado', donde: 'server', guion: 'verify:borrado', porque: 'quien pide que le borren, queda borrado' },
  { nombre: 'cuentas', donde: 'server', guion: 'verify:cuentas', porque: 'la vitrina y la crónica de cada cual' },
  { nombre: 'dueñas', donde: 'server', guion: 'verify:duenas', porque: 'quién puede dirigir cada partida' },
  { nombre: 'testigos', donde: 'server', guion: 'verify:tokens', porque: 'un testigo ajeno no abre nada' },
  { nombre: 'invitaciones', donde: 'server', guion: 'verify:invitaciones', porque: 'los sobres llegan a quien deben' },
  { nombre: 'proveedores', donde: 'server', guion: 'verify:proveedores', porque: 'entrar con Google y con correo' },
  { nombre: 'enlaces', donde: 'server', guion: 'verify:enlaces', porque: 'los enlaces firmados valen para una cosa' },
  { nombre: 'trama · la Momia', donde: 'server', guion: 'verify:momia-trama', porque: 'su generación no entrega una velada rota' },
  { nombre: 'puzle · la Momia', donde: 'server', guion: 'verify:puzle-momia', porque: 'el sellado tiene solución única' },
  { nombre: 'trama · las Sombras', donde: 'server', guion: 'verify:sombras-trama', porque: 'su generación no entrega una noche rota' },
  { nombre: 'senda · las Sombras', donde: 'server', guion: 'verify:senda-sombras', porque: 'la senda se puede andar' },
  { nombre: 'aviso legal', donde: 'server', guion: 'verify:legal', porque: 'lo que se publica dice lo que hay' },
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
