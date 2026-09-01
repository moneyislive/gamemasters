/**
 * QUÉ VE CADA CUAL. La firma y el registro — y NINGUNA implementación por
 * defecto, que es la decisión importante de este fichero.
 *
 * ═══ LA DOCTRINA, QUE YA ESTÁ ESCRITA EN EL OTRO MOTOR ═══
 *
 * La cabecera de `server/src/live/proyeccion.ts` lo dice en una línea que no
 * hace falta mejorar: «aquí no se oculta nada en el cliente: sencillamente no se
 * envía». El móvil de quien juega es un entorno hostil —basta con abrir las
 * herramientas del navegador— así que una carta secreta que viaje marcada como
 * oculta es una carta destapada con un adorno.
 *
 * ═══ POR QUÉ NO HAY UNA PROYECCIÓN POR DEFECTO ═══
 *
 * Porque la que se escribiría sale a medida del primer juego, y hay un ejemplo
 * público de exactamente eso: el `PlayerView.STRIP_SECRETS` de boardgame.io
 * privilegia dos nombres mágicos de clave, `secret` y `players`. O sea que para
 * aprovechar la primitiva genérica hay que llamar a tus cosas como las llamaba
 * el primer juego que la usó. Es la enfermedad entera en una función de diez
 * líneas.
 *
 * Y aquí no se puede ni intentar: el estado es OPACO. Una proyección por defecto
 * tendría que interpretar la forma del estado para decidir qué tapar, y eso
 * contradice lo único de lo que cuelga todo el diseño.
 *
 * ═══ ENTONCES, ¿QUÉ PASA SI UN JUEGO CON SECRETOS NO REGISTRA NINGUNA? ═══
 *
 * QUE NO ARRANCA. `exigirSecretosTapados()` en `index.ts` se niega en voz alta.
 *
 * La alternativa —seguir adelante mandando el estado entero— es un fallo mudo
 * del peor tipo que hay: nadie ve un error, la partida se juega, y la mano de
 * cada cual ha viajado a los móviles de los demás. Nadie se entera nunca, o se
 * entera el día que alguien mire la respuesta de la red. Convertirlo en una
 * negativa ruidosa a arrancar es exactamente lo que ya hace el registro de
 * veladas con las altas perdidas, y por el mismo motivo.
 *
 * ═══ Y POR QUÉ NO SE DEDUCE DE UNAS «ZONAS» DEL MANIFIESTO ═══
 *
 * Era la propuesta bonita: que el manifiesto declarase qué partes del estado son
 * públicas y cuáles privadas, y que la plataforma cortara sola. Buena intención,
 * mecanismo equivocado, y por lo mismo de antes: obligaría al motor a
 * interpretar la forma del estado. Una función la escribe quien conoce su juego;
 * una declaración la interpreta quien no lo conoce.
 */
import { NADIE_SENTADO } from './tipos';
import type { ArcadeId, LosSentados, QuienMira } from './tipos';

/**
 * LO QUE SALE HACIA UN ASIENTO. Lo escribe el juego.
 *
 * Recibe el estado entero y devuelve lo que se le manda a ese asiento en
 * concreto. Devolver `undefined` es legítimo y significa «a este no le llega
 * nada», que es lo que le pasa a quien todavía no se ha sentado.
 *
 * ═══ `quien` PUEDE SER `ESPECTADOR`, Y NO ES UN DESCUIDO ═══
 *
 * Un espectador es quien mira la mesa sin ocupar un sitio: la pantalla común de
 * un juego de fiesta, el aparato apoyado en el centro, alguien que mira una
 * partida antes de sentarse. Está en la firma desde el principio porque el día
 * que exista se resolvería, si no, con un asiento inventado —una cadena mágica
 * que colisiona con el nombre que alguien teclee— o con un segundo camino de
 * proyección solo para mirones, que es el que nadie prueba y por el que se
 * filtra la mano de otro.
 *
 * Y es el caso que hace de esto un concepto de plataforma y no de tablero: en
 * «La Frente», quien lleva el móvil en la frente es el único que NO puede ver la
 * palabra, mientras que los demás sí. La proyección no es «tapar lo mío»: es
 * «esto es lo que se ve desde aquí».
 *
 * ═══ EL TERCER ARGUMENTO ES DE LA FASE 5, Y ES LO QUE DEJA NOMBRAR A ALGUIEN ═══
 *
 * `sentados` trae quién ocupa cada asiento y cómo se llama. Sin él, un juego con
 * mesa no podía escribir «a Ana le toca» —sólo sabía identificadores— y la fase 4
 * lo rodeó desde el mueble. El razonamiento largo de por qué entra POR AQUÍ y no
 * por `ContextoMovimiento` está en `AsientoNombrado`, y se resume en una línea:
 * un nombre es presentación, y meterlo en el camino del reductor haría que la
 * misma partida reejecutada tras un renombrado diera otro estado.
 *
 * PUEDE LLEGAR VACÍO (`NADIE_SENTADO`) y no es un caso raro: lo recibe así el
 * propio reductor cuando se proyecta a sí mismo para ejercer el «sólo si», y
 * cualquier lectura hecha fuera de una mesa. Un juego que no lo trate se queda
 * enseñando identificadores, que es feo y legible; uno que se caiga por ello está
 * roto. Ver `comoSeLlama`.
 */
export type Proyeccion<E = unknown> = (
  estado: E,
  quien: QuienMira,
  sentados: LosSentados,
) => unknown;

/**
 * LO QUE JAMÁS PUEDE SALIR EN LA PROYECCIÓN DE OTRO. Solo para pruebas.
 *
 * ═══ POR QUÉ EXIGIR LA PROYECCIÓN NO BASTA ═══
 *
 * Exigir que la proyección EXISTA no comprueba que HAGA algo. Un juego puede
 * declarar `secretos: true`, registrar la identidad como proyección
 * —`(estado) => estado`— y pasar todos los comprobadores en verde mientras
 * filtra el mazo entero a todos los dispositivos de la mesa.
 *
 * Y un comprobador genérico no puede cazarlo, porque el estado es OPACO: no sabe
 * qué es la zona oculta y no puede saberlo. Ese es el precio de la opacidad de
 * la que cuelga todo el diseño, y hay que pagarlo o abandonarla.
 *
 * ═══ CÓMO SE CIERRA SIN ROMPER LA OPACIDAD ═══
 *
 * El juego, que sí sabe qué es secreto en su juego, declara los VALORES que
 * jamás pueden aparecer en la proyección de otro asiento: las cartas de la mano
 * ajena, la palabra que hay que adivinar, la semilla del azar. El comprobador de
 * la fase 2 los busca dentro de lo que se le manda a cada cual, y entonces la
 * comprobación es real y no una declaración de intenciones.
 *
 * **EL MOTOR NO LA LLAMA NUNCA EN EJECUCIÓN.** No está en el camino de ningún
 * movimiento ni de ninguna lectura: nada de `server/src/` la invoca. Por eso
 * seguir teniéndola no obliga al motor a interpretar el estado — solo obliga al
 * juego a decir en voz alta qué está escondiendo, que es una frase que quien
 * escribe el juego puede responder y quien escribe el motor no.
 *
 * ═══ SE LLAMA `loSecreto` Y NO «TESTIGO», A PROPÓSITO ═══
 *
 * «Testigo» ya significa otra cosa en este repositorio: es la credencial HMAC de
 * `server/src/live/token.ts`, y el comprobador `verify:tokens` se llama
 * «testigos» en la batería. Reutilizar la palabra sería repetir exactamente el
 * error que obligó a renombrar `reparto` antes de escribir una línea de código.
 * Un mismo término significando dos cosas incompatibles en el mismo árbol es
 * deuda de vocabulario en un proyecto cuya disciplina entera es que las palabras
 * signifiquen una cosa.
 */
export type LoSecreto<E = unknown> = (estado: E) => unknown[];

/**
 * Un arcade declara `secretos: true` y no ha registrado proyección.
 *
 * Se lanza al ARRANCAR, no al proyectar. Lanzarlo al proyectar significaría que
 * el fallo aparece con la mesa puesta y la gente dentro; lanzarlo al arrancar
 * significa que el servidor no se levanta y alguien lo lee en el despliegue.
 */
export class ArcadeSinProyeccion extends Error {
  constructor(public readonly arcade: ArcadeId) {
    super(
      `El arcade «${arcade}» declara \`secretos: true\` y no ha registrado proyección. ` +
        'Con secretos y sin proyección, el estado entero —incluida la parte oculta— ' +
        'viajaría a todos los dispositivos sin que nada diera un error.',
    );
    this.name = 'ArcadeSinProyeccion';
  }
}

/**
 * Un arcade declara `secretos: true` y no ha registrado `loSecreto`.
 *
 * Se separa del anterior porque el arreglo es distinto y quien lo lea en el
 * registro del despliegue necesita saber cuál le ha tocado: allí falta la
 * función que RECORTA; aquí falta la que dice QUÉ habría que recortar, sin la
 * cual el comprobador de la mesa no puede distinguir una proyección que tapa de
 * una que devuelve el estado tal cual.
 */
export class ArcadeSinLoSecreto extends Error {
  constructor(public readonly arcade: ArcadeId) {
    super(
      `El arcade «${arcade}» declara \`secretos: true\` y no ha registrado \`loSecreto\`. ` +
        'Sin ella, un juego puede registrar la identidad como proyección y pasar en verde ' +
        'mientras filtra la mano de todo el mundo: el comprobador no sabe qué buscar.',
    );
    this.name = 'ArcadeSinLoSecreto';
  }
}

/**
 * Se ha pedido proyectar un arcade que no tiene proyección registrada.
 *
 * Distinto del de arriba: aquél es una negativa a arrancar y éste es un error de
 * programación de quien hospeda —proyectar un juego que declaró no tener nada
 * que esconder—. Se separan porque tienen arreglos distintos y quien los lea en
 * un registro necesita saber cuál de los dos le ha tocado.
 */
export class ProyeccionNoRegistrada extends Error {
  constructor(public readonly arcade: ArcadeId) {
    super(`El arcade «${arcade}» no tiene proyección registrada, así que no hay nada que proyectar.`);
    this.name = 'ProyeccionNoRegistrada';
  }
}

/**
 * El registro de proyecciones, ANCLADO AL ÁMBITO GLOBAL.
 *
 * ═══ POR QUÉ `Symbol.for` Y NO UNA CONSTANTE DE MÓDULO ═══
 *
 * Porque este fichero se puede cargar DOS VECES. Es exactamente lo que ya
 * ocurrió en `shared/juegos/index.ts`: una prueba lo importaba como
 * `../../shared/juegos` y otro módulo como `./juegos`, el cargador los trató
 * como módulos distintos, cada copia tuvo su propia tabla y las altas se
 * perdieron EN SILENCIO. El síntoma fue que se registraba un juego y el resto
 * del sistema seguía sin verlo.
 *
 * Aquí sería peor que allí: una proyección que se pierde no da un error, deja de
 * recortar. O sea que el fallo sería que los secretos empiezan a viajar.
 *
 * Y es un símbolo PROPIO, distinto del de veladas. Ver la cabecera de
 * `index.ts` para por qué los dos registros no se juntan.
 */
/**
 * Y es UNA sola tabla para las dos funciones, no dos tablas.
 *
 * Van juntas porque van juntas: un juego con secretos las tiene las dos o no
 * arranca, y ninguna significa nada sin la otra. Dos tablas serían dos anclajes
 * al ámbito global —o sea, una exención más en `verify:pureza`— para guardar dos
 * cosas que siempre se preguntan a la vez.
 */
interface ComoSeTapa {
  proyeccion?: Proyeccion;
  loSecreto?: LoSecreto;
}

const LLAVE = Symbol.for('gamemasters.arcade.proyecciones');
const global_ = globalThis as unknown as Record<symbol, Record<ArcadeId, ComoSeTapa>>;
const TAPADO: Record<ArcadeId, ComoSeTapa> = global_[LLAVE] ?? (global_[LLAVE] = {});

/**
 * Da de alta la proyección de un arcade.
 *
 * Se puede llamar antes o después de registrar el manifiesto: la comprobación de
 * que un juego con secretos tiene la suya es de arranque y mira las dos tablas
 * cuando ya están completas, precisamente para no obligar a un orden de altas.
 */
export function registrarProyeccion<E>(arcade: ArcadeId, proyeccion: Proyeccion<E>): void {
  TAPADO[arcade] = { ...TAPADO[arcade], proyeccion: proyeccion as Proyeccion };
}

/**
 * Da de alta la lista de lo que jamás puede salir en la proyección de otro.
 *
 * Solo la llama el comprobador de la mesa. Ver `LoSecreto`.
 */
export function registrarLoSecreto<E>(arcade: ArcadeId, loSecreto: LoSecreto<E>): void {
  TAPADO[arcade] = { ...TAPADO[arcade], loSecreto: loSecreto as LoSecreto };
}

/** ¿Tiene este arcade proyección registrada? */
export function hayProyeccion(arcade: ArcadeId): boolean {
  return TAPADO[arcade]?.proyeccion !== undefined;
}

/** ¿Tiene este arcade declarado lo que esconde? */
export function hayLoSecreto(arcade: ArcadeId): boolean {
  return TAPADO[arcade]?.loSecreto !== undefined;
}

/**
 * Los valores que jamás pueden salir en la proyección de otro asiento.
 *
 * LA LLAMA EL COMPROBADOR, NO EL MOTOR. Si alguna vez aparece una llamada a esto
 * en el camino de un movimiento o de una lectura, la opacidad se ha roto: el
 * motor estaría interpretando el estado.
 */
export function loSecretoDe(arcade: ArcadeId, estado: unknown): unknown[] {
  const declarado = TAPADO[arcade]?.loSecreto;
  if (!declarado) throw new ArcadeSinLoSecreto(arcade);
  return declarado(estado);
}

/**
 * Proyecta el estado de un arcade para un asiento.
 *
 * FALLA si no hay proyección registrada, y no cae a devolver el estado entero.
 * Ese respaldo silencioso es justo lo que convertiría un juego mal instalado en
 * un juego que filtra: quien llama tiene que decidir, y para eso está
 * `vistaDeAsiento()` en `index.ts`, que mira el manifiesto y sabe si este juego
 * tenía algo que tapar.
 *
 * `sentados` es OPCIONAL en la llamada y obligatorio en la firma del juego, y esa
 * asimetría es a propósito: quien proyecta desde fuera de una mesa —un
 * comprobador, una sonda de arranque, el propio reductor— no tiene lista que
 * pasar y no debe tener que inventarse una; quien escribe el juego sí tiene que
 * ver el argumento en su firma para saber que existe.
 */
export function proyectar(
  arcade: ArcadeId,
  estado: unknown,
  quien: QuienMira,
  sentados: LosSentados = NADIE_SENTADO,
): unknown {
  const proyeccion = TAPADO[arcade]?.proyeccion;
  if (!proyeccion) throw new ProyeccionNoRegistrada(arcade);
  return proyeccion(estado, quien, sentados);
}

/**
 * Quita la proyección y `loSecreto` de un arcade. Para las pruebas, y solo eso.
 *
 * Existe porque un comprobador necesita poder montar la situación de «un juego
 * con secretos SIN nada que lo tape» dentro del mismo proceso donde ya ha
 * montado otros que sí lo tienen — y sin esto tendría que arrancar un proceso
 * aparte solo para eso. Una tabla anclada al ámbito global no se limpia sola
 * entre pruebas: ese es el precio del anclaje y conviene tener la puerta.
 *
 * Borra LAS DOS porque las dos van juntas: dejar media situación montada entre
 * dos pruebas es la forma de que la segunda pase por lo que hizo la primera.
 */
export function olvidarElTapado(arcade: ArcadeId): void {
  delete TAPADO[arcade];
}
