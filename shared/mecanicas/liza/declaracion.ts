/**
 * LO QUE UNA LIZA DECLARA: el mundo, los cuerpos, los golpes, los enemigos, los encuentros y los
 * veredictos de un arcade de acción que se juega a pie en la sala del servidor.
 *
 * ═══ QUÉ ES LA LIZA, EN UNA PANTALLA ═══
 *
 * Es el módulo HERMANO de Boots on Board para los arcades cuyo modo principal ES la acción. Boots on
 * Board sabe andar por el tablero de una mesa y darse un golpe lento; la Liza añade lo que a aquélla
 * le falta —estados con tiempo, golpes anunciados, esquivas en ventana, guardias, empujones contra la
 * estructura, balas, entidades del servidor con cerebro, encuentros por grupos, zonas que se usan
 * manteniendo, cosas que se llevan, un recurso de equipo y veredictos gruesos para la mesa— en
 * ficheros NUEVOS, sin tocar ni `andar.ts`, ni `mundo.ts`, ni el canal de botas. Los usa; no los edita.
 *
 * Un juego se da de alta en `shared/arcade/juegos/lizas.ts` con UN productor: una función pura que,
 * de la vista pública de la mesa y su código, devuelve una `LizaDeclarada`. La sala del servidor y el
 * aparato la derivan igual —de lo mismo, con la misma función—, así que no viaja por el cable: lo que
 * viaja es la vista, que ya viajaba. Es la misma decisión que `mundo.ts` cuenta en su cabecera, y por
 * la misma razón.
 *
 * ═══ DÓNDE ESTÁ CADA DECLARACIÓN ═══
 *
 * Las letras son las del §11 del documento de diseño que estrena la Liza:
 *
 *   A registro ........................ `shared/arcade/juegos/lizas.ts` (un productor por arcade)
 *   B mundo v2 ........................ `MundoDeLaLiza`
 *   C reglamento del cuerpo ........... `CuerpoDeclarado`, dentro de cada `ReglasDeAsiento`
 *   D estados temporizados ............ `EstadoDeclarado` (qué son) y `PuestaDeEstado` (cuánto duran)
 *   E acciones anunciadas ............. `AccionDeclarada`, `EngancheDeclarado`, `CadenaDeclarada`
 *   F esquiva en ventana .............. `EsquivaDeclarada`
 *   G guardia ......................... `GuardiaDeclarada`
 *   H empuje contra la estructura ..... `EfectoDeclarado.empuje` y `.alChocar`; la trayectoria, en `geometria.ts`
 *   I proyectiles ..................... `ProyectilDeclarado`
 *   J entidades del servidor .......... `ClaseDeEntidad`, `CerebroDeclarado`, `AlCaerDeclarado`
 *   K turnos de ataque ................ `TurnosDeclarados`
 *   L encuentros ...................... `EncuentroDeclarado`, `GrupoDeclarado`
 *   M zonas de acción sostenida ....... `ZonaDeAccionDeclarada`
 *   N portables ....................... `PortableDeclarado`
 *   O recurso, rescate y desconexión .. `EquipoDeclarado`, `RescateDeclarado`
 *   P rol sin cuerpo .................. `SinCuerpoDeclarado` (y `PresenciaDeclarada` para el ausente)
 *   Q avisos .......................... `AvisosDeclarados`
 *   R relojes de fase ................. `FaseDeLaLiza.reloj`
 *   S veredictos ...................... `VeredictosDeclarados` y las cargas `arcade:*` de abajo
 *   T protocolo ....................... `protocolo.ts`
 *   U aforo ........................... `AforoDeLaSala`; el coste y la admisión, en `lizas.ts`
 *   V azar de sala sembrado ........... `FaseDeLaLiza.semilla`
 *
 * Y una que no es de aquel §11, y que entra con su FORMA antes de que la sala la cumpla (hasta entonces la
 * revisión la rechaza entera si no es `null`: ver su cabecera):
 *
 *   W tiro cargado .................... `TiroDeclarado` y `NivelDelTiro`, en `ReglasDeAsiento.tiro`
 *
 * Y las de la liza ABIERTA —una liza grande que se recorre entera, con objetivos repartidos por ella—, que
 * entran en `LizaDeclarada` el día que la sala las cumpla y hasta entonces viven con su forma fijada en «Lo
 * que entra» (ver `AmpliacionDeLaLiza`):
 *
 *   L1 salir de un nudo ............... `EleccionPorNudo`, en `GrupoDeclarado.eleccion`
 *   L2 cuándo salta un grupo .......... `DisparoDeGrupo`, en `GrupoDeclarado.disparo`
 *   L3 rondas de guion ................ `RondasDeclaradas`, en `EncuentroDeclarado.rondas`
 *   L4 un objetivo que se cumple ...... `FinPorObjetivo`, otra forma de `FinDelEncuentro`
 *   L5 varias zonas y sus bandas ...... `ZonaDeAccionAmpliada`, y `EleccionPorBanda`
 *   L6 dónde se nace y se vuelve ...... `FaseDeLaLiza.puntoDeControl` y `EquipoDeclarado.reaparicion.donde`
 *   L7 con qué zona se cerró .......... `CargaDeRondaConZona`
 *   L8 un aviso sobre un nudo ......... `ObjetivoDeAviso`
 *   L9 el golpe al desprevenido ....... `DesprevenidaDeclarada`, en `ClaseDeEntidad.desprevenida`
 *   L10 alcance de blanco y olvido .... `CerebroDeclarado.alcanceDeBlanco` y `EncuentroDeclarado.olvido`: YA
 *                                       ESTÁN en `LizaDeclarada` —la sala los cumple—, con una forma
 *                                       transitoria sin ellos (`CerebroSinAlcance`, `EncuentroSinOlvido`)
 *   L11 racimos ....................... `RacimosDeclarados`, en `EncuentroDeclarado.racimos`
 *   L12 una zona que suelta ........... `EfectoDeLaZona`, y `EncuentroDeclarado.zonasDeAccion`
 *
 * ═══ CADA FASE EMPIEZA DESDE LA DECLARACIÓN, Y ESO ES EL PUNTO DE CONTROL ═══
 *
 * La sala no guarda nada entre fases que la mesa no tenga: cuando llega una declaración con otra
 * `fase.clave`, la sala EMPIEZA esa fase desde lo declarado (ver `FaseDeLaLiza`), y lo que un asiento
 * se lleva de una fase a la siguiente —vida, medidor, lo que lleva— es lo que el productor ponga en su
 * `alEmpezar`, sacado de la vista de la mesa. Por eso un despliegue que mata la sala no pierde más de
 * una fase: la sala que nace después empieza la fase en curso igual que la habría empezado la vieja.
 * Y por eso los veredictos cuentan POR FASE (ver `ContadorDeAsiento`): la mesa suma, la sala no
 * acumula nada que un despliegue pudiera borrar a medias.
 *
 * ═══ POR QUÉ DATOS Y NO FUNCIONES ═══
 *
 * Todo lo de aquí son números, cadenas, listas y objetos llanos: pasa por `canonico.ts` y
 * `problemasDeLaDeclaracion` lo exige. Una declaración que se puede CANONIZAR se puede comparar entre
 * dos motores, fijar en un comprobador y guardar junto a un fallo para reproducirlo. Una que llevara
 * una función dentro —«el daño es `f(nivel)`»— sería código del juego ejecutándose dentro de la sala
 * genérica, y la sala dejaría de poder probarse con una liza de juguete. Lo que depende del nivel o de
 * lo que cada cual eligió lo COMPONE el productor antes, y aquí llega ya hecho número.
 *
 * ═══ LAS UNIDADES, Y POR QUÉ CADA CAMPO DICE LA SUYA ═══
 *
 *   · Longitudes y velocidades: Q16.16 (`UNO` = una unidad del mundo), con `por()`/`entre()` de
 *     `fijo.ts`. Los alias `Longitud` y `Velocidad` están sólo para que la firma diga qué es.
 *   · Tiempos de la SALA: en TICS enteros (`MS_POR_TIC` = 50 ms). Tiempos del APARATO —ventanas que se
 *     juzgan contra el reloj de quien pulsa—: en MILISEGUNDOS enteros. Nunca se mezclan en un campo, y
 *     el sufijo lo dice: `…Tics` o `…Ms`.
 *   · Ángulos: rumbos de la tabla de `andar.ts` (0-255). Los ANCHOS de cono, en rumbos de 0 a 64.
 *   · Probabilidades y multiplicadores: `Proporcion`, Q16.16 (`UNO` = el cien por cien, o ×1).
 *   · La ÚNICA excepción es `mundo.suelo`, que es el `MundoDeclarado` de `mundo.ts` tal cual —en
 *     unidades con coma flotante— porque es lo que `arenaDe` lee y `arenaDe` es el único sitio donde
 *     se toca coma flotante (ver `mundo.ts`). Todo lo demás del mundo va en Q16.16.
 *
 * ═══ LOS IDENTIFICADORES VIAJAN, Y POR ESO SON ENTEROS PEQUEÑOS ═══
 *
 * Acciones, estados, clases de entidad, proyectiles, portables, zonas, límites y clases de aviso se
 * nombran con un entero de 1 a 255 (`IdDeclarado`), porque es lo que va en el cable (`anuncio.acc`, el
 * estado de la foto, `nace.clase`…) y porque el 0 queda libre para decir «ninguno». Los NOMBRES que
 * ve la gente no están aquí: son del juego, que los tiene en su fichero de nombres y los busca por id.
 *
 * ═══ UN REGLAMENTO POR ASIENTO, NO UNO CON EXCEPCIONES ═══
 *
 * Cada asiento trae su reglamento ENTERO (`ReglasDeAsiento`): su cuerpo, sus golpes, su esquiva… ya
 * compuestos con lo que haya elegido. La alternativa —un reglamento base y una lista de «salvo para
 * éste, tal número»— es un segundo contrato dentro del primero, que la sala tendría que resolver en
 * cada juicio y que un productor podría escribir a medias. Seis copias de unos cientos de números no
 * cuestan nada; una excepción mal aplicada cuesta una tarde.
 *
 * ═══ LOS ESTADOS: QUÉ SON, APARTE DE CUÁNTO DURAN ═══
 *
 * Un estado (`EstadoDeclarado`) dice CÓMO SE COMPORTA quien lo tiene: si puede andar, si puede empezar
 * acciones, qué acción lo corta, si un golpe lo interrumpe. CUÁNTO DURA, cuánto de él es intocable,
 * desde cuándo se suelta y cuánta distancia extra le admite el presupuesto de paso lo dice quien lo PONE
 * (`PuestaDeEstado`): la esquiva de un asiento, el efecto de un golpe, la caída. Así un mismo «tocado»
 * dura 12 tics tras un golpe y 24 tras otro sin declarar dos estados, y una mejora que acorta la
 * recuperación de la esquiva cambia la esquiva de ESE asiento y no el catálogo de todos.
 *
 * ═══ NADA OPCIONAL ═══
 *
 * Ningún campo falta a veces: un campo que a veces está es dos contratos, y el segundo no lo comprueba
 * nadie (lo dice `mundo.ts`, y lo exige `canonico.ts`, que rechaza `undefined`). Donde puede no haber
 * nada va `null`, dicho en el tipo; donde un cero significa «nada», lo dice el comentario del campo.
 * La única excepción está dicha y tiene fecha de caducidad: mientras los productores pasan a la forma
 * entera de L10, un cerebro sin alcance de blanco y un encuentro sin olvido son OTRA forma, con su nombre
 * (`CerebroSinAlcance`, `EncuentroSinOlvido`), que se revisa y se juega como «sin tope, sin olvido».
 *
 * ═══ QUÉ NO ESTÁ AQUÍ ═══
 *
 * Ni la sala (`sala.ts` y sus piezas), ni el cable (`protocolo.ts`), ni la geometría (`geometria.ts`).
 * Ni nada que nombre un juego: este fichero es genérico y la batería lo prueba con una liza de juguete.
 */
import { TICS_POR_SEGUNDO } from '../andar';
import { canonico, porQueNoEsCanonico } from '../canonico';
import { UNO } from '../fijo';
import { arenaDe, sePuedeEstar } from '../mundo';
import type { Arena, MundoDeclarado } from '../mundo';
import { CUARTO_DE_VUELTA, TOPE_DE_LA_LIZA, TOPE_DE_RADIO } from './geometria';

/* ─── LAS UNIDADES, CON NOMBRE ───────────────────────────────────────────── */

/** Q16.16, en unidades del mundo (`UNO` = una unidad). */
export type Longitud = number;
/** Q16.16, en unidades del mundo por segundo. */
export type Velocidad = number;
/** Q16.16 sin unidad: `UNO` es el cien por cien, o multiplicar por uno. */
export type Proporcion = number;
/** Tics de la sala, enteros. Un tic son `MS_POR_TIC` milisegundos. */
export type Tics = number;
/** Milisegundos enteros. */
export type Milisegundos = number;
/** Un rumbo de la tabla de `andar.ts` (0-255), o un ancho de cono en rumbos (0-64) donde se diga. */
export type Rumbos = number;
/** Un identificador declarado: entero de 1 a `TOPE_DE_ID`. El 0 es «ninguno» en el cable. */
export type IdDeclarado = number;

/* ─── LAS CONSTANTES DEL CONTRATO ────────────────────────────────────────── */

/** La versión de la FORMA de esta declaración. Se sube si cambia un campo. */
export const VERSION_DE_LA_DECLARACION = 1;

/** Lo que dura un tic de la sala, en milisegundos: veinte tics por segundo, los de `andar.ts`. */
export const MS_POR_TIC = 1000 / TICS_POR_SEGUNDO;

/** El mayor identificador declarado. */
export const TOPE_DE_ID = 255;

/** Cuántos asientos puede tener como mucho una liza: sus números en el cable van del 1 al 15. */
export const TOPE_DE_ASIENTOS = 15;

/** El mayor número de tics que admite un campo de tiempo de la sala: una hora. */
export const TOPE_DE_TICS = 72000;

/** El mayor número de milisegundos que admite una ventana del aparato: diez segundos. */
export const TOPE_DE_VENTANA_MS = 10000;

/** El mayor valor de un contador pequeño (vida, medidor, daño, puntos por suceso, recurso…). */
export const TOPE_DE_CANTIDAD = 1000000;

/**
 * El mayor multiplicador de puntos (el `factor` y el tope del `multiplicador`): ×16, en Q16.16.
 *
 * No es una cifra de diseño sino de aritmética: los puntos de un suceso son `por(por(base, factor),
 * multiplicador)` y `por()` devuelve un entero de 32 bits. Con la base en `TOPE_DE_CANTIDAD` y los dos
 * a ×16, el resultado es 2,6·10^8, que cabe; a ×100 daba la vuelta en silencio.
 */
export const TOPE_DE_MULTIPLICADOR = 16 * UNO;

/**
 * LOS TOPES DEL AFORO, y por qué son éstos: lo que vive en la sala viaja entero en la foto y en la
 * puesta al día de quien entra (ver `Bienvenida` en `tipos-de-la-sala.ts`), y los dos mensajes tienen
 * tope en el cable. Con estos números la peor puesta al día —quince asientos y el aforo lleno— cabe en
 * un `tic` (`verify:liza-protocolo` hace la cuenta con los topes de `protocolo.ts`). Un juego que
 * necesite más no sube estos números a ojo: sube el cable y rehace la cuenta.
 */
export const TOPE_DE_ENTIDADES = 64;
export const TOPE_DE_BALAS = 32;
export const TOPE_DE_MONTONES = 32;
/** Cuántos portables distintos puede declarar una liza (cada uno es una `carga` por asiento en la puesta al día). */
export const TOPE_DE_PORTABLES = 4;

/** Cuántas columnas puede llevar cada fila de `cuentas` en un `arcade:ronda`. */
export const TOPE_DE_COLUMNAS = 24;

/**
 * Lo más que pesa la carga de un movimiento en la mesa, en bytes de su forma canónica: el
 * `TOPE_CARGA_BYTES` de `server/src/arcade/presupuesto.ts`, copiado porque `shared/` no importa del
 * servidor. `verify:liza-protocolo` comprueba que los dos siguen valiendo lo mismo. Un `arcade:ronda`
 * que pasara de aquí lo rechazaría la mesa y la ronda se perdería entera.
 */
export const TOPE_DE_CARGA_DE_LA_MESA = 8 * 1024;

/**
 * El lado de casilla del suelo, en unidades del mundo: de un dieciseisavo a 64. Por abajo, porque
 * `arenaDe` lo pasa a Q16.16 y un lado que redondea a 0 es una división por cero en cada consulta; por
 * arriba, porque una casilla más grande que la liza no dice nada.
 */
export const LADO_MINIMO = 1 / 16;
export const LADO_MAXIMO = 64;

/**
 * Cuántas casillas puede ocupar el rectángulo del suelo: 2^20. `arenaDe` reserva un byte por casilla
 * de ese rectángulo; sin tope, un suelo de dos casillas en esquinas opuestas con un lado pequeño es un
 * cuarto de gigabyte reservado por una declaración.
 */
export const TOPE_DE_CASILLAS = 1048576;

/**
 * Cuántas cajas puede tener la estructura. La prueba de losa las recorre todas en cada pregunta (ver
 * `primeraLosa` en `geometria.ts`), y el suceso `empuja` nombra la caja contra la que chocó.
 */
export const TOPE_DE_CAJAS = 4096;

/** La clase de una caja de la estructura. `baja` se reserva para lo que un día se salte. */
export const CLASE_DE_CAJA = { alta: 1, baja: 2 } as const;

/*
 * LOS TOPES DE LA LIZA ABIERTA (L1-L12). Viajan en el cable —`disparo.g`, `disparo.ro`, `nace.ro`, el
 * `objetivo` de un aviso sobre un nudo— y por eso tienen tope aquí y no en cada juego.
 */
/** Cuántos grupos puede tener un encuentro: su número en `disparo.g` va del 1 al 64. */
export const TOPE_DE_GRUPOS = 64;
/** Cuántas rondas de guion puede tener un encuentro: su número en `nace.ro` y `disparo.ro` va del 1 al 32. */
export const TOPE_DE_RONDAS = 32;
/** Cuántos miembros puede llevar una ronda. */
export const TOPE_DE_MIEMBROS = 6;
/**
 * Cuántos nudos puede tener el grafo: el `objetivo` de un aviso sobre un nudo es su índice más uno, y el
 * `objetivo` del cable va de 0 a 65.535 (`TOPE_DE_NUMERO` de `protocolo.ts`).
 */
export const TOPE_DE_NUDOS = 65535;
/** Cuántas zonas de acción puede haber activas a la vez, y cuántas bandas de distancia (una por activa). */
export const TOPE_DE_BANDAS = 3;

/** Cuántos niveles puede tener un tiro cargado (W): una tabla corta que el aparato también lee entera. */
export const TOPE_DE_NIVELES_DEL_TIRO = 8;

/* ─── B · EL MUNDO ───────────────────────────────────────────────────────── */

/** Una caja alineada con los ejes, en Q16.16. `x0 < x1` y `z0 < z1`. */
export interface CajaDeLaLiza {
  readonly x0: Longitud;
  readonly z0: Longitud;
  readonly x1: Longitud;
  readonly z1: Longitud;
}

/**
 * Una zona con nombre del mundo: por dónde salen las entidades, dónde se imprimen, cuáles son las
 * candidatas a zona de acción… `clase` es una etiqueta libre del juego (1-255) con la que los grupos
 * de un encuentro y las zonas de acción eligen «una de éstas», sorteada con el azar de la sala.
 */
export interface ZonaDelMundo {
  /** 1-255, único: lo que viaja en `sale.zona` y en el suceso `zona`. */
  readonly id: IdDeclarado;
  readonly clase: number;
  readonly caja: CajaDeLaLiza;
}

/**
 * Un rectángulo dentro del cual se juega en una fase. Lo elige `FaseDeLaLiza.limite`. Un cuerpo está
 * DENTRO si su centro lo está, bordes incluidos (`x0 ≤ x ≤ x1` y `z0 ≤ z ≤ z1`): no es una caja con la
 * que se choca sino una regla de la sala, y un sitio fuera es un sitio que no se acepta.
 */
export interface LimiteDelMundo {
  readonly id: IdDeclarado;
  readonly caja: CajaDeLaLiza;
}

/** Un nudo del grafo de navegación, en Q16.16. Su identidad es su posición en la lista. */
export interface NudoDelGrafo {
  readonly x: Longitud;
  readonly z: Longitud;
}

/**
 * Por dónde navegan las entidades cuando no hay línea recta: nudos y aristas entre ellos. Las
 * aristas son pares de ÍNDICES de nudo, sin sentido (se anda en los dos), sin bucles ni repetidas.
 */
export interface GrafoDelMundo {
  readonly nudos: readonly NudoDelGrafo[];
  readonly aristas: readonly (readonly [number, number])[];
}

/**
 * Para qué sirve un sitio de nacer: `asiento`, donde aparece cada asiento al entrar (el asiento `i`
 * usa el sitio `i` módulo cuántos haya); `reaparicion`, donde vuelve quien cayó y pagó el recurso.
 */
export type PapelDeNacer = 'asiento' | 'reaparicion';

/**
 * Un sitio de nacer, en Q16.16, y hacia dónde se mira (rumbo 0-255). Tiene que ser un sitio donde se
 * puede ESTAR —suelo y sin estructura, con el radio de cualquier asiento: `sePuedeEstar`— y dentro del
 * límite de la fase. `problemasDeLaDeclaracion` lo exige: quien aparece dentro de una caja o fuera del
 * límite recibe una corrección en su primer paso y no sale de ahí.
 */
export interface SitioDeNacer {
  readonly papel: PapelDeNacer;
  readonly x: Longitud;
  readonly z: Longitud;
  readonly rumbo: Rumbos;
}

/**
 * EL MUNDO DE LA LIZA (declaración B): el `MundoDeclarado` de `mundo.ts` más lo que la sala necesita
 * además —clases de caja, zonas, límites, el grafo y los sitios de nacer por papel—.
 */
export interface MundoDeLaLiza {
  /** Cuántos metros mide una unidad del mundo, en Q16.16 (`UNO` = un metro). Sólo para pintar y sonar. */
  readonly metrosPorUnidad: Proporcion;
  /**
   * El suelo y la ESTRUCTURA, con el contrato de `mundo.ts` tal cual: de aquí sale la `Arena` con
   * `arenaDeLaLiza`, la misma en la sala y en el aparato, y con ella `sePuedeEstar`, `unPaso` y
   * `seAndaEnRecta`. Sus `cuerpos` son TODAS las cajas con las que se choca.
   *
   * `suelo.nace` va VACÍO: los sitios de nacer de la liza tienen papel y van en `nace`. Dos listas de
   * sitios de nacer serían dos respuestas a «¿dónde aparezco?»; `problemasDeLaDeclaracion` lo exige.
   */
  readonly suelo: MundoDeclarado;
  /** La clase de cada caja de `suelo.cuerpos`, en el mismo orden (`CLASE_DE_CAJA`). */
  readonly clasesDeCaja: readonly number[];
  readonly zonas: readonly ZonaDelMundo[];
  readonly limites: readonly LimiteDelMundo[];
  readonly grafo: GrafoDelMundo;
  readonly nace: readonly SitioDeNacer[];
}

/* ─── D · LOS ESTADOS ────────────────────────────────────────────────────── */

/**
 * CÓMO SE COMPORTA QUIEN ESTÁ EN UN ESTADO (declaración D). Cuánto dura lo dice quien lo pone: ver
 * `PuestaDeEstado` y la cabecera. Un cuerpo está en un solo estado a la vez, o en ninguno («libre»,
 * el 0 de la foto).
 */
export interface EstadoDeclarado {
  /** 1-255: lo que viaja en la foto y en el suceso `estado`. */
  readonly id: IdDeclarado;
  /** No anda por su cuenta: su presupuesto de paso es 0, salvo la `distanciaExtra` de la puesta. */
  readonly bloqueaPaso: boolean;
  /**
   * No empieza acciones, salvo las de `cancelaCon` (en cualquier tic) y, desde el tic
   * `soltableDesdeTic` de su puesta, cualquiera. La que empiece así TERMINA el estado. Un estado que
   * no bloquea deja empezar lo que sea y NO se termina por ello (quien ataca en él sigue en él).
   *
   * LA ESQUIVA TAMBIÉN: en un estado que no bloquea se esquiva SIN SALIR de él. La esquiva cuenta —para la
   * ventana, para la torpe, para las `primeras`— y desplaza —su distancia extra se admite—, pero no pone
   * su estado encima: el cuerpo sigue en el suyo, con su intocable y lo que se pueda hacer en él. Si lo
   * pusiera, esquivar dentro del premio de una limpia lo acabaría y se perdería lo que el premio da.
   */
  readonly bloqueaAccion: boolean;
  /** Acciones (por id) que se pueden empezar en este estado y que, al empezar, lo terminan. */
  readonly cancelaCon: readonly IdDeclarado[];
  /** Recibir daño lo termina (rematar, rescatar o usar una zona se cortan con un golpe). */
  readonly seCortaConDano: boolean;
}

/**
 * QUIÉN PONE UN ESTADO DICE CUÁNTO DURA. Todo lo que mete a un cuerpo en un estado lleva una de éstas.
 */
export interface PuestaDeEstado {
  /** Qué estado (id de `LizaDeclarada.estados`). */
  readonly estado: IdDeclarado;
  /** Cuántos tics dura, desde el tic en que empieza (≥ 1). */
  readonly tics: Tics;
  /**
   * Cuántos de sus PRIMEROS tics es intocable (0 = ninguno; como mucho `tics`). Intocable es que un
   * impacto que cae en ese tiempo —en tics de la SALA— no da: lo usan el remate, la ruptura, la
   * reaparición, el premio de una esquiva limpia… La esquiva NO: la esquiva se juzga por su ventana en
   * el reloj del aparato (ver `EsquivaDeclarada`) y su puesta lleva aquí un 0. Que el intocable empiece
   * siempre en el primer tic no es una simplificación: ningún caso de uso lo empieza más tarde, y un
   * campo `desde` que siempre vale 0 es un campo que nadie lee.
   */
  readonly intocableTics: Tics;
  /**
   * LA RECUPERACIÓN QUE SE CORTA: desde qué tic de este estado (0 = el primero) se puede empezar
   * CUALQUIER acción aunque el estado las bloquee, y empezarla lo termina. Una esquiva de nueve tics
   * que deja golpear desde el sexto lleva `tics: 9, soltableDesdeTic: 6`; una con dos tics menos de
   * recuperación, `soltableDesdeTic: 4`. Igual a `tics` = no se suelta: dura entero. En un estado que no
   * bloquea acciones no pesa, y va igual a `tics` (`problemasDeLaDeclaracion` lo exige: un número que no
   * pesa pero admite cualquier valor es un número que alguien acaba leyendo).
   */
  readonly soltableDesdeTic: Tics;
  /**
   * Cuánta distancia MÁS que su presupuesto de paso admite la sala a este cuerpo mientras dura (la
   * esquiva que desplaza, el empujón que recibe…). Los estados con distancia extra suspenden además el
   * presupuesto largo. 0 = ninguna.
   */
  readonly distanciaExtra: Longitud;
}

/* ─── E · LAS ACCIONES ANUNCIADAS ────────────────────────────────────────── */

/**
 * CÓMO SE ELIGE Y SE ACEPTA EL BLANCO de una acción. El aparato elige; el servidor acepta o no.
 */
export interface EngancheDeclarado {
  /** El aparato busca blanco a esta distancia o menos… */
  readonly radio: Longitud;
  /** …y a este medio ancho, en rumbos (0-64), de hacia donde apunta la palanca o la cámara. */
  readonly conoRumbos: Rumbos;
  /** El servidor lo acepta hasta `radio + holgura`, y con línea de vista (prueba de losa). */
  readonly holgura: Longitud;
}

/**
 * CUÁNDO SE PUEDE ENCADENAR una acción tras otra. Para un asiento, la pulsación se juzga en el reloj
 * del APARATO frente al impacto anterior que ese mismo aparato pintó (el `t` del anuncio que recibió):
 * así no depende de la red. Para una entidad, su cerebro la encadena en el impacto si `soloSiDio` se
 * cumple, y las ventanas no se miran.
 *
 * Una acción no se encadena tras sí misma (se repetiría sin fin). Dos golpes IGUALES seguidos se
 * declaran con dos ids, uno por eslabón —el segundo `tras` el primero—, con los mismos números: la
 * cadena queda escrita entera y el aparato sabe por el id en qué eslabón va.
 */
export interface CadenaDeclarada {
  /** Tras el impacto de cuáles (por id) se puede encadenar ésta. */
  readonly tras: readonly IdDeclarado[];
  /** Se admite la pulsación desde `impactoAnterior − antesMs`… */
  readonly antesMs: Milisegundos;
  /** …hasta `impactoAnterior + despuesMs`. */
  readonly despuesMs: Milisegundos;
  /** «Al ritmo» si la pulsación cae a `ritmoMs` o menos del impacto anterior, en los dos sentidos (0 = nunca). */
  readonly ritmoMs: Milisegundos;
  /** El anuncio cuando va al ritmo (más corto); igual que `anuncioTics` si el ritmo no lo acorta. */
  readonly anuncioTicsAlRitmo: Tics;
  /** Sólo se encadena si la anterior DIO (lo usan las entidades). */
  readonly soloSiDio: boolean;
}

/**
 * LO QUE LE PASA AL BLANCO CUANDO UN IMPACTO DA (declaraciones E y H).
 */
export interface EfectoDeclarado {
  /** Daño, entero. */
  readonly dano: number;
  /** Daño si el golpe fue al ritmo (igual que `dano` si no hay ritmo). */
  readonly danoAlRitmo: number;
  /** Puntos al autor, si es un asiento, por dar (la base: ver `PuntosDeclarados`). */
  readonly puntos: number;
  /** Puntos si fue al ritmo. */
  readonly puntosAlRitmo: number;
  /** Estado en que deja al blanco, o `null` si no le deja ninguno. */
  readonly puesta: PuestaDeEstado | null;
  /**
   * Cuánto lo empuja, en la dirección autor → blanco (0 = no empuja). La trayectoria es la de
   * `geometria.trayectoria`, con el radio del blanco: si se para contra una caja, es un CHOQUE.
   */
  readonly empuje: Longitud;
  /**
   * Lo que se suma si el empuje choca con la estructura (declaración H): más daño, y más tics a la
   * `puesta`. Con `puesta` a `null` los tics tienen que ser 0 —no hay estado que alargar—. Sale en el
   * suceso `empuja` con la caja contra la que chocó, para que todos los aparatos pinten la marca en
   * la misma.
   */
  readonly alChocar: { readonly dano: number; readonly tics: Tics };
  /** Atraviesa la guardia de quien la tenga. */
  readonly rompeGuardia: boolean;
}

/**
 * UN GOLPE ANUNCIADO (declaración E): se lanza, se ANUNCIA con el instante de su impacto (traducido al
 * reloj de cada destinatario) y se resuelve en ese instante. Lo usan los asientos y las entidades.
 *
 * Las acciones SOSTENIDAS —rematar, rescatar, usar una zona— no son esto: se declaran donde viven
 * (`RemateDeclarado`, `RescateDeclarado`, `ZonaDeAccionDeclarada`) con su propio id de acción.
 */
export interface AccionDeclarada {
  /** 1-255: lo que viaja en `aqui.a[0]` y en `anuncio.acc`. */
  readonly id: IdDeclarado;
  /** Del inicio al impacto, en tics (≥ 1). */
  readonly anuncioTics: Tics;
  /** El impacto da si el blanco está, en el tic del impacto, a `alcance + holgura` o menos. */
  readonly alcance: Longitud;
  /** Lo que se suma al alcance por la interpolación de quien lo ve (el aparato pinta a los demás atrás). */
  readonly holgura: Longitud;
  /** Cómo se elige el blanco, o `null` si la acción no lleva blanco (sale hacia donde se mira). */
  readonly enganche: EngancheDeclarado | null;
  /**
   * Cuánto AVANZA el autor hacia el blanco durante el anuncio (0 = nada), parándose antes del blanco y
   * de la estructura; el presupuesto de paso se lo admite como distancia extra.
   *
   * Con avance, una acción ALCANZA a `alcance + avance`: una entidad la empieza desde ahí (se acerca
   * mientras anuncia), y el golpe de un asiento se resuelve contando lo que aún le quedaba por avanzar
   * —`avance` menos lo que ya se movió desde donde la lanzó—: el avance lo hace el aparato y sus `aqui`
   * llegan media ida y vuelta después, así que un golpe corto tras un desplazamiento largo del autor se
   * juzgaría con el sitio de antes de avanzar y fallaría siempre. Quien se aleja en vez de avanzar lo va
   * gastando; quien no avanza nada no llega más lejos que su avance.
   */
  readonly avance: Longitud;
  /** Tras qué se encadena, o `null` si es una acción que ABRE (no va tras nada). */
  readonly cadena: CadenaDeclarada | null;
  readonly efecto: EfectoDeclarado;
  /** Ni se esquiva ni se para: sólo falla si el blanco está lejos. */
  readonly imparable: boolean;
  /** Tics desde que se lanza hasta que se puede volver a lanzar (0 = sin recarga). */
  readonly recargaTics: Tics;
  /** Tics después del impacto en que el autor no puede empezar nada que no se encadene (0 = ninguno). */
  readonly recuperacionTics: Tics;
  /** Estados (por id) en los que se puede empezar; `[]` = en cualquiera que no bloquee la acción. */
  readonly soloEn: readonly IdDeclarado[];
  /** Lo que le pasa al AUTOR si falla (blanco lejos, esquivado, parado), o `null` si nada. */
  readonly alFallar: PuestaDeEstado | null;
}

/* ─── C, F, O · EL REGLAMENTO DE UN ASIENTO ──────────────────────────────── */

/**
 * EL CUERPO DE UN ASIENTO (declaración C): cómo anda y cuánto aguanta. El aparato anda; la sala
 * VALIDA el sitio con los dos presupuestos y la estructura, y corrige si no cuadra.
 */
export interface CuerpoDeclarado {
  /** Medio lado del cuadrado con que choca (ver `mundo.ts`: se prueba el cuadrado, no el círculo). */
  readonly radio: Longitud;
  /** Las velocidades de las marchas 1, 2, 3…, crecientes. La marcha 0 es estar quieto. Para el aparato. */
  readonly marchas: readonly Velocidad[];
  /** Tics para pasar de quieto a la marcha 1 (el aparato acelera; la sala no lo mira). */
  readonly aceleracionTics: Tics;
  /**
   * EL PRESUPUESTO CORTO: la sala admite hasta `velocidad` por el tiempo pasado, acumulable como mucho
   * `acumulaTics` (lo que sobra de un tic quieto se gasta en el siguiente, hasta ese tope).
   */
  readonly presupuestoCorto: { readonly velocidad: Velocidad; readonly acumulaTics: Tics };
  /**
   * EL PRESUPUESTO LARGO: en cualquier ventana de `enTics` tics no se recorre más de `distancia`. Impide
   * ir siempre con la holgura del corto. Lo suspende un estado con `distanciaExtra`.
   */
  readonly presupuestoLargo: { readonly distancia: Longitud; readonly enTics: Tics };
  /** La vida máxima (≥ 1). */
  readonly vidaTope: number;
  /** Vida que gana quien remata a una entidad. */
  readonly vidaAlRematar: number;
  /**
   * Un impacto cada tantos tics no le deja el estado del efecto (el daño sí). 0 = nunca: es un rasgo, y
   * lo normal es no tenerlo.
   */
  readonly firmeCadaTics: Tics;
  /** Una acción pulsada mientras no se podía empezar se guarda estos tics y sale en cuanto se puede. */
  readonly guardaTics: Tics;
}

/**
 * LA ESQUIVA EN VENTANA (declaración F), juzgada en el reloj del APARATO que esquiva.
 *
 * ═══ EL JUICIO DE UN IMPACTO CONTRA UN ASIENTO, EN ESTE ORDEN Y SIN OTRO ═══
 *
 * Un impacto —el de un anuncio o el toque de una bala— contra un asiento tiene un instante `t` EN EL
 * RELOJ DE SU APARATO: el `tBlanco` que la sala guardó al anunciarlo (en una bala, su salida en el
 * reloj del blanco más los tics de vuelo). Se juzga así, y el primer paso que decide, decide:
 *
 *   1. LEJOS: el blanco no está a tiro (fuera de `alcance + holgura`, o la bala no toca su sitio
 *      declarado para ese tic) → `fallada`.
 *   2. LA VENTANA —salvo que la acción sea `imparable`—: entre las esquivas recientes del blanco que
 *      NO salieron torpes ni fueron de ruptura, la de pulsación `p` (ms de su aparato) con el mejor
 *      resultado: `t − p` en `[0, ventana]` → `limpia`; en `(ventana, hasta]` → `esquivada`. Con
 *      `ventana` = `ventanaMs` (o `primeras.ventanaMs` mientras le queden primeras) y `hasta` = la
 *      mayor de `esquivaHastaMs` y `ventana`. La pulsación cuenta aunque el aparato la hiciera antes
 *      de recibir el anuncio: la ventana compara instantes, no órdenes de llegada.
 *   3. EL INTOCABLE: si en el tic del impacto su estado en curso es intocable → `esquivada`.
 *   4. Si nada de lo anterior, DA.
 *
 * Dos jueces para lo mismo —la ventana en ms del aparato y un intocable en tics de la sala— dirían
 * cosas distintas justo en el borde que el desfase mueve, y ése es el borde en que se juega. Por eso
 * la esquiva NO tiene intocable (`puesta.intocableTics` es 0, y `problemasDeLaDeclaracion` lo exige): su
 * «parte que esquiva» es `esquivaHastaMs`, en el reloj que no depende de la red. Una mejora que da «un
 * tic más de intocable» a la esquiva se compone como `MS_POR_TIC` más de `esquivaHastaMs`.
 *
 * Ver `tipos-de-la-sala.ts` para por qué el desfase de reloj se cancela.
 */
export interface EsquivaDeclarada {
  /** La acción del cable que la lanza (`aqui.a[0]`). Sin blanco. */
  readonly accion: IdDeclarado;
  /**
   * El estado en que se esquiva: su `distanciaExtra` es el desplazamiento que el presupuesto admite,
   * su `soltableDesdeTic` desde cuándo se puede golpear, y su `intocableTics` es 0 (ver arriba).
   */
  readonly puesta: PuestaDeEstado;
  /** La ventana limpia, en ms del aparato. */
  readonly ventanaMs: Milisegundos;
  /** Hasta aquí es esquivada sin premio, en ms del aparato (≥ `ventanaMs`). */
  readonly esquivaHastaMs: Milisegundos;
  /**
   * LAS DE APRENDER: las `cuantas` primeras esquivas de este asiento EN ESTA FASE —contadas desde que
   * la sala empieza la fase, rupturas aparte— usan `ventanaMs` como ventana limpia. `cuantas` 0 =
   * ninguna. Las cuenta la fase y no la sala a propósito: el productor declara cuántas LE QUEDAN (la
   * mesa lleva la cuenta con la columna `esquivas` de cada ronda), y así ni un despliegue ni una fase
   * nueva las regalan otra vez.
   */
  readonly primeras: { readonly cuantas: number; readonly ventanaMs: Milisegundos };
  /**
   * La `cada`-ésima esquiva en menos de `enTics` sale TORPE: desplaza igual, pero NO ESQUIVA —la
   * ventana no la mira— y, si hay premio por limpia, no lo da. Es lo que hace que aporrear no rinda.
   * `cada` 0 = nunca.
   */
  readonly torpe: { readonly cada: number; readonly enTics: Tics };
  /** Lo que pasa con una LIMPIA: el estado del que esquiva y el del autor que falló. */
  readonly alAcertar: { readonly puesta: PuestaDeEstado; readonly alAutor: PuestaDeEstado };
  /**
   * Una limpia contra una BALA no descoloca a nadie (el tirador está lejos): da el VUELO. La sala
   * lanza en el acto `accion` contra el tirador, con el impacto al final del vuelo —lo que tarda el aparato
   * en enterarse de la limpia, `tics` de vuelo y el anuncio de la acción— y un avance que es el vuelo más
   * el de la acción. El aparato vuela hasta `distancia` hacia el tirador en `tics` tics (sin pasar de su
   * alcance) y, si aún no llega, hace el avance de la acción: la sala le admite las dos distancias y juzga
   * el golpe como cualquier otro con avance (ver `AnuncioPendiente.avance` en `tipos-de-la-sala.ts`).
   */
  readonly contraProyectil: { readonly distancia: Longitud; readonly tics: Tics; readonly accion: IdDeclarado };
  /**
   * LA ESQUIVA DE RUPTURA: la misma acción, pulsada en uno de los estados de `desde` con `coste` de
   * medidor o más, gasta el coste y saca de él con `puesta`. Los estados de `desde` tienen que llevar la
   * acción en su `cancelaCon`. No pasa por la ventana —nunca es limpia—: protege con el intocable de su
   * `puesta`, que es para lo que está (paso 3 del juicio).
   */
  readonly ruptura: { readonly coste: number; readonly desde: readonly IdDeclarado[]; readonly puesta: PuestaDeEstado };
}

/** EL RESCATE (declaración O): un asiento mantiene su acción junto a otro caído y lo levanta. */
export interface RescateDeclarado {
  /** La acción sostenida del cable; su blanco es el NÚMERO del asiento caído. */
  readonly accion: IdDeclarado;
  /** A esta distancia o menos del caído. */
  readonly radio: Longitud;
  /** Cuántos tics hay que mantener. */
  readonly mantenerTics: Tics;
  /** El estado de quien rescata mientras mantiene (se corta con daño si el estado lo dice). */
  readonly puesta: PuestaDeEstado;
  /** Con cuánta vida vuelve el rescatado. */
  readonly vidaAlVolver: number;
  /** Medidor que ganan LOS DOS al acabar (0 = nada). */
  readonly medidorAmbos: number;
}

/** EL MEDIDOR de un asiento (una barra que se llena con lo que sale bien y se gasta en la ruptura). */
export interface MedidorDeclarado {
  readonly tope: number;
  readonly porLimpia: number;
  readonly porRitmo: number;
  readonly porRemate: number;
  /** Por cada empuje suyo que choca con la estructura. */
  readonly porChoque: number;
}

/**
 * LOS PUNTOS de un asiento. Cada suma —golpes, limpias, choques, remates, rescates, salir y el pago de
 * lo que se cobra al salir— vale `por(por(base, factor), multiplicador)`, con `por()` de `fijo.ts`: dos
 * truncados, en ese orden, iguales en todos los motores.
 *
 * El `multiplicador` empieza en `UNO` (×1) en cada fase, sube `multiplicador.paso` con cada esquiva
 * limpia seguida sin recibir daño, no pasa de `multiplicador.tope`, y vuelve a `UNO` al recibir daño.
 */
export interface PuntosDeclarados {
  /** De `1` a `TOPE_DE_MULTIPLICADOR`. */
  readonly factor: Proporcion;
  /** `tope` de `UNO` a `TOPE_DE_MULTIPLICADOR`. */
  readonly multiplicador: { readonly paso: Proporcion; readonly tope: Proporcion };
  readonly porLimpia: number;
  /** Por cada empuje suyo que choca con la estructura. */
  readonly porChoque: number;
  readonly porRemate: number;
  readonly porRescate: number;
  readonly porSalir: number;
}

/** Cuántos lleva un asiento de un portable. */
export interface CargaDePortable {
  readonly portable: IdDeclarado;
  readonly n: number;
}

/**
 * CON QUÉ EMPIEZA UN ASIENTO CADA FASE: el punto de control que guarda la mesa. La sala es genérica y
 * no sabe leer la vista de ningún juego; por eso lo lee el productor y lo pone aquí. La sala lo lee al
 * EMPEZAR cada fase (ver `FaseDeLaLiza`), no cuando cambian otros números de la misma fase: lo que se
 * lleva de una fase a otra es lo que la mesa apuntó de la ronda anterior, y nada más.
 */
export interface PuntoDeControl {
  /** De 1 a `cuerpo.vidaTope`. */
  readonly vida: number;
  /** De 0 a `medidor.tope`. */
  readonly medidor: number;
  /** Lo que lleva, un renglón por portable como mucho, y hasta su tope. */
  readonly lleva: readonly CargaDePortable[];
}

/* ─── W · EL TIRO CARGADO ────────────────────────────────────────────────── */

/**
 * UN NIVEL DEL TIRO: lo que sale si se suelta con `desdeMs` de carga o más (y menos que el `desdeMs` del
 * siguiente). Todo entero y sin interpolar: la carga elige UNA fila de la tabla (ver `TiroDeclarado`).
 */
export interface NivelDelTiro {
  /** Desde cuánta carga, en ms del APARATO. El del primero es 0; los demás, crecientes. */
  readonly desdeMs: Milisegundos;
  /**
   * La bala que sale (id de `LizaDeclarada.proyectiles`): su velocidad, su alcance, su radio CONTRA LA
   * ESTRUCTURA y su efecto contra el blanco DIRECTO (el primer cuerpo que toca). Es una bala de un solo
   * disparo: `apuntarTics` 1, `balas` 1 y `cadaTics` 0, que en el tiro de un asiento no pesan (la revisión
   * lo exige: un número que no pesa pero admite cualquier valor es un número que alguien acaba leyendo). Y
   * cada nivel lleva la SUYA: el aparato sabe qué nivel salió por el `p` del suceso `bala`, y con dos
   * niveles en la misma bala no lo sabría.
   */
  readonly proyectil: IdDeclarado;
  /**
   * El medio ancho CONTRA LOS CUERPOS: se suma al radio de cada cuerpo (y a la `holgura` del tiro) para ver
   * si lo toca; 0 = sólo el radio del cuerpo. Es otro número que el radio de la bala contra la estructura, a
   * propósito: un tiro ancho que usara su ancho contra las cajas se pararía a los pies de quien dispara
   * pegado a una pared.
   */
  readonly ancho: Longitud;
  /** El radio del ÁREA alrededor de donde se para la bala (0 = sin área: sólo el blanco directo). */
  readonly area: Longitud;
  /**
   * Lo que les pasa a los del ÁREA —los cuerpos a `area` o menos del punto donde se para, con línea de vista
   * desde él, sin el blanco directo (ése lleva el efecto de su bala)—, con el empuje hacia FUERA, desde ese
   * punto, y no del autor al blanco como en un golpe. `null` si y sólo si `area` es 0.
   */
  readonly efectoDelArea: EfectoDeclarado | null;
  /** Tics desde que sale hasta que se puede volver a cargar (0 = sin recarga). */
  readonly recargaTics: Tics;
}

/**
 * EL TIRO CARGADO (declaración W): se MANTIENE `apuntar` para cargar y se pulsa `soltar` para que salga una
 * bala, con más alcance y más daño, y menos área, cuanto más se cargó. Es el ataque a distancia de un
 * asiento. Sus dos usos nombrados: el ARCO de una liza de juguete (tensar es cargar; soltar, disparar) y el
 * golpe en ANILLO alrededor de un punto —el área de un nivel—, como el pisotón que alcanza a todo lo que
 * rodea a quien lo da.
 *
 * ═══ CÓMO VIAJA, SIN TOCAR EL CABLE ═══
 *
 * Con la acción de siempre, `[accion, ms, blanco]`:
 *
 *   · mientras carga, `aqui.a = [apuntar, msPulsar, 0]` en cada `aqui`, con el MISMO `ms`: es una acción
 *     sostenida como las demás, y el primer `aqui` sin ella la suelta;
 *   · al soltar, UNA vez, `aqui.a = [soltar, msSoltar, blanco]`. La dirección es la `r` de ese `aqui` (la
 *     mira, que la sala ya arbitra) o, con un blanco que la sala acepte por `enganche`, hacia él.
 *
 * LA CARGA es `msSoltar − msPulsar`: dos instantes del MISMO reloj del aparato, así que el desfase no la
 * mueve (como la ventana de la esquiva). La sala la acota por lo que vio —los tics desde que empezó a
 * mantenerla, más lo que tarda en llegar un `aqui`— y por `cargaMaximaMs`; y el nivel es el ÚLTIMO de
 * `niveles` con `desdeMs` ≤ la carga: una tabla de enteros, sin interpolar.
 *
 * SÓLO EL `soltar` EXPLÍCITO DISPARA. Todo lo demás que acaba la sostenida —un daño que corta su estado,
 * otra pulsación en el mismo `aqui`, el fin del combate, quedarse ausente— la acaba SIN disparar y sin
 * gastar la recarga.
 *
 * ═══ LO QUE VEN LOS DEMÁS ═══
 *
 * Quien carga está en el estado de `puesta`, que sale en la foto: los demás ven que carga, y hacia dónde por
 * su mira. La bala sale con su suceso `bala`, con `de` = el NÚMERO DEL ASIENTO; lo que alcanza, con un
 * `impacta` por cuerpo; y donde se para —contra un cuerpo o contra la estructura—, con `estalla`
 * (`protocolo.ts`), que es el centro del área.
 *
 * ═══ HOY, SÓLO LA FORMA ═══
 *
 * La sala todavía no lo cumple, así que `problemasDeLaDeclaracion` revisa su forma entera Y rechaza todo tiro
 * que no sea `null`: una declaración que la sala no cumple es una promesa que nadie guarda. Quien lo cablee
 * en la sala quita esa frase, y nada más.
 */
export interface TiroDeclarado {
  /** La acción SOSTENIDA que carga (el id del cable, 1-255). */
  readonly apuntar: IdDeclarado;
  /** La pulsación que dispara (el id del cable, 1-255). */
  readonly soltar: IdDeclarado;
  /**
   * El estado de quien carga, puesto al empezar a cargar. Sus `tics` cubren la carga máxima: si durara menos,
   * se acabaría antes que ella y la cortaría.
   */
  readonly puesta: PuestaDeEstado;
  /** Los niveles, de 1 a `TOPE_DE_NIVELES_DEL_TIRO`, con `desdeMs` crecientes y el primero en 0. */
  readonly niveles: readonly NivelDelTiro[];
  /** Cómo se corrige la mira hacia un blanco que la sala acepta, o `null` si sale siempre por la mira. */
  readonly enganche: EngancheDeclarado | null;
  /**
   * Lo que se suma a cada cuerpo al juzgar si la bala lo toca: el aparato pinta a los demás
   * `RETRASO_DE_LOS_DEMAS_MS` atrás (`protocolo.ts`) y la sala no guarda los sitios pasados de lo que mueve.
   */
  readonly holgura: Longitud;
  /** La carga más larga que se cree, en ms del aparato (≥ el `desdeMs` del último nivel). */
  readonly cargaMaximaMs: Milisegundos;
}

/**
 * EL REGLAMENTO ENTERO DE UN ASIENTO, ya compuesto con todo lo que haya elegido. Ver la cabecera.
 */
export interface ReglasDeAsiento {
  /**
   * El `AsientoId` de la mesa. Su NÚMERO en el cable es su posición en `LizaDeclarada.asientos` más
   * uno, y esa posición es la de la mesa: el productor los pone en el orden en que se sentaron.
   */
  readonly asiento: string;
  readonly cuerpo: CuerpoDeclarado;
  /** Sus golpes. Los ids no se repiten entre sí ni con los de su esquiva, su rescate, su tiro, los remates o las zonas. */
  readonly acciones: readonly AccionDeclarada[];
  readonly esquiva: EsquivaDeclarada;
  readonly rescate: RescateDeclarado;
  /** Su tiro cargado (W), o `null` si no tiene. Hoy, `null` siempre: ver «hoy, sólo la forma» en `TiroDeclarado`. */
  readonly tiro: TiroDeclarado | null;
  readonly medidor: MedidorDeclarado;
  readonly puntos: PuntosDeclarados;
  readonly alEmpezar: PuntoDeControl;
}

/* ─── G, J · LAS ENTIDADES DEL SERVIDOR ──────────────────────────────────── */

/**
 * LA GUARDIA de una clase (declaración G): para de frente ciertas acciones, salvo en ciertos estados.
 */
export interface GuardiaDeclarada {
  /** Medio ancho del frente que guarda, en rumbos (0-64). */
  readonly conoRumbos: Rumbos;
  /** Qué acciones de los asientos para (por id). Lo que no está aquí, o `rompeGuardia`, pasa. */
  readonly para: readonly IdDeclarado[];
  /** No para si está en uno de estos estados. */
  readonly salvoEn: readonly IdDeclarado[];
  /** Lo que le pasa al autor al que le para. */
  readonly alParar: PuestaDeEstado;
  /**
   * Con qué acción de SU clase contesta al parar (no gasta turno); 0 = no contesta. Es SÓLO respuesta:
   * aunque no vaya tras nada, el cerebro no la usa para abrir un ataque por su cuenta —con turno y a su
   * alcance, abriría con ella y la guardia no tendría nada que contestar—. Una clase cuyas acciones sin
   * `cadena` son sólo su respuesta sólo contesta, y se admite; una con acciones y ninguna que abra ni
   * conteste no atacaría nunca, y `problemasDeLaDeclaracion` la señala.
   */
  readonly respuesta: IdDeclarado;
  /**
   * Lo que viene de frente y esquiva a veces: si la acción está en `acciones`, con probabilidad
   * `probabilidad` (sacada del azar de la sala) no le da. `acciones` vacía = nunca.
   */
  readonly esquivaAlAzar: { readonly acciones: readonly IdDeclarado[]; readonly probabilidad: Proporcion };
}

/**
 * EL CEREBRO GENÉRICO (declaración J): acecha, ronda a su distancia, ataca cuando tiene turno, dispara
 * con línea de vista y sigue el grafo cuando la recta está tapada. Estos son sus números.
 */
export interface CerebroDeclarado {
  /** Se acerca hasta esta distancia de su blanco… */
  readonly distanciaMinima: Longitud;
  /** …y si está más lejos que esto, va a por él. Entre las dos, ronda. */
  readonly distanciaMaxima: Longitud;
  /** Cada cuántos tics repiensa (blanco, línea de vista, camino). ≥ 1. */
  readonly decideCadaTics: Tics;
  /** Turnos de cuerpo a cuerpo que gasta cuando ataca (ver `TurnosDeclarados`). */
  readonly costeCuerpoACuerpo: number;
  /** Turnos de disparo que gasta cuando dispara. */
  readonly costeDisparo: number;
  /** Navega por el grafo cuando no hay recta; si no, va en recta y resbala. */
  readonly sigueElGrafo: boolean;
  /**
   * L10 · EL ALCANCE DE BLANCO: ninguna entidad de esta clase ELIGE por blanco a un asiento a más de esto en
   * recta —ni cuenta como su perseguidora, ni toma turno contra él, ni le apunta—, y el que tenía lo suelta en
   * el mismo tic en que se le va más allá (el que está justo a esa distancia todavía vale). El golpe que ya
   * lanzó y la ráfaga que ya empezó a disparar siguen, como siguen con cualquier blanco que se va. 0 = sin tope
   * (lo de antes de la liza abierta).
   *
   * SIN NADIE A SU ALCANCE: si el encuentro tiene olvido (`OlvidoDeclarado`) y algún asiento que valdría de
   * blanco está a su `distancia` o menos —la entidad está ACOMPAÑADA—, anda hacia el más cercano por el camino
   * por el que lo perseguiría, sin hacerlo su blanco, hasta tenerlo a su alcance; si no, se queda donde está (y,
   * con olvido, le corre el reloj). La primera versión se quedaba quieta también acompañada, y entre el alcance y
   * la distancia del olvido quedaba una franja sin salida —sin blanco y sin olvidarse, para siempre—: bastaba con
   * que el camino hasta su blanco rodeara una manzana.
   *
   * Es lo que deja huir de verdad en una liza grande: sin él, todo lo vivo cruzaba el mundo detrás del único
   * asiento que se alejaba, y el combate se iba con él; con él, lo vivo va detrás de quien tiene cerca y se
   * olvida de quien lo deja atrás. Con olvido tiene que caber en su distancia: así lo que persigue a alguien
   * tiene a alguien cerca y no se olvida nunca a media persecución.
   */
  readonly alcanceDeBlanco: Longitud;
}

/**
 * TRANSITORIO (liza abierta, entrega 1): el cerebro como lo escribe un productor que todavía no declara su
 * alcance de blanco. Vale lo mismo que `alcanceDeBlanco: 0` —sin tope—, y la sala lo lee así
 * (`alcanceDeBlancoDe`). Existe para que los productores que ya había sigan compilando y validando mientras
 * pasan a la forma entera; cuando la escriban todos, se quita de `ClaseDeEntidad.cerebro` y queda
 * `CerebroDeclarado` a secas. Es la forma de la casa para un contrato que crece a la vez que sus productores
 * (la misma que la escritura del `nace` sin ronda en `protocolo.ts`): dos formas dichas y comprobadas, no un
 * campo que a veces está.
 */
export type CerebroSinAlcance = Omit<CerebroDeclarado, 'alcanceDeBlanco'>;

/** El alcance de blanco de un cerebro (ver `CerebroDeclarado.alcanceDeBlanco`): 0, sin tope, en la forma transitoria. */
export function alcanceDeBlancoDe(c: CerebroDeclarado | CerebroSinAlcance): Longitud {
  return 'alcanceDeBlanco' in c && c.alcanceDeBlanco !== undefined ? c.alcanceDeBlanco : 0;
}

/**
 * EL REMATE: una entidad caída y rematable se remata manteniendo `accion` a `radio` o menos durante
 * `mantenerTics`; quien remata está en `puesta` mientras tanto (normalmente intocable entera).
 */
export interface RemateDeclarado {
  /** La acción sostenida del cable; su blanco es el NÚMERO de la entidad. */
  readonly accion: IdDeclarado;
  readonly radio: Longitud;
  readonly mantenerTics: Tics;
  readonly puesta: PuestaDeEstado;
}

/**
 * QUÉ PASA SI NADIE LA REMATA a tiempo (cuando se acaba su puesta de caída):
 *
 *   · si hay una entidad viva de la clase `absorbe` a `radio` o menos (la más cercana; empate, el
 *     número menor), la ABSORBE: la absorbida se va EN ESE TIC —suceso `seva` con `por: absorbida` y
 *     `quien` = la que absorbe, que es lo que el aparato necesita para pintar lo que va de una a otra—,
 *     y la que absorbe pasa `absorbiendo` (su estado sale en la foto y en el suceso `estado`) y se
 *     levanta con `vida`;
 *   · si no hay ninguna (o `absorbe` es 0), se deshace (`seva` con `seDeshace`) y vuelve a aparecer a
 *     los `reapareceTras` tics —con su MISMO número, en un `nace` nuevo: el aparato la reconoce— en una
 *     zona de la clase `claseDeZona` a `distanciaMinima` o más de todo asiento con cuerpo, también con
 *     `vida`, con su modo de aparición.
 */
export interface SiNoLaRematan {
  /** La clase que absorbe (0 = ninguna: se deshace directamente). */
  readonly absorbe: IdDeclarado;
  readonly radio: Longitud;
  /** El estado de la que absorbe mientras absorbe; sus `tics` son lo que tarda. */
  readonly absorbiendo: PuestaDeEstado;
  readonly vida: number;
  readonly reapareceTras: Tics;
  readonly claseDeZona: number;
  readonly distanciaMinima: Longitud;
}

/** Qué pasa cuando una entidad se queda sin vida. */
export type AlCaerDeclarado =
  /** Se va (suceso `seva`), y ya. */
  | { readonly tipo: 'irse' }
  /** Queda en `puesta` (rematable) y, si nadie la remata a tiempo, `siNo`. Al rematarla suelta `suelta`. */
  | {
      readonly tipo: 'rematable';
      readonly puesta: PuestaDeEstado;
      readonly remate: RemateDeclarado;
      readonly suelta: CargaDePortable;
      readonly siNo: SiNoLaRematan;
    };

/** Cómo aparece una entidad: se imprime en su zona (visible y lenta) o sale de un punto. */
export type ModoDeAparicion = 'imprimir' | 'desdePunto';

/** UNA CLASE DE ENTIDAD DEL SERVIDOR (declaración J). */
export interface ClaseDeEntidad {
  /** 1-255: lo que viaja en `nace.clase`. */
  readonly id: IdDeclarado;
  readonly vida: number;
  readonly radio: Longitud;
  readonly velocidad: Velocidad;
  /**
   * Sus golpes. Los que tienen `cadena: null` son los que abren un ataque; los demás los encadena el
   * cerebro. Sus ids no coinciden con los de ninguna acción de asiento (el aparato sabe qué pintar por
   * el id sólo).
   */
  readonly acciones: readonly AccionDeclarada[];
  /** Con qué dispara (id de `LizaDeclarada.proyectiles`), o 0 si no dispara. */
  readonly proyectil: IdDeclarado;
  readonly guardia: GuardiaDeclarada | null;
  /** Su cerebro; sin alcance de blanco, sólo mientras dura la forma transitoria (ver `CerebroSinAlcance`). */
  readonly cerebro: CerebroDeclarado | CerebroSinAlcance;
  /** Cómo aparece y cuántos tics tarda en poder actuar (durante ellos, intocable). */
  readonly aparicion: { readonly modo: ModoDeAparicion; readonly tics: Tics };
  readonly alCaer: AlCaerDeclarado;
}

/* ─── I · LOS PROYECTILES ────────────────────────────────────────────────── */

/**
 * UNA BALA LENTA Y VISIBLE (declaración I). Apunta `apuntarTics` al sitio que el blanco tenía al
 * TERMINAR de apuntar —es la única forma: apuntar donde estará sería adivinar— y dispara una ráfaga.
 * Se juzga contra los sitios que el propio blanco declaró para cada tic, sin rebobinar.
 */
export interface ProyectilDeclarado {
  readonly id: IdDeclarado;
  readonly apuntarTics: Tics;
  /** Balas por ráfaga (≥ 1) y tics entre una y otra. */
  readonly balas: number;
  readonly cadaTics: Tics;
  readonly velocidad: Velocidad;
  /** Medio lado del cuadrado de la bala; se suma al radio del cuerpo para ver si toca. */
  readonly radio: Longitud;
  /** Cuánto recorre antes de irse (y se para antes contra la estructura). */
  readonly alcance: Longitud;
  readonly efecto: EfectoDeclarado;
}

/* ─── K · LOS TURNOS DE ATAQUE ───────────────────────────────────────────── */

/**
 * CÓMO SE REPARTE LA PRESIÓN (declaración K): cada asiento admite a la vez `cuerpoACuerpo` turnos de
 * cuerpo a cuerpo y `disparo` de disparo; nadie recibe más de `anunciosALaVez` anuncios a la vez; los
 * turnos van al asiento con menos amenazas; y nunca a quien está en uno de `excluyen`.
 */
export interface TurnosDeclarados {
  readonly cuerpoACuerpo: number;
  readonly disparo: number;
  readonly anunciosALaVez: number;
  readonly excluyen: readonly IdDeclarado[];
  /** El anuncio de una entidad contra un asiento se alarga en el `comp` del blanco: la mala red no castiga. */
  readonly alargarConLaRed: boolean;
  /**
   * LA REPETICIÓN SIN AUTOR: cada anuncio de una entidad contra un asiento se REPITE `repetirTrasTics`
   * después del primero, sin autor —el mismo golpe, desde el sitio en que el autor lo lanzó y contra el
   * mismo blanco—, y hay que volver a esquivarlo. Sale como otro `anuncio` con `de: 0` y el sitio de
   * salida en `x, z`: el autor puede no existir ya, y su número puede ser de otro. 0 = no se repite
   * nada, que es lo normal. Segundo uso: cualquier ataque que se dispara dos veces —una trampa, un
   * golpe de área que retumba—.
   */
  readonly repetirTrasTics: Tics;
}

/* ─── L, M · LOS ENCUENTROS ──────────────────────────────────────────────── */

/**
 * Una cifra por número de presentes: el primer valor es para 1, el segundo para 2… Tiene tantos como
 * asientos la liza. Cuántos son los presentes lo DECLARA el encuentro (`EncuentroDeclarado.presentes`):
 * no lo cuenta la sala con los canales abiertos.
 */
export type PorPresentes = readonly number[];

/** UN GRUPO de un encuentro: cuántas entidades de una clase, de dónde y a qué ritmo. */
export interface GrupoDeclarado {
  readonly clase: IdDeclarado;
  /** Cuántas en total, por presentes (≥ 0). */
  readonly cuantos: PorPresentes;
  /** Cuántas de este grupo vivas a la vez como mucho, por presentes (≥ 1). */
  readonly vivasALaVez: PorPresentes;
  /** De qué zonas salen (su `clase`), sorteada una por entidad. */
  readonly claseDeZona: number;
  /** Desde qué tic del encuentro empiezan a salir. */
  readonly desdeTic: Tics;
  /** Una cada tantos tics; 0 = todas las que quepan a la vez. */
  readonly cadaTics: Tics;
  /**
   * Cómo se elige la zona de cada una entre las de `claseDeZona`:
   *   · `azar` — sorteada con el azar de la sala;
   *   · `aLaEspalda` — la que queda más a la espalda de los asientos con cuerpo: la de menor suma, entre
   *     todos ellos, de cuánto queda el centro de la zona POR DELANTE de cada uno según hacia dónde
   *     mira (`por(dx, SENO[mira]) − por(dz, COSENO[mira])`); empate, el id menor. Sin nadie con
   *     cuerpo, como `azar`;
   *   · `zonaDeAccion` — la zona de acción activa del encuentro (quien guarda la salida); si no hay
   *     ninguna activa, espera a que la haya.
   */
  readonly eleccion: EleccionDeZona;
}

/** Ver `GrupoDeclarado.eleccion`. */
export type EleccionDeZona = 'azar' | 'aLaEspalda' | 'zonaDeAccion';

/**
 * UNA ZONA DE ACCIÓN SOSTENIDA (declaración M): se activa una de las zonas de `claseDeZona`, sorteada,
 * durante `activaTics`; quien mantiene `accion` a `radio` o menos de su centro durante `mantenerTics`
 * SALE: cobra lo que lleva (ver `PortableDeclarado.pago`) y `puntos.porSalir`, pasa a sin cuerpo y
 * cuenta `salio`. De `capacidad` en `capacidad`. Si se apaga con asientos aún en juego, se gasta
 * `alApagarse.coste` del recurso de equipo y se activa OTRA —sorteada entre las de su clase menos la que
 * se apagó, si hay más— durante `alApagarse.siguienteTics`; sin recurso para pagarlo, se acabó el
 * encuentro (ver `FinDelEncuentro`).
 */
export interface ZonaDeAccionDeclarada {
  readonly claseDeZona: number;
  /** La acción sostenida del cable (blanco 0: la zona es la activa). */
  readonly accion: IdDeclarado;
  readonly radio: Longitud;
  readonly mantenerTics: Tics;
  readonly capacidad: number;
  /** El estado de quien la usa mientras mantiene. */
  readonly puesta: PuestaDeEstado;
  /** Un golpe corta el uso (y hay que volver a empezar). */
  readonly rompeConDano: boolean;
  readonly activaTics: Tics;
  readonly alApagarse: { readonly coste: number; readonly siguienteTics: Tics };
}

/**
 * CÓMO SE GANA UN ENCUENTRO. Ver en `EncuentroDeclarado` cómo acaba cada uno y con qué resultado.
 *
 *   · `vaciar` — cuando ya salieron todas las entidades de todos los grupos, no queda ninguna viva y no
 *     queda NINGÚN MONTÓN en el suelo: lo que suelta la última se recoge antes de que acabe (o caduca).
 *     Si acabara al caer la última, lo que suelta no lo recogería nadie.
 *   · `salida` — por una zona de acción: gana si salen al menos `salenComoMinimo` (por presentes).
 */
export type FinDelEncuentro =
  | { readonly tipo: 'vaciar' }
  | { readonly tipo: 'salida'; readonly zona: ZonaDeAccionDeclarada; readonly salenComoMinimo: PorPresentes };

/**
 * UN ENCUENTRO (declaración L): el combate de la fase, ya compuesto por el productor.
 *
 * ═══ CÓMO ACABA, Y CON QUÉ RESULTADO ═══
 *
 * Acabar es: meter UN `arcade:ronda` con el resultado, disolver lo que queda (entidades, balas y
 * montones: `seva` con `disuelta`; los anuncios pendientes se resuelven `cortada`) y no sacar nada más
 * hasta la fase siguiente. Lo que estaba en un montón se pierde.
 *
 *   · Con fin `vaciar`: `ganada` al vaciarse; `aguantada` si vence `relojTics` antes; `perdida` si
 *     todos los asientos se quedan sin cuerpo y sin recurso para volver.
 *   · Con fin `salida`: acaba cuando ya no puede salir nadie más —todo asiento salió o está sin cuerpo
 *     sin recurso para volver—, cuando la zona se apaga sin recurso para encender otra, o cuando vence
 *     `relojTics`. En los tres casos el resultado es `ganada` si salieron al menos `salenComoMinimo`, y
 *     `perdida` si no: aquí no hay «aguantar», y quien sale no deja fuera a los demás —el encuentro
 *     sigue mientras alguien pueda salir—.
 *
 * «PUEDE SEGUIR» quien tiene cuerpo y vida, quien espera sin cuerpo una vuelta con fin, y quien cayó con
 * recurso en el equipo para pagarla. NO cuenta quien ya salió ni quien SE FUE: sin canal
 * `presencia.veredictoTrasTics`, o ausente momentáneo ese mismo tiempo (ver `PresenciaDeclarada`). Si
 * contara, un asiento vacío no caería nunca y el encuentro no se perdería: acabaría «aguantado» al vencer
 * su reloj, o encendería otra zona pagando por quien no está. El ausente momentáneo, en cambio, sí puede
 * seguir: una pestaña oculta unos segundos no pierde el encuentro.
 *
 * Es `EncuentroConOlvido`, o su forma transitoria sin `olvido` (ver `EncuentroSinOlvido`).
 */
export type EncuentroDeclarado = EncuentroConOlvido | EncuentroSinOlvido;

/**
 * TRANSITORIO (liza abierta, entrega 1): el encuentro como lo escribe un productor que todavía no declara
 * olvido. Vale lo mismo que `olvido: null`, y la sala lo lee así (`olvidoDelEncuentro`). Se quita cuando
 * todos los productores escriban la forma entera, y entonces `EncuentroConOlvido` pasa a llamarse
 * `EncuentroDeclarado` (ver `CerebroSinAlcance`, que es lo mismo para el alcance de blanco).
 */
export type EncuentroSinOlvido = Omit<EncuentroConOlvido, 'olvido'>;

/** El olvido de un encuentro (ver `OlvidoDeclarado`): `null`, sin olvido, en la forma transitoria. */
export function olvidoDelEncuentro(en: EncuentroDeclarado): OlvidoDeclarado | null {
  return 'olvido' in en && en.olvido !== undefined ? en.olvido : null;
}

/** UN ENCUENTRO, en su forma entera (ver `EncuentroDeclarado`). */
export interface EncuentroConOlvido {
  /** El `n` del `arcade:ronda` con que se cierra (≥ 1). */
  readonly ronda: number;
  /**
   * CUÁNTOS CUENTAN para las tablas por presentes (1 … asientos): lo decide el PRODUCTOR con la vista
   * de la mesa —los asientos que la mesa no da por ausentes—, no la sala con los canales abiertos. Tras
   * un despliegue la sala renace con el primer `hola`, con un solo canal abierto, y contando canales
   * escalaría para uno un combate de seis.
   */
  readonly presentes: number;
  readonly relojTics: Tics;
  /** Entidades vivas a la vez como mucho, por presentes (≤ `aforo.entidades`). */
  readonly vivasALaVez: PorPresentes;
  readonly grupos: readonly GrupoDeclarado[];
  readonly fin: FinDelEncuentro;
  /** L10 · Lo que se olvida de quien se queda lejos de todos (ver `OlvidoDeclarado`); `null`, nada. */
  readonly olvido: OlvidoDeclarado | null;
}

/* ─── R, V · LA FASE ─────────────────────────────────────────────────────── */

/**
 * EL RELOJ DE FASE (declaración R): la vista declara uno, y la sala emite `arcade:reloj {id}` UNA vez,
 * en el primer tic en que han pasado `duraMs` desde que EMPEZÓ la fase. Así la mesa no necesita tics
 * propios para cerrar una fase por tiempo. Lo que le queda viaja en el suceso `fase` (`relojMs`), que es
 * con lo que el aparato lo pinta.
 *
 * DENTRO DE UNA MISMA FASE la vista puede CAMBIARLO —otro `id`, otra duración: por ejemplo, porque ya
 * están todos listos y no hace falta esperar el tope—. La sala lo vuelve a armar y lo cuenta también desde
 * que empezó la fase, no desde el cambio: si esa duración ya pasó, vence en ese mismo paso. El mismo
 * `id` otra vez (la misma vista, releída) no lo repite. Y el reloj que la sala metió sin saber que la
 * mesa ya había cambiado le llega a la mesa tarde: la mesa lo toma sin efecto (ver `CargaDeReloj`).
 */
export interface RelojDeFase {
  /** Una clave corta (`esClaveCorta`); distinta en cada fase que lo lleve. */
  readonly id: string;
  readonly duraMs: Milisegundos;
}

/**
 * QUÉ HACE LA SALA EN ESTA FASE:
 *   · `quieta` — nada: la mesa se reúne o ha terminado. El canal puede estar abierto.
 *   · `calma` — se anda y se valida el sitio; ni entidades ni golpes.
 *   · `encuentro` — todo.
 */
export type ModoDeLaFase = 'quieta' | 'calma' | 'encuentro';

/**
 * LA FASE VIGENTE, según la vista de la mesa.
 *
 * ═══ LO QUE LA SALA HACE AL EMPEZAR UNA FASE ═══
 *
 * Una fase EMPIEZA cuando la sala nace y cuando le llega una declaración con otra `clave`. Empezar es,
 * siempre y en este orden:
 *
 *   1. Se va todo lo que vivía en la sala: entidades, balas y montones (`seva` con `disuelta`), y los
 *      anuncios pendientes (`resuelve` con `cortada`).
 *   2. Se siembra el azar con `semilla`.
 *   3. Cada asiento toma su `alEmpezar` —vida, medidor, lo que lleva—, su multiplicador vuelve a `UNO`,
 *      sus contadores y sus puntos de la fase a cero, y se queda libre de estado. TODOS tienen cuerpo:
 *      quien lo tenía sigue donde estaba (si está dentro del límite nuevo); quien no lo tenía —salió,
 *      esperaba volver o estaba fuera del límite— aparece en su sitio de papel `asiento`.
 *   4. El recurso del equipo es `equipo.recurso`.
 *   5. Si hay encuentro, empieza con `presentes` y su reloj cuenta desde este tic; el reloj de fase,
 *      también.
 *   6. Se manda a todos el suceso `fase`, con lo que le queda a cada reloj.
 *
 * Una declaración con la MISMA clave es la misma fase con otros números (un voto, una elección): la
 * sala toma los reglamentos nuevos para lo que empiece desde ahí y no toca nada de lo anterior.
 */
export interface FaseDeLaLiza {
  /**
   * La identidad de la fase: una clave corta (`esClaveCorta`) que cambia SI Y SÓLO SI cambia la fase
   * (no con cada revisión de la mesa). Es como sabe la sala que una vista nueva es otra fase y no la
   * misma con un voto más.
   */
  readonly clave: string;
  readonly modo: ModoDeLaFase;
  /** Qué límite del mundo manda (id de `mundo.limites`): salirse es un sitio que no se acepta. */
  readonly limite: IdDeclarado;
  /**
   * La semilla PÚBLICA de la fase (declaración V), entero de 32 bits sin signo: la sala siembra su azar
   * con ella al empezar la fase, así que cualquier fallo se reproduce con lo que ya es público.
   */
  readonly semilla: number;
  readonly reloj: RelojDeFase | null;
  /** El encuentro, en el modo `encuentro`; `null` en los otros dos. */
  readonly encuentro: EncuentroDeclarado | null;
}

/* ─── N, O, P, Q · LO DEMÁS ──────────────────────────────────────────────── */

/**
 * UNA COSA QUE SE LLEVA (declaración N): la sueltan las entidades rematadas EN UN MONTÓN, se recoge
 * pasando cerca (hasta el tope; lo que no cabe se queda en el montón), se cae entera en un montón al
 * quedarse sin vida, y sólo vale al SALIR por una zona de acción: entonces se COBRA —su pago se suma a
 * los puntos como cualquier otra suma, con factor y multiplicador— y quien sale se queda sin ella.
 *
 * Si al soltar un montón ya hay `aforo.montones` en el suelo, se va antes el que caducaba antes
 * (`seva` con `caduca`): el aforo es un tope, no una sugerencia.
 */
export interface PortableDeclarado {
  readonly id: IdDeclarado;
  /** Cuántas lleva un asiento como mucho. */
  readonly tope: number;
  /** Se recoge pasando a esta distancia o menos (automático). */
  readonly radioDeRecogida: Longitud;
  /** Lo que dura un montón en el suelo. */
  readonly montonTics: Tics;
  /**
   * Cuánto vale al salir: `triangular` = n·(n+1)/2 · porUnidad; `lineal` = n · porUnidad. Con `n` en el
   * tope no pasa de `TOPE_DE_CANTIDAD` (la base de una suma de puntos; ver `PuntosDeclarados`).
   */
  readonly pago: { readonly tipo: 'triangular' | 'lineal'; readonly porUnidad: number };
}

/**
 * EL EQUIPO (declaración O): el recurso común y lo que pasa al quedarse sin vida.
 *
 * Quien se queda a 0 entra en `caida`. Si nadie lo rescata mientras dura, el equipo gasta
 * `reaparicion.coste`, espera `esperaTics` SIN CUERPO y reaparece en un sitio de papel `reaparicion`
 * con `vida` y en `reaparicion.puesta`. Si no hay recurso, se queda sin cuerpo hasta que cambie la fase.
 */
export interface EquipoDeclarado {
  /** El recurso con que empieza la fase (el del punto de control). */
  readonly recurso: number;
  readonly caida: PuestaDeEstado;
  readonly reaparicion: {
    readonly coste: number;
    readonly esperaTics: Tics;
    readonly vida: number;
    readonly puesta: PuestaDeEstado;
  };
}

/**
 * EL ROL SIN CUERPO (declaración P): quien salió o espera sin recurso. No tiene sitio (no manda `aqui`,
 * y si lo manda se ignora), vive por `eco`, no se le echa por quieto, recibe la foto y manda avisos.
 */
export interface SinCuerpoDeclarado {
  /** El estado con que sale en la foto (en su último sitio). */
  readonly estado: IdDeclarado;
}

/**
 * CÓMO SE ESTÁ Y SE DEJA DE ESTAR. Sólo cuenta en el modo `encuentro`: en calma nadie ataca.
 *
 * ═══ DOS AUSENCIAS, Y NO SON LA MISMA ═══
 *
 *   · EL AUSENTE MOMENTÁNEO (`ausenteTrasTics`): el aparato que tiene canal pero no dice nada VIVO ni
 *     juega (no pulsa ni se mueve) —una pestaña oculta que el navegador frena, una llamada entrante, la
 *     aplicación en segundo plano—. Pasa
 *     a `estadoAusente`: intocable, fuera de los turnos, ninguna entidad lo persigue ni le apunta, y lo
 *     que ya venía contra él se corta sin daño (`resuelve` cortada). Y a cambio NI ANDA NI PEGA: su
 *     estado bloquea el paso y las acciones (se exige), lo que él había lanzado se corta también y lo
 *     que sostenía se suelta —si no, fingirse ausente era jugar intocable—.
 *     Vuelve con el primer `aqui` VIVO, con su VUELTA: la puesta de quien reaparece
 *     (`equipo.reaparicion.puesta`) recortada a `TICS_DE_LA_VUELTA` —medio segundo de intocable, porque
 *     quien vuelve de no estar no puede recibir en su primer tic un golpe que no vio—, que se acaba en
 *     cuanto empieza una acción. «Vivo» es el `aqui` que cierra `AQUIS_PARA_ESTAR` tics del aparato
 *     seguidos: la ráfaga que una pestaña frenada manda tras cada parón (como mucho
 *     `TOPE_DE_AQUIS_DE_GOLPE`) no lo es, y por eso no la devuelve. Ver `tipos-de-la-sala.ts`.
 *   · EL QUE SE FUE (`veredictoTrasTics`): sin CANAL ese tiempo —y entonces la sala mete `arcade:ausente`
 *     en la mesa, una vez por asiento y fase; la mesa toma sin efecto el de quien ya consta—, o ausente
 *     momentáneo ese mismo tiempo EN LA FASE, sumando todos sus ratos (mientras lo esté), que la mesa no
 *     necesita saber. Ninguno de los dos cuenta ya para «puede seguir» (ver `EncuentroDeclarado`).
 */
export interface PresenciaDeclarada {
  /**
   * Sin un `aqui` VIVO ni uno que juegue tantos tics, el asiento pasa a `estadoAusente` (el ausente
   * momentáneo de arriba).
   * Vuelve al primer `aqui` vivo, con su vuelta.
   */
  readonly ausenteTrasTics: Tics;
  /** Un estado que bloquea el paso y las acciones y que ninguna acción cancela: el ausente ni anda ni pega. */
  readonly estadoAusente: IdDeclarado;
  /** Sin CANAL tantos tics, la sala mete `arcade:ausente` en la mesa (una vez por asiento y fase). */
  readonly veredictoTrasTics: Tics;
}

/** Una clase de aviso: marcar, pedir ayuda, «voy»… `objetivo` dice a qué apunta. */
export interface ClaseDeAviso {
  readonly id: IdDeclarado;
  /** Lo que dura en pantalla. */
  readonly vidaTics: Tics;
  /** A qué apunta el `objetivo` del aviso: el número de una entidad, el de un asiento, o nada (0). */
  readonly objetivo: 'entidad' | 'asiento' | 'ninguno';
}

/** LOS AVISOS (declaración Q): la sala los reenvía a todos; uno por asiento cada `cadaTics` como mucho. */
export interface AvisosDeclarados {
  readonly clases: readonly ClaseDeAviso[];
  readonly cadaTics: Tics;
}

/** LA RED: lo que la sala le perdona a una conexión lenta. */
export interface RedDeclarada {
  /** `comp = min(rtt/2 + compBaseMs, compTopeMs)`: cuánto espera la sala una esquiva tras el impacto. */
  readonly compBaseMs: Milisegundos;
  readonly compTopeMs: Milisegundos;
  /** Cuánto espera el juicio de una bala los sitios que el blanco declaró para esos tics. */
  readonly esperaDeSitiosMs: Milisegundos;
}

/**
 * EL AFORO (declaración U): lo más que vive a la vez en la sala. Es tope y es el coste declarado.
 *
 * ES DE LA MESA, NO DE LA FASE: el mismo en todas las declaraciones que el productor saque de una mesa,
 * la reunión incluida, y el mayor de todas las fases que esa mesa pueda alcanzar. La plataforma admite
 * una sala por su coste (`costeDeLaLiza` en `lizas.ts`) cuando nace; si el aforo pudiera crecer al
 * empezar el combate, se admitirían salas que luego no caben. Por eso la E/S no mete una declaración
 * cuyo aforo no sea el de la sala (ver `EntradaVista`), y el comprobador de cada juego lo exige en todas
 * sus fases.
 */
export interface AforoDeLaSala {
  /** Entidades vivas a la vez (1 … `TOPE_DE_ENTIDADES`). */
  readonly entidades: number;
  /** Balas en vuelo a la vez (0 … `TOPE_DE_BALAS`). */
  readonly balas: number;
  /** Montones en el suelo a la vez (0 … `TOPE_DE_MONTONES`; 0 si no hay portables). */
  readonly montones: number;
}

/* ─── S · LOS VEREDICTOS ─────────────────────────────────────────────────── */

/**
 * LO QUE LA SALA CUENTA DE CADA ASIENTO PARA LA MESA, y qué es cada número.
 *
 * ═══ TODO ES DE LA FASE QUE LA RONDA CIERRA ═══
 *
 * Cada columna cuenta DESDE QUE EMPEZÓ LA FASE (ver `FaseDeLaLiza`): no desde que nació la sala, ni la
 * partida, ni nada que la sala tuviera que recordar entre fases. La mesa SUMA las de cada ronda; si la
 * sala contara desde que nació, un despliegue a media partida las bajaría y la mesa no sabría restar. Y
 * cada fase mete como mucho una ronda, así que sumar no cuenta dos veces (ver `CargaDeRonda`).
 *
 * Tres columnas no son cuentas sino cómo QUEDA el asiento al cerrar: `vida`, `medidor` y `lleva` —lo
 * que la mesa guarda como punto de control—.
 *
 *   · `puntos` — ganados en la fase, ya multiplicados, con lo cobrado al salir dentro.
 *   · `vida` — al cerrar; 0 si está sin vida o esperando volver; la que tenía al salir si salió.
 *   · `medidor` — al cerrar.
 *   · `limpias` — esquivas limpias, contra golpes y contra balas.
 *   · `serieMaxima` — la serie más larga de limpias seguidas sin recibir daño.
 *   · `amenazas` — golpes de entidad y balas que se juzgaron contra él (lo que `limpias` divide).
 *   · `rematadas` — entidades que remató.
 *   · `choques` — empujes suyos que chocaron con la estructura.
 *   · `rescates` — rescates que completó él.
 *   · `caidas` — veces que se quedó sin vida.
 *   · `reapariciones` — veces que volvió pagando el recurso del equipo.
 *   · `esquivas` — esquivas que empezó, rupturas aparte (lo que gasta de sus `primeras`).
 *   · `salio` — 1 si salió por la zona de acción, 0 si no.
 */
export type ContadorDeAsiento =
  | 'puntos'
  | 'vida'
  | 'medidor'
  | 'limpias'
  | 'serieMaxima'
  | 'amenazas'
  | 'rematadas'
  | 'choques'
  | 'rescates'
  | 'caidas'
  | 'reapariciones'
  | 'esquivas'
  | 'salio';

/** Todos los contadores, en el orden de arriba: para validar y para los lectores. */
export const CONTADORES_DE_ASIENTO: readonly ContadorDeAsiento[] = [
  'puntos',
  'vida',
  'medidor',
  'limpias',
  'serieMaxima',
  'amenazas',
  'rematadas',
  'choques',
  'rescates',
  'caidas',
  'reapariciones',
  'esquivas',
  'salio',
];

/**
 * Una columna de `cuentas`: un contador; o, de un portable, cuántos LLEVA al cerrar (0 si salió: lo
 * cobró) o cuántos COBRÓ al salir en la fase.
 */
export type ColumnaDeCuenta =
  | { readonly que: ContadorDeAsiento }
  | { readonly que: 'lleva'; readonly portable: IdDeclarado }
  | { readonly que: 'cobrado'; readonly portable: IdDeclarado };

/**
 * QUÉ LLEVA CADA FILA DE `cuentas` (declaración S). La fila de un asiento es `[número, …columnas]`:
 * el número del asiento en el cable y, detrás, un entero por columna en este orden. El juego lo declara
 * y su reductor lo lee con la misma lista. De 1 a `TOPE_DE_COLUMNAS`, sin repetir ninguna: la carga
 * entera tiene que caber en `TOPE_DE_CARGA_DE_LA_MESA` con quince asientos y cada número en su tope.
 */
export interface VeredictosDeclarados {
  readonly columnas: readonly ColumnaDeCuenta[];
}

/** Los tipos de los veredictos de la plataforma que mete la sala (por `meterDeLaPlataforma`). */
export const VEREDICTO_DE_RONDA = 'arcade:ronda';
export const VEREDICTO_DE_RELOJ = 'arcade:reloj';
export const VEREDICTO_DE_AUSENTE = 'arcade:ausente';

/** Cómo acabó un encuentro. Ver `EncuentroDeclarado`. */
export type ResultadoDeRonda = 'ganada' | 'aguantada' | 'perdida';

/**
 * `arcade:ronda {n, resultado, cuentas, recurso}`: se cerró el encuentro `n`. `cuentas` lleva una fila
 * por asiento de la liza, en orden de número (ver `VeredictosDeclarados` y, para lo que significa cada
 * número, `ContadorDeAsiento`); `recurso` es el del equipo al cerrar. Grueso a propósito: uno por
 * encuentro, nunca uno por golpe.
 *
 * El reductor la acepta SÓLO si `n` es la ronda de la fase en curso de la mesa, y al aceptarla cambia
 * de fase: una ronda repetida (la sala se rehízo tras meterla) o atrasada se rechaza, y así las cuentas
 * nunca se suman dos veces.
 */
export interface CargaDeRonda {
  readonly n: number;
  readonly resultado: ResultadoDeRonda;
  readonly cuentas: readonly (readonly number[])[];
  readonly recurso: number;
}

/**
 * `arcade:reloj {id}`: venció el reloj de fase `id` (ver `RelojDeFase`).
 *
 * ═══ EL RELOJ QUE LLEGA TARDE ENTRA SIN EFECTO ═══
 *
 * La sala lee la vista de la mesa a su ritmo, así que a menudo mete el reloj de una fase que la mesa ya
 * dejó —la pausa en que eligieron todos antes de que venciera, el tope de una fase cuyo reloj cambió—.
 * La mesa lo toma SIN EFECTO: el mismo estado, sin motivo. Rechazarlo sería decir que la sala hizo algo
 * mal, y no lo hizo. Lo mismo el `arcade:ausente` de quien ya consta como ausente: la sala lo repite en
 * cada fase de combate. Lo que sí se rechaza es lo que ninguna sala sana manda: una carga que no tiene
 * la forma, o un veredicto firmado por un asiento.
 */
export interface CargaDeReloj {
  readonly id: string;
}

/** `arcade:ausente {a}`: el asiento `a` (su `AsientoId`) lleva `veredictoTrasTics` sin canal. */
export interface CargaDeAusente {
  readonly a: string;
}

/** Un veredicto, como lo mete la sala: el movimiento entero. */
export type VeredictoDeLaLiza =
  | { readonly tipo: typeof VEREDICTO_DE_RONDA; readonly carga: CargaDeRonda }
  | { readonly tipo: typeof VEREDICTO_DE_RELOJ; readonly carga: CargaDeReloj }
  | { readonly tipo: typeof VEREDICTO_DE_AUSENTE; readonly carga: CargaDeAusente };

/* ─── LA DECLARACIÓN ENTERA ──────────────────────────────────────────────── */

/**
 * LO QUE UNA LIZA DECLARA. La devuelve el productor del juego (`lizas.ts`) a partir de la vista pública
 * de la mesa y su código, y es la misma en la sala y en el aparato.
 */
export interface LizaDeclarada {
  readonly version: typeof VERSION_DE_LA_DECLARACION;
  readonly mundo: MundoDeLaLiza;
  readonly fase: FaseDeLaLiza;
  /** Un reglamento por asiento, en el orden de la mesa (1-15). */
  readonly asientos: readonly ReglasDeAsiento[];
  /** El catálogo de estados. */
  readonly estados: readonly EstadoDeclarado[];
  readonly clases: readonly ClaseDeEntidad[];
  readonly proyectiles: readonly ProyectilDeclarado[];
  readonly turnos: TurnosDeclarados;
  readonly portables: readonly PortableDeclarado[];
  readonly equipo: EquipoDeclarado;
  readonly sinCuerpo: SinCuerpoDeclarado;
  readonly presencia: PresenciaDeclarada;
  readonly avisos: AvisosDeclarados;
  readonly red: RedDeclarada;
  readonly veredictos: VeredictosDeclarados;
  readonly aforo: AforoDeLaSala;
}

/* ─── LO QUE ENTRA: LA LIZA ABIERTA (L1-L12) ─────────────────────────────── */

/*
 * ═══ POR QUÉ ESTÁN AQUÍ Y NO DENTRO DE `LizaDeclarada` TODAVÍA ═══
 *
 * Una declaración que la sala no cumple es una promesa que nadie guarda: un productor la escribiría,
 * `problemasDeLaDeclaracion` la daría por buena y la sala haría otra cosa sin decir nada. Así que cada una
 * entra en su sitio de `LizaDeclarada` el MISMO DÍA que la sala la cumpla, con su segundo uso nombrado y su
 * prueba en una liza de juguete abierta. Hasta entonces vive aquí con su FORMA fijada, su SITIO dicho y su
 * REVISIÓN escrita (`problemasDeLaAmpliacion`), para que quien la produce y quien la cumple trabajen a la vez
 * contra lo mismo sin preguntarse. Quien la cablea mueve su revisión a `revisar`: la forma no cambia.
 *
 * ═══ LO QUE COMPARTEN: EL RACIMO Y EL PUNTO DE UN DISPARO ═══
 *
 *   · UN RACIMO (L11) son los asientos con cuerpo unidos en cadena: dos quedan unidos a `une` o menos y se
 *     separan a más de `separa` (la diferencia es la histéresis). La sala los rehace cada `cadaTics`. El
 *     PRINCIPAL es el de más miembros; empate, el que tiene el asiento de número menor. Su CENTRO es la media
 *     de los sitios de sus miembros en Q16.16, truncada hacia abajo (`Math.floor(suma / miembros)`), y su
 *     RUMBO, `rumboHacia` de lo que se movió ese centro en los últimos `rumboTics` (quieto: hacia el centro
 *     de la zona pendiente más cercana por el grafo; sin ninguna, 0). Sin `racimos` declarados, todos los
 *     asientos con cuerpo son un solo racimo.
 *   · EL PUNTO DE UN DISPARO (L2) es desde donde se mide dónde sale lo que salta, y su rumbo: con `entrar`,
 *     el centro de la zona y el rumbo del racimo principal; con `calma`, el centro y el rumbo del racimo que
 *     lleva la calma; con `rezagado`, el sitio y la mirada del asiento; con `ronda`, el sitio y la mirada del
 *     miembro que avisó; y con `tic`, el centro y el rumbo del racimo principal en el tic en que sale cada
 *     una. Sale en el suceso `disparo` (menos con `tic`, que no espera a nada).
 */

/** L1 · Hacia dónde se busca el nudo, visto desde el rumbo del punto del disparo. */
export type SesgoDelNudo = 'delante' | 'detras' | 'cualquiera';

/**
 * L1 · SALIR DE UN NUDO DEL GRAFO: cada entidad del grupo sale en un nudo a `desde`-`hasta` en recta del
 * punto del disparo, que cumpla:
 *
 *   · con `sesgo` `delante`, dentro de ±`conoRumbos` del rumbo del punto; `detras`, dentro del cono opuesto;
 *     `cualquiera`, sin cono (y `conoRumbos` no pesa: va a 0).
 *   · con `sinVista`, que no se vea desde ningún asiento con cuerpo (prueba de losa de su sitio al nudo).
 *
 * Los que cumplen, en orden de (distancia al punto, índice): la entidad `k` del disparo toma el `k`-ésimo
 * (módulo cuántos). Si no hay ninguno, se busca en la banda siguiente del mismo ancho (`hasta` a
 * `2·hasta − desde`); si tampoco, las dos otra vez sin cono; y si tampoco, esa entidad espera al tic
 * siguiente. Segundo uso: hordas que salen de las calles de cualquier liza abierta.
 */
export interface EleccionPorNudo {
  readonly tipo: 'nudo';
  readonly desde: Longitud;
  readonly hasta: Longitud;
  readonly sesgo: SesgoDelNudo;
  readonly conoRumbos: Rumbos;
  readonly sinVista: boolean;
}

/**
 * L5 · SALIR DE LA ZONA DE ACCIÓN ACTIVA DE UNA BANDA: la de la banda `banda` (0 = la primera de las
 * `bandas` de la zona del fin). Es la `zonaDeAccion` de hoy cuando hay varias activas: quien guarda una
 * salida guarda ésa.
 */
export interface EleccionPorBanda {
  readonly tipo: 'zonaDeAccion';
  readonly banda: number;
}

/** L1 y L5 · Lo que será `GrupoDeclarado.eleccion`: lo de hoy, un nudo o la zona activa de una banda. */
export type EleccionDeGrupo = EleccionDeZona | EleccionPorNudo | EleccionPorBanda;

/**
 * L2 · CUÁNDO SALTA UN GRUPO. Hoy todo grupo sale desde el tic `desdeTic` del encuentro; con un disparo que
 * no es `tic`, el grupo ESPERA hasta que se cumple lo suyo, y entonces:
 *
 *   · la sala manda el suceso `disparo` con el número del grupo y el punto (el aviso que se ve venir);
 *   · `desdeTic` cuenta desde ESE tic (el aviso dura eso) y `cadaTics` como hoy;
 *   · `cuantos` es lo que sale CADA VEZ que salta (con `tic` y `entrar`, salta una vez; con `rezagado`, es
 *     lo que sale como mucho por cada asiento mientras lo sea).
 *
 * Todo lo que sale cuenta en los `vivasALaVez` del encuentro, como hoy.
 */
export type DisparoDeGrupo = DisparoPorTic | DisparoAlEntrar | DisparoPorCalma | DisparoPorRezagado | DisparoPorRonda;

/** El de hoy: sale desde el tic `desdeTic` del encuentro. */
export interface DisparoPorTic {
  readonly tipo: 'tic';
}

/**
 * Salta cuando hay al menos `minimo` (por presentes) asientos con cuerpo a `radio` o menos del centro de la
 * zona `zona`. Los grupos del mismo `conjunto` (1-255; 0 = de ninguno) son EXCLUYENTES: en el tic en que
 * salta uno, saltan con él los de su conjunto que esperan en la MISMA zona, y los que esperan en otra quedan
 * ANULADOS (no saltan nunca en este encuentro). Es un objetivo que se activa al llegar: el primero al que se
 * llega es el que se juega. Segundo uso: un objetivo que se activa al llegar, en cualquier liza.
 */
export interface DisparoAlEntrar {
  readonly tipo: 'entrar';
  readonly zona: IdDeclarado;
  readonly radio: Longitud;
  readonly minimo: PorPresentes;
  readonly conjunto: number;
}

/**
 * Salta cuando un racimo lleva `tics` SIN COMBATE —ninguna entidad a `radioDeCombate` o menos de ninguno de
 * sus miembros, y ningún golpe dado ni recibido por ellos— contados desde que empezó el encuentro o desde su
 * último combate, y su centro está a más de `lejosDeZonas.distancia` del centro de toda zona de los grupos
 * `entrar` del conjunto `lejosDeZonas.conjunto` que aún esperan (conjunto 0: sin esa condición). Al saltar,
 * su cuenta vuelve a cero. Salta `veces` como mucho en el encuentro, contando todos los racimos.
 *
 * Tiene su cuenta el racimo principal, y además los `secundarios.racimos` más grandes de los demás con
 * `secundarios.miembros` o más (empate, el del asiento menor). Lo que sale para un racimo secundario de `m`
 * miembros es `max(secundarios.minimo, ⌊cuantos · m / presentes⌋)`.
 */
export interface DisparoPorCalma {
  readonly tipo: 'calma';
  readonly tics: Tics;
  readonly radioDeCombate: Longitud;
  readonly lejosDeZonas: { readonly conjunto: number; readonly distancia: Longitud };
  readonly veces: number;
  readonly secundarios: { readonly racimos: number; readonly miembros: number; readonly minimo: number };
}

/**
 * Salta por cada asiento con cuerpo que lleva más de `tics` a más de `distancia` del asiento con cuerpo más
 * cercano (sólo hay rezagado con dos o más con cuerpo): mientras lo sea, le sale una cada `cadaTics`, con
 * `vivas` vivas como mucho por rezagado. El suceso `disparo` sale cuando pasa a rezagado, no con cada una.
 */
export interface DisparoPorRezagado {
  readonly tipo: 'rezagado';
  readonly distancia: Longitud;
  readonly tics: Tics;
  readonly cadaTics: Tics;
  readonly vivas: number;
}

/**
 * L3 · Lo salta el aviso de una ronda que lo nombra en su `refuerzo`, y nada más: sin esa ronda, no saltaría
 * nunca (`problemasDeLaAmpliacion` lo exige).
 */
export interface DisparoPorRonda {
  readonly tipo: 'ronda';
}

/**
 * L3 · UNA RONDA DE GUION: unas entidades que dan vueltas a un circuito del grafo SIN SER ENTIDADES. Su sitio
 * es una función pura del tic —`sitioDeLaRonda(ronda, grafo, tic, miembro)`, en `rondas.ts`, con `tic` los
 * tics desde que empezó el encuentro—, así que lejos no cuestan nada y todos los aparatos las pintan en el
 * mismo sitio.
 *
 *   · `miembros`: la clase de cada uno, en fila: el primero delante y cada uno `separacion` detrás del
 *     anterior, a lo largo del circuito. `ruta`: los nudos del circuito, cerrado (de cada uno al siguiente, y
 *     del último al primero, hay arista). Van a `paso` con `desfaseTics`.
 *   · SE MATERIALIZA cuando un asiento con cuerpo pasa a `materializa` o menos de un miembro, con
 *     `RondasDeclaradas.aLaVez` materializadas como mucho: cada miembro nace EN SU SITIO DEL GUION (`nace`
 *     con `ro`), sigue el circuito (el modo `patrullar` del cerebro) y el paso no se ve.
 *   · VE a un asiento con cuerpo a `vista.radio` o menos, dentro de ±`vista.conoRumbos` de su mirada y con
 *     línea de vista; OYE al que está a `oido.radio` o menos, o a `oido.aLaCarrera` si va en su marcha más
 *     rápida. Al ver u oír, AVISA: salta el grupo `refuerzo` (su número, 1…; 0 = ninguno) desde el miembro que
 *     avisó, y la ronda pelea como cualquier entidad. Si en cambio le pegan primero a un miembro desprevenido
 *     (L9), el aviso espera `alarmaTics`: si la ronda entera cae antes, no avisa.
 *   · Si se olvidan (L10) todos sus miembros vivos, `alOlvidarse` dice si vuelve a su guion (`guion`) o se
 *     acaba en este encuentro (`consumida`). Derrotada, se acaba siempre.
 *
 * Segundo uso: guardias que hacen su ronda en cualquier tablero; animales que pastan.
 */
export interface RondaDeclarada {
  readonly miembros: readonly IdDeclarado[];
  readonly ruta: readonly number[];
  readonly paso: Velocidad;
  readonly separacion: Longitud;
  readonly desfaseTics: Tics;
  readonly materializa: Longitud;
  readonly alOlvidarse: 'guion' | 'consumida';
  readonly vista: { readonly radio: Longitud; readonly conoRumbos: Rumbos };
  readonly oido: { readonly radio: Longitud; readonly aLaCarrera: Longitud };
  readonly alarmaTics: Tics;
  readonly refuerzo: number;
}

/** L3 · Las rondas de un encuentro: su número en el cable (`ro`) es su puesto en `lista` más uno. */
export interface RondasDeclaradas {
  readonly aLaVez: number;
  readonly lista: readonly RondaDeclarada[];
}

/** L3 · Dónde está un miembro de una ronda en un tic: lo que devuelve `sitioDeLaRonda`. Q16.16 y rumbo 0-255. */
export interface SitioDeUnMiembro {
  readonly x: Longitud;
  readonly z: Longitud;
  readonly rumbo: Rumbos;
}

/**
 * L4 · CÓMO SE CUMPLE UN OBJETIVO:
 *   · `vaciar` — lo que sacaron los grupos del conjunto que saltaron ya salió entero, no queda nada vivo y no
 *     queda ningún montón suyo en el suelo (como el `vaciar` de hoy, pero sólo con ésos);
 *   · `rematar` — se remata una entidad de la clase `clase` salida de un grupo del conjunto;
 *   · `leer` — los asientos que mantienen `accion` a `radio` o menos del centro de la zona que abrió el
 *     objetivo suman, cada tic, `min(cuántos, capacidad)`; se cumple al llegar a `tics`. Con `rompeConDano`
 *     un golpe corta al que lee (tiene que volver a pulsar), pero lo leído no se borra. Quien lee está en
 *     `puesta`. La sala manda `progreso` a 2 Hz mientras suba.
 */
export type ComoSeCumple =
  | { readonly tipo: 'vaciar' }
  | { readonly tipo: 'rematar'; readonly clase: IdDeclarado }
  | {
      readonly tipo: 'leer';
      readonly accion: IdDeclarado;
      readonly radio: Longitud;
      readonly tics: Tics;
      readonly capacidad: number;
      readonly rompeConDano: boolean;
      readonly puesta: PuestaDeEstado;
    };

/**
 * L4 · UN ENCUENTRO QUE SE GANA CUMPLIENDO UN OBJETIVO: la otra forma de `FinDelEncuentro`. El objetivo se
 * ABRE cuando salta el primer grupo `entrar` de su `conjunto` (1-255), y su zona es la de ese grupo. Al
 * cumplirse, la sala mete el `arcade:ronda` `ganada` con esa zona (L7) en ese mismo tic, deja de sacar a
 * nadie, y disuelve lo que quede vivo a los `disuelveTrasTics`. Si vence el reloj, `aguantada` con la zona
 * que se abrió (o 0 si no se abrió ninguna): la mesa sabe así si se perdió un objetivo o sigue pendiente. Si
 * nadie puede seguir, `perdida`.
 */
export interface FinPorObjetivo {
  readonly tipo: 'objetivo';
  readonly conjunto: number;
  readonly como: ComoSeCumple;
  readonly disuelveTrasTics: Tics;
}

/**
 * L5 · UNA BANDA DE DISTANCIA: de `desde` a `hasta` POR EL GRAFO desde el centro del racimo principal (del
 * nudo más cercano a él al nudo más cercano al centro de la zona), y lo que se suma a los puntos de quien
 * sale por una zona de esa banda (0 = nada; con factor y multiplicador, como toda suma).
 */
export interface BandaDeDistancia {
  readonly desde: Longitud;
  readonly hasta: Longitud;
  readonly puntos: number;
}

/**
 * L12 · QUÉ HACE UNA ZONA DE ACCIÓN a quien acaba de mantenerla: `salir` (lo de hoy: cobra y sale) o
 * `soltar` un montón de `cuantos` del portable `portable` en su centro, y apagarse. Segundo uso: cofres,
 * talleres.
 */
export type EfectoDeLaZona = { readonly tipo: 'salir' } | { readonly tipo: 'soltar'; readonly portable: IdDeclarado; readonly cuantos: number };

/**
 * L5 y L12 · LA ZONA DE ACCIÓN AMPLIADA: la de hoy, y además
 *   · `activasALaVez` (1-3): con más de una, se activa una por banda, cada una la zona de su clase que caiga
 *     en su banda (sorteada con el azar de la sala entre las que caen); con `bandas` vacía, sorteada entre
 *     las de su clase, como hoy (y entonces `activasALaVez` es 1);
 *   · `relevo`: dónde se busca la que se enciende al apagarse una con asientos aún en juego (`null`: entre
 *     las de su clase, como hoy);
 *   · `efecto`: `salir` en la zona del fin; `soltar` en las de `EncuentroDeclarado.zonasDeAccion`.
 * La `capacidad` es de cada zona.
 */
export interface ZonaDeAccionAmpliada extends ZonaDeAccionDeclarada {
  readonly activasALaVez: number;
  readonly bandas: readonly BandaDeDistancia[];
  readonly relevo: BandaDeDistancia | null;
  readonly efecto: EfectoDeLaZona;
}

/** L6 · Un punto del mundo, en Q16.16. */
export interface PuntoDelMundo {
  readonly x: Longitud;
  readonly z: Longitud;
}

/**
 * L6 · DÓNDE SE NACE Y SE VUELVE.
 *   · `FaseDeLaLiza.puntoDeControl: PuntoDelMundo | null`: con un punto, quien nace al EMPEZAR la fase lo
 *     hace en los sitios de papel `asiento` ordenados por su distancia a él (empate, el índice menor): el
 *     asiento `i` toma el `i`-ésimo, módulo cuántos. Quien entra A MEDIA FASE, en el más cercano al centro
 *     del racimo principal (sin racimo, al punto). Con `null`, como hoy (el asiento `i` usa el sitio `i`).
 *   · `EquipoDeclarado.reaparicion.donde`: `orden` es lo de hoy; `cercaDelGrupo`, quien reaparece lo hace
 *     en el sitio de papel `reaparicion` más cercano al centro del racimo principal (sin racimo, al punto de
 *     control; sin él, como hoy) en el que no haya otro cuerpo a dos radios o menos (todos ocupados: el
 *     más cercano).
 */
export type DondeSeNace = 'orden' | 'cercaDelGrupo';

/**
 * L7 · EL `arcade:ronda` CON LA ZONA CON QUE SE CERRÓ: la de un objetivo (L4) o la de salida, o 0 si no hay
 * ninguna. Es lo que deja a la mesa marcar QUÉ objetivo se resolvió y mover su punto de control sin
 * adivinarlo. Segundo uso: un objetivo cumplido en un tablero. Pesa 11 bytes más que hoy, y la ronda más
 * pesada sigue cabiendo en la carga de la mesa (`verify:liza-protocolo`).
 */
export interface CargaDeRondaConZona extends CargaDeRonda {
  readonly zona: number;
}

/**
 * L8 · A QUÉ APUNTA UN AVISO: lo de hoy, o un NUDO del grafo: el `objetivo` del cable es su índice más uno
 * (cabe en el tope de 65.535, así que el cable no cambia de forma). Segundo uso: marcar un sitio en
 * cualquier juego.
 */
export type ObjetivoDeAviso = ClaseDeAviso['objetivo'] | 'nudo';

/**
 * L9 · EL GOLPE AL DESPREVENIDO: el primer impacto de un asiento a un miembro de una ronda que aún no ha
 * visto ni oído a nadie hace `factor` veces su daño (Q16.16, de ×1 a `TOPE_DE_MULTIPLICADOR`) y da `puntos`
 * al autor. Va en `ClaseDeEntidad.desprevenida` (`null`: sin esto). Segundo uso: el sigilo de cualquier liza.
 */
export interface DesprevenidaDeclarada {
  readonly factor: Proporcion;
  readonly puntos: number;
}

/**
 * L10 · EL OLVIDO (`EncuentroDeclarado.olvido`; ya en `LizaDeclarada`: la sala lo cumple). Una entidad que
 * pasa `tics` seguidos sin ningún asiento PRESENTE a `distancia` o menos en recta se va (`seva` con
 * `disuelta`, sin soltar nada) y VUELVE A LA COLA DE SU GRUPO: cuenta como no salida, y el grupo la vuelve a
 * sacar con sus reglas —su zona, su ritmo, sus vivas a la vez—. Si se fuera sin más, alejarse ganaría un
 * `vaciar` sin pelear.
 *
 *   · PRESENTE es tener cuerpo y no estar ausente ni sin cuerpo: el caído cuenta (la pelea sigue donde
 *     cayó); el ausente momentáneo no (nadie lo persigue, y lo que se quedara a su lado esperaría a nadie).
 *   · EL RELOJ sólo corre mientras la entidad aparece, acecha o ronda: la que ataca, apunta, dispara, está
 *     caída, absorbe o está deshecha tiene su propio curso, y cuando lo acaba empieza a contar de cero. Así
 *     no se olvida nada con un golpe, una línea de apuntado o un remate a medias.
 *   · Se mira cada tic antes de pensar: la olvidada ya no piensa, y el grupo puede sacar a otra en ese
 *     mismo tic si sus reglas lo dejan.
 *
 * Con el ALCANCE DE BLANCO (`CerebroDeclarado.alcanceDeBlanco`) se puede huir de verdad: lo vivo se queda
 * donde está la gente y nadie cruza el mundo persiguiendo a uno. Con olvido, cada clase declara un alcance de
 * 1 a `distancia` (`problemasDeLaDeclaracion` lo exige): lo que persigue a alguien lo tiene cerca, y no se
 * olvida a media persecución. Y entre las dos distancias no hay dónde quedarse: la entidad que no tiene a
 * nadie a su alcance pero sí a alguien a `distancia` o menos anda hacia él (ver `alcanceDeBlanco`), así que
 * cada una o pelea, o se acerca, o se olvida. Segundo uso: cualquier liza abierta (la de juguete de 300 × 300
 * de `verify:liza`).
 */
export interface OlvidoDeclarado {
  /** Hasta dónde se está acompañado (Q16.16, ≥ 1). */
  readonly distancia: Longitud;
  /** Cuántos tics seguidos sin nadie presente a esa distancia hacen olvidarse (≥ 1). */
  readonly tics: Tics;
}

/** L11 · LOS RACIMOS (ver arriba): une y separa en Q16.16 (`une ≤ separa`), cada cuántos tics y el rumbo de cuántos. */
export interface RacimosDeclarados {
  readonly une: Longitud;
  readonly separa: Longitud;
  readonly cadaTics: Tics;
  readonly rumboTics: Tics;
}

/**
 * LA AMPLIACIÓN DE UNA LIZA: L1-L12 puestas DONDE IRÁN, para revisarlas contra una `LizaDeclarada` de hoy
 * con `problemasDeLaAmpliacion`. Cada campo dice su sitio:
 *
 *   · `grupos` — uno por grupo del encuentro, en su orden: su `eleccion` (L1, L5) y su `disparo` (L2).
 *   · `rondas` (L3), `racimos` (L11) y `zonasDeAccion` (L12) — en `EncuentroDeclarado`.
 *   · `fin` (L4) — el `FinDelEncuentro` cuando es un objetivo; `null`, el de hoy.
 *   · `salida` (L5) — la zona del fin `salida`, ampliada; `null` si el fin no es de salida.
 *   · `puntoDeControl` (L6) — en `FaseDeLaLiza`; `reaparicion` (L6) — en `EquipoDeclarado.reaparicion.donde`.
 *   · `avisos` (L8) — uno por clase de aviso, en su orden: lo que será su `objetivo`.
 *   · `clases` (L9) — una por clase de entidad, en su orden: su `desprevenida`.
 *
 * L7 no tiene sitio aquí: es la carga del veredicto (`CargaDeRondaConZona`), no la declaración. Y L10 ya no:
 * entró en `LizaDeclarada` (el alcance, en el cerebro de cada clase; el olvido, en el encuentro), y su
 * revisión con ella, en `problemasDeLaDeclaracion`.
 */
export interface AmpliacionDeLaLiza {
  readonly grupos: readonly { readonly eleccion: EleccionDeGrupo; readonly disparo: DisparoDeGrupo }[];
  readonly rondas: RondasDeclaradas | null;
  readonly fin: FinPorObjetivo | null;
  readonly salida: ZonaDeAccionAmpliada | null;
  readonly zonasDeAccion: readonly ZonaDeAccionAmpliada[];
  readonly racimos: RacimosDeclarados | null;
  readonly puntoDeControl: PuntoDelMundo | null;
  readonly reaparicion: DondeSeNace;
  readonly avisos: readonly ObjetivoDeAviso[];
  readonly clases: readonly { readonly desprevenida: DesprevenidaDeclarada | null }[];
}

/** La ampliación que no amplía nada: lo de hoy dicho con la forma de mañana (para empezar a producirla). */
export function ampliacionDeHoy(d: LizaDeclarada): AmpliacionDeLaLiza {
  const encuentro = d.fase.encuentro;
  const grupos: { readonly eleccion: EleccionDeGrupo; readonly disparo: DisparoDeGrupo }[] = [];
  if (encuentro !== null) for (const g of encuentro.grupos) grupos.push({ eleccion: g.eleccion, disparo: { tipo: 'tic' } });
  const salida =
    encuentro !== null && encuentro.fin.tipo === 'salida'
      ? { ...encuentro.fin.zona, activasALaVez: 1, bandas: [], relevo: null, efecto: { tipo: 'salir' } as const }
      : null;
  const avisos: ObjetivoDeAviso[] = [];
  for (const c of d.avisos.clases) avisos.push(c.objetivo);
  const clases: { readonly desprevenida: DesprevenidaDeclarada | null }[] = [];
  for (let i = 0; i < d.clases.length; i++) clases.push({ desprevenida: null });
  return { grupos, rondas: null, fin: null, salida, zonasDeAccion: [], racimos: null, puntoDeControl: null, reaparicion: 'orden', avisos, clases };
}

/* ─── AYUDAS QUE USAN LOS DOS LADOS ──────────────────────────────────────── */

/**
 * LA ARENA DE UNA LIZA: la de `mundo.ts`, derivada del suelo. La MISMA llamada en la sala y en el
 * aparato: si el aparato predijera su paso con otra arena, andaría por sitios que la sala no acepta.
 *
 * Es una función pura del suelo, así que se guarda por su IDENTIDAD: la revisión de la declaración la
 * deriva para mirar los sitios de nacer, y la sala y el aparato la vuelven a pedir con el mismo suelo
 * (una ciudad son 4.761 casillas y 1.300 cajas: ver «la validación del mundo»). Y así la sala, el aparato y
 * el índice de losas de `geometria.ts`, que se guarda por la identidad de `Arena.cuerpos`, trabajan sobre
 * la misma. Una `Arena` no se muta: nadie en la casa lo hace.
 */
export function arenaDeLaLiza(liza: LizaDeclarada): Arena {
  return arenaDelSuelo(liza.mundo.suelo);
}

const ARENAS = new WeakMap<object, Arena>();

function arenaDelSuelo(suelo: MundoDeclarado): Arena {
  const guardable = typeof suelo === 'object' && suelo !== null;
  if (guardable) {
    const hecha = ARENAS.get(suelo);
    if (hecha !== undefined) return hecha;
  }
  const arena = arenaDe(suelo);
  if (guardable) ARENAS.set(suelo, arena);
  return arena;
}

/** El número en el cable de un asiento (1-15), o 0 si no está en la liza. */
export function numeroDelAsiento(liza: LizaDeclarada, asiento: string): number {
  for (let i = 0; i < liza.asientos.length; i++) {
    if ((liza.asientos[i] as ReglasDeAsiento).asiento === asiento) return i + 1;
  }
  return 0;
}

/** El reglamento del asiento de número `numero`, o `null` si no hay tal asiento. */
export function reglasDelNumero(liza: LizaDeclarada, numero: number): ReglasDeAsiento | null {
  if (!Number.isInteger(numero) || numero < 1 || numero > liza.asientos.length) return null;
  return liza.asientos[numero - 1] as ReglasDeAsiento;
}

/**
 * Todos los ids de acción que un asiento puede mandar en `aqui.a[0]`: sus golpes, su esquiva, su
 * rescate, los dos de su tiro (cargar y soltar) si lo tiene, el remate de cada clase rematable y la zona
 * de acción del encuentro, si la hay. En orden de aparición y sin repetir.
 */
export function accionesDelCable(liza: LizaDeclarada, reglas: ReglasDeAsiento): readonly IdDeclarado[] {
  const ids: number[] = [];
  const poner = (id: number): void => {
    if (ids.indexOf(id) < 0) ids.push(id);
  };
  for (const a of reglas.acciones) poner(a.id);
  poner(reglas.esquiva.accion);
  poner(reglas.rescate.accion);
  if (reglas.tiro !== null) {
    poner(reglas.tiro.apuntar);
    poner(reglas.tiro.soltar);
  }
  for (const c of liza.clases) if (c.alCaer.tipo === 'rematable') poner(c.alCaer.remate.accion);
  const encuentro = liza.fase.encuentro;
  if (encuentro !== null && encuentro.fin.tipo === 'salida') poner(encuentro.fin.zona.accion);
  return ids;
}

/** El valor de una tabla por presentes: el de `presentes` (acotado entre 1 y su largo). */
export function porPresentes(tabla: PorPresentes, presentes: number): number {
  if (tabla.length === 0) return 0;
  const i = presentes < 1 ? 0 : presentes > tabla.length ? tabla.length - 1 : presentes - 1;
  return tabla[i] as number;
}

/** Lo que vale llevar `n` de un portable al salir (la base, antes de factor y multiplicador). */
export function pagoDelPortable(portable: PortableDeclarado, n: number): number {
  return portable.pago.tipo === 'triangular' ? ((n * (n + 1)) / 2) * portable.pago.porUnidad : n * portable.pago.porUnidad;
}

/**
 * LO MÁS QUE PUEDE PESAR UN `arcade:ronda` con tantos asientos y columnas, en bytes de su forma
 * canónica —como lo pesa la mesa—: cada número en el tope que admite `leerCargaDeRonda` y el resultado
 * más largo. Se ESCRIBE y se pesa, en vez de estimarlo a mano: una estimación que se queda corta es
 * una ronda que la mesa rechaza a media partida.
 */
export function pesoDeLaRondaMasLarga(asientos: number, columnas: number): number {
  const cuentas: number[][] = [];
  for (let i = 0; i < asientos; i++) {
    const fila: number[] = [TOPE_DE_ASIENTOS];
    for (let c = 0; c < columnas; c++) fila.push(Number.MAX_SAFE_INTEGER);
    cuentas.push(fila);
  }
  const carga: CargaDeRonda = { n: TOPE_DE_CANTIDAD, resultado: 'aguantada', cuentas, recurso: TOPE_DE_CANTIDAD };
  return canonico(carga).length;
}

/* ─── LOS VEREDICTOS, MONTADOS Y LEÍDOS CON DESCONFIANZA ─────────────────── */

/**
 * ¿Es una CLAVE CORTA? De 1 a 64 letras de `A-Z a-z 0-9 _ . : -`: las claves de fase y los ids de
 * reloj. Sin nada que JSON tenga que escapar, su largo en el cable es su largo aquí, y así el suceso
 * `fase` más largo tiene un tamaño fijo con el que `protocolo.ts` hace sus cuentas.
 */
export function esClaveCorta(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(v);
}

/** El movimiento `arcade:ronda`, como lo construye la sala. */
export function veredictoDeRonda(carga: CargaDeRonda): VeredictoDeLaLiza {
  return { tipo: VEREDICTO_DE_RONDA, carga };
}

/** El movimiento `arcade:reloj`. */
export function veredictoDeReloj(id: string): VeredictoDeLaLiza {
  return { tipo: VEREDICTO_DE_RELOJ, carga: { id } };
}

/** El movimiento `arcade:ausente`. */
export function veredictoDeAusente(a: string): VeredictoDeLaLiza {
  return { tipo: VEREDICTO_DE_AUSENTE, carga: { a } };
}

function objetoConClaves(v: unknown, claves: readonly string[]): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const suyas = Object.keys(v);
  if (suyas.length !== claves.length) return false;
  for (const c of claves) if (!Object.prototype.hasOwnProperty.call(v, c)) return false;
  return true;
}

function enteroEntre(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/**
 * LA CARGA DE UN `arcade:ronda`, LEÍDA CON DESCONFIANZA. `null` si la manda alguien (`quien` no es
 * `null`: estos movimientos sólo los mete la sala, en nombre de nadie), si sobra o falta una clave, si
 * `n` no es un entero ≥ 1, si el resultado no es uno de los tres, si `cuentas` no trae exactamente una
 * fila por asiento —números 1…`asientos` en orden— con `columnas` enteros ≥ 0 detrás, o si el recurso
 * no es un entero ≥ 0. El reductor que reciba `null` RECHAZA: no hay veredicto a medias.
 */
export function leerCargaDeRonda(
  carga: unknown,
  quien: string | null,
  columnas: number,
  asientos: number,
): CargaDeRonda | null {
  if (quien !== null) return null;
  if (!objetoConClaves(carga, ['n', 'resultado', 'cuentas', 'recurso'])) return null;
  const { n, resultado, cuentas, recurso } = carga;
  if (!enteroEntre(n, 1, TOPE_DE_CANTIDAD)) return null;
  if (resultado !== 'ganada' && resultado !== 'aguantada' && resultado !== 'perdida') return null;
  if (!enteroEntre(recurso, 0, TOPE_DE_CANTIDAD)) return null;
  if (!Array.isArray(cuentas) || cuentas.length !== asientos) return null;
  const filas: number[][] = [];
  for (let i = 0; i < cuentas.length; i++) {
    const fila: unknown = cuentas[i];
    if (!Array.isArray(fila) || fila.length !== columnas + 1) return null;
    if (fila[0] !== i + 1) return null;
    const leida: number[] = [];
    for (const v of fila as unknown[]) {
      if (!enteroEntre(v, 0, Number.MAX_SAFE_INTEGER)) return null;
      leida.push(v);
    }
    filas.push(leida);
  }
  return { n, resultado, cuentas: filas, recurso };
}

/** La carga de un `arcade:reloj`: `{id}` con un id que es una clave corta, y en nombre de nadie. */
export function leerCargaDeReloj(carga: unknown, quien: string | null): CargaDeReloj | null {
  if (quien !== null) return null;
  if (!objetoConClaves(carga, ['id'])) return null;
  const { id } = carga;
  if (!esClaveCorta(id)) return null;
  return { id };
}

/** La carga de un `arcade:ausente`: `{a}` con un asiento sentado a la mesa, y en nombre de nadie. */
export function leerCargaDeAusente(carga: unknown, quien: string | null, asientos: readonly string[]): CargaDeAusente | null {
  if (quien !== null) return null;
  if (!objetoConClaves(carga, ['a'])) return null;
  const { a } = carga;
  if (typeof a !== 'string' || asientos.indexOf(a) < 0) return null;
  return { a };
}

/* ─── LA VALIDACIÓN ──────────────────────────────────────────────────────── */

/**
 * QUÉ LE PASA A UNA DECLARACIÓN, en frases; `[]` si está bien.
 *
 * La sala la llama antes de aceptar una declaración nueva y el comprobador de cada juego la exige en
 * verde para todas las fases que produce. Mira RANGOS (enteros, topes, cajas bien orientadas dentro de
 * la liza, conos de 0 a 64, intocable dentro de su estado…) y COHERENCIA (todo id que se nombra existe,
 * los ids no se repiten donde se buscan por id, las tablas por presentes tienen un valor por asiento,
 * el encuentro sólo en su modo, lo vivo cabe en el aforo…). No mira si los números SON BUENOS para
 * jugar: eso lo dice la gente jugando.
 *
 * Nunca lanza: una declaración con la forma equivocada —un productor que devuelve `undefined` donde
 * iba una lista— es un problema más de la lista, no un proceso caído.
 */
export function problemasDeLaDeclaracion(d: LizaDeclarada): string[] {
  const p: string[] = [];
  try {
    revisar(d, p);
  } catch (error) {
    p.push(`la declaración no tiene la forma del contrato: ${error instanceof Error ? error.message : String(error)}`);
  }
  return p;
}

/** Lo que va apuntando la revisión: las frases y cómo se dicen. */
interface Revision {
  readonly p: string[];
  /** Los ids de los estados que bloquean acciones: una puesta de uno que no bloquea no se suelta antes. */
  readonly bloquean: number[];
}

function entero(r: Revision, donde: string, v: unknown, min: number, max: number): boolean {
  if (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max) return true;
  r.p.push(`${donde}: vale ${JSON.stringify(v) ?? String(v)} y tiene que ser un entero de ${String(min)} a ${String(max)}`);
  return false;
}

function booleano(r: Revision, donde: string, v: unknown): void {
  if (typeof v !== 'boolean') r.p.push(`${donde}: tiene que ser verdadero o falso`);
}

function lista(r: Revision, donde: string, v: unknown): v is readonly unknown[] {
  if (Array.isArray(v)) return true;
  r.p.push(`${donde}: tiene que ser una lista`);
  return false;
}

function idsSinRepetir(r: Revision, donde: string, ids: readonly number[]): void {
  for (let i = 0; i < ids.length; i++) {
    if (ids.indexOf(ids[i] as number) !== i) r.p.push(`${donde}: el id ${String(ids[i])} se repite`);
  }
}

function existe(r: Revision, donde: string, id: number, ids: readonly number[], que: string): void {
  if (ids.indexOf(id) < 0) r.p.push(`${donde}: nombra ${que} ${String(id)}, que no está declarado`);
}

function caja(r: Revision, donde: string, c: CajaDeLaLiza): void {
  const bien =
    entero(r, `${donde}.x0`, c.x0, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA) &&
    entero(r, `${donde}.z0`, c.z0, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA) &&
    entero(r, `${donde}.x1`, c.x1, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA) &&
    entero(r, `${donde}.z1`, c.z1, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA);
  if (bien && !(c.x0 < c.x1 && c.z0 < c.z1)) r.p.push(`${donde}: la caja está del revés o no tiene interior (x0 < x1 y z0 < z1)`);
}

function longitud(r: Revision, donde: string, v: unknown, min = 0): void {
  entero(r, donde, v, min, 2 * TOPE_DE_LA_LIZA);
}

function radio(r: Revision, donde: string, v: unknown): void {
  entero(r, donde, v, 1, TOPE_DE_RADIO);
}

function tics(r: Revision, donde: string, v: unknown, min = 0): void {
  entero(r, donde, v, min, TOPE_DE_TICS);
}

function ms(r: Revision, donde: string, v: unknown): void {
  entero(r, donde, v, 0, TOPE_DE_VENTANA_MS);
}

function cantidad(r: Revision, donde: string, v: unknown, min = 0): void {
  entero(r, donde, v, min, TOPE_DE_CANTIDAD);
}

function puesta(r: Revision, donde: string, pu: PuestaDeEstado, estados: readonly number[]): void {
  if (entero(r, `${donde}.estado`, pu.estado, 1, TOPE_DE_ID)) existe(r, `${donde}.estado`, pu.estado, estados, 'el estado');
  tics(r, `${donde}.tics`, pu.tics, 1);
  if (entero(r, `${donde}.intocableTics`, pu.intocableTics, 0, TOPE_DE_TICS) && pu.intocableTics > pu.tics) {
    r.p.push(`${donde}.intocableTics: ${String(pu.intocableTics)} es más de lo que dura el estado (${String(pu.tics)})`);
  }
  longitud(r, `${donde}.distanciaExtra`, pu.distanciaExtra);
  if (entero(r, `${donde}.soltableDesdeTic`, pu.soltableDesdeTic, 0, TOPE_DE_TICS)) {
    if (pu.soltableDesdeTic > pu.tics) {
      r.p.push(`${donde}.soltableDesdeTic: ${String(pu.soltableDesdeTic)} es más de lo que dura el estado (${String(pu.tics)}); para no soltarlo nunca, igual a tics`);
    } else if (r.bloquean.indexOf(pu.estado) < 0 && pu.soltableDesdeTic !== pu.tics) {
      r.p.push(`${donde}.soltableDesdeTic: el estado ${String(pu.estado)} no bloquea acciones, así que no hay nada que soltar: va igual a tics (${String(pu.tics)})`);
    }
  }
}

function tablaPorPresentes(r: Revision, donde: string, t: PorPresentes, asientos: number, min: number): void {
  if (!lista(r, donde, t)) return;
  if (t.length !== asientos) r.p.push(`${donde}: tiene ${String(t.length)} valores y la liza tiene ${String(asientos)} asientos (uno por cada número de presentes)`);
  for (let i = 0; i < t.length; i++) cantidad(r, `${donde}[${String(i)}]`, t[i], min);
}

function efecto(r: Revision, donde: string, e: EfectoDeclarado, estados: readonly number[]): void {
  cantidad(r, `${donde}.dano`, e.dano);
  cantidad(r, `${donde}.danoAlRitmo`, e.danoAlRitmo);
  cantidad(r, `${donde}.puntos`, e.puntos);
  cantidad(r, `${donde}.puntosAlRitmo`, e.puntosAlRitmo);
  if (e.puesta !== null) puesta(r, `${donde}.puesta`, e.puesta, estados);
  longitud(r, `${donde}.empuje`, e.empuje);
  cantidad(r, `${donde}.alChocar.dano`, e.alChocar.dano);
  tics(r, `${donde}.alChocar.tics`, e.alChocar.tics);
  if (e.puesta === null && e.alChocar.tics !== 0) r.p.push(`${donde}.alChocar.tics: sin puesta no hay estado que alargar; tiene que ser 0`);
  booleano(r, `${donde}.rompeGuardia`, e.rompeGuardia);
}

function accion(r: Revision, donde: string, a: AccionDeclarada, estados: readonly number[], hermanas: readonly number[]): void {
  entero(r, `${donde}.id`, a.id, 1, TOPE_DE_ID);
  tics(r, `${donde}.anuncioTics`, a.anuncioTics, 1);
  longitud(r, `${donde}.alcance`, a.alcance);
  longitud(r, `${donde}.holgura`, a.holgura);
  if (a.enganche !== null) {
    longitud(r, `${donde}.enganche.radio`, a.enganche.radio, 1);
    entero(r, `${donde}.enganche.conoRumbos`, a.enganche.conoRumbos, 0, CUARTO_DE_VUELTA);
    longitud(r, `${donde}.enganche.holgura`, a.enganche.holgura);
  }
  longitud(r, `${donde}.avance`, a.avance);
  if (a.cadena !== null) {
    const c = a.cadena;
    if (lista(r, `${donde}.cadena.tras`, c.tras)) {
      if (c.tras.length === 0) r.p.push(`${donde}.cadena.tras: una cadena va tras algo; la que abre lleva \`cadena: null\``);
      for (const t of c.tras) {
        existe(r, `${donde}.cadena.tras`, t, hermanas, 'la acción');
        if (t === a.id) r.p.push(`${donde}.cadena.tras: una acción no se encadena tras sí misma (se repetiría sin fin)`);
      }
    }
    ms(r, `${donde}.cadena.antesMs`, c.antesMs);
    ms(r, `${donde}.cadena.despuesMs`, c.despuesMs);
    ms(r, `${donde}.cadena.ritmoMs`, c.ritmoMs);
    if (c.ritmoMs > c.antesMs || c.ritmoMs > c.despuesMs) r.p.push(`${donde}.cadena.ritmoMs: el ritmo tiene que caber dentro de la ventana de encadenar`);
    tics(r, `${donde}.cadena.anuncioTicsAlRitmo`, c.anuncioTicsAlRitmo, 1);
    if (c.anuncioTicsAlRitmo > a.anuncioTics) r.p.push(`${donde}.cadena.anuncioTicsAlRitmo: al ritmo el anuncio no puede ser más largo`);
    booleano(r, `${donde}.cadena.soloSiDio`, c.soloSiDio);
  }
  efecto(r, `${donde}.efecto`, a.efecto, estados);
  booleano(r, `${donde}.imparable`, a.imparable);
  tics(r, `${donde}.recargaTics`, a.recargaTics);
  tics(r, `${donde}.recuperacionTics`, a.recuperacionTics);
  if (lista(r, `${donde}.soloEn`, a.soloEn)) for (const e of a.soloEn) existe(r, `${donde}.soloEn`, e, estados, 'el estado');
  if (a.alFallar !== null) puesta(r, `${donde}.alFallar`, a.alFallar, estados);
}

/** El proyectil de id `id`, o `null`. Un bucle y no `find`: se llama dentro de otro bucle y sin cierres. */
function proyectilDeId(proyectiles: readonly ProyectilDeclarado[], id: number): ProyectilDeclarado | null {
  for (let i = 0; i < proyectiles.length; i++) {
    const pr = proyectiles[i] as ProyectilDeclarado;
    if (pr !== null && typeof pr === 'object' && pr.id === id) return pr;
  }
  return null;
}

/**
 * LA REVISIÓN DEL TIRO CARGADO (W): su forma entera, contra los estados y los proyectiles declarados. Los
 * dos ids no se miran aquí contra los demás del asiento: van en la lista de lo que manda, con los otros.
 */
function revisarElTiro(r: Revision, donde: string, t: TiroDeclarado, estados: readonly number[], proyectiles: readonly ProyectilDeclarado[]): void {
  const p = r.p;
  entero(r, `${donde}.apuntar`, t.apuntar, 1, TOPE_DE_ID);
  entero(r, `${donde}.soltar`, t.soltar, 1, TOPE_DE_ID);
  puesta(r, `${donde}.puesta`, t.puesta, estados);
  if (t.enganche !== null) {
    longitud(r, `${donde}.enganche.radio`, t.enganche.radio, 1);
    entero(r, `${donde}.enganche.conoRumbos`, t.enganche.conoRumbos, 0, CUARTO_DE_VUELTA);
    longitud(r, `${donde}.enganche.holgura`, t.enganche.holgura);
  }
  longitud(r, `${donde}.holgura`, t.holgura);
  const cargaBien = entero(r, `${donde}.cargaMaximaMs`, t.cargaMaximaMs, 0, TOPE_DE_VENTANA_MS);
  if (cargaBien && Number.isInteger(t.puesta.tics) && t.puesta.tics * MS_POR_TIC < t.cargaMaximaMs) {
    p.push(
      `${donde}.puesta.tics: el estado de cargar dura ${String(t.puesta.tics * MS_POR_TIC)} ms y la carga máxima es de ${String(t.cargaMaximaMs)}: ` +
        'se acabaría antes que ella y la cortaría',
    );
  }
  if (!lista(r, `${donde}.niveles`, t.niveles)) return;
  if (t.niveles.length === 0 || t.niveles.length > TOPE_DE_NIVELES_DEL_TIRO) {
    p.push(`${donde}.niveles: hay ${String(t.niveles.length)} y tienen que ser de 1 a ${String(TOPE_DE_NIVELES_DEL_TIRO)}`);
  }
  const balas: number[] = [];
  let anterior = -1;
  for (let i = 0; i < t.niveles.length; i++) {
    const n = t.niveles[i] as NivelDelTiro;
    const dn = `${donde}.niveles[${String(i)}]`;
    if (entero(r, `${dn}.desdeMs`, n.desdeMs, 0, TOPE_DE_VENTANA_MS)) {
      if (i === 0 && n.desdeMs !== 0) p.push(`${dn}.desdeMs: el primer nivel empieza en 0 (soltar sin carga también dispara)`);
      else if (i > 0 && n.desdeMs <= anterior) p.push(`${dn}.desdeMs: los niveles van de menos a más carga, y ${String(n.desdeMs)} no pasa de ${String(anterior)}`);
      anterior = n.desdeMs;
    }
    if (entero(r, `${dn}.proyectil`, n.proyectil, 1, TOPE_DE_ID)) {
      balas.push(n.proyectil);
      const pr = proyectilDeId(proyectiles, n.proyectil);
      if (pr === null) p.push(`${dn}.proyectil: nombra el proyectil ${String(n.proyectil)}, que no está declarado`);
      else if (pr.apuntarTics !== 1 || pr.balas !== 1 || pr.cadaTics !== 0) {
        p.push(`${dn}.proyectil: la bala de un tiro es de un solo disparo y sin apuntar (apuntarTics 1, balas 1, cadaTics 0): esos números no pesan en un tiro`);
      }
    }
    entero(r, `${dn}.ancho`, n.ancho, 0, TOPE_DE_RADIO);
    entero(r, `${dn}.area`, n.area, 0, TOPE_DE_RADIO);
    if (n.area === 0 && n.efectoDelArea !== null) p.push(`${dn}.efectoDelArea: sin área no alcanza a nadie; va a null`);
    else if (n.area !== 0 && n.efectoDelArea === null) p.push(`${dn}.efectoDelArea: un área sin efecto no le hace nada a nadie; con área, lleva efecto`);
    if (n.efectoDelArea !== null) efecto(r, `${dn}.efectoDelArea`, n.efectoDelArea, estados);
    tics(r, `${dn}.recargaTics`, n.recargaTics);
  }
  idsSinRepetir(r, `${donde}.niveles: cada nivel con su bala (el aparato sabe el nivel por el proyectil del suceso bala)`, balas);
  if (cargaBien && anterior >= 0 && t.cargaMaximaMs < anterior) {
    p.push(`${donde}.cargaMaximaMs: ${String(t.cargaMaximaMs)} ms es menos de lo que pide el último nivel (${String(anterior)}): no se llegaría nunca`);
  }
}

/**
 * EL BLOQUE DEL MUNDO de la revisión: lo que sólo mira `m`. Es el de siempre, línea a línea, sacado a
 * su función para poder hacerse UNA vez por mundo (ver «la validación del mundo»); lo único que cambió
 * dentro es el conjunto de las aristas repetidas.
 */
function bloqueDelMundo(m: MundoDeLaLiza, r: Revision): { sueloBien: boolean; zonas: number[]; clasesDeZona: number[]; limites: number[] } {
  const p = r.p;
  entero(r, 'mundo.metrosPorUnidad', m.metrosPorUnidad, 1, 1000 * UNO);
  const suelo = m.suelo;
  /*
   * El suelo se mira ANTES de derivar la arena, y la arena sólo se deriva si está bien: `arenaDe`
   * reserva un byte por casilla del rectángulo que ocupa, y con un lado casi nulo o dos casillas en
   * esquinas opuestas de la liza, derivarla para decir que está mal ya sería el fallo.
   */
  let sueloBien = typeof suelo.lado === 'number' && suelo.lado >= LADO_MINIMO && suelo.lado <= LADO_MAXIMO;
  if (!sueloBien) {
    p.push(`mundo.suelo.lado: vale ${String(suelo.lado)} y tiene que ser un número de ${String(LADO_MINIMO)} a ${String(LADO_MAXIMO)} unidades`);
  }
  let desdeX = Infinity;
  let hastaX = -Infinity;
  let desdeY = Infinity;
  let hastaY = -Infinity;
  const casillas = (donde: string, v: unknown): void => {
    if (!lista(r, donde, v)) {
      sueloBien = false;
      return;
    }
    /* La casilla `x` cubre de `(x − ½)·lado` a `(x + ½)·lado` (ver `casillaDe` en `mundo.ts`). */
    const hasta = TOPE_DE_LA_LIZA / UNO / (typeof suelo.lado === 'number' && suelo.lado > 0 ? suelo.lado : 1) - 0.5;
    for (let i = 0; i < v.length; i++) {
      const c = v[i] as { readonly x: unknown; readonly y: unknown };
      if (!Number.isInteger(c.x) || !Number.isInteger(c.y)) {
        p.push(`${donde}[${String(i)}]: una casilla son dos enteros`);
        sueloBien = false;
        continue;
      }
      const x = c.x as number;
      const y = c.y as number;
      if (Math.abs(x) > hasta || Math.abs(y) > hasta) {
        p.push(`${donde}[${String(i)}]: la casilla (${String(x)}, ${String(y)}) se sale de la liza (±${String(TOPE_DE_LA_LIZA / UNO)} unidades)`);
        sueloBien = false;
      }
      if (x < desdeX) desdeX = x;
      if (x > hastaX) hastaX = x;
      if (y < desdeY) desdeY = y;
      if (y > hastaY) hastaY = y;
    }
  };
  casillas('mundo.suelo.pisables', suelo.pisables);
  casillas('mundo.suelo.vados', suelo.vados);
  if (Array.isArray(suelo.pisables) && suelo.pisables.length === 0) {
    p.push('mundo.suelo.pisables: un mundo sin suelo no se recorre');
    sueloBien = false;
  }
  if (sueloBien && (hastaX - desdeX + 1) * (hastaY - desdeY + 1) > TOPE_DE_CASILLAS) {
    p.push(`mundo.suelo: el rectángulo del suelo ocupa ${String((hastaX - desdeX + 1) * (hastaY - desdeY + 1))} casillas y caben ${String(TOPE_DE_CASILLAS)}`);
    sueloBien = false;
  }
  if (lista(r, 'mundo.suelo.nace', suelo.nace) && suelo.nace.length > 0) {
    p.push('mundo.suelo.nace: va vacío; los sitios de nacer de la liza tienen papel y van en mundo.nace');
  }
  if (!lista(r, 'mundo.suelo.cuerpos', suelo.cuerpos)) sueloBien = false;
  else {
    if (suelo.cuerpos.length > TOPE_DE_CAJAS) p.push(`mundo.suelo.cuerpos: hay ${String(suelo.cuerpos.length)} cajas y caben ${String(TOPE_DE_CAJAS)}`);
    for (let i = 0; i < suelo.cuerpos.length; i++) {
      const c = suelo.cuerpos[i];
      if (c === undefined || !(c.x0 < c.x1 && c.z0 < c.z1)) {
        p.push(`mundo.suelo.cuerpos[${String(i)}]: la caja está del revés o no tiene interior`);
        sueloBien = false;
      } else if (Math.abs(c.x0) * UNO > TOPE_DE_LA_LIZA || Math.abs(c.x1) * UNO > TOPE_DE_LA_LIZA || Math.abs(c.z0) * UNO > TOPE_DE_LA_LIZA || Math.abs(c.z1) * UNO > TOPE_DE_LA_LIZA) {
        p.push(`mundo.suelo.cuerpos[${String(i)}]: se sale de la liza (±${String(TOPE_DE_LA_LIZA / UNO)} unidades)`);
        sueloBien = false;
      }
    }
    if (lista(r, 'mundo.clasesDeCaja', m.clasesDeCaja)) {
      if (m.clasesDeCaja.length !== suelo.cuerpos.length) {
        p.push(`mundo.clasesDeCaja: tiene ${String(m.clasesDeCaja.length)} y hay ${String(suelo.cuerpos.length)} cajas en mundo.suelo.cuerpos (una clase por caja)`);
      }
      for (let i = 0; i < m.clasesDeCaja.length; i++) {
        const k = m.clasesDeCaja[i];
        if (k !== CLASE_DE_CAJA.alta && k !== CLASE_DE_CAJA.baja) p.push(`mundo.clasesDeCaja[${String(i)}]: ${String(k)} no es una clase de caja`);
      }
    }
  }
  const zonas: number[] = [];
  const clasesDeZona: number[] = [];
  if (lista(r, 'mundo.zonas', m.zonas)) {
    for (let i = 0; i < m.zonas.length; i++) {
      const z = m.zonas[i] as ZonaDelMundo;
      if (entero(r, `mundo.zonas[${String(i)}].id`, z.id, 1, TOPE_DE_ID)) zonas.push(z.id);
      if (entero(r, `mundo.zonas[${String(i)}].clase`, z.clase, 1, TOPE_DE_ID)) clasesDeZona.push(z.clase);
      caja(r, `mundo.zonas[${String(i)}].caja`, z.caja);
    }
    idsSinRepetir(r, 'mundo.zonas', zonas);
  }
  const limites: number[] = [];
  if (lista(r, 'mundo.limites', m.limites)) {
    for (let i = 0; i < m.limites.length; i++) {
      const l = m.limites[i] as LimiteDelMundo;
      if (entero(r, `mundo.limites[${String(i)}].id`, l.id, 1, TOPE_DE_ID)) limites.push(l.id);
      caja(r, `mundo.limites[${String(i)}].caja`, l.caja);
    }
    idsSinRepetir(r, 'mundo.limites', limites);
  }
  if (lista(r, 'mundo.grafo.nudos', m.grafo.nudos)) {
    const cuantos = m.grafo.nudos.length;
    for (let i = 0; i < cuantos; i++) {
      const n = m.grafo.nudos[i] as NudoDelGrafo;
      entero(r, `mundo.grafo.nudos[${String(i)}].x`, n.x, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA);
      entero(r, `mundo.grafo.nudos[${String(i)}].z`, n.z, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA);
    }
    if (lista(r, 'mundo.grafo.aristas', m.grafo.aristas)) {
      /* Un conjunto y no `indexOf` sobre una lista: con las cinco mil aristas de una ciudad, 13 ms contra medio. */
      const vistas = new Set<string>();
      for (let i = 0; i < m.grafo.aristas.length; i++) {
        const a = m.grafo.aristas[i];
        const donde = `mundo.grafo.aristas[${String(i)}]`;
        if (!Array.isArray(a) || a.length !== 2) {
          p.push(`${donde}: tiene que ser un par de índices de nudo`);
          continue;
        }
        const [u, v] = a;
        if (!entero(r, donde, u, 0, cuantos - 1) || !entero(r, donde, v, 0, cuantos - 1)) continue;
        if (u === v) p.push(`${donde}: une un nudo consigo mismo`);
        const llave = u < v ? `${String(u)}-${String(v)}` : `${String(v)}-${String(u)}`;
        if (vistas.has(llave)) p.push(`${donde}: la arista ${llave} está dos veces`);
        vistas.add(llave);
      }
    }
  }
  let nacenAsientos = 0;
  let nacenReapariciones = 0;
  if (lista(r, 'mundo.nace', m.nace)) {
    for (let i = 0; i < m.nace.length; i++) {
      const s = m.nace[i] as SitioDeNacer;
      const donde = `mundo.nace[${String(i)}]`;
      if (s.papel === 'asiento') nacenAsientos++;
      else if (s.papel === 'reaparicion') nacenReapariciones++;
      else p.push(`${donde}.papel: tiene que ser 'asiento' o 'reaparicion'`);
      entero(r, `${donde}.x`, s.x, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA);
      entero(r, `${donde}.z`, s.z, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA);
      entero(r, `${donde}.rumbo`, s.rumbo, 0, 255);
    }
  }
  if (nacenAsientos === 0) p.push('mundo.nace: no hay ningún sitio con papel \'asiento\': ¿dónde aparece quien entra?');
  if (nacenReapariciones === 0) p.push('mundo.nace: no hay ningún sitio con papel \'reaparicion\': ¿dónde vuelve quien cae?');
  return { sueloBien, zonas, clasesDeZona, limites };
}

/* ─── LA VALIDACIÓN DEL MUNDO, UNA VEZ POR MUNDO ─────────────────────────── *
 *
 * El productor de un juego guarda sus mundos (el diseño de la ciudad abierta, §5.3), así que mientras
 * dura una partida el mundo es EL MISMO objeto en cada voto, cada fase y cada reanudación, y la sala lo
 * valida cada vez que llega una declaración. Con el mundo de una plaza no importaba; con el de una ciudad (4.761
 * casillas, 1.300 cajas, 3.400 nudos, 4.300 aristas) la revisión entera costaba 20-25 ms, síncronos, en
 * cada voto de cada mesa: más que el tic de 50 ms del único temporizador de todas las salas (§5.4).
 *
 * Así que lo que sólo mira el mundo se revisa UNA vez por identidad del mundo y se guarda (un `WeakMap`,
 * como los índices de `paso-en-curso.ts`): sus frases, y lo que el resto de la revisión lee de él. Lo que
 * cruza el mundo con lo demás —los sitios de nacer contra el radio de los asientos y el límite de la
 * fase, las clases de zona que nombra el encuentro— se sigue mirando en cada declaración. El resultado es
 * EL MISMO, frase a frase y en el mismo orden: las frases guardadas son las del bloque del mundo, que no
 * lee nada fuera de `m`, y se ponen donde iban. Si el bloque lanzaba a medias (un mundo sin la forma del
 * contrato), se guarda también lo que lanzó y se vuelve a lanzar donde lanzaba.
 *
 * ═══ Y EL CHEQUEO CANÓNICO, TIPADO DONDE LA LISTA ES GRANDE ═══
 *
 * `porQueNoEsCanonico` escribe la declaración entera en su forma canónica para ver si se puede, y con una
 * ciudad era lo más caro de todo. Las listas grandes del mundo tienen UNA forma posible —objetos llanos
 * con sus claves y números finitos (una caja dentro de cada zona, una cadena en el papel de cada sitio),
 * pares de números, números—, así que se miran tipadas, una vez por mundo. Si la tienen, la declaración
 * es canónica si y sólo si lo es con esas listas vacías: `canonico.ts` no ve nada más en esos elementos
 * (ni ciclos, ni profundidad que llegue a su tope, ni nada que no sea un número finito o una cadena). Y si
 * algo no cuadra, se pregunta al recorrido genérico sobre la declaración ENTERA, para dar exactamente su
 * mensaje.
 *
 * El contrato que pide, que ya era el de la casa: una declaración no se muta después de hecha.
 */

interface MundoRevisado {
  /** Las frases del bloque del mundo, en su orden. */
  readonly problemas: readonly string[];
  /** Lo que lanzó el bloque a medias, para volver a lanzarlo donde lanzaba; `null` si acabó. */
  readonly fallo: { readonly error: unknown } | null;
  readonly sueloBien: boolean;
  readonly clasesDeZona: readonly number[];
  readonly limites: readonly number[];
  /** El mundo con sus listas grandes vacías, si todas tienen su única forma; si no, `null` (ver la cabecera). */
  readonly ligero: Readonly<Record<string, unknown>> | null;
}

const MUNDOS_REVISADOS = new WeakMap<object, MundoRevisado>();

let VALIDACIONES_DEL_MUNDO = 0;

/**
 * CUÁNTAS VECES SE HA REVISADO UN MUNDO DE VERDAD (no desde la memoria) desde que se cargó el módulo. El
 * diagnóstico del servidor las CUENTA —no las cronometra—: con el productor guardando sus mundos tiene
 * que salir una por mundo que saca (el diseño de la ciudad abierta, §5.6). Se lee desde el MISMO módulo
 * que valida: un comprobador que lo importe por otro camino puede leer la copia que nadie usó.
 */
export function validacionesDelMundo(): number {
  return VALIDACIONES_DEL_MUNDO;
}

function revisarElMundo(m: MundoDeLaLiza): MundoRevisado {
  const guardable = typeof m === 'object' && m !== null;
  if (guardable) {
    const hecho = MUNDOS_REVISADOS.get(m);
    if (hecho !== undefined) return hecho;
  }
  VALIDACIONES_DEL_MUNDO++;
  const r: Revision = { p: [], bloquean: [] };
  let revisado: MundoRevisado;
  try {
    const b = bloqueDelMundo(m, r);
    revisado = { problemas: r.p, fallo: null, sueloBien: b.sueloBien, clasesDeZona: b.clasesDeZona, limites: b.limites, ligero: mundoLigero(m) };
  } catch (error) {
    revisado = { problemas: r.p, fallo: { error }, sueloBien: false, clasesDeZona: [], limites: [], ligero: null };
  }
  if (guardable) MUNDOS_REVISADOS.set(m, revisado);
  return revisado;
}

/** ¿Es un objeto llano (`{}` o sin prototipo), como lo pide `canonico.ts`? */
function llano(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const padre = Object.getPrototypeOf(v) as object | null;
  return padre === null || padre === Object.prototype;
}

/** ¿Es una lista de las de siempre (no una subclase con otro `map`), como las que escribe un productor? */
function listaLlana(v: unknown): v is readonly unknown[] {
  return Array.isArray(v) && Object.getPrototypeOf(v) === Array.prototype;
}

function numeroFinito(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * ¿Es `o` un objeto llano con EXACTAMENTE las claves `claves` (las que `canonico.ts` ve: propias y
 * enumerables), todas números finitos salvo `texto`, que es una cadena, y `caja`, que es una caja?
 */
function conSuForma(o: unknown, claves: readonly string[], texto: string, caja: string): boolean {
  if (!llano(o)) return false;
  const suyas = Object.keys(o);
  if (suyas.length !== claves.length) return false;
  for (let k = 0; k < suyas.length; k++) {
    const clave = suyas[k] as string;
    if (claves.indexOf(clave) < 0) return false;
    const valor: unknown = o[clave];
    if (clave === texto ? typeof valor !== 'string' : clave === caja ? !conSuForma(valor, CLAVES_DE_CAJA, '', '') : !numeroFinito(valor)) return false;
  }
  return true;
}

/** Una lista de objetos llanos con su forma (ver `conSuForma`). */
function objetosConSuForma(v: unknown, claves: readonly string[], texto = '', caja = ''): boolean {
  if (!listaLlana(v)) return false;
  for (let i = 0; i < v.length; i++) if (!conSuForma(v[i], claves, texto, caja)) return false;
  return true;
}

/** Una lista de pares de números finitos, cada par una lista de las de siempre. */
function paresDeNumeros(v: unknown): boolean {
  if (!listaLlana(v)) return false;
  for (let i = 0; i < v.length; i++) {
    const a: unknown = v[i];
    if (!listaLlana(a) || a.length !== 2 || !numeroFinito(a[0]) || !numeroFinito(a[1])) return false;
  }
  return true;
}

/** Una lista de números finitos. */
function numeros(v: unknown): boolean {
  if (!listaLlana(v)) return false;
  for (let i = 0; i < v.length; i++) if (!numeroFinito(v[i])) return false;
  return true;
}

const CLAVES_DE_CASILLA: readonly string[] = ['x', 'y'];
const CLAVES_DE_CAJA: readonly string[] = ['x0', 'z0', 'x1', 'z1'];
const CLAVES_DE_NUDO: readonly string[] = ['x', 'z'];
const CLAVES_DE_ZONA: readonly string[] = ['id', 'clase', 'caja'];
const CLAVES_DE_SITIO: readonly string[] = ['papel', 'x', 'z', 'rumbo'];

/**
 * EL MUNDO CON SUS LISTAS GRANDES VACÍAS —casillas, cajas, clases de caja, nudos, aristas, zonas y sitios
 * de nacer—, si todas tienen su única forma; `null` si alguna no (o si mirarlo lanza): entonces se
 * pregunta al genérico.
 */
function mundoLigero(m: unknown): Readonly<Record<string, unknown>> | null {
  try {
    if (!llano(m)) return null;
    const suelo: unknown = m['suelo'];
    const grafo: unknown = m['grafo'];
    if (!llano(suelo) || !llano(grafo)) return null;
    if (
      !objetosConSuForma(suelo['pisables'], CLAVES_DE_CASILLA) ||
      !objetosConSuForma(suelo['cuerpos'], CLAVES_DE_CAJA) ||
      !numeros(m['clasesDeCaja']) ||
      !objetosConSuForma(grafo['nudos'], CLAVES_DE_NUDO) ||
      !paresDeNumeros(grafo['aristas']) ||
      !objetosConSuForma(m['zonas'], CLAVES_DE_ZONA, '', 'caja') ||
      !objetosConSuForma(m['nace'], CLAVES_DE_SITIO, 'papel')
    ) {
      return null;
    }
    return { ...m, suelo: { ...suelo, pisables: [], cuerpos: [] }, clasesDeCaja: [], grafo: { ...grafo, nudos: [], aristas: [] }, zonas: [], nace: [] };
  } catch {
    return null;
  }
}

/** `porQueNoEsCanonico(d)`, con el mundo guardado y tipado: el MISMO resultado (ver la cabecera). */
function porQueNoEsCanonicoDeprisa(d: LizaDeclarada): string | null {
  if (!llano(d)) return porQueNoEsCanonico(d);
  const m: unknown = d.mundo;
  if (!llano(m)) return porQueNoEsCanonico(d);
  const ligero = revisarElMundo(m as unknown as MundoDeLaLiza).ligero;
  if (ligero === null) return porQueNoEsCanonico(d);
  return porQueNoEsCanonico({ ...d, mundo: ligero }) === null ? null : porQueNoEsCanonico(d);
}

function revisar(d: LizaDeclarada, p: string[]): void {
  const r: Revision = { p, bloquean: [] };
  const noCanonico = porQueNoEsCanonicoDeprisa(d);
  if (noCanonico !== null) p.push(`no es dato llano (no pasa por canonico.ts): ${noCanonico}`);
  if (d.version !== VERSION_DE_LA_DECLARACION) p.push(`version: es ${String(d.version)} y este contrato es la ${String(VERSION_DE_LA_DECLARACION)}`);

  /* ── Los catálogos, primero: todo lo demás los nombra ─────────────────── */
  const estados: number[] = [];
  if (lista(r, 'estados', d.estados)) {
    for (let i = 0; i < d.estados.length; i++) {
      const e = d.estados[i] as EstadoDeclarado;
      if (entero(r, `estados[${String(i)}].id`, e.id, 1, TOPE_DE_ID)) estados.push(e.id);
      booleano(r, `estados[${String(i)}].bloqueaPaso`, e.bloqueaPaso);
      booleano(r, `estados[${String(i)}].bloqueaAccion`, e.bloqueaAccion);
      if (e.bloqueaAccion === true) r.bloquean.push(e.id);
      booleano(r, `estados[${String(i)}].seCortaConDano`, e.seCortaConDano);
      lista(r, `estados[${String(i)}].cancelaCon`, e.cancelaCon);
    }
    idsSinRepetir(r, 'estados', estados);
  }
  const portables: number[] = [];
  if (lista(r, 'portables', d.portables)) {
    if (d.portables.length > TOPE_DE_PORTABLES) p.push(`portables: hay ${String(d.portables.length)} y caben ${String(TOPE_DE_PORTABLES)}`);
    for (let i = 0; i < d.portables.length; i++) {
      const po = d.portables[i] as PortableDeclarado;
      const donde = `portables[${String(i)}]`;
      if (entero(r, `${donde}.id`, po.id, 1, TOPE_DE_ID)) portables.push(po.id);
      cantidad(r, `${donde}.tope`, po.tope, 1);
      longitud(r, `${donde}.radioDeRecogida`, po.radioDeRecogida, 1);
      tics(r, `${donde}.montonTics`, po.montonTics, 1);
      if (po.pago.tipo !== 'triangular' && po.pago.tipo !== 'lineal') p.push(`${donde}.pago.tipo: tiene que ser 'triangular' o 'lineal'`);
      if (entero(r, `${donde}.pago.porUnidad`, po.pago.porUnidad, 0, TOPE_DE_CANTIDAD) && Number.isInteger(po.tope)) {
        const lleno = pagoDelPortable(po, po.tope);
        if (lleno > TOPE_DE_CANTIDAD) p.push(`${donde}.pago: lleno (${String(po.tope)}) vale ${String(lleno)}, más que ${String(TOPE_DE_CANTIDAD)}: los puntos de esa suma darían la vuelta`);
      }
    }
    idsSinRepetir(r, 'portables', portables);
  }
  const proyectiles: number[] = [];
  if (lista(r, 'proyectiles', d.proyectiles)) {
    for (let i = 0; i < d.proyectiles.length; i++) {
      const pr = d.proyectiles[i] as ProyectilDeclarado;
      const donde = `proyectiles[${String(i)}]`;
      if (entero(r, `${donde}.id`, pr.id, 1, TOPE_DE_ID)) proyectiles.push(pr.id);
      tics(r, `${donde}.apuntarTics`, pr.apuntarTics, 1);
      cantidad(r, `${donde}.balas`, pr.balas, 1);
      tics(r, `${donde}.cadaTics`, pr.cadaTics);
      longitud(r, `${donde}.velocidad`, pr.velocidad, 1);
      radio(r, `${donde}.radio`, pr.radio);
      longitud(r, `${donde}.alcance`, pr.alcance, 1);
      efecto(r, `${donde}.efecto`, pr.efecto, estados);
    }
    idsSinRepetir(r, 'proyectiles', proyectiles);
  }

  /* ── El mundo: una vez por mundo (ver «la validación del mundo») ───────── */
  const m = d.mundo;
  const mr = revisarElMundo(m);
  for (const x of mr.problemas) p.push(x);
  if (mr.fallo !== null) throw mr.fallo.error;
  const suelo = m.suelo;
  const sueloBien = mr.sueloBien;
  const clasesDeZona = mr.clasesDeZona;
  const limites = mr.limites;

  /* ── Las clases de entidad ────────────────────────────────────────────── */
  const clases: number[] = [];
  const accionesDeClases: number[] = [];
  const remates: number[] = [];
  if (lista(r, 'clases', d.clases)) {
    for (const c of d.clases) if (Number.isInteger(c.id)) clases.push(c.id);
    idsSinRepetir(r, 'clases', clases);
    for (let i = 0; i < d.clases.length; i++) {
      const c = d.clases[i] as ClaseDeEntidad;
      const donde = `clases[${String(i)}]`;
      entero(r, `${donde}.id`, c.id, 1, TOPE_DE_ID);
      cantidad(r, `${donde}.vida`, c.vida, 1);
      radio(r, `${donde}.radio`, c.radio);
      longitud(r, `${donde}.velocidad`, c.velocidad);
      const suyas: number[] = [];
      if (lista(r, `${donde}.acciones`, c.acciones)) {
        for (const a of c.acciones) suyas.push(a.id);
        idsSinRepetir(r, `${donde}.acciones`, suyas);
        let abren = 0;
        const respuesta = c.guardia === null ? 0 : c.guardia.respuesta;
        for (let j = 0; j < c.acciones.length; j++) {
          const a = c.acciones[j] as AccionDeclarada;
          accion(r, `${donde}.acciones[${String(j)}]`, a, estados, suyas);
          if (a.cadena === null && a.id !== respuesta) abren++;
        }
        /* La respuesta de la guardia no abre (el cerebro no la usa para atacar), pero una clase que sólo contesta ataca: al parar. */
        if (c.acciones.length > 0 && abren === 0 && respuesta === 0) p.push(`${donde}.acciones: ninguna abre (todas llevan cadena): no atacaría nunca`);
      }
      for (const id of suyas) accionesDeClases.push(id);
      if (entero(r, `${donde}.proyectil`, c.proyectil, 0, TOPE_DE_ID) && c.proyectil !== 0) {
        existe(r, `${donde}.proyectil`, c.proyectil, proyectiles, 'el proyectil');
      }
      if (c.guardia !== null) {
        const g = c.guardia;
        entero(r, `${donde}.guardia.conoRumbos`, g.conoRumbos, 0, CUARTO_DE_VUELTA);
        lista(r, `${donde}.guardia.para`, g.para);
        if (lista(r, `${donde}.guardia.salvoEn`, g.salvoEn)) for (const e of g.salvoEn) existe(r, `${donde}.guardia.salvoEn`, e, estados, 'el estado');
        puesta(r, `${donde}.guardia.alParar`, g.alParar, estados);
        if (entero(r, `${donde}.guardia.respuesta`, g.respuesta, 0, TOPE_DE_ID) && g.respuesta !== 0) {
          existe(r, `${donde}.guardia.respuesta`, g.respuesta, suyas, 'la acción de su clase');
        }
        lista(r, `${donde}.guardia.esquivaAlAzar.acciones`, g.esquivaAlAzar.acciones);
        entero(r, `${donde}.guardia.esquivaAlAzar.probabilidad`, g.esquivaAlAzar.probabilidad, 0, UNO);
      }
      const ce = c.cerebro;
      longitud(r, `${donde}.cerebro.distanciaMinima`, ce.distanciaMinima);
      longitud(r, `${donde}.cerebro.distanciaMaxima`, ce.distanciaMaxima);
      if (ce.distanciaMinima > ce.distanciaMaxima) p.push(`${donde}.cerebro: la distancia mínima pasa de la máxima`);
      tics(r, `${donde}.cerebro.decideCadaTics`, ce.decideCadaTics, 1);
      cantidad(r, `${donde}.cerebro.costeCuerpoACuerpo`, ce.costeCuerpoACuerpo);
      cantidad(r, `${donde}.cerebro.costeDisparo`, ce.costeDisparo);
      booleano(r, `${donde}.cerebro.sigueElGrafo`, ce.sigueElGrafo);
      /* L10: en la forma transitoria no está, y vale 0 (ver `CerebroSinAlcance`). */
      if ('alcanceDeBlanco' in ce) longitud(r, `${donde}.cerebro.alcanceDeBlanco`, ce.alcanceDeBlanco);
      if (c.aparicion.modo !== 'imprimir' && c.aparicion.modo !== 'desdePunto') p.push(`${donde}.aparicion.modo: tiene que ser 'imprimir' o 'desdePunto'`);
      tics(r, `${donde}.aparicion.tics`, c.aparicion.tics);
      const ac = c.alCaer;
      if (ac.tipo === 'rematable') {
        puesta(r, `${donde}.alCaer.puesta`, ac.puesta, estados);
        /* Varias clases pueden compartir el remate: es el mismo botón, y la clase la dice el blanco. */
        if (entero(r, `${donde}.alCaer.remate.accion`, ac.remate.accion, 1, TOPE_DE_ID) && remates.indexOf(ac.remate.accion) < 0) {
          remates.push(ac.remate.accion);
        }
        longitud(r, `${donde}.alCaer.remate.radio`, ac.remate.radio, 1);
        tics(r, `${donde}.alCaer.remate.mantenerTics`, ac.remate.mantenerTics, 1);
        puesta(r, `${donde}.alCaer.remate.puesta`, ac.remate.puesta, estados);
        if (entero(r, `${donde}.alCaer.suelta.portable`, ac.suelta.portable, 1, TOPE_DE_ID)) {
          existe(r, `${donde}.alCaer.suelta.portable`, ac.suelta.portable, portables, 'el portable');
        }
        cantidad(r, `${donde}.alCaer.suelta.n`, ac.suelta.n);
        const s = ac.siNo;
        if (entero(r, `${donde}.alCaer.siNo.absorbe`, s.absorbe, 0, TOPE_DE_ID) && s.absorbe !== 0) {
          existe(r, `${donde}.alCaer.siNo.absorbe`, s.absorbe, clases, 'la clase');
        }
        longitud(r, `${donde}.alCaer.siNo.radio`, s.radio);
        puesta(r, `${donde}.alCaer.siNo.absorbiendo`, s.absorbiendo, estados);
        cantidad(r, `${donde}.alCaer.siNo.vida`, s.vida, 1);
        if (s.vida > c.vida) p.push(`${donde}.alCaer.siNo.vida: se levanta con más vida (${String(s.vida)}) de la que tiene su clase (${String(c.vida)})`);
        tics(r, `${donde}.alCaer.siNo.reapareceTras`, s.reapareceTras);
        if (clasesDeZona.indexOf(s.claseDeZona) < 0) p.push(`${donde}.alCaer.siNo.claseDeZona: no hay ninguna zona de la clase ${String(s.claseDeZona)} donde volver a aparecer`);
        longitud(r, `${donde}.alCaer.siNo.distanciaMinima`, s.distanciaMinima);
      } else if (ac.tipo !== 'irse') {
        p.push(`${donde}.alCaer.tipo: tiene que ser 'irse' o 'rematable'`);
      }
    }
  }

  /* ── Los asientos ─────────────────────────────────────────────────────── */
  const accionesDeAsientos: number[] = [];
  if (lista(r, 'asientos', d.asientos)) {
    if (d.asientos.length === 0 || d.asientos.length > TOPE_DE_ASIENTOS) {
      p.push(`asientos: hay ${String(d.asientos.length)} y tienen que ser de 1 a ${String(TOPE_DE_ASIENTOS)}`);
    }
    const nombres: string[] = [];
    for (let i = 0; i < d.asientos.length; i++) {
      const a = d.asientos[i] as ReglasDeAsiento;
      const donde = `asientos[${String(i)}]`;
      if (typeof a.asiento !== 'string' || a.asiento.length === 0 || a.asiento.length > 64) p.push(`${donde}.asiento: tiene que ser el AsientoId de la mesa`);
      else if (nombres.indexOf(a.asiento) >= 0) p.push(`${donde}.asiento: «${a.asiento}» está dos veces`);
      else nombres.push(a.asiento);

      const cu = a.cuerpo;
      radio(r, `${donde}.cuerpo.radio`, cu.radio);
      if (lista(r, `${donde}.cuerpo.marchas`, cu.marchas)) {
        if (cu.marchas.length === 0 || cu.marchas.length > 7) p.push(`${donde}.cuerpo.marchas: tiene que haber de 1 a 7 (la marcha viaja en 0-7 y la 0 es quieto)`);
        for (let j = 0; j < cu.marchas.length; j++) {
          longitud(r, `${donde}.cuerpo.marchas[${String(j)}]`, cu.marchas[j], 1);
          if (j > 0 && (cu.marchas[j] as number) <= (cu.marchas[j - 1] as number)) p.push(`${donde}.cuerpo.marchas: tienen que ir de menos a más`);
        }
      }
      tics(r, `${donde}.cuerpo.aceleracionTics`, cu.aceleracionTics);
      longitud(r, `${donde}.cuerpo.presupuestoCorto.velocidad`, cu.presupuestoCorto.velocidad, 1);
      tics(r, `${donde}.cuerpo.presupuestoCorto.acumulaTics`, cu.presupuestoCorto.acumulaTics, 1);
      const masRapida = cu.marchas.length > 0 ? (cu.marchas[cu.marchas.length - 1] as number) : 0;
      if (cu.presupuestoCorto.velocidad < masRapida) p.push(`${donde}.cuerpo.presupuestoCorto.velocidad: es menor que la marcha más rápida: la sala corregiría a quien corre`);
      longitud(r, `${donde}.cuerpo.presupuestoLargo.distancia`, cu.presupuestoLargo.distancia, 1);
      tics(r, `${donde}.cuerpo.presupuestoLargo.enTics`, cu.presupuestoLargo.enTics, 1);
      cantidad(r, `${donde}.cuerpo.vidaTope`, cu.vidaTope, 1);
      cantidad(r, `${donde}.cuerpo.vidaAlRematar`, cu.vidaAlRematar);
      tics(r, `${donde}.cuerpo.firmeCadaTics`, cu.firmeCadaTics);
      tics(r, `${donde}.cuerpo.guardaTics`, cu.guardaTics);

      const suyas: number[] = [];
      if (lista(r, `${donde}.acciones`, a.acciones)) {
        for (const ac of a.acciones) suyas.push(ac.id);
        for (let j = 0; j < a.acciones.length; j++) accion(r, `${donde}.acciones[${String(j)}]`, a.acciones[j] as AccionDeclarada, estados, suyas);
      }
      const es = a.esquiva;
      entero(r, `${donde}.esquiva.accion`, es.accion, 1, TOPE_DE_ID);
      puesta(r, `${donde}.esquiva.puesta`, es.puesta, estados);
      if (es.puesta.intocableTics !== 0) {
        p.push(
          `${donde}.esquiva.puesta.intocableTics: la esquiva se juzga por su ventana en el reloj del aparato y no tiene intocable (va a 0): ` +
            'dos jueces del mismo impacto discreparían en el borde que mueve el desfase; lo que esquiva es esquivaHastaMs',
        );
      }
      ms(r, `${donde}.esquiva.ventanaMs`, es.ventanaMs);
      ms(r, `${donde}.esquiva.esquivaHastaMs`, es.esquivaHastaMs);
      if (es.ventanaMs > es.esquivaHastaMs) p.push(`${donde}.esquiva: la ventana limpia (${String(es.ventanaMs)} ms) pasa de la de esquivar (${String(es.esquivaHastaMs)} ms)`);
      cantidad(r, `${donde}.esquiva.primeras.cuantas`, es.primeras.cuantas);
      ms(r, `${donde}.esquiva.primeras.ventanaMs`, es.primeras.ventanaMs);
      cantidad(r, `${donde}.esquiva.torpe.cada`, es.torpe.cada);
      tics(r, `${donde}.esquiva.torpe.enTics`, es.torpe.enTics);
      puesta(r, `${donde}.esquiva.alAcertar.puesta`, es.alAcertar.puesta, estados);
      puesta(r, `${donde}.esquiva.alAcertar.alAutor`, es.alAcertar.alAutor, estados);
      longitud(r, `${donde}.esquiva.contraProyectil.distancia`, es.contraProyectil.distancia);
      tics(r, `${donde}.esquiva.contraProyectil.tics`, es.contraProyectil.tics, 1);
      existe(r, `${donde}.esquiva.contraProyectil.accion`, es.contraProyectil.accion, suyas, 'la acción de su asiento');
      cantidad(r, `${donde}.esquiva.ruptura.coste`, es.ruptura.coste);
      if (lista(r, `${donde}.esquiva.ruptura.desde`, es.ruptura.desde)) {
        for (const e of es.ruptura.desde) {
          existe(r, `${donde}.esquiva.ruptura.desde`, e, estados, 'el estado');
          const est = d.estados.find((x) => x.id === e);
          if (est !== undefined && est.cancelaCon.indexOf(es.accion) < 0) {
            p.push(`${donde}.esquiva.ruptura.desde: el estado ${String(e)} no lleva la esquiva (${String(es.accion)}) en su cancelaCon, así que la ruptura no se podría empezar en él`);
          }
        }
      }
      puesta(r, `${donde}.esquiva.ruptura.puesta`, es.ruptura.puesta, estados);
      const re = a.rescate;
      entero(r, `${donde}.rescate.accion`, re.accion, 1, TOPE_DE_ID);
      longitud(r, `${donde}.rescate.radio`, re.radio, 1);
      tics(r, `${donde}.rescate.mantenerTics`, re.mantenerTics, 1);
      puesta(r, `${donde}.rescate.puesta`, re.puesta, estados);
      cantidad(r, `${donde}.rescate.vidaAlVolver`, re.vidaAlVolver, 1);
      if (re.vidaAlVolver > cu.vidaTope) p.push(`${donde}.rescate.vidaAlVolver: vuelve con más vida que su tope`);
      cantidad(r, `${donde}.rescate.medidorAmbos`, re.medidorAmbos);
      /* W · El tiro: su forma entera, y hoy, además, que la sala todavía no lo cumple (ver `TiroDeclarado`). */
      const ti = a.tiro;
      if ((ti as unknown) === undefined) p.push(`${donde}.tiro: falta; un asiento sin tiro lo dice con null`);
      else if (ti !== null) {
        revisarElTiro(r, `${donde}.tiro`, ti, estados, Array.isArray(d.proyectiles) ? d.proyectiles : []);
        p.push(`${donde}.tiro: la sala todavía no cumple el tiro cargado (sólo está su forma); hasta que lo cumpla va a null`);
      }
      const me = a.medidor;
      cantidad(r, `${donde}.medidor.tope`, me.tope);
      cantidad(r, `${donde}.medidor.porLimpia`, me.porLimpia);
      cantidad(r, `${donde}.medidor.porRitmo`, me.porRitmo);
      cantidad(r, `${donde}.medidor.porRemate`, me.porRemate);
      cantidad(r, `${donde}.medidor.porChoque`, me.porChoque);
      if (es.ruptura.coste > me.tope) p.push(`${donde}.esquiva.ruptura.coste: cuesta más medidor del que cabe: no se podría hacer nunca`);
      const pu = a.puntos;
      entero(r, `${donde}.puntos.factor`, pu.factor, 1, TOPE_DE_MULTIPLICADOR);
      entero(r, `${donde}.puntos.multiplicador.paso`, pu.multiplicador.paso, 0, TOPE_DE_MULTIPLICADOR);
      entero(r, `${donde}.puntos.multiplicador.tope`, pu.multiplicador.tope, UNO, TOPE_DE_MULTIPLICADOR);
      cantidad(r, `${donde}.puntos.porLimpia`, pu.porLimpia);
      cantidad(r, `${donde}.puntos.porChoque`, pu.porChoque);
      cantidad(r, `${donde}.puntos.porRemate`, pu.porRemate);
      cantidad(r, `${donde}.puntos.porRescate`, pu.porRescate);
      cantidad(r, `${donde}.puntos.porSalir`, pu.porSalir);
      const ae = a.alEmpezar;
      cantidad(r, `${donde}.alEmpezar.vida`, ae.vida, 1);
      if (ae.vida > cu.vidaTope) p.push(`${donde}.alEmpezar.vida: empieza con más vida (${String(ae.vida)}) que su tope (${String(cu.vidaTope)})`);
      cantidad(r, `${donde}.alEmpezar.medidor`, ae.medidor);
      if (ae.medidor > me.tope) p.push(`${donde}.alEmpezar.medidor: empieza con más medidor que su tope`);
      if (lista(r, `${donde}.alEmpezar.lleva`, ae.lleva)) {
        const llevados: number[] = [];
        for (let j = 0; j < ae.lleva.length; j++) {
          const l = ae.lleva[j] as CargaDePortable;
          const dl = `${donde}.alEmpezar.lleva[${String(j)}]`;
          existe(r, `${dl}.portable`, l.portable, portables, 'el portable');
          llevados.push(l.portable);
          cantidad(r, `${dl}.n`, l.n);
          const po = d.portables.find((x) => x.id === l.portable);
          if (po !== undefined && l.n > po.tope) p.push(`${dl}.n: lleva ${String(l.n)} y el tope es ${String(po.tope)}`);
        }
        idsSinRepetir(r, `${donde}.alEmpezar.lleva`, llevados);
      }

      /* Los ids que este asiento puede mandar no se pisan entre sí ni con los de las entidades. */
      const delCable = [...suyas, es.accion, re.accion, ...remates];
      if (ti !== null && ti !== undefined) delCable.push(ti.apuntar, ti.soltar);
      const encuentro = d.fase.encuentro;
      if (encuentro !== null && encuentro.fin.tipo === 'salida') delCable.push(encuentro.fin.zona.accion);
      idsSinRepetir(r, `${donde}: los ids de acción que manda (golpes, esquiva, rescate, tiro, remates y zona)`, delCable);
      for (const id of delCable) {
        if (accionesDeClases.indexOf(id) >= 0) p.push(`${donde}: el id de acción ${String(id)} lo usa también una clase de entidad; el aparato no sabría qué pintar`);
        if (accionesDeAsientos.indexOf(id) < 0) accionesDeAsientos.push(id);
      }
    }
  }
  const cuantosAsientos = Array.isArray(d.asientos) ? d.asientos.length : 0;

  /* ── Las referencias cruzadas que sólo se pueden mirar con todo leído ──── */
  for (let i = 0; i < d.estados.length; i++) {
    const e = d.estados[i] as EstadoDeclarado;
    if (Array.isArray(e.cancelaCon)) {
      for (const a of e.cancelaCon) {
        if (accionesDeAsientos.indexOf(a) < 0 && accionesDeClases.indexOf(a) < 0) {
          p.push(`estados[${String(i)}].cancelaCon: nombra la acción ${String(a)}, que no está declarada`);
        }
      }
    }
  }
  for (let i = 0; i < d.clases.length; i++) {
    const g = (d.clases[i] as ClaseDeEntidad).guardia;
    if (g === null) continue;
    for (const a of g.para) existe(r, `clases[${String(i)}].guardia.para`, a, accionesDeAsientos, 'la acción de asiento');
    for (const a of g.esquivaAlAzar.acciones) existe(r, `clases[${String(i)}].guardia.esquivaAlAzar.acciones`, a, accionesDeAsientos, 'la acción de asiento');
  }

  /*
   * Los sitios de nacer, contra el suelo y contra el límite de la fase: con el radio MAYOR de los
   * asientos, porque cualquiera puede aparecer en cualquiera (el asiento `i` usa el `i` módulo cuántos).
   */
  const limiteDeLaFase = Array.isArray(m.limites) ? m.limites.find((l) => l.id === d.fase.limite) : undefined;
  let radioMayor = 0;
  for (let i = 0; i < cuantosAsientos; i++) {
    const ra = (d.asientos[i] as ReglasDeAsiento).cuerpo.radio;
    if (Number.isInteger(ra) && ra > radioMayor && ra <= TOPE_DE_RADIO) radioMayor = ra;
  }
  if (sueloBien && Array.isArray(m.nace)) {
    const arena = arenaDelSuelo(suelo);
    for (let i = 0; i < m.nace.length; i++) {
      const s = m.nace[i] as SitioDeNacer;
      if (!Number.isInteger(s.x) || !Number.isInteger(s.z)) continue;
      const donde = `mundo.nace[${String(i)}]`;
      if (!sePuedeEstar(arena, s.x, s.z, radioMayor)) {
        p.push(`${donde}: en (${String(s.x / UNO)}, ${String(s.z / UNO)}) no se puede estar —sin suelo o dentro de la estructura, con radio ${String(radioMayor / UNO)}—: quien aparezca ahí se queda corregido en el sitio`);
      }
      if (limiteDeLaFase !== undefined) {
        const l = limiteDeLaFase.caja;
        if (s.x < l.x0 || s.x > l.x1 || s.z < l.z0 || s.z > l.z1) {
          p.push(`${donde}: queda fuera del límite ${String(d.fase.limite)} de la fase: la sala no aceptaría ni su primer paso`);
        }
      }
    }
  }

  /* ── Turnos, equipo, presencia, avisos, red, veredictos, aforo ──────────── */
  const t = d.turnos;
  cantidad(r, 'turnos.cuerpoACuerpo', t.cuerpoACuerpo);
  cantidad(r, 'turnos.disparo', t.disparo);
  cantidad(r, 'turnos.anunciosALaVez', t.anunciosALaVez, 1);
  if (lista(r, 'turnos.excluyen', t.excluyen)) for (const e of t.excluyen) existe(r, 'turnos.excluyen', e, estados, 'el estado');
  booleano(r, 'turnos.alargarConLaRed', t.alargarConLaRed);
  tics(r, 'turnos.repetirTrasTics', t.repetirTrasTics);

  const eq = d.equipo;
  cantidad(r, 'equipo.recurso', eq.recurso);
  puesta(r, 'equipo.caida', eq.caida, estados);
  cantidad(r, 'equipo.reaparicion.coste', eq.reaparicion.coste);
  tics(r, 'equipo.reaparicion.esperaTics', eq.reaparicion.esperaTics);
  cantidad(r, 'equipo.reaparicion.vida', eq.reaparicion.vida, 1);
  puesta(r, 'equipo.reaparicion.puesta', eq.reaparicion.puesta, estados);
  for (let i = 0; i < cuantosAsientos; i++) {
    const a = d.asientos[i] as ReglasDeAsiento;
    if (eq.reaparicion.vida > a.cuerpo.vidaTope) p.push(`equipo.reaparicion.vida: reaparece con más vida que el tope del asiento ${String(i + 1)}`);
  }

  if (entero(r, 'sinCuerpo.estado', d.sinCuerpo.estado, 1, TOPE_DE_ID)) existe(r, 'sinCuerpo.estado', d.sinCuerpo.estado, estados, 'el estado');
  tics(r, 'presencia.ausenteTrasTics', d.presencia.ausenteTrasTics, 1);
  if (entero(r, 'presencia.estadoAusente', d.presencia.estadoAusente, 1, TOPE_DE_ID)) {
    existe(r, 'presencia.estadoAusente', d.presencia.estadoAusente, estados, 'el estado');
    /* El ausente ni anda ni pega: si no, fingirse ausente sería jugar intocable (ver `PresenciaDeclarada`). */
    for (const e of Array.isArray(d.estados) ? d.estados : []) {
      if (e === null || typeof e !== 'object' || e.id !== d.presencia.estadoAusente) continue;
      if (e.bloqueaPaso !== true || e.bloqueaAccion !== true || !Array.isArray(e.cancelaCon) || e.cancelaCon.length > 0) {
        p.push('presencia.estadoAusente: tiene que bloquear el paso y las acciones, sin nada que lo cancele: el ausente ni anda ni pega');
      }
    }
  }
  tics(r, 'presencia.veredictoTrasTics', d.presencia.veredictoTrasTics, 1);

  const clasesDeAviso: number[] = [];
  if (lista(r, 'avisos.clases', d.avisos.clases)) {
    for (let i = 0; i < d.avisos.clases.length; i++) {
      const c = d.avisos.clases[i] as ClaseDeAviso;
      if (entero(r, `avisos.clases[${String(i)}].id`, c.id, 1, TOPE_DE_ID)) clasesDeAviso.push(c.id);
      tics(r, `avisos.clases[${String(i)}].vidaTics`, c.vidaTics, 1);
      if (c.objetivo !== 'entidad' && c.objetivo !== 'asiento' && c.objetivo !== 'ninguno') {
        p.push(`avisos.clases[${String(i)}].objetivo: tiene que ser 'entidad', 'asiento' o 'ninguno'`);
      }
    }
    idsSinRepetir(r, 'avisos.clases', clasesDeAviso);
  }
  tics(r, 'avisos.cadaTics', d.avisos.cadaTics, 1);

  ms(r, 'red.compBaseMs', d.red.compBaseMs);
  ms(r, 'red.compTopeMs', d.red.compTopeMs);
  ms(r, 'red.esperaDeSitiosMs', d.red.esperaDeSitiosMs);

  if (lista(r, 'veredictos.columnas', d.veredictos.columnas)) {
    const columnas = d.veredictos.columnas;
    if (columnas.length === 0 || columnas.length > TOPE_DE_COLUMNAS) {
      p.push(`veredictos.columnas: hay ${String(columnas.length)} y tienen que ser de 1 a ${String(TOPE_DE_COLUMNAS)}`);
    }
    const vistas: string[] = [];
    for (let i = 0; i < columnas.length; i++) {
      const c = columnas[i] as ColumnaDeCuenta;
      const donde = `veredictos.columnas[${String(i)}]`;
      if (c.que === 'lleva' || c.que === 'cobrado') existe(r, `${donde}.portable`, c.portable, portables, 'el portable');
      else if ((CONTADORES_DE_ASIENTO as readonly string[]).indexOf(c.que) < 0) p.push(`${donde}: «${String(c.que)}» no es un contador de la liza`);
      /* Una columna dos veces es una ronda que dice lo mismo en dos sitios, y el reductor lee uno. */
      const llave = c.que === 'lleva' || c.que === 'cobrado' ? `${c.que}:${String(c.portable)}` : String(c.que);
      if (vistas.indexOf(llave) >= 0) p.push(`${donde}: la columna «${llave}» está dos veces`);
      vistas.push(llave);
    }
    const pesa = pesoDeLaRondaMasLarga(cuantosAsientos, columnas.length);
    if (pesa > TOPE_DE_CARGA_DE_LA_MESA) {
      p.push(`veredictos.columnas: con ${String(cuantosAsientos)} asientos el arcade:ronda más largo pesa ${String(pesa)} bytes y la mesa admite ${String(TOPE_DE_CARGA_DE_LA_MESA)}`);
    }
  }

  const af = d.aforo;
  cantidad(r, 'aforo.entidades', af.entidades, 1);
  if (af.entidades > TOPE_DE_ENTIDADES) p.push(`aforo.entidades: ${String(af.entidades)} no caben (el tope de la liza es ${String(TOPE_DE_ENTIDADES)}: ver su comentario)`);
  cantidad(r, 'aforo.balas', af.balas, 0);
  if (af.balas > TOPE_DE_BALAS) p.push(`aforo.balas: ${String(af.balas)} no caben (el tope de la liza es ${String(TOPE_DE_BALAS)})`);
  cantidad(r, 'aforo.montones', af.montones, 0);
  if (af.montones > TOPE_DE_MONTONES) p.push(`aforo.montones: ${String(af.montones)} no caben (el tope de la liza es ${String(TOPE_DE_MONTONES)})`);
  if (Array.isArray(d.portables) && d.portables.length > 0 && af.montones === 0) p.push('aforo.montones: hay portables y ningún montón cabe: lo que se suelta no tendría dónde caer');
  if (Array.isArray(d.portables) && d.portables.length === 0 && af.montones !== 0) p.push('aforo.montones: sin portables no hay montones; va a 0');
  if (Array.isArray(d.proyectiles) && d.proyectiles.length > 0 && af.balas === 0) p.push('aforo.balas: hay proyectiles y ninguna bala cabe');

  /* ── La fase ──────────────────────────────────────────────────────────── */
  const f = d.fase;
  if (!esClaveCorta(f.clave)) p.push('fase.clave: tiene que ser una clave corta (1 a 64 letras de A-Z, a-z, 0-9 y _ . : -)');
  if (f.modo !== 'quieta' && f.modo !== 'calma' && f.modo !== 'encuentro') p.push("fase.modo: tiene que ser 'quieta', 'calma' o 'encuentro'");
  if (entero(r, 'fase.limite', f.limite, 1, TOPE_DE_ID)) existe(r, 'fase.limite', f.limite, limites, 'el límite');
  entero(r, 'fase.semilla', f.semilla, 0, 4294967295);
  if (f.reloj !== null) {
    if (!esClaveCorta(f.reloj.id)) p.push('fase.reloj.id: tiene que ser una clave corta (1 a 64 letras de A-Z, a-z, 0-9 y _ . : -)');
    entero(r, 'fase.reloj.duraMs', f.reloj.duraMs, 1, TOPE_DE_TICS * MS_POR_TIC);
  }
  if (f.modo === 'encuentro' && f.encuentro === null) p.push('fase.encuentro: en el modo encuentro tiene que haber encuentro');
  if (f.modo !== 'encuentro' && f.encuentro !== null) p.push(`fase.encuentro: en el modo ${String(f.modo)} no hay encuentro; va a null`);
  if (f.encuentro !== null) {
    const en = f.encuentro;
    cantidad(r, 'fase.encuentro.ronda', en.ronda, 1);
    entero(r, 'fase.encuentro.presentes', en.presentes, 1, Math.max(1, cuantosAsientos));
    tics(r, 'fase.encuentro.relojTics', en.relojTics, 1);
    tablaPorPresentes(r, 'fase.encuentro.vivasALaVez', en.vivasALaVez, cuantosAsientos, 1);
    if (Array.isArray(en.vivasALaVez)) for (const v of en.vivasALaVez) if (v > d.aforo.entidades) p.push(`fase.encuentro.vivasALaVez: ${String(v)} vivas no caben en el aforo (${String(d.aforo.entidades)})`);
    if (lista(r, 'fase.encuentro.grupos', en.grupos)) {
      for (let i = 0; i < en.grupos.length; i++) {
        const g = en.grupos[i] as GrupoDeclarado;
        const donde = `fase.encuentro.grupos[${String(i)}]`;
        if (entero(r, `${donde}.clase`, g.clase, 1, TOPE_DE_ID)) existe(r, `${donde}.clase`, g.clase, clases, 'la clase');
        tablaPorPresentes(r, `${donde}.cuantos`, g.cuantos, cuantosAsientos, 0);
        tablaPorPresentes(r, `${donde}.vivasALaVez`, g.vivasALaVez, cuantosAsientos, 1);
        if (clasesDeZona.indexOf(g.claseDeZona) < 0) p.push(`${donde}.claseDeZona: no hay ninguna zona de la clase ${String(g.claseDeZona)} de donde salir`);
        tics(r, `${donde}.desdeTic`, g.desdeTic);
        tics(r, `${donde}.cadaTics`, g.cadaTics);
        if (g.eleccion !== 'azar' && g.eleccion !== 'aLaEspalda' && g.eleccion !== 'zonaDeAccion') {
          p.push(`${donde}.eleccion: tiene que ser 'azar', 'aLaEspalda' o 'zonaDeAccion'`);
        }
        if (g.eleccion === 'zonaDeAccion' && en.fin.tipo !== 'salida') {
          p.push(`${donde}.eleccion: 'zonaDeAccion' en un encuentro sin zona de acción: no saldría nunca`);
        }
      }
    }
    /* L10 · El olvido: en la forma transitoria no está, y vale `null` (ver `EncuentroSinOlvido`). */
    if ('olvido' in en && en.olvido !== null) {
      const o: unknown = en.olvido;
      if (typeof o !== 'object' || o === null || Array.isArray(o)) p.push('fase.encuentro.olvido: tiene que ser {distancia, tics} o null');
      else {
        const ol = o as OlvidoDeclarado;
        longitud(r, 'fase.encuentro.olvido.distancia', ol.distancia, 1);
        tics(r, 'fase.encuentro.olvido.tics', ol.tics, 1);
        /*
         * Lo que persigue a alguien no se olvida a media persecución: cada clase persigue de 1 a la distancia
         * del olvido. Sin tope (0, o la forma transitoria), una entidad que siguiera a uno más allá de esa
         * distancia se iría persiguiéndolo.
         */
        if (Number.isInteger(ol.distancia) && Array.isArray(d.clases)) {
          for (let i = 0; i < d.clases.length; i++) {
            const c = d.clases[i] as ClaseDeEntidad;
            if (c === null || typeof c !== 'object' || c.cerebro === null || typeof c.cerebro !== 'object') continue;
            const alcance = alcanceDeBlancoDe(c.cerebro);
            if (Number.isInteger(alcance) && (alcance < 1 || alcance > ol.distancia)) {
              p.push(
                `clases[${String(i)}].cerebro.alcanceDeBlanco: es ${alcance === 0 ? 'sin tope (0)' : String(alcance / UNO)} y, con olvido a ${String(ol.distancia / UNO)} unidades, ` +
                  'cada clase persigue de 1 a esa distancia: lo que persiguiera más lejos se olvidaría persiguiendo',
              );
            }
          }
        }
      }
    }
    const fin = en.fin;
    if (fin.tipo === 'vaciar') {
      if (en.grupos.length === 0) p.push("fase.encuentro.fin: un encuentro que acaba al vaciarse sin grupos está ganado antes de empezar");
    } else if (fin.tipo === 'salida') {
      const z = fin.zona;
      const donde = 'fase.encuentro.fin.zona';
      if (clasesDeZona.indexOf(z.claseDeZona) < 0) p.push(`${donde}.claseDeZona: no hay ninguna zona de la clase ${String(z.claseDeZona)} que activar`);
      entero(r, `${donde}.accion`, z.accion, 1, TOPE_DE_ID);
      longitud(r, `${donde}.radio`, z.radio, 1);
      tics(r, `${donde}.mantenerTics`, z.mantenerTics, 1);
      cantidad(r, `${donde}.capacidad`, z.capacidad, 1);
      puesta(r, `${donde}.puesta`, z.puesta, estados);
      booleano(r, `${donde}.rompeConDano`, z.rompeConDano);
      tics(r, `${donde}.activaTics`, z.activaTics, 1);
      cantidad(r, `${donde}.alApagarse.coste`, z.alApagarse.coste);
      tics(r, `${donde}.alApagarse.siguienteTics`, z.alApagarse.siguienteTics, 1);
      tablaPorPresentes(r, 'fase.encuentro.fin.salenComoMinimo', fin.salenComoMinimo, cuantosAsientos, 1);
      for (let i = 0; i < fin.salenComoMinimo.length; i++) {
        if ((fin.salenComoMinimo[i] as number) > i + 1) p.push(`fase.encuentro.fin.salenComoMinimo[${String(i)}]: con ${String(i + 1)} presentes no pueden salir ${String(fin.salenComoMinimo[i])}`);
      }
    } else {
      p.push("fase.encuentro.fin.tipo: tiene que ser 'vaciar' o 'salida'");
    }
  }
}

/* ─── LA REVISIÓN DE LO QUE ENTRA ────────────────────────────────────────── */

/**
 * QUÉ LE PASA A UNA AMPLIACIÓN (L1-L12) contra la declaración que amplía; `[]` si está bien. Como
 * `problemasDeLaDeclaracion`: rangos y coherencia —todo lo que nombra existe, cada lista tiene un valor por
 * lo que acompaña, lo que viaja cabe en el cable, lo vivo cabe en el aforo—, y nunca lanza. No revisa la
 * declaración: para eso está la otra. Las dos juntas dicen lo que dirá `revisar` cuando cada pieza entre en
 * `LizaDeclarada`, y esta parte se mueve allí con ella.
 */
export function problemasDeLaAmpliacion(d: LizaDeclarada, a: AmpliacionDeLaLiza): string[] {
  const p: string[] = [];
  try {
    revisarLaAmpliacion(d, a, p);
  } catch (error) {
    p.push(`la ampliación no tiene la forma del contrato: ${error instanceof Error ? error.message : String(error)}`);
  }
  return p;
}

function banda(r: Revision, donde: string, b: BandaDeDistancia): void {
  longitud(r, `${donde}.desde`, b.desde);
  longitud(r, `${donde}.hasta`, b.hasta, 1);
  if (b.desde >= b.hasta) r.p.push(`${donde}: la banda va de ${String(b.desde)} a ${String(b.hasta)}, y tiene que ir de menos a más`);
  cantidad(r, `${donde}.puntos`, b.puntos);
}

/** Una zona de acción ampliada: lo de hoy (como en `revisar`) y lo que entra. */
function zonaAmpliada(
  r: Revision,
  donde: string,
  z: ZonaDeAccionAmpliada,
  estados: readonly number[],
  clasesDeZona: readonly number[],
  portables: readonly number[],
  nudos: number,
): void {
  if (clasesDeZona.indexOf(z.claseDeZona) < 0) r.p.push(`${donde}.claseDeZona: no hay ninguna zona de la clase ${String(z.claseDeZona)} que activar`);
  entero(r, `${donde}.accion`, z.accion, 1, TOPE_DE_ID);
  longitud(r, `${donde}.radio`, z.radio, 1);
  tics(r, `${donde}.mantenerTics`, z.mantenerTics, 1);
  cantidad(r, `${donde}.capacidad`, z.capacidad, 1);
  puesta(r, `${donde}.puesta`, z.puesta, estados);
  booleano(r, `${donde}.rompeConDano`, z.rompeConDano);
  tics(r, `${donde}.activaTics`, z.activaTics, 1);
  cantidad(r, `${donde}.alApagarse.coste`, z.alApagarse.coste);
  tics(r, `${donde}.alApagarse.siguienteTics`, z.alApagarse.siguienteTics, 1);
  if (entero(r, `${donde}.activasALaVez`, z.activasALaVez, 1, TOPE_DE_BANDAS) && lista(r, `${donde}.bandas`, z.bandas)) {
    if (z.bandas.length === 0 && z.activasALaVez !== 1) r.p.push(`${donde}.activasALaVez: sin bandas se activa una, como hoy; con ${String(z.activasALaVez)} a la vez va una banda por cada una`);
    if (z.bandas.length > 0 && z.bandas.length !== z.activasALaVez) r.p.push(`${donde}.bandas: hay ${String(z.bandas.length)} y se activan ${String(z.activasALaVez)} a la vez (una banda por cada una)`);
    for (let i = 0; i < z.bandas.length; i++) banda(r, `${donde}.bandas[${String(i)}]`, z.bandas[i] as BandaDeDistancia);
    if ((z.bandas.length > 0 || z.relevo !== null) && nudos === 0) r.p.push(`${donde}.bandas: se miden por el grafo, y el mundo no tiene grafo`);
  }
  if (z.relevo !== null) banda(r, `${donde}.relevo`, z.relevo);
  const e = z.efecto;
  if (e.tipo === 'soltar') {
    if (entero(r, `${donde}.efecto.portable`, e.portable, 1, TOPE_DE_ID)) existe(r, `${donde}.efecto.portable`, e.portable, portables, 'el portable');
    cantidad(r, `${donde}.efecto.cuantos`, e.cuantos, 1);
  } else if (e.tipo !== 'salir') {
    r.p.push(`${donde}.efecto.tipo: tiene que ser 'salir' o 'soltar'`);
  }
}

function revisarLaAmpliacion(d: LizaDeclarada, a: AmpliacionDeLaLiza, p: string[]): void {
  const r: Revision = { p, bloquean: [] };
  for (const e of d.estados) if (e.bloqueaAccion === true) r.bloquean.push(e.id);
  const noCanonico = porQueNoEsCanonico(a);
  if (noCanonico !== null) p.push(`no es dato llano (no pasa por canonico.ts): ${noCanonico}`);

  /* ── Lo que la ampliación nombra de la declaración ────────────────────── */
  const estados: number[] = [];
  for (const e of d.estados) estados.push(e.id);
  const zonas: number[] = [];
  const clasesDeZona: number[] = [];
  for (const z of d.mundo.zonas) {
    zonas.push(z.id);
    clasesDeZona.push(z.clase);
  }
  const clases: number[] = [];
  for (const c of d.clases) clases.push(c.id);
  const portables: number[] = [];
  for (const po of d.portables) portables.push(po.id);
  const nudos = d.mundo.grafo.nudos.length;
  const cuantosAsientos = d.asientos.length;
  const encuentro = d.fase.encuentro;
  const grupos = encuentro === null ? [] : encuentro.grupos;
  /* Los ids de acción que ya están cogidos: los de los asientos, los de las clases, los remates y la zona de hoy. */
  const cogidos: number[] = [];
  for (const s of d.asientos) {
    for (const ac of s.acciones) cogidos.push(ac.id);
    cogidos.push(s.esquiva.accion, s.rescate.accion);
  }
  for (const c of d.clases) {
    for (const ac of c.acciones) cogidos.push(ac.id);
    if (c.alCaer.tipo === 'rematable') cogidos.push(c.alCaer.remate.accion);
  }
  if (encuentro !== null && encuentro.fin.tipo === 'salida') cogidos.push(encuentro.fin.zona.accion);
  const salidaDeHoy = encuentro !== null && encuentro.fin.tipo === 'salida' ? encuentro.fin.zona : null;

  if (nudos > TOPE_DE_NUDOS) p.push(`mundo.grafo.nudos: hay ${String(nudos)} y caben ${String(TOPE_DE_NUDOS)}: el aviso sobre un nudo lleva su índice más uno en el cable`);

  /* ── L5 · La zona del fin, ampliada ───────────────────────────────────── */
  if (a.salida !== null) {
    if (salidaDeHoy === null) p.push('salida: el encuentro no acaba por una zona de acción; va a null');
    else {
      if (a.salida.claseDeZona !== salidaDeHoy.claseDeZona || a.salida.accion !== salidaDeHoy.accion) {
        p.push('salida: no es la zona del fin del encuentro (otra clase de zona u otra acción): se amplía la que hay, no otra');
      }
      zonaAmpliada(r, 'salida', a.salida, estados, clasesDeZona, portables, nudos);
      if (a.salida.efecto.tipo !== 'salir') p.push("salida.efecto: la zona del fin hace salir; 'soltar' es de las zonas de acción del encuentro");
    }
  } else if (salidaDeHoy !== null) {
    p.push('salida: el encuentro acaba por una zona de acción, y falta su ampliación');
  }
  const bandasDeLaSalida = a.salida === null ? 0 : a.salida.bandas.length;

  /* ── L3 · Las rondas (antes que los grupos: un grupo `ronda` necesita una que lo nombre) ── */
  const refuerzos: number[] = [];
  if (a.rondas !== null) {
    const ro = a.rondas;
    if (encuentro === null) p.push('rondas: sin encuentro no hay rondas; va a null');
    entero(r, 'rondas.aLaVez', ro.aLaVez, 1, TOPE_DE_RONDAS);
    if (lista(r, 'rondas.lista', ro.lista)) {
      if (ro.lista.length === 0 || ro.lista.length > TOPE_DE_RONDAS) p.push(`rondas.lista: hay ${String(ro.lista.length)} y tienen que ser de 1 a ${String(TOPE_DE_RONDAS)}`);
      const aristas = new Set<string>();
      for (const [u, v] of d.mundo.grafo.aristas) aristas.add(u < v ? `${String(u)}-${String(v)}` : `${String(v)}-${String(u)}`);
      let masMiembros = 0;
      for (let k = 0; k < ro.lista.length; k++) {
        const ronda = ro.lista[k] as RondaDeclarada;
        const donde = `rondas.lista[${String(k)}]`;
        if (lista(r, `${donde}.miembros`, ronda.miembros)) {
          if (ronda.miembros.length === 0 || ronda.miembros.length > TOPE_DE_MIEMBROS) p.push(`${donde}.miembros: hay ${String(ronda.miembros.length)} y tienen que ser de 1 a ${String(TOPE_DE_MIEMBROS)}`);
          if (ronda.miembros.length > masMiembros) masMiembros = ronda.miembros.length;
          for (const c of ronda.miembros) existe(r, `${donde}.miembros`, c, clases, 'la clase');
        }
        if (lista(r, `${donde}.ruta`, ronda.ruta)) {
          if (ronda.ruta.length < 2) p.push(`${donde}.ruta: un circuito tiene dos nudos o más`);
          let bien = true;
          for (let i = 0; i < ronda.ruta.length; i++) if (!entero(r, `${donde}.ruta[${String(i)}]`, ronda.ruta[i], 0, Math.max(0, nudos - 1))) bien = false;
          if (bien && ronda.ruta.length >= 2) {
            for (let i = 0; i < ronda.ruta.length; i++) {
              const u = ronda.ruta[i] as number;
              const v = ronda.ruta[(i + 1) % ronda.ruta.length] as number;
              const llave = u < v ? `${String(u)}-${String(v)}` : `${String(v)}-${String(u)}`;
              if (!aristas.has(llave)) p.push(`${donde}.ruta: del nudo ${String(u)} al ${String(v)} no hay arista: el circuito salta por encima de lo que se anda`);
            }
          }
        }
        longitud(r, `${donde}.paso`, ronda.paso, 1);
        longitud(r, `${donde}.separacion`, ronda.separacion);
        tics(r, `${donde}.desfaseTics`, ronda.desfaseTics);
        longitud(r, `${donde}.materializa`, ronda.materializa, 1);
        if (ronda.alOlvidarse !== 'guion' && ronda.alOlvidarse !== 'consumida') p.push(`${donde}.alOlvidarse: tiene que ser 'guion' o 'consumida'`);
        longitud(r, `${donde}.vista.radio`, ronda.vista.radio);
        entero(r, `${donde}.vista.conoRumbos`, ronda.vista.conoRumbos, 0, CUARTO_DE_VUELTA);
        longitud(r, `${donde}.oido.radio`, ronda.oido.radio);
        longitud(r, `${donde}.oido.aLaCarrera`, ronda.oido.aLaCarrera);
        if (ronda.oido.aLaCarrera < ronda.oido.radio) p.push(`${donde}.oido: a la carrera se oye más lejos, no menos`);
        tics(r, `${donde}.alarmaTics`, ronda.alarmaTics);
        if (entero(r, `${donde}.refuerzo`, ronda.refuerzo, 0, grupos.length) && ronda.refuerzo !== 0) {
          refuerzos.push(ronda.refuerzo);
          const g = Array.isArray(a.grupos) ? a.grupos[ronda.refuerzo - 1] : undefined;
          if (g !== undefined && g.disparo.tipo !== 'ronda') p.push(`${donde}.refuerzo: el grupo ${String(ronda.refuerzo)} no salta con el aviso de una ronda (su disparo es '${String(g.disparo.tipo)}')`);
        }
      }
      if (encuentro !== null && Number.isInteger(ro.aLaVez)) {
        for (let n = 1; n <= cuantosAsientos; n++) {
          const vivas = porPresentes(encuentro.vivasALaVez, n) + ro.aLaVez * masMiembros;
          if (vivas > d.aforo.entidades) {
            p.push(`rondas: con ${String(n)} presentes, lo vivo del encuentro más ${String(ro.aLaVez)} rondas de ${String(masMiembros)} son ${String(vivas)} y el aforo es ${String(d.aforo.entidades)}`);
          }
        }
      }
    }
  }

  /* ── L1, L2, L5 · Los grupos ──────────────────────────────────────────── */
  const conjuntosQueSeAbren: number[] = [];
  if (lista(r, 'grupos', a.grupos)) {
    if (a.grupos.length !== grupos.length) p.push(`grupos: hay ${String(a.grupos.length)} y el encuentro tiene ${String(grupos.length)} (uno por grupo, en su orden)`);
    if (grupos.length > TOPE_DE_GRUPOS) p.push(`grupos: el encuentro tiene ${String(grupos.length)} y caben ${String(TOPE_DE_GRUPOS)}: su número viaja en disparo.g`);
    for (let i = 0; i < a.grupos.length; i++) {
      const g = a.grupos[i] as { readonly eleccion: EleccionDeGrupo; readonly disparo: DisparoDeGrupo };
      const donde = `grupos[${String(i)}]`;
      const el = g.eleccion;
      if (typeof el === 'string') {
        if (el !== 'azar' && el !== 'aLaEspalda' && el !== 'zonaDeAccion') p.push(`${donde}.eleccion: tiene que ser 'azar', 'aLaEspalda', 'zonaDeAccion', un nudo o una banda`);
        if (el === 'zonaDeAccion' && salidaDeHoy === null) p.push(`${donde}.eleccion: 'zonaDeAccion' en un encuentro sin zona de acción: no saldría nunca`);
      } else if (el !== null && typeof el === 'object' && el.tipo === 'nudo') {
        longitud(r, `${donde}.eleccion.desde`, el.desde);
        longitud(r, `${donde}.eleccion.hasta`, el.hasta, 1);
        if (el.desde >= el.hasta) p.push(`${donde}.eleccion: la banda de nudos va de ${String(el.desde)} a ${String(el.hasta)}, y tiene que ir de menos a más`);
        if (el.sesgo !== 'delante' && el.sesgo !== 'detras' && el.sesgo !== 'cualquiera') p.push(`${donde}.eleccion.sesgo: tiene que ser 'delante', 'detras' o 'cualquiera'`);
        entero(r, `${donde}.eleccion.conoRumbos`, el.conoRumbos, 0, CUARTO_DE_VUELTA);
        if (el.sesgo === 'cualquiera' && el.conoRumbos !== 0) p.push(`${donde}.eleccion.conoRumbos: sin sesgo no hay cono; va a 0`);
        booleano(r, `${donde}.eleccion.sinVista`, el.sinVista);
        if (nudos === 0) p.push(`${donde}.eleccion: sale de un nudo, y el mundo no tiene grafo`);
      } else if (el !== null && typeof el === 'object' && el.tipo === 'zonaDeAccion') {
        if (bandasDeLaSalida === 0) p.push(`${donde}.eleccion: sale de la zona de una banda, y la zona del fin no tiene bandas`);
        else entero(r, `${donde}.eleccion.banda`, el.banda, 0, bandasDeLaSalida - 1);
      } else {
        p.push(`${donde}.eleccion: tiene que ser 'azar', 'aLaEspalda', 'zonaDeAccion', un nudo o una banda`);
      }
      const di = g.disparo;
      const dd = `${donde}.disparo`;
      switch (di.tipo) {
        case 'tic':
          break;
        case 'entrar':
          if (entero(r, `${dd}.zona`, di.zona, 1, TOPE_DE_ID)) existe(r, `${dd}.zona`, di.zona, zonas, 'la zona');
          longitud(r, `${dd}.radio`, di.radio, 1);
          tablaPorPresentes(r, `${dd}.minimo`, di.minimo, cuantosAsientos, 1);
          if (Array.isArray(di.minimo)) {
            for (let n = 0; n < di.minimo.length; n++) {
              if ((di.minimo[n] as number) > n + 1) p.push(`${dd}.minimo[${String(n)}]: con ${String(n + 1)} presentes no pueden llegar ${String(di.minimo[n])}: no saltaría nunca`);
            }
          }
          if (entero(r, `${dd}.conjunto`, di.conjunto, 0, TOPE_DE_ID) && di.conjunto !== 0) conjuntosQueSeAbren.push(di.conjunto);
          break;
        case 'calma':
          tics(r, `${dd}.tics`, di.tics, 1);
          longitud(r, `${dd}.radioDeCombate`, di.radioDeCombate);
          entero(r, `${dd}.lejosDeZonas.conjunto`, di.lejosDeZonas.conjunto, 0, TOPE_DE_ID);
          longitud(r, `${dd}.lejosDeZonas.distancia`, di.lejosDeZonas.distancia);
          cantidad(r, `${dd}.veces`, di.veces, 1);
          entero(r, `${dd}.secundarios.racimos`, di.secundarios.racimos, 0, TOPE_DE_ASIENTOS);
          entero(r, `${dd}.secundarios.miembros`, di.secundarios.miembros, 2, TOPE_DE_ASIENTOS);
          cantidad(r, `${dd}.secundarios.minimo`, di.secundarios.minimo);
          if (a.racimos === null && di.secundarios.racimos > 0) p.push(`${dd}.secundarios: sin racimos declarados todos son uno; no hay secundarios que contar`);
          break;
        case 'rezagado':
          longitud(r, `${dd}.distancia`, di.distancia, 1);
          tics(r, `${dd}.tics`, di.tics, 1);
          tics(r, `${dd}.cadaTics`, di.cadaTics, 1);
          cantidad(r, `${dd}.vivas`, di.vivas, 1);
          break;
        case 'ronda':
          if (refuerzos.indexOf(i + 1) < 0) p.push(`${dd}: ninguna ronda lo nombra en su refuerzo: no saltaría nunca`);
          break;
        default:
          p.push(`${dd}.tipo: tiene que ser 'tic', 'entrar', 'calma', 'rezagado' o 'ronda'`);
      }
    }
  }

  /* ── L4 · El fin por objetivo ─────────────────────────────────────────── */
  if (a.fin !== null) {
    const f = a.fin;
    if (encuentro === null) p.push('fin: sin encuentro no hay fin; va a null');
    if (a.salida !== null) p.push('fin: un encuentro acaba de una forma; con un objetivo, la zona del fin (salida) va a null');
    if (f.tipo !== 'objetivo') p.push("fin.tipo: tiene que ser 'objetivo'");
    if (entero(r, 'fin.conjunto', f.conjunto, 1, TOPE_DE_ID) && conjuntosQueSeAbren.indexOf(f.conjunto) < 0) {
      p.push(`fin.conjunto: ningún grupo 'entrar' es del conjunto ${String(f.conjunto)}: el objetivo no se abriría nunca`);
    }
    const c = f.como;
    if (c.tipo === 'rematar') {
      if (entero(r, 'fin.como.clase', c.clase, 1, TOPE_DE_ID)) {
        existe(r, 'fin.como.clase', c.clase, clases, 'la clase');
        const clase = d.clases.find((x) => x.id === c.clase);
        if (clase !== undefined && clase.alCaer.tipo !== 'rematable') p.push(`fin.como.clase: la clase ${String(c.clase)} no se remata: el objetivo no se cumpliría nunca`);
      }
    } else if (c.tipo === 'leer') {
      if (entero(r, 'fin.como.accion', c.accion, 1, TOPE_DE_ID) && cogidos.indexOf(c.accion) >= 0) p.push(`fin.como.accion: el id de acción ${String(c.accion)} ya lo usa otra acción`);
      longitud(r, 'fin.como.radio', c.radio, 1);
      tics(r, 'fin.como.tics', c.tics, 1);
      cantidad(r, 'fin.como.capacidad', c.capacidad, 1);
      booleano(r, 'fin.como.rompeConDano', c.rompeConDano);
      puesta(r, 'fin.como.puesta', c.puesta, estados);
    } else if (c.tipo !== 'vaciar') {
      p.push("fin.como.tipo: tiene que ser 'vaciar', 'rematar' o 'leer'");
    }
    tics(r, 'fin.disuelveTrasTics', f.disuelveTrasTics);
  }

  /* ── L12 · Las zonas de acción del encuentro ──────────────────────────── */
  if (lista(r, 'zonasDeAccion', a.zonasDeAccion)) {
    if (a.zonasDeAccion.length > 0 && encuentro === null) p.push('zonasDeAccion: sin encuentro no hay zonas de acción; va vacía');
    for (let i = 0; i < a.zonasDeAccion.length; i++) {
      const z = a.zonasDeAccion[i] as ZonaDeAccionAmpliada;
      const donde = `zonasDeAccion[${String(i)}]`;
      zonaAmpliada(r, donde, z, estados, clasesDeZona, portables, nudos);
      if (z.efecto.tipo !== 'soltar') p.push(`${donde}.efecto: una zona de acción que no es el fin suelta; 'salir' es de la zona del fin`);
      if (Number.isInteger(z.accion) && cogidos.indexOf(z.accion) >= 0) p.push(`${donde}.accion: el id de acción ${String(z.accion)} ya lo usa otra acción`);
    }
  }

  /* ── L11 · Racimos (el olvido, L10, ya se revisa con la declaración) ───── */
  if (a.racimos !== null) {
    const ra = a.racimos;
    longitud(r, 'racimos.une', ra.une, 1);
    longitud(r, 'racimos.separa', ra.separa, 1);
    if (ra.une > ra.separa) p.push('racimos: se separan antes de unirse (une tiene que ser menor o igual que separa)');
    tics(r, 'racimos.cadaTics', ra.cadaTics, 1);
    tics(r, 'racimos.rumboTics', ra.rumboTics, 1);
  }

  /* ── L6 · Dónde se nace y se vuelve ───────────────────────────────────── */
  if (a.puntoDeControl !== null) {
    const pc = a.puntoDeControl;
    const bien = entero(r, 'puntoDeControl.x', pc.x, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA) && entero(r, 'puntoDeControl.z', pc.z, -TOPE_DE_LA_LIZA, TOPE_DE_LA_LIZA);
    const limite = d.mundo.limites.find((l) => l.id === d.fase.limite);
    if (bien && limite !== undefined && (pc.x < limite.caja.x0 || pc.x > limite.caja.x1 || pc.z < limite.caja.z0 || pc.z > limite.caja.z1)) {
      p.push(`puntoDeControl: queda fuera del límite ${String(d.fase.limite)} de la fase`);
    }
  }
  if (a.reaparicion !== 'orden' && a.reaparicion !== 'cercaDelGrupo') p.push("reaparicion: tiene que ser 'orden' o 'cercaDelGrupo'");

  /* ── L8, L9 · Avisos y clases ─────────────────────────────────────────── */
  if (lista(r, 'avisos', a.avisos)) {
    if (a.avisos.length !== d.avisos.clases.length) p.push(`avisos: hay ${String(a.avisos.length)} y la liza declara ${String(d.avisos.clases.length)} clases de aviso (una por clase, en su orden)`);
    for (let i = 0; i < a.avisos.length; i++) {
      const o = a.avisos[i];
      if (o !== 'entidad' && o !== 'asiento' && o !== 'ninguno' && o !== 'nudo') p.push(`avisos[${String(i)}]: tiene que ser 'entidad', 'asiento', 'ninguno' o 'nudo'`);
      if (o === 'nudo' && nudos === 0) p.push(`avisos[${String(i)}]: apunta a un nudo, y el mundo no tiene grafo`);
    }
  }
  if (lista(r, 'clases', a.clases)) {
    if (a.clases.length !== d.clases.length) p.push(`clases: hay ${String(a.clases.length)} y la liza declara ${String(d.clases.length)} clases de entidad (una por clase, en su orden)`);
    for (let i = 0; i < a.clases.length; i++) {
      const c = a.clases[i] as { readonly desprevenida: DesprevenidaDeclarada | null };
      if (c.desprevenida !== null) {
        entero(r, `clases[${String(i)}].desprevenida.factor`, c.desprevenida.factor, UNO, TOPE_DE_MULTIPLICADOR);
        cantidad(r, `clases[${String(i)}].desprevenida.puntos`, c.desprevenida.puntos);
      }
    }
  }
}
