/**
 * EL CANAL DE BOOTS ON BOARD, DEL LADO DEL SERVIDOR: la sala de cada mesa, la validación de cada
 * paso, la refriega, y la foto que ven todos.
 *
 * ═══ EL APARATO ANDA; EL SERVIDOR VALIDA Y CORRIGE ═══
 *
 * `docs/BOOTS-ON-BOARD.md` §7.3 A: cada aparato anda con su mundo entero —estructura y adorno— y
 * manda cada tic dónde está. Aquí no se resimula nada: se COTEJA lo que dice con la ESTRUCTURA del
 * mundo de la mesa, que es lo que el servidor puede derivar de la vista pública, y si no cuadra se
 * le devuelve al último sitio bueno (`corrige`). Lo que se impide es exactamente lo que da ventaja
 * en una arena lenta: atravesar murallas y edificios, correr de más y teletransportarse.
 * Atravesar un barril no se impide, porque el barril es adorno y el servidor no sabe que existe.
 *
 * El contrato —mensajes, topes, cierres y lectores estrictos— está en
 * `shared/mecanicas/canal-de-botas.ts` y aquí no se redefine nada de él. Este fichero no sabe de
 * WebSocket ni de HTTP: recibe texto por un `Enchufe` y lo contesta por el mismo, con un `Reloj`
 * y una `LaMesa` inyectados. Así las reglas de tiempo se prueban en proceso con un reloj de mentira
 * —sesenta segundos de «quieto» en un milisegundo— y la red de verdad la pone `enchufe.ts`.
 *
 * ═══ LO QUE LLEGA, POR TIPO ═══
 *
 * `recibir` despacha por el tipo que dio el lector: `aqui` va a `validar` y `golpe` a `golpear`, y
 * nada más. Cualquier otro tipo que el lector acepte mañana se cuenta y se ignora hasta que alguien
 * le escriba su manejador. Antes el golpe caía en `validar` como si fuera un paso: sin `m` ni sitio,
 * dejaba la marcha de su asiento sin definir y la foto de TODA la sala salía ilegible.
 *
 * ═══ LA VALIDACIÓN DE UN `aqui`, EN SU ORDEN ═══
 *
 *   0. EL CAÍDO NO ANDA. Mientras está en el suelo lo que diga se ignora, sin corregirle: se queda
 *      donde cayó hasta que renace, y renacer es su corrección.
 *   1. EL TIC CRECE. Un `n` que no pasa del último que llegó por este canal se ignora: viejo o
 *      repetido. No se corrige: no dice nada nuevo.
 *   2. SI HAY UNA CORRECCIÓN PENDIENTE —se le mandó `corrige`, `dentro` o `renace` y todavía no ha
 *      dado un paso desde ahí—, lo que no esté a un tic del sitio corregido se ignora EN SILENCIO
 *      durante un segundo. Es lo que ya venía de camino cuando salió la corrección: contestar a cada
 *      uno con otro `corrige` haría que el aparato, que ya estaba corregido, volviera a saltar atrás
 *      por cada paso que tenía en vuelo. Pasado el segundo, se vuelve a corregir.
 *   3. EL PRESUPUESTO DE DISTANCIA, por asiento: se rellena a `VELOCIDAD_CORRIENDO` por el tiempo
 *      DE PARED que ha pasado, con un 25 % de holgura y un tope de un segundo acumulado. Un tramo
 *      más largo que lo que queda es correr de más o teletransportarse: `corrige`. Es por ASIENTO y
 *      no por canal para que abrir otro canal no rellene nada.
 *   4. LA ESTRUCTURA: el tramo desde el último sitio bueno se tiene que poder andar en línea recta
 *      (`seAndaEnRecta` de `mundo.ts`, con el radio de quien anda). Y una sola tolerancia, medida:
 *      un tramo de UN TIC que no pasa en recta pero sí en ESCUADRA —primero un eje y luego el
 *      otro— se admite. Ver `seAndaElTramo`.
 *
 * ═══ LA REFRIEGA, EN UNA PANTALLA ═══
 *
 * El aparato dice «golpeo» (`golpe`) y nada más; lo que pasa lo decide esto, sobre los sitios que
 * ACEPTÓ. Un golpe se ignora si quien golpea está caído, si su tic no crece, o si no ha pasado
 * `RECARGA_DEL_GOLPE_MS` desde su último golpe ACEPTADO —los ignorados no alargan la recarga—. Si se
 * acepta, `lanza` a toda la sala, y se busca a quién le da (`aQuienDa`): a los demás que están DE PIE
 * —ni caídos ni intocables—, vistos donde los veía quien golpeó (rebobinados `REBOBINADO_MS` sobre su
 * rastro de sitios aceptados), al alcance del arma o menos, dentro del cono de la mirada del golpe
 * y sin muro en medio; y de ésos, al MÁS CERCANO, uno solo. `da` a toda la sala; con la vida a cero,
 * `cae`: `CAIDO_MS` en el suelo, sin andar ni golpear, y luego `renace` donde dice `sitioDeRenacer`
 * con la vida entera e intocable `INTOCABLE_MS`. Quien entra —o vuelve a entrar— recibe `vidas`
 * justo después de `dentro`, y a partir de ahí lo sigue por `da`, `cae` y `renace`.
 *
 * El golpe pega con el ARMA de quien golpea (`docs/AVATARES-JUGABLES.md` §4): daño, alcance y cono
 * salen de `armaEnLaRefriega`, leída de la vista pública de la mesa una vez por asiento y revisión
 * (`golpeDe`). Con los puños, los números de siempre. La vida sigue siendo `VIDA_ENTERA` y no baja
 * de cero.
 *
 * ═══ LOS HALLAZGOS, EN UNA PANTALLA ═══
 *
 * `docs/AVATARES-JUGABLES.md` §2. Cada sala tiene sus BROTES (`hallazgos.ts`): sitios sacados de la
 * arena del mundo de ahora, `brotesDeLaMesa(sentados)` vivos a la vez, la clase sorteada por los
 * pesos de `hallazgosDelJuego` con el azar PROPIO de la sala —no el de la mesa, y nada de esto va al
 * diario—, y un juego sin tabla no tiene ninguno. Quien entra recibe `brotes` justo después de
 * `vidas`, y toda la sala lo recibe otra vez en cada cambio. Se recoge sin mensaje del aparato: al
 * ACEPTAR un `aqui` de alguien que no está caído, si queda a `RADIO_DE_RECOGER` o menos de un brote y
 * los topes por asiento y por mesa lo dejan, el brote se aparta y `arcade:hallazgo` va a la mesa por
 * la vía interna (`recoger`). Si ENTRA, se quita, `recoge` a toda la sala y luego `brotes`, y a los
 * `REBROTE_MS` brota uno nuevo en otro sitio libre; si no entra (sin efecto, rechazado), el brote se
 * queda y no gasta ningún tope. Cuando el mundo cambia, lo que se queda donde ya no se puede estar se
 * recoloca.
 *
 * ═══ NADIE ES INMUNE POR NO BAJAR ═══
 *
 * En una sala están TODOS los sentados a la mesa, y no sólo los que tienen canal: al abrirse, cada
 * asiento se pone de pie en su sitio de nacer, y ahí se queda, quieto, hasta que baje. Quien cierra
 * su canal —se va, o se le cierra por quieto— tampoco sale de la sala: se queda de pie donde estaba.
 * Los dos salen en la foto, se les puede golpear, tumbar y quitar botín, y renacen como cualquiera.
 * Si no fuera así, en una mesa donde se roba bastaría con no abrir la escena —o cerrarla al ver venir
 * a alguien— para que no te pudieran quitar nada, y la refriega sería de quien quisiera jugarla. La
 * mesa es `botas` porque todos la eligieron así al abrirla o sentarse. Quien vuelve, vuelve donde se
 * quedó, con la vida que tenga.
 *
 * Por eso la sala ya no vive «mientras haya alguien dentro» —siempre hay alguien—, sino mientras haya
 * alguien CON CANAL, y `GRACIA_AL_IRSE_MS` después de que se vaya el último. Al borrarse se va todo
 * lo suyo: sitios, vidas y caídas. Lo único que sobrevive a la sala es lo que protege la mesa: el
 * libro de botines (ver `pedirElBotin`).
 *
 * ═══ UNA FOTO POR SALA, LA MISMA CADENA PARA TODOS, Y UN SOLO RELOJ ═══
 *
 * Un solo temporizador para todo el proceso, a `TICS_POR_SEGUNDO`, que recorre las salas con gente
 * y cada `TICS_POR_SEGUNDO / FOTOS_POR_SEGUNDO` tics serializa UNA foto por sala y manda la MISMA
 * cadena a todos sus canales. Por eso la foto no lleva nada de nadie en particular.
 *
 * Sin salas, el temporizador está PARADO: un servidor sin nadie andando no hace ni un tic.
 *
 * ═══ LO QUE SE PUEDE PERDER Y LO QUE NO, CON UN CANAL ATASCADO ═══
 *
 * Todo lo que se manda mira antes cuánto espera a salir por ese canal (`pendientes()`), y con más
 * de `ATASCO_BYTES` no se le sigue llenando la cola. Qué se hace depende de lo que es:
 *
 *   · SE SALTA —y se cuenta— lo que otro mensaje sustituye: la FOTO (llega otra en 100 ms), el
 *     `corrige` (si el aparato insiste desde el sitio malo, pasado un segundo se le repite), el
 *     `lanza` (es un gesto), el `recoge` (es un aviso, y detrás va la lista), y el `fuera` de un
 *     canal que se cierra igual (el código de cierre dice por qué).
 *   · CIERRA EL CANAL, con `atascado`, lo que no se puede perder: `dentro`, `vidas`, `da`, `cae`,
 *     `renace` y `brotes` (sólo se manda cuando cambia: saltárselo dejaría brotes fantasma). Quien se salta un `da` cuenta mal las vidas para siempre —el contrato promete que
 *     llegan todos y en orden—, así que no se le salta: se le cierra, y al volver a entrar `dentro` y
 *     `vidas` le ponen al día.
 *
 * ═══ DESALOJO POR CONTENIDO ═══
 *
 * Quien no cambia de sitio aceptado en `QUIETO_HASTA_CERRAR_MS` se cierra con `quieto`. Por
 * contenido y no por tráfico: una pestaña en segundo plano sigue mandando mensajes y parece viva;
 * lo que no hace es moverse. Cerrar el canal no le echa de la mesa —la partida sigue siendo suya—
 * ni de la sala: su asiento se queda donde estaba. El aparato vuelve a abrirlo cuando se vuelva a
 * andar.
 */
import {
  BOTIN_CADA_PAREJA_MS,
  CAIDO,
  CAIDO_MS,
  CIERRE,
  COSENO_CUADRADO_DEL_CONO,
  DE_PIE,
  FOTOS_POR_SEGUNDO,
  GRACIA_AL_IRSE_MS,
  INTOCABLE,
  INTOCABLE_MS,
  leerMensajeDelAparato,
  MENSAJES_DE_GOLPE,
  MENSAJES_POR_SEGUNDO,
  PLAZO_DEL_HOLA_MS,
  QUIETO_HASTA_CERRAR_MS,
  REBOBINADO_MAXIMO_MS,
  RECARGA_DEL_GOLPE_MS,
  RETRASO_DE_LOS_DEMAS_MS,
  VERSION_DEL_CANAL,
  VIDA_ENTERA,
  ALCANCE_DEL_GOLPE,
} from '../../../shared/mecanicas/canal-de-botas';
import type {
  Aqui,
  Cae,
  Corrige,
  Da,
  Dentro,
  EstadoEnLaRefriega,
  Foto,
  Fuera,
  Golpe,
  Lanza,
  Recoge,
  Renace,
  Vidas,
} from '../../../shared/mecanicas/canal-de-botas';
import {
  brotesDeLaMesa,
  HALLAZGOS_POR_ASIENTO_Y_MINUTO,
  HALLAZGOS_POR_MESA_Y_MINUTO,
  REBROTE_MS,
} from '../../../shared/mecanicas/hallazgos';
import type { Brote, ClaseDeHallazgo } from '../../../shared/mecanicas/hallazgos';
import { PUNOS } from '../../../shared/arcade/juegos/riberas-armas';
import type { ArmaEnLaRefriega } from '../../../shared/arcade/juegos/riberas-armas';
import { randomInt } from 'node:crypto';
import { azarConSemilla, BrotesDeLaSala, LEJOS_DE_TODOS_AL_BROTAR } from './hallazgos';
import {
  COSENO,
  DT_DEL_TIC,
  RADIO_DEL_PASEANTE,
  rumboDeRadianes,
  SENO,
  TICS_POR_SEGUNDO,
  VELOCIDAD_CORRIENDO,
} from '../../../shared/mecanicas/andar';
import type { Marcha } from '../../../shared/mecanicas/andar';
import { deNumero, por, UNO } from '../../../shared/mecanicas/fijo';
import { arenaDe, seAndaEnRecta, sePuedeEstar } from '../../../shared/mecanicas/mundo';
import type { Andante, Arena, MundoDeclarado } from '../../../shared/mecanicas/mundo';
import { dondeSeNace, SEPARACION_AL_NACER, sitioDondeCabe } from './sitios';
import type { Aparicion } from './sitios';

/* ─── LOS NÚMEROS DE LA VALIDACIÓN ───────────────────────────────────────── */

/** Cuánto más de lo que da de sí correr se tolera: un 25 %. Lo que se come la red al agrupar. */
export const HOLGURA_DEL_PRESUPUESTO = 1.25;

/** Cuánto presupuesto se puede acumular estando quieto: un segundo de correr, con su holgura. */
export const TOPE_DEL_PRESUPUESTO = VELOCIDAD_CORRIENDO * HOLGURA_DEL_PRESUPUESTO;

/** A qué ritmo se rellena, en Q16.16 por milisegundo de pared. */
export const PRESUPUESTO_POR_MS = (VELOCIDAD_CORRIENDO * HOLGURA_DEL_PRESUPUESTO) / 1000;

/**
 * Lo más que se anda en un tic, con la holgura: `por(VELOCIDAD_CORRIENDO, DT_DEL_TIC)` son 1,32
 * unidades, y con el 25 % 1,65. Es la medida de «a un tic de», para la corrección pendiente y para
 * la escuadra.
 */
export const UN_TIC_CON_HOLGURA = por(VELOCIDAD_CORRIENDO, DT_DEL_TIC) * HOLGURA_DEL_PRESUPUESTO;

/** Cuánto se calla una corrección pendiente antes de repetirse. Ver la cabecera, punto 2. */
export const RECORDAR_LA_CORRECCION_MS = 1000;

/** Cuántos mensajes mal formados se aguantan. El siguiente es `atropello`. */
export const MAL_FORMADOS_TOLERADOS = 3;

/** Cada cuánto, como mucho, se pregunta a la mesa si ha cambiado. */
export const REVISAR_LA_MESA_CADA_MS = 1000;

/**
 * QUÉ PARTE DEL HILO SE DEJA, COMO MUCHO, PARA VOLVER A DERIVAR MUNDOS: la quinta parte.
 *
 * ═══ LA ESPIRAL QUE ESTO CORTA, MEDIDA ═══
 *
 * Derivar el mundo de Las Lindes con el tablero lleno cuesta 0,3 ms si el reparto de sus losas está
 * en las cachés del proceso, y 210-230 ms si no lo está. Esas cachés son de 512 y 1.024 losas —las
 * dimensionó quien pensaba en UN aparato— y una mesa llena son 72: con más de siete salas llenas a
 * la vez, cada jugada vuelve a montarlo todo en frío. Medido con `medir:botas --jugada 5`: con cinco
 * salas, 0,3 ms por derivación; con diez, 209 ms, el 39 % de un núcleo, y las fotos bajan de 8 a 5,4
 * por segundo porque el hilo no llega. Con cincuenta NO TERMINA: cada derivación bloquea el hilo,
 * así que cuando vuelve el tic TODAS las salas están ya para revisar y casi todas han cambiado de
 * revisión, y cada vuelta del bucle deriva más que la anterior. Es una espiral: el servidor entero
 * —la API incluida— deja de contestar.
 *
 * Eso ya no pasa por las cachés: desde el 23-sep la memoria de Las Lindes es POR MESA
 * (`lindes-mundo.ts`, con tope de 128 mesas llenas), y volver a derivar cuesta una losa montada por
 * cada losa puesta, y ninguna si la jugada no pone losa —con 100 mesas en rueda, 4,6 ms en vez de
 * 243—. Lo que sigue en frío es ABRIR una sala, y un juego nuevo cuyo mundo sea caro de derivar:
 * para eso sigue haciendo falta el turno.
 *
 * Así que se pregunta la revisión como siempre —es barato: no proyecta nada— pero DERIVAR un mundo
 * pide TURNO: uno para todo el proceso, de uno en uno, y después de cada derivación la siguiente
 * espera cuatro veces lo que costó esa, con un temporizador de verdad en medio —así el bucle lee los
 * enchufes entre una y otra—. Con derivaciones de 0,3 ms no se nota nada; con las de 210 ms las salas
 * esperan su turno para ver su mundo nuevo —y mientras tanto se valida contra el que tenían, que es
 * lo que pasaba en el segundo de antes—, pero el hilo sigue sirviendo a todos.
 *
 * ═══ Y ABRIR UNA SALA TAMBIÉN PIDE TURNO, PERO VA DELANTE ═══
 *
 * Abrir una sala deriva su mundo, y al principio no pedía turno —«hay alguien esperando»—. El banco
 * con WebSocket de verdad enseñó por qué tiene que pedirlo: tras un despliegue vuelven todos a la vez,
 * cincuenta salas son cincuenta derivaciones en frío seguidas, y el hilo se queda once segundos sin
 * leer ningún enchufe; los `hola` que ya estaban en el cable se leen cuando el plazo de cinco
 * segundos ya ha saltado, se cierra con `sinHola` a gente que sí saludó a tiempo, la sala se vacía, y
 * al volver a entrar se abre otra vez, en frío. Otra espiral. Así que abrir pide turno como todos,
 * pero con PRIORIDAD sobre volver a derivar: delante hay alguien esperando su `dentro`.
 */
export const PARTE_PARA_DERIVAR = 0.2;

/** Quién va antes al pedir turno para derivar: abrir una sala, antes que volver a derivar. */
const PARA_ABRIR = 0;
const PARA_VOLVER_A_DERIVAR = 1;

/**
 * Cuántos bytes pueden esperar a salir por un canal antes de dejar de llenarle la cola: dieciséis
 * kilos, unas setenta fotos de cinco personas. Un canal sano está a cero: lo que se manda va derecho
 * al sistema. Qué se hace entonces con cada mensaje, en la cabecera.
 */
export const ATASCO_BYTES = 16 * 1024;

/** Cada cuántos tics hay foto. Tiene que ser entero: si no, las fotos no caerían en tics. */
export const TICS_POR_FOTO = TICS_POR_SEGUNDO / FOTOS_POR_SEGUNDO;
if (!Number.isInteger(TICS_POR_FOTO) || TICS_POR_FOTO < 1) {
  throw new Error(
    `Los tics por segundo (${String(TICS_POR_SEGUNDO)}) no son múltiplo de las fotos por segundo ` +
      `(${String(FOTOS_POR_SEGUNDO)}): la foto no caería siempre en un tic.`,
  );
}

/** Lo que dura un tic del temporizador, en milisegundos: 50. */
export const MS_POR_TIC = 1000 / TICS_POR_SEGUNDO;

/* ─── LOS NÚMEROS DE LA REFRIEGA ─────────────────────────────────────────── */

/**
 * LA IDA Y VUELTA DE LA RED QUE SE SUPONE, porque no se mide: 100 ms, un móvil con cobertura normal.
 * El canal no tiene latido en el protocolo, y el `ping` de `ws` es del enchufe, que no es de aquí.
 */
export const IDA_Y_VUELTA_SUPUESTA_MS = 100;

/**
 * CUÁNTO SE REBOBINA A LOS DEMÁS PARA VERLOS DONDE LOS VEÍA QUIEN GOLPEA: 250 ms.
 *
 * ═══ LA CUENTA, CON LO QUE SE SABE Y LO QUE SE SUPONE ═══
 *
 * El aparato pinta a los demás `RETRASO_DE_LOS_DEMAS_MS` (150 ms) por detrás de las fotos que le han
 * llegado —lo dice el contrato, y así lo hace `escenas/paseo/canal-de-botas.ts`—. Eso se SABE. Lo que
 * falta es la red: la foto tarda en bajar y el golpe en subir, así que cuando el golpe llega aquí lo
 * que el otro vio tiene 150 ms más una ida y vuelta. Esa ida y vuelta se SUPONE
 * (`IDA_Y_VUELTA_SUPUESTA_MS`): 150 + 100 = 250, que es justo lo más que el contrato deja rebobinar
 * (`REBOBINADO_MAXIMO_MS`, la «ventaja del que asoma» de 150-250 ms que aceptó Miguel). El `Math.min`
 * queda para quien suba la suposición: nunca se rebobina más que el tope.
 *
 * Lo que cuesta equivocarse, en el tablero: corriendo se hacen 26,4 u/s, 2,6 u cada 100 ms, que es el
 * alcance entero del golpe. Con 250 fijos, desde la wifi de casa —20 ms— se acierta a veces a quien
 * ya se había ido un paso; desde un tren —300 ms— se falla lo que se creía acertar. Es la ventaja
 * aceptada, y está del lado de quien juega desde el móvil.
 *
 * Lo que se rebobina son SITIOS y no estados: si alguien está caído o intocable se mira al llegar
 * el golpe, que es cuando se puede recibir.
 */
export const REBOBINADO_MS = Math.min(REBOBINADO_MAXIMO_MS, RETRASO_DE_LOS_DEMAS_MS + IDA_Y_VUELTA_SUPUESTA_MS);

/** El coseno al cuadrado del cono en Q16.16 (0,5 → 32.768), para compararlo con enteros exactos. */
const CONO_EN_FIJO = BigInt(deNumero(COSENO_CUADRADO_DEL_CONO));
const UNO_GRANDE = BigInt(UNO);

/**
 * UN GOLPE, CON LOS NÚMEROS DE SU ARMA YA EN ENTEROS: daño, alcance en Q16.16 y su cuadrado, y el
 * coseno al cuadrado del cono en Q16.16 como entero grande. Lo que de verdad compara `aQuienDa`.
 *
 * ═══ LAS ARMAS (docs/AVATARES-JUGABLES.md §4) ═══
 *
 * El daño, el alcance y el cono ya no son constantes del canal: salen del arma de quien golpea
 * (`armaEnLaRefriega` del registro de mundos, leída de la vista PÚBLICA de la mesa). Con los puños
 * salen EXACTAMENTE los números de antes —`deNumero(ALCANCE_DEL_GOLPE)` y
 * `deNumero(COSENO_CUADRADO_DEL_CONO)`, 1 de daño—, que es lo que `GOLPE_DE_PUNOS` fija aquí y
 * `verify:hallazgos` comprueba. El alcance más largo de la tabla (6 u, la honda) da productos de
 * 2⁷² en el cono: por eso el cono sigue en enteros grandes, y el cuadrado del alcance (393.216² ≈
 * 1,5·10¹¹) cabe en un doble sin perder nada.
 */
export interface GolpeDelArma {
  readonly dano: number;
  readonly alcance: number;
  readonly alcanceAlCuadrado: number;
  readonly cono: bigint;
}

/** Los números de un arma, pasados a enteros. Un arma rara —daño negativo, alcance sin sentido— pega como los puños. */
export function golpeDelArma(arma: ArmaEnLaRefriega): GolpeDelArma {
  const bien =
    Number.isFinite(arma.dano) &&
    arma.dano >= 0 &&
    Number.isFinite(arma.alcance) &&
    arma.alcance > 0 &&
    arma.alcance <= 64 &&
    Number.isFinite(arma.cosenoCuadrado) &&
    arma.cosenoCuadrado >= 0 &&
    arma.cosenoCuadrado <= 1;
  const a = bien ? arma : PUNOS;
  const alcance = deNumero(a.alcance);
  return {
    dano: Math.floor(a.dano),
    alcance,
    alcanceAlCuadrado: alcance * alcance,
    cono: BigInt(deNumero(a.cosenoCuadrado)),
  };
}

/** El golpe sin arma: la refriega de siempre, con `ALCANCE_DEL_GOLPE` y `COSENO_CUADRADO_DEL_CONO`. */
export const GOLPE_DE_PUNOS: GolpeDelArma = golpeDelArma({
  dano: 1,
  alcance: ALCANCE_DEL_GOLPE,
  cosenoCuadrado: COSENO_CUADRADO_DEL_CONO,
});

/**
 * EL RADIO CON QUE SE MIRA SI HAY MURO EN MEDIO: una décima de unidad, un cuarto del de quien anda.
 *
 * Con el de quien anda, un golpe que pasa rozando una esquina chocaría con ella —lo mismo que obligó
 * a la escuadra de los pasos—, y lo que vuela no tiene hombros. Y no cero: `seAndaEnRecta` mira el
 * tramo a trozos de un radio, y con un radio de nada los trozos serían de un cuarto de unidad y un
 * muro más fino se colaría entre dos. Con éste, los cuadrados de los trozos se solapan y ningún muro
 * que corte el tramo se escapa. `seAndaEnRecta` pide además suelo en cada trozo: un golpe no cruza
 * un hueco sin suelo, que dentro del alcance es el borde del tablero o el agua que no se vadea.
 */
export const RADIO_DEL_LANZAMIENTO = Math.floor(RADIO_DEL_PASEANTE / 4);

/**
 * LEJOS, AL RENACER: lo que corre quien te tumbó mientras dura lo intocable. 26,4 u/s × 2 s = 52,8 u.
 * Un sitio de nacer a esa distancia de él es uno al que no llega antes de que acabe la protección.
 * Ver `sitioDeRenacer`.
 */
export const LEJOS_AL_RENACER = por(VELOCIDAD_CORRIENDO, deNumero(INTOCABLE_MS / 1000));

/**
 * EL TOPE DE BOTINES POR MESA Y MINUTO: seis. Sólo cuentan los que ENTRAN.
 *
 * ═══ QUÉ PROTEGE ═══
 *
 * Cada botín que entra es una entrada más del diario —para siempre, mientras viva la mesa—, una
 * escritura del fichero entero de la mesa y un despertar de todos los que sondean, que vuelven a
 * pedir la mesa y la proyectan. La regla de la pareja (`BOTIN_CADA_PAREJA_MS`) ya hace que tumbar al
 * mismo en bucle no renta; pero con seis sentados hay treinta parejas, y sin tope una refriega
 * general serían treinta botines por minuto: treinta reescrituras, treinta vueltas de todos los
 * sondeos, y un diario que crece 1.800 entradas por hora de pelea.
 *
 * ═══ POR QUÉ SEIS ═══
 *
 * Es el número de asientos de la mesa más grande que se recorre (Riberas y El Burgo, de 2 a 6): con
 * él, en un minuto cada uno puede perder de media un botín, que es lo mismo que la regla de la pareja
 * deja entre dos. Con dos jugadores no muerde nunca —dos parejas, dos por minuto—; con seis, deja un
 * botín cada diez segundos, que en el tablero ya es mucho: el Burgo son cien de dinero y Riberas una
 * ficha. El diario de una hora de pelea sin parar crece, como mucho, 360 entradas.
 */
export const TOPE_DE_BOTINES_POR_MINUTO = 6;

/** La ventana del tope. */
export const VENTANA_DEL_TOPE_MS = 60_000;

/**
 * Cuántos sitios guarda el rastro de un asiento, como mucho. Lo normal son los de la ventana de
 * rebobinado —cinco o seis andando a veinte por segundo—; el tope está por el cubo de mensajes, que
 * deja pasar cuarenta de golpe, y porque un rastro sin techo es memoria sin techo.
 */
export const TOPE_DEL_RASTRO = 64;

/* ─── LO QUE SE INYECTA ──────────────────────────────────────────────────── */

/** Un canal abierto, visto desde aquí: por dónde se contesta. Lo pone `enchufe.ts`. */
export interface Enchufe {
  enviar(texto: string): void;
  cerrar(codigo: number, razon: string): void;
  /** Cuántos bytes esperan a salir. */
  pendientes(): number;
  /**
   * OPCIONAL: se llama UNA vez cuando este canal dice `hola` (pasa de `saludo` a `entrando`). Lo usa
   * la capa de cuotas (`cuotas.ts`) para soltar el hueco del tope de «canales sin saludar»: hasta
   * este aviso, el canal cuenta contra ese tope; después, no. Quien no lo pone —una mesa de
   * mentira— no cambia en nada el comportamiento del canal.
   */
  saludo?(): void;
}

export interface Temporizador {
  parar(): void;
}

/** El reloj de pared y sus dos temporizadores. En las pruebas, uno de mentira. */
export interface Reloj {
  ahora(): number;
  cada(ms: number, hacer: () => void): Temporizador;
  dentroDe(ms: number, hacer: () => void): Temporizador;
}

/** Lo que el canal necesita saber de una llave: de qué asiento es, y cómo se juega su mesa. */
export interface AsientoDeLaLlave {
  readonly id: string;
  readonly modalidad: string;
}

/** Lo que el canal necesita de la vista de espectador de una mesa. */
export interface VistaDeLaMesa {
  readonly arcade: string;
  readonly rev: number;
  readonly terminada: boolean;
  /** Los asientos, en el orden en que se sentaron. */
  readonly asientos: readonly string[];
  /** Lo que el juego deja ver a quien mira sin asiento: de aquí sale el mundo. */
  readonly vista: unknown;
}

/**
 * LO QUE FUE DEL BOTÍN, dicho por la mesa: las tres salidas del reductor —entró, sin efecto,
 * rechazado— y las tres de la mesa —terminada, arcade apartado, sin mesa—. Ver `meterDeLaPlataforma`
 * en `arcade/mesas.ts`.
 */
export type SalidaDelBotin = 'entro' | 'sinEfecto' | 'rechazado' | 'terminada' | 'apartado' | 'sinMesa';

export interface LoQueFueDelBotin {
  readonly salida: SalidaDelBotin;
  /** El motivo del juego, si lo rechazó. */
  readonly motivo?: string;
}

/**
 * LO QUE EL CANAL LE PREGUNTA A LA MESA. Las tres primeras son de LECTURA, y `null` quiere decir
 * «esa mesa no existe». Lo real está en `index.ts` (`quienEsLaLlave`, `revisionDe` y `mirar` de
 * `arcade/mesas.ts`, las tres sin llave, como un espectador).
 *
 * La cuarta, `botin`, escribe —y la quinta, `hallazgo`, igual—: la de verdad (`meterElBotinDeVerdad`, de `botin.ts`)
 * la pone `index.ts` en `LA_MESA_DE_VERDAD`, y va a la vía interna de la mesa y avisa a quien sondea.
 * Es opcional para que una prueba que no mira el botín no tenga que escribirla, y sin ella el botín
 * no entra en ninguna mesa (`sinMesa`): este fichero no conoce la mesa de verdad, y así las pruebas
 * en proceso no escriben en ella por la puerta de atrás.
 */
export interface LaMesa {
  quienEsLaLlave(codigo: string, llave: string): Promise<AsientoDeLaLlave | null>;
  revision(codigo: string): Promise<{ readonly rev: number; readonly terminada: boolean } | null>;
  vista(codigo: string): Promise<VistaDeLaMesa | null>;
  botin?(codigo: string, pierde: string, gana: string): Promise<LoQueFueDelBotin>;
  /**
   * La otra que escribe: el hallazgo que alguien ha recogido a pie (`meterElHallazgoDeVerdad`, de
   * `hallazgo.ts`), por la misma vía interna. Opcional por lo mismo que `botin`: sin ella, el
   * hallazgo no entra en ninguna mesa (`sinMesa`), aunque el brote sí se recoge.
   */
  hallazgo?(codigo: string, para: string, clase: string): Promise<LoQueFueDelBotin>;
}

/**
 * De dónde sale el mundo: `sePuedeRecorrer` y `mundoDeLaMesa` de `shared/arcade/juegos/mundos.ts`.
 * Y, del mismo registro, lo que se hace a pie: `hallazgosDelJuego` (qué brota) y `armaEnLaRefriega`
 * (cómo pega cada uno). Las dos son opcionales para que unos mundos de prueba que no las traen sean
 * los de antes: sin tabla no brota nada, y sin armas todos pegan con los puños.
 */
export interface LosMundos {
  sePuedeRecorrer(arcade: string): boolean;
  mundoDeLaMesa(arcade: string, vista: unknown, codigo: string): MundoDeclarado | null;
  hallazgosDelJuego?(arcade: string): readonly ClaseDeHallazgo[];
  armaEnLaRefriega?(arcade: string, vista: unknown, asiento: string): ArmaEnLaRefriega;
}

export interface OpcionesDelCanal {
  readonly reloj: Reloj;
  readonly mesa: LaMesa;
  readonly mundos: LosMundos;
  /** Dónde se escribe lo que pasa. NUNCA recibe una llave. */
  readonly registrar?: (linea: string) => void;
  /**
   * Con qué se cronometra lo que CUESTA derivar un mundo, en milisegundos. Es otro reloj que el de
   * pared a propósito: lo que se mide es trabajo del hilo, y en las pruebas el reloj de pared es de
   * mentira. Por defecto, `performance.now()`.
   */
  readonly cronometro?: () => number;
  /**
   * La semilla del azar de los brotes de cada sala que se abre. Por defecto, una al azar del
   * sistema: el azar de la sala no es el de la mesa ni se reproduce (ver `hallazgos.ts`). Las
   * pruebas la fijan.
   */
  readonly semillaDeLaSala?: (codigo: string) => number;
}

/* ─── LO QUE SE CUENTA ───────────────────────────────────────────────────── */

/** Por qué se cerró un canal: los códigos del contrato, más los que no son de nadie. */
export type PorQueSeCierra = keyof typeof CIERRE | 'apagado' | 'fallo' | 'seFue';

/** Por qué se corrigió a alguien. */
export type PorQueSeCorrige = 'presupuesto' | 'estructura' | 'rescate' | 'repetida';

/** Qué fue de cada botín que pidió una caída, y por qué no se pidió el que no se pidió. */
export type CuentaDelBotin = SalidaDelBotin | 'porPareja' | 'porTope' | 'fallos';

/**
 * Qué fue de cada hallazgo: cuántos se recogieron (los que ENTRARON), qué contestó la mesa a cada
 * uno, cuántas veces un tope dejó uno en el suelo (una por paso aceptado encima de él, así que crece
 * deprisa quien espera encima) y cuántos volvieron a brotar.
 */
export type CuentaDelHallazgo = SalidaDelBotin | 'recogidos' | 'porTopeDeAsiento' | 'porTopeDeMesa' | 'fallos' | 'rebrotes';

/**
 * Por qué una subida se negó en la capa de cuotas (`cuotas.ts`), antes de llegar a ser un canal:
 * los dos topes globales —el total y el más estricto de los que no han saludado— y los dos por
 * procedencia —cuántos a la vez y a qué ritmo—. Se cuenta aquí, con `origenesNegados`, porque el
 * diagnóstico se sirve de `canal.diagnostico()` y así se ve «cuántas se negaron y por qué».
 */
export type MotivoDeCuota = 'global' | 'sinSaludar' | 'concurrencia' | 'ritmo';

/**
 * LO QUE DICE EL DIAGNÓSTICO. Sólo cuentas: ni un código de mesa, ni un asiento, ni una llave.
 * `/api/arcade/diagnostico` se sirve sin credencial.
 */
export interface DiagnosticoDeBotas {
  salas: number;
  canales: number;
  enSala: number;
  temporizador: boolean;
  tics: number;
  /** Cuántas fotos se han SERIALIZADO: una por sala y foto, se mande a cuantos se mande. */
  fotosCompuestas: number;
  /** Cuántas se han MANDADO: una por canal y foto. */
  fotos: number;
  fotosSaltadas: number;
  bytesDeFotos: number;
  /** Lo demás que se le saltó a un canal atascado: `corrige`, `lanza` y el `fuera` de quien se cierra. */
  saltados: number;
  aceptados: number;
  porEscuadra: number;
  ignorados: number;
  ignoradosTrasCorregir: number;
  correcciones: Record<PorQueSeCorrige, number>;
  /** Golpes aceptados: cada uno, un `lanza`. */
  golpes: number;
  /** Golpes ignorados: de un caído, en recarga, o con un tic que no crece. */
  golpesIgnorados: number;
  /** Golpes que dieron a alguien: cada uno, un `da`. */
  aciertos: number;
  caidas: number;
  renacidas: number;
  botines: Record<CuentaDelBotin, number>;
  hallazgos: Record<CuentaDelHallazgo, number>;
  /** Cuántos brotes hay vivos ahora en todas las salas. */
  brotesVivos: number;
  /** Cuántos sitios guardan ahora los rastros de todas las salas: la memoria del rebobinado. */
  sitiosEnLosRastros: number;
  rederivaciones: number;
  fallosAlRederivar: number;
  /** Cuántas salas esperan su turno para volver a derivar el mundo. */
  colaParaDerivar: number;
  /** Cuánto trabajo del hilo se ha ido en derivar mundos (al abrir salas y al volver a derivar), en ms. */
  msDerivando: number;
  entradas: number;
  origenesNegados: number;
  /** Subidas negadas en la capa de cuotas, por motivo (ver `MotivoDeCuota` y `cuotas.ts`). */
  cuotasNegadas: Record<MotivoDeCuota, number>;
  cierres: Record<PorQueSeCierra, number>;
}

/** Todas las cuentas a cero: lo que dice un canal recién hecho, o uno que no se ha montado. */
export function cuentasVacias(): DiagnosticoDeBotas {
  return {
    salas: 0,
    canales: 0,
    enSala: 0,
    temporizador: false,
    tics: 0,
    fotosCompuestas: 0,
    fotos: 0,
    fotosSaltadas: 0,
    bytesDeFotos: 0,
    saltados: 0,
    aceptados: 0,
    porEscuadra: 0,
    ignorados: 0,
    ignoradosTrasCorregir: 0,
    correcciones: { presupuesto: 0, estructura: 0, rescate: 0, repetida: 0 },
    golpes: 0,
    golpesIgnorados: 0,
    aciertos: 0,
    caidas: 0,
    renacidas: 0,
    botines: {
      entro: 0,
      sinEfecto: 0,
      rechazado: 0,
      terminada: 0,
      apartado: 0,
      sinMesa: 0,
      porPareja: 0,
      porTope: 0,
      fallos: 0,
    },
    hallazgos: {
      recogidos: 0,
      entro: 0,
      sinEfecto: 0,
      rechazado: 0,
      terminada: 0,
      apartado: 0,
      sinMesa: 0,
      porTopeDeAsiento: 0,
      porTopeDeMesa: 0,
      fallos: 0,
      rebrotes: 0,
    },
    brotesVivos: 0,
    sitiosEnLosRastros: 0,
    rederivaciones: 0,
    fallosAlRederivar: 0,
    colaParaDerivar: 0,
    msDerivando: 0,
    entradas: 0,
    origenesNegados: 0,
    cuotasNegadas: { global: 0, sinSaludar: 0, concurrencia: 0, ritmo: 0 },
    cierres: {
      sinHola: 0,
      llaveMala: 0,
      mesaQueNo: 0,
      reemplazado: 0,
      quieto: 0,
      atropello: 0,
      mesaCerrada: 0,
      versionVieja: 0,
      atascado: 0,
      apagado: 0,
      fallo: 0,
      seFue: 0,
    },
  };
}

/** Los códigos de cierre de lo que no es del contrato: los estándar de WebSocket. */
const CIERRE_APAGADO = 1001;
const CIERRE_FALLO = 1011;

/* ─── LA ESTRUCTURA: RECTA, O ESCUADRA DE UN TIC ─────────────────────────── */

/**
 * ¿SE PUEDE ANDAR ESTE TRAMO? La recta de `mundo.ts`, y una tolerancia.
 *
 * ═══ LA TOLERANCIA, Y POR QUÉ ESTÁ MEDIDA Y NO PUESTA A OJO ═══
 *
 * El paso del aparato (`unPaso`, que llama `pasoDelTic`) mira sólo el sitio de LLEGADA de cada
 * tic. La recta mira el camino a trozos de un radio. Casi siempre es lo mismo; cuando un paso en
 * diagonal pasa rozando la esquina de una caja, no: la llegada está libre, el paso es legal para el
 * aparato, y la recta muerde la esquina. Medido con 720.000 pasos de `pasoDelTic` al azar en tres
 * Lindes llenas y tres Burgos: la recta sola rechaza el 0,08-0,14 % de los pasos que se mueven —una
 * corrección cada 35-60 segundos de paseo, siempre en diagonal, siempre en una esquina—. Con la
 * escuadra de reserva quedan 2 de 720.000.
 *
 * La escuadra sólo vale para tramos de UN TIC (con su holgura): es lo que un paso del aparato
 * puede recortar de una esquina, y nada más. Cada lado de la escuadra se mira con la misma recta,
 * a trozos de un radio, así que por una escuadra no se atraviesa nada: se rodea una esquina. Lo
 * que se gana con ella haciendo trampas es, como mucho, un 41 % más de camino en un tic junto a
 * una esquina.
 *
 * Lo que de verdad quitaría la tolerancia es que el paso del aparato no dé nunca un paso cuya
 * recta no esté libre. Eso es de `shared/mecanicas/mundo.ts` y no de aquí.
 */
export function seAndaElTramo(arena: Arena, desde: Andante, hasta: Andante, radio: number): 'recta' | 'escuadra' | null {
  if (seAndaEnRecta(arena, desde, hasta, radio)) return 'recta';
  const dx = hasta.x - desde.x;
  const dz = hasta.z - desde.z;
  if (dx === 0 || dz === 0) return null;
  if (Math.hypot(dx, dz) > UN_TIC_CON_HOLGURA) return null;
  const primeroX = { x: hasta.x, z: desde.z };
  if (seAndaEnRecta(arena, desde, primeroX, radio) && seAndaEnRecta(arena, primeroX, hasta, radio)) return 'escuadra';
  const primeroZ = { x: desde.x, z: hasta.z };
  if (seAndaEnRecta(arena, desde, primeroZ, radio) && seAndaEnRecta(arena, primeroZ, hasta, radio)) return 'escuadra';
  return null;
}

/* ─── EL CONO Y EL RASTRO ────────────────────────────────────────────────── */

/**
 * ¿CAE `(dx, dz)` DENTRO DEL CONO DE LA MIRADA `(mx, mz)`? Todo en Q16.16.
 *
 * `(d·m)² ≥ c²·|d|²·|m|²` con `d·m ≥ 0`, que es lo que el contrato da hecho para no sacar raíces
 * (`COSENO_CUADRADO_DEL_CONO`). La mirada sale de las tablas literales de `andar.ts` —`SENO[r]` y
 * `−COSENO[r]`, el convenio de los rumbos—, así que `|m|²` no es exactamente 2³²: se usa el que es.
 * Y en ENTEROS GRANDES: con el alcance de 2,5 u los productos llegan a 2⁶⁹, y un doble los
 * redondearía justo en el borde del cono, que es donde importa.
 *
 * En el mismo sitio (`d` nulo) da: los paseantes no chocan entre sí, y quien está encima de otro
 * está a su alcance lo mire como lo mire.
 */
export function enElCono(dx: number, dz: number, mx: number, mz: number, cono: bigint = CONO_EN_FIJO): boolean {
  const gx = BigInt(dx);
  const gz = BigInt(dz);
  const hx = BigInt(mx);
  const hz = BigInt(mz);
  const dm = gx * hx + gz * hz;
  if (dm < 0n) return false;
  return dm * dm * UNO_GRANDE >= cono * (gx * gx + gz * gz) * (hx * hx + hz * hz);
}

/**
 * APUNTA UN SITIO EN EL RASTRO de un asiento: `[t, x, z, t, x, z, …]`, del más viejo al más nuevo.
 *
 * Se queda lo de la ventana de rebobinado y el ÚLTIMO de antes de ella —con eso se sabe dónde estaba
 * en cualquier instante de la ventana—, y nunca más de `TOPE_DEL_RASTRO`. Números sueltos en una
 * lista y no objetos: es lo que más se escribe del canal, veinte veces por segundo por asiento.
 */
function apuntarEnElRastro(rastro: number[], t: number, x: number, z: number): void {
  rastro.push(t, x, z);
  const desde = t - REBOBINADO_MS;
  let quitar = 0;
  while (quitar + 3 < rastro.length && (rastro[quitar + 3] as number) <= desde) quitar += 3;
  if (rastro.length - quitar > TOPE_DEL_RASTRO * 3) quitar = rastro.length - TOPE_DEL_RASTRO * 3;
  if (quitar > 0) rastro.splice(0, quitar);
}

/**
 * DÓNDE ESTABA, SEGÚN SU RASTRO, EN EL INSTANTE `t`: el último sitio aceptado que no es posterior.
 * Es lo que el servidor creía en ese momento, y lo que salía en sus fotos. Si todo el rastro es
 * posterior —apareció después—, el primero que hay.
 */
function sitioEnElRastro(rastro: readonly number[], t: number, ahora: Andante): Andante {
  for (let i = rastro.length - 3; i >= 0; i -= 3) {
    if ((rastro[i] as number) <= t) return { x: rastro[i + 1] as number, z: rastro[i + 2] as number };
  }
  if (rastro.length >= 3) return { x: rastro[1] as number, z: rastro[2] as number };
  return ahora;
}

/* ─── LO QUE VIVE EN MEMORIA ─────────────────────────────────────────────── */

type Estado = 'saludo' | 'entrando' | 'dentro' | 'cerrada';

/** Un asiento de la mesa, dentro de la sala. Vive lo que viva la sala, tenga canal o no. */
interface Ocupante {
  readonly id: string;
  /** El último sitio BUENO, en Q16.16: el aceptado, el de nacer, el del rescate o el de renacer. */
  x: number;
  z: number;
  /** Hacia dónde MIRA (0 a 255), tal cual lo dijo su último `aqui` o su último golpe. No se valida. */
  r: number;
  m: Marcha;
  conexion: Conexion | null;
  presupuesto: number;
  recargadoEn: number;
  /** Lo que le queda de vida, de `VIDA_ENTERA` a cero. */
  vida: number;
  /** Cuándo cayó; `null` si no está en el suelo. */
  caidoEn: number | null;
  /** Quién lo tumbó la última vez: para renacer lejos de él. */
  tumbadoPor: string | null;
  /** Cuándo renació por última vez: intocable `INTOCABLE_MS` desde aquí. */
  renacidoEn: number | null;
  /** Su último golpe ACEPTADO: la recarga cuenta desde aquí, y sólo desde aquí. */
  golpeadoEn: number | null;
  /** Dónde ha estado, para rebobinarle. Ver `apuntarEnElRastro`. */
  readonly rastro: number[];
}

/** La sala de una mesa: su mundo y sus asientos. Vive mientras alguien tenga canal, y la gracia después. */
interface Sala {
  readonly codigo: string;
  readonly arcade: string;
  arena: Arena;
  rev: number;
  asientos: readonly string[];
  readonly ocupantes: Map<string, Ocupante>;
  /** Los tics de ESTA sala, desde que se abrió. Es la `k` de sus fotos. */
  k: number;
  revisando: boolean;
  revisadaEn: number;
  /** Si está en la cola para volver a derivar su mundo. Una vez como mucho. */
  enCola: boolean;
  cerrada: boolean;
  /** Desde cuándo no tiene a nadie con canal; `null` mientras alguien lo tiene. */
  vaciaDesde: number | null;
  /** La vista pública de la revisión `rev`: de aquí sale el arma de cada uno. */
  vista: unknown;
  /** El golpe de cada asiento, leído de `vista` la primera vez que golpea. Se vacía al cambiar la vista. */
  readonly golpes: Map<string, GolpeDelArma>;
  /** Lo que hay brotado; `null` si el juego no tiene tabla de hallazgos. */
  readonly brotes: BrotesDeLaSala | null;
  /** Los rebrotes programados: cada uno es un brote recogido que volverá a los `REBROTE_MS`. */
  readonly rebrotes: Set<Temporizador>;
}

/**
 * EL LIBRO DE HALLAZGOS DE UNA MESA: cuándo ENTRÓ cada uno, por asiento y en total, en el último
 * minuto, y quién tiene uno de camino. Vive en el canal y no en la sala, por lo mismo que el de
 * botines: vaciar la sala no puede devolver el cupo.
 *
 * Como el botín, sólo cuenta lo que ENTRA en la mesa, y lo que va de camino se reserva para el tope de
 * la mesa (`enCamino`, uno por persona como mucho). Un hallazgo que la mesa no quiere —el dinero en
 * vilo del Burgo, quien ha quebrado— no gasta nada y el brote se queda en el suelo; a quien lo intentó
 * se le hace esperar un poco (`esperaHasta`) para no preguntar a la mesa veinte veces por segundo.
 */
interface LibroDeHallazgos {
  readonly porAsiento: Map<string, number[]>;
  readonly mesa: number[];
  /** Los asientos con un hallazgo de camino a la mesa. */
  readonly enCamino: Set<string>;
  /** Hasta cuándo no puede volver a intentarlo quien recibió una negativa de la mesa. */
  readonly esperaHasta: Map<string, number>;
}

/**
 * CUÁNTO ESPERA QUIEN RECIBIÓ UNA NEGATIVA antes de que se le vuelva a pedir a la mesa por él: dos
 * segundos. Una subasta del Burgo se resuelve en ese orden de tiempo, y parado encima de un brote se
 * aceptan veinte pasos por segundo: sin esto, cuarenta preguntas a la mesa por cada negativa.
 */
export const ESPERA_TRAS_NEGATIVA_MS = 2000;

/** Una mesa que no se puede recorrer ahora, y cómo se le dice a quien llama. */
interface Negativa {
  readonly clave: PorQueSeCierra;
  readonly motivo: string;
}

function esSala(v: Sala | Negativa): v is Sala {
  return (v as Sala).ocupantes !== undefined;
}

/** Lo pendiente de una corrección: dónde se le dijo que estaba, y cuándo. */
interface Pendiente {
  readonly x: number;
  readonly z: number;
  desde: number;
}

/**
 * EL LIBRO DE BOTINES DE UNA MESA: lo que la protege del bucle y de la pelea general. Vive en el
 * canal y no en la sala, a propósito: si viviera en la sala, bastaría con que se vaciara —cinco
 * segundos sin nadie con canal— para que la misma pareja volviera a cobrar al minuto de haber cobrado,
 * y a quien no ha bajado se le podría vaciar el bolsillo saliendo y entrando.
 */
interface LibroDeBotines {
  /** Cuándo ENTRÓ el último botín de cada pareja, por `pierde` y `gana`. */
  readonly parejas: Map<string, number>;
  /** Cuándo entró cada botín de esta mesa en la ventana del tope, del más viejo al más nuevo. */
  readonly entrados: number[];
  /** Las parejas cuyo botín está de camino a la mesa: cuentan para el tope y no se repiten. */
  readonly enCamino: Set<string>;
}

/** Qué se hace con un mensaje si el canal de quien lo recibe está atascado. Ver la cabecera. */
type SiSeAtasca = 'saltar' | 'cerrar';

/**
 * UN CANAL ABIERTO. Lo crea `CanalDeBotas.abrir` y le llegan los mensajes por `recibir`; cuando
 * el otro lado cierra, `seCerro`.
 */
export class Conexion {
  estado: Estado = 'saludo';
  sala: Sala | null = null;
  ocupante: Ocupante | null = null;
  plazo: Temporizador | null = null;
  ultimoN = 0;
  /** El tic del último golpe: crece como el de los pasos, y por separado —un golpe va en el tic de un paso—. */
  ultimoGolpe = 0;
  movidoEn = 0;
  pendiente: Pendiente | null = null;
  malos = 0;
  cubo: number = MENSAJES_DE_GOLPE;
  cuboEn: number;

  constructor(
    private readonly canal: CanalDeBotas,
    readonly codigo: string,
    readonly enchufe: Enchufe,
    ahora: number,
  ) {
    this.cuboEn = ahora;
  }

  /*
   * Las dos puertas de entrada las llaman los eventos del WebSocket, y una excepción que se
   * escapara de un evento llegaría a `uncaughtException`, que en `index.ts` TERMINA EL PROCESO:
   * un mensaje raro de un aparato tiraría el servidor de todos. Por eso aquí se recoge todo y, si
   * algo revienta, se cierra ESTE canal y se sigue.
   */

  /** Llega un mensaje de texto. `null` si no era texto (un marco binario). */
  recibir(texto: string | null): void {
    try {
      this.canal.recibir(this, texto);
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

export class CanalDeBotas {
  private readonly reloj: Reloj;
  private readonly mesa: LaMesa;
  private readonly mundos: LosMundos;
  private readonly registrar: (linea: string) => void;
  private readonly meterElBotin: (codigo: string, pierde: string, gana: string) => Promise<LoQueFueDelBotin>;
  private readonly salas = new Map<string, Sala>();
  private readonly creando = new Map<string, Promise<Sala | Negativa>>();
  private readonly conexiones = new Set<Conexion>();
  /** Los libros de botines, por mesa. Ver `LibroDeBotines`. */
  private readonly libros = new Map<string, LibroDeBotines>();
  /** Los libros de hallazgos, por mesa. Ver `LibroDeHallazgos`. */
  private readonly librosDeHallazgos = new Map<string, LibroDeHallazgos>();
  private readonly meterElHallazgo: (codigo: string, para: string, clase: string) => Promise<LoQueFueDelBotin>;
  private readonly semillaDeLaSala: (codigo: string) => number;
  private temporizador: Temporizador | null = null;
  private apagado = false;
  private readonly cuentas = cuentasVacias();
  private readonly cronometro: () => number;
  /** Quienes esperan turno para derivar, por prioridad y luego por llegada. Ver `PARTE_PARA_DERIVAR`. */
  private readonly esperandoTurno: { readonly prioridad: number; readonly seguir: () => void }[] = [];
  /** Si alguien tiene el turno: de uno en uno. */
  private enTurno = false;
  /** El temporizador que espera a que se pueda dar el siguiente turno. */
  private esperaDelTurno: Temporizador | null = null;
  /** Antes de esta hora de pared no empieza la siguiente derivación. */
  private derivarDesde = 0;

  constructor(opciones: OpcionesDelCanal) {
    this.reloj = opciones.reloj;
    this.mesa = opciones.mesa;
    this.mundos = opciones.mundos;
    this.registrar = opciones.registrar ?? ((linea) => console.log(`[botas] ${linea}`));
    this.cronometro = opciones.cronometro ?? (() => performance.now());
    const botin = opciones.mesa.botin;
    this.meterElBotin = botin === undefined ? async () => ({ salida: 'sinMesa' }) : botin.bind(opciones.mesa);
    const hallazgo = opciones.mesa.hallazgo;
    this.meterElHallazgo = hallazgo === undefined ? async () => ({ salida: 'sinMesa' }) : hallazgo.bind(opciones.mesa);
    this.semillaDeLaSala = opciones.semillaDeLaSala ?? (() => randomInt(0, 0x1_0000_0000));
  }

  /* ── Entrar ──────────────────────────────────────────────────────────── */

  /** Un canal nuevo para la mesa `codigo`. Tiene `PLAZO_DEL_HOLA_MS` para decir `hola`. */
  abrir(codigo: string, enchufe: Enchufe): Conexion {
    const c = new Conexion(this, codigo, enchufe, this.reloj.ahora());
    this.conexiones.add(c);
    if (this.apagado) {
      this.echar(c, 'apagado', 'El servidor se está reiniciando: vuelve a entrar en unos segundos.');
      return c;
    }
    c.plazo = this.reloj.dentroDe(PLAZO_DEL_HOLA_MS, () => {
      if (c.estado === 'saludo') this.echar(c, 'sinHola', 'No se ha presentado a tiempo.');
    });
    return c;
  }

  /** Lo que llega por un canal. Ver la cabecera para el orden de la validación. */
  recibir(c: Conexion, texto: string | null): void {
    if (c.estado === 'cerrada') return;
    const ahora = this.reloj.ahora();

    /* El cubo, antes de leer nada: cuenta todo lo que llega, bien o mal escrito. */
    c.cubo = Math.min(MENSAJES_DE_GOLPE, c.cubo + ((ahora - c.cuboEn) * MENSAJES_POR_SEGUNDO) / 1000);
    c.cuboEn = ahora;
    if (c.cubo < 1) {
      this.echar(c, 'atropello', 'Demasiados mensajes seguidos.');
      return;
    }
    c.cubo -= 1;

    const m = texto === null ? null : leerMensajeDelAparato(texto);

    if (c.estado === 'saludo') {
      if (m === null || m.t !== 'hola') {
        this.echar(c, 'sinHola', 'Lo primero tenía que ser el saludo.');
        return;
      }
      if (m.v !== VERSION_DEL_CANAL) {
        /*
         * Con su código y no con `sinHola`: al aparato viejo le dice que actualice, en vez de
         * dejarle reintentando para siempre un saludo que sí se oyó.
         */
        this.echar(
          c,
          'versionVieja',
          `Este aparato habla la versión ${String(m.v)} del canal y el servidor la ${String(VERSION_DEL_CANAL)}: hay que actualizar.`,
        );
        return;
      }
      c.plazo?.parar();
      c.plazo = null;
      c.estado = 'entrando';
      /* Ya ha saludado: la capa de cuotas suelta su hueco del tope de «canales sin saludar». */
      c.enchufe.saludo?.();
      void this.entrar(c, m.llave);
      return;
    }

    if (m === null || m.t === 'hola') {
      c.malos++;
      if (c.malos > MAL_FORMADOS_TOLERADOS) this.echar(c, 'atropello', 'Demasiados mensajes mal formados.');
      return;
    }

    if (c.estado === 'entrando') {
      /* Un paso antes de `dentro` no sale de ningún sitio que el servidor haya dicho. */
      this.cuentas.ignorados++;
      return;
    }

    /* POR TIPO, y sólo el paso va a validarse: ver la cabecera. */
    switch (m.t) {
      case 'aqui':
        this.validar(c, m, ahora);
        return;
      case 'golpe':
        this.golpear(c, m, ahora);
        return;
      default:
        this.cuentas.ignorados++;
        return;
    }
  }

  /** El otro lado cerró. Si ya lo había cerrado el servidor, no hay nada más que hacer. */
  seCerro(c: Conexion): void {
    if (c.estado === 'cerrada') return;
    c.estado = 'cerrada';
    c.plazo?.parar();
    c.plazo = null;
    this.soltar(c, false);
    this.conexiones.delete(c);
    this.cuentas.cierres.seFue++;
  }

  private async entrar(c: Conexion, llave: string): Promise<void> {
    try {
      const asiento = await this.mesa.quienEsLaLlave(c.codigo, llave);
      if (c.estado !== 'entrando') return;
      if (asiento === null) {
        this.echar(c, 'llaveMala', 'Esa llave no es de ningún asiento de esta mesa.');
        return;
      }
      if (asiento.modalidad !== 'botas') {
        this.echar(c, 'mesaQueNo', 'Esta mesa se juega desde arriba: no es de Boots on Board.');
        return;
      }
      const sala = await this.salaDe(c.codigo);
      if (c.estado !== 'entrando') return;
      if (!esSala(sala)) {
        this.echar(c, sala.clave, sala.motivo);
        return;
      }
      this.sentar(c, sala, asiento.id);
    } catch (error) {
      this.registrar(`no se ha podido entrar en la mesa ${c.codigo}: ${error instanceof Error ? error.message : String(error)}`);
      this.echar(c, 'fallo', 'El servidor no ha podido preparar el tablero. Vuelve a intentarlo.');
    }
  }

  /** La sala de una mesa: la que hay, o una nueva con su mundo derivado. Una sola por mesa. */
  private salaDe(codigo: string): Promise<Sala | Negativa> {
    const hay = this.salas.get(codigo);
    if (hay !== undefined) return Promise.resolve(hay);
    const enCamino = this.creando.get(codigo);
    if (enCamino !== undefined) return enCamino;
    const nueva = this.crearSala(codigo).finally(() => this.creando.delete(codigo));
    this.creando.set(codigo, nueva);
    return nueva;
  }

  private async crearSala(codigo: string): Promise<Sala | Negativa> {
    const v = await this.mesa.vista(codigo);
    if (v === null) return { clave: 'mesaQueNo', motivo: 'Esa mesa ya no existe.' };
    if (v.terminada) return { clave: 'mesaCerrada', motivo: 'La partida ya se ha acabado.' };
    if (!this.mundos.sePuedeRecorrer(v.arcade)) {
      return { clave: 'mesaQueNo', motivo: 'Este juego no se puede recorrer en este servidor.' };
    }
    /* Abrir también pide turno para derivar, pero va delante de volver a derivar: ver `PARTE_PARA_DERIVAR`. */
    await this.pedirTurno(PARA_ABRIR);
    let arena: Arena | null;
    try {
      arena = this.derivarElMundo(v.arcade, v.vista, codigo);
    } finally {
      this.soltarTurno();
    }
    if (arena === null) {
      return { clave: 'mesaQueNo', motivo: 'Todavía no hay tablero que recorrer: la partida no ha empezado.' };
    }
    const ahora = this.reloj.ahora();
    const sala: Sala = {
      codigo,
      arcade: v.arcade,
      arena,
      rev: v.rev,
      asientos: v.asientos,
      ocupantes: new Map(),
      k: 0,
      revisando: false,
      revisadaEn: ahora,
      enCola: false,
      cerrada: false,
      vaciaDesde: ahora,
      vista: v.vista,
      golpes: new Map(),
      brotes: this.brotesNuevos(codigo, v.arcade),
      rebrotes: new Set(),
    };
    /* TODOS los sentados, de pie en su sitio de nacer, y en el orden de la mesa: ver la cabecera. */
    for (const id of v.asientos) this.ponerEnLaSala(sala, id, ahora);
    /* Y lo que brota, ya con todos de pie: nada nace encima de nadie. Todavía no hay a quién decírselo. */
    if (sala.brotes !== null) {
      sala.brotes.ponerLaArena(arena, this.hayAlguienCerca(sala));
      sala.brotes.rellenar(this.brotesQueTocan(sala), this.hayAlguienCerca(sala));
    }
    this.salas.set(codigo, sala);
    this.encenderElReloj();
    this.registrar(`se abre la sala de la mesa ${codigo} (${v.arcade})`);
    return sala;
  }

  /**
   * PONE UN ASIENTO EN LA SALA, de pie en su sitio de nacer y sin canal: como están todos al
   * abrirse, y como está quien se sentó después de la última vez que se miró la mesa.
   */
  private ponerEnLaSala(sala: Sala, id: string, ahora: number): Ocupante {
    const turno = sala.asientos.indexOf(id);
    const nace = dondeSeNace(sala.arena, turno >= 0 ? turno : sala.ocupantes.size, (x, z) => this.hayOtro(sala, null, x, z));
    const o: Ocupante = {
      id,
      x: nace.x,
      z: nace.z,
      r: nace.r,
      m: 0,
      conexion: null,
      presupuesto: TOPE_DEL_PRESUPUESTO,
      recargadoEn: ahora,
      vida: VIDA_ENTERA,
      caidoEn: null,
      tumbadoPor: null,
      renacidoEn: null,
      golpeadoEn: null,
      rastro: [ahora, nace.x, nace.z],
    };
    sala.ocupantes.set(id, o);
    return o;
  }

  /** Pone a este canal en su asiento de la sala y le dice dónde está y cómo están todos. */
  private sentar(c: Conexion, sala: Sala, id: string): void {
    const ahora = this.reloj.ahora();
    if (sala.cerrada) {
      this.echar(c, 'mesaCerrada', 'La partida ya se ha acabado.');
      return;
    }
    /* Pudo vaciarse y borrarse entre medias: se vuelve a poner, que es la misma. */
    if (this.salas.get(sala.codigo) !== sala) {
      this.salas.set(sala.codigo, sala);
      this.encenderElReloj();
    }

    let o = sala.ocupantes.get(id);
    if (o?.conexion) {
      this.echar(o.conexion, 'reemplazado', 'Se ha abierto otro canal con este asiento: sigue en el nuevo.');
    }
    if (o === undefined) o = this.ponerEnLaSala(sala, id, ahora);
    /*
     * Quien vuelve, vuelve DONDE ESTABA —su asiento no ha salido de la sala— y con la vida que
     * tenga, y ese sitio es bueno en el mundo de AHORA: si el mundo cambió mientras no estaba,
     * `rescatar` ya le sacó, porque recorre a todos los de la sala —con canal o sin él— cada vez que
     * se vuelve a derivar.
     */

    o.conexion = c;
    sala.vaciaDesde = null;
    c.estado = 'dentro';
    c.sala = sala;
    c.ocupante = o;
    c.ultimoN = 0;
    c.ultimoGolpe = 0;
    c.movidoEn = ahora;
    c.pendiente = { x: o.x, z: o.z, desde: ahora };
    this.cuentas.entradas++;
    const dentro: Dentro = { t: 'dentro', yo: id, x: o.x, z: o.z, r: o.r, hz: TICS_POR_SEGUNDO };
    this.mandar(c, JSON.stringify(dentro), 'cerrar');
    this.mandar(c, JSON.stringify(this.vidasDe(sala, ahora)), 'cerrar');
    /* Lo que hay brotado, justo después de `vidas`: la lista entera, la misma cadena que ven los demás. */
    if (sala.brotes?.hayTabla === true) this.mandar(c, sala.brotes.texto(), 'cerrar');
  }

  /* ── Andar ───────────────────────────────────────────────────────────── */

  private validar(c: Conexion, m: Aqui, ahora: number): void {
    const o = c.ocupante;
    const sala = c.sala;
    if (o === null || sala === null) return;

    if (o.caidoEn !== null) {
      this.cuentas.ignorados++;
      return;
    }

    if (m.n <= c.ultimoN) {
      this.cuentas.ignorados++;
      return;
    }
    c.ultimoN = m.n;

    if (c.pendiente !== null) {
      const cerca = Math.hypot(m.x - c.pendiente.x, m.z - c.pendiente.z) <= UN_TIC_CON_HOLGURA;
      if (!cerca) {
        if (ahora - c.pendiente.desde < RECORDAR_LA_CORRECCION_MS) {
          this.cuentas.ignoradosTrasCorregir++;
          return;
        }
        this.corregir(c, m.n, 'repetida', ahora);
        return;
      }
    }

    o.presupuesto = Math.min(TOPE_DEL_PRESUPUESTO, o.presupuesto + (ahora - o.recargadoEn) * PRESUPUESTO_POR_MS);
    o.recargadoEn = ahora;

    const d = Math.hypot(m.x - o.x, m.z - o.z);
    if (d > 0) {
      if (d > o.presupuesto) {
        this.corregir(c, m.n, 'presupuesto', ahora);
        return;
      }
      const como = seAndaElTramo(sala.arena, o, m, RADIO_DEL_PASEANTE);
      if (como === null) {
        this.corregir(c, m.n, 'estructura', ahora);
        return;
      }
      if (como === 'escuadra') this.cuentas.porEscuadra++;
      o.presupuesto -= d;
      this.moverA(o, m.x, m.z, ahora);
      c.movidoEn = ahora;
    }
    o.r = m.r;
    o.m = m.m;
    c.pendiente = null;
    this.cuentas.aceptados++;
    this.recoger(sala, o, ahora);
  }

  private corregir(c: Conexion, n: number, porque: PorQueSeCorrige, ahora: number): void {
    const o = c.ocupante;
    if (o === null) return;
    const corrige: Corrige = { t: 'corrige', n, x: o.x, z: o.z };
    /* Se puede saltar: la corrección queda PENDIENTE igual, y si insiste desde el sitio malo, se repite. */
    this.mandar(c, JSON.stringify(corrige), 'saltar');
    c.pendiente = { x: o.x, z: o.z, desde: ahora };
    this.cuentas.correcciones[porque]++;
  }

  /** El sitio bueno de alguien pasa a ser éste, y queda en su rastro. */
  private moverA(o: Ocupante, x: number, z: number, ahora: number): void {
    o.x = x;
    o.z = z;
    apuntarEnElRastro(o.rastro, ahora, x, z);
  }

  /** ¿Hay alguien de esta sala —que no sea `excepto`— a menos de `SEPARACION_AL_NACER` de este punto? */
  private hayOtro(sala: Sala, excepto: Ocupante | null, x: number, z: number): boolean {
    for (const o of sala.ocupantes.values()) {
      if (o === excepto) continue;
      if (Math.abs(o.x - x) < SEPARACION_AL_NACER && Math.abs(o.z - z) < SEPARACION_AL_NACER) return true;
    }
    return false;
  }

  /** Adónde se saca a quien el mundo ha dejado dentro de una caja o sin suelo. */
  private sitioDeRescate(sala: Sala, o: Ocupante): Andante {
    const libre = sitioDondeCabe(sala.arena, o.x, o.z, RADIO_DEL_PASEANTE);
    if (libre !== null) return libre;
    /* Nada a 38 unidades: a un sitio de nacer, como si entrara. */
    const turno = sala.asientos.indexOf(o.id);
    return dondeSeNace(sala.arena, turno >= 0 ? turno : 0, (x, z) => this.hayOtro(sala, o, x, z));
  }

  /* ── La refriega ─────────────────────────────────────────────────────── */

  /** Cómo está alguien ahora: caído hasta que renace, e intocable `INTOCABLE_MS` después. */
  private estadoDe(o: Ocupante, ahora: number): EstadoEnLaRefriega {
    if (o.caidoEn !== null) return CAIDO;
    if (o.renacidoEn !== null && ahora - o.renacidoEn < INTOCABLE_MS) return INTOCABLE;
    return DE_PIE;
  }

  /** Cómo está cada uno de la sala: lo que recibe quien entra. */
  private vidasDe(sala: Sala, ahora: number): Vidas {
    const v: [string, number, EstadoEnLaRefriega][] = [];
    for (const o of sala.ocupantes.values()) v.push([o.id, o.vida, this.estadoDe(o, ahora)]);
    return { t: 'vidas', v };
  }

  /** UN GOLPE. Ver «La refriega, en una pantalla», en la cabecera. */
  private golpear(c: Conexion, m: Golpe, ahora: number): void {
    const o = c.ocupante;
    const sala = c.sala;
    if (o === null || sala === null) return;
    if (m.n <= c.ultimoGolpe) {
      this.cuentas.golpesIgnorados++;
      return;
    }
    c.ultimoGolpe = m.n;
    if (o.caidoEn !== null || (o.golpeadoEn !== null && ahora - o.golpeadoEn < RECARGA_DEL_GOLPE_MS)) {
      this.cuentas.golpesIgnorados++;
      return;
    }
    o.golpeadoEn = ahora;
    o.r = m.r;
    this.cuentas.golpes++;
    const lanza: Lanza = { t: 'lanza', de: o.id };
    this.repartir(sala, JSON.stringify(lanza), 'saltar');

    const arma = this.golpeDe(sala, o.id);
    const blanco = this.aQuienDa(sala, o, m.r, ahora, arma);
    if (blanco === null) return;
    blanco.vida = Math.max(0, blanco.vida - arma.dano);
    this.cuentas.aciertos++;
    const da: Da = { t: 'da', de: o.id, a: blanco.id, vida: blanco.vida };
    this.repartir(sala, JSON.stringify(da), 'cerrar');
    if (blanco.vida === 0) this.tumbar(sala, blanco, o, ahora);
  }

  /**
   * A QUIÉN LE DA UN GOLPE de `quien` hacia `r`, o `null`. Los demás DE PIE ahora, cada uno donde
   * estaba `REBOBINADO_MS` antes según su rastro; al alcance del ARMA de quien golpea o menos —en su
   * sitio aceptado—, dentro del cono de esa arma y sin muro en medio. El más cercano, uno solo; a
   * igual distancia, el que se sentó antes. El muro se mira el último y sólo hasta el primero que
   * pasa: es lo único caro. Con los puños, el alcance es `ALCANCE_DEL_GOLPE` y el cono el de siempre.
   */
  private aQuienDa(sala: Sala, quien: Ocupante, r: number, ahora: number, arma: GolpeDelArma): Ocupante | null {
    const alcance = arma.alcance;
    const cuando = ahora - REBOBINADO_MS;
    const mx = SENO[r] as number;
    const mz = -(COSENO[r] as number);
    const candidatos: { o: Ocupante; sitio: Andante; d2: number; orden: number }[] = [];
    let orden = 0;
    for (const otro of sala.ocupantes.values()) {
      orden++;
      if (otro === quien || this.estadoDe(otro, ahora) !== DE_PIE) continue;
      const sitio = sitioEnElRastro(otro.rastro, cuando, otro);
      const dx = sitio.x - quien.x;
      const dz = sitio.z - quien.z;
      if (dx > alcance || dx < -alcance || dz > alcance || dz < -alcance) continue;
      const d2 = dx * dx + dz * dz;
      if (d2 > arma.alcanceAlCuadrado ||!enElCono(dx, dz, mx, mz, arma.cono)) continue;
      candidatos.push({ o: otro, sitio, d2, orden });
    }
    candidatos.sort((a, b) => a.d2 - b.d2 || a.orden - b.orden);
    for (const k of candidatos) {
      if (seAndaEnRecta(sala.arena, quien, k.sitio, RADIO_DEL_LANZAMIENTO)) return k.o;
    }
    return null;
  }

  /** SE CAE: al suelo donde está, `cae` a la sala, y se pide el botín. */
  private tumbar(sala: Sala, victima: Ocupante, verdugo: Ocupante, ahora: number): void {
    victima.caidoEn = ahora;
    victima.tumbadoPor = verdugo.id;
    victima.m = 0;
    this.cuentas.caidas++;
    const cae: Cae = { t: 'cae', a: victima.id, por: verdugo.id };
    this.repartir(sala, JSON.stringify(cae), 'cerrar');
    this.pedirElBotin(sala.codigo, victima.id, verdugo.id, ahora);
  }

  /**
   * RENACE: en `sitioDeRenacer`, con la vida entera, intocable, y su sitio bueno pasa a ser ése —la
   * validación sigue desde ahí—. Lo que ya venía de camino desde donde cayó se calla un segundo, como
   * tras un `corrige`.
   */
  private renacer(sala: Sala, o: Ocupante, ahora: number): void {
    const sitio = this.sitioDeRenacer(sala, o);
    this.moverA(o, sitio.x, sitio.z, ahora);
    o.r = sitio.r;
    o.m = 0;
    o.vida = VIDA_ENTERA;
    o.caidoEn = null;
    o.renacidoEn = ahora;
    o.presupuesto = TOPE_DEL_PRESUPUESTO;
    o.recargadoEn = ahora;
    const c = o.conexion;
    if (c !== null) {
      c.pendiente = { x: sitio.x, z: sitio.z, desde: ahora };
      c.movidoEn = ahora;
    }
    this.cuentas.renacidas++;
    const renace: Renace = { t: 'renace', a: o.id, x: sitio.x, z: sitio.z, r: sitio.r };
    this.repartir(sala, JSON.stringify(renace), 'cerrar');
  }

  /**
   * DÓNDE RENACE QUIEN CAYÓ. Una regla determinista, en tres escalones, sobre los sitios de nacer que
   * declara el mundo, recorridos desde EL SUYO —el de su asiento, el mismo al que se entra— y
   * siguiendo la lista, que es lo que desempata:
   *
   *   1. De los LIBRES —se puede estar y no hay nadie encima— que estén a `LEJOS_AL_RENACER` o más de
   *      quien lo tumbó (donde esté ahora): lo que éste corre mientras dura lo intocable, así que nadie
   *      recibe a nadie con un golpe al acabar la protección. Y de ésos, el MÁS CERCANO A DONDE CAYÓ.
   *   2. Si ninguno libre está tan lejos, el libre MÁS LEJANO de quien lo tumbó.
   *   3. Si no hay ninguno libre, como al entrar (`dondeSeNace`), que busca en anillos.
   *
   * ═══ CERCA DE DONDE CAYÓ, Y NO EN SU SITIO, QUE ERA LA REGLA PRIMERA ═══
   *
   * Se escribió «el suyo, si está libre y lejos», y en Las Lindes el sitio de un asiento puede estar
   * al otro lado del tablero: se medía renacer a 450 unidades, medio minuto andando. Caer ya cuesta el
   * botín y cinco segundos en el suelo; un destierro encima no protege a nadie —la distancia que
   * protege es la del escalón 1, de quien lo tumbó— y deja fuera de la partida al que cayó. Así que
   * se renace lo más cerca posible de donde se estaba, y a salvo.
   *
   * Si quien lo tumbó ya no está en la sala, cualquiera está lejos: el más cercano a donde cayó.
   */
  private sitioDeRenacer(sala: Sala, o: Ocupante): Aparicion {
    const arena = sala.arena;
    const verdugo = o.tumbadoPor === null ? undefined : sala.ocupantes.get(o.tumbadoPor);
    const cuantos = arena.nace.length / 2;
    const turno = sala.asientos.indexOf(o.id);
    const suyo = cuantos === 0 ? 0 : (((turno >= 0 ? turno : 0) % cuantos) + cuantos) % cuantos;
    let masCercano = -1;
    let distanciaMenor = Infinity;
    let masLejano = -1;
    let distanciaMayor = -1;
    for (let j = 0; j < cuantos; j++) {
      const i = (suyo + j) % cuantos;
      const x = arena.nace[i * 2] as number;
      const z = arena.nace[i * 2 + 1] as number;
      if (!sePuedeEstar(arena, x, z, RADIO_DEL_PASEANTE) || this.hayOtro(sala, o, x, z)) continue;
      const lejos = verdugo === undefined ? Infinity : Math.hypot(x - verdugo.x, z - verdugo.z);
      if (lejos >= LEJOS_AL_RENACER) {
        const cerca = Math.hypot(x - o.x, z - o.z);
        if (cerca < distanciaMenor) {
          distanciaMenor = cerca;
          masCercano = i;
        }
      } else if (lejos > distanciaMayor) {
        distanciaMayor = lejos;
        masLejano = i;
      }
    }
    const elegido = masCercano >= 0 ? masCercano : masLejano;
    if (elegido >= 0) {
      return {
        x: arena.nace[elegido * 2] as number,
        z: arena.nace[elegido * 2 + 1] as number,
        r: rumboDeRadianes(arena.rumbos[elegido] as number),
      };
    }
    return dondeSeNace(arena, turno >= 0 ? turno : 0, (x, z) => this.hayOtro(sala, o, x, z));
  }

  /* ── El botín ────────────────────────────────────────────────────────── */

  private libroDe(codigo: string): LibroDeBotines {
    let libro = this.libros.get(codigo);
    if (libro === undefined) {
      libro = { parejas: new Map(), entrados: [], enCamino: new Set() };
      this.libros.set(codigo, libro);
    }
    return libro;
  }

  /** Quita del libro lo que ya no cuenta. `true` si se ha quedado vacío. */
  private podar(libro: LibroDeBotines, ahora: number): boolean {
    for (const [pareja, t] of libro.parejas) if (ahora - t >= BOTIN_CADA_PAREJA_MS) libro.parejas.delete(pareja);
    let viejos = 0;
    while (viejos < libro.entrados.length && ahora - (libro.entrados[viejos] as number) >= VENTANA_DEL_TOPE_MS) viejos++;
    if (viejos > 0) libro.entrados.splice(0, viejos);
    return libro.parejas.size === 0 && libro.entrados.length === 0 && libro.enCamino.size === 0;
  }

  /**
   * EL BOTÍN DE UNA CAÍDA: `pierde` cayó y `gana` lo tumbó. Se mete en la mesa —por la vía interna,
   * con `movimientoDelBotin(pierde, gana)`— salvo que:
   *
   *   · ESA PAREJA —en ese sentido— ya cobró un botín QUE ENTRÓ hace menos de `BOTIN_CADA_PAREJA_MS`,
   *     o tiene uno de camino. La inversa es otra pareja.
   *   · LA MESA ya ha metido `TOPE_DE_BOTINES_POR_MINUTO` en el último minuto, contando los que van
   *     de camino: con seis en vuelo no sale un séptimo aunque ninguno haya contestado todavía.
   *
   * Sólo cuenta lo que ENTRA. Un botín sin efecto —nada que llevarse, una subasta abierta— o
   * rechazado —alguien que no juega— no gasta la pareja ni el tope: la próxima vez puede que sí haya
   * algo. Lo que conteste la mesa se cuenta en el diagnóstico; si revienta, también, y se dice.
   */
  private pedirElBotin(codigo: string, pierde: string, gana: string, ahora: number): void {
    const libro = this.libroDe(codigo);
    this.podar(libro, ahora);
    const pareja = `${pierde}\u0000${gana}`;
    const cobrada = libro.parejas.get(pareja);
    if (libro.enCamino.has(pareja) || (cobrada !== undefined && ahora - cobrada < BOTIN_CADA_PAREJA_MS)) {
      this.cuentas.botines.porPareja++;
      return;
    }
    if (libro.entrados.length + libro.enCamino.size >= TOPE_DE_BOTINES_POR_MINUTO) {
      this.cuentas.botines.porTope++;
      return;
    }
    libro.enCamino.add(pareja);
    let promesa: Promise<LoQueFueDelBotin>;
    try {
      promesa = this.meterElBotin(codigo, pierde, gana);
    } catch (error) {
      promesa = Promise.reject(error);
    }
    promesa.then(
      (fue) => {
        libro.enCamino.delete(pareja);
        this.cuentas.botines[fue.salida]++;
        if (fue.salida !== 'entro') return;
        const t = this.reloj.ahora();
        libro.parejas.set(pareja, t);
        libro.entrados.push(t);
      },
      (error: unknown) => {
        libro.enCamino.delete(pareja);
        this.cuentas.botines.fallos++;
        this.registrar(
          `el botín de una caída en la mesa ${codigo} no ha podido entrar: ${error instanceof Error ? error.message : String(error)}`,
        );
      },
    );
  }

  /* ── Las armas ───────────────────────────────────────────────────────── */

  /**
   * CÓMO PEGA UN ASIENTO AHORA: el arma que dice la vista pública de la revisión que tiene la sala,
   * ya en enteros. Se lee la primera vez que golpea y se guarda hasta que cambie la vista —que es
   * cuando puede haber forjado otra o habérsele roto—: un golpe no vuelve a leer la vista. Sin
   * `armaEnLaRefriega` en los mundos, o si leerla revienta, los puños.
   */
  private golpeDe(sala: Sala, id: string): GolpeDelArma {
    const hay = sala.golpes.get(id);
    if (hay !== undefined) return hay;
    const leer = this.mundos.armaEnLaRefriega;
    let golpe = GOLPE_DE_PUNOS;
    if (leer !== undefined) {
      try {
        golpe = golpeDelArma(leer.call(this.mundos, sala.arcade, sala.vista, id));
      } catch (error) {
        this.registrar(
          `no se ha podido leer el arma de un asiento de la mesa ${sala.codigo}; pega con los puños: ` +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }
    sala.golpes.set(id, golpe);
    return golpe;
  }

  /* ── Los hallazgos (docs/AVATARES-JUGABLES.md §2) ────────────────────── */

  /** La lista de brotes de una sala nueva, con su azar propio; `null` si el juego no tiene tabla. */
  private brotesNuevos(codigo: string, arcade: string): BrotesDeLaSala | null {
    const clases = this.mundos.hallazgosDelJuego?.(arcade) ?? [];
    const brotes = new BrotesDeLaSala(clases, azarConSemilla(this.semillaDeLaSala(codigo)));
    return brotes.hayTabla ? brotes : null;
  }

  /** Cuántos brotes tiene que haber vivos AHORA: los de la mesa menos los que están por volver. */
  private brotesQueTocan(sala: Sala): number {
    return Math.max(0, brotesDeLaMesa(sala.asientos.length) - sala.rebrotes.size);
  }

  /** ¿Hay alguien de la sala —caído o no, con canal o sin él— cerca de este punto? Nada brota encima de nadie. */
  private hayAlguienCerca(sala: Sala): (x: number, z: number) => boolean {
    return (x, z) => {
      for (const o of sala.ocupantes.values()) {
        if (Math.abs(o.x - x) < LEJOS_DE_TODOS_AL_BROTAR && Math.abs(o.z - z) < LEJOS_DE_TODOS_AL_BROTAR) return true;
      }
      return false;
    };
  }

  private libroDeHallazgosDe(codigo: string): LibroDeHallazgos {
    let libro = this.librosDeHallazgos.get(codigo);
    if (libro === undefined) {
      libro = { porAsiento: new Map(), mesa: [], enCamino: new Set(), esperaHasta: new Map() };
      this.librosDeHallazgos.set(codigo, libro);
    }
    return libro;
  }

  /** Quita del libro lo que tiene más de un minuto y las esperas vencidas. `true` si se ha quedado vacío. */
  private podarHallazgos(libro: LibroDeHallazgos, ahora: number): boolean {
    const podar = (lista: number[]): void => {
      let viejos = 0;
      while (viejos < lista.length && ahora - (lista[viejos] as number) >= VENTANA_DEL_TOPE_MS) viejos++;
      if (viejos > 0) lista.splice(0, viejos);
    };
    podar(libro.mesa);
    for (const [id, lista] of libro.porAsiento) {
      podar(lista);
      if (lista.length === 0) libro.porAsiento.delete(id);
    }
    for (const [id, hasta] of libro.esperaHasta) if (ahora >= hasta) libro.esperaHasta.delete(id);
    return libro.mesa.length === 0 && libro.porAsiento.size === 0 && libro.enCamino.size === 0 && libro.esperaHasta.size === 0;
  }

  /**
   * RECOGER, al aceptar un sitio de `o`. Si está de pie —los intocables también: recoger no es
   * pegar— a `RADIO_DE_RECOGER` o menos de un brote, no tiene otro de camino ni está esperando tras
   * una negativa, y ni él ni la mesa han llegado a su tope del último minuto —contando los que van de
   * camino—: el brote se APARTA y se pide a la mesa. Lo que pase después lo decide la mesa, en
   * `pedirElHallazgo`. Con el tope lleno, el brote se queda donde está y nadie se entera.
   *
   * Sólo llega aquí quien ANDA: se llama desde `validar`, y los asientos sin canal no mandan `aqui`.
   * Quien se quedó de pie donde nació, o donde cerró su canal, no recoge lo que brote a su lado.
   */
  private recoger(sala: Sala, o: Ocupante, ahora: number): void {
    const brotes = sala.brotes;
    if (brotes === null || brotes.cuantos === 0) return;
    if (o.conexion === null || this.estadoDe(o, ahora) === CAIDO) return;
    const b = brotes.alAlcance(o.x, o.z);
    if (b === null) return;

    const libro = this.libroDeHallazgosDe(sala.codigo);
    this.podarHallazgos(libro, ahora);
    /* Uno de camino por persona, y tras una negativa de la mesa, un respiro: ver `ESPERA_TRAS_NEGATIVA_MS`. */
    if (libro.enCamino.has(o.id) || libro.esperaHasta.has(o.id)) return;
    if ((libro.porAsiento.get(o.id)?.length ?? 0) >= HALLAZGOS_POR_ASIENTO_Y_MINUTO) {
      this.cuentas.hallazgos.porTopeDeAsiento++;
      return;
    }
    if (libro.mesa.length + libro.enCamino.size >= HALLAZGOS_POR_MESA_Y_MINUTO) {
      this.cuentas.hallazgos.porTopeDeMesa++;
      return;
    }
    brotes.apartar(b.id);
    libro.enCamino.add(o.id);
    this.pedirElHallazgo(sala, libro, o.id, b);
  }

  /**
   * EL HALLAZGO QUE ENTRÓ: se anota contra los topes, se quita el brote, `recoge` y el `brotes` nuevo a
   * toda la sala, y se programa el rebrote. Si entre medias el brote se quitó —el mundo cambió y no le
   * quedó sitio—, el hallazgo ya es de quien llegó y se avisa igual; lo que no hay es rebrote que
   * programar, porque ya falta uno.
   */
  private recogido(sala: Sala, libro: LibroDeHallazgos, para: string, b: Brote): void {
    const t = this.reloj.ahora();
    const suyos = libro.porAsiento.get(para) ?? [];
    suyos.push(t);
    libro.porAsiento.set(para, suyos);
    libro.mesa.push(t);
    this.cuentas.hallazgos.recogidos++;
    const brotes = sala.brotes;
    if (sala.cerrada || brotes === null) return;
    const estaba = brotes.quitar(b.id);
    const recoge: Recoge = { t: 'recoge', h: b.id, por: para, clase: b.clase };
    /* El aviso se puede saltar —es un gesto, y detrás va la lista—; la lista no. */
    this.repartir(sala, JSON.stringify(recoge), 'saltar');
    if (estaba) {
      this.repartir(sala, brotes.texto(), 'cerrar');
      this.programarElRebrote(sala);
    }
  }

  /** Dentro de `REBROTE_MS`, uno nuevo en otro sitio libre. Hasta entonces, el que falta no se repone. */
  private programarElRebrote(sala: Sala): void {
    const t = this.reloj.dentroDe(REBROTE_MS, () => {
      sala.rebrotes.delete(t);
      if (sala.cerrada) return;
      try {
        this.cuentas.hallazgos.rebrotes++;
        this.sembrar(sala);
      } catch (error) {
        this.registrar(`no ha podido rebrotar nada en la mesa ${sala.codigo}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    sala.rebrotes.add(t);
  }

  /** Brota lo que falte, y si ha brotado algo, la lista nueva a toda la sala. */
  private sembrar(sala: Sala): void {
    const brotes = sala.brotes;
    if (brotes === null) return;
    if (brotes.rellenar(this.brotesQueTocan(sala), this.hayAlguienCerca(sala))) this.repartir(sala, brotes.texto(), 'cerrar');
  }

  /** Para los rebrotes de una sala que se cierra: nadie los va a ver. */
  private pararLosRebrotes(sala: Sala): void {
    for (const t of sala.rebrotes) t.parar();
    sala.rebrotes.clear();
  }

  /**
   * METE EL HALLAZGO EN LA MESA, por la vía interna, y según conteste:
   *
   *   · ENTRÓ: es suyo (`recogido`).
   *   · CUALQUIER OTRA COSA —sin efecto (el dinero en vilo del Burgo), rechazado (quien ha quebrado,
   *     una partida que no está en juego), la mesa terminada o apartada, o un fallo—: el brote se
   *     SUELTA y se queda donde estaba, sin `recoge` y sin gastar ningún tope, igual que el botín sólo
   *     cuenta lo que entra. Quien lo intentó espera `ESPERA_TRAS_NEGATIVA_MS` antes de volver a
   *     intentarlo: si no, parado encima haría una petición a la mesa por cada paso, veinte por segundo.
   */
  private pedirElHallazgo(sala: Sala, libro: LibroDeHallazgos, para: string, b: Brote): void {
    const codigo = sala.codigo;
    const noEntro = (): void => {
      libro.enCamino.delete(para);
      libro.esperaHasta.set(para, this.reloj.ahora() + ESPERA_TRAS_NEGATIVA_MS);
      sala.brotes?.soltar(b.id);
    };
    let promesa: Promise<LoQueFueDelBotin>;
    try {
      promesa = this.meterElHallazgo(codigo, para, b.clase);
    } catch (error) {
      promesa = Promise.reject(error);
    }
    promesa
      .then(
        (fue) => {
          this.cuentas.hallazgos[fue.salida]++;
          if (fue.salida !== 'entro') {
            noEntro();
            return;
          }
          libro.enCamino.delete(para);
          this.recogido(sala, libro, para, b);
        },
        (error: unknown) => {
          noEntro();
          this.cuentas.hallazgos.fallos++;
          this.registrar(
            `un hallazgo recogido en la mesa ${codigo} no ha podido entrar: ${error instanceof Error ? error.message : String(error)}`,
          );
        },
      )
      .catch((error: unknown) => {
        /* Lo que reviente avisando no puede quedarse sin atender: se dice y se sigue. */
        this.registrar(`tras meter un hallazgo en la mesa ${codigo}: ${error instanceof Error ? error.message : String(error)}`);
      });
  }

  /* ── Mandar ──────────────────────────────────────────────────────────── */

  /** Manda a un canal, mirando antes si da abasto. Ver «Lo que se puede perder y lo que no». */
  private mandar(c: Conexion, texto: string, siSeAtasca: SiSeAtasca): void {
    if (c.estado === 'cerrada') return;
    if (c.enchufe.pendientes() > ATASCO_BYTES) {
      if (siSeAtasca === 'saltar') {
        this.cuentas.saltados++;
        return;
      }
      this.echar(c, 'atascado', 'Tu conexión no daba abasto: vuelve a entrar para ponerte al día.');
      return;
    }
    c.enchufe.enviar(texto);
  }

  /** La misma cadena a todos los de la sala que tienen canal. */
  private repartir(sala: Sala, texto: string, siSeAtasca: SiSeAtasca): void {
    for (const o of sala.ocupantes.values()) {
      if (o.conexion !== null) this.mandar(o.conexion, texto, siSeAtasca);
    }
  }

  /* ── El tic ──────────────────────────────────────────────────────────── */

  private encenderElReloj(): void {
    if (this.temporizador !== null || this.apagado) return;
    this.temporizador = this.reloj.cada(MS_POR_TIC, () => this.tic());
  }

  private apagarElReloj(): void {
    this.temporizador?.parar();
    this.temporizador = null;
  }

  /**
   * UN TIC DE TODAS LAS SALAS. Lo llama el único temporizador del proceso.
   *
   * Se recorren los `Map` en vivo y no copias: borrar la entrada que se está visitando es seguro
   * en un `Map`, y copiar las salas y sus asientos veinte veces por segundo es basura para nada.
   * Cada sala va en su `try`: lo que reviente en una no se lleva el tic de las demás, ni —por el
   * `uncaughtException` de `index.ts`— el proceso. Una vez por segundo se podan además los libros de
   * botines, y se tiran los que se han quedado vacíos.
   */
  tic(): void {
    const ahora = this.reloj.ahora();
    this.cuentas.tics++;
    for (const sala of this.salas.values()) {
      try {
        this.ticDeLaSala(sala, ahora);
      } catch (error) {
        this.registrar(`el tic de la mesa ${sala.codigo} ha fallado: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (this.cuentas.tics % TICS_POR_SEGUNDO === 0) {
      for (const [codigo, libro] of this.libros) if (this.podar(libro, ahora)) this.libros.delete(codigo);
      for (const [codigo, libro] of this.librosDeHallazgos) {
        if (this.podarHallazgos(libro, ahora)) this.librosDeHallazgos.delete(codigo);
      }
    }
    if (this.salas.size === 0) this.apagarElReloj();
  }

  private ticDeLaSala(sala: Sala, ahora: number): void {
    sala.k++;
    let conCanal = 0;
    for (const o of sala.ocupantes.values()) {
      if (o.caidoEn !== null && ahora - o.caidoEn >= CAIDO_MS) this.renacer(sala, o, ahora);
      const c = o.conexion;
      if (c === null) continue;
      if (ahora - c.movidoEn >= QUIETO_HASTA_CERRAR_MS) {
        this.echar(c, 'quieto', 'Un minuto sin moverte: el canal se cierra hasta que vuelvas a andar.');
        continue;
      }
      conCanal++;
    }
    if (conCanal > 0) sala.vaciaDesde = null;
    else if (sala.vaciaDesde === null) sala.vaciaDesde = ahora;
    if (sala.vaciaDesde !== null && ahora - sala.vaciaDesde >= GRACIA_AL_IRSE_MS) {
      this.borrarSala(sala);
      return;
    }
    if (!sala.revisando && ahora - sala.revisadaEn >= REVISAR_LA_MESA_CADA_MS) void this.revisar(sala);
    if (sala.k % TICS_POR_FOTO === 0) this.mandarLaFoto(sala);
  }

  /**
   * UNA foto por sala, serializada UNA vez, la misma cadena a todos.
   *
   * Una entrada por ASIENTO y nunca dos: sale de `sala.ocupantes`, que va por asiento, y quien
   * vuelve con otro canal —dentro de la gracia, o desbancando al suyo— retoma la MISMA entrada.
   * El lector del aparato rechaza una foto con un asiento repetido. Salen TODOS los asientos, bajen o
   * no: quien no tiene canal, quieto (marcha 0) donde está. El cuarto número es hacia dónde MIRA, tal
   * cual lo dijo su `aqui`: aquí no se valida, se reparte.
   *
   * Quien tiene el búfer de salida atascado se salta esa foto —y se cuenta—: una foto es una
   * instantánea, y amontonarlas en un canal que no da abasto sólo retrasa la siguiente.
   */
  private mandarLaFoto(sala: Sala): void {
    let alguien = false;
    for (const o of sala.ocupantes.values()) {
      if (o.conexion !== null) {
        alguien = true;
        break;
      }
    }
    if (!alguien) return;
    const p: [string, number, number, number, number][] = [];
    for (const o of sala.ocupantes.values()) p.push([o.id, o.x, o.z, o.r, o.conexion === null ? 0 : o.m]);
    const foto: Foto = { t: 'foto', k: sala.k, p };
    const texto = JSON.stringify(foto);
    this.cuentas.fotosCompuestas++;
    for (const o of sala.ocupantes.values()) {
      const c = o.conexion;
      if (c === null) continue;
      if (c.enchufe.pendientes() > ATASCO_BYTES) {
        this.cuentas.fotosSaltadas++;
        continue;
      }
      c.enchufe.enviar(texto);
      this.cuentas.fotos++;
      this.cuentas.bytesDeFotos += texto.length;
    }
  }

  /**
   * ¿HA CAMBIADO LA MESA? Como mucho una vez por segundo y por sala, y es barato: la lectura que no
   * proyecta. Si la mesa se ha acabado o ya no existe, fuera todos. Si ha cambiado la revisión, la
   * sala se pone a la COLA para volver a derivar su mundo (ver `PARTE_PARA_DERIVAR`).
   */
  private async revisar(sala: Sala): Promise<void> {
    sala.revisando = true;
    sala.revisadaEn = this.reloj.ahora();
    try {
      const r = await this.mesa.revision(sala.codigo);
      if (sala.cerrada || this.salas.get(sala.codigo) !== sala) return;
      if (r === null) {
        this.cerrarLaSala(sala, 'La mesa ya no existe.');
        return;
      }
      if (r.terminada) {
        this.cerrarLaSala(sala, 'La partida se ha acabado.');
        return;
      }
      if (r.rev !== sala.rev && !sala.enCola) {
        sala.enCola = true;
        void this.derivar(sala);
      }
    } catch (error) {
      this.cuentas.fallosAlRederivar++;
      this.registrar(
        `no se ha podido preguntar por la mesa ${sala.codigo}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      sala.revisando = false;
    }
  }

  /* ── El turno para derivar ───────────────────────────────────────────── */

  /** Pide turno para derivar un mundo. Se sigue cuando toca; hay que soltarlo con `soltarTurno`. */
  private pedirTurno(prioridad: number): Promise<void> {
    return new Promise<void>((seguir) => {
      let i = this.esperandoTurno.length;
      while (i > 0 && (this.esperandoTurno[i - 1] as { prioridad: number }).prioridad > prioridad) i--;
      this.esperandoTurno.splice(i, 0, { prioridad, seguir });
      this.repartirTurno();
    });
  }

  private soltarTurno(): void {
    this.enTurno = false;
    this.repartirTurno();
  }

  /**
   * DA EL TURNO AL PRIMERO, si nadie lo tiene y ya ha pasado lo que apartó la última derivación. Si
   * aún no, un temporizador lo dará cuando toque: entre medias el bucle atiende a los demás.
   */
  private repartirTurno(): void {
    if (this.enTurno || this.esperaDelTurno !== null) return;
    const primero = this.esperandoTurno[0];
    if (primero === undefined) return;
    const espera = this.derivarDesde - this.reloj.ahora();
    if (espera >= 1) {
      this.esperaDelTurno = this.reloj.dentroDe(espera, () => {
        this.esperaDelTurno = null;
        this.repartirTurno();
      });
      return;
    }
    this.esperandoTurno.shift();
    this.enTurno = true;
    primero.seguir();
  }

  /** Deriva el mundo con el turno cogido y apunta lo que ha costado: aparta al siguiente cuatro veces eso. */
  private derivarElMundo(arcade: string, vista: unknown, codigo: string): Arena | null {
    const t0 = this.cronometro();
    try {
      const mundo = this.mundos.mundoDeLaMesa(arcade, vista, codigo);
      return mundo === null ? null : arenaDe(mundo);
    } finally {
      const coste = Math.max(0, this.cronometro() - t0);
      this.cuentas.msDerivando += coste;
      this.derivarDesde = Math.max(this.derivarDesde, this.reloj.ahora() + coste * (1 / PARTE_PARA_DERIVAR - 1));
    }
  }

  /**
   * VUELVE A DERIVAR EL MUNDO DE UNA SALA, con turno y con la vista de ese momento, y a quien haya
   * quedado dentro de un cuerpo o sin suelo se le saca al sitio libre más cercano con un `corrige`.
   * Quien se haya sentado a la mesa desde la última vez entra en la sala, de pie en su sitio de nacer.
   */
  private async derivar(sala: Sala): Promise<void> {
    await this.pedirTurno(PARA_VOLVER_A_DERIVAR);
    sala.enCola = false;
    try {
      if (sala.cerrada || this.salas.get(sala.codigo) !== sala) return;
      const v = await this.mesa.vista(sala.codigo);
      if (sala.cerrada || this.salas.get(sala.codigo) !== sala) return;
      if (v === null) {
        this.cerrarLaSala(sala, 'La mesa ya no existe.');
        return;
      }
      if (v.terminada) {
        this.cerrarLaSala(sala, 'La partida se ha acabado.');
        return;
      }
      const arena = this.derivarElMundo(sala.arcade, v.vista, sala.codigo);
      sala.rev = v.rev;
      sala.asientos = v.asientos;
      /* La vista de esta revisión, y el arma de cada uno se vuelve a leer de ella al golpear. */
      sala.vista = v.vista;
      sala.golpes.clear();
      /* Un mundo que desaparece no deja a nadie en el vacío: se sigue con el que había. */
      if (arena !== null) {
        sala.arena = arena;
        this.cuentas.rederivaciones++;
        this.rescatar(sala);
      }
      const ahora = this.reloj.ahora();
      for (const id of v.asientos) if (!sala.ocupantes.has(id)) this.ponerEnLaSala(sala, id, ahora);
      /*
       * Los brotes, sobre el mundo nuevo: los que se han quedado donde ya no se puede estar se
       * recolocan (o se quitan si no cabe ninguno), y si se ha sentado alguien, brotan los que le tocan.
       */
      const brotes = sala.brotes;
      if (brotes !== null) {
        const hayAlguien = this.hayAlguienCerca(sala);
        const movidos = arena !== null && brotes.ponerLaArena(arena, hayAlguien);
        const nuevos = brotes.rellenar(this.brotesQueTocan(sala), hayAlguien);
        if (movidos || nuevos) this.repartir(sala, brotes.texto(), 'cerrar');
      }
    } catch (error) {
      this.cuentas.fallosAlRederivar++;
      this.registrar(
        `no se ha podido volver a derivar el mundo de la mesa ${sala.codigo}; se sigue con el que había: ` +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      this.soltarTurno();
    }
  }

  /** A quien el mundo nuevo deja dentro de una caja o sin suelo, al sitio libre más cercano. */
  private rescatar(sala: Sala): void {
    const ahora = this.reloj.ahora();
    for (const o of sala.ocupantes.values()) {
      if (sePuedeEstar(sala.arena, o.x, o.z, RADIO_DEL_PASEANTE)) continue;
      const libre = this.sitioDeRescate(sala, o);
      this.moverA(o, libre.x, libre.z, ahora);
      const c = o.conexion;
      if (c === null || c.estado !== 'dentro') {
        this.cuentas.correcciones.rescate++;
        continue;
      }
      this.corregir(c, c.ultimoN, 'rescate', ahora);
    }
  }

  /* ── Salir ───────────────────────────────────────────────────────────── */

  /**
   * CIERRA UN CANAL: dice `fuera` con el motivo, que se lee en pantalla, y cierra con su código.
   * Su asiento se queda en la sala, sin canal. El `fuera` se salta si el canal está atascado: se va
   * a cerrar igual, y el código dice por qué.
   */
  private echar(c: Conexion, clave: PorQueSeCierra, motivo: string): void {
    if (c.estado === 'cerrada') return;
    c.estado = 'cerrada';
    c.plazo?.parar();
    c.plazo = null;
    this.soltar(c, clave === 'reemplazado');
    this.conexiones.delete(c);
    this.cuentas.cierres[clave]++;
    const codigo = clave === 'apagado' ? CIERRE_APAGADO : clave === 'fallo' || clave === 'seFue' ? CIERRE_FALLO : CIERRE[clave];
    const fuera: Fuera = { t: 'fuera', motivo };
    try {
      if (c.enchufe.pendientes() > ATASCO_BYTES) this.cuentas.saltados++;
      else c.enchufe.enviar(JSON.stringify(fuera));
      c.enchufe.cerrar(codigo, clave);
    } catch (error) {
      this.registrar(`no se ha podido cerrar limpio un canal de la mesa ${c.codigo}: ${String(error)}`);
    }
  }

  /** Algo ha reventado atendiendo a un canal: se dice en el registro y se cierra ESE canal. */
  fallo(c: Conexion, error: unknown): void {
    this.registrar(
      `un canal de la mesa ${c.codigo} ha fallado y se cierra: ${error instanceof Error ? error.message : String(error)}`,
    );
    try {
      this.echar(c, 'fallo', 'El servidor ha tenido un problema con este canal. Vuelve a entrar.');
    } catch {
      /* Si ni cerrar se puede, el enchufe se cierra solo al irse el otro lado. */
    }
  }

  /**
   * El asiento se queda sin este canal, y se queda en la sala donde está, quieto. Si era el último
   * con canal, empieza la gracia de la sala.
   */
  private soltar(c: Conexion, reemplazado: boolean): void {
    const o = c.ocupante;
    const sala = c.sala;
    if (o !== null && o.conexion === c) {
      o.conexion = null;
      if (!reemplazado) {
        o.m = 0;
        if (sala !== null && sala.vaciaDesde === null && !this.alguienConCanal(sala)) sala.vaciaDesde = this.reloj.ahora();
      }
    }
    c.ocupante = null;
    c.sala = null;
  }

  private alguienConCanal(sala: Sala): boolean {
    for (const o of sala.ocupantes.values()) if (o.conexion !== null) return true;
    return false;
  }

  private borrarSala(sala: Sala): void {
    if (this.salas.get(sala.codigo) === sala) this.salas.delete(sala.codigo);
  }

  private cerrarLaSala(sala: Sala, motivo: string): void {
    sala.cerrada = true;
    this.pararLosRebrotes(sala);
    this.borrarSala(sala);
    for (const o of [...sala.ocupantes.values()]) {
      if (o.conexion !== null) this.echar(o.conexion, 'mesaCerrada', motivo);
    }
    sala.ocupantes.clear();
    /* Una mesa acabada u olvidada ya no admite botines ni hallazgos: sus libros se van con ella. */
    this.libros.delete(sala.codigo);
    this.librosDeHallazgos.delete(sala.codigo);
    this.registrar(`se cierra la sala de la mesa ${sala.codigo}: ${motivo}`);
    if (this.salas.size === 0) this.apagarElReloj();
  }

  /** LA MESA SE HA CERRADO U OLVIDADO: `mesaCerrada` a todos los que andan por ella. */
  cerrarLaMesa(codigo: string, motivo: string): void {
    const sala = this.salas.get(codigo);
    if (sala !== undefined) this.cerrarLaSala(sala, motivo);
    else {
      this.libros.delete(codigo);
      this.librosDeHallazgos.delete(codigo);
    }
  }

  /** SIGTERM: todos los canales se cierran con 1001 y no se abre ninguno más. */
  apagar(): void {
    this.apagado = true;
    this.apagarElReloj();
    for (const c of [...this.conexiones]) {
      this.echar(c, 'apagado', 'El servidor se está reiniciando: vuelve a entrar en unos segundos.');
    }
    for (const sala of this.salas.values()) this.pararLosRebrotes(sala);
    this.salas.clear();
    this.libros.clear();
    this.librosDeHallazgos.clear();
    /* Quien esperaba turno para derivar se queda esperando: el proceso se va, y nadie lo va a leer. */
    this.esperandoTurno.length = 0;
    this.esperaDelTurno?.parar();
    this.esperaDelTurno = null;
  }

  /* ── Mirar desde fuera ───────────────────────────────────────────────── */

  /** Un origen que no se admite: lo cuenta el enchufe, que es quien lo ve. */
  contarOrigenNegado(): void {
    this.cuentas.origenesNegados++;
  }

  /** Una subida negada por cuota: la cuenta la capa de cuotas (`cuotas.ts`) a través del enchufe. */
  contarCuotaNegada(motivo: MotivoDeCuota): void {
    this.cuentas.cuotasNegadas[motivo]++;
  }

  diagnostico(): DiagnosticoDeBotas {
    let enSala = 0;
    for (const c of this.conexiones) if (c.estado === 'dentro') enSala++;
    let sitios = 0;
    let brotesVivos = 0;
    for (const sala of this.salas.values()) {
      for (const o of sala.ocupantes.values()) sitios += o.rastro.length / 3;
      brotesVivos += sala.brotes?.cuantos ?? 0;
    }
    return {
      ...this.cuentas,
      brotesVivos,
      hallazgos: { ...this.cuentas.hallazgos },
      salas: this.salas.size,
      canales: this.conexiones.size,
      enSala,
      temporizador: this.temporizador !== null,
      colaParaDerivar: this.esperandoTurno.length,
      sitiosEnLosRastros: sitios,
      correcciones: { ...this.cuentas.correcciones },
      botines: { ...this.cuentas.botines },
      cuotasNegadas: { ...this.cuentas.cuotasNegadas },
      cierres: { ...this.cuentas.cierres },
    };
  }
}
