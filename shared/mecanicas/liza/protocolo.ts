/**
 * EL CABLE DE LA LIZA: lo que se dicen el aparato y la sala del servidor mientras se lidia.
 *
 * ═══ POR QUÉ UN PROTOCOLO PROPIO Y NO LA VERSIÓN 2 DEL DE BOTS ON BOARD ═══
 *
 * El canal de Boots on Board (`canal-de-botas.ts`) es de otra sesión, tiene aparatos en la calle que
 * hablan su versión 1 y no se toca. La Liza tiene su RUTA (`rutaDeLaLiza`) y su versión
 * (`VERSION_DE_LA_LIZA`), así que su versión 1 no choca con nada: un aparato viejo de botas nunca
 * llama a esta puerta, y uno de la liza nunca a aquélla. Lo que sí se hereda son las decisiones que
 * allí costaron: la llave en el primer mensaje y nunca en la URL, JSON de texto con claves EXACTAS,
 * lectores que devuelven `null` ante cualquier cosa rara, los topes de 256 bytes y 25 mensajes por
 * segundo, y los cierres con código propio (aquí, del 4100 al 4199, para no pisar los 4000 de botas).
 *
 * ═══ LA ACCIÓN VIAJA DENTRO DEL `aqui` ═══
 *
 * En combate el aparato manda un `aqui` por tic —veinte por segundo— y el cubo admite veinticinco:
 * un mensaje aparte por cada golpe lo vaciaría a la primera ráfaga. Así que `aqui` lleva siempre la
 * clave `a`, que es `0` si no se hizo nada en ese tic y `[accion, ms, blanco]` si sí:
 *
 *   · `accion`: el id declarado (1-255) de lo que se pulsó.
 *   · `ms`: el instante de la pulsación en el reloj DEL APARATO —el `timeStamp` del evento de
 *     puntero, no el del fotograma: un tirón de pantalla no puede retrasar la pulsación—, en ms
 *     enteros. Es lo que permite juzgar la esquiva en el reloj de quien la hizo (ver
 *     `tipos-de-la-sala.ts`).
 *   · `blanco`: el número del cuerpo al que va (0 = sin blanco).
 *
 * Las acciones SOSTENIDAS (rematar, rescatar, usar una zona) se repiten en cada `aqui` mientras se
 * mantienen, con el MISMO `ms` —el de la pulsación—; el primer `aqui` sin ella la suelta. Mientras se
 * mantiene algo, un `aqui` por tic aunque se esté quieto. Quien no tiene cuerpo no manda `aqui`.
 *
 * Cabe UNA acción por `aqui`. Si en un tic se pulsan dos, la segunda va en el `aqui` del tic siguiente
 * con SU `ms`: el `ms` dice cuándo se pulsó, no el tic en que viaja, y la sala juzga por el `ms`.
 *
 * ═══ EL RELOJ DEL APARATO ES EL DE SU CANAL ═══
 *
 * Todo instante del aparato —el `n` de `aqui`, el `ms` de una acción, el `c` de `hola` y de `eco`, el
 * `t` de un anuncio o una bala que le llega— son milisegundos DESDE QUE ABRIÓ ESTE CANAL:
 * `performance.now()` (o el `timeStamp` del evento, que va en la misma escala) menos el
 * `performance.now()` al abrirlo. No el `performance.now()` a secas: ése vuelve a 0 al recargar la
 * pestaña y la sala tiraría cada `aqui` hasta que alcanzara al de antes, y pasados 24,8 días de pestaña
 * se sale de los enteros que viajan. Con cada canal nuevo el reloj empieza en 0, y la sala lo sabe
 * (ver `tipos-de-la-sala.ts`). Una pulsación anterior a abrir el canal no se manda: su `ms` sería
 * negativo, y el lector lo tira.
 *
 * ═══ LOS NÚMEROS DE CUERPO ═══
 *
 * Todo cuerpo de la sala tiene un NÚMERO en el cable: los asientos, del 1 al 15 (su posición en
 * `LizaDeclarada.asientos` más uno); las entidades, montones y balas, del 16 al 65535. Un número es
 * mucho más corto que un `AsientoId` y la foto sale así de pequeña.
 *
 * ═══ LAS POSICIONES: Q16.16 DE SUBIDA, CENTÉSIMAS DE BAJADA ═══
 *
 * Lo que el aparato DICE de sí mismo (`aqui`) y lo que la sala le IMPONE (`dentro`, `corrige`) va en
 * Q16.16 exacto: el aparato predice su paso con `unPaso` sobre la misma arena, y un sitio redondeado a
 * centímetros pegado a un muro puede caer dentro del muro y ganarse una corrección que no merece. Lo
 * que la sala cuenta de LOS DEMÁS para pintarlo (`foto`, `nace`, `bala`, `monton`) va en centésimas de
 * unidad: un centímetro no se ve, y la foto ocupa la mitad.
 *
 * ═══ LOS SUCESOS VAN AGRUPADOS POR TIC ═══
 *
 * Todo lo que pasa en un tic sale en un mensaje `tic` con la lista `ev`. Cada suceso lleva su clase en
 * la clave `e` —no en `t`, que en el anuncio es el INSTANTE del impacto, como dice el diseño—. Los
 * instantes (`anuncio.t`, `bala.t`, `apunta.t`) van en el reloj DEL DESTINATARIO: por eso el `tic` se
 * escribe por aparato, y la foto, que no lleva nada de nadie en particular, una vez por sala.
 *
 * Un `tic` nunca va vacío (si no pasó nada, no se manda). Y si lo de un tic no cabe en uno
 * (`TOPE_DE_SUCESOS`) —la puesta al día de quien entra con la sala llena, por ejemplo—, van VARIOS
 * `tic` con el mismo `k`, que el aparato aplica en el orden en que llegan.
 *
 * ═══ CABER EN 256 BYTES ═══
 *
 * La subida más larga es el `hola` con la llave más larga que el lector admite —64 letras, todas de las
 * que JSON escapa— y su reloj en el tope: unos 175 bytes. Un `aqui` con todo en el tope y una acción,
 * menos de 100. `verify:liza-protocolo` escribe los más largos que el lector admite y mira que caben. Y
 * los lectores exigen ASCII imprimible: así la longitud en letras ES la longitud en bytes, sin codificar
 * nada para contarla.
 */
import { TICS_POR_SEGUNDO } from '../andar';
import { UNO } from '../fijo';
import {
  esClaveCorta,
  MS_POR_TIC,
  TOPE_DE_ASIENTOS,
  TOPE_DE_CAJAS,
  TOPE_DE_CANTIDAD,
  TOPE_DE_ENTIDADES,
  TOPE_DE_ID,
  TOPE_DE_MULTIPLICADOR,
  TOPE_DE_TICS,
} from './declaracion';
import { TOPE_DE_LA_LIZA } from './geometria';

/* ─── LAS CONSTANTES DEL CABLE ───────────────────────────────────────────── */

/** La versión del protocolo de la Liza. Es SU protocolo: no tiene que ver con `VERSION_DEL_CANAL`. */
export const VERSION_DE_LA_LIZA = 1;

/** La ruta del canal de la liza de una mesa. Bajo `/api`, como la de botas, para que Vite la pase. */
export function rutaDeLaLiza(codigo: string): string {
  return `/api/arcade/mesas/${encodeURIComponent(codigo)}/liza`;
}

/** Cuánto tiene el aparato para decir `hola` tras abrir, en ms. El mismo que en botas, por lo mismo. */
export const PLAZO_DEL_HOLA_MS = 3000;

/** El tope de un mensaje del aparato, en bytes (y en letras: ver la cabecera). */
export const TOPE_DE_SUBIDA_BYTES = 256;

/** El tope de un mensaje de la sala. La foto más grande y el `tic` más grande caben de sobra (se pesan). */
export const TOPE_DE_BAJADA_BYTES = 65536;

/** Cuántos mensajes por segundo puede mandar un aparato de media, y de golpe (cubo de fichas). */
export const MENSAJES_POR_SEGUNDO = 25;
export const MENSAJES_DE_GOLPE = 40;

/** Tics por segundo de la sala y fotos por segundo: una foto cada dos tics. */
export const TICS_DE_LA_LIZA = TICS_POR_SEGUNDO;
export const FOTOS_POR_SEGUNDO = 10;

/** Cada cuánto manda el aparato un `eco`, y de cuántos saca la mediana de la ida y vuelta. */
export const ECO_CADA_MS = 2000;
export const ECOS_DE_LA_MEDIANA = 5;

/** Un `aviso` por aparato cada tanto como mucho (la declaración puede pedir más espacio, no menos). */
export const AVISO_CADA_MS = 1000;

/**
 * LO MÁS QUE MANDA UN APARATO DE GOLPE TRAS UNA PARADA: sus últimos ocho tics, y los de antes no.
 *
 * Tras una parada (un fotograma que se come medio segundo, una pestaña que el navegador frena a un
 * temporizador por segundo) el aparato simula los tics que se perdió para que su paso siga siendo el
 * mismo, pero sólo MANDA los últimos `TOPE_DE_AQUIS_DE_GOLPE`: cuatrocientos `aqui` de golpe vaciarían el
 * cubo, y los viejos ya no le sirven a nadie. Es contrato y no detalle del cliente porque la sala lo usa:
 * una serie de `aqui` seguidos más larga que esto (`AQUIS_PARA_ESTAR`, en `tipos-de-la-sala.ts`) sólo la
 * hace un aparato despierto, y así distingue la pestaña frenada de la que está a la vista.
 */
export const TOPE_DE_AQUIS_DE_GOLPE = 8;

/**
 * Lo que se retrasa lo que se pinta del paseo de los DEMÁS, en ms: dos fotos entre las que interpolar.
 * Las acciones ajenas no: ésas se pintan por guion desde el suceso, en el presente.
 */
export const RETRASO_DE_LOS_DEMAS_MS = 150;

/**
 * Sin NINGÚN mensaje tanto tiempo, se cierra. No es «quieto»: quien no tiene cuerpo no anda y no por
 * eso se va; pero manda `eco` cada `ECO_CADA_MS`, y un canal que no dice nada en quince es un canal
 * muerto que ocupa un hueco.
 */
export const SILENCIO_HASTA_CERRAR_MS = 15000;

/** Los números de cuerpo. Ver la cabecera. */
export const PRIMER_NUMERO_DE_ENTIDAD = 16;
export const TOPE_DE_NUMERO = 65535;

/** El mayor tic del aparato y el mayor instante en ms que viajan: 2^31 − 1 (casi 25 días de CANAL abierto). */
export const TOPE_DE_TIC_DEL_APARATO = 2147483647;
export const TOPE_DE_MS = 2147483647;

/** La mayor coordenada en centésimas: la de `TOPE_DE_LA_LIZA` (51.200 = 512 unidades). */
export const TOPE_DE_CENTESIMAS = (TOPE_DE_LA_LIZA * 100) / UNO;

/** La marcha viaja de 0 (quieto) a 7. */
export const TOPE_DE_MARCHA = 7;

/**
 * Cuántos sucesos caben en un `tic`. Con el suceso más largo que el lector admite (unos 150 bytes: la
 * `fase` con la clave más larga), 256 de ellos caben en `TOPE_DE_BAJADA_BYTES` con sitio de sobra;
 * `verify:liza-protocolo` escribe ese `tic` y lo pesa. Lo que no quepa va en otro `tic` con el mismo `k`.
 */
export const TOPE_DE_SUCESOS = 256;

/**
 * Cuántas tuplas lleva una foto como mucho: todos los asientos y todas las entidades del aforo más
 * grande que admite la declaración. Ni una más: una foto con más cuerpos de los que una sala puede
 * tener no es una foto de ninguna sala.
 */
export const TOPE_DE_TUPLAS = TOPE_DE_ASIENTOS + TOPE_DE_ENTIDADES;

/** Por qué se cierra un canal de la liza. Del 4100 al 4199: los 4000 son de botas. */
export const CIERRE_DE_LA_LIZA = {
  /** No dijo `hola` a tiempo, o lo primero que dijo no era un `hola`. */
  sinHola: 4100,
  /** La llave no es de ningún asiento de esta mesa. */
  llaveMala: 4101,
  /** La mesa no existe o su arcade no está en el registro de lizas. */
  mesaQueNo: 4102,
  /** Se abrió otro canal con el mismo asiento: el nuevo manda. */
  reemplazado: 4103,
  /** `SILENCIO_HASTA_CERRAR_MS` sin ningún mensaje. */
  silencio: 4104,
  /** Demasiados mensajes, uno demasiado grande, o uno mal formado. */
  atropello: 4105,
  /** La mesa se cerró o se olvidó. */
  mesaCerrada: 4106,
  /** Dijo `hola` en otra versión: reintentar da lo mismo, hay que actualizar el aparato. */
  versionVieja: 4107,
  /** Había que mandarle algo que no se puede perder y su conexión no daba abasto: reintentar SÍ vale. */
  atascado: 4108,
  /** No cabe otra sala en este proceso ahora mismo (aforo por coste declarado): se reintenta en un minuto. */
  llena: 4109,
} as const;
export type CodigoDeCierreDeLaLiza = (typeof CIERRE_DE_LA_LIZA)[keyof typeof CIERRE_DE_LA_LIZA];

/** El modo de la fase, como viaja en el suceso `fase`. */
export const CODIGO_DE_MODO = { quieta: 0, calma: 1, encuentro: 2 } as const;

/** Cómo se resolvió un anuncio o una bala (`resuelve.r`, `impacta.r`). */
export const RESULTADO = {
  /** Dio: daño y efecto. */
  da: 1,
  /** Esquiva limpia, dentro de la ventana. */
  limpia: 2,
  /** Esquivada fuera de la ventana limpia, sin premio. */
  esquivada: 3,
  /** Parada por la guardia. */
  parada: 4,
  /** Fallada: el blanco estaba lejos, o se fue, o no había blanco. */
  fallada: 5,
  /** Cortada: el autor quedó fuera de combate antes del impacto. */
  cortada: 6,
} as const;
export type CodigoDeResultado = (typeof RESULTADO)[keyof typeof RESULTADO];

/** Por qué se va un cuerpo (`seva.por`). */
export const MOTIVO_DE_IRSE = {
  /** Una entidad sin vida que no es rematable. */
  cae: 1,
  /** Rematada por un asiento. */
  rematada: 2,
  /** Absorbida por otra entidad que se levantaba. */
  absorbida: 3,
  /** Disuelta al acabar su encuentro o al empezar otra fase (entidades, balas y montones). */
  disuelta: 4,
  /** Se deshace para volver a aparecer en otro sitio, con el mismo número. */
  seDeshace: 5,
  /** Una bala que se paró contra la estructura. */
  choca: 6,
  /** Una bala que llegó a su alcance. */
  alcance: 7,
  /** Un montón que se acabó sin que nadie lo recogiera. */
  caduca: 8,
} as const;
export type CodigoDeIrse = (typeof MOTIVO_DE_IRSE)[keyof typeof MOTIVO_DE_IRSE];

/* ─── LO QUE DICE EL APARATO ─────────────────────────────────────────────── */

/**
 * Lo primero que se dice: quién soy y qué hora es en mi reloj. La llave nunca va en la URL.
 *
 * `c` es el reloj del aparato al mandarlo (ms desde que abrió el canal: casi siempre unas decenas). Con
 * él y la primera ida y vuelta la E/S tiene el desfase ANTES de meter a este asiento en la sala: ver
 * «el primer desfase» en `tipos-de-la-sala.ts`. El primer `eco` va justo detrás.
 *
 * Quien mira sin asiento no tiene llave y en esta versión no entra en la sala: la vista de la mesa le
 * basta. Si un día entra, será con otra versión del `hola`, no con una llave vacía.
 */
export interface Hola {
  readonly t: 'hola';
  readonly v: number;
  readonly llave: string;
  readonly c: number;
}

/** Una acción dentro de un `aqui`: `[id, ms del aparato, número del blanco o 0]`. */
export type AccionDelAparato = readonly [accion: number, ms: number, blanco: number];

/**
 * DÓNDE ESTOY Y QUÉ HAGO, en mi tic `n`. `x`, `z` en Q16.16; `r` hacia dónde MIRO (0-255, no hacia dónde
 * doy el paso); `m` la marcha (0 quieto); `a` la acción de este tic o `0`.
 *
 * `n` es el reloj del aparato (el de su canal: ver la cabecera) partido en tramos de 50 ms —`floor(ms /
 * 50)`, desde 0— del paso que acaba de simular. No es un contador de mensajes: así la sala lo pasa a SU
 * tic con el desfase (`ticDeLaSala = floor((n·50 − desfase) / 50)`) y una bala se juzga contra el sitio
 * que el blanco declaró para ese tic. Crece siempre dentro de un canal; la sala tira el `aqui` cuyo `n`
 * no supera al último de ESE canal.
 */
export interface Aqui {
  readonly t: 'aqui';
  readonly n: number;
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly m: number;
  readonly a: 0 | AccionDelAparato;
}

/** Para medir la ida y vuelta: `c` es mi reloj en ms al mandarlo. Uno cada `ECO_CADA_MS`. */
export interface EcoDelAparato {
  readonly t: 'eco';
  readonly c: number;
}

/** Un aviso a los demás: su clase declarada y a qué número de cuerpo apunta (0 = a nada). */
export interface AvisoDelAparato {
  readonly t: 'aviso';
  readonly clase: number;
  readonly objetivo: number;
}

export type MensajeDelAparato = Hola | Aqui | EcoDelAparato | AvisoDelAparato;

/* ─── LO QUE DICE LA SALA ────────────────────────────────────────────────── */

/**
 * Ya estás dentro: tu número (1-15), el tic de la sala, dónde apareces (Q16.16) y hacia dónde miras, y
 * cuántos tics por segundo cuenta la sala. Tu `AsientoId` es el de `LizaDeclarada.asientos[yo − 1]`.
 */
export interface Dentro {
  readonly t: 'dentro';
  readonly yo: number;
  readonly k: number;
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly hz: number;
}

/**
 * Una entrada de la foto: `[número, x, z, mira, marcha, estado]`, con `x` y `z` en centésimas de unidad,
 * `mira` 0-255, `marcha` 0-7 y `estado` el id del estado en que está (0 = libre).
 */
export type TuplaDeFoto = readonly [numero: number, x: number, z: number, mira: number, marcha: number, estado: number];

/**
 * Dónde está cada cuerpo en el tic `k` de la sala. Se escribe UNA vez por sala y se manda a todos.
 *
 * Salen TODOS los asientos —los que no tienen canal, quietos donde se quedaron; los que no tienen
 * cuerpo, en su último sitio con el estado de sin cuerpo— y todas las entidades vivas. Ni las balas ni
 * los montones: ésos se pintan desde su suceso, que ya dice todo lo que hace falta.
 */
export interface Foto {
  readonly t: 'foto';
  readonly k: number;
  readonly p: readonly TuplaDeFoto[];
}

/**
 * Lo que pasó en el tic `k` de la sala, para este aparato. `ev` nunca va vacía (el lector la tira); si
 * no cabe en uno, van varios `tic` con el mismo `k` (ver la cabecera).
 */
export interface Tic {
  readonly t: 'tic';
  readonly k: number;
  readonly ev: readonly SucesoDelTic[];
}

/** La respuesta a un `eco`: tu `c` de vuelta, el tic de la sala y sus ms (`k × 50` más lo que lleve del tic). */
export interface EcoDeLaSala {
  readonly t: 'eco';
  readonly c: number;
  readonly k: number;
  readonly ms: number;
}

/**
 * Lo que dijiste en tu tic `n` no vale: vuelves a `(x, z)`, el último sitio bueno, en Q16.16. `n` puede
 * ser 0, como el del `aqui`: la sala que recoloca a quien acaba de conectar y aún no ha dicho nada (una
 * fase que empieza, una reaparición) le corrige su tic 0. Antes el lector pedía `n ≥ 1` y el canal lo
 * mandaba como del 1, que no era verdad: un contrato que obliga a mentir en el cable.
 */
export interface Corrige {
  readonly t: 'corrige';
  readonly n: number;
  readonly x: number;
  readonly z: number;
}

/** Antes de cerrar, por qué, para leerlo en pantalla. */
export interface Fuera {
  readonly t: 'fuera';
  readonly motivo: string;
}

export type MensajeDeLaSala = Dentro | Foto | Tic | EcoDeLaSala | Corrige | Fuera;

/* ─── LOS SUCESOS DE UN TIC ──────────────────────────────────────────────── */

/**
 * `de` lanzó la acción `acc` contra `a` (0 = sin blanco) desde `(x, z)` (centésimas); impacta en el
 * instante `t`, en ms del reloj DE QUIEN LO RECIBE. `id` lo identifica hasta su `resuelve`.
 *
 * `de` 0 es una repetición SIN AUTOR (ver `TurnosDeclarados.repetirTrasTics`): el golpe sale de `(x, z)`
 * sin cuerpo que lo lance. No se nombra al autor del original porque puede haberse ido y su número
 * puede ser ya de otro. El sitio va siempre, también con autor: la foto llega 150 ms atrás, y el gesto
 * del golpe se pinta desde donde se lanzó, no desde donde se interpola.
 */
export interface SucesoAnuncio {
  readonly e: 'anuncio';
  readonly id: number;
  readonly de: number;
  readonly a: number;
  readonly acc: number;
  readonly t: number;
  readonly x: number;
  readonly z: number;
}

/** El anuncio `id` se resolvió así (`RESULTADO`): `dano` hecho, y el blanco se queda con `vida`. */
export interface SucesoResuelve {
  readonly e: 'resuelve';
  readonly id: number;
  readonly r: CodigoDeResultado;
  readonly dano: number;
  readonly vida: number;
}

/** La bala `bala` alcanzó a `a` (`RESULTADO`: da, limpia o esquivada). Si dio, la bala se acaba ahí. */
export interface SucesoImpacta {
  readonly e: 'impacta';
  readonly bala: number;
  readonly a: number;
  readonly r: CodigoDeResultado;
  readonly dano: number;
  readonly vida: number;
}

/** El cuerpo `a` entra en el estado `est` (0 = libre) durante `tics`, los `into` primeros intocable. */
export interface SucesoEstado {
  readonly e: 'estado';
  readonly a: number;
  readonly est: number;
  readonly tics: number;
  readonly into: number;
}

/**
 * El cuerpo `a` es empujado hacia el rumbo `r` y recorre `d` centésimas. `caja` es la caja de la
 * estructura contra la que se paró —su posición en `mundo.suelo.cuerpos` MÁS UNO— o 0 si no chocó: con
 * ella todos los aparatos pintan la marca del choque en la misma, sin adivinarla. Si `a` es TU asiento,
 * eres tú quien se mueve: tu aparato hace ese recorrido con `geometria.trayectoria`, y la sala se lo
 * admite con la distancia extra del estado.
 */
export interface SucesoEmpuja {
  readonly e: 'empuja';
  readonly a: number;
  readonly r: number;
  readonly d: number;
  readonly caja: number;
}

/** Nace la entidad `id` de la clase `clase` en `(x, z)` (centésimas) mirando a `r`. */
export interface SucesoNace {
  readonly e: 'nace';
  readonly id: number;
  readonly clase: number;
  readonly x: number;
  readonly z: number;
  readonly r: number;
}

/**
 * El cuerpo `id` (entidad, bala o montón) se va, por `por` (`MOTIVO_DE_IRSE`), por obra de `quien`: el
 * asiento que la remata, la entidad que la absorbe (lo que el aparato pinta yendo de una a otra), o 0 si
 * no es obra de nadie.
 */
export interface SucesoSeVa {
  readonly e: 'seva';
  readonly id: number;
  readonly por: CodigoDeIrse;
  readonly quien: number;
}

/**
 * `de` dispara la bala `id` del proyectil `p` desde `(x, z)` (centésimas) hacia el rumbo `r`; sale en
 * el instante `t`, en ms del reloj de QUIEN LO RECIBE. Con eso y la declaración se pinta en su sitio
 * verdadero, con la misma tabla.
 */
export interface SucesoBala {
  readonly e: 'bala';
  readonly id: number;
  readonly de: number;
  readonly p: number;
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly t: number;
}

/**
 * LA LÍNEA DE APUNTADO: la entidad `de` apunta su proyectil `p` desde `(x, z)` (centésimas) al cuerpo
 * `a` —su blanco: la línea le sigue— hasta el instante `t`, en ms del reloj de QUIEN LO RECIBE. En `t`
 * la línea se fija donde esté `a` y sale la ráfaga: una `bala` por bala, la primera en ese instante, con
 * la velocidad y el alcance de `p` en la declaración. `a` 0 es que LO DEJA sin disparar —su blanco se
 * fue, se quedó ausente o entró en su premio; la aturdieron, cayó, contestó con su guardia—: la línea se
 * quita, y `t` va a 0. Si `de` se va (`seva`), su línea se va con ella. Una entidad apunta una vez cada
 * vez: otro `apunta` suyo sustituye al anterior.
 *
 * Es lo único que la sala dice de un disparo antes de que salga. Sin ella los `apuntarTics` de la
 * declaración (12 en el primer juego que dispara: 0,6 s) pasaban en silencio y la primera noticia era
 * la bala.
 */
export interface SucesoApunta {
  readonly e: 'apunta';
  readonly de: number;
  readonly a: number;
  readonly p: number;
  readonly x: number;
  readonly z: number;
  readonly t: number;
}

/** El asiento `a` lleva ahora `n` del portable `p`. */
export interface SucesoCarga {
  readonly e: 'carga';
  readonly a: number;
  readonly p: number;
  readonly n: number;
}

/** Aparece el montón `id` con `n` del portable `p` en `(x, z)` (centésimas). */
export interface SucesoMonton {
  readonly e: 'monton';
  readonly id: number;
  readonly p: number;
  readonly n: number;
  readonly x: number;
  readonly z: number;
}

/** El asiento `a` coge `n` del montón `id`, en el que quedan `queda` (con 0, el montón ya no está). */
export interface SucesoRecoge {
  readonly e: 'recoge';
  readonly id: number;
  readonly a: number;
  readonly n: number;
  readonly queda: number;
}

/** El asiento `a` sale por la zona `zona`: se queda sin cuerpo y cuenta como salido. */
export interface SucesoSale {
  readonly e: 'sale';
  readonly a: number;
  readonly zona: number;
}

/** El asiento `de` avisa de la clase `clase` sobre el cuerpo `obj` (0 = sobre nada). */
export interface SucesoAviso {
  readonly e: 'aviso';
  readonly de: number;
  readonly clase: number;
  readonly obj: number;
}

/**
 * La sala está en la fase `clave`, en el modo `modo` (`CODIGO_DE_MODO`) y dentro del límite `limite`.
 * Llega ANTES que la vista nueva por el sondeo de la mesa: si tu declaración tiene otra clave, tu vista
 * va atrasada.
 *
 * Lleva lo que le queda a cada reloj EN EL TIC `k` de su `tic`, que es con lo que el aparato los pinta:
 * `relojMs`, los ms del reloj de fase (0 = no hay, o ya venció); `encuentroTics`, los tics del reloj del
 * encuentro (0 = no hay encuentro, o ya acabó). La sala lo manda al empezar cada fase, al acabar su
 * encuentro (con `encuentroTics` 0) y en cada puesta al día: quien entra a media fase ve el reloj bien
 * sin saber cuándo empezó.
 */
export interface SucesoFase {
  readonly e: 'fase';
  readonly clave: string;
  readonly modo: number;
  readonly limite: number;
  readonly relojMs: number;
  readonly encuentroTics: number;
}

/** La zona de acción `id` está activa `tics` tics más (0 = se apaga). */
export interface SucesoZona {
  readonly e: 'zona';
  readonly id: number;
  readonly tics: number;
}

/**
 * Cómo va el asiento `a`: vida, medidor, puntos de la fase y multiplicador (Q16.16, `UNO` = ×1; ver
 * `PuntosDeclarados`).
 */
export interface SucesoCuenta {
  readonly e: 'cuenta';
  readonly a: number;
  readonly vida: number;
  readonly medidor: number;
  readonly puntos: number;
  readonly mult: number;
}

/** El equipo tiene ahora `n` de su recurso. */
export interface SucesoRecurso {
  readonly e: 'recurso';
  readonly n: number;
}

export type SucesoDelTic =
  | SucesoAnuncio
  | SucesoResuelve
  | SucesoImpacta
  | SucesoEstado
  | SucesoEmpuja
  | SucesoNace
  | SucesoSeVa
  | SucesoBala
  | SucesoApunta
  | SucesoCarga
  | SucesoMonton
  | SucesoRecoge
  | SucesoSale
  | SucesoAviso
  | SucesoFase
  | SucesoZona
  | SucesoCuenta
  | SucesoRecurso;

/* ─── CONVERSIONES ───────────────────────────────────────────────────────── */

/**
 * De Q16.16 a centésimas de unidad, redondeando al más cercano. `q·100/2^16` es exacto en coma
 * flotante (dividir por una potencia de dos lo es) y `Math.round` está fijado: da lo mismo en todos
 * los motores.
 */
export function aCentesimas(q: number): number {
  return Math.round((q * 100) / UNO);
}

/** De centésimas de unidad a Q16.16, redondeando. Para pintar: lo que sale de aquí no se arbitra. */
export function deCentesimas(c: number): number {
  return Math.round((c * UNO) / 100);
}

/* ─── LOS LECTORES ESTRICTOS ─────────────────────────────────────────────── */

function esEntero(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/** Un objeto llano con EXACTAMENTE estas claves: ni una de más ni una de menos. */
function conClaves(v: unknown, claves: readonly string[]): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const suyas = Object.keys(v);
  if (suyas.length !== claves.length) return false;
  for (const c of claves) if (!Object.prototype.hasOwnProperty.call(v, c)) return false;
  return true;
}

/** ¿Es todo ASCII imprimible? Así las letras son bytes (ver la cabecera). */
function soloAscii(texto: string): boolean {
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    if (c < 32 || c > 126) return false;
  }
  return true;
}

function analizar(texto: string): unknown {
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return undefined;
  }
}

const esCoordenada = (v: unknown): v is number => esEntero(v, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA);
const esCentesima = (v: unknown): v is number => esEntero(v, -TOPE_DE_CENTESIMAS, TOPE_DE_CENTESIMAS);
const esRumbo = (v: unknown): v is number => esEntero(v, 0, 255);
const esId = (v: unknown): v is number => esEntero(v, 1, TOPE_DE_ID);
const esNumero = (v: unknown): v is number => esEntero(v, 1, TOPE_DE_NUMERO);
const esAsiento = (v: unknown): v is number => esEntero(v, 1, TOPE_DE_ASIENTOS);
const esCantidad = (v: unknown): v is number => esEntero(v, 0, TOPE_DE_CANTIDAD);
const esInstante = (v: unknown): v is number => esEntero(v, -TOPE_DE_MS, TOPE_DE_MS);
const esTicDeLaSala = (v: unknown): v is number => esEntero(v, 0, Number.MAX_SAFE_INTEGER);
const esLlave = (v: unknown): v is string => typeof v === 'string' && v.length >= 1 && v.length <= 64 && soloAscii(v);

function leerAccion(v: unknown): 0 | AccionDelAparato | null {
  if (v === 0) return 0;
  if (!Array.isArray(v) || v.length !== 3) return null;
  const [accion, ms, blanco] = v as unknown[];
  if (!esId(accion) || !esEntero(ms, 0, TOPE_DE_MS) || !esEntero(blanco, 0, TOPE_DE_NUMERO)) return null;
  return [accion, ms, blanco];
}

/**
 * LO QUE MANDA UN APARATO, leído por la sala. `null` ante CUALQUIER cosa que no sea exactamente un
 * mensaje bien formado: una clave de más o de menos, un número con decimales o fuera de rango, un
 * texto de más de `TOPE_DE_SUBIDA_BYTES`, una letra que no sea ASCII imprimible. Un aparato es un
 * entorno hostil y aquí no se adivina lo que quiso decir.
 */
export function leerMensajeDelAparato(texto: string): MensajeDelAparato | null {
  if (typeof texto !== 'string' || texto.length > TOPE_DE_SUBIDA_BYTES || !soloAscii(texto)) return null;
  const v = analizar(texto);
  if (conClaves(v, ['t', 'v', 'llave', 'c'])) {
    if (v.t !== 'hola' || !esEntero(v.v, 0, 65535) || !esLlave(v.llave) || !esEntero(v.c, 0, TOPE_DE_MS)) return null;
    return { t: 'hola', v: v.v, llave: v.llave, c: v.c };
  }
  if (conClaves(v, ['t', 'n', 'x', 'z', 'r', 'm', 'a'])) {
    if (v.t !== 'aqui' || !esEntero(v.n, 0, TOPE_DE_TIC_DEL_APARATO)) return null;
    if (!esCoordenada(v.x) || !esCoordenada(v.z) || !esRumbo(v.r) || !esEntero(v.m, 0, TOPE_DE_MARCHA)) return null;
    const a = leerAccion(v.a);
    if (a === null) return null;
    return { t: 'aqui', n: v.n, x: v.x, z: v.z, r: v.r, m: v.m, a };
  }
  if (conClaves(v, ['t', 'c'])) {
    if (v.t !== 'eco' || !esEntero(v.c, 0, TOPE_DE_MS)) return null;
    return { t: 'eco', c: v.c };
  }
  if (conClaves(v, ['t', 'clase', 'objetivo'])) {
    if (v.t !== 'aviso' || !esId(v.clase) || !esEntero(v.objetivo, 0, TOPE_DE_NUMERO)) return null;
    return { t: 'aviso', clase: v.clase, objetivo: v.objetivo };
  }
  return null;
}

function leerTupla(v: unknown): TuplaDeFoto | null {
  if (!Array.isArray(v) || v.length !== 6) return null;
  const [numero, x, z, mira, marcha, estado] = v as unknown[];
  if (!esNumero(numero) || !esCentesima(x) || !esCentesima(z) || !esRumbo(mira)) return null;
  if (!esEntero(marcha, 0, TOPE_DE_MARCHA) || !esEntero(estado, 0, TOPE_DE_ID)) return null;
  return [numero, x, z, mira, marcha, estado];
}

function esResultado(v: unknown): v is CodigoDeResultado {
  return esEntero(v, RESULTADO.da, RESULTADO.cortada);
}

function esMotivo(v: unknown): v is CodigoDeIrse {
  return esEntero(v, MOTIVO_DE_IRSE.cae, MOTIVO_DE_IRSE.caduca);
}

/** Un suceso de un `tic`, leído con las mismas exigencias. `null` si no es exactamente uno conocido. */
export function leerSuceso(v: unknown): SucesoDelTic | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const e = (v as { e?: unknown }).e;
  switch (e) {
    case 'anuncio':
      if (!conClaves(v, ['e', 'id', 'de', 'a', 'acc', 't', 'x', 'z'])) return null;
      if (!esEntero(v.id, 1, TOPE_DE_MS) || !esEntero(v.de, 0, TOPE_DE_NUMERO) || !esEntero(v.a, 0, TOPE_DE_NUMERO) || !esId(v.acc)) return null;
      if (!esInstante(v.t) || !esCentesima(v.x) || !esCentesima(v.z)) return null;
      return { e, id: v.id, de: v.de, a: v.a, acc: v.acc, t: v.t, x: v.x, z: v.z };
    case 'resuelve':
      if (!conClaves(v, ['e', 'id', 'r', 'dano', 'vida'])) return null;
      if (!esEntero(v.id, 1, TOPE_DE_MS) || !esResultado(v.r) || !esCantidad(v.dano) || !esCantidad(v.vida)) return null;
      return { e, id: v.id, r: v.r, dano: v.dano, vida: v.vida };
    case 'impacta':
      if (!conClaves(v, ['e', 'bala', 'a', 'r', 'dano', 'vida'])) return null;
      if (!esEntero(v.bala, PRIMER_NUMERO_DE_ENTIDAD, TOPE_DE_NUMERO) || !esNumero(v.a) || !esResultado(v.r) || !esCantidad(v.dano) || !esCantidad(v.vida)) return null;
      return { e, bala: v.bala, a: v.a, r: v.r, dano: v.dano, vida: v.vida };
    case 'estado':
      if (!conClaves(v, ['e', 'a', 'est', 'tics', 'into'])) return null;
      if (!esNumero(v.a) || !esEntero(v.est, 0, TOPE_DE_ID) || !esEntero(v.tics, 0, TOPE_DE_TICS)) return null;
      if (!esEntero(v.into, 0, v.tics)) return null;
      /* Libre es libre: sin duración ni intocable. Un «libre durante 12 tics» no dice nada. */
      if (v.est === 0 && v.tics !== 0) return null;
      if (v.est !== 0 && v.tics === 0) return null;
      return { e, a: v.a, est: v.est, tics: v.tics, into: v.into };
    case 'empuja':
      if (!conClaves(v, ['e', 'a', 'r', 'd', 'caja'])) return null;
      if (!esNumero(v.a) || !esRumbo(v.r) || !esEntero(v.d, 0, 2 * TOPE_DE_CENTESIMAS) || !esEntero(v.caja, 0, TOPE_DE_CAJAS)) return null;
      return { e, a: v.a, r: v.r, d: v.d, caja: v.caja };
    case 'nace':
      if (!conClaves(v, ['e', 'id', 'clase', 'x', 'z', 'r'])) return null;
      if (!esEntero(v.id, PRIMER_NUMERO_DE_ENTIDAD, TOPE_DE_NUMERO) || !esId(v.clase) || !esCentesima(v.x) || !esCentesima(v.z) || !esRumbo(v.r)) return null;
      return { e, id: v.id, clase: v.clase, x: v.x, z: v.z, r: v.r };
    case 'seva':
      if (!conClaves(v, ['e', 'id', 'por', 'quien'])) return null;
      if (!esEntero(v.id, PRIMER_NUMERO_DE_ENTIDAD, TOPE_DE_NUMERO) || !esMotivo(v.por) || !esEntero(v.quien, 0, TOPE_DE_NUMERO)) return null;
      return { e, id: v.id, por: v.por, quien: v.quien };
    case 'bala':
      if (!conClaves(v, ['e', 'id', 'de', 'p', 'x', 'z', 'r', 't'])) return null;
      if (!esEntero(v.id, PRIMER_NUMERO_DE_ENTIDAD, TOPE_DE_NUMERO) || !esNumero(v.de) || !esId(v.p)) return null;
      if (!esCentesima(v.x) || !esCentesima(v.z) || !esRumbo(v.r) || !esInstante(v.t)) return null;
      return { e, id: v.id, de: v.de, p: v.p, x: v.x, z: v.z, r: v.r, t: v.t };
    case 'apunta':
      if (!conClaves(v, ['e', 'de', 'a', 'p', 'x', 'z', 't'])) return null;
      if (!esEntero(v.de, PRIMER_NUMERO_DE_ENTIDAD, TOPE_DE_NUMERO) || !esEntero(v.a, 0, TOPE_DE_NUMERO) || !esId(v.p)) return null;
      if (!esCentesima(v.x) || !esCentesima(v.z) || !esInstante(v.t)) return null;
      /* Dejarlo no tiene instante: una línea que se quita con un `t` es una línea que no dice qué pasa. */
      if (v.a === 0 && v.t !== 0) return null;
      return { e, de: v.de, a: v.a, p: v.p, x: v.x, z: v.z, t: v.t };
    case 'carga':
      if (!conClaves(v, ['e', 'a', 'p', 'n'])) return null;
      if (!esAsiento(v.a) || !esId(v.p) || !esCantidad(v.n)) return null;
      return { e, a: v.a, p: v.p, n: v.n };
    case 'monton':
      if (!conClaves(v, ['e', 'id', 'p', 'n', 'x', 'z'])) return null;
      if (!esEntero(v.id, PRIMER_NUMERO_DE_ENTIDAD, TOPE_DE_NUMERO) || !esId(v.p) || !esEntero(v.n, 1, TOPE_DE_CANTIDAD)) return null;
      if (!esCentesima(v.x) || !esCentesima(v.z)) return null;
      return { e, id: v.id, p: v.p, n: v.n, x: v.x, z: v.z };
    case 'recoge':
      if (!conClaves(v, ['e', 'id', 'a', 'n', 'queda'])) return null;
      if (!esEntero(v.id, PRIMER_NUMERO_DE_ENTIDAD, TOPE_DE_NUMERO) || !esAsiento(v.a) || !esEntero(v.n, 1, TOPE_DE_CANTIDAD) || !esCantidad(v.queda)) return null;
      return { e, id: v.id, a: v.a, n: v.n, queda: v.queda };
    case 'sale':
      if (!conClaves(v, ['e', 'a', 'zona'])) return null;
      if (!esAsiento(v.a) || !esId(v.zona)) return null;
      return { e, a: v.a, zona: v.zona };
    case 'aviso':
      if (!conClaves(v, ['e', 'de', 'clase', 'obj'])) return null;
      if (!esAsiento(v.de) || !esId(v.clase) || !esEntero(v.obj, 0, TOPE_DE_NUMERO)) return null;
      return { e, de: v.de, clase: v.clase, obj: v.obj };
    case 'fase':
      if (!conClaves(v, ['e', 'clave', 'modo', 'limite', 'relojMs', 'encuentroTics'])) return null;
      if (!esClaveCorta(v.clave)) return null;
      if (!esEntero(v.modo, CODIGO_DE_MODO.quieta, CODIGO_DE_MODO.encuentro) || !esId(v.limite)) return null;
      if (!esEntero(v.relojMs, 0, TOPE_DE_TICS * MS_POR_TIC) || !esEntero(v.encuentroTics, 0, TOPE_DE_TICS)) return null;
      /* Sólo el modo encuentro tiene encuentro: un reloj de encuentro en calma no es de nada. */
      if (v.modo !== CODIGO_DE_MODO.encuentro && v.encuentroTics !== 0) return null;
      return { e, clave: v.clave, modo: v.modo, limite: v.limite, relojMs: v.relojMs, encuentroTics: v.encuentroTics };
    case 'zona':
      if (!conClaves(v, ['e', 'id', 'tics'])) return null;
      if (!esId(v.id) || !esEntero(v.tics, 0, TOPE_DE_TICS)) return null;
      return { e, id: v.id, tics: v.tics };
    case 'cuenta':
      if (!conClaves(v, ['e', 'a', 'vida', 'medidor', 'puntos', 'mult'])) return null;
      if (!esAsiento(v.a) || !esCantidad(v.vida) || !esCantidad(v.medidor) || !esEntero(v.puntos, 0, Number.MAX_SAFE_INTEGER)) return null;
      if (!esEntero(v.mult, UNO, TOPE_DE_MULTIPLICADOR)) return null;
      return { e, a: v.a, vida: v.vida, medidor: v.medidor, puntos: v.puntos, mult: v.mult };
    case 'recurso':
      if (!conClaves(v, ['e', 'n'])) return null;
      if (!esCantidad(v.n)) return null;
      return { e, n: v.n };
    default:
      return null;
  }
}

/**
 * LO QUE MANDA LA SALA, leído por el aparato. `null` si no es exactamente un mensaje conocido. Igual de
 * estricto que el otro lado: un lector que perdona una clave de más en la bajada es un aparato que
 * pinta lo que un servidor viejo o roto quiso decir, y eso se depura mal.
 */
export function leerMensajeDeLaSala(texto: string): MensajeDeLaSala | null {
  if (typeof texto !== 'string' || texto.length > TOPE_DE_BAJADA_BYTES) return null;
  const v = analizar(texto);
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const t = (v as { t?: unknown }).t;
  switch (t) {
    case 'dentro':
      if (!conClaves(v, ['t', 'yo', 'k', 'x', 'z', 'r', 'hz'])) return null;
      if (!esAsiento(v.yo) || !esTicDeLaSala(v.k) || !esCoordenada(v.x) || !esCoordenada(v.z) || !esRumbo(v.r) || !esEntero(v.hz, 1, 1000)) return null;
      return { t, yo: v.yo, k: v.k, x: v.x, z: v.z, r: v.r, hz: v.hz };
    case 'foto': {
      if (!conClaves(v, ['t', 'k', 'p'])) return null;
      if (!esTicDeLaSala(v.k) || !Array.isArray(v.p) || v.p.length > TOPE_DE_TUPLAS) return null;
      const p: TuplaDeFoto[] = [];
      const vistos: number[] = [];
      for (const crudo of v.p as unknown[]) {
        const tupla = leerTupla(crudo);
        if (tupla === null) return null;
        /* Un cuerpo dos veces en la misma foto es una foto que no dice dónde está. */
        if (vistos.indexOf(tupla[0]) >= 0) return null;
        vistos.push(tupla[0]);
        p.push(tupla);
      }
      return { t, k: v.k, p };
    }
    case 'tic': {
      if (!conClaves(v, ['t', 'k', 'ev'])) return null;
      if (!esTicDeLaSala(v.k) || !Array.isArray(v.ev) || v.ev.length === 0 || v.ev.length > TOPE_DE_SUCESOS) return null;
      const ev: SucesoDelTic[] = [];
      for (const crudo of v.ev as unknown[]) {
        const s = leerSuceso(crudo);
        if (s === null) return null;
        ev.push(s);
      }
      return { t, k: v.k, ev };
    }
    case 'eco':
      if (!conClaves(v, ['t', 'c', 'k', 'ms'])) return null;
      if (!esEntero(v.c, 0, TOPE_DE_MS) || !esTicDeLaSala(v.k) || !esTicDeLaSala(v.ms)) return null;
      return { t, c: v.c, k: v.k, ms: v.ms };
    case 'corrige':
      if (!conClaves(v, ['t', 'n', 'x', 'z'])) return null;
      if (!esEntero(v.n, 0, TOPE_DE_TIC_DEL_APARATO) || !esCoordenada(v.x) || !esCoordenada(v.z)) return null;
      return { t, n: v.n, x: v.x, z: v.z };
    case 'fuera':
      if (!conClaves(v, ['t', 'motivo'])) return null;
      if (typeof v.motivo !== 'string' || v.motivo.length > 200) return null;
      return { t, motivo: v.motivo };
    default:
      return null;
  }
}

/* ─── LOS ESCRITORES ─────────────────────────────────────────────────────── */

/*
 * ═══ POR QUÉ SE REHACE CADA OBJETO ANTES DE ESCRIBIRLO ═══
 *
 * `JSON.stringify` escribe TODAS las claves propias del objeto que recibe. Un suceso montado con
 * `{ ...lo_que_había, e: 'estado' }` en la sala llevaría al cable las claves que sobraran, y el lector
 * estricto del otro lado lo tiraría entero —el `tic` con él—. Así que cada escritor copia exactamente
 * las claves del contrato, en su orden, y nada más: lo que sale de aquí es lo que el lector admite.
 */

function sucesoLimpio(s: SucesoDelTic): SucesoDelTic {
  switch (s.e) {
    case 'anuncio':
      return { e: s.e, id: s.id, de: s.de, a: s.a, acc: s.acc, t: s.t, x: s.x, z: s.z };
    case 'resuelve':
      return { e: s.e, id: s.id, r: s.r, dano: s.dano, vida: s.vida };
    case 'impacta':
      return { e: s.e, bala: s.bala, a: s.a, r: s.r, dano: s.dano, vida: s.vida };
    case 'estado':
      return { e: s.e, a: s.a, est: s.est, tics: s.tics, into: s.into };
    case 'empuja':
      return { e: s.e, a: s.a, r: s.r, d: s.d, caja: s.caja };
    case 'nace':
      return { e: s.e, id: s.id, clase: s.clase, x: s.x, z: s.z, r: s.r };
    case 'seva':
      return { e: s.e, id: s.id, por: s.por, quien: s.quien };
    case 'bala':
      return { e: s.e, id: s.id, de: s.de, p: s.p, x: s.x, z: s.z, r: s.r, t: s.t };
    case 'apunta':
      return { e: s.e, de: s.de, a: s.a, p: s.p, x: s.x, z: s.z, t: s.t };
    case 'carga':
      return { e: s.e, a: s.a, p: s.p, n: s.n };
    case 'monton':
      return { e: s.e, id: s.id, p: s.p, n: s.n, x: s.x, z: s.z };
    case 'recoge':
      return { e: s.e, id: s.id, a: s.a, n: s.n, queda: s.queda };
    case 'sale':
      return { e: s.e, a: s.a, zona: s.zona };
    case 'aviso':
      return { e: s.e, de: s.de, clase: s.clase, obj: s.obj };
    case 'fase':
      return { e: s.e, clave: s.clave, modo: s.modo, limite: s.limite, relojMs: s.relojMs, encuentroTics: s.encuentroTics };
    case 'zona':
      return { e: s.e, id: s.id, tics: s.tics };
    case 'cuenta':
      return { e: s.e, a: s.a, vida: s.vida, medidor: s.medidor, puntos: s.puntos, mult: s.mult };
    case 'recurso':
      return { e: s.e, n: s.n };
  }
}

/** Un mensaje del aparato, como texto para el cable. */
export function textoDelAparato(m: MensajeDelAparato): string {
  switch (m.t) {
    case 'hola':
      return JSON.stringify({ t: m.t, v: m.v, llave: m.llave, c: m.c });
    case 'aqui':
      return JSON.stringify({ t: m.t, n: m.n, x: m.x, z: m.z, r: m.r, m: m.m, a: m.a === 0 ? 0 : [m.a[0], m.a[1], m.a[2]] });
    case 'eco':
      return JSON.stringify({ t: m.t, c: m.c });
    case 'aviso':
      return JSON.stringify({ t: m.t, clase: m.clase, objetivo: m.objetivo });
  }
}

/** Un mensaje de la sala, como texto para el cable. La foto se escribe una vez y se manda a todos. */
export function textoDeLaSala(m: MensajeDeLaSala): string {
  switch (m.t) {
    case 'dentro':
      return JSON.stringify({ t: m.t, yo: m.yo, k: m.k, x: m.x, z: m.z, r: m.r, hz: m.hz });
    case 'foto':
      return JSON.stringify({ t: m.t, k: m.k, p: m.p.map((e) => [e[0], e[1], e[2], e[3], e[4], e[5]]) });
    case 'tic':
      return JSON.stringify({ t: m.t, k: m.k, ev: m.ev.map(sucesoLimpio) });
    case 'eco':
      return JSON.stringify({ t: m.t, c: m.c, k: m.k, ms: m.ms });
    case 'corrige':
      return JSON.stringify({ t: m.t, n: m.n, x: m.x, z: m.z });
    case 'fuera':
      return JSON.stringify({ t: m.t, motivo: m.motivo });
  }
}
