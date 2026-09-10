/**
 * «EL BURGO»: el sexto arcade de la Sala, y el primero de solares, rentas y quiebra.
 *
 * De dos a seis personas compran los solares de un burgo medieval, cobran renta a
 * quien cae en ellos, alzan casas y posadas, roban cartas del Pregón y del Arca del
 * Concejo, pasan por la Mazmorra, empeñan, sacan títulos a almoneda, hacen tratos y
 * quiebran. El último que no quiebra se queda con el burgo. Lo gobierna entero el
 * reglamento `REGLAS-EL-BURGO.md`; el contrato de cómo se convierte en código es
 * `docs/burgo/DISENO.md`, y este fichero es ese contrato escrito.
 *
 * ═══ QUÉ HAY AQUÍ Y QUÉ NO ═══
 *
 * Aquí viven las REGLAS ENTERAS: el estado, el reductor con su portillo, el tic que
 * juega por el ausente, la proyección, las opciones, lo secreto, el fin de partida
 * y el tablero declarado de respaldo. Ni un byte del núcleo sellado se toca: los
 * dados son dos `enteroEntre` encadenados, el anillo, la hacienda y el mazo son
 * mecánicas libres de `shared/mecanicas/`, y las cuarenta casillas y las treinta y
 * dos cartas son DATO en `burgo-tablero.ts`, que los dos clientes compilan para que
 * la vista no repita en cada lectura lo que hay pegado a la mesa.
 *
 * Lo que NO hay: nada de `three`, nada de React, nada de nombres de asiento en el
 * estado (entran por la proyección), nada derivado guardado (rentas, patrimonio y
 * barrio entero se calculan), ningún histórico (los `sucesos` son SÓLO los del
 * último cambio), y ningún azar fuera del objeto `azar` sembrado una vez.
 *
 * ═══ LA MÁQUINA DE FASES VIVE EN EL ESTADO, Y `turnoDe` ES A QUIEN SE ESPERA ═══
 *
 * `momento` + `paso` + `luego`, sin reloj: el plazo lo lleva la mesa y aquí sólo se
 * dice qué significa que venza. La mesa reprograma el plazo cuando cambia `turnoDe`
 * en la vista del espectador, así que `turnoDe` apunta SIEMPRE al asiento del que se
 * espera algo —el pujador en la almoneda, el endeudado en el apuro, el del turno en
 * los demás pasos— y `duenoDelTurno` dice de quién es el turno de verdad. Si el
 * pujador no fuera `turnoDe`, un tercero pujando prorrogaría sin límite el plazo del
 * ausente; está medido en Riberas y por eso es la decisión 4 del diseño.
 *
 * ═══ EL PORTILLO, Y POR QUÉ CADA RAMA VUELVE A VALIDAR ═══
 *
 * Todo movimiento de un asiento pasa por `opcionesDelBurgo(vista, quien)`: lo que
 * no está ofrecido se rechaza con motivo redactado desde la vista. Pero la regla es
 * «sólo si», nunca «si y sólo si»: `opciones()` recibe la VISTA (que es pública casi
 * entera) y aun así cada rama revalida con TODO el estado, porque el tic NO pasa por
 * el portillo y porque un trato aceptado puede haber dejado de estar en pie entre que
 * se pintó el botón y se pulsó. Las dos familias que no caben en una lista —la puja
 * libre y el trato— entran como declaraciones (`declaracion: true`) y `cabeEnLaPuerta`
 * exige EXACTAMENTE los campos declarados: sin eso, ocho kilobytes de relleno pegados
 * a un trato se archivaban tal cual en el diario (está medido en Riberas).
 *
 * ═══ EL TIC JUEGA POR EL AUSENTE LO MÍNIMO, Y GASTA AZAR DONDE ÉL LO GASTARÍA ═══
 *
 * Tira y resuelve, no compra (manda a almoneda), en la almoneda pasa, en el apuro
 * liquida en orden determinista y si no llega quiebra, y en `por-pasar` pasa. Se
 * aparta de Riberas —cuyo tic no gasta azar— a sabiendas y por el reglamento §12:
 * el ausente tiene que mover, y mover son dados. Es reproducible porque cada tic va
 * al diario con su contexto y se reejecuta en el mismo sitio. Lo que no puede pasar
 * nunca es que el tic deje la mesa en un estado del que sólo sale un humano: por
 * eso el apuro se liquida entero en un tic y la quiebra al Concejo encola las
 * almonedas y las cierra solas.
 *
 * ═══ LOS SECRETOS: EL AZAR Y LOS DOS MAZOS, Y NADA MÁS ═══
 *
 * El dinero, los títulos, los edificios, la posición y los Indultos en mano son
 * públicos: en la mesa real se ven. Lo secreto es el objeto `azar` entero y el orden
 * de las dos barajas, que viajan como series (`'p07'`, `'a12'`) distinguibles con
 * comillas para que `verify:mesa` las cace. La carta que sale se publica como NÚMERO
 * de la tabla, nunca como serie; ningún id de opción lleva una carta ni el azar; y
 * ningún motivo de rechazo nombra una carta que no haya salido.
 *
 * ═══ EL «NO-OP» ES EL MISMO OBJETO ═══
 *
 * La mesa descarta por `!==`: un movimiento que no cambia nada devuelve EL MISMO
 * objeto de estado, la migración devuelve el mismo objeto si no falta nada y el tic
 * en `reuniendo` y `terminada` devuelve el mismo objeto. Un `{ ...estado }` sin
 * cambios subiría la revisión, engordaría el diario y despertaría a seis móviles.
 *
 * ═══ DECISIONES TOMADAS AQUÍ DONDE EL DISEÑO CALLABA (para quien escriba el comprobador) ═══
 *
 *   · En el tercer intento de la Mazmorra la fianza se paga ANTES de mover (el
 *     reglamento §5 lo dice en ese orden: «paga 50 obligatoriamente y mueve»). Si no
 *     alcanza, se abre el apuro y el jugador sale y mueve igual; un título sin dueño
 *     en el que caiga con el apuro abierto NO abre `comprar` (no caben dos pasos):
 *     va a `colaDeAlmonedas` y sale a almoneda cuando el apuro se cierra.
 *   · Un trato ACEPTADO durante una almoneda puede dejar sin dinero al mejor postor.
 *     Al cerrar, si no alcanza, el título se queda en el Concejo (`ganador: null`) en
 *     vez de abrir un apuro por una puja: es el único cierre que no deja deuda.
 *   · Varios acreedores en un apuro: el que más reclama; empate, el jugador que va
 *     antes en orden de mesa; el Concejo sólo si nadie reclama más que él.
 *   · El tope de vueltas se mira en cada relevo: cuando el MÍNIMO de vueltas de los
 *     vivos alcanza el tope, gana el patrimonio. No se guarda quién empezó.
 *   · `sorteoDeSalida` guarda la ÚLTIMA tirada de cada jugador (una por jugador, en
 *     orden de asiento), también la de los que quedaron fuera en rondas anteriores.
 *   · `tiradasDelTurno` vuelve a 0 en cada relevo: es el sello de los dados de ESTE
 *     turno y sumado a `100 · turnosAbiertos` sigue siendo único.
 *   · Un acreedor que ya quebró cobra el Concejo: la deuda no se pierde, se destruye.
 *   · La quiebra de quien puja en una almoneda abierta (RENDIRSE cabe en cualquier
 *     momento) lo saca de `enPie`; si era el mejor postor, la puja vuelve a cero.
 *   · `encuadre` se importa de `malla-hexagonal.ts` (donde vive) y no de `anillo.ts`.
 *   · Dentro de un trato, los Indultos que se dan son los PRIMEROS de la lista del que
 *     los da; como hay uno por mazo, nadie puede recibir dos del mismo mazo.
 */
import { barajar, enteroEntre, sembrar } from '../../mecanicas/azar';
import type { Azar } from '../../mecanicas/azar';
import { canonico } from '../../mecanicas/canonico';
import { encuadre } from '../../mecanicas/malla-hexagonal';
import type {
  AccionDeTablero,
  CaraDeTablero,
  NudoDeTablero,
  PanelDeTablero,
  PuntoDeTablero,
  TableroDeclarado,
} from '../../mecanicas/tablero-declarado';
import { casillaTras, cruzaLaSalida, distanciaAdelante, masCercana, recorrido } from '../../mecanicas/anillo';
import { transferir } from '../../mecanicas/hacienda';
import type { Saldos } from '../../mecanicas/hacienda';
import { devolverAlFondo, robar, sacar } from '../../mecanicas/mazo';
import { esRechazo, rechazar } from '../motor';
import type { Rechazo } from '../motor';
import type { ContextoMovimiento, Movimiento } from '../movimiento';
import type { Opcion } from '../opciones';
import { esTic } from '../reloj';
import { comoSeLlama, ESPECTADOR, NADIE_SENTADO } from '../tipos';
import type { ArcadeId, AsientoId, LosSentados, ManifiestoDeArcade, QuienMira } from '../tipos';
import {
  BARRIOS,
  CASAS_DEL_CONCEJO,
  CASILLAS,
  CUANTAS_CASILLAS,
  DINERO_DE_SALIDA,
  DOBLES_QUE_ENCIERRAN,
  ESCALONES_DE_PUJA,
  FIANZA,
  INTENTOS_EN_LA_MAZMORRA,
  LA_MAZMORRA,
  MULTIPLO_DE_OFICIO,
  MULTIPLO_DE_OFICIO_POR_CARTA,
  OFICIOS,
  PAGA_DE_LA_PUERTA_MAYOR,
  PARTES_DE_LA_CASA_AL_VENDER,
  PASO_DE_PUJA,
  POSADA,
  POSADAS_DEL_CONCEJO,
  PUERTAS,
  PUJA_MINIMA,
  RENTA_DE_PUERTA,
  TITULOS,
  barrioDe,
  carta,
  cartasDe,
  costeDeDesempeno,
  interesDelEmpeno,
  numeroDeSerie,
  serieDeCarta,
  seriesDe,
  valorDeEmpeno,
} from './burgo-tablero';
import type { BarrioDelBurgo, CasillaDelBurgo, EfectoDeCarta, MazoId } from './burgo-tablero';

// ---------------------------------------------------------------------------
// Identidad, manifiesto y constantes
// ---------------------------------------------------------------------------

export const BURGO: ArcadeId = 'burgo';

/**
 * ═══ POR QUÉ `procedencia: 'dominio-publico'` ═══
 *
 * El Burgo es una creación propia sobre una mecánica de dominio público: la
 * patente del juego del que desciende caducó en 1921, y las reglas de un juego no
 * son objeto de copyright ni de patente. Lo que está protegido es la EXPRESIÓN, y
 * aquí es nuestra entera: el nombre, las cuarenta calles, los textos de las cartas
 * y las piezas. `dominio-publico` es exactamente lo que `shared/arcade/tipos.ts`
 * describe como «reglas de dominio público: charadas, parchís, la oca, el dominó»;
 * `mecanica-generica` está descrita como «piezas atómicas que no son un juego» y no
 * cuadra; `creacion-propia` mentiría sobre las reglas.
 *
 * `mueble: 'tablero'` y nunca `escena`, porque `escena` apaga el escritorio.
 * `secretos: true` porque el azar sembrado y los dos mazos son secretos aunque el
 * dinero sea público. `marcador: 'ninguno'` porque con `tickHz 0` no hay récords.
 * Seis porque son seis los amarres del Muelle y seis los colores de asiento.
 */
export const MANIFIESTO_BURGO: ManifiestoDeArcade = {
  id: BURGO,
  nombre: 'El Burgo',
  gancho: 'Compra solares, cobra rentas, alza casas y posadas; el último que no quiebra se queda con el burgo.',
  icono: 'mando',
  jugadores: { minimo: 2, maximo: 6 },
  sede: 'servidor',
  tickHz: 0,
  mueble: 'tablero',
  secretos: true,
  marcador: { tipo: 'ninguno' },
  procedencia: { tipo: 'dominio-publico' },
};

/* Movimientos: una constante por verbo, un tipo de carga por familia; nunca un `jugar` con la clase dentro. */
export const EMPEZAR = 'burgo:empezar';
export const TIRAR = 'burgo:tirar';
export const PAGAR_FIANZA = 'burgo:pagar-fianza';
export const USAR_INDULTO = 'burgo:usar-indulto';
export const COMPRAR = 'burgo:comprar';
export const A_ALMONEDA = 'burgo:a-almoneda';
export const PUJAR = 'burgo:pujar';
export const PASAR_PUJA = 'burgo:pasar-puja';
export const ALZAR = 'burgo:alzar';
export const VENDER = 'burgo:vender';
export const EMPENAR = 'burgo:empenar';
export const DESEMPENAR = 'burgo:desempenar';
export const PROPONER = 'burgo:proponer';
export const ACEPTAR = 'burgo:aceptar';
export const RECHAZAR = 'burgo:rechazar';
export const RETIRAR = 'burgo:retirar';
export const PASAR = 'burgo:pasar';
export const RENDIRSE = 'burgo:rendirse';

/**
 * Seis colores de asiento PROPIOS, en orden de `ctx.asientos` al EMPEZAR y sin
 * módulo: marfil, azabache, violeta, turquesa, coral, lima. Distintos de las ocho
 * aceras porque los barrios se llaman por su color (pardo, celeste, rosa…) y tres
 * peones de la paleta de Riberas se confundirían con su acera. `verify:mecanicas-burgo`
 * los mide contra cada acera (canal ≥ 60/255, suma ≥ 100) y el Muelle copia esta
 * lista en `tema.ts`, contrastada por `verify:embarcadero` con una regex sobre esta
 * forma EXACTA (`readonly string[] = [`): no la cambies.
 */
export const COLORES_DEL_BURGO: readonly string[] = ['#f2e8cf', '#26262e', '#7d3fd6', '#2fe0d0', '#ff8f6b', '#c5e84a'];

export const TRATOS_ABIERTOS_POR_PROPONENTE = 3;
export const RONDAS_DE_SORTEO = 12;
/** El tope de vueltas más alto que admite EMPEZAR: acota la carga, no el juego. */
export const TOPE_DE_VUELTAS_MAXIMO = 1000;
export const TOPE_DE_SUCESOS = 64;
/** Un trato no puede pedir más que esto: acota la puerta de la declaración. */
export const TOPE_DE_MRS_EN_UN_TRATO = 100000;
/** Cuántos Indultos puede haber en una mano: uno por mazo. */
export const INDULTOS_QUE_EXISTEN = 2;
/** A partir de cuántas casillas un `mueve` por carta se anima como viaje y no como paseo. */
export const PASOS_DE_UN_PASEO = 12;

/** `presa` de un jugador libre. */
export const LIBRE = -1;
/** El índice de «nadie» en `jugadores`. */
const NADIE = -1;

// ---------------------------------------------------------------------------
// El estado: todo entero, todo llano, nada derivado
// ---------------------------------------------------------------------------

export type MomentoDelBurgo = 'reuniendo' | 'jugando' | 'terminada';

/** El subestado del turno. Uno solo: no hay dos relojes en la mesa. */
export type PasoDelTurno =
  | 'por-tirar' // el del turno tiene que tirar (si está presa: elegir cómo salir)
  | 'comprar' // cayó en un título sin dueño: comprar o mandarlo a almoneda
  | 'almoneda' // hay una almoneda abierta; turnoDe = almoneda.pujaDe
  | 'apuro' // alguien debe más de lo que tiene; turnoDe = apuro.quien
  | 'por-pasar'; // ya tiró y resolvió; puede obrar, tratar y pasar (o tirar otra vez si dobles)

/** A qué paso vuelve el turno cuando se cierra comprar/almoneda/apuro. */
export type PasoDeVuelta = 'por-tirar' | 'por-pasar';

/** El par de una tirada. Los dobles son regla: nunca se guarda la suma. */
export type ParDeDados = readonly [number, number];

export interface JugadorDelBurgo {
  readonly asiento: AsientoId;
  /** `COLORES_DEL_BURGO[i]`, i = orden en `ctx.asientos` al EMPEZAR; nunca con módulo. */
  readonly color: string;
  /** 0..39. Se conserva al quebrar; el pintor lo saca por `quebrado`. */
  readonly casilla: number;
  /** Efectivo, entero ≥ 0. */
  readonly mrs: number;
  /** `LIBRE` (−1) libre; 0, 1, 2 = intentos fallidos hechos en la Mazmorra. */
  readonly presa: number;
  /** Públicos: de qué mazo es cada uno (la serie se deduce: hay uno por mazo). */
  readonly indultos: readonly MazoId[];
  readonly quebrado: boolean;
  /** Pasos por la Puerta Mayor (tope de vueltas). */
  readonly vueltas: number;
}

export interface TituloDelBurgo {
  /** 28 entradas en orden de casilla: 22 solares, 4 puertas, 2 oficios. */
  readonly casilla: number;
  /** `null` = el Concejo. */
  readonly dueno: AsientoId | null;
  /** 0..4; `POSADA` (5) = posada. */
  readonly casas: number;
  readonly empenado: boolean;
}

export interface AlmonedaDelBurgo {
  readonly casilla: number;
  /** 0 = sin pujas. */
  readonly puja: number;
  /** El mejor postor. */
  readonly quienPuja: AsientoId | null;
  /** A quién se espera: es `turnoDe` mientras dure. */
  readonly pujaDe: AsientoId;
  /** Quienes NO han pasado, en orden de mesa. */
  readonly enPie: readonly AsientoId[];
  /** De quién es el turno de verdad (`duenoDelTurno`). */
  readonly abiertaPor: AsientoId;
}

export type PorqueDelDinero =
  | 'renta'
  | 'puerta-mayor'
  | 'carta'
  | 'diezmo'
  | 'alcabala'
  | 'fianza'
  | 'compra'
  | 'almoneda'
  | 'casa'
  | 'posada'
  | 'venta'
  | 'empeno'
  | 'desempeno'
  | 'interes'
  | 'trato'
  | 'quiebra'
  | 'reparaciones'
  | 'sorteo';

export interface DeudaDelBurgo {
  readonly a: AsientoId | null;
  readonly cuanto: number;
  readonly porque: PorqueDelDinero;
}

export interface ApuroDelBurgo {
  readonly quien: AsientoId;
  /** Se saldan TODAS de golpe cuando el efectivo alcanza la suma. */
  readonly deudas: readonly DeudaDelBurgo[];
}

export interface LadoDelTrato {
  readonly mrs: number;
  readonly titulos: readonly number[];
  readonly indultos: number;
}

export interface TratoDelBurgo {
  /** Contador público y estable (`siguienteTrato`). */
  readonly id: number;
  readonly de: AsientoId;
  readonly a: AsientoId;
  readonly doy: LadoDelTrato;
  readonly pido: LadoDelTrato;
  /** `turnosAbiertos` al proponer: caduca cuando cambia. */
  readonly enElTurno: number;
}

export interface CartaSalida {
  readonly mazo: MazoId;
  /** 1..16: el NÚMERO, nunca la serie. */
  readonly carta: number;
  readonly quien: AsientoId;
  readonly enElTurno: number;
}

/**
 * LO QUE SE DESTRUYE AL RESOLVER, GUARDADO PARA VERSE.
 *
 * La proyección es pura: si el estado sólo guardara la casilla final, ningún cliente
 * sabría si se pasó la Puerta Mayor o se fue derecho a la Mazmorra. Cada movimiento
 * que cambia el estado SUSTITUYE la lista (no acumula) y sube `jugada`; la escena
 * anima lo que hay entre la `jugada` que vio y la que llega, y el retablo la ignora
 * salvo el aviso. Con más de `TOPE_DE_SUCESOS` se cortan los PRIMEROS y se conserva
 * el final (`quiebra`, `turno`, `fin` van siempre al final).
 */
export type SucesoDelBurgo =
  | { readonly que: 'sale'; readonly quien: AsientoId; readonly dados: ParDeDados; readonly ronda: number }
  | { readonly que: 'empieza'; readonly quien: AsientoId }
  | {
      readonly que: 'tira';
      readonly quien: AsientoId;
      readonly dados: ParDeDados;
      readonly dobles: boolean;
      readonly enLaMazmorra: boolean;
    }
  | {
      readonly que: 'mueve';
      readonly quien: AsientoId;
      readonly desde: number;
      readonly hasta: number;
      readonly recorrido: readonly number[];
      readonly porLaPuertaMayor: boolean;
      readonly como: 'anda' | 'viaja' | 'retrocede';
    }
  | {
      readonly que: 'cobra';
      readonly quien: AsientoId;
      readonly de: AsientoId | null;
      readonly cuanto: number;
      readonly porque: PorqueDelDinero;
      readonly casilla: number;
    }
  | {
      readonly que: 'paga';
      readonly quien: AsientoId;
      readonly a: AsientoId | null;
      readonly cuanto: number;
      readonly porque: PorqueDelDinero;
      readonly casilla: number;
    }
  | { readonly que: 'compra'; readonly quien: AsientoId; readonly casilla: number; readonly cuanto: number }
  /** `casas` tras alzar (5 = posada). */
  | { readonly que: 'alza'; readonly quien: AsientoId; readonly casilla: number; readonly casas: number }
  | { readonly que: 'vende'; readonly quien: AsientoId; readonly casilla: number; readonly casas: number }
  | { readonly que: 'empena'; readonly quien: AsientoId; readonly casilla: number }
  | { readonly que: 'desempena'; readonly quien: AsientoId; readonly casilla: number }
  | { readonly que: 'carta'; readonly quien: AsientoId; readonly mazo: MazoId; readonly carta: number }
  | { readonly que: 'tirada-de-oficio'; readonly quien: AsientoId; readonly dados: ParDeDados }
  | {
      readonly que: 'a-la-mazmorra';
      readonly quien: AsientoId;
      readonly desde: number;
      readonly porque: 'casilla' | 'carta' | 'tres-dobles';
    }
  | {
      readonly que: 'sale-de-la-mazmorra';
      readonly quien: AsientoId;
      readonly como: 'fianza' | 'indulto' | 'dobles' | 'tercer-intento';
    }
  | { readonly que: 'sigue-presa'; readonly quien: AsientoId; readonly intento: number }
  | { readonly que: 'almoneda-abierta'; readonly casilla: number }
  | { readonly que: 'puja'; readonly quien: AsientoId; readonly casilla: number; readonly cuanto: number }
  | { readonly que: 'pasa-puja'; readonly quien: AsientoId; readonly casilla: number }
  | {
      readonly que: 'almoneda-cerrada';
      readonly casilla: number;
      readonly ganador: AsientoId | null;
      readonly cuanto: number;
    }
  | { readonly que: 'apuro'; readonly quien: AsientoId; readonly debe: number }
  | { readonly que: 'quiebra'; readonly quien: AsientoId; readonly acreedor: AsientoId | null }
  | {
      readonly que: 'cambia-de-mano';
      readonly casilla: number;
      readonly de: AsientoId | null;
      readonly a: AsientoId | null;
    }
  | {
      readonly que: 'trato';
      readonly id: number;
      readonly de: AsientoId;
      readonly a: AsientoId;
      readonly fin: 'propuesto' | 'aceptado' | 'rechazado' | 'retirado' | 'caducado';
    }
  | { readonly que: 'turno'; readonly de: AsientoId }
  | {
      readonly que: 'fin';
      readonly ganadores: readonly AsientoId[];
      readonly porque: 'ultimo-en-pie' | 'tope-de-vueltas';
    };

export interface EstadoDelBurgo {
  readonly version: 1;
  readonly momento: MomentoDelBurgo;
  readonly paso: PasoDelTurno;
  /** A qué paso vuelve el turno al cerrar comprar/almoneda/apuro. */
  readonly luego: PasoDeVuelta;
  /** Orden de `ctx.asientos` al EMPEZAR; NO se reordena nunca. */
  readonly jugadores: readonly JugadorDelBurgo[];
  /** Índice en `jugadores`: el dueño del turno aunque `paso` sea apuro/almoneda. */
  readonly turno: number;
  /** Dobles seguidos en este turno, 0..2. */
  readonly dobles: number;
  /** El PAR de la última tirada. */
  readonly tirada: ParDeDados | null;
  /** Sube en cada TIRAR: sello de los dados. Vuelve a 0 en el relevo. */
  readonly tiradasDelTurno: number;
  /** Relevos de turno: caduca tratos. */
  readonly turnosAbiertos: number;
  /** 28. */
  readonly titulos: readonly TituloDelBurgo[];
  readonly casasEnElConcejo: number;
  readonly posadasEnElConcejo: number;
  /** Series 'p01'..'p16' barajadas UNA vez; SECRETO. */
  readonly pregon: readonly string[];
  /** 'a01'..'a16'; SECRETO. */
  readonly arca: readonly string[];
  readonly ultimaCarta: CartaSalida | null;
  readonly almoneda: AlmonedaDelBurgo | null;
  /** La quiebra al Concejo (y un título sin dueño pisado con apuro abierto) encola títulos, en orden de casilla. */
  readonly colaDeAlmonedas: readonly number[];
  readonly apuro: ApuroDelBurgo | null;
  /** «Cada jugador te paga 10» puede endeudar a varios. */
  readonly colaDeApuros: readonly ApuroDelBurgo[];
  readonly tratos: readonly TratoDelBurgo[];
  readonly siguienteTrato: number;
  /** 0 = sin tope (regla de mesa). */
  readonly topeDeVueltas: number;
  /** La ÚLTIMA tirada del sorteo de cada jugador, una por jugador en orden de asiento (para animar). */
  readonly sorteoDeSalida: readonly ParDeDados[];
  /** Sube en cada estado nuevo; sello de `sucesos`. */
  readonly jugada: number;
  /** SÓLO los del último cambio (≤ TOPE_DE_SUCESOS). Nunca un histórico. */
  readonly sucesos: readonly SucesoDelBurgo[];
  /** SECRETO. */
  readonly azar: Azar;
  readonly ganadores: readonly AsientoId[];
}

/** Lo que acumula un movimiento mientras trabaja: los sucesos de ESTE cambio. */
type Cronica = SucesoDelBurgo[];

/** Una mesa recién abierta: `reuniendo`, sin jugadores, con el azar en la semilla cero hasta EMPEZAR. */
export function partidaNueva(): EstadoDelBurgo {
  return {
    version: 1,
    momento: 'reuniendo',
    paso: 'por-tirar',
    luego: 'por-pasar',
    jugadores: [],
    turno: 0,
    dobles: 0,
    tirada: null,
    tiradasDelTurno: 0,
    turnosAbiertos: 0,
    titulos: [],
    casasEnElConcejo: CASAS_DEL_CONCEJO,
    posadasEnElConcejo: POSADAS_DEL_CONCEJO,
    pregon: [],
    arca: [],
    ultimaCarta: null,
    almoneda: null,
    colaDeAlmonedas: [],
    apuro: null,
    colaDeApuros: [],
    tratos: [],
    siguienteTrato: 1,
    topeDeVueltas: 0,
    sorteoDeSalida: [],
    jugada: 0,
    sucesos: [],
    azar: sembrar(0),
    ganadores: [],
  };
}

/**
 * MIGRACIÓN DE MESAS GUARDADAS EN DISCO. Existe desde el primer commit.
 *
 * Los estados guardados sobreviven a los despliegues: un campo nuevo sin migración
 * reventó en Riberas diecisiete vistas de diecisiete con «Cannot read properties of
 * undefined». Devuelve EL MISMO objeto si `version === 1` y no falta nada, porque la
 * mesa compara por identidad; si falta algo, rellena con lo de `partidaNueva()` y
 * conserva todo lo que hubiera.
 */
export function comoSiSiempreHubieraHabidoBurgo(e: EstadoDelBurgo): EstadoDelBurgo {
  if (typeof e !== 'object' || e === null) return partidaNueva();
  const molde = partidaNueva();
  const crudo = e as unknown as Record<string, unknown>;
  let faltaAlgo = crudo.version !== 1;
  for (const llave of Object.keys(molde)) {
    if (crudo[llave] === undefined) {
      faltaAlgo = true;
      break;
    }
  }
  if (!faltaAlgo) return e;
  const relleno: Record<string, unknown> = {};
  for (const llave of Object.keys(molde)) {
    const suyo = crudo[llave];
    relleno[llave] = suyo === undefined ? (molde as unknown as Record<string, unknown>)[llave] : suyo;
  }
  relleno.version = 1;
  return relleno as unknown as EstadoDelBurgo;
}

// ---------------------------------------------------------------------------
// Ayudantes de estado: leer y copiar sin mutar
// ---------------------------------------------------------------------------

/** Con los sucesos de ESTE cambio y la jugada subida. La única forma de cerrar un movimiento que cambió algo. */
function conSucesos(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  const desde = cronica.length > TOPE_DE_SUCESOS ? cronica.length - TOPE_DE_SUCESOS : 0;
  const sucesos: SucesoDelBurgo[] = [];
  for (let i = desde; i < cronica.length; i++) sucesos.push(cronica[i] as SucesoDelBurgo);
  return { ...e, jugada: e.jugada + 1, sucesos };
}

function jugadorEn(e: EstadoDelBurgo, i: number): JugadorDelBurgo | null {
  const j = e.jugadores[i];
  return j === undefined ? null : j;
}

function asientoDe(e: EstadoDelBurgo, i: number): AsientoId | null {
  const j = jugadorEn(e, i);
  return j === null ? null : j.asiento;
}

function conJugador(e: EstadoDelBurgo, i: number, cambios: Partial<JugadorDelBurgo>): EstadoDelBurgo {
  const jugadores: JugadorDelBurgo[] = [];
  for (let k = 0; k < e.jugadores.length; k++) {
    const j = e.jugadores[k] as JugadorDelBurgo;
    jugadores.push(k === i ? { ...j, ...cambios } : j);
  }
  return { ...e, jugadores };
}

function indiceDelJugador(e: EstadoDelBurgo, quien: AsientoId | null): number {
  if (quien === null) return NADIE;
  for (let i = 0; i < e.jugadores.length; i++) {
    if ((e.jugadores[i] as JugadorDelBurgo).asiento === quien) return i;
  }
  return NADIE;
}

function estaVivo(e: EstadoDelBurgo, i: number): boolean {
  const j = jugadorEn(e, i);
  return j !== null && !j.quebrado;
}

function vivos(e: EstadoDelBurgo): number[] {
  const salida: number[] = [];
  for (let i = 0; i < e.jugadores.length; i++) if (estaVivo(e, i)) salida.push(i);
  return salida;
}

/** El siguiente vivo DESPUÉS de `desde`, en orden de mesa y dando la vuelta. `desde` mismo si es el único; `NADIE` si no queda ninguno. */
function siguienteVivo(e: EstadoDelBurgo, desde: number): number {
  const n = e.jugadores.length;
  if (n === 0) return NADIE;
  for (let paso = 1; paso <= n; paso++) {
    const k = (desde + paso) % n;
    if (estaVivo(e, k)) return k;
  }
  return NADIE;
}

/** Lo que comparten el estado y la vista: los 28 títulos. Las guardas públicas se escriben sobre esto. */
interface ConTitulos {
  readonly titulos: readonly TituloDelBurgo[];
}

function tituloDe(m: ConTitulos, casilla: number): TituloDelBurgo | null {
  for (const t of m.titulos) if (t.casilla === casilla) return t;
  return null;
}

function conTitulo(e: EstadoDelBurgo, casilla: number, cambios: Partial<TituloDelBurgo>): EstadoDelBurgo {
  const titulos: TituloDelBurgo[] = [];
  for (const t of e.titulos) titulos.push(t.casilla === casilla ? { ...t, ...cambios } : t);
  return { ...e, titulos };
}

function filaDe(casilla: number): CasillaDelBurgo | null {
  const fila = CASILLAS[casilla];
  return fila === undefined ? null : fila;
}

function esTitulo(casilla: number): boolean {
  return TITULOS.indexOf(casilla) >= 0;
}

/** Las casillas que tiene `asiento`, en orden de casilla. */
function titulosDe(e: EstadoDelBurgo, asiento: AsientoId): number[] {
  const salida: number[] = [];
  for (const t of e.titulos) if (t.dueno === asiento) salida.push(t.casilla);
  return salida;
}

/** ¿`asiento` tiene todos los solares del barrio? Los empeñados cuentan como suyos. */
function barrioEntero(m: ConTitulos, asiento: AsientoId | null, barrio: BarrioDelBurgo | null): boolean {
  if (asiento === null || barrio === null) return false;
  for (const c of barrio.solares) {
    const t = tituloDe(m, c);
    if (t === null || t.dueno !== asiento) return false;
  }
  return true;
}

/** ¿Hay algún edificio en el barrio? Empeñar y tratar exigen que no. */
function barrioConEdificios(m: ConTitulos, barrio: BarrioDelBurgo | null): boolean {
  if (barrio === null) return false;
  for (const c of barrio.solares) {
    const t = tituloDe(m, c);
    if (t !== null && t.casas > 0) return true;
  }
  return false;
}

/** Cuántas casillas de `entre` tiene `asiento`, EMPEÑADAS INCLUIDAS (reglamento §7). */
function cuantasTiene(m: ConTitulos, asiento: AsientoId | null, entre: readonly number[]): number {
  if (asiento === null) return 0;
  let n = 0;
  for (const c of entre) {
    const t = tituloDe(m, c);
    if (t !== null && t.dueno === asiento) n++;
  }
  return n;
}

/** Casas y posadas de un jugador, para las reparaciones. */
function edificiosDe(e: EstadoDelBurgo, asiento: AsientoId): { casas: number; posadas: number } {
  let casas = 0;
  let posadas = 0;
  for (const t of e.titulos) {
    if (t.dueno !== asiento) continue;
    if (t.casas === POSADA) posadas++;
    else casas += t.casas;
  }
  return { casas, posadas };
}

/** Efectivo + precio de lo no empeñado + mitad de lo empeñado + coste de cada edificio (posada = 5). */
function patrimonioDe(e: EstadoDelBurgo, j: JugadorDelBurgo): number {
  let total = j.mrs;
  for (const t of e.titulos) {
    if (t.dueno !== j.asiento) continue;
    const fila = filaDe(t.casilla);
    if (fila === null) continue;
    total += t.empenado ? valorDeEmpeno(fila.precio) : fila.precio;
    total += fila.casa * t.casas;
  }
  return total;
}

/** El asiento de quien tiene el turno de verdad; `null` fuera de `jugando`. */
function duenoDelTurno(e: EstadoDelBurgo): AsientoId | null {
  if (e.momento !== 'jugando') return null;
  return asientoDe(e, e.turno);
}

/** A quién se ESPERA: el pujador, el endeudado o el del turno. Es `turnoDe` en la vista. */
function aQuienSeEspera(e: EstadoDelBurgo): AsientoId | null {
  if (e.momento !== 'jugando') return null;
  if (e.paso === 'almoneda' && e.almoneda !== null) return e.almoneda.pujaDe;
  if (e.paso === 'apuro' && e.apuro !== null) return e.apuro.quien;
  return duenoDelTurno(e);
}

function sumaDeDeudasDel(apuro: ApuroDelBurgo): number {
  let total = 0;
  for (const d of apuro.deudas) total += d.cuanto;
  return total;
}

/** Los tres pasos en los que el dueño del turno puede obrar (alzar, empeñar, desempeñar, comprar…). */
function pasoDeObrar(paso: PasoDelTurno): boolean {
  return paso === 'por-tirar' || paso === 'por-pasar' || paso === 'comprar';
}

// ---------------------------------------------------------------------------
// El dinero: una sola puerta, todo o nada, y el apuro cuando no alcanza
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ TODO PAGO PASA POR `transferirEntre` ═══
 *
 * Un juego de solares mueve dinero en treinta sitios y el fallo de dinero no se
 * cae: se juega mal. Aquí hay UNA función que paga, apoyada en `hacienda.transferir`
 * (todo o nada, en enteros, con el Concejo como caja infinita), y es la única que
 * escribe `mrs`. Si quien paga no alcanza, no se mueve NADA y se abre —o se
 * engorda— su apuro: el reglamento §9 dice que quien no alcanza vende y empeña, no
 * que paga lo que puede. Un acreedor que ya quebró cobra el Concejo: la deuda no se
 * pierde, se destruye, que es lo que la banca hace con el dinero de un muerto.
 */

function saldosDe(e: EstadoDelBurgo): Saldos {
  const s: Record<string, number> = {};
  for (const j of e.jugadores) s[j.asiento] = j.mrs;
  return s;
}

function conSaldos(e: EstadoDelBurgo, saldos: Saldos): EstadoDelBurgo {
  const jugadores: JugadorDelBurgo[] = [];
  for (const j of e.jugadores) {
    const nuevo = saldos[j.asiento];
    jugadores.push(typeof nuevo === 'number' && nuevo !== j.mrs ? { ...j, mrs: nuevo } : j);
  }
  return { ...e, jugadores };
}

/**
 * Abre el apuro de `quien` con una deuda más, o lo engorda si ya lo tiene, o lo
 * encola si el apuro vigente es de otro. `paso` pasa a `'apuro'` sólo cuando el
 * apuro que se abre es el vigente: los de la cola esperan su turno.
 */
function apurar(e: EstadoDelBurgo, quien: number, deuda: DeudaDelBurgo, cronica: Cronica): EstadoDelBurgo {
  const asiento = asientoDe(e, quien);
  if (asiento === null) return e;
  if (e.apuro === null) {
    const apuro: ApuroDelBurgo = { quien: asiento, deudas: [deuda] };
    cronica.push({ que: 'apuro', quien: asiento, debe: sumaDeDeudasDel(apuro) });
    /*
     * El apuro INTERRUMPE el paso que hubiera: se guarda en `luego` para volver a él
     * al saldar. Un `comprar` no cabe en `luego` (no se puede reanudar una compra con
     * el dinero cambiado), así que el título sin dueño del dueño del turno pasa a la
     * cola de almonedas y sale a almoneda cuando el apuro se cierre.
     */
    let luego: PasoDeVuelta = e.luego;
    let colaDeAlmonedas = e.colaDeAlmonedas;
    if (e.paso === 'por-tirar' || e.paso === 'por-pasar') luego = e.paso;
    else if (e.paso === 'comprar') {
      const delTurno = jugadorEn(e, e.turno);
      const t = delTurno === null ? null : tituloDe(e, delTurno.casilla);
      if (delTurno !== null && t !== null && t.dueno === null && colaDeAlmonedas.indexOf(delTurno.casilla) < 0) {
        colaDeAlmonedas = [...colaDeAlmonedas, delTurno.casilla];
      }
    }
    return { ...e, apuro, paso: 'apuro', luego, colaDeAlmonedas };
  }
  if (e.apuro.quien === asiento) {
    const apuro: ApuroDelBurgo = { quien: asiento, deudas: [...e.apuro.deudas, deuda] };
    cronica.push({ que: 'apuro', quien: asiento, debe: sumaDeDeudasDel(apuro) });
    return { ...e, apuro };
  }
  const cola: ApuroDelBurgo[] = [];
  let puesto = false;
  for (const a of e.colaDeApuros) {
    if (a.quien === asiento) {
      cola.push({ quien: asiento, deudas: [...a.deudas, deuda] });
      puesto = true;
    } else {
      cola.push(a);
    }
  }
  if (!puesto) cola.push({ quien: asiento, deudas: [deuda] });
  const suyo = cola.find((a) => a.quien === asiento) as ApuroDelBurgo;
  cronica.push({ que: 'apuro', quien: asiento, debe: sumaDeDeudasDel(suyo) });
  return { ...e, colaDeApuros: cola };
}

/**
 * Transfiere `cuanto` de `de` a `a` (índices en `jugadores`; `null` = el Concejo).
 * Si `de` no alcanza, abre su apuro y no mueve nada. Sucesos `paga` y `cobra`.
 */
function transferirEntre(
  e: EstadoDelBurgo,
  de: number | null,
  a: number | null,
  cuanto: number,
  porque: PorqueDelDinero,
  casilla: number,
  cronica: Cronica,
): EstadoDelBurgo {
  const importe = Math.trunc(cuanto);
  if (!(importe > 0)) return e;
  const deAsiento = de === null ? null : asientoDe(e, de);
  /* Un acreedor quebrado ya no está en la mesa: cobra el Concejo. */
  const aAsiento = a === null || !estaVivo(e, a) ? null : asientoDe(e, a);
  if (de !== null && deAsiento === null) return e;
  const t = transferir(saldosDe(e), deAsiento, aAsiento, importe);
  if (t.deuda > 0 && de !== null) {
    return apurar(e, de, { a: aAsiento, cuanto: importe, porque }, cronica);
  }
  const s = conSaldos(e, t.saldos);
  if (deAsiento !== null) cronica.push({ que: 'paga', quien: deAsiento, a: aAsiento, cuanto: importe, porque, casilla });
  if (aAsiento !== null) cronica.push({ que: 'cobra', quien: aAsiento, de: deAsiento, cuanto: importe, porque, casilla });
  return s;
}

/**
 * SALDA el apuro vigente si el efectivo ya alcanza la suma de sus deudas: las paga
 * todas de golpe, lo cierra y reanuda la mesa. Si no alcanza, EL MISMO objeto.
 */
function saldar(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  if (e.apuro === null) return e;
  const quien = indiceDelJugador(e, e.apuro.quien);
  const j = jugadorEn(e, quien);
  if (j === null) return reanudar({ ...e, apuro: null }, cronica);
  const suma = sumaDeDeudasDel(e.apuro);
  if (j.mrs < suma) return e;
  let s: EstadoDelBurgo = { ...e, apuro: null };
  for (const d of e.apuro.deudas) {
    const acreedor = d.a === null ? null : indiceDelJugador(s, d.a);
    s = transferirEntre(s, quien, acreedor === NADIE ? null : acreedor, d.cuanto, d.porque, j.casilla, cronica);
  }
  return reanudar(s, cronica);
}

/**
 * QUÉ PASO TOCA AHORA, después de cerrar un apuro, una almoneda o una quiebra.
 *
 * Es la única función que decide el paso cuando algo se cierra, para que el orden
 * de precedencia esté escrito una vez: primero un apuro vigente, luego los apuros en
 * cola, luego una almoneda abierta, luego las almonedas en cola, luego el relevo si
 * el dueño del turno ya quebró, y si no, `luego`.
 */
function reanudar(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  if (e.momento !== 'jugando') return e;
  if (e.apuro !== null) return e.paso === 'apuro' ? e : { ...e, paso: 'apuro' };
  const primero = e.colaDeApuros[0];
  if (primero !== undefined) {
    const cola: ApuroDelBurgo[] = [];
    for (let i = 1; i < e.colaDeApuros.length; i++) cola.push(e.colaDeApuros[i] as ApuroDelBurgo);
    if (indiceDelJugador(e, primero.quien) !== NADIE && estaVivo(e, indiceDelJugador(e, primero.quien))) {
      cronica.push({ que: 'apuro', quien: primero.quien, debe: sumaDeDeudasDel(primero) });
      /* Puede que ya le alcance: saldar lo cierra en el acto y vuelve aquí. */
      return saldar({ ...e, apuro: primero, colaDeApuros: cola, paso: 'apuro' }, cronica);
    }
    return reanudar({ ...e, colaDeApuros: cola }, cronica);
  }
  if (e.almoneda !== null) return e.paso === 'almoneda' ? e : { ...e, paso: 'almoneda' };
  const casilla = e.colaDeAlmonedas[0];
  if (casilla !== undefined) {
    const cola: number[] = [];
    for (let i = 1; i < e.colaDeAlmonedas.length; i++) cola.push(e.colaDeAlmonedas[i] as number);
    return abrirAlmoneda({ ...e, colaDeAlmonedas: cola }, casilla, cronica);
  }
  if (!estaVivo(e, e.turno)) return relevo(e, cronica);
  /* Sólo los pasos que interrumpen vuelven a `luego`; un paso normal (tirar, pasar, comprar) se queda como está. */
  if (e.paso === 'apuro' || e.paso === 'almoneda') return { ...e, paso: e.luego };
  return e;
}

// ---------------------------------------------------------------------------
// Mover, la Mazmorra, las rentas, las cartas y resolver la casilla
// ---------------------------------------------------------------------------

/**
 * Mueve la figura de `i` hasta `hasta`, en sentido de la marcha (o hacia atrás si
 * `como === 'retrocede'`). Cobra la Puerta Mayor al pasar o caer si `cobraAlPasar`,
 * y sube `vueltas`. Ir a la Mazmorra NUNCA pasa por aquí: ver `aLaMazmorra`.
 */
function mover(
  e: EstadoDelBurgo,
  i: number,
  hasta: number,
  cobraAlPasar: boolean,
  como: 'anda' | 'viaja' | 'retrocede',
  cronica: Cronica,
): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null) return e;
  const desde = j.casilla;
  const pasos =
    como === 'retrocede'
      ? -distanciaAdelante(hasta, desde, CUANTAS_CASILLAS)
      : distanciaAdelante(desde, hasta, CUANTAS_CASILLAS);
  if (pasos === 0) return e;
  const pisadas = recorrido(desde, pasos, CUANTAS_CASILLAS);
  const cruza = cruzaLaSalida(desde, pasos, CUANTAS_CASILLAS);
  let s = conJugador(e, i, { casilla: hasta, vueltas: j.vueltas + (cruza ? 1 : 0) });
  cronica.push({
    que: 'mueve',
    quien: j.asiento,
    desde,
    hasta,
    recorrido: pisadas,
    porLaPuertaMayor: cruza && cobraAlPasar,
    como,
  });
  if (cruza && cobraAlPasar) s = transferirEntre(s, null, i, PAGA_DE_LA_PUERTA_MAYOR, 'puerta-mayor', hasta, cronica);
  return s;
}

/** Los dados: `pasos` casillas hacia delante, cobrando la Puerta Mayor. */
function andar(e: EstadoDelBurgo, i: number, pasos: number, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null) return e;
  return mover(e, i, casillaTras(j.casilla, pasos, CUANTAS_CASILLAS), true, 'anda', cronica);
}

/** Una carta que manda a una casilla: paseo si está cerca, viaje si no. */
function viajar(e: EstadoDelBurgo, i: number, hasta: number, cobraAlPasar: boolean, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null) return e;
  const como = distanciaAdelante(j.casilla, hasta, CUANTAS_CASILLAS) > PASOS_DE_UN_PASEO ? 'viaja' : 'anda';
  return mover(e, i, hasta, cobraAlPasar, como, cronica);
}

/**
 * A la Mazmorra, derecho: sin pasar por la Puerta Mayor, sin cobrar, sin resolver.
 * Termina el turno (`por-pasar`, `dobles 0`), salvo que haya un apuro abierto, que
 * manda sobre cualquier paso.
 */
function aLaMazmorra(
  e: EstadoDelBurgo,
  i: number,
  porque: 'casilla' | 'carta' | 'tres-dobles',
  cronica: Cronica,
): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null) return e;
  cronica.push({ que: 'a-la-mazmorra', quien: j.asiento, desde: j.casilla, porque });
  const s = conJugador(e, i, { casilla: LA_MAZMORRA, presa: 0 });
  return { ...s, dobles: 0, luego: 'por-pasar', paso: s.apuro !== null ? 'apuro' : 'por-pasar' };
}

/** Cómo se cobra una casilla: como siempre, el doble (carta de puerta) o diez veces una tirada nueva (carta de oficio). */
type ModoDeRenta = 'normal' | 'doble' | 'x10';

/**
 * LA RENTA DE UN TÍTULO con la tirada dada. Empeñado → 0. Solar sin casas: el doble
 * si el barrio es entero (aunque otro solar del barrio esté empeñado: regla oficial).
 * Puertas y oficios cuentan las EMPEÑADAS del dueño; sólo la casilla empeñada no cobra.
 */
function rentaDe(e: EstadoDelBurgo, t: TituloDelBurgo, tirada: ParDeDados | null, modo: ModoDeRenta): number {
  if (t.empenado || t.dueno === null) return 0;
  const fila = filaDe(t.casilla);
  if (fila === null) return 0;
  if (fila.clase === 'solar') {
    if (t.casas === 0) return barrioEntero(e, t.dueno, barrioDe(t.casilla)) ? 2 * fila.rentas[0] : fila.rentas[0];
    const cuantas = t.casas > POSADA ? POSADA : t.casas;
    const renta = fila.rentas[cuantas];
    return typeof renta === 'number' ? renta : 0;
  }
  if (fila.clase === 'puerta') {
    const n = cuantasTiene(e, t.dueno, PUERTAS);
    const base = RENTA_DE_PUERTA[n];
    return (typeof base === 'number' ? base : 0) * (modo === 'doble' ? 2 : 1);
  }
  if (fila.clase === 'oficio') {
    const n = cuantasTiene(e, t.dueno, OFICIOS);
    const porTabla = MULTIPLO_DE_OFICIO[n];
    const multiplo = modo === 'x10' ? MULTIPLO_DE_OFICIO_POR_CARTA : typeof porTabla === 'number' ? porTabla : 0;
    const suma = tirada === null ? 0 : tirada[0] + tirada[1];
    return multiplo * suma;
  }
  return 0;
}

/** Dos dados, encadenando el azar: nunca el mismo azar dos veces. */
function tirarDosDados(azar: Azar): { azar: Azar; par: ParDeDados } {
  const d1 = enteroEntre(azar, 1, 6);
  const d2 = enteroEntre(d1.azar, 1, 6);
  return { azar: d2.azar, par: [d1.valor, d2.valor] };
}

/**
 * ROBA LA CARTA DE ARRIBA de un mazo, la publica por su NÚMERO y la cumple.
 *
 * El mazo rota (la carta va al fondo con la misma serie: reproducible y el
 * reglamento §4 lo dice así), salvo el Indulto, que SALE del mazo y se queda en la
 * mano como cuenta pública. La serie no sale de aquí: lo que va a la crónica y a
 * `ultimaCarta` es el número de la tabla.
 */
function robarCarta(e: EstadoDelBurgo, i: number, mazo: MazoId, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null) return e;
  const lista = mazo === 'pregon' ? e.pregon : e.arca;
  const robo = robar(lista);
  if (robo.serie === '') return e;
  const numero = numeroDeSerie(robo.serie);
  const ficha = carta(mazo, numero);
  if (ficha === null) return mazo === 'pregon' ? { ...e, pregon: robo.mazo } : { ...e, arca: robo.mazo };
  cronica.push({ que: 'carta', quien: j.asiento, mazo, carta: numero });
  let s: EstadoDelBurgo = { ...e, ultimaCarta: { mazo, carta: numero, quien: j.asiento, enElTurno: e.turnosAbiertos } };
  const efecto = ficha.efecto;
  if (efecto.que === 'indulto') {
    const sinElla = sacar(lista, robo.serie);
    s = mazo === 'pregon' ? { ...s, pregon: sinElla } : { ...s, arca: sinElla };
    return conJugador(s, i, { indultos: [...j.indultos, mazo] });
  }
  s = mazo === 'pregon' ? { ...s, pregon: robo.mazo } : { ...s, arca: robo.mazo };
  return cumplirLaCarta(s, i, efecto, cronica);
}

/** Los diez efectos de carta, uno por rama. Ninguna carta cae en un Pregón ni un Arca, así que la recursión es finita. */
function cumplirLaCarta(
  e: EstadoDelBurgo,
  i: number,
  efecto: EfectoDeCarta,
  cronica: Cronica,
): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null) return e;
  switch (efecto.que) {
    case 'ir': {
      const s = viajar(e, i, efecto.a, efecto.cobraAlPasar, cronica);
      return resolverCasilla(s, i, 'normal', cronica);
    }
    case 'puerta-cercana': {
      const s = viajar(e, i, masCercana(j.casilla, PUERTAS, CUANTAS_CASILLAS), true, cronica);
      return resolverCasilla(s, i, 'doble', cronica);
    }
    case 'oficio-cercano': {
      const s = viajar(e, i, masCercana(j.casilla, OFICIOS, CUANTAS_CASILLAS), true, cronica);
      return resolverCasilla(s, i, 'x10', cronica);
    }
    case 'cobra':
      return transferirEntre(e, null, i, efecto.cuanto, 'carta', j.casilla, cronica);
    case 'paga':
      return transferirEntre(e, i, null, efecto.cuanto, 'carta', j.casilla, cronica);
    case 'retrocede': {
      const hasta = casillaTras(j.casilla, -efecto.casillas, CUANTAS_CASILLAS);
      const s = mover(e, i, hasta, false, 'retrocede', cronica);
      return resolverCasilla(s, i, 'normal', cronica);
    }
    case 'a-la-mazmorra':
      return aLaMazmorra(e, i, 'carta', cronica);
    case 'reparaciones': {
      const { casas, posadas } = edificiosDe(e, j.asiento);
      return transferirEntre(e, i, null, efecto.porCasa * casas + efecto.porPosada * posadas, 'reparaciones', j.casilla, cronica);
    }
    case 'paga-a-cada-uno': {
      let s = e;
      for (const k of vivos(e)) {
        if (k === i) continue;
        s = transferirEntre(s, i, k, efecto.cuanto, 'carta', j.casilla, cronica);
      }
      return s;
    }
    case 'cobra-de-cada-uno': {
      let s = e;
      for (const k of vivos(e)) {
        if (k === i) continue;
        s = transferirEntre(s, k, i, efecto.cuanto, 'carta', j.casilla, cronica);
      }
      return s;
    }
    case 'indulto':
      return e;
    default:
      return e;
  }
}

/**
 * RESOLVER LA CASILLA donde acaba de caer `i`, por su clase. Diez clases, un efecto
 * cada una. Un título sin dueño abre `comprar`, salvo que haya un apuro abierto —no
 * caben dos pasos—, y entonces va a la cola de almonedas. El dueño presa cobra igual;
 * el Concejo cobra la renta solo (reglamento §12).
 */
function resolverCasilla(e: EstadoDelBurgo, i: number, modo: ModoDeRenta, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null || e.momento !== 'jugando') return e;
  const fila = filaDe(j.casilla);
  if (fila === null) return e;
  switch (fila.clase) {
    case 'solar':
    case 'puerta':
    case 'oficio': {
      const t = tituloDe(e, j.casilla);
      if (t === null) return e;
      if (t.dueno === null) {
        if (e.apuro !== null || e.paso === 'apuro') {
          if (e.colaDeAlmonedas.indexOf(j.casilla) >= 0) return e;
          return { ...e, colaDeAlmonedas: [...e.colaDeAlmonedas, j.casilla] };
        }
        return { ...e, paso: 'comprar' };
      }
      if (t.dueno === j.asiento || t.empenado) return e;
      const dueno = indiceDelJugador(e, t.dueno);
      if (dueno === NADIE || !estaVivo(e, dueno)) return e;
      let s = e;
      let tirada = e.tirada;
      if (modo === 'x10' && fila.clase === 'oficio') {
        const nueva = tirarDosDados(e.azar);
        cronica.push({ que: 'tirada-de-oficio', quien: j.asiento, dados: nueva.par });
        s = { ...e, azar: nueva.azar };
        tirada = nueva.par;
      }
      return transferirEntre(s, i, dueno, rentaDe(s, t, tirada, modo), 'renta', j.casilla, cronica);
    }
    case 'diezmo':
      return transferirEntre(e, i, null, fila.precio, 'diezmo', j.casilla, cronica);
    case 'alcabala':
      return transferirEntre(e, i, null, fila.precio, 'alcabala', j.casilla, cronica);
    case 'pregon':
      return robarCarta(e, i, 'pregon', cronica);
    case 'arca':
      return robarCarta(e, i, 'arca', cronica);
    case 'a-la-mazmorra':
      return aLaMazmorra(e, i, 'casilla', cronica);
    case 'salida':
    case 'feria':
    case 'mazmorra':
      return e;
    default:
      return e;
  }
}

// ---------------------------------------------------------------------------
// La almoneda: una fase con relevo por asiento, un solo plazo por mesa
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ HAY RELEVO Y NO «TODOS A LA VEZ» ═══
 *
 * Porque la mesa tiene UN plazo, y `turnoDe` es lo único que lo reprograma. Con
 * pujas simultáneas habría que elegir a quién esperar, y el que no está bloquearía
 * la almoneda para siempre. Con relevo, `pujaDe` rota entre los que siguen en pie,
 * el tic pasa por el ausente, y la almoneda se cierra sola cuando queda uno en pie
 * y es el mejor postor, o cuando todos han pasado sin pujar.
 */

/** Abre la almoneda de `casilla`: en pie todos los vivos desde el siguiente al dueño del turno, que va el último. */
function abrirAlmoneda(e: EstadoDelBurgo, casilla: number, cronica: Cronica): EstadoDelBurgo {
  const n = e.jugadores.length;
  const enPie: AsientoId[] = [];
  for (let paso = 1; paso <= n; paso++) {
    const k = (e.turno + paso) % n;
    if (estaVivo(e, k)) enPie.push((e.jugadores[k] as JugadorDelBurgo).asiento);
  }
  const primero = enPie[0];
  if (primero === undefined) return e;
  const abiertaPor = asientoDe(e, e.turno);
  cronica.push({ que: 'almoneda-abierta', casilla });
  const luego: PasoDeVuelta = e.paso === 'por-tirar' || e.paso === 'por-pasar' ? e.paso : e.luego;
  return {
    ...e,
    almoneda: { casilla, puja: 0, quienPuja: null, pujaDe: primero, enPie, abiertaPor: abiertaPor === null ? primero : abiertaPor },
    paso: 'almoneda',
    luego,
  };
}

/** La puja más baja que se admite ahora: `PUJA_MINIMA` sin pujas, la última más el paso después. */
function pujaMinimaDe(a: AlmonedaDelBurgo): number {
  return a.puja === 0 ? PUJA_MINIMA : a.puja + PASO_DE_PUJA;
}

/** El siguiente en pie después de `tras`, dando la vuelta; el primero si `tras` ya no está. */
function siguienteEnPie(enPie: readonly AsientoId[], tras: AsientoId): AsientoId | null {
  if (enPie.length === 0) return null;
  const donde = enPie.indexOf(tras);
  if (donde < 0) return enPie[0] as AsientoId;
  return enPie[(donde + 1) % enPie.length] as AsientoId;
}

/** Cierra la almoneda si ya no hay a quién esperar: nadie en pie, o uno solo y es el mejor postor. */
function cerrarSiToca(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  const a = e.almoneda;
  if (a === null) return e;
  if (a.enPie.length === 0 || (a.enPie.length === 1 && a.enPie[0] === a.quienPuja)) return cerrarAlmoneda(e, cronica);
  return e;
}

/**
 * CIERRA LA ALMONEDA: el mejor postor paga y se lleva el título; sin pujas, queda
 * en el Concejo. Si el postor ya no alcanza (un trato aceptado entre medias), el
 * título se queda en el Concejo: es el único cierre que no deja deuda. Después,
 * `reanudar` abre la siguiente de la cola o devuelve el turno a `luego`.
 */
function cerrarAlmoneda(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  const a = e.almoneda;
  if (a === null) return e;
  let s: EstadoDelBurgo = { ...e, almoneda: null };
  let ganador: AsientoId | null = null;
  let cuanto = 0;
  if (a.quienPuja !== null && a.puja > 0) {
    const k = indiceDelJugador(s, a.quienPuja);
    const j = jugadorEn(s, k);
    if (j !== null && !j.quebrado && j.mrs >= a.puja) {
      s = transferirEntre(s, k, null, a.puja, 'almoneda', a.casilla, cronica);
      s = conTitulo(s, a.casilla, { dueno: j.asiento });
      cronica.push({ que: 'cambia-de-mano', casilla: a.casilla, de: null, a: j.asiento });
      ganador = j.asiento;
      cuanto = a.puja;
    }
  }
  cronica.push({ que: 'almoneda-cerrada', casilla: a.casilla, ganador, cuanto });
  return reanudar(s, cronica);
}

/** Una puja: `cuanto` entero, múltiplo del paso, no por debajo del mínimo ni por encima de lo que se tiene. */
function pujar(e: EstadoDelBurgo, i: number, casilla: number, cuanto: number, cronica: Cronica): EstadoDelBurgo {
  const a = e.almoneda;
  const j = jugadorEn(e, i);
  if (a === null || j === null || e.paso !== 'almoneda' || j.quebrado) return e;
  if (a.casilla !== casilla || a.pujaDe !== j.asiento || a.enPie.indexOf(j.asiento) < 0) return e;
  if (!Number.isInteger(cuanto) || cuanto % PASO_DE_PUJA !== 0) return e;
  if (cuanto < pujaMinimaDe(a) || cuanto > j.mrs) return e;
  const pujaDe = siguienteEnPie(a.enPie, j.asiento);
  if (pujaDe === null) return e;
  cronica.push({ que: 'puja', quien: j.asiento, casilla, cuanto });
  const s: EstadoDelBurgo = { ...e, almoneda: { ...a, puja: cuanto, quienPuja: j.asiento, pujaDe } };
  return cerrarSiToca(s, cronica);
}

/** Pasar en la almoneda: sale de `enPie` y el relevo sigue por donde iba. */
function pasarPuja(e: EstadoDelBurgo, i: number, casilla: number, cronica: Cronica): EstadoDelBurgo {
  const a = e.almoneda;
  const j = jugadorEn(e, i);
  if (a === null || j === null || e.paso !== 'almoneda') return e;
  if (a.casilla !== casilla || a.pujaDe !== j.asiento) return e;
  const donde = a.enPie.indexOf(j.asiento);
  if (donde < 0) return e;
  const enPie: AsientoId[] = [];
  for (const x of a.enPie) if (x !== j.asiento) enPie.push(x);
  const pujaDe = enPie.length === 0 ? j.asiento : (enPie[donde % enPie.length] as AsientoId);
  cronica.push({ que: 'pasa-puja', quien: j.asiento, casilla });
  const s: EstadoDelBurgo = { ...e, almoneda: { ...a, enPie, pujaDe } };
  return cerrarSiToca(s, cronica);
}

// ---------------------------------------------------------------------------
// Las obras: alzar, vender, empeñar, desempeñar (guardas sobre estado O vista)
// ---------------------------------------------------------------------------

/*
 * ═══ LAS GUARDAS SE ESCRIBEN UNA VEZ SOBRE «LO QUE SE MIRA» ═══
 *
 * `opciones()` recibe la VISTA y el reductor el ESTADO, y las reglas de qué se puede
 * alzar o empeñar tienen que ser las mismas en los dos sitios o el botón se enciende
 * donde el reductor dice que no. Todo lo que estas guardas necesitan es público
 * —títulos, existencias del Concejo, el efectivo del que obra—, así que se escriben
 * sobre una forma que el estado y la vista comparten y se llaman desde los dos.
 */

/** Lo que las guardas de obra necesitan: los títulos y las existencias del Concejo. */
interface LoQueSeMira extends ConTitulos {
  readonly casasEnElConcejo: number;
  readonly posadasEnElConcejo: number;
}

/** ¿Puede `asiento`, con `mrs`, alzar una casa (o la posada) en `casilla`? */
function puedeAlzar(m: LoQueSeMira, asiento: AsientoId, mrs: number, casilla: number): boolean {
  const t = tituloDe(m, casilla);
  const fila = filaDe(casilla);
  if (t === null || fila === null || fila.clase !== 'solar' || t.dueno !== asiento) return false;
  if (t.casas >= POSADA) return false;
  const barrio = barrioDe(casilla);
  if (barrio === null || !barrioEntero(m, asiento, barrio)) return false;
  let minimo = POSADA;
  for (const c of barrio.solares) {
    const otro = tituloDe(m, c);
    if (otro === null || otro.empenado) return false;
    if (otro.casas < minimo) minimo = otro.casas;
  }
  if (t.casas > minimo) return false;
  if (t.casas < POSADA - 1 && m.casasEnElConcejo <= 0) return false;
  if (t.casas === POSADA - 1 && m.posadasEnElConcejo <= 0) return false;
  return mrs >= fila.casa;
}

/** ¿Puede `asiento` vender un edificio de `casilla`? Parejo al revés: se quita de donde haya más. */
function puedeVender(m: LoQueSeMira, asiento: AsientoId, casilla: number): boolean {
  const t = tituloDe(m, casilla);
  if (t === null || t.dueno !== asiento || t.casas <= 0) return false;
  const barrio = barrioDe(casilla);
  if (barrio === null) return false;
  for (const c of barrio.solares) {
    const otro = tituloDe(m, c);
    if (otro !== null && otro.casas > t.casas) return false;
  }
  return true;
}

/** ¿Puede `asiento` empeñar `casilla`? Propio, no empeñado, sin casas y con el barrio sin edificios. */
function puedeEmpenar(m: LoQueSeMira, asiento: AsientoId, casilla: number): boolean {
  const t = tituloDe(m, casilla);
  if (t === null || t.dueno !== asiento || t.empenado || t.casas > 0) return false;
  return !barrioConEdificios(m, barrioDe(casilla));
}

/** ¿Puede `asiento`, con `mrs`, desempeñar `casilla`? */
function puedeDesempenar(m: LoQueSeMira, asiento: AsientoId, mrs: number, casilla: number): boolean {
  const t = tituloDe(m, casilla);
  const fila = filaDe(casilla);
  if (t === null || fila === null || t.dueno !== asiento || !t.empenado) return false;
  return mrs >= costeDeDesempeno(fila.precio);
}

/** Lo que cobra `asiento` por vender UN edificio de `casilla` (una posada entera si no hay casas para degradarla). */
function loQueDaVender(m: LoQueSeMira, casilla: number): number {
  const t = tituloDe(m, casilla);
  const fila = filaDe(casilla);
  if (t === null || fila === null) return 0;
  const porCasa = Math.floor(fila.casa / PARTES_DE_LA_CASA_AL_VENDER);
  if (t.casas === POSADA && m.casasEnElConcejo < POSADA - 1) return POSADA * porCasa;
  return porCasa;
}

function alzar(e: EstadoDelBurgo, i: number, casilla: number, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  const t = tituloDe(e, casilla);
  const fila = filaDe(casilla);
  if (j === null || t === null || fila === null || !puedeAlzar(e, j.asiento, j.mrs, casilla)) return e;
  const seraPosada = t.casas === POSADA - 1;
  let s = transferirEntre(e, i, null, fila.casa, seraPosada ? 'posada' : 'casa', casilla, cronica);
  if (s.apuro !== null) return e;
  s = conTitulo(s, casilla, { casas: t.casas + 1 });
  s = seraPosada
    ? { ...s, casasEnElConcejo: s.casasEnElConcejo + (POSADA - 1), posadasEnElConcejo: s.posadasEnElConcejo - 1 }
    : { ...s, casasEnElConcejo: s.casasEnElConcejo - 1 };
  cronica.push({ que: 'alza', quien: j.asiento, casilla, casas: t.casas + 1 });
  return s;
}

function vender(e: EstadoDelBurgo, i: number, casilla: number, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  const t = tituloDe(e, casilla);
  const fila = filaDe(casilla);
  if (j === null || t === null || fila === null || !puedeVender(e, j.asiento, casilla)) return e;
  const porCasa = Math.floor(fila.casa / PARTES_DE_LA_CASA_AL_VENDER);
  let s = e;
  let quedan = 0;
  if (t.casas === POSADA) {
    if (e.casasEnElConcejo >= POSADA - 1) {
      quedan = POSADA - 1;
      s = { ...s, posadasEnElConcejo: s.posadasEnElConcejo + 1, casasEnElConcejo: s.casasEnElConcejo - (POSADA - 1) };
      s = transferirEntre(s, null, i, porCasa, 'venta', casilla, cronica);
    } else {
      quedan = 0;
      s = { ...s, posadasEnElConcejo: s.posadasEnElConcejo + 1 };
      s = transferirEntre(s, null, i, POSADA * porCasa, 'venta', casilla, cronica);
    }
  } else {
    quedan = t.casas - 1;
    s = { ...s, casasEnElConcejo: s.casasEnElConcejo + 1 };
    s = transferirEntre(s, null, i, porCasa, 'venta', casilla, cronica);
  }
  s = conTitulo(s, casilla, { casas: quedan });
  cronica.push({ que: 'vende', quien: j.asiento, casilla, casas: quedan });
  return saldar(s, cronica);
}

function empenar(e: EstadoDelBurgo, i: number, casilla: number, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  const fila = filaDe(casilla);
  if (j === null || fila === null || !puedeEmpenar(e, j.asiento, casilla)) return e;
  let s = conTitulo(e, casilla, { empenado: true });
  s = transferirEntre(s, null, i, valorDeEmpeno(fila.precio), 'empeno', casilla, cronica);
  cronica.push({ que: 'empena', quien: j.asiento, casilla });
  return saldar(s, cronica);
}

function desempenar(e: EstadoDelBurgo, i: number, casilla: number, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  const fila = filaDe(casilla);
  if (j === null || fila === null || !puedeDesempenar(e, j.asiento, j.mrs, casilla)) return e;
  const s = transferirEntre(e, i, null, costeDeDesempeno(fila.precio), 'desempeno', casilla, cronica);
  if (s.apuro !== null && e.apuro === null) return e;
  cronica.push({ que: 'desempena', quien: j.asiento, casilla });
  return conTitulo(s, casilla, { empenado: false });
}

// ---------------------------------------------------------------------------
// Los tratos: proponer, aceptar, rechazar, retirar; caducan al relevar
// ---------------------------------------------------------------------------

/** ¿Es un lado de trato válido para `asiento`, que tiene `mrs` e `indultos`? Títulos propios, sin edificios y con el barrio sin edificios. */
function ladoValido(m: LoQueSeMira, asiento: AsientoId, mrs: number, indultos: number, lado: LadoDelTrato): boolean {
  if (!Number.isInteger(lado.mrs) || lado.mrs < 0 || lado.mrs > mrs) return false;
  if (!Number.isInteger(lado.indultos) || lado.indultos < 0 || lado.indultos > indultos) return false;
  const vistos: number[] = [];
  for (const c of lado.titulos) {
    if (!Number.isInteger(c) || vistos.indexOf(c) >= 0) return false;
    vistos.push(c);
    const t = tituloDe(m, c);
    if (t === null || t.dueno !== asiento || t.casas > 0) return false;
    if (barrioConEdificios(m, barrioDe(c))) return false;
  }
  return true;
}

function ladoVacio(lado: LadoDelTrato): boolean {
  return lado.mrs === 0 && lado.titulos.length === 0 && lado.indultos === 0;
}

function tratosAbiertosDe(tratos: readonly TratoDelBurgo[], de: AsientoId): number {
  let n = 0;
  for (const t of tratos) if (t.de === de) n++;
  return n;
}

/** Interés que paga quien RECIBE cada título empeñado de un lado. */
function interesDeLosEmpenos(m: LoQueSeMira, titulos: readonly number[]): number {
  let total = 0;
  for (const c of titulos) {
    const t = tituloDe(m, c);
    const fila = filaDe(c);
    if (t !== null && fila !== null && t.empenado) total += interesDelEmpeno(fila.precio);
  }
  return total;
}

/** ¿Puede `de` proponer ahora a `a`? El dueño del turno a cualquiera vivo; cualquiera vivo al dueño del turno. Nunca en almoneda. */
function puedeProponer(e: EstadoDelBurgo, de: number, a: number): boolean {
  if (e.momento !== 'jugando' || e.paso === 'almoneda') return false;
  if (de === a || !estaVivo(e, de) || !estaVivo(e, a)) return false;
  if (de !== e.turno && a !== e.turno) return false;
  const asiento = asientoDe(e, de);
  return asiento !== null && tratosAbiertosDe(e.tratos, asiento) < TRATOS_ABIERTOS_POR_PROPONENTE;
}

function proponer(
  e: EstadoDelBurgo,
  de: number,
  a: number,
  doy: LadoDelTrato,
  pido: LadoDelTrato,
  cronica: Cronica,
): EstadoDelBurgo {
  const jd = jugadorEn(e, de);
  const ja = jugadorEn(e, a);
  if (jd === null || ja === null || !puedeProponer(e, de, a)) return e;
  if (!ladoValido(e, jd.asiento, jd.mrs, jd.indultos.length, doy)) return e;
  if (!ladoValido(e, ja.asiento, ja.mrs, ja.indultos.length, pido)) return e;
  if (ladoVacio(doy) && ladoVacio(pido)) return e;
  const trato: TratoDelBurgo = {
    id: e.siguienteTrato,
    de: jd.asiento,
    a: ja.asiento,
    doy: { mrs: doy.mrs, titulos: [...doy.titulos], indultos: doy.indultos },
    pido: { mrs: pido.mrs, titulos: [...pido.titulos], indultos: pido.indultos },
    enElTurno: e.turnosAbiertos,
  };
  cronica.push({ que: 'trato', id: trato.id, de: trato.de, a: trato.a, fin: 'propuesto' });
  return { ...e, tratos: [...e.tratos, trato], siguienteTrato: e.siguienteTrato + 1 };
}

function tratoPorId(e: EstadoDelBurgo, id: number): TratoDelBurgo | null {
  for (const t of e.tratos) if (t.id === id) return t;
  return null;
}

function sinElTrato(tratos: readonly TratoDelBurgo[], id: number): TratoDelBurgo[] {
  const salida: TratoDelBurgo[] = [];
  for (const t of tratos) if (t.id !== id) salida.push(t);
  return salida;
}

/** Mueve los `cuantos` primeros Indultos de `de` a `a`. */
function pasarIndultos(e: EstadoDelBurgo, de: number, a: number, cuantos: number): EstadoDelBurgo {
  if (cuantos <= 0) return e;
  const jd = jugadorEn(e, de);
  const ja = jugadorEn(e, a);
  if (jd === null || ja === null) return e;
  const seVan: MazoId[] = [];
  const seQuedan: MazoId[] = [];
  for (let k = 0; k < jd.indultos.length; k++) {
    const m = jd.indultos[k] as MazoId;
    if (k < cuantos) seVan.push(m);
    else seQuedan.push(m);
  }
  let s = conJugador(e, de, { indultos: seQuedan });
  s = conJugador(s, a, { indultos: [...ja.indultos, ...seVan] });
  return s;
}

/**
 * ACEPTAR UN TRATO: revalida mercancía y dinero de las DOS partes con el estado de
 * ahora, cobra el interés de cada empeño que cambia de mano, y borra ese trato y
 * cualquier otro que incluya alguno de esos títulos. Los dos motivos de rechazo son
 * los únicos que la vista del que acepta no podía ver.
 */
function aceptar(e: EstadoDelBurgo, i: number, id: number, cronica: Cronica): EstadoDelBurgo | Rechazo<EstadoDelBurgo> {
  const trato = tratoPorId(e, id);
  const ja = jugadorEn(e, i);
  if (trato === null || ja === null || trato.a !== ja.asiento || ja.quebrado) return e;
  const de = indiceDelJugador(e, trato.de);
  const jd = jugadorEn(e, de);
  if (jd === null || jd.quebrado || e.momento !== 'jugando') return rechazar(e, 'Ese trato ya no está en pie.');
  if (!ladoValido(e, jd.asiento, jd.mrs, jd.indultos.length, trato.doy)) return rechazar(e, 'Ese trato ya no está en pie.');
  if (!ladoValido(e, ja.asiento, ja.mrs, ja.indultos.length, trato.pido)) return rechazar(e, 'Ese trato ya no está en pie.');

  const interesDeA = interesDeLosEmpenos(e, trato.doy.titulos);
  const interesDeDe = interesDeLosEmpenos(e, trato.pido.titulos);
  const mrsDeA = ja.mrs - trato.pido.mrs + trato.doy.mrs;
  const mrsDeDe = jd.mrs - trato.doy.mrs + trato.pido.mrs;
  if (mrsDeA < interesDeA) return rechazar(e, 'No te alcanza para el interés de los empeños.');
  if (mrsDeDe < interesDeDe) return rechazar(e, 'A la otra parte no le alcanza para el interés de los empeños.');

  let s: EstadoDelBurgo = { ...e, tratos: sinElTrato(e.tratos, id) };
  cronica.push({ que: 'trato', id, de: trato.de, a: trato.a, fin: 'aceptado' });
  s = transferirEntre(s, de, i, trato.doy.mrs, 'trato', jd.casilla, cronica);
  s = transferirEntre(s, i, de, trato.pido.mrs, 'trato', ja.casilla, cronica);
  for (const c of trato.doy.titulos) {
    s = conTitulo(s, c, { dueno: ja.asiento });
    cronica.push({ que: 'cambia-de-mano', casilla: c, de: jd.asiento, a: ja.asiento });
  }
  for (const c of trato.pido.titulos) {
    s = conTitulo(s, c, { dueno: jd.asiento });
    cronica.push({ que: 'cambia-de-mano', casilla: c, de: ja.asiento, a: jd.asiento });
  }
  if (interesDeA > 0) s = transferirEntre(s, i, null, interesDeA, 'interes', ja.casilla, cronica);
  if (interesDeDe > 0) s = transferirEntre(s, de, null, interesDeDe, 'interes', jd.casilla, cronica);
  s = pasarIndultos(s, de, i, trato.doy.indultos);
  s = pasarIndultos(s, i, de, trato.pido.indultos);

  /* Los demás tratos que tocaran alguno de estos títulos ya no dicen la verdad: caducan. */
  const movidos = [...trato.doy.titulos, ...trato.pido.titulos];
  const vivosTratos: TratoDelBurgo[] = [];
  for (const t of s.tratos) {
    let toca = false;
    for (const c of [...t.doy.titulos, ...t.pido.titulos]) if (movidos.indexOf(c) >= 0) toca = true;
    if (toca) cronica.push({ que: 'trato', id: t.id, de: t.de, a: t.a, fin: 'caducado' });
    else vivosTratos.push(t);
  }
  s = { ...s, tratos: vivosTratos };
  return saldar(s, cronica);
}

function rechazarTrato(e: EstadoDelBurgo, i: number, id: number, cronica: Cronica): EstadoDelBurgo {
  const trato = tratoPorId(e, id);
  const j = jugadorEn(e, i);
  if (trato === null || j === null || trato.a !== j.asiento) return e;
  cronica.push({ que: 'trato', id, de: trato.de, a: trato.a, fin: 'rechazado' });
  return { ...e, tratos: sinElTrato(e.tratos, id) };
}

function retirarTrato(e: EstadoDelBurgo, i: number, id: number, cronica: Cronica): EstadoDelBurgo {
  const trato = tratoPorId(e, id);
  const j = jugadorEn(e, i);
  if (trato === null || j === null || trato.de !== j.asiento) return e;
  cronica.push({ que: 'trato', id, de: trato.de, a: trato.a, fin: 'retirado' });
  return { ...e, tratos: sinElTrato(e.tratos, id) };
}

/** Quita todos los tratos en los que participa `asiento`, dándolos por caducados. */
function sinLosTratosDe(e: EstadoDelBurgo, asiento: AsientoId, cronica: Cronica): EstadoDelBurgo {
  const quedan: TratoDelBurgo[] = [];
  for (const t of e.tratos) {
    if (t.de === asiento || t.a === asiento) cronica.push({ que: 'trato', id: t.id, de: t.de, a: t.a, fin: 'caducado' });
    else quedan.push(t);
  }
  return quedan.length === e.tratos.length ? e : { ...e, tratos: quedan };
}

// ---------------------------------------------------------------------------
// La quiebra, el relevo y el fin de la partida
// ---------------------------------------------------------------------------

/**
 * A QUIÉN LE DEBE MÁS el que va a quebrar: el acreedor que más reclama; empate, el
 * jugador que va antes en orden de mesa; el Concejo sólo si nadie reclama más que
 * él. Regla de la casa, dicha en la ayuda de «Declararse en quiebra».
 */
function acreedorDe(e: EstadoDelBurgo, apuro: ApuroDelBurgo | null): number | null {
  if (apuro === null) return null;
  const porAcreedor: Record<string, number> = {};
  let alConcejo = 0;
  for (const d of apuro.deudas) {
    if (d.a === null) alConcejo += d.cuanto;
    else porAcreedor[d.a] = (porAcreedor[d.a] ?? 0) + d.cuanto;
  }
  let mejor: number | null = null;
  let mejorSuma = 0;
  for (let k = 0; k < e.jugadores.length; k++) {
    const j = e.jugadores[k] as JugadorDelBurgo;
    const suma = porAcreedor[j.asiento] ?? 0;
    if (suma > mejorSuma && !j.quebrado) {
      mejor = k;
      mejorSuma = suma;
    }
  }
  if (mejor === null) return null;
  return alConcejo > mejorSuma ? null : mejor;
}

/**
 * QUIEBRA de `i` con un acreedor (jugador o Concejo).
 *
 * Los edificios se venden al Concejo por la mitad; con acreedor jugador ese dinero
 * y el efectivo van a él, y los títulos tal cual —los empeñados siguen empeñados y
 * el acreedor paga el interés de cada uno EN EL ACTO, o entra él en apuro con el
 * Concejo—; con el Concejo la caja se pierde, los títulos vuelven desempeñados y
 * salen a almoneda uno por uno, y los Indultos al fondo de su mazo. El quebrado
 * queda fuera con 0 mrs; sus tratos caducan; si pujaba, sale de la almoneda. Después,
 * `puedeHaberAcabado` y `reanudar`, que hace el relevo si el turno era suyo.
 */
function quebrar(e: EstadoDelBurgo, i: number, acreedor: number | null, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null || j.quebrado) return e;
  const aQuien = acreedor !== null && estaVivo(e, acreedor) && acreedor !== i ? acreedor : null;
  const ja = aQuien === null ? null : jugadorEn(e, aQuien);
  let s = e;
  let caja = 0;

  /* 1. Los edificios, al Concejo por la mitad. */
  for (const t of e.titulos) {
    if (t.dueno !== j.asiento || t.casas === 0) continue;
    const fila = filaDe(t.casilla);
    if (fila === null) continue;
    const porCasa = Math.floor(fila.casa / PARTES_DE_LA_CASA_AL_VENDER);
    if (t.casas === POSADA) {
      caja += POSADA * porCasa;
      s = { ...s, posadasEnElConcejo: s.posadasEnElConcejo + 1 };
    } else {
      caja += t.casas * porCasa;
      s = { ...s, casasEnElConcejo: s.casasEnElConcejo + t.casas };
    }
    s = conTitulo(s, t.casilla, { casas: 0 });
    cronica.push({ que: 'vende', quien: j.asiento, casilla: t.casilla, casas: 0 });
  }

  cronica.push({ que: 'quiebra', quien: j.asiento, acreedor: ja === null ? null : ja.asiento });

  /* 2. Lo que queda, a quien toque. */
  const misTitulos = titulosDe(s, j.asiento);
  if (aQuien !== null && ja !== null) {
    const botin = j.mrs + caja;
    if (botin > 0) {
      s = conJugador(s, aQuien, { mrs: (jugadorEn(s, aQuien) as JugadorDelBurgo).mrs + botin });
      cronica.push({ que: 'cobra', quien: ja.asiento, de: j.asiento, cuanto: botin, porque: 'quiebra', casilla: j.casilla });
    }
    for (const c of misTitulos) {
      s = conTitulo(s, c, { dueno: ja.asiento });
      cronica.push({ que: 'cambia-de-mano', casilla: c, de: j.asiento, a: ja.asiento });
    }
    s = conJugador(s, aQuien, { indultos: [...(jugadorEn(s, aQuien) as JugadorDelBurgo).indultos, ...j.indultos] });
  } else {
    const cola: number[] = [...s.colaDeAlmonedas];
    for (const c of misTitulos) {
      s = conTitulo(s, c, { dueno: null, empenado: false, casas: 0 });
      cronica.push({ que: 'cambia-de-mano', casilla: c, de: j.asiento, a: null });
      if (cola.indexOf(c) < 0) cola.push(c);
    }
    cola.sort((a, b) => a - b);
    s = { ...s, colaDeAlmonedas: cola };
    for (const m of j.indultos) {
      const serie = serieDeCarta(m, numeroDelIndulto(m));
      s = m === 'pregon' ? { ...s, pregon: devolverAlFondo(s.pregon, serie) } : { ...s, arca: devolverAlFondo(s.arca, serie) };
    }
  }

  /* 3. El quebrado queda fuera. */
  s = conJugador(s, i, { quebrado: true, mrs: 0, indultos: [] });
  s = sinLosTratosDe(s, j.asiento, cronica);
  if (s.apuro !== null && s.apuro.quien === j.asiento) s = { ...s, apuro: null };
  const colaDeApuros: ApuroDelBurgo[] = [];
  for (const a of s.colaDeApuros) if (a.quien !== j.asiento) colaDeApuros.push(a);
  s = { ...s, colaDeApuros };
  if (s.almoneda !== null && s.almoneda.enPie.indexOf(j.asiento) >= 0) {
    const a = s.almoneda;
    const enPie: AsientoId[] = [];
    for (const x of a.enPie) if (x !== j.asiento) enPie.push(x);
    const donde = a.enPie.indexOf(j.asiento);
    const pujaDe = a.pujaDe === j.asiento ? (enPie.length === 0 ? a.pujaDe : (enPie[donde % enPie.length] as AsientoId)) : a.pujaDe;
    const quienPuja = a.quienPuja === j.asiento ? null : a.quienPuja;
    s = { ...s, almoneda: { ...a, enPie, pujaDe, quienPuja, puja: quienPuja === null ? 0 : a.puja } };
  }

  /* 4. El interés de los empeños que recibe el acreedor, en el acto o en apuro. */
  if (aQuien !== null && ja !== null) {
    for (const c of misTitulos) {
      const t = tituloDe(s, c);
      const fila = filaDe(c);
      if (t === null || fila === null || !t.empenado) continue;
      s = transferirEntre(s, aQuien, null, interesDelEmpeno(fila.precio), 'interes', ja.casilla, cronica);
    }
  }

  s = puedeHaberAcabado(s, cronica);
  if (s.momento !== 'jugando') return s;
  s = cerrarSiToca(s, cronica);
  return reanudar(s, cronica);
}

/** El número de tabla del Indulto de cada mazo (hay uno por mazo): la serie que vuelve al fondo se deduce de él. */
function numeroDelIndulto(mazo: MazoId): number {
  for (const c of cartasDe(mazo)) if (c.efecto.que === 'indulto') return c.numero;
  return 0;
}

/**
 * EL RELEVO: pasa el turno al siguiente vivo. Caducan los tratos, se ponen a cero
 * los dobles y el sello de tiradas, y si hay tope de vueltas y todos los vivos lo han
 * alcanzado, gana el patrimonio.
 */
function relevo(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  if (e.momento !== 'jugando') return e;
  const siguiente = siguienteVivo(e, e.turno);
  if (siguiente === NADIE) return puedeHaberAcabado(e, cronica);
  const turnosAbiertos = e.turnosAbiertos + 1;
  const tratos: TratoDelBurgo[] = [];
  for (const t of e.tratos) {
    if (t.enElTurno < turnosAbiertos) cronica.push({ que: 'trato', id: t.id, de: t.de, a: t.a, fin: 'caducado' });
    else tratos.push(t);
  }
  const de = (e.jugadores[siguiente] as JugadorDelBurgo).asiento;
  cronica.push({ que: 'turno', de });
  const s: EstadoDelBurgo = {
    ...e,
    turno: siguiente,
    dobles: 0,
    tiradasDelTurno: 0,
    turnosAbiertos,
    tratos,
    paso: 'por-tirar',
    luego: 'por-pasar',
  };
  if (s.topeDeVueltas > 0) {
    let minimo = Number.MAX_SAFE_INTEGER;
    for (const k of vivos(s)) {
      const v = (s.jugadores[k] as JugadorDelBurgo).vueltas;
      if (v < minimo) minimo = v;
    }
    if (minimo >= s.topeDeVueltas) return finPorPatrimonio(s, cronica);
  }
  return s;
}

/** Un vivo (o ninguno) → terminada, ganador el último en pie. */
function puedeHaberAcabado(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  if (e.momento !== 'jugando') return e;
  const v = vivos(e);
  if (v.length > 1) return e;
  const ganadores: AsientoId[] = [];
  for (const k of v) ganadores.push((e.jugadores[k] as JugadorDelBurgo).asiento);
  cronica.push({ que: 'fin', ganadores, porque: 'ultimo-en-pie' });
  return terminar(e, ganadores);
}

/** Tope de vueltas: gana el mayor patrimonio; empate → comparten, sin desempate inventado. */
function finPorPatrimonio(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  let mejor = -1;
  const patrimonios: number[] = [];
  for (const j of e.jugadores) {
    const p = j.quebrado ? -1 : patrimonioDe(e, j);
    patrimonios.push(p);
    if (p > mejor) mejor = p;
  }
  const ganadores: AsientoId[] = [];
  for (let k = 0; k < e.jugadores.length; k++) {
    if (patrimonios[k] === mejor && mejor >= 0) ganadores.push((e.jugadores[k] as JugadorDelBurgo).asiento);
  }
  cronica.push({ que: 'fin', ganadores, porque: 'tope-de-vueltas' });
  return terminar(e, ganadores);
}

function terminar(e: EstadoDelBurgo, ganadores: readonly AsientoId[]): EstadoDelBurgo {
  return {
    ...e,
    momento: 'terminada',
    ganadores,
    almoneda: null,
    colaDeAlmonedas: [],
    apuro: null,
    colaDeApuros: [],
    tratos: [],
  };
}

// ---------------------------------------------------------------------------
// EMPEZAR (con el sorteo dentro) y TIRAR (con dobles y Mazmorra)
// ---------------------------------------------------------------------------

/**
 * EMPEZAR: siembra el azar con `ctx.azar` (la única vez que se lee), sienta a los
 * de `ctx.asientos` con su color por orden, reparte los 1.500, baraja los dos mazos
 * encadenando el azar y SORTEA quién sale dentro del mismo movimiento: por ronda,
 * dos dados por candidato en orden de asiento; siguen los de suma máxima; hasta que
 * queda uno o se agotan `RONDAS_DE_SORTEO`, y entonces el primero en orden de
 * asiento. Sin fase `sorteando`: una fase interactiva más es una fase más que
 * vencer, animar y comprobar, y un ausente la bloquearía antes de empezar.
 */
function empezar(e: EstadoDelBurgo, ctx: ContextoMovimiento, topeDeVueltas: number): EstadoDelBurgo | Rechazo<EstadoDelBurgo> {
  if (e.momento !== 'reuniendo') return e;
  const cuantos = ctx.asientos.length;
  if (cuantos < MANIFIESTO_BURGO.jugadores.minimo || cuantos > MANIFIESTO_BURGO.jugadores.maximo) {
    return rechazar(
      e,
      `Hacen falta entre ${MANIFIESTO_BURGO.jugadores.minimo} y ${MANIFIESTO_BURGO.jugadores.maximo} sentados.`,
    );
  }
  const cronica: Cronica = [];
  const jugadores: JugadorDelBurgo[] = [];
  for (let i = 0; i < cuantos; i++) {
    jugadores.push({
      asiento: ctx.asientos[i] as AsientoId,
      color: COLORES_DEL_BURGO[i] as string,
      casilla: 0,
      mrs: DINERO_DE_SALIDA,
      presa: LIBRE,
      indultos: [],
      quebrado: false,
      vueltas: 0,
    });
  }
  const titulos: TituloDelBurgo[] = [];
  for (const c of TITULOS) titulos.push({ casilla: c, dueno: null, casas: 0, empenado: false });

  const pregon = barajar(sembrar(ctx.azar), seriesDe('pregon'));
  const arca = barajar(pregon.azar, seriesDe('arca'));
  let azar = arca.azar;

  /* El sorteo. */
  let candidatos: number[] = [];
  for (let i = 0; i < cuantos; i++) candidatos.push(i);
  const ultimas: ParDeDados[] = [];
  for (let i = 0; i < cuantos; i++) ultimas.push([1, 1]);
  for (let ronda = 1; ronda <= RONDAS_DE_SORTEO && candidatos.length > 1; ronda++) {
    let mejor = 0;
    const sumas: number[] = [];
    for (const i of candidatos) {
      const tirada = tirarDosDados(azar);
      azar = tirada.azar;
      ultimas[i] = tirada.par;
      const suma = tirada.par[0] + tirada.par[1];
      sumas.push(suma);
      if (suma > mejor) mejor = suma;
      cronica.push({ que: 'sale', quien: (jugadores[i] as JugadorDelBurgo).asiento, dados: tirada.par, ronda });
    }
    const siguen: number[] = [];
    for (let k = 0; k < candidatos.length; k++) if (sumas[k] === mejor) siguen.push(candidatos[k] as number);
    candidatos = siguen;
  }
  const turno = candidatos[0] as number;
  const quienSale = (jugadores[turno] as JugadorDelBurgo).asiento;
  cronica.push({ que: 'empieza', quien: quienSale });
  cronica.push({ que: 'turno', de: quienSale });

  const s: EstadoDelBurgo = {
    ...e,
    momento: 'jugando',
    paso: 'por-tirar',
    luego: 'por-pasar',
    jugadores,
    turno,
    dobles: 0,
    tirada: null,
    tiradasDelTurno: 0,
    turnosAbiertos: 1,
    titulos,
    casasEnElConcejo: CASAS_DEL_CONCEJO,
    posadasEnElConcejo: POSADAS_DEL_CONCEJO,
    pregon: pregon.valor,
    arca: arca.valor,
    ultimaCarta: null,
    almoneda: null,
    colaDeAlmonedas: [],
    apuro: null,
    colaDeApuros: [],
    tratos: [],
    siguienteTrato: 1,
    topeDeVueltas: Number.isInteger(topeDeVueltas) && topeDeVueltas > 0 ? topeDeVueltas : 0,
    sorteoDeSalida: ultimas,
    azar,
    ganadores: [],
  };
  return conSucesos(s, cronica);
}

/**
 * TIRAR: dos dados encadenados. Libre: tres dobles seguidos mandan a la Mazmorra
 * antes de mover; si no, mueve, resuelve, y con dobles repite. Presa: con dobles
 * sale y mueve sin repetir; sin dobles suma un intento y pasa; al tercer fallo paga
 * la fianza (o entra en apuro) y mueve igual. El paso final lo decide la precedencia:
 * apuro > comprar > `luego`.
 */
function tirar(e: EstadoDelBurgo, i: number, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null || j.quebrado || e.momento !== 'jugando') return e;
  const dados = tirarDosDados(e.azar);
  const esDobles = dados.par[0] === dados.par[1];
  let s: EstadoDelBurgo = { ...e, azar: dados.azar, tirada: dados.par, tiradasDelTurno: e.tiradasDelTurno + 1 };
  const pasos = dados.par[0] + dados.par[1];
  cronica.push({ que: 'tira', quien: j.asiento, dados: dados.par, dobles: esDobles, enLaMazmorra: j.presa >= 0 });

  if (j.presa >= 0) {
    if (esDobles) {
      cronica.push({ que: 'sale-de-la-mazmorra', quien: j.asiento, como: 'dobles' });
      s = conJugador(s, i, { presa: LIBRE });
      s = { ...s, dobles: 0, luego: 'por-pasar', paso: 'por-pasar' };
      s = andar(s, i, pasos, cronica);
      s = resolverCasilla(s, i, 'normal', cronica);
    } else if (j.presa + 1 < INTENTOS_EN_LA_MAZMORRA) {
      cronica.push({ que: 'sigue-presa', quien: j.asiento, intento: j.presa + 1 });
      s = conJugador(s, i, { presa: j.presa + 1 });
      s = { ...s, dobles: 0, luego: 'por-pasar', paso: 'por-pasar' };
    } else {
      cronica.push({ que: 'sale-de-la-mazmorra', quien: j.asiento, como: 'tercer-intento' });
      s = conJugador(s, i, { presa: LIBRE });
      s = { ...s, dobles: 0, luego: 'por-pasar', paso: 'por-pasar' };
      s = transferirEntre(s, i, null, FIANZA, 'fianza', LA_MAZMORRA, cronica);
      s = andar(s, i, pasos, cronica);
      s = resolverCasilla(s, i, 'normal', cronica);
    }
  } else if (esDobles && e.dobles + 1 >= DOBLES_QUE_ENCIERRAN) {
    s = aLaMazmorra(s, i, 'tres-dobles', cronica);
  } else {
    const dobles = esDobles ? e.dobles + 1 : 0;
    const luego: PasoDeVuelta = esDobles ? 'por-tirar' : 'por-pasar';
    s = { ...s, dobles, luego, paso: luego };
    s = andar(s, i, pasos, cronica);
    s = resolverCasilla(s, i, 'normal', cronica);
  }

  if (s.momento !== 'jugando') return s;
  if (s.apuro !== null) return s.paso === 'apuro' ? s : { ...s, paso: 'apuro' };
  if (s.paso === 'comprar' || s.paso === 'almoneda') return s;
  return s.paso === s.luego ? s : { ...s, paso: s.luego };
}

// ---------------------------------------------------------------------------
// Leer la carga, que llega SIN VALIDAR
// ---------------------------------------------------------------------------

/*
 * El árbitro no mira lo que viene dentro del movimiento: el estado es opaco y no
 * sabe qué es una casilla. Esa comprobación baja aquí. El portillo ya rechaza casi
 * todo lo mal formado —una carga inventada no coincide con ninguna opción—, pero las
 * dos puertas (puja libre y trato) dejan pasar familias enteras, y lo que pasa por
 * ellas se lee con estos lectores y se vuelve a validar contra el estado.
 */

function cargaComoObjeto(carga: unknown): Record<string, unknown> | null {
  if (typeof carga !== 'object' || carga === null || Array.isArray(carga)) return null;
  return carga as Record<string, unknown>;
}

/** Un entero de la carga, o `null`. */
function enteroDeLaCarga(carga: unknown, campo: string): number | null {
  const o = cargaComoObjeto(carga);
  if (o === null) return null;
  const v = o[campo];
  return typeof v === 'number' && Number.isInteger(v) ? v : null;
}

/** `carga.casilla`, si es una casilla del anillo. */
function casillaDeLaCarga(carga: unknown): number | null {
  const c = enteroDeLaCarga(carga, 'casilla');
  return c !== null && c >= 0 && c < CUANTAS_CASILLAS ? c : null;
}

/** Una lista de enteros de como mucho `tope` elementos, sin repetidos, o `null`. */
function listaDeEnteros(x: unknown, tope: number): number[] | null {
  if (!Array.isArray(x) || x.length > tope) return null;
  const salida: number[] = [];
  for (const v of x) {
    if (typeof v !== 'number' || !Number.isInteger(v) || salida.indexOf(v) >= 0) return null;
    salida.push(v);
  }
  return salida;
}

/** Los TRES campos de un lado de trato (`mrs`, `titulos`, `indultos`), y ninguno más. */
const CAMPOS_DE_UN_LADO = 3;
/** Los TRES campos de un trato (`a`, `doy`, `pido`), y ninguno más. */
const CAMPOS_DE_UN_TRATO = 3;
/** Los DOS campos de una puja (`casilla`, `cuanto`), y ninguno más. */
const CAMPOS_DE_UNA_PUJA = 2;

function ladoDeLaCarga(x: unknown): LadoDelTrato | null {
  const o = cargaComoObjeto(x);
  if (o === null || Object.keys(o).length !== CAMPOS_DE_UN_LADO) return null;
  const mrs = o.mrs;
  const indultos = o.indultos;
  const titulos = listaDeEnteros(o.titulos, TITULOS.length);
  if (typeof mrs !== 'number' || !Number.isInteger(mrs) || mrs < 0 || mrs > TOPE_DE_MRS_EN_UN_TRATO) return null;
  if (typeof indultos !== 'number' || !Number.isInteger(indultos) || indultos < 0 || indultos > INDULTOS_QUE_EXISTEN) return null;
  if (titulos === null) return null;
  for (const c of titulos) if (!esTitulo(c)) return null;
  return { mrs, titulos, indultos };
}

// ---------------------------------------------------------------------------
// El portillo: lo ofrecido por igualdad canónica, o lo que cabe en una puerta
// ---------------------------------------------------------------------------

/*
 * ═══ EL ORDEN ES LA MITAD DE LA GARANTÍA ═══
 *
 * Primero se busca la opción EN LA LISTA que `opcionesDelBurgo` compuso para este
 * observador y este estado; sólo si no está, y sólo para PUJAR y PROPONER, se busca
 * la puerta en esa misma lista y se mira si la carga CABE en ella. Que la puerta esté
 * en la lista es lo que dice que a este asiento le toca pujar o puede proponer; la
 * forma no lo dice. Comprobar la forma antes de buscar la puerta es el fallo más
 * fácil de escribir y el más difícil de ver.
 */
function estaOfrecido(opciones: readonly Opcion[], movimiento: Movimiento): boolean {
  let firma = '';
  try {
    firma = canonico({ tipo: movimiento.tipo, carga: movimiento.carga ?? null });
  } catch {
    return false;
  }
  for (const o of opciones) {
    if (o.declaracion === true) continue;
    let suya = '';
    try {
      suya = canonico({ tipo: o.tipo, carga: o.carga ?? null });
    } catch {
      continue;
    }
    if (suya === firma) return true;
  }
  /*
   * EMPEZAR es la tercera familia, y la única sin `declaracion`: la hoja del Muelle
   * sólo enseña el id `empezar` como opción normal, así que la opción lleva
   * `{ topeDeVueltas: 0 }` y quien abre la mesa puede mandar otro tope (regla de mesa,
   * reglamento §10). Cabe si la opción de EMPEZAR está en la lista y la carga trae
   * ese campo y ninguno más, entero entre 0 y `TOPE_DE_VUELTAS_MAXIMO`.
   */
  if (movimiento.tipo === EMPEZAR) {
    for (const o of opciones) {
      if (o.tipo !== EMPEZAR) continue;
      const c = cargaComoObjeto(movimiento.carga);
      if (c === null || Object.keys(c).length !== 1) return false;
      const tope = c.topeDeVueltas;
      return typeof tope === 'number' && Number.isInteger(tope) && tope >= 0 && tope <= TOPE_DE_VUELTAS_MAXIMO;
    }
    return false;
  }
  if (movimiento.tipo !== PUJAR && movimiento.tipo !== PROPONER) return false;
  for (const o of opciones) {
    if (o.declaracion !== true || o.tipo !== movimiento.tipo) continue;
    return cabeEnLaPuerta(o.tipo, o.carga, movimiento.carga);
  }
  return false;
}

/**
 * ¿CABE ESTA CARGA EN LO QUE LA PUERTA DECLARA? Con EXACTAMENTE los campos declarados:
 * sin la cuenta de campos, un trato bien formado con ocho kilobytes de relleno al lado
 * pasaba el portillo y se archivaba tal cual en el diario (medido en Riberas).
 */
function cabeEnLaPuerta(tipo: string, declaracion: unknown, carga: unknown): boolean {
  if (tipo === PUJAR) return cabeEnLaPuja(declaracion, carga);
  if (tipo === PROPONER) return cabeEnElTrato(declaracion, carga);
  return false;
}

/** La puerta de la puja: `{ casilla, minimo, maximo, escalon }`; la carga: `{ casilla, cuanto }`. */
function cabeEnLaPuja(declaracion: unknown, carga: unknown): boolean {
  const d = cargaComoObjeto(declaracion);
  const c = cargaComoObjeto(carga);
  if (d === null || c === null || Object.keys(c).length !== CAMPOS_DE_UNA_PUJA) return false;
  const casilla = d.casilla;
  const minimo = d.minimo;
  const maximo = d.maximo;
  const escalon = d.escalon;
  if (typeof casilla !== 'number' || typeof minimo !== 'number' || typeof maximo !== 'number' || typeof escalon !== 'number') return false;
  if (c.casilla !== casilla) return false;
  const cuanto = c.cuanto;
  if (typeof cuanto !== 'number' || !Number.isInteger(cuanto)) return false;
  if (cuanto < minimo || cuanto > maximo) return false;
  return escalon > 0 && cuanto % escalon === 0;
}

/** La puerta del trato: `{ a: [...], mrsMaximo, titulos: [...], indultos }`; la carga: `{ a, doy, pido }`. */
function cabeEnElTrato(declaracion: unknown, carga: unknown): boolean {
  const d = cargaComoObjeto(declaracion);
  const c = cargaComoObjeto(carga);
  if (d === null || c === null || Object.keys(c).length !== CAMPOS_DE_UN_TRATO) return false;
  const destinos = d.a;
  const mrsMaximo = d.mrsMaximo;
  const misTitulos = d.titulos;
  const misIndultos = d.indultos;
  if (!Array.isArray(destinos) || typeof mrsMaximo !== 'number' || !Array.isArray(misTitulos) || typeof misIndultos !== 'number') return false;
  if (typeof c.a !== 'string' || destinos.indexOf(c.a) < 0) return false;
  const doy = ladoDeLaCarga(c.doy);
  const pido = ladoDeLaCarga(c.pido);
  if (doy === null || pido === null) return false;
  if (doy.mrs > mrsMaximo || doy.indultos > misIndultos) return false;
  for (const t of doy.titulos) if (misTitulos.indexOf(t) < 0) return false;
  for (const t of doy.titulos) if (pido.titulos.indexOf(t) >= 0) return false;
  return !(ladoVacio(doy) && ladoVacio(pido));
}

/**
 * EL MOTIVO DEL PORTILLO, redactado desde la vista y sólo con lo que la vista enseña:
 * corto y ciego a propósito, como en Riberas, porque contar qué le falta a quien
 * mueve obligaría a mirar cosas que quizá no estén en su vista.
 */
function motivoDeNoOfrecido(v: VistaSinTablero, movimiento: Movimiento): string {
  if (v.yo === null) return 'No estás sentado en esta mesa.';
  if (v.momento === 'reuniendo' && movimiento.tipo !== EMPEZAR) return 'La partida todavía no ha empezado.';
  if (v.momento === 'terminada') return 'La partida ya ha terminado.';
  const yo = jugadorVisto(v, v.yo);
  if (yo !== null && yo.quebrado) return 'Has quebrado: ya no juegas.';
  if (v.turnoDe !== null && v.turnoDe !== v.yo) {
    return `Eso ya no se puede hacer: le toca a ${nombreEnLaVista(v, v.turnoDe)}.`;
  }
  return 'Eso ya no se puede hacer: la mesa cambió entre que se pintó el botón y lo pulsaste.';
}

// ---------------------------------------------------------------------------
// EL REDUCTOR
// ---------------------------------------------------------------------------

/**
 * `avanzarElBurgo`, en orden fijo: (a) el tic, ANTES del portillo, con `quien === null`;
 * (b) el portillo, con la vista de quien mueve proyectada con `NADIE_SENTADO` (los
 * nombres no pueden entrar en el camino del reductor); (c) una rama por constante,
 * y cada rama vuelve a validar con TODO el estado; (d) lo desconocido devuelve EL
 * MISMO objeto. Cada rama que cambia algo cierra con `conSucesos`, que sube `jugada`
 * y sustituye la lista; tras cualquier cambio de dinero o títulos se mira si la
 * partida acabó.
 */
export function avanzarElBurgo(
  estado: EstadoDelBurgo | undefined,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): EstadoDelBurgo | Rechazo<EstadoDelBurgo> {
  const actual = comoSiSiempreHubieraHabidoBurgo(estado ?? partidaNueva());
  if (esTic(movimiento)) return venceElPlazo(actual);

  const vista = loQueSeVe(actual, ctx.quien, NADIE_SENTADO);
  if (!estaOfrecido(opcionesDelBurgo(vista, ctx.quien), movimiento)) {
    return rechazar(actual, motivoDeNoOfrecido(vista, movimiento));
  }

  if (movimiento.tipo === EMPEZAR) {
    const tope = enteroDeLaCarga(movimiento.carga, 'topeDeVueltas');
    return empezar(actual, ctx, tope === null ? 0 : tope);
  }

  const yo = indiceDelJugador(actual, ctx.quien);
  if (yo === NADIE || actual.momento !== 'jugando' || !estaVivo(actual, yo)) return actual;
  const cronica: Cronica = [];
  const salida = despachar(actual, yo, movimiento, cronica);
  if (esRechazo(salida)) return salida;
  if (salida === actual) return actual;
  return conSucesos(puedeHaberAcabado(salida, cronica), cronica);
}

/** Una rama por constante. Devuelve `actual` por identidad cuando no procede. */
function despachar(
  actual: EstadoDelBurgo,
  yo: number,
  movimiento: Movimiento,
  cronica: Cronica,
): EstadoDelBurgo | Rechazo<EstadoDelBurgo> {
  const j = jugadorEn(actual, yo) as JugadorDelBurgo;
  const esElDelTurno = actual.turno === yo;
  const sinInterrupcion = actual.almoneda === null && actual.apuro === null;
  const carga = movimiento.carga;

  switch (movimiento.tipo) {
    case TIRAR: {
      if (!esElDelTurno || !sinInterrupcion) return actual;
      const toca = actual.paso === 'por-tirar' || (actual.paso === 'por-pasar' && actual.dobles > 0);
      if (!toca) return actual;
      return tirar(actual, yo, cronica);
    }
    case PAGAR_FIANZA: {
      if (!esElDelTurno || !sinInterrupcion || actual.paso !== 'por-tirar' || j.presa < 0 || j.mrs < FIANZA) return actual;
      let s = transferirEntre(actual, yo, null, FIANZA, 'fianza', LA_MAZMORRA, cronica);
      if (s.apuro !== null) return actual;
      cronica.push({ que: 'sale-de-la-mazmorra', quien: j.asiento, como: 'fianza' });
      s = conJugador(s, yo, { presa: LIBRE });
      return s;
    }
    case USAR_INDULTO: {
      if (!esElDelTurno || !sinInterrupcion || actual.paso !== 'por-tirar' || j.presa < 0) return actual;
      const mazo = j.indultos[0];
      if (mazo === undefined) return actual;
      const restantes: MazoId[] = [];
      for (let k = 1; k < j.indultos.length; k++) restantes.push(j.indultos[k] as MazoId);
      const serie = serieDeCarta(mazo, numeroDelIndulto(mazo));
      let s = conJugador(actual, yo, { presa: LIBRE, indultos: restantes });
      s = mazo === 'pregon' ? { ...s, pregon: devolverAlFondo(s.pregon, serie) } : { ...s, arca: devolverAlFondo(s.arca, serie) };
      cronica.push({ que: 'sale-de-la-mazmorra', quien: j.asiento, como: 'indulto' });
      return s;
    }
    case COMPRAR: {
      const casilla = casillaDeLaCarga(carga);
      if (casilla === null || !esElDelTurno || !sinInterrupcion || actual.paso !== 'comprar') return actual;
      if (casilla !== j.casilla) return actual;
      const t = tituloDe(actual, casilla);
      const fila = filaDe(casilla);
      if (t === null || fila === null || t.dueno !== null || j.mrs < fila.precio) return actual;
      let s = transferirEntre(actual, yo, null, fila.precio, 'compra', casilla, cronica);
      if (s.apuro !== null) return actual;
      s = conTitulo(s, casilla, { dueno: j.asiento });
      cronica.push({ que: 'compra', quien: j.asiento, casilla, cuanto: fila.precio });
      cronica.push({ que: 'cambia-de-mano', casilla, de: null, a: j.asiento });
      return { ...s, paso: s.luego };
    }
    case A_ALMONEDA: {
      const casilla = casillaDeLaCarga(carga);
      if (casilla === null || !esElDelTurno || !sinInterrupcion || actual.paso !== 'comprar') return actual;
      if (casilla !== j.casilla) return actual;
      const t = tituloDe(actual, casilla);
      if (t === null || t.dueno !== null) return actual;
      return abrirAlmoneda(actual, casilla, cronica);
    }
    case PUJAR: {
      const casilla = casillaDeLaCarga(carga);
      const cuanto = enteroDeLaCarga(carga, 'cuanto');
      if (casilla === null || cuanto === null) return actual;
      return pujar(actual, yo, casilla, cuanto, cronica);
    }
    case PASAR_PUJA: {
      const casilla = casillaDeLaCarga(carga);
      if (casilla === null) return actual;
      return pasarPuja(actual, yo, casilla, cronica);
    }
    case ALZAR: {
      const casilla = casillaDeLaCarga(carga);
      if (casilla === null || !esElDelTurno || !pasoDeObrar(actual.paso)) return actual;
      return alzar(actual, yo, casilla, cronica);
    }
    case VENDER: {
      const casilla = casillaDeLaCarga(carga);
      if (casilla === null || !puedeObrarEnApuro(actual, yo)) return actual;
      return vender(actual, yo, casilla, cronica);
    }
    case EMPENAR: {
      const casilla = casillaDeLaCarga(carga);
      if (casilla === null || !puedeObrarEnApuro(actual, yo)) return actual;
      return empenar(actual, yo, casilla, cronica);
    }
    case DESEMPENAR: {
      const casilla = casillaDeLaCarga(carga);
      if (casilla === null || !esElDelTurno || !pasoDeObrar(actual.paso)) return actual;
      return desempenar(actual, yo, casilla, cronica);
    }
    case PROPONER: {
      const o = cargaComoObjeto(carga);
      if (o === null || typeof o.a !== 'string') return actual;
      const doy = ladoDeLaCarga(o.doy);
      const pido = ladoDeLaCarga(o.pido);
      if (doy === null || pido === null) return actual;
      const a = indiceDelJugador(actual, o.a);
      if (a === NADIE) return actual;
      const s = proponer(actual, yo, a, doy, pido, cronica);
      /*
       * La puerta no mira lo que se PIDE (la vista sí podía verlo, pero no cabe en la
       * declaración): un trato que pide un título que ya no es de la otra parte, o que
       * lleva edificios, se contesta con motivo y no en silencio. Todo lo que dice es
       * público.
       */
      if (s === actual) return rechazar(actual, 'Ese trato no se puede proponer: algún título no es de quien dices o lleva edificios en su barrio.');
      return s;
    }
    case ACEPTAR: {
      const id = enteroDeLaCarga(carga, 'trato');
      if (id === null) return actual;
      return aceptar(actual, yo, id, cronica);
    }
    case RECHAZAR: {
      const id = enteroDeLaCarga(carga, 'trato');
      if (id === null) return actual;
      return rechazarTrato(actual, yo, id, cronica);
    }
    case RETIRAR: {
      const id = enteroDeLaCarga(carga, 'trato');
      if (id === null) return actual;
      return retirarTrato(actual, yo, id, cronica);
    }
    case PASAR: {
      if (!esElDelTurno || !sinInterrupcion || actual.paso !== 'por-pasar' || actual.dobles !== 0) return actual;
      return relevo(actual, cronica);
    }
    case RENDIRSE: {
      const acreedor = actual.apuro !== null && actual.apuro.quien === j.asiento ? acreedorDe(actual, actual.apuro) : null;
      return quebrar(actual, yo, acreedor, cronica);
    }
    default:
      return actual;
  }
}

/** Vender y empeñar: el dueño del turno en un paso de obrar, o el endeudado durante su apuro. */
function puedeObrarEnApuro(e: EstadoDelBurgo, yo: number): boolean {
  if (e.turno === yo && pasoDeObrar(e.paso)) return true;
  return e.paso === 'apuro' && e.apuro !== null && e.apuro.quien === asientoDe(e, yo);
}

// ---------------------------------------------------------------------------
// EL TIC: `venceElPlazo`, determinista, una cosa por tic
// ---------------------------------------------------------------------------

/**
 * Qué significa que venza el plazo, según el estado (tabla del diseño §2.6):
 *
 *   · `reuniendo`, `terminada` → EL MISMO objeto (cada lectura mete su tic).
 *   · `almoneda` → pasa por `pujaDe`.
 *   · `apuro` → liquida a `apuro.quien` en UN tic: vende el edificio del solar con
 *     más casas (empate: casilla más alta), empeña el título de mayor precio (empate:
 *     casilla más alta), y si con todo no llega, quiebra con su acreedor.
 *   · `comprar` → a almoneda.
 *   · `por-tirar` → tira por él (gasta azar: lo mismo que gastaría él).
 *   · `por-pasar` con dobles → tira otra vez; sin dobles → pasa.
 *
 * Un tic hace UNA cosa; la mesa mete hasta ocho por lectura. Lo que no puede pasar es
 * que el tic deje la mesa en un estado del que sólo sale un humano.
 */
function venceElPlazo(e: EstadoDelBurgo): EstadoDelBurgo {
  if (e.momento !== 'jugando') return e;
  const cronica: Cronica = [];
  let s = e;
  /*
   * ═══ LA ALMONEDA Y EL APURO SE MIRAN ANTES QUE «EL DEL TURNO YA NO JUEGA» ═══
   *
   * Aquí `!estaVivo(e, e.turno)` iba EL PRIMERO y dejaba la mesa muerta en el caso
   * más previsible de todos: quien quiebra CON EL CONCEJO durante su propio turno
   * deja sus veintiocho títulos en la cola de almonedas, y `quebrar` abre la primera
   * sin tocar `turno` —el relevo llega después, cuando la cola se vacía—. Con el
   * turno apuntando a un quebrado, cada tic entraba por esta primera rama, llamaba a
   * `reanudar`, y `reanudar` con una almoneda abierta devuelve EL MISMO objeto: el
   * tic no cambiaba nada, la almoneda no avanzaba nunca y la mesa se quedaba
   * esperando para siempre a gente que no estaba. Medido: cuatrocientos tics para
   * cerrar UNA de las veintiocho almonedas, y las veintisiete restantes intactas.
   *
   * La almoneda y el apuro no son del dueño del turno —tienen su propio `pujaDe` y
   * su propio `quien`—, así que se resuelven aunque el turno esté vacante; sólo
   * cuando no hay ninguna de las dos importa que el del turno siga jugando.
   */
  if (e.paso === 'almoneda') {
    if (e.almoneda === null) s = reanudar(e, cronica);
    else {
      const i = indiceDelJugador(e, e.almoneda.pujaDe);
      s = i === NADIE ? cerrarAlmoneda(e, cronica) : pasarPuja(e, i, e.almoneda.casilla, cronica);
    }
  } else if (e.paso === 'apuro') {
    s = e.apuro === null ? reanudar(e, cronica) : liquidar(e, cronica);
  } else if (!estaVivo(e, e.turno)) {
    s = reanudar(e, cronica);
  } else if (e.paso === 'comprar') {
    const j = jugadorEn(e, e.turno) as JugadorDelBurgo;
    const t = tituloDe(e, j.casilla);
    s = t !== null && t.dueno === null ? abrirAlmoneda(e, j.casilla, cronica) : { ...e, paso: e.luego };
  } else if (e.paso === 'por-tirar' || (e.paso === 'por-pasar' && e.dobles > 0)) {
    s = tirar(e, e.turno, cronica);
  } else {
    s = relevo(e, cronica);
  }
  if (s === e) return e;
  return conSucesos(puedeHaberAcabado(s, cronica), cronica);
}

/** Tope de vueltas del bucle de liquidación: 28 títulos y 44 edificios no dan más de 72 pasos. */
const PASOS_DE_LIQUIDACION = 100;

/**
 * LIQUIDA al endeudado en un solo tic, en orden determinista, hasta cubrir la suma
 * o quebrar. `vender` y `empenar` llaman a `saldar`, que cierra el apuro en cuanto
 * el efectivo alcanza: por eso el bucle mira `s.apuro` en cada vuelta.
 */
function liquidar(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  const apuro = e.apuro;
  if (apuro === null) return e;
  const i = indiceDelJugador(e, apuro.quien);
  if (i === NADIE || !estaVivo(e, i)) return reanudar({ ...e, apuro: null }, cronica);
  let s = e;
  for (let vuelta = 0; vuelta < PASOS_DE_LIQUIDACION; vuelta++) {
    if (s.apuro === null || s.apuro.quien !== apuro.quien) return s;
    const j = jugadorEn(s, i) as JugadorDelBurgo;
    if (j.mrs >= sumaDeDeudasDel(s.apuro)) return saldar(s, cronica);

    let solar = -1;
    let masCasas = 0;
    for (const t of s.titulos) {
      if (t.dueno !== j.asiento || t.casas === 0) continue;
      if (t.casas > masCasas || (t.casas === masCasas && t.casilla > solar)) {
        solar = t.casilla;
        masCasas = t.casas;
      }
    }
    if (solar >= 0 && puedeVender(s, j.asiento, solar)) {
      s = vender(s, i, solar, cronica);
      continue;
    }

    let titulo = -1;
    let mayorPrecio = -1;
    for (const t of s.titulos) {
      if (t.dueno !== j.asiento || t.empenado) continue;
      const fila = filaDe(t.casilla);
      if (fila === null) continue;
      if (fila.precio > mayorPrecio || (fila.precio === mayorPrecio && t.casilla > titulo)) {
        titulo = t.casilla;
        mayorPrecio = fila.precio;
      }
    }
    if (titulo >= 0 && puedeEmpenar(s, j.asiento, titulo)) {
      s = empenar(s, i, titulo, cronica);
      continue;
    }

    return quebrar(s, i, acreedorDe(s, s.apuro), cronica);
  }
  return s;
}

// ---------------------------------------------------------------------------
// LA VISTA: tipo cerrado, igual para todos salvo `yo`, `aviso` y el tablero
// ---------------------------------------------------------------------------

export interface JugadorVisto {
  readonly asiento: AsientoId;
  /** `comoSeLlama(sentados, asiento)`; sin `sentados` degrada al id, a propósito. */
  readonly nombre: string;
  readonly color: string;
  readonly casilla: number;
  readonly mrs: number;
  /** −1 libre; 0..2. */
  readonly presa: number;
  /** Cuántos (público). */
  readonly indultos: number;
  readonly quebrado: boolean;
  readonly vueltas: number;
  /** Sus casillas, en orden: derivado, para no recontar en el cliente. */
  readonly titulos: readonly number[];
  /** Derivado, para el marcador y el tope de vueltas. */
  readonly patrimonio: number;
}

export interface TituloVisto {
  readonly casilla: number;
  readonly dueno: AsientoId | null;
  /** 0..4; 5 = posada. */
  readonly casas: number;
  readonly empenado: boolean;
  /** Derivado. */
  readonly barrioEntero: boolean;
  /** Lo que cobraría hoy con la última tirada (0 sin dueño o empeñado); derivado. */
  readonly rentaAhora: number;
}

export interface AlmonedaVista {
  readonly casilla: number;
  readonly puja: number;
  readonly quienPuja: AsientoId | null;
  readonly pujaDe: AsientoId;
  readonly enPie: readonly AsientoId[];
  readonly abiertaPor: AsientoId;
  readonly enCola: number;
}

export interface ApuroVisto {
  readonly quien: AsientoId;
  readonly deudas: readonly DeudaDelBurgo[];
  readonly debe: number;
  readonly enCola: number;
}

/** Todo público. */
export type TratoVisto = TratoDelBurgo;

export interface VistaDelBurgo {
  readonly desde: 'burgo';
  readonly momento: MomentoDelBurgo;
  readonly paso: PasoDelTurno;
  readonly luego: PasoDeVuelta;
  /** A quién se ESPERA: pujaDe, apuro.quien o el del turno. `null` en reuniendo/terminada. */
  readonly turnoDe: AsientoId | null;
  /** De quién es el turno aunque `turnoDe` sea otro (para la cinta: «Turno de Ana · puja Bea»). */
  readonly duenoDelTurno: AsientoId | null;
  readonly yo: AsientoId | null;
  readonly jugadores: readonly JugadorVisto[];
  /** 28, público. */
  readonly titulos: readonly TituloVisto[];
  readonly concejo: { readonly casas: number; readonly posadas: number };
  readonly quedan: { readonly pregon: number; readonly arca: number };
  readonly tirada: ParDeDados | null;
  readonly tiradasDelTurno: number;
  readonly turnosAbiertos: number;
  readonly dobles: number;
  /** El número; el texto lo pone el cliente desde la tabla. */
  readonly ultimaCarta: CartaSalida | null;
  readonly almoneda: AlmonedaVista | null;
  readonly apuro: ApuroVisto | null;
  readonly tratos: readonly TratoVisto[];
  readonly topeDeVueltas: number;
  readonly sorteoDeSalida: readonly ParDeDados[];
  readonly jugada: number;
  readonly sucesos: readonly SucesoDelBurgo[];
  readonly ganadores: readonly AsientoId[];
  /** La frase de la mesa, igual para todos. */
  readonly pregon: string;
  /** Lo que ME concierne. */
  readonly aviso: string;
  /** El respaldo, ya resuelto para `quien`. */
  readonly tablero: TableroDeclarado;
}

/** La vista sin el tablero: lo que el portillo y `opciones()` miran. El tablero es un dibujo de esto. */
export type VistaSinTablero = Omit<VistaDelBurgo, 'tablero'>;

/** «1.500 mrs». Sin regex ni `toLocaleString`: el separador es siempre el punto. */
export function maravedies(n: number): string {
  const negativo = n < 0;
  let entero = String(Math.trunc(Math.abs(n)));
  let cola = '';
  while (entero.length > 3) {
    cola = `.${entero.slice(entero.length - 3)}${cola}`;
    entero = entero.slice(0, entero.length - 3);
  }
  return `${negativo ? '-' : ''}${entero}${cola} mrs`;
}

/** «1.ª», «2.ª»… para «la 2.ª casa». */
export function ordinal(n: number): string {
  return `${Math.trunc(n)}.ª`;
}

function nombreDeCasilla(casilla: number): string {
  const fila = filaDe(casilla);
  return fila === null ? `la casilla ${casilla}` : fila.nombre;
}

function tituloVisto(v: VistaSinTablero, casilla: number): TituloVisto | null {
  for (const t of v.titulos) if (t.casilla === casilla) return t;
  return null;
}

function jugadorVisto(v: VistaSinTablero, asiento: AsientoId | null): JugadorVisto | null {
  if (asiento === null) return null;
  for (const j of v.jugadores) if (j.asiento === asiento) return j;
  return null;
}

/** Cómo se llama este asiento SEGÚN LA VISTA, y sólo según la vista. */
function nombreEnLaVista(v: VistaSinTablero, asiento: AsientoId | null): string {
  if (asiento === null) return 'el Concejo';
  const j = jugadorVisto(v, asiento);
  return j === null || j.nombre.length === 0 ? asiento : j.nombre;
}

/** Cómo se llama `porque` cuando se cuenta un pago. */
function porqueEnPalabras(porque: PorqueDelDinero): string {
  switch (porque) {
    case 'renta':
      return 'de renta';
    case 'puerta-mayor':
      return 'por pasar la Puerta Mayor';
    case 'carta':
      return 'por la carta';
    case 'diezmo':
      return 'del Diezmo';
    case 'alcabala':
      return 'de Alcabala';
    case 'fianza':
      return 'de fianza';
    case 'compra':
      return 'por la compra';
    case 'almoneda':
      return 'por la almoneda';
    case 'casa':
      return 'por la casa';
    case 'posada':
      return 'por la posada';
    case 'venta':
      return 'por la venta';
    case 'empeno':
      return 'por el empeño';
    case 'desempeno':
      return 'por desempeñar';
    case 'interes':
      return 'de interés del empeño';
    case 'trato':
      return 'por el trato';
    case 'quiebra':
      return 'de la quiebra';
    case 'reparaciones':
      return 'de reparaciones';
    case 'sorteo':
      return 'del sorteo';
    default:
      return '';
  }
}

/** Una frase por suceso; `''` para los que no se cuentan en el pregón. */
function fraseDe(s: SucesoDelBurgo, nombre: (a: AsientoId | null) => string): string {
  switch (s.que) {
    case 'sale':
      return '';
    case 'empieza':
      return `${nombre(s.quien)} sale primero.`;
    case 'tira':
      return `${nombre(s.quien)} saca ${s.dados[0]} y ${s.dados[1]}${s.dobles ? ', dobles' : ''}.`;
    case 'mueve':
      return `${nombre(s.quien)} ${s.como === 'retrocede' ? 'retrocede hasta' : 'llega a'} ${nombreDeCasilla(s.hasta)}${
        s.porLaPuertaMayor ? ' pasando por la Puerta Mayor' : ''
      }.`;
    case 'cobra':
      return s.de === null ? `${nombre(s.quien)} cobra ${maravedies(s.cuanto)} ${porqueEnPalabras(s.porque)}.` : '';
    case 'paga':
      return `${nombre(s.quien)} paga ${maravedies(s.cuanto)} ${porqueEnPalabras(s.porque)} a ${nombre(s.a)}.`;
    case 'compra':
      return `${nombre(s.quien)} compra ${nombreDeCasilla(s.casilla)} por ${maravedies(s.cuanto)}.`;
    case 'alza':
      return s.casas === POSADA
        ? `${nombre(s.quien)} alza una posada en ${nombreDeCasilla(s.casilla)}.`
        : `${nombre(s.quien)} alza la ${ordinal(s.casas)} casa en ${nombreDeCasilla(s.casilla)}.`;
    case 'vende':
      return `${nombre(s.quien)} vende al Concejo en ${nombreDeCasilla(s.casilla)}.`;
    case 'empena':
      return `${nombre(s.quien)} empeña ${nombreDeCasilla(s.casilla)}.`;
    case 'desempena':
      return `${nombre(s.quien)} desempeña ${nombreDeCasilla(s.casilla)}.`;
    case 'carta': {
      const ficha = carta(s.mazo, s.carta);
      const de = s.mazo === 'pregon' ? 'del Pregón' : 'del Arca del Concejo';
      return `${nombre(s.quien)} saca ${de}: «${ficha === null ? '' : ficha.titulo}».`;
    }
    case 'tirada-de-oficio':
      return `${nombre(s.quien)} tira para el oficio: ${s.dados[0]} y ${s.dados[1]}.`;
    case 'a-la-mazmorra':
      return `${nombre(s.quien)} va a la Mazmorra${s.porque === 'tres-dobles' ? ' por tres dobles seguidos' : ''}.`;
    case 'sale-de-la-mazmorra':
      return `${nombre(s.quien)} sale de la Mazmorra${
        s.como === 'fianza' ? ' pagando la fianza' : s.como === 'indulto' ? ' con un Indulto' : s.como === 'dobles' ? ' con dobles' : ''
      }.`;
    case 'sigue-presa':
      return `${nombre(s.quien)} sigue en la Mazmorra (intento ${s.intento} de ${INTENTOS_EN_LA_MAZMORRA}).`;
    case 'almoneda-abierta':
      return `Sale a almoneda ${nombreDeCasilla(s.casilla)}.`;
    case 'puja':
      return `${nombre(s.quien)} puja ${maravedies(s.cuanto)} por ${nombreDeCasilla(s.casilla)}.`;
    case 'pasa-puja':
      return `${nombre(s.quien)} pasa en la almoneda.`;
    case 'almoneda-cerrada':
      return s.ganador === null
        ? `${nombreDeCasilla(s.casilla)} se queda en el Concejo.`
        : `${nombre(s.ganador)} se lleva ${nombreDeCasilla(s.casilla)} por ${maravedies(s.cuanto)}.`;
    case 'apuro':
      return `${nombre(s.quien)} debe ${maravedies(s.debe)} y no le alcanza: en apuro.`;
    case 'quiebra':
      return `${nombre(s.quien)} quiebra; todo lo suyo pasa a ${nombre(s.acreedor)}.`;
    case 'cambia-de-mano':
      return '';
    case 'trato':
      return s.fin === 'propuesto'
        ? `${nombre(s.de)} propone un trato a ${nombre(s.a)}.`
        : s.fin === 'aceptado'
          ? `${nombre(s.a)} acepta el trato de ${nombre(s.de)}.`
          : s.fin === 'rechazado'
            ? `${nombre(s.a)} rechaza el trato de ${nombre(s.de)}.`
            : s.fin === 'retirado'
              ? `${nombre(s.de)} retira su trato.`
              : '';
    case 'turno':
      return `Turno de ${nombre(s.de)}.`;
    case 'fin':
      return s.ganadores.length === 1
        ? `Se acabó: ${nombre(s.ganadores[0] as AsientoId)} se queda con el burgo.`
        : `Se acabó: empate entre ${s.ganadores.map(nombre).join(', ')}.`;
    default:
      return '';
  }
}

/** Cuántas frases del último cambio caben en el pregón. */
const FRASES_DEL_PREGON = 3;

/** La frase de la mesa: las últimas frases del último cambio. Nunca vacía en `jugando`. */
function redactarPregon(e: EstadoDelBurgo, nombre: (a: AsientoId | null) => string): string {
  if (e.momento === 'reuniendo') return 'La mesa se está reuniendo: cuando estéis todos, cualquiera puede empezar.';
  const frases: string[] = [];
  for (const s of e.sucesos) {
    const f = fraseDe(s, nombre);
    if (f.length > 0) frases.push(f);
  }
  const desde = frases.length > FRASES_DEL_PREGON ? frases.length - FRASES_DEL_PREGON : 0;
  const texto = frases.slice(desde).join(' ');
  if (texto.length > 0) return texto;
  const de = aQuienSeEspera(e);
  return de === null ? 'La partida ha terminado.' : `Se espera a ${nombre(de)}.`;
}

/** Lo que ME concierne ahora mismo. `''` para el espectador cuando no hay nada que decirle. */
function redactarAviso(e: EstadoDelBurgo, quien: QuienMira, nombre: (a: AsientoId | null) => string): string {
  if (quien === ESPECTADOR) return '';
  const i = indiceDelJugador(e, quien);
  if (e.momento === 'reuniendo') return 'Cuando estéis todos, cualquiera puede empezar la partida.';
  if (e.momento === 'terminada') return e.ganadores.indexOf(quien) >= 0 ? 'Te quedas con el burgo.' : '';
  const j = jugadorEn(e, i);
  if (j === null) return '';
  if (j.quebrado) return 'Has quebrado: miras la partida desde fuera.';
  if (e.paso === 'apuro' && e.apuro !== null && e.apuro.quien === quien) {
    return `Debes ${maravedies(sumaDeDeudasDel(e.apuro))}: vende, empeña o declárate en quiebra.`;
  }
  if (e.paso === 'almoneda' && e.almoneda !== null && e.almoneda.pujaDe === quien) {
    return `Te toca pujar por ${nombreDeCasilla(e.almoneda.casilla)}: mínimo ${maravedies(pujaMinimaDe(e.almoneda))}.`;
  }
  for (const t of e.tratos) {
    if (t.a === quien) return `${nombre(t.de)} te propone un trato.`;
  }
  if (aQuienSeEspera(e) === quien) {
    if (e.paso === 'por-tirar') {
      return j.presa >= 0
        ? `Estás en la Mazmorra: paga la fianza, usa un Indulto o prueba con los dados (intento ${j.presa + 1} de ${INTENTOS_EN_LA_MAZMORRA}).`
        : 'Te toca tirar.';
    }
    if (e.paso === 'comprar') {
      const fila = filaDe(j.casilla);
      return fila === null
        ? 'Puedes comprar o sacar a almoneda.'
        : `Puedes comprar ${fila.nombre} por ${maravedies(fila.precio)}, o sacarla a almoneda.`;
    }
    if (e.paso === 'por-pasar') return e.dobles > 0 ? 'Dobles: vuelve a tirar.' : 'Puedes obrar, tratar o pasar el turno.';
    return '';
  }
  const espera = aQuienSeEspera(e);
  return espera === null ? '' : `Esperando a ${nombre(espera)}.`;
}

/**
 * LO QUE SE VE, sin el tablero. Recorta `azar`, `pregon` y `arca` (publica `quedan`)
 * y añade lo derivado que el cliente no debería recontar: títulos por jugador,
 * patrimonio, barrio entero y renta de hoy. Los nombres entran por `sentados`.
 */
function loQueSeVe(e: EstadoDelBurgo, quien: QuienMira, sentados: LosSentados): VistaSinTablero {
  const nombre = (a: AsientoId | null): string => (a === null ? 'el Concejo' : comoSeLlama(sentados, a));
  const jugadores: JugadorVisto[] = [];
  for (const j of e.jugadores) {
    jugadores.push({
      asiento: j.asiento,
      nombre: comoSeLlama(sentados, j.asiento),
      color: j.color,
      casilla: j.casilla,
      mrs: j.mrs,
      presa: j.presa,
      indultos: j.indultos.length,
      quebrado: j.quebrado,
      vueltas: j.vueltas,
      titulos: titulosDe(e, j.asiento),
      patrimonio: patrimonioDe(e, j),
    });
  }
  const titulos: TituloVisto[] = [];
  for (const t of e.titulos) {
    titulos.push({
      casilla: t.casilla,
      dueno: t.dueno,
      casas: t.casas,
      empenado: t.empenado,
      barrioEntero: barrioEntero(e, t.dueno, barrioDe(t.casilla)),
      rentaAhora: rentaDe(e, t, e.tirada, 'normal'),
    });
  }
  return {
    desde: 'burgo',
    momento: e.momento,
    paso: e.paso,
    luego: e.luego,
    turnoDe: aQuienSeEspera(e),
    duenoDelTurno: duenoDelTurno(e),
    yo: quien,
    jugadores,
    titulos,
    concejo: { casas: e.casasEnElConcejo, posadas: e.posadasEnElConcejo },
    quedan: { pregon: e.pregon.length, arca: e.arca.length },
    tirada: e.tirada,
    tiradasDelTurno: e.tiradasDelTurno,
    turnosAbiertos: e.turnosAbiertos,
    dobles: e.dobles,
    ultimaCarta: e.ultimaCarta,
    almoneda: e.almoneda === null ? null : { ...e.almoneda, enCola: e.colaDeAlmonedas.length },
    apuro: e.apuro === null ? null : { ...e.apuro, debe: sumaDeDeudasDel(e.apuro), enCola: e.colaDeApuros.length },
    tratos: e.tratos,
    topeDeVueltas: e.topeDeVueltas,
    sorteoDeSalida: e.sorteoDeSalida,
    jugada: e.jugada,
    sucesos: e.sucesos,
    ganadores: e.ganadores,
    pregon: redactarPregon(e, nombre),
    aviso: redactarAviso(e, quien, nombre),
  };
}

/** La proyección: la vista y el tablero de respaldo, ya resuelto para `quien`. Aguanta `undefined`. */
export function proyectarElBurgo(
  estado: EstadoDelBurgo | undefined,
  quien: QuienMira,
  sentados: LosSentados = NADIE_SENTADO,
): VistaDelBurgo {
  const base = loQueSeVe(comoSiSiempreHubieraHabidoBurgo(estado ?? partidaNueva()), quien, sentados);
  return { ...base, tablero: tableroDelBurgo(base, quien) };
}

/**
 * LO QUE JAMÁS PUEDE SALIR EN LA VISTA DE NADIE: el objeto `azar` entero y las
 * series de los dos mazos. Series y no números para que `verify:mesa` las busque con
 * comillas y un `7` de contador no dé un falso rojo.
 */
export function loSecretoDelBurgo(estado: EstadoDelBurgo | undefined): unknown[] {
  const e = comoSiSiempreHubieraHabidoBurgo(estado ?? partidaNueva());
  return [e.azar, ...e.pregon, ...e.arca];
}

/** `terminada`, y nada más. Aguanta `undefined`. */
export function seAcabo(estado: EstadoDelBurgo | undefined): boolean {
  return comoSiSiempreHubieraHabidoBurgo(estado ?? partidaNueva()).momento === 'terminada';
}

// ---------------------------------------------------------------------------
// `opciones()`: QUÉ TE PUEDO OFRECER A TI, CON LO QUE TÚ SABES
// ---------------------------------------------------------------------------

/**
 * Mira si esto tiene forma de vista del Burgo y NORMALIZA los campos que una
 * vista de ayer o un banco de pruebas podrían no traer: sólo `desde`, `jugadores`,
 * `titulos` y `tratos` deciden si hay juego; lo demás se rellena con «no hay».
 */
function comoVista(vista: unknown): VistaSinTablero | null {
  const v = cargaComoObjeto(vista);
  if (v === null || v.desde !== 'burgo') return null;
  if (!Array.isArray(v.jugadores) || !Array.isArray(v.titulos) || !Array.isArray(v.tratos)) return null;
  const momento = v.momento === 'jugando' || v.momento === 'terminada' ? v.momento : 'reuniendo';
  const paso =
    v.paso === 'comprar' || v.paso === 'almoneda' || v.paso === 'apuro' || v.paso === 'por-pasar' ? v.paso : 'por-tirar';
  const concejo = cargaComoObjeto(v.concejo);
  const quedan = cargaComoObjeto(v.quedan);
  const tirada = Array.isArray(v.tirada) && v.tirada.length === 2 ? ([v.tirada[0] as number, v.tirada[1] as number] as const) : null;
  const almoneda = cargaComoObjeto(v.almoneda);
  const apuro = cargaComoObjeto(v.apuro);
  return {
    desde: 'burgo',
    momento,
    paso,
    luego: v.luego === 'por-tirar' ? 'por-tirar' : 'por-pasar',
    turnoDe: typeof v.turnoDe === 'string' && v.turnoDe.length > 0 ? v.turnoDe : null,
    duenoDelTurno: typeof v.duenoDelTurno === 'string' && v.duenoDelTurno.length > 0 ? v.duenoDelTurno : null,
    yo: typeof v.yo === 'string' ? v.yo : null,
    jugadores: v.jugadores as JugadorVisto[],
    titulos: v.titulos as TituloVisto[],
    concejo: {
      casas: concejo !== null && typeof concejo.casas === 'number' ? concejo.casas : 0,
      posadas: concejo !== null && typeof concejo.posadas === 'number' ? concejo.posadas : 0,
    },
    quedan: {
      pregon: quedan !== null && typeof quedan.pregon === 'number' ? quedan.pregon : 0,
      arca: quedan !== null && typeof quedan.arca === 'number' ? quedan.arca : 0,
    },
    tirada,
    tiradasDelTurno: typeof v.tiradasDelTurno === 'number' ? v.tiradasDelTurno : 0,
    turnosAbiertos: typeof v.turnosAbiertos === 'number' ? v.turnosAbiertos : 0,
    dobles: typeof v.dobles === 'number' ? v.dobles : 0,
    ultimaCarta: cargaComoObjeto(v.ultimaCarta) === null ? null : (v.ultimaCarta as CartaSalida),
    almoneda: almoneda === null ? null : (almoneda as unknown as AlmonedaVista),
    apuro: apuro === null ? null : (apuro as unknown as ApuroVisto),
    tratos: v.tratos as TratoVisto[],
    topeDeVueltas: typeof v.topeDeVueltas === 'number' ? v.topeDeVueltas : 0,
    sorteoDeSalida: Array.isArray(v.sorteoDeSalida) ? (v.sorteoDeSalida as ParDeDados[]) : [],
    jugada: typeof v.jugada === 'number' ? v.jugada : 0,
    sucesos: Array.isArray(v.sucesos) ? (v.sucesos as SucesoDelBurgo[]) : [],
    ganadores: Array.isArray(v.ganadores) ? (v.ganadores as AsientoId[]) : [],
    pregon: typeof v.pregon === 'string' ? v.pregon : '',
    aviso: typeof v.aviso === 'string' ? v.aviso : '',
  };
}

/** Lo que las guardas de obra miran, sacado de la vista. */
function loQueSeMiraDe(v: VistaSinTablero): LoQueSeMira {
  return { titulos: v.titulos, casasEnElConcejo: v.concejo.casas, posadasEnElConcejo: v.concejo.posadas };
}

function opcion(id: string, tipo: string, carga: unknown, rotulo: string, ayuda: string): Opcion {
  return { id, tipo, carga, rotulo, ayuda };
}

function opcionesDeReunion(): readonly Opcion[] {
  return [
    opcion(
      'empezar',
      EMPEZAR,
      { topeDeVueltas: 0 },
      'Empezar la partida',
      `Hacen falta entre ${MANIFIESTO_BURGO.jugadores.minimo} y ${MANIFIESTO_BURGO.jugadores.maximo} sentados. Se sortea quién sale, y a partir de aquí no entra nadie más.`,
    ),
  ];
}

/** Las obras que `yo` puede hacer ahora: en apuro sólo vender y empeñar; con el turno, las cuatro. */
function opcionesDeObra(v: VistaSinTablero, yo: JugadorVisto, enApuro: boolean): Opcion[] {
  const m = loQueSeMiraDe(v);
  const salida: Opcion[] = [];
  for (const c of yo.titulos) {
    const t = tituloDe(m, c);
    const fila = filaDe(c);
    if (t === null || fila === null) continue;
    if (!enApuro && puedeAlzar(m, yo.asiento, yo.mrs, c)) {
      const seraPosada = t.casas === POSADA - 1;
      salida.push(
        opcion(
          `alzar:${c}`,
          ALZAR,
          { casilla: c },
          seraPosada
            ? `Alzar una posada en ${fila.nombre} (${maravedies(fila.casa)})`
            : `Alzar la ${ordinal(t.casas + 1)} casa en ${fila.nombre} (${maravedies(fila.casa)})`,
          seraPosada
            ? 'La posada sustituye a las cuatro casas, que vuelven al Concejo.'
            : 'Barrio entero, por parejo y con casas en el Concejo.',
        ),
      );
    }
    if (puedeVender(m, yo.asiento, c)) {
      const da = loQueDaVender(m, c);
      salida.push(
        opcion(
          `vender:${c}`,
          VENDER,
          { casilla: c },
          t.casas === POSADA
            ? `Vender ${m.casasEnElConcejo >= POSADA - 1 ? 'la posada por cuatro casas' : 'la posada entera'} de ${fila.nombre} (+${maravedies(da)})`
            : `Vender una casa de ${fila.nombre} (+${maravedies(da)})`,
          'El Concejo paga la mitad del precio de la casa; se quita de donde haya más.',
        ),
      );
    }
    if (puedeEmpenar(m, yo.asiento, c)) {
      salida.push(
        opcion(
          `empenar:${c}`,
          EMPENAR,
          { casilla: c },
          `Empeñar ${fila.nombre} por ${maravedies(valorDeEmpeno(fila.precio))}`,
          'Un título empeñado no cobra renta. Desempeñar cuesta el empeño más el 10 %.',
        ),
      );
    }
    if (!enApuro && puedeDesempenar(m, yo.asiento, yo.mrs, c)) {
      salida.push(
        opcion(
          `desempenar:${c}`,
          DESEMPENAR,
          { casilla: c },
          `Desempeñar ${fila.nombre} (${maravedies(costeDeDesempeno(fila.precio))})`,
          'Vuelve a cobrar renta.',
        ),
      );
    }
  }
  return salida;
}

/** Cuántos pasos de puja caben entre `desde` y lo que tengo: el tope de la puja libre. */
function topeDePuja(mrs: number): number {
  return Math.floor(mrs / PASO_DE_PUJA) * PASO_DE_PUJA;
}

/**
 * QUÉ PUEDE HACER `quien` AHORA MISMO, con lo que él sabe. Recibe la vista, jamás
 * el estado. `[]` al espectador, en `terminada` y a un quebrado. Lo que se hace SIN
 * turno (contestar tratos, obrar en el propio apuro, proponer al del turno,
 * rendirse) va ANTES del `if (v.turnoDe !== quien)`.
 */
export function opcionesDelBurgo(vista: unknown, quien: QuienMira): readonly Opcion[] {
  const v = comoVista(vista);
  if (v === null || quien === ESPECTADOR) return [];
  if (v.momento === 'reuniendo') return opcionesDeReunion();
  if (v.momento !== 'jugando') return [];
  const yo = jugadorVisto(v, quien);
  if (yo === null || yo.quebrado) return [];
  const salida: Opcion[] = [];

  /* Sin turno: contestar y retirar tratos. */
  for (const t of v.tratos) {
    if (t.a === quien) {
      salida.push(
        opcion(`aceptar:${t.id}`, ACEPTAR, { trato: t.id }, `Aceptar el trato de ${nombreEnLaVista(v, t.de)}`, resumenDelTrato(v, t)),
      );
      salida.push(opcion(`rechazar:${t.id}`, RECHAZAR, { trato: t.id }, `Rechazar el trato de ${nombreEnLaVista(v, t.de)}`, ''));
    }
    if (t.de === quien) {
      salida.push(opcion(`retirar:${t.id}`, RETIRAR, { trato: t.id }, `Retirar el trato a ${nombreEnLaVista(v, t.a)}`, resumenDelTrato(v, t)));
    }
  }

  /* Sin turno: obrar en el propio apuro. */
  const enMiApuro = v.paso === 'apuro' && v.apuro !== null && v.apuro.quien === quien;
  if (enMiApuro) for (const o of opcionesDeObra(v, yo, true)) salida.push(o);

  /* Sin turno o con él: proponer un trato (declaración). */
  if (v.paso !== 'almoneda' && v.duenoDelTurno !== null) {
    const destinos: AsientoId[] = [];
    for (const j of v.jugadores) {
      if (j.quebrado || j.asiento === quien) continue;
      if (v.duenoDelTurno === quien || j.asiento === v.duenoDelTurno) destinos.push(j.asiento);
    }
    if (destinos.length > 0 && tratosAbiertosDe(v.tratos, quien) < TRATOS_ABIERTOS_POR_PROPONENTE) {
      const m = loQueSeMiraDe(v);
      const titulos: number[] = [];
      for (const c of yo.titulos) {
        const t = tituloDe(m, c);
        if (t !== null && t.casas === 0 && !barrioConEdificios(m, barrioDe(c))) titulos.push(c);
      }
      salida.push({
        id: 'proponer',
        tipo: PROPONER,
        carga: { a: destinos, mrsMaximo: yo.mrs, titulos, indultos: yo.indultos },
        declaracion: true,
        rotulo: 'Proponer un trato',
        ayuda: 'Títulos sin edificios, maravedíes e Indultos, por lo que pidas. Caduca al cambiar el turno.',
      });
    }
  }

  if (v.turnoDe === quien) {
    if (v.paso === 'por-tirar') {
      if (yo.presa >= 0) {
        salida.push(
          opcion(
            'tirar',
            TIRAR,
            {},
            'Probar con los dados',
            `Con dobles sales y mueves sin repetir; si no, sigues en la Mazmorra (intento ${yo.presa + 1} de ${INTENTOS_EN_LA_MAZMORRA}; al tercero pagas la fianza y mueves).`,
          ),
        );
        if (yo.mrs >= FIANZA) {
          salida.push(opcion('pagar-fianza', PAGAR_FIANZA, {}, `Pagar ${maravedies(FIANZA)} de fianza`, 'Sales y tiras con normalidad; con dobles repites.'));
        }
        if (yo.indultos > 0) {
          salida.push(opcion('usar-indulto', USAR_INDULTO, {}, 'Usar un Indulto', 'Sales y tiras con normalidad; la carta vuelve al fondo de su mazo.'));
        }
      } else {
        salida.push(opcion('tirar', TIRAR, {}, 'Tirar los dados', 'Mueves lo que sumen; con dobles repites, y a los tres dobles seguidos, a la Mazmorra.'));
      }
      for (const o of opcionesDeObra(v, yo, false)) salida.push(o);
    } else if (v.paso === 'comprar') {
      const m = loQueSeMiraDe(v);
      const t = tituloDe(m, yo.casilla);
      const fila = filaDe(yo.casilla);
      if (t !== null && fila !== null && t.dueno === null) {
        if (yo.mrs >= fila.precio) {
          salida.push(
            opcion(`comprar:${yo.casilla}`, COMPRAR, { casilla: yo.casilla }, `Comprar ${fila.nombre} por ${maravedies(fila.precio)}`, 'Pasa a ser tuya y cobras renta a quien caiga.'),
          );
        }
        salida.push(
          opcion(`a-almoneda:${yo.casilla}`, A_ALMONEDA, { casilla: yo.casilla }, `Sacar ${fila.nombre} a almoneda`, 'Pujan todos, tú también; sin pujas se queda en el Concejo.'),
        );
      }
      for (const o of opcionesDeObra(v, yo, false)) salida.push(o);
    } else if (v.paso === 'almoneda') {
      const a = v.almoneda;
      if (a !== null && a.pujaDe === quien) {
        const fila = filaDe(a.casilla);
        const nombre = fila === null ? nombreDeCasilla(a.casilla) : fila.nombre;
        const minimo = pujaMinimaDe(a);
        const fijas: { id: string; cuanto: number }[] = [{ id: 'pujar:minimo', cuanto: minimo }];
        for (const escalon of ESCALONES_DE_PUJA) fijas.push({ id: `pujar:+${escalon}`, cuanto: a.puja + escalon });
        const vistas: number[] = [];
        for (const f of fijas) {
          if (f.cuanto < minimo || f.cuanto > yo.mrs || vistas.indexOf(f.cuanto) >= 0) continue;
          vistas.push(f.cuanto);
          salida.push(opcion(f.id, PUJAR, { casilla: a.casilla, cuanto: f.cuanto }, `Pujar ${maravedies(f.cuanto)} por ${nombre}`, `Mejor puja hasta ahora: ${maravedies(a.puja)}.`));
        }
        const maximo = topeDePuja(yo.mrs);
        if (maximo >= minimo) {
          salida.push({
            id: 'pujar',
            tipo: PUJAR,
            carga: { casilla: a.casilla, minimo, maximo, escalon: PASO_DE_PUJA },
            declaracion: true,
            rotulo: `Pujar por ${nombre}`,
            ayuda: `Entre ${maravedies(minimo)} y ${maravedies(maximo)}, de ${PASO_DE_PUJA} en ${PASO_DE_PUJA}.`,
          });
        }
        salida.push(opcion('pasar-puja', PASAR_PUJA, { casilla: a.casilla }, 'Pasar en la almoneda', 'Ya no pujas por este título.'));
      }
    } else if (v.paso === 'por-pasar') {
      if (v.dobles > 0) salida.push(opcion('tirar', TIRAR, {}, 'Volver a tirar (dobles)', 'Sacaste dobles: tiras otra vez. Tres seguidos, a la Mazmorra.'));
      else salida.push(opcion('pasar', PASAR, {}, 'Pasar el turno', 'Tus tratos abiertos caducan al pasar.'));
      for (const o of opcionesDeObra(v, yo, false)) salida.push(o);
    }
  }

  /* Siempre, y la última: declararse en quiebra. */
  const acreedor = enMiApuro && v.apuro !== null ? acreedorVisto(v, v.apuro) : null;
  salida.push(
    opcion(
      'rendirse',
      RENDIRSE,
      {},
      'Declararse en quiebra',
      acreedor === null
        ? 'Todo lo tuyo vuelve al Concejo y sale a almoneda. Quedas fuera de la partida.'
        : `Todo lo tuyo pasa a ${nombreEnLaVista(v, acreedor)}, que es a quien más debes. Quedas fuera de la partida.`,
    ),
  );
  return salida;
}

/** A quién iría todo si me rindiera ahora, según la vista: el mismo criterio que `acreedorDe`. */
function acreedorVisto(v: VistaSinTablero, apuro: ApuroVisto): AsientoId | null {
  const porAcreedor: Record<string, number> = {};
  let alConcejo = 0;
  for (const d of apuro.deudas) {
    if (d.a === null) alConcejo += d.cuanto;
    else porAcreedor[d.a] = (porAcreedor[d.a] ?? 0) + d.cuanto;
  }
  let mejor: AsientoId | null = null;
  let mejorSuma = 0;
  for (const j of v.jugadores) {
    const suma = porAcreedor[j.asiento] ?? 0;
    if (suma > mejorSuma && !j.quebrado) {
      mejor = j.asiento;
      mejorSuma = suma;
    }
  }
  if (mejor === null) return null;
  return alConcejo > mejorSuma ? null : mejor;
}

function resumenDeLado(lado: LadoDelTrato): string {
  const partes: string[] = [];
  if (lado.mrs > 0) partes.push(maravedies(lado.mrs));
  for (const c of lado.titulos) partes.push(nombreDeCasilla(c));
  if (lado.indultos > 0) partes.push(lado.indultos === 1 ? 'un Indulto' : `${lado.indultos} Indultos`);
  return partes.length === 0 ? 'nada' : partes.join(', ');
}

/** «Ana da X por Y», desde la vista. */
function resumenDelTrato(v: VistaSinTablero, t: TratoVisto): string {
  return `${nombreEnLaVista(v, t.de)} da ${resumenDeLado(t.doy)} y pide ${resumenDeLado(t.pido)}.`;
}

// ---------------------------------------------------------------------------
// EL TABLERO DECLARADO de respaldo: cuatro tiras de diez, un MAPA que se juega por botones
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ CUATRO TIRAS Y NINGÚN `toque` EN LAS CARAS (decisión 9) ═══
 *
 * La capa de dedos de 44 px del retablo de la app existe SÓLO para líneas y nudos;
 * una cara responde a su tamaño dibujado, y en un móvil de 390 px un anillo literal
 * da casillas de 29 px. Cuatro tiras de diez con caras de 100 × 150 en un `viewBox`
 * de ~1040 × 640 salen a ~39 × 58 px: se lee la cifra y un rótulo de seis letras, se
 * ven las fichas y los edificios, y se JUEGA por `acciones` (≥ 44 px) y `paneles`.
 * El retablo es un mapa; no sabe que es un anillo, y no hace falta que lo sepa.
 *
 * Se compone de la vista y de `opcionesDelBurgo(vista, quien)`, nunca del estado, y
 * ni un campo es opcional: `''` donde no hay texto, `null` donde no hay movimiento,
 * `carga: {}` donde no hay carga. Colores literales `#rrggbb`: van crudos al SVG.
 */

const ANCHO_DE_CARA = 100;
const ALTO_DE_CARA = 150;
const CARAS_POR_TIRA = 10;
const MARGEN_DEL_ENCUADRE = 20;
const RADIO_DE_FICHA = 14;
const RADIO_DE_CASA = 6;
const RADIO_DE_POSADA = 10;
/** Cuánto se oscurece el relleno de un título empeñado (una quinta parte). */
const PENUMBRA_DEL_EMPENO = 0.2;

/** Rellenos por clase; los solares llevan el color de su barrio. */
const RELLENO_DE_ESQUINA = '#4a4a4a';
const RELLENO_DE_PUERTA = '#6e6a63';
const RELLENO_DE_OFICIO = '#5a6a7a';
const RELLENO_DE_CARTA = '#7a5f4a';
const RELLENO_DE_TASA = '#6e6a63';
const RELLENO_DEL_CEPO = '#8a2f2f';
const BORDE_SIN_DUENO = '#3a3a3a';

function rellenoDe(fila: CasillaDelBurgo): string {
  switch (fila.clase) {
    case 'solar': {
      const barrio = barrioDe(fila.indice);
      return barrio === null ? RELLENO_DE_ESQUINA : barrio.color;
    }
    case 'puerta':
      return RELLENO_DE_PUERTA;
    case 'oficio':
      return RELLENO_DE_OFICIO;
    case 'pregon':
    case 'arca':
      return RELLENO_DE_CARTA;
    case 'diezmo':
    case 'alcabala':
      return RELLENO_DE_TASA;
    case 'a-la-mazmorra':
      return RELLENO_DEL_CEPO;
    default:
      return RELLENO_DE_ESQUINA;
  }
}

const CIFRAS_HEX = '0123456789abcdef';

function dosCifrasHex(n: number): string {
  const v = n < 0 ? 0 : n > 255 ? 255 : Math.round(n);
  return `${CIFRAS_HEX.charAt(Math.floor(v / 16))}${CIFRAS_HEX.charAt(v % 16)}`;
}

/** `#rrggbb` con cada canal reducido en `parte`. Sin regex. */
function oscurecer(hex: string, parte: number): string {
  if (hex.length !== 7 || hex.charAt(0) !== '#') return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return hex;
  return `#${dosCifrasHex(r * (1 - parte))}${dosCifrasHex(g * (1 - parte))}${dosCifrasHex(b * (1 - parte))}`;
}

/** La esquina superior izquierda de la cara `i` en las cuatro tiras. */
function origenDeCara(i: number): PuntoDeTablero {
  return { x: (i % CARAS_POR_TIRA) * ANCHO_DE_CARA, y: Math.floor(i / CARAS_POR_TIRA) * ALTO_DE_CARA };
}

function puntosDeCara(i: number): PuntoDeTablero[] {
  const o = origenDeCara(i);
  return [
    { x: o.x, y: o.y },
    { x: o.x + ANCHO_DE_CARA, y: o.y },
    { x: o.x + ANCHO_DE_CARA, y: o.y + ALTO_DE_CARA },
    { x: o.x, y: o.y + ALTO_DE_CARA },
  ];
}

/** La cifra de una cara: precio sin dueño, renta de hoy con dueño, «E» si empeñado, «P» si posada. */
function cifraDe(fila: CasillaDelBurgo, t: TituloVisto | null): string {
  if (t === null) return fila.precio > 0 ? String(fila.precio) : '';
  if (t.dueno === null) return String(fila.precio);
  const marca = t.empenado ? 'E ' : t.casas === POSADA ? 'P ' : '';
  return `${marca}${t.rentaAhora}`;
}

/** El orden en que las acciones bajan al retablo: lo del turno, las obras, las pujas, los tratos, rendirse. */
function rangoDeAccion(tipo: string): number {
  switch (tipo) {
    case TIRAR:
      return 0;
    case PAGAR_FIANZA:
      return 1;
    case USAR_INDULTO:
      return 2;
    case COMPRAR:
      return 3;
    case A_ALMONEDA:
      return 4;
    case PASAR:
      return 5;
    case ALZAR:
    case VENDER:
    case EMPENAR:
    case DESEMPENAR:
      return 10;
    case PUJAR:
      return 20;
    case PASAR_PUJA:
      return 21;
    case ACEPTAR:
    case RECHAZAR:
    case RETIRAR:
      return 30;
    case RENDIRSE:
      return 40;
    default:
      return 50;
  }
}

/** Un tablero sin caras: sólo el aviso y los botones que haya. Para una vista que no es del Burgo. */
function tableroVacio(aviso: string, opciones: readonly Opcion[] = []): TableroDeclarado {
  return {
    vista: { x: 0, y: 0, ancho: 100, alto: 100 },
    caras: [],
    lineas: [],
    nudos: [],
    acciones: accionesDe(opciones),
    paneles: [],
    aviso,
  };
}

function accionesDe(opciones: readonly Opcion[]): AccionDeTablero[] {
  const conRango: { rango: number; orden: number; o: Opcion }[] = [];
  let orden = 0;
  for (const o of opciones) {
    if (o.declaracion === true) continue;
    conRango.push({ rango: rangoDeAccion(o.tipo), orden, o });
    orden++;
  }
  conRango.sort((a, b) => (a.rango === b.rango ? a.orden - b.orden : a.rango - b.rango));
  const salida: AccionDeTablero[] = [];
  for (const { o } of conRango) {
    salida.push({ id: o.id, rotulo: o.rotulo, ayuda: o.ayuda, disponible: true, toque: { tipo: o.tipo, carga: o.carga } });
  }
  return salida;
}

/** Los bloques de texto del retablo, en orden FIJO (el retablo reconcilia por índice). */
function panelesDe(v: VistaSinTablero, quien: QuienMira): PanelDeTablero[] {
  const paneles: PanelDeTablero[] = [];

  const mesa: string[] = [];
  for (const j of v.jugadores) {
    let linea = `${j.nombre} · ${maravedies(j.mrs)} · ${j.titulos.length} ${j.titulos.length === 1 ? 'título' : 'títulos'}`;
    if (j.quebrado) linea += ' · quebrado';
    else if (j.presa >= 0) linea += ' · en la Mazmorra';
    if (j.indultos > 0) linea += ` · ${j.indultos} ${j.indultos === 1 ? 'Indulto' : 'Indultos'}`;
    mesa.push(linea);
  }
  mesa.push(`El Concejo guarda ${v.concejo.casas} casas y ${v.concejo.posadas} posadas.`);
  paneles.push({ titulo: 'La mesa', lineas: mesa });

  const mio: string[] = [];
  const yo = jugadorVisto(v, quien);
  if (yo === null) {
    mio.push('Miras la partida sin asiento.');
  } else {
    for (const c of yo.titulos) {
      const t = tituloVisto(v, c);
      if (t === null) continue;
      const edificios = t.casas === POSADA ? 'posada' : t.casas === 0 ? 'sin casas' : `${t.casas} ${t.casas === 1 ? 'casa' : 'casas'}`;
      mio.push(`${nombreDeCasilla(c)}: ${edificios}${t.empenado ? ' · empeñado' : ''} · renta ${maravedies(t.rentaAhora)}`);
    }
    if (mio.length === 0) mio.push('Todavía no tienes ningún título.');
    mio.push('Los tratos y la puja libre se hacen desde el tablero completo; aquí se puja por escalones.');
  }
  paneles.push({ titulo: 'Lo mío', lineas: mio });

  const ultima: string[] = [];
  if (v.ultimaCarta !== null) {
    const ficha = carta(v.ultimaCarta.mazo, v.ultimaCarta.carta);
    if (ficha !== null) {
      ultima.push(`${nombreEnLaVista(v, v.ultimaCarta.quien)} sacó ${v.ultimaCarta.mazo === 'pregon' ? 'del Pregón' : 'del Arca del Concejo'}: ${ficha.titulo}`);
      ultima.push(ficha.texto);
    }
  }
  if (ultima.length === 0) ultima.push('Ninguna todavía.');
  paneles.push({ titulo: 'La última carta', lineas: ultima });

  paneles.push({
    titulo: 'Última tirada',
    lineas: [v.tirada === null ? 'Sin tirar.' : `${v.tirada[0]} y ${v.tirada[1]}${v.tirada[0] === v.tirada[1] ? ' (dobles)' : ''}`],
  });

  if (v.almoneda !== null) {
    const a = v.almoneda;
    const enPie: string[] = [];
    for (const x of a.enPie) enPie.push(nombreEnLaVista(v, x));
    paneles.push({
      titulo: 'La almoneda',
      lineas: [
        `${nombreDeCasilla(a.casilla)} · ${a.quienPuja === null ? 'sin pujas' : `${maravedies(a.puja)} de ${nombreEnLaVista(v, a.quienPuja)}`}`,
        `Puja ${nombreEnLaVista(v, a.pujaDe)}. En pie: ${enPie.join(', ')}.`,
        a.enCola > 0 ? `${a.enCola} ${a.enCola === 1 ? 'título más en cola' : 'títulos más en cola'}.` : 'Ninguno más en cola.',
      ],
    });
  }

  if (v.apuro !== null) {
    const lineas: string[] = [`${nombreEnLaVista(v, v.apuro.quien)} debe ${maravedies(v.apuro.debe)}.`];
    for (const d of v.apuro.deudas) lineas.push(`${maravedies(d.cuanto)} a ${nombreEnLaVista(v, d.a)} ${porqueEnPalabras(d.porque)}.`);
    if (v.apuro.enCola > 0) lineas.push(`${v.apuro.enCola} más en apuro después.`);
    paneles.push({ titulo: 'El apuro', lineas });
  }

  if (v.tratos.length > 0) {
    const lineas: string[] = [];
    for (const t of v.tratos) lineas.push(`Trato ${t.id} a ${nombreEnLaVista(v, t.a)}: ${resumenDelTrato(v, t)}`);
    paneles.push({ titulo: 'Los tratos', lineas });
  }

  return paneles;
}

/** El aviso del retablo: fin de partida, lo mío y el pregón, en ese orden. */
function avisoDe(v: VistaSinTablero): string {
  const partes: string[] = [];
  if (v.momento === 'terminada') {
    partes.push(
      v.ganadores.length === 1
        ? `Se acabó: ${nombreEnLaVista(v, v.ganadores[0] as AsientoId)} se queda con el burgo.`
        : v.ganadores.length === 0
          ? 'Se acabó sin ganador.'
          : `Se acabó: empate entre ${v.ganadores.map((g) => nombreEnLaVista(v, g)).join(', ')}.`,
    );
  }
  if (v.aviso.length > 0) partes.push(v.aviso);
  if (v.pregon.length > 0) partes.push(v.pregon);
  return partes.join(' ');
}

/**
 * EL TABLERO DECLARADO del Burgo para `quien`: cuarenta caras en cuatro tiras,
 * fichas y edificios como nudos, ninguna línea, las opciones como acciones en orden
 * fijo y los paneles en orden fijo. Ni un `toque` en caras ni nudos (decisión 9).
 */
export function tableroDelBurgo(vista: unknown, quien: QuienMira): TableroDeclarado {
  const v = comoVista(vista);
  if (v === null) return tableroVacio('Esta vista no es del Burgo.');
  const opciones = opcionesDelBurgo(v, quien);

  const destacadas: number[] = [];
  const delTurno = jugadorVisto(v, v.duenoDelTurno);
  if (delTurno !== null) destacadas.push(delTurno.casilla);
  for (const s of v.sucesos) if (s.que === 'mueve' && destacadas.indexOf(s.hasta) < 0) destacadas.push(s.hasta);

  const caras: CaraDeTablero[] = [];
  const todosLosPuntos: PuntoDeTablero[] = [];
  for (let i = 0; i < CUANTAS_CASILLAS; i++) {
    const fila = filaDe(i);
    if (fila === null) continue;
    const t = esTitulo(i) ? tituloVisto(v, i) : null;
    const dueno = t === null || t.dueno === null ? null : jugadorVisto(v, t.dueno);
    const relleno = rellenoDe(fila);
    const puntos = puntosDeCara(i);
    for (const p of puntos) todosLosPuntos.push(p);
    caras.push({
      id: `casilla:${i}`,
      puntos,
      relleno: t !== null && t.empenado ? oscurecer(relleno, PENUMBRA_DEL_EMPENO) : relleno,
      borde: dueno === null ? BORDE_SIN_DUENO : dueno.color,
      rotulo: fila.rotulo,
      cifra: cifraDe(fila, t),
      destacada: destacadas.indexOf(i) >= 0,
      toque: null,
    });
  }

  const nudos: NudoDeTablero[] = [];
  const porCasilla: Record<string, number> = {};
  for (const j of v.jugadores) {
    if (j.quebrado) continue;
    const llave = String(j.casilla);
    const k = porCasilla[llave] ?? 0;
    porCasilla[llave] = k + 1;
    const o = origenDeCara(j.casilla);
    nudos.push({
      id: `ficha:${j.asiento}`,
      punto: { x: o.x + 20 + (k % 3) * 30, y: o.y + 95 + Math.floor(k / 3) * 32 },
      color: j.color,
      radio: RADIO_DE_FICHA,
      forma: 'redondo',
      tenue: j.presa >= 0,
      toque: null,
    });
  }
  for (const t of v.titulos) {
    if (t.casas === 0 || t.dueno === null) continue;
    const dueno = jugadorVisto(v, t.dueno);
    const color = dueno === null ? BORDE_SIN_DUENO : dueno.color;
    const o = origenDeCara(t.casilla);
    if (t.casas === POSADA) {
      nudos.push({
        id: `posada:${t.casilla}`,
        punto: { x: o.x + ANCHO_DE_CARA / 2, y: o.y + 18 },
        color,
        radio: RADIO_DE_POSADA,
        forma: 'cuadrado',
        tenue: false,
        toque: null,
      });
      continue;
    }
    for (let k = 0; k < t.casas && k < POSADA - 1; k++) {
      nudos.push({
        id: `casa:${t.casilla}:${k}`,
        punto: { x: o.x + 14 + k * 24, y: o.y + 16 },
        color,
        radio: RADIO_DE_CASA,
        forma: 'cuadrado',
        tenue: false,
        toque: null,
      });
    }
  }

  return {
    vista: encuadre(todosLosPuntos, MARGEN_DEL_ENCUADRE),
    caras,
    lineas: [],
    nudos,
    acciones: accionesDe(opciones),
    paneles: panelesDe(v, quien),
    aviso: avisoDe(v),
  };
}
