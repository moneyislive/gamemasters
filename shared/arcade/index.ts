/**
 * LOS ARCADES INSTALADOS. Registro propio, y separado del de veladas.
 *
 * ═══ POR QUÉ NO SE REGISTRAN EN `shared/juegos` ═══
 *
 * Es la tentación más barata de todo el diseño: ya hay un registro que funciona,
 * anclado, probado y con reparto por servidor. Meter aquí los arcades sería una
 * línea.
 *
 * Y el día siguiente, `app/src/vitrina.ts` pintaría los arcades en el carrusel
 * de VELADAS de la portada, porque ese carrusel lee `juegosInstalados()`. Para
 * evitarlo alguien metería un `if (esArcade)` dentro de `veladas()` — que es la
 * primera de las cien banderas que acaban deshaciendo la separación. La segunda
 * la pondría el generador de tramas, que le pediría un `Plot` a un juego de
 * pulsar un botón; la tercera, el paquete imprimible.
 *
 * Dos registros con dos símbolos distintos hacen que esa línea no se pueda
 * escribir por descuido. `verify:fronteras` lo comprueba estáticamente, y este
 * fichero lo hace imposible en tiempo de ejecución: no hay ninguna función aquí
 * que sepa qué es un `ManifiestoDeJuego`.
 *
 * ═══ REEXPORTADO UNO A UNO, NO CON `export *` ═══
 *
 * Y esto no es estilo: es un fallo que ya ocurrió y que cuesta una tarde
 * encontrar. Con la estrella, `tsx` dejaba fuera las funciones de `tipos.ts` en
 * tiempo de EJECUCIÓN mientras el compilador las daba por buenas — los tres
 * paquetes compilaban y el servidor reventaba al arrancar con «does not provide
 * an export named …». Está documentado en `shared/juegos/index.ts`, que es de
 * donde viene esta cautela.
 *
 * Un contrato que importan el móvil y el servidor no puede depender de esa
 * sutileza. Cuesta una línea por nombre y se paga una vez.
 */
import type { Aplicado, Avanzar, MovimientoRegistrado } from './motor';
import { aplicar, aplicarConMotivo, reejecutar } from './motor';
import type { Opcion, Opciones } from './opciones';
import {
  ArcadeSinLoSecreto,
  ArcadeSinProyeccion,
  hayLoSecreto,
  hayProyeccion,
  loSecretoDe,
  olvidarElTapado,
  proyectar,
  registrarLoSecreto,
  registrarProyeccion,
} from './proyeccion';
import type { LoSecreto, Proyeccion } from './proyeccion';
import {
  ESPECTADOR,
  exigeLoSecreto,
  exigeProyeccion,
  exigeReejecutabilidad,
  NADIE_SENTADO,
  necesitaMesa,
  problemasDelManifiesto,
} from './tipos';
import type {
  ArcadeId,
  LosSentados,
  ManifiestoDeArcade,
  Puntuacion,
  QuienMira,
} from './tipos';
import type { ContextoMovimiento, Movimiento } from './movimiento';

// ---------------------------------------------------------------------------
// Lo que se reexporta, uno a uno
// ---------------------------------------------------------------------------

export {
  cabenEnLaMesa,
  comoSeLlama,
  ESPECTADOR,
  exigeProyeccion,
  exigeReejecutabilidad,
  NADIE_SENTADO,
  necesitaMesa,
  problemasDelManifiesto,
  tieneReloj,
} from './tipos';
export type {
  AforoDeArcade,
  ArcadeId,
  AsientoId,
  AsientoNombrado,
  IconoDeArcade,
  LosSentados,
  ManifiestoDeArcade,
  MarcadorDeArcade,
  MuebleDeArcade,
  ProcedenciaDeArcade,
  Puntuacion,
  QuienMira,
  SedeDeArcade,
} from './tipos';

export type { ContextoMovimiento, Movimiento } from './movimiento';

export { aplicar, aplicarConMotivo, esRechazo, rechazar, reejecutar, ReductorMudo } from './motor';
export type { Aplicado, Avanzar, MovimientoRegistrado, Rechazo } from './motor';

export type { Opcion, Opciones } from './opciones';

export {
  ArcadeSinLoSecreto,
  ArcadeSinProyeccion,
  hayLoSecreto,
  hayProyeccion,
  loSecretoDe,
  olvidarElTapado,
  proyectar,
  ProyeccionNoRegistrada,
  registrarLoSecreto,
  registrarProyeccion,
} from './proyeccion';
export type { LoSecreto, Proyeccion } from './proyeccion';

export {
  esTic,
  movimientoDeTic,
  NUNCA,
  plazoDentroDe,
  quedanTics,
  segundosDe,
  TIC,
  ticsPara,
  vencido,
} from './reloj';
export type { Plazo, Tic } from './reloj';

// ---------------------------------------------------------------------------
// El registro
// ---------------------------------------------------------------------------

/** Un arcade instalado: sus reglas como dato y sus reglas como código. */
export interface ArcadeInstalado {
  manifiesto: ManifiestoDeArcade;
  /**
   * El reductor. Se guarda como `Avanzar<unknown>` porque el registro no puede
   * conocer la forma del estado de un juego que no conoce — es la misma razón
   * por la que `LiveSession.estado` es `Record<string, unknown>` en el otro
   * motor, y el mismo trato: el juego sabe lo que metió y lo lee tipado en su
   * propio fichero.
   */
  avanzar: Avanzar<unknown>;
  /**
   * QUÉ SE PUEDE HACER AHORA MISMO, si el juego lo dice. Ver `opciones.ts`.
   *
   * ═══ POR QUÉ VIVE EN ESTA TABLA Y NO EN UNA SUYA ═══
   *
   * Porque partir el alta en dos tablas es exactamente el fallo que
   * `app/src/arcade/pintados.ts` tuvo que matar: dos tablas contestando a
   * preguntas parecidas dejan de coincidir en cuanto entra el segundo inquilino,
   * y nadie se entera hasta que una pantalla enseña una tarjeta pulsable que no
   * lleva a ninguna parte.
   *
   * Un `Symbol.for('gamemasters.arcade.opciones')` nuevo habría sido una línea y
   * habría traído consigo un tercer anclaje al ámbito global, un tercer sitio del
   * que olvidarse al dar de baja un arcade y una tercera respuesta posible a «¿qué
   * sabe la plataforma de este juego?». `opciones` entra por la misma puerta que
   * el reductor porque es lo mismo que el reductor: reglas como código.
   *
   * (`proyeccion` y `loSecreto` sí viven en la otra tabla, y eso NO es la doble
   * tabla: son las dos mitades de una sola cosa —qué se tapa—, se preguntan
   * siempre juntas, y `olvidarElTapado` las quita a la vez. La cabecera de
   * `proyeccion.ts` lo tiene escrito.)
   */
  opciones?: Opciones;
  /**
   * CÓMO SE LE LEE LA CIFRA A SU ESTADO, si publica alguna. Ver `Puntuacion`.
   *
   * ═══ ESTABA EN UNA TABLA LLANA DE `juegos/`, Y AHORA ESTÁ AQUÍ ═══
   *
   * Aquella tabla se justificaba con esta frase, escrita en su cabecera: «una tabla
   * llana no tiene el problema de la doble carga… el problema de `INSTALADOS` era
   * que las ALTAS se perdían; aquí no hay altas». Era cierto mientras fue una
   * constante escrita a mano. Dejó de serlo el día que el enchufe de la fase 5 le
   * añadió una función para dar de alta la cifra de un arcade de FUERA: desde
   * entonces sí había altas en tiempo de ejecución, y el modo de fallo que aquel
   * razonamiento descartaba estaba vivo — con el síntoma peor de todos, que es un
   * récord honrado rechazado meses después y sólo en despliegue.
   *
   * Vive aquí por lo mismo que `opciones`: es lo que la plataforma sabe de un
   * juego, entra por la misma puerta que el reductor, y esta tabla ya está anclada
   * con `Symbol.for` porque la doble carga de módulo es un fallo REAL que este
   * repositorio ya pagó una vez con `shared/juegos/index.ts`.
   */
  puntuacion?: Puntuacion;
}

/**
 * La tabla, ANCLADA AL ÁMBITO GLOBAL.
 *
 * Podría ser una constante de módulo, y en el otro motor lo era hasta que una
 * prueba encontró el fallo: este fichero se puede cargar DOS VECES —una ruta lo
 * importa como `../../shared/arcade` y otra como `./arcade`, y el cargador las
 * trata como módulos distintos—, con lo que cada copia tendría su propia tabla y
 * las altas se perderían EN SILENCIO.
 *
 * El símbolo es PROPIO: `gamemasters.arcade.instalados`, hermano y no pariente
 * de `gamemasters.juegos.instalados`. Si compartieran símbolo compartirían
 * tabla, y entonces la separación de la que cuelga todo esto sería una
 * convención de nombres.
 */
const LLAVE = Symbol.for('gamemasters.arcade.instalados');
const global_ = globalThis as unknown as Record<symbol, Record<ArcadeId, ArcadeInstalado>>;
const INSTALADOS: Record<ArcadeId, ArcadeInstalado> = global_[LLAVE] ?? (global_[LLAVE] = {});

/**
 * Un manifiesto mal escrito. Se niega el alta.
 *
 * Fallar aquí es infinitamente mejor que dejar entrar un arcade con `tickHz`
 * negativo o sin nombre: lo primero lo lee quien despliega, lo segundo lo
 * descubre quien abre la Sala y encuentra una tarjeta en blanco.
 */
export class ArcadeMalEscrito extends Error {
  constructor(
    public readonly arcade: ArcadeId,
    public readonly problemas: string[],
  ) {
    super(`El arcade «${arcade}» no se puede instalar:\n  · ${problemas.join('\n  · ')}`);
    this.name = 'ArcadeMalEscrito';
  }
}

/**
 * Se ha pedido un arcade que este servidor no tiene instalado.
 *
 * No es un error de programación: es la situación normal el día que un servidor
 * instale un reparto distinto. Lo que no es normal es seguir adelante — y esa es
 * la lección más cara de este repositorio, donde `manifiestoDe` devolvía CLUEDO
 * por defecto y una partida entera se jugaba con las reglas de otro juego sin
 * que nada diera un error.
 */
export class ArcadeNoInstalado extends Error {
  constructor(public readonly arcade: ArcadeId) {
    super(`«${arcade}» no es un arcade instalado aquí.`);
    this.name = 'ArcadeNoInstalado';
  }
}

/**
 * DA DE ALTA UN ARCADE. Manifiesto y reductor van juntos, a propósito.
 *
 * En el otro motor son dos llamadas —`registrarJuego` y `registrarAcciones`— y
 * eso permite un estado intermedio raro: un juego declarado del que no se sabe
 * jugar, que se lista en el catálogo y revienta al primer movimiento. Aquí no
 * hay manera de llegar a ese estado, porque las reglas como dato y las reglas
 * como código entran por la misma puerta.
 *
 * La proyección va aparte y es opcional porque de verdad lo es: la mitad de los
 * arcades no tienen nada que esconder. Lo que no es opcional es que un juego con
 * `secretos: true` la traiga, y eso lo comprueba `exigirSecretosTapados()` cuando
 * ya están todas las altas hechas — para no obligar a un orden.
 */
export function instalarArcade<E, V = unknown>(alta: {
  manifiesto: ManifiestoDeArcade;
  avanzar: Avanzar<E>;
  proyeccion?: Proyeccion<E>;
  /**
   * Qué esconde este juego. Obligatorio de hecho si declara `secretos: true`,
   * y no de tipo: el arcade puede venir de fuera del binario, y allí no hay
   * compilador. Lo exige `exigirSecretosTapados()` al arrancar. Ver `LoSecreto`.
   */
  loSecreto?: LoSecreto<E>;
  /**
   * QUÉ PUEDE HACER CADA CUAL AHORA MISMO, mirando LA VISTA y jamás el estado.
   *
   * ═══ ESTE HUECO ES DE LA FASE 5, Y HASTA HOY NO EXISTÍA ═══
   *
   * `opciones()` está en el §5 bis del diseño desde el principio y este alta no lo
   * admitía, así que Riberas —el juego de la fase 4— lo resolvió por dentro:
   * exporta su función, la llama su propio reductor para ejercer el «sólo si» y la
   * llama su propio dibujo de tablero. Funciona, y tiene un límite que sólo se ve
   * desde fuera: **un arcade que no esté en el binario no puede tener opciones
   * genéricas**, porque no hay forma de que le diga a la plataforma «pregúntame».
   *
   * El §7 dice que los muebles genéricos «son los únicos que un arcade de FUERA
   * puede usar». Sin este hueco, esa frase valía sólo para un juego que se
   * resolviera él mismo el dibujo entero.
   *
   * Es OPCIONAL de verdad: La Frente y El Arcade pintan su propia pantalla y no la
   * necesitan. Ver `Opciones` para la firma y para por qué recibe la vista.
   *
   * ═══ LO QUE AQUÍ NO SE AÑADE, Y POR QUÉ SE DICE EN VOZ ALTA ═══
   *
   * Falta todavía una quinta cosa para que un mueble genérico pueda pintar un
   * juego de fuera SIN que el juego le mande el dibujo ya resuelto: un vocabulario
   * declarado de formas, con el que la plataforma —y no el juego— componga lo que
   * se ve. Hoy ese dibujo viaja resuelto dentro de la vista (`tablero-declarado.ts`),
   * y eso funciona porque quien lo resuelve es un juego de esta casa.
   *
   * NO SE AÑADE HOY Y NO SE LE PONE NOMBRE, a propósito. Un vocabulario geométrico
   * sólo se puede validar con DOS juegos pintados que lo usen de verdad; con uno
   * solo saldría con la forma de ese uno, que es el error que este motor entero
   * existe para no repetir. Y hoy su único inquilino sería Riberas. Nombrar el
   * hueco ahora sería peor que dejarlo: un nombre invita a que alguien lo rellene
   * antes de que exista con qué medirlo.
   */
  opciones?: Opciones<V>;
  /**
   * CÓMO SE LE LEE LA CIFRA A ESTE JUEGO, si publica alguna.
   *
   * ═══ ESTE HUECO CIERRA UNA GRIETA QUE LLEVABA ABIERTA DESDE LA FASE 3 ═══
   *
   * El manifiesto declara `marcador` —que hay cifra, cómo se llama y quién gana— y
   * el núcleo no tenía forma de saber CUÁL es el número, porque el estado es opaco.
   * De ahí salía una tabla escrita a mano en `juegos/puntuaciones.ts` cuya propia
   * cabecera decía, desde el primer día, que su sitio era éste.
   *
   * Es OPCIONAL en el tipo y obligatoria de hecho cuando `exigeReejecutabilidad()`
   * es cierta — igual que `loSecreto` con `secretos: true`, y por el mismo motivo:
   * un arcade puede venir de fuera del binario, y allí no hay compilador. Lo exige
   * `exigirCifrasLegibles()` al arrancar, cuando ya están todas las altas hechas.
   */
  puntuacion?: Puntuacion;
}): void {
  const problemas = problemasDelManifiesto(alta.manifiesto);
  if (problemas.length > 0) throw new ArcadeMalEscrito(alta.manifiesto.id, problemas);

  /*
   * ═══ UN ALTA BORRA LO QUE HUBIERA CON ESE ID, Y SIN ESTO SE HEREDABA ═══
   *
   * La línea de abajo sustituye la entrada entera, así que el manifiesto y el
   * reductor son los del que llega. Pero la proyección y `loSecreto` NO viven
   * aquí: viven en otra tabla, y en ella sólo se escribe si el alta los trae. O
   * sea que un arcade instalado ENCIMA de otro sin registrar proyección se
   * quedaba con LA PROYECCIÓN DEL ANTERIOR.
   *
   * Y las garantías de arranque lo daban por bueno: `exigirSecretosTapados()`
   * pregunta si hay proyección para ese id, y la había — la de otro juego. Un
   * arcade de fuera que reutilizara un id, por descuido o a propósito, arrancaba
   * declarando `secretos: true`, sin haber escrito una línea de tapado, y con una
   * función recortando un estado que no es el suyo. Lo que sale de ahí no lo sabe
   * nadie, y la comprobación que existe para impedirlo felicitaba.
   *
   * Se olvida ANTES de registrar y no después, para que el orden no importe: lo
   * que quede al salir de aquí es exactamente lo que trajo este alta.
   */
  olvidarElTapado(alta.manifiesto.id);

  INSTALADOS[alta.manifiesto.id] = {
    manifiesto: alta.manifiesto,
    avanzar: alta.avanzar as Avanzar<unknown>,
    ...(alta.opciones ? { opciones: alta.opciones as Opciones } : {}),
    ...(alta.puntuacion ? { puntuacion: alta.puntuacion } : {}),
  };
  if (alta.proyeccion) registrarProyeccion(alta.manifiesto.id, alta.proyeccion);
  if (alta.loSecreto) registrarLoSecreto(alta.manifiesto.id, alta.loSecreto);
}

/** Quita un arcade. Para las pruebas y para el reparto de un servidor. */
export function olvidarArcade(arcade: ArcadeId): void {
  delete INSTALADOS[arcade];
}

/** Todos los arcades instalados, para la Sala. */
export function arcadesInstalados(): ManifiestoDeArcade[] {
  return Object.values(INSTALADOS).map((a) => a.manifiesto);
}

/** ¿Está instalado? */
export function arcadeInstalado(arcade: ArcadeId): boolean {
  return INSTALADOS[arcade] !== undefined;
}

/** El manifiesto de un arcade, o nada. Para quien puede seguir sin saberlo. */
export function manifiestoDeArcadeSiExiste(arcade: ArcadeId): ManifiestoDeArcade | undefined {
  return INSTALADOS[arcade]?.manifiesto;
}

/** El manifiesto de un arcade. FALLA si no está instalado. */
export function manifiestoDeArcade(arcade: ArcadeId): ManifiestoDeArcade {
  const instalado = INSTALADOS[arcade];
  if (!instalado) throw new ArcadeNoInstalado(arcade);
  return instalado.manifiesto;
}

/** El reductor de un arcade. FALLA si no está instalado. */
export function reductorDe(arcade: ArcadeId): Avanzar<unknown> {
  const instalado = INSTALADOS[arcade];
  if (!instalado) throw new ArcadeNoInstalado(arcade);
  return instalado.avanzar;
}

/**
 * AVANZAR: la operación que da nombre a todo esto, con el arcade delante.
 *
 * El motor de `motor.ts` no conoce ningún registro y por tanto su `aplicar`
 * recibe el reductor ya resuelto. Aquí se resuelve por id, porque quien hospeda
 * lleva muchas mesas de muchos juegos distintos en el mismo proceso y no tiene
 * por qué acordarse de qué función le tocaba a cuál.
 *
 * Es la única función de este fichero que se usa en el camino caliente, y no
 * hace nada más que buscar en un objeto y llamar.
 */
export function avanzar(
  arcade: ArcadeId,
  estado: unknown,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): unknown {
  return aplicar(reductorDe(arcade), estado, movimiento, ctx);
}

/**
 * AVANZAR CONSERVANDO EL MOTIVO del rechazo, si el juego lo dio.
 *
 * Hermana de `avanzar()` y con el mismo trato que `aplicarConMotivo()` tiene con
 * `aplicar()`: el motivo hay que pedirlo por su nombre, para que quien sólo
 * quiera el estado no se encuentre de pronto con un objeto donde esperaba uno.
 *
 * La llama quien atiende un movimiento que ha mandado alguien —el árbitro— y no
 * la llama nadie en el camino de una reejecución: allí no hay nadie mirando.
 */
export function avanzarConMotivo(
  arcade: ArcadeId,
  estado: unknown,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): Aplicado<unknown> {
  return aplicarConMotivo(reductorDe(arcade), estado, movimiento, ctx);
}

/**
 * ¿QUÉ PUEDE HACER `quien` AHORA MISMO, según el propio juego?
 *
 * ═══ QUIÉN LLAMA A ESTO EN PRODUCCIÓN, PORQUE ES LA MITAD DE SU VALOR ═══
 *
 * `server/src/arcade/mesas.ts`, al componer TODA vista de mesa: la lista viaja en
 * `VistaDeMesa.opciones` y el mueble genérico pinta un botón por opción sin saber a
 * qué se juega. Escrito aquí porque durante un rato esta función no la llamó nadie
 * más que un comprobador, y un hueco que nadie recorre es una garantía que no
 * existe: el arcade de fuera seguía sin poder decirle a la plataforma «pregúntame»,
 * que era exactamente el motivo por el que se abrió el hueco.
 *
 * La pregunta se hace en el SERVIDOR y no en el móvil por una razón que no tiene
 * vuelta: el código de un arcade de fuera no está en el binario de la app, así que
 * allí esta misma llamada lanzaría `ArcadeNoInstalado`.
 *
 * Devuelve la lista vacía si el arcade no registró `opciones`, y eso NO es un
 * fallo: la mitad de los juegos pintan su propia pantalla y no tienen nada que
 * contestar. Un mueble genérico que reciba la lista vacía enseña lo que sepa
 * enseñar sin botones, que es exactamente lo que corresponde.
 *
 * Recibe LA VISTA y no el estado, y esta función es el sitio donde esa regla se
 * vuelve imposible de saltar desde fuera: quien llama aquí no tiene el estado —lo
 * que tiene es lo que le llegó por la red— y por tanto no puede pasar otra cosa
 * aunque quisiera.
 */
export function opcionesDeArcade(arcade: ArcadeId, vista: unknown, quien: QuienMira): readonly Opcion[] {
  const instalado = INSTALADOS[arcade];
  if (!instalado) throw new ArcadeNoInstalado(arcade);
  return instalado.opciones ? instalado.opciones(vista, quien) : [];
}

/** ¿Dice este arcade qué se puede hacer? Para que un mueble no pinte una lista vacía como si fuera «nada que hacer». */
export function hayOpciones(arcade: ArcadeId): boolean {
  return INSTALADOS[arcade]?.opciones !== undefined;
}

// ---------------------------------------------------------------------------
// LA CIFRA DE UN ESTADO OPACO
//
// ═══ POR QUÉ ESTO VIVE EN EL NÚCLEO DESDE LA FASE 5, Y NO ANTES ═══
//
// Vivía en `shared/arcade/juegos/puntuaciones.ts`, en una tabla llana escrita a
// mano, y aquella cabecera decía desde el primer día que su sitio era éste y por
// qué no podía estarlo: las fases 3 y 4 tenían prohibido tocar el núcleo, porque
// el diff vacío ERA la medida de la fase 4.
//
// Esa medida ya está tomada. Y mientras tanto, el enchufe de la fase 5 le añadió
// a aquella tabla una función de ALTA para que un arcade de fuera pudiera
// declarar su cifra, con lo que el argumento que sostenía que la tabla no
// necesitaba anclaje —«aquí no hay altas»— quedó falso y el fallo que descartaba
// quedó vivo. Aquí abajo no hay tabla nueva: es la misma `INSTALADOS` de siempre.
// ---------------------------------------------------------------------------

/**
 * Este arcade publica una cifra y nadie sabe leérsela.
 *
 * Hermana de `ArcadeSinProyeccion`, y con el mismo trato: se comprueba al arrancar
 * y no al primer récord. Un arcade así no está roto a medias — está roto entero, y
 * la única forma de que se note pronto es negarse a levantar el proceso.
 */
export class ArcadeSinPuntuacion extends Error {
  constructor(public readonly arcade: ArcadeId) {
    super(
      `El arcade «${arcade}» publica una cifra y nadie sabe leérsela: su alta no trae ` +
        '`puntuacion`. Sin ella no se puede verificar ningún récord suyo, porque el estado que ' +
        'sale de reejecutar una partida es opaco y sólo el juego sabe qué número hay dentro.',
    );
    this.name = 'ArcadeSinPuntuacion';
  }
}

/**
 * DA DE ALTA CÓMO SE LE LEE LA CIFRA A UN ARCADE YA INSTALADO.
 *
 * Existe aparte del alta por un solo motivo, y es el enchufe: un arcade de fuera
 * se instala con `instalarArcade` y puede querer registrar su cifra en otra línea
 * —o un comprobador quiere cambiarla sin volver a instalar el juego entero—. Lo
 * normal y lo recomendado es pasarla dentro del alta.
 *
 * FALLA si el arcade no está instalado, y eso es deliberado: registrar la cifra de
 * un juego que no existe no es un aviso, es una fila que nunca se va a leer. Es la
 * misma negativa que da `manifiestoDeArcade`, y por la misma lección.
 */
export function registrarPuntuacion(arcade: ArcadeId, puntuacion: Puntuacion): void {
  const instalado = INSTALADOS[arcade];
  if (!instalado) throw new ArcadeNoInstalado(arcade);
  instalado.puntuacion = puntuacion;
}

/** Quita la de un arcade, dejándolo instalado. Para las pruebas. */
export function olvidarPuntuacion(arcade: ArcadeId): void {
  const instalado = INSTALADOS[arcade];
  if (instalado) delete instalado.puntuacion;
}

/** ¿Sabe alguien leerle la cifra a este arcade? */
export function hayPuntuacion(arcade: ArcadeId): boolean {
  return INSTALADOS[arcade]?.puntuacion !== undefined;
}

/**
 * LA CIFRA DE ESTE ESTADO, según las reglas de este arcade.
 *
 * FALLA si no hay quien la lea, y no devuelve cero. Un cero por defecto sería la
 * lección más cara de este repositorio repetida: `manifiestoDe` devolvía CLUEDO
 * cuando no encontraba el juego, y una partida entera se jugaba con las reglas de
 * otro sin que nada diera un error. Aquí el equivalente sería aceptar todos los
 * récords de un juego con un cero, y que nadie se enterara.
 */
export function puntuacionDe(arcade: ArcadeId, estado: unknown): number {
  const instalado = INSTALADOS[arcade];
  if (!instalado) throw new ArcadeNoInstalado(arcade);
  if (instalado.puntuacion === undefined) throw new ArcadeSinPuntuacion(arcade);
  return instalado.puntuacion(estado);
}

/**
 * Los arcades instalados que publican una cifra y a los que nadie sabe leérsela.
 *
 * No lanza, por lo mismo que `problemasDelManifiesto` y que
 * `arcadesConSecretosSinTapar`: quien lo llama sabe mejor qué hacer con la lista.
 * La versión que no deja arrancar es `exigirCifrasLegibles()`.
 */
export function arcadesConCifraSinPuntuacion(): ArcadeId[] {
  const mal: ArcadeId[] = [];
  for (const m of arcadesInstalados()) {
    if (!exigeReejecutabilidad(m)) continue;
    if (!hayPuntuacion(m.id)) mal.push(m.id);
  }
  return mal;
}

/**
 * Y LA VERSIÓN QUE NO DEJA ARRANCAR. La llama quien levanta el proceso.
 *
 * ═══ POR QUÉ AHORA SÍ SE ENGANCHA AL ARRANQUE ═══
 *
 * Porque hasta hoy no podía. Esta comprobación vivía en `juegos/`, y colgar del
 * arranque una garantía escrita en la carpeta de los juegos habría sido meter una
 * regla de plataforma donde no toca — así que se quedó llamada sólo por
 * `verify:marcador`, o sea sólo en la batería y nunca en un despliegue.
 *
 * Lo que costaba: NADIE IMPEDÍA INSTALAR UN ARCADE CON CIFRA Y SIN FORMA DE
 * LEERLA. El arranque no fallaba; fallaba la verificación del PRIMER récord, o sea
 * meses más tarde y delante de alguien que acababa de jugar. Con el enchufe de la
 * fase 5 eso dejó de ser hipotético: un arcade de fuera declara su `marcador` en
 * un fichero que nadie de esta casa ha revisado.
 *
 * Ahora es lo que es el resto de este motor: una negativa ruidosa a arrancar.
 */
export function exigirCifrasLegibles(): void {
  const mal = arcadesConCifraSinPuntuacion();
  const primero = mal[0];
  if (primero === undefined) return;
  const error = new ArcadeSinPuntuacion(primero);
  if (mal.length > 1) {
    error.message += `\nY hay más sin cifra legible: ${mal.slice(1).join(', ')}.`;
  }
  throw error;
}

/** Reejecuta una partida entera de un arcade instalado. Ver `motor.reejecutar`. */
export function reejecutarEn(
  arcade: ArcadeId,
  inicial: unknown,
  registrados: readonly MovimientoRegistrado[],
): unknown {
  return reejecutar(reductorDe(arcade), inicial, registrados);
}

/**
 * LO QUE SE LE MANDA A UN ASIENTO.
 *
 * ═══ AQUÍ ESTÁ LA ÚNICA DECISIÓN DELICADA DEL FICHERO ═══
 *
 * Un arcade con `secretos: true` se proyecta, y si no hay proyección esto no se
 * llega a ejecutar nunca porque `exigirSecretosTapados()` habrá impedido arrancar.
 *
 * Un arcade con `secretos: false` manda el estado ENTERO. Y conviene decir por
 * qué eso NO es «una proyección por defecto», que es lo que `proyeccion.ts` se
 * niega a tener: no se está adivinando qué tapar ni privilegiando ningún nombre
 * de campo. Se está creyendo al juego cuando declara que no tiene nada que
 * tapar. La diferencia práctica es que aquí no hay ninguna heurística que pueda
 * equivocarse; hay una declaración que, si es falsa, es un fallo del juego y no
 * de la plataforma.
 *
 * Un juego con secretos que además registre proyección recorta; uno sin secretos
 * que la registre también, porque registrarla es una declaración de intención
 * más fuerte que el booleano. Al revés no: el booleano solo, sin función, no
 * puede recortar nada.
 *
 * `sentados` lleva quién ocupa cada asiento y cómo se llama, y su valor por
 * defecto es «no consta»: ver `Proyeccion`. Quien tiene una mesa delante lo pasa;
 * quien proyecta desde un comprobador o desde el propio reductor, no.
 */
export function vistaDeAsiento(
  arcade: ArcadeId,
  estado: unknown,
  quien: QuienMira,
  sentados: LosSentados = NADIE_SENTADO,
): unknown {
  if (hayProyeccion(arcade)) return proyectar(arcade, estado, quien, sentados);
  const manifiesto = manifiestoDeArcade(arcade);
  if (exigeProyeccion(manifiesto)) throw new ArcadeSinProyeccion(arcade);
  return estado;
}

/** Lo que le falta a un arcade con secretos para poder arrancar. */
export interface SecretoSinTapar {
  arcade: ArcadeId;
  /** `'proyeccion'` si no recorta; `'lo-secreto'` si no dice qué habría que recortar. */
  falta: Array<'proyeccion' | 'lo-secreto'>;
}

/**
 * SE COMPRUEBA AL ARRANCAR: todo arcade con secretos trae LAS DOS COSAS.
 *
 * ═══ POR QUÉ DOS Y NO UNA ═══
 *
 * La proyección es la que RECORTA. `loSecreto` es la que dice QUÉ habría que
 * recortar, y sin ella la primera no se puede comprobar: un juego que registre
 * `(estado) => estado` como proyección pasa en verde filtrándolo todo, porque un
 * comprobador genérico sobre estado opaco no sabe qué buscar. Exigir solo la
 * proyección comprueba que el sitio existe, no que haga nada.
 *
 * ═══ POR QUÉ AL ARRANCAR Y NO AL PROYECTAR ═══
 *
 * Porque un fallo al proyectar ocurre con la mesa puesta y la gente dentro, y la
 * única salida decente en ese momento es cortar la partida — o sea, castigar a
 * quien está jugando por un error de quien instaló el juego. Un fallo al
 * arrancar lo lee quien despliega, en el registro del despliegue, antes de que
 * nadie entre.
 *
 * Devuelve la lista entera en vez de lanzar en el primero para que quien lo lea
 * vea los tres de una vez. Quien llama decide si eso es una negativa a arrancar
 * —y en el servidor lo es— o un aviso.
 */
export function arcadesConSecretosSinTapar(): SecretoSinTapar[] {
  const mal: SecretoSinTapar[] = [];
  for (const instalado of Object.values(INSTALADOS)) {
    const m = instalado.manifiesto;
    const id = m.id;
    const falta: Array<'proyeccion' | 'lo-secreto'> = [];
    /*
     * DOS PREGUNTAS Y NO UNA, y por eso ya no hay un `continue` que se salte el
     * arcade entero. Con el `continue`, un juego que se olvidara de declarar
     * secretos no solo filtraba: se saltaba esta comprobacion, asi que el
     * comprobador de fugas anunciaba que no habia fugas habiendo mirado un
     * conjunto vacio.
     */
    if (exigeProyeccion(m) && !hayProyeccion(id)) falta.push('proyeccion');
    if (exigeLoSecreto(m) && !hayLoSecreto(id)) falta.push('lo-secreto');
    if (falta.length > 0) mal.push({ arcade: id, falta });
  }
  return mal;
}

/**
 * Y la versión que NO deja arrancar. Es la que llama quien levanta el proceso.
 *
 * Lanza con el primer problema y nombra a los demás en el mensaje: una excepción
 * solo puede llevar un `arcade` dentro, y quien lea el registro necesita la
 * lista entera para no arreglarlos de uno en uno a golpe de despliegue.
 *
 * ═══ QUIÉN LA LLAMA, QUE ES LO QUE ESTE PÁRRAFO DECÍA AL REVÉS ═══
 *
 * Aquí ponía «NADIE LA LLAMA TODAVÍA», escrito en la fase 0 con toda la razón —no
 * había ni rutas de arcade ni arcades que proteger— y con esta advertencia al
 * lado: «una garantía que existe y no está conectada es una garantía que no
 * existe». La advertencia funcionó: la fase 2 la conectó.
 *
 * La llama `comprobarArranque()` en `server/src/index.ts`, y va DESPUÉS de
 * instalar los arcades de fuera a propósito — puesta antes, comprobaría sólo los
 * cinco del binario, que son justamente los que alguien ya ha revisado, y dejaría
 * pasar sin mirar los que vienen de otro repositorio. El razonamiento entero está
 * en ese fichero, junto a la llamada.
 *
 * Y se queda escrito lo que decía antes, porque la frase vieja sobrevivió a su
 * propio arreglo: alguien que la leyera hoy daría por hecho que esta función es
 * decorativa, que es exactamente lo contrario de lo que es.
 */
export function exigirSecretosTapados(): void {
  const mal = arcadesConSecretosSinTapar();
  const primero = mal[0];
  if (primero === undefined) return;
  const error = primero.falta.includes('proyeccion')
    ? new ArcadeSinProyeccion(primero.arcade)
    : new ArcadeSinLoSecreto(primero.arcade);
  if (primero.falta.length > 1) {
    error.message += '\nY tampoco ha registrado `loSecreto`.';
  }
  if (mal.length > 1) {
    const otros = mal.slice(1).map((m) => `${m.arcade} (falta: ${m.falta.join(', ')})`);
    error.message += `\nY hay más sin tapar: ${otros.join('; ')}.`;
  }
  throw error;
}

// ---------------------------------------------------------------------------
// QUE UN JUEGO DE SERVIDOR AGUANTE LA MESA VACÍA
// ---------------------------------------------------------------------------

/** Un arcade que revienta cuando le preguntan por una mesa recién abierta. */
export interface ArcadeQueNoAguantaVacio {
  arcade: ArcadeId;
  /** Cuál de las tres puertas se cayó. */
  donde: 'avanzar' | 'proyeccion' | 'lo-secreto';
  fallo: string;
}

/**
 * Los arcades de servidor que NO sobreviven a que su mesa esté recién abierta.
 *
 * ═══ EL AGUJERO QUE ESTO TAPA, Y CÓMO SE ENCONTRÓ ═══
 *
 * Una mesa nace con `estado: undefined`, y es deliberado: así el reductor puede
 * construir su estado inicial en el PRIMER movimiento, cuando ya conoce la
 * semilla y los asientos —que al abrir todavía no existen—. Está razonado en
 * `Mesa.estado` del árbitro.
 *
 * El problema es que `instalarArcade<E>` ata el reductor y la proyección al
 * mismo `E`, y nada obliga a que `E` incluya `undefined`. Un juego de servidor
 * puede declarar `E = SuEstado`, compilar, instalarse, y reventar en la PRIMERA
 * LECTURA de toda mesa recién abierta. Lo destapó un revisor de la fase 2
 * abriendo una mesa y pidiéndola: HTTP 500, y una mesa huérfana en la tabla a la
 * que nadie podía sentarse, cerrar ni borrar.
 *
 * La Ronda sobrevivía sólo porque su autor se acordó de escribir
 * `EstadoDeLaRonda | undefined`. Acordarse no es una garantía: es la definición
 * de lo que este motor existe para no depender.
 *
 * ═══ POR QUÉ EN EL ARRANQUE Y NO EN EL TIPO ═══
 *
 * Por lo mismo que `exigirSecretosTapados()`, y la razón está escrita ahí
 * arriba: **un arcade puede venir de fuera del binario, y allí no hay
 * compilador**. Una unión que obligara a `E | undefined` protegería a los juegos
 * de dentro y a ninguno de los de fuera, que son justo los que nadie ha revisado.
 *
 * ═══ LO QUE ESTA SONDA COMPRUEBA Y LO QUE NO, DICHO ANTES DE QUE ALGUIEN SE FÍE ═══
 *
 * Comprueba ENTERO lo que se puede comprobar entero: la proyección y `loSecreto`
 * con la mesa vacía, que es exactamente por donde salió el 500 y por donde vuelve
 * a salir en cuanto alguien abra una mesa.
 *
 * Del reductor comprueba UNA cosa: que no se caiga con un movimiento que no
 * conoce. Eso caza la forma común del fallo —mirar dentro del estado antes de
 * mirar de qué movimiento se trata— y NO caza un reductor que sólo reviente en
 * uno de sus movimientos propios, porque el manifiesto de arcade no declara los
 * movimientos y no hay lista que recorrer. Queda dicho para que nadie lea un
 * verde de aquí como «este juego aguanta cualquier cosa».
 */
export function arcadesQueNoAguantanVacio(): ArcadeQueNoAguantaVacio[] {
  const mal: ArcadeQueNoAguantaVacio[] = [];

  for (const instalado of Object.values(INSTALADOS)) {
    const m = instalado.manifiesto;
    // Un juego de dispositivo no tiene mesa que abrir: nadie le va a preguntar.
    if (!necesitaMesa(m)) continue;

    const ctx: ContextoMovimiento = { quien: null, azar: 1, tic: 0, asientos: [] };
    const apuntar = (donde: ArcadeQueNoAguantaVacio['donde'], error: unknown): void => {
      mal.push({ arcade: m.id, donde, fallo: error instanceof Error ? error.message : String(error) });
    };

    try {
      instalado.avanzar(undefined, { tipo: 'sonda:mesa-vacia' }, ctx);
    } catch (error) {
      apuntar('avanzar', error);
    }
    if (hayProyeccion(m.id)) {
      try {
        proyectar(m.id, undefined, ESPECTADOR);
      } catch (error) {
        apuntar('proyeccion', error);
      }
    }
    if (hayLoSecreto(m.id)) {
      try {
        loSecretoDe(m.id, undefined);
      } catch (error) {
        apuntar('lo-secreto', error);
      }
    }
  }

  return mal;
}

/**
 * Y la versión que NO deja arrancar, hermana de `exigirSecretosTapados()`.
 *
 * Se lanza con el primero y se nombran los demás por la misma razón: quien lea
 * el registro necesita la lista entera para no arreglarlos de uno en uno a golpe
 * de despliegue.
 */
export function exigirQueAguantenVacio(): void {
  const mal = arcadesQueNoAguantanVacio();
  const primero = mal[0];
  if (primero === undefined) return;
  const otros =
    mal.length > 1 ? `\nY hay más: ${mal.slice(1).map((x) => `${x.arcade} (${x.donde})`).join('; ')}.` : '';
  throw new Error(
    `El arcade «${primero.arcade}» declara \`sede: 'servidor'\` y se cae cuando su mesa acaba de abrirse: ` +
      `\`${primero.donde}\` con el estado vacío lanza «${primero.fallo}».\n` +
      'Una mesa nace SIN estado a propósito, para que el reductor lo construya en el primer movimiento ' +
      'con la semilla y los asientos ya puestos. Así que sus tres puertas tienen que admitir `undefined`: ' +
      'declara el estado del juego como `SuEstado | undefined` y trátalo como «la partida aún no ha empezado».' +
      otros,
  );
}
