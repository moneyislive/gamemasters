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
  /*
   * ═══ ESTE VA JUSTO ENCIMA DE `tipos · móvil`, Y EL ORDEN ES LA MITAD ═══
   *
   * `tipos · móvil` comprueba las rutas contra `app/.expo/types/router.d.ts`,
   * que `expo-router` GENERA y que `.gitignore` deja fuera del repositorio: solo
   * se rehace cuando alguien levanta la app. O sea que su veredicto no habla del
   * código, habla del código MÁS un artefacto local de antigüedad desconocida.
   *
   * El 31 de agosto de 2026 dio las tres respuestas posibles sobre el MISMO
   * código en la misma tarde: verde con la tabla tan vieja que no apretaba, rojo
   * de verdad con la tabla recién hecha, y rojo falso con la tabla de la víspera
   * rechazando cuatro rutas que sí existían. El verde es el peor de los tres.
   *
   * Puesto delante, cuando el de abajo falle, el de arriba ya habrá dicho si es
   * que hay un fallo o es que la tabla habla de otro árbol.
   */
  {
    nombre: 'rutas · móvil',
    donde: 'app',
    guion: 'verify:rutas',
    porque: 'la tabla de rutas generada conoce las pantallas que hay, así que el typecheck de abajo significa algo',
  },
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
  /*
   * ═══ LA QUE NO SABE A QUÉ JUEGA ═══
   *
   * Las tres veladas de abajo conocen su juego: saben qué es una cámara, un
   * paso, una franja, y comprueban las reglas de cada uno. Esta no sabe nada:
   * lee `acciones` del manifiesto, saca las opciones de la vista del jugador y
   * juega los CUATRO hasta el desenlace con el mismo código.
   *
   * Es la única que cubre CLUEDO de punta a punta, y la única que responde a la
   * pregunta que da sentido a toda la arquitectura por capas: ¿se puede jugar a
   * esto sin saber a qué se juega? El día que haga falta un `if` por juego para
   * que avance, deja de pasar, y eso es exactamente lo que se quiere saber.
   */
  {
    nombre: 'jugar sin saber a qué',
    donde: 'server',
    guion: 'jugar:fondo',
    lento: true,
    porque: 'los cuatro juegos, hasta el desenlace, con un jugador que solo lee el manifiesto',
  },
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

  // ── La Sala de Arcade: el segundo motor ───────────────────────────────────
  /*
   * ═══ ESTOS TRES ENTRAN AQUÍ EL MISMO DÍA QUE NACEN ═══
   *
   * Y no es una formalidad. La cabecera de este fichero cuenta que dieciocho
   * comprobadores estuvieron fuera de la lista y dos llevaban rojos un tiempo
   * indeterminado, uno de ellos el que garantiza que el asistente no chive la
   * solución. Un comprobador que no está en la batería no es una red: es un
   * fichero.
   *
   * Los tres son de la fase 0 del motor de arcade y los tres vigilan una regla
   * que no tiene rincón: la frontera entre los dos motores alcanza a `shared/`,
   * a `server/src/` y a cualquiera que importe de ellos, así que la pregunta
   * «¿lo he roto?» solo tiene respuesta honesta si se corren con todo lo demás.
   */
  {
    nombre: 'arcade pobre',
    donde: 'server',
    guion: 'verify:arcade-pobre',
    porque: 'un arcade sin tablero, sin turnos, sin red ni asientos entra — y dice qué peajes paga',
  },
  {
    nombre: 'fronteras',
    donde: 'server',
    guion: 'verify:fronteras',
    porque: 'los dos motores siguen sin conocerse, y el núcleo del arcade sin importar node:',
  },
  {
    nombre: 'pureza del reductor',
    donde: 'server',
    guion: 'verify:pureza',
    porque: 'nada de lo que hace que la misma partida dé dos resultados distintos',
  },
  /*
   * ═══ Y ESTOS TRES SON LOS DE LA FASE 1: «LA FRENTE» ═══
   *
   * Entran el mismo día que el juego, y por la misma razón que los tres de
   * arriba. Pero hay una diferencia que conviene tener presente: aquéllos vigilan
   * el CONTRATO, que se rompe con un `import` razonable, y éstos vigilan un JUEGO
   * QUE SE PUBLICA.
   *
   * Los dos primeros cazan cosas que no dan ningún error cuando ocurren. Una
   * llamada a la red en un juego que se vende como «sin conexión» funciona
   * perfectamente mientras haya cobertura, y el fallo lo descubre alguien en el
   * metro. Una marca registrada colada en una baraja no rompe nada nunca: la
   * descubre una tienda, retirando la app.
   */
  {
    nombre: 'La Frente sin red',
    donde: 'server',
    guion: 'verify:sin-red',
    porque: 'una partida entera con `fetch`, los sockets y el canal sustituidos por funciones que lanzan',
  },
  {
    nombre: 'procedencia y marcas',
    donde: 'server',
    guion: 'verify:procedencia',
    porque: 'todo arcade dice de dónde salen sus reglas, y ninguna marca vetada aparece en sus barajas',
  },
  {
    nombre: 'oro · arcade',
    donde: 'server',
    guion: 'oro:arcade',
    porque: 'un registro de movimientos grabado y el estado final byte a byte, con `canonico.ts`',
  },
  /*
   * ═══ Y ÉSTE ES EL DE LA FASE 2: LA MESA EN LÍNEA ═══
   *
   * Va marcado `lento` porque LEVANTA SERVIDORES —cuatro, contando los dos que
   * tienen que NEGARSE a arrancar— y eso no es una manía: es el patrón de fallo
   * que esta casa ya tiene apuntado dos veces, VERDE EN PROCESO Y ROTO AL
   * ARRANCAR. La mitad de lo que comprueba no se puede comprobar de otra forma:
   * que `routes/arcade.ts` esté montado DELANTE de `requireAuth` no significa
   * nada sin un servidor con su guardián puesto, y que un arcade con secretos
   * sin tapar impida arrancar solo se ve arrancando.
   *
   * Y trae la comprobación que de verdad cierra el agujero de la información
   * oculta: se juega una partida entera de cuatro y se contrasta, revisión a
   * revisión, lo que se le mandó a cada cual contra las manos de los otros tres.
   * Sin eso, una proyección que fuera la identidad pasaría en verde.
   */
  {
    nombre: 'la mesa en línea',
    donde: 'server',
    guion: 'verify:mesa',
    lento: true,
    porque:
      'una mesa de cuatro con mano oculta y servidor de verdad: el plazo vence por la lectura, el `rev` rancio se rechaza al escribir y no al leer, y ninguna carta sale hacia el móvil de otro',
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
