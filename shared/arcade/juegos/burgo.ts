/**
 * «EL BURGO»: el sexto arcade de la Sala, y el primero de solares, rentas y quiebra.
 *
 * De dos a seis personas compran los solares de una ciudad, cobran renta a
 * quien cae en ellos, alzan casas y hoteles, roban cartas de Sucesos y del Fondo
 * Vecinal, pasan por la Comisaría, hipotecan, sacan títulos a subasta, hacen tratos y
 * quiebran. El último que no quiebra se queda con el Burgo. Lo gobierna entero el
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
 * espera algo —el pujador en la subasta, el endeudado en el apuro, el del turno en
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
 * Tira y resuelve, no compra (manda a subasta), en la subasta pasa, en el apuro
 * liquida en orden determinista y si no llega quiebra, y en `por-pasar` pasa. Se
 * aparta de Riberas —cuyo tic no gasta azar— a sabiendas y por el reglamento §12:
 * el ausente tiene que mover, y mover son dados. Es reproducible porque cada tic va
 * al diario con su contexto y se reejecuta en el mismo sitio. Lo que no puede pasar
 * nunca es que el tic deje la mesa en un estado del que sólo sale un humano: por
 * eso el apuro se liquida entero en un tic y la quiebra al Ayuntamiento encola las
 * subastas y las cierra solas.
 *
 * ═══ LOS SECRETOS: EL AZAR Y LOS DOS MAZOS, Y NADA MÁS ═══
 *
 * El dinero, los títulos, los edificios, la posición y los Salvoconductos en mano son
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
 *   · En el tercer intento de la Comisaría la fianza se paga ANTES de mover (el
 *     reglamento §5 lo dice en ese orden: «paga 50 obligatoriamente y mueve»). Si no
 *     alcanza, se abre el apuro y el jugador sale y mueve igual; un título sin dueño
 *     en el que caiga con el apuro abierto NO abre `comprar` (no caben dos pasos):
 *     va a `colaDeAlmonedas` y sale a subasta cuando el apuro se cierra.
 *   · Un trato ACEPTADO durante una subasta puede dejar sin dinero al mejor postor.
 *     Al cerrar, si no alcanza, el título se queda en el Ayuntamiento (`ganador: null`) en
 *     vez de abrir un apuro por una puja: es el único cierre que no deja deuda.
 *   · Varios acreedores en un apuro: el que más reclama; empate, el jugador que va
 *     antes en orden de mesa; el Ayuntamiento sólo si nadie reclama más que él.
 *   · El tope de vueltas se mira en cada relevo: cuando el MÍNIMO de vueltas de los
 *     vivos alcanza el tope, gana el patrimonio. No se guarda quién empezó.
 *   · `sorteoDeSalida` guarda la ÚLTIMA tirada de cada jugador (una por jugador, en
 *     orden de asiento), también la de los que quedaron fuera en rondas anteriores.
 *   · `tiradasDelTurno` vuelve a 0 en cada relevo: es el sello de los dados de ESTE
 *     turno y sumado a `100 · turnosAbiertos` sigue siendo único.
 *   · Un acreedor que ya quebró cobra el Ayuntamiento: la deuda no se pierde, se destruye.
 *   · La quiebra de quien puja en una subasta abierta (RENDIRSE cabe en cualquier
 *     momento) lo saca de `enPie`; si era el mejor postor, la puja vuelve a cero.
 *   · `encuadre` se importa de `malla-hexagonal.ts` (donde vive) y no de `anillo.ts`.
 *   · Dentro de un trato, los Salvoconductos que se dan son los PRIMEROS de la lista del que
 *     los da; como hay uno por mazo, nadie puede recibir dos del mismo mazo.
 *   · El botín de la refriega (`arcade:botin`, lo mete el servidor) se lleva como mucho
 *     `MRS_DEL_BOTIN` de la bolsa de quien cae, nunca abre un apuro, y NO se aplica —mismo
 *     estado— con una subasta o un apuro en la mesa, abiertos o en cola. Un quebrado ni lo da ni
 *     lo recibe. Ver `elBotin`.
 *
 * ═══ LAS CUATRO REGLAS OFICIALES QUE FALTABAN, Y CÓMO SE CIERRAN ═══
 *
 * `docs/burgo/DISENO-3.md` §12 las daba por fuera de alcance y volvieron a entrar. Las
 * cuatro tocan el mismo sitio —quién puede hacer qué y cuándo— y por eso se escriben
 * aquí juntas, con los bordes que hubo que decidir y el fallo que cada borde evita:
 *
 *   1. OBRAR FUERA DEL PROPIO TURNO. Alzar, vender, hipotecar y deshipotecar se hacen
 *      EN CUALQUIER MOMENTO, también durante el turno de otro: es la mitad de la
 *      táctica del juego (alzar de golpe antes de que el rival caiga en tu barrio) y
 *      sin ello un jugador de seis obraba una vez cada seis turnos. La guarda es
 *      `puedeObrarAhora` y deja fuera TRES momentos, que son los tres en los que la
 *      mesa espera UNA respuesta concreta con su plazo: la subasta abierta, el apuro
 *      abierto y la casilla sin resolver del que tiene el turno. Los dos primeros
 *      porque el dinero es lo que decide quién gana la puja y quién quiebra, y un pago
 *      de un tercero en medio cambia el resultado sin que a ese tercero le toque nada:
 *      ya está medido en la única puerta que queda abierta a eso —un trato aceptado
 *      durante una subasta puede dejar sin dinero al mejor postor, y por eso el cierre
 *      tiene una rama entera para ello—; el tercero porque `comprar` no cabe en `luego`
 *      y una obra que abre una subasta de la última casa se llevaría por delante la
 *      compra sin resolver. El endeudado sigue pudiendo vender e hipotecar durante su
 *      propio apuro (son las dos obras que dan dinero) y sigue sin poder alzar ni
 *      deshipotecar, que es lo de siempre y lo que dice el reglamento §9.
 *
 *   2. TRATOS ENTRE DOS CUALESQUIERA. `puedeProponer` exigía que uno de los dos tuviera
 *      el turno, y en el juego oficial no hace falta. Se abre. La CADUCIDAD al relevar
 *      se conserva, y ahora significa otra cosa: no «tus tratos mueren cuando dejas de
 *      tener el turno» sino «una propuesta vale para la vuelta en que se hizo». Se
 *      conserva por tres razones medidas: un trato es una foto de un tablero que cambia
 *      —y ahora cambia MÁS, porque cualquiera obra en cualquier momento—; el aviso de
 *      cada asiento enseña el trato pendiente, y un trato inmortal taparía para siempre
 *      lo que de verdad concierne a quien mira; y el tic no sabe contestar tratos, así
 *      que un ausente acumularía propuestas hasta el fin de la partida. Volver a
 *      proponer cuesta un gesto.
 *
 *   3. LA SUBASTA DE LA ÚLTIMA CASA (reglamento oficial de escasez). Antes, con el
 *      Ayuntamiento sin casas no se alzaba y ya está —«no hay casas», dicho en la
 *      ayuda—, y el primero que pulsaba se llevaba la última. Con la regla 1 eso deja
 *      de ser una rareza y pasa a ser una carrera: seis pueden pedir la misma casa en
 *      el mismo instante. Ahora, cuando queda UNA y hay al menos otro que podría
 *      alzarla, ALZAR no alza: abre una subasta por ese edificio, con el que la pidió
 *      abriendo la puja al PRECIO DE LISTA de su barrio (así, si los demás pasan, se la
 *      lleva por lo que le habría costado y nadie pierde nada por la regla nueva). Cada
 *      uno puja por SU solar —la almoneda apunta al solar del mejor postor— y nadie
 *      puede pujar por debajo del precio de casa de su propio barrio. Un solar por
 *      pujador y no una lista: el parejo obligatorio deja casi siempre un solo solar
 *      donde toca alzar, y una puerta por solar no cabe en el portillo, que busca UNA
 *      por tipo.
 *
 *   4. LA ELECCIÓN DEL 10 % EN EL IMPUESTO. El Impuesto oficial deja elegir entre la
 *      cantidad fija y el 10 % del patrimonio. Caer en él ya no cobra: enciende
 *      `impuestoSinPagar` —una marca del turno, como `dobles`— y ofrece los dos pagos
 *      mientras siga encendida. Quien TIRA o PASA sin elegir paga la fija, que es la que
 *      la casilla anuncia y la que el reglamento pone por defecto; el 10 % hay que
 *      pedirlo. El tic, que juega POR el ausente, paga lo más barato de los dos.
 *
 *      Una MARCA y no un PASO nuevo, y esto está medido: la traducción a la escena
 *      (`burgo-en-tres.ts`, que no es de esta tanda) normaliza a `por-tirar` cualquier
 *      paso que no conozca —los dados dirían que no se ha tirado cuando ya se tiró— y su
 *      robot de pruebas sólo sabe contestar a los pasos que ya existían: con un paso
 *      nuevo, la mesa por el cable se quedaba parada en 11 movimientos de los 30 que
 *      pide su comprobador. Con la marca, TIRAR y PASAR se siguen ofreciendo y son
 *      ellos los que cobran, así que ni la escena ni su robot notan la regla nueva.
 *
 *      Y con el Impuesto sin pagar SÍ se obra, que es lo contrario de lo que parecería:
 *      vender casas a mitad de precio para bajar la décima pierde 100 por ahorrar 20, e
 *      hipotecar no mueve el patrimonio ni un euro (quita medio precio en título y pone
 *      medio precio en efectivo). No hay nada que ganar, así que no hay nada que cerrar.
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
import { esBotin, leerElBotin } from './botin';
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
  decimaDelPatrimonio,
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
  gancho: 'Compra calles, cobra rentas, alza casas y hoteles; el último que no quiebra se queda con el Burgo.',
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
/** El Impuesto, con la elección dentro (`carga.como`): la cantidad fija o el 10 %. */
export const PAGAR_IMPUESTO = 'burgo:pagar-impuesto';
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
/** Cuántos Salvoconductos puede haber en una mano: uno por mazo. */
export const INDULTOS_QUE_EXISTEN = 2;
/** A partir de cuántas casillas un `mueve` por carta se anima como viaje y no como paseo. */
export const PASOS_DE_UN_PASEO = 12;
/**
 * LO QUE SE LLEVA EL BOTÍN DE LA REFRIEGA: hasta cien euros de quien cae, para quien lo tumbó.
 *
 * DINERO Y NO UN TÍTULO, aunque `docs/COMBATE-Y-BOTIN.md` §6 hablara de «propiedades del
 * Burgo» cuando todavía era una pregunta. Un título arrastra casas, hipotecas y el barrio entero
 * de quien lo tenía: pasarlo de un golpe desharía un barrio que alguien tardó la partida en
 * juntar, y lo dejaría con edificios en un barrio que ya no es entero. El dinero, en cambio, pasa
 * por una sola puerta que ya sabe moverlo sin romper nada (`transferirEntre`). Cien es lo que
 * cobra el Impuesto de Lujo: duele, y no deja a nadie en la calle, porque se lleva como mucho lo
 * que quien cae tenga en la bolsa y nunca abre una deuda. Ver `elBotin`.
 */
export const MRS_DEL_BOTIN = 100;

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
  | 'comprar' // cayó en un título sin dueño: comprar o mandarlo a subasta
  | 'almoneda' // hay una subasta abierta; turnoDe = almoneda.pujaDe
  | 'apuro' // alguien debe más de lo que tiene; turnoDe = apuro.quien
  | 'por-pasar'; // ya tiró y resolvió; puede obrar, tratar y pasar (con dobles no se llega aquí: se vuelve a `por-tirar`)

/** A qué paso vuelve el turno cuando se cierra comprar/subasta/apuro. */
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
  /** `LIBRE` (−1) libre; 0, 1, 2 = intentos fallidos hechos en la Comisaría. */
  readonly presa: number;
  /** Públicos: de qué mazo es cada uno (la serie se deduce: hay uno por mazo). */
  readonly indultos: readonly MazoId[];
  readonly quebrado: boolean;
  /** Pasos por la Salida (tope de vueltas). */
  readonly vueltas: number;
}

export interface TituloDelBurgo {
  /** 28 entradas en orden de casilla: 22 solares, 4 estaciones, 2 servicios. */
  readonly casilla: number;
  /** `null` = el Ayuntamiento. */
  readonly dueno: AsientoId | null;
  /** 0..4; `POSADA` (5) = hotel. */
  readonly casas: number;
  readonly empenado: boolean;
}

export interface AlmonedaDelBurgo {
  /** El título que se vende; en la del edificio, EL SOLAR DEL MEJOR POSTOR (cambia con cada puja). */
  readonly casilla: number;
  /**
   * `true` = se subasta el ÚLTIMO edificio del Ayuntamiento (casa u hotel, según las
   * casas que tenga ya el solar de cada puja); `false` = el título de `casilla`.
   *
   * Se mira SIEMPRE con `esAlmonedaDeObra`, que exige el `true` y no el `!== false`:
   * una mesa guardada de antes de esta regla no trae el campo, y `undefined` tiene que
   * leerse como la subasta de siempre.
   */
  readonly edificio: boolean;
  /** 0 = sin pujas. */
  readonly puja: number;
  /** El mejor postor. */
  readonly quienPuja: AsientoId | null;
  /** A quién se espera: es `turnoDe` mientras dure. */
  readonly pujaDe: AsientoId;
  /** Quienes NO han pasado, en orden de mesa. */
  readonly enPie: readonly AsientoId[];
  /** Quien la abrió: el dueño del turno en la del título, y el que pidió el edificio en la del edificio (que puede no tener el turno). */
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
  | 'sorteo'
  /** El botín de Boots on Board: lo que se lleva quien tumba a otro. Nunca es una deuda. */
  | 'refriega';

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
 * sabría si se pasó la Salida o se fue derecho a la Comisaría. Cada movimiento
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
  /** `casas` tras alzar (5 = hotel). */
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
  /** A qué paso vuelve el turno al cerrar comprar/subasta/apuro. */
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
  /** La quiebra al Ayuntamiento (y un título sin dueño pisado con apuro abierto) encola títulos, en orden de casilla. */
  readonly colaDeAlmonedas: readonly number[];
  readonly apuro: ApuroDelBurgo | null;
  /** «Cada jugador te paga 10» puede endeudar a varios. */
  readonly colaDeApuros: readonly ApuroDelBurgo[];
  readonly tratos: readonly TratoDelBurgo[];
  readonly siguienteTrato: number;
  /**
   * EL IMPUESTO PISADO Y NO PAGADO por el dueño del turno (regla 4).
   *
   * Es un dato del TURNO, como `dobles`: se enciende al caer en la casilla, se apaga al
   * cobrarlo y el relevo lo apaga por si acaso. No es un PASO —`comprar` y `almoneda` lo
   * son— y no lo es por una razón medida: la traducción a la escena normaliza cualquier
   * paso que no conozca a `por-tirar` y su robot de pruebas sólo sabe contestar a los
   * pasos que ya existían, así que un paso nuevo dejaba la mesa parada por el cable en
   * un fichero que no es de esta tanda (11 movimientos de 30, medido). Con la marca,
   * TIRAR y PASAR se siguen ofreciendo y son ellos los que cobran la cantidad fija si no
   * se eligió antes el 10 %.
   */
  readonly impuestoSinPagar: boolean;
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
    impuestoSinPagar: false,
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

/** ¿`asiento` tiene todos los solares del barrio? Los hipotecados cuentan como suyos. */
function barrioEntero(m: ConTitulos, asiento: AsientoId | null, barrio: BarrioDelBurgo | null): boolean {
  if (asiento === null || barrio === null) return false;
  for (const c of barrio.solares) {
    const t = tituloDe(m, c);
    if (t === null || t.dueno !== asiento) return false;
  }
  return true;
}

/** ¿Hay algún edificio en el barrio? Hipotecar y tratar exigen que no. */
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

/** Casas y hoteles de un jugador, para las reparaciones. */
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

/** Efectivo + precio de lo no hipotecado + mitad de lo hipotecado + coste de cada edificio (hotel = 5). */
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

/**
 * ═══ «¿PUEDO OBRAR AHORA?», ESCRITO UNA VEZ PARA EL ESTADO Y PARA LA VISTA ═══
 *
 * Desde que se obra fuera del propio turno, la pregunta ya no es «¿es mi turno y estoy
 * en un paso de obrar?» sino «¿está la mesa esperando UNA respuesta concreta de
 * alguien?». Eso lo contestan cinco datos que el estado y la vista tienen los dos, y se
 * copian a esta forma para que la guarda se escriba UNA vez: si el botón se encendiera
 * con una regla y el reductor rechazara con otra, el jugador vería un botón mudo, que
 * es el fallo que esta casa tiene apuntado como el más caro de encontrar.
 */
interface LaMesaAhora {
  readonly momento: MomentoDelBurgo;
  readonly paso: PasoDelTurno;
  readonly hayAlmoneda: boolean;
  readonly hayApuro: boolean;
  readonly duenoDelTurno: AsientoId | null;
}

function laMesaDelEstado(e: EstadoDelBurgo): LaMesaAhora {
  return {
    momento: e.momento,
    paso: e.paso,
    hayAlmoneda: e.almoneda !== null,
    hayApuro: e.apuro !== null,
    duenoDelTurno: duenoDelTurno(e),
  };
}

/**
 * ¿PUEDE `quien` ALZAR, VENDER, HIPOTECAR O DESHIPOTECAR AHORA MISMO?
 *
 * Cualquiera vivo, en el turno de cualquiera, SALVO en los tres momentos en que la mesa
 * espera una respuesta con plazo: una subasta abierta, un apuro abierto y el título sin
 * dueño que el dueño del turno acaba de pisar y aún no ha resuelto, que sólo él puede
 * resolver. El endeudado en su propio apuro va por otra puerta (`estoyEnMiApuro`):
 * vender e hipotecar sí, alzar y deshipotecar no.
 *
 * El Impuesto sin pagar NO cierra la puerta: vender casas a mitad de precio para bajar
 * la décima es una ruina (se pierden 100 por ahorrar 20) y una hipoteca no mueve el
 * patrimonio ni un euro —quita medio precio en título y pone medio precio en efectivo—,
 * así que no hay nada que ganar obrando antes de pagarlo.
 */
function puedeObrarAhora(m: LaMesaAhora, quien: AsientoId): boolean {
  if (m.momento !== 'jugando') return false;
  if (m.hayAlmoneda || m.paso === 'almoneda') return false;
  if (m.hayApuro || m.paso === 'apuro') return false;
  if (m.paso === 'comprar') return m.duenoDelTurno === quien;
  return true;
}

// ---------------------------------------------------------------------------
// El dinero: una sola puerta, todo o nada, y el apuro cuando no alcanza
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ TODO PAGO PASA POR `transferirEntre` ═══
 *
 * Un juego de solares mueve dinero en treinta sitios y el fallo de dinero no se
 * cae: se juega mal. Aquí hay UNA función que paga, apoyada en `hacienda.transferir`
 * (todo o nada, en enteros, con el Ayuntamiento como caja infinita), y es la única que
 * escribe `mrs`. Si quien paga no alcanza, no se mueve NADA y se abre —o se
 * engorda— su apuro: el reglamento §9 dice que quien no alcanza vende e hipoteca, no
 * que paga lo que puede. Un acreedor que ya quebró cobra el Ayuntamiento: la deuda no se
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
 * LA COLA DE SUBASTAS CON LA COMPRA SIN RESOLVER DENTRO, si es que hay una.
 *
 * Un `comprar` no cabe en `luego` —no se puede reanudar una compra con el dinero
 * cambiado— así que cuando algo interrumpe ese paso, el título sin dueño que el del
 * turno estaba mirando sale a subasta cuando la interrupción se cierre. Lo usan las
 * DOS cosas que pueden interrumpirlo: el apuro (que existe desde el primer commit) y
 * la subasta de la última casa (regla 3), y por eso está escrito aquí una sola vez.
 * En la casilla del Impuesto no hay título: devuelve la cola tal cual, y quien
 * interrumpa el Impuesto sin cobrarlo tiene un fallo — por eso no se le deja
 * interrumpir (`puedeObrarAhora`).
 */
function conLaCompraEncolada(e: EstadoDelBurgo): readonly number[] {
  if (e.paso !== 'comprar') return e.colaDeAlmonedas;
  const delTurno = jugadorEn(e, e.turno);
  if (delTurno === null) return e.colaDeAlmonedas;
  const t = tituloDe(e, delTurno.casilla);
  if (t === null || t.dueno !== null || e.colaDeAlmonedas.indexOf(delTurno.casilla) >= 0) return e.colaDeAlmonedas;
  return [...e.colaDeAlmonedas, delTurno.casilla];
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
     * cola de subastas y sale a subasta cuando el apuro se cierre.
     */
    let luego: PasoDeVuelta = e.luego;
    let colaDeAlmonedas = e.colaDeAlmonedas;
    if (e.paso === 'por-tirar' || e.paso === 'por-pasar') luego = e.paso;
    else colaDeAlmonedas = conLaCompraEncolada(e);
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
 * Transfiere `cuanto` de `de` a `a` (índices en `jugadores`; `null` = el Ayuntamiento).
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
  /* Un acreedor quebrado ya no está en la mesa: cobra el Ayuntamiento. */
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
 * ¿SE MOVIÓ DE VERDAD EL DINERO DE `i`, o el pago abrió un apuro y no se movió nada?
 *
 * Existe porque el «¿falló el pago?» estaba escrito como `s.apuro !== null`, y eso es
 * mentira en cuanto hay un apuro ABIERTO DE OTRO, que ya no es un caso imposible: al
 * cerrar la subasta del último edificio (regla 3) puede haber uno, porque quien se rinde
 * durante la puja deja a su heredero pagando el interés de las hipotecas que hereda y
 * eso puede abrirle el suyo. Con la comprobación vieja, el ganador de la puja habría
 * pagado su puja y se habría quedado sin edificio. Se mira el SALDO, que es lo único que
 * distingue un pago hecho de uno que no.
 */
function pagoHecho(antes: EstadoDelBurgo, despues: EstadoDelBurgo, i: number, cuanto: number): boolean {
  const a = jugadorEn(antes, i);
  const d = jugadorEn(despues, i);
  if (a === null || d === null) return false;
  const importe = Math.trunc(cuanto);
  return d.mrs === a.mrs - (importe > 0 ? importe : 0);
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
 * QUÉ PASO TOCA AHORA, después de cerrar un apuro, una subasta o una quiebra.
 *
 * Es la única función que decide el paso cuando algo se cierra, para que el orden
 * de precedencia esté escrito una vez: primero un apuro vigente, luego los apuros en
 * cola, luego una subasta abierta, luego las subastas en cola, luego el relevo si
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
// Mover, la Comisaría, las rentas, las cartas y resolver la casilla
// ---------------------------------------------------------------------------

/**
 * Mueve la figura de `i` hasta `hasta`, en sentido de la marcha (o hacia atrás si
 * `como === 'retrocede'`). Cobra la Salida al pasar o caer si `cobraAlPasar`,
 * y sube `vueltas`. Ir a la Comisaría NUNCA pasa por aquí: ver `aLaMazmorra`.
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

/** Los dados: `pasos` casillas hacia delante, cobrando la Salida. */
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
 * A la Comisaría, derecho: sin pasar por la Salida, sin cobrar, sin resolver.
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

/** Cómo se cobra una casilla: como siempre, el doble (carta de estación) o diez veces una tirada nueva (carta de servicio). */
type ModoDeRenta = 'normal' | 'doble' | 'x10';

/**
 * LA RENTA DE UN TÍTULO con la tirada dada. Hipotecado → 0. Solar sin casas: el doble
 * si el barrio es entero (aunque otro solar del barrio esté hipotecado: regla oficial).
 * Estaciones y servicios cuentan las HIPOTECADAS del dueño; sólo la hipotecada no cobra.
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
 * reglamento §4 lo dice así), salvo el Salvoconducto, que SALE del mazo y se queda en la
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

/** Los diez efectos de carta, uno por rama. Ninguna carta cae en Suerte ni en la Caja de Comunidad, así que la recursión es finita. */
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
 * caben dos pasos—, y entonces va a la cola de subastas. El dueño presa cobra igual;
 * el Ayuntamiento cobra la renta solo (reglamento §12).
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
    case 'diezmo': {
      /*
       * EL IMPUESTO NO SE COBRA AL CAER: SE ELIGE (regla 4). Se enciende la marca del
       * turno y se ofrecen los dos pagos; si no se elige, lo cobra TIRAR o PASAR por la
       * cantidad fija, que es la que la casilla anuncia. Con un apuro abierto NO se
       * elige y se cobra el fijo en el acto: el 10 % de un patrimonio que está a punto
       * de liquidarse no sería una elección, sino un descuento por deber dinero.
       * Sólo elige el DUEÑO DEL TURNO: aquí no cae nadie más.
       */
      if (e.apuro !== null || e.paso === 'apuro' || i !== e.turno) {
        return transferirEntre(e, i, null, fila.precio, 'diezmo', j.casilla, cronica);
      }
      return { ...e, impuestoSinPagar: true };
    }
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
// La subasta: una fase con relevo por asiento, un solo plazo por mesa
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ HAY RELEVO Y NO «TODOS A LA VEZ» ═══
 *
 * Porque la mesa tiene UN plazo, y `turnoDe` es lo único que lo reprograma. Con
 * pujas simultáneas habría que elegir a quién esperar, y el que no está bloquearía
 * la subasta para siempre. Con relevo, `pujaDe` rota entre los que siguen en pie,
 * el tic pasa por el ausente, y la subasta se cierra sola cuando queda uno en pie
 * y es el mejor postor, o cuando todos han pasado sin pujar.
 */

/** Abre la subasta de `casilla`: en pie todos los vivos desde el siguiente al dueño del turno, que va el último. */
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
    almoneda: { casilla, edificio: false, puja: 0, quienPuja: null, pujaDe: primero, enPie, abiertaPor: abiertaPor === null ? primero : abiertaPor },
    paso: 'almoneda',
    luego,
  };
}

/**
 * ABRE LA SUBASTA DEL ÚLTIMO EDIFICIO (regla 3), con `i` pujando ya el precio de lista.
 *
 * En pie van `i` y los demás vivos que TAMBIÉN podrían alzar ese mismo tipo de
 * edificio ahora mismo (barrio entero, parejo, sin hipotecas y con dinero para el
 * precio de lista): es lo más cerca que se puede estar del «los que quieran comprarla»
 * del reglamento sin preguntárselo a cada uno, que costaría una fase entera y un plazo
 * por cabeza. Si no hay ningún rival NO se abre nada y quien pidió alza como siempre:
 * una subasta de uno solo es un trámite que cuesta seis pases.
 *
 * El relevo empieza por el primer rival y `i` va el último, porque `i` ya ha pujado: si
 * todos pasan, se cierra sola y él se lleva la casa por lo que le habría costado.
 */
function abrirAlmonedaDeObra(e: EstadoDelBurgo, i: number, casilla: number, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  const fila = filaDe(casilla);
  const t = tituloDe(e, casilla);
  if (j === null || fila === null || t === null) return e;
  const posada = t.casas === POSADA - 1;
  const n = e.jugadores.length;
  const enPie: AsientoId[] = [];
  for (let paso = 1; paso <= n; paso++) {
    const k = (i + paso) % n;
    const otro = jugadorEn(e, k);
    if (otro === null || !estaVivo(e, k)) continue;
    if (k === i || solarDondeAlzaria(e, otro.asiento, otro.mrs, posada) >= 0) enPie.push(otro.asiento);
  }
  const primero = enPie[0];
  if (primero === undefined || enPie.length < 2) return e;
  cronica.push({ que: 'almoneda-abierta', casilla });
  cronica.push({ que: 'puja', quien: j.asiento, casilla, cuanto: fila.casa });
  const luego: PasoDeVuelta = e.paso === 'por-tirar' || e.paso === 'por-pasar' ? e.paso : e.luego;
  return {
    ...e,
    colaDeAlmonedas: conLaCompraEncolada(e),
    almoneda: { casilla, edificio: true, puja: fila.casa, quienPuja: j.asiento, pujaDe: primero, enPie, abiertaPor: j.asiento },
    paso: 'almoneda',
    luego,
  };
}

/** ¿Esta subasta es la del último edificio? El `=== true` es la migración: sin campo, es la del título. */
function esAlmonedaDeObra(a: AlmonedaDelBurgo): boolean {
  return a.edificio === true;
}

/** En la del edificio, ¿lo que se subasta es un hotel? Lo dicen las casas del solar del mejor postor. */
function esUnHotelLoQueSeSubasta(m: ConTitulos, a: AlmonedaDelBurgo): boolean {
  const t = tituloDe(m, a.casilla);
  return t !== null && t.casas === POSADA - 1;
}

/** La puja más baja que se admite ahora: `PUJA_MINIMA` sin pujas, la última más el paso después. */
function pujaMinimaDe(a: AlmonedaDelBurgo): number {
  return a.puja === 0 ? PUJA_MINIMA : a.puja + PASO_DE_PUJA;
}

/**
 * LA PUJA MÍNIMA DE ESTE PUJADOR POR ESTE SOLAR. En la del título es la de siempre; en
 * la del edificio, además, nunca por debajo del PRECIO DE LA CASA del barrio: el
 * Ayuntamiento no vende una casa de 200 por 60 porque el barrio del otro sea barato.
 * Los cuatro precios de casa (50, 100, 150, 200) son múltiplos del paso de puja, así
 * que el mínimo sigue siendo un múltiplo y la puerta sigue cuadrando.
 */
function pujaMinimaPara(a: AlmonedaDelBurgo, casilla: number): number {
  const base = pujaMinimaDe(a);
  if (!esAlmonedaDeObra(a)) return base;
  const fila = filaDe(casilla);
  const suelo = fila === null ? 0 : fila.casa;
  return base > suelo ? base : suelo;
}

/** El siguiente en pie después de `tras`, dando la vuelta; el primero si `tras` ya no está. */
function siguienteEnPie(enPie: readonly AsientoId[], tras: AsientoId): AsientoId | null {
  if (enPie.length === 0) return null;
  const donde = enPie.indexOf(tras);
  if (donde < 0) return enPie[0] as AsientoId;
  return enPie[(donde + 1) % enPie.length] as AsientoId;
}

/** Cierra la subasta si ya no hay a quién esperar: nadie en pie, o uno solo y es el mejor postor. */
function cerrarSiToca(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  const a = e.almoneda;
  if (a === null) return e;
  if (a.enPie.length === 0 || (a.enPie.length === 1 && a.enPie[0] === a.quienPuja)) return cerrarAlmoneda(e, cronica);
  return e;
}

/**
 * CIERRA LA SUBASTA: el mejor postor paga y se lleva el título; sin pujas, queda
 * en el Ayuntamiento. Si el postor ya no alcanza (un trato aceptado entre medias), el
 * título se queda en el Ayuntamiento: es el único cierre que no deja deuda. Después,
 * `reanudar` abre la siguiente de la cola o devuelve el turno a `luego`.
 */
function cerrarAlmoneda(e: EstadoDelBurgo, cronica: Cronica): EstadoDelBurgo {
  const a = e.almoneda;
  if (a === null) return e;
  let s: EstadoDelBurgo = { ...e, almoneda: null };
  if (esAlmonedaDeObra(a)) return cerrarLaObra(s, a, cronica);
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

/**
 * CIERRA LA SUBASTA DEL ÚLTIMO EDIFICIO: el mejor postor paga su puja y el edificio se
 * alza EN SU SOLAR, que es el que la almoneda lleva apuntado. Se revalida `puedeAlzar`
 * con el estado de ahora —entre la puja y el cierre pudo rendirse, o heredar la quiebra
 * de otro— y si ya no procede, el edificio se queda en el Ayuntamiento y no se cobra
 * nada: es el mismo cierre sin deuda que la subasta del título.
 */
function cerrarLaObra(estado: EstadoDelBurgo, a: AlmonedaDelBurgo, cronica: Cronica): EstadoDelBurgo {
  let s = estado;
  let ganador: AsientoId | null = null;
  let cuanto = 0;
  if (a.quienPuja !== null && a.puja > 0) {
    const k = indiceDelJugador(s, a.quienPuja);
    const j = jugadorEn(s, k);
    const t = tituloDe(s, a.casilla);
    if (j !== null && !j.quebrado && t !== null && j.mrs >= a.puja && puedeAlzar(s, j.asiento, j.mrs, a.casilla)) {
      const seraPosada = t.casas === POSADA - 1;
      const pagada = transferirEntre(s, k, null, a.puja, seraPosada ? 'posada' : 'casa', a.casilla, cronica);
      if (pagoHecho(s, pagada, k, a.puja)) {
        s = conTitulo(pagada, a.casilla, { casas: t.casas + 1 });
        s = seraPosada
          ? { ...s, casasEnElConcejo: s.casasEnElConcejo + (POSADA - 1), posadasEnElConcejo: s.posadasEnElConcejo - 1 }
          : { ...s, casasEnElConcejo: s.casasEnElConcejo - 1 };
        cronica.push({ que: 'alza', quien: j.asiento, casilla: a.casilla, casas: t.casas + 1 });
        ganador = j.asiento;
        cuanto = a.puja;
      }
    }
  }
  cronica.push({ que: 'almoneda-cerrada', casilla: a.casilla, ganador, cuanto });
  return reanudar(s, cronica);
}

/**
 * Una puja: `cuanto` entero, múltiplo del paso, no por debajo del mínimo ni por encima
 * de lo que se tiene. En la del título, `casilla` es la del título y no hay más; en la
 * del edificio es EL SOLAR DEL PUJADOR, que tiene que ser alzable ahora mismo y del
 * mismo tipo (casa u hotel) que el que se está subastando.
 */
function pujar(e: EstadoDelBurgo, i: number, casilla: number, cuanto: number, cronica: Cronica): EstadoDelBurgo {
  const a = e.almoneda;
  const j = jugadorEn(e, i);
  if (a === null || j === null || e.paso !== 'almoneda' || j.quebrado) return e;
  if (a.pujaDe !== j.asiento || a.enPie.indexOf(j.asiento) < 0) return e;
  if (esAlmonedaDeObra(a)) {
    const mio = tituloDe(e, casilla);
    const delMejor = tituloDe(e, a.casilla);
    if (mio === null || delMejor === null) return e;
    if ((mio.casas === POSADA - 1) !== (delMejor.casas === POSADA - 1)) return e;
    if (!puedeAlzar(e, j.asiento, j.mrs, casilla)) return e;
  } else if (a.casilla !== casilla) return e;
  if (!Number.isInteger(cuanto) || cuanto % PASO_DE_PUJA !== 0) return e;
  if (cuanto < pujaMinimaPara(a, casilla) || cuanto > j.mrs) return e;
  const pujaDe = siguienteEnPie(a.enPie, j.asiento);
  if (pujaDe === null) return e;
  cronica.push({ que: 'puja', quien: j.asiento, casilla, cuanto });
  const s: EstadoDelBurgo = { ...e, almoneda: { ...a, casilla, puja: cuanto, quienPuja: j.asiento, pujaDe } };
  return cerrarSiToca(s, cronica);
}

/** Pasar en la subasta: sale de `enPie` y el relevo sigue por donde iba. */
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
// Las obras: alzar, vender, hipotecar, deshipotecar (guardas sobre estado O vista)
// ---------------------------------------------------------------------------

/*
 * ═══ LAS GUARDAS SE ESCRIBEN UNA VEZ SOBRE «LO QUE SE MIRA» ═══
 *
 * `opciones()` recibe la VISTA y el reductor el ESTADO, y las reglas de qué se puede
 * alzar o hipotecar tienen que ser las mismas en los dos sitios o el botón se enciende
 * donde el reductor dice que no. Todo lo que estas guardas necesitan es público
 * —títulos, existencias del Ayuntamiento, el efectivo del que obra—, así que se escriben
 * sobre una forma que el estado y la vista comparten y se llaman desde los dos.
 */

/** Lo que las guardas de obra necesitan: los títulos y las existencias del Ayuntamiento. */
interface LoQueSeMira extends ConTitulos {
  readonly casasEnElConcejo: number;
  readonly posadasEnElConcejo: number;
}

/** ¿Puede `asiento`, con `mrs`, alzar una casa (o el hotel) en `casilla`? */
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

/**
 * EL SOLAR DONDE `asiento` ALZARÍA el edificio del tipo que se pide (hotel o casa): el
 * de menos casas y, a igualdad, el de casilla menor. `-1` si no hay ninguno.
 *
 * Es el criterio del PAREJO, que es el que manda: con el barrio parejo obligatorio, en
 * cuanto un solar va por detrás no hay elección posible, y cuando todos van iguales
 * cualquiera vale y hay que escoger uno de forma determinista. Lo usan la subasta del
 * último edificio (para saber quién más la quiere y por qué solar puja cada uno) y
 * `opciones()` (para ofrecerle a cada uno una puja por su solar).
 */
function solarDondeAlzaria(m: LoQueSeMira, asiento: AsientoId, mrs: number, posada: boolean): number {
  let mejor = -1;
  let menos = POSADA + 1;
  for (const c of TITULOS) {
    const t = tituloDe(m, c);
    if (t === null || t.dueno !== asiento) continue;
    if ((t.casas === POSADA - 1) !== posada) continue;
    if (t.casas >= menos || !puedeAlzar(m, asiento, mrs, c)) continue;
    menos = t.casas;
    mejor = c;
  }
  return mejor;
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

/** ¿Puede `asiento` hipotecar `casilla`? Propio, sin hipoteca, sin casas y con el barrio sin edificios. */
function puedeEmpenar(m: LoQueSeMira, asiento: AsientoId, casilla: number): boolean {
  const t = tituloDe(m, casilla);
  if (t === null || t.dueno !== asiento || t.empenado || t.casas > 0) return false;
  return !barrioConEdificios(m, barrioDe(casilla));
}

/** ¿Puede `asiento`, con `mrs`, deshipotecar `casilla`? */
function puedeDesempenar(m: LoQueSeMira, asiento: AsientoId, mrs: number, casilla: number): boolean {
  const t = tituloDe(m, casilla);
  const fila = filaDe(casilla);
  if (t === null || fila === null || t.dueno !== asiento || !t.empenado) return false;
  return mrs >= costeDeDesempeno(fila.precio);
}

/** Lo que cobra `asiento` por vender UN edificio de `casilla` (un hotel entero si no hay casas para degradarlo). */
function loQueDaVender(m: LoQueSeMira, casilla: number): number {
  const t = tituloDe(m, casilla);
  const fila = filaDe(casilla);
  if (t === null || fila === null) return 0;
  const porCasa = Math.floor(fila.casa / PARTES_DE_LA_CASA_AL_VENDER);
  if (t.casas === POSADA && m.casasEnElConcejo < POSADA - 1) return POSADA * porCasa;
  return porCasa;
}

/**
 * ¿QUEDA UNO SOLO DE ESTE EDIFICIO EN EL AYUNTAMIENTO? Es la escasez del reglamento
 * oficial, y lo que dispara la subasta de la regla 3.
 */
function elUltimoQueQueda(m: LoQueSeMira, posada: boolean): boolean {
  return posada ? m.posadasEnElConcejo === 1 : m.casasEnElConcejo === 1;
}

/** ¿Hay OTRO que también podría alzar ese mismo edificio ahora mismo? Es «varios lo quieren». */
function otroLoQuiere(e: EstadoDelBurgo, i: number, posada: boolean): boolean {
  for (const k of vivos(e)) {
    if (k === i) continue;
    const otro = jugadorEn(e, k);
    if (otro !== null && solarDondeAlzaria(e, otro.asiento, otro.mrs, posada) >= 0) return true;
  }
  return false;
}

function alzar(e: EstadoDelBurgo, i: number, casilla: number, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  const t = tituloDe(e, casilla);
  const fila = filaDe(casilla);
  if (j === null || t === null || fila === null || !puedeAlzar(e, j.asiento, j.mrs, casilla)) return e;
  const seraPosada = t.casas === POSADA - 1;
  /*
   * LA ÚLTIMA NO SE VENDE POR ORDEN DE LLEGADA: se subasta si algún otro también la
   * quiere. Si la subasta no llegara a abrirse —no hay dos en pie— se alza como siempre:
   * un `return e` aquí sería un botón que se ofrece y no hace nada.
   */
  if (elUltimoQueQueda(e, seraPosada) && otroLoQuiere(e, i, seraPosada)) {
    const subastada = abrirAlmonedaDeObra(e, i, casilla, cronica);
    if (subastada !== e) return subastada;
  }
  let s = transferirEntre(e, i, null, fila.casa, seraPosada ? 'posada' : 'casa', casilla, cronica);
  if (!pagoHecho(e, s, i, fila.casa)) return e;
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
  if (!pagoHecho(e, s, i, costeDeDesempeno(fila.precio))) return e;
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

/** Interés que paga quien RECIBE cada título hipotecado de un lado. */
function interesDeLosEmpenos(m: LoQueSeMira, titulos: readonly number[]): number {
  let total = 0;
  for (const c of titulos) {
    const t = tituloDe(m, c);
    const fila = filaDe(c);
    if (t !== null && fila !== null && t.empenado) total += interesDelEmpeno(fila.precio);
  }
  return total;
}

/**
 * ¿PUEDE `de` PROPONERLE AHORA A `a`? CUALQUIERA VIVO A CUALQUIERA VIVO (regla 2), con
 * el turno o sin él, hasta tres tratos abiertos por proponente. Nunca durante una
 * subasta: es el único momento en que un trato aceptado cambia quién gana la puja, y
 * eso ya tiene una rama entera en el cierre para los tratos que venían de antes.
 */
function puedeProponer(e: EstadoDelBurgo, de: number, a: number): boolean {
  if (e.momento !== 'jugando' || e.paso === 'almoneda' || e.almoneda !== null) return false;
  if (de === a || !estaVivo(e, de) || !estaVivo(e, a)) return false;
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

/** Mueve los `cuantos` primeros Salvoconductos de `de` a `a`. */
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
 * ahora, cobra el interés de cada hipoteca que cambia de mano, y borra ese trato y
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
  if (mrsDeA < interesDeA) return rechazar(e, 'No te alcanza para el interés de las hipotecas.');
  if (mrsDeDe < interesDeDe) return rechazar(e, 'A la otra parte no le alcanza para el interés de las hipotecas.');

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
 * jugador que va antes en orden de mesa; el Ayuntamiento sólo si nadie reclama más que
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
 * QUIEBRA de `i` con un acreedor (jugador o Ayuntamiento).
 *
 * Los edificios se venden al Ayuntamiento por la mitad; con acreedor jugador ese dinero
 * y el efectivo van a él, y los títulos tal cual —los hipotecados siguen hipotecados y
 * el acreedor paga el interés de cada uno EN EL ACTO, o entra él en apuro con el
 * Ayuntamiento—; con el Ayuntamiento la caja se pierde, los títulos vuelven sin hipoteca y
 * salen a subasta uno por uno, y los Salvoconductos al fondo de su mazo. El quebrado
 * queda fuera con 0 €; sus tratos caducan; si pujaba, sale de la subasta. Después,
 * `puedeHaberAcabado` y `reanudar`, que hace el relevo si el turno era suyo.
 */
function quebrar(e: EstadoDelBurgo, i: number, acreedor: number | null, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null || j.quebrado) return e;
  const aQuien = acreedor !== null && estaVivo(e, acreedor) && acreedor !== i ? acreedor : null;
  const ja = aQuien === null ? null : jugadorEn(e, aQuien);
  let s = e;
  let caja = 0;

  /* 1. Los edificios, al Ayuntamiento por la mitad. */
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

  /* 4. El interés de las hipotecas que recibe el acreedor, en el acto o en apuro. */
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

/** El número de tabla del Salvoconducto de cada mazo (hay uno por mazo): la serie que vuelve al fondo se deduce de él. */
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
    impuestoSinPagar: false,
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
    impuestoSinPagar: false,
  };
}

// ---------------------------------------------------------------------------
// EMPEZAR (con el sorteo dentro) y TIRAR (con dobles y Comisaría)
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
    impuestoSinPagar: false,
    topeDeVueltas: Number.isInteger(topeDeVueltas) && topeDeVueltas > 0 ? topeDeVueltas : 0,
    sorteoDeSalida: ultimas,
    azar,
    ganadores: [],
  };
  return conSucesos(s, cronica);
}

/**
 * TIRAR: dos dados encadenados. Libre: tres dobles seguidos mandan a la Comisaría
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
  /*
   * «Le toca a Bea» sólo vale para lo que SÓLO se hace con el turno. Desde que se obra,
   * se trata y se quiebra uno en cualquier momento (reglas 1 y 2), ese motivo sería
   * mentira en la mitad de los rechazos: quien intenta alzar donde no tiene el barrio
   * entero leería que el problema es el turno y volvería a intentarlo en el suyo.
   */
  if (!seHaceSinTurno(movimiento.tipo) && v.turnoDe !== null && v.turnoDe !== v.yo) {
    return `Eso ya no se puede hacer: le toca a ${nombreEnLaVista(v, v.turnoDe)}.`;
  }
  return 'Eso ya no se puede hacer: la mesa cambió entre que se pintó el botón y lo pulsaste.';
}

/** Los movimientos que no piden el turno: las cuatro obras, los cuatro tratos y la quiebra. */
function seHaceSinTurno(tipo: string): boolean {
  return (
    tipo === ALZAR ||
    tipo === VENDER ||
    tipo === EMPENAR ||
    tipo === DESEMPENAR ||
    tipo === PROPONER ||
    tipo === ACEPTAR ||
    tipo === RECHAZAR ||
    tipo === RETIRAR ||
    tipo === RENDIRSE
  );
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
  /*
   * EL BOTÍN, TAMBIÉN ANTES DEL PORTILLO y por lo mismo que el tic: lo mete el servidor con
   * `quien: null` cuando alguien cae en Boots on Board, nadie lo ofrece, y el portillo lo tiraría
   * siempre. Su lector es más estricto que el portillo. Ver `elBotin`.
   */
  if (esBotin(movimiento)) return elBotin(actual, movimiento.carga, ctx);

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
      /* Seguir jugando sin elegir es elegir la fija: se cobra antes de tocar los dados. */
      const cobrado = pagarElImpuesto(actual, yo, false, cronica);
      if (cobrado.apuro !== null) return cobrado;
      return tirar(cobrado, yo, cronica);
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
      if (casilla === null || !puedeObrarAhora(laMesaDelEstado(actual), j.asiento)) return actual;
      return alzar(actual, yo, casilla, cronica);
    }
    case VENDER: {
      const casilla = casillaDeLaCarga(carga);
      if (casilla === null || !puedeObrarQueDeDinero(actual, yo)) return actual;
      return vender(actual, yo, casilla, cronica);
    }
    case EMPENAR: {
      const casilla = casillaDeLaCarga(carga);
      if (casilla === null || !puedeObrarQueDeDinero(actual, yo)) return actual;
      return empenar(actual, yo, casilla, cronica);
    }
    case DESEMPENAR: {
      const casilla = casillaDeLaCarga(carga);
      if (casilla === null || !puedeObrarAhora(laMesaDelEstado(actual), j.asiento)) return actual;
      return desempenar(actual, yo, casilla, cronica);
    }
    case PAGAR_IMPUESTO: {
      const o = cargaComoObjeto(carga);
      const como = o === null ? null : o.como;
      if (como !== 'fijo' && como !== 'decima') return actual;
      if (!esElDelTurno || !sinInterrupcion || !actual.impuestoSinPagar) return actual;
      return pagarElImpuesto(actual, yo, como === 'decima', cronica);
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
      /* Igual que al tirar: pasar sin elegir paga la fija, y si no alcanza el apuro se queda el turno. */
      const cobrado = pagarElImpuesto(actual, yo, false, cronica);
      if (cobrado.apuro !== null) return cobrado;
      return relevo(cobrado, cronica);
    }
    case RENDIRSE: {
      const acreedor = actual.apuro !== null && actual.apuro.quien === j.asiento ? acreedorDe(actual, actual.apuro) : null;
      return quebrar(actual, yo, acreedor, cronica);
    }
    default:
      return actual;
  }
}

/** ¿Está `yo` en SU apuro? Es la única puerta que sigue abierta cuando la mesa espera una deuda. */
function estoyEnMiApuro(e: EstadoDelBurgo, yo: number): boolean {
  return e.paso === 'apuro' && e.apuro !== null && e.apuro.quien === asientoDe(e, yo);
}

/**
 * VENDER E HIPOTECAR: las dos obras que DAN dinero, y por eso son las únicas que el
 * endeudado puede hacer durante su propio apuro (reglamento §9). Cualquiera las hace
 * además cuando la mesa está tranquila, como las otras dos.
 */
function puedeObrarQueDeDinero(e: EstadoDelBurgo, yo: number): boolean {
  const asiento = asientoDe(e, yo);
  if (asiento === null) return false;
  return puedeObrarAhora(laMesaDelEstado(e), asiento) || estoyEnMiApuro(e, yo);
}

/**
 * EL IMPUESTO, con la elección hecha: la cantidad fija de la tabla o el 10 % del
 * patrimonio, que se cuenta con `patrimonioDe` —el MISMO número que la vista publica y
 * que el rótulo del botón promete—. Si no alcanza, `transferirEntre` abre el apuro y
 * manda él sobre el paso. La marca se apaga en los dos casos: la deuda, si la hay, ya
 * está en el apuro, y dejarla encendida cobraría el Impuesto dos veces. Un 10 % de cero
 * es un pago de cero y también apaga la marca: si no, el turno se quedaría clavado.
 */
function pagarElImpuesto(e: EstadoDelBurgo, i: number, porLaDecima: boolean, cronica: Cronica): EstadoDelBurgo {
  const j = jugadorEn(e, i);
  if (j === null || !e.impuestoSinPagar) return e;
  const fila = filaDe(j.casilla);
  if (fila === null || fila.clase !== 'diezmo') return { ...e, impuestoSinPagar: false };
  const cuanto = porLaDecima ? decimaDelPatrimonio(patrimonioDe(e, j)) : fila.precio;
  const s = transferirEntre({ ...e, impuestoSinPagar: false }, i, null, cuanto, 'diezmo', j.casilla, cronica);
  return s.impuestoSinPagar ? { ...s, impuestoSinPagar: false } : s;
}

// ---------------------------------------------------------------------------
// EL BOTÍN DE LA REFRIEGA: lo único que entra en la mesa porque alguien cayó
// ---------------------------------------------------------------------------

/**
 * EL BOTÍN: `de` cayó en Boots on Board y `para` lo tumbó. Pasan hasta `MRS_DEL_BOTIN` euros de
 * uno a otro, por `transferirEntre` y con el motivo `'refriega'`, y nada más.
 *
 * ═══ SE RECHAZA CON MOTIVO LO QUE NO DEBIÓ LLEGAR ═══
 *
 * Lo mal formado, lo que manda un asiento, el de uno a sí mismo y quien no está sentado ya lo dice
 * `leerElBotin`. Lo que sólo sabe el juego lo dice esto: que la partida esté `jugando`, que los dos
 * jueguen ESTA partida —estar sentado no basta: quien se sentó después de empezar mira— y que
 * ninguno de los dos haya quebrado. Quien quiebra está fuera con cero euros; si fuera él quien
 * cobra, `transferirEntre` le pasaría el dinero al Ayuntamiento, que es lo que hace con un
 * acreedor quebrado, y el botín acabaría destruido en vez de robado.
 *
 * ═══ NUNCA ABRE UN APURO, Y NO POR SUERTE ═══
 *
 * Se lleva `min(lo que tenga, MRS_DEL_BOTIN)`, así que el pago siempre alcanza y la hacienda no
 * devuelve deuda. Un botín que endeudara a quien cae lo metería en un apuro que no ha pedido, con
 * su plazo y su `turnoDe`: le cambiaría el turno a la mesa entera por una pelea. Con cero euros no
 * hay nada que llevarse, y sale EL MISMO estado, sin nada en la crónica: la mesa lo cuenta como
 * movimiento que no cambió nada.
 *
 * ═══ Y NO SE APLICA CON UNA SUBASTA O UN APURO EN LA MESA (mismo estado) ═══
 *
 * Son los dos momentos de la regla 1 de la cabecera en los que la mesa espera UNA respuesta y el
 * dinero decide cuál: quién gana la puja y si el endeudado sale o quiebra. Por eso ahí no obra
 * nadie más que el implicado, y un botín es exactamente «un pago de un tercero en medio». Mirado
 * caso a caso, no rompería la máquina de pasos —el cierre de la subasta ya aguanta a un postor que
 * se quedó sin dinero— pero sí la dejaría INCOHERENTE en el apuro: el endeudado que cobra un botín
 * puede quedar con dinero de sobra para pagar y seguir en apuro, porque `saldar` sólo corre cuando
 * vende o hipoteca; y llamarlo desde aquí cerraría el apuro y cambiaría el paso, que es lo que un
 * botín no puede hacer. Lo más simple y correcto es no tocar el dinero mientras dure cualquiera de
 * las dos cosas, abierta o en cola (`elDineroEstaEnVilo`). En la compra sin resolver, en la
 * Comisaría y con el Impuesto por elegir SÍ se aplica: ninguno de los tres ha comprometido dinero
 * todavía. Si después no alcanza, el botón de comprar o de la fianza deja de ofrecerse —se saca a
 * subasta, se prueba con los dados— o el pago abre su apuro, como cualquier pago de siempre.
 *
 * ═══ LO QUE NO TOCA ═══
 *
 * Ni el turno, ni el paso, ni `luego`, ni los dobles, ni la tirada, ni el tope de vueltas, ni los
 * tratos: la mesa reprograma su plazo cuando cambia `turnoDe`, y un botín que lo moviera le daría o
 * le quitaría tiempo a quien juega sin que jugara nadie. Sube `jugada` y sustituye `sucesos`, que
 * es como cierra cualquier cambio: así la escena anima las monedas de uno a otro y el pregón lo
 * cuenta —«Ana le quita 100 € a Bruno en la refriega.»—. Un trato que prometía dinero que ya no
 * está se contesta con el motivo de siempre al aceptarlo, y caduca en el relevo.
 */
function elBotin(e: EstadoDelBurgo, carga: unknown, ctx: ContextoMovimiento): EstadoDelBurgo | Rechazo<EstadoDelBurgo> {
  const botin = leerElBotin(carga, ctx.quien, ctx.asientos);
  if (botin === null) return rechazar(e, 'Ese botín no vale: lo mete la mesa, entre dos sentados que no sean el mismo.');
  if (e.momento === 'reuniendo') return rechazar(e, 'La partida no ha empezado: todavía no hay botín.');
  if (e.momento !== 'jugando') return rechazar(e, 'La partida ya ha terminado: ya no hay botín.');
  const de = indiceDelJugador(e, botin.de);
  const para = indiceDelJugador(e, botin.para);
  if (de === NADIE || para === NADIE) return rechazar(e, 'Ese botín es de alguien que no juega esta partida.');
  if (!estaVivo(e, de) || !estaVivo(e, para)) return rechazar(e, 'Quien ha quebrado ya no juega: ni da ni se lleva botín.');
  if (elDineroEstaEnVilo(e)) return e;

  const j = jugadorEn(e, de) as JugadorDelBurgo;
  const cuanto = j.mrs < MRS_DEL_BOTIN ? j.mrs : MRS_DEL_BOTIN;
  if (cuanto <= 0) return e;
  const cronica: Cronica = [];
  const s = transferirEntre(e, de, para, cuanto, 'refriega', j.casilla, cronica);
  /* No puede fallar —`cuanto` cabe en la bolsa—, y si fallara no se escribe ni un suceso de algo que no pasó. */
  if (!pagoHecho(e, s, de, cuanto)) return e;
  return conSucesos(s, cronica);
}

/**
 * ¿ESTÁ LA MESA DECIDIENDO ALGO CON EL DINERO DE ALGUIEN? Una subasta o un apuro, abiertos o en
 * cola. Se mira el paso Y los campos, y las dos colas, porque entre un cierre y el `reanudar` que lo
 * sigue pueden no coincidir, y aquí basta con que cualquiera de los seis diga que sí.
 */
function elDineroEstaEnVilo(e: EstadoDelBurgo): boolean {
  if (e.paso === 'almoneda' || e.paso === 'apuro') return true;
  if (e.almoneda !== null || e.apuro !== null) return true;
  return e.colaDeAlmonedas.length > 0 || e.colaDeApuros.length > 0;
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
 *     más casas (empate: casilla más alta), hipoteca el título de mayor precio (empate:
 *     casilla más alta), y si con todo no llega, quiebra con su acreedor.
 *   · `comprar` → a subasta; y si lo que falta por resolver es el Impuesto, lo paga
 *     por el camino más barato de los dos.
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
   * ═══ LA SUBASTA Y EL APURO SE MIRAN ANTES QUE «EL DEL TURNO YA NO JUEGA» ═══
   *
   * Aquí `!estaVivo(e, e.turno)` iba EL PRIMERO y dejaba la mesa muerta en el caso
   * más previsible de todos: quien quiebra CON EL AYUNTAMIENTO durante su propio turno
   * deja sus veintiocho títulos en la cola de subastas, y `quebrar` abre la primera
   * sin tocar `turno` —el relevo llega después, cuando la cola se vacía—. Con el
   * turno apuntando a un quebrado, cada tic entraba por esta primera rama, llamaba a
   * `reanudar`, y `reanudar` con una subasta abierta devuelve EL MISMO objeto: el
   * tic no cambiaba nada, la subasta no avanzaba nunca y la mesa se quedaba
   * esperando para siempre a gente que no estaba. Medido: cuatrocientos tics para
   * cerrar UNA de las veintiocho subastas, y las veintisiete restantes intactas.
   *
   * La subasta y el apuro no son del dueño del turno —tienen su propio `pujaDe` y
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
  } else if (e.impuestoSinPagar) {
    /*
     * EL AUSENTE PAGA EL IMPUESTO Y LO QUE MENOS LE CUESTA, y es LO ÚNICO que hace este
     * tic: un tic hace una cosa. Lo más barato porque es lo que él elegiría —el tic
     * juega por él, no contra él— y a igualdad la fija, que no depende de contar el
     * patrimonio. Va ANTES que tirar o pasar porque si no, el tic que tira cobraría la
     * fija de camino y la elección del ausente se perdería sin que nadie la viera.
     */
    const j = jugadorEn(e, e.turno) as JugadorDelBurgo;
    const fila = filaDe(j.casilla);
    const fija = fila === null ? 0 : fila.precio;
    s = pagarElImpuesto(e, e.turno, decimaDelPatrimonio(patrimonioDe(e, j)) < fija, cronica);
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
  /** 0..4; 5 = hotel. */
  readonly casas: number;
  readonly empenado: boolean;
  /** Derivado. */
  readonly barrioEntero: boolean;
  /** Lo que cobraría hoy con la última tirada (0 sin dueño o hipotecado); derivado. */
  readonly rentaAhora: number;
}

export interface AlmonedaVista {
  readonly casilla: number;
  /** `true` = se subasta el último edificio del Ayuntamiento y `casilla` es el solar del mejor postor. */
  readonly edificio: boolean;
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
  /** El dueño del turno pisó el Impuesto y todavía no lo ha pagado: puede elegir el 10 %. */
  readonly impuestoSinPagar: boolean;
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

/** «1.500 €». Sin regex ni `toLocaleString`: el separador es siempre el punto. */
export function maravedies(n: number): string {
  const negativo = n < 0;
  let entero = String(Math.trunc(Math.abs(n)));
  let cola = '';
  while (entero.length > 3) {
    cola = `.${entero.slice(entero.length - 3)}${cola}`;
    entero = entero.slice(0, entero.length - 3);
  }
  return `${negativo ? '-' : ''}${entero}${cola} €`;
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
  if (asiento === null) return 'el Ayuntamiento';
  const j = jugadorVisto(v, asiento);
  return j === null || j.nombre.length === 0 ? asiento : j.nombre;
}

/**
 * Cómo se llama `porque` cuando se cuenta un pago.
 *
 * SE EXPORTA, y es la razón por la que no hay una segunda tabla: la traducción a pantalla
 * (`burgo-en-tres.ts`) enseña las deudas del apuro y sin esto decía «Le debes 350 € a Ana» —el
 * renglón que se lee mientras corre la cuenta atrás, y el que menos puede costar una segunda
 * lectura—. Escribir allí «de renta», «del Impuesto», «de interés de la hipoteca» otra vez sería
 * el segundo sitio donde se redacta lo mismo, que es como empiezan a decir cosas distintas.
 */
export function porqueEnPalabras(porque: PorqueDelDinero): string {
  switch (porque) {
    case 'renta':
      return 'de renta';
    case 'puerta-mayor':
      return 'por pasar la Salida';
    case 'carta':
      return 'por la carta';
    case 'diezmo':
      return 'del Impuesto sobre el Capital';
    case 'alcabala':
      return 'del Impuesto de Lujo';
    case 'fianza':
      return 'de fianza';
    case 'compra':
      return 'por la compra';
    case 'almoneda':
      return 'por la subasta';
    case 'casa':
      return 'por la casa';
    case 'posada':
      return 'por el hotel';
    case 'venta':
      return 'por la venta';
    case 'empeno':
      return 'por la hipoteca';
    case 'desempeno':
      return 'por deshipotecar';
    case 'interes':
      return 'de interés de la hipoteca';
    case 'trato':
      return 'por el trato';
    case 'quiebra':
      return 'de la quiebra';
    case 'reparaciones':
      return 'de reparaciones';
    case 'sorteo':
      return 'del sorteo';
    case 'refriega':
      return 'en la refriega';
    default:
      return '';
  }
}

/**
 * LAS CASILLAS QUE EN ESTE CAMBIO SON (O ACABAN DE SER) SUBASTA DE EDIFICIO.
 *
 * Los sucesos de la subasta —`almoneda-abierta`, `puja`, `almoneda-cerrada`— son los
 * mismos para el título y para el último edificio, y a propósito: un miembro más en
 * `SucesoDelBurgo` obliga a tocar la coreografía de la escena y su comprobador, que no
 * son de esta tanda. Lo que distingue a una de otra no cabe en el suceso, pero sí está
 * en el estado: la subasta abierta dice si es de obra, y una cerrada dejó un `alza` en
 * el mismo cambio y en la misma casilla. Con eso, la crónica dice «el edificio» donde
 * hay que decirlo y no «se lleva la Calle del Teatro» cuando lo que se llevó fue una casa.
 */
function casillasDeObraSubastadas(e: EstadoDelBurgo): number[] {
  const salida: number[] = [];
  if (e.almoneda !== null && esAlmonedaDeObra(e.almoneda)) salida.push(e.almoneda.casilla);
  for (const s of e.sucesos) if (s.que === 'alza' && salida.indexOf(s.casilla) < 0) salida.push(s.casilla);
  return salida;
}

/**
 * «a Ana» o «al Ayuntamiento», con la contracción hecha.
 *
 * `a el` no se escribe en castellano, y la crónica lo escribía cada vez que alguien pagaba al
 * Ayuntamiento o quebraba con él: «Diego paga 120 € por la subasta a el Ayuntamiento», visto
 * en una mesa de verdad el 16-sep-2026. `null` ES el Ayuntamiento en todo este fichero, así que
 * la decisión se toma por el asiento y no mirando si el nombre empieza por «el»: un jugador que
 * se llame «El Pícaro» se escribe «a El Pícaro», con mayúscula y sin contraer.
 */
function aQuienRecibe(a: AsientoId | null, nombre: (a: AsientoId | null) => string): string {
  return a === null ? 'al Ayuntamiento' : `a ${nombre(a)}`;
}

/** Una frase por suceso; `''` para los que no se cuentan en la crónica. `deObra` sólo lo miran los tres de la subasta. */
function fraseDe(s: SucesoDelBurgo, nombre: (a: AsientoId | null) => string, deObra: (casilla: number) => boolean = () => false): string {
  switch (s.que) {
    case 'sale':
      return '';
    case 'empieza':
      return `${nombre(s.quien)} sale primero.`;
    case 'tira':
      return `${nombre(s.quien)} saca ${s.dados[0]} y ${s.dados[1]}${s.dobles ? ', dobles' : ''}.`;
    case 'mueve':
      return `${nombre(s.quien)} ${s.como === 'retrocede' ? 'retrocede hasta' : 'llega a'} ${nombreDeCasilla(s.hasta)}${
        s.porLaPuertaMayor ? ' pasando por la Salida' : ''
      }.`;
    case 'cobra':
      return s.de === null ? `${nombre(s.quien)} cobra ${maravedies(s.cuanto)} ${porqueEnPalabras(s.porque)}.` : '';
    case 'paga':
      /*
       * EL BOTÍN NO ES UN PAGO: nadie paga una refriega, se la quitan. Con la frase de siempre
       * saldría «Bruno paga 100 € en la refriega a Ana», que se lee como si Bruno hubiera
       * elegido algo. Se cuenta desde quien se lo lleva, y el `cobra` de al lado calla como
       * calla todo cobro entre dos jugadores: la frase es una por pago, no dos.
       */
      if (s.porque === 'refriega') {
        return `${nombre(s.a)} le quita ${maravedies(s.cuanto)} a ${nombre(s.quien)} en la refriega.`;
      }
      return `${nombre(s.quien)} paga ${maravedies(s.cuanto)} ${porqueEnPalabras(s.porque)} ${aQuienRecibe(s.a, nombre)}.`;
    case 'compra':
      return `${nombre(s.quien)} compra ${nombreDeCasilla(s.casilla)} por ${maravedies(s.cuanto)}.`;
    case 'alza':
      return s.casas === POSADA
        ? `${nombre(s.quien)} alza un hotel en ${nombreDeCasilla(s.casilla)}.`
        : `${nombre(s.quien)} alza la ${ordinal(s.casas)} casa en ${nombreDeCasilla(s.casilla)}.`;
    case 'vende':
      return `${nombre(s.quien)} vende al Ayuntamiento en ${nombreDeCasilla(s.casilla)}.`;
    case 'empena':
      return `${nombre(s.quien)} hipoteca ${nombreDeCasilla(s.casilla)}.`;
    case 'desempena':
      return `${nombre(s.quien)} deshipoteca ${nombreDeCasilla(s.casilla)}.`;
    case 'carta': {
      const ficha = carta(s.mazo, s.carta);
      const de = s.mazo === 'pregon' ? 'de Suerte' : 'de la Caja de Comunidad';
      return `${nombre(s.quien)} saca ${de}: «${ficha === null ? '' : ficha.titulo}».`;
    }
    case 'tirada-de-oficio':
      return `${nombre(s.quien)} tira para el servicio: ${s.dados[0]} y ${s.dados[1]}.`;
    case 'a-la-mazmorra':
      return `${nombre(s.quien)} va a comisaría${s.porque === 'tres-dobles' ? ' por tres dobles seguidos' : ''}.`;
    case 'sale-de-la-mazmorra':
      return `${nombre(s.quien)} sale de la Comisaría${
        s.como === 'fianza' ? ' pagando la fianza' : s.como === 'indulto' ? ' con un Salvoconducto' : s.como === 'dobles' ? ' con dobles' : ''
      }.`;
    case 'sigue-presa':
      return `${nombre(s.quien)} sigue en la Comisaría (intento ${s.intento} de ${INTENTOS_EN_LA_MAZMORRA}).`;
    case 'almoneda-abierta':
      return deObra(s.casilla)
        ? `Se subasta el último edificio del Ayuntamiento; ahora mismo iría a ${nombreDeCasilla(s.casilla)}.`
        : `Sale a subasta ${nombreDeCasilla(s.casilla)}.`;
    case 'puja':
      return deObra(s.casilla)
        ? `${nombre(s.quien)} puja ${maravedies(s.cuanto)} por el edificio, para ${nombreDeCasilla(s.casilla)}.`
        : `${nombre(s.quien)} puja ${maravedies(s.cuanto)} por ${nombreDeCasilla(s.casilla)}.`;
    case 'pasa-puja':
      return `${nombre(s.quien)} pasa en la subasta.`;
    case 'almoneda-cerrada':
      if (deObra(s.casilla)) {
        return s.ganador === null
          ? 'El edificio se queda en el Ayuntamiento.'
          : `${nombre(s.ganador)} se lleva el edificio por ${maravedies(s.cuanto)}.`;
      }
      return s.ganador === null
        ? `${nombreDeCasilla(s.casilla)} se queda en el Ayuntamiento.`
        : `${nombre(s.ganador)} se lleva ${nombreDeCasilla(s.casilla)} por ${maravedies(s.cuanto)}.`;
    case 'apuro':
      return `${nombre(s.quien)} debe ${maravedies(s.debe)} y no le alcanza: en apuro.`;
    case 'quiebra':
      return `${nombre(s.quien)} quiebra; todo lo suyo pasa ${aQuienRecibe(s.acreedor, nombre)}.`;
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
        ? `Se acabó: ${nombre(s.ganadores[0] as AsientoId)} se queda con el Burgo.`
        : `Se acabó: empate entre ${s.ganadores.map(nombre).join(', ')}.`;
    default:
      return '';
  }
}

/** Cuántas frases del último cambio caben en la crónica. */
const FRASES_DEL_PREGON = 3;

/** La frase de la mesa: las últimas frases del último cambio. Nunca vacía en `jugando`. */
function redactarPregon(e: EstadoDelBurgo, nombre: (a: AsientoId | null) => string): string {
  if (e.momento === 'reuniendo') return 'La mesa se está reuniendo: cuando estéis todos, cualquiera puede empezar.';
  const deObra = casillasDeObraSubastadas(e);
  const frases: string[] = [];
  for (const s of e.sucesos) {
    const f = fraseDe(s, nombre, (casilla) => deObra.indexOf(casilla) >= 0);
    if (f.length > 0) frases.push(f);
  }
  const desde = frases.length > FRASES_DEL_PREGON ? frases.length - FRASES_DEL_PREGON : 0;
  const texto = frases.slice(desde).join(' ');
  if (texto.length > 0) return texto;
  const de = aQuienSeEspera(e);
  return de === null ? 'La partida ha terminado.' : `Se espera a ${nombre(de)}.`;
}

/**
 * LOS DOBLES, DICHOS EN EL PASO EN QUE DE VERDAD SE VUELVE A TIRAR.
 *
 * Con dobles, `tirar` deja el turno en `por-tirar` (`luego = 'por-tirar'`), no en `por-pasar`.
 * Las frases de los dobles —«Dobles: vuelve a tirar.» en el aviso, «Volver a tirar (dobles)» en
 * el botón, «vuelve a tirar…» en la espera— colgaban de `por-pasar` con dobles, un paso al que no
 * lleva ninguna tirada, y no salieron nunca: quien sacaba dobles leía «Te toca tirar.», lo mismo
 * que al empezar un turno, y al tercero la Comisaría llegaba sin una palabra fuera de la crónica.
 * La regla estaba en el reductor desde el principio, pero no se veía, y el 17-sep-2026 Miguel la
 * dio por olvidada. Las frases se escriben aquí UNA vez y las usan el aviso y el botón, en
 * `por-tirar` y en `por-pasar`, que el tic y TIRAR siguen aceptando.
 */
function avisoDeLosDobles(dobles: number): string {
  return dobles >= DOBLES_QUE_ENCIERRAN - 1
    ? 'Dobles otra vez: vuelve a tirar. Si vuelven a salir dobles, vas a la Comisaría sin mover.'
    : 'Dobles: vuelve a tirar. Si sacas tres dobles seguidos, vas a la Comisaría sin mover.';
}

/** La ayuda del botón de volver a tirar: lo mismo que el aviso, dicho desde el botón. */
function ayudaDeLosDobles(dobles: number): string {
  return dobles >= DOBLES_QUE_ENCIERRAN - 1
    ? 'Llevas dos dobles seguidos: si vuelven a salir, vas a la Comisaría sin mover.'
    : 'Sacaste dobles: tiras otra vez. Tres dobles seguidos te llevan a la Comisaría sin mover.';
}

/**
 * ¿ACABA `quien` DE IR A LA COMISARÍA POR TRES DOBLES, en este mismo cambio? Se mira en los
 * sucesos porque el estado no guarda por qué se entró: la casilla 30, una carta y el tercer doble
 * dejan la misma celda. Con el siguiente cambio los sucesos son otros y el aviso vuelve a ser el
 * de siempre, que es lo que tiene que durar: la explicación es de ESE momento.
 */
function acabaDeIrPorTresDobles(e: EstadoDelBurgo, quien: AsientoId): boolean {
  return e.sucesos.some((s) => s.que === 'a-la-mazmorra' && s.quien === quien && s.porque === 'tres-dobles');
}

/** Lo que ME concierne ahora mismo. `''` para el espectador cuando no hay nada que decirle. */
function redactarAviso(e: EstadoDelBurgo, quien: QuienMira, nombre: (a: AsientoId | null) => string): string {
  if (quien === ESPECTADOR) return '';
  const i = indiceDelJugador(e, quien);
  if (e.momento === 'reuniendo') return 'Cuando estéis todos, cualquiera puede empezar la partida.';
  if (e.momento === 'terminada') return e.ganadores.indexOf(quien) >= 0 ? 'Te quedas con el Burgo.' : '';
  const j = jugadorEn(e, i);
  if (j === null) return '';
  if (j.quebrado) return 'Has quebrado: miras la partida desde fuera.';
  if (e.paso === 'apuro' && e.apuro !== null && e.apuro.quien === quien) {
    return `Debes ${maravedies(sumaDeDeudasDel(e.apuro))}: vende, hipoteca o declárate en quiebra.`;
  }
  if (e.paso === 'almoneda' && e.almoneda !== null && e.almoneda.pujaDe === quien) {
    const a = e.almoneda;
    if (esAlmonedaDeObra(a)) {
      const mio = solarDondeAlzaria(e, j.asiento, j.mrs, esUnHotelLoQueSeSubasta(e, a));
      return mio < 0
        ? 'Se subasta el último edificio del Ayuntamiento y ya no te queda dónde ponerlo: pasa.'
        : `Se subasta el último edificio del Ayuntamiento: puja por ponerlo en ${nombreDeCasilla(mio)} (mínimo ${maravedies(pujaMinimaPara(a, mio))}) o pasa.`;
    }
    return `Te toca pujar por ${nombreDeCasilla(a.casilla)}: mínimo ${maravedies(pujaMinimaDe(a))}.`;
  }
  for (const t of e.tratos) {
    if (t.a === quien) return `${nombre(t.de)} te propone un trato.`;
  }
  if (aQuienSeEspera(e) === quien) {
    if (e.impuestoSinPagar) {
      const fila = filaDe(j.casilla);
      const fijo = fila === null ? 0 : fila.precio;
      return `${fila === null ? 'El Impuesto sobre el Capital' : fila.nombre}: paga ${maravedies(fijo)} o el 10 % de tu patrimonio (${maravedies(decimaDelPatrimonio(patrimonioDe(e, j)))}). Si tiras o pasas sin elegir, se cobra ${maravedies(fijo)}.`;
    }
    if (e.paso === 'por-tirar') {
      if (j.presa >= 0) {
        return `Estás en la Comisaría: paga la fianza, usa un Salvoconducto o prueba con los dados (intento ${j.presa + 1} de ${INTENTOS_EN_LA_MAZMORRA}).`;
      }
      return e.dobles > 0 ? avisoDeLosDobles(e.dobles) : 'Te toca tirar.';
    }
    if (e.paso === 'comprar') {
      const fila = filaDe(j.casilla);
      return fila === null
        ? 'Puedes comprar o sacar a subasta.'
        : `Puedes comprar ${fila.nombre} por ${maravedies(fila.precio)}, o sacarla a subasta.`;
    }
    if (e.paso === 'por-pasar') {
      if (e.dobles > 0) return avisoDeLosDobles(e.dobles);
      return acabaDeIrPorTresDobles(e, quien)
        ? 'Tres dobles seguidos: a la Comisaría sin mover. Puedes obrar, tratar o pasar el turno.'
        : 'Puedes obrar, tratar o pasar el turno.';
    }
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
  const nombre = (a: AsientoId | null): string => (a === null ? 'el Ayuntamiento' : comoSeLlama(sentados, a));
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
    /* `edificio` se normaliza al proyectar: una mesa guardada de antes de la regla 3 no lo trae, y la vista lo declara. */
    almoneda: e.almoneda === null ? null : { ...e.almoneda, edificio: esAlmonedaDeObra(e.almoneda), enCola: e.colaDeAlmonedas.length },
    apuro: e.apuro === null ? null : { ...e.apuro, debe: sumaDeDeudasDel(e.apuro), enCola: e.colaDeApuros.length },
    tratos: e.tratos,
    impuestoSinPagar: e.impuestoSinPagar === true,
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
    /* `edificio` se normaliza aquí: una vista de ayer no lo trae, y sin él la subasta es la del título. */
    almoneda: almoneda === null ? null : ({ ...almoneda, edificio: almoneda.edificio === true } as unknown as AlmonedaVista),
    apuro: apuro === null ? null : (apuro as unknown as ApuroVisto),
    tratos: v.tratos as TratoVisto[],
    impuestoSinPagar: v.impuestoSinPagar === true,
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

/**
 * Las obras que `yo` puede hacer ahora: en apuro sólo vender e hipotecar; el resto del
 * tiempo, las cuatro, CON TURNO O SIN ÉL (regla 1). Quien decide el «resto del tiempo»
 * no es esta función sino `puedeObrarAhora`, que la guarda en el único sitio desde el
 * que se la llama sin apuro; aquí sólo se decide QUÉ título admite cada obra.
 */
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
            ? `Alzar un hotel en ${fila.nombre} (${maravedies(fila.casa)})`
            : `Alzar la ${ordinal(t.casas + 1)} casa en ${fila.nombre} (${maravedies(fila.casa)})`,
          elUltimoQueQueda(m, seraPosada)
            ? 'Es el último que le queda al Ayuntamiento: si algún otro también puede alzarlo, sale a subasta y tu puja abre en este precio.'
            : seraPosada
              ? 'El hotel sustituye a las cuatro casas, que vuelven al Ayuntamiento.'
              : 'Barrio entero, por parejo y con casas en el Ayuntamiento.',
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
            ? `Vender ${m.casasEnElConcejo >= POSADA - 1 ? 'el hotel por cuatro casas' : 'el hotel entero'} de ${fila.nombre} (+${maravedies(da)})`
            : `Vender una casa de ${fila.nombre} (+${maravedies(da)})`,
          'El Ayuntamiento paga la mitad del precio de la casa; se quita de donde haya más.',
        ),
      );
    }
    if (puedeEmpenar(m, yo.asiento, c)) {
      salida.push(
        opcion(
          `empenar:${c}`,
          EMPENAR,
          { casilla: c },
          `Hipotecar ${fila.nombre} por ${maravedies(valorDeEmpeno(fila.precio))}`,
          'Un título hipotecado no cobra renta. Deshipotecar cuesta la hipoteca más el 10 %.',
        ),
      );
    }
    if (!enApuro && puedeDesempenar(m, yo.asiento, yo.mrs, c)) {
      salida.push(
        opcion(
          `desempenar:${c}`,
          DESEMPENAR,
          { casilla: c },
          `Deshipotecar ${fila.nombre} (${maravedies(costeDeDesempeno(fila.precio))})`,
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

/** Lo que la guarda de obrar mira, sacado de la VISTA: la otra mitad de `laMesaDelEstado`. */
function laMesaDeLaVista(v: VistaSinTablero): LaMesaAhora {
  return {
    momento: v.momento,
    paso: v.paso,
    hayAlmoneda: v.almoneda !== null,
    hayApuro: v.apuro !== null,
    duenoDelTurno: v.duenoDelTurno,
  };
}

/**
 * QUÉ PUEDE HACER `quien` AHORA MISMO, con lo que él sabe. Recibe la vista, jamás
 * el estado. `[]` al espectador, en `terminada` y a un quebrado. Lo que se hace SIN
 * turno —contestar tratos, LAS CUATRO OBRAS (regla 1), proponerle a cualquiera
 * (regla 2), obrar en el propio apuro y rendirse— va ANTES del `if (v.turnoDe !== quien)`,
 * que desde estas dos reglas sólo guarda lo que de verdad es del turno: los dados, la
 * casilla pisada, la puja y el pase.
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

  /*
   * LAS OBRAS, con turno o sin él (regla 1). En el propio apuro sólo las dos que dan
   * dinero; el resto del tiempo, las cuatro, siempre que la mesa no esté esperando una
   * respuesta con plazo (`puedeObrarAhora`, la misma guarda que usa el reductor).
   */
  const enMiApuro = v.paso === 'apuro' && v.apuro !== null && v.apuro.quien === quien;
  if (enMiApuro) for (const o of opcionesDeObra(v, yo, true)) salida.push(o);
  else if (puedeObrarAhora(laMesaDeLaVista(v), quien)) for (const o of opcionesDeObra(v, yo, false)) salida.push(o);

  /* Sin turno o con él: proponer un trato a cualquiera vivo (declaración). */
  if (v.paso !== 'almoneda' && v.almoneda === null && v.duenoDelTurno !== null) {
    const destinos: AsientoId[] = [];
    for (const j of v.jugadores) {
      if (j.quebrado || j.asiento === quien) continue;
      destinos.push(j.asiento);
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
        ayuda: 'Títulos sin edificios, euros y Salvoconductos, por lo que pidas. Caduca al cambiar el turno.',
      });
    }
  }

  if (v.turnoDe === quien) {
    /*
     * EL IMPUESTO, A ELEGIR (regla 4), y ANTES del paso: se pisa en `por-pasar` y, con
     * dobles, en `por-tirar`. Los dos rótulos dicen la cifra EXACTA que se va a cobrar,
     * y la del 10 % sale de `yo.patrimonio` —lo que la vista publica— pasado por la
     * misma cuenta que usa el reductor: si cada lado la escribiera por su cuenta, el
     * botón prometería una cosa y el cobro sería otra. La ayuda dice lo que pasa si no
     * se elige, porque tirar o pasar cobra la fija y eso no se puede deshacer.
     */
    if (v.impuestoSinPagar && v.almoneda === null && v.apuro === null) {
      const laDelImpuesto = filaDe(yo.casilla);
      const fijo = laDelImpuesto === null ? 0 : laDelImpuesto.precio;
      salida.push(
        opcion(
          'impuesto:fijo',
          PAGAR_IMPUESTO,
          { como: 'fijo' },
          `Pagar ${maravedies(fijo)} del Impuesto`,
          'La cantidad fija de la casilla, pase lo que pase con tu patrimonio. Es también lo que se cobra si tiras o pasas sin elegir.',
        ),
      );
      salida.push(
        opcion(
          'impuesto:decima',
          PAGAR_IMPUESTO,
          { como: 'decima' },
          `Pagar el 10 % de tu patrimonio (${maravedies(decimaDelPatrimonio(yo.patrimonio))})`,
          'Tu patrimonio es el efectivo más lo que valen tus títulos y tus edificios; los hipotecados, por la mitad. Elígelo ANTES de tirar o pasar.',
        ),
      );
    }
    if (v.paso === 'por-tirar') {
      if (yo.presa >= 0) {
        salida.push(
          opcion(
            'tirar',
            TIRAR,
            {},
            'Probar con los dados',
            `Con dobles sales y mueves sin repetir; si no, sigues en la Comisaría (intento ${yo.presa + 1} de ${INTENTOS_EN_LA_MAZMORRA}; al tercero pagas la fianza y mueves).`,
          ),
        );
        if (yo.mrs >= FIANZA) {
          salida.push(opcion('pagar-fianza', PAGAR_FIANZA, {}, `Pagar ${maravedies(FIANZA)} de fianza`, 'Sales y tiras con normalidad; con dobles repites.'));
        }
        if (yo.indultos > 0) {
          salida.push(opcion('usar-indulto', USAR_INDULTO, {}, 'Usar un Salvoconducto', 'Sales y tiras con normalidad; la carta vuelve al fondo de su mazo.'));
        }
      } else if (v.dobles > 0) {
        salida.push(opcion('tirar', TIRAR, {}, 'Volver a tirar (dobles)', ayudaDeLosDobles(v.dobles)));
      } else {
        salida.push(opcion('tirar', TIRAR, {}, 'Tirar los dados', 'Mueves lo que sumen; con dobles repites, y a los tres dobles seguidos, a comisaría.'));
      }
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
          opcion(`a-almoneda:${yo.casilla}`, A_ALMONEDA, { casilla: yo.casilla }, `Sacar ${fila.nombre} a subasta`, 'Pujan todos, tú también; sin pujas se queda en el Ayuntamiento.'),
        );
      }
    } else if (v.paso === 'almoneda') {
      const a = v.almoneda;
      if (a !== null && a.pujaDe === quien) {
        /*
         * POR QUÉ SÓLO UN SOLAR EN LA SUBASTA DEL EDIFICIO. Se puja por PONER el
         * edificio en un solar propio, y el portillo busca UNA puerta por tipo: con una
         * por solar, `estaOfrecido` se quedaría con la primera y las demás no se podrían
         * mandar. Se ofrece el solar que toca por parejo (`solarDondeAlzaria`), que con
         * el parejo obligatorio es casi siempre el único donde se puede alzar.
         */
        const deObra = esAlmonedaDeObra(a);
        const m = loQueSeMiraDe(v);
        const mio = deObra ? solarDondeAlzaria(m, yo.asiento, yo.mrs, esUnHotelLoQueSeSubasta(m, a)) : a.casilla;
        if (mio >= 0) {
          const fila = filaDe(mio);
          const nombre = deObra
            ? `el último edificio, para ${fila === null ? nombreDeCasilla(mio) : fila.nombre}`
            : fila === null
              ? nombreDeCasilla(mio)
              : fila.nombre;
          const minimo = pujaMinimaPara(a, mio);
          const fijas: { id: string; cuanto: number }[] = [{ id: 'pujar:minimo', cuanto: minimo }];
          for (const escalon of ESCALONES_DE_PUJA) fijas.push({ id: `pujar:+${escalon}`, cuanto: a.puja + escalon });
          const vistas: number[] = [];
          for (const f of fijas) {
            if (f.cuanto < minimo || f.cuanto > yo.mrs || vistas.indexOf(f.cuanto) >= 0) continue;
            vistas.push(f.cuanto);
            salida.push(opcion(f.id, PUJAR, { casilla: mio, cuanto: f.cuanto }, `Pujar ${maravedies(f.cuanto)} por ${nombre}`, `Mejor puja hasta ahora: ${maravedies(a.puja)}.`));
          }
          const maximo = topeDePuja(yo.mrs);
          if (maximo >= minimo) {
            salida.push({
              id: 'pujar',
              tipo: PUJAR,
              carga: { casilla: mio, minimo, maximo, escalon: PASO_DE_PUJA },
              declaracion: true,
              rotulo: `Pujar por ${nombre}`,
              ayuda: `Entre ${maravedies(minimo)} y ${maravedies(maximo)}, de ${PASO_DE_PUJA} en ${PASO_DE_PUJA}.`,
            });
          }
        }
        salida.push(
          opcion(
            'pasar-puja',
            PASAR_PUJA,
            { casilla: a.casilla },
            'Pasar en la subasta',
            deObra ? 'Ya no pujas por este edificio.' : 'Ya no pujas por este título.',
          ),
        );
      }
    } else if (v.paso === 'por-pasar') {
      if (v.dobles > 0) salida.push(opcion('tirar', TIRAR, {}, 'Volver a tirar (dobles)', ayudaDeLosDobles(v.dobles)));
      else salida.push(opcion('pasar', PASAR, {}, 'Pasar el turno', 'Tus tratos abiertos caducan al pasar.'));
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
        ? 'Todo lo tuyo vuelve al Ayuntamiento y sale a subasta. Quedas fuera de la partida.'
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
  if (lado.indultos > 0) partes.push(lado.indultos === 1 ? 'un Salvoconducto' : `${lado.indultos} Salvoconductos`);
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
/** Cuánto se oscurece el relleno de un título hipotecado (una quinta parte). */
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

/** La cifra de una cara: precio sin dueño, renta de hoy con dueño, «Hp» si hipotecado, «Ht» si hotel. */
function cifraDe(fila: CasillaDelBurgo, t: TituloVisto | null): string {
  if (t === null) return fila.precio > 0 ? String(fila.precio) : '';
  if (t.dueno === null) return String(fila.precio);
  const marca = t.empenado ? 'Hp ' : t.casas === POSADA ? 'Ht ' : '';
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
    case PAGAR_IMPUESTO:
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
    else if (j.presa >= 0) linea += ' · en la Comisaría';
    if (j.indultos > 0) linea += ` · ${j.indultos} ${j.indultos === 1 ? 'Salvoconducto' : 'Salvoconductos'}`;
    mesa.push(linea);
  }
  mesa.push(`El Ayuntamiento guarda ${v.concejo.casas} casas y ${v.concejo.posadas} hoteles.`);
  paneles.push({ titulo: 'La mesa', lineas: mesa });

  const mio: string[] = [];
  const yo = jugadorVisto(v, quien);
  if (yo === null) {
    mio.push('Miras la partida sin asiento.');
  } else {
    for (const c of yo.titulos) {
      const t = tituloVisto(v, c);
      if (t === null) continue;
      const edificios = t.casas === POSADA ? 'hotel' : t.casas === 0 ? 'sin casas' : `${t.casas} ${t.casas === 1 ? 'casa' : 'casas'}`;
      mio.push(`${nombreDeCasilla(c)}: ${edificios}${t.empenado ? ' · hipotecado' : ''} · renta ${maravedies(t.rentaAhora)}`);
    }
    if (mio.length === 0) mio.push('Todavía no tienes ningún título.');
    mio.push('Los tratos y la puja libre se hacen desde el tablero completo; aquí se puja por escalones.');
  }
  paneles.push({ titulo: 'Lo mío', lineas: mio });

  const ultima: string[] = [];
  if (v.ultimaCarta !== null) {
    const ficha = carta(v.ultimaCarta.mazo, v.ultimaCarta.carta);
    if (ficha !== null) {
      ultima.push(`${nombreEnLaVista(v, v.ultimaCarta.quien)} sacó ${v.ultimaCarta.mazo === 'pregon' ? 'de Suerte' : 'de la Caja de Comunidad'}: ${ficha.titulo}`);
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
    const queSeSubasta = esAlmonedaDeObra(a)
      ? `${esUnHotelLoQueSeSubasta(loQueSeMiraDe(v), a) ? 'El último hotel' : 'La última casa'} del Ayuntamiento, para ${nombreDeCasilla(a.casilla)}`
      : nombreDeCasilla(a.casilla);
    paneles.push({
      titulo: 'La subasta',
      lineas: [
        `${queSeSubasta} · ${a.quienPuja === null ? 'sin pujas' : `${maravedies(a.puja)} de ${nombreEnLaVista(v, a.quienPuja)}`}`,
        `Puja ${nombreEnLaVista(v, a.pujaDe)}. En pie: ${enPie.join(', ')}.`,
        a.enCola > 0 ? `${a.enCola} ${a.enCola === 1 ? 'título más en cola' : 'títulos más en cola'}.` : 'Ninguno más en cola.',
      ],
    });
  }

  if (v.apuro !== null) {
    const lineas: string[] = [`${nombreEnLaVista(v, v.apuro.quien)} debe ${maravedies(v.apuro.debe)}.`];
    for (const d of v.apuro.deudas) lineas.push(`${maravedies(d.cuanto)} ${aQuienRecibe(d.a, (x) => nombreEnLaVista(v, x))} ${porqueEnPalabras(d.porque)}.`);
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

/** El aviso del retablo: fin de partida, lo mío y la crónica, en ese orden. */
function avisoDe(v: VistaSinTablero): string {
  const partes: string[] = [];
  let cabeza = '';
  if (v.momento === 'terminada') {
    cabeza =
      v.ganadores.length === 1
        ? `Se acabó: ${nombreEnLaVista(v, v.ganadores[0] as AsientoId)} se queda con el Burgo.`
        : v.ganadores.length === 0
          ? 'Se acabó sin ganador.'
          : `Se acabó: empate entre ${v.ganadores.map((g) => nombreEnLaVista(v, g)).join(', ')}.`;
    partes.push(cabeza);
  }
  if (v.aviso.length > 0) partes.push(v.aviso);
  /*
   * ═══ LA CRÓNICA NO REPITE LO QUE EL AVISO YA HA DICHO ═══
   *
   * El aviso del tablero es cabeza + aviso + crónica, y dos de esas juntas decían lo mismo:
   * al terminar, la crónica cierra con la frase del suceso `fin`, que es LETRA A LETRA la
   * cabeza («Se acabó: Ana se queda con el Burgo. Te quedas con el Burgo. … Se acabó: Ana se
   * queda con el Burgo.», visto en una mesa de verdad el 16-sep-2026); y en la reunión aviso y
   * crónica dicen «cuando estéis todos, cualquiera puede empezar» con otras palabras. Así que al
   * terminar se quita de la crónica la frase ENTERA de la cabeza, y en la reunión la crónica
   * sólo sale para quien no tiene aviso (el espectador).
   */
  const pregon = v.momento === 'reuniendo' && v.aviso.length > 0 ? '' : sinLaFrase(v.pregon, cabeza);
  if (pregon.length > 0) partes.push(pregon);
  return partes.join(' ');
}

/**
 * `texto` sin la FRASE ENTERA `frase`, de principio de frase a su punto, dondequiera que esté.
 * Las frases de la crónica se juntan con un espacio, así que basta con mirar los bordes: una
 * frase más larga que empiece igual no se toca. ES2015 llano —sin `trimStart` ni lookbehind—,
 * porque este fichero corre también en Hermes.
 */
function sinLaFrase(texto: string, frase: string): string {
  if (frase.length === 0) return texto;
  let salida = texto;
  let desde = 0;
  for (;;) {
    const i = salida.indexOf(frase, desde);
    if (i < 0) return salida;
    const fin = i + frase.length;
    const empieza = i === 0 || salida.charAt(i - 1) === ' ';
    const acaba = fin === salida.length || salida.charAt(fin) === ' ';
    if (!empieza || !acaba) {
      desde = i + 1;
      continue;
    }
    const antes = salida.slice(0, i).replace(/\s+$/, '');
    const despues = salida.slice(fin).replace(/^\s+/, '');
    salida = antes.length === 0 ? despues : despues.length === 0 ? antes : `${antes} ${despues}`;
    desde = antes.length;
  }
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
