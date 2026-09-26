/**
 * UNA PARTIDA ENTERA, JUGADA POR UN ROBOT, QUE CORRE EN CUALQUIER MOTOR.
 *
 * ═══ PARA QUÉ EXISTE ESTE FICHERO APARTE ═══
 *
 * `verify:determinismo` compara el mismo reductor en Node y en Hermes. Para
 * compararlos hay que ejecutar LO MISMO en los dos, y «lo mismo» no puede ser el
 * comprobador: el comprobador lee ficheros, lanza procesos y usa `node:path`, y
 * nada de eso existe dentro de Hermes.
 *
 * Así que lo que corre en los dos motores es esto: un fichero que no importa nada
 * de `node:`, que no lee ni escribe, y que solo hace cuentas. Se empaqueta con
 * esbuild —el mismo que ya usa `npm run build`— y el binario resultante se pasa a
 * los dos intérpretes.
 *
 * ═══ POR QUÉ EL ROBOT VIVE AQUÍ Y NO EN EL COMPROBADOR ═══
 *
 * Porque si el guion recibiera la lista de movimientos desde fuera, habría que
 * meterla dentro del paquete como un literal enorme —una partida de cuarenta
 * segundos son miles de tics— y, peor, la comparación entre motores sería más
 * floja: los dos recibirían las mismas entradas y solo se compararía el reductor.
 *
 * Con el robot dentro, cada motor JUEGA su partida: decide, mueve, mira el estado
 * y vuelve a decidir. Si el reductor divergiera un bit en el tic mil, el robot del
 * otro motor tomaría una decisión distinta a partir de ahí y las dos partidas se
 * separarían del todo. Es una comparación mucho más dura que reproducir una lista.
 *
 * ═══ Y POR QUÉ EL ROBOT NO USA NI UNA DIVISIÓN ═══
 *
 * Lo natural para decidir qué esquivar primero es «la que llegue antes», o sea
 * `(NAVE_Y − y) / vy`. Es una división de coma flotante y está fijada por IEEE
 * 754, así que en teoría da lo mismo en los dos motores... y en teoría también lo
 * daba `Math.pow`.
 *
 * Aquí el robot es el instrumento de medida, no lo que se mide. Si el instrumento
 * divergiera, el comprobador se pondría rojo señalando al reductor, y lo que
 * habría fallado sería la regla. Con una multiplicación cruzada —`a.t < b.t` se
 * convierte en `da × vb < db × va`— la comparación es entera y exacta, y lo único
 * que puede separar a los dos motores es lo que se está intentando comparar.
 */
import { canonico } from '../../shared/mecanicas/canonico';
import { movimientoDeTic } from '../../shared/arcade/reloj';
import type { ContextoMovimiento } from '../../shared/arcade/movimiento';
import {
  avanzarElArcade,
  EMPEZAR,
  NAVE_Y,
  partidaNueva,
  RUMBO,
  TICK_HZ,
} from '../../shared/arcade/juegos/arcade';
import type { EstadoDelArcade, Rumbo } from '../../shared/arcade/juegos/arcade';
import { jugarConElRobot, loQueHaceElRobot } from './robot-del-burgo';
import { jugarLasLindes } from './robot-de-las-lindes';
import { PLANTAR } from '../../shared/arcade/juegos/lindes';
import { barrioDeLaNoche, despejarLaPlaza, mundoDeLaLizaDelBarrio, mundoDelBarrio, pasoAbierto, trenEn } from '../../shared/arcade/juegos/quiebro-barrio';
import type { Barrio } from '../../shared/arcade/juegos/quiebro-barrio';
import { DURMIENTES, durmienteMasCercano, escribirLosDurmientes, guionDeLosDurmientes } from '../../shared/arcade/juegos/quiebro-durmientes';
import { Aparato, arquero, Banco, fnv, guerrero, guerreroConTiro, idsDe, jugarLaLizaAbierta, jugarLaLizaAbiertaConOlvido, jugarLaLizaDeJuguete, jugarLaLizaSinBlanco, paseante, salidasDe } from './liza-de-juguete';
import type { JugadaConOlvido, JugadaDeLaLiza, JugadaDeLaLizaAbierta, JugadaSinBlanco } from './liza-de-juguete';
import { jugarAlQuiebro } from './robot-de-quiebro';
import { lizaDelQuiebro } from '../../shared/arcade/juegos/quiebro-liza';
import type { LizaDeclarada } from '../../shared/mecanicas/liza/declaracion';
import type { EstadoDeLaSala } from '../../shared/mecanicas/liza/tipos-de-la-sala';
import { huellaDeLaSala } from '../../shared/mecanicas/liza/sala';

/**
 * Las semillas con las que se juega. Cuatro, y ninguna redonda.
 *
 * Cuatro y no una porque una sola partida puede no llegar a usar una rama del
 * reductor —no tocar el tope de caídas, no llegar al intervalo mínimo— y entonces
 * la comparación diría que dos motores coinciden en el trozo que ejecutaron. Con
 * cuatro semillas distintas se recorren cuatro partidas de largo distinto.
 *
 * Están escritas y no se sortean: un comprobador con entradas al azar es un
 * comprobador que se pone rojo un día de cada cien y que nadie puede reproducir.
 */
export const SEMILLAS: readonly number[] = [1, 20260831, 3141592653, 4294967295];

/**
 * Cuántos pasos como mucho por partida.
 *
 * Diez mil son casi tres minutos a sesenta hercios, muy por encima de lo que
 * aguanta el robot: sus partidas duran entre veinte y sesenta segundos porque la
 * dificultad acaba pasándole por encima. El tope está para que un cambio en las
 * reglas que hiciera al robot invencible no convierta este comprobador en un
 * bucle infinito dentro de la batería.
 */
export const TOPE_DE_PASOS = 10000;

/**
 * Una cosa que hizo el robot, con la misma forma que las entradas de una
 * repetición de verdad.
 *
 * Está aquí y no en `repeticiones.ts` porque este fichero corre TAMBIÉN DENTRO DE
 * HERMES, donde no existe `server/`: importar el tipo de allí metería el módulo
 * entero en el paquete. Son tres campos y la forma la fija aquel fichero, que es
 * quien la valida cuando llega por la red.
 */
export interface EntradaDelRobot {
  tic: number;
  tipo: string;
  carga?: unknown;
}

/** Lo que sale de jugar una partida. Todo comparable como texto. */
export interface Jugada {
  semilla: number;
  /** Cuántos tics duró. */
  tics: number;
  /** La cifra: cuántas esquivó. */
  esquivadas: number;
  /** Cuántas veces cambió de rumbo el robot. La forma de la partida. */
  decisiones: number;
  /** EL ESTADO FINAL, serializado con `canonico.ts`. Es lo que se compara. */
  huella: string;
}

/**
 * LO QUE SALE DE UNA PARTIDA DEL BURGO jugada por su robot. Todo comparable como texto.
 *
 * ═══ POR QUÉ EL BURGO ENTRA AQUÍ, Y POR QUÉ CON SU PROPIO ROBOT ═══
 *
 * Este comprobador comparaba UN reductor —El Arcade— y la memoria de la casa tiene
 * apuntado lo que eso vale para un sexto juego: nada. El Burgo mueve dinero en
 * treinta sitios, baraja dos mazos, encadena dados, ordena con comparadores y
 * redondea intereses con `Math.ceil` sobre enteros; cualquiera de esas cosas puede
 * dar distinto en Hermes y en V8 sin que ningún test escrito a mano lo vea. Aquí el
 * robot de `robot-del-burgo.ts` JUEGA la partida en los dos motores: decide sobre la
 * vista, mueve, y vuelve a decidir; si el reductor divergiera un maravedí en el
 * turno cien, las dos partidas se separarían del todo.
 *
 * Lo que NO se afirma: el tercer escalón (la repetición expandida) es de El
 * Arcade, que tiene marcador y sube repeticiones; el Burgo es de servidor, no tiene
 * repetición que expandir, y su diario lo reejecuta `verify:burgo`.
 */
export interface JugadaDelBurgo {
  semilla: number;
  /** Cuántos a la mesa. */
  cuantos: number;
  /** Cuántos movimientos de asiento cambiaron el estado, y cuántos tics entraron. */
  movimientos: number;
  tics: number;
  /** `jugada` final del estado: cuántos cambios hubo. */
  jugada: number;
  /** Cuántos quebraron. */
  quebrados: number;
  /** Si terminó con ganador. */
  terminada: boolean;
  /** Cuántos botines de la refriega entraron y movieron dinero. Ver `UN_BOTIN_DEL_BURGO_CADA`. */
  botines: number;
  /** EL ESTADO FINAL, serializado con `canonico.ts`. Es lo que se compara. */
  huella: string;
}

/**
 * UN BOTÍN DE LA REFRIEGA CADA TANTOS PASOS DEL ROBOT, en el Burgo y en Las Lindes.
 *
 * Desde Boots on Board el dinero y los puntos también cambian de manos porque alguien cae, y eso
 * entra por el reductor como cualquier movimiento: con esto, los dos motores firman además partidas
 * con refriega. Once en el Burgo, que no es múltiplo de su tic (`UN_TIC_DEL_BURGO_CADA`, siete): el
 * tic va antes, y con el mismo número se llevaría todos los huecos y el botín no entraría nunca.
 * Siete en Las Lindes, que no tiene tics.
 */
export const UN_BOTIN_DEL_BURGO_CADA = 11;
export const UN_BOTIN_DE_LAS_LINDES_CADA = 7;

/** Cuántos se sientan en cada partida del Burgo: una por semilla, en este orden. */
export const CUANTOS_EN_EL_BURGO: readonly number[] = [2, 3, 4, 6];
/** Tope de vueltas de cada partida del Burgo: acota, no decide (medido: acaban por último en pie). */
export const TOPE_DE_VUELTAS_DEL_BURGO = 20;
/** Un tic cada tantos apuntes: el tic del Burgo tira por el ausente y gasta azar, y eso se compara también. */
export const UN_TIC_DEL_BURGO_CADA = 7;
/** Tope de pasos del robot por partida: un cambio de reglas que lo dejara dando vueltas no bloquea la batería. */
export const TOPE_DE_PASOS_DEL_BURGO = 4000;

/**
 * UNA PARTIDA DE LAS LINDES, JUGADA ENTERA POR EL ROBOT.
 *
 * Igual que el Burgo: el robot de `robot-de-las-lindes.ts` decide sobre la vista, mueve, y
 * vuelve a decidir, así que una divergencia de un maravedí en el turno diez separa las dos
 * partidas del todo. La diferencia con el Burgo es que aquí no hay reloj —`tickHz: 0`—, así
 * que no hay tics que intercalar: el tic es el número de orden del movimiento.
 *
 * Lo que NO se afirma: el tercer escalón (la repetición expandida) es de El Arcade. Las
 * Lindes son de servidor, no suben repetición, y su reejecución la cubre el oro de
 * `oro-arcade.ts` contra `oro-arcade/lindes.json`.
 */
export interface JugadaDeLasLindes {
  semilla: number;
  /** Cuántos a la mesa. */
  cuantos: number;
  /** Cuántos movimientos se mandaron en total. */
  apuntes: number;
  /** Losas en el tablero al acabar. La bolsa tiene 72, y una sale puesta. */
  puestas: number;
  /**
   * Cuántas veces se PLANTÓ, contado sobre los movimientos.
   *
   * ═══ Y NO SOBRE EL TABLERO FINAL, QUE SIEMPRE ESTÁ VACÍO ═══
   *
   * `estado.plantados` al acabar la partida es CERO en las cuatro semillas, medido: el remate
   * recoge todos los labriegos al puntuarlos. Un suelo escrito sobre ese campo exigiría
   * «cero o más» para siempre y se leería como vigilancia. Lo que dice si se plantó es la
   * cuenta de movimientos `lindes:plantar`, que es lo que se guarda aquí.
   */
  plantados: number;
  /**
   * Cuántas veces se plantó DE CADA CLASE, también sobre los movimientos.
   *
   * No es adorno y no basta con el total: el recuento de Las Lindes tiene cuatro ramas
   * —villa, senda, ermita y prado— y la rara es la ermita. Con un solo número, que la ermita
   * cayera a cero seguiría dando una suma cómoda y dejaría un recuento entero sin ejercitar,
   * en verde. Por eso el comprobador exige un suelo POR CLASE.
   */
  porClase: Record<string, number>;
  /** Lo que sumaron todos. */
  puntos: number;
  /** Si acabó de verdad, que es cuando se vacía la bolsa. */
  terminada: boolean;
  /** Cuántos botines de la refriega entraron y movieron puntos. Ver `UN_BOTIN_DE_LAS_LINDES_CADA`. */
  botines: number;
  /** EL ESTADO FINAL, serializado con `canonico.ts`. Es lo que se compara. */
  huella: string;
}

/**
 * Cuántos se sientan en cada partida de Las Lindes: una por semilla, en este orden.
 *
 * ═══ NO ES `CUANTOS_EN_EL_BURGO`, Y COPIARLO SALE VERDE SIN JUGAR ═══
 *
 * El Burgo admite 6 a la mesa; Las Lindes no: `CABEN.maximo` es 5 (`lindes.ts:121`). Con 6,
 * el EMPEZAR se RECHAZA, la partida se queda en `momento: 'reuniendo'` con UN apunte y CERO
 * losas… y las huellas de Node y Hermes coinciden perfectamente, porque coinciden en la nada.
 * Es el verde por conjunto vacío servido en bandeja, y es exactamente lo que va a hacer el
 * siguiente que copie la línea de al lado. Los suelos de `verificar-determinismo.ts` están
 * puestos para cazarlo: se han visto rojos con este mismo cambio.
 */
export const CUANTOS_EN_LAS_LINDES: readonly number[] = [2, 3, 4, 5];
/** Tope de pasos del robot por partida: acota, no decide (medido: acaban solas en 94-123). */
export const TOPE_DE_PASOS_DE_LAS_LINDES = 600;

/* ─── EL QUIEBRO: SU BARRIO, SU SALA Y SU MESA ───────────────────────────── */

/**
 * EL BARRIO DE UNA MESA DE EL QUIEBRO, levantado en cualquier motor: la ciudad de la noche (cajas, zonas,
 * grafo), su mundo para la Liza, la plaza despejada, y los 48 durmientes en nueve tics escogidos —el 0, los
 * bordes de un minuto, uno lejano y uno negativo—, con el más cercano a dos puntos, el tren y un paso de
 * cebra. Todo es función sólo del código y la noche: si un motor lo levantara distinto, la sala de uno y
 * el cliente de otro jugarían en ciudades distintas.
 *
 * Es la propuesta del frente del barrio (su informe, «propuesta para `guion-determinismo.ts`»), con los
 * nudos para su suelo. La huella son unos 300 kB por mesa, sin las casillas pisables, que son una
 * constante del barrio y sólo se cuentan.
 */
export interface BarrioDelQuiebro {
  codigo: string;
  noche: number;
  cajas: number;
  nudos: number;
  /** Cuántos durmientes van andando, sumados los nueve tics: con cero, el guion no se ejercita. */
  andando: number;
  huella: string;
  durmientes: string;
}

/** Las mesas de las que se levanta el barrio: código y noche. Escritas, como las semillas. */
export const MESAS_DEL_QUIEBRO: readonly (readonly [string, number])[] = [
  ['QWXYZ', 1],
  ['K7M2P', 3],
  ['ZZZZZ', 10],
  ['ABCDE', 7],
];
/** Los tics en que se miran los durmientes. El negativo está a propósito: el guion lo admite. */
export const TICS_DEL_QUIEBRO: readonly number[] = [0, 1, 599, 600, 1199, 12345, 20000, 123457, -777];

/** El barrio de una mesa y noche, con sus durmientes. Ver `BarrioDelQuiebro`. */
export function levantarUnBarrioDelQuiebro(codigo: string, noche: number): BarrioDelQuiebro {
  const b = barrioDeLaNoche(codigo, noche);
  const d = despejarLaPlaza(b);
  const plano = new Int32Array(DURMIENTES * 4);
  const partes: string[] = [];
  let andando = 0;
  for (const t of TICS_DEL_QUIEBRO) {
    escribirLosDurmientes(b, t, plano);
    for (let i = 0; i < plano.length; i++) partes.push(String(plano[i]));
    for (let i = 0; i < DURMIENTES; i++) if (plano[i * 4 + 3] === 1) andando++;
    partes.push(`|${String(durmienteMasCercano(b, t, 0, 0))}|${String(durmienteMasCercano(b, t, 40 * 65536, -20 * 65536, [0, 1, 2]))}`);
    const tren = trenEn(b, t);
    partes.push(tren === null ? '-' : `${String(tren.cabeza)}:${String(tren.cola)}`, pasoAbierto(b, 5, 'x', t) ? '1' : '0');
  }
  const mundo = mundoDelBarrio(b);
  const liza = (x: Barrio): unknown => {
    const l = mundoDeLaLizaDelBarrio(x);
    return { ...l, suelo: { ...l.suelo, pisables: l.suelo.pisables.length } };
  };
  return {
    codigo,
    noche,
    cajas: b.cajas.length,
    nudos: b.grafo.nudos.length,
    andando,
    huella: canonico([b, { ...mundo, pisables: mundo.pisables.length }, liza(b), d, liza(d), guionDeLosDurmientes(b)]),
    durmientes: partes.join(','),
  };
}

/**
 * La liza de juguete, jugada: cuántas semillas y cuántos tics. Dos y no cuatro porque en Hermes 0.12 —un
 * intérprete sin JIT— cada partida de seiscientos tics con la sala llena cuesta segundos; con dos se
 * recorren igual el ausente, el cambio de fase y la fase nueva (lo miden los suelos del comprobador).
 */
export const SEMILLAS_DE_LA_LIZA: readonly number[] = [1, 20260831];
export const TICS_DE_LA_LIZA = 600;

/**
 * LA SALA DE EL QUIEBRO JUGADA: un combate de verdad de una mesa (la declaración que sale de la vista que da
 * su robot, `lizaDelQuiebro`) jugado por los robots del banco en la sala de la Liza, con sus entidades, sus
 * tiradores, su barrio de cuatrocientos nudos y su límite, en cualquier motor.
 *
 * ═══ POR QUÉ, SI YA SE JUEGA LA LIZA DE JUGUETE ═══
 *
 * Porque la de juguete tiene un grafo de siete nudos y ninguna entidad que nazca fuera del límite: la
 * revisión del pulido metió en `puntoParaEntrar` —lo que hace entrar en la glorieta a las que salen de las
 * bocas de las calles— la clausura sobre el `let` de un bucle que Hermes 0.12 no liga por iteración, y la
 * tanda salió en verde. Forzando en Node lo que haría Hermes, la huella de la sala con las declaraciones de
 * El Quiebro cambiaba y la del juguete no. Aquí el asiento 1 se calla un rato (queda ausente: sin nadie a
 * quien perseguir si juega solo) para que también se recorra lo que entra sin blanco.
 */
export interface SalaDelQuiebroJugada {
  semilla: number;
  asientos: number;
  clave: string;
  tics: number;
  /** Anuncios, balas y líneas de apuntado que le llegaron al asiento 1; entidades nacidas; veces que alguien quedó ausente. */
  anuncios: number;
  balas: number;
  lineas: number;
  nacidas: number;
  ausentes: number;
  /** Entidades que entraron en el límite de la fase desde fuera, y de ésas, las que lo hicieron sin nadie a quien perseguir. */
  entraron: number;
  entraronSinBlanco: number;
  /**
   * EL RAYO (el tiro cargado de la Liza): los que le llegaron al asiento 1, las veces que alguien empezó a cargar,
   * los que estallaron y las entidades que alcanzaron. Sólo los usa la sala del rayo (ver `SALAS_DEL_QUIEBRO`).
   */
  rayos: number;
  cargas: number;
  estallas: number;
  alcanzadas: number;
  /** El hilo de todo lo que salió de la sala, tic a tic, y el estado final (FNV sobre la forma canónica). */
  salidas: string;
  huella: string;
}

/**
 * Las mesas cuya sala se juega: semilla, asientos, qué combate y quién lleva el RAYO. En solitario, la primera
 * oleada: sus Prestados salen de las bocas de las calles, fuera de la glorieta, en tres tandas —la segunda
 * mientras el asiento está callado: entran sin nadie a quien perseguir—. Entre dos, la primera oleada con
 * tirador (balas y líneas). Y otra entre dos con tirador en la que los dos juegan con el rayo: el primero lo
 * usa cuando no tiene a nadie cerca, y el segundo sólo carga y suelta —el robot que carga y suelta de
 * `verify:determinismo`, con su suelo—. Escritas, como las semillas.
 */
export const SALAS_DEL_QUIEBRO: readonly (readonly [number, number, 'primera' | 'tiradores', boolean])[] = [
  [3, 1, 'primera', false],
  [7, 2, 'tiradores', false],
  [13, 2, 'tiradores', true],
];
export const TICS_DE_LA_SALA_DEL_QUIEBRO = 900;
/** Los tics de la liza sin blanco: sus cuatro entidades nacen entre el 60 y el 120, y entran antes del 250. */
export const TICS_DE_LA_LIZA_SIN_BLANCO = 300;
/**
 * LA LIZA ABIERTA (`liza-de-juguete.ts`): una ciudad de juguete de 300 × 300 con ochocientas cajas y
 * ochocientos nudos, que es lo que enciende los índices de la Liza por dentro —las losas y los nudos por
 * celdas, y los campos por meta acotados y completados— (el diseño de la ciudad abierta, §5.4). Con la
 * liza de juguete y el barrio no se encienden, y el código que la sala de una ciudad corre en cada tic no
 * lo compararía nadie entre los dos motores. Semilla y tics, escritos.
 */
export const SEMILLA_DE_LA_LIZA_ABIERTA = 5;
export const TICS_DE_LA_LIZA_ABIERTA = 400;
/**
 * LA LIZA ABIERTA CON L10 (`jugarLaLizaAbiertaConOlvido`): la misma ciudad con el alcance de blanco (45) y el
 * olvido (a 90, en 200 tics) de una liza abierta de verdad, con uno que corre por las calles de fuera y otro
 * que se calla un rato. Setecientos tics: el olvido no llega antes del 200, y así caben varios y lo que su
 * grupo vuelve a sacar.
 */
export const SEMILLA_DE_LA_LIZA_CON_OLVIDO = 13;
export const TICS_DE_LA_LIZA_CON_OLVIDO = 700;
/** Cuándo se calla el asiento 1 y cuándo vuelve (tics del banco). */
const CALLA_EN = 60;
const VUELVE_EN = 500;

/** ¿Tiene la fase algún grupo de una clase que dispara? (sin cierres: ver la cabecera de `liza-de-juguete.ts`) */
function conTiradores(l: LizaDeclarada): boolean {
  const en = l.fase.encuentro;
  if (en === null) return false;
  for (const g of en.grupos) for (const c of l.clases) if (c.id === g.clase && c.proyectil !== 0) return true;
  return false;
}

/** ¿Hay algún asiento a quien perseguir: con cuerpo, con vida, y ni ausente ni sin cuerpo? */
function hayBlanco(s: EstadoDeLaSala): boolean {
  const d = s.declaracion;
  for (const a of s.asientos) {
    if (!a.conCuerpo || a.vida <= 0) continue;
    const e = a.estado;
    const est = e !== null && s.tic >= e.desdeTic && s.tic < e.hastaTic ? e.estado : 0;
    if (est !== d.presencia.estadoAusente && est !== d.sinCuerpo.estado) return true;
  }
  return false;
}

/** ¿Está `(x, z)` dentro del límite de la fase? */
function dentroDelLimiteDe(s: EstadoDeLaSala, x: number, z: number): boolean {
  for (const l of s.declaracion.mundo.limites) {
    if (l.id !== s.declaracion.fase.limite) continue;
    return x >= l.caja.x0 && x <= l.caja.x1 && z >= l.caja.z0 && z <= l.caja.z1;
  }
  return true;
}

/** La sala de un combate de El Quiebro con esa semilla y asientos, jugada `tics` tics. Ver `SalaDelQuiebroJugada`. */
export function jugarLaSalaDelQuiebro(semilla: number, asientos: number, cual: 'primera' | 'tiradores', tics: number, conRayo = false): SalaDelQuiebroJugada {
  const partida = jugarAlQuiebro({ asientos, semilla, noches: 2, politica: 'gana', travesuras: false });
  let l: LizaDeclarada | null = null;
  for (const v of partida.vistas) {
    const x = lizaDelQuiebro(v, 'K7M2P');
    if (l !== null || x === null || x.fase.modo !== 'encuentro' || x.fase.encuentro === null) continue;
    if (cual === 'primera' || conTiradores(x)) l = x;
  }
  const vacia: SalaDelQuiebroJugada = {
    semilla,
    asientos,
    clave: '',
    tics: 0,
    anuncios: 0,
    balas: 0,
    lineas: 0,
    nacidas: 0,
    ausentes: 0,
    entraron: 0,
    entraronSinBlanco: 0,
    rayos: 0,
    cargas: 0,
    estallas: 0,
    alcanzadas: 0,
    salidas: '',
    huella: '',
  };
  if (l === null) return vacia;
  const ids = idsDe(l);
  const aparatos: Aparato[] = [];
  for (let i = 1; i <= l.asientos.length; i++) {
    /* Con el rayo, el primero lee y lo usa cuando no tiene a nadie cerca, y el segundo sólo carga y suelta. */
    const robot = conRayo ? (i === 2 ? arquero() : guerreroConTiro(110, ids)) : i === 2 ? paseante(semilla * 31 + i, ids) : guerrero(110, ids);
    aparatos.push(new Aparato(i, 3000 * i, 20 * i, 60 + 40 * i, (17 * i) % 50, robot));
  }
  const cargar = l.asientos[0]?.tiro?.puesta.estado ?? -1;
  const deRayo: number[] = [];
  let rayos = 0;
  let cargas = 0;
  let estallas = 0;
  let alcanzadas = 0;
  const b = new Banco(l, l.fase.semilla, aparatos);
  b.guardarPasos = false;
  for (let i = 1; i <= l.asientos.length; i++) b.conectar(i);
  const primero = aparatos[0] as Aparato;
  const dentro = new Map<number, boolean>();
  let anuncios = 0;
  let balas = 0;
  let lineas = 0;
  let nacidas = 0;
  let ausentes = 0;
  let entraron = 0;
  let entraronSinBlanco = 0;
  let salidas = '';
  for (let t = 0; t < tics; t++) {
    if (t === CALLA_EN) primero.mudo = true;
    if (t === VUELVE_EN) primero.mudo = false;
    const p = b.tic();
    salidas = fnv(salidas + salidasDe(p));
    for (const x of p.sucesos) {
      const e = x.suceso;
      if (x.para === 1 && e.e === 'anuncio') anuncios++;
      else if (x.para === 1 && e.e === 'bala') {
        balas++;
        if (e.de < 16) {
          rayos++;
          deRayo.push(e.id);
        }
      } else if (x.para === 1 && e.e === 'apunta' && e.a !== 0) lineas++;
      else if (x.para === 0 && e.e === 'nace') nacidas++;
      else if (x.para === 0 && e.e === 'estado' && e.est === l.presencia.estadoAusente) ausentes++;
      else if (x.para === 0 && e.e === 'estado' && e.est === cargar) cargas++;
      else if (x.para === 0 && e.e === 'estalla') estallas++;
      else if (x.para === 0 && e.e === 'impacta' && e.a >= 16 && deRayo.indexOf(e.bala) >= 0) alcanzadas++;
    }
    const sinBlanco = !hayBlanco(p.sala);
    for (const e of p.sala.entidades) {
      const ahora = dentroDelLimiteDe(p.sala, e.x, e.z);
      const antes = dentro.get(e.numero);
      if (antes === false && ahora) {
        entraron++;
        if (sinBlanco) entraronSinBlanco++;
      }
      dentro.set(e.numero, ahora);
    }
    if (p.sala.encuentro !== null && p.sala.encuentro.resultado !== null) break;
  }
  return {
    semilla,
    asientos,
    clave: l.fase.clave,
    tics: b.k,
    anuncios,
    balas,
    lineas,
    nacidas,
    ausentes,
    entraron,
    entraronSinBlanco,
    rayos,
    cargas,
    estallas,
    alcanzadas,
    salidas,
    huella: fnv(huellaDeLaSala(b.sala)),
  };
}

/**
 * UNA MESA DE EL QUIEBRO jugada por su robot (`robot-de-quiebro.ts`): la reunión, la Bajada con su
 * preparación, las oleadas y pausas con voto, la Llamada, el recuento y el final, con las travesuras de una
 * sala vieja o rota dentro. Lo rápido no entra —eso es la Liza, arriba—: aquí se compara el reductor de la
 * mesa, que es el que cuenta monedas, aguante y puntos.
 */
export interface JugadaDelQuiebro {
  semilla: number;
  asientos: number;
  pasos: number;
  /** Entradas del diario: lo que cambió el estado. */
  diario: number;
  noches: number;
  fases: number;
  /** Rechazos esperados (las travesuras) y lo que no salió como se esperaba (vacío en una partida sana). */
  rechazados: number;
  inesperados: number;
  terminada: boolean;
  huella: string;
}

/** Cuántos se sientan en cada mesa de El Quiebro: una por semilla, en este orden (el aforo es de 1 a 6). */
export const ASIENTOS_EN_EL_QUIEBRO: readonly number[] = [1, 3, 4, 6];
/** Cuántas noches juega cada mesa. */
export const NOCHES_DEL_QUIEBRO = 2;

/** Una mesa de El Quiebro con esa semilla y los que le tocan. Ver `JugadaDelQuiebro`. */
export function jugarUnaDelQuiebro(semilla: number, asientos: number): JugadaDelQuiebro {
  const p = jugarAlQuiebro({ asientos, semilla, noches: NOCHES_DEL_QUIEBRO, politica: 'mezcla', travesuras: true });
  return {
    semilla,
    asientos,
    pasos: p.pasos,
    diario: p.diario.length,
    noches: p.noches.length,
    fases: p.fases.length,
    rechazados: p.rechazosEsperados.length,
    inesperados: p.inesperados.length,
    terminada: p.terminada,
    huella: p.huella,
  };
}

/** Y lo que sale de jugarlas todas, más quién las jugó. */
export interface Tanda {
  /**
   * Qué motor de JavaScript ha ejecutado esto.
   *
   * ═══ ESTE CAMPO ES LA MITAD DEL VALOR DEL COMPROBADOR ═══
   *
   * Sin él, `verify:determinismo` podría estar ejecutando el mismo paquete DOS
   * VECES EN NODE —porque el binario de Hermes no estaba, porque la ruta se quedó
   * vieja, porque alguien cambió el lanzador— y saldría verde para siempre
   * diciendo que dos motores coinciden. Sería el verde falso perfecto: una
   * comprobación de determinismo que no compara motores es una comprobación que
   * no comprueba lo que dice.
   *
   * `HermesInternal` es un objeto que Hermes pone en el ámbito global y que no
   * existe en V8. El comprobador exige que las dos tandas digan cosas DISTINTAS
   * antes de mirar ninguna huella.
   */
  motor: string;
  jugadas: Jugada[];
  /** Las partidas del Burgo, una por semilla. */
  burgo: JugadaDelBurgo[];
  /** Las partidas de Las Lindes, una por semilla. */
  lindes: JugadaDeLasLindes[];
  /** Los barrios de El Quiebro, uno por mesa de `MESAS_DEL_QUIEBRO`. */
  quiebro: BarrioDelQuiebro[];
  /** La liza de juguete jugada, una por semilla de `SEMILLAS_DE_LA_LIZA`. */
  liza: JugadaDeLaLiza[];
  /** Las mesas de El Quiebro, una por semilla. */
  mesasDelQuiebro: JugadaDelQuiebro[];
  /** La sala de un combate de El Quiebro, jugada: una por mesa de `SALAS_DEL_QUIEBRO`. */
  salasDelQuiebro: SalaDelQuiebroJugada[];
  /** La liza de juguete sin nadie a quien perseguir, con las que nacen detrás de un muro (ver `lizaSinBlanco`). */
  lizaSinBlanco: JugadaSinBlanco;
  /** La liza abierta, jugada: la que enciende los índices de la Liza (ver `TICS_DE_LA_LIZA_ABIERTA`). */
  lizaAbierta: JugadaDeLaLizaAbierta;
  /** La liza abierta con el alcance de blanco y el olvido (L10), jugada (ver `TICS_DE_LA_LIZA_CON_OLVIDO`). */
  lizaConOlvido: JugadaConOlvido;
}

/** Cómo se llama el motor que está ejecutando esto. Ver `Tanda.motor`. */
export function queMotorSoy(): string {
  const global_ = globalThis as unknown as { HermesInternal?: unknown };
  return global_.HermesInternal === undefined ? 'node' : 'hermes';
}

/**
 * QUÉ HACE EL ROBOT. Toda la lógica de decisión, y solo con enteros.
 *
 * Busca lo que va a llegar antes a la altura de la nave de entre lo que le pueda
 * caer encima, y se aparta hacia el lado contrario. Si no hay nada cerca, vuelve
 * al centro, que es la posición desde la que se llega antes a los dos lados.
 *
 * No pretende jugar bien: pretende jugar SIEMPRE IGUAL. Que además dure cuarenta
 * segundos es lo que hace que la partida recorra la subida de dificultad entera.
 */
function queHaceElRobot(estado: EstadoDelArcade): Rumbo {
  /* Lo más cerca en TIEMPO, comparado por multiplicación cruzada. Ver cabecera. */
  let peligroX = 0;
  let mejorDistancia = 0;
  let mejorVelocidad = 0;
  let hay = false;

  for (const c of estado.caidas) {
    const distancia = NAVE_Y - c.y;
    /* Lo que ya pasó de largo no es un peligro. */
    if (distancia < 0) continue;
    /* Ni lo que está lejos a los lados: apartarse de eso es perder el sitio. */
    const separacion = c.x - estado.nave;
    const separacionAbsoluta = separacion < 0 ? -separacion : separacion;
    if (separacionAbsoluta > 260) continue;

    if (!hay || distancia * mejorVelocidad < mejorDistancia * c.vy) {
      hay = true;
      peligroX = c.x;
      mejorDistancia = distancia;
      mejorVelocidad = c.vy;
    }
  }

  if (!hay) {
    if (estado.nave < 460) return 1;
    if (estado.nave > 540) return -1;
    return 0;
  }
  return peligroX > estado.nave ? -1 : 1;
}

/**
 * Juega una partida entera con esa semilla y devuelve lo que salió.
 *
 * El contexto se monta aquí con `quien: null` y `asientos: []`, que es su forma
 * normal en un juego de un aparato, y con `tic` subiendo de uno en uno. El juego
 * lleva su propio contador y no se fía de éste —está razonado en `arcade.ts`— así
 * que lo único que este bucle decide es CUÁNTOS pasos hay, nunca cuánto avanza
 * cada uno.
 */
export function jugarUna(semilla: number): Jugada {
  const { jugada } = jugarGrabando(semilla, TOPE_DE_PASOS);
  return jugada;
}

/**
 * Lo mismo, pero además con LO QUE HIZO EL ROBOT y el estado final en la mano.
 *
 * ═══ POR QUÉ ESTA FUNCIÓN Y NO DOS ROBOTS ═══
 *
 * `verify:marcador` necesita una repetición de VERDAD para subirla y ver que se
 * acepta: fabricar una a mano y llamarla «real» sería probar el comprobador contra
 * su propia idea de lo que es una partida. La única forma honrada de tener una
 * repetición real es jugar una, y jugarla con el mismo robot que juega
 * `verify:determinismo` — porque entonces las dos comprobaciones hablan de la
 * misma partida y una divergencia se ve en las dos.
 *
 * Se le puede pedir que pare antes del final, y eso también hace falta allí: una
 * partida completa dura medio minuto de reloj de juego, y el marcador contrasta la
 * duración declarada con el tiempo de pared, así que una batería que no puede
 * esperar medio minuto necesita una partida corta que sea REAL y no inventada.
 */
export function jugarGrabando(
  semilla: number,
  topeDePasos: number,
): { jugada: Jugada; entradas: EntradaDelRobot[]; estado: EstadoDelArcade } {
  const ctx = (tic: number): ContextoMovimiento => ({
    quien: null,
    azar: semilla,
    tic,
    asientos: [],
  });

  const entradas: EntradaDelRobot[] = [{ tic: 0, tipo: EMPEZAR }];
  let estado = avanzarElArcade(partidaNueva(), { tipo: EMPEZAR }, ctx(0));
  let decisiones = 0;
  let rumbo: Rumbo = 0;
  let pasos = 0;

  while (estado.momento === 'jugando' && pasos < topeDePasos) {
    const quiere = queHaceElRobot(estado);
    if (quiere !== rumbo) {
      rumbo = quiere;
      decisiones = decisiones + 1;
      /*
       * El movimiento se apunta con CUÁNTOS PASOS SE HAN DADO YA, que es la
       * convención que `repeticiones.movimientosDe` usa para expandir: una entrada
       * marcada en el tic T se aplica DESPUÉS del paso T. Si aquí se apuntara con
       * `pasos + 1`, la repetición se reejecutaría un paso desfasada y casi
       * siempre daría lo mismo — casi. Eso pasó de verdad, por el otro lado: la
       * expansión iba desfasada y 108 de 200 partidas del robot reejecutaban a
       * otro estado. Lo que lo cazó es el tercer escalón de `verify:determinismo`,
       * que compara la huella de jugar con la de expandir esta misma lista.
       */
      entradas.push({ tic: pasos, tipo: RUMBO, carga: quiere });
      estado = avanzarElArcade(estado, { tipo: RUMBO, carga: quiere }, ctx(pasos));
    }
    pasos = pasos + 1;
    estado = avanzarElArcade(estado, movimientoDeTic(), ctx(pasos));
  }

  return {
    jugada: {
      semilla,
      tics: estado.tic,
      esquivadas: estado.esquivadas,
      decisiones,
      huella: canonico(estado),
    },
    entradas,
    estado,
  };
}

/** Una partida entera del Burgo con esa semilla y los que le tocan a la mesa. Ver `JugadaDelBurgo`. */
export function jugarUnaDelBurgo(semilla: number, cuantos: number): JugadaDelBurgo {
  const p = jugarConElRobot(
    semilla,
    cuantos,
    TOPE_DE_VUELTAS_DEL_BURGO,
    UN_TIC_DEL_BURGO_CADA,
    TOPE_DE_PASOS_DEL_BURGO,
    loQueHaceElRobot,
    () => {},
    UN_BOTIN_DEL_BURGO_CADA,
  );
  let quebrados = 0;
  for (const j of p.estado.jugadores) if (j.quebrado) quebrados++;
  return {
    semilla,
    cuantos,
    movimientos: p.movimientos,
    tics: p.tics,
    jugada: p.estado.jugada,
    quebrados,
    terminada: p.estado.momento === 'terminada' && p.estado.ganadores.length > 0,
    botines: p.botines,
    huella: canonico(p.estado),
  };
}

/** Una partida entera de Las Lindes con esa semilla y los que le tocan a la mesa. Ver `JugadaDeLasLindes`. */
export function jugarUnaDeLasLindes(semilla: number, cuantos: number): JugadaDeLasLindes {
  const p = jugarLasLindes(semilla, cuantos, TOPE_DE_PASOS_DE_LAS_LINDES, UN_BOTIN_DE_LAS_LINDES_CADA);
  const porClase: Record<string, number> = {};
  let plantados = 0;
  for (const a of p.apuntes) {
    if (a.tipo !== PLANTAR) continue;
    plantados++;
    const carga = a.carga as { clase?: string } | undefined;
    const clase = carga === undefined ? undefined : carga.clase;
    if (clase !== undefined) porClase[clase] = (porClase[clase] ?? 0) + 1;
  }
  let puntos = 0;
  for (const l of p.estado.labriegos) puntos += l.puntos;
  return {
    semilla,
    cuantos,
    apuntes: p.apuntes.length,
    puestas: p.puestas,
    plantados,
    porClase,
    puntos,
    terminada: p.estado.momento === 'terminada',
    botines: p.botines,
    huella: canonico(p.estado),
  };
}

/** Todas las partidas, con el nombre del motor delante. */
export function jugarLaTanda(): Tanda {
  const jugadas: Jugada[] = [];
  for (const semilla of SEMILLAS) jugadas.push(jugarUna(semilla));
  const burgo: JugadaDelBurgo[] = [];
  for (let i = 0; i < SEMILLAS.length; i++) {
    burgo.push(jugarUnaDelBurgo(SEMILLAS[i] as number, CUANTOS_EN_EL_BURGO[i] as number));
  }
  const lindes: JugadaDeLasLindes[] = [];
  for (let i = 0; i < SEMILLAS.length; i++) {
    lindes.push(jugarUnaDeLasLindes(SEMILLAS[i] as number, CUANTOS_EN_LAS_LINDES[i] as number));
  }
  const quiebro: BarrioDelQuiebro[] = [];
  for (const mesa of MESAS_DEL_QUIEBRO) quiebro.push(levantarUnBarrioDelQuiebro(mesa[0], mesa[1]));
  const liza: JugadaDeLaLiza[] = [];
  for (const semilla of SEMILLAS_DE_LA_LIZA) liza.push(jugarLaLizaDeJuguete(semilla, TICS_DE_LA_LIZA));
  const mesasDelQuiebro: JugadaDelQuiebro[] = [];
  for (let i = 0; i < SEMILLAS.length; i++) {
    mesasDelQuiebro.push(jugarUnaDelQuiebro(SEMILLAS[i] as number, ASIENTOS_EN_EL_QUIEBRO[i] as number));
  }
  const salasDelQuiebro: SalaDelQuiebroJugada[] = [];
  for (const sala of SALAS_DEL_QUIEBRO) salasDelQuiebro.push(jugarLaSalaDelQuiebro(sala[0], sala[1], sala[2], TICS_DE_LA_SALA_DEL_QUIEBRO, sala[3]));
  const lizaSinBlanco = jugarLaLizaSinBlanco(TICS_DE_LA_LIZA_SIN_BLANCO);
  const lizaAbierta = jugarLaLizaAbierta(SEMILLA_DE_LA_LIZA_ABIERTA, TICS_DE_LA_LIZA_ABIERTA);
  const lizaConOlvido = jugarLaLizaAbiertaConOlvido(SEMILLA_DE_LA_LIZA_CON_OLVIDO, TICS_DE_LA_LIZA_CON_OLVIDO);
  return { motor: queMotorSoy(), jugadas, burgo, lindes, quiebro, liza, mesasDelQuiebro, salasDelQuiebro, lizaSinBlanco, lizaAbierta, lizaConOlvido };
}

/**
 * Cuánto dura la tanda en segundos de juego. Para que el informe diga algo.
 *
 * No entra en la comparación: es para el ojo humano que lee la salida y quiere
 * saber si lo que se ha comparado son cuatro partidas de verdad o cuatro que se
 * acabaron en el primer segundo.
 */
export function segundosDeLaTanda(tanda: Tanda): number {
  let tics = 0;
  for (const j of tanda.jugadas) tics += j.tics;
  return tics / TICK_HZ;
}
