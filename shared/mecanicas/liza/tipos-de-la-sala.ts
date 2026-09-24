/**
 * LOS TIPOS DE LA SALA PURA DE LA LIZA: su estado, lo que entra en cada paso y lo que sale.
 *
 * ═══ POR QUÉ LOS TIPOS VAN APARTE DE LA SALA ═══
 *
 * Cuatro frentes trabajan contra la sala a la vez y sólo uno la escribe. La E/S del servidor
 * (`server/src/liza/`) la alimenta y reparte lo que devuelve; el cliente del juego interpreta sus
 * sucesos; los comprobadores la juegan con robots. Si el contrato viviera dentro de `sala.ts`, cada
 * cambio de la implementación movería a los otros tres. Aquí está lo que se promete; `sala.ts` y sus
 * piezas (`cuerpo.ts`, `combate.ts`, `proyectiles.ts`, `cerebro.ts`, `encuentros.ts`) lo cumplen.
 *
 * ═══ LA SALA ES UNA FUNCIÓN ═══
 *
 * `avanzarLaSala(sala, entradas)` da un tic: recibe el estado y lo que llegó por el canal desde el tic
 * anterior, y devuelve el estado siguiente con lo que hay que contar. PURA: nada de relojes, ni de red,
 * ni de `Math.random` —el azar es el `Azar` de `azar.ts` que viaja DENTRO del estado, sembrado con la
 * semilla pública de la fase—; el tiempo es el número de tic. Así la sala entera se prueba en Node y en
 * Hermes sin servidor, y un fallo se reproduce con la declaración, las entradas y la semilla.
 *
 * Toda la E/S —el WebSocket, el temporizador de 50 ms, las cuotas, medir la ida y vuelta, meter los
 * veredictos en la mesa— es de `server/src/liza/`, y entra aquí como ENTRADAS con números ya medidos.
 *
 * ═══ LOS DOS RELOJES ═══
 *
 * Hay dos relojes y ninguno es el de pared:
 *   · EL DE LA SALA: `tic × MS_POR_TIC`, más lo que lleve del tic en curso. Lo lleva la E/S.
 *   · EL DEL APARATO: los ms enteros que lleva abierto SU CANAL —`performance.now()` menos el
 *     `performance.now()` al abrirlo—. Su TIC es ese reloj partido en tramos de 50 ms, que es el `n` de
 *     cada `aqui`. Empieza en 0 con cada canal, a propósito: una pestaña recargada vuelve a empezar su
 *     `performance.now()`, y un reloj que se reinicia a escondidas mandaría a la basura todos sus `aqui`
 *     hasta alcanzar al de antes. Así, cada canal nuevo es un reloj nuevo, y la sala lo sabe porque
 *     cada canal nuevo le llega como una `EntradaConexion`.
 * El DESFASE de un asiento es `reloj del aparato − reloj de la sala`. Es una ESTIMACIÓN: lleva un error
 * de unas decenas de ms que no se puede quitar, porque la ida y la vuelta no tienen por qué durar lo
 * mismo.
 *
 * ═══ EL PRIMER DESFASE LLEGA CON EL CANAL, NO DOS SEGUNDOS DESPUÉS ═══
 *
 * Sin desfase no hay instantes que mandar: el anillo de un anuncio se cerraría en un reloj que no es el
 * del aparato, y cada esquiva del primer rato saldría golpe. Por eso la sala nunca ve un asiento
 * conectado sin desfase: la E/S no le mete la `EntradaConexion` hasta tener los dos números.
 *   · La ida y vuelta: la E/S manda un ping de `ws` nada más aceptar el enchufe; los navegadores lo
 *     contestan solos, sin esperar a nadie. Si el pong no llega en `PLAZO_DEL_HOLA_MS`, cierra con
 *     `sinHola`: un canal que no contesta un ping en tres segundos no sirve para esquivar.
 *   · El reloj del aparato: el `c` del `hola`. Desfase = `c + rtt/2 − reloj de la sala al recibirlo`.
 * Después, cada `eco` (el primero va justo detrás del `hola`) lo afina con una `EntradaEco`.
 *
 * ═══ CÓMO SE JUZGA UNA ESQUIVA SIN QUE EL DESFASE IMPORTE ═══
 *
 * Si la esquiva se juzgara pasando la pulsación al reloj de la sala con el desfase de ahora, el error
 * de la estimación entraría entero en la ventana limpia —150 ms de ventana contra 40 de error— y
 * esquivar limpio sería suerte. Por eso se juzga EN EL RELOJ DEL APARATO, así:
 *
 *   1. Al anunciar un impacto que cae en el instante `I` de la sala, la sala calcula para el blanco
 *      `tBlanco = I + desfase del blanco EN ESE MOMENTO`, lo GUARDA en el anuncio (`AnuncioPendiente`)
 *      y se lo manda tal cual (`anuncio.t`). A cada otro destinatario, con su propio desfase.
 *   2. El aparato cierra el anillo exactamente en `tBlanco` de su reloj. La persona reacciona al anillo.
 *   3. La pulsación viaja con su `ms` del aparato (`aqui.a[1]`, el `timeStamp` del evento).
 *   4. La sala compara `tBlanco − ms` —dos números del MISMO reloj— con la ventana, en el orden que fija
 *      `EsquivaDeclarada` (ventana, luego intocable). El desfase se usó una vez, para escribir
 *      `tBlanco`, y ese mismo número es el que se juzga: si la estimación estaba mal por 40 ms, el anillo
 *      se vio 40 ms antes o después en tiempo de pared, y la persona pulsó con el anillo; la resta no lo
 *      nota. Recalcular `I + desfase de ahora` al juzgar metería la diferencia entre dos estimaciones:
 *      eso es lo que NO se hace.
 *   5. La sala espera la pulsación hasta el tic del impacto más `comp` (`RedDeclarada`) MÁS UN TIC
 *      (`TICS_DEL_AQUI`), y entonces resuelve. El `comp` cubre la red —media ida y vuelta y el error del
 *      desfase—; el tic de más, que la pulsación viaja en el `aqui` del final de SU tic del aparato, hasta
 *      50 ms después de pulsar. Sin él, que una esquiva pulsada a tiempo saliera limpia dependía de en qué
 *      punto de su tic estuviera el aparato (lo midió la revisión del frente de la sala: pulsando 30 ms
 *      antes del impacto, 63 limpias de 81 combinaciones de fase, desfase y red; con él, todas). Contra
 *      una entidad, o al aire, no hay pulsación que esperar y se resuelve en el impacto.
 *
 * Lo mismo con la CADENA de golpes del autor: su `tAutor` guardado contra el `ms` de su pulsación. Y
 * con las balas: la salida de cada una en el reloj de cada asiento (`BalaDeLaSala.salidaEnSuReloj`).
 *
 * Cuando hace falta situar una pulsación en el tiempo de la SALA —en qué tic empieza la esquiva, en qué
 * tic de la sala estaba el blanco de una bala— se usa el desfase que la E/S tenía al recibirla, que viaja
 * en la propia entrada (`EntradaAqui.desfaseMs`): `msDeLaSala = ms − desfaseMs`. Una pulsación que así
 * cae más de `comp` en el futuro de la sala es un aparato que miente, y se toma como «ahora».
 *
 * ═══ UN CANAL NUEVO ES UN RELOJ NUEVO: LO QUE LA SALA REHACE EN CADA CONEXIÓN ═══
 *
 * En cada `EntradaConexion` —la primera, la de quien recargó la pestaña y la de quien reemplaza un canal
 * abierto con el mismo asiento— la sala:
 *   · olvida lo que dependía del reloj viejo de ese aparato: su último `n` (vuelve a −1), su acción
 *     guardada, su acción sostenida y su eslabón de cadena;
 *   · REESCRIBE con el desfase nuevo el `tBlanco` y el `tAutor` de los anuncios pendientes que le tocan,
 *     y su `salidaEnSuReloj` en cada bala en vuelo: el número guardado ya no es de ningún reloj que exista;
 *   · y le manda la puesta al día (ver `Bienvenida`).
 * La E/S, por su lado, ya cerró el canal viejo (`reemplazado`) y no mete nada suyo detrás.
 *
 * ═══ QUÉ PUEDEN LEER LOS DEMÁS DEL ESTADO ═══
 *
 * La E/S y los comprobadores leen `tic`, `declaracion`, `fase` y, de cada asiento, `numero`, `asiento`,
 * `conectado` y `conCuerpo`. Todo lo demás es de la sala: está escrito aquí —TODO, también lo que sólo
 * usa ella para validar y juzgar— para que el estado sea dato llano —se puede comparar entre Node y
 * Hermes, guardar y reproducir— y lo diga el contrato entero, no para que nadie lo toque desde fuera. La única excepción a «dato llano» es `arena`: se deriva de la declaración y viaja por
 * referencia para no derivarla en cada tic; no se serializa ni se compara.
 */
import type { Azar } from '../azar';
import type { Arena } from '../mundo';
import type {
  CargaDePortable,
  IdDeclarado,
  LizaDeclarada,
  ResultadoDeRonda,
  VeredictoDeLaLiza,
} from './declaracion';
import type { CodigoDeIrse, SucesoDelTic, TuplaDeFoto } from './protocolo';

/** Cuántos sitios validados guarda la sala de cada asiento: 64 tics, 3,2 s, para juzgar balas. */
export const TOPE_DEL_RASTRO = 64;

/**
 * LO QUE TARDA UNA PULSACIÓN EN SALIR DEL APARATO: un tic (ver el punto 5 de la cabecera). La sala espera
 * un anuncio contra un asiento hasta `impacto + comp` más este tic, y da por buena una pulsación de hasta
 * `comp` más este tic atrás.
 */
export const TICS_DEL_AQUI = 1;

/**
 * ═══ UN `aqui` VIVO, Y POR QUÉ «DOS SEGUNDOS SIN `aqui`» NO BASTABA ═══
 *
 * El ausente momentáneo (`PresenciaDeclarada`) es para el aparato que no está jugando aunque tenga el
 * canal abierto: la pestaña oculta, la llamada entrante, el WebView en segundo plano. Y el navegador no
 * siempre PARA esa pestaña: Chrome la FRENA, con los temporizadores a uno por segundo, y el aparato manda
 * cada segundo sus últimos tics de golpe (el cliente, ocho). Contando sólo «algún `aqui`», nunca pasaban
 * dos segundos, nunca quedaba ausente —y si quedaba, la ráfaga siguiente lo devolvía—, y el jugador de la
 * pestaña oculta caía en el primer encuentro sin poder hacer nada (lo vio el frente del cliente).
 *
 * Así que lo que cuenta es el `aqui` VIVO: el que cierra una serie de `AQUIS_PARA_ESTAR` tics del aparato
 * SEGUIDOS (cada `n` el anterior más uno). Un aparato a la vista manda un `aqui` por cada tic suyo, y una
 * red que se atasca le entrega a la sala muchos de golpe pero sin huecos; uno frenado se salta tics
 * enteros y tras cada parada manda como mucho `TOPE_DE_AQUIS_DE_GOLPE` (`protocolo.ts`), menos que una
 * serie: no la hace nunca. Sin `aqui` vivo `ausenteTrasTics`, ausente; y se vuelve al primer `aqui` vivo:
 * medio segundo seguido de aparato despierto. Conectar un canal y reaparecer cuentan como uno (el aparato
 * acaba de dar señales de vida y aún no ha podido hacer su serie).
 *
 * No se mira si llegan A TIEMPO. Una primera versión lo exigía (a media ida y vuelta de su tic, con tres
 * de holgura) y cazaba igual a la pestaña frenada; pero ese «a tiempo» se cuenta con el desfase ESTIMADO
 * del aparato, y un desfase mal estimado en un par de tics dejaba a un jugador despierto ausente para
 * siempre: intocable, e ignorado por todos. Un fallo así es peor que el que se arregla.
 *
 * ═══ Y POR QUÉ ESTAR AUSENTE NO PUEDE SER UNA VENTAJA ═══
 *
 * La sala no distingue una pestaña frenada de un aparato que FINGE estarlo: le basta con saltarse un `n`
 * de cada diez para no hacer nunca su serie. Lo midió la revisión del frente: el ausente de entonces ni
 * bloqueaba el paso ni las acciones, y un aparato así jugaba el combate entero intocable (el 96 % de los
 * tics), ignorado por todos, y pegando: 16 774 de daño hecho y ninguno recibido, contra 8 904 y 330 del
 * honrado en el mismo asiento. Y volviendo con el intocable de quien reaparece —dos segundos— y
 * callándose otra vez, era intocable el 81 % del tiempo sin dejar nunca de pelear. Así que la regla es que
 * al ausente sólo se llega SIN JUGAR, y que estar ausente CUESTA lo que protege:
 *   · QUIEN JUEGA NO SE QUEDA AUSENTE. Un `aqui` que pulsa algo o que se mueve aleja el ausente igual que
 *     uno vivo: una pestaña oculta no genera ninguno de los dos (el aparato suelta los mandos al ocultarse),
 *     y un aparato que se salta tics pero sigue peleando no llega nunca a él. Sin esto, cada vez que le
 *     llegaba el ausente se le cortaba todo lo que le habían lanzado en el último segundo, y callarse con
 *     huecos, volver y seguir era negocio aunque el ausente no dejara pegar. Con esto, a quien juega el
 *     ausente no le toca: su sala sale igual, suceso a suceso, que si no existiera (bloque 22 de
 *     `verify:liza`). Sólo el `aqui` vivo, en cambio, SACA del ausente: un aparato frenado con un mando
 *     atascado no sale y entra cada segundo.
 *   · EL AUSENTE NI ANDA NI PEGA. Su estado bloquea el paso y las acciones —`problemasDeLaDeclaracion` lo
 *     exige— y quien queda ausente se queda sin lo que tenía empezado: lo que lanzó y no ha llegado sale
 *     `cortada` (entra en un estado que bloquea: ver `combate.ts`), también el golpe tras el vuelo, y sus
 *     esquivas se olvidan (una bala que lo cruza lo juzga su intocable, no una ventana).
 *   · LA VUELTA ES CORTA Y NO SIRVE PARA PEGAR. Vuelve con la puesta de quien reaparece recortada a
 *     `TICS_DE_LA_VUELTA` —medio segundo de intocable: lo que tarda en ver lo que tiene delante, que un
 *     golpe que no vio venir no lo reciba en su primer tic—, y esa vuelta SE ACABA en cuanto empieza una
 *     acción (golpe, esquiva o sostenida), con su intocable. Intocable y pegando a la vez, nunca.
 *   · Y SE CUENTA ENTERO. El ausente que «se fue» (`seFue` en `cuerpo.ts`) suma todos los ratos de la fase
 *     (`CuerpoDeAsiento.ausenteAcumulado`), no sólo el de ahora: con 57 segundos oculto y uno a la vista en
 *     bucle, nunca llegaba a sesenta seguidos y el encuentro en solitario acababa AGUANTADO sin jugarlo.
 */
export const AQUIS_PARA_ESTAR = 10;

/** Lo que dura, como mucho, la vuelta del ausente: su intocable corto (ver arriba). Medio segundo. */
export const TICS_DE_LA_VUELTA = 10;

/* ─── LO QUE ENTRA ───────────────────────────────────────────────────────── */

/**
 * Una acción recibida dentro de un `aqui`: su id, el instante de la pulsación en ms DEL APARATO (de su
 * canal: ver la cabecera) y el número de su blanco (0 = sin blanco).
 */
export interface AccionRecibida {
  readonly id: IdDeclarado;
  readonly msDelAparato: number;
  readonly blanco: number;
}

/**
 * Un `aqui` de un asiento, ya leído por el lector estricto. `n` es el tic del aparato (ver la
 * cabecera); `x`, `z` en Q16.16; `r` la mira; `m` la marcha. `desfaseMs` es el desfase que la E/S
 * tenía para ese asiento al recibirlo (`reloj del aparato − reloj de la sala`, en ms).
 */
export interface EntradaAqui {
  readonly tipo: 'aqui';
  readonly asiento: number;
  readonly n: number;
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly m: number;
  readonly accion: AccionRecibida | null;
  readonly desfaseMs: number;
}

/**
 * La E/S midió de nuevo la red de un asiento: la ida y vuelta (`rttMs`, la mediana que lleve) y el
 * desfase de su reloj. La sala los guarda y de ahí saca su `comp`.
 */
export interface EntradaEco {
  readonly tipo: 'eco';
  readonly asiento: number;
  readonly rttMs: number;
  readonly desfaseMs: number;
}

/** Un `aviso` de un asiento, ya leído. */
export interface EntradaAviso {
  readonly tipo: 'aviso';
  readonly asiento: number;
  readonly clase: IdDeclarado;
  readonly objetivo: number;
}

/**
 * El asiento abrió un canal y dijo `hola` bien: con la PRIMERA medida de su red, que la E/S ya tiene
 * (ver en la cabecera cómo). Llega también cuando el asiento ya estaba conectado —recargó o abrió otra
 * pestaña—, y entonces es un reloj nuevo: ver «un canal nuevo es un reloj nuevo». En el mismo paso la
 * sala le contesta con una `Bienvenida`.
 */
export interface EntradaConexion {
  readonly tipo: 'conexion';
  readonly asiento: number;
  readonly rttMs: number;
  readonly desfaseMs: number;
}

/** El asiento perdió su canal (y no abrió otro que lo reemplace). */
export interface EntradaDesconexion {
  readonly tipo: 'desconexion';
  readonly asiento: number;
}

/**
 * La mesa cambió de revisión y su productor dio una declaración nueva. La E/S sólo la mete si
 * `problemasDeLaDeclaracion` da `[]` y si su `aforo` es el MISMO que el de la declaración con que nació
 * la sala: el coste se admitió al abrir y no puede crecer por el camino (ver `AforoDeLaSala`). Si trae
 * otra `fase.clave`, empieza otra fase (ver `FaseDeLaLiza`); si no, es la misma fase con otros números
 * (un voto, una elección…) y la sala los toma sin reiniciar nada.
 */
export interface EntradaVista {
  readonly tipo: 'vista';
  readonly declaracion: LizaDeclarada;
}

export type EntradaDeLaSala = EntradaAqui | EntradaEco | EntradaAviso | EntradaConexion | EntradaDesconexion | EntradaVista;

/* ─── LO QUE SALE ────────────────────────────────────────────────────────── */

/**
 * Un suceso y a quién va: `para` 0 es a todos los canales de la sala; 1-15, sólo a ese asiento. Los que
 * llevan un instante (`anuncio`, `bala`) salen UNO POR DESTINATARIO, cada uno con el instante en el
 * reloj de ése; los demás, una vez con `para` 0. Los de un paso van en el orden en que pasaron: el `nace`
 * de una entidad antes que su primer `estado`, y la E/S no los reordena. Si a un canal le tocan más de
 * los que caben en un `tic` (`TOPE_DE_SUCESOS`), la E/S los parte en varios `tic` con el mismo `k`, en
 * el mismo orden.
 */
export interface SucesoDeLaSala {
  readonly para: number;
  readonly suceso: SucesoDelTic;
}

/** Hay que mandarle `corrige` a este asiento: su tic `n` no vale y vuelve a `(x, z)` (Q16.16). */
export interface Correccion {
  readonly asiento: number;
  readonly n: number;
  readonly x: number;
  readonly z: number;
}

/**
 * Hay que mandarle `dentro` a este asiento: aparece en `(x, z)` (Q16.16) mirando a `r`. Si tenía
 * cuerpo, en su último sitio bueno; si no, en su sitio de nacer.
 *
 * ═══ QUIEN ENTRA A MEDIA FASE NO HA VISTO NACER NADA ═══
 *
 * En el mismo paso de la bienvenida, la sala le pone al día con sucesos `para` ese asiento, en este
 * orden: la `fase` vigente (con lo que le queda a cada reloj); el `recurso`; una `cuenta` por asiento;
 * una `carga` por asiento y portable que lleve algo; un `nace` por entidad viva (en su sitio de ahora);
 * un `estado` por cuerpo que esté en alguno (con los tics que LE QUEDAN); un `monton` por montón; la
 * `zona` activa si la hay; una `bala` por bala en vuelo, un `apunta` por entidad que esté apuntando y un
 * `anuncio` por anuncio pendiente, los tres con el instante en SU reloj nuevo. Sin esto, quien reconecta
 * vería una plaza vacía con golpes que salen de la nada: es el mismo papel que `vidas` tiene en el canal
 * de botas.
 *
 * El aparato, al recibir `dentro`, TIRA todo lo que sabía de la sala y se queda con lo que venga detrás:
 * no sabe qué se perdió, y una sala que renació tras un despliegue no tiene nada que ver con la de antes.
 */
export interface Bienvenida {
  readonly asiento: number;
  readonly x: number;
  readonly z: number;
  readonly r: number;
}

/**
 * LO QUE DEVUELVE UN PASO. La E/S manda, en este orden: las `bienvenidas` (`dentro`), las
 * `correcciones` (`corrige`), el `tic` (o los `tic`) de cada canal con los `sucesos` que le tocan —si le
 * toca alguno: un `tic` vacío no se manda—, y la foto si `fotoDebida` no es `null` —escrita una vez y
 * mandada a todos—. Los `veredictos` los mete en la mesa con `meterDeLaPlataforma`, en orden, y avisa a
 * los que sondean si `subio`.
 */
export interface PasoDeLaSala {
  readonly sala: EstadoDeLaSala;
  readonly sucesos: readonly SucesoDeLaSala[];
  readonly veredictos: readonly VeredictoDeLaLiza[];
  /** Las tuplas de la foto de este tic, o `null` si este tic no toca foto (va una cada dos tics). */
  readonly fotoDebida: readonly TuplaDeFoto[] | null;
  readonly correcciones: readonly Correccion[];
  readonly bienvenidas: readonly Bienvenida[];
}

/* ─── EL ESTADO ──────────────────────────────────────────────────────────── */

/** Un sitio validado y el tic de la SALA al que corresponde. Q16.16. */
export interface SitioEnElTic {
  readonly tic: number;
  readonly x: number;
  readonly z: number;
}

/**
 * EL ESTADO EN QUE ESTÁ UN CUERPO AHORA, con sus tiempos ya en tics de la sala. Dura mientras
 * `tic < hastaTic`; es intocable mientras `tic < intocableHastaTic`; desde `soltableEnTic` una acción
 * lo termina (ver `PuestaDeEstado.soltableDesdeTic`).
 */
export interface EstadoEnCurso {
  readonly estado: IdDeclarado;
  readonly desdeTic: number;
  readonly hastaTic: number;
  readonly intocableHastaTic: number;
  readonly soltableEnTic: number;
  /** La distancia extra (Q16.16) que el presupuesto le admite mientras dure. */
  readonly distanciaExtra: number;
}

/**
 * Lo que la sala cuenta de un asiento EN LA FASE para el `arcade:ronda`: vuelve a cero al empezar cada
 * fase. Lo que significa cada uno está en `ContadorDeAsiento`.
 */
export interface ContadoresDeAsiento {
  readonly limpias: number;
  /** Las limpias seguidas que lleva AHORA sin recibir daño (para `serieMaxima`). */
  readonly serie: number;
  readonly serieMaxima: number;
  readonly amenazas: number;
  readonly rematadas: number;
  readonly choques: number;
  readonly rescates: number;
  readonly caidas: number;
  readonly reapariciones: number;
  /** Las esquivas empezadas (rupturas aparte): las primeras `primeras.cuantas` usan su ventana. */
  readonly esquivas: number;
  /** 1 si salió por una zona en esta fase. */
  readonly salio: number;
  /** Lo que cobró al salir, por portable. */
  readonly cobrado: readonly CargaDePortable[];
}

/**
 * LA RED DE UN ASIENTO. Nunca está sin medir: la primera medida llega con la `EntradaConexion` y las
 * siguientes con cada `EntradaEco`.
 */
export interface RedDelAsiento {
  readonly rttMs: number;
  /** `min(rtt/2 + compBaseMs, compTopeMs)`. */
  readonly compMs: number;
  readonly desfaseMs: number;
}

/**
 * EL ESLABÓN DE LA CADENA en que va un asiento: su último golpe, el instante de su impacto EN EL RELOJ
 * DEL APARATO (el `tAutor` de su anuncio) y si dio.
 */
export interface EslabonDeLaCadena {
  readonly accion: IdDeclarado;
  readonly impactoEnSuReloj: number;
  readonly dio: boolean;
}

/** Una acción sostenida en curso: qué, contra qué, desde qué tic de la sala y con qué pulsación. */
export interface SostenidaEnCurso {
  readonly accion: IdDeclarado;
  readonly blanco: number;
  readonly desdeTic: number;
  readonly msDelAparato: number;
}

/**
 * UNA ESQUIVA RECIENTE: cuándo empezó (tic de la sala), su pulsación en ms del aparato —contra la que se
 * juzga la ventana— y si salió torpe. Las de ruptura no se apuntan aquí: no pasan por la ventana.
 */
export interface EsquivaHecha {
  readonly enTic: number;
  readonly msDelAparato: number;
  readonly torpe: boolean;
}

/** UN ASIENTO EN LA SALA. Ver en la cabecera qué pueden leer los demás. */
export interface CuerpoDeAsiento {
  /** Su número en el cable (1-15). */
  readonly numero: number;
  /** Su `AsientoId` en la mesa. */
  readonly asiento: string;
  readonly conectado: boolean;
  /** El tic de la sala en que cambió `conectado` por última vez (para `veredictoTrasTics`). */
  readonly conexionCambioEnTic: number;
  /** El tic de la sala del último `aqui` aceptado, o −1 si ninguno. */
  readonly ultimoAquiEnTic: number;
  /**
   * El último `n` (tic del aparato) aceptado EN ESTE CANAL, o −1 si ninguno: los `aqui` con `n` menor o
   * igual se tiran. Vuelve a −1 en cada `EntradaConexion` (ver la cabecera).
   */
  readonly ultimoTicDelAparato: number;
  /** `false` si no tiene cuerpo: salió, o espera reaparecer, o espera sin recurso. */
  readonly conCuerpo: boolean;
  /** El último sitio bueno, en Q16.16, y hacia dónde mira y con qué marcha. */
  readonly x: number;
  readonly z: number;
  readonly mira: number;
  readonly marcha: number;
  /** Los últimos `TOPE_DEL_RASTRO` sitios validados, del más viejo al más nuevo. */
  readonly rastro: readonly SitioEnElTic[];
  /** Lo acumulado del presupuesto corto, en Q16.16. */
  readonly presupuestoCorto: number;
  /**
   * Lo recorrido en cada `aqui` aceptado dentro de la ventana del presupuesto largo (`enTics`), del más
   * viejo al más nuevo, en Q16.16: la suma es lo que se compara con `presupuestoLargo.distancia`.
   */
  readonly tramosRecientes: readonly { readonly tic: number; readonly distancia: number }[];
  readonly estado: EstadoEnCurso | null;
  readonly vida: number;
  readonly medidor: number;
  /** Los puntos ganados en la fase. */
  readonly puntos: number;
  /** El multiplicador de puntos, Q16.16 (`UNO` = ×1): ver `PuntosDeclarados`. */
  readonly multiplicador: number;
  readonly cadena: EslabonDeLaCadena | null;
  /** Hasta qué tic de la sala no puede volver a lanzar cada acción con recarga. */
  readonly recargas: readonly { readonly accion: IdDeclarado; readonly hastaTic: number }[];
  /** Las esquivas recientes, de la más vieja a la más nueva: para la ventana y para `torpe`. */
  readonly esquivasRecientes: readonly EsquivaHecha[];
  /** El tic de la sala en que el rasgo `firmeCadaTics` se gastó por última vez (−1 = nunca). */
  readonly firmeGastadoEnTic: number;
  readonly sostenida: SostenidaEnCurso | null;
  /** La acción pulsada cuando no se podía, guardada hasta el tic `hastaTic` (ver `guardaTics`). */
  readonly guardada: { readonly accion: AccionRecibida; readonly desfaseMs: number; readonly hastaTic: number } | null;
  readonly lleva: readonly CargaDePortable[];
  readonly contadores: ContadoresDeAsiento;
  readonly red: RedDelAsiento;
  /** El tic de la sala del último aviso reenviado (−1 = ninguno). */
  readonly ultimoAvisoEnTic: number;
  /** Si ya se metió su `arcade:ausente` en esta fase. */
  readonly ausenteDado: boolean;
  /**
   * Cuántos `aqui` de tics del aparato seguidos lleva AHORA (ver `AQUIS_PARA_ESTAR`): vuelve a 1 con un
   * hueco en los `n`, y a 0 con cada canal nuevo. Llegar tarde no lo corta: ver por qué en la cabecera de
   * `AQUIS_PARA_ESTAR`.
   */
  readonly aquisSeguidos: number;
  /**
   * El tic de la sala de su último `aqui` VIVO (el que cierra una serie de `AQUIS_PARA_ESTAR`) o que JUEGA
   * (pulsa algo o se mueve), o de lo que cuenta como tal: conectar un canal y reaparecer. El ausente
   * momentáneo se cuenta desde aquí.
   */
  readonly vivoEnTic: number;
  /**
   * Hasta este tic de la sala (excluido) dura la VUELTA del ausente —la puesta de reaparición recortada a
   * `TICS_DE_LA_VUELTA`—, que se acaba al empezar cualquier acción; −1 si no está volviendo. Sirve para
   * no confundirla con la reaparición tras caer, que tiene la misma puesta y no se acaba así.
   */
  readonly vueltaHastaTic: number;
  /**
   * Los tics que lleva ausente en esta fase SIN contar el rato de ahora: cada vuelta suma el suyo. Con él
   * se mira si «se fue» (ver `seFue`): el ausente se cuenta entero, no sólo el último rato.
   */
  readonly ausenteAcumulado: number;
  /*
   * ── LO QUE LA SALA LLEVA PARA VALIDAR Y JUZGAR ──
   *
   * La primera sala los llevaba en tipos suyos que extendían éstos (`paso-en-curso.ts`); se suben al
   * contrato porque entran en la huella canónica —se comparan entre Node y Hermes y se guardan con un
   * fallo— y un estado con campos que el contrato no dice es un estado que nadie más sabe leer.
   */
  /**
   * El tic de la sala del último `corrige` pendiente, o −1: EL SILENCIO TRAS CORREGIR. Los `aqui` que ya
   * venían de camino desde el sitio malo no se corrigen otra vez durante un segundo (lo aprendió Boots on
   * Board: si no, el aparato salta atrás por cada paso que tenía en vuelo).
   */
  readonly corregidoEnTic: number;
  /**
   * CUÁLES venían de camino: los de tic del aparato hasta éste, aquél en que el `corrige` le llega (el tic
   * de la sala más media ida y vuelta, en su reloj, y uno de margen). Los de después ya salieron desde el
   * sitio corregido y se validan como cualquiera.
   */
  readonly enVueloHastaN: number;
  /** El `n` del `aqui` del que salió el sitio de ahora (`x`, `z`), o −1 si lo puso la sala (la escuadra es para UN tic del aparato). */
  readonly nDelSitio: number;
  /**
   * Hasta este tic de la sala (excluido) el presupuesto corto puede pasar de su tope: la DISTANCIA EXTRA
   * que dio una esquiva, un avance o un empujón, con la gracia de lo que tarda en llegar su último `aqui`.
   */
  readonly extraHastaTic: number;
  /** Hasta este tic de la sala (excluido) sólo puede empezar acciones que se encadenen (`recuperacionTics`). */
  readonly recuperaHastaTic: number;
  /** Hasta este tic de la sala (incluido) ya se juzgaron las balas contra él: cada asiento declara sus sitios con su retraso. */
  readonly balasHastaTic: number;
}

/**
 * En qué anda el cerebro de una entidad. `caida`: sin vida y rematable, esperando su remate o su
 * `siNo`. `absorber`: levantándose a costa de otra. `deshecha`: se deshizo (`seva` con `seDeshace`) y
 * espera `reapareceTras` para volver a aparecer CON EL MISMO NÚMERO —en un `nace` nuevo—; mientras, no
 * sale en la foto ni se la puede tocar, pero su número sigue ocupado.
 */
export type ModoDelCerebro =
  | 'aparecer'
  | 'acechar'
  | 'rondar'
  | 'atacar'
  | 'apuntar'
  | 'disparar'
  | 'caida'
  | 'absorber'
  | 'deshecha';

/** EL CEREBRO DE UNA ENTIDAD: lo que decidió y hasta cuándo. */
export interface CerebroEnCurso {
  readonly modo: ModoDelCerebro;
  readonly desdeTic: number;
  /** El próximo tic de la sala en que repiensa. */
  readonly repiensaEnTic: number;
  /** El nudo del grafo hacia el que va, o −1 si va en recta. */
  readonly nudo: number;
  /** Adónde apunta (Q16.16), mientras `apuntar`/`disparar`. */
  readonly apuntaX: number;
  readonly apuntaZ: number;
  /** Balas que le quedan de la ráfaga en curso. */
  readonly balasPorSalir: number;
}

/** UNA ENTIDAD DEL SERVIDOR. */
export interface EntidadDeLaSala {
  /** Su número en el cable (≥ 16). */
  readonly numero: number;
  readonly clase: IdDeclarado;
  /** El índice del grupo del encuentro del que salió (−1 si no salió de uno). */
  readonly grupo: number;
  readonly x: number;
  readonly z: number;
  readonly mira: number;
  readonly marcha: number;
  readonly vida: number;
  readonly estado: EstadoEnCurso | null;
  /** El asiento que tiene por blanco (0 = ninguno). */
  readonly blanco: number;
  /** El turno de ataque que tiene concedido. */
  readonly turno: 'ninguno' | 'cuerpoACuerpo' | 'disparo';
  readonly cerebro: CerebroEnCurso;
  readonly cadena: EslabonDeLaCadena | null;
  readonly recargas: readonly { readonly accion: IdDeclarado; readonly hastaTic: number }[];
  /** Hasta este tic de la sala (excluido) no abre otro ataque: la recuperación de su último golpe. */
  readonly recuperaHastaTic: number;
  /**
   * EL RELOJ DEL OLVIDO (L10, `OlvidoDeclarado`): el último tic de la sala en que tuvo a un asiento presente a
   * la distancia del olvido o menos —o en que nació, o en que no le corría el reloj (atacando, apuntando,
   * disparando, caída, absorbiendo o deshecha)—. Se olvida cuando `tic − cercaEnTic` llega a los tics del
   * olvido. Sin olvido en el encuentro, se queda en el tic en que nació.
   */
  readonly cercaEnTic: number;
}

/**
 * UN ANUNCIO PENDIENTE: un golpe lanzado cuyo impacto aún no se ha resuelto. Ver en la cabecera por qué
 * guarda `tBlanco` y `tAutor` y no los recalcula (salvo cuando el aparato cambia de reloj).
 */
export interface AnuncioPendiente {
  readonly id: number;
  /** Números de autor y blanco (autor 0 = una repetición sin autor; blanco 0 = sin blanco). */
  readonly de: number;
  readonly a: number;
  readonly accion: IdDeclarado;
  /** Desde dónde se lanzó (Q16.16): el sitio del autor al lanzarlo (la repetición sale del mismo). */
  readonly x: number;
  readonly z: number;
  readonly lanzadoEnTic: number;
  /** El tic de la sala del impacto, y su instante en ms de la sala. */
  readonly impactoEnTic: number;
  readonly impactoMs: number;
  /** El impacto en el reloj del aparato del BLANCO, si es un asiento; `null` si es una entidad. */
  readonly tBlanco: number | null;
  /** El impacto en el reloj del aparato del AUTOR, si es un asiento; `null` si es una entidad o nadie. */
  readonly tAutor: number | null;
  /** Se lanzó al ritmo (anuncio corto y efecto al ritmo). */
  readonly alRitmo: boolean;
  /**
   * Lo que la sala esperará una esquiva tras el impacto: el `comp` del blanco al anunciar, en ms. Se
   * resuelve en `impactoEnTic + ticsQueCubren(esperaMs) + TICS_DEL_AQUI` (ver el punto 5 de la cabecera).
   */
  readonly esperaMs: number;
  /** Si es la repetición sin autor de otro (ver `TurnosDeclarados.repetirTrasTics`): no se vuelve a repetir. */
  readonly esRepeticion: boolean;
  /**
   * EL AVANCE DE UN GOLPE DE ASIENTO (Q16.16): lo que su aparato puede acercarse desde `x, z` hasta el
   * impacto —el `avance` de la acción; en el golpe tras el vuelo contra una bala, el vuelo y ese avance—,
   * y lo más que anda en un tic haciéndolo. Con eso se juzga si llega (`llegaConSuAvance` en `combate.ts`):
   * la sala sólo le da por andado lo que puede estar todavía de camino en los tics que aún no ha visto.
   * 0 en los golpes de entidad (su avance lo hace la sala) y en las acciones sin avance.
   */
  readonly avance: number;
  readonly avancePorTic: number;
}

/** UNA BALA EN VUELO. Su sitio en cada tic sale de aquí con `geometria.desplazado`. */
export interface BalaDeLaSala {
  readonly numero: number;
  readonly proyectil: IdDeclarado;
  /** Quién disparó (número de entidad). */
  readonly de: number;
  /** Desde dónde (Q16.16) y hacia qué rumbo, y en qué tic de la sala salió. */
  readonly x: number;
  readonly z: number;
  readonly rumbo: number;
  readonly salioEnTic: number;
  /**
   * La salida en el reloj del aparato de cada asiento (índice = número − 1), para juzgar esquivas: el
   * impacto contra el asiento `i` cae en `salidaEnSuReloj[i] + tics de vuelo × MS_POR_TIC`.
   */
  readonly salidaEnSuReloj: readonly number[];
  /** El tic de la sala en que se para (contra la estructura o por su alcance), calculado al salir. */
  readonly finTic: number;
  /** Por qué se para en `finTic`: `choca` o `alcance` (`MOTIVO_DE_IRSE`). */
  readonly finPor: CodigoDeIrse;
  /** Los asientos contra los que ya se juzgó, un bit por número: la que atraviesa a quien la esquivó no lo juzga otra vez. */
  readonly juzgadaContra: number;
  /** Lo que recorre antes de pararse, en Q16.16 (ver `paradaDeLaBala` en `proyectiles.ts`). */
  readonly parada: number;
}

/** UN MONTÓN en el suelo. */
export interface MontonDeLaSala {
  readonly numero: number;
  readonly portable: IdDeclarado;
  readonly n: number;
  readonly x: number;
  readonly z: number;
  /** Se va al empezar este tic de la sala si nadie lo ha recogido entero. */
  readonly hastaTic: number;
}

/** Cómo va un grupo del encuentro. */
export interface GrupoEnCurso {
  /** Cuántas han salido ya. */
  readonly salidas: number;
  /** Cuántas tienen que salir en total (su `cuantos` para los presentes declarados). */
  readonly total: number;
  /** El próximo tic de la sala en que puede salir otra. */
  readonly proximaEnTic: number;
}

/** LA ZONA DE ACCIÓN ACTIVA de un encuentro con fin `salida`. */
export interface ZonaEnCurso {
  /** El id de la zona del mundo que está activa. */
  readonly zona: IdDeclarado;
  /** Se apaga al empezar este tic de la sala. */
  readonly hastaTic: number;
  /** Los asientos que la están usando ahora, en orden de llegada (hasta su `capacidad`). */
  readonly usando: readonly number[];
}

/** CÓMO VA EL ENCUENTRO de la fase. */
export interface EncuentroEnCurso {
  readonly ronda: number;
  /** El tic de la sala en que empezó: de aquí cuenta su `relojTics`. */
  readonly desdeTic: number;
  /** Los presentes, tal como los declara el encuentro: con esto se leen todas las tablas por presentes. */
  readonly presentes: number;
  readonly grupos: readonly GrupoEnCurso[];
  readonly zona: ZonaEnCurso | null;
  /**
   * Cómo acabó, en cuanto acaba; entonces ya salió su `arcade:ronda`, lo que quedaba se disolvió y la
   * sala no saca nada más: espera la vista de la fase siguiente (`EntradaVista` con otra clave).
   */
  readonly resultado: ResultadoDeRonda | null;
}

/** LA FASE, vista desde la sala. */
export interface FaseEnCurso {
  /** La `clave` de la declaración con que empezó. */
  readonly clave: string;
  /** El tic de la sala en que EMPEZÓ (ver `FaseDeLaLiza`): de aquí cuenta su reloj. */
  readonly desdeTic: number;
  /**
   * Si ya emitió el `arcade:reloj` del reloj VIGENTE de esta fase. La mesa puede cambiar el reloj sin
   * cambiar de fase (acortarlo cuando ya están todos: ver `RelojDeFase`); un reloj con otro `id` vuelve a
   * armarlo.
   */
  readonly relojDado: boolean;
}

/**
 * EL ESTADO DE LA SALA. Un valor: `avanzarLaSala` devuelve otro y no toca éste.
 */
export interface EstadoDeLaSala {
  /** El tic de la sala: 0 al nacer, uno más por cada `avanzarLaSala`. */
  readonly tic: number;
  /** La declaración vigente. */
  readonly declaracion: LizaDeclarada;
  /** La arena de la declaración (`arenaDeLaLiza`), derivada y llevada por referencia. No se serializa. */
  readonly arena: Arena;
  readonly fase: FaseEnCurso;
  /** El azar de la sala: sembrado con `fase.semilla` al empezar cada fase. */
  readonly azar: Azar;
  /** Los asientos, por número (índice = número − 1). */
  readonly asientos: readonly CuerpoDeAsiento[];
  readonly entidades: readonly EntidadDeLaSala[];
  readonly balas: readonly BalaDeLaSala[];
  readonly montones: readonly MontonDeLaSala[];
  readonly anuncios: readonly AnuncioPendiente[];
  readonly encuentro: EncuentroEnCurso | null;
  /** El recurso de equipo, ahora. */
  readonly recurso: number;
  /** El próximo número libre para una entidad, bala o montón (≥ 16; da la vuelta saltándose los vivos). */
  readonly siguienteNumero: number;
  /** El próximo id de anuncio (≥ 1). */
  readonly siguienteAnuncio: number;
}

/* ─── LAS FIRMAS QUE CUMPLE `sala.ts` ────────────────────────────────────── */

/**
 * LA SALA DE UNA MESA QUE NO TIENE SALA EN ESTE PROCESO, haya tenido otra antes o no.
 *
 *   · `declaracion`: la del productor, ya validada. Sus `asientos` son los de la mesa en su orden, y de
 *     ese orden salen los números del cable.
 *   · `semilla`: con qué se siembra el azar al nacer. La E/S pasa `declaracion.fase.semilla`; un
 *     comprobador puede pasar otra para barrer casos. En cada fase nueva se vuelve a sembrar con la
 *     `fase.semilla` de su declaración.
 *
 * Nace SIN nadie conectado (los canales llegan como `EntradaConexion`) y EMPIEZA la fase de la
 * declaración en su primer paso, como cualquier fase (ver `FaseDeLaLiza`).
 *
 * ═══ POR QUÉ NO HAY UNA «SALA REHECHA» APARTE ═══
 *
 * Tras un despliegue, la sala que muere se pierde entera y la que nace no sabe que hubo otra: un proceso
 * recién arrancado no puede distinguir «esta mesa nunca tuvo sala» de «la tuvo en el proceso de antes».
 * Y no le hace falta: empezar la fase en curso desde su principio con los puntos de control de la mesa
 * ES reanudarla —el encuentro vuelve a empezar y se pierde como mucho uno—. Una segunda firma con los
 * mismos parámetros sería una decisión que nadie puede tomar bien. El aparato tampoco necesita saberlo:
 * con cada `dentro` tira lo que sabía y se queda con la puesta al día (ver `Bienvenida`).
 */
export type SalaNueva = (declaracion: LizaDeclarada, semilla: number) => EstadoDeLaSala;

/**
 * UN TIC. `entradas` es lo que llegó desde el tic anterior, en el orden en que llegó. Pura: la misma
 * sala y las mismas entradas dan el mismo paso, en cualquier motor.
 */
export type AvanzarLaSala = (sala: EstadoDeLaSala, entradas: readonly EntradaDeLaSala[]) => PasoDeLaSala;
