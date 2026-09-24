/**
 * LA SALA DE LA LIZA, DEL LADO DEL SERVIDOR: los canales, el reloj de cada sala, lo que entra en cada
 * paso y lo que sale de él. Toda la E/S de la Liza, y ni una regla.
 *
 * ═══ LA SALA ES UNA FUNCIÓN; ESTO ES LO QUE LA ALIMENTA ═══
 *
 * Las reglas —quién anda, a quién le da un golpe, qué hace un enemigo— son de `avanzarLaSala`
 * (`shared/mecanicas/liza/sala.ts`), que es PURA: recibe el estado y lo que llegó por el canal desde el
 * paso anterior, y devuelve el estado siguiente con lo que hay que contar. Aquí se hace todo lo que ella
 * no puede hacer: leer el cable con el lector estricto, medir la red de cada aparato, llevar el reloj,
 * darle los pasos a su hora, repartir lo que devuelve a quien le toca, meter sus veredictos en la mesa y
 * decirle cuándo cambió la mesa. El contrato de las dos mitades está en `tipos-de-la-sala.ts`; el del
 * cable, en `protocolo.ts`. Aquí no se redefine nada de ninguno de los dos.
 *
 * Este fichero no sabe de WebSocket ni de HTTP —recibe texto por un `EnchufeDeLaLiza` y contesta por el
 * mismo— ni de qué juegos hay: el reloj, la mesa, el registro de lizas y el motor de la sala se le
 * INYECTAN. Así las reglas de tiempo se prueban en proceso con un reloj de mentira y una sala de mentira
 * (`verify:sala-de-la-liza`), y lo de verdad lo pone `index.ts`.
 *
 * ═══ LOS DOS RELOJES, Y EL ANCLA ═══
 *
 * El reloj de la SALA son `tic × MS_POR_TIC` milisegundos, más lo que lleve del tic en curso. Aquí se
 * lleva así: cada sala tiene un ANCLA, el instante de pared (monótono) en que su reloj marcaba cero, y su
 * reloj es `ahora − ancla`. El tic `k` TOCA en `ancla + k × MS_POR_TIC`, y el temporizador —uno para todo
 * el proceso— da en cada vuelta los pasos que tocan. Así el reloj de la sala no se atrasa aunque el
 * temporizador se retrase: si una vuelta llega tarde, la siguiente da dos pasos, y el tic sigue pegado a
 * la pared. Pegado importa: el desfase de cada aparato se mide contra la pared (ver abajo), y una sala
 * que se atrasara en silencio iría desplazando todos los instantes que manda.
 *
 * Si el proceso se para mucho —un despliegue que deriva cincuenta mundos, una recogida de basura
 * larga— no se recuperan todos los pasos de golpe: como mucho `PASOS_SEGUIDOS_COMO_MUCHO` por vuelta, y
 * el resto se da por perdido moviendo el ancla (`reanclar`). Moverla adelanta el reloj de la sala
 * respecto al de todos los aparatos, así que en el mismo paso se le dice a la sala el desfase nuevo de
 * cada uno (`EntradaEco`): los instantes que mande desde ahí vuelven a estar en el reloj de cada aparato.
 *
 * ═══ EL DESFASE, MEDIDO CONTRA LA PARED ═══
 *
 * `desfase = reloj del aparato − reloj de la sala`. Cada vez que llega algo con el reloj del aparato
 * dentro —el `c` del `hola`, el de cada `eco`— se apunta una muestra: `c + ida y vuelta / 2 − ahora`, que
 * es el desfase del aparato contra la PARED. El de la sala es esa mediana más el ancla. Guardarlo contra
 * la pared y no contra la sala tiene dos ventajas: sirve antes de que la sala exista (el primer `hola` de
 * una mesa la crea) y sobrevive a que se mueva el ancla sin tocar una sola muestra.
 *
 * La ida y vuelta es la mediana de las últimas `ECOS_DE_LA_MEDIANA` medidas con el ping de `ws`, que el
 * navegador contesta solo. El primero sale AL ABRIR el canal (informe de la columna, hallazgo 3): la
 * sala nunca ve un asiento conectado sin desfase, así que la `EntradaConexion` no se mete hasta tener el
 * `hola` y el primer pong. Si el pong no llega en `PLAZO_DEL_HOLA_MS`, `sinHola`: un canal que no
 * contesta un ping en tres segundos no sirve para esquivar nada.
 *
 * ═══ UN `eco` SIN SALA NO SE CONTESTA ═══
 *
 * La respuesta a un `eco` es una MEDIDA para el aparato: con su `c`, el tic y los ms de la sala, saca su
 * desfase (`c + ida y vuelta / 2 − ms`). El aparato manda el primero justo detrás del `hola`, y casi
 * siempre llega mientras se mira su llave: el canal aún no sabe en qué sala va a estar. Contestarle
 * entonces con ceros era darle una medida falsa que el aparato tomaba por buena —el tic de una sala de
 * veinte segundos, cuatrocientos tics por detrás, hasta la foto siguiente (revisión del frente, hallazgo
 * 4)—. Así que un `eco` que llega antes de que el canal tenga sala no se contesta: sigue siendo una
 * muestra del desfase para la E/S, y el aparato, hasta su primera respuesta dos segundos después, tira
 * con lo que le dice el `dentro`, que es para lo que está. Callar es lo que ya hace con un canal
 * atascado; lo que no se hace nunca es contestar algo que no es verdad.
 *
 * ═══ EL CUBO: LOS `aqui` POR SU RELOJ, LO DEMÁS POR FICHAS ═══
 *
 * El contrato pone un tope de `MENSAJES_POR_SEGUNDO` de media y `MENSAJES_DE_GOLPE` de golpe. Contado
 * al LLEGAR, ese tope echaba a un aparato honrado: tras un corte de dos segundos —un túnel, un cambio de
 * antena—, el TCP entrega de golpe los cuarenta `aqui` que se quedaron en la cola, y el cuadragésimo
 * primero era un `atropello` (revisión del frente, hallazgo 2). El aparato no mandó de más: mandó uno por
 * tic, a su hora, y la red se los juntó.
 *
 * Por eso los `aqui` se cuentan en el reloj en que se escribieron, que viaja dentro: su `n`. Un `aqui`
 * cuyo `n` supera al último de ese canal y no se adelanta a lo que el canal lleva abierto (más
 * `ADELANTO_DEL_APARATO_MS`: el reloj del aparato empieza DESPUÉS que el del servidor, al abrirse el
 * canal de su lado) es uno de los veinte por segundo que el canal puede escribir, llegue cuando llegue,
 * y no gasta ficha. Un canal no puede meter así más `aqui` que tics lleva abierto, por mucho que los
 * junte o los adelante. Todo lo demás —el `eco`, el `aviso`, y un `aqui` repetido o del futuro— gasta
 * del cubo, que se rellena a lo que queda de la media del contrato (`OTROS_MENSAJES_POR_SEGUNDO`, cinco
 * por segundo) con el mismo tope de golpe: la media total no pasa de la que dice el contrato, y un corte
 * de quince segundos (siete `eco` y quince `aviso` como mucho) cabe entero en él.
 *
 * ═══ LO QUE SALE DE UN PASO, EN SU ORDEN ═══
 *
 * El de `PasoDeLaSala`: las bienvenidas (`dentro`), las correcciones (`corrige`), el `tic` de cada canal
 * con los sucesos que le tocan —partido en varios con el mismo `k` si no cabe en uno— y la foto,
 * escrita UNA vez y mandada a todos. Los veredictos van a la mesa en orden, uno detrás de otro (ver «los
 * veredictos, en cadena por mesa»), y quien sondea se entera si la revisión subió.
 *
 * Cada canal recibe los sucesos `para` 0 y los suyos, en el orden en que salieron. Los canales que no
 * tienen ninguno propio en ese paso reciben EXACTAMENTE la misma lista, así que se escribe una vez.
 *
 * ═══ LO QUE SE PUEDE PERDER Y LO QUE NO, CON UN CANAL ATASCADO ═══
 *
 * Lo que otro mensaje sustituye —la foto, que vuelve en cien milisegundos; el `corrige`, que la sala
 * repite si el aparato insiste desde el sitio malo; la respuesta a un `eco`, que el aparato mide por
 * mediana y que ya se calla cuando no hay sala (ver arriba); el `fuera` de un canal que se cierra
 * igual— se SALTA con más de `ATASCO_PARA_SALTAR` bytes
 * esperando. Lo que no se puede perder —el `dentro`, los sucesos de un `tic`— se manda mientras quepa y,
 * con más de `ATASCO_PARA_CERRAR` esperando, cierra el canal con `atascado`: reintentar sí vale, y la
 * puesta al día de la bienvenida le vuelve a contar todo.
 *
 * ═══ LA MESA, COMO MUCHO UNA LECTURA POR SEGUNDO ═══
 *
 * Cada sala pregunta a su mesa la revisión (la lectura barata) una vez por segundo como mucho y, si ha
 * cambiado, lee la vista de espectador y le pasa al registro de lizas la declaración que sale de ella.
 * Se le mete a la sala SÓLO si no tiene problemas y su aforo es el mismo con que nació: el coste se
 * admitió al abrir y no puede crecer por el camino (`EntradaVista`). Si la mesa se acabó o ya no existe,
 * fuera todos con `mesaCerrada`.
 *
 * Sacar la declaración y validarla es lo más caro que hace este fichero por una mesa (el productor y
 * `problemasDeLaDeclaracion` de una sala de seis, unos catorce milisegundos en PC): se cronometra y se
 * carga al coste medido de su sala, y el diagnóstico lo dice aparte (`validaciones`). Sin eso, el coste
 * medido no veía lo que más cuesta de cada cambio de mesa (revisión del frente, hallazgo 6).
 *
 * ═══ EL MUNDO SE REVISA UNA VEZ, Y ESO SE CUENTA ═══
 *
 * De validar, lo caro es el MUNDO: con uno grande —miles de casillas, cajas y nudos— son veinte o treinta
 * milisegundos síncronos, más que el tic del temporizador de TODAS las salas. Por eso la Liza lo revisa una
 * vez por objeto mundo y lo guarda (`validacionesDelMundo` en `declaracion.ts`), y el productor de un juego
 * guarda los suyos: de fase en fase y de voto en voto llega el MISMO objeto, y la validación sólo mira lo
 * demás. Son dos memorias de otros, y si una se rompe no falla nada: sólo se paga cada vez. Así que aquí se
 * CUENTAN —no se cronometran—, las dos por separado:
 *
 *   · `validacionesDelMundo`: cuántas revisiones de un mundo hicieron de verdad las validaciones de este
 *     canal (lo que el contador de la Liza sube DENTRO de cada `problemasDeLaDeclaracion` de aquí, leído del
 *     mismo módulo que valida: otro camino puede cargar otra copia con su propio contador a cero).
 *   · `mundosNuevos`: cuántas declaraciones validadas traían un mundo que no es el mismo objeto que el de la
 *     última aceptada por su sala (la primera de cada sala cuenta).
 *
 * Sanas, `validacionesDelMundo ≤ mundosNuevos ≪ validaciones.veces`: un mundo por sala y partida, revisado
 * como mucho una vez por proceso. Si la Liza deja de guardar, `validacionesDelMundo` sube hasta `veces`; si
 * es el productor el que deja de guardar, lo que sube hasta `veces` es `mundosNuevos`.
 *
 * ═══ SI CAMBIAN LOS ASIENTOS, LA SALA SE REHACE ═══
 *
 * La sala pura nace con los asientos de su declaración y no los cambia nunca: una `EntradaVista` con
 * otros asientos la ignora, porque los números del cable saldrían de otro sitio (`tomarLaVista` en
 * `sala.ts`). Así que si alguien se sienta —o se levanta— con la sala abierta, meterle la vista no
 * sirve: la sala se quedaba con la de antes, sorda a todas las fases que vinieran detrás, y quien acababa
 * de sentarse esperaba una bienvenida que no llegaba nunca (revisión del frente, hallazgo 3). Lo que hace
 * la E/S es lo mismo que tras un despliegue: CIERRA la sala —`rehecha`, 1012, «el servicio se reinicia»,
 * que el aparato reintenta en medio segundo— y la siguiente entrada la hace nacer de la vista nueva, con
 * sus asientos, su aforo y su admisión. Sólo pasa en la reunión (en el juego no se sienta nadie), donde
 * no hay nada que perder. Y como el coste se vuelve a admitir al nacer, una declaración con otros
 * asientos puede traer otro aforo: lo que no puede es cambiarlo con los mismos asientos.
 *
 * Y por si la sala no diera la bienvenida por otra razón, quien la espera más de `PASOS_SIN_BIENVENIDA`
 * pasos se cierra con 1011 para que vuelva a entrar: un canal no se queda colgado para siempre.
 *
 * ═══ LOS VEREDICTOS, EN CADENA POR MESA ═══
 *
 * Van a la mesa uno detrás de otro, en el orden en que salieron, y la cadena es de la MESA, no de la
 * sala: si la sala se cierra (se rehace, revienta, vence su gracia) y nace otra, la nueva espera a que
 * entren los veredictos de la vieja antes de leer la vista. Si no, podría nacer de una vista de antes de
 * su último `arcade:ronda` y rehacer una fase que ya estaba cerrada.
 *
 * ═══ EL AFORO: LA SALA DICE LO QUE CUESTA, Y SI NO CABE, NO SE ABRE ═══
 *
 * Al nacer una sala —con el primer `hola` de una mesa que no la tiene— se pasa su declaración por
 * `costeDeLaLiza` y `cabeOtraSala` (`shared/arcade/juegos/lizas.ts`) con lo que ya cuestan las demás. Si
 * no cabe, `llena`: «la ciudad está llena, prueba en un minuto». Una sala que ya vive no se echa nunca
 * por esto.
 *
 * ═══ UN SOLO TEMPORIZADOR, Y PARADO SIN SALAS ═══
 *
 * Como en Boots on Board: uno para todo el proceso, a `MS_POR_TIC`, que recorre las salas. Sin salas está
 * parado: un servidor sin nadie lidiando no hace ni un tic.
 *
 * ═══ CUÁNTO VIVE UNA SALA ═══
 *
 * Mientras alguien tenga canal y, cuando se va el último, una GRACIA larga (`graciaDe`): lo que tarda la
 * sala en meter los `arcade:ausente` que declara, y como poco medio minuto. Una sala que se borrara a los
 * cinco segundos, como la de Boots on Board, perdería el encuentro entero por un túnel de metro; y una
 * que no se borrara nunca sería CPU gastada en nadie.
 *
 * Tras un despliegue, la sala nueva nace del mismo sitio que nació la vieja —la vista de la mesa— con
 * `salaNueva(declaracion, semilla)`: empezar la fase en curso desde sus puntos de control ES reanudarla
 * (ver `SalaNueva` en `tipos-de-la-sala.ts`). Aquí no hay un camino aparte para «rehacer».
 *
 * ═══ TODO LO QUE LLEGA DE FUERA VA EN SU `try` ═══
 *
 * Los mensajes, los pongs y los cierres los disparan eventos del enchufe; un paso de la sala, el
 * temporizador. Lo que se escapara de cualquiera llegaría a `uncaughtException`, que en el `index.ts` del
 * servidor TERMINA EL PROCESO. Así que un canal que revienta se cierra solo él (`fallo`), y una sala cuyo
 * paso revienta se cierra sola ella: con el mismo estado y las mismas entradas volvería a reventar veinte
 * veces por segundo, y quien vuelva a entrar la hará nacer otra vez desde la mesa.
 */
import { MS_POR_TIC, numeroDelAsiento, problemasDeLaDeclaracion, validacionesDelMundo } from '../../../shared/mecanicas/liza/declaracion';
import type { AforoDeLaSala, LizaDeclarada, VeredictoDeLaLiza } from '../../../shared/mecanicas/liza/declaracion';
import {
  CIERRE_DE_LA_LIZA,
  ECO_CADA_MS,
  ECOS_DE_LA_MEDIANA,
  AVISO_CADA_MS,
  leerMensajeDelAparato,
  MENSAJES_DE_GOLPE,
  MENSAJES_POR_SEGUNDO,
  PLAZO_DEL_HOLA_MS,
  SILENCIO_HASTA_CERRAR_MS,
  textoDeLaSala,
  TICS_DE_LA_LIZA,
  TOPE_DE_BAJADA_BYTES,
  TOPE_DE_SUCESOS,
  VERSION_DE_LA_LIZA,
} from '../../../shared/mecanicas/liza/protocolo';
import type { Aqui, AvisoDelAparato, Hola, MensajeDelAparato, SucesoDelTic } from '../../../shared/mecanicas/liza/protocolo';
import type {
  AvanzarLaSala,
  EntradaDeLaSala,
  EstadoDeLaSala,
  PasoDeLaSala,
  SalaNueva,
} from '../../../shared/mecanicas/liza/tipos-de-la-sala';
import { cabeOtraSala, costeDeLaLiza } from '../../../shared/arcade/juegos/lizas';
import type { MotivoDeCuota } from '../botas/canal';

/* ─── LOS NÚMEROS ────────────────────────────────────────────────────────── */

/** Cada cuánto, como mucho, se pregunta a la mesa si ha cambiado. */
export const REVISAR_LA_MESA_CADA_MS = 1000;

/**
 * Cuánto antes de su hora se da un paso: medio tic. Con el temporizador en fase con las salas (ver
 * `encenderElReloj`), cada vuelta cae en medio de la ventana y un retraso de hasta 25 ms —el de un
 * temporizador de Windows, que va a golpes de 15,6— no hace ni saltar ni duplicar un paso.
 */
export const TOLERANCIA_DEL_PASO_MS = MS_POR_TIC / 2;

/** Cuántos pasos seguidos da una sala en una vuelta del temporizador para alcanzar a su reloj. */
export const PASOS_SEGUIDOS_COMO_MUCHO = 4;

/**
 * Con más de esto esperando a salir por un canal, lo que otro mensaje sustituye se salta: dieciséis
 * kilos, unos tres segundos de la bajada de una sala llena.
 */
export const ATASCO_PARA_SALTAR = 16 * 1024;

/**
 * Con más de esto esperando, lo que no se puede perder cierra el canal con `atascado`. Es el tope de UN
 * mensaje de la sala (`TOPE_DE_BAJADA_BYTES`): la bienvenida de quien entra en una sala llena puede ser
 * un `tic` de decenas de kilos, y medio segundo después de mandarla un canal sano puede tenerla aún en la
 * cola. Más de un mensaje entero sin salir ya no es un pico: es un canal que no da abasto.
 */
export const ATASCO_PARA_CERRAR = TOPE_DE_BAJADA_BYTES;

/**
 * Cuánto espera quien tiene la llave de un asiento que la declaración de la sala aún no trae: se acaba
 * de sentar y la sala todavía no ha vuelto a leer la mesa. Tres lecturas.
 */
export const ESPERA_DEL_ASIENTO_MS = 3 * REVISAR_LA_MESA_CADA_MS;

/** La gracia de una sala sin nadie: como poco medio minuto, como mucho cinco; ver `graciaDe`. */
export const GRACIA_MINIMA_MS = 30_000;
export const GRACIA_MAXIMA_MS = 300_000;
/** Lo que se deja, sobre lo que tarda la sala en dar a alguien por ausente, para que le dé tiempo a meterlo. */
export const MARGEN_DE_LA_GRACIA_MS = 5_000;

/**
 * Cuánto puede ir el reloj de un aparato por delante de lo que su canal lleva abierto en el servidor sin
 * que sus `aqui` dejen de contarse por su reloj (ver «el cubo» en la cabecera). El del aparato empieza
 * DESPUÉS —al abrirse el canal de su lado, media ida y vuelta más tarde—, así que un aparato honrado va
 * siempre por detrás; el segundo cubre la resolución de los temporizadores y nada más.
 */
export const ADELANTO_DEL_APARATO_MS = 1000;

/**
 * A cuánto se rellena el cubo de lo que NO es un `aqui` por su reloj: lo que queda de la media del
 * contrato quitando los veinte `aqui` por segundo. Un aparato honrado gasta uno y medio (un `eco` cada
 * dos segundos y un `aviso` por segundo como mucho).
 */
export const OTROS_MENSAJES_POR_SEGUNDO = MENSAJES_POR_SEGUNDO - TICS_DE_LA_LIZA;

/**
 * Cuántos pasos de su sala espera un canal su bienvenida antes de cerrarse con 1011 para volver a entrar.
 * La sala la da en el paso siguiente a su conexión; tres segundos de pasos sin ella es una sala que no lo
 * ha reconocido. Se cuenta en pasos y no en tiempo: si el proceso se para, la conexión sigue en la cola
 * y no es culpa de nadie.
 */
export const PASOS_SIN_BIENVENIDA = 3 * TICS_DE_LA_LIZA;

/** Cuántos pings sin contestar se recuerdan por canal: uno cada dos segundos, así que diez son veinte. */
const PINGS_RECORDADOS = 10;

/**
 * Los códigos de cierre que no son de la Liza: los estándar de WebSocket. 1012 («Service Restart») es el
 * de la sala que se rehace porque la mesa cambió de asientos: el aparato vuelve a entrar como tras un 1001.
 */
const CIERRE_APAGADO = 1001;
const CIERRE_FALLO = 1011;
const CIERRE_REHECHA = 1012;

/**
 * CUÁNTO VIVE UNA SALA SIN NADIE: lo que tarda en meter el `arcade:ausente` de quien se fue
 * (`presencia.veredictoTrasTics`) con un margen, entre `GRACIA_MINIMA_MS` y `GRACIA_MAXIMA_MS`. Por
 * encima del tope, una sala vacía no llega a meterlo: la mesa se da cuenta sola por su plazo.
 */
export function graciaDe(liza: LizaDeclarada): number {
  const declarada = liza.presencia.veredictoTrasTics * MS_POR_TIC + MARGEN_DE_LA_GRACIA_MS;
  return Math.min(GRACIA_MAXIMA_MS, Math.max(GRACIA_MINIMA_MS, declarada));
}

/** La mediana de una lista no vacía (la media de las dos del medio si es par). */
export function mediana(valores: readonly number[]): number {
  const orden = [...valores].sort((a, b) => a - b);
  const m = orden.length >> 1;
  return orden.length % 2 === 1 ? (orden[m] as number) : ((orden[m - 1] as number) + (orden[m] as number)) / 2;
}

function mismoAforo(a: AforoDeLaSala, b: AforoDeLaSala): boolean {
  return a.entidades === b.entidades && a.balas === b.balas && a.montones === b.montones;
}

/**
 * ¿Traen las dos declaraciones los mismos asientos, en el mismo orden? Es lo que mira la sala pura antes
 * de tomar una vista (`tomarLaVista`): del orden salen los números del cable.
 */
export function mismosAsientos(a: LizaDeclarada, b: LizaDeclarada): boolean {
  if (a.asientos.length !== b.asientos.length) return false;
  for (let i = 0; i < a.asientos.length; i++) if (a.asientos[i]?.asiento !== b.asientos[i]?.asiento) return false;
  return true;
}

/* ─── LO QUE SE INYECTA ──────────────────────────────────────────────────── */

/** Un canal abierto, visto desde aquí. Lo pone `enchufe.ts`. */
export interface EnchufeDeLaLiza {
  enviar(texto: string): void;
  cerrar(codigo: number, razon: string): void;
  /** Cuántos bytes esperan a salir. */
  pendientes(): number;
  /** Un ping de protocolo con este número dentro; su pong vuelve por `ConexionDeLaLiza.pong`. */
  ping(numero: number): void;
  /** Opcional: el canal ha dicho `hola` (la capa de cuotas suelta su hueco de «sin saludar»). */
  saludo?(): void;
}

export interface Temporizador {
  parar(): void;
}

/**
 * El reloj. `ahora` es MONÓTONO y en milisegundos con decimales —`performance.now()` en el servidor—: con
 * él se mide la ida y vuelta, y un reloj de pared que salta con la hora del sistema la mediría negativa.
 */
export interface RelojDeLaLiza {
  ahora(): number;
  cada(ms: number, hacer: () => void): Temporizador;
  dentroDe(ms: number, hacer: () => void): Temporizador;
}

/** Lo que el canal necesita de la vista de espectador de una mesa. */
export interface VistaDeLaMesa {
  readonly arcade: string;
  readonly rev: number;
  readonly terminada: boolean;
  /** Lo que el juego deja ver a quien mira sin asiento: de aquí sale la liza. */
  readonly vista: unknown;
}

/** Qué fue de un veredicto en la mesa: las salidas de `meterDeLaPlataforma`. */
export type SalidaDelVeredicto = 'entro' | 'sinEfecto' | 'rechazado' | 'terminada' | 'apartado' | 'sinMesa';

export interface LoQueFueDelVeredicto {
  readonly salida: SalidaDelVeredicto;
  /** El motivo del juego, si lo rechazó. */
  readonly motivo?: string;
}

/**
 * LO QUE EL CANAL LE PREGUNTA A LA MESA. Las tres primeras LEEN (`null` = «esa mesa no existe»), como un
 * espectador; la cuarta escribe un veredicto por la vía interna y avisa a quien sondea si la revisión
 * subió. Lo de verdad está en `index.ts`.
 */
export interface LaMesaDeLaLiza {
  /** El `AsientoId` de quien tiene esta llave en esta mesa, o `null`. */
  quienEsLaLlave(codigo: string, llave: string): Promise<string | null>;
  revision(codigo: string): Promise<{ readonly rev: number; readonly terminada: boolean } | null>;
  vista(codigo: string): Promise<VistaDeLaMesa | null>;
  meter(codigo: string, veredicto: VeredictoDeLaLiza): Promise<LoQueFueDelVeredicto>;
}

/** De dónde sale la liza de una mesa: `sePuedeLidiar` y `lizaDeLaMesa` de `shared/arcade/juegos/lizas.ts`. */
export interface LasLizas {
  sePuedeLidiar(arcade: string): boolean;
  lizaDeLaMesa(arcade: string, vista: unknown, codigo: string): LizaDeclarada | null;
}

/** La sala pura: `salaNueva` y `avanzarLaSala` de `shared/mecanicas/liza/sala.ts`. */
export interface MotorDeLaSala {
  readonly salaNueva: SalaNueva;
  readonly avanzarLaSala: AvanzarLaSala;
}

export interface OpcionesDelCanal {
  readonly reloj: RelojDeLaLiza;
  readonly mesa: LaMesaDeLaLiza;
  readonly lizas: LasLizas;
  readonly motor: MotorDeLaSala;
  /** Dónde se escribe lo que pasa. NUNCA recibe una llave. */
  readonly registrar?: (linea: string) => void;
  /**
   * Con qué se cronometra lo que CUESTA cada paso, en milisegundos. Otro reloj que el de la sala a
   * propósito: se mide trabajo del hilo, y en las pruebas el reloj de la sala es de mentira.
   */
  readonly cronometro?: () => number;
}

/* ─── LO QUE SE CUENTA ───────────────────────────────────────────────────── */

/**
 * Por qué se cerró un canal: los códigos de la Liza, más los estándar (`apagado` 1001, `fallo` 1011,
 * `rehecha` 1012) y el del otro lado que se fue.
 */
export type PorQueSeCierra = keyof typeof CIERRE_DE_LA_LIZA | 'apagado' | 'fallo' | 'rehecha' | 'seFue';

/** Por qué lo cierra el servidor: todos menos `seFue`, que es el otro lado. */
type PorQueSeEcha = Exclude<PorQueSeCierra, 'seFue'>;

/** El código de WebSocket con que se cierra por cada motivo. */
function codigoDelCierre(clave: PorQueSeEcha): number {
  switch (clave) {
    case 'apagado':
      return CIERRE_APAGADO;
    case 'fallo':
      return CIERRE_FALLO;
    case 'rehecha':
      return CIERRE_REHECHA;
    default:
      return CIERRE_DE_LA_LIZA[clave];
  }
}

/**
 * LO QUE DICE EL DIAGNÓSTICO. Sólo cuentas: ni un código de mesa, ni un asiento, ni una llave: se sirve
 * sin credencial (`/api/arcade/liza/diagnostico`).
 */
export interface DiagnosticoDeLaLiza {
  salas: number;
  /** Canales vivos, en cualquier estado. */
  canales: number;
  /** Canales que ya recibieron su `dentro`. */
  enSala: number;
  temporizador: boolean;
  /** Vueltas del temporizador. */
  tics: number;
  /** Pasos de sala (`avanzarLaSala`), y cuántos de ellos fueron para alcanzar al reloj. */
  pasos: number;
  pasosDeRecuperacion: number;
  /** Veces que una sala se quedó tan atrás que se movió su ancla, y los pasos que se dieron por perdidos. */
  reanclajes: number;
  pasosPerdidos: number;
  /** Salas cuyo paso reventó (y se cerraron). */
  pasosRotos: number;
  /** Salas cerradas para rehacerse porque la mesa cambió de asientos (ver la cabecera de `canal.ts`). */
  salasRehechas: number;
  /** Lo que DECLARAN las salas vivas (`costeDeLaLiza`), en µs de CPU por segundo de PC. */
  costeDeclarado: number;
  /**
   * Lo que CUESTAN de verdad las salas vivas, en µs de CPU por segundo, medido en el último segundo de
   * cada una: sus pasos (la sala, escribir y mandar) y lo que se tarda en atender sus mensajes.
   */
  costeMedido: number;
  /** El de cada sala, de la más cara a la más barata (sin decir cuál es cuál). */
  costeMedidoPorSala: number[];
  /** Salas que no se abrieron porque no cabían (`llena`). */
  salasQueNoCupieron: number;
  entradas: { aqui: number; eco: number; aviso: number; conexion: number; desconexion: number; vista: number };
  /** Mensajes bien escritos que llegaron donde no tocaban: un `aqui` antes de `dentro`, un aviso de más. */
  ignorados: number;
  /** `aqui` que no se contaron por su reloj (un `n` que no sube o que se adelanta) y gastaron ficha. */
  aquiFueraDeSuReloj: number;
  bienvenidas: number;
  /** Bienvenidas de la sala para un asiento que ya no tenía canal cuando salió el paso. */
  bienvenidasSinCanal: number;
  /** Canales cerrados porque su sala no les dio la bienvenida en `PASOS_SIN_BIENVENIDA` pasos. */
  sinBienvenida: number;
  correcciones: number;
  /** `tic` mandados (uno por canal y trozo) y los bytes. */
  ticsMandados: number;
  bytesDeTics: number;
  fotosCompuestas: number;
  fotos: number;
  fotosSaltadas: number;
  bytesDeFotos: number;
  /** Lo demás que se le saltó a un canal atascado: `corrige`, respuestas a `eco`, `fuera`. */
  saltados: number;
  ecosContestados: number;
  /** `eco` que llegaron antes de que su canal tuviera sala: no se contestan (ver la cabecera). */
  ecosSinSala: number;
  pongs: number;
  veredictos: Record<SalidaDelVeredicto | 'fallos', number>;
  lecturas: { revisiones: number; vistas: number; declaracionesNuevas: number; ilegibles: number; conProblemas: number; conOtroAforo: number; fallos: number };
  /**
   * Sacar la declaración de una vista y validarla (`lizaDeLaMesa` y `problemasDeLaDeclaracion`), al abrir
   * una sala y en cada cambio de mesa: cuántas veces, cuánto en total y la más lenta, en ms. Va también
   * dentro del coste medido de su sala.
   */
  validaciones: { veces: number; ms: number; msMasLenta: number };
  /**
   * De esas validaciones, cuántas revisaron un MUNDO de verdad y no desde la memoria de la Liza: se
   * cuentan, no se cronometran. Ver «el mundo se revisa una vez, y eso se cuenta» en la cabecera.
   */
  validacionesDelMundo: number;
  /**
   * Cuántas declaraciones validadas traían un mundo que no es el MISMO OBJETO que el de la última aceptada
   * por su sala (la primera de cada sala cuenta): lo que haría falta revisar si la Liza no guardara nada.
   */
  mundosNuevos: number;
  /** La mediana, entre los canales dentro, de su ida y vuelta mediana; `null` sin canales dentro. */
  idaYVueltaMs: number | null;
  origenesNegados: number;
  cuotasNegadas: Record<MotivoDeCuota, number>;
  cierres: Record<PorQueSeCierra, number>;
}

/** Todas las cuentas a cero: lo que dice un canal recién hecho, o uno que no se ha montado. */
export function cuentasVacias(): DiagnosticoDeLaLiza {
  return {
    salas: 0,
    canales: 0,
    enSala: 0,
    temporizador: false,
    tics: 0,
    pasos: 0,
    pasosDeRecuperacion: 0,
    reanclajes: 0,
    pasosPerdidos: 0,
    pasosRotos: 0,
    salasRehechas: 0,
    costeDeclarado: 0,
    costeMedido: 0,
    costeMedidoPorSala: [],
    salasQueNoCupieron: 0,
    entradas: { aqui: 0, eco: 0, aviso: 0, conexion: 0, desconexion: 0, vista: 0 },
    ignorados: 0,
    aquiFueraDeSuReloj: 0,
    bienvenidas: 0,
    bienvenidasSinCanal: 0,
    sinBienvenida: 0,
    correcciones: 0,
    ticsMandados: 0,
    bytesDeTics: 0,
    fotosCompuestas: 0,
    fotos: 0,
    fotosSaltadas: 0,
    bytesDeFotos: 0,
    saltados: 0,
    ecosContestados: 0,
    ecosSinSala: 0,
    pongs: 0,
    veredictos: { entro: 0, sinEfecto: 0, rechazado: 0, terminada: 0, apartado: 0, sinMesa: 0, fallos: 0 },
    lecturas: { revisiones: 0, vistas: 0, declaracionesNuevas: 0, ilegibles: 0, conProblemas: 0, conOtroAforo: 0, fallos: 0 },
    validaciones: { veces: 0, ms: 0, msMasLenta: 0 },
    validacionesDelMundo: 0,
    mundosNuevos: 0,
    idaYVueltaMs: null,
    origenesNegados: 0,
    cuotasNegadas: { global: 0, sinSaludar: 0, concurrencia: 0, ritmo: 0 },
    cierres: {
      sinHola: 0,
      llaveMala: 0,
      mesaQueNo: 0,
      reemplazado: 0,
      silencio: 0,
      atropello: 0,
      mesaCerrada: 0,
      versionVieja: 0,
      atascado: 0,
      llena: 0,
      apagado: 0,
      fallo: 0,
      rehecha: 0,
      seFue: 0,
    },
  };
}

/* ─── LO QUE VIVE EN MEMORIA ─────────────────────────────────────────────── */

/**
 * En qué anda un canal:
 *   · `saludo` — abierto; espera su `hola` y el pong de su primer ping (los dos, en cualquier orden).
 *   · `entrando` — los tiene; se mira la llave y se busca (o se abre) la sala.
 *   · `esperando` — su llave es de un asiento que la declaración de la sala aún no trae.
 *   · `conectando` — su `EntradaConexion` está en la cola de la sala; espera su bienvenida (como mucho
 *     `PASOS_SIN_BIENVENIDA` pasos).
 *   · `dentro` — ya recibió `dentro`: le llegan los `tic` y las fotos, y sus `aqui` van a la sala.
 */
type EstadoDelCanal = 'saludo' | 'entrando' | 'esperando' | 'conectando' | 'dentro' | 'cerrada';

/** Lo que llegó por los canales de una sala, con el instante en que llegó. */
interface EnLaCola {
  readonly llegada: number;
  readonly entrada: EntradaDeLaSala;
}

/** La sala de una mesa: su estado puro y todo lo de alrededor que no es de las reglas. */
interface SalaViva {
  readonly codigo: string;
  readonly arcade: string;
  estado: EstadoDeLaSala;
  /**
   * La última declaración ACEPTADA, que puede ir un paso por delante de `estado.declaracion` (se aceptó y
   * está en la cola). Con ésta se numeran los asientos de quien entra; tiene siempre los mismos asientos
   * que la sala pura, porque una con otros no se acepta: rehace la sala.
   */
  declaracion: LizaDeclarada;
  /** El aforo con que nació: ninguna declaración con otro entra. */
  readonly aforo: AforoDeLaSala;
  /** Lo que declara costar (`costeDeLaLiza`), con los asientos de su última declaración. */
  coste: number;
  /** La revisión de la mesa de la última vista leída. */
  rev: number;
  /** El instante de pared en que su reloj marcaba cero: el tic `k` toca en `ancla + k × MS_POR_TIC`. */
  ancla: number;
  cola: EnLaCola[];
  /** Los canales con número: `conectando` o `dentro`. Uno por asiento. */
  readonly canales: Map<number, ConexionDeLaLiza>;
  readonly esperando: Set<ConexionDeLaLiza>;
  revisando: boolean;
  revisadaEn: number;
  vaciaDesde: number | null;
  cerrada: boolean;
  /** Por qué se cerró, si se cerró: quien llegaba a sentarse en ella justo entonces se va con lo mismo. */
  porQueSeCerro: Negativa | null;
  /** Lo que ha costado en µs lo que va de la ventana de un segundo, y lo que costó la última entera. */
  usEnLaVentana: number;
  pasosEnLaVentana: number;
  costeDelUltimoSegundo: number;
}

/** Una mesa que no tiene sala, y cómo se le dice a quien llama. */
interface Negativa {
  readonly clave: PorQueSeEcha;
  readonly motivo: string;
}

function esSala(v: SalaViva | Negativa): v is SalaViva {
  return (v as SalaViva).canales !== undefined;
}

/** Qué se hace con un mensaje si el canal está atascado. Ver la cabecera. */
type Clase = 'sustituible' | 'imprescindible';

/**
 * UN CANAL ABIERTO. Lo crea `CanalDeLaLiza.abrir`; le llegan los mensajes por `recibir`, los pongs por
 * `pong` y el cierre del otro lado por `seCerro`.
 */
export class ConexionDeLaLiza {
  estado: EstadoDelCanal = 'saludo';
  sala: SalaViva | null = null;
  /** Su número en el cable (1-15) desde que se admite; 0 antes. */
  numero = 0;
  /** El `AsientoId` de su llave, desde que se reconoce. */
  asiento: string | null = null;
  plazo: Temporizador | null = null;
  hola: Hola | null = null;
  holaEn = 0;
  /** Cuándo se abrió, en la pared: lo más que puede llevar su reloj (ver «el cubo» en la cabecera). */
  readonly abiertoEn: number;
  /** El último `n` de un `aqui` que se contó por su reloj; −1 antes del primero. */
  ultimoN = -1;
  /** El tic de su sala en que se metió su conexión (para `PASOS_SIN_BIENVENIDA`). */
  conectandoDesdeTic = 0;
  /** Los pings sin contestar: número → cuándo salió. */
  readonly pings = new Map<number, number>();
  siguientePing = 1;
  ultimoPingEn = 0;
  /** Las últimas idas y vueltas medidas con el ping, en ms. */
  readonly idasYVueltas: number[] = [];
  /** Las últimas muestras del desfase de su reloj CONTRA LA PARED (ver la cabecera). */
  readonly desfases: number[] = [];
  cubo: number = MENSAJES_DE_GOLPE;
  cuboEn: number;
  ultimoMensajeEn: number;
  ultimoAvisoEn = Number.NEGATIVE_INFINITY;
  esperaDesde = 0;

  constructor(
    private readonly canal: CanalDeLaLiza,
    readonly codigo: string,
    readonly enchufe: EnchufeDeLaLiza,
    ahora: number,
  ) {
    this.abiertoEn = ahora;
    this.cuboEn = ahora;
    this.ultimoMensajeEn = ahora;
  }

  /* Las tres puertas las llaman eventos del enchufe: ver «todo lo que llega de fuera va en su `try`». */

  /** Llega un mensaje. `null` si no era texto (un marco binario). */
  recibir(texto: string | null): void {
    try {
      this.canal.recibir(this, texto);
    } catch (error) {
      this.canal.fallo(this, error);
    }
  }

  /** Vuelve el pong del ping `numero`. */
  pong(numero: number): void {
    try {
      this.canal.pong(this, numero);
    } catch (error) {
      this.canal.fallo(this, error);
    }
  }

  /** El otro lado se ha ido, o el canal ha terminado de cerrarse. */
  seCerro(): void {
    try {
      this.canal.seCerro(this);
    } catch (error) {
      this.canal.fallo(this, error);
    }
  }
}

/* ─── EL CANAL ───────────────────────────────────────────────────────────── */

export class CanalDeLaLiza {
  private readonly reloj: RelojDeLaLiza;
  private readonly mesa: LaMesaDeLaLiza;
  private readonly lizas: LasLizas;
  private readonly motor: MotorDeLaSala;
  private readonly registrar: (linea: string) => void;
  private readonly cronometro: () => number;
  private readonly salas = new Map<string, SalaViva>();
  private readonly creando = new Map<string, Promise<SalaViva | Negativa>>();
  /** La cadena de veredictos camino de cada mesa (ver «los veredictos, en cadena por mesa»). */
  private readonly cadenas = new Map<string, Promise<void>>();
  private readonly conexiones = new Set<ConexionDeLaLiza>();
  private temporizador: Temporizador | null = null;
  /** La última vuelta del temporizador (o cuándo se encendió): el ancla de las salas que nacen. */
  private ultimaVuelta = 0;
  private apagado = false;
  private readonly cuentas = cuentasVacias();

  constructor(opciones: OpcionesDelCanal) {
    this.reloj = opciones.reloj;
    this.mesa = opciones.mesa;
    this.lizas = opciones.lizas;
    this.motor = opciones.motor;
    this.registrar = opciones.registrar ?? ((linea) => console.log(`[liza] ${linea}`));
    this.cronometro = opciones.cronometro ?? (() => performance.now());
  }

  /* ── Abrir y saludar ─────────────────────────────────────────────────── */

  /**
   * Un canal nuevo para la mesa `codigo`. Sale YA su primer ping, y tiene `PLAZO_DEL_HOLA_MS` para
   * decir `hola` y contestarlo.
   */
  abrir(codigo: string, enchufe: EnchufeDeLaLiza): ConexionDeLaLiza {
    const ahora = this.reloj.ahora();
    const c = new ConexionDeLaLiza(this, codigo, enchufe, ahora);
    this.conexiones.add(c);
    if (this.apagado) {
      this.echar(c, 'apagado', 'El servidor se está reiniciando: vuelve a entrar en unos segundos.');
      return c;
    }
    this.hacerPing(c, ahora);
    c.plazo = this.reloj.dentroDe(PLAZO_DEL_HOLA_MS, () => {
      if (c.estado === 'saludo') {
        this.echar(
          c,
          'sinHola',
          c.hola === null ? 'No se ha presentado a tiempo.' : 'La conexión no contesta: no se puede medir la red.',
        );
      }
    });
    return c;
  }

  private hacerPing(c: ConexionDeLaLiza, ahora: number): void {
    const numero = c.siguientePing++;
    c.pings.set(numero, ahora);
    c.ultimoPingEn = ahora;
    /* Los que nunca volvieron no se quedan para siempre: se olvida el más viejo. */
    if (c.pings.size > PINGS_RECORDADOS) {
      const viejo = c.pings.keys().next();
      if (viejo.done !== true) c.pings.delete(viejo.value);
    }
    c.enchufe.ping(numero);
  }

  /** Vuelve un pong: una ida y vuelta más. Si el canal esperaba sólo esto para entrar, entra. */
  pong(c: ConexionDeLaLiza, numero: number): void {
    if (c.estado === 'cerrada') return;
    const salio = c.pings.get(numero);
    if (salio === undefined) return;
    c.pings.delete(numero);
    const ahora = this.reloj.ahora();
    c.idasYVueltas.push(Math.max(0, ahora - salio));
    if (c.idasYVueltas.length > ECOS_DE_LA_MEDIANA) c.idasYVueltas.shift();
    this.cuentas.pongs++;
    this.intentarEntrar(c);
  }

  /** Lo que llega por un canal. */
  recibir(c: ConexionDeLaLiza, texto: string | null): void {
    if (c.estado === 'cerrada') return;
    const t0 = this.cronometro();
    const ahora = this.reloj.ahora();
    c.ultimoMensajeEn = ahora;

    /*
     * Un mensaje mal formado CIERRA: es lo que dice `atropello` en el contrato de la Liza. Un aparato
     * que manda algo que el lector no admite no está hablando esta versión del protocolo, y adivinar lo
     * que quiso decir es justo lo que el lector estricto existe para no hacer. Leer va antes que el cubo
     * porque el cubo necesita saber qué es: un mensaje cuesta leerlo como mucho `TOPE_DE_SUBIDA_BYTES`
     * letras, y el primero malo es el último.
     */
    const m = texto === null ? null : leerMensajeDelAparato(texto);
    if (m === null) {
      this.echar(c, 'atropello', 'Un mensaje que no es del protocolo de la liza.');
      return;
    }

    /* El cubo, para todo lo que no es un `aqui` a su hora: ver «el cubo» en la cabecera. */
    if (!this.vaPorSuReloj(c, m, ahora)) {
      c.cubo = Math.min(MENSAJES_DE_GOLPE, c.cubo + ((ahora - c.cuboEn) * OTROS_MENSAJES_POR_SEGUNDO) / 1000);
      c.cuboEn = ahora;
      if (c.cubo < 1) {
        this.echar(c, 'atropello', 'Demasiados mensajes seguidos.');
        return;
      }
      c.cubo -= 1;
    }

    if (c.estado === 'saludo' && c.hola === null) {
      if (m.t !== 'hola') {
        this.echar(c, 'sinHola', 'Lo primero tenía que ser el saludo.');
        return;
      }
      if (m.v !== VERSION_DE_LA_LIZA) {
        this.echar(
          c,
          'versionVieja',
          `Este aparato habla la versión ${String(m.v)} de la liza y el servidor la ${String(VERSION_DE_LA_LIZA)}: hay que actualizar.`,
        );
        return;
      }
      c.hola = m;
      c.holaEn = ahora;
      /* Ya ha saludado: la capa de cuotas suelta su hueco del tope de «sin saludar». */
      c.enchufe.saludo?.();
      this.intentarEntrar(c);
      return;
    }

    switch (m.t) {
      case 'hola':
        this.echar(c, 'atropello', 'Un segundo saludo en el mismo canal.');
        return;
      case 'eco':
        this.contestarElEco(c, m.c, ahora);
        break;
      case 'aqui':
        this.recibirAqui(c, m);
        break;
      case 'aviso':
        this.recibirAviso(c, m, ahora);
        break;
    }
    const sala = c.sala;
    if (sala !== null) sala.usEnLaVentana += (this.cronometro() - t0) * 1000;
  }

  /**
   * ¿ES UN `aqui` A SU HORA? Su `n` supera al último de este canal y no se adelanta a lo que el canal lleva
   * abierto: entonces es uno de los veinte por segundo que el aparato puede escribir, y no gasta ficha
   * aunque llegue junto a otros cuarenta tras un corte. Ver «el cubo» en la cabecera.
   */
  private vaPorSuReloj(c: ConexionDeLaLiza, m: MensajeDelAparato, ahora: number): boolean {
    if (m.t !== 'aqui') return false;
    if (m.n <= c.ultimoN || m.n * MS_POR_TIC > ahora - c.abiertoEn + ADELANTO_DEL_APARATO_MS) {
      this.cuentas.aquiFueraDeSuReloj++;
      return false;
    }
    c.ultimoN = m.n;
    return true;
  }

  /**
   * CON EL `hola` Y UNA IDA Y VUELTA, A ENTRAR. Hasta tener los dos no se sabe el desfase, y sin desfase
   * la sala no puede mandarle ningún instante (ver la cabecera).
   */
  private intentarEntrar(c: ConexionDeLaLiza): void {
    if (c.estado !== 'saludo' || c.hola === null || c.idasYVueltas.length === 0) return;
    this.apuntarDesfase(c, c.hola.c, c.holaEn);
    c.plazo?.parar();
    c.plazo = null;
    c.estado = 'entrando';
    void this.entrar(c, c.hola.llave);
  }

  /** Una muestra del desfase contra la pared: el reloj del aparato era `c` media ida y vuelta antes de `llegada`. */
  private apuntarDesfase(c: ConexionDeLaLiza, reloj: number, llegada: number): void {
    if (c.idasYVueltas.length === 0) return;
    c.desfases.push(reloj + mediana(c.idasYVueltas) / 2 - llegada);
    if (c.desfases.length > ECOS_DE_LA_MEDIANA) c.desfases.shift();
  }

  private idaYVuelta(c: ConexionDeLaLiza): number {
    return c.idasYVueltas.length === 0 ? 0 : Math.round(mediana(c.idasYVueltas));
  }

  /** El desfase de este canal contra el reloj de ESTA sala, en ms enteros. */
  private desfaseEnLaSala(c: ConexionDeLaLiza, sala: SalaViva): number {
    return Math.round(mediana(c.desfases) + sala.ancla);
  }

  /** El reloj de la sala ahora, en ms: nunca por detrás del tic que ya dio. */
  private relojDeLaSala(sala: SalaViva, ahora: number): number {
    return Math.max(sala.estado.tic * MS_POR_TIC, Math.round(ahora - sala.ancla));
  }

  private async entrar(c: ConexionDeLaLiza, llave: string): Promise<void> {
    try {
      const asiento = await this.mesa.quienEsLaLlave(c.codigo, llave);
      if (c.estado !== 'entrando') return;
      if (asiento === null) {
        this.echar(c, 'llaveMala', 'Esa llave no es de ningún asiento de esta mesa.');
        return;
      }
      const sala = await this.salaDe(c.codigo);
      if (c.estado !== 'entrando') return;
      if (!esSala(sala)) {
        this.echar(c, sala.clave, sala.motivo);
        return;
      }
      this.sentar(c, sala, asiento);
    } catch (error) {
      this.registrar(`no se ha podido entrar en la mesa ${c.codigo}: ${error instanceof Error ? error.message : String(error)}`);
      this.echar(c, 'fallo', 'El servidor no ha podido preparar la sala. Vuelve a intentarlo.');
    }
  }

  /* ── Las salas ───────────────────────────────────────────────────────── */

  /** La sala de una mesa: la que hay, o una nueva. Una sola por mesa aunque lleguen dos `hola` a la vez. */
  private salaDe(codigo: string): Promise<SalaViva | Negativa> {
    const hay = this.salas.get(codigo);
    if (hay !== undefined) return Promise.resolve(hay);
    const enCamino = this.creando.get(codigo);
    if (enCamino !== undefined) return enCamino;
    const nueva = this.crearSala(codigo).finally(() => this.creando.delete(codigo));
    this.creando.set(codigo, nueva);
    return nueva;
  }

  /**
   * UNA SALA NUEVA, de la vista de la mesa. La misma llamada para la primera vez y para después de un
   * despliegue: ver «cuánto vive una sala» en la cabecera.
   */
  private async crearSala(codigo: string): Promise<SalaViva | Negativa> {
    /* Los veredictos de la sala anterior de esta mesa, dentro antes de leer: ver «en cadena por mesa». */
    const pendientes = this.cadenas.get(codigo);
    if (pendientes !== undefined) await pendientes;
    const v = await this.mesa.vista(codigo);
    this.cuentas.lecturas.vistas++;
    if (v === null) return { clave: 'mesaQueNo', motivo: 'Esa mesa no existe.' };
    if (v.terminada) return { clave: 'mesaCerrada', motivo: 'La partida ya se ha acabado.' };
    if (!this.lizas.sePuedeLidiar(v.arcade)) {
      return { clave: 'mesaQueNo', motivo: 'Este juego no se juega a pie en este servidor.' };
    }
    const { liza, problemas, us } = this.sacarLaLiza(v.arcade, v.vista, codigo, null);
    if (liza === null) {
      this.cuentas.lecturas.ilegibles++;
      return { clave: 'mesaQueNo', motivo: 'La mesa no dice todavía cómo se juega a pie.' };
    }
    if (problemas.length > 0) {
      this.cuentas.lecturas.conProblemas++;
      this.registrar(`la liza de la mesa ${codigo} no se puede abrir: ${problemas.slice(0, 3).join(' · ')}`);
      return { clave: 'mesaQueNo', motivo: 'La mesa declara una liza que el servidor no puede servir.' };
    }
    if (this.apagado) return { clave: 'apagado', motivo: 'El servidor se está reiniciando: vuelve a entrar en unos segundos.' };
    /* Puede haber nacido otra mientras se leía la vista (un cierre y una vuelta): se usa ésa. */
    const hay = this.salas.get(codigo);
    if (hay !== undefined) return hay;
    const coste = costeDeLaLiza(liza);
    const abiertas: number[] = [];
    for (const s of this.salas.values()) abiertas.push(s.coste);
    if (!cabeOtraSala(abiertas, coste)) {
      this.cuentas.salasQueNoCupieron++;
      return { clave: 'llena', motivo: 'La ciudad está llena: prueba en un minuto.' };
    }
    const estado = this.motor.salaNueva(liza, liza.fase.semilla);
    const ahora = this.reloj.ahora();
    this.encenderElReloj(ahora);
    const sala: SalaViva = {
      codigo,
      arcade: v.arcade,
      estado,
      declaracion: liza,
      aforo: liza.aforo,
      coste,
      rev: v.rev,
      /* En fase con el temporizador: su primer paso cae en la siguiente vuelta (ver `TOLERANCIA_DEL_PASO_MS`). */
      ancla: this.ultimaVuelta,
      cola: [],
      canales: new Map(),
      esperando: new Set(),
      revisando: false,
      revisadaEn: ahora,
      vaciaDesde: ahora,
      cerrada: false,
      porQueSeCerro: null,
      /* Lo que costó sacar y validar su declaración es lo primero que cuesta: va en su primer segundo. */
      usEnLaVentana: us,
      pasosEnLaVentana: 0,
      costeDelUltimoSegundo: 0,
    };
    this.salas.set(codigo, sala);
    this.registrar(`se abre la sala de la mesa ${codigo} (${v.arcade}; fase ${liza.fase.clave}; coste ${String(coste)} µs/s)`);
    return sala;
  }

  /**
   * LA DECLARACIÓN DE UNA VISTA, Y SUS PROBLEMAS, CRONOMETRADO: es lo más caro que se hace por una mesa
   * (ver «la mesa, como mucho una lectura por segundo»). Devuelve lo que costó en µs para cargarlo a su
   * sala, y lo cuenta en `validaciones`. `anterior` es la última declaración aceptada por la sala (`null`
   * al abrirla): con ella se cuentan los mundos nuevos, y las revisiones del mundo se cuentan por lo que el
   * contador de la Liza sube DENTRO de esta validación (ver «el mundo se revisa una vez, y eso se cuenta»).
   */
  private sacarLaLiza(
    arcade: string,
    vista: unknown,
    codigo: string,
    anterior: LizaDeclarada | null,
  ): { liza: LizaDeclarada | null; problemas: readonly string[]; us: number } {
    const t0 = this.cronometro();
    const liza = this.lizas.lizaDeLaMesa(arcade, vista, codigo);
    let problemas: readonly string[] = [];
    if (liza !== null) {
      const revisadosAntes = validacionesDelMundo();
      problemas = problemasDeLaDeclaracion(liza);
      this.cuentas.validacionesDelMundo += validacionesDelMundo() - revisadosAntes;
      if (anterior === null || liza.mundo !== anterior.mundo) this.cuentas.mundosNuevos++;
    }
    const ms = Math.max(0, this.cronometro() - t0);
    const v = this.cuentas.validaciones;
    v.veces++;
    v.ms += ms;
    if (ms > v.msMasLenta) v.msMasLenta = ms;
    return { liza, problemas, us: ms * 1000 };
  }

  /**
   * Pone al canal en su asiento de la sala, o a esperar a que la declaración lo traiga. `sala` es la que
   * le dio `salaDe`; entre medias pudo cerrarse (se rehízo, reventó) o borrarse por vacía.
   */
  private sentar(c: ConexionDeLaLiza, dada: SalaViva, asiento: string): void {
    let sala = dada;
    const actual = this.salas.get(sala.codigo);
    if (actual !== undefined && actual !== sala && !actual.cerrada) {
      /* Ya hay otra —la que la sustituye—: ésa es la de la mesa. */
      sala = actual;
    } else if (sala.cerrada) {
      /*
       * Se va con lo mismo que los que ya estaban dentro: `rehecha` o `fallo` se reintentan y la entrada
       * siguiente la hace nacer otra vez; `mesaCerrada`, no. Echarlo con `mesaCerrada` a secas dejaba sin
       * volver a quien llegaba justo cuando la sala se rehacía.
       */
      const porQue = sala.porQueSeCerro ?? { clave: 'mesaCerrada', motivo: 'La partida ya se ha acabado.' };
      this.echar(c, porQue.clave, porQue.motivo);
      return;
    } else if (actual === undefined) {
      /* Se borró por vacía entre medias: vuelve a ser la sala de la mesa (se reanclará sola). */
      this.salas.set(sala.codigo, sala);
      this.encenderElReloj(this.reloj.ahora());
    }
    c.asiento = asiento;
    c.sala = sala;
    const numero = numeroDelAsiento(sala.declaracion, asiento);
    if (numero > 0) {
      this.admitir(c, sala, numero);
      return;
    }
    c.estado = 'esperando';
    c.esperaDesde = this.reloj.ahora();
    sala.esperando.add(c);
    sala.vaciaDesde = null;
  }

  /**
   * SU `EntradaConexion`, A LA COLA. Si su asiento ya tenía canal, el viejo se cierra con `reemplazado`
   * ANTES —y sin meter su desconexión: el nuevo manda—.
   */
  private admitir(c: ConexionDeLaLiza, sala: SalaViva, numero: number): void {
    const otra = sala.canales.get(numero);
    if (otra !== undefined && otra !== c) {
      this.echar(otra, 'reemplazado', 'Se ha abierto otro canal con este asiento: sigue en el nuevo.');
    }
    sala.esperando.delete(c);
    sala.canales.set(numero, c);
    sala.vaciaDesde = null;
    c.numero = numero;
    c.estado = 'conectando';
    c.conectandoDesdeTic = sala.estado.tic;
    this.encolar(sala, {
      tipo: 'conexion',
      asiento: numero,
      rttMs: this.idaYVuelta(c),
      desfaseMs: this.desfaseEnLaSala(c, sala),
    });
  }

  private encolar(sala: SalaViva, entrada: EntradaDeLaSala): void {
    sala.cola.push({ llegada: this.reloj.ahora(), entrada });
    this.cuentas.entradas[entrada.tipo]++;
  }

  /* ── Lo que manda un canal ───────────────────────────────────────────── */

  /**
   * UN `eco`: es una muestra más del desfase y, si el canal ya tiene sala, se contesta EN EL ACTO
   * —cualquier espera se sumaría a la ida y vuelta que el aparato mide— con el tic y el reloj de ESA sala.
   * Sin sala no se contesta: ver «un `eco` sin sala no se contesta» en la cabecera.
   */
  private contestarElEco(c: ConexionDeLaLiza, reloj: number, ahora: number): void {
    const sala = c.sala;
    if (sala === null) {
      this.cuentas.ecosSinSala++;
      this.apuntarDesfase(c, reloj, ahora);
      return;
    }
    const ms = this.relojDeLaSala(sala, ahora);
    if (this.mandar(c, textoDeLaSala({ t: 'eco', c: reloj, k: sala.estado.tic, ms }), 'sustituible')) this.cuentas.ecosContestados++;
    this.apuntarDesfase(c, reloj, ahora);
    if (c.estado === 'conectando' || c.estado === 'dentro') {
      this.encolar(sala, { tipo: 'eco', asiento: c.numero, rttMs: this.idaYVuelta(c), desfaseMs: this.desfaseEnLaSala(c, sala) });
    }
  }

  /** UN `aqui`, a la sala, con el desfase de ahora. Antes de `dentro` no sale de ningún sitio que la sala dijera. */
  private recibirAqui(c: ConexionDeLaLiza, m: Aqui): void {
    const sala = c.sala;
    if (c.estado !== 'dentro' || sala === null) {
      this.cuentas.ignorados++;
      return;
    }
    this.encolar(sala, {
      tipo: 'aqui',
      asiento: c.numero,
      n: m.n,
      x: m.x,
      z: m.z,
      r: m.r,
      m: m.m,
      accion: m.a === 0 ? null : { id: m.a[0], msDelAparato: m.a[1], blanco: m.a[2] },
      desfaseMs: this.desfaseEnLaSala(c, sala),
    });
  }

  /** UN `aviso`: uno por segundo como mucho, lo que dice el contrato; la sala pone además el suyo. */
  private recibirAviso(c: ConexionDeLaLiza, m: AvisoDelAparato, ahora: number): void {
    const sala = c.sala;
    if (c.estado !== 'dentro' || sala === null || ahora - c.ultimoAvisoEn < AVISO_CADA_MS) {
      this.cuentas.ignorados++;
      return;
    }
    c.ultimoAvisoEn = ahora;
    this.encolar(sala, { tipo: 'aviso', asiento: c.numero, clase: m.clase, objetivo: m.objetivo });
  }

  /** El otro lado cerró. Si lo había cerrado el servidor, ya está hecho. */
  seCerro(c: ConexionDeLaLiza): void {
    if (c.estado === 'cerrada') return;
    this.soltar(c, false);
    c.estado = 'cerrada';
    c.plazo?.parar();
    c.plazo = null;
    this.conexiones.delete(c);
    this.cuentas.cierres.seFue++;
  }

  /* ── Mandar ──────────────────────────────────────────────────────────── */

  /** Manda a un canal mirando antes si da abasto. `false` si no salió. Ver la cabecera. */
  private mandar(c: ConexionDeLaLiza, texto: string, clase: Clase): boolean {
    if (c.estado === 'cerrada') return false;
    const pendientes = c.enchufe.pendientes();
    if (clase === 'sustituible') {
      if (pendientes > ATASCO_PARA_SALTAR) {
        this.cuentas.saltados++;
        return false;
      }
    } else if (pendientes > ATASCO_PARA_CERRAR) {
      this.echar(c, 'atascado', 'Tu conexión no daba abasto: vuelve a entrar para ponerte al día.');
      return false;
    }
    c.enchufe.enviar(texto);
    return true;
  }

  /**
   * LOS `tic` DE UNA LISTA DE SUCESOS: trozos de `TOPE_DE_SUCESOS` con el mismo `k`, y si alguno no cabe
   * en `TOPE_DE_BAJADA_BYTES`, en dos mitades hasta que quepa. Lista vacía, ninguno: un `tic` vacío no
   * se manda.
   */
  private textosDelTic(k: number, ev: readonly SucesoDelTic[]): string[] {
    const textos: string[] = [];
    const partir = (trozo: readonly SucesoDelTic[]): void => {
      const texto = textoDeLaSala({ t: 'tic', k, ev: trozo });
      if (texto.length <= TOPE_DE_BAJADA_BYTES || trozo.length === 1) {
        textos.push(texto);
        return;
      }
      const mitad = trozo.length >> 1;
      partir(trozo.slice(0, mitad));
      partir(trozo.slice(mitad));
    };
    for (let i = 0; i < ev.length; i += TOPE_DE_SUCESOS) partir(ev.slice(i, i + TOPE_DE_SUCESOS));
    return textos;
  }

  /** Lo que devolvió un paso, a quien le toca y en el orden del contrato (ver la cabecera). */
  private repartir(sala: SalaViva, paso: PasoDeLaSala): void {
    const k = paso.sala.tic;

    for (const b of paso.bienvenidas) {
      const c = sala.canales.get(b.asiento);
      if (c === undefined || c.estado !== 'conectando') {
        this.cuentas.bienvenidasSinCanal++;
        continue;
      }
      const dentro = textoDeLaSala({ t: 'dentro', yo: b.asiento, k, x: b.x, z: b.z, r: b.r, hz: TICS_DE_LA_LIZA });
      if (this.mandar(c, dentro, 'imprescindible')) {
        c.estado = 'dentro';
        this.cuentas.bienvenidas++;
      }
    }

    for (const co of paso.correcciones) {
      const c = sala.canales.get(co.asiento);
      if (c === undefined || c.estado !== 'dentro') continue;
      /* `n` 0 se manda tal cual: el lector del aparato lo admite, como el del `aqui` (ver `Corrige`). */
      const corrige = textoDeLaSala({ t: 'corrige', n: co.n, x: co.x, z: co.z });
      if (this.mandar(c, corrige, 'sustituible')) this.cuentas.correcciones++;
    }

    if (paso.sucesos.length > 0) {
      const propios = new Set<number>();
      for (const s of paso.sucesos) if (s.para !== 0) propios.add(s.para);
      let comunes: string[] | null = null;
      for (const c of [...sala.canales.values()]) {
        if (c.estado !== 'dentro') continue;
        let textos: string[];
        if (!propios.has(c.numero)) {
          if (comunes === null) comunes = this.textosDelTic(k, paso.sucesos.filter((s) => s.para === 0).map((s) => s.suceso));
          textos = comunes;
        } else {
          textos = this.textosDelTic(
            k,
            paso.sucesos.filter((s) => s.para === 0 || s.para === c.numero).map((s) => s.suceso),
          );
        }
        for (const texto of textos) {
          if (!this.mandar(c, texto, 'imprescindible')) break;
          this.cuentas.ticsMandados++;
          this.cuentas.bytesDeTics += texto.length;
        }
      }
    }

    if (paso.fotoDebida !== null) {
      let alguien = false;
      for (const c of sala.canales.values()) if (c.estado === 'dentro') alguien = true;
      if (alguien) {
        const foto = textoDeLaSala({ t: 'foto', k, p: paso.fotoDebida });
        this.cuentas.fotosCompuestas++;
        for (const c of sala.canales.values()) {
          if (c.estado !== 'dentro') continue;
          if (c.enchufe.pendientes() > ATASCO_PARA_SALTAR) {
            this.cuentas.fotosSaltadas++;
            continue;
          }
          c.enchufe.enviar(foto);
          this.cuentas.fotos++;
          this.cuentas.bytesDeFotos += foto.length;
        }
      }
    }
  }

  /**
   * LOS VEREDICTOS, A LA MESA: en la cadena de la mesa, para que entren en el orden en que salieron
   * aunque la mesa tarde y aunque la sala que los dio ya no exista (ver «los veredictos, en cadena por
   * mesa»). Lo que conteste se cuenta; si la mesa se acabó o ya no existe, fuera todos los de su sala de
   * AHORA, que puede no ser la que dio el veredicto.
   */
  private meterLosVeredictos(sala: SalaViva, veredictos: readonly VeredictoDeLaLiza[]): void {
    const codigo = sala.codigo;
    let cadena = this.cadenas.get(codigo) ?? Promise.resolve();
    for (const v of veredictos) {
      cadena = cadena.then(async () => {
        try {
          const fue = await this.mesa.meter(codigo, v);
          this.cuentas.veredictos[fue.salida]++;
          if (fue.salida === 'rechazado') {
            this.registrar(`la mesa ${codigo} rechaza el veredicto ${v.tipo}: ${fue.motivo ?? 'sin motivo'}`);
          } else if (fue.salida === 'terminada' || fue.salida === 'sinMesa') {
            const deAhora = this.salas.get(codigo);
            if (deAhora !== undefined) this.cerrarLaSala(deAhora, 'mesaCerrada', fue.salida === 'sinMesa' ? 'La mesa ya no existe.' : 'La partida se ha acabado.');
          }
        } catch (error) {
          this.cuentas.veredictos.fallos++;
          this.registrar(`el veredicto ${v.tipo} de la mesa ${codigo} no ha podido entrar: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }
    const esta = cadena;
    this.cadenas.set(codigo, esta);
    /* Acabada, se olvida, salvo que detrás haya empezado otra: nunca rechaza (cada eslabón se atrapa). */
    void esta.then(() => {
      if (this.cadenas.get(codigo) === esta) this.cadenas.delete(codigo);
    });
  }

  /* ── El reloj ────────────────────────────────────────────────────────── */

  /**
   * Enciende el temporizador si no lo está. La vuelta de ahora es la fase de todas las salas que nazcan
   * mientras esté encendido: su ancla es la última vuelta, así que cada vuelta cae a medio camino de la
   * ventana de su paso (ver `TOLERANCIA_DEL_PASO_MS`).
   */
  private encenderElReloj(ahora: number): void {
    if (this.temporizador !== null || this.apagado) return;
    this.ultimaVuelta = ahora;
    this.temporizador = this.reloj.cada(MS_POR_TIC, () => this.tic());
  }

  private apagarElReloj(): void {
    this.temporizador?.parar();
    this.temporizador = null;
  }

  /** UNA VUELTA DEL TEMPORIZADOR: cada sala da los pasos que le tocan. Cada una en su `try`. */
  tic(): void {
    const ahora = this.reloj.ahora();
    this.ultimaVuelta = ahora;
    this.cuentas.tics++;
    for (const sala of this.salas.values()) {
      try {
        this.vueltaDeLaSala(sala, ahora);
      } catch (error) {
        this.registrar(`la vuelta de la mesa ${sala.codigo} ha fallado: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (this.salas.size === 0) this.apagarElReloj();
  }

  private vueltaDeLaSala(sala: SalaViva, ahora: number): void {
    /* Quien no habla, quien espera de más, y el ping de quien toca. */
    for (const c of [...sala.canales.values(), ...sala.esperando]) {
      if (ahora - c.ultimoMensajeEn >= SILENCIO_HASTA_CERRAR_MS) {
        this.echar(c, 'silencio', 'Quince segundos sin decir nada: el canal se cierra.');
        continue;
      }
      if (c.estado === 'esperando' && ahora - c.esperaDesde >= ESPERA_DEL_ASIENTO_MS) {
        this.echar(c, 'llaveMala', 'Tu asiento no está en la sala de esta mesa.');
        continue;
      }
      if (ahora - c.ultimoPingEn >= ECO_CADA_MS) this.hacerPing(c, ahora);
    }

    /* Sin nadie, la gracia; vencida, la sala se borra. */
    if (sala.canales.size === 0 && sala.esperando.size === 0) {
      if (sala.vaciaDesde === null) sala.vaciaDesde = ahora;
      if (ahora - sala.vaciaDesde >= graciaDe(sala.declaracion)) {
        this.borrarSala(sala);
        return;
      }
    } else {
      sala.vaciaDesde = null;
    }

    if (!sala.revisando && ahora - sala.revisadaEn >= REVISAR_LA_MESA_CADA_MS) void this.revisar(sala);

    /* Los pasos que tocan: ver «los dos relojes, y el ancla» en la cabecera. */
    const tocan = Math.floor((ahora - sala.ancla + TOLERANCIA_DEL_PASO_MS) / MS_POR_TIC) - sala.estado.tic;
    if (tocan <= 0) return;
    let pasos = tocan;
    if (pasos > PASOS_SEGUIDOS_COMO_MUCHO) {
      this.reanclar(sala, tocan - PASOS_SEGUIDOS_COMO_MUCHO);
      pasos = PASOS_SEGUIDOS_COMO_MUCHO;
    }
    for (let i = 1; i <= pasos; i++) {
      /* Cada paso se lleva lo que llegó antes de SU hora; el último, todo lo que haya. */
      const hasta = i === pasos ? null : sala.ancla + (sala.estado.tic + 1) * MS_POR_TIC;
      if (i > 1) this.cuentas.pasosDeRecuperacion++;
      this.darUnPaso(sala, hasta);
      if (sala.cerrada) return;
    }

    /*
     * Quien lleva `PASOS_SIN_BIENVENIDA` pasos de SU sala esperando su `dentro`, fuera con 1011 para que
     * vuelva a entrar: su conexión ya pasó por la sala y ésta no lo reconoció. Después de los pasos y
     * contado en pasos, a propósito: un proceso parado no da pasos, y lo que está en la cola no ha tenido
     * su oportunidad.
     */
    for (const c of [...sala.canales.values()]) {
      if (c.estado !== 'conectando' || sala.estado.tic - c.conectandoDesdeTic < PASOS_SIN_BIENVENIDA) continue;
      this.cuentas.sinBienvenida++;
      this.registrar(`un canal de la mesa ${sala.codigo} lleva ${String(PASOS_SIN_BIENVENIDA)} pasos sin su bienvenida: se cierra para que vuelva a entrar`);
      this.echar(c, 'fallo', 'La sala no te ha dado entrada: vuelve a entrar.');
    }
  }

  /**
   * LA SALA SE HA QUEDADO ATRÁS: se dan por perdidos `perdidos` pasos moviendo su ancla `Δ` hacia
   * delante. El mismo instante vale ahora `Δ` menos en el reloj de la sala, así que todo desfase crece
   * `Δ`, exacto:
   *
   *   · lo que ya está en la cola se midió contra el reloj viejo: su `desfaseMs` se corrige en el sitio
   *     (un `aqui` sigue diciendo el mismo instante; sólo cambia cómo se escribe en el reloj nuevo);
   *   · y la sala tiene guardado el viejo de cada canal que ya está dentro: le llega el nuevo en una
   *     `EntradaEco` DELANTE de todo lo demás, para que el primer anuncio que haga ya lo use. Los que aún
   *     esperan su bienvenida no la necesitan: su `EntradaConexion`, en la cola, ya va corregida.
   */
  private reanclar(sala: SalaViva, perdidos: number): void {
    const delta = perdidos * MS_POR_TIC;
    sala.ancla += delta;
    this.cuentas.reanclajes++;
    this.cuentas.pasosPerdidos += perdidos;
    const corregida: EnLaCola[] = [];
    for (const c of sala.canales.values()) {
      if (c.estado !== 'dentro') continue;
      corregida.push({
        llegada: Number.NEGATIVE_INFINITY,
        entrada: { tipo: 'eco', asiento: c.numero, rttMs: this.idaYVuelta(c), desfaseMs: this.desfaseEnLaSala(c, sala) },
      });
      this.cuentas.entradas.eco++;
    }
    for (const e of sala.cola) {
      const en = e.entrada;
      if (en.tipo === 'aqui' || en.tipo === 'eco' || en.tipo === 'conexion') {
        corregida.push({ llegada: e.llegada, entrada: { ...en, desfaseMs: en.desfaseMs + delta } });
      } else {
        corregida.push(e);
      }
    }
    sala.cola = corregida;
  }

  /** UN PASO de la sala, con lo que llegó hasta `hasta` (o todo), y su reparto. */
  private darUnPaso(sala: SalaViva, hasta: number | null): void {
    let entradas: EntradaDeLaSala[];
    if (hasta === null) {
      entradas = sala.cola.map((e) => e.entrada);
      sala.cola = [];
    } else {
      let i = 0;
      while (i < sala.cola.length && (sala.cola[i] as EnLaCola).llegada <= hasta) i++;
      entradas = sala.cola.slice(0, i).map((e) => e.entrada);
      sala.cola = sala.cola.slice(i);
    }
    const t0 = this.cronometro();
    let paso: PasoDeLaSala;
    try {
      paso = this.motor.avanzarLaSala(sala.estado, entradas);
    } catch (error) {
      this.cuentas.pasosRotos++;
      this.registrar(
        `el paso ${String(sala.estado.tic + 1)} de la sala de la mesa ${sala.codigo} ha reventado y la sala se cierra: ` +
          (error instanceof Error ? error.message : String(error)),
      );
      this.cerrarLaSala(sala, 'fallo', 'La sala ha tenido un problema. Vuelve a entrar: se rehace desde la mesa.');
      return;
    }
    sala.estado = paso.sala;
    this.cuentas.pasos++;
    this.repartir(sala, paso);
    if (paso.veredictos.length > 0) this.meterLosVeredictos(sala, paso.veredictos);
    sala.usEnLaVentana += (this.cronometro() - t0) * 1000;
    sala.pasosEnLaVentana++;
    if (sala.pasosEnLaVentana >= TICS_DE_LA_LIZA) {
      sala.costeDelUltimoSegundo = sala.usEnLaVentana;
      sala.usEnLaVentana = 0;
      sala.pasosEnLaVentana = 0;
    }
  }

  /* ── La mesa ─────────────────────────────────────────────────────────── */

  /**
   * ¿HA CAMBIADO LA MESA? Como mucho una vez por segundo y sala. La revisión primero, que es barata; la
   * vista sólo si cambió. Ver «la mesa, como mucho una lectura por segundo» en la cabecera.
   */
  private async revisar(sala: SalaViva): Promise<void> {
    sala.revisando = true;
    sala.revisadaEn = this.reloj.ahora();
    try {
      const r = await this.mesa.revision(sala.codigo);
      this.cuentas.lecturas.revisiones++;
      if (sala.cerrada || this.salas.get(sala.codigo) !== sala) return;
      if (r === null) {
        this.cerrarLaSala(sala, 'mesaCerrada', 'La mesa ya no existe.');
        return;
      }
      if (r.terminada) {
        this.cerrarLaSala(sala, 'mesaCerrada', 'La partida se ha acabado.');
        return;
      }
      if (r.rev === sala.rev) return;
      const v = await this.mesa.vista(sala.codigo);
      this.cuentas.lecturas.vistas++;
      if (sala.cerrada || this.salas.get(sala.codigo) !== sala) return;
      if (v === null) {
        this.cerrarLaSala(sala, 'mesaCerrada', 'La mesa ya no existe.');
        return;
      }
      if (v.terminada) {
        this.cerrarLaSala(sala, 'mesaCerrada', 'La partida se ha acabado.');
        return;
      }
      /* La revisión se apunta aunque la declaración no valga: leerla otra vez no la va a arreglar. */
      sala.rev = v.rev;
      const { liza, problemas, us } = this.sacarLaLiza(sala.arcade, v.vista, sala.codigo, sala.declaracion);
      sala.usEnLaVentana += us;
      if (liza === null) {
        this.cuentas.lecturas.ilegibles++;
        this.registrar(`la vista de la mesa ${sala.codigo} (revisión ${String(v.rev)}) no da liza: se sigue con la que había`);
        return;
      }
      if (problemas.length > 0) {
        this.cuentas.lecturas.conProblemas++;
        this.registrar(
          `la liza de la mesa ${sala.codigo} (revisión ${String(v.rev)}) tiene problemas y no se mete: ${problemas.slice(0, 3).join(' · ')}`,
        );
        return;
      }
      /*
       * Otros asientos: la sala pura no los toma, así que se rehace (ver «si cambian los asientos, la
       * sala se rehace»). Antes que el aforo: la sala nueva se admite otra vez, con el suyo.
       */
      if (!mismosAsientos(liza, sala.declaracion)) {
        this.cuentas.salasRehechas++;
        this.registrar(
          `la mesa ${sala.codigo} (revisión ${String(v.rev)}) tiene otros asientos (${String(sala.declaracion.asientos.length)} → ${String(liza.asientos.length)}): la sala se rehace`,
        );
        this.cerrarLaSala(sala, 'rehecha', 'La mesa ha cambiado de asientos: vuelves a entrar en un momento.');
        return;
      }
      if (!mismoAforo(liza.aforo, sala.aforo)) {
        this.cuentas.lecturas.conOtroAforo++;
        this.registrar(`la liza de la mesa ${sala.codigo} (revisión ${String(v.rev)}) cambia el aforo y no se mete: el coste se admitió al abrir`);
        return;
      }
      sala.declaracion = liza;
      sala.coste = costeDeLaLiza(liza);
      this.encolar(sala, { tipo: 'vista', declaracion: liza });
      this.cuentas.lecturas.declaracionesNuevas++;
    } catch (error) {
      this.cuentas.lecturas.fallos++;
      this.registrar(`no se ha podido leer la mesa ${sala.codigo}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      sala.revisando = false;
    }
  }

  /* ── Salir ───────────────────────────────────────────────────────────── */

  /**
   * CIERRA UN CANAL: `fuera` con el motivo, que se lee en pantalla, y su código. El `fuera` se salta si
   * el canal está atascado: se cierra igual, y el código dice por qué.
   */
  private echar(c: ConexionDeLaLiza, clave: PorQueSeEcha, motivo: string): void {
    if (c.estado === 'cerrada') return;
    this.soltar(c, clave === 'reemplazado');
    c.estado = 'cerrada';
    c.plazo?.parar();
    c.plazo = null;
    this.conexiones.delete(c);
    this.cuentas.cierres[clave]++;
    const codigo = codigoDelCierre(clave);
    try {
      if (c.enchufe.pendientes() > ATASCO_PARA_SALTAR) this.cuentas.saltados++;
      else c.enchufe.enviar(textoDeLaSala({ t: 'fuera', motivo }));
      c.enchufe.cerrar(codigo, clave);
    } catch (error) {
      this.registrar(`no se ha podido cerrar limpio un canal de la mesa ${c.codigo}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Algo ha reventado atendiendo a un canal: se dice y se cierra ESE canal. */
  fallo(c: ConexionDeLaLiza, error: unknown): void {
    this.registrar(`un canal de la mesa ${c.codigo} ha fallado y se cierra: ${error instanceof Error ? error.message : String(error)}`);
    try {
      this.echar(c, 'fallo', 'El servidor ha tenido un problema con este canal. Vuelve a entrar.');
    } catch {
      /* Si ni cerrar se puede, el enchufe se cierra solo al irse el otro lado. */
    }
  }

  /**
   * El canal deja su sala. Si estaba en ella con número, la sala lo sabe por una `EntradaDesconexion`
   * —salvo si lo reemplaza otro, que ya trae su conexión—.
   */
  private soltar(c: ConexionDeLaLiza, reemplazado: boolean): void {
    const sala = c.sala;
    if (sala !== null) {
      sala.esperando.delete(c);
      if (c.numero > 0 && sala.canales.get(c.numero) === c) {
        sala.canales.delete(c.numero);
        if (!reemplazado && !sala.cerrada) this.encolar(sala, { tipo: 'desconexion', asiento: c.numero });
      }
      if (sala.canales.size === 0 && sala.esperando.size === 0 && sala.vaciaDesde === null) sala.vaciaDesde = this.reloj.ahora();
    }
    c.sala = null;
  }

  private borrarSala(sala: SalaViva): void {
    if (this.salas.get(sala.codigo) === sala) this.salas.delete(sala.codigo);
    this.registrar(`se borra la sala de la mesa ${sala.codigo}: nadie ha vuelto en la gracia`);
  }

  private cerrarLaSala(sala: SalaViva, clave: PorQueSeEcha, motivo: string): void {
    sala.cerrada = true;
    sala.porQueSeCerro = { clave, motivo };
    if (this.salas.get(sala.codigo) === sala) this.salas.delete(sala.codigo);
    for (const c of [...sala.canales.values(), ...sala.esperando]) this.echar(c, clave, motivo);
    sala.canales.clear();
    sala.esperando.clear();
    sala.cola = [];
    this.registrar(`se cierra la sala de la mesa ${sala.codigo}: ${motivo}`);
    if (this.salas.size === 0) this.apagarElReloj();
  }

  /** LA MESA SE HA CERRADO U OLVIDADO: `mesaCerrada` a todos los que lidian en ella. */
  cerrarLaMesa(codigo: string, motivo: string): void {
    const sala = this.salas.get(codigo);
    if (sala !== undefined) this.cerrarLaSala(sala, 'mesaCerrada', motivo);
  }

  /** SIGTERM: todos los canales se cierran con 1001 y no se abre ninguno más. */
  apagar(): void {
    this.apagado = true;
    this.apagarElReloj();
    const motivo = 'El servidor se está reiniciando: vuelve a entrar en unos segundos.';
    for (const c of [...this.conexiones]) this.echar(c, 'apagado', motivo);
    for (const sala of this.salas.values()) {
      sala.cerrada = true;
      sala.porQueSeCerro = { clave: 'apagado', motivo };
    }
    this.salas.clear();
  }

  /* ── Mirar desde fuera ───────────────────────────────────────────────── */

  /** Un origen que no se admite: lo cuenta el enchufe, que es quien lo ve. */
  contarOrigenNegado(): void {
    this.cuentas.origenesNegados++;
  }

  /** Una subida negada por cuota (`botas/cuotas.ts`, usada tal cual). */
  contarCuotaNegada(motivo: MotivoDeCuota): void {
    this.cuentas.cuotasNegadas[motivo]++;
  }

  diagnostico(): DiagnosticoDeLaLiza {
    let enSala = 0;
    const idas: number[] = [];
    for (const c of this.conexiones) {
      if (c.estado !== 'dentro') continue;
      enSala++;
      if (c.idasYVueltas.length > 0) idas.push(mediana(c.idasYVueltas));
    }
    let costeDeclarado = 0;
    const porSala: number[] = [];
    for (const sala of this.salas.values()) {
      costeDeclarado += sala.coste;
      porSala.push(Math.round(sala.costeDelUltimoSegundo));
    }
    porSala.sort((a, b) => b - a);
    let costeMedido = 0;
    for (const c of porSala) costeMedido += c;
    return {
      ...this.cuentas,
      salas: this.salas.size,
      canales: this.conexiones.size,
      enSala,
      temporizador: this.temporizador !== null,
      costeDeclarado,
      costeMedido,
      costeMedidoPorSala: porSala,
      idaYVueltaMs: idas.length === 0 ? null : Math.round(mediana(idas)),
      entradas: { ...this.cuentas.entradas },
      veredictos: { ...this.cuentas.veredictos },
      lecturas: { ...this.cuentas.lecturas },
      validaciones: {
        veces: this.cuentas.validaciones.veces,
        ms: Math.round(this.cuentas.validaciones.ms * 10) / 10,
        msMasLenta: Math.round(this.cuentas.validaciones.msMasLenta * 10) / 10,
      },
      cuotasNegadas: { ...this.cuentas.cuotasNegadas },
      cierres: { ...this.cuentas.cierres },
    };
  }
}
