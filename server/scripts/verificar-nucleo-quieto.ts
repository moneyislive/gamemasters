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
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EL SELLO SE VOLVIÓ A PONER EN LA FASE 5, A SABIENDAS. QUÉ SE MOVIÓ Y POR QUÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Éste es el sitio donde tiene que estar escrito, porque el fichero del sello son
 * huellas y no dice nada. Y conviene leer primero POR QUÉ el núcleo llevaba cuatro
 * fases sin moverse: no porque no le faltara nada, sino porque el diff vacío ERA
 * la medida de la fase 4 —«¿cabe el juego más rico sin tocar el motor?»— y
 * comprarla con un parche habría falseado el resultado. Esa medida ya está tomada
 * y publicada. Lo que sigue es la deuda que rodeaba, pagada.
 *
 * TRES HUECOS, y cada uno tenía su rodeo escrito en algún sitio:
 *
 *  A · `opciones()` NO TENÍA HUECO EN EL ALTA. El §5 bis lo define y
 *      `instalarArcade` no lo admitía, así que Riberas lo resolvía por dentro
 *      —llamándose a sí mismo desde su reductor y desde su tablero— y un arcade de
 *      FUERA del binario no podía tener opciones genéricas: no hay forma de que le
 *      diga a la plataforma «pregúntame». Con eso, la frase del §7 —«los muebles
 *      genéricos son los únicos que un arcade de fuera puede usar»— valía a medias.
 *      · `shared/arcade/opciones.ts` (NUEVO): `Opcion` y `Opciones<V>`. El tipo
 *        vivía dentro de Riberas porque el núcleo no podía tenerlo.
 *      · `shared/arcade/index.ts`: `opciones?` en el alta —EN LA MISMA TABLA, sin
 *        símbolo nuevo—, `opcionesDeArcade()` y `hayOpciones()`.
 *
 *  B · UN JUEGO CON MESA NO PODÍA NOMBRAR A NADIE. La proyección sólo recibía un
 *      `QuienMira`, así que el aviso de la partida decía «aJLFR7ZJ3 coloca una
 *      choza». Riberas lo rodeaba escribiendo huecos que rellenaba el mueble
 *      (`huecoDeAsiento` en `mecanicas/tablero-declarado.ts`, hoy borrado).
 *      · `shared/arcade/tipos.ts`: `AsientoNombrado`, `LosSentados`,
 *        `NADIE_SENTADO` y `comoSeLlama()`.
 *      · `shared/arcade/proyeccion.ts`: tercer argumento de `Proyeccion`.
 *      Entra por la PROYECCIÓN y no por `ContextoMovimiento` a propósito: un
 *      nombre es presentación, y en el camino del reductor haría que la misma
 *      partida reejecutada tras un renombrado diera otro estado.
 *
 *  C · NO HABÍA CANAL ENTRE «EL REDUCTOR RECHAZÓ» Y LA PANTALLA. Es la factura del
 *      «sólo si» del §5 bis, que convierte el rechazo silencioso en el camino
 *      normal.
 *      · `shared/arcade/motor.ts`: `Rechazo`, `rechazar()`, `esRechazo()`,
 *        `aplicarConMotivo()`. El motivo NO viaja dentro del estado —lo rompería
 *        todo— sino en un envoltorio que `aplicar()` abre y tira, así que
 *        `reejecutar()` sigue dando exactamente el mismo estado.
 *      · `shared/arcade/index.ts`: `avanzarConMotivo()`.
 *      · `server/src/arcade/arbitro.ts`: `jugarConMotivo()` y `Jugado`. El árbitro
 *        TRANSPORTA el motivo y no lo interpreta: sigue sin saber qué significa.
 *
 * Y DOS FICHEROS MÁS, que no son contrato y se movieron por lo de arriba:
 *  · `server/src/arcade/mesas.ts`: pasa los nombres a la proyección, saca el
 *    motivo en `VistaDeMesa`, y usa las puertas del presupuesto EXIGIDO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Y SE VOLVIÓ A SELLAR UNA SEGUNDA VEZ, TRAS LA REVISIÓN DE LA MISMA FASE 5
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tres revisores adversarios leyeron lo de arriba y encontraron que dos de los
 * tres huecos estaban a medias. Lo que se movió al pagarlos, y por qué:
 *
 *  D · EL HUECO A NO LO RECORRÍA NADIE. `opcionesDeArcade()` y `hayOpciones()` se
 *      escribieron y no las llamaba ningún camino de producción: el único llamante
 *      del árbol era un comprobador. La plataforma seguía pintando el dibujo YA
 *      RESUELTO que el juego mete en su vista, así que el motivo escrito para abrir
 *      el hueco —«un arcade de fuera no puede decirle a la plataforma pregúntame»—
 *      seguía siendo cierto, y un arcade de fuera que registrara `opciones()` sin
 *      resolverse el tablero se quedaba con la pantalla en blanco.
 *      · `server/src/arcade/mesas.ts`: `VistaDeMesa.opciones`, compuesta en TODA
 *        vista de mesa preguntándole al registro. La pregunta se hace en el
 *        servidor y no en el móvil porque el código de un arcade de fuera no está
 *        en el binario de la app: allí la misma llamada lanzaría `ArcadeNoInstalado`.
 *      · `shared/arcade/index.ts`: sólo cabecera en `opcionesDeArcade()`, para
 *        dejar escrito quién la llama en producción.
 *      La otra mitad es de la app (`tablero-en-linea.tsx` pinta un botón por
 *      opción) y la prueba es un segundo arcade de fuera, «El Vado», que NO se
 *      dibuja a sí mismo.
 *
 *  E · LA PUNTUACIÓN SEGUÍA FUERA DEL ALTA, y eso pasó de ser una deuda anotada a
 *      un fallo vivo: la fase 5 le añadió a la tabla llana de
 *      `juegos/puntuaciones.ts` un `registrarPuntuacion()` para el enchufe, y la
 *      cabecera de aquella tabla justificaba no anclarla diciendo «aquí no hay
 *      altas». Con altas en ejecución, una doble carga de módulo —el fallo real que
 *      esta casa ya pagó con `shared/juegos/index.ts`— hace que el arcade de fuera
 *      registre su cifra en una copia y que quien la lee mire la otra.
 *      · `shared/arcade/tipos.ts`: el tipo `Puntuacion`.
 *      · `shared/arcade/index.ts`: `puntuacion?` en el alta —EN LA MISMA TABLA
 *        `INSTALADOS`, sin símbolo nuevo—, `registrarPuntuacion()`,
 *        `puntuacionDe()`, `hayPuntuacion()`, `olvidarPuntuacion()`,
 *        `arcadesConCifraSinPuntuacion()`, `exigirCifrasLegibles()` y
 *        `ArcadeSinPuntuacion`. Es exactamente la mudanza que la cabecera de
 *        aquella tabla llevaba pidiendo por escrito desde la fase 3.
 *      Y con ella, la tercera garantía de arranque: un arcade que publica una cifra
 *      y no trae cómo leerla ya no arranca, en vez de fallar meses después contra
 *      el primer récord honrado.
 *
 *  F · Y DOS CORRECCIONES EN LA AUTORIDAD, que no son contrato pero sí sello:
 *      · `server/src/arcade/mesas.ts` y `server/src/arcade/arbitro.ts`: un RECHAZO
 *        deja de contar como cambio aunque el reductor devuelva otro objeto de
 *        estado. Es el caso `estado ?? partidaNueva()` que la cabecera de `Rechazo`
 *        declara legítimo, y que hacía subir la revisión, engordar el diario y
 *        TIRAR el motivo en el primer movimiento de toda mesa de servidor.
 *      · `server/src/arcade/mesas.ts`: el tic pesa su estado con la puerta que
 *        EXIGE, y un arcade apartado deja de llevarse por delante las lecturas.
 *
 * LO QUE NO SE HA MOVIDO, y hay que decirlo porque es lo que sigue comprando este
 * comprobador: el núcleo sigue sin nombrar a ningún juego, sigue sin importar nada
 * de `juegos/`, `movimiento.ts` y `reloj.ts` siguen byte a byte, `motor.ts` no se
 * ha vuelto a tocar en esta segunda vuelta, y las dos comprobaciones que no se
 * pueden sellar siguen mordiendo.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * TERCER SELLADO: EL MOTOR NO SABÍA PREGUNTAR SI UNA PARTIDA ACABÓ
 * ════════════════════════════════════════════════════════════════════════════
 *
 * El árbitro documenta desde el primer día que «quien hospeda llama a `cerrarMesa`
 * cuando el estado del juego dice que se acabó», los dos juegos de servidor
 * exportaban su `seAcabo`… y el único que lo llamaba era el motor DEL APARATO, que
 * los tiene importados por su nombre. En el servidor no existía el hueco, así que
 * NINGUNA mesa se cerraba jamás: la partida acabada seguía pintando su cuenta
 * atrás, admitía tics y no terminaba nunca. Tres fases con ese peaje.
 *
 *  G · EL HUECO, calcado del de `puntuacion` porque es el mismo caso —lo que el
 *      juego sabe y la plataforma pregunta por su nombre—, y en el ALTA y no en
 *      una tabla del servidor para que también lo pueda declarar un arcade de
 *      FUERA; si no, sus mesas serían las únicas que no se cierran.
 *      · `shared/arcade/tipos.ts`: el tipo `SeAcabo`. NO es «fin como función del
 *        estado»: eso aplaza que el MOTOR lo calcule, y esto no calcula —pregunta,
 *        y contesta sí o no—. Quién ganó sigue siendo del juego y de su vista.
 *      · `shared/arcade/index.ts`: `seAcabo?` en el alta, `registrarFinal()`,
 *        `olvidarFinal()`, `hayFinal()`, `seAcaboLaPartida()`,
 *        `arcadesConMesaSinFinal()` y `exigirFinalesDeclarados()`. Y la sonda de
 *        mesa vacía prueba también esta cuarta puerta, que nació sin ella.
 *      El «no» por defecto de `seAcaboLaPartida` es correcto al revés que el de
 *      `puntuacionDe`, que lanza: un cero por defecto acepta récords falsos en
 *      silencio; un «todavía no» deja la mesa ABIERTA, que es donde estaba antes.
 *      Cerrar por defecto sí sería grave: echaría a la gente de una partida viva.
 *      Y la guarda de arranque existe porque, sin ella, OMITIR es más silencioso
 *      que declarar —el error que `MarcadorDeArcade` documenta como corregido—.
 *
 *  H · `server/src/arcade/arbitro.ts`: `Mesa.empezada`. Con la partida en marcha no
 *      se sienta nadie, y no vale mirar el estado ni el diario: un tic sobre una
 *      mesa de La Ronda a la que no ha llegado nadie ya construye su estado, así
 *      que con esa regla la mesa se cerraría la puerta a sí misma.
 *
 *  I · `server/src/arcade/mesas.ts`: quien hospeda, que es quien pregunta y quien
 *      cierra. En las dos puertas por las que cambia el estado —`mover` y el tic—
 *      y además AL RECUPERAR DEL ALMACÉN, que es la única por la que se alcanza una
 *      partida que ya terminó sin quedar marcada. Envuelto en el presupuesto y con
 *      el fallo dicho: es la única puerta del motor que ejecuta código de un arcade
 *      ajeno, y sin báscula un `seAcabo` que revienta tumbaba la LECTURA entera.
 *      También aquí: los dos enganches del canal —`cuandoSeCierreUnaMesa`, para que
 *      «Se acabó la partida» se anuncie de verdad, y `cuandoSeOlvideUnaMesa`, para
 *      que el barrido de las viejas no deje su entrada en el concentrador—.
 *
 * Los tres los encontró una auditoría adversaria, y los tres estaban ESCRITOS y
 * sin llamar por nadie. Es el mismo patrón que el hueco D de la vuelta anterior.
 *
 * Y UNA VUELTA MÁS, del verificador que leyó lo de arriba: el cierre al recuperar
 * NO SE GUARDABA. En memoria la mesa quedaba cerrada y en disco seguía diciendo
 * que no, porque ese camino no pasa por `mover` ni por el tic y `ponerAlDiaElPlazo`
 * sale antes de tiempo en una mesa terminada. Sanaba sólo con un apagado limpio;
 * tras una caída, otra vez en cada arranque. Se escribe al recuperar, sin esperar.
 *
 * ═══ Y `server/src/canal/` NO SE HA TOCADO, QUE ES UNA DECISIÓN Y NO UN OLVIDO ═══
 *
 * El §9 pone en la fase 5 «la segunda implementación de `canal/`» —un canal
 * continuo—, y NO SE HA ESCRITO. El propio §6 dice por qué no debería escribirse
 * todavía, y la frase no admite lectura amable: escribir el transporte rápido antes
 * de que exista un juego que lo pida es «cómo el motor volvería a nacer deformado,
 * esta vez por el transporte».
 *
 * Ninguno de los cinco juegos lo pide, y se puede decir uno a uno: La Frente no
 * toca la red; La Ronda y Riberas van por turnos y su unidad de tiempo es el turno,
 * no el fotograma; La Larga es Riberas con plazos de días; El Arcade corre entero
 * en el móvil y sube una repetición al terminar; La Peonza es de un aparato. No hay
 * ningún juego cuyo nombre se pueda escribir aquí.
 *
 * Y lo que se ahorra no es trabajo, es una forma concreta de equivocarse:
 * predicción y reconciliación son las dos piezas que hay que escribir, las dos son
 * difíciles, y las dos SÓLO se pueden probar contra un juego que se desincronice de
 * verdad. Sin él, lo que se entregaría es código que compila, pasa unas pruebas
 * escritas por quien lo escribió, y sale con la forma del primer juego que lo use
 * seis meses después.
 *
 * Lo que sí está y sigue estando: la COSTURA. `ponerCanal`/`elCanal` con sus
 * verbos, `rev` viajando en cada vista, «dame el estado desde la revisión N» en la
 * misma ruta que lee la mesa, y `verify:arcade-pobre` jugando una partida entera
 * con el canal sustituido por uno que LANZA. O sea que el día que llegue el juego
 * que lo pida, lo que hay que escribir es un timbre más rápido detrás de una
 * interfaz que ya tiene dos implementaciones probadas —la de sondeo y la que
 * revienta— y no un protocolo distinto.
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
